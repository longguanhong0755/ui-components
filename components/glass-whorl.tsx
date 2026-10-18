"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2

// Cut controls, frozen at the value they shipped at (rule 11b).
const LIGHT_ANGLE = 0.7
const GRAIN = 0.010

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
uniform vec2  uVel;
uniform vec3  uBase;
uniform vec3  uAccent;
uniform vec3  uHigh;
uniform float uSwirl;
uniform float uScale;
uniform float uDepth;
uniform float uGloss;
uniform float uAngle;
uniform float uReach;
uniform float uStir;
uniform float uBulge;
uniform float uDrag;
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

float fieldAt(vec2 p, float t, float sw, float sc, vec2 ptr, float stir, float reach) {
    float r = length(p);
    float a = atan(p.y, p.x) + sw / (r + 0.28) + t * 0.10;
    vec2 q = vec2(cos(a), sin(a)) * r;
    // Local vortex under the pointer: the field is STIRRED, not translated.
    vec2 m = q - ptr;
    float dl = length(m);
    float w = stir * exp(-dl * dl / max(reach * reach, 1e-4));
    float a2 = atan(m.y, m.x) + w * 2.6;
    q = ptr + vec2(cos(a2), sin(a2)) * dl;
    return sat(fbm5(q * sc + vec2(t * 0.04, -t * 0.03)) * 1.25
             + fbm3(q * sc * 0.55 + vec2(3.7, 1.9)) * 0.45 - 0.28);
}

void main() {
    float ar = uRes.x / max(uRes.y, 1.0);
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 p = (uv - 0.5) * vec2(ar, 1.0);
    float t = uTime;

    vec2 ptr = (uMouse - 0.5) * vec2(ar, 1.0);
    vec2 md = p - ptr;
    float dl = length(md);
    float lens = exp(-dl * dl / max(uReach * uReach, 1e-4));

    vec2 ps = p + normalize(md + 1e-5) * lens * uBulge * 0.22 * uHover;
    ps -= uVel * vec2(ar, 1.0) * lens * uDrag * 0.55;

    float stir = uStir * uHover;
    float e = 3.0 / uRes.y;
    float v  = fieldAt(ps, t, uSwirl, uScale, ptr, stir, uReach);
    float vx = fieldAt(ps + vec2(e, 0.0), t, uSwirl, uScale, ptr, stir, uReach);
    float vy = fieldAt(ps + vec2(0.0, e), t, uSwirl, uScale, ptr, stir, uReach);

    vec3 N = normalize(vec3(-(vx - v) / e * uDepth, -(vy - v) / e * uDepth, 1.0));
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 L = normalize(vec3(cos(uAngle) * 0.75, sin(uAngle) * 0.5 + 0.35, 0.70));

    float dif = sat(dot(N, L) * 0.55 + 0.55);
    float spec = pow(sat(dot(reflect(-L, N), V)), 46.0);
    float fres = pow(sat(1.0 - dot(N, V)), 2.6);

    vec3 col = mix(uBase, uAccent, sat(v * 1.6 - 0.15));
    col = mix(col, uHigh, pow(sat(1.0 - length(p) * 1.5), 2.6) * 0.45);
    col *= 0.60 + 0.62 * dif;
    col = mix(col, mix(col, vec3(1.0), 0.65), fres * 0.45 * uGloss);
    col += vec3(1.0) * spec * 0.55 * uGloss;
    // The lens has an edge, the way a real glass boss does.
    col += vec3(1.0) * exp(-pow((dl - uReach) / (uReach * 0.22), 2.0)) * 0.16 * uHover * uBulge;
    col += (h21(gl_FragCoord.xy + fract(uTime) * 77.0) - 0.5) * uGrain;

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
        console.error("GlassWhorl shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

interface GlassGroup {
    swirl?: number
    scale?: number
    depth?: number
    gloss?: number
}
const GLASS_DEFAULTS: Required<GlassGroup> = { swirl: 110, scale: 140, depth: 30, gloss: 100 }
interface PointerGroup {
    reach?: number
    stir?: number
    bulge?: number
    drag?: number
}
const POINTER_DEFAULTS: Required<PointerGroup> = { reach: 34, stir: 100, bulge: 100, drag: 100 }

interface GlassWhorlProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    accentColor?: string
    highlight?: string
    speed?: number
    hover?: number
    glass?: GlassGroup
    pointer?: PointerGroup
    width?: number
    height?: number
}

function __BaseImpl_GlassWhorl(props: GlassWhorlProps) {
    const {
        style,
        background = "#9CD3EF",
        baseColor = "#000D16",
        accentColor = "#A42EFF",
        highlight = "#4FD8F0",
        speed = 45,
        hover = 65,
        glass,
        pointer,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const glass_ = { ...GLASS_DEFAULTS, ...(glass || {}) }
    const pointer_ = { ...POINTER_DEFAULTS, ...(pointer || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        base: baseColor,
        accent: accentColor,
        high: highlight,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        swirl: clampN(num(glass_.swirl, 110), 0, 300) / 100,
        scale: clampN(num(glass_.scale, 140), 30, 400) / 100,
        depth: clampN(num(glass_.depth, 30), 5, 200) / 100,
        gloss: clampN(num(glass_.gloss, 100), 0, 200) / 100,
        reach: clampN(num(pointer_.reach, 34), 5, 100) / 100,
        stir: clampN(num(pointer_.stir, 100), 0, 300) / 100,
        bulge: clampN(num(pointer_.bulge, 100), 0, 300) / 100,
        drag: clampN(num(pointer_.drag, 100), 0, 300) / 100,
    }

    const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0, vx: 0, vy: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
        if (!gl) {
            console.error("GlassWhorl: WebGL unavailable")
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
            console.error("GlassWhorl link:", gl.getProgramInfoLog(prog))
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
            ptr.vx += ((ptr.tx - ptr.x) * 6 - ptr.vx) * k
            ptr.vy += ((ptr.ty - ptr.y) * 6 - ptr.vy) * k
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
            gl.uniform2f(u("uVel"), ptr.vx, ptr.vy)
            const cb = parseColor(v.base as string, [0.373, 0.749, 0.227])
            const ca = parseColor(v.accent as string, [0.941, 0.569, 0.169])
            const ch2 = parseColor(v.high as string, [1.0, 0.878, 0.478])
            gl.uniform3f(u("uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u("uAccent"), ca[0], ca[1], ca[2])
            gl.uniform3f(u("uHigh"), ch2[0], ch2[1], ch2[2])
            gl.uniform1f(u("uSwirl"), v.swirl as number)
            gl.uniform1f(u("uScale"), v.scale as number)
            gl.uniform1f(u("uDepth"), v.depth as number)
            gl.uniform1f(u("uGloss"), v.gloss as number)
            gl.uniform1f(u("uAngle"), LIGHT_ANGLE)
            gl.uniform1f(u("uReach"), v.reach as number)
            gl.uniform1f(u("uStir"), v.stir as number)
            gl.uniform1f(u("uBulge"), v.bulge as number)
            gl.uniform1f(u("uDrag"), v.drag as number)
            gl.uniform1f(u("uGrain"), GRAIN)
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
  "background": "#9CD3EF",
  "baseColor": "#000D16",
  "accentColor": "#C12EFF",
  "highlight": "#4FD8F0",
  "speed": 45,
  "hover": 65,
  "glass": {
    "depth": 28,
    "gloss": 200,
    "scale": 367,
    "swirl": 271
  },
  "pointer": {
    "drag": 110,
    "stir": 167,
    "bulge": 46,
    "reach": 20
  }
};

export default function GlassWhorl(props: Record<string, unknown>) {
  return <__BaseImpl_GlassWhorl {...(__presetProps as Record<string, unknown>)} {...props} />;
}
