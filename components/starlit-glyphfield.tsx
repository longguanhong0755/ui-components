"use client"

/**
 * TakeTextInput — take text input
 *
 * Built on the Text template (lib/templates/TextTemplate.tsx).
 * Only the EFFECT block and the effect controls are specific to this component.
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

// ══ EFFECT — replace from here ══════════════════════════════════════════════

const PLAY_S = 2
const RESTORE_S = 1.2
const DEFAULT_TEXT = "S"
const DEFAULT_FONT: FramerFont = { fontFamily: "Inter", fontWeight: 900, fontSize: 160, lineHeight: 1.05 }

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    cellPct: 45,
    glyphRows: 9,
    tracking: 1,
    lineGap: 1,
    margin: 1,
    outline: 40,
    core: 85,
    jitter: 15,
    seed: 7,
    waveWidth: 100,
    pulse: 70,
    field: 25,
    waveAngle: 173,
    lineColor: "#1E1C1C",
    lineWidth: 1,
    lineOpacity: 100,
    reach: 3,
    pressMs: 250,
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
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced","lineColor":"advanced"}}
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

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    sparkle?: string
    tile?: string
    rounded?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

interface Effect {
    cols: number
    rows: number
    base: Float32Array
    delay: Float32Array
    rad: Float32Array
    cell: number
    gx: number
    gy: number
    round: number
    sparkle: string
    tile: string
    line: string
    adv: typeof ADVANCED_DEFAULTS
    noise: HTMLCanvasElement
    pattern: CanvasPattern | null
    press: number
    last: number
}

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v
}

function smooth(lo: number, hi: number, x: number): number {
    const u = clamp01((x - lo) / Math.max(1e-4, hi - lo))
    return u * u * (3 - 2 * u)
}

function easeInOutCubic(u: number): number {
    return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
}

/** Stable 0..1 hash per grid vertex. */
function vertexHash(i: number, j: number, seed: number): number {
    let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(j + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(seed + 1, 0x27d4eb2f)
    h ^= h >>> 15
    h = Math.imul(h, 0x2c1b3c6d)
    h ^= h >>> 12
    h = Math.imul(h, 0x297a2d39)
    h ^= h >>> 15
    return (h >>> 0) / 4294967296
}

/** A cell-sized tile with its own radius on each corner (device px). */
function tilePath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tl: number, tr: number, br: number, bl: number) {
    ctx.moveTo(x + tl, y)
    ctx.lineTo(x + w - tr, y)
    if (tr > 0.01) ctx.arc(x + w - tr, y + tr, tr, -Math.PI / 2, 0)
    ctx.lineTo(x + w, y + h - br)
    if (br > 0.01) ctx.arc(x + w - br, y + h - br, br, 0, Math.PI / 2)
    ctx.lineTo(x + bl, y + h)
    if (bl > 0.01) ctx.arc(x + bl, y + h - bl, bl, Math.PI / 2, Math.PI)
    ctx.lineTo(x, y + tl)
    if (tl > 0.01) ctx.arc(x + tl, y + tl, tl, Math.PI, Math.PI * 1.5)
    ctx.closePath()
}

/**
 * Rasterises the text on the cell grid and gives every grid point a star size from where it sits in
 * the stroke: full stars on the stroke's spine, small ones on the outline, none outside.
 */
function bakeEffect(stage: Stage, _mask: GlyphMask, p: Props): Effect {
    const a = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const W = Math.max(1, stage.W)
    const H = Math.max(1, stage.H)
    const font = p.font || DEFAULT_FONT
    const S = 12
    const P = 2
    const capRows = Math.max(3, Math.min(40, Math.round(num(a.glyphRows, 9))))
    const track = Math.max(0, num(a.tracking, 1)) * S
    const gap = Math.max(0, Math.round(num(a.lineGap, 1)))
    const shorthand = (size: number) => fontShorthand({ ...font, fontSize: size }, size, 800).shorthand
    const probe = document.createElement("canvas").getContext("2d")!
    probe.font = shorthand(100)
    const capH = probe.measureText("H").actualBoundingBoxAscent || 72
    const size = (100 * capRows * S) / Math.max(1, capH)
    probe.font = shorthand(size)
    probe.textBaseline = "alphabetic"

    interface Line { items: { ch: string; x: number }[]; cols: number; asc: number; desc: number }
    const lines: Line[] = String(p.text ?? DEFAULT_TEXT).split("\n").map((raw) => {
        const items: { ch: string; x: number }[] = []
        let x = 0, asc = 0, desc = 0
        for (const ch of raw.trim()) {
            const m = probe.measureText(ch)
            if (!ch.trim()) {
                if (items.length) x += m.width
                continue
            }
            if (items.length) x += track
            const l = m.actualBoundingBoxLeft
            const r = m.actualBoundingBoxRight
            items.push({ ch, x: x + l })
            x += l + r
            asc = Math.max(asc, m.actualBoundingBoxAscent)
            desc = Math.max(desc, m.actualBoundingBoxDescent)
        }
        return {
            items,
            cols: items.length ? Math.max(1, Math.ceil(x / S - 0.15)) : 0,
            asc: Math.max(capRows, Math.ceil(asc / S - 0.25)),
            desc: Math.max(0, Math.ceil(desc / S - 0.35)),
        }
    })
    const bc = Math.max(1, Math.min(1200, ...lines.map((l) => l.cols)))
    const br = Math.max(1, lines.reduce((s, l) => s + l.asc + l.desc, 0) + gap * (lines.length - 1))

    // Raster with a padding of P cells, so grid points just outside the glyph read as outside.
    const RW = (bc + 2 * P) * S
    const RH = (br + 2 * P) * S
    const rc = document.createElement("canvas")
    rc.width = RW
    rc.height = RH
    const rx = rc.getContext("2d")!
    rx.font = shorthand(size)
    rx.fillStyle = "#fff"
    rx.textAlign = "left"
    rx.textBaseline = "alphabetic"
    let top = P * S
    for (const line of lines) {
        const lx = (P + Math.floor((bc - line.cols) / 2)) * S
        const baseY = top + line.asc * S
        for (const it of line.items) rx.fillText(it.ch, lx + it.x, baseY)
        top += (line.asc + line.desc + gap) * S
    }
    const px = rx.getImageData(0, 0, RW, RH).data
    const inA = new Float32Array(RW * RH)
    const outA = new Float32Array(RW * RH)
    for (let i = 0; i < RW * RH; i++) {
        const al = px[i * 4 + 3] / 255
        inA[i] = al
        outA[i] = 1 - al
    }
    const dIn = distanceInside(inA, RW, RH)
    const dOut = distanceInside(outA, RW, RH)
    // Signed distance (cells, + inside) at a box grid point: mean of the four pixels meeting there.
    const sdAt = (bi: number, bj: number): number => {
        const x = (bi + P) * S
        const y = (bj + P) * S
        if (x < 1 || y < 1 || x >= RW || y >= RH) return -9
        const k0 = (y - 1) * RW + x - 1
        const k1 = k0 + 1
        const k2 = y * RW + x - 1
        const k3 = k2 + 1
        const s = dIn[k0] - dOut[k0] + dIn[k1] - dOut[k1] + dIn[k2] - dOut[k2] + dIn[k3] - dOut[k3]
        return s / 4 / S
    }

    // Cell pitch follows the Font's size; shrinks so the whole text fits with a margin.
    const m = Math.max(0, num(a.margin, 1))
    const fsize = fontShorthand(font, 160, 800).size
    let cell = Math.max(4, Math.round((fsize * Math.max(1, num(a.cellPct, 45))) / 100))
    const fit = Math.floor(Math.min(W / (bc + 2 * m), H / (br + 2 * m)))
    if (fit < cell) cell = Math.max(4, fit)
    const bx = Math.round((W - bc * cell) / 2)
    const by = Math.round((H - br * cell) / 2)

    // The grid covers the whole frame, so the field around the text is live too.
    const padL = Math.max(0, Math.ceil(bx / cell))
    const padT = Math.max(0, Math.ceil(by / cell))
    const padR = Math.max(0, Math.ceil((W - bx - bc * cell) / cell))
    const padB = Math.max(0, Math.ceil((H - by - br * cell) / cell))
    const cols = bc + padL + padR
    const rows = br + padT + padB
    const gx = bx - padL * cell
    const gy = by - padT * cell

    // Every corner meeting at a grid point shares one radius: four rounded corners leave a star.
    const V = (cols + 1) * (rows + 1)
    const base = new Float32Array(V)
    const delay = new Float32Array(V)
    const lo = -Math.max(0, num(a.outline, 40)) / 100
    const hi = Math.max(lo + 0.05, Math.max(0, num(a.core, 85)) / 100)
    const jit = clamp01(num(a.jitter, 15) / 100)
    const seed = Math.round(num(a.seed, 7))
    const ang = (num(a.waveAngle, 45) * Math.PI) / 180
    const dx = Math.cos(ang), dy = Math.sin(ang)
    let pMin = Infinity, pMax = -Infinity
    for (let j = 0; j <= rows; j++)
        for (let i = 0; i <= cols; i++) {
            const k = j * (cols + 1) + i
            const pr = i * dx + j * dy
            delay[k] = pr
            if (pr < pMin) pMin = pr
            if (pr > pMax) pMax = pr
            const bi = i - padL, bj = j - padT
            if (bi < -P + 1 || bj < -P + 1 || bi > bc + P - 1 || bj > br + P - 1) continue
            let b = smooth(lo, hi, sdAt(bi, bj))
            b *= 1 - jit * vertexHash(bi, bj, seed)
            base[k] = b < 0.04 ? 0 : b
        }
    const span = Math.max(1e-4, pMax - pMin)
    for (let k = 0; k < V; k++) delay[k] = clamp01((delay[k] - pMin) / span)

    const noise = document.createElement("canvas")
    noise.width = 96
    noise.height = 96
    const nx = noise.getContext("2d")!
    const nd = nx.createImageData(96, 96)
    for (let i = 0; i < 96 * 96; i++) {
        const v = Math.random() < 0.5 ? 0 : 255
        nd.data[i * 4] = v
        nd.data[i * 4 + 1] = v
        nd.data[i * 4 + 2] = v
        nd.data[i * 4 + 3] = Math.floor(Math.random() * 255)
    }
    nx.putImageData(nd, 0, 0)

    return {
        cols, rows, base, delay,
        rad: new Float32Array(V),
        cell, gx, gy,
        round: clamp01(num(p.rounded, 100) / 100),
        sparkle: cssRgba(parseColor(p.sparkle, [1, 1, 1, 1])),
        tile: cssRgba(parseColor(p.background, [0, 0, 0, 1])),
        line: cssRgba(parseColor(a.lineColor, [0.6, 0.6, 0.6, 1])),
        adv: a,
        noise,
        pattern: null,
        press: 0,
        last: -1,
    }
}

/**
 * t 0→1: a diagonal wave runs across the grid. Glyph stars swell toward full as it passes, faint stars
 * open across the empty field, and everything settles back, so rest and hold show the glyph.
 * Pointer: stars within `reach` cells of stage.pointer open while it is over; pressing flips them.
 */
function drawEffect(stage: Stage, _mask: GlyphMask, fx: Effect, t: number, _phase: Phase): void {
    const ctx = stage.ctx
    const dpr = stage.dpr
    const W = stage.W
    const H = stage.H
    const px = stage.pointer.x
    const py = stage.pointer.y
    const over = stage.pointer.over
    const down = stage.pointer.down
    const adv = fx.adv
    const now = performance.now()
    const dt = fx.last < 0 ? 0 : Math.min((now - fx.last) / 1000, 0.05)
    fx.last = now
    const pressS = Math.max(0.02, num(adv.pressMs, 250) / 1000)
    fx.press += ((down ? 1 : 0) - fx.press) * (1 - Math.exp((-dt * 4.6) / pressS))

    const { cols, rows, cell, gx, gy, base, delay, rad } = fx
    const k = Math.max(0, num(adv.hover, 50)) / 50
    const w = Math.max(0.05, Math.min(1, num(adv.waveWidth, 40) / 100))
    const pulse = clamp01(num(adv.pulse, 70) / 100)
    const field = clamp01(num(adv.field, 25) / 100)
    const reach = Math.max(0.5, num(adv.reach, 2))
    const live = k > 0 && (over > 0.001 || fx.press > 0.001)
    for (let j = 0; j <= rows; j++)
        for (let i = 0; i <= cols; i++) {
            const v = j * (cols + 1) + i
            const b = base[v]
            const u = easeInOutCubic(clamp01((t - delay[v] * (1 - w)) / w))
            const bump = Math.sin(Math.PI * u)
            let r = b + (1 - b) * (b > 0 ? pulse : field) * bump
            if (live) {
                const d = Math.hypot((gx + i * cell - px) / cell, (gy + j * cell - py) / cell)
                if (d < reach) {
                    const s = 1 - d / reach
                    const infl = s * s * (3 - 2 * s)
                    const o = Math.min(1, infl * over * k)
                    r += (1 - r) * o
                    const pb = Math.min(1, infl * fx.press * k)
                    r += (1 - 2 * r) * pb
                }
            }
            rad[v] = clamp01(r)
        }

    const DW = ctx.canvas.width
    const DH = ctx.canvas.height
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = "source-over"
    ctx.fillStyle = fx.tile
    ctx.fillRect(0, 0, DW, DH)

    // Device-px cell edges, so neighbouring tiles meet without seams.
    const ex: number[] = []
    const ey: number[] = []
    for (let i = 0; i <= cols; i++) ex.push(Math.round((gx + i * cell) * dpr))
    for (let j = 0; j <= rows; j++) ey.push(Math.round((gy + j * cell) * dpr))

    const stride = cols + 1
    const rounded = (r: number, c: number) => {
        const v = r * stride + c
        return rad[v] > 0.002 || rad[v + 1] > 0.002 || rad[v + stride] > 0.002 || rad[v + stride + 1] > 0.002
    }

    ctx.beginPath()
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (rounded(r, c)) ctx.rect(ex[c], ey[r], ex[c + 1] - ex[c], ey[r + 1] - ey[r])
    ctx.fillStyle = fx.sparkle
    ctx.fill()

    ctx.beginPath()
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
            if (!rounded(r, c)) continue
            const x = ex[c], y = ey[r]
            const cw = ex[c + 1] - x, ch = ey[r + 1] - y
            const R = 0.5 * Math.min(cw, ch) * fx.round
            const v = r * stride + c
            tilePath(ctx, x, y, cw, ch, rad[v] * R, rad[v + 1] * R, rad[v + stride + 1] * R, rad[v + stride] * R)
        }
    ctx.fillStyle = fx.tile
    ctx.fill()

    // Grid lines over everything; "lighten" keeps them out of the light gaps.
    const lwCss = Math.max(0, num(adv.lineWidth, 1))
    if (lwCss > 0 && num(adv.lineOpacity, 100) > 0) {
        const lw = Math.max(1, Math.round(lwCss * dpr))
        ctx.globalCompositeOperation = "lighten"
        ctx.globalAlpha = clamp01(num(adv.lineOpacity, 100) / 100)
        ctx.fillStyle = fx.line
        for (let q = Math.floor(-gx / cell); q <= Math.ceil((W - gx) / cell); q++)
            ctx.fillRect(Math.round((gx + q * cell) * dpr) - Math.floor(lw / 2), 0, lw, DH)
        for (let q = Math.floor(-gy / cell); q <= Math.ceil((H - gy) / cell); q++)
            ctx.fillRect(0, Math.round((gy + q * cell) * dpr) - Math.floor(lw / 2), DW, lw)
    }

    ctx.globalCompositeOperation = "source-over"
    const grain = clamp01(num(adv.grain, 0) / 100)
    if (grain > 0) {
        if (!fx.pattern) fx.pattern = ctx.createPattern(fx.noise, "repeat")
        if (fx.pattern) {
            const ox = Math.floor(Math.random() * 96), oy = Math.floor(Math.random() * 96)
            ctx.setTransform(1, 0, 0, 1, ox, oy)
            ctx.globalAlpha = grain * 0.6
            ctx.fillStyle = fx.pattern
            ctx.fillRect(-ox, -oy, DW, DH)
            ctx.setTransform(1, 0, 0, 1, 0, 0)
        }
    }
    const vig = clamp01(num(adv.vignette, 0) / 100)
    if (vig > 0) {
        const R = Math.max(DW, DH) * 0.75
        const g = ctx.createRadialGradient(DW / 2, DH / 2, R * 0.35, DW / 2, DH / 2, R)
        g.addColorStop(0, "rgba(0, 0, 0, 0)")
        g.addColorStop(1, `rgba(0, 0, 0, ${vig * 0.85})`)
        ctx.globalAlpha = 1
        ctx.fillStyle = g
        ctx.fillRect(0, 0, DW, DH)
    }
    ctx.restore()
}

// ══ /EFFECT ═════════════════════════════════════════════════════════════════

interface Props extends EffectProps {
    background?: string
    speed?: number
    hold?: number
    text?: string
    font?: FramerFont
    play?: boolean
    onComplete?: () => void
    style?: CSSProperties
}
interface Stage {
    ctx: CanvasRenderingContext2D
    W: number
    H: number
    dpr: number
    /**
     * The pointer over the stage, for the effect's pointer response (RULES.md):
     * x, y in CSS px; `over` eases to 1 while it is over the stage and back to 0
     * after; `down` while pressed. Scale the response by the Advanced `hover` row.
     */
    pointer: StagePointer
}
interface StagePointer {
    x: number
    y: number
    over: number
    down: boolean
}
/** Cropped glyph mask in DEVICE px: `canvas` is w×h, placed at (x, y) on the stage canvas. */
interface GlyphMask {
    canvas: HTMLCanvasElement
    alpha: Float32Array
    x: number
    y: number
    w: number
    h: number
    fontPx: number
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

/** Chamfer distance (device px) from each inside pixel (alpha > 0.5) to the nearest outside pixel. */
function distanceInside(a: Float32Array, w: number, h: number): Float32Array {
    const d = new Float32Array(w * h)
    for (let i = 0; i < w * h; i++) d[i] = a[i] > 0.5 ? 1e9 : 0
    const D2 = Math.SQRT2
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const i = y * w + x
            if (d[i] === 0) continue
            let v = d[i]
            if (x > 0) v = Math.min(v, d[i - 1] + 1)
            if (y > 0) {
                v = Math.min(v, d[i - w] + 1)
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
            if (x < w - 1) v = Math.min(v, d[i + 1] + 1)
            if (y < h - 1) {
                v = Math.min(v, d[i + w] + 1)
                if (x < w - 1) v = Math.min(v, d[i + w + 1] + D2)
                if (x > 0) v = Math.min(v, d[i + w - 1] + D2)
            }
            d[i] = v
        }
    return d
}
void distanceInside

function buildMask(W: number, H: number, dpr: number, text: string, font: FramerFont): GlyphMask {
    const full = document.createElement("canvas")
    full.width = Math.max(1, Math.round(W * dpr))
    full.height = Math.max(1, Math.round(H * dpr))
    const ctx = full.getContext("2d")!
    const size0 = num(DEFAULT_FONT.fontSize, 160)
    let f = fontShorthand(font, size0, 700)
    ctx.font = f.shorthand
    const raw = String(text ?? "").split("\n")
    const widest = Math.max(1, ...raw.map((l) => ctx.measureText(l).width))
    const fit = Math.min(1, (W * 0.86) / widest, (H * 0.8) / (f.lineHeight * raw.length))
    if (fit < 1) f = fontShorthand({ ...font, fontSize: f.size * fit, lineHeight: f.lineHeight / f.size }, size0, 700)
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
    const x1 = Math.min(full.width, Math.ceil((W / 2 + W * 0.47) * dpr))
    const y1 = Math.min(full.height, Math.ceil((top + f.lineHeight * raw.length) * dpr) + pad)
    const w = Math.max(1, x1 - x0)
    const h = Math.max(1, y1 - y0)
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    canvas.getContext("2d")!.drawImage(full, x0, y0, w, h, 0, 0, w, h)
    const px = canvas.getContext("2d")!.getImageData(0, 0, w, h).data
    const alpha = new Float32Array(w * h)
    for (let i = 0; i < w * h; i++) alpha[i] = px[i * 4 + 3] / 255
    return { canvas, alpha, x: x0, y: y0, w, h, fontPx: f.size }
}

export default function TakeTextInput(props: Props) {
    props = withMovedControls(props)
    // speed / hold are read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", speed = 20, hold = 4, style } = props
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
        void onCanvas
        const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const stage: Stage = { ctx, W: 0, H: 0, dpr: 1, pointer: { x: 0, y: 0, over: 0, down: false } }
        const resize = () => {
            stage.W = root.offsetWidth
            stage.H = root.offsetHeight
            stage.dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.round(stage.W * stage.dpr))
            canvas.height = Math.max(1, Math.round(stage.H * stage.dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        // The pointer, for the effect's pointer response. offsetX/Y, never
        // getBoundingClientRect: that carries the canvas zoom.
        let pointerInside = false
        const onPointerMove = (e: PointerEvent) => {
            stage.pointer.x = e.offsetX
            stage.pointer.y = e.offsetY
            pointerInside = true
        }
        const onPointerLeave = () => {
            pointerInside = false
            stage.pointer.down = false
        }
        const onPointerDown = () => {
            stage.pointer.down = true
        }
        const onPointerUp = () => {
            stage.pointer.down = false
        }
        canvas.addEventListener("pointermove", onPointerMove)
        canvas.addEventListener("pointerenter", onPointerMove)
        canvas.addEventListener("pointerleave", onPointerLeave)
        canvas.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointerup", onPointerUp)
        window.addEventListener("pointercancel", onPointerUp)

        let mask: GlyphMask | null = null
        let fx: Effect | null = null
        let key = ""
        let fontTick = 0
        const loadedFonts = new Set<string>()
        const sync = () => {
            const p = propsRef.current
            const font = p.font || DEFAULT_FONT
            const text = p.text ?? DEFAULT_TEXT
            const effectKeys = Object.keys(p).filter((n) => !["text", "font", "style", "play", "onComplete", "speed", "hold"].includes(n))
            const next = JSON.stringify([text, font, stage.W, stage.H, stage.dpr, fontTick, effectKeys.map((n) => (p as Record<string, unknown>)[n])])
            if (next === key && fx) return
            key = next
            const sh = fontShorthand(font, 160, 700).shorthand
            if (!loadedFonts.has(sh) && document.fonts?.load) {
                loadedFonts.add(sh)
                document.fonts.load(sh).then(() => fontTick++, () => {})
            }
            mask = buildMask(stage.W, stage.H, stage.dpr, text, font)
            fx = bakeEffect(stage, mask, p)
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
            stage.pointer.over += ((pointerInside ? 1 : 0) - stage.pointer.over) * (1 - Math.exp(-8 * dt))
            last = now
            sync()
            const p = propsRef.current
            const r = stepTrigger(state, {
                dt,
                animDt: dt * (Math.max(0, Math.min(100, num(p.speed, 50))) / 50),
                playDur: reduced ? 0.2 : PLAY_S,
                restoreDur: reduced ? 0.2 : RESTORE_S,
                holdS: Math.max(0, Math.min(10, num(p.hold, 2))),
                play: p.play,
                clicked,
                // Autoplay everywhere, not only on the Framer canvas: the wave replays 1 s after each restore.
                onCanvas: true,
            })
            clicked = false
            state = r.s
            if (r.e.completed) p.onComplete?.()
            const t = state.phase === "playing" ? state.t : state.phase === "held" ? 1 : state.phase === "restoring" ? 1 - state.t : 0
            ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0)
            ctx.clearRect(0, 0, stage.W, stage.H)
            if (mask && fx) drawEffect(stage, mask, fx, t, state.phase)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", onPointerMove)
            canvas.removeEventListener("pointerenter", onPointerMove)
            canvas.removeEventListener("pointerleave", onPointerLeave)
            canvas.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointerup", onPointerUp)
            window.removeEventListener("pointercancel", onPointerUp)
            ro.disconnect()
            canvas.removeEventListener("pointerdown", onDown)
        }
    }, [])

    return (
        <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", cursor: "pointer" }} />
        </div>
    )
}

// Control order arranged in the builder.
