"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ *
 *  CausticWeave
 *  A diagonal travelling wave cinched through a hyperbolic waist, on a
 *  single full-screen WebGL quad.
 *
 *  The picture is one scalar field:
 *    1. the sample point is normalised against the SHORT side, framed
 *       (centre / scale) and rotated onto the diagonal
 *    2. domain-warped a few folds            -> the fabric billow
 *    3. the coordinate the wave is read along is multiplied by a gaussian
 *       ridge, 1 + k*exp(-a*x*x). That is the waist: the period is squeezed
 *       to knife-edge folds in the centre corridor and left wide at the
 *       corners, which is also why the corners read as concentric arcs
 *    4. a carrier travels along that pinched axis, plus a slower cross term
 *       on the perpendicular axis for the billow and the beat
 *    5. the sum drives a non-cyclic indigo -> violet -> crimson -> white-pink
 *       ramp, then a normal built from the field's own analytic gradient
 *       adds the directional glare that makes the ridges read as satin
 *
 *  The pinch in step 3 is the whole effect: everything else is a plain
 *  travelling sine.
 * ------------------------------------------------------------------ */

/* ----------------------------------------------------------- defaults */

const MAX_STOPS = 8

/** The diagonal carrier, the waist that cinches it, and the framing. */
const DEFAULT_FIELD = {
    scale: 5,
    // -45 puts the travel on the corner-to-corner diagonal
    angle: -45,
    // folds across the waist; the corners get roughly a third of this
    folds: 14,
    pinch: 2.2,
    pinchWidth: 3,
    crossFreq: 4,
    crossMix: 0.25,
    centerX: 0,
    centerY: 0,
}

/** The fold that gives the carrier its fabric billow. */
const DEFAULT_WARP = {
    amount: 2,
    scale: 2.5,
    detail: 2,
}

/** How the field is shaded once it has a value. */
const DEFAULT_SURFACE = {
    ramp: 5.5,
    sheen: 5.5,
    glow: 3,
    grain: 2.5,
    opacity: 100,
}

/** The slow motions riding on top of Speed. */
const DEFAULT_TRAVEL = {
    direction: "forward" as const,
    spin: 1.4,
    breathe: 4,
}

const DEFAULTS = {
    colors: [
        "#050126", // base valley, midnight indigo
        "#12006B", // indigo
        "#2C00A0", // electric purple-blue, the mid-flank
        "#6A0BB0", // violet
        "#B20A66", // magenta seam
        "#E60C2C", // crimson-scarlet, the upper crest
        "#FF5A3C", // ember
        "#FFF2F7", // specular white-pink, the compressed ridge focus
    ],
    background: "#000000",
    speed: 10,
    paused: false,
    interactive: true,
    sensitivity: 10,
}

/* -------------------------------------------------------------- types */

export interface CausticWeaveField {
    /** 0-10 zoom, 5 = neutral (exponential) */
    scale?: number
    /** Static rotation of the whole field, degrees */
    angle?: number
    /** Folds across the pinched centre corridor */
    folds?: number
    /** How hard the waist cinches. 0 = plain parallel bands, no waist. */
    pinch?: number
    /** How narrow the waist corridor is; higher = tighter belt */
    pinchWidth?: number
    /** Frequency of the cross term on the perpendicular axis */
    crossFreq?: number
    /** 0-1 how much the cross term contributes */
    crossMix?: number
    /** Frame offset from centre, % of half-width */
    centerX?: number
    /** Frame offset from centre, % of half-height */
    centerY?: number
}

export interface CausticWeaveWarp {
    /** 0-10 how far the fold pushes the sample point */
    amount?: number
    /** 0-10 fold frequency; low = long swells, high = ripple */
    scale?: number
    /** 1-3 fold iterations */
    detail?: number
}

export interface CausticWeaveSurface {
    /** 0-10 palette weighting; higher = wider dark, thinner crests */
    ramp?: number
    /** 0-10 directional specular glare on the ridges (pseudo-normal lit) */
    sheen?: number
    /** 0-10 bloom on the crests */
    glow?: number
    /** 0-10 dither, also kills 8-bit colour banding */
    grain?: number
    /** 0-100 */
    opacity?: number
}

export interface CausticWeaveTravel {
    /** Which way the wave-fronts drift. Forward is the reference's upward
     *  travel; the on-screen direction rotates with Field > Angle, because
     *  crests always move perpendicular to the ribbons. */
    direction?: "forward" | "reverse"
    /** -10..10 rotation of the whole field */
    spin?: number
    /** 0-10 slow swell of the warp, and how far B detunes from A. Both ride
     *  a longer period than Speed, so the beat wanders instead of looping. */
    breathe?: number
}

export interface CausticWeaveProps {
    /** Palette stops, valley -> crest. Each fold is symmetric about its
     *  bright core, so the last stop only shows on the pinched ridges. */
    colors?: string[]
    /** Colour filling the troughs, under the field */
    background?: string
    field?: CausticWeaveField
    warp?: CausticWeaveWarp
    surface?: CausticWeaveSurface
    /** 0-10 rate the wave-fronts travel */
    speed?: number
    travel?: CausticWeaveTravel
    /** Freeze the animation */
    paused?: boolean
    /** Let the pointer drag the field around */
    interactive?: boolean
    /** 0-10 pointer influence */
    sensitivity?: number
    style?: CSSProperties
}

/* ------------------------------------------------------------- shaders */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
#define MAX_STOPS ${MAX_STOPS}

varying vec2 vUv;

uniform float uTime;
uniform vec3  uColors[MAX_STOPS];
uniform int   uCount;
uniform float uAspect;
uniform vec2  uCenter;
uniform float uScale;
uniform float uRotation;
uniform float uFolds;
uniform float uPinch;
uniform float uPinchWidth;
uniform float uCrossFreq;
uniform float uCrossMix;
uniform float uWarp;
uniform float uWarpFreq;
uniform float uDetail;
uniform float uPixel;
uniform float uPhase;
uniform float uPhaseB;
uniform float uRamp;
uniform float uSheen;
uniform float uGlow;
uniform float uGrain;
uniform vec3  uBg;
uniform float uOpacity;

// Key light for the ridges, pre-normalised because GLSL ES will not run
// normalize() in a const initialiser. Up and to the left, slightly toward
// the viewer. Fixed: this is the look, and a movable light is a lighting rig.
const vec3  LIGHT_DIR  = vec3(-0.5503, 0.6003, 0.5803);
const float SPEC_BUMP  = 1.6;  // how far the slope tilts the normal
const float SPEC_SHINE = 14.0; // exponent: higher = tighter, harder glare

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Non-cyclic ramp: 0 is the trough, 1 the hot core. Because the field is a
// sine, every band comes out symmetric about its crest, which is what reads
// as a lit ribbon rather than a sawtooth stripe.
vec3 palette(float t) {
    t = clamp(t, 0.0, 1.0);
    float span = float(uCount - 1);
    if (span < 0.5) return uColors[0];

    float u = t * span;
    float i = min(floor(u), span - 1.0);
    float k = clamp(u - i, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);

    vec3 a = uColors[0];
    vec3 b = uColors[0];
    for (int n = 0; n < MAX_STOPS; n++) {
        if (float(n) == i)       a = uColors[n];
        if (float(n) == i + 1.0) b = uColors[n];
    }
    return mix(a, b, k);
}

void main() {
    vec2 p = vUv * 2.0 - 1.0;
    // Normalise against the SHORT side, so the waist keeps its proportions on
    // a tall frame instead of stretching with the canvas.
    p *= vec2(max(uAspect, 1.0), max(1.0 / uAspect, 1.0));
    p = (p - uCenter) / max(uScale, 0.01);
    p = rot(uRotation) * p;

    // --- domain warp --------------------------------------------------
    // Each fold feeds back into the next, so two are already enough to give
    // the carrier its billow instead of leaving it a ruled grating.
    vec2 q = p;
    for (int i = 0; i < 3; i++) {
        float fi = float(i) + 1.0;
        float on = step(fi - 0.5, uDetail); // loop bound must stay constant
        q += on * (uWarp / fi) * vec2(
            sin(uWarpFreq * fi * q.y + uPhase * 0.70 + fi * 1.7),
            sin(uWarpFreq * fi * q.x - uPhase * 0.50 + fi * 2.3)
        );
    }

    // --- the waist ------------------------------------------------------
    // A gaussian ridge along q.x = 0 scales the axis the carrier is read
    // along. The period is squeezed to knife-edge folds inside the corridor
    // and left wide at the corners -- which is also what turns the corners
    // into concentric arcs, since lines of constant phase bend around the
    // ridge. dPinch is its slope, carried for the band-limit and the light.
    float e = exp(-uPinchWidth * q.x * q.x);
    float pinch = 1.0 + uPinch * e;
    float dPinch = uPinch * e * (-2.0 * uPinchWidth * q.x);

    float phi  = q.y * pinch * uFolds + uPhase;
    float cphi = q.x * uCrossFreq + uPhaseB;

    // --- band-limit -----------------------------------------------------
    // Analytic rate of phi across the frame. The waist drives the local
    // frequency far past a pixel at the centre, so without this the corridor
    // -- the whole point of the effect -- is exactly where it aliases worst.
    float gx = uFolds * q.y * dPinch - uCrossMix * uCrossFreq * sin(cphi);
    float gy = uFolds * pinch;

#ifdef HAS_DERIV
    // q is continuous everywhere, so its derivative is safe to take
    float pix = length(vec2(fwidth(q.x), fwidth(q.y)));
#else
    float pix = uPixel;
#endif

    float fw = pix * length(vec2(gx, gy));
    float fade = 1.0 / (1.0 + fw * fw * 0.35);

    float w = (sin(phi) + uCrossMix * cos(cphi)) * fade;
    float t = clamp(w / (1.0 + uCrossMix) * 0.5 + 0.5, 0.0, 1.0);

    float shaped = pow(t, uRamp);

    // --- pseudo-normal specular -----------------------------------------
    // There is no surface here to light, so build a normal from the field
    // itself: direction from the phase gradient, magnitude from the carrier's
    // own slope. Because the gradient is largest inside the waist, the glare
    // lands on the compressed ridges and fades out in the broad corners,
    // which is exactly where the reference puts it.
    vec2 g = vec2(gx, gy);
    vec2 slope = cos(phi) * fade * (g / max(length(g), 1e-6));

    vec3 N = normalize(vec3(-slope * SPEC_BUMP, 1.0));
    float spec = pow(max(dot(N, LIGHT_DIR), 0.0), SPEC_SHINE) * uSheen;

#ifdef HAS_DERIV
    float dt = fwidth(shaped) * 0.5;
#else
    float dt = 0.004;
#endif
    dt = clamp(dt, 0.0005, 0.25);

    // 3 taps across the ramp: cheap anti-alias for the crest
    vec3 col = (palette(shaped) + palette(shaped - dt) + palette(shaped + dt)) / 3.0;

    // Glow is the isotropic bloom on a crest; spec is the directional glare
    // that moves as the ribbon turns. They are different things.
    col += uGlow * smoothstep(0.72, 1.0, shaped) + spec;

    // the ground shows through the troughs only
    col += uBg * (1.0 - smoothstep(0.0, 0.35, shaped));

    col += (hash(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5) * uGrain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), uOpacity);
}
`

/* ------------------------------------------------------------- helpers */

let parseCtx: CanvasRenderingContext2D | null | undefined

/** CSS colour string -> normalised rgb triple. */
function toRGB(css: string): [number, number, number] {
    if (!css) return [0, 0, 0]
    const s = css.trim()

    const hex = /^#([0-9a-f]{3,8})$/i.exec(s)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4) {
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        }
        const n = parseInt(h.slice(0, 6), 16)
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }

    const fn = /^rgba?\(([^)]+)\)$/i.exec(s)
    if (fn) {
        const parts = fn[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3)
        const v = parts.map((x) =>
            x.indexOf("%") >= 0 ? parseFloat(x) * 2.55 : parseFloat(x)
        )
        return [(v[0] || 0) / 255, (v[1] || 0) / 255, (v[2] || 0) / 255]
    }

    // named colours, hsl(), oklch() ... let the browser resolve it
    if (typeof document !== "undefined") {
        if (parseCtx === undefined) {
            parseCtx = document.createElement("canvas").getContext("2d")
        }
        if (parseCtx) {
            parseCtx.fillStyle = "#000000"
            parseCtx.fillStyle = s
            const out = parseCtx.fillStyle
            if (typeof out === "string" && out.charAt(0) === "#" && out !== s) {
                return toRGB(out)
            }
        }
    }
    return [0, 0, 0]
}

function compile(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh)
        return null
    }
    return sh
}

// The field is a handful of trig ops per pixel, so it holds full retina rate
// on anything that can run WebGL at all. Nothing here to trade away.
const DPR_CAP = 2

type Resolved = {
    colors: string[]
    background: string
    field: Required<CausticWeaveField>
    warp: Required<CausticWeaveWarp>
    surface: Required<CausticWeaveSurface>
    speed: number
    travel: Required<CausticWeaveTravel>
    paused: boolean
    interactive: boolean
    sensitivity: number
}

/* ----------------------------------------------------------- component */

export default function CausticWeave({
    colors = ["#12006B","#2C00A0","#6A0BB0","#B20A66","#E60C2C","#FF5A3C","#FFF2F7"],
    background = DEFAULTS.background,
    field,
    warp,
    surface,
    speed = DEFAULTS.speed,
    travel,
    paused = DEFAULTS.paused,
    interactive = DEFAULTS.interactive,
    sensitivity = DEFAULTS.sensitivity,
    style,
}: CausticWeaveProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [failed, setFailed] = useState(false)

    // Partial group objects are normal in Framer, so every group merges over
    // its DEFAULT_* constant rather than being trusted whole.
    const resolved: Resolved = {
        colors,
        background,
        field: {
            defaultValue: {"angle":-112,"folds":31,"pinch":2.6,"scale":4.1,"centerX":0,"centerY":0,"crossMix":1,"crossFreq":6.7,"pinchWidth":4.1}, ...DEFAULT_FIELD, ...field },
        warp: {
            defaultValue: {"scale":3.3,"amount":6.3,"detail":3}, ...DEFAULT_WARP, ...warp },
        surface: {
            defaultValue: {"glow":3,"ramp":5.5,"grain":2.5,"sheen":5.5,"opacity":100}, ...DEFAULT_SURFACE, ...surface },
        speed,
        travel: {
            defaultValue: {"spin":2.5,"breathe":4,"direction":"forward"}, ...DEFAULT_TRAVEL, ...travel },
        paused,
        interactive,
        sensitivity,
    }

    // Live prop mirror. The render loop reads from here so that tweaking a
    // control never tears down the GL context.
    const propsRef = useRef<Resolved>(resolved)
    propsRef.current = resolved

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        let disposed = false
        let raf = 0
        let gl: WebGLRenderingContext | null = null
        let program: WebGLProgram | null = null
        let buffer: WebGLBuffer | null = null
        let uni: Record<string, WebGLUniformLocation | null> = {}

        let onScreen = true
        let pageVisible = true

        // accumulators, so a speed change never snaps the pattern
        let elapsed = 0
        let phase = 0
        let phaseB = 0
        let rotation = 0
        let breathePhase = 0
        let lastNow = 0

        // pointer, smoothed
        let px = 0
        let py = 0
        let tx = 0
        let ty = 0

        const colorBuf = new Float32Array(MAX_STOPS * 3)

        /* ------------------------------------------------------ setup */

        function init(): boolean {
            const ctx =
                (canvas.getContext("webgl", {
                    alpha: true,
                    antialias: false,
                    premultipliedAlpha: false,
                    powerPreference: "high-performance",
                }) as WebGLRenderingContext | null) ||
                (canvas.getContext(
                    "experimental-webgl"
                ) as WebGLRenderingContext | null)

            if (!ctx) return false
            gl = ctx

            const deriv = gl.getExtension("OES_standard_derivatives")
            const hp = gl.getShaderPrecisionFormat(
                gl.FRAGMENT_SHADER,
                gl.HIGH_FLOAT
            )
            const precision = hp && hp.precision > 0 ? "highp" : "mediump"

            const prelude =
                (deriv
                    ? "#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIV 1\n"
                    : "") +
                "precision " +
                precision +
                " float;\n"

            const vs = compile(gl, gl.VERTEX_SHADER, VERT)
            const fs = compile(gl, gl.FRAGMENT_SHADER, prelude + FRAG)
            if (!vs || !fs) return false

            const prog = gl.createProgram()
            if (!prog) return false
            gl.attachShader(prog, vs)
            gl.attachShader(prog, fs)
            gl.bindAttribLocation(prog, 0, "aPos")
            gl.linkProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false

            program = prog
            gl.useProgram(prog)

            buffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([-1, -1, 3, -1, -1, 3]),
                gl.STATIC_DRAW
            )
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

            const names = [
                "uTime",
                "uColors[0]",
                "uCount",
                "uAspect",
                "uCenter",
                "uScale",
                "uRotation",
                "uFolds",
                "uPinch",
                "uPinchWidth",
                "uCrossFreq",
                "uCrossMix",
                "uWarp",
                "uWarpFreq",
                "uDetail",
                "uPixel",
                "uPhase",
                "uPhaseB",
                "uRamp",
                "uSheen",
                "uGlow",
                "uGrain",
                "uBg",
                "uOpacity",
            ]
            uni = {}
            for (const n of names) uni[n] = gl.getUniformLocation(prog, n)

            gl.clearColor(0, 0, 0, 0)
            return true
        }

        /* ----------------------------------------------------- resize */

        function resize() {
            if (!gl) return
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const w = Math.max(1, Math.round(host.clientWidth * dpr))
            const h = Math.max(1, Math.round(host.clientHeight * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
                gl.viewport(0, 0, w, h)
            }
        }

        /* ------------------------------------------------------ frame */

        function draw(dt: number) {
            if (!gl || !program) return
            const p = propsRef.current
            const f = p.field
            const wp = p.warp
            const s = p.surface
            const tv = p.travel

            if (!p.paused) {
                elapsed += dt
                const step =
                    dt *
                    p.speed *
                    0.35 *
                    (tv.direction === "reverse" ? 1 : -1)
                phase += step
                // B's clock detunes around 0.86 of A's. The offset is what
                // makes the interference beat wander rather than sit still.
                // the cross term runs at half the carrier's rate, and Breathe
                // detunes it so the beat wanders instead of looping
                phaseB -=
                    step *
                    (0.5 + tv.breathe * 0.03 * Math.sin(breathePhase))
                rotation += dt * tv.spin * 0.01
                // deliberately incommensurate with phase, so the field never
                // visibly repeats the way a single looping period would
                breathePhase += dt * 0.22
            }

            // pointer easing
            const k = Math.min(1, dt * 4)
            px += (tx - px) * k
            py += (ty - py) * k
            const pull = p.interactive ? p.sensitivity * 0.045 : 0

            const list = (
                p.colors && p.colors.length ? p.colors : DEFAULTS.colors
            ).slice(0, MAX_STOPS)
            colorBuf.fill(0)
            for (let i = 0; i < list.length; i++) {
                const c = toRGB(list[i])
                colorBuf[i * 3] = c[0]
                colorBuf[i * 3 + 1] = c[1]
                colorBuf[i * 3 + 2] = c[2]
            }
            const bg = toRGB(p.background)

            const w = canvas.width
            const h = canvas.height

            gl.useProgram(program)
            gl.uniform1f(uni["uTime"], elapsed)
            gl.uniform3fv(uni["uColors[0]"], colorBuf)
            gl.uniform1i(uni["uCount"], Math.max(1, list.length))
            gl.uniform1f(uni["uAspect"], w / Math.max(1, h))
            gl.uniform2f(
                uni["uCenter"],
                f.centerX / 100 + px * pull,
                -f.centerY / 100 - py * pull
            )
            // exponential so 5 is neutral and the useful range is reachable
            const scale = Math.pow(2.4, (f.scale - 5) / 2.5)
            gl.uniform1f(uni["uScale"], scale)
            // field units per pixel, for the band-limit where the GPU has no
            // derivatives. Ignores the warp, which is close enough at 1 px.
            gl.uniform1f(uni["uPixel"], 2 / Math.max(1, Math.min(w, h)) / scale)
            gl.uniform1f(uni["uRotation"], (f.angle * Math.PI) / 180 + rotation)
            gl.uniform1f(uni["uFolds"], f.folds)
            gl.uniform1f(uni["uPinch"], f.pinch)
            gl.uniform1f(uni["uPinchWidth"], f.pinchWidth)
            gl.uniform1f(uni["uCrossFreq"], f.crossFreq)
            gl.uniform1f(uni["uCrossMix"], f.crossMix)
            // the swell rides on the warp, which is where the frames show it
            const swell = 1 + tv.breathe * 0.05 * Math.sin(breathePhase)
            gl.uniform1f(uni["uWarp"], wp.amount * 0.055 * swell)
            gl.uniform1f(uni["uWarpFreq"], 0.4 + wp.scale * 0.22)
            gl.uniform1f(uni["uDetail"], Math.round(wp.detail))
            gl.uniform1f(uni["uPhase"], phase)
            gl.uniform1f(uni["uPhaseB"], phaseB)
            gl.uniform1f(uni["uRamp"], 0.6 + s.ramp * 0.26)
            gl.uniform1f(uni["uSheen"], s.sheen * 0.022)
            gl.uniform1f(uni["uGlow"], s.glow * 0.035)
            gl.uniform1f(uni["uGrain"], s.grain * 0.006)
            gl.uniform3f(uni["uBg"], bg[0], bg[1], bg[2])
            gl.uniform1f(
                uni["uOpacity"],
                Math.max(0, Math.min(1, s.opacity / 100))
            )

            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        function loop(now: number) {
            if (disposed) return
            raf = requestAnimationFrame(loop)
            if (!onScreen || !pageVisible) {
                lastNow = now
                return
            }
            const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.05) : 0
            lastNow = now
            resize()
            draw(dt)
        }

        /* --------------------------------------------------- listeners */

        if (!init()) {
            setFailed(true)
            return
        }

        const ro =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => resize())
                : null
        if (ro) ro.observe(host)

        const io =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(
                      (entries) => {
                          onScreen = entries.some((e) => e.isIntersecting)
                      },
                      { rootMargin: "128px" }
                  )
                : null
        if (io) io.observe(host)

        const onVisibility = () => {
            pageVisible = document.visibilityState !== "hidden"
        }
        document.addEventListener("visibilitychange", onVisibility)

        const onPointer = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            if (!r.width || !r.height) return
            tx = ((e.clientX - r.left) / r.width) * 2 - 1
            ty = ((e.clientY - r.top) / r.height) * 2 - 1
        }
        const onLeave = () => {
            tx = 0
            ty = 0
        }
        host.addEventListener("pointermove", onPointer)
        host.addEventListener("pointerleave", onLeave)

        const onLost = (e: Event) => {
            e.preventDefault()
            cancelAnimationFrame(raf)
        }
        const onRestored = () => {
            if (disposed) return
            lastNow = 0
            if (init()) raf = requestAnimationFrame(loop)
            else setFailed(true)
        }
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        resize()
        raf = requestAnimationFrame(loop)

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            if (ro) ro.disconnect()
            if (io) io.disconnect()
            document.removeEventListener("visibilitychange", onVisibility)
            host.removeEventListener("pointermove", onPointer)
            host.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            if (gl) {
                if (buffer) gl.deleteBuffer(buffer)
                if (program) gl.deleteProgram(program)
                const lose = gl.getExtension("WEBGL_lose_context")
                if (lose) lose.loseContext()
            }
        }
    }, [])

    // Static approximation for the rare no-WebGL case.
    const stops = colors && colors.length ? colors : DEFAULTS.colors
    const fallbackStyle: CSSProperties = failed
        ? {
              background:
                  "conic-gradient(from 200deg at 22% 18%, " +
                  stops.join(", ") +
                  ", " +
                  stops[0] +
                  ")",
              filter: "blur(56px) saturate(1.25)",
          }
        : {}

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
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
                    ...fallbackStyle,
                }}
            />
        </div>
    )
}
