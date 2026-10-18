"use client"

/**
 * GlowingDomeLiquid — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    centerX: 47,
    centerY: 68,
    radius: 45,
    bands: 3,
    swirl: 29,
    noiseScale: 314,
    spin: 12,
    tilt: -5,
    flow: 56,
    bump: 100,
    specular: 13,
    shine: 76,
    fadeTop: -24,
    fadeBottom: 24,
    midColor: "#85BBEA",
    deepColor: "#081940",
    glowColor: "#3160CF",
    glowInner: 16,
    glowOuter: 75,
    rim: 145,
    iridFreq: 64,
    iridZone: 26,
    occlusion: 88,
    exposure: 81,
    grain: 15,
    vignette: 0,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    warp?: number
    iridescence?: number
    glow?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

function clampNum(v: unknown, d: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, num(v, d)))
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    gl.uniform1f(u("uWarp"), (clampNum(p.warp, 60, 0, 100) / 100) * 2.5)
    gl.uniform1f(u("uIrid"), clampNum(p.iridescence, 60, 0, 100) / 100)
    gl.uniform1f(u("uGlow"), clampNum(p.glow, 60, 0, 100) / 60)
    gl.uniform2f(u("uCenter"), clampNum(adv.centerX, 50, 0, 100) / 100, clampNum(adv.centerY, 68, 0, 100) / 100)
    gl.uniform1f(u("uRadius"), clampNum(adv.radius, 45, 5, 150) / 100)
    gl.uniform1f(u("uBands"), clampNum(adv.bands, 4, 1, 20))
    gl.uniform1f(u("uSwirl"), (clampNum(adv.swirl, 50, 0, 200) / 100) * 6)
    gl.uniform1f(u("uNoise"), clampNum(adv.noiseScale, 180, 20, 600) / 100)
    gl.uniform1f(u("uSpin"), (clampNum(adv.spin, 15, -180, 180) * Math.PI) / 180)
    gl.uniform1f(u("uTilt"), (clampNum(adv.tilt, -15, -90, 90) * Math.PI) / 180)
    gl.uniform1f(u("uFlow"), clampNum(adv.flow, 35, 0, 300) / 100)
    gl.uniform1f(u("uBump"), (clampNum(adv.bump, 40, 0, 100) / 100) * 0.04)
    gl.uniform1f(u("uSpec"), clampNum(adv.specular, 60, 0, 200) / 100)
    gl.uniform1f(u("uShine"), clampNum(adv.shine, 40, 1, 200))
    const fadeTop = clampNum(adv.fadeTop, -25, -100, 100) / 100
    const fadeBottom = Math.max(fadeTop + 0.02, clampNum(adv.fadeBottom, 24, -100, 100) / 100)
    gl.uniform2f(u("uFade"), fadeTop, fadeBottom)
    const mid = parseColor(adv.midColor, [0.52, 0.73, 0.92, 1])
    const deep = parseColor(adv.deepColor, [0.03, 0.1, 0.25, 1])
    const glowCol = parseColor(adv.glowColor, [0.19, 0.38, 0.81, 1])
    gl.uniform3f(u("uMid"), mid[0], mid[1], mid[2])
    gl.uniform3f(u("uDeep"), deep[0], deep[1], deep[2])
    gl.uniform3f(u("uGlowCol"), glowCol[0], glowCol[1], glowCol[2])
    gl.uniform2f(u("uGlowW"), clampNum(adv.glowInner, 16, 1, 200), clampNum(adv.glowOuter, 50, 1, 400))
    gl.uniform1f(u("uRim"), clampNum(adv.rim, 60, 0, 200) / 100)
    gl.uniform1f(u("uIridFreq"), clampNum(adv.iridFreq, 35, 0, 200) / 100)
    gl.uniform1f(u("uIridZone"), clampNum(adv.iridZone, 50, 0, 100) / 100)
    gl.uniform1f(u("uAO"), clampNum(adv.occlusion, 45, 0, 95) / 100)
    gl.uniform1f(u("uExposure"), clampNum(adv.exposure, 100, 0, 300) / 100)
    gl.uniform1f(u("uGrain"), (clampNum(adv.grain, 25, 0, 100) / 100) * 0.2)
    gl.uniform1f(u("uVignette"), clampNum(adv.vignette, 0, 0, 100) / 100)
}

/* A fixed, top-lit sphere cap of liquid chrome: latitude ribbons pushed around by a
   domain-warped 3D value-noise field that rotates about a tilted vertical axis and
   evolves in time; bump-mapped normals reflect a vertical studio ramp, with thin-film
   fringes on pinched folds, a blue rim halo, a soft bottom fade and film grain. */
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
uniform float uWarp;
uniform float uIrid;
uniform float uGlow;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uBands;
uniform float uSwirl;
uniform float uNoise;
uniform float uSpin;
uniform float uTilt;
uniform vec2 uDrag;
uniform float uFlow;
uniform float uBump;
uniform float uSpec;
uniform float uShine;
uniform vec2 uFade;
uniform vec3 uMid;
uniform vec3 uDeep;
uniform vec3 uGlowCol;
uniform vec2 uGlowW;
uniform float uRim;
uniform float uIridFreq;
uniform float uIridZone;
uniform float uAO;
uniform float uExposure;
uniform float uGrain;
uniform float uVignette;
out vec4 outColor;

const mat3 M = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);

float hash3(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x);
    float b = mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x);
    float c = mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x);
    float d = mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x);
    return mix(mix(a, b, f.y), mix(c, d, f.y), f.z);
}
float fbm3(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = M * p * 2.03 + vec3(1.7); a *= 0.5; }
    return s / 0.875;
}
float fbm5(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = M * p * 2.03 + vec3(1.7); a *= 0.5; }
    return s / 0.96875;
}
vec3 rotAxis(vec3 v, vec3 a, float ang) {
    float c = cos(ang), s = sin(ang);
    return v * c + cross(a, v) * s + a * dot(a, v) * (1.0 - c);
}

void main() {
    vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
    float px800 = uRes.y / 800.0;
    float R = max(uRadius * uScale * uRes.y, 1.0);
    vec2 C = uCenter * uRes;
    vec2 p = (frag - C) / R;
    float len = length(p);
    vec2 dir = p / max(len, 1e-4);
    float upper = 1.0 - smoothstep(-0.45, 0.35, dir.y);

    // Background + halo around the lit upper silhouette
    float dPx = max(len - 1.0, 0.0) * R;
    float inner = exp(-dPx / max(uGlowW.x * px800, 1e-3));
    float outer = exp(-dPx / max(uGlowW.y * px800, 1e-3));
    vec3 halo = uGlow * upper * (mix(uGlowCol, uMid, inner) * inner * 0.45 + uDeep * outer * 0.9);
    vec3 col = uBg + halo;

    float edgeAA = 1.5 / R;
    float inside = 1.0 - smoothstep(1.0 - edgeAA, 1.0, len);
    if (len < 1.0 + 4.0 / R) {
        vec2 ps = len > 0.998 ? dir * 0.998 : p;
        float z = sqrt(max(1.0 - dot(ps, ps), 0.0));
        vec3 N = vec3(ps.x, -ps.y, z);
        vec3 axis = vec3(sin(uTilt + uDrag.y), cos(uTilt + uDrag.y), 0.0);
        vec3 T = rotAxis(N, axis, -uTime * uSpin - uDrag.x);
        vec3 P = T * uNoise;
        float tt = uTime * uFlow;
        vec3 q = vec3(
            fbm3(P + vec3(0.0, 0.0, tt)),
            fbm3(P + vec3(5.2, 1.3, 2.8) + vec3(tt * 0.6, 0.0, -tt * 0.4)),
            fbm3(P + vec3(9.1, 4.7, 7.3) - vec3(0.0, tt * 0.5, 0.0)));
        float f = fbm5(P + uWarp * (q - 0.5) * 2.0 + vec3(1.7, 9.2, tt * 0.5));
        float lat = dot(N, axis);
        float phase = 6.2832 * (uBands * lat + uSwirl * f);
        float hgt = sin(phase);
        float c = cos(phase);
        vec2 gP = vec2(dFdx(phase), dFdy(phase)) * R;
        vec2 gH = c * gP;
        vec3 n = normalize(N + vec3(-gH * uBump * z, 0.0));

        vec3 rd = reflect(vec3(0.0, 0.0, -1.0), n);
        vec3 env = mix(uDeep, uBase, smoothstep(-0.7, -0.15, rd.y));
        env = mix(env, uMid, smoothstep(-0.2, 0.45, rd.y));
        env = mix(env, uAccent, smoothstep(0.4, 0.9, rd.y));
        vec3 L = normalize(vec3(0.0, 0.85, 0.5));
        float spec = pow(max(dot(rd, L), 0.0), uShine) * uSpec;
        float ao = mix(1.0 - uAO, 1.0, 0.5 + 0.5 * hgt);
        vec3 s = env * ao + spec * mix(uAccent, vec3(1.0), 0.5);

        // Thin-film fringes on pinched fold flanks
        float gp = length(gP) * z / max(6.2832 * uBands, 1e-3);
        float pinch = smoothstep(1.1, 2.4, gp);
        float k = uIridZone * 0.3;
        float zone = smoothstep(0.62 - k, 0.74 - k, q.x);
        float mask = clamp(uIrid * zone * pow(abs(c), 3.0) * (0.45 + 0.55 * pinch), 0.0, 1.0);
        float film = phase * uIridFreq + q.y * 3.0;
        vec3 ir = 0.5 + 0.5 * cos(6.2832 * (film + vec3(0.0, 0.33, 0.67)));
        ir = pow(ir, vec3(1.5));
        float lum = dot(s, vec3(0.3, 0.59, 0.11));
        s = mix(s, ir * (0.55 + 0.9 * lum), mask);

        // Rim: crisp line + fresnel along the lit top, thin blue on the limbs
        float fres = pow(1.0 - z, 4.0);
        float rimLine = 1.0 - smoothstep(1.0 * px800, 3.5 * px800, (1.0 - len) * R);
        s += uAccent * (rimLine * 0.9 + fres * 0.5) * uRim * upper;
        s += uBase * fres * 0.4 * uRim;

        // Pointer light
        vec2 m = gl_FragCoord.xy / uRes - uMouse;
        m.x *= uRes.x / max(uRes.y, 1.0);
        s += uAccent * uHover * 0.3 * exp(-dot(m, m) * 18.0);

        // Top-lit falloff into black at the bottom
        float litK = 1.0 - smoothstep(uFade.x, uFade.y, p.y);
        float topK = 1.0 - smoothstep(-0.8, 0.1, p.y);
        s *= litK * mix(0.7, 1.15, topK) * uExposure;

        col = mix(col, s, inside);
    }

    vec2 uv = gl_FragCoord.xy / uRes;
    col *= 1.0 - uVignette * smoothstep(0.3, 1.0, length(uv - 0.5) * 1.414);
    float lumC = dot(col, vec3(0.3, 0.59, 0.11));
    float g = hash3(vec3(gl_FragCoord.xy, floor(uTime * 24.0))) - 0.5;
    col += vec3(g * uGrain * (0.3 + 0.7 * min(1.0, 2.0 * lumC)));
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
    dragSensitivity?: number
    style?: CSSProperties
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

export default function GlowingDomeLiquid(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000002", baseColor = "#3160CF", accentColor = "#D4F2F6", speed = 50, scale = 100, hover = 100, dragSensitivity = 50, style } = props
    void [baseColor, accentColor, speed, scale, hover, dragSensitivity]
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("GlowingDomeLiquid shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("GlowingDomeLiquid link:", gl.getProgramInfoLog(prog))
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
        let dragging = false
        let dragId = -1
        let lastX = 0
        let lastY = 0
        let dragYaw = 0
        let dragPitch = 0
        const onMove = (e: PointerEvent) => {
            if (W <= 0 || H <= 0) return
            tx = e.offsetX / W
            ty = 1 - e.offsetY / H
            over = 1
            if (dragging && e.pointerId === dragId) {
                const sens = (Math.max(0, Math.min(100, num(propsRef.current.dragSensitivity, 50))) / 100) * 0.008
                dragYaw += (e.clientX - lastX) * sens
                dragPitch = Math.max(-1.4, Math.min(1.4, dragPitch + (e.clientY - lastY) * sens))
                lastX = e.clientX
                lastY = e.clientY
            }
        }
        const onLeave = () => {
            over = 0
        }
        const onDown = (e: PointerEvent) => {
            dragging = true
            dragId = e.pointerId
            lastX = e.clientX
            lastY = e.clientY
        }
        const onUp = (e: PointerEvent) => {
            if (e.pointerId === dragId) dragging = false
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
            gl.uniform2f(u("uDrag"), dragYaw, dragPitch)
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
        <div ref={rootRef} style={{ position: "relative", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "grab" }} />
        </div>
    )
}
