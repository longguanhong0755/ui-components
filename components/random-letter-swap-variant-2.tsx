import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
const useIsStaticRenderer = () => false
import { motion, useAnimate, type AnimationOptions } from "framer-motion"

/**
 * RandomLetterSwap — text whose letters swap vertically on hover in a
 * random order. Two modes:
 *
 *   • forward  — plays the swap once on hover-enter. The handler is
 *     debounced leading + trailing (100ms) so quick repeated hovers
 *     still resolve cleanly. A `blocked` latch additionally suppresses
 *     overlapping runs until the last letter finishes.
 *
 *   • pingpong — plays forward on hover-enter, reverse on hover-leave,
 *     both debounced leading + trailing (100ms) so brief hover thrashing
 *     still settles to the correct final state.
 *
 * Per-letter class names (`.letter-N` and `.letter-secondary-N`) are
 * load-bearing — each letter is animated separately with its own delay
 * so the swap order can be shuffled at run-time. `useAnimate` targets
 * them as selectors. Don't rename them.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 60
 */
function __BaseImpl_RandomLetterSwap(props: Props) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        label,
        mode,
        reverse,
        staggerDuration,
        ease,
        font,
        color,
        onClick,
        style,
    } = props

    const isStatic = useIsStaticRenderer()
    const [scope, animate] = useAnimate()
    // forward-mode latch: ignore additional hovers until the active
    // animation finishes. pingpong mode ignores this.
    const [blocked, setBlocked] = useState(false)

    // The `ease` Transition control IS a valid framer-motion transition —
    // pass it straight through. Each letter's per-letter delay is layered
    // on via `mergeDelay`, so any `delay` on the control itself is ignored
    // for the shuffled sequence.
    const transition: AnimationOptions = useMemo(
        () => (ease ?? { type: "spring", duration: 0.8 }) as AnimationOptions,
        [ease]
    )

    // Shuffle an arbitrary index array (copy) — used to randomize only the
    // real-letter slots, leaving spaces out of the stagger entirely. Source
    // uses sort(() => Math.random() - 0.5); match it (not Fisher-Yates).
    const shuffleArray = (arr: number[]): number[] => {
        const a = [...arr]
        a.sort(() => Math.random() - 0.5)
        return a
    }

    const mergeDelay = (base: AnimationOptions, i: number): AnimationOptions =>
        ({
            ...base,
            delay: i * staggerDuration,
        }) as AnimationOptions

    // ---- Debounce machinery (shared by forward and pingpong) -------------
    // leading + trailing, 100ms. If a handler fires multiple times within
    // 100ms we run once immediately, queue a trailing call, and replay
    // after the cooldown. Final state always wins.
    const debouncedHoverStartRef = useRef<(() => void) | null>(null)
    const debouncedHoverEndRef = useRef<(() => void) | null>(null)
    const timerRefs = useRef<{
        startTimer: ReturnType<typeof setTimeout> | null
        startTrailing: boolean
        endTimer: ReturnType<typeof setTimeout> | null
        endTrailing: boolean
    }>({
        startTimer: null,
        startTrailing: false,
        endTimer: null,
        endTrailing: false,
    })

    // Rebuild handlers whenever inputs change. framer-motion's `animate`
    // from useAnimate is stable across renders, so closing over it is safe.
    useEffect(() => {
        if (isStatic) return

        // Only real letters get a stagger slot — spaces are skipped so they
        // don't eat animation time. `i` is the consecutive position in the
        // shuffled order, so delays are gap-free.
        const letterIdxs: number[] = []
        const len = label ? label.length : 0
        for (let k = 0; k < len; k++) {
            if (label[k] !== " ") letterIdxs.push(k)
        }
        const count = letterIdxs.length

        // ---- Forward mode ------------------------------------------------
        // Slide primary letters off-screen one at a time in shuffled order,
        // snap each back to rest. Slide secondaries into the visible slot,
        // snap each back to its off-screen resting offset. Last completion
        // releases the `blocked` latch.
        const runForward = () => {
            if (blocked || count === 0) return
            setBlocked(true)
            const order = shuffleArray(letterIdxs)
            for (let i = 0; i < order.length; i++) {
                const idx = order[i]
                const isLast = i === order.length - 1
                animate(
                    `.letter-${idx}`,
                    { y: reverse ? "100%" : "-100%" },
                    mergeDelay(transition, i)
                ).then(() => {
                    animate(`.letter-${idx}`, { y: 0 }, { duration: 0 })
                })
                animate(
                    `.letter-secondary-${idx}`,
                    { top: "0%" },
                    mergeDelay(transition, i)
                ).then(() => {
                    animate(
                        `.letter-secondary-${idx}`,
                        { top: reverse ? "-100%" : "100%" },
                        { duration: 0 }
                    ).then(() => {
                        if (isLast) setBlocked(false)
                    })
                })
            }
        }

        // ---- Ping-pong mode ----------------------------------------------
        // No latch — we want hover-out to interrupt hover-in. Shuffle order
        // is regenerated for each direction.
        const runPingStart = () => {
            if (count === 0) return
            const order = shuffleArray(letterIdxs)
            for (let i = 0; i < order.length; i++) {
                const idx = order[i]
                animate(
                    `.letter-${idx}`,
                    { y: reverse ? "100%" : "-100%" },
                    mergeDelay(transition, i)
                )
                animate(
                    `.letter-secondary-${idx}`,
                    { top: "0%" },
                    mergeDelay(transition, i)
                )
            }
        }

        const runPingEnd = () => {
            if (count === 0) return
            const order = shuffleArray(letterIdxs)
            for (let i = 0; i < order.length; i++) {
                const idx = order[i]
                animate(`.letter-${idx}`, { y: 0 }, mergeDelay(transition, i))
                animate(
                    `.letter-secondary-${idx}`,
                    { top: reverse ? "-100%" : "100%" },
                    mergeDelay(transition, i)
                )
            }
        }

        const wait = 100
        const t = timerRefs.current

        const startBody = mode === "pingpong" ? runPingStart : runForward
        const endBody = runPingEnd

        debouncedHoverStartRef.current = () => {
            if (!t.startTimer) {
                startBody()
                t.startTimer = setTimeout(() => {
                    if (t.startTrailing) startBody()
                    t.startTrailing = false
                    t.startTimer = null
                }, wait)
            } else {
                t.startTrailing = true
            }
        }

        debouncedHoverEndRef.current = () => {
            if (!t.endTimer) {
                endBody()
                t.endTimer = setTimeout(() => {
                    if (t.endTrailing) endBody()
                    t.endTrailing = false
                    t.endTimer = null
                }, wait)
            } else {
                t.endTrailing = true
            }
        }

        return () => {
            if (t.startTimer) clearTimeout(t.startTimer)
            if (t.endTimer) clearTimeout(t.endTimer)
            t.startTimer = null
            t.endTimer = null
            t.startTrailing = false
            t.endTrailing = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isStatic,
        mode,
        reverse,
        staggerDuration,
        transition,
        animate,
        label,
        blocked,
    ])

    const hoverStart = () => {
        debouncedHoverStartRef.current?.()
    }
    const hoverEnd = () => {
        debouncedHoverEndRef.current?.()
    }

    // ---- Render -----------------------------------------------------------
    // sr-only: visually hidden but available to screen readers. We split
    // the visible text into individual letter-spans for animation and
    // mark them aria-hidden, so this single span carries the semantic
    // text.
    const srOnlyStyle: React.CSSProperties = {
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        borderWidth: 0,
    }

    // Framer Font control returns a CSS-ready object (fontFamily, fontSize,
    // fontWeight, fontStyle, lineHeight, letterSpacing, textAlign). Spread it
    // directly; `textAlign` is split out since it belongs on the container,
    // not the inline-flex span.
    const typeface = (font ?? {}) as Record<string, any>
    const fontCss = Object.fromEntries(
        Object.entries(typeface).filter(([k]) => k !== "textAlign")
    )

    const innerSpanStyle: React.CSSProperties = {
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        ...fontCss,
        color,
        cursor: onClick ? "pointer" : undefined,
        // Letter spans are positioned relative inside this; secondaries
        // sit absolutely positioned within each letter slot. overflow:
        // hidden clips the off-screen halves.
    }

    const letters = label ? label.split("") : []
    // Resting position of the secondary letter:
    //   reverse=true  → bottom→top motion, secondary starts above (-100%)
    //   reverse=false → top→bottom motion, secondary starts below (+100%)
    const secondaryRestingTop = reverse ? "-100%" : "100%"

    // Static-renderer short-circuit — Framer canvas / export show the
    // resting state with no hover handlers and no animation registered.
    const interactive = !isStatic

    const handlers = !interactive
        ? {}
        : mode === "pingpong"
          ? {
                onMouseEnter: hoverStart,
                onMouseLeave: hoverEnd,
                onClick,
            }
          : {
                onMouseEnter: hoverStart,
                onClick,
            }

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                ...style,
            }}
        >
            {letters.length === 0 ? null : (
                <span ref={scope} style={innerSpanStyle} {...handlers}>
                    <span style={srOnlyStyle}>{label}</span>
                    {letters.map((letter, i) => (
                        <span
                            key={i}
                            aria-hidden
                            style={{
                                whiteSpace: "pre",
                                position: "relative",
                                display: "flex",
                            }}
                        >
                            <motion.span
                                className={`letter-${i}`}
                                style={{
                                    position: "relative",
                                    top: 0,
                                    paddingBottom: "0.5rem",
                                }}
                            >
                                {letter}
                            </motion.span>
                            <motion.span
                                className={`letter-secondary-${i}`}
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    right: 0,
                                    top: secondaryRestingTop,
                                }}
                            >
                                {letter}
                            </motion.span>
                        </span>
                    ))}
                </span>
            )}
        </div>
    )
}

type Props = {
    label: string
    mode: "forward" | "pingpong"
    reverse: boolean
    staggerDuration: number
    /** Per-letter swap transition (framer Transition control). */
    ease?: AnimationOptions
    /** Framer Font control value — a CSS-ready typeface object. */
    font?: Record<string, any>
    color: string
    onClick?: () => void
    style?: React.CSSProperties
}

const COMPONENT_DEFAULTS = {
    label: "LETTER SWAP",
    mode: "pingpong",
    reverse: false,
    staggerDuration: 0.1,
    font: {
        fontFamily: "Inter",
        variant: "Medium",
        fontSize: 120,
        lineHeight: "1.2em",
        letterSpacing: "0em",
        textAlign: "center",
    },
    color: "#FFFFFF",
    ease: {
        type: "spring",
        duration: 0.8,
    },
}

const __presetProps = {
  "label": "LETTER SWAP",
  "mode": "forward",
  "reverse": true,
  "staggerDuration": 0.4,
  "font": {
    "variant": "Bold",
    "fontSize": "92px",
    "textAlign": "center",
    "fontFamily": "Inter",
    "fontWeight": 700,
    "lineHeight": "1.2em",
    "letterSpacing": "0em"
  },
  "color": "#C200C0",
  "ease": {
    "mass": 1,
    "type": "spring",
    "damping": 60,
    "duration": 0.8,
    "stiffness": 800
  }
};

export default function RandomLetterSwap(props: Record<string, unknown>) {
  return <__BaseImpl_RandomLetterSwap {...(__presetProps as Record<string, unknown>)} {...props} />;
}
