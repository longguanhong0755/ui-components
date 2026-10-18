"use client"

/**
 * BurstFewThousand — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    centerX: 50,
    centerY: 50,
    voidRadius: 54,
    voidBreath: 6,
    voidRagged: 80,
    lengthMin: 45,
    lengthMax: 85,
    lineWidth: 90,
    lineAlpha: 60,
    alphaJitter: 45,
    exposure: 190,
    lobes: 7,
    lobeDepth: 80,
    lobeRotate: 0,
    gapDim: 10,
    curlSide: 80,
    curlFold: 60,
    curlLayers: 35,
    swayDeg: 5,
    rotateDeg: 2,
    loopS: 12,
    pulseS: 3,
    pulseLen: 8,
    pulseBoost: 50,
    dotCount: 200,
    dotAmount: 30,
    dotSize: 90,
    tipDots: 55,
    mint: 100,
    outerColor: "#1A86C8",
    dotColor: "#E2F9FF",
    pushRadius: 20,
    pushAmount: 4,
    seed: 1,
    grain: 0,
    vignette: 0,
    hover: 50,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    density?: number
    curl?: number
    glow?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const n = (v: unknown, d: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, num(v, d)))
    const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    const deg = Math.PI / 180
    const K = n(p.curl, 50, 0, 100) / 50
    const glow = n(p.glow, 50, 0, 100) / 50
    const strands = Math.max(4, Math.round(n(p.density, 1400, 500, 6000) / 4))
    const lenMin = n(adv.lengthMin, 45, 5, 150) / 100
    const lenMax = Math.max(lenMin + 0.01, n(adv.lengthMax, 85, 5, 200) / 100)

    gl.uniform4f(
        u("uGeo"),
        n(adv.centerX, 52, 0, 100) / 100,
        1 - n(adv.centerY, 48, 0, 100) / 100,
        Math.max(1, n(adv.voidRadius, 54, 0, 400)) / 1400,
        n(adv.voidBreath, 6, 0, 100) / 1400
    )
    gl.uniform4f(u("uLen"), lenMin, lenMax, n(adv.voidRagged, 80, 0, 100) / 100, strands)
    gl.uniform4f(
        u("uLobe"),
        Math.round(n(adv.lobes, 7, 1, 16)),
        n(adv.lobeDepth, 80, 0, 85) / 100,
        n(adv.lobeRotate, 0, -180, 180) * deg,
        n(adv.gapDim, 10, 0, 100) / 100
    )
    gl.uniform4f(
        u("uCurl"),
        (n(adv.curlSide, 80, 0, 200) / 100) * K,
        (n(adv.curlFold, 60, 0, 200) / 100) * K,
        (n(adv.curlLayers, 35, 0, 200) / 100) * K,
        n(adv.swayDeg, 5, 0, 45) * deg
    )
    gl.uniform4f(
        u("uTimeA"),
        n(adv.loopS, 12, 2, 60),
        n(adv.pulseS, 3, 1, 30),
        Math.max(1, n(adv.pulseLen, 8, 1, 50)) / 100,
        (n(adv.pulseBoost, 50, 0, 300) / 100) * glow
    )
    gl.uniform4f(
        u("uLine"),
        (Math.max(5, n(adv.lineWidth, 90, 5, 400)) / 100) * dpr,
        n(adv.lineAlpha, 60, 0, 100) / 100,
        n(adv.alphaJitter, 45, 0, 100) / 100,
        (n(adv.exposure, 190, 10, 600) / 100) * (0.7 + 0.3 * glow)
    )
    gl.uniform4f(
        u("uDot"),
        Math.round(n(adv.dotCount, 200, 4, 1000)),
        n(adv.dotAmount, 30, 0, 100) / 100,
        (Math.max(10, n(adv.dotSize, 90, 10, 400)) / 100) * dpr,
        n(adv.tipDots, 55, 0, 100) / 100
    )
    gl.uniform4f(
        u("uMisc"),
        n(adv.mint, 100, 0, 200) / 100,
        n(adv.rotateDeg, 2, 0, 30) * deg,
        Math.round(n(adv.seed, 1, 0, 999)),
        n(adv.hover, 50, 0, 100) / 50
    )
    gl.uniform4f(
        u("uFx"),
        n(adv.grain, 0, 0, 100) / 100,
        n(adv.vignette, 0, 0, 100) / 100,
        Math.max(1, n(adv.pushRadius, 20, 1, 100)) / 100,
        n(adv.pushAmount, 4, 0, 30) / 100
    )
    const outer = parseColor(adv.outerColor, [0.1, 0.53, 0.78, 1])
    const dot = parseColor(adv.dotColor, [0.89, 0.98, 1, 1])
    gl.uniform3f(u("uOuter"), outer[0], outer[1], outer[2])
    gl.uniform3f(u("uDotCol"), dot[0], dot[1], dot[2])
}

/*
 * Fibre burst: ~1400 hairline strands in 4 interleaved layers leave a ragged central void and
 * gather into 7 petal bundles that bow toward the sides further out (mirror-symmetric curl),
 * wrapping dark lobes at left and right. Each pixel inverts the strand path φ = θ0 + G(θ0, s)
 * by Newton's method to find which strand passes through it, then box-filters the 1 px line;
 * only where strands are denser than a pixel (near the void) it blends to mean coverage.
 * Each strand is blue or mint by hash (mint toward mid radius and bundle spines), a few are pale.
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
uniform vec4 uGeo;
uniform vec4 uLen;
uniform vec4 uLobe;
uniform vec4 uCurl;
uniform vec4 uTimeA;
uniform vec4 uLine;
uniform vec4 uDot;
uniform vec4 uMisc;
uniform vec4 uFx;
uniform vec3 uOuter;
uniform vec3 uDotCol;
out vec4 outColor;

const float TAU = 6.28318530718;
const float LTW[4] = float[4](0.6, -0.55, 0.2, -0.3);
const vec3 PALE = vec3(0.80, 0.93, 0.88);

uint pcg(uint v) {
    uint s = v * 747796405u + 2891336453u;
    uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
    return (w >> 22u) ^ w;
}
vec4 hash4(float id, float salt) {
    uint a = pcg(uint(max(id, 0.0)) ^ (uint(max(salt, 0.0)) * 2654435761u));
    uint b = pcg(a);
    uint c = pcg(b);
    uint d = pcg(c);
    return vec4(uvec4(a, b, c, d)) * (1.0 / 4294967295.0);
}

// Bend of a strand rooted at angle th, at normalised distance s: (G, dG/dth, dG/ds).
// -sin(2th) bows every bundle toward the horizontal axis, more with distance (s^3 term).
vec3 bend(float th, float s, float tw, float ph, float sp, float wt) {
    float a1 = wt + 2.0 * th + sp;
    float a2 = 2.0 * wt + 3.0 * th + sp * 0.55;
    float s2t = sin(2.0 * th);
    float c2t = cos(2.0 * th);
    float A = -0.5 * uCurl.x * s2t + 0.2 * uCurl.x * cos(th) + tw + 0.15 * uCurl.z * sin(3.0 * th + ph) + uCurl.w * (0.7 * sin(a1) + 0.3 * sin(a2));
    float Ad = -uCurl.x * c2t - 0.2 * uCurl.x * sin(th) + 0.45 * uCurl.z * cos(3.0 * th + ph) + uCurl.w * (1.4 * cos(a1) + 0.9 * cos(a2));
    float B = 0.5 * uCurl.y * s2t;
    float Bd = uCurl.y * c2t;
    float s2 = s * s;
    float s3 = s2 * s;
    return vec3(s2 * A - s3 * B, s2 * Ad - s3 * Bd, 2.0 * s * A - 3.0 * s2 * B);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float unit = max(max(uRes.x, uRes.y * 1.5), 1.0) * max(uScale, 0.05);
    float pxU = 1.0 / unit;
    vec2 ctr = uGeo.xy * uRes;
    vec2 p = (gl_FragCoord.xy - ctr) / unit;
    float T = uTime;
    float loopS = max(uTimeA.x, 1.0);
    float w = TAU / loopS;
    float wt = w * T;

    // Pointer: strands bend away from it and brighten near it.
    float hv = clamp(uHover, 0.0, 1.0) * uMisc.w;
    vec2 m = (uMouse * uRes - ctr) / unit;
    vec2 dm = p - m;
    float dl = length(dm);
    float R = max(uFx.z, 1e-3);
    float fall = clamp(1.0 - dl / R, 0.0, 1.0);
    fall *= fall;
    float kpush = min(uFx.w / (0.148 * R) * fall * hv, 0.9);
    p -= dm * kpush;
    float lift = 1.0 + 0.3 * fall * hv;

    float r = max(length(p), 1e-5);
    float rot = uMisc.y * sin(wt);
    float phi = atan(p.y, p.x) - rot;
    float r0 = uGeo.z + uGeo.w * (0.5 - 0.5 * cos(TAU * T / (loopS * 0.5)));
    float rag = 0.12 * uLen.z;
    float Lg = max(0.5 * (uLen.x + uLen.y), 0.05);
    float s = max(r - r0, 0.0) / Lg;
    float N = max(uLen.w, 4.0);
    float lobes = max(uLobe.x, 1.0);
    float depth = clamp(uLobe.y, 0.0, 0.85);
    float lc = -1.5707963 + uLobe.z;
    float linePx = max(uLine.x, 0.05);
    float lineEff = max(linePx, 1.0);
    float lineGain = linePx / lineEff;
    float salt = uMisc.z * 31.0;
    float tMid = smoothstep(0.07, 0.2, r) * (1.0 - 0.5 * smoothstep(0.35, 0.6, r));
    float tOut = smoothstep(0.32, 0.55, r) * 0.55;

    vec3 acc = vec3(0.0);
    float u0 = 0.0;
    float rho0 = 1.0;
    float gr0 = 1.0;

    for (int l = 0; l < 4; l++) {
        float fl = float(l);
        float tw = LTW[l] * uCurl.z;
        float ph = fl * 1.7 + uMisc.z * 0.37;
        float sp = fl * 1.3;
        float lcl = lc + (fl - 1.5) * 0.035;

        // Invert phi = th + G(th, s) for the root angle th.
        float th = phi;
        for (int it = 0; it < 3; it++) {
            vec3 b = bend(th, s, tw, ph, sp, wt);
            th -= (th + b.x - phi) / max(1.0 + b.y, 0.3);
        }
        vec3 g = bend(th, s, tw, ph, sp, wt);

        float x = th - lcl;
        float rho = 1.0 + depth * cos(lobes * x) + 0.25 * depth * cos(2.0 * lobes * x) - 0.22 * sin(th);
        float F = th + depth / lobes * sin(lobes * x) + 0.125 * depth / lobes * sin(2.0 * lobes * x) + 0.22 * cos(th);
        float c = F / TAU * N;
        float gz = g.z / Lg;
        float gTh = pxU * sqrt(1.0 / (r * r) + gz * gz) / max(abs(1.0 + g.y), 0.3);
        float fw = max(N * max(rho, 0.05) / TAU * gTh, 1e-4);
        if (l == 0) { u0 = F / TAU; rho0 = max(rho, 0.05); gr0 = gTh; }

        float gap = mix(uLobe.w, 1.0, smoothstep(0.55, 1.35, rho));
        float spine = 0.5 + 0.5 * cos(lobes * x);
        float mintP = clamp(uMisc.x * (0.25 + 0.5 * spine) * tMid, 0.0, 1.0);
        float paleP = 0.12 * spine * tMid;

        vec3 ex = vec3(0.0);
        for (int kk = -1; kk <= 1; kk++) {
            float cid = floor(c) + float(kk);
            float id = mod(cid, N);
            vec4 h = hash4(id, fl * 977.0 + salt + 11.0);
            vec4 h2 = hash4(id + 7919.0, fl * 977.0 + salt + 5.0);
            float ctrC = cid + 0.5 + (h.x - 0.5) * 0.7;
            float d = abs(c - ctrC);
            float Lc = lineEff * fw;
            float lo = max(d - 0.5 * fw, -0.5 * Lc);
            float hi = min(d + 0.5 * fw, 0.5 * Lc);
            float cov = max(hi - lo, 0.0) / fw;

            float r0i = r0 + rag * h.y * h.y;
            float len = mix(uLen.x, uLen.y, h.z);
            float sl = (r - r0i) / max(len, 1e-3);
            float alive = smoothstep(0.0, 0.05, sl) * (1.0 - smoothstep(0.8, 1.0, sl));
            float a = uLine.y * (1.0 + uLine.z * (h.w * 2.0 - 1.0));

            float pp = fract(h2.x + h.y * 0.5 + T / max(uTimeA.y, 0.1));
            float spos = (0.5 - 0.5 * cos(3.14159265 * pp)) * 1.2 - 0.1;
            float q = (sl - spos) / max(uTimeA.z, 0.005);
            float pulse = 1.0 + uTimeA.w * exp(-q * q);

            vec3 col = mix(uBase, uAccent, step(h2.z, mintP));
            col = mix(col, uOuter, tOut);
            col = mix(col, PALE, step(h2.w, paleP));
            ex += col * (cov * lineGain * a * alive * pulse);

            if (h2.y < uDot.w) {
                float rt = h2.y < uDot.w * 0.65 ? r0i + len * 0.03 : r0i + len * 0.88;
                float dr = (r - rt) * unit;
                float da = (c - ctrC) / fw;
                float dd2 = dr * dr + da * da;
                ex += uDotCol * (2.0 * exp(-dd2 / max(uDot.z * uDot.z, 0.05)));
            }
        }

        // Where strands are finer than a pixel (near the void), use their mean coverage.
        float aliveM = smoothstep(r0, r0 + rag + 0.05 * uLen.x + 1e-4, r) * (1.0 - smoothstep(r0 + uLen.x * 0.8, r0 + rag + uLen.y + 1e-4, r));
        vec3 colM = mix(mix(uBase, uAccent, mintP), uOuter, tOut);
        vec3 meanC = colM * (linePx * fw * uLine.y * aliveM * (1.0 + uTimeA.w * 0.12));
        acc += mix(ex, meanC, smoothstep(0.8, 2.0, fw)) * gap;
    }

    // Node dots: sit on the flow lines, densest by the void, drifting outward.
    if (r > r0 * 0.8) {
        float Nd = max(uDot.x, 4.0);
        float cd = u0 * Nd;
        float fwd = max(Nd * rho0 / TAU * gr0, 1e-4);
        float sq = sqrt(max(r - r0, 0.0) / 0.6);
        float BINS = 18.0;
        float bin = floor(sq * BINS);
        for (int kk = -1; kk <= 1; kk++) {
            float cid = floor(cd) + float(kk);
            float id = mod(cid, Nd);
            vec4 h = hash4(id + bin * Nd, 3001.0 + salt);
            if (h.x > uDot.y * (1.0 - 0.7 * min(sq, 1.0))) continue;
            float per = loopS / (2.0 + floor(h.w * 2.0));
            float fr = fract(h.z + T / per);
            float vis = smoothstep(0.0, 0.08, fr) * (1.0 - smoothstep(0.8, 1.0, fr));
            float sb = (bin + 0.15 + 0.7 * fr) / BINS;
            float rd = r0 + sb * sb * 0.6;
            float dr = (r - rd) * unit;
            float da = (cd - (cid + 0.5 + (h.y - 0.5) * 0.6)) / fwd;
            float dd2 = dr * dr + da * da;
            float rad = uDot.z * mix(0.8, 1.3, h.y);
            vec3 dc = mix(uDotCol, uBase, smoothstep(0.15, 0.45, r) * 0.5);
            acc += dc * (2.2 * vis * exp(-dd2 / max(rad * rad, 0.05)));
        }
    }

    vec3 col = uBg + (1.0 - exp(-acc * uLine.w * lift));

    float vd = length((uv - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0));
    col *= 1.0 - uFx.y * smoothstep(0.25, 0.95, vd);
    float gn = fract(sin(dot(gl_FragCoord.xy + floor(T * 24.0) * vec2(17.3, 41.7), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    col += gn * uFx.x * 0.18;
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

export default function BurstFewThousand(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#FFDC00", accentColor = "#17FF00", speed = 100, scale = 178, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("BurstFewThousand shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("BurstFewThousand link:", gl.getProgramInfoLog(prog))
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
