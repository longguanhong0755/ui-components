"use client"

/**
 * DenseGridRound — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    rowPeriodMs: 600,
    sweepMs: 250,
    startPhase: 12,
    bandGap: 12,
    cyanHold: 112,
    cyanFade: 25,
    tailLevel: 40,
    tailLength: 80,
    orangeStart: 110,
    orangeHold: 200,
    emberLevel: 25,
    sprinkle: 4,
    drift: 20,
    viewAngle: 44,
    facing: 70,
    lens: 90,
    bend: 6,
    rowSpacing: 100,
    dotSize: 72,
    dotAspect: 100,
    nearGrow: 25,
    coreSize: 55,
    glowSize: 22,
    glowStrength: 85,
    unlitLevel: 50,
    shadowRows: 30,
    valleyY: 66,
    valleyDepth: 85,
    valleyMs: 4000,
    falloff: 35,
    shimmer: 10,
    fadeColor: "#0992B7",
    hotCyan: "#DFFFFF",
    orangeHot: "#FF8A4A",
    cream: "#ECDFAF",
    emberColor: "#4C1E25",
    hazeColor: "#001E35",
    grain: 0,
    vignette: 0,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    glowColor?: string
    tilt?: number
    blur?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

function clampN(v: unknown, d: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, num(v, d)))
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const f = (name: string, v: number) => gl.uniform1f(u(name), v)
    const c = (name: string, v: string | undefined, fb: string) => {
        const k = parseColor(v, parseColor(fb, [0, 0, 0, 1]))
        gl.uniform3f(u(name), k[0], k[1], k[2])
    }
    const period = clampN(adv.rowPeriodMs, 600, 100, 3000) / 1000
    const rad = Math.PI / 180

    // Camera-space plane: normal n (dot(n, P) = 1), row axis e1, column axis e2.
    const th = clampN(adv.viewAngle, 44, 0, 75) * rad
    const ph = clampN(adv.facing, 70, -180, 180) * rad
    const ps = clampN(p.tilt, 40, -90, 90) * rad
    const n = [-Math.sin(th) * Math.cos(ph), -Math.sin(th) * Math.sin(ph), Math.cos(th)]
    const a = [-Math.sin(ph), Math.cos(ph), 0]
    const b = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]]
    const e1 = [0, 1, 2].map((i) => -Math.cos(ps) * a[i] - Math.sin(ps) * b[i])
    const e2 = [0, 1, 2].map((i) => Math.sin(ps) * a[i] - Math.cos(ps) * b[i])
    gl.uniform3f(u("uN"), n[0], n[1], n[2])
    gl.uniform3f(u("uE1"), e1[0], e1[1], e1[2])
    gl.uniform3f(u("uE2"), e2[0], e2[1], e2[2])
    f("uF", clampN(adv.lens, 90, 30, 300) / 100)
    f("uZRef", 1 / Math.max(Math.cos(th), 0.05))

    c("uGlow", p.glowColor, "#26F5F4")
    c("uFade", adv.fadeColor, "#0992B7")
    c("uHotCyan", adv.hotCyan, "#DFFFFF")
    c("uOrangeHot", adv.orangeHot, "#FF8A4A")
    c("uCream", adv.cream, "#ECDFAF")
    c("uEmberCol", adv.emberColor, "#4C1E25")
    c("uHaze", adv.hazeColor, "#001E35")

    f("uBlur", (clampN(p.blur, 50, 0, 100) / 100) * 0.12)
    f("uBend", clampN(adv.bend, 6, -100, 100) / 100)
    f("uRowSp", clampN(adv.rowSpacing, 100, 40, 200) / 100)
    f("uDot", clampN(adv.dotSize, 72, 10, 100) / 100)
    f("uAspect", clampN(adv.dotAspect, 100, 50, 250) / 100)
    f("uNearGrow", clampN(adv.nearGrow, 25, 0, 100) / 100)
    f("uCore", clampN(adv.coreSize, 55, 5, 100) / 100)
    f("uGlowSize", clampN(adv.glowSize, 22, 1, 100) / 100)
    f("uGlowStr", clampN(adv.glowStrength, 85, 0, 200) / 100)

    f("uPeriod", period)
    f("uSweep", clampN(adv.sweepMs, 250, 50, 2000) / 1000 / period)
    f("uPhase", clampN(adv.startPhase, 12, 0, 100) / 100)
    f("uGap", clampN(adv.bandGap, 12, 4, 40))
    f("uCyanHold", clampN(adv.cyanHold, 112, 20, 400) / 100)
    f("uCyanFade", clampN(adv.cyanFade, 25, 5, 200) / 100)
    f("uTailLvl", clampN(adv.tailLevel, 40, 0, 100) / 100)
    f("uTailLen", clampN(adv.tailLength, 80, 0, 400) / 100)
    f("uOrStart", clampN(adv.orangeStart, 110, 0, 400) / 100)
    f("uOrHold", clampN(adv.orangeHold, 200, 30, 600) / 100)
    f("uEmber", clampN(adv.emberLevel, 25, 0, 100) / 100)
    f("uSprinkle", clampN(adv.sprinkle, 4, 0, 100) / 100)
    f("uDrift", clampN(adv.drift, 20, 0, 100) / 100)

    f("uUnlit", clampN(adv.unlitLevel, 50, 0, 100) / 100)
    f("uShadow", clampN(adv.shadowRows, 30, 0, 100) / 100)
    f("uValleyY", clampN(adv.valleyY, 66, 0, 100) / 100 - 0.5)
    f("uValleyDepth", clampN(adv.valleyDepth, 85, 0, 100) / 100)
    f("uValleyT", clampN(adv.valleyMs, 4000, 0, 20000) / 1000)
    f("uFalloff", clampN(adv.falloff, 35, 0, 100) / 100)
    f("uShimmer", clampN(adv.shimmer, 10, 0, 100) / 100)
    f("uGrain", clampN(adv.grain, 0, 0, 100) / 100)
    f("uVignette", clampN(adv.vignette, 0, 0, 100) / 100)
}

/*
 * LED dot field on a real perspective plane. Each pixel's ray hits the plane dot(n, P) = 1; the plane
 * coordinates (e1 = along a row, e2 = across rows) give the dot grid. Circles on the plane project to
 * foreshortened ellipses, and dots shrink toward the upper right, where the plane recedes. Lighting is keyed
 * to the row index: a cyan run sweeps left→right along a row, holds, fades to blue, and the cyan band climbs
 * one row per period. Every other row then ignites orange (ember → sweep → hold). Bands repeat every
 * `gap` rows, and the grid drifts slowly toward the viewer and to the left.
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
uniform vec3 uN;
uniform vec3 uE1;
uniform vec3 uE2;
uniform float uF;
uniform float uZRef;
uniform vec3 uGlow;
uniform vec3 uFade;
uniform vec3 uHotCyan;
uniform vec3 uOrangeHot;
uniform vec3 uCream;
uniform vec3 uEmberCol;
uniform vec3 uHaze;
uniform float uBlur;
uniform float uBend;
uniform float uRowSp;
uniform float uDot;
uniform float uAspect;
uniform float uNearGrow;
uniform float uCore;
uniform float uGlowSize;
uniform float uGlowStr;
uniform float uPeriod;
uniform float uSweep;
uniform float uPhase;
uniform float uGap;
uniform float uCyanHold;
uniform float uCyanFade;
uniform float uTailLvl;
uniform float uTailLen;
uniform float uOrStart;
uniform float uOrHold;
uniform float uEmber;
uniform float uSprinkle;
uniform float uDrift;
uniform float uUnlit;
uniform float uShadow;
uniform float uValleyY;
uniform float uValleyDepth;
uniform float uValleyT;
uniform float uFalloff;
uniform float uShimmer;
uniform float uGrain;
uniform float uVignette;
out vec4 outColor;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

// Plane row coordinate (in rows) of a screen point.
float planeRow(vec2 q, float pitch, float rs) {
    vec3 d = vec3(q, uF);
    return dot(d, uE2) / (max(dot(uN, d), 1e-3) * pitch * rs);
}

// Left->right ignition front along a row; q in band periods since this row's turn began.
float sweepIn(float q, float xc, float halfW) {
    float k = clamp(q / max(uSweep, 1e-3), 0.0, 1.0);
    k = 1.0 - (1.0 - k) * (1.0 - k);
    float front = -halfW - 0.15 + k * (2.0 * halfW + 0.3);
    return step(0.0, q) * smoothstep(-0.07, 0.07, front - xc);
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / max(uRes.y, 1.0);
    float halfW = 0.5 * uRes.x / max(uRes.y, 1.0);
    p.y -= uBend * p.x * p.x;
    float t = uTime;
    float pitch = 0.113 / max(uScale, 0.05);
    float rs = max(uRowSp, 0.1);
    float gap = max(2.0 * floor(uGap * 0.5), 2.0);

    vec3 ray = vec3(p, uF);
    float nd = dot(uN, ray);
    vec3 col = uBg;
    if (nd > 0.02) {
        vec2 pl = vec2(dot(ray, uE1), dot(ray, uE2)) / (nd * pitch);

        float du = mod(t * uDrift * 0.6, 64.0);
        float dv = mod(t * uDrift, gap);
        vec2 gc = vec2(pl.x + du, pl.y / rs + dv);
        vec2 cell = floor(gc);
        float fw = length(fwidth(gc));

        float jB = floor(planeRow(vec2(0.0, -0.336), pitch, rs));
        float vValley = planeRow(vec2(0.0, uValleyY), pitch, rs);
        float C = t / max(uPeriod, 1e-3) + uPhase;
        float breath = uValleyT > 0.0 ? 0.6 + 0.4 * cos(6.2831853 * t / max(uValleyT, 1e-3)) : 1.0;
        float vDepth = uValleyDepth * breath;
        vec2 mp = (uMouse - 0.5) * vec2(2.0 * halfW, 1.0);
        float gs = max(uGlowSize, 1e-3);

        vec3 sumC = vec3(0.0);
        vec3 sumH = vec3(0.0);
        float sumM = 0.0;
        for (int dj = -1; dj <= 1; dj++) {
            for (int di = -1; di <= 1; di++) {
                vec2 id = cell + vec2(float(di), float(dj));
                vec2 diff = gc - (id + 0.5);
                float dd = length(vec2(diff.x, diff.y * rs * uAspect));

                float cu = id.x + 0.5 - du;
                float cv = id.y + 0.5 - dv;
                vec3 Pc = uN + pitch * (cu * uE1 + cv * rs * uE2);
                float zc = max(Pc.z, 1e-3);
                vec2 sc = uF * Pc.xy / zc;
                float nearK = clamp((uZRef / zc - 0.4) / 1.2, 0.0, 1.0);

                float R = uDot * 0.5 * (1.0 + uNearGrow * (nearK - 0.5));
                float bl = uBlur * nearK * nearK + 0.75 * fw;
                float m = 1.0 - smoothstep(R - bl, R + bl, dd);

                float jr = id.y - jB;
                float jm = floor(mod(jr, gap) + 0.5);
                float im = floor(mod(id.x, 64.0) + 0.5);
                float rowLvl = h21(vec2(jm, 3.7)) < uShadow ? 0.35 : 0.8 + 0.4 * h21(vec2(jm, 9.1));
                float valley = 1.0 - vDepth * exp(-pow((cv - vValley) / 1.8, 2.0));
                float shim = 1.0 + uShimmer * sin(t * 2.6 + jm * 1.9);
                float grad = 1.0 - uFalloff * smoothstep(-halfW, halfW, sc.x);
                float litV = mix(1.0, valley, 0.6);

                // Cyan: sweep in, hold, fade to blue tail, then out.
                float qc = mod(C - jr, gap);
                float Lc = sweepIn(qc, sc.x, halfW)
                    * mix(1.0, uTailLvl, smoothstep(uCyanHold - uCyanFade, uCyanHold, qc))
                    * (1.0 - smoothstep(uCyanHold + uTailLen - 0.3, uCyanHold + uTailLen, qc));
                vec2 dm = sc - mp;
                Lc = max(Lc, uHover * 0.85 * exp(-dot(dm, dm) / 0.012));
                Lc *= grad * litV;

                // Orange: every other row, ember -> ignition sweep -> hold -> ember -> off.
                float isOr = step(0.5, mod(jr, 2.0));
                float qo = qc - uOrStart;
                float ign = sweepIn(qo, sc.x, halfW) * (1.0 - smoothstep(uOrHold - 0.25, uOrHold, qo));
                float emb = uEmber * smoothstep(-0.6, 0.0, qo) * (1.0 - smoothstep(uOrHold, uOrHold + 0.6, qo));
                float Lo = isOr * max(ign * mix(1.0, grad, 0.6) * litV, emb);
                float spr = step(h21(vec2(im, jm)), uSprinkle) * (1.0 - nearK);
                Lo = max(Lo, spr * uEmber * 0.9);

                float L0 = uUnlit * rowLvl * valley * shim;
                vec3 c = uBase * L0;
                vec3 cc = mix(uFade, uGlow, smoothstep(0.35, 0.9, Lc));
                c = mix(c, cc * (0.6 + 0.4 * Lc), smoothstep(0.0, 0.35, Lc));
                float wo = smoothstep(0.0, max(uEmber, 0.05), Lo);
                float oLit = smoothstep(uEmber, 1.0, Lo);
                vec3 oc = mix(uEmberCol, uAccent * (0.8 + 0.3 * oLit), oLit);
                c = mix(c, oc, wo);
                float coreK = 1.0 - smoothstep(R * uCore * 0.15, R * uCore, dd);
                c = mix(c, uHotCyan, coreK * smoothstep(0.7, 1.0, Lc) * (1.0 - wo));
                float oh = coreK * smoothstep(0.7, 1.0, Lo);
                c = mix(c, mix(uOrangeHot, uCream, smoothstep(0.5, 1.0, coreK)), oh);
                c *= mix(0.72, 1.0, 1.0 - smoothstep(R * 0.35, R, dd));

                float od = max(dd - R, 0.0);
                float halo = exp(-od * od / (gs * gs)) * (1.0 - m);
                float haze = exp(-od * od / (9.0 * gs * gs));
                float cyL = Lc * (1.0 - wo);
                sumH += halo * uGlowStr * (uGlow * cyL * 0.6 + uAccent * 0.75 * oLit)
                      + haze * uHaze * max(cyL, oLit) * 0.6;
                sumC += c * m;
                sumM += m;
            }
        }
        col = uBg * (1.0 - clamp(sumM, 0.0, 1.0)) + sumC + sumH;
    }

    vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));
    vec2 vq = (uv - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0);
    col *= 1.0 - uVignette * smoothstep(0.25, 0.9, length(vq));
    col += (h21(gl_FragCoord.xy + floor(t * 24.0) * 17.0) - 0.5) * uGrain * 0.16;
    outColor = vec4(max(col, vec3(0.0)), 1.0);
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

export default function DenseGridRound(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#02020F", baseColor = "#036B91", accentColor = "#FF4A17", speed = 50, scale = 300, hover = 100, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("DenseGridRound shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("DenseGridRound link:", gl.getProgramInfoLog(prog))
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
