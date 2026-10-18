"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/**
 * CheckerVortex — an endless black-and-white checkerboard spiralling into an
 * off-centre eye.
 *
 * One fragment shader, one full-screen triangle, a raw rAF loop.
 *
 * It looks like a photograph of a twisted tube. It is not. There is no camera,
 * no perspective divide and no 3D anywhere in the file: it is a flat square
 * checkerboard seen through the conformal map w = log(z), with the lattice
 * ROTATED inside that log plane. Three things in the reference give it away —
 * the rings shrink by a constant RATIO rather than a constant amount (equal
 * steps in log r), the cells stay square at every scale (only a conformal map
 * does that), and both families of lines are spirals of opposite handedness
 * (a shear would leave one family straight; a rotation in the log plane bends
 * both).
 *
 * Written out, the rotation angle and the ring pitch cancel completely:
 *
 *     x = log(r) + zoom          y = atan(p.y, p.x) - spin
 *     a = (x*n - y*m) / 2pi      b = (x*m + y*n) / 2pi
 *     checker = mod(floor(a) + floor(b), 2)
 *
 * with n = Sectors and m = Twist. No angle, no pitch, no tuning — two integers
 * and the geometry falls out. m = 0 is a plain ring-and-spoke tunnel whose
 * pitch is ALREADY the square-cell one, because the same expression produced
 * it.
 *
 * Two exact invariants, neither of them eyeballed:
 *
 *   - The atan branch cut is not a seam. Around one turn y grows by 2pi, so a
 *     falls by exactly m and b rises by exactly n. Both whole, so both floors
 *     land on the same lattice and the pattern is continuous by proof rather
 *     than by tuning.
 *   - n and m are both forced EVEN. Continuity alone is not enough: floor(a) +
 *     floor(b) shifts by n - m across the cut, and with that odd the pattern
 *     survives the crossing but INVERTS, turning the cut into a hard
 *     black-meets-black edge running out of the eye. Even n and m make n - m
 *     even, so parity is preserved too. This is why both dials step by 2 —
 *     every step a designer can reach is a step that renders differently, and
 *     no reachable setting tears.
 *
 * Antialiasing is analytic and needs no derivative extension. The map is a
 * similarity, so the pixel footprint is isotropic and closed-form:
 * |grad a| = |grad b| = k / (2pi * r) with k = hypot(n, m). Each axis is a box-
 * filtered square wave at that width. Toward the eye the cells pass Nyquist,
 * the filter returns the wave's mean, and the core resolves to flat grey — the
 * grey mush in the middle of the reference is not a painted element, it is
 * what a correctly filtered checkerboard does when its cells go sub-pixel.
 */

/* ---------------------------------------------------------------- types --- */

interface Props {
    colorA?: string
    colorB?: string
    sectors?: number
    twist?: number
    speed?: number
    spin?: number
    centerX?: number
    centerY?: number
    contrast?: number
    interactive?: boolean
    style?: CSSProperties
}

/* ------------------------------------------------------------ constants --- */

/** Quality tier, not a design control — picked, not exposed. */
const MAX_DPR = 2

/**
 * Reference flow, in log-radius units per second at Speed 50. At the default
 * 40 sectors one ring is 2pi/40 = 0.157 of those, so this is about one ring a
 * second.
 */
const ZOOM_RATE = 0.16

const TAU = 6.283185307179586

type Vec3 = [number, number, number]

/* ------------------------------------------------------------- utilities --- */

function hueToChannel(p: number, q: number, tIn: number): number {
    let t = tIn
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
}

/**
 * Parses everything ControlType.Color can emit into 0..1 RGB: hex in every
 * length, rgb()/rgba(), hsl()/hsla(), and var(--token, fallback). A hex-only
 * parser is the classic way a colour dial ends up looking dead, because the
 * control does NOT hand back hex once the value came from a Framer token.
 */
function parseColor(input: string | undefined, fallback: Vec3): Vec3 {
    if (!input) return fallback
    let str = String(input).trim()

    // var(--token, <fallback>) — the token itself is not resolvable here, so
    // the declared fallback is the only readable colour in the string.
    if (str.slice(0, 4).toLowerCase() === "var(") {
        const comma = str.indexOf(",")
        if (comma < 0) return fallback
        str = str.slice(comma + 1, str.lastIndexOf(")")).trim()
        if (!str) return fallback
    }

    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255]
        }
        return fallback
    }

    const parts = str.match(/-?[\d.]+/g)
    if (!parts || parts.length < 3) return fallback
    const n0 = parseFloat(parts[0])
    const n1 = parseFloat(parts[1])
    const n2 = parseFloat(parts[2])
    if (!isFinite(n0) || !isFinite(n1) || !isFinite(n2)) return fallback

    if (str.slice(0, 3).toLowerCase() === "hsl") {
        const h = ((n0 % 360) + 360) / 360
        const s = Math.min(1, Math.max(0, n1 / 100))
        const l = Math.min(1, Math.max(0, n2 / 100))
        if (s === 0) return [l, l, l]
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s
        const p = 2 * l - q
        return [
            hueToChannel(p, q, h + 1 / 3),
            hueToChannel(p, q, h),
            hueToChannel(p, q, h - 1 / 3),
        ]
    }

    return [
        Math.min(255, Math.max(0, n0)) / 255,
        Math.min(255, Math.max(0, n1)) / 255,
        Math.min(255, Math.max(0, n2)) / 255,
    ]
}

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

/** A prop that arrives undefined must not turn the whole render NaN. */
function num(v: unknown, fallback: number): number {
    return typeof v === "number" && isFinite(v) ? v : fallback
}

/** Snapped to even, because odd n - m inverts the checker across the cut. */
function even(v: unknown, lo: number, hi: number, fallback: number): number {
    return Math.round(clamp(num(v, fallback), lo, hi) / 2) * 2
}

function gcd(aIn: number, bIn: number): number {
    let a = Math.abs(aIn)
    let b = Math.abs(bIn)
    while (b) {
        const t = a % b
        a = b
        b = t
    }
    return a || 1
}

/**
 * The exact zoom period, so the CPU accumulator can be wrapped instead of
 * growing without bound and eating float32 precision inside the shader's mod().
 * Advancing x by this shifts a by n/g (or twice that) and b by m/g, both whole
 * AND summing to an even number, which is a pixel-identical frame.
 */
function zoomPeriod(n: number, m: number): number {
    const g = gcd(n, m)
    const i = n / g
    const j = m / g
    return (TAU * ((i + j) % 2 === 0 ? 1 : 2)) / g
}

/* --------------------------------------------------------------- shaders --- */

const VERT_SRC = `
attribute vec2 aPos;
void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG_SRC = `
precision highp float;

uniform vec2 uRes;
uniform vec2 uCentre;
uniform float uN;
uniform float uM;
uniform float uZoom;
uniform float uSpin;
uniform float uContrast;
uniform vec3 uColorA;
uniform vec3 uColorB;

const float TAU = 6.283185307179586;

// Triangle wave, period 2, range 0..1. It is the exact antiderivative of the
// period-2 square wave that is +1 on [0,1) and -1 on [1,2), which is what makes
// the difference below an exact box filter rather than an approximation.
float tri(float t) {
    return 1.0 - abs(1.0 - mod(t, 2.0));
}

// Box-filtered square wave. w is the HALF width of the pixel footprint in t.
// Past a half period the average of a zero-mean wave is 0 and the ratio form
// goes unstable, so it is faded to 0 there instead of divided into noise.
float fsq(float t, float w) {
    float v = (tri(t + w) - tri(t - w)) / max(2.0 * w, 1e-6);
    return mix(clamp(v, -1.0, 1.0), 0.0, smoothstep(0.30, 0.50, w));
}

void main() {
    float minRes = min(uRes.x, uRes.y);
    // Normalised by the SHORT side, so one unit is one unit on both axes and
    // the map stays a similarity. Dividing each axis by its own resolution
    // would stretch the cells with the aspect ratio.
    vec2 p = (gl_FragCoord.xy - uCentre * uRes) / minRes;

    float r = max(length(p), 1e-7);
    float x = log(r) + uZoom;
    float y = atan(p.y, p.x) - uSpin;

    // The rotated lattice, with the angle and the pitch already cancelled out.
    // Around one turn a falls by exactly m and b rises by exactly n.
    float a = (x * uN - y * uM) / TAU;
    float b = (x * uM + y * uN) / TAU;

    // Analytic, isotropic footprint: |grad a| = |grad b| = k/(TAU*r) in p
    // units, and one device pixel spans 1/minRes of those. No fwidth, so no
    // OES_standard_derivatives, and it stays exact at every DPR.
    float k = sqrt(uN * uN + uM * uM);
    float w = 0.5 * k / (TAU * r * minRes);

    float checker = 0.5 + 0.5 * fsq(a, w) * fsq(b, w);
    checker = clamp(0.5 + (checker - 0.5) * uContrast, 0.0, 1.0);

    gl_FragColor = vec4(mix(uColorA, uColorB, checker), 1.0);
}
`

function compileShader(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("CheckerVortex shader:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

/* ------------------------------------------------------------- component --- */

export default function CheckerVortex(props: Props) {
    const {
        colorA = "#000000",
        colorB = "#FFFFFF",
        sectors = 64,
        twist = 18,
        speed = 50,
        spin = 3,
        centerX = 50,
        centerY = 50,
        contrast = 100,
        interactive = true,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Re-pointed on every render, so the loop reads the current props without
    // the effect depending on them and tearing the context down every edit.
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
            console.error("CheckerVortex: WebGL unavailable")
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
            console.error("CheckerVortex link:", gl.getProgramInfoLog(program))
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
        const uCentre = loc("uCentre")
        const uN = loc("uN")
        const uM = loc("uM")
        const uZoom = loc("uZoom")
        const uSpin = loc("uSpin")
        const uContrast = loc("uContrast")
        const uColorA = loc("uColorA")
        const uColorB = loc("uColorB")

        // offsetWidth/offsetHeight rather than getBoundingClientRect: the rect
        // carries the canvas zoom, so the buffer would drift on a zoomed
        // canvas. Framer's width/height props are not numeric in preview.
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
        let zoom = 0
        let spin = 0

        // Pointer target in 0..1, top-down, root-relative. null means the
        // pointer is not currently over the component, so the eye eases back
        // to its authored position instead of snapping.
        let pointerTX: number | null = null
        let pointerTY: number | null = null

        // Smoothed centre actually sent to the shader. Lags the target so the
        // eye glides toward the cursor instead of teleporting to it.
        let curCX: number | null = null
        let curCY: number | null = null

        const onPointerMove = (e: PointerEvent) => {
            const rect = root.getBoundingClientRect()
            pointerTX = clamp((e.clientX - rect.left) / rect.width, 0, 1)
            pointerTY = clamp((e.clientY - rect.top) / rect.height, 0, 1)
        }
        const onPointerLeave = () => {
            pointerTX = null
            pointerTY = null
        }
        root.addEventListener("pointermove", onPointerMove)
        root.addEventListener("pointerleave", onPointerLeave)

        const render = (now: number) => {
            raf = requestAnimationFrame(render)

            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now

            const p = propsRef.current
            const still = reduceMotion ? 0 : 1

            const n = even(p.sectors, 4, 64, 40)
            const m = even(p.twist, -40, 40, 18)

            // Flying FORWARD means features sweep outward past the eye, which
            // is log r increasing, which is the zoom offset decreasing.
            zoom -= dt * still * (clamp(num(p.speed, 50), -100, 100) / 50) * ZOOM_RATE
            spin += (dt * still * clamp(num(p.spin, 3), -90, 90) * Math.PI) / 180

            // Wrapped on exact pattern periods, so the wrap is a no-op frame.
            // Recomputed each frame because n and m are live; subtracting the
            // NEW period is still pattern-preserving for the new lattice.
            const period = zoomPeriod(n, m)
            zoom = zoom % period
            if (zoom < 0) zoom += period
            // A full turn is a whole shift of both a and b whose sum is even,
            // because n and m are even. Only that makes 2pi the spin period.
            spin = spin % TAU

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const bufferWidth = Math.max(1, Math.round(cssWidth * dpr))
            const bufferHeight = Math.max(1, Math.round(cssHeight * dpr))
            if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
                canvas.width = bufferWidth
                canvas.height = bufferHeight
                gl.viewport(0, 0, bufferWidth, bufferHeight)
            }

            gl.uniform2f(uRes, bufferWidth, bufferHeight)

            // The eye steers toward the pointer: authored Center X/Y is the
            // rest position, and hovering pulls it toward the cursor, easing
            // back the moment the pointer leaves. This is the interaction —
            // it reads immediately (the tunnel turns to look at you) and
            // never fights the autoplay loop, since zoom/spin keep running
            // underneath it regardless.
            const isInteractive = p.interactive !== false
            const authoredCX = clamp(num(p.centerX, 42), 0, 100) / 100
            const authoredCY = clamp(num(p.centerY, 65), 0, 100) / 100
            if (curCX === null || curCY === null) {
                curCX = authoredCX
                curCY = authoredCY
            }
            const targetCX = isInteractive && pointerTX !== null ? pointerTX : authoredCX
            const targetCY = isInteractive && pointerTY !== null ? pointerTY : authoredCY
            // Exponential smoothing, dt-scaled so the response speed is the
            // same at any frame rate rather than tied to rAF cadence.
            const follow = 1 - Math.exp(-dt * 6)
            curCX += (targetCX - curCX) * follow
            curCY += (targetCY - curCY) * follow

            // Center Y is authored top-down; gl_FragCoord is bottom-up.
            gl.uniform2f(uCentre, curCX, 1 - curCY)
            gl.uniform1f(uN, n)
            gl.uniform1f(uM, m)
            gl.uniform1f(uZoom, zoom)
            gl.uniform1f(uSpin, spin)
            gl.uniform1f(uContrast, clamp(num(p.contrast, 100), 0, 100) / 100)

            const ca = parseColor(p.colorA, [0, 0, 0])
            const cb = parseColor(p.colorB, [1, 1, 1])
            gl.uniform3f(uColorA, ca[0], ca[1], ca[2])
            gl.uniform3f(uColorB, cb[0], cb[1], cb[2])

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            root.removeEventListener("pointermove", onPointerMove)
            root.removeEventListener("pointerleave", onPointerLeave)
            resizeObserver.disconnect()
            gl.deleteBuffer(buffer)
            gl.deleteProgram(program)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            // No loseContext(): getContext hands back the same context per
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
                // Content, and the canvas is absolutely positioned, so there is
                // no in-flow content to hold the box open.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                isolation: "isolate",
                // Only so the first paint is not a white flash. The shader
                // covers the box opaquely, which is why there is no Background
                // control: the row would map to nothing.
                background: colorA,
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
