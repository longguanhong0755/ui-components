"use client"

/**
 * FieldHorizontalRows — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
 *
 * Built on the Background template (lib/templates/BackgroundTemplate.tsx).
 * Only the EFFECT block and the effect controls are specific to this component.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
import { useEffect, useRef, type CSSProperties } from "react"

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

// ══ EFFECT — replace from here ══════════════════════════════════════════════

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    activity?: number
    slant?: number
    ripple?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    rowCount: 8,
    rowOffset: 0,
    tickPitch: 2,
    tickLength: 30,
    tickWidth: 34,
    shoulderRight: 60,
    shoulderLeft: 45,
    lowDepth: 100,
    rampFade: 110,
    easeMs: 70,
    plateauMin: 80,
    plateauMax: 480,
    gapMin: 45,
    gapMax: 110,
    crawlsPerMin: 120,
    maxCrawls: 6,
    crawlSpeed: 640,
    crawlMin: 240,
    crawlMax: 400,
    rightward: 85,
    rippleWave: 200,
    rippleTail: 400,
    rippleFadeMs: 100,
    rippleTint: 100,
    hoverGlow: 200,
    pointerPress: 45,
    pointerRadius: 120,
    pointerWake: 450,
    pointerSpawns: 100,
    seed: 10,
    grain: 0,
    vignette: 100,
}

type Adv = typeof ADVANCED_DEFAULTS

/** One crawl: a front that runs along a row, rewriting raised/lowered ticks behind it. */
interface Crawl {
    row: number
    start: number
    dir: number
    len: number
    speed: number
    age: number
    val: number
    run: number
    written: number
    at: number
}

interface Sim {
    key: string
    rows: number
    cols: number
    h: Uint8Array[]
    e: Float32Array[]
    target: Float32Array
    data: Float32Array
    crawls: Crawl[]
    rnd: () => number
    fresh: boolean
    tex: WebGLTexture | null
    texW: number
    texH: number
    last: number
    reduced: boolean
    press: Float32Array
    cool: Float32Array
}

const SIMS = new WeakMap<WebGL2RenderingContext, Sim>()

/** Pointer in drawing-buffer px (y down), plus clicks waiting to be handled. */
interface Ptr {
    x: number
    y: number
    px: number
    py: number
    inside: boolean
    seen: boolean
    hov: number
    clicks: { x: number; y: number }[]
}

const PTRS = new WeakMap<WebGL2RenderingContext, Ptr>()

function pointerFor(gl: WebGL2RenderingContext): Ptr {
    const had = PTRS.get(gl)
    if (had) return had
    const st: Ptr = { x: 0, y: 0, px: 0, py: 0, inside: false, seen: false, hov: 0, clicks: [] }
    PTRS.set(gl, st)
    const c = gl.canvas
    if (typeof HTMLCanvasElement !== "undefined" && c instanceof HTMLCanvasElement) {
        const at = (e: PointerEvent): [number, number] => [
            (e.offsetX * c.width) / Math.max(1, c.clientWidth),
            (e.offsetY * c.height) / Math.max(1, c.clientHeight),
        ]
        const put = (e: PointerEvent) => {
            const [x, y] = at(e)
            if (!st.seen) {
                st.px = x
                st.py = y
            }
            st.x = x
            st.y = y
            st.inside = true
            st.seen = true
        }
        c.addEventListener("pointermove", put)
        c.addEventListener("pointerleave", () => {
            st.inside = false
            st.seen = false
        })
        c.addEventListener("pointerdown", (e: PointerEvent) => {
            put(e)
            if (st.clicks.length < 8) st.clicks.push({ x: st.x, y: st.y })
        })
    }
    return st
}

/** Starts a crawl front at `start` in `row`, writing the opposite of what is there. */
function spawnCrawl(s: Sim, row: number, start: number, dir: number, adv: Adv, tpg: number): void {
    const cMin = num(adv.crawlMin, 240)
    const cMax = Math.max(cMin, num(adv.crawlMax, 400))
    const len = Math.max(2, Math.round(((cMin + (cMax - cMin) * s.rnd()) / 100) * tpg))
    const speed = Math.max(1, (num(adv.crawlSpeed, 640) / 100) * tpg * (0.85 + 0.3 * s.rnd()))
    const val = 1 - s.h[row][start]
    s.crawls.push({ row, start, dir, len, speed, age: 0, val, run: runTicks(val, adv, tpg, s.rnd), written: 0, at: start })
}

function clampN(v: number, a: number, b: number): number {
    return Math.min(b, Math.max(a, v))
}

function sstep(a: number, b: number, x: number): number {
    const t = clampN((x - a) / (Math.abs(b - a) < 1e-6 ? 1e-6 : b - a), 0, 1)
    return t * t * (3 - 2 * t)
}

function mulberry(seed: number): () => number {
    let a = seed >>> 0 || 1
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Run length in ticks for a plateau (val 1) or a gap (val 0); plateaus skew short-to-long. */
function runTicks(val: number, adv: Adv, tpg: number, rnd: () => number): number {
    const a = val ? num(adv.plateauMin, 80) : num(adv.gapMin, 45)
    const b = Math.max(a, val ? num(adv.plateauMax, 480) : num(adv.gapMax, 110))
    const r = val ? Math.pow(rnd(), 1.6) : rnd()
    return Math.max(1, Math.round(((a + (b - a) * r) / 100) * tpg))
}

function buildSim(key: string, rows: number, cols: number, seed: number, adv: Adv, tpg: number, prev: Sim | undefined): Sim {
    const rnd = mulberry(seed * 9973 + 1)
    const h: Uint8Array[] = []
    const e: Float32Array[] = []
    for (let r = 0; r < rows; r++) {
        const row = new Uint8Array(cols)
        let val = rnd() < 0.72 ? 1 : 0
        let run = Math.floor(runTicks(val, adv, tpg, rnd) * rnd()) + 1
        for (let i = 0; i < cols; i++) {
            row[i] = val
            if (--run <= 0) {
                val = 1 - val
                run = runTicks(val, adv, tpg, rnd)
            }
        }
        h.push(row)
        e.push(new Float32Array(cols))
    }
    const reduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    return {
        key,
        rows,
        cols,
        h,
        e,
        target: new Float32Array(cols),
        press: new Float32Array(rows * cols),
        cool: new Float32Array(rows),
        data: new Float32Array(rows * cols * 4),
        crawls: [],
        rnd,
        fresh: true,
        tex: prev ? prev.tex : null,
        texW: prev ? prev.texW : 0,
        texH: prev ? prev.texH : 0,
        last: prev ? prev.last : -1,
        reduced,
    }
}

/** Extra uniforms for this effect, set every frame. Runs the crawl simulation and uploads the per-tick profile. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const bw = Math.max(1, gl.drawingBufferWidth)
    const bh = Math.max(1, gl.drawingBufferHeight)
    const scale = clampN(num(p.scale, 100), 10, 300) / 100
    const rowCount = clampN(Math.round(num(adv.rowCount, 8)), 2, 40)
    const gap = Math.max(4, (bh / rowCount) * scale)
    const pitch = Math.max(1.5, gap / clampN(num(adv.tickPitch, 10), 2, 60))
    const tpg = gap / pitch
    const off = (clampN(num(adv.rowOffset, 2), 0, 100) / 100 - 1) * gap
    const rows = Math.min(160, Math.ceil((bh - off) / gap) + 1)
    const margin = Math.ceil((gap * 0.6) / pitch) + 2
    const cols = Math.min(4096, Math.ceil(bw / pitch) + margin + 2)
    const seed = Math.round(num(adv.seed, 7))
    const key = [bw, bh, gap.toFixed(3), pitch.toFixed(3), off.toFixed(2), rows, cols, seed].join("|")

    let s = SIMS.get(gl)
    if (!s || s.key !== key) {
        s = buildSim(key, rows, cols, seed, adv, tpg, s)
        SIMS.set(gl, s)
    }

    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    const real = s.last < 0 ? 0 : Math.min(Math.max(0, now - s.last) / 1000, 1 / 20)
    s.last = now
    const dt = real * (clampN(num(p.speed, 50), 0, 100) / 50)

    // ── spawn crawls (Poisson, density per row-gap² so wider frames get proportionally more) ──
    const activity = clampN(num(p.activity, 50), 0, 100) / 50
    const area = (bw * bh) / (64 * gap * gap)
    const rate = (Math.max(0, num(adv.crawlsPerMin, 120)) / 60) * activity * area
    const cap = Math.max(0, Math.round(num(adv.maxCrawls, 6) * Math.max(1, area)))
    if (!s.reduced && dt > 0 && s.crawls.length < cap && s.rnd() < 1 - Math.exp(-rate * dt)) {
        const row = Math.floor(s.rnd() * s.rows)
        const lo = margin
        const hi = Math.max(lo + 1, cols - 2)
        const start = Math.min(cols - 1, lo + Math.floor(s.rnd() * (hi - lo)))
        const dir = s.rnd() * 100 < num(adv.rightward, 85) ? 1 : -1
        spawnCrawl(s, row, start, dir, adv, tpg)
    }

    // ── pointer: ticks under the cursor dip and fade, recovering behind it; a swipe or click sends crawls out ──
    const ptr = pointerFor(gl)
    ptr.hov += ((ptr.inside ? 1 : 0) - ptr.hov) * (1 - Math.exp(-real * 8))
    const pressAmt = (clampN(num(adv.pointerPress, 45), 0, 200) / 100) * (clampN(num(p.hover, 100), 0, 200) / 100)
    const R = Math.max(pitch, (clampN(num(adv.pointerRadius, 120), 10, 600) / 100) * gap)
    const P = s.press
    const decay = Math.exp(-real / Math.max(0.02, num(adv.pointerWake, 450) / 1000))
    if (decay < 1) for (let n = 0; n < P.length; n++) P[n] *= decay
    const mdx = ptr.x - ptr.px
    const mdy = ptr.y - ptr.py
    if (ptr.hov > 0.01 && pressAmt > 0) {
        const midY = 0.5 * Math.max(1, (clampN(num(adv.tickLength, 30), 5, 60) / 100) * gap)
        const steps = Math.min(24, Math.max(1, Math.ceil(Math.hypot(mdx, mdy) / (R * 0.5))))
        const rr = 1 / (R * R)
        const kr = Math.ceil((2.2 * R) / gap) + 1
        const jr = Math.ceil((2.2 * R) / pitch)
        for (let q = 1; q <= steps; q++) {
            const sx = ptr.px + (mdx * q) / steps
            const sy = ptr.py + (mdy * q) / steps
            const kc = Math.floor((sy - off) / gap)
            const jc = Math.round(sx / pitch) + margin
            for (let r = Math.max(0, kc - kr); r <= Math.min(s.rows - 1, kc + kr); r++) {
                const ddy = sy - (off + r * gap + midY)
                const fy = ddy * ddy * rr
                if (fy > 5) continue
                for (let j = Math.max(0, jc - jr); j <= Math.min(cols - 1, jc + jr); j++) {
                    const ddx = sx - (j - margin) * pitch
                    const f = ptr.hov * Math.exp(-(ddx * ddx * rr + fy))
                    const o = r * cols + j
                    if (f > P[o]) P[o] = f
                }
            }
        }
    }
    const spawnP = clampN(num(adv.pointerSpawns, 100), 0, 100) / 100
    if (!s.reduced && dt > 0 && spawnP > 0) {
        const pcap = cap + 12
        const rowAt = (y: number) => clampN(Math.floor((y - off) / gap), 0, s.rows - 1)
        const colAt = (x: number) => clampN(Math.round(x / pitch) + margin, 0, cols - 1)
        for (let r = 0; r < s.rows; r++) s.cool[r] = Math.max(0, s.cool[r] - real)
        if (ptr.inside && real > 0 && Math.abs(mdx) / real > 3 * gap && Math.abs(mdx) > Math.abs(mdy)) {
            const r = rowAt(ptr.y)
            if (s.cool[r] <= 0 && s.crawls.length < pcap && s.rnd() < spawnP) {
                spawnCrawl(s, r, colAt(ptr.x), mdx > 0 ? 1 : -1, adv, tpg)
                s.cool[r] = 0.3
            }
        }
        for (const c of ptr.clicks) {
            const r0 = rowAt(c.y)
            const j = colAt(c.x)
            for (let r = Math.max(0, r0 - 1); r <= Math.min(s.rows - 1, r0 + 1); r++) {
                for (const dir of [1, -1]) {
                    if (s.crawls.length < pcap && s.rnd() < spawnP) spawnCrawl(s, r, j, dir, adv, tpg)
                }
            }
        }
    }
    ptr.clicks.length = 0
    ptr.px = ptr.x
    ptr.py = ptr.y

    // ── advance crawls: the front writes a fresh plateau/gap pattern into the row behind it ──
    const fade = Math.max(0.001, num(adv.rippleFadeMs, 150) / 1000)
    for (let n = s.crawls.length - 1; n >= 0; n--) {
        const c = s.crawls[n]
        c.age += dt
        const travel = Math.min(c.len, c.age * c.speed)
        const row = s.h[c.row]
        while (c.written <= travel && c.written < c.len) {
            const i = c.start + c.dir * c.written
            if (i >= 0 && i < cols) row[i] = c.val
            if (--c.run <= 0) {
                c.val = 1 - c.val
                c.run = runTicks(c.val, adv, tpg, s.rnd)
            }
            c.written++
        }
        c.at = c.start + c.dir * travel
        if (c.age > c.len / c.speed + fade) s.crawls.splice(n, 1)
    }

    // ── profile: distance to nearest raised tick → rounded shoulder that steepens into a drop ──
    const Rr = Math.max(0.5, (num(adv.shoulderRight, 60) / 100) * tpg)
    const Rl = Math.max(0.5, (num(adv.shoulderLeft, 45) / 100) * tpg)
    const depth = Math.max(0.05, num(adv.lowDepth, 100) / 100)
    const gamma = Math.max(0.05, num(adv.rampFade, 110) / 100)
    const tau = Math.max(0, num(adv.easeMs, 70) / 1000)
    const k = s.fresh || tau <= 0 ? 1 : 1 - Math.exp(-dt / tau)
    const pTint = clampN(num(adv.rippleTint, 100), 0, 100) / 100
    const data = s.data
    const T = s.target
    for (let r = 0; r < s.rows; r++) {
        const hr = s.h[r]
        const er = s.e[r]
        let d = 1e6
        for (let i = 0; i < cols; i++) {
            d = hr[i] ? 0 : d + 1
            T[i] = (d / Rr) * (d / Rr)
        }
        d = 1e6
        for (let i = cols - 1; i >= 0; i--) {
            d = hr[i] ? 0 : d + 1
            const pv = P[r * cols + i] * pressAmt
            const v = Math.min(1, Math.min(1, T[i], (d / Rl) * (d / Rl)) + pv)
            er[i] += (v * depth - er[i]) * k
            const o = (r * cols + i) * 4
            data[o] = er[i]
            data[o + 1] = Math.pow(Math.max(0, 1 - er[i] / depth), gamma)
            data[o + 2] = Math.min(1, pv) * pTint
            data[o + 3] = 0
        }
    }
    s.fresh = false

    // ── ripple packets: a sine wobble trailing each front, tinted toward the accent grey ──
    const amp = clampN(num(p.ripple, 22), 0, 100) / 100
    const lam = Math.max(1, (num(adv.rippleWave, 144) / 100) * tpg)
    const tail = Math.max(1, (lam * num(adv.rippleTail, 120)) / 100)
    const lead = 0.25 * lam
    const tint = clampN(num(adv.rippleTint, 100), 0, 100) / 100
    for (const c of s.crawls) {
        const travelT = c.len / c.speed
        const env = sstep(0, fade, c.age) * (1 - sstep(travelT, travelT + fade, c.age))
        if (env <= 0) continue
        const a0 = Math.round(c.at)
        for (let q = -Math.ceil(lead); q <= Math.ceil(tail); q++) {
            const i = a0 - c.dir * q
            if (i < 0 || i >= cols) continue
            const back = (c.at - i) * c.dir
            const win = sstep(-lead, 0, back) * (1 - sstep(tail * 0.6, tail, back))
            if (win <= 0) continue
            const o = (c.row * cols + i) * 4
            data[o] -= amp * env * win * Math.sin((2 * Math.PI * back) / lam)
            data[o + 2] = Math.max(data[o + 2], tint * env * win)
        }
    }

    // ── upload ──
    gl.activeTexture(gl.TEXTURE0)
    if (!s.tex) {
        s.tex = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, s.tex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        s.texW = 0
        s.texH = 0
    }
    gl.bindTexture(gl.TEXTURE_2D, s.tex)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    if (s.texW !== cols || s.texH !== s.rows) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, cols, s.rows, 0, gl.RGBA, gl.FLOAT, data)
        s.texW = cols
        s.texH = s.rows
    } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cols, s.rows, gl.RGBA, gl.FLOAT, data)
    }

    const tn = Math.tan((clampN(num(p.slant, 25), 0, 45) * Math.PI) / 180)
    const L = Math.max(1, (clampN(num(adv.tickLength, 30), 5, 60) / 100) * gap)
    const w = Math.max(0.5, (clampN(num(adv.tickWidth, 36), 5, 90) / 100) * pitch)
    gl.uniform1i(u("uProfile"), 0)
    gl.uniform4f(u("uGeom"), gap, pitch, L, w)
    gl.uniform4f(u("uGeom2"), off, tn, margin, s.rows)
    gl.uniform1f(u("uCols"), cols)
    gl.uniform2f(u("uRange"), amp + 0.05, depth)
    gl.uniform1f(u("uGlow"), clampN(num(adv.hoverGlow, 60), 0, 200) / 100)
    gl.uniform2f(u("uFx"), clampN(num(adv.grain, 0), 0, 100) / 100, clampN(num(adv.vignette, 0), 0, 100) / 100)
}

/* Stacked rows of slanted hatch ticks; each tick's top sits on its row's height profile (texture).
   Rows are composited front (lower) to back; a row's body hides what lies below its tick line. */
const FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform float uScale;
uniform sampler2D uProfile;
uniform vec4 uGeom;
uniform vec4 uGeom2;
uniform float uCols;
uniform vec2 uRange;
uniform float uGlow;
uniform vec2 uFx;
out vec4 outColor;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
    vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
    float gap = max(uGeom.x, 1.0);
    float pitch = max(uGeom.y, 1e-3);
    float L = max(uGeom.z, 1.0);
    float w = max(uGeom.w, 0.5);
    float off = uGeom2.x;
    float tn = uGeom2.y;
    int M = int(uGeom2.z + 0.5);
    int rows = int(uGeom2.w + 0.5);
    int cols = int(uCols + 0.5);
    float cs = inversesqrt(1.0 + tn * tn);
    vec2 mp = vec2(uMouse.x * uRes.x, (1.0 - uMouse.y) * uRes.y);
    vec2 dm = p - mp;
    float glow = uHover * uGlow * exp(-dot(dm, dm) / max(4.5 * gap * gap, 1e-4));

    vec3 acc = vec3(0.0);
    float rem = 1.0;
    int kHi = min(int(floor((p.y - off + uRange.x * gap) / gap)), rows - 1);
    int kLo = max(int(floor((p.y - off - (uRange.y + uRange.x) * gap - L) / gap)), 0);
    for (int k = kHi; k >= kLo; k--) {
        float base = off + float(k) * gap;
        int j0 = int(floor((p.x - L * tn - w) / pitch)) + M;
        int j1 = int(floor((p.x + w) / pitch)) + M + 1;
        float cov = 0.0;
        vec3 tc = vec3(0.0);
        for (int j = j0; j <= j1; j++) {
            if (j < 0 || j >= cols) continue;
            vec4 t = texelFetch(uProfile, ivec2(j, k), 0);
            if (t.y < 0.004) continue;
            float xj = float(j - M) * pitch;
            float v = p.y - (base + t.x * gap);
            float ends = clamp(v + 0.5, 0.0, 1.0) * clamp(L - v + 0.5, 0.0, 1.0);
            float d = abs(p.x - xj - v * tn) * cs;
            float c = clamp(w * 0.5 + 0.5 - d, 0.0, 1.0) * ends;
            if (c > cov) { cov = c; tc = mix(uBase, uAccent, clamp(t.z, 0.0, 1.0)) * t.y; }
        }
        if (cov > 0.0) {
            tc = min(tc * (1.0 + glow), vec3(1.0));
            acc += rem * cov * tc;
            rem *= 1.0 - cov;
        }
        // body of this row: everything under its tick-top line is hidden from rows behind
        float fx = (p.x - 0.5 * L * tn) / pitch + float(M);
        int jb = int(floor(fx));
        float a0 = texelFetch(uProfile, ivec2(clamp(jb, 0, cols - 1), k), 0).x;
        float a1 = texelFetch(uProfile, ivec2(clamp(jb + 1, 0, cols - 1), k), 0).x;
        float ybody = base + mix(a0, a1, fract(fx)) * gap;
        if (p.y > ybody || rem <= 0.001) { rem = 0.0; break; }
    }
    vec3 col = uBg * rem + acc;

    vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));
    vec2 vq = uv - 0.5;
    vq.x *= uRes.x / max(uRes.y, 1.0);
    col *= 1.0 - uFx.y * smoothstep(0.25, 0.95, length(vq));
    col += (h21(gl_FragCoord.xy + fract(uTime * 7.13) * 517.0) - 0.5) * uFx.x * 0.25;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

// ══ /EFFECT ═════════════════════════════════════════════════════════════════

interface Props extends EffectProps {
    background?: string
    baseColor?: string
    accentColor?: string
    speed?: number
    scale?: number
    hover?: number
    style?: CSSProperties
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

export default function FieldHorizontalRows(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#FFFFFF", accentColor = "#71FF00", speed = 32, scale = 50, hover = 167, style } = props
    void [baseColor, accentColor, speed, scale, hover]
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false })
        if (!gl) return
        const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        const sh = (type: number, src: string) => {
            const s = gl.createShader(type)!
            gl.shaderSource(s, src)
            gl.compileShader(s)
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("FieldHorizontalRows shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("FieldHorizontalRows link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const loc = gl.getAttribLocation(prog, "aPos")
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
        const cache = new Map<string, WebGLUniformLocation | null>()
        const u = (name: string) => {
            if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name))
            return cache.get(name) ?? null
        }

        let W = 0
        let H = 0
        const resize = () => {
            W = root.offsetWidth
            H = root.offsetHeight
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        let mx = 0.5
        let my = 0.5
        let tx = 0.5
        let ty = 0.5
        let over = 0
        let hov = 0
        const onMove = (e: PointerEvent) => {
            if (W <= 0 || H <= 0) return
            tx = e.offsetX / W
            ty = 1 - e.offsetY / H
            over = 1
        }
        const onLeave = () => {
            over = 0
        }
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerleave", onLeave)

        let clock = 0
        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            clock = (clock + dt * (Math.max(0, Math.min(100, num(p.speed, 50))) / 50) * (reduced ? 0.25 : 1)) % 3600
            const k = 1 - Math.exp(-dt * 6)
            mx += (tx - mx) * k
            my += (ty - my) * k
            hov += (over - hov) * k
            const bg = parseColor(p.background, [0.03, 0.03, 0.04, 1])
            const base = parseColor(p.baseColor, [0.23, 0.18, 0.55, 1])
            const acc = parseColor(p.accentColor, [0.91, 0.42, 0.57, 1])
            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.uniform2f(u("uRes"), canvas.width, canvas.height)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform2f(u("uMouse"), mx, my)
            gl.uniform1f(u("uHover"), hov * (Math.max(0, Math.min(200, num(p.hover, 100))) / 100))
            gl.uniform3f(u("uBg"), bg[0], bg[1], bg[2])
            gl.uniform3f(u("uBase"), base[0], base[1], base[2])
            gl.uniform3f(u("uAccent"), acc[0], acc[1], acc[2])
            gl.uniform1f(u("uScale"), Math.max(10, Math.min(300, num(p.scale, 100))) / 100)
            effectUniforms(gl, u, p)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerleave", onLeave)
        }
    }, [])

    return (
        <div ref={rootRef} style={{ position: "relative", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}
