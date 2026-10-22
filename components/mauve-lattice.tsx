"use client"

/**
 * FieldShortParallel — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    dashLen: 58,
    dashThick: 9,
    laneGap: 17,
    pitch: 70,
    stagger: 50,
    jitter: 30,
    travel: 4,
    cycleS: 8,
    laneVar: 25,
    noiseScale: 170,
    stretch: 160,
    drift: 16,
    evolve: 6,
    contrast: 120,
    level: 18,
    range: 60,
    dashJitter: 16,
    muted: 40,
    twinkle: 8,
    twinkleRise: 400,
    twinkleFall: 800,
    warmColor: "#C25A78",
    coolColor: "#5B3F9E",
    tint: 50,
    tintScale: 40,
    hoverRadius: 12,
    hoverBoost: 40,
    edgeSoft: 100,
    seed: 3,
    grain: 0,
    vignette: 0,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    angle?: number
    density?: number
    highlight?: string
    hover?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const n = (v: unknown, d: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, num(v, d)))
    const hi = parseColor(p.highlight, [0.94, 0.82, 0.93, 1])
    const warm = parseColor(adv.warmColor, [0.76, 0.35, 0.47, 1])
    const cool = parseColor(adv.coolColor, [0.36, 0.25, 0.62, 1])
    gl.uniform1f(u("uAngle"), (n(p.angle, 57, 0, 180) * Math.PI) / 180)
    // Sizes are px on an 800 px tall stage, so the lattice keeps its share of the height.
    // Density scales only the empty space between dashes (35 = as tuned, 100 = nearly touching,
    // 0 = 2.5× the gap); dash size and colour are untouched.
    const d = n(p.density, 35, 0, 100)
    const gapK = d <= 35 ? 1 + ((35 - d) / 35) * 1.5 : 1 - ((d - 35) / 65) * 0.85
    const pitch0 = n(adv.pitch, 70, 6, 300)
    const lane0 = n(adv.laneGap, 17, 2, 120)
    const dashL = Math.min(n(adv.dashLen, 58, 4, 200), pitch0)
    const dashT = Math.min(n(adv.dashThick, 9, 1, 60), lane0)
    gl.uniform4f(
        u("uGeo"),
        n(adv.dashLen, 58, 4, 200) / 800,
        n(adv.dashThick, 9, 1, 60) / 800,
        (dashT + (lane0 - dashT) * gapK) / 800,
        (dashL + (pitch0 - dashL) * gapK) / 800
    )
    gl.uniform4f(
        u("uLane"),
        n(adv.stagger, 50, 0, 100) / 100,
        n(adv.jitter, 30, 0, 100) / 100,
        Math.round(n(adv.travel, 4, 0, 12)),
        n(adv.laneVar, 25, 0, 50) / 100
    )
    gl.uniform4f(
        u("uField"),
        n(adv.noiseScale, 170, 20, 1000) / 100,
        n(adv.drift, 16, 0, 200) / 100,
        n(adv.evolve, 6, 0, 100) / 100,
        n(adv.seed, 3, 0, 100)
    )
    gl.uniform4f(
        u("uLevel"),
        n(adv.contrast, 120, 50, 400) / 100,
        n(adv.level, 18, 0, 80) / 100,
        n(adv.dashJitter, 16, 0, 50) / 100,
        0
    )
    gl.uniform4f(
        u("uTw"),
        n(adv.twinkle, 8, 0, 100) / 100,
        n(adv.twinkleRise, 400, 50, 4000) / 1000,
        n(adv.twinkleFall, 800, 50, 4000) / 1000,
        n(adv.cycleS, 8, 2, 30)
    )
    gl.uniform4f(
        u("uTint"),
        n(adv.tint, 50, 0, 100) / 100,
        n(adv.tintScale, 40, 5, 300) / 100,
        n(adv.hoverRadius, 22, 1, 100) / 100,
        n(adv.hoverBoost, 40, 0, 100) / 100
    )
    gl.uniform4f(
        u("uFx"),
        n(adv.grain, 0, 0, 100) / 100,
        n(adv.vignette, 0, 0, 100) / 100,
        n(p.hover, 50, 0, 100) / 50,
        n(adv.edgeSoft, 100, 25, 400) / 100
    )
    gl.uniform4f(
        u("uRange"),
        n(adv.range, 60, 10, 200) / 100,
        n(adv.stretch, 160, 50, 400) / 100,
        n(adv.muted, 40, 0, 100) / 100,
        0
    )
    gl.uniform3f(u("uHi"), hi[0], hi[1], hi[2])
    gl.uniform3f(u("uWarm"), warm[0], warm[1], warm[2])
    gl.uniform3f(u("uCool"), cool[0], cool[1], cool[2])
}

/*
 * Diagonal dash lattice: pixel → lane space (u along the dash, v across), lane index,
 * per-lane brick/jitter offset and scroll (whole pitches per cycle, so it loops), cell index,
 * capsule SDF. Each dash is one flat colour from a drifting fbm field (stretched along the
 * dashes) sampled at its centre, pushed through a plum → mauve → magenta → lavender ramp,
 * hue-tinted warm/cool by a slower field and muted toward dusty mauve in places.
 */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform float uPress;
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform float uScale;
uniform float uAngle;
uniform vec4 uGeo;
uniform vec4 uLane;
uniform vec4 uField;
uniform vec4 uLevel;
uniform vec4 uTw;
uniform vec4 uTint;
uniform vec4 uFx;
uniform vec4 uRange;
uniform vec3 uHi;
uniform vec3 uWarm;
uniform vec3 uCool;
out vec4 outColor;

float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float h31(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = h31(i), b = h31(i + vec3(1, 0, 0)), c = h31(i + vec3(0, 1, 0)), d = h31(i + vec3(1, 1, 0));
    float e = h31(i + vec3(0, 0, 1)), g = h31(i + vec3(1, 0, 1)), hh = h31(i + vec3(0, 1, 1)), k = h31(i + vec3(1, 1, 1));
    return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(hh, k, f.x), f.y), f.z);
}
float fbm(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec3(7.1, 3.7, 1.3); a *= 0.5; }
    return s / 0.9375;
}
vec3 ramp(float x) {
    vec3 s0 = uBase * 0.2, s1 = uBase * 0.38, s2 = uBase * 0.62;
    if (x < 0.25) return mix(s0, s1, x / 0.25);
    if (x < 0.5) return mix(s1, s2, (x - 0.25) / 0.25);
    if (x < 0.72) return mix(s2, uBase, (x - 0.5) / 0.22);
    if (x < 0.9) return mix(uBase, uAccent, (x - 0.72) / 0.18);
    return mix(uAccent, uHi, (x - 0.9) / 0.1);
}
void main() {
    float sc = max(uScale, 0.05);
    float ry = max(uRes.y, 1.0);
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / ry / sc;
    float px = 1.0 / max(ry * sc, 1.0);
    vec2 dir = vec2(cos(uAngle), -sin(uAngle));
    vec2 nrm = vec2(sin(uAngle), cos(uAngle));

    // Pointer lens: the lattice under the pointer is magnified, so dashes swell and the lanes
    // part around it like a loupe sliding over the field. Radial map r' = r(1 - k·e^(-r²/R²))
    // stays monotonic for k < 1, so nothing folds. Press pushes it further.
    vec2 m = (uMouse - 0.5) * uRes / ry / sc;
    float R = max(uTint.z / sc, 1e-3);
    vec2 dm = p - m;
    float fall = exp(-dot(dm, dm) / (R * R));
    float lens = clamp(0.3 * uHover * uFx.z * (1.0 + 0.5 * uPress), 0.0, 0.85) * fall;
    p = m + dm * (1.0 - lens);
    px *= 1.0 - lens;

    float lanePitch = max(uGeo.z, 1e-3);
    float pitch = max(uGeo.w, 1e-3);
    float L = min(uGeo.x, pitch * 0.98);
    float T = min(min(uGeo.y, lanePitch * 0.98), L);
    float r = 0.5 * T;

    float u = dot(p, dir);
    float v = dot(p, nrm);
    float lane = floor(v / lanePitch);
    float b = (v / lanePitch - lane - 0.5) * lanePitch;

    float cyc = max(uTw.w, 0.5);
    float n = floor(uTime / cyc);
    float tc = uTime - n * cyc;
    float lh = h21(vec2(lane, uField.w * 13.7 + 1.0));
    float pitches = uLane.z + floor((lh * 2.0 - 1.0) * uLane.z * uLane.w + 0.5);
    float shift = tc / cyc * pitches * pitch;
    float off = (uLane.x * lane + uLane.y * h21(vec2(lane * 1.37, 7.0 + uField.w))) * pitch;
    float uu = u - shift + off;
    float cell = floor(uu / pitch);
    float a = (uu / pitch - cell - 0.5) * pitch;

    float hl = max(0.5 * L - r, 0.0);
    float d = length(vec2(max(abs(a) - hl, 0.0), b)) - r;
    float aa = max(px * uFx.w, 1e-6);
    float cov = clamp(0.5 - d / aa, 0.0, 1.0);

    vec3 col = uBg;
    if (cov > 0.0) {
        // Dash centre in stage space, and an id that survives the cycle wrap.
        float uc = (cell + 0.5) * pitch + shift - off;
        vec2 c = dir * uc + nrm * (lane + 0.5) * lanePitch;
        float id = cell - n * pitches;

        vec2 cq = c - nrm * (uField.y / cyc) * uTime;
        // Field in lane space, stretched along the dashes so bright clouds run with them.
        vec2 q = vec2(dot(cq, dir) / max(uRange.y, 0.1), dot(cq, nrm));
        float f = fbm(vec3(q * uField.x + uField.w * 3.17, uTime * uField.z));
        float jit = (h21(vec2(id * 0.913, lane * 1.71) + uField.w) - 0.5) * 2.0 * uLevel.z;
        float x = clamp((f - uLevel.y) / max(uRange.x, 1e-3) + jit, 0.0, 1.0);
        x = pow(x, max(uLevel.x, 0.1));

        // Twinkle: a share of dashes already lit by a cloud rises toward the highlight once per cycle.
        float th = h21(vec2(id * 0.731 + 11.0, lane * 1.91 + uField.w));
        if (th < uTw.x) {
            float ph = mod(tc + h21(vec2(lane * 0.57, id * 0.39) + 3.3) * cyc, cyc);
            float rise = max(uTw.y, 1e-3);
            float env = smoothstep(0.0, rise, ph) * (1.0 - smoothstep(rise, rise + max(uTw.z, 1e-3), ph));
            x = mix(x, 1.0, env * 0.85 * smoothstep(0.35, 0.75, x));
        }

        // Pointer: dashes inside the lens lift toward the highlight (whole dash, flat colour kept).
        float hv = uHover * uFx.z * (1.0 - smoothstep(0.0, R, length(c - m)));
        x = clamp(x + hv * uTint.w * (1.0 + 0.5 * uPress), 0.0, 1.0);

        vec3 dc = ramp(x);
        vec3 lw = vec3(0.299, 0.587, 0.114);
        float tn = clamp((fbm(vec3(q * uField.x * uTint.y + 19.7 + uField.w, uTime * uField.z * 0.5 + 4.0)) - 0.5) * 3.0, -1.0, 1.0);
        float lum = dot(dc, lw);
        vec3 warmT = uWarm / max(dot(uWarm, lw), 1e-3) * lum;
        vec3 coolT = uCool / max(dot(uCool, lw), 1e-3) * lum;
        dc = mix(dc, tn > 0.0 ? warmT : coolT, uTint.x * abs(tn));

        // Dusty mauve: a slow field desaturates mid-tones, highlights stay vivid.
        float mf = vnoise(vec3(q * uField.x * 0.6 + 41.0 + uField.w, uTime * uField.z * 0.4 + 9.0));
        lum = dot(dc, lw);
        vec3 dusty = vec3(lum) * vec3(1.12, 0.9, 1.05);
        dc = mix(dc, dusty, uRange.z * smoothstep(0.3, 0.8, mf) * (1.0 - smoothstep(0.75, 0.95, x)));

        col = mix(uBg, clamp(dc, 0.0, 1.0), cov);
    }

    vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));
    float vd = length((uv - 0.5) * vec2(uRes.x / ry, 1.0));
    col *= 1.0 - uFx.y * smoothstep(0.35, 1.0, vd);
    col += (h21(gl_FragCoord.xy + fract(uTime * 7.0) * 311.0) - 0.5) * uFx.x * 0.2;
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

export default function FieldShortParallel(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#34BEBC", accentColor = "#00FFDB", speed = 50, scale = 68, hover = 100, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("FieldShortParallel shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("FieldShortParallel link:", gl.getProgramInfoLog(prog))
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
        let down = 0
        let prs = 0
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
            down = 1
        }
        const onUp = () => {
            down = 0
        }
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

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
            prs += (down - prs) * (1 - Math.exp(-dt * 10))
            const bg = parseColor(p.background, [0.03, 0.03, 0.04, 1])
            const base = parseColor(p.baseColor, [0.23, 0.18, 0.55, 1])
            const acc = parseColor(p.accentColor, [0.91, 0.42, 0.57, 1])
            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.uniform2f(u("uRes"), canvas.width, canvas.height)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform2f(u("uMouse"), mx, my)
            // Raw 0..1: the FRAG scales it by the top-level `hover` row (RULES.md).
            gl.uniform1f(u("uHover"), hov)
            gl.uniform1f(u("uPress"), prs)
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
            canvas.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    return (
        <div ref={rootRef} style={{ position: "relative", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}

// Control order arranged in the builder.
