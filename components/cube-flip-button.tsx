"use client"

import * as React from "react"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { motion, useAnimate, type Transition } from "motion/react"

/** Rounded is a percent of the MAXIMUM possible radius — half the short side —
 *  so 100 is a true pill at any button size and 0 is a square corner. A CSS
 *  percentage border-radius is not the same thing: it resolves per axis and
 *  gives an ellipse, so a wide button would bulge instead of forming a stadium.
 *  Hence the measured conversion. */
const radiusFromPercent = (w: number, h: number, pct: number) =>
    (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100)

type Direction = "up" | "down" | "left" | "right"

// axis   = which transform the cube animates on hover
// hover  = target angle that brings face 2 to the front
// face   = pre-rotation that parks face 2 on the adjacent cube side
// dim    = dimension whose half becomes the cube depth (translateZ)
const DIR: Record<
    Direction,
    { axis: "rotateX" | "rotateY"; hover: number; face: string; dim: "w" | "h" }
> = {
    up: { axis: "rotateX", hover: -90, face: "rotateX(90deg)", dim: "h" },
    down: { axis: "rotateX", hover: 90, face: "rotateX(-90deg)", dim: "h" },
    left: { axis: "rotateY", hover: -90, face: "rotateY(90deg)", dim: "w" },
    right: { axis: "rotateY", hover: 90, face: "rotateY(-90deg)", dim: "w" },
}

// Viewing distance for the 3D flip. A tuning constant, not a design knob —
// anything much shorter fisheyes the faces, much longer flattens the turn.
const PERSPECTIVE = 600

const DEFAULT_TRANSITION: Transition = {
    type: "spring",
    stiffness: 260,
    damping: 24,
    mass: 1,
}

// translateZ must land before paint, or both faces render coplanar for a frame.
const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect

export type IconConfig = {
    type?: "symbol" | "image"
    symbol?: string
    hoverSymbol?: string
    image?: string | { src?: string; srcSet?: string; alt?: string }
    hoverImage?: string | { src?: string; srcSet?: string; alt?: string }
    color?: string
    hoverColor?: string
    size?: number
    padding?: number
    rounded?: number
    side?: "left" | "right"
}

type Colors = {
    fill?: string
    textColor?: string
    hoverFill?: string
    hoverTextColor?: string
}

const COLOR_DEFAULTS: Required<Colors> = {
    fill: "#000000",
    textColor: "#FFFFFF",
    hoverFill: "#FC731C",
    hoverTextColor: "#FFFFFF",
}

export interface CubeButtonProps {
    label?: string
    label2?: string
    font?: Record<string, any>
    showText?: boolean
    padding?: string
    rounded?: number
    colors?: Colors
    addIcon?: boolean
    icon?: IconConfig
    gap?: number
    border?: any
    direction?: Direction
    link?: string
    transition?: Transition
    newTab?: boolean
    style?: React.CSSProperties
}

export default function CubeButton(props: CubeButtonProps) {
    const {
        label = "3D CUBE FLIP",
        label2 = "CUBE FLIPPED",
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
        rounded = 34,
        colors = {
            fill: "#000000",
            hoverFill: "#FC731C",
            textColor: "#FFFFFF",
            hoverTextColor: "#FFFFFF",
        },
        addIcon = false,
        // A group the designer never opened arrives `undefined`, and so does any
        // field inside one they only partly filled — hence `= {}` plus a
        // per-field fallback below, never the control's defaultValue alone.
        icon = {"side":"left","size":24,"type":"symbol","color":"#FFFFFF","image":"","symbol":"→","padding":0,"rounded":0,"hoverColor":"#FFFFFF","hoverImage":"","hoverSymbol":""},
        gap = 12,
        border = {"borderColor":"#FFFFFF","borderStyle":"solid","borderWidth":1,"borderTopWidth":1,"borderLeftWidth":1,"borderRightWidth":1,"borderBottomWidth":1},
        direction = "down",
        link = "",
        transition = {"mass":1,"type":"spring","damping":24,"stiffness":260},
        newTab = false,
        style,
    } = props

    const { fill, textColor, hoverFill, hoverTextColor } = {
        ...COLOR_DEFAULTS,
        ...(colors ?? {}),
    }
    const fill2 = hoverFill
    const textColor2 = hoverTextColor

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
    const cubeRef = useRef<HTMLDivElement | null>(null)
    const [size, setSize] = useState({ w: 0, h: 0 })

    // The cube is turned whenever the pointer OR keyboard focus is on the
    // button. Tracking both inputs separately — and the resulting state — is
    // what stops a click from restarting the flip (see `sync`).
    const hovered = useRef(false)
    const focused = useRef(false)
    const turned = useRef(false)
    // A flip in flight is never interrupted — see `sync`.
    const flipping = useRef(false)

    const cfg = DIR[direction] ?? DIR.up
    const half = (cfg.dim === "h" ? size.h : size.w) / 2

    // translateZ needs real px, so measure the cube box.
    useIsoLayoutEffect(() => {
        const el = cubeRef.current
        if (!el) return
        const measure = () =>
            setSize({ w: el.offsetWidth, h: el.offsetHeight })
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    // Snap cube flat. Keyframe arrays keep origin/target the same type so
    // framer-motion never enters its angle-measurement path (crash guard).
    // `z: -half` pushes the cube back so the FRONT face sits exactly on the
    // z = 0 plane. Without it the face is translateZ(+half) toward the viewer
    // and `perspective` magnifies it by PERSPECTIVE / (PERSPECTIVE - half) —
    // the element paints larger than its layout box, so Framer's selection
    // outline (which follows the layout box) lands inside the visible button.
    const resetToFront = useCallback(() => {
        turned.current = false
        flipping.current = false
        if (!cubeRef.current) return
        animate(
            cubeRef.current,
            { rotateX: [0, 0], rotateY: [0, 0], z: [-half, -half] },
            { duration: 0 }
        )
    }, [animate, half])

    useEffect(() => {
        if (hovered.current || focused.current) return
        resetToFront()
    }, [resetToFront, direction])

    // Both return the playback controls so `sync` can wait for the flip to land.
    const runTurn = useCallback(() => {
        if (!cubeRef.current) return null
        return animate(
            cubeRef.current,
            { [cfg.axis]: [0, cfg.hover], z: -half },
            transition as any
        )
    }, [animate, transition, cfg.axis, cfg.hover, half])

    const runRest = useCallback(() => {
        if (!cubeRef.current) return null
        return animate(
            cubeRef.current,
            { [cfg.axis]: [cfg.hover, 0], z: -half },
            transition as any
        )
    }, [animate, transition, cfg.axis, cfg.hover, half])

    /** Drive the flip from the combined hover+focus state, and only when it
     *  actually flips. The turn is keyframed from angle 0, so re-running it
     *  while already turned snaps the cube back to face 1 and rotates again —
     *  which is exactly what a click used to do, via the focus it grants.
     *
     *  A flip in flight is never interrupted. Both runs are KEYFRAMED from a
     *  fixed start angle, so retargeting mid-turn does not ease from wherever
     *  the cube currently is — it hard-snaps to the first keyframe and animates
     *  from there. A pointer that crossed the button and left again therefore
     *  jumped, and a quick in-out could leave the cube parked edge-on, showing
     *  a sliver of nothing. Letting the turn land first means the angle is
     *  always exactly `0` or `cfg.hover` when the next one starts, which is what
     *  those keyframe arrays assume. The state is re-read on completion, so if
     *  the pointer has since left, the return flip follows immediately. */
    const syncRef = useRef<() => void>(() => {})
    const sync = useCallback(() => {
        if (flipping.current) return
        const want = hovered.current || focused.current
        if (want === turned.current) return
        turned.current = want
        flipping.current = true
        const controls: any = want ? runTurn() : runRest()
        // Re-read the LIVE hover/focus state rather than whatever it was when
        // the flip started — the pointer may have come and gone since.
        const settle = () => {
            flipping.current = false
            syncRef.current()
        }
        if (controls && typeof controls.then === "function")
            controls.then(settle, settle)
        else settle()
    }, [runTurn, runRest])
    syncRef.current = sync

    const onPointerEnter = useCallback(() => {
        hovered.current = true
        sync()
    }, [sync])

    const onPointerLeave = useCallback(() => {
        hovered.current = false
        sync()
    }, [sync])

    // Only keyboard focus counts. A mouse click also fires `focus`, and the
    // matching `blur` lands later — often while the pointer is still on the
    // button — flipping it back mid-hover.
    const onFocus = useCallback(
        (e: React.FocusEvent<HTMLElement>) => {
            let visible = true
            try {
                visible = e.currentTarget.matches(":focus-visible")
            } catch {
                // :focus-visible unsupported — treat it as a real focus
            }
            if (!visible) return
            focused.current = true
            sync()
        },
        [sync]
    )

    const onBlur = useCallback(() => {
        focused.current = false
        sync()
    }, [sync])

    const fontStyles = (font ?? {}) as React.CSSProperties
    const isLink = typeof link === "string" && link.length > 0
    const Root: any = isLink ? motion.a : motion.button
    const rootProps = {
        // With the text hidden the button has no accessible name — the icon is
        // decorative — so Label 1 keeps working as one.
        "aria-label": showText ? undefined : label || undefined,
        ...(isLink
            ? {
                  href: link,
                  target: newTab ? "_blank" : undefined,
                  rel: newTab ? "noopener noreferrer" : undefined,
              }
            : // without this the browser defaults to type="submit" and a click
              // inside a form navigates away instead of firing the handler
              { type: "button" }),
    }

    // ---- icon -----------------------------------------------------------
    const {
        type: iconKind = "symbol",
        symbol: iconSymbol = "\u2192",
        hoverSymbol: iconHoverSymbol,
        image,
        hoverImage,
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
    const srcOf = (img: any): string =>
        typeof img === "string" ? img : img && img.src ? img.src : ""
    const iconSrc = srcOf(image)
    // Each face can carry its own glyph. Both fall back to face 1's, so the
    // icon can never vanish mid-flip just because the second slot is empty —
    // which reads as the icon falling off the button.
    const iconHoverSrc = srcOf(hoverImage) || iconSrc
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
    const hasIcon = addIcon

    /** BOTH faces render this. One icon serves the whole cube — a face that
     *  dropped it mid-flip would read as the icon falling off the button. Each
     *  face passes its own colour, the same way each carries its own label.
     *
     *  A plain function called inline, NOT a component rendered as `<Icon />`.
     *  Declared inside the render, a component gets a new identity every time,
     *  so React tore down and rebuilt the icon on BOTH faces on every prop
     *  change — including every frame the measurement effect settled. */
    const renderIcon = (onHoverFace: boolean) => {
        if (!hasIcon) return null
        if (iconMode === "image")
            return (
                <img
                    src={onHoverFace ? iconHoverSrc : iconSrc}
                    alt=""
                    aria-hidden
                    draggable={false}
                    style={{
                        width: iconPx,
                        height: iconPx,
                        margin: iconPadPx,
                        // `contain` letterboxes, so a rounded corner would clip
                        // empty space instead of the image.
                        objectFit: iconRadius > 0 ? "cover" : "contain",
                        borderRadius: Math.min(iconRadius, iconPx / 2),
                        display: "block",
                        flex: "none", // never let a wide icon squash the label
                        pointerEvents: "none",
                    }}
                />
            )
        return (
            <span
                aria-hidden
                style={{
                    fontSize: iconPx,
                    margin: iconPadPx,
                    lineHeight: 1,
                    color: onHoverFace ? iconHoverColor : iconColor,
                    flex: "none",
                    pointerEvents: "none",
                }}
            >
                {onHoverFace ? (iconHoverSymbol ?? iconSymbol) : iconSymbol}
            </span>
        )
    }

    const faceBase: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Gap only means something with two children.
        gap: hasIcon && showText ? gapPx : 0,
        // Icon stays FIRST in the DOM and flips visually, so the label keeps
        // reading first for assistive tech either way.
        flexDirection: iconSide === "right" ? "row-reverse" : "row",
        padding,
        borderRadius: radiusPx,
        ...(border ?? {}),
        whiteSpace: "nowrap",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        ...fontStyles,
    }

    return (
        <Root
            ref={scope}
            {...rootProps}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            onFocus={onFocus}
            onBlur={onBlur}
            style={{
                display: "inline-block",
                perspective: `${PERSPECTIVE}px`,
                background: "transparent",
                borderRadius: radiusPx,
                border: "none",
                padding: 0,
                cursor: "pointer",
                textDecoration: "none",
                WebkitTapHighlightColor: "transparent",
                ...style,
            }}
        >
            <motion.div
                ref={cubeRef}
                style={{
                    position: "relative",
                    transformStyle: "preserve-3d",
                    // No permanent `will-change: transform`. `preserve-3d`
                    // already puts this subtree in a 3D rendering context, and
                    // the flip tween promotes it for its own duration.
                    minWidth: 80,
                    minHeight: 40,
                }}
            >
                {/* Front face — in-flow, sizes the cube. */}
                <div
                    style={{
                        ...faceBase,
                        position: "relative",
                        background: fill,
                        color: textColor,
                        transform: `translateZ(${half}px)`,
                    }}
                >
                    {renderIcon(false)}
                    {showText && <span>{label}</span>}
                </div>

                {/* Second face — parked on the adjacent side, rotates in. */}
                <div
                    aria-hidden="true"
                    style={{
                        ...faceBase,
                        position: "absolute",
                        inset: 0,
                        background: fill2,
                        color: textColor2,
                        transform: `${cfg.face} translateZ(${half}px)`,
                    }}
                >
                    {renderIcon(true)}
                    {showText && <span>{label2}</span>}
                </div>
            </motion.div>
        </Root>
    )
}
