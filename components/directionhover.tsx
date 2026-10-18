import { useRef, useState } from "react"

/**
 * Direction Hover
 * Text whose label swaps to an accent copy that slides in from whichever edge
 * (top or bottom) the cursor entered, and slides back out on leave. Sizes to
 * the text — no box, background, or padding. Base copy is always visible.
 *
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 160
 * @framerIntrinsicHeight 28
 * @framerDisableUnlink
 */

const EASE_MAP: Record<string, string> = {
    linear: "linear",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
}

// Convert a Framer Transition object into a CSS transition string for the
// transform. Springs are approximated with an overshoot bezier.
function transitionToCss(t: any): string {
    const duration = (t && t.duration) || 0.4
    let ease = "cubic-bezier(0.22, 1, 0.36, 1)"
    if (t && t.ease) {
        if (Array.isArray(t.ease)) ease = `cubic-bezier(${t.ease.join(", ")})`
        else if (EASE_MAP[t.ease]) ease = EASE_MAP[t.ease]
    } else if (t && t.type === "spring") {
        ease = "cubic-bezier(0.34, 1.56, 0.64, 1)"
    }
    return `transform ${duration}s ${ease}`
}

export default function DirectionHover(props: any) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const { title, font, gap, textColor, hoverColor, transition, style } = props

    const ref = useRef<HTMLSpanElement>(null)
    // "none" = resting, "top"/"bottom" = entered from that edge
    const [dir, setDir] = useState<"none" | "top" | "bottom">("none")

    const onEnter = (e: React.MouseEvent) => {
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const y = e.clientY - rect.top
        setDir(y < rect.height / 2 ? "top" : "bottom")
    }
    const onLeave = () => setDir("none")

    const fontObj = font || {}
    const rawSize = fontObj.fontSize
    const size =
        typeof rawSize === "string" ? parseFloat(rawSize) : rawSize || 24
    // Box trimmed to ~cap height so glyphs touch at gap 0 (the full font box
    // carries built-in leading that reads as a gap otherwise).
    const lineBox = size * 0.72
    // Gap slider 0–20 → px spacing between the base and accent copies.
    const gapPx = (gap || 0) * 3
    // One slide step = one line box plus the gap between copies.
    const step = lineBox + gapPx

    // Three stacked copies: [accent, base, accent], each one line box tall.
    // Resting shows the middle (base); hover slides the stack by one step to
    // reveal an accent copy from the entered edge. Offsets are in px because a
    // % translate would be relative to the full 3-line stack, not one line.
    const yByDir = { none: -step, top: 0, bottom: -2 * step }

    const labelStyle: React.CSSProperties = {
        ...fontObj,
        margin: 0,
        whiteSpace: "pre",
        lineHeight: 1,
        height: lineBox,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
    }

    return (
        <span
            ref={ref}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            style={{
                ...style,
                position: "relative",
                display: "inline-block",
                overflow: "hidden",
                height: lineBox,
                cursor: "pointer",
                userSelect: "none",
            }}
        >
            <span
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: gapPx,
                    transform: `translateY(${yByDir[dir]}px)`,
                    transition: transitionToCss(transition),
                }}
            >
                <span style={{ ...labelStyle, color: hoverColor }}>
                    {title}
                </span>
                <span style={{ ...labelStyle, color: textColor }}>{title}</span>
                <span style={{ ...labelStyle, color: hoverColor }}>
                    {title}
                </span>
            </span>
        </span>
    )
}

const COMPONENT_DEFAULTS = {
    title: "DIRECTION HOVER",
    font: {
        fontSize: 24,
        variant: "Bold",
        letterSpacing: "0em",
        lineHeight: "1em",
    },
    gap: 20,
    textColor: "#ffffff",
    hoverColor: "#6E92FF",
    transition: {
        type: "tween",
        duration: 0.3,
        delay: 0,
        ease: "easeInOut",
    },
}
