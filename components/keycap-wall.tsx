"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2 // quality tier, not a design control (rule 10)

/* ---------------------------------------------------------------- constants */

const CYCLE = 32 // caps in a column's repeat; long enough that no screen sees it twice
const BODY_LIGHT = 8 // 1u light variants
const BODY_DARK = 16 // 1u dark variants
const TALL_LIGHT = 3
const TALL_DARK = 5

const REF_SECONDS = 4.5 // seconds for a column to advance one cell at Speed 50
const RATE_MIN = 0.62 // per-column rate spread — the photo's phase scatter
const RATE_SPAN = 0.76

const PRESS_PER_SEC = 3 // presses/second at Presses 100
const PRESS_DOWN = 90 // ms
const PRESS_HOLD = 70
const PRESS_UP = 170
const PRESS_SCALE = 0.93
const PRESS_DARK = 0.26

const SKIRT = 0.6 // cap side lightness vs the top face
const FACE_INSET = 0.055 // top face inset, as a fraction of the short side
const GREY_CHANCE = 0.06 // dark caps that come out mid-grey, as in the photo
const GREY_LIFT = 5.2

const SPOT_CELLS = 3.2 // spotlight radius, in cell pitches
const SPOT_ALPHA = 0.13
const POINTER_EASE = 9 // per second

const VIGNETTE_ALPHA = 0.45
const VIGNETTE_START = 0.35

const LEGEND_NUDGE = -0.03 // legends sit a hair above centre, as in the photo
const TALL_NUDGE = -0.12 // a 2u slab carries its word high, not centred
const WORD_RATIO = 0.36 // word legends, as a fraction of the font size
const PAIR_RATIO = 0.52
const BAR_W = 0.4 // homing bar width / font size
const BAR_H = 0.055
const BAR_Y = 0.46

/* -------------------------------------------------------------- small maths */

type RGB = [number, number, number]

function mod(a: number, n: number): number {
    return ((a % n) + n) % n
}
function clamp255(v: number): number {
    return v < 0 ? 0 : v > 255 ? 255 : v
}
function css(c: RGB): string {
    return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
}
/** Lightness multiplier. Multiplying survives near-black, which mix-to-white does not. */
function tone(c: RGB, k: number): RGB {
    return [clamp255(c[0] * k), clamp255(c[1] * k), clamp255(c[2] * k)]
}
function mix(a: RGB, b: RGB, t: number): RGB {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}
function lum(c: RGB): number {
    return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255
}
function smooth(t: number): number {
    return t * t * (3 - 2 * t)
}

function makeRng(seed: number): () => number {
    let a = seed >>> 0 || 1
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function ihash(x: number, y: number, s: number): number {
    let n = Math.imul(Math.floor(x) | 0, 374761393) + Math.imul(Math.floor(y) | 0, 668265263)
    n = (n + Math.imul(s | 0, 1274126177)) | 0
    n = (n ^ (n >>> 13)) | 0
    n = Math.imul(n, 1274126177)
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

/* Framer's Color control emits rgb()/hsl()/var(--token, …), never plain hex, so
 * the value is resolved through the cascade instead of parsed by hand. */
function resolveColor(host: HTMLElement, value: string, fallback: RGB): RGB {
    try {
        const probe = document.createElement("span")
        probe.style.color = value
        probe.style.display = "none"
        host.appendChild(probe)
        const computed = getComputedStyle(probe).color
        probe.remove()
        const m = computed.match(/-?[\d.]+/g)
        if (!m || m.length < 3) return fallback
        return [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2])]
    } catch {
        return fallback
    }
}

/* ControlType.Font hands back a CSS-shaped object. fontSize may arrive as a
 * number or as "40px", so both are parsed; every field has a fallback because a
 * Font control the designer never opened arrives undefined. */
interface FontLike {
    fontFamily?: string
    fontSize?: string | number
    fontWeight?: string | number
    fontStyle?: string
    letterSpacing?: string | number
}
function fontPx(f: FontLike | undefined): number {
    const raw = f?.fontSize
    const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""))
    return Number.isFinite(n) && n > 0 ? Math.min(200, n) : 52
}
function fontShorthand(f: FontLike | undefined, px: number): string {
    const style = f?.fontStyle ?? "normal"
    const weight = f?.fontWeight ?? 500
    const family = f?.fontFamily ?? "Inter, system-ui, sans-serif"
    const quoted = /[\s,]/.test(family) && !/["']/.test(family) ? `"${family}"` : family
    return `${style} ${weight} ${px}px ${quoted}, system-ui, sans-serif`
}

/* ------------------------------------------------------------ legend catalog */

type Legend =
    | { kind: "char"; text: string; bar?: boolean }
    | { kind: "pair"; top: string; bottom: string }
    | { kind: "word"; text: string }

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const HOMING = ["F", "J", "D", "K", "I"]
const PAIRS: [string, string][] = [
    ['"', "'"],
    ["&", "7"],
    ["(", "9"],
    ["?", "/"],
    ["<", ","],
    [">", "."],
    ["!", "1"],
    ["*", "8"],
    ["%", "5"],
    ["+", "="],
]
const WORDS = ["Enter", "Home", "End", "Shift", "Tab", "Ctrl", "Alt", "Del"]

const LEGENDS: Legend[] = [
    ...LETTERS.map((text) => ({ kind: "char", text }) as Legend),
    ...HOMING.map((text) => ({ kind: "char", text, bar: true }) as Legend),
    ...PAIRS.map(([top, bottom]) => ({ kind: "pair", top, bottom }) as Legend),
    ...WORDS.map((text) => ({ kind: "word", text }) as Legend),
]
const I_LETTERS = 0
const I_HOMING = LETTERS.length
const I_PAIRS = I_HOMING + HOMING.length
const I_WORDS = I_PAIRS + PAIRS.length
const N_LEGENDS = LEGENDS.length

/** A 1u cap: mostly letters, then pairs, homing letters and the odd word. */
function pickLegend(r: number, rnd: () => number): number {
    if (r < 0.78) return I_LETTERS + Math.floor(rnd() * LETTERS.length)
    if (r < 0.85) return I_HOMING + Math.floor(rnd() * HOMING.length)
    if (r < 0.95) return I_PAIRS + Math.floor(rnd() * PAIRS.length)
    return I_WORDS + Math.floor(rnd() * WORDS.length)
}
/** A 2u slab is an Enter key more often than not — as it is in the photo. */
function pickTallLegend(rnd: () => number): number {
    return rnd() < 0.55 ? I_WORDS : I_WORDS + Math.floor(rnd() * WORDS.length)
}

/* ------------------------------------------------------------------- shapes */

function roundRectPath(
    g: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) {
    const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2))
    g.beginPath()
    g.moveTo(x + rr, y)
    g.arcTo(x + w, y, x + w, y + h, rr)
    g.arcTo(x + w, y + h, x, y + h, rr)
    g.arcTo(x, y + h, x, y, rr)
    g.arcTo(x, y, x + w, y, rr)
    g.closePath()
}

/* ------------------------------------------------------------- texture bake */

/** Value noise on a coarse grid, bilinear-sampled. Built once per sprite. */
function coarseGrid(w: number, h: number, cell: number, seed: number) {
    const gw = Math.ceil(w / cell) + 2
    const gh = Math.ceil(h / cell) + 2
    const g = new Float32Array(gw * gh)
    for (let j = 0; j < gh; j++) {
        for (let i = 0; i < gw; i++) g[j * gw + i] = ihash(i, j, seed)
    }
    return { g, gw, gh, cell }
}
function sampleGrid(f: ReturnType<typeof coarseGrid>, x: number, y: number): number {
    const gx = x / f.cell
    const gy = y / f.cell
    const xi = gx | 0
    const yi = gy | 0
    const u = smooth(gx - xi)
    const v = smooth(gy - yi)
    const i0 = yi * f.gw + xi
    const a = f.g[i0]
    const b = f.g[i0 + 1]
    const c = f.g[i0 + f.gw]
    const d = f.g[i0 + f.gw + 1]
    const ab = a + (b - a) * u
    return ab + (c + (d - c) * u - ab) * v
}

/**
 * Speckled ABS. Amplitude tracks darkness — a dark cap is rough plastic with
 * white specks, a light cap is nearly smooth, and one amplitude for both makes
 * the light caps look soiled. Noise coordinates are in CSS px (divided by DPR)
 * so the grain does not change size between a 1x canvas and a 2x preview.
 */
function applyTexture(
    g: CanvasRenderingContext2D,
    w: number,
    h: number,
    dpr: number,
    base: RGB,
    texture: number,
    seed: number
) {
    const amp = (texture / 100) * (Math.pow(1 - lum(base), 1.15) * 34 + 3)
    if (amp < 0.25) return
    const img = g.getImageData(0, 0, w, h)
    const d = img.data
    const fine = coarseGrid(w / dpr, h / dpr, 2.2, seed + 7)
    const blot = coarseGrid(w / dpr, h / dpr, 6, seed + 13)
    for (let y = 0; y < h; y++) {
        const ny = y / dpr
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4
            const a = d[i + 3]
            if (a < 8) continue
            const nx = x / dpr
            const n =
                0.6 * (ihash(nx, ny, seed) - 0.5) +
                0.85 * (sampleGrid(fine, nx, ny) - 0.5) +
                0.55 * (sampleGrid(blot, nx, ny) - 0.5)
            let delta = amp * n
            if (ihash(nx, ny, seed + 31) > 0.9975) delta += amp * 1.3
            const k = (a / 255) * delta
            d[i] = clamp255(d[i] + k)
            d[i + 1] = clamp255(d[i + 1] + k)
            d[i + 2] = clamp255(d[i + 2] + k)
        }
    }
    g.putImageData(img, 0, 0)
}

/* ---------------------------------------------------------------- cap bakes */

function bakeBody(
    wCss: number,
    hCss: number,
    dpr: number,
    base: RGB,
    roundedPct: number,
    texture: number,
    seed: number
): HTMLCanvasElement {
    const w = Math.max(2, Math.round(wCss * dpr))
    const h = Math.max(2, Math.round(hCss * dpr))
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    const g = c.getContext("2d")
    if (!g) return c

    const r = (roundedPct / 100) * (Math.min(w, h) / 2)

    // the cap's sides, seen from above as a rim
    g.fillStyle = css(tone(base, SKIRT))
    roundRectPath(g, 0, 0, w, h, r)
    g.fill()

    // the top face, inset inside the rim
    const inset = Math.max(1, FACE_INSET * Math.min(w, h))
    const fr = Math.max(0, r - inset)
    const fw = w - 2 * inset
    const fh = h - 2 * inset
    const grad = g.createLinearGradient(0, inset, 0, inset + fh)
    grad.addColorStop(0, css(tone(base, 1.14)))
    grad.addColorStop(0.55, css(base))
    grad.addColorStop(1, css(tone(base, 0.84)))
    g.fillStyle = grad
    roundRectPath(g, inset, inset, fw, fh, fr)
    g.fill()

    // light on the top inner edge, shadow on the bottom one
    g.save()
    roundRectPath(g, inset, inset, fw, fh, fr)
    g.clip()
    const lw = Math.max(1, 0.012 * w)
    g.lineWidth = lw * 2
    g.strokeStyle = "rgba(255,255,255,0.16)"
    g.beginPath()
    g.moveTo(inset + fr * 0.6, inset + lw)
    g.lineTo(inset + fw - fr * 0.6, inset + lw)
    g.stroke()
    g.strokeStyle = "rgba(0,0,0,0.3)"
    g.beginPath()
    g.moveTo(inset + fr * 0.6, inset + fh - lw)
    g.lineTo(inset + fw - fr * 0.6, inset + fh - lw)
    g.stroke()
    g.restore()

    applyTexture(g, w, h, dpr, base, texture, seed)
    return c
}

function bakeLegend(
    leg: Legend,
    fsCss: number,
    dpr: number,
    font: FontLike | undefined,
    color: RGB,
    wCss: number,
    hCss: number
): HTMLCanvasElement {
    const w = Math.max(2, Math.round(wCss * dpr))
    const h = Math.max(2, Math.round(hCss * dpr))
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    const g = c.getContext("2d")
    if (!g) return c
    const fs = fsCss * dpr
    const cx = w / 2
    const cy = h / 2
    g.fillStyle = css(color)
    g.textAlign = "center"
    g.textBaseline = "middle"
    const ls = font?.letterSpacing
    if (ls !== undefined && "letterSpacing" in g) {
        try {
            ;(g as unknown as { letterSpacing: string }).letterSpacing =
                typeof ls === "number" ? `${ls}px` : String(ls)
        } catch {
            /* letterSpacing is Chromium-only; a browser without it just skips it */
        }
    }

    if (leg.kind === "word") {
        g.font = fontShorthand(font, WORD_RATIO * fs)
        g.fillText(leg.text, cx, cy)
    } else if (leg.kind === "pair") {
        const s = PAIR_RATIO * fs
        g.font = fontShorthand(font, s)
        // the two glyphs sit in the cap's top and bottom thirds; anything
        // tighter than ~0.6em of separation makes them touch
        g.fillText(leg.top, cx, cy - 0.62 * s)
        g.fillText(leg.bottom, cx, cy + 0.64 * s)
    } else {
        g.font = fontShorthand(font, fs)
        g.fillText(leg.text, cx, cy)
        if (leg.bar) {
            const bw = BAR_W * fs
            const bh = Math.max(1, BAR_H * fs)
            g.fillRect(cx - bw / 2, cy + BAR_Y * fs, bw, bh)
        }
    }
    return c
}

/* ------------------------------------------------------------------- scene */

type Cell = { u: number; light: boolean; body: number; legend: number; top: number }
type Column = { cells: Cell[]; cycleH: number; rate: number; drift: number; wraps: number }
type Bakes = {
    light1: HTMLCanvasElement[]
    dark1: HTMLCanvasElement[]
    light2: HTMLCanvasElement[]
    dark2: HTMLCanvasElement[]
}
type Legends = { onDark: HTMLCanvasElement[]; onLight: HTMLCanvasElement[]; w: number; h: number }
type Press = { col: number; idx: number; k: number; t0: number }
type Vis = { col: number; idx: number; k: number; x: number; y: number; w: number; h: number }

function buildColumn(col: number, tallPct: number, lightPct: number, pitch: number): Column {
    const rnd = makeRng((col * 2654435761) >>> 0 || 17)
    const cells: Cell[] = []
    let top = 0
    for (let i = 0; i < CYCLE; i++) {
        const u = rnd() < tallPct / 100 ? 2 : 1
        const light = rnd() < lightPct / 100
        const pool = u === 2 ? (light ? TALL_LIGHT : TALL_DARK) : light ? BODY_LIGHT : BODY_DARK
        const body = Math.floor(rnd() * pool)
        const legend = u === 2 ? pickTallLegend(rnd) : pickLegend(rnd(), rnd)
        cells.push({ u, light, body, legend, top })
        top += u * pitch
    }
    return {
        cells,
        cycleH: top,
        rate: RATE_MIN + makeRng((col * 40503 + 7) >>> 0)() * RATE_SPAN,
        drift: 0,
        wraps: 0,
    }
}

/* -------------------------------------------------------------------- props */

type KeysProps = { tall?: number; texture?: number; presses?: number }
const KEYS_DEFAULTS: Required<KeysProps> = { tall: 4, texture: 100, presses: 40 }

export interface KeycapWallProps {
    background?: string
    baseColor?: string
    accentColor?: string
    lightKeys?: number
    font?: FontLike
    size?: number
    gap?: number
    rounded?: number
    speed?: number
    hover?: number
    keys?: KeysProps
    width?: number
    height?: number
    style?: React.CSSProperties
}

const D = {
    background: "#050505",
    baseColor: "#141414",
    accentColor: "#E2E2E0",
    lightKeys: 34,
    size: 106,
    gap: 10,
    rounded: 20,
    speed: 50,
    hover: 49,
}

function __BaseImpl_KeycapWall(props: KeycapWallProps) {
    const {
        background = D.background,
        baseColor = D.baseColor,
        accentColor = D.accentColor,
        lightKeys = D.lightKeys,
        font,
        size = D.size,
        gap = D.gap,
        rounded = D.rounded,
        speed = D.speed,
        hover = D.hover,
        keys,
        width,
        height,
        style,
    } = props

    // A group the designer never opened arrives undefined, so spread-merge over
    // typed defaults rather than a ?? chain (rule 11).
    const kg = { ...KEYS_DEFAULTS, ...(keys || {}) }

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Live inputs land in a ref; the render loop never restarts (rule 6).
    const liveRef = useRef({
        speed: D.speed,
        hover: D.hover,
        size: D.size,
        gap: D.gap,
        presses: KEYS_DEFAULTS.presses,
        background: D.background,
        rounded: D.rounded,
    })
    liveRef.current.speed = speed
    liveRef.current.hover = hover
    liveRef.current.size = size
    liveRef.current.gap = gap
    liveRef.current.presses = kg.presses
    liveRef.current.background = background
    liveRef.current.rounded = rounded

    const paintRef = useRef({
        baseColor,
        accentColor,
        rounded,
        size,
        gap,
        texture: kg.texture,
        font,
        lightKeys,
        tall: kg.tall,
    })
    paintRef.current = {
        baseColor,
        accentColor,
        rounded,
        size,
        gap,
        texture: kg.texture,
        font,
        lightKeys,
        tall: kg.tall,
    }

    const fontKey = fontShorthand(font, fontPx(font))
    const bodyKey = `${baseColor}|${accentColor}|${size}|${gap}|${rounded}|${kg.texture}`
    const legendKey = `${fontKey}|${baseColor}|${accentColor}`
    const fieldKey = `${size}|${gap}|${kg.tall}|${lightKeys}`
    const pendingRef = useRef({ body: "", legend: "", field: "" })
    // The effect runs once, so it cannot close over these — the loop compares
    // against the ref, which every render refreshes.
    const keyRef = useRef({ body: bodyKey, legend: legendKey, field: fieldKey })
    keyRef.current = { body: bodyKey, legend: legendKey, field: fieldKey }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        // "high" costs multiples of the frame on a software-rendered canvas and
        // buys nothing here — every sprite is drawn at or near 1:1.
        ctx.imageSmoothingQuality = "low"

        const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
        const size2 = { w: 0, h: 0 }
        let bakes: Bakes | null = null
        let legends: Legends | null = null
        let cols: Column[] = []
        let vignette: CanvasGradient | null = null
        let vignetteFor = ""
        const presses: Press[] = []
        let pressAcc = 0
        let visible: Vis[] = []
        const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false }
        // seeded, so identical props give identical frames and a probe can compare them
        const pressRng = makeRng(0x51ed270b)
        let last = 0
        let raf = 0

        const measure = () => {
            const w = root.offsetWidth || 1200
            const h = root.offsetHeight || 800
            if (w === size2.w && h === size2.h) return
            size2.w = w
            size2.h = h
            canvas.width = Math.max(1, Math.round(w * dpr))
            canvas.height = Math.max(1, Math.round(h * dpr))
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.imageSmoothingQuality = "low"
            vignetteFor = ""
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(root)

        const bakeBodies = () => {
            const p = paintRef.current
            const base = resolveColor(root, p.baseColor, [20, 20, 20])
            const accent = resolveColor(root, p.accentColor, [226, 226, 224])
            const s = p.size
            const tallH = 2 * s + p.gap
            const out: Bakes = { light1: [], dark1: [], light2: [], dark2: [] }
            let seed = 101
            const dark = (rnd: () => number): RGB => {
                const k = rnd() < GREY_CHANCE ? GREY_LIFT * (0.8 + rnd() * 0.5) : 0.5 + rnd() * 1.7
                return tone(base, k)
            }
            const light = (rnd: () => number): RGB => tone(accent, 0.9 + rnd() * 0.16)
            const rnd = makeRng(0x9e3779b9)
            for (let i = 0; i < BODY_LIGHT; i++)
                out.light1.push(bakeBody(s, s, dpr, light(rnd), p.rounded, p.texture, seed++))
            for (let i = 0; i < BODY_DARK; i++)
                out.dark1.push(bakeBody(s, s, dpr, dark(rnd), p.rounded, p.texture, seed++))
            for (let i = 0; i < TALL_LIGHT; i++)
                out.light2.push(bakeBody(s, tallH, dpr, light(rnd), p.rounded, p.texture, seed++))
            for (let i = 0; i < TALL_DARK; i++)
                out.dark2.push(bakeBody(s, tallH, dpr, dark(rnd), p.rounded, p.texture, seed++))
            bakes = out
        }

        const bakeLegends = () => {
            const p = paintRef.current
            const base = resolveColor(root, p.baseColor, [20, 20, 20])
            const accent = resolveColor(root, p.accentColor, [226, 226, 224])
            // Two tints, because the field has caps of both polarities and one
            // legend colour cannot serve both.
            const onDark = mix(base, [255, 255, 255], 0.76)
            const onLight = mix(accent, [0, 0, 0], 0.58)
            const fs = fontPx(p.font)
            // The legend box is sized off the FONT, not the cap, so a large Size
            // does not blow the sprite budget.
            const lw = 1.6 * fs
            const lh = 1.5 * fs
            const a: HTMLCanvasElement[] = []
            const b: HTMLCanvasElement[] = []
            for (const leg of LEGENDS) {
                a.push(bakeLegend(leg, fs, dpr, p.font, onDark, lw, lh))
                b.push(bakeLegend(leg, fs, dpr, p.font, onLight, lw, lh))
            }
            legends = { onDark: a, onLight: b, w: lw, h: lh }
        }

        const buildField = () => {
            const p = paintRef.current
            const pitch = p.size + p.gap
            const next: Column[] = []
            for (let i = 0; i < cols.length; i++) {
                const c = buildColumn(i, p.tall, p.lightKeys, pitch)
                c.drift = cols[i].drift
                c.wraps = cols[i].wraps
                next.push(c)
            }
            cols = next
        }

        const ensureCols = (n: number) => {
            const p = paintRef.current
            const pitch = p.size + p.gap
            while (cols.length < n) cols.push(buildColumn(cols.length, p.tall, p.lightKeys, pitch))
        }

        // Framer may not have the font on the first paint; re-bake once it lands.
        let fontsWaited = false
        const waitFonts = () => {
            if (fontsWaited || typeof document === "undefined" || !document.fonts) return
            fontsWaited = true
            document.fonts.ready.then(() => {
                pendingRef.current.legend = ""
            })
        }

        const render = (now: number) => {
            const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000)
            last = now
            const live = liveRef.current
            const W = size2.w
            const H = size2.h

            const want = keyRef.current
            if (pendingRef.current.body !== want.body) {
                bakeBodies()
                pendingRef.current.body = want.body
            }
            if (pendingRef.current.legend !== want.legend) {
                bakeLegends()
                pendingRef.current.legend = want.legend
                waitFonts()
            }
            if (pendingRef.current.field !== want.field) {
                buildField()
                pendingRef.current.field = want.field
            }
            if (!bakes || !legends) {
                raf = requestAnimationFrame(render)
                return
            }

            const s = live.size
            const g = live.gap
            const pitch = s + g
            const nCols = Math.ceil(W / pitch) + 1
            ensureCols(nCols)
            const xOff = (W - (nCols * pitch - g)) / 2

            // one cell per REF_SECONDS at Speed 50; the sign is the direction
            const px = (live.speed / 50) * (pitch / REF_SECONDS)
            for (let i = 0; i < nCols; i++) {
                const c = cols[i]
                // the accumulator is wrapped on the CPU so it never loses precision;
                // wraps carries the absolute cycle so a pressed cap keeps its identity
                const next = c.drift + dt * px * c.rate
                if (next >= c.cycleH) c.wraps += Math.floor(next / c.cycleH)
                else if (next < 0) c.wraps += Math.floor(next / c.cycleH)
                c.drift = mod(next, c.cycleH)
            }

            ctx.fillStyle = live.background
            ctx.fillRect(0, 0, W, H)

            const pressMap = new Map<string, number>()
            for (let i = presses.length - 1; i >= 0; i--) {
                const p = presses[i]
                const age = now - p.t0
                if (age > PRESS_DOWN + PRESS_HOLD + PRESS_UP) {
                    presses.splice(i, 1)
                    continue
                }
                let v: number
                if (age < PRESS_DOWN) v = smooth(age / PRESS_DOWN)
                else if (age < PRESS_DOWN + PRESS_HOLD) v = 1
                else v = 1 - smooth((age - PRESS_DOWN - PRESS_HOLD) / PRESS_UP)
                pressMap.set(`${p.col}|${p.idx}|${p.k}`, v)
            }

            const legW = legends.w
            const legH = legends.h
            const radius = (live.rounded / 100) * (s / 2)

            // hover glow — hit-tested against LAST frame's visible list (this
            // frame's isn't built yet), which is fine given how little a cap
            // drifts between frames. Confined to the one cap under the
            // pointer instead of a broad spotlight over the whole field.
            let hoverKey = ""
            if (pointer.active && live.hover > 0) {
                const e = 1 - Math.exp(-dt * POINTER_EASE)
                pointer.x += (pointer.tx - pointer.x) * e
                pointer.y += (pointer.ty - pointer.y) * e
                for (let i = visible.length - 1; i >= 0; i--) {
                    const v = visible[i]
                    if (
                        pointer.x >= v.x &&
                        pointer.x <= v.x + v.w &&
                        pointer.y >= v.y &&
                        pointer.y <= v.y + v.h
                    ) {
                        hoverKey = `${v.col}|${v.idx}|${v.k}`
                        break
                    }
                }
            }

            visible = []

            for (let ci = 0; ci < nCols; ci++) {
                const col = cols[ci]
                const x = xOff + ci * pitch
                if (x > W || x + s < 0) continue
                // start one cycle above, so a 2u cap straddling the top edge is drawn
                let base = -col.drift - col.cycleH
                let k = -1
                while (base < H) {
                    for (let i = 0; i < col.cells.length; i++) {
                        const cell = col.cells[i]
                        const y = base + cell.top
                        const ch = cell.u * pitch - g
                        if (y + ch < 0 || y > H) continue
                        const pool =
                            cell.u === 2
                                ? cell.light
                                    ? bakes.light2
                                    : bakes.dark2
                                : cell.light
                                  ? bakes.light1
                                  : bakes.dark1
                        const body = pool[cell.body % pool.length]
                        const legend = (cell.light ? legends.onLight : legends.onDark)[cell.legend]
                        const p = pressMap.get(`${ci}|${i}|${k + col.wraps}`) || 0
                        const scale = 1 - (1 - PRESS_SCALE) * p
                        const dw = s * scale
                        const dh = ch * scale
                        const dx = x + (s - dw) / 2
                        const dy = y + (ch - dh) / 2
                        ctx.drawImage(body, dx, dy, dw, dh)
                        // A large font size can make the legend box wider than the
                        // cap; clip it rather than let it bleed into the gap.
                        const clip = legW > s || legH > ch
                        if (clip) {
                            ctx.save()
                            roundRectPath(ctx, dx, dy, dw, dh, radius * scale)
                            ctx.clip()
                        }
                        ctx.drawImage(
                            legend,
                            dx + (dw - legW * scale) / 2,
                            dy +
                                (dh - legH * scale) / 2 +
                                (cell.u === 2 ? TALL_NUDGE : LEGEND_NUDGE) * dh,
                            legW * scale,
                            legH * scale
                        )
                        if (clip) ctx.restore()
                        if (p > 0) {
                            ctx.fillStyle = `rgba(0,0,0,${PRESS_DARK * p})`
                            roundRectPath(ctx, dx, dy, dw, dh, radius * scale)
                            ctx.fill()
                        }
                        if (`${ci}|${i}|${k + col.wraps}` === hoverKey) {
                            const a = SPOT_ALPHA * 3.4 * (live.hover / 100)
                            const gr = ctx.createRadialGradient(
                                dx + dw / 2,
                                dy + dh / 2,
                                0,
                                dx + dw / 2,
                                dy + dh / 2,
                                Math.max(dw, dh) * 0.75
                            )
                            gr.addColorStop(0, `rgba(255,255,255,${a})`)
                            gr.addColorStop(1, "rgba(255,255,255,0)")
                            ctx.save()
                            roundRectPath(ctx, dx, dy, dw, dh, radius * scale)
                            ctx.clip()
                            ctx.globalCompositeOperation = "lighter"
                            ctx.fillStyle = gr
                            ctx.fillRect(dx, dy, dw, dh)
                            ctx.globalCompositeOperation = "source-over"
                            ctx.restore()
                        }
                        visible.push({ col: ci, idx: i, k: k + col.wraps, x, y, w: s, h: ch })
                    }
                    base += col.cycleH
                    k += 1
                }
            }

            // presses are seeded from what was actually on screen last frame
            const rate = (live.presses / 100) * PRESS_PER_SEC
            pressAcc += dt * rate
            while (pressAcc >= 1) {
                pressAcc -= 1
                if (visible.length > 0) {
                    const v = visible[(pressRng() * visible.length) | 0]
                    presses.push({ col: v.col, idx: v.idx, k: v.k, t0: now })
                }
            }

            // vignette — framing, so it is a constant and not a control (rule 11a)
            const vk = `${W}|${H}`
            if (!vignette || vignetteFor !== vk) {
                const r = Math.hypot(W, H) / 2
                const gr = ctx.createRadialGradient(W / 2, H / 2, r * VIGNETTE_START, W / 2, H / 2, r)
                gr.addColorStop(0, "rgba(0,0,0,0)")
                gr.addColorStop(1, `rgba(0,0,0,${VIGNETTE_ALPHA})`)
                vignette = gr
                vignetteFor = vk
            }
            ctx.fillStyle = vignette
            ctx.fillRect(0, 0, W, H)

            raf = requestAnimationFrame(render)
        }
        raf = requestAnimationFrame(render)

        // offsetX/offsetY are element-local and carry no canvas zoom (rule G)
        const onMove = (e: PointerEvent) => {
            pointer.tx = e.offsetX
            pointer.ty = e.offsetY
            if (!pointer.active) {
                pointer.x = e.offsetX
                pointer.y = e.offsetY
                pointer.active = true
            }
        }
        const onLeave = () => {
            pointer.active = false
        }
        // Click a cap and it presses — same depress/darken curve the
        // autonomous presses already use, just triggered by a real hit test
        // against last frame's visible list instead of the RNG.
        const onDown = (e: PointerEvent) => {
            const x = e.offsetX
            const y = e.offsetY
            const now = performance.now()
            for (let i = visible.length - 1; i >= 0; i--) {
                const v = visible[i]
                if (x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h) {
                    presses.push({ col: v.col, idx: v.idx, k: v.k, t0: now })
                    break
                }
            }
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div
            ref={rootRef}
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

const __presetProps = {
  "background": "#050505",
  "baseColor": "#141414",
  "accentColor": "#E2E2E0",
  "lightKeys": 40,
  "font": {
    "variant": "Regular",
    "fontSize": 52,
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 500,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  },
  "size": 105,
  "gap": 10,
  "rounded": 20,
  "speed": 50,
  "hover": 49,
  "keys": {
    "tall": 0,
    "presses": 0,
    "texture": 0
  }
};

export default function KeycapWall(props: Record<string, unknown>) {
  return <__BaseImpl_KeycapWall {...(__presetProps as Record<string, unknown>)} {...props} />;
}
