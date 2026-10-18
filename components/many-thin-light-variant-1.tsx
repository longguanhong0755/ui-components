"use client"

/**
 * ManyThinLight — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    laneGap: 90,
    bend: 50,
    dashSpeed: 155,
    speedJitter: 15,
    frontSpeed: 60,
    dashMin: 5,
    dashMax: 32,
    dashPeriod: 45,
    dashWidth: 40,
    guideWidth: 12,
    guideAlpha: 110,
    dottedShare: 30,
    dotGap: 9,
    glowRadius: 60,
    glowAmount: 90,
    fanRays: 20,
    fanWidth: 40,
    fanBright: 170,
    fanGap: 8,
    haze: 120,
    guideColor: "#2E9C1A",
    hazeColor: "#145A0A",
    introUp: 17,
    introDown: 21,
    introLeadMs: 120,
    fadeMs: 300,
    cycleMs: 7500,
    emitEndMs: 6600,
    introGlow: 160,
    seed: 7,
    grain: 0,
    vignette: 0,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    density?: number
    apexX?: number
    apexY?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

const DIRECTION_MODE: Record<string, number> = { ltr: 0, rtl: 1, ttb: 2, btt: 3 }

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const A = ADVANCED_DEFAULTS
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const n = (v: unknown, d: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, num(v, d)))
    gl.uniform2f(u("uApex"), n(p.apexX, 80, 40, 98) / 100, n(p.apexY, 59, 10, 90) / 100)
    gl.uniform1f(u("uDirMode"), DIRECTION_MODE[p.direction ?? "ltr"] ?? 0)
    gl.uniform1f(u("uDensity"), 0.25 + (0.75 * n(p.density, 85, 0, 100)) / 100)
    gl.uniform1f(u("uGap"), n(adv.laneGap, A.laneGap, 20, 400) / 10000)
    gl.uniform1f(u("uBend"), n(adv.bend, A.bend, 0, 200) / 1000)
    gl.uniform1f(u("uSpeed"), n(adv.dashSpeed, A.dashSpeed, 0, 600) / 100)
    gl.uniform1f(u("uJitter"), n(adv.speedJitter, A.speedJitter, 0, 60) / 100)
    gl.uniform1f(u("uFront"), n(adv.frontSpeed, A.frontSpeed, 10, 200) / 100)
    const dMin = n(adv.dashMin, A.dashMin, 1, 100) / 100
    const dMax = Math.max(dMin, n(adv.dashMax, A.dashMax, 1, 100) / 100)
    gl.uniform2f(u("uDash"), dMin, dMax)
    gl.uniform1f(u("uPeriod"), n(adv.dashPeriod, A.dashPeriod, 10, 300) / 100)
    gl.uniform1f(u("uDashW"), n(adv.dashWidth, A.dashWidth, 1, 200) / 10000)
    gl.uniform1f(u("uGuideW"), n(adv.guideWidth, A.guideWidth, 0, 100) / 10000)
    gl.uniform1f(u("uGuideA"), n(adv.guideAlpha, A.guideAlpha, 0, 200) / 100)
    gl.uniform1f(u("uDotted"), n(adv.dottedShare, A.dottedShare, 0, 100) / 100)
    gl.uniform1f(u("uDotGap"), n(adv.dotGap, A.dotGap, 2, 60) / 1000)
    gl.uniform1f(u("uGlowR"), n(adv.glowRadius, A.glowRadius, 0, 300) / 10000)
    gl.uniform1f(u("uGlowA"), n(adv.glowAmount, A.glowAmount, 0, 200) / 100)
    gl.uniform1f(u("uFanRays"), n(adv.fanRays, A.fanRays, 4, 120))
    gl.uniform1f(u("uFanW"), n(adv.fanWidth, A.fanWidth, 1, 100) / 100)
    gl.uniform1f(u("uFanA"), n(adv.fanBright, A.fanBright, 0, 300) / 100)
    gl.uniform1f(u("uFanGap"), (n(adv.fanGap, A.fanGap, 0, 45) * Math.PI) / 180)
    gl.uniform1f(u("uHaze"), n(adv.haze, A.haze, 0, 300) / 100)
    const gc = parseColor(adv.guideColor, [0.18, 0.612, 0.102, 1])
    gl.uniform3f(u("uGuideCol"), gc[0], gc[1], gc[2])
    const hc = parseColor(adv.hazeColor, [0.078, 0.353, 0.039, 1])
    gl.uniform3f(u("uHazeCol"), hc[0], hc[1], hc[2])
    gl.uniform2f(u("uIntro"), n(adv.introUp, A.introUp, 1, 500) / 100, n(adv.introDown, A.introDown, 1, 500) / 100)
    gl.uniform1f(u("uLead"), n(adv.introLeadMs, A.introLeadMs, 0, 3000) / 1000)
    gl.uniform1f(u("uFade"), Math.max(0.02, n(adv.fadeMs, A.fadeMs, 0, 3000) / 1000))
    const rawCycle = n(adv.cycleMs, A.cycleMs, 0, 60000) / 1000
    const cycle = rawCycle <= 0 ? 0 : Math.max(1, rawCycle)
    gl.uniform1f(u("uCycle"), cycle)
    gl.uniform1f(u("uEmitEnd"), cycle > 0 ? Math.min(cycle - 0.05, n(adv.emitEndMs, A.emitEndMs, 0, 60000) / 1000) : 1e6)
    gl.uniform1f(u("uBoost"), n(adv.introGlow, A.introGlow, 0, 300) / 100)
    gl.uniform1f(u("uSeed"), Math.round(n(adv.seed, A.seed, 0, 999)))
    gl.uniform1f(u("uGrain"), n(adv.grain, A.grain, 0, 100) / 100)
    gl.uniform1f(u("uVignette"), n(adv.vignette, A.vignette, 0, 100) / 100)
}

/*
 * Fixed light lanes with bright dashes travelling along them.
 * Each lane is horizontal at offset v from the split's height and bends towards a vertical wall:
 * y = v·(1 + bend / distanceToWall), so outer lanes curve earlier and wider. Past the split the
 * same bend keeps converging every lane towards y = 0, so the dashes merge into one bright beam
 * against the wall instead of switching to a different shape — one continuous flow, not two. A
 * pixel's distance along its lane (s) drives dashes at a constant speed. The time each pixel was
 * "emitted" (t − s/front) gates the intro (lanes switch on outward from the centre while a slower
 * front crosses to the wall), the outro (emission stops and the lanes drain left-first) and the
 * guide fade. Between ~0.6 s and ~3 s the whole field blooms towards the accent colour around the
 * split, brightest where the lanes have merged.
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
uniform vec2 uApex;
uniform float uDirMode;
uniform float uDensity;
uniform float uGap;
uniform float uBend;
uniform float uSpeed;
uniform float uJitter;
uniform float uFront;
uniform vec2 uDash;
uniform float uPeriod;
uniform float uDashW;
uniform float uGuideW;
uniform float uGuideA;
uniform float uDotted;
uniform float uDotGap;
uniform float uGlowR;
uniform float uGlowA;
uniform float uFanRays;
uniform float uFanW;
uniform float uFanA;
uniform float uFanGap;
uniform float uHaze;
uniform vec3 uGuideCol;
uniform vec3 uHazeCol;
uniform vec2 uIntro;
uniform float uLead;
uniform float uFade;
uniform float uCycle;
uniform float uEmitEnd;
uniform float uBoost;
uniform float uSeed;
uniform float uGrain;
uniform float uVignette;
out vec4 outColor;

uint hu(uint x) {
    x ^= x >> 16u; x *= 0x7feb352du; x ^= x >> 15u; x *= 0x846ca68bu; x ^= x >> 16u;
    return x;
}
float hf(float a, float b) {
    uint x = hu(uint(int(a)) ^ hu(uint(int(b)) + uint(int(uSeed)) * 0x9e3779b9u));
    return float(x >> 8u) * (1.0 / 16777216.0);
}

struct Tr { float guide; float core; float glow; float along; float on; };

Tr track(float k, float aa, float s, float aas, float tt, float zone, float hwC, float hwG, float gR, float offStep, float V, float lenMul) {
    Tr o;
    float id = floor(k + 0.5);
    float lid = id + zone * 4096.0;
    float px = abs(k - id) / max(aa, 1e-5);
    float m = smoothstep(0.35, 0.9, aa);
    float cS = clamp(max(hwC, 0.5) + 0.5 - px, 0.0, 1.0) * min(1.0, hwC * 2.0);
    float core = mix(cS, min(1.0, 2.0 * hwC * aa), m);
    float gS = clamp(max(hwG, 0.5) + 0.5 - px, 0.0, 1.0) * min(1.0, hwG * 2.0);
    float guide = mix(gS, min(1.0, 2.0 * hwG * aa), m);
    float glow = mix(exp(-px * px / max(gR * gR, 1e-4)), min(1.0, 1.77 * gR * aa), m);

    float r1 = hf(lid, 1.0);
    float r2 = hf(lid, 2.0);
    float r3 = hf(lid, 3.0);
    float r4 = hf(lid, 4.0);
    float r5 = hf(lid, 5.0);
    float Vk = max(V * (1.0 + uJitter * (2.0 * r1 - 1.0)), 1e-4);
    float sp = s - Vk * tt;
    float aspect = uRes.x / max(uRes.y, 1.0);
    float per = max(uPeriod * aspect * mix(0.75, 1.25, r2), 1e-3);
    float uu = sp / per + r3 * 9.0;
    float cell = floor(uu);
    float loc = (uu - cell) * per;
    float c1 = hf(lid, cell * 4.0 + 11.0);
    float c2 = hf(lid, cell * 4.0 + 12.0);
    float c3 = hf(lid, cell * 4.0 + 13.0);
    float len = min(mix(uDash.x, uDash.y, c2 * c2) * aspect * lenMul, per * 0.9);
    float o0 = c3 * (per - len);
    float ea = max(aas, 1e-5);
    float inside = step(c1, uDensity) * clamp((loc - o0) / ea, 0.0, 1.0) * clamp((o0 + len - loc) / ea, 0.0, 1.0);
    float along = clamp((loc - o0) / max(len, 1e-4), 0.0, 1.0);

    float dotted = step(r4, uDotted);
    float dg = max(uDotGap * max(uScale, 0.05), 1e-4);
    float df = fract(sp / dg);
    float dAA = ea / dg;
    float dots = smoothstep(0.0, dAA + 1e-4, df) * (1.0 - smoothstep(0.3, 0.3 + dAA + 1e-4, df));
    dots = mix(dots, 0.3, smoothstep(0.15, 0.4, dAA));
    inside *= mix(1.0, dots, dotted);
    guide *= mix(1.0, mix(0.5, 1.0, dots), dotted);

    float off = id * offStep;
    float tOn = zone < 0.5 ? abs(off) / max(off > 0.0 ? uIntro.x : uIntro.y, 1e-3) : abs(off) * 0.3;
    float Vf = max(Vk * uFront, 1e-4);
    float te = tt - s / Vf;
    float tc = uCycle > 0.0 ? mod(te, uCycle) : te;
    float live = step(tOn, tc) * step(tc, uEmitEnd);
    float on = smoothstep(tOn, tOn + uFade, tc) * (1.0 - smoothstep(uEmitEnd, uEmitEnd + uFade, tc));
    float lb = mix(0.65, 1.0, r5);

    o.guide = guide * on * lb;
    o.core = core * inside * live * lb;
    o.glow = glow * inside * live * lb;
    o.along = along;
    o.on = on;
    return o;
}

void main() {
    vec2 fc = gl_FragCoord.xy;
    vec2 res = uRes;
    if (uDirMode > 0.5 && uDirMode < 1.5) {
        fc.x = res.x - fc.x;
    } else if (uDirMode > 1.5 && uDirMode < 2.5) {
        fc = vec2(fc.y, res.x - fc.x);
        res = res.yx;
    } else if (uDirMode > 2.5) {
        fc = vec2(res.y - fc.y, fc.x);
        res = res.yx;
    }
    float H = max(res.y, 1.0);
    float aspect = res.x / H;
    vec2 P = fc / H;
    vec2 A = vec2(uApex.x * aspect, 1.0 - uApex.y);
    vec2 p = P - A;
    float sc = max(uScale, 0.05);
    float gap = max(uGap * sc, 1e-4);
    float V = uSpeed * aspect;
    float tt = uTime + uLead;

    // One lane formula spans the whole field: left of the split the bend curves lanes towards
    // the wall; past the split the same formula keeps shrinking v towards 0, so every lane
    // merges into the beam instead of switching to a different (fan) shape. Same dashes flow
    // through the bend top to bottom — no second geometry to blend against.
    float d = max(-p.x, 1e-5);
    float v = p.y / (1.0 + uBend / d);
    float k = v / gap;
    float s = P.x + abs(p.y - v);
    float r = length(p);
    float aa = fwidth(k);
    float aas = fwidth(s);

    float hwC = 0.5 * uDashW * sc * H;
    float hwG = 0.5 * uGuideW * sc * H;
    float gR = uGlowR * sc * H;
    Tr tr = track(k, aa, s, aas, tt, 0.0, hwC, hwG, gR, gap, V, 1.0);

    vec2 uv = fc / res;
    vec2 mm = uv - uMouse;
    mm.x *= aspect;
    float hov = 1.0 + uHover * 0.9 * exp(-dot(mm, mm) * 14.0);
    float tg = uCycle > 0.0 ? mod(tt, uCycle) : tt;
    float bloom = uBoost * smoothstep(0.6, 1.6, tg) * (1.0 - smoothstep(2.4, 3.2, tg));
    float boost = 1.0 + bloom;

    float a = tr.along;
    vec3 dc = mix(uGuideCol, uBase, smoothstep(0.0, 0.45, a));
    dc = mix(dc, uAccent, smoothstep(0.5, 1.0, a));
    float di = (0.35 + 0.65 * a) * boost * hov;
    vec3 col = vec3(0.0);
    col += dc * tr.core * di * 1.4;
    col += uAccent * tr.core * smoothstep(0.88, 1.0, a) * 0.6 * hov;
    col += uBase * tr.glow * uGlowA * di;
    col += uGuideCol * uGuideA * tr.guide * boost;

    // Past the split the lanes have merged into one beam against the wall; light that merge
    // with the old fan brightness/width controls so they still drive a visible result, not a
    // separate fan shape.
    float wallZone = smoothstep(0.0, 0.05, p.x);
    float wall = smoothstep(0.0, 0.015, p.x) * exp(-p.x * 2.0);
    col += mix(uGuideCol, uBase, 0.6) * uFanA * tr.on * wallZone * (0.14 + 0.18 * wall) * boost * (0.5 + 0.5 * uFanW);
    float hz = (0.15 + 0.6 * exp(-d / 0.2)) * smoothstep(0.0, 0.3, abs(p.y)) + 0.7 * wallZone * smoothstep(0.0, 0.08, r);
    col += uHazeCol * hz * uHaze * tr.on * boost;
    float hot = exp(-d / 0.05) * exp(-abs(p.y) * 3.0) + wallZone * exp(-r * 2.5);
    col += uAccent * bloom * 0.45 * hot * tr.on;

    col = uBg + col;
    col *= 1.0 - uVignette * smoothstep(0.3, 0.95, length(uv - 0.5) * 1.414);
    col += (hf(floor(gl_FragCoord.x) + floor(gl_FragCoord.y) * 4099.0, floor(uTime * 30.0) + 77.0) - 0.5) * uGrain * 0.2;
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
    direction?: "ltr" | "rtl" | "ttb" | "btt"
    style?: CSSProperties
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

function __BaseImpl_ManyThinLight(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const {
        background = "#000000",
        baseColor = "#4DBA25",
        accentColor = "#D6F58C",
        speed = 50,
        scale = 100,
        hover = 200,
        direction = "btt",
        style,
    } = props
    void [baseColor, accentColor, speed, scale, hover, direction]
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("ManyThinLight shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("ManyThinLight link:", gl.getProgramInfoLog(prog))
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

const __presetProps = {
  "background": "#000000",
  "baseColor": "#B5BA25",
  "accentColor": "#F5DC8C",
  "speed": 50,
  "scale": 100,
  "hover": 200,
  "direction": "btt",
  "density": 85,
  "apexX": 80,
  "apexY": 50,
  "advanced": {
    "bend": 50,
    "haze": 120,
    "seed": 7,
    "grain": 0,
    "dotGap": 9,
    "fadeMs": 300,
    "fanGap": 8,
    "cycleMs": 7500,
    "dashMax": 32,
    "dashMin": 5,
    "fanRays": 20,
    "introUp": 17,
    "laneGap": 90,
    "fanWidth": 40,
    "vignette": 0,
    "dashSpeed": 155,
    "dashWidth": 40,
    "emitEndMs": 6600,
    "fanBright": 170,
    "hazeColor": "#5A530A",
    "introDown": 21,
    "introGlow": 160,
    "dashPeriod": 45,
    "frontSpeed": 60,
    "glowAmount": 90,
    "glowRadius": 60,
    "guideAlpha": 110,
    "guideColor": "#9B9C1A",
    "guideWidth": 12,
    "dottedShare": 30,
    "introLeadMs": 120,
    "speedJitter": 15
  }
};

export default function ManyThinLight(props: Record<string, unknown>) {
  return <__BaseImpl_ManyThinLight {...(__presetProps as Record<string, unknown>)} {...props} />;
}
