"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * INFINITE STAIRS — an endless striped staircase falling away under a curving
 * path, hard black-and-white.
 *
 * THE SURFACE IS 128 STEPS, DRAWN RELATIVE TO THE CAMERA. Every step is a
 * tread quad (horizontal) plus a riser quad (vertical) at its far edge, each
 * split into 8 lateral segments. The CPU uploads that lattice once and then
 * advances ONE wrapped scalar per frame: `phase`, in step units. Endless motion
 * is the rule-8 depth wrap —
 *
 *     sIdx = mod(index - phase, STEPS)
 *
 * — so as `phase` crosses 1 the indices rotate by one and the step set is
 * identical. The recycle happens at the far edge, where the depth fade has
 * already taken alpha to 0. `phase` is wrapped on the CPU so it never grows
 * large enough to cost float32 precision inside `mod()`.
 *
 * THE RISER IS THE OCCLUDER, AND THAT IS THE WHOLE LOOK. A descending stair is
 * a solid wedge: from a camera above it, the block under tread `i` cuts off the
 * near portion of tread `i+1`, and it cuts off more of it the further away the
 * step is. That is why the near rows read as long white bars and the far ones
 * compress to thin dashes. So the riser is drawn — at alpha 0, but with depth
 * write ON, which is a real occluder that paints nothing. It clips the tread
 * beyond it while leaving the CSS background showing through untouched.
 * `discard` would be wrong here: it skips the depth write, so it would clip
 * nothing at all.
 *
 * THE NOTCH IN EACH BAR IS THE CURVE. Stripes are a `fract(u * Density)` test
 * in the fragment, where `u` is the lateral parameter of the step's OWN tread.
 * The path bend offsets each step laterally by `curve · bend(d)`, evaluated
 * once per step so a tread stays a rigid bar. A stripe running away from the
 * camera therefore jogs sideways at every step boundary — the staircase notch
 * in the reference frame — and the far rows stack into an arc. `bend` carries a
 * linear term as well as a quadratic one: constant curvature is pure d², whose
 * lateral rate is zero at the camera, and the stripe underfoot would then run
 * dead straight with no notch at all.
 *
 * ANTIALIASING CONVERGES TO THE DUTY CYCLE, not to black. Past the point where
 * one stripe is under a pixel, `fwidth` blends the hard edge toward `Stripe
 * Width` itself, so the horizon greys out instead of strobing. Where
 * OES_standard_derivatives is missing the fragment shader is compiled with a
 * constant filter width instead — `fwidth` is not in core GLSL ES 1.00 and
 * referencing it unguarded is a compile error, not a silent fallback.
 *
 * SPEED IS UNSIGNED AND `Direction` PICKS THE SIDE. A signed rate made "how
 * fast" and "which way" one dial, so a designer could not slow a climb without
 * passing through a descent. Hovering the component multiplies the rate by
 * HOVER_BOOST, eased on a dt-correct curve so the ramp is the same length at
 * 30fps on the canvas and 60fps in the preview.
 */

/* ------------------------------------------------------------- frozen scene */
// Cut controls, per rule 8b: the panel row is gone, the render path is not —
// each constant below sits at the defaultValue its dial last shipped with.
const STEPS = 128 // steps in the ring — sets how far the field reaches
const LAT = 8 // lateral segments per face, so the run's edge stays smooth
const RUN = 1.0 // tread depth, world units. The scene's unit of length.
const RUN_WIDTH = 22.0 // width of the staircase, world units
const Z_BACK = 1.0 // front edge of the step under the camera
const S0 = 1.0 // index of that step, so y and z agree at the camera
const FOV = 60
const NEAR = 0.05
const FAR_Z = STEPS * RUN
const FADE_START = 0.68 // fraction of FAR_Z where the depth fade begins
const FADE_END = 0.94 // and where it reaches 0, well inside the wrap
const CURVE_AT_100 = 120.0 // lateral world offset at the far edge, Curve = 100
const BEND_TIGHTEN = 2.5 // how much harder the bend turns with distance
const RISE_AT_100 = 1.0 // riser height at Step Height = 100, in RUN units
const STEPS_PER_SEC = 3.2 // travel at Speed = 50
const DOLLY = 1.5 // was Distance = 15, in tenths of a world unit
const CAM_Y = 1.0 // was Camera > Height = 10, same tenths
const STEER = 0.4 // was Camera > Steer = 40%
const STEER_YAW = 9 // degrees of yaw at Steer = 100
const STEER_PITCH = 5 // degrees of pitch at Steer = 100
const STEER_RATE = 4.4 // per second, dt-correct (was a 0.07 per-frame lerp)
const HOVER_BOOST = 2.2 // rate multiplier while the pointer is over the scene
const HOVER_RATE = 3.5 // per second, how fast that boost comes and goes
const DPR_CAP = 2
const CANVAS_FPS = 30
const FRAME_SLACK = 2

/* ==================================================================== GL CORE
 * ------------------------------------------------------------ GL CORE START */

const GROUND_VS = `
precision highp float;

// x: step index, y: lateral u (0..1), z: face (0 tread, 1 riser), w: along (0..1)
attribute vec4 aData;

uniform float uPhase;      // step units, wrapped to 0..1 on the CPU
uniform float uRise;       // world units per step
uniform float uCamY;       // camera height above its own tread
uniform float uDolly;      // frozen dolly, added to the view depth
uniform float uPitch;      // radians, down-positive
uniform float uYaw;        // radians, Tilt X plus steer
uniform float uCurve;      // lateral world offset at the far edge
uniform float uFocal;
uniform float uAspect;

varying float vU;
varying float vFade;
varying float vFace;

#define STEPS ${STEPS}.0
#define RUN ${RUN}
#define RUN_WIDTH ${RUN_WIDTH}
#define Z_BACK ${Z_BACK}
#define S0 ${S0}
#define FAR_Z ${FAR_Z}.0
#define FADE_START ${FADE_START}
#define FADE_END ${FADE_END}
#define BEND_TIGHTEN ${BEND_TIGHTEN}
#define NEAR ${NEAR}

void main(){
    vU = aData.y;
    vFace = aData.z;

    // The wrap. Every term below reads sIdx and nothing else, so rotating the
    // indices as uPhase crosses 1 reproduces the same set of steps exactly.
    float sIdx = mod(aData.x - uPhase, STEPS);

    float zFront = float(Z_BACK) - sIdx * float(RUN);
    float zBack = zFront - float(RUN);
    float yTread = -uCamY - (sIdx - float(S0)) * uRise;

    float z, y;
    if (aData.z < 0.5) {
        // Tread: flat, spanning this step's depth.
        z = mix(zFront, zBack, aData.w);
        y = yTread;
    } else {
        // Riser: the far wall of this step's block, dropping to the next tread.
        z = zBack;
        y = mix(yTread, yTread - uRise, aData.w);
    }

    // One offset for the whole step, so the tread stays a rigid bar and the
    // stripe jogs sideways at the boundary instead of shearing across the face.
    // The bend carries a LINEAR term as well as the quadratic one: a constant-
    // curvature path is pure d², whose lateral rate is zero at the camera, and
    // a stripe underfoot would then run dead straight with no notch at all.
    // The linear term is the heading the run already has when it reaches you;
    // BEND_TIGHTEN sets how much harder it turns on the way out, and the
    // normalisation keeps uCurve meaning the offset at the far edge.
    float d = max(0.0, -zFront);
    float t = d / float(FAR_Z);
    float bend = (t + float(BEND_TIGHTEN) * t * t) / (1.0 + float(BEND_TIGHTEN));
    float x = (aData.y - 0.5) * float(RUN_WIDTH) + uCurve * bend;

    // Camera basis: pitched down by uPitch, yawed by uYaw. Yaw first, so the
    // swing is about the world up axis and not about a tilted one.
    float cy = cos(uYaw), sy = sin(uYaw);
    vec3 p = vec3(x * cy + z * sy, y, -x * sy + z * cy);

    float cp = cos(uPitch), sp = sin(uPitch);
    float ex = p.x;
    float ey = p.y * cp - p.z * sp;
    float zd = -p.y * sp - p.z * cp + uDolly;

    if (zd < float(NEAR)) {
        vFade = 0.0;
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }

    vec2 sp2 = vec2(ex, ey) * uFocal / zd;
    vec2 ndc = vec2(sp2.x / uAspect, sp2.y);

    // Linear depth. The ordering is all that matters here and a linear ramp
    // spends its precision evenly instead of piling it against the near plane.
    float zLin = clamp((zd - float(NEAR)) / (float(FAR_Z) * 1.6), 0.0, 1.0) * 2.0 - 1.0;
    gl_Position = vec4(ndc * zd, zLin * zd, zd);

    // Fade to the background before the wrap, so the recycle happens where
    // there is nothing left to see.
    vFade = 1.0 - smoothstep(float(FADE_START) * float(FAR_Z), float(FADE_END) * float(FAR_Z), d);
}
`

const GROUND_FS = (deriv: boolean) => `${deriv ? "#extension GL_OES_standard_derivatives : enable\n" : ""}
precision highp float;

uniform float uDensity;    // stripes across the run
uniform float uDuty;       // stripe width, 0..1 of one period
uniform float uAccentMix;
uniform vec3 uBase;
uniform vec3 uAccent;

varying float vU;
varying float vFade;
varying float vFace;

float hash(float n){ return fract(sin(n * 12.9898) * 43758.5453); }

void main(){
    // The riser paints nothing and writes depth. That is the occluder.
    if (vFace > 0.5) { gl_FragColor = vec4(0.0); return; }

    float su = vU * uDensity;
    float f = fract(su);
    ${
        deriv
            ? "float w = max(fwidth(su), 1e-5);"
            : // No derivatives: a fixed filter width in u, scaled by the stripe
              // count, keeps the far field from strobing without them.
              "float w = max(uDensity * 0.0022, 1e-5);"
    }

    // Coverage of a band centred at uDuty/2, half-width uDuty/2. Not named
    // "half" — that is a reserved word in GLSL ES 1.00 and will not compile.
    float halfDuty = uDuty * 0.5;
    float tri = abs(f - halfDuty);
    float hard = 1.0 - smoothstep(halfDuty - w, halfDuty + w, tri);
    // Past one stripe per pixel the answer is the duty cycle itself, so the
    // horizon greys out instead of aliasing into noise.
    float blend = clamp(w * 2.0, 0.0, 1.0);
    float cov = mix(hard, uDuty, blend);

    float acc = mix(step(1.0 - uAccentMix, hash(floor(su) + 0.5)), uAccentMix, blend);
    vec3 col = mix(uBase, uAccent, acc);

    float a = cov * vFade;
    // Premultiplied: the context blends ONE / ONE_MINUS_SRC_ALPHA, so the CSS
    // background shows through every gap.
    gl_FragColor = vec4(col * a, a);
}
`

/* -------------------------------------------------------------- gl helpers */

function compileShader(
    gl: WebGLRenderingContext,
    type: number,
    src: string,
    label: string
): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn(`InfiniteStairs ${label}:`, gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function createProgram(
    gl: WebGLRenderingContext,
    vsSrc: string,
    fsSrc: string,
    label: string
): WebGLProgram | null {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc, `${label} vert`)
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc, `${label} frag`)
    if (!vs || !fs) return null
    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn(`InfiniteStairs ${label} link:`, gl.getProgramInfoLog(prog))
        gl.deleteProgram(prog)
        return null
    }
    return prog
}

// #rgb / #rrggbb / #rrggbbaa / rgb() / rgba(), to 0..1 RGB.
function parseColor(input?: string): [number, number, number] {
    if (!input) return [1, 1, 1]
    const s = input.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        const n = parseInt(h.slice(0, 6), 16)
        if (isNaN(n)) return [1, 1, 1]
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(",").map((x) => parseFloat(x))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }
    return [1, 1, 1]
}

/* -------------------------------------------------------------------- props */

type StairsGroup = { stepHeight: number; stripeWidth: number; curve: number }
type TiltGroup = { x: number; y: number }

const STAIRS_DEFAULTS: StairsGroup = { stepHeight: 11, stripeWidth: 50, curve: -70 }
const TILT_DEFAULTS: TiltGroup = { x: 0, y: 20 }

interface InfiniteStairsProps {
    background?: string
    baseColor?: string
    accentColor?: string
    accentMix?: number
    density?: number
    speed?: number
    direction?: "descend" | "climb"
    stairs?: Partial<StairsGroup>
    tilt?: Partial<TiltGroup>
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ---------------------------------------------------------------- component */

function __BaseImpl_InfiniteStairs(props: InfiniteStairsProps) {
    const {
        background = "#000000",
        baseColor = "#ffffff",
        accentColor = "#6699ff",
        accentMix = 0,
        density = 30,
        speed = 13,
        direction = "descend",
        stairs,
        tilt,
        style,
    } = props

    // A group the designer never opened arrives undefined, and one opened
    // before a field existed arrives missing that field — spread-merge over a
    // typed literal rather than a ?? chain, where one missed key silently pins
    // a control forever.
    const st: StairsGroup = { ...STAIRS_DEFAULTS, ...(stairs ?? {}) }
    const tl: TiltGroup = { ...TILT_DEFAULTS, ...(tilt ?? {}) }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Every live input is read from this ref inside the loop. In the effect's
    // deps it would rebuild the GL context on every colour nudge (rule 6).
    const live = useRef({
        speed: 50,
        dir: 1,
        density: 30,
        duty: 0.5,
        rise: 0.2,
        pitch: 20,
        yaw: 0,
        curve: -84,
        accentMix: 0,
        base: [1, 1, 1] as [number, number, number],
        accent: [1, 1, 1] as [number, number, number],
    })
    live.current = {
        // Unsigned rate; Direction owns the sign.
        speed: Math.min(100, Math.max(0, speed)),
        dir: direction === "climb" ? -1 : 1,
        // Stripes across the run. A uniform, not a buffer size — the lattice
        // never changes shape, so Density costs nothing to turn.
        density: Math.max(1, density),
        duty: Math.min(0.98, Math.max(0.02, st.stripeWidth / 100)),
        rise: (st.stepHeight / 100) * RISE_AT_100 * RUN,
        pitch: tl.y,
        yaw: tl.x,
        curve: (st.curve / 100) * CURVE_AT_100,
        accentMix: Math.min(100, Math.max(0, accentMix)) / 100,
        base: parseColor(baseColor),
        accent: parseColor(accentColor),
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
            depth: true,
            powerPreference: "high-performance",
        }) as WebGLRenderingContext | null
        if (!gl) return

        // fwidth is not core GLSL ES 1.00 — compile the branch the driver can
        // actually run rather than letting the shader fail to compile.
        const hasDeriv = !!gl.getExtension("OES_standard_derivatives")

        const ground = createProgram(gl, GROUND_VS, GROUND_FS(hasDeriv), "ground")
        if (!ground) return

        const aData = gl.getAttribLocation(ground, "aData")
        const G = (n: string) => gl.getUniformLocation(ground, n)
        const ug = {
            phase: G("uPhase"),
            rise: G("uRise"),
            camY: G("uCamY"),
            dolly: G("uDolly"),
            pitch: G("uPitch"),
            yaw: G("uYaw"),
            curve: G("uCurve"),
            focal: G("uFocal"),
            aspect: G("uAspect"),
            density: G("uDensity"),
            duty: G("uDuty"),
            accentMix: G("uAccentMix"),
            base: G("uBase"),
            accent: G("uAccent"),
        }

        /* ---- lattice, built once ---- */
        // Six vertices per quad, no index buffer: STEPS × 2 faces × LAT × 6 is
        // 12,288 vertices, and one buffer keeps the draw to a single call.
        const VERTS = 6
        const QUAD = [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 0],
            [1, 1],
            [0, 1],
        ]
        const quadCount = STEPS * 2 * LAT
        const data = new Float32Array(quadCount * VERTS * 4)
        let o = 0
        for (let i = 0; i < STEPS; i++) {
            for (let face = 0; face < 2; face++) {
                for (let k = 0; k < LAT; k++) {
                    for (let v = 0; v < VERTS; v++) {
                        data[o++] = i
                        data[o++] = (k + QUAD[v][0]) / LAT
                        data[o++] = face
                        data[o++] = QUAD[v][1]
                    }
                }
            }
        }
        const vboGround = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, vboGround)
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)

        gl.enable(gl.BLEND)
        // Premultiplied "over": the riser writes vec4(0) and leaves the CSS
        // background untouched while still filling the depth buffer.
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)
        gl.depthMask(true)
        gl.disable(gl.CULL_FACE)
        gl.clearColor(0, 0, 0, 0)

        const focal = 1 / Math.tan(((FOV * Math.PI) / 180) * 0.5)

        /* ---- pointer: steer, and the hover speed boost ---- */
        // Bound to the HOST: on window, pointer motion anywhere on the page
        // would swing the camera and hold the boost on forever, since window's
        // pointerleave effectively never fires.
        const ptr = { x: 0, y: 0, tx: 0, ty: 0 }
        const hover = { t: 0, target: 0 }
        const onMove = (e: PointerEvent) => {
            hover.target = 1
            const r = host.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            // A RATIO of rect terms, so the canvas zoom cancels (rule G forbids
            // rect for absolute px, which this is not).
            ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1
            ptr.ty = -(((e.clientY - r.top) / r.height) * 2 - 1)
        }
        const onEnter = () => {
            hover.target = 1
        }
        const onLeave = () => {
            hover.target = 0
            ptr.tx = 0
            ptr.ty = 0
        }
        host.addEventListener("pointerenter", onEnter)
        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerleave", onLeave)
        host.addEventListener("pointercancel", onLeave)

        /* ---- loop ---- */
        let raf = 0
        let lastDraw = 0
        // Wrapped on the CPU so it never grows large enough to cost float32
        // precision inside mod().
        let phase = 0

        const render = (now: number) => {
            raf = requestAnimationFrame(render)

            const dt = lastDraw ? Math.min(0.05, (now - lastDraw) / 1000) : 1 / 60
            lastDraw = now

            const L = live.current

            // dt-correct easing, so the canvas's 30fps and the preview's 60fps
            // settle over the same wall-clock time.
            const kSteer = 1 - Math.exp(-STEER_RATE * dt)
            ptr.x += (ptr.tx - ptr.x) * kSteer
            ptr.y += (ptr.ty - ptr.y) * kSteer
            hover.t += (hover.target - hover.t) * (1 - Math.exp(-HOVER_RATE * dt))

            // 50 is the rate the scene shipped at; Direction owns the sign and
            // hover multiplies whatever the dial says.
            const boost = 1 + hover.t * (HOVER_BOOST - 1)
            phase += L.dir * (L.speed / 50) * STEPS_PER_SEC * boost * dt
            phase = ((phase % STEPS) + STEPS) % STEPS

            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const cw = canvas.clientWidth || host.clientWidth || 0
            const ch = canvas.clientHeight || host.clientHeight || 0
            const w = Math.max(1, Math.floor(cw * dpr))
            const h = Math.max(1, Math.floor(ch * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            gl.viewport(0, 0, w, h)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

            const aspect = w / Math.max(1, h)
            // Tilt X is the resting yaw; the pointer swings around it.
            const yaw = ((L.yaw + ptr.x * STEER * STEER_YAW) * Math.PI) / 180
            const pitch =
                ((L.pitch + ptr.y * STEER * STEER_PITCH) * Math.PI) / 180

            gl.useProgram(ground)
            gl.bindBuffer(gl.ARRAY_BUFFER, vboGround)
            gl.enableVertexAttribArray(aData)
            gl.vertexAttribPointer(aData, 4, gl.FLOAT, false, 0, 0)

            gl.uniform1f(ug.phase, phase)
            gl.uniform1f(ug.rise, L.rise)
            gl.uniform1f(ug.camY, CAM_Y)
            gl.uniform1f(ug.dolly, DOLLY)
            gl.uniform1f(ug.pitch, pitch)
            gl.uniform1f(ug.yaw, yaw)
            gl.uniform1f(ug.curve, L.curve)
            gl.uniform1f(ug.focal, focal)
            gl.uniform1f(ug.aspect, aspect)
            gl.uniform1f(ug.density, L.density)
            gl.uniform1f(ug.duty, L.duty)
            gl.uniform1f(ug.accentMix, L.accentMix)
            gl.uniform3fv(ug.base, L.base)
            gl.uniform3fv(ug.accent, L.accent)
            gl.drawArrays(gl.TRIANGLES, 0, quadCount * VERTS)
            gl.disableVertexAttribArray(aData)
        }
        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            host.removeEventListener("pointerenter", onEnter)
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerleave", onLeave)
            host.removeEventListener("pointercancel", onLeave)
            gl.deleteBuffer(vboGround)
            gl.deleteProgram(ground)
            // No loseContext(): getContext returns the same context per canvas,
            // so StrictMode's mount/cleanup/mount would reuse a force-lost one.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the style spread: the canvas is absolutely
                // positioned, so the root has no in-flow content and would
                // collapse to a dot under Framer's Fit Content sizing.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
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
                }}
            />
        </div>
    )
}

const __presetProps = {
  "background": "#000000",
  "baseColor": "#ffffff",
  "accentColor": "#6699ff",
  "accentMix": 60,
  "density": 26,
  "speed": 33,
  "direction": "descend",
  "stairs": {
    "curve": -70,
    "stepHeight": 18,
    "stripeWidth": 50
  }
};

export default function InfiniteStairs(props: Record<string, unknown>) {
  return <__BaseImpl_InfiniteStairs {...(__presetProps as Record<string, unknown>)} {...props} />;
}
