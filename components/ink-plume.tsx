"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * InkPlume — a plume billowing up through black.
 *
 * THREE sheets of smoke at different scales and drift rates, summed. One fbm
 * alone reads as a flat stain; the differing drifts are what give the plume an
 * interior.
 *
 * Interaction: the pointer pushes the plume aside and it billows around the shove.
 */

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
uniform vec3  uBg;
uniform vec3  uBase;
uniform vec3  uAccent;
uniform vec3  uHigh;
uniform float uHeight;
uniform float uWidth;
uniform float uRise;
uniform float uDensity;

float sat(float x) { return clamp(x, 0.0, 1.0); }

float h21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 34.56);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = h21(i), b = h21(i + vec2(1.0, 0.0));
    float c = h21(i + vec2(0.0, 1.0)), d = h21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm5(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return s;
}

float fbm3(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.07 + vec2(4.1, 2.3); a *= 0.5; }
    return s;
}

float sheet(vec2 p, float t, float sc, float dr, float sd){
  vec2 q = p * sc;
  q.y -= t * dr;
  q += 0.65 * vec2(fbm3(q * 0.9 + vec2(sd, t * 0.06)), fbm3(q * 0.9 + vec2(sd * 2.3, -t * 0.05)));
  return fbm5(q);
}
void main(){
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(ar, 1.0);
  float t = uTime;
  vec2 md = (uv - uMouse) * vec2(ar, 1.0);
  p += md * uHover * 0.55 * exp(-dot(md, md) / 0.030);
  float rise = sat((p.y + 0.5) / max(uHeight, 0.05));
  float wid = uWidth * (0.16 + 0.52 * pow(rise, 0.75));
  float sq = (p.x - 0.10 * sin(p.y * 2.2 + t * 0.3)) / max(wid, 0.02);
  float shape = exp(-sq * sq);
  float cap = 1.0 - smoothstep(0.55, 1.05, rise);
  float acc = 0.0;
  acc += sheet(p, t, 2.4, uRise * 0.45, 1.0) * 1.00;
  acc += sheet(p, t, 4.1, uRise * 0.62, 5.7) * 0.65;
  acc += sheet(p, t, 7.3, uRise * 0.85, 9.2) * 0.40;
  acc /= 2.05;
  float v = sat((acc * 1.15 + shape * 0.72 * cap - 0.92) * uDensity * 1.7);
  vec3 col = uBg;
  col += uBase * smoothstep(0.02, 0.42, v);
  col = mix(col, uAccent, smoothstep(0.34, 0.76, v));
  col = mix(col, uHigh, smoothstep(0.86, 1.00, v));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

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

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("InkPlume shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

type PlumeGroup = { plumeHeight?: number; plumeWidth?: number; rise?: number; density?: number }
const PLUME_DEFAULTS: Required<PlumeGroup> = { plumeHeight: 105, plumeWidth: 100, rise: 100, density: 100 }

interface InkPlumeProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    accentColor?: string
    highlight?: string
    speed?: number
    hover?: number
    plume?: PlumeGroup
    width?: number
    height?: number
}

function __BaseImpl_InkPlume(props: InkPlumeProps) {
    const {
        style,
        background = "#01030A",
        baseColor = "#FF5200",
        accentColor = "#E89B5A",
        highlight = "#D8E8FF",
        speed = 43,
        hover = 200,
        plume,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const plume_ = { ...PLUME_DEFAULTS, ...(plume || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        bg: background,
        base: baseColor,
        accent: accentColor,
        high: highlight,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        plumeHeight: clampN(num(plume_.plumeHeight, 105), 30, 250) / 100,
        plumeWidth: clampN(num(plume_.plumeWidth, 100), 20, 300) / 100,
        rise: clampN(num(plume_.rise, 100), 0, 300) / 100,
        density: clampN(num(plume_.density, 100), 20, 300) / 100,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("InkPlume: WebGL unavailable")
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
            console.error("InkPlume link:", gl.getProgramInfoLog(prog))
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
            const cg = parseColor(v.bg as string, [0.004, 0.012, 0.039])
            const cb = parseColor(v.base as string, [0.118, 0.243, 0.620])
            const ca = parseColor(v.accent as string, [0.353, 0.561, 0.910])
            const chi = parseColor(v.high as string, [0.847, 0.910, 1.0])
            gl.uniform3f(u("uBg"), cg[0], cg[1], cg[2])
            gl.uniform3f(u("uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u("uAccent"), ca[0], ca[1], ca[2])
            gl.uniform3f(u("uHigh"), chi[0], chi[1], chi[2])
            gl.uniform1f(u("uHeight"), v.plumeHeight as number)
            gl.uniform1f(u("uWidth"), v.plumeWidth as number)
            gl.uniform1f(u("uRise"), v.rise as number)
            gl.uniform1f(u("uDensity"), v.density as number)
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
  "background": "#01030A",
  "baseColor": "#943000",
  "accentColor": "#E89B5A",
  "highlight": "#D8E8FF",
  "speed": 43,
  "hover": 200,
  "plume": {
    "rise": 239,
    "density": 63,
    "plumeWidth": 300,
    "plumeHeight": 88
  }
};

export default function InkPlume(props: Record<string, unknown>) {
  return <__BaseImpl_InkPlume {...(__presetProps as Record<string, unknown>)} {...props} />;
}
