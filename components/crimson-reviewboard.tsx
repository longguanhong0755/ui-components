"use client"

/**
 * GlowingMagentaBall — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    periodMs: 930,
    trailsPerTurn: 1,
    reverse: false,
    tilt: 12,
    roll: 4,
    poleTop: 12,
    poleBottom: 88,
    coreWidth: 10,
    haloWidth: 70,
    haloOpacity: 20,
    headLength: 10,
    backBrightness: 25,
    tailColor: "#0D6A6B",
    pathColor: "#6A868A",
    pathOpacity: 18,
    glowColor: "#0D616B",
    glowScale: 104,
    glowOpacity: 85,
    glowLift: 8,
    glowPulse: 5,
    sparkleSize: 10,
    twinkleMs: 930,
    seed: 7,
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

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    turns?: number
    trailLength?: number
    sparkles?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

interface Sparkle {
    u: number
    psi: number
    rad: number
    size: number
    phase: number
    drift: number
    bright: number
}

interface Effect {
    theta: number
    boost: number
    tx: number
    ty: number
    seed: number
    sparks: Sparkle[]
    X: Float32Array
    Y: Float32Array
    F: Float32Array
    M: Float32Array
    E: Float32Array
    A: Float32Array
    H: Float32Array
    noise: HTMLCanvasElement | null
    pattern: CanvasPattern | null
}

const TAU = Math.PI * 2
const MAX_TURNS = 8
const SEG_PER_TURN = 150
const MAX_SPARKS = 150

function clampN(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

function rng(seed: number) {
    let s = (seed | 0) ^ 0x9e3779b9
    return () => {
        s = (s + 0x6d2b79f5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function makeSparks(seed: number): Sparkle[] {
    const r = rng(seed)
    const out: Sparkle[] = []
    for (let i = 0; i < MAX_SPARKS; i++) {
        // Biased toward the upper tiers and the equator, as in the reference.
        const u = clampN(0.1 + Math.pow(r(), 1.3) * 0.75, 0.04, 0.96)
        out.push({
            u,
            psi: r() * TAU,
            rad: 0.78 + r() * 0.24,
            size: 0.45 + r() * 0.55,
            phase: r() * TAU,
            drift: r() * 2 - 1,
            bright: 0.4 + r() * 0.6,
        })
    }
    return out
}

function bakeEffect(_stage: Stage, p: Props): Effect {
    const n = MAX_TURNS * SEG_PER_TURN + 1
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const seed = Math.round(num(adv.seed, 7))
    let noise: HTMLCanvasElement | null = null
    if (typeof document !== "undefined") {
        const c = document.createElement("canvas")
        c.width = 128
        c.height = 128
        const nctx = c.getContext("2d")
        if (nctx) {
            const img = nctx.createImageData(128, 128)
            const r = rng(91)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.round(r() * 255)
                img.data[i] = v
                img.data[i + 1] = v
                img.data[i + 2] = v
                img.data[i + 3] = 255
            }
            nctx.putImageData(img, 0, 0)
            noise = c
        }
    }
    return {
        theta: 0,
        boost: 0,
        tx: 0,
        ty: 0,
        seed,
        sparks: makeSparks(seed),
        X: new Float32Array(n),
        Y: new Float32Array(n),
        F: new Float32Array(n),
        M: new Float32Array(n),
        E: new Float32Array(n),
        A: new Float32Array(n),
        H: new Float32Array(n),
        noise,
        pattern: null,
    }
}

function rgbStr(r: number, g: number, b: number, a: number): string {
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`
}

/**
 * One frame. `clock` is seconds of speed-scaled time; `progress` is 0..1
 * (eased) or null when indeterminate. (cx, cy) is the centre, `size` the
 * loader's diameter in CSS px.
 */
function drawEffect(stage: Stage, fx: Effect, p: Props, cx: number, cy: number, size: number, clock: number, progress: number | null, dt: number): void {
    const { ctx } = stage
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const R = size / 2
    const turns = clampN(Math.round(num(p.turns, 4)), 1, MAX_TURNS)
    const L = clampN(num(p.trailLength, 83) / 100, 0.05, 1)
    const trails = clampN(Math.round(num(adv.trailsPerTurn, 1)), 1, 6)
    const dir = adv.reverse === true ? -1 : 1

    // ── pointer: tilt toward it, brighten, press spins faster ──
    const ptr = stage.pointer
    const hv = clampN(num(adv.hover, 50) / 50, 0, 2) * ptr.over
    const nx = clampN((ptr.x - cx) / Math.max(1, size), -1, 1)
    const ny = clampN((ptr.y - cy) / Math.max(1, size), -1, 1)
    fx.tx += (nx * hv - fx.tx) * 0.1
    fx.ty += (ny * hv - fx.ty) * 0.1
    fx.boost += ((ptr.down ? hv : 0) - fx.boost) * 0.08
    const lift = 1 + 0.25 * Math.min(1, hv)

    // ── rotation about the vertical axis, linear, one repeat per periodMs ──
    const rev = Math.max(0.1, num(adv.periodMs, 930) / 1000) * trails
    fx.theta = (fx.theta + ((dt * TAU) / rev) * (1 + 1.5 * fx.boost)) % (TAU * 64)

    const T = ((num(adv.tilt, 12) + fx.ty * 16) * Math.PI) / 180
    const rho = ((num(adv.roll, 4) - fx.tx * 10) * Math.PI) / 180
    const cT = Math.cos(T), sT = Math.sin(T), cR = Math.cos(rho), sR = Math.sin(rho)
    const p0 = clampN(num(adv.poleTop, 12) / 100, 0, 1) * Math.PI
    const p1 = clampN(num(adv.poleBottom, 88) / 100, 0, 1) * Math.PI
    let sx = 0, sy = 0
    const place = (x: number, y: number, z: number) => {
        const yy = y * cT - z * sT
        const dx = R * x, dy = -R * yy
        sx = cx + dx * cR + dy * sR
        sy = cy - dx * sR + dy * cR
    }

    const body = parseColor(p.color, [0.718, 0.176, 0.408, 1])
    const core = parseColor(p.accent, [0.957, 0.553, 0.757, 1])
    const tail = parseColor(adv.tailColor, [0.42, 0.05, 0.24, 1])
    const pathC = parseColor(adv.pathColor, [0.54, 0.42, 0.5, 1])
    const gc = parseColor(adv.glowColor, [0.42, 0.05, 0.24, 1])

    // ── glow sphere behind ──
    ctx.globalCompositeOperation = "source-over"
    ctx.globalAlpha = 1
    const pulse = 1 + (num(adv.glowPulse, 5) / 100) * Math.sin(fx.theta * trails)
    const ga = clampN((num(adv.glowOpacity, 85) / 100) * pulse * lift, 0, 1)
    const gr = R * Math.max(0.1, num(adv.glowScale, 104) / 100)
    const fy = cy - gr * (num(adv.glowLift, 8) / 100)
    const grad = ctx.createRadialGradient(cx, fy, 0, cx, cy, gr)
    grad.addColorStop(0, rgbStr(gc[0], gc[1], gc[2], ga))
    grad.addColorStop(0.42, rgbStr(gc[0] * 0.78, gc[1] * 0.78, gc[2] * 0.78, ga))
    grad.addColorStop(0.78, rgbStr(gc[0] * 0.5, gc[1] * 0.5, gc[2] * 0.5, ga))
    grad.addColorStop(1, rgbStr(gc[0] * 0.3, gc[1] * 0.3, gc[2] * 0.3, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, gr, 0, TAU)
    ctx.fill()

    // ── sample the spherical helix ──
    const N = turns * SEG_PER_TURN
    const hl = Math.max(0.01, num(adv.headLength, 10) / 100)
    const { X, Y, F, M, E, A, H } = fx
    for (let i = 0; i <= N; i++) {
        const u = i / N
        const pol = p0 + (p1 - p0) * u
        const y = Math.cos(pol), r = Math.sin(pol)
        const psi = TAU * turns * u
        const phi = psi - dir * fx.theta
        place(r * Math.cos(phi), y, r * Math.sin(phi))
        X[i] = sx
        Y[i] = sy
        F[i] = 0.5 + 0.5 * Math.sin(phi)
        const e = clampN(Math.min(u, 1 - u) / 0.04, 0, 1)
        E[i] = e
        let a = ((dir * psi * trails) / TAU) % 1
        if (a < 0) a += 1
        let m = a < L ? (1 - a / L) * Math.min(1, a / 0.01) : 0
        if (progress !== null) m *= clampN((progress - u) * 30 + 1, 0, 1)
        M[i] = m * e
        const t = a < L ? a / L : 1
        A[i] = t
        H[i] = t < hl ? 1 - t / hl : 0
    }

    ctx.globalCompositeOperation = "lighter"
    ctx.lineCap = "butt"
    ctx.lineJoin = "round"
    const coreW = Math.max(0.8, (size * num(adv.coreWidth, 10)) / 1000)
    const haloW = Math.max(1, (size * num(adv.haloWidth, 70)) / 1000)
    const back = clampN(num(adv.backBrightness, 25) / 100, 0, 1)
    const seg = (i: number) => {
        ctx.beginPath()
        ctx.moveTo(X[i], Y[i])
        ctx.lineTo(X[i + 1], Y[i + 1])
        ctx.stroke()
    }

    // faint full helix path
    const pathA = clampN(num(adv.pathOpacity, 18) / 100, 0, 1)
    if (pathA > 0) {
        ctx.strokeStyle = rgbStr(pathC[0], pathC[1], pathC[2], 1)
        for (let i = 0; i < N; i++) {
            const f = (F[i] + F[i + 1]) / 2
            const a = pathA * (0.35 + 0.65 * f) * ((E[i] + E[i + 1]) / 2)
            if (a < 0.003) continue
            ctx.globalAlpha = a
            ctx.lineWidth = coreW * (0.45 + 0.4 * f)
            seg(i)
        }
    }

    // halos: wide soft + tighter bright
    const haloA = clampN(num(adv.haloOpacity, 20) / 100, 0, 1)
    ctx.strokeStyle = rgbStr(body[0], body[1], body[2], 1)
    const halos: [number, number][] = [[haloW, haloA], [haloW * 0.38, haloA * 1.7]]
    for (const [w, ha] of halos) {
        if (ha <= 0) continue
        for (let i = 0; i < N; i++) {
            const m = (M[i] + M[i + 1]) / 2
            if (m <= 0.002) continue
            const f = (F[i] + F[i + 1]) / 2
            const d = back + (1 - back) * f * f
            const a = clampN(ha * m * d * lift, 0, 1)
            if (a < 0.003) continue
            ctx.globalAlpha = a
            ctx.lineWidth = w * (0.55 + 0.45 * f)
            seg(i)
        }
    }

    // bright core: white-hot head → accent → tail colour
    for (let i = 0; i < N; i++) {
        const m = (M[i] + M[i + 1]) / 2
        if (m <= 0.002) continue
        const f = (F[i] + F[i + 1]) / 2
        const d = back + (1 - back) * f * f
        const a = clampN(Math.min(1, m * 1.6) * d * lift, 0, 1)
        if (a < 0.004) continue
        const t = Math.pow((A[i] + A[i + 1]) / 2, 1.5)
        const hd = ((H[i] + H[i + 1]) / 2) * 0.85
        let r = core[0] + (tail[0] - core[0]) * t
        let g = core[1] + (tail[1] - core[1]) * t
        let b = core[2] + (tail[2] - core[2]) * t
        r += (1 - r) * hd
        g += (1 - g) * hd
        b += (1 - b) * hd
        ctx.strokeStyle = rgbStr(r, g, b, 1)
        ctx.globalAlpha = a
        ctx.lineWidth = coreW * (0.45 + 0.55 * f) * (1 + 0.5 * hd)
        seg(i)
    }

    // ── sparkles riding the rotation, twinkling ──
    const seed = Math.round(num(adv.seed, 7))
    if (seed !== fx.seed) {
        fx.seed = seed
        fx.sparks = makeSparks(seed)
    }
    const count = clampN(Math.round(num(p.sparkles, 30)), 0, MAX_SPARKS)
    const ss = (size * num(adv.sparkleSize, 10)) / 1000
    const tw = Math.max(0.1, num(adv.twinkleMs, 930) / 1000)
    const sparkCore = rgbStr(core[0] + (1 - core[0]) * 0.5, core[1] + (1 - core[1]) * 0.5, core[2] + (1 - core[2]) * 0.5, 1)
    const sparkGlow = rgbStr(body[0], body[1], body[2], 1)
    for (let k = 0; k < count; k++) {
        const s = fx.sparks[k]
        const pol = p0 + (p1 - p0) * s.u
        const y = Math.cos(pol) * s.rad, rr = Math.sin(pol) * s.rad
        const phi = s.psi - dir * fx.theta
        place(rr * Math.cos(phi), y, rr * Math.sin(phi))
        const yOff = R * 0.04 * s.drift * Math.sin(clock * 0.9 + s.phase)
        const f = 0.5 + 0.5 * Math.sin(phi)
        const twk = 0.5 + 0.5 * Math.sin((clock * TAU) / tw + s.phase)
        const a = clampN(s.bright * (0.3 + 0.7 * twk) * (0.35 + 0.65 * f) * lift, 0, 1)
        if (a < 0.01) continue
        const rad = Math.max(0.6, ss * s.size)
        ctx.globalAlpha = a * 0.28
        ctx.fillStyle = sparkGlow
        ctx.beginPath()
        ctx.arc(sx, sy + yOff, rad * 1.8, 0, TAU)
        ctx.fill()
        ctx.globalAlpha = a
        ctx.fillStyle = sparkCore
        ctx.beginPath()
        ctx.arc(sx, sy + yOff, rad * 0.5, 0, TAU)
        ctx.fill()
    }

    // ── grain and vignette overlays ──
    const grain = clampN(num(adv.grain, 0) / 100, 0, 1)
    if (grain > 0 && fx.noise) {
        if (!fx.pattern) fx.pattern = ctx.createPattern(fx.noise, "repeat")
        if (fx.pattern) {
            const ox = Math.floor(Math.random() * 128), oy = Math.floor(Math.random() * 128)
            ctx.globalCompositeOperation = "lighter"
            ctx.globalAlpha = grain * 0.14
            ctx.save()
            ctx.translate(-ox, -oy)
            ctx.fillStyle = fx.pattern
            ctx.fillRect(0, 0, stage.W + 128, stage.H + 128)
            ctx.restore()
        }
    }
    ctx.globalCompositeOperation = "source-over"
    const vig = clampN(num(adv.vignette, 0) / 100, 0, 1)
    if (vig > 0) {
        const diag = Math.hypot(stage.W, stage.H) / 2
        const vg = ctx.createRadialGradient(stage.W / 2, stage.H / 2, diag * 0.35, stage.W / 2, stage.H / 2, diag)
        vg.addColorStop(0, "rgba(0, 0, 0, 0)")
        vg.addColorStop(1, `rgba(0, 0, 0, ${vig})`)
        ctx.globalAlpha = 1
        ctx.fillStyle = vg
        ctx.fillRect(0, 0, stage.W, stage.H)
    }
    ctx.globalAlpha = 1
}

// ══ /EFFECT ═════════════════════════════════════════════════════════════════

interface Props extends EffectProps {
    background?: string
    color?: string
    accent?: string
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

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

export default function GlowingMagentaBall(props: Props) {
    props = withMovedControls(props)
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", color = "#00FFFB", accent = "#8DDCF4", size = 466, speed = 29, style } = props
    void [color, accent, size, speed]
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

        let fx: Effect | null = null
        let key = ""
        let shown = 0
        let clock = 0
        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            stage.pointer.over += ((pointerInside ? 1 : 0) - stage.pointer.over) * (1 - Math.exp(-8 * dt))
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
            canvas.removeEventListener("pointermove", onPointerMove)
            canvas.removeEventListener("pointerenter", onPointerMove)
            canvas.removeEventListener("pointerleave", onPointerLeave)
            canvas.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointerup", onPointerUp)
            window.removeEventListener("pointercancel", onPointerUp)
            ro.disconnect()
        }
    }, [])

    return (
        <div ref={rootRef} role="progressbar" aria-busy="true" style={{ position: "relative", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}
