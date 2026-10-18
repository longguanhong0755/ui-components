"use client"

/**
 * About380Small — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
 *
 * Built on the Loader template (lib/templates/LoaderTemplate.tsx).
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

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    cycleMs: 3000,
    ringInner: 50,
    ringOuter: 80,
    spreadIn: 60,
    spreadOut: 20,
    arms: 12,
    armAmp: 6,
    armTwist: 120,
    spinRate: 12,
    kickLeadMs: 400,
    kickMs: 1100,
    kickVar: 60,
    swirlStartMs: 0,
    swirlEndMs: 1350,
    dimStartMs: 1700,
    dimEndMs: 2600,
    dimDepth: 45,
    dotOuter: 13,
    dotInner: 3,
    sizeVar: 60,
    teardrop: 100,
    hueLowPoint: 84,
    ringHueShift: 12,
    hueJitter: 12,
    hueLow: 2,
    hueHigh: 96,
    smallDim: 40,
    repelRadius: 30,
    repelStrength: 60,
    repelEase: 10,
    grain: 0,
    vignette: 0,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    dots?: number
    spread?: number
    swirl?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

interface Pt {
    x: number
    y: number
}

interface Dot {
    th: number
    b: number
    rj: number
    sp: number
    ph: number
    kv: number
    sz: number
    hj: number
}

interface Hover {
    x: number
    y: number
    in: boolean
}

interface Effect {
    grain: CanvasPattern | null
    dots: Dot[]
    cur: Pt
    prev: Pt
    hover: Hover | null
    mx: number
    my: number
    amt: number
    lastNow: number
}

const HOVERS = new WeakMap<HTMLCanvasElement, Hover>()

/** Pointer over the canvas in CSS px. Bound once per canvas; the listeners go with it. */
function hoverFor(canvas: HTMLCanvasElement): Hover {
    const hit = HOVERS.get(canvas)
    if (hit) return hit
    const st: Hover = { x: 0, y: 0, in: false }
    const move = (e: PointerEvent) => {
        st.x = e.offsetX
        st.y = e.offsetY
        st.in = true
    }
    const out = () => {
        st.in = false
    }
    canvas.addEventListener("pointermove", move)
    canvas.addEventListener("pointerdown", move)
    canvas.addEventListener("pointerleave", out)
    canvas.addEventListener("pointercancel", out)
    HOVERS.set(canvas, st)
    return st
}

const TAU = Math.PI * 2

function frac(v: number): number {
    return v - Math.floor(v)
}

function lerpN(a: number, b: number, t: number): number {
    return a + (b - a) * t
}

function clampInt(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, Math.round(v)))
}

/** sin² bump: 0 outside [start, end], 1 at the middle. */
function bump(t: number, start: number, end: number): number {
    const span = Math.max(1, end - start)
    if (t <= start || t >= end) return 0
    const s = Math.sin((Math.PI * (t - start)) / span)
    return s * s
}

/** Running integral of a sin² pulse over x in 0..1, normalised to end at 1. */
function cumBump(x: number): number {
    if (x <= 0) return 0
    if (x >= 1) return 1
    return x - Math.sin(TAU * x) / TAU
}

function hash01(i: number, k: number): number {
    let h = (Math.imul(i + 1, 374761393) + Math.imul(k + 1, 668265263)) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
}

/** Seeded particles, drawn small → large so the big dots sit on top. */
function buildDots(n: number): Dot[] {
    const out: Dot[] = []
    for (let i = 0; i < n; i++) {
        const b = Math.pow(hash01(i, 1), 0.7)
        out.push({
            th: hash01(i, 0) * TAU,
            b,
            rj: (hash01(i, 2) - 0.5) * 0.04,
            sp: hash01(i, 3) * 1.25 - 1,
            ph: hash01(i, 4) * TAU,
            kv: hash01(i, 5),
            sz: hash01(i, 6),
            hj: hash01(i, 7) - 0.5,
        })
    }
    out.sort((a, c) => a.b * (0.5 + a.sz) - c.b * (0.5 + c.sz))
    return out
}

const DEFAULT_COLORS = ["#1B1B1F", "#2F6BFF"]

/** Walks a ramp of n colour stops, t 0..1 across the whole list, into out (rgb 0..1). */
function sampleStops(stops: RGBA[], t: number, out: number[]): void {
    const n = stops.length
    if (n === 0) { out[0] = out[1] = out[2] = 1; return }
    if (n === 1) { out[0] = stops[0][0]; out[1] = stops[0][1]; out[2] = stops[0][2]; return }
    const tt = Math.max(0, Math.min(1, t)) * (n - 1)
    const i = Math.min(n - 2, Math.floor(tt))
    const f = tt - i
    out[0] = lerpN(stops[i][0], stops[i + 1][0], f)
    out[1] = lerpN(stops[i][1], stops[i + 1][1], f)
    out[2] = lerpN(stops[i][2], stops[i + 1][2], f)
}

function bakeEffect(stage: Stage, p: Props): Effect {
    let grain: CanvasPattern | null = null
    if (typeof document !== "undefined") {
        const c = document.createElement("canvas")
        c.width = 128
        c.height = 128
        const g = c.getContext("2d")
        if (g) {
            const img = g.createImageData(128, 128)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255
                img.data[i] = v
                img.data[i + 1] = v
                img.data[i + 2] = v
                img.data[i + 3] = 255
            }
            g.putImageData(img, 0, 0)
            grain = stage.ctx.createPattern(c, "repeat")
        }
    }
    const n = clampInt(num(p.dots, 520), 50, 1200)
    const hover = typeof document !== "undefined" ? hoverFor(stage.ctx.canvas) : null
    return { grain, dots: buildDots(n), cur: { x: 0, y: 0 }, prev: { x: 0, y: 0 }, hover, mx: 0, my: 0, amt: 0, lastNow: -1 }
}

const RGB_SCRATCH = [0, 0, 0]

/**
 * One frame. `clock` is seconds of speed-scaled time; `progress` is 0..1
 * (eased) or null when indeterminate. (cx, cy) is the centre, `size` the
 * loader's diameter in CSS px (800 = the frame's short side).
 */
function drawEffect(stage: Stage, fx: Effect, p: Props, cx: number, cy: number, size: number, clock: number, progress: number | null, dt: number): void {
    void dt
    const { ctx, W, H } = stage
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }

    const n = clampInt(num(p.dots, 520), 50, 1200)
    if (fx.dots.length !== n) fx.dots = buildDots(n)
    const spreadK = Math.max(0, Math.min(100, num(p.spread, 50))) / 50
    const kick = ((70 * Math.max(0, Math.min(100, num(p.swirl, 50)))) / 50) * (Math.PI / 180)

    const unit = Math.max(20, Math.min(W, H) * (size / 800))
    const half = unit / 2
    const Tms = Math.max(200, num(adv.cycleMs, 2850))
    const T = Tms / 1000
    const rIn = num(adv.ringInner, 55) / 100
    const rOut = num(adv.ringOuter, 88) / 100
    const spIn = num(adv.spreadIn, 24) / 100
    const spOut = num(adv.spreadOut, 5) / 100
    const arms = clampInt(num(adv.arms, 6), 0, 24)
    const armAmp = num(adv.armAmp, 6) / 100
    const armTwist = (num(adv.armTwist, 120) * Math.PI) / 180
    const spin = (num(adv.spinRate, 12) * Math.PI) / 180
    const lead = num(adv.kickLeadMs, 400) / 1000
    const kickMs = Math.max(50, num(adv.kickMs, 1100))
    const kickVar = Math.max(0, num(adv.kickVar, 60)) / 100
    const swS = num(adv.swirlStartMs, 0)
    const swE = num(adv.swirlEndMs, 1350)
    const dimS = num(adv.dimStartMs, 1700)
    const dimE = num(adv.dimEndMs, 2600)
    const dimDepth = Math.max(0, Math.min(100, num(adv.dimDepth, 45))) / 100
    const dotOuter = (unit * Math.max(1, num(adv.dotOuter, 13))) / 1000
    const dotInner = (unit * Math.max(1, num(adv.dotInner, 3))) / 1000
    const sizeVar = Math.max(0, Math.min(100, num(adv.sizeVar, 60))) / 100
    const tearK = (0.015 * Math.max(0, num(adv.teardrop, 100))) / 100
    const lowPt = Math.max(0.05, Math.min(0.95, num(adv.hueLowPoint, 84) / 100))
    const ringHueShift = num(adv.ringHueShift, 12) / 100
    const hueJitter = num(adv.hueJitter, 12) / 100
    const hueLow = num(adv.hueLow, 2) / 100
    const hueHigh = num(adv.hueHigh, 96) / 100
    const smallDim = Math.max(0, Math.min(100, num(adv.smallDim, 40))) / 100

    // Hover repel: real-time easing so it still responds at Speed 0.
    const now = typeof performance !== "undefined" ? performance.now() : 0
    const realDt = fx.lastNow < 0 ? 0 : Math.min(0.05, (now - fx.lastNow) / 1000)
    fx.lastNow = now
    const hv = fx.hover
    const over = !!hv && hv.in
    const ease = 1 - Math.exp(-Math.max(1, num(adv.repelEase, 10)) * realDt)
    if (hv && over) {
        if (fx.amt < 0.01) {
            fx.mx = hv.x
            fx.my = hv.y
        } else {
            fx.mx += (hv.x - fx.mx) * ease
            fx.my += (hv.y - fx.my) * ease
        }
    }
    fx.amt += ((over ? 1 : 0) - fx.amt) * ease
    const repR = Math.max(1, (unit * Math.max(0, num(adv.repelRadius, 30))) / 100)
    const repK = (Math.max(0, Math.min(100, num(adv.repelStrength, 60))) / 100) * fx.amt
    // Push ≤ half the radius with a (1 − d/R)² falloff: monotonic, so dots never cross.
    const repel = (pt: Pt) => {
        const dx = pt.x - fx.mx
        const dy = pt.y - fx.my
        const d = Math.hypot(dx, dy)
        if (d >= repR || d < 1e-3) return
        const f = 1 - d / repR
        const push = repK * repR * 0.5 * f * f
        pt.x += (dx / d) * push
        pt.y += (dy / d) * push
    }

    const u = frac(clock / T)
    const bright = 1 - dimDepth * bump(u * Tms, dimS, dimE)
    const LAG = 0.035

    const pos = (t: number, d: Dot, out: Pt) => {
        const uu = frac(t / T)
        const S = bump(uu * Tms, swS, swE) * spreadK
        const tk = t + lead
        const kc = Math.floor(tk / T) + cumBump((frac(tk / T) * Tms) / kickMs)
        const th = d.th + spin * t + kick * (1 + kickVar * (d.kv * 2 - 1)) * kc
        const off = d.sp < 0 ? d.sp * spIn : d.sp * 4 * spOut
        const ripple = armAmp * Math.sin(arms * d.th + armTwist * d.b + d.ph * 0.6)
        const r = Math.max(0.05, lerpN(rIn, rOut, d.b) + d.rj + S * (off + ripple)) * half
        out.x = cx + r * Math.cos(th)
        out.y = cy + r * Math.sin(th)
    }

    const cur = fx.cur
    const prev = fx.prev
    const dots = fx.dots
    // The dots cycle through a gradient every frame — that gradient now walks
    // the user-editable Colors array (previously a fixed, uncontrolled turbo
    // rainbow, then a fixed two-swatch lerp with no way to add more stops).
    const colorList = p.colors && p.colors.length ? p.colors : DEFAULT_COLORS
    const stops: RGBA[] = colorList.map((c) => parseColor(c, [1, 1, 1, 1]))
    for (let i = 0; i < dots.length; i++) {
        if (progress !== null && i / dots.length > progress) continue
        const d = dots[i]
        pos(clock, d, cur)
        pos(clock - LAG, d, prev)
        if (repK > 0.001) {
            repel(cur)
            repel(prev)
        }

        const rad = Math.max(0.5, lerpN(dotInner, dotOuter, d.b) * (1 + sizeVar * (d.sz * 2 - 1)))
        const sizeFrac = rad / Math.max(1e-3, dotOuter)

        const ph = frac(u + ringHueShift * (1 - d.b) + hueJitter * d.hj)
        const x = ph < lowPt ? 1 - ph / lowPt : (ph - lowPt) / (1 - lowPt)
        const mix = lerpN(hueLow, hueHigh, x)
        sampleStops(stops, mix, RGB_SCRATCH)
        const lum = bright * (1 - smallDim * (1 - Math.min(1, sizeFrac)))
        ctx.fillStyle = `rgb(${Math.round(RGB_SCRATCH[0] * 255 * lum)}, ${Math.round(RGB_SCRATCH[1] * 255 * lum)}, ${Math.round(RGB_SCRATCH[2] * 255 * lum)})`

        const vx = (cur.x - prev.x) / LAG
        const vy = (cur.y - prev.y) / LAG
        const L = Math.min(rad * 4, Math.hypot(vx, vy) * tearK)
        ctx.beginPath()
        if (L > rad * 1.25) {
            // Teardrop: round head leads, pointed tail trails along −velocity.
            const a = Math.atan2(-vy, -vx)
            const beta = Math.acos(Math.min(1, rad / L))
            ctx.moveTo(cur.x + Math.cos(a) * L, cur.y + Math.sin(a) * L)
            ctx.arc(cur.x, cur.y, rad, a + beta, a + TAU - beta, false)
            ctx.closePath()
        } else {
            ctx.arc(cur.x, cur.y, rad, 0, TAU)
        }
        ctx.fill()
    }

    const grain = Math.max(0, Math.min(100, num(adv.grain, 0))) / 100
    if (grain > 0 && fx.grain) {
        ctx.save()
        ctx.globalAlpha = grain * 0.35
        ctx.translate(Math.floor(Math.random() * 128), Math.floor(Math.random() * 128))
        ctx.fillStyle = fx.grain
        ctx.fillRect(-128, -128, W + 256, H + 256)
        ctx.restore()
    }
    const vig = Math.max(0, Math.min(100, num(adv.vignette, 0))) / 100
    if (vig > 0) {
        const outer = Math.max(1, Math.hypot(W, H) / 2)
        const g = ctx.createRadialGradient(W / 2, H / 2, outer * 0.35, W / 2, H / 2, outer)
        g.addColorStop(0, "rgba(0, 0, 0, 0)")
        g.addColorStop(1, `rgba(0, 0, 0, ${vig})`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
    }
}

// ══ /EFFECT ═════════════════════════════════════════════════════════════════

interface Props extends EffectProps {
    background?: string
    colors?: string[]
    size?: number
    speed?: number
    /** 0–100 for a determinate loader; omit for indeterminate. No panel row. */
    progress?: number
    style?: CSSProperties
}
interface Stage {
    ctx: CanvasRenderingContext2D
    W: number
    H: number
    dpr: number
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

export default function About380Small(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", colors = ["#D800FF","#2F6BFF","#FF0000","#00FF55","#00FFDC","#FFFB00","#4600FF"], size = 562, speed = 50, style } = props
    void [colors, size, speed] // read live via propsRef in the raf loop; these mirror the defaults for the panel
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!root || !canvas || !ctx) return
        const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const stage: Stage = { ctx, W: 0, H: 0, dpr: 1 }
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

        let fx: Effect | null = null
        let key = ""
        let shown = 0
        let clock = 0
        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const next = JSON.stringify([stage.W, stage.H, stage.dpr])
            if (next !== key || !fx) {
                key = next
                fx = bakeEffect(stage, p)
            }
            const rate = (Math.max(0, Math.min(100, num(p.speed, 50))) / 50) * (reduced ? 0.25 : 1)
            const animDt = dt * rate
            clock += animDt
            const target = typeof p.progress === "number" && Number.isFinite(p.progress) ? Math.max(0, Math.min(1, p.progress / 100)) : null
            if (target !== null) shown += (target - shown) * (1 - Math.exp(-8 * dt))
            const sz = Math.max(20, Math.min(800, num(p.size, 160)))
            ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0)
            ctx.clearRect(0, 0, stage.W, stage.H)
            drawEffect(stage, fx, p, stage.W / 2, stage.H / 2, sz, clock, target === null ? null : shown, animDt)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
        }
    }, [])

    return (
        <div ref={rootRef} role="progressbar" aria-busy="true" style={{ position: "relative", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}
