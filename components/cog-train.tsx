"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2 // quality tier, not a design control (rule 10)
const TAU = Math.PI * 2

// Tooth profile. Cleared by the swept interference probe; see the header.
const N_MID = 16 // tooth count of a cog whose radius is exactly Size
const N_MIN = 9
const N_MAX = 44
const CREST = 0.22 // crest fraction of a tooth period
const ROOT = 0.6 // root fraction
const DEDENDUM = 1.3 // root is this much deeper than the crest is tall
const ADD_MAX = 0.95 // addendum ceiling, in modules, at Tooth Depth 100

const V_REF = 18 // pitch-line velocity in px/s at Speed 50

// Crank feel. All frozen constants, not dials (rule 1): Hover is the one dial,
// and these are what it scales.
const VEL_REF = 1200 // pointer px/s that counts as a full-strength sweep
const CRANK_BOOST = 8 // clock rate added by a full sweep at Hover 100
const TAU_VEL = 0.05 // s, smoothing on the raw per-frame pointer velocity
const TAU_UP = 0.1 // s, spool up
const TAU_DOWN = 0.45 // s, coast down — the flywheel
const CLEAR_MIN = 2 // px, floor on the gap between cogs that do not mesh
const CLEAR_MOD = 0.18 // and the same gap as a share of the module

// Packing effort. Not dials — Density says how full, these say how hard to try.
const BEARINGS = 14 // bearings swept around a parent before shrinking the cog
const LADDER = 6 // steps down the tooth count when nothing at that size fits
const FAIL_LIMIT = 60 // failed placements before starting a new train elsewhere
const MAX_COGS = 4000 // safety valve; the grid keeps the cost linear

type Cog = {
    x: number
    y: number
    rp: number
    N: number
    theta: number
    omega: number
    hash: number
    parent: number
}

function mulberry32(a: number) {
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// Framer's Color control emits hex, rgb()/rgba(), hsl()/hsla() or a
// var(--token, fallback) — a hex-only parse makes the dial look dead.
function parseColor(
    input: string | undefined,
    fb: [number, number, number]
): [number, number, number] {
    if (!input) return fb
    let str = String(input).trim()
    if (str.indexOf("var(") === 0) {
        const comma = str.indexOf(",")
        if (comma < 0) return fb
        str = str.slice(comma + 1, str.lastIndexOf(")")).trim()
    }
    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b))
                return [r / 255, g / 255, b / 255]
        }
        return fb
    }
    const nums = str.match(/-?[\d.]+/g)
    if (!nums || nums.length < 3) return fb
    if (str.indexOf("hsl") === 0) {
        const h = (((parseFloat(nums[0]) % 360) + 360) % 360) / 360
        const sat = Math.min(100, parseFloat(nums[1])) / 100
        const lum = Math.min(100, parseFloat(nums[2])) / 100
        const amp = sat * Math.min(lum, 1 - lum)
        const ch = (n: number) => {
            const kk = (n + h * 12) % 12
            return lum - amp * Math.max(-1, Math.min(kk - 3, 9 - kk, 1))
        }
        return [ch(0), ch(8), ch(4)]
    }
    return [
        Math.min(255, parseFloat(nums[0])) / 255,
        Math.min(255, parseFloat(nums[1])) / 255,
        Math.min(255, parseFloat(nums[2])) / 255,
    ]
}

/**
 * Grow the train until the frame is as FULL as Density asks. Density is a
 * target coverage, not a count: a count cannot mean "full" at more than one
 * frame size or one Size, since the number of cogs that fit scales with the
 * area and with 1/Size^2. Coverage is accumulated from each cog's disc area
 * clipped to the frame, so the same dial reads the same on a phone and on a 2K
 * display.
 *
 * Every child sits at exact pitch tangency to its parent with its phase solved
 * from the lock; every non-parent pair is held apart by a clearance, so the only
 * contact in the frame is a real mesh. Neighbour queries go through a uniform
 * grid whose cell is 2*maxTip + gap — any cog close enough to block lies in the
 * 3x3 block around the candidate — so packing 500 cogs stays linear instead of
 * quadratic.
 */
function buildTrain(
    W: number,
    H: number,
    seed: number,
    density: number,
    size: number,
    variation: number,
    toothPct: number
): { cogs: Cog[]; add: number } {
    const rnd = mulberry32(seed >>> 0)
    const m = (2 * Math.max(8, size)) / N_MID
    const add = (Math.max(0, toothPct) / 100) * ADD_MAX * m
    const gap = Math.max(CLEAR_MIN, CLEAR_MOD * m)
    const cogs: Cog[] = []

    const pickN = () => {
        const e = (variation / 100) * (2 * rnd() - 1)
        return Math.min(N_MAX, Math.max(N_MIN, Math.round(N_MID * Math.pow(2, e))))
    }

    // Spatial grid, so clearOf does not walk every placed cog. With the cell at
    // 2*maxTip + gap, anything close enough to block is in the 3x3 block.
    const nMaxEff = Math.min(N_MAX, Math.round(N_MID * Math.pow(2, variation / 100)))
    const maxTip = (m * nMaxEff) / 2 + add
    const cell = 2 * maxTip + gap
    const grid = new Map<number, number[]>()
    const cellKey = (ix: number, iy: number) => iy * 100003 + ix

    const clearOf = (x: number, y: number, rp: number, skip: number) => {
        const t = rp + add
        const ix = Math.floor(x / cell)
        const iy = Math.floor(y / cell)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const a = grid.get(cellKey(ix + dx, iy + dy))
                if (!a) continue
                for (let n = 0; n < a.length; n++) {
                    const i = a[n]
                    if (i === skip) continue
                    const c = cogs[i]
                    const ex = x - c.x
                    const ey = y - c.y
                    const lim = t + c.rp + add + gap
                    if (ex * ex + ey * ey < lim * lim) return false
                }
            }
        }
        return true
    }

    // Disc area CLIPPED to the frame, so an edge cog is not counted as full.
    let area = 0
    const push = (c: Cog) => {
        cogs.push(c)
        const k = cellKey(Math.floor(c.x / cell), Math.floor(c.y / cell))
        const a = grid.get(k)
        if (a) a.push(cogs.length - 1)
        else grid.set(k, [cogs.length - 1])
        const t = c.rp + add
        const ox = Math.max(0, Math.min(W, c.x + t) - Math.max(0, c.x - t))
        const oy = Math.max(0, Math.min(H, c.y + t) - Math.max(0, c.y - t))
        area += Math.PI * t * t * ((ox * oy) / (4 * t * t))
    }

    const addRoot = () => {
        for (let k = 0; k < 300; k++) {
            const N = pickN()
            const rp = (m * N) / 2
            const x = rnd() * W
            const y = rnd() * H
            if (!clearOf(x, y, rp, -1)) continue
            push({
                x,
                y,
                rp,
                N,
                theta: rnd() * TAU,
                omega: (rnd() < 0.5 ? 1 : -1) * (V_REF / rp),
                hash: rnd(),
                parent: -1,
            })
            return true
        }
        return false
    }

    // Ladder OUTER, bearings inner: hold the size the distribution asked for
    // across every bearing before stepping down. Nested the other way, the first
    // blocked bearing silently downsizes the cog and the whole field shrinks —
    // measured, that alone cost 11 points of coverage at the default.
    const tryPlace = () => {
        const pi = Math.floor(rnd() * cogs.length)
        const p = cogs[pi]
        const phi0 = rnd() * TAU
        let N = pickN()
        for (let s = 0; s < LADDER; s++) {
            const rp = (m * N) / 2
            const d = p.rp + rp
            for (let b = 0; b < BEARINGS; b++) {
                const phi = phi0 + (b / BEARINGS) * TAU
                const x = p.x + Math.cos(phi) * d
                const y = p.y + Math.sin(phi) * d
                // Centre inside the frame: a cog still bleeds off the edge by up
                // to its own radius, but one sitting almost entirely outside is
                // a wasted draw, and accepting those is what starved coverage.
                if (x > 0 && x < W && y > 0 && y < H && clearOf(x, y, rp, pi)) {
                    push({
                        x,
                        y,
                        rp,
                        N,
                        theta: phi + Math.PI - (Math.PI - p.N * (phi - p.theta)) / N,
                        omega: -Math.sign(p.omega) * (V_REF / rp),
                        hash: rnd(),
                        parent: pi,
                    })
                    return true
                }
            }
            if (N === N_MIN) break
            N = Math.max(N_MIN, Math.round(N * 0.7))
        }
        return false
    }

    if (!addRoot()) return { cogs, add }
    const targetArea = (Math.max(0, density) / 100) * W * H
    let fails = 0
    let guard = 0
    while (area < targetArea && cogs.length < MAX_COGS && guard++ < 200000) {
        if (tryPlace()) {
            fails = 0
            continue
        }
        if (++fails > FAIL_LIMIT) {
            fails = 0
            if (!addRoot()) break
        }
    }
    return { cogs, add }
}

const VERT = `
precision highp float;
attribute vec2 aCorner;
attribute vec2 aCenter;
attribute vec4 aPack;   // pitch radius, tooth count, theta0, omega
attribute float aHash;
uniform vec2 uRes;      // CSS px
uniform float uAdd;     // addendum, CSS px
uniform float uStroke;  // stroke weight, CSS px
varying vec2 vLocal;
varying vec4 vPack;
varying float vHash;
void main() {
    float halfBox = aPack.x + uAdd + uStroke + 2.0;
    vLocal = aCorner * halfBox;
    vPack = aPack;
    vHash = aHash;
    vec2 p = aCenter + vLocal;
    gl_Position = vec4((p / uRes) * 2.0 - 1.0, 0.0, 1.0);
    gl_Position.y = -gl_Position.y;
}
`

const FRAG = `
precision highp float;
varying vec2 vLocal;
varying vec4 vPack;
varying float vHash;
uniform float uTime;
uniform float uAdd;
uniform float uHalfStroke; // device px
uniform float uDpr;
uniform float uHub;        // hub radius as a fraction of the pitch radius
uniform float uSpokes;
uniform float uAccentMix;
uniform vec3 uBase;
uniform vec3 uAccent;

const float TAU = 6.2831853;
const float CREST = 0.22;
const float ROOT = 0.60;
const float DEDENDUM = 1.3;

// A stroke of constant SCREEN weight, from a distance already in device px.
float band(float dPx) {
    return 1.0 - smoothstep(uHalfStroke - 0.7, uHalfStroke + 0.7, abs(dPx));
}

void main() {
    float rp = vPack.x;
    float N = vPack.y;
    float th = vPack.z + vPack.w * uTime;

    float r = length(vLocal);
    float a = atan(vLocal.y, vLocal.x);

    // Tooth profile: +1 across the crest, -1 in the root, smooth flanks between.
    float u = fract(((a - th) * N) / TAU);
    float x = 2.0 * min(u, 1.0 - u);
    float t = clamp((x - CREST) / (ROOT - CREST), 0.0, 1.0);
    float s = 1.0 - 2.0 * (t * t * (3.0 - 2.0 * t));
    float k = s >= 0.0 ? 1.0 : DEDENDUM;
    float R = rp + uAdd * k * s;

    // Exact gradient of (r - R(a)), rather than fwidth: no OES extension, and
    // the Euclidean magnitude beats fwidth's Manhattan estimate. Without this a
    // flank is ~5x steeper than the crest and the stroke thins out along it.
    //   |grad| = sqrt(1 + (R'(a)/r)^2),  R'(a) = uAdd*k * 4*N*ss'(x) / TAU
    float ss = (6.0 * t * (1.0 - t)) / (ROOT - CREST);
    float dR = (uAdd * k * 4.0 * N * ss) / TAU;
    float rSafe = max(r, 0.2 * rp + 1.0); // the atan singularity at the centre
    float grad = sqrt(1.0 + (dR / rSafe) * (dR / rSafe));

    float rim = band(((r - R) * uDpr) / grad);

    // hub ring
    float hubR = uHub * rp;
    float hub = uHub > 0.001 ? band((r - hubR) * uDpr) : 0.0;

    // spokes, from the hub out to the root circle
    float spoke = 0.0;
    if (uSpokes >= 0.5) {
        float K = uSpokes;
        float q = fract(((a - th) * K) / TAU + 0.5) - 0.5;
        float dl = abs(q * TAU / K) * r;
        float rIn = max(hubR, uHalfStroke / uDpr);
        float rOut = rp - uAdd * DEDENDUM;
        float ends = smoothstep(0.0, 1.5 / uDpr, r - rIn) *
                     smoothstep(0.0, 1.5 / uDpr, rOut - r);
        spoke = band(dl * uDpr) * ends;
    }

    float alpha = max(rim, max(hub, spoke));
    if (alpha <= 0.002) discard;
    vec3 col = vHash < uAccentMix ? uAccent : uBase;
    gl_FragColor = vec4(col, alpha);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("CogTrain shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

interface CogSettings {
    variation?: number
    toothDepth?: number
    stroke?: number
    hub?: number
    spokes?: number
}

interface CogProps {
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    speed?: number
    size?: number
    seed?: number
    accentMix?: number
    hover?: number
    cog?: CogSettings
    width?: number
    height?: number
    style?: React.CSSProperties
}

const COG_DEFAULTS = {
    variation: 60,
    toothDepth: 100,
    stroke: 2,
    hub: 30,
    spokes: 5,
}

export default function CogTrain(props: CogProps) {
    const {
        background = "#0E1116",
        baseColor = "#EEFE00",
        accentColor = "#00FFCF",
        density = 80,
        speed = 100,
        size = 70,
        seed = 1,
        accentMix = 52,
        hover = 200,
        style,
    } = props
    // A group the designer never opened arrives undefined (rule 11).
    const cogSet = { ...COG_DEFAULTS, ...(props.cog ?? {}) }

    const hostRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    // Live inputs read inside the loop, never in the effect deps (rule 6).
    const live = useRef({
        speed,
        hover,
        accentMix,
        base: parseColor(baseColor, [0.17, 0.23, 0.29]),
        accent: parseColor(accentColor, [0.5, 0.82, 0.78]),
        stroke: cogSet.stroke,
        hub: cogSet.hub,
        spokes: cogSet.spokes,
    })
    live.current.speed = speed
    live.current.hover = hover
    live.current.accentMix = accentMix
    live.current.base = parseColor(baseColor, [0.17, 0.23, 0.29])
    live.current.accent = parseColor(accentColor, [0.5, 0.82, 0.78])
    live.current.stroke = cogSet.stroke
    live.current.hub = cogSet.hub
    live.current.spokes = cogSet.spokes

    // Anything that changes the TRAIN goes here; the loop rebuilds the buffer,
    // never the context.
    const layoutKey = `${seed}|${density}|${size}|${cogSet.variation}|${cogSet.toothDepth}`
    const layoutRef = useRef(layoutKey)
    const dirtyRef = useRef(true)
    if (layoutRef.current !== layoutKey) {
        layoutRef.current = layoutKey
        dirtyRef.current = true
    }
    const paramsRef = useRef({
        seed,
        density,
        size,
        variation: cogSet.variation,
        toothDepth: cogSet.toothDepth,
    })
    paramsRef.current = {
        seed,
        density,
        size,
        variation: cogSet.variation,
        toothDepth: cogSet.toothDepth,
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return
        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            premultipliedAlpha: false,
        })
        if (!gl) return

        const vs = compile(gl, gl.VERTEX_SHADER, VERT)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
        if (!vs || !fs) return
        const prog = gl.createProgram()
        if (!prog) return
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("CogTrain link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const aCorner = gl.getAttribLocation(prog, "aCorner")
        const aCenter = gl.getAttribLocation(prog, "aCenter")
        const aPack = gl.getAttribLocation(prog, "aPack")
        const aHash = gl.getAttribLocation(prog, "aHash")
        const U = {
            res: gl.getUniformLocation(prog, "uRes"),
            time: gl.getUniformLocation(prog, "uTime"),
            add: gl.getUniformLocation(prog, "uAdd"),
            stroke: gl.getUniformLocation(prog, "uStroke"),
            halfStroke: gl.getUniformLocation(prog, "uHalfStroke"),
            dpr: gl.getUniformLocation(prog, "uDpr"),
            hub: gl.getUniformLocation(prog, "uHub"),
            spokes: gl.getUniformLocation(prog, "uSpokes"),
            accentMix: gl.getUniformLocation(prog, "uAccentMix"),
            base: gl.getUniformLocation(prog, "uBase"),
            accent: gl.getUniformLocation(prog, "uAccent"),
        }

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        const STRIDE = 9 * 4
        gl.enableVertexAttribArray(aCorner)
        gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, STRIDE, 0)
        gl.enableVertexAttribArray(aCenter)
        gl.vertexAttribPointer(aCenter, 2, gl.FLOAT, false, STRIDE, 8)
        gl.enableVertexAttribArray(aPack)
        gl.vertexAttribPointer(aPack, 4, gl.FLOAT, false, STRIDE, 16)
        gl.enableVertexAttribArray(aHash)
        gl.vertexAttribPointer(aHash, 1, gl.FLOAT, false, STRIDE, 32)

        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        gl.blendFuncSeparate(
            gl.SRC_ALPHA,
            gl.ONE_MINUS_SRC_ALPHA,
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA
        )

        let W = 0
        let H = 0
        let dpr = 1
        let vertCount = 0
        let addPx = 0

        const rebuild = () => {
            if (W < 2 || H < 2) return
            const p = paramsRef.current
            const { cogs, add } = buildTrain(
                W,
                H,
                p.seed,
                p.density,
                p.size,
                p.variation,
                p.toothDepth
            )
            addPx = add
            const data = new Float32Array(cogs.length * 6 * 9)
            const CORNERS = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]
            let o = 0
            for (let i = 0; i < cogs.length; i++) {
                const c = cogs[i]
                for (let v = 0; v < 6; v++) {
                    data[o++] = CORNERS[v * 2]
                    data[o++] = CORNERS[v * 2 + 1]
                    data[o++] = c.x
                    data[o++] = c.y
                    data[o++] = c.rp
                    data[o++] = c.N
                    data[o++] = c.theta
                    data[o++] = c.omega
                    data[o++] = c.hash
                }
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
            vertCount = cogs.length * 6
            dirtyRef.current = false
        }

        // Cached so no frame pays for a forced layout. offsetWidth/rect.width is
        // the canvas zoom, so the crank is zoom-invariant (rule G).
        let rectL = 0
        let rectT = 0
        let rectSX = 1
        let rectSY = 1
        const readRect = () => {
            const r = host.getBoundingClientRect()
            rectL = r.left
            rectT = r.top
            rectSX = r.width > 0 ? host.offsetWidth / r.width : 1
            rectSY = r.height > 0 ? host.offsetHeight / r.height : 1
        }

        const resize = () => {
            // clientWidth, not the injected width prop: in the Framer preview
            // that prop is not a number.
            const w = host.clientWidth || 1200
            const h = host.clientHeight || 800
            dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
            readRect()
            if (w === W && h === H) return
            W = w
            H = h
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
            gl.viewport(0, 0, canvas.width, canvas.height)
            dirtyRef.current = true
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(host)

        // Pointer on WINDOW: this is a backdrop, so anything laid over it would
        // otherwise swallow every move. Only the client position is recorded
        // here; the velocity is differentiated in the loop against the loop's
        // own dt, never against event timestamps.
        const ptr = { cx: 0, cy: 0, seen: false }
        const onMove = (e: PointerEvent) => {
            ptr.cx = e.clientX
            ptr.cy = e.clientY
            ptr.seen = true
        }
        window.addEventListener("pointermove", onMove, { passive: true })
        window.addEventListener("scroll", readRect, { passive: true, capture: true })

        let raf = 0
        let last = 0
        let clock = 0
        let prevLx = NaN
        let vxs = 0 // smoothed pointer velocity, px/s
        let drive = 0 // -1..1, what the crank has spun up to
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            if (!last) last = now
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now
            if (dirtyRef.current) rebuild()
            if (vertCount === 0) return

            const L = live.current

            // Crank. Horizontal pointer velocity only: one axis is predictable,
            // whereas a 2D magnitude signed by one component flips at random
            // during a vertical drag.
            let target = 0
            if (ptr.seen && dt > 0) {
                const lx = (ptr.cx - rectL) * rectSX
                const ly = (ptr.cy - rectT) * rectSY
                if (prevLx === prevLx) {
                    const vx = (lx - prevLx) / dt
                    vxs += (vx - vxs) * (1 - Math.exp(-dt / TAU_VEL))
                }
                // prevLx tracks even while outside, so re-entry cannot spike
                prevLx = lx
                if (lx >= 0 && lx <= W && ly >= 0 && ly <= H) {
                    target = Math.max(-1, Math.min(1, vxs / VEL_REF))
                }
            }
            // fast attack, slow release — the flywheel
            const tau = Math.abs(target) > Math.abs(drive) ? TAU_UP : TAU_DOWN
            drive += (target - drive) * (1 - Math.exp(-dt / tau))
            const crank = (L.hover / 100) * CRANK_BOOST * drive

            clock += dt * (L.speed / 50 + crank)
            if (clock > 1e6 || clock < -1e6) clock = 0 // keep float32 precision

            gl.useProgram(prog)
            gl.uniform2f(U.res, W, H)
            gl.uniform1f(U.time, clock)
            gl.uniform1f(U.add, addPx)
            gl.uniform1f(U.stroke, L.stroke)
            gl.uniform1f(U.halfStroke, (L.stroke * dpr) / 2)
            gl.uniform1f(U.dpr, dpr)
            gl.uniform1f(U.hub, L.hub / 100)
            gl.uniform1f(U.spokes, Math.round(L.spokes))
            gl.uniform1f(U.accentMix, L.accentMix / 100)
            gl.uniform3fv(U.base, L.base)
            gl.uniform3fv(U.accent, L.accent)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLES, 0, vertCount)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("scroll", readRect, true)
            // No loseContext: getContext hands back the same context per canvas,
            // and a force-lost one renders black on the StrictMode remount.
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
                overflow: "hidden",
                background,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}
