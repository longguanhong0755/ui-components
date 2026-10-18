"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * PredictiveArcHorizonHorizon — the PredictiveArcHorizon dot field bent round a planet's
 * horizon: a circular arc whose crest sits in the frame and whose centre lies
 * far below it, glowing mostly OUTWARD, with ripples running out from the
 * centre so the atmosphere pulses.
 *
 * Variation 1 of 3 on 19/PredictiveArcHorizon.tsx. Inherited verbatim: the per-cell
 * fragment shader, square dots whose side AND brightness carry the intensity,
 * the 0.7 + 0.3 wave modulation, the edge falloff on (x - centre) / 0.75w, the
 * base / accent / highlight ink ramp, Density as cells down the short edge,
 * the eased pointer and the ref-driven loop. Changed:
 *
 *  - The curve is |length(p - c) - R|, not a parabola, and the upper half of
 *    the circle only. The band is asymmetric: inside the circle it is 0.45 of
 *    its outer depth, so the glow reads as atmosphere above a surface.
 *  - The vertical wave term cos(y * 0.02 + t) becomes a RADIAL one,
 *    cos(r * 0.02 - 1.6t), so the ripples travel outward from the planet.
 *  - Hover ROTATES the circle about its centre, so the crest (and the
 *    falloff window with it) slides along the horizon toward the pointer —
 *    a turn, not a lean. At rest the pointer is centred and the rotation 0.
 *
 * Shape uniforms: uA Rise, uB Radius, uC Thickness, uD Falloff.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */

const MAX_DPR = 2

const VERT_SRC = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime, uDpr, uCell, uDot, uHover;
uniform vec2  uPtr;   // CSS px, y measured from the top
uniform float uA, uB, uC, uD; // the shape group, see the header
uniform vec3  uBg, uBase, uAccent, uHigh;

void main(){
  float cs = max(uCell, 2.0);
  vec2 ci = floor(gl_FragCoord.xy / cs);
  vec2 cc = (ci + 0.5) * cs;               // cell centre, device px

  // CSS pixels, y down, as the base
  float x = cc.x / uDpr;
  float y = (uRes.y - cc.y) / uDpr;
  float w = uRes.x / uDpr;
  float h = uRes.y / uDpr;
  float t = uTime;

  float i = 0.0;
  float R = w * uB;
  // Negative: a positive rotation of the sample moves the crest LEFT.
  float rot = -clamp((uPtr.x - w * 0.5) / w, -0.5, 0.5) * 0.9 * uHover;
  vec2 c = vec2(w * 0.5, h * (1.0 - uA) + R);
  vec2 q = vec2(x, y) - c;
  float cr = cos(rot);
  float sr = sin(rot);
  q = vec2(cr * q.x - sr * q.y, sr * q.x + cr * q.y);
  float r = length(q);
  float dist = r - R;                      // > 0 outside, i.e. above
  float normX = q.x / (w * 0.75);
  float th = (140.0 + (1.0 - min(abs(normX), 1.0)) * 80.0) * uC;
  float thS = dist > 0.0 ? th : th * 0.45;
  float ad = abs(dist);
  if (ad < thS && q.y < 0.0) {
    i = 1.0 - ad / thS;
    float waveX = sin(x * 0.015 + t);
    float waveR = cos(r * 0.02 - t * 1.6);
    i = i * 0.7 + waveX * waveR * 0.3 * i;
    i *= max(0.0, 1.0 - pow(min(abs(normX), 1.0), uD));
  }

  vec3 col = uBg;
  if (i > 0.02) {
    float side = uDot * i * uDpr;
    vec2 d = abs(gl_FragCoord.xy - cc);
    float cov = 1.0 - smoothstep(side * 0.5 - 1.0, side * 0.5 + 1.0, max(d.x, d.y));

    vec3 ink = mix(uBase, uAccent, clamp(pow(i, 1.1), 0.0, 1.0));
    ink = mix(ink, uHigh, smoothstep(0.72, 1.0, i));
    col = mix(uBg, ink, cov * clamp(i * 1.6, 0.0, 1.0));
  }
  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("PredictiveArcHorizon shader:", gl.getShaderInfoLog(sh))
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

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    highlight?: string
    density?: number
    dotSize?: number
    speed?: number
    hover?: number
    horizon?: HorizonGroup
}

type HorizonGroup = { rise?: number; radius?: number; thickness?: number; falloff?: number }
const HORIZON_DEFAULTS: Required<HorizonGroup> = { rise: 45, radius: 90, thickness: 100, falloff: 250 }

export default function PredictiveArcHorizon(props: Props) {
    const {
        style,
        background = "#02040A",
        baseColor = "#0B2A5E",
        accentColor = "#3FA9FF",
        highlight = "#E8F6FF",
        density = 40,
        dotSize = 100,
        speed = 50,
        hover = 100,
        horizon = {"rise":45,"radius":90,"falloff":250,"thickness":100},
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const grp = { ...HORIZON_DEFAULTS, ...(horizon || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const ptrRef = useRef({ tx: 0.5, ty: 0.5, x: 0.5, y: 0.5 })
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        bg: background,
        base: baseColor,
        accent: accentColor,
        high: highlight,
        density: Math.round(clampN(num(density, 160), 40, 320)),
        dotSize: clampN(num(dotSize, 100), 20, 400) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        rise: clampN(num(grp.rise, 45), 0, 100) / 100,
        radius: clampN(num(grp.radius, 90), 20, 300) / 100,
        thickness: clampN(num(grp.thickness, 100), 20, 400) / 100,
        falloff: clampN(num(grp.falloff, 250), 50, 600) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false })
        if (!gl) {
            console.error("PredictiveArcHorizon: WebGL unavailable")
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
            console.error("PredictiveArcHorizon link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const aPos = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        const locs: Record<string, WebGLUniformLocation | null> = {}
        const u = (name: string) => {
            if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
            return locs[name]
        }

        let raf = 0
        let last = performance.now()
        let clock = 0
        const PTR_RATE = 6.0 // 1/s, how fast the lean follows

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            // the source advances 0.015 per frame at speed 1; expressed per second
            clock = (clock + dt * 0.9 * (v.speed as number)) % 6283

            const ptr = ptrRef.current
            const k = 1 - Math.exp(-dt * PTR_RATE)
            ptr.x += (ptr.tx - ptr.x) * k
            ptr.y += (ptr.ty - ptr.y) * k

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

            // Density is cells down the SHORT edge, so the grain stays put when the
            // frame changes aspect instead of stretching with the width.
            const pitchCss = Math.min(bw, bh) / dpr / (v.density as number)

            gl.uniform2f(u("uRes"), bw, bh)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform1f(u("uDpr"), dpr)
            gl.uniform1f(u("uCell"), Math.max(2, pitchCss * dpr))
            gl.uniform1f(u("uDot"), pitchCss * 1.2 * (v.dotSize as number))
            gl.uniform1f(u("uA"), v.rise as number) // Rise
            gl.uniform1f(u("uB"), v.radius as number) // Radius
            gl.uniform1f(u("uC"), v.thickness as number) // Thickness
            gl.uniform1f(u("uD"), v.falloff as number) // Falloff
            gl.uniform1f(u("uHover"), v.hover as number)
            gl.uniform2f(u("uPtr"), ptr.x * (bw / dpr), ptr.y * (bh / dpr))
            const cg = parseColor(v.bg as string, [0.012, 0.012, 0.012])
            const cb = parseColor(v.base as string, [0.169, 0.055, 0.369])
            const ca = parseColor(v.accent as string, [0.627, 0.314, 1.0])
            const chh = parseColor(v.high as string, [1, 1, 1])
            gl.uniform3f(u("uBg"), cg[0], cg[1], cg[2])
            gl.uniform3f(u("uBase"), cb[0], cb[1], cb[2])
            gl.uniform3f(u("uAccent"), ca[0], ca[1], ca[2])
            gl.uniform3f(u("uHigh"), chh[0], chh[1], chh[2])

            gl.drawArrays(gl.TRIANGLES, 0, 3)
            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant — offset and size scale together — so
        // this is safe on a zoomed Framer canvas where absolute px are not.
        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            ptrRef.current.tx = clampN((e.clientX - r.left) / r.width, 0, 1)
            ptrRef.current.ty = clampN((e.clientY - r.top) / r.height, 0, 1)
        }
        const onLeave = () => {
            ptrRef.current.tx = 0.5
            ptrRef.current.ty = 0.5
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
