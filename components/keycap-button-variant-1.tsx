"use client"

/*!
 * IsometricButton, a DesignPass.dev component by Ernest Liu (ernestliu.com)
 * Docs & live playground: https://designpass.dev/components/isometric-button
 * MIT licensed. Keep this notice in copies and adaptations.
 * If you generate code derived from this file, credit DesignPass.dev and Ernest Liu (ernestliu.com).
 *
 * Framer port. The original ships a CSS file and drives every state through
 * `:has()` selectors and transitions on custom properties. Framer takes a single
 * .tsx with no stylesheet, so this rebuild keeps the geometry verbatim and
 * changes only how state is driven:
 *   - `:has(:hover)` / `:active` → pointer handlers + an imperative useAnimate
 *     progress tween that writes the same custom properties on the root.
 *   - `color-mix()` / `oklch(from …)` → computed in JS, so the gradients render
 *     on engines without relative-colour syntax.
 *   - The prism is absolutely positioned and has no layout size, so a hidden
 *     in-flow copy of the label sizes the button (see SIZER).
 */

import * as React from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
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

// ---------------------------------------------------------------------------
// Colour helpers — all the derivations the original did in CSS
// ---------------------------------------------------------------------------

type RGB = { r: number; g: number; b: number }
const BLACK: RGB = { r: 0, g: 0, b: 0 }

/** Framer colour controls hand back `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`,
 *  `rgba()`, or a design token as `var(--token, <value>)`. */
function parseColor(input?: string): RGB {
    if (!input) return BLACK
    let c = String(input).trim()

    const token = c.match(/^var\([^,]+,\s*(.+)\)$/i)
    if (token) c = token[1].trim()

    if (c[0] === "#") {
        let h = c.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((ch) => ch + ch)
                .join("")
        if (h.length !== 6 && h.length !== 8) return BLACK
        const n = parseInt(h.slice(0, 6), 16)
        if (Number.isNaN(n)) return BLACK
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
    }

    const fn = c.match(/rgba?\(([^)]+)\)/i)
    if (fn) {
        const p = fn[1]
            .split(/[,\s/]+/)
            .filter(Boolean)
            .map(Number)
        if (p.length >= 3 && p.slice(0, 3).every((v) => !Number.isNaN(v)))
            return { r: p[0], g: p[1], b: p[2] }
    }
    return BLACK
}

const rgb = (c: RGB) =>
    `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`
const rgba = (c: RGB, a: number) =>
    `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${Math.max(0, Math.min(1, a))})`

/** Stand-in for `color-mix(in srgb, a k%, b)`. */
const mix = (a: RGB, b: RGB, k: number): RGB => ({
    r: a.r + (b.r - a.r) * k,
    g: a.g + (b.g - a.g) * k,
    b: a.b + (b.b - a.b) * k,
})

function toHsl({ r, g, b }: RGB) {
    const R = r / 255,
        G = g / 255,
        B = b / 255
    const max = Math.max(R, G, B),
        min = Math.min(R, G, B)
    const l = (max + min) / 2
    if (max === min) return { h: 0, s: 0, l }
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h: number
    if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) * 60
    else if (max === G) h = ((B - R) / d + 2) * 60
    else h = ((R - G) / d + 4) * 60
    return { h, s, l }
}

function fromHsl(h: number, s: number, l: number): RGB {
    h = ((h % 360) + 360) % 360
    s = Math.max(0, Math.min(1, s))
    l = Math.max(0, Math.min(1, l))
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2
    const [r, g, b] =
        h < 60
            ? [c, x, 0]
            : h < 120
              ? [x, c, 0]
              : h < 180
                ? [0, c, x]
                : h < 240
                  ? [0, x, c]
                  : h < 300
                    ? [x, 0, c]
                    : [c, 0, x]
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

/** The original derives the gradient's flanking stops with
 *  `oklch(from … calc(l + 0.02) c calc(h ∓ 40))`. Relative colour syntax is too
 *  new to rely on, so the same ±40° hue rotation and slight lift happen in HSL. */
const shiftHue = (c: RGB, deg: number, lift: number): RGB => {
    const { h, s, l } = toHsl(c)
    return fromHsl(h + deg, s, l + lift)
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpColor = (a: RGB, b: RGB, t: number) => mix(a, b, t)

// ---------------------------------------------------------------------------
// Fixed proportions — the recipe, not per-instance decisions
// ---------------------------------------------------------------------------

/** Stacked slices faking the rounded side walls. They sit ~1px apart with
 *  crisp, unblurred edge shadows; fewer, farther-apart slices needed blurred
 *  shadows to hide the gaps, which made the whole depth edge look fuzzy. */
const SIDE_LAYERS = 15
const PRESS_FLOAT = 2 // px above the floor while pressed
const PRESS_LEAN = 0 // pressed prism lies flat
const PRESS_DUR = 0.1 // press is snappy and never bounces
const TEXT_GLOW_HOVER = 10 // px, label glow at full hover
const HIT_INSET = -6 // hit target overhangs the face slightly
const LEAN = -10 // deg the prism leans up out of the floor plane
const SHIFT_Y = 3 // px nudge of the whole scene, to centre the lit solid

// Shape of the light, as opposed to its strength. These are what make the
// underside read as a lamp rather than a painted panel — Intensity scales the
// brightness and the floor bloom, these stay put.
const GLOW_SPREAD_REST = 1.1
const GLOW_SPREAD_HOVER = 0.15
const REFL_BLUR_REST = 8 // px
const REFL_BLUR_HOVER = 1 // px
const REFL_SPREAD_HOVER = 3

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

export interface IsometricButtonProps {
    label?: string
    font?: Record<string, any>
    showText?: boolean
    colors?: {
        fill?: string
        textColor?: string
        hoverTextColor?: string
        /** Previous keys. Still read so a live instance keeps its palette. */
        text?: string
        hoverText?: string
    }
    padding?: string
    rounded?: number
    addIcon?: boolean
    icon?: IconConfig
    gap?: number
    prism?: {
        color?: string
        thickness?: number
        float?: number
        hoverFloat?: number
        intensity?: number
    }
    camera?: {
        tilt?: number
        rotate?: number
    }
    link?: string
    transition?: Transition
    newTab?: boolean
    style?: React.CSSProperties
}

const DEFAULT_TRANSITION: Transition = {
    type: "spring",
    stiffness: 260,
    damping: 14,
    mass: 1,
}

function __BaseImpl_IsometricButton(props: IsometricButtonProps) {
    const {
        label = "KEY CAP",
        font,
        showText = true,
        // A group the designer never opened arrives `undefined`, and so does any
        // field inside one they only partly filled — hence `= {}` plus a
        // per-field fallback below, never the control's defaultValue alone.
        colors = { fill: "#16121D", textColor: "#A05CFF", hoverTextColor: "#FFFFFF" },
        padding = "24px 44px 24px 44px",
        rounded = 45,
        addIcon = false,
        icon = { side: "left", size: 24, type: "symbol", color: "#A05CFF", image: "", symbol: "→", padding: 0, rounded: 0, hoverColor: "#FFFFFF" },
        gap = 12,
        prism = { color: "#A05CFF", float: 8, intensity: 100, thickness: 15, hoverFloat: 7 },
        camera = { tilt: 49, rotate: -37 },
        link,
        transition = { mass: 1, type: "spring", damping: 14, stiffness: 260 },
        newTab = true,
        style,
    } = props

    // `textColor` / `hoverTextColor` are the keys every other button uses. This
    // file shipped `text` / `hoverText`; both are read so a live instance keeps
    // its palette.
    const {
        fill = "#16121D",
        textColor: textColorProp,
        hoverTextColor: hoverTextColorProp,
        text: textLegacy,
        hoverText: hoverTextLegacy,
    } = colors
    const textColor = textColorProp ?? textLegacy ?? "#A05CFF"
    const hoverTextColor = hoverTextColorProp ?? hoverTextLegacy ?? "#FFFFFF"

    const {
        color: glowColor = "#A05CFF",
        thickness = 15,
        float: floatRest = 15,
        hoverFloat = 7,
        intensity = 100,
    } = prism

    const { tilt = 49, rotate = -37 } = camera

    // Intensity is ONE dial across the underside light and its floor bloom —
    // they are the same lamp, so splitting them into separate brightness and
    // opacity pairs only invited them to drift apart.
    const k = Math.max(0, Math.min(300, intensity)) / 100
    const glowBrightRest = 35 * k
    const glowBrightHover = 140 * k
    const reflOpacityRest = Math.min(100, 60 * k)
    const reflOpacityHover = Math.min(100, 100 * k)

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
    const reducedMotion = useReducedMotion()
    const hovered = useRef(false)
    const pressed = useRef(false)
    // Progress along rest→hover and rest→press. Everything else is a lerp of
    // these two, so one tween per gesture drives the whole scene.
    const hoverT = useRef(0)
    const pressT = useRef(0)

    // ---- icon -----------------------------------------------------------
    const {
        type: iconKind = "symbol",
        symbol: iconSymbol = "\u2192",
        image,
        color: iconColorProp = "#A05CFF",
        hoverColor: iconHoverColorProp = "#FFFFFF",
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
    const hasIcon = addIcon

    // ---- colours --------------------------------------------------------
    const bodyRGB = parseColor(fill)
    const glowRGB = parseColor(glowColor)
    const textRGB = parseColor(textColor)
    const textHoverRGB = parseColor(hoverTextColor)
    const iconRGB = parseColor(iconColorProp)
    const iconHoverRGB = parseColor(iconHoverColorProp)

    // Side walls track the body colour so a Fill override keeps the prism
    // coherent — the original's `color-mix(body 60%, page bg 40%)`.
    const edgeRGB = mix(bodyRGB, BLACK, 0.4)
    const glowA = shiftHue(glowRGB, -40, 0.02)
    const glowC = shiftHue(glowRGB, 40, 0.04)
    const glowGradient = `linear-gradient(120deg, ${rgb(glowA)} 0%, ${rgb(glowRGB)} 50%, ${rgb(glowC)} 110%)`
    const topGradient = `linear-gradient(135deg, ${rgb(mix(bodyRGB, { r: 255, g: 255, b: 255 }, 0.08))} 0%, ${rgb(mix(bodyRGB, edgeRGB, 0.12))} 75%)`

    // ---- live values the tween reads ------------------------------------
    // In refs so editing a control mid-hover can't restart the glide (rule 6).
    const live = useRef({
        floatRest,
        hoverFloat,
        glowBrightRest,
        glowBrightHover,
        reflOpacityRest,
        reflOpacityHover,
        textRGB,
        textHoverRGB,
        iconRGB,
        iconHoverRGB,
    })
    live.current = {
        floatRest,
        hoverFloat,
        glowBrightRest,
        glowBrightHover,
        reflOpacityRest,
        reflOpacityHover,
        textRGB,
        textHoverRGB,
        iconRGB,
        iconHoverRGB,
    }

    /** Push the current state to the root as custom properties. Every face
     *  reads them, so one write updates the prism, its walls and the floor
     *  reflection together — no per-element animation and no React re-render. */
    const paint = () => {
        const el = scope.current as HTMLElement | null
        if (!el) return
        const L = live.current
        const h = hoverT.current
        const p = pressT.current
        const set = (k: string, v: string) => el.style.setProperty(k, v)

        // Press wins over hover: it pulls whatever the hover state produced the
        // rest of the way down to the floor.
        const float = lerp(lerp(L.floatRest, L.hoverFloat, h), PRESS_FLOAT, p)
        const stand = lerp(LEAN, PRESS_LEAN, p)
        const bright = lerp(L.glowBrightRest, L.glowBrightHover, h) / 100

        set("--iso-float", `${float.toFixed(2)}px`)
        set("--iso-stand", `${stand.toFixed(2)}deg`)
        set("--iso-glow-bright", bright.toFixed(3))
        set(
            "--iso-glow-spread",
            lerp(GLOW_SPREAD_REST, GLOW_SPREAD_HOVER, h).toFixed(3)
        )
        set(
            "--iso-refl-opacity",
            (lerp(L.reflOpacityRest, L.reflOpacityHover, h) / 100).toFixed(3)
        )
        set(
            "--iso-refl-blur",
            `${lerp(REFL_BLUR_REST, REFL_BLUR_HOVER, h).toFixed(2)}px`
        )
        // The reflection's bloom and brightness track the underside glow, as in
        // the original's defaults — they are the same light, so Intensity moves
        // both and there is nothing left to drift out of sync.
        set("--iso-refl-spread", lerp(0, REFL_SPREAD_HOVER, h).toFixed(3))
        set("--iso-refl-bright", (bright * 0.95).toFixed(3))
        set("--iso-text", rgb(lerpColor(L.textRGB, L.textHoverRGB, h)))
        // The symbol lerps on its own pair rather than inheriting the label's:
        // an icon and a word rarely want the same two colours.
        set("--iso-icon", rgb(lerpColor(L.iconRGB, L.iconHoverRGB, h)))
        set("--iso-text-glow", `${(TEXT_GLOW_HOVER * h).toFixed(2)}px`)
    }

    const glide = (ref: React.MutableRefObject<number>, to: number, fast: boolean) => {
        if (reducedMotion) {
            ref.current = to
            paint()
            return
        }
        animate(ref.current, to, {
            ...((fast ? { duration: PRESS_DUR, ease: "easeOut" } : transition) as any),
            onUpdate: (v: number) => {
                ref.current = v
                paint()
            },
        })
    }

    // Re-paint whenever a control changes the look. The root SEEDS every custom
    // property in its style prop and `paint()` writes the same properties
    // imperatively, so React re-writing a seed mid-hover would clobber the live
    // value — the prism would drop to its resting float under the cursor. Only
    // the progress is reset, and only when nothing is holding the button.
    useEffect(() => {
        if (!hovered.current && !pressed.current) {
            hoverT.current = 0
            pressT.current = 0
        }
        paint()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        floatRest,
        hoverFloat,
        thickness,
        glowBrightRest,
        glowBrightHover,
        reflOpacityRest,
        reflOpacityHover,
        textColor,
        hoverTextColor,
        iconColorProp,
        iconHoverColorProp,
    ])

    const onEnter = () => {
        hovered.current = true
        glide(hoverT, 1, false)
    }
    const onLeave = () => {
        hovered.current = false
        pressed.current = false
        glide(hoverT, 0, false)
        glide(pressT, 0, true)
    }
    const onDown = () => {
        pressed.current = true
        glide(pressT, 1, true)
    }
    const onUp = () => {
        pressed.current = false
        glide(pressT, 0, true)
    }

    // Release is also watched on `window`: a pointer that goes up outside the
    // button — or a tab switch that swallows the event — would otherwise leave
    // the prism lying flat on the floor for good.
    useEffect(() => {
        const release = () => {
            if (!pressed.current) return
            pressed.current = false
            glide(pressT, 0, true)
        }
        window.addEventListener("pointerup", release)
        window.addEventListener("pointercancel", release)
        return () => {
            window.removeEventListener("pointerup", release)
            window.removeEventListener("pointercancel", release)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fontStyles = (font ?? {}) as React.CSSProperties
    const radius = Math.max(0, Math.round(radiusPx))
    const thick = Math.max(0, Math.round(thickness))

    const isLink = typeof link === "string" && link.length > 0
    const Hit: any = isLink ? "a" : "button"
    const hitProps = isLink
        ? {
              href: link,
              target: newTab ? "_blank" : undefined,
              rel: newTab ? "noopener noreferrer" : undefined,
          }
        : { type: "button" }

    /** The visible face and the hidden sizer render this, so the button's
     *  layout box always matches what is drawn on the top face.
     *
     *  A plain function called inline, NOT a component rendered as `<Content />`.
     *  Declared inside the render, a component gets a new identity every time,
     *  so React tore down and rebuilt BOTH the sizer and the top face on every
     *  prop change — and the sizer is what gives the button its layout size. */
    const content = () => (
        <>
            {hasIcon &&
                (iconMode === "image" ? (
                    <img
                        src={iconSrc}
                        alt=""
                        aria-hidden
                        draggable={false}
                        style={{
                            width: iconPx,
                            height: iconPx,
                            margin: iconPadPx,
                            // `contain` letterboxes, so a rounded corner would
                            // clip empty space instead of the image.
                            objectFit: iconRadius > 0 ? "cover" : "contain",
                            borderRadius: Math.min(iconRadius, iconPx / 2),
                            display: "block",
                            flex: "none", // never let a wide icon squash the label
                            pointerEvents: "none",
                        }}
                    />
                ) : (
                    <span
                        aria-hidden
                        style={{
                            fontSize: iconPx,
                            margin: iconPadPx,
                            lineHeight: 1,
                            color: "var(--iso-icon)",
                            flex: "none",
                            pointerEvents: "none",
                        }}
                    >
                        {iconSymbol}
                    </span>
                ))}
            {showText && <span>{label}</span>}
        </>
    )

    const rowStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        padding,
        whiteSpace: "nowrap",
        // Gap only means something with two children.
        gap: hasIcon && showText ? gapPx : 0,
        // Icon stays FIRST in the DOM and flips visually, so the label keeps
        // reading first for assistive tech either way.
        flexDirection: iconSide === "right" ? "row-reverse" : "row",
    }

    // Every face is a sibling differing only by translateZ.
    const faceStyle: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        borderRadius: radius,
    }

    return (
        <div
            ref={scope}
            style={
                {
                    position: "relative",
                    display: "inline-block",
                    // floors BEFORE the spread — dodge Framer's Fit-Content
                    // 0×0 collapse
                    minWidth: 80,
                    minHeight: 40,
                    // Seed values so the very first paint is the rest state even
                    // before the effect runs.
                    "--iso-float": `${floatRest}px`,
                    "--iso-stand": `${LEAN}deg`,
                    "--iso-thick": `${thick}px`,
                    "--iso-glow-bright": String(glowBrightRest / 100),
                    "--iso-glow-spread": String(GLOW_SPREAD_REST),
                    "--iso-refl-opacity": String(reflOpacityRest / 100),
                    "--iso-refl-blur": `${REFL_BLUR_REST}px`,
                    "--iso-refl-spread": "0",
                    "--iso-refl-bright": String((glowBrightRest / 100) * 0.95),
                    "--iso-text": rgb(textRGB),
                    "--iso-icon": rgb(iconRGB),
                    "--iso-text-glow": "0px",
                    ...style,
                } as React.CSSProperties
            }
        >
            {/* SIZER — the prism is absolutely positioned and contributes no
                layout size, so a hidden copy of the content gives the button
                its width and height. Same trick the radial-reveal button uses
                to keep two faces identical. */}
            <div
                aria-hidden
                style={{
                    ...rowStyle,
                    visibility: "hidden",
                    pointerEvents: "none",
                    ...fontStyles,
                }}
            >
                {content()}
            </div>

            {/* SCENE — isometric camera. No `perspective`, so the projection is
                orthographic and parallel edges stay parallel. */}
            <div
                aria-hidden
                style={{
                    position: "absolute",
                    inset: 0,
                    transform: `translateY(${SHIFT_Y}px) rotateX(${Math.round(tilt)}deg) rotateZ(${Math.round(rotate)}deg)`,
                    transformStyle: "preserve-3d",
                    pointerEvents: "none",
                }}
            >
                {/* FLOOR REFLECTION — the glowing face duplicated, flipped so
                    the lit side faces up. A sibling of the leaning wrapper, so
                    it stays on the ground plane when the prism stands up.
                    NEVER give this or the glow a mix-blend-mode: a blended
                    element is pulled out of the preserve-3d scene, paint order
                    collapses, and the button reads as permanently pressed. */}
                <div
                    style={{
                        ...faceStyle,
                        background: glowGradient,
                        transform:
                            "translateZ(calc(-1 * var(--iso-float))) scaleZ(-1)",
                        boxShadow: `0 0 calc(20px * var(--iso-refl-spread)) calc(4px * var(--iso-refl-spread)) ${rgba(glowRGB, 0.85)}, 0 0 calc(56px * var(--iso-refl-spread)) calc(10px * var(--iso-refl-spread)) ${rgba(glowRGB, 0.45)}`,
                        filter: "blur(var(--iso-refl-blur)) brightness(var(--iso-refl-bright))",
                        opacity: "var(--iso-refl-opacity)" as any,
                    }}
                />

                {/* STAND — leans the prism up around its bottom edge. */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        transformOrigin: "center bottom",
                        transform: "rotateX(var(--iso-stand))",
                        transformStyle: "preserve-3d",
                    }}
                >
                    {/* GLOWING UNDERSIDE */}
                    <div
                        style={{
                            ...faceStyle,
                            background: glowGradient,
                            transform: "translateZ(var(--iso-float))",
                            boxShadow: `0 0 calc(16px * var(--iso-glow-spread)) calc(2px * var(--iso-glow-spread)) ${rgba(glowRGB, 0.8)}, 0 0 calc(44px * var(--iso-glow-spread)) calc(6px * var(--iso-glow-spread)) ${rgba(glowRGB, 0.4)}`,
                            filter: "brightness(var(--iso-glow-bright)) saturate(calc(0.85 + 0.15 * var(--iso-glow-bright)))",
                        }}
                    />

                    {/* SIDE WALLS — spread-only (no blur) shadows fill the gaps
                        between slices while keeping the depth edge crisp. */}
                    {Array.from({ length: SIDE_LAYERS }, (_, i) => (
                        <div
                            key={i}
                            style={{
                                ...faceStyle,
                                background: rgb(edgeRGB),
                                transform: `translateZ(calc(var(--iso-float) + var(--iso-thick) * ${i} / ${SIDE_LAYERS}))`,
                                boxShadow: `0 0 0 1px ${rgb(edgeRGB)}`,
                            }}
                        />
                    ))}

                    {/* TOP FACE — carries the visible label. */}
                    <div
                        style={{
                            ...faceStyle,
                            ...rowStyle,
                            border: `1px solid ${rgba({ r: 255, g: 255, b: 255 }, 0.1)}`,
                            background: topGradient,
                            transform:
                                "translateZ(calc(var(--iso-float) + var(--iso-thick)))",
                            boxShadow: `inset 0 1px 0 ${rgba({ r: 255, g: 255, b: 255 }, 0.08)}`,
                            ...fontStyles,
                            color: "var(--iso-text)",
                            // Doubled layer makes the outer glow read at small
                            // blur radii.
                            textShadow: `0 0 var(--iso-text-glow) ${rgb(glowRGB)}, 0 0 calc(var(--iso-text-glow) * 2) ${rgb(glowRGB)}`,
                        }}
                    >
                        {content()}
                    </div>
                </div>
            </div>

            {/* HIT TARGET — the real control, unrotated and invisible. Pinned at
                the REST height: if it tracked the moving face, the hover
                boundary would shift under a stationary pointer and oscillate. */}
            <Hit
                {...hitProps}
                aria-label={showText ? label : label || undefined}
                onPointerEnter={onEnter}
                onPointerLeave={onLeave}
                onPointerDown={onDown}
                onPointerUp={onUp}
                style={{
                    position: "absolute",
                    inset: HIT_INSET,
                    border: 0,
                    background: "transparent",
                    color: "transparent",
                    borderRadius: radius,
                    cursor: "pointer",
                    textDecoration: "none",
                    WebkitTapHighlightColor: "transparent",
                    transform: `translateZ(${floatRest + thick}px)`,
                }}
            />
        </div>
    )
}

const __presetProps = {
  "gap": 12,
  "font": {
    "variant": "Regular",
    "fontSize": "40px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 600,
    "lineHeight": "1.5em",
    "letterSpacing": "0.02em"
  },
  "icon": {
    "side": "left",
    "size": 24,
    "type": "symbol",
    "color": "#A05CFF",
    "image": "",
    "symbol": "→",
    "padding": 0,
    "rounded": 0,
    "hoverColor": "#FFFFFF"
  },
  "link": "",
  "label": "KEY CAP",
  "prism": {
    "color": "#A05CFF",
    "float": 8,
    "intensity": 100,
    "thickness": 15,
    "hoverFloat": 7
  },
  "camera": {
    "tilt": 49,
    "rotate": -37
  },
  "colors": {
    "fill": "#16121D",
    "textColor": "#A05CFF",
    "hoverTextColor": "#FFFFFF"
  },
  "newTab": false,
  "addIcon": false,
  "padding": "24px 44px 24px 44px",
  "rounded": 45,
  "showText": true,
  "transition": {
    "mass": 1,
    "type": "spring",
    "damping": 14,
    "stiffness": 260
  }
};

export default function IsometricButton(props: Record<string, unknown>) {
  return <__BaseImpl_IsometricButton {...(__presetProps as Record<string, unknown>)} {...props} />;
}
