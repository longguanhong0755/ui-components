"use client"

/**
 * TunnelBinaryDigits — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    flow: 16,
    glyphPitch: 47,
    glyphLength: 74,
    glyphAspect: 175,
    strokeWeight: 15,
    onesShare: 4,
    gapShare: 8,
    dimRays: 25,
    dimLevel: 55,
    streakNoise: 35,
    lumpDepth: 40,
    ringDepth: 25,
    ringPeriod: 65,
    hubRadius: 2,
    edgeLevel: 95,
    glowColor: "#2444D6",
    dimColor: "#1A2C86",
    bloomPx: 4,
    bloom: 75,
    hazeColor: "#0A1650",
    haze: 30,
    hazeRadius: 700,
    hot: 55,
    brightness: 165,
    centerX: 50,
    centerY: 50,
    pointerPull: 6,
    pointerGlow: 60,
    lensSize: 22,
    lensZoom: 45,
    scramble: 60,
    warp: 50,
    seed: 1,
    hover: 50,
    grain: 0,
    vignette: 25,
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
    rays?: number
    roll?: number
    flicker?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

function clampN(v: unknown, lo: number, hi: number, d: number): number {
    const n = typeof v === "number" && Number.isFinite(v) ? v : d
    return Math.min(hi, Math.max(lo, n))
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const f = (name: string, v: number) => gl.uniform1f(u(name), v)
    const c3 = (name: string, v: string, fb: RGBA) => {
        const c = parseColor(v, fb)
        gl.uniform3f(u(name), c[0], c[1], c[2])
    }
    const scale = clampN(p.scale, 10, 300, 100) / 100
    const rays = Math.max(8, Math.round(clampN(p.rays, 60, 300, 140) / Math.max(scale, 0.1)))
    f("uRays", rays)
    f("uRoll", clampN(p.roll, -20, 20, 2))
    f("uFlicker", (clampN(p.flicker, 0, 100, 40) / 100) * 1.5)
    f("uFlow", clampN(adv.flow, 0, 100, 16) / 100)
    f("uPitch", clampN(adv.glyphPitch, 4, 120, 47) / 1000)
    f("uLen", clampN(adv.glyphLength, 10, 98, 74) / 100)
    f("uAspect", Math.max(0.5, clampN(adv.glyphAspect, 50, 400, 175) / 100))
    f("uStroke", clampN(adv.strokeWeight, 2, 60, 15) / 100)
    f("uOnes", clampN(adv.onesShare, 0, 100, 4) / 100)
    f("uGaps", clampN(adv.gapShare, 0, 90, 8) / 100)
    f("uDimRays", clampN(adv.dimRays, 0, 100, 25) / 100)
    f("uDimLevel", clampN(adv.dimLevel, 0, 100, 55) / 100)
    f("uStreak", clampN(adv.streakNoise, 0, 100, 35) / 100)
    f("uLump", clampN(adv.lumpDepth, 0, 100, 40) / 100)
    f("uRingDepth", clampN(adv.ringDepth, 0, 100, 25) / 100)
    f("uRingPeriod", Math.max(0.05, clampN(adv.ringPeriod, 5, 500, 65) / 100))
    f("uHub", clampN(adv.hubRadius, 0, 100, 2) / 1000)
    f("uFalloff", clampN(adv.edgeLevel, 0, 150, 95) / 100)
    c3("uGlowCol", adv.glowColor, [0.14, 0.27, 0.84, 1])
    c3("uDimCol", adv.dimColor, [0.1, 0.17, 0.53, 1])
    c3("uHazeCol", adv.hazeColor, [0.04, 0.09, 0.31, 1])
    f("uBloomPx", Math.max(0.1, clampN(adv.bloomPx, 0, 20, 4)))
    f("uBloom", clampN(adv.bloom, 0, 100, 75) / 100)
    f("uHaze", clampN(adv.haze, 0, 300, 30) / 100)
    f("uHazeR", Math.max(0.01, clampN(adv.hazeRadius, 10, 1000, 700) / 1000))
    f("uHot", clampN(adv.hot, 0, 100, 55) / 100)
    f("uBright", clampN(adv.brightness, 0, 300, 165) / 100)
    gl.uniform2f(u("uCenter"), clampN(adv.centerX, 0, 100, 50) / 100, clampN(adv.centerY, 0, 100, 50) / 100)
    f("uPull", (clampN(adv.pointerPull, 0, 30, 6) / 100) * 2)
    f("uPGlow", clampN(adv.pointerGlow, 0, 300, 60) / 100)
    f("uLensR", clampN(adv.lensSize, 5, 60, 22) / 100)
    f("uLensMag", clampN(adv.lensZoom, 0, 80, 45) / 100)
    f("uScramble", clampN(adv.scramble, 0, 100, 60) / 100)
    f("uSeed", Math.round(clampN(adv.seed, 0, 1000, 1)))
    f("uHoverAmt", clampN(adv.hover, 0, 100, 50) / 50)
    f("uGrain", clampN(adv.grain, 0, 100, 0) / 100)
    f("uVig", clampN(adv.vignette, 0, 100, 25) / 100)
}

/* Binary-digit tunnel: log-polar cells (rays × depth) flowing outward, each holding an outlined "0" or "1". */
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
uniform float uRays, uRoll, uFlicker, uFlow, uPitch, uLen, uAspect, uStroke, uOnes, uGaps;
uniform float uDimRays, uDimLevel, uStreak, uLump, uRingDepth, uRingPeriod, uHub, uFalloff;
uniform vec3 uGlowCol, uDimCol, uHazeCol;
uniform float uBloomPx, uBloom, uHaze, uHazeR, uHot, uBright;
uniform vec2 uCenter;
uniform float uPull, uPGlow, uSeed, uHoverAmt, uGrain, uVig;
uniform float uLensR, uLensMag, uScramble, uWarp, uDown;
out vec4 outColor;

uvec3 pcg3(uvec3 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
    v ^= v >> 16u;
    v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
    return v;
}
vec3 h3(float a, float b, float c) {
    return vec3(pcg3(uvec3(ivec3(int(a), int(b), int(c))))) / 4294967295.0;
}
float n1(float x, float ray, float s) {
    float i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(h3(ray, i, s).x, h3(ray, i + 1.0, s).x, f);
}
float lumpN(vec2 p, float P, float s) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float x0 = mod(i.x, P), x1 = mod(i.x + 1.0, P);
    float a = h3(x0 + 500.0, i.y, s).x, b = h3(x1 + 500.0, i.y, s).x;
    float c = h3(x0 + 500.0, i.y + 1.0, s).x, d = h3(x1 + 500.0, i.y + 1.0, s).x;
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    float H = max(uRes.y, 1.0);
    vec2 uv = frag / max(uRes, vec2(1.0));
    float hv = uHover * uHoverAmt;

    // Lens: the pointer magnifies the digits under it (eases in and out with uHover).
    vec2 mp = uMouse * uRes;
    vec2 dm = (frag - mp) / H;
    float lr = max(uLensR, 0.01);
    float lens = clamp(hv, 0.0, 2.0) * exp(-dot(dm, dm) / (lr * lr));
    float zoom = clamp(uLensMag * min(lens, 1.0), 0.0, 0.85);
    vec2 fragL = mp + (frag - mp) * (1.0 - zoom);

    // Vanishing point, eased toward the pointer.
    vec2 c = uCenter + (uMouse - uCenter) * uPull * hv;
    vec2 q = (fragL - c * uRes) / H;
    float r = max(length(q), 1e-4);
    float T = uTime + uWarp;

    // Log-polar cells: rays around, constant log-depth pitch outward (self-similar perspective).
    float rays = max(uRays, 3.0);
    float th = atan(q.y, q.x) / 6.2831853 + 0.5 + uRoll * uTime / 360.0;
    float ax = fract(th) * rays;
    float ix = min(floor(ax), rays - 1.0);
    float u = fract(ax) - 0.5;
    float dz = max(uPitch * uScale, 1e-3);
    float z = log(r) - uFlow * T;
    float zc = z / dz;
    float iz = floor(zc);
    float v = fract(zc) - 0.5;

    float w = (6.2831853 / rays) / dz;
    vec2 p = vec2(u * w, v);
    float L = uLen;
    float a = 0.5 * L / max(uAspect, 0.5);
    float b = 0.5 * L;
    float st = max(uStroke * L, 0.01);

    vec3 g = h3(ix, iz, uSeed);
    float slot = floor(uTime * uFlicker + g.z * 7.0);
    float dg = h3(ix, iz, uSeed * 131.0 + 17.0 + slot).x;

    // Decode: whole cells inside the lens scramble fast and show their hidden ones.
    float angC = ((ix + 0.5) / rays - 0.5 - uRoll * uTime / 360.0) * 6.2831853;
    float rC = exp((iz + 0.5) * dz + uFlow * T);
    vec2 posC = c * uRes + H * rC * vec2(cos(angC), sin(angC));
    vec2 dmC = (posC - mp) / H / (1.0 - 0.5 * uLensMag);
    float lensC = clamp(hv, 0.0, 2.0) * exp(-dot(dmC, dmC) / (lr * lr));
    bool scr = uScramble > 0.0 && lensC > 0.35;
    if (scr) {
        float slot2 = floor(uTime * (4.0 + 20.0 * uScramble) + g.z * 7.0);
        dg = h3(ix, iz, uSeed * 131.0 + 29.0 + slot2).x;
    }
    bool isOne = dg < (scr ? mix(uOnes, 0.5, uScramble) : uOnes);
    bool present = g.x >= uGaps;

    float d;
    if (isOne) {
        vec2 bq = abs(p) - vec2(st * 0.5, b * 0.95);
        d = length(max(bq, 0.0)) + min(max(bq.x, bq.y), 0.0);
    } else {
        vec2 ab = vec2(a, b);
        float k0 = length(p / ab);
        float k1 = length(p / (ab * ab));
        float de = k1 > 1e-4 ? k0 * (k0 - 1.0) / k1 : -min(a, b);
        d = abs(de) - st * 0.5;
    }

    float pxU = r * dz * H / (1.0 - zoom);
    float aaU = 1.0 / max(pxU, 1e-3);
    float fAvg = smoothstep(0.35, 1.0, aaU);
    float cov = clamp(0.5 - d * pxU, 0.0, 1.0);
    float bl = exp(-max(d, 0.0) * pxU / uBloomPx);
    float ringMean = 6.2831853 * sqrt((a * a + b * b) * 0.5) * st / max(w, 1e-3);
    float oneMean = 2.0 * b * 0.95 * st / max(w, 1e-3);
    float meanCov = clamp(mix(ringMean, oneMean, uOnes) * (1.0 - uGaps) * 1.6, 0.0, 1.0);
    if (!present) { cov = 0.0; bl = 0.0; }
    cov = mix(cov, meanCov, fAvg);
    bl = mix(bl, 0.8, fAvg);

    // Brightness: per ray, streaks along each ray, dark volumes, depth rings, radial profile.
    float rayH = h3(ix, 0.0, uSeed + 5.0).x;
    float rayB = rayH < uDimRays ? uDimLevel : 0.75 + 0.25 * fract(rayH * 7.13);
    float rayMean = uDimRays * uDimLevel + (1.0 - uDimRays) * 0.875;
    rayB = mix(rayB, rayMean, fAvg);
    float sn = n1(z * 1.6, ix, uSeed + 9.0);
    float streak = 1.0 - uStreak * (1.0 - smoothstep(0.2, 0.8, sn));
    streak = mix(streak, 1.0 - uStreak * 0.5, fAvg);
    float gb = mix(0.6 + 0.4 * g.y, 0.8, fAvg);
    float ln = lumpN(vec2(fract(th) * 7.0, z * 1.3), 7.0, uSeed + 71.0);
    float lump = mix(1.0 - uLump, 1.0, smoothstep(0.25, 0.7, ln));
    float fz = fract(z / uRingPeriod);
    float ring = 1.0 - uRingDepth * exp(-pow((fz - 0.5) / 0.12, 2.0));
    float hub = smoothstep(uHub * 0.4, uHub * 2.0 + 1e-4, r);
    float fall = mix(1.0, uFalloff, smoothstep(0.08, 0.75, r));
    float pg = (1.0 + uPGlow * lens) * (1.0 + 0.3 * uDown);
    float B = rayB * streak * gb * lump * ring * hub * fall * uBright * pg;

    vec3 gcol = mix(uDimCol, uBase, smoothstep(0.15, 0.75, B));
    gcol = mix(gcol, uAccent, uHot * smoothstep(0.8, 1.3, B));
    gcol = mix(gcol, uAccent, 0.6 * min(lens, 1.0));

    vec3 col = uBg;
    col += uHazeCol * uHaze * exp(-r / uHazeR) * hub;
    col += uGlowCol * bl * uBloom * B * 0.45;
    col = mix(col, gcol * (0.45 + 0.75 * min(B, 1.4)), clamp(cov * smoothstep(0.02, 0.3, B), 0.0, 1.0));

    vec2 e = min(uv, 1.0 - uv);
    float vg = smoothstep(0.0, 0.16, e.x) * smoothstep(0.0, 0.16, e.y);
    col *= mix(1.0, vg, uVig);
    col += (h3(frag.x, frag.y, floor(uTime * 24.0)).x - 0.5) * uGrain * 0.12;

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

export default function TunnelBinaryDigits(props: Props) {
    props = withMovedControls(props)
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#02040E", baseColor = "#B31BAB", accentColor = "#A6C0FF", speed = 50, scale = 300, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("TunnelBinaryDigits shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("TunnelBinaryDigits link:", gl.getProgramInfoLog(prog))
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
        let down = 0
        let downE = 0
        let warp = 0
        const onDown = () => {
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
            const spd = (Math.max(0, Math.min(100, num(p.speed, 50))) / 50) * (reduced ? 0.25 : 1)
            clock = (clock + dt * spd) % 3600
            const k = 1 - Math.exp(-dt * 6)
            mx += (tx - mx) * k
            my += (ty - my) * k
            hov += (over - hov) * k
            // Press and hold: warp forward through the tunnel, easing in and back out.
            const advP = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const hoverAmt = clampN(advP.hover, 0, 100, 50) / 50
            downE += (down - downE) * (1 - Math.exp(-dt * 4))
            warp = (warp + dt * spd * downE * (clampN(advP.warp, 0, 100, 50) / 50) * hoverAmt * 3) % 3600
            const bg = parseColor(p.background, [0.03, 0.03, 0.04, 1])
            const base = parseColor(p.baseColor, [0.23, 0.18, 0.55, 1])
            const acc = parseColor(p.accentColor, [0.91, 0.42, 0.57, 1])
            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.uniform2f(u("uRes"), canvas.width, canvas.height)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform2f(u("uMouse"), mx, my)
            // Raw 0..1: the FRAG scales it by the Advanced `hover` row (RULES.md).
            gl.uniform1f(u("uHover"), hov)
            gl.uniform1f(u("uWarp"), warp)
            gl.uniform1f(u("uDown"), downE * hoverAmt)
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
        <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}
