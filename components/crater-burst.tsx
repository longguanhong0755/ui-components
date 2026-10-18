"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/* ---------------------------------------------------------------- types --- */

interface CraterGroup {
    roughness: number
    lobes: number
}

interface MotionGroup {
    damping: number
    streak: number
}

interface Props {
    background?: string
    baseColor?: string
    density?: number
    dotSize?: number
    speed?: number
    reach?: number
    scatter?: number
    crater?: Partial<CraterGroup>
    motion?: Partial<MotionGroup>
    style?: CSSProperties
}

type Vec3 = [number, number, number]

/* ------------------------------------------------------------- constants --- */

/** Half-height of the seeded field in world units. 1.0 is the frame edge; the
 *  margin covers the outward push, which is < 0.01 world units past d = 1.5. */
const FIELD_HALF = 1.15
/** Buffers are allocated at this; Density only moves the draw count. */
const MAX_POINTS = 160000
/** Spring's natural frequency, rad/s. Damping sets the ratio, not this. */
const OMEGA = 9
/** Streak is a motion-blur exposure: this many seconds of travel at Streak 100%. */
const STREAK_SECONDS = 0.15
/** No streak ever longer than this, in world units (half-height = 1). */
const STREAK_MAX_WORLD = 0.18
/** One dot is this many CSS px at Dot Size 100%. */
const DOT_PX = 1.6
const MAX_DPR = 2

const CRATER_DEFAULTS: CraterGroup = { roughness: 55, lobes: 5 }
const MOTION_DEFAULTS: MotionGroup = { damping: 30, streak: 100 }

/* --------------------------------------------------------------- helpers --- */

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

/** Accepts rgb()/hsl()/var(), not only hex. */
function parseColor(input: string | undefined, fallback: Vec3): Vec3 {
    let s = String(input ?? "").trim()
    if (!s) return fallback

    if (s.startsWith("var(")) {
        const comma = s.indexOf(",")
        if (comma < 0) return fallback
        s = s.slice(comma + 1, s.lastIndexOf(")")).trim()
    }

    if (s.startsWith("#")) {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
        return fallback
    }

    const rgb = s.match(/rgba?\(([^)]+)\)/i)
    if (rgb) {
        const p = rgb[1].split(/[,/\s]+/).map(v => parseFloat(v))
        if (p.length >= 3 && isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2])) {
            return [clamp(p[0], 0, 255) / 255, clamp(p[1], 0, 255) / 255, clamp(p[2], 0, 255) / 255]
        }
    }

    const hsl = s.match(/hsla?\(([^)]+)\)/i)
    if (hsl) {
        const p = hsl[1].split(/[,/\s]+/).map(v => parseFloat(v))
        if (p.length >= 3 && isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2])) {
            const h = ((p[0] % 360) + 360) / 360
            const sat = clamp(p[1], 0, 100) / 100
            const li = clamp(p[2], 0, 100) / 100
            const c = (1 - Math.abs(2 * li - 1)) * sat
            const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
            const m = li - c / 2
            const seg = Math.floor(h * 6) % 6
            const t: Vec3 =
                seg === 0
                    ? [c, x, 0]
                    : seg === 1
                      ? [x, c, 0]
                      : seg === 2
                        ? [0, c, x]
                        : seg === 3
                          ? [0, x, c]
                          : seg === 4
                            ? [x, 0, c]
                            : [c, 0, x]
            return [t[0] + m, t[1] + m, t[2] + m]
        }
    }

    return fallback
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("CraterBurst compile:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function link(
    gl: WebGL2RenderingContext,
    vsSrc: string,
    fsSrc: string,
    varyings?: string[]
): WebGLProgram | null {
    const vs = compile(gl, gl.VERTEX_SHADER, vsSrc)
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc)
    if (!vs || !fs) return null

    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    // Must be set BEFORE linking, or the varyings are simply not captured.
    if (varyings) gl.transformFeedbackVaryings(prog, varyings, gl.INTERLEAVED_ATTRIBS)
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("CraterBurst link:", gl.getProgramInfoLog(prog))
        return null
    }
    return prog
}

/* --------------------------------------------------------------- shaders --- */

/**
 * The integrator, under RASTERIZER_DISCARD. home and seed are passed straight
 * through so one interleaved buffer carries the whole particle.
 *
 * FLOATS PER PARTICLE: home.xy, pos.xy, vel.xy, seed = 7.
 */
const UPDATE_VS = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aHome;
layout(location = 1) in vec2 aPos;
layout(location = 2) in vec2 aVel;
layout(location = 3) in float aSeed;

out vec2 vHome;
out vec2 vPos;
out vec2 vVel;
out float vSeed;

uniform vec2 uPointer;
uniform float uTime;
uniform float uDt;
uniform float uReach;
uniform float uRough;
uniform float uLobes;
uniform float uK;
uniform float uC;

#define CRATER_SUPPORT 2.2

void main() {
    // Measured from HOME, never from the live position: the map is then a
    // bijection of the rest lattice and points can never cross or churn.
    vec2 rel = aHome - uPointer;
    float d = length(rel);
    vec2 dir = d > 1e-5 ? rel / d : vec2(1.0, 0.0);
    float ang = atan(rel.y, rel.x);

    // Integer angular multipliers only, or the harmonics tear at the atan seam.
    float L = uLobes;
    float n = 0.55 * sin(L * ang + 0.98 * uTime)
            + 0.30 * sin((2.0 * L + 1.0) * ang - 0.69 * uTime + 1.7)
            + 0.15 * sin((4.0 * L + 3.0) * ang + 0.43 * uTime + 4.1);

    // The per-point term is what dithers the rim into pixels.
    float R = uReach * (1.0 + uRough * n) * (1.0 + 0.09 * (aSeed - 0.5));
    R = max(R, 0.01);

    // target = d + R*(1 - d/(SUPPORT*R))^SUPPORT, and the two properties that
    // matter are independent:
    //
    //   THE BAND. The map sends [0, R] into [R, 1.27R], so the whole interior
    //   piles into a band a quarter of R wide. Its area density is
    //   (d/target) / (dtarget/dd) — 1.76x at 0.5R, 1.52x at R, 1.27x at 1.5R,
    //   1.06x at 2R. That falling gradient IS the dithered rim.
    //
    //   THE SUPPORT. Displacement and its slope both reach zero at 2.2R, so
    //   past that the lattice is EXACTLY unmoved. A closed form like
    //   (d^p + R^p)^(1/p) has no such support: it still pushes ~R^p/(p d^(p-1))
    //   at any distance, and while that is only a pixel or two of offset, a
    //   fast pointer sweep rotates it fast enough to give every point in the
    //   frame a visible streak — the crater then disappears under a frame-wide
    //   comb. With finite support only the neighbourhood smears.
    //
    // Monotone because SUPPORT == the exponent: dtarget/dd = 1 - (1-x/S)^(S-1),
    // which is 0 at the centre and 1 at the edge of support, never negative.
    float x = min(d / R, CRATER_SUPPORT);
    float target = d + R * pow(1.0 - x / CRATER_SUPPORT, CRATER_SUPPORT);

    vec2 desired = uPointer + dir * target;

    // Underdamped by default: the overshoot IS the streak.
    vec2 acc = (desired - aPos) * uK - aVel * uC;
    vec2 vel = aVel + acc * uDt;
    vec2 pos = aPos + vel * uDt;

    vHome = aHome;
    vPos = pos;
    vVel = vel;
    vSeed = aSeed;

    gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}`

/** Never runs — RASTERIZER_DISCARD is on — but a program will not link without it. */
const UPDATE_FS = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() { fragColor = vec4(0.0); }`

const POINT_VS = `#version 300 es
precision highp float;

layout(location = 1) in vec2 aPos;

uniform float uAspect;
uniform float uSize;

void main() {
    gl_Position = vec4(aPos.x / uAspect, aPos.y, 0.0, 1.0);
    gl_PointSize = uSize;
}`

const POINT_FS = `#version 300 es
precision highp float;
uniform vec3 uColor;
out vec4 fragColor;
void main() { fragColor = vec4(uColor, 1.0); }`

/**
 * Two vertices per particle, the particle itself instanced. gl_VertexID picks
 * head or tail; the tail also carries the low alpha, so the interpolation is
 * the taper.
 */
const STREAK_VS = `#version 300 es
precision highp float;

layout(location = 0) in vec2 iPos;
layout(location = 1) in vec2 iVel;

uniform float uAspect;
uniform float uLen;
uniform float uMaxLen;
uniform float uDotWorld;

out float vA;

void main() {
    // Capped, or a fast pointer sweep draws lines clean across the frame.
    vec2 off = iVel * uLen;
    float L = length(off);
    if (L > uMaxLen) off *= uMaxLen / L;
    vec2 tail = iPos - off;
    bool head = gl_VertexID == 0;
    vec2 p = head ? iPos : tail;

    // Alpha is the LENGTH, over a wide range, and that is what keeps a fast
    // pointer sweep from combing the whole frame: the far field does move (the
    // crater map has no finite support), but only by a pixel or two, and a
    // one-dot streak at full brightness is what buried the crater under a
    // frame-wide comb. Full alpha needs ~8 dots of travel.
    float slen = length(off);
    float a = clamp(slen / max(uDotWorld * 8.0, 1e-4) - 0.2, 0.0, 1.0);
    vA = a * (head ? 0.65 : 0.06);

    gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
}`

const STREAK_FS = `#version 300 es
precision highp float;
in float vA;
uniform vec3 uColor;
out vec4 fragColor;
void main() { fragColor = vec4(uColor * vA, vA); }`

/* ------------------------------------------------------------- component --- */

const STRIDE_FLOATS = 7
const STRIDE_BYTES = STRIDE_FLOATS * 4

export default function CraterBurst(props: Props) {
    const { background = "#000000", style } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Re-pointed every render, so the loop reads live props without the effect
    // depending on them and tearing the GL context down (rule 6).
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return

        const gl = canvas.getContext("webgl2", {
            antialias: false,
            alpha: true,
            premultipliedAlpha: true,
            depth: false,
            stencil: false,
        })
        if (!gl) {
            console.error("CraterBurst: WebGL2 unavailable")
            return
        }

        const updateProg = link(gl, UPDATE_VS, UPDATE_FS, ["vHome", "vPos", "vVel", "vSeed"])
        const pointProg = link(gl, POINT_VS, POINT_FS)
        const streakProg = link(gl, STREAK_VS, STREAK_FS)
        if (!updateProg || !pointProg || !streakProg) return

        /* --- buffers: two states, three views each ------------------------ */

        const buffers: WebGLBuffer[] = []
        const simVaos: WebGLVertexArrayObject[] = []
        const streakVaos: WebGLVertexArrayObject[] = []

        for (let i = 0; i < 2; i++) {
            const buf = gl.createBuffer()
            const sim = gl.createVertexArray()
            const streak = gl.createVertexArray()
            if (!buf || !sim || !streak) return

            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(gl.ARRAY_BUFFER, MAX_POINTS * STRIDE_BYTES, gl.STREAM_COPY)

            // Update and point passes declare the same layout slots, so one VAO
            // feeds both.
            gl.bindVertexArray(sim)
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, STRIDE_BYTES, 0)
            gl.enableVertexAttribArray(1)
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, STRIDE_BYTES, 8)
            gl.enableVertexAttribArray(2)
            gl.vertexAttribPointer(2, 2, gl.FLOAT, false, STRIDE_BYTES, 16)
            gl.enableVertexAttribArray(3)
            gl.vertexAttribPointer(3, 1, gl.FLOAT, false, STRIDE_BYTES, 24)

            // Same bytes, read per-INSTANCE: pos at 0, vel at 1.
            gl.bindVertexArray(streak)
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, STRIDE_BYTES, 8)
            gl.vertexAttribDivisor(0, 1)
            gl.enableVertexAttribArray(1)
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, STRIDE_BYTES, 16)
            gl.vertexAttribDivisor(1, 1)

            gl.bindVertexArray(null)
            gl.bindBuffer(gl.ARRAY_BUFFER, null)

            buffers.push(buf)
            simVaos.push(sim)
            streakVaos.push(streak)
        }

        const tf = gl.createTransformFeedback()
        if (!tf) return

        /* --- the lattice --------------------------------------------------- */

        let count = 0
        let seededDensity = -1
        let seededScatter = -1
        let seededAspect = -1

        const seedField = (density: number, scatter: number, aspect: number) => {
            const halfY = FIELD_HALF
            const halfX = FIELD_HALF * aspect
            const spacing = (2 * halfY) / density
            let rows = density
            let cols = Math.max(1, Math.round((2 * halfX) / spacing))
            if (rows * cols > MAX_POINTS) {
                const k = Math.sqrt(MAX_POINTS / (rows * cols))
                rows = Math.max(1, Math.floor(rows * k))
                cols = Math.max(1, Math.floor(cols * k))
            }
            const n = rows * cols
            const data = new Float32Array(n * STRIDE_FLOATS)
            const dx = (2 * halfX) / cols
            const dy = (2 * halfY) / rows
            // Jitter as a fraction of one cell: a jittered grid fills an area
            // with ~4x fewer points than uniform random for the same evenness.
            const jx = (scatter / 100) * dx
            const jy = (scatter / 100) * dy

            let o = 0
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const x = -halfX + (c + 0.5) * dx + (Math.random() - 0.5) * jx
                    const y = -halfY + (r + 0.5) * dy + (Math.random() - 0.5) * jy
                    data[o] = x
                    data[o + 1] = y
                    data[o + 2] = x
                    data[o + 3] = y
                    data[o + 4] = 0
                    data[o + 5] = 0
                    data[o + 6] = Math.random()
                    o += STRIDE_FLOATS
                }
            }

            for (let i = 0; i < 2; i++) {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i])
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, data)
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, null)
            count = n
        }

        /* --- uniforms ------------------------------------------------------ */

        const uUpd = {
            pointer: gl.getUniformLocation(updateProg, "uPointer"),
            time: gl.getUniformLocation(updateProg, "uTime"),
            dt: gl.getUniformLocation(updateProg, "uDt"),
            reach: gl.getUniformLocation(updateProg, "uReach"),
            rough: gl.getUniformLocation(updateProg, "uRough"),
            lobes: gl.getUniformLocation(updateProg, "uLobes"),
            k: gl.getUniformLocation(updateProg, "uK"),
            c: gl.getUniformLocation(updateProg, "uC"),
        }
        const uPoint = {
            aspect: gl.getUniformLocation(pointProg, "uAspect"),
            size: gl.getUniformLocation(pointProg, "uSize"),
            color: gl.getUniformLocation(pointProg, "uColor"),
        }
        const uStreak = {
            aspect: gl.getUniformLocation(streakProg, "uAspect"),
            len: gl.getUniformLocation(streakProg, "uLen"),
            maxLen: gl.getUniformLocation(streakProg, "uMaxLen"),
            dotWorld: gl.getUniformLocation(streakProg, "uDotWorld"),
            color: gl.getUniformLocation(streakProg, "uColor"),
        }

        /* --- pointer ------------------------------------------------------- */

        // World space: y up, half-height 1, half-width = aspect.
        const target = { x: 0, y: 0 }
        const pointer = { x: 0, y: 0 }

        const onMove = (e: PointerEvent) => {
            // Normalising by the rect's own size cancels the canvas zoom, which
            // its absolute left/top does not.
            const rect = root.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            const u = (e.clientX - rect.left) / rect.width
            const v = (e.clientY - rect.top) / rect.height
            target.x = (u - 0.5) * 2 * (rect.width / rect.height)
            target.y = -(v - 0.5) * 2
        }
        const onLeave = () => {
            target.x = 0
            target.y = 0
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)

        /* --- size ---------------------------------------------------------- */

        let bw = 0
        let bh = 0
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            // offsetWidth/Height, not getBoundingClientRect: transform-free.
            const w = Math.max(1, Math.round(root.offsetWidth * dpr))
            const h = Math.max(1, Math.round(root.offsetHeight * dpr))
            if (w === bw && h === bh) return
            bw = w
            bh = h
            canvas.width = w
            canvas.height = h
            gl.viewport(0, 0, w, h)
        }
        resize()
        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(root)

        /* --- loop ---------------------------------------------------------- */

        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE)
        gl.clearColor(0, 0, 0, 0)

        let read = 0
        let write = 1
        let t = 0
        let last = 0
        let raf = 0

        const render = (now: number) => {
            raf = requestAnimationFrame(render)
            resize()
            if (bw < 2 || bh < 2) return

            // The first timestamp precedes the effect, so the first dt is junk.
            const dt = last === 0 ? 0 : Math.min(0.033, (now - last) / 1000)
            last = now

            const p = propsRef.current
            const crater = { ...CRATER_DEFAULTS, ...(p.crater ?? {}) }
            const motion = { ...MOTION_DEFAULTS, ...(p.motion ?? {}) }
            const density = Math.round(clamp(p.density ?? 150, 20, 220))
            const scatter = clamp(p.scatter ?? 25, 0, 100)
            const speed = clamp(p.speed ?? 50, 0, 100)
            const reach = clamp(p.reach ?? 55, 0, 100) / 100
            const rough = (clamp(crater.roughness, 0, 100) / 100) * 0.6
            const lobes = Math.round(clamp(crater.lobes, 2, 12))
            const zeta = 0.15 + (clamp(motion.damping, 1, 100) / 100) * 1.25
            const streakLen = (clamp(motion.streak, 0, 300) / 100) * STREAK_SECONDS
            const color = parseColor(p.baseColor, [1, 1, 1])
            const aspect = bw / bh

            if (density !== seededDensity || scatter !== seededScatter || Math.abs(aspect - seededAspect) > 0.02) {
                seedField(density, scatter, aspect)
                seededDensity = density
                seededScatter = scatter
                seededAspect = aspect
            }
            if (count === 0) return

            // 50 is the rate it shipped at (rule 8b). Wrapped so the harmonics
            // never lose float precision.
            t = (t + dt * (speed / 50)) % 10000

            const ease = Math.min(1, dt * 12)
            pointer.x += (target.x - pointer.x) * ease
            pointer.y += (target.y - pointer.y) * ease

            /* update */
            gl.useProgram(updateProg)
            gl.uniform2f(uUpd.pointer, pointer.x, pointer.y)
            gl.uniform1f(uUpd.time, t)
            gl.uniform1f(uUpd.dt, dt)
            gl.uniform1f(uUpd.reach, reach)
            gl.uniform1f(uUpd.rough, rough)
            gl.uniform1f(uUpd.lobes, lobes)
            gl.uniform1f(uUpd.k, OMEGA * OMEGA)
            gl.uniform1f(uUpd.c, 2 * zeta * OMEGA)

            gl.bindVertexArray(simVaos[read])
            gl.bindBuffer(gl.ARRAY_BUFFER, null)
            gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf)
            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffers[write])
            gl.enable(gl.RASTERIZER_DISCARD)
            gl.beginTransformFeedback(gl.POINTS)
            gl.drawArrays(gl.POINTS, 0, count)
            gl.endTransformFeedback()
            gl.disable(gl.RASTERIZER_DISCARD)
            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
            gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)
            gl.bindVertexArray(null)

            /* draw */
            gl.clear(gl.COLOR_BUFFER_BIT)

            const dotPx = Math.max(1, (clamp(p.dotSize ?? 100, 10, 400) / 100) * DOT_PX * (bh / root.offsetHeight || 1))
            const dotWorld = (dotPx * 2) / bh

            gl.useProgram(pointProg)
            gl.uniform1f(uPoint.aspect, aspect)
            gl.uniform1f(uPoint.size, dotPx)
            gl.uniform3f(uPoint.color, color[0], color[1], color[2])
            gl.bindVertexArray(simVaos[write])
            gl.drawArrays(gl.POINTS, 0, count)
            gl.bindVertexArray(null)

            if (streakLen > 0) {
                gl.useProgram(streakProg)
                gl.uniform1f(uStreak.aspect, aspect)
                gl.uniform1f(uStreak.len, streakLen)
                gl.uniform1f(uStreak.maxLen, STREAK_MAX_WORLD)
                gl.uniform1f(uStreak.dotWorld, dotWorld)
                gl.uniform3f(uStreak.color, color[0], color[1], color[2])
                gl.bindVertexArray(streakVaos[write])
                gl.drawArraysInstanced(gl.LINES, 0, 2, count)
                gl.bindVertexArray(null)
            }

            const swap = read
            read = write
            write = swap
        }

        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            resizeObserver.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
            // No loseContext(): getContext hands back the same context per
            // canvas, so a StrictMode remount would reuse a force-lost one and
            // render black.
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                // Floor before the spread, so an explicit size on the instance
                // still wins. A percentage root collapses to 0x0 under Fit
                // Content, and the canvas is absolutely positioned, so there is
                // no in-flow content to hold the box open.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                isolation: "isolate",
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
