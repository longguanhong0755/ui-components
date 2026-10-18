"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 1.5 // noise-heavy; a quality tier is not a design control (rule 10)

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
uniform int   uStyle;      // 0 = satin, 1 = smear, 2 = paint
uniform vec3  uBg;
uniform vec3  uBase;
uniform vec3  uAccent;
uniform float uScale;
uniform float uWarp;
uniform float uAniso;
uniform float uAngle;      // radians
uniform float uBlur;
uniform float uBandFreq;
uniform float uSheen;
uniform float uGrain;
uniform float uVignette;
uniform vec2  uFlow;       // decaying pointer velocity

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float vn2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x),
               mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
        v += a * vn2(p);
        p = p * 2.03 + vec2(37.1, 17.7);
        a *= 0.5;
    }
    return v / 0.875; // normalise to ~0..1 so the colour stops mean one thing
}

// Curl of a single-octave field. One octave is enough to stir paint and keeps
// the advection loop affordable (4 samples per iteration, not 12).
vec2 curl2(vec2 p) {
    float e = 0.09;
    float n1 = vn2(p + vec2(0.0, e));
    float n2 = vn2(p - vec2(0.0, e));
    float n3 = vn2(p + vec2(e, 0.0));
    float n4 = vn2(p - vec2(e, 0.0));
    return vec2(n1 - n2, n4 - n3) / (2.0 * e);
}

vec2 warpCoord(vec2 p, float t) {
    float ca = cos(uAngle), sa = sin(uAngle);
    vec2 q = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca) * uScale;
    q.x *= uAniso;
    // One direction for the whole pattern: rigid translation, not per-term time.
    vec2 drift = vec2(0.0, -t * 0.35);
    float n1 = fbm3(q + drift) - 0.5;
    float n2 = fbm3(q + uWarp * vec2(n1, n1 * 0.7) + drift * 1.3) - 0.5;
    return q + uWarp * vec2(n2 * 1.4, -n2) + drift * 0.8;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / uRes.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    float t = uTime;

    vec2 pp = p;
    if (uStyle == 0) pp += uFlow * 0.14; // drag the cloth
    if (uStyle == 2) pp += uFlow * 0.10;

    vec2 q = warpCoord(pp, t);

    if (uStyle == 2) {
        for (int i = 0; i < 2; i++) {
            q += curl2(q * 0.6 + float(i) * 3.1) * 0.22 * uWarp;
        }
        q += uFlow * 0.45 * uScale;
    }

    vec2 bdir = normalize(vec2(1.0, 0.18) + uFlow * 2.0);
    // Velocity gain 3.0, not 0.9: at the lower gain a full flick moved the blur
    // length by 0.17 of a unit and the gesture that DEFINES Smear was invisible.
    float blen = uBlur * (0.35 + 3.0 * length(uFlow)) * uScale;
    float f = 0.0;
    for (int i = 0; i < 5; i++) {
        f += fbm3(q + bdir * ((float(i) / 4.0 - 0.5) * blen));
    }
    f *= 0.2;
    // Averaging 5 taps shrinks the field's variance toward 0.5, so at high
    // Blur the upper colour stop stopped being reached at all and Accent
    // Color went dead. Re-expand about the midpoint by the same amount.
    f = clamp((f - 0.5) * (1.0 + uBlur * 1.2) + 0.5, 0.0, 1.0);

    vec3 col;
    if (uStyle == 0) {
        float ca = cos(uAngle), sa = sin(uAngle);
        float ruling = dot(p, vec2(ca, sa));
        // The RULING makes the bands; the field only phase-shifts them by up to
        // half a period. Multiplying the field by a full 2PI let the noise run
        // through several periods per band, which is why this read as smoke
        // rather than cloth.
        float band = 0.5 + 0.5 * sin(ruling * uBandFreq + (f - 0.5) * 2.2);
        col = mix(uBg, uBase, band);
        col += uAccent * pow(clamp(band, 0.0, 1.0), 3.0) * uSheen;
    } else {
        col = mix(uBg, uBase, smoothstep(0.28, 0.78, f));
        col = mix(col, uAccent, smoothstep(0.58, 0.95, f));
    }

    vec2 vc = uv - 0.5;
    vc.x *= aspect;
    col *= 1.0 - uVignette * smoothstep(0.32, 0.95, length(vc));

    float rnd = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (rnd - 0.5) * (uGrain * 0.10 + 1.5 / 255.0);

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

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("FlowField shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

type FieldGroup = { scale?: number; warp?: number; anisotropy?: number; angle?: number }
type BandsGroup = { frequency?: number; sheen?: number }
type FinishGroup = { blur?: number; grain?: number; vignette?: number }

export interface FlowFieldProps {
    style?: React.CSSProperties
    variant?: "satin" | "smear" | "paint"
    background?: string
    baseColor?: string
    accentColor?: string
    speed?: number
    hover?: number
    field?: FieldGroup
    bands?: BandsGroup
    finish?: FinishGroup
    width?: number
    height?: number
}

const D_FIELD: Required<FieldGroup> = { scale: 95, warp: 55, anisotropy: 300, angle: 40 }
const D_BANDS: Required<BandsGroup> = { frequency: 9, sheen: 35 }
const D_FINISH: Required<FinishGroup> = { blur: 20, grain: 18, vignette: 30 }

export default function FlowField(props: FlowFieldProps) {
    const {
        style,
        variant = "satin",
        background = "#0A1330",
        baseColor = "#3E77D8",
        accentColor = "#BBD4FF",
        speed = 100,
        hover = 10,
        field,
        bands,
        finish,
        width,
        height,
    } = props

    const F = { ...D_FIELD, ...(field ?? {}) }
    const B = { ...D_BANDS, ...(bands ?? {}) }
    const N = { ...D_FINISH, ...(finish ?? {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)

    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const vRef = useRef({
        style: 0,
        bg: [0, 0, 0] as [number, number, number],
        base: [0, 0, 0] as [number, number, number],
        accent: [0, 0, 0] as [number, number, number],
        speed: 1,
        hover: 1,
        scale: 1.8,
        warp: 1.2,
        aniso: 2.2,
        angle: 40,
        blur: 0.2,
        bandFreq: 14,
        sheen: 0.45,
        grain: 0.18,
        vignette: 0.3,
    })
    vRef.current = {
        style: variant === "smear" ? 1 : variant === "paint" ? 2 : 0,
        bg: parseColor(background, [0.039, 0.075, 0.188]),
        base: parseColor(baseColor, [0.243, 0.467, 0.847]),
        accent: parseColor(accentColor, [0.73, 0.83, 1]),
        speed: num(speed, 50) / 50,
        hover: num(hover, 100) / 100,
        scale: num(F.scale, 95) / 100,
        warp: num(F.warp, 55) / 100,
        aniso: num(F.anisotropy, 300) / 100,
        angle: num(F.angle, 40),
        blur: num(N.blur, 20) / 100,
        bandFreq: num(B.frequency, 9),
        sheen: num(B.sheen, 35) / 100,
        grain: num(N.grain, 18) / 100,
        vignette: num(N.vignette, 30) / 100,
    }

    // Pointer VELOCITY, decaying. Position alone would pin the effect to wherever
    // the pointer last stopped; velocity means a still pointer leaves the field
    // at rest, which is what "smear" has to mean.
    const flowRef = useRef({ x: 0, y: 0, px: 0, py: 0, has: false })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false })
        if (!gl) {
            console.error("FlowField: WebGL unavailable")
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
            console.error("FlowField link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const posLoc = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        const u = {
            res: gl.getUniformLocation(prog, "uRes"),
            time: gl.getUniformLocation(prog, "uTime"),
            style: gl.getUniformLocation(prog, "uStyle"),
            bg: gl.getUniformLocation(prog, "uBg"),
            base: gl.getUniformLocation(prog, "uBase"),
            accent: gl.getUniformLocation(prog, "uAccent"),
            scale: gl.getUniformLocation(prog, "uScale"),
            warp: gl.getUniformLocation(prog, "uWarp"),
            aniso: gl.getUniformLocation(prog, "uAniso"),
            angle: gl.getUniformLocation(prog, "uAngle"),
            blur: gl.getUniformLocation(prog, "uBlur"),
            bandFreq: gl.getUniformLocation(prog, "uBandFreq"),
            sheen: gl.getUniformLocation(prog, "uSheen"),
            grain: gl.getUniformLocation(prog, "uGrain"),
            vignette: gl.getUniformLocation(prog, "uVignette"),
            flow: gl.getUniformLocation(prog, "uFlow"),
        }

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            clock = (clock + dt * v.speed) % 3600

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
                gl.viewport(0, 0, bw, bh)
            }

            // dt-correct decay back to rest.
            const fl = flowRef.current
            const decay = Math.exp(-3.2 * dt)
            fl.x *= decay
            fl.y *= decay

            gl.uniform2f(u.res, bw, bh)
            gl.uniform1f(u.time, clock)
            gl.uniform1i(u.style, v.style)
            gl.uniform3f(u.bg, v.bg[0], v.bg[1], v.bg[2])
            gl.uniform3f(u.base, v.base[0], v.base[1], v.base[2])
            gl.uniform3f(u.accent, v.accent[0], v.accent[1], v.accent[2])
            gl.uniform1f(u.scale, v.scale)
            gl.uniform1f(u.warp, v.warp)
            gl.uniform1f(u.aniso, v.aniso)
            gl.uniform1f(u.angle, v.angle * (Math.PI / 180))
            gl.uniform1f(u.blur, v.blur)
            gl.uniform1f(u.bandFreq, v.bandFreq)
            gl.uniform1f(u.sheen, v.sheen)
            gl.uniform1f(u.grain, v.grain)
            gl.uniform1f(u.vignette, v.vignette)
            gl.uniform2f(u.flow, fl.x * v.hover, fl.y * v.hover)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        const onMove = (e: PointerEvent) => {
            // Scale the client delta back to layout px: getBoundingClientRect
            // carries the Framer canvas zoom, offsetWidth does not.
            const r = canvas.getBoundingClientRect()
            const ow = canvas.offsetWidth || 1
            const oh = canvas.offsetHeight || 1
            const sx = r.width > 0 ? ow / r.width : 1
            const sy = r.height > 0 ? oh / r.height : 1
            const x = ((e.clientX - r.left) * sx) / ow
            const y = ((e.clientY - r.top) * sy) / oh
            const fl = flowRef.current
            if (fl.has) {
                // Accumulate, clamped: a flick must not send the field to NaN-land.
                fl.x = Math.max(-1.5, Math.min(1.5, fl.x + (x - fl.px) * 6))
                fl.y = Math.max(-1.5, Math.min(1.5, fl.y - (y - fl.py) * 6))
            }
            fl.px = x
            fl.py = y
            fl.has = true
        }
        const onLeave = () => {
            flowRef.current.has = false
        }

        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerleave", onLeave)
        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", onMove)
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
