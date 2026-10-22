"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * Stack of identical lines whose letter-spacing swells as they pass a fixed band
 * across the stage, with a green dot riding the same eased path at twice the travel.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    lineCount: 10,
    lineGap: 38,
    dotSize: 21,
    dotX: 50,
    cycleMs: 6200,
    peakAt: 45,
    bandCenter: 42,
    textOpacity: 100,
    follow: 60,
    pressBoost: 30,
    pointerEase: 6,
    grain: 0,
    vignette: 0,
    hover: 50,
}

const FONT_STACK = '"Helvetica Neue", Helvetica, Arial, sans-serif'

function fontFamilyOf(font: any): string {
    const fam = font && typeof font.fontFamily === "string" ? font.fontFamily.trim() : ""
    if (!fam) return FONT_STACK
    if (fam.includes(",")) return fam
    return `"${fam.replace(/"/g, "")}", ${FONT_STACK}`
}

function clamp(v: number, a: number, b: number) {
    return v < a ? a : v > b ? b : v
}

export interface StackIdenticalLinesProps {
    background?: string
    textColor?: string
    dotColor?: string
    text?: string
    font?: Record<string, unknown>
    speed?: number
    scale?: number
    spread?: number
    bandWidth?: number
    travel?: number
    advanced?: {
        lineCount?: number
        lineGap?: number
        dotSize?: number
        dotX?: number
        cycleMs?: number
        peakAt?: number
        bandCenter?: number
        textOpacity?: number
        follow?: number
        pressBoost?: number
        pointerEase?: number
        grain?: number
        vignette?: number
        hover?: number
    }
    style?: CSSProperties
}

export default function StackIdenticalLines(props: StackIdenticalLinesProps) {
    const {
        text = "TEXT COMPONENT",
        font = {"variant":"Bold","fontSize":"50px","textAlign":"left","fontFamily":"Inter","fontWeight":700,"lineHeight":"1.5em","letterSpacing":"0em"},
        textColor = "#EDEDED",
        dotColor = "#D3FF00",
        background = "#000000",
        speed = 50,
        scale = 54,
        spread = 140,
        bandWidth = 20,
        travel = 70,
        advanced = {"dotX":50,"grain":0,"hover":50,"follow":60,"peakAt":45,"cycleMs":6200,"dotSize":21,"fadeEnd":87,"lineGap":38,"logoTop":25,"logoSize":30,"showLogo":true,"stackTop":8,"vignette":0,"dotTravel":80,"fadeStart":72,"lineCount":10,"logoColor":"#EDEDED","logoRight":9,"showTitle":true,"titleSize":89,"bandCenter":42,"pressBoost":30,"pointerEase":6,"stackTravel":39,"textOpacity":100,"titleBaseline":97,"titleTracking":-4},
        style,
    } = props

    const live = useRef<any>(null)
    live.current = {
        text,
        font,
        textColor,
        dotColor,
        background,
        speed,
        scale,
        spread,
        bandWidth,
        travel,
        advanced,
    }

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

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

        // Pointer state
        const ptr = { inside: false, pressed: false, y: 0, over: 0, down: 0 }
        const onMove = (e: PointerEvent) => {
            ptr.inside = true
            ptr.y = e.offsetY
        }
        const onEnter = (e: PointerEvent) => {
            ptr.inside = true
            ptr.y = e.offsetY
        }
        const onLeave = () => {
            ptr.inside = false
            ptr.pressed = false
        }
        const onDown = (e: PointerEvent) => {
            ptr.pressed = true
            ptr.inside = true
            ptr.y = e.offsetY
        }
        const onUp = () => {
            ptr.pressed = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        // Reduced motion
        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        let reduced = !!(mq && mq.matches)
        const onMq = () => {
            reduced = !!(mq && mq.matches)
        }
        if (mq && mq.addEventListener) mq.addEventListener("change", onMq)

        // Grain tile, built once
        const noise = document.createElement("canvas")
        noise.width = 128
        noise.height = 128
        const nctx = noise.getContext("2d")
        if (nctx) {
            const id = nctx.createImageData(128, 128)
            for (let i = 0; i < id.data.length; i += 4) {
                const v = Math.random() * 255
                id.data[i] = v
                id.data[i + 1] = v
                id.data[i + 2] = v
                id.data[i + 3] = 255
            }
            nctx.putImageData(id, 0, 0)
        }
        const grainPattern = ctx.createPattern(noise, "repeat")

        // Glyph advance cache
        let advKey = ""
        let advances: number[] = []
        let advSum = 0
        let chars: string[] = []
        let glyphUp = 0
        let glyphDown = 0

        let phase = 0
        let last: number | null = null
        let raf = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last == null ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now

            const p = live.current
            // Keys Framer or the panel pass as undefined must not wipe the defaults.
            const adv: any = { ...ADVANCED_DEFAULTS }
            const given = p.advanced ?? {}
            for (const key in given) if (given[key] !== undefined && given[key] !== null) adv[key] = given[key]
            const k = Math.max(0, adv.hover) / 50

            const ease = 1 - Math.exp(-dt * Math.max(0.1, adv.pointerEase))
            ptr.over += ((ptr.inside ? 1 : 0) - ptr.over) * ease
            ptr.down += ((ptr.pressed ? 1 : 0) - ptr.down) * ease

            if (!reduced) {
                const rate = Math.max(0, p.speed) / 50
                phase = (phase + (dt * 1000 * rate) / Math.max(100, adv.cycleMs)) % 1
            }

            if (W <= 0 || H <= 0) return
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = "source-over"
            ctx.fillStyle = p.background || "#000000"
            ctx.fillRect(0, 0, W, H)

            const hs = H / 800
            const s = Math.max(0.05, p.scale / 100)
            const baseSize = parseFloat(p.font && p.font.fontSize) || 27
            const fpx = baseSize * hs * s
            const pitch = adv.lineGap * hs * s
            const cx = (W * adv.dotX) / 100

            // Phase-warped cosine: bottom turnaround at peakAt of the cycle
            const peak = clamp(adv.peakAt / 100, 0.05, 0.95)
            const q = phase < peak ? (phase / peak) * 0.5 : 0.5 + ((phase - peak) / (1 - peak)) * 0.5
            const e = (1 - Math.cos(2 * Math.PI * q)) / 2

            // Travel: the movement covers this share of the stage height, centred.
            // 100 = top edge to bottom edge, 50 = the middle half, 200 = runs half a stage past each edge.
            const span = (H * Math.max(50, Number(p.travel) || 50)) / 100
            const rangeTop = (H - span) / 2
            const rangeBottom = rangeTop + span
            const dotR = Math.max(0.5, (adv.dotSize / 2) * hs * s)
            const dotLo = rangeTop + dotR
            const dotHi = Math.max(dotLo, rangeBottom - dotR)
            const dotY = dotLo + (dotHi - dotLo) * e

            // Band centre: fixed in screen space, pulled toward the pointer
            let bc = (H * adv.bandCenter) / 100
            const mix = clamp(ptr.over * (adv.follow / 100) * k, 0, 1)
            bc += (clamp(ptr.y, 0, H) - bc) * mix
            const sigma = Math.max(1, (H * p.bandWidth) / 100)
            const maxExtra = (Math.max(0, p.spread) / 100) * fpx * (1 + ptr.down * (adv.pressBoost / 100) * k)

            // Text stack
            const fontStr = `${(p.font && p.font.fontStyle) || "normal"} ${(p.font && p.font.fontWeight) || 400} ${fpx}px ${fontFamilyOf(p.font)}`
            ctx.font = fontStr
            ctx.textBaseline = "alphabetic"
            ctx.textAlign = "left"
            const str = String(p.text ?? "")
            const key = fontStr + "|" + str
            if (key !== advKey) {
                advKey = key
                chars = Array.from(str)
                advances = chars.map((c) => ctx.measureText(c).width)
                advSum = advances.reduce((a, b) => a + b, 0)
                // Real glyph extents around a line's centre (baseline sits 0.26 em below it).
                const m = ctx.measureText(str || "H")
                glyphUp = (m.actualBoundingBoxAscent || 0.72 * fpx) - 0.26 * fpx
                glyphDown = (m.actualBoundingBoxDescent || 0) + 0.26 * fpx
            }
            ctx.fillStyle = p.textColor || "#EDEDED"
            const n = Math.max(1, Math.round(adv.lineCount))
            // At the top of the cycle the first line's letters touch the range's top;
            // at the bottom the last line's letters touch the range's bottom.
            const stackLo = rangeTop + glyphUp
            const stackHi = Math.max(stackLo, rangeBottom - glyphDown - (n - 1) * pitch)
            const top = stackLo + (stackHi - stackLo) * e
            const textAlpha = clamp(adv.textOpacity / 100, 0, 1)
            for (let i = 0; i < n; i++) {
                const cy = top + i * pitch
                if (cy < -pitch || cy > H + pitch) continue
                const a = textAlpha
                if (a <= 0.002) continue
                const d = (cy - bc) / sigma
                const extra = maxExtra * Math.exp(-0.5 * d * d)
                const total = advSum + extra * Math.max(0, chars.length - 1)
                let x = cx - total / 2
                const baseline = cy + 0.26 * fpx
                ctx.globalAlpha = a
                for (let j = 0; j < chars.length; j++) {
                    ctx.fillText(chars[j], x, baseline)
                    x += advances[j] + extra
                }
            }

            // Dot
            if (dotY > -dotR && dotY < H + dotR) {
                ctx.globalAlpha = 1
                ctx.fillStyle = p.dotColor || "#00FF00"
                ctx.beginPath()
                ctx.arc(cx, dotY, dotR, 0, Math.PI * 2)
                ctx.fill()
            }
            ctx.globalAlpha = 1

            // Grain
            if (adv.grain > 0 && grainPattern) {
                ctx.save()
                ctx.globalAlpha = clamp(adv.grain / 100, 0, 1) * 0.35
                const ox = Math.floor(Math.random() * 128)
                const oy = Math.floor(Math.random() * 128)
                ctx.translate(-ox, -oy)
                ctx.fillStyle = grainPattern
                ctx.fillRect(0, 0, W + 128, H + 128)
                ctx.restore()
            }

            // Vignette
            if (adv.vignette > 0) {
                const r1 = Math.hypot(W / 2, H / 2)
                const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, r1)
                g.addColorStop(0, "rgba(0,0,0,0)")
                g.addColorStop(1, `rgba(0,0,0,${clamp(adv.vignette / 100, 0, 1) * 0.85})`)
                ctx.globalAlpha = 1
                ctx.fillStyle = g
                ctx.fillRect(0, 0, W, H)
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onEnter)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            if (mq && mq.removeEventListener) mq.removeEventListener("change", onMq)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}

// Control order arranged in the builder.
