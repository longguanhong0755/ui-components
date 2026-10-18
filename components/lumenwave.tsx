"use client"

/**
 * HalftoneLEDDot — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    dotPitch: 14,
    darkFill: 86,
    dotEdge: 0,
    loopS: 10,
    softEdge: 22,
    crestBreath: 15,
    patches: 50,
    topEdge: 10,
    topDrop: 16,
    bottomEdge: 48,
    bottomDrop: 16,
    maroonDepth: 13,
    crestGap: 4,
    crestWidth: 3,
    leftCrestY: 32,
    haloWidth: 8,
    haloStrength: 85,
    deepRed: "#B81C18",
    maroon: "#FF5500",
    maroonHi: "#FFFFFF",
    darkDot: "#000000",
    darkHi: "#FFFFFF",
    gold: "#FFAB00",
    hoverRadius: 15,
    hoverGrow: 6,
    grain: 0,
    vignette: 0,
    hover: 50,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{"deepRed":"moreColors","maroon":"moreColors","maroonHi":"moreColors","darkDot":"moreColors","darkHi":"moreColors","gold":"moreColors"},"out":{"deepRed":"advanced","maroon":"advanced","maroonHi":"advanced","darkDot":"advanced","darkHi":"advanced","gold":"advanced"}}
/** The "More Colors" group's defaults, for when Framer passes it unopened. */
const MORE_COLORS_DEFAULTS = { deepRed: "#B81C18", maroon: "#FF5500", maroonHi: "#FFFFFF", darkDot: "#000000", darkHi: "#FFFFFF", gold: "#FFAB00" }
const GROUP_FALLBACKS: Record<string, any> = { advanced: ADVANCED_DEFAULTS, moreColors: MORE_COLORS_DEFAULTS }
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
    dotSize?: number
    waveHeight?: number
    glow?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2)
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
    const c3 = (name: string, v: string | undefined, fb: RGBA) => {
        const c = parseColor(v, fb)
        gl.uniform3f(u(name), c[0], c[1], c[2])
    }
    const fill = clamp(num(p.dotSize, 84), 10, 100) / 100
    gl.uniform1f(u("uPitch"), clamp(num(adv.dotPitch, 14), 2, 80) * dpr)
    gl.uniform2f(u("uFill"), fill, fill * (clamp(num(adv.darkFill, 86), 10, 100) / 100))
    gl.uniform1f(u("uEdge"), Math.max(0.05, (clamp(num(adv.dotEdge, 70), 0, 300) / 100) * dpr))
    gl.uniform1f(u("uWave"), (clamp(num(p.waveHeight, 50), 0, 100) / 50) * 0.015)
    gl.uniform1f(u("uPeriod"), clamp(num(adv.loopS, 12), 1, 120))
    gl.uniform1f(u("uSoft"), Math.max(0.002, clamp(num(adv.softEdge, 22), 1, 100) / 1000))
    gl.uniform2f(u("uCrest"), clamp(num(p.glow, 100), 0, 200) / 100, clamp(num(adv.crestBreath, 15), 0, 100) / 100)
    gl.uniform1f(u("uPatch"), clamp(num(adv.patches, 50), 0, 100) / 100)
    gl.uniform2f(
        u("uHalo"),
        Math.max(0.005, clamp(num(adv.haloWidth, 8), 1, 40) / 100),
        clamp(num(adv.haloStrength, 85), 0, 100) / 100
    )
    gl.uniform4f(
        u("uShape"),
        num(adv.topEdge, 10) / 100,
        num(adv.topDrop, 16) / 100,
        num(adv.bottomEdge, 48) / 100,
        num(adv.bottomDrop, 16) / 100
    )
    gl.uniform4f(
        u("uShape2"),
        num(adv.maroonDepth, 13) / 100,
        num(adv.crestGap, 4) / 100,
        Math.max(0.002, num(adv.crestWidth, 3) / 100),
        num(adv.leftCrestY, 32) / 100
    )
    c3("uRedDeep", adv.deepRed, [0.72, 0.11, 0.09, 1])
    c3("uMaroon", adv.maroon, [0.26, 0.15, 0.16, 1])
    c3("uMaroonHi", adv.maroonHi, [0.33, 0.2, 0.21, 1])
    c3("uDark", adv.darkDot, [0.094, 0.09, 0.11, 1])
    c3("uDarkHi", adv.darkHi, [0.157, 0.145, 0.165, 1])
    c3("uGold", adv.gold, [0.97, 0.77, 0.35, 1])
    gl.uniform3f(
        u("uHoverP"),
        clamp(num(adv.hover, 50), 0, 100) / 50,
        Math.max(0.01, clamp(num(adv.hoverRadius, 15), 1, 100) / 100),
        clamp(num(adv.hoverGrow, 20), 0, 100) / 100
    )
    gl.uniform2f(u("uFx"), clamp(num(adv.grain, 0), 0, 100) / 100, clamp(num(adv.vignette, 0), 0, 100) / 100)
}

/* LED halftone: a fixed square grid of round dots, each sampling a flowing banded colour field at its cell centre.
   Every drift term is zero at t = 0 (the field equals the still) and periodic in uPeriod (seamless loop). */
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
uniform float uPitch;
uniform vec2 uFill;
uniform float uEdge;
uniform float uWave;
uniform float uPeriod;
uniform float uSoft;
uniform vec2 uCrest;
uniform vec2 uHalo;
uniform float uPatch;
uniform vec4 uShape;
uniform vec4 uShape2;
uniform vec3 uRedDeep;
uniform vec3 uMaroon;
uniform vec3 uMaroonHi;
uniform vec3 uDark;
uniform vec3 uDarkHi;
uniform vec3 uGold;
uniform vec3 uHoverP;
uniform vec2 uFx;
out vec4 outColor;

const float TAU = 6.28318530718;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm2(vec2 p) { return 0.65 * vnoise(p) + 0.35 * vnoise(p * 2.03 + 7.1); }

// Travelling wave minus its t = 0 value: crests move left to right, zero offset at the loop start.
float wv(float x, float k, float ph, float loopA) {
    return sin(TAU * k * x - loopA + ph) - sin(TAU * k * x + ph);
}
float band(float edge, float y) { return smoothstep(-uSoft, uSoft, y - edge); }
float gauss(float d, float s) { return exp(-(d * d) / max(s * s, 1e-6)); }

vec3 field(vec2 p, float t) {
    float x = p.x;
    float y = p.y;
    float loopA = TAU * t / max(uPeriod, 1e-3);
    float d1 = uWave * (0.6 * wv(x, 2.0, 0.3, loopA) + 0.4 * wv(x, 1.2, 2.1, loopA));
    float d2 = uWave * (0.6 * wv(x, 1.6, 1.1, loopA) + 0.4 * wv(x, 0.9, 4.0, loopA));
    float sink = uWave * (1.0 - cos(loopA)) * smoothstep(0.3, 1.0, x);

    float D = 0.075 + 0.02 * sin(x * 7.0 + 0.5) + d1 * 0.7;
    float T = uShape.x - 0.025 * gauss(x - 0.15, 0.08) + uShape.y * smoothstep(0.25, 1.0, x) + d1 + sink * 0.5;
    float B = uShape.z - 0.012 * sin(x * 6.0) + uShape.w * smoothstep(0.28, 1.0, x) + d2 + sink;
    float M = B + uShape2.x + 0.05 * smoothstep(0.2, 1.0, x) + d2 * 0.6;

    vec2 drift = 0.6 * vec2(cos(loopA) - 1.0, sin(loopA));
    float n = fbm2(vec2(x * 5.0, y * 7.0) + drift);

    vec3 col = uDark;
    // dim lighter wave across the top centre
    float lobe = gauss(x - 0.47, 0.12) * (1.0 - smoothstep(0.0, 0.07, y - d1 * 0.5));
    col = mix(col, uDarkHi, lobe);
    // muted maroon lobe above the ribbon on the right
    float upper = band(D, y) * (1.0 - band(T, y)) * smoothstep(0.3, 0.75, x);
    col = mix(col, uMaroon * 0.9, upper);

    // main red ribbon
    float u = clamp((y - T) / max(B - T, 1e-3), 0.0, 1.0);
    vec3 rib = uBase;
    rib = mix(rib, uRedDeep, (1.0 - smoothstep(0.05, 0.45, u)) * smoothstep(0.12, 0.5, x) * 0.8);
    rib = mix(rib, mix(uMaroon, uRedDeep, 0.45), (1.0 - smoothstep(0.0, 0.2, u)) * smoothstep(0.5, 0.9, x) * 0.55);
    rib = mix(rib, uRedDeep * 0.66, smoothstep(0.6, 0.85, n) * uPatch);

    // warm light: broad orange halos with gold cores — a left streak fading by mid-frame,
    // and a diagonal edge just above the ribbon's lower edge with orange spreading up over the right half
    float breath = 1.0 + uCrest.y * 0.5 * (1.0 - cos(loopA * 2.0));
    float yL = uShape2.w + d1 * 0.8 + 0.012 * sin(x * 5.0 + 1.0);
    float fadeL = 1.0 - smoothstep(0.08, 0.6, x);
    float yD = B - uShape2.y;
    float fadeD = smoothstep(0.32, 0.92, x);
    float haloL = gauss(y - yL, uHalo.x) * fadeL;
    float above = y < yD ? 1.6 : 0.6;
    float haloD = gauss(y - yD, uHalo.x * above) * fadeD;
    float coreL = gauss(y - yL, uShape2.z) * fadeL;
    float coreD = gauss(y - yD, uShape2.z) * (0.45 + 0.55 * fadeD) * smoothstep(0.3, 0.55, x);
    float halo = max(haloL, haloD) * uHalo.y * uCrest.x * breath;
    float core = max(coreL, coreD) * uCrest.x * breath;
    rib = mix(rib, uAccent, smoothstep(0.1, 0.85, halo) * 0.9);
    rib = mix(rib, uAccent, smoothstep(0.05, 0.4, core));
    rib = mix(rib, uGold, smoothstep(0.4, 1.0, core));
    col = mix(col, rib, band(T, y) * (1.0 - band(B, y)));

    // dusty maroon band with a lighter fold in its upper half
    float mh = max(M - B, 1e-3);
    float fold = gauss(y - (B + mh * 0.3), mh * 0.22);
    vec3 mar = mix(uMaroon, uMaroonHi, fold * 0.9);
    mar = mix(mar, uMaroon * 0.82, smoothstep(0.6, 0.9, n) * uPatch * 0.6);
    col = mix(col, mar, band(B, y) * (1.0 - band(M, y)));

    // second brown wave below a dark gap, stronger on the right
    float F0 = M + 0.04 + d2 * 0.4;
    float F1 = M + 0.13 + d1 * 0.3 + 0.03 * sin(x * 4.5 + 2.0);
    col = mix(col, mix(uDark, uMaroon, 0.7), band(F0, y) * (1.0 - band(F1, y)) * (0.55 + 0.45 * smoothstep(0.3, 0.9, x)));

    // third, faint wave near the bottom
    float G0 = F1 + 0.06 + d2 * 0.3;
    float G1 = G0 + 0.07 + 0.02 * sin(x * 3.0 + 0.4);
    col = mix(col, mix(uDark, uMaroon, 0.35), band(G0, y) * (1.0 - band(G1, y)));
    return col;
}

void main() {
    float pitch = max(uPitch * uScale, 2.0);
    vec2 res = max(uRes, vec2(1.0));
    vec2 off = mod(res, pitch) * 0.5;
    vec2 g = (gl_FragCoord.xy - off) / pitch;
    vec2 cell = floor(g);
    vec2 f = fract(g) - 0.5;
    vec2 cuv = ((cell + 0.5) * pitch + off) / res;
    vec3 col = field(vec2(cuv.x, 1.0 - cuv.y), uTime);

    // pointer: a soft swell, dots grow and brighten near it
    vec2 m = cuv - uMouse;
    m.y *= res.y / res.x;
    float r = max(uHoverP.y, 1e-3);
    float sw = uHover * uHoverP.x * exp(-dot(m, m) / (r * r));
    col *= 1.0 + 0.35 * sw;
    col += uAccent * 0.06 * sw;

    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float diam = mix(uFill.y, uFill.x, smoothstep(0.08, 0.3, lum)) * (1.0 + uHoverP.z * sw);
    float rad = 0.5 * min(diam, 1.0) * pitch;
    float d = length(f) * pitch;
    float a = 1.0 - smoothstep(rad - uEdge, rad + uEdge, d);
    vec3 outc = mix(uBg, col, a);

    vec2 uv = gl_FragCoord.xy / res;
    vec2 vq = (uv - 0.5) * vec2(res.x / res.y, 1.0);
    outc *= 1.0 - uFx.y * smoothstep(0.3, 1.1, length(vq)) * 0.85;
    float gr = h21(gl_FragCoord.xy + floor(uTime * 24.0) * 17.31) - 0.5;
    outc += gr * uFx.x * 0.18;
    outColor = vec4(clamp(outc, 0.0, 1.0), 1.0);
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

export default function HalftoneLEDDot(props: Props) {
    props = withMovedControls(props)
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#0B0B0F", baseColor = "#D8231A", accentColor = "#FFA100", speed = 100, scale = 122, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("HalftoneLEDDot shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("HalftoneLEDDot link:", gl.getProgramInfoLog(prog))
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
