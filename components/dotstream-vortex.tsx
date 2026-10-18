"use client"

/**
 * DotMatrixVortex — Recreate the reference exactly. No description was given — read what it is and how it moves from the clip itself.
 *
 * Built on the Loader template (lib/templates/LoaderTemplate.tsx).
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
    scaleUp: 116,
    dotOuter: 15,
    dotInner: 5,
    pitch: 175,
    pitchInner: 140,
    hole: 14,
    spacing: 50,
    plateau: 40,
    fadeCurve: 130,
    headSize: 40,
    innerOpacity: 80,
    ghost: 16,
    revolution: 8000,
    twist: 50,
    reverse: false,
    startAngle: 180,
    phaseStep: 14,
    sweepJitter: 18,
    breathe: 15,
    breatheMs: 8000,
    breatheLag: 23,
    offsetX: 0,
    offsetY: 0,
    parallax: 6,
    hoverSpeed: 50,
    grain: 0,
    vignette: 0,
    hover: 50,
}

/** Effect-only props (≤ 3). Add matching rows at the end of addPropertyControls. */
interface EffectProps {
    rings?: number
    tail?: number
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
}

interface Effect {
    /** Extra rotation time gained from the pointer, in speed-scaled seconds. */
    boost: number
    grain: CanvasPattern | null
}

const VX_DEG = Math.PI / 180
const VX_TAU = Math.PI * 2

function vxClamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v))
}

function bakeEffect(stage: Stage, _p: Props): Effect {
    let grain: CanvasPattern | null = null
    if (typeof document !== "undefined") {
        const c = document.createElement("canvas")
        c.width = 128
        c.height = 128
        const g = c.getContext("2d")
        if (g) {
            const img = g.createImageData(128, 128)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255
                img.data[i] = v
                img.data[i + 1] = v
                img.data[i + 2] = v
                img.data[i + 3] = 255
            }
            g.putImageData(img, 0, 0)
            grain = stage.ctx.createPattern(c, "repeat")
        }
    }
    return { boost: 0, grain }
}

/**
 * One frame. `clock` is seconds of speed-scaled time; `progress` is 0..1
 * (eased) or null when indeterminate. (cx, cy) is the centre, `size` the
 * loader's diameter in CSS px.
 */
function drawEffect(stage: Stage, fx: Effect, p: Props, cx: number, cy: number, size: number, clock: number, progress: number | null, dt: number): void {
    const { ctx, W, H } = stage
    const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
    const outerC = parseColor(p.color, [1, 1, 1, 1])
    const innerC = parseColor(p.accent, [0.74, 0.74, 0.74, 1])
    const n = Math.round(vxClamp(num(p.rings, 24), 4, 40))
    const tailRad = vxClamp(num(p.tail, 260), 30, 350) * VX_DEG

    // Pointer: speeds the vortex up and pulls the inner rings toward it (tunnel parallax).
    const ptr = stage.pointer
    const hk = Math.max(0, num(adv.hover, 50)) / 50
    fx.boost += dt * (Math.max(0, num(adv.hoverSpeed, 50)) / 100) * (ptr.over + (ptr.down ? 1 : 0)) * hk
    const T = clock + fx.boost

    // Drawn diameter: size × scale-up, kept inside the frame.
    const diam = Math.max(20, Math.min((size * Math.max(10, num(adv.scaleUp, 116))) / 100, Math.min(W, H) * 0.92))
    const R = diam / 2
    const ccx = cx + (W * num(adv.offsetX, 0)) / 100
    const ccy = cy + (H * num(adv.offsetY, -2)) / 100
    const nx = vxClamp((ptr.x - ccx) / Math.max(1, R), -1, 1)
    const ny = vxClamp((ptr.y - ccy) / Math.max(1, R), -1, 1)
    const pull = (diam * Math.max(0, num(adv.parallax, 6))) / 100 * ptr.over * hk

    const revS = Math.max(0.5, num(adv.revolution, 8000) / 1000)
    const baseW = VX_TAU / revS
    const k = (vxClamp(num(adv.twist, 50), 0, 100) / 100) * 1.2
    const dir = adv.reverse ? 1 : -1 // -1 = counter-clockwise on screen
    const hole = vxClamp(num(adv.hole, 14), 2, 90) / 100
    const spc = vxClamp(num(adv.spacing, 50), 0, 100) / 100
    const plateau = vxClamp(num(adv.plateau, 40), 0, 95) / 100
    const curve = Math.max(0.1, num(adv.fadeCurve, 130) / 100)
    const headK = vxClamp(num(adv.headSize, 40), 0, 90) / 100
    const innerOp = vxClamp(num(adv.innerOpacity, 80), 0, 100) / 100
    const ghost = vxClamp(num(adv.ghost, 16), 0, 100) / 100
    const jitter = vxClamp(num(adv.sweepJitter, 18), 0, 100) / 100
    const breathe = vxClamp(num(adv.breathe, 15), 0, 100) / 100
    const breatheS = Math.max(0.5, num(adv.breatheMs, 8000) / 1000)
    const lag = num(adv.breatheLag, 23) * VX_DEG
    const pitchO = Math.max(1.05, num(adv.pitch, 175) / 100)
    const pitchI = Math.max(1.05, num(adv.pitchInner, 140) / 100)
    const dOuter = Math.max(0.5, num(adv.dotOuter, 15))
    const dInner = Math.max(0.5, num(adv.dotInner, 5))
    const start = num(adv.startAngle, 180) * VX_DEG
    const phaseStep = num(adv.phaseStep, 14) * VX_DEG

    for (let j = 0; j < n; j++) {
        const s = n > 1 ? j / (n - 1) : 0 // 0 = outermost, 1 = innermost
        // Tunnel spacing: wide gaps outside, tight toward the hole.
        const f = (1 - s) * (1 - spc) + (1 - s) * (1 - s) * spc
        const r = R * (hole + (1 - hole) * f)
        const rr = Math.max(0.01, r / Math.max(1, R))
        const dotD = (diam * (dOuter + (dInner - dOuter) * s)) / 1000
        const rad = Math.max(0.5, dotD / 2)
        const pitch = Math.max(2, dotD * (pitchO + (pitchI - pitchO) * s))
        const count = Math.max(6, Math.round((VX_TAU * r) / pitch))
        const step = VX_TAU / count
        const m = Math.max(1, Math.round(Math.pow(1 / rr, k)))
        const head = start + j * Math.PI + j * phaseStep + dir * m * baseW * T
        let sweep = tailRad * (1 + jitter * Math.sin(j * 2.39 + 0.7)) * (1 + breathe * Math.sin((VX_TAU * T) / breatheS - j * lag))
        if (progress !== null) sweep *= Math.max(0.02, progress)
        sweep = vxClamp(sweep, step, VX_TAU - step)

        const cr = outerC[0] + (innerC[0] - outerC[0]) * s
        const cg = outerC[1] + (innerC[1] - outerC[1]) * s
        const cb = outerC[2] + (innerC[2] - outerC[2]) * s
        const ca = outerC[3] + (innerC[3] - outerC[3]) * s
        const ringA = (1 + (innerOp - 1) * s) * ca
        ctx.fillStyle = `rgb(${Math.round(cr * 255)}, ${Math.round(cg * 255)}, ${Math.round(cb * 255)})`

        const shift = pull * (0.25 + 0.75 * s)
        const rcx = ccx + nx * shift
        const rcy = ccy + ny * shift

        const lit = Math.min(count, Math.floor(sweep / step) + 1)

        // Dim remainder of the ring, one path, at the tail's dot size.
        if (ghost > 0 && lit < count) {
            const gr = Math.max(0.4, rad * (1 - headK))
            ctx.globalAlpha = ghost * ringA
            ctx.beginPath()
            for (let d = lit; d < count; d++) {
                const a = head - dir * d * step
                const x = rcx + Math.cos(a) * r
                const y = rcy + Math.sin(a) * r
                ctx.moveTo(x + gr, y)
                ctx.arc(x, y, gr, 0, VX_TAU)
            }
            ctx.fill()
        }

        // Lit arc: bright, large dots at the head, fading and shrinking along the tail.
        for (let d = 0; d < lit; d++) {
            const u = d * step
            const fr = u / sweep
            const a01 = fr < plateau ? 1 : Math.pow(Math.max(0, 1 - (fr - plateau) / Math.max(1e-4, 1 - plateau)), curve)
            const alpha = Math.max(ghost, a01) * ringA
            if (alpha < 0.004) continue
            const a = head - dir * u
            const dr = Math.max(0.4, rad * (1 - headK * (1 - a01)))
            ctx.globalAlpha = alpha
            ctx.beginPath()
            ctx.arc(rcx + Math.cos(a) * r, rcy + Math.sin(a) * r, dr, 0, VX_TAU)
            ctx.fill()
        }
    }
    ctx.globalAlpha = 1

    const vig = vxClamp(num(adv.vignette, 0), 0, 100) / 100
    if (vig > 0) {
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) / 2)
        g.addColorStop(0, "rgba(0, 0, 0, 0)")
        g.addColorStop(1, `rgba(0, 0, 0, ${vig})`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
    }
    const grain = vxClamp(num(adv.grain, 0), 0, 100) / 100
    if (grain > 0 && fx.grain) {
        ctx.save()
        ctx.globalAlpha = grain * 0.18
        ctx.translate(-Math.random() * 128, -Math.random() * 128)
        ctx.fillStyle = fx.grain
        ctx.fillRect(0, 0, W + 128, H + 128)
        ctx.restore()
    }
}
// ══ /EFFECT ═════════════════════════════════════════════════════════════════

interface Props extends EffectProps {
    background?: string
    color?: string
    accent?: string
    size?: number
    speed?: number
    /** 0–100 for a determinate loader; omit for indeterminate. No panel row. */
    progress?: number
    style?: CSSProperties
}
interface Stage {
    ctx: CanvasRenderingContext2D
    W: number
    H: number
    dpr: number
    /**
     * The pointer over the stage, for the effect's pointer response (RULES.md):
     * x, y in CSS px; `over` eases to 1 while it is over the stage and back to 0
     * after; `down` while pressed. Scale the response by the Advanced `hover` row.
     */
    pointer: StagePointer
}
interface StagePointer {
    x: number
    y: number
    over: number
    down: boolean
}

function num(v: unknown, d: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : d
}

export default function DotMatrixVortex(props: Props) {
    // Read live from propsRef; destructured here so their defaults sit in the signature.
    const { background = "#000000", color = "#FFFFFF", accent = "#18FF00", size = 470, speed = 50, style } = props
    void [color, accent, size, speed]
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!root || !canvas || !ctx) return
        const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const stage: Stage = { ctx, W: 0, H: 0, dpr: 1, pointer: { x: 0, y: 0, over: 0, down: false } }
        const resize = () => {
            stage.W = root.offsetWidth
            stage.H = root.offsetHeight
            stage.dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.round(stage.W * stage.dpr))
            canvas.height = Math.max(1, Math.round(stage.H * stage.dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        // The pointer, for the effect's pointer response. offsetX/Y, never
        // getBoundingClientRect: that carries the canvas zoom.
        let pointerInside = false
        const onPointerMove = (e: PointerEvent) => {
            stage.pointer.x = e.offsetX
            stage.pointer.y = e.offsetY
            pointerInside = true
        }
        const onPointerLeave = () => {
            pointerInside = false
            stage.pointer.down = false
        }
        const onPointerDown = () => {
            stage.pointer.down = true
        }
        const onPointerUp = () => {
            stage.pointer.down = false
        }
        canvas.addEventListener("pointermove", onPointerMove)
        canvas.addEventListener("pointerenter", onPointerMove)
        canvas.addEventListener("pointerleave", onPointerLeave)
        canvas.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointerup", onPointerUp)
        window.addEventListener("pointercancel", onPointerUp)

        let fx: Effect | null = null
        let key = ""
        let shown = 0
        let clock = 0
        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            stage.pointer.over += ((pointerInside ? 1 : 0) - stage.pointer.over) * (1 - Math.exp(-8 * dt))
            last = now
            const p = propsRef.current
            const next = JSON.stringify([stage.W, stage.H, stage.dpr])
            if (next !== key || !fx) {
                key = next
                fx = bakeEffect(stage, p)
            }
            const rate = (Math.max(0, Math.min(100, num(p.speed, 50))) / 50) * (reduced ? 0.25 : 1)
            const animDt = dt * rate
            clock += animDt
            const target = typeof p.progress === "number" && Number.isFinite(p.progress) ? Math.max(0, Math.min(1, p.progress / 100)) : null
            if (target !== null) shown += (target - shown) * (1 - Math.exp(-8 * dt))
            const sz = Math.max(20, Math.min(800, num(p.size, 160)))
            ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0)
            ctx.clearRect(0, 0, stage.W, stage.H)
            drawEffect(stage, fx, p, stage.W / 2, stage.H / 2, sz, clock, target === null ? null : shown, animDt)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", onPointerMove)
            canvas.removeEventListener("pointerenter", onPointerMove)
            canvas.removeEventListener("pointerleave", onPointerLeave)
            canvas.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointerup", onPointerUp)
            window.removeEventListener("pointercancel", onPointerUp)
            ro.disconnect()
        }
    }, [])

    return (
        <div ref={rootRef} role="progressbar" aria-busy="true" style={{ position: "relative", minWidth: 1200, minHeight: 800, overflow: "hidden", background, ...style }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}
