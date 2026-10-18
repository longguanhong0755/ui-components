"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ types */

/** Framer hands an image control back as a URL string on older versions and
 * as a responsive-image object on newer ones. Accept both. */
type ImageValue = string | { src?: string } | null | undefined

/** A row of the Items array: the `{ image, offsetY }` object the panel
 * writes, or a bare image for lists authored before the offset existed. */
type ItemInput = ImageValue | { image?: ImageValue; offsetY?: number }

/** One resolved plate. `offsetY` is carried, not baked in: it is applied
 * where the `<img>` is written, so dragging the slider reframes every
 * picture already on screen. */
interface Plate {
    src: string | null
    offsetY: number
    tag: string
}

export interface VerticalParallaxProps {
    /** Content */
    items?: ItemInput[]
    /** The component's own ground. */
    background?: string
    /** Text: whether the labels are drawn, and the column they sit in. */
    labels?: { show?: boolean; width?: number; gap?: number }
    font?: CSSProperties
    textColor?: string
    /** Structure */
    direction?: "vertical" | "horizontal"
    spacing?: number
    alternate?: boolean
    /** Element */
    cardWidth?: number
    cardHeight?: number
    radius?: number
    /** Travel */
    parallax?: number
    sensitivity?: number
    smoothing?: number
    style?: CSSProperties
}

/* -------------------------------------------------------------- constants */

/** Plates drawn when the Items array is empty, so the component renders
 * standing on its own with no props. */
const PLACEHOLDER_COUNT = 10

/** Drift as a fraction of the row's height at Parallax 10, for even rows and
 * for odd ones. The 2:1 split is the look — it is what makes the two sizes
 * read as two distances rather than one column at one speed. */
const EVEN_DRIFT = 0.3
const ODD_DRIFT = 0.15

/** Slack on the picture's scale beyond what the drift strictly needs, so a
 * rounded pixel at the extreme of the travel never shows the window's
 * background through the edge of the crop. */
const COVER_SLACK = 0.02

/** The band of a row's travel over which its label comes up, in progress.
 * It starts after the row is properly on screen and finishes before the
 * middle, so the writing is solid while the picture is being looked at. */
const FADE_START = 0.15
const FADE_END = 0.42

/** Odd rows against the even ones' Card Width / Card Height. Portrait
 * against landscape — fixed, because a second pair of sliders for the
 * alternate size is four numbers for one rhythm. */
const ALT_WIDTH = 0.667
const ALT_HEIGHT = 1.5

/** Labels are set in caps. Part of the index look, not a knob. */
const LABEL_CASE = "uppercase" as const

const DEFAULT_BACKGROUND = "#000000"
const DEFAULT_TEXT_COLOR = "#0A0A0A"

const DEFAULT_LABELS = {
    show: false,
    width: 256,
    gap: 32,
}

const DEFAULT_FONT: CSSProperties = {
    fontFamily:
        "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace",
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: "0.08em",
    lineHeight: 1.4,
}

const DEFAULTS = {
    direction: "vertical",
    spacing: 2,
    alternate: false,
    cardWidth: 400,
    cardHeight: 300,
    radius: 0,
    parallax: 6,
    sensitivity: 5,
    smoothing: 7,
}

const DEFAULT_ITEMS: ItemInput[] = [
    {
        image: {
            src: "https://images.unsplash.com/photo-1656932850123-dbd64a854816?q=80&w=2803&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        },
        offsetY: 0,
    },
    {
        image: {
            src: "https://images.unsplash.com/photo-1636408807362-a6195d3dd4de?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDF8fHxlbnwwfHx8fHw%3D",
        },
        offsetY: 0,
    },
    {
        image: {
            src: "https://images.unsplash.com/photo-1734101731940-d0489c942d6c?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDJ8fHxlbnwwfHx8fHw%3D",
        },
        offsetY: 0,
    },
    {
        image: {
            src: "https://images.unsplash.com/photo-1669647561467-891414e9b140?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDV8fHxlbnwwfHx8fHw%3D",
        },
        offsetY: 0,
    },
    {
        image: {
            src: "https://images.unsplash.com/photo-1655906541920-09ccb02adf51?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDd8fHxlbnwwfHx8fHw%3D",
        },
        offsetY: 0,
    },
    {
        image: {
            src: "https://images.unsplash.com/photo-1684139517679-032b7213ad2e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE1fHx8ZW58MHx8fHx8",
        },
        offsetY: 0,
    },
    {
        image: {
            src: "https://images.unsplash.com/photo-1641507616021-53aa9b83bf84?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDMzfHx8ZW58MHx8fHx8",
        },
        offsetY: 0,
    },
    {
        image: {
            src: "https://images.unsplash.com/photo-1634693798046-b00e706c3076?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDg1fHx8ZW58MHx8fHx8",
        },
        offsetY: 0,
    },
    {
        image: {
            src: "https://images.unsplash.com/photo-1729420477994-dee878963dc4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDk5fHx8ZW58MHx8fHx8",
        },
        offsetY: 0,
    },
]

/* -------------------------------------------------------------- internals */

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

/** Positive modulo — JS `%` keeps the sign of the dividend, which would send
 * wrapped rows off above the column instead of round to the bottom. */
function wrap(value: number, span: number): number {
    return ((value % span) + span) % span
}

function resolveSrc(value: ImageValue): string | null {
    if (!value) return null
    if (typeof value === "string") return value || null
    const src = value.src
    return typeof src === "string" && src ? src : null
}

function imageOf(item: ItemInput): string | null {
    if (item && typeof item === "object" && "image" in item)
        return resolveSrc(item.image)
    return resolveSrc(item as ImageValue)
}

function offsetOf(item: ItemInput): number {
    if (item && typeof item === "object" && "offsetY" in item) {
        const offset = (item as { offsetY?: number }).offsetY
        return typeof offset === "number" && isFinite(offset) ? offset : 0
    }
    return 0
}

/** A plate's number, as the index draws it: `01/`, `02/`. Generated from the
 * row's place in the list — the numbering is not something to type. */
function autoTag(index: number): string {
    return `${String(index + 1).padStart(2, "0")}/`
}

/** Stand-in artwork so the column has something to move before the user has
 * filled the array in. */
function placeholderFill(index: number): string {
    const hue = (index * 37 + 24) % 360
    return `linear-gradient(155deg, hsl(${hue} 24% 78%), hsl(${
        (hue + 40) % 360
    } 18% 52%))`
}

/** Everything the animation frame needs, refreshed on every render so the
 * rAF loop never has to be torn down and rebuilt when a control changes. */
interface Frame {
    tops: number[]
    heights: number[]
    widths: number[]
    count: number
    span: number
    viewport: number
    ease: number
    drift: number
    axisIsY: boolean
}

/* -------------------------------------------------------------- component */

function __BaseImpl_VerticalParallax({
    items = DEFAULT_ITEMS,
    background = DEFAULT_BACKGROUND,
    labels,
    font = DEFAULT_FONT,
    textColor = DEFAULT_TEXT_COLOR,
    direction = DEFAULTS.direction,
    spacing = DEFAULTS.spacing,
    alternate = DEFAULTS.alternate,
    cardWidth = DEFAULTS.cardWidth,
    cardHeight = DEFAULTS.cardHeight,
    radius = DEFAULTS.radius,
    parallax = DEFAULTS.parallax,
    sensitivity = DEFAULTS.sensitivity,
    smoothing = DEFAULTS.smoothing,
    style,
}: VerticalParallaxProps) {
    // Merge, so a panel object that is missing a field is still safe.
    const label = { ...DEFAULT_LABELS, ...labels }
    // The scroll axis: rows stack and travel along this; the cross axis is
    // just centred by flexbox, so nothing else needs to know about it.
    const axisIsY = direction !== "horizontal"

    const containerRef = useRef<HTMLDivElement | null>(null)
    const rowNodes = useRef<(HTMLDivElement | null)[]>([])
    const imageNodes = useRef<(HTMLElement | null)[]>([])
    const labelNodes = useRef<(HTMLDivElement | null)[]>([])
    const target = useRef(0)
    const current = useRef(0)
    const [viewport, setViewport] = useState(0)

    /* ---- source list: the user's items, or placeholders when empty */
    const source = useMemo<Plate[]>(() => {
        const resolved: Plate[] = []
        for (const item of items ?? []) {
            const src = imageOf(item)
            if (!src) continue
            resolved.push({
                src,
                offsetY: offsetOf(item),
                tag: autoTag(resolved.length),
            })
        }
        if (resolved.length) return resolved
        return Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => ({
            src: null,
            offsetY: 0,
            tag: autoTag(i),
        }))
    }, [items])

    /* ---- derived motion: abstract 0–10 scales mapped to real units */
    const gap = clamp(spacing, 0, 10) * 20
    const ease = 0.15 - (clamp(smoothing, 0, 10) / 10) * 0.13
    const drift = clamp(parallax, 0, 10) / 10
    const wheelMultiplier = 0.4 + (clamp(sensitivity, 0, 10) / 10) * 1.2
    const dragMultiplier = 0.6 + (clamp(sensitivity, 0, 10) / 10) * 1.8

    /* ---- geometry: repeat the list until the column outruns the frame, so
     * the wrap has no seam, then solve every row's height and top once */
    const layout = useMemo(() => {
        const n = source.length
        const evenSize = {
            width: Math.round(cardWidth),
            height: Math.round(cardHeight),
        }
        const oddSize = alternate
            ? {
                  width: Math.round(cardWidth * ALT_WIDTH),
                  height: Math.round(cardHeight * ALT_HEIGHT),
              }
            : evenSize
        const sizeAt = (i: number) => (i % 2 === 0 ? evenSize : oddSize)
        // The dimension rows stack and travel along — height for a column,
        // width for a filmstrip.
        const extentOf = (size: { width: number; height: number }) =>
            axisIsY ? size.height : size.width

        if (!n) {
            return { count: 0, tops: [], heights: [], widths: [], span: 0 }
        }

        // With an odd list the sizes would fall on different items in each
        // repeat, so the same picture would change shape as the column
        // wrapped. Doubling the block makes the rhythm periodic again.
        const blockLength = alternate && n % 2 === 1 ? n * 2 : n
        let blockSpan = 0
        for (let i = 0; i < blockLength; i += 1)
            blockSpan += extentOf(sizeAt(i))
        blockSpan += blockLength * gap

        const tallest = Math.max(extentOf(evenSize), extentOf(oddSize))
        let count = blockLength
        if (blockSpan > 0) {
            // The column must be at least a frame plus one row taller than
            // the viewport, or a wrapped row would arrive inside the frame.
            const need = viewport + tallest * 2
            const repeats = Math.max(1, Math.ceil(need / blockSpan))
            count = blockLength * repeats
        }

        const tops: number[] = []
        const heights: number[] = []
        const widths: number[] = []
        let cursor = 0
        for (let i = 0; i < count; i += 1) {
            const size = sizeAt(i)
            tops.push(cursor)
            heights.push(size.height)
            widths.push(size.width)
            cursor += extentOf(size) + gap
        }
        return { count, tops, heights, widths, span: cursor }
    }, [
        source.length,
        cardWidth,
        cardHeight,
        alternate,
        gap,
        viewport,
        axisIsY,
    ])

    /* ---- live config for the frame loop (written during render, read in rAF) */
    const frame = useRef<Frame>({
        tops: [],
        heights: [],
        widths: [],
        count: 0,
        span: 0,
        viewport: 0,
        ease: 0.06,
        drift: 0,
        axisIsY: true,
    })
    frame.current = {
        tops: layout.tops,
        heights: layout.heights,
        widths: layout.widths,
        count: layout.count,
        span: layout.span,
        viewport,
        ease,
        drift,
        axisIsY,
    }

    /* ---- input config, read by the listeners without re-binding them */
    const input = useRef({ wheelMultiplier, dragMultiplier, axisIsY })
    input.current = { wheelMultiplier, dragMultiplier, axisIsY }

    /* ---- measure */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        const observer = new ResizeObserver((entries) => {
            const rect = entries[0].contentRect
            setViewport(axisIsY ? rect.height : rect.width)
        })
        observer.observe(node)
        const rect = node.getBoundingClientRect()
        setViewport(axisIsY ? rect.height : rect.width)
        return () => observer.disconnect()
    }, [axisIsY])

    /* ---- drop refs for rows that no longer exist */
    useEffect(() => {
        rowNodes.current.length = layout.count
        imageNodes.current.length = layout.count
        labelNodes.current.length = layout.count
    }, [layout.count])

    /* ---- the loop: lerp the offset, then place every row, drift its
     * picture against the travel and bring its label up */
    useEffect(() => {
        let raf = 0
        let last = 0

        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            const c = frame.current
            const delta = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60
            last = now
            if (!c.count || c.span <= 0 || c.viewport <= 0) return

            // Keep both values inside one span so long sessions stay precise.
            if (current.current > c.span || current.current < -c.span) {
                const shift = Math.trunc(current.current / c.span) * c.span
                current.current -= shift
                target.current -= shift
            }

            // Frame-rate independent lerp — `ease` is calibrated at 60fps.
            const k = 1 - Math.pow(1 - c.ease, delta * 60)
            current.current += (target.current - current.current) * k

            for (let i = 0; i < c.count; i += 1) {
                const row = rowNodes.current[i]
                if (!row) continue
                const extent = c.axisIsY ? c.heights[i] : c.widths[i]
                const raw = c.tops[i] - current.current

                // Wrapped rows live in [-extent, span - extent): one row of
                // slack above the frame, so nothing pops in mid-view.
                const pos = wrap(raw + extent, c.span) - extent
                row.style.transform = c.axisIsY
                    ? `translate3d(0, ${pos}px, 0)`
                    : `translate3d(${pos}px, 0, 0)`

                // Progress: 0 as the row's leading edge meets the frame's
                // start, 1 as its trailing edge leaves the frame's end.
                const progress = clamp(
                    (c.viewport - pos) / (c.viewport + extent),
                    0,
                    1
                )

                const picture = imageNodes.current[i]
                if (picture) {
                    const amp =
                        (i % 2 === 0 ? EVEN_DRIFT : ODD_DRIFT) * c.drift
                    // Scale to exactly what the drift needs plus a hair, so
                    // the crop stays covered at both ends of the travel.
                    const scale = 1 + amp * 2 + COVER_SLACK
                    const shift = (progress - 0.5) * 2 * amp * extent
                    picture.style.transform = c.axisIsY
                        ? `translate3d(0, ${shift}px, 0) scale(${scale})`
                        : `translate3d(${shift}px, 0, 0) scale(${scale})`
                }

                const writing = labelNodes.current[i]
                if (writing) {
                    const t = clamp(
                        (progress - FADE_START) / (FADE_END - FADE_START),
                        0,
                        1
                    )
                    writing.style.opacity = `${t}`
                }
            }
        }

        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [])

    /* ---- wheel / trackpad */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        const onWheel = (event: WheelEvent) => {
            event.preventDefault()
            target.current += event.deltaY * input.current.wheelMultiplier
        }
        node.addEventListener("wheel", onWheel, { passive: false })
        return () => node.removeEventListener("wheel", onWheel)
    }, [])

    /* ---- pointer drag */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        let pointer: number | null = null
        let last = 0

        const onDown = (event: PointerEvent) => {
            if (pointer !== null) return
            pointer = event.pointerId
            last = input.current.axisIsY ? event.clientY : event.clientX
            node.setPointerCapture(event.pointerId)
        }
        const onMove = (event: PointerEvent) => {
            if (pointer !== event.pointerId) return
            const value = input.current.axisIsY
                ? event.clientY
                : event.clientX
            const delta = value - last
            last = value
            // Dragging forward pulls the column forward, so the offset falls.
            target.current -= delta * input.current.dragMultiplier
        }
        const onUp = (event: PointerEvent) => {
            if (pointer !== event.pointerId) return
            pointer = null
            if (node.hasPointerCapture(event.pointerId))
                node.releasePointerCapture(event.pointerId)
        }

        node.addEventListener("pointerdown", onDown)
        node.addEventListener("pointermove", onMove)
        node.addEventListener("pointerup", onUp)
        node.addEventListener("pointercancel", onUp)
        return () => {
            node.removeEventListener("pointerdown", onDown)
            node.removeEventListener("pointermove", onMove)
            node.removeEventListener("pointerup", onUp)
            node.removeEventListener("pointercancel", onUp)
        }
    }, [])

    const labelStyle: CSSProperties = {
        ...font,
        color: textColor,
        textTransform: LABEL_CASE,
        width: label.width,
        flexShrink: 0,
        opacity: 0,
        willChange: "opacity",
    }

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                cursor: "grab",
                touchAction: axisIsY ? "pan-x" : "pan-y",
                userSelect: "none",
                opacity: viewport > 0 ? 1 : 0,
                transition: "opacity 0.35s ease",
                ...style,
            }}
        >
            {Array.from({ length: layout.count }, (_, i) => {
                const plate = source[i % source.length]
                const isEven = i % 2 === 0
                const writing = label.show ? (
                    <div
                        ref={(el) => {
                            labelNodes.current[i] = el
                        }}
                        style={{
                            ...labelStyle,
                            textAlign: isEven ? "right" : "left",
                        }}
                    >
                        {plate.tag}
                    </div>
                ) : null
                // The empty column on the other side keeps the picture on the
                // frame's centreline whichever way the label is thrown.
                const spacer = label.show ? (
                    <div style={{ width: label.width, flexShrink: 0 }} />
                ) : null

                return (
                    <div
                        key={i}
                        ref={(el) => {
                            rowNodes.current[i] = el
                        }}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: axisIsY ? "100%" : layout.widths[i],
                            height: axisIsY ? layout.heights[i] : "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: label.show ? label.gap : 0,
                            transform: axisIsY
                                ? `translate3d(0, ${layout.tops[i]}px, 0)`
                                : `translate3d(${layout.tops[i]}px, 0, 0)`,
                            willChange: "transform",
                            pointerEvents: "none",
                        }}
                    >
                        {isEven ? writing : spacer}
                        <div
                            style={{
                                position: "relative",
                                width: layout.widths[i],
                                height: layout.heights[i],
                                flexShrink: 0,
                                overflow: "hidden",
                                borderRadius: radius,
                                background: plate.src
                                    ? "#111"
                                    : placeholderFill(i % source.length),
                            }}
                        >
                            {plate.src ? (
                                <img
                                    ref={(el) => {
                                        imageNodes.current[i] = el
                                    }}
                                    src={plate.src}
                                    alt=""
                                    draggable={false}
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        // `cover` already overflows the box on
                                        // one axis; this picks which part of
                                        // that overflow you see, so 0 is the
                                        // crop the box would have had anyway.
                                        objectPosition: `50% calc(50% + ${plate.offsetY}px)`,
                                        willChange: "transform",
                                    }}
                                />
                            ) : (
                                // Placeholders drift too, so the motion is
                                // legible before any picture is dropped in.
                                <div
                                    ref={(el) => {
                                        imageNodes.current[i] = el
                                    }}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        background: placeholderFill(
                                            i % source.length
                                        ),
                                        willChange: "transform",
                                    }}
                                />
                            )}
                        </div>
                        {isEven ? spacer : writing}
                    </div>
                )
            })}
        </div>
    )
}

const __presetProps = {
  "items": [
    {
      "image": {
        "alt": "",
        "src": "https://images.unsplash.com/photo-1656932850123-dbd64a854816?q=80&w=2803&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      },
      "offsetY": 0
    },
    {
      "image": {
        "alt": "",
        "src": "https://images.unsplash.com/photo-1636408807362-a6195d3dd4de?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDF8fHxlbnwwfHx8fHw%3D"
      },
      "offsetY": 0
    },
    {
      "image": {
        "alt": "",
        "src": "https://images.unsplash.com/photo-1734101731940-d0489c942d6c?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDJ8fHxlbnwwfHx8fHw%3D"
      },
      "offsetY": 0
    },
    {
      "image": {
        "alt": "",
        "src": "https://images.unsplash.com/photo-1669647561467-891414e9b140?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDV8fHxlbnwwfHx8fHw%3D"
      },
      "offsetY": 0
    },
    {
      "image": {
        "alt": "",
        "src": "https://images.unsplash.com/photo-1655906541920-09ccb02adf51?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDd8fHxlbnwwfHx8fHw%3D"
      },
      "offsetY": 0
    },
    {
      "image": {
        "alt": "",
        "src": "https://images.unsplash.com/photo-1684139517679-032b7213ad2e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE1fHx8ZW58MHx8fHx8"
      },
      "offsetY": 0
    },
    {
      "image": {
        "alt": "",
        "src": "https://images.unsplash.com/photo-1641507616021-53aa9b83bf84?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDMzfHx8ZW58MHx8fHx8"
      },
      "offsetY": 0
    },
    {
      "image": {
        "alt": "",
        "src": "https://images.unsplash.com/photo-1634693798046-b00e706c3076?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDg1fHx8ZW58MHx8fHx8"
      },
      "offsetY": 0
    },
    {
      "image": {
        "alt": "",
        "src": "https://images.unsplash.com/photo-1729420477994-dee878963dc4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDk5fHx8ZW58MHx8fHx8"
      },
      "offsetY": 0
    }
  ],
  "background": "#000000",
  "labels": {
    "gap": 32,
    "show": false,
    "width": 256
  },
  "font": {
    "fontFamily": "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace",
    "variant": "Regular",
    "fontWeight": 500,
    "fontSize": 13,
    "lineHeight": 1.4,
    "letterSpacing": "0.08em",
    "textAlign": "left"
  },
  "textColor": "#0A0A0A",
  "direction": "vertical",
  "spacing": 2,
  "alternate": false,
  "cardWidth": 400,
  "cardHeight": 300,
  "radius": 0,
  "parallax": 10,
  "sensitivity": 5,
  "smoothing": 7
};

export default function VerticalParallax(props: Record<string, unknown>) {
  return <__BaseImpl_VerticalParallax {...(__presetProps as Record<string, unknown>)} {...props} />;
}
