"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * ParticleDrift — a slow drift of particles, wired to each other and to the
 * pointer.
 *
 * DIVERGENCES from the source, all asked for:
 *
 *  - Its falling nodes were ASCII CHARACTERS drawn with `fillText`; they are dots
 *    here. Two source behaviours go with them — the glyph atlas, and the character
 *    SHUFFLE that fired when the pointer came near (a dot has no character to swap).
 *  - The BEAMS are gone — the fast upward light streaks the field drifted under,
 *    and the `Beams` group that drove them. The source ran two populations moving
 *    opposite ways (the field sank at ~0.1–0.5 px/frame while the beams rose at
 *    3–9), which is what read as depth; with one population left, the drift and the
 *    web carry the frame alone. The line renderer stays — it draws the web and the
 *    pointer lines.
 *  - `Direction` replaces the hard-coded downward fall. `0` is the fall the
 *    component shipped with, so the default is unchanged.
 *
 * Everything else is the source's: the drift, the proximity web, the pointer line
 * and the pointer's colour swap.
 *
 * What else the port had to fix:
 *
 *  - Every rate was per FRAME (`n.y += n.vy`), so the whole scene ran at double
 *    speed on a 120Hz display. Rates are per second now.
 *  - `resize()` called `ctx.scale(dpr, dpr)` on every resize, and 2D context
 *    transforms COMPOUND: the second resize was scaled by dpr^2. The buffer is
 *    sized without a persistent transform here.
 *  - The pointer was tracked on `window` with `getBoundingClientRect()` for the
 *    offset — the rect carries the Framer canvas zoom, so the connection lines
 *    drifted away from the cursor on a zoomed canvas. Tracked as a RATIO of the
 *    rect, which is zoom-invariant, and bound to the canvas.
 *
 * Ported from the Constellation Field collection ("particle-drift"). Interaction:
 * the pointer lights nearby particles and draws a line to each, both the source's.
 * Framer's editor swallows pointer events, so it is PREVIEW-only; the drift runs on
 * its own.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */

const MAX_DPR = 2
const MAX_LINES = 8000
const EDGE = 20 // px a particle must clear before it re-enters on the far side

const LINE_VERT = `
precision highp float;

attribute vec2  a_p0;
attribute vec2  a_p1;
attribute vec2  a_corner;   // x: which end (0|1), y: which side (-1|1)
attribute vec3  a_shade;    // x: alpha at this end, y: colour mix (0 base, 1 accent), z: width px

uniform vec2  uSize;

varying float v_alpha;
varying float v_mix;
varying float v_off;
varying float v_half;

void main(){
  vec2 d = a_p1 - a_p0;
  float len = max(length(d), 1e-5);
  vec2 nrm = vec2(-d.y, d.x) / len;

  float half_ = max(a_shade.z * 0.5, 0.35);
  float ext = half_ + 0.75;                 // feather added OUTSIDE the stroke
  vec2 p = mix(a_p0, a_p1, a_corner.x);
  p += nrm * a_corner.y * ext;

  v_alpha = a_shade.x;
  v_mix = a_shade.y;
  v_off = a_corner.y * ext;
  v_half = half_;
  gl_Position = vec4(p.x / uSize.x * 2.0 - 1.0, 1.0 - p.y / uSize.y * 2.0, 0.0, 1.0);
}
`

const LINE_FRAG = `
precision mediump float;

uniform vec3 uBase, uAccent;

varying float v_alpha;
varying float v_mix;
varying float v_off;
varying float v_half;

void main(){
  float cov = clamp((v_half - abs(v_off)) / 0.75 + 0.5, 0.0, 1.0);
  float a = v_alpha * cov;
  vec3 col = mix(uBase, uAccent, v_mix);
  gl_FragColor = vec4(col * a, a);   // premultiplied
}
`

const DOT_VERT = `
precision highp float;

attribute vec2  a_pos;
attribute float a_lit;     // 0 resting, 1 under the pointer

uniform vec2  uSize;
uniform float uDpr, uDot;

varying float v_lit;

void main(){
  gl_PointSize = max(1.0, uDot * uDpr);
  v_lit = a_lit;
  gl_Position = vec4(a_pos.x / uSize.x * 2.0 - 1.0, 1.0 - a_pos.y / uSize.y * 2.0, 0.0, 1.0);
}
`

const DOT_FRAG = `
precision mediump float;

uniform vec3  uBase, uAccent;
uniform float uRestAlpha;

varying float v_lit;

void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float disc = 1.0 - smoothstep(0.72, 1.0, d);
  vec3 col = mix(uBase, uAccent, v_lit);
  float a = disc * mix(uRestAlpha, 1.0, v_lit);
  if (a <= 0.004) discard;
  gl_FragColor = vec4(col * a, a);   // premultiplied
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("ParticleDrift shader:", gl.getShaderInfoLog(sh))
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
        console.error("ParticleDrift link:", gl.getProgramInfoLog(prog))
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
    direction?: number
    hover?: number
    linkDistance?: number
    linkThickness?: number
}

export default function ParticleDrift(props: Props) {
    const {
        style,
        background = "#030509",
        baseColor = "#FFFFFF",
        accentColor = "#FFFFFE69",
        density = 252,
        dotSize = 1,
        speed = 50,
        direction = 0,
        hover = 15,
        linkDistance = 0,
        linkThickness = 8,
        width,
        height,
    } = props

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const ptrRef = useRef({ x: -10000, y: -10000 })

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        base: baseColor,
        accent: accentColor,
        density: Math.round(clampN(num(density, 90), 10, 400)),
        dotSize: clampN(num(dotSize, 5), 1, 24),
        speed: clampN(num(speed, 50), 0, 100) / 50,
        direction: clampN(num(direction, 0), 0, 360),
        hover: clampN(num(hover, 100), 0, 200) / 100,
        linkDistance: clampN(num(linkDistance, 120), 0, 400),
        linkThickness: clampN(num(linkThickness, 1), 0.5, 8),
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, premultipliedAlpha: true })
        if (!gl) {
            console.error("ParticleDrift: WebGL unavailable")
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

        // Line buffers are sized for the cap once and refilled, so a frame never
        // allocates.
        const lP0 = new Float32Array(MAX_LINES * 6 * 2)
        const lP1 = new Float32Array(MAX_LINES * 6 * 2)
        const lCorner = new Float32Array(MAX_LINES * 6 * 2)
        const lShade = new Float32Array(MAX_LINES * 6 * 3)
        for (let e = 0; e < MAX_LINES; e++) {
            for (let c = 0; c < 6; c++) {
                const k = (e * 6 + c) * 2
                lCorner[k] = CORNERS[c][0]
                lCorner[k + 1] = CORNERS[c][1]
            }
        }
        const bP0 = gl.createBuffer()
        const bP1 = gl.createBuffer()
        const bCorner = gl.createBuffer()
        const bShade = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, bP0)
        gl.bufferData(gl.ARRAY_BUFFER, lP0.byteLength, gl.DYNAMIC_DRAW)
        gl.bindBuffer(gl.ARRAY_BUFFER, bP1)
        gl.bufferData(gl.ARRAY_BUFFER, lP1.byteLength, gl.DYNAMIC_DRAW)
        gl.bindBuffer(gl.ARRAY_BUFFER, bCorner)
        gl.bufferData(gl.ARRAY_BUFFER, lCorner, gl.STATIC_DRAW)
        gl.bindBuffer(gl.ARRAY_BUFFER, bShade)
        gl.bufferData(gl.ARRAY_BUFFER, lShade.byteLength, gl.DYNAMIC_DRAW)

        const R = rng(20260824)

        // falling particles
        let nCount = 0
        let nx = new Float32Array(0)
        let ny = new Float32Array(0)
        let nSpd = new Float32Array(0)
        let gPos = new Float32Array(0)
        let gLit = new Float32Array(0)
        const bGPos = gl.createBuffer()
        const bGLit = gl.createBuffer()

        const buildNodes = (n: number, w: number, h: number) => {
            nCount = n
            nx = new Float32Array(n)
            ny = new Float32Array(n)
            nSpd = new Float32Array(n)
            gPos = new Float32Array(n * 2)
            gLit = new Float32Array(n)
            for (let i = 0; i < n; i++) {
                nx[i] = R() * w
                ny[i] = R() * h
                nSpd[i] = (R() * 0.4 + 0.1) * 60 // source: 0.1..0.5 px per frame
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, bGPos)
            gl.bufferData(gl.ARRAY_BUFFER, gPos.byteLength, gl.DYNAMIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bGLit)
            gl.bufferData(gl.ARRAY_BUFFER, gLit.byteLength, gl.DYNAMIC_DRAW)
        }

        let raf = 0
        let last = performance.now()
        let builtN = -1
        let builtW = 0
        let builtH = 0

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

            if ((v.density as number) !== builtN) {
                buildNodes(v.density as number, cw, ch)
                builtN = v.density as number
            }
            if (cw !== builtW || ch !== builtH) {
                // Scale into the new box rather than re-seeding, so a resize drag does
                // not reshuffle the whole field every frame.
                const sx = cw / Math.max(builtW || cw, 1)
                const sy = ch / Math.max(builtH || ch, 1)
                for (let i = 0; i < nCount; i++) {
                    nx[i] *= sx
                    ny[i] *= sy
                }
                builtW = cw
                builtH = ch
            }

            const ptr = ptrRef.current
            const hv = v.hover as number
            const reach = 180 * (hv > 0 ? 1 : 0)
            const LINKD = v.linkDistance as number
            const LINKW = v.linkThickness as number

            // 0 = down (the shipped fall), 90 = right, 180 = up, 270 = left.
            const th = ((v.direction as number) * Math.PI) / 180
            const dirX = Math.sin(th)
            const dirY = Math.cos(th)

            let lines = 0
            const pushLine = (
                x0: number, y0: number, x1: number, y1: number,
                a0: number, a1: number, mix: number, wpx: number
            ) => {
                if (lines >= MAX_LINES) return
                for (let c = 0; c < 6; c++) {
                    const k = (lines * 6 + c) * 2
                    const s3 = (lines * 6 + c) * 3
                    lP0[k] = x0
                    lP0[k + 1] = y0
                    lP1[k] = x1
                    lP1[k + 1] = y1
                    // CORNERS[c][0] picks the end, so the alpha ramp rides the quad
                    lShade[s3] = CORNERS[c][0] === 0 ? a0 : a1
                    lShade[s3 + 1] = mix
                    lShade[s3 + 2] = wpx
                }
                lines++
            }

            // --- particle drift and pointer lighting ---
            for (let i = 0; i < nCount; i++) {
                nx[i] += nSpd[i] * dirX * dt * sp
                ny[i] += nSpd[i] * dirY * dt * sp
                // The source recycled a fallen particle to the top edge with a fresh
                // x. Generalised to any direction: whichever edge it leaves, it
                // re-enters opposite with a fresh cross-axis position, so the field
                // never settles into repeating tracks.
                if (nx[i] < -EDGE) {
                    nx[i] = cw + EDGE
                    ny[i] = R() * ch
                } else if (nx[i] > cw + EDGE) {
                    nx[i] = -EDGE
                    ny[i] = R() * ch
                }
                if (ny[i] < -EDGE) {
                    ny[i] = ch + EDGE
                    nx[i] = R() * cw
                } else if (ny[i] > ch + EDGE) {
                    ny[i] = -EDGE
                    nx[i] = R() * cw
                }
                const dx = ptr.x - nx[i]
                const dy = ptr.y - ny[i]
                const d = Math.sqrt(dx * dx + dy * dy)
                const lit = reach > 0 && d < reach ? 1 : 0
                if (lit === 1) {
                    const a = 0.5 * (1 - d / reach) * hv
                    pushLine(nx[i], ny[i], ptr.x, ptr.y, a, a, 1, LINKW)
                }
                gPos[i * 2] = nx[i]
                gPos[i * 2 + 1] = ny[i]
                gLit[i] = lit
            }

            // --- proximity lines between particles ---
            if (LINKD > 0) {
                const l2 = LINKD * LINKD
                for (let i = 0; i < nCount && lines < MAX_LINES; i++) {
                    for (let j = i + 1; j < nCount && lines < MAX_LINES; j++) {
                        const dx = nx[i] - nx[j]
                        const dy = ny[i] - ny[j]
                        const dd = dx * dx + dy * dy
                        if (dd >= l2) continue
                        const a = 0.15 * (1 - Math.sqrt(dd) / LINKD)
                        pushLine(nx[i], ny[i], nx[j], ny[j], a, a, 0, LINKW)
                    }
                }
            }

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.disable(gl.DEPTH_TEST)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

            const cb = parseColor(v.base as string, [0.612, 0.639, 0.686])
            const ca = parseColor(v.accent as string, [0.376, 0.647, 0.98])

            if (lines > 0) {
                gl.useProgram(lineProg)
                const verts = lines * 6
                gl.bindBuffer(gl.ARRAY_BUFFER, bP0)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, lP0.subarray(0, verts * 2))
                const aP0 = gl.getAttribLocation(lineProg, "a_p0")
                gl.enableVertexAttribArray(aP0)
                gl.vertexAttribPointer(aP0, 2, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bP1)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, lP1.subarray(0, verts * 2))
                const aP1 = gl.getAttribLocation(lineProg, "a_p1")
                gl.enableVertexAttribArray(aP1)
                gl.vertexAttribPointer(aP1, 2, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bCorner)
                const aCorner = gl.getAttribLocation(lineProg, "a_corner")
                gl.enableVertexAttribArray(aCorner)
                gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bShade)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, lShade.subarray(0, verts * 3))
                const aShade = gl.getAttribLocation(lineProg, "a_shade")
                gl.enableVertexAttribArray(aShade)
                gl.vertexAttribPointer(aShade, 3, gl.FLOAT, false, 0, 0)

                gl.uniform2f(u(lineProg, "uSize"), cw, ch)
                gl.uniform3f(u(lineProg, "uBase"), cb[0], cb[1], cb[2])
                gl.uniform3f(u(lineProg, "uAccent"), ca[0], ca[1], ca[2])
                gl.drawArrays(gl.TRIANGLES, 0, verts)
                gl.disableVertexAttribArray(aP0)
                gl.disableVertexAttribArray(aP1)
                gl.disableVertexAttribArray(aCorner)
                gl.disableVertexAttribArray(aShade)
            }

            if (nCount > 0) {
                gl.useProgram(dotProg)
                gl.bindBuffer(gl.ARRAY_BUFFER, bGPos)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, gPos)
                const aPos = gl.getAttribLocation(dotProg, "a_pos")
                gl.enableVertexAttribArray(aPos)
                gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bGLit)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, gLit)
                const aLit = gl.getAttribLocation(dotProg, "a_lit")
                gl.enableVertexAttribArray(aLit)
                gl.vertexAttribPointer(aLit, 1, gl.FLOAT, false, 0, 0)

                gl.uniform2f(u(dotProg, "uSize"), cw, ch)
                gl.uniform1f(u(dotProg, "uDpr"), dpr)
                gl.uniform1f(u(dotProg, "uDot"), v.dotSize as number)
                gl.uniform1f(u(dotProg, "uRestAlpha"), 0.4)
                gl.uniform3f(u(dotProg, "uBase"), cb[0], cb[1], cb[2])
                gl.uniform3f(u(dotProg, "uAccent"), ca[0], ca[1], ca[2])
                gl.drawArrays(gl.POINTS, 0, nCount)
                gl.disableVertexAttribArray(aPos)
                gl.disableVertexAttribArray(aLit)
            }

            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant — offset and size scale together — so
        // this is safe on a zoomed Framer canvas where absolute px are not.
        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            ptrRef.current.x = ((e.clientX - r.left) / r.width) * cw
            ptrRef.current.y = ((e.clientY - r.top) / r.height) * ch
        }
        const onLeave = () => {
            ptrRef.current.x = -10000
            ptrRef.current.y = -10000
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
