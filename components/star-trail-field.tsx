"use client"

/**
 * StarTrailField — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    centerX: 500,
    centerY: 500,
    ringGap: 421,
    ringPower: 105,
    rings: 200,
    jitter: 0,
    innerRadius: 110,
    lineWeight: 28,
    lineOpacity: 100,
    arcsPerRing: 13,
    arcGrowth: 110,
    innerFill: 62,
    outerFill: 50,
    fillRadius: 100,
    lengthSpread: 70,
    tickChance: 12,
    rotation: 6,
    pulse: 20,
    pulseSeconds: 12,
    seed: 7,
    parallax: 4,
    twist: 25,
    hover: 50,
    grain: 0,
    vignette: 0,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    density?: number
    direction?: "cw" | "ccw"
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

function clampNum(v: unknown, d: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, num(v, d)))
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const scale = clampNum(p.scale, 100, 10, 300) / 100
    gl.uniform2f(u("uCenter"), clampNum(adv.centerX, 515, 0, 1000) / 1000, 1 - clampNum(adv.centerY, 518, 0, 1000) / 1000)
    gl.uniform1f(u("uDir"), p.direction === "ccw" ? -1 : 1)
    gl.uniform1f(u("uDensity"), clampNum(p.density, 50, 0, 100) / 50)
    gl.uniform1f(u("uGap"), (clampNum(adv.ringGap, 255, 50, 2000) / 10000) * scale)
    gl.uniform1f(u("uPow"), clampNum(adv.ringPower, 116, 50, 200) / 100)
    gl.uniform1f(u("uRings"), clampNum(adv.rings, 60, 1, 200))
    gl.uniform1f(u("uJitter"), clampNum(adv.jitter, 12, 0, 50) / 100)
    gl.uniform1f(u("uInnerR"), (clampNum(adv.innerRadius, 110, 0, 1000) / 10000) * scale)
    gl.uniform1f(u("uLineW"), clampNum(adv.lineWeight, 28, 1, 200) / 10000)
    gl.uniform1f(u("uAlpha"), clampNum(adv.lineOpacity, 100, 0, 100) / 100)
    gl.uniform1f(u("uArcs"), clampNum(adv.arcsPerRing, 13, 1, 60))
    gl.uniform1f(u("uArcGrow"), clampNum(adv.arcGrowth, 110, 0, 150) / 100)
    gl.uniform1f(u("uFillIn"), clampNum(adv.innerFill, 62, 1, 95) / 100)
    gl.uniform1f(u("uFillOut"), clampNum(adv.outerFill, 50, 1, 95) / 100)
    gl.uniform1f(u("uFillR"), (clampNum(adv.fillRadius, 100, 1, 300) / 100) * scale)
    gl.uniform1f(u("uSpread"), clampNum(adv.lengthSpread, 70, 0, 95) / 100)
    gl.uniform1f(u("uTick"), clampNum(adv.tickChance, 12, 0, 100) / 100)
    gl.uniform1f(u("uRotDeg"), clampNum(adv.rotation, 6, 0, 90))
    gl.uniform1f(u("uPulse"), clampNum(adv.pulse, 20, 0, 90) / 100)
    gl.uniform1f(u("uPulseS"), clampNum(adv.pulseSeconds, 12, 1, 120))
    gl.uniform1f(u("uSeed"), clampNum(adv.seed, 7, 0, 9999))
    gl.uniform1f(u("uParallax"), clampNum(adv.parallax, 4, 0, 50) / 100)
    gl.uniform1f(u("uTwist"), (clampNum(adv.twist, 25, 0, 180) * Math.PI) / 180)
    gl.uniform1f(u("uHoverK"), clampNum(adv.hover, 50, 0, 100) / 50)
    gl.uniform1f(u("uGrain"), clampNum(adv.grain, 0, 0, 100) / 100)
    gl.uniform1f(u("uVignette"), clampNum(adv.vignette, 0, 0, 100) / 100)
}

/* Star-trail field: concentric rings of random-length arc dashes around one pivot,
   rotating rigidly (6°/s → one turn per 60 s at speed 50), each dash breathing ±20%
   on a 12 s sine with its own phase. Rings widen outward as in the reference:
   ring i sits at gap·i^power (2.55% of width, power 1.16 → ~13 px apart near the
   centre, ~25 px at the edge on a 534 px frame). Dash count per ring grows with i,
   so inner rings hold 2–4 long arcs and the outer ones break into many short dashes.
   Pointer: the pivot leans toward it and the ring band under it slides ahead,
   both eased by uHover. */
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
uniform vec2 uCenter;
uniform float uDir;
uniform float uDensity;
uniform float uGap;
uniform float uPow;
uniform float uRings;
uniform float uJitter;
uniform float uInnerR;
uniform float uLineW;
uniform float uAlpha;
uniform float uArcs;
uniform float uArcGrow;
uniform float uFillIn;
uniform float uFillOut;
uniform float uFillR;
uniform float uSpread;
uniform float uTick;
uniform float uRotDeg;
uniform float uPulse;
uniform float uPulseS;
uniform float uSeed;
uniform float uParallax;
uniform float uTwist;
uniform float uHoverK;
uniform float uGrain;
uniform float uVignette;
out vec4 outColor;
const float TAU = 6.28318530718;

float hashU(uint x) {
    x ^= x >> 16u; x *= 0x7feb352du;
    x ^= x >> 15u; x *= 0x846ca68bu;
    x ^= x >> 16u;
    return float(x) * (1.0 / 4294967295.0);
}
float rnd(float a, float b, float salt) {
    uint s = uint(max(uSeed, 0.0));
    return hashU((uint(a + 4096.0) * 73856093u) ^ (uint(b + 4096.0) * 19349663u) ^ (uint(salt) * 83492791u) ^ (s * 2654435761u));
}

float ringR(float x) {
    return max(uGap, 1e-4) * pow(max(x, 0.0), max(uPow, 0.5));
}

float ringCov(float i, float r, float ang, float t, float px, float hw) {
    float jit = (rnd(i, 0.0, 1.0) - 0.5) * uJitter * min(1.0, i - 0.5);
    float ri = ringR(i + jit);
    float dy = abs(r - ri);
    if (dy > hw + 2.0 * px) return 0.0;
    float n = max(2.0, floor(uArcs * pow(i / 10.0, uArcGrow) + rnd(i, 0.0, 2.0)));
    float u = fract((ang + rnd(i, 0.0, 3.0) * TAU) / TAU) * n;
    float k = min(floor(u), n - 1.0);
    float f = u - k;
    float fill = mix(uFillIn, uFillOut, smoothstep(0.0, max(uFillR, 1e-4), ri)) * uDensity;
    float len = fill * mix(1.0 - uSpread, 1.0 + uSpread, rnd(i, k, 4.0));
    if (rnd(i, k, 5.0) < uTick) len = mix(0.05, 0.14, rnd(i, k, 6.0));
    len = clamp(len, 0.03, 0.9);
    float c = mix(0.03 + len * 0.5, 0.97 - len * 0.5, rnd(i, k, 7.0));
    float lp = len * (1.0 + uPulse * sin(TAU * t / max(uPulseS, 0.1) + rnd(i, k, 8.0) * TAU));
    lp = clamp(lp, 0.01, max(2.0 * min(c, 1.0 - c) - 0.02, 0.01));
    float cell = TAU * ri / max(n, 1.0);
    float ds = max(0.0, abs(f - c) - lp * 0.5) * cell;
    float d = length(vec2(ds, dy));
    return clamp((hw - d) / px + 0.5, 0.0, 1.0);
}

void main() {
    float unit = max(uRes.x, 1.0);
    float px = 1.0 / unit;
    float hk = clamp(uHover, 0.0, 1.0) * uHoverK;
    vec2 cPx = (uCenter + (uMouse - 0.5) * uParallax * hk) * uRes;
    vec2 p = (gl_FragCoord.xy - cPx) / unit;
    float r = length(p);
    float ang = atan(p.y, p.x);
    float rot = radians(mod(uTime * uRotDeg, 360.0)) * uDir;
    float rM = length((uMouse * uRes - cPx) / unit);
    float band = max(uGap * 6.0, 1e-4);
    float tw = uTwist * hk * exp(-pow((r - rM) / band, 2.0)) * uDir;
    float a = ang + rot + tw;
    float hw = max(uLineW * 0.5, px * 0.5);
    float cov = 0.0;
    float i0 = floor(pow(r / max(uGap, 1e-4), 1.0 / max(uPow, 0.5)) + 0.5);
    for (int j = -1; j <= 1; j++) {
        float i = i0 + float(j);
        if (i < 1.0 || i > uRings) continue;
        cov = max(cov, ringCov(i, r, a, uTime, px, hw));
    }
    float ci = clamp((hw - abs(r - uInnerR)) / px + 0.5, 0.0, 1.0);
    vec3 col = mix(uBg, uBase, cov * uAlpha);
    col = mix(col, uAccent, ci * uAlpha);
    vec2 v = (gl_FragCoord.xy - 0.5 * uRes) / max(min(uRes.x, uRes.y), 1.0);
    col *= 1.0 - uVignette * smoothstep(0.25, 0.95, length(v));
    float g = rnd(gl_FragCoord.x, gl_FragCoord.y, floor(mod(uTime, 60.0) * 24.0) + 9.0) - 0.5;
    col += g * uGrain * 0.3;
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

export default function StarTrailField(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#FFFFFF", accentColor = "#FF0000", speed = 100, scale = 74, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("StarTrailField shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("StarTrailField link:", gl.getProgramInfoLog(prog))
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
