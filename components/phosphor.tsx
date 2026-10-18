"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/**
 * Phosphor — a glowing shell of twisted noise, marched in one fragment shader.
 *
 * Port of "Phosphor" by Xor (p5.js / twigl golf). One full-screen triangle, a
 * raw rAF loop, no p5, no npm dependency.
 *
 * What the original does, un-golfed:
 *
 *   - 80 march steps along a ray from the origin. The step is NOT a distance
 *     field to a surface, it is `0.1·|‖p‖ − R| + 0.04·|s|` — the distance to a
 *     SHELL of radius R, softened by the local noise value. Small step means a
 *     dense sample means a bright pixel, and the accumulator divides by it:
 *     the glow IS the reciprocal of the step size. That is why the figure has
 *     no edge — nothing is ever hit, the march just crowds.
 *
 *   - At each step, `p` is twisted about a unit axis `a` by the quaternion-ish
 *     `a·(a·p) − a×p`, then eight octaves of `a += sin(a·k + t).yzx / k` fold
 *     the axis into itself. The `.yzx` swizzle is what makes it curl rather
 *     than ripple: each component is driven by its neighbour, so the three
 *     coordinates chase each other around.
 *
 *   - The axis is re-derived every step from the PREVIOUS step's size
 *     (`cos(vec3(1,2,0) + t − d·8)`), which couples the colour to the march
 *     history. It reads as a golf accident and it is load-bearing — dropping
 *     it flattens the figure into concentric bands.
 *
 * Fidelity notes, since this is a port and not a rewrite:
 *
 *   - `gl_FragCoord.z` is 0.5 for p5's rect (a unit quad at z=0, w=1), so the
 *     original ray direction reduces to `normalize(vec3(2·FC − r, 1 − r.y))`.
 *     That is written literally here rather than read back from a depth the
 *     draw call does not have to give us.
 *   - The inner loop's counter runs 2..9 (post-increment compares before it
 *     bumps), eight octaves — not nine.
 *   - `tanh` is GLSL ES 3.00. This runs on WebGL1, so it is expanded as
 *     `(1 − e^-2x)/(1 + e^-2x)` with the exponent taken on `−2|x|`, which
 *     cannot overflow.
 *   - `t` enters only as `+t` inside sin/cos, so the whole animation has an
 *     exact period of 2pi. The clock wraps there: seamless loop, and the
 *     accumulator never grows large enough to cost float32 precision.
 *   - Device pixel ratio is pinned to 1, matching the original's
 *     `pixelDensity(1)`. This is 80x8 transcendental octaves per pixel; DPR 2
 *     is four times that for a field with no hard edge to sharpen.
 *
 * Controls are new (the original had none) and every one of them is the
 * reference value at its default: Base Color white, Spectrum 100, Size 100,
 * Distance 5, Turbulence 100, Brightness 100, Speed 50 reproduces Xor's frame
 * exactly.
 */

/* ---------------------------------------------------------------- types --- */

interface Props {
    background?: string
    baseColor?: string
    spectrum?: number
    size?: number
    distance?: number
    turbulence?: number
    brightness?: number
    speed?: number
    style?: CSSProperties
}

type Vec3 = [number, number, number]

/* ------------------------------------------------------------ constants --- */

/**
 * Quality tier, not a design control (rule 10). The reference runs
 * pixelDensity(1) and the figure is pure glow — there is no edge for a second
 * sample to resolve, only four times the march.
 */
const MAX_DPR = 1

/** Reference shell radius, world units. Size 100% is this. */
const REF_RADIUS = 3

/** Reference exposure divisor. Brightness 100% is this. */
const REF_EXPOSURE = 3e4

/** Reference clock rate, seconds per second, at Speed 50. */
const TIME_RATE = 1

/** The shader reads `t` only as `+t` inside sin/cos: exact period. */
const TAU = 6.283185307179586

/* ------------------------------------------------------------ utilities --- */

function clamp01(v: number) {
    return v < 0 ? 0 : v > 1 ? 1 : v
}

function clamp(v: number, lo: number, hi: number) {
    return v < lo ? lo : v > hi ? hi : v
}

/** A prop that arrives undefined must not turn the whole render NaN. */
function num(v: unknown, fallback: number): number {
    return typeof v === "number" && isFinite(v) ? v : fallback
}

function hueToRgb(p: number, q: number, t: number) {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
}

/**
 * ControlType.Color does not hand back hex. It emits `rgb()`, `rgba()`,
 * `hsl()` and `var(--token, fallback)` depending on how the swatch was set, so
 * a hex-only parse makes the colour dial look dead.
 */
function parseColor(input: string | undefined, fallback: Vec3): Vec3 {
    if (!input) return fallback
    let s = String(input).trim()
    if (s.startsWith("var(")) {
        const comma = s.indexOf(",")
        if (comma < 0) return fallback
        s = s.slice(comma + 1, s.lastIndexOf(")")).trim()
    }
    if (s[0] === "#") {
        const hex = s.slice(1)
        const full =
            hex.length === 3 || hex.length === 4
                ? hex
                      .slice(0, 3)
                      .split("")
                      .map((c) => c + c)
                      .join("")
                : hex.slice(0, 6)
        const n = parseInt(full, 16)
        if (!isFinite(n)) return fallback
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }
    const m = s.match(/^(rgba?|hsla?)\s*\(([^)]+)\)$/i)
    if (!m) return fallback
    const parts = m[2].split(/[,\s/]+/).filter((p) => p.length > 0)
    if (parts.length < 3) return fallback
    if (m[1].toLowerCase().startsWith("rgb")) {
        const raw = [parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2])]
        if (!raw.every((v) => isFinite(v))) return fallback
        const scale = (text: string, v: number) => (text.indexOf("%") >= 0 ? v / 100 : v / 255)
        return [
            clamp01(scale(parts[0], raw[0])),
            clamp01(scale(parts[1], raw[1])),
            clamp01(scale(parts[2], raw[2])),
        ]
    }
    const h = (((parseFloat(parts[0]) % 360) + 360) % 360) / 360
    const sat = clamp01(parseFloat(parts[1]) / 100)
    const li = clamp01(parseFloat(parts[2]) / 100)
    if (!isFinite(h) || !isFinite(sat) || !isFinite(li)) return fallback
    if (sat === 0) return [li, li, li]
    const q = li < 0.5 ? li * (1 + sat) : li + sat - li * sat
    const p = 2 * li - q
    return [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)]
}

/* --------------------------------------------------------------- shaders --- */

const VERT_SRC = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

/**
 * highp is mandatory, not a preference: the accumulator reaches ~1e6 and the
 * step size dips below 1e-3 in the same expression. mediump (10-bit mantissa)
 * bands the glow into terraces and drops the core to black.
 */
const FRAG_SRC = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;

uniform vec3  uBg;
uniform vec3  uBase;
uniform float uSpread;    // hue spread; 1.0 is the reference rainbow, 0.0 mono
uniform float uRadius;    // shell radius, world units
uniform float uDist;      // camera distance to the shell centre
uniform float uTurb;      // octave gain; 1.0 is the reference
uniform float uGain;      // 1 / exposure divisor

/**
 * tanh is GLSL ES 3.00 only. exp is taken on -2|x| so it can never overflow,
 * and the accumulator here is non-negative (cos+1 >= 0, z >= 0, d > 0) so the
 * sign term is exact rather than a copysign approximation.
 */
vec3 tanh3(vec3 x) {
    vec3 e = exp(-2.0 * abs(x));
    return sign(x) * (1.0 - e) / (1.0 + e);
}

void main() {
    // gl_FragCoord.z is 0.5 for the original's unit quad at z = 0, w = 1, so
    // the third component of the source's FC*2 - vec3(r, r.y) is 1 - r.y.
    // Vertical half-angle therefore lands at 45 degrees.
    vec3 dir = normalize(vec3(2.0 * gl_FragCoord.xy - uRes, 1.0 - uRes.y));

    vec3 acc = vec3(0.0);
    float z = 0.0;   // travelled distance
    float d = 0.0;   // previous step size; feeds the NEXT step's axis
    float s = 0.0;   // noise sample driving both the palette and the step

    for (int i = 0; i < 80; i++) {
        vec3 p = z * dir;

        // The axis is re-derived from the PREVIOUS step size. Golf accident,
        // load-bearing: without the -d*8.0 term the figure flattens into
        // concentric bands.
        vec3 a = normalize(cos(vec3(1.0, 2.0, 0.0) + uTime - d * 8.0));

        p.z += uDist;

        // Twist p about a. a is unit length, so this is the vector part of a
        // rotation, not a general transform.
        a = a * dot(a, p) - cross(a, p);

        // Eight octaves, k = 2..9. The source's post-increment compares before
        // it bumps, so the body never sees k = 1.
        for (float k = 2.0; k < 10.0; k += 1.0) {
            a += uTurb * sin(a * k + uTime).yzx / k;
        }

        s = a.y;

        // Distance to a SHELL, softened by the local noise. Floored: an exact
        // zero would divide the accumulator by nothing. The floor is six
        // orders below a typical step, so it changes no visible pixel.
        d = max(1e-6, 0.1 * abs(length(p) - uRadius) + 0.04 * abs(s));
        z += d;

        // The source accumulates in the for-loop's update clause, which runs
        // AFTER the body: this reads the step and distance just written.
        acc += (cos(s + vec3(0.0, 1.0, 2.0) * uSpread) + 1.0) / d * z;
    }

    // Base multiplies BEFORE the tonemap, so a dim colour attenuates the
    // channel instead of being painted over a core that already saturated to
    // white. White base is the identity and reproduces the reference exactly.
    vec3 glow = tanh3(acc * uBase * uGain);

    // Composited in-shader rather than through a premultiplied canvas: one
    // less context attribute to be wrong about across browsers.
    float cover = max(max(glow.r, glow.g), glow.b);
    gl_FragColor = vec4(uBg * (1.0 - cover) + glow, 1.0);
}
`

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Phosphor shader:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

/* ------------------------------------------------------------- component --- */

export default function Phosphor(props: Props) {
    const {
        background = "#000000",
        baseColor = "#FFFFFF",
        spectrum = 100,
        size = 200,
        distance = 12,
        turbulence = 49,
        brightness = 176,
        speed = 100,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Re-pointed every render, so the loop reads current props without the
    // effect depending on them and tearing the context down.
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return

        const gl = canvas.getContext("webgl", {
            antialias: false,
            alpha: false,
            depth: false,
            preserveDrawingBuffer: false,
        })
        if (!gl) {
            console.error("Phosphor: WebGL unavailable")
            return
        }

        const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC)
        const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
        if (!vs || !fs) return

        const program = gl.createProgram()
        if (!program) return
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Phosphor link:", gl.getProgramInfoLog(program))
            return
        }
        gl.useProgram(program)

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const posLoc = gl.getAttribLocation(program, "aPos")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        const loc = (name: string) => gl.getUniformLocation(program, name)
        const uRes = loc("uRes")
        const uTime = loc("uTime")
        const uBg = loc("uBg")
        const uBase = loc("uBase")
        const uSpread = loc("uSpread")
        const uRadius = loc("uRadius")
        const uDist = loc("uDist")
        const uTurb = loc("uTurb")
        const uGain = loc("uGain")

        // offsetWidth/offsetHeight, not getBoundingClientRect: the rect carries
        // the canvas zoom, so the buffer would drift on a zoomed canvas. And
        // Framer's width/height props are not numeric in preview.
        let cssWidth = root.offsetWidth || 1
        let cssHeight = root.offsetHeight || 1
        const resizeObserver = new ResizeObserver(() => {
            cssWidth = root.offsetWidth || 1
            cssHeight = root.offsetHeight || 1
        })
        resizeObserver.observe(root)

        const reduceMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            raf = requestAnimationFrame(render)

            // First rAF timestamp can precede the effect that seeded `last`,
            // so the raw delta can be negative.
            const dt = clamp((now - last) / 1000, 0, 0.05)
            last = now

            const p = propsRef.current
            const still = reduceMotion ? 0 : 1
            const rate = (clamp(num(p.speed, 50), 0, 100) / 50) * TIME_RATE
            // Exact period: t appears only as +t inside sin/cos. Wrapping here
            // makes the loop seamless AND keeps the argument small enough that
            // float32 never loses the fractional part.
            clock = (clock + dt * still * rate) % TAU

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const bufferWidth = Math.max(1, Math.round(cssWidth * dpr))
            const bufferHeight = Math.max(1, Math.round(cssHeight * dpr))
            if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
                canvas.width = bufferWidth
                canvas.height = bufferHeight
                gl.viewport(0, 0, bufferWidth, bufferHeight)
            }

            const bg = parseColor(p.background, [0, 0, 0])
            const base = parseColor(p.baseColor, [1, 1, 1])

            gl.uniform2f(uRes, bufferWidth, bufferHeight)
            gl.uniform1f(uTime, clock)
            gl.uniform3f(uBg, bg[0], bg[1], bg[2])
            gl.uniform3f(uBase, base[0], base[1], base[2])
            gl.uniform1f(uSpread, clamp(num(p.spectrum, 100), 0, 100) / 100)
            gl.uniform1f(uRadius, (clamp(num(p.size, 100), 20, 200) / 100) * REF_RADIUS)
            gl.uniform1f(uDist, clamp(num(p.distance, 5), 2, 20))
            gl.uniform1f(uTurb, clamp(num(p.turbulence, 100), 0, 200) / 100)
            gl.uniform1f(uGain, clamp(num(p.brightness, 100), 10, 400) / 100 / REF_EXPOSURE)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            resizeObserver.disconnect()
            gl.deleteBuffer(buffer)
            gl.deleteProgram(program)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            // No loseContext(): getContext hands back the SAME context per
            // canvas, so a StrictMode remount would reuse a force-lost one and
            // render black forever after.
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                // Floor before the spread, so an explicit size on the instance
                // still wins. A percentage root collapses to 0x0 under Fit
                // Content — the canvas is absolutely positioned, so there is no
                // in-flow content to hold the box open.
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
