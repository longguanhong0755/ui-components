"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/**
 * TiltMosaic — a metal tile wall with an invisible swell that follows the
 * pointer, revealed only by the light it throws back.
 *
 * One fragment shader, one full-screen triangle, a raw rAF loop.
 *
 * The quantity carried per cell is a NORMAL — two numbers, not one — which is
 * what lets this be the first of the set with a real shading model instead of a
 * silhouette. There is no occlusion and no sorting, so it is cheaper than the
 * extruded ones while reading richer.
 *
 * The normal is not invented, it is the analytic gradient of a height field, so
 * the wall deforms like a surface rather than like a grid of independently
 * swivelling squares:
 *
 *     h(d) = A / (1 + (d/R)^2)
 *     |grad h| = 2 A x / (R (1 + x^2)^2)          x = d/R
 *     n = normalize(vec3(-grad h, 1))
 *
 * Two consequences, and they are the reason it looks right:
 *
 *   - The tilt is ZERO directly under the pointer and zero far away, and peaks
 *     on a ring between. That ring is at x^2 = 1/3, i.e. d = R/sqrt(3), which
 *     falls straight out of setting the derivative of the slope to zero. So the
 *     highlight is a RING, not a blob — the tiles angled to bounce light at you
 *     are the ones on the slope, never the one you are pointing at.
 *   - Tilt is therefore a real angle, and the control is in degrees. A is solved
 *     backwards from it so that the steepest tile is tilted by exactly the
 *     number in the panel: A = tan(Tilt) * R / 0.6495, where 0.6495 is the peak
 *     of the slope profile at unit amplitude. Verified numerically — the
 *     measured peak sits at R/sqrt(3) and the measured angle there matches the
 *     control to under a hundredth of a degree.
 *
 * Lighting is Blinn-Phong against a fixed light with the view down +z. The
 * highlight is a specular term, never a brightened ring painted on: a painted
 * one slides the wrong way the moment anything moves.
 */

/* ---------------------------------------------------------------- types --- */

interface TiltMosaicProps {
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    gap?: number
    rounded?: number
    tilt?: number
    reach?: number
    hover?: number
    speed?: number
    grain?: number
    style?: CSSProperties
}

/* ------------------------------------------------------------- constants --- */

/** Quality tier, not a design control — picked, not exposed. */
const MAX_DPR = 2

/** Hover fade, per second. The position is not eased: the focus is the pointer. */
const HOVER_RATE = 6

/** Idle drift, in units of frame height, at Speed 50. */
const DRIFT_X = 0.34
const DRIFT_Y = 0.26
const DRIFT_RATE_X = 0.25
const DRIFT_RATE_Y = 0.39

/**
 * Peak of |grad h| for h = 1/(1 + x^2) measured in units of 1/R: at x = 1/sqrt(3)
 * the slope is 2x/(1+x^2)^2 = 0.649519. Amplitude is solved back through this so
 * the Tilt control is the actual angle of the steepest tile.
 */
const SLOPE_PEAK = 0.649519

type Vec3 = [number, number, number]

/* ------------------------------------------------------------- utilities --- */

/** Parses `#fff`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()` into 0..1 RGB. */
function parseColor(input: string | undefined, fallback: Vec3): Vec3 {
    if (!input) return fallback
    const str = String(input).trim()

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

    const parts = str.match(/[\d.]+/g)
    if (parts && parts.length >= 3) {
        return [
            Math.min(255, parseFloat(parts[0])) / 255,
            Math.min(255, parseFloat(parts[1])) / 255,
            Math.min(255, parseFloat(parts[2])) / 255,
        ]
    }
    return fallback
}

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

/** A prop that arrives undefined must not turn the whole render NaN. */
function num(v: unknown, fallback: number): number {
    return typeof v === "number" && isFinite(v) ? v : fallback
}

/* --------------------------------------------------------------- shaders --- */

const VERT_SRC = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform float uDpr;

uniform vec3  uBg;
uniform vec3  uBase;
uniform vec3  uAccent;
uniform vec2  uFocus;       // world units, frame height = 1
uniform float uSpacing;     // world units per cell
uniform float uHalf;        // tile half-size, world units
uniform float uRound;       // corner radius, world units
uniform float uAmp;         // height field amplitude, world units
uniform float uReach;       // world units, the R in the height field
uniform float uGrain;

// Light up and to the left, view straight down +z.
const vec3 LIGHT = vec3(-0.4879, 0.6505, 0.5817);
const vec3 VIEW  = vec3(0.0, 0.0, 1.0);
const float SHINE = 34.0;

float h21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// One CSS pixel of grain, so the film stays the same physical size at DPR 2
// instead of halving. Stepped at 24Hz: per-frame noise reads as sparkle.
float filmGrain(vec2 fragCoord, float t, float dpr) {
    vec2 cell = floor(fragCoord / max(dpr, 1.0));
    return h21(cell + floor(t * 24.0) * 13.7) - 0.5;
}

// Rounded box, exact outside and on the corners.
float roundedBox(vec2 q, float half_, float r) {
    vec2 d = abs(q) - vec2(half_ - r);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / uRes.y;

    // World space: the frame is 1 tall and aspect wide, so one world unit is
    // uRes.y device pixels no matter the shape of the host.
    vec2 p = vec2(uv.x * aspect, uv.y);
    float aa = 1.4 / uRes.y;

    vec2 c = (floor(p / uSpacing) + 0.5) * uSpacing;
    vec2 q = p - c;

    // Analytic gradient of h = uAmp / (1 + x^2), sampled at the CELL CENTRE so
    // the whole tile is one flat facet with one normal.
    vec2 rv = c - uFocus;
    float d = length(rv);
    vec2 u = d > 1e-6 ? rv / d : vec2(0.0);
    float x = d / max(uReach, 1e-4);
    float denom = 1.0 + x * x;
    // grad h points DOWN the slope, away from the crest at the focus.
    float slope = -2.0 * uAmp * x / (max(uReach, 1e-4) * denom * denom);
    vec3 n = normalize(vec3(-slope * u, 1.0));

    float sd = roundedBox(q, uHalf, uRound);

    // Bevel: roll the normal outward over a narrow band at the tile edge, so the
    // rim catches light instead of ending as a flat cut.
    float bevelWidth = max(uHalf * 0.22, aa * 2.0);
    float bev = smoothstep(-bevelWidth, 0.0, sd);
    vec2 outward = length(q) > 1e-6 ? normalize(q) : vec2(0.0);
    vec3 rim = normalize(vec3(outward * 1.25, 0.55));
    vec3 nn = normalize(mix(n, rim, bev * 0.85));

    vec3 halfVec = normalize(LIGHT + VIEW);
    float diff = clamp(dot(nn, LIGHT), 0.0, 1.0);
    float spec = pow(clamp(dot(nn, halfVec), 0.0, 1.0), SHINE);

    vec3 tile = uBase * (0.10 + 0.62 * diff) + uAccent * spec * 1.7;

    float cov = 1.0 - smoothstep(-aa, aa, sd);
    vec3 col = mix(uBg, tile, cov);

    col += (h21(gl_FragCoord.xy) - 0.5) * (1.5 / 255.0);
    col += filmGrain(gl_FragCoord.xy, uTime, uDpr) * uGrain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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
        console.error("TiltMosaic shader:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

/* ------------------------------------------------------------- component --- */

export default function TiltMosaic(props: TiltMosaicProps) {
    const {
        background = "#06070A",
        baseColor = "#1700FF",
        accentColor = "#DDF2FF",
        density = 38,
        gap = 0,
        rounded = 100,
        tilt = 45,
        reach = 100,
        hover = 100,
        speed = 100,
        grain = 100,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Re-pointed on every render, so the loop reads the current props without
    // the effect depending on them and tearing the context down.
    const propsRef = useRef(props)
    propsRef.current = props

    const pointerRef = useRef({ rawX: 0.5, rawY: 0.5, on: 0, onTarget: 0 })

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
            console.error("TiltMosaic: WebGL unavailable")
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
            console.error("TiltMosaic link:", gl.getProgramInfoLog(program))
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
        const uDpr = loc("uDpr")
        const uBg = loc("uBg")
        const uBase = loc("uBase")
        const uAccent = loc("uAccent")
        const uFocus = loc("uFocus")
        const uSpacing = loc("uSpacing")
        const uHalf = loc("uHalf")
        const uRound = loc("uRound")
        const uAmp = loc("uAmp")
        const uReach = loc("uReach")
        const uGrain = loc("uGrain")

        // offsetWidth/offsetHeight rather than getBoundingClientRect: the rect
        // carries the canvas zoom, so the buffer would drift on a zoomed canvas.
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

            const dt = Math.min(0.05, (now - last) / 1000)
            last = now

            const p = propsRef.current
            const rate = reduceMotion ? 0 : clamp(num(p.speed, 50), 0, 100) / 50
            // Wrapped on the CPU: an unbounded accumulator eventually costs
            // float32 precision inside the shader's fract() calls.
            clock = (clock + dt * rate) % 3600

            const pointer = pointerRef.current
            pointer.on += (pointer.onTarget - pointer.on) * (1 - Math.exp(-HOVER_RATE * dt))

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const bufferWidth = Math.max(1, Math.round(cssWidth * dpr))
            const bufferHeight = Math.max(1, Math.round(cssHeight * dpr))
            if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
                canvas.width = bufferWidth
                canvas.height = bufferHeight
                gl.viewport(0, 0, bufferWidth, bufferHeight)
            }
            const aspect = bufferWidth / bufferHeight

            const idleX = aspect * 0.5 + DRIFT_X * Math.sin(clock * DRIFT_RATE_X)
            const idleY = 0.5 + DRIFT_Y * Math.sin(clock * DRIFT_RATE_Y + 1.3)

            // Pointer y arrives top-down; gl_FragCoord is bottom-up.
            const pointerX = pointer.rawX * aspect
            const pointerY = 1 - pointer.rawY
            const follow = (clamp(num(p.hover, 100), 0, 100) / 100) * Math.min(1, pointer.on)

            const density = Math.round(clamp(num(p.density, 22), 6, 60))
            const spacing = 1 / density
            const half = (spacing * 0.5) * (1 - clamp(num(p.gap, 12), 0, 60) / 100)
            const reach = clamp(num(p.reach, 24), 5, 100) / 100

            // Solved backwards from the Tilt control, so the steepest tile is
            // tilted by exactly the number in the panel.
            const tiltRad = (clamp(num(p.tilt, 26), 0, 45) * Math.PI) / 180
            const amp = (Math.tan(tiltRad) * reach) / SLOPE_PEAK

            gl.uniform2f(uRes, bufferWidth, bufferHeight)
            gl.uniform1f(uTime, clock)
            gl.uniform1f(uDpr, dpr)

            const bg = parseColor(p.background, [0.024, 0.027, 0.039])
            const base = parseColor(p.baseColor, [0.322, 0.365, 0.475])
            const accent = parseColor(p.accentColor, [0.867, 0.949, 1.0])
            gl.uniform3f(uBg, bg[0], bg[1], bg[2])
            gl.uniform3f(uBase, base[0], base[1], base[2])
            gl.uniform3f(uAccent, accent[0], accent[1], accent[2])

            gl.uniform2f(
                uFocus,
                idleX + (pointerX - idleX) * follow,
                idleY + (pointerY - idleY) * follow
            )
            gl.uniform1f(uSpacing, spacing)
            gl.uniform1f(uHalf, half)
            // Rounded is a percent of the maximum, which on a square tile is
            // half its side — so 100 is a true circle at any Density.
            gl.uniform1f(uRound, half * (clamp(num(p.rounded, 18), 0, 100) / 100))
            gl.uniform1f(uAmp, amp)
            gl.uniform1f(uReach, reach)
            gl.uniform1f(uGrain, (clamp(num(p.grain, 0), 0, 100) / 100) * 0.09)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        const readPointer = (event: PointerEvent) => {
            // The rect is only used to turn a viewport coordinate into a
            // fraction of the host, which is scale-invariant.
            const rect = root.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            const pointer = pointerRef.current
            pointer.rawX = clamp((event.clientX - rect.left) / rect.width, 0, 1)
            pointer.rawY = clamp((event.clientY - rect.top) / rect.height, 0, 1)
        }

        const onMove = (event: PointerEvent) => {
            readPointer(event)
            pointerRef.current.onTarget = 1
        }
        const onLeave = () => {
            pointerRef.current.onTarget = 0
        }

        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        // A pointer that leaves through an overlay never fires the host's own
        // leave, so the window gets a say too.
        window.addEventListener("blur", onLeave)

        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            resizeObserver.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("blur", onLeave)
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
                background,
                touchAction: "none",
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
