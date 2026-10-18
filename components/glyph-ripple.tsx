"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * GlyphRipple — a monospace character grid resting as faint dots. Concentric
 * ripples travel outward from the pointer and from occasional idle raindrops;
 * inside a ripple band each cell steps up a density ramp (. : ; + * x # % @),
 * grows slightly and tints toward Accent.
 *
 * Canvas 2D, raw rAF (rule 6). Nothing is laid out by React; props are read
 * off a ref inside the loop.
 *
 *   · Glyphs are rendered ONCE into two atlases (text colour, accent colour) at
 *     the largest scale they are ever drawn; a frame is drawImage only, never
 *     fillText. Resting dots are one batched rect path, one fill.
 *   · Ripples are frozen pulse records {x, y, t0, amp}. A moving pointer does
 *     NOT drag one ring around — it drops a new record every ~1.1 × Size px of
 *     travel, so the rings stay concentric about where they were born. A
 *     pointer held still emits a slow heartbeat instead.
 *   · A ring's band is a Gaussian about radius r = v·(t − t0), faded to zero
 *     at Reach. Pulses write into a per-cell intensity buffer, only over the
 *     rows and columns their annulus covers.
 *   · Time is a sim clock advanced by Speed, so Speed 0 freezes rings in place
 *     and stops new raindrops.
 *
 * Panel: 9 leaf dials.
 *   Font   family/weight; its SIZE sets the cell size.
 *   Speed  0–100; 50 = shipped ripple rate, 0 freezes.
 *   Size   ripple band width in px.
 *   Rain   0–100; idle raindrop rate, 50 = shipped, 0 = none.
 *   Hover  0–200 %; pointer ripple strength, 0 = off.
 *   Reach  px a ripple travels before it has faded out.
 */

/* ------------------------------------------------------------------ constants */

const RAMP = ".:;+*x#%@" // no - or =: they span the cell and weld into streaks
const RIPPLE_V = 240 // px/s at Speed 50
const RAIN_PERIOD = 1.3 // mean seconds between raindrops at Rain 50
const RAIN_RINGS = [1, 0.62, 0.36] // amplitudes of a raindrop's rings
const RAIN_STAGGER = 0.2 // sim seconds between a raindrop's rings
const HEARTBEAT = 1.1 // sim seconds between pulses from a still pointer
const MAX_PULSES = 64
const GROW = 0.25 // extra glyph scale at full intensity
const REST_ALPHA = 0.32 // resting dot opacity, times Text Color alpha
const LINE_HEIGHT = 1.3
const SEED = 90217

/* ---------------------------------------------------------------------- utils */

function mulberry32(a: number) {
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

type RGBA = [number, number, number, number]
const colorCache = new Map<string, RGBA>()

/* ControlType.Color can hand back hex, rgb()/rgba(), hsl() or a token wrapped
 * in var(--x, <literal>). Unwrap var() first, then let a 1x1 2D canvas resolve
 * whatever CSS colour remains. */
function parseColor(input: string | undefined, fallback: RGBA): RGBA {
    if (!input) return fallback
    const hit = colorCache.get(input)
    if (hit) return hit
    let s = input.trim()
    const v = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(s)
    if (v) s = v[1].trim()
    if (typeof document === "undefined") return fallback
    const cv = document.createElement("canvas")
    cv.width = cv.height = 1
    const ctx = cv.getContext("2d", { willReadFrequently: true })
    if (!ctx) return fallback
    ctx.fillStyle = "#010203"
    ctx.fillStyle = s
    if (ctx.fillStyle === "#010203" && s.toLowerCase() !== "#010203") return fallback
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    const out: RGBA = [d[0], d[1], d[2], d[3] / 255]
    colorCache.set(input, out)
    return out
}

interface FontLike {
    fontFamily?: string
    fontSize?: string | number
    fontWeight?: string | number
    fontStyle?: string
    letterSpacing?: string | number
    lineHeight?: string | number
}
function fontPx(f: FontLike | undefined): number {
    const raw = f?.fontSize
    const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""))
    return Number.isFinite(n) && n > 0 ? Math.max(6, Math.min(120, n)) : 18
}
function fontShorthand(f: FontLike | undefined, px: number): string {
    const style = f?.fontStyle ?? "normal"
    const weight = f?.fontWeight ?? 500
    const family = f?.fontFamily
    const quoted = family && /[\s,]/.test(family) && !/["']/.test(family) ? `"${family}"` : family
    const stack = `ui-monospace, "SF Mono", Menlo, Consolas, monospace`
    return `${style} ${weight} ${px}px ${quoted ? `${quoted}, ${stack}` : stack}`
}
function letterSpacingPx(f: FontLike | undefined, px: number): number {
    const raw = f?.letterSpacing
    if (raw == null) return 0
    const s = String(raw)
    const n = parseFloat(s)
    if (!Number.isFinite(n)) return 0
    return s.endsWith("em") ? n * px : n
}
function lineHeightMul(f: FontLike | undefined, px: number): number {
    const raw = f?.lineHeight
    if (raw == null) return LINE_HEIGHT
    const s = String(raw)
    const n = parseFloat(s)
    if (!Number.isFinite(n) || n <= 0) return LINE_HEIGHT
    if (s.endsWith("px")) return Math.max(0.8, n / px)
    if (s.endsWith("%")) return Math.max(0.8, n / 100)
    if (s.endsWith("em") || typeof raw === "number" || /^[\d.]+$/.test(s)) return Math.max(0.8, n)
    return LINE_HEIGHT
}

/* -------------------------------------------------------------------- atlas */

interface Atlas {
    canvas: HTMLCanvasElement
    cell: number // device px per atlas square
}

/* One square per ramp glyph, drawn centred at (1 + GROW) × font size so any
 * drawn scale is a downsample. */
function buildAtlas(f: FontLike | undefined, px: number, rgb: RGBA, dpr: number): Atlas {
    const cell = Math.ceil(px * (1 + GROW) * 1.5 * dpr)
    const canvas = document.createElement("canvas")
    canvas.width = cell * RAMP.length
    canvas.height = cell
    const c = canvas.getContext("2d")!
    c.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
    c.font = fontShorthand(f, px * (1 + GROW) * dpr)
    c.textAlign = "center"
    c.textBaseline = "middle"
    for (let i = 0; i < RAMP.length; i++) c.fillText(RAMP[i], i * cell + cell / 2, cell / 2)
    return { canvas, cell }
}

/* ---------------------------------------------------------------- component */

interface Pulse {
    x: number
    y: number
    t0: number // sim seconds
    amp: number
}

interface GlyphRippleProps {
    background?: string
    textColor?: string
    accent?: string
    font?: FontLike
    speed?: number
    size?: number
    rain?: number
    hover?: number
    reach?: number
    style?: React.CSSProperties
}

const DEFAULTS = {
    background: "#0C0E12",
    textColor: "#9AA6B6",
    accent: "#00FFB4",
    font: { variant: "Regular", fontSize: 18, textAlign: "left", fontFamily: "Inter", fontWeight: 500, lineHeight: "1.5em", letterSpacing: "0em" } as FontLike,
    speed: 50,
    size: 10,
    rain: 100,
    hover: 100,
    reach: 420,
}

export default function GlyphRipple(props: GlyphRippleProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let W = 0
        let H = 0
        let dpr = 1
        let fontEpoch = 0
        let atlasKey = ""
        let atlasText: Atlas | null = null
        let atlasAcc: Atlas | null = null
        let cellW = 11
        let cellH = 23
        let cols = 0
        let rows = 0
        let field = new Float32Array(0)
        let gridKey = ""

        const rnd = mulberry32(SEED)
        let sim = 0
        let nextDrop = 0.35
        let seeded = false
        const pulses: Pulse[] = []
        const pointer = { x: 0, y: 0, active: false, travel: 0, lastEmit: -1e9, lx: 0, ly: 0, fresh: true }

        const resize = () => {
            dpr = Math.min(2, window.devicePixelRatio || 1)
            W = root.offsetWidth || 1200
            H = root.offsetHeight || 800
            const bw = Math.max(1, Math.round(W * dpr))
            const bh = Math.max(1, Math.round(H * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const onFonts = () => {
            fontEpoch++
        }
        const fonts = (document as any).fonts
        fonts?.addEventListener?.("loadingdone", onFonts)

        const push = (x: number, y: number, t0: number, amp: number) => {
            pulses.push({ x, y, t0, amp })
            if (pulses.length > MAX_PULSES) pulses.splice(0, pulses.length - MAX_PULSES)
        }
        const raindrop = (at: number) => {
            const x = W * (0.08 + rnd() * 0.84)
            const y = H * (0.08 + rnd() * 0.84)
            RAIN_RINGS.forEach((a, i) => push(x, y, at + i * RAIN_STAGGER, a))
        }

        let raf = 0
        let last = -1
        const frame = (now: number) => {
            const p = propsRef.current
            const background = p.background ?? DEFAULTS.background
            const font = p.font
            const speed = Math.max(0, p.speed ?? DEFAULTS.speed)
            const band = Math.max(2, p.size ?? DEFAULTS.size)
            const rain = Math.max(0, p.rain ?? DEFAULTS.rain)
            const hover = Math.max(0, p.hover ?? DEFAULTS.hover)
            const reach = Math.max(10, p.reach ?? DEFAULTS.reach)
            const txt = parseColor(p.textColor ?? DEFAULTS.textColor, [154, 166, 182, 1])
            const acc = parseColor(p.accent ?? DEFAULTS.accent, [111, 227, 193, 1])

            const dt = last < 0 ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now

            // atlases + cell metrics follow the Font control
            const px = fontPx(font)
            const fkey = `${font?.fontFamily}|${font?.fontWeight}|${font?.fontStyle}|${font?.letterSpacing}|${font?.lineHeight}|${px}|${dpr}|${fontEpoch}`
            const aKey = `${fkey}|${txt.slice(0, 3)}|${acc.slice(0, 3)}`
            if (aKey !== atlasKey) {
                atlasKey = aKey
                atlasText = buildAtlas(font, px, txt, dpr)
                atlasAcc = buildAtlas(font, px, acc, dpr)
                ctx.setTransform(1, 0, 0, 1, 0, 0)
                ctx.font = fontShorthand(font, px)
                cellW = Math.max(3, ctx.measureText("M").width + letterSpacingPx(font, px))
                cellH = Math.max(4, px * lineHeightMul(font, px))
            }
            const gKey = `${W}|${H}|${cellW}|${cellH}`
            if (gKey !== gridKey) {
                gridKey = gKey
                cols = Math.max(1, Math.ceil(W / cellW) + 1)
                rows = Math.max(1, Math.ceil(H / cellH) + 1)
                field = new Float32Array(cols * rows)
            }
            // centre the grid so both edges get the same margin
            const ox = (W - (cols - 1) * cellW) / 2
            const oy = (H - (rows - 1) * cellH) / 2

            const ts = speed / 50
            const v = RIPPLE_V
            sim += dt * ts

            // two drops already under way so the first frame is never blank
            if (!seeded && W > 0) {
                seeded = true
                if (rain > 0) {
                    raindrop(-0.9)
                    raindrop(-0.25)
                }
            }
            if (rain > 0 && sim >= nextDrop) {
                raindrop(sim)
                // exponential gaps, so drops never fall on a visible beat
                nextDrop = sim + -Math.log(1 - rnd() * 0.95) * RAIN_PERIOD * (50 / rain)
            } else if (rain <= 0) nextDrop = sim + RAIN_PERIOD

            // pointer: frozen pulse records by distance travelled, heartbeat when still
            const amp = hover / 100
            if (pointer.active && amp > 0) {
                const spacing = Math.max(14, band * 1.1)
                if (pointer.fresh) {
                    pointer.fresh = false
                    push(pointer.x, pointer.y, sim, amp)
                    pointer.lastEmit = sim
                    pointer.travel = 0
                } else if (pointer.travel >= spacing) {
                    pointer.travel = 0
                    push(pointer.x, pointer.y, sim, amp * 0.85)
                    pointer.lastEmit = sim
                } else if (sim - pointer.lastEmit >= HEARTBEAT) {
                    push(pointer.x, pointer.y, sim, amp)
                    pointer.lastEmit = sim
                }
            }

            // cull rings that have faded past Reach (keep ones not yet born)
            const tail = band * 1.5
            for (let i = pulses.length - 1; i >= 0; i--) {
                const r = (sim - pulses[i].t0) * v
                if (r > reach + tail) pulses.splice(i, 1)
            }

            // accumulate intensity over each annulus' bounding rows/cols
            field.fill(0)
            // Size is the full visible band, ~4σ
            const sigma = band / 4
            const inv2 = 1 / (2 * sigma * sigma)
            for (const pu of pulses) {
                const age = sim - pu.t0
                if (age < 0) continue
                const r = age * v
                const life = 1 - r / reach
                if (life <= 0) continue
                const fade = Math.sqrt(life) * pu.amp
                const outer = r + tail
                const inner = Math.max(0, r - tail)
                const c0 = Math.max(0, Math.floor((pu.x - outer - ox) / cellW))
                const c1 = Math.min(cols - 1, Math.ceil((pu.x + outer - ox) / cellW))
                const r0 = Math.max(0, Math.floor((pu.y - outer - oy) / cellH))
                const r1 = Math.min(rows - 1, Math.ceil((pu.y + outer - oy) / cellH))
                const in2 = inner * inner
                const out2 = outer * outer
                for (let rr = r0; rr <= r1; rr++) {
                    const dy = oy + rr * cellH - pu.y
                    const dy2 = dy * dy
                    if (dy2 > out2) continue
                    const base = rr * cols
                    for (let cc = c0; cc <= c1; cc++) {
                        const dx = ox + cc * cellW - pu.x
                        const d2 = dx * dx + dy2
                        if (d2 > out2 || d2 < in2) continue
                        const e = Math.sqrt(d2) - r
                        field[base + cc] += fade * Math.exp(-e * e * inv2)
                    }
                }
            }

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

            // resting dots: one path, one fill
            const dot = Math.max(1, Math.round(px * 0.11 * dpr) / dpr)
            ctx.fillStyle = `rgba(${txt[0]},${txt[1]},${txt[2]},${(txt[3] * REST_ALPHA).toFixed(3)})`
            ctx.beginPath()
            const active: number[] = []
            for (let rr = 0; rr < rows; rr++) {
                const y = oy + rr * cellH
                const base = rr * cols
                for (let cc = 0; cc < cols; cc++) {
                    const I = field[base + cc]
                    if (I > 0.12) active.push(base + cc)
                    else ctx.rect(ox + cc * cellW - dot / 2, y - dot / 2, dot, dot)
                }
            }
            ctx.fill()

            // ripple glyphs
            const at = atlasText!
            const aa = atlasAcc!
            const sq = at.cell / dpr // CSS px per atlas square at scale 1 + GROW
            for (const idx of active) {
                const I = Math.min(1, field[idx])
                const cc = idx % cols
                const rr = (idx - cc) / cols
                const g = Math.min(RAMP.length - 1, Math.floor(I * RAMP.length))
                const sc = (1 + GROW * I) / (1 + GROW)
                const s = sq * sc
                const x = ox + cc * cellW - s / 2
                const y = oy + rr * cellH - s / 2
                const lift = Math.min(1, 0.45 + I)
                ctx.globalAlpha = txt[3] * lift * (1 - I)
                if (ctx.globalAlpha > 0.004) ctx.drawImage(at.canvas, g * at.cell, 0, at.cell, at.cell, x, y, s, s)
                ctx.globalAlpha = acc[3] * lift * I
                if (ctx.globalAlpha > 0.004) ctx.drawImage(aa.canvas, g * aa.cell, 0, aa.cell, aa.cell, x, y, s, s)
            }
            ctx.globalAlpha = 1
            root.style.backgroundColor = background

            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        // offsetX/offsetY are element-local and carry no canvas zoom (rule G)
        const onMove = (e: PointerEvent) => {
            const x = e.offsetX
            const y = e.offsetY
            if (!pointer.active) {
                pointer.fresh = true
                pointer.lx = x
                pointer.ly = y
            }
            pointer.travel += Math.hypot(x - pointer.lx, y - pointer.ly)
            pointer.lx = x
            pointer.ly = y
            pointer.x = x
            pointer.y = y
            pointer.active = true
        }
        const onLeave = () => {
            pointer.active = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            fonts?.removeEventListener?.("loadingdone", onFonts)
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
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
                backgroundColor: props.background ?? DEFAULTS.background,
                ...props.style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
