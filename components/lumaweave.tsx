"use client"

/**
 * FieldFourPoint — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    density?: number
    rings?: number
    pink?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    spawnRate: 12,
    breathe: 60,
    breatheS: 7,
    lifeMin: 300,
    lifeMax: 900,
    rise: 35,
    largeShare: 15,
    midShare: 25,
    largeSize: 96,
    midSize: 48,
    smallSize: 16,
    stretch: 112,
    armWidth: 7,
    core: 4,
    glow: 40,
    whiten: 55,
    magentaShare: 35,
    lilacColor: "#C69EC6",
    greyColor: "#918192",
    crossShare: 12,
    greyFade: 60,
    respawn: 25,
    pingMs: 450,
    chainMs: 300,
    chain: 75,
    ringStart: 54,
    ringMid: 86,
    ringEnd: 112,
    ringLine: 2,
    ringColor: "#E1CFE3",
    ringOpacity: 85,
    tick: 12,
    gap: 12,
    hover: 100,
    grain: 0,
    vignette: 0,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
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

type Adv = typeof ADVANCED_DEFAULTS

/* Twinkle field simulated on the CPU (Poisson spawns, fixed positions, ping chains), drawn by the FRAG. */
interface Twinkle { x: number; y: number; span: number; life: number; age: number; tone: number; ping: boolean; hue?: number }
interface Ping { x: number; y: number; age: number; link: number; passed: boolean }
interface Sim {
    last: number; nextIn: number; t: number
    stars: Twinkle[]; pings: Ping[]; reduced: boolean
    s0: Float32Array; s1: Float32Array; pp: Float32Array
    px: number; py: number; trail: number; nearIn: number; presses: number
}

const MAX_STARS = 48
const MAX_PINGS = 6
const SIMS = new WeakMap<WebGL2RenderingContext, Sim>()
/** Each star draws a slot 0..59; slot % colors.length picks its colour, so 1–5 colours split evenly. */
const HUE_SLOTS = 60
function pickHue(): number {
    return Math.floor(Math.random() * HUE_SLOTS)
}

/** Pointer handed over by the scaffold each frame: eased x/y and over, raw tx/ty, a press counter. y is bottom-up like the stars. */
interface PointerIn { x: number; y: number; tx: number; ty: number; over: number; presses: number }
const POINTERS = new WeakMap<WebGL2RenderingContext, PointerIn>()

function clampN(v: number, a: number, b: number): number {
    return Math.min(b, Math.max(a, Number.isFinite(v) ? v : a))
}
function rnd(a: number, b: number): number {
    return a + Math.random() * (b - a)
}
function sstep(a: number, b: number, x: number): number {
    const t = clampN((x - a) / Math.max(1e-6, b - a), 0, 1)
    return t * t * (3 - 2 * t)
}
function hash1(n: number): number {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
    return s - Math.floor(s)
}
function noise1(t: number): number {
    const i = Math.floor(t)
    const f = t - i
    const k = f * f * (3 - 2 * f)
    return hash1(i) * (1 - k) + hash1(i + 1) * k
}
/** Grow ease-out cubic over `rise`, shrink ease-in quad over the rest. */
function envelope(t: number, rise: number): number {
    if (t <= 0 || t >= 1) return 0
    if (t < rise) {
        const k = 1 - t / rise
        return 1 - k * k * k
    }
    const k = (t - rise) / (1 - rise)
    return 1 - k * k
}

function startPing(sim: Sim, adv: Adv, x: number, y: number, link: number) {
    if (sim.pings.length >= MAX_PINGS || sim.stars.length >= MAX_STARS) return
    sim.pings.push({ x, y, age: 0, link, passed: false })
    // Magenta star peaks as the ring fades in and is gone when the ring breaks into the reticle.
    const life = (Math.max(100, adv.pingMs) / 1000) * 0.667
    sim.stars.push({ x, y, span: (adv.ringMid * 0.95) / 800, life, age: 0, tone: 2, ping: true, hue: pickHue() })
}

function spawnTwinkle(sim: Sim, adv: Adv, p: Props, x: number, y: number, delay: number, successor: boolean) {
    if (sim.stars.length >= MAX_STARS) return
    const lo = Math.max(50, adv.lifeMin)
    const life = rnd(lo, Math.max(lo, adv.lifeMax)) / 1000
    if (!successor && Math.random() < clampN(adv.crossShare, 0, 100) / 100) {
        sim.stars.push({ x, y, span: (adv.midSize * rnd(0.9, 1.4)) / 800, life, age: -delay, tone: 3, ping: false })
        return
    }
    const r = Math.random()
    const ls = clampN(adv.largeShare, 0, 100) / 100
    const ms = clampN(adv.midShare, 0, 100) / 100
    let size = r < ls ? 2 : r < ls + ms ? 1 : 0
    let tone = 0
    if (Math.random() < clampN(num(p.pink, 50), 0, 100) / 100) {
        tone = Math.random() < clampN(adv.magentaShare, 0, 100) / 100 ? 2 : 1
        if (size === 2) size = 1
    }
    if (tone === 2 && !successor && Math.random() < clampN(num(p.rings, 60), 0, 100) / 100) {
        startPing(sim, adv, clampN(x, 0.03, 0.97), clampN(y, 0.03, 0.97), 0)
        return
    }
    const base = size === 2 ? adv.largeSize : size === 1 ? adv.midSize : adv.smallSize
    sim.stars.push({ x, y, span: (base * rnd(0.75, 1.25)) / 800, life, age: -delay, tone, ping: false, hue: pickHue() })
}

/** A short-lived sparkle at a given spot, toned like the field (white, lilac or magenta by Accent Mix). */
function spark(sim: Sim, adv: Adv, p: Props, x: number, y: number, sizePx: number) {
    if (sim.stars.length >= MAX_STARS) return
    const tone = Math.random() < clampN(num(p.pink, 50), 0, 100) / 100
        ? (Math.random() < clampN(adv.magentaShare, 0, 100) / 100 ? 2 : 1)
        : 0
    const lo = Math.max(50, adv.lifeMin)
    const life = (rnd(lo, Math.max(lo, adv.lifeMax)) / 1000) * 0.7
    sim.stars.push({ x: clampN(x, -0.02, 1.02), y: clampN(y, -0.02, 1.02), span: (sizePx * rnd(0.75, 1.25)) / 800, life, age: 0, tone, ping: false, hue: pickHue() })
}

/** Pointer: moving strikes a trail of sparks, resting keeps the field twinkling around it, a press fires a ring → reticle ping chain. */
function pointerStep(sim: Sim, adv: Adv, p: Props, ptr: PointerIn | undefined, dt: number, asp: number) {
    if (!ptr) return
    const hk = clampN(adv.hover, 0, 100) / 50
    if (hk > 0 && dt > 0) {
        if (ptr.over > 0.5 && sim.px >= 0) {
            sim.trail += Math.hypot((ptr.x - sim.px) * asp, ptr.y - sim.py) * hk
            let guard = 0
            while (sim.trail >= 0.05 && guard++ < 4) {
                sim.trail -= 0.05
                const k = Math.random()
                spark(
                    sim, adv, p,
                    sim.px + (ptr.x - sim.px) * k + rnd(-0.03, 0.03) / asp,
                    sim.py + (ptr.y - sim.py) * k + rnd(-0.03, 0.03),
                    Math.random() < 0.3 ? adv.midSize : adv.smallSize * 1.3,
                )
            }
            sim.trail = Math.min(sim.trail, 0.05)
        } else sim.trail = 0
        sim.nearIn -= dt * ptr.over * hk
        if (sim.nearIn <= 0) {
            sim.nearIn = rnd(0.2, 0.5)
            const ang = Math.random() * Math.PI * 2
            const d = 0.03 + Math.random() * 0.12
            spark(sim, adv, p, ptr.x + (Math.cos(ang) * d) / asp, ptr.y + Math.sin(ang) * d, Math.random() < 0.35 ? adv.midSize * 1.15 : adv.smallSize * 1.5)
        }
        if (ptr.presses !== sim.presses) {
            if (sim.pings.length >= MAX_PINGS) sim.pings.shift()
            if (sim.stars.length >= MAX_STARS) sim.stars.shift()
            startPing(sim, adv, clampN(ptr.tx, 0.03, 0.97), clampN(ptr.ty, 0.03, 0.97), 0)
        }
    }
    sim.px = ptr.x
    sim.py = ptr.y
    sim.presses = ptr.presses
}

function stepSim(sim: Sim, adv: Adv, p: Props, dt: number, asp: number) {
    if (dt <= 0) return
    sim.t += dt
    // Age twinkles; a dying one may fire again at the same spot 0.15–0.3 s later.
    const dead: Twinkle[] = []
    for (const s of sim.stars) s.age += dt
    sim.stars = sim.stars.filter((s) => {
        if (s.age < s.life) return true
        dead.push(s)
        return false
    })
    for (const s of dead) {
        if (!s.ping && s.tone !== 3 && Math.random() < clampN(adv.respawn, 0, 100) / 100)
            spawnTwinkle(sim, adv, p, s.x, s.y, rnd(0.15, 0.3), true)
    }
    // Ping chains: the next magenta star lights up chainMs after the last one, 8–40% of the height away.
    const pingS = Math.max(100, adv.pingMs) / 1000
    const born: [number, number, number][] = []
    for (const g of sim.pings) {
        g.age += dt
        if (!g.passed && g.age >= Math.max(50, adv.chainMs) / 1000) {
            g.passed = true
            if (g.link < 6 && Math.random() < clampN(adv.chain, 0, 100) / 100) {
                const ang = Math.random() * Math.PI * 2
                const d = rnd(0.08, 0.4)
                let nx = g.x + (Math.cos(ang) * d) / asp
                let ny = g.y + Math.sin(ang) * d
                if (nx < 0.05 || nx > 0.95) nx = g.x - (Math.cos(ang) * d) / asp
                if (ny < 0.05 || ny > 0.95) ny = g.y - Math.sin(ang) * d
                born.push([clampN(nx, 0.03, 0.97), clampN(ny, 0.03, 0.97), g.link + 1])
            }
        }
    }
    sim.pings = sim.pings.filter((g) => g.age < pingS)
    for (const b of born) startPing(sim, adv, b[0], b[1], b[2])
    // Poisson spawns, rate breathing on slow noise so the field has busy and near-empty stretches.
    const breath = Math.max(0, 1 + (clampN(adv.breathe, 0, 100) / 100) * (noise1(sim.t / Math.max(1, adv.breatheS)) * 2 - 1))
    const rate = Math.max(0, adv.spawnRate) * (clampN(num(p.density, 50), 0, 100) / 50) * breath * (asp / 1.5)
    sim.nextIn -= dt
    let guard = 0
    while (sim.nextIn <= 0 && guard++ < 8) {
        if (rate <= 0.001) {
            sim.nextIn = 0.25
            break
        }
        spawnTwinkle(sim, adv, p, rnd(-0.02, 1.02), rnd(-0.02, 1.02), 0, false)
        sim.nextIn += -Math.log(1 - Math.random() * 0.999) / rate
    }
}

function makeSim(adv: Adv, p: Props, asp: number): Sim {
    const reduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const sim: Sim = {
        last: -1, nextIn: 0.05, t: 0, stars: [], pings: [], reduced,
        s0: new Float32Array(MAX_STARS * 4), s1: new Float32Array(MAX_STARS * 4), pp: new Float32Array(MAX_PINGS * 4),
        px: -1, py: -1, trail: 0, nearIn: 0.3, presses: 0,
    }
    const rise = clampN(adv.rise, 5, 95) / 100
    const peak = (x: number, y: number, px: number, tone: number, ping: boolean): Twinkle => ({
        x, y, span: px / 800, life: 0.9, age: 0.9 * rise, tone, ping,
    })
    if (reduced) {
        sim.stars.push(
            peak(0.52, 0.43, adv.largeSize * 1.05, 0, false),
            peak(0.33, 0.72, adv.midSize, 0, false),
            peak(0.64, 0.86, adv.ringMid * 0.95, 2, true),
            peak(0.18, 0.28, adv.smallSize * 1.2, 1, false),
            peak(0.76, 0.52, adv.smallSize * 1.1, 1, false),
            peak(0.88, 0.2, adv.smallSize * 1.3, 1, false),
            peak(0.07, 0.6, adv.midSize * 0.8, 1, false),
            peak(0.94, 0.76, adv.smallSize, 0, false),
        )
        sim.pings.push({ x: 0.64, y: 0.86, age: (0.6 * Math.max(100, adv.pingMs)) / 1000, link: 0, passed: true })
        return sim
    }
    for (let k = 0; k < 42; k++) stepSim(sim, adv, p, 1 / 30, asp)
    // Opening beat: the large white star at its peak with a faint grey cross above it.
    sim.stars.unshift(
        { x: 0.52, y: 0.43, span: (adv.largeSize * 1.05) / 800, life: 0.9, age: 0.9 * rise, tone: 0, ping: false },
        { x: 0.43, y: 0.85, span: (adv.midSize * 1.2) / 800, life: 0.7, age: 0.35, tone: 3, ping: false },
    )
    if (sim.stars.length > MAX_STARS) sim.stars.length = MAX_STARS
    return sim
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const asp = Math.max(0.2, gl.drawingBufferWidth / Math.max(1, gl.drawingBufferHeight))
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    let sim = SIMS.get(gl)
    if (!sim) {
        sim = makeSim(adv, p, asp)
        SIMS.set(gl, sim)
    }
    const dt = sim.last < 0 ? 0 : Math.min((now - sim.last) / 1000, 1 / 20)
    sim.last = now
    const sdt = (dt * clampN(num(p.speed, 50), 0, 100)) / 50
    if (!sim.reduced) {
        stepSim(sim, adv, p, sdt, asp)
        pointerStep(sim, adv, p, POINTERS.get(gl), sdt, asp)
    }

    const white = parseColor(p.baseColor, [0.98, 0.965, 0.98, 1])
    const list = Array.isArray(p.colors) && p.colors.length > 0 ? p.colors : ["#E040E0"]
    const pal = list.map((c) => parseColor(c, [0.878, 0.25, 0.878, 1]))
    const multi = pal.length > 1
    const lilac = parseColor(adv.lilacColor, [0.776, 0.62, 0.776, 1])
    const grey = parseColor(adv.greyColor, [0.569, 0.506, 0.573, 1])
    const ringC = parseColor(adv.ringColor, [0.882, 0.812, 0.89, 1])
    const tones: RGBA[] = [white, lilac, pal[0], grey]
    const soft: RGBA = [0, 0, 0, 1]
    const rise = clampN(adv.rise, 5, 95) / 100
    const sc = clampN(num(p.scale, 100), 10, 300) / 100
    const greyFade = clampN(adv.greyFade, 0, 100) / 100

    let n = 0
    for (const s of sim.stars) {
        if (n >= MAX_STARS) break
        if (s.age < 0 || s.age >= s.life) continue
        const t = s.age / s.life
        const a = envelope(t, rise)
        if (a <= 0.002) continue
        const dp = t < rise ? 0 : (t - rise) / (1 - rise)
        const g = s.tone === 3 ? 1 : greyFade * sstep(0.45, 1, dp)
        let c = tones[s.tone] ?? white
        // Accent stars take their own colour from the list; with several colours the lilac ones are a softened version of it.
        if (s.tone === 2 || (s.tone === 1 && multi)) {
            const h = pal[(s.hue ?? 0) % pal.length]
            if (s.tone === 2) c = h
            else {
                soft[0] = h[0] * 0.55 + lilac[0] * 0.45
                soft[1] = h[1] * 0.55 + lilac[1] * 0.45
                soft[2] = h[2] * 0.55 + lilac[2] * 0.45
                c = soft
            }
        }
        const o = n * 4
        sim.s0[o] = s.x
        sim.s0[o + 1] = s.y
        sim.s0[o + 2] = s.span * sc
        sim.s0[o + 3] = a
        sim.s1[o] = c[0] + (grey[0] - c[0]) * g
        sim.s1[o + 1] = c[1] + (grey[1] - c[1]) * g
        sim.s1[o + 2] = c[2] + (grey[2] - c[2]) * g
        sim.s1[o + 3] = s.tone === 3 ? 1 : g * 0.8
        n++
    }
    const pingS = Math.max(100, adv.pingMs) / 1000
    let np = 0
    for (const g of sim.pings) {
        if (np >= MAX_PINGS) break
        const ph = g.age / pingS
        if (ph < 0 || ph >= 1) continue
        const o = np * 4
        sim.pp[o] = g.x
        sim.pp[o + 1] = g.y
        sim.pp[o + 2] = ph
        sim.pp[o + 3] = 0
        np++
    }

    gl.uniform1i(u("uN"), n)
    gl.uniform1i(u("uNP"), np)
    gl.uniform4fv(u("uS0"), sim.s0)
    gl.uniform4fv(u("uS1"), sim.s1)
    gl.uniform4fv(u("uP"), sim.pp)
    gl.uniform4f(u("uRing"), (adv.ringStart / 1600) * sc, (adv.ringMid / 1600) * sc, (adv.ringEnd / 1600) * sc, (Math.max(1, adv.ringLine) * 0.5) / 800)
    gl.uniform4f(u("uRingCol"), ringC[0], ringC[1], ringC[2], clampN(adv.ringOpacity, 0, 100) / 100)
    gl.uniform2f(u("uTick"), (Math.max(1, adv.tick) / 800) * sc, (clampN(adv.gap, 0, 40) * Math.PI) / 180)
    gl.uniform4f(u("uStarK"), clampN(adv.stretch, 50, 200) / 100, clampN(adv.armWidth, 1, 30) / 100, clampN(adv.core, 0, 20) / 100, clampN(adv.glow, 0, 100) / 100)
    gl.uniform1f(u("uWhiten"), clampN(adv.whiten, 0, 100) / 100)
    gl.uniform1f(u("uHoverK"), clampN(adv.hover, 0, 100) / 50)
    gl.uniform1f(u("uGrain"), clampN(adv.grain, 0, 100) / 100)
    gl.uniform1f(u("uVig"), clampN(adv.vignette, 0, 100) / 100)
}

/* Four-point sparkle twinkles at fixed points plus ring → reticle pings, additive on black. */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform vec3 uBg;
uniform vec3 uAccent;
uniform int uN;
uniform int uNP;
uniform vec4 uS0[48];
uniform vec4 uS1[48];
uniform vec4 uP[6];
uniform vec4 uRing;
uniform vec4 uRingCol;
uniform vec2 uTick;
uniform vec4 uStarK;
uniform float uWhiten;
uniform float uHoverK;
uniform float uGrain;
uniform float uVig;
out vec4 outColor;
const float PI = 3.14159265;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float eo(float x) { x = clamp(x, 0.0, 1.0); float k = 1.0 - x; return 1.0 - k * k * k; }
void main() {
    float ry = max(uRes.y, 1.0);
    float aspect = uRes.x / ry;
    vec2 p = gl_FragCoord.xy / ry;
    float px = 1.0 / ry;
    vec2 m = vec2(uMouse.x * aspect, uMouse.y);
    float hv = uHover * uHoverK;
    vec3 acc = vec3(0.0);

    for (int i = 0; i < 48; i++) {
        if (i >= uN) break;
        vec4 s0 = uS0[i];
        vec4 s1 = uS1[i];
        vec2 c = vec2(s0.x * aspect, s0.y);
        vec2 dm = c - m;
        float infl = hv * exp(-dot(dm, dm) / 0.07);
        float a = max(s0.w, 1e-4);
        float span = s0.z * (1.0 + 0.5 * infl);
        float L = max(0.5 * span * pow(a, 0.7), 1e-5);
        float Lv = L * uStarK.x;
        float reach = max(L, Lv) + 0.6 * L + 3.0 * px;
        vec2 d = p - c;
        vec2 ad = abs(d);
        if (ad.x > reach || ad.y > reach) continue;
        float cr = s1.w;
        float thick = uStarK.y * L * (1.0 - 0.75 * cr);
        float th = min(ad.x / L, 1.0);
        float wh = max(0.6 * px, thick * pow(max(1.0 - th, 1e-6), 2.2));
        float armH = pow(max(1.0 - th, 1e-6), 1.3) * exp(-(ad.y * ad.y) / (wh * wh));
        float tv = min(ad.y / max(Lv, 1e-5), 1.0);
        float wv = max(0.6 * px, thick * pow(max(1.0 - tv, 1e-6), 2.2));
        float armV = pow(max(1.0 - tv, 1e-6), 1.3) * exp(-(ad.x * ad.x) / (wv * wv));
        vec2 r45 = vec2(ad.x + ad.y, abs(ad.x - ad.y)) * 0.70710678;
        float Ld = max(0.4 * L, 1e-5);
        float td = min(r45.x / Ld, 1.0);
        float diag = cr * 0.6 * pow(max(1.0 - td, 1e-6), 1.5) * exp(-(r45.y * r45.y) / (0.5 * px * px + 1e-10));
        float body = max(max(armH, armV), diag);
        float r2 = dot(d, d);
        float cs = max(1.2 * px, uStarK.z * span * pow(a, 1.3));
        float core = exp(-r2 / (cs * cs));
        float gr = max(0.45 * L, 2.0 * px);
        float glow = uStarK.w * exp(-r2 / (gr * gr));
        float inten = a * (1.0 + 0.8 * infl);
        vec3 sc = s1.rgb;
        acc += (sc * (body + glow) + mix(sc, vec3(1.0), uWhiten) * core) * inten;
    }

    for (int j = 0; j < 6; j++) {
        if (j >= uNP) break;
        vec4 q = uP[j];
        vec2 c = vec2(q.x * aspect, q.y);
        vec2 d = p - c;
        float r = length(d);
        if (r > uRing.z + uTick.x + 4.0 * px) continue;
        float ph = q.z;
        float R;
        float al;
        float ret;
        if (ph < 1.0 / 3.0) { R = uRing.x; al = ph * 3.0; ret = 0.0; }
        else if (ph < 2.0 / 3.0) { R = mix(uRing.x, uRing.y, eo((ph - 1.0 / 3.0) * 3.0)); al = 1.0; ret = 0.0; }
        else { float k = (ph - 2.0 / 3.0) * 3.0; R = mix(uRing.y, uRing.z, eo(k)); al = 1.0 - k; ret = smoothstep(0.0, 0.25, k); }
        float lw = max(0.6 * px, uRing.w);
        float e = (r - R) / lw;
        float line = exp(-e * e);
        float ang = atan(d.y, d.x);
        float mA = abs(mod(ang + PI * 0.25, PI * 0.5) - PI * 0.25);
        float arcs = smoothstep(uTick.y - 0.02, uTick.y + 0.02, mA);
        float ring = line * mix(1.0, arcs, ret);
        vec2 ad = abs(d);
        float along = max(ad.x, ad.y);
        float perp = min(ad.x, ad.y);
        float tl = uTick.x;
        float tick = exp(-(perp * perp) / (lw * lw))
            * smoothstep(R - 0.6 * tl - px, R - 0.6 * tl + px, along)
            * (1.0 - smoothstep(R + 0.4 * tl - px, R + 0.4 * tl + px, along));
        float a45 = (ad.x + ad.y) * 0.70710678;
        float p45 = abs(ad.x - ad.y) * 0.70710678;
        float i0 = 0.55 * R;
        float i1 = 0.55 * R + 0.75 * tl;
        float dg = exp(-(p45 * p45) / (lw * lw))
            * smoothstep(i0 - px, i0 + px, a45)
            * (1.0 - smoothstep(i1 - px, i1 + px, a45));
        float v = max(ring, ret * max(tick, dg));
        acc += uRingCol.rgb * v * al * uRingCol.a;
    }

    vec2 pm = p - m;
    acc += uAccent * 0.05 * hv * exp(-dot(pm, pm) / 0.004);

    vec3 col = uBg + acc;
    vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));
    vec2 vq = (uv - 0.5) * vec2(aspect, 1.0) / max(length(vec2(aspect, 1.0)) * 0.5, 1e-4);
    col *= 1.0 - uVig * smoothstep(0.35, 1.0, dot(vq, vq));
    col += (h21(gl_FragCoord.xy + fract(uTime * 7.31) * 97.0) - 0.5) * uGrain * 0.18;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

// ══ /EFFECT ═════════════════════════════════════════════════════════════════

interface Props extends EffectProps {
    background?: string
    baseColor?: string
    colors?: string[]
    speed?: number
    scale?: number
    style?: CSSProperties
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

export default function FieldFourPoint(props: Props) {
    props = withMovedControls(props)
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#FAF6FA", colors = ["#E040E0","#E2FF00","#3BFF00","#00CEFF"], speed = 50, scale = 129, style } = props
    void [baseColor, colors, speed, scale]
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("FieldFourPoint shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("FieldFourPoint link:", gl.getProgramInfoLog(prog))
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
        let presses = 0
        const ptr: PointerIn = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, over: 0, presses: 0 }
        POINTERS.set(gl, ptr)
        const onMove = (e: PointerEvent) => {
            if (W <= 0 || H <= 0) return
            tx = e.offsetX / W
            ty = 1 - e.offsetY / H
            over = 1
        }
        const onLeave = () => {
            over = 0
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            presses++
        }
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointerdown", onDown)

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
            const acc = parseColor(Array.isArray(p.colors) ? p.colors[0] : undefined, [0.878, 0.25, 0.878, 1])
            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.uniform2f(u("uRes"), canvas.width, canvas.height)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform2f(u("uMouse"), mx, my)
            // Raw 0..1: the FRAG scales it by the Advanced `hover` row (RULES.md).
            gl.uniform1f(u("uHover"), hov)
            gl.uniform3f(u("uBg"), bg[0], bg[1], bg[2])
            gl.uniform3f(u("uBase"), base[0], base[1], base[2])
            gl.uniform3f(u("uAccent"), acc[0], acc[1], acc[2])
            gl.uniform1f(u("uScale"), Math.max(10, Math.min(300, num(p.scale, 100))) / 100)
            ptr.x = mx
            ptr.y = my
            ptr.tx = tx
            ptr.ty = ty
            ptr.over = hov
            ptr.presses = presses
            effectUniforms(gl, u, p)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointerdown", onDown)
        }
    }, [])

    return (
        <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}
