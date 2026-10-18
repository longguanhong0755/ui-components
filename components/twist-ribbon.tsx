"use client"

/**
 * DriftingLeftSmooth — drifting left smooth
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
    driftSec: 64,
    twistRate: 300,
    breathe: 0,
    boxHeight: 110,
    positionY: 50,
    halfWidth: 50,
    pinchWidth: 50,
    curl: 90,
    topLight: 200,
    pinchLight: 0,
    fold: 105,
    blueSpan: 15,
    blueSide: 0,
    fullBlueAt: 89,
    fullBlue: 100,
    dither: 0,
    blueGlow: 35,
    edgeDither: 0,
    ribbonGrain: 0,
    grainPx: 1,
    cool: 80,
    coolEnd: 1,
    goldColor: "#E3BD78",
    highColor: "#FBF5E4",
    blueDeep: "#3F7DE6",
    blueHigh: "#5A95F0",
    paleColor: "#F8F4EA",
    coolTint: "#DCE6F5",
    vignette: 0,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    thickness?: number
    colorSplit?: number
    direction?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

function clampN(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v))
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const f = (name: string, v: number) => gl.uniform1f(u(name), v)
    const c3 = (name: string, v: string | undefined, fb: RGBA) => {
        const c = parseColor(v, fb)
        gl.uniform3f(u(name), c[0], c[1], c[2])
    }
    const split = clampN(num(p.colorSplit, 52), 0, 100) / 100
    f("uThick", clampN(num(p.thickness, 100), 20, 300) / 100)
    f("uBlueStart", split)
    f("uBlueEnd", split + clampN(num(adv.blueSpan, 14), 1, 50) / 100)
    f("uFullFrom", split + clampN(num(adv.fullBlueAt, 32), 0, 100) / 100)
    f("uFullBlue", clampN(num(adv.fullBlue, 100), 0, 100) / 100)
    f("uBlueSide", clampN(num(adv.blueSide, 0), -100, 100) / 100)
    f("uDrift", Math.max(1, num(adv.driftSec, 20)))
    f("uDirection", (((num(p.direction, 0) % 360) + 360) % 360) * Math.PI / 180)
    f("uTwistRate", clampN(num(adv.twistRate, 110), 0, 300) / 100)
    f("uBreathe", clampN(num(adv.breathe, 8), 0, 50) / 100)
    f("uAspect", clampN(num(adv.boxHeight, 100), 5, 200) / 100)
    f("uPosY", clampN(num(adv.positionY, 50), 0, 100) / 100)
    f("uWidth", clampN(num(adv.halfWidth, 17), 2, 50) / 100)
    f("uMinWidth", clampN(num(adv.pinchWidth, 10), 0, 50) / 100)
    f("uCurl", (clampN(num(adv.curl, 50), 0, 90) * Math.PI) / 180)
    f("uLight", clampN(num(adv.topLight, 100), 0, 200) / 100)
    f("uPinchLight", clampN(num(adv.pinchLight, 60), 0, 200) / 100)
    f("uFold", clampN(num(adv.fold, 100), 0, 200) / 100)
    f("uDither", clampN(num(adv.dither, 35), 0, 100) / 100)
    f("uBlueGlow", clampN(num(adv.blueGlow, 35), 0, 100) / 100)
    f("uEdgeDither", clampN(num(adv.edgeDither, 4), 0, 50) / 100)
    f("uRibbonGrain", clampN(num(adv.ribbonGrain, 25), 0, 100) / 100)
    f("uGrainPx", clampN(num(adv.grainPx, 1), 1, 6))
    f("uCool", clampN(num(adv.cool, 80), 0, 100) / 100)
    f("uCoolEnd", clampN(num(adv.coolEnd, 15), 1, 50) / 100)
    f("uVignette", clampN(num(adv.vignette, 0), 0, 100) / 100)
    c3("uGold", adv.goldColor, [0.89, 0.74, 0.47, 1])
    c3("uHigh", adv.highColor, [0.98, 0.96, 0.89, 1])
    c3("uBlueDeep", adv.blueDeep, [0.25, 0.49, 0.9, 1])
    c3("uBlueHigh", adv.blueHigh, [0.35, 0.58, 0.94, 1])
    c3("uPale", adv.paleColor, [0.97, 0.96, 0.92, 1])
    c3("uCoolTint", adv.coolTint, [0.86, 0.9, 0.96, 1])
}

/*
 * One twisting ribbon, drawn analytically per pixel.
 * Centreline and twist phase are periodic Catmull-Rom tables (period = 2 frame widths),
 * fitted to the reference at t = 0, and sampled at s = x + t / drift so the ribbon drifts left.
 * The ribbon box is a % of the frame HEIGHT, so the band covers y ≈ 13–92% like the reference.
 * The twist table travels ~10% faster than the centreline, so pinches slide along the waves.
 * Visible half-height = W·sqrt(cos²θ + pinch²)·sqrt(1 + slope²); shading from the twisted face normal.
 * Blue is tied to screen x and dissolves into cream through a soft, grainy, lightened gradient.
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
uniform float uThick;
uniform float uBlueStart;
uniform float uBlueEnd;
uniform float uFullFrom;
uniform float uFullBlue;
uniform float uBlueSide;
uniform float uDrift;
uniform float uDirection;
uniform float uTwistRate;
uniform float uBreathe;
uniform float uAspect;
uniform float uPosY;
uniform float uWidth;
uniform float uMinWidth;
uniform float uCurl;
uniform float uLight;
uniform float uPinchLight;
uniform float uFold;
uniform float uDither;
uniform float uBlueGlow;
uniform float uEdgeDither;
uniform float uRibbonGrain;
uniform float uGrainPx;
uniform float uCool;
uniform float uCoolEnd;
uniform float uVignette;
uniform vec3 uGold;
uniform vec3 uHigh;
uniform vec3 uBlueDeep;
uniform vec3 uBlueHigh;
uniform vec3 uPale;
uniform vec3 uCoolTint;
out vec4 outColor;

const float CL[16] = float[16](0.345, 0.30, 0.44, 0.57, 0.74, 0.63, 0.50, 0.56, 0.67, 0.62, 0.42, 0.33, 0.45, 0.66, 0.60, 0.42);
const float TW[16] = float[16](-0.3, 0.0, 0.68, 1.41, 1.89, 2.35, 2.9, 3.54, 4.1, 4.6, 5.3, 5.9, 6.6, 7.3, 8.0, 8.8);

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

int wrap16(int i) { return i - 16 * (i / 16); }
float clAt(int i) { return CL[wrap16(i)]; }
float twAt(int i) { int j = wrap16(i); return TW[j] + 10.0 * float(i / 16); }

float cr(float a, float b, float c, float d, float t) {
    return 0.5 * (2.0 * b + (-a + c) * t + (2.0 * a - 5.0 * b + 4.0 * c - d) * t * t + (-a + 3.0 * b - 3.0 * c + d) * t * t * t);
}
float crd(float a, float b, float c, float d, float t) {
    return 0.5 * ((-a + c) + 2.0 * (2.0 * a - 5.0 * b + 4.0 * c - d) * t + 3.0 * (-a + 3.0 * b - 3.0 * c + d) * t * t);
}

// s in frame widths (≥ 0); table spacing 1/8 width
float centre(float s) {
    float u = s * 8.0;
    float fi = floor(u);
    int i = int(fi);
    return cr(clAt(i - 1), clAt(i), clAt(i + 1), clAt(i + 2), u - fi);
}
float centreSlope(float s) {
    float u = s * 8.0;
    float fi = floor(u);
    int i = int(fi);
    return crd(clAt(i - 1), clAt(i), clAt(i + 1), clAt(i + 2), u - fi) * 8.0;
}
float twist(float s) {
    float u = s * 8.0;
    float fi = floor(u);
    int i = int(fi);
    return cr(twAt(i - 1), twAt(i), twAt(i + 1), twAt(i + 2), u - fi);
}

void main() {
    vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
    float sc = max(uScale, 0.05);
    float boxH = max(uRes.y * uAspect * sc, 1.0);

    // Direction rotates the drift axis (and the band with it) around the
    // band's own centre, so one dial reaches a full 360° instead of only
    // flipping left/right.
    float dirCa = cos(uDirection);
    float dirSa = sin(uDirection);
    vec2 dirCenter = vec2(uRes.x * 0.5, uRes.y * uPosY);
    vec2 dirRel = px - dirCenter;
    vec2 rp = vec2(dirRel.x * dirCa - dirRel.y * dirSa, dirRel.x * dirSa + dirRel.y * dirCa) + dirCenter;

    float xs = rp.x / max(uRes.x, 1.0);
    float xr = 0.5 + (xs - 0.5) / sc;
    float yr = 0.5 + (rp.y - uRes.y * uPosY) / boxH;

    float tt = uTime / max(uDrift, 0.1);
    float sC = xr + tt + 20.0;
    float sT = xr + tt * uTwistRate + 20.0;

    float breathe = 1.0 + uBreathe * sin(3.14159265 * tt);
    float c = 0.52 + (centre(sC) - 0.52) * breathe;
    float slope = centreSlope(sC) * breathe;
    float dd = 0.06;
    float c2 = (centre(sC + dd) - 2.0 * centre(sC) + centre(sC - dd)) / (dd * dd) * breathe;

    // pointer: bend the ribbon away from the cursor as one smooth bump.
    // The push direction is taken from the ribbon centre under the cursor (not per pixel),
    // and eases through zero instead of flipping with sign(), so the band never tears.
    vec2 mousePx = vec2(uMouse.x * uRes.x, (1.0 - uMouse.y) * uRes.y);
    vec2 mouseRel = mousePx - dirCenter;
    vec2 mrp = vec2(mouseRel.x * dirCa - mouseRel.y * dirSa, mouseRel.x * dirSa + mouseRel.y * dirCa) + dirCenter;
    float mxr = 0.5 + (mrp.x / max(uRes.x, 1.0) - 0.5) / sc;
    float myr = 0.5 + (mrp.y - uRes.y * uPosY) / boxH;
    float sM = mxr + tt + 20.0;
    float dyM = (0.52 + (centre(sM) - 0.52) * breathe) - myr;
    float push = dyM / sqrt(dyM * dyM + 0.004) * exp(-dyM * dyM / 0.12);
    float gx = xr - mxr;
    float g = exp(-gx * gx / 0.02);
    float amp = uHover * 0.08 * push;
    c += amp * g;
    // the bump tilts the band, so its thickness follows the new slope
    slope += amp * g * (-2.0 * gx / 0.02);

    float th = 3.14159265 * twist(sT);
    float cs = cos(th);
    // slope measured in the reference's own proportions (height / width = 0.262)
    float h = uWidth * uThick * sqrt(cs * cs + uMinWidth * uMinWidth) * sqrt(1.0 + slope * slope * 0.0686);
    h = max(h, 1e-4);
    float vs = (yr - c) / h;

    vec2 gp = floor(gl_FragCoord.xy / max(uGrainPx, 1.0));
    float n1 = h21(gp);
    float n2 = h21(gp + 17.31);
    float n3 = h21(gp + 91.7);
    float n4 = h21(gp + 233.9);

    float edge = 1.0 - uEdgeDither * n1;
    float aa = 1.0 / max(h * boxH, 1.0);
    float inside = 1.0 - smoothstep(edge - aa, edge, abs(vs));

    // shading from the twisted face normal (cross-section curled by uCurl)
    float thl = th + uCurl * vs;
    float cl = cos(thl);
    float face = cl >= 0.0 ? 1.0 : -1.0;
    float up = sin(thl) * face;
    float fold = clamp(c2 * 0.04, -1.0, 1.0);
    float s = 0.52 + 0.28 * uLight * up + 0.25 * uPinchLight * (1.0 - abs(cs)) - 0.5 * uFold * max(0.0, vs * fold);
    s = clamp(s, 0.0, 1.0);

    vec3 cream = s < 0.5 ? mix(uGold, uBase, s * 2.0) : mix(uBase, uHigh, (s - 0.5) * 2.0);
    vec3 blue = s < 0.5 ? mix(uBlueDeep, uAccent, s * 2.0) : mix(uAccent, uBlueHigh, (s - 0.5) * 2.0);

    // blue tied to screen x: lower side first, whole band at the far right; soft grainy dissolve
    float ramp = smoothstep(uBlueStart, max(uBlueEnd, uBlueStart + 1e-3), xs);
    float side = smoothstep(-0.3, 0.6, vs + uBlueSide);
    float full = smoothstep(uFullFrom, uFullFrom + 0.13, xs) * uFullBlue;
    float b = ramp * max(side, full);
    b = clamp(b + (n2 - 0.5) * uDither * (1.0 - abs(b * 2.0 - 1.0)), 0.0, 1.0);
    vec3 col = mix(cream, blue, b);
    // the transition passes through light blue / near-white, not grey
    float trans = 1.0 - abs(b * 2.0 - 1.0);
    col += (1.0 - col) * trans * uBlueGlow;

    // far-left pale, cool lower half
    float cool = (1.0 - smoothstep(0.0, max(uCoolEnd, 1e-3), xs)) * smoothstep(-0.2, 0.9, vs) * uCool;
    col = mix(col, mix(uPale, uCoolTint, smoothstep(0.4, 1.0, vs)), cool);

    // ribbon stipple, strongest in blue and transitions
    col += (n3 - 0.5) * uRibbonGrain * 0.35 * (0.6 + 0.4 * max(b, trans));

    col = mix(uBg, clamp(col, 0.0, 1.0), inside);

    // whole-frame overlays
    vec2 uv = gl_FragCoord.xy / uRes;
    col *= 1.0 - uVignette * smoothstep(0.3, 0.85, length(uv - 0.5) * 1.2);

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

export default function DriftingLeftSmooth(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#F4E3B0", accentColor = "#4F8BEA", speed = 50, scale = 163, hover = 200, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("DriftingLeftSmooth shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("DriftingLeftSmooth link:", gl.getProgramInfoLog(prog))
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
