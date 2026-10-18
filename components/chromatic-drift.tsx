"use client"

/**
 * ImageGridVertical — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    pink: "#F7A4F6",
    lilac: "#F0B6FF",
    coral: "#FF7A6A",
    maroon: "#760C1F",
    indigo: "#2E1A78",
    violet: "#795BF9",
    botLight: "#8C86FF",
    botBlue: "#5A5CF4",
    botEmber: "#D06010",
    botRed: "#A01010",
    botWine: "#3A0C3A",
    botPurple: "#7A3AE0",
    topTint: "#FF4CF6",
    topTintPct: 45,
    topTintDepth: 20,
    bottomStart: 60,
    bottomEnd: 82,
    floorColor: "#8A0E3A",
    floorStart: 88,
    floorPct: 55,
    segBands: 11,
    darkMax: 3,
    sunsetChance: 85,
    flipChance: 25,
    driftPct: 8,
    wobblePct: 8,
    wobbleRate: 120,
    stairPct: 3,
    jitterPct: 12,
    hoverLiftPct: 6,
    sparkle: 50,
    seed: 7,
    dither: 40,
    grain: 12,
    vignette: 0,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    columns?: number
    steps?: number
    stagger?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

const TOP_STOPS = new Float32Array(24)
const BOT_STOPS = new Float32Array(24)

function clampN(v: unknown, d: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, num(v, d)))
}

function putRgb(arr: Float32Array, i: number, c: RGBA): void {
    arr[i * 3] = c[0]
    arr[i * 3 + 1] = c[1]
    arr[i * 3 + 2] = c[2]
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const dark = parseColor(p.background, [0.12, 0.02, 0.15, 1])
    const orange = parseColor(p.accentColor, [0.9, 0.35, 0.24, 1])
    const base = parseColor(p.baseColor, [0.37, 0.22, 0.88, 1])

    // Band roles: 0 pink, 1 lilac, 2 coral, 3 orange, 4 maroon, 5 dark core, 6 indigo, 7 violet.
    putRgb(TOP_STOPS, 0, parseColor(adv.pink, [0.97, 0.64, 0.96, 1]))
    putRgb(TOP_STOPS, 1, parseColor(adv.lilac, [0.94, 0.71, 1, 1]))
    putRgb(TOP_STOPS, 2, parseColor(adv.coral, [1, 0.48, 0.42, 1]))
    putRgb(TOP_STOPS, 3, orange)
    putRgb(TOP_STOPS, 4, parseColor(adv.maroon, [0.46, 0.05, 0.12, 1]))
    putRgb(TOP_STOPS, 5, dark)
    putRgb(TOP_STOPS, 6, parseColor(adv.indigo, [0.18, 0.1, 0.47, 1]))
    putRgb(TOP_STOPS, 7, parseColor(adv.violet, [0.47, 0.36, 0.98, 1]))

    // The same roles recoloured for the bottom ground.
    putRgb(BOT_STOPS, 0, parseColor(adv.botLight, [0.55, 0.53, 1, 1]))
    putRgb(BOT_STOPS, 1, parseColor(adv.botBlue, [0.35, 0.36, 0.96, 1]))
    putRgb(BOT_STOPS, 2, parseColor(adv.botPurple, [0.48, 0.23, 0.88, 1]))
    putRgb(BOT_STOPS, 3, parseColor(adv.botEmber, [0.82, 0.38, 0.06, 1]))
    putRgb(BOT_STOPS, 4, parseColor(adv.botRed, [0.63, 0.06, 0.06, 1]))
    putRgb(BOT_STOPS, 5, parseColor(adv.botWine, [0.23, 0.05, 0.23, 1]))
    putRgb(BOT_STOPS, 6, base)
    putRgb(BOT_STOPS, 7, base)

    gl.uniform3fv(u("uTop"), TOP_STOPS)
    gl.uniform3fv(u("uBot"), BOT_STOPS)
    const tint = parseColor(adv.topTint, [1, 0.3, 0.96, 1])
    gl.uniform3f(u("uTopTint"), tint[0], tint[1], tint[2])
    const bs = clampN(adv.bottomStart, 60, 0, 100) / 100
    const be = Math.max(bs + 0.01, clampN(adv.bottomEnd, 82, 0, 100) / 100)
    gl.uniform4f(u("uTint"), clampN(adv.topTintPct, 45, 0, 100) / 100, Math.max(0.01, clampN(adv.topTintDepth, 20, 1, 100) / 100), bs, be)
    const fl = parseColor(adv.floorColor, [0.54, 0.05, 0.23, 1])
    gl.uniform3f(u("uFloorC"), fl[0], fl[1], fl[2])
    gl.uniform2f(u("uFloorP"), clampN(adv.floorStart, 88, 0, 100) / 100, clampN(adv.floorPct, 55, 0, 100) / 100)

    gl.uniform4f(
        u("uSeg"),
        Math.round(clampN(adv.segBands, 11, 6, 40)),
        Math.round(clampN(adv.darkMax, 3, 1, 8)),
        clampN(adv.sunsetChance, 85, 0, 100) / 100,
        clampN(adv.flipChance, 25, 0, 100) / 100
    )
    gl.uniform1f(u("uCols"), Math.round(clampN(p.columns, 7, 1, 32)))
    gl.uniform1f(u("uSteps"), clampN(p.steps, 42, 2, 200))
    gl.uniform1f(u("uStagger"), clampN(p.stagger, 50, 0, 100) / 50)
    gl.uniform4f(
        u("uMove"),
        clampN(adv.driftPct, 8, -100, 100) / 100,
        clampN(adv.wobblePct, 8, 0, 100) / 100,
        clampN(adv.wobbleRate, 120, 0, 1000) / 100,
        clampN(adv.stairPct, 3, -50, 50) / 100
    )
    gl.uniform4f(
        u("uMisc"),
        clampN(adv.jitterPct, 12, 0, 100) / 100,
        clampN(adv.hoverLiftPct, 6, 0, 50) / 100,
        clampN(adv.seed, 7, 0, 999),
        clampN(adv.sparkle, 50, 0, 100) / 100
    )
    gl.uniform3f(
        u("uFx"),
        clampN(adv.grain, 12, 0, 100) / 100,
        clampN(adv.vignette, 0, 0, 100) / 100,
        clampN(adv.dither, 40, 0, 100) / 100
    )
}

/* Columns of hard posterised bands: pink runs broken by short sunset stacks (coral→orange→maroon→black→indigo),
   each column scrolling its own band sequence upward at a noisy speed; screen-y tints recolour the top and the ground. */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform float uScale;
uniform vec3 uTop[8];
uniform vec3 uBot[8];
uniform vec3 uTopTint;
uniform vec4 uTint;
uniform vec3 uFloorC;
uniform vec2 uFloorP;
uniform vec4 uSeg;
uniform float uCols;
uniform float uSteps;
uniform float uStagger;
uniform vec4 uMove;
uniform vec4 uMisc;
uniform vec3 uFx;
out vec4 outColor;

float h11(float x) { return fract(sin(x * 127.1 + 11.7) * 43758.5453); }
float hh(float a, float b, float c) { return fract(sin(mod(a, 1000.0) * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453); }
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

void main() {
    vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));
    float yd = 1.0 - uv.y;
    float cols = max(uCols, 1.0);
    float ci = min(floor(uv.x * cols), cols - 1.0);
    float seed = uMisc.z;
    float r1 = h11(ci * 1.37 + seed);
    float r2 = h11(ci * 2.91 + seed * 1.7);
    float r3 = h11(ci * 4.13 + seed * 2.3);
    float r4 = h11(ci * 5.77 + seed * 3.1);
    float t = uTime;
    float rate = uMove.z;

    // Per-column offset in frame heights: shared upward drift + stair + jitter + two-sine wobble.
    float off = uMove.x * t
        - ci * uMove.w * uStagger
        + (r1 - 0.5) * 2.0 * uMisc.x * uStagger
        + uMove.y * uStagger * (0.65 * sin(t * rate * (0.7 + 0.6 * r2) + r3 * 6.2832)
                              + 0.35 * sin(t * rate * 1.73 * (0.7 + 0.6 * r4) + r1 * 6.2832));
    float dxm = (ci + 0.5) / cols - uMouse.x;
    off += uHover * uMisc.y * exp(-dxm * dxm * 40.0);

    // Band index in texture space, so edges travel with the column.
    float steps = max(uSteps / max(uScale, 0.05), 1.0);
    float b = floor((yd + off) * steps);
    float tc = (b + 0.5) / steps;
    float ydq = clamp(tc - off, 0.0, 1.0);

    // Segments of L bands: a pink/lilac run with one sunset stack placed at a random spot.
    float L = max(uSeg.x, 6.0);
    float k = floor(b / L);
    float j = b - k * L;
    float cs = ci * 7.13 + seed;
    float darkN = hh(k, cs, 1.0) < 0.25 ? 0.0 : 1.0 + floor(hh(k, cs, 2.0) * max(uSeg.y, 1.0) * 0.999);
    bool hasSun = hh(k, cs, 3.0) < uSeg.z;
    float sunLen = 5.0 + darkN;
    float start = floor(hh(k, cs, 4.0) * max(L - sunLen, 0.0) + 0.5);
    float i = j - start;
    int role = -1;
    if (hasSun && i >= 0.0 && i < sunLen) {
        if (hh(k, cs, 5.0) < uSeg.w) i = sunLen - 1.0 - i;
        if (i < 0.5) role = 2;
        else if (i < 1.5) role = 3;
        else if (i < 2.5) role = 4;
        else if (i < 2.5 + darkN) role = 5;
        else if (i < 3.5 + darkN) role = 6;
        else role = 7;
    }
    vec3 topC;
    vec3 botC;
    if (role < 0) {
        float m = hh(floor(b / 2.0), cs, 6.0);
        topC = mix(uTop[0], uTop[1], m);
        botC = mix(uBot[0], uBot[1], m);
        if (hh(b, cs, 7.0) < 0.14) { topC = mix(topC, uTop[7], 0.45); botC = mix(botC, uBot[6], 0.5); }
    } else {
        topC = uTop[role];
        botC = uBot[role];
    }

    vec3 col = mix(topC, botC, smoothstep(uTint.z, max(uTint.w, uTint.z + 1e-3), ydq));
    col = mix(col, uFloorC, uFloorP.y * smoothstep(uFloorP.x, 1.0, ydq) * (role == 5 ? 0.3 : 1.0));
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float tm = uTint.x * (1.0 - smoothstep(0.0, max(uTint.y, 1e-3), ydq));
    col = mix(col, uTopTint, tm * smoothstep(0.35, 0.7, lum));

    // GIF dither (checker) plus grain refreshed every frame.
    float px = max(uRes.y / 500.0, 1.0);
    vec2 gp = floor(gl_FragCoord.xy / px);
    col += (mod(gp.x + gp.y, 2.0) - 0.5) * uFx.z * 0.07;
    float fr = mod(floor(uTime * 24.0), 61.0);
    col += (h21(gp + vec2(fr * 17.0, fr * 31.0)) - 0.5) * uFx.x * 0.25;

    // Sparse white specks.
    float cell = max(0.08 * uRes.y, 1.0);
    vec2 cp = floor(gl_FragCoord.xy / cell);
    float tick = mod(floor(uTime * 10.0), 97.0);
    if (h21(cp + vec2(tick * 3.1, tick * 7.3)) < uMisc.w * 0.04) {
        vec2 pos = (cp + vec2(h21(cp + tick + 1.3), h21(cp + tick + 5.9))) * cell;
        float d = length(gl_FragCoord.xy - pos);
        float rr = 1.2 * px;
        col = mix(col, vec3(1.0), 0.7 * (1.0 - smoothstep(rr, rr + px, d)));
    }

    float dv = length(uv - 0.5) * 1.4142;
    col *= 1.0 - uFx.y * smoothstep(0.3, 1.0, dv);
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

export default function ImageGridVertical(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#1F0627", baseColor = "#5F39E0", accentColor = "#E5583D", speed = 98, scale = 100, hover = 100, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("ImageGridVertical shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("ImageGridVertical link:", gl.getProgramInfoLog(prog))
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
