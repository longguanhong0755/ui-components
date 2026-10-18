"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const VIGNETTE = 0.8 // the source's exp(-len * 0.8); grading, so not a dial

const VERT_SRC = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG_SRC = `
#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime, uSpread, uFreq, uWarp, uWidth, uAngle, uAA, uHover;
uniform vec2  uPtr;   // rotated field space, the same p the streams live in
uniform vec3  uBg, uBase, uMid, uAccent;

varying vec2 v_uv;

mat2 rot(float a){
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

// One stream: the band comb, warped along x, sampled at an offset in y.
float stream(vec2 p, float offset){
  // The comb BULGES toward the pointer: a gaussian pull on y, applied before the
  // band function, so the wavefronts bend as one continuous sheet — the same way
  // the x-warp bends them — instead of a bright patch appearing on top.
  vec2 d = p - uPtr;
  float bulge = exp(-dot(d, d) / 0.35) * uHover * 0.22;
  float y = p.y + offset - bulge + sin(p.x * 2.5 - uTime * 1.5) * uWarp;
  float s = sin(y * uFreq + uTime * 2.0) * 0.5 + 0.5;
  float lo = min(1.0 - 0.15 * uWidth, 0.985);
  // Soften by the band's own screen-space slope, or the comb aliases into moire
  // wherever it runs near-parallel to the pixel grid. uAA is 0 when the
  // derivative extension is missing, which gives the source's hard edges back.
  float w = uAA * max(fwidth(s), 1e-4);
  return smoothstep(lo - w, 0.99 + w, s);
}

void main(){
  vec2 p = v_uv * 2.0 - 1.0;
  p.x *= uRes.x / max(uRes.y, 1.0);
  p = rot(uAngle) * p;

  float spread = 0.06 * uSpread;

  vec3 col = uBase * 1.2 * stream(p, spread)
           + uMid * 0.5 * stream(p, 0.0)
           + uAccent * 1.8 * stream(p, -spread);

  col *= exp(-length(v_uv * 2.0 - 1.0) * ${VIGNETTE.toFixed(2)});

  gl_FragColor = vec4(uBg + col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("StreamConvergence shader:", gl.getShaderInfoLog(sh))
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

type WaveGroup = { frequency?: number; amplitude?: number; bandWidth?: number; angle?: number }
const WAVE_DEFAULTS: Required<WaveGroup> = { frequency: 100, amplitude: 100, bandWidth: 100, angle: 32 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    highlight?: string
    accentColor?: string
    speed?: number
    hover?: number
    spread?: number
    wave?: WaveGroup
}

export default function StreamConvergence(props: Props) {
    const {
        style,
        background = "#000000",
        baseColor = "#00FFB5",
        highlight = "#7200FF",
        accentColor = "#FDA700",
        speed = 100,
        hover = 100,
        spread = 50,
        wave,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const wave_ = { ...WAVE_DEFAULTS, ...(wave || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const ptrRef = useRef({ tx: 0.5, ty: 0.5, x: 0.5, y: 0.5, on: 0, onS: 0 })
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        bg: background,
        base: baseColor,
        mid: highlight,
        accent: accentColor,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        // the source's fidelity dial: spread = 0.06 * (0.3 + f * 0.7)
        spread: 0.3 + (clampN(num(spread, 50), 0, 100) / 100) * 0.7,
        frequency: clampN(num(wave_.frequency, 100), 10, 400) / 100,
        amplitude: clampN(num(wave_.amplitude, 100), 0, 400) / 100,
        bandWidth: clampN(num(wave_.bandWidth, 100), 10, 400) / 100,
        angle: clampN(num(wave_.angle, 32), -90, 90),
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false })
        if (!gl) {
            console.error("StreamConvergence: WebGL unavailable")
            return
        }

        // Derivatives are an extension in WebGL1. Enabled where present; where it is
        // not, uAA goes to 0 and the bands render with the source's hard edges
        // rather than the shader failing to compile.
        const hasDerivatives = !!gl.getExtension("OES_standard_derivatives")
        const src = hasDerivatives
            ? FRAG_SRC
            : FRAG_SRC.replace("#extension GL_OES_standard_derivatives : enable", "#define fwidth(x) 0.0")

        const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
        const fs = compile(gl, gl.FRAGMENT_SHADER, src)
        if (!vs || !fs) return
        const prog = gl.createProgram()
        if (!prog) return
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("StreamConvergence link:", gl.getProgramInfoLog(prog))
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

        let raf = 0
        let last = performance.now()
        let clock = 0
        const PTR_RATE = 5.5 // 1/s, how fast the bulge follows

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            // the source ran at 3e-4 per millisecond; expressed per second
            clock = (clock + dt * 0.3 * (v.speed as number)) % 12566 // whole turns of both phase terms

            const ptr = ptrRef.current
            const k = 1 - Math.exp(-dt * PTR_RATE)
            ptr.x += (ptr.tx - ptr.x) * k
            ptr.y += (ptr.ty - ptr.y) * k
            // Presence, not just position: at rest the pointer's "position" is the
            // centre of the frame, so without this gate the effect would sit in the
            // middle of an untouched component and the resting frame would not be
            // the source's.
            ptr.onS += (ptr.on - ptr.onS) * k

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

            gl.uniform2f(u("uRes"), bw, bh)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform1f(u("uSpread"), v.spread as number)
            gl.uniform1f(u("uFreq"), 6.0 * (v.frequency as number))
            gl.uniform1f(u("uWarp"), 0.12 * (v.amplitude as number))
            gl.uniform1f(u("uWidth"), v.bandWidth as number)
            gl.uniform1f(u("uAngle"), ((v.angle as number) * Math.PI) / 180)
            gl.uniform1f(u("uAA"), hasDerivatives ? 1 : 0)
            gl.uniform1f(u("uHover"), (v.hover as number) * ptr.onS)
            // The streams live in the ROTATED field, so the pointer is rotated by the
            // same angle — otherwise the bulge slides along the bands as they turn.
            {
                const ang = ((v.angle as number) * Math.PI) / 180
                const ar = bw / Math.max(bh, 1)
                const qx = (ptr.x * 2 - 1) * ar
                const qy = 1 - ptr.y * 2
                gl.uniform2f(
                    u("uPtr"),
                    qx * Math.cos(ang) - qy * Math.sin(ang),
                    qx * Math.sin(ang) + qy * Math.cos(ang)
                )
            }
            const cg = parseColor(v.bg as string, [0, 0, 0])
            const cb = parseColor(v.base as string, [1, 0, 0])
            const cm = parseColor(v.mid as string, [0, 1, 0])
            const ca = parseColor(v.accent as string, [0, 0, 1])
            gl.uniform3f(u("uBg"), cg[0], cg[1], cg[2])
            gl.uniform3f(u("uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u("uMid"), cm[0], cm[1], cm[2])
            gl.uniform3f(u("uAccent"), ca[0], ca[1], ca[2])

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant — offset and size scale together — so
        // this is safe on a zoomed Framer canvas where absolute px are not.
        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            ptrRef.current.tx = clampN((e.clientX - r.left) / r.width, 0, 1)
            ptrRef.current.ty = clampN((e.clientY - r.top) / r.height, 0, 1)
            ptrRef.current.on = 1
        }
        const onLeave = () => {
            ptrRef.current.tx = 0.5
            ptrRef.current.ty = 0.5
            ptrRef.current.on = 0
        }
        canvas.addEventListener("pointermove", track)
        canvas.addEventListener("pointerenter", track)
        canvas.addEventListener("pointerleave", onLeave)

        raf = requestAnimationFrame(render)

        // Never loseContext(): getContext returns the same context per canvas, so
        // StrictMode's mount -> cleanup -> mount would reuse a force-lost one.
        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", track)
            canvas.removeEventListener("pointerenter", track)
            canvas.removeEventListener("pointerleave", onLeave)
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
