import * as React from "react"
import { useEffect, useMemo, useRef } from "react"
const useIsStaticRenderer = () => false
import {
    motion,
    stagger,
    useAnimate,
    type AnimationOptions,
} from "framer-motion"

/**
 * VariableFontHoverByLetter — text whose letters animate their `wght`
 * (font-variation-settings) on hover, staggered letter-by-letter. Locked
 * to a bundled Inter Variable so the morph is reliable. The Transition
 * control eases the animation in both directions (hover in / hover out).
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 40
 */
function __BaseImpl_VariableFontHoverByLetter(props: Props) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        label,
        fromWeight,
        toWeight,
        staggerDuration,
        staggerFrom,
        fontSize,
        color,
        onClick,
        style,
    } = props

    // Resting / hover wght as variation-settings strings.
    const fromSettings = `'wght' ${fromWeight}`
    const toSettings = `'wght' ${toWeight}`

    // Stagger slider is whole-number (ms); convert to seconds for stagger().
    const staggerSec = Math.max(0, staggerDuration) / 1000

    const isStatic = useIsStaticRenderer()
    const [scope, animate] = useAnimate()

    // Shuffled per-letter indices for the "random" stagger variant.
    // Re-shuffles only when label / stagger mode changes — NOT on every
    // hover, so the random order is stable for a given label.
    const shuffledIndices = useMemo(() => {
        if (staggerFrom !== "random") return null
        const len = label ? label.length : 0
        const indices = Array.from({ length: len }, (_, i) => i)
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[indices[i], indices[j]] = [indices[j], indices[i]]
        }
        return indices
    }, [label, staggerFrom])

    // Transition from the control, with a sane fallback.
    const transition: AnimationOptions = useMemo(() => {
        return (
            props.transition ??
            ({ type: "spring", duration: 0.7 } as AnimationOptions)
        )
    }, [props.transition])

    const mergeStagger = (base: AnimationOptions): AnimationOptions => {
        if (staggerFrom === "random" && shuffledIndices) {
            const indices = shuffledIndices
            return {
                ...base,
                delay: (i: number) => staggerSec * (indices[i] ?? 0),
            } as AnimationOptions
        }
        return {
            ...base,
            delay: stagger(staggerSec, { from: staggerFrom as any }),
        } as AnimationOptions
    }

    // ---- Debounced hover handlers ----------------------------------------
    // Leading + trailing 100ms — first call runs immediately, additional
    // calls inside the window queue a trailing replay so the final hover
    // state always wins.
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

    useEffect(() => {
        if (isStatic) return

        const runStart = () => {
            animate(
                ".letter",
                { fontVariationSettings: toSettings },
                mergeStagger(transition)
            )
        }

        const runEnd = () => {
            animate(
                ".letter",
                { fontVariationSettings: fromSettings },
                mergeStagger(transition)
            )
        }

        const wait = 100
        const t = timerRefs.current

        debouncedHoverStartRef.current = () => {
            if (!t.startTimer) {
                runStart()
                t.startTimer = setTimeout(() => {
                    if (t.startTrailing) runStart()
                    t.startTrailing = false
                    t.startTimer = null
                }, wait)
            } else {
                t.startTrailing = true
            }
        }

        debouncedHoverEndRef.current = () => {
            if (!t.endTimer) {
                runEnd()
                t.endTimer = setTimeout(() => {
                    if (t.endTrailing) runEnd()
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
        fromSettings,
        toSettings,
        staggerSec,
        staggerFrom,
        shuffledIndices,
        transition,
        animate,
    ])

    const handleHoverStart = () => debouncedHoverStartRef.current?.()
    const handleHoverEnd = () => debouncedHoverEndRef.current?.()

    // ---- Render ----------------------------------------------------------
    // sr-only: visually hidden but available to screen readers. The
    // visible per-letter spans are aria-hidden so this one carries
    // the semantic text.
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

    // Locked to the bundled Inter Variable so the wght morph is reliable.
    // Weight is NOT set here so it can't freeze the axis.
    const innerSpanStyle: React.CSSProperties = {
        fontFamily: VARIABLE_FONT_STACK,
        fontSize,
        color,
    }

    const letters = label ? label.split("") : []

    const interactive = !isStatic
    const handlers = !interactive
        ? {}
        : {
              onMouseEnter: handleHoverStart,
              onMouseLeave: handleHoverEnd,
              onClick,
          }

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                cursor: interactive
                    ? onClick
                        ? "pointer"
                        : "default"
                    : undefined,
                ...style,
            }}
            {...handlers}
        >
            <style>{INTER_VARIABLE_FONT_FACE}</style>
            {letters.length === 0 ? null : (
                <span ref={scope} style={innerSpanStyle}>
                    <span style={srOnlyStyle}>{label}</span>
                    {letters.map((letter, i) => (
                        <motion.span
                            key={i}
                            className="letter"
                            aria-hidden
                            style={{
                                display: "inline-block",
                                whiteSpace: "pre",
                                fontVariationSettings: fromSettings,
                            }}
                        >
                            {letter}
                        </motion.span>
                    ))}
                </span>
            )}
        </div>
    )
}

// Bundled variable font so the morph works without the user loading anything.
// Inter exposes `wght` (100-900). Unique family name avoids colliding with
// any user-installed "Inter".
const INTER_VARIABLE_FONT_FACE = `
@font-face {
    font-family: "InterVariableFramer";
    src: url("https://rsms.me/inter/font-files/InterVariable.woff2?v=4.0") format("woff2-variations");
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
}
@font-face {
    font-family: "InterVariableFramer";
    src: url("https://rsms.me/inter/font-files/InterVariable-Italic.woff2?v=4.0") format("woff2-variations");
    font-weight: 100 900;
    font-style: italic;
    font-display: swap;
}
`

// The morph only works on a VARIABLE font, so letters are always forced
// onto this bundled variable stack.
const VARIABLE_FONT_STACK =
    '"InterVariableFramer", "Inter Variable", "Inter", system-ui, sans-serif'

type StaggerFrom = "first" | "last" | "center" | "random"

type Props = {
    label: string
    fromWeight: number
    toWeight: number
    staggerDuration: number
    staggerFrom: StaggerFrom
    fontSize: number
    color: string
    transition?: AnimationOptions
    onClick?: () => void
    style?: React.CSSProperties
}

const WEIGHT_OPTIONS = [100, 200, 300, 400, 500, 600, 700, 800, 900]
const WEIGHT_TITLES = [
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
]

const COMPONENT_DEFAULTS = {
    label: "WEIGHT HOVER",
    fromWeight: 400,
    toWeight: 900,
    fontSize: 120,
    color: "#FFFFFF",
    staggerDuration: 30,
    staggerFrom: "random",
    transition: {
        type: "spring",
        duration: 0.7,
        bounce: 0.2,
    },
}

const __presetProps = {
  "label": "WEIGHT HOVER",
  "fromWeight": "700",
  "toWeight": "400",
  "fontSize": 111,
  "color": "#FFC416",
  "staggerDuration": 80,
  "staggerFrom": "center",
  "transition": {
    "mass": 1,
    "type": "spring",
    "bounce": 0.2,
    "damping": 60,
    "duration": 0.7,
    "stiffness": 800
  }
};

export default function VariableFontHoverByLetter(props: Record<string, unknown>) {
  return <__BaseImpl_VariableFontHoverByLetter {...(__presetProps as Record<string, unknown>)} {...props} />;
}
