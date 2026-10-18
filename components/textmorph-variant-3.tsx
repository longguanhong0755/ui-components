"use client"

import { useId, useMemo } from "react"

// Map Framer Transition `ease` value to a CSS animation-timing-function.
// Framer accepts string presets ("linear", "easeIn", "easeOut", "easeInOut",
// "circIn"…) or a 4-number cubic-bezier array. Anything else falls back to
// ease-in-out so the animation stays smooth.
function mapEaseToCSS(ease: any): string {
    if (Array.isArray(ease) && ease.length === 4) {
        return `cubic-bezier(${ease.join(",")})`
    }
    switch (ease) {
        case "linear":
            return "linear"
        case "easeIn":
            return "ease-in"
        case "easeOut":
            return "ease-out"
        case "easeInOut":
            return "ease-in-out"
        case "circIn":
            return "cubic-bezier(0.6, 0.04, 0.98, 0.335)"
        case "circOut":
            return "cubic-bezier(0.075, 0.82, 0.165, 1)"
        case "circInOut":
            return "cubic-bezier(0.785, 0.135, 0.15, 0.86)"
        case "backIn":
            return "cubic-bezier(0.6, -0.28, 0.735, 0.045)"
        case "backOut":
            return "cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        case "backInOut":
            return "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
        default:
            return "ease-in-out"
    }
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 240
 */
function __BaseImpl_TextMorph(props: any) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const { words, color, font, transition, tag } = props

    // duration = time one word morphs into the next.
    // delay    = how long a word stays fully visible before its morph starts.
    const morph = Math.max(0.1, transition?.duration ?? 1)
    const hold = Math.max(0, transition?.delay ?? 1)
    const easeCurve: string = transition?.ease ?? "easeInOut"
    const easeCSS = mapEaseToCSS(easeCurve)

    const Tag = (tag ?? "div") as any

    const wordList = useMemo<string[]>(
        () =>
            (words as string)
                .split(/\r?\n|,/)
                .map((w) => w.trim())
                .filter(Boolean),
        [words]
    )

    const rawId = useId()
    const safeId = rawId.replace(/[:]/g, "")
    const filterId = `tm-thr-${safeId}`
    const animName = `tm-rot-${safeId}`

    const count = Math.max(1, wordList.length)
    // Per-word slot = morph (transition) + hold (visible). Full loop = count
    // slots; each word's animation runs the whole loop, offset by its slot, so
    // word i's morph-out overlaps word i+1's morph-in.
    const slot = morph + hold
    const cycle = slot * count
    const pct = (s: number) => Math.min(100, (s / cycle) * 100).toFixed(4)
    const mIn = pct(morph) // morph-in complete
    const mHold = pct(morph + hold) // hold complete → morph-out begins
    const mOut = pct(2 * morph + hold) // morph-out complete (gone)

    const keyframes = `
@keyframes ${animName} {
  0% {
    opacity: 0;
    filter: blur(20px);
    transform: translate(-50%, -50%) scale(0.8);
  }
  ${mIn}% {
    opacity: 1;
    filter: blur(0px);
    transform: translate(-50%, -50%) scale(1);
  }
  ${mHold}% {
    opacity: 1;
    filter: blur(0px);
    transform: translate(-50%, -50%) scale(1);
  }
  ${mOut}%, 100% {
    opacity: 0;
    filter: blur(20px);
    transform: translate(-50%, -50%) scale(1.2);
  }
}
`

    const typeface = font ?? {}
    const textAlign: string = (typeface as any)?.textAlign ?? "center"
    const fontStyle = Object.fromEntries(
        Object.entries(typeface).filter(([k]) => k !== "textAlign")
    )

    const longest = wordList.reduce(
        (acc, w) => (w.length > acc.length ? w : acc),
        ""
    )

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
            <style>{keyframes}</style>

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
                    <filter id={filterId}>
                        <feColorMatrix
                            in="SourceGraphic"
                            type="matrix"
                            values="1 0 0 0 0
                                    0 1 0 0 0
                                    0 0 1 0 0
                                    0 0 0 25 -9"
                            result="goo"
                        />
                        <feComposite
                            in="SourceGraphic"
                            in2="goo"
                            operator="atop"
                        />
                    </filter>
                </defs>
            </svg>

            <div
                style={{
                    position: "relative",
                    filter: `url(#${filterId})`,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: textAlign as any,
                    ...fontStyle,
                }}
            >
                <div
                    style={{
                        position: "relative",
                        display: "inline-flex",
                        justifyContent: "center",
                        alignItems: "center",
                        lineHeight: 1.2,
                        minHeight: "1.2em",
                    }}
                >
                    {/* Width anchor: longest word reserves space so layout never shifts */}
                    <span
                        style={{
                            visibility: "hidden",
                            whiteSpace: "nowrap",
                            display: "inline-block",
                        }}
                    >
                        {longest || " "}
                    </span>

                    {wordList.map((word, i) => (
                        <span
                            key={`${word}-${i}`}
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                opacity: 0,
                                color,
                                whiteSpace: "nowrap",
                                // Delay baked into the `animation` shorthand
                                // (2nd <time> = animation-delay). A separate
                                // animationDelay longhand gets clobbered by
                                // the shorthand's implicit delay: 0s inside
                                // the Framer canvas style pipeline.
                                animation: `${animName} ${cycle}s ${(slot * i).toFixed(3)}s infinite ${easeCSS}`,
                                willChange: "opacity, filter, transform",
                            }}
                        >
                            {word}
                        </span>
                    ))}
                </div>
            </div>
        </Tag>
    )
}

const COMPONENT_DEFAULTS = {
    words: "TEXT\nMORPH",
    transition: {
        type: "tween",
        duration: 1,
        delay: 1,
        ease: "easeInOut",
    },
    color: "#FFFFFF",
    font: {
        fontFamily: "Inter",
        variant: "Bold",
        fontSize: 120,
        lineHeight: "1.2em",
        letterSpacing: "0em",
        textAlign: "center",
    } as any,
    tag: "div",
}

const __presetProps = {
  "words": "MESS\nORDER\nSYSTEM\nAUTOMATION\nGROWTH",
  "transition": {
    "ease": "easeInOut",
    "mass": 1,
    "type": "tween",
    "delay": 1,
    "damping": 60,
    "duration": 1,
    "stiffness": 800
  },
  "color": "#FFF714",
  "font": {
    "variant": "Semibold",
    "fontSize": "82px",
    "textAlign": "center",
    "fontFamily": "Inter",
    "fontWeight": 600,
    "lineHeight": "1.2em",
    "letterSpacing": "0em"
  },
  "tag": "div"
};

export default function TextMorph(props: Record<string, unknown>) {
  return <__BaseImpl_TextMorph {...(__presetProps as Record<string, unknown>)} {...props} />;
}
