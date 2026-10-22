"use client"

import type { CSSProperties } from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    seed: 7,
    flowerMin: 5,
    flowerMax: 10,
    packing: 100,
    indigo: "#4CDE86",
    violet: "#E74FDD",
    lilac: "#A6B8C4",
    mauve: "#6A4E78",
    dusk: "#8A84A4",
    centerColor: "#C8A060",
    inkColor: "#1A1433",
    shading: 45,
    veins: 70,
    swayPeriod: 6000,
    leafSway: 4,
    drift: 3,
    breathe: 10,
    daisies: 6,
    daisyColor: "#F4F4F6",
    clusters: 22,
    floretColor: "#2C4BF2",
    leaves: 320,
    leafColor: "#23504E",
    undergrowth: 70,
    dewDots: 60,
    fireflySize: 6,
    glowSize: 5,
    fireflyDrift: 3,
    pulseMs: 3000,
    speckle: 160,
    speckleSize: 3,
    twinkle: 70,
    hoverRadius: 22,
    hoverLean: 4,
    grain: 0,
    vignette: 0,
    hover: 100,
}

type Adv = typeof ADVANCED_DEFAULTS
type RGBA = [number, number, number, number]
type Leaf = { cv: HTMLCanvasElement; ox: number; oy: number; L: number }

const TAU = Math.PI * 2
const WHITE: RGBA = [255, 255, 255, 1]
const DEEP: RGBA = [18, 16, 48, 1]
const UNDER: RGBA = [12, 18, 38, 1]
const VARIANTS = 3
const TONE_WEIGHTS = [0.3, 0.24, 0.16, 0.14, 0.16]
const TONE_FALLBACK: RGBA[] = [
    [75, 69, 216, 1],
    [135, 98, 181, 1],
    [166, 184, 196, 1],
    [106, 78, 120, 1],
    [138, 132, 164, 1],
]

function parseColor(s: unknown, fb: RGBA): RGBA {
    if (typeof s !== "string") return fb
    const fn = s.match(/rgba?\(([^)]+)\)/i)
    if (fn) {
        const p = fn[1].split(/[\s,\/]+/).filter(Boolean)
        const n = p.map((v) => parseFloat(v))
        if (n.length >= 3 && n.slice(0, 3).every((v) => isFinite(v))) {
            let a = n.length > 3 && isFinite(n[3]) ? n[3] : 1
            if (p[3] && p[3].includes("%")) a = n[3] / 100
            return [n[0], n[1], n[2], Math.max(0, Math.min(1, a))]
        }
    }
    const hx = s.match(/#([0-9a-f]{3,8})\b/i)
    if (hx) {
        let h = hx[1]
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        if (h.length === 6 || h.length === 8) {
            const v = (i: number) => parseInt(h.slice(i, i + 2), 16)
            return [v(0), v(2), v(4), h.length === 8 ? v(6) / 255 : 1]
        }
    }
    return fb
}
const mix = (a: RGBA, b: RGBA, t: number): RGBA => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3],
]
const lighten = (c: RGBA, t: number) => mix(c, WHITE, t)
const darken = (c: RGBA, t: number) => mix(c, DEEP, t)
const css = (c: RGBA, a = 1) =>
    `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(
        0,
        Math.min(1, c[3] * a)
    ).toFixed(3)})`
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

function mulberry32(seed: number) {
    let a = seed | 0
    return () => {
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function makeCanvas(w: number, h: number) {
    const c = document.createElement("canvas")
    c.width = Math.max(1, Math.ceil(w))
    c.height = Math.max(1, Math.ceil(h))
    return c
}

function makeFlowerSprite(
    R: number,
    base: RGBA,
    center: RGBA,
    ink: RGBA,
    shading: number,
    veins: number,
    dew: number,
    rnd: () => number
) {
    const S = Math.ceil(R * 2.16) + 4
    const cv = makeCanvas(S, S)
    const g = cv.getContext("2d")!
    const c = S / 2
    const rot0 = rnd() * TAU
    const lw = Math.max(1, R * 0.016)
    g.lineCap = "round"
    g.lineJoin = "round"
    for (const i of [0, 2, 4, 1, 3]) {
        const axis = rot0 + (i * TAU) / 5 + (rnd() - 0.5) * 0.18
        const len = R * (0.88 + rnd() * 0.12)
        const hw = 0.72 + rnd() * 0.1
        const k = 2 + Math.floor(rnd() * 2)
        const ph = rnd() * 2
        const ph2 = rnd() * 6
        const asym = (rnd() - 0.5) * 0.3
        const tone = (rnd() - 0.5) * 0.16
        const col = tone > 0 ? lighten(base, tone) : darken(base, -tone)
        const path = new Path2D()
        const N = 72
        for (let j = 0; j <= N; j++) {
            const u = -1 + (2 * j) / N
            const th = axis + u * hw
            const shape = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.6)), 0.55) * (1 + asym * u)
            const lobes = 1 - 0.11 * Math.pow(0.5 + 0.5 * Math.cos((u * k + ph) * Math.PI), 8)
            const jag = 1 + 0.018 * Math.sin(u * 29 + ph2) + 0.01 * Math.sin(u * 63 + ph2 * 2)
            const r = len * (0.08 + 0.92 * shape) * lobes * jag
            const px = c + Math.cos(th) * r
            const py = c + Math.sin(th) * r
            if (j === 0) path.moveTo(px, py)
            else path.lineTo(px, py)
        }
        path.closePath()
        const grad = g.createRadialGradient(c, c, R * 0.04, c, c, len)
        grad.addColorStop(0, css(darken(col, 0.6)))
        grad.addColorStop(0.3, css(darken(col, 0.22)))
        grad.addColorStop(0.7, css(col))
        grad.addColorStop(1, css(lighten(col, 0.12)))
        g.fillStyle = grad
        g.fill(path)
        g.save()
        g.clip(path)
        // flat fold shadow on one half, a cel highlight toward the tip on the other
        g.beginPath()
        g.moveTo(c, c)
        g.arc(c, c, R * 1.2, axis - hw - 0.1, axis - 0.06 + (rnd() - 0.5) * 0.1)
        g.closePath()
        g.fillStyle = css(darken(col, 0.5), shading * 0.5)
        g.fill()
        g.beginPath()
        g.arc(c, c, len * 1.05, axis + 0.08, axis + hw * 0.7)
        g.arc(c, c, len * 0.55, axis + hw * 0.7, axis + 0.08, true)
        g.closePath()
        g.fillStyle = css(lighten(col, 0.35), shading * 0.35)
        g.fill()
        // tapered ink brush streaks from the centre
        const nv = Math.round(8 + veins * 14)
        g.fillStyle = css(ink, 0.25 + veins * 0.55)
        for (let q = 0; q < nv; q++) {
            const u = (rnd() * 2 - 1) * 0.85
            const a = axis + u * hw * 0.9
            const r0 = R * (0.1 + rnd() * 0.1)
            const r1 = len * (0.3 + rnd() * 0.5) * (1 - 0.3 * Math.abs(u))
            const w0 = R * (0.005 + rnd() * 0.01)
            const nx = -Math.sin(a)
            const ny = Math.cos(a)
            const bx = c + Math.cos(a) * r0
            const by = c + Math.sin(a) * r0
            const a2 = a + u * 0.05
            g.beginPath()
            g.moveTo(bx + nx * w0, by + ny * w0)
            g.lineTo(c + Math.cos(a2) * r1, c + Math.sin(a2) * r1)
            g.lineTo(bx - nx * w0, by - ny * w0)
            g.closePath()
            g.fill()
        }
        g.strokeStyle = css(ink, 0.2 + veins * 0.4)
        g.lineWidth = Math.max(0.6, R * 0.006)
        for (let q = 0; q < Math.round(veins * 6); q++) {
            const a = axis + (rnd() * 2 - 1) * 0.8 * hw * 0.9
            const rA = len * (0.62 + rnd() * 0.2)
            const rB = rA + len * (0.08 + rnd() * 0.12)
            g.beginPath()
            g.moveTo(c + Math.cos(a) * rA, c + Math.sin(a) * rA)
            g.lineTo(c + Math.cos(a) * rB, c + Math.sin(a) * rB)
            g.stroke()
        }
        g.strokeStyle = css(lighten(col, 0.4), 0.15 + shading * 0.35)
        g.lineWidth = lw * 3
        g.stroke(path)
        const nd = Math.round(dew * 14)
        for (let d = 0; d < nd; d++) {
            const a = axis + (rnd() * 2 - 1) * hw * 0.85
            const rr = len * (0.22 + rnd() * 0.72)
            const sz = R * (0.006 + rnd() * rnd() * 0.02)
            g.fillStyle = `rgba(255,255,255,${(0.5 + rnd() * 0.5).toFixed(3)})`
            g.beginPath()
            g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, sz, 0, TAU)
            g.fill()
        }
        g.restore()
        g.strokeStyle = css(ink, 0.9)
        g.lineWidth = lw
        g.stroke(path)
    }
    const hc = darken(base, 0.72)
    const hg = g.createRadialGradient(c, c, 0, c, c, R * 0.27)
    hg.addColorStop(0, css(hc, 0.95))
    hg.addColorStop(0.55, css(hc, 0.6))
    hg.addColorStop(1, css(hc, 0))
    g.fillStyle = hg
    g.beginPath()
    g.arc(c, c, R * 0.27, 0, TAU)
    g.fill()
    for (let i = 0; i < 22; i++) {
        const a = rnd() * TAU
        const rr = R * (0.12 + rnd() * 0.05)
        g.fillStyle = css(lighten(center, 0.15), 0.9)
        g.beginPath()
        g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, R * 0.014, 0, TAU)
        g.fill()
    }
    g.fillStyle = css(darken(center, 0.35))
    g.beginPath()
    g.arc(c, c, R * 0.115, 0, TAU)
    g.fill()
    for (let i = 0; i < 48; i++) {
        const a = rnd() * TAU
        const rr = R * 0.1 * Math.sqrt(rnd())
        const sz = R * (0.014 + rnd() * 0.012)
        const tt = rnd()
        g.fillStyle = css(tt < 0.3 ? darken(center, 0.35) : tt > 0.8 ? lighten(center, 0.35) : center)
        g.beginPath()
        g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, sz, 0, TAU)
        g.fill()
    }
    return cv
}

function makeDaisySprite(R: number, col: RGBA, center: RGBA, ink: RGBA, rnd: () => number) {
    const S = Math.ceil(R * 2.2) + 4
    const cv = makeCanvas(S, S)
    const g = cv.getContext("2d")!
    const c = S / 2
    const rot = rnd() * TAU
    for (let i = 0; i < 7; i++) {
        const axis = rot + (i * TAU) / 7 + (rnd() - 0.5) * 0.2
        g.save()
        g.translate(c, c)
        g.rotate(axis)
        g.beginPath()
        g.ellipse(R * 0.52, 0, R * 0.47, R * 0.24, 0, 0, TAU)
        const gr = g.createLinearGradient(0, 0, R, 0)
        gr.addColorStop(0, css(darken(col, 0.2)))
        gr.addColorStop(0.5, css(col))
        gr.addColorStop(1, css(col))
        g.fillStyle = gr
        g.fill()
        g.strokeStyle = css(ink, 0.7)
        g.lineWidth = Math.max(1, R * 0.04)
        g.stroke()
        g.restore()
    }
    const cc = mix(center, [245, 170, 60, 1], 0.6)
    g.fillStyle = css(cc)
    g.beginPath()
    g.arc(c, c, R * 0.2, 0, TAU)
    g.fill()
    for (let i = 0; i < 14; i++) {
        const a = rnd() * TAU
        const rr = R * 0.12 * Math.sqrt(rnd())
        g.fillStyle = css(rnd() < 0.5 ? darken(cc, 0.3) : lighten(cc, 0.3))
        g.beginPath()
        g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, R * 0.035, 0, TAU)
        g.fill()
    }
    return cv
}

function makeFloretSprite(R: number, col: RGBA, ink: RGBA) {
    const S = Math.ceil(R * 2.4) + 2
    const cv = makeCanvas(S, S)
    const g = cv.getContext("2d")!
    const c = S / 2
    for (let i = 0; i < 5; i++) {
        const a = (i * TAU) / 5 - Math.PI / 2
        g.beginPath()
        g.arc(c + Math.cos(a) * R * 0.52, c + Math.sin(a) * R * 0.52, R * 0.48, 0, TAU)
        g.fillStyle = css(col)
        g.fill()
        g.strokeStyle = css(ink, 0.6)
        g.lineWidth = Math.max(0.5, R * 0.08)
        g.stroke()
    }
    g.beginPath()
    g.arc(c, c, R * 0.18, 0, TAU)
    g.fillStyle = css(lighten(col, 0.65))
    g.fill()
    return cv
}

function makeLeafSprite(L: number, col: RGBA, rim: number): Leaf {
    const w = L * 0.19
    const pad = 3
    const cv = makeCanvas(L + pad * 2, w * 2 + pad * 2)
    const g = cv.getContext("2d")!
    const oy = cv.height / 2
    g.translate(pad, oy)
    const path = new Path2D()
    path.moveTo(0, 0)
    path.quadraticCurveTo(L * 0.38, -w * 1.3, L, 0)
    path.quadraticCurveTo(L * 0.38, w * 1.3, 0, 0)
    g.fillStyle = css(col)
    g.fill(path)
    g.save()
    g.clip(path)
    g.fillStyle = css(darken(col, 0.3), 0.6)
    g.fillRect(0, 0, L, w * 2)
    g.strokeStyle = css(lighten(col, 0.35), rim)
    g.lineWidth = Math.max(1, L * 0.03)
    g.stroke(path)
    g.restore()
    g.strokeStyle = css(lighten(col, 0.25), 0.1 + rim * 0.5)
    g.lineWidth = Math.max(0.8, L * 0.01)
    g.beginPath()
    g.moveTo(0, 0)
    g.quadraticCurveTo(L * 0.5, -w * 0.08, L * 0.95, 0)
    g.stroke()
    return { cv, ox: pad, oy, L }
}

function makeGlowSprite(R: number, col: RGBA, coreFrac: number) {
    const S = Math.ceil(R * 2) + 2
    const cv = makeCanvas(S, S)
    const g = cv.getContext("2d")!
    const c = S / 2
    const cf = clamp(coreFrac, 0.05, 1)
    const gr = g.createRadialGradient(c, c, 0, c, c, R)
    gr.addColorStop(0, css(lighten(col, 0.6)))
    gr.addColorStop(cf * 0.6, css(lighten(col, 0.15)))
    gr.addColorStop(cf, css(col, 0.9))
    gr.addColorStop(Math.min(0.99, cf * 2.2), css(col, 0.3))
    gr.addColorStop(1, css(col, 0))
    g.fillStyle = gr
    g.fillRect(0, 0, S, S)
    return cv
}

type Flower = { x: number; y: number; r: number; v: number; a: number; ph: number; z: number }
type LeafItem = { x: number; y: number; len: number; a: number; v: number; flip: number; ph: number }
type Floret = { x: number; y: number; r: number; v: number; ph: number }
type Daisy = { x: number; y: number; r: number; a: number; ph: number }
type Speck = { x: number; y: number; r: number; a: number; per: number; ph: number; bright: boolean }
type Fly = { x: number; y: number; ax: number; ay: number; pa: number; pb: number; pp: number; s: number }
type Layout = {
    flowers: Flower[]
    under: LeafItem[]
    leaves: LeafItem[]
    florets: Floret[]
    daisies: Daisy[]
    specks: Speck[]
    flies: Fly[]
}

function pickTone(rnd: () => number) {
    let x = rnd()
    for (let i = 0; i < TONE_WEIGHTS.length; i++) {
        x -= TONE_WEIGHTS[i]
        if (x <= 0) return i
    }
    return TONE_WEIGHTS.length - 1
}

function buildLayout(W: number, H: number, adv: Adv, sk: number, flyCount: number): Layout {
    const rnd = mulberry32((adv.seed | 0) * 9973 + 17)
    const r0 = Math.max(4, (adv.flowerMin / 100) * H * sk)
    const r1 = Math.max(r0, (adv.flowerMax / 100) * H * sk)
    const m = r1 * 0.9
    const overlap = clamp(80 / Math.max(10, adv.packing), 0.3, 1.4)
    const phaseOf = (x: number, y: number) => -((x * 0.8 + y * 0.3) / H) * 2.4
    const flowers: Flower[] = []
    const tries = 9000
    for (let i = 0; i < tries && flowers.length < 700; i++) {
        const prog = Math.min(1, (i / tries) * 1.6)
        const r = r1 - (r1 - r0) * Math.min(1, prog * (0.5 + rnd()))
        const x = -m + rnd() * (W + 2 * m)
        const y = -m + rnd() * (H + 2 * m)
        let ok = true
        for (const f of flowers) {
            const dx = f.x - x
            const dy = f.y - y
            const need = (f.r + r) * overlap
            if (dx * dx + dy * dy < need * need) {
                ok = false
                break
            }
        }
        if (!ok) continue
        flowers.push({
            x,
            y,
            r,
            v: pickTone(rnd) * VARIANTS + Math.floor(rnd() * VARIANTS),
            a: rnd() * TAU,
            ph: phaseOf(x, y),
            z: y + rnd() * H * 0.3,
        })
    }
    flowers.sort((a, b) => a.z - b.z)
    const gap = (x: number, y: number) => {
        let best = 9
        for (const f of flowers) {
            const d = Math.hypot(f.x - x, f.y - y) / f.r
            if (d < best) best = d
        }
        return best
    }
    const pick = (n: number): [number, number] => {
        let bx = 0
        let by = 0
        let bg = -1
        for (let k = 0; k < n; k++) {
            const x = rnd() * W
            const y = rnd() * H
            const g = gap(x, y)
            if (g > bg) {
                bg = g
                bx = x
                by = y
            }
        }
        return [bx, by]
    }
    const under: LeafItem[] = []
    for (let i = 0; i < Math.round(adv.undergrowth * 4); i++) {
        const x = rnd() * W
        const y = rnd() * H
        under.push({
            x,
            y,
            len: H * sk * (0.08 + rnd() * 0.08),
            a: -Math.PI / 2 + (rnd() - 0.5) * 2.8,
            v: 3,
            flip: rnd() < 0.5 ? -1 : 1,
            ph: phaseOf(x, y) + (rnd() - 0.5) * 0.4,
        })
    }
    const leaves: LeafItem[] = []
    for (let i = 0; i < adv.leaves; i++) {
        const [x, y] = pick(3)
        leaves.push({
            x,
            y,
            len: H * sk * (0.07 + rnd() * 0.07),
            a: -Math.PI / 2 + (rnd() - 0.5) * 2.4,
            v: Math.floor(rnd() * 3),
            flip: rnd() < 0.5 ? -1 : 1,
            ph: phaseOf(x, y) + (rnd() - 0.5) * 0.4,
        })
    }
    const florets: Floret[] = []
    for (let c = 0; c < adv.clusters; c++) {
        const [cx, cy] = pick(6)
        const n = 18 + Math.floor(rnd() * 16)
        const spread = H * sk * 0.045
        for (let j = 0; j < n; j++) {
            const g1 = rnd() + rnd() + rnd() - 1.5
            const g2 = rnd() + rnd() + rnd() - 1.5
            florets.push({
                x: cx + g1 * spread * 1.3,
                y: cy + g2 * spread,
                r: H * sk * 0.0065 * (0.75 + rnd() * 0.5),
                v: Math.floor(rnd() * 3),
                ph: rnd() * TAU,
            })
        }
    }
    const daisies: Daisy[] = []
    for (let i = 0; i < adv.daisies; i++) {
        const [x, y] = pick(2)
        daisies.push({ x, y, r: H * sk * 0.024 * (0.85 + rnd() * 0.3), a: rnd() * TAU, ph: phaseOf(x, y) })
    }
    const specks: Speck[] = []
    const pers = [2, 3, 4, 6]
    for (let i = 0; i < adv.speckle; i++) {
        specks.push({
            x: rnd() * W,
            y: rnd() * H,
            r: 0.3 + rnd() * 0.7,
            a: 0.6 + rnd() * 0.4,
            per: pers[Math.floor(rnd() * 4)],
            ph: rnd() * TAU,
            bright: rnd() < 0.08,
        })
    }
    const frnd = mulberry32((adv.seed | 0) * 7 + 11)
    const flies: Fly[] = []
    for (let i = 0; i < flyCount; i++) {
        flies.push({
            x: frnd() * W,
            y: frnd() * H,
            ax: 0.6 + frnd() * 0.5,
            ay: 0.5 + frnd() * 0.4,
            pa: frnd() * TAU,
            pb: frnd() * TAU,
            pp: frnd() * TAU,
            s: 0.6 + frnd() * 0.7,
        })
    }
    return { flowers, under, leaves, florets, daisies, specks, flies }
}

export interface FullBleedIllustratedProps {
    background?: string
    fireflyColor?: string
    speed?: number
    scale?: number
    sway?: number
    fireflies?: number
    advanced?: {
        seed?: number
        flowerMin?: number
        flowerMax?: number
        packing?: number
        indigo?: string
        violet?: string
        lilac?: string
        mauve?: string
        dusk?: string
        centerColor?: string
        inkColor?: string
        shading?: number
        veins?: number
        swayPeriod?: number
        leafSway?: number
        drift?: number
        breathe?: number
        daisies?: number
        daisyColor?: string
        clusters?: number
        floretColor?: string
        leaves?: number
        leafColor?: string
        undergrowth?: number
        dewDots?: number
        fireflySize?: number
        glowSize?: number
        fireflyDrift?: number
        pulseMs?: number
        speckle?: number
        speckleSize?: number
        twinkle?: number
        hoverRadius?: number
        hoverLean?: number
        grain?: number
        vignette?: number
        hover?: number
    }
    style?: CSSProperties
}

/**
 * Night flower field
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function FullBleedIllustrated(props: FullBleedIllustratedProps) {
    const {
        speed = 100,
        scale = 100,
        sway = 100,
        fireflies = 60,
        fireflyColor = "#FFA63D",
        background = "#000000",
        style,
    } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const valsRef = useRef<any>(null)
    valsRef.current = { speed, scale, sway, fireflies, fireflyColor, background, advanced: props.advanced }

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
            const cw = Math.max(1, Math.round(W * dpr))
            const ch = Math.max(1, Math.round(H * dpr))
            if (canvas.width !== cw) canvas.width = cw
            if (canvas.height !== ch) canvas.height = ch
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const ptr = { x: 0, y: 0, sx: 0, sy: 0, inside: 0, over: 0, pressed: 0, down: 0, seen: false }
        const setPos = (e: PointerEvent) => {
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            if (!ptr.seen) {
                ptr.sx = ptr.x
                ptr.sy = ptr.y
                ptr.seen = true
            }
        }
        const onEnter = (e: PointerEvent) => {
            setPos(e)
            ptr.inside = 1
        }
        const onMove = (e: PointerEvent) => {
            setPos(e)
            ptr.inside = 1
        }
        const onLeave = () => {
            ptr.inside = 0
        }
        const onDown = (e: PointerEvent) => {
            setPos(e)
            ptr.pressed = 1
        }
        const onUp = () => {
            ptr.pressed = 0
        }
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        const noise = makeCanvas(160, 160)
        {
            const g = noise.getContext("2d")!
            const img = g.createImageData(160, 160)
            const r = mulberry32(99)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = r() < 0.5 ? 0 : 255
                img.data[i] = v
                img.data[i + 1] = v
                img.data[i + 2] = v
                img.data[i + 3] = Math.floor(r() * 255)
            }
            g.putImageData(img, 0, 0)
        }
        let noisePattern: CanvasPattern | null = null

        let spriteKey = ""
        let Rs = 64
        let FR = 8
        let DR = 16
        let flowerSprites: HTMLCanvasElement[] = []
        let daisySprite: HTMLCanvasElement | null = null
        let floretSprites: HTMLCanvasElement[] = []
        let leafSprites: Leaf[] = []
        let glowKey = ""
        let glowSprite: HTMLCanvasElement | null = null
        let starSprite: HTMLCanvasElement | null = null
        const RG = 64
        let layoutKey = ""
        let lay: Layout | null = null

        const stamp = (img: HTMLCanvasElement, x: number, y: number, rot: number, k: number, ox: number, oy: number) => {
            const cs = Math.cos(rot) * k * dpr
            const sn = Math.sin(rot) * k * dpr
            ctx.setTransform(cs, sn, -sn, cs, x * dpr, y * dpr)
            ctx.drawImage(img, -ox, -oy)
        }

        let fF = 0
        let fX = 0
        let fY = 0
        let last = -1
        let t = 0
        let raf = 0
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            let dt = last < 0 ? 0 : (now - last) / 1000
            last = now
            dt = Math.min(dt, 1 / 20)
            const v = valsRef.current
            const adv: Adv = { ...ADVANCED_DEFAULTS, ...(v.advanced ?? {}) }
            const reduced = !!(mq && mq.matches)
            const rate = reduced ? 0 : Math.max(0, v.speed) / 50
            t += dt * rate

            const eP = 1 - Math.exp(-dt * 12)
            const eO = 1 - Math.exp(-dt / 0.13)
            ptr.sx += (ptr.x - ptr.sx) * eP
            ptr.sy += (ptr.y - ptr.sy) * eP
            ptr.over += (ptr.inside - ptr.over) * eO
            ptr.down += (ptr.pressed - ptr.down) * eO
            if (W < 2 || H < 2) return

            const sk = clamp(v.scale, 10, 400) / 100
            const swayAmt = clamp(v.sway, 0, 100) / 50
            const hoverAmt = clamp(adv.hover, 0, 100) / 50
            const flyCount = clamp(Math.round(v.fireflies), 0, 200)

            const r1px = Math.max(4, (adv.flowerMax / 100) * H * sk)
            const rs = clamp(Math.ceil((r1px * dpr) / 16) * 16, 32, 224)
            const lb = clamp(Math.ceil((0.14 * H * sk * dpr) / 16) * 16, 24, 240)
            const fr = clamp(Math.round(0.008 * H * sk * dpr), 4, 40)
            const dr = clamp(Math.round(0.03 * H * sk * dpr), 8, 80)
            const sKey = [
                rs, lb, fr, dr, adv.seed, adv.indigo, adv.violet, adv.lilac, adv.mauve, adv.dusk,
                adv.centerColor, adv.inkColor, adv.shading, adv.veins, adv.dewDots,
                adv.daisyColor, adv.floretColor, adv.leafColor,
            ].join("|")
            if (sKey !== spriteKey) {
                spriteKey = sKey
                Rs = rs
                FR = fr
                DR = dr
                const srnd = mulberry32((adv.seed | 0) * 31 + 5)
                const tones = [adv.indigo, adv.violet, adv.lilac, adv.mauve, adv.dusk].map((s, i) =>
                    parseColor(s, TONE_FALLBACK[i])
                )
                const center = parseColor(adv.centerColor, [200, 160, 96, 1])
                const ink = parseColor(adv.inkColor, [26, 20, 51, 1])
                const shade = clamp(adv.shading, 0, 100) / 100
                const vein = clamp(adv.veins, 0, 100) / 100
                const dew = clamp(adv.dewDots, 0, 100) / 100
                flowerSprites = []
                for (const tone of tones)
                    for (let k = 0; k < VARIANTS; k++)
                        flowerSprites.push(makeFlowerSprite(rs, tone, center, ink, shade, vein, dew, srnd))
                const leafCol = parseColor(adv.leafColor, [35, 80, 78, 1])
                leafSprites = [
                    makeLeafSprite(lb, leafCol, 0.7),
                    makeLeafSprite(lb, darken(leafCol, 0.25), 0.5),
                    makeLeafSprite(lb, lighten(leafCol, 0.1), 0.8),
                    makeLeafSprite(lb, mix(leafCol, UNDER, 0.65), 0.25),
                ]
                const flCol = parseColor(adv.floretColor, [44, 75, 242, 1])
                floretSprites = [
                    makeFloretSprite(fr, flCol, ink),
                    makeFloretSprite(fr, darken(flCol, 0.3), ink),
                    makeFloretSprite(fr, lighten(flCol, 0.2), ink),
                ]
                daisySprite = makeDaisySprite(dr, parseColor(adv.daisyColor, [244, 244, 246, 1]), center, ink, srnd)
            }
            const gKey = `${v.fireflyColor}|${adv.glowSize}`
            if (gKey !== glowKey) {
                glowKey = gKey
                glowSprite = makeGlowSprite(RG, parseColor(v.fireflyColor, [255, 166, 61, 1]), 1 / Math.max(1.5, adv.glowSize))
                starSprite = makeGlowSprite(16, WHITE, 0.25)
            }
            const lKey = [
                Math.round(W), Math.round(H), sk, adv.seed, adv.flowerMin, adv.flowerMax, adv.packing,
                adv.leaves, adv.undergrowth, adv.clusters, adv.daisies, adv.speckle, flyCount,
            ].join("|")
            if (lKey !== layoutKey || !lay) {
                layoutKey = lKey
                lay = buildLayout(W, H, adv, sk, flyCount)
            }

            const per = Math.max(500, adv.swayPeriod) / 1000
            const w = TAU / per
            const hr = Math.max(1, (adv.hoverRadius / 100) * H)
            const pAmt = ptr.over * hoverAmt
            const field = (x: number, y: number) => {
                fF = 0
                if (pAmt < 0.001) return
                const dx = x - ptr.sx
                const dy = y - ptr.sy
                const d2 = dx * dx + dy * dy
                if (d2 > hr * hr * 9) return
                const d = Math.sqrt(d2) + 1e-3
                fF = Math.exp(-d2 / (hr * hr)) * pAmt
                fX = dx / d
                fY = dy / d
            }

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalCompositeOperation = "source-over"
            ctx.globalAlpha = 1
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = typeof v.background === "string" ? v.background : "#000000"
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            const leafRad = (adv.leafSway * Math.PI) / 180
            const drawLeaves = (items: LeafItem[]) => {
                for (const l of items) {
                    const sp = leafSprites[l.v]
                    if (!sp) continue
                    if (l.x < -l.len || l.x > W + l.len || l.y < -l.len || l.y > H + l.len) continue
                    field(l.x, l.y)
                    const rot = l.a + Math.sin(w * t + l.ph) * leafRad * swayAmt * l.flip + fF * 0.25 * l.flip * (1 + ptr.down)
                    stamp(sp.cv, l.x, l.y, rot, l.len / sp.L, sp.ox, sp.oy)
                }
            }
            drawLeaves(lay.under)
            drawLeaves(lay.leaves)

            for (const f of lay.florets) {
                const sp = floretSprites[f.v]
                if (!sp) continue
                field(f.x, f.y)
                const push = fF * hr * 0.08 * (1 + ptr.down)
                const x = f.x + Math.sin(t * 1.3 + f.ph) * 0.6 * swayAmt + fX * push
                const y = f.y + Math.cos(t * 1.1 + f.ph) * 0.4 * swayAmt + fY * push
                stamp(sp, x, y, f.ph, f.r / FR, sp.width / 2, sp.height / 2)
            }

            const flRot = (1.2 * Math.PI) / 180
            for (const f of lay.flowers) {
                const sp = flowerSprites[f.v]
                if (!sp) continue
                const ph = w * t + f.ph
                let x = f.x + Math.sin(ph) * f.r * (adv.drift / 100) * swayAmt
                let y = f.y + Math.cos(ph * 0.7 + f.ph) * f.r * (adv.drift / 200) * swayAmt
                let rot = f.a + Math.sin(ph + 0.6) * flRot * swayAmt
                let s = 1 + Math.sin(ph * 0.5 + f.ph) * (adv.breathe / 1000) * swayAmt
                field(x, y)
                if (fF > 0) {
                    const push = fF * (adv.hoverLean / 100) * f.r * (1 + ptr.down)
                    x += fX * push
                    y += fY * push
                    rot += fF * 0.08 * (fX >= 0 ? 1 : -1)
                    s += fF * 0.04 * (1 + ptr.down)
                }
                const rr = f.r * s * 1.1
                if (x + rr < 0 || x - rr > W || y + rr < 0 || y - rr > H) continue
                stamp(sp, x, y, rot, (f.r * s) / Rs, sp.width / 2, sp.height / 2)
            }

            if (daisySprite) {
                for (const d of lay.daisies) {
                    field(d.x, d.y)
                    const rot = d.a + Math.sin(w * t + d.ph) * 0.06 * swayAmt + fF * 0.2
                    stamp(daisySprite, d.x + fX * fF * hr * 0.05, d.y + fY * fF * hr * 0.05, rot, d.r / DR, daisySprite.width / 2, daisySprite.height / 2)
                }
            }

            const tw = clamp(adv.twinkle, 0, 100) / 100
            const ss = Math.max(0.2, adv.speckleSize / 3)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.fillStyle = "#ffffff"
            for (const s of lay.specks) {
                const al = s.a * (1 - tw + tw * (0.5 + 0.5 * Math.sin((TAU * t) / s.per + s.ph)))
                const x = s.x + Math.sin(t * 0.3 + s.ph) * 2
                const y = s.y + Math.cos(t * 0.25 + s.ph) * 2
                ctx.globalAlpha = al
                ctx.beginPath()
                ctx.arc(x, y, s.r * ss, 0, TAU)
                ctx.fill()
            }
            if (starSprite) {
                ctx.globalCompositeOperation = "lighter"
                for (const s of lay.specks) {
                    if (!s.bright) continue
                    const al = s.a * (1 - tw + tw * (0.5 + 0.5 * Math.sin((TAU * t) / s.per + s.ph)))
                    const sz = s.r * ss * 8
                    ctx.globalAlpha = al * 0.7
                    ctx.drawImage(starSprite, s.x - sz, s.y - sz, sz * 2, sz * 2)
                }
                ctx.globalCompositeOperation = "source-over"
            }

            if (glowSprite) {
                const fd = adv.fireflyDrift / 3
                const pulse = Math.max(200, adv.pulseMs) / 1000
                const core = Math.max(0.5, adv.fireflySize) * sk
                for (const f of lay.flies) {
                    let x = f.x + Math.sin(t * 0.23 * f.s + f.pa) * f.ax * H * 0.08 * fd
                    let y = f.y + Math.cos(t * 0.17 * f.s + f.pb) * f.ay * H * 0.06 * fd
                    field(x, y)
                    if (fF > 0) {
                        const pull = fF * hr * 0.15 * (ptr.down > 0.5 ? -1.5 : 1)
                        x -= fX * pull
                        y -= fY * pull
                    }
                    const p = 0.55 + 0.45 * Math.sin((TAU * t) / pulse + f.pp)
                    const cs = core * (0.8 + 0.3 * p) * (0.8 + f.s * 0.3)
                    const gr = cs * Math.max(1.5, adv.glowSize)
                    ctx.globalAlpha = clamp(0.35 + 0.65 * p, 0, 1)
                    ctx.drawImage(glowSprite, x - gr, y - gr, gr * 2, gr * 2)
                }
            }
            ctx.globalAlpha = 1

            if (adv.grain > 0) {
                if (!noisePattern) noisePattern = ctx.createPattern(noise, "repeat")
                if (noisePattern) {
                    const ox = Math.floor(Math.random() * 160)
                    const oy = Math.floor(Math.random() * 160)
                    ctx.setTransform(1, 0, 0, 1, -ox, -oy)
                    ctx.globalCompositeOperation = "overlay"
                    ctx.globalAlpha = (clamp(adv.grain, 0, 100) / 100) * 0.22
                    ctx.fillStyle = noisePattern
                    ctx.fillRect(0, 0, canvas.width + 160, canvas.height + 160)
                    ctx.globalCompositeOperation = "source-over"
                    ctx.globalAlpha = 1
                }
            }
            if (adv.vignette > 0) {
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
                const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) / 2)
                vg.addColorStop(0, "rgba(0,0,0,0)")
                vg.addColorStop(1, `rgba(0,0,0,${((clamp(adv.vignette, 0, 100) / 100) * 0.85).toFixed(3)})`)
                ctx.fillStyle = vg
                ctx.fillRect(0, 0, W, H)
            }
            ctx.setTransform(1, 0, 0, 1, 0, 0)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointerenter", onEnter)
            root.removeEventListener("pointermove", onMove)
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
                minWidth: 1200,
                minHeight: 800,
                overflow: "hidden",
                background,
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
