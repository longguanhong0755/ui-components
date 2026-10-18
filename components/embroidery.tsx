"use client"

/**
 * Embroidery — type sewn into linen in satin stitch.
 *
 * Click and a needle sews the word in, column by column, back and forth like
 * an embroidery machine. A dashed transfer outline marks where the thread will
 * go before it arrives.
 *
 * Satin stitches run ACROSS each stroke of the letter, never along it. That
 * direction comes from the glyph's own distance field: the gradient of
 * "distance to the nearest edge" points across the stroke everywhere, so every
 * stitch is laid along it. Each stitch is drawn a little longer than the
 * stroke is wide and clipped back to the glyph at composite time, which gives
 * the clean satin edge. Stitches vary slightly in shade and carry a thin
 * highlight, so the thread reads as raised and glossy.
 *
 * Stitches are generated once per text change and sewn incrementally into an
 * accumulator. Each frame draws only the new stitches, plus one masked
 * composite of the whole piece.
 *
 * Trigger: click → sew → hold → unpick. Loops on the Framer canvas. In code,
 * pass `play` and `onComplete`.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
import { useEffect, useRef, type CSSProperties } from "react"

// Framer's editing canvas does not exist outside Framer: this build always
// renders in a real browser. Same values the live preview runs under.
const RenderTarget = {
    current: () => "preview",
    hasRestrictions: () => false,
    canvas: "canvas",
    export: "export",
    preview: "preview",
    thumbnail: "thumbnail",
}

// ── moments-kit v1 ──
// Shared by every moments/ component. Canonical copy: moments/kit/moments-kit.v1.ts.
// Edit there, then paste verbatim into each component; moments/checks/kit-sync.mjs enforces it.

type RGBA = [number, number, number, number]

const COLOR_CACHE = new Map<string, RGBA | null>()

function parseColor(input: string | undefined, fallback: RGBA): RGBA {
    if (typeof input !== "string") return fallback
    let hit = COLOR_CACHE.get(input)
    if (hit === undefined) {
        hit = parseColorRaw(input)
        COLOR_CACHE.set(input, hit)
    }
    return hit ?? fallback
}

function parseColorRaw(raw: string): RGBA | null {
    let s = raw.trim()
    const v = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(s)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        const h = s.slice(1)
        const x = (a: string) => parseInt(a, 16)
        let r: number, g: number, b: number, a = 255
        if (h.length === 3 || h.length === 4) {
            r = x(h[0] + h[0]); g = x(h[1] + h[1]); b = x(h[2] + h[2])
            if (h.length === 4) a = x(h[3] + h[3])
        } else if (h.length === 6 || h.length === 8) {
            r = x(h.slice(0, 2)); g = x(h.slice(2, 4)); b = x(h.slice(4, 6))
            if (h.length === 8) a = x(h.slice(6, 8))
        } else return null
        const out: RGBA = [r / 255, g / 255, b / 255, a / 255]
        return out.every(Number.isFinite) ? out : null
    }
    const m = /^(rgba?|hsla?)\(([^)]*)\)$/i.exec(s)
    if (!m) return null
    const parts = m[2].split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3) return null
    const num = (p: string, scale: number) =>
        p.endsWith("%") ? (parseFloat(p) / 100) * scale : parseFloat(p)
    const alpha = parts.length > 3 ? num(parts[3], 1) : 1
    let rgb: [number, number, number]
    if (m[1].toLowerCase().startsWith("rgb")) {
        rgb = [num(parts[0], 255) / 255, num(parts[1], 255) / 255, num(parts[2], 255) / 255]
    } else {
        const hh = (((parseFloat(parts[0]) % 360) + 360) % 360) / 360
        const ss = num(parts[1], 1), ll = num(parts[2], 1)
        const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
        const p = 2 * ll - q
        const f = (t: number) => {
            t = (t + 1) % 1
            if (t < 1 / 6) return p + (q - p) * 6 * t
            if (t < 1 / 2) return q
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
            return p
        }
        rgb = [f(hh + 1 / 3), f(hh), f(hh - 1 / 3)]
    }
    const out: RGBA = [rgb[0], rgb[1], rgb[2], alpha]
    return out.every(Number.isFinite) ? out.map((c) => Math.min(1, Math.max(0, c))) as RGBA : null
}

function cssRgba(c: RGBA): string {
    return `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${c[3]})`
}

interface FramerFont {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    fontSize?: number | string
    lineHeight?: number | string
    letterSpacing?: number | string
}

const FALLBACK_FAMILY = "Inter, system-ui, sans-serif"

function quoteFamily(family: string): string {
    return family
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => (n[0] === "'" || n[0] === '"' || /^[a-z-]+$/i.test(n) ? n : `"${n.replace(/"/g, '\\"')}"`))
        .join(", ")
}

function fontShorthand(font: FramerFont | undefined, fallbackSize: number, fallbackWeight: number) {
    const f = font || {}
    let size = fallbackSize
    if (typeof f.fontSize === "number" && Number.isFinite(f.fontSize)) size = f.fontSize
    else if (typeof f.fontSize === "string") {
        const n = parseFloat(f.fontSize)
        if (Number.isFinite(n)) size = f.fontSize.includes("rem") ? n * 16 : n
    }
    let lineHeight = size * 1.3
    if (typeof f.lineHeight === "number" && Number.isFinite(f.lineHeight))
        lineHeight = f.lineHeight <= 4 ? f.lineHeight * size : f.lineHeight
    else if (typeof f.lineHeight === "string") {
        const n = parseFloat(f.lineHeight)
        if (Number.isFinite(n))
            lineHeight = f.lineHeight.endsWith("%") ? (n / 100) * size : f.lineHeight.endsWith("em") ? n * size : n <= 4 ? n * size : n
    }
    const family = f.fontFamily ? quoteFamily(f.fontFamily) : FALLBACK_FAMILY
    const shorthand = `${f.fontStyle || "normal"} ${f.fontWeight || fallbackWeight} ${size}px ${family}`
    return { shorthand, size, lineHeight }
}

function wrapLines(measure: (s: string) => number, text: string, maxWidth: number): string[] {
    const out: string[] = []
    for (const para of String(text ?? "").split("\n")) {
        const words = para.split(/ +/)
        let line = ""
        for (const w of words) {
            const next = line ? `${line} ${w}` : w
            if (line && measure(next) > maxWidth) {
                out.push(line)
                line = w
            } else line = next
        }
        out.push(line)
    }
    return out
}

function radiusPx(w: number, h: number, pct: number): number {
    return (Math.min(w, h) / 2) * Math.min(1, Math.max(0, pct / 100))
}

type Phase = "idle" | "playing" | "held" | "restoring"
interface TriggerState { phase: Phase; t: number; timer: number; prevPlay: boolean | undefined }
interface TriggerInput {
    dt: number; animDt: number; playDur: number; restoreDur: number; holdS: number
    play: boolean | undefined; clicked: boolean; onCanvas: boolean
}
interface TriggerEvents { started: boolean; completed: boolean; restored: boolean }

const TRIGGER_IDLE: TriggerState = { phase: "idle", t: 0, timer: 0, prevPlay: undefined }
const CANVAS_IDLE_S = 1
// R3 ruling: compare with epsilon everywhere a float accumulator (dt/animDt
// summed frame by frame) is checked against a duration boundary — repeated
// 0.1 additions land on 0.9999999999999999, not 1, so a strict >= misses the
// transition for exactly one extra frame and the reducer's own tests (which
// assert phase after an exact frame count) go red on that alone.
const EPS = 1e-9

// I2 ruling: controlled mode (play !== undefined) reacts to the play LEVEL
// each step, not an edge against prevPlay — an uncontrolled run (play was
// undefined, so prevPlay never became true) that switches straight to
// play:false must still interrupt on that very frame. prevPlay stays on the
// state shape (set below every step) but is no longer read for a decision.
// I1 ruling: only the two *interrupt* transitions — playing→restoring and
// restoring→playing — mirror progress (t = 1 - s.t) so a controlled toggle
// keeps the visual position continuous. held→restoring and idle→playing are
// normal starts and still begin at t = 0.
function stepTrigger(s: TriggerState, i: TriggerInput): { s: TriggerState; e: TriggerEvents } {
    const e: TriggerEvents = { started: false, completed: false, restored: false }
    const n: TriggerState = { ...s, prevPlay: i.play }
    const controlled = i.play !== undefined
    const start = (t = 0) => { n.phase = "playing"; n.t = t; n.timer = 0; e.started = true }
    const restore = (t = 0) => { n.phase = "restoring"; n.t = t; n.timer = 0 }

    switch (s.phase) {
        case "idle":
            n.timer = s.timer + i.dt
            if (controlled ? i.play === true : i.clicked || (i.onCanvas && n.timer >= CANVAS_IDLE_S - EPS)) start()
            break
        case "playing":
            if (controlled && i.play === false) { restore(1 - s.t); break }
            n.t = Math.min(1, s.t + i.animDt / Math.max(1e-3, i.playDur))
            if (n.t >= 1 - EPS) { n.t = 1; n.phase = "held"; n.timer = 0; e.completed = true }
            break
        case "held":
            if (controlled) { if (i.play === false) restore(0); break }
            n.timer = s.timer + i.dt
            if (n.timer >= i.holdS - EPS) restore(0)
            break
        case "restoring":
            if (controlled && i.play === true) { start(1 - s.t); break }
            n.t = Math.min(1, s.t + i.animDt / Math.max(1e-3, i.restoreDur))
            if (n.t >= 1 - EPS) { n.phase = "idle"; n.t = 0; n.timer = 0; e.restored = true }
            break
    }
    return { s: n, e }
}

interface CardSpec {
    w: number; h: number; dpr: number; fill: string; rounded: number
    title: string; body: string; font: FramerFont | undefined; textColor: string
    image: HTMLImageElement | null; pad: number
}
interface GlyphBox { ch: string; x: number; y: number; w: number; h: number }

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}

/** Paints the card into ctx (canvas already sized w*dpr × h*dpr). Returns glyph boxes in CSS px when asked. */
function drawCard(ctx: CanvasRenderingContext2D, spec: CardSpec, wantGlyphs: boolean): GlyphBox[] {
    const { w, h, dpr, pad } = spec
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const r = radiusPx(w, h, spec.rounded)
    roundRectPath(ctx, 0, 0, w, h, r)
    ctx.fillStyle = cssRgba(parseColor(spec.fill, [1, 1, 1, 1]))
    ctx.fill()
    ctx.save()
    roundRectPath(ctx, 0, 0, w, h, r)
    ctx.clip()
    let y = pad
    if (spec.image && spec.image.naturalWidth > 0) {
        const ih = Math.round(h * 0.5)
        const s = Math.max(w / spec.image.naturalWidth, ih / spec.image.naturalHeight)
        const dw = spec.image.naturalWidth * s, dh = spec.image.naturalHeight * s
        ctx.save()
        ctx.beginPath(); ctx.rect(0, 0, w, ih); ctx.clip()
        ctx.drawImage(spec.image, (w - dw) / 2, (ih - dh) / 2, dw, dh)
        ctx.restore()
        y = ih + pad
    }
    const glyphs: GlyphBox[] = []
    const color = cssRgba(parseColor(spec.textColor, [0, 0, 0, 1]))
    const title = fontShorthand(spec.font, 22, 700)
    const body = fontShorthand(spec.font ? { ...spec.font, fontSize: title.size * 0.68, fontWeight: 400 } : undefined, 15, 400)
    const block = (text: string, f: { shorthand: string; size: number; lineHeight: number }) => {
        if (!text) return
        ctx.font = f.shorthand
        ctx.fillStyle = color
        ctx.textBaseline = "top"
        ctx.textAlign = "left"
        for (const line of wrapLines((s) => ctx.measureText(s).width, text, w - pad * 2)) {
            if (y + f.size > h - pad * 0.5) break
            ctx.fillText(line, pad, y)
            if (wantGlyphs) {
                // Prefix measures, so kerning between neighbours is respected.
                let prefix = ""
                for (const ch of line) {
                    const x = pad + ctx.measureText(prefix).width
                    const cw = pad + ctx.measureText(prefix + ch).width - x
                    if (ch.trim()) glyphs.push({ ch, x, y, w: cw, h: f.lineHeight })
                    prefix += ch
                }
            }
            y += f.lineHeight
        }
        y += f.size * 0.4
    }
    block(spec.title, title)
    block(spec.body, body)
    ctx.restore()
    return glyphs
}

function loadImage(src: string | undefined): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        if (!src || typeof Image === "undefined") return resolve(null)
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = src
    })
}

function createProgram<U extends string>(gl: WebGL2RenderingContext, vs: string, fs: string, uniforms: readonly U[]) {
    const sh = (type: number, src: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(s) || "shader compile failed"
            gl.deleteShader(s)
            throw new Error(log)
        }
        return s
    }
    const program = gl.createProgram()!
    const vsh = sh(gl.VERTEX_SHADER, vs)
    const fsh = sh(gl.FRAGMENT_SHADER, fs)
    gl.attachShader(program, vsh)
    gl.attachShader(program, fsh)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program) || "link failed"
        gl.deleteShader(vsh)
        gl.deleteShader(fsh)
        gl.deleteProgram(program)
        throw new Error(log)
    }
    // Shaders are flagged for deletion once linked; the GL driver frees them
    // for real after they're detached, which happens when the program itself
    // is eventually deleted. No reason to keep the compile units around.
    gl.deleteShader(vsh)
    gl.deleteShader(fsh)
    const u = {} as Record<U, WebGLUniformLocation>
    for (const name of uniforms) {
        const loc = gl.getUniformLocation(program, name)
        if (!loc) {
            gl.deleteProgram(program)
            throw new Error(`uniform ${name} not found`)
        }
        u[name] = loc
    }
    return { program, u }
}
// ── /moments-kit ──

// ── math ──
function clamp01(x: number): number {
    return x < 0 ? 0 : x > 1 ? 1 : x
}

function mulberry32(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Chamfer distance (px) from each inside pixel (a > 0.5) to the nearest outside pixel. */
function distanceInside(a: Float32Array, w: number, h: number): Float32Array {
    const INF = 1e9
    const d = new Float32Array(w * h)
    for (let i = 0; i < w * h; i++) d[i] = a[i] > 0.5 ? INF : 0
    const D1 = 1
    const D2 = Math.SQRT2
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const i = y * w + x
            if (d[i] === 0) continue
            let v = d[i]
            if (x > 0) v = Math.min(v, d[i - 1] + D1)
            if (y > 0) {
                v = Math.min(v, d[i - w] + D1)
                if (x > 0) v = Math.min(v, d[i - w - 1] + D2)
                if (x < w - 1) v = Math.min(v, d[i - w + 1] + D2)
            }
            d[i] = v
        }
    for (let y = h - 1; y >= 0; y--)
        for (let x = w - 1; x >= 0; x--) {
            const i = y * w + x
            if (d[i] === 0) continue
            let v = d[i]
            if (x < w - 1) v = Math.min(v, d[i + 1] + D1)
            if (y < h - 1) {
                v = Math.min(v, d[i + w] + D1)
                if (x < w - 1) v = Math.min(v, d[i + w + 1] + D2)
                if (x > 0) v = Math.min(v, d[i + w - 1] + D2)
            }
            d[i] = v
        }
    return d
}

interface Stitch {
    x0: number
    y0: number
    x1: number
    y1: number
    shade: number
}

/** Satin stitches across the strokes of the glyph mask, in machine sewing order. */
function satinStitches(a: Float32Array, d: Float32Array, w: number, h: number, spacing: number, seed: number): Stitch[] {
    const rnd = mulberry32(seed)
    let dMax = 1
    for (let i = 0; i < w * h; i++) if (d[i] > dMax) dMax = d[i]
    const colW = spacing * 3
    const cols: Stitch[][] = []
    for (let gy = spacing / 2; gy < h - 1; gy += spacing) {
        for (let gx = spacing / 2; gx < w - 1; gx += spacing) {
            const x = Math.min(w - 2, Math.max(1, Math.round(gx + (rnd() - 0.5) * spacing * 0.6)))
            const y = Math.min(h - 2, Math.max(1, Math.round(gy + (rnd() - 0.5) * spacing * 0.6)))
            const i = y * w + x
            if (a[i] < 0.5) continue
            let dx = d[i + 1] - d[i - 1]
            let dy = d[i + w] - d[i - w]
            let len = Math.hypot(dx, dy)
            if (len < 0.3) {
                // On the medial ridge the gradient cancels; look one step outward.
                const j = Math.min(w * h - 1, i + w + 1)
                dx = d[Math.min(w * h - 1, j + 1)] - d[Math.max(0, j - 1)]
                dy = d[Math.min(w * h - 1, j + w)] - d[Math.max(0, j - w)]
                len = Math.hypot(dx, dy)
                if (len < 0.3) {
                    dx = 0.5
                    dy = 0.87
                    len = 1
                }
            }
            dx /= len
            dy /= len
            const r = Math.min(dMax * 2.4, d[i] * 2.6 + spacing)
            const col = Math.floor(x / colW)
            ;(cols[col] ||= []).push({ x0: x - dx * r, y0: y - dy * r, x1: x + dx * r, y1: y + dy * r, shade: (rnd() - 0.5) * 0.14 })
        }
    }
    const out: Stitch[] = []
    cols.forEach((c, k) => {
        if (!c) return
        c.sort((p, q) => (k % 2 ? q.y0 - p.y0 : p.y0 - q.y0))
        out.push(...c)
    })
    return out
}
// ── /math ──

const PLAY_S = 3.6
const RESTORE_S = 0.7
const DEFAULT_FONT: FramerFont = { fontFamily: "'Arial Rounded MT Bold', 'Helvetica Neue', Arial, sans-serif", fontWeight: 800, fontSize: 170, lineHeight: 1.05 }

interface Props {
    background?: string
    speed?: number
    hold?: number
    text?: string
    font?: FramerFont
    thread?: string
    play?: boolean
    onComplete?: () => void
    style?: CSSProperties
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

/** Rasterises centred, auto-fitted text into a mask canvas at dpr; returns the canvas, the text's device-px box and the fitted font. */
function textMask(W: number, H: number, dpr: number, text: string, font: FramerFont) {
    const c = document.createElement("canvas")
    c.width = Math.max(1, Math.round(W * dpr))
    c.height = Math.max(1, Math.round(H * dpr))
    const ctx = c.getContext("2d")!
    let f = fontShorthand(font, 170, 800)
    ctx.font = f.shorthand
    const raw = String(text ?? "").split("\n")
    const widest = Math.max(1, ...raw.map((l) => ctx.measureText(l).width))
    const fit = Math.min(1, (W * 0.86) / widest, (H * 0.8) / (f.lineHeight * raw.length))
    if (fit < 1) f = fontShorthand({ ...font, fontSize: f.size * fit, lineHeight: f.lineHeight / f.size }, 170, 800)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.font = f.shorthand
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "#fff"
    const top = H / 2 - (f.lineHeight * (raw.length - 1)) / 2
    raw.forEach((line, i) => ctx.fillText(line, W / 2, top + i * f.lineHeight))
    const pad = Math.ceil(8 * dpr)
    const x0 = Math.max(0, Math.floor((W / 2 - W * 0.47) * dpr))
    const y0 = Math.max(0, Math.floor((top - f.lineHeight) * dpr) - pad)
    const x1 = Math.min(c.width, Math.ceil((W / 2 + W * 0.47) * dpr))
    const y1 = Math.min(c.height, Math.ceil((top + f.lineHeight * raw.length) * dpr) + pad)
    return { canvas: c, x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0), f, raw, top }
}

export default function Embroidery(props: Props) {
    // speed / hold are read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#D9CDB8", speed = 50, hold = 2, style } = props
    void [speed, hold]
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!root || !canvas || !ctx) return
        const onCanvas = RenderTarget.current() === RenderTarget.canvas
        const reduced =
            typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        let W = 0
        let H = 0
        let dpr = 1
        const resize = () => {
            W = root.offsetWidth
            H = root.offsetHeight
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        const fabric = document.createElement("canvas")
        let fabricKey = ""
        const ensureFabric = () => {
            const p = propsRef.current
            const key = JSON.stringify([p.background, W, H, dpr])
            if (key === fabricKey) return
            fabricKey = key
            fabric.width = Math.max(1, Math.round(W * dpr))
            fabric.height = Math.max(1, Math.round(H * dpr))
            const x = fabric.getContext("2d")!
            x.setTransform(dpr, 0, 0, dpr, 0, 0)
            x.fillStyle = cssRgba(parseColor(p.background, [0.85, 0.8, 0.72, 1]))
            x.fillRect(0, 0, W, H)
            const rnd = mulberry32(21)
            for (let y = 0; y < H; y += 3) {
                x.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.04})`
                x.fillRect(0, y, W, 1)
                x.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.04})`
                x.fillRect(0, y + 1, W, 1)
            }
            for (let xx = 0; xx < W; xx += 3) {
                x.fillStyle = `rgba(0,0,0,${0.02 + rnd() * 0.03})`
                x.fillRect(xx, 0, 1, H)
            }
            for (let i = 0; i < (W * H) / 9000; i++) {
                const sy = rnd() * H
                x.fillStyle = `rgba(80,60,30,${0.05 + rnd() * 0.05})`
                x.fillRect(rnd() * W, sy, 10 + rnd() * 40, 1.2)
            }
        }

        let piece: {
            x: number
            y: number
            w: number
            h: number
            mask: HTMLCanvasElement
            stitches: Stitch[]
            outline: { f: { shorthand: string; lineHeight: number }; raw: string[]; top: number }
        } | null = null
        let pieceKey = ""
        let fontTick = 0
        const loadedFonts = new Set<string>()
        const acc = document.createElement("canvas")
        const accCtx = acc.getContext("2d")!
        const disp = document.createElement("canvas")
        const dispCtx = disp.getContext("2d")!
        let sewn = 0

        const ensurePiece = () => {
            const p = propsRef.current
            const font = p.font || DEFAULT_FONT
            const text = p.text ?? "Handmade"
            const key = JSON.stringify([text, font, W, H, dpr, fontTick])
            if (key === pieceKey) return
            pieceKey = key
            const sh = fontShorthand(font, 170, 800).shorthand
            if (!loadedFonts.has(sh) && document.fonts?.load) {
                loadedFonts.add(sh)
                document.fonts.load(sh).then(() => fontTick++, () => {})
            }
            const m = textMask(W, H, dpr, text, font)
            const px = m.canvas.getContext("2d")!.getImageData(m.x, m.y, m.w, m.h).data
            const a = new Float32Array(m.w * m.h)
            for (let i = 0; i < a.length; i++) a[i] = px[i * 4 + 3] / 255
            const d = distanceInside(a, m.w, m.h)
            const mask = document.createElement("canvas")
            mask.width = m.w
            mask.height = m.h
            mask.getContext("2d")!.drawImage(m.canvas, m.x, m.y, m.w, m.h, 0, 0, m.w, m.h)
            piece = { x: m.x, y: m.y, w: m.w, h: m.h, mask, stitches: satinStitches(a, d, m.w, m.h, 3 * dpr, 77), outline: { f: m.f, raw: m.raw, top: m.top } }
            for (const c of [acc, disp]) {
                c.width = m.w
                c.height = m.h
            }
            sewn = 0
        }

        let clicked = false
        let state: TriggerState = TRIGGER_IDLE
        const onDown = () => {
            clicked = true
        }
        canvas.addEventListener("pointerdown", onDown)

        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            ensureFabric()
            ensurePiece()
            const p = propsRef.current
            const r = stepTrigger(state, {
                dt,
                animDt: dt * (Math.max(0, Math.min(100, num(p.speed, 50))) / 50),
                playDur: reduced ? 0.2 : PLAY_S,
                restoreDur: reduced ? 0.2 : RESTORE_S,
                holdS: Math.max(0, Math.min(10, num(p.hold, 2))),
                play: p.play,
                clicked,
                onCanvas,
            })
            clicked = false
            state = r.s
            if (r.e.completed) p.onComplete?.()

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(fabric, 0, 0)
            if (!piece) return
            const pc = piece
            const thread = parseColor(p.thread, [0.72, 0.13, 0.2, 1])

            const progress = state.phase === "playing" ? state.t : state.phase === "idle" ? 0 : 1
            const target = Math.floor(progress * pc.stitches.length)
            if (state.phase === "idle" && sewn > 0) {
                accCtx.clearRect(0, 0, pc.w, pc.h)
                sewn = 0
            }
            if (target < sewn) {
                accCtx.clearRect(0, 0, pc.w, pc.h)
                sewn = 0
            }
            if (target > sewn) {
                accCtx.lineCap = "round"
                for (let k = sewn; k < target; k++) {
                    const s = pc.stitches[k]
                    const m = 1 + s.shade
                    accCtx.strokeStyle = `rgb(${Math.round(Math.min(255, thread[0] * 255 * m))}, ${Math.round(Math.min(255, thread[1] * 255 * m))}, ${Math.round(Math.min(255, thread[2] * 255 * m))})`
                    accCtx.lineWidth = 1.9 * dpr
                    accCtx.beginPath()
                    accCtx.moveTo(s.x0, s.y0)
                    accCtx.lineTo(s.x1, s.y1)
                    accCtx.stroke()
                    accCtx.strokeStyle = "rgba(255,255,255,0.28)"
                    accCtx.lineWidth = 0.55 * dpr
                    accCtx.beginPath()
                    accCtx.moveTo(s.x0 - 0.5 * dpr, s.y0 - 0.5 * dpr)
                    accCtx.lineTo(s.x1 - 0.5 * dpr, s.y1 - 0.5 * dpr)
                    accCtx.stroke()
                }
                sewn = target
            }

            const fade = state.phase === "restoring" ? 1 - state.t : 1

            // Transfer outline, visible until the thread covers it.
            if (progress < 1 || state.phase === "restoring") {
                ctx.save()
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
                ctx.font = pc.outline.f.shorthand
                ctx.textAlign = "center"
                ctx.textBaseline = "middle"
                ctx.setLineDash([5, 4])
                ctx.lineWidth = 1.1
                ctx.strokeStyle = `rgba(${Math.round(thread[0] * 120)}, ${Math.round(thread[1] * 120)}, ${Math.round(thread[2] * 120)}, 0.45)`
                pc.outline.raw.forEach((line, i) => ctx.strokeText(line, W / 2, pc.outline.top + i * pc.outline.f.lineHeight))
                ctx.restore()
            }

            if (sewn > 0) {
                dispCtx.globalCompositeOperation = "source-over"
                dispCtx.clearRect(0, 0, pc.w, pc.h)
                dispCtx.drawImage(acc, 0, 0)
                dispCtx.globalCompositeOperation = "destination-in"
                dispCtx.drawImage(pc.mask, 0, 0)
                ctx.save()
                ctx.globalAlpha = fade
                ctx.shadowColor = "rgba(40, 25, 10, 0.4)"
                ctx.shadowBlur = 2.5 * dpr
                ctx.shadowOffsetY = 1.2 * dpr
                ctx.drawImage(disp, pc.x, pc.y)
                ctx.restore()
            }

            // Needle and trailing thread at the last stitch while sewing.
            if (state.phase === "playing" && sewn > 0 && sewn < pc.stitches.length) {
                const s = pc.stitches[sewn - 1]
                const nx = pc.x + s.x1
                const ny = pc.y + s.y1
                ctx.save()
                ctx.lineCap = "round"
                ctx.strokeStyle = cssRgba([thread[0], thread[1], thread[2], 0.9])
                ctx.lineWidth = 1.2 * dpr
                ctx.beginPath()
                ctx.moveTo(nx, ny)
                ctx.quadraticCurveTo(nx + 30 * dpr, ny - 60 * dpr, nx + 10 * dpr, ny - 140 * dpr)
                ctx.stroke()
                ctx.strokeStyle = "rgba(200, 205, 212, 1)"
                ctx.lineWidth = 2 * dpr
                ctx.beginPath()
                ctx.moveTo(nx, ny)
                ctx.lineTo(nx + 9 * dpr, ny - 26 * dpr)
                ctx.stroke()
                ctx.strokeStyle = "rgba(255,255,255,0.8)"
                ctx.lineWidth = 0.7 * dpr
                ctx.beginPath()
                ctx.moveTo(nx + 1 * dpr, ny - 3 * dpr)
                ctx.lineTo(nx + 8 * dpr, ny - 23 * dpr)
                ctx.stroke()
                ctx.restore()
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointerdown", onDown)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                minWidth: 1200,
                minHeight: 800,
                overflow: "hidden",
                background,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", cursor: "pointer" }}
            />
        </div>
    )
}
