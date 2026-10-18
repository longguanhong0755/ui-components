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
uniform vec3 uPulse[6];
uniform float uSpread, uSoft, uLife, uGlow;

void main(){
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(ar, 1.0);
  float acc = 0.0;
  for(int i = 0; i < 6; i++){
    vec3 pu = uPulse[i];
    float age = uTime - pu.z;
    float ph = age / max(uLife, 0.1);
    float valid = step(0.0, age) * step(ph, 1.0);
    float phc = clamp(ph, 0.0, 1.0);
    float r = length(p - pu.xy);
    float w = uSoft * (0.013 + 0.26 * phc);
    float amp = pw(1.0 - phc, 1.5) * 0.80;
    acc += exp(-pw(abs(r - phc * uSpread) / w, 2.0)) * amp * valid;
  }
  vec3 col = uBg;
  col += mix(uBase, uAccent, sat(acc * 0.90)) * acc * uGlow * 1.65;
  col += uHigh * pw(sat(acc - 0.26), 2.0) * 1.00;
  float hv = sat(uHover);
  vec2 src = vec2(mix(0.0, (uMouse.x - 0.5) * ar, hv), mix(-0.58, uMouse.y - 0.5, hv));
  float sd = length(p - src);
  col += uAccent * exp(-sd * sd * 5.5) * 0.22 * uGlow;
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
        console.error("SonarBloom shader:", gl.getShaderInfoLog(sh))
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

type WaveGroup = { spread?: number; softness?: number; life?: number; glow?: number }
const WAVE_DEFAULTS: Required<WaveGroup> = { spread: 160, softness: 100, life: 6, glow: 100 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    highlight?: string
    speed?: number
    hover?: number
    grain?: number
    vignette?: number
    wave?: WaveGroup
}

export default function SonarBloom(props: Props) {
    const {
        style,
        background = "#000308",
        baseColor = "#1E44C8",
        accentColor = "#7CA8FF",
        highlight = "#DDE8FF",
        speed = 23,
        hover = 200,
        grain = 0,
        vignette = 0,
        wave,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const wave_ = { ...WAVE_DEFAULTS, ...(wave || {}) }

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
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        grain: (clampN(num(grain, 10), 0, 100) / 100) * 0.05,
        vignette: clampN(num(vignette, 38), 0, 100) / 100,
        spread: clampN(num(wave_.spread, 160), 40, 300) / 100,
        softness: clampN(num(wave_.softness, 100), 20, 300) / 100,
        life: clampN(num(wave_.life, 6), 2, 14),
        glow: clampN(num(wave_.glow, 100), 0, 300) / 100,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 })
    // Each ring is frozen at birth: (x, y, birthTime). Sharing one moving centre
    // is what makes a cursor-driven ripple snap.
    const pulseRef = useRef({ data: new Float32Array(18), next: 0, last: 0, seeded: false, prev: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("SonarBloom: WebGL unavailable")
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
            console.error("SonarBloom link:", gl.getProgramInfoLog(prog))
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
            const c_uBg = parseColor(v.background as string, [0.0, 0.012, 0.031])
            gl.uniform3f(u("uBg"), c_uBg[0], c_uBg[1], c_uBg[2])
            const c_uBase = parseColor(v.baseColor as string, [0.118, 0.267, 0.784])
            gl.uniform3f(u("uBase"), c_uBase[0], c_uBase[1], c_uBase[2])
            const c_uAccent = parseColor(v.accentColor as string, [0.486, 0.659, 1.0])
            gl.uniform3f(u("uAccent"), c_uAccent[0], c_uAccent[1], c_uAccent[2])
            const c_uHigh = parseColor(v.highlight as string, [0.867, 0.91, 1.0])
            gl.uniform3f(u("uHigh"), c_uHigh[0], c_uHigh[1], c_uHigh[2])
            gl.uniform1f(u("uSpread"), v.spread as number)
            gl.uniform1f(u("uSoft"), v.softness as number)
            gl.uniform1f(u("uLife"), v.life as number)
            gl.uniform1f(u("uGlow"), v.glow as number)

            const pl = pulseRef.current
            const life = v.life as number
            const iv = life / 6
            if (!pl.seeded) {
                for (let i = 0; i < 6; i++) {
                    pl.data[i * 3] = 0
                    pl.data[i * 3 + 1] = -0.58
                    pl.data[i * 3 + 2] = -(5 - i) * iv
                }
                pl.seeded = true
            }
            // The clock wraps at 3600s; carry the birth times with it or every
            // ring in flight is suddenly a full wrap old and pops out at once.
            if (clock < pl.prev) {
                for (let i = 0; i < 6; i++) pl.data[i * 3 + 2] -= 3600
                pl.last -= 3600
            }
            pl.prev = clock
            const hv = Math.min(1, ptr.on) * Math.min(1, v.hover as number)
            const cx = (ptr.x - 0.5) * (bw / Math.max(bh, 1)) * hv
            const cy = -0.58 * (1 - hv) + (1 - ptr.y - 0.5) * hv
            if (clock - pl.last > life * 2) pl.last = clock - iv
            while (clock - pl.last >= iv) {
                pl.last += iv
                const o = pl.next * 3
                pl.data[o] = cx
                pl.data[o + 1] = cy
                pl.data[o + 2] = pl.last
                pl.next = (pl.next + 1) % 6
            }
            gl.uniform3fv(u("uPulse[0]"), pl.data)

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

    const vig = clampN(num(vignette, 38), 0, 100) / 100

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
