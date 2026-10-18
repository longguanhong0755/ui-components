"use client"

import * as React from "react"
import { useEffect, useLayoutEffect, useRef } from "react"
import {
    useAnimate,
    useReducedMotion,
    type AnimationPlaybackControls,
    type Transition,
} from "motion/react"

/** Framer's Border control hands back either one fused width or four per-side
 *  widths, plus `borderStyle` / `borderColor`. The band is built from padding,
 *  so every side is read on its own — collapsing the four to a single max made
 *  a per-side border silently thicken every side to the widest one. */
type BandWidths = { top: number; right: number; bottom: number; left: number }

/** Hard ceiling on band width. Framer's Border control exposes no `max` of its
 *  own in every version, so the limit is enforced here — that is the guarantee,
 *  the `max: 30` on the control is only the UI hint where it is honoured. */
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

type RGBA = { r: number; g: number; b: number; a: number }
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 }

/** Framer color controls hand back `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`,
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

/** Rounded is a percent of the MAXIMUM possible radius — half the short side —
 *  so 100 is a true pill at any button size. A CSS percentage border-radius is
 *  not the same thing: it resolves per axis and gives an ellipse, so a wide
 *  button would bulge instead of forming a stadium. Hence the measured
 *  conversion. */
const radiusFromPercent = (w: number, h: number, pct: number) =>
    (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100)

/** The border band itself: the full rounded box minus the content box,
 *  composited with `exclude`. The travelling lights live inside it, so they are
 *  ON the stroke and nowhere else — nothing spills outward, nothing washes over
 *  the face. The browser derives the inner corner radii, so no second radius is
 *  computed by hand.
 *
 *  It is a mask rather than a rounded `overflow` clip for two reasons: the face
 *  no longer has to be an opaque plate, so a Fill carrying alpha shows the page
 *  through rather than this colour, and a mask composites reliably where a
 *  rounded clip on a promoted child does not. */
const BAND_MASK: React.CSSProperties = {
    maskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
    maskClip: "border-box, content-box",
    maskComposite: "exclude",
    WebkitMaskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
    WebkitMaskClip: "border-box, content-box",
    WebkitMaskComposite: "xor",
} as React.CSSProperties

// Layout must land before the browser paints, otherwise the button renders at a
// square corner for one frame and visibly snaps. useLayoutEffect is client-only;
// fall back on the server to silence the warning.
const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect

/**
 * Pill button with two states:
 *  - idle: accent lights travel the border.
 *  - hover: the face fills with a twinkling grid of accent "windows" — a
 *    night-city of pixels.
 *
 * All motion runs on framer-motion's ticker (canvas-safe — Framer's canvas
 * suspends raw rAF loops, setInterval and CSS @keyframes). The pixel grid is
 * seeded deterministically (no Math.random) so canvas and preview render the
 * identical city.
 */

// ---------------------------------------------------------------------------
// Deterministic seed (no Math.random — it would desync canvas vs preview and
// re-roll the whole city on every canvas repaint).
// ---------------------------------------------------------------------------
const rnd = (i: number, salt: number) => {
    const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453
    return x - Math.floor(x)
}

/**
 * Point at travel fraction `t` along the perimeter of a rounded rectangle,
 * measured by ARC LENGTH — `t = 0.5` is exactly half way round, whatever the
 * proportions.
 *
 * This replaces tweening between four `radial-gradient` strings. That tween
 * interpolated the gradient's POSITION linearly, so a light leaving the top
 * edge for the left edge cut diagonally across the corner instead of following
 * the border, and it spent equal time on a 440px side and a 64px cap — the
 * light visibly sprinted round the ends. Arc length fixes both: constant speed,
 * always on the border.
 */
const pointOnRoundRect = (t: number, w: number, h: number, r: number) => {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2))
    const sx = Math.max(0, w - 2 * rr) // straight run, horizontal
    const sy = Math.max(0, h - 2 * rr) // straight run, vertical
    const arc = (Math.PI / 2) * rr
    const total = 2 * sx + 2 * sy + 4 * arc
    if (total <= 0) return { x: w / 2, y: h / 2 }

    // t = 0 is the middle of the top edge, so the resting light sits centred on
    // top exactly as the old four-key version did.
    let d = (((t % 1) + 1) % 1) * total + sx / 2
    d %= total

    // top-right half of the top edge → clockwise from there.
    if (d < sx) return { x: rr + d, y: 0 }
    d -= sx
    if (d < arc) {
        const a = d / rr
        return { x: w - rr + rr * Math.sin(a), y: rr - rr * Math.cos(a) }
    }
    d -= arc
    if (d < sy) return { x: w, y: rr + d }
    d -= sy
    if (d < arc) {
        const a = d / rr
        return { x: w - rr + rr * Math.cos(a), y: h - rr + rr * Math.sin(a) }
    }
    d -= arc
    if (d < sx) return { x: w - rr - d, y: h }
    d -= sx
    if (d < arc) {
        const a = d / rr
        return { x: rr - rr * Math.sin(a), y: h - rr + rr * Math.cos(a) }
    }
    d -= arc
    if (d < sy) return { x: 0, y: h - rr - d }
    d -= sy
    const a = d / rr
    return { x: rr - rr * Math.cos(a), y: rr - rr * Math.sin(a) }
}

/**
 * Point where a ray from the CENTRE at angle fraction `t` crosses that same
 * rounded-rect outline. `t = 0` points straight up — the middle of the top edge,
 * so the resting position is identical to the arc-length version — and `t`
 * increases clockwise on screen.
 *
 * This is what Step means: constant ANGULAR speed. Angle only maps to distance
 * on a circle, so the light hesitates along the long sides and whips around the
 * corners. It is the exact motion a rotating conic gradient produces, which is
 * how MovingGradientButton's Step mode is built — the two buttons now mean the
 * same thing by the same geometry, one with a conic, one with a positioned dot.
 *
 * The previous Step snapped `t` to 8 arc-length stations, so the light teleported
 * between fixed spots and needed 2+ lights to read as anything. That is not the
 * Step the other button has.
 */
const pointOnRoundRectAngular = (
    t: number,
    w: number,
    h: number,
    r: number
) => {
    const a = w / 2
    const b = h / 2
    if (a <= 0 || b <= 0) return { x: w / 2, y: h / 2 }
    const rr = Math.max(0, Math.min(r, a, b))
    const th = -Math.PI / 2 + (((t % 1) + 1) % 1) * Math.PI * 2
    const dx = Math.cos(th)
    const dy = Math.sin(th)

    // Straight-edge hit first: whichever of the two sides the ray reaches sooner.
    const kx = Math.abs(dx) > 1e-9 ? a / Math.abs(dx) : Infinity
    const ky = Math.abs(dy) > 1e-9 ? b / Math.abs(dy) : Infinity
    let k = Math.min(kx, ky)

    // Inside a corner's own quadrant the boundary is the cap's arc, not the
    // edge, so re-solve against the cap circle and take the far root.
    const cx = a - rr
    const cy = b - rr
    if (rr > 0 && Math.abs(dx * k) > cx && Math.abs(dy * k) > cy) {
        const Cx = Math.sign(dx * k) * cx
        const Cy = Math.sign(dy * k) * cy
        const proj = dx * Cx + dy * Cy
        const disc = rr * rr - (Cx * Cx + Cy * Cy) + proj * proj
        // A ray that grazes the cap can leave `disc` a hair below zero — clamp
        // rather than hand back NaN and park the light at the top-left corner.
        k = proj + Math.sqrt(Math.max(0, disc))
    }
    return { x: a + dx * k, y: b + dy * k }
}

// Seconds per lap at one unit of the internal speed scale, i.e. laps/sec =
// speed / this. One lap is one full turn in BOTH movement modes, so the dial
// keeps one meaning when the mode changes — only the pacing WITHIN the lap
// differs.
const SECONDS_AT_SPEED_1 = 10

type Cell = {
    cx: number
    cy: number
    base: number // resting brightness 0..1 (few bright "lit windows", most dim)
    speed: number // twinkle rad/s
    phase: number // twinkle phase
}

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
    type?: "symbol" | "image"
    icon?: string
    symbol?: string
    image?: string | { src?: string; srcSet?: string; alt?: string }
    color?: string
    size?: number
    padding?: number
    side?: "left" | "right"
    rounded?: number
}

function renderIconPath(iconType: any, strokeWidth: number) {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface StarfieldButtonProps {
    colors?: Colors
    label?: string
    font?: any
    showText?: boolean
    padding?: string
    rounded?: number
    fill?: string
    textColor?: string
    addIcon?: boolean
    icon?: IconConfig
    gap?: number
    border?: any
    glow?: {
        color?: string
        size?: number
        opacity?: number
    }
    stroke?: {
        count?: number
        color?: string
        size?: number
        thickness?: number
        speed?: number
        direction?: "cw" | "ccw"
        movement?: "continuous" | "step"
    }
    pixel?: {
        color?: string
        size?: number
        density?: number
        brightness?: number
    }
    link?: string
    transition?: Transition
    newTab?: boolean
    style?: React.CSSProperties
}

/**
 * @framerIntrinsicWidth 570
 * @framerIntrinsicHeight 128
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function StarfieldButton(props: StarfieldButtonProps) {
    const {
        label = "STARFIELD",
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
        rounded = 100,
        fill: fillProp = "#0A0A0A",
        textColor: textColorProp = "#FFFFFF",
        colors,
        addIcon = false,
        // A group the designer never opened arrives `undefined`, and so does any
        // field inside one they only partly filled — hence `= {}` plus a
        // per-field fallback below, never the control's defaultValue alone.
        icon = {
            icon: "arrow",
            side: "left",
            size: 28,
            type: "symbol",
            color: "#FFFFFF",
            image: "",
            symbol: "→",
            padding: 0,
            rounded: 0,
        },
        gap = 16,
        border = {
            borderColor: "rgba(255,255,255,0.14)",
            borderStyle: "solid",
            borderWidth: 1,
        },
        glow = { size: 16, color: "#FC731C", opacity: 100 },
        stroke = {
            size: 96,
            color: "#FC731C",
            count: 1,
            speed: 50,
            movement: "continuous",
            direction: "ccw",
            thickness: 2,
        },
        pixel = { size: 4, color: "#FC731C", density: 50, brightness: 100 },
        link = "",
        transition = { ease: [0.44, 0, 0.56, 1], type: "tween", delay: 0, duration: 0.6 },
        newTab = false,
        style,
    } = props

    // Top-level Fill / Text Color are the previous shape; the Colors group
    // wins, and they remain as fallbacks so an existing instance is untouched.
    const fill = colors?.fill ?? fillProp ?? "#0A0A0A"
    const textColor = colors?.textColor ?? textColorProp ?? "#FFFFFF"

    const {
        color: glowColor = "#FC731C",
        size: glowSize = 16,
        opacity: glowOpacity = 100,
    } = glow

    const {
        count: lightCountProp = 1,
        color: lightColor = "#FC731C",
        size: lightSize = 96,
        thickness: lightThickness = 2,
        speed: speedPct = 50,
        direction = "ccw",
        movement = "continuous",
    } = stroke

    // Speed is a PERCENT of this button's reference rate, so one dial reads the
    // same across every animated button (rule 3: whole numbers). 50% is the
    // rate this button always shipped; 0 stops it.
    const speed =
        2 * (Math.max(0, Math.min(100, Math.round(speedPct))) / 50)

    const {
        color: pixelColor = "#FC731C",
        size: pixelSize = 4,
        density: pixelDensity = 50,
        brightness: pixelBrightness = 100,
    } = pixel

    const {
        type: iconKind = "symbol",
        icon: iconType = "arrow",
        symbol: iconSymbol = "→",
        image: iconImage,
        color: iconColor = "#FFFFFF",
        size: iconSizeProp = 28,
        padding: iconPaddingProp = 0,
        side: iconSide = "left",
        rounded: iconRounded = 0,
    } = icon

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
    // otherwise flipping the switch empties the slot and reads as broken.
    // Image falls back to the symbol until a picture is chosen. Anything else —
    // including the "icon" a pre-vector-set instance saved — is the symbol.
    const iconMode = iconKind === "image" && iconSrc ? "image" : "symbol"
    const iconPx = Math.max(1, Math.round(iconSizeProp))
    // Icon Padding is applied as a MARGIN, not padding: the image
    // carries its own border-radius, and padding would round the empty
    // box around the picture instead of the picture.
    const iconPadPx = Math.max(0, Math.round(iconPaddingProp))
    const hasIcon = addIcon

    const Tag: any = link ? "a" : "button"
    const tagProps = {
        // With the text hidden the button has no accessible name, so Label keeps
        // working as one.
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
    const trackRef = useRef<HTMLDivElement>(null)
    const bandRef = useRef<HTMLDivElement>(null)
    const faceRef = useRef<HTMLSpanElement>(null)
    const innerGlowRef = useRef<HTMLSpanElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const lightsRef = useRef<Array<HTMLDivElement | null>>([])

    // ---- four independent lit systems, one prefix each -------------------
    //   band*   the border itself      — Border control
    //   light*  the travelling lights  — Stroke Light group
    //   glow*   the rim inside the face — Glow group
    //   pixel*  the revealed grid      — Pixel group
    // Each owns its own colour. They all descended from a single `glowColor`
    // prop in the original file, which is why the grid used to be tinted by
    // whichever group inherited that name.
    const band = bandWidthsOf(border)
    const bandPadding = `${band.top}px ${band.right}px ${band.bottom}px ${band.left}px`
    const bandMax = Math.max(band.top, band.right, band.bottom, band.left)

    const glowAlpha = Math.max(0, Math.min(100, glowOpacity)) / 100
    // Read inside the reveal tween, so moving Opacity mid-hover takes effect
    // without restarting the tween.
    const glowAlphaRef = useRef(glowAlpha)
    glowAlphaRef.current = glowAlpha

    const lightCount = Math.max(1, Math.min(12, Math.round(lightCountProp)))
    // The travelling light: `Size` is how far it reaches ALONG the stroke, and
    // `Thickness` how wide it is ACROSS it. Thickness used to be whatever the
    // Border width happened to be — the light was cut to the border band itself
    // — which welded two unrelated decisions to one control: a 1px border gave a
    // 1px hairline light, so the only way to see the light was to thicken the
    // border. The light now rides its own ring, centred on the border's centre
    // line, so each control moves exactly one thing.
    const lightPx = Math.max(4, Math.round(lightSize))
    // Same 30px ceiling as the border band: both are widths ACROSS the stroke.
    const lightThick = Math.max(
        1,
        Math.min(MAX_BAND_WIDTH, Math.round(lightThickness))
    )
    // Negative when the light is wider than the border: the ring then straddles
    // the edge symmetrically rather than sitting inside it.
    const ringInset = bandMax / 2 - lightThick / 2
    // The inside glow: one Size drives both how thick the rim is and how far it
    // feathers, so it reads as a single "reach" rather than two dials.
    const glowPx = Math.max(1, Math.round(glowSize))
    const glowRimPx = Math.max(1, Math.round(glowPx * 0.18))
    const glowBlurPx = Math.max(1, Math.round(glowPx * 0.5))

    // Rounded is a percent of the measured box, so it can only be resolved from
    // the rendered size. offsetWidth/Height, NOT getBoundingClientRect: Framer's
    // canvas renders inside a CSS-scaled container, so a rect comes back
    // multiplied by the zoom level while the layout box does not — and a rect
    // also carries the press scale, which would drift mid-gesture.
    //
    // Deps are the four band widths as primitives, never the `border` object:
    // Framer hands back a fresh object every render, so depending on it tore
    // down and rebuilt the ResizeObserver on every single render.
    const geom = useRef({ w: 0, h: 0, radius: 0 })
    useIsoLayoutEffect(() => {
        const el = buttonRef.current
        if (!el) return
        const applyRadius = () => {
            const w = el.offsetWidth
            const h = el.offsetHeight
            if (!w || !h) return
            const radius = radiusFromPercent(w, h, rounded)
            geom.current = { w, h, radius }
            el.style.borderRadius = `${radius}px`
            if (trackRef.current)
                trackRef.current.style.borderRadius = `${radius}px`
            if (bandRef.current)
                bandRef.current.style.borderRadius = `${Math.max(0, radius - ringInset)}px`
            if (faceRef.current) {
                // Each corner's inner radius shrinks by the width of the two
                // sides meeting there — horizontally by one, vertically by the
                // other. Same rule the browser uses for a real border's inner
                // edge, so the face tracks the band even with four widths.
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
                const innerRadius = `${x
                    .map((v) => `${v}px`)
                    .join(" ")} / ${y.map((v) => `${v}px`).join(" ")}`
                faceRef.current.style.borderRadius = innerRadius
                // The inside glow shares the face's shape exactly — same string,
                // never a second derivation that could drift on the corners.
                if (innerGlowRef.current)
                    innerGlowRef.current.style.borderRadius = innerRadius
            }
        }
        applyRadius()
        const ro = new ResizeObserver(applyRadius)
        ro.observe(el)
        return () => ro.disconnect()
    }, [rounded, ringInset, band.top, band.right, band.bottom, band.left])

    const reveal = useRef(0) // eased 0..1 hover progress (drives canvas)
    const revealCtrl = useRef<AnimationPlaybackControls | null>(null)
    const tickCtrl = useRef<AnimationPlaybackControls | null>(null)
    const reducedMotion = useReducedMotion()

    // Latest render values, read inside the persistent draw loop without
    // re-subscribing it (RubikParticles pattern).
    const cfg = {
        pixelColor,
        pixelSize,
        pixelDensity,
        pixelBrightness,
        lightCount,
        bandMax,
        ringInset,
        movement,
        direction,
        // A RATE, not a period. As `lapSec = 10 / max(1, speed)` the divisor had
        // to be floored at 1, so Speed 0 still ran a 10-second lap instead of
        // stopping. Every in-range value is unchanged: speed 2 → 0.2 laps/s.
        turnsPerSec: Math.max(0, speed) / SECONDS_AT_SPEED_1,
    }
    const cfgRef = useRef(cfg)
    cfgRef.current = cfg

    const size = useRef({ w: 1, h: 1, dpr: 1 })
    const city = useRef<{
        cols: number
        rows: number
        dens: number
        cells: Cell[]
    }>({
        cols: 0,
        rows: 0,
        dens: -1,
        cells: [],
    })

    // Rebuild the pixel grid when the face size or pixel size changes.
    const buildCity = (w: number, h: number, cell: number) => {
        const c = Math.max(4, Math.round(cell))
        const cols = Math.max(1, Math.floor(w / c))
        const rows = Math.max(1, Math.floor(h / c))
        // Density = fraction of cells that are bright "lit windows".
        const dens = Math.max(0, Math.min(1, cfgRef.current.pixelDensity / 100))
        if (
            cols === city.current.cols &&
            rows === city.current.rows &&
            dens === city.current.dens &&
            city.current.cells.length
        )
            return
        const offX = (w - cols * c) / 2
        const offY = (h - rows * c) / 2
        const cells: Cell[] = []
        for (let r = 0; r < rows; r++) {
            for (let col = 0; col < cols; col++) {
                const i = r * cols + col
                const lit = rnd(i, 1) < dens
                cells.push({
                    cx: offX + col * c + c / 2,
                    cy: offY + r * c + c / 2,
                    base: lit ? 0.5 + rnd(i, 2) * 0.5 : 0.05 + rnd(i, 3) * 0.18,
                    speed: 0.6 + rnd(i, 4) * 2.4,
                    phase: rnd(i, 5) * Math.PI * 2,
                })
            }
        }
        city.current = { cols, rows, dens, cells }
    }

    const draw = (ctx: CanvasRenderingContext2D) => {
        const { w, h, dpr } = size.current
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)

        const rv = reveal.current
        if (rv < 0.001) return // fully hidden — skip all dot work

        const { pixelSize: cell, pixelColor: col } = cfgRef.current
        const lightMul = Math.max(0, cfgRef.current.pixelBrightness) / 100
        buildCity(w, h, cell)
        const { cells } = city.current
        const c = Math.max(4, Math.round(cell))
        const dot = Math.max(1, Math.round(c * 0.62))
        const off = dot / 2
        const t = performance.now() / 1000

        // Center-weighted falloff so the middle reads brightest (as in the ref).
        const cx = w / 2
        const cy = h / 2
        const maxD = Math.hypot(cx, cy) || 1

        ctx.globalCompositeOperation = "lighter"
        ctx.fillStyle = col
        for (let k = 0; k < cells.length; k++) {
            const p = cells[k]
            const tw = 0.55 + 0.45 * Math.sin(t * p.speed + p.phase)
            const d = Math.hypot(p.cx - cx, p.cy - cy) / maxD
            const centerBias = 0.55 + 0.45 * (1 - d)
            let a = p.base * tw * centerBias * rv * lightMul
            if (a <= 0.002) continue
            if (a > 1) a = 1
            ctx.globalAlpha = a
            ctx.fillRect(p.cx - off, p.cy - off, dot, dot)
        }
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = "source-over"
    }

    /** Park every light on the border path for the current time. Transform
     *  only — no layout, no background rebuild — so N lights cost the same as
     *  one and nothing repaints. */
    const placeLights = (elapsedSec: number) => {
        const { w, h, radius } = geom.current
        if (!w || !h) return
        const c = cfgRef.current
        const half = c.bandMax / 2
        // The path runs down the middle of the band, so a thick border carries
        // the light in its centre rather than hanging off the outer edge.
        const pw = Math.max(0, w - c.bandMax)
        const ph = Math.max(0, h - c.bandMax)
        const pr = Math.max(0, radius - half)
        const dir = c.direction === "cw" ? 1 : -1
        const base = elapsedSec * c.turnsPerSec * dir

        for (let i = 0; i < c.lightCount; i++) {
            const el = lightsRef.current[i]
            if (!el) continue
            let t = base + i / c.lightCount
            t = ((t % 1) + 1) % 1
            // Step = constant angular speed (a swept ray, as the other button's
            // rotating conic); Continuous = constant speed along the perimeter.
            // Multiple lights stay evenly spread in whichever quantity the mode
            // is measured in — angle for Step, arc length for Continuous.
            const p =
                c.movement === "step"
                    ? pointOnRoundRectAngular(t, pw, ph, pr)
                    : pointOnRoundRect(t, pw, ph, pr)
            // `half` puts the path back on the border's centre line in button
            // space; subtracting the ring layer's own inset converts it to that
            // layer's space.
            el.style.transform = `translate3d(${p.x + half - c.ringInset}px, ${p.y + half - c.ringInset}px, 0)`
        }
    }

    // --- persistent ticker: pixel city + travelling lights (canvas-safe) -----
    useEffect(() => {
        const canvas = canvasRef.current
        const face = faceRef.current
        if (!canvas || !face) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const applySize = (w: number, h: number) => {
            if (w <= 0 || h <= 0) return
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            size.current = { w, h, dpr }
            canvas.width = Math.max(1, Math.floor(w * dpr))
            canvas.height = Math.max(1, Math.floor(h * dpr))
        }

        // Size the buffer to the padding box (what canvas `inset:0` fills) —
        // contentRect would exclude padding and get upscaled into tall bars.
        const ro = new ResizeObserver(() => {
            applySize(face.clientWidth, face.clientHeight)
            placeLights(performance.now() / 1000)
        })
        ro.observe(face)
        applySize(face.clientWidth, face.clientHeight)
        placeLights(performance.now() / 1000)

        if (reducedMotion) {
            reveal.current = 0
            draw(ctx)
        } else {
            // One infinite tween = a per-frame ticker Framer's canvas keeps
            // alive. It drives both the city and the lights, so there is only
            // ever one loop to suspend or leak.
            tickCtrl.current = animate(0, 1, {
                duration: 1,
                ease: "linear",
                repeat: Infinity,
                onUpdate: () => {
                    draw(ctx)
                    placeLights(performance.now() / 1000)
                },
            })
        }

        return () => {
            ro.disconnect()
            tickCtrl.current?.stop()
            tickCtrl.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reducedMotion])

    // Opacity is normally written by the reveal tween; when the control itself
    // moves there is no tween running, so re-apply it at the current reveal.
    useIsoLayoutEffect(() => {
        if (innerGlowRef.current)
            innerGlowRef.current.style.opacity = String(
                reveal.current * glowAlpha
            )
    }, [glowAlpha])

    // Reposition immediately when a light-count / geometry control changes, so
    // the canvas does not wait a frame at stale coordinates.
    useIsoLayoutEffect(() => {
        placeLights(performance.now() / 1000)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lightCount, lightPx, lightThick, movement, direction, rounded, bandMax])

    // Hover tweens outlive their handlers — stop them if the component unmounts
    // mid-transition.
    useEffect(() => () => revealCtrl.current?.stop(), [])

    // --- hover: reveal the city ---------------------------------------------
    const revealOpts = (): Transition | { duration: number } =>
        reducedMotion ? { duration: 0 } : (transition ?? { duration: 0.35 })

    const animateReveal = (to: number) => {
        // Restart from the live value — a half-finished tween must not keep
        // writing `reveal.current` alongside the new one.
        revealCtrl.current?.stop()
        revealCtrl.current = animate(reveal.current, to, {
            ...(revealOpts() as any),
            onUpdate: (v: number) => {
                reveal.current = v
                // Written straight to the element rather than through a CSS
                // variable: one property, one writer, no reconciliation race.
                if (innerGlowRef.current)
                    innerGlowRef.current.style.opacity = String(
                        v * glowAlphaRef.current
                    )
            },
        })
    }

    const scaleTo = (s: number) => {
        if (buttonRef.current)
            animate(buttonRef.current, { scale: s }, revealOpts() as any)
    }

    const onEnter = () => {
        animateReveal(1)
    }

    const onLeave = () => {
        animateReveal(0)
        scaleTo(1)
    }

    // The face paints Fill as given. Fill is a ControlType.Color, which already
    // carries its own alpha, so a second Fill Opacity dial was a duplicate way
    // to set the same channel.
    const faceBackground = fill

    const lightRGB = parseColor(lightColor)

    const glyph =
        iconMode === "image" ? (
            <img
                src={iconSrc}
                alt=""
                aria-hidden
                draggable={false}
                style={{
                    width: iconPx,
                    height: iconPx,
                    margin: iconPadPx,
                    // `contain` letterboxes, so a rounded corner would clip
                    // empty space instead of the image. `cover` once a radius
                    // is asked for.
                    objectFit: iconRounded > 0 ? "cover" : "contain",
                    borderRadius: radiusFromPercent(iconPx, iconPx, iconRounded),
                    display: "block",
                    flex: "none", // never let a wide icon squash the label
                    pointerEvents: "none",
                }}
            />
        ) : iconMode === "symbol" ? (
            <span
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
        ) : (
            <svg
                aria-hidden
                width={iconPx}
                height={iconPx}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ color: iconColor, flex: "none", display: "block" }}
            >
                {renderIconPath(iconType, 2)}
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
                minWidth: 80,
                minHeight: 40,
                position: "relative",
                display: "inline-grid",
                placeItems: "stretch",
                // Nothing paints outside the pill any more (the lights are cut to
                // the band), so this is just "add no clip, add no second curve".
                overflow: "visible",
                ...style,
            }}
        >
            <Tag
                {...tagProps}
                ref={buttonRef}
                onPointerEnter={onEnter}
                onPointerLeave={onLeave}
                onPointerDown={() => scaleTo(0.97)}
                onPointerUp={() => scaleTo(1)}
                style={{
                    boxSizing: "border-box",
                    position: "relative",
                    // No width/height here — the root is `inline-grid` with
                    // `place-items: stretch`, so this fills the root whether the
                    // root is hugging its content or pinned to an explicit size.
                    padding: bandPadding,
                    border: "none",
                    // NO background here. The border colour used to be painted
                    // as this element's background, with the face covering the
                    // middle — which meant the border colour was really the
                    // button's backdrop, and any Fill carrying alpha showed it
                    // across the whole face instead of the page. The border is
                    // now a band-only layer of its own.
                    background: "transparent",
                    // borderRadius is set imperatively above — it is a percent of
                    // the measured box. Declaring it here too would let React
                    // clobber the measured value on any re-render.
                    cursor: "pointer",
                    userSelect: "none",
                    textDecoration: "none",
                    overflow: "visible",
                    // No `will-change: transform`. It promotes the whole subtree
                    // permanently, and a promoted subtree rasterizes its rounded
                    // edges once and then stretches them for the press.
                }}
            >
                {/* BORDER — the stroke itself, masked to exactly the band so it
                    paints nowhere else. Nothing sits behind the face any more,
                    so a translucent Fill reveals the page, not this colour. */}
                <div
                    ref={trackRef}
                    aria-hidden
                    style={{
                        position: "absolute",
                        inset: 0,
                        boxSizing: "border-box",
                        padding: bandPadding,
                        background: borderColorOf(border),
                        zIndex: 0,
                        pointerEvents: "none",
                        ...BAND_MASK,
                    }}
                />

                {/* LIGHT RING — a ring exactly `Thickness` wide, centred on the
                    border's centre line. The lights are cut to it, so each one
                    is a bright length OF THE STROKE: no bloom outside the
                    button, no wash across the face. Independent of the Border
                    width, which now only draws the border. */}
                <div
                    ref={bandRef}
                    aria-hidden
                    style={{
                        position: "absolute",
                        top: ringInset,
                        right: ringInset,
                        bottom: ringInset,
                        left: ringInset,
                        boxSizing: "border-box",
                        padding: lightThick,
                        zIndex: 0,
                        pointerEvents: "none",
                        ...BAND_MASK,
                    }}
                >
                    {Array.from({ length: lightCount }, (_, i) => (
                        <div
                            key={i}
                            ref={(el) => {
                                lightsRef.current[i] = el
                            }}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: lightPx,
                                height: lightPx,
                                marginTop: -lightPx / 2,
                                marginLeft: -lightPx / 2,
                                pointerEvents: "none",
                                // A disc, of which the mask keeps only the sliver
                                // lying on the band — so `Size` reads as the
                                // light's LENGTH along the stroke. The falloff is
                                // the light's own shape, not a glow: it is what
                                // stops the segment ending in two hard chops.
                                background: `radial-gradient(circle, ${lightColor} 0%, ${lightColor} 30%, ${rgba(lightRGB, 0)} 72%)`,
                            }}
                        />
                    ))}
                </div>

                {/* FACE — no longer doubles as the mask for the lights, so a
                    translucent Fill is a legitimate choice. */}
                <span
                    ref={faceRef}
                    style={{
                        position: "relative",
                        zIndex: 1,
                        // Without this the padding is ADDED to the 100%, so the
                        // face overflows right and bottom — and the button sets
                        // `overflow: visible`, so it spills outside the pill
                        // instead of being clipped.
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
                        background: faceBackground,
                        // radius set imperatively above, as on the button
                        overflow: "hidden",
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        aria-hidden
                        style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 0,
                            width: "100%",
                            height: "100%",
                            pointerEvents: "none",
                        }}
                    />
                    {/* INSIDE GLOW — the soft rim that hugs the face's inner
                        edge, sitting between the pixels and the text. It is a
                        blurred layer, i.e. composited, so it carries its OWN
                        `mask-clip: border-box` instead of trusting the face's
                        rounded `overflow` to contain it — that combination is
                        the known case where a hard-cornered rectangle escapes.
                        Its shape is the face's exact radius string. */}
                    <span
                        ref={innerGlowRef}
                        aria-hidden
                        style={
                            {
                                position: "absolute",
                                inset: 0,
                                zIndex: 1,
                                // radius set imperatively above, from the face
                                border: `${glowRimPx}px solid ${glowColor}`,
                                filter: `blur(${glowBlurPx}px)`,
                                opacity: 0,
                                pointerEvents: "none",
                                maskImage: "linear-gradient(#000 0 0)",
                                maskClip: "border-box",
                                WebkitMaskImage: "linear-gradient(#000 0 0)",
                                WebkitMaskClip: "border-box",
                            } as React.CSSProperties
                        }
                    />
                    {hasIcon && (
                        <span style={{ position: "relative", zIndex: 2 }}>
                            {glyph}
                        </span>
                    )}
                    {showText && (
                        <span
                            style={{
                                position: "relative",
                                zIndex: 2,
                                color: textColor,
                                ...font,
                            }}
                        >
                            {label}
                        </span>
                    )}
                </span>
            </Tag>
        </div>
    )
}
