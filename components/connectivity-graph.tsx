"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const ORIGIN_DROP = 50 // px below the bottom edge, as in the source
const NARROW_SHARE = 0.7 // fraction of streaks held inside the cone
const AXIS = Math.PI * 1.5 // straight up: the cone's resting axis
const REPEL_REACH = 0.26 // pointer influence radius, as a fraction of the short side
// 0.06 is not a taste value: the outward map r' = r + push*(1-r/R)^2 is injective
// only while push/R < 0.5, and past that the streaks nearest the cursor overshoot
// the ones behind them and the field visibly folds through itself. At Hover 200
// (the control's maximum) push/R = 2*0.06/0.26 = 0.46, so the whole dial stays
// inside the bound and no value of it needs clamping away.
const REPEL_PUSH = 0.06 // displacement at the very centre, same units

const LINE_VERT = `
precision highp float;

attribute vec2 a_p0;      // tail
attribute vec2 a_p1;      // head
attribute vec2 a_corner;  // x: which end (0|1), y: which side (-1|1)
attribute vec4 a_shade;   // x: tail alpha, y: head alpha, z: width px, w: ramp position

uniform vec2 uSize;

varying float v_alpha;
varying float v_ramp;
varying float v_t;
varying float v_off;
varying float v_half;

void main(){
  vec2 d = a_p1 - a_p0;
  float len = max(length(d), 1e-5);
  vec2 nrm = vec2(-d.y, d.x) / len;

  float half_ = max(a_shade.z * 0.5, 0.35);
  float ext = half_ + 0.75;                 // feather added OUTSIDE the stroke
  vec2 p = mix(a_p0, a_p1, a_corner.x) + nrm * a_corner.y * ext;

  v_alpha = mix(a_shade.x, a_shade.y, a_corner.x);
  // The colour is the STREAK's, taken from how far out it is — not a ramp along
  // its own length. The source picked one hsl() per particle from distRatio and
  // only darkened the tail stop; a per-vertex base->accent ramp would paint every
  // streak, however near, with a bright head.
  v_ramp = a_shade.w;
  v_t = a_corner.x;
  v_off = a_corner.y * ext;
  v_half = half_;
  gl_Position = vec4(p.x / uSize.x * 2.0 - 1.0, 1.0 - p.y / uSize.y * 2.0, 0.0, 1.0);
}
`

const LINE_FRAG = `
precision mediump float;

uniform vec3 uBase, uAccent;

varying float v_alpha;
varying float v_ramp;
varying float v_t;
varying float v_off;
varying float v_half;

void main(){
  float cov = clamp((v_half - abs(v_off)) / 0.75 + 0.5, 0.0, 1.0);
  float a = v_alpha * cov;
  if (a <= 0.002) discard;
  // 0.72 is the source's tail stop, one lightness step below the head.
  vec3 col = mix(uBase, uAccent, v_ramp) * mix(0.72, 1.0, v_t);
  gl_FragColor = vec4(col * a, a);   // premultiplied
}
`

const DOT_VERT = `
precision highp float;

attribute vec2  a_pos;
attribute vec3  a_dot;   // x: radius px, y: alpha, z: ramp position 0..1

uniform vec2  uSize;
uniform float uDpr;

varying float v_alpha;
varying float v_ramp;

void main(){
  gl_PointSize = max(1.0, a_dot.x * 2.0 * uDpr);
  v_alpha = a_dot.y;
  v_ramp = a_dot.z;
  gl_Position = vec4(a_pos.x / uSize.x * 2.0 - 1.0, 1.0 - a_pos.y / uSize.y * 2.0, 0.0, 1.0);
}
`

const DOT_FRAG = `
precision mediump float;

uniform vec3 uBase, uAccent;

varying float v_alpha;
varying float v_ramp;

void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float disc = 1.0 - smoothstep(0.75, 1.0, d);
  float a = v_alpha * disc;
  if (a <= 0.002) discard;
  vec3 col = mix(uBase, uAccent, v_ramp);
  gl_FragColor = vec4(col * a, a);   // premultiplied
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("ConnectivityGraph shader:", gl.getShaderInfoLog(sh))
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
        console.error("ConnectivityGraph link:", gl.getProgramInfoLog(prog))
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

type BeamGroup = { length?: number; spread?: number; lineWidth?: number }
const BEAM_DEFAULTS: Required<BeamGroup> = { length: 100, spread: 45, lineWidth: 100 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    dotSize?: number
    speed?: number
    hover?: number
    beam?: BeamGroup
}

export default function ConnectivityGraph(props: Props) {
    const {
        style,
        background = "#000000",
        baseColor = "#000000",
        accentColor = "#00FFB9",
        density = 996,
        dotSize = 191,
        speed = 15,
        hover = 198,
        beam,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const beam_ = { ...BEAM_DEFAULTS, ...(beam || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const ptrRef = useRef({ tx: 0, ty: 0, x: 0, y: 0, on: 0, onS: 0 })
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        base: baseColor,
        accent: accentColor,
        density: Math.round(clampN(num(density, 400), 20, 1500)),
        dotSize: clampN(num(dotSize, 100), 20, 400) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        length: clampN(num(beam_.length, 100), 10, 400) / 100,
        spread: clampN(num(beam_.spread, 45), 2, 90),
        lineWidth: clampN(num(beam_.lineWidth, 100), 20, 400) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, premultipliedAlpha: true })
        if (!gl) {
            console.error("ConnectivityGraph: WebGL unavailable")
            return
        }

        const lineProg = link(gl, LINE_VERT, LINE_FRAG)
        const dotProg = link(gl, DOT_VERT, DOT_FRAG)
        if (!lineProg || !dotProg) return

        const locs = new Map<string, WebGLUniformLocation | null>()
        const u = (prog: WebGLProgram, name: string) => {
            // Uniform locations are PER PROGRAM, so the cache key carries the program.
            const key = (prog === lineProg ? "L:" : "D:") + name
            if (!locs.has(key)) locs.set(key, gl.getUniformLocation(prog, name))
            return locs.get(key) as WebGLUniformLocation | null
        }

        const R = rng(20260824)

        let count = 0
        let pAngle = new Float32Array(0)
        let pSpeed = new Float32Array(0)
        let pDist = new Float32Array(0)
        let pMax = new Float32Array(0)
        let pNarrow = new Uint8Array(0)

        let lP0 = new Float32Array(0)
        let lP1 = new Float32Array(0)
        let lCorner = new Float32Array(0)
        let lShade = new Float32Array(0)
        let dPos = new Float32Array(0)
        let dAttr = new Float32Array(0)

        const bP0 = gl.createBuffer()
        const bP1 = gl.createBuffer()
        const bCorner = gl.createBuffer()
        const bShade = gl.createBuffer()
        const bDPos = gl.createBuffer()
        const bDAttr = gl.createBuffer()

        // Angle is re-drawn on every reset, so Spread is live without a rebuild.
        const seedAngle = (i: number, spreadDeg: number) => {
            const half = (spreadDeg * Math.PI) / 180
            if (pNarrow[i] === 1) return AXIS - half + R() * 2 * half
            return Math.PI + R() * Math.PI
        }

        const build = (n: number, h: number, spreadDeg: number) => {
            count = n
            pAngle = new Float32Array(n)
            pSpeed = new Float32Array(n)
            pDist = new Float32Array(n)
            pMax = new Float32Array(n)
            pNarrow = new Uint8Array(n)
            for (let i = 0; i < n; i++) {
                pNarrow[i] = R() > 1 - NARROW_SHARE ? 1 : 0
                pAngle[i] = seedAngle(i, spreadDeg)
                pSpeed[i] = (0.5 + R() * 2.5) * 60 // source: px per frame
                pDist[i] = R() * (h * 1.2)
                pMax[i] = 20 + R() * 180
            }
            lP0 = new Float32Array(n * 6 * 2)
            lP1 = new Float32Array(n * 6 * 2)
            lCorner = new Float32Array(n * 6 * 2)
            lShade = new Float32Array(n * 6 * 4)
            for (let e = 0; e < n; e++) {
                for (let c = 0; c < 6; c++) {
                    const k = (e * 6 + c) * 2
                    lCorner[k] = CORNERS[c][0]
                    lCorner[k + 1] = CORNERS[c][1]
                }
            }
            dPos = new Float32Array(n * 2)
            dAttr = new Float32Array(n * 3)

            gl.bindBuffer(gl.ARRAY_BUFFER, bP0)
            gl.bufferData(gl.ARRAY_BUFFER, lP0.byteLength, gl.DYNAMIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bP1)
            gl.bufferData(gl.ARRAY_BUFFER, lP1.byteLength, gl.DYNAMIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bCorner)
            gl.bufferData(gl.ARRAY_BUFFER, lCorner, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bShade)
            gl.bufferData(gl.ARRAY_BUFFER, lShade.byteLength, gl.DYNAMIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bDPos)
            gl.bufferData(gl.ARRAY_BUFFER, dPos.byteLength, gl.DYNAMIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bDAttr)
            gl.bufferData(gl.ARRAY_BUFFER, dAttr.byteLength, gl.DYNAMIC_DRAW)
        }

        let raf = 0
        let last = performance.now()
        let builtN = -1

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

            const spreadDeg = v.spread as number
            if ((v.density as number) !== builtN) {
                build(v.density as number, ch, spreadDeg)
                builtN = v.density as number
            }

            // The pointer REPELS the field. The origin stays pinned below the frame —
            // that anchor is the composition — so what moves is each streak: inside
            // REPEL_REACH it is displaced straight out from the cursor, and the push
            // falls to nothing at the edge of that radius so nothing snaps as a
            // streak crosses in or out. Presence is smoothed alongside position, so
            // the field opens and closes rather than popping when the pointer leaves.
            const ptr = ptrRef.current
            const pk = 1 - Math.exp(-dt * 2.6)
            ptr.x += (ptr.tx - ptr.x) * pk
            ptr.y += (ptr.ty - ptr.y) * pk
            ptr.onS += (ptr.on - ptr.onS) * pk
            const hv = (v.hover as number) * ptr.onS
            const ox = cw / 2
            const oy = ch + ORIGIN_DROP
            const short = Math.min(cw, ch)
            const pxs = (0.5 + ptr.x) * cw
            const pys = (0.5 + ptr.y) * ch
            const reach = REPEL_REACH * short
            const push = REPEL_PUSH * short * hv
            const far = ch * 1.2
            const lenScale = v.length as number
            const widthScale = v.lineWidth as number
            const dotScale = v.dotSize as number

            for (let i = 0; i < count; i++) {
                pDist[i] += pSpeed[i] * dt * sp
                if (pDist[i] > ch * 1.5) {
                    pAngle[i] = seedAngle(i, spreadDeg)
                    pSpeed[i] = (0.5 + R() * 2.5) * 60
                    pDist[i] = R() * 50
                    pMax[i] = 20 + R() * 180
                }
                const len = Math.min(pMax[i] * lenScale, pDist[i] * 0.8)
                const nd = pDist[i] / far
                const alpha = Math.min(1, pDist[i] / 100) * Math.max(0, 1 - nd)
                const ratio = Math.min(1, pDist[i] / ch)

                // The seeded angle is never touched — the repel is a screen-space
                // displacement applied after the streak is placed, so a streak's
                // heading cannot jump when the pointer moves.
                const ca = Math.cos(pAngle[i])
                const sa = Math.sin(pAngle[i])
                let x0 = ox + ca * pDist[i]
                let y0 = oy + sa * pDist[i]
                let x1 = ox + ca * (pDist[i] + len)
                let y1 = oy + sa * (pDist[i] + len)

                if (push > 0) {
                    // ONE sample, at the streak's midpoint, applied to both ends. The
                    // obvious version — push each endpoint by its own distance — makes
                    // the segment STRETCH: a 20px streak with its tail inside the reach
                    // and its head outside gains most of the 48px push as extra length,
                    // so the short streaks visibly grow as they pass the cursor. A rigid
                    // translation keeps every streak's length and heading exactly as
                    // seeded and only moves it out of the way.
                    const mx = (x0 + x1) * 0.5 - pxs
                    const my = (y0 + y1) * 0.5 - pys
                    const d = Math.sqrt(mx * mx + my * my)
                    if (d < reach) {
                        const t = 1 - d / reach
                        // max(d, 1): inside a pixel of the cursor the outward direction
                        // is meaningless and would flip frame to frame.
                        const m = (push * t * t) / Math.max(d, 1)
                        const ddx = mx * m
                        const ddy = my * m
                        x0 += ddx
                        y0 += ddy
                        x1 += ddx
                        y1 += ddy
                    }
                }

                for (let c = 0; c < 6; c++) {
                    const k = (i * 6 + c) * 2
                    const s = (i * 6 + c) * 4
                    lP0[k] = x0
                    lP0[k + 1] = y0
                    lP1[k] = x1
                    lP1[k + 1] = y1
                    lShade[s] = alpha * 0.05 // the source's tail stop
                    lShade[s + 1] = alpha
                    lShade[s + 2] = (0.5 + ratio * 2) * widthScale
                    lShade[s + 3] = ratio
                }

                dPos[i * 2] = x1
                dPos[i * 2 + 1] = y1
                dAttr[i * 3] = (0.5 + ratio * 1.5) * dotScale
                dAttr[i * 3 + 1] = Math.min(1, alpha * 1.5)
                // the head rides the same ramp, 35% further along
                dAttr[i * 3 + 2] = Math.min(1, ratio + 0.35)
            }

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.disable(gl.DEPTH_TEST)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

            const cb = parseColor(v.base as string, [0.016, 0.106, 0.286])
            const ca2 = parseColor(v.accent as string, [0.165, 0.278, 0.961])

            if (count > 0) {
                gl.useProgram(lineProg)
                const verts = count * 6
                gl.bindBuffer(gl.ARRAY_BUFFER, bP0)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, lP0)
                const aP0 = gl.getAttribLocation(lineProg, "a_p0")
                gl.enableVertexAttribArray(aP0)
                gl.vertexAttribPointer(aP0, 2, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bP1)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, lP1)
                const aP1 = gl.getAttribLocation(lineProg, "a_p1")
                gl.enableVertexAttribArray(aP1)
                gl.vertexAttribPointer(aP1, 2, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bCorner)
                const aCorner = gl.getAttribLocation(lineProg, "a_corner")
                gl.enableVertexAttribArray(aCorner)
                gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bShade)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, lShade)
                const aShade = gl.getAttribLocation(lineProg, "a_shade")
                gl.enableVertexAttribArray(aShade)
                gl.vertexAttribPointer(aShade, 4, gl.FLOAT, false, 0, 0)

                gl.uniform2f(u(lineProg, "uSize"), cw, ch)
                gl.uniform3f(u(lineProg, "uBase"), cb[0], cb[1], cb[2])
                gl.uniform3f(u(lineProg, "uAccent"), ca2[0], ca2[1], ca2[2])
                gl.drawArrays(gl.TRIANGLES, 0, verts)
                gl.disableVertexAttribArray(aP0)
                gl.disableVertexAttribArray(aP1)
                gl.disableVertexAttribArray(aCorner)
                gl.disableVertexAttribArray(aShade)

                gl.useProgram(dotProg)
                gl.bindBuffer(gl.ARRAY_BUFFER, bDPos)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, dPos)
                const aPos = gl.getAttribLocation(dotProg, "a_pos")
                gl.enableVertexAttribArray(aPos)
                gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bDAttr)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, dAttr)
                const aDot = gl.getAttribLocation(dotProg, "a_dot")
                gl.enableVertexAttribArray(aDot)
                gl.vertexAttribPointer(aDot, 3, gl.FLOAT, false, 0, 0)

                gl.uniform2f(u(dotProg, "uSize"), cw, ch)
                gl.uniform1f(u(dotProg, "uDpr"), dpr)
                gl.uniform3f(u(dotProg, "uBase"), cb[0], cb[1], cb[2])
                gl.uniform3f(u(dotProg, "uAccent"), ca2[0], ca2[1], ca2[2])
                gl.drawArrays(gl.POINTS, 0, count)
                gl.disableVertexAttribArray(aPos)
                gl.disableVertexAttribArray(aDot)
            }

            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant — offset and size scale together — so
        // this is safe on a zoomed canvas where absolute px are not.
        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            ptrRef.current.tx = clampN((e.clientX - r.left) / r.width, 0, 1) - 0.5
            ptrRef.current.ty = clampN((e.clientY - r.top) / r.height, 0, 1) - 0.5
            ptrRef.current.on = 1
        }
        const onLeave = () => {
            // Presence, not just position: at rest the pointer's "position" is the
            // middle of the frame, so without this gate an untouched component would
            // sit with a permanent hole punched through its own centre instead of
            // showing the source's fan.
            ptrRef.current.on = 0
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
