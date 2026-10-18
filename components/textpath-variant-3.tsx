"use client"

import * as React from "react"
import { useId, useLayoutEffect, useRef, useState } from "react"
const RenderTarget = {
    current: () => "preview",
    canvas: "canvas",
    export: "export",
    thumbnail: "thumbnail",
    preview: "preview",
}

/**
 * TextPath — an infinite wave marquee. Text scrolls smoothly along a sine
 * wave that extends past both edges of the container so the loop never
 * reveals path endpoints, and the marquee wraps seamlessly: each cycle
 * slides the text by exactly one (text + separator) repeat unit, so the
 * snap-back to the start is visually identical to the end-of-cycle frame.
 *
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 200
 */
function __BaseImpl_TextPath(props: Props) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        text,
        speed,
        reversed,
        textFont,
        textColor,
        waveFrequency,
        waveHeight,
        separator,
        gap,
        className,
        width,
        height,
        style,
    } = props

    // Framer's Font control returns fontSize / letterSpacing as string | number
    // (e.g. "17px"). Coerce to a number — feeding a string into the wave math
    // (`h/2 - fontSizePx`) yields NaN, producing an invalid path `d` so the
    // textPath renders nothing. That was the "blank in Framer" bug.
    const toPx = (v: string | number | undefined, fallback: number): number => {
        if (typeof v === "number") return isFinite(v) ? v : fallback
        if (typeof v === "string") {
            const n = parseFloat(v)
            return isFinite(n) ? n : fallback
        }
        return fallback
    }
    const fontSizePx = toPx(textFont?.fontSize, 17)
    const letterSpacingPx = toPx(textFont?.letterSpacing, 0)
    const fontSize = `${fontSizePx}px`
    const letterSpacing = `${letterSpacingPx}px`

    // The Font control carries the chosen family/weight/style — apply them or
    // the modal selection never reaches the rendered text. Fall back to the
    // system stack only when no family is set.
    const systemFontStack =
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    const fontFamily = textFont?.fontFamily || systemFontStack
    const fontWeight = textFont?.fontWeight
    const fontStyle = textFont?.fontStyle

    const containerRef = useRef<HTMLDivElement | null>(null)
    const pathDefRef = useRef<SVGPathElement | null>(null)
    const measureTextRef = useRef<SVGTextElement | null>(null)
    const measureText2Ref = useRef<SVGTextElement | null>(null)
    // Freeze ONLY on true static renders (export / thumbnail). The Framer
    // canvas and Preview run the live rAF marquee so the text scrolls along the
    // wave per the set values while editing. Gating on useIsStaticRenderer()
    // (true on canvas) is what previously froze it to startOffset 0.
    const renderTarget = RenderTarget.current()
    const isStatic =
        renderTarget === RenderTarget.export ||
        renderTarget === RenderTarget.thumbnail

    // Container measurement — drives viewBox + procedural wave geometry.
    // Seeds with the intrinsic size so first paint before measurement
    // still renders something sensible.
    const [containerSize, setContainerSize] = useState<{
        w: number
        h: number
    }>({
        w: 800,
        h: 200,
    })

    useLayoutEffect(() => {
        const el = containerRef.current
        if (!el) return

        // Round to whole pixels and ignore ≤1px deltas. Sub-pixel contentRect
        // values from layout (especially with % sizing) otherwise fire a state
        // update almost every frame, re-rendering mid-animation and stuttering.
        const apply = (rawW: number, rawH: number) => {
            const w = Math.round(rawW)
            const h = Math.round(rawH)
            if (w <= 0 || h <= 0) return
            setContainerSize((prev) =>
                Math.abs(prev.w - w) <= 1 && Math.abs(prev.h - h) <= 1
                    ? prev
                    : { w, h }
            )
        }

        const rect = el.getBoundingClientRect()
        apply(rect.width, rect.height)

        if (typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                apply(entry.contentRect.width, entry.contentRect.height)
            }
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const reactId = useId()
    const pathId = `tp-${reactId.replace(/[:]/g, "")}-path`

    const w = containerSize.w > 0 ? containerSize.w : 800
    const h = containerSize.h > 0 ? containerSize.h : 200

    // Pixel width of one (text + separator) repeat unit at current font
    // settings, measured from a hidden <text> element via getComputedTextLength.
    // Declared here (above the wave geometry) because the wavelength is aligned
    // to it so the rigid-translate marquee is seamless — see below.
    const [unitWidthPx, setUnitWidthPx] = useState(0)
    // Non-empty unit so getComputedTextLength returns something useful even
    // when text is "" — falls back to a single space.
    const safeText = text && text.length > 0 ? text : " "
    // Gap (0–20) = padding on BOTH sides of the separator, so the spacing sits
    // between text and separator at every junction of the repeated unit.
    // Uses NBSP ( ), not normal spaces: SVG <text> collapses runs of
    // regular whitespace to one and trims the ends, so plain spaces did nothing.
    const gapStr = " ".repeat(Math.max(0, Math.min(20, Math.round(gap ?? 0))))
    const unitText = safeText + gapStr + (separator ?? "") + gapStr
    // ~0.6·fontSize per char is a safe pre-measurement estimate of unit width.
    const estUnitWidthPx = Math.max(1, unitText.length * fontSizePx * 0.6)
    const effUnitWidthPx = unitWidthPx > 0 ? unitWidthPx : estUnitWidthPx

    // Procedural sine wave that extends past both edges so the marquee
    // never reveals path endpoints. `waveFrequency` = full cycles across
    // the VISIBLE width; we derive the half-cycle pixel width from that,
    // then keep stepping the same half-cycle width outward until we cover
    // [-overflow, w + overflow]. This guarantees the off-screen wave
    // matches the on-screen wave (same period, same amplitude).
    //
    // `waveHeight` is the TRUE peak-to-trough height in pixels, so the
    // amplitude (peak offset from the centerline) = waveHeight / 2.
    // The amplitude is clamped to h/2 - fontSizePx so the GLYPHS at the
    // wave peaks/troughs stay inside the container instead of being cut
    // off by overflow:hidden — text sits on the path, and a glyph extends
    // ~one font-size beyond the path point, so we reserve that margin top
    // and bottom. This keeps every wave's text fully visible.
    // A symmetric cubic bézier with both control points at offset A only
    // reaches 0.75·A at its midpoint, so we scale the control-point offset
    // by 4/3 (ctrlAmp) to make the rendered peak hit the requested
    // amplitude exactly. ctrlAmp is derived from the already-clamped amplitude.
    // Wave frequency is fully independent of height; height math never
    // touches halfCyclesVisible and vice-versa.
    const cy = h / 2
    const amplitude = Math.max(0, Math.min(waveHeight / 2, h / 2 - fontSizePx))
    const ctrlAmp = amplitude * (4 / 3)
    const halfCyclesVisible = Math.max(1, Math.round(waveFrequency * 2))
    const halfWidth = w / halfCyclesVisible
    const overflow = Math.max(100, w * 0.3)

    // Count how many half-cycles we need to step left of x=0 and right of
    // x=w to cover the overflow. Start the path at an integer multiple of
    // halfWidth so the centerline crossings stay phase-aligned with x=0.
    const leftSteps = Math.ceil(overflow / halfWidth)
    const rightSteps = Math.ceil(overflow / halfWidth)
    const totalSteps = halfCyclesVisible + leftSteps + rightSteps
    const xStart = -leftSteps * halfWidth
    // Alternate peak direction per half-cycle. With `leftSteps` segments
    // prepended, the first segment that overlaps the visible region keeps
    // its peak direction stable regardless of overflow size, because
    // every additional pair of half-cycles cancels out — but parity does
    // matter, so we flip the starting sign when `leftSteps` is odd to
    // keep the visible portion looking identical regardless of overflow.
    const startSign = leftSteps % 2 === 0 ? -1 : 1

    let d = `M ${xStart},${cy}`
    for (let i = 0; i < totalSteps; i++) {
        const xa = xStart + i * halfWidth
        const xb = xStart + (i + 1) * halfWidth
        const peakY =
            cy + (i % 2 === 0 ? startSign * ctrlAmp : -startSign * ctrlAmp)
        d +=
            ` C ${xa + halfWidth / 3},${peakY}` +
            ` ${xb - halfWidth / 3},${peakY}` +
            ` ${xb},${cy}`
    }
    const effectivePath = d

    // Path length L — measured after the path element commits, used to size
    // the repeat count so the text always covers the full path.
    const [pathLengthPx, setPathLengthPx] = useState(0)

    useLayoutEffect(() => {
        const el = pathDefRef.current
        if (!el) return
        let len = 0
        try {
            len = el.getTotalLength()
        } catch {
            len = 0
        }
        if (!isFinite(len) || len <= 0) return
        setPathLengthPx((prev) => (prev === len ? prev : len))
    }, [effectivePath, w, h])

    useLayoutEffect(() => {
        const a = measureTextRef.current
        const b = measureText2Ref.current
        if (!a || !b) return
        let la = 0
        let lb = 0
        try {
            la = a.getComputedTextLength()
            lb = b.getComputedTextLength()
        } catch {
            la = 0
            lb = 0
        }
        // True per-unit period = (length of 4 units − length of 2 units) / 2.
        // A difference cancels leading/trailing-whitespace trimming (which
        // getComputedTextLength applies to the element's edges) and the unit's
        // own internal spacing, leaving exactly two whole repeat periods —
        // including the inter-unit letter-spacing. The rAF wrap modulus then
        // matches the on-path advance exactly, so the marquee never hops.
        const period = (lb - la) / 2
        if (!isFinite(period) || period <= 0) return
        setUnitWidthPx((prev) => (prev === period ? prev : period))
    }, [unitText, fontSize, letterSpacing, fontFamily, fontWeight, fontStyle])

    // Number of repeats so total text length comfortably exceeds path length,
    // so the text fills the path even before measurement / in static renders.
    // Arc-length estimate per half-cycle bump: each segment travels halfWidth
    // horizontally while swinging up to the control-point offset (ctrlAmp) and
    // back. A near-straight `totalSteps * halfWidth` estimate badly undercounts
    // at high wave frequency/amplitude (steep bumps are several× their chord),
    // which left too few text repeats so the last waves rendered empty. hypot
    // captures the vertical excursion; ×1.15 adds headroom for the curve.
    const segArc = 2 * Math.hypot(halfWidth / 2, ctrlAmp) * 1.15
    const estPathLengthPx = totalSteps * Math.max(halfWidth, segArc)
    // Always take the LARGER of measured vs estimate so a low getTotalLength
    // (or none, on static/export) can never undercount and leave a blank tail.
    const effPathLengthPx = Math.max(pathLengthPx, estPathLengthPx)
    const repeatCount = Math.min(
        256,
        Math.max(2, Math.ceil(effPathLengthPx / effUnitWidthPx) + 3)
    )
    const repeatedText = unitText.repeat(repeatCount)

    // Motion scrolls the text ALONG the fixed wave by animating textPath's
    // startOffset — the wave stays put, the text flows through it. The path is
    // fixed and the rendered string is (text+separator) repeated, so advancing
    // by exactly one repeat unit is pixel-identical to advancing by zero: the
    // loop wrap is seamless regardless of the wave shape.
    //
    // Driven by a single long-lived rAF loop reading refs, so re-renders
    // (measurement, resize, font) never tear it down and snap it back. dt is
    // clamped so a stall can't produce a position jump.
    //
    // Speed (0–100) → pixels/sec (×5): 0 = stopped, 1 = very slow, 100 = fast.
    const offsetRef = useRef(0)
    const lastTRef = useRef<number | null>(null)
    const speedRef = useRef(0)
    const reversedRef = useRef(false)
    const unitWidthRef = useRef(0)
    const textPathRef = useRef<SVGTextPathElement | null>(null)

    speedRef.current = Math.max(0, speed ?? 0) * 5
    reversedRef.current = reversed
    unitWidthRef.current = unitWidthPx > 0 ? unitWidthPx : 0

    useLayoutEffect(() => {
        const el = textPathRef.current
        if (!el) return
        if (isStatic) {
            el.setAttribute("startOffset", "0")
            return
        }
        lastTRef.current = null
        let raf = 0
        const loop = (t: number) => {
            if (lastTRef.current == null) lastTRef.current = t
            const dt = Math.min((t - lastTRef.current) / 1000, 1 / 30)
            lastTRef.current = t
            const unit = unitWidthRef.current
            const pps = speedRef.current
            if (unit > 0 && pps > 0) {
                const dir = reversedRef.current ? 1 : -1
                let off = offsetRef.current + dir * pps * dt
                off -= Math.floor(off / unit) * unit // wrap [0,unit) — seamless
                offsetRef.current = off
                el.setAttribute("startOffset", `${off}px`)
            }
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(raf)
    }, [isStatic])

    const resolveDim = (
        v: string | number | undefined,
        fallback: string
    ): string => {
        if (v == null) return fallback
        if (typeof v === "number") return `${v}px`
        return v
    }

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                position: "relative",
                width: resolveDim(width, "100%"),
                height: resolveDim(height, "100%"),
                overflow: "hidden",
                ...style,
            }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`0 0 ${w} ${h}`}
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid meet"
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                }}
            >
                <defs>
                    <path
                        ref={pathDefRef}
                        id={pathId}
                        d={effectivePath}
                        fill="none"
                    />
                </defs>
                {/* Hidden measurement elements — 2 and 4 repeat units at the
                    same font settings as the textPath. The per-unit period is
                    derived as (len4 − len2)/2 (see the measurement effect),
                    which is immune to the edge-whitespace trimming a single-unit
                    measurement suffers. visibility:hidden keeps them invisible
                    but measurable; pointer-events:none for safety. */}
                <text
                    ref={measureTextRef}
                    x={0}
                    y={-9999}
                    style={{
                        fontSize,
                        letterSpacing,
                        fontFamily,
                        fontWeight,
                        fontStyle,
                        visibility: "hidden",
                        pointerEvents: "none",
                    }}
                >
                    {unitText.repeat(2)}
                </text>
                <text
                    ref={measureText2Ref}
                    x={0}
                    y={-9999}
                    style={{
                        fontSize,
                        letterSpacing,
                        fontFamily,
                        fontWeight,
                        fontStyle,
                        visibility: "hidden",
                        pointerEvents: "none",
                    }}
                >
                    {unitText.repeat(4)}
                </text>
                <text
                    fill={textColor}
                    style={{
                        fontSize,
                        letterSpacing,
                        fontFamily,
                        fontWeight,
                        fontStyle,
                    }}
                >
                    {/* startOffset is driven imperatively by the rAF loop — not
                        declared here, so React re-renders never reset it. */}
                    <textPath
                        ref={textPathRef}
                        href={`#${pathId}`}
                        xlinkHref={`#${pathId}`}
                    >
                        {repeatedText}
                    </textPath>
                </text>
            </svg>
        </div>
    )
}

type FontValue = {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    fontSize?: number | string
    letterSpacing?: number | string
    lineHeight?: number | string
    variant?: string
}

type Props = {
    text: string
    speed: number
    reversed: boolean
    textFont: FontValue
    textColor: string
    waveFrequency: number
    waveHeight: number
    separator: string
    gap: number
    className: string
    width?: string | number
    height?: string | number
    style?: React.CSSProperties
}

const COMPONENT_DEFAULTS = {
    text: "TEXT PATH",
    separator: "   •   ",
    gap: 0,
    textFont: {
        fontSize: 17,
        variant: "Regular",
        letterSpacing: 0,
        lineHeight: 1.2,
    },
    textColor: "#FFFFFF",
    speed: 30,
    reversed: true,
    waveFrequency: 3,
    waveHeight: 100,
    className: "",
    width: 800,
    height: 200,
}

const __presetProps = {
  "gap": 2,
  "text": "Beautifully Crafted",
  "speed": 25,
  "reversed": true,
  "textFont": {
    "variant": "Regular",
    "fontSize": 40,
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 400,
    "lineHeight": 1.5,
    "letterSpacing": 1
  },
  "separator": "✨",
  "textColor": "#FFFFFF",
  "waveHeight": 200,
  "waveFrequency": 0
};

export default function TextPath(props: Record<string, unknown>) {
  return <__BaseImpl_TextPath {...(__presetProps as Record<string, unknown>)} {...props} />;
}
