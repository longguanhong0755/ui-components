"use client"

/**
 * AbacusWire — a stack of copies of one word, each sliding along its own
 * hairline from one side of a column to the other in a wave down the rows.
 *
 * Refined from the user's StackCopiesWord. Every control and key is kept.
 * Changes (scaling):
 * - No minWidth/minHeight: the original pinned the root at 1200×800, so any
 *   smaller frame cropped the component instead of fitting it.
 * - Letters scaled with the frame's height only, so a narrow frame pushed the
 *   word past its column. They now fit the 1200×800 stage on both axes.
 * - Pointer measured against the displayed box (offsetX/Y ignored canvas zoom
 *   and parent scale), kept as a 0–1 share of the frame.
 * - The stack fills the frame with whole rows at any Scale: smaller adds rows,
 *   larger drops them, none is cut. Rows is now the fewest rows shown.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
import * as React from "react"
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

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    cycleMs: 6000,
    rampMs: 1540,
    rowLagMs: 96,
    startOffsetMs: 0,
    columnLeft: 50,
    columnRight: 100,
    centerY: 50,
    rowPitch: 106,
    easeIn: 45,
    easeOut: 35,
    textOpacity: 100,
    lineWeight: 1,
    lineOpacity: 80,
    linePad: 28,
    lineMinGap: 10,
    lineCenter: 50,
    grain: 0,
    vignette: 0,
}

/** Pointer response, a top-level group. Fallbacks for when it arrives unopened. */
const HOVER_DEFAULTS = {
    hover: 50,
    hoverReach: 3,
    hoverPull: 60,
    hoverEaseMs: 400,
    pressBoost: 200,
}

/** The stage the type sizes are designed on. The frame fits it on both axes. */
const STAGE_W = 1200
const STAGE_H = 800

interface FontValue {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    fontSize?: number | string
    letterSpacing?: number | string
    lineHeight?: number | string
}

export interface AbacusWireProps {
    text?: string
    font?: FontValue
    textColor?: string
    lineColor?: string
    background?: string
    rows?: number
    speed?: number
    stagger?: number
    scale?: number
    columnWidth?: number
    pointer?: Partial<typeof HOVER_DEFAULTS>
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
    style?: CSSProperties
}

function num(v: unknown, d: number) {
    return typeof v === "number" && isFinite(v) ? v : d
}

function clamp(v: number, lo: number, hi: number) {
    return v < lo ? lo : v > hi ? hi : v
}

function parsePx(v: unknown, d: number) {
    if (typeof v === "number" && isFinite(v)) return v
    if (typeof v === "string") {
        const n = parseFloat(v)
        if (isFinite(n)) return n
    }
    return d
}

function parseLetterSpacing(v: unknown, px: number) {
    if (typeof v === "number" && isFinite(v)) return v
    if (typeof v === "string") {
        const n = parseFloat(v)
        if (!isFinite(n)) return 0
        if (v.trim().endsWith("em")) return n * px
        if (v.trim().endsWith("%")) return (n / 100) * px
        return n
    }
    return 0
}

function familyStack(family: string) {
    const f = family && family.trim() ? family.trim() : "Inter"
    const head = f.includes(",") || f.includes('"') || f.includes("'") ? f : `"${f}"`
    return `${head}, "Helvetica Neue", Helvetica, Arial, sans-serif`
}

/** cubic-bezier(x1, 0, x2, 1) solved by bisection on x. */
function bezier(x: number, x1: number, x2: number) {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    let s = x
    for (let i = 0; i < 18; i++) {
        s = (lo + hi) / 2
        const m = 1 - s
        const bx = 3 * m * m * s * x1 + 3 * m * s * s * x2 + s * s * s
        if (bx < x) lo = s
        else hi = s
    }
    const m = 1 - s
    return 3 * m * s * s + s * s * s
}

/** Row progress over one cycle: rise, hold packed right, fall, hold packed left. */
function rowProgress(u: number, a: number, h: number) {
    const f = u - Math.floor(u)
    if (f < a) return f / a
    if (f < a + h) return 1
    if (f < 2 * a + h) return 1 - (f - a - h) / a
    return 0
}

export default function AbacusWire(props: AbacusWireProps) {
    const {
        text = "TEXT \nCOMPONENT",
        font = {
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: 20,
            letterSpacing: "0.02em",
            lineHeight: "1em",
        },
        textColor = "#0077FF",
        lineColor = "#008FFF",
        background = "#000000",
        rows = 26,
        speed = 25,
        stagger = 61,
        scale = 149,
        columnWidth = 100,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const live = useRef<AbacusWireProps>({})
    live.current = {
        text,
        font,
        textColor,
        lineColor,
        background,
        rows,
        speed,
        stagger,
        scale,
        columnWidth,
        pointer: props.pointer,
        advanced: props.advanced,
    }

    useEffect(() => {
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

        let isStatic = false
        try {
            isStatic =
                typeof window.matchMedia === "function" &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches
        } catch {}
        try {
            if (RenderTarget.current() === RenderTarget.thumbnail) isStatic = true
        } catch {}

        // Pointer, as a 0–1 share of the box as displayed, so it stays under
        // the cursor at any canvas zoom or parent scale.
        const ptr = { u: 0, v: 0, inside: false, down: false }
        const at = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            ptr.u = (e.clientX - r.left) / (r.width || 1)
            ptr.v = (e.clientY - r.top) / (r.height || 1)
            ptr.inside = true
        }
        const onLeave = () => {
            ptr.inside = false
            ptr.down = false
        }
        const onDown = (e: PointerEvent) => {
            at(e)
            ptr.down = true
        }
        const onUp = () => {
            ptr.down = false
        }
        root.addEventListener("pointermove", at)
        root.addEventListener("pointerenter", at)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        // Fonts: re-measure once the face arrives
        let fontEpoch = 0
        let requested = ""
        const fonts = document.fonts as FontFaceSet | undefined
        const onFonts = () => {
            fontEpoch++
        }
        fonts?.addEventListener?.("loadingdone", onFonts)

        // Grain tile, made once
        const noise = document.createElement("canvas")
        noise.width = 160
        noise.height = 160
        const nctx = noise.getContext("2d")
        let pattern: CanvasPattern | null = null
        if (nctx) {
            const img = nctx.createImageData(160, 160)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255
                img.data[i] = v
                img.data[i + 1] = v
                img.data[i + 2] = v
                img.data[i + 3] = 255
            }
            nctx.putImageData(img, 0, 0)
            pattern = ctx.createPattern(noise, "repeat")
        }

        // Glyph measurements
        let mKey = ""
        let glyphs: { ch: string; off: number; w: number; ink: boolean }[] = []
        let wordW = 0
        let capH = 0
        let xs = new Float64Array(0)

        let raf = 0
        let last = -1
        let t = 0
        let over = 0
        let downE = 0
        let sx = 0
        let sy = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000)
            last = now
            if (!W || !H) return

            const s = live.current
            const adv = { ...ADVANCED_DEFAULTS, ...(s.advanced ?? {}) }
            const hov = { ...HOVER_DEFAULTS, ...(s.pointer ?? {}) }

            const spd = Math.max(0, num(s.speed, 50)) / 50
            if (!isStatic) t += dt * spd

            // Pointer easing, in this frame's CSS pixels
            const px = ptr.u * W
            const py = ptr.v * H
            const hk = isStatic ? 0 : Math.max(0, num(hov.hover, 50)) / 50
            const tau = Math.max(0.02, num(hov.hoverEaseMs, 400) / 1000 / 3)
            const kE = dt > 0 ? 1 - Math.exp(-dt / tau) : 0
            over += ((ptr.inside ? 1 : 0) - over) * kE
            downE += ((ptr.down ? 1 : 0) - downE) * kE
            if (over < 0.001) {
                sx = px
                sy = py
            } else {
                const kP = dt > 0 ? 1 - Math.exp(-dt / 0.08) : 0
                sx += (px - sx) * kP
                sy += (py - sy) * kP
            }

            // Type. The size is designed on a 1200×800 stage; the frame fits
            // that stage on both axes, so a narrow frame shrinks the word
            // rather than pushing it past its column. (The original scaled by
            // H / 800 alone.)
            // The stack is a pattern, so it fills the frame with whole rows
            // instead of shrinking into a block (the original drew exactly
            // `rows` rows, so a lower Scale left a band of empty background,
            // and a higher one cut rows off at the edges). Rows is now the fewest the frame
            // holds: the letters shrink until that many fit.
            const f = s.font || {}
            const sc = Math.max(0.1, num(s.scale, 100) / 100)
            const fit = Math.min(W / STAGE_W, H / STAGE_H)
            const pitchK = Math.max(0.01, num(adv.rowPitch, 106) / 100)
            const minRows = Math.max(1, Math.round(num(s.rows, 26)))
            const fontPx = Math.max(
                4,
                Math.min(parsePx(f.fontSize, 20) * fit * sc, H / (minRows * pitchK))
            )
            const fontStr = `${f.fontStyle || "normal"} ${f.fontWeight || 500} ${fontPx.toFixed(2)}px ${familyStack(f.fontFamily || "Inter")}`
            const ls = parseLetterSpacing(f.letterSpacing ?? "0.02em", fontPx)
            const txt = String(s.text ?? "")

            const key = fontStr + "|" + ls + "|" + txt + "|" + fontEpoch
            if (key !== mKey) {
                mKey = key
                ctx.font = fontStr
                const chars = Array.from(txt)
                glyphs = []
                let prefix = ""
                for (let i = 0; i < chars.length; i++) {
                    glyphs.push({
                        ch: chars[i],
                        off: ctx.measureText(prefix).width + i * ls,
                        w: ctx.measureText(chars[i]).width,
                        ink: chars[i].trim() !== "",
                    })
                    prefix += chars[i]
                }
                wordW = chars.length
                    ? ctx.measureText(txt).width + (chars.length - 1) * ls
                    : 0
                const m = ctx.measureText("H")
                capH = m.actualBoundingBoxAscent || fontPx * 0.72
                if (xs.length !== chars.length) xs = new Float64Array(chars.length)
                if (fontStr !== requested && fonts?.load) {
                    requested = fontStr
                    fonts
                        .load(fontStr, txt || "H")
                        .then(() => {
                            fontEpoch++
                        })
                        .catch(() => {})
                }
            }

            // Background
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalCompositeOperation = "source-over"
            ctx.globalAlpha = 1
            ctx.clearRect(0, 0, W, H)
            ctx.fillStyle = s.background || "#000000"
            ctx.fillRect(0, 0, W, H)

            // Geometry
            // Width is the column's share of the frame (100% = edge to edge).
            // Column Left / Right in Advanced now only place it: the column is
            // centred on their midpoint and slid back inside the frame if needed.
            const cw = (W * clamp(num(s.columnWidth, 50), 10, 100)) / 100
            const mid =
                (W *
                    (clamp(num(adv.columnLeft, 25), 0, 100) +
                        clamp(num(adv.columnRight, 75), 0, 100))) /
                200
            const colL = clamp(mid - cw / 2, 0, Math.max(0, W - cw))
            const colR = Math.max(colL + 1, colL + cw)
            const D = Math.max(0, colR - colL - wordW)
            const pitch = fontPx * pitchK
            // Every whole row the frame holds: (n - 1) pitches plus one line of type.
            const n = Math.max(minRows, Math.floor((H - fontPx) / pitch) + 1)
            const cy = (H * num(adv.centerY, 50)) / 100
            const firstBase = cy - ((n - 1) * pitch) / 2 + capH / 2

            // Timing: at t = 0 the top row has just packed right and the wave runs down the stack
            const cycle = Math.max(100, num(adv.cycleMs, 6000)) / 1000
            const a = clamp(num(adv.rampMs, 1540) / 1000 / cycle, 0.01, 0.5)
            const h = (1 - 2 * a) / 2
            const k = num(adv.rowLagMs, 96) / 1000 / cycle
            const u0 = a + 0.002
            const tt = t + num(adv.startOffsetMs, 0) / 1000
            const w = clamp(1 - num(s.stagger, 60) / 100, 0.05, 1)
            const x1 = clamp(num(adv.easeIn, 45) / 100, 0, 1)
            const x2 = clamp(num(adv.easeOut, 35) / 100, 0, 1)
            const ng = glyphs.length

            // Pointer pull: rows near the cursor split where the cursor is
            const tgt = clamp((sx - colL) / (colR - colL), 0, 1)
            const reach = Math.max(0.5, num(hov.hoverReach, 3))
            const pull =
                (num(hov.hoverPull, 60) / 100) *
                hk *
                over *
                (1 + downE * (num(hov.pressBoost, 200) / 100 - 1))

            const lw = Math.max(1, num(adv.lineWeight, 1))
            const pad = (fontPx * num(adv.linePad, 28)) / 100
            const minSeg = Math.max(1, (fontPx * num(adv.lineMinGap, 10)) / 100)
            const textAlpha = clamp(num(adv.textOpacity, 100) / 100, 0, 1)
            const lineAlpha = clamp(num(adv.lineOpacity, 80) / 100, 0, 1)
            const lineLift = (capH * num(adv.lineCenter, 50)) / 100

            ctx.font = fontStr
            ctx.textBaseline = "alphabetic"
            ctx.textAlign = "left"

            for (let r = 0; r < n; r++) {
                const base = firstBase + r * pitch
                if (base < -pitch || base - capH > H + pitch) continue

                let p = rowProgress(tt / cycle + u0 - r * k, a, h)
                if (pull > 0.0005) {
                    const dr = (sy - (base - capH / 2)) / pitch
                    const g = Math.exp((-dr * dr) / (2 * reach * reach))
                    p += (tgt - p) * clamp(pull * g, 0, 1)
                }

                for (let i = 0; i < ng; i++) {
                    const d = ng > 1 ? ((ng - 1 - i) / (ng - 1)) * (1 - w) : 0
                    const e = bezier(clamp((p - d) / w, 0, 1), x1, x2)
                    xs[i] = colL + glyphs[i].off + D * e
                }

                ctx.globalAlpha = textAlpha
                ctx.fillStyle = s.textColor || "#FFFFFF"
                let headX = -1
                let tailX = -1
                for (let i = 0; i < ng; i++) {
                    if (!glyphs[i].ink) continue
                    ctx.fillText(glyphs[i].ch, xs[i], base)
                    if (headX < 0) headX = xs[i]
                    tailX = xs[i] + glyphs[i].w
                }

                // Hairlines only lead in to the first letter and out from the last
                ctx.globalAlpha = lineAlpha
                ctx.fillStyle = s.lineColor || "#BDBDBD"
                const ly = Math.round((base - lineLift - lw / 2) * dpr) / dpr
                if (headX < 0) {
                    ctx.fillRect(colL, ly, colR - colL, lw)
                } else {
                    const headEnd = headX - pad
                    if (headEnd - colL >= minSeg) ctx.fillRect(colL, ly, headEnd - colL, lw)
                    const tailStart = tailX + pad
                    if (colR - tailStart >= minSeg) ctx.fillRect(tailStart, ly, colR - tailStart, lw)
                }
            }

            // Overlays
            const gr = clamp(num(adv.grain, 0), 0, 100) / 100
            if (gr > 0 && pattern) {
                ctx.save()
                ctx.globalAlpha = gr * 0.35
                const ox = Math.random() * 160
                const oy = Math.random() * 160
                ctx.translate(-ox, -oy)
                ctx.fillStyle = pattern
                ctx.fillRect(ox, oy, W, H)
                ctx.restore()
            }
            const vg = clamp(num(adv.vignette, 0), 0, 100) / 100
            if (vg > 0) {
                const rad = Math.hypot(W, H) / 2
                const grad = ctx.createRadialGradient(W / 2, H / 2, rad * 0.35, W / 2, H / 2, rad)
                grad.addColorStop(0, "rgba(0,0,0,0)")
                grad.addColorStop(1, `rgba(0,0,0,${vg})`)
                ctx.globalAlpha = 1
                ctx.fillStyle = grad
                ctx.fillRect(0, 0, W, H)
            }
            ctx.globalAlpha = 1
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", at)
            root.removeEventListener("pointerenter", at)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            fonts?.removeEventListener?.("loadingdone", onFonts)
        }
    }, [])

    // No minWidth/minHeight: the original pinned the root at 1200×800, so the
    // component overflowed any smaller frame instead of fitting it.
    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                ...style,
                overflow: "hidden",
                background,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}

// Control order arranged in the builder.
