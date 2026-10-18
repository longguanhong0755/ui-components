"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * PredictiveArcEchoEcho — the PredictiveArcEcho band repeated as a stack of nested
 * arches, a rainbow or a sonar return, with a brightness pulse rolling outward
 * through the stack and the inner arches leaning further toward the pointer
 * than the outer ones, so the stack reads as depth.
 *
 * Variation 3 of 3 on 19/PredictiveArcEcho.tsx (replaces PredictiveArcEchoFan).
 * Inherited verbatim: the per-cell fragment shader, square dots whose side AND
 * brightness carry the intensity, the parabola y = peak + normX^2 * height,
 * the 0.7 + 0.3 wave modulation, the edge falloff (frozen at the base's
 * default 2.5), the vertex lean toward the pointer, the base / accent /
 * highlight ink ramp, Density as cells down the short edge, the eased pointer
 * and the ref-driven loop. Changed:
 *
 *  - Count arches, crest n at 0.3h + n * Gap, each a little steeper
 *    (height * (1 + 0.08n)) so the stack fans slightly rather than stacking
 *    as parallel copies. Each band is thinner than the base's single one —
 *    (40 + 25 * (1 - |normX|)) * Thickness — so neighbours stay separate.
 *  - A cell takes the BRIGHTEST band it falls in, never the sum: overlapping
 *    shoulders would otherwise stack past 1 and flatten to the highlight.
 *  - Pulse: band n is scaled by 0.45 + 0.55 * (0.5 + 0.5 sin(1.5t - 0.9n)),
 *    a phase lag per band, so the bright front travels from the inner arch
 *    outward.
 *  - Hover: the base's lean, scaled by 1 - 0.6 * n / Count — parallax.
 *
 * Shape uniforms: uA Count, uB Gap, uC Height, uD Thickness.
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
  float leanX = (uPtr.x - w * 0.5) * 0.5 * uHover;
  float leanY = (uPtr.y - h * 0.5) * 0.25 * uHover;
  float n1 = max(uA, 1.0);
  for (int n = 0; n < 8; n++) {
    float fn = float(n);
    if (fn >= n1) break;
    float par = 1.0 - 0.6 * fn / n1;        // inner arches lean most
    float cx = w * 0.5 + leanX * par;
    float normX = (x - cx) / (w * 0.75);
    float curveY = h * 0.3 + fn * h * uB + leanY * par
                 + normX * normX * h * uC * (1.0 + 0.08 * fn);
    float th = (40.0 + (1.0 - min(abs(normX), 1.0)) * 25.0) * uD;
    float dist = abs(y - curveY);
    if (dist < th) {
      float b = 1.0 - dist / th;
      float waveX = sin(x * 0.015 + t);
      float waveY = cos(y * 0.02 + t);
      b = b * 0.7 + waveX * waveY * 0.3 * b;
      b *= max(0.0, 1.0 - pow(abs(normX), 2.5));
      b *= 0.45 + 0.55 * (0.5 + 0.5 * sin(t * 1.5 - fn * 0.9));
      i = max(i, b);
    }
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
        console.error("PredictiveArcEcho shader:", gl.getShaderInfoLog(sh))
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
    echo?: EchoGroup
}

type EchoGroup = { count?: number; gap?: number; archHeight?: number; thickness?: number }
const ECHO_DEFAULTS: Required<EchoGroup> = { count: 5, gap: 9, archHeight: 70, thickness: 100 }

export default function PredictiveArcEcho(props: Props) {
    const {
        style,
        background = "#07030A",
        baseColor = "#3A0B3F",
        accentColor = "#FF4FD8",
        highlight = "#FFFFFF",
        density = 160,
        dotSize = 100,
        speed = 50,
        hover = 31,
        echo = {"gap":9,"count":5,"thickness":100,"archHeight":70},
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const grp = { ...ECHO_DEFAULTS, ...(echo || {}) }

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
        count: clampN(num(grp.count, 5), 1, 8),
        gap: clampN(num(grp.gap, 9), 2, 30) / 100,
        archHeight: clampN(num(grp.archHeight, 70), 0, 300) / 100,
        thickness: clampN(num(grp.thickness, 100), 20, 400) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false })
        if (!gl) {
            console.error("PredictiveArcEcho: WebGL unavailable")
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
            console.error("PredictiveArcEcho link:", gl.getProgramInfoLog(prog))
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
            gl.uniform1f(u("uA"), v.count as number) // Count
            gl.uniform1f(u("uB"), v.gap as number) // Gap
            gl.uniform1f(u("uC"), v.archHeight as number) // Height
            gl.uniform1f(u("uD"), v.thickness as number) // Thickness
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
