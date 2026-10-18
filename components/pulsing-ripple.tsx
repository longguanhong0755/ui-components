"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * HalftonePulse — a dot screen with a wave pulsing out through it.
 *
 * A regular grid of point sprites; each dot's SIZE and opacity carry a radial
 * sine, so the wave is read from the dots themselves rather than from a
 * brightness field laid under them. That is what keeps it a halftone instead of
 * a blurred gradient with dots on top.
 *
 * Three fixes the source form needed:
 *
 *  - Density tightens SPACING, it does not grow the grid. Growing the grid only
 *    adds points outside the orthographic frustum, so the dial appears to do
 *    nothing while quietly costing draw calls, and full-bleed it reads sparse.
 *  - gl_PointSize is in DEVICE pixels, so a size that is not multiplied by DPR
 *    renders at half scale on a retina display. The source set a pixel ratio and
 *    then sized its points as though it had not.
 *  - The colour ramp indexed raw world y, which runs past the 0..1 the mix
 *    expects, so the gradient clipped at both ends. It is normalised here.
 *
 * Ported from a bento-card background; the same source underlies the
 * "amber-halftone" variant of the Predictive Arc collection. Interaction: the
 * pointer carries a second, local pulse — dots near the cursor brighten and
 * enlarge along the same size/opacity channel the wave already drives, eased
 * toward the cursor and back off when it leaves so nothing pops.
 */

const MAX_DPR = 2
const SPAN = 2.4 // world half-extent the grid covers, a little past the frustum
const POINTER_OFFSCREEN = 999 // far enough that the pointer term is always 0 when idle
const POINTER_EASE = 0.15

const VERT_SRC = `
precision highp float;

attribute vec2 a_cell;   // [0,1]^2 grid coordinate

uniform vec2  uRes, uPointer;
uniform float uTime, uPx, uFreq, uContrast, uDpr, uPointerRadius, uPointerStrength;

varying float v_scale;
varying float v_ramp;

void main(){
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 p = (a_cell - 0.5) * 2.0 * vec2(ar, 1.0) * ${SPAN.toFixed(2)};

  float dist = length(p);
  float s = sin(dist * uFreq - uTime * 2.5) * 0.5 + 0.5;
  s = pow(s, uContrast);

  // Local pulse around the pointer, on the same size/opacity channel as the
  // radial wave — so it reads as one halftone, not a gradient laid under it.
  float pd = length(p - uPointer);
  float ps = (1.0 - smoothstep(0.0, max(uPointerRadius, 0.0001), pd)) * uPointerStrength;
  s = clamp(s + ps, 0.0, 1.0);

  v_scale = s;
  v_ramp = clamp(a_cell.y, 0.0, 1.0);

  // gl_PointSize is DEVICE pixels: without the DPR term the screen renders at
  // half scale the moment the buffer is retina.
  gl_PointSize = max(s * uPx * uDpr, 0.0);
  gl_Position = vec4(p / vec2(ar, 1.0) / ${SPAN.toFixed(2)}, 0.0, 1.0);
}
`

const FRAG_SRC = `
precision mediump float;

uniform vec3 uBase, uAccent;

varying float v_scale;
varying float v_ramp;

void main(){
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q) * 2.0;
  if (d > 1.0) discard;
  float m = 1.0 - smoothstep(0.70, 1.0, d);
  vec3 col = mix(uBase, uAccent, v_ramp);
  float a = v_scale * 0.9 * m;
  gl_FragColor = vec4(col * a, a);   // premultiplied
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("HalftonePulse shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function parseColor(input: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!input) return fb
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
        return fb
    }
    const m = str.match(/[\d.]+/g)
    if (m && m.length >= 3) {
        return [
            Math.min(255, parseFloat(m[0])) / 255,
            Math.min(255, parseFloat(m[1])) / 255,
            Math.min(255, parseFloat(m[2])) / 255,
        ]
    }
    return fb
}

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

function clampN(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

/** Grid of cells across the frustum. Density tightens spacing; rebuilt on change
 *  — buffers, never the context. */
function grid(n: number): { cell: Float32Array; count: number } {
    const cols = Math.max(2, n)
    const rows = Math.max(2, Math.round(n * 0.68))
    const count = cols * rows
    const cell = new Float32Array(count * 2)
    let k = 0
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            cell[k * 2] = cols > 1 ? x / (cols - 1) : 0.5
            cell[k * 2 + 1] = rows > 1 ? y / (rows - 1) : 0.5
            k++
        }
    }
    return { cell, count }
}

interface WaveGroup {
    frequency?: number
    contrast?: number
}
const WAVE_DEFAULTS: Required<WaveGroup> = { frequency: 100, contrast: 100 }

interface PointerGroup {
    strength?: number
    radius?: number
}
const POINTER_DEFAULTS: Required<PointerGroup> = { strength: 70, radius: 35 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    dotSize?: number
    speed?: number
    wave?: WaveGroup
    pointer?: PointerGroup
}

function __BaseImpl_HalftonePulse(props: Props) {
    const {
        style,
        background = "#000000",
        baseColor = "#00FFAC",
        accentColor = "#FFFA00",
        density = 160,
        dotSize = 209,
        speed = 50,
        wave,
        pointer,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const wave_ = { ...WAVE_DEFAULTS, ...(wave || {}) }
    const pointer_ = { ...POINTER_DEFAULTS, ...(pointer || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        base: baseColor,
        accent: accentColor,
        density: Math.round(clampN(num(density, 60), 12, 160)),
        dotSize: clampN(num(dotSize, 100), 20, 400) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        frequency: (clampN(num(wave_.frequency, 100), 20, 400) / 100) * 6.0,
        contrast: (clampN(num(wave_.contrast, 100), 20, 400) / 100) * 1.0,
        pointerStrength: clampN(num(pointer_.strength, 70), 0, 200) / 100,
        pointerRadius: (clampN(num(pointer_.radius, 35), 10, 100) / 100) * SPAN,
    }

    // Pointer position lives outside React state: `current` is what render()
    // reads each frame, `target` is where the pointer just moved to, and the
    // loop eases one toward the other so entering/leaving doesn't pop.
    const pointerCurrentRef = useRef({ x: POINTER_OFFSCREEN, y: POINTER_OFFSCREEN })
    const pointerTargetRef = useRef({ x: POINTER_OFFSCREEN, y: POINTER_OFFSCREEN })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            depth: false,
            premultipliedAlpha: true,
        })
        if (!gl) {
            console.error("HalftonePulse: WebGL unavailable")
            return
        }

        const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
        if (!vs || !fs) return
        const prog = gl.createProgram()
        if (!prog) return
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("HalftonePulse link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const aCell = gl.getAttribLocation(prog, "a_cell")
        gl.enableVertexAttribArray(aCell)

        const locs: Record<string, WebGLUniformLocation | null> = {}
        const u = (name: string) => {
            if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
            return locs[name]
        }

        const bCell = gl.createBuffer()
        let builtFor = 0
        let count = 0
        const build = (n: number) => {
            const g = grid(n)
            gl.bindBuffer(gl.ARRAY_BUFFER, bCell)
            gl.bufferData(gl.ARRAY_BUFFER, g.cell, gl.STATIC_DRAW)
            builtFor = n
            count = g.count
        }

        // Pointer coords are converted into the same world space the vertex
        // shader computes `p` in: NDC scaled by aspect ratio and SPAN.
        const setPointerTarget = (clientX: number, clientY: number) => {
            const rect = canvas.getBoundingClientRect()
            const cw = rect.width || 1
            const ch = rect.height || 1
            const nx = ((clientX - rect.left) / cw) * 2 - 1
            const ny = -(((clientY - rect.top) / ch) * 2 - 1)
            const ar = cw / Math.max(ch, 1)
            pointerTargetRef.current.x = nx * ar * SPAN
            pointerTargetRef.current.y = ny * SPAN
        }
        const clearPointerTarget = () => {
            pointerTargetRef.current.x = POINTER_OFFSCREEN
            pointerTargetRef.current.y = POINTER_OFFSCREEN
        }
        const onPointerMove = (e: PointerEvent) => setPointerTarget(e.clientX, e.clientY)
        const onPointerLeave = () => clearPointerTarget()
        canvas.addEventListener("pointermove", onPointerMove)
        canvas.addEventListener("pointerleave", onPointerLeave)
        canvas.addEventListener("pointercancel", onPointerLeave)

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            clock = (clock + dt * (v.speed as number)) % 3600

            const pc = pointerCurrentRef.current
            const pt = pointerTargetRef.current
            pc.x += (pt.x - pc.x) * POINTER_EASE
            pc.y += (pt.y - pc.y) * POINTER_EASE

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
            gl.viewport(0, 0, bw, bh)

            const wantN = v.density as number
            if (wantN !== builtFor) build(wantN)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.disable(gl.DEPTH_TEST)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

            gl.bindBuffer(gl.ARRAY_BUFFER, bCell)
            gl.vertexAttribPointer(aCell, 2, gl.FLOAT, false, 0, 0)

            // Dot size tracks the cell pitch, so raising Density thins the dots
            // instead of fusing them into a solid sheet.
            const pitch = Math.min(bw, bh) / Math.max(wantN, 1)
            gl.uniform2f(u("uRes"), bw, bh)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform1f(u("uPx"), Math.max(1.0, (pitch / dpr) * 0.9 * (v.dotSize as number)))
            gl.uniform1f(u("uDpr"), dpr)
            gl.uniform1f(u("uFreq"), v.frequency as number)
            gl.uniform1f(u("uContrast"), v.contrast as number)
            gl.uniform2f(u("uPointer"), pc.x, pc.y)
            gl.uniform1f(u("uPointerRadius"), v.pointerRadius as number)
            gl.uniform1f(u("uPointerStrength"), v.pointerStrength as number)
            const cb = parseColor(v.base as string, [1, 1, 1])
            const ca = parseColor(v.accent as string, [0.984, 0.749, 0.141])
            gl.uniform3f(u("uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u("uAccent"), ca[0], ca[1], ca[2])

            gl.drawArrays(gl.POINTS, 0, count)
            raf = requestAnimationFrame(render)
        }

        build(vRef.current.density as number)
        raf = requestAnimationFrame(render)

        // Never loseContext(): getContext returns the same context per canvas, so
        // StrictMode's mount -> cleanup -> mount would reuse a force-lost one.
        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", onPointerMove)
            canvas.removeEventListener("pointerleave", onPointerLeave)
            canvas.removeEventListener("pointercancel", onPointerLeave)
        }
    }, [])

    return (
        <div
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                minWidth: 1200,
                minHeight: 800,
                width: typeof width === "number" && width > 0 ? width : "100%",
                height: typeof height === "number" && height > 0 ? height : "100%",
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
                    touchAction: "none",
                }}
            />
        </div>
    )
}

const __presetProps = {
  "background": "#000000",
  "baseColor": "#00FFAC",
  "accentColor": "#FFFA00",
  "density": 160,
  "dotSize": 217,
  "speed": 50,
  "wave": {
    "contrast": 56,
    "frequency": 104
  },
  "pointer": {
    "radius": 42,
    "strength": 101
  }
};

export default function HalftonePulse(props: Record<string, unknown>) {
  return <__BaseImpl_HalftonePulse {...(__presetProps as Record<string, unknown>)} {...props} />;
}
