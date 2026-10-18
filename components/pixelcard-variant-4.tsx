import { useEffect, useRef, type CSSProperties } from "react"
const RenderTarget = {
    current: () => "preview",
    canvas: "canvas",
    export: "export",
    thumbnail: "thumbnail",
    preview: "preview",
}

class Pixel {
    width: number
    height: number
    ctx: CanvasRenderingContext2D
    x: number
    y: number
    color: string
    speed: number
    size: number
    sizeStep: number
    minSize: number
    maxSizeInteger: number
    maxSize: number
    delay: number
    counter: number
    counterStep: number
    isIdle: boolean
    isReverse: boolean
    isShimmer: boolean
    growStart: number | null
    shrinkStart: number | null
    shrinkFrom: number

    constructor(
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        color: string,
        speed: number,
        delay: number,
        maxPx: number
    ) {
        this.width = canvas.width
        this.height = canvas.height
        this.ctx = context
        this.x = x
        this.y = y
        this.color = color
        this.speed = this.getRandomValue(0.1, 0.9) * speed
        this.size = 0
        // Scale the original 0.5–2px range by the chosen particle size.
        const factor = maxPx / 2
        this.sizeStep = Math.random() * 0.4 * factor
        this.minSize = 0.5 * factor
        this.maxSizeInteger = maxPx
        this.maxSize = this.getRandomValue(this.minSize, maxPx)
        this.delay = delay
        this.counter = 0
        this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01
        this.isIdle = false
        this.isReverse = false
        this.isShimmer = false
        this.growStart = null
        this.shrinkStart = null
        this.shrinkFrom = 0
    }

    getRandomValue(min: number, max: number) {
        return Math.random() * (max - min) + min
    }

    draw() {
        const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5
        this.ctx.fillStyle = this.color
        this.ctx.fillRect(
            this.x + centerOffset,
            this.y + centerOffset,
            this.size,
            this.size
        )
    }

    // Grow-in driven by the Transition (duration + ease). The per-pixel `delay`
    // still staggers the start so the sweep order is preserved.
    appear(now: number, durationMs: number, easeFn: (t: number) => number) {
        this.isIdle = false
        this.shrinkStart = null
        if (this.counter <= this.delay) {
            this.counter += this.counterStep
            return
        }
        if (!this.isShimmer) {
            if (this.growStart === null) this.growStart = now
            const p =
                durationMs > 0
                    ? Math.min(1, (now - this.growStart) / durationMs)
                    : 1
            this.size = easeFn(p) * this.maxSize
            if (p >= 1) this.isShimmer = true
        }
        if (this.isShimmer) {
            this.shimmer()
        }
        this.draw()
    }

    disappear(now: number, durationMs: number, easeFn: (t: number) => number) {
        this.isShimmer = false
        this.counter = 0
        this.growStart = null
        if (this.size <= 0) {
            this.isIdle = true
            this.shrinkStart = null
            return
        }
        if (this.shrinkStart === null) {
            this.shrinkStart = now
            this.shrinkFrom = this.size
        }
        const p =
            durationMs > 0
                ? Math.min(1, (now - this.shrinkStart) / durationMs)
                : 1
        this.size = this.shrinkFrom * (1 - easeFn(p))
        if (p >= 1) this.size = 0
        this.draw()
    }

    shimmer() {
        if (this.size >= this.maxSize) {
            this.isReverse = true
        } else if (this.size <= this.minSize) {
            this.isReverse = false
        }
        if (this.isReverse) {
            this.size -= this.speed
        } else {
            this.size += this.speed
        }
    }
}

function getEffectiveSpeed(value: number, reducedMotion: boolean) {
    const min = 0
    const max = 100
    // Doubled from 0.001 — speed 100 is now 2× the old max; all speeds scale up.
    const throttle = 0.002

    if (value <= min || reducedMotion) {
        return min
    } else if (value >= max) {
        return max * throttle
    } else {
        return value * throttle
    }
}

// ── Easing from a Framer Transition ─────────────────────────────────────────
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
    const cx = 3 * x1
    const bx = 3 * (x2 - x1) - cx
    const ax = 1 - cx - bx
    const cy = 3 * y1
    const by = 3 * (y2 - y1) - cy
    const ay = 1 - cy - by
    const fx = (t: number) => ((ax * t + bx) * t + cx) * t
    const dfx = (t: number) => (3 * ax * t + 2 * bx) * t + cx
    return (x: number) => {
        if (x <= 0) return 0
        if (x >= 1) return 1
        let t = x
        for (let i = 0; i < 8; i++) {
            const e = fx(t) - x
            const d = dfx(t)
            if (Math.abs(e) < 1e-5 || d === 0) break
            t -= e / d
        }
        return ((ay * t + by) * t + cy) * t
    }
}

const EASE_PRESETS: Record<string, [number, number, number, number]> = {
    linear: [0, 0, 1, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
}

function makeEase(transition: any): (t: number) => number {
    const ease = transition?.ease
    if (Array.isArray(ease) && ease.length === 4)
        return cubicBezier(ease[0], ease[1], ease[2], ease[3])
    if (typeof ease === "string" && EASE_PRESETS[ease])
        return cubicBezier(...EASE_PRESETS[ease])
    return cubicBezier(0, 0, 0.58, 1) // default easeOut
}

const DEFAULT_COLORS = ["#fecdd3", "#fda4af", "#e11d48"]

interface LabelGroup {
    text?: string
    color?: string
    font?: CSSProperties
}

type AppearFrom = "middle" | "top" | "bottom" | "left" | "right"

interface PixelCardProps {
    colors?: string[]
    gap?: number
    pixelSize?: number
    speed?: number
    appearFrom?: AppearFrom
    transition?: any
    backgroundColor?: string
    padding?: number
    borderColor?: string
    borderWidth?: number
    radius?: number
    showLabel?: boolean
    label?: LabelGroup
    style?: CSSProperties
}

/**
 * Pixel Card
 *
 * A canvas grid of pixels that grows in on hover and shimmers, then shrinks out
 * on leave. Based on the React Bits PixelCard by David Haz. The pixel palette is
 * a user color array, evenly assigned across the pixels.
 *
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 400
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
function __BaseImpl_PixelCard(props: PixelCardProps) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        colors = DEFAULT_COLORS,
        gap = 6,
        pixelSize = 2,
        speed = 80,
        appearFrom = "middle",
        transition = { type: "tween", duration: 0.8, ease: "easeOut" },
        backgroundColor = "#000000",
        padding = 0,
        borderColor = "#27272a",
        borderWidth = 1,
        radius = 25,
        showLabel = false,
        label,
        style,
    } = props

    const labelCfg: LabelGroup = { text: "", color: "#ffffff", ...label }

    // Freeze to a single drawn frame ONLY on true static renders (export /
    // thumbnail). On the Framer canvas we auto-run the appear+shimmer loop so
    // the pixels blink per the selected speed without needing a hover; Preview
    // keeps the hover trigger.
    const renderTarget = RenderTarget.current()
    const isExport =
        renderTarget === RenderTarget.export ||
        renderTarget === RenderTarget.thumbnail
    const isCanvas = renderTarget === RenderTarget.canvas
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pixelsRef = useRef<Pixel[]>([])
    const animationRef = useRef<ReturnType<
        typeof requestAnimationFrame
    > | null>(null)
    const timePreviousRef = useRef(
        typeof performance !== "undefined" ? performance.now() : 0
    )
    const reducedMotion = useRef(
        typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ).current

    const finalGap = gap
    const finalSpeed = speed
    const easeFn = makeEase(transition)
    const durationMs = (transition?.duration ?? 0.8) * 1000
    const finalColors = colors && colors.length > 0 ? colors : DEFAULT_COLORS

    const initPixels = () => {
        if (!containerRef.current || !canvasRef.current) return

        // Measure via the layout box (clientWidth) first; getBoundingClientRect
        // can read 0 on the Framer canvas at setup, leaving an empty grid. Fall
        // back to the container so the card always fills the frame.
        const el = canvasRef.current
        const container = containerRef.current
        const width = Math.floor(
            el.clientWidth ||
                el.getBoundingClientRect().width ||
                container.clientWidth ||
                0
        )
        const height = Math.floor(
            el.clientHeight ||
                el.getBoundingClientRect().height ||
                container.clientHeight ||
                0
        )
        const ctx = canvasRef.current.getContext("2d")

        canvasRef.current.width = width
        canvasRef.current.height = height
        canvasRef.current.style.width = `${width}px`
        canvasRef.current.style.height = `${height}px`

        const colorsArray = finalColors
        const step = Math.max(1, parseInt(finalGap.toString(), 10))
        const pxs: Pixel[] = []
        let idx = 0
        for (let x = 0; x < width; x += step) {
            for (let y = 0; y < height; y += step) {
                // Evenly assign the palette across pixels (cycle by index).
                const c = colorsArray[idx % colorsArray.length]
                idx++

                let delay: number
                if (reducedMotion) {
                    delay = 0
                } else if (appearFrom === "top") {
                    delay = y
                } else if (appearFrom === "bottom") {
                    delay = height - y
                } else if (appearFrom === "left") {
                    delay = x
                } else if (appearFrom === "right") {
                    delay = width - x
                } else {
                    const dx = x - width / 2
                    const dy = y - height / 2
                    delay = Math.sqrt(dx * dx + dy * dy)
                }
                if (!ctx) return
                pxs.push(
                    new Pixel(
                        canvasRef.current,
                        ctx,
                        x,
                        y,
                        c,
                        getEffectiveSpeed(finalSpeed, reducedMotion),
                        delay,
                        Math.max(0.1, pixelSize)
                    )
                )
            }
        }
        pixelsRef.current = pxs
    }

    const drawStaticFrame = () => {
        const ctx = canvasRef.current?.getContext("2d")
        if (!ctx || !canvasRef.current) return
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        for (const pixel of pixelsRef.current) {
            pixel.size = pixel.maxSize
            pixel.draw()
        }
    }

    const doAnimate = (fnName: keyof Pixel) => {
        animationRef.current = requestAnimationFrame(() => doAnimate(fnName))
        const timeNow = performance.now()
        const timePassed = timeNow - timePreviousRef.current
        const timeInterval = 1000 / 60

        if (timePassed < timeInterval) return
        timePreviousRef.current = timeNow - (timePassed % timeInterval)

        const ctx = canvasRef.current?.getContext("2d")
        if (!ctx || !canvasRef.current) return

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

        let allIdle = true
        for (let i = 0; i < pixelsRef.current.length; i++) {
            const pixel = pixelsRef.current[i]
            // @ts-ignore
            pixel[fnName](timeNow, durationMs, easeFn)
            if (!pixel.isIdle) {
                allIdle = false
            }
        }
        if (allIdle) {
            cancelAnimationFrame(animationRef.current as number)
        }
    }

    const handleAnimation = (name: keyof Pixel) => {
        if (animationRef.current !== null) {
            cancelAnimationFrame(animationRef.current)
        }
        animationRef.current = requestAnimationFrame(() => doAnimate(name))
    }

    const onMouseEnter = () => handleAnimation("appear")
    const onMouseLeave = () => handleAnimation("disappear")

    // Export/thumbnail → one static frame. Canvas → auto-run appear+shimmer so
    // the pixels blink per the selected speed. Preview → wait for hover.
    const present = () => {
        if (isExport) drawStaticFrame()
        else if (isCanvas) handleAnimation("appear")
    }

    useEffect(() => {
        initPixels()
        present()
        const observer = new ResizeObserver(() => {
            initPixels()
            present()
        })
        if (containerRef.current) {
            observer.observe(containerRef.current)
        }
        return () => {
            observer.disconnect()
            if (animationRef.current !== null) {
                cancelAnimationFrame(animationRef.current)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        finalGap,
        finalSpeed,
        pixelSize,
        JSON.stringify(finalColors),
        appearFrom,
        isExport,
        isCanvas,
    ])

    const rootStyle: CSSProperties = {
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 80,
        minHeight: 80,
        overflow: "hidden",
        boxSizing: "border-box",
        padding,
        background: backgroundColor,
        display: "grid",
        placeItems: "center",
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: radius,
        isolation: "isolate",
        userSelect: "none",
        transition: "border-color 0.2s cubic-bezier(0.5,1,0.89,1)",
        ...(style || {}),
    }

    return (
        <div
            ref={containerRef}
            style={rootStyle}
            onMouseEnter={isExport || isCanvas ? undefined : onMouseEnter}
            onMouseLeave={isExport || isCanvas ? undefined : onMouseLeave}
            tabIndex={-1}
        >
            <canvas
                ref={canvasRef}
                style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    gridArea: "1 / 1",
                }}
            />
            {showLabel && labelCfg.text ? (
                <div
                    style={{
                        gridArea: "1 / 1",
                        position: "relative",
                        zIndex: 1,
                        display: "grid",
                        placeItems: "center",
                        pointerEvents: "none",
                    }}
                >
                    <span
                        style={{
                            color: labelCfg.color,
                            fontSize: 22,
                            fontWeight: 600,
                            letterSpacing: "-0.01em",
                            ...(labelCfg.font || {}),
                        }}
                    >
                        {labelCfg.text}
                    </span>
                </div>
            ) : null}
        </div>
    )
}

const COMPONENT_DEFAULTS = {
    colors: DEFAULT_COLORS,
    appearFrom: "middle",
    gap: 6,
    pixelSize: 2,
    speed: 80,
    padding: 0,
    transition: { type: "tween", duration: 0.8, ease: "easeOut" },
    backgroundColor: "#000000",
    borderColor: "#27272a",
    borderWidth: 1,
    radius: 25,
    showLabel: false,
    label: {
        text: "",
        color: "#ffffff",
        font: {
            variant: "Semibold",
            fontSize: "22px",
            letterSpacing: "-0.01em",
        } as any,
    },
}

const __presetProps = {
  "colors": [
    "#00FFE599",
    "#FFFFFF"
  ],
  "appearFrom": "right",
  "trigger": "enter",
  "enterPosition": "middle",
  "enterReplay": "yes",
  "gap": 9,
  "pixelSize": 5.6,
  "speed": 69,
  "padding": 0,
  "backgroundColor": "#000000",
  "borderColor": "#27272a",
  "borderWidth": 0.5,
  "radius": 0,
  "showLabel": false,
  "label": {
    "font": {
      "variant": "Semibold",
      "fontSize": "22px",
      "textAlign": "left",
      "fontFamily": "Inter",
      "fontWeight": 400,
      "lineHeight": "1.5em",
      "letterSpacing": "-0.01em"
    },
    "text": "",
    "color": "#ffffff"
  }
};

export default function PixelCard(props: Record<string, unknown>) {
  return <__BaseImpl_PixelCard {...(__presetProps as Record<string, unknown>)} {...props} />;
}
