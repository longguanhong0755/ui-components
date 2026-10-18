"use client"

/**
 * ClipStackFixed — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    periodMs: 4950,
    startMs: 600,
    frontSpeed: 29,
    startWidth: 5,
    igniteMs: 150,
    drainStartMs: 3750,
    drainSpeed: 62,
    drainFadeMs: 500,
    linesPerStep: 2,
    centerX: 50,
    coreColor: "#FFF0EC",
    offColor: "#8A8E96",
    coreWeight: 4,
    thinWeight: 2,
    thinOpacity: 60,
    glowRadius: 14,
    hazeRadius: 55,
    haze: 85,
    hollow: 45,
    streaks: 170,
    offOpacity: 50,
    shimmer: 3,
    grain: 0,
    vignette: 0,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    rows?: number
    angle?: number
    glow?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

function clampN(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v))
}

let REDUCED_MOTION: boolean | null = null
function prefersReducedMotion(): boolean {
    if (REDUCED_MOTION === null) {
        REDUCED_MOTION =
            typeof window !== "undefined" &&
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
    }
    return REDUCED_MOTION
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const f = (name: string, v: number) => gl.uniform1f(u(name), v)
    const c = (name: string, v: string | undefined, fb: RGBA) => {
        const k = parseColor(v, fb)
        gl.uniform3f(u(name), k[0], k[1], k[2])
    }
    f("uRows", clampN(num(p.rows, 20), 2, 120))
    f("uAngle", clampN(num(p.angle, 14), 0, 100) / 100)
    f("uGlow", clampN(num(p.glow, 70), 0, 100) / 100)
    f("uFrozen", prefersReducedMotion() ? 1 : 0)
    f("uPeriod", Math.max(500, num(adv.periodMs, 4950)) / 1000)
    f("uStart", Math.max(0, num(adv.startMs, 600)) / 1000)
    f("uFront", Math.max(1, num(adv.frontSpeed, 29)) / 100)
    f("uStartW", clampN(num(adv.startWidth, 5), 0, 100) / 100)
    f("uIgnite", Math.max(1, num(adv.igniteMs, 150)) / 1000)
    f("uDrainStart", Math.max(0, num(adv.drainStartMs, 3750)) / 1000)
    f("uDrainSpeed", Math.max(1, num(adv.drainSpeed, 62)) / 100)
    f("uDrainFade", Math.max(10, num(adv.drainFadeMs, 500)) / 1000)
    f("uTier", clampN(Math.round(num(adv.linesPerStep, 2)), 1, 8))
    f("uCenter", clampN(num(adv.centerX, 50), 0, 100) / 100)
    c("uCore", adv.coreColor, [1, 0.941, 0.925, 1])
    c("uOff", adv.offColor, [0.541, 0.557, 0.588, 1])
    f("uCoreW", Math.max(0.5, num(adv.coreWeight, 4)))
    f("uThinW", Math.max(0.5, num(adv.thinWeight, 2)))
    f("uThinA", clampN(num(adv.thinOpacity, 60), 0, 100) / 100)
    f("uGlowR", Math.max(0, num(adv.glowRadius, 14)))
    f("uHazeR", Math.max(0, num(adv.hazeRadius, 55)))
    f("uHaze", clampN(num(adv.haze, 85), 0, 200) / 100)
    f("uHollow", clampN(num(adv.hollow, 45), 0, 100) / 100)
    f("uStreak", clampN(num(adv.streaks, 170), 0, 300) / 100)
    f("uOffA", clampN(num(adv.offOpacity, 50), 0, 100) / 100)
    f("uDrift", clampN(num(adv.shimmer, 3), 0, 100) / 100)
    f("uGrain", clampN(num(adv.grain, 0), 0, 100) / 100)
    f("uVignette", clampN(num(adv.vignette, 0), 0, 100) / 100)
}

/*
 * Fixed grid of horizontal neon lines over blurred grey streak bands.
 * Lines are grouped in steps (thin + bright pair); each step lights a fixed delay after
 * the one above and its lit width grows linearly out from the centre, so the lit set forms
 * a straight-edged V whose tip walks down. Then the red drains top → bottom at full width
 * (core goes pale, glow fades) back to grey hairlines. Two cycles are evaluated so the
 * previous drain overlaps the next ignition.
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
uniform float uRows;
uniform float uAngle;
uniform float uGlow;
uniform float uFrozen;
uniform float uPeriod;
uniform float uStart;
uniform float uFront;
uniform float uStartW;
uniform float uIgnite;
uniform float uDrainStart;
uniform float uDrainSpeed;
uniform float uDrainFade;
uniform float uTier;
uniform float uCenter;
uniform vec3 uCore;
uniform vec3 uOff;
uniform float uCoreW;
uniform float uThinW;
uniform float uThinA;
uniform float uGlowR;
uniform float uHazeR;
uniform float uHaze;
uniform float uHollow;
uniform float uStreak;
uniform float uOffA;
uniform float uDrift;
uniform float uGrain;
uniform float uVignette;
out vec4 outColor;

float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn1(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash11(i), hash11(i + 1.0), f);
}

// (ignite 0..1, drain 0..1, lit half-width in frame widths)
vec3 linePhase(float j, float yc, float t) {
    float tier = max(uTier, 1.0);
    float tierH = tier / max(uRows, 1.0);
    float k = floor((j + 0.5) / tier);
    float delay = tierH / max(uFront, 1e-3);
    float on = uStart + k * delay;
    float ig = smoothstep(on, on + max(uIgnite, 1e-3), t);
    float grow = uAngle * uFront / 0.1;
    float hw = min(uStartW * 0.5 + grow * max(t - on, 0.0), 4.0);
    float dOn = uDrainStart + yc / max(uDrainSpeed, 1e-3);
    float s = clamp((t - dOn) / max(uDrainFade, 1e-3), 0.0, 1.0);
    return vec3(ig, s, hw);
}

void main() {
    vec2 fc = gl_FragCoord.xy;
    float W = max(uRes.x, 1.0);
    float H = max(uRes.y, 1.0);
    vec2 uv = fc / vec2(W, H);
    float x = uv.x;
    float y = 1.0 - uv.y;
    float px = H / 800.0;
    float sc = max(uScale, 0.05);
    float N = max(uRows, 2.0);
    float P = max(uPeriod, 0.5);
    float T = uFrozen > 0.5 ? 0.0 : uTime;
    float t = uFrozen > 0.5 ? 3.4 : mod(T, P);

    // grey long-exposure streak bands: wide soft smears, brightest mid-frame
    float streak = 0.0;
    float bc = floor(y * N + 0.5);
    for (int o = -1; o <= 1; o++) {
        float b = bc + float(o);
        float h1 = hash11(b * 7.13 + 1.7);
        float h2 = hash11(b * 3.31 + 9.2);
        float h3 = hash11(b * 5.77 + 4.4);
        float yc = (b + (h1 - 0.5) * 0.4) / N;
        float hh = (0.3 + 0.45 * h2) / N;
        float dy = (y - yc) / max(hh, 1e-4);
        float vp = exp(-dy * dy * 1.6);
        float dir = h3 < 0.5 ? -1.0 : 1.0;
        float xn = vn1((x + dir * T * uDrift) * 4.0 + b * 1.93) * 0.65
                 + vn1((x - dir * T * uDrift * 1.3) * 9.0 - b * 2.71) * 0.35;
        float cxs = (x - 0.5) / 0.4;
        float cb = 0.6 + 0.4 * exp(-cxs * cxs);
        streak += vp * (0.45 + 0.55 * h3) * smoothstep(0.1, 0.85, xn) * cb;
    }
    vec3 col = uBg + uBase * streak * uStreak * 0.55;

    // neon lines
    float glowAmp = uGlow * 1.5;
    float glowRad = max(uGlowR * px * sc * (0.5 + uGlow * 0.75), 0.5);
    float hazeRad = max(uHazeR * px * sc, 1.0);
    vec3 add = vec3(0.0);
    float haze = 0.0;
    float jc = floor(y * N);
    vec3 pale = mix(uCore, uOff, 0.45) * 0.85;
    float tier = max(uTier, 1.0);
    for (int o = -4; o <= 4; o++) {
        float j = jc + float(o);
        if (j < 0.0 || j > N - 1.0) continue;
        float yc = (j + 0.5) / N;
        float dyPx = (y - yc) * H;
        float within = j - floor((j + 0.5) / tier) * tier;
        bool thin = tier > 1.5 && within < tier - 0.5;
        float wgt = thin ? uThinA : 1.0;

        vec3 s0 = linePhase(j, yc, t);
        vec3 s1 = linePhase(j, yc, t + P);
        vec3 st = s1.x * (1.0 - s1.y) > s0.x * (1.0 - s0.y) ? s1 : s0;
        float ig = st.x;
        float s = st.y;
        float hwPx = st.z * W;
        float axPx = abs(x - uCenter) * W;
        float halfT = (thin ? uThinW : uCoreW) * 0.5 * px * sc;
        float L = max(hwPx - halfT, 0.0);
        float d = length(vec2(max(axPx - L, 0.0), dyPx));

        // off-state grey hairline wherever the neon is not lit
        float lid = ig * (1.0 - smoothstep(hwPx - 2.0, hwPx + 2.0, axPx)) * (1.0 - s);
        float offHalf = max(0.7 * px * sc, 0.5);
        float offM = 1.0 - smoothstep(offHalf - 0.5, offHalf + 0.9, abs(dyPx));
        float hd = hash11(j * 2.17 + 0.3) < 0.5 ? -1.0 : 1.0;
        float nx = smoothstep(0.2, 0.85, vn1((x + hd * T * uDrift) * 2.5 + j * 3.7));
        add += uOff * uOffA * nx * offM * (thin ? 0.7 : 1.0) * (1.0 - lid);

        if (ig > 0.0) {
            float core = 1.0 - smoothstep(max(halfT - 0.8, 0.0), halfT + 0.8, d);
            vec3 cc = s < 0.4 ? mix(uCore, pale, s / 0.4) : mix(pale, vec3(0.0), (s - 0.4) / 0.6);
            float endT = smoothstep(hwPx * 0.6, hwPx + 1.0, axPx);
            cc *= mix(vec3(1.0), vec3(0.87, 0.64, 0.64), endT);
            add += cc * core * ig * wgt * 1.2;
            float g = ig * (1.0 - smoothstep(0.1, 1.0, s)) * wgt;
            float rim = halfT * 3.0 + 1.5;
            add += mix(uAccent, uCore, 0.45) * g * 0.8 * exp(-d * d / (rim * rim));
            add += uAccent * g * glowAmp * exp(-d * d / (glowRad * glowRad));
            haze += g * exp(-d * d / (hazeRad * hazeRad));
        }
    }

    // shared red haze, thinner in a soft central column, blotchy along the bands
    float cx = (x - uCenter) / 0.12;
    float hollow = 1.0 - uHollow * exp(-cx * cx) * (1.0 - 0.6 * y);
    float blot = 0.55 + 0.9 * vn1((x + T * uDrift * 0.5) * 4.0 + floor(y * N * 0.5) * 2.3);
    float hz = 1.0 - exp(-haze * uHaze * 1.6 * (uGlow / 0.6) * hollow * blot);
    col += uAccent * 0.9 * hz;
    // the grey streaks catch the red light where the haze is
    col += uAccent * streak * hz * 0.45;
    col += add;

    vec2 m = uv - uMouse;
    m.x *= W / H;
    col += uAccent * uHover * 0.3 * exp(-dot(m, m) * 14.0);
    col = min(col, vec3(1.0));

    vec2 q = uv - 0.5;
    col *= 1.0 - uVignette * 0.85 * smoothstep(0.2, 0.75, length(q));
    col += (h21(fc + floor(T * 24.0) * 17.0) - 0.5) * uGrain * 0.2;
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

export default function ClipStackFixed(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#010001", baseColor = "#5C5E6C", accentColor = "#A51D23", speed = 50, scale = 100, hover = 100, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("ClipStackFixed shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("ClipStackFixed link:", gl.getProgramInfoLog(prog))
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
