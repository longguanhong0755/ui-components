"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const GRAIN = 0.12
const VIGNETTE = 0.28

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
uniform float uGrain;

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
float grainAt(vec2 fc, float t){ return hash21(fc * 0.77 + fract(t) * 41.0) - 0.5; }

uniform vec3 uBg, uBase, uAccent, uHigh;
uniform float uBeams, uWidth, uSpread, uFan, uPluck, uReach;
uniform float uAngle;   // radians; the bundle's own direction

const float SPAN = 0.55;

void main(){
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p0 = (uv - 0.5) * vec2(ar, 1.0);
  float t = uTime;
  vec2 m0 = (uMouse - 0.5) * vec2(ar, 1.0);

  float ca = cos(uAngle), sa = sin(uAngle);
  vec2 p = vec2(p0.x * ca + p0.y * sa, -p0.x * sa + p0.y * ca);
  vec2 m = vec2(m0.x * ca + m0.y * sa, -m0.x * sa + m0.y * ca);
  float hv = sat(uHover);
  float core = 0.0, halo = 0.0;
  for(int i = 0; i < 50; i++){
    float fi = float(i);
    float f = fi / 49.0;
    float on = sat(uBeams - fi);
    float amp = 0.05 + 0.11 * hash21(vec2(fi, 4.4));
    float kk = 0.85 + 1.70 * hash21(vec2(fi, 9.1));
    float ph = fi * 1.7 + t * 0.30;
    float sl0 = tan(clamp((f - 0.5) * uFan * 0.62, -1.2, 1.2));
    float off = 0.03 + (f - 0.5) * uSpread * 0.55;
    float ycm = off + sl0 * m.x + amp * sin(m.x * kk + ph);
    float dm = m.y - ycm;
    float near = exp(-dm * dm / max(uReach * uReach, 1e-4));
    float dx2 = p.x - m.x;
    float along = exp(-dx2 * dx2 / (SPAN * SPAN));
    float wave = uPluck * hv * near * dm * along * cos(abs(dx2) * 10.0 - t * 5.0);
    float yc = off + sl0 * p.x + amp * sin(p.x * kk + ph) + wave;
    float sl = sl0 + amp * kk * cos(p.x * kk + ph);
    float dd = abs(p.y - yc) / sqrt(1.0 + sl * sl);
    float w = uWidth * (0.0022 + 0.0080 * hash21(vec2(fi, 2.2)));
    core += on * pw(w / (w + dd), 2.6);
    halo += on * pw(w * 22.0 / (w * 22.0 + dd), 1.8) * 0.105;
  }
  vec3 col = mix(uBg, uBg * 2.0 + vec3(0.006), sat(uv.y * 0.85 + 0.10));
  col += uBase * halo * 1.2;
  col += mix(uAccent, uHigh, sat(core * 0.80)) * core * 1.3;
  col += grainAt(gl_FragCoord.xy, uTime) * uGrain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("BeamSweep shader:", gl.getShaderInfoLog(sh))
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

interface BeamGroup {
    angle?: number
    beamWidth?: number
    spread?: number
    fan?: number
    pluck?: number
}
const BEAM_DEFAULTS: Required<BeamGroup> = { angle: -23, beamWidth: 190, spread: 115, fan: 100, pluck: 120 }

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
    reach?: number
    beam?: BeamGroup
}

export default function BeamSweep(props: Props) {
    const {
        style,
        background = "#030814",
        baseColor = "#12409E",
        accentColor = "#7FD2FF",
        highlight = "#FFFFFF",
        density = 50,
        speed = 100,
        hover = 100,
        reach = 23,
        beam,
        width,
        height,
    } = props

    const beam_ = { ...BEAM_DEFAULTS, ...(beam || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        background: background,
        baseColor: baseColor,
        accentColor: accentColor,
        highlight: highlight,
        density: clampN(num(density, 50), 1, 50),
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        reach: clampN(num(reach, 16), 2, 60) / 100,
        grain: GRAIN * 0.05,
        angle: clampN(num(beam_.angle, -23), -90, 90),
        beamWidth: clampN(num(beam_.beamWidth, 190), 20, 500) / 100,
        spread: clampN(num(beam_.spread, 115), 0, 300) / 100,
        fan: clampN(num(beam_.fan, 100), 0, 300) / 100,
        pluck: clampN(num(beam_.pluck, 120), 0, 300) / 100,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("BeamSweep: WebGL unavailable")
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
            console.error("BeamSweep link:", gl.getProgramInfoLog(prog))
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
            gl.uniform1f(u("uGrain"), v.grain as number)
            const c_uBg = parseColor(v.background as string, [0.012, 0.031, 0.078])
            gl.uniform3f(u("uBg"), c_uBg[0], c_uBg[1], c_uBg[2])
            const c_uBase = parseColor(v.baseColor as string, [0.071, 0.251, 0.62])
            gl.uniform3f(u("uBase"), c_uBase[0], c_uBase[1], c_uBase[2])
            const c_uAccent = parseColor(v.accentColor as string, [0.498, 0.824, 1.0])
            gl.uniform3f(u("uAccent"), c_uAccent[0], c_uAccent[1], c_uAccent[2])
            const c_uHigh = parseColor(v.highlight as string, [1.0, 1.0, 1.0])
            gl.uniform3f(u("uHigh"), c_uHigh[0], c_uHigh[1], c_uHigh[2])
            gl.uniform1f(u("uBeams"), v.density as number)
            gl.uniform1f(u("uReach"), v.reach as number)
            gl.uniform1f(u("uWidth"), v.beamWidth as number)
            gl.uniform1f(u("uSpread"), v.spread as number)
            gl.uniform1f(u("uAngle"), ((v.angle as number) * Math.PI) / 180)
            gl.uniform1f(u("uFan"), v.fan as number)
            gl.uniform1f(u("uPluck"), v.pluck as number)

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

    const vig = VIGNETTE

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
