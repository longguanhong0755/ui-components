"use client"

/**
 * GlowingEnergyBurst — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    coreX: 52,
    coreY: 47,
    armSpread: 26,
    twist: 360,
    bend: 0,
    morph: 400,
    fold: 50,
    foldWaves: 10,
    irregular: 0,
    armAngle: 0,
    flowSpeed: 300,
    dustDensity: 80,
    dustSize: 80,
    dustBright: 80,
    glowWidth: 2,
    glowStrength: 100,
    rimStrength: 50,
    midColor: "#5A6098",
    rimColor: "#B5C1ED",
    glowColor: "#34388A",
    dustColor: "#E4E9FF",
    rayLenMin: 18,
    rayLenMax: 60,
    rayStart: 10,
    rayTick: 90,
    rayWidth: 110,
    rayBright: 90,
    coreSize: 100,
    coreGlow: 100,
    spikes: 8,
    ringLife: 1650,
    ringStart: 4,
    ringEnd: 59,
    ringEase: 160,
    ringThick: 4,
    ringOpacity: 80,
    ringOffset: 500,
    ringAspect: 72,
    grain: 0,
    vignette: 0,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"midColor":"advanced","rimColor":"advanced","glowColor":"advanced","dustColor":"advanced"}}
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
    arms?: number
    rays?: number
    ringInterval?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const cl = (v: unknown, d: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, num(v, d)))
    const D = Math.PI / 180
    const col = (name: string, v: string | undefined, fb: RGBA) => {
        const c = parseColor(v, fb)
        gl.uniform3f(u(name), c[0], c[1], c[2])
    }
    gl.uniform1f(u("uArms"), Math.round(cl(p.arms, 4, 3, 30)))
    gl.uniform1f(u("uRays"), Math.round(cl(p.rays, 48, 0, 60)))
    gl.uniform1f(u("uRingPeriod"), cl(p.ringInterval, 2, 0, 6))
    gl.uniform2f(u("uCore"), cl(adv.coreX, 52, 0, 100) / 100, 1 - cl(adv.coreY, 47, 0, 100) / 100)
    gl.uniform4f(
        u("uArm"),
        cl(adv.armSpread, 26, 0, 60) / 100,
        cl(adv.twist, 70, -360, 360) * D,
        cl(adv.bend, 15, 0, 90) * D,
        cl(adv.morph, 100, 0, 400) / 100
    )
    gl.uniform4f(
        u("uArm2"),
        cl(adv.fold, 40, 0, 95) / 100,
        cl(adv.foldWaves, 6, 0, 40),
        cl(adv.irregular, 100, 0, 300) / 100,
        cl(adv.armAngle, -5, -180, 180) * D
    )
    gl.uniform4f(
        u("uDust"),
        cl(adv.flowSpeed, 50, 0, 300) / 100,
        cl(adv.dustDensity, 80, 0, 100) / 100,
        (cl(adv.dustSize, 80, 20, 400) / 100) * 0.0015,
        cl(adv.dustBright, 80, 0, 300) / 100
    )
    gl.uniform4f(
        u("uBand"),
        Math.max(0.002, cl(adv.glowWidth, 2, 0, 20) / 100),
        cl(adv.glowStrength, 100, 0, 300) / 100,
        cl(adv.rimStrength, 50, 0, 300) / 100,
        0
    )
    col("uMid", adv.midColor, [0.35, 0.38, 0.6, 1])
    col("uRim", adv.rimColor, [0.71, 0.76, 0.93, 1])
    col("uGlow", adv.glowColor, [0.2, 0.22, 0.54, 1])
    col("uDustCol", adv.dustColor, [0.89, 0.91, 1, 1])
    const lo = cl(adv.rayLenMin, 18, 1, 100) / 100
    const hi = Math.max(lo, cl(adv.rayLenMax, 60, 1, 150) / 100)
    gl.uniform4f(
        u("uRay"),
        lo,
        hi,
        Math.max(0.02, cl(adv.rayStart, 10, 2, 80) / 100),
        Math.max(0.016, cl(adv.rayTick, 90, 16, 2000) / 1000)
    )
    gl.uniform2f(u("uRay2"), (0.0012 * cl(adv.rayWidth, 110, 20, 500)) / 100, cl(adv.rayBright, 90, 0, 300) / 100)
    gl.uniform3f(
        u("uCoreP"),
        cl(adv.coreSize, 100, 10, 400) / 100,
        cl(adv.coreGlow, 100, 0, 300) / 100,
        Math.round(cl(adv.spikes, 8, 0, 24))
    )
    gl.uniform4f(
        u("uRing"),
        Math.max(0.1, cl(adv.ringLife, 1650, 100, 10000) / 1000),
        cl(adv.ringStart, 4, 0, 100) / 100,
        cl(adv.ringEnd, 59, 1, 200) / 100,
        Math.max(0.2, cl(adv.ringEase, 160, 20, 500) / 100)
    )
    gl.uniform4f(
        u("uRing2"),
        Math.max(0.002, cl(adv.ringThick, 4, 0, 30) / 100),
        cl(adv.ringOpacity, 80, 0, 100) / 100,
        cl(adv.ringOffset, 500, 0, 10000) / 1000,
        Math.max(0.1, cl(adv.ringAspect, 72, 10, 200) / 100)
    )
    gl.uniform2f(u("uFx"), cl(adv.grain, 0, 0, 100) / 100, cl(adv.vignette, 0, 0, 100) / 100)
}

/*
 * Energy burst: wide dust ribbons streaming outward along noise-bent arms (log-radial flow,
 * dr/dt = v0·(0.15 + r)), flickering straight rays snapped on a fixed tick, a white core,
 * and an elliptical dust ring emitted every period that grows as R0 + (R1 − R0)·x^ease.
 * Arms are placed so they leave the frame right / up / left / lower-left as in the reference.
 * Everything is additive on black.
 */
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
uniform float uArms;
uniform float uRays;
uniform float uRingPeriod;
uniform vec2 uCore;
uniform vec4 uArm;
uniform vec4 uArm2;
uniform vec4 uDust;
uniform vec4 uBand;
uniform vec3 uMid;
uniform vec3 uRim;
uniform vec3 uGlow;
uniform vec3 uDustCol;
uniform vec4 uRay;
uniform vec2 uRay2;
uniform vec3 uCoreP;
uniform vec4 uRing;
uniform vec4 uRing2;
uniform vec2 uFx;
out vec4 outColor;

const float PI = 3.14159265;
const float TAU = 6.28318531;
const float CELL = 0.012;
const float WRAP = 512.0;
const float ACROSS = 14.0;

float h11(float n) { return fract(sin(n * 127.1 + 0.3) * 43758.5453); }
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float wrapA(float a) { return mod(a + PI, TAU) - PI; }

// One dot per lattice cell. g = lattice coords, cs = frame units per cell, wrap = period of the x ids.
float dots(vec2 g, vec2 cs, float density, float rad, float seed, float wrap) {
    vec2 id = floor(g);
    vec2 f = g - id;
    vec2 hid = vec2(mod(id.x, wrap), id.y) + seed;
    float h = h21(hid);
    if (h >= density) return 0.0;
    vec2 pos = 0.22 + 0.56 * vec2(h21(hid + 17.3), h21(hid + 41.7));
    float b = h21(hid + 7.1);
    float rr = rad * (0.75 + 0.9 * b * b * b);
    float d = length((f - pos) * cs);
    return smoothstep(rr, rr * 0.2, d) * (0.45 + 0.55 * b);
}

vec3 shoulder(vec3 c) {
    vec3 k = 0.78 + 0.22 * (1.0 - exp(-(c - 0.78) / 0.22));
    return mix(c, k, step(0.78, c));
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    float sc = max(uScale, 0.05);
    float invW = 1.0 / max(uRes.x, 1.0);
    vec2 p = (frag - uCore * uRes) * invW / sc;
    float pxs = invW / sc;
    float r = length(p);
    float a = atan(p.y, p.x);
    float t = uTime;
    vec3 col = vec3(0.0);
    // Hover now drives a global glow boost — the whole burst (bands, core,
    // rays) brightens together while hovered, instead of a local cursor dot.
    float glowBoost = 1.0 + uHover * 0.9;

    // ── dust ribbons ──
    float rad = max(uDust.z, 0.7 * pxs);
    float flow = mod(uDust.x * t, WRAP * CELL);
    float sAlong = (log(0.15 + r) - flow) / CELL;
    float alongSz = CELL * (0.15 + r);
    float dustIn = smoothstep(0.0, 0.04, r);
    float N = clamp(uArms, 1.0, 30.0);
    float m = uArm.w * t;

    for (int i = 0; i < 30; i++) {
        float fi = float(i);
        if (fi >= N) break;
        float s1 = h11(fi + 1.3);
        float s2 = h11(fi + 7.9);
        float s3 = h11(fi + 13.1);
        // exit angles for 4 arms ≈ -5°, 78°, 170°, -118° (right, up, left, lower-left)
        float jit = i == 0 ? 0.0 : i == 1 ? -0.12 : i == 2 ? -0.09 : i == 3 ? -0.40 : (s1 - 0.5) * 0.6;
        float base = uArm2.w + fi * TAU / N + jit * uArm2.z - uArm.y * 0.45 + 0.12 * sin(0.23 * m + s2 * TAU);
        float th = base + uArm.y * r
            + uArm.z * (sin(2.6 * r - 0.9 * m + s2 * TAU) + 0.6 * sin(5.3 * r + 0.55 * m + s3 * TAU));
        float d = wrapA(a - th) * r;
        float fold = 1.0 - uArm2.x * (1.0 - abs(cos(uArm2.y * r - 0.7 * m + s1 * TAU)));
        float hw = max((0.008 + uArm.x * r) * fold, 0.002);
        float x = abs(d) / hw;
        float lift = 1.0 + 0.4 * (1.0 - fold);
        float inside = smoothstep(1.04, 0.88, x);
        float rim = clamp(exp(-pow((x - 0.86) / 0.12, 2.0)) * 0.8 * uBand.z, 0.0, 1.0);
        vec3 body = mix(mix(uMid, uBase, smoothstep(0.2, 0.9, x)), uRim, rim) * inside * lift * 0.85;
        float glow = exp(-max(abs(d) - hw * 0.92, 0.0) / uBand.x) * (1.0 - inside) * uBand.y * glowBoost;
        col += body + uGlow * glow;

        float mask = smoothstep(1.35, 0.8, x) * dustIn;
        if (mask > 0.002) {
            float uc = d / hw * ACROSS;
            vec2 cz = vec2(alongSz, hw / ACROSS);
            float dd = dots(vec2(sAlong, uc), cz, uDust.y * mask, rad, fi * 31.0 + 3.0, WRAP)
                + dots(vec2(sAlong * 1.5 + 0.5, uc * 1.21 + 0.5), cz / vec2(1.5, 1.21), uDust.y * mask * 0.7, rad, fi * 31.0 + 90.0, WRAP * 1.5);
            col += uDustCol * dd * uDust.w;
        }
    }
    // a few stray motes in the black
    float stray = dots(vec2(sAlong, a / TAU * 600.0), vec2(alongSz, TAU / 600.0 * max(r, 0.01)), 0.012, rad, 777.0, WRAP);
    col += uDustCol * stray * dustIn * 0.5 * uDust.w;

    // ── rays: one candidate per angular sector, re-rolled on a fixed tick ──
    vec3 rayCol = vec3(0.0);
    if (uRays > 0.5) {
        const float K = 72.0;
        float sj = floor(a / TAU * K);
        float rw = max(uRay2.x, 0.6 * pxs);
        for (int k = -1; k <= 1; k++) {
            float j = mod(sj + float(k), K);
            float tick = mod(floor(t / uRay.w + h11(j * 3.7 + 0.5)), 997.0);
            vec2 sd = vec2(j, tick);
            float ang = (j + 0.15 + 0.7 * h21(sd + 11.0)) / K * TAU;
            float bias = 0.55 + 0.45 * abs(cos(ang)) + 0.6 * exp(-pow(wrapA(ang + 0.785) / 0.35, 2.0));
            if (h21(sd) >= uRays / K * bias) continue;
            vec2 dir = vec2(cos(ang), sin(ang));
            float along = dot(p, dir);
            float st = mix(0.02, uRay.z, h21(sd + 23.0));
            float len = mix(uRay.x, uRay.y, h21(sd + 37.0));
            float en = st + len;
            float seg = smoothstep(st, st + 0.015, along) * smoothstep(en, en - 0.025, along);
            if (seg <= 0.0) continue;
            float perp = abs(p.x * dir.y - p.y * dir.x);
            float line = smoothstep(rw, 0.0, perp) + 0.3 * exp(-perp / (2.5 * rw));
            float uu = clamp((along - st) / max(len, 1e-4), 0.0, 1.0);
            float prof = 0.6 + 0.4 * max(1.0 - uu * 3.0, 0.0) + 0.3 * smoothstep(0.7, 1.0, uu);
            float far = step(0.8, h21(sd + 51.0));
            float fl = 0.7 + 0.6 * h21(sd + 61.0);
            rayCol += mix(uAccent, uMid * 1.2, far) * line * seg * prof * mix(fl, 0.6, far);
        }
    }
    col += rayCol * uRay2.y * glowBoost;

    // ── core ──
    float coreS = uCoreP.x;
    float ctick = mod(floor(t / uRay.w), 997.0);
    float pulse = 0.85 + 0.3 * h11(ctick + 5.0);
    float coreDot = smoothstep(0.0055 * coreS, 0.0015 * coreS, r);
    float g1 = exp(-r / (0.009 * coreS));
    float g2 = exp(-r / (0.024 * coreS));
    vec3 core = vec3(coreDot) + mix(uRim, vec3(1.0), g1) * g1 * 1.1 + uBase * g2 * 0.4;
    if (uCoreP.z > 0.5) {
        float stp = TAU / uCoreP.z;
        float xs = a / stp + h11(ctick + 9.0);
        float dth = (fract(xs) - 0.5) * stp;
        float perp = r * abs(sin(dth));
        float sl = 0.028 + 0.027 * h11(mod(floor(xs), uCoreP.z) + ctick * 1.3);
        float spike = smoothstep(1.3 * pxs, 0.0, perp) * smoothstep(sl * coreS, 0.0, r) * smoothstep(0.002, 0.006, r);
        core += vec3(spike * 0.9);
    }
    col += core * uCoreP.y * pulse * glowBoost;

    // ── expanding dust ring ──
    if (uRingPeriod > 0.0) {
        vec2 q = p - vec2(-0.015, -0.01);
        q.y /= uRing2.w;
        float re = length(q);
        float ra = atan(q.y, q.x);
        float P = max(uRingPeriod, 0.5);
        float rt = t + uRing2.z;
        float kNow = floor(rt / P);
        for (int k = 0; k < 2; k++) {
            float kk = kNow - float(k);
            float x = (rt - kk * P) / uRing.x;
            if (x > 1.3) continue;
            float seed = mod(kk, 97.0);
            float R = uRing.y + (uRing.z - uRing.y) * pow(max(x, 0.0), uRing.w);
            R *= 1.0 + 0.06 * sin(3.0 * ra + h11(seed) * TAU) + 0.04 * sin(5.0 * ra + h11(seed + 3.0) * TAU);
            float hwR = 0.5 * uRing2.x * (1.0 + min(x, 1.3));
            float off = (re - R) / hwR;
            float band = exp(-off * off * 1.2);
            if (band < 0.01) continue;
            float alpha = uRing2.y * mix(1.0, 0.57, clamp(x, 0.0, 1.0)) * smoothstep(0.0, 0.1, x) * (1.0 - smoothstep(1.0, 1.3, x));
            col += uGlow * band * alpha * 0.6;
            vec2 g = vec2(ra / TAU * 480.0, off * 2.5 + 20.0);
            vec2 cz = vec2(TAU / 480.0 * max(re, 0.01), hwR / 2.5);
            float dv = dots(g, cz, 0.7 * band, rad, seed * 13.0 + 300.0, WRAP);
            col += mix(uBase, uRim, 0.6) * dv * alpha * 1.4;
        }
    }

    // ── pointer glint: a soft cursor highlight on top of the global boost ──
    vec2 mo = frag / uRes - uMouse;
    mo.x *= uRes.x / max(uRes.y, 1.0);
    col += uRim * uHover * 0.2 * exp(-dot(mo, mo) * 22.0);

    col = shoulder(uBg + col);
    vec2 uv = frag / uRes;
    col *= 1.0 - uFx.y * smoothstep(0.4, 1.0, length(uv - 0.5) * 1.414);
    col += (h21(frag + fract(t * 7.0) * 91.0) - 0.5) * uFx.x * 0.18;
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

export default function GlowingEnergyBurst(props: Props) {
    props = withMovedControls(props)
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#939BD0", accentColor = "#5A9BFF", speed = 30, scale = 100, hover = 100, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("GlowingEnergyBurst shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("GlowingEnergyBurst link:", gl.getProgramInfoLog(prog))
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
