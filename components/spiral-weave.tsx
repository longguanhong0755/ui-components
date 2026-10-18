"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uHover;

const float PI  = 3.14159265;
const float TAU = 6.28318531;

float sat(float x){ return clamp(x, 0.0, 1.0); }
float pw(float x, float e){ return pow(max(x, 1e-5), e); }
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 34.56); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm3(vec2 p){ float s = 0.0, a = 0.5; for(int i = 0; i < 3; i++){ s += a * vnoise(p); p = p * 2.07 + vec2(4.1, 2.3); a *= 0.5; } return s; }

uniform vec3 uBase, uAccent, uHigh;
uniform float uThreads, uWind, uWarp, uRing, uInk;

float lvl(float ph, float gph, float thick){
  float dph = abs(mod(ph + PI, TAU) - PI);
  // Thread half-width is thick device pixels, but never more than 30% of the
  // period: past that the two families stop weaving and fuse into a wash.
  float hw = min(thick * gph, 0.30 * PI);
  float v = 1.0 - smoothstep(max(hw - gph, 0.0), hw + gph, dph);
  // Sub-pixel fallback keyed on DUTY (drawn width / spacing), not on the raw
  // gradient. Below one pixel a level set cannot be resolved, so hand back its
  // coverage instead of aliasing.
  float duty = clamp((hw + gph) / PI, 0.0, 1.0);
  return mix(v, duty, duty);
}
// Exact |grad(ph)| for ph = n*(th + k*log(r+0.06) + sgn*wob), in phase per device
// pixel. The wobble contributes to BOTH partials; a scalar fudge on the pure
// log-spiral gradient was off by 0.36x..1.49x, which drew the same thread 2px
// wide in one place and 9px in another.
float gradPh(float n, float k, float sgn, float r, float dwr, float dwt, float px){
  float ddr = k / (r + 0.06) + sgn * dwr;
  float ddt = (1.0 + sgn * dwt) / r;
  return n * length(vec2(ddr, ddt)) * px + 1e-5;
}
void main(){
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(ar, 1.0);
  float t = uTime * 0.05;
  vec2 c = mix(vec2(0.26, 0.15), (uMouse - 0.5) * vec2(ar, 1.0), sat(uHover));
  vec2 d = p - c;
  float r = max(length(d), 1e-3);
  float th = atan(d.y, d.x);
  float px = 1.0 / uRes.y;
  float lr = log(r + 0.06);
  float wob = uWarp * 0.30 * sin(th * 3.0 + r * 5.0 - t * 3.0);
  float kA = uWind, kB = -uWind * 0.62;
  // Both winding numbers MUST be integers. ph = n*th is single-valued around the
  // origin only when n is whole; nB = uThreads*0.78 was not, so family B jumped
  // by a non-2PI amount across the th = +-PI ray and every one of its threads
  // stepped sideways there (measured 3px at Density 130, 100px at Density 20 --
  // the broken thread ends running left of the vortex). Same reason the wobble's
  // 3.0 and the dir term's period must stay 2PI-periodic in th.
  float nA = max(1.0, floor(uThreads + 0.5));
  float nB = max(1.0, floor(uThreads * 0.78 + 0.5));
  float cw = cos(th * 3.0 + r * 5.0 - t * 3.0);
  float dwr = uWarp * 0.30 * 5.0 * cw;
  float dwt = uWarp * 0.30 * 3.0 * cw;
  float gA = gradPh(nA, kA,  1.0, r, dwr, dwt, px);
  float gB = gradPh(nB, kB, -1.0, r, dwr, dwt, px);
  float lA = lvl(nA * (th + kA * lr + wob), gA, 0.55);
  float lB = lvl(nB * (th + kB * lr - wob), gB, 0.55);
  float weave = sat((lA + lB) - lA * lB * 0.60);
  float g = sat(0.50 + 0.82 * (uv.x * 0.50 - uv.y * 0.72));
  vec3 col = mix(uBase, uAccent, g);
  float ring = exp(-pw(abs(r - uRing) / (uRing * 1.35), 2.0));
  float dir = 0.55 + 0.45 * sat(cos(th - 0.80) * 0.55 + 0.62);
  float env = ring * dir * smoothstep(0.0, uRing * 0.45, r)
            * (1.0 - smoothstep(uRing * 2.4, uRing * 3.6, r));
  col *= 1.0 - 0.34 * env * uInk;
  col = mix(col, uHigh, sat(weave * env * uInk));
  col = mix(col, uHigh, 0.55 * exp(-r * r / (uRing * uRing * 0.40)));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("SpiralWeave shader:", gl.getShaderInfoLog(sh))
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

type WeaveGroup = { winding?: number; warp?: number; ring?: number; ink?: number }
const WEAVE_DEFAULTS: Required<WeaveGroup> = { winding: 62, warp: 55, ring: 34, ink: 95 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    threadColor?: string
    density?: number
    speed?: number
    hover?: number
    weave?: WeaveGroup
}

export default function SpiralWeave(props: Props) {
    const {
        style,
        background = "#FF5F00",
        baseColor = "#000000",
        accentColor = "#000000",
        threadColor = "#A4FF00",
        density = 122,
        speed = 50,
        hover = 100,
        weave,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const weave_ = { ...WEAVE_DEFAULTS, ...(weave || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        background: background,
        baseColor: baseColor,
        accentColor: accentColor,
        threadColor: threadColor,
        density: clampN(num(density, 130), 20, 400),
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        winding: clampN(num(weave_.winding, 62), 0, 150) / 100,
        warp: clampN(num(weave_.warp, 55), 0, 200) / 100,
        ring: clampN(num(weave_.ring, 34), 10, 90) / 100,
        ink: clampN(num(weave_.ink, 95), 0, 100) / 100,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("SpiralWeave: WebGL unavailable")
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
            console.error("SpiralWeave link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const posLoc = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        const locs: Record<string, WebGLUniformLocation | null> = {}
        const u = (name: string) => {
            if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
            return locs[name]
        }

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current

            clock = (clock + dt * (v.speed as number)) % 3600

            const ptr = ptrRef.current
            const k = 1 - Math.exp(-6 * dt)
            ptr.on += (ptr.onTarget - ptr.on) * k
            ptr.x += ((ptr.onTarget > 0 ? ptr.tx : 0.5) - ptr.x) * k
            ptr.y += ((ptr.onTarget > 0 ? ptr.ty : 0.5) - ptr.y) * k

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
            gl.uniform2f(u("uMouse"), ptr.x, 1 - ptr.y)
            gl.uniform1f(u("uHover"), Math.min(1, ptr.on) * (v.hover as number))
            const c_uBase = parseColor(v.baseColor as string, [0.973, 0.863, 0.792])
            gl.uniform3f(u("uBase"), c_uBase[0], c_uBase[1], c_uBase[2])
            const c_uAccent = parseColor(v.accentColor as string, [0.886, 0.612, 0.494])
            gl.uniform3f(u("uAccent"), c_uAccent[0], c_uAccent[1], c_uAccent[2])
            const c_uHigh = parseColor(v.threadColor as string, [1.0, 0.976, 0.957])
            gl.uniform3f(u("uHigh"), c_uHigh[0], c_uHigh[1], c_uHigh[2])
            gl.uniform1f(u("uThreads"), v.density as number)
            gl.uniform1f(u("uWind"), v.winding as number)
            gl.uniform1f(u("uWarp"), v.warp as number)
            gl.uniform1f(u("uRing"), v.ring as number)
            gl.uniform1f(u("uInk"), v.ink as number)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            ptrRef.current.tx = clampN((e.clientX - r.left) / r.width, 0, 1)
            ptrRef.current.ty = clampN((e.clientY - r.top) / r.height, 0, 1)
            ptrRef.current.onTarget = 1
        }
        const onLeave = () => {
            ptrRef.current.onTarget = 0
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
