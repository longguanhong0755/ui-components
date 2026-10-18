"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2

const VERT_SRC = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime, uCell, uDot;
uniform float uScale, uWarp, uSwirl, uAmbient;
uniform vec3  uBg, uBase, uAccent;
uniform vec2  uPointer;
uniform float uPointerStrength, uPointerRadius;

mat2 rot(float a){
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uRes.x / max(uRes.y, 1.0);

  // Pointer vortex: rotate the plane locally around the cursor before the
  // fold loop runs, so the field still warps on top of the disturbance.
  vec2 pr = p - uPointer;
  float pd = length(pr);
  float swirlAmt = uPointerStrength * exp(-(pd * pd) / max(uPointerRadius * uPointerRadius, 0.0001));
  pr = rot(swirlAmt) * pr;
  p = uPointer + pr;

  vec2 f = p * uScale;
  float t = uTime * 0.4;

  // Three folds, each one feeding on the last — the whole character of the field.
  for (int i = 1; i < 4; i++) {
    float fi = float(i);
    f *= rot(t * 0.1 * uSwirl);
    f.x += sin(f.y * 2.0 * fi + t) * 0.5 * uWarp;
    f.y += cos(f.x * 1.5 * fi - t * 0.8) * 0.5 * uWarp;
  }

  float inten = sin(f.x * 2.0 + f.y * 3.0) * 0.5 + 0.5;

  vec3 floorTone = mix(uBg, uBase, 0.06);
  vec3 fluid = mix(floorTone, uBase, smoothstep(0.2, 0.6, inten));
  fluid = mix(fluid, uAccent, smoothstep(0.7, 1.0, inten));

  // Halftone screen. The source wrote smoothstep(radius, radius - 0.1, dist) —
  // edge0 > edge1 is undefined in GLSL — so it is inverted here into the
  // defined form.
  float cs = max(uCell, 2.0);
  vec2 cell = fract(gl_FragCoord.xy / cs) - 0.5;
  float dist = length(cell);
  float radius = inten * 0.45 * uDot;
  float mask = 1.0 - smoothstep(radius - 0.1, radius, dist);

  vec3 col = mix(uBg, fluid, mask) + fluid * uAmbient;
  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("HalftoneFlow shader:", gl.getShaderInfoLog(sh))
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

interface FlowGroup {
    scale?: number
    warp?: number
    swirl?: number
    ambient?: number
}

const FLOW_DEFAULTS: Required<FlowGroup> = {
    scale: 179,
    warp: 100,
    swirl: 100,
    ambient: 15,
}

interface PointerGroup {
    enabled?: boolean
    strength?: number
    radius?: number
}

const POINTER_DEFAULTS: Required<PointerGroup> = {
    enabled: true,
    strength: 300,
    radius: 100,
}

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
    flow?: FlowGroup
    pointer?: PointerGroup
}

export default function HalftoneFlow(props: Props) {
    const {
        style,
        background = "#000000",
        baseColor = "#CC1A0D",
        accentColor = "#FF9933",
        density = 320,
        dotSize = 230,
        speed = 100,
        flow,
        pointer,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const flow_ = { ...FLOW_DEFAULTS, ...(flow || {}) }
    const pointer_ = { ...POINTER_DEFAULTS, ...(pointer || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string | boolean>>({})
    vRef.current = {
        bg: background,
        base: baseColor,
        accent: accentColor,
        density: Math.round(clampN(num(density, 130), 40, 320)),
        dotSize: clampN(num(dotSize, 100), 20, 300) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        scale: clampN(num(flow_.scale, 100), 25, 400) / 100,
        warp: clampN(num(flow_.warp, 100), 0, 300) / 100,
        swirl: clampN(num(flow_.swirl, 100), -200, 200) / 100,
        ambient: clampN(num(flow_.ambient, 15), 0, 100) / 100,
        pointerEnabled: typeof pointer_.enabled === "boolean" ? pointer_.enabled : true,
        pointerStrength: clampN(num(pointer_.strength, 100), 0, 300) / 100,
        pointerRadius: clampN(num(pointer_.radius, 100), 20, 300) / 100,
    }

    // Interaction state, not a props mirror: written by pointer events and eased
    // toward every frame, so it lives outside the props-driven vRef reset above.
    const pointerRef = useRef({ nx: 0.5, ny: 0.5, x: 0, y: 0, active: 0, hover: false })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false })
        if (!gl) {
            console.error("HalftoneFlow: WebGL unavailable")
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
            console.error("HalftoneFlow link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const aPos = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        const locs: Record<string, WebGLUniformLocation | null> = {}
        const u = (name: string) => {
            if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
            return locs[name]
        }

        const onPointerMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            pointerRef.current.nx = (e.clientX - rect.left) / rect.width
            pointerRef.current.ny = (e.clientY - rect.top) / rect.height
            pointerRef.current.hover = true
        }
        const onPointerLeave = () => {
            pointerRef.current.hover = false
        }
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
            // Wrapped on the CPU: unbounded, the accumulator eventually costs
            // float32 precision inside the shader's sines.
            clock = (clock + dt * (v.speed as number)) % 15708

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

            // Density is cells down the SHORT edge, so the screen stays put when the
            // frame changes aspect instead of stretching with the width.
            const pitchCss = Math.min(bw, bh) / dpr / (v.density as number)

            // Rate-independent smoothing (same shape as the clock's dt accumulation)
            // so drag speed and frame rate don't change how eased the pointer feels.
            const pr = pointerRef.current
            const smooth = 1 - Math.exp(-dt * 8)
            const targetActive = v.pointerEnabled && pr.hover ? 1 : 0
            pr.active += (targetActive - pr.active) * smooth
            const aspect = bw / Math.max(bh, 1)
            const tx = (pr.nx * 2 - 1) * aspect
            const ty = 1 - pr.ny * 2
            pr.x += (tx - pr.x) * smooth
            pr.y += (ty - pr.y) * smooth

            gl.uniform2f(u("uRes"), bw, bh)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform1f(u("uCell"), Math.max(2, pitchCss * dpr))
            gl.uniform1f(u("uDot"), v.dotSize as number)
            gl.uniform1f(u("uScale"), v.scale as number)
            gl.uniform1f(u("uWarp"), v.warp as number)
            gl.uniform1f(u("uSwirl"), v.swirl as number)
            gl.uniform1f(u("uAmbient"), v.ambient as number)
            gl.uniform2f(u("uPointer"), pr.x, pr.y)
            gl.uniform1f(u("uPointerStrength"), (v.pointerStrength as number) * 1.4 * pr.active)
            gl.uniform1f(u("uPointerRadius"), (v.pointerRadius as number) * 0.5)
            const cg = parseColor(v.bg as string, [0, 0, 0])
            const cb = parseColor(v.base as string, [0.8, 0.1, 0.05])
            const ca = parseColor(v.accent as string, [1.0, 0.6, 0.2])
            gl.uniform3f(u("uBg"), cg[0], cg[1], cg[2])
            gl.uniform3f(u("uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u("uAccent"), ca[0], ca[1], ca[2])

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

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
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
