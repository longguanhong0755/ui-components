"use client"

/**
 * LagoonComb — a spiral tunnel of glowing hexagon outlines streaming out of a
 * black core, after a single still (formerly `SingleStillTunnel`).
 *
 * The lattice is conformal (log-polar), so every hexagon keeps its shape at any
 * distance. Its spiral is in the *sizes*: a log-spiral arm where the hexagons
 * are large and packed winds out of the core, and between its turns they shrink
 * to dots. Measured off the still: ~30 hexagons per ring at the core and ~50 at the rim (35 is the seamless lattice's compromise), the arm turning ~70°
 * clockwise each time the radius doubles, pointing down-left (239°) a quarter
 * frame-height out. Each hexagon carries its size as it flies out, so the arm
 * itself flows and turns.
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
    perRing: 45,
    cycleMs: 4000,
    hexSize: 73,
    arms: 4,
    armWind: -70,
    armAngle: 239,
    dotSize: 10,
    glowPx: 3,
    glowAmount: 20,
    core: 2,
    deepColor: "#161F48",
    focusX: 50,
    focusY: 50,
    tilt: 15,
    rotate: 0,
    brightness: 100,
    reverse: false,
    hoverBoost: 15,
    hoverShift: 0,
    hoverRadius: 22,
    hoverWarp: 300,
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
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"cycleMs":"advanced","perRing":"advanced","hexSize":"advanced","arms":"advanced","hover":"advanced","hoverShift":"advanced","hoverWarp":"advanced","deepColor":"advanced"}}
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
    twist?: number
    thickness?: number
    depth?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/** The six nearest-neighbour vectors of the unit hex lattice (e1 = (1,0), e2 = (0.5, √3/2)). */
const HEX_NEIGHBOURS: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0.5, 0.8660254],
    [-0.5, -0.8660254],
    [-0.5, 0.8660254],
    [0.5, -0.8660254],
]

function clampN(v: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, v))
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: LagoonCombProps): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1

    // Lattice wrap vector L = n1·e1 + n2·e2 (integers, so the log-polar tiling closes seamlessly round the circle).
    const sc = clampN(num(p.scale, 100), 10, 300) / 100
    const n1 = Math.round(clampN(num(adv.perRing, 35) / sc, 6, 160))
    const n2 = Math.round((n1 * clampN(num(p.twist, 30), 0, 100)) / 100 * 0.3)
    const lx = n1 + 0.5 * n2
    const ly = 0.8660254 * n2
    gl.uniform2f(u("uL"), lx, ly)

    // Outward in log r is (ly, -lx) in lattice space: step one neighbour that way per cycle (self-similar loop).
    let vx = 1
    let vy = 0
    let best = -Infinity
    for (const [x, y] of HEX_NEIGHBOURS) {
        const d = x * ly - y * lx
        if (d > best + 1e-6) {
            best = d
            vx = x
            vy = y
        }
    }
    const dir = adv.reverse === true ? -1 : 1
    gl.uniform2f(u("uV"), vx * dir, vy * dir)
    gl.uniform1f(u("uCycle"), clampN(num(adv.cycleMs, 4000), 500, 20000) / 1000)

    // Hex outline: outer inradius from hex size (pitch = 1), stroke as % of the hex's diameter.
    const ro = 0.5 * (clampN(num(adv.hexSize, 75), 20, 98) / 100)
    const s = (clampN(num(p.thickness, 8), 2, 30) / 100) * 2 * ro
    gl.uniform2f(u("uLine"), ro - s / 2, s / 2)
    gl.uniform2f(u("uGlow"), clampN(num(adv.glowPx, 3), 0, 20) * dpr, clampN(num(adv.glowAmount, 20), 0, 100) / 100)

    // Spiral arm: count, turn per unit of ln r (the control is ° per doubling), direction at a quarter-height out, dot size.
    gl.uniform4f(
        u("uArm"),
        Math.round(clampN(num(adv.arms, 1), 0, 6)),
        (clampN(num(adv.armWind, -70), -360, 360) * Math.PI) / 180 / Math.LN2,
        (num(adv.armAngle, 239) * Math.PI) / 180,
        clampN(num(adv.dotSize, 10), 0, 100) / 100
    )

    // Depth fog: black at the core radius, full colour by the depth radius (both in fractions of the height).
    const core = clampN(num(adv.core, 2), 0.2, 30) / 100
    const fadeEnd = Math.max(core + 0.02, 0.1 + 0.6 * (clampN(num(p.depth, 50), 0, 100) / 100))
    gl.uniform2f(u("uFade"), core, fadeEnd)
    const deep = parseColor(adv.deepColor, [0.086, 0.282, 0.271, 1])
    gl.uniform3f(u("uDeep"), deep[0], deep[1], deep[2])

    gl.uniform2f(u("uFocus"), clampN(num(adv.focusX, 50), 0, 100) / 100, 1 - clampN(num(adv.focusY, 48), 0, 100) / 100)
    gl.uniform1f(u("uTilt"), clampN(num(adv.tilt, 15), 0, 60) / 100)
    gl.uniform1f(u("uRot"), (num(adv.rotate, 0) * Math.PI) / 180)
    gl.uniform1f(u("uBright"), clampN(num(adv.brightness, 100), 0, 200) / 100)

    gl.uniform1f(u("uHoverK"), clampN(num(adv.hover, 50), 0, 100) / 50)
    gl.uniform1f(u("uHoverBoost"), clampN(num(adv.hoverBoost, 60), 0, 100) / 100)
    gl.uniform1f(u("uHoverShift"), clampN(num(adv.hoverShift, 6), 0, 30) / 100)
    gl.uniform1f(u("uHoverRadius"), clampN(num(adv.hoverRadius, 22), 5, 80) / 100)
    gl.uniform1f(u("uGrain"), clampN(num(adv.grain, 0), 0, 100) / 100)
    gl.uniform1f(u("uVignette"), clampN(num(adv.vignette, 0), 0, 100) / 100)
}

/* Conformal (log-polar) hex lattice: a spiral tunnel of hexagon outlines flying out of a black core. */
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
uniform vec2 uL;
uniform vec2 uV;
uniform float uCycle;
uniform vec2 uLine;
uniform vec4 uArm;
uniform vec2 uGlow;
uniform vec2 uFade;
uniform vec3 uDeep;
uniform vec2 uFocus;
uniform float uTilt;
uniform float uRot;
uniform float uBright;
uniform float uHoverK;
uniform float uHoverBoost;
uniform float uHoverShift;
uniform float uHoverRadius;
uniform float uPulse;
uniform float uGrain;
uniform float uVignette;
out vec4 outColor;
const float TAU = 6.2831853;
// Share of the arm cycle at which a hexagon reaches full size: in the still the large ones
// fill most of every ring and the dots a narrower band.
const float ARM_FULL = 0.8;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hexLocal(vec2 z) {
    const vec2 s = vec2(1.0, 1.7320508);
    vec2 a = mod(z, s) - 0.5 * s;
    vec2 b = mod(z - 0.5 * s, s) - 0.5 * s;
    return dot(a, a) < dot(b, b) ? a : b;
}
float hexDist(vec2 q) { q = abs(q); return max(q.x, dot(q, vec2(0.5, 0.8660254))); }
void main() {
    vec2 frag = gl_FragCoord.xy;
    float H = max(uRes.y, 1.0);

    // Vanishing point, pulled toward the pointer while it is over the stage.
    vec2 vp = uFocus * uRes;
    vec2 pull = (uMouse * uRes - vp) * 2.0 * uHoverShift;
    float maxPull = uHoverShift * uRes.x;
    float pl = length(pull);
    if (pl > maxPull) pull *= maxPull / max(pl, 1e-4);
    // Set on its own by Hover Movement, not scaled by Hover, so either can be off independently.
    vp += pull * uHover;

    // Tilted tunnel: ring of radius R is centred at (0, tilt*R), so the upper side spreads out.
    vec2 p = (frag - vp) / H;
    float a = uTilt;
    float R = (-a * p.y + sqrt(max(a * a * p.y * p.y + (1.0 - a * a) * dot(p, p), 0.0))) / max(1.0 - a * a, 1e-4);
    R = max(R, 1e-5);
    vec2 rq = vec2(p.x, p.y - a * R);
    if (dot(rq, rq) < 1e-12) rq = vec2(1e-6, 0.0);
    float th = atan(rq.y, rq.x) + uRot;

    // Log-polar → lattice: z = w * L / (TAU i). Going once round adds exactly L.
    vec2 w = vec2(log(R), th);
    vec2 wl = vec2(w.x * uL.x - w.y * uL.y, w.x * uL.y + w.y * uL.x);
    vec2 z = vec2(wl.y, -wl.x) / TAU;
    float cyc = uTime / max(uCycle, 1e-3);
    z -= fract(cyc) * uV;
    vec2 q = hexLocal(z);

    // Spiral arm (the still's flow): each hexagon's size comes from where its cell sat at
    // t = 0, so it keeps that size as it flies out and the arm streams with the lattice.
    // Cell id is unchanged across the fract() wrap above: the cell steps +V as cyc steps 1.
    // ponytail: uTime wraps at 3600 s, so the arm jumps once an hour; accumulate a phase in JS if that shows.

    // Pointer lens and press pulse, measured per cell so whole hexagons swell, never half of one.
    vec2 cc = (z - q + fract(cyc) * uV) * TAU;
    vec2 cwn = vec2(-cc.y * uL.x + cc.x * uL.y, cc.x * uL.x + cc.y * uL.y) / dot(uL, uL); // (ln R, θ) of the cell now
    float Rc = exp(cwn.x);
    float ang = cwn.y - uRot;
    vec2 cp = vp + (Rc * vec2(cos(ang), sin(ang)) + vec2(0.0, a * Rc)) * H;
    float dm = length(cp - uMouse * uRes) / H / max(uHoverRadius, 1e-3);
    float lens = exp(-dm * dm) * uHover * uHoverK;
    // A press sends a ring of light from the core out to the rim (~1.3 s), fading as it goes.
    float band = (cwn.x - (log(max(uFade.x, 1e-3)) + uPulse * 3.0)) / 0.35;
    float pulse = exp(-band * band) * exp(-uPulse * 1.1) * min(uHoverK, 1.0);
    float lit = clamp(lens + pulse, 0.0, 1.0);

    float sz = 1.0;
    if (uArm.x > 0.5) {
        vec2 cz = (z - q - floor(cyc) * uV) * TAU;
        vec2 cw = vec2(-cz.y * uL.x + cz.x * uL.y, cz.x * uL.x + cz.y * uL.y) / dot(uL, uL); // i·TAU·c / L = (ln R, θ)
        float ph = uArm.x * (cw.y - uArm.z - uArm.y * (cw.x + 1.3862944)); // 0 on the arm; ln 4 puts uArm.z a quarter-height out
        sz = mix(uArm.w, 1.0, smoothstep(0.0, ARM_FULL, 0.5 + 0.5 * cos(ph)));
    }
    // Dots under the lens (or the pulse) open into full hexagons, a touch past full size.
    sz = mix(sz, 1.18, lit);
    // Outer edge scales with the size; the stroke only with its square root, so dots stay rings.
    float hw = uLine.y * sqrt(sz);
    float cr = max((uLine.x + uLine.y) * sz - hw, 0.0);

    // Hexagon outline SDF, antialiased with the analytic pixel footprint (no seam from atan).
    float e = abs(hexDist(q) - cr);
    float aaL = length(uL) / (TAU * R * H);
    float lineA = 1.0 - smoothstep(hw - 0.75 * aaL, hw + 0.75 * aaL, e);
    float cov = clamp(13.856 * cr * hw / 0.8660254, 0.0, 1.0);
    float m = smoothstep(0.08, 0.4, aaL);
    lineA = mix(lineA, cov, m);
    float glow = exp(-max(e - hw, 0.0) / max(uGlow.x * aaL, 1e-4)) * uGlow.y * (1.0 - m) * (1.0 + 2.5 * lit);

    // Colour by depth: deep teal at the core, base mid-way, accent on the near rings; fog to black at the core.
    float t = smoothstep(log(uFade.x), log(uFade.y), log(R));
    vec3 stroke = mix(uDeep, uBase, smoothstep(0.22, 0.45, t));
    stroke = mix(stroke, uAccent, smoothstep(0.4, 0.85, t));
    float fog = smoothstep(0.0, 0.12, t); // the still is black to ~2% of the height, then lit almost at once
    vec3 sc = mix(stroke, uAccent, 0.6 * lit) * uBright * (1.0 + uHoverBoost * lit);

    vec3 col = mix(uBg, sc, clamp(lineA * fog, 0.0, 1.0));
    col += sc * glow * fog * (1.0 - lineA);

    vec2 uv = frag / uRes;
    vec2 vq = (uv - 0.5) * vec2(uRes.x / H, 1.0);
    col *= 1.0 - uVignette * smoothstep(0.35, 1.0, length(vq) * 1.25);
    col += (h21(frag + fract(uTime * 7.31) * 517.0) - 0.5) * uGrain * 0.22;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

// ══ /EFFECT ═════════════════════════════════════════════════════════════════

export interface LagoonCombProps extends EffectProps {
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

export default function LagoonComb(props: LagoonCombProps) {
    props = withMovedControls(props)
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#1F206F", accentColor = "#3356E6", speed = 200, scale = 98, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("LagoonComb shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("LagoonComb link:", gl.getProgramInfoLog(prog))
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
        // Pointer as a share of the box as displayed (not offsetX / layout px), so the
        // pull lands under the cursor at any canvas zoom. The rect is read once per
        // frame, only when the pointer has moved.
        let cx = 0
        let cy = 0
        let moved = false
        const onMove = (e: PointerEvent) => {
            cx = e.clientX
            cy = e.clientY
            moved = true
            over = 1
        }
        const onLeave = () => {
            over = 0
        }
        // Seconds since the last press; drives the pulse ring (large = no pulse).
        let pressT = 99
        const onDown = (e: PointerEvent) => {
            onMove(e)
            pressT = 0
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)

        let clock = 0
        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            if (moved) {
                moved = false
                const r = root.getBoundingClientRect()
                if (r.width > 0 && r.height > 0) {
                    tx = (cx - r.left) / r.width
                    ty = 1 - (cy - r.top) / r.height
                }
            }
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const k = 1 - Math.exp(-dt * 6)
            mx += (tx - mx) * k
            my += (ty - my) * k
            hov += (over - hov) * k
            pressT = Math.min(99, pressT + dt)
            // Hover Speed: the tunnel streams faster while the pointer is over it, eased in and out with hov.
            // Its own control, not scaled by Hover, so the value is exactly "% faster".
            const warp = 1 + (clampN(num(adv.hoverWarp, 160), 0, 300) / 100) * hov
            clock = (clock + dt * (Math.max(0, Math.min(200, num(p.speed, 50))) / 50) * warp * (reduced ? 0.25 : 1)) % 3600
            // Fallbacks are the control defaults, so <LagoonComb /> with no props is the panel's look.
            const bg = parseColor(p.background, [0, 0, 0, 1])
            const base = parseColor(p.baseColor, [0.122, 0.435, 0.424, 1])
            const acc = parseColor(p.accentColor, [0.2, 0.902, 0.878, 1])
            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.uniform2f(u("uRes"), canvas.width, canvas.height)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform2f(u("uMouse"), mx, my)
            // Raw 0..1: the FRAG scales it by the Advanced `hover` row (RULES.md).
            gl.uniform1f(u("uHover"), hov)
            gl.uniform1f(u("uPulse"), pressT)
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
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
        }
    }, [])

    return (
        <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}

// Control order arranged in the builder.
