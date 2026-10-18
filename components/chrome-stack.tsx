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

uniform vec3 uBg, uBase, uAccent, uHigh;
uniform float uBands, uBow, uGloss, uFlow;

vec3 envmap(vec3 rd, vec3 sky, vec3 band, vec3 hi, vec3 L){
  float y = rd.y;
  vec3 c = mix(vec3(0.006, 0.007, 0.010), sky, sat(y * 0.55 + 0.50));
  c = mix(c, band, exp(-pw(abs(y - 0.24) / 0.18, 2.0)) * 0.85);
  float dl = sat(dot(rd, L));
  c += hi * pw(dl, 210.0) * 3.2;
  c += hi * pw(dl, 11.0) * 0.14;
  return c;
}
void main(){
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(ar, 1.0);
  float t = uTime * 0.05;
  float Rc = 1.55;
  vec2 o = vec2(0.0, -Rc + uBow * 0.34);
  vec2 dv = p - o;
  float ln = max(length(dv), 1e-4);
  float q = ln - Rc;
  vec2 rd2 = dv / ln;
  float s = q * uBands + t * uFlow;
  float bi = floor(s);
  float across = (fract(s) - 0.5) * 2.0;
  float nz = sqrt(max(1.0 - across * across, 0.0));
  vec3 N = normalize(vec3(rd2 * across * uGloss, nz + 0.02));
  vec3 Rf = reflect(-vec3(0.0, 0.0, 1.0), N);
  float hv = sat(uHover);
  vec3 L = normalize(vec3(mix(-0.50, 0.50, mix(0.62, uMouse.x, hv)),
                          mix(-0.15, 0.80, mix(0.55, uMouse.y, hv)) + 0.14, 0.62));
  float along = atan(dv.x, dv.y);
  float mixb = sat(vnoise(vec2(along * 1.8 + bi * 4.3, t * 1.2)) * 2.1 - 0.72);
  vec3 col = envmap(Rf, mix(uBase, uAccent, mixb), uAccent, uHigh, L);
  col *= smoothstep(0.0, 0.20, nz);
  col *= mix(1.0, 0.30, sat(abs(p.y) * 1.35));
  col = max(col, uBg);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("ChromeStack shader:", gl.getShaderInfoLog(sh))
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

type RibbonGroup = { bow?: number; gloss?: number; flow?: number }
const RIBBON_DEFAULTS: Required<RibbonGroup> = { bow: 100, gloss: 115, flow: 100 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    highlight?: string
    density?: number
    speed?: number
    hover?: number
    ribbon?: RibbonGroup
}

function __BaseImpl_ChromeStack(props: Props) {
    const {
        style,
        background = "#000000",
        baseColor = "#22262E",
        accentColor = "#1E5BD8",
        highlight = "#FFFFFF",
        density = 13,
        speed = 100,
        hover = 200,
        ribbon,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const ribbon_ = { ...RIBBON_DEFAULTS, ...(ribbon || {}) }

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
        highlight: highlight,
        density: clampN(num(density, 7), 2, 24),
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        bow: clampN(num(ribbon_.bow, 100), 0, 250) / 100,
        gloss: clampN(num(ribbon_.gloss, 115), 20, 300) / 100,
        flow: clampN(num(ribbon_.flow, 100), 0, 300) / 100,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("ChromeStack: WebGL unavailable")
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
            console.error("ChromeStack link:", gl.getProgramInfoLog(prog))
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
            const c_uBg = parseColor(v.background as string, [0.0, 0.0, 0.0])
            gl.uniform3f(u("uBg"), c_uBg[0], c_uBg[1], c_uBg[2])
            const c_uBase = parseColor(v.baseColor as string, [0.133, 0.149, 0.18])
            gl.uniform3f(u("uBase"), c_uBase[0], c_uBase[1], c_uBase[2])
            const c_uAccent = parseColor(v.accentColor as string, [0.118, 0.357, 0.847])
            gl.uniform3f(u("uAccent"), c_uAccent[0], c_uAccent[1], c_uAccent[2])
            const c_uHigh = parseColor(v.highlight as string, [1.0, 1.0, 1.0])
            gl.uniform3f(u("uHigh"), c_uHigh[0], c_uHigh[1], c_uHigh[2])
            gl.uniform1f(u("uBands"), v.density as number)
            gl.uniform1f(u("uBow"), v.bow as number)
            gl.uniform1f(u("uGloss"), v.gloss as number)
            gl.uniform1f(u("uFlow"), v.flow as number)

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

const __presetProps = {
  "background": "#000000",
  "baseColor": "#22262E",
  "accentColor": "#1EB6D8",
  "highlight": "#FFFFFF",
  "density": 19,
  "speed": 100,
  "hover": 200,
  "ribbon": {
    "bow": 250,
    "flow": 300,
    "gloss": 20
  }
};

export default function ChromeStack(props: Record<string, unknown>) {
  return <__BaseImpl_ChromeStack {...(__presetProps as Record<string, unknown>)} {...props} />;
}
