"use client"

/**
 * FullFrameMosaic — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    rows: 154,
    jitter: 2,
    outlierRate: 7,
    outlierShift: 15,
    baseSpread: 4,
    ditherSpread: 14,
    brightY: 26,
    transY: 46,
    darkY: 61,
    bottomY: 82,
    driftAmp: 4,
    period: 6,
    twinkleAmp: 10,
    flashRate: 45,
    flashMs: 400,
    flashStrength: 45,
    rim: 18,
    vignette: 60,
    vignetteDepth: 6,
    vignetteRadius: 4,
    vignetteColor: "#0D0B04",
    grain: 0,
    topEdgeColor: "#C9A24A",
    tanColor: "#A88A50",
    oliveColor: "#B89848",
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    bottomColor?: string
    sparkle?: number
    grout?: number
    hover?: number
    hoverRadius?: number
    hoverLift?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
    const sparkle = clamp(num(p.sparkle, 40), 0, 100) / 40
    const set3 = (name: string, c: RGBA) => gl.uniform3f(u(name), c[0], c[1], c[2])
    set3("uBottom", parseColor(p.bottomColor, [0.784, 0.588, 0.243, 1]))
    set3("uTopEdge", parseColor(adv.topEdgeColor, [0.788, 0.635, 0.29, 1]))
    set3("uTan", parseColor(adv.tanColor, [0.659, 0.541, 0.314, 1]))
    set3("uOlive", parseColor(adv.oliveColor, [0.722, 0.596, 0.282, 1]))
    set3("uVigCol", parseColor(adv.vignetteColor, [0.051, 0.043, 0.016, 1]))
    gl.uniform1f(u("uGrout"), clamp(num(p.grout, 15), 0, 100) / 100)
    gl.uniform1f(u("uRows"), clamp(num(adv.rows, 100), 10, 400))
    gl.uniform1f(u("uJitter"), clamp(num(adv.jitter, 12), 0, 100) / 100)
    gl.uniform1f(u("uOutRate"), clamp(num(adv.outlierRate, 7), 0, 100) / 100)
    gl.uniform1f(u("uOutShift"), clamp(num(adv.outlierShift, 15), 0, 100) / 100)
    gl.uniform1f(u("uSpreadBase"), clamp(num(adv.baseSpread, 4), 0, 100) / 100)
    gl.uniform1f(u("uSpreadTrans"), clamp(num(adv.ditherSpread, 14), 0, 100) / 100)
    gl.uniform1f(u("uBrightY"), clamp(num(adv.brightY, 26), 0, 100) / 100)
    gl.uniform1f(u("uTransY"), clamp(num(adv.transY, 46), 0, 100) / 100)
    gl.uniform1f(u("uDarkY"), clamp(num(adv.darkY, 61), 0, 100) / 100)
    gl.uniform1f(u("uBottomY"), clamp(num(adv.bottomY, 82), 0, 100) / 100)
    gl.uniform1f(u("uDrift"), clamp(num(adv.driftAmp, 4), 0, 50) / 100)
    gl.uniform1f(u("uPeriod"), clamp(num(adv.period, 6), 1, 60))
    gl.uniform1f(u("uTwAmp"), (clamp(num(adv.twinkleAmp, 10), 0, 100) / 100) * sparkle)
    gl.uniform1f(u("uFlashRate"), (clamp(num(adv.flashRate, 45), 0, 100) / 100) * sparkle)
    gl.uniform1f(u("uFlashS"), clamp(num(adv.flashMs, 400), 50, 5000) / 1000)
    gl.uniform1f(u("uFlashAmt"), clamp(num(adv.flashStrength, 45), 0, 100) / 100)
    gl.uniform1f(u("uRim"), clamp(num(adv.rim, 18), 0, 100) / 100)
    gl.uniform1f(u("uVig"), clamp(num(adv.vignette, 60), 0, 100) / 60)
    gl.uniform1f(u("uVigDepth"), clamp(num(adv.vignetteDepth, 6), 0, 50) / 100)
    gl.uniform1f(u("uVigRadius"), clamp(num(adv.vignetteRadius, 4), 0, 50) / 100)
    gl.uniform1f(u("uGrain"), (clamp(num(adv.grain, 0), 0, 100) / 100) * 0.3)
    gl.uniform1f(u("uHoverAmt"), clamp(num(p.hover, 50), 0, 100) / 50)
    gl.uniform1f(u("uHoverR"), clamp(num(p.hoverRadius, 18), 1, 100) / 100)
    gl.uniform1f(u("uHoverLift"), clamp(num(p.hoverLift, 20), 0, 100) / 100)
}

/* Gold glass mosaic: square tiles on a grout grid, each tile a dithered sample of a vertical
   ramp (honey → pale lemon → ragged transition → copper → amber → olive), with per-tile
   twinkle, sequin flashes, a slow 6 s band drift, a rounded-box vignette and a pointer light. */
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
uniform vec3 uBottom;
uniform vec3 uTopEdge;
uniform vec3 uTan;
uniform vec3 uOlive;
uniform vec3 uVigCol;
uniform float uGrout;
uniform float uRows;
uniform float uJitter;
uniform float uOutRate;
uniform float uOutShift;
uniform float uSpreadBase;
uniform float uSpreadTrans;
uniform float uBrightY;
uniform float uTransY;
uniform float uDarkY;
uniform float uBottomY;
uniform float uDrift;
uniform float uPeriod;
uniform float uTwAmp;
uniform float uFlashRate;
uniform float uFlashS;
uniform float uFlashAmt;
uniform float uRim;
uniform float uVig;
uniform float uVigDepth;
uniform float uVigRadius;
uniform float uGrain;
uniform float uHoverAmt;
uniform float uHoverR;
uniform float uHoverLift;
out vec4 outColor;
const float TAU = 6.28318530718;
const float PI = 3.14159265359;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hc(vec2 c, float k) { return h21(c + vec2(17.13 * k + 3.7, 29.71 * k + 11.3)); }
float seg(float y, float a, float b) { return clamp((y - a) / max(b - a, 1e-4), 0.0, 1.0); }
vec3 ramp(float y) {
    float p1 = uBrightY - 0.10;
    float p2 = uBrightY - 0.03;
    float p3 = uBrightY + 0.05;
    float p4 = uTransY;
    float p5 = uDarkY;
    float p6 = mix(uDarkY, uBottomY, 0.45);
    float p7 = uBottomY;
    vec3 c = uTopEdge;
    c = mix(c, mix(uTopEdge, uAccent, 0.6), seg(y, 0.0, p1));
    c = mix(c, uAccent, seg(y, p1, p2));
    c = mix(c, uTan, seg(y, p3, p4));
    c = mix(c, uBase, seg(y, p4, p5));
    c = mix(c, mix(uBase, uBottom, 0.5), seg(y, p5, p6));
    c = mix(c, uBottom, seg(y, p6, p7));
    c = mix(c, uOlive, seg(y, p7, 1.0));
    return c;
}
float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 halfRes = 0.5 * uRes;
    float cellPx = max(uRes.y / max(uRows, 1.0) * max(uScale, 0.05), 2.0);
    vec2 p = frag - halfRes;
    vec2 g = p / cellPx;
    vec2 cell = floor(g);
    vec2 f = fract(g);
    vec2 centre = (cell + 0.5) * cellPx + halfRes;
    float y = 1.0 - centre.y / max(uRes.y, 1.0);

    float T = max(uPeriod, 0.5);
    float ph = uTime / T;

    // Ramp drifts vertically through the fixed grid; the dither scatter peaks in the transition band.
    float ys = y + uDrift * sin(TAU * ph);
    float bump = smoothstep(uBrightY + 0.04, uTransY, ys) * (1.0 - smoothstep(uTransY, uDarkY + 0.02, ys));
    float spread = mix(uSpreadBase, uSpreadTrans, bump);
    float yo = ys + (hc(cell, 1.0) * 2.0 - 1.0) * spread;
    if (hc(cell, 3.0) < uOutRate) yo += (hc(cell, 4.0) < 0.5 ? -1.0 : 1.0) * uOutShift;
    vec3 col = ramp(yo);

    // Static per-tile lightness plus a looping twinkle (integer cycles per period: 1.5–3 s at 6 s).
    float jit = (hc(cell, 2.0) * 2.0 - 1.0) * uJitter * mix(0.8, 1.6, bump);
    float k = 2.0 + floor(hc(cell, 5.0) * 3.0);
    float tw = 0.6 * sin(TAU * (k * ph + hc(cell, 6.0))) + 0.4 * sin(TAU * ((k + 1.0) * ph + hc(cell, 7.0)));
    col *= max(0.0, 1.0 + jit + tw * uTwAmp);

    // Pointer light, sampled per tile so tiles stay flat.
    vec2 m = uMouse * uRes;
    float hr = max(uHoverR * uRes.x, 1.0);
    vec2 dm = (centre - m) / hr;
    float glow = uHover * uHoverAmt * exp(-dot(dm, dm) * 2.0);
    col *= 1.0 + glow * uHoverLift;

    // Sequin flash: once per cycle for a share of tiles, sin² over flashMs.
    float chance = uFlashRate + glow * 0.5;
    float fs = max(uFlashS, 0.05);
    float w = fract(ph + hc(cell, 8.0)) * T;
    float s = sin(PI * clamp(w / fs, 0.0, 1.0));
    float fl = (hc(cell, 9.0) < chance && w < fs) ? s * s : 0.0;
    col = mix(col, mix(uAccent, vec3(1.0), 0.35), clamp(fl * uFlashAmt, 0.0, 1.0));

    // Grout and a 1px darker rim inside each tile.
    float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * cellPx;
    float gh = 0.5 * uGrout * cellPx;
    float tile = clamp(e - gh + 0.5, 0.0, 1.0);
    float rim = 1.0 - uRim * (1.0 - clamp(e - gh - 0.5, 0.0, 1.0));
    col = mix(uBg, col * rim, tile);

    // Rounded-box vignette.
    float sh = min(uRes.x, uRes.y);
    float depth = max(uVigDepth * sh * max(1.0, uVig), 1.0);
    float d = sdRoundBox(p, halfRes, uVigRadius * sh);
    float v = smoothstep(-depth, -depth * 0.25, d);
    col = mix(col, uVigCol, clamp(v * uVig, 0.0, 1.0));

    col += (h21(frag + floor(uTime * 24.0) * vec2(37.0, 17.0)) - 0.5) * uGrain;
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

export default function FullFrameMosaic(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#7E5226", accentColor = "#F2E489", speed = 100, scale = 300, hover = 50, hoverRadius = 70, hoverLift = 50, style } = props
    void [baseColor, accentColor, speed, scale, hover, hoverRadius, hoverLift]
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("FullFrameMosaic shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("FullFrameMosaic link:", gl.getProgramInfoLog(prog))
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
            // Raw 0..1: the FRAG scales it by the top-level `hover` row.
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
