"use client"

import * as React from "react"
import { animate } from "motion/react"

/** The card box, in px, on the folder's shared 40–800 span. Defaults are the
 *  320x400 the card shipped at, so an untouched instance is unchanged. */
const DEFAULT_CARD_W = 320
const DEFAULT_CARD_H = 400
const SIZE_MIN = 40
const SIZE_MAX = 800

interface FontControl {
    variant?: string
    fontSize?: string | number
    textAlign?: string
    fontFamily?: string
    fontWeight?: number
    lineHeight?: string
    letterSpacing?: string
}

interface TransitionControl {
    mass?: number
    type?: string
    bounce?: number
    damping?: number
    duration?: number
    stiffness?: number
}

interface ResponsiveImageControl {
    src: string
    alt?: string
}

interface FrostGlassCardProps {
    image?: ResponsiveImageControl | string
    title?: string
    description?: string
    cardWidth?: number
    cardHeight?: number
    font?: FontControl
    subFont?: FontControl
    textColor?: string
    subColor?: string
    blur?: number
    reach?: number
    tint?: string
    rounded?: number
    transition?: TransitionControl
    style?: React.CSSProperties
    [key: string]: any
}

/**
 * @framerIntrinsicWidth 320
 * @framerIntrinsicHeight 400
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
function __BaseImpl_FrostGlassCard(props: FrostGlassCardProps) {
    const {
        image = {
            alt: "",
            src: "https://images.unsplash.com/photo-1665764884116-11bf71512155?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDAxfHx2aWJyYW50JTIwaW1hZ2UlMjBvcmFuZ2UlMjBjb2xvcnxlbnwwfDB8MHx8fDI%3D",
        },
        title = "Late Night Radio\n",
        description = "Slow rhythms, distant lights, and the perfect soundtrack for the ride home.",
        cardWidth = 600,
        cardHeight = 400,
        font = {
            variant: "Regular",
            fontSize: "32px",
            textAlign: "left",
            fontFamily: "Inter",
            fontWeight: 600,
            lineHeight: "1.5em",
            letterSpacing: "0em",
        },
        subFont = {
            variant: "Regular",
            fontSize: "20px",
            textAlign: "left",
            fontFamily: "Inter",
            fontWeight: 400,
            lineHeight: "1.5em",
            letterSpacing: "0em",
        },
        textColor = "rgb(255,255,255)",
        subColor = "rgba(255,255,255,0.7)",
        blur = 40,
        reach = 160,
        tint = "rgba(255,255,255,0.1)",
        rounded = 19,
        transition = { type: "spring", bounce: 0.25, damping: 60, duration: 0.5, mass: 1, stiffness: 800 },
        style,
        ...rest
    } = props

    const containerRef = React.useRef<HTMLDivElement>(null)
    const overlayRef = React.useRef<HTMLDivElement>(null)
    const frostRef = React.useRef<HTMLDivElement>(null)
    const sheenRef = React.useRef<HTMLDivElement>(null)
    const hovered = React.useRef(false)

    // The panel states the box, so the ResizeObserver that used to feed the
    // radius is gone — it only existed because the root's size was whatever the
    // frame handed down.
    const cardW = Math.max(1, Math.round(cardWidth ?? DEFAULT_CARD_W))
    const cardH = Math.max(1, Math.round(cardHeight ?? DEFAULT_CARD_H))

    const radius = Math.floor((Math.min(cardW, cardH) / 2) * (rounded / 100))

    const glassAt = (px: number) => `blur(${px}px) saturate(180%)`

    // Thaw state lives in refs and is written straight to the DOM in the rAF
    // loop — a setState per pointermove would re-render the tree 60x/sec.
    const pointer = React.useRef({ x: 0, y: 0, tx: 0, ty: 0, s: 0, ts: 0 })
    const raf = React.useRef(0)

    const apply = React.useCallback(
        (on: boolean, instant = false) => {
            const t = instant ? { duration: 0 } : transition
            if (containerRef.current) {
                animate(containerRef.current, { scale: on ? 1.02 : 1 }, t)
            }
            if (overlayRef.current) {
                animate(overlayRef.current, { y: on ? -8 : 0 }, t)
            }
            if (sheenRef.current) {
                animate(sheenRef.current, { opacity: on ? 1 : 0.6 }, t)
            }
        },
        [transition]
    )

    // The hole. Alpha 0 at the centre lets the sharp image through; the ramp
    // out to opaque black is a gradual thaw, because a partially-masked
    // backdrop-filter composites filtered over unfiltered in that proportion.
    const maskFor = (x: number, y: number, r: number) =>
        `radial-gradient(circle ${Math.round(r)}px at ${Math.round(x)}px ${Math.round(y)}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 45%, #000 100%)`

    React.useEffect(() => {
        const tick = () => {
            const p = pointer.current
            // Position eases faster than the radius so the hole never lags
            // visibly behind a fast pointer.
            p.x += (p.tx - p.x) * 0.25
            p.y += (p.ty - p.y) * 0.25
            p.s += (p.ts - p.s) * 0.12
            const el = frostRef.current
            if (el) {
                if (p.s < 0.01) {
                    el.style.maskImage = "none"
                    el.style.webkitMaskImage = "none"
                } else {
                    const m = maskFor(p.x, p.y, reach * p.s)
                    el.style.maskImage = m
                    el.style.webkitMaskImage = m
                }
            }
            raf.current = requestAnimationFrame(tick)
        }
        raf.current = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf.current)
    }, [reach])

    const trackPointer = (e: React.PointerEvent) => {
        const el = containerRef.current
        if (!el) return
        // getBoundingClientRect carries the canvas zoom, so it is used ONLY as
        // a ratio here — rect.width and (clientX - rect.left) scale together,
        // and offsetWidth is unzoomed, so the zoom cancels exactly.
        const r = el.getBoundingClientRect()
        if (!r.width || !r.height) return
        const p = pointer.current
        p.tx = ((e.clientX - r.left) / r.width) * el.offsetWidth
        p.ty = ((e.clientY - r.top) / r.height) * el.offsetHeight
    }

    const handlePointerEnter = (e: React.PointerEvent) => {
        hovered.current = true
        trackPointer(e)
        // Snap the hole's centre on entry, then let it grow from 0.
        pointer.current.x = pointer.current.tx
        pointer.current.y = pointer.current.ty
        pointer.current.ts = 1
        apply(true)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!hovered.current) return
        trackPointer(e)
    }

    const handlePointerLeave = () => {
        hovered.current = false
        pointer.current.ts = 0
        apply(false)
    }

    React.useEffect(() => {
        const handleUp = () => {
            hovered.current = false
            pointer.current.ts = 0
            apply(false)
        }
        window.addEventListener("pointerup", handleUp)
        window.addEventListener("pointercancel", handleUp)
        return () => {
            window.removeEventListener("pointerup", handleUp)
            window.removeEventListener("pointercancel", handleUp)
        }
    }, [apply])

    const mergedStyle: React.CSSProperties = {
        ...style,
        // AFTER the spread, and no floor: the two dials ARE the card's size, so
        // a frame size or a min-* that overrode them would be a control that
        // lies (rule F).
        width: cardW,
        height: cardH,
        position: "relative",
        overflow: "hidden",
        borderRadius: radius,
        // No border. A border paints on the BORDER box — outside the padding
        // box every glass layer is inset to — so it is behind nothing, blurs
        // nothing, and the thaw mask cannot reach it. Measured: 0/255 change
        // with the hole directly over it. It also antialiased its own curve
        // against the overflow clip's (rule 9A, two curves, one seam).
        cursor: "pointer",
    }

    const imgSrc =
        (typeof image === "string" ? image : image?.src) ||
        "https://framerusercontent.com/images/9z9cZmqXP0a3Ad8qACpBtyTug.png"

    return (
        <div
            ref={containerRef}
            style={mergedStyle}
            onPointerEnter={handlePointerEnter}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            {...rest}
        >
            <img
                src={imgSrc}
                alt={title}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                }}
            />
            {/* Frost: full-bleed glass over the whole card. Carries its own
                border-radius — a backdrop-filter child is composited and a
                rounded overflow:hidden parent does not reliably clip it. */}
            <div
                ref={frostRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: radius,
                    background: tint,
                    backdropFilter: glassAt(blur),
                    WebkitBackdropFilter: glassAt(blur),
                    pointerEvents: "none",
                }}
            />
            {/* Glass sheen: top-left specular + bottom shade for text
                legibility. No backdrop-filter here — stacking two would
                double-filter. No 1px rim/ring insets either: this layer sits
                ABOVE the frost and carries no mask, so a hairline here stays
                at full strength inside the thawed hole. Only soft gradients
                remain. */}
            <div
                ref={sheenRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: radius,
                    opacity: 0.6,
                    boxShadow:
                        "inset 0 -20px 40px -20px rgba(0,0,0,0.35)",
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 38%, rgba(255,255,255,0) 60%)",
                    pointerEvents: "none",
                }}
            />
            <div
                ref={overlayRef}
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                }}
            >
                {/* Title takes Font wholesale — no hardcoded size/weight, or
                    the Font control's own size and weight map to nothing. */}
                <div style={{ color: textColor, ...font }}>{title}</div>
                <div style={{ color: subColor, ...subFont }}>{description}</div>
            </div>
        </div>
    )
}

FrostGlassCard.displayName = "Frost Glass Card"

const __presetProps = {
  "image": {
    "alt": "",
    "src": "https://images.unsplash.com/photo-1615212879967-c1c189978139?q=80&w=2675&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  "title": "",
  "description": "",
  "cardWidth": 600,
  "cardHeight": 400,
  "font": {
    "variant": "Regular",
    "fontSize": "32px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 600,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  },
  "textColor": "rgb(255,255,255)",
  "subFont": {
    "variant": "Regular",
    "fontSize": "20px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 400,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  },
  "subColor": "rgba(255,255,255,0.7)",
  "blur": 40,
  "reach": 258,
  "tint": "rgba(255,255,255,0.1)",
  "rounded": 0,
  "transition": {
    "ease": [
      0.44,
      0,
      0.56,
      1
    ],
    "type": "tween",
    "delay": 0,
    "duration": 1
  }
};

export default function FrostGlassCard(props: Record<string, unknown>) {
  return <__BaseImpl_FrostGlassCard {...(__presetProps as Record<string, unknown>)} {...props} />;
}
