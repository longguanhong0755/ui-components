"use client"

import * as React from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

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

type StrokeType = "solid" | "gradient"

/** The button's colours, batched into one modal under Font. Top-level `fill` and
 *  `textColor` were the previous shape and are still read as fallbacks, so an
 *  existing instance keeps its values. */
export type Colors = {
    fill?: string
    textColor?: string
    hoverFill?: string
    hoverTextColor?: string
}

export interface Props {
    colors?: Colors
    label?: string
    font?: React.CSSProperties
    showText?: boolean
    padding?: string
    rounded?: number
    fill?: string
    textColor?: string
    addIcon?: boolean
    icon?: {
        image?: string | { src?: string; srcSet?: string; alt?: string }
        side?: "left" | "right"
        size?: number
        padding?: number
        rounded?: number
    }
    gap?: number
    stroke?: {
        width?: number
        type?: StrokeType
        color?: string
        colorA?: string
        colorB?: string
        angle?: number
    }
    light?: {
        color?: string
        size?: number
        intensity?: number
        smoothness?: number
    }
    link?: string
    newTab?: boolean
    style?: React.CSSProperties
}

/** Fixed material constants. These used to be property controls (Blur, Tint
 *  Opacity, Stroke Brightness, Light Angle); they are the glass RECIPE, not
 *  per-instance decisions, so they live here instead of in the panel. */
const BLUR = 20 // backdrop blur of the face, px
const TINT = 0.16 // how much of Fill lands on the glass
// The stroke samples the page SHARP — no blur term at all. It used to blur 3px,
// which was harmless while the band overlapped the face, but the band now grows
// outward and the face is painted below it (face z-index 1, band z-index 3), so
// the face is part of the band's backdrop: a 3px blur smeared the lit face out
// into the band's inner edge as a static bright rim, +15 lum against a flat
// 102 band. Measured flat the moment either the blur or the face is removed.
const STROKE_BRIGHTNESS = 140 // %, the edge is still brighter than the face
const LIGHT_FADE = 0.6 // the core gradient reaches zero at 60% of the light radius
const AIM_BLEND = 0.18 // softmin length for the stroke aim, as a share of the short side
/** Gaussian-ish falloff for the light source, as `[stop, alpha multiplier]`.
 *  A two-stop radial-gradient has a visible hard shoulder; this many stops
 *  reads like a blurred bulb without needing a `filter`. */
const LIGHT_FALLOFF: Array<[number, number]> = [
    [0, 1],
    [0.08, 0.95],
    [0.18, 0.85],
    [0.3, 0.7],
    [0.42, 0.54],
    [0.55, 0.38],
    [0.68, 0.24],
    [0.8, 0.13],
    [0.9, 0.06],
    [0.96, 0.02],
    [1, 0],
]

/** Light Size is a percent of the button's long side. Kept in one place because
 *  two things must agree on it: the source's own radius, and the arc width the
 *  stroke derives from that radius. */
const lightRadius = (w: number, h: number, pct: number) =>
    Math.max(w, h) * (Math.max(0, Math.min(100, pct)) / 100)

/** Does this browser actually blur the backdrop? Nothing else is probed: the
 *  filter chain is plain `blur() saturate() brightness()`, which every engine
 *  that supports backdrop-filter at all supports in full.
 *
 *  This used to also apply an SVG `url(#…)` refraction filter, and THAT is what
 *  broke the blur: one unsupported function invalidates the whole
 *  backdrop-filter declaration, so a browser that choked on `url()` lost the
 *  blur with it and the button rendered as a flat tinted plate. */
function supportsBackdrop(): boolean {
    if (
        typeof window === "undefined" ||
        typeof CSS === "undefined" ||
        !CSS.supports
    )
        return true // optimistic: assume glass, re-checked on the client
    return (
        CSS.supports("backdrop-filter", "blur(2px)") ||
        CSS.supports("-webkit-backdrop-filter", "blur(2px)")
    )
}

type RGBA = { r: number; g: number; b: number; a: number }
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 }

/** Colour values arrive as `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`,
 *  `rgba()`, or a design token as `var(--token, <value>)`. */
function parseColor(input?: string): RGBA {
    if (!input) return WHITE
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
        if (h.length !== 6 && h.length !== 8) return WHITE
        const n = parseInt(h, 16)
        if (Number.isNaN(n)) return WHITE
        return h.length === 6
            ? { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
            : {
                  r: (n >>> 24) & 255,
                  g: (n >>> 16) & 255,
                  b: (n >>> 8) & 255,
                  a: (n & 255) / 255,
              }
    }

    const fn = c.match(/rgba?\(([^)]+)\)/i)
    if (fn) {
        const p = fn[1]
            .split(/[,\s/]+/)
            .filter(Boolean)
            .map(Number)
        if (p.length >= 3 && p.slice(0, 3).every((v) => !Number.isNaN(v)))
            return {
                r: p[0],
                g: p[1],
                b: p[2],
                a: p.length > 3 && !Number.isNaN(p[3]) ? p[3] : 1,
            }
    }
    return WHITE
}

const rgba = (c: RGBA, a: number) =>
    `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${Math.max(0, Math.min(1, a))})`

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** The ring itself: one box masked so only its padding band paints. Two mask
 *  layers — the full border box minus the content box — composited with
 *  `exclude`, which leaves exactly a rounded band of the stroke width.
 *
 *  This matters beyond shape: the mask also clips the ring's OWN
 *  backdrop-filter, so the stroke can sample the page with a different filter
 *  than the face (sharper, brighter) without touching the face or the label.
 *  Nesting a padded wrapper instead would make the face sample the wrapper's
 *  already filtered output — double-filtered and blown out. */
const RING_MASK: React.CSSProperties = {
    maskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
    maskClip: "border-box, content-box",
    maskComposite: "exclude",
    WebkitMaskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
    WebkitMaskClip: "border-box, content-box",
    WebkitMaskComposite: "xor",
} as React.CSSProperties

function __BaseImpl_LiquidGlassButton(props: Props) {
    const {
        label = "GLASS BUTTON",
        font = { fontFamily: "Inter", fontWeight: 500, fontSize: 40 },
        showText = true,
        padding = "40px 64px 40px 64px",
        rounded = 38,
        fill: fillProp,
        textColor: textColorProp,
        colors,
        addIcon = false,
        // A group the designer never opened arrives `undefined`, and so does any
        // field inside one they only partly filled — hence `= {}` plus a
        // per-field fallback below, never the group default alone.
        icon = { side: "left", size: 24, image: "", padding: 0, rounded: 0 },
        gap = 12,
        stroke = {
            type: "gradient",
            angle: 180,
            color: "rgba(255, 255, 255, 0.45)",
            width: 6,
            colorA: "rgba(255, 255, 255, 0.55)",
            colorB: "rgba(255, 255, 255, 0.25)",
        },
        light = {
            size: 40,
            color: "rgba(255, 255, 255, 0.45)",
            intensity: 100,
            smoothness: 65,
        },
        link = "",
        newTab = true,
        style,
    } = props

    // Top-level Fill / Text Color are the previous shape; the Colors group
    // wins, and they remain as fallbacks so an existing instance is untouched.
    const fill = colors?.fill ?? fillProp ?? "#FFFFFF"
    const textColor = colors?.textColor ?? textColorProp ?? "#FFFFFF"

    // Same `= {}` + per-field fallback contract as the Icon group above.
    const {
        width: strokeWidth = 6,
        type: strokeType = "gradient",
        color: strokeColor = "rgba(255, 255, 255, 0.45)",
        colorA: strokeColorA = "rgba(255, 255, 255, 0.55)",
        colorB: strokeColorB = "rgba(255, 255, 255, 0.25)",
        angle: strokeAngle = 180,
    } = stroke

    const {
        color: lightColor = "rgba(255, 255, 255, 0.45)",
        size: lightSize = 40,
        intensity: lightIntensity = 100,
        smoothness = 65,
    } = light

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

    // Plain ref: nothing in this button is animated by an animation library —
    // the light is a per-frame rAF glide writing CSS vars, and the press scale
    // is gone.
    const scope = useRef<HTMLDivElement>(null)

    // Rounded is a percent, so the px radius can only come from the measured
    // box. offsetWidth/Height, NOT getBoundingClientRect: a design-tool canvas
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
    const glassRef = useRef<HTMLElement>(null)
    const lightRef = useRef<HTMLSpanElement>(null)
    const strokeRef = useRef<HTMLSpanElement>(null)

    // Assume glass, then confirm on the client. A one-shot `useState(probe)`
    // would run on the SERVER for a published site and pin the result forever.
    const [glassy, setGlassy] = useState(true)
    useEffect(() => setGlassy(supportsBackdrop()), [])

    // ---- light state ----------------------------------------------------
    // The pointer sets a TARGET; a rAF loop eases the actual light toward it,
    // so Smoothness controls the lag of both the internal source and the
    // stroke. Live control values are read from refs inside the loop — putting
    // them in the loop's deps would restart it mid-glide on every prop tweak.
    const tgt = useRef({ x: 0.5, y: 0.5, on: 0 })
    const cur = useRef({ x: 0.5, y: 0.5, on: 0 })
    const raf = useRef<number | null>(null)
    const last = useRef(0)
    const live = useRef({ smoothness, lightIntensity, lightSize })
    live.current = { smoothness, lightIntensity, lightSize }
    const box = useRef({ w: 0, h: 0 })

    useEffect(() => {
        const stop = () => {
            if (raf.current != null) cancelAnimationFrame(raf.current)
            raf.current = null
        }
        return stop
    }, [])

    // The source radius scales with the button, and `radial-gradient(circle …)`
    // only accepts a length — a percentage there is invalid, and an ellipse with
    // percentage radii would stretch with the button instead of staying round.
    // So measure the box and publish the radius as a px var. The measurement is
    // also what lets the stroke size its arc against the internal source below.
    useEffect(() => {
        const el = glassRef.current
        const root = scope.current as HTMLElement | null
        if (!el || !root) return
        const write = () => {
            const r = el.getBoundingClientRect()
            box.current = { w: r.width, h: r.height }
            const R = lightRadius(r.width, r.height, live.current.lightSize)
            root.style.setProperty("--lr", `${R.toFixed(1)}px`)
        }
        write()
        if (typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver(write)
        ro.observe(el)
        return () => ro.disconnect()
        // Re-runs on Light Size so the radius follows the prop, not just resizes.
    }, [lightSize])

    /** Push the eased state to the DOM. One var write for the internal source,
     *  one angle + opacity for the stroke. No React state — a per-frame
     *  setState would re-render the whole tree 60×/s. */
    const paint = () => {
        const root = scope.current as HTMLElement | null
        const c = cur.current
        if (root) {
            root.style.setProperty("--mx", `${(c.x * 100).toFixed(2)}%`)
            root.style.setProperty("--my", `${(c.y * 100).toFixed(2)}%`)
        }
        const amt = Math.max(0, Math.min(100, live.current.lightIntensity)) / 100
        if (lightRef.current)
            lightRef.current.style.opacity = (c.on * amt).toFixed(3)

        // STROKE LIGHT — the edge catches the light as it travels OUT toward
        // it. `d` is how far the light has left the centre in the axis that
        // reaches its edge first (1 at any border), squared so the middle of the
        // button stays clean and the flare builds near the edge.
        const el = strokeRef.current
        if (el) {
            const w = box.current.w
            const h = box.current.h
            // `d` stays in NORMALIZED space on purpose: it asks "how far to the
            // edge", and each axis is measured against its own half-extent.
            const d = clamp01(
                Math.max(Math.abs(c.x - 0.5), Math.abs(c.y - 0.5)) * 2
            )

            // AIM — at the point on the border NEAREST the light, in PIXELS.
            // This used to be `atan2` of the NORMALIZED offset from centre,
            // which is only correct on a square: on a 400×128 button the
            // vertical component is stretched 3× before the angle is taken, so
            // a light near the top-left corner threw its flare tens of degrees
            // away, onto a stretch of edge it was nowhere near.
            //
            // Picking the single nearest side outright is geometrically right
            // but not continuous: on the medial axis two sides tie, and the aim
            // snaps ~25° the instant the pointer crosses it — while the flare
            // is still at ~45% opacity, so the snap is visible. So blend the
            // four side projections by a softmin of their distances instead.
            // The nearest side dominates, ties average, and the aim never
            // jumps. The blended point can sit inside the box; only its
            // DIRECTION from the centre is used.
            let ang = 0
            let half = 30
            if (w > 0 && h > 0) {
                const px = c.x * w
                const py = c.y * h
                const s = Math.max(1, Math.min(w, h) * AIM_BLEND)
                const sides: Array<[number, number, number]> = [
                    [px, 0, py], // left
                    [w - px, w, py], // right
                    [py, px, 0], // top
                    [h - py, px, h], // bottom
                ]
                const near = Math.min(...sides.map((v) => v[0]))
                let wt = 0
                let ax = 0
                let ay = 0
                for (const [dist, sx, sy] of sides) {
                    // subtract `near` first — exp() of a raw pixel distance
                    // underflows to 0 for every side on a large button and the
                    // aim collapses to NaN.
                    const k = Math.exp(-(dist - near) / s)
                    wt += k
                    ax += k * sx
                    ay += k * sy
                }
                const ex = ax / wt - w / 2
                const ey = ay / wt - h / 2
                // atan2 is 0 at 3 o'clock; conic-gradient starts at 12 and runs
                // clockwise, hence +90.
                ang = (Math.atan2(ey, ex) * 180) / Math.PI + 90

                // ARC WIDTH — a fixed angular spread would make the flare cover
                // far more of the edge than the source covers of the face: the
                // conic is anchored at the centre, so one angle sweeps a much
                // longer arc across a wide button's short ends. Derive it from
                // the source's footprint instead. `L` is now the exact distance
                // from the centre to the aimed point, so a spot of visible
                // radius `reach` sitting there subtends `atan(reach / L)`.
                const L = Math.max(1, Math.hypot(ex, ey))
                const reach =
                    lightRadius(w, h, live.current.lightSize) * LIGHT_FADE
                half = (Math.atan(reach / L) * 180) / Math.PI
            }

            el.style.setProperty("--la", ang.toFixed(1))
            el.style.setProperty(
                "--lw",
                Math.max(3, Math.min(70, half)).toFixed(1)
            )
            el.style.opacity = clamp01(c.on * d * d * amt).toFixed(3)
        }
    }

    const tick = (t: number) => {
        const c = cur.current
        const g = tgt.current
        // Frame-rate independent easing: a fixed per-frame lerp would move
        // twice as fast on a 120Hz display.
        const dt = last.current
            ? Math.min(0.05, (t - last.current) / 1000)
            : 1 / 60
        last.current = t
        const s = Math.max(0, Math.min(100, live.current.smoothness)) / 100
        const per = 0.5 - s * 0.46 // 0% → snappy, 100% → syrup
        const k = 1 - Math.pow(1 - per, dt * 60)

        c.x += (g.x - c.x) * k
        c.y += (g.y - c.y) * k
        c.on += (g.on - c.on) * k
        paint()

        const settled =
            Math.abs(g.x - c.x) < 0.001 &&
            Math.abs(g.y - c.y) < 0.001 &&
            Math.abs(g.on - c.on) < 0.002
        if (settled && g.on === 0) {
            // Snap to exactly off, otherwise a residual 0.0019 opacity keeps a
            // faint permanent glow on an unhovered button.
            c.x = g.x
            c.y = g.y
            c.on = 0
            paint()
            raf.current = null
            last.current = 0
            return
        }
        raf.current = requestAnimationFrame(tick)
    }

    const kick = () => {
        if (raf.current == null) {
            last.current = 0
            raf.current = requestAnimationFrame(tick)
        }
    }

    /** Aim the light at the pointer. Called on enter, move AND leave — on leave
     *  it parks the target at the exit point, so the stroke flares on the edge
     *  the cursor actually left through while everything fades out. */
    const trackPointer = (e: React.PointerEvent) => {
        const el = glassRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        if (!r.width || !r.height) return
        tgt.current.x = (e.clientX - r.left) / r.width
        tgt.current.y = (e.clientY - r.top) / r.height
        kick()
    }

    const onEnter = (e: React.PointerEvent) => {
        // Seed the position BEFORE the fade-in, so the light doesn't sweep in
        // from wherever the last hover ended.
        const el = glassRef.current
        if (el) {
            const r = el.getBoundingClientRect()
            if (r.width && r.height) {
                const x = (e.clientX - r.left) / r.width
                const y = (e.clientY - r.top) / r.height
                tgt.current.x = x
                tgt.current.y = y
                if (cur.current.on === 0) {
                    cur.current.x = x
                    cur.current.y = y
                }
            }
        }
        tgt.current.on = 1
        kick()
    }

    const onLeave = (e: React.PointerEvent) => {
        trackPointer(e)
        tgt.current.on = 0
        kick()
    }

    // Saturation + brightness lift is what separates "glass" from "grey blur":
    // the material intensifies the colour it samples rather than muting it.
    const backdrop = glassy
        ? `blur(${BLUR}px) saturate(180%) brightness(108%)`
        : "none"

    const glassRGB = parseColor(fill)
    // The colour is a TINT, never a plate: its own alpha is ignored and TINT
    // decides how much of it lands on the glass. Picking an opaque hex
    // therefore can't turn the button into a solid button.
    const glassBackground = glassy
        ? rgba(glassRGB, TINT)
        : // no backdrop-filter here, so the tint must carry the contrast alone
          rgba(glassRGB, 0.62)

    const lightRGB = parseColor(lightColor)

    // ---- light source ---------------------------------------------------
    // Two coincident gradients, not one: a hot core plus a wide dim spill. A
    // single gradient reads as a flat disc; core + spill reads as a bulb with
    // falloff, which is what "a light INSIDE the glass" needs.
    //
    // The softness is baked into the STOPS rather than applied as
    // `filter: blur()`. A filtered child is composited, and a composited child
    // is the one thing an ancestor's rounded `overflow: hidden` stops clipping
    // reliably — that is what leaked a hard-cornered glow rectangle outside the
    // pill. A gradient painting inside its own border-radius cannot leak.
    const lightClear = rgba(lightRGB, 0)
    const softStops = (peak: number) =>
        LIGHT_FALLOFF.map(
            ([at, k]) => `${rgba(lightRGB, peak * k)} ${Math.round(at * 100)}%`
        ).join(", ")
    const lightGradient = [
        `radial-gradient(circle var(--lr, 0px) at var(--mx) var(--my), ${softStops(lightRGB.a)})`,
        `radial-gradient(circle calc(var(--lr, 0px) * 1.9) at var(--mx) var(--my), ${softStops(lightRGB.a * 0.34)})`,
    ].join(", ")

    // ---- stroke ----------------------------------------------------------
    const strokePx = Math.max(0, Math.round(strokeWidth))
    const strokeBackdrop = glassy
        ? `saturate(220%) brightness(${STROKE_BRIGHTNESS}%)`
        : "none"

    // Resting edge. All the directional interest comes from the moving light,
    // so the static layer is whatever flat colour or ramp the designer sets.
    const strokeBase =
        strokeType === "solid"
            ? strokeColor
            : `linear-gradient(${Math.round(strokeAngle)}deg, ${strokeColorA}, ${strokeColorB})`

    // The travelling hotspot: ±`--lw` around `--la`, both written per frame. The
    // gradient starts one half-width BEHIND the light so the peak lands on the
    // light's own angle and the whole arc lives in the first 2·lw degrees — no
    // wrap across 0/360 to keep in sync.
    //
    // Built at FULL alpha even when Light is translucent: the layer's opacity is
    // already driven per-frame by the light's intensity, and baking the colour's
    // alpha in too would dim it twice and flatten the flare into nothing.
    const lightOpaque = rgba(lightRGB, 1)
    const strokeLightGradient = `conic-gradient(from calc((var(--la, 0) - var(--lw, 30)) * 1deg), ${lightClear} 0deg, ${lightOpaque} calc(var(--lw, 30) * 1deg), ${lightClear} calc(var(--lw, 30) * 2deg))`

    // No inset bevel on the face. It used to be hidden under the stroke, which
    // overlapped the face's outer band; now that the stroke grows OUTWARD the
    // bevel is the first thing inside the band, and it painted a dark hairline
    // along the bottom edge (measured lum 34 against a 41 face) and a bright one
    // along the top (127 against 41) — read as a shadow between the button and
    // its stroke. The stroke's own light-to-dark gradient already does the
    // bevel's job, from the outside.

    // ---- icon -----------------------------------------------------------
    const {
        image,
        side: iconSide = "left",
        size: iconSize = 24,
        padding: iconPaddingProp = 0,
        rounded: iconRounded = 0,
    } = icon
    // The image prop is a plain URL string in most cases and a
    // `{ src, srcSet }` object in others — accept both rather than
    // rendering `[object Object]` as a broken image.
    const iconSrc =
        typeof image === "string" ? image : image && image.src ? image.src : ""
    const iconPx = Math.max(0, Math.round(iconSize))
    // Icon Padding is applied as a MARGIN, not padding: the image
    // carries its own border-radius, and padding would round the empty
    // box around the picture instead of the picture.
    const iconPadPx = Math.max(0, Math.round(iconPaddingProp))
    const gapPx = Math.max(0, Math.round(gap))
    // Percent of the maximum radius (half the square icon box): 100 = a
    // circle, 0 = a square corner. Was raw px — the same number now means
    // the same shape at every icon size.
    const iconRadius = radiusFromPercent(iconPx, iconPx, iconRounded)
    // Decorative: the label already names the button, so an alt here would make
    // a screen reader read the same thing twice.
    const iconEl =
        addIcon && iconSrc && iconPx > 0 ? (
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
                    // space instead of the image. Switch to `cover` once a radius
                    // is asked for, which is the only way the crop reads as the
                    // rounded chip/avatar the control implies.
                    objectFit: iconRadius > 0 ? "cover" : "contain",
                    borderRadius: Math.min(iconRadius, iconPx / 2),
                    display: "block",
                    flex: "none", // never let a wide icon squash the label
                    pointerEvents: "none",
                }}
            />
        ) : null

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
                // NO `overflow: hidden` here. The stroke grows OUTWARD from the
                // face, so a clip on this box would shave exactly the band it is
                // supposed to add. Containment is per-layer instead and holds
                // without it: the internal light lives inside the face, which
                // keeps its own rounded `overflow: hidden`, and both stroke
                // layers are mask-bounded rings that cannot paint past their own
                // geometry.
                borderRadius: radiusPx,
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                // pointer-follow light origin, centered until first move. Lives
                // here so every layer below inherits it.
                ["--mx" as any]: "50%",
                ["--my" as any]: "50%",
                ...style,
            }}
        >
            <Tag
                {...tagProps}
                ref={glassRef}
                onPointerMove={trackPointer}
                onPointerEnter={onEnter}
                onPointerLeave={onLeave}
                style={{
                    boxSizing: "border-box",
                    // Sized by its content, but still fills the root if an
                    // instance pins an explicit width/height on it (the root is
                    // `inline-flex`, so `align-items: stretch` covers height).
                    flex: "1 1 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding,
                    border: "none",
                    borderRadius: radiusPx,
                    cursor: "pointer",
                    position: "relative",
                    zIndex: 1,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    textDecoration: "none",
                    color: textColor,
                    background: glassBackground,
                    backdropFilter: backdrop,
                    WebkitBackdropFilter: backdrop,
                    // No `will-change: transform` here. It permanently promotes
                    // the face to its own compositing layer, and a promoted
                    // element's `backdrop-filter` is the case where Chromium
                    // clips to the border box RECTANGLE instead of the border
                    // radius — a square tinted plate around a rounded button.
                    // Nothing transforms this element at all now, so there is
                    // nothing to hint at either.
                }}
            >
                {/* INTERNAL LIGHT — a CHILD of the glass, painted under the
                    label. It used to be a sibling BENEATH the face, on the
                    theory that the face's own backdrop-filter would then sample
                    and diffuse it. Chromium does exactly that, but it is not
                    something every engine reproduces: the source went missing
                    and only the stroke stayed lit.

                    `inset: 0` covers the whole button, padding included: the
                    containing block is the face's PADDING box, and with
                    `border: none` that is the border box. Its OWN border-radius
                    is what keeps the glow off the corners — relying on the
                    face's `overflow: hidden` alone is what put a hard-cornered
                    rectangle around a fully radiusPx button. */}
                <span
                    ref={lightRef}
                    aria-hidden
                    style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 0,
                        opacity: 0,
                        pointerEvents: "none",
                        borderRadius: radiusPx,
                        background: lightGradient,
                        mixBlendMode: "screen",
                    }}
                />
                <span
                    style={{
                        position: "relative",
                        zIndex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        // Gap only means something with two children.
                        gap: iconEl && showText ? gapPx : 0,
                        // Icon stays FIRST in the DOM and flips visually, so the
                        // label keeps reading first for assistive tech either way.
                        flexDirection:
                            iconSide === "right" ? "row-reverse" : "row",
                    }}
                >
                    {iconEl}
                    {showText && <span style={{ ...font }}>{label}</span>}
                </span>
            </Tag>

            {/* GLASS STROKE — the edge, built rather than stroked. A sibling
                above the face so it owns the outer boundary; masked to a band of
                Stroke Width (see RING_MASK) and carrying its own
                backdrop-filter.

                It grows OUTWARD: `inset: -strokePx` pushes the border box one
                width past the face on every side, and the radius grows by the
                same width so the outer curve stays concentric. The mask's
                content box then lands exactly on the face's own box — CSS
                shrinks a content-box corner by the padding, so `radiusPx +
                strokePx - strokePx` = `radiusPx`, and the inner edge of the band
                is tangent to the face with no seam. The face's own size is
                untouched, so the label never reflows when Width changes. */}
            {strokePx > 0 && (
                <span
                    aria-hidden
                    style={{
                        position: "absolute",
                        inset: -strokePx,
                        borderRadius: radiusPx + strokePx,
                        padding: strokePx,
                        background: strokeBase,
                        backdropFilter: strokeBackdrop,
                        WebkitBackdropFilter: strokeBackdrop,
                        pointerEvents: "none",
                        zIndex: 3,
                        ...RING_MASK,
                    }}
                />
            )}

            {/* STROKE LIGHT — same band, additive hotspot aimed at the light.
                Separate layer from the base so its opacity can be driven
                per-frame without rebuilding the base gradient. */}
            {strokePx > 0 && (
                <span
                    ref={strokeRef}
                    aria-hidden
                    style={{
                        position: "absolute",
                        inset: -strokePx,
                        borderRadius: radiusPx + strokePx,
                        padding: strokePx,
                        background: strokeLightGradient,
                        opacity: 0,
                        mixBlendMode: "screen",
                        pointerEvents: "none",
                        zIndex: 4,
                        ["--la" as any]: "0",
                        ["--lw" as any]: "30",
                        ...RING_MASK,
                    }}
                />
            )}
        </div>
    )
}

const __presetProps = {
  "showText": true,
  "label": "GLASS BUTTON",
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
    "fill": "#FFFFFF",
    "textColor": "#FFFFFF"
  },
  "addIcon": false,
  "icon": {
    "side": "left",
    "size": 24,
    "image": "",
    "padding": 0,
    "rounded": 0
  },
  "gap": 12,
  "rounded": 38,
  "padding": "40px 64px 40px 64px",
  "stroke": {
    "type": "gradient",
    "angle": 180,
    "color": "rgba(255, 255, 255, 0.45)",
    "width": 6,
    "colorA": "rgba(255, 255, 255, 0.55)",
    "colorB": "rgba(255, 255, 255, 0.25)"
  },
  "light": {
    "size": 40,
    "color": "rgba(255, 255, 255, 0.45)",
    "intensity": 100,
    "smoothness": 65
  },
  "link": "",
  "newTab": true
};

export default function LiquidGlassButton(props: Record<string, unknown>) {
  return <__BaseImpl_LiquidGlassButton {...(__presetProps as Record<string, unknown>)} {...props} />;
}
