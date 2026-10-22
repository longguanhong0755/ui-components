"use client"

/**
 * LapisCourse — a wall of small glass blocks, each turned a little on its own
 * axis, mirroring a slow sheet of ultramarine, cyan and amber light.
 *
 * Refined from the user's `WallSmallSlightly` (Background template), matched
 * against the supplied clip frame. Every property control and key is kept;
 * the EFFECT block is new. Each pixel ray-casts the real blocks that can reach
 * it (a turned block overlaps the next) and shades the face it hits as glazed
 * glass: a convex face with bevelled edges, Schlick Fresnel between a dark
 * tinted body and the reflected light field, caps lit from above, and
 * occlusion by depth into the wall.
 *
 * Built to hold frame rate on weak GPUs: the slow light field is drawn into a
 * quarter-resolution texture first, the wall pass tests 4 blocks per pixel,
 * the canvas is capped at MAX_PIXELS and drops resolution when frames slow
 * down, and nothing renders while the component is off screen.
 *
 * Measured off the reference: ~16 rows per frame height, cell aspect ~0.75,
 * no pure blacks anywhere (gaps are deep navy), blue pools mean ≈ #17366F,
 * ~8% of the frame cyan, ~3.5% amber.
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

/** Tuning values. Every default is the look; with `advanced` omitted nothing changes. */
const ADVANCED_DEFAULTS = {
    rows: 16,
    tileAspect: 75,
    gap: 4,
    rowJitter: 20,
    bodyColor: "#0E1442",
    bodyLight: 60,
    tilt: 35,
    reflect: 30,
    lightSize: 30,
    drift: 24,
    driftAngle: 155,
    evolve: 25,
    wobbleMin: 3200,
    wobbleMax: 6400,
    spotWidth: 45,
    spotHeight: 60,
    spotGain: 90,
    whiteness: 55,
    blueLevel: 30,
    cyanLevel: 55,
    amberLevel: 57,
    fullTile: 60,
    streak: 120,
    rim: 50,
    seed: 0,
    grain: 0,
    vignette: 25,
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
    /** How far each block sways on its own axis, which sends its reflections travelling. */
    shimmer?: number
    /** How much of the light field is amber. */
    warmth?: number
    warmColor?: string
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null, p: LapisCourseProps): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
    const warm = parseColor(p.warmColor, [1, 0.64, 0.23, 1])
    const body = parseColor(adv.bodyColor, [0.04, 0.1, 0.23, 1])
    gl.uniform3f(u("uWarm"), warm[0], warm[1], warm[2])
    gl.uniform3f(u("uBody"), body[0], body[1], body[2])
    gl.uniform1f(u("uWarmth"), clamp(num(p.warmth, 50), 0, 100) / 50)
    gl.uniform1f(u("uShimmer"), clamp(num(p.shimmer, 50), 0, 100) / 50)
    gl.uniform1f(u("uHoverAmt"), clamp(num(adv.hover, 50), 0, 100) / 50)
    gl.uniform4f(
        u("uGrid"),
        clamp(num(adv.rows, 16), 2, 80),
        clamp(num(adv.tileAspect, 75), 20, 200) / 100,
        clamp(num(adv.gap, 4), 0, 40) / 100,
        clamp(num(adv.rowJitter, 20), 0, 100) / 100
    )
    const lightSize = clamp(num(adv.lightSize, 30), 2, 200) / 100
    gl.uniform4f(
        u("uTiltP"),
        clamp(num(adv.tilt, 35), 0, 100) / 100,
        clamp(num(adv.reflect, 30), 0, 200) / 100,
        1 / Math.max(lightSize, 1e-3),
        clamp(num(adv.evolve, 25), 0, 300) / 100
    )
    // Angle in screen convention (y down): 155° = towards the down-left. GL is y-up.
    const a = (num(adv.driftAngle, 155) * Math.PI) / 180
    const sp = clamp(num(adv.drift, 24), 0, 200) / 1000
    const wMin = clamp(num(adv.wobbleMin, 3200), 50, 10000) / 1000
    const wMax = Math.max(wMin, clamp(num(adv.wobbleMax, 6400), 50, 10000) / 1000)
    gl.uniform4f(u("uDriftP"), Math.cos(a) * sp, -Math.sin(a) * sp, wMin, wMax)
    gl.uniform4f(
        u("uSpot"),
        clamp(num(adv.spotWidth, 45), 2, 150) / 100,
        clamp(num(adv.spotHeight, 60), 2, 150) / 100,
        clamp(num(adv.spotGain, 90), 0, 400) / 100,
        clamp(num(adv.whiteness, 55), 0, 100) / 100
    )
    gl.uniform4f(
        u("uLevels"),
        clamp(num(adv.blueLevel, 30), 0, 100) / 100,
        clamp(num(adv.cyanLevel, 55), 0, 100) / 100,
        clamp(num(adv.amberLevel, 57), 0, 100) / 100,
        clamp(num(adv.bodyLight, 60), 0, 200) / 100
    )
    gl.uniform4f(
        u("uExtras"),
        clamp(num(adv.fullTile, 60), 0, 100) / 100,
        clamp(num(adv.streak, 120), 0, 200) / 100,
        clamp(num(adv.rim, 50), 0, 200) / 100,
        clamp(num(adv.seed, 0), 0, 100)
    )
    gl.uniform2f(u("uPost"), clamp(num(adv.grain, 0), 0, 100) / 100, clamp(num(adv.vignette, 25), 0, 100) / 100)
}

/* The light field: blue pools, amber band and where the strip lights sit, all sliding across
   the wall as one slow sheet. It only depends on where on the wall a pixel is (the camera looks
   straight on, so that is the pixel itself) and on time, and it changes over several blocks — so
   it is drawn once per frame into a quarter-resolution texture and the wall pass reads it
   back, instead of every pixel evaluating ~100 noise hashes.
   r = blue/cyan field, g = amber field, b = strip-light offset, a = strip-light height. */
const FIELD = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uFieldRes;
uniform float uTime;
uniform float uScale;
uniform vec4 uTiltP;
uniform vec4 uDriftP;
out vec4 outColor;

float h31(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
}
float vn3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = h31(i), b = h31(i + vec3(1, 0, 0)), c = h31(i + vec3(0, 1, 0)), d = h31(i + vec3(1, 1, 0));
    float e = h31(i + vec3(0, 0, 1)), g = h31(i + vec3(1, 0, 1)), k = h31(i + vec3(0, 1, 1)), l = h31(i + vec3(1, 1, 1));
    return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(k, l, f.x), f.y), f.z);
}
float fbm3(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { s += a * vn3(p); p = p * 2.03 + vec3(5.1, 1.7, 3.3); a *= 0.5; }
    return s / 0.875;
}

void main() {
    // this texel's centre in wall-canvas pixels, then the same frame -> world map as the wall
    vec2 frag = gl_FragCoord.xy / max(uFieldRes, vec2(1.0)) * uRes;
    float ry = max(uRes.y, 1.0);
    vec2 ctr = vec2(uRes.x / ry * 0.5, 0.5);
    vec2 w = (frag / ry - ctr) / max(uScale, 0.05) + ctr;
    float ev = uTime * uTiltP.w;
    vec2 q = (w - uDriftP.xy * uTime) * uTiltP.z;
    vec2 qf = q * vec2(1.0, 0.7);
    vec2 lq = q * 0.8;
    outColor = vec4(
        fbm3(vec3(qf, ev)),
        fbm3(vec3(qf * 0.9 + vec2(17.3, -9.1), ev * 1.1 + 31.0)),
        vn3(vec3(lq * 0.6, ev + 3.0)),
        vn3(vec3(lq + 5.2, ev + 9.0)));
}`

/* A wall of real glass blocks, ray-cast. Each cell holds a box turned on its vertical axis
   (Tilt) and tipped back a little at the top (LEAN), so a front face, one side face and a cap
   show. The pixel tests the blocks that can reach it — its own, and the nearer neighbour across
   and above/below, since a turned block is wider than its cell — and shades the nearest face: a
   convex face with bevelled edges, mixed by Fresnel between the dark glass body and the light
   field. A face's normal decides which strip light it mirrors and where on the face, so
   neighbours that face different ways show different lights, and a slow sway carries each
   reflection across its face. */
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
uniform vec3 uWarm;
uniform vec3 uBody;
uniform float uWarmth;
uniform float uShimmer;
uniform float uHoverAmt;
uniform vec4 uGrid;
uniform vec4 uTiltP;
uniform vec4 uDriftP;
uniform vec4 uSpot;
uniform vec4 uLevels;
uniform vec4 uExtras;
uniform vec2 uPost;
uniform sampler2D uField;
out vec4 outColor;

const float TAU = 6.2831853;
// The look, fixed in code:
// rad: blocks' tops tip toward the viewer, more near the top of the frame — the clip's camera
// sits low and sees the upper caps, barely the lower ones
const float LEAN_LOW = 0.0;
const float LEAN_HIGH = 0.13;
const float YAW_RANGE = 2.2;  // rad of turn at Tilt 100% (35% → about ±44°, as in the clip)
const float PITCH_RANGE = 0.2;// share of the turn spent nodding rather than turning
const float CURVE = 0.24;     // convexity of a face: a reflection travels across one face instead of filling it flat
const float BEVEL = 0.06;     // bevel width, share of the tile height
const float F0 = 0.4;         // glaze reflectance head-on; Schlick takes it to 1 at grazing
const float DEPTH = 0.95;     // block depth / block width
const float LIGHT_PITCH = 0.8;// spacing of the strip lights in reflection space; about one face's sweep
const float FILL = 0.84;     // block width / cell width before turning; turned blocks overlap as in the clip

float h31(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
}
vec4 h42(vec2 p) {
    vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }

// Slab test in box space (half-size h). Entry distance or -1, and the entry face's normal.
float boxHit(vec3 ro, vec3 rd, vec3 h, out vec3 nrm) {
    vec3 m = 1.0 / rd;
    vec3 n = m * ro;
    vec3 k = abs(m) * h;
    vec3 t1 = -n - k, t2 = -n + k;
    float tN = max(max(t1.x, t1.y), t1.z);
    float tF = min(min(t2.x, t2.y), t2.z);
    nrm = -sign(rd) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
    return (tN > tF || tF < 0.0) ? -1.0 : tN;
}

// Per pixel: the 2×2 blocks that can reach it, posed once and shared by every sub-sample.
// Everything a ray test needs that doesn't change between sub-samples is worked out here: the
// view ray is the same for every pixel (straight at the wall), so its direction in each box's
// space, the slab reciprocals and the pixel centre's origin in box space are per block.
mat3 gMi[4];
vec3 gH[4];
vec3 gRd[4];
vec3 gInv[4];
vec3 gK[4];
vec3 gO[4];
vec4 gR[4];
float gI[4];
float gTileH, gPx, gT, gSeed;
vec4 gFld;
vec2 gUV, gToUV;

struct Hit { float t; vec3 n; vec3 lp; vec3 h; mat3 Mi; vec4 hC; float infl; float id; };

// The nearest block face along the view ray through the pixel centre moved by world offset o.
Hit castAt(vec2 o) {
    float best = 1e9;
    int bk = -1;
    for (int k = 0; k < 4; k++) {
        // slab test (see boxHit), with the per-block parts hoisted into the pose loop
        vec3 n = gInv[k] * (gO[k] + gMi[k][0] * o.x + gMi[k][1] * o.y);
        vec3 t1 = -n - gK[k], t2 = -n + gK[k];
        float tN = max(max(t1.x, t1.y), t1.z);
        float tF = min(min(t2.x, t2.y), t2.z);
        if (tN <= tF && tN > 0.0 && tN < best) { best = tN; bk = k; }
    }
    if (bk < 0) return Hit(1e9, vec3(0.0, 0.0, 1.0), vec3(0.0), vec3(1.0), mat3(1.0), vec4(0.0), 0.0, -1.0);
    vec3 rol = gO[bk] + gMi[bk][0] * o.x + gMi[bk][1] * o.y;
    vec3 nl;
    float th = boxHit(rol, gRd[bk], gH[bk], nl);
    return Hit(th, nl, rol + gRd[bk] * th, gH[bk], gMi[bk], gR[bk], gI[bk], float(bk) * 8.0 + dot(nl, vec3(1.0, 2.0, 3.0)) + 4.0);
}

vec3 shade(Hit H, vec2 q) {
    if (H.id < 0.0) return uBg;
    float tileH = gTileH, t = gT, seed = gSeed;
    vec3 rd = vec3(0.0, 0.0, -1.0);
    vec3 wp = vec3(q, 4.0) + rd * H.t;
    vec3 lp = H.lp, h = H.h, bN = H.n;
    mat3 bM = transpose(H.Mi);
    vec4 bC = H.hC;
    // distance to the nearest edge of the face that was hit, and which way that edge lies
    vec3 e3 = h - abs(lp) + abs(bN) * 1e3;
    float e = min(e3.x, min(e3.y, e3.z));
    vec3 ea = step(e3, e3.yzx) * step(e3, e3.zxy);
    // one screen pixel measured along this face: a face seen edge-on packs more of it per pixel
    float pxl = gPx / max(abs((bM * bN).z), 0.15);
    // never thinner than ~2 px, or the glint crawls between pixels as the block sways
    float bev = 1.0 - smoothstep(0.0, max(BEVEL * tileH, 2.2 * pxl), e);
    // convex glass face, rolled over at the bevel
    vec3 fc = lp / h * (1.0 - abs(bN));
    vec3 nl = normalize(bN + fc * vec3(CURVE, CURVE * 0.6, CURVE) + ea * sign(lp) * bev * 1.2);
    vec3 N = bM * nl;
    vec3 Nf = bM * bN;
    vec3 R = reflect(rd, N);
    float ndv = clamp(-dot(rd, N), 0.0, 1.0);
    float fres = F0 + (1.0 - F0) * pow(1.0 - ndv, 5.0);

    // Where on the wall we are decides which lights are near (the field texture). Which way
    // the face points decides whether it mirrors one, and where on the face: a light shows as a
    // soft lobe in reflection space.
    float ev = t * uTiltP.w;
    float blue = min(1.0, smoothstep(uLevels.x, uLevels.x + 0.3, gFld.r) + H.infl * 0.5);
    float wc = smoothstep(uLevels.y, uLevels.y + 0.16, gFld.r);
    float wa = clamp(smoothstep(uLevels.z, uLevels.z + 0.12, gFld.g) * uWarmth, 0.0, 1.0);
    // The lights: a ring of tall strip lights around the wall, LIGHT_PITCH apart in
    // reflection space. A curved face sweeps about one pitch, so most faces mirror one strip
    // as a soft upright lobe — where on the face depends on which way the block is turned.
    vec2 Rr = R.xy * (uTiltP.y / 0.3);
    float sx = Rr.x / LIGHT_PITCH + gFld.b * 1.5;
    float lyBase = -0.12 + (gFld.a - 0.5) * 0.3;
    vec2 sig = max(uSpot.xy, vec2(0.02)) * vec2(0.42 * LIGHT_PITCH, 0.3);
    vec3 spec = vec3(0.0);
    // the two strips either side, so a halo never ends at a hand-over
    for (int k = -1; k <= 1; k++) {
        float si = floor(sx + 0.5) + float(k);
        vec4 hl = h42(vec2(si, 7.7 + seed));
        // what colour each strip is: amber where the warm band passes, else cyan or a deep blue
        float isAmber = smoothstep(hl.x - 0.12, hl.x + 0.12, wa * 0.9);
        float isCyan = step(0.55, hl.z) * (1.0 - isAmber);
        // cyan strips are the small hot ones; blue and amber spread wider and softer
        vec2 dl = vec2((sx - si) * LIGHT_PITCH, Rr.y - lyBase - (hl.y - 0.5) * 0.16) / (sig * mix(1.0, 0.72, isCyan));
        float lobe = (exp(-dot(dl, dl)) + 0.07 * exp(-dot(dl, dl) * 0.2)) * mix(1.0, 1.35, isCyan);   // core + glow halo
        vec3 lightCol = mix(mix(uBase * 1.15, uAccent, isCyan), uWarm * 1.15, isAmber);
        float lightAmt = mix(mix(0.45 + 0.7 * blue, 0.4 + 0.9 * wc, isCyan), 0.45 + 0.8 * wa, isAmber) * (0.65 + 0.6 * hl.w);
        spec += lightCol * lightAmt * lobe;
    }
    // a reflection aimed back into the wall sees the blocks behind it, dimmer
    float into = smoothstep(-0.6, 0.2, R.z);
    spec *= uSpot.z * 3.0 * mix(0.4, 1.0, into);
    vec3 amb = uBase * (0.25 + 0.75 * blue) * uLevels.w * 0.75 * (1.0 - 0.55 * wa) * mix(0.55, 1.0, into)
             * (0.6 + 0.4 * smoothstep(-0.8, 0.8, R.x - R.y));
    // the glaze also mirrors the room and the blocks around it: blotches that swim as a face
    // turns — two waves in reflection space, phased by the field so neighbours differ
    // (frequencies match the noise this replaced, ~2.2 per unit of reflection, so it swims no faster)
    float blot = 0.5 + 0.28 * sin(Rr.x * 2.6 + gFld.b * 9.0 + ev * 0.5) + 0.22 * sin(Rr.y * 2.2 - Rr.x * 1.1 + gFld.a * 7.0);
    amb *= mix(0.3, 1.5, blot);
    amb += uWarm * 0.1 * wa * uLevels.w;
    // what is seen through the glass: the blue field a little behind the face, tinted by the body
    float lb = textureLod(uField, gUV - Nf.xy * 0.08 * gToUV, 0.0).r;
    vec3 body = uBody * (0.7 + 0.6 * bC.z) + uBase * smoothstep(0.35, 0.75, lb) * blue * 0.22 * uLevels.w;
    vec3 col = mix(body, amb, 0.35 + 0.65 * fres) + spec * mix(0.6, 1.0, fres);

    // some blocks' glancing side faces go full mirror and catch a light whole
    vec3 hot = mix(mix(uBase * 1.3, uAccent, step(0.5, bC.y)) * (0.5 + 0.7 * max(blue, wc)),
                   uWarm * 1.25 * (0.6 + 0.6 * wa), smoothstep(0.15, 0.45, wa));
    float pick = step(1.0 - uExtras.x * 0.3, bC.w);
    float graze = smoothstep(0.65, 0.25, -dot(rd, Nf)) * pick * (1.0 - smoothstep(0.5, 0.9, abs(bN.y)));
    col += hot * graze * 1.5 * mix(0.6, 1.0, lp.y / h.y * 0.5 + 0.5);
    // bevels: thin bright lines where an edge rolls the light toward us
    col += (amb * 0.8 + spec + hot * 0.15) * bev * uExtras.y * 0.5;
    // caps take the light from above
    float cap = smoothstep(0.5, 0.9, bN.y);
    col += mix(uAccent, vec3(0.75, 0.9, 1.0), 0.3) * cap * uExtras.z * 0.35 * (0.3 + wc + 0.5 * blue);
    // occlusion: deeper into the wall is darker
    col *= mix(0.5, 1.0, smoothstep(0.0, 2.0 * h.z + 0.3 * tileH, wp.z));
    // seam: a block's outline (the face across the edge turns away) darkens into the gap;
    // an inner corner only gets a faint line
    float outline = smoothstep(0.12, -0.12, (bM * (ea * sign(lp))).z);
    col *= mix(mix(0.75, 0.35, outline), 1.0, smoothstep(0.0, 1.5 * pxl, e));
    // the hottest light burns toward white
    float L = max(col.r, max(col.g, col.b));
    return mix(col, vec3(1.0), smoothstep(1.0, 2.2, L) * uSpot.w * 0.8);
}

void main() {
    float ry = max(uRes.y, 1.0);
    float aspect = uRes.x / ry;
    vec2 ctr = vec2(aspect * 0.5, 0.5);
    float zoom = max(uScale, 0.05);
    // One coordinate path: frame -> world, zoomed about the centre. The pointer goes through it too.
    vec2 p = (gl_FragCoord.xy / ry - ctr) / zoom + ctr;
    vec2 m = (uMouse * vec2(aspect, 1.0) - ctr) / zoom + ctr;
    vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));
    float px = 1.0 / (ry * zoom);
    float t = uTime;
    float seed = uExtras.w * 13.1;

    float tileH = 1.0 / max(uGrid.x, 1.0);
    float tileW = tileH * max(uGrid.y, 0.05);
    float fill = 1.0 - uGrid.z;
    vec3 hs = vec3(tileW * fill * FILL * 0.5, tileH * fill * 0.5, tileW * fill * FILL * 0.5 * DEPTH);
    float wMin = max(uDriftP.z, 0.05);
    float wMax = max(uDriftP.w, wMin);
    gTileH = tileH; gPx = px; gT = t; gSeed = seed;
    gUV = uv;
    gToUV = zoom / vec2(aspect, 1.0);   // a world offset, as a share of the frame
    gFld = texture(uField, uv);

    // ── pose the blocks that can reach this pixel ──
    // A turned or tipped block spills at most ~0.1 of a cell past its own, so only the nearer
    // neighbour on each axis can overlap this pixel: 2×2 blocks, not the full 3×3.
    float fy = p.y / tileH;
    float row0 = floor(fy);
    float rowN = row0 + (fract(fy) < 0.5 ? -1.0 : 1.0);
    for (int j = 0; j < 2; j++) {
        float r = j == 0 ? row0 : rowN;
        float off = (h42(vec2(r, 91.7 + seed)).x - 0.5) * uGrid.w;
        float gx = p.x / tileW + off;
        float c0 = floor(gx);
        float cN = c0 + (fract(gx) < 0.5 ? -1.0 : 1.0);
        for (int i = 0; i < 2; i++) {
            vec2 cell = vec2(i == 0 ? c0 : cN, r);
            vec2 cxy = vec2((cell.x + 0.5 - off) * tileW, (r + 0.5) * tileH);
            vec4 hA = h42(cell + seed);
            vec4 hB = h42(cell + 47.3 + seed);
            vec4 hC = h42(cell + 123.9 + seed);
            // a slow sway on each block's own period carries its reflections across its faces
            float sway = sin(t * TAU / mix(wMin, wMax, hB.x) + hB.z * TAU);
            float nod = sin(t * TAU / mix(wMin, wMax, hB.y) + hB.w * TAU);
            float yu = hA.x * 2.0 - 1.0;
            float yaw = sign(yu) * pow(abs(yu), 0.7) * uTiltP.x * YAW_RANGE + sway * 0.1 * uShimmer;
            float lean = mix(LEAN_LOW, LEAN_HIGH, clamp((cxy.y - ctr.y) * zoom + 0.5, 0.0, 1.0));
            float pitch = lean + (hA.y * 2.0 - 1.0) * uTiltP.x * YAW_RANGE * PITCH_RANGE + nod * 0.035 * uShimmer;
            // pointer: nearby blocks turn their faces toward it and lift off the wall
            vec2 dm = cxy - m;
            float infl = uHover * uHoverAmt * exp(-dot(dm, dm) * 14.0);
            vec2 to = -dm / (length(dm) + 0.05);
            yaw += to.x * 0.55 * infl;
            pitch -= to.y * 0.35 * infl;
            vec3 h = hs * vec3(mix(0.92, 1.06, hC.x), 1.0, mix(0.85, 1.15, hC.y));
            int k = j * 2 + i;
            mat3 Mi = transpose(rotX(pitch) * rotY(yaw));
            vec3 c = vec3(cxy, h.z + hA.z * 0.3 * tileH + infl * 0.3 * tileH);
            // the view ray (0, 0, -1) in box space is minus the third column of Mi
            vec3 rdl = -Mi[2];
            rdl += step(abs(rdl), vec3(1e-6)) * 1e-6;
            gMi[k] = Mi;
            gH[k] = h;
            gRd[k] = rdl;
            gInv[k] = 1.0 / rdl;
            gK[k] = abs(gInv[k]) * h;
            gO[k] = Mi * (vec3(p, 4.0) - c);
            gR[k] = hC;
            gI[k] = infl;
        }
    }

    // ── edge-adaptive 4× supersampling (rotated grid) ──
    // Geometry is cast for all four sub-samples; a sub-sample is shaded again only when it
    // lands on a different face, so the inside of a face costs one shade and only outlines
    // pay more. Without it a swaying block's edge steps a whole pixel at a time and crawls.
    vec2 o0 = vec2(0.125, 0.375) * px, o1 = vec2(-0.375, 0.125) * px;
    vec2 o2 = vec2(-0.125, -0.375) * px, o3 = vec2(0.375, -0.125) * px;
    Hit h0 = castAt(o0);
    vec3 c0 = shade(h0, p + o0);
    vec3 col = c0;
    Hit s1 = castAt(o1);
    col += s1.id == h0.id ? c0 : shade(s1, p + o1);
    Hit s2 = castAt(o2);
    col += s2.id == h0.id ? c0 : shade(s2, p + o2);
    Hit s3 = castAt(o3);
    col += s3.id == h0.id ? c0 : shade(s3, p + o3);
    col *= 0.25;

    // ── vignette, grain ──
    vec2 q = (uv - 0.5) * vec2(0.8, 1.2);
    col *= mix(1.0, 1.0 - uPost.y, smoothstep(0.3, 0.72, length(q)));
    col += (h31(vec3(gl_FragCoord.xy, floor(t * 30.0))) - 0.5) * uPost.x * 0.25;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

// ══ /EFFECT ═════════════════════════════════════════════════════════════════

export interface LapisCourseProps extends EffectProps {
    background?: string
    /** The blue the glass mirrors. */
    baseColor?: string
    /** The cyan lights. */
    accentColor?: string
    speed?: number
    /** Zoom: how big the wall draws in its frame. Below 100% more of it shows. */
    scale?: number
    style?: CSSProperties
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

// Both passes draw the same full-frame triangle, pinned to attribute 0.
const VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

// ── performance budget ──
/** Most device pixels the wall pass will shade per frame; past it the canvas renders smaller and CSS scales it up. */
const MAX_PIXELS = 2_000_000
/** The light field is smooth over several blocks, so a texel per 4×4 canvas pixels holds it. */
const FIELD_DIV = 4
/** Frame-rate governor: drop resolution below ~48 fps, win it back after a steady stretch above ~56. */
const SLOW_DT = 1 / 48
const FAST_DT = 1 / 56
const MIN_QUALITY = 0.5

export default function LapisCourse(props: LapisCourseProps) {
    props = withMovedControls(props)
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#0A1530", baseColor = "#1F5BFF", accentColor = "#22CFFF", speed = 50, scale = 200, style } = props
    void [baseColor, accentColor, speed, scale]
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false })
        if (!gl) return
        const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        const build = (fs: string) => {
            const sh = (type: number, src: string) => {
                const s = gl.createShader(type)!
                gl.shaderSource(s, src)
                gl.compileShader(s)
                if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("LapisCourse shader:", gl.getShaderInfoLog(s))
                return s
            }
            const prog = gl.createProgram()!
            const vs = sh(gl.VERTEX_SHADER, VERT)
            const fsh = sh(gl.FRAGMENT_SHADER, fs)
            gl.attachShader(prog, vs)
            gl.attachShader(prog, fsh)
            gl.linkProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fsh)
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                console.error("LapisCourse link:", gl.getProgramInfoLog(prog))
                gl.deleteProgram(prog)
                return null
            }
            const cache = new Map<string, WebGLUniformLocation | null>()
            const u = (name: string) => {
                if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name))
                return cache.get(name) ?? null
            }
            return { prog, u }
        }
        const wall = build(FRAG)
        const field = build(FIELD)
        if (!wall || !field) return

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

        const fieldTex = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, fieldTex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        const fbo = gl.createFramebuffer()
        let fw = 0
        let fh = 0

        // Canvas resolution = layout size × DPR (≤ 2) × quality, capped at MAX_PIXELS.
        // `quality` is lowered by the frame-rate governor below on devices that can't keep up.
        let quality = 1
        const resize = () => {
            const cw = Math.max(1, root.offsetWidth)
            const ch = Math.max(1, root.offsetHeight)
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const s = Math.min(dpr * quality, Math.sqrt(MAX_PIXELS / (cw * ch)))
            const w = Math.max(1, Math.round(cw * s))
            const h = Math.max(1, Math.round(ch * s))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            const nfw = Math.max(1, Math.ceil(w / FIELD_DIV))
            const nfh = Math.max(1, Math.ceil(h / FIELD_DIV))
            if (nfw !== fw || nfh !== fh) {
                fw = nfw
                fh = nfh
                gl.bindTexture(gl.TEXTURE_2D, fieldTex)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, fw, fh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
                gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTex, 0)
                gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            }
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        // Pointer as a 0..1 share of the frame as displayed, so it stays under the
        // cursor at any canvas zoom or parent transform (the template used offsetX/W).
        let mx = 0.5
        let my = 0.5
        let tx = 0.5
        let ty = 0.5
        let over = 0
        let hov = 0
        const onMove = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            tx = (e.clientX - r.left) / r.width
            ty = 1 - (e.clientY - r.top) / r.height
            over = 1
        }
        const onLeave = () => {
            over = 0
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerdown", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerup", onLeave)

        // Uniforms both passes share; a location a program doesn't have is null, and GL ignores it.
        const common = (u: (name: string) => WebGLUniformLocation | null, p: LapisCourseProps) => {
            gl.uniform2f(u("uRes"), canvas.width, canvas.height)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform1f(u("uScale"), Math.max(10, Math.min(300, num(p.scale, 100))) / 100)
            effectUniforms(gl, u, p)
        }

        let clock = 0
        let raf = 0
        let last = -1
        let avgDt = 1 / 60
        let calm = 0
        let cooldown = 1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const raw = last < 0 ? 1 / 60 : Math.min((now - last) / 1000, 0.25)
            const dt = Math.min(raw, 1 / 20)
            last = now

            // Frame-rate governor: if frames come slower than ~48 fps the GPU is the bottleneck,
            // so shade fewer pixels; once it has been comfortably fast for a while, step back up.
            avgDt += (raw - avgDt) * 0.1
            cooldown -= raw
            if (cooldown <= 0) {
                if (avgDt > SLOW_DT && quality > MIN_QUALITY) {
                    quality = Math.max(MIN_QUALITY, quality * 0.8)
                    cooldown = 0.75
                    calm = 0
                    resize()
                } else if (avgDt < FAST_DT && quality < 1) {
                    calm += raw
                    if (calm > 3) {
                        quality = Math.min(1, quality * 1.15)
                        cooldown = 0.75
                        calm = 0
                        resize()
                    }
                } else calm = 0
            }

            const p = propsRef.current
            clock = (clock + dt * (Math.max(0, Math.min(100, num(p.speed, 50))) / 50) * (reduced ? 0.25 : 1)) % 3600
            // ~70 ms follow on the spot under the cursor; the turn itself is the block's
            const k = 1 - Math.exp(-dt * 14)
            mx += (tx - mx) * k
            my += (ty - my) * k
            hov += (over - hov) * (1 - Math.exp(-dt * 6))

            // pass 1: the light field, quarter resolution
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
            gl.viewport(0, 0, fw, fh)
            gl.useProgram(field.prog)
            gl.uniform2f(field.u("uFieldRes"), fw, fh)
            common(field.u, p)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            // pass 2: the wall
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.useProgram(wall.prog)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, fieldTex)
            gl.uniform1i(wall.u("uField"), 0)
            const bg = parseColor(p.background, [0.02, 0.04, 0.1, 1])
            const base = parseColor(p.baseColor, [0.12, 0.36, 1, 1])
            const acc = parseColor(p.accentColor, [0.13, 0.81, 1, 1])
            gl.uniform2f(wall.u("uMouse"), mx, my)
            // Raw 0..1: the FRAG scales it by the Advanced `hover` row.
            gl.uniform1f(wall.u("uHover"), hov)
            gl.uniform3f(wall.u("uBg"), bg[0], bg[1], bg[2])
            gl.uniform3f(wall.u("uBase"), base[0], base[1], base[2])
            gl.uniform3f(wall.u("uAccent"), acc[0], acc[1], acc[2])
            common(wall.u, p)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        // Only animate while on screen: an off-screen hero section shouldn't hold the GPU
        // (or the battery) while the visitor reads the rest of the page.
        const start = () => {
            if (raf) return
            last = -1
            raf = requestAnimationFrame(frame)
        }
        const stop = () => {
            cancelAnimationFrame(raf)
            raf = 0
        }
        const io =
            typeof IntersectionObserver === "function"
                ? new IntersectionObserver((entries) => (entries[entries.length - 1].isIntersecting ? start() : stop()))
                : null
        if (io) io.observe(root)
        start()

        return () => {
            stop()
            io?.disconnect()
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerdown", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerup", onLeave)
            gl.deleteFramebuffer(fbo)
            gl.deleteTexture(fieldTex)
            gl.deleteBuffer(buf)
            gl.deleteProgram(wall.prog)
            gl.deleteProgram(field.prog)
        }
    }, [])

    return (
        <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}

// Control order arranged in the builder.
