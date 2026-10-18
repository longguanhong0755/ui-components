"use client"

/**
 * FibreTear — Page A rips down a fibrous paper edge and the halves separate.
 *
 * A tear starts at the top edge (at the click x; centre on the Framer canvas)
 * and its crack tip travels down a fractal path — multi-octave noise plus small
 * kinks — with a stick-slip speed wobble. Behind the tip the halves open like a
 * real crack (opening ∝ √distance from the tip, bent strip by strip), then fall
 * away with gravity and spin about their outer bottom corners, revealing Page B.
 *
 * The torn edge: the sheet shears obliquely, so the top (printed) layer and the
 * bottom (fibre) layer split along two different lines. Wherever the bottom
 * layer outlasts the top one, the paper core shows as a cream band — wider on
 * one half, and swapping halves along the path. Hundreds of fine fibres stick
 * out of the edge; some bridge the gap, stretch taut as it widens and snap into
 * curled stubs. Each half casts a soft shadow on Page B and darkens toward its
 * curled edge.
 *
 * Every geometry (path, bands, fibres) is built once per trigger from a seeded
 * RNG keyed on the tear x, so a loop is deterministic. Restore is exact reverse
 * playback: the halves fly back up and the tear zips shut from the bottom.
 *
 * Trigger: click → tear → hold → heal. Loops on the Framer canvas. In code,
 * pass `play` (true shows Page B) and `onComplete`.
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
    play: boolean | undefined; clicked: boolean; onCanvas: boolean; autoRestore: boolean
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
            if (i.autoRestore) {
                n.timer = s.timer + i.dt
                if (n.timer >= i.holdS - EPS) start(0)
            } else if (i.clicked) {
                start(0)
            }
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

function easeInOutQuad(x: number): number {
    return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2
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

/** 1D value noise in [-1, 1] on an integer lattice, smoothstep-interpolated. */
function valueNoise(rand: () => number): (x: number) => number {
    const size = 512
    const v = new Float32Array(size)
    for (let i = 0; i < size; i++) v[i] = rand() * 2 - 1
    const off = rand() * 64
    return (x: number) => {
        const p = x + off
        const i = Math.floor(p)
        const f = p - i
        const s = f * f * (3 - 2 * f)
        const a = v[((i % size) + size) % size]
        const b = v[(((i + 1) % size) + size) % size]
        return a + (b - a) * s
    }
}
// ── /math ──

// ── tear geometry ──
interface Fibre { ax: number; ay: number; cx: number; cy: number; ex: number; ey: number; h: number; bucket: number }
interface Bridge {
    ax: number; ay: number; bx: number; by: number
    rest: number; brk: number; w: number
    /** Snapped stubs, [cx, cy, ex, ey] in each half's own frame. */
    sa: [number, number, number, number]
    sb: [number, number, number, number]
}
interface Tear {
    W: number; H: number; xFrac: number; seed: number; n: number
    /** Top (printed) layer split line. */
    top: Float32Array
    /** Where each half's material ends: left reaches max(top, bottom layer), right min(). */
    matL: Float32Array
    matR: Float32Array
    fibres: Fibre[]
    bridges: Bridge[]
}

/** Fibre buckets: 0–2 thin, 3–5 thick; alpha by bucket % 3. */
const FIBRE_ALPHA = [0.45, 0.7, 0.95]
const FIBRE_WIDTH = [0.5, 0.9]

function buildTear(W: number, H: number, xFrac: number): Tear {
    const seed = 1 + Math.round(xFrac * 997) * 7919
    const rand = mulberry32(seed)
    const S = Math.max(0.5, Math.min(2, Math.min(W / 1200, H / 800)))
    const n = Math.max(120, Math.round(H / 3))
    // Wander: five octaves, long sweeps down to fine jaggedness.
    const oct = [[2, 70], [5, 26], [12, 10], [30, 4.5], [80, 1.8]].map(([f, a]) => ({ f, a: a * S, nz: valueNoise(rand) }))
    const sideNz = valueNoise(rand)
    const sizeNz = valueNoise(rand)
    const slope = (rand() * 2 - 1) * 0.12
    const bias = rand() < 0.5 ? -0.4 : 0.4
    let base = 0
    for (const o of oct) base += o.a * o.nz(0)
    const x0 = xFrac * W - base
    const top = new Float32Array(n)
    const matL = new Float32Array(n)
    const matR = new Float32Array(n)
    let kink = 0
    let kinkTarget = 0
    for (let i = 0; i < n; i++) {
        const u = i / (n - 1)
        const y = u * H
        // Kinks: the tear catches on a fibre bundle and steps sideways.
        if (i > 0 && rand() < 0.035) kinkTarget += (rand() * 2 - 1) * 9 * S
        kink += (kinkTarget - kink) * 0.5
        let x = x0 + slope * y + kink
        for (const o of oct) x += o.a * o.nz(u * o.f)
        x = Math.max(W * 0.1, Math.min(W * 0.9, x))
        const t = x + (rand() - 0.5) * 1.6 * S
        // Oblique shear: signed core width, sign says which half keeps the exposed fibre layer.
        const side = Math.max(-1, Math.min(1, (bias + sideNz(u * 4.5)) * 1.4))
        const mag = 10 * S * (0.55 + 0.45 * sizeNz(u * 22))
        const bot = t + side * mag + (rand() - 0.5) * 1.4 * S
        top[i] = t
        matL[i] = Math.max(t, bot)
        matR[i] = Math.min(t, bot)
    }
    const yAt = (i: number) => (i / (n - 1)) * H
    const scaleN = H / 800

    const fibres: Fibre[] = []
    const FIB = Math.round(560 * scaleN)
    for (let k = 0; k < FIB; k++) {
        const h = rand() < 0.5 ? 0 : 1
        const sgn = h ? -1 : 1
        const mat = h ? matR : matL
        const i = 1 + Math.floor(rand() * (n - 2))
        const tx = mat[i + 1] - mat[i - 1]
        const ty = yAt(i + 1) - yAt(i - 1)
        const tl = Math.hypot(tx, ty) || 1
        const nx = (sgn * ty) / tl
        const ny = (-sgn * tx) / tl
        const ax = mat[i] - sgn * rand() * 2.5 * S
        const ay = yAt(i) + (rand() - 0.5) * 3 * S
        const ang = (rand() * 2 - 1) * 1.1
        const dx = nx * Math.cos(ang) - ny * Math.sin(ang)
        const dy = nx * Math.sin(ang) + ny * Math.cos(ang)
        const L = (2 + 11 * rand() ** 2 + (rand() < 0.06 ? 10 : 0)) * S
        const bend = (rand() * 2 - 1) * 0.4 * L
        fibres.push({
            ax, ay,
            cx: ax + dx * L * 0.5 - dy * bend,
            cy: ay + dy * L * 0.5 + dx * bend,
            ex: ax + dx * L,
            ey: ay + dy * L,
            h,
            bucket: Math.floor(rand() * 3) + (rand() < 0.3 ? 3 : 0),
        })
    }

    const bridges: Bridge[] = []
    const BR = Math.round(170 * scaleN)
    const stub = (px: number, py: number, dx: number, dy: number, len: number, curl: number): [number, number, number, number] => {
        const cx = px + dx * len * 0.6
        const cy = py + dy * len * 0.6
        const rx = dx * Math.cos(curl) - dy * Math.sin(curl)
        const ry = dx * Math.sin(curl) + dy * Math.cos(curl)
        return [cx, cy, cx + rx * len * 0.5, cy + ry * len * 0.5]
    }
    for (let k = 0; k < BR; k++) {
        const i = 1 + Math.floor(rand() * (n - 2))
        const j = Math.max(0, Math.min(n - 1, i + Math.round((rand() * 2 - 1) * 3)))
        const ax = matL[i] - rand() * 3 * S
        const ay = yAt(i) + (rand() - 0.5) * 2 * S
        const bx = matR[j] + rand() * 3 * S
        const by = yAt(j) + (rand() - 0.5) * 2 * S
        const d0 = Math.hypot(bx - ax, by - ay)
        const ux = d0 > 1e-3 ? (bx - ax) / d0 : 1
        const uy = d0 > 1e-3 ? (by - ay) / d0 : 0
        const rest = d0 + (1.5 + 10 * rand() ** 1.5) * S
        const fa = 0.3 + 0.35 * rand()
        const fb = 0.3 + 0.35 * rand()
        bridges.push({
            ax, ay, bx, by, rest,
            brk: 0.25 + rand() * 1.1,
            w: 0.5 + 0.5 * rand(),
            sa: stub(ax, ay, ux, uy, rest * fa, (rand() * 2 - 1) * 1.4),
            sb: stub(bx, by, -ux, -uy, rest * fb, (rand() * 2 - 1) * 1.4),
        })
    }
    return { W, H, xFrac, seed, n, top, matL, matR, fibres, bridges }
}

function edgeAt(tear: Tear, arr: Float32Array, y: number): number {
    const f = Math.max(0, Math.min(tear.n - 1, (y / tear.H) * (tear.n - 1)))
    const i = Math.min(tear.n - 2, Math.floor(f))
    return arr[i] + (arr[i + 1] - arr[i]) * (f - i)
}

/** Closed polygon of one half bounded by `edge`: h=0 left of it, h=1 right of it. */
function halfPath(ctx: CanvasRenderingContext2D, tear: Tear, h: number, edge: Float32Array) {
    const { W, H, n } = tear
    const xo = h ? W + 4 : -4
    ctx.beginPath()
    ctx.moveTo(xo, -4)
    ctx.lineTo(edge[0], -4)
    for (let i = 0; i < n; i++) ctx.lineTo(edge[i], (i / (n - 1)) * H)
    ctx.lineTo(edge[n - 1], H + 4)
    ctx.lineTo(xo, H + 4)
    ctx.closePath()
}

/** Bakes one half: paper core band, print clipped to the top-layer line, the lip. */
function bakeBody(c: HTMLCanvasElement, q: number, tear: Tear, h: number, pageA: HTMLCanvasElement, paper: string) {
    const { W, H, n, top } = tear
    const mat = h ? tear.matR : tear.matL
    c.width = Math.max(1, Math.round(W * q))
    c.height = Math.max(1, Math.round(H * q))
    const ctx = c.getContext("2d")!
    ctx.setTransform(q, 0, 0, q, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.save()
    halfPath(ctx, tear, h, mat)
    ctx.clip()
    ctx.fillStyle = paper
    ctx.fillRect(-4, -4, W + 8, H + 8)
    // Fibre grain inside the exposed core band.
    const rand = mulberry32(tear.seed ^ (h ? 0x5bd1e995 : 0x1b873593))
    ctx.lineWidth = 0.6
    ctx.lineCap = "round"
    ctx.strokeStyle = "rgba(90, 70, 50, 0.12)"
    ctx.beginPath()
    for (let k = 0; k < n * 3; k++) {
        const i = Math.floor(rand() * n)
        const lo = Math.min(top[i], mat[i])
        const hi = Math.max(top[i], mat[i])
        if (hi - lo < 1) continue
        const x = lo + rand() * (hi - lo)
        const y = (i / (n - 1)) * H + (rand() - 0.5) * 3
        const a = (rand() * 2 - 1) * 0.8
        const l = 1.5 + rand() * 3
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
    }
    ctx.stroke()
    ctx.save()
    halfPath(ctx, tear, h, top)
    ctx.clip()
    ctx.drawImage(pageA, 0, 0, W, H)
    ctx.restore()
    // The printed layer's broken edge sits a hair above the core.
    ctx.strokeStyle = "rgba(0, 0, 0, 0.22)"
    ctx.lineWidth = 0.8
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
        const y = (i / (n - 1)) * H
        if (i === 0) ctx.moveTo(top[i], y)
        else ctx.lineTo(top[i], y)
    }
    ctx.stroke()
    ctx.restore()
}

/** Bakes the curl shading: darkening toward the torn edge with a lit lip. */
function bakeShade(c: HTMLCanvasElement, tear: Tear, h: number) {
    const { W, H } = tear
    const mat = h ? tear.matR : tear.matL
    const S = Math.max(0.5, Math.min(2, Math.min(W / 1200, H / 800)))
    const span = 70 * S
    c.width = Math.max(1, Math.round(W))
    c.height = Math.max(1, Math.round(H))
    const ctx = c.getContext("2d")!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.save()
    halfPath(ctx, tear, h, mat)
    ctx.clip()
    const sgn = h ? -1 : 1
    for (let y = 0; y < H; y += 3) {
        const e = edgeAt(tear, mat, y + 1.5)
        const g = ctx.createLinearGradient(e - sgn * span, 0, e, 0)
        g.addColorStop(0, "rgba(0,0,0,0)")
        g.addColorStop(0.6, "rgba(0,0,0,0.10)")
        g.addColorStop(0.86, "rgba(0,0,0,0.22)")
        g.addColorStop(0.95, "rgba(255,255,255,0.16)")
        g.addColorStop(1, "rgba(255,255,255,0.06)")
        ctx.fillStyle = g
        ctx.fillRect(Math.min(e, e - sgn * span) - 2, y, span + 4, 3)
    }
    ctx.restore()
}

/** Bakes a blurred silhouette, drawn offset under the half as its cast shadow. */
function bakeShadow(c: HTMLCanvasElement, q: number, tear: Tear, h: number) {
    const { W, H } = tear
    const S = Math.max(0.5, Math.min(2, Math.min(W / 1200, H / 800)))
    c.width = Math.max(1, Math.round(W * q))
    c.height = Math.max(1, Math.round(H * q))
    const ctx = c.getContext("2d")!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    // Offset trick: draw the shape off-raster, let only its shadow land. Blur/offset are raster px.
    const off = (W + H) * 2
    ctx.setTransform(q, 0, 0, q, 0, 0)
    ctx.translate(-off, 0)
    ctx.shadowColor = "rgba(0,0,0,0.55)"
    ctx.shadowBlur = 20 * S * q
    ctx.shadowOffsetX = off * q
    halfPath(ctx, tear, h, h ? tear.matR : tear.matL)
    ctx.fillStyle = "#000"
    ctx.fill()
}
// ── /tear geometry ──

const PLAY_S = 2.6
const RESTORE_S = 2
/** Share of the play timeline spent propagating the tear; the fall takes the rest. */
const TEAR_SHARE = 0.6
/** Strip height (px) of the piecewise-affine bend. */
const STRIP = 20
const SHADOW_Q = 0.25

interface ImageItem {
    image?: { src?: string } | null
    fill?: string
}
interface Props {
    background?: string
    speed?: number
    hold?: number
    trigger?: "auto" | "click"
    paper?: string
    images?: ImageItem[]
    play?: boolean
    onComplete?: () => void
    style?: CSSProperties
}

const DEFAULT_IMAGES: ImageItem[] = [{ fill: "#23324A" }, { fill: "#E9DCC8" }]
const DEFAULT_PAPER = "#F4EFE4"

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

function drawPage(ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, item: ImageItem, img: HTMLImageElement | null) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = cssRgba(parseColor(item.fill, [0.1, 0.1, 0.1, 1]))
    ctx.fillRect(0, 0, W, H)
    if (img && img.naturalWidth > 0) {
        const s = Math.max(W / img.naturalWidth, H / img.naturalHeight)
        const dw = img.naturalWidth * s
        const dh = img.naturalHeight * s
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
    }
}

/** Rigid pose of one half, applied after the bend: rotate about (px, py), then translate. */
interface Pose { s: number; px: number; py: number; tx: number; ty: number; th: number; cos: number; sin: number }

export default function FibreTear(props: Props) {
    // speed / hold / paper are read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#0E0E10", speed = 50, hold = 2, paper = "#F4EFE4", style } = props
    void [speed, hold, paper]
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

        // Which image is "now showing"; each completed tear advances this, so the next
        // click always tears the current image away to reveal the one after it in the list.
        let activeIndex = 0
        const imgCache = new Map<string, HTMLImageElement | null>()
        const getImg = (src: string | undefined, onReady: () => void) => {
            if (!src) return null
            if (imgCache.has(src)) return imgCache.get(src)!
            imgCache.set(src, null)
            loadImage(src).then((im) => {
                imgCache.set(src, im)
                onReady()
            })
            return null
        }

        // Two page rasters — the current image and the next one in the list — rebuilt only when their inputs change.
        const pages = [document.createElement("canvas"), document.createElement("canvas")]
        const keys = ["", ""]
        const ensurePages = () => {
            const p = propsRef.current
            const items = p.images && p.images.length > 0 ? p.images : DEFAULT_IMAGES
            const idx = [activeIndex % items.length, (activeIndex + 1) % items.length]
            idx.forEach((itemIdx, i) => {
                const item = items[itemIdx]
                const src = item.image?.src
                const img = getImg(src, () => { keys[i] = "" })
                const key = JSON.stringify([item.fill, src, !!img, W, H, dpr])
                if (key === keys[i]) return
                keys[i] = key
                pages[i].width = Math.max(1, Math.round(W * dpr))
                pages[i].height = Math.max(1, Math.round(H * dpr))
                drawPage(pages[i].getContext("2d")!, W, H, dpr, item, img)
            })
        }

        // Per-trigger tear geometry and the half rasters baked from it.
        let tear: Tear | null = null
        let tearId = 0
        let bakedKey = ""
        const bodies = [document.createElement("canvas"), document.createElement("canvas")]
        const shades = [document.createElement("canvas"), document.createElement("canvas")]
        const shadows = [document.createElement("canvas"), document.createElement("canvas")]
        const ensureBake = (paperCss: string) => {
            if (!tear) return
            const key = [tearId, keys[0], paperCss, W, H, dpr].join("|")
            if (key === bakedKey) return
            bakedKey = key
            for (let h = 0; h < 2; h++) {
                bakeBody(bodies[h], dpr, tear, h, pages[0], paperCss)
                bakeShade(shades[h], tear, h)
                bakeShadow(shadows[h], SHADOW_Q, tear, h)
            }
        }

        let clicked = false
        let pendingX: number | null = null
        let state: TriggerState = TRIGGER_IDLE
        const xFracAt = (ev: PointerEvent) => {
            // Rect only for the zoom ratio; position is normalised by the transform-free offsetWidth.
            const rect = canvas.getBoundingClientRect()
            const zoom = rect.width > 0 ? canvas.offsetWidth / rect.width : 1
            return Math.max(0.15, Math.min(0.85, ((ev.clientX - rect.left) * zoom) / Math.max(1, canvas.offsetWidth)))
        }
        const onDown = (ev: PointerEvent) => {
            pendingX = xFracAt(ev)
            clicked = true
        }
        canvas.addEventListener("pointerdown", onDown)

        const poses: Pose[] = [
            { s: -1, px: 0, py: 0, tx: 0, ty: 0, th: 0, cos: 1, sin: 0 },
            { s: 1, px: 0, py: 0, tx: 0, ty: 0, th: 0, cos: 1, sin: 0 },
        ]
        let tipY = 0
        let amp = 0
        let fall = 0
        const dxAt = (y: number) => {
            const d = tipY - y
            if (d <= 0) return 0
            const u = d / H
            return amp * (0.55 * Math.sqrt(u) + 0.45 * u)
        }
        let mx = 0
        let my = 0
        const mapPt = (P: Pose, x: number, y: number) => {
            const rx = x + P.s * dxAt(y) - P.px
            const ry = y - P.py
            mx = P.cos * rx - P.sin * ry + P.px + P.tx
            my = P.sin * rx + P.cos * ry + P.py + P.ty
        }
        /** Draws a half raster strip by strip: each strip is its own shear, so the half bends continuously. */
        const drawStrips = (img: HTMLCanvasElement, P: Pose, ox: number, oy: number, overlap: number, shadeAlpha: boolean, alpha = 1) => {
            const rows = Math.ceil(H / STRIP)
            ctx.globalAlpha = alpha
            for (let k = 0; k < rows; k++) {
                const b0 = k * STRIP
                const b1 = Math.min(H, b0 + STRIP)
                if (b0 >= tipY) break
                const d0 = dxAt(b0)
                const d1 = dxAt(b1)
                if (shadeAlpha) {
                    const a = alpha * (fall > 0 ? 1 : clamp01((d0 + d1) / 28))
                    if (a <= 0.004) continue
                    ctx.globalAlpha = a
                }
                const c = (P.s * (d1 - d0)) / (b1 - b0)
                const e0 = P.s * d0 - c * b0
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
                ctx.translate(P.px + P.tx + ox, P.py + P.ty + oy)
                ctx.rotate(P.th)
                ctx.translate(-P.px, -P.py)
                ctx.transform(1, 0, c, 1, e0, 0)
                const y0 = Math.max(0, b0 - overlap)
                const y1 = Math.min(H, b1 + overlap)
                const sw = img.width
                const sy0 = (y0 / H) * img.height
                const sy1 = (y1 / H) * img.height
                if (sy1 - sy0 < 0.01) continue
                ctx.drawImage(img, 0, sy0, sw, sy1 - sy0, 0, y0, W, y1 - y0)
            }
            ctx.globalAlpha = 1
        }

        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const prevPhase = state.phase
            const mode = p.trigger ?? "click"
            const r = stepTrigger(state, {
                dt,
                animDt: dt * (Math.max(0, Math.min(100, num(p.speed, 50))) / 50),
                playDur: reduced ? 0.2 : PLAY_S,
                restoreDur: reduced ? 0.2 : RESTORE_S,
                holdS: Math.max(0, Math.min(10, num(p.hold, 2))),
                play: p.play,
                clicked: mode === "click" && clicked,
                onCanvas: mode === "auto" ? true : onCanvas,
                autoRestore: mode === "auto",
            })
            clicked = false
            state = r.s
            if (r.e.started) {
                // A start out of "held" means the reveal that was showing is now the current
                // image, so the next tear must move on to the one after it, not repeat it.
                if (prevPhase === "held") activeIndex++
                keys[0] = ""
                keys[1] = ""
                tear = buildTear(W, H, pendingX ?? 0.5)
                tearId++
            }
            pendingX = null
            if (r.e.completed) p.onComplete?.()
            if (state.phase !== "idle" && !tear) {
                tear = buildTear(W, H, 0.5)
                tearId++
            }
            if (tear && (tear.W !== W || tear.H !== H)) {
                tear = buildTear(W, H, tear.xFrac)
                tearId++
            }
            // Rebuild the page rasters for the (possibly just-advanced) activeIndex before this
            // frame draws anything — doing this earlier, before the index changed, was the glitch:
            // the first frame of a new tear briefly drew the stale pre-advance pages.
            ensurePages()

            const turn = state.phase === "playing" ? state.t : state.phase === "held" ? 1 : state.phase === "restoring" ? 1 - state.t : 0
            const [A, B] = pages
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, W, H)
            if (turn <= 0 || !tear || W < 2 || H < 2) {
                ctx.drawImage(A, 0, 0, W, H)
                return
            }
            const paperCss = cssRgba(parseColor(p.paper ?? DEFAULT_PAPER, [0.96, 0.94, 0.89, 1]))
            ensureBake(paperCss)

            // Timeline: the tip runs top→bottom with a stick-slip wobble, then the halves fall.
            const a = clamp01(turn / TEAR_SHARE)
            const e = easeInOutQuad(a)
            const tip = e + (0.35 / (Math.PI * 8)) * Math.sin(Math.PI * 8 * e)
            tipY = a >= 1 ? H + 1 : H * tip
            amp = H * 0.045
            fall = turn <= TEAR_SHARE ? 0 : (turn - TEAR_SHARE) / (1 - TEAR_SHARE)
            for (const P of poses) {
                P.px = P.s < 0 ? 0 : W
                P.py = H
                P.th = P.s * (0.1 * fall + 0.34 * fall * fall)
                P.tx = P.s * W * (0.03 * fall + 0.24 * fall * fall)
                P.ty = H * (1.65 * fall ** 2.4 - 0.05 * Math.sin(Math.PI * fall))
                P.cos = Math.cos(P.th)
                P.sin = Math.sin(P.th)
            }

            ctx.drawImage(B, 0, 0, W, H)
            if (fall >= 1) return

            // Cast shadows on Page B, then the halves, then the still-whole page below the tip.
            const shadowA = Math.min(1, a * 4) * (1 - 0.6 * fall)
            for (const P of poses) drawStrips(shadows[P.s < 0 ? 0 : 1], P, 0, 6 + 50 * fall, 0, false, shadowA)
            for (const P of poses) {
                const h = P.s < 0 ? 0 : 1
                drawStrips(bodies[h], P, 0, 0, 1, false)
                drawStrips(shades[h], P, 0, 0, 0, true)
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            if (tipY < H) {
                const sy = Math.max(0, tipY)
                ctx.drawImage(A, 0, (sy / H) * A.height, A.width, ((H - sy) / H) * A.height, 0, sy, W, H - sy)
            }

            // Fibres: loose ones batched by width × alpha, bridges stretch until they snap.
            const paths: Path2D[] = []
            for (let k = 0; k < 6; k++) paths.push(new Path2D())
            const taut = new Path2D()
            const slack = new Path2D()
            for (const f of tear.fibres) {
                if (f.ay >= tipY - 1) continue
                if (fall <= 0 && dxAt(f.ay) < 0.4) continue
                const P = poses[f.h]
                const path = paths[f.bucket]
                mapPt(P, f.ax, f.ay)
                path.moveTo(mx, my)
                mapPt(P, f.cx, f.cy)
                const qx = mx
                const qy = my
                mapPt(P, f.ex, f.ey)
                path.quadraticCurveTo(qx, qy, mx, my)
            }
            const [L, R] = poses
            for (const b of tear.bridges) {
                if (b.ay >= tipY - 1 || b.by >= tipY - 1) continue
                mapPt(L, b.ax, b.ay)
                const ax = mx
                const ay = my
                mapPt(R, b.bx, b.by)
                const bx = mx
                const by = my
                const dist = Math.hypot(bx - ax, by - ay)
                const strain = dist / b.rest - 1
                if (strain < b.brk) {
                    const sag = Math.sqrt(Math.max(0, b.rest * b.rest - dist * dist)) * 0.35
                    const nx = dist > 1e-3 ? -(by - ay) / dist : 0
                    const ny = dist > 1e-3 ? (bx - ax) / dist : 1
                    const path = strain > 0 ? taut : slack
                    path.moveTo(ax, ay)
                    path.quadraticCurveTo((ax + bx) / 2 + nx * sag, (ay + by) / 2 + ny * sag, bx, by)
                } else {
                    // Snapped: each end recoils into a curled stub on its own half.
                    const pa = paths[b.w > 0.75 ? 4 : 1]
                    pa.moveTo(ax, ay)
                    mapPt(L, b.sa[0], b.sa[1])
                    let qx = mx
                    let qy = my
                    mapPt(L, b.sa[2], b.sa[3])
                    pa.quadraticCurveTo(qx, qy, mx, my)
                    pa.moveTo(bx, by)
                    mapPt(R, b.sb[0], b.sb[1])
                    qx = mx
                    qy = my
                    mapPt(R, b.sb[2], b.sb[3])
                    pa.quadraticCurveTo(qx, qy, mx, my)
                }
            }
            ctx.lineCap = "round"
            const strokeAll = (dark: boolean) => {
                ctx.setTransform(dpr, 0, 0, dpr, dark ? 0.5 * dpr : 0, dark ? 0.8 * dpr : 0)
                ctx.strokeStyle = dark ? "rgba(0,0,0,0.22)" : paperCss
                for (let k = 0; k < 6; k++) {
                    ctx.globalAlpha = FIBRE_ALPHA[k % 3]
                    ctx.lineWidth = FIBRE_WIDTH[k < 3 ? 0 : 1]
                    ctx.stroke(paths[k])
                }
                ctx.globalAlpha = 0.9
                ctx.lineWidth = 0.9
                ctx.stroke(slack)
                ctx.lineWidth = 0.55
                ctx.stroke(taut)
                ctx.globalAlpha = 1
            }
            strokeAll(true)
            strokeAll(false)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
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
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                ...style,
            }}
        >
            {/* Size floor as in-flow content, not min-width/min-height: a CSS min clamps the
                frame, so an instance set smaller than 1200x800 overflowed it. This only sizes
                the root under Fit Content; any explicit frame clips it. */}
            <div aria-hidden style={{ width: 1200, height: 800, visibility: "hidden", pointerEvents: "none" }} />
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", cursor: "pointer" }}
            />
        </div>
    )
}
