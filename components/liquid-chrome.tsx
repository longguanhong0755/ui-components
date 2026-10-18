"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * LiquidChrome — molten metal with sliding reflections.
 *
 * The environment is BANDED. Chrome is only chrome because what it reflects has
 * edges — reflect a smooth ramp off the same surface and it comes back looking
 * like a soft gradient.
 *
 * Interaction: the pointer drags the melt.
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
uniform float uScale;
uniform float uDepth;
uniform float uSwirl;
uniform float uBands;
uniform float uAngle;
uniform float uGrain;

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

float body(vec2 p, float t){
  vec2 q = p;
  for (int i = 0; i < 3; i++) {
    q += uSwirl * 0.42 * vec2(fbm3(q * 1.3 + vec2(t * 0.05, 1.7)), fbm3(q * 1.3 + vec2(4.1, -t * 0.04)));
  }
  return fbm5(q * 1.1) + 0.35 * sin(q.x * 2.2 + q.y * 1.6);
}
vec3 env(vec3 r){
  float y = r.y * 0.5 + 0.5;
  float band = 0.5 + 0.5 * sin(y * 26.0 * uBands);
  vec3 c = mix(uBase, uAccent, sat(y * 1.4 - 0.15));
  c = mix(c * 0.35, c, pow(band, 0.8));
  c = mix(c, uHigh, pow(sat(1.0 - abs(r.y - 0.30) * 3.0), 4.0));
  c = mix(c, uBg, pow(sat(0.25 - r.y), 1.4));
  return c;
}
void main(){
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(ar, 1.0) * uScale;
  float t = uTime;
  vec2 md = (uv - uMouse) * vec2(ar, 1.0);
  p += md * uHover * 0.30 * exp(-dot(md, md) / 0.06);
  float e = 2.0 / uRes.y * uScale;
  float h  = body(p, t);
  float hx = body(p + vec2(e, 0.0), t);
  float hy = body(p + vec2(0.0, e), t);
  vec3 N = normalize(vec3(-(hx - h) / e * uDepth, -(hy - h) / e * uDepth, 1.0));
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 R = reflect(-V, N);
  vec3 col = env(R);
  vec3 L = normalize(vec3(cos(uAngle) * 0.8, sin(uAngle) * 0.6 + 0.3, 0.7));
  col += vec3(1.0) * pow(sat(dot(reflect(-L, N), V)), 90.0) * 0.8;
  col += uHigh * pow(sat(1.0 - dot(N, V)), 3.0) * 0.22;
  col += (h21(gl_FragCoord.xy * 0.8 + fract(t) * 23.0) - 0.5) * uGrain;
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
        console.error("LiquidChrome shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

type MeltGroup = { scale?: number; depth?: number; swirl?: number; bands?: number; angle?: number }
const MELT_DEFAULTS: Required<MeltGroup> = { scale: 100, depth: 22, swirl: 100, bands: 100, angle: 40 }

interface LiquidChromeProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    accentColor?: string
    highlight?: string
    speed?: number
    hover?: number
    grain?: number
    vignette?: number
    melt?: MeltGroup
    width?: number
    height?: number
}

export default function LiquidChrome(props: LiquidChromeProps) {
    const {
        style,
        background = "#0B1405",
        baseColor = "#9DE61E",
        accentColor = "#E8E23A",
        highlight = "#FFFFE0",
        speed = 100,
        hover = 200,
        grain = 35,
        vignette = 18,
        melt,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const melt_ = { ...MELT_DEFAULTS, ...(melt || {}) }

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
        scale: clampN(num(melt_.scale, 100), 30, 300) / 100,
        depth: clampN(num(melt_.depth, 22), 5, 120) / 100,
        swirl: clampN(num(melt_.swirl, 100), 0, 300) / 100,
        bands: clampN(num(melt_.bands, 100), 20, 400) / 100,
        angle: (clampN(num(melt_.angle, 40), 0, 360) * Math.PI) / 180,
        grain: (clampN(num(grain, 8), 0, 100) / 100) * 0.09,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("LiquidChrome: WebGL unavailable")
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
            console.error("LiquidChrome link:", gl.getProgramInfoLog(prog))
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
            const cg = parseColor(v.bg as string, [0.043, 0.078, 0.020])
            const cb = parseColor(v.base as string, [0.369, 0.541, 0.071])
            const ca = parseColor(v.accent as string, [0.910, 0.886, 0.227])
            const chi = parseColor(v.high as string, [1.0, 1.0, 0.878])
            gl.uniform3f(u("uBg"), cg[0], cg[1], cg[2])
            gl.uniform3f(u("uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u("uAccent"), ca[0], ca[1], ca[2])
            gl.uniform3f(u("uHigh"), chi[0], chi[1], chi[2])
            gl.uniform1f(u("uScale"), v.scale as number)
            gl.uniform1f(u("uDepth"), v.depth as number)
            gl.uniform1f(u("uSwirl"), v.swirl as number)
            gl.uniform1f(u("uBands"), v.bands as number)
            gl.uniform1f(u("uAngle"), v.angle as number)
            gl.uniform1f(u("uGrain"), v.grain as number)
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

    const vig = clampN(num(vignette, 18), 0, 100) / 100

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
            {vig > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: `radial-gradient(118% 90% at 50% 50%, rgba(0,0,0,0) 36%, ${background} 100%)`,
                        opacity: vig,
                    }}
                />
            )}
        </div>
    )
}
