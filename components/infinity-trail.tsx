"use client"

/**
 * LoaderComponentLooped — this is a loader component, looped
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
    periodMs: 2610,
    startPct: 19,
    easePct: 0,
    offsetY: 3,
    lobeRatio: 44,
    headWidth: 57,
    tailWidth: 5,
    taperPow: 98,
    fadePow: 128,
    coreTint: 55,
    coreWidth: 55,
    innerGlowR: 182,
    innerGlow: 90,
    bloomR: 1984,
    bloom: 0,
    haloRadius: 200,
    haloAlpha: 25,
    haloFollow: 40,
    lobeWash: 17,
    hueSoft: 73,
    trackColor: "#5F7E9A",
    trackOpacity: 10,
    sparkCount: 6,
    sparkMs: 150,
    sparkLifeMs: 1050,
    sparkDrift: 5,
    sparkSize: 4,
    labelOffset: 40,
    labelSize: 6,
    labelWeight: 600,
    labelColor: "#5F7E9A",
    labelOpacity: 60,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    trail?: number
    glow?: number
    label?: string
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/** Arc-length resampled ∞ path in unit coords (x in −1..1), starting at the crossing. */
interface InfPath {
    key: number
    px: Float32Array
    py: Float32Array
    nx: Float32Array
    ny: Float32Array
    len: number
}

interface InfSpark {
    x: number
    y: number
    vx: number
    vy: number
    age: number
    life: number
}

interface Effect {
    sprite: HTMLCanvasElement | null
    tint: HTMLCanvasElement | null
    tctx: CanvasRenderingContext2D | null
    path: InfPath | null
    sparks: InfSpark[]
    sparkT: number
    xs: Float32Array
    ys: Float32Array
}

const INF_M = 600
const INF_K = 140
const INF_SPRITE = 128
const INF_PT = { x: 0, y: 0, nx: 0, ny: 0 }

function clampN(v: unknown, d: number, lo: number, hi: number): number {
    const n = typeof v === "number" && Number.isFinite(v) ? v : d
    return Math.max(lo, Math.min(hi, n))
}

function smoothstepN(a: number, b: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - a) / Math.max(1e-4, b - a)))
    return t * t * (3 - 2 * t)
}

function mixRGB(a: RGBA, b: RGBA, t: number): RGBA {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 1]
}

function mixPalette(palette: RGBA[], t: number): RGBA {
    if (palette.length === 1) return palette[0]
    const tt = Math.max(0, Math.min(1, t)) * (palette.length - 1)
    const i = Math.min(palette.length - 2, Math.floor(tt))
    return mixRGB(palette[i], palette[i + 1], tt - i)
}

function rgbaStr(c: RGBA, a: number): string {
    const al = Math.max(0, Math.min(1, a))
    return `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${al.toFixed(4)})`
}

/**
 * Lemniscate of Bernoulli, x = cos t / (1 + sin²t), y = −k·sin t·cos t / (1 + sin²t),
 * stretched vertically so height/width = ratio. t runs π/2 → −3π/2, so s = 0 is the
 * crossing heading up-right: right lobe clockwise, then left lobe anticlockwise.
 */
function buildInfPath(ratio: number): InfPath {
    const N = 1440
    const k = ratio / 0.35355339
    const rx = new Float64Array(N + 1)
    const ry = new Float64Array(N + 1)
    const cum = new Float64Array(N + 1)
    for (let i = 0; i <= N; i++) {
        const t = Math.PI / 2 - (Math.PI * 2 * i) / N
        const s = Math.sin(t)
        const c = Math.cos(t)
        const d = 1 + s * s
        rx[i] = c / d
        ry[i] = (-k * s * c) / d
        if (i > 0) cum[i] = cum[i - 1] + Math.hypot(rx[i] - rx[i - 1], ry[i] - ry[i - 1])
    }
    const total = cum[N]
    const px = new Float32Array(INF_M)
    const py = new Float32Array(INF_M)
    const nx = new Float32Array(INF_M)
    const ny = new Float32Array(INF_M)
    let i = 0
    for (let j = 0; j < INF_M; j++) {
        const target = (total * j) / INF_M
        while (i < N - 1 && cum[i + 1] < target) i++
        const f = (target - cum[i]) / Math.max(1e-9, cum[i + 1] - cum[i])
        px[j] = rx[i] + (rx[i + 1] - rx[i]) * f
        py[j] = ry[i] + (ry[i + 1] - ry[i]) * f
    }
    for (let j = 0; j < INF_M; j++) {
        const a = (j - 1 + INF_M) % INF_M
        const b = (j + 1) % INF_M
        const dx = px[b] - px[a]
        const dy = py[b] - py[a]
        const l = Math.hypot(dx, dy) || 1
        nx[j] = -dy / l
        ny[j] = dx / l
    }
    return { key: ratio, px, py, nx, ny, len: total }
}

function infSample(path: InfPath, s: number): void {
    const f = (s - Math.floor(s)) * INF_M
    let j = Math.floor(f)
    if (j >= INF_M) j = 0
    const fr = f - j
    const b = (j + 1) % INF_M
    INF_PT.x = path.px[j] + (path.px[b] - path.px[j]) * fr
    INF_PT.y = path.py[j] + (path.py[b] - path.py[j]) * fr
    INF_PT.nx = path.nx[j]
    INF_PT.ny = path.ny[j]
}

function bakeEffect(_stage: Stage, _p: Props): Effect {
    let sprite: HTMLCanvasElement | null = null
    let tint: HTMLCanvasElement | null = null
    let tctx: CanvasRenderingContext2D | null = null
    if (typeof document !== "undefined") {
        sprite = document.createElement("canvas")
        sprite.width = INF_SPRITE
        sprite.height = INF_SPRITE
        const sc = sprite.getContext("2d")
        if (sc) {
            const r = INF_SPRITE / 2
            const g = sc.createRadialGradient(r, r, 0, r, r, r)
            g.addColorStop(0, "rgba(255,255,255,1)")
            g.addColorStop(0.2, "rgba(255,255,255,0.75)")
            g.addColorStop(0.45, "rgba(255,255,255,0.3)")
            g.addColorStop(0.7, "rgba(255,255,255,0.08)")
            g.addColorStop(1, "rgba(255,255,255,0)")
            sc.fillStyle = g
            sc.fillRect(0, 0, INF_SPRITE, INF_SPRITE)
        } else sprite = null
        tint = document.createElement("canvas")
        tint.width = INF_SPRITE
        tint.height = INF_SPRITE
        tctx = tint.getContext("2d")
        if (!tctx) tint = null
    }
    return {
        sprite,
        tint,
        tctx,
        path: null,
        sparks: [],
        sparkT: 0,
        xs: new Float32Array(INF_K + 1),
        ys: new Float32Array(INF_K + 1),
    }
}

/**
 * One frame. `clock` is seconds of speed-scaled time; `progress` is 0..1
 * (eased) or null when indeterminate. (cx, cy) is the centre, `size` the
 * width of the ∞ in CSS px.
 */
function drawEffect(stage: Stage, fx: Effect, p: Props, cx: number, cy: number, size: number, clock: number, progress: number | null, dt: number): void {
    const { ctx, W, H } = stage
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }

    const ratio = clampN(adv.lobeRatio, 44, 10, 100) / 100
    if (!fx.path || fx.path.key !== ratio) fx.path = buildInfPath(ratio)
    const path = fx.path
    const half = size / 2
    const oy = cy + (H * clampN(adv.offsetY, 3, -50, 50)) / 100

    const palette = (Array.isArray(p.colors) && p.colors.length > 0 ? p.colors : ["#6A5CFF", "#4FD6E0"]).map((c) =>
        parseColor(c, [0.42, 0.36, 1, 1])
    )
    const white: RGBA = [0.976, 0.992, 0.992, 1]
    const trail = clampN(p.trail, 55, 10, 90) / 100
    const glow = clampN(p.glow, 60, 0, 100) / 60
    const start = clampN(adv.startPct, 8, 0, 100) / 100

    // Head position along the path (0..1 = one lap, 0 = crossing).
    let head: number
    let len: number
    if (progress === null) {
        const period = clampN(adv.periodMs, 2800, 100, 20000) / 1000
        const ph = clock / period + start
        const e = clampN(adv.easePct, 15, 0, 90) / 100
        // ds/dphase = 1 + e·cos(4π·phase): fastest through the crossing, slowest at the lobe ends.
        head = ph + (e / (4 * Math.PI)) * Math.sin(4 * Math.PI * ph)
        len = trail
    } else {
        head = start + progress
        len = Math.max(0.004, Math.min(0.999, progress))
    }

    // Sample the comet from head (k = 0) back to tail end (k = K); hue follows the trail's centroid.
    const xs = fx.xs
    const ys = fx.ys
    let sx = 0
    let sw = 0
    let rw = 0
    for (let k = 0; k <= INF_K; k++) {
        const u = k / INF_K
        infSample(path, head - u * len)
        xs[k] = cx + INF_PT.x * half
        ys[k] = oy + INF_PT.y * half
        const w = 1 - 0.5 * u
        sx += INF_PT.x * w
        sw += w
        if (INF_PT.x > 0) rw += w
    }
    const soft = Math.max(0.05, clampN(adv.hueSoft, 45, 1, 100) / 100)
    const m = smoothstepN(-soft, soft, sx / Math.max(1e-4, sw))
    const col = mixPalette(palette, m)
    const rightFrac = rw / Math.max(1e-4, sw)
    const hx = xs[0]
    const hy = ys[0]

    const headW = Math.max(1, (size * clampN(adv.headWidth, 57, 1, 300)) / 1000)
    const tailW = Math.max(0.3, (size * clampN(adv.tailWidth, 5, 0, 300)) / 1000)

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = "source-over"

    // Halo: large radial wash, drifts toward the head.
    const follow = clampN(adv.haloFollow, 40, 0, 100) / 100
    const hcx = cx + (hx - cx) * follow
    const hcy = oy + (hy - oy) * follow
    const hr = Math.max(1, (size * clampN(adv.haloRadius, 130, 10, 400)) / 100)
    const ha = (clampN(adv.haloAlpha, 14, 0, 100) / 100) * glow
    if (ha > 0.001) {
        const g = ctx.createRadialGradient(hcx, hcy, 0, hcx, hcy, hr)
        g.addColorStop(0, rgbaStr(col, ha))
        g.addColorStop(0.35, rgbaStr(col, ha * 0.5))
        g.addColorStop(0.7, rgbaStr(col, ha * 0.15))
        g.addColorStop(1, rgbaStr(col, 0))
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
    }

    // Lobe wash: light spilling inside the lobe the trail wraps.
    const wash = (clampN(adv.lobeWash, 16, 0, 100) / 100) * Math.min(1.5, glow)
    for (let lobe = 0; lobe < 2; lobe++) {
        const weight = lobe === 0 ? rightFrac : 1 - rightFrac
        const a = wash * weight
        if (a < 0.003) continue
        const from = lobe === 0 ? 0 : INF_M / 2
        const to = lobe === 0 ? INF_M / 2 : INF_M
        ctx.beginPath()
        for (let j = from; j <= to; j++) {
            const jj = j % INF_M
            const x = cx + path.px[jj] * half
            const y = oy + path.py[jj] * half
            if (j === from) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
        }
        ctx.closePath()
        const lx = cx + (lobe === 0 ? 0.58 : -0.58) * half
        const g = ctx.createRadialGradient(lx, oy, 0, lx, oy, half * 0.6)
        g.addColorStop(0, rgbaStr(col, a))
        g.addColorStop(1, rgbaStr(col, a * 0.35))
        ctx.fillStyle = g
        ctx.fill()
    }

    // Ghost track: the whole ∞, faint, with a soft wider pass for the blurred edge.
    const trackC = parseColor(adv.trackColor, [0.37, 0.49, 0.6, 1])
    const trackA = clampN(adv.trackOpacity, 14, 0, 100) / 100
    if (trackA > 0.001) {
        ctx.beginPath()
        for (let j = 0; j < INF_M; j++) {
            const x = cx + path.px[j] * half
            const y = oy + path.py[j] * half
            if (j === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.lineJoin = "round"
        ctx.lineCap = "round"
        ctx.lineWidth = headW * 2.2
        ctx.strokeStyle = rgbaStr(trackC, trackA * 0.3)
        ctx.stroke()
        ctx.lineWidth = headW
        ctx.strokeStyle = rgbaStr(trackC, trackA)
        ctx.stroke()
    }

    // Glow: dense additive stamps of a tinted soft sprite along the trail.
    const trailPx = path.len * half * len
    const spacing = trailPx / INF_K
    if (fx.sprite && fx.tint && fx.tctx && glow > 0) {
        const t = fx.tctx
        t.globalCompositeOperation = "copy"
        t.drawImage(fx.sprite, 0, 0)
        t.globalCompositeOperation = "source-in"
        t.fillStyle = rgbaStr(col, 1)
        t.fillRect(0, 0, INF_SPRITE, INF_SPRITE)
        t.globalCompositeOperation = "source-over"
        ctx.globalCompositeOperation = "lighter"
        const layers = [
            { r: clampN(adv.bloomR, 450, 50, 2000) / 100, a: clampN(adv.bloom, 30, 0, 100) / 100, base: 0.5 },
            { r: clampN(adv.innerGlowR, 160, 50, 1000) / 100, a: clampN(adv.innerGlow, 55, 0, 100) / 100, base: 0.4 },
        ]
        for (const layer of layers) {
            if (layer.a <= 0) continue
            for (let k = INF_K; k >= 0; k--) {
                const fall = 1 - k / INF_K
                const r = Math.max(1, headW * layer.r * (layer.base + (1 - layer.base) * fall))
                const a = Math.min(1, layer.a * glow * Math.pow(fall, 1.5) * (spacing / r) * 2.2)
                if (a < 0.002) continue
                ctx.globalAlpha = a
                ctx.drawImage(fx.tint, xs[k] - r, ys[k] - r, r * 2, r * 2)
            }
        }
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = "source-over"
    }

    // Core: tapering tinted stroke, then a thinner near-white core on top.
    const taper = clampN(adv.taperPow, 150, 10, 500) / 100
    const fade = clampN(adv.fadePow, 60, 0, 500) / 100
    const edge = mixRGB(col, white, clampN(adv.coreTint, 55, 0, 100) / 100)
    const coreW = clampN(adv.coreWidth, 55, 0, 100) / 100
    ctx.lineCap = "butt"
    for (let pass = 0; pass < 2; pass++) {
        const c = pass === 0 ? edge : white
        const wm = pass === 0 ? 1 : coreW
        if (wm <= 0) continue
        for (let k = INF_K - 1; k >= 0; k--) {
            const um = (k + 0.5) / INF_K
            const w = (tailW + (headW - tailW) * Math.pow(1 - um, taper)) * wm
            const a = Math.pow(1 - um, fade)
            if (a < 0.003) continue
            ctx.lineWidth = w
            ctx.strokeStyle = rgbaStr(c, a)
            ctx.beginPath()
            ctx.moveTo(xs[k + 1], ys[k + 1])
            ctx.lineTo(xs[k], ys[k])
            ctx.stroke()
        }
    }
    // Rounded head cap.
    ctx.fillStyle = rgbaStr(edge, 1)
    ctx.beginPath()
    ctx.arc(hx, hy, headW / 2, 0, Math.PI * 2)
    ctx.fill()
    if (coreW > 0) {
        ctx.fillStyle = rgbaStr(white, 1)
        ctx.beginPath()
        ctx.arc(hx, hy, (headW / 2) * coreW, 0, Math.PI * 2)
        ctx.fill()
    }

    // Sparks: a small pool spawned along the tail, drifting off the path normal.
    const maxSparks = Math.round(clampN(adv.sparkCount, 6, 0, 40))
    const every = Math.max(0.03, clampN(adv.sparkMs, 150, 10, 5000) / 1000)
    const life = Math.max(0.05, clampN(adv.sparkLifeMs, 400, 50, 5000) / 1000)
    const driftU = (clampN(adv.sparkDrift, 5, 0, 100) / 100) * 2
    fx.sparkT += dt
    let guard = 0
    while (fx.sparkT >= every && guard++ < 8) {
        fx.sparkT -= every
        if (fx.sparks.length >= maxSparks) continue
        const u = 0.45 + 0.5 * Math.random()
        infSample(path, head - u * len)
        const side = Math.random() < 0.5 ? -1 : 1
        const l = life * (0.7 + 0.6 * Math.random())
        const v = (driftU / l) * (0.6 + 0.8 * Math.random())
        fx.sparks.push({ x: INF_PT.x, y: INF_PT.y, vx: INF_PT.nx * side * v, vy: INF_PT.ny * side * v, age: 0, life: l })
    }
    if (fx.sparkT > every) fx.sparkT = 0
    let keep = 0
    for (const s of fx.sparks) {
        s.age += dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        if (s.age < s.life) fx.sparks[keep++] = s
    }
    fx.sparks.length = Math.min(keep, maxSparks)
    if (fx.sparks.length > 0) {
        const sr = Math.max(0.6, (size * clampN(adv.sparkSize, 4, 1, 50)) / 1000)
        const sc = mixRGB(col, white, 0.7)
        ctx.globalCompositeOperation = "lighter"
        for (const s of fx.sparks) {
            ctx.fillStyle = rgbaStr(sc, (1 - s.age / s.life) * 0.85)
            ctx.beginPath()
            ctx.arc(cx + s.x * half, oy + s.y * half, sr, 0, Math.PI * 2)
            ctx.fill()
        }
        ctx.globalCompositeOperation = "source-over"
    }

    // Label: static, centred below the ∞.
    const label = typeof p.label === "string" ? p.label : "Loading..."
    if (label) {
        const f = fontShorthand(
            { fontWeight: clampN(adv.labelWeight, 600, 100, 900), fontSize: Math.max(6, (size * clampN(adv.labelSize, 6, 1, 40)) / 100) },
            14,
            600
        )
        ctx.font = f.shorthand
        ctx.textAlign = "center"
        ctx.textBaseline = "alphabetic"
        ctx.fillStyle = rgbaStr(parseColor(adv.labelColor, [0.37, 0.49, 0.6, 1]), clampN(adv.labelOpacity, 60, 0, 100) / 100)
        ctx.fillText(label, cx, oy + (size * clampN(adv.labelOffset, 42, -200, 200)) / 100)
    }

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = "source-over"
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

export default function LoaderComponentLooped(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000102", colors = ["#6A5CFF","#4FD6E0","#FF0000","#000DFF"], size = 300, speed = 50, style } = props
    void [colors, size, speed]
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
            const sz = Math.max(20, Math.min(800, num(p.size, 300)))
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
