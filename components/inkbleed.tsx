"use client"

import { useEffect, useId, useLayoutEffect, useMemo, useRef } from "react"

// Spot blur — AE-style parameters.
//   MAIN_RADIUS      = inner radius of the spot.  In INVERT mode this is
//                      the inner edge of the blurred core.
//   SECONDARY_RADIUS = outer radius — the fade ends here.
//   INVERT           = true → blur INSIDE the spot, sharp outside.
//   BLUR_AMOUNT      = spot's gaussian blur stdDeviation.
//   FRINGE           = chromatic-aberration shift in px.
const MAIN_RADIUS = 0
const SECONDARY_RADIUS = 35
const INVERT = true
const BLUR_AMOUNT = 10
const FRINGE = 5

// Choker offsets — symmetric so the two chokers balance each other and
// give the liquid feel inside the spot lens.
const LEFT_CHOKER_OFFSET = -10
const RIGHT_CHOKER_OFFSET = 10

// Goo pipeline — fuses sharp + blur + both chokers + neighbour chars
// into one continuous ink shape. Higher THRESHOLD multiplier yields a
// sharper alpha transition → goo blob is fully opaque inside, hard edge
// outside, no semi-transparent fringe leaking the bg through the spot.
const GOO_BLUR = 6
const THRESHOLD = 40
const CUTOFF = -15

// Cursor smoothing.
const FOLLOW = 0.3
const INTENSITY_FOLLOW = 0.25
const SETTLE_EPSILON = 0.4

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 200
 */
export default function InkBleed(props: any) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const { text, color, font, intensity, tag } = props
    const Tag = (tag ?? "div") as any

    // Intensity 0..100 → multiplier 0..6. 0 = no effect, 100 = very wide
    // spot (twice the previous max). Held in a ref so the running rAF
    // loop reads fresh values without being re-created on slider ticks.
    const intensityFactor = Math.max(0, Math.min(100, intensity ?? 50)) / 16.67
    const intensityRef = useRef(intensityFactor)
    intensityRef.current = intensityFactor

    const rawId = useId()
    const safeId = rawId.replace(/[:]/g, "")
    const filterGooId = `ink-goo-${safeId}`
    const filterFringeId = `ink-fringe-${safeId}`

    const chars = useMemo(() => Array.from((text as string) ?? ""), [text])

    const containerRef = useRef<HTMLDivElement | null>(null)
    const wrapRefs = useRef<(HTMLSpanElement | null)[]>([])
    const leftRefs = useRef<(HTMLSpanElement | null)[]>([])
    const rightRefs = useRef<(HTMLSpanElement | null)[]>([])
    const metrics = useRef<
        {
            cx: number
            cy: number
            w: number
            h: number
            left: number
            top: number
        }[]
    >([])

    const measure = () => {
        metrics.current = wrapRefs.current.map((el) => {
            if (!el) return { cx: 0, cy: 0, w: 0, h: 0, left: 0, top: 0 }
            const r = el.getBoundingClientRect()
            return {
                cx: r.left + r.width / 2,
                cy: r.top + r.height / 2,
                w: r.width,
                h: r.height,
                left: r.left,
                top: r.top,
            }
        })
    }

    useLayoutEffect(() => {
        measure()
        const ro = new ResizeObserver(measure)
        if (containerRef.current) ro.observe(containerRef.current)
        window.addEventListener("scroll", measure, { passive: true })
        window.addEventListener("resize", measure)
        return () => {
            ro.disconnect()
            window.removeEventListener("scroll", measure)
            window.removeEventListener("resize", measure)
        }
    }, [chars.length])

    const target = useRef({ x: -9999, y: -9999, on: 0 })
    const smooth = useRef({ x: -9999, y: -9999, on: 0 })
    const rafRef = useRef<number | null>(null)

    const render = () => {
        const { x: cx, y: cy, on } = smooth.current
        const container = containerRef.current
        if (container) {
            // --spot-on scales every mask circle's radius. Multiplied by
            // the intensity factor so the slider drives spot SIZE: at 0
            // the radius collapses to 0 (no effect); at 100 the radius
            // can grow up to ~3× the reference SECONDARY_RADIUS.
            container.style.setProperty(
                "--spot-on",
                (on * intensityRef.current).toFixed(3)
            )
        }

        const ms = metrics.current
        for (let i = 0; i < ms.length; i++) {
            const wrapEl = wrapRefs.current[i]
            const leftEl = leftRefs.current[i]
            const rightEl = rightRefs.current[i]
            const m = ms[i]
            if (!m || m.w === 0) continue

            // CHAR-LOCAL cursor coords. Y tracks the actual cursor → true
            // small spot at the cursor (no full-height pinning).
            const mxBase = cx - m.left
            const myActual = cy - m.top
            if (wrapEl) {
                wrapEl.style.setProperty("--mx", `${mxBase.toFixed(1)}px`)
                wrapEl.style.setProperty("--my", `${myActual.toFixed(1)}px`)
            }
            // Chokers are offset within the wrapper → their local cursor X
            // shifts by the negative of their CSS `left`.
            if (leftEl) {
                leftEl.style.setProperty(
                    "--mx",
                    `${(mxBase - LEFT_CHOKER_OFFSET).toFixed(1)}px`
                )
                leftEl.style.setProperty("--my", `${myActual.toFixed(1)}px`)
            }
            if (rightEl) {
                rightEl.style.setProperty(
                    "--mx",
                    `${(mxBase - RIGHT_CHOKER_OFFSET).toFixed(1)}px`
                )
                rightEl.style.setProperty("--my", `${myActual.toFixed(1)}px`)
            }
        }
    }

    const stopLoop = () => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }
    }

    const tick = () => {
        const t = target.current
        const s = smooth.current
        s.x += (t.x - s.x) * FOLLOW
        s.y += (t.y - s.y) * FOLLOW
        s.on += (t.on - s.on) * INTENSITY_FOLLOW
        render()
        const settled =
            Math.abs(t.x - s.x) < SETTLE_EPSILON &&
            Math.abs(t.y - s.y) < SETTLE_EPSILON &&
            Math.abs(t.on - s.on) < 0.005
        if (settled && t.on === 0) {
            s.on = 0
            render()
            rafRef.current = null
            return
        }
        rafRef.current = requestAnimationFrame(tick)
    }

    const startLoop = () => {
        if (rafRef.current !== null) return
        rafRef.current = requestAnimationFrame(tick)
    }

    useEffect(() => () => stopLoop(), [])

    const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (target.current.on === 0) {
            smooth.current.x = e.clientX
            smooth.current.y = e.clientY
        }
        target.current.x = e.clientX
        target.current.y = e.clientY
        target.current.on = 1
        startLoop()
    }

    const handleLeave = () => {
        target.current.on = 0
        startLoop()
    }

    const typeface = font ?? {}
    const fontStyle = Object.fromEntries(
        Object.entries(typeface).filter(([k]) => k !== "textAlign")
    )

    // Mask radius scales with --spot-on. When --spot-on = 0 the mask
    // circle has radius 0 → sharp shows everywhere (no hole) and spot
    // layers (blur + chokers) are entirely outside their circle so they
    // collapse to transparent. Smooth fade-in/out for the whole spot.
    const innerPct = (MAIN_RADIUS / SECONDARY_RADIUS) * 100
    const sharpMask = INVERT
        ? `radial-gradient(circle calc(${SECONDARY_RADIUS}px * var(--spot-on, 0)) at var(--mx, -9999px) var(--my, -9999px), transparent 0%, transparent ${innerPct}%, rgba(0,0,0,1) 100%)`
        : `radial-gradient(circle calc(${SECONDARY_RADIUS}px * var(--spot-on, 0)) at var(--mx, -9999px) var(--my, -9999px), rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${innerPct}%, transparent 100%)`
    const spotMask = INVERT
        ? `radial-gradient(circle calc(${SECONDARY_RADIUS}px * var(--spot-on, 0)) at var(--mx, -9999px) var(--my, -9999px), rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${innerPct}%, transparent 100%)`
        : `radial-gradient(circle calc(${SECONDARY_RADIUS}px * var(--spot-on, 0)) at var(--mx, -9999px) var(--my, -9999px), transparent 0%, transparent ${innerPct}%, rgba(0,0,0,1) 100%)`

    const baseLayer: React.CSSProperties = {
        display: "inline-block",
        whiteSpace: "pre",
    }
    const absLayer: React.CSSProperties = {
        ...baseLayer,
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
    }

    return (
        <Tag
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                userSelect: "none",
            }}
        >
            <svg
                style={{
                    position: "absolute",
                    width: 0,
                    height: 0,
                    pointerEvents: "none",
                }}
                aria-hidden
            >
                <defs>
                    {/* Goo: blur → threshold → composite atop. Fuses all
                        layers (sharp, blur, chokers, neighbours) into one
                        continuous ink shape. */}
                    <filter id={filterGooId}>
                        <feGaussianBlur
                            in="SourceGraphic"
                            stdDeviation={GOO_BLUR}
                            result="blur"
                        />
                        <feColorMatrix
                            in="blur"
                            type="matrix"
                            values={`1 0 0 0 0
                                     0 1 0 0 0
                                     0 0 1 0 0
                                     0 0 0 ${THRESHOLD} ${CUTOFF}`}
                            result="goo"
                        />
                        <feComposite
                            in="SourceGraphic"
                            in2="goo"
                            operator="atop"
                        />
                    </filter>

                    {/* Diffraction fringe — splits R/G/B channels by
                        ±FRINGE px horizontally and recombines via screen
                        blend. Applied to the blur layer only. */}
                    <filter
                        id={filterFringeId}
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                    >
                        <feColorMatrix
                            in="SourceGraphic"
                            type="matrix"
                            values={`1 0 0 0 0
                                     0 0 0 0 0
                                     0 0 0 0 0
                                     0 0 0 1 0`}
                            result="rOnly"
                        />
                        <feOffset
                            in="rOnly"
                            dx={-FRINGE}
                            dy="0"
                            result="rShift"
                        />
                        <feColorMatrix
                            in="SourceGraphic"
                            type="matrix"
                            values={`0 0 0 0 0
                                     0 1 0 0 0
                                     0 0 0 0 0
                                     0 0 0 1 0`}
                            result="gOnly"
                        />
                        <feColorMatrix
                            in="SourceGraphic"
                            type="matrix"
                            values={`0 0 0 0 0
                                     0 0 0 0 0
                                     0 0 1 0 0
                                     0 0 0 1 0`}
                            result="bOnly"
                        />
                        <feOffset
                            in="bOnly"
                            dx={FRINGE}
                            dy="0"
                            result="bShift"
                        />
                        <feBlend
                            in="rShift"
                            in2="gOnly"
                            mode="screen"
                            result="rg"
                        />
                        <feBlend
                            in="rg"
                            in2="bShift"
                            mode="screen"
                            result="rgb"
                        />
                    </filter>
                </defs>
            </svg>

            <div
                ref={containerRef}
                onMouseMove={handleMove}
                onMouseLeave={handleLeave}
                style={{
                    position: "relative",
                    filter: `url(#${filterGooId})`,
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color,
                    ...fontStyle,
                }}
            >
                {chars.map((ch, i) => (
                    <span
                        key={i}
                        ref={(el) => {
                            wrapRefs.current[i] = el
                        }}
                        style={{
                            position: "relative",
                            display: "inline-block",
                            whiteSpace: "pre",
                            cursor: "default",
                            overflow: "visible",
                        }}
                    >
                        {/* Sharp base — in-flow, sizes the wrapper. Hidden
                            INSIDE the spot circle so the blur shows through. */}
                        <span
                            style={{
                                ...baseLayer,
                                maskImage: sharpMask,
                                WebkitMaskImage: sharpMask,
                            }}
                        >
                            {ch === " " ? " " : ch}
                        </span>

                        {/* Blur layer — visible INSIDE the spot circle.
                            Plain gaussian blur, no chromatic fringe → the
                            goo threshold renders it as a solid blob in the
                            text color (full opacity, nothing showing
                            through). */}
                        <span
                            aria-hidden
                            style={{
                                ...absLayer,
                                filter: `blur(${BLUR_AMOUNT}px)`,
                                maskImage: spotMask,
                                WebkitMaskImage: spotMask,
                            }}
                        >
                            {ch === " " ? " " : ch}
                        </span>

                        {/* Left choker (-10). Spot-masked just like the
                            blur layer → only the patch of the choker
                            INSIDE the cursor circle renders. */}
                        <span
                            ref={(el) => {
                                leftRefs.current[i] = el
                            }}
                            aria-hidden
                            style={{
                                ...absLayer,
                                left: LEFT_CHOKER_OFFSET,
                                maskImage: spotMask,
                                WebkitMaskImage: spotMask,
                                willChange: "mask-image",
                            }}
                        >
                            {ch === " " ? " " : ch}
                        </span>

                        {/* Right choker (+10). Same spot mask. */}
                        <span
                            ref={(el) => {
                                rightRefs.current[i] = el
                            }}
                            aria-hidden
                            style={{
                                ...absLayer,
                                left: RIGHT_CHOKER_OFFSET,
                                maskImage: spotMask,
                                WebkitMaskImage: spotMask,
                                willChange: "mask-image",
                            }}
                        >
                            {ch === " " ? " " : ch}
                        </span>
                    </span>
                ))}
            </div>
        </Tag>
    )
}

const COMPONENT_DEFAULTS = {
    text: "ink bleed",
    intensity: 50,
    color: "#ffffff",
    font: {
        fontFamily: "Inter",
        variant: "Bold",
        fontSize: 180,
        lineHeight: "1em",
    } as any,
    tag: "div",
}
