"use client"

/**
 * AmberVesper — a sunset sky sampled into a square LED dot grid on black, under a
 * ragged treeline whose edge dots fade dim red. The horizon glow breathes, the sun
 * hot-spot drifts, every dot twinkles.
 *
 * Refined from the user's SunsetSkyMade (Background template,
 * lib/templates/BackgroundTemplate.tsx). Every control and key is kept. Changes:
 * - `scale` set the dot pitch, so it is retitled Cell Size; the new `sceneScale`
 *   is the real Scale, zooming the sky out of a larger world.
 * - The pitch is snapped to whole device pixels (the dark lines, see frame()).
 * - Pointer measured against the displayed box, plus two interactions: the sun
 *   leans toward the cursor, and a press sends a ripple through the dots.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
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
    pitch: 114,
    cycleMs: 8000,
    twinkleRate: 60,
    sunX: 55,
    sunWidth: 12,
    sunDrift: 4,
    sunBoost: 45,
    shimmer: 10,
    haze: 10,
    heatWave: 10,
    horizon: 80,
    treeHeight: 9,
    treeBumps: 2,
    treeSpacing: 22,
    treeSeed: 7,
    redTop: 75,
    dotHalo: 20,
    skyTop: "#0B1424",
    navy: "#10233D",
    slate: "#1E537C",
    mauve: "#A69AA8",
    peach: "#EFA58C",
    orange: "#F7974F",
    red: "#FF1C00",
    sunCore: "#FFE35A",
    treeColor: "#030202",
    pointerRadius: 15,
    pointerGrow: 95,
    pointerBright: 20,
    pointerWarm: 25,
    lensZoom: 70,
    lensRing: 45,
    trail: 70,
    trailLife: 900,
    spotDim: 40,
    sunFollow: 30,
    rippleStrength: 60,
    rippleSpeed: 60,
    grain: 0,
    vignette: 0,
    hover: 100,
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
    dotSize?: number
    twinkle?: number
    glow?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/** Presses still rippling at once; a fifth press retires the oldest. */
const MAX_RIPPLES = 4
/** Points kept along the cursor's light trail; the oldest drops off first. */
const MAX_TRAIL = 32
/** A new trail point every this share of the frame height the cursor travels. */
const TRAIL_STEP = 0.012
/** A ripple has faded out (exp(-1.1·t) < 4%) by this age, in s. */
const RIPPLE_LIFE = 3
/** Scene Scale floor, %: below it the sunset band is a few dots tall. */
const SCENE_MIN = 30

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: AmberVesperProps): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const cl = (v: unknown, lo: number, hi: number, d: number) => Math.max(lo, Math.min(hi, num(v, d)))
    const col = (name: string, hex: string | undefined, fb: RGBA) => {
        const c = parseColor(hex, fb)
        gl.uniform3f(u(name), c[0], c[1], c[2])
    }
    const cycleS = cl(adv.cycleMs, 1000, 60000, 8000) / 1000
    const twK = Math.max(1, Math.round((cl(adv.twinkleRate, 1, 300, 60) / 100) * cycleS))

    // Pitch itself is set in frame(), snapped to whole device pixels.
    gl.uniform1f(u("uDot"), cl(p.dotSize, 30, 95, 88) / 100)
    gl.uniform1f(u("uTwinkle"), cl(p.twinkle, 0, 100, 50) * 0.004)
    gl.uniform1f(u("uGlow"), (cl(p.glow, 0, 100, 50) / 50) * 0.18)
    gl.uniform1f(u("uCycle"), cycleS)
    gl.uniform1f(u("uTwK"), twK)
    gl.uniform4f(
        u("uSun"),
        cl(adv.sunX, 0, 100, 55) / 100,
        cl(adv.sunWidth, 1, 100, 12) / 100,
        cl(adv.sunDrift, 0, 50, 4) / 100,
        cl(adv.sunBoost, 0, 100, 45) / 100
    )
    gl.uniform1f(u("uShimmer"), cl(adv.shimmer, 0, 60, 10) / 1000)
    gl.uniform1f(u("uHaze"), cl(adv.haze, 0, 100, 10) / 100)
    gl.uniform1f(u("uHeat"), cl(adv.heatWave, 0, 100, 10) / 100)
    gl.uniform1f(u("uHorizon"), cl(adv.horizon, 40, 100, 80) / 100)
    gl.uniform4f(
        u("uTrees"),
        cl(adv.treeHeight, 0, 30, 9) / 100,
        cl(adv.treeBumps, 0, 20, 2) / 100,
        cl(adv.treeSpacing, 5, 100, 22) / 1000,
        cl(adv.treeSeed, 0, 100, 7)
    )
    gl.uniform1f(u("uRedTop"), cl(adv.redTop, 40, 100, 75) / 100)
    gl.uniform1f(u("uHalo"), cl(adv.dotHalo, 0, 100, 20) / 100)
    gl.uniform3f(
        u("uPointer"),
        cl(adv.pointerRadius, 1, 100, 18) / 100,
        cl(adv.pointerGrow, 10, 100, 95) / 100,
        cl(adv.pointerBright, 0, 100, 55) / 100
    )
    gl.uniform1f(u("uWarm"), cl(adv.pointerWarm, 0, 100, 35) / 100)
    gl.uniform2f(u("uLens"), cl(adv.lensZoom, 0, 200, 70) / 100, cl(adv.lensRing, 0, 100, 45) / 100)
    gl.uniform2f(
        u("uTrailP"),
        (cl(adv.trail, 0, 100, 70) / 100) * (cl(adv.hover, 0, 100, 50) / 50),
        (cl(adv.pointerRadius, 1, 100, 18) / 100) * 0.4
    )
    gl.uniform1f(u("uSpotDim"), cl(adv.spotDim, 0, 100, 40) / 100)
    gl.uniform2f(u("uRipple"), cl(adv.rippleStrength, 0, 100, 60) / 50, cl(adv.rippleSpeed, 5, 200, 60) / 100)
    gl.uniform1f(u("uHoverAmt"), cl(adv.hover, 0, 100, 50) / 50)
    gl.uniform1f(u("uGrain"), cl(adv.grain, 0, 100, 0) / 100)
    gl.uniform1f(u("uVignette"), cl(adv.vignette, 0, 100, 0) / 100)
    col("uSkyTop", adv.skyTop, [0.043, 0.078, 0.141, 1])
    col("uNavy", adv.navy, [0.063, 0.137, 0.239, 1])
    col("uSlate", adv.slate, [0.118, 0.325, 0.486, 1])
    col("uMauve", adv.mauve, [0.651, 0.604, 0.659, 1])
    col("uPeach", adv.peach, [0.937, 0.647, 0.549, 1])
    col("uOrange", adv.orange, [0.969, 0.592, 0.31, 1])
    col("uRed", adv.red, [0.933, 0.165, 0.071, 1])
    col("uSunCore", adv.sunCore, [1, 0.89, 0.353, 1])
    col("uTree", adv.treeColor, [0.012, 0.008, 0.008, 1])
}

/* Sunset sky sampled into a square LED dot grid on black, under a ragged treeline whose
   edge dots fade dim red. Motion (designed; the reference is a still), on whole multiples
   of one 8 s loop: the horizon glow breathes, the sun hot-spot drifts, every dot twinkles,
   faint haze drifts over the blue sky, a heat wave runs along the warm band.
   The dot grid lives in frame pixels; the scene is sampled at each dot's centre mapped
   into the world (uZoom about the frame centre), so Scale zooms the sky, not the dots. */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform float uPitchPx;
uniform vec2 uOff;
uniform float uZoom;
uniform float uSunLean;
uniform vec4 uRip[${MAX_RIPPLES}];
uniform vec2 uRipple;
uniform float uWarm;
uniform vec2 uLens;
uniform vec4 uTrail[${MAX_TRAIL}];
uniform vec2 uTrailP;
uniform float uSpotDim;
uniform float uDot;
uniform float uTwinkle;
uniform float uGlow;
uniform float uCycle;
uniform float uTwK;
uniform vec4 uSun;
uniform float uShimmer;
uniform float uHaze;
uniform float uHeat;
uniform float uHorizon;
uniform vec4 uTrees;
uniform float uRedTop;
uniform float uHalo;
uniform vec3 uPointer;
uniform float uHoverAmt;
uniform float uGrain;
uniform float uVignette;
uniform vec3 uSkyTop;
uniform vec3 uNavy;
uniform vec3 uSlate;
uniform vec3 uMauve;
uniform vec3 uPeach;
uniform vec3 uOrange;
uniform vec3 uRed;
uniform vec3 uSunCore;
uniform vec3 uTree;
out vec4 outColor;

const float TAU = 6.2831853;

float h11(float n) { return fract(sin(n * 127.1 + 0.37) * 43758.5453); }
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h11(i), h11(i + 1.0), f); }
float seg(float v, float a, float b) { return clamp((v - a) / max(b - a, 1e-4), 0.0, 1.0); }

// Sky colour at top-down height v; xh and sunH in height units.
vec3 skyAt(float v, float xh, float sunH) {
    vec3 c = mix(uBg, uSkyTop, smoothstep(0.08, 0.22, v));
    c = mix(c, uNavy, seg(v, 0.22, 0.36));
    c = mix(c, uSlate, seg(v, 0.36, 0.5));
    c = mix(c, uBase, seg(v, 0.5, 0.59));
    c = mix(c, uMauve, seg(v, 0.59, 0.635));
    c = mix(c, uPeach, seg(v, 0.635, 0.675));
    float sun = exp(-pow((xh - sunH) / max(uSun.y, 1e-3), 2.0));
    c = mix(c, mix(uOrange, uAccent, sun), seg(v, 0.675, 0.715));
    float low = smoothstep(uRedTop - 0.005, uRedTop + 0.02, v);
    c = mix(c, mix(uRed, mix(uOrange, uAccent, 0.6), sun * 0.9), low);
    float core = smoothstep(0.69, 0.735, v) * (1.0 - smoothstep(0.79, 0.82, v));
    c = mix(c, uSunCore, sun * core * uSun.w);
    return c;
}

// Top-down height of the treeline: separate crowns of random height and width.
float treeTop(float xh, float xn) {
    float s = uTrees.w * 13.17;
    float clump = smoothstep(0.5, 0.85, vn1(xh * 2.2 + s));
    // The reference's dense right-hand stand and left edge are one-off features of its
    // frame: they stop a little past it, so a zoomed-out world runs on in plain noise
    // instead of one solid wall of trees out to either side.
    clump = max(clump, 0.95 * smoothstep(0.6, 0.72, xn) * (1.0 - smoothstep(1.1, 1.3, xn)));
    clump = max(clump, smoothstep(0.06, 0.0, xn) * smoothstep(-0.3, -0.1, xn));
    float ground = uHorizon - uTrees.y * (0.3 + 0.7 * vn1(xh * 40.0 + s));
    float top = ground;
    float sp = max(uTrees.z, 0.004);
    float id = floor(xh / sp);
    for (int i = -3; i <= 3; i++) {
        float j = id + float(i);
        float r1 = h11(j + s);
        float r2 = h11(j * 1.7 + s + 3.1);
        float r3 = h11(j * 2.3 + s + 7.7);
        float cx = (j + 0.5 + (r1 - 0.5) * 0.7) * sp;
        float hgt = uTrees.x * (0.12 + 0.88 * clump) * (0.3 + 0.9 * r2 * r2);
        float rad = sp * (0.6 + 1.2 * r3) * (0.7 + 0.6 * clump);
        float dx = abs(xh - cx) / max(rad, 1e-4);
        if (dx < 1.0) top = min(top, ground - hgt * (1.0 - pow(dx, 1.3)));
    }
    return top;
}

void main() {
    vec2 fc = gl_FragCoord.xy;
    float pitch = uPitchPx;
    vec2 cell = floor((fc - uOff) / pitch);
    vec2 cc = uOff + (cell + 0.5) * pitch;
    float H = max(uRes.y, 1.0);
    float aspect = uRes.x / H;

    // Pointer lamp: a soft disc around the cursor (eased in/out by uHover).
    vec2 m = uMouse * uRes;
    float d = length(cc - m) / H;
    float lamp = clamp(uHover * uHoverAmt * exp(-pow(d / max(uPointer.x, 1e-3), 2.0)), 0.0, 2.0);
    // Magnifying lens: the dots stay on their grid but sample the scene pulled in toward
    // the cursor, so the sunset bands and treeline bulge up under it like a loupe held to
    // the panel. r / (1 + L·g(r)) is monotonic for a gaussian g, so nothing folds over.
    float lensK = 1.0 + uLens.x * min(lamp, 1.5);
    vec2 sp = m + (cc - m) / lensK;
    // Frame → world, the one mapping every scene term reads.
    vec2 wp = 0.5 * uRes + (sp - 0.5 * uRes) / uZoom;
    float v = 1.0 - wp.y / H;
    float xn = wp.x / max(uRes.x, 1.0);
    float xh = wp.x / H;

    float ph = TAU * uTime / max(uCycle, 0.1);
    float sunH = (uSun.x + uSun.z * sin(ph)) * aspect + uSunLean;

    // Bands ripple: a travelling wave (two per loop), zero offset at t = 0.
    float vs = v + uShimmer * 0.5 * (sin(2.0 * ph - xh * 6.0) - sin(-xh * 6.0));
    vec3 col = skyAt(vs, xh, sunH);

    // Horizon glow breathing: peak at half cycle.
    float breath = 0.5 - 0.5 * cos(ph);
    float warmBand = smoothstep(0.62, 0.7, v);
    col *= 1.0 + uGlow * breath * warmBand;

    // Heat wave rolling sideways along the warm band (three passes per loop).
    float heat = sin(xh * 9.0 - 3.0 * ph + sin(xh * 2.3 + ph) * 1.5);
    col *= 1.0 + uHeat * heat * warmBand;

    // Haze drifting across the blue sky.
    float hz = 0.5 + 0.5 * sin(xh * 4.0 - ph + sin(v * 8.0 + xh * 2.0) * 1.2);
    hz *= 0.6 + 0.4 * sin(xh * 7.0 + 2.0 * ph + v * 5.0);
    float skyMask = smoothstep(0.2, 0.36, v) * (1.0 - smoothstep(0.56, 0.64, v));
    col *= 1.0 - uHaze * hz * skyMask;

    // Per-dot twinkle on whole-cycle sines (loops exactly).
    float hs = h21(cell + 0.37);
    float hs2 = h21(cell.yx + 11.3);
    float tw = 0.6 * sin(ph * uTwK + hs * TAU) + 0.4 * sin(ph * (uTwK + 2.0) + hs2 * TAU);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col *= 1.0 + uTwinkle * tw * smoothstep(0.01, 0.3, lum);

    // Treeline per dot, ragged edge; dots just inside the crowns fade dim.
    // Half a dot in world height units: the dots keep their size as the scene zooms.
    float hp = 0.5 * pitch / H / uZoom / lensK;
    float top = treeTop(xh, xn) + (h21(cell + 5.1) - 0.5) * hp * 1.2;
    float cover = smoothstep(top - hp * 0.6, top + hp * 2.5, v);
    col = mix(col, uTree, cover);
    lum = dot(col, vec3(0.299, 0.587, 0.114));

    // Lens rim: a thin lit ring of dots just outside the lamp marks the loupe's edge.
    float ring = uHover * uHoverAmt * uLens.y * exp(-pow((d - uPointer.x * 1.05) / max(uPointer.x * 0.16, 1e-3), 2.0));
    lamp += ring;

    // Press ripples: a ring of swollen, brighter dots running out from each press.
    float rip = 0.0;
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
        vec4 R = uRip[i];
        if (R.w <= 0.0) continue;
        float dr = length(cc - R.xy) / H;
        float w = 0.035 + 0.02 * R.z;
        rip += R.w * exp(-pow((dr - R.z * uRipple.y) / w, 2.0)) * exp(-R.z * 1.1);
    }
    rip *= uRipple.x;

    // Light trail: the cursor paints the panel as it moves. Each segment between two
    // trail points lights the dots near it; fresh segments are wide and white-hot,
    // old ones thin to an ember and go out (z = life left, 1 → 0).
    float trail = 0.0;
    for (int i = 0; i < ${MAX_TRAIL} - 1; i++) {
        vec4 A = uTrail[i];
        vec4 B = uTrail[i + 1];
        if (A.w <= 0.0 || B.w <= 0.0) continue;
        vec2 ab = B.xy - A.xy;
        float t = clamp(dot(cc - A.xy, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
        float ds = length(cc - A.xy - ab * t) / H;
        float life = mix(A.z, B.z, t);
        float w = uTrailP.y * (0.35 + 0.65 * life);
        trail = max(trail, life * life * exp(-pow(ds / max(w, 1e-4), 2.0)));
    }
    float trailAmt = trail * uTrailP.x;

    // Spotlight: while the pointer is over, the rest of the panel dims, so the lit
    // lens and the trail read as the one bright thing on it.
    float spot = exp(-pow(d / max(uPointer.x * 1.6, 1e-3), 2.0));
    col *= 1.0 - uSpotDim * uHover * min(uHoverAmt, 1.0) * (1.0 - clamp(max(spot, trail), 0.0, 1.0));

    float infl = clamp(lamp + rip + trailAmt, 0.0, 2.0);

    float rad = pitch * 0.5 * mix(uDot, max(uPointer.y, uDot), clamp(infl, 0.0, 1.0));
    col *= 1.0 + uPointer.z * infl;
    // Warm light from the cursor and the ripple: added, not multiplied, so the black
    // treeline and the night dots light up under it too, like a lamp held to the panel.
    col += uAccent * uWarm * (lamp + rip);
    // The trail glows Accent, turning Sun Core where it is freshest.
    col += mix(uAccent, uSunCore, smoothstep(0.45, 1.0, trail)) * trailAmt * 0.9;

    // Dot: crisp circle, faint halo on bright dots.
    float dist = length(fc - cc);
    float a = 1.0 - smoothstep(rad - 0.75, rad + 0.75, dist);
    float halo = exp(-max(dist - rad, 0.0) / max(pitch * 0.12, 1e-3)) * (1.0 - a) * uHalo * smoothstep(0.35, 0.8, lum);
    vec3 o = mix(uBg, col, a) + col * halo * 0.35;

    vec2 q = fc / max(uRes, vec2(1.0)) - 0.5;
    q.x *= aspect;
    o *= 1.0 - uVignette * smoothstep(0.35, 1.0, length(q));
    o += (h21(fc + fract(uTime * 7.31) * 913.0) - 0.5) * uGrain * 0.18;
    outColor = vec4(clamp(o, 0.0, 1.0), 1.0);
}`
// ══ /EFFECT ═════════════════════════════════════════════════════════════════

export interface AmberVesperProps extends EffectProps {
    background?: string
    baseColor?: string
    accentColor?: string
    speed?: number
    /** Cell size, % — the old `scale` key, kept so existing instances keep their value. */
    scale?: number
    /** How big the scene draws in the frame, %. Below 100 the sky and forest run on. */
    sceneScale?: number
    style?: CSSProperties
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

export default function AmberVesper(props: AmberVesperProps) {
    props = withMovedControls(props)
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#389FAC", accentColor = "#FFBD00", speed = 50, scale = 172, sceneScale = 100, style } = props
    void [baseColor, accentColor, speed, scale, sceneScale]
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("AmberVesper shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("AmberVesper link:", gl.getProgramInfoLog(prog))
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

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.round(root.offsetWidth * dpr))
            canvas.height = Math.max(1, Math.round(root.offsetHeight * dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        // Pointer as a 0–1 share of the frame as displayed (y up, as GL reads it), so it
        // stays under the cursor at any canvas zoom. The original divided the canvas's
        // offsetX/Y by layout size, which drifts off the cursor whenever the frame is
        // shown scaled — and listened on the canvas, which an overlay can cover.
        let mx = 0.5
        let my = 0.5
        let tx = 0.5
        let ty = 0.5
        let over = 0
        let hov = 0
        let lean = 0
        const ripples: { x: number; y: number; age: number }[] = []
        const ripData = new Float32Array(MAX_RIPPLES * 4)
        const trail: { x: number; y: number; age: number }[] = []
        const trailData = new Float32Array(MAX_TRAIL * 4)
        const onMove = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            if (r.width < 1 || r.height < 1) return
            tx = (e.clientX - r.left) / r.width
            ty = 1 - (e.clientY - r.top) / r.height
            over = 1
        }
        const onLeave = () => {
            over = 0
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            ripples.push({ x: tx, y: ty, age: 0 })
            if (ripples.length > MAX_RIPPLES) ripples.shift()
        }
        const onUp = (e: PointerEvent) => {
            if (e.pointerType === "touch") over = 0
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        root.addEventListener("pointerup", onUp)
        root.addEventListener("pointercancel", onUp)

        let clock = 0
        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const W = canvas.width
            const H = canvas.height
            clock = (clock + dt * (Math.max(0, Math.min(100, num(p.speed, 50))) / 50) * (reduced ? 0.25 : 1)) % 3600

            // The spot under the cursor follows in ~50 ms and snaps there on entry; the
            // hover itself fades in and out over ~150 ms. (The original eased all three
            // over ~170 ms, which read as the lens trailing the cursor.)
            if (hov < 0.01) {
                mx = tx
                my = ty
            } else {
                const f = 1 - Math.exp(-dt / 0.05)
                mx += (tx - mx) * f
                my += (ty - my) * f
            }
            hov += (over - hov) * (1 - Math.exp(-dt / 0.15))

            const zoom = clamp(num(p.sceneScale, 100), SCENE_MIN, 100) / 100
            // Snapped to whole device pixels. The original's pitch (H · 1.08% · Scale) was
            // fractional, so every column and row of dots sat at a different sub-pixel
            // phase and the gaps beat into dark lines across the grid. The grid is then
            // centred, so the part-cells at the edges split evenly.
            const pitch = Math.max(3, Math.round(((H * clamp(num(adv.pitch, 108), 20, 600)) / 10000) * (clamp(num(p.scale, 100), 10, 300) / 100)))
            const offX = Math.floor((W % pitch) / 2)
            const offY = Math.floor((H % pitch) / 2)

            // Sun lean: the hot-spot slides toward the cursor's x in world height units —
            // slow (~0.6 s), as secondary motion, never the spot under the cursor.
            const aspect = W / Math.max(1, H)
            const pointerXh = (0.5 + (mx - 0.5) / zoom) * aspect
            const sunXh = (clamp(num(adv.sunX, 55), 0, 100) / 100) * aspect
            const hoverAmt = clamp(num(adv.hover, 50), 0, 100) / 50
            const leanTo = (pointerXh - sunXh) * (clamp(num(adv.sunFollow, 30), 0, 100) / 100) * hov * Math.min(1, hoverAmt)
            lean += (leanTo - lean) * (1 - Math.exp(-dt / 0.6))

            ripData.fill(0)
            for (let i = ripples.length - 1; i >= 0; i--) {
                ripples[i].age += dt
                if (ripples[i].age > RIPPLE_LIFE) ripples.splice(i, 1)
            }
            ripples.forEach((r, i) => ripData.set([r.x * W, r.y * H, r.age, 1], i * 4))

            // Trail: a point every TRAIL_STEP of travel while over; each fades over trailLife.
            const trailLife = clamp(num(adv.trailLife, 900), 200, 3000) / 1000
            for (let i = trail.length - 1; i >= 0; i--) {
                trail[i].age += dt
                if (trail[i].age > trailLife) trail.splice(i, 1)
            }
            if (over && hov > 0.01) {
                const px = mx * W
                const py = my * H
                const lastP = trail[trail.length - 1]
                if (!lastP || Math.hypot(px - lastP.x, py - lastP.y) > H * TRAIL_STEP) {
                    trail.push({ x: px, y: py, age: 0 })
                    if (trail.length > MAX_TRAIL) trail.shift()
                }
            }
            trailData.fill(0)
            trail.forEach((t, i) => trailData.set([t.x, t.y, 1 - t.age / trailLife, 1], i * 4))

            const bg = parseColor(p.background, [0.03, 0.03, 0.04, 1])
            const base = parseColor(p.baseColor, [0.23, 0.18, 0.55, 1])
            const acc = parseColor(p.accentColor, [0.91, 0.42, 0.57, 1])
            gl.viewport(0, 0, W, H)
            gl.uniform2f(u("uRes"), W, H)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform2f(u("uMouse"), mx, my)
            // Raw 0..1: the FRAG scales it by the Advanced `hover` row (RULES.md).
            gl.uniform1f(u("uHover"), hov)
            gl.uniform3f(u("uBg"), bg[0], bg[1], bg[2])
            gl.uniform3f(u("uBase"), base[0], base[1], base[2])
            gl.uniform3f(u("uAccent"), acc[0], acc[1], acc[2])
            gl.uniform1f(u("uPitchPx"), pitch)
            gl.uniform2f(u("uOff"), offX, offY)
            gl.uniform1f(u("uZoom"), zoom)
            gl.uniform1f(u("uSunLean"), lean)
            gl.uniform4fv(u("uRip"), ripData)
            gl.uniform4fv(u("uTrail"), trailData)
            effectUniforms(gl, u, p)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            root.removeEventListener("pointerup", onUp)
            root.removeEventListener("pointercancel", onUp)
        }
    }, [])

    // No minWidth/minHeight: the original pinned the root at 1200×800, so the
    // component overflowed any smaller frame instead of fitting it.
    return (
        <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", ...style, overflow: "hidden", background }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", pointerEvents: "none" }} />
        </div>
    )
}
