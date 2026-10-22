"use client"

/**
 * GlossyLiquidLooking — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    magentaColor: "#D43CFF",
    violetColor: "#5A3CFF",
    yellowColor: "#FFD23A",
    orangeColor: "#FF9A1E",
    fallColor: "#1E5AFF",
    shadowColor: "#0A1450",
    sheenColor: "#F2FAFF",
    gapColor: "#0C0A2A",
    chromeColor: "#5E6670",
    flow: 45,
    drift: 10,
    loopTime: 12,
    flowAngle: -35,
    warp: 230,
    fieldFreq: 120,
    octaves: 4,
    seed: 7,
    stretch: 160,
    dropout: 22,
    thinShare: 26,
    orangeShare: 14,
    maxWidth: 6,
    falloffWidth: 8,
    falloffLength: 34,
    lineGap: 3,
    specPower: 40,
    bump: 55,
    lightAngle: 135,
    pointerRadius: 15,
    grain: 0,
    vignette: 0,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    bands?: number
    thickness?: number
    gloss?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

function clampN(v: unknown, lo: number, hi: number, d: number): number {
    return Math.max(lo, Math.min(hi, num(v, d)))
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const col = (name: string, v: unknown, fb: RGBA) => {
        const c = parseColor(typeof v === "string" ? v : undefined, fb)
        gl.uniform3f(u(name), c[0], c[1], c[2])
    }
    gl.uniform1f(u("uBands"), clampN(p.bands, 3, 20, 11))
    gl.uniform1f(u("uThick"), clampN(p.thickness, 10, 90, 34) / 100)
    gl.uniform1f(u("uGloss"), clampN(p.gloss, 0, 100, 85) / 100)
    gl.uniform1f(u("uHoverK"), clampN(p.hover, 0, 100, 50) / 50)
    col("uMagenta", adv.magentaColor, [0.831, 0.235, 1, 1])
    col("uViolet", adv.violetColor, [0.353, 0.235, 1, 1])
    col("uYellow", adv.yellowColor, [1, 0.824, 0.227, 1])
    col("uOrange", adv.orangeColor, [1, 0.604, 0.118, 1])
    col("uFall", adv.fallColor, [0.118, 0.353, 1, 1])
    col("uShadow", adv.shadowColor, [0.039, 0.078, 0.314, 1])
    col("uSheen", adv.sheenColor, [0.949, 0.98, 1, 1])
    col("uGap", adv.gapColor, [0.047, 0.039, 0.165, 1])
    col("uChrome", adv.chromeColor, [0.369, 0.4, 0.439, 1])
    gl.uniform1f(u("uFlow"), clampN(adv.flow, 0, 400, 45) / 100)
    gl.uniform1f(u("uDrift"), clampN(adv.drift, 0, 100, 10) / 100)
    gl.uniform1f(u("uAngle"), (clampN(adv.flowAngle, -180, 180, -35) * Math.PI) / 180)
    gl.uniform1f(u("uWarp"), clampN(adv.warp, 0, 600, 230) / 100)
    gl.uniform1f(u("uFreq"), clampN(adv.fieldFreq, 30, 400, 120) / 100)
    gl.uniform1i(u("uOct"), Math.round(clampN(adv.octaves, 1, 6, 4)))
    gl.uniform1f(u("uSeed"), clampN(adv.seed, 0, 100, 7))
    gl.uniform1f(u("uStretch"), clampN(adv.stretch, 50, 300, 160) / 100)
    gl.uniform1f(u("uDrop"), clampN(adv.dropout, 0, 90, 22) / 100)
    gl.uniform1f(u("uThin"), clampN(adv.thinShare, 0, 90, 26) / 100)
    gl.uniform1f(u("uOrangeShare"), clampN(adv.orangeShare, 0, 50, 14) / 100)
    gl.uniform1f(u("uMaxW"), clampN(adv.maxWidth, 1, 20, 6) / 100)
    gl.uniform1f(u("uFallW"), clampN(adv.falloffWidth, 0, 20, 8) / 100)
    gl.uniform1f(u("uFallFrac"), clampN(adv.falloffLength, 0, 80, 34) / 100)
    gl.uniform1f(u("uLineGap"), clampN(adv.lineGap, 0, 15, 3) / 100)
    gl.uniform1f(u("uSpec"), clampN(adv.specPower, 2, 200, 40))
    gl.uniform1f(u("uBump"), clampN(adv.bump, 0, 200, 55) / 100)
    gl.uniform1f(u("uLight"), (clampN(adv.lightAngle, 0, 360, 135) * Math.PI) / 180)
    gl.uniform1f(u("uRad"), clampN(adv.pointerRadius, 2, 60, 15) / 100)
    gl.uniform1f(u("uGrain"), clampN(adv.grain, 0, 100, 0) / 100)
    gl.uniform1f(u("uVign"), clampN(adv.vignette, 0, 100, 0) / 100)
}

/*
 * Iso-contour ribbons of a very slowly evolving, domain-warped gradient-noise field.
 * Dense contours: wide stacks (red edge → magenta → yellow → cyan → royal-blue glossy falloff),
 * thin red/magenta/cyan triplets, orange single lines, and chrome hairlines in the black pools.
 * The field barely drifts, as in the reference.
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
uniform float uBands;
uniform float uThick;
uniform float uGloss;
uniform float uHoverK;
uniform vec3 uMagenta;
uniform vec3 uViolet;
uniform vec3 uYellow;
uniform vec3 uOrange;
uniform vec3 uFall;
uniform vec3 uShadow;
uniform vec3 uSheen;
uniform vec3 uGap;
uniform vec3 uChrome;
uniform float uFlow;
uniform float uPhase;
uniform float uDrift;
uniform float uAngle;
uniform float uWarp;
uniform float uFreq;
uniform int uOct;
uniform float uSeed;
uniform float uStretch;
uniform float uDrop;
uniform float uThin;
uniform float uOrangeShare;
uniform float uMaxW;
uniform float uFallW;
uniform float uFallFrac;
uniform float uLineGap;
uniform float uSpec;
uniform float uBump;
uniform float uLight;
uniform float uRad;
uniform float uGrain;
uniform float uVign;
out vec4 outColor;

vec2 hash2(vec2 p) {
    uvec2 q = uvec2(ivec2(p) + ivec2(8192));
    q = q * uvec2(1597334673u, 3812015801u);
    uint n = (q.x ^ q.y) * 1597334673u;
    uvec2 r = uvec2(n, (n ^ (n >> 15u)) * 2246822519u);
    return vec2(r >> 16u) / 32767.5 - 1.0;
}
float gnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = p - i;
    vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float a = dot(hash2(i), f);
    float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
    return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}
const mat2 ROT = mat2(0.8, -0.6, 0.6, 0.8);
float fbm(vec2 p, int n) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 6; i++) {
        if (i >= n) break;
        s += a * gnoise(p);
        p = ROT * p * 2.03 + vec2(1.7, 9.2);
        a *= 0.45;
    }
    return s;
}
// c travels a closed circle in noise space once per loop, so the field returns to its start seamlessly.
float field(vec2 p, vec2 c) {
    int lo = max(uOct - 1, 1);
    vec2 q = vec2(fbm(p + c, lo), fbm(p + vec2(5.2, 1.3) + vec2(-c.y, c.x), lo));
    vec2 r = vec2(fbm(p + uWarp * q + vec2(1.7, 9.2) + 1.5 * c.yx, lo),
                  fbm(p + uWarp * q + vec2(8.3, 2.8) - 1.3 * c, lo));
    return fbm(p + uWarp * r, uOct);
}
float seg(float x, float a, float b, float aa) {
    return clamp(smoothstep(a - aa, a + aa, x) - smoothstep(b - aa, b + aa, x), 0.0, 1.0);
}
void main() {
    vec2 res = max(uRes, vec2(1.0));
    vec2 uv = gl_FragCoord.xy / res;
    float aspect = res.x / res.y;
    vec2 P = (gl_FragCoord.xy - 0.5 * res) / res.y;

    // Pointer: soft Gaussian pinch of the field toward the cursor, eased by uHover.
    vec2 M = (uMouse * res - 0.5 * res) / res.y;
    float hk = clamp(uHover, 0.0, 1.0) * uHoverK;
    vec2 dP = P - M;
    float rr = max(uRad * aspect, 1e-3);
    float pg = exp(-dot(dP, dP) / (rr * rr));
    P -= dP * pg * 0.45 * hk;

    float ph = 6.2831853 * uPhase;
    vec2 cyc = vec2(cos(ph), sin(ph));
    vec2 c = cyc * uFlow;
    vec2 dir = vec2(cos(uAngle), sin(uAngle));
    vec2 nrm = vec2(-dir.y, dir.x);
    float freq = uFreq / max(uScale, 0.05);
    vec2 p = vec2(dot(P, dir) / max(uStretch, 0.05), dot(P, nrm)) * freq;
    p += vec2(uSeed * 3.17, uSeed * 1.71) + uDrift * 3.0 * vec2(cyc.x, 0.5 * sin(2.0 * ph));

    float h = field(p, c);
    float hN = h * uBands * 2.0 + uSeed * 0.37;
    vec2 gp = vec2(dFdx(hN), dFdy(hN));
    float g = max(length(gp), 1e-5);
    vec2 gdir = gp / g;
    float id = floor(hN);
    float u = hN - id;
    float rnd = fract(sin(id * 91.37 + uSeed * 13.13) * 43758.5453);
    float kind = rnd < uDrop ? 0.0 : (rnd < uDrop + uThin ? 1.0 : (rnd < uDrop + uThin + uOrangeShare ? 2.0 : 3.0));
    float wk = kind > 2.5 ? 1.0 : (kind > 1.5 ? 0.16 : 0.42);
    float th = max(min(uThick, uMaxW * res.y * g) * wk, 1e-4);
    float fl = kind > 2.5 ? 1.0 : ((kind > 0.5 && kind < 1.5) ? 0.3 : 0.0);
    float fallLen = min(min(uFallFrac, uFallW * res.y * g) * fl, max(0.98 - th, 0.0));
    float x = u / th;
    float aa = g / th;

    vec3 L = normalize(vec3(cos(uLight), sin(uLight), 0.9));
    vec3 Hh = normalize(L + vec3(0.0, 0.0, 1.0));

    vec3 col = vec3(0.0);
    if (kind > 0.5) {
        float e0 = min(aa, 0.08);
        float G = uLineGap;
        vec3 lines = vec3(0.0);
        float cover = 0.0;
        if (kind > 2.5) {
            float a1 = seg(x, e0, 0.12, aa);
            float a2 = seg(x, 0.12 + G, 0.32, aa);
            float a3 = seg(x, 0.32 + G, 0.46, aa);
            float a4 = seg(x, 0.46 + G, 1.0, aa);
            float sheenBand = 1.0 - smoothstep(0.0, 0.08, abs(x - 0.66));
            lines = uAccent * a1
                  + mix(uMagenta, uViolet, smoothstep(0.12, 0.32, x)) * a2
                  + mix(uYellow, uOrange, 0.4 * smoothstep(0.32, 0.46, x)) * a3
                  + mix(mix(uBase, uSheen, 0.55 * sheenBand), uFall, smoothstep(0.72, 1.0, x)) * a4;
            cover = a1 + a2 + a3 + a4;
        } else if (kind > 1.5) {
            float a1 = seg(x, e0, 1.0, aa);
            lines = uOrange * a1;
            cover = a1;
        } else {
            float a1 = seg(x, e0, 0.3, aa);
            float a2 = seg(x, 0.3 + G * 2.0, 0.62, aa);
            float a3 = seg(x, 0.62 + G * 2.0, 1.0, aa);
            lines = uAccent * a1 + uMagenta * a2 + uBase * a3;
            cover = a1 + a2 + a3;
        }
        float inside = seg(x, e0, 1.0, aa);
        vec3 stackCol = lines + uGap * max(inside - cover, 0.0);
        float s = clamp(2.0 * x - 1.0, -1.0, 1.0);
        float hgt = sqrt(max(1.0 - s * s, 0.0));
        float slope = -s / max(hgt, 0.3);
        vec3 n = normalize(vec3(-gdir * slope * uBump, 1.0));
        float diff = max(dot(n, L), 0.0);
        float spec = pow(max(dot(n, Hh), 0.0), uSpec);
        stackCol *= mix(1.0, 0.65 + 0.55 * diff, 0.5 * uGloss);
        stackCol += uSheen * spec * uGloss * 0.75 * inside;
        col += stackCol;
        if (fallLen > 1e-4) {
            float y = clamp((u - th) / fallLen, 0.0, 1.0);
            float fall = exp(-4.0 * y) * (1.0 - y) * smoothstep(th - g, th + g, u);
            vec3 fc = mix(uFall, uShadow, smoothstep(0.0, 0.55, y)) * fall;
            vec3 nf = normalize(vec3(gdir * uBump * 1.5 * (1.0 - y), 1.0));
            float sf = pow(max(dot(nf, Hh), 0.0), max(uSpec * 0.5, 1.0));
            fc += uSheen * sf * uGloss * fall * 0.8;
            col += fc;
        }
    } else {
        float d = min(u, 1.0 - u) / g;
        col += uChrome * (1.0 - smoothstep(0.4, 1.4, d)) * 0.75;
        float d2 = abs(u - 0.5) / g;
        col += uViolet * (1.0 - smoothstep(0.3, 1.2, d2)) * 0.35;
    }

    // Contours closer than ~3 px would alias: settle to their average tone.
    float dense = smoothstep(0.25, 0.5, g);
    vec3 avg = uViolet * 0.14 + uChrome * 0.12 + uFall * 0.1;
    col = mix(col, avg, dense);

    col *= 1.0 + 0.3 * pg * hk;
    float v = smoothstep(0.3, 0.85, length(uv - 0.5) * 1.2);
    col *= 1.0 - uVign * v;
    col = uBg + col;
    float gr = fract(sin(dot(gl_FragCoord.xy + fract(uTime * 7.13) * 100.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
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

export default function GlossyLiquidLooking(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#FFE400", accentColor = "#00FF06", speed = 40, scale = 100, hover = 100, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("GlossyLiquidLooking shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("GlossyLiquidLooking link:", gl.getProgramInfoLog(prog))
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
        let phase = 0
        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const step = dt * (Math.max(0, Math.min(100, num(p.speed, 50))) / 50) * (reduced ? 0.25 : 1)
            clock = (clock + step) % 3600
            // Loop phase 0..1, independent of the clock's wrap so every loop length closes cleanly.
            const loopS = clampN(p.advanced?.loopTime ?? ADVANCED_DEFAULTS.loopTime, 4, 60, 12)
            phase = (phase + step / loopS) % 1
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
            gl.uniform1f(u("uPhase"), phase)
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
