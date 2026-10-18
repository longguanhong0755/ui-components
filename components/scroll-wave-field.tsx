"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { animate, motionValue } from "motion/react"
/**
 * framer-motion's `animate()` option bag. `AnimationOptions` is not exported by
 * the copy of framer-motion that ships inside Framer, and its `Transition` type
 * is not assignable to what `animate(value, …)` accepts, so the shape is
 * spelled out here — a type alias, not an interface, or it loses the implicit
 * index signature the intersection needs.
 */
type Motion = {
    type?: "spring" | "tween" | "keyframes" | "inertia"
    duration?: number
    ease?: [number, number, number, number]
    delay?: number
    stiffness?: number
    damping?: number
    mass?: number
    bounce?: number
    restSpeed?: number
    restDelta?: number
}

/**
 * SCROLL WAVE FIELD — 3D particle wave plane for Framer.
 *
 * A grid of ~10k points sits on a ground plane whose height is a layered sine
 * surface (long diagonal ridge + cross swell). A perspective camera looks
 * slightly down at it from INSIDE the field, so the near rows blow up into big
 * discs and sweep past the bottom edge while the far rows compress into a sharp
 * band at the horizon.
 *
 * The motion is entirely time-driven — the field streams endlessly toward the
 * camera and the wave pattern flows one way. Nothing is bound to scroll, so the
 * Framer canvas and the preview render identically with no progress term.
 *
 * There is NO depth of field. Every point is a hard-edged disc sized purely by
 * perspective (`uDot * focal / depth`), so the near rows are large and crisp
 * rather than soft bokeh; overlapping discs still bloom to a hot core through
 * the additive blend.
 *
 * Cursor is ray-cast onto the ground plane and lifts the surface with a
 * gaussian bump — a real 3D deformation, not a screen-space warp.
 *
 * Rule 6 recipe: ONE GL context built in useEffect([]); every live input read
 * from a ref inside a raw rAF loop (raw rAF ticks on the Framer canvas, unlike
 * IntersectionObserver / framer-motion appear props). Never calls
 * loseContext() — getContext() hands back the SAME force-lost context on the
 * next StrictMode mount and renders black.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

/* ---------------------------------------------------------------- constants */

const FIELD_W = 3600 // world width of the point grid
const FIELD_D = 7000 // world depth of the point grid
// Camera starts INSIDE the field, not behind it. Sitting at z < 0 means the
// nearest grid row still projects near the middle of the frame and the whole
// lower half of the canvas is empty; from inside, rows sweep down past the
// bottom edge as huge bokeh, which is what the reference frames show.
const CAM_Z0 = 700
const FOV = 60 // vertical field of view, degrees
const DPR_CAP = 1.5 // mobile fill-rate guard for the big bokeh discs
const TAU = Math.PI * 2
const MAX_COLORS = 8
const DEFAULT_COLORS = ["#5A4AE0", "#F2D98A"]
// Wave Direction was a control; it is frozen at its shipped default. The panel
// row is gone, the render path is unchanged — uDir still drives the rigid
// translation of the pattern (and the colour-band drift that rides it).
// 0° = the pattern travels toward the viewer.
const WAVE_DIRECTION = 0
const WAVE_DIR_X = Math.sin((WAVE_DIRECTION * Math.PI) / 180)
const WAVE_DIR_Z = -Math.cos((WAVE_DIRECTION * Math.PI) / 180)
// Depth of field is GONE — no blur constant, no uBlur uniform, no circle of
// confusion. Points are hard discs whose radius is only `uDot * focal / rz`, so
// the near rows are still large and the far rows still sub-pixel, but nothing
// is softened. The energy-conservation divide went with it: it existed to stop
// the CoC from blowing the near bokeh out to white, and with coc == 0 it was
// pow(1, 0.8) == 1 on every point. The near fade (fog's smoothstep from rz 70)
// is what keeps the giant discs just in front of the lens from saturating.

// Camera Height is a PERCENT of the component's own area, not a world number.
// 100% = CAM_Y_FULL world units at the intrinsic 1200×800 box; a larger box
// lifts the camera by the square root of its area ratio, so the dial means the
// same framing decision whatever the instance is sized to. The shipped look
// (110 world units at the size floor) is exactly 20%.
const CAM_Y_FULL = 550
const CAM_REF_AREA = 1200 * 800
// A banner or a 4K hero would otherwise push the camera somewhere the fog and
// the wrap depth were never tuned for.
const CAM_SCALE_MIN = 0.5
const CAM_SCALE_MAX = 2.5

// How fast the cursor's ground point follows the real pointer, in 1/sec, run
// as a dt-correct exponential approach. The Transition owns how the dent FADES
// IN; this owns how it TRACKS. Without it the gaussian is re-evaluated at the
// raw pointer pixel every frame, so a normal mouse sweep teleports the dent
// across the field and the whole effect reads as a hard cut.
const CURSOR_FOLLOW = 7

/* ------------------------------------------------------------------ shaders */

// All of the 3D lives here: wave surface, cursor bump, camera transform,
// projection, point size, depth of field, fog and colour banding. Doing it in
// the vertex shader is what makes 10k points free.
const VERT = `
precision highp float;

attribute vec2 aGrid;   // world (x, z) lattice position
attribute vec2 aSeed;   // per-point hash pair, stable across frames

uniform vec2  uRes;     // device-pixel canvas size
uniform float uFocal;   // device px
uniform float uTime;    // pre-scaled wave phase (speed applied on the CPU)
uniform float uAmp;
uniform float uScatter; // vertical thickness of the point cloud
uniform float uFreq;    // TAU / wavelength
uniform vec2  uDir;     // unit travel direction in world XZ
uniform float uFlow;    // accumulated endless drift toward the camera, wrapped
uniform float uDepth;   // wrap length; fog is already at 0 by this depth
uniform float uCamY;
uniform float uCamZ;
uniform float uPitch;   // radians, positive = looking down
uniform float uRoll;    // radians about the view axis; sign flipped on the CPU
                        // so a positive control value dips the RIGHT edge
uniform float uDot;     // world radius of one point
uniform float uColorCount;
uniform vec2  uJit;     // lattice jitter amount (x, z)
uniform vec3  uColors[8];
uniform vec3  uCursor;  // ground-plane hit (x, z) + eased hover amount
uniform float uCurR;
uniform float uCurS;
uniform float uHover;   // brightness / size gain right under the cursor

varying vec3  vCol;
varying float vA;
varying float vHot;

// WebGL1 forbids indexing a uniform array with a non-constant expression, so
// the palette is selected by a fixed-bound loop instead of uColors[idx].
vec3 pickColor(float sel) {
    float idx = floor(sel * uColorCount);
    vec3 c = uColors[0];
    for (int i = 1; i < 8; i++) {
        if (float(i) >= uColorCount) break;
        if (float(i) == idx) c = uColors[i];
    }
    return c;
}

// Three sines: one long ridge across x, one diagonal, one slow swell in depth.
// Time is deliberately NOT in here. Giving each term its own time sign is what
// makes a surface churn in place; instead the whole static pattern is rigidly
// translated along uDir, so every crest travels the same way at the same speed.
float surf(vec2 q) {
    return sin(q.x) * 0.55
         + sin(q.x * 0.55 + q.y * 1.15) * 0.30
         + sin(q.y * 0.75) * 0.22;
}

void main() {
    // Jitter x only slightly: the frames keep visible vertical column
    // striations, which is the lattice read edge-on. Heavy x jitter kills them.
    vec2 w = aGrid + (aSeed - 0.5) * uJit;

    // Endless approach. Depth is held RELATIVE to the camera and wrapped, so a
    // point that passes the lens is recycled to the back of the field instead
    // of the field running out. The wrap lands at uDepth, where the fog term
    // has already reached zero, so the recycle is invisible — that is the whole
    // reason the wrap distance and the fog far edge are tied together.
    w.y = uCamZ + mod(w.y - uFlow - uCamZ, uDepth);

    // Third hash from the same attribute pair — no extra buffer.
    float h3 = fract(sin(dot(aSeed, vec2(91.37, 47.13))) * 12345.678);

    // Scatter is what turns a woven mesh into a cloud, and — because x jitter
    // stays low — it is also what produces the vertical dotted streaks that
    // run through the reference frames: one lattice column, many heights.
    // Rigid translation of the pattern = one-directional flow.
    float h = surf(w * uFreq - uDir * uTime) * uAmp + (h3 - 0.5) * uScatter;

    // One gaussian drives BOTH cursor effects: it lifts the surface and it is
    // reused below as the hover glow mask. uCursor.z is the eased hover amount,
    // so the whole thing fades in and out with the pointer.
    float cd = length(w - uCursor.xy);
    float g = exp(-(cd * cd) / (uCurR * uCurR)) * uCursor.z;
    h += g * uCurS;

    // The glow needs a MUCH tighter falloff than the lift. A world-space radius
    // that reads as a gentle swell projects to a huge swath of the near field,
    // where the dots are largest, so reusing g directly floods half the frame
    // and saturates the additive blend. g^8 pulls the radius down to ~0.35x.
    float g2 = g * g; g2 = g2 * g2; g2 = g2 * g2;

    // world -> camera. Camera basis for a downward pitch t:
    //   up = (0, cos t, sin t), forward = (0, -sin t, cos t)
    vec3 p = vec3(w.x, h - uCamY, w.y - uCamZ);
    float c = cos(uPitch);
    float s = sin(uPitch);
    float ry = p.y * c + p.z * s;
    float rz = -p.y * s + p.z * c;

    // Behind / on top of the lens: park it off-clip instead of dividing by ~0.
    if (rz < 40.0) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vCol = uColors[0];
        vA = 0.0;
        vHot = 0.0;
        return;
    }

    // Roll spins the camera about its own view axis. It runs AFTER pitch and
    // leaves rz untouched, so depth of field, fog and point size are all
    // unaffected — only the framing tips.
    float cr = cos(uRoll);
    float sr = sin(uRoll);
    float rx = p.x * cr - ry * sr;
    float ryr = p.x * sr + ry * cr;

    float sx = rx * uFocal / rz;
    float sy = ryr * uFocal / rz;
    gl_Position = vec4(sx / (uRes.x * 0.5), sy / (uRes.y * 0.5), 0.0, 1.0);

    // No depth of field: the radius is the projected dot and nothing else.
    float rad = max(uDot * uFocal / rz, 0.55);
    // Hover swells the dots a little; the alpha gain below does the rest.
    gl_PointSize = clamp(rad * 2.0 * (1.0 + g2 * uHover * 0.20), 1.0, 220.0);

    float bri = 0.28 + h3 * 0.72;

    // Two very low-frequency drifting sines choose the palette entry, so each
    // colour arrives in migrating patches instead of salt-and-pepper noise, and
    // drifts along the SAME direction as the wave so the patches ride the flow
    // rather than sliding across it. The seed term is deliberately wide so the
    // patch edge dissolves into an interleaved dither, not a hard colour seam.
    vec2 bq = w * vec2(0.0040, 0.0032) - uDir * uTime * 0.30;
    float band = sin(bq.x) + sin(bq.y);
    float sel = fract((band + 2.0) * 0.25 + (aSeed.y - 0.5) * 0.55);

    vCol = pickColor(sel);
    // Sparkle rides the entry's own luminance, so a pale palette entry keeps
    // its hot core and a deep one stays matte — no accent flag needed.
    float lum = dot(vCol, vec3(0.299, 0.587, 0.114));
    // Every point is sharp now, so the (1 - vSoft) gate that used to kill the
    // sparkle on blurred discs is gone with it.
    vHot = (0.25 + 0.75 * lum) * bri * bri * 0.7 + g2 * uHover * 0.55;

    // Far fade into the background + a short near fade so points do not pop
    // into existence a few units in front of the lens.
    float fog = (1.0 - smoothstep(2800.0, 6400.0, rz))
              * smoothstep(70.0, 240.0, rz);

    vA = bri * fog * (1.0 + g2 * uHover * 0.55);
}
`

const FRAG = `
precision highp float;

varying vec3  vCol;
varying float vA;
varying float vHot;

void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;

    // One edge for every point: a narrow AA ramp. The gradient-disc branch went
    // with depth of field — there are no blurred points left to mix toward.
    float a = (1.0 - smoothstep(0.90, 1.0, d)) * vA;

    // Hot white core — the sparkle in the frames.
    vec3 col = vCol + vec3(1.0) * pow(1.0 - d, 10.0) * vHot * 0.9;

    // Premultiplied, blended with (ONE, ONE): overlapping discs bloom.
    gl_FragColor = vec4(col * a, a);
}
`

/* ------------------------------------------------------------------- helpers */

// ControlType.Color emits "#rgb", "#rrggbb", "#rrggbbaa" or "rgb()/rgba()".
function parseColor(input: string): [number, number, number] {
    if (!input) return [0, 0, 0]
    const s = input.trim()
    const fn = s.match(/rgba?\(([^)]+)\)/i)
    if (fn) {
        const p = fn[1].split(",").map((v) => parseFloat(v.trim()))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }
    let h = s.replace("#", "")
    if (h.length === 3 || h.length === 4) {
        h = h
            .split("")
            .map((c) => c + c)
            .join("")
    }
    h = h.padEnd(6, "0")
    return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
    ]
}

// Deterministic PRNG so the lattice jitter / brightness never reshuffles on a
// re-render or a control change.
function mulberry32(a: number) {
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("ScrollWaveField shader:", gl.getShaderInfoLog(sh))
    }
    return sh
}

/* --------------------------------------------------------------------- props */

// Only the repeating families are grouped into Object controls — the Wave
// terms, the Tilt pair, the Cursor terms. The headline dials — Background, the
// point Colors, Density, Dot Size — stay top-level, where a designer can reach
// them without opening a disclosure triangle. A group the user has never opened
// arrives as undefined, so each field inside one keeps its own fallback.
interface WaveGroup {
    waveHeight: number
    waveLength: number
    waveSpeed: number
}
/** Legacy — Background and Colors are top-level now. Read so instances keep them. */
interface ColorGroup {
    background: string
    colors: string[]
}

interface TiltGroup {
    tiltStart: number
    rollStart: number
}
interface CursorGroup {
    cursorRadius: number
    cursorLift: number
    /** Legacy — folded into cursorLift. Still read so live instances keep it. */
    hoverGlow?: number
}

interface Props {
    background: string
    colors: string[]
    /** Legacy — the old `palette` group. Still read so live instances keep it. */
    palette?: Partial<ColorGroup>
    density: number
    dotSize: number
    scatter: number
    /** Percent, 0–100, of the component's own area (see CAM_Y_FULL). */
    cameraHeight: number
    wave?: Partial<WaveGroup>
    tilt?: Partial<TiltGroup>
    cursor?: Partial<CursorGroup>
    transition?: Motion
    /** Legacy — folded into wave.waveSpeed. Still read so live instances keep it. */
    flowSpeed?: number
    width?: number
    height?: number
    style?: React.CSSProperties
}

// Field flow used to be its own control. It is the same forward motion the wave
// pattern already travels with, so one Speed drives both; this is the old
// default ratio (260 flow / 160 wave), which keeps the shipped look identical.
const FLOW_PER_WAVE = 260 / 160
// Hover brightness used to be its own control. It now follows how far the
// cursor displaces the field: |lift| 45 (the old default) reads as the old 100%.
const GLOW_PER_LIFT = 100 / 45

/**
 * The two pointer gates' settle. The scene shipped with exponential approaches
 * at 6/sec (hover) and 7/sec (press) inside the rAF loop — ~0.5s and ~0.43s to
 * land. Both now run on one Transition, defaulted to the hover timing: they
 * fire on the same gesture, and a press that settled on a different curve from
 * the hover under it would read as two effects fighting.
 */
const DEFAULT_TRANSITION: Motion = {
    type: "tween",
    duration: 0.8,
    // Slow in AND slow out. The old default was a plain easeOut, which leaves
    // the fastest part of the ramp on the first frame of the gesture — the dent
    // is already half open before the pointer has moved 20px, which is the
    // "sudden" part. A symmetric curve starts from rest.
    ease: [0.4, 0, 0.2, 1],
}

/* ----------------------------------------------------------------- component */

function __BaseImpl_ScrollWaveField(props: Props) {
    const {
        background: backgroundProp,
        colors: colorsProp,
        palette = {},
        density = 145,
        dotSize = 2,
        scatter = 108,
        cameraHeight = 50,
        wave = {"waveSpeed":250,"waveHeight":200,"waveLength":2070},
        tilt = {"rollStart":0,"tiltStart":12},
        cursor = {"cursorLift":45,"cursorRadius":25},
        transition = {"mass":1,"type":"spring","delay":0,"damping":60,"stiffness":800},
        flowSpeed: flowSpeedLegacy,
        width,
        height,
        style,
    } = props

    /* The hover and press gates. MotionValues read by the loop with .get(), so
     * nothing here re-renders; the Transition lives in a ref so changing it can
     * never land in the GL effect's deps and rebuild the context (rule 6). */
    const hoverMV = useRef(motionValue(0)).current
    const pressMV = useRef(motionValue(0)).current
    const transitionRef = useRef(transition)
    transitionRef.current = transition

    const { waveHeight = 150, waveLength = 1400, waveSpeed = 160 } = wave
    // Top-level now; the old `palette` group is the fallback so an existing
    // instance keeps whatever it was set to.
    const background = backgroundProp ?? palette.background ?? "#080512"
    const colors = colorsProp ?? palette.colors ?? DEFAULT_COLORS
    const { tiltStart = 8, rollStart = 0 } = tilt
    const {
        cursorRadius = 25,
        cursorLift = 45,
        hoverGlow: hoverGlowLegacy,
    } = cursor

    // Both were separate controls before the panel was condensed. A live Framer
    // instance still sends the old key, so the old value wins where it exists.
    const flowSpeed = flowSpeedLegacy ?? waveSpeed * FLOW_PER_WAVE
    const hoverGlow =
        hoverGlowLegacy ?? Math.min(400, Math.abs(cursorLift) * GLOW_PER_LIFT)

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Every live input goes through this ref: the GL context is built once and
    // must never be torn down by a control change (rule 6).
    const live = useRef({
        colors,
        density,
        dotSize,
        waveHeight,
        scatter,
        waveLength,
        waveSpeed,
        flowSpeed,
        tiltStart,
        rollStart,
        cameraHeight,
        cursorRadius,
        cursorLift,
        hoverGlow,
    })
    live.current = {
        colors,
        density,
        dotSize,
        waveHeight,
        scatter,
        waveLength,
        waveSpeed,
        flowSpeed,
        tiltStart,
        rollStart,
        cameraHeight,
        cursorRadius,
        cursorLift,
        hoverGlow,
    }

    // Pointer in CSS px relative to the host, plus two eased gates: `active` is
    // hover (stays off until the first real pointermove so the field is
    // undisturbed on load) and `press` is pointer-held.
    // `sx` / `sy` are the SMOOTHED pointer, which is what the ray cast actually
    // uses. Smoothing happens in screen px, not in world space: a world-space
    // lerp near the horizon slides the dent thousands of units across the field
    // for a few pixels of mouse travel.
    const pointer = useRef({
        x: 0,
        y: 0,
        sx: 0,
        sy: 0,
        active: 0,
        target: 0,
        press: 0,
        pressTarget: 0,
    })

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            premultipliedAlpha: true,
            depth: false,
        }) as WebGLRenderingContext | null
        if (!gl) return

        /* ---- program ---- */
        const prog = gl.createProgram()!
        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.warn("ScrollWaveField link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const aGrid = gl.getAttribLocation(prog, "aGrid")
        const aSeed = gl.getAttribLocation(prog, "aSeed")
        const U = (n: string) => gl.getUniformLocation(prog, n)
        const u = {
            res: U("uRes"),
            focal: U("uFocal"),
            time: U("uTime"),
            amp: U("uAmp"),
            scatter: U("uScatter"),
            freq: U("uFreq"),
            dir: U("uDir"),
            flow: U("uFlow"),
            depth: U("uDepth"),
            camY: U("uCamY"),
            camZ: U("uCamZ"),
            pitch: U("uPitch"),
            roll: U("uRoll"),
            dot: U("uDot"),
            colorCount: U("uColorCount"),
            jit: U("uJit"),
            colors: U("uColors[0]"),
            cursor: U("uCursor"),
            curR: U("uCurR"),
            curS: U("uCurS"),
            hover: U("uHover"),
        }

        const gridBuf = gl.createBuffer()!
        const seedBuf = gl.createBuffer()!
        // Scratch for the palette upload — reused every frame, never allocated
        // in the loop. Entries past the palette length are simply never read,
        // because uColorCount bounds the selection.
        const palBuf = new Float32Array(MAX_COLORS * 3)

        // Rebuilding the lattice on a density change refills these buffers; the
        // context itself is never recreated.
        let builtDensity = -1
        let count = 0
        let spacingX = 1
        let spacingZ = 1

        const buildGrid = (d: number) => {
            const cols = Math.max(8, Math.round(d))
            const rows = Math.max(8, Math.round(d * 2))
            count = cols * rows
            spacingX = FIELD_W / (cols - 1)
            spacingZ = FIELD_D / (rows - 1)

            const grid = new Float32Array(count * 2)
            const seed = new Float32Array(count * 2)
            const rnd = mulberry32(0x5eed)
            let i = 0
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    // +0.5 so NO column sits exactly at x = 0. A column at x = 0
                    // projects every one of its rows onto the same screen x and
                    // piles up additively into a hard white vertical line.
                    grid[i * 2] = -FIELD_W / 2 + (c + 0.5) * spacingX
                    grid[i * 2 + 1] = r * spacingZ
                    seed[i * 2] = rnd()
                    seed[i * 2 + 1] = rnd()
                    i++
                }
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf)
            gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)
            gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW)
            builtDensity = d
        }

        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        // Additive on premultiplied output: overlapping bokeh discs bloom, and
        // nothing occludes anything, which is exactly the reference look.
        gl.blendFunc(gl.ONE, gl.ONE)

        /* ---- sizing: measure the ELEMENT, not the width/height props. Those
               are not numeric in the Framer preview (only on the canvas). ---- */
        let cssW = 0
        let cssH = 0
        let dpr = 1
        // sqrt(area / reference area) — the multiplier the Height percent is
        // measured against. Re-derived on every resize, so a component dragged
        // bigger on the canvas raises the camera with it.
        let areaScale = 1
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            cssW = canvas.clientWidth || host.clientWidth || 0
            cssH = canvas.clientHeight || host.clientHeight || 0
            areaScale =
                cssW > 0 && cssH > 0
                    ? Math.min(
                          CAM_SCALE_MAX,
                          Math.max(
                              CAM_SCALE_MIN,
                              Math.sqrt((cssW * cssH) / CAM_REF_AREA)
                          )
                      )
                    : 1
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            gl.viewport(0, 0, w, h)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        /* ---- pointer ---- */
        let hoverAnim: { stop: () => void } | null = null
        let pressAnim: { stop: () => void } | null = null
        const gateHover = (to: number) => {
            if (pointer.current.target === to) return
            pointer.current.target = to
            hoverAnim?.stop()
            hoverAnim = animate(hoverMV, to, transitionRef.current)
        }
        const gatePress = (to: number) => {
            if (pointer.current.pressTarget === to) return
            pointer.current.pressTarget = to
            pressAnim?.stop()
            pressAnim = animate(pressMV, to, transitionRef.current)
        }
        const onMove = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            // The rect carries the Framer canvas zoom, clientWidth does not, so
            // the raw offset is in zoomed px while everything downstream is in
            // layout px. Unscale it or the dent sits away from the pointer on
            // any canvas that is not at 100% (rule G).
            const zx = r.width > 0 ? host.clientWidth / r.width : 1
            const zy = r.height > 0 ? host.clientHeight / r.height : 1
            pointer.current.x = (e.clientX - r.left) * zx
            pointer.current.y = (e.clientY - r.top) * zy
            gateHover(1)
        }
        const onLeave = () => {
            gateHover(0)
            gatePress(0)
        }
        const onDown = () => gatePress(1)
        const onUp = () => gatePress(0)
        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerleave", onLeave)
        host.addEventListener("pointerdown", onDown)
        host.addEventListener("pointercancel", onUp)
        // On window, not host: a drag that releases outside must still let go.
        window.addEventListener("pointerup", onUp)

        /* ---- loop ---- */
        let raf = 0
        let last = performance.now()
        let phase = 0 // accumulated wave phase; speed changes never jump it
        // Endless drift, kept wrapped to [0, FIELD_D) on the CPU. Letting it run
        // unbounded would eventually cost float32 precision inside mod().
        let flow = 0
        // Last valid ground hit, kept across frames so a ray that misses (the
        // pointer above the horizon) holds the dent where it was.
        let hitX = 0
        let hitZ = -1e6

        // Ground-plane ray cast. Inverse of the vertex projection: undo the
        // pitch rotation, then intersect y = 0. Everything in device px so the
        // focal length matches the shader exactly.
        const groundHit = (
            mx: number,
            my: number,
            wDev: number,
            hDev: number,
            focal: number,
            pitch: number,
            roll: number,
            camY: number,
            camZ: number
        ) => {
            const px = mx * dpr - wDev / 2
            const py = -(my * dpr - hDev / 2)
            // Undo roll first — it is the LAST thing the vertex shader applies,
            // so it has to be the first thing peeled off here.
            const cr = Math.cos(roll)
            const sr = Math.sin(roll)
            const sx = px * cr + py * sr
            const sy = -px * sr + py * cr
            const dx = sx / focal
            const dy = sy / focal
            const c = Math.cos(pitch)
            const s = Math.sin(pitch)
            // ry = py*c + pz*s, rz = -py*s + pz*c  =>  py = ry*c - rz*s
            const wy = dy * c - s
            const wz = dy * s + c
            if (wy > -1e-4) return null // ray points at or above the horizon
            const t = -camY / wy
            return { x: dx * t, z: camZ + wz * t }
        }

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min((now - last) / 1000, 0.05)
            last = now

            if (cssW <= 0 || cssH <= 0) {
                resize()
                if (cssW <= 0 || cssH <= 0) return
            }

            const L = live.current
            if (L.density !== builtDensity) buildGrid(L.density)
            if (count === 0) return

            // Ease the hover and press gates so entering / leaving / clicking
            // never snaps. Feedback-free: reads pointer, writes only its own
            // state. Press smoothly ramps the whole field to DOUBLE speed.
            const p = pointer.current
            // Both gates: the Transition control owns the easing, the loop reads.
            p.active = hoverMV.get()
            p.press = pressMV.get()
            const speedMul = 1 + p.press

            // Position tracking. While the dent is invisible the smoothed point
            // is snapped, so re-entering the component somewhere else does not
            // drag a bump across the whole field on the way to the pointer.
            if (p.active < 0.002) {
                p.sx = p.x
                p.sy = p.y
            } else {
                const k = 1 - Math.exp(-dt * CURSOR_FOLLOW)
                p.sx += (p.x - p.sx) * k
                p.sy += (p.y - p.sy) * k
            }

            phase += dt * (L.waveSpeed / 100) * speedMul
            flow = (flow + dt * L.flowSpeed * speedMul) % FIELD_D

            // Nothing is scroll-driven any more, so tilt and camera depth are
            // plain constants read straight from the controls. No progress
            // term, no RenderTarget branch, no canvas/preview divergence to
            // reconcile (rule 5 is satisfied by the flow and wave motion).
            const pitch = (L.tiltStart * Math.PI) / 180
            // Negated so a positive control value dips the RIGHT edge of the
            // frame — "tilt right" in the inspector means tilt right on screen.
            const roll = (-L.rollStart * Math.PI) / 180
            // Percent of the component's area (see CAM_Y_FULL), clamped so a
            // stale instance still holding the old 0–600 world value cannot
            // send the camera to the stratosphere.
            const camY =
                (Math.min(100, Math.max(0, L.cameraHeight)) / 100) *
                CAM_Y_FULL *
                areaScale
            const camZ = CAM_Z0

            const wDev = canvas.width
            const hDev = canvas.height
            const focal = hDev / (2 * Math.tan(((FOV / 2) * Math.PI) / 180))

            if (p.active <= 0.001) {
                // Park it out of range while the dent is faded out.
                hitX = 0
                hitZ = -1e6
            } else {
                const hit = groundHit(
                    p.sx,
                    p.sy,
                    wDev,
                    hDev,
                    focal,
                    pitch,
                    roll,
                    camY,
                    camZ
                )
                // A ray above the horizon returns null. HOLD the last hit
                // instead of parking it at -1e6: dropping the point makes the
                // dent vanish the instant the pointer crosses the horizon line
                // and reappear when it crosses back, which is a hard cut in the
                // middle of a continuous gesture.
                if (hit) {
                    hitX = hit.x
                    hitZ = hit.z
                } else if (hitZ === -1e6) {
                    hitX = 0
                    hitZ = FIELD_D
                }
            }
            const hx = hitX
            const hz = hitZ

            // Palette -> a flat vec3[8]. Empty/short arrays fall back so a
            // designer who clears the list never gets a black field.
            const pal =
                Array.isArray(L.colors) && L.colors.length > 0
                    ? L.colors.slice(0, 8)
                    : DEFAULT_COLORS
            for (let i = 0; i < pal.length; i++) {
                const [cr2, cg2, cb2] = parseColor(pal[i])
                palBuf[i * 3] = cr2
                palBuf[i * 3 + 1] = cg2
                palBuf[i * 3 + 2] = cb2
            }

            gl.uniform2f(u.res, wDev, hDev)
            gl.uniform1f(u.focal, focal)
            gl.uniform1f(u.time, phase)
            gl.uniform1f(u.amp, L.waveHeight)
            gl.uniform1f(u.scatter, L.scatter)
            gl.uniform1f(u.freq, TAU / Math.max(50, L.waveLength))
            // Frozen constant, not a control (see WAVE_DIRECTION).
            gl.uniform2f(u.dir, WAVE_DIR_X, WAVE_DIR_Z)
            gl.uniform1f(u.flow, flow)
            gl.uniform1f(u.depth, FIELD_D)
            gl.uniform1f(u.camY, camY)
            gl.uniform1f(u.camZ, camZ)
            gl.uniform1f(u.pitch, pitch)
            gl.uniform1f(u.roll, roll)
            gl.uniform1f(u.dot, L.dotSize)
            gl.uniform1f(u.colorCount, pal.length)
            gl.uniform2f(u.jit, spacingX * 0.25, spacingZ * 0.7)
            gl.uniform3fv(u.colors, palBuf)
            gl.uniform3f(u.cursor, hx, hz, p.active)
            gl.uniform1f(
                u.curR,
                Math.max(1, (L.cursorRadius / 100) * (FIELD_W / 2))
            )
            gl.uniform1f(u.curS, L.cursorLift)
            gl.uniform1f(u.hover, L.hoverGlow / 100)

            gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf)
            gl.enableVertexAttribArray(aGrid)
            gl.vertexAttribPointer(aGrid, 2, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)
            gl.enableVertexAttribArray(aSeed)
            gl.vertexAttribPointer(aSeed, 2, gl.FLOAT, false, 0, 0)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.POINTS, 0, count)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            hoverAnim?.stop()
            pressAnim?.stop()
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerleave", onLeave)
            host.removeEventListener("pointerdown", onDown)
            host.removeEventListener("pointercancel", onUp)
            window.removeEventListener("pointerup", onUp)
            // No loseContext(): see the header note.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the style spread: the canvas is absolutely
                // positioned, so the root has no in-flow content and collapses
                // to a dot under Framer's Fit Content sizing.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                // Flat background: the canvas clears to transparent and the
                // points composite additively over this.
                background,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}

const __presetProps = {
  "background": "#080512",
  "colors": [
    "#FF6400",
    "#FFC200"
  ],
  "density": 145,
  "dotSize": 2,
  "scatter": 108,
  "cameraHeight": 50,
  "wave": {
    "waveSpeed": 250,
    "waveHeight": 200,
    "waveLength": 2070
  },
  "tilt": {
    "rollStart": 0,
    "tiltStart": 12
  },
  "cursor": {
    "cursorLift": 45,
    "cursorRadius": 25
  },
  "transition": {
    "mass": 1,
    "type": "spring",
    "delay": 0,
    "damping": 60,
    "stiffness": 800
  }
};

export default function ScrollWaveField(props: Record<string, unknown>) {
  return <__BaseImpl_ScrollWaveField {...(__presetProps as Record<string, unknown>)} {...props} />;
}
