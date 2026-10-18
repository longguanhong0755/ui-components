"use client"

/**
 * SorbetTiers — nine pastel domes stacked down the frame, each one a saturated
 * rim that melts into its own pale tint, slowly turning and breathing.
 *
 * Refined from the user's StackNineOverlapping (built on the Background
 * template, lib/templates/BackgroundTemplate.tsx) to match its reference poster
 * pixel for pixel. Geometry, rim colours, interior tints and the fade curve
 * below were measured off that still, not eyeballed — see RING and FADE_SHAPE.
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

// ══ EFFECT ══════════════════════════════════════════════════════════════════

/** Effect-only props. */
interface EffectProps {
    count?: number
    wave?: number
    shadow?: number
    /** How far the tier under the pointer rises out of the stack (0 turns the hover off). */
    lift?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

/**
 * Tuning values. Geometry is a circle fit to every disc edge in the reference
 * (R ≈ 729, centres stepping (57, 134) in its 1000-wide space, residual < 0.4 px),
 * so these defaults put each rim where the poster's is.
 */
const ADVANCED_DEFAULTS = {
    anchorY: 50,
    apexX: 507,
    apexY: 33,
    stepX: 57,
    stepY: 134,
    radius: 729,
    rimWidth: 0,
    fadeWidth: 134,
    paleMix: 100,
    shadowWidth: 26,
    shadowDepth: 24,
    spinRate: 12,
    waveAmp: 10,
    wavePeriod: 8000,
    waveLag: 350,
    angleFar: -60,
    angleLeft: -28,
    angleTop: 2,
    angleRight: 40,
    angleBack: 150,
    liftHeight: 36,
    parallax: 3,
    saturation: 100,
    grain: 0,
    vignette: 0,
    hover: 50,
}

/** The five stop controls warp RING's angle axis: each pins the colour that sits at its default angle. Defaults = identity. */
const STOP_ANCHORS = [
    ADVANCED_DEFAULTS.angleFar,
    ADVANCED_DEFAULTS.angleLeft,
    ADVANCED_DEFAULTS.angleTop,
    ADVANCED_DEFAULTS.angleRight,
    ADVANCED_DEFAULTS.angleBack,
]

/** Base Color tints the interiors relative to this; at it, the interiors are the reference's own. */
const DEFAULT_BASE = "#EFE8E4"

/**
 * Measured off the reference, one disc per pair of rows: `rim` is the colour at
 * the edge, `pale` the colour FADE_WIDTH deep, both every 4° around the circle
 * starting at -180° (0° = top, clockwise). The arcs the poster shows are its
 * own pixels (least-squares fit per 4° wedge, ~5/255 RMS); the back of each
 * disc, never on screen in the still, is filled with two other discs' measured
 * arcs, crossfaded, so the spin only ever turns real reference colour into view.
 */
const RING_BINS = 90
const RING = [
    "a89e319d983f94914f9e7d7aaf67a9bd6db0c972b5d577b9dd78b6e378b0e775a7ea7099ed6989ef6178f15867f35056f44845f44336f23f2aee3e21e23f1cd24119bb44189f4919834e1a67541d50591f3d5d213360243a6527547129797e289c8d23b69b1cbfa0189291135e7e132b69180755220045350039510030740029970026b50026c90028d0032ecb0b36bb1b44a23157854f6b65747e499a8f32bd9c21d9a615e7ab0eecac0de5a417d89030cc7351c65571c73e86cf358cd73688dc3984e03d81e2447fe54d7fe8587feb6581ee7383f18085f38c85f49683f49e7ff4a476f4a96af3ad5bf2af48f0b136eeb225ecb21aeab313e7b310e2b211dcb112d5af15cbac18c0a81db4a325", // 0 rim
    "b3bce5b1badcafb6d0bac1d9c7d1e8c2d3e9bdd3e9b9d0e7b6cce5b5c7e3b4c3e0b5bfdeb5bcdbb5b9d8b5b6d5b5b4d2b5b2cfb5b0cdb5afcbb5afcab4b0c9b3b1c9b1b3c9b0b5cbafb8ccafbbd0afbed4b0c2d9b2c6dfb4cbe3b3cde4b0cce3acc8dfa9c4dca7c3dba1c1d79dbfd49abcd299bad298b9d499b8d89cb9dc9fbbdea5bfe0abc4e3b3cae5bdd1e9c6d7ecccd9f1ced8f6ccd6fcc7d2ffbecfffb2cbffa5c5ff9ebeff9cb7ffa0b8fda7bbf9b0bef4b7c1f0bbc1ebbabee7b7b9e4b6b5e2b5b2e0b5afdeb5acdcb5aadab5a9d9b5a9d8b5a9d7b5aad7b5acd7b5add7b5afd7b5b0d6b5b1d6b4b2d6b4b3d6b3b4d7b3b5dab3b6ddb3b8e1b3b9e6b4bbebb4bdefb4bef1b4bef1b4beed", // 0 pale
    "cf1143cf1443c81946c02148b42b4ca938509e455397515596757a9babb899a7ba97a2bd969ac1958ec79580cc9671d19762d59854d99848da983edb9737db9432db8f2fdb882edb802eda782fda7030da723ccc8156a999777ab4974bcab028d3ba1accb426c1a53db28d61a2718b9457b28b44cf883ddc8c42dc964fd8a461d1b274c9bf85c0c993b8d09db2cfa2aec8a3acc0a0adb89cafb397afb293adb58dacb988afb789afaf88aca083a38b7a957671866a697b6866746d636d76626786645f986757ac6a4ebc6d47c87041ce713dcb6f3ec46d43b46b4e9d686084657469628b4f5fa1365bb62557c41a52ce164dd11f46c92e3ebc4435a95e2c947a237d951c6aac1659c0124cca1146", // 1 rim
    "f4cfeaf8d4ecfcd8eeffdbeeffdcedffdae9fdd6e4f7cfddefcac0e7c694e9c59eeac5a6e9c5ace8c4aee7c3afe6c1afe6bfb0e5bdb0e5bbb1e5bab1e6b9b1e6b8b0e6b8b0e7b9afe7baafe8bcb0e8beb0e9c3b0ecccb1eed4b2f1dcb2f4e0b3f5e2b3f2dcafefd7acecd2acebceade9cbaee8c9b0e9c9b2eacab2eccdb1edd0b0efd4b0f2d8b0f5ddb1f9e3b3fce7b4fde8b5fae7b6f4e3b6eaddb7dfd5b7d2ccb8c5c1b6c2beb5bcb7b3b9b2b3bdb1b6c9b6bfd8c0c9e6c9d2f2d2dafbd9e2fedde7ffdfeaffdeecfddbebfad7eaf5d3e8f1cfe7eccce6e8c9e5e4c6e4dfc4e4dbc2e5d7c0e5d3bee7d1bce7d0bae8d0b9e7d2b8e7d4b7e6d7b8e6dbb9e5debae4e2bde4e6c0e5eac4e6efc9e8", // 1 pale
    "fd3590fe2f95fe2c98fe2a99fd2996fb2a93f92b8df52d87f03081ea347be23975df3e6de8425def4251f13652f22b53f42553f61f52f71f50f71f4ef8224bf82548f72947f52e45f33446e4414dc2585e9a717173888358978f4d9d9349a29747a6964da88e61aa7c84ae60acb340d0b823eabb0ef6b905faad03fb9903fd8103ff6b02ff5b02fc5404f3530be1561cc75c37ac6357986978906c92926da4956cae936cab8c6ba3846595825d84865471944e64a44a5bb54954c8484cd74847e54942ee4b40f64d3efa503dfc533cfc573cfb5c3bfa623bf8693af7713af5783bf27f3bf0863bed8b3bec8f3beb913ceb903deb8c41ed8745ee7e4cf17455f3695ff65d6af85175fa467ffc3d88", // 2 rim
    "f7a9bbf6abbdf6adc0f5b0c3f5b4c6f5b7c9f5bbccf5becef4bfd0f3c0d1f1bfd1ecb6d1dd96d2d180d3cd85d5c88ad7c48ed7c091d8bc93d8b894d9b395d9af96daa997d9a398d99b98d79b9ed3a6accbbcbec3d7cfbdefddbafae3b9f7e0b3f4ddadf1dba6f0d99ef0d998f2d892f5d98df7d98af7d889f7d78af7d68cf6d591f5d696f4d89ef5dba6f7dfaffae3b5fee5b5ffe3b0ffdea8f7d6a0eacd9dddc49edcc1a0ddbba7e3b6b2ecb4bff7b6cafcb8d0ffbcd1febcd1febdd0fcbbcef9b8cbf8b5c8f6b2c4f6b0c0f5adbdf5abbaf6aab7f6a8b4f7a7b2f7a6b0f8a5adf8a5acf9a4aaf9a4a9f9a4a8f9a4a8f9a5a9f9a5aaf9a4abf9a4adf9a4aef8a4b0f8a4b2f8a5b4f8a6b6f7a7b9", // 2 pale
    "034c2d00433b003b4d003463002f79002b900028a40026b70026c30027cc0029d0022ccd0630c60b36bc153fac20499b2f5588416174556e606d7b4e86863e9e9130b59925c59a25c88d35bc7852ab60709c4d89954693a73d95ba3693cb348ed83687df3b81e3457fe7557fec6981f07e85f39085f49d80f4a772f3ad5bf1b03feeb224ebb314e7b30fdfb111d4ae15c4a91bb1a2279f9a3b918f54938c5a9c866bac8084c27d9fd67ab0e278b2e676a9e9719cec6b8dee637cf15a6bf2525af34a49f4443af3402cef3e24e63f1dd84019c24318a847188c4c1a70521c57571e435c20375f233061262f602c325e34365a3d3a55476f7138bea018a19615818b13607f133e711621641a0a5721", // 3 rim
    "99b9d398b9d599b8d89ab8da9cb9dc9fbadea2bddfa5bfe0a9c3e2aec6e4b3cbe5bacfe8c0d3eac5d7ecc9d8efccd9f2ced8f6cdd7facbd5fdc8d3ffc2d1ffbcceffb4ccffaec8fdaec5f8b4c2f1bdc2eac5c4e5c8c4e3c5c6e8c0c5eabbc0e8b7b9e4b5b2e0b5aeddb5abdab5a9d8b5a9d7b5abd7b5add7b5afd6b5b1d6b4b3d6b3b4d7b3b6dbb3b8e2b4baeab4bdf0b4bef2b4beecb2bbdeaeb5ccb0b7ceb3bdd4b6c4dab6cae0b6cbe3b5c8e3b4c4e1b5c0deb5bddcb5bad9b5b7d5b5b4d2b5b2d0b5b1cdb5b0ccb5afcab4b0c9b3b0c9b2b2c9b0b4caafb7cbafbacfafbdd3afc1d8b1c5ddb4c9e2b6cee6b9d3e9bbd6ecbed8edb6d1e6a7c3dba3c1d8a0c0d69dbfd49bbdd29abcd299bad2", // 3 pale
    "934bd99a54d6a25fd2ab6acdb375c8bb80c3c289bec892b9cd98b5d09db1cfa0afcda2adc9a3acc3a1adbe9faeba9dafb69aafb398afb095aead92ada890aea390af9f91b09d92b08c819c79748b6a6a7d6765727362688d655cac6a4ec56f42cf713cc86e40af6a528866715d6195365bb61b55cc154cd12740c24a32a4762480a01961c0124ccf1043cf1443c31e47b12f4d9f4353945656945c5d956b70967d899689a5958cbd9584cb9675d09767d49859d8984dd99842db973bdb9535db9231db8d2fdb862eda7e2eda772fda6f31da6932db6434db5f35db5a36da5437d99b806ed2b91cceb523c8ae2ec1a53db89752af8869a677839c669b9457b38e4bc48a42d2893eda8a40dc8d43dc", // 4 rim
    "ebccb1ecceb1edd0b0eed2b0efd4b0f1d7b0f3dab0f5ddb1f7e0b2f9e3b3fbe6b4fce7b5fde8b5fce8b5f9e6b6f5e4b6f0e1b6eaddb7ded3b5cbc2b2b7b0aca7a0a79d95a39a91a1a79eabbcadb8d4bdc6eaccd5fbd9e1ffdfe9ffdeecfcd9ebf5d2e8edcde6e7c8e5e0c4e4d9c1e5d3bee7d0bbe8d0b8e7d3b7e6d8b8e5debae4e4bee4eac4e6f2cce9f9d5ecffdbefffdcedfed7e5f4ccdaf3ccd5f1cbcaefc9c0ecc7b7e9c5b1e7c3afe6c2afe6c0b0e5beb0e5bcb1e5bab1e5b9b1e6b8b1e6b8b0e6b9b0e7b9afe7bbafe8bdb0e8bfb0e8c1b0e8c4b1e7c7b1e6c9b1e4ccb1edd8b2f5e1b2f2ddb0f1daaeefd7acedd4acecd2acebcfaceacdade9cbaee9cab0e9c9b1e9c9b2e9cab2eacab2", // 4 pale
    "fb9f03fc9503fd8903fd7d02fe7202ff6902ff6102fe5a02fd5703fb5405f65308f1530de85515de571ed25a2cc55d39b86049ab6359a16669986979946b868e6d92886e98816e99796f95736f9170708e735f7d85516ca54a5bca474be84a42f84e3efc533cfb5d3bf86b3af47b3bef883beb913beb903eed8447f26f59f7576ffb4085fd3194fe2a9afc2995f72c89ec337ddd3c71de3d6fe23c69e73562ee2c5bf42255f61f51f71f4ef8214cf82449f72847f62d45f33246f03847ec3e4ae8444fe24a56dc515ea66e7361938c4c9f944aa19648a39647a59649a6934ca78f53a8885daa806cab747dad668fb058a3b248b6b538c8b72ad7b91de3ba13edbb0cf3ba07f7b604f9b104faa903", // 5 rim
    "f7d68cf7d68df6d68ff6d692f5d694f5d697f5d79bf4d89ff5daa3f5dca7f6deacf7e0b0f8e2b3fae3b5fce4b5fee5b5ffe4b2ffe3afffe0abfedda7fad9a3f4d1a2e9c3a6dfb3acd8a6b3d59db8d49abae9a9c6f9b5ceffbcd1febdd0f9b8cbf6b2c3f5adbcf6a9b6f7a6b1f8a5adf9a4a9f9a4a8f9a5a9f9a4acf8a4aff8a5b3f7a7b8f6aabcf5afc2f5b6c8f5bdcef3c0d1f0bed1eebad1e7afd2dda4d4d09ad6c594d7bd92d8b994d9b595d9b096daaa97d9a598d99d98d79599d68c98d38198cf7597c96896c29cb2bee5d8baf9e2b7f8e0b4f6dfb1f4ddaef3dcabf2dba7f1daa4f0daa0f0d99cf0d999f0d996f1d893f3d890f4d98ef5d98cf6d98af7d989f7d889f7d889f7d889f7d78a", // 5 pale
    "da3885df3b81e1427fe44a7fe7557fea6281ed7083f07e85f28a85f49484f49d80f4a477f4a96bf3ad5bf2af48f0b136eeb224ecb219eab312e7b30fe1b211dbb013d4ae15c9ab19bca229b09348a9826ea8738eab69a1ad66a8c26fb3d477b9e079b5e776a7eb6d91ef6178f2535df44743f4402ded3e1fd84019b54517894d1a5e561d3f5d213061252f602e355a3b3c534b46594856653d5e6f2f5573223c6e1a1f631b075522024a2f00413f003951003369002e800029970027ab0026bc0026c90028ce012acf032ecb0933c0103bb31b44a22a508f3b5d7a4f6b656778538084429a8f32b29827c6a01dd9a615e2a911e9ab0eecac0db268669b4394a73d95b43894c03592cb348ed43689", // 6 rim
    "b7b7e3b5b2e0b5b0deb5addcb5abdab5a9d9b5a9d8b5a9d7b5aad7b5abd7b5add7b5afd7b5b0d6b5b1d6b4b2d6b4b3d6b3b4d7b3b5dab3b7ddb3b8e2b3bae7b4bbecb4bdf0b4bef1b6bfefb9c3ebbec6e5c2cae4c6cee6c8d0e8bfd4e9b9d1e7b5cae4b4c3e1b5bddcb5b9d8b5b5d3b5b1cfb5b0ccb5afc9b3b0c9b1b3caafb7ccafbcd1b0c1d9b3c8e1b7d0e7bbd6ecbfd9eebdd7ecb8d3e8b0cde2a6c5da9ebfd49abcd299bad298b9d499b8d699b8d89bb9da9db9dc9fbbdea3bedfa7c1e1abc4e3b1c8e4b7cde6bdd1e9c3d5ebc8d8eeccd9f1cdd9f5ced7f8ccd6fcc9d3fec4d1ffbecfffb6ccffadc9ffa5c5ffa0c1ff9dbcff9cb7ffbac0edc7c5e5c5c6e8c2c5eabec3e9bbc0e8b8bbe5", // 6 pale
    "8f655ba46952b66c4ac66f42cd703ecc703ec66e42b56b4e9d686082657665628e4a5ea5325ab91f56c91850cf194ace2542c43a39b1542f9c7126848e1e6fa8175cbd124ec91147cf1143cf1443c71a46bb2d51ab4e69a073859b919e9aa4b19babb898a6bb9699c29585ca976dd29855d89843db9737db9230db872eda7a2ed96e31da6534db5d35db5437d95d41cb7358a98e7383a48866af8d60ac8371a2708d985ea8904fbe8a43d0893fd98a40dc8e44dc944cd99c57d5a663d0b070cbb97cc5c188bfc891b9cd98b5d09eb1cfa1aecba2adc6a2acc0a0adbb9eaeb79bafb398afb295aeb291acb48eacb78aaeb18baf9d92b09287a3867d9779748b6f6e8169687967647270636b7d6363", // 7 rim
    "ffdfe9ffdeebfedcecfcd8ebf7d4e9f2d0e7edcce6e8c9e5e4c6e4dfc3e4dac1e5d6bfe6d2bde7d0bbe8d0bae8d1b8e7d3b7e7d6b7e6d9b8e5ddbae5e1bce4e5c0e5eac4e6efc9e8f4cfeaf8d4ecfdd9eefddae7f9d7d6f3cfbeecc9a8e8c799e7c694eac5a3e9c5ace7c3afe6c1afe5beb0e5bab1e6b9b1e6b8b0e7b9afe8bcb0e8bfb0e8c3b1e7c8b1e3ccb1e5ceb1e7d1b1ead3afecd4aeecd3acecd1acebceadeaccaee9caafe8c9b0e9c9b2e9cab2eacbb2ebccb1ecceb1eed1b0efd3b0f0d6b0f2d9b0f5ddb1f7e0b2f9e3b3fbe6b4fce8b5fce8b5fbe7b5f6e5b6f1e2b6ebdeb7e3d8b7dbd3b7d3cdb8cac5b7b8b3b09b93a2a29aa8aea3afbcadb8ccb8c1dcc2cbebcdd5f6d5ddfddbe4", // 7 pale
    "82536e934e64a6495abc4851d04849e14944ee4b40f74d3efa513dfc553cfb5a3bfa623bf86a3af6733bf47c3bf1843bee8a3beb8f3beb903ceb903eec8944ee804bf17455f36761f7586ef94b7bfb3f87fd3590fe2f96fe2b99fd2a97fc2994f82d89f33478ee3b68ec425bed4553ef4651f22d53f51f53f71f4ef82448f62d45f03947e74650da5260d05864b5666e917b7b6e8f8854a08f4ca78e58a98565ab797aad6990b057a7b344bdb633d2b822e1ba15edbb0cf4b906f8b404faae03fba203fc9503fd8703fe7a02ff6d02ff6302ff5b02fd5603f95406f4530aeb5513e0571dd15a2dc15e3eb16151a46564986977946b86906d95916d9f936da7956cad836e9e706e8d726483785b79", // 8 rim
    "f7b3cdfcb8d0ffbcd1febdd1fdbccffab9ccf8b6c8f6b2c4f5afbff5acbbf6aab8f6a8b5f7a6b2f8a5aff8a5acf8a4abf9a4a9f9a4a8f9a5a9f9a5a9f9a4abf9a4acf9a4aef8a4b0f8a5b3f8a6b6f7a7b8f7a9bbf6abbef6aec1f5b2c5f5b7c8f2b6ccecadcfe39fd1da8fd2d483d2d27fd2c989d7c191d8b994d9af96daa498d99499d67f98ce6596c1709cc08ba9beaebbb9cfcbb3e8d7acf1dba6f0daa2f0d99ef0d99af0d996f2d892f3d88ff5d98df6d98bf7d989f7d889f7d889f7d78af7d68bf7d68df6d690f6d692f5d696f5d79af4d89ef5daa4f5dca9f6dfaef8e1b2fae3b5fce4b5fee4b4ffe3b1ffe1adffdea8fad9a3f5d59fedcf9ee6ca9ddec59ed8afacd69bbbe2a4c2edacc8", // 8 pale
]

/**
 * Fade from rim to interior is 1 − e^(−depth / L), normalised to reach the
 * interior at Fade Width. L = 98 fit the poster best (vs 60…160); kept as a
 * share of Fade Width so the curve keeps its shape when that is dragged.
 */
const FADE_SHAPE = 98 / 134

/**
 * Framing at 100%, in reference units. The poster's own frame fits height; a
 * wider frame shows more of the stack sideways rather than zooming in, up to
 * FIT_WIDTH (the first disc is 1458 across, so 1390 still meets both edges).
 * Below its equator the stack's left flank curls back in, so the deeper a
 * frame looks, the narrower it may be before ground shows under the discs:
 * view width ≤ COVER_A − COVER_B × view height, a line through the measured
 * limits at depth 1000 (1392) and 1248 (1177) for the default geometry.
 */
const FIT_WIDTH = 1390
const COVER_A = 2250
const COVER_B = 0.867

function ringPixels(): Uint8Array {
    const out = new Uint8Array(RING.length * RING_BINS * 4)
    RING.forEach((row, r) => {
        for (let i = 0; i < RING_BINS; i++) {
            const o = (r * RING_BINS + i) * 4
            for (let c = 0; c < 3; c++) out[o + c] = parseInt(row.slice(i * 6 + c * 2, i * 6 + c * 2 + 2), 16)
            out[o + 3] = 255
        }
    })
    return out
}

/** Each disc's interior tint averaged around the circle — what its deep centre settles to. */
function paleMeans(): Float32Array {
    const px = ringPixels()
    const out = new Float32Array(9 * 3)
    for (let d = 0; d < 9; d++) {
        for (let i = 0; i < RING_BINS; i++) {
            const o = ((d * 2 + 1) * RING_BINS + i) * 4
            for (let c = 0; c < 3; c++) out[d * 3 + c] += px[o + c] / 255 / RING_BINS
        }
    }
    return out
}

const DEG = Math.PI / 180
const REF_W = 1000
const REF_H = 1248.26

/**
 * The world past the poster, for Scale below 100% and wide frames. Stacks repeat
 * sideways every COLUMN_SPACING × radius, odd columns half a step lower so no two
 * discs ever tie for depth, and every column runs on downward as far as the frame
 * goes. Measured on the default geometry: 2.06 is the widest spacing that leaves
 * no ground between columns (2.15 opens gaps) and still keeps neighbours out of
 * the poster's own frame and a 100% landscape frame (2.03 shows a sliver).
 */
const COLUMN_SPACING = 2.06
/** Each column turns from its own phase, so copies never read as one picture repeated. */
const COLUMN_PHASE = 2.1

/** Hover: the tier under the pointer lifts out of the stack. */
const LIFT_RISE = 0.09 // s — under the cursor, so it follows rather than trails
const LIFT_FALL = 0.28 // s — settling back is secondary motion
const LIFT_BLOOM = 0.7 // a fully lifted tier's rim colour reaches this much deeper
const LIFT_SHADOW = 0.32 // shadow a fully lifted tier casts on the tiers behind it
const MAX_LIFTS = 6

/** Frame → world mapping and everything that moves a disc, shared by FRAG and the hover hit test. */
interface Geo {
    apex: [number, number]
    step: [number, number]
    R: number
    colX: number
    colY: number
    n: number
    waveAmp: number
    waveW: number
    waveLag: number
    t: number
    view: [number, number]
    off: [number, number]
    par: [number, number]
    liftH: number
    shW: number
}

function geometry(p: SorbetTiersProps, W: number, H: number, t: number, pointer: [number, number], hov: number): Geo {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    W = Math.max(1, W)
    H = Math.max(1, H)
    const sc = Math.max(10, Math.min(300, num(p.scale, 100))) / 100
    // Framing at 100% per FIT_WIDTH / COVER_*; Scale then zooms about the top centre.
    const s = Math.max(H / REF_H, W / FIT_WIDTH, (W + COVER_B * H) / COVER_A) * sc
    const view: [number, number] = [W / s, H / s]
    const anchor = Math.max(0, Math.min(100, num(adv.anchorY, 0))) / 100
    const off: [number, number] = [(REF_W - view[0]) * 0.5, (REF_H - view[1]) * anchor]
    const pk =
        (Math.max(0, num(adv.parallax, 3)) / 100) * Math.min(1, Math.max(0, hov)) * (Math.max(0, num(adv.hover, 50)) / 50)
    const R = Math.max(10, num(adv.radius, 729))
    const stepY = Math.max(1, num(adv.stepY, 134))
    const periodS = Math.max(0.5, num(adv.wavePeriod, 8000) / 1000)
    const waveW = (Math.PI * 2) / periodS
    return {
        apex: [num(adv.apexX, 493), num(adv.apexY, 33)],
        step: [num(adv.stepX, 57), stepY],
        R,
        colX: R * COLUMN_SPACING,
        colY: stepY * 0.5,
        n: Math.max(1, Math.min(14, Math.round(num(p.count, 9)))),
        waveAmp: Math.max(0, num(adv.waveAmp, 10)) * (Math.max(0, Math.min(100, num(p.wave, 40))) / 40),
        waveW,
        waveLag: (Math.max(0, num(adv.waveLag, 350)) / 1000) * waveW,
        t,
        view,
        off,
        par: [(pointer[0] - 0.5) * 2 * pk * view[0], (pointer[1] - 0.5) * 2 * pk * view[1]],
        liftH: Math.max(0, num(adv.liftHeight, 36)) * (Math.max(0, Math.min(100, num(p.lift, 50))) / 50),
        shW: Math.max(1, num(adv.shadowWidth, 26)),
    }
}

const parity = (j: number) => ((j % 2) + 2) % 2

/** Centre of disc i in column j as drawn. FRAG's loop does the same arithmetic; keep them in step. */
function centre(g: Geo, i: number, j: number, lift: number): [number, number] {
    const top = g.apex[1] + g.step[1] * i + g.colY * parity(j)
    const w = 0.2 + 0.8 * Math.min(1, Math.max(0, (top - g.off[1]) / g.view[1]))
    const wave = g.waveAmp * (Math.sin(g.t * g.waveW - i * g.waveLag) + Math.sin(i * g.waveLag))
    return [g.apex[0] + g.step[0] * i + j * g.colX + g.par[0] * w, top + g.R + g.par[1] * w + wave - lift * g.liftH]
}

/** Front-most disc under world point (x, y), searched front to back exactly as FRAG does. */
function discAt(g: Geo, x: number, y: number, lifts: Map<string, number>): [number, number] | null {
    const m = g.liftH + Math.hypot(g.par[0], g.par[1]) + 2 * g.waveAmp + 1
    const iHi = Math.floor((y + m - g.apex[1]) / g.step[1])
    const iLo = Math.max(0, Math.floor((y - m - g.apex[1] - 2 * g.R - g.colY) / g.step[1]))
    for (let i = iHi; i >= iLo; i--) {
        const j0 = Math.ceil((x - g.apex[0] - g.step[0] * i - g.R - m) / g.colX)
        for (const odd of [1, 0]) {
            for (let j = j0; j < j0 + 4; j++) {
                if (parity(j) !== odd) continue
                const c = centre(g, i, j, lifts.get(`${i},${j}`) ?? 0)
                if (Math.hypot(x - c[0], y - c[1]) < g.R) return [i, j]
            }
        }
    }
    return null
}

/** Extra uniforms for this effect, set every frame. */
function effectUniforms(
    gl: WebGL2RenderingContext,
    u: (name: string) => WebGLUniformLocation | null,
    p: SorbetTiersProps,
    g: Geo,
    lifts: Float32Array
): void {
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const shadow = Math.max(0, Math.min(100, num(p.shadow, 0))) / 50
    const base = parseColor(p.baseColor, [0.94, 0.91, 0.89, 1])
    const ref = parseColor(DEFAULT_BASE, [0.94, 0.91, 0.89, 1])
    gl.uniform3f(u("uTint"), base[0] / ref[0], base[1] / ref[1], base[2] / ref[2])
    gl.uniform2f(u("uView"), g.view[0], g.view[1])
    gl.uniform2f(u("uOff"), g.off[0], g.off[1])
    gl.uniform2f(u("uPar"), g.par[0], g.par[1])
    gl.uniform1f(u("uCount"), g.n)
    gl.uniform2f(u("uApex"), g.apex[0], g.apex[1])
    gl.uniform2f(u("uStep"), g.step[0], g.step[1])
    gl.uniform1f(u("uR"), g.R)
    gl.uniform2f(u("uCol"), g.colX, g.colY)
    gl.uniform1f(u("uRimW"), Math.max(0, num(adv.rimWidth, 0)))
    gl.uniform1f(u("uFadeW"), Math.max(1, num(adv.fadeWidth, 134)))
    gl.uniform1f(u("uPaleMix"), Math.max(0, Math.min(100, num(adv.paleMix, 100))) / 100)
    gl.uniform1f(u("uShW"), g.shW)
    gl.uniform1f(u("uShDepth"), Math.min(1, (Math.max(0, num(adv.shadowDepth, 24)) / 100) * shadow))
    gl.uniform1f(u("uSpin"), num(adv.spinRate, 12) * DEG)
    gl.uniform1f(u("uWaveAmp"), g.waveAmp)
    gl.uniform1f(u("uWaveW"), g.waveW)
    gl.uniform1f(u("uWaveLag"), g.waveLag)
    gl.uniform4fv(u("uLift[0]"), lifts)
    gl.uniform1f(u("uLiftH"), g.liftH)
    gl.uniform4f(
        u("uAng"),
        num(adv.angleFar, -60) * DEG,
        num(adv.angleLeft, -28) * DEG,
        num(adv.angleTop, 2) * DEG,
        num(adv.angleRight, 40) * DEG
    )
    gl.uniform1f(u("uBackAng"), num(adv.angleBack, 150) * DEG)
    gl.uniform1f(u("uSat"), Math.max(0, num(adv.saturation, 100)) / 100)
    gl.uniform1f(u("uGrain"), Math.max(0, Math.min(100, num(adv.grain, 0))) / 100)
    gl.uniform1f(u("uVig"), Math.max(0, Math.min(100, num(adv.vignette, 0))) / 100)
}

const glf = (v: number) => v.toFixed(6)

/* A field of disc stacks in the 1000 × 1248 reference space (the poster's 576 × 719); the
   poster's own stack is column 0. Per pixel, discs are searched front to back (deepest key
   first) until the front one and, at its antialiased edge, the one behind are found. Each
   disc reads its rim and interior colour from RING at its (warped, spinning) angle and fades
   between them with depth; a lifted tier rises, blooms and casts a shadow on the tiers behind. */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uView;
uniform vec2 uOff;
uniform vec2 uPar;
uniform vec3 uBg;
uniform vec3 uTint;
uniform vec3 uAccent;
uniform sampler2D uRing;
uniform vec3 uPaleMean[9];
uniform float uCount;
uniform vec2 uApex;
uniform vec2 uStep;
uniform float uR;
uniform vec2 uCol;
uniform float uRimW;
uniform float uFadeW;
uniform float uPaleMix;
uniform float uShW;
uniform float uShDepth;
uniform float uSpin;
uniform float uWaveAmp;
uniform float uWaveW;
uniform float uWaveLag;
uniform vec4 uLift[${MAX_LIFTS}];
uniform float uLiftH;
uniform vec4 uAng;
uniform float uBackAng;
uniform float uSat;
uniform float uGrain;
uniform float uVig;
out vec4 outColor;

const float TAU = 6.28318530718;
const float FADE_SHAPE = ${glf(FADE_SHAPE)};
const float ROWS = ${glf(RING.length)};
const float COLUMN_PHASE = ${glf(COLUMN_PHASE)};
const float LIFT_BLOOM = ${glf(LIFT_BLOOM)};
const float LIFT_SHADOW = ${glf(LIFT_SHADOW)};

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

// Piecewise-linear warp: the stop controls move where each anchor's colour sits.
float warp(float th) {
    float a[5] = float[5](uAng.x, uAng.y, uAng.z, uAng.w, uBackAng);
    float A[5] = float[5](${STOP_ANCHORS.map((d) => glf(d * DEG)).join(", ")});
    for (int k = 0; k < 5; k++) {
        int k2 = (k == 4) ? 0 : k + 1;
        float span = max(mod(a[k2] - a[k], TAU), 1e-3);
        float loc = mod(th - a[k], TAU);
        if (loc < span) return A[k] + loc / span * mod(A[k2] - A[k], TAU);
    }
    return th;
}

float liftOf(float i, float j) {
    float l = 0.0;
    for (int k = 0; k < ${MAX_LIFTS}; k++) {
        vec4 q = uLift[k];
        if (q.z > 0.0 && abs(q.x - i) < 0.5 && abs(q.y - j) < 0.5) l += q.z;
    }
    return l;
}

vec3 shade(float fi, float fj, vec2 dv, float e, float lift) {
    float n = max(floor(uCount + 0.5), 1.0);
    float dir = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
    float th = atan(dv.x, -dv.y) - dir * uSpin * uTime + fj * COLUMN_PHASE;
    float u = warp(th) / TAU + 0.5;
    int pal = int(mod(mod(fi, n) + 4.0 * fj, 9.0) + 0.5) % 9;
    float row = float(pal * 2);
    vec3 rim = texture(uRing, vec2(u, (row + 0.5) / ROWS)).rgb;
    vec3 pale = texture(uRing, vec2(u, (row + 1.5) / ROWS)).rgb;
    // Past the fade the tint evens out toward the disc's mean, or the angular
    // variation would converge on the centre as spokes (seen at low Scale).
    pale = mix(pale, uPaleMean[pal], smoothstep(uFadeW, uR * 0.7, e));
    pale = clamp(pale * uTint, 0.0, 1.0);
    // A lifted tier's colour wells further in: depth is read stretched.
    float ee = e / (1.0 + lift * LIFT_BLOOM);
    float L = uFadeW * FADE_SHAPE;
    float f = clamp((1.0 - exp(-max(ee - uRimW, 0.0) / L)) / max(1.0 - exp(-uFadeW / L), 1e-4), 0.0, 1.0);
    vec3 dc = mix(rim, pale, uPaleMix * f);
    float l = dot(dc, vec3(0.299, 0.587, 0.114));
    return clamp(mix(vec3(l), dc, uSat), 0.0, 1.0);
}

void main() {
    vec2 q = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
    vec2 p = q * uView + uOff;
    float px = uView.x / uRes.x;
    float margin = 2.0 * uShW + length(uPar) + 2.0 * uWaveAmp + uLiftH + px;

    float iHi = floor((p.y + margin - uApex.y) / uStep.y);
    float iLo = max(0.0, floor((p.y - margin - uApex.y - 2.0 * uR - uCol.y) / uStep.y));
    bool f1 = false;
    bool f2 = false;
    bool done = false;
    float i1 = 0.0, j1 = 0.0, e1 = 0.0, l1 = 0.0, i2 = 0.0, j2 = 0.0, e2 = 0.0, l2 = 0.0;
    vec2 d1 = vec2(0.0), d2 = vec2(0.0);
    float sh = 0.0;
    for (int k = 0; k < 128; k++) {
        float fi = iHi - float(k);
        if (fi < iLo || done) break;
        float j0 = ceil((p.x - uApex.x - uStep.x * fi - uR - margin) / uCol.x);
        // Odd columns sit half a step lower, so at equal i they are in front.
        for (int pass = 0; pass < 2; pass++) {
            for (int jj = 0; jj < 4; jj++) {
                float fj = j0 + float(jj);
                float odd = mod(fj, 2.0);
                if (done || abs(odd - float(1 - pass)) > 0.5) continue;
                // Same arithmetic as centre() in TS.
                float top = uApex.y + uStep.y * fi + uCol.y * odd;
                float w = 0.2 + 0.8 * clamp((top - uOff.y) / uView.y, 0.0, 1.0);
                float lift = liftOf(fi, fj);
                vec2 c = vec2(uApex.x + uStep.x * fi + fj * uCol.x, top + uR) + uPar * w;
                // Offset by the t = 0 phase so the first frame is the poster's own stack.
                c.y += uWaveAmp * (sin(uTime * uWaveW - fi * uWaveLag) + sin(fi * uWaveLag)) - lift * uLiftH;
                vec2 dv = p - c;
                float e = uR - length(dv);
                if (e > -0.5 * px) {
                    if (!f1) {
                        f1 = true; i1 = fi; j1 = fj; e1 = e; l1 = lift; d1 = dv;
                        done = e > 0.5 * px;
                    } else {
                        f2 = true; i2 = fi; j2 = fj; e2 = e; l2 = lift; d2 = dv;
                        done = true;
                    }
                } else if (!f1) {
                    // A disc in front of whatever this pixel lands on, just past its edge.
                    float s1 = 1.0 - smoothstep(0.0, uShW * (1.0 + lift), -e);
                    sh = max(sh, s1 * s1 * min(1.0, uShDepth + lift * LIFT_SHADOW));
                }
            }
        }
    }

    vec3 col = uBg;
    if (f2) col = shade(i2, j2, d2, e2, l2);
    if (f1) {
        vec3 c1 = mix(shade(i1, j1, d1, e1, l1), uAccent, sh);
        col = mix(col, c1, clamp(e1 / px + 0.5, 0.0, 1.0));
    }

    vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));
    float r = length((uv - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0));
    col *= 1.0 - uVig * 0.85 * smoothstep(0.35, 1.1, r);
    float g = h21(gl_FragCoord.xy + fract(uTime * 7.0) * vec2(91.7, 37.3)) - 0.5;
    col += g * uGrain * 0.18;
    // One-step dither so the long rim-to-interior fades never band in 8 bits.
    col += (h21(gl_FragCoord.xy * 1.37) - 0.5) / 255.0;

    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

// ══ /EFFECT ═════════════════════════════════════════════════════════════════

export interface SorbetTiersProps extends EffectProps {
    background?: string
    /** Tints every disc's pale interior; at its default the interiors are the reference's own. */
    baseColor?: string
    /** Shadow colour: the shadow a lifted tier casts, and the contact shadow when Shadow is above 0. */
    accentColor?: string
    speed?: number
    /** How big the tiers draw. Below 100% the frame opens onto a wider field of stacks. */
    scale?: number
    style?: CSSProperties
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

export default function SorbetTiers(props: SorbetTiersProps) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", baseColor = "#EFE8E4", accentColor = "#9A92B4", speed = 100, scale = 133, lift = 50, style } = props
    void [baseColor, accentColor, speed, scale, lift]
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
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("SorbetTiers shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("SorbetTiers link:", gl.getProgramInfoLog(prog))
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

        // Angle wraps (REPEAT); rows never blend, sampled at their centres.
        const tex = gl.createTexture()
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, RING_BINS, RING.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, ringPixels())
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.uniform1i(u("uRing"), 0)
        gl.uniform3fv(u("uPaleMean[0]"), paleMeans())

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.round(root.offsetWidth * dpr))
            canvas.height = Math.max(1, Math.round(root.offsetHeight * dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        // Pointer as a 0–1 share of the frame, y down.
        let mx = 0.5
        let my = 0.5
        let tx = 0.5
        let ty = 0.5
        let over = 0
        let hov = 0
        // Measured against the box as displayed, so hover lands under the cursor
        // under canvas zoom or a scaled parent (offsetX would not).
        const onMove = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            tx = (e.clientX - r.left) / r.width
            ty = (e.clientY - r.top) / r.height
            over = 1
        }
        const onLeave = () => {
            over = 0
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerdown", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerup", onLeave)
        root.addEventListener("pointercancel", onLeave)

        // Lift per disc ("i,j" → 0..1), eased in real time so hover works at Speed 0.
        const lifts = new Map<string, number>()
        const liftBuf = new Float32Array(MAX_LIFTS * 4)

        let clock = 0
        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            clock = (clock + dt * (Math.max(0, Math.min(100, num(p.speed, 50))) / 50) * (reduced ? 0.25 : 1)) % 3600
            // Parallax is secondary motion and may ease; the lift below reads the raw pointer.
            const k = 1 - Math.exp(-dt * 6)
            mx += (tx - mx) * k
            my += (ty - my) * k
            hov += (over - hov) * k

            const g = geometry(p, root.offsetWidth, root.offsetHeight, clock, [mx, my], hov)
            const hit = over && g.liftH > 0 ? discAt(g, tx * g.view[0] + g.off[0], ty * g.view[1] + g.off[1], lifts) : null
            const hk = hit ? `${hit[0]},${hit[1]}` : ""
            if (hk && !lifts.has(hk)) lifts.set(hk, 0)
            for (const [key, v] of lifts) {
                const up = key === hk
                const nv = v + ((up ? 1 : 0) - v) * (1 - Math.exp(-dt / (up ? LIFT_RISE : LIFT_FALL)))
                if (!up && nv < 0.002) lifts.delete(key)
                else lifts.set(key, nv)
            }
            liftBuf.fill(0)
            Array.from(lifts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, MAX_LIFTS)
                .forEach(([key, v], idx) => {
                    const [i, j] = key.split(",").map(Number)
                    liftBuf.set([i, j, v, 0], idx * 4)
                })

            const bg = parseColor(p.background, [0.945, 0.937, 0.906, 1])
            const acc = parseColor(p.accentColor, [0.6, 0.57, 0.71, 1])
            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.uniform2f(u("uRes"), canvas.width, canvas.height)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform3f(u("uBg"), bg[0], bg[1], bg[2])
            gl.uniform3f(u("uAccent"), acc[0], acc[1], acc[2])
            effectUniforms(gl, u, p, g, liftBuf)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerdown", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerup", onLeave)
            root.removeEventListener("pointercancel", onLeave)
            gl.deleteTexture(tex)
        }
    }, [])

    // Fills whatever frame it is given; the old minWidth/minHeight made a
    // smaller frame crop a 1200 × 800 render instead of reframing it.
    return (
        <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}
