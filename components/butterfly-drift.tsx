"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const MAX_COUNT = 140
const VERTS_PER_BUG = 6
const FLOATS_PER_VERT = 12
const STRIDE = FLOATS_PER_VERT * 4
const TAU = Math.PI * 2

const SPAN = 0.042 // world half-extent of one butterfly at Size 100
const CRUISE = 0.075 // world units per second of forward flight at Speed 50
const FLAP_HZ = 5.5 // wingbeats per second at Flap 50
const PUSH = 2.6 // world units per second squared of flee thrust at Hover 100
const BOB = 0.55 // sideways sway per wingbeat, as a share of cruise
const CLOCK_WRAP = 600

// Corner pairs of the sprite quad, in local units.
const CORNERS = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]

const VERT_SRC = `
attribute vec2 a_corner;
attribute vec2 a_center;
attribute vec2 a_dir;
attribute vec4 a_ext;   // x: half-extent (world)  y: wing fold  z: seed  w: blur (device px)
attribute vec2 a_shade; // x: alpha  y: colour tint

uniform vec2  uHalf;   // world half-extents: (aspect * 0.5, 0.5)
uniform float uPxUnit; // device pixels per world unit

varying vec2  v_local;
varying float v_fold;
varying float v_seed;
varying float v_aa;
varying vec2  v_shade;

void main() {
    v_local = a_corner;
    v_fold = a_ext.y;
    v_seed = a_ext.z;
    v_shade = a_shade;

    // Local +y runs along the heading, local +x across it.
    vec2 right = vec2(a_dir.y, -a_dir.x);
    vec2 world = a_center + (a_corner.x * right + a_corner.y * a_dir) * a_ext.x;

    // Edge softness, in LOCAL units: one device pixel across the sprite, widened
    // by this sprite's depth-of-field term. One local unit is a_ext.x world units.
    float px = max(a_ext.x * uPxUnit, 1.0);
    v_aa = (1.0 + a_ext.w) / px;

    gl_Position = vec4(world / uHalf, 0.0, 1.0);
}
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 uBase;
uniform vec3 uAccent;

varying vec2  v_local;
varying float v_fold;
varying float v_seed;
varying float v_aa;
varying vec2  v_shade;

float hash11(float n) { return fract(sin(n * 78.233) * 43758.5453123); }

vec2 rot(vec2 p, float a) {
    float c = cos(a), s = sin(a);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

// Scaled ellipse field: negative inside, roughly metric near the boundary.
float sdEllipse(vec2 p, vec2 c, vec2 r) {
    vec2 q = (p - c) / r;
    return (length(q) - 1.0) * min(r.x, r.y);
}

// A p-norm lobe. p below 2 pulls the ends into points, which is the difference
// between a wing and a disc; p above 2 rounds them off for the hindwing.
float sdLobe(vec2 p, vec2 c, vec2 r, float ang, float e) {
    vec2 q = abs(rot(p - c, -ang) / r) + 1e-4;
    return (pow(pow(q.x, e) + pow(q.y, e), 1.0 / e) - 1.0) * min(r.x, r.y);
}

float sdSeg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

void main() {
    vec2 p = v_local;
    float fold = max(v_fold, 0.08);

    // The wing pair is mirror symmetric, so it is solved once in a half-space.
    // Dividing x by the fold is the wingbeat: the shape is unchanged, the space
    // it is measured in narrows toward the body as the wings lift.
    vec2 w = vec2(abs(p.x) / fold, p.y);

    // Forewing: a long pointed lobe swept up and out. Hindwing: shorter, round,
    // swept down. Both are seated ON the body so the pair is one wing mass and
    // not two floating blobs.
    float dFore = sdLobe(w, vec2(0.40, 0.28), vec2(0.46, 0.21), 0.60, 1.38);
    float dHind = sdLobe(w, vec2(0.26, -0.24), vec2(0.32, 0.22), -0.80, 2.0);
    // Both lobes taper to a POINT at the hinge, so on their own they meet at one
    // pixel and read as two loose petals. A root oval that both overlap is what
    // makes the pair one wing.
    float dRoot = sdLobe(w, vec2(0.16, 0.01), vec2(0.23, 0.29), 0.0, 2.0);
    float dWing = smin(smin(dFore, dHind, 0.03), dRoot, 0.05);

    float dBody = sdEllipse(p, vec2(0.0, -0.16), vec2(0.030, 0.28));
    dBody = smin(dBody, sdEllipse(p, vec2(0.0, 0.17), vec2(0.048, 0.14)), 0.04);
    dBody = smin(dBody, length(p - vec2(0.0, 0.33)) - 0.042, 0.03);

    vec2 ap = vec2(abs(p.x), p.y);
    float dAnt = sdSeg(ap, vec2(0.02, 0.36), vec2(0.12, 0.57)) - 0.008;
    dAnt = min(dAnt, length(ap - vec2(0.131, 0.593)) - 0.018);

    float aa = v_aa;
    float wingA = 1.0 - smoothstep(-aa, aa, dWing);
    float bodyA = 1.0 - smoothstep(-aa, aa, dBody);
    float antA = 1.0 - smoothstep(-aa, aa, dAnt);

    float cover = max(max(wingA, bodyA), antA * 0.9);
    if (cover < 0.004) discard;

    // The outline must beat the PAGE, not just the wing: an ink close to the
    // background turns a thin dark border into a soft glow and the silhouette
    // stops reading at all.
    vec3 ink = uBase * 0.38;
    vec3 bodyInk = uBase * 0.20;

    // Wing wash runs out from the hinge, so the colour follows the wing rather
    // than the sprite box.
    vec2 hq = w - vec2(0.04, 0.05);
    float rad = length(hq);
    float t = smoothstep(0.16, 0.74, rad);
    vec3 wing = mix(uBase, uAccent, clamp(t * 0.95 + v_shade.y * 0.25 - 0.12, 0.0, 1.0));

    // Veins fan from the hinge; they fade out near it, where they would converge
    // into a single dark knot.
    float va = atan(hq.y, max(hq.x, 1e-4));
    float vein = 1.0 - smoothstep(0.0, 0.06, abs(fract(va * 1.45 + 0.5) - 0.5) * 2.0);
    wing = mix(wing, ink, vein * 0.30 * smoothstep(0.12, 0.45, rad));

    // Dark border, measured on the wing field itself so it follows the outline.
    // It stays THIN: a wide dark band on a dark page reads as a soft glow, not
    // as an outline, and the whole silhouette goes to mush.
    float rim = smoothstep(-0.055, -0.004, dWing);

    // Spots live in the forewing's own unit space, so they cannot drift off it.
    vec2 qf = rot(w - vec2(0.40, 0.28), -0.60) / vec2(0.46, 0.21);
    float spots = 0.0;
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        float sd = v_seed * 97.0 + fi * 11.0;
        vec2 sc = vec2(-0.30 + 1.05 * hash11(sd), -0.55 + 1.10 * hash11(sd + 4.7));
        spots = max(spots, 1.0 - smoothstep(0.0, 0.06, length(qf - sc) - 0.13));
    }
    spots *= step(dWing, 0.0);

    vec3 col = mix(wing, ink, clamp(rim * 0.9 + spots * 0.5, 0.0, 1.0));
    // A slight cross-span gradient so the mirrored halves do not read as a decal.
    col *= 1.0 + 0.12 * p.x;
    // Folded wings are edge-on to the light.
    col *= mix(0.72, 1.0, fold);

    col = mix(col, bodyInk, bodyA);
    col = mix(col, bodyInk, antA * 0.9);

    float a = cover * v_shade.x;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0) * a, a);
}
`

type Swarm = {
    x: Float32Array
    y: Float32Array
    vx: Float32Array
    vy: Float32Array
    dx: Float32Array
    dy: Float32Array
    th: Float32Array
    ph: Float32Array
    k1: Float32Array
    k2: Float32Array
    rate: Float32Array
    spd: Float32Array
    seed: Float32Array
    z: Float32Array
    panic: Float32Array
    order: Int32Array
    ordered: number
    bx: number
    by: number
}

function makeSwarm(): Swarm {
    const f = () => new Float32Array(MAX_COUNT)
    const sw: Swarm = {
        x: f(), y: f(), vx: f(), vy: f(), dx: f(), dy: f(),
        th: f(), ph: f(), k1: f(), k2: f(), rate: f(), spd: f(),
        seed: f(), z: f(), panic: f(),
        order: new Int32Array(MAX_COUNT), ordered: -1, bx: 0, by: 0,
    }
    // Deterministic init: identical on the canvas and in the preview, and
    // identical across probe runs, which a Math.random() seed would not be.
    let s = 0x2f6e2b1 >>> 0
    const rnd = () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0
        return s / 4294967296
    }
    for (let i = 0; i < MAX_COUNT; i++) {
        sw.th[i] = rnd() * TAU
        sw.ph[i] = rnd() * TAU
        sw.k1[i] = rnd() * TAU
        sw.k2[i] = rnd() * TAU
        sw.rate[i] = rnd()
        sw.spd[i] = 0.75 + rnd() * 0.5
        sw.seed[i] = rnd()
        // A low-discrepancy depth, not a random one, so ANY prefix of the array
        // still spans the full range — Density draws the first n and must not
        // hand back a swarm that is all far or all near. sqrt(3)-1 here, and two
        // other badly-approximable constants for x and y in place(), so depth is
        // uncorrelated with position.
        sw.z[i] = (((i + 1) * 0.7320508075688772) % 1)
        sw.dx[i] = Math.cos(sw.th[i])
        sw.dy[i] = Math.sin(sw.th[i])
    }
    return sw
}

// Low-discrepancy placement, so the first frame is already an even scatter.
// NOT the 2D R2 sequence: its constants are near 3/4 and 4/7, so each axis on its
// own combs into four phases and leaves empty stripes at the counts Density
// actually uses (n=34 put ZERO butterflies in four of twelve columns). The golden
// ratio and sqrt(2)-1 are badly approximable, so every prefix fills every column.
function place(sw: Swarm, bx: number, by: number) {
    for (let i = 0; i < MAX_COUNT; i++) {
        sw.x[i] = (((i + 1) * 0.6180339887498949) % 1) * 2 * bx - bx
        sw.y[i] = (((i + 1) * 0.41421356237309503) % 1) * 2 * by - by
    }
    sw.bx = bx
    sw.by = by
}

function reorder(sw: Swarm, n: number) {
    const idx: number[] = []
    for (let i = 0; i < n; i++) idx.push(i)
    idx.sort((a, b) => sw.z[a] - sw.z[b]) // far first: painter's order
    for (let i = 0; i < n; i++) sw.order[i] = idx[i]
    sw.ordered = n
}

function parseColor(input: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!input) return fb
    const str = String(input).trim()
    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
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
        console.error("ButterflyDrift shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

interface ButterflyDriftProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    size?: number
    speed?: number
    flap?: number
    wander?: number
    depth?: number
    blur?: number
    hover?: number
    reach?: number
    vignette?: number
    width?: number
    height?: number
}

export default function ButterflyDrift(props: ButterflyDriftProps) {
    const {
        style,
        background = "#0A0D12",
        baseColor = "#00FFE8",
        accentColor = "#0046FF",
        density = 140,
        size = 50,
        speed = 100,
        flap = 8,
        wander = 20,
        depth = 100,
        blur = 0,
        hover = 140,
        reach = 20,
        vignette = 100,
        width,
        height,
    } = props

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const vRef = useRef({
        baseColor,
        accentColor,
        count: 34,
        span: SPAN,
        speed: 1,
        flap: 1,
        wander: 0.55,
        depth: 0.6,
        blur: 1,
        hover: 1,
        reach: 0.3,
    })
    vRef.current = {
        baseColor,
        accentColor,
        count: Math.round(clampN(num(density, 34), 4, MAX_COUNT)),
        span: SPAN * (clampN(num(size, 100), 20, 400) / 100),
        speed: clampN(num(speed, 50), 0, 100) / 50,
        flap: clampN(num(flap, 50), 0, 100) / 50,
        wander: clampN(num(wander, 55), 0, 100) / 100,
        depth: clampN(num(depth, 60), 0, 100) / 100,
        blur: clampN(num(blur, 100), 0, 300) / 100,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        reach: clampN(num(reach, 30), 0, 100) / 100,
    }

    const ptrRef = useRef({ x: 0, y: 0, on: 0, onTarget: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl", { antialias: false, alpha: true, depth: false })
        if (!gl) {
            console.error("ButterflyDrift: WebGL unavailable")
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
            console.error("ButterflyDrift link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const data = new Float32Array(MAX_COUNT * VERTS_PER_BUG * FLOATS_PER_VERT)
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW)

        const attr = (name: string, n: number, offset: number) => {
            const loc = gl.getAttribLocation(prog, name)
            if (loc < 0) {
                console.error("ButterflyDrift: missing attribute", name)
                return
            }
            gl.enableVertexAttribArray(loc)
            gl.vertexAttribPointer(loc, n, gl.FLOAT, false, STRIDE, offset * 4)
        }
        attr("a_corner", 2, 0)
        attr("a_center", 2, 2)
        attr("a_dir", 2, 4)
        attr("a_ext", 4, 6)
        attr("a_shade", 2, 10)

        const locs: Record<string, WebGLUniformLocation | null> = {}
        const u = (name: string) => {
            if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name)
            return locs[name]
        }

        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        // Premultiplied source-over: the sprites are ordered far to near, so the
        // near ones must occlude rather than sum.
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        gl.clearColor(0, 0, 0, 0)

        const sw = makeSwarm()
        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current

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

            const aspect = bw / bh
            const halfW = aspect * 0.5
            const margin = v.span * 1.4
            const bx = halfW + margin
            const by = 0.5 + margin

            if (sw.bx === 0) {
                place(sw, bx, by)
            } else if (Math.abs(bx - sw.bx) > sw.bx * 0.02) {
                // Keep the scatter proportional when the frame reshapes, instead
                // of leaving a column of butterflies stranded outside the wrap.
                const k = bx / sw.bx
                for (let i = 0; i < MAX_COUNT; i++) sw.x[i] *= k
                sw.bx = bx
            }
            sw.by = by
            if (sw.ordered !== v.count) reorder(sw, v.count)

            const dts = dt * v.speed
            clock = (clock + dts) % CLOCK_WRAP

            const ptr = ptrRef.current
            ptr.on += (ptr.onTarget - ptr.on) * (1 - Math.exp(-6 * dt))

            const reachW = Math.max(1e-4, v.reach * 1.0)
            const spread = v.depth
            const cruise = CRUISE * v.speed
            const flapRate = FLAP_HZ * v.flap * v.speed

            let o = 0
            for (let k = 0; k < v.count; k++) {
                const i = sw.order[k]

                const z = sw.z[i]
                const par = 0.65 + 0.55 * z // near butterflies cross the frame faster

                sw.th[i] +=
                    (Math.sin(clock * 0.9 + sw.k1[i]) * 0.85 + Math.sin(clock * 2.3 + sw.k2[i]) * 0.5) *
                    v.wander *
                    3.0 *
                    dts

                sw.ph[i] += flapRate * (1 + sw.panic[i] * 1.5) * (0.85 + 0.3 * sw.rate[i]) * TAU * dt
                if (sw.ph[i] > TAU * 1024) sw.ph[i] -= TAU * 1024

                const cs = Math.cos(sw.th[i])
                const sn = Math.sin(sw.th[i])
                const drive = cruise * sw.spd[i] * par
                const thrust = 0.55 + 0.75 * Math.max(0, Math.sin(sw.ph[i]))
                const sway = Math.cos(sw.ph[i]) * drive * BOB
                const wantX = cs * drive * thrust - sn * sway
                const wantY = sn * drive * thrust + cs * sway

                const kv = 1 - Math.exp(-3.5 * dt)
                sw.vx[i] += (wantX - sw.vx[i]) * kv
                sw.vy[i] += (wantY - sw.vy[i]) * kv

                if (ptr.on > 0.001 && v.hover > 0) {
                    const ddx = sw.x[i] - ptr.x
                    const ddy = sw.y[i] - ptr.y
                    const d = Math.sqrt(ddx * ddx + ddy * ddy)
                    if (d < reachW) {
                        const f0 = 1 - d / reachW
                        const f = f0 * f0 * ptr.on
                        const inv = 1 / Math.max(d, 1e-4)
                        sw.vx[i] += ddx * inv * PUSH * v.hover * f * dt
                        sw.vy[i] += ddy * inv * PUSH * v.hover * f * dt
                        // Turn the heading outward too, or the butterfly drifts
                        // straight back in once the shove stops.
                        const away = Math.atan2(ddy, ddx)
                        let diff = away - sw.th[i]
                        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
                        sw.th[i] += diff * Math.min(1, f * 7 * dt)
                        if (f > sw.panic[i]) sw.panic[i] = f
                    }
                }
                sw.panic[i] *= Math.exp(-1.2 * dt)

                const spd = Math.sqrt(sw.vx[i] * sw.vx[i] + sw.vy[i] * sw.vy[i])
                const maxSpd = drive * (1.8 + 6 * sw.panic[i]) + 1e-6
                if (spd > maxSpd) {
                    const s = maxSpd / spd
                    sw.vx[i] *= s
                    sw.vy[i] *= s
                }

                sw.x[i] += sw.vx[i] * dt
                sw.y[i] += sw.vy[i] * dt

                if (sw.x[i] > bx) sw.x[i] -= 2 * bx
                else if (sw.x[i] < -bx) sw.x[i] += 2 * bx
                if (sw.y[i] > by) sw.y[i] -= 2 * by
                else if (sw.y[i] < -by) sw.y[i] += 2 * by

                // Heading of the drawn sprite follows the actual velocity, damped,
                // so a shove visibly turns the butterfly instead of sliding it.
                const vl = Math.sqrt(sw.vx[i] * sw.vx[i] + sw.vy[i] * sw.vy[i])
                const tx = vl > 1e-5 ? sw.vx[i] / vl : cs
                const ty = vl > 1e-5 ? sw.vy[i] / vl : sn
                const kd = 1 - Math.exp(-9 * dt)
                sw.dx[i] += (tx - sw.dx[i]) * kd
                sw.dy[i] += (ty - sw.dy[i]) * kd
                const dl = Math.sqrt(sw.dx[i] * sw.dx[i] + sw.dy[i] * sw.dy[i]) || 1
                sw.dx[i] /= dl
                sw.dy[i] /= dl

                // A cosine spends most of its time at the extremes, so a raw one leaves half
                // the field edge-on and reading as debris. The power biases the beat open.
                const fold = 0.24 + 0.76 * Math.pow(0.5 + 0.5 * Math.cos(sw.ph[i]), 0.62)
                const half = v.span * (1 + (z - 0.5) * spread * 0.9)
                const far = 1 - z
                const alpha = 1 - spread * 0.6 * far
                const blurPx = v.blur * 4 * far * far * spread

                for (let c = 0; c < VERTS_PER_BUG; c++) {
                    data[o] = CORNERS[c * 2]
                    data[o + 1] = CORNERS[c * 2 + 1]
                    data[o + 2] = sw.x[i]
                    data[o + 3] = sw.y[i]
                    data[o + 4] = sw.dx[i]
                    data[o + 5] = sw.dy[i]
                    data[o + 6] = half
                    data[o + 7] = fold
                    data[o + 8] = sw.seed[i]
                    data[o + 9] = blurPx
                    data[o + 10] = alpha
                    data[o + 11] = sw.seed[i]
                    o += FLOATS_PER_VERT
                }
            }

            const base = parseColor(v.baseColor, [0.91, 0.459, 0.169])
            const accent = parseColor(v.accentColor, [1, 0.851, 0.627])
            gl.uniform2f(u("uHalf"), halfW, 0.5)
            gl.uniform1f(u("uPxUnit"), bh)
            gl.uniform3f(u("uBase"), base[0], base[1], base[2])
            gl.uniform3f(u("uAccent"), accent[0], accent[1], accent[2])

            gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, o))
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLES, 0, v.count * VERTS_PER_BUG)
            raf = requestAnimationFrame(render)
        }

        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            // A ratio of clientX against the same rect is zoom independent, which
            // the rect's own width is not.
            const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
            const fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))
            const aspect = canvas.width / Math.max(1, canvas.height)
            ptrRef.current.x = (fx - 0.5) * aspect
            ptrRef.current.y = 0.5 - fy
            ptrRef.current.onTarget = 1
        }
        const onLeave = () => {
            ptrRef.current.onTarget = 0
        }

        canvas.addEventListener("pointermove", track)
        canvas.addEventListener("pointerenter", track)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointercancel", onLeave)
        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", track)
            canvas.removeEventListener("pointerenter", track)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointercancel", onLeave)
        }
    }, [])

    const vig = clampN(num(vignette, 35), 0, 100) / 100

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
            {vig > 0 ? (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: `radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 34%, rgba(0,0,0,${vig.toFixed(3)}) 100%)`,
                    }}
                />
            ) : null}
        </div>
    )
}
