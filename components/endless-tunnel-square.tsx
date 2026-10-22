"use client"

/**
 * EndlessTunnelSquare — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    tilesPerRing: 24,
    ringStepMs: 1600,
    centerY: 54,
    tileSize: 76,
    jitter: 11,
    tilt: 9,
    lineWeight: 16,
    lineOpacity: 92,
    edgeColor: "#8AA6CC",
    edgeDim: 50,
    centerFalloff: 5,
    haloColor: "#6F93C8",
    haloPx: 2,
    haloOpacity: 15,
    ghostColor: "#34486A",
    ghostOffset: 35,
    ghostOpacity: 55,
    gridColor: "#22304A",
    gridOpacity: 30,
    fill: 85,
    subColor: "#8FA9CF",
    subGrid: 4,
    subOpacity: 50,
    fineDetail: 50,
    hazeColor: "#0A1020",
    hazeRadius: 30,
    glowRadius: 14,
    glowMid: "#9EC4F0",
    glowDeep: "#3D5F8C",
    pulse: 10,
    grain: 0,
    vignette: 10,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    spin?: number
    glow?: number
    hover?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/** Per-context zoom/spin accumulators, so speed, spin and step changes never jump. */
interface TunnelClock {
    last: number
    z: number
    turn: number
    reduced: boolean
}
const TUNNEL_CLOCKS = new WeakMap<WebGL2RenderingContext, TunnelClock>()

function clampNum(v: unknown, d: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, num(v, d)))
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    let clk = TUNNEL_CLOCKS.get(gl)
    if (!clk) {
        clk = {
            last: -1,
            z: 0,
            turn: 0,
            reduced:
                typeof window !== "undefined" &&
                typeof window.matchMedia === "function" &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        }
        TUNNEL_CLOCKS.set(gl, clk)
    }
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    const dt = clk.last < 0 ? 0 : Math.min(Math.max(0, (now - clk.last) / 1000), 1 / 20)
    clk.last = now

    // Tiles per ring: conformal log-polar cells, so ring ratio k = e^(2π/N) keeps them square.
    const scale = clampNum(p.scale, 100, 10, 300) / 100
    const N = Math.round(Math.max(6, Math.min(96, clampNum(adv.tilesPerRing, 24, 6, 96) / scale)))
    const lnk = (Math.PI * 2) / N
    const stepS = clampNum(adv.ringStepMs, 1600, 200, 10000) / 1000
    const rate = (clampNum(p.speed, 50, 0, 100) / 50) * (clk.reduced ? 0.25 : 1)
    // Zoom: one ring (ln k) per step, linear. Wraps after 16·N rings, where ring hashes repeat.
    clk.z = (clk.z + (dt * rate * lnk) / stepS) % (Math.PI * 2 * 16)
    // Spin: half a tile per ring step at 50, clockwise; wraps on a full turn.
    const spin = clampNum(p.spin, 50, -100, 100) / 50
    clk.turn = (((clk.turn + (dt * rate * spin * 0.5) / (N * stepS)) % 1) + 1) % 1
    // Glow pulse: 90% at rest, 100% one ring step later, back at two (one loop).
    const amp = clampNum(adv.pulse, 10, 0, 100) / 100
    const pulse = 1 - amp * (0.5 + 0.5 * Math.cos((Math.PI * clk.z) / lnk))

    const f1 = (name: string, v: number) => gl.uniform1f(u(name), v)
    const c3 = (name: string, v: unknown, fb: RGBA) => {
        const c = parseColor(typeof v === "string" ? v : undefined, fb)
        gl.uniform3f(u(name), c[0], c[1], c[2])
    }
    const pct = (v: unknown, d: number) => clampNum(v, d, 0, 100) / 100

    f1("uN", N)
    f1("uZ", clk.z)
    f1("uTurn", clk.turn)
    f1("uGlow", (clampNum(p.glow, 70, 0, 100) / 60) * pulse)
    f1("uHoverK", clampNum(p.hover, 50, 0, 100) / 50)
    f1("uCenterY", 1 - clampNum(adv.centerY, 54, 0, 100) / 100)
    f1("uTileSize", clampNum(adv.tileSize, 76, 40, 95) / 100)
    f1("uJitter", clampNum(adv.jitter, 11, 0, 20) / 100)
    f1("uTilt", (clampNum(adv.tilt, 9, 0, 20) * Math.PI) / 180)
    f1("uLine", clampNum(adv.lineWeight, 16, 1, 40) / 1000)
    f1("uLineAlpha", pct(adv.lineOpacity, 92))
    c3("uEdge", adv.edgeColor, [0.54, 0.65, 0.8, 1])
    f1("uEdgeDim", pct(adv.edgeDim, 50))
    f1("uFalloff", clampNum(adv.centerFalloff, 5, 0, 20))
    c3("uHaloCol", adv.haloColor, [0.44, 0.58, 0.78, 1])
    f1("uHaloPx", clampNum(adv.haloPx, 2, 0, 20))
    f1("uHaloAlpha", pct(adv.haloOpacity, 15))
    c3("uGhost", adv.ghostColor, [0.2, 0.28, 0.42, 1])
    f1("uGhostOff", clampNum(adv.ghostOffset, 35, 0, 80) / 1000)
    f1("uGhostAlpha", pct(adv.ghostOpacity, 55))
    c3("uGrid", adv.gridColor, [0.13, 0.19, 0.29, 1])
    f1("uGridAlpha", pct(adv.gridOpacity, 30))
    f1("uFill", pct(adv.fill, 85))
    c3("uSub", adv.subColor, [0.56, 0.66, 0.81, 1])
    f1("uSubGrid", Math.round(clampNum(adv.subGrid, 4, 2, 8)))
    f1("uSubAlpha", pct(adv.subOpacity, 50))
    f1("uFine", pct(adv.fineDetail, 50))
    c3("uHaze", adv.hazeColor, [0.04, 0.06, 0.13, 1])
    f1("uHazeR", clampNum(adv.hazeRadius, 30, 5, 150) / 100)
    f1("uCore", clampNum(adv.glowRadius, 14, 1, 60) / 1000)
    c3("uGlowMid", adv.glowMid, [0.62, 0.77, 0.94, 1])
    c3("uGlowDeep", adv.glowDeep, [0.24, 0.37, 0.55, 1])
    f1("uGrain", pct(adv.grain, 0))
    f1("uVignette", pct(adv.vignette, 10))
}

/*
 * Log-polar square tunnel. u = ln(r)·N/2π (rings), v = θ·N/2π (tiles), so every cell is a
 * conformal square whose size grows with radius, and scaling by k = e^(2π/N) is a shift of
 * one ring — the zoom (uZ) is a pure translation in u and never seams. Each ring gets a
 * random angular offset. Every pixel checks its 3×3 neighbouring cells, so a tile pushed off
 * its cell, resized or tilted can overlap its neighbours. The highest-priority tile covering
 * the pixel owns the fill and the nested sub-squares; outlines from every tile show through.
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
uniform float uN;
uniform float uZ;
uniform float uTurn;
uniform float uGlow;
uniform float uHoverK;
uniform float uCenterY;
uniform float uTileSize;
uniform float uJitter;
uniform float uTilt;
uniform float uLine;
uniform float uLineAlpha;
uniform vec3 uEdge;
uniform float uEdgeDim;
uniform float uFalloff;
uniform vec3 uHaloCol;
uniform float uHaloPx;
uniform float uHaloAlpha;
uniform vec3 uGhost;
uniform float uGhostOff;
uniform float uGhostAlpha;
uniform vec3 uGrid;
uniform float uGridAlpha;
uniform float uFill;
uniform vec3 uSub;
uniform float uSubGrid;
uniform float uSubAlpha;
uniform float uFine;
uniform vec3 uHaze;
uniform float uHazeR;
uniform float uCore;
uniform vec3 uGlowMid;
uniform vec3 uGlowDeep;
uniform float uGrain;
uniform float uVignette;
out vec4 outColor;

const float TAU = 6.28318530718;

vec4 h4(vec2 p) {
    vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}
mat2 rot(float a) { float c = cos(a), sn = sin(a); return mat2(c, sn, -sn, c); }
float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float stroke(float d, float w, float aa) {
    return 1.0 - smoothstep(max(w - 0.5 * aa, 0.0), w + 0.5 * aa, abs(d));
}
float ringOff(float ring) {
    return h4(vec2(mod(ring, 16.0) * 1.7 + 5.3, 91.0)).x;
}
// One hashed square per grid cell (kept inside its cell), outline only.
float subSquares(vec2 tq, float G, vec2 seed, float density, float hmin, float hmax, float tilt, float w, float aaG) {
    vec2 g = tq * G;
    vec2 gi = floor(g);
    vec2 gf = fract(g) - 0.5;
    vec4 h = h4(gi + seed);
    if (h.x > density) return 0.0;
    float hsz = mix(hmin, hmax, h.y);
    float room = max(0.5 - hsz * 1.15 - w - aaG, 0.0);
    vec2 o = (vec2(h.w, fract(h.w * 7.31 + h.y * 3.17)) - 0.5) * 2.0 * room;
    float d = sdBox(rot((h.z - 0.5) * 2.0 * tilt) * (gf - o), vec2(hsz));
    return stroke(d, w, aaG) * (0.7 + 0.3 * fract(h.y * 13.7));
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    float H = max(uRes.y, 1.0);
    float pull = clamp(uHover, 0.0, 1.0) * uHoverK;

    // Vanishing point, eased toward the pointer (up to ~6% of the frame).
    vec2 c0 = vec2(0.5 * uRes.x, uCenterY * H);
    vec2 c = c0 + (uMouse * uRes - c0) * 0.12 * pull;
    vec2 p = frag - c;
    float r = max(length(p), 1e-4);
    float rh = r / H;
    float th = atan(p.y, p.x);
    float N = max(uN, 3.0);

    float u = (log(rh) - uZ) * N / TAU;
    float vb = th * N / TAU + uTurn * N;
    float ring0 = floor(u);
    float s = max(TAU * r / N, 1e-3);               // device px per cell
    float aa = 1.0 / s;
    float tileVis = smoothstep(2.5, 7.0, s);

    vec2 dm = (frag - uMouse * uRes) / H;
    float pl = exp(-dot(dm, dm) / 0.04) * pull;

    float hot = exp(-rh * uFalloff);
    vec3 hotLine = mix(uBase, uAccent, 0.6);
    vec3 lineCol = mix(uBase, hotLine, hot);
    lineCol = mix(lineCol, uEdge, smoothstep(0.2, 0.75, rh) * uEdgeDim);
    lineCol *= 1.0 + 0.5 * pl;
    vec3 subCol = mix(uSub, mix(uSub, uAccent, 0.65), hot) * (1.0 + 0.5 * pl);

    // Ground: near-black with a faint cold haze around the middle.
    vec3 col = mix(uBg, uHaze, exp(-pow(rh / max(uHazeR, 1e-3), 2.0)));

    // Faint polar grid on this pixel's own cell boundaries.
    vec2 local = vec2(fract(vb + ringOff(ring0)), fract(u));
    vec2 ge = min(local, 1.0 - local);
    float gridL = 1.0 - smoothstep(0.25 * aa, aa, min(ge.x, ge.y));
    col = mix(col, uGrid, gridL * uGridAlpha * tileVis);

    // Tiles from the 3×3 neighbouring cells, so a jittered tile can overlap its neighbours.
    float lw = 0.5 * max(s * uLine, 1.2) * aa;
    float edge = 0.0;
    float ghost = 0.0;
    float haloD = 1e3;
    float best = -1.0;
    float bIn = 0.0;
    float bhs = 0.5;
    vec2 bq = vec2(0.0);
    vec2 bid = vec2(0.0);
    for (int dr = -1; dr <= 1; dr++) {
        float ring = ring0 + float(dr);
        float rid = mod(ring, 16.0);
        float v = vb + ringOff(ring);
        float uy = u - ring - 0.5;
        float t0 = floor(v);
        for (int dt = -1; dt <= 1; dt++) {
            float tile = t0 + float(dt);
            float tid = mod(tile, N);
            vec4 hA = h4(vec2(rid + 3.7, tid + 11.3));
            vec4 hB = h4(vec2(tid * 1.37 + 57.0, rid * 2.11 + 19.0));
            float hs = 0.5 * uTileSize * mix(0.8, 1.12, hA.x);
            vec2 off = (hA.yz - 0.5) * 2.0 * uJitter;
            mat2 R = rot((hA.w - 0.5) * 2.0 * uTilt);
            vec2 cl = vec2(v - tile - 0.5, uy) - off;
            vec2 q = R * cl;
            float d = sdBox(q, vec2(hs));
            edge = max(edge, stroke(d, lw, aa));
            haloD = min(haloD, max(abs(d) - lw, 0.0));
            if (hB.x < 0.7) {
                float dg = sdBox(R * (cl - vec2(0.0, uGhostOff)), vec2(hs * 1.02));
                ghost = max(ghost, stroke(dg, 0.5 * aa, aa));
            }
            float ins = 1.0 - smoothstep(-aa, aa, d);
            if (ins > 0.0 && hB.y > best) {
                best = hB.y;
                bIn = ins;
                bhs = hs;
                bq = q;
                bid = vec2(tid, rid);
            }
        }
    }

    // Duplicate outlines pushed outward (layered look), then tile bodies cover what is behind them.
    col = mix(col, uGhost, ghost * uGhostAlpha * tileVis);
    col = mix(col, uBg, bIn * uFill * tileVis);

    // Nested sub-squares in the tile that owns this pixel.
    if (bIn > 0.0 && s > 3.0) {
        vec2 tq = (bq / (2.0 * bhs) + 0.5 - 0.05) / 0.9;
        float G = max(uSubGrid, 1.0);
        float span = 2.0 * bhs * 0.9;
        float subPx = s * span / G;
        float f1 = smoothstep(3.0, 8.0, subPx);
        float wPx = 0.5 * max(1.0, s * 0.0045);
        vec2 seed = vec2(bid.x * 7.0 + 1.3, bid.y * 13.0 + 5.1);

        float a1 = aa * G / span;
        float l1 = subSquares(tq, G, seed, 0.8, 0.28, 0.42, 0.14, wPx * a1, a1);

        float G2 = max(G - 1.0, 1.0);
        float a2 = aa * G2 / span;
        float l2 = subSquares(tq + 0.5 / G2, G2, seed + vec2(41.0, 17.0), 0.5, 0.24, 0.38, 0.14, wPx * a2, a2);

        float G3 = G * 3.0;
        float a3 = aa * G3 / span;
        float f3 = smoothstep(3.0, 8.0, subPx / 3.0) * uFine;
        float l3 = subSquares(tq, G3, seed + vec2(83.0, 29.0), 0.2, 0.28, 0.42, 0.2, 0.5 * a3, a3);

        float sa = max(max(l1, l2 * 0.85), l3 * 0.55 * f3) * f1 + (1.0 - f1) * 0.22;
        col = mix(col, subCol, clamp(sa * uSubAlpha * bIn * tileVis, 0.0, 1.0));
    }

    // Crisp outlines with a slight halo.
    float halo = exp(-haloD * s / max(uHaloPx, 0.1));
    col += uHaloCol * halo * uHaloAlpha * tileVis * (1.0 - edge) * 0.6;
    col = mix(col, lineCol, edge * uLineAlpha * tileVis);

    // Cells too small to draw become a bright mesh haze.
    col += hotLine * 0.35 * (1.0 - tileVis);

    // Vanishing-point glow (additive, pulsed).
    float gc = max(uCore, 1e-4);
    vec3 g = uAccent * exp(-pow(rh / gc, 2.0))
           + uGlowMid * 0.7 * exp(-pow(rh / (gc * 2.7), 2.0))
           + uGlowDeep * 0.45 * exp(-pow(rh / (gc * 7.5), 2.0));
    col += g * uGlow;
    col = min(col, vec3(0.97));

    // Vignette and grain overlays.
    vec2 uv = frag / uRes;
    vec2 vq = (uv - 0.5) * vec2(uRes.x / H, 1.0);
    col *= 1.0 - uVignette * smoothstep(0.3, 0.95, length(vq));
    col += (h4(frag + vec2(mod(floor(uTime * 24.0), 64.0) * 37.0, 0.0)).x - 0.5) * uGrain * 0.12;

    outColor = vec4(max(col, 0.0), 1.0);
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

export default function EndlessTunnelSquare(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#05070B", baseColor = "#2CFF00", accentColor = "#EAF4FF", speed = 50, scale = 150, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("EndlessTunnelSquare shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("EndlessTunnelSquare link:", gl.getProgramInfoLog(prog))
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
            // Raw 0..1: the FRAG scales it by the top-level `hover` row (RULES.md).
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
