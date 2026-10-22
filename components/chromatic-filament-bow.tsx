"use client"

import type { CSSProperties } from "react"
"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    knotX: 52,
    knotY: 51,
    knotWidth: 120,
    knotHeight: 28,
    lineWeight: 6,
    lineOpacity: 40,
    midColor: "#FF4C4C",
    departure: 40,
    segments: 14,
    dotColor: "#4FF0F0",
    dotSize: 24,
    dotsPerStrand: 2,
    magentaDots: 12,
    nodeSize: 11,
    nodeSlide: 3,
    nodeBreathe: 15,
    pulseMs: 2200,
    pulseLength: 6,
    pulseGlow: 4,
    flareMs: 400,
    swayPeriod: 8000,
    controlSway: 50,
    knotPulse: 10,
    knotPulseMs: 4000,
    pointerRadius: 15,
    pointerPush: 3,
    burstCount: 100,
    offsetX: 0,
    offsetY: 0,
    seed: 7,
    grain: 0,
    vignette: 0,
    hover: 100,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
const GROUP_FALLBACKS: Record<string, any> = { advanced: ADVANCED_DEFAULTS }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

const REF_W = 1160
const REF_H = 772
const NB = 16
const TAU = Math.PI * 2

// Arms of the bow-tie. Every strand runs straight through the waist, leaves its far end
// horizontally and curves out to a tip in `band` (reference px, inner → outer).
// arrive: 0 = reaches the tip travelling vertically, 1 = horizontally, -1 = blend along the band.
// kind: 0 cyan tips, 1 magenta band, 2 mixed lower, 3 violet/cyan spray
// In the poster every arm runs off the frame: magenta bands (kind 1) off the sides, cyan tips
// (kind 0) off the top, lower arms (kind 2) off the bottom. Whatever the frame shape, each is
// stretched about its root until its outermost tips run past that edge, never ending in mid-air.
const ARMS = [
    { n: 110, dir: -1, kind: 0, lane: [-1, -0.25], band: [[340, 50], [300, 38], [230, 90], [150, 150]], jx: 24, jy: 24, shorten: 0.35, arrive: -1 },
    { n: 110, dir: 1, kind: 0, lane: [-1, -0.25], band: [[790, 20], [855, 5], [930, 180], [980, 215]], jx: 24, jy: 24, shorten: 0.35, arrive: -1 },
    { n: 90, dir: -1, kind: 1, lane: [0, 0.8], band: [[-10, 495], [-10, 555]], jx: 60, jy: 16, shorten: 0.12, arrive: 1 },
    { n: 40, dir: -1, kind: 3, lane: [-0.5, 0.3], band: [[330, 335], [170, 420], [260, 470]], jx: 40, jy: 30, shorten: 0.2, arrive: 1 },
    { n: 80, dir: 1, kind: 1, lane: [0, 0.8], band: [[1175, 485], [1175, 555]], jx: 40, jy: 16, shorten: 0.1, arrive: 1 },
    { n: 40, dir: 1, kind: 3, lane: [-0.5, 0.3], band: [[900, 350], [1110, 410], [1000, 455]], jx: 40, jy: 30, shorten: 0.2, arrive: 1 },
    { n: 60, dir: -1, kind: 2, lane: [0.3, 1], band: [[320, 640], [345, 700], [380, 765]], jx: 30, jy: 20, shorten: 0.25, arrive: 0 },
    { n: 60, dir: 1, kind: 2, lane: [0.3, 1], band: [[890, 690], [930, 730], [960, 780]], jx: 30, jy: 20, shorten: 0.25, arrive: 0 },
]
const ARM_TOTAL = ARMS.reduce((s, a) => s + a.n, 0)

const NODES_CYAN = [
    [365, 262], [474, 278], [343, 355], [368, 352], [284, 386],
    [773, 257], [906, 240], [904, 346], [935, 350], [1006, 386],
]
const NODES_MAG = [
    [226, 433], [383, 436], [435, 325], [820, 316], [884, 446], [1078, 442],
    [343, 673], [354, 688], [352, 712], [932, 727], [920, 746],
]

function num(v: any, d: number) {
    return typeof v === "number" && isFinite(v) ? v : d
}

function mulberry(seed: number) {
    let a = seed >>> 0 || 1
    return () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function parseColor(c: any): [number, number, number] {
    if (typeof c !== "string") return [0, 0, 0]
    const s = c.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.split("").map((x) => x + x).join("")
        const n = parseInt(h.slice(0, 6), 16)
        if (isNaN(n)) return [0, 0, 0]
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
        return [p[0] || 0, p[1] || 0, p[2] || 0]
    }
    return [0, 0, 0]
}

function bez(a: number, b: number, c: number, d: number, t: number) {
    const u = 1 - t
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d
}

// cubic-bezier(0.45, 0, 0.55, 1)
function ease(x: number) {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 6; i++) {
        const u = 1 - t
        const bx = 3 * u * u * t * 0.45 + 3 * u * t * t * 0.55 + t * t * t - x
        const dx = 3 * u * u * 0.45 + 6 * u * t * 0.1 + 3 * t * t * 0.45
        if (Math.abs(dx) < 1e-6) break
        t = Math.min(1, Math.max(0, t - bx / dx))
    }
    const u = 1 - t
    return 3 * u * t * t + t * t * t
}

function smooth(a: number, b: number, x: number) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
}

function buildField(density: number, adv: any) {
    const rnd = mulberry(Math.round(num(adv.seed, 7)) * 9973 + 17)
    const kx = (num(adv.knotX, 52) / 100) * REF_W
    const ky = (num(adv.knotY, 51) / 100) * REF_H
    const half = Math.max(4, num(adv.knotWidth, 120)) / 2
    const kh = Math.max(1, num(adv.knotHeight, 28))
    const dep = num(adv.departure, 40) / 100
    const dps = Math.max(0, num(adv.dotsPerStrand, 2))
    const magShare = num(adv.magentaDots, 12) / 100
    const strands: any[] = []
    ARMS.forEach((arm, ai) => {
        const count = Math.max(1, Math.round((arm.n * density) / ARM_TOTAL))
        const band = arm.band
        for (let i = 0; i < count; i++) {
            const u = rnd()
            const f = u * (band.length - 1)
            const bi = Math.min(band.length - 2, Math.floor(f))
            const bk = f - bi
            let tx = band[bi][0] + (band[bi + 1][0] - band[bi][0]) * bk
            let ty = band[bi][1] + (band[bi + 1][1] - band[bi][1]) * bk
            tx += (rnd() - 0.5) * arm.jx
            ty += (rnd() - 0.5) * arm.jy

            // waist: straight run from xs (inside the waist) to the far end xe
            const lane = arm.lane[0] + (arm.lane[1] - arm.lane[0]) * rnd()
            const yoff = (lane * kh) / 2
            const xe = kx + arm.dir * half
            const xs = kx - arm.dir * half * (0.1 + 0.85 * rnd())
            const ye = ky + yoff

            const sh = Math.pow(rnd(), 1.6) * arm.shorten
            const x3 = tx + (xe - tx) * sh
            const y3 = ty + (ye - ty) * sh
            const adx = Math.abs(x3 - xe)
            const ady = Math.abs(y3 - ye)
            const a = dep * (0.75 + rnd() * 0.5)
            const x1 = xe + arm.dir * adx * a
            const y1 = ye + (y3 - ye) * rnd() * 0.1
            const m = arm.arrive < 0 ? Math.min(1, Math.max(0, u + (rnd() - 0.5) * 0.2)) : arm.arrive
            const vy = y3 >= ye ? 1 : -1
            const hx2 = x3 - arm.dir * adx * 0.35
            const hy2 = y3
            const vx2 = x3 - arm.dir * adx * 0.05
            const vy2 = y3 - vy * ady * 0.4
            const x2 = vx2 + (hx2 - vx2) * m
            const y2 = vy2 + (hy2 - vy2) * m

            let tipV: number, midV: number
            const knotV = 0.05 + rnd() * 0.2
            if (arm.kind === 0) {
                tipV = rnd() < 0.8 ? rnd() * 0.12 : 0.4 + rnd() * 0.2
                midV = 0.35 + rnd() * 0.2
            } else if (arm.kind === 1) {
                tipV = rnd() < 0.8 ? 0.8 + rnd() * 0.2 : rnd() * 0.15
                midV = 0.55 + rnd() * 0.25
            } else if (arm.kind === 2) {
                tipV = rnd() < 0.5 ? rnd() * 0.15 : 0.8 + rnd() * 0.2
                midV = 0.45 + rnd() * 0.25
            } else {
                tipV = rnd() < 0.5 ? rnd() * 0.15 : 0.45 + rnd() * 0.15
                midV = 0.45 + rnd() * 0.2
            }
            const dotT: number[] = [1]
            const dotM: boolean[] = [rnd() < magShare]
            const k = Math.floor(dps * (0.5 + rnd()))
            for (let j = 0; j < k; j++) {
                dotT.push(rnd() < 0.2 ? 0.05 + rnd() * 0.4 : 0.5 + rnd() * 0.48)
                dotM.push(rnd() < magShare)
            }
            // share of a pulse's run spent crossing the waist from the knot's centre,
            // by length, so it travels at one pace from the middle out to the tip
            const cl = (Math.hypot(x1 - xe, y1 - ye) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2) + Math.hypot(x3 - xe, y3 - ye)) / 2
            const wsh = half / (half + Math.max(1, cl))
            const ph1 = ai * 1.7 + tx * 0.004 + ty * 0.003 + rnd() * 0.4
            const ph2 = rnd() * TAU
            const ph3 = rnd() * TAU
            strands.push({
                xs, yoff,
                x0: xe, y0: ye, x1, y1, x2, y2, x3, y3,
                edge: arm.kind === 1 ? arm.dir : 0,
                vert: arm.kind === 0 ? -1 : arm.kind === 2 ? 1 : 0,
                tipV, midV, knotV, hi: rnd() < 0.5, wsh,
                dotT, dotM,
                ph1, ph2, ph3,
                s1: Math.sin(ph1), s2: Math.sin(ph2), c1: Math.cos(ph1 * 0.8 + 1), s3: Math.sin(ph3),
                flare: -100,
            })
        }
    })
    const nodes: any[] = []
    const addNode = (p: number[], mag: boolean) => {
        let best = 0, bt = 0.5, bd = Infinity
        for (let si = 0; si < strands.length; si++) {
            const s = strands[si]
            for (let j = 2; j <= 16; j++) {
                const t = j / 16
                const x = bez(s.x0, s.x1, s.x2, s.x3, t)
                const y = bez(s.y0, s.y1, s.y2, s.y3, t)
                const d = (x - p[0]) * (x - p[0]) + (y - p[1]) * (y - p[1])
                if (d < bd) { bd = d; best = si; bt = t }
            }
        }
        const s = strands[best]
        nodes.push({
            si: best, t: bt, mag,
            ox: p[0] - bez(s.x0, s.x1, s.x2, s.x3, bt),
            oy: p[1] - bez(s.y0, s.y1, s.y2, s.y3, bt),
            period: 6 + rnd() * 4, phase: rnd() * TAU, bphase: rnd() * TAU,
        })
    }
    NODES_CYAN.forEach((p) => addNode(p, false))
    NODES_MAG.forEach((p) => addNode(p, true))
    // bounds of the figure itself, which is what the frame fits. The magenta bands are left
    // out because they are stretched to the side edges anyway.
    let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity
    for (const s of strands) {
        if (s.edge) continue
        for (let j = 0; j <= 16; j++) {
            const x = bez(s.x0, s.x1, s.x2, s.x3, j / 16)
            const y = bez(s.y0, s.y1, s.y2, s.y3, j / 16)
            if (x < bx0) bx0 = x
            if (x > bx1) bx1 = x
            if (y < by0) by0 = y
            if (y > by1) by1 = y
        }
    }
    return { strands, nodes, live: new Float32Array(strands.length * 8), kx, ky, half, bx0, bx1, by0, by1 }
}

export interface FilamentBowProps {
    background?: string
    colorA?: string
    colorB?: string
    speed?: number
    scale?: number
    density?: number
    pulses?: number
    sway?: number
    hover?: number
    advanced?: {
        knotX?: number
        knotY?: number
        knotWidth?: number
        knotHeight?: number
        lineWeight?: number
        lineOpacity?: number
        midColor?: string
        departure?: number
        segments?: number
        dotColor?: string
        dotSize?: number
        dotsPerStrand?: number
        magentaDots?: number
        nodeSize?: number
        nodeSlide?: number
        nodeBreathe?: number
        pulseMs?: number
        pulseLength?: number
        pulseGlow?: number
        flareMs?: number
        swayPeriod?: number
        controlSway?: number
        knotPulse?: number
        knotPulseMs?: number
        pointerRadius?: number
        pointerPush?: number
        burstCount?: number
        offsetX?: number
        offsetY?: number
        seed?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * Data filaments: hundreds of curved strands pinched through a central waist,
 * swaying on a seamless 8 s loop with light pulses travelling out to their tips.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function FilamentBow(props: FilamentBowProps) {
    props = withMovedControls(props)
    const {
        speed = 50,
        scale = 163,
        density = 600,
        pulses = 60,
        sway = 100,
        colorA = "#F0E23F",
        colorB = "#E84040",
        background = "#000000",
        style,
    } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(props)
    propsRef.current = {
        ...props,
        speed, scale, density, pulses, sway, colorA, colorB, background,
    }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let W = 0
        let H = 0
        let dpr = 1
        const resize = () => {
            W = root.offsetWidth
            H = root.offsetHeight
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const reduceMq =
            typeof window.matchMedia === "function"
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null

        // grain tile
        const noise = document.createElement("canvas")
        noise.width = 128
        noise.height = 128
        const nctx = noise.getContext("2d")
        if (nctx) {
            const id = nctx.createImageData(128, 128)
            for (let i = 0; i < id.data.length; i += 4) {
                const g = Math.random() * 255
                id.data[i] = g
                id.data[i + 1] = g
                id.data[i + 2] = g
                id.data[i + 3] = 255
            }
            nctx.putImageData(id, 0, 0)
        }
        const grainPattern = ctx.createPattern(noise, "repeat")

        // pointer, as a 0–1 share of the root as displayed, so canvas zoom and
        // parent transforms cannot pull the push off the cursor
        const ptr = { u: 0, v: 0, su: 0, sv: 0, inside: false, over: 0, down: false, seen: false }
        let burstReq = 0
        const onMove = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            if (r.width < 1 || r.height < 1) return
            ptr.u = (e.clientX - r.left) / r.width
            ptr.v = (e.clientY - r.top) / r.height
            if (!ptr.seen) {
                ptr.su = ptr.u
                ptr.sv = ptr.v
                ptr.seen = true
            }
            ptr.inside = true
        }
        const onLeave = () => { ptr.inside = false }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            ptr.down = true
            burstReq++
        }
        const onUp = () => { ptr.down = false }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        let field: any = null
        let fieldKey = ""
        let pool: any[] = []
        const buckets: number[][] = []
        for (let i = 0; i < NB * 4; i++) buckets.push([])
        const dotsC: number[] = []
        const dotsM: number[] = []
        const cols: string[] = new Array(NB)

        let clock = 0
        let last = -1
        let raf = 0

        const spawn = (n: number, adv: any, randomPhase: boolean, burst: boolean) => {
            const base = Math.max(0.2, num(adv.pulseMs, 2200) / 1000) * (burst ? 0.7 : 1)
            const dur = base * (0.73 + Math.random() * 0.54)
            return {
                si: Math.floor(Math.random() * n),
                dur,
                t0: clock - (randomPhase ? Math.random() * dur : 0),
                burst,
            }
        }

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(1 / 20, (now - last) / 1000)
            last = now
            const p = propsRef.current
            const adv: any = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const reduced = !!(reduceMq && reduceMq.matches)
            const rate = reduced ? 0 : Math.max(0, num(p.speed, 50)) / 50
            clock += dt * rate

            const dens = Math.max(20, Math.round(num(p.density, 600)))
            const key = [dens, adv.seed, adv.knotX, adv.knotY, adv.knotWidth, adv.knotHeight, adv.departure, adv.dotsPerStrand, adv.magentaDots].join("|")
            if (key !== fieldKey) {
                field = buildField(dens, adv)
                fieldKey = key
                pool = []
            }
            const strands = field.strands
            const n = strands.length
            const live: Float32Array = field.live

            if (W < 1 || H < 1) return

            // fit: contain the whole figure in the frame at any aspect (the old cover fit cut the
            // arms off), then the Scale control. Sideways it keeps clear of the edges by the
            // farthest a tip can sway; the top and bottom fans run off their edges instead.
            const amp = (Math.max(0, num(p.sway, 40)) / 40) * 0.015 * REF_W
            const over = amp * 2 + 8
            const s0 = Math.min(W / (field.bx1 - field.bx0 + over * 2), H / (field.by1 - field.by0))
            const s = s0 * (Math.max(10, num(p.scale, 100)) / 100)
            const Tx = W / 2 + (num(adv.offsetX, 0) / 100) * W - ((field.bx0 + field.bx1) / 2) * s
            const Ty = H / 2 + (num(adv.offsetY, 0) / 100) * H - ((field.by0 + field.by1) / 2) * s
            // frame edges in reference px. Each edge arm reaches `over` past its edge, so even
            // mid-sway its outermost tips are off the frame rather than ending inside it
            const reachL = Math.min(0, -Tx / s) - over
            const reachR = Math.max(0, (W - Tx) / s - REF_W) + over
            const fT = Math.max(1, (field.ky - (-Ty / s - over)) / (field.ky - field.by0))
            const fB = Math.max(1, ((H - Ty) / s + over - field.ky) / (field.by1 - field.ky))
            // hairlines, dots and glow stay a fixed CSS size at any frame size or Scale
            const px = 1 / s

            // pointer easing
            const hoverAmt = Math.max(0, num(adv.hover, 50)) / 50
            const target = ptr.inside ? 1 : 0
            const tau = target > ptr.over ? 0.1 : 0.2
            ptr.over += (target - ptr.over) * (1 - Math.exp(-dt / tau))
            ptr.su += (ptr.u - ptr.su) * (1 - Math.exp(-dt / 0.08))
            ptr.sv += (ptr.v - ptr.sv) * (1 - Math.exp(-dt / 0.08))
            const pxr = (ptr.su * W - Tx) / s
            const pyr = (ptr.sv * H - Ty) / s
            const R = Math.max(1, ((num(adv.pointerRadius, 15) / 100) * W) / s)
            const push = (((num(adv.pointerPush, 3) / 100) * W) / s) * hoverAmt * ptr.over

            // live control points: edge stretch + seamless sway loop + pointer push
            const cs = num(adv.controlSway, 50) / 100
            const w = (TAU * clock) / Math.max(0.5, num(adv.swayPeriod, 8000) / 1000)
            for (let si = 0; si < n; si++) {
                const st = strands[si]
                // stretch edge arms about their root, so the curve's shape holds
                const reach = st.edge < 0 ? reachL : st.edge > 0 ? reachR : 0
                const ex = reach ? 1 + reach / (st.x3 - st.x0) : 1
                const ey = st.vert < 0 ? fT : st.vert > 0 ? fB : 1
                const x1 = st.x0 + (st.x1 - st.x0) * ex
                const y1 = st.y0 + (st.y1 - st.y0) * ey
                const sx = amp * (0.7 * (Math.sin(w + st.ph1) - st.s1) + 0.3 * (Math.sin(2 * w + st.ph2) - st.s2))
                const sy = amp * (0.7 * (Math.cos(w + st.ph1 * 0.8 + 1) - st.c1) + 0.3 * (Math.sin(2 * w + st.ph3) - st.s3))
                let x3 = st.x0 + (st.x3 - st.x0) * ex + sx
                let y3 = st.y0 + (st.y3 - st.y0) * ey + sy
                let x2 = st.x0 + (st.x2 - st.x0) * ex + sx * cs
                let y2 = st.y0 + (st.y2 - st.y0) * ey + sy * cs
                if (push > 0.01) {
                    let dx = x3 - pxr, dy = y3 - pyr
                    let d = Math.sqrt(dx * dx + dy * dy)
                    if (d < R) {
                        const k = ((1 - d / R) * (1 - d / R) * push) / Math.max(d, 1)
                        x3 += dx * k
                        y3 += dy * k
                    }
                    dx = x2 - pxr
                    dy = y2 - pyr
                    d = Math.sqrt(dx * dx + dy * dy)
                    if (d < R) {
                        const k = ((1 - d / R) * (1 - d / R) * push * 0.6) / Math.max(d, 1)
                        x2 += dx * k
                        y2 += dy * k
                    }
                }
                const o = si * 8
                live[o] = st.x0
                live[o + 1] = st.y0
                live[o + 2] = x1
                live[o + 3] = y1
                live[o + 4] = x2
                live[o + 5] = y2
                live[o + 6] = x3
                live[o + 7] = y3
            }

            // palette A → mid → B
            const ca = parseColor(p.colorA)
            const cm = parseColor(adv.midColor)
            const cb = parseColor(p.colorB)
            for (let i = 0; i < NB; i++) {
                const v = i / (NB - 1)
                let r: number, g: number, b: number
                if (v < 0.5) {
                    const t = v / 0.5
                    r = ca[0] + (cm[0] - ca[0]) * t
                    g = ca[1] + (cm[1] - ca[1]) * t
                    b = ca[2] + (cm[2] - ca[2]) * t
                } else {
                    const t = (v - 0.5) / 0.5
                    r = cm[0] + (cb[0] - cm[0]) * t
                    g = cm[1] + (cb[1] - cm[1]) * t
                    b = cm[2] + (cb[2] - cm[2]) * t
                }
                cols[i] = `rgb(${r | 0},${g | 0},${b | 0})`
            }
            const vAt = (st: any, t: number) =>
                t < 0.45
                    ? st.knotV + (st.midV - st.knotV) * smooth(0, 0.45, t)
                    : st.midV + (st.tipV - st.midV) * smooth(0.45, 0.9, t)

            // background
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalCompositeOperation = "source-over"
            ctx.globalAlpha = 1
            ctx.fillStyle = typeof p.background === "string" ? p.background : "#000000"
            ctx.fillRect(0, 0, W, H)

            // draw the field in reference coordinates
            ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * Tx, dpr * Ty)
            ctx.globalCompositeOperation = "lighter"

            for (let i = 0; i < buckets.length; i++) buckets[i].length = 0
            const segs = Math.max(4, Math.round(num(adv.segments, 14)))
            const kx = field.kx
            const ky = field.ky
            const half = field.half
            for (let si = 0; si < n; si++) {
                const st = strands[si]
                const o = si * 8
                const ax = live[o], ay = live[o + 1], bx = live[o + 2], by = live[o + 3]
                const cx = live[o + 4], cy = live[o + 5], dx = live[o + 6], dy = live[o + 7]
                // waist: pinched straight run through the knot
                const wb = buckets[Math.round(st.knotV * (NB - 1)) * 4 + (st.hi ? 2 : 0) + 1]
                let px0 = st.xs
                let lx = (px0 - kx) / half
                let py0 = ky + st.yoff * (0.3 + 0.7 * lx * lx)
                for (let j = 1; j <= 4; j++) {
                    const x = st.xs + ((ax - st.xs) * j) / 4
                    lx = (x - kx) / half
                    const y = ky + st.yoff * (0.3 + 0.7 * lx * lx)
                    wb.push(px0, py0, x, y)
                    px0 = x
                    py0 = y
                }
                px0 = ax
                py0 = ay
                for (let j = 1; j <= segs; j++) {
                    const t = j / segs
                    const x = bez(ax, bx, cx, dx, t)
                    const y = bez(ay, by, cy, dy, t)
                    const tm = (j - 0.5) / segs
                    const ci = Math.round(vAt(st, tm) * (NB - 1))
                    const arr = buckets[ci * 4 + (st.hi ? 2 : 0) + (tm < 0.12 ? 1 : 0)]
                    arr.push(px0, py0, x, y)
                    px0 = x
                    py0 = y
                }
            }

            const kp = num(adv.knotPulse, 10) / 100
            const kb = reduced ? 1 : 1 - kp * 0.5 * (1 + Math.cos((TAU * clock) / Math.max(0.5, num(adv.knotPulseMs, 4000) / 1000)))
            const baseA = num(adv.lineOpacity, 40) / 100
            const lw = Math.max(num(adv.lineWeight, 6) / 10, 0.1) * px
            ctx.lineWidth = lw
            ctx.lineCap = "butt"
            for (let bi = 0; bi < buckets.length; bi++) {
                const arr = buckets[bi]
                if (!arr.length) continue
                const ci = bi >> 2
                const hi = (bi & 2) !== 0
                const near = (bi & 1) !== 0
                ctx.globalAlpha = Math.min(1, baseA * (hi ? 1.3 : 0.7) * (near ? 0.6 * kb : 1))
                ctx.strokeStyle = cols[ci]
                ctx.beginPath()
                for (let i = 0; i < arr.length; i += 4) {
                    ctx.moveTo(arr[i], arr[i + 1])
                    ctx.lineTo(arr[i + 2], arr[i + 3])
                }
                ctx.stroke()
            }

            // pulses
            const wantPulses = reduced ? 0 : Math.max(0, Math.round(num(p.pulses, 60)))
            let regular = 0
            for (const q of pool) if (!q.burst) regular++
            while (regular < wantPulses) {
                pool.push(spawn(n, adv, true, false))
                regular++
            }
            if (regular > wantPulses) {
                let extra = regular - wantPulses
                pool = pool.filter((q) => q.burst || extra-- <= 0)
            }
            if (burstReq > 0) {
                if (hoverAmt > 0 && !reduced) {
                    const bc = Math.max(0, Math.round(num(adv.burstCount, 20) * Math.min(2, hoverAmt)))
                    for (let i = 0; i < bc; i++) pool.push(spawn(n, adv, false, true))
                }
                burstReq = 0
            }
            const plen = num(adv.pulseLength, 6) / 100
            const glow = Math.max(0, num(adv.pulseGlow, 4)) * px
            ctx.lineCap = "round"
            const next: any[] = []
            for (const q of pool) {
                const prog = (clock - q.t0) / q.dur
                if (prog >= 1) {
                    if (q.si < n) strands[q.si].flare = clock
                    if (!q.burst) next.push(spawn(n, adv, false, false))
                    continue
                }
                next.push(q)
                if (prog < 0 || q.si >= n) continue
                // run: knot centre → along the pinched waist → out along the arm to its tip
                const te = ease(prog)
                const ts = Math.max(0, te - plen)
                const o = q.si * 8
                const st = strands[q.si]
                const wsh = st.wsh
                ctx.beginPath()
                for (let j = 0; j <= 6; j++) {
                    const t = ts + ((te - ts) * j) / 6
                    let x: number, y: number
                    if (t < wsh) {
                        x = kx + (live[o] - kx) * (t / wsh)
                        const lx = (x - kx) / half
                        y = ky + st.yoff * (0.3 + 0.7 * lx * lx)
                    } else {
                        const u = (t - wsh) / (1 - wsh)
                        x = bez(live[o], live[o + 2], live[o + 4], live[o + 6], u)
                        y = bez(live[o + 1], live[o + 3], live[o + 5], live[o + 7], u)
                    }
                    if (j === 0) ctx.moveTo(x, y)
                    else ctx.lineTo(x, y)
                }
                ctx.strokeStyle = cols[Math.round(vAt(st, Math.max(0, (te - wsh) / (1 - wsh))) * (NB - 1))]
                const fade = Math.min(1, prog / 0.03)
                if (glow > 0) {
                    ctx.globalAlpha = 0.2 * fade
                    ctx.lineWidth = lw + glow * 2
                    ctx.stroke()
                }
                ctx.globalAlpha = fade
                ctx.lineWidth = lw * 2.4
                ctx.stroke()
            }
            pool = next

            // small dots
            dotsC.length = 0
            dotsM.length = 0
            const dr = Math.max(0.3, num(adv.dotSize, 24) / 20) * px
            const flareSec = Math.max(0.05, num(adv.flareMs, 400) / 1000)
            const flares: number[] = []
            for (let si = 0; si < n; si++) {
                const st = strands[si]
                const o = si * 8
                for (let j = 0; j < st.dotT.length; j++) {
                    const t = st.dotT[j]
                    const x = bez(live[o], live[o + 2], live[o + 4], live[o + 6], t)
                    const y = bez(live[o + 1], live[o + 3], live[o + 5], live[o + 7], t)
                    if (j === 0) {
                        const f = (clock - st.flare) / flareSec
                        if (f >= 0 && f < 1) {
                            flares.push(x, y, 1 + (1 - f) * (1 - f), st.dotM[j] ? 1 : 0)
                            continue
                        }
                    }
                    ;(st.dotM[j] ? dotsM : dotsC).push(x, y)
                }
            }
            const dotCol = typeof adv.dotColor === "string" ? adv.dotColor : "#4FF0F0"
            ctx.globalAlpha = 0.9
            ctx.fillStyle = dotCol
            ctx.beginPath()
            for (let i = 0; i < dotsC.length; i += 2) {
                ctx.moveTo(dotsC[i] + dr, dotsC[i + 1])
                ctx.arc(dotsC[i], dotsC[i + 1], dr, 0, TAU)
            }
            ctx.fill()
            ctx.fillStyle = cols[NB - 1]
            ctx.beginPath()
            for (let i = 0; i < dotsM.length; i += 2) {
                ctx.moveTo(dotsM[i] + dr, dotsM[i + 1])
                ctx.arc(dotsM[i], dotsM[i + 1], dr, 0, TAU)
            }
            ctx.fill()
            ctx.globalAlpha = 1
            for (let i = 0; i < flares.length; i += 4) {
                ctx.fillStyle = flares[i + 3] ? cols[NB - 1] : dotCol
                ctx.beginPath()
                ctx.arc(flares[i], flares[i + 1], dr * flares[i + 2], 0, TAU)
                ctx.fill()
            }

            // large nodes: flat, opaque. Features of the figure, so they scale with it
            ctx.globalCompositeOperation = "source-over"
            const nr = Math.max(1, num(adv.nodeSize, 11)) / 2
            const slide = num(adv.nodeSlide, 3) / 100
            const breathe = num(adv.nodeBreathe, 15) / 100
            for (const nd of field.nodes) {
                if (nd.si >= n) continue
                const o = nd.si * 8
                const tt = Math.min(1, Math.max(0, nd.t + slide * (Math.sin((TAU * clock) / nd.period + nd.phase) - Math.sin(nd.phase))))
                const x = bez(live[o], live[o + 2], live[o + 4], live[o + 6], tt) + nd.ox
                const y = bez(live[o + 1], live[o + 3], live[o + 5], live[o + 7], tt) + nd.oy
                const sc = 1 + breathe * (Math.sin((TAU * clock) / (nd.period * 0.8) + nd.bphase) - Math.sin(nd.bphase))
                ctx.fillStyle = nd.mag ? cols[NB - 1] : cols[0]
                ctx.beginPath()
                ctx.arc(x, y, nr * Math.max(0.2, sc), 0, TAU)
                ctx.fill()
            }

            // grain + vignette (screen space)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1
            const gr = num(adv.grain, 0) / 100
            if (gr > 0 && grainPattern) {
                ctx.save()
                ctx.globalAlpha = gr * 0.3
                const ox = Math.random() * 128
                const oy = Math.random() * 128
                ctx.translate(-ox, -oy)
                ctx.fillStyle = grainPattern
                ctx.fillRect(0, 0, W + 128, H + 128)
                ctx.restore()
            }
            const vg = num(adv.vignette, 0) / 100
            if (vg > 0) {
                const rr = Math.sqrt(W * W + H * H) / 2
                const g = ctx.createRadialGradient(W / 2, H / 2, rr * 0.35, W / 2, H / 2, rr)
                g.addColorStop(0, "rgba(0,0,0,0)")
                g.addColorStop(1, `rgba(0,0,0,${Math.min(1, vg * 0.9)})`)
                ctx.globalAlpha = 1
                ctx.fillStyle = g
                ctx.fillRect(0, 0, W, H)
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                ...style,
                overflow: "hidden",
                background,
                touchAction: "none",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}

// Control order arranged in the builder.
