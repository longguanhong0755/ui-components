"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const SEGMENTS = 40 // bezier subdivisions per rail
const RAIL_ALPHA = 0.35 // the source's rgba(255,255,255,0.35)

const RAIL_VERT = `
precision highp float;

attribute vec4  a_g0;      // fx, wStart, wCentre, arc(px) at the segment start
attribute vec4  a_g1;      // the same at the segment end
attribute vec2  a_corner;  // x: which end (0|1), y: which side (-1|1)
attribute float a_startY;

uniform vec2  uSize;
uniform float uWidth;

varying float v_arc;
varying float v_off;
varying float v_half;

vec2 railPoint(vec4 g, float startY){
  return vec2(g.x * uSize.x, g.y * startY + g.z * uSize.y * 0.5);
}

void main(){
  vec2 q0 = railPoint(a_g0, a_startY);
  vec2 q1 = railPoint(a_g1, a_startY);

  vec2 d = q1 - q0;
  float len = max(length(d), 1e-5);
  vec2 nrm = vec2(-d.y, d.x) / len;

  float half_ = max(uWidth * 0.5, 0.35);
  float ext = half_ + 0.75;                  // feather added OUTSIDE the stroke
  vec2 p = mix(q0, q1, a_corner.x) + nrm * a_corner.y * ext;

  v_arc = mix(a_g0.w, a_g1.w, a_corner.x);
  v_off = a_corner.y * ext;
  v_half = half_;
  gl_Position = vec4(p.x / uSize.x * 2.0 - 1.0, 1.0 - p.y / uSize.y * 2.0, 0.0, 1.0);
}
`

const RAIL_FRAG = `
precision mediump float;

uniform vec3  uColor;
uniform float uAlpha, uPeriod, uDuty, uDashOn;

varying float v_arc;
varying float v_off;
varying float v_half;

void main(){
  // Style = Dashed reproduces the source's setLineDash([1, 4]), cut along the
  // baked arc length. Style = Solid drops the cut and the rail is one stroke.
  float dash = 1.0;
  if (uDashOn > 0.5) {
    float ph = fract(v_arc / max(uPeriod, 1.0));
    dash = 1.0 - smoothstep(uDuty - 0.08, uDuty + 0.08, ph);
  }
  float cov = clamp((v_half - abs(v_off)) / 0.75 + 0.5, 0.0, 1.0);
  float a = uAlpha * dash * cov;
  if (a <= 0.002) discard;
  gl_FragColor = vec4(uColor * a, a);   // premultiplied
}
`

const DOT_VERT = `
precision highp float;

attribute vec2 a_pos;

uniform vec2  uSize;
uniform float uDpr, uDot;

varying float v_edge;

void main(){
  float ps = max(1.0, uDot * uDpr);
  gl_PointSize = ps;
  // One device pixel expressed in gl_PointCoord units, so the disc's edge is a
  // one-pixel feather at every Dot Size. Capped so a 2px dot is still a dot and
  // not a blur: WebGL1 has no fwidth() without an extension.
  v_edge = min(1.0 / ps, 0.25);
  gl_Position = vec4(a_pos.x / uSize.x * 2.0 - 1.0, 1.0 - a_pos.y / uSize.y * 2.0, 0.0, 1.0);
}
`

const DOT_FRAG = `
precision mediump float;

uniform vec3  uColor;
uniform float uAlpha;

varying float v_edge;

void main(){
  // The source drew a 3x3 fillRect — a square sprite. Cut it to a disc.
  float d = length(gl_PointCoord - vec2(0.5));
  float cov = 1.0 - smoothstep(0.5 - v_edge, 0.5, d);
  float a = uAlpha * cov;
  if (a <= 0.002) discard;
  gl_FragColor = vec4(uColor * a, a);   // premultiplied
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("GatewayFlow shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function link(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
    const vs = compile(gl, gl.VERTEX_SHADER, vsSrc)
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc)
    if (!vs || !fs) return null
    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("GatewayFlow link:", gl.getProgramInfoLog(prog))
        return null
    }
    return prog
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

function rng(seed: number): () => number {
    let a = seed >>> 0
    return function () {
        a += 0x6d2b79f5
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const CORNERS = [
    [0, -1], [1, -1], [1, 1],
    [0, -1], [1, 1], [0, 1],
]

// Cubic bezier weights. x is a pure fraction of the width; y splits into the part
// carried by the rail's start height and the part carried by the centre.
function railWeights(t: number, isLeft: boolean, curve: number) {
    const u = 1 - t
    const b0 = u * u * u
    const b1 = 3 * u * u * t
    const b2 = 3 * u * t * t
    const b3 = t * t * t
    const c1 = 0.25 * curve
    const c2 = 0.4 * curve
    const x0 = isLeft ? 0 : 1
    const x1 = isLeft ? c1 : 1 - c1
    const x2 = isLeft ? c2 : 1 - c2
    const x3 = 0.5
    return {
        fx: b0 * x0 + b1 * x1 + b2 * x2 + b3 * x3,
        wStart: b0 + b1, // p0.y and p1.y are both the rail's start height
        wCentre: b2 + b3, // p2.y and p3.y are both the centre
    }
}

interface PathGroup {
    lineWidth?: number
    style?: "solid" | "dashed"
    dash?: number
    curve?: number
}
const PATH_DEFAULTS: Required<PathGroup> = { lineWidth: 89, style: "solid", dash: 23, curve: 21 }

interface GatewayFlowProps {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    dotSize?: number
    speed?: number
    path?: PathGroup
}

export default function GatewayFlow(props: GatewayFlowProps) {
    const {
        style,
        background = "#000000",
        baseColor = "#FFFFFF",
        accentColor = "#FFFFFF",
        density = 101,
        dotSize = 4,
        speed = 100,
        path,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const path_ = { ...PATH_DEFAULTS, ...(path || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        base: baseColor,
        accent: accentColor,
        density: Math.round(clampN(num(density, 80), 4, 300)),
        dotSize: clampN(num(dotSize, 3), 1, 24),
        speed: clampN(num(speed, 50), 0, 100) / 50,
        lineWidth: clampN(num(path_.lineWidth, 100), 20, 400) / 100,
        dashOn: path_.style === "dashed" ? 1 : 0,
        dash: clampN(num(path_.dash, 5), 2, 60),
        curve: clampN(num(path_.curve, 100), 0, 200) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, premultipliedAlpha: true })
        if (!gl) {
            console.error("GatewayFlow: WebGL unavailable")
            return
        }

        const railProg = link(gl, RAIL_VERT, RAIL_FRAG)
        const dotProg = link(gl, DOT_VERT, DOT_FRAG)
        if (!railProg || !dotProg) return

        const locs = new Map<string, WebGLUniformLocation | null>()
        const u = (prog: WebGLProgram, name: string) => {
            // Uniform locations are PER PROGRAM, so the cache key carries the program.
            const key = (prog === railProg ? "R:" : "D:") + name
            if (!locs.has(key)) locs.set(key, gl.getUniformLocation(prog, name))
            return locs.get(key) as WebGLUniformLocation | null
        }

        const R = rng(20260824)

        let railCount = 0
        let vertsPerRail = 0
        let startY = new Float32Array(0)
        let tPos = new Float32Array(0) // particle position along its rail, 0..1
        let tSpd = new Float32Array(0)
        let attrStartY = new Float32Array(0)
        let dotPos = new Float32Array(0)

        const bG0 = gl.createBuffer()
        const bG1 = gl.createBuffer()
        const bCorner = gl.createBuffer()
        const bStartY = gl.createBuffer()
        const bDot = gl.createBuffer()

        // Rails are static: only the per-rail start height moves, and it enters the
        // position affinely, so this buffer is built once per shape change.
        const buildRails = (n: number, w: number, h: number, curve: number) => {
            railCount = n
            vertsPerRail = SEGMENTS * 6
            const total = n * vertsPerRail
            const g0 = new Float32Array(total * 4)
            const g1 = new Float32Array(total * 4)
            const corner = new Float32Array(total * 2)
            attrStartY = new Float32Array(total)
            startY = new Float32Array(n)
            if (tPos.length !== n) {
                tPos = new Float32Array(n)
                tSpd = new Float32Array(n)
                for (let i = 0; i < n; i++) {
                    tPos[i] = R()
                    tSpd[i] = (0.0015 + R() * 0.002) * 60 // source: per frame
                }
            }
            dotPos = new Float32Array(n * 2)

            for (let i = 0; i < n; i++) {
                const isLeft = i % 2 === 0
                startY[i] = (i / n) * h * 1.4 - h * 0.2
                // sample the rail once to bake its arc length in px
                const pts: { x: number; y: number; wS: number; wC: number; fx: number }[] = []
                for (let s = 0; s <= SEGMENTS; s++) {
                    const t = s / SEGMENTS
                    const wq = railWeights(t, isLeft, curve)
                    pts.push({
                        x: wq.fx * w,
                        y: wq.wStart * startY[i] + wq.wCentre * h * 0.5,
                        wS: wq.wStart,
                        wC: wq.wCentre,
                        fx: wq.fx,
                    })
                }
                const arc = [0]
                for (let s = 1; s <= SEGMENTS; s++) {
                    arc.push(arc[s - 1] + Math.hypot(pts[s].x - pts[s - 1].x, pts[s].y - pts[s - 1].y))
                }
                for (let s = 0; s < SEGMENTS; s++) {
                    for (let c = 0; c < 6; c++) {
                        const k = (i * vertsPerRail + s * 6 + c) * 4
                        g0[k] = pts[s].fx
                        g0[k + 1] = pts[s].wS
                        g0[k + 2] = pts[s].wC
                        g0[k + 3] = arc[s]
                        g1[k] = pts[s + 1].fx
                        g1[k + 1] = pts[s + 1].wS
                        g1[k + 2] = pts[s + 1].wC
                        g1[k + 3] = arc[s + 1]
                        const kc = (i * vertsPerRail + s * 6 + c) * 2
                        corner[kc] = CORNERS[c][0]
                        corner[kc + 1] = CORNERS[c][1]
                        attrStartY[i * vertsPerRail + s * 6 + c] = startY[i]
                    }
                }
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, bG0)
            gl.bufferData(gl.ARRAY_BUFFER, g0, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bG1)
            gl.bufferData(gl.ARRAY_BUFFER, g1, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bCorner)
            gl.bufferData(gl.ARRAY_BUFFER, corner, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bStartY)
            gl.bufferData(gl.ARRAY_BUFFER, attrStartY, gl.DYNAMIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bDot)
            gl.bufferData(gl.ARRAY_BUFFER, dotPos.byteLength, gl.DYNAMIC_DRAW)
        }

        // Only the jittered rail's own slice is re-uploaded, never the whole buffer.
        const pushStartY = (i: number) => {
            const base = i * vertsPerRail
            for (let k = 0; k < vertsPerRail; k++) attrStartY[base + k] = startY[i]
            gl.bindBuffer(gl.ARRAY_BUFFER, bStartY)
            gl.bufferSubData(gl.ARRAY_BUFFER, base * 4, attrStartY.subarray(base, base + vertsPerRail))
        }

        let raf = 0
        let last = performance.now()
        let builtN = -1
        let builtW = 0
        let builtH = 0
        let builtCurve = -1

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            const sp = v.speed as number

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

            const wantN = v.density as number
            const wantCurve = v.curve as number
            if (wantN !== builtN || cw !== builtW || ch !== builtH || wantCurve !== builtCurve) {
                buildRails(wantN, cw, ch, wantCurve)
                builtN = wantN
                builtW = cw
                builtH = ch
                builtCurve = wantCurve
            }

            for (let i = 0; i < railCount; i++) {
                tPos[i] += tSpd[i] * dt * sp
                if (tPos[i] > 1) {
                    tPos[i] = 0
                    startY[i] += (R() - 0.5) * 10
                    pushStartY(i)
                }
                const isLeft = i % 2 === 0
                const wq = railWeights(tPos[i], isLeft, wantCurve)
                dotPos[i * 2] = wq.fx * cw
                dotPos[i * 2 + 1] = wq.wStart * startY[i] + wq.wCentre * ch * 0.5
            }

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.disable(gl.DEPTH_TEST)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

            const cb = parseColor(v.base as string, [1, 1, 1])
            const ca = parseColor(v.accent as string, [1, 1, 1])

            if (railCount > 0) {
                gl.useProgram(railProg)
                gl.bindBuffer(gl.ARRAY_BUFFER, bG0)
                const aG0 = gl.getAttribLocation(railProg, "a_g0")
                gl.enableVertexAttribArray(aG0)
                gl.vertexAttribPointer(aG0, 4, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bG1)
                const aG1 = gl.getAttribLocation(railProg, "a_g1")
                gl.enableVertexAttribArray(aG1)
                gl.vertexAttribPointer(aG1, 4, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bCorner)
                const aCorner = gl.getAttribLocation(railProg, "a_corner")
                gl.enableVertexAttribArray(aCorner)
                gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bStartY)
                const aStartY = gl.getAttribLocation(railProg, "a_startY")
                gl.enableVertexAttribArray(aStartY)
                gl.vertexAttribPointer(aStartY, 1, gl.FLOAT, false, 0, 0)

                const dash = v.dash as number
                gl.uniform2f(u(railProg, "uSize"), cw, ch)
                gl.uniform1f(u(railProg, "uWidth"), 1.2 * (v.lineWidth as number))
                gl.uniform1f(u(railProg, "uAlpha"), RAIL_ALPHA)
                gl.uniform1f(u(railProg, "uPeriod"), dash)
                gl.uniform1f(u(railProg, "uDuty"), 1 / 5) // the source's [1, 4] duty
                gl.uniform1f(u(railProg, "uDashOn"), v.dashOn as number)
                gl.uniform3f(u(railProg, "uColor"), cb[0], cb[1], cb[2])
                gl.drawArrays(gl.TRIANGLES, 0, railCount * vertsPerRail)
                gl.disableVertexAttribArray(aG0)
                gl.disableVertexAttribArray(aG1)
                gl.disableVertexAttribArray(aCorner)
                gl.disableVertexAttribArray(aStartY)

                gl.useProgram(dotProg)
                gl.bindBuffer(gl.ARRAY_BUFFER, bDot)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, dotPos)
                const aPos = gl.getAttribLocation(dotProg, "a_pos")
                gl.enableVertexAttribArray(aPos)
                gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
                gl.uniform2f(u(dotProg, "uSize"), cw, ch)
                gl.uniform1f(u(dotProg, "uDpr"), dpr)
                gl.uniform1f(u(dotProg, "uDot"), v.dotSize as number)
                gl.uniform1f(u(dotProg, "uAlpha"), 0.7)
                gl.uniform3f(u(dotProg, "uColor"), ca[0], ca[1], ca[2])
                gl.drawArrays(gl.POINTS, 0, railCount)
                gl.disableVertexAttribArray(aPos)
            }

            raf = requestAnimationFrame(render)
        }

        raf = requestAnimationFrame(render)

        // Never loseContext(): getContext returns the same context per canvas, so
        // StrictMode's mount -> cleanup -> mount would reuse a force-lost one.
        return () => {
            cancelAnimationFrame(raf)
        }
    }, [])

    return (
        <div
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                isolation: "isolate",
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
