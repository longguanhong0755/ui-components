"use client"

/**
 * Smooth Scroll Slider — a horizontal image rail on black. Wheel, trackpad or
 * drag pushes a target offset; the rendered offset chases it with a lerp, so
 * the rail keeps gliding after the input stops. Every slide is scaled by where
 * its centre sits relative to the viewport centre: cards approaching from the
 * right are oversized and get pushed further right so they clear their
 * neighbour, cards that have passed the centre shrink and dim away.
 *
 * Ported to a single-file Framer / Next.js component from
 * https://github.com/Animmaster/Smooth-scroll-Slider — same lerp + distance-
 * from-centre scaling, minus GSAP, plus seamless looping, drag and controls.
 *
 * The component consumes the wheel over its own bounds, so the page will not
 * scroll past the section while the cursor is inside it.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ types */

/** Framer hands an image control back as a URL string on older versions and as
 * a responsive-image object on newer ones. Accept both. */
type ImageValue = string | { src?: string } | null | undefined

/** A row of the Images array: the `{ image, offsetY }` object the panel writes,
 * or a bare image for lists authored before the offset existed. */
type ImageInput = ImageValue | { image?: ImageValue; offsetY?: number }

/** One slide's resolved content. The offset is carried, not baked in: it is
 * applied where the `<img>` is written so dragging the slider reframes every
 * picture already on screen. */
interface Slide {
    src: string | null
    offsetY: number
}

export interface SmoothScrollSliderProps {
    /** Content */
    images?: ImageInput[]
    /** Size */
    slideWidth?: number
    slideHeight?: number
    /** Layout */
    spacing?: number
    direction?: "right" | "left"
    /** Motion */
    smoothness?: number
    /** Style */
    radius?: number
    dim?: number
    background?: string
    /** Interaction */
    sensitivity?: number
    loop?: boolean
    style?: CSSProperties
}

/* -------------------------------------------------------------- internals */

const PLACEHOLDER_COUNT = 8

/** Scale envelope, pinned to the extremes of the original 0–10 growth/shrink
 * scales: a slide approaching from the right peaks at 2.5x, one that has passed
 * the centre falls away to 0.1x. Not exposed — the look is fixed. */
const MAX_SCALE = 2.5
const MIN_SCALE = 0.1

/** Positive modulo — JS `%` keeps the sign of the dividend, which would send
 * wrapped slides off to the left of the rail instead of round to the right. */
function wrap(value: number, span: number): number {
    return ((value % span) + span) % span
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

function resolveSrc(value: ImageValue): string | null {
    if (!value) return null
    if (typeof value === "string") return value || null
    const src = value.src
    return typeof src === "string" && src ? src : null
}

function imageOf(item: ImageInput): string | null {
    if (item && typeof item === "object" && "image" in item)
        return resolveSrc(item.image)
    return resolveSrc(item as ImageValue)
}

function offsetOf(item: ImageInput): number {
    if (item && typeof item === "object" && "offsetY" in item) {
        const offset = item.offsetY
        return typeof offset === "number" && isFinite(offset) ? offset : 0
    }
    return 0
}

/** Stand-in artwork so the component renders on its own with no props. */
function placeholderFill(index: number): string {
    const hue = (index * 47 + 210) % 360
    return `linear-gradient(150deg, hsl(${hue} 42% 34%), hsl(${
        (hue + 45) % 360
    } 55% 10%))`
}

/** Everything the animation frame needs, refreshed on every render so the rAF
 * loop never has to be torn down and rebuilt when a control changes. */
interface Frame {
    count: number
    step: number
    slideWidth: number
    width: number
    ease: number
    maxScale: number
    minScale: number
    dim: number
    loop: boolean
    flip: boolean
}

/* ------------------------------------------------------------- component */

export default function SmoothScrollSlider({
    images = [
        {"image":{"alt":"","src":"https://images.unsplash.com/photo-1557747357-b3302a733ae4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NTMxfHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D"},"offsetY":0},
        {"image":{"alt":"","src":"https://images.unsplash.com/photo-1637961239801-d0dfcc1a9340?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NjEyfHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D"},"offsetY":0},
        {"image":{"alt":"","src":"https://images.unsplash.com/photo-1579205149708-f5b24c5a04e5?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fFVzZXIlMjBwcm9maWxlJTIwaW1hZ2UlMjB2aWJyYW50fGVufDB8MHwwfHx8Mg%3D%3D"},"offsetY":0},
        {"image":{"alt":"","src":"https://images.unsplash.com/photo-1748572495955-4f301f8e93ba?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzB8fFVzZXIlMjBwcm9maWxlJTIwaW1hZ2UlMjB2aWJyYW50fGVufDB8MHwwfHx8Mg%3D%3D"},"offsetY":0},
        {"image":{"alt":"","src":"https://images.unsplash.com/photo-1664705792423-89f2016228eb?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mzd8fFVzZXIlMjBwcm9maWxlJTIwaW1hZ2UlMjB2aWJyYW50fGVufDB8MHwwfHx8Mg%3D%3D"},"offsetY":0},
        {"image":{"alt":"","src":"https://images.unsplash.com/photo-1758600433991-933fb663161f?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NjZ8fFVzZXIlMjBwcm9maWxlJTIwaW1hZ2UlMjB2aWJyYW50fGVufDB8MHwwfHx8Mg%3D%3D"},"offsetY":0},
        {"image":{"alt":"","src":"https://images.unsplash.com/photo-1643325297990-cbdde391d7c8?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Njd8fFVzZXIlMjBwcm9maWxlJTIwaW1hZ2UlMjB2aWJyYW50fGVufDB8MHwwfHx8Mg%3D%3D"},"offsetY":0},
        {"image":{"alt":"","src":"https://images.unsplash.com/photo-1601233750964-940fc7080ba5?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTAwfHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D"},"offsetY":0},
        {"image":{"alt":"","src":"https://images.unsplash.com/photo-1748154228682-4be26335c713?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTk1fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D"},"offsetY":0},
        {"image":{"alt":"","src":"https://images.unsplash.com/photo-1631700010907-eeca2d4f2a39?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjA5fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D"},"offsetY":0},
    ],
    slideWidth = 400,
    slideHeight = 400,
    spacing = 2,
    direction = "right",
    smoothness = 10,
    radius = 16,
    dim = 10,
    background = "#000000",
    sensitivity = 5,
    loop = true,
    style,
}: SmoothScrollSliderProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const nodes = useRef<(HTMLDivElement | null)[]>([])
    const target = useRef(0)
    const current = useRef(0)
    const [width, setWidth] = useState(0)

    /* ---- source list: user images, or placeholders when the array is empty */
    const source = useMemo<Slide[]>(() => {
        const resolved: Slide[] = []
        for (const item of images ?? []) {
            const src = imageOf(item)
            if (src) resolved.push({ src, offsetY: offsetOf(item) })
        }
        return resolved.length
            ? resolved
            : Array.from({ length: PLACEHOLDER_COUNT }, () => ({
                  src: null,
                  offsetY: 0,
              }))
    }, [images])

    /* ---- derived motion values: abstract 0–10 scales mapped to real units */
    const step = slideWidth + clamp(spacing, 0, 10) * 20
    const ease = 0.15 - (clamp(smoothness, 0, 10) / 10) * 0.13
    const dimAmount = (clamp(dim, 0, 10) / 10) * 0.85
    const wheelMultiplier = 0.4 + (clamp(sensitivity, 0, 10) / 10) * 1.2
    const dragMultiplier = 0.6 + (clamp(sensitivity, 0, 10) / 10) * 1.8
    // Mirror about the vertical centreline: cards grow in from the left and the
    // rail travels the other way. Only the placement is mirrored — the images
    // themselves are never flipped.
    const flip = direction === "left"

    /* ---- repeat the list until it outruns the viewport, so the wrap is seamless */
    const repeats = useMemo(() => {
        if (!loop || width <= 0 || step <= 0) return 1
        return Math.max(1, Math.ceil((width + step * 2) / (source.length * step)))
    }, [loop, width, step, source.length])

    const slides = useMemo(() => {
        const out: Slide[] = []
        for (let r = 0; r < repeats; r += 1) out.push(...source)
        return out
    }, [source, repeats])

    /* ---- live config for the frame loop (written during render, read in rAF) */
    const frame = useRef<Frame>({
        count: 0,
        step: 0,
        slideWidth: 0,
        width: 0,
        ease: 0.075,
        maxScale: MAX_SCALE,
        minScale: MIN_SCALE,
        dim: 0,
        loop: true,
        flip: false,
    })
    frame.current = {
        count: slides.length,
        step,
        slideWidth,
        width,
        ease,
        maxScale: MAX_SCALE,
        minScale: MIN_SCALE,
        dim: dimAmount,
        loop,
        flip,
    }

    /* ---- input config, read by the listeners without re-binding them */
    const input = useRef({ wheelMultiplier, dragMultiplier, flip })
    input.current = { wheelMultiplier, dragMultiplier, flip }

    /* ---- measure */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        const observer = new ResizeObserver((entries) => {
            setWidth(entries[0].contentRect.width)
        })
        observer.observe(node)
        setWidth(node.getBoundingClientRect().width)
        return () => observer.disconnect()
    }, [])

    /* ---- drop refs for slides that no longer exist */
    useEffect(() => {
        nodes.current.length = slides.length
    }, [slides.length])

    /* ---- the loop: lerp the offset, then place and scale every slide */
    useEffect(() => {
        let raf = 0
        let last = 0

        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            const c = frame.current
            const delta = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60
            last = now
            if (!c.count || c.step <= 0 || c.width <= 0) return

            const span = c.count * c.step

            if (c.loop) {
                // Keep both values inside one span so long sessions stay precise.
                if (current.current > span || current.current < -span) {
                    const shift = Math.trunc(current.current / span) * span
                    current.current -= shift
                    target.current -= shift
                }
            } else {
                target.current = clamp(target.current, 0, (c.count - 1) * c.step)
            }

            // Frame-rate independent lerp — `ease` is calibrated at 60fps.
            const k = 1 - Math.pow(1 - c.ease, delta * 60)
            current.current += (target.current - current.current) * k

            const pad = (c.width - c.slideWidth) / 2
            const half = c.width / 2

            for (let i = 0; i < c.count; i += 1) {
                const node = nodes.current[i]
                if (!node) continue

                const raw = i * c.step - current.current + pad
                // Wrapped slides live in [-step, span - step): one slide-width
                // of slack on the left so nothing pops in mid-view.
                const x = c.loop ? wrap(raw + c.step, span) - c.step : raw

                const distance = x + c.slideWidth / 2 - half
                let scale: number
                let push: number
                if (distance > 0) {
                    scale = Math.min(c.maxScale, 1 + distance / c.width)
                    // Grown slides are pushed right so they clear the neighbour
                    // they would otherwise swallow.
                    push = (scale - 1) * c.slideWidth * 0.75
                } else {
                    scale = Math.max(c.minScale, 1 + distance / c.width)
                    push = 0
                }

                // Everything above is solved in unmirrored space; mirroring the
                // final left edge flips the whole composition, push included.
                const left = c.flip ? c.width - c.slideWidth - (x + push) : x + push
                node.style.transform = `translate3d(${left}px, -50%, 0) scale(${scale})`

                if (c.dim > 0 && scale < 1) {
                    const t = (1 - scale) / Math.max(0.001, 1 - c.minScale)
                    node.style.filter = `brightness(${1 - t * c.dim})`
                } else {
                    node.style.filter = "none"
                }
            }
        }

        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [])

    /* ---- wheel / trackpad */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        const onWheel = (event: WheelEvent) => {
            event.preventDefault()
            const dominant =
                Math.abs(event.deltaX) > Math.abs(event.deltaY)
                    ? event.deltaX
                    : event.deltaY
            target.current += dominant * input.current.wheelMultiplier
        }
        node.addEventListener("wheel", onWheel, { passive: false })
        return () => node.removeEventListener("wheel", onWheel)
    }, [])

    /* ---- pointer drag */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        let pointer: number | null = null
        let lastX = 0

        const onDown = (event: PointerEvent) => {
            if (pointer !== null) return
            pointer = event.pointerId
            lastX = event.clientX
            node.setPointerCapture(event.pointerId)
        }
        const onMove = (event: PointerEvent) => {
            if (pointer !== event.pointerId) return
            const dx = event.clientX - lastX
            lastX = event.clientX
            target.current += (input.current.flip ? dx : -dx) * input.current.dragMultiplier
        }
        const onUp = (event: PointerEvent) => {
            if (pointer !== event.pointerId) return
            pointer = null
            if (node.hasPointerCapture(event.pointerId))
                node.releasePointerCapture(event.pointerId)
        }

        node.addEventListener("pointerdown", onDown)
        node.addEventListener("pointermove", onMove)
        node.addEventListener("pointerup", onUp)
        node.addEventListener("pointercancel", onUp)
        return () => {
            node.removeEventListener("pointerdown", onDown)
            node.removeEventListener("pointermove", onMove)
            node.removeEventListener("pointerup", onUp)
            node.removeEventListener("pointercancel", onUp)
        }
    }, [])

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                cursor: "grab",
                touchAction: "pan-y",
                opacity: width > 0 ? 1 : 0,
                transition: "opacity 0.35s ease",
                ...style,
            }}
        >
            {slides.map((slide, i) => (
                <div
                    key={i}
                    ref={(el) => {
                        nodes.current[i] = el
                    }}
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: 0,
                        width: slideWidth,
                        height: slideHeight,
                        borderRadius: radius,
                        overflow: "hidden",
                        background: slide.src ? "#111" : placeholderFill(i),
                        willChange: "transform, filter",
                        transform: "translate3d(0, -50%, 0)",
                        pointerEvents: "none",
                    }}
                >
                    {slide.src ? (
                        <img
                            src={slide.src}
                            alt=""
                            draggable={false}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                // `cover` already overflows the box on one axis;
                                // this picks which part of that overflow you see,
                                // so 0 is the crop the box would have had anyway.
                                objectPosition: `50% calc(50% + ${slide.offsetY}px)`,
                                display: "block",
                                userSelect: "none",
                            }}
                        />
                    ) : null}
                </div>
            ))}
        </div>
    )
}
