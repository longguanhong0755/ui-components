"use client"

/**
 * MiuraFold — the page collapses along a Miura-ori crease pattern and
 * unfolds as the next page.
 *
 * Page A is a Miura-ori sheet: a grid of identical parallelograms (sector
 * angle γ = 65°) folded with the exact rigid-origami kinematics of Schenk &
 * Guest. One fold angle θ drives the whole sheet: the b-edges zigzag in
 * height (rise H, run L) and the a-edges zigzag in plan (offset V, pitch S),
 * so every face stays the same rigid parallelogram from flat (θ = 0) to the
 * compact stack (θ → 90°), and the mountain/valley assignment is the real
 * one — each zigzag crease line all-mountain or all-valley, alternating line
 * to line, the straight lines alternating M/V along their length.
 *
 * 0 → ½: Page A folds to a compact stack. At the midpoint the stack flips
 * 180° about the vertical axis so the other side of the sheet — Page B —
 * faces the camera. ½ → 1: it unfolds flat as Page B, filling the frame.
 * Faces are Lambert-lit with a specular and rim term (faded out when flat, so
 * the resting page is its exact raster), and a soft shadow darkens the
 * background under the stack.
 *
 * Trigger: click → fold to Page B → hold → fold back. Loops on the Framer
 * canvas. In code, pass `play` (true shows Page B) and `onComplete`.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
import { useEffect, useRef, type CSSProperties } from "react"

// Framer's editing canvas does not exist outside Framer: this build always
// renders in a real browser. Same values the live preview runs under.
const RenderTarget = {
    current: () => "preview",
    hasRestrictions: () => false,
    canvas: "canvas",
    export: "export",
    preview: "preview",
    thumbnail: "thumbnail",
}

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

// ── math ──
function clamp01(x: number): number {
    return x < 0 ? 0 : x > 1 ? 1 : x
}

function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

/** Miura sector angle γ (acute parallelogram angle). */
const MIURA_GAMMA = (65 * Math.PI) / 180

/**
 * Schenk & Guest unit-cell dimensions for a Miura-ori with parallelogram
 * sides a (the edge that zigzags in height) and b (the edge that zigzags in
 * plan), sector angle γ, fold angle θ ∈ [0, π/2).
 */
function miuraCell(a: number, b: number, gamma: number, theta: number) {
    const st = Math.sin(theta), ct = Math.cos(theta)
    const sg = Math.sin(gamma), tg = Math.tan(gamma)
    const k = Math.sqrt(1 + ct * ct * tg * tg)
    return {
        H: a * st * sg,
        S: (b * ct * tg) / k,
        L: a * Math.sqrt(Math.max(0, 1 - st * st * sg * sg)),
        V: b / k,
    }
}

/**
 * Vertex (i, j) of the folded sheet. i steps along the a-edges (corrugation
 * direction x, height alternates 0/H), j steps along the b-edges (plan offset
 * alternates 0/V). Every face is the parallelogram spanned by
 * (L, 0, ±H) and (±V, S, 0), whose lengths are a and b and whose angle is γ
 * for every θ — the sheet is rigid by construction.
 */
function miuraVertex(i: number, j: number, c: { H: number; S: number; L: number; V: number }): [number, number, number] {
    return [i * c.L + (j & 1 ? c.V : 0), j * c.S, i & 1 ? c.H : 0]
}

/**
 * Grid for a page of the given aspect (height 1): nx pleats across, ny rows
 * chosen so faces stay roughly equilateral in a and b. The flat sheet's
 * zigzag side edges overhang by b·cosγ; the page is the inner rectangle
 * x ∈ [b·cosγ, nx·a], y ∈ [0, 1], which is exactly aspect × 1.
 */
function miuraLayout(aspect: number, cells: number) {
    const nx = Math.max(2, Math.round(cells))
    const sg = Math.sin(MIURA_GAMMA)
    const ny = Math.max(2, Math.round(nx / (aspect * sg)))
    const b = 1 / (ny * sg)
    const a = (aspect + b * Math.cos(MIURA_GAMMA)) / nx
    return { nx, ny, a, b, x0: b * Math.cos(MIURA_GAMMA) }
}
// ── /math ──

const PLAY_S = 2.2
const RESTORE_S = 2
const THETA_MAX = (84 * Math.PI) / 180
const FOV = (30 * Math.PI) / 180
const FLOATS = 8 // pos3 normal3 uv2

interface PageProps {
    title?: string
    image?: { src?: string } | null
    fill?: string
    textColor?: string
}
interface Props {
    background?: string
    speed?: number
    hold?: number
    cells?: number
    interaction?: "autoplay" | "hover" | "click"
    font?: FramerFont
    pageA?: PageProps
    pageB?: PageProps
    play?: boolean
    onComplete?: () => void
    style?: CSSProperties
}

const PAGE_A: Required<Omit<PageProps, "image">> = { title: "Chapter One", fill: "#1F2A44", textColor: "#F4EFE6" }
const PAGE_B: Required<Omit<PageProps, "image">> = { title: "Chapter Two", fill: "#E9DCC8", textColor: "#1B1B1F" }
const DEFAULT_FONT: FramerFont = { fontFamily: "Inter", fontWeight: 700, fontSize: 64, lineHeight: 1.05 }

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

function drawPage(ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, page: Required<Omit<PageProps, "image">>, img: HTMLImageElement | null, font: FramerFont) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = cssRgba(parseColor(page.fill, [0.1, 0.1, 0.1, 1]))
    ctx.fillRect(0, 0, W, H)
    if (img && img.naturalWidth > 0) {
        const s = Math.max(W / img.naturalWidth, H / img.naturalHeight)
        const dw = img.naturalWidth * s
        const dh = img.naturalHeight * s
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
        const g = ctx.createLinearGradient(0, H * 0.45, 0, H)
        g.addColorStop(0, "rgba(0,0,0,0)")
        g.addColorStop(1, "rgba(0,0,0,0.45)")
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
    }
    const f = fontShorthand(font, 64, 700)
    const pad = Math.min(64, W * 0.06)
    ctx.font = f.shorthand
    ctx.fillStyle = cssRgba(parseColor(page.textColor, [1, 1, 1, 1]))
    ctx.textBaseline = "alphabetic"
    ctx.textAlign = "left"
    const lines = wrapLines((s) => ctx.measureText(s).width, page.title, W * 0.7)
    let y = H - pad - (lines.length - 1) * f.lineHeight
    for (const line of lines) {
        ctx.fillText(line, pad, y)
        y += f.lineHeight
    }
}

const VS = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNormal;
in vec2 aUV;
uniform mat4 uProj;
uniform float uCamZ;
out vec3 vN;
out vec2 vUV;
out vec3 vView;
void main() {
    vec3 p = vec3(aPos.xy, aPos.z - uCamZ);
    vN = aNormal;
    vUV = aUV;
    vView = -p;
    gl_Position = uProj * vec4(p, 1.0);
}
`

const FS = `#version 300 es
precision highp float;
in vec3 vN;
in vec2 vUV;
in vec3 vView;
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform int uMode;
uniform float uFold;
uniform float uShadow;
out vec4 o;
void main() {
    if (uMode == 0) {
        // Soft contact shadow on the background: radial falloff over the quad.
        float d = length(vUV * 2.0 - 1.0);
        o = vec4(0.0, 0.0, 0.0, uShadow * (1.0 - smoothstep(0.2, 1.0, d)));
        return;
    }
    // The page is the inner rectangle of the flat sheet; the zigzag overhang is trimmed.
    if (any(lessThan(vUV, vec2(0.0))) || any(greaterThan(vUV, vec2(1.0)))) discard;
    vec3 V = normalize(vView);
    vec3 N = normalize(vN);
    bool front = dot(N, V) >= 0.0;
    vec3 n = front ? N : -N;
    vec4 ca = texture(uTexA, vUV);
    vec4 cb = texture(uTexB, vec2(1.0 - vUV.x, vUV.y));
    vec4 base = front ? ca : cb;
    vec3 L = normalize(vec3(-0.45, 0.6, 0.66));
    float lam = max(dot(n, L), 0.0);
    float lit = 0.36 + 0.78 * lam;
    vec3 Hh = normalize(L + V);
    float spec = pow(max(dot(n, Hh), 0.0), 48.0) * 0.35;
    float rim = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0) * 0.45;
    vec3 col = base.rgb * mix(1.0, lit, uFold) + vec3(spec + rim) * uFold * base.a;
    o = vec4(col, base.a);
}
`

type Uni = "uProj" | "uCamZ" | "uTexA" | "uTexB" | "uMode" | "uFold" | "uShadow"
const UNIFORMS: readonly Uni[] = ["uProj", "uCamZ", "uTexA", "uTexB", "uMode", "uFold", "uShadow"]

export default function MiuraFold(props: Props) {
    // speed / hold / cells are read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#0E0E10", speed = 50, hold = 2, cells = 6, interaction = "autoplay", style } = props
    void [speed, hold, cells, interaction]
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const onCanvas = RenderTarget.current() === RenderTarget.canvas
        const reduced =
            typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        const gl = canvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: true })
        // No WebGL2: the same canvas still takes a 2D context and cross-fades the pages.
        const ctx2d = gl ? null : canvas.getContext("2d")

        let W = 0
        let H = 0
        let dpr = 1
        const resize = () => {
            W = root.offsetWidth
            H = root.offsetHeight
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        // Two page rasters, rebuilt only when their inputs change.
        const pages = [document.createElement("canvas"), document.createElement("canvas")]
        const keys = ["", ""]
        const dirty = [true, true]
        const srcs: (string | undefined)[] = [undefined, undefined]
        const imgs: (HTMLImageElement | null)[] = [null, null]
        let fontTick = 0
        const loadedFonts = new Set<string>()
        const ensurePages = () => {
            const p = propsRef.current
            const font = p.font || DEFAULT_FONT
            ;[p.pageA, p.pageB].forEach((pg, i) => {
                const page = { ...(i === 0 ? PAGE_A : PAGE_B), ...(pg || {}) }
                const src = pg?.image?.src
                if (src !== srcs[i]) {
                    srcs[i] = src
                    imgs[i] = null
                    loadImage(src).then((im) => {
                        if (srcs[i] === src) {
                            imgs[i] = im
                            keys[i] = ""
                        }
                    })
                }
                const key = JSON.stringify([page.title, page.fill, page.textColor, font, src, !!imgs[i], W, H, dpr, fontTick])
                if (key === keys[i]) return
                keys[i] = key
                dirty[i] = true
                pages[i].width = Math.max(1, Math.round(W * dpr))
                pages[i].height = Math.max(1, Math.round(H * dpr))
                drawPage(pages[i].getContext("2d")!, W, H, dpr, page, imgs[i], font)
            })
            const sh = fontShorthand(font, 64, 700).shorthand
            if (!loadedFonts.has(sh) && document.fonts?.load) {
                loadedFonts.add(sh)
                document.fonts.load(sh).then(() => fontTick++, () => {})
            }
        }

        // ---- GL setup (once)
        let prog: { program: WebGLProgram; u: Record<Uni, WebGLUniformLocation> } | null = null
        let vbo: WebGLBuffer | null = null
        let vao: WebGLVertexArrayObject | null = null
        const texs: (WebGLTexture | null)[] = [null, null]
        let verts = new Float32Array(0)
        if (gl) {
            try {
                prog = createProgram(gl, VS, FS, UNIFORMS)
            } catch {
                prog = null
            }
            if (prog) {
                vao = gl.createVertexArray()
                gl.bindVertexArray(vao)
                vbo = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
                const attr = (name: string, size: number, offset: number) => {
                    const loc = gl.getAttribLocation(prog!.program, name)
                    if (loc < 0) return
                    gl.enableVertexAttribArray(loc)
                    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, FLOATS * 4, offset * 4)
                }
                attr("aPos", 3, 0)
                attr("aNormal", 3, 3)
                attr("aUV", 2, 6)
                for (let i = 0; i < 2; i++) {
                    const t = gl.createTexture()
                    gl.bindTexture(gl.TEXTURE_2D, t)
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
                    texs[i] = t
                }
            }
        }

        const proj = new Float32Array(16)
        const setProj = (aspect: number, camZ: number) => {
            const f = 1 / Math.tan(FOV / 2)
            const near = 0.05
            const far = camZ + 4
            proj.fill(0)
            proj[0] = f / aspect
            proj[5] = f
            proj[10] = (far + near) / (near - far)
            proj[11] = -1
            proj[14] = (2 * far * near) / (near - far)
        }

        let clicked = false
        let hovering = false
        let state: TriggerState = TRIGGER_IDLE
        const onDown = () => {
            clicked = true
        }
        const onEnter = () => {
            hovering = true
        }
        const onLeave = () => {
            hovering = false
        }
        canvas.addEventListener("pointerdown", onDown)
        canvas.addEventListener("pointerenter", onEnter)
        canvas.addEventListener("pointerleave", onLeave)

        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            ensurePages()
            const p = propsRef.current
            const mode = p.interaction === "hover" || p.interaction === "click" ? p.interaction : "autoplay"
            const effectivePlay = p.play !== undefined ? p.play : mode === "hover" ? hovering : undefined
            const r = stepTrigger(state, {
                dt,
                animDt: dt * (Math.max(0, Math.min(100, num(p.speed, 50))) / 50),
                playDur: reduced ? 0.2 : PLAY_S,
                restoreDur: reduced ? 0.2 : RESTORE_S,
                holdS: Math.max(0, Math.min(10, num(p.hold, 2))),
                play: effectivePlay,
                clicked: mode === "click" ? clicked : false,
                onCanvas: mode === "autoplay" ? true : onCanvas,
            })
            clicked = false
            state = r.s
            if (r.e.completed) p.onComplete?.()

            const turn = state.phase === "playing" ? state.t : state.phase === "held" ? 1 : state.phase === "restoring" ? 1 - state.t : 0
            if (W < 1 || H < 1) return

            // Timeline: fold 0→0.44, compact plateau, flip 0.36→0.64, unfold 0.56→1.
            const fold = easeInOutCubic(clamp01(turn < 0.5 ? turn / 0.44 : (1 - turn) / 0.44))
            const flip = Math.PI * easeInOutCubic(clamp01((turn - 0.36) / 0.28))

            if (!gl || !prog) {
                if (!ctx2d) return
                ctx2d.setTransform(1, 0, 0, 1, 0, 0)
                ctx2d.clearRect(0, 0, canvas.width, canvas.height)
                const mix = clamp01((turn - 0.4) / 0.2)
                ctx2d.globalAlpha = 1 - mix
                ctx2d.drawImage(pages[0], 0, 0)
                ctx2d.globalAlpha = mix
                ctx2d.drawImage(pages[1], 0, 0)
                ctx2d.globalAlpha = 1
                return
            }

            // ---- geometry: exact Miura-ori at θ, centred, then scale/tilt/flip on the CPU.
            const aspect = W / H
            const lay = miuraLayout(aspect, num(p.cells, 6))
            const { nx, ny, a, b, x0 } = lay
            const cell = miuraCell(a, b, MIURA_GAMMA, fold * THETA_MAX)
            const flat = miuraCell(a, b, MIURA_GAMMA, 0)
            const cols = nx + 1
            const rows = ny + 1
            const P = new Float32Array(cols * rows * 3)
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity
            for (let j = 0; j < rows; j++)
                for (let i = 0; i < cols; i++) {
                    const v = miuraVertex(i, j, cell)
                    const k = (j * cols + i) * 3
                    P[k] = v[0]; P[k + 1] = v[1]; P[k + 2] = v[2]
                    if (v[0] < minX) minX = v[0]
                    if (v[0] > maxX) maxX = v[0]
                    if (v[1] < minY) minY = v[1]
                    if (v[1] > maxY) maxY = v[1]
                    if (v[2] < minZ) minZ = v[2]
                    if (v[2] > maxZ) maxZ = v[2]
                }
            const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2
            const scale = 1 - 0.18 * fold
            const tilt = -0.38 * fold
            const yaw = flip + 0.22 * fold * Math.cos(flip)
            const ctl = Math.cos(tilt), stl = Math.sin(tilt)
            const cyw = Math.cos(yaw), syw = Math.sin(yaw)
            const xf = (x: number, y: number, z: number, out: number[]) => {
                const y1 = y * ctl - z * stl
                const z1 = y * stl + z * ctl
                out[0] = x * cyw + z1 * syw
                out[1] = y1
                out[2] = -x * syw + z1 * cyw
            }
            const o = [0, 0, 0]
            for (let k = 0; k < P.length; k += 3) {
                xf((P[k] - cx) * scale, (P[k + 1] - cy) * scale, (P[k + 2] - cz) * scale, o)
                P[k] = o[0]; P[k + 1] = o[1]; P[k + 2] = o[2]
            }

            const faceCount = nx * ny
            const need = (faceCount + 1) * 6 * FLOATS
            gl.bindVertexArray(vao)
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
            if (verts.length !== need) {
                verts = new Float32Array(need)
                gl.bufferData(gl.ARRAY_BUFFER, verts.byteLength, gl.DYNAMIC_DRAW)
            }

            // Shadow quad (first 6 vertices): behind the sheet, sized to its world footprint.
            let sx0 = Infinity, sx1 = -Infinity, sy0 = Infinity, sy1 = -Infinity, sz0 = Infinity
            for (let k = 0; k < P.length; k += 3) {
                if (P[k] < sx0) sx0 = P[k]
                if (P[k] > sx1) sx1 = P[k]
                if (P[k + 1] < sy0) sy0 = P[k + 1]
                if (P[k + 1] > sy1) sy1 = P[k + 1]
                if (P[k + 2] < sz0) sz0 = P[k + 2]
            }
            const shx = (sx0 + sx1) / 2 + 0.03 * fold, shy = (sy0 + sy1) / 2 - 0.05 * fold
            const hw = (sx1 - sx0) * 0.75 + 0.08, hh = (sy1 - sy0) * 0.75 + 0.08
            const sz = sz0 - 0.08
            const quad: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]
            let w = 0
            for (const [u, v] of quad) {
                verts[w++] = shx + (u * 2 - 1) * hw
                verts[w++] = shy + (v * 2 - 1) * hh
                verts[w++] = sz
                verts[w++] = 0; verts[w++] = 0; verts[w++] = 1
                verts[w++] = u; verts[w++] = v
            }

            // Sheet faces: 2 triangles each, flat normal of the rigid parallelogram, UVs from the flat layout.
            const corner = [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]
            for (let j = 0; j < ny; j++)
                for (let i = 0; i < nx; i++) {
                    const k00 = (j * cols + i) * 3
                    const k10 = (j * cols + i + 1) * 3
                    const k01 = ((j + 1) * cols + i) * 3
                    const ux = P[k10] - P[k00], uy = P[k10 + 1] - P[k00 + 1], uz = P[k10 + 2] - P[k00 + 2]
                    const vx = P[k01] - P[k00], vy = P[k01 + 1] - P[k00 + 1], vz = P[k01 + 2] - P[k00 + 2]
                    let nxv = uy * vz - uz * vy, nyv = uz * vx - ux * vz, nzv = ux * vy - uy * vx
                    const nl = Math.hypot(nxv, nyv, nzv) || 1
                    nxv /= nl; nyv /= nl; nzv /= nl
                    for (const [di, dj] of corner) {
                        const kk = ((j + dj) * cols + i + di) * 3
                        const fv = miuraVertex(i + di, j + dj, flat)
                        verts[w++] = P[kk]; verts[w++] = P[kk + 1]; verts[w++] = P[kk + 2]
                        verts[w++] = nxv; verts[w++] = nyv; verts[w++] = nzv
                        verts[w++] = (fv[0] - x0) / aspect
                        verts[w++] = 1 - fv[1]
                    }
                }
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts)

            const camZ = 0.5 / Math.tan(FOV / 2)
            setProj(aspect, camZ)
            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.depthMask(true)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.useProgram(prog.program)
            for (let i = 0; i < 2; i++) {
                gl.activeTexture(gl.TEXTURE0 + i)
                gl.bindTexture(gl.TEXTURE_2D, texs[i])
                if (dirty[i]) {
                    dirty[i] = false
                    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pages[i])
                }
            }
            gl.uniform1i(prog.u.uTexA, 0)
            gl.uniform1i(prog.u.uTexB, 1)
            gl.uniformMatrix4fv(prog.u.uProj, false, proj)
            gl.uniform1f(prog.u.uCamZ, camZ)
            gl.uniform1f(prog.u.uFold, fold)
            gl.uniform1f(prog.u.uShadow, 0.5 * fold)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
            gl.disable(gl.CULL_FACE)

            if (fold > 0.001) {
                gl.disable(gl.DEPTH_TEST)
                gl.depthMask(false)
                gl.uniform1i(prog.u.uMode, 0)
                gl.drawArrays(gl.TRIANGLES, 0, 6)
                gl.depthMask(true)
            }
            gl.enable(gl.DEPTH_TEST)
            gl.uniform1i(prog.u.uMode, 1)
            gl.drawArrays(gl.TRIANGLES, 6, faceCount * 6)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointerdown", onDown)
            canvas.removeEventListener("pointerenter", onEnter)
            canvas.removeEventListener("pointerleave", onLeave)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                ...style,
            }}
        >
            {/* Size floor as in-flow content, not min-width/min-height: a CSS min clamps the
                frame, so an instance set smaller than 1200x800 overflowed it. This only sizes
                the root under Fit Content; any explicit frame clips it. */}
            <div aria-hidden style={{ width: 1200, height: 800, visibility: "hidden", pointerEvents: "none" }} />
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", cursor: "pointer" }}
            />
        </div>
    )
}
