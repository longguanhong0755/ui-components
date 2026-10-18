"use client"

/**
 * ThreeThinMetal — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    outerSpeed: 120,
    midSpeed: -30,
    innerSpeed: 150,
    drift: 30,
    outerPhase: 30,
    midPhase: 80,
    innerPhase: 60,
    roll: 15,
    rollSwing: 12,
    wobble: 90,
    cycle: 12,
    outerBand: 7,
    outerDepth: 20,
    midSize: 82,
    innerSize: 73,
    bandHeight: 30,
    bandThick: 3,
    perspective: 6,
    segments: 200,
    lightX: -50,
    lightY: 60,
    specPower: 40,
    specular: 140,
    fresnel: 50,
    envLift: 20,
    innerTint: 85,
    depthShade: 20,
    rimColor: "#D04FE0",
    midColor: "#B9A6D6",
    steelColor: "#6F6A8E",
    shadowColor: "#3B3550",
    glowColor: "#B43CDC",
    glowSize: 5,
    hover: 50,
    grain: 0,
    vignette: 0,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    innerColor?: string
    rings?: number
    glow?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

const RG_MAX_SEG = 256
const RG_MAX_Q = RG_MAX_SEG * 4 * 5
const RG_DEG = Math.PI / 180
/** `size` is the diameter at the 1200×800 frame; the drawing follows the frame's short side. */
const RG_REF_SHORT = 800

interface Effect {
    t: number
    tiltX: number
    tiltY: number
    boost: number
    reduced: boolean
    off: HTMLCanvasElement | null
    octx: CanvasRenderingContext2D | null
    noise: CanvasPattern | null
    segN: number
    cosT: Float32Array
    sinT: Float32Array
    cosM: Float32Array
    sinM: Float32Array
    wx: Float32Array
    wy: Float32Array
    wz: Float32Array
    sx: Float32Array
    sy: Float32Array
    qx: Float32Array
    qy: Float32Array
    qd: Float32Array
    qc: string[]
    order: number[]
}

interface RgEnv {
    stops: number[]
    mid: RGBA
    rim: RGBA
    inner: RGBA
    lx: number
    ly: number
    lz: number
    specPow: number
    spec: number
    fres: number
    lift: number
    depth: number
}

function rgClamp(v: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, v))
}

function rgMul(a: number[], b: number[]): number[] {
    const o: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]
    return o
}
function rgRx(a: number): number[] {
    const c = Math.cos(a), s = Math.sin(a)
    return [1, 0, 0, 0, c, -s, 0, s, c]
}
function rgRy(a: number): number[] {
    const c = Math.cos(a), s = Math.sin(a)
    return [c, 0, s, 0, 1, 0, -s, 0, c]
}
function rgRz(a: number): number[] {
    const c = Math.cos(a), s = Math.sin(a)
    return [c, -s, 0, s, c, 0, 0, 0, 1]
}

function rgMix(a: RGBA, b: RGBA, f: number): RGBA {
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, 1]
}

function rgShade(e: RgEnv, nx: number, ny: number, nz: number, vx: number, vy: number, vz: number, innerAmt: number, zc: number): string {
    const nv = Math.max(0, nx * vx + ny * vy + nz * vz)
    // Reflected view ray → chrome studio environment: white sky, magenta, a steel
    // horizon band, orchid body, dark steel floor.
    const rx = 2 * nv * nx - vx, ry = 2 * nv * ny - vy, rz = 2 * nv * nz - vz
    const y = rgClamp(ry * 0.85 - rx * 0.3 + e.lift, -1, 1)
    const s = e.stops
    let r = s[1], g = s[2], b = s[3]
    for (let i = 4; i < s.length; i += 4) {
        if (y <= s[i]) {
            const p0 = s[i - 4]
            let f = (y - p0) / Math.max(1e-4, s[i] - p0)
            f = f * f * (3 - 2 * f)
            r = s[i - 3] + (s[i + 1] - s[i - 3]) * f
            g = s[i - 2] + (s[i + 2] - s[i - 2]) * f
            b = s[i - 1] + (s[i + 3] - s[i - 1]) * f
            break
        }
        r = s[i + 1]; g = s[i + 2]; b = s[i + 3]
    }
    // Cool lavender softbox on the right.
    const lw = Math.pow(Math.max(0, rx), 2) * 0.6 * (1 - Math.abs(ry))
    r += (e.mid[0] - r) * lw; g += (e.mid[1] - g) * lw; b += (e.mid[2] - b) * lw
    // Magenta fresnel rim.
    const fr = rgClamp(Math.pow(1 - nv, 3) * e.fres * 0.7, 0, 1)
    r += (e.rim[0] - r) * fr; g += (e.rim[1] - g) * fr; b += (e.rim[2] - b) * fr
    // Inner faces glow hot pink-red, keeping the chrome's light/dark streaks.
    if (innerAmt > 0) {
        const m = 0.55 + 1.1 * (0.3 * r + 0.59 * g + 0.11 * b)
        r += (e.inner[0] * m - r) * innerAmt
        g += (e.inner[1] * m - g) * innerAmt
        b += (e.inner[2] * m - b) * innerAmt
    }
    const sp = Math.pow(Math.max(0, rx * e.lx + ry * e.ly + rz * e.lz), e.specPow) * e.spec
    r += sp; g += sp * 0.94; b += sp
    const d = 1 - e.depth * rgClamp(-zc, 0, 1)
    const to = (v: number) => Math.round(rgClamp(v * d, 0, 1) * 255)
    return `rgb(${to(r)},${to(g)},${to(b)})`
}

function bakeEffect(stage: Stage, _p: Props): Effect {
    let off: HTMLCanvasElement | null = null
    let octx: CanvasRenderingContext2D | null = null
    let noise: CanvasPattern | null = null
    if (typeof document !== "undefined") {
        off = document.createElement("canvas")
        octx = off.getContext("2d")
        const nc = document.createElement("canvas")
        nc.width = 128
        nc.height = 128
        const nctx = nc.getContext("2d")
        if (nctx) {
            const img = nctx.createImageData(128, 128)
            for (let i = 0; i < 128 * 128; i++) {
                const v = Math.random() * 255
                img.data[i * 4] = v
                img.data[i * 4 + 1] = v
                img.data[i * 4 + 2] = v
                img.data[i * 4 + 3] = Math.random() * 140
            }
            nctx.putImageData(img, 0, 0)
            noise = stage.ctx.createPattern(nc, "repeat")
        }
    }
    const reduced = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const qc: string[] = new Array<string>(RG_MAX_Q).fill("")
    return {
        t: 0, tiltX: 0, tiltY: 0, boost: 0, reduced, off, octx, noise, segN: 0,
        cosT: new Float32Array(RG_MAX_SEG), sinT: new Float32Array(RG_MAX_SEG),
        cosM: new Float32Array(RG_MAX_SEG), sinM: new Float32Array(RG_MAX_SEG),
        wx: new Float32Array(RG_MAX_SEG * 4), wy: new Float32Array(RG_MAX_SEG * 4), wz: new Float32Array(RG_MAX_SEG * 4),
        sx: new Float32Array(RG_MAX_SEG * 4), sy: new Float32Array(RG_MAX_SEG * 4),
        qx: new Float32Array(RG_MAX_Q * 4), qy: new Float32Array(RG_MAX_Q * 4), qd: new Float32Array(RG_MAX_Q),
        qc, order: [],
    }
}

/**
 * One frame. `clock` is seconds of speed-scaled time; `progress` is 0..1
 * (eased) or null when indeterminate. (cx, cy) is the centre, `size` the
 * loader's diameter in CSS px at the 1200×800 frame.
 */
function drawEffect(stage: Stage, fx: Effect, p: Props, cx: number, cy: number, size: number, clock: number, progress: number | null, dt: number): void {
    void clock
    void progress
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const ctx = stage.ctx
    const dpr = stage.dpr
    if (!fx.off || !fx.octx) return
    const octx = fx.octx
    const S = size * (Math.max(1, Math.min(stage.W, stage.H)) / RG_REF_SHORT)

    // ── pointer: the gimbal tilts toward the pointer, a press spins it faster ──
    const k = Math.max(0, num(adv.hover, 50)) / 50
    const ed = dt > 0 ? dt : 1 / 60
    const reach = Math.max(1, S)
    const over = stage.pointer.over
    const txT = over * k * rgClamp((stage.pointer.x - cx) / reach, -1, 1)
    const tyT = over * k * rgClamp((stage.pointer.y - cy) / reach, -1, 1)
    const ease = 1 - Math.exp(-5 * ed)
    fx.tiltX += (txT - fx.tiltX) * ease
    fx.tiltY += (tyT - fx.tiltY) * ease
    const pressed = stage.pointer.down && over > 0.3
    fx.boost += ((pressed ? k : 0) - fx.boost) * (1 - Math.exp(-4 * ed))
    if (!fx.reduced) fx.t += dt * (1 + 1.2 * fx.boost)
    const t = fx.t

    // ── segment tables ──
    const N = Math.round(rgClamp(num(adv.segments, 200), 24, RG_MAX_SEG))
    if (N !== fx.segN) {
        fx.segN = N
        for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2, m = ((i + 0.5) / N) * Math.PI * 2
            fx.cosT[i] = Math.cos(a); fx.sinT[i] = Math.sin(a)
            fx.cosM[i] = Math.cos(m); fx.sinM[i] = Math.sin(m)
        }
    }

    // ── chrome material ──
    const hl = parseColor(p.color, [0.93, 0.79, 0.95, 1])
    const body = parseColor(p.accent, [0.65, 0.33, 0.81, 1])
    const sh = parseColor(adv.shadowColor, [0.23, 0.21, 0.31, 1])
    const steel = parseColor(adv.steelColor, [0.44, 0.42, 0.56, 1])
    const rimC = parseColor(adv.rimColor, [0.82, 0.31, 0.88, 1])
    const deep = rgMix(sh, [0, 0, 0, 1], 0.55)
    const bodyHi = rgMix(body, hl, 0.35)
    const top = rgMix(hl, [1, 1, 1, 1], 0.7)
    const lxr = num(adv.lightX, -50) / 100, lyr = num(adv.lightY, 60) / 100, lzr = 0.7
    const ll = Math.max(1e-4, Math.hypot(lxr, lyr, lzr))
    const env: RgEnv = {
        stops: [
            -1, deep[0], deep[1], deep[2],
            -0.55, sh[0], sh[1], sh[2],
            -0.25, body[0], body[1], body[2],
            -0.02, bodyHi[0], bodyHi[1], bodyHi[2],
            0.1, steel[0], steel[1], steel[2],
            0.28, rimC[0], rimC[1], rimC[2],
            0.55, hl[0], hl[1], hl[2],
            1, top[0], top[1], top[2],
        ],
        mid: parseColor(adv.midColor, [0.73, 0.65, 0.84, 1]),
        rim: rimC,
        inner: parseColor(p.innerColor, [0.93, 0.17, 0.36, 1]),
        lx: lxr / ll, ly: lyr / ll, lz: lzr / ll,
        specPow: Math.max(1, num(adv.specPower, 40)),
        spec: Math.max(0, num(adv.specular, 140)) / 100,
        fres: Math.max(0, num(adv.fresnel, 50)) / 100,
        lift: num(adv.envLift, 20) / 100,
        depth: rgClamp(num(adv.depthShade, 20), 0, 100) / 100,
    }

    // ── gimbal orientation ──
    const ang = (sp: number, ph: number) => (ph + sp * t) * RG_DEG
    const L = Math.max(1, num(adv.cycle, 12))
    const wob = num(adv.wobble, 25) * RG_DEG * Math.sin((2 * Math.PI * t) / L)
    const roll = (num(adv.roll, 15) + num(adv.rollSwing, 12) * Math.sin((4 * Math.PI * t) / L)) * RG_DEG
    const A = rgMul(rgMul(rgRy(fx.tiltX * 0.45), rgRx(fx.tiltY * 0.45)), rgMul(rgRz(-roll), rgRx(wob)))
    const oS = num(adv.outerSpeed, 120), mS = num(adv.midSpeed, -30), iS = num(adv.innerSpeed, 150)
    const M0 = rgMul(A, rgRy(ang(oS, num(adv.outerPhase, 30))))
    const MB = rgMul(M0, rgRy(ang(mS, num(adv.midPhase, 80))))
    const MC = rgMul(rgMul(M0, rgRz(ang(num(adv.drift, 30), 0))), rgRx(ang(iS, num(adv.innerPhase, 60))))
    const MD = rgMul(MC, rgRy(ang(oS * 0.75, 45)))
    const ME = rgMul(MD, rgRx(ang(iS * 0.8, 20)))

    const band = Math.max(0.005, num(adv.bandThick, 3) / 100)
    const bh = Math.max(0.01, num(adv.bandHeight, 30) / 100)
    const tint = rgClamp(num(adv.innerTint, 85), 0, 100) / 100
    const inS = Math.max(0.05, num(adv.innerSize, 73) / 100)
    const rings = [
        { M: M0, R: 1, th: Math.max(0.005, num(adv.outerBand, 7) / 100), hh: Math.max(0.005, num(adv.outerDepth, 20) / 200), inner: tint * 0.6 },
        { M: MB, R: Math.max(0.05, num(adv.midSize, 82) / 100), th: band, hh: bh / 2, inner: tint },
        { M: MC, R: inS, th: band, hh: (bh * 0.95) / 2, inner: tint },
        { M: MD, R: inS * 0.8, th: band, hh: (bh * 0.8) / 2, inner: tint },
        { M: ME, R: inS * 0.64, th: band, hh: (bh * 0.68) / 2, inner: tint },
    ]
    const count = Math.round(rgClamp(num(p.rings, 3), 1, 5))

    // ── offscreen layer (for the glow) ──
    const glowPx = Math.max(0, (S * num(adv.glowSize, 5)) / 100)
    const side = Math.ceil(S * 1.5 + glowPx * 4)
    const pxSide = Math.max(1, Math.ceil(side * dpr))
    if (fx.off.width !== pxSide || fx.off.height !== pxSide) {
        fx.off.width = pxSide
        fx.off.height = pxSide
    }
    octx.setTransform(dpr, 0, 0, dpr, 0, 0)
    octx.clearRect(0, 0, side, side)
    const oc = side / 2
    const unit = S / 2
    const D = Math.max(2, num(adv.perspective, 6))

    // ── build quads ──
    const { wx, wy, wz, sx, sy, qx, qy, qd, qc } = fx
    let q = 0
    const push = (a: number, b: number, c: number, d: number, nx: number, ny: number, nz: number, innerAmt: number) => {
        const mx = (wx[a] + wx[b] + wx[c] + wx[d]) / 4
        const my = (wy[a] + wy[b] + wy[c] + wy[d]) / 4
        const mz = (wz[a] + wz[b] + wz[c] + wz[d]) / 4
        let vx = -mx, vy = -my, vz = D - mz
        const d2 = vx * vx + vy * vy + vz * vz
        const vl = Math.max(1e-4, Math.sqrt(d2))
        vx /= vl; vy /= vl; vz /= vl
        if (nx * vx + ny * vy + nz * vz <= 0) return
        const o = q * 4
        qx[o] = sx[a]; qy[o] = sy[a]
        qx[o + 1] = sx[b]; qy[o + 1] = sy[b]
        qx[o + 2] = sx[c]; qy[o + 2] = sy[c]
        qx[o + 3] = sx[d]; qy[o + 3] = sy[d]
        qd[q] = d2
        qc[q] = rgShade(env, nx, ny, nz, vx, vy, vz, innerAmt, mz)
        q++
    }
    for (let r = 0; r < count; r++) {
        const ring = rings[r]
        const M = ring.M
        const Ro = ring.R, Ri = Math.max(0.01, ring.R - ring.th), hh = ring.hh
        for (let i = 0; i < N; i++) {
            const c = fx.cosT[i], s = fx.sinT[i]
            for (let layer = 0; layer < 4; layer++) {
                const rad = layer < 2 ? Ro : Ri
                const z = layer % 2 === 0 ? hh : -hh
                const lx = rad * c, ly = rad * s
                const X = M[0] * lx + M[1] * ly + M[2] * z
                const Y = M[3] * lx + M[4] * ly + M[5] * z
                const Z = M[6] * lx + M[7] * ly + M[8] * z
                const idx = layer * N + i
                wx[idx] = X; wy[idx] = Y; wz[idx] = Z
                const per = D / Math.max(0.2, D - Z)
                sx[idx] = oc + X * unit * per
                sy[idx] = oc - Y * unit * per
            }
        }
        const nfx = M[2], nfy = M[5], nfz = M[8]
        for (let i = 0; i < N; i++) {
            const j = (i + 1) % N
            const cm = fx.cosM[i], sm = fx.sinM[i]
            const nx = M[0] * cm + M[1] * sm, ny = M[3] * cm + M[4] * sm, nz = M[6] * cm + M[7] * sm
            const OT = 0, OB = N, IT = 2 * N, IB = 3 * N
            push(OT + i, OT + j, OB + j, OB + i, nx, ny, nz, 0)
            push(IT + i, IT + j, IB + j, IB + i, -nx, -ny, -nz, ring.inner)
            push(IT + i, OT + i, OT + j, IT + j, nfx, nfy, nfz, 0)
            push(IB + i, OB + i, OB + j, IB + j, -nfx, -nfy, -nfz, 0)
        }
    }

    // ── painter's sort, far → near ──
    const ord = fx.order
    ord.length = q
    for (let i = 0; i < q; i++) ord[i] = i
    ord.sort((a, b) => qd[b] - qd[a])
    octx.lineWidth = 0.8
    octx.lineJoin = "round"
    for (let n = 0; n < q; n++) {
        const qi = ord[n]
        const o = qi * 4
        octx.beginPath()
        octx.moveTo(qx[o], qy[o])
        octx.lineTo(qx[o + 1], qy[o + 1])
        octx.lineTo(qx[o + 2], qy[o + 2])
        octx.lineTo(qx[o + 3], qy[o + 3])
        octx.closePath()
        octx.fillStyle = qc[qi]
        octx.strokeStyle = qc[qi]
        octx.fill()
        octx.stroke()
    }

    // ── composite with a soft magenta bloom (brightens while pressed) ──
    ctx.save()
    const g = rgClamp(num(p.glow, 25), 0, 100) / 100 + fx.boost * 0.15
    if (g > 0 && glowPx > 0) {
        const gc = parseColor(adv.glowColor, [0.71, 0.24, 0.86, 1])
        ctx.shadowColor = cssRgba([gc[0], gc[1], gc[2], Math.min(1, g * 2.5)])
        ctx.shadowBlur = glowPx * dpr
    }
    ctx.drawImage(fx.off, cx - side / 2, cy - side / 2, side, side)
    ctx.restore()

    // ── grain and vignette overlays ──
    const gr = rgClamp(num(adv.grain, 0), 0, 100) / 100
    if (gr > 0 && fx.noise) {
        ctx.save()
        ctx.globalAlpha = gr * 0.35
        ctx.translate(-Math.random() * 128, -Math.random() * 128)
        ctx.fillStyle = fx.noise
        ctx.fillRect(0, 0, stage.W + 128, stage.H + 128)
        ctx.restore()
    }
    const vg = rgClamp(num(adv.vignette, 0), 0, 100) / 100
    if (vg > 0) {
        const rad = Math.max(1, Math.hypot(stage.W, stage.H) / 2)
        const grad = ctx.createRadialGradient(stage.W / 2, stage.H / 2, rad * 0.35, stage.W / 2, stage.H / 2, rad)
        grad.addColorStop(0, "rgba(0,0,0,0)")
        grad.addColorStop(1, `rgba(0,0,0,${vg * 0.85})`)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, stage.W, stage.H)
    }
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

export default function ThreeThinMetal(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", color = "#FFFFFF", accent = "#8000FF", size = 300, speed = 50, style } = props
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
