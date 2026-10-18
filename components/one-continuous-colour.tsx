"use client"

/**
 * OneContinuousColour — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    periodMs: 1000,
    gap: 20,
    hookStart: 50,
    driftS: 20,
    driftAmount: 100,
    angleDrift: 30,
    phase: 0,
    creaseWidth: 100,
    creaseGlow: 100,
    creaseLevel: 100,
    edgeSoft: 4,
    troughDepth: 65,
    troughWidth: 55,
    capTop: 12,
    capDepth: 40,
    capSoft: 6,
    sheen: 7,
    violetLevel: 50,
    iceStart: -50,
    iceEnd: 80,
    darkStart: 40,
    darkEnd: 150,
    troughColor: "#1B193D",
    midColor: "#3200FF",
    lilacColor: "#4A47A6",
    grain: 0,
    vignette: 0,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    curl?: number
    angle?: number
    softness?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
    const curl = clamp(num(p.curl, 20), 0, 100) / 100
    const angle = (num(p.angle, 53) * Math.PI) / 180
    const soft = clamp(num(p.softness, 50), 0, 100) / 100

    gl.uniform1f(u("uK"), curl * 8)
    gl.uniform1f(u("uAngle"), angle)
    gl.uniform1f(u("uFade"), 0.5 - 0.4 * soft)

    gl.uniform1f(u("uPeriod"), Math.max(0.05, num(adv.periodMs, 1000) / 1000))
    gl.uniform1f(u("uGap"), Math.max(0.01, num(adv.gap, 20) / 100))
    gl.uniform1f(u("uHook"), num(adv.hookStart, 22) / 100)
    gl.uniform1f(u("uDriftS"), Math.max(1, num(adv.driftS, 20)))
    gl.uniform1f(u("uDriftAmt"), clamp(num(adv.driftAmount, 40), 0, 100) / 100)
    gl.uniform1f(u("uAngleDrift"), (num(adv.angleDrift, 3) * Math.PI) / 180)
    gl.uniform1f(u("uPhase0"), num(adv.phase, 0) / 100)
    gl.uniform1f(u("uCreaseW"), Math.max(0.001, num(adv.creaseWidth, 10) / 1000))
    gl.uniform1f(u("uGlow"), clamp(num(adv.creaseGlow, 70), 0, 100) / 100)
    gl.uniform1f(u("uCreaseL"), clamp(num(adv.creaseLevel, 58), 0, 100) / 100)
    gl.uniform1f(u("uEdge"), Math.max(0.001, num(adv.edgeSoft, 4) / 100))
    gl.uniform1f(u("uDepth"), clamp(num(adv.troughDepth, 65), 0, 100) / 100)
    gl.uniform1f(u("uHold"), Math.max(0.02, num(adv.troughWidth, 55) / 100))
    gl.uniform1f(u("uTopY"), num(adv.capTop, 12) / 100)
    gl.uniform1f(u("uCapDepth"), num(adv.capDepth, 30) / 100)
    gl.uniform1f(u("uCapSoft"), Math.max(0.005, num(adv.capSoft, 6) / 100))
    gl.uniform1f(u("uSheen"), Math.max(0, num(adv.sheen, 8) / 100))
    gl.uniform1f(u("uViolet"), clamp(num(adv.violetLevel, 60), 0, 100) / 100)
    const iceA = num(adv.iceStart, 10) / 100
    const iceB = num(adv.iceEnd, 80) / 100
    gl.uniform1f(u("uIceA"), iceA)
    gl.uniform1f(u("uIceB"), Math.max(iceA + 0.01, iceB))
    const darkA = num(adv.darkStart, 40) / 100
    const darkB = num(adv.darkEnd, 95) / 100
    gl.uniform1f(u("uDarkA"), darkA)
    gl.uniform1f(u("uDarkB"), Math.max(darkA + 0.01, darkB))

    const tr = parseColor(adv.troughColor, [0.106, 0.098, 0.239, 1])
    const md = parseColor(adv.midColor, [0.29, 0.278, 0.651, 1])
    const li = parseColor(adv.lilacColor, [0.435, 0.482, 0.847, 1])
    gl.uniform3f(u("uTrough"), tr[0], tr[1], tr[2])
    gl.uniform3f(u("uMid"), md[0], md[1], md[2])
    gl.uniform3f(u("uLilac"), li[0], li[1], li[2])

    gl.uniform1f(u("uGrain"), clamp(num(adv.grain, 0), 0, 100) / 100)
    gl.uniform1f(u("uVignette"), clamp(num(adv.vignette, 0), 0, 100) / 100)
}

/*
 * Silk folds: sawtooth stripes on a gently bent coordinate, scrolled one stripe-gap per
 * period along the travel direction (53°, down-right), shading a fixed luminance wash
 * mapped through a bg → trough → mid → violet → lilac → ice ramp.
 * Each fold: a thin violet crease line, then a wide soft dark tongue on its down-right
 * side whose upper end is a rounded cap near the top of the frame, then the wash again.
 * A slow cosine drift deepens the bend and widens the tongues.
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
uniform vec3 uTrough;
uniform vec3 uMid;
uniform vec3 uLilac;
uniform float uK;
uniform float uAngle;
uniform float uFade;
uniform float uPeriod;
uniform float uGap;
uniform float uHook;
uniform float uDriftS;
uniform float uDriftAmt;
uniform float uAngleDrift;
uniform float uPhase0;
uniform float uCreaseW;
uniform float uGlow;
uniform float uCreaseL;
uniform float uEdge;
uniform float uDepth;
uniform float uHold;
uniform float uTopY;
uniform float uCapDepth;
uniform float uCapSoft;
uniform float uSheen;
uniform float uViolet;
uniform float uIceA;
uniform float uIceB;
uniform float uDarkA;
uniform float uDarkB;
uniform float uGrain;
uniform float uVignette;
out vec4 outColor;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

vec3 ramp(float L) {
    L = clamp(L, 0.0, 1.0);
    vec3 c = mix(uBg, uTrough, smoothstep(0.0, 0.2, L));
    c = mix(c, uMid, smoothstep(0.2, 0.42, L));
    c = mix(c, uBase, smoothstep(0.42, 0.62, L));
    c = mix(c, uLilac, smoothstep(0.62, 0.8, L));
    c = mix(c, uAccent, smoothstep(0.8, 1.0, L));
    return c;
}

void main() {
    const float TAU = 6.2831853;
    vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));
    vec2 uvd = vec2(uv.x, 1.0 - uv.y);                 // y down, like the reference
    float asp = uRes.y / max(uRes.x, 1.0);
    vec2 p = vec2(uvd.x - 0.5, (uvd.y - 0.5) * asp);    // width units, centred

    float w = 0.5 - 0.5 * cos(TAU * uTime / max(uDriftS, 0.5));
    float a = uAngle + uAngleDrift * (2.0 * w - 1.0);
    vec2 d = vec2(cos(a), sin(a));                      // travel direction (down-right)
    vec2 n = vec2(d.y, -d.x);                           // crease direction (up-right)
    float s = dot(p, d);
    float t = dot(p, n);

    float k = uK * (1.0 + uDriftAmt * (2.0 * w - 1.0));
    float ht = max(t - uHook, 0.0);
    float sw = s - k * ht * ht;

    float gap = max(uGap * uScale, 1e-3);
    float uu = sw / gap - uTime / max(uPeriod, 1e-3) + uPhase0;
    float ph = fract(uu);
    float aa = fwidth(uu) * 1.5;
    float edge = max(uEdge, aa);

    // dark tongue on the down-right side of each crease: narrower near the bottom,
    // soft fade back to the wash, rounded cap at its upper end
    float tw = uHold * (1.0 + 0.4 * uDriftAmt * w) * mix(1.0, 0.6, smoothstep(0.45, 1.0, uvd.y));
    tw = max(tw, 0.02);
    float D = smoothstep(0.0, edge, ph) * (1.0 - smoothstep(tw * clamp(uFade, 0.0, 0.95), tw, ph));
    float r = ph / tw;
    float capY = uTopY + uCapDepth * r * r;
    D *= smoothstep(capY - uCapSoft, capY + uCapSoft, uvd.y);

    // faint lift just before the next crease
    float S = smoothstep(0.6, 0.97, ph) * (1.0 - smoothstep(1.0 - edge, 1.0, ph));

    // thin violet crease line at the wrap
    float dc = min(ph, 1.0 - ph);
    float cw = max(uCreaseW, aa * 0.5);
    float C = exp(-(dc * dc) / max(cw * cw, 1e-6));

    // fixed wash: ice lower-left, violet top-left, black right
    float g = uvd.y - 0.7 * uvd.x;
    float ice = smoothstep(uIceA, uIceB, g);
    float Lw = mix(uViolet, 1.0, ice);
    float dark = smoothstep(uDarkA, uDarkB, uvd.x * 0.85 + (1.0 - uvd.y) * 0.25);
    Lw *= 1.0 - dark;

    float L = Lw * (1.0 - uDepth * D) * (1.0 + uSheen * S);
    L = mix(L, uCreaseL * (1.0 - 0.5 * dark), clamp(C * uGlow * (1.0 - 0.8 * dark), 0.0, 1.0));

    vec2 m = uv - uMouse;
    m.x *= uRes.x / max(uRes.y, 1.0);
    L += uHover * 0.2 * exp(-dot(m, m) * 18.0) * (1.0 - 0.6 * dark);

    vec3 col = ramp(L);

    float rv = length(uv - 0.5) * 1.41421;
    col *= 1.0 - uVignette * smoothstep(0.35, 1.0, rv);
    float gr = h21(gl_FragCoord.xy + fract(uTime * 7.0) * vec2(97.0, 61.0)) - 0.5;
    col += gr * uGrain * 0.18;

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

export default function OneContinuousColour(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#010103", baseColor = "#C3FF00", accentColor = "#F0FF0A", speed = 59, scale = 62, hover = 200, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("OneContinuousColour shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("OneContinuousColour link:", gl.getProgramInfoLog(prog))
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
