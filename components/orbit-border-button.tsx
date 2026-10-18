"use client"

import * as React from "react"
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react"
import {
    useAnimate,
    useReducedMotion,
    type AnimationPlaybackControls,
    type Transition,
} from "motion/react"

/** The Border value hands back either one fused width or four per-side
 *  widths, plus `borderStyle` / `borderColor`. The band is built from padding,
 *  so each side has to be read on its own: collapsing the four to a single max
 *  made a per-side border silently thicken every side to the widest one. */
type BandWidths = { top: number; right: number; bottom: number; left: number }

/** Hard ceiling on band width. The limit is enforced here — that is the
 *  guarantee. */
const MAX_BAND_WIDTH = 30

const num = (v: any) => {
    const parsed = parseFloat(String(v ?? ""))
    return Number.isFinite(parsed) && parsed > 0
        ? Math.min(parsed, MAX_BAND_WIDTH)
        : 0
}

const bandWidthsOf = (b: any): BandWidths => {
    const fused = num(b?.borderWidth)
    return {
        top: b?.borderTopWidth !== undefined ? num(b.borderTopWidth) : fused,
        right:
            b?.borderRightWidth !== undefined ? num(b.borderRightWidth) : fused,
        bottom:
            b?.borderBottomWidth !== undefined
                ? num(b.borderBottomWidth)
                : fused,
        left: b?.borderLeftWidth !== undefined ? num(b.borderLeftWidth) : fused,
    }
}

const borderColorOf = (b: any): string => b?.borderColor ?? "transparent"

/** The band shape, as a mask rather than a clip: the full rounded box minus the
 *  content box, composited with `exclude`, leaves exactly the padding ring — and
 *  the browser derives the inner corner radii itself, so nothing has to be
 *  re-computed by hand.
 *
 *  This replaces a rounded `overflow: hidden`. The comet is a `filter: blur()`
 *  layer, i.e. composited, and a composited child is the one case where a
 *  rounded overflow clip is not reliable — the failure mode being a
 *  hard-cornered glow rectangle escaping the pill. A mask composites correctly.
 *  It also means the glow is confined by its OWN geometry instead of by the
 *  face painting over it, so a translucent Fill no longer floods the button. */
const BAND_MASK: React.CSSProperties = {
    maskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
    maskClip: "border-box, content-box",
    maskComposite: "exclude",
    WebkitMaskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
    WebkitMaskClip: "border-box, content-box",
    WebkitMaskComposite: "xor",
} as React.CSSProperties

/** Rounded is a percent of the MAXIMUM possible radius — half the short side —
 *  so 100 is a true pill at any button size. A CSS percentage border-radius is
 *  not the same thing: it resolves per axis and gives an ellipse, so a wide
 *  button would bulge instead of forming a stadium. Hence the measured
 *  conversion. */
const radiusFromPercent = (w: number, h: number, pct: number) =>
    (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100)

// Layout must land before the browser paints, otherwise the button renders at a
// square corner for one frame and visibly snaps. useLayoutEffect is client-only;
// fall back on the server to silence the warning.
const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect

/** The button's colours, batched into one group under Font. Top-level `fill` and
 *  `textColor` were the previous shape and are still read as fallbacks, so an
 *  existing instance keeps its values. */
type Colors = {
    fill?: string
    textColor?: string
    hoverFill?: string
    hoverTextColor?: string
}

type BorderValue = {
    borderColor?: string
    borderStyle?: string
    borderWidth?: number
    borderTopWidth?: number
    borderRightWidth?: number
    borderBottomWidth?: number
    borderLeftWidth?: number
}

type IconValue = {
    image?: string | { src?: string; srcSet?: string; alt?: string }
    side?: "left" | "right"
    size?: number
    padding?: number
    rounded?: number
}

type StrokeValue = {
    color?: string
    size?: number
    speed?: number
    direction?: "cw" | "ccw"
    hoverFill?: number
}

type Props = {
    colors?: Colors
    label?: string
    font?: React.CSSProperties
    showText?: boolean
    padding?: string
    rounded?: number
    fill?: string
    textColor?: string
    addIcon?: boolean
    icon?: IconValue
    gap?: number
    border?: BorderValue
    /** The travelling comet. Named `Stroke` like every other button that runs a
     *  light around its border, so one vocabulary covers all of them. */
    stroke?: StrokeValue
    /** Previous key (`Spot`). Still read so a live instance keeps its values. */
    spot?: StrokeValue
    hoverScale?: number
    link?: string
    transition?: Transition
    /** Previous key. Still read so a live instance keeps its timing. */
    hoverTransition?: Transition
    newTab?: boolean
    style?: React.CSSProperties
}

// Degrees per second per unit of the internal speed scale — the same 36°/s unit
// MovingGradientButton and PrismRingButton use. Expressed as a RATE rather than
// "seconds per lap ÷ speed", because the reciprocal form had to floor the
// divisor at 1 and so kept turning at Speed 0.
const DEG_PER_UNIT = 36

/** The press is a 3% dip from whatever the button is currently held at, not a
 *  fixed 0.97. As an absolute it stopped being a press the moment Hover Zoom
 *  went below 97 — at a 50% zoom, pressing GREW the button from 0.5 to 0.97. */
const PRESS = 0.97

// CSS custom property names used to drive the arc without React clobbering it:
// ARC_VAR is where the tail reaches zero, SOLID_VAR where the tail starts.
const ARC_VAR = "--comet-arc"
const SOLID_VAR = "--comet-solid"

/** How much of the arc is painted at FULL colour before the tail begins fading.
 *  It scales with the arc itself (arc × arc/360), so a small idle comet is all
 *  tail exactly as before, while a 100% Hover Fill lands solid == arc == 360deg
 *  and the ring is completely filled — previously 100% still ramped to
 *  transparent by the time it came back round to 12 o'clock, so "full" read as a
 *  fade, not a fill. */
const solidOf = (arcDeg: number) => (arcDeg * arcDeg) / 360

// Glow, fixed. These are the values the old Intensity dial resolved to at its
// default (5); the control is gone, the look is not.
const GLOW_BLUR = 13
const CORE_OPACITY = 0.45

export default function OrbitBorderButton(props: Props) {
    const {
        label = "ORBIT BORDER",
        font = {
            variant: "Regular",
            fontSize: 40,
            textAlign: "left",
            fontFamily: "Inter",
            fontWeight: 500,
            lineHeight: "1.5em",
            letterSpacing: "0em",
        } as React.CSSProperties,
        showText = true,
        padding = "40px 64px 40px 64px",
        rounded = 100,
        fill: fillProp,
        textColor: textColorProp,
        colors = {
            fill: "#000000",
            textColor: "#FFFFFF",
        },
        addIcon = false,
        // A group the designer never opened arrives `undefined`, and so does any
        // field inside one they only partly filled — hence `= {}` plus a
        // per-field fallback below, never the control's defaultValue alone.
        icon = { side: "left", size: 1, image: "", padding: 0, rounded: 0 },
        gap = 8,
        border = {
            borderColor: "rgba(255,255,255,0.2)",
            borderStyle: "solid",
            borderWidth: 1,
        },
        stroke = {
            size: 20,
            color: "#0FFF00",
            speed: 50,
            direction: "ccw",
            hoverFill: 100,
        },
        spot,
        hoverScale = 104,
        link = "",
        transition = {
            type: "tween",
            duration: 0.6,
            delay: 0,
            ease: [0.44, 0, 0.56, 1],
        } as Transition,
        hoverTransition,
        newTab = true,
        style,
    } = props

    // Top-level Fill / Text Color are the previous shape; the Colors group
    // wins, and they remain as fallbacks so an existing instance is untouched.
    const fill = colors?.fill ?? fillProp ?? "#000000"
    const textColor = colors?.textColor ?? textColorProp ?? "#FFFFFF"

    // Same `= {}` + per-field fallback contract as the Icon group above. The
    // group was called `Spot`; an instance saved under that key is read here so
    // the rename never re-binds a live component.
    const {
        color: strokeColor = "#FC731C",
        size: strokeSize = 20,
        speed: speedPct = 50,
        direction = "ccw",
        // hoverFill: how much of the ring (0–100%) fills on hover. 100 = solid.
        hoverFill = 80,
    } = stroke ?? spot ?? {}

    // Speed is a PERCENT of this button's reference rate, so one dial reads the
    // same across every animated button (rule 3: whole numbers). 50% is the
    // rate this button always shipped; 0 stops it.
    const speed =
        3 * (Math.max(0, Math.min(100, Math.round(speedPct))) / 50)

    const Tag: any = link ? "a" : "button"
    const tagProps = {
        // With the text hidden the button has no accessible name — the icon is
        // decorative — so Label keeps working as one.
        "aria-label": showText ? undefined : label || undefined,
        ...(link
            ? {
                  href: link,
                  target: newTab ? "_blank" : undefined,
                  rel: newTab ? "noopener noreferrer" : undefined,
              }
            : { type: "button" }),
    }

    const [scope, animate] = useAnimate()
    const buttonRef = useRef<HTMLElement>(null)
    const bandRef = useRef<HTMLDivElement>(null)
    const faceRef = useRef<HTMLDivElement>(null)
    const cometRef = useRef<HTMLDivElement>(null)
    const arcAnimRef = useRef<{ stop: () => void } | null>(null)
    // Current arc in degrees; updated by the arc animation and read by nothing
    // in the rAF rotation loop — the rAF loop only writes transform.
    const arcDegRef = useRef(0)
    const hovered = useRef(false)
    const reducedMotion = useReducedMotion()

    // Clamped to the control's own 50–150. Unclamped, a stored value from the
    // wider range this used to allow would still be honoured.
    const hoverTo = Math.max(50, Math.min(150, Math.round(hoverScale))) / 100

    // The band's four widths, read once per render and passed around as
    // primitives so effects can depend on numbers instead of the raw object.
    const band = bandWidthsOf(border)
    const bandPadding = `${band.top}px ${band.right}px ${band.bottom}px ${band.left}px`

    /** With every width at 0 the ring machinery has to come off the page, not
     *  merely go zero-wide. `mask-composite: exclude` is XOR: on a straight edge
     *  both mask layers have hard 0/1 coverage and cancel exactly, but on a
     *  ROUNDED corner both are antialiased with the same fractional coverage `a`,
     *  and XOR(a, a) = 2a(1-a) — up to 0.5 alpha. That left a spot-coloured
     *  hairline tracing every curve at border 0, reading as brackets on the caps.
     *  The `borderColor` track behind the face is the same story one fifth as
     *  bright: identical radius, so the face's own AA lets it through on that
     *  curve. Both go transparent together. */
    const hasBand = band.top + band.right + band.bottom + band.left > 0

    // Derived arc sizes in degrees.
    const idleArcDeg = (Math.max(0, Math.min(100, strokeSize)) / 100) * 360
    const fillArcDeg = (Math.max(0, Math.min(100, hoverFill)) / 100) * 360

    const {
        image,
        side: iconSide = "left",
        size: iconSize = 24,
        padding: iconPaddingProp = 0,
        rounded: iconRounded = 0,
    } = icon
    // The image value is a plain URL string in most cases and a
    // `{ src, srcSet }` object in others — accept both rather than
    // rendering `[object Object]` as a broken image.
    const iconSrc =
        typeof image === "string" ? image : image && image.src ? image.src : ""
    const iconPx = Math.max(0, Math.round(iconSize))
    // Icon Padding is applied as a MARGIN, not padding: the image
    // carries its own border-radius, and padding would round the empty
    // box around the picture instead of the picture.
    const iconPadPx = Math.max(0, Math.round(iconPaddingProp))
    // Percent of the maximum radius (half the square icon box): 100 = a
    // circle, 0 = a square corner. Was raw px — the same number now means
    // the same shape at every icon size.
    const iconRadius = radiusFromPercent(iconPx, iconPx, iconRounded)
    const hasIcon = addIcon && !!iconSrc && iconPx > 0

    // Degrees per second, signed by direction. Lives in a ref so changing speed
    // never rebuilds the rAF loop (rule 6). Speed 0 is genuinely 0 — every
    // in-range value matches the old seconds-per-lap curve exactly (speed 3 →
    // 108°/s → 3.3s per lap), it is only 0 that used to keep creeping.
    const degPerSecRef = useRef(0)
    useEffect(() => {
        degPerSecRef.current =
            Math.max(0, speed) * DEG_PER_UNIT * (direction === "cw" ? 1 : -1)
    }, [speed, direction])

    // ---------- CSS variable for arc size ----------------------------------
    // We drive the arc size via --comet-arc so the background string in JSX
    // references it. React never sets CSS custom properties via setProperty,
    // so reconciliation never clobbers imperative arc updates.

    // Initialise --comet-arc and arcDegRef to the idle arc on mount or when
    // strokeSize changes (and we are not mid-hover).
    // `hasBand` is a dep because the comet is a NEW element after the band
    // remounts (width 0 → 1) and a fresh node carries none of the custom
    // properties. It re-applies the LIVE state, not a hard reset to idle, so
    // widening the border mid-hover does not snap the ring back.
    useEffect(() => {
        const target = hovered.current ? fillArcDeg : idleArcDeg
        arcDegRef.current = target
        const el = cometRef.current
        if (el) {
            el.style.setProperty(ARC_VAR, `${target}deg`)
            el.style.setProperty(SOLID_VAR, `${solidOf(target)}deg`)
        }
    }, [idleArcDeg, fillArcDeg, hasBand])

    // ---------- Continuous rotation ----------------------------------------
    // Raw rAF ticks; a framer-motion repeat loop can suspend. The loop ONLY
    // writes transform — nothing else — matching the pattern that the original
    // code used.
    const [side, setSide] = useState(0)
    useEffect(() => {
        const el = buttonRef.current
        if (!el) return
        const measure = () =>
            setSide(
                Math.ceil(
                    Math.hypot(el.offsetWidth, el.offsetHeight) * 1.02
                )
            )
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    // Rounded is a percent of the measured box, so it can only be resolved from
    // the rendered size — same offsetWidth/Height reasoning as above. The face
    // sits inside the band, so its own radius follows the band in, per corner.
    //
    // Deps are the four widths as primitives, never the `border` object: a fresh
    // object every render tore down and rebuilt the ResizeObserver on every
    // single render.
    useIsoLayoutEffect(() => {
        const el = buttonRef.current
        if (!el) return
        const applyRadius = () => {
            const w = el.offsetWidth
            const h = el.offsetHeight
            if (!w || !h) return
            const radius = radiusFromPercent(w, h, rounded)
            el.style.borderRadius = `${radius}px`
            if (bandRef.current)
                bandRef.current.style.borderRadius = `${radius}px`
            if (faceRef.current) {
                // Each corner's inner radius shrinks by the width of the two
                // sides that meet there — horizontally by one, vertically by the
                // other. This is the same rule the browser uses for a real
                // border's inner edge, so the face tracks the band exactly even
                // when the four widths differ.
                const inset = (v: number) => Math.max(0, radius - v)
                const x = [
                    inset(band.left),
                    inset(band.right),
                    inset(band.right),
                    inset(band.left),
                ]
                const y = [
                    inset(band.top),
                    inset(band.top),
                    inset(band.bottom),
                    inset(band.bottom),
                ]
                faceRef.current.style.borderRadius = `${x
                    .map((v) => `${v}px`)
                    .join(" ")} / ${y.map((v) => `${v}px`).join(" ")}`
            }
        }
        applyRadius()
        const ro = new ResizeObserver(applyRadius)
        ro.observe(el)
        return () => ro.disconnect()
    }, [rounded, band.top, band.right, band.bottom, band.left])

    useEffect(() => {
        // Nothing to rotate while the band is unmounted — don't burn a frame
        // callback writing to a null ref.
        if (reducedMotion || !hasBand) return
        let raf = 0
        let last = 0
        let angle = 0
        const tick = (t: number) => {
            if (!last) last = t
            angle = (angle + (degPerSecRef.current * (t - last)) / 1000) % 360
            last = t
            // Only transform — background is driven by the CSS variable.
            const el = cometRef.current
            if (el) el.style.transform = `rotate(${angle}deg)`
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [reducedMotion, hasBand])

    // ---------- Arc-fill animation -----------------------------------------
    // Animates --comet-arc from the current value to targetDeg using a
    // separate rAF loop so it never conflicts with the rotation loop.
    const animateArc = useCallback(
        (targetDeg: number) => {
            arcAnimRef.current?.stop()
            if (reducedMotion) {
                arcDegRef.current = targetDeg
                const el = cometRef.current
                if (el) {
                    el.style.setProperty(ARC_VAR, `${targetDeg}deg`)
                    el.style.setProperty(SOLID_VAR, `${solidOf(targetDeg)}deg`)
                }
                return
            }
            const startDeg = arcDegRef.current
            const duration = 0.45 // seconds
            const startTime = performance.now()
            const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

            let running = true
            let rafId = 0

            const run = () => {
                if (!running) return
                const elapsed = (performance.now() - startTime) / 1000
                const t = Math.min(elapsed / duration, 1)
                arcDegRef.current = startDeg + (targetDeg - startDeg) * easeOut(t)
                const el = cometRef.current
                if (el) {
                    el.style.setProperty(ARC_VAR, `${arcDegRef.current}deg`)
                    el.style.setProperty(
                        SOLID_VAR,
                        `${solidOf(arcDegRef.current)}deg`
                    )
                }
                if (t < 1) {
                    rafId = requestAnimationFrame(run)
                }
            }

            rafId = requestAnimationFrame(run)
            arcAnimRef.current = {
                stop: () => {
                    running = false
                    cancelAnimationFrame(rafId)
                },
            }
        },
        [reducedMotion]
    )

    useEffect(() => () => arcAnimRef.current?.stop(), [])

    /** Scale the button ITSELF, not a wrapper. A transformed ancestor with
     *  `will-change: transform` promotes the whole subtree, so the rounded band
     *  and the blurred comet are rasterized once and then stretched — that is a
     *  visibly soft edge for the whole hover. An element's own transform
     *  re-rasterizes its own clip.
     *
     *  The pointer listeners are NOT on this element, though — see the render.
     *  Hover moves the hit box otherwise, and a Hover Zoom below 100% shrinks it
     *  out from under the pointer: leave fires, the button grows back over the
     *  pointer, enter fires, and it flaps for as long as you hover near an edge. */
    const scaleTo = (s: number) => {
        if (buttonRef.current)
            animate(
                buttonRef.current as HTMLElement,
                { scale: s } as any,
                (transition ?? hoverTransition) as any
            )
    }

    const onEnter = () => {
        hovered.current = true
        scaleTo(hoverTo)
        animateArc(fillArcDeg)
    }

    const onLeave = () => {
        hovered.current = false
        scaleTo(1)
        animateArc(idleArcDeg)
    }

    // Both glow layers share this box: a square the size of the diagonal,
    // centred on the button.
    const ringLayer: React.CSSProperties = {
        position: "absolute",
        top: "50%",
        left: "50%",
        width: side,
        height: side,
        marginTop: -side / 2,
        marginLeft: -side / 2,
        pointerEvents: "none",
    }

    // The background references the CSS variable --comet-arc for the arc size.
    // The fallback (after the comma) ensures correct rendering before the
    // useEffect that initialises the variable has run.
    const arcVar = `var(${ARC_VAR}, ${idleArcDeg}deg)`
    const solidVar = `var(${SOLID_VAR}, ${solidOf(idleArcDeg)}deg)`

    // THE COMET HAS A FRONT. A conic-gradient runs clockwise from 12 o'clock,
    // so a single "bright at 0°, fading to transparent at arc°" ramp puts the
    // hot head on the counter-clockwise side of the arc and streams the tail
    // clockwise behind it. That leads correctly only while the element rotates
    // counter-clockwise; reversed to clockwise, the same shape travels tail-first
    // and the head drags at the back.
    //
    // So the ramp is mirrored with the direction. Both variants peak at 12
    // o'clock and trail the opposite way round, which keeps the head in front of
    // the motion either way and means switching Direction never moves the spot.
    //
    // The head is a SOLID run (0 → solid) and only then does the tail ramp out
    // (solid → arc). At Hover Fill 100 solid == arc == 360deg, both stop pairs
    // collapse onto each other and the whole ring is flat spot colour.
    const cometBackground =
        direction === "cw"
            ? `conic-gradient(from 0deg, rgba(0,0,0,0) 0deg, rgba(0,0,0,0) calc(360deg - ${arcVar}), ${strokeColor} calc(360deg - ${solidVar}), ${strokeColor} 360deg)`
            : `conic-gradient(from 0deg, ${strokeColor} 0deg, ${strokeColor} ${solidVar}, rgba(0,0,0,0) ${arcVar}, rgba(0,0,0,0) 360deg)`

    return (
        // HIT REGION — the pointer listeners live here, on the element that does
        // NOT scale, and it is exactly coincident with the button at rest. Hover
        // is therefore measured against a fixed area: once the pointer is in, it
        // stays in until it really leaves. On the button itself, a Hover Zoom
        // below 100% pulled the hit box out from under a stationary pointer and
        // enter/leave flapped for as long as you hovered near an edge.
        <div
            ref={scope}
            onPointerEnter={onEnter}
            onPointerLeave={onLeave}
            onPointerDown={() => scaleTo((hovered.current ? hoverTo : 1) * PRESS)}
            onPointerUp={() => scaleTo(hovered.current ? hoverTo : 1)}
            style={{
                // HUG, not fill. `width/height: 100%` made the button stretch to
                // whatever column it was dropped into instead of sizing to Label
                // + Padding, which is what every other button in the set does.
                // Floors go BEFORE the spread so an explicit size still wins.
                display: "inline-flex",
                minWidth: 80,
                minHeight: 40,
                position: "relative",
                ...style,
            }}
        >
            <Tag
                {...tagProps}
                ref={buttonRef}
                style={{
                    boxSizing: "border-box",
                    position: "relative",
                    // Sized by its content, but still fills the root if an
                    // instance pins an explicit width/height on it (the root is
                    // `inline-flex`, so `align-items: stretch` covers height).
                    flex: "1 1 auto",
                    padding: bandPadding,
                    border: "none",
                    // Track under the ring — and nothing at all once the ring is
                    // gone, or its colour fringes the caps through the face's AA.
                    background: hasBand ? borderColorOf(border) : "transparent",
                    // borderRadius is set imperatively above — it is a percent
                    // of the measured box. Declaring it here too would let
                    // React clobber the measured value on any re-render.
                    cursor: "pointer",
                    userSelect: "none",
                    textDecoration: "none",
                    // No `overflow: hidden`. The glow is bounded by BAND_MASK on
                    // its own container, which is both more reliable for a
                    // composited child and one less rounded curve to antialias.
                }}
            >
                {/* BAND — the ring the comet rides, cut by mask rather than by
                    a rounded clip. Its padding is the four border widths, so
                    the mask's inner edge is the face's outer edge exactly. Not
                    rendered at all at zero width: see `hasBand`. Every
                    imperative writer (rotation loop, arc loop, radius effect)
                    already null-checks its ref, so unmounting it is safe. */}
                {hasBand && (
                    <div
                        ref={bandRef}
                        aria-hidden
                        style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 0,
                            boxSizing: "border-box",
                            padding: bandPadding,
                            pointerEvents: "none",
                            ...BAND_MASK,
                        }}
                    >
                        {/* Travelling comet — rotates via transform (rAF loop).
                            Arc size is driven by --comet-arc (arc animation
                            loop). React only owns transform-unrelated style
                            changes here, which keeps reconciliation from
                            clobbering either imperative update. The blurred halo
                            and the sharp core are one element with a filtered
                            clone behind it, so a single transform write drives
                            both. */}
                        <div
                            ref={cometRef}
                            style={{
                                ...ringLayer,
                                transformOrigin: "center",
                            }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: cometBackground,
                                    filter: `blur(${GLOW_BLUR}px)`,
                                }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: cometBackground,
                                    opacity: CORE_OPACITY,
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* FACE — the button's own surface. It no longer doubles as the
                    glow's mask (BAND_MASK does that), so a translucent Fill is
                    now a legitimate choice instead of something that lets the
                    comet flood the whole button. */}
                <div
                    ref={faceRef}
                    style={{
                        position: "relative",
                        zIndex: 1,
                        // Without this the padding is ADDED to the 100%, so the
                        // face overflows right and bottom: the label gets
                        // clipped and the glow band survives only on the top and
                        // left edges.
                        boxSizing: "border-box",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        // Gap only means something with two children.
                        gap: hasIcon && showText ? gap : 0,
                        // Icon stays FIRST in the DOM and flips visually, so the
                        // label keeps reading first for assistive tech.
                        flexDirection:
                            iconSide === "right" ? "row-reverse" : "row",
                        padding,
                        whiteSpace: "nowrap",
                        // Keeps an over-long label inside the pill. It lives on
                        // the face, not the button, because the face contains no
                        // composited layer — a rounded clip is trustworthy here,
                        // and it is not a second curve on the outer edge.
                        overflow: "hidden",
                        background: fill,
                        color: textColor,
                        // radius set imperatively above, as on the button
                        ...font,
                    }}
                >
                    {/* Decorative: the label already names the button, so an alt
                        here would be read out twice. */}
                    {hasIcon && (
                        <img
                            src={iconSrc}
                            alt=""
                            aria-hidden
                            draggable={false}
                            style={{
                                width: iconPx,
                                height: iconPx,
                                margin: iconPadPx,
                                // `contain` letterboxes, so a rounded corner
                                // would clip empty space instead of the image.
                                // `cover` once a radius is asked for.
                                objectFit:
                                    iconRadius > 0 ? "cover" : "contain",
                                borderRadius: Math.min(iconRadius, iconPx / 2),
                                display: "block",
                                flex: "none", // never let a wide icon squash the label
                                pointerEvents: "none",
                            }}
                        />
                    )}
                    {showText && <span>{label}</span>}
                </div>
            </Tag>
        </div>
    )
}
