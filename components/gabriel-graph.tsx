"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * GABRIEL GRAPH — random points on a sphere joined by their Gabriel graph,
 * every edge drawn as a thin outlined box, the whole shell turning slowly
 * about the vertical axis. Drag to orbit.
 *
 * PORTED FROM openprocessing.org/sketch/2775931 (neill's study fork of Naoki
 * Tsutae's "Gabriel Graph (3D)", p5 1.11 WEBGL). Same maths, same look:
 *
 *   - POINTS: `p5.Vector.random3D()` scaled to radius 300, reproduced
 *     draw-for-draw (angle = rnd*2PI, z = rnd*2-1) on a seeded RNG so the
 *     canvas and the preview show the same graph.
 *   - EDGES: pair (a,b) is an edge when no other point lies strictly inside
 *     the sphere whose diameter is ab — the reference's exact test. The
 *     reference brute-forces every third point for every pair (O(n^3), ~500M
 *     checks at its 1000-point max); here each point's neighbours are sorted
 *     by distance and only those closer to a than b is are tested, because
 *     anything inside that ball is. Same edge set, a few ms.
 *   - EACH EDGE: `box(8, len, 8)` placed with translate(mid) · rotateY(atan2(
 *     dx,dz)) · rotateX(acos(dy/len)) — rebuilt in the vertex shader in that
 *     order, so the square cross-section sits at the same roll the sketch
 *     gives it. Unlit (the sketch calls no lights()), so each face is its flat
 *     palette colour, with p5's dark 1px stroke on every box edge. The stroke
 *     is drawn in the fragment shader from the box-local coordinate — a band
 *     measured in screen px via fwidth — so it is depth-correct for free and
 *     costs no second pass.
 *   - CAMERA: p5's default — eye at z 800, fov 2·atan(H/2/800), y DOWN the
 *     screen (the flip is in the projection). The frame is referenced to an
 *     800px-tall canvas and scales with the host's height, so the sphere
 *     frames the same at any size (the sketch's is fixed in px).
 *   - ORBIT: p5's orbitControl, verbatim — velocity += drag/minSide·0.6 per
 *     frame, damping 0.85 per frame, applied through p5's `_orbit` (which
 *     flips `up` when the camera passes a pole). Made frame-rate independent.
 *   - SPIN: rotateY(t · 2PI · 0.01) — 0.01 turns per second is Speed 50.
 *
 * KEYBOARD → PANEL. The sketch's keys become controls: `-`/`=` is Density,
 * `r` is Seed, `c` is the Palette (set all five to white for the uncoloured
 * look), `i` is Inner, `1` is Nodes. `2` (hide edges) is dropped: with nodes
 * off it renders a blank frame. Wheel zoom and right-drag pan are dropped: on
 * a page they would hijack scroll. `s` (save PNG) is not a design control.
 *
 * ARCHITECTURE — rule 6/8: WebGL2 context built once in useEffect([]), every
 * live input read from a ref inside a raw rAF loop, instanced boxes in one
 * draw call. Density / Seed rebuild the instance buffer, never the context;
 * Size, Thickness, colours and Inner are uniforms or draw counts. No
 * loseContext() in cleanup.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

/* --------------------------------------------------------------- constants */

const DPR_CAP = 2
/** p5's default camera distance; the frame is referenced to an 800px canvas. */
const EYE_Z = 800
const REF_H = 800
/** Sketch radius (px at the reference height) and box thickness. */
const SPHERE_R = 300
const BOX_T = 8
/** 0.01 turns per second at Speed 50. */
const TURNS_PER_SEC = 0.01
/** p5 orbitControl constants (per 60fps frame). */
const ORBIT_ACCEL = 0.6
const ORBIT_DAMP = 0.85
/** p5 strokeWeight(1) outline, CSS px, per face (two faces meet at an edge). */
const OUTLINE_PX = 0.75
/** strokeWeight(20) node dots, CSS px at the reference height. */
const NODE_PX = 20
const PALETTE_SIZE = 5

/* -------------------------------------------------------------- graph maths */

type Graph = {
    /** Unit-sphere points, xyz packed. */
    points: Float32Array
    /** Per edge: ax ay az bx by bz colourIndex. */
    edges: Float32Array
    edgeCount: number
}

function mulberry32(seed: number) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** p5.Vector.random3D(), draw for draw. */
function randomSpherePoints(n: number, rnd: () => number): Float32Array {
    const out = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
        const angle = rnd() * Math.PI * 2
        const vz = rnd() * 2 - 1
        const base = Math.sqrt(1 - vz * vz)
        out[i * 3] = base * Math.cos(angle)
        out[i * 3 + 1] = base * Math.sin(angle)
        out[i * 3 + 2] = vz
    }
    return out
}

/**
 * Gabriel edges: (a,b) survives when no other point is strictly inside the
 * ball with diameter ab. Any such point is closer to a than b is (it lies
 * within |ab| of a), so only a's nearer neighbours are tested, nearest first.
 */
function gabrielEdges(p: Float32Array, n: number, rnd: () => number) {
    const d2 = new Float64Array(n * n)
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const dx = p[i * 3] - p[j * 3]
            const dy = p[i * 3 + 1] - p[j * 3 + 1]
            const dz = p[i * 3 + 2] - p[j * 3 + 2]
            const v = dx * dx + dy * dy + dz * dz
            d2[i * n + j] = v
            d2[j * n + i] = v
        }
    }
    const order: Int32Array[] = []
    for (let i = 0; i < n; i++) {
        const idx = Array.from({ length: n }, (_, k) => k)
        idx.sort((x, y) => d2[i * n + x] - d2[i * n + y])
        order.push(Int32Array.from(idx))
    }
    const edges: number[] = []
    for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
            const ab = d2[a * n + b]
            const mx = (p[a * 3] + p[b * 3]) * 0.5
            const my = (p[a * 3 + 1] + p[b * 3 + 1]) * 0.5
            const mz = (p[a * 3 + 2] + p[b * 3 + 2]) * 0.5
            const r2 = ab * 0.25
            const list = order[a]
            let ok = true
            for (let q = 0; q < n; q++) {
                const k = list[q]
                if (d2[a * n + k] >= ab) break
                if (k === a || k === b) continue
                const ex = p[k * 3] - mx
                const ey = p[k * 3 + 1] - my
                const ez = p[k * 3 + 2] - mz
                if (ex * ex + ey * ey + ez * ez < r2) {
                    ok = false
                    break
                }
            }
            if (ok) {
                edges.push(
                    p[a * 3], p[a * 3 + 1], p[a * 3 + 2],
                    p[b * 3], p[b * 3 + 1], p[b * 3 + 2],
                    Math.floor(rnd() * PALETTE_SIZE)
                )
            }
        }
    }
    return new Float32Array(edges)
}

function buildGraph(n: number, seed: number): Graph {
    const rnd = mulberry32(seed)
    const points = randomSpherePoints(n, rnd)
    const edges = gabrielEdges(points, n, rnd)
    return { points, edges, edgeCount: edges.length / 7 }
}

/* ------------------------------------------------------------- camera maths */

type Vec3 = [number, number, number]

const cross = (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const norm = (a: Vec3): Vec3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1
    return [a[0] / l, a[1] / l, a[2] / l]
}

type Cam = { eye: Vec3; up: Vec3 }

/** p5 Camera._orbit(dTheta, dPhi, 0) about the origin. */
function orbit(cam: Cam, dTheta: number, dPhi: number) {
    const r = Math.hypot(cam.eye[0], cam.eye[1], cam.eye[2])
    const front = norm(cam.eye)
    const up = norm(cam.up)
    const side = norm(cross(up, front))
    const vertical = cross(side, up)
    const phi = Math.acos(Math.max(-1, Math.min(1, dot(front, up)))) + dPhi
    if (phi <= 0 || phi >= Math.PI) {
        cam.up = [-cam.up[0], -cam.up[1], -cam.up[2]]
    }
    const cp = Math.cos(phi)
    const vs = Math.cos(dTheta) * Math.sin(phi)
    const ss = Math.sin(dTheta) * Math.sin(phi)
    cam.eye = [
        r * (up[0] * cp + vertical[0] * vs + side[0] * ss),
        r * (up[1] * cp + vertical[1] * vs + side[1] * ss),
        r * (up[2] * cp + vertical[2] * vs + side[2] * ss),
    ]
}

/** p5 perspective (y flipped) × lookAt(eye, origin, up), column-major. */
function viewProj(cam: Cam, aspect: number, out: Float32Array) {
    const f = 1 / Math.tan(Math.atan(REF_H / 2 / EYE_Z))
    const near = EYE_Z * 0.1
    const far = EYE_Z * 10
    const z = norm(cam.eye)
    const x = norm(cross(cam.up, z))
    const y = cross(z, x)
    const e = cam.eye
    // View rows: x, y, z; translation -dot(axis, eye).
    const v = [
        x[0], y[0], z[0], 0,
        x[1], y[1], z[1], 0,
        x[2], y[2], z[2], 0,
        -dot(x, e), -dot(y, e), -dot(z, e), 1,
    ]
    const p = [
        f / aspect, 0, 0, 0,
        0, -f, 0, 0,
        0, 0, (far + near) / (near - far), -1,
        0, 0, (2 * far * near) / (near - far), 0,
    ]
    for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
            let s = 0
            for (let k = 0; k < 4; k++) s += p[k * 4 + r] * v[c * 4 + k]
            out[c * 4 + r] = s
        }
    }
}

/* ------------------------------------------------------------------ colour */

function parseColor(input: string | undefined, fallback: [number, number, number]) {
    if (!input) return fallback
    const s = input.trim()
    if (s.startsWith("#")) {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!Number.isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as [number, number, number]
        }
        return fallback
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat)
        if (parts.length >= 3 && parts.slice(0, 3).every((v) => !Number.isNaN(v))) {
            return [parts[0] / 255, parts[1] / 255, parts[2] / 255] as [number, number, number]
        }
    }
    return fallback
}

/* ----------------------------------------------------------------- shaders */

const BOX_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;   // unit cube, +-0.5
layout(location=1) in vec3 aMask;  // 1 on the two axes the face spans
layout(location=2) in vec3 aA;
layout(location=3) in vec3 aB;
layout(location=4) in float aCol;
uniform mat4 uVP;
uniform vec2 uSpin;      // cos, sin of the rotateY spin
uniform float uRadius;
uniform float uThick;
uniform vec3 uPalette[5];
out vec3 vLocal;
flat out vec3 vMask;
flat out vec3 vHalf;
flat out vec3 vColor;
void main() {
    vec3 a = aA * uRadius;
    vec3 b = aB * uRadius;
    vec3 mid = 0.5 * (a + b);
    vec3 dir = b - a;
    float len = max(length(dir), 1e-4);
    float ay = atan(dir.x, dir.z);
    float ax = acos(clamp(dir.y / len, -1.0, 1.0));
    vec3 dims = vec3(uThick, len, uThick);
    vec3 q = aPos * dims;
    // rotateX(ax)
    float cx = cos(ax), sx = sin(ax);
    q = vec3(q.x, cx * q.y - sx * q.z, sx * q.y + cx * q.z);
    // rotateY(ay)
    float cy = cos(ay), sy = sin(ay);
    q = vec3(cy * q.x + sy * q.z, q.y, -sy * q.x + cy * q.z);
    vec3 w = mid + q;
    // spin: rotateY(t)
    w = vec3(uSpin.x * w.x + uSpin.y * w.z, w.y, -uSpin.y * w.x + uSpin.x * w.z);
    gl_Position = uVP * vec4(w, 1.0);
    vLocal = aPos * dims;
    vMask = aMask;
    vHalf = 0.5 * dims;
    vColor = uPalette[int(aCol + 0.5)];
}
`

const BOX_FS = `#version 300 es
precision highp float;
in vec3 vLocal;
flat in vec3 vMask;
flat in vec3 vHalf;
flat in vec3 vColor;
uniform vec3 uStroke;
uniform float uLine;     // outline width, device px
out vec4 o;
void main() {
    // Distance to the face's border along each spanned axis, in device px.
    vec3 e = (vHalf - abs(vLocal)) / max(fwidth(vLocal), vec3(1e-6));
    e = mix(vec3(1e6), e, vMask);
    float d = min(min(e.x, e.y), e.z);
    float ink = 1.0 - smoothstep(uLine - 0.5, uLine + 0.5, d);
    o = vec4(mix(vColor, uStroke, ink), 1.0);
}
`

const DOT_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aP;
uniform mat4 uVP;
uniform vec2 uSpin;
uniform float uRadius;
uniform float uSize;
void main() {
    vec3 w = aP * uRadius;
    w = vec3(uSpin.x * w.x + uSpin.y * w.z, w.y, -uSpin.y * w.x + uSpin.x * w.z);
    gl_Position = uVP * vec4(w, 1.0);
    gl_PointSize = uSize;
}
`

const DOT_FS = `#version 300 es
precision highp float;
uniform vec3 uStroke;
out vec4 o;
void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float r = length(c);
    float aa = fwidth(r);
    if (r > 1.0 + aa) discard;
    o = vec4(uStroke, 1.0);
}
`

/** Unit cube: 6 faces × 2 triangles, each vertex pos + span mask. */
function cubeData(): Float32Array {
    const out: number[] = []
    for (let axis = 0; axis < 3; axis++) {
        for (const s of [-0.5, 0.5]) {
            const u = (axis + 1) % 3
            const v = (axis + 2) % 3
            const corners = [
                [-0.5, -0.5], [0.5, -0.5], [0.5, 0.5],
                [-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5],
            ]
            for (const [cu, cv] of corners) {
                const p = [0, 0, 0]
                p[axis] = s
                p[u] = cu
                p[v] = cv
                const m = [1, 1, 1]
                m[axis] = 0
                out.push(p[0], p[1], p[2], m[0], m[1], m[2])
            }
        }
    }
    return new Float32Array(out)
}

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
    const prog = gl.createProgram()!
    for (const [type, src] of [
        [gl.VERTEX_SHADER, vs],
        [gl.FRAGMENT_SHADER, fs],
    ] as const) {
        const sh = gl.createShader(type)!
        gl.shaderSource(sh, src)
        gl.compileShader(sh)
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error("GabrielGraph shader:", gl.getShaderInfoLog(sh))
        }
        gl.attachShader(prog, sh)
    }
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("GabrielGraph link:", gl.getProgramInfoLog(prog))
    }
    return prog
}

/* --------------------------------------------------------------- component */

type Palette = {
    color1?: string
    color2?: string
    color3?: string
    color4?: string
    color5?: string
}

type Props = {
    background?: string
    baseColor?: string
    palette?: Palette
    density?: number
    thickness?: number
    size?: number
    speed?: number
    direction?: "clockwise" | "counterclockwise"
    inner?: boolean
    nodes?: boolean
    seed?: number
    style?: React.CSSProperties
}

const DEFAULT_PALETTE: Required<Palette> = {
    // Kjetil Golid's "revolucion" (chromotome), the sketch's palette.
    color1: "#ED555D",
    color2: "#FFFCC9",
    color3: "#41B797",
    color4: "#EDA126",
    color5: "#7B5770",
}

export default function GabrielGraph(props: Props) {
    const {
        background = "#000000",
        baseColor = "#531669",
        palette = {"color1":"#ED555D","color2":"#FFFCC9","color3":"#41B797","color4":"#EDA126","color5":"#7B5770"},
        density = 500,
        thickness = 70,
        size = 85,
        speed = 50,
        direction = "clockwise",
        inner = false,
        nodes = false,
        seed = 1,
        style,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const live = useRef({ baseColor, palette, density, thickness, size, speed, direction, inner, nodes, seed })
    live.current = { baseColor, palette, density, thickness, size, speed, direction, inner, nodes, seed }

    useEffect(() => {
        const canvas = canvasRef.current
        const host = hostRef.current
        if (!canvas || !host) return
        const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: true })
        if (!gl) return

        const boxProg = compile(gl, BOX_VS, BOX_FS)
        const dotProg = compile(gl, DOT_VS, DOT_FS)
        const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n)
        const ub = {
            vp: U(boxProg, "uVP"), spin: U(boxProg, "uSpin"), radius: U(boxProg, "uRadius"),
            thick: U(boxProg, "uThick"), palette: U(boxProg, "uPalette"), stroke: U(boxProg, "uStroke"),
            line: U(boxProg, "uLine"),
        }
        const ud = {
            vp: U(dotProg, "uVP"), spin: U(dotProg, "uSpin"), radius: U(dotProg, "uRadius"),
            size: U(dotProg, "uSize"), stroke: U(dotProg, "uStroke"),
        }

        // Box VAO: cube per-vertex, edges per-instance.
        const boxVao = gl.createVertexArray()!
        gl.bindVertexArray(boxVao)
        const cubeBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf)
        gl.bufferData(gl.ARRAY_BUFFER, cubeData(), gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
        const edgeBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, edgeBuf)
        gl.enableVertexAttribArray(2)
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 28, 0)
        gl.vertexAttribDivisor(2, 1)
        gl.enableVertexAttribArray(3)
        gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 28, 12)
        gl.vertexAttribDivisor(3, 1)
        gl.enableVertexAttribArray(4)
        gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 28, 24)
        gl.vertexAttribDivisor(4, 1)

        // Dot VAO: node positions.
        const dotVao = gl.createVertexArray()!
        gl.bindVertexArray(dotVao)
        const dotBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, dotBuf)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
        gl.bindVertexArray(null)

        // Outer graph then inner (half radius, a quarter of the points) in one
        // buffer; Inner only changes the draw count, never the outer graph.
        let builtKey = ""
        let outerEdges = 0
        let allEdges = 0
        let outerPts = 0
        let allPts = 0
        const rebuild = (n: number, s: number) => {
            const outer = buildGraph(n, s)
            const inn = buildGraph(Math.max(2, Math.ceil(n / 4)), s + 7919)
            const half = (a: Float32Array, stride: number, cols: number) => {
                const c = a.slice()
                for (let i = 0; i < c.length; i += stride) {
                    for (let k = 0; k < cols; k++) c[i + k] *= 0.5
                }
                return c
            }
            const innerEdgesData = half(inn.edges, 7, 6)
            const innerPts = half(inn.points, 3, 3)
            const e = new Float32Array(outer.edges.length + innerEdgesData.length)
            e.set(outer.edges)
            e.set(innerEdgesData, outer.edges.length)
            const p = new Float32Array(outer.points.length + innerPts.length)
            p.set(outer.points)
            p.set(innerPts, outer.points.length)
            gl.bindBuffer(gl.ARRAY_BUFFER, edgeBuf)
            gl.bufferData(gl.ARRAY_BUFFER, e, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, dotBuf)
            gl.bufferData(gl.ARRAY_BUFFER, p, gl.STATIC_DRAW)
            outerEdges = outer.edgeCount
            allEdges = outer.edgeCount + inn.edgeCount
            outerPts = outer.points.length / 3
            allPts = p.length / 3
        }

        // Orbit state — p5 orbitControl.
        const cam: Cam = { eye: [0, 0, EYE_Z], up: [0, 1, 0] }
        let velT = 0
        let velP = 0
        let pendX = 0
        let pendY = 0
        let dragging = false
        let lastX = 0
        let lastY = 0
        const onDown = (ev: PointerEvent) => {
            if (ev.button !== 0) return
            dragging = true
            lastX = ev.clientX
            lastY = ev.clientY
        }
        const onMove = (ev: PointerEvent) => {
            if (!dragging) return
            pendX += ev.clientX - lastX
            pendY += ev.clientY - lastY
            lastX = ev.clientX
            lastY = ev.clientY
        }
        const onUp = () => {
            dragging = false
        }
        host.addEventListener("pointerdown", onDown)
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const vp = new Float32Array(16)
        const pal = new Float32Array(PALETTE_SIZE * 3)
        let spin = 0
        let last = -1
        let raf = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000)
            last = now
            const L = live.current

            const n = Math.max(10, Math.min(1000, Math.round(L.density ?? 360)))
            const s = Math.round(L.seed ?? 1)
            const key = n + ":" + s
            if (key !== builtKey) {
                builtKey = key
                rebuild(n, s)
            }

            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const cw = canvas.clientWidth
            const ch = canvas.clientHeight
            if (cw < 1 || ch < 1) return
            const bw = Math.round(cw * dpr)
            const bh = Math.round(ch * dpr)
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }

            // Orbit: impulse from this frame's drag, then p5's per-frame decay.
            const f = dt * 60
            const minSide = Math.min(cw, ch)
            if (pendX !== 0 || pendY !== 0) {
                velT += (-pendX / minSide) * ORBIT_ACCEL
                velP += (pendY / minSide) * ORBIT_ACCEL
                pendX = 0
                pendY = 0
            }
            if (velT * velT + velP * velP > 1e-6) {
                orbit(cam, velT * f, velP * f)
                const k = Math.pow(ORBIT_DAMP, f)
                velT *= k
                velP *= k
            } else {
                velT = 0
                velP = 0
            }

            const dirSign = L.direction === "counterclockwise" ? -1 : 1
            spin += dt * Math.PI * 2 * TURNS_PER_SEC * ((L.speed ?? 50) / 50) * dirSign
            spin %= Math.PI * 2
            viewProj(cam, cw / ch, vp)

            const P = { ...DEFAULT_PALETTE, ...(L.palette || {}) }
            const cols = [P.color1, P.color2, P.color3, P.color4, P.color5]
            const fallback = [DEFAULT_PALETTE.color1, DEFAULT_PALETTE.color2, DEFAULT_PALETTE.color3, DEFAULT_PALETTE.color4, DEFAULT_PALETTE.color5]
            for (let i = 0; i < PALETTE_SIZE; i++) {
                const c = parseColor(cols[i], parseColor(fallback[i], [1, 1, 1]))
                pal[i * 3] = c[0]
                pal[i * 3 + 1] = c[1]
                pal[i * 3 + 2] = c[2]
            }
            const stroke = parseColor(L.baseColor, [0.118, 0.118, 0.118])
            const radius = SPHERE_R * ((L.size ?? 100) / 100)
            const thick = BOX_T * ((L.thickness ?? 100) / 100)
            // World units are px at REF_H; a device px is this many world units.
            const pxScale = (bh / REF_H)

            gl.viewport(0, 0, bw, bh)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LEQUAL)

            const edgeCount = L.inner ? allEdges : outerEdges
            if (edgeCount > 0) {
                gl.useProgram(boxProg)
                gl.uniformMatrix4fv(ub.vp, false, vp)
                gl.uniform2f(ub.spin, Math.cos(spin), Math.sin(spin))
                gl.uniform1f(ub.radius, radius)
                gl.uniform1f(ub.thick, thick)
                gl.uniform3fv(ub.palette, pal)
                gl.uniform3f(ub.stroke, stroke[0], stroke[1], stroke[2])
                gl.uniform1f(ub.line, OUTLINE_PX * dpr)
                gl.bindVertexArray(boxVao)
                gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, edgeCount)
            }
            if (L.nodes) {
                gl.useProgram(dotProg)
                gl.uniformMatrix4fv(ud.vp, false, vp)
                gl.uniform2f(ud.spin, Math.cos(spin), Math.sin(spin))
                gl.uniform1f(ud.radius, radius)
                gl.uniform1f(ud.size, NODE_PX * pxScale)
                gl.uniform3f(ud.stroke, stroke[0], stroke[1], stroke[2])
                gl.bindVertexArray(dotVao)
                gl.drawArrays(gl.POINTS, 0, L.inner ? allPts : outerPts)
            }
            gl.bindVertexArray(null)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            host.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                ...style,
                background,
                overflow: "hidden",
                // orbitControl sets touch-action: none on its canvas.
                touchAction: "none",
                cursor: "grab",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}

GabrielGraph.displayName = "Gabriel Graph"
