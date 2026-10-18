"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * CurlPool — a fluid plane of energy receding into black.
 *
 * Caustics advected by CURL noise. Curl of a scalar potential is
 * divergence-free, so the lines eddy around one another instead of all sliding
 * the same way, which is what a plain noise offset gives.
 *
 * Bloom without a render target: the emissive field is analytic, so it is simply
 * re-evaluated on a golden-angle spiral with cheaper octaves on the taps, then
 * thresholded. ACES filmic on the composite, or the bright cores clip into flat
 * white slabs instead of desaturating.
 *
 * Interaction: the pointer STIRS the pool — it injects a vortex into the
 * advection so the caustics wind around it, and the pool re-centres on it. The
 * pointer is mapped through the same perspective as the plane; left in screen
 * space the vortex sits away from the cursor on every row but one.
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
uniform vec3  uHigh;
uniform float uFlow;
uniform float uCurl;
uniform float uSwirl;
uniform float uReach;
uniform float uBloom;
uniform float uBloomR;
uniform float uBloomCut;
uniform float uExposure;
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

const float HZ = 0.42;
vec2 curl2(vec2 p){
  float e = 0.09;
  float a = fbm3(p + vec2(0.0, e));
  float b = fbm3(p - vec2(0.0, e));
  float c = fbm3(p + vec2(e, 0.0));
  float dd = fbm3(p - vec2(e, 0.0));
  return vec2(a - b, -(c - dd)) / (2.0 * e);
}
vec2 toPlane(vec2 p){
  float dep = HZ - p.y;
  float pers = 0.26 / (max(dep, 0.004) + 0.060);
  return vec2(p.x * pers * 2.4, pers * 2.0);
}
float poolE(vec2 p, float t, vec2 qc, float fine){
  float dep = HZ - p.y;
  float gate = smoothstep(-0.030, 0.018, dep);
  if (gate <= 0.0) return 0.0;
  vec2 q = toPlane(p);
  vec2 w = q;
  if (fine > 0.5) {
    w += curl2(q * 0.55 + vec2(0.0, -t * uFlow * 0.30)) * uCurl * 0.9;
    vec2 dq = q - qc;
    float dl = length(dq);
    float sw = uSwirl * exp(-dl * dl / max(uReach * uReach * 0.20, 1e-3)) * uHover;
    w += vec2(-dq.y, dq.x) * sw;
  }
  float rid = 1.0 - abs(2.0 * fbm3(w * 0.80) - 1.0);
  float web = pow(sat(rid), 6.5);
  if (fine > 0.5) {
    float r2 = 1.0 - abs(2.0 * fbm3(w * 1.7 + 5.9) - 1.0);
    web += pow(sat(r2), 9.0) * 0.5;
  }
  float r = length(vec2((q.x - qc.x) * 0.52, (q.y - qc.y) * 0.85));
  float radial = sat(1.0 - r / max(uReach, 0.2));
  return gate * web * radial * radial;
}
vec3 emit(vec2 p, float t, vec2 qc, float fine){
  float e = poolE(p, t, qc, fine);
  return mix(uBase, uHigh, sat(e * 1.4)) * e * 2.6;
}
vec3 aces(vec3 x){
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main(){
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(ar, 1.0);
  float t = uTime;
  vec2 pm = (uMouse - 0.5) * vec2(ar, 1.0);
  pm.y = min(pm.y, HZ - 0.06);
  vec2 qc = mix(toPlane(vec2(0.0, HZ - 0.34)), toPlane(pm), sat(uHover));
  vec3 hdr = emit(p, t, qc, 1.0);
  vec3 bloom = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 10; i++) {
    float fi = float(i) + 0.5;
    float ang = fi * 2.39996;
    float rad = uBloomR * 0.11 * sqrt(fi / 10.0);
    float wgt = 1.0 - fi / 11.0;
    bloom += emit(p + vec2(cos(ang), sin(ang)) * rad, t, qc, 0.0) * wgt;
    wsum += wgt;
  }
  bloom /= max(wsum, 1e-4);
  bloom = max(bloom - uBloomCut, 0.0);
  vec3 col = hdr + bloom * uBloom * 2.6;
  col *= uExposure;
  col = aces(col);
  col += uBg;
  col *= 1.0 - 0.40 * pow(sat(length((uv - 0.5) * vec2(ar * 0.8, 1.0)) * 1.35), 2.0);
  col += (h21(gl_FragCoord.xy + fract(t) * 57.0) - 0.5) * uGrain;
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
        console.error("CurlPool shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

interface FlowGroup {
    flow?: number
    curl?: number
    swirl?: number
    reach?: number
}
const FLOW_DEFAULTS: Required<FlowGroup> = { flow: 100, curl: 100, swirl: 100, reach: 100 }
interface BloomGroup {
    bloom?: number
    bloomRadius?: number
    threshold?: number
    exposure?: number
}
const BLOOM_DEFAULTS: Required<BloomGroup> = { bloom: 72, bloomRadius: 100, threshold: 22, exposure: 100 }

interface CurlPoolProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    highlight?: string
    speed?: number
    hover?: number
    grain?: number
    vignette?: number
    flow?: FlowGroup
    bloom?: BloomGroup
    width?: number
    height?: number
}

function __BaseImpl_CurlPool(props: CurlPoolProps) {
    const {
        style,
        background = "#02040A",
        baseColor = "#0059FF",
        highlight = "#CFEBFF",
        speed = 47,
        hover = 100,
        grain = 100,
        vignette = 100,
        flow,
        bloom,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const flow_ = { ...FLOW_DEFAULTS, ...(flow || {}) }
    const bloom_ = { ...BLOOM_DEFAULTS, ...(bloom || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        bg: background,
        base: baseColor,
        high: highlight,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        flow: clampN(num(flow_.flow, 100), 0, 300) / 100,
        curl: clampN(num(flow_.curl, 100), 0, 300) / 100,
        swirl: clampN(num(flow_.swirl, 100), 0, 300) / 100,
        reach: (clampN(num(flow_.reach, 100), 20, 300) / 100) * 3.2,
        bloom: clampN(num(bloom_.bloom, 72), 0, 300) / 100,
        bloomRadius: clampN(num(bloom_.bloomRadius, 100), 20, 300) / 100,
        threshold: clampN(num(bloom_.threshold, 22), 0, 100) / 100,
        exposure: clampN(num(bloom_.exposure, 100), 20, 300) / 100,
        grain: (clampN(num(grain, 12), 0, 100) / 100) * 0.09,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("CurlPool: WebGL unavailable")
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
            console.error("CurlPool link:", gl.getProgramInfoLog(prog))
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
            const cg = parseColor(v.bg as string, [0.008, 0.016, 0.039])
            const cb = parseColor(v.base as string, [0.180, 0.420, 0.784])
            const chi = parseColor(v.high as string, [0.812, 0.922, 1.0])
            gl.uniform3f(u("uBg"), cg[0], cg[1], cg[2])
            gl.uniform3f(u("uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u("uHigh"), chi[0], chi[1], chi[2])
            gl.uniform1f(u("uFlow"), v.flow as number)
            gl.uniform1f(u("uCurl"), v.curl as number)
            gl.uniform1f(u("uSwirl"), v.swirl as number)
            gl.uniform1f(u("uReach"), v.reach as number)
            gl.uniform1f(u("uBloom"), v.bloom as number)
            gl.uniform1f(u("uBloomR"), v.bloomRadius as number)
            gl.uniform1f(u("uBloomCut"), v.threshold as number)
            gl.uniform1f(u("uExposure"), v.exposure as number)
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

    const vig = clampN(num(vignette, 25), 0, 100) / 100

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

const __presetProps = {
  "background": "#02040A",
  "baseColor": "#0059FF",
  "highlight": "#CFEBFF",
  "speed": 47,
  "hover": 100,
  "grain": 100,
  "vignette": 100,
  "flow": {
    "curl": 291,
    "flow": 189,
    "reach": 300,
    "swirl": 285
  },
  "bloom": {
    "bloom": 0,
    "exposure": 20,
    "threshold": 0,
    "bloomRadius": 20
  }
};

export default function CurlPool(props: Record<string, unknown>) {
  return <__BaseImpl_CurlPool {...(__presetProps as Record<string, unknown>)} {...props} />;
}
