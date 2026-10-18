const useIsStaticRenderer = () => false
import { motion } from "framer-motion"
import { useState, type CSSProperties } from "react"

type Dir =
    | "topLeft"
    | "top"
    | "topRight"
    | "bottomLeft"
    | "bottom"
    | "bottomRight"

const DIRS: Record<Dir, { x: number; y: number }> = {
    topLeft: { x: -0.72, y: -0.72 },
    top: { x: 0, y: -1 },
    topRight: { x: 0.72, y: -0.72 },
    bottomLeft: { x: -0.72, y: 0.72 },
    bottom: { x: 0, y: 1 },
    bottomRight: { x: 0.72, y: 0.72 },
}

interface TextLiftProps {
    text: string
    frontColor: string
    depthColor: string
    strokeColor: string
    stroke: number
    filled: boolean
    depth: number
    spread: number
    expand: number
    direction: Dir
    fade: boolean
    transition: any
    font: any
    style?: CSSProperties
}

function Letter(props: {
    char: string
    depth: number
    spread: number
    expand: number
    dir: { x: number; y: number }
    frontColor: string
    depthColor: string
    strokeColor: string
    stroke: number
    filled: boolean
    fade: boolean
    transition: any
    font: any
    isStatic: boolean
}) {
    const {
        char,
        depth,
        spread,
        expand,
        dir,
        frontColor,
        depthColor,
        strokeColor,
        stroke,
        filled,
        fade,
        transition,
        font,
        isStatic,
    } = props
    const [hover, setHover] = useState(false)
    const on = hover && !isStatic
    const space = char === " "

    // Hovered letter always lifts to a high positive z — never negative. A
    // negative z on the spring-animating parent forces the browser to
    // recompute paint order / compositing every frame as overlap with
    // neighbours changes, which is what produced the downward jitter.
    const activeZ = on ? 1000 : ("auto" as const)

    return (
        <span
            style={{
                position: "relative",
                display: "inline-block",
                whiteSpace: "pre",
                cursor: "default",
                zIndex: activeZ,
            }}
        >
            {/* In-flow spacer at the base: defines the footprint AND owns the
                hover hit-area, pinned to the base where the last layer sits. */}
            <span
                onPointerEnter={() => setHover(true)}
                onPointerLeave={() => setHover(false)}
                aria-hidden
                style={{
                    display: "inline-block",
                    color: "transparent",
                    ...font,
                }}
            >
                {space ? " " : char}
            </span>
            {Array.from({ length: depth }).map((_, i) => {
                // The readable front face (i = depth-1) moves furthest in the
                // push direction; the layers follow behind it. i = 0 is the
                // last/deepest layer and stays pinned to the base (offset 0) in
                // both rest and hover — up or down alike.
                const isTop = i === depth - 1
                const restS = i * spread
                const hoverS = i * expand
                const s = on ? hoverS : restS
                const lc = isTop ? frontColor : depthColor
                return (
                    <motion.span
                        key={i}
                        aria-hidden={!isTop}
                        animate={{ x: s * dir.x, y: s * dir.y }}
                        transition={
                            transition || {
                                type: "spring",
                                stiffness: 320,
                                damping: 22,
                            }
                        }
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            pointerEvents: "none",
                            color: filled ? lc : "transparent",
                            WebkitTextStrokeWidth:
                                stroke > 0 ? `${stroke}px` : undefined,
                            WebkitTextStrokeColor:
                                stroke > 0 ? strokeColor : undefined,
                            opacity: fade
                                ? Math.max(
                                      0.2,
                                      1 - ((depth - 1 - i) / depth) * 0.85
                                  )
                                : 1,
                            zIndex: i + 1,
                            display: "inline-block",
                            willChange: "transform",
                            ...font,
                        }}
                    >
                        {space ? " " : char}
                    </motion.span>
                )
            })}
        </span>
    )
}

/**
 * Text Lift on Hover
 *
 * Each letter is a stack of itself, pushed to one side for depth. Hover a letter
 * and its stack expands in that direction, lifting it off the surface.
 *
 * @framerIntrinsicWidth 420
 * @framerIntrinsicHeight 120
 *
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
function __BaseImpl_TextLift(props: TextLiftProps) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        text = "STAND",
        frontColor = "#111111",
        depthColor = "#111111",
        strokeColor = "#111111",
        stroke = 2,
        filled = false,
        depth = 6,
        spread = 4,
        expand = 12,
        direction = "topRight",
        fade = false,
        transition,
        font,
    } = props

    const isStatic = useIsStaticRenderer()
    const dir = DIRS[direction] || DIRS.topRight
    const chars = text.split("")
    const safeDepth = Math.max(1, Math.round(depth))

    return (
        <div
            style={{
                display: "inline-flex",
                flexWrap: "wrap",
                width: "max-content",
                maxWidth: "100%",
                ...font,
            }}
        >
            {chars.map((c, idx) => (
                <Letter
                    key={idx}
                    char={c}
                    depth={safeDepth}
                    spread={spread}
                    expand={expand}
                    dir={dir}
                    frontColor={frontColor}
                    depthColor={depthColor}
                    strokeColor={strokeColor}
                    stroke={stroke}
                    filled={filled}
                    fade={fade}
                    transition={transition}
                    font={font}
                    isStatic={isStatic}
                />
            ))}
        </div>
    )
}

const COMPONENT_DEFAULTS = {
    text: "TEXT LIFT",
    direction: "bottomRight",
    depth: 10,
    spread: 0,
    expand: 18,
    fade: true,
    filled: true,
    stroke: 3,
    strokeColor: "#FFFFFF",
    frontColor: "#FFFFFF",
    depthColor: "#FFFFFF",
    transition: { type: "spring", stiffness: 320, damping: 22 },
    font: {
        fontFamily: "Inter",
        variant: "Bold",
        fontSize: "120px",
        letterSpacing: "-0.02em",
        lineHeight: "1em",
    } as any,
}

const __presetProps = {
  "fade": true,
  "font": {
    "variant": "Bold",
    "fontSize": "120px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 400,
    "lineHeight": "1em",
    "letterSpacing": "-0.02em"
  },
  "text": "TEXT LIFT",
  "depth": 10,
  "expand": 3,
  "filled": true,
  "spread": 0,
  "stroke": 0,
  "direction": "bottomRight",
  "depthColor": "#56FF77",
  "frontColor": "#000000",
  "transition": {
    "mass": 1,
    "type": "spring",
    "damping": 22,
    "stiffness": 320
  },
  "strokeColor": "#FFFFFFFA"
};

export default function TextLift(props: Record<string, unknown>) {
  return <__BaseImpl_TextLift {...(__presetProps as Record<string, unknown>)} {...props} />;
}
