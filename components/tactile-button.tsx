"use client"

import * as React from "react"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
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

// Release is a stiff, lightly-damped spring: the key pops back up with a touch
// of overshoot, which is what sells a click over a linear glide.
const DEFAULT_TRANSITION: Transition = {
    type: "spring",
    stiffness: 700,
    damping: 22,
    mass: 0.6,
}

// A key bottoms out faster than it springs back. The down stroke is fixed at
// this snap; the release uses the user's Transition control.
const PRESS_DOWN: Transition = {
    type: "tween",
    ease: "easeOut",
    duration: 0.05,
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

type HoverConfig = {
    fill?: string
    textColor?: string
}

type BaseConfig = {
    color?: string
    offsetX?: number
    offsetY?: number
    /** LEGACY — `Side` + `Depth` could only describe a 45° lean, one of two
     *  ways. Read as a fallback so an instance that never opened the Base group
     *  keeps the plate it had. */
    side?: "left" | "right"
    depth?: number
}

/** The four colours, batched into one modal under Font. Top-level `fill` /
 *  `textColor` and a `hover` group were the previous shape; both are still read
 *  as fallbacks so an existing Framer instance keeps its values. */
type Colors = {
    fill?: string
    textColor?: string
    hoverFill?: string
    hoverTextColor?: string
}

export interface TactileButtonProps {
    label?: string
    font?: React.CSSProperties
    showText?: boolean
    padding?: string
    rounded?: number
    fill?: string
    textColor?: string
    colors?: Colors
    addIcon?: boolean
    icon?: IconConfig
    gap?: number
    border?: React.CSSProperties
    hover?: HoverConfig
    base?: BaseConfig
    // Legacy top-level rows, superseded by the `base` group.
    shadowColor?: string
    shadowSide?: "left" | "right"
    shadowDistance?: number
    link?: string
    transition?: Transition
    newTab?: boolean
    style?: React.CSSProperties
}

/**
 * Tactile Button — a keycap sitting on a fixed base plate. The base is a real
 * sibling element offset by Depth — down, leaning to the chosen Base Side — not
 * a box-shadow on the cap: a shadow travels with whatever casts it, so the old
 * version moved the "well" along with the key and read as a duplicate slab.
 * Anchoring the base and translating only the cap makes the two read as one
 * body — the cap bottoms out flush into the base on press, exactly covering it.
 *
 * Imperative useAnimate only, per framer.md: no `initial` / `animate` /
 * `whileHover` / `whileTap` variant props.
 */
export default function TactileButton(props: TactileButtonProps) {
    const {
        label = "TACTILE BUTTON",
        font,
        showText = true,
        padding = "40px 64px 40px 64px",
        rounded = 100,
        fill: fillProp,
        textColor: textColorProp,
        colors,
        addIcon = false,
        // A group the designer never opened arrives `undefined`, and so does any
        // field inside one they only partly filled — hence `= {}` plus a
        // per-field fallback below, never the control's defaultValue alone.
        icon = {"side":"left","size":24,"type":"symbol","color":"#FFFFFF","image":"","symbol":"→","padding":0,"rounded":0,"hoverColor":"#FFFFFF"},
        gap = 12,
        border,
        hover = {},
        base = {"color":"#FC731C","offsetX":-1,"offsetY":11},
        shadowColor: shadowColorLegacy,
        shadowSide: shadowSideLegacy,
        shadowDistance: shadowDistanceLegacy,
        link,
        transition = {"mass":1,"type":"spring","delay":0,"damping":60,"stiffness":800},
        newTab = false,
        style,
    } = props

    // Top-level Fill / Text Color win; the old `Colors` group is the fallback so
    // an instance built before the split keeps rendering what it rendered.
    const fill = colors?.fill ?? fillProp ?? "#6366F1"
    const textColor = colors?.textColor ?? textColorProp ?? "#FFFFFF"
    const {
        fill: hoverFill = colors?.hoverFill ?? "#FC731C",
        textColor: hoverTextColor = colors?.hoverTextColor ?? "#FFFFFF",
    } = hover

    const {
        color: baseColor = shadowColorLegacy ?? "#3730A3",
        offsetX: baseOffsetX,
        offsetY: baseOffsetY,
        side: baseSide = shadowSideLegacy ?? "right",
        depth: baseDepth = shadowDistanceLegacy ?? 7,
    } = base

    const [scope, animate] = useAnimate()

    // Rounded is a percent, so the px radius can only come from the measured
    // box. offsetWidth/Height, NOT getBoundingClientRect: Framer's canvas
    // renders inside a CSS-scaled container, so a rect comes back multiplied by
    // the zoom level while the layout box does not.
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
    // `any` because the tag flips between <a> and <button>, and framer-motion's
    // element overload narrows badly on the union.
    const capRef = useRef<any>(null)
    // A symbol is text, so it can take the hover colour swap the label takes.
    // An image cannot — it has no `color` — so its control stays hidden.
    const iconRef = useRef<HTMLSpanElement>(null)
    const hovered = useRef(false)
    const pressed = useRef(false)
    const reducedMotion = useReducedMotion()

    const fontStyles = (font ?? {}) as React.CSSProperties

    // Travel = the base plate's offset, so a pressed cap lands exactly on it.
    // Offset X / Offset Y are a free vector: `Side` + `Depth` could only reach a
    // 45° lean one of two ways, so a plate straight below the cap — the obvious
    // keycap — was not expressible. The old pair is still read for an instance
    // that never opened the group. Negative values are already handled: the
    // root's padding reserves the plate's room on whichever side it lands.
    const legacyDepth = Math.max(0, Math.round(baseDepth))
    const dx = Math.round(
        baseOffsetX ?? (baseSide === "left" ? -legacyDepth : legacyDepth)
    )
    const dy = Math.round(baseOffsetY ?? legacyDepth)

    // ---- icon -----------------------------------------------------------
    const {
        type: iconKind = "symbol",
        symbol: iconSymbol = "→",
        image,
        color: iconColor = "#FFFFFF",
        hoverColor: iconHoverColor = "#FFFFFF",
        side: iconSide = "left",
        size: iconSize = 24,
        padding: iconPaddingProp = 0,
        rounded: iconRounded = 0,
    } = icon
    // ControlType.Image hands back a plain URL string in most Framer versions
    // and a `{ src, srcSet }` object in others — accept both rather than
    // rendering `[object Object]` as a broken image.
    const iconSrc =
        typeof image === "string" ? image : image && image.src ? image.src : ""
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

    /** Colour swap only — hover never moves the key. */
    const paint = useCallback(
        (toHover: boolean, instant: boolean) => {
            const el = capRef.current
            if (!el) return
            const t: Transition =
                instant || reducedMotion ? { duration: 0 } : transition
            animate(
                el,
                toHover
                    ? {
                          backgroundColor: hoverFill,
                          color: hoverTextColor,
                      }
                    : {
                          backgroundColor: fill,
                          color: textColor,
                      },
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
            transition,
            reducedMotion,
            fill,
            hoverFill,
            textColor,
            hoverTextColor,
            iconColor,
            iconHoverColor,
        ]
    )

    /** The key stroke: cap slides down the base's own offset until flush. */
    const press = useCallback(
        (down: boolean, instant: boolean) => {
            const el = capRef.current
            if (!el) return
            const t: Transition = instant
                ? { duration: 0 }
                : reducedMotion
                  ? { duration: 0 }
                  : down
                    ? PRESS_DOWN
                    : transition
            animate(el, { x: down ? dx : 0, y: down ? dy : 0 }, t as any)
        },
        [animate, transition, reducedMotion, dx, dy]
    )

    // Re-land the CURRENT state whenever a control changes it. Not "skip while
    // interacting": `backgroundColor` and `color` are declared on the cap AND
    // animated, and React re-writes an inline style from props on any render
    // whose value changed — so editing Fill mid-hover clobbered the tween and
    // left the key showing resting colour under the cursor.
    useEffect(() => {
        paint(hovered.current, true)
    }, [paint])

    useEffect(() => {
        press(pressed.current, true)
    }, [press])

    const onEnter = () => {
        hovered.current = true
        paint(true, false)
    }
    const onLeave = () => {
        hovered.current = false
        paint(false, false)
        // Pointer left mid-press — the key must come back up.
        if (pressed.current) {
            pressed.current = false
            press(false, false)
        }
    }

    const onDown = () => {
        pressed.current = true
        press(true, false)
    }
    const onUp = () => {
        pressed.current = false
        press(false, false)
    }

    // Release is also watched on `window`: a pointer that goes up outside the
    // button — or a tab switch that swallows the event — would otherwise leave
    // the key bottomed out for good.
    useEffect(() => {
        const release = () => {
            if (!pressed.current) return
            pressed.current = false
            press(false, false)
        }
        window.addEventListener("pointerup", release)
        window.addEventListener("pointercancel", release)
        return () => {
            window.removeEventListener("pointerup", release)
            window.removeEventListener("pointercancel", release)
        }
    }, [press])

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
        // The base plate sticks out past the cap, so the component reserves that
        // room as padding — anything painted outside a node's own box gets
        // clipped on Framer's canvas.
        <div
            style={{
                display: "inline-block",
                boxSizing: "border-box",
                paddingTop: Math.max(0, -dy),
                paddingBottom: Math.max(0, dy),
                paddingLeft: Math.max(0, -dx),
                paddingRight: Math.max(0, dx),
                ...style,
            }}
        >
            <div
                ref={scope}
                style={{
                    position: "relative",
                    display: "inline-flex",
                    width: "100%",
                    height: "100%",
                }}
            >
                {/* base plate — the key well. Fixed in place; the cap covers it
                    exactly when bottomed out, so the two read as one solid
                    body instead of a shape plus its shadow. */}
                <div
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        inset: 0,
                        transform: `translate(${dx}px, ${dy}px)`,
                        borderRadius: radiusPx,
                        ...(border ?? {}),
                        backgroundColor: baseColor,
                        boxSizing: "border-box",
                        pointerEvents: "none",
                    }}
                />

                <Tag
                    {...tagProps}
                    ref={capRef}
                    onPointerEnter={onEnter}
                    onPointerLeave={onLeave}
                    onPointerDown={onDown}
                    onPointerUp={onUp}
                    style={{
                        position: "relative",
                        display: "inline-block",
                        width: "100%",
                        padding,
                        borderRadius: radiusPx,
                        ...(border ?? {}),
                        // `backgroundColor`, not the `background` shorthand: the
                        // hover tween animates this exact longhand, and a
                        // re-rendered shorthand wipes an animated longhand.
                        backgroundColor: fill,
                        textDecoration: "none",
                        cursor: "pointer",
                        boxSizing: "border-box",
                        userSelect: "none",
                        whiteSpace: "nowrap",
                        textAlign: "center",
                        WebkitTapHighlightColor: "transparent",
                        // No permanent `will-change`. The press and hover tweens
                        // promote the cap for their own duration anyway.
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
                </Tag>
            </div>
        </div>
    )
}
