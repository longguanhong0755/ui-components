"use client"

/**
 * RecreateReferenceExactly — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
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
    centerX: 50,
    centerY: 50,
    hole: 2,
    reach: 200,
    curl: 300,
    warp: 66,
    wave: 105,
    spin: 100,
    drift: 100,
    gap: 100,
    fineLines: 100,
    taper: 100,
    roughness: 100,
    dryScale: 100,
    inkOpacity: 100,
    seed: 0,
    grain: 0,
    vignette: 0,
    hover: 50,
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
    strands?: number
    twist?: number
    dryBrush?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

function clampNum(v: unknown, d: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, num(v, d)))
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: Props): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    gl.uniform4f(
        u("uA"),
        Math.round(clampNum(p.strands, 22, 6, 60)),
        clampNum(p.twist, 100, 0, 200) / 100,
        clampNum(p.dryBrush, 60, 0, 100) / 100,
        clampNum(adv.hole, 13, 2, 40) / 100
    )
    gl.uniform4f(
        u("uB"),
        clampNum(adv.centerX, 50, 0, 100) / 100,
        clampNum(adv.centerY, 54, 0, 100) / 100,
        clampNum(adv.reach, 100, 20, 200) / 100,
        clampNum(adv.curl, 100, 0, 300) / 100
    )
    gl.uniform4f(
        u("uC"),
        clampNum(adv.warp, 100, 0, 300) / 100,
        clampNum(adv.wave, 100, 0, 300) / 100,
        clampNum(adv.gap, 100, 0, 300) / 100,
        clampNum(adv.fineLines, 100, 0, 300) / 100
    )
    gl.uniform4f(
        u("uD"),
        clampNum(adv.taper, 100, 0, 300) / 100,
        clampNum(adv.roughness, 100, 0, 300) / 100,
        0,
        clampNum(adv.inkOpacity, 100, 0, 100) / 100
    )
    gl.uniform4f(
        u("uE"),
        Math.round(clampNum(adv.seed, 0, 0, 100)),
        clampNum(adv.grain, 8, 0, 100) / 100,
        clampNum(adv.vignette, 0, 0, 100) / 100,
        clampNum(adv.hover, 50, 0, 100) / 50
    )
    // Streak frequency per strand must be a whole number so the texture wraps round the vortex.
    const kf = Math.max(2, Math.round((9 * clampNum(adv.dryScale, 100, 30, 300)) / 100))
    gl.uniform4f(u("uF"), clampNum(adv.spin, 100, 0, 400) / 100, clampNum(adv.drift, 100, 0, 400) / 100, kf, 0)
}

/* Sumi-ink vortex: broad brushed arms spiral out from a clean paper disc, split by thin white
   lines, drying into bristle streaks and ending in flame-like tips. The whirl turns slowly and
   draws inward while the arms undulate; the pointer stirs the ink around it. */
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
uniform vec4 uA;
uniform vec4 uB;
uniform vec4 uC;
uniform vec4 uD;
uniform vec4 uE;
uniform vec4 uF;
out vec4 outColor;
const float TAU = 6.28318530718;
float h11(float n) { return fract(sin(n * 127.1 + 0.37) * 43758.5453); }
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
// Value noise that repeats every 'per' cells in x (so it wraps round the vortex seamlessly).
float pnoise(vec2 p, float per) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float x0 = mod(i.x, per), x1 = mod(i.x + 1.0, per);
    return mix(mix(h21(vec2(x0, i.y)), h21(vec2(x1, i.y)), f.x),
               mix(h21(vec2(x0, i.y + 1.0)), h21(vec2(x1, i.y + 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.7; a *= 0.5; }
    return s / 0.875;
}
void main() {
    float t = uTime;
    float N = max(uA.x, 3.0);
    float twist = uA.y, dry = uA.z, hole = max(uA.w, 0.01);
    float reach = max(uB.z, 0.05), curl = uB.w;
    float warp = uC.x, wave = uC.y, gapK = uC.z, fine = uC.w;
    float taper = uD.x, rough = uD.y, inkK = uD.w;
    float seed = uE.x, grain = uE.y, vig = uE.z, hov = uE.w * uHover;
    float spin = uF.x, drift = uF.y, kf = max(uF.z, 1.0);
    float sc = max(uScale, 0.05);

    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 c = uB.xy * uRes;
    // Normalised to half the canvas width: at Scale 100 the unit circle touches the left and
    // right edges, so the arms (reach ≥ 1.1 at the default Reach) always run past the full width.
    float halfW = max(uRes.x * 0.5, 1.0);
    vec2 p = (gl_FragCoord.xy - c) / halfW / sc;
    vec2 m = (uMouse * uRes - c) / halfW / sc;

    // Pointer: stir the ink in a soft whirl around it.
    vec2 d = p - m;
    float fall = exp(-dot(d, d) * sc * sc * 14.0);
    float stir = hov * fall * (0.7 + 0.2 * sin(t * 1.1));
    float cs = cos(stir), sn = sin(stir);
    p = m + mat2(cs, sn, -sn, cs) * d;

    float r = max(length(p), 1e-4);
    float a = atan(p.y, p.x);
    float a2 = atan(-p.y, -p.x);
    float tt = t * drift;
    float outer = smoothstep(hole, hole + 0.4, r);
    float rc = max(r, hole * 0.85);

    // Bends whose angular slope stays small, so arms never fold into closed blobs.
    float bend = 0.18 * sin(r * 6.5 + 2.0 * a + tt * 0.31 + seed)
               + 0.08 * sin(r * 12.0 - 3.0 * a - tt * 0.43 + 1.7 * seed);
    float w1 = fbm(p * 2.2 + vec2(0.11, -0.07) * tt + seed * 0.37) - 0.5;

    // Spiral coordinate: wraps round the disc, opens into sweeping arms further out.
    float swirl = t * 0.05 * spin + 0.7 * twist * log(rc) - 1.2 * curl * hole / rc
        + warp * (bend + w1 * 0.3) * outer
        + wave * 0.05 * outer * sin(r * 9.0 - t * 0.7 + 3.0 * a);
    float v = (a + swirl) / TAU * N;
    float aa = min(fwidth(v), fwidth((a2 + swirl) / TAU * N)) * 0.75 + 1e-4;

    float id = mod(floor(v), N);
    float f = fract(v);
    float h1 = h11(id + seed * 7.13 + 0.5);
    float h2 = h11(id * 1.37 + seed * 3.1 + 11.0);
    float h3 = h11(id * 2.11 + seed * 5.7 + 23.0);
    float h4 = h11(id * 0.73 + seed * 1.9 + 37.0);

    float jit = rough * 0.05 * (vnoise(p * 70.0 + seed) - 0.5) * (0.4 + outer);

    // Ribbon extent: starts at the disc, ends in a tapering brush tip.
    float rs = hole * (1.0 + 0.25 * h2 * h2) + jit * 0.08;
    float re = reach * (0.55 + 0.7 * h3) * (1.0 + 0.15 * sin(a + 0.3)) * (1.0 + 0.05 * sin(t * 0.4 + h4 * TAU));
    float tipLen = max(taper * (0.12 + 0.28 * h4) * re, 1e-3);
    float tipK = clamp((re - r) / tipLen, 0.0, 1.0);
    float startK = clamp((r - rs) / max(0.06 * taper, 1e-3), 0.0, 1.0);
    float gap = gapK * (0.03 + 0.06 * h1) * (0.5 + vnoise(vec2(r * 4.0 + h2 * 20.0, id * 3.1 + 0.5))) * mix(0.45, 1.0, outer);
    float hw = max(0.5 - gap, 0.0) * pow(tipK, 0.7) * mix(0.55, 1.0, startK);
    float cen = 0.5 + (h1 - 0.5) * 0.5 * (1.0 - tipK);
    float dist = abs(f - cen) + jit;
    float ink = smoothstep(hw + aa, hw - aa, dist);
    // Clean paper disc in the middle (no stripes converging into it).
    ink *= smoothstep(rs, rs + 0.006 + 0.01 * taper, r);

    // Thin white lines that split an arm into strands for part of its length.
    float s1 = 0.5 + (h2 - 0.5) * 0.55;
    float s2 = 0.5 + (h3 - 0.5) * 0.75;
    float s3 = 0.5 + (h1 - 0.5) * 0.85;
    float m1 = smoothstep(0.42, 0.58, vnoise(vec2(r * 3.0 + h3 * 13.0, id * 1.7)));
    float m2 = smoothstep(0.45, 0.6, vnoise(vec2(r * 2.3 + h1 * 17.0, id * 2.3 + 40.0)));
    float m3 = smoothstep(0.5, 0.65, vnoise(vec2(r * 3.7 + h4 * 11.0, id * 2.9 + 80.0)));
    float fo = mix(0.5, 1.0, outer);
    float gw1 = fine * 0.028 * (0.5 + h4) * fo;
    float gw2 = fine * 0.02 * fo;
    float gw3 = fine * 0.016 * fo;
    ink *= 1.0 - m1 * smoothstep(gw1 + aa, gw1 - aa, abs(f - s1 + jit * 0.5));
    ink *= 1.0 - m2 * smoothstep(gw2 + aa, gw2 - aa, abs(f - s2 + jit * 0.5));
    ink *= 1.0 - m3 * smoothstep(gw3 + aa, gw3 - aa, abs(f - s3 + jit * 0.5));

    // Dry brush: bristle streaks along the stroke, in patches, more toward the tips and edges.
    float sa = pnoise(vec2(v * kf, r * 5.0), N * kf);
    float sb = pnoise(vec2(v * kf * 2.0, r * 11.0 + 3.0), N * kf * 2.0);
    float sp = vnoise(p * 420.0 + seed);
    float along = clamp((r - rs) / max(re - rs, 1e-3), 0.0, 1.0);
    float dryPatch = smoothstep(0.35, 0.75, vnoise(vec2(r * 4.0 + h1 * 9.0, id * 1.3 + 5.0)));
    float dryAmt = dry * (0.3 + 0.95 * dryPatch) * (0.35 + 0.65 * smoothstep(0.0, 0.7, along)) * outer
        + dry * 0.35 * smoothstep(0.55, 1.0, dist / max(hw, 1e-3));
    dryAmt *= 1.0 - 0.5 * hov * fall;
    dryAmt = clamp(dryAmt, 0.0, 0.9);
    float tex = sa * 0.55 + sb * 0.25 + sp * 0.3;
    float show = smoothstep(1.05 - dryAmt, 1.17 - dryAmt, tex);

    vec3 paper = uBg * (0.975 + 0.05 * vnoise(p * 2.5 + 3.0));
    vec3 inkCol = mix(uBase * (0.9 + 0.2 * vnoise(p * 25.0)), uAccent, show * 0.92);
    vec3 col = mix(paper, inkCol, clamp(ink * inkK, 0.0, 1.0));

    float gr = h21(gl_FragCoord.xy + fract(t * 7.0) * vec2(113.0, 71.0)) - 0.5;
    col += gr * grain * 0.16;
    vec2 vq = (uv - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0);
    col *= 1.0 - vig * 0.85 * smoothstep(0.3, 1.0, length(vq));
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

export default function RecreateReferenceExactly(props: Props) {
    props = withMovedControls(props)
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#A87CFF", accentColor = "#FFEECA", speed = 100, scale = 10, style } = props
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("RecreateReferenceExactly shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("RecreateReferenceExactly link:", gl.getProgramInfoLog(prog))
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
        <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}
