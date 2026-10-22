"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * A newspaper front page with a hand-painted slogan brushed on stroke by stroke,
 * held, cleared and painted again.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    margin: 2,
    mastheadColor: "#111111",
    headColor: "#151515",
    bodyColor: "#2A2A2A",
    ruleColor: "#222222",
    borderColor: "#C8C8C8",
    titleSize: 64,
    bodySize: 7,
    leading: 9,
    columnWidth: 85,
    columnVary: 30,
    weight: 18,
    bristles: 24,
    tilt: 4,
    jitter: 8,
    tracking: 6,
    lineGap: 12,
    lineShift: 5,
    textX: 50,
    textY: 50,
    brushRate: 140,
    strokeMin: 120,
    strokeMax: 600,
    strokeGap: 30,
    letterGap: 80,
    linePause: 250,
    fadeMs: 600,
    fadeStagger: 50,
    blankMs: 400,
    paperShift: 6,
    inkShift: 12,
    seed: 7,
    grain: 6,
    vignette: 0,
    hover: 50,
}

const LEAD_MS = 200
const SERIF = "'Times New Roman', Times, 'Liberation Serif', serif"
const MONO = "'Courier New', Courier, monospace"
const BLACKLETTER =
    "'UnifrakturMaguntia', 'Old English Text MT', 'Engravers Old English BT', 'Luminari', serif"
const FONT_LINK_ID = "Studio-unifraktur"

// ── brush alphabet: centre-line skeletons in a 0..1 cap box (y down, 1 = baseline) ──
// L = polyline, C = smooth (Catmull-Rom), D = dot painted at the end of the line
const O_STROKE =
    "C 0.44 0.03 0.16 0.12 0.05 0.45 0.12 0.8 0.4 0.97 0.68 0.88 0.78 0.55 0.7 0.18 0.46 0.03 0.34 0.08"
const P_STROKES = [
    "L 0.07 1 0.07 0.03",
    "C 0.07 0.03 0.42 0.03 0.6 0.14 0.62 0.32 0.45 0.5 0.08 0.52",
]
const RAW_GLYPHS: Record<string, { w: number; s: string[] }> = {
    A: { w: 0.8, s: ["L 0.03 1 0.4 0.02", "L 0.4 0.02 0.77 1", "L 0.2 0.64 0.62 0.62"] },
    B: {
        w: 0.7,
        s: [
            "L 0.07 0.02 0.07 1",
            "C 0.07 0.03 0.42 0.03 0.6 0.14 0.58 0.32 0.4 0.46 0.08 0.48",
            "C 0.1 0.48 0.48 0.5 0.67 0.64 0.66 0.85 0.45 0.98 0.07 0.98",
        ],
    },
    C: { w: 0.72, s: ["C 0.68 0.16 0.5 0.03 0.3 0.05 0.11 0.24 0.05 0.5 0.1 0.77 0.3 0.96 0.52 0.98 0.7 0.86"] },
    D: { w: 0.76, s: ["L 0.07 0.02 0.07 1", "C 0.07 0.03 0.4 0.04 0.64 0.2 0.72 0.5 0.62 0.8 0.38 0.96 0.07 0.98"] },
    E: { w: 0.62, s: ["L 0.58 0.03 0.07 0.03 0.07 0.98 0.6 0.97", "L 0.08 0.5 0.5 0.49"] },
    F: { w: 0.6, s: ["L 0.08 0.03 0.07 1", "L 0.08 0.03 0.58 0.02", "L 0.08 0.48 0.48 0.47"] },
    G: {
        w: 0.78,
        s: [
            "C 0.7 0.16 0.5 0.03 0.3 0.05 0.11 0.24 0.05 0.5 0.1 0.77 0.3 0.96 0.55 0.98 0.72 0.82 0.74 0.58",
            "L 0.74 0.57 0.42 0.57",
        ],
    },
    H: { w: 0.74, s: ["L 0.07 0.01 0.07 1", "L 0.67 0.01 0.67 1", "L 0.08 0.5 0.66 0.49"] },
    I: { w: 0.22, s: ["L 0.11 0.01 0.11 1"] },
    i: { w: 0.24, s: ["L 0.12 0.32 0.12 1", "D 0.115 0.03 0.125 0.13"] },
    J: { w: 0.56, s: ["C 0.5 0.01 0.5 0.6 0.46 0.84 0.3 0.97 0.12 0.92 0.04 0.76"] },
    K: { w: 0.7, s: ["L 0.07 0.01 0.07 1", "L 0.66 0.02 0.08 0.6", "L 0.3 0.42 0.68 1"] },
    L: { w: 0.58, s: ["L 0.08 0.01 0.08 0.97 0.56 0.97"] },
    M: { w: 0.96, s: ["L 0.05 1 0.12 0.02 0.48 0.62 0.84 0.02 0.91 1"] },
    N: { w: 0.78, s: ["L 0.07 1 0.07 0.02 0.7 0.98 0.7 0.01"] },
    O: { w: 0.82, s: [O_STROKE] },
    P: { w: 0.66, s: P_STROKES },
    Q: { w: 0.84, s: [O_STROKE, "L 0.48 0.68 0.82 1.02"] },
    R: { w: 0.7, s: [...P_STROKES, "L 0.3 0.52 0.68 1"] },
    S: {
        w: 0.66,
        s: ["C 0.62 0.13 0.45 0.03 0.22 0.04 0.07 0.2 0.12 0.4 0.35 0.5 0.55 0.6 0.62 0.8 0.48 0.96 0.22 0.98 0.03 0.85"],
    },
    T: { w: 0.7, s: ["L 0.02 0.03 0.68 0.02", "L 0.35 0.03 0.35 1"] },
    U: { w: 0.75, s: ["C 0.07 0.01 0.06 0.6 0.12 0.85 0.35 0.98 0.58 0.88 0.67 0.6 0.68 0.01"] },
    V: { w: 0.74, s: ["L 0.02 0.01 0.37 1 0.72 0.01"] },
    W: { w: 1.06, s: ["L 0.02 0.01 0.25 1 0.53 0.18 0.81 1 1.04 0.01"] },
    X: { w: 0.72, s: ["L 0.03 0.01 0.69 1", "L 0.69 0.01 0.03 1"] },
    Y: { w: 0.72, s: ["L 0.03 0.01 0.36 0.5", "L 0.69 0.01 0.36 0.5 0.36 1"] },
    Z: { w: 0.68, s: ["L 0.04 0.03 0.64 0.03 0.04 0.97 0.66 0.97"] },
    "?": {
        w: 0.6,
        s: ["C 0.06 0.22 0.2 0.04 0.4 0.02 0.56 0.14 0.56 0.32 0.42 0.46 0.3 0.56 0.29 0.74", "L 0.29 0.9 0.3 0.99"],
    },
    "!": { w: 0.24, s: ["L 0.12 0.01 0.12 0.7", "L 0.12 0.9 0.125 0.99"] },
    ".": { w: 0.22, s: ["L 0.11 0.9 0.115 0.99"] },
    ",": { w: 0.22, s: ["L 0.13 0.88 0.08 1.08"] },
    "'": { w: 0.2, s: ["L 0.1 0.01 0.09 0.22"] },
    "-": { w: 0.5, s: ["L 0.05 0.55 0.45 0.53"] },
}

type Glyph = { w: number; strokes: { kind: string; pts: number[][] }[] }
const GLYPHS: Record<string, Glyph> = {}
for (const k of Object.keys(RAW_GLYPHS)) {
    GLYPHS[k] = {
        w: RAW_GLYPHS[k].w,
        strokes: RAW_GLYPHS[k].s.map((str) => {
            const parts = str.trim().split(/\s+/)
            const nums = parts.slice(1).map(Number)
            const pts: number[][] = []
            for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]])
            return { kind: parts[0], pts }
        }),
    }
}

function glyphFor(ch: string): Glyph | null {
    if (ch === "i") return GLYPHS.i
    if (ch === "0") return GLYPHS.O
    if (ch === "1") return GLYPHS.I
    return GLYPHS[ch] || GLYPHS[ch.toUpperCase()] || null
}

const HEADS = [
    "NEW YORK FASHION",
    "SUMMER VIBES",
    "DAILY NEWS",
    "PARTY AT THE BEACH",
    "NYC BARS",
    "DISCO TIME",
    "LOOKING FABULOUS",
    "SUMMER",
    "ARTS",
    "CITY NIGHTS",
    "STREET STYLE",
    "BAKING IN THE SUN",
    "WEEKEND GUIDE",
]
const WORDS = (
    "the city summer fashion week new york style runway designers season streets beach party night iconic " +
    "culture vibrant trends classic modern bold looks collection showcase art music friends sunset rooftop " +
    "gallery avenue market crowd stories evening morning daily life local news lights dance energy color " +
    "fabric vintage boutique coffee walk park harbor moments inspired fresh bright of and in a to with for " +
    "is on as by its from at this that every where young first open"
).split(" ")

// ── maths helpers ──
function mulberry(seed: number) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
function hash1(n: number) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
    return s - Math.floor(s)
}
function vnoise(x: number) {
    const i = Math.floor(x)
    const f = x - i
    const u = f * f * (3 - 2 * f)
    return hash1(i) * (1 - u) + hash1(i + 1) * u
}
function sm(x: number) {
    return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)
}
function clamp01(x: number) {
    return x < 0 ? 0 : x > 1 ? 1 : x
}
function bezierEase(x1: number, y1: number, x2: number, y2: number) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
    const sx = (t: number) => ((ax * t + bx) * t + cx) * t
    const sy = (t: number) => ((ay * t + by) * t + cy) * t
    const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx
    return (x: number) => {
        if (x <= 0) return 0
        if (x >= 1) return 1
        let t = x
        for (let i = 0; i < 8; i++) {
            const e = sx(t) - x
            if (Math.abs(e) < 1e-5) break
            const d = dsx(t)
            if (Math.abs(d) < 1e-6) break
            t -= e / d
        }
        if (t < 0 || t > 1 || Math.abs(sx(t) - x) > 1e-3) {
            let lo = 0, hi = 1
            t = x
            for (let i = 0; i < 24; i++) {
                if (sx(t) < x) lo = t
                else hi = t
                t = (lo + hi) / 2
            }
        }
        return sy(t)
    }
}
const EASE_PAINT = bezierEase(0.3, 0, 0.2, 1)
const EASE_FADE = bezierEase(0.45, 0, 0.55, 1)

// How far (in page units) the masthead band grows downward so a large nameplate or logo
// never rises past the top edge of the page. 0 at the default Title Size.
function headShift(adv: any) {
    return Math.max(0, 0.88 * adv.titleSize - 88)
}

function imageSrc(v: any): string {
    if (!v) return ""
    if (typeof v === "string") return v
    return typeof v.src === "string" ? v.src : ""
}

// ── brush strokes ──
function densify(kind: string, pts: number[][]) {
    if (kind !== "C" || pts.length < 3) return pts
    const out: number[][] = []
    const n = pts.length
    for (let i = 0; i < n - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)]
        for (let k = 0; k < 12; k++) {
            const t = k / 12, t2 = t * t, t3 = t2 * t
            out.push([
                0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
            ])
        }
    }
    out.push(pts[n - 1])
    return out
}

function makeStroke(dense: number[][], S: number, wS: number, B: number, rng: () => number) {
    const m = dense.length
    const cum = [0]
    for (let i = 1; i < m; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]))
    const L = Math.max(cum[m - 1], 0.5)
    const step0 = Math.max(0.8, S / 170)
    const n = Math.max(2, Math.ceil(L / step0) + 1)
    const step = L / (n - 1)
    const x = new Float32Array(n), y = new Float32Array(n)
    const nx = new Float32Array(n), ny = new Float32Array(n)
    let seg = 0
    for (let i = 0; i < n; i++) {
        if (m < 2) {
            x[i] = dense[0][0]
            y[i] = dense[0][1] + i * step
            continue
        }
        const d = i * step
        while (seg < m - 2 && cum[seg + 1] < d) seg++
        const sl = cum[seg + 1] - cum[seg] || 1
        const t = clamp01((d - cum[seg]) / sl)
        x[i] = dense[seg][0] + (dense[seg + 1][0] - dense[seg][0]) * t
        y[i] = dense[seg][1] + (dense[seg + 1][1] - dense[seg][1]) * t
    }
    // normals from a window wide enough to round polyline corners
    const k = Math.max(1, Math.round((wS * 0.35) / step))
    for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - k), b = Math.min(n - 1, i + k)
        let tx = x[b] - x[a], ty = y[b] - y[a]
        const len = Math.hypot(tx, ty)
        if (len < 1e-4) {
            tx = 1
            ty = 0
        } else {
            tx /= len
            ty /= len
        }
        nx[i] = -ty
        ny[i] = tx
    }
    const off = new Float32Array(B), rad = new Float32Array(B), seed = new Float32Array(B)
    const spacing = wS / B
    for (let j = 0; j < B; j++) {
        off[j] = (j + 0.5) / B - 0.5 + ((rng() - 0.5) * 0.6) / B
        let r = spacing * (0.55 + rng() * 0.55)
        if (Math.abs(off[j]) > 0.42) r *= 0.75
        rad[j] = Math.max(0.35, r)
        seed[j] = rng() * 500
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (let i = 0; i < n; i++) {
        if (x[i] < minX) minX = x[i]
        if (x[i] > maxX) maxX = x[i]
        if (y[i] < minY) minY = y[i]
        if (y[i] > maxY) maxY = y[i]
    }
    return {
        x, y, nx, ny, n, len: L, step, w: wS, B, off, rad, seed,
        nl: Math.max(2, wS * 0.9),
        minX: minX - wS, minY: minY - wS, maxX: maxX + wS, maxY: maxY + wS,
        start: 0, dur: 100, done: -1, line: null as any,
    }
}

function paintRange(ctx: CanvasRenderingContext2D, st: any, a: number, b: number, dry: number, ink: string) {
    ctx.strokeStyle = ink
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    const L = st.len
    const taper = 0.08 * L
    for (let j = 0; j < st.B; j++) {
        const o = st.off[j]
        const ao = Math.abs(o)
        const edge = 0.55 + 1.8 * ao
        ctx.lineWidth = st.rad[j] * 2
        ctx.beginPath()
        let pen = false
        for (let i = a; i <= b; i++) {
            const s = i * st.step
            const u = s / L
            let f = 0.6 + 0.4 * sm(s / taper)
            if (u > 0.9) f *= 1 - 0.18 * sm((u - 0.9) / 0.1)
            const pDrop = dry * (0.15 + 0.85 * sm((u - 0.62) / 0.38)) * edge
            const visible = pDrop <= 0 || vnoise(st.seed[j] + s / st.nl) > pDrop
            if (!visible) {
                pen = false
                continue
            }
            const wob = 1 + (vnoise(st.seed[j] * 1.7 + 50 + s / (st.nl * 0.35)) - 0.5) * 0.36 * ao
            const d = o * st.w * f * wob
            const px = st.x[i] + st.nx[i] * d
            const py = st.y[i] + st.ny[i] * d
            if (!pen) {
                ctx.moveTo(px, py)
                ctx.lineTo(px + 0.01, py)
                pen = true
            } else ctx.lineTo(px, py)
        }
        ctx.stroke()
    }
}

function buildLayout(W: number, H: number, dpr: number, p: any, adv: any, area?: { top: number; bot: number }) {
    const m = Math.round((H * adv.margin) / 100)
    const pw = W - 2 * m, ph = H - 2 * m
    const U = ph / 1000
    // the lettering stays below the masthead as it is actually drawn (zoomed and aligned)
    const bodyTop = area ? area.top : m + 165 * U
    const bodyBot = area ? area.bot : m + 978 * U
    const rng = mulberry(Math.round(adv.seed) * 9973 + 17)
    const rows = String(p.text ?? "").split("\n").map((s) => s.trim()).filter((s) => s.length > 0)
    const tracking = adv.tracking / 100
    const gap = adv.lineGap / 100
    const tilt = (adv.tilt * Math.PI) / 180
    const jit = adv.jitter / 100
    const B = Math.max(4, Math.round(adv.bristles))

    const lines = rows.map((row) => {
        const letters: any[] = []
        let w = 0
        for (const ch of Array.from(row)) {
            const g = ch === " " ? null : glyphFor(ch)
            if (!g) {
                letters.push({ space: true, adv: 0.34 })
                w += 0.34
                continue
            }
            const sx = 1 + (rng() - 0.5) * jit
            const sy = 1 + (rng() - 0.5) * jit * 1.6
            const rot = (rng() * 2 - 1) * tilt
            const dy = (rng() - 0.5) * jit * 0.6
            const ws = Math.floor(rng() * 1e6)
            const a = g.w * sx + tracking
            letters.push({ g, sx, sy, rot, dy, ws, adv: a })
            w += a
        }
        if (letters.length && !letters[letters.length - 1].space) w -= tracking
        return { letters, w, shift: rng() * 2 - 1 }
    })

    const out: any = { lines: [], all: [], paintEnd: LEAD_MS, drawnT: -Infinity }
    if (!lines.length) return out
    const n = lines.length
    const maxW = pw * 0.94
    const maxH = (bodyBot - bodyTop) * 0.98
    const widest = Math.max(0.1, ...lines.map((l) => l.w))
    const S = Math.max(8, Math.min(Math.max(8, p.size), maxW / widest, maxH / (n + (n - 1) * gap)))
    const total = S * (n + (n - 1) * gap)
    // 0 = against the top of the column area, 100 = against the bottom, 50 = centred on the stage
    const topLo = bodyTop
    const topHi = Math.max(topLo, bodyBot - total)
    const topMid = Math.max(topLo, Math.min(topHi, H / 2 - total / 2))
    const ty = clamp01(adv.textY / 100)
    const top = ty < 0.5 ? topLo + (topMid - topLo) * ty * 2 : topMid + (topHi - topMid) * (ty - 0.5) * 2
    const pxPerMs = ((adv.brushRate / 100) * H) / 1000
    let tm = LEAD_MS

    lines.forEach((line, li) => {
        const baseline = top + S + li * S * (1 + gap)
        const lw = line.w * S
        const maxShift = Math.max(0, (maxW - lw) / 2)
        const left = m + (pw - maxW) / 2
        const right = Math.max(left, m + pw - (pw - maxW) / 2 - lw)
        // 0 = flush to the page's left margin, 100 = flush right, 50 = centred
        let x = left + ((right - left) * adv.textX) / 100 + line.shift * Math.min(maxShift, (adv.lineShift / 100) * W)
        x = Math.max(left, Math.min(right, x))
        const lineObj: any = { strokes: [], cv: null, ctx: null, bx: 0, by: 0, bw: 1, bh: 1 }
        const letterGroups: any[][] = []
        const dots: any[] = []
        for (const lt of line.letters) {
            if (lt.space) {
                x += lt.adv * S
                continue
            }
            const g: Glyph = lt.g
            const cx = x + (g.w * lt.sx * S) / 2
            const cy = baseline - 0.5 * S * lt.sy + lt.dy * S
            const cos = Math.cos(lt.rot), sin = Math.sin(lt.rot)
            const lr = mulberry(lt.ws)
            const group: any[] = []
            for (const def of g.strokes) {
                const pts = def.pts.map(([gx0, gy0]) => {
                    const gx = gx0 + (lr() - 0.5) * 0.035
                    const gy = gy0 + (lr() - 0.5) * 0.035
                    const lx = (gx - g.w / 2) * S * lt.sx
                    const ly = (gy - 0.5) * S * lt.sy
                    return [cx + lx * cos - ly * sin, cy + lx * sin + ly * cos]
                })
                const wS = ((S * adv.weight) / 100) * (1 + (lr() - 0.5) * 0.16)
                const st = makeStroke(densify(def.kind, pts), S, wS, B, lr)
                st.line = lineObj
                if (def.kind === "D") dots.push(st)
                else group.push(st)
            }
            if (group.length) letterGroups.push(group)
            x += lt.adv * S
        }
        if (li > 0) tm += adv.linePause
        letterGroups.forEach((group, gi) => {
            if (gi > 0) tm += adv.letterGap
            group.forEach((st, si) => {
                if (si > 0) tm += adv.strokeGap
                st.start = tm
                st.dur = Math.max(adv.strokeMin, Math.min(Math.max(adv.strokeMin, adv.strokeMax), st.len / pxPerMs))
                tm += st.dur
                lineObj.strokes.push(st)
            })
        })
        for (const st of dots) {
            tm += adv.letterGap
            st.start = tm
            st.dur = Math.max(adv.strokeMin, Math.min(Math.max(adv.strokeMin, adv.strokeMax), st.len / pxPerMs))
            tm += st.dur
            lineObj.strokes.push(st)
        }
        if (!lineObj.strokes.length) return
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const st of lineObj.strokes) {
            minX = Math.min(minX, st.minX)
            minY = Math.min(minY, st.minY)
            maxX = Math.max(maxX, st.maxX)
            maxY = Math.max(maxY, st.maxY)
        }
        const pad = 4
        lineObj.bx = Math.floor(minX - pad)
        lineObj.by = Math.floor(minY - pad)
        lineObj.bw = Math.ceil(maxX - minX + 2 * pad)
        lineObj.bh = Math.ceil(maxY - minY + 2 * pad)
        const cv = document.createElement("canvas")
        cv.width = Math.max(1, Math.round(lineObj.bw * dpr))
        cv.height = Math.max(1, Math.round(lineObj.bh * dpr))
        const c = cv.getContext("2d")
        if (!c) return
        c.setTransform(dpr, 0, 0, dpr, -lineObj.bx * dpr, -lineObj.by * dpr)
        lineObj.cv = cv
        lineObj.ctx = c
        out.lines.push(lineObj)
        out.all.push(...lineObj.strokes)
    })
    out.all.sort((a: any, b: any) => a.start - b.start)
    out.paintEnd = tm
    return out
}

function resetPaint(L: any) {
    for (const ln of L.lines) {
        ln.ctx.save()
        ln.ctx.setTransform(1, 0, 0, 1, 0, 0)
        ln.ctx.clearRect(0, 0, ln.cv.width, ln.cv.height)
        ln.ctx.restore()
    }
    for (const st of L.all) st.done = -1
    L.drawnT = -Infinity
}

function paintUpTo(L: any, tv: number, dry: number, ink: string) {
    if (tv < L.drawnT - 0.5) resetPaint(L)
    for (const st of L.all) {
        if (tv <= st.start) break
        const q = Math.min(1, (tv - st.start) / st.dur)
        const target = q >= 1 ? st.n - 1 : Math.floor(EASE_PAINT(q) * (st.n - 1))
        if (target > st.done) {
            paintRange(st.line.ctx, st, Math.max(0, st.done), target, dry, ink)
            st.done = target
        }
    }
    L.drawnT = tv
}

// ── newspaper ──
const measureCache = new Map<string, number>()
function mw(ctx: CanvasRenderingContext2D, word: string) {
    const key = ctx.font + "|" + word
    let v = measureCache.get(key)
    if (v === undefined) {
        v = ctx.measureText(word).width
        if (measureCache.size > 20000) measureCache.clear()
        measureCache.set(key, v)
    }
    return v
}

function justifyLine(ctx: CanvasRenderingContext2D, rng: () => number, x: number, w: number, y: number, last: boolean, upper: boolean) {
    const sp = mw(ctx, " ")
    const words: string[] = []
    const widths: number[] = []
    let sum = 0
    for (let guard = 0; guard < 40; guard++) {
        let wd = WORDS[Math.floor(rng() * WORDS.length)]
        if (upper) wd = wd.toUpperCase()
        const ww = mw(ctx, wd)
        if (words.length && sum + sp * words.length + ww > w) break
        if (!words.length && ww > w) break
        words.push(wd)
        widths.push(ww)
        sum += ww
    }
    if (!words.length) return
    if (last) {
        const keep = Math.max(1, Math.ceil(words.length * (0.3 + rng() * 0.5)))
        let cx = x
        for (let i = 0; i < keep; i++) {
            ctx.fillText(words[i], cx, y)
            cx += widths[i] + sp
        }
        return
    }
    const g = words.length > 1 ? (w - sum) / (words.length - 1) : 0
    const gapW = g > sp * 3.5 ? sp : g
    let cx = x
    for (let i = 0; i < words.length; i++) {
        ctx.fillText(words[i], cx, y)
        cx += widths[i] + gapW
    }
}

function wrapWords(ctx: CanvasRenderingContext2D, words: string[], w: number) {
    const lines: string[] = []
    let cur = ""
    for (const wd of words) {
        const t = cur ? cur + " " + wd : wd
        if (cur && ctx.measureText(t).width > w) {
            lines.push(cur)
            cur = wd
        } else cur = t
    }
    if (cur) lines.push(cur)
    return lines
}

function typeBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rng: () => number, U: number, adv: any) {
    ctx.font = `700 ${6.3 * U}px ${MONO}`
    ctx.fillStyle = adv.headColor
    const lead = 7.6 * U
    let yy = y + lead
    while (yy < y + h) {
        justifyLine(ctx, rng, x, w, yy, false, true)
        yy += lead
    }
}

function fillColumn(ctx: CanvasRenderingContext2D, x: number, w: number, y0: number, y1: number, rng: () => number, U: number, adv: any) {
    const pad = 4 * U
    const ix = x + pad, iw = w - 2 * pad
    if (iw < 10 * U) return
    const fs = adv.bodySize * U
    const lead = adv.leading * U
    const bodyFont = `${fs}px ${SERIF}`
    let y = y0 + 3 * U
    let first = true
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
    while (y < y1 - lead) {
        const r = rng()
        if (first || r < 0.3) {
            const typed = rng() < 0.3
            const hfs = (typed ? 7 : 7.5 + rng() * 2.5) * U
            ctx.font = `${typed ? 700 : 800} ${hfs}px ${typed ? MONO : SERIF}`
            ctx.fillStyle = adv.headColor
            const hl = wrapWords(ctx, HEADS[Math.floor(rng() * HEADS.length)].split(" "), iw)
            for (const ln of hl) {
                y += hfs * 1.05
                if (y > y1) return
                ctx.fillText(ln, ix, y)
            }
            y += 3 * U
        } else if (r < 0.37 && y1 - y > 130 * U) {
            const bh = (60 + rng() * 60) * U
            ctx.strokeStyle = adv.ruleColor
            ctx.lineWidth = Math.max(0.7, 1.2 * U)
            ctx.strokeRect(ix, y + 2 * U, iw, bh)
            typeBlock(ctx, ix + 3 * U, y + 3 * U, iw - 6 * U, bh - 7 * U, rng, U, adv)
            y += bh + 8 * U
            continue
        }
        first = false
        ctx.font = bodyFont
        ctx.fillStyle = adv.bodyColor
        const nl = 5 + Math.floor(rng() * 20)
        for (let i = 0; i < nl; i++) {
            y += lead
            if (y > y1) return
            const indent = i === 0 ? 5 * U : 0
            justifyLine(ctx, rng, ix + indent, iw - indent, y, i === nl - 1, false)
        }
        y += lead * 0.6
        if (rng() < 0.45) {
            ctx.strokeStyle = adv.ruleColor
            ctx.lineWidth = Math.max(0.5, 0.7 * U)
            ctx.beginPath()
            ctx.moveTo(ix, y)
            ctx.lineTo(ix + iw, y)
            ctx.stroke()
            y += 4 * U
        }
    }
}

function drawLogo(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, tint: boolean, color: string) {
    try {
        const iw = img.naturalWidth || h
        const ih = img.naturalHeight || h
        const s = Math.min(w / iw, h / ih)
        const dw = iw * s, dh = ih * s
        const dx = x + (w - dw) / 2, dy = y + (h - dh) / 2
        if (!tint) {
            ctx.drawImage(img, dx, dy, dw, dh)
            return
        }
        const tmp = document.createElement("canvas")
        tmp.width = Math.max(1, Math.ceil(dw * 2))
        tmp.height = Math.max(1, Math.ceil(dh * 2))
        const t = tmp.getContext("2d")
        if (!t) return
        t.drawImage(img, 0, 0, tmp.width, tmp.height)
        t.globalCompositeOperation = "source-in"
        t.fillStyle = color
        t.fillRect(0, 0, tmp.width, tmp.height)
        ctx.drawImage(tmp, dx, dy, dw, dh)
    } catch (e) {}
}

function bakePaper(cv: HTMLCanvasElement, W: number, H: number, dpr: number, p: any, adv: any, logo: HTMLImageElement | null) {
    cv.width = Math.max(1, Math.round(W * dpr))
    cv.height = Math.max(1, Math.round(H * dpr))
    const ctx = cv.getContext("2d")
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    const m = Math.round((H * adv.margin) / 100)
    const px = m, py = m, pw = W - 2 * m, ph = H - 2 * m
    const U = ph / 1000
    const rng = mulberry(Math.round(adv.seed) * 7919 + 3)
    const hair = Math.max(0.7, 1 * U)

    // sheet, grey strip and border
    ctx.fillStyle = p.paper
    ctx.fillRect(px, py, pw, ph)
    const e = 4 * U
    ctx.fillStyle = "rgba(120,120,120,0.10)"
    ctx.beginPath()
    ctx.rect(px, py, pw, ph)
    ctx.rect(px + e, py + e, pw - 2 * e, ph - 2 * e)
    ctx.fill("evenodd")
    ctx.strokeStyle = adv.borderColor
    ctx.lineWidth = Math.max(0.8, 1.2 * U)
    ctx.strokeRect(px + e, py + e, pw - 2 * e, ph - 2 * e)
    ctx.save()
    ctx.setLineDash([3 * U + 1, 2 * U + 1])
    ctx.globalAlpha = 0.6
    ctx.lineWidth = Math.max(0.5, 0.6 * U)
    ctx.strokeRect(px + 1.2 * U, py + 1.2 * U, pw - 2.4 * U, ph - 2.4 * U)
    ctx.restore()

    const colL = px + 29 * U, colR = px + pw - 29 * U

    // ear boxes
    const ebT = py + 59 * U, ebH = 39 * U
    const lbW = 86 * U, rbW = 95 * U
    ctx.strokeStyle = adv.mastheadColor
    ctx.lineWidth = hair
    ctx.strokeRect(colL, ebT, lbW, ebH)
    ctx.strokeRect(colR - rbW, ebT, rbW, ebH)
    ctx.fillStyle = adv.mastheadColor
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = `${8.3 * U}px ${SERIF}`
    ctx.fillText("\u201CAll the News", colL + lbW / 2, ebT + ebH * 0.36)
    ctx.fillText("That's Fit to Print\u201D", colL + lbW / 2, ebT + ebH * 0.66)
    ctx.font = `${8.8 * U}px ${SERIF}`
    ctx.fillText("\u201CDaily Report\u201D", colR - rbW / 2, ebT + ebH / 2)

    // nameplate (or the uploaded logo in its place)
    const title = String(p.title ?? "").trim()
    const words = title.split(/\s+/).filter(Boolean)
    const lead = words.length > 1 && words[0].length <= 3 ? words[0] : ""
    const main = lead ? words.slice(1).join(" ") : title
    let fs = adv.titleSize * U
    const maxT = colR - colL - 2 * (rbW + 20 * U)
    const meas = (f: number) => {
        ctx.font = `${f}px ${BLACKLETTER}`
        const w = main ? ctx.measureText(main).width : 0
        const l = lead ? f * 0.55 * 0.8 + f * 0.14 : 0
        return { w, l }
    }
    let mm = meas(fs)
    if (mm.w + mm.l > maxT && mm.w + mm.l > 0) {
        fs *= maxT / (mm.w + mm.l)
        mm = meas(fs)
    }
    const hs = headShift(adv) * U
    const base = py + 100 * U + hs
    const total = mm.w + mm.l
    if (logo) {
        const lw = Math.max(total, fs * 3)
        drawLogo(ctx, logo, px + pw / 2 - lw / 2, base - fs * 0.82, lw, fs * 1.0, !!p.tint, adv.mastheadColor)
    } else {
        const x0 = px + pw / 2 - total / 2
        ctx.fillStyle = adv.mastheadColor
        ctx.textAlign = "left"
        ctx.textBaseline = "alphabetic"
        if (lead) {
            ctx.save()
            ctx.translate(x0 + fs * 0.55 * 0.8, base + 4 * U)
            ctx.rotate(-Math.PI / 2)
            ctx.font = `${fs * 0.55}px ${BLACKLETTER}`
            ctx.fillText(lead, 0, 0)
            ctx.restore()
        }
        ctx.font = `${fs}px ${BLACKLETTER}`
        ctx.fillText(main, x0 + mm.l, base)
    }

    // dateline
    const r1 = py + 126 * U + hs, r2 = py + 146 * U + hs
    ctx.strokeStyle = adv.mastheadColor
    ctx.lineWidth = hair
    ctx.beginPath()
    ctx.moveTo(colL, r1)
    ctx.lineTo(colR, r1)
    ctx.moveTo(colL, r2)
    ctx.lineTo(colR, r2)
    ctx.stroke()
    const dfs = 10.5 * U
    ctx.font = `${dfs}px ${SERIF}`
    ;(ctx as any).letterSpacing = `${dfs * 0.05}px`
    ctx.fillStyle = adv.mastheadColor
    ctx.textBaseline = "middle"
    const my = (r1 + r2) / 2 + 0.5 * U
    ctx.textAlign = "left"
    ctx.fillText("VOL.CLIX..", colL, my)
    ctx.fillText("N273011", colL + (colR - colL) * 0.29, my)
    ctx.textAlign = "center"
    ctx.fillText("NEWYORK, MONDAY, JUNE 21", colL + (colR - colL) * 0.59, my)
    ctx.textAlign = "right"
    ctx.fillText("$6,00", colR, my)
    ;(ctx as any).letterSpacing = "0px"

    // columns
    const top = py + 161 * U + hs, bot = py + 981 * U
    const avail = colR - colL
    const count = Math.max(1, Math.round(avail / Math.max(10, adv.columnWidth * U)))
    const ws: number[] = []
    let sum = 0
    for (let k = 0; k < count; k++) {
        const v = Math.max(0.3, 1 + (rng() * 2 - 1) * (adv.columnVary / 100))
        ws.push(v)
        sum += v
    }
    let x = colL
    for (let k = 0; k < count; k++) {
        const w = (ws[k] * avail) / sum
        if (k > 0) {
            ctx.strokeStyle = adv.ruleColor
            ctx.lineWidth = Math.max(0.6, 0.8 * U)
            ctx.beginPath()
            ctx.moveTo(x, top)
            ctx.lineTo(x, bot)
            ctx.stroke()
        }
        const last = k === count - 1
        const reserve = py + 840 * U
        fillColumn(ctx, x, w, top, last ? reserve - 4 * U : bot, rng, U, adv)
        if (last) {
            ctx.strokeStyle = adv.ruleColor
            ctx.lineWidth = Math.max(0.7, 1.2 * U)
            ctx.strokeRect(x + 4 * U, reserve, w - 8 * U, bot - reserve - 4 * U)
            typeBlock(ctx, x + 7 * U, reserve + 1 * U, w - 14 * U, bot - reserve - 10 * U, rng, U, adv)
        }
        x += w
    }
}

export interface StillPosterCreamProps {
    background?: string
    ink?: string
    paper?: string
    text?: string
    title?: string
    size?: number
    pageScale?: number
    pageAlign?: "top" | "bottom" | "left" | "right" | "center"
    speed?: number
    hold?: number
    dryness?: number
    image?: Record<string, unknown>
    tint?: boolean
    advanced?: {
        margin?: number
        mastheadColor?: string
        headColor?: string
        bodyColor?: string
        ruleColor?: string
        borderColor?: string
        titleSize?: number
        bodySize?: number
        leading?: number
        columnWidth?: number
        columnVary?: number
        weight?: number
        bristles?: number
        tilt?: number
        jitter?: number
        tracking?: number
        lineGap?: number
        lineShift?: number
        textX?: number
        textY?: number
        brushRate?: number
        strokeMin?: number
        strokeMax?: number
        strokeGap?: number
        letterGap?: number
        linePause?: number
        fadeMs?: number
        fadeStagger?: number
        blankMs?: number
        paperShift?: number
        inkShift?: number
        seed?: number
        grain?: number
        vignette?: number
        hover?: number
    }
    style?: CSSProperties
}

export default function StillPosterCream(props: StillPosterCreamProps) {
    const {
        text = "Hello, World!",
        size = 99,
        speed = 50,
        hold = 2000,
        dryness = 50,
        ink = "#050505",
        paper = "#F4F2EC",
        background = "#000000",
        title = "The Newyork Times",
        image = {"alt":"","src":"https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B"},
        tint = true,
        pageScale = 100,
        pageAlign = "top",
        alignX,
        alignY,
        advanced = {"seed":7,"tilt":4,"grain":6,"hover":50,"textY":50,"fadeMs":600,"jitter":8,"margin":2,"weight":18,"blankMs":400,"leading":9,"lineGap":12,"bodySize":7,"bristles":24,"inkShift":12,"tracking":6,"vignette":0,"bodyColor":"#2A2A2A","brushRate":140,"headColor":"#151515","letterGap":80,"linePause":250,"lineShift":5,"ruleColor":"#222222","strokeGap":30,"strokeMax":600,"strokeMin":120,"titleSize":64,"columnVary":30,"paperShift":6,"borderColor":"#C8C8C8","columnWidth":85,"fadeStagger":50,"mastheadColor":"#111111"},
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(null)
    propsRef.current = { text, size, speed, hold, dryness, ink, paper, background, title, image, tint, pageScale, pageAlign, alignX, alignY, advanced }

    useEffect(() => {
        const root = rootRef.current
        const cv = canvasRef.current
        if (!root || !cv) return
        const ctx = cv.getContext("2d")
        if (!ctx) return
        let alive = true
        let W = 0, H = 0, dpr = 1
        let raf = 0
        let first = true
        let last = 0
        let t = -1
        const paperCv = document.createElement("canvas")
        let paperKey = ""
        let layout: any = null
        let layoutKey = ""
        let fontVer = 0
        const imgState: { src: string; img: HTMLImageElement | null; ok: boolean; ver: number } = { src: "", img: null, ok: false, ver: 0 }
        const ptr = { x: 0, y: 0, over: 0, overE: 0, down: false, sx: 0, sy: 0 }

        // blackletter for the nameplate
        const bump = () => {
            if (alive) fontVer++
        }
        const loadFace = () => {
            try {
                ;(document as any).fonts?.load(`48px "UnifrakturMaguntia"`).then(bump, () => {})
            } catch (e) {}
        }
        let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null
        if (!link) {
            link = document.createElement("link")
            link.id = FONT_LINK_ID
            link.rel = "stylesheet"
            link.href = "https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&display=swap"
            document.head.appendChild(link)
        }
        link.addEventListener("load", loadFace)
        loadFace()
        try {
            ;(document as any).fonts?.ready?.then(bump)
        } catch (e) {}

        // grain tile
        const grainTile = document.createElement("canvas")
        grainTile.width = grainTile.height = 160
        const gctx = grainTile.getContext("2d")
        if (gctx) {
            const id = gctx.createImageData(160, 160)
            for (let i = 0; i < id.data.length; i += 4) {
                const v = Math.random()
                const c = v < 0.5 ? 0 : 255
                id.data[i] = id.data[i + 1] = id.data[i + 2] = c
                id.data[i + 3] = Math.abs(v - 0.5) * 2 * 255
            }
            gctx.putImageData(id, 0, 0)
        }
        const grainPattern = ctx.createPattern(grainTile, "repeat")

        const measure = () => {
            W = root.offsetWidth
            H = root.offsetHeight
            dpr = Math.min(2, window.devicePixelRatio || 1)
            cv.width = Math.max(1, Math.round(W * dpr))
            cv.height = Math.max(1, Math.round(H * dpr))
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(root)

        const onMove = (e: PointerEvent) => {
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            ptr.over = 1
        }
        const onEnter = (e: PointerEvent) => {
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            ptr.over = 1
        }
        const onLeave = () => {
            ptr.over = 0
        }
        const onDown = (e: PointerEvent) => {
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            ptr.over = 1
            ptr.down = true
        }
        const onUp = () => {
            ptr.down = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        const syncImage = (src: string) => {
            if (src === imgState.src) return
            imgState.src = src
            imgState.ok = false
            imgState.img = null
            imgState.ver++
            if (!src) return
            const img = new Image()
            img.onload = () => {
                if (!alive || imgState.src !== src) return
                imgState.ok = true
                imgState.ver++
            }
            img.onerror = () => {
                if (imgState.src === src) imgState.ok = false
            }
            img.src = src
            imgState.img = img
        }

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            if (!W || !H) return
            const dt = first ? 0 : Math.min(1 / 20, (now - last) / 1000)
            first = false
            last = now
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const hoverK = Math.max(0, adv.hover) / 50

            syncImage(imageSrc(p.image))
            const logo = imgState.ok ? imgState.img : null

            // newspaper page: zoomed past the stage and pinned to the chosen edges, like a background image
            const z = Math.max(1, (Number(p.pageScale) || 100) / 100)
            const VW = W * z, VH = H * z
            const pdpr = Math.max(0.5, Math.min(dpr, 4096 / Math.max(VW, VH)))
            // Keep the enlarged newspaper anchored to one chosen canvas edge.
            // Legacy X/Y values remain supported if supplied by an older instance.
            const align = p.pageAlign || "top"
            const ax = align === "left" ? 0 : align === "right" ? 1 : (p.alignX === "left" ? 0 : p.alignX === "right" ? 1 : 0.5)
            const ay = align === "top" ? 0 : align === "bottom" ? 1 : (p.alignY === "top" ? 0 : p.alignY === "bottom" ? 1 : 0.5)
            const pageX = (W - VW) * ax
            const pageY = (H - VH) * ay + (align === "top" ? 75 : 0)

            // where the page's columns sit on the stage, so big lettering never covers the masthead
            const mP = Math.round((VH * adv.margin) / 100)
            const uP = (VH - 2 * mP) / 1000
            const uS = (H - 2 * Math.round((H * adv.margin) / 100)) / 1000
            const colTop = pageY + mP + (161 + headShift(adv)) * uP
            const colBot = pageY + mP + 981 * uP
            const areaTop = Math.max(colTop + 4 * uP, 8 * uS)
            const areaBot = Math.max(areaTop + 40 * uS, Math.min(colBot - 3 * uP, H - 8 * uS))

            const pk = [VW, VH, pdpr, p.paper, p.title, p.tint, adv.margin, adv.mastheadColor, adv.headColor, adv.bodyColor, adv.ruleColor, adv.borderColor, adv.titleSize, adv.bodySize, adv.leading, adv.columnWidth, adv.columnVary, adv.seed, fontVer, imgState.ver].join("|")
            if (pk !== paperKey) {
                bakePaper(paperCv, VW, VH, pdpr, p, adv, logo)
                paperKey = pk
            }

            const lk = [W, H, dpr, p.text, p.size, p.ink, p.dryness, adv.margin, adv.weight, adv.bristles, adv.tilt, adv.jitter, adv.tracking, adv.lineGap, adv.lineShift, adv.textX, adv.textY, adv.seed, adv.brushRate, adv.strokeMin, adv.strokeMax, adv.strokeGap, adv.letterGap, adv.linePause, Math.round(areaTop), Math.round(areaBot)].join("|")
            if (lk !== layoutKey) {
                layout = buildLayout(W, H, dpr, p, adv, { top: areaTop, bot: areaBot })
                layoutKey = lk
            }

            const nLines = layout.lines.length
            const holdMs = Math.max(0, p.hold)
            const holdEnd = layout.paintEnd + holdMs
            const fadeTotal = adv.fadeMs + Math.max(0, nLines - 1) * adv.fadeStagger
            const cycle = Math.max(1, holdEnd + fadeTotal + adv.blankMs)
            if (t < 0) t = layout.paintEnd // first paint shows the finished poster

            const reduce = !!mq?.matches
            const painting = t < layout.paintEnd
            const paused = ptr.down && hoverK > 0 && painting
            if (!reduce && p.speed > 0 && !paused) t += dt * 1000 * (p.speed / 50)
            if (t >= cycle) t = t % cycle
            const tv = reduce || p.speed <= 0 ? layout.paintEnd : t

            paintUpTo(layout, tv, Math.max(0, p.dryness) / 100, p.ink)

            // pointer parallax, eased
            const kOver = 1 - Math.exp(-dt / 0.25)
            ptr.overE += (ptr.over - ptr.overE) * kOver
            const tx = ptr.over ? (ptr.x / W - 0.5) * 2 : 0
            const ty = ptr.over ? (ptr.y / H - 0.5) * 2 : 0
            const kp = 1 - Math.exp(-dt / 0.09)
            ptr.sx += (tx - ptr.sx) * kp
            ptr.sy += (ty - ptr.sy) * kp
            const amt = reduce ? 0 : hoverK * ptr.overE
            const pOx = ptr.sx * (adv.paperShift / 1000) * W * amt
            const pOy = ptr.sy * (adv.paperShift / 1000) * H * amt
            const iOx = ptr.sx * (adv.inkShift / 1000) * W * amt
            const iOy = ptr.sy * (adv.inkShift / 1000) * H * amt

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1
            ctx.fillStyle = p.background
            ctx.fillRect(0, 0, W, H)
            if (align === "top" && pageY > 0) {
                ctx.fillStyle = p.paper || "#F4F2EC"
                ctx.fillRect(0, 0, W, Math.min(H, pageY))
            }
            ctx.drawImage(paperCv, pageX + pOx, pageY + pOy, VW, VH)

            layout.lines.forEach((ln: any, i: number) => {
                const fs = holdEnd + i * adv.fadeStagger
                const a = tv <= fs ? 1 : 1 - EASE_FADE(clamp01((tv - fs) / Math.max(1, adv.fadeMs)))
                if (a <= 0.001) return
                ctx.globalAlpha = a
                ctx.drawImage(ln.cv, ln.bx + iOx, ln.by + iOy, ln.bw, ln.bh)
            })
            ctx.globalAlpha = 1

            if (adv.grain > 0 && grainPattern) {
                ctx.save()
                ctx.globalAlpha = Math.min(1, (adv.grain / 100) * 0.5)
                const ox = Math.random() * 160, oy = Math.random() * 160
                ctx.translate(-ox, -oy)
                ctx.fillStyle = grainPattern
                ctx.fillRect(0, 0, W + 160, H + 160)
                ctx.restore()
            }
            if (adv.vignette > 0) {
                const r = Math.hypot(W, H) / 2
                const g = ctx.createRadialGradient(W / 2, H / 2, r * 0.35, W / 2, H / 2, r)
                g.addColorStop(0, "rgba(0,0,0,0)")
                g.addColorStop(1, `rgba(0,0,0,${Math.min(1, (adv.vignette / 100) * 0.85)})`)
                ctx.fillStyle = g
                ctx.fillRect(0, 0, W, H)
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            alive = false
            cancelAnimationFrame(raf)
            ro.disconnect()
            link?.removeEventListener("load", loadFace)
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onEnter)
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
                background,
                overflow: "hidden",
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

// Control order arranged in the builder.
