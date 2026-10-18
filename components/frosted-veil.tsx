"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * FrostedVeil — light behind a rank of parallel frosted panels.
 *
 * Not an aurora: the bands are PANELS. Each slat samples the light field at
 * its own lateral shift and blurs it over five taps, so the field breaks at
 * every boundary — that per-panel discontinuity is what reads as ground glass,
 * and no amount of smooth column noise produces it.
 *
 * Interaction: the pointer wipes a clear patch through the frost, revealing
 * the light field beneath rather than panning the whole rank.
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
uniform float uSlats;
uniform float uFrost;
uniform float uRefract;
uniform float uEdge;
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

vec3 behind(vec2 uv, float t) {
    float a = fbm5(vec2(uv.x * 3.2, t * 0.05));
    float b = fbm3(vec2(uv.x * 9.0 + 4.1, t * 0.07));
    float prof = exp(-pow((uv.y - 0.52) / 0.42, 2.0));
    float amber = sat((b - 0.62) * 4.0) * sat(a * 1.5 - 0.30);
    vec3 c = mix(uBase, uAccent, sat(a * 1.5 - 0.20));
    c = mix(c, uHigh, amber * 0.85);
    return c * prof * (0.35 + 1.25 * pow(sat(a * 1.2 + b * 0.5 - 0.32), 1.4));
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float t = uTime;

    float warp = 0.05 * fbm3(vec2(uv.x * 2.2, 7.0));
    float sx = (uv.x + warp) * uSlats;
    float si = floor(sx), sf = fract(sx);
    float rnd = h21(vec2(si * 0.317, 1.0));
    float rnd2 = h21(vec2(si * 0.713, 5.0));

    float shift = (rnd - 0.5) * uRefract * 0.10;
    vec3 lit = behind(vec2(uv.x + shift, uv.y), t);

    vec3 soft = vec3(0.0);
    for (int k = 0; k < 5; k++) {
        float o = (float(k) - 2.0) * uFrost * 0.020;
        soft += behind(vec2(uv.x + shift + o, uv.y + o * 0.4), t);
    }
    soft *= 0.2;

    vec2 wd = uv - uMouse;
    wd.x *= uRes.x / uRes.y;
    float wipe = uHover * exp(-dot(wd, wd) * 8.0);

    vec3 col = uBg + mix(lit, soft, clamp(0.80 - wipe, 0.0, 0.80)) * (0.55 + 0.85 * rnd2);
    col *= 1.0 + wipe * 0.22;

    float edge = min(sf, 1.0 - sf);
    col += mix(uAccent, vec3(1.0), 0.35) * exp(-edge / 0.030) * 0.30 * uEdge;
    col *= 0.86 + 0.28 * smoothstep(0.0, 0.20, edge);
    col *= 1.0 - 0.40 * pow(sat(abs(uv.y - 0.5) * 2.0), 2.4);
    col += (h21(gl_FragCoord.xy + fract(uTime) * 37.0) - 0.5) * uGrain;

    gl_FragColor = vec4(max(col, 0.0), 1.0);
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
        console.error("FrostedVeil shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

type VeilGroup = { slats?: number; frost?: number; refraction?: number; edge?: number }
const VEIL_DEFAULTS: Required<VeilGroup> = { slats: 16, frost: 100, refraction: 100, edge: 100 }

interface FrostedVeilProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    accentColor?: string
    highlight?: string
    speed?: number
    hover?: number
    grain?: number
    vignette?: number
    veil?: VeilGroup
    width?: number
    height?: number
}

export default function FrostedVeil(props: FrostedVeilProps) {
    const {
        style,
        background = "#000000",
        baseColor = "#000D16",
        accentColor = "#FFC400",
        highlight = "#FFFFFF",
        speed = 100,
        hover = 200,
        grain = 100,
        vignette = 100,
        veil,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const veil_ = { ...VEIL_DEFAULTS, ...(veil || {}) }

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
        slats: clampN(num(veil_.slats, 16), 3, 60),
        frost: clampN(num(veil_.frost, 100), 0, 300) / 100,
        refraction: clampN(num(veil_.refraction, 100), 0, 300) / 100,
        edge: clampN(num(veil_.edge, 100), 0, 300) / 100,
        grain: (clampN(num(grain, 20), 0, 100) / 100) * 0.09,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("FrostedVeil: WebGL unavailable")
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
            console.error("FrostedVeil link:", gl.getProgramInfoLog(prog))
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
            const cg = parseColor(v.bg as string, [0.031, 0.016, 0.055])
            const cb = parseColor(v.base as string, [0.478, 0.173, 0.878])
            const ca = parseColor(v.accent as string, [0.886, 0.294, 0.784])
            const ch2 = parseColor(v.high as string, [1.0, 0.62, 0.239])
            gl.uniform3f(u("uBg"), cg[0], cg[1], cg[2])
            gl.uniform3f(u("uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u("uAccent"), ca[0], ca[1], ca[2])
            gl.uniform3f(u("uHigh"), ch2[0], ch2[1], ch2[2])
            gl.uniform1f(u("uSlats"), v.slats as number)
            gl.uniform1f(u("uFrost"), v.frost as number)
            gl.uniform1f(u("uRefract"), v.refraction as number)
            gl.uniform1f(u("uEdge"), v.edge as number)
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

    const vig = clampN(num(vignette, 30), 0, 100) / 100

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
