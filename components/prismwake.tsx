"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * Streetwear type ticker — rows of heavy caps, each phrase ramping dark → bright cyan,
 * every row scrolling right at its own speed behind a hard clip.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    rows: 28,
    rowSpacing: 100,
    blockInset: 0,
    blockCenter: 50,
    gap: 170,
    gapJitter: 40,
    trail: 350,
    trailStart: 5,
    trailMid: 38,
    trailMidAt: 45,
    variance: 10,
    heft: 6,
    speedMin: 175,
    speedMax: 350,
    shimmer: 6,
    shimmerMs: 6000,
    shimmerStagger: 200,
    seed: 7,
    hover: 50,
    hoverDim: 35,
    hoverSoft: 45,
    hoverDrag: 60,
    hoverSlow: 70,
    hoverEaseMs: 250,
    pressSlow: 100,
    pressGrow: 35,
    grain: 0,
    vignette: 0,
}

const DEFAULT_TEXT =
    "AUTHENTIC DENIM, SINCE. 1989, TRADEMARK, ORIGINAL CLOTHING, PREMIUM ART DESIGN LOS ANGELES, STREETWEAR MMXIVV, 14.09.1989, PREMIUM ART, FASHION"

// The reference's 10-row stanza: phrase indices per row, and the row pitch (px at a 19.5 px font).
const PLAN = [
    [0, 1, 2, 3],
    [4],
    [2, 3, 3],
    [5, 6, 0],
    [3, 7, 8, 6],
    [1, 2, 3],
    [4],
    [3, 3],
    [5, 6, 0, 1],
    [3, 7, 8],
]
const DELTAS = [19, 21, 23, 18, 20, 20, 21, 23, 23, 21]
const PITCH_FONT = 19.5

function mulberry(a: number) {
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function parseColor(c: any, fb: number[] = [48, 180, 232]): number[] {
    if (typeof c !== "string") return fb
    const s = c.trim()
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const parts = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
        if (parts.length >= 3 && parts.slice(0, 3).every((v) => isFinite(v))) return parts.slice(0, 3)
    }
    const h = s.match(/#([0-9a-f]{3,8})/i)
    if (h) {
        let x = h[1]
        if (x.length === 3 || x.length === 4) x = x.split("").map((ch) => ch + ch).join("")
        if (x.length >= 6) return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)]
    }
    return fb
}

function parsePx(v: any, fb: number): number {
    if (typeof v === "number" && isFinite(v)) return v
    if (typeof v === "string") {
        const n = parseFloat(v)
        if (isFinite(n)) return n
    }
    return fb
}

function parseSpacing(v: any, fontPx: number): number {
    if (typeof v === "number" && isFinite(v)) return v
    if (typeof v === "string") {
        const n = parseFloat(v)
        if (!isFinite(n)) return 0
        if (v.includes("em")) return n * fontPx
        return n
    }
    return 0
}

function fontFamilyOf(font: any): string {
    const fallback = `"Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif`
    const f = font && typeof font.fontFamily === "string" ? font.fontFamily.trim() : ""
    if (!f) return fallback
    const fam = /["',]/.test(f) ? f : `"${f}"`
    return `${fam}, ${fallback}`
}

export interface BlockAboutRowsFont {
    variant?: string
    fontSize?: number | string
    textAlign?: string
    fontFamily?: string
    fontWeight?: number | string
    lineHeight?: number | string
    letterSpacing?: number | string
    fontStyle?: string
}

export interface BlockAboutRowsAdvanced {
    rows?: number
    rowSpacing?: number
    blockInset?: number
    blockCenter?: number
    gap?: number
    gapJitter?: number
    trail?: number
    trailStart?: number
    trailMid?: number
    trailMidAt?: number
    variance?: number
    heft?: number
    speedMin?: number
    speedMax?: number
    shimmer?: number
    shimmerMs?: number
    shimmerStagger?: number
    seed?: number
    hover?: number
    hoverDim?: number
    hoverSoft?: number
    hoverDrag?: number
    hoverSlow?: number
    hoverEaseMs?: number
    pressSlow?: number
    pressGrow?: number
    grain?: number
    vignette?: number
}

export interface BlockAboutRowsProps {
    speed?: number
    scale?: number
    color?: string
    background?: string
    font?: BlockAboutRowsFont
    text?: string
    hoverSize?: number
    hoverColor?: string
    advanced?: BlockAboutRowsAdvanced
    style?: React.CSSProperties
}

export default function BlockAboutRows(props: BlockAboutRowsProps) {
    const {
        speed = 50,
        scale = 184,
        color = "#FF005E",
        background = "#000000",
        hoverSize = 12,
        hoverColor = "#ECFF00",
        text = "NEW COMPONENT, SINCE. 1989, TRADEMARK, ORIGINAL CLOTHING, PREMIUM ART DESIGN LOS ANGELES, STREETWEAR MMXIVV, 14.09.1989, PREMIUM ART, FASHION",
        font = {
            variant: "Regular",
            fontSize: 18,
            textAlign: "left",
            fontFamily: "Arial Black",
            fontWeight: 900,
            lineHeight: "1.5em",
            letterSpacing: "-0.01em",
        },
        advanced,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(props)
    propsRef.current = { speed, scale, color, background, hoverSize, hoverColor, text, font, advanced, style }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Spotlight layer: the lit copy of the rows, masked to a soft disc at the pointer.
        const layer = document.createElement("canvas")
        const lctx = layer.getContext("2d")

        const size = { w: 1200, h: 800, dpr: 1 }
        const resize = () => {
            const w = Math.max(1, root.offsetWidth)
            const h = Math.max(1, root.offsetHeight)
            const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)
            size.w = w
            size.h = h
            size.dpr = dpr
            canvas.width = Math.round(w * dpr)
            canvas.height = Math.round(h * dpr)
            layer.width = canvas.width
            layer.height = canvas.height
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        // Reduced motion
        let reduced = false
        const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        const onMq = () => (reduced = !!mq?.matches)
        onMq()
        mq?.addEventListener?.("change", onMq)

        // Pointer
        // sx/sy: eased spotlight centre; px/vx: last x and smoothed horizontal velocity (px/s).
        const ptr = { x: 0, y: 0, sx: 0, sy: 0, px: 0, vx: 0, inside: false, down: false, over: 0, press: 0 }
        const onMove = (e: PointerEvent) => {
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            ptr.inside = true
        }
        const onEnter = (e: PointerEvent) => {
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            ptr.px = ptr.x
            if (ptr.over < 0.05) {
                ptr.sx = ptr.x
                ptr.sy = ptr.y
            }
            ptr.inside = true
        }
        const onLeave = () => {
            ptr.inside = false
        }
        const onDown = (e: PointerEvent) => {
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            ptr.inside = true
            ptr.down = true
        }
        const onUp = () => {
            ptr.down = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        // Grain tile, built once
        const grainTile = document.createElement("canvas")
        grainTile.width = 160
        grainTile.height = 160
        {
            const g = grainTile.getContext("2d")
            if (g) {
                const img = g.createImageData(160, 160)
                for (let i = 0; i < img.data.length; i += 4) {
                    const v = Math.random() * 255
                    img.data[i] = v
                    img.data[i + 1] = v
                    img.data[i + 2] = v
                    img.data[i + 3] = 255
                }
                g.putImageData(img, 0, 0)
            }
        }

        const scratch = document.createElement("canvas").getContext("2d")
        let strips: { canvas: HTMLCanvasElement; hi: HTMLCanvasElement; P: number; rowH: number; speedFrac: number; startFrac: number }[] = []
        let bakedKey = ""
        let offsets: (number | undefined)[] = []
        let offsetsKey = ""

        const bake = (p: any, adv: any, fontPx: number, dpr: number) => {
            const phrasesRaw = typeof p.text === "string" ? p.text : DEFAULT_TEXT
            let phrases = phrasesRaw.split(",").map((s: string) => s.trim()).filter(Boolean)
            if (!phrases.length) phrases = DEFAULT_TEXT.split(",").map((s) => s.trim())
            const f = p.font || {}
            const weight = f.fontWeight ?? 900
            const fstyle = f.fontStyle || "normal"
            const fontStr = `${fstyle} ${weight} ${fontPx}px ${fontFamilyOf(f)}`
            const ls = parseSpacing(f.letterSpacing ?? "-0.01em", fontPx)
            const rgb = parseColor(p.color ?? "#30B4E8")
            const hrgb = parseColor(p.hoverColor ?? "#FFFFFF", [255, 255, 255])
            const key = [
                fontStr, ls, phrases.join("|"), rgb.join(","), hrgb.join(","), dpr,
                adv.gap, adv.gapJitter, adv.trail, adv.trailStart, adv.trailMid, adv.trailMidAt, adv.variance, adv.heft, adv.seed,
            ].join("~")
            if (key === bakedKey) return
            bakedKey = key

            const rowH = Math.ceil(fontPx * 1.6)
            const gapBase = (adv.gap / 100) * fontPx
            const jitter = Math.max(0, Math.min(1, adv.gapJitter / 100))
            const ramp = (adv.trail / 100) * fontPx
            const aStart = Math.max(0, Math.min(1, adv.trailStart / 100))
            const aMid = Math.max(0, Math.min(1, adv.trailMid / 100))
            const midAt = Math.max(0.05, Math.min(0.95, adv.trailMidAt / 100))
            const variance = Math.max(0, Math.min(1, adv.variance / 100))
            const heft = Math.max(0, Math.min(20, adv.heft)) / 100 * fontPx
            const [r, g, b] = rgb
            const rgba = (a: number) => `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`

            if (scratch) {
                scratch.font = fontStr
                ;(scratch as any).letterSpacing = `${ls}px`
            }

            strips = PLAN.map((plan, s) => {
                const rng = mulberry((adv.seed | 0) * 131 + s * 977 + 1)
                const items: { t: string; x: number; w: number; peak: number }[] = []
                let x = 0
                for (const idx of plan) {
                    const t = phrases[idx % phrases.length]
                    const w = (scratch ? scratch.measureText(t).width : t.length * fontPx * 0.8) + heft
                    const peak = 1 - variance * rng()
                    items.push({ t, x, w, peak })
                    x += w + Math.max(fontPx * 0.3, gapBase * (1 + jitter * (rng() * 2 - 1)))
                }
                const P = Math.max(8, x)
                const c = document.createElement("canvas")
                c.width = Math.max(1, Math.ceil(P * dpr))
                c.height = Math.max(1, Math.ceil(rowH * dpr))
                const cx = c.getContext("2d")
                if (cx) {
                    cx.setTransform(dpr, 0, 0, dpr, 0, 0)
                    cx.font = fontStr
                    ;(cx as any).letterSpacing = `${ls}px`
                    cx.textBaseline = "middle"
                    cx.lineJoin = "round"
                    for (const it of items) {
                        const tx = it.x + heft / 2
                        const end = tx + Math.max(1, ramp)
                        const grad = cx.createLinearGradient(tx, 0, end, 0)
                        grad.addColorStop(0, rgba(aStart * it.peak))
                        grad.addColorStop(midAt, rgba(aMid * it.peak))
                        grad.addColorStop(1, rgba(it.peak))
                        cx.fillStyle = grad
                        cx.fillText(it.t, tx, rowH / 2)
                        // Thicken the glyphs so the type reads as heavy as the reference's black caps.
                        if (heft > 0.05) {
                            cx.strokeStyle = grad
                            cx.lineWidth = heft
                            cx.strokeText(it.t, tx, rowH / 2)
                        }
                    }
                }
                // Lit copy: the same phrases solid in the hover colour, no dark trail.
                const hc = document.createElement("canvas")
                hc.width = c.width
                hc.height = c.height
                const hx = hc.getContext("2d")
                if (hx) {
                    hx.setTransform(dpr, 0, 0, dpr, 0, 0)
                    hx.font = fontStr
                    ;(hx as any).letterSpacing = `${ls}px`
                    hx.textBaseline = "middle"
                    hx.lineJoin = "round"
                    for (const it of items) {
                        const tx = it.x + heft / 2
                        const fill = `rgba(${hrgb[0]},${hrgb[1]},${hrgb[2]},${(0.8 + 0.2 * it.peak).toFixed(3)})`
                        hx.fillStyle = fill
                        hx.fillText(it.t, tx, rowH / 2)
                        if (heft > 0.05) {
                            hx.strokeStyle = fill
                            hx.lineWidth = heft
                            hx.strokeText(it.t, tx, rowH / 2)
                        }
                    }
                }
                const sr = mulberry((adv.seed | 0) * 7919 + s * 104729 + 3)
                return { canvas: c, hi: hc, P, rowH, speedFrac: sr(), startFrac: sr() }
            })
        }

        let raf = 0
        let last = -1
        let time = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            let dt = last < 0 ? 0 : (now - last) / 1000
            last = now
            if (dt > 1 / 20) dt = 1 / 20
            if (dt < 0) dt = 0
            time += dt

            const { w: W, h: H, dpr } = size
            const fontPx = Math.max(4, parsePx(p.font?.fontSize, 18) * ((p.scale ?? 100) / 100))
            bake(p, adv, fontPx, dpr)

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = "source-over"
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

            // Pointer easing
            const easeS = Math.max(0, adv.hoverEaseMs) / 1000
            const k = easeS <= 0 ? 1 : 1 - Math.exp(-dt / (easeS / 3))
            ptr.over += ((ptr.inside ? 1 : 0) - ptr.over) * k
            ptr.press += ((ptr.down && ptr.inside ? 1 : 0) - ptr.press) * k
            const hoverK = Math.max(0, adv.hover) / 50
            // The spotlight trails the pointer slightly; the pointer's sideways speed is smoothed for the drag.
            const kf = dt <= 0 ? 0 : 1 - Math.exp(-dt / 0.06)
            ptr.sx += (ptr.x - ptr.sx) * kf
            ptr.sy += (ptr.y - ptr.sy) * kf
            if (dt > 0) {
                const raw = ptr.inside ? (ptr.x - ptr.px) / dt : 0
                ptr.px = ptr.x
                ptr.vx += (Math.max(-4000, Math.min(4000, raw)) - ptr.vx) * Math.min(1, dt * 8)
            }

            const R = Math.max(1, Math.round(adv.rows))
            const oKey = `${R}|${adv.seed}`
            if (oKey !== offsetsKey) {
                offsetsKey = oKey
                offsets = new Array(R).fill(undefined)
            }

            const pitchK = (fontPx / PITCH_FONT) * (Math.max(10, adv.rowSpacing) / 100)
            const ys: number[] = []
            let acc = 0
            for (let r = 0; r < R; r++) {
                ys.push(acc)
                acc += DELTAS[r % DELTAS.length] * pitchK
            }
            const total = ys[R - 1]
            const top = (H * adv.blockCenter) / 100 - total / 2

            const inset = Math.max(0, Math.min(45, adv.blockInset)) / 100
            const left = W * inset
            const right = W * (1 - inset)

            const speedMult = reduced ? 0 : Math.max(0, p.speed ?? 50) / 50
            const shAmp = reduced ? 0 : Math.max(0, adv.shimmer) / 100
            const shPeriod = Math.max(100, adv.shimmerMs) / 1000
            const shStag = adv.shimmerStagger / 1000
            const spotR = Math.max(8, (Math.max(0, p.hoverSize ?? 22) / 100) * H * (1 + (ptr.press * Math.max(0, adv.pressGrow)) / 100))
            const spotA = Math.min(1, hoverK * ptr.over)
            const dim = Math.min(0.9, (Math.max(0, adv.hoverDim) / 100) * spotA)
            const drag = (Math.max(0, adv.hoverDrag) / 100) * Math.min(2, hoverK)
            const spotOn = spotA > 0.002 && !!lctx
            if (spotOn && lctx) {
                lctx.setTransform(1, 0, 0, 1, 0, 0)
                lctx.globalCompositeOperation = "source-over"
                lctx.globalAlpha = 1
                lctx.clearRect(0, 0, layer.width, layer.height)
                lctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            }

            ctx.save()
            ctx.beginPath()
            ctx.rect(left, 0, Math.max(0, right - left), H)
            ctx.clip()

            for (let r = 0; r < R; r++) {
                const st = strips[r % strips.length]
                if (!st) continue
                const y = top + ys[r]
                if (y + st.rowH < 0 || y - st.rowH > H) continue

                // Rows under the spotlight slow (freeze while pressed) and are carried by the pointer's sideways motion.
                const dy = (y - ptr.sy) / spotR
                const f = Math.min(1, spotA * Math.exp(-dy * dy))
                const slow = Math.min(1, f * (adv.hoverSlow / 100) + f * ptr.press * (adv.pressSlow / 100))

                const v =
                    ((adv.speedMin + (adv.speedMax - adv.speedMin) * st.speedFrac) / 100) * fontPx * speedMult * (1 - slow)
                if (offsets[r] === undefined) offsets[r] = st.startFrac * st.P
                let off = ((offsets[r] as number) + v * dt + ptr.vx * dt * drag * f) % st.P
                if (off < 0) off += st.P
                offsets[r] = off

                const alpha = Math.max(0, Math.min(1, 1 - shAmp + shAmp * Math.sin((2 * Math.PI * (time - shStag * r)) / shPeriod)))
                const dw = st.canvas.width / dpr
                const dh = st.canvas.height / dpr
                const yy = y - dh / 2
                const x0 = left + off - st.P

                ctx.globalCompositeOperation = "source-over"
                ctx.globalAlpha = alpha * (1 - dim)
                for (let x = x0; x < right; x += st.P) ctx.drawImage(st.canvas, x, yy, dw, dh)

                if (spotOn && lctx && Math.abs(y - ptr.sy) < spotR + dh) {
                    for (let x = x0; x < right; x += st.P) lctx.drawImage(st.hi, x, yy, dw, dh)
                }
            }

            // Spotlight: the lit rows, cut to a soft disc around the pointer.
            if (spotOn && lctx) {
                const soft = Math.max(0.02, Math.min(0.98, adv.hoverSoft / 100))
                const g = lctx.createRadialGradient(ptr.sx, ptr.sy, spotR * (1 - soft), ptr.sx, ptr.sy, spotR)
                g.addColorStop(0, "rgba(0,0,0,1)")
                g.addColorStop(1, "rgba(0,0,0,0)")
                lctx.globalCompositeOperation = "destination-in"
                lctx.fillStyle = g
                lctx.fillRect(0, 0, W, H)
                lctx.globalCompositeOperation = "source-over"
                ctx.globalCompositeOperation = "source-over"
                ctx.globalAlpha = spotA
                ctx.drawImage(layer, 0, 0, W, H)
            }
            ctx.restore()
            ctx.globalCompositeOperation = "source-over"
            ctx.globalAlpha = 1

            // Vignette
            const vig = Math.max(0, Math.min(100, adv.vignette)) / 100
            if (vig > 0) {
                const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) / 2)
                g.addColorStop(0, "rgba(0,0,0,0)")
                g.addColorStop(1, `rgba(0,0,0,${(vig * 0.9).toFixed(3)})`)
                ctx.fillStyle = g
                ctx.fillRect(0, 0, W, H)
            }

            // Grain
            const grain = Math.max(0, Math.min(100, adv.grain)) / 100
            if (grain > 0) {
                ctx.globalAlpha = grain * 0.22
                const ox = -Math.floor(Math.random() * 160)
                const oy = -Math.floor(Math.random() * 160)
                for (let gx = ox; gx < W; gx += 160) for (let gy = oy; gy < H; gy += 160) ctx.drawImage(grainTile, gx, gy)
                ctx.globalAlpha = 1
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            mq?.removeEventListener?.("change", onMq)
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onEnter)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                ...style,
                background,
                overflow: "hidden",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
