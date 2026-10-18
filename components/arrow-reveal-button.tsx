"use client"

import * as React from "react"
import { useEffect, useLayoutEffect, useRef } from "react"
import { useAnimate, useReducedMotion, type Transition } from "motion/react"

/** The button's colours, batched into one modal under Font. Top-level `fill` and
 *  `textColor` were the previous shape and are still read as fallbacks, so an
 *  existing Framer instance keeps its values. */
type Colors = {
    fill?: string
    textColor?: string
    hoverFill?: string
    hoverTextColor?: string
}

export type IconConfig = {
    /** What the badge holds: a built-in vector, a typed character, or a picture. */
    type?: "icon" | "symbol" | "image"
    icon?:
        | "arrow"
        | "chevron"
        | "plus"
        | "star"
        | "arrowDiagonal"
        | "check"
        | string
        | React.ReactNode
    symbol?: string
    image?: string | { src?: string; srcSet?: string; alt?: string }
    background?: string
    color?: string
    badgeSize?: number
    size?: number
    iconSize?: number
    padding?: number
    rounded?: number
    inset?: number
    badgeInset?: number
    direction?: number | ArrowDirection | string
    restAngle?: number | string
    hoverAngle?: number | string
    side?: "left" | "right"
    /** Previous key. Still read so a live instance keeps its placement. */
    position?: "left" | "right"
}

type Props = {
    colors?: Colors
    label?: string
    font?: any
    padding?: string
    rounded?: number
    fill?: string
    textColor?: string
    border?: any
    icon?: IconConfig
    arrow?: IconConfig // alias for backward compatibility
    gap?: number
    link?: string
    transition?: Transition
    newTab?: boolean
    style?: React.CSSProperties
}

/** Framer's Border control hands back either a single `borderWidth` or four
 *  per-side widths. The badge has to clear the THICKEST side it can run into,
 *  so this takes the max rather than the first key that happens to exist —
 *  reading one side made an asymmetric border silently under-inset the badge. */
const borderWidthOf = (b: any): number => {
    if (!b) return 0
    if (typeof b === "number") return b
    const num = (v: any) => {
        if (typeof v === "number") return v
        const parsed = parseFloat(String(v ?? ""))
        return Number.isFinite(parsed) ? parsed : 0
    }
    const sides = [
        b.borderTopWidth,
        b.borderRightWidth,
        b.borderBottomWidth,
        b.borderLeftWidth,
    ].filter((v) => v !== undefined && v !== null)
    if (sides.length) return Math.max(...sides.map(num))
    return num(b.borderWidth)
}

/** Rounded is a percent of the MAXIMUM possible radius — half the short side —
 *  so 100 is a true pill at any button size and 0 is a square corner. A CSS
 *  percentage border-radius is not the same thing: it resolves per axis and
 *  gives an ellipse, so a wide button would bulge instead of forming a stadium.
 *  Hence the measured conversion. */
const radiusFromPercent = (w: number, h: number, pct: number) =>
    (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100)

const TWELVE_ANGLES: Record<string, number> = {
    "0": 0,
    "30": 30,
    "60": 60,
    "90": 90,
    "120": 120,
    "150": 150,
    "180": 180,
    "210": 210,
    "240": 240,
    "270": 270,
    "300": 300,
    "330": 330,
    right: 0,
    downRight: 45,
    down: 90,
    downLeft: 135,
    left: 180,
    upLeft: 225,
    up: 270,
    upRight: 315,
}

type ArrowDirection = keyof typeof TWELVE_ANGLES | number

const getAngleInDegrees = (
    dir: number | string | undefined,
    defaultVal = 0
): number => {
    if (dir === undefined || dir === null) return defaultVal
    if (typeof dir === "number") return ((dir % 360) + 360) % 360
    if (typeof dir === "string" && dir in TWELVE_ANGLES) {
        return TWELVE_ANGLES[dir]
    }
    const parsed = parseFloat(String(dir ?? ""))
    if (Number.isFinite(parsed)) return ((parsed % 360) + 360) % 360
    return defaultVal
}

// Layout must land before the browser paints, otherwise the badge, the icon and
// the text all render at placeholder geometry for one frame and visibly jump.
// useLayoutEffect is client-only; fall back on the server to silence the warning.
const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect

// The built-in vector fallback is drawn at the weight it always shipped at. It
// used to be a `Stroke` control, but it only reached this one fallback path —
// never the Symbol or Image modes the Type control actually offers — so it was
// a dial that did nothing for almost every instance.
const ICON_STROKE_WIDTH = 2

function renderIconPath(iconType: any, strokeWidth: number = ICON_STROKE_WIDTH) {
    if (React.isValidElement(iconType)) {
        return iconType
    }

    const str = typeof iconType === "string" ? iconType.toLowerCase() : "arrow"

    switch (str) {
        case "chevron":
            return (
                <path
                    d="M9 18L15 12L9 6"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )
        case "plus":
            return (
                <path
                    d="M12 5V19M5 12H19"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )
        case "star":
            return (
                <path
                    d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )
        case "arrowdiagonal":
        case "arrow-diagonal":
            return (
                <path
                    d="M7 17L17 7M17 7H7M17 7V17"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )
        case "check":
            return (
                <path
                    d="M20 6L9 17L4 12"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )
        case "arrow":
        default:
            return (
                <path
                    d="M5 12H19M19 12L13 6M19 12L13 18"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )
    }
}

export default function ArrowRevealButton(props: Props) {
    const {
        label = "ARROW REVEAL",
        font,
        padding = "20px 40px 20px 20px",
        rounded = 100,
        fill: fillProp,
        textColor: textColorProp,
        colors = { fill: "#FFFFFF", textColor: "#000000" },
        border = {
            borderColor: "#FFFFFF",
            borderStyle: "solid",
            borderWidth: 2,
            borderTopWidth: 2,
            borderLeftWidth: 2,
            borderRightWidth: 2,
            borderBottomWidth: 2,
        },
        icon: iconProps = {
            side: "left",
            size: 32,
            type: "symbol",
            color: "#FFFFFF",
            image: "",
            symbol: "→",
            padding: 24,
            rounded: 100,
            restAngle: 0,
            background: "#3600FF",
            hoverAngle: 0,
        },
        arrow: arrowProps,
        gap = 32,
        link = "",
        transition = {
            ease: [0.44, 0, 0.56, 1],
            type: "tween",
            delay: 0,
            duration: 0.46,
        } as Transition,
        newTab = true,
        style,
    } = props

    // Top-level Fill / Text Color are the previous shape; the Colors group
    // wins, and they remain as fallbacks so an existing instance is untouched.
    const fill = colors?.fill ?? fillProp ?? "#FFFFFF"
    const textColor = colors?.textColor ?? textColorProp ?? "#000000"

    const iconObj: IconConfig = iconProps || arrowProps || {}

    const {
        type: iconKind = "icon",
        icon: iconType = "arrow",
        symbol: iconSymbol = "→",
        image: iconImage,
        background: iconBackground = "#000000",
        color: iconColor = "#FFFFFF",
        badgeSize: badgeSizePropIn,
        size: sizeProp,
        iconSize: iconSizeProp,
        padding: iconPadding = 33,
        // 100 = the circular badge this button has always shipped. It is the
        // badge's shape now, not just the image's, so it cannot default square.
        rounded: iconRounded = 100,
        inset: insetProp,
        badgeInset: badgeInsetProp,
        direction: iconDirection = 0,
        restAngle: restAngleProp,
        hoverAngle: hoverAngleProp,
        side: iconSideProp,
        position: iconPositionLegacy,
    } = iconObj

    // Placement key is `side` across every button. `position` was this
    // file's older key and is still read, so a live instance keeps its side.
    const iconPosition = iconSideProp ?? iconPositionLegacy ?? "left"

    // ControlType.Image hands back a plain URL string in most Framer versions
    // and a `{ src, srcSet }` object in others — accept both rather than
    // rendering `[object Object]` as a broken image.
    const iconSrc =
        typeof iconImage === "string"
            ? iconImage
            : iconImage && iconImage.src
              ? iconImage.src
              : ""
    // Image mode falls back to the vector until a picture is actually chosen,
    // otherwise flipping the switch empties the badge and reads as a broken
    // control (same rule as the marquee separator).
    const kind = iconKind === "image" && !iconSrc ? "icon" : iconKind

    const badgeInset = insetProp ?? badgeInsetProp ?? 0
    const bWidth = borderWidthOf(border)
    // The stroke overlay grows OUTWARD from the pill (see the render), so it no
    // longer eats into the pill's interior and the badge does not have to clear
    // it. Only the designer's own Inset applies.
    const effectiveInset = badgeInset

    const Tag: any = link ? "a" : "button"
    const tagProps = link
        ? {
              href: link,
              target: newTab ? "_blank" : undefined,
              rel: newTab ? "noopener noreferrer" : undefined,
          }
        : { type: "button" }

    const [scope, animate] = useAnimate()
    const buttonRef = useRef<HTMLElement>(null)
    const strokeRef = useRef<HTMLSpanElement>(null)
    const badgeRef = useRef<HTMLDivElement>(null)
    const slotRef = useRef<HTMLSpanElement>(null)
    const textRef = useRef<HTMLSpanElement>(null)
    const arrowRef = useRef<HTMLDivElement>(null)
    const hovered = useRef(false)
    const metrics = useRef({ hoverScale: 1, hoverX: 0 })
    const reducedMotion = useReducedMotion()

    // Sizing calculation
    const iconSize = Math.max(1, Math.round(iconSizeProp ?? sizeProp ?? 50))

    const badgeSizeProp =
        badgeSizePropIn !== undefined
            ? Math.max(1, Math.round(badgeSizePropIn))
            : Math.max(1, Math.round(iconSize + 2 * iconPadding))

    // Angle calculation for 12-angle direction, rest angle, hover angle
    const dirAngle = getAngleInDegrees(iconDirection, 0)
    const restAngleVal = getAngleInDegrees(restAngleProp, dirAngle)
    const hoverAngleVal = getAngleInDegrees(hoverAngleProp, dirAngle + 45)

    // Image-only: a vector or a typed character has no box to round.
    // Percent of the maximum radius — half the glyph box — so 100 is a circle at
    // any icon size and 0 a square corner. Written as a CSS percentage rather
    // than measured px because the glyph box is SQUARE (a percentage radius only
    // gives an ellipse on a rectangle) and its real side is `arrowSize`, which
    // the layout effect clamps to the inscribed square of the badge — a number
    // React never sees. Deriving from `iconSize` here would overshoot whenever
    // the badge is small enough to clamp the glyph. CSS `50%` is the full
    // circle, hence the halving.
    const iconRadius = `${Math.max(0, Math.min(100, Math.round(iconRounded))) / 2}%`

    const isLeft = iconPosition === "left"

    // Sync angle at rest if props change
    useEffect(() => {
        if (!hovered.current && arrowRef.current) {
            animate(arrowRef.current, { rotate: restAngleVal }, { duration: 0 })
        }
    }, [restAngleVal, animate])

    // Measure the rendered button and lay out the badge, icon rest position, and
    // the scale needed to cover the whole pill. Runs on mount + every resize so
    // it stays correct on Framer's canvas without IntersectionObserver.
    useIsoLayoutEffect(() => {
        const btn = buttonRef.current
        const badge = badgeRef.current
        const arrow = arrowRef.current
        const slot = slotRef.current
        const strokeEl = strokeRef.current
        if (!btn || !badge || !arrow || !slot) return

        const measure = () => {
            const w = btn.offsetWidth
            const h = btn.offsetHeight
            if (!w || !h) return

            // ONE curve, written to both elements that draw it: the pill's clip
            // (the button) and the pill's stroke (the overlay). They can never
            // disagree because there is no second, derived radius any more.
            // The stroke sits one border-width OUTSIDE the pill, so its own
            // curve is concentric — the same radius grown by that width.
            const radius = radiusFromPercent(w, h, rounded)
            btn.style.borderRadius = `${radius}px`
            if (strokeEl) strokeEl.style.borderRadius = `${radius + bWidth}px`

            const room = Math.min(h, w) - 2 * effectiveInset
            if (room <= 0) return
            const badgeSize = Math.min(badgeSizeProp, room)
            const rb = badgeSize / 2

            // The badge is painted absolutely (it has to scale up and cover the
            // pill) but its PLACE is the in-flow slot, so padding and gap decide
            // where it sits and Icon Size grows the button instead of being
            // clamped by it. `offsetLeft` is transform-independent, so the
            // measurement does not drift while the press scale is running.
            const rawCx = slot.offsetLeft + slot.offsetWidth / 2
            const cy = slot.offsetTop + slot.offsetHeight / 2

            // Tangency guard. Sitting at `edge - rb` under a round cap leaves the
            // disc EXACTLY tangent to the pill boundary, and a tangent curve is
            // where the clip's antialiasing shaves a flat chord off the disc —
            // the "icon circle clipped from the inside" at max Rounded. Holding
            // the centre at least `radius` from the edge makes the disc
            // concentric with the cap instead, strictly inside with room to
            // spare. At any padding wide enough to clear it, the slot wins.
            const fromEdge = Math.max(effectiveInset + rb, radius)
            const cx = Math.min(Math.max(rawCx, fromEdge), w - fromEdge)

            // Expansion target: cover the far corner from wherever the disc sits.
            const far = Math.hypot(
                Math.max(cx, w - cx),
                Math.max(cy, h - cy)
            )
            const coverD = Math.ceil(2 * far * 1.02)

            // The glyph is square and the badge is a CIRCLE, so a glyph as wide
            // as the disc pokes out at all four diagonals. The largest square
            // that fits is the inscribed one, side = d / √2.
            const arrowSize = Math.min(
                iconSize,
                Math.floor(badgeSize / Math.SQRT2)
            )

            metrics.current = {
                // The disc is sized at its RESTING size and scaled UP on hover.
                // It used to be a ~2000px circle held at scale 0.05, so the
                // state users actually look at was a 20x downscaled texture with
                // a mushy edge. Native at rest, oversized only mid-animation.
                hoverScale: badgeSize > 0 ? coverD / badgeSize : 1,
                // icon travels from badge center to button center on hover
                hoverX: w / 2 - cx,
            }

            badge.style.width = `${badgeSize}px`
            badge.style.height = `${badgeSize}px`
            badge.style.left = `${cx}px`
            badge.style.top = `${cy}px`
            badge.style.marginLeft = `${-rb}px`
            badge.style.marginTop = `${-rb}px`

            arrow.style.width = `${arrowSize}px`
            arrow.style.height = `${arrowSize}px`
            // Symbol mode types at the glyph box's size, so one Icon Size
            // control drives the vector, the character and the image alike.
            // Without this the character would inherit the button's font size.
            arrow.style.fontSize = `${arrowSize}px`
            arrow.style.marginLeft = `${-arrowSize / 2}px`
            arrow.style.marginTop = `${-arrowSize / 2}px`
            arrow.style.left = `${cx}px`
            arrow.style.top = `${cy}px`
            arrow.style.right = "auto"

            // No margin hack on the label any more. The slot reserves the
            // badge's room as real layout, so `gap` is Flexbox's own gap and the
            // button's intrinsic width AND height both follow Icon Size.

            if (!hovered.current) {
                animate(badge, { scale: 1 }, { duration: 0 })
                animate(arrow, { x: 0, rotate: restAngleVal }, { duration: 0 })
            }
        }

        measure()
        // Observe the SLOT as well as the pill: a `gap` or Icon Size change
        // moves the slot without necessarily resizing the button, and the badge
        // now takes its place from the slot.
        const ro = new ResizeObserver(measure)
        ro.observe(btn)
        ro.observe(slot)
        return () => ro.disconnect()
        // Primitives only — `border` and `icon` are fresh objects every render,
        // so depending on them would rebuild the observer on every render.
    }, [
        animate,
        gap,
        badgeSizeProp,
        iconSize,
        padding,
        isLeft,
        rounded,
        restAngleVal,
        effectiveInset,
        bWidth,
    ])

    const opts = () => (reducedMotion ? { duration: 0 } : transition)

    /** Press scales the pill AND its stroke overlay in the same call. They are
     *  siblings on purpose (see the render), so each carries its own transform —
     *  no shared transformed ANCESTOR, which is what forced the rounded clip to
     *  be rasterized once and then resampled, fraying the cap. */
    const pressTo = (s: number) => {
        if (buttonRef.current)
            animate(buttonRef.current as HTMLElement, { scale: s } as any, opts() as any)
        if (strokeRef.current)
            animate(strokeRef.current, { scale: s } as any, opts() as any)
    }

    const onEnter = () => {
        hovered.current = true
        animate(
            badgeRef.current!,
            { scale: metrics.current.hoverScale } as any,
            opts() as any
        )
        animate(
            arrowRef.current!,
            {
                x: metrics.current.hoverX,
                rotate: hoverAngleVal,
            } as any,
            opts() as any
        )
        // Instead of changing text opacity, the expanding badge layer (zIndex: 2)
        // is placed on top of text (zIndex: 1) and naturally covers it as it expands.
        if (textRef.current) {
            animate(textRef.current, { x: isLeft ? 8 : -8 } as any, opts() as any)
        }
    }

    const onLeave = () => {
        hovered.current = false
        animate(badgeRef.current!, { scale: 1 } as any, opts() as any)
        animate(
            arrowRef.current!,
            {
                x: 0,
                rotate: restAngleVal,
            } as any,
            opts() as any
        )
        if (textRef.current) {
            animate(textRef.current, { x: 0 } as any, opts() as any)
        }
        // release a stuck press
        pressTo(1)
    }

    /** Whatever the badge holds. All three modes share the badge, the rotation
     *  and the travel — only the paint differs. */
    const glyph =
        kind === "image" ? (
            <img
                src={iconSrc}
                alt=""
                aria-hidden
                draggable={false}
                style={{
                    width: "100%",
                    height: "100%",
                    // `contain` letterboxes, so a rounded corner would clip
                    // empty space instead of the picture. `cover` the moment a
                    // radius is asked for — the only way the crop reads as the
                    // rounded chip the control implies.
                    objectFit: iconRounded > 0 ? "cover" : "contain",
                    borderRadius: iconRadius,
                    display: "block",
                    pointerEvents: "none",
                }}
            />
        ) : kind === "symbol" ? (
            <span
                style={{
                    display: "block",
                    // The glyph box is already `arrowSize` square, so the type
                    // size follows it — one Size control drives every mode.
                    fontSize: "100%",
                    lineHeight: 1,
                    color: iconColor,
                    whiteSpace: "nowrap",
                }}
            >
                {iconSymbol}
            </span>
        ) : (
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {renderIconPath(iconType)}
            </svg>
        )

    return (
        <div
            ref={scope}
            style={{
                // HUG, not fill. `width/height: 100%` made the button stretch to
                // whatever column it was dropped into instead of sizing to Label
                // + Padding, which is what every other button in the set does.
                // Floors go BEFORE the spread so an explicit size still wins.
                display: "inline-flex",
                minWidth: 80,
                minHeight: 40,
                position: "relative",
                overflow: "visible",
                ...style,
            }}
        >
            <Tag
                {...tagProps}
                ref={buttonRef}
                onPointerEnter={onEnter}
                onPointerLeave={onLeave}
                onPointerDown={() => pressTo(0.97)}
                onPointerUp={() => pressTo(1)}
                style={{
                    boxSizing: "border-box",
                    // Sized by its content, but still fills the root if a Framer
                    // instance pins an explicit width/height on it (the root is
                    // `inline-flex`, so `align-items: stretch` covers height).
                    flex: "1 1 auto",
                    display: "flex",
                    alignItems: "center",
                    // Label and badge slot are the two in-flow children. DOM
                    // order keeps the label first for assistive tech; `Left`
                    // flips it visually only. `space-between` holds them at the
                    // padding edges when Framer gives the button more width than
                    // its content asks for.
                    flexDirection: isLeft ? "row-reverse" : "row",
                    justifyContent: "space-between",
                    gap,
                    padding,
                    background: fill,
                    border: "none",
                    // The ONLY rounded clip in the component. The badge used to
                    // sit inside a second inset+rounded wrapper, and two
                    // antialiased curves at almost-the-same radius are what drew
                    // the doubled bracket down the sides and around the cap.
                    overflow: "hidden",
                    position: "relative",
                    cursor: "pointer",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
                }}
            >
                {/* Layer 1: Text label layer (zIndex: 1) */}
                <span
                    ref={textRef}
                    style={{
                        position: "relative",
                        zIndex: 1,
                        color: textColor,
                        opacity: 1,
                        ...font,
                    }}
                >
                    {label}
                </span>

                {/* BADGE SLOT — the only reason the badge occupies layout. The
                    disc itself must be absolute (it scales up to cover the whole
                    pill), and an absolute element contributes nothing to its
                    parent's intrinsic size, which is why Icon Size used to grow
                    the disc until it hit the button's height and then stop. This
                    empty box is the disc's footprint in flow, so the button's
                    own width and height follow Icon Size. */}
                <span
                    ref={slotRef}
                    aria-hidden
                    style={{
                        flex: "none",
                        width: badgeSizeProp,
                        height: badgeSizeProp,
                    }}
                />

                {/* Layer 2: the badge, a direct child of the pill (zIndex: 2).
                    It is clipped by the pill's own overflow and nothing else. */}
                <div
                    ref={badgeRef}
                    aria-hidden
                    style={{
                        position: "absolute",
                        zIndex: 2,
                        width: 0,
                        height: 0,
                        // Rounded drives the badge as well as the picture — one
                        // dial for the whole icon, so a square image can never
                        // sit inside a round plate. The badge is square (the
                        // measure pass sizes it `badgeSize` both ways), so the
                        // same CSS percentage is exact here too.
                        borderRadius: iconRadius,
                        background: iconBackground,
                        transformOrigin: "center",
                        pointerEvents: "none",
                    }}
                />

                {/* Layer 3: Icon container (zIndex: 3) on top of the badge.
                    `top`/`left`/`width`/`height`/`margin` are owned by the
                    measure pass and are deliberately NOT declared here — a
                    property written from props AND imperatively has two owners,
                    and React wins: it re-writes the inline style on every prop
                    change and would snap the glyph back to the corner. */}
                <div
                    ref={arrowRef}
                    aria-hidden
                    style={{
                        position: "absolute",
                        zIndex: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: iconColor,
                        pointerEvents: "none",
                    }}
                >
                    {glyph}
                </div>
            </Tag>

            {/* STROKE — a SIBLING of the pill, not a border on it. A border is
                painted on the border box while `overflow` clips to the padding
                box, so the stroke and the mask were two different curves and the
                inner one had to be re-derived by hand (radius minus width) —
                which is what split into a second outline through the cap.
                Outside the clip there is exactly one curve, drawn once.

                It grows OUTWARD: pulled out by one border width on every side so
                the stroke's INNER edge lands on the pill's boundary instead of
                eating a band off the pill's face. The radius is grown to match
                in the measure pass, keeping the two curves concentric. */}
            <span
                ref={strokeRef}
                aria-hidden
                style={{
                    position: "absolute",
                    inset: -bWidth,
                    zIndex: 4,
                    boxSizing: "border-box",
                    pointerEvents: "none",
                    ...(border ?? {}),
                }}
            />
        </div>
    )
}
