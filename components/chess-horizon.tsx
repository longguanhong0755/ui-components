"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/* ---------------------------------------------------------------- types --- */

interface Props {
    background?: string
    baseColor?: string
    accentColor?: string
    size?: number
    horizon?: number
    perspective?: number
    reach?: number
    haze?: number
    speed?: number
    hover?: number
    grain?: number
    style?: CSSProperties
}

/* ------------------------------------------------------------- constants --- */

/** Quality tier, not a design control — picked, not exposed. */
const MAX_DPR = 2

/** Hover fade, per second. The lamp's POSITION is not eased: it is the cursor. */
const HOVER_RATE = 5

/** Camera height above the board, in world units. Everything scales to it. */
const CAM_HEIGHT = 1.0

/** Board scroll, world units per second, at Speed 50. */
const SCROLL_RATE = 0.5

/** Ambient, so the board still reads well away from the lamp. */
const AMBIENT = 0.17

/** Where the lamp parks when nothing is hovering, in world units. */
const IDLE_Z = 3.2

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
uniform float uHorizon;     // screen y of the horizon, 0 bottom 1 top
uniform float uFocal;       // screen units
uniform float uCamH;        // camera height above the board
uniform float uSquare;      // world size of one square
uniform float uPanZ;        // board scroll, in SQUARES, wrapped to [0,2)
uniform vec2  uLamp;        // lamp ground position, world (x, z)
uniform vec2  uSelQ;        // the same point, in SQUARE units including the pan
uniform float uLampH;       // lamp height above the board
uniform float uLampAmt;
uniform float uHaze;
uniform float uGrain;

const float AMBIENT = 0.17;   // so the board still reads away from the lamp

float h21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// One CSS pixel of grain, so the film stays the same physical size at DPR 2
// instead of halving. Stepped at 24Hz: per-frame noise reads as sparkle.
float filmGrain(vec2 fragCoord, float t, float dpr) {
    vec2 cell = floor(fragCoord / max(dpr, 1.0));
    return h21(cell + floor(t * 24.0) * 13.7) - 0.5;
}

// Box-filtered checkerboard, exact.
//
// The checker is a product of two square waves; the integral of a square wave
// is a triangle wave; so the average of the checker over a box is a difference
// of triangle waves in each axis, divided by the box width. This is the whole
// reason the horizon can settle to clean mid-grey rather than to moire, and it
// is not something a smoothstep can approximate.
float checkerBox(vec2 p, vec2 w) {
    vec2 i = 2.0 * (abs(fract((p - 0.5 * w) * 0.5) - 0.5)
                  - abs(fract((p + 0.5 * w) * 0.5) - 0.5)) / w;
    return 0.5 - 0.5 * i.x * i.y;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / uRes.y;

    // Screen space: x centred and scaled by aspect, y from the bottom. One
    // device pixel is 1/uRes.y in BOTH axes, which is what makes the footprint
    // below correct on any frame shape.
    float sx = (uv.x - 0.5) * aspect;
    float sy = uv.y;
    float px = 1.0 / uRes.y;

    float yy = uHorizon - sy;

    vec3 col;

    if (yy <= px) {
        // Above the horizon. Nothing to project onto — but the haze the board
        // fades into has to keep going up, or the sky reads as a flat plate.
        col = uBg * (1.0 - 0.35 * smoothstep(0.0, 0.45, -yy));
    } else {
        // Pinhole projection onto the plane. Closed form, and invertible.
        float z = uCamH * uFocal / yy;
        float wx = sx * z / uFocal;

        // Analytic derivatives of that projection, so the filter footprint is
        // exact and needs no derivative extension.
        float dzdy = z * z / (uCamH * uFocal);       // d(depth)/d(screen y)
        float dxdx = z / uFocal;                     // d(world x)/d(screen x)
        float dxdy = wx * z / (uCamH * uFocal);      // d(world x)/d(screen y)

        vec2 q = vec2(wx, z) / uSquare + vec2(0.0, uPanZ);
        vec2 fw = vec2(
            (abs(dxdx) + abs(dxdy)) * px / uSquare,
            abs(dzdy) * px / uSquare
        );

        float c = checkerBox(q, max(fw, vec2(1e-5)));
        col = mix(uBase, uAccent, c);

        // The square you are pointing at. Its index comes from the SAME ground
        // point the lamp uses, so the highlight cannot drift off the cursor —
        // both are the one projection inverse.
        vec2 dcell = abs(floor(q) - floor(uSelQ));
        float same = (1.0 - step(0.5, dcell.x)) * (1.0 - step(0.5, dcell.y));
        vec2 fc = abs(fract(q) - 0.5);
        float edge = 0.5 - max(fc.x, fc.y);
        // Feathered by the cell's own footprint, so the outline holds one pixel
        // whether the square is under your nose or half way to the horizon.
        float feather = max(fw.x + fw.y, 1e-4);
        float ring = 1.0 - smoothstep(feather, feather + 0.07, edge);
        col += uAccent * same * (0.18 + 0.65 * ring) * uLampAmt;

        // Lamp. Inverse square against the lamp's own height, so Reach widens
        // and softens the pool together, the way raising a real lamp does.
        vec2 toLamp = vec2(wx, z) - uLamp;
        float d2 = dot(toLamp, toLamp) + uLampH * uLampH;
        float lit = (uLampH * uLampH * uLampH) / (d2 * sqrt(d2));
        col *= AMBIENT + 1.35 * lit * uLampAmt;

        // Distance haze, in WORLD depth, so it thickens toward the horizon
        // exactly as far ground should.
        float fog = 1.0 - exp(-z * uHaze);
        col = mix(col, uBg, clamp(fog, 0.0, 1.0));
    }

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
        console.error("ChessHorizon shader:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

/* ------------------------------------------------------------- component --- */

export default function ChessHorizon(props: Props) {
    const {
        background = "#0B0D14",
        baseColor = "#0E1420",
        accentColor = "#D4DAE5",
        size = 30,
        horizon = 90,
        perspective = 114,
        reach = 44,
        haze = 100,
        speed = 50,
        hover = 100,
        grain = 0,
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
            console.error("ChessHorizon: WebGL unavailable")
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
            console.error("ChessHorizon link:", gl.getProgramInfoLog(program))
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
        const uHorizon = loc("uHorizon")
        const uFocal = loc("uFocal")
        const uCamH = loc("uCamH")
        const uSquare = loc("uSquare")
        const uPanZ = loc("uPanZ")
        const uLamp = loc("uLamp")
        const uSelQ = loc("uSelQ")
        const uLampH = loc("uLampH")
        const uLampAmt = loc("uLampAmt")
        const uHaze = loc("uHaze")
        const uGrain = loc("uGrain")

        // offsetWidth/offsetHeight rather than getBoundingClientRect: the rect
        // carries the canvas zoom, so the buffer would drift on a zoomed canvas.
        // Framer's width/height props are not numeric in preview either.
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
        let pan = 0

        const render = (now: number) => {
            raf = requestAnimationFrame(render)

            const dt = Math.min(0.05, (now - last) / 1000)
            last = now

            const p = propsRef.current
            const still = reduceMotion ? 0 : 1
            // Wrapped on the CPU: an unbounded accumulator eventually costs
            // float32 precision inside the shader's fract() calls.
            clock = (clock + dt * still) % 3600

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

            const square = clamp(num(p.size, 30), 5, 100) / 100
            const horizon = clamp(num(p.horizon, 62), 30, 90) / 100
            const fovDeg = clamp(num(p.perspective, 55), 10, 120)
            const focal = 0.5 / Math.tan((fovDeg * Math.PI) / 360)

            // A checkerboard has period 2 in square units, so the scroll wraps
            // at exactly 2 and the frame across the wrap is pixel-identical.
            pan += (dt * still * (clamp(num(p.speed, 50), -100, 100) / 50) * SCROLL_RATE) / square
            pan = pan % 2
            if (pan < 0) pan += 2

            // The lamp's ground position is the EXACT inverse of the cursor.
            // Above the horizon there is no intersection, so it parks far off
            // rather than flipping behind the camera.
            const sxCursor = (pointer.rawX - 0.5) * aspect
            const syCursor = 1 - pointer.rawY
            const yyCursor = horizon - syCursor
            let lampX = 0
            let lampZ = IDLE_Z
            if (yyCursor > 1 / bufferHeight) {
                lampZ = (CAM_HEIGHT * focal) / yyCursor
                lampX = (sxCursor * lampZ) / focal
            } else {
                lampZ = 40
                lampX = sxCursor * 40
            }
            const follow = (clamp(num(p.hover, 100), 0, 100) / 100) * Math.min(1, pointer.on)

            gl.uniform2f(uRes, bufferWidth, bufferHeight)
            gl.uniform1f(uTime, clock)
            gl.uniform1f(uDpr, dpr)

            const bg = parseColor(p.background, [0.043, 0.051, 0.078])
            const base = parseColor(p.baseColor, [0.055, 0.078, 0.125])
            const accent = parseColor(p.accentColor, [0.831, 0.855, 0.898])
            gl.uniform3f(uBg, bg[0], bg[1], bg[2])
            gl.uniform3f(uBase, base[0], base[1], base[2])
            gl.uniform3f(uAccent, accent[0], accent[1], accent[2])

            gl.uniform1f(uHorizon, horizon)
            gl.uniform1f(uFocal, focal)
            gl.uniform1f(uCamH, CAM_HEIGHT)
            gl.uniform1f(uSquare, square)
            gl.uniform1f(uPanZ, pan)
            gl.uniform2f(uLamp, lampX * follow, IDLE_Z + (lampZ - IDLE_Z) * follow)
            // Reach is the lamp's HEIGHT, so it widens and softens the pool
            // together — one dial, one physical quantity.
            // The highlighted square and the lamp are the same ground point,
            // expressed in square units with the scroll folded in.
            const lampWorldX = lampX * follow
            const lampWorldZ = IDLE_Z + (lampZ - IDLE_Z) * follow
            gl.uniform2f(uSelQ, lampWorldX / square, lampWorldZ / square + pan)
            gl.uniform1f(uLampH, (clamp(num(p.reach, 35), 5, 100) / 100) * 2.2)
            gl.uniform1f(uLampAmt, Math.min(1, pointerRef.current.on))
            gl.uniform1f(uHaze, (clamp(num(p.haze, 30), 0, 100) / 100) * 0.22)
            gl.uniform1f(uGrain, (clamp(num(p.grain, 4), 0, 100) / 100) * 0.09)

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
