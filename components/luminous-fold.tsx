"use client"

import type { CSSProperties } from "react"
import * as React from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    periodMs: 5000,
    phase: 10,
    rowLag: 17,
    drive: 200,
    heightMax: 91,
    heightMin: 8,
    centerY: 50,
    gridWidth: 97,
    columns: 33,
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
}

const DEFAULT_FAMILY = `Inter, "Helvetica Neue", Helvetica, Arial, sans-serif`

export interface GridSameLineProps {
    background?: string
    baseColor?: string
    text?: string
    font?: Record<string, unknown>
    speed?: number
    size?: number
    rows?: number
    lag?: number
    advanced?: {
        periodMs?: number
        phase?: number
        rowLag?: number
        drive?: number
        heightMax?: number
        heightMin?: number
        centerY?: number
        gridWidth?: number
        columns?: number
        glyphScale?: number
        lagCurve?: number
        glyphOpacity?: number
        additive?: boolean
        hoverRadius?: number
        hoverLift?: number
        hoverBright?: number
        pressBoost?: number
        pointerEaseMs?: number
        grain?: number
        vignette?: number
        hover?: number
    }
    style?: CSSProperties
}

/**
 * Wandering Lips — a grid of one repeated line of text. Every gap between
 * rows opens and closes on a travelling wave that starts at the centre and
 * spreads out across columns and along rows. Letters keep their size, so
 * closed gaps pile whole rows on top of each other into bright bars:
 * lens → square → hourglass → flat bar → lens.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
function __BaseImpl_GridSameLine(props: GridSameLineProps) {
    const {
        text = "TEXT COMPONENT",
        speed = 50,
        size = 27,
        rows = 14,
        lag = 67,
        baseColor = "#00CBFF",
        background = "#000000",
        font = {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Inter","fontWeight":400,"lineHeight":"1.5em","letterSpacing":"0em"},
        style,
    } = props

    const rootRef = React.useRef<HTMLDivElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const cfgRef = React.useRef<any>(null)
    cfgRef.current = {
        text,
        speed,
        size,
        rows,
        lag,
        baseColor,
        font: font || {},
        advanced: props.advanced,
    }

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
            canvas.style.width = W + "px"
            canvas.style.height = H + "px"
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

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

        // pointer
        const ptr = { x: 0, y: 0, inside: false, pressed: false, over: 0, down: 0 }
        const onMove = (e: PointerEvent) => {
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            ptr.inside = true
        }
        const onEnter = (e: PointerEvent) => {
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            ptr.inside = true
        }
        const onLeave = () => {
            ptr.inside = false
        }
        const onDown = (e: PointerEvent) => {
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            ptr.inside = true
            ptr.pressed = true
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

        let gaps = new Float32Array(64)
        let pos = new Float32Array(64)

        let lastFont = ""
        let raf = 0
        let last = -1
        let clock = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(1 / 20, (now - last) / 1000)
            last = now
            const cfg = cfgRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(cfg.advanced ?? {}) }
            const k = Math.max(0, adv.hover) / 50

            // pointer easing
            const easeS = Math.max(0.016, adv.pointerEaseMs / 1000)
            const a = 1 - Math.exp(-dt / (easeS / 3))
            ptr.over += ((ptr.inside ? 1 : 0) - ptr.over) * a
            ptr.down += ((ptr.pressed ? 1 : 0) - ptr.down) * a

            const rate =
                (Math.max(0, cfg.speed) / 50) *
                (1 + ptr.down * (adv.pressBoost / 100) * k)
            clock += dt * rate

            if (W <= 0 || H <= 0) return
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
                if ((document as any).fonts?.load) {
                    ;(document as any).fonts.load(fontCss).catch(() => {})
                }
            }
            ctx.font = `${fstyle} ${weight} ${sizePx * dpr}px ${family}`
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillStyle = cfg.baseColor
            ctx.globalCompositeOperation = adv.additive ? "lighter" : "source-over"

            const str: string = cfg.text && cfg.text.length ? cfg.text : " "
            // The reference is a square block: width and height follow the
            // short side, so it sits centred and whole in any frame shape.
            const side = Math.min(W, H)
            const gridW = (side * adv.gridWidth) / 100
            const cols = Math.max(1, Math.round(adv.columns))
            const pitchPx = gridW / cols
            const x0 = (W - gridW) / 2 + pitchPx / 2
            const halfSpan = Math.max(1, (gridW - pitchPx) / 2)
            const cx = W / 2
            const cy = (H * adv.centerY) / 100
            const nRows = Math.max(1, Math.round(cfg.rows))
            if (gaps.length < nRows) {
                gaps = new Float32Array(nRows + 16)
                pos = new Float32Array(nRows + 16)
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
            const hoverR = Math.max(1, (gridW * adv.hoverRadius) / 100)
            const lift = (adv.hoverLift / 100) * k * ptr.over
            const bright = (adv.hoverBright / 100) * k * ptr.over
            const gScale = Math.max(0, adv.glyphScale / 100)
            const TAU = Math.PI * 2

            for (let c = 0; c < cols; c++) {
                const x = x0 + c * pitchPx
                const ch = str[c % str.length]
                if (ch === " ") continue
                const d = Math.min(1, Math.abs(x - cx) / halfSpan)
                const shaped = d + ((1 - Math.cos(Math.PI * d)) / 2 - d) * curveMix
                const colPhase = cyc - lagX * shaped

                let g = 0
                let alpha = baseAlpha
                if (lift > 0 || bright > 0) {
                    const dx = (x - ptr.x) / hoverR
                    g = Math.exp(-dx * dx)
                    alpha = Math.min(1, alpha * (1 + g * bright))
                }
                const gl = Math.min(1, g * lift)

                // Each gap opens and closes on an overdriven sine: it holds
                // open, holds piled, and moves quickly between.
                pos[0] = 0
                for (let r = 0; r < nRows - 1; r++) {
                    const m = r + 0.5 - (nRows - 1) / 2
                    const dy = Math.abs(m) / K
                    let s = 0.5 + 0.5 * drive * Math.sin(TAU * (colPhase - lagY * dy))
                    s = Math.max(sMin, Math.min(1, s))
                    s += (1 - s) * gl
                    gaps[r] = s
                    pos[r + 1] = pos[r] + s * fullGap
                }
                const mid = (pos[0] + pos[nRows - 1]) / 2

                ctx.globalAlpha = alpha
                const xd = x * dpr
                for (let r = 0; r < nRows; r++) {
                    const y = cy + pos[r] - mid
                    let sy = 1
                    if (gScale > 0) {
                        const sa = r > 0 ? gaps[r - 1] : gaps[0]
                        const sb = r < nRows - 1 ? gaps[r] : sa
                        const sLocal = nRows > 1 ? (sa + sb) / 2 : 1
                        sy = Math.max(0.002, 1 - (1 - sLocal) * gScale)
                    }
                    ctx.setTransform(1, 0, 0, sy, xd, y * dpr)
                    ctx.fillText(ch, 0, 0)
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
                minWidth: 1200,
                minHeight: 800,
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                touchAction: "none",
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

const __presetProps = {
  "background": "#000000",
  "baseColor": "#00CBFF",
  "text": "TEXT COMPONENT",
  "font": {
    "variant": "Regular",
    "fontSize": "16px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 400,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  },
  "speed": 50,
  "size": 27,
  "rows": 14,
  "lag": 67,
  "advanced": {
    "drive": 200,
    "grain": 0,
    "hover": 50,
    "phase": 10,
    "rowLag": 17,
    "centerY": 50,
    "columns": 33,
    "additive": true,
    "lagCurve": 100,
    "periodMs": 5000,
    "vignette": 0,
    "gridWidth": 97,
    "heightMax": 91,
    "heightMin": 8,
    "hoverLift": 60,
    "glyphScale": 0,
    "pressBoost": 100,
    "hoverBright": 40,
    "hoverRadius": 16,
    "glyphOpacity": 100,
    "pointerEaseMs": 320
  }
};

export default function GridSameLine(props: Record<string, unknown>) {
  return <__BaseImpl_GridSameLine {...(__presetProps as Record<string, unknown>)} {...props} />;
}
