"use client"

/**
 * Deck Carousel — a pack of cards that deals itself into a straight horizontal
 * strip, then runs on the wheel forever.
 *
 * The cards start stacked at the centre, scattered a few degrees off each other
 * so the pile reads as a pile. Once the section comes into view they deal
 * themselves out one at a time, left to right: each card hops on a short arc,
 * straightens out of the deck's scatter, and lands in its slot on the line. The
 * deal runs on a Framer transition, so it can be a spring or a tween straight
 * from the panel.
 *
 * The deal happens once. Until it has landed the wheel is left alone, so the
 * page scrolls past normally while the deck is still coming out; once the line
 * is straight the strip takes the wheel over. From there it runs sideways in
 * whichever direction the reader scrolls and never runs out in either — the row
 * is a loop, and a card that leaves one edge is already on its way back in at
 * the other. Passing the cursor over the line turns the nearest cards on their
 * Y axis until they drop out of sight, the original's silhouette flip. Nothing
 * here needs a tap.
 *
 * Every image carries its own Y offset, which frames the picture inside its
 * card rather than moving the card. Cards crop to fill, so a portrait whose
 * subject sits high loses its head to a centred crop; the offset slides the
 * image up or down behind the card's window until the right part shows. It
 * changes nothing outside that one card — not the line, not the spacing, not
 * the neighbours.
 *
 * The line is straight by design — no arc, no ring. For the circular
 * arrangement, see CircularGallery.
 *
 * Descended from https://github.com/Animmaster/Circular-Gallery — same lerped
 * hover flip and deck-scatter maths, laid out on a line instead of a circle,
 * minus GSAP, and scoped to the component's own bounds instead of the window
 * (so several can sit on one page, and it behaves inside a Framer frame of any
 * size).
 */

import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
import { animate } from "motion/react"
import type { Transition } from "motion/react"

/* ------------------------------------------------------------------ types */

/** Framer hands `ControlType.Image` back as a URL string on older versions and
 * as a responsive-image object on newer ones. Accept both. */
type ImageInput = string | { src?: string } | null | undefined

export interface DeckCarouselCard {
    width?: number
    height?: number
    radius?: number
}

/** One entry in the Images array: the picture, and where inside its card the
 * picture is framed. Bare images are still accepted, so an array filled in
 * before the offset existed keeps working. */
export interface DeckCarouselItem {
    image?: ImageInput
    /** Pixels, positive to slide the image down behind the window — which
     * brings more of its top into view. 0 is a centred crop. */
    offsetY?: number
}

export type DeckCarouselImage = ImageInput | DeckCarouselItem

export interface DeckCarouselProps {
    images?: DeckCarouselImage[]
    background?: string
    count?: number
    spacing?: number
    cardWidth?: number
    cardHeight?: number
    cardRadius?: number
    reach?: number
    scrollSensitivity?: number
    smoothing?: number
    transition?: Transition
    style?: CSSProperties
}

/* ----------------------------------------------------------------- defaults
 * One source of truth for every default: the signature uses these, and each
 * control's `defaultValue` points at the same constant. */

const DEFAULT_CARD: Required<DeckCarouselCard> = {
    width: 180,
    height: 240,
    radius: 8,
}

const DEFAULT_TRANSITION: Transition = {
    type: "spring",
    stiffness: 120,
    damping: 18,
    mass: 1,
}

const DEFAULT_BACKGROUND = "#000000"
const DEFAULT_COUNT = 12
const DEFAULT_SPACING = 24
const DEFAULT_REACH = 5
const DEFAULT_SCROLL_SENSITIVITY = 5
const DEFAULT_SMOOTHING = 5

const DEFAULT_IMAGES: DeckCarouselItem[] = [
    { image: "https://images.unsplash.com/photo-1590482634645-39ea413d7a41?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NzJ8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2UlMjB2aWJyYW50fGVufDB8fDB8fHwy", offsetY: 0 },
    { image: "https://images.unsplash.com/photo-1759701546662-b79f5d881124?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDN8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2UlMjB2aWJyYW50fGVufDB8fDB8fHwy", offsetY: 0 },
    { image: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8dXNlciUyMHByb2ZpbGUlMjBpbWFnZSUyMHZpYnJhbnR8ZW58MHx8MHx8fDI%3D", offsetY: 0 },
    { image: "https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8dXNlciUyMHByb2ZpbGUlMjBpbWFnZSUyMHZpYnJhbnR8ZW58MHx8MHx8fDI%3D", offsetY: 0 },
    { image: "https://images.unsplash.com/photo-1665174286799-5c51dcc9748a?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2UlMjB2aWJyYW50fGVufDB8fDB8fHwy", offsetY: 0 },
    { image: "https://images.unsplash.com/photo-1714356333088-45a9ba618365?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NzZ8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2UlMjB2aWJyYW50fGVufDB8fDB8fHwy", offsetY: 0 },
    { image: "https://images.unsplash.com/photo-1655669832303-58be6a0e42ad?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8ODd8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2UlMjB2aWJyYW50fGVufDB8fDB8fHwy", offsetY: 0 },
    { image: "https://images.unsplash.com/photo-1655293459479-cacd56abeaf6?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTE0fHx1c2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfHwwfHx8Mg%3D%3D", offsetY: 0 },
    { image: "https://images.unsplash.com/photo-1670626428555-bd2dbe344cf4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTM2fHx1c2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfHwwfHx8Mg%3D%3D", offsetY: 0 },
    { image: "https://images.unsplash.com/photo-1613698809174-93715bc96879?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTcxfHx1c2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfHwwfHx8Mg%3D%3D", offsetY: 0 },
]

/* -------------------------------------------------------------- internals */

/** Card-local perspective, matching the original's `transformPerspective`. */
const CARD_PERSPECTIVE = 1000
/** The original's fixed lerp, now that Smoothing belongs to the scroll alone. */
const HOVER_LERP = 0.15

/* --- deck constants. Not exposed: these are the look, not knobs. */

/** Deck scatter as a fraction of the card's short side, so the pile stays
 * proportional whatever size the cards are set to. */
const STACK_SPREAD = 0.15
/** Deck scatter, in degrees. */
const STACK_TILT = 9
/** Beat the pile holds before the first card is dealt, in seconds. */
const STACK_HOLD = 0.55
/** Gap between one card leaving the pile and the next, in seconds. */
const DEAL_STAGGER = 4.8 * 0.024
/** Height of the hop a card takes on its way out to the line, as a fraction of
 * the card — it arcs rather than sliding flat. */
const DEAL_LIFT = 0.7

/** Finger travel is shorter than wheel travel, so scale it up. */
const TOUCH_GAIN = 2.2
/** A single wheel event never advances more than this, so a trackpad fling
 * cannot jump the strip — the lerp still has to walk it across. */
const WHEEL_CLAMP = 400
/** Largest share of the frame a card may take up at rest. */
const CARD_FILL = 0.9
/** Placeholder cards, for when no images have been supplied yet. */
const PLACEHOLDER_COUNT = 12

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

/** Positive modulo — JS `%` keeps the sign of the dividend, which would send
 * wrapped cards off the wrong end of the strip. */
function wrap(value: number, span: number): number {
    return ((value % span) + span) % span
}

/** Fold a position into the strip's own period, centred on zero: a card that
 * runs off one edge comes back on at the other. */
function wrapCentred(value: number, span: number): number {
    return wrap(value + span / 2, span) - span / 2
}

/** Deterministic per-card noise — the deck has to scatter the same way on the
 * server and the client, so `Math.random` is out. */
function noise(index: number, seed: number): number {
    const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453
    return value - Math.floor(value)
}

function resolveSrc(item: ImageInput): string | null {
    if (!item) return null
    if (typeof item === "string") return item || null
    const src = item.src
    return typeof src === "string" && src ? src : null
}

interface Slide {
    src: string | null
    /** Pixels off a centred crop. */
    offsetY: number
}

/** Read one Images entry. A `{ image, offsetY }` object is the current shape; a
 * bare URL or responsive-image object is what older arrays hold, and those come
 * back sitting on the line. */
function resolveItem(entry: DeckCarouselImage): Slide {
    if (entry && typeof entry === "object" && "image" in entry) {
        const item = entry as DeckCarouselItem
        return {
            src: resolveSrc(item.image),
            offsetY: Number.isFinite(item.offsetY as number)
                ? (item.offsetY as number)
                : 0,
        }
    }
    return { src: resolveSrc(entry as ImageInput), offsetY: 0 }
}

/** Stand-in artwork so the component renders on its own with no props. */
function placeholderFill(index: number): string {
    const hue = (index * 47 + 210) % 360
    return `linear-gradient(150deg, hsl(${hue} 38% 30%), hsl(${
        (hue + 45) % 360
    } 52% 8%))`
}

/* ------------------------------------------------------------- strip state */

/** Per-card motion. `deal` is written by the transition and `rotation` is
 * chased toward its target by the lerp; the paint folds them together. */
interface CardState {
    /** 0 on the pile, 1 in its slot. A springy transition rides past 1. */
    deal: number
    /** Where the card sits on the line right now, in strip units. Written by
     * the paint and read back by the pointer, so the hover never has to
     * re-derive the wrap. */
    layoutX: number
    currentRotation: number
    targetRotation: number
    /** Deck scatter, all in -1…1 and fixed for the life of the card. */
    jitterX: number
    jitterY: number
    jitterRotation: number
}

interface Scene {
    cards: CardState[]
    /** Where the wheel has pushed the strip, and the eased value it actually
     * rides — everything visible is derived from the second one. One unit is
     * one lap of the whole set, in either direction. */
    progressTarget: number
    progressCurrent: number
    /** The deal has been started, so any card the strip grows from here on has
     * missed it and belongs straight in its slot. */
    dealt: boolean
    /** Every card has landed. Until then the wheel belongs to the page. */
    ready: boolean
    /** A control changed, so the next frame has to be drawn even if nothing is
     * in motion. Set during render, cleared by the paint. */
    dirty: boolean
}

function makeCard(index: number, deal: number): CardState {
    return {
        deal,
        layoutX: 0,
        currentRotation: 0,
        targetRotation: 0,
        jitterX: noise(index, 1) * 2 - 1,
        jitterY: noise(index, 2) * 2 - 1,
        jitterRotation: noise(index, 3) * 2 - 1,
    }
}

/** Grow or shrink the strip in place when the count changes. Surviving cards
 * keep their object identity, because the deal's transitions hold references to
 * them and would otherwise end up writing to orphans. */
function syncCards(scene: Scene, count: number): void {
    if (scene.cards.length === count) return
    const next: CardState[] = []
    for (let i = 0; i < count; i += 1) {
        // A card that appears after the deal has gone out — the frame was
        // resized, say, and the set now repeats further — starts in its slot
        // rather than flying in on its own long after the pack emptied.
        next.push(scene.cards[i] ?? makeCard(i, scene.dealt ? 1 : 0))
    }
    scene.cards = next
}

/** Everything the animation frame needs, refreshed on every render so the rAF
 * loop never has to be torn down and rebuilt when a control changes. */
interface Frame {
    count: number
    step: number
    period: number
    lapPx: number
    baseScale: number
    stackSpread: number
    dealLift: number
    hover: boolean
    hoverRadius: number
    falloff: number
    scrollLerp: number
    scrollPerLap: number
    transition: Transition
}

/* -------------------------------------------------------------- component */

export default function DeckCarousel({
    images = DEFAULT_IMAGES,
    background = DEFAULT_BACKGROUND,
    count = DEFAULT_COUNT,
    spacing = DEFAULT_SPACING,
    cardWidth = DEFAULT_CARD.width,
    cardHeight = DEFAULT_CARD.height,
    cardRadius = DEFAULT_CARD.radius,
    reach = DEFAULT_REACH,
    scrollSensitivity = DEFAULT_SCROLL_SENSITIVITY,
    smoothing = DEFAULT_SMOOTHING,
    transition,
    style,
}: DeckCarouselProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const stripRef = useRef<HTMLDivElement | null>(null)
    const cardRefs = useRef<(HTMLDivElement | null)[]>([])

    const [size, setSize] = useState({ width: 0, height: 0 })
    /** Coarse pointers get no hover flip — it would fire once and stick, the
     * same reason the original switched the effect off under 1000px. */
    const [pointerFine, setPointerFine] = useState(false)

    const cardOpts = {
        width: cardWidth,
        height: cardHeight,
        radius: cardRadius,
    }

    /* ---- source list: user images, or placeholders when the array is empty */
    const source = useMemo<Slide[]>(() => {
        const resolved = (images ?? [])
            .map(resolveItem)
            .filter((slide) => slide.src)
        return resolved.length
            ? resolved
            : Array.from({ length: PLACEHOLDER_COUNT }, () => ({
                  src: null,
                  offsetY: 0,
              }))
    }, [images])

    const cardCount = Math.max(1, Math.round(count))
    const step = cardOpts.width + Math.max(0, spacing)

    /* ---- fit: a card never takes more than most of the frame. The strip
     * itself is meant to overrun both edges — that is what makes it a strip —
     * so only the card is measured against the frame, which is the whole
     * responsive story: phone, tablet and laptop all get the same line with
     * proportionally sized cards. */
    const baseScale =
        size.width > 0 && size.height > 0
            ? Math.max(
                  0.01,
                  Math.min(
                      1,
                      CARD_FILL *
                          Math.min(
                              size.width / cardOpts.width,
                              size.height / cardOpts.height
                          )
                  )
              )
            : 1

    /* ---- the loop -------------------------------------------------------
     * The set repeats until the line is comfortably longer than the frame, so
     * a card is always fully off screen at the moment it wraps to the far end.
     * Travelling one set's worth puts an identical picture on screen, which is
     * what makes the loop seamless — and what lets the tick fold a completed
     * lap out of the numbers without anything moving. */
    const repeats = Math.max(
        1,
        Math.ceil(
            (size.width / baseScale + cardOpts.width) / (cardCount * step)
        ) || 1
    )
    const total = cardCount * repeats
    const period = total * step
    const lapPx = cardCount * step

    /* ---- derived motion: abstract 0–10 scales mapped to real units */
    const scrollLerp = clamp(0.16 - clamp(smoothing, 0, 10) * 0.012, 0.03, 0.16)
    const scrollPerCard = 400 - clamp(scrollSensitivity, 0, 10) * 32
    const scrollPerLap = Math.max(1, scrollPerCard * cardCount)

    // Screen-space reach of the hover flip, scaled with the strip so the same
    // slider value feels the same in a small frame as in a large one. Falloff
    // keeps the original's 2:1 relationship to the reach.
    const hoverRadius = (100 + clamp(reach, 0, 10) * 80) * baseScale

    const dealTransition = transition ?? DEFAULT_TRANSITION
    // Restarting the deal on a transition tweak means re-running the effect,
    // which needs the object flattened to something React can compare.
    const dealKey = useMemo(
        () => JSON.stringify(dealTransition),
        [dealTransition]
    )

    const scene = useRef<Scene>({
        cards: [],
        progressTarget: 0,
        progressCurrent: 0,
        dealt: false,
        ready: false,
        dirty: true,
    })

    /* ---- live config for the frame loop (written during render, read in rAF) */
    const frame = useRef<Frame>({
        count: total,
        step,
        period,
        lapPx,
        baseScale,
        stackSpread: 0,
        dealLift: 0,
        hover: false,
        hoverRadius,
        falloff: 1,
        scrollLerp,
        scrollPerLap,
        transition: DEFAULT_TRANSITION,
    })
    frame.current = {
        count: total,
        step,
        period,
        lapPx,
        baseScale,
        stackSpread: STACK_SPREAD * Math.min(cardOpts.width, cardOpts.height),
        dealLift: DEAL_LIFT * cardOpts.height,
        hover: pointerFine,
        hoverRadius,
        falloff: Math.max(1, hoverRadius / 2),
        scrollLerp,
        scrollPerLap,
        transition: dealTransition,
    }
    // Any render can have moved the strip's geometry under the loop, so the
    // next frame draws whether or not anything is animating.
    scene.current.dirty = true

    /* ---- measure */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        const observer = new ResizeObserver((entries) => {
            const rect = entries[0].contentRect
            setSize({ width: rect.width, height: rect.height })
        })
        observer.observe(node)
        setSize({ width: node.clientWidth, height: node.clientHeight })
        return () => observer.disconnect()
    }, [])

    /* ---- pointer capability, read after mount so SSR and hydration agree */
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return
        const query = window.matchMedia("(hover: hover) and (pointer: fine)")
        const update = () => setPointerFine(query.matches)
        update()
        query.addEventListener("change", update)
        return () => query.removeEventListener("change", update)
    }, [])

    /* ---- the deal: hold the pile, then send the cards out to their slots one
     * at a time on the panel's transition. Armed by visibility so it does not
     * play out below the fold, and it runs exactly once — the count, the
     * spacing and the frame size can all change afterwards without the pack
     * reassembling itself. Editing the Transition control does replay it, so
     * the setting can still be judged on the canvas. */
    useEffect(() => {
        const state = scene.current
        state.dealt = false
        state.ready = false
        state.progressTarget = 0
        state.progressCurrent = 0
        for (const item of state.cards) item.deal = 0

        const running: { stop: () => void }[] = []
        let cancelled = false

        const start = () => {
            if (cancelled || state.dealt) return
            state.dealt = true
            // The frame has been measured by the time anything is on screen, so
            // the strip is at its final length and every card gets dealt.
            syncCards(state, frame.current.count)
            const dealing = state.cards.length
            let landed = 0
            state.cards.forEach((item, index) => {
                item.deal = 0
                running.push(
                    animate(0, 1, {
                        ...frame.current.transition,
                        delay: STACK_HOLD + index * DEAL_STAGGER,
                        onUpdate: (value: number) => {
                            item.deal = value
                        },
                        onComplete: () => {
                            landed += 1
                            if (landed >= dealing) state.ready = true
                        },
                    })
                )
            })
        }

        const node = containerRef.current
        if (!node || typeof IntersectionObserver === "undefined") {
            start()
            return () => {
                cancelled = true
                running.forEach((controls) => controls.stop())
            }
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return
                observer.disconnect()
                start()
            },
            { threshold: 0, rootMargin: "0px 0px -15% 0px" }
        )
        observer.observe(node)
        return () => {
            cancelled = true
            observer.disconnect()
            running.forEach((controls) => controls.stop())
        }
    }, [dealKey])

    /* ---- the frame loop */
    useEffect(() => {
        let raf = 0
        let last = 0

        const paint = () => {
            const config = frame.current
            const state = scene.current

            const strip = stripRef.current
            if (strip) strip.style.transform = `scale(${config.baseScale})`

            const travel = state.progressCurrent * config.lapPx
            // The line is centred on the frame when it has not travelled.
            const origin = (config.period - config.step) / 2

            for (let i = 0; i < state.cards.length; i += 1) {
                const node = cardRefs.current[i]
                if (!node) continue
                const item = state.cards[i]

                const slot = wrapCentred(
                    i * config.step - origin - travel,
                    config.period
                )
                item.layoutX = slot

                // Settle drives everything that must not overshoot; the raw
                // deal value carries the spring's overshoot into the travel, so
                // a card sails a touch past its slot and settles back onto it.
                const settle = clamp(item.deal, 0, 1)
                const scatter = (1 - settle) * config.stackSpread
                const hop = config.dealLift * Math.sin(Math.PI * settle)

                const x = slot * item.deal + item.jitterX * scatter
                const y = item.jitterY * scatter - hop
                // Out of the deck's scatter and square to the line.
                const spin = item.jitterRotation * STACK_TILT * (1 - settle)

                node.style.transform = `perspective(${CARD_PERSPECTIVE}px) translate3d(${x}px, ${y}px, 0) rotate(${spin}deg) rotateY(${item.currentRotation}deg)`
            }
        }

        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            const dt = last ? Math.min(0.064, (now - last) / 1000) : 1 / 60
            last = now

            const config = frame.current
            const state = scene.current
            syncCards(state, config.count)

            /* --- scroll: the wheel writes a target, the strip only ever rides
               the eased value, so a fling cannot tear the line apart. */
            const sk = 1 - Math.pow(1 - config.scrollLerp, dt * 60)
            state.progressCurrent +=
                (state.progressTarget - state.progressCurrent) * sk

            // Cut the lerp's tail off rather than chasing it for ever: below a
            // fiftieth of a pixel of travel there is nothing left to draw.
            let moving = false
            if (
                Math.abs(state.progressTarget - state.progressCurrent) *
                    config.lapPx >
                0.02
            ) {
                moving = true
            } else {
                state.progressCurrent = state.progressTarget
            }

            // A completed lap is folded out of both values at once, whichever
            // way it was travelled. One lap puts an identical picture on
            // screen, so nothing moves a pixel — it only keeps the numbers
            // small however long the reader keeps scrolling.
            if (state.progressCurrent >= 1) {
                state.progressCurrent -= 1
                state.progressTarget -= 1
            } else if (state.progressCurrent < 0) {
                state.progressCurrent += 1
                state.progressTarget += 1
            }

            /* --- the hover flip */
            // Frame-rate independent form of the original's fixed 0.15 lerp.
            const k = 1 - Math.pow(1 - HOVER_LERP, dt * 60)
            for (const item of state.cards) {
                // Nothing on the pile is touchable — the flip only reaches a
                // card once it has landed in its slot.
                const settle = clamp(item.deal, 0, 1)
                const aim = item.targetRotation * settle
                if (Math.abs(aim - item.currentRotation) > 0.01) {
                    item.currentRotation += (aim - item.currentRotation) * k
                    moving = true
                } else {
                    item.currentRotation = aim
                }
                if (item.deal !== 1) moving = true
            }

            // At rest the loop keeps running so it can notice the next change,
            // but it writes nothing. A strip sitting idle on a Framer canvas
            // was restyling every card sixty times a second, which is what made
            // dragging a slider in the panel feel like it was catching.
            if (moving || state.dirty) {
                state.dirty = false
                paint()
            }
        }

        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [])

    /* ---- the scroll controller. It only ever writes `progressTarget`; the
     * frame loop eases the strip toward it. */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        const state = scene.current

        const advance = (deltaPx: number) => {
            // Neither end is pinned: the line loops as far as the reader cares
            // to go, in whichever direction they go.
            state.progressTarget += deltaPx / frame.current.scrollPerLap
        }

        const onWheel = (event: WheelEvent) => {
            // While the pack is still coming out the wheel is the page's.
            if (!state.ready) return
            let delta = event.deltaY
            if (event.deltaMode === 1) delta *= 16
            else if (event.deltaMode === 2) delta *= node.clientHeight || 800
            delta = clamp(delta, -WHEEL_CLAMP, WHEEL_CLAMP)
            event.preventDefault()
            advance(delta)
        }

        let touchY: number | null = null
        const onTouchStart = (event: TouchEvent) => {
            touchY = state.ready ? (event.touches[0]?.clientY ?? null) : null
        }
        const onTouchMove = (event: TouchEvent) => {
            const y = event.touches[0]?.clientY
            if (y == null || touchY == null) return
            const delta = clamp(
                (touchY - y) * TOUCH_GAIN,
                -WHEEL_CLAMP,
                WHEEL_CLAMP
            )
            touchY = y
            if (event.cancelable) event.preventDefault()
            advance(delta)
        }
        const onTouchEnd = () => {
            touchY = null
        }

        node.addEventListener("wheel", onWheel, { passive: false })
        node.addEventListener("touchstart", onTouchStart, { passive: true })
        node.addEventListener("touchmove", onTouchMove, { passive: false })
        node.addEventListener("touchend", onTouchEnd, { passive: true })
        node.addEventListener("touchcancel", onTouchEnd, { passive: true })
        return () => {
            node.removeEventListener("wheel", onWheel)
            node.removeEventListener("touchstart", onTouchStart)
            node.removeEventListener("touchmove", onTouchMove)
            node.removeEventListener("touchend", onTouchEnd)
            node.removeEventListener("touchcancel", onTouchEnd)
        }
    }, [])

    /* ---- pointer */
    const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const config = frame.current
        const state = scene.current
        if (!config.hover) return
        const node = containerRef.current
        if (!node) return

        const rect = node.getBoundingClientRect()
        const centreX = rect.width / 2
        const centreY = rect.height / 2
        const pointerX = event.clientX - rect.left
        const pointerY = event.clientY - rect.top

        for (const item of state.cards) {
            // Card centres come off the last painted layout — the wrap has
            // already been worked out there, and one layout read per card per
            // pointer move is what makes the original stutter.
            const cardX = centreX + config.baseScale * item.layoutX
            const distance = Math.hypot(pointerX - cardX, pointerY - centreY)
            item.targetRotation =
                distance < config.hoverRadius
                    ? 180 * Math.max(0, 1 - distance / config.falloff)
                    : 0
        }
    }

    const handleLeave = () => {
        for (const item of scene.current.cards) item.targetRotation = 0
    }

    return (
        <div
            ref={containerRef}
            onPointerMove={handleMove}
            onPointerLeave={handleLeave}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                // Left pannable on purpose: the strip only claims a swipe once
                // the deck has finished dealing, and until then the page keeps
                // its own scrolling.
                touchAction: "manipulation",
                ...style,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div
                    ref={stripRef}
                    style={{
                        position: "relative",
                        width: 0,
                        height: 0,
                        transformOrigin: "center",
                        willChange: "transform",
                    }}
                >
                    {Array.from({ length: total }, (_, index) => {
                        // The set repeats along the line, so a card and the one
                        // exactly a lap away carry the same image — that is
                        // what makes the wrap invisible.
                        const slide =
                            source[(index % cardCount) % source.length]
                        const src = slide?.src ?? null
                        return (
                            <div
                                key={index}
                                ref={(node) => {
                                    cardRefs.current[index] = node
                                }}
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    marginLeft: -cardOpts.width / 2,
                                    marginTop: -cardOpts.height / 2,
                                    width: cardOpts.width,
                                    height: cardOpts.height,
                                    borderRadius: cardOpts.radius,
                                    overflow: "hidden",
                                    transformOrigin: "center center",
                                    transformStyle: "preserve-3d",
                                    backfaceVisibility: "visible",
                                    willChange: "transform",
                                    // Deal from the top of the pile down, so
                                    // the card that leaves first is the one
                                    // sitting on top of the deck.
                                    zIndex: total - index,
                                }}
                            >
                                {src ? (
                                    <img
                                        src={src}
                                        alt=""
                                        draggable={false}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            // Where the crop sits. `cover`
                                            // overflows the card on one axis;
                                            // this decides which part of that
                                            // overflow is the part you see.
                                            // The calc reads as "centred, then
                                            // nudged", so 0 is the crop the
                                            // card would have had anyway.
                                            objectPosition: `50% calc(50% + ${
                                                slide?.offsetY ?? 0
                                            }px)`,
                                            display: "block",
                                            userSelect: "none",
                                            // The original look: a card flipped
                                            // past 90° drops out entirely
                                            // instead of showing a mirror image
                                            // of itself.
                                            backfaceVisibility: "hidden",
                                        }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            background: placeholderFill(
                                                index % cardCount
                                            ),
                                            backfaceVisibility: "hidden",
                                        }}
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
