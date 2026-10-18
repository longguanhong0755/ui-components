"use client"

/**
 * FullFramePixel — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    cellPx: 17,
    bandCells: 19,
    tongueCells: 11,
    tongueHeight: 105,
    sharpness: 204,
    lean: 40,
    drift: 50,
    riseMs: 6000,
    flickerRate: 72,
    stretch: 18,
    sway: 8,
    blackLine: 120,
    goldLine: 120,
    tipShare: 35,
    mottle: 100,
    groutShade: 42,
    rounded: 15,
    tileShade: 14,
    embers: 50,
    emberSpeed: 5,
    seed: 7,
    deepColor: "#9A0E0C",
    brightColor: "#CC1A18",
    amberColor: "#B8701F",
    tanColor: "#F2CC8A",
    tipColor: "#FFF0D0",
    emberColor: "#E8A030",
    hover: 100,
    hoverRadius: 20,
    grain: 0,
    vignette: 0,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{"deepColor":"colors","brightColor":"colors","amberColor":"colors","tanColor":"colors","tipColor":"colors","emberColor":"colors"},"out":{"deepColor":"advanced","brightColor":"advanced","amberColor":"advanced","tanColor":"advanced","tipColor":"advanced","emberColor":"advanced"}}
/** The "Colors" group's defaults, for when Framer passes it unopened. */
const COLORS_DEFAULTS = { deepColor: "#F9FF00", brightColor: "#004EFF", amberColor: "#4000FF", tanColor: "#F2CC8A", tipColor: "#FFF0D0", emberColor: "#F6FF00" }
const GROUP_FALLBACKS: Record<string, any> = { advanced: ADVANCED_DEFAULTS, colors: COLORS_DEFAULTS }
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
    flicker?: number
    grout?: number
    curl?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

function clampN(v: unknown, lo: number, hi: number, d: number): number {
    return Math.max(lo, Math.min(hi, num(v, d)))
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const f1 = (n: string, v: number) => gl.uniform1f(u(n), v)
    const c3 = (n: string, s: string | undefined, fb: RGBA) => {
        const c = parseColor(s, fb)
        gl.uniform3f(u(n), c[0], c[1], c[2])
    }
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1
    const scale = clampN(p.scale, 10, 300, 100) / 100
    const band = clampN(adv.bandCells, 4, 80, 19)
    const col = clampN(adv.tongueCells, 3, 60, 11)
    const riseS = clampN(adv.riseMs, 500, 60000, 6000) / 1000

    f1("uCell", clampN(adv.cellPx, 2, 80, 17) * dpr * scale)
    f1("uBand", band)
    f1("uCol", col)
    f1("uAmp", clampN(adv.tongueHeight, 0, 250, 105) / 100)
    f1("uSharp", clampN(adv.sharpness, 50, 400, 160) / 100)
    f1("uLean", clampN(adv.lean, 0, 100, 40) / 100)
    f1("uDrift", (clampN(adv.drift, 0, 100, 50) / 100) * col)
    f1("uCurl", (clampN(p.curl, 0, 100, 25) / 100) * col)
    f1("uWarpF", (clampN(adv.sway, 0, 60, 8) / 100) * col)
    f1("uFlick", clampN(p.flicker, 0, 100, 50) / 50)
    f1("uStretch", clampN(adv.stretch, 0, 60, 18) / 100)
    f1("uHz", clampN(adv.flickerRate, 0, 300, 72) / 60)
    f1("uRise", band / riseS)
    f1("uLineB", clampN(adv.blackLine, 0, 500, 120) / 100)
    f1("uLineG", clampN(adv.goldLine, 0, 500, 120) / 100)
    f1("uTipShare", clampN(adv.tipShare, 0, 100, 35) / 100)
    f1("uMottle", clampN(adv.mottle, 0, 100, 100) / 100)
    f1("uGrout", clampN(p.grout, 0, 40, 14) / 100)
    f1("uGroutShade", clampN(adv.groutShade, 0, 100, 42) / 100)
    f1("uRound", clampN(adv.rounded, 0, 100, 15) / 100)
    f1("uTileShade", clampN(adv.tileShade, 0, 60, 14) / 100)
    f1("uEmbers", clampN(adv.embers, 0, 100, 50) / 100)
    f1("uEmberRate", clampN(adv.emberSpeed, 0, 30, 5))
    f1("uSeed", clampN(adv.seed, 0, 100, 7))
    f1("uHoverK", clampN(adv.hover, 0, 100, 50) / 50)
    f1("uRadius", clampN(adv.hoverRadius, 1, 100, 20) / 100)
    f1("uGrain", clampN(adv.grain, 0, 100, 0) / 100)
    f1("uVignette", clampN(adv.vignette, 0, 100, 0) / 100)
    c3("uDeep", adv.deepColor, [0.6, 0.05, 0.05, 1])
    c3("uBright", adv.brightColor, [0.8, 0.1, 0.09, 1])
    c3("uAmber", adv.amberColor, [0.72, 0.44, 0.12, 1])
    c3("uTan", adv.tanColor, [0.95, 0.8, 0.54, 1])
    c3("uTip", adv.tipColor, [1, 0.94, 0.82, 1])
    c3("uEmber", adv.emberColor, [0.91, 0.63, 0.19, 1])
}

/* Mosaic flames: a continuous rising flame field (level sets of a tongue profile) sampled at
   tile centres; each level line is drawn as a black outline above and a gold rim below. */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform float uScale;
uniform float uCell, uBand, uCol, uAmp, uSharp, uLean, uDrift, uCurl, uWarpF, uFlick, uStretch, uHz, uRise;
uniform float uLineB, uLineG, uTipShare, uMottle, uGrout, uGroutShade, uRound, uTileShade;
uniform float uEmbers, uEmberRate, uSeed, uHoverK, uRadius, uGrain, uVignette;
uniform vec3 uDeep, uBright, uAmber, uTan, uTip, uEmber;
out vec4 outColor;
const float TAU = 6.2831853;
float h11(float n) { return fract(sin(n * 127.1 + uSeed * 13.7) * 43758.5453); }
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
// v in band units; info = (profile, tongue hash, stretch phase, triangle)
float field(vec2 p, float grow, out vec4 info) {
    float t = uTime;
    float bh = max(uBand, 1.0);
    float cw = max(uCol, 1.0);
    float ys = p.y - t * uRise;
    float tier = ys / bh;
    float wx = (vnoise(vec2(p.x * 0.05 + uSeed * 3.1, ys * 0.06)) - 0.5) * 2.0 * uCurl
             + (vnoise(vec2(p.x * 0.09 + 31.7, ys * 0.12 - t * uHz * 1.1)) - 0.5) * 2.0 * uWarpF * uFlick;
    // tiers drift sideways by a slow random amount, so stagger and lean vary in both directions
    float drift = (vnoise(vec2(tier * 0.6 + uSeed, 7.3)) - 0.5) * 2.0 * uDrift;
    float xs = p.x + wx + drift;
    float id = floor(xs / cw);
    float u = fract(xs / cw);
    float hs = h11(id);
    float c = clamp(0.5 + (hs - 0.5) * uLean, 0.15, 0.85);
    float tri = clamp(u < c ? u / c : (1.0 - u) / (1.0 - c), 0.0, 1.0);
    float prof = pow(tri, max(uSharp, 0.1));
    float ph = vnoise(vec2(id * 2.13 + 5.0, tier * 0.7)) * TAU * 3.0;
    float st = sin(TAU * uHz * t + ph);
    float h = 0.6 + 0.55 * vnoise(vec2(id * 1.37 + 11.0, tier * 0.8 + uSeed)) + uStretch * uFlick * st;
    info = vec4(prof, hs, st, tri);
    return tier - uAmp * h * grow * prof;
}
void main() {
    float cell = max(uCell, 1.0);
    vec2 fc = gl_FragCoord.xy;
    vec2 gp = fc / cell;
    vec2 c = floor(gp);
    vec2 lc = fract(gp) - 0.5;
    vec2 p = c + 0.5;

    // pointer: tongues lean away and grow near it
    vec2 pm = uMouse * uRes / cell;
    vec2 dlt = p - pm;
    float R = max(uRadius * uRes.x / cell, 1.0);
    float w = clamp(uHover * uHoverK, 0.0, 2.0) * exp(-dot(dlt, dlt) / (R * R));
    vec2 ps = p - dlt / max(length(dlt), 1e-3) * w * 3.0;
    float grow = 1.0 + 0.2 * w;

    vec4 info, i1, i2;
    float v0 = field(ps, grow, info);
    float v1 = field(ps + vec2(1.0, 0.0), grow, i1);
    float v2 = field(ps + vec2(0.0, 1.0), grow, i2);
    vec2 g = vec2(v1 - v0, v2 - v0);
    float gLen = max(length(g), 1e-4);
    float f = fract(v0);
    float dUp = f / gLen;
    float dDn = (1.0 - f) / gLen;
    float vDn = (1.0 - f) * max(uBand, 1.0);
    float side = clamp(g.x / gLen, -1.0, 1.0);
    float tipT = smoothstep(0.8, 1.0, info.x);
    float bW = uLineB * (1.0 - 0.5 * side) * (1.0 - 0.35 * tipT);
    float gW = uLineG * (1.0 + 0.35 * side) * (1.0 - 0.2 * tipT);

    float hc = h21(c + uSeed);
    float hc2 = h21(c * 1.31 + 17.0 + uSeed);
    vec3 tile;
    if (dUp < bW) {
        tile = uBg * (0.8 + 0.4 * hc);
    } else if (dDn < gW) {
        tile = hc2 < 0.33 ? uAmber : uAccent;
        if (info.w > 0.9 && vDn < 3.0) tile = uTan;
        if (info.w > 0.95 && vDn < 1.8 && info.y < uTipShare && info.z > -0.2) tile = uTip;
        tile += uAccent * 0.15 * w;
    } else {
        float m = hc * 0.55 + vnoise(c * 0.13 + uSeed) * 0.45;
        tile = uBase;
        tile = mix(tile, uDeep, step(m, 0.3) * uMottle);
        tile = mix(tile, uBright, step(0.74, m) * uMottle);
        // embers: lone gold tiles climbing one cell at a time
        float L = 12.0;
        float yy = c.y - uTime * uEmberRate;
        float seg = floor(yy / L);
        float o = floor(h21(vec2(c.x, seg) + uSeed * 0.37) * L);
        float here = step(abs(floor(yy - seg * L) - o), 0.5);
        float on = step(h21(vec2(c.x + 3.7, seg) + uSeed), uEmbers * 0.16);
        float alive = step(fract(uTime * 0.18 + h21(vec2(c.x, seg) + 9.1)), 0.7);
        tile = mix(tile, uEmber, here * on * alive);
    }

    // tile face with grout seam
    float inset = clamp(uGrout, 0.0, 0.45) * 0.5;
    float hw = 0.5 - inset;
    float rad = clamp(uRound, 0.0, 1.0) * hw;
    vec2 q = abs(lc) - (hw - rad);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
    float aa = 1.0 / cell;
    float mask = 1.0 - smoothstep(-aa, aa, d);
    vec3 face = tile * (1.0 + uTileShade * (0.5 - 2.0 * dot(lc, lc)));
    vec3 col = mix(tile * uGroutShade, face, mask);

    vec2 uv = fc / max(uRes, vec2(1.0));
    col *= 1.0 - uVignette * smoothstep(0.35, 1.0, length(uv - 0.5) * 1.414);
    col += (h21(fc + fract(uTime * 7.13) * 97.0) - 0.5) * uGrain * 0.25;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

// ══ /EFFECT ═════════════════════════════════════════════════════════════════

interface Props extends EffectProps {
    background?: string
    baseColor?: string
    accentColor?: string
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

export default function FullFramePixel(props: Props) {
    props = withMovedControls(props)
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#1A0505", baseColor = "#0E00FF", accentColor = "#3CE3CF", speed = 50, scale = 100, style } = props
    void [baseColor, accentColor, speed, scale]
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("FullFramePixel shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("FullFramePixel link:", gl.getProgramInfoLog(prog))
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
            // Raw 0..1: the FRAG scales it by the Advanced `hover` row (RULES.md).
            gl.uniform1f(u("uHover"), hov)
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
