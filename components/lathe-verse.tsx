"use client"

import * as React from "react"
import type { CSSProperties } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    periodMs: 5000,
    phase: 31,
    rowLag: 17,
    drive: 200,
    heightMax: 91,
    heightMin: 15,
    centerY: 50,
    gridWidth: 116,
    columns: 29,
    glyphScale: 0,
    lagCurve: 100,
    glyphOpacity: 100,
    additive: true,
    hoverRadius: 16,
    hoverLift: 60,
    hoverBright: 40,
    pressBoost: 100,
    pointerEaseMs: 320,
    grain: 0,
    vignette: 0,
    hover: 50,
    // Added with the drum:
    depth: 8,
    backOpacity: 22,
    hoverBoost: 150,
    hoverSwell: 40,
    fling: 60,
}

type Advanced = typeof ADVANCED_DEFAULTS

const DEFAULT_FAMILY = `Inter, "Helvetica Neue", Helvetica, Arial, sans-serif`
const TAU = Math.PI * 2

/** Spin 100 turns the drum this many rad a second. */
const SPIN_UNIT = 0.6
/** Twist 100 turns the top and bottom rows this far (rad) round the drum. */
const TWIST_UNIT = 1.5
/** Seconds for the speed to glide to a new rate, so hover never lurches. */
const RATE_EASE = 0.6
/** Seconds for local pointer effects to catch up with the pointer. */
const POINTER_LAG = 0.12
/** A throw coasts out over FLING_DECAY (s), never faster than FLING_MAX (rad/s). */
const FLING_DECAY = 0.9
const FLING_MAX = 8
/** The narrowest an edge-on letter gets, so it stays a visible sliver. */
const SLIVER = 0.05
/** Letter sprites are drawn this much finer than the screen so a swell stays crisp. */
const OVERSAMPLE = 1.5

export interface LatheVerseProps {
    text?: string
    /** 0–100: wave rate; 50 is the reference. */
    speed?: number
    size?: number
    rows?: number
    /** 0–100: how far the edge columns trail the centre. */
    lag?: number
    /** -100–100: drum rotation; negative turns left. */
    spin?: number
    /** 0–100: how far the rows wind round the drum into a helix. */
    twist?: number
    baseColor?: string
    background?: string
    font?: CSSProperties
    advanced?: Partial<Advanced>
    style?: CSSProperties
}

/**
 * Lathe Verse — a grid of one repeated line of text wrapped round a turning
 * drum. Every gap between rows opens and closes on a travelling wave that
 * starts at the centre and spreads out across columns and along rows.
 * Letters keep their size, so closed gaps pile whole rows on top of each
 * other into bright bars: lens → square → hourglass → flat bar → lens.
 *
 * Built after "Wandering Lips" (GridSameLine); its code is the base here and
 * its names and tuning values are kept. Changes:
 *   - Drum. Columns sit on a cylinder that rotates (Spin), foreshortening to
 *     slivers at the edges with the back face dim and mirrored. Columns is
 *     still the count across the front. Twist winds the rows into a helix.
 *   - Smooth. The overdriven sine is smoothstepped into its holds instead of
 *     clamped, the rate glides between speeds, and pointer effects trail the
 *     pointer instead of jumping.
 *   - Fast. Each letter is rasterised once and stamped (fillText per glyph per
 *     frame is what made big grids lag), and the loop idles off screen.
 *   - Hover. Hovering speeds everything up (Hover Boost), letters under the
 *     pointer swell, sideways travel flings the drum, and Hover Bright now
 *     works at full opacity (it multiplied an alpha clamped to 1 before).
 *   - Frame. The 1200×800 min size and `touch-action: none` are gone, so it
 *     fits any frame and the page still scrolls under a finger.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function LatheVerse(props: LatheVerseProps) {
    const {
        text = "TEXT-COMPONENT",
        speed = 50,
        size = 14,
        rows = 21,
        lag = 100,
        spin = 40,
        twist = 82,
        baseColor = "#00C6FF",
        background = "#000000",
        font = {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Inter","fontWeight":400,"lineHeight":"1.5em","letterSpacing":"0em"},
        style,
    } = props

    const rootRef = React.useRef<HTMLDivElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const cfgRef = React.useRef({ text, speed, size, rows, lag, spin, twist, baseColor, font, advanced: props.advanced })
    cfgRef.current = { text, speed, size, rows, lag, spin, twist, baseColor, font: font || {}, advanced: props.advanced }

    React.useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let W = 0
        let H = 0
        let dpr = 1
        const resize = () => {
            W = root.offsetWidth
            H = root.offsetHeight
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        // Off screen, the loop idles instead of drawing.
        let visible = true
        const io = new IntersectionObserver(([e]) => {
            visible = e.isIntersecting
        })
        io.observe(root)

        // grain tile
        const noise = document.createElement("canvas")
        noise.width = 128
        noise.height = 128
        const nctx = noise.getContext("2d")
        let grainPattern: CanvasPattern | null = null
        if (nctx) {
            const img = nctx.createImageData(128, 128)
            for (let i = 0; i < img.data.length; i += 4) {
                img.data[i] = 255
                img.data[i + 1] = 255
                img.data[i + 2] = 255
                img.data[i + 3] = Math.floor(Math.random() * 255)
            }
            nctx.putImageData(img, 0, 0)
            grainPattern = ctx.createPattern(noise, "repeat")
        }

        const reduced =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        // pointer — in the canvas's own CSS pixels even when Framer scales the
        // frame (offsetX does not account for that). `dx` gathers sideways
        // travel between frames for the fling.
        const ptr = { x: 0, y: 0, dx: 0, inside: false, pressed: false, over: 0, down: 0 }
        const at = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            const x = (e.clientX - r.left) * (W / (r.width || 1))
            if (ptr.inside) ptr.dx += x - ptr.x
            ptr.x = x
            ptr.y = (e.clientY - r.top) * (H / (r.height || 1))
            ptr.inside = true
        }
        const onLeave = () => {
            ptr.inside = false
        }
        const onDown = (e: PointerEvent) => {
            at(e)
            ptr.pressed = true
        }
        const onUp = () => {
            ptr.pressed = false
        }
        root.addEventListener("pointermove", at)
        root.addEventListener("pointerenter", at)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        // Each letter is rasterised once and stamped thereafter.
        type Sprite = { img: HTMLCanvasElement; hw: number; hh: number }
        let sprites = new Map<string, Sprite>()
        let spriteKey = ""
        const onFonts = () => {
            spriteKey = ""
        }
        document.fonts?.addEventListener?.("loadingdone", onFonts)
        const spriteOf = (ch: string, fontCss: string, sizePx: number, color: string, S: number): Sprite => {
            let sp = sprites.get(ch)
            if (sp) return sp
            const img = document.createElement("canvas")
            const sctx = img.getContext("2d")
            ctx.font = fontCss
            const pad = sizePx * 0.4
            img.width = Math.max(1, Math.ceil((ctx.measureText(ch).width + pad * 2) * S))
            img.height = Math.max(1, Math.ceil(sizePx * 1.6 * S))
            if (sctx) {
                sctx.scale(S, S)
                sctx.font = fontCss
                sctx.textAlign = "center"
                sctx.textBaseline = "middle"
                sctx.fillStyle = color
                sctx.fillText(ch, img.width / S / 2, img.height / S / 2)
            }
            sp = { img, hw: img.width / 2, hh: img.height / 2 }
            sprites.set(ch, sp)
            return sp
        }

        let gaps = new Float32Array(64)
        let pos = new Float32Array(64)
        let rowSin = new Float32Array(64)
        let rowCos = new Float32Array(64)

        let lastFont = ""
        let raf = 0
        let last = -1
        let clock = 0
        let angle = 0
        let fling = 0
        let gear = 1
        let px = 0
        let py = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            if (!visible) {
                last = -1
                return
            }
            const dt = last < 0 ? 0 : Math.min(1 / 20, (now - last) / 1000)
            last = now
            const ease = (tau: number) => 1 - Math.exp(-dt / tau)
            const cfg = cfgRef.current
            const adv: Advanced = { ...ADVANCED_DEFAULTS, ...(cfg.advanced ?? {}) }
            const k = Math.max(0, adv.hover) / 50

            // pointer easing
            const easeS = Math.max(0.016, adv.pointerEaseMs / 1000)
            const a = ease(easeS / 3)
            ptr.over += ((ptr.inside ? 1 : 0) - ptr.over) * a
            ptr.down += ((ptr.pressed ? 1 : 0) - ptr.down) * a
            px += (ptr.x - px) * ease(POINTER_LAG)
            py += (ptr.y - py) * ease(POINTER_LAG)

            // Hover and press both gear up; the gear glides so speed never steps.
            const gearTo =
                (1 + (ptr.inside ? 1 : 0) * (adv.hoverBoost / 100) * k) *
                (1 + (ptr.pressed ? 1 : 0) * (adv.pressBoost / 100) * k)
            gear += (gearTo - gear) * ease(RATE_EASE)
            clock += dt * (Math.max(0, cfg.speed) / 50) * gear

            if (W <= 0 || H <= 0) return
            const side = Math.min(W, H)
            const gridW = (side * adv.gridWidth) / 100
            const R = gridW / 2

            // Spin, plus a fling from sideways pointer travel that coasts out.
            // The impulse is scaled by 1/FLING_DECAY so the total extra turn is
            // Fling × the angle the pointer swept across the drum.
            if (!reduced && ptr.dx !== 0 && R > 0) {
                fling += ((ptr.dx / R) * (adv.fling / 100) * k) / FLING_DECAY
                fling = Math.max(-FLING_MAX, Math.min(FLING_MAX, fling))
            }
            ptr.dx = 0
            fling *= Math.exp(-dt / FLING_DECAY)
            if (!reduced) angle = (angle + dt * ((cfg.spin / 100) * SPIN_UNIT * gear + fling)) % TAU

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalCompositeOperation = "source-over"
            ctx.globalAlpha = 1
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            const f = cfg.font || {}
            const family = f.fontFamily || DEFAULT_FAMILY
            const weight = f.fontWeight || 400
            const fstyle = f.fontStyle || "normal"
            const sizePx = Math.max(4, cfg.size)
            const fontCss = `${fstyle} ${weight} ${sizePx}px ${family}`
            if (fontCss !== lastFont) {
                lastFont = fontCss
                document.fonts?.load?.(fontCss).then(onFonts).catch(() => {})
            }
            const S = dpr * OVERSAMPLE
            const key = `${fontCss}|${cfg.baseColor}|${S}`
            if (key !== spriteKey) {
                spriteKey = key
                sprites = new Map()
            }
            ctx.globalCompositeOperation = adv.additive ? "lighter" : "source-over"

            const chars: string[] = Array.from(String(cfg.text || " "))
            const len = chars.length
            // Columns counts the front face, so the drum carries twice as many,
            // snapped to whole repeats of the text so the wrap has no seam.
            const front = Math.max(1, Math.round(adv.columns))
            const wanted = front * 2
            const cols = len <= wanted ? len * Math.max(1, Math.round(wanted / len)) : wanted
            const pitchAngle = TAU / cols
            const halfSpan = Math.max(1, R * Math.cos(pitchAngle / 2))
            const cx = W / 2
            const cy = (H * adv.centerY) / 100
            const nRows = Math.max(1, Math.round(cfg.rows))
            if (gaps.length < nRows) {
                gaps = new Float32Array(nRows + 16)
                pos = new Float32Array(nRows + 16)
                rowSin = new Float32Array(nRows + 16)
                rowCos = new Float32Array(nRows + 16)
            }
            const K = Math.max(0.5, (nRows - 1) / 2)
            const hMaxF = Math.max(0.01, adv.heightMax / 100)
            const fullGap = nRows > 1 ? (side * hMaxF) / (nRows - 1) : 0
            const sMin = Math.max(0, Math.min(1, adv.heightMin / 100))
            const drive = Math.max(1, adv.drive / 100)
            const period = Math.max(0.1, adv.periodMs / 1000)
            // Lags are fractions of one cycle, so they scale with it.
            const cyc = reduced ? 0.3 : clock / period + adv.phase / 100
            const lagX = (Math.max(0, cfg.lag) / 50) * 0.23
            const lagY = Math.max(0, adv.rowLag) / 100
            const curveMix = Math.max(0, Math.min(1, adv.lagCurve / 100))
            const baseAlpha = Math.max(0, Math.min(1, adv.glyphOpacity / 100))
            const backA = Math.max(0, Math.min(1, adv.backOpacity / 100))
            const depth = Math.max(0, adv.depth / 100)
            const hoverR = Math.max(1, (gridW * adv.hoverRadius) / 100)
            const invR2 = 1 / (hoverR * hoverR)
            const lift = (adv.hoverLift / 100) * k * ptr.over
            const bright = (adv.hoverBright / 100) * k * ptr.over
            const swell = (adv.hoverSwell / 100) * k * ptr.over
            const gScale = Math.max(0, adv.glyphScale / 100)

            // Twist: every column shares the same per-row turn, so its sin/cos
            // is taken once here and combined by angle addition below.
            const twistRad = (Math.max(0, cfg.twist) / 100) * TWIST_UNIT
            for (let r = 0; r < nRows; r++) {
                const o = ((r - (nRows - 1) / 2) / K) * twistRad
                rowSin[r] = Math.sin(o)
                rowCos[r] = Math.cos(o)
            }

            for (let c = 0; c < cols; c++) {
                const ch = chars[c % len]
                if (!ch.trim()) continue
                const sp = spriteOf(ch, fontCss, sizePx, cfg.baseColor, S)
                const th = c * pitchAngle + angle
                const sc = Math.sin(th)
                const zc = Math.cos(th)
                // The lens is measured from the screen centre, as in the flat
                // grid, so it holds still while the letters orbit through it.
                const d = Math.min(1, Math.abs(R * sc) / halfSpan)
                const shaped = d + ((1 - Math.cos(Math.PI * d)) / 2 - d) * curveMix
                const colPhase = cyc - lagX * shaped

                let g = 0
                if (lift > 0 || bright > 0 || swell > 0) {
                    const dx = (cx + R * sc - px) / hoverR
                    g = Math.exp(-dx * dx) * Math.max(0, zc)
                }
                const gl = Math.min(1, g * lift)

                // Each gap opens and closes on an overdriven sine: it holds
                // open, holds piled, and moves quickly between. Smoothstepped
                // rather than clamped, so it eases into each hold.
                pos[0] = 0
                for (let r = 0; r < nRows - 1; r++) {
                    const m = r + 0.5 - (nRows - 1) / 2
                    const dy = Math.abs(m) / K
                    const u = Math.max(0, Math.min(1, 0.5 + 0.5 * drive * Math.sin(TAU * (colPhase - lagY * dy))))
                    let s = sMin + (1 - sMin) * u * u * (3 - 2 * u)
                    s += (1 - s) * gl
                    gaps[r] = s
                    pos[r + 1] = pos[r] + s * fullGap
                }
                const mid = (pos[0] + pos[nRows - 1]) / 2
                const glow = 1 + g * bright

                for (let r = 0; r < nRows; r++) {
                    const s = sc * rowCos[r] + zc * rowSin[r]
                    const z = zc * rowCos[r] - sc * rowSin[r]
                    const pp = (1 + depth * z) / (1 + depth)
                    const x = cx + R * s * pp
                    const y = cy + (pos[r] - mid) * pp
                    let sy = 1
                    if (gScale > 0) {
                        const sa = r > 0 ? gaps[r - 1] : gaps[0]
                        const sb = r < nRows - 1 ? gaps[r] : sa
                        const sLocal = nRows > 1 ? (sa + sb) / 2 : 1
                        sy = Math.max(0.002, 1 - (1 - sLocal) * gScale)
                    }
                    // Swell: letters facing you near the pointer grow.
                    let kk = pp / S
                    if (swell > 0 && z > 0) {
                        const ex = x - px
                        const ey = y - py
                        const q = (ex * ex + ey * ey) * invR2
                        if (q < 9) kk *= 1 + swell * z * Math.exp(-q)
                    }
                    const face = (z + 1) / 2
                    const sx = z >= 0 ? Math.max(SLIVER, z) : Math.min(-SLIVER, z)
                    const alpha = baseAlpha * (backA + (1 - backA) * face * face) * glow
                    ctx.setTransform(dpr * sx * kk, 0, 0, dpr * kk * sy, dpr * x, dpr * y)
                    ctx.globalAlpha = Math.min(1, alpha)
                    ctx.drawImage(sp.img, -sp.hw, -sp.hh)
                    // Brightness past full opacity: stamp again with the excess.
                    if (alpha > 1.01 && adv.additive) {
                        ctx.globalAlpha = Math.min(1, alpha - 1)
                        ctx.drawImage(sp.img, -sp.hw, -sp.hh)
                    }
                }
            }

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalCompositeOperation = "source-over"

            if (adv.grain > 0 && grainPattern) {
                const ox = Math.floor(Math.random() * 128)
                const oy = Math.floor(Math.random() * 128)
                ctx.globalAlpha = Math.min(1, (adv.grain / 100) * 0.5)
                ctx.fillStyle = grainPattern
                ctx.setTransform(1, 0, 0, 1, ox, oy)
                ctx.fillRect(-ox, -oy, canvas.width, canvas.height)
                ctx.setTransform(1, 0, 0, 1, 0, 0)
            }
            if (adv.vignette > 0) {
                const cw = canvas.width
                const chh = canvas.height
                const r0 = Math.min(cw, chh) * 0.3
                const r1 = Math.hypot(cw, chh) / 2
                const grad = ctx.createRadialGradient(cw / 2, chh / 2, r0, cw / 2, chh / 2, r1)
                grad.addColorStop(0, "rgba(0,0,0,0)")
                grad.addColorStop(1, "rgba(0,0,0,1)")
                ctx.globalAlpha = Math.min(1, adv.vignette / 100)
                ctx.fillStyle = grad
                ctx.fillRect(0, 0, cw, chh)
            }
            ctx.globalAlpha = 1
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            io.disconnect()
            document.fonts?.removeEventListener?.("loadingdone", onFonts)
            root.removeEventListener("pointermove", at)
            root.removeEventListener("pointerenter", at)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            role="img"
            aria-label={text}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                // Vertical page scroll survives; sideways swipes fling the drum.
                touchAction: "pan-y",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}
