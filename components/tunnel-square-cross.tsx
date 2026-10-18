"use client"

/**
 * TunnelSquareCross — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    flySpeed: 320,
    periodMs: 5100,
    focal: 100,
    tunnelAspect: 100,
    centerX: 500,
    centerY: 500,
    relief: 18,
    cellLength: 220,
    sliceCells: 8,
    paneLine: 6,
    stripChance: 30,
    panelBright: 130,
    whiteCore: 30,
    fogNear: 40,
    fogFar: 180,
    wallLight: 10,
    edgeLight: 8,
    wallColor: "#1E214E",
    edgeColor: "#525772",
    color3: "#F2E21A",
    color4: "#20E070",
    color5: "#2238FF",
    color6: "#FF6A10",
    color7: "#9A40FF",
    color8: "#FF2A4A",
    lavender: "#F7A8F5",
    landmarkCyan: "#12CCEE",
    landmarkYellow: "#F2C21A",
    landmarkPale: "#D8B8FF",
    rays: 30,
    scanlines: 12,
    seed: 0,
    grain: 0,
    vignette: 0,
    hover: 100,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    density?: number
    glow?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

const PAL_BUF = new Float32Array(18)
const LM_BUF = new Float32Array(12)

function clampN(v: unknown, d: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, num(v, d)))
}

function putColor(buf: Float32Array, i: number, c: string | undefined, fb: string): void {
    const rgba = parseColor(c, parseColor(fb, [0, 0, 0, 1]))
    buf[i * 3] = rgba[0]
    buf[i * 3 + 1] = rgba[1]
    buf[i * 3 + 2] = rgba[2]
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const D = ADVANCED_DEFAULTS
    const fogNear = clampN(adv.fogNear, D.fogNear, 5, 600) / 10
    const fogFar = Math.max(fogNear + 1, clampN(adv.fogFar, D.fogFar, 10, 1000) / 10)
    gl.uniform4f(
        u("uCam"),
        clampN(adv.flySpeed, D.flySpeed, 10, 2000) / 100,
        clampN(adv.periodMs, D.periodMs, 500, 30000) / 1000,
        clampN(adv.focal, D.focal, 20, 400) / 100,
        clampN(adv.tunnelAspect, D.tunnelAspect, 30, 300) / 100
    )
    gl.uniform2f(u("uVp"), clampN(adv.centerX, D.centerX, 0, 1000) / 1000, 1 - clampN(adv.centerY, D.centerY, 0, 1000) / 1000)
    gl.uniform4f(
        u("uLook"),
        clampN(p.density, 30, 0, 100) / 100,
        clampN(p.glow, 40, 0, 100) / 100,
        clampN(adv.relief, D.relief, 0, 60) / 100,
        clampN(adv.panelBright, D.panelBright, 0, 300) / 100
    )
    gl.uniform4f(u("uFog"), fogNear, fogFar, clampN(adv.wallLight, D.wallLight, 0, 100) / 100, clampN(adv.edgeLight, D.edgeLight, 0, 100) / 100)
    gl.uniform4f(
        u("uMisc"),
        clampN(adv.sliceCells, D.sliceCells, 1, 100),
        clampN(adv.paneLine, D.paneLine, 0, 40) / 100,
        clampN(adv.stripChance, D.stripChance, 0, 100) / 100,
        clampN(adv.whiteCore, D.whiteCore, 0, 100) / 100
    )
    gl.uniform4f(
        u("uFx"),
        clampN(adv.grain, D.grain, 0, 100) / 100,
        clampN(adv.vignette, D.vignette, 0, 100) / 100,
        clampN(adv.scanlines, D.scanlines, 0, 100) / 100,
        clampN(adv.hover, D.hover, 0, 100) / 50
    )
    gl.uniform3f(
        u("uSeed"),
        clampN(adv.seed, D.seed, 0, 100),
        clampN(adv.rays, D.rays, 0, 100) / 100,
        clampN(adv.cellLength, D.cellLength, 50, 600) / 100
    )
    putColor(PAL_BUF, 0, adv.color3, D.color3)
    putColor(PAL_BUF, 1, adv.color4, D.color4)
    putColor(PAL_BUF, 2, adv.color5, D.color5)
    putColor(PAL_BUF, 3, adv.color6, D.color6)
    putColor(PAL_BUF, 4, adv.color7, D.color7)
    putColor(PAL_BUF, 5, adv.color8, D.color8)
    gl.uniform3fv(u("uPal"), PAL_BUF)
    putColor(LM_BUF, 0, adv.lavender, D.lavender)
    putColor(LM_BUF, 1, adv.landmarkCyan, D.landmarkCyan)
    putColor(LM_BUF, 2, adv.landmarkYellow, D.landmarkYellow)
    putColor(LM_BUF, 3, adv.landmarkPale, D.landmarkPale)
    gl.uniform3fv(u("uLm"), LM_BUF)
    const wc = parseColor(adv.wallColor, [0.12, 0.13, 0.3, 1])
    gl.uniform3f(u("uWall"), wc[0], wc[1], wc[2])
    const ec = parseColor(adv.edgeColor, [0.32, 0.34, 0.45, 1])
    gl.uniform3f(u("uEdge"), ec[0], ec[1], ec[2])
}

/*
 * Forward dolly down an infinite square tunnel. Each ray picks the wall it reaches, then
 * DDA-steps the wall's (lateral, depth) cell grid through a relief layer of boxes of
 * varying height. Cells are long in depth, so near panels stretch into radial streaks.
 * The block structure is kept almost black; only the neon panels and edge strips read.
 * Geometry repeats every `periodMs` of travel; colours come from the un-wrapped depth slice.
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
uniform vec3 uPal[6];
uniform vec3 uLm[4];
uniform vec3 uWall;
uniform vec3 uEdge;
uniform vec4 uCam;
uniform vec2 uVp;
uniform vec4 uLook;
uniform vec4 uFog;
uniform vec4 uMisc;
uniform vec4 uFx;
uniform vec3 uSeed;
out vec4 outColor;

// Landmarks: wall (0 right, 1 left, 2 ceiling, 3 floor), (lateral, depth) at t = 0, panes.
const float LM_WALL[4] = float[4](0.0, 3.0, 1.0, 3.0);
const vec2 LM_POS[4] = vec2[4](vec2(0.85, 7.0), vec2(0.03, 4.0), vec2(-0.1, 10.8), vec2(0.54, 5.8));
const vec2 LM_PANES[4] = vec2[4](vec2(1.0, 1.0), vec2(1.0, 3.0), vec2(2.0, 3.0), vec2(3.0, 3.0));

vec2 gLm[4];
float gHmax;
float gSeed;

float h3(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
}

vec3 palC(float k) {
    if (k < 0.5) return uBase;
    if (k < 1.5) return uAccent;
    return uPal[int(clamp(k - 2.0, 0.0, 5.0))];
}

float cellH(float wall, float ci, float jp) {
    for (int k = 0; k < 4; k++) {
        if (wall == LM_WALL[k] && ci == gLm[k].x && jp == gLm[k].y) return gHmax;
    }
    float h = h3(vec3(ci, jp, wall * 17.0 + gSeed));
    return gHmax * floor(h * 3.999) / 3.0;
}

// x: lit mask (mullions cut out), y: distance outside the panel in cell units
vec2 panel(vec2 q, vec2 lo, vec2 hi, vec2 panes, float soft) {
    vec2 c = (lo + hi) * 0.5;
    vec2 hs = (hi - lo) * 0.5;
    vec2 dq = abs(q - c) - hs;
    float outside = length(max(dq, 0.0));
    float inside = 1.0 - smoothstep(-soft, soft, max(dq.x, dq.y));
    vec2 g = (q - lo) / max(hi - lo, vec2(1e-3)) * panes;
    float lw = uMisc.y * 0.5;
    float m = 1.0;
    if (panes.x > 1.5) {
        float dl = abs(g.x - clamp(floor(g.x + 0.5), 1.0, panes.x - 1.0)) / panes.x;
        m *= smoothstep(lw, lw + soft, dl);
    }
    if (panes.y > 1.5) {
        float dl = abs(g.y - clamp(floor(g.y + 0.5), 1.0, panes.y - 1.0)) / panes.y;
        m *= smoothstep(lw, lw + soft, dl);
    }
    return vec2(inside * m, outside);
}

void main() {
    float hov = clamp(uHover, 0.0, 1.0) * uFx.w;
    vec2 vp = uVp + (uMouse - 0.5) * 0.08 * hov;
    float resY = max(uRes.y, 1.0);
    vec2 p = (gl_FragCoord.xy - vp * uRes) / resY;
    float f = max(uCam.z, 0.05);
    vec3 d = vec3(p / f, 1.0);
    float csl = 0.12 * max(uScale, 0.05);
    vec2 csv = vec2(csl, csl * max(uSeed.z, 0.2));
    float v = max(uCam.x, 0.01);
    float Nc = max(4.0, floor(v * uCam.y / csv.y + 0.5));
    float P = Nc * csv.y;
    float camZ = uTime * v;
    float camWrap = mod(camZ, P);
    float lap = floor(camZ / P);
    float Rx = 1.0;
    float Ry = max(uCam.w, 0.2);
    gHmax = clamp(uLook.z, 0.0, 0.6) * min(Rx, Ry);
    gSeed = uSeed.x;
    for (int k = 0; k < 4; k++) {
        vec2 c = floor(LM_POS[k] / csv);
        gLm[k] = vec2(c.x, mod(c.y, Nc));
    }

    // which wall
    float tx = Rx / max(abs(d.x), 1e-4);
    float ty = Ry / max(abs(d.y), 1e-4);
    float wall;
    float R;
    float a;
    float b;
    if (tx < ty) { wall = d.x > 0.0 ? 0.0 : 1.0; R = Rx; a = abs(d.x); b = d.y; }
    else { wall = d.y > 0.0 ? 2.0 : 3.0; R = Ry; a = abs(d.y); b = d.x; }
    a = max(a, 1e-4);

    // DDA through the relief layer
    float t0 = max((R - gHmax) / a, 0.05);
    float t1 = R / a;
    float sx = b >= 0.0 ? 1.0 : -1.0;
    float bx = max(abs(b), 1e-5);
    vec2 pos = vec2(b * t0, camWrap + t0);
    vec2 cell = floor(pos / csv);
    vec2 tDelta = vec2(csv.x / bx, csv.y);
    vec2 tMax = vec2(t0 + ((cell.x + (sx > 0.0 ? 1.0 : 0.0)) * csv.x - pos.x) / (sx * bx), t0 + (cell.y + 1.0) * csv.y - pos.y);
    float t = t0;
    float face = 0.0;
    float hitT = t1;
    float hitFace = 0.0;
    float hitH = 0.0;
    vec2 hitCell = floor(vec2(b * t1, camWrap + t1) / csv);
    for (int s = 0; s < 40; s++) {
        float H = cellH(wall, cell.x, mod(cell.y, Nc));
        if (s > 0 && R - a * t <= H) { hitT = t; hitFace = face; hitCell = cell; hitH = H; break; }
        float tTop = (R - H) / a;
        if (tTop <= min(tMax.x, tMax.y)) { hitT = max(tTop, t); hitFace = 0.0; hitCell = cell; hitH = H; break; }
        if (tMax.x < tMax.y) { cell.x += sx; t = tMax.x; tMax.x += tDelta.x; face = 1.0; }
        else { cell.y += 1.0; t = tMax.y; tMax.y += tDelta.y; face = 2.0; }
    }

    // surface coordinates
    float jp = mod(hitCell.y, Nc);
    float jg = lap * Nc + hitCell.y;
    vec2 hp = vec2(b * hitT, camWrap + hitT);
    float soft = clamp(hitT * max(1.0, hitT / R) / (resY * f * csv.x), 0.003, 0.4);
    vec2 lc = clamp(hp / csv - hitCell, 0.0, 1.0);
    float hv = hitH > 1e-4 ? clamp((R - a * hitT) / hitH, 0.0, 1.0) : 0.0;
    vec2 q = hitFace < 0.5 ? lc : (hitFace < 1.5 ? vec2(lc.y, hv) : vec2(lc.x, hv));

    float base3 = wall * 7.0 + gSeed;
    float r1 = h3(vec3(hitCell.x, jp, base3 + 0.5 + hitFace * 31.0));
    float r2 = h3(vec3(hitCell.x, jp, base3 + 1.5));
    float r3 = h3(vec3(hitCell.x, jp, base3 + 2.5 + hitFace * 13.0));
    float r4 = h3(vec3(hitCell.x, jp, base3 + 3.5 + hitFace * 13.0));
    float sl = floor(jg / max(uMisc.x, 1.0));
    float s1 = h3(vec3(sl, 3.0, gSeed + 9.0));
    float s2 = h3(vec3(sl, 7.0, gSeed + 9.0));
    float s3 = h3(vec3(sl, 11.0, gSeed + 9.0));
    float k1 = floor(s1 * 7.999);
    float k2 = mod(k1 + 1.0 + floor(s2 * 6.999), 8.0);
    float k3 = floor(s3 * 7.999);
    vec3 cA = palC(k1);
    vec3 cB = palC(k2);
    vec3 c = r2 < 0.47 ? cA : (r2 < 0.9 ? cB : palC(k3));
    float bright = (0.4 + 0.8 * fract(r1 * 91.7)) * uLook.w;

    float fade = pow(clamp((uFog.y - hitT) / max(uFog.y - uFog.x, 1e-3), 0.0, 1.0), 1.6);
    float shadeF = hitFace < 0.5 ? 1.0 : (hitFace < 1.5 ? 0.55 : 0.8);
    float edgeD = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
    vec3 col = (uWall * uFog.z + uEdge * uFog.w * (1.0 - smoothstep(0.0, 0.04 + soft, edgeD))) * shadeF * exp(-hitT * 0.55);

    vec3 emis = vec3(0.0);
    float glowW = 0.02 + 0.16 * uLook.y;
    float glowA = 1.2 * uLook.y;
    float lm = -1.0;
    for (int k = 0; k < 4; k++) {
        if (lm < 0.0 && wall == LM_WALL[k] && hitCell.x == gLm[k].x) {
            float dj = mod(jp - gLm[k].y, Nc);
            if (dj < 0.5) lm = float(k);
            else if (dj < 12.5 && mod(dj, 2.0) < 0.5) lm = float(k) + 10.0;
        }
    }
    if (lm >= 0.0) {
        if (hitFace < 0.5) {
            int k = int(mod(lm, 10.0) + 0.5);
            bool chain = lm > 9.5;
            vec3 lcCol = uLm[k];
            vec2 pr = chain ? panel(q, vec2(0.3), vec2(0.7), vec2(1.0), soft) : panel(q, vec2(0.08), vec2(0.92), LM_PANES[k], soft);
            float lb = (chain ? 0.85 : 1.3) * uLook.w;
            vec3 core = mix(lcCol, vec3(1.0), uMisc.w * 0.5);
            emis += core * lb * pr.x + lcCol * lb * glowA * 1.4 * exp(-pr.y / glowW) * (1.0 - pr.x);
        }
    } else {
        float chance = uLook.x * (hitFace < 0.5 ? 1.0 : (hitFace < 1.5 ? 0.35 : 0.6));
        vec3 tone = mix(c, vec3(1.0), uMisc.w * smoothstep(0.9, 1.5, bright));
        if (r1 < chance) {
            vec2 lo = vec2(0.06 + 0.24 * r3, 0.06 + 0.24 * fract(r3 * 7.13));
            vec2 hi = vec2(0.94 - 0.24 * r4, 0.94 - 0.24 * fract(r4 * 5.71));
            vec2 panes = vec2(1.0 + floor(fract(r3 * 13.7) * 3.0), 1.0 + floor(fract(r4 * 17.3) * 3.0));
            vec2 pr = panel(q, lo, hi, panes, soft);
            emis += tone * bright * pr.x + c * bright * glowA * exp(-pr.y / glowW) * (1.0 - pr.x);
        }
        // neon strips along block edges (span 3 cells in depth, so they read as receding lines)
        float rs = h3(vec3(hitCell.x, floor(jp / 3.0), wall * 5.0 + gSeed + 50.0 + hitFace * 3.0));
        if (rs < uMisc.z) {
            vec3 sc = rs < uMisc.z * 0.5 ? cA : cB;
            float sd = hitFace < 0.5 ? abs(q.x - 0.06) : abs(q.y - 0.94);
            float sm = 1.0 - smoothstep(0.04, 0.04 + soft, sd);
            emis += sc * uLook.w * (sm + glowA * 0.8 * exp(-max(sd - 0.04, 0.0) / glowW) * (1.0 - sm));
        }
    }
    col += emis * fade;

    // pale light rays from the lavender landmark's upper-right corner
    {
        float lz = (gLm[0].y + 0.5) * csv.y - camWrap;
        if (lz < 0.4) lz += P;
        float lw = (floor(LM_POS[0].x / csv.x) + 0.5) * csv.x;
        vec2 sp = vec2(Rx - gHmax, lw) * f / lz;
        float hs = 0.42 * csv.x * f / lz;
        vec2 qq = p - sp - vec2(hs);
        float L = 10.0 * hs;
        float rays = 0.0;
        for (int k = 0; k < 5; k++) {
            float ang = radians(26.0 + 9.0 * float(k));
            vec2 dr = vec2(cos(ang), sin(ang));
            float al = dot(qq, dr);
            float cr = abs(qq.x * dr.y - qq.y * dr.x);
            rays += step(0.0, al) * (1.0 - smoothstep(0.0, L, al)) * (1.0 - smoothstep(0.0, 1.5 / resY, cr));
        }
        float lf = pow(clamp((uFog.y - lz) / max(uFog.y - uFog.x, 1e-3), 0.0, 1.0), 1.6);
        col += uLm[0] * rays * uSeed.y * lf;
    }

    col = uBg + col;
    vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));
    col *= 1.0 - uFx.z * step(mod(gl_FragCoord.x, 7.0), 1.0);
    float vg = smoothstep(0.3, 0.95, length((uv - 0.5) * vec2(uRes.x / resY, 1.0)));
    col *= 1.0 - uFx.y * vg;
    col += (h3(vec3(gl_FragCoord.xy, floor(uTime * 24.0))) - 0.5) * uFx.x * 0.25;
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

export default function TunnelSquareCross(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#030205", baseColor = "#12CCEE", accentColor = "#FF3CE0", speed = 50, scale = 100, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("TunnelSquareCross shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("TunnelSquareCross link:", gl.getProgramInfoLog(prog))
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
