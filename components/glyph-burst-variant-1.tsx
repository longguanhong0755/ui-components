"use client"

/**
 * CursorComponent — it is a cursor component
 *
 * Built on the Cursor template (lib/templates/CursorTemplate.tsx).
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

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    pink: "#E94180",
    cyan: "#1EE8E8",
    white: "#FFFFFF",
    violet: "#9B4DFF",
    lime: "#7EDC5A",
    accentShare: 10,
    glyphOpacity: 100,
    glowPx: 8,
    glowOpacity: 40,
    cursorScale: 100,
    gridEnabled: false,
    gridColor: "#2A2828",
    gridSpacing: 20,
    gridDot: 2,
    gridOpacity: 100,
    burstSpread: 40,
    burstMinReach: 35,
    burstStaggerMs: 150,
    burstHoldMs: 120,
    burstDrag: 6,
    burstLifeMinMs: 350,
    burstLifeMaxMs: 650,
    trailSpacing: 110,
    trailJitter: 6,
    trailDrift: 12,
    trailLifeMinMs: 350,
    trailLifeMaxMs: 650,
    reducedCount: 8,
    reducedLifeMs: 400,
    demoAx: 77,
    demoAy: 16,
    demoBx: 26,
    demoBy: 71,
    demoPeriodMs: 5000,
    demoSweepAtMs: 1520,
    demoSweepMs: 620,
    demoReturnAtMs: 3800,
    demoClick1Ms: 350,
    demoClick2Ms: 2650,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    burstCount?: number
    burstReach?: number
    trailDensity?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

interface Particle {
    alive: boolean
    x: number
    y: number
    dx: number
    dy: number
    delay: number
    hold: number
    life: number
    age: number
    k: number
    glyph: number
    color: number
}

interface Effect {
    parts: Particle[]
    head: number
    reduced: boolean
    demoT: number
    demoPh: number
    wasDemo: boolean
    prevDown: boolean
    lastX: number
    lastY: number
    carry: number
    spriteKey: string
    sprites: HTMLCanvasElement[][]
    spritePad: number
    cursorKey: string
    cursorPath: Path2D | null
    gridKey: string
    gridPattern: CanvasPattern | null
}

/** 7×7 pixel glyphs: ring, cross, plus, square, triple bar, hash, dot. */
const GLYPHS: string[][] = [
    [".#####.", "#.....#", "#.....#", "#.....#", "#.....#", "#.....#", ".#####."],
    ["#.....#", ".#...#.", "..#.#..", "...#...", "..#.#..", ".#...#.", "#.....#"],
    ["...#...", "...#...", "...#...", "#######", "...#...", "...#...", "...#..."],
    ["#######", "#.....#", "#.....#", "#.....#", "#.....#", "#.....#", "#######"],
    [".......", "#######", ".......", "#######", ".......", "#######", "......."],
    ["..#.#..", "..#.#..", "#######", "..#.#..", "#######", "..#.#..", "..#.#.."],
    [".......", "..###..", ".#####.", ".#####.", ".#####.", "..###..", "......."],
]

const MAX_PARTICLES = 240

/** Pixel arrow, 15 × 26 cells, tip at the top-left cell. Runs are [startCol, length]. */
function arrowRows(): Array<Array<[number, number]>> {
    const rows: Array<Array<[number, number]>> = []
    for (let r = 0; r < 26; r++) {
        const runs: Array<[number, number]> = []
        if (r <= 14) runs.push([0, r + 1])
        else if (r === 15) runs.push([0, 10])
        else {
            if (r <= 20) runs.push([0, Math.max(0, 19 - r) + 1])
            runs.push([5 + Math.floor((r - 16) / 2), 4])
        }
        rows.push(runs)
    }
    return rows
}
const ARROW = arrowRows()

function rand(a: number, b: number): number {
    return a + Math.random() * (b - a)
}

function clampN(v: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, v))
}

function easeOutCubic(t: number): number {
    const u = 1 - clampN(t, 0, 1)
    return 1 - u * u * u
}

function pickColor(accentPct: number): number {
    if (Math.random() * 100 < accentPct) return Math.random() < 0.5 ? 3 : 4
    const q = Math.random()
    return q < 0.42 ? 0 : q < 0.75 ? 1 : 2
}

function makeSprite(bits: string[], cell: number, pad: number, dpr: number, rgb: RGBA, glowPx: number, glowA: number): HTMLCanvasElement {
    const size = 7 * cell + pad * 2
    const c = document.createElement("canvas")
    c.width = Math.max(1, Math.round(size * dpr))
    c.height = Math.max(1, Math.round(size * dpr))
    const g = c.getContext("2d")
    if (!g) return c
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.beginPath()
    for (let r = 0; r < bits.length; r++) {
        const row = bits[r]
        for (let k = 0; k < row.length; k++) {
            if (row[k] === "#") g.rect(pad + k * cell, pad + r * cell, cell, cell)
        }
    }
    g.fillStyle = cssRgba([rgb[0], rgb[1], rgb[2], 1])
    if (glowPx > 0 && glowA > 0) {
        g.shadowColor = cssRgba([rgb[0], rgb[1], rgb[2], glowA])
        g.shadowBlur = glowPx * dpr
        g.fill()
        g.shadowBlur = 0
        g.shadowColor = "rgba(0, 0, 0, 0)"
    }
    g.fill()
    return c
}

function makeGrid(ctx: CanvasRenderingContext2D, spacing: number, dot: number, color: string, dpr: number): CanvasPattern | null {
    const s = Math.max(2, Math.round(spacing * dpr))
    const d = Math.max(1, Math.min(s, Math.round(dot * dpr)))
    const c = document.createElement("canvas")
    c.width = s
    c.height = s
    const g = c.getContext("2d")
    if (!g) return null
    g.fillStyle = cssRgba(parseColor(color, [0.165, 0.157, 0.157, 1]))
    const o = Math.floor((s - d) / 2)
    g.fillRect(o, o, d, d)
    return ctx.createPattern(c, "repeat")
}

function spawn(fx: Effect, x: number, y: number, dx: number, dy: number, delay: number, hold: number, life: number, k: number, accent: number): void {
    const q = fx.parts[fx.head]
    fx.head = (fx.head + 1) % fx.parts.length
    q.alive = true
    q.x = x
    q.y = y
    q.dx = dx
    q.dy = dy
    q.delay = delay
    q.hold = hold
    q.life = life
    q.age = 0
    q.k = k
    q.glyph = Math.floor(Math.random() * GLYPHS.length) % GLYPHS.length
    q.color = pickColor(accent)
}

function bakeEffect(_stage: Stage, _p: Props): Effect {
    const parts: Particle[] = []
    for (let i = 0; i < MAX_PARTICLES; i++) {
        parts.push({ alive: false, x: 0, y: 0, dx: 0, dy: 0, delay: 0, hold: 0, life: 0, age: 0, k: 1, glyph: 0, color: 0 })
    }
    const reduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    return {
        parts,
        head: 0,
        reduced,
        demoT: 0,
        demoPh: -1,
        wasDemo: false,
        prevDown: false,
        lastX: NaN,
        lastY: NaN,
        carry: 0,
        spriteKey: "",
        sprites: [],
        spritePad: 0,
        cursorKey: "",
        cursorPath: null,
        gridKey: "",
        gridPattern: null,
    }
}

function drawEffect(stage: Stage, fx: Effect, p: Props, ptr: Pointer, _clock: number, dt: number): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const { ctx, W, H, dpr } = stage
    const cell = Math.max(1, Math.round(num(p.size, 28) / 7))
    const short = Math.max(1, Math.min(W, H))

    // ── dot grid ──
    const gKey = `${adv.gridSpacing}|${adv.gridDot}|${adv.gridColor}|${dpr}`
    if (gKey !== fx.gridKey) {
        fx.gridKey = gKey
        fx.gridPattern = makeGrid(ctx, Math.max(2, adv.gridSpacing), Math.max(1, adv.gridDot), adv.gridColor, dpr)
    }
    if (adv.gridEnabled && fx.gridPattern && adv.gridOpacity > 0) {
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalAlpha = clampN(adv.gridOpacity / 100, 0, 1)
        ctx.fillStyle = fx.gridPattern
        ctx.fillRect(0, 0, W * dpr, H * dpr)
        ctx.restore()
    }

    // ── sprites ──
    const colors = [adv.pink, adv.cyan, adv.white, adv.violet, adv.lime]
    const sKey = `${cell}|${dpr}|${adv.glowPx}|${adv.glowOpacity}|${colors.join(",")}`
    if (sKey !== fx.spriteKey) {
        fx.spriteKey = sKey
        const glow = Math.max(0, adv.glowPx)
        fx.spritePad = Math.ceil(glow * 1.5) + 2
        const fallback: RGBA = [1, 1, 1, 1]
        fx.sprites = colors.map((c) => {
            const rgb = parseColor(c, fallback)
            return GLYPHS.map((g) => makeSprite(g, cell, fx.spritePad, dpr, rgb, glow, clampN(adv.glowOpacity / 100, 0, 1)))
        })
    }
    const ac = Math.max(1, Math.round((cell * Math.max(1, adv.cursorScale)) / 100))
    const cKey = `${ac}`
    if (cKey !== fx.cursorKey || !fx.cursorPath) {
        fx.cursorKey = cKey
        const path = new Path2D()
        for (let r = 0; r < ARROW.length; r++) {
            for (const [s, len] of ARROW[r]) path.rect(s * ac, r * ac, len * ac, ac)
        }
        fx.cursorPath = path
    }

    // ── pointer: 1:1 for a real mouse, scripted path (the reference's beats) in demo ──
    let x = ptr.tx
    let y = ptr.ty
    let click = false
    if (ptr.demo) {
        if (!fx.wasDemo) {
            fx.demoT = 0
            fx.demoPh = -1
            fx.lastX = NaN
        }
        const T = Math.max(1, adv.demoPeriodMs) / 1000
        fx.demoT += dt
        const ph = fx.demoT % T
        const prev = fx.demoPh
        const hit = (ms: number) => {
            const c = (Math.max(0, ms) / 1000) % T
            return ph >= prev ? c > prev && c <= ph : c > prev || c <= ph
        }
        click = hit(adv.demoClick1Ms) || hit(adv.demoClick2Ms)
        fx.demoPh = ph
        const s1 = adv.demoSweepAtMs / 1000
        const sd = Math.max(0.05, adv.demoSweepMs / 1000)
        const r1 = adv.demoReturnAtMs / 1000
        let u = 0
        if (ph < s1) u = 0
        else if (ph < s1 + sd) u = easeOutCubic((ph - s1) / sd)
        else if (ph < r1) u = 1
        else if (ph < r1 + sd) u = 1 - easeOutCubic((ph - r1) / sd)
        const ax = (adv.demoAx / 100) * W
        const ay = (adv.demoAy / 100) * H
        const bx = (adv.demoBx / 100) * W
        const by = (adv.demoBy / 100) * H
        x = ax + (bx - ax) * u
        y = ay + (by - ay) * u
    } else {
        if (fx.wasDemo) fx.lastX = NaN
        click = ptr.down && !fx.prevDown
    }
    fx.wasDemo = ptr.demo
    fx.prevDown = ptr.down

    const drag = Math.max(0.5, adv.burstDrag)
    const accent = clampN(adv.accentShare, 0, 100)

    // ── click burst ──
    if (click) {
        const spread = Math.max(0, adv.burstSpread)
        if (fx.reduced) {
            const n = Math.max(1, Math.round(adv.reducedCount))
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2
                const r = spread * Math.sqrt(Math.random())
                spawn(fx, x + Math.cos(a) * r, y + Math.sin(a) * r, 0, 0, 0, 0, Math.max(0.05, adv.reducedLifeMs / 1000), drag, accent)
            }
        } else {
            const n = Math.round(clampN(num(p.burstCount, 18), 1, 40))
            const reach = (clampN(num(p.burstReach, 16), 0, 100) / 100) * short
            const minR = clampN(adv.burstMinReach / 100, 0, 1)
            const lo = Math.max(0.05, adv.burstLifeMinMs / 1000)
            const hi = Math.max(lo, adv.burstLifeMaxMs / 1000)
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2
                const r = spread * Math.sqrt(Math.random())
                const d = reach * rand(minR, 1)
                const dir = Math.random() * Math.PI * 2
                spawn(
                    fx,
                    x + Math.cos(a) * r,
                    y + Math.sin(a) * r,
                    Math.cos(dir) * d,
                    Math.sin(dir) * d,
                    Math.random() * Math.max(0, adv.burstStaggerMs / 1000),
                    Math.random() * Math.max(0, adv.burstHoldMs / 1000),
                    rand(lo, hi),
                    drag,
                    accent
                )
            }
        }
    }

    // ── sparse trail, one glyph per `spacing` px travelled ──
    if (Number.isNaN(fx.lastX)) {
        fx.lastX = x
        fx.lastY = y
        fx.carry = 0
    }
    const mx = x - fx.lastX
    const my = y - fx.lastY
    const dist = Math.hypot(mx, my)
    const density = clampN(num(p.trailDensity, 50), 0, 100)
    if (density > 0 && !fx.reduced && dist > 0 && dist < short) {
        const spacing = Math.max(8, (Math.max(1, adv.trailSpacing) * 50) / density)
        const lo = Math.max(0.05, adv.trailLifeMinMs / 1000)
        const hi = Math.max(lo, adv.trailLifeMaxMs / 1000)
        let carry = fx.carry + dist
        let made = 0
        while (carry >= spacing && made < 4) {
            carry -= spacing
            const t = clampN((dist - carry) / dist, 0, 1)
            const ja = Math.random() * Math.PI * 2
            const jr = Math.max(0, adv.trailJitter) * Math.sqrt(Math.random())
            const da = Math.random() * Math.PI * 2
            const dd = Math.max(0, adv.trailDrift) * Math.random()
            spawn(
                fx,
                fx.lastX + mx * t + Math.cos(ja) * jr,
                fx.lastY + my * t + Math.sin(ja) * jr,
                Math.cos(da) * dd,
                Math.sin(da) * dd,
                0,
                0,
                rand(lo, hi),
                drag,
                accent
            )
            made++
        }
        fx.carry = Math.min(carry, spacing)
    } else if (dist >= short) {
        fx.carry = 0
    }
    fx.lastX = x
    fx.lastY = y

    // ── glyphs: hard pixel sprites with their own glow, additive so dense clusters haze ──
    const half = Math.floor((7 * cell) / 2)
    const pad = fx.spritePad
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.globalCompositeOperation = "lighter"
    ctx.globalAlpha = clampN(adv.glyphOpacity / 100, 0, 1)
    for (const q of fx.parts) {
        if (!q.alive) continue
        q.age += dt
        const tau = q.age - q.delay
        if (tau >= q.life) {
            q.alive = false
            continue
        }
        if (tau < 0) continue
        const e = 1 - Math.exp(-q.k * Math.max(0, tau - q.hold))
        const cx = Math.round((q.x + q.dx * e) / cell) * cell
        const cy = Math.round((q.y + q.dy * e) / cell) * cell
        const spr = fx.sprites[q.color]?.[q.glyph]
        if (!spr) continue
        ctx.drawImage(spr, cx - half - pad, cy - half - pad, spr.width / dpr, spr.height / dpr)
    }
    ctx.restore()

    // ── cursor on top, opaque, 1:1 ──
    if ((ptr.demo || ptr.present > 0.5) && fx.cursorPath) {
        ctx.save()
        ctx.translate(Math.round(x), Math.round(y))
        ctx.fillStyle = cssRgba(parseColor(p.color, [0.875, 0.227, 0.251, 1]))
        ctx.fill(fx.cursorPath)
        ctx.restore()
    }
}

// ══ /EFFECT ═════════════════════════════════════════════════════════════════

interface Props extends EffectProps {
    background?: string
    color?: string
    size?: number
    speed?: number
    style?: CSSProperties
}
interface Stage {
    ctx: CanvasRenderingContext2D
    W: number
    H: number
    dpr: number
}
interface Pointer {
    x: number
    y: number
    tx: number
    ty: number
    vx: number
    vy: number
    down: boolean
    present: number
    demo: boolean
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

const DEMO_AFTER_S = 2

function __BaseImpl_CursorComponent(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#0C0C0C", color = "#DF3A40", size = 28, speed = 50, style } = props
    void [color, size, speed]
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

        const ptr: Pointer = { x: stage.W / 2, y: stage.H / 2, tx: stage.W / 2, ty: stage.H / 2, vx: 0, vy: 0, down: false, present: 0, demo: true }
        let inside = false
        let idle = DEMO_AFTER_S
        const onMove = (e: PointerEvent) => {
            if (!inside) {
                ptr.x = e.offsetX
                ptr.y = e.offsetY
            }
            inside = true
            idle = 0
            ptr.tx = e.offsetX
            ptr.ty = e.offsetY
        }
        const onLeave = () => {
            inside = false
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            ptr.down = true
        }
        const onUp = () => {
            ptr.down = false
        }
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerenter", onMove)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        let fx: Effect | null = null
        let key = ""
        let clock = 0
        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const effectKeys = Object.keys(p).filter((n) => !["style", "background", "color", "size", "speed"].includes(n))
            const next = JSON.stringify([stage.W, stage.H, stage.dpr, effectKeys.map((n) => (p as Record<string, unknown>)[n])])
            if (next !== key || !fx) {
                key = next
                fx = bakeEffect(stage, p)
            }
            const rate = Math.max(0, Math.min(100, num(p.speed, 50))) / 50
            clock += dt * rate
            idle += dt
            ptr.demo = onCanvas || (!inside && idle > DEMO_AFTER_S)
            if (ptr.demo) {
                ptr.tx = stage.W / 2 + Math.sin(clock * 0.9) * stage.W * 0.3
                ptr.ty = stage.H / 2 + Math.sin(clock * 1.3 + 1) * stage.H * 0.25
            }
            const px = ptr.x
            const py = ptr.y
            const k = 1 - Math.exp(-dt * (8 + 24 * rate))
            ptr.x += (ptr.tx - ptr.x) * k
            ptr.y += (ptr.ty - ptr.y) * k
            if (dt > 0) {
                ptr.vx = (ptr.x - px) / dt
                ptr.vy = (ptr.y - py) / dt
            }
            const want = inside || ptr.demo ? 1 : 0
            ptr.present += (want - ptr.present) * (1 - Math.exp(-dt * 6))
            ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0)
            ctx.clearRect(0, 0, stage.W, stage.H)
            drawEffect(stage, fx, p, ptr, clock, dt * rate)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerenter", onMove)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    return (
        <div ref={rootRef} style={{ position: "relative", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", cursor: "none" }} />
        </div>
    )
}

const __presetProps = {
  "background": "#0C0C0C",
  "color": "#00FF5B",
  "size": 16,
  "speed": 50,
  "burstCount": 18,
  "burstReach": 16,
  "trailDensity": 50,
  "advanced": {
    "cyan": "#1EE8E8",
    "lime": "#7EDC5A",
    "pink": "#E94180",
    "white": "#FFFFFF",
    "demoAx": 77,
    "demoAy": 16,
    "demoBx": 26,
    "demoBy": 71,
    "glowPx": 8,
    "violet": "#9B4DFF",
    "gridDot": 2,
    "burstDrag": 6,
    "gridColor": "#2A2828",
    "trailDrift": 12,
    "accentShare": 10,
    "burstHoldMs": 120,
    "burstSpread": 40,
    "cursorScale": 100,
    "demoSweepMs": 620,
    "glowOpacity": 40,
    "gridEnabled": false,
    "gridOpacity": 100,
    "gridSpacing": 20,
    "trailJitter": 6,
    "demoClick1Ms": 350,
    "demoClick2Ms": 2650,
    "demoPeriodMs": 5000,
    "glyphOpacity": 100,
    "reducedCount": 8,
    "trailSpacing": 110,
    "burstMinReach": 35,
    "demoSweepAtMs": 1520,
    "reducedLifeMs": 400,
    "burstLifeMaxMs": 650,
    "burstLifeMinMs": 350,
    "burstStaggerMs": 150,
    "demoReturnAtMs": 3800,
    "trailLifeMaxMs": 650,
    "trailLifeMinMs": 350
  }
};

export default function CursorComponent(props: Record<string, unknown>) {
  return <__BaseImpl_CursorComponent {...(__presetProps as Record<string, unknown>)} {...props} />;
}
