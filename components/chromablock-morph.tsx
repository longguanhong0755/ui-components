"use client"

/**
 * FullScreenLego — full screen lego background
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
    radius: 27,
    lumps: 35,
    lumpScale: 16,
    churn: 12,
    spinA: 20,
    spinB: 13,
    lightSpeed: 120,
    lightPhase: 49,
    lightTilt: 49,
    ambient: 30,
    crease: 30,
    limeAt: 90,
    mainAt: 50,
    dimAt: 36,
    darkAt: 22,
    dimTone: 65,
    darkTone: 32,
    offTone: 13,
    studSize: 64,
    studRim: 6,
    studLight: 35,
    studShadow: 35,
    seam: 1,
    seamTone: 62,
    offsetY: -2,
    seed: 0,
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
    brickSize?: number
    fineSize?: number
    cycle?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

function clampN(v: unknown, d: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, num(v, d)))
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const cv = gl.canvas as HTMLCanvasElement
    const cw = typeof cv.clientWidth === "number" ? cv.clientWidth : 0
    const dpr = cw > 0 ? Math.max(0.5, Math.min(4, gl.drawingBufferWidth / cw)) : 1
    const ch = typeof cv.clientHeight === "number" ? cv.clientHeight : 0
    // Bricks are sized for a 1200×800 frame and scale with the frame's diagonal,
    // so the brick count across the frame stays the same at any size or aspect.
    const diag = Math.hypot(cw, ch)
    const fit = diag > 0 ? Math.max(0.25, Math.min(4, diag / 1442.2)) : 1
    const coarse = clampN(p.brickSize, 48, 4, 160)
    const fine = Math.min(coarse, clampN(p.fineSize, 12, 2, 160))
    const cycle = clampN(p.cycle, 20, 2, 120)
    const deg = Math.PI / 180
    gl.uniform3f(u("uGrid"), fine * dpr * fit, coarse * dpr * fit, cycle)
    gl.uniform4f(
        u("uShape"),
        clampN(adv.radius, 27, 5, 60) / 100,
        clampN(adv.lumps, 35, 0, 100) / 100,
        clampN(adv.lumpScale, 16, 1, 80) / 10,
        clampN(adv.churn, 12, 0, 200) / 100
    )
    gl.uniform2f(u("uSpin"), num(adv.spinA, 20) * deg, num(adv.spinB, 13) * deg)
    gl.uniform4f(
        u("uLight"),
        num(adv.lightSpeed, 120) * deg,
        num(adv.lightPhase, 49) * deg,
        clampN(adv.lightTilt, 49, 0, 90) * deg,
        clampN(adv.crease, 30, 0, 100) / 100
    )
    gl.uniform4f(
        u("uLevels"),
        clampN(adv.limeAt, 90, 0, 100) / 100,
        clampN(adv.mainAt, 50, 0, 100) / 100,
        clampN(adv.dimAt, 36, 0, 100) / 100,
        clampN(adv.darkAt, 22, 0, 100) / 100
    )
    gl.uniform4f(
        u("uTone"),
        clampN(adv.ambient, 30, 0, 100) / 100,
        clampN(adv.dimTone, 65, 0, 100) / 100,
        clampN(adv.darkTone, 32, 0, 100) / 100,
        clampN(adv.offTone, 13, 0, 100) / 100
    )
    gl.uniform4f(
        u("uStud"),
        clampN(adv.studSize, 64, 0, 100) / 200,
        clampN(adv.studRim, 6, 0, 30) / 100,
        clampN(adv.studLight, 35, 0, 100) / 100,
        clampN(adv.studShadow, 35, 0, 100) / 100
    )
    gl.uniform2f(u("uSeam"), clampN(adv.seam, 1, 0, 8) * dpr, clampN(adv.seamTone, 62, 0, 100) / 100)
    gl.uniform4f(
        u("uFx"),
        clampN(adv.grain, 0, 0, 100) / 100,
        clampN(adv.vignette, 0, 0, 100) / 100,
        clampN(adv.offsetY, -2, -50, 50) / 100,
        num(adv.seed, 0)
    )
    gl.uniform1f(u("uHoverAmt"), clampN(adv.hover, 50, 0, 100) / 50)
}

/* A noise-displaced sphere, ray-marched once per brick cell, lit by a light that orbits
   the view axis, quantised to four greens and drawn as LEGO 1×1 plates with studs.
   The grid sweeps coarse → fine → coarse on a cosine over `cycle` seconds. */
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
uniform float uHoverAmt;
uniform vec3 uGrid;
uniform vec4 uShape;
uniform vec2 uSpin;
uniform vec4 uLight;
uniform vec4 uLevels;
uniform vec4 uTone;
uniform vec4 uStud;
uniform vec2 uSeam;
uniform vec4 uFx;
out vec4 outColor;

mat3 gRot;
float gT;

float h31(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vn(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float a = h31(i), b = h31(i + vec3(1, 0, 0)), c = h31(i + vec3(0, 1, 0)), d = h31(i + vec3(1, 1, 0));
    float e = h31(i + vec3(0, 0, 1)), g = h31(i + vec3(1, 0, 1)), h = h31(i + vec3(0, 1, 1)), k = h31(i + vec3(1, 1, 1));
    return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z) * 2.0 - 1.0;
}
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }

float field(vec3 p) {
    vec3 d = gRot * (p / max(length(p), 1e-4));
    vec3 q = d * uShape.z + vec3(uFx.w * 7.31, uFx.w * 3.17 + 1.3, gT * uShape.w);
    return 0.7 * vn(q) + 0.3 * vn(q * 2.03 + 11.7);
}
float sdf(vec3 p) { return length(p) - uShape.x * (1.0 + uShape.y * field(p)); }

vec3 brick(vec3 c, vec2 lc, float px) {
    float rs = uStud.x;
    float r = length(lc);
    float inStud = 1.0 - smoothstep(rs - px, rs + px, r);
    float sh = 1.0 - smoothstep(rs - 2.0 * px, rs + 2.0 * px, length(lc - vec2(0.07, -0.07)));
    vec3 face = c * (1.0 - uStud.w * sh * (1.0 - inStud));
    float ang = dot(lc / max(r, 1e-4), vec2(-0.7071, 0.7071));
    float rim = max(uStud.y, 1.5 * px);
    float band = smoothstep(rs - rim - px, rs - rim + px, r);
    vec3 stud = c * 1.08 * (1.0 + band * ang * uStud.z);
    stud += c * 0.12 * (1.0 - smoothstep(0.05, 0.05 + 2.0 * px, r));
    vec3 o = mix(face, stud, inStud);
    float sw = uSeam.x * px;
    float seam = max(step(0.5 - sw, lc.x), step(lc.y, -0.5 + sw));
    return mix(o, c * uSeam.y, seam);
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    float H = max(uRes.y, 1.0);
    // Frame unit from the diagonal: equals H on a 3:2 frame, so the shape fills
    // portrait, square and wide frames the same way instead of only by height.
    float N = max(length(uRes) / 1.8027756, 1.0);
    float ph = 0.5 + 0.5 * cos(6.2831853 * uTime / max(uGrid.z, 0.1));
    float cs = max(mix(uGrid.x, uGrid.y, ph), 2.0);
    vec2 g = (frag - 0.5 * uRes) / cs;
    vec2 cell = floor(g);
    vec2 lc = g - cell - 0.5;
    float px = 1.0 / cs;
    vec2 cc = (cell + 0.5) * cs / N;
    vec2 q = (cc - vec2(0.0, uFx.z)) / max(uScale, 0.05);

    float w = clamp(uHover * uHoverAmt, 0.0, 2.0);
    vec2 pm = (uMouse - vec2(0.5, 0.5 + uFx.z)) * uRes / N;
    gT = uTime;
    gRot = rotX(gT * uSpin.y + pm.y * 0.5 * w) * rotY(gT * uSpin.x - pm.x * 0.5 * w);

    vec3 col = uBg;
    float rb = uShape.x * (1.0 + uShape.y) + 0.02;
    float r2 = dot(q, q);
    bool hit = false;
    vec3 p = vec3(q, 0.0);
    if (r2 < rb * rb) {
        float z = sqrt(rb * rb - r2);
        for (int i = 0; i < 40; i++) {
            p = vec3(q, z);
            float d = sdf(p);
            if (d < 0.0015) { hit = true; break; }
            z -= d * 0.6;
            if (z < -rb) break;
        }
    }

    float a = uLight.x * gT + uLight.y;
    vec2 ld = vec2(sin(a), cos(a));
    float pl = length(pm);
    if (pl > 1e-3 && w > 0.0) {
        vec2 v = mix(ld, pm / pl, clamp(w * 0.85, 0.0, 1.0));
        float vl = length(v);
        ld = vl > 1e-3 ? v / vl : pm / pl;
    }
    vec3 L = vec3(ld * sin(uLight.z), cos(uLight.z));

    vec3 n;
    float f;
    if (hit) {
        vec2 e = vec2(0.004, -0.004);
        n = normalize(e.xyy * sdf(p + e.xyy) + e.yyx * sdf(p + e.yyx) + e.yxy * sdf(p + e.yxy) + e.xxx * sdf(p + e.xxx));
        f = field(p);
    } else {
        // Behind the blob: a lumpy brick wall, same noise and light, so every cell
        // of the frame is a brick and nothing shows through as empty background.
        vec3 bp = vec3(q * uShape.z * 0.6, gT * uShape.w + uFx.w * 5.1 + 9.7);
        float es = 0.05;
        float h0 = vn(bp);
        float hx = vn(bp + vec3(es, 0.0, 0.0));
        float hy = vn(bp + vec3(0.0, es, 0.0));
        n = normalize(vec3(-(hx - h0) / es * uShape.y, -(hy - h0) / es * uShape.y, 1.0));
        f = h0;
    }
    float b = uTone.x + (1.0 - uTone.x) * max(dot(n, L), 0.0);
    b *= 1.0 - uLight.w * (1.0 - smoothstep(-0.4, 0.3, f));
    // The wall sits a step darker than the blob so the blob still reads in front.
    if (!hit) b *= 0.75;
    vec3 c;
    if (b > uLevels.x) c = uAccent;
    else if (b > uLevels.y) c = uBase;
    else if (b > uLevels.z) c = uBase * uTone.y;
    else if (b > uLevels.w) c = uBase * uTone.z;
    else c = uBase * uTone.w;
    col = brick(c, lc, px);

    vec2 uv = frag / uRes;
    vec2 vq = uv - 0.5;
    vq.x *= uRes.x / H;
    col *= 1.0 - uFx.y * smoothstep(0.3, 1.0, length(vq) * 1.2);
    float gn = fract(sin(dot(floor(frag) + fract(uTime * 7.0) * vec2(91.7, 47.3), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    col += gn * uFx.x * 0.25;
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

export default function FullScreenLego(props: Props) {
    props = withMovedControls(props)
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#0033FF", accentColor = "#00FF9A", speed = 50, scale = 300, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("FullScreenLego shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("FullScreenLego link:", gl.getProgramInfoLog(prog))
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
        <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}
