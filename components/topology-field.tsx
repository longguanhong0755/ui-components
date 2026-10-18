"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const FOCAL = 1.7320508 // 1 / tan(60deg / 2), the source's camera
const MAX_EDGES = 12000

const COMMON = `
// yaw about y, tilt about x, roll about z — the source's rotation order
vec3 spin(vec3 p, float yaw, float tilt, float roll){
  float c = cos(yaw), s = sin(yaw);
  p = vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
  c = cos(tilt); s = sin(tilt);
  p = vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
  c = cos(roll); s = sin(roll);
  return vec3(p.x * c - p.y * s, p.x * s + p.y * c, p.z);
}
`

const LINE_VERT = `
precision highp float;

attribute vec3  a_p0;
attribute vec3  a_p1;
attribute vec2  a_corner;   // x: which end (0|1), y: which side (-1|1)
attribute float a_alpha;

uniform vec2  uRes;
uniform float uYaw, uTilt, uRoll, uDist, uWidth, uOffsetX, uFogNear, uFogFar, uHover, uReach;
uniform vec2  uPtr;   // NDC

varying float v_alpha;
varying float v_fog;
varying float v_probe;

${COMMON}

void main(){
  float ar = uRes.x / max(uRes.y, 1.0);

  vec3 r0 = spin(a_p0, uYaw, uTilt, uRoll);
  vec3 r1 = spin(a_p1, uYaw, uTilt, uRoll);

  float w0 = max(uDist - r0.z, 0.05);
  float w1 = max(uDist - r1.z, 0.05);
  vec4 c0 = vec4((${FOCAL.toFixed(6)} / ar) * (r0.x + uOffsetX * ar * w0 / uDist), ${FOCAL.toFixed(6)} * r0.y, 0.0, w0);
  vec4 c1 = vec4((${FOCAL.toFixed(6)} / ar) * (r1.x + uOffsetX * ar * w1 / uDist), ${FOCAL.toFixed(6)} * r1.y, 0.0, w1);

  vec2 n0 = c0.xy / c0.w;
  vec2 n1 = c1.xy / c1.w;
  vec2 dir = normalize((n1 - n0) * vec2(ar, 1.0) + vec2(1e-6));
  vec2 perp = vec2(-dir.y, dir.x) / vec2(ar, 1.0);

  vec4 sel = mix(c0, c1, a_corner.x);
  // multiplying by w keeps the stroke a constant SCREEN width after the divide
  sel.xy += perp * a_corner.y * uWidth * sel.w;

  v_alpha = a_alpha;
  v_fog = 1.0 - smoothstep(uFogNear, uFogFar, mix(w0, w1, a_corner.x));
  // PROBE: the graph lights up where the pointer passes, in screen space, so an
  // edge on the near face responds and the one behind it does not.
  vec2 nd = (sel.xy / sel.w - uPtr) * vec2(ar, 1.0);
  v_probe = (1.0 - smoothstep(0.0, uReach, length(nd))) * uHover;
  gl_Position = sel;
}
`

const LINE_FRAG = `
precision mediump float;

uniform vec3 uColor;

varying float v_alpha;
varying float v_fog;
varying float v_probe;

void main(){
  float a = v_alpha * v_fog * 0.65 * (1.0 + v_probe * 1.6);   // the source's opacity, lifted under the pointer
  if (a <= 0.002) discard;
  gl_FragColor = vec4(uColor * a, a);   // premultiplied
}
`

const NODE_VERT = `
precision highp float;

attribute vec3 a_p;
attribute vec3 a_pulse;   // x: base size, y: rate, z: phase

uniform vec2  uRes;
uniform float uYaw, uTilt, uRoll, uDist, uTime, uSize, uPulse, uOffsetX, uFogNear, uFogFar, uHover, uReach;
uniform vec2  uPtr;   // NDC

varying float v_alpha;
varying float v_fog;
varying float v_probe;

${COMMON}

void main(){
  float ar = uRes.x / max(uRes.y, 1.0);
  vec3 r = spin(a_p, uYaw, uTilt, uRoll);
  float w = max(uDist - r.z, 0.05);

  float pulse = (sin(uTime * a_pulse.y + a_pulse.z) + 1.0) * 0.5;
  // the source's targetRadius = baseSize + pulse * 1.8, in units of sphere radius
  float radius = (a_pulse.x + pulse * 1.8 * uPulse) * uSize;

  vec4 clip = vec4((${FOCAL.toFixed(6)} / ar) * (r.x + uOffsetX * ar * w / uDist), ${FOCAL.toFixed(6)} * r.y, 0.0, w);
  // PROBE: a node near the pointer swells and brightens, riding the same channels
  // its own pulse already drives — the pointer reads as another beat rather than
  // as a spotlight.
  vec2 nd = (clip.xy / clip.w - uPtr) * vec2(ar, 1.0);
  v_probe = (1.0 - smoothstep(0.0, uReach, length(nd))) * uHover;

  gl_PointSize = max(1.0, radius * (1.0 + v_probe * 0.9) * ${FOCAL.toFixed(6)} * uRes.y / w);
  v_alpha = 0.4 + pulse * 0.6;                       // and its opacity ramp
  v_fog = 1.0 - smoothstep(uFogNear, uFogFar, w);
  gl_Position = clip;
}
`

const NODE_FRAG = `
precision mediump float;

uniform vec3 uColor;

varying float v_alpha;
varying float v_fog;
varying float v_probe;

void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float disc = 1.0 - smoothstep(0.7, 1.0, d);
  float a = clamp(v_alpha * (1.0 + v_probe), 0.0, 1.0) * v_fog * disc * 0.9;
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
        console.error("TopologyField shader:", gl.getShaderInfoLog(sh))
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
        console.error("TopologyField link:", gl.getProgramInfoLog(prog))
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

interface NetworkGroup {
    link: number
    lineWidth: number
    pulse: number
}
const NETWORK_DEFAULTS: NetworkGroup = { link: 100, lineWidth: 100, pulse: 100 }

interface SphereGroup {
    offsetX: number
    tilt: number
    distance: number
}
const SPHERE_DEFAULTS: SphereGroup = { offsetX: 20, tilt: 11, distance: 170 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    edgeColor?: string
    nodeColor?: string
    density?: number
    dotSize?: number
    speed?: number
    hover?: number
    network?: Partial<NetworkGroup>
    sphere?: Partial<SphereGroup>
}

export default function TopologyField(props: Props) {
    const {
        style,
        background = "#0A0A0A",
        edgeColor = "#00FFBF",
        nodeColor = "#00FFD3",
        density = 120,
        dotSize = 100,
        speed = 50,
        hover = 100,
        network,
        sphere,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const network_ = { ...NETWORK_DEFAULTS, ...(network || {}) }
    const sphere_ = { ...SPHERE_DEFAULTS, ...(sphere || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const ptrRef = useRef({ tx: 0, ty: 0, x: 0, y: 0 })
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        base: edgeColor,
        accent: nodeColor,
        density: Math.round(clampN(num(density, 120), 20, 400)),
        dotSize: clampN(num(dotSize, 100), 20, 400) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        link: clampN(num(network_.link, 100), 20, 300) / 100,
        lineWidth: clampN(num(network_.lineWidth, 100), 20, 400) / 100,
        pulse: clampN(num(network_.pulse, 100), 0, 300) / 100,
        offsetX: clampN(num(sphere_.offsetX, 20), -50, 50) / 100,
        tilt: clampN(num(sphere_.tilt, 11), -45, 45),
        distance: clampN(num(sphere_.distance, 170), 110, 400) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, premultipliedAlpha: true })
        if (!gl) {
            console.error("TopologyField: WebGL unavailable")
            return
        }

        const lineProg = link(gl, LINE_VERT, LINE_FRAG)
        const nodeProg = link(gl, NODE_VERT, NODE_FRAG)
        if (!lineProg || !nodeProg) return

        const locs = new Map<string, WebGLUniformLocation | null>()
        const u = (prog: WebGLProgram, name: string) => {
            // Uniform locations are PER PROGRAM, so the cache key carries the program.
            const key = (prog === lineProg ? "L:" : "N:") + name
            if (!locs.has(key)) locs.set(key, gl.getUniformLocation(prog, name))
            return locs.get(key) as WebGLUniformLocation | null
        }

        const bP0 = gl.createBuffer()
        const bP1 = gl.createBuffer()
        const bCorner = gl.createBuffer()
        const bAlpha = gl.createBuffer()
        const bNodeP = gl.createBuffer()
        const bNodePulse = gl.createBuffer()
        let edges = 0
        let nodeCount = 0

        // Fibonacci spiral, then an O(n^2) neighbour sweep — both run ONLY when
        // Density or Link changes, never per frame. The nodes do not move relative
        // to each other; the whole sphere turns.
        const build = (n: number, linkScale: number) => {
            const R = rng(20260825)
            const px = new Float32Array(n * 3)
            const pulse = new Float32Array(n * 3)
            for (let i = 0; i < n; i++) {
                const phi = Math.acos(-1 + (2 * i) / n)
                const theta = Math.sqrt(n * Math.PI) * phi
                px[i * 3] = Math.cos(theta) * Math.sin(phi)
                px[i * 3 + 1] = Math.sin(theta) * Math.sin(phi)
                px[i * 3 + 2] = Math.cos(phi)
                pulse[i * 3] = R() * 1.5 + 1.0 // baseSize, in source units
                pulse[i * 3 + 1] = (R() * 0.02 + 0.015) * 60 // rate, per second
                pulse[i * 3 + 2] = R() * Math.PI * 2
            }
            nodeCount = n
            gl.bindBuffer(gl.ARRAY_BUFFER, bNodeP)
            gl.bufferData(gl.ARRAY_BUFFER, px, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bNodePulse)
            gl.bufferData(gl.ARRAY_BUFFER, pulse, gl.STATIC_DRAW)

            // The threshold scales as 1/sqrt(n): hold it fixed and the edge count
            // grows as n^2, so Density stops adding detail and fills the sphere solid.
            const thr = 0.45 * Math.sqrt(120 / n) * linkScale
            // Sweep EVERY pair first. Breaking out of the loops at MAX_EDGES
            // truncates in node-index order, and a Fibonacci index runs
            // pole-to-pole (z = -1 + 2i/n) — so the cap used to strip a whole
            // polar cap bare while the other hemisphere stayed dense. If the
            // budget is exceeded we keep the SHORTEST edges instead, which
            // thins the graph evenly and drops the ones already faded to zero.
            const ea: number[] = []
            const eb: number[] = []
            const ed: number[] = []
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const dx = px[i * 3] - px[j * 3]
                    const dy = px[i * 3 + 1] - px[j * 3 + 1]
                    const dz = px[i * 3 + 2] - px[j * 3 + 2]
                    const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
                    if (d >= thr) continue
                    ea.push(i)
                    eb.push(j)
                    ed.push(d)
                }
            }
            let order: number[] | null = null
            if (ea.length > MAX_EDGES) {
                order = Array.from({ length: ea.length }, (_, k) => k)
                order.sort((a, b) => ed[a] - ed[b])
                order.length = MAX_EDGES
            }
            edges = order ? order.length : ea.length
            const at = (e: number) => (order ? order[e] : e)
            const p0 = new Float32Array(edges * 6 * 3)
            const p1 = new Float32Array(edges * 6 * 3)
            const corner = new Float32Array(edges * 6 * 2)
            const alpha = new Float32Array(edges * 6)
            for (let e = 0; e < edges; e++) {
                const se = at(e)
                const i = ea[se]
                const j = eb[se]
                const a = (1 - ed[se] / thr) * 0.8
                for (let c = 0; c < 6; c++) {
                    const k = e * 6 + c
                    p0[k * 3] = px[i * 3]
                    p0[k * 3 + 1] = px[i * 3 + 1]
                    p0[k * 3 + 2] = px[i * 3 + 2]
                    p1[k * 3] = px[j * 3]
                    p1[k * 3 + 1] = px[j * 3 + 1]
                    p1[k * 3 + 2] = px[j * 3 + 2]
                    corner[k * 2] = CORNERS[c][0]
                    corner[k * 2 + 1] = CORNERS[c][1]
                    alpha[k] = a
                }
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, bP0)
            gl.bufferData(gl.ARRAY_BUFFER, p0, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bP1)
            gl.bufferData(gl.ARRAY_BUFFER, p1, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bCorner)
            gl.bufferData(gl.ARRAY_BUFFER, corner, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bAlpha)
            gl.bufferData(gl.ARRAY_BUFFER, alpha, gl.STATIC_DRAW)
        }

        let raf = 0
        let last = performance.now()
        let clock = 0
        let builtN = -1
        let builtLink = -1

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            clock = (clock + dt * (v.speed as number)) % 6283

            const ptr = ptrRef.current
            const pk = 1 - Math.exp(-dt * 9.0)
            ptr.x += (ptr.tx - ptr.x) * pk
            ptr.y += (ptr.ty - ptr.y) * pk

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
            const wantLink = v.link as number
            if (wantN !== builtN || wantLink !== builtLink) {
                build(wantN, wantLink)
                builtN = wantN
                builtLink = wantLink
            }

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.disable(gl.DEPTH_TEST)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

            const dist = v.distance as number
            const tilt = ((v.tilt as number) * Math.PI) / 180
            // the source's fog, 300..950 with the sphere radius 380 at camera 650
            const fogNear = dist - 0.92
            const fogFar = dist + 0.79
            const cb = parseColor(v.base as string, [1, 1, 1])
            const ca = parseColor(v.accent as string, [1, 1, 1])

            if (edges > 0) {
                gl.useProgram(lineProg)
                gl.bindBuffer(gl.ARRAY_BUFFER, bP0)
                const aP0 = gl.getAttribLocation(lineProg, "a_p0")
                gl.enableVertexAttribArray(aP0)
                gl.vertexAttribPointer(aP0, 3, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bP1)
                const aP1 = gl.getAttribLocation(lineProg, "a_p1")
                gl.enableVertexAttribArray(aP1)
                gl.vertexAttribPointer(aP1, 3, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bCorner)
                const aCorner = gl.getAttribLocation(lineProg, "a_corner")
                gl.enableVertexAttribArray(aCorner)
                gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bAlpha)
                const aAlpha = gl.getAttribLocation(lineProg, "a_alpha")
                gl.enableVertexAttribArray(aAlpha)
                gl.vertexAttribPointer(aAlpha, 1, gl.FLOAT, false, 0, 0)

                gl.uniform2f(u(lineProg, "uRes"), bw, bh)
                gl.uniform1f(u(lineProg, "uYaw"), clock * 0.108)
                gl.uniform1f(u(lineProg, "uTilt"), tilt)
                gl.uniform1f(u(lineProg, "uRoll"), clock * 0.036)
                gl.uniform1f(u(lineProg, "uDist"), dist)
                gl.uniform1f(u(lineProg, "uWidth"), 0.0016 * (v.lineWidth as number))
                gl.uniform1f(u(lineProg, "uOffsetX"), v.offsetX as number)
                gl.uniform1f(u(lineProg, "uFogNear"), fogNear)
                gl.uniform1f(u(lineProg, "uFogFar"), fogFar)
                // 0.65 in NDC-times-aspect: the sphere is HOLLOW, so a tighter probe
                // sits in the empty middle and lights nothing. This is about a third of
                // the shell's apparent radius, which is a patch of surface.
                gl.uniform1f(u(lineProg, "uHover"), v.hover as number)
                gl.uniform1f(u(lineProg, "uReach"), 0.65)
                gl.uniform2f(u(lineProg, "uPtr"), ptr.x * 2, ptr.y * 2)
                gl.uniform3f(u(lineProg, "uColor"), cb[0], cb[1], cb[2])
                gl.drawArrays(gl.TRIANGLES, 0, edges * 6)
                gl.disableVertexAttribArray(aP0)
                gl.disableVertexAttribArray(aP1)
                gl.disableVertexAttribArray(aCorner)
                gl.disableVertexAttribArray(aAlpha)
            }

            if (nodeCount > 0) {
                gl.useProgram(nodeProg)
                gl.bindBuffer(gl.ARRAY_BUFFER, bNodeP)
                const aP = gl.getAttribLocation(nodeProg, "a_p")
                gl.enableVertexAttribArray(aP)
                gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, bNodePulse)
                const aPulse = gl.getAttribLocation(nodeProg, "a_pulse")
                gl.enableVertexAttribArray(aPulse)
                gl.vertexAttribPointer(aPulse, 3, gl.FLOAT, false, 0, 0)

                gl.uniform2f(u(nodeProg, "uRes"), bw, bh)
                gl.uniform1f(u(nodeProg, "uYaw"), clock * 0.108)
                gl.uniform1f(u(nodeProg, "uTilt"), tilt)
                gl.uniform1f(u(nodeProg, "uRoll"), clock * 0.036)
                gl.uniform1f(u(nodeProg, "uDist"), dist)
                gl.uniform1f(u(nodeProg, "uTime"), clock)
                // node radii are in units of 1/380 of the sphere radius in the source
                gl.uniform1f(u(nodeProg, "uSize"), (1 / 380) * (v.dotSize as number))
                gl.uniform1f(u(nodeProg, "uPulse"), v.pulse as number)
                gl.uniform1f(u(nodeProg, "uOffsetX"), v.offsetX as number)
                gl.uniform1f(u(nodeProg, "uFogNear"), fogNear)
                gl.uniform1f(u(nodeProg, "uFogFar"), fogFar)
                gl.uniform1f(u(nodeProg, "uHover"), v.hover as number)
                gl.uniform1f(u(nodeProg, "uReach"), 0.65)
                gl.uniform2f(u(nodeProg, "uPtr"), ptr.x * 2, ptr.y * 2)
                gl.uniform3f(u(nodeProg, "uColor"), ca[0], ca[1], ca[2])
                gl.drawArrays(gl.POINTS, 0, nodeCount)
                gl.disableVertexAttribArray(aP)
                gl.disableVertexAttribArray(aPulse)
            }

            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant — offset and size scale together — so
        // this is safe on a zoomed Framer canvas where absolute px are not.
        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            ptrRef.current.tx = clampN((e.clientX - r.left) / r.width, 0, 1) - 0.5
            ptrRef.current.ty = 0.5 - clampN((e.clientY - r.top) / r.height, 0, 1)
        }
        const onLeave = () => {
            ptrRef.current.tx = -10
            ptrRef.current.ty = -10
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
