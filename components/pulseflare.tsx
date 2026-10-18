"use client"

/**
 * ThinStraightRays — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    originY: 87,
    aspect: 90,
    bandWidth: 22,
    bandPhase: 1,
    periodMs: 2000,
    brightLevel: 95,
    brightReach: 34,
    falloff: 58,
    floorLevel: 12,
    centreGap: 3,
    innerStart: 6,
    innerFull: 14,
    knotLevel: 35,
    dashStep: 8,
    dashGap: 0,
    pulsePeriodMs: 2000,
    pulseStart: 25,
    pulseTravel: 150,
    pulseWidth: 10,
    pulseLevel: 95,
    pulseKeep: 45,
    pulseTail: 55,
    spin: 0,
    rayPhase: 0,
    edgeSoft: 60,
    hover: 50,
    hoverShift: 15,
    hoverGlow: 60,
    grain: 0,
    vignette: 0,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"originY":"advanced"}}
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
    lineWeight?: number
    originX?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

function clampN(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v))
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const c = gl.canvas as HTMLCanvasElement
    const dpr = c.clientWidth > 0 ? c.width / c.clientWidth : 1
    gl.uniform1f(u("uRays"), clampN(Math.round(num(p.rays, 90)), 8, 400))
    gl.uniform1f(u("uLineW"), Math.max(0.5, num(p.lineWeight, 3)) * dpr)
    gl.uniform1f(u("uAA"), (clampN(num(adv.edgeSoft, 60), 10, 200) / 100) * Math.max(1, dpr))
    gl.uniform2f(u("uOrigin"), clampN(num(p.originX, 97), 0, 100) / 100, clampN(num(adv.originY, 50), 0, 100) / 100)
    gl.uniform1f(u("uAspect"), clampN(num(adv.aspect, 90), 50, 150) / 100)
    gl.uniform1f(u("uBandW"), clampN(num(adv.bandWidth, 22), 5, 60) / 100)
    gl.uniform1f(u("uBandPhase"), clampN(num(adv.bandPhase, 1), 0, 60) / 100)
    gl.uniform1f(u("uPeriod"), clampN(num(adv.periodMs, 2000), 200, 8000) / 1000)
    gl.uniform1f(u("uBright"), clampN(num(adv.brightLevel, 95), 0, 100) / 100)
    gl.uniform1f(u("uReach"), clampN(num(adv.brightReach, 34), 0, 100) / 100)
    gl.uniform1f(u("uRatio"), clampN(num(adv.falloff, 58), 10, 100) / 100)
    gl.uniform1f(u("uFloor"), clampN(num(adv.floorLevel, 12), 0, 50) / 100)
    gl.uniform1f(u("uGap0"), clampN(num(adv.centreGap, 3), 0, 20) / 100)
    gl.uniform1f(u("uInner0"), clampN(num(adv.innerStart, 6), 0, 50) / 100)
    gl.uniform1f(u("uInner1"), Math.max(clampN(num(adv.innerFull, 14), 0, 60), clampN(num(adv.innerStart, 6), 0, 50) + 1) / 100)
    gl.uniform1f(u("uKnot"), clampN(num(adv.knotLevel, 35), 0, 100) / 100)
    gl.uniform1f(u("uDashStep"), clampN(num(adv.dashStep, 8), 0, 60) / 100)
    gl.uniform1f(u("uGapFrac"), clampN(num(adv.dashGap, 0), 0, 60) / 100)
    gl.uniform1f(u("uPulsePeriod"), clampN(num(adv.pulsePeriodMs, 2000), 200, 8000) / 1000)
    gl.uniform1f(u("uPulseStart"), clampN(num(adv.pulseStart, 25), 0, 100) / 100)
    gl.uniform1f(u("uPulseTravel"), clampN(num(adv.pulseTravel, 150), 0, 300) / 100)
    gl.uniform1f(u("uPulseW"), clampN(num(adv.pulseWidth, 10), 1, 50) / 100)
    gl.uniform1f(u("uPulseLevel"), clampN(num(adv.pulseLevel, 95), 0, 100) / 100)
    gl.uniform1f(u("uPulseKeep"), clampN(num(adv.pulseKeep, 45), 1, 100) / 100)
    gl.uniform1f(u("uPulseTail"), clampN(num(adv.pulseTail, 55), 0, 100) / 100)
    gl.uniform1f(u("uSpin"), (clampN(num(adv.spin, 0), -30, 30) * Math.PI) / 180)
    gl.uniform1f(u("uRayPhase"), (clampN(num(adv.rayPhase, 0), 0, 360) * Math.PI) / 180)
    gl.uniform1f(u("uHoverK"), clampN(num(adv.hover, 50), 0, 100) / 50)
    gl.uniform1f(u("uHoverShift"), clampN(num(adv.hoverShift, 15), 0, 40) / 100)
    gl.uniform1f(u("uHoverGlow"), clampN(num(adv.hoverGlow, 60), 0, 100) / 100)
    gl.uniform1f(u("uGrain"), clampN(num(adv.grain, 0), 0, 100) / 100)
    gl.uniform1f(u("uVignette"), clampN(num(adv.vignette, 0), 0, 100) / 100)
}

/*
 * Rays fanning out from a point on the right edge, lit in hard-edged stepped dashes.
 * The dashes creep outward by one spacing per period, dimming as they go. On top of that,
 * a white pulse ring leaves the bright zone and sweeps out through the grey bands to the
 * frame edge, once per pulse period. At t = 0 the pulse is hidden inside the white ring,
 * so the resting frame matches the still. Both periods are 2 s, so the loop is seamless.
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
uniform float uRays;
uniform float uLineW;
uniform float uAA;
uniform vec2 uOrigin;
uniform float uAspect;
uniform float uBandW;
uniform float uBandPhase;
uniform float uPeriod;
uniform float uBright;
uniform float uReach;
uniform float uRatio;
uniform float uFloor;
uniform float uGap0;
uniform float uInner0;
uniform float uInner1;
uniform float uKnot;
uniform float uDashStep;
uniform float uGapFrac;
uniform float uPulsePeriod;
uniform float uPulseStart;
uniform float uPulseTravel;
uniform float uPulseW;
uniform float uPulseLevel;
uniform float uPulseKeep;
uniform float uPulseTail;
uniform float uSpin;
uniform float uRayPhase;
uniform float uHoverK;
uniform float uHoverShift;
uniform float uHoverGlow;
uniform float uGrain;
uniform float uVignette;
out vec4 outColor;
const float TAU = 6.28318530718;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
    vec2 p = gl_FragCoord.xy;
    float shortSide = max(min(uRes.x, uRes.y), 1.0);
    float hk = uHover * uHoverK;

    // Centre of the burst; the pointer pulls it vertically while hovering.
    vec2 c = vec2(uOrigin.x * uRes.x, (1.0 - uOrigin.y) * uRes.y);
    c.y += (uMouse.y - 0.5) * uRes.y * uHoverShift * hk;
    vec2 d = p - c;
    float len = length(d);
    float unit = shortSide * max(uScale, 0.05);
    float rr = length(vec2(d.x / max(uAspect, 0.05), d.y)) / unit;

    // Ray mask: perpendicular pixel distance to the nearest ray, constant width.
    float n = max(uRays, 1.0);
    float a = atan(d.y, d.x) - uRayPhase - uSpin * uTime;
    float ad = abs(fract(a * n / TAU + 0.5) - 0.5) * TAU / n;
    float perp = len * sin(min(ad, 1.5));
    float hw = 0.5 * uLineW;
    float mask = 1.0 - smoothstep(hw - uAA, hw + uAA, perp);

    // Travelling stepped dashes.
    float w = max(uBandW, 0.01);
    float shift = uBandPhase + w * fract(uTime / max(uPeriod, 0.05));
    float s = (rr - shift) / w;
    float k = floor(s);
    float f = s - k;
    float rc = (k + 0.5) * w + shift;
    float F = uBright * pow(max(uRatio, 1e-3), max(0.0, rc - uReach) / 0.22);
    F = max(F, uFloor);
    F *= 1.0 - uDashStep * step(0.5, f);
    F *= 1.0 - step(1.0 - uGapFrac, f) * step(0.001, uGapFrac);

    // Pulse ring sweeping outward: hard front, stepped tail.
    float pT = fract(uTime / max(uPulsePeriod, 0.05));
    float rp = uPulseStart + pT * uPulseTravel;
    float dp = rp - rr;
    float pw = max(uPulseW, 1e-3);
    float inP = step(0.0, dp) * (1.0 - step(pw, dp));
    float pLevel = uPulseLevel * pow(max(uPulseKeep, 1e-3), max(0.0, rr - 0.45));
    pLevel *= mix(1.0, uPulseTail, step(0.5 * pw, dp));
    F = max(F, pLevel * inP);

    // Dense dim knot near the centre; the lines stop just short of the point.
    F *= mix(uKnot, 1.0, smoothstep(uInner0, max(uInner1, uInner0 + 1e-3), rr));
    float gapMask = smoothstep(uGap0, uGap0 + 0.01, rr);
    F *= gapMask;

    // Pointer: rays light up around the cursor.
    vec2 m = (p - uMouse * uRes) / shortSide;
    F += uHoverGlow * hk * exp(-dot(m, m) * 30.0) * gapMask;
    F = clamp(F, 0.0, 1.0);

    vec3 ray = mix(uBase, uAccent, smoothstep(0.5, 0.95, F));
    vec3 col = mix(uBg, ray, clamp(mask * F, 0.0, 1.0));

    vec2 uv = p / max(uRes, vec2(1.0));
    vec2 vq = (uv - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0);
    col *= 1.0 - uVignette * smoothstep(0.2, 1.0, length(vq));
    col += (h21(p + mod(floor(uTime * 24.0), 97.0) * 17.0) - 0.5) * uGrain * 0.2;
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

export default function ThinStraightRays(props: Props) {
    props = withMovedControls(props)
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#00FFEB", accentColor = "#00F59F", speed = 50, scale = 108, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("ThinStraightRays shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("ThinStraightRays link:", gl.getProgramInfoLog(prog))
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
