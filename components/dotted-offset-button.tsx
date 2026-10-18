"use client"

import * as React from "react"
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react"
import { useAnimate, useReducedMotion, type Transition } from "motion/react"

/** Rounded is a percent of the MAXIMUM possible radius — half the short side —
 *  so 100 is a true pill at any button size and 0 is a square corner. A CSS
 *  percentage border-radius is not the same thing: it resolves per axis and
 *  gives an ellipse, so a wide button would bulge instead of forming a stadium.
 *  Hence the measured conversion. */
const radiusFromPercent = (w: number, h: number, pct: number) =>
    (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100)

// Layout must land before the browser paints, otherwise the button renders at a
// square corner for one frame and visibly snaps. useLayoutEffect is client-only;
// fall back on the server to silence the warning.
const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect

/** The border object hands back either one fused width or four per-side
 *  widths, plus `borderStyle` / `borderColor`. */
const borderColorOf = (b: any): string => b?.borderColor ?? "transparent"

/** The border WITHOUT its colour. The colour is animated (rest → hover), and a
 *  property that React re-writes from props on every render must not be the same
 *  property an imperative tween owns — the render wins and the tween's value is
 *  clobbered mid-flight. Width and style are static, so they stay here. */
const borderBoxOf = (b: any): React.CSSProperties => {
    if (!b) return {}
    const { borderColor, ...rest } = b as Record<string, any>
    return rest as React.CSSProperties
}

const DEFAULT_TRANSITION: Transition = {
    mass: 1,
    type: "spring",
    damping: 25,
    stiffness: 400,
}

export type IconConfig = {
    type?: "symbol" | "image"
    symbol?: string
    image?: string | { src?: string; srcSet?: string; alt?: string }
    color?: string
    hoverColor?: string
    size?: number
    padding?: number
    rounded?: number
    side?: "left" | "right"
}

export type HoverConfig = {
    fill?: string
    textColor?: string
    borderColor?: string
    rounded?: number
    offsetX?: number
    offsetY?: number
}

export type ShadowConfig = {
    color?: string
    /** LEGACY — the offset moved into `Hover`, where the rest of what the hover
     *  state does already lives, and became a free X/Y vector. `Side` + one
     *  `Distance` could only describe a 45° lean. Both are still read so an
     *  instance that never opened the groups is unchanged. */
    side?: "left" | "right"
    distance?: number
}

/** The four colours, batched together. Top-level `fill` / `textColor` and a
 *  `hover` group were the previous shape; both are still read as fallbacks so
 *  an existing instance keeps its values. */
export type Colors = {
    fill?: string
    textColor?: string
    hoverFill?: string
    hoverTextColor?: string
}

export type BorderConfig = {
    borderColor?: string
    borderStyle?: "solid" | "dashed" | "dotted" | "double"
    borderWidth?: number | string
    borderTopWidth?: number | string
    borderRightWidth?: number | string
    borderBottomWidth?: number | string
    borderLeftWidth?: number | string
}

export type DottedOffsetButtonProps = {
    label?: string
    font?: Record<string, any>
    showText?: boolean
    padding?: string
    rounded?: number
    fill?: string
    textColor?: string
    colors?: Colors
    addIcon?: boolean
    icon?: IconConfig
    gap?: number
    border?: BorderConfig
    hover?: HoverConfig
    shadow?: ShadowConfig
    // Legacy top-level rows, superseded by the groups above.
    hoverRounded?: number
    hoverBorderColor?: string
    shadowColor?: string
    shadowSide?: "left" | "right"
    shadowDistance?: number
    link?: string
    transition?: Transition
    newTab?: boolean
    style?: React.CSSProperties
}

/**
 * Dotted Button — the pill lifts up-left on hover while a hard offset shadow
 * drops in behind it, and the corners tighten.
 *
 * Imperative useAnimate only: no `initial` / `animate` / `whileHover` /
 * `whileTap` variant props.
 */
function __BaseImpl_DottedOffsetButton(props: DottedOffsetButtonProps) {
    const {
        label = "DOTTED OFFSET",
        font = {
            variant: "Regular",
            fontSize: 40,
            textAlign: "left",
            fontFamily: "Inter",
            fontWeight: 500,
            lineHeight: "1.5em",
            letterSpacing: "0em",
        },
        showText = true,
        padding = "40px 64px 40px 64px",
        rounded = 32,
        fill: fillProp,
        textColor: textColorProp,
        colors = {
            fill: "#000000",
            hoverFill: "#000000",
            textColor: "#FFFFFF",
            hoverTextColor: "#FFFFFF",
        },
        addIcon = false,
        // A group the designer never opened arrives `undefined`, and so does any
        // field inside one they only partly filled — hence the object default
        // plus a per-field fallback below, never the group default alone.
        icon = {
            side: "left",
            size: 24,
            type: "symbol",
            color: "#FFFFFF",
            image: "",
            symbol: "→",
            padding: 0,
            rounded: 0,
            hoverColor: "#FC731C",
        },
        gap = 12,
        border = {
            borderColor: "#FFFFFF",
            borderStyle: "dashed",
            borderWidth: 2,
        },
        hover = {
            offsetX: 14,
            offsetY: 14,
            rounded: 25,
            borderColor: "#FFFFFF",
        },
        shadow = { color: "#00FF99" },
        hoverRounded: hoverRoundedLegacy,
        hoverBorderColor: hoverBorderColorLegacy,
        shadowColor: shadowColorLegacy,
        shadowSide: shadowSideLegacy,
        shadowDistance: shadowDistanceLegacy,
        link = "",
        transition = DEFAULT_TRANSITION,
        newTab = false,
        style,
    } = props

    // Top-level Fill / Text Color win; the old `Colors` group is the fallback so
    // an instance built before the split keeps rendering what it rendered.
    const fill = colors?.fill ?? fillProp ?? "#000000"
    const textColor = colors?.textColor ?? textColorProp ?? "#FFFFFF"
    const restBorderColor = borderColorOf(border)

    const {
        fill: hoverFill = colors?.hoverFill ?? "#000000",
        textColor: hoverTextColor = colors?.hoverTextColor ?? "#FFFFFF",
        borderColor: hoverBorderColor = hoverBorderColorLegacy ??
            restBorderColor,
        rounded: hoverRounded = hoverRoundedLegacy ?? 25,
        offsetX: hoverOffsetX,
        offsetY: hoverOffsetY,
    } = hover

    const {
        color: shadowColor = shadowColorLegacy ?? "#FC731C",
        side: shadowSide = shadowSideLegacy ?? "right",
        distance: shadowDistance = shadowDistanceLegacy ?? 14,
    } = shadow

    // Where the hard shadow block lands, as a free vector; the button lifts the
    // opposite way so the two never overlap. `Side` + one `Distance` could only
    // describe a 45° lean, so a shadow straight below the button was not
    // expressible. Both old keys are still read, and they produced ±dist / dist.
    const legacyDist = Math.max(0, Math.round(shadowDistance))
    const shadowX = Math.round(
        hoverOffsetX ?? (shadowSide === "left" ? -legacyDist : legacyDist)
    )
    const shadowY = Math.round(hoverOffsetY ?? legacyDist)

    const [scope, animate] = useAnimate()

    // Rounded is a percent, so the px radius can only come from the measured
    // box. offsetWidth/Height, NOT getBoundingClientRect: a CSS-scaled
    // container makes a rect come back multiplied by the zoom level while the
    // layout box does not.
    const [radiusBox, setRadiusBox] = useState({ w: 0, h: 0 })
    useIsoLayoutEffect(() => {
        const el = scope.current as HTMLElement | null
        if (!el) return
        const read = () =>
            setRadiusBox((prev) =>
                prev.w === el.offsetWidth && prev.h === el.offsetHeight
                    ? prev
                    : { w: el.offsetWidth, h: el.offsetHeight }
            )
        read()
        const ro = new ResizeObserver(read)
        ro.observe(el)
        return () => ro.disconnect()
    }, [scope])
    const radiusPx = radiusFromPercent(radiusBox.w, radiusBox.h, rounded)
    // The hover corner is the same dial on the same box, so the two ends of the
    // tween are in the same unit. It was raw px against a percent rest radius,
    // which meant "tightens on hover" stopped being true at a different size.
    const hoverRadiusPx = radiusFromPercent(
        radiusBox.w,
        radiusBox.h,
        hoverRounded
    )
    // A symbol is text, so it can take the hover colour swap the label takes.
    // An image cannot — it has no `color`.
    const iconRef = useRef<HTMLSpanElement>(null)
    const hovered = useRef(false)
    const reducedMotion = useReducedMotion()

    const fontStyles = (font ?? {}) as React.CSSProperties

    // ---- icon -----------------------------------------------------------
    const {
        type: iconKind = "symbol",
        symbol: iconSymbol = "→",
        image: iconImage,
        color: iconColor = "#FFFFFF",
        hoverColor: iconHoverColor = "#FC731C",
        size: iconSize = 24,
        padding: iconPaddingProp = 0,
        rounded: iconRounded = 0,
        side: iconSide = "left",
    } = icon
    // The image value can be a plain URL string or a `{ src, srcSet }` object —
    // accept both rather than rendering `[object Object]` as a broken image.
    const iconSrc =
        typeof iconImage === "string"
            ? iconImage
            : iconImage && iconImage.src
              ? iconImage.src
              : ""
    // Image mode falls back to the symbol until a picture is actually chosen,
    // otherwise flipping the switch empties the slot and reads as broken.
    const iconMode = iconKind === "image" && iconSrc ? "image" : "symbol"
    const iconPx = Math.max(1, Math.round(iconSize))
    // Icon Padding is applied as a MARGIN, not padding: the image
    // carries its own border-radius, and padding would round the empty
    // box around the picture instead of the picture.
    const iconPadPx = Math.max(0, Math.round(iconPaddingProp))
    // Percent of the maximum radius (half the square icon box): 100 = a
    // circle, 0 = a square corner. Was raw px — the same number now means
    // the same shape at every icon size.
    const iconRadius = radiusFromPercent(iconPx, iconPx, iconRounded)
    const gapPx = Math.max(0, Math.round(gap))

    // Decorative: the label already names the button, so an alt here would make
    // a screen reader read the same thing twice.
    const iconEl = !addIcon ? null : iconMode === "image" ? (
        <img
            src={iconSrc}
            alt=""
            aria-hidden
            draggable={false}
            style={{
                width: iconPx,
                height: iconPx,
                margin: iconPadPx,
                // `contain` letterboxes, so a rounded corner would clip empty
                // space instead of the image. `cover` once a radius is asked
                // for, which is the only way the crop reads as a rounded chip.
                objectFit: iconRadius > 0 ? "cover" : "contain",
                borderRadius: Math.min(iconRadius, iconPx / 2),
                display: "block",
                flex: "none", // never let a wide icon squash the label
                pointerEvents: "none",
            }}
        />
    ) : (
        <span
            ref={iconRef}
            aria-hidden
            style={{
                fontSize: iconPx,
                margin: iconPadPx,
                lineHeight: 1,
                color: iconColor,
                flex: "none",
                pointerEvents: "none",
            }}
        >
            {iconSymbol}
        </span>
    )

    const apply = useCallback(
        (toHover: boolean, instant: boolean) => {
            if (!scope.current) return
            const t: Transition =
                instant || reducedMotion ? { duration: 0 } : transition

            animate(
                scope.current,
                toHover
                    ? {
                          x: -shadowX,
                          y: -shadowY,
                          borderRadius: hoverRadiusPx,
                          backgroundColor: hoverFill,
                          color: hoverTextColor,
                          borderColor: hoverBorderColor,
                          boxShadow: `${shadowX}px ${shadowY}px 0px ${shadowColor}`,
                      }
                    : {
                          x: 0,
                          y: 0,
                          borderRadius: radiusPx,
                          backgroundColor: fill,
                          color: textColor,
                          borderColor: restBorderColor,
                          boxShadow: `0px 0px 0px ${shadowColor}`,
                      },
                // `x`/`y` are valid motion values but not in the DOM element
                // overload's target type — same cast the other buttons use.
                t as any
            )
            if (iconRef.current)
                animate(
                    iconRef.current,
                    { color: toHover ? iconHoverColor : iconColor },
                    t as any
                )
        },
        [
            animate,
            scope,
            transition,
            reducedMotion,
            shadowX,
            shadowY,
            shadowColor,
            radiusPx,
            hoverRadiusPx,
            fill,
            hoverFill,
            textColor,
            hoverTextColor,
            // The COLOUR, not the border object: that object is rebuilt on
            // every render, so depending on it re-created this callback — and
            // re-ran the snap effect below — on every single render.
            restBorderColor,
            hoverBorderColor,
            iconColor,
            iconHoverColor,
        ]
    )

    // Re-land the CURRENT state whenever a prop changes it. Not "skip while
    // hovered": React re-writes the inline style from props on any render whose
    // value changed, so editing Rounded or a colour mid-hover clobbered the
    // tween's value and left the button showing rest styling while still
    // hovered. Re-applying the live state instantly puts it back.
    useEffect(() => {
        apply(hovered.current, true)
    }, [apply])

    const onEnter = () => {
        hovered.current = true
        apply(true, false)
    }
    const onLeave = () => {
        hovered.current = false
        apply(false, false)
    }

    // Pressing flattens the button back down, then it springs out again on
    // release if the pointer is still on it.
    const onDown = () => apply(false, false)
    const onUp = () => apply(hovered.current, false)

    const isLink = typeof link === "string" && link.length > 0
    const Tag: any = isLink ? "a" : "button"
    const tagProps = {
        // With the text hidden the button has no accessible name — the icon is
        // decorative — so Label keeps working as one.
        "aria-label": showText ? undefined : label || undefined,
        ...(isLink
            ? {
                  href: link,
                  target: newTab ? "_blank" : undefined,
                  rel: newTab ? "noopener noreferrer" : undefined,
              }
            : // without this the browser defaults to type="submit"
              { type: "button" }),
    }

    return (
        // The face lifts OUT of its own box on hover, and anything painted
        // outside a node's box can be clipped — so this wrapper reserves
        // exactly the lift room, on whichever sides the offsets send it. The
        // shadow needs none: it is drawn at +offset from a box translated by
        // -offset, so it always lands back on the resting box and can never
        // overflow.
        <div
            style={{
                display: "inline-block",
                boxSizing: "border-box",
                paddingLeft: Math.max(0, shadowX),
                paddingTop: Math.max(0, shadowY),
                paddingRight: Math.max(0, -shadowX),
                paddingBottom: Math.max(0, -shadowY),
                ...style,
            }}
        >
            {/* The interactive element is this Tag, and it NEVER moves — only
                the face inside it does. The listeners used to sit on the face
                itself, which made the exposed shadow band a trap: a box-shadow
                is painted but never hit-tested, so parking the pointer there ran
                enter (face lifts off the pointer) → leave (face drops back under
                it) → enter … on every pointer move, and the button rattled.
                Anchoring the hit region to the RESTING box also makes that band
                clickable, which is what it looks like. Padding stays on the
                face: this box must hug it, never pad past it, or hovering empty
                gutter would trigger the button. */}
            <Tag
                {...tagProps}
                onPointerEnter={onEnter}
                onPointerLeave={onLeave}
                onPointerDown={onDown}
                onPointerUp={onUp}
                style={{
                    // inline-FLEX, not inline-block: a line box would add
                    // descender space under the face and the hit region would
                    // stop hugging it.
                    display: "inline-flex",
                    width: "100%",
                    height: "100%",
                    padding: 0,
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    font: "inherit",
                    textDecoration: "none",
                    cursor: "pointer",
                    userSelect: "none",
                    WebkitTapHighlightColor: "transparent",
                }}
            >
                <span
                    ref={scope}
                    style={{
                        display: "inline-block",
                        width: "100%",
                        padding,
                        // Width and style only — the colour is animated, so it
                        // is not declared here (see borderBoxOf).
                        ...borderBoxOf(border),
                        borderColor: restBorderColor,
                        borderRadius: radiusPx,
                        backgroundColor: fill,
                        boxSizing: "border-box",
                        whiteSpace: "nowrap",
                        // No permanent `will-change`. It listed six properties
                        // here, including `border-radius` and `box-shadow` —
                        // paint and layout hints that buy nothing at rest and
                        // promote the element for the whole session. The hover
                        // tween promotes it for its own duration anyway.
                        ...fontStyles,
                        color: textColor,
                    }}
                >
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            // Gap only means something with two children.
                            gap: iconEl && showText ? gapPx : 0,
                            // Icon stays FIRST in the DOM and flips visually, so
                            // the label keeps reading first for assistive tech
                            // either way.
                            flexDirection:
                                iconSide === "right" ? "row-reverse" : "row",
                        }}
                    >
                        {iconEl}
                        {showText && <span>{label}</span>}
                    </span>
                </span>
            </Tag>
        </div>
    )
}

const __presetProps = {
  "showText": true,
  "label": "DOTTED OFFSET",
  "font": {
    "variant": "Regular",
    "fontSize": 40,
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 500,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  },
  "colors": {
    "fill": "#000000",
    "hoverFill": "#000000",
    "textColor": "#FFFFFF",
    "hoverTextColor": "#FFFFFF"
  },
  "addIcon": false,
  "icon": {
    "side": "left",
    "size": 24,
    "type": "symbol",
    "color": "#FFFFFF",
    "image": "",
    "symbol": "→",
    "padding": 0,
    "rounded": 0,
    "hoverColor": "#FC731C"
  },
  "gap": 12,
  "rounded": 32,
  "padding": "40px 64px 40px 64px",
  "border": {
    "borderColor": "#FFFFFF",
    "borderStyle": "dashed",
    "borderWidth": 2
  },
  "shadow": {
    "color": "#00FF99"
  },
  "hover": {
    "offsetX": 14,
    "offsetY": 14,
    "rounded": 25,
    "borderColor": "#FFFFFF"
  },
  "transition": {
    "mass": 1,
    "type": "spring",
    "damping": 25,
    "stiffness": 400
  },
  "link": "",
  "newTab": false
};

export default function DottedOffsetButton(props: Record<string, unknown>) {
  return <__BaseImpl_DottedOffsetButton {...(__presetProps as Record<string, unknown>)} {...props} />;
}
