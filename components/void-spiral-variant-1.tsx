"use client"

/**
 * SpinnigSwirlVoid — a spinnig swirl with a void for a center moving from soft to pixelated to sharp
 *
 * Built on the Loader template (lib/templates/LoaderTemplate.tsx).
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
    rotSpeed: 19,
    startAngle: 359,
    twist: 120,
    strandTwist: 120,
    strands: 10,
    strandSharp: 51,
    armSharp: 12,
    lobeGain: 44,
    filGain: 90,
    bandGain: 14,
    warp: 0,
    noiseScale: 6,
    voidRadius: 0,
    ringRadius: 183,
    ringWidth: 52,
    haloWidth: 10,
    haloGain: 60,
    softHoldMs: 950,
    sharpHoldMs: 2600,
    returnMs: 1000,
    blur: 40,
    blurEase: 30,
    softGain: 80,
    blockOn: 11,
    blockPeak: 30,
    blockFall: 75,
    bottomLead: 11,
    hotOn: 45,
    hotPeak: 62,
    hotAngle: 245,
    hotRadius: 136,
    hotBloom: 78,
    hotStreakLen: 18,
    hotStreakWidth: 6,
    hotGain: 120,
    bloom: 30,
    haloColor: "#3D1605",
    bodyColor: "#6A260D",
    midColor: "#C4542D",
    highlightColor: "#F1A86F",
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    arms?: number
    pixelSize?: number
    focusMs?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

type AdvNumKey = {
    [K in keyof typeof ADVANCED_DEFAULTS]: (typeof ADVANCED_DEFAULTS)[K] extends number ? K : never
}[keyof typeof ADVANCED_DEFAULTS]

const SWIRL_VS = `#version 300 es
out vec2 vUv;
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vUv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

// Pass 1: the sharp swirl field (log-spiral arms + thin strands + hot streak), rotated by uPhi.
const SWIRL_FIELD_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform float uPhi;
uniform float uArms;
uniform float uTwist;
uniform float uStrandTwist;
uniform float uStrands;
uniform float uStrandSharp;
uniform float uArmSharp;
uniform float uLobeGain;
uniform float uFilGain;
uniform float uBandGain;
uniform float uWarp;
uniform float uNoiseScale;
uniform float uVoidR;
uniform float uRingR;
uniform float uRingW;
uniform float uHaloR;
uniform float uHaloGain;
uniform float uHotGain;
uniform float uHotAngle;
uniform float uHotR;
uniform float uHotSt;
uniform float uHotSr;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uC4;
uniform vec3 uC5;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        s += a * vnoise(p);
        p = p * 2.03 + vec2(17.1, 9.2);
        a *= 0.5;
    }
    return s;
}
vec3 ramp(float x) {
    vec3 c = uC0 * clamp(x / 0.1, 0.0, 1.0);
    c = mix(c, uC1, clamp((x - 0.10) / 0.15, 0.0, 1.0));
    c = mix(c, uC2, clamp((x - 0.25) / 0.20, 0.0, 1.0));
    c = mix(c, uC3, clamp((x - 0.45) / 0.25, 0.0, 1.0));
    c = mix(c, uC4, clamp((x - 0.70) / 0.25, 0.0, 1.0));
    c = mix(c, uC5, clamp((x - 0.95) / 0.35, 0.0, 1.0));
    return c;
}
void main() {
    vec2 p = vUv - 0.5;
    float r = length(p);
    float a = atan(p.y, p.x);
    float cs = cos(uPhi);
    float sn = sin(uPhi);
    vec2 q = vec2(cs * p.x - sn * p.y, sn * p.x + cs * p.y);
    float ap = a + uPhi;
    float lr = log(max(r, 1e-4) / max(uRingR, 1e-4));
    float n1 = fbm(q * uNoiseScale + vec2(7.3, 2.9));
    float n2 = fbm(q * uNoiseScale * 2.7 + vec2(43.1, 12.7));
    float s = uArms * ap - uTwist * lr + (n1 - 0.5) * uWarp;
    float lobe = pow(0.5 + 0.5 * cos(s), uArmSharp);
    float s2 = uArms * ap - uStrandTwist * lr + (n1 - 0.5) * uWarp * 1.6;
    float fil = pow(0.5 + 0.5 * cos(s2 * uStrands), uStrandSharp) * (0.45 + 0.9 * n2);
    float dr = (r - uRingR) / max(uRingW, 1e-4);
    float ring = exp(-dr * dr) * smoothstep(uVoidR, uVoidR + 0.012, r);
    float I = ring * (uBandGain + uLobeGain * lobe * (0.35 + 0.65 * fil) + uFilGain * fil * (0.35 + 0.65 * lobe));
    vec2 hd = vec2(cos(uHotAngle), sin(uHotAngle));
    vec2 d = q - hd * uHotR;
    float ht = dot(d, vec2(-hd.y, hd.x)) / max(uHotSt, 1e-4);
    float hn = dot(d, hd) / max(uHotSr, 1e-4);
    I += uHotGain * exp(-(ht * ht + hn * hn)) * smoothstep(uVoidR * 0.9, uVoidR + 0.02, r);
    vec3 col = ramp(I);
    float hr = (r - uRingR) / max(uHaloR, 1e-4);
    col += uC0 * uHaloGain * exp(-hr * hr) * smoothstep(uVoidR * 0.8, uVoidR * 1.3, r);
    float al = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
    outColor = vec4(min(col, vec3(al)), al);
}`

// Pass 2: pixelate (snap to a centred block grid, bottom rows first) then a variable mip + disc blur.
const SWIRL_POST_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uBlur;
uniform float uBlock;
uniform float uSweep;
uniform float uGain;
uniform float uBloom;
uniform float uBloomLod;

vec4 blurAt(vec2 uv) {
    if (uBlur < 0.75) return textureLod(uTex, uv, 0.0);
    float lod = log2(max(1.0, uBlur / 3.0));
    vec4 acc = textureLod(uTex, uv, lod);
    float wsum = 1.0;
    for (int i = 0; i < 16; i++) {
        float fi = float(i) + 0.5;
        float rr = sqrt(fi / 16.0);
        float th = fi * 2.39996;
        float w = exp(-2.0 * rr * rr);
        vec2 off = vec2(cos(th), sin(th)) * rr * uBlur / max(uRes, vec2(1.0));
        acc += textureLod(uTex, uv + off, lod) * w;
        wsum += w;
    }
    return acc / wsum;
}
void main() {
    vec2 uv = vUv;
    if (uBlock >= 2.0) {
        vec2 c = uRes * 0.5;
        vec2 cell = (floor((gl_FragCoord.xy - c) / uBlock) + 0.5) * uBlock + c;
        float yb = clamp((cell.y / max(uRes.y, 1.0) - 0.24) / 0.52, 0.0, 1.0);
        if (yb <= uSweep) uv = cell / max(uRes, vec2(1.0));
    }
    vec4 col = blurAt(uv);
    col += textureLod(uTex, uv, uBloomLod) * uBloom;
    col *= uGain;
    float al = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
    outColor = vec4(min(col.rgb, vec3(al)), al);
}`

const SWIRL_FIELD_UNIFORMS = [
    "uPhi", "uArms", "uTwist", "uStrandTwist", "uStrands", "uStrandSharp", "uArmSharp",
    "uLobeGain", "uFilGain", "uBandGain", "uWarp", "uNoiseScale", "uVoidR", "uRingR", "uRingW",
    "uHaloR", "uHaloGain", "uHotGain", "uHotAngle", "uHotR", "uHotSt", "uHotSr",
    "uC0", "uC1", "uC2", "uC3", "uC4", "uC5",
] as const
const SWIRL_POST_UNIFORMS = ["uTex", "uRes", "uBlur", "uBlock", "uSweep", "uGain", "uBloom", "uBloomLod"] as const

interface SwirlProg<U extends string> {
    program: WebGLProgram
    u: Record<U, WebGLUniformLocation>
}

interface SwirlGL {
    canvas: HTMLCanvasElement
    gl: WebGL2RenderingContext
    field: SwirlProg<(typeof SWIRL_FIELD_UNIFORMS)[number]>
    post: SwirlProg<(typeof SWIRL_POST_UNIFORMS)[number]>
    tex: WebGLTexture
    fbo: WebGLFramebuffer
    T: number
}

/** One offscreen WebGL2 context per component instance (keyed by its 2D context), reused across re-bakes. */
const SWIRL_GL = new WeakMap<CanvasRenderingContext2D, SwirlGL>()

interface Effect {
    gl: SwirlGL | null
    reduced: boolean
}

function createSwirlGL(): SwirlGL | null {
    if (typeof document === "undefined") return null
    try {
        const canvas = document.createElement("canvas")
        const gl = canvas.getContext("webgl2", {
            alpha: true,
            premultipliedAlpha: true,
            antialias: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: true,
        })
        if (!gl) return null
        const field = createProgram(gl, SWIRL_VS, SWIRL_FIELD_FS, SWIRL_FIELD_UNIFORMS)
        const post = createProgram(gl, SWIRL_VS, SWIRL_POST_FS, SWIRL_POST_UNIFORMS)
        const tex = gl.createTexture()
        const fbo = gl.createFramebuffer()
        if (!tex || !fbo) return null
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        return { canvas, gl, field, post, tex, fbo, T: 0 }
    } catch (err) {
        console.warn("SpinnigSwirlVoid: WebGL2 setup failed", err)
        return null
    }
}

function sizeSwirlTargets(g: SwirlGL, T: number) {
    const gl = g.gl
    g.canvas.width = T
    g.canvas.height = T
    gl.bindTexture(gl.TEXTURE_2D, g.tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, T, T, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, g.fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, g.tex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    g.T = T
}

function bakeEffect(stage: Stage, _p: Props): Effect {
    let g: SwirlGL | null = SWIRL_GL.get(stage.ctx) ?? null
    if (g && g.gl.isContextLost()) {
        SWIRL_GL.delete(stage.ctx)
        g = null
    }
    if (!g) {
        g = createSwirlGL()
        if (g) SWIRL_GL.set(stage.ctx, g)
    }
    const reduced =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    return { gl: g, reduced }
}

const swirlClamp01 = (x: number) => Math.min(1, Math.max(0, x))

function swirlSmooth(a: number, b: number, x: number): number {
    const t = swirlClamp01((x - a) / Math.max(1e-6, b - a))
    return t * t * (3 - 2 * t)
}

function swirlRgb(c: string | undefined, fb: RGBA): [number, number, number] {
    const v = parseColor(c, fb)
    return [v[0], v[1], v[2]]
}

/** Focus 0 = soft, 1 = sharp. Loop: soft hold → focus → sharp hold → return along the same path. */
function swirlFocus(clock: number, focusS: number, softS: number, holdS: number, backS: number, progress: number | null, reduced: boolean): number {
    if (reduced) return 1
    if (progress !== null) return swirlClamp01(progress)
    const total = softS + focusS + holdS + backS
    const tau = ((clock % total) + total) % total
    if (tau < softS) return 0
    if (tau < softS + focusS) return (tau - softS) / focusS
    if (tau < softS + focusS + holdS) return 1
    return swirlClamp01(1 - (tau - softS - focusS - holdS) / backS)
}

/** Block size envelope: 0 → fast ease-out rise to peak → slow fall to 0 at u = 1. */
function swirlBlock(u: number, on: number, pk: number, fall: number): number {
    if (u <= on || u >= 1) return 0
    if (u < pk) {
        const t = (u - on) / Math.max(1e-4, pk - on)
        return 1 - (1 - t) * (1 - t)
    }
    return Math.pow(Math.max(0, 1 - (u - pk) / Math.max(1e-4, 1 - pk)), fall)
}

function drawSwirlFallback(stage: Stage, p: Props, cx: number, cy: number, size: number) {
    const { ctx } = stage
    const c = parseColor(p.color, [0.95, 0.44, 0.2, 1])
    const g = ctx.createRadialGradient(cx, cy, size * 0.11, cx, cy, size * 0.37)
    g.addColorStop(0, "rgba(0, 0, 0, 0)")
    g.addColorStop(0.3, cssRgba([c[0], c[1], c[2], 0.9]))
    g.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = g
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size)
}

/**
 * One frame. `clock` is seconds of speed-scaled time; `progress` is 0..1
 * (eased) or null when indeterminate. (cx, cy) is the centre, `size` the
 * loader's diameter in CSS px.
 */
function drawEffect(stage: Stage, fx: Effect, p: Props, cx: number, cy: number, size: number, clock: number, progress: number | null, dt: number): void {
    void dt
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const n = (k: AdvNumKey) => num(adv[k], ADVANCED_DEFAULTS[k])
    const g = fx.gl
    if (!g || g.gl.isContextLost()) {
        drawSwirlFallback(stage, p, cx, cy, size)
        return
    }
    const gl = g.gl
    const T = Math.max(64, Math.min(1600, Math.round(size * stage.dpr)))
    if (g.T !== T) sizeSwirlTargets(g, T)

    const k = T / 800 // texture px per px@800
    const S = 1 / 800 // field units per px@800
    const deg = Math.PI / 180

    // ── timeline ──
    const focusS = Math.max(400, Math.min(4000, num(p.focusMs, 1330))) / 1000
    const softS = Math.max(0, n("softHoldMs")) / 1000
    const holdS = Math.max(0, n("sharpHoldMs")) / 1000
    const backS = Math.max(50, n("returnMs")) / 1000
    const u = swirlFocus(clock, focusS, softS, holdS, backS, progress, fx.reduced)
    const rotClock = fx.reduced ? softS + focusS : clock
    const phi = -n("startAngle") * deg + n("rotSpeed") * deg * rotClock

    const blurFrac = Math.pow(1 - u, Math.max(0.5, n("blurEase") / 10))
    const blurPx = Math.max(0, n("blur")) * k * blurFrac
    const on = Math.min(0.95, Math.max(0, n("blockOn") / 100))
    const pk = Math.min(0.99, Math.max(on + 0.01, n("blockPeak") / 100))
    const pixel = Math.max(0, Math.min(40, num(p.pixelSize, 18)))
    let blockPx = pixel * k * swirlBlock(u, on, pk, Math.max(0.1, n("blockFall") / 100))
    if (blockPx < 2) blockPx = 0
    const lead = Math.max(0, n("bottomLead") / 100)
    const sweep = lead > 1e-4 ? (u - on) / lead : 10

    const hotGain = (Math.max(0, n("hotGain")) / 100) * swirlSmooth(n("hotOn") / 100, n("hotPeak") / 100, u)
    const tight = swirlSmooth(n("hotPeak") / 100, 1, u)
    const hotSt = (n("hotBloom") + (n("hotStreakLen") - n("hotBloom")) * tight) * S
    const hotSr = (n("hotBloom") + (n("hotStreakWidth") - n("hotBloom")) * tight) * S

    // ── pass 1: sharp swirl field → texture ──
    gl.disable(gl.BLEND)
    gl.bindFramebuffer(gl.FRAMEBUFFER, g.fbo)
    gl.viewport(0, 0, T, T)
    gl.useProgram(g.field.program)
    const f = g.field.u
    gl.uniform1f(f.uPhi, phi)
    gl.uniform1f(f.uArms, Math.round(Math.max(1, Math.min(6, num(p.arms, 2)))))
    gl.uniform1f(f.uTwist, n("twist") / 10)
    gl.uniform1f(f.uStrandTwist, n("strandTwist") / 10)
    gl.uniform1f(f.uStrands, Math.max(1, Math.round(n("strands"))))
    gl.uniform1f(f.uStrandSharp, Math.max(1, n("strandSharp")))
    gl.uniform1f(f.uArmSharp, Math.max(0.5, n("armSharp")))
    gl.uniform1f(f.uLobeGain, n("lobeGain") / 100)
    gl.uniform1f(f.uFilGain, n("filGain") / 100)
    gl.uniform1f(f.uBandGain, n("bandGain") / 100)
    gl.uniform1f(f.uWarp, (n("warp") / 100) * 3)
    gl.uniform1f(f.uNoiseScale, Math.max(0.1, n("noiseScale")))
    gl.uniform1f(f.uVoidR, Math.max(0, n("voidRadius")) * S)
    gl.uniform1f(f.uRingR, Math.max(1, n("ringRadius")) * S)
    gl.uniform1f(f.uRingW, Math.max(1, n("ringWidth")) * S)
    gl.uniform1f(f.uHaloR, Math.max(1, n("haloWidth")) * S)
    gl.uniform1f(f.uHaloGain, n("haloGain") / 100)
    gl.uniform1f(f.uHotGain, hotGain)
    gl.uniform1f(f.uHotAngle, n("hotAngle") * deg)
    gl.uniform1f(f.uHotR, n("hotRadius") * S)
    gl.uniform1f(f.uHotSt, Math.max(1, hotSt / S) * S)
    gl.uniform1f(f.uHotSr, Math.max(1, hotSr / S) * S)
    gl.uniform3fv(f.uC0, swirlRgb(adv.haloColor, [0.24, 0.086, 0.02, 1]))
    gl.uniform3fv(f.uC1, swirlRgb(adv.bodyColor, [0.42, 0.15, 0.05, 1]))
    gl.uniform3fv(f.uC2, swirlRgb(adv.midColor, [0.77, 0.33, 0.18, 1]))
    gl.uniform3fv(f.uC3, swirlRgb(p.color, [0.95, 0.44, 0.2, 1]))
    gl.uniform3fv(f.uC4, swirlRgb(adv.highlightColor, [0.95, 0.66, 0.44, 1]))
    gl.uniform3fv(f.uC5, swirlRgb(p.accent, [0.98, 0.93, 0.77, 1]))
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, g.tex)
    gl.generateMipmap(gl.TEXTURE_2D)

    // ── pass 2: pixelate + blur → offscreen canvas ──
    gl.viewport(0, 0, T, T)
    gl.useProgram(g.post.program)
    const q = g.post.u
    gl.uniform1i(q.uTex, 0)
    gl.uniform2f(q.uRes, T, T)
    gl.uniform1f(q.uBlur, blurPx)
    gl.uniform1f(q.uBlock, blockPx)
    gl.uniform1f(q.uSweep, sweep)
    gl.uniform1f(q.uGain, 1 + (Math.max(0, n("softGain")) / 100) * blurFrac)
    gl.uniform1f(q.uBloom, Math.max(0, n("bloom")) / 100)
    gl.uniform1f(q.uBloomLod, Math.log2(Math.max(1, 10 * k)))
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    stage.ctx.drawImage(g.canvas, cx - size / 2, cy - size / 2, size, size)
}

// ══ /EFFECT ═════════════════════════════════════════════════════════════════

interface Props extends EffectProps {
    background?: string
    color?: string
    accent?: string
    size?: number
    speed?: number
    /** 0–100 for a determinate loader; omit for indeterminate. No panel row. */
    progress?: number
    style?: CSSProperties
}
interface Stage {
    ctx: CanvasRenderingContext2D
    W: number
    H: number
    dpr: number
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

function __BaseImpl_SpinnigSwirlVoid(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", color = "#F27133", accent = "#FAECC4", size = 663, speed = 50, style } = props
    void [color, accent, size, speed]
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!root || !canvas || !ctx) return
        const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const stage: Stage = { ctx, W: 0, H: 0, dpr: 1 }
        const resize = () => {
            stage.W = root.offsetWidth
            stage.H = root.offsetHeight
            stage.dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.round(stage.W * stage.dpr))
            canvas.height = Math.max(1, Math.round(stage.H * stage.dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        let fx: Effect | null = null
        let key = ""
        let shown = 0
        let clock = 0
        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const next = JSON.stringify([stage.W, stage.H, stage.dpr])
            if (next !== key || !fx) {
                key = next
                fx = bakeEffect(stage, p)
            }
            const rate = (Math.max(0, Math.min(100, num(p.speed, 50))) / 50) * (reduced ? 0.25 : 1)
            const animDt = dt * rate
            clock += animDt
            const target = typeof p.progress === "number" && Number.isFinite(p.progress) ? Math.max(0, Math.min(1, p.progress / 100)) : null
            if (target !== null) shown += (target - shown) * (1 - Math.exp(-8 * dt))
            const sz = Math.max(20, Math.min(800, num(p.size, 160)))
            ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0)
            ctx.clearRect(0, 0, stage.W, stage.H)
            drawEffect(stage, fx, p, stage.W / 2, stage.H / 2, sz, clock, target === null ? null : shown, animDt)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
        }
    }, [])

    return (
        <div ref={rootRef} role="progressbar" aria-busy="true" style={{ position: "relative", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}

const __presetProps = {
  "background": "#000000",
  "color": "#FFD000",
  "accent": "#FFBD00",
  "size": 663,
  "speed": 50,
  "hoverIntensity": 120,
  "arms": 4,
  "pixelSize": 18,
  "focusMs": 1330,
  "advanced": {
    "blur": 40,
    "warp": 0,
    "bloom": 30,
    "hotOn": 45,
    "twist": 120,
    "blockOn": 11,
    "filGain": 90,
    "hotGain": 120,
    "hotPeak": 62,
    "strands": 10,
    "armSharp": 12,
    "bandGain": 14,
    "blurEase": 30,
    "haloGain": 60,
    "hotAngle": 245,
    "hotBloom": 78,
    "lobeGain": 44,
    "midColor": "#FF4200",
    "returnMs": 1000,
    "rotSpeed": 180,
    "softGain": 80,
    "blockFall": 75,
    "blockPeak": 30,
    "bodyColor": "#FBFF00",
    "haloColor": "#3D1605",
    "haloWidth": 10,
    "hotRadius": 136,
    "ringWidth": 52,
    "bottomLead": 11,
    "noiseScale": 6,
    "ringRadius": 183,
    "softHoldMs": 950,
    "startAngle": 359,
    "voidRadius": 0,
    "sharpHoldMs": 2600,
    "strandSharp": 51,
    "strandTwist": 120,
    "hotStreakLen": 18,
    "highlightColor": "#EAFF00",
    "hotStreakWidth": 6
  }
};

export default function SpinnigSwirlVoid(props: Record<string, unknown>) {
  return <__BaseImpl_SpinnigSwirlVoid {...(__presetProps as Record<string, unknown>)} {...props} />;
}
