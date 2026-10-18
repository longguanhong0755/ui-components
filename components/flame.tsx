"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2

// Halftone cell, frozen: the dial is the MIX, not the pitch (rule 11b).
const HALFTONE_CELL = 7.0

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
uniform float uLean;
uniform float uIntensity;
uniform float uHalftone;
uniform float uCell;

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

void main() {
    float ar = uRes.x / max(uRes.y, 1.0);
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 p = (uv - 0.5) * vec2(ar, 1.0);
    float t = uTime;

    // hRaw is deliberately NOT saturated: above the flame top hgt is pinned at
    // 1 and can no longer describe "how far past the top", which is exactly
    // where the support masks below have to keep fading.
    float hRaw = (p.y + 0.5) / max(uHeight, 0.05);
    float hgt = sat(hRaw);
    vec2 q = p;
    q.y -= t * uRise * 0.55;
    q.x += uLean * (0.22 * sin(p.y * 2.4 - t * 1.1) + 0.10 * sin(p.y * 5.3 + t * 0.7)) * hgt;

    vec2 md = (uv - uMouse) * vec2(ar, 1.0);
    q.x -= (uMouse.x - 0.5) * 1.1 * uHover * hgt;

    float n = fbm5(vec2(q.x * 2.4, q.y * 1.05));
    n += 0.42 * fbm3(vec2(q.x * 7.5, q.y * 2.8 - t * 1.1));
    n += 0.16 * fbm3(vec2(q.x * 17.0, q.y * 5.5 - t * 1.9));

    float wid = uWidth * (0.34 - 0.27 * hgt);
    float shape = exp(-pow(p.x / max(wid, 0.02), 2.0));
    float tall = 1.0 - smoothstep(0.05, 1.0, hgt);
    float plume = shape * tall;

    // The noise is ADDED, so a noise peak clears the threshold on its own
    // wherever the envelope has died. At the default Height the flame top sits
    // off-frame and it never shows; reduce Height and the whole upper frame is
    // envelope-free, so every peak up there lights as a lump detached from the
    // flame. supN is a generous support — wide enough that the noise still
    // carves the silhouette at full amplitude inside it (multiplying the noise
    // itself would give back the smooth cone), zero out in open air.
    float supN = exp(-pow(p.x / max(wid * 2.2, 0.05), 2.0)) * (1.0 - smoothstep(0.55, 1.12, hRaw));

    // The flare is gated by the flame's PRESENCE, not by shape. shape is the
    // height-narrowed width, so it sliced the glow off along the Height line:
    // as the pointer crossed the flame top the flare collapsed from full width
    // to nothing over a few pixels. supG holds the base width at every height
    // and fades out above the tip instead.
    float supG = exp(-pow(p.x / max(uWidth * 0.34, 0.06), 2.0)) * (1.0 - smoothstep(0.80, 1.55, hRaw));

    float v = sat((plume * 1.85 + (n - 0.52) * 1.55 - 0.68) * 2.8) * supN;
    v += uHover * 0.25 * exp(-dot(md, md) / 0.010) * supG;
    v = sat(v * uIntensity);

    vec3 col = uBg;
    col += uBase * smoothstep(0.02, 0.30, v);
    col = mix(col, uAccent, smoothstep(0.24, 0.62, v));
    col = mix(col, uHigh, smoothstep(0.58, 0.92, v));
    col += mix(uBase, uAccent, 0.5) * pow(sat(v), 2.2) * 0.22;
    col += uAccent * exp(-pow(length((p - vec2(0.0, -0.42)) * vec2(0.85, 1.5)) / 0.42, 2.0)) * 0.10;

    float cellPx = max(3.0, uCell);
    vec2 gf = fract(gl_FragCoord.xy / cellPx);
    float rad = sqrt(sat(v)) * 0.62;
    float dot0 = 1.0 - smoothstep(rad - 1.2 / cellPx, rad + 1.2 / cellPx, length(gf - 0.5));
    col = mix(col, col * (0.35 + 0.95 * dot0), uHalftone);

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
        console.error("Flame shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

interface FlameGroup {
    flameHeight?: number
    flameWidth?: number
    rise?: number
    lean?: number
    intensity?: number
}
const FLAME_DEFAULTS: Required<FlameGroup> = { flameHeight: 115, flameWidth: 100, rise: 100, lean: 100, intensity: 100 }

interface FlameProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    accentColor?: string
    highlight?: string
    speed?: number
    halftone?: number
    hover?: number
    flame?: FlameGroup
    width?: number
    height?: number
}

export default function Flame(props: FlameProps) {
    const {
        style,
        background = "#07050A",
        baseColor = "#8A1F08",
        accentColor = "#F0762A",
        highlight = "#FFE7B0",
        speed = 51,
        halftone = 0,
        hover = 100,
        flame,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const flame_ = { ...FLAME_DEFAULTS, ...(flame || {}) }

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
        flameHeight: clampN(num(flame_.flameHeight, 115), 40, 300) / 100,
        flameWidth: clampN(num(flame_.flameWidth, 100), 20, 300) / 100,
        rise: clampN(num(flame_.rise, 100), 0, 300) / 100,
        lean: clampN(num(flame_.lean, 100), 0, 300) / 100,
        intensity: clampN(num(flame_.intensity, 100), 20, 300) / 100,
        halftone: clampN(num(halftone, 18), 0, 100) / 100,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("Flame: WebGL unavailable")
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
            console.error("Flame link:", gl.getProgramInfoLog(prog))
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
            const cg = parseColor(v.bg as string, [0.027, 0.02, 0.039])
            const cb = parseColor(v.base as string, [0.541, 0.122, 0.031])
            const ca = parseColor(v.accent as string, [0.941, 0.463, 0.165])
            const ch2 = parseColor(v.high as string, [1.0, 0.906, 0.69])
            gl.uniform3f(u("uBg"), cg[0], cg[1], cg[2])
            gl.uniform3f(u("uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u("uAccent"), ca[0], ca[1], ca[2])
            gl.uniform3f(u("uHigh"), ch2[0], ch2[1], ch2[2])
            gl.uniform1f(u("uHeight"), v.flameHeight as number)
            gl.uniform1f(u("uWidth"), v.flameWidth as number)
            gl.uniform1f(u("uRise"), v.rise as number)
            gl.uniform1f(u("uLean"), v.lean as number)
            gl.uniform1f(u("uIntensity"), v.intensity as number)
            gl.uniform1f(u("uHalftone"), v.halftone as number)
            gl.uniform1f(u("uCell"), HALFTONE_CELL)
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
