"use client"

/**
 * Circular Gallery — a ring of cards standing on a circle, each rotated
 * tangentially so the ring reads like a clock face, driven entirely by the
 * wheel.
 *
 * Scrolling in flies the camera forward: the ring swells and drops until the
 * card at twelve o'clock fills the frame. Every scroll after that keeps turning
 * the ring, carrying the next image up into the same spot — and it never runs
 * out. One lap of the ring is exactly 360°, so the sequence wraps into itself
 * and the only way back is to scroll back, unwinding the ring and pulling the
 * camera out again. At rest the pointer takes over: cards inside the cursor's
 * falloff turn on their Y axis, swell, and push outward along their own radius,
 * while the whole ring tilts toward the cursor. Nothing here needs a tap.
 *
 * For the version whose cards start stacked in a pack and deal themselves out
 * along a straight line, see DeckCarousel.
 *
 * Ported to a single-file Framer / Next.js component from
 * https://github.com/Animmaster/Circular-Gallery — same ring maths and lerped
 * hover flip, its click-to-zoom transition rebuilt as a scrubbable one, minus
 * GSAP, and scoped to the component's own bounds instead of the window (so
 * several can sit on one page, and it behaves inside a Framer frame of any
 * size).
 */

import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"

/* ------------------------------------------------------------------ types */

/** Accept both a plain URL string and a responsive-image-like object. */
type ImageInput = string | { src?: string } | null | undefined

export interface CircularGalleryCard {
    width?: number
    height?: number
    radius?: number
}

export interface CircularGalleryProps {
    images?: ImageInput[]
    background?: string
    count?: number
    ringRadius?: number
    card?: CircularGalleryCard
    zoom?: number
    zoomOffset?: number
    scrollSensitivity?: number
    smoothing?: number
    style?: CSSProperties
}

/* ------------------------------------------------------------ group defaults
 * One source of truth for every default: the signature merges these, and each
 * control's `defaultValue` is the matching slice of the same constant. */

const DEFAULT_CARD: Required<CircularGalleryCard> = {
    width: 40,
    height: 45,
    radius: 4,
}

const DEFAULT_SCROLL_SENSITIVITY = 5
const DEFAULT_SMOOTHING = 10

const DEFAULT_BACKGROUND = "#000000"
const DEFAULT_COUNT = 25
const DEFAULT_RING_RADIUS = 224
const DEFAULT_ZOOM = 5
const DEFAULT_ZOOM_OFFSET = 0

/* -------------------------------------------------------------- internals */

const TAU = Math.PI * 2

/** Twelve o'clock, in maths angles — the top of the circle in CSS coordinates.
 * Every card's angle is offset by this, so card 0 starts there with the ring
 * unrotated and a card sitting there is exactly upright. */
const FOCUS_ANGLE = (Math.PI * 3) / 2

/** Card-local perspective, matching the original's `transformPerspective`. */
const CARD_PERSPECTIVE = 1000
/** Stage perspective, from the original stylesheet. */
const STAGE_PERSPECTIVE = 2000
/** The original's fixed lerp, now that Smoothing belongs to the scroll alone. */
const HOVER_LERP = 0.15

/* --- the hover, pinned at what the panel used to default to. The mapping from
 * the old 0-10 scales is kept rather than folded away, so the numbers still
 * read as the abstract amounts they came from. */

/** Screen-space reach of the flip, before the fit scale. */
const HOVER_REACH = 5
/** How far a card pushes out along its radius, and how far it swells. */
const HOVER_STRENGTH = 5
/** How hard the whole ring tilts toward the cursor. */
const HOVER_PARALLAX = 5

/** How much of the scroll the fly-in spends, measured in cards so the zoom
 * costs the same wheel distance whatever the ring is holding. */
const ENTRY_CARDS = 2
/** Finger travel is shorter than wheel travel, so scale it up. */
const TOUCH_GAIN = 2.2
/** A single wheel event never advances more than this, so a trackpad fling
 * cannot jump the sequence — the lerp still has to walk the ring across. */
const WHEEL_CLAMP = 400
/** Placeholder cards, for when no images have been supplied yet. */
const PLACEHOLDER_COUNT = 12

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

/** Ease-in-out for the fly-in. Scrubbed rather than played, so it wants to be
 * flat at both ends — no overshoot to fight when the scroll reverses. */
const smoothstep = (t: number): number => t * t * (3 - 2 * t)

function resolveSrc(item: ImageInput): string | null {
    if (!item) return null
    if (typeof item === "string") return item || null
    const src = item.src
    return typeof src === "string" && src ? src : null
}

/** Stand-in artwork so the component renders on its own with no props. */
function placeholderFill(index: number): string {
    const hue = (index * 47 + 210) % 360
    return `linear-gradient(150deg, hsl(${hue} 38% 30%), hsl(${
        (hue + 45) % 360
    } 52% 8%))`
}

/* -------------------------------------------------------------- ring state */

/** Per-card hover motion: every value is chased toward its target by the lerp,
 * and its whole contribution is damped out as the fly-in takes over. */
interface CardState {
    angle: number
    currentRotation: number
    targetRotation: number
    currentX: number
    targetX: number
    currentY: number
    targetY: number
    currentScale: number
    targetScale: number
}

interface Scene {
    cards: CardState[]
    parallax: {
        currentX: number
        targetX: number
        currentY: number
        targetY: number
        currentZ: number
        targetZ: number
    }
    ring: { x: number; y: number; rotation: number; scale: number }
    /** Where the wheel has pushed the scroll, and the eased value the ring
     * actually rides — everything visible is derived from the second one. */
    progressTarget: number
    progressCurrent: number
    /** Eased fly-in, 0 at rest and 1 fully zoomed. */
    entry: number
}

function cardAngle(index: number, count: number): number {
    return (index / Math.max(1, count)) * TAU + FOCUS_ANGLE
}

function makeCard(index: number, count: number): CardState {
    return {
        angle: cardAngle(index, count),
        currentRotation: 0,
        targetRotation: 0,
        currentX: 0,
        targetX: 0,
        currentY: 0,
        targetY: 0,
        currentScale: 1,
        targetScale: 1,
    }
}

/** Grow or shrink the ring in place when the card count changes, keeping the
 * motion of the cards that survive so a control tweak never snaps. */
function syncCards(scene: Scene, count: number): void {
    if (scene.cards.length === count) return
    const next: CardState[] = []
    for (let i = 0; i < count; i += 1) {
        const previous = scene.cards[i]
        if (previous) {
            previous.angle = cardAngle(i, count)
            next.push(previous)
        } else {
            next.push(makeCard(i, count))
        }
    }
    scene.cards = next
}

/** Everything the animation frame needs, refreshed on every render so the rAF
 * loop never has to be torn down and rebuilt when a control changes. */
interface Frame {
    count: number
    ringRadius: number
    baseScale: number
    hover: boolean
    hoverRadius: number
    falloff: number
    push: number
    grow: number
    tilt: number
    twist: number
    scrollLerp: number
    scrollTotalPx: number
    entryFraction: number
    lapProgress: number
    spanDeg: number
    zoomScale: number
    lift: number
}

/* -------------------------------------------------------------- component */

export default function CircularGallery({
    images = ["https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dXNlciUyMHByb2ZpbGUlMjBpbWFnZXxlbnwwfHwwfHx8MA%3D%3D","https://images.unsplash.com/photo-1654110455429-cf322b40a906?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8dXNlciUyMHByb2ZpbGUlMjBpbWFnZXxlbnwwfHwwfHx8MA%3D%3D","https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8dXNlciUyMHByb2ZpbGUlMjBpbWFnZXxlbnwwfHwwfHx8MA%3D%3D","https://images.unsplash.com/photo-1584999734482-0361aecad844?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8dXNlciUyMHByb2ZpbGUlMjBpbWFnZXxlbnwwfHwwfHx8MA%3D%3D","https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2V8ZW58MHx8MHx8fDA%3D","https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8dXNlciUyMHByb2ZpbGUlMjBpbWFnZXxlbnwwfHwwfHx8Mg%3D%3D","https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2V8ZW58MHx8MHx8fDI%3D","https://images.unsplash.com/photo-1534126416832-a88fdf2911c2?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2V8ZW58MHx8MHx8fDI%3D","https://images.unsplash.com/photo-1695013079138-d39ea65ab0b6?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2V8ZW58MHx8MHx8fDI%3D","https://images.unsplash.com/photo-1614321375197-c5083895b054?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHVzZXIlMjBwcm9maWxlJTIwaW1hZ2V8ZW58MHx8MHx8fDI%3D"],
    background = "#000000",
    count = 25,
    ringRadius = 224,
    card,
    zoom = 5,
    zoomOffset = 0,
    scrollSensitivity = 5,
    smoothing = 10,
    style,
}: CircularGalleryProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const stageRef = useRef<HTMLDivElement | null>(null)
    const ringRef = useRef<HTMLDivElement | null>(null)
    const cardRefs = useRef<(HTMLDivElement | null)[]>([])

    const [size, setSize] = useState({ width: 0, height: 0 })
    /** Coarse pointers get no hover flip — it would fire once and stick, the
     * same reason the original switched the effect off under 1000px. */
    const [pointerFine, setPointerFine] = useState(false)

    /* ---- groups, filled in from the defaults so a partial object is fine */
    const cardOpts = { ...DEFAULT_CARD, ...card }

    /* ---- source list: user images, or placeholders when the array is empty */
    const source = useMemo<(string | null)[]>(() => {
        const resolved = (images ?? []).map(resolveSrc).filter(Boolean)
        return resolved.length
            ? (resolved as string[])
            : Array.from({ length: PLACEHOLDER_COUNT }, () => null)
    }, [images])

    const cardCount = Math.max(1, Math.round(count))

    /* ---- the scroll axis, laid out in cards ------------------------------
     * A couple of cards' worth of wheel buys the fly-in, then one card's worth
     * each for the rest of the ring. Card 0 is at twelve o'clock the moment the
     * fly-in lands and card n-1 is there at the end of the first pass — but the
     * axis does not stop there. One lap is exactly 360° of ring, so scrolling
     * on wraps seamlessly back to card 0 and keeps going. */
    const totalCards = Math.max(1, ENTRY_CARDS + (cardCount - 1))
    const entryFraction = ENTRY_CARDS / totalCards
    const spanDeg = ((cardCount - 1) * 360) / cardCount
    const lapProgress =
        (1 - entryFraction) * (cardCount / Math.max(1, cardCount - 1))

    /* ---- derived motion: abstract 0–10 scales mapped to real units */
    // Shrink to fit the frame the way the original stepped the gallery down at
    // its viewport breakpoints — continuously here, and never past 1:1 so the
    // artwork is not blown up. This is also the whole responsive story: laptop,
    // tablet and phone get the same composition with a smaller ring and
    // proportionally smaller cards.
    const span = 2 * ringRadius + Math.hypot(cardOpts.width, cardOpts.height)
    const baseScale =
        size.width > 0 && size.height > 0 && span > 0
            ? Math.max(0.01, Math.min(1, Math.min(size.width, size.height) / span))
            : 1

    const scrollLerp = clamp(0.16 - clamp(smoothing, 0, 10) * 0.012, 0.03, 0.16)
    const scrollPerCard = 400 - clamp(scrollSensitivity, 0, 10) * 32
    const scrollTotalPx = Math.max(1, scrollPerCard * totalCards)

    // Screen-space reach of the hover effect, scaled with the ring so it covers
    // the same share of the picture in a small frame as in a large one. Falloff
    // keeps the original's 2:1 relationship to the reach.
    const hoverRadius = (100 + HOVER_REACH * 80) * baseScale
    // Zoom is relative to the fitted scale, so a small frame gets a
    // proportionally smaller close-up rather than a card that overflows it.
    const zoomScale = clamp(zoom, 0.5, 20) * baseScale
    // Lift the ring so the focused card — sitting at local y = -radius and
    // blown up by the zoom — lands `zoomOffset` px from the frame's centre.
    const lift = ringRadius * zoomScale + zoomOffset

    const scene = useRef<Scene>({
        cards: [],
        parallax: {
            currentX: 0,
            targetX: 0,
            currentY: 0,
            targetY: 0,
            currentZ: 0,
            targetZ: 0,
        },
        ring: { x: 0, y: 0, rotation: 0, scale: 1 },
        progressTarget: 0,
        progressCurrent: 0,
        entry: 0,
    })

    /* ---- live config for the frame loop (written during render, read in rAF) */
    const frame = useRef<Frame>({
        count: cardCount,
        ringRadius,
        baseScale,
        hover: false,
        hoverRadius,
        falloff: 1,
        push: 0,
        grow: 0,
        tilt: 0,
        twist: 0,
        scrollLerp,
        scrollTotalPx,
        entryFraction,
        lapProgress,
        spanDeg,
        zoomScale,
        lift,
    })
    frame.current = {
        count: cardCount,
        ringRadius,
        baseScale,
        hover: pointerFine,
        hoverRadius,
        falloff: Math.max(1, hoverRadius / 2),
        push: HOVER_STRENGTH * 10,
        grow: HOVER_STRENGTH * 0.06,
        tilt: HOVER_PARALLAX * 3,
        twist: HOVER_PARALLAX,
        scrollLerp,
        scrollTotalPx,
        entryFraction,
        lapProgress,
        spanDeg,
        zoomScale,
        lift,
    }

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

    /* ---- the frame loop */
    useEffect(() => {
        let raf = 0
        let last = 0

        const paint = () => {
            const config = frame.current
            const state = scene.current
            // The hover flip and the pointer tilt fade out as the camera flies
            // in, damped rather than zeroed — nothing to fight on the way back,
            // and scrolling out hands the ring straight back to the pointer.
            const weight = 1 - state.entry

            const stage = stageRef.current
            if (stage) {
                const { currentX, currentY, currentZ } = state.parallax
                stage.style.transform = `rotate(${currentZ * weight}deg) rotateX(${
                    currentX * weight
                }deg) rotateY(${currentY * weight}deg)`
            }

            const ringNode = ringRef.current
            if (ringNode) {
                const { x, y, rotation, scale } = state.ring
                ringNode.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`
            }

            for (let i = 0; i < state.cards.length; i += 1) {
                const node = cardRefs.current[i]
                if (!node) continue
                const item = state.cards[i]
                const x =
                    config.ringRadius * Math.cos(item.angle) +
                    item.currentX * weight
                const y =
                    config.ringRadius * Math.sin(item.angle) +
                    item.currentY * weight
                const spin = (item.angle * 180) / Math.PI + 90
                const twistY = item.currentRotation * weight
                const scale = 1 + (item.currentScale - 1) * weight
                node.style.transform = `perspective(${CARD_PERSPECTIVE}px) translate3d(${x}px, ${y}px, 0) rotate(${spin}deg) rotateY(${twistY}deg) scale(${scale})`
            }
        }

        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            const dt = last ? Math.min(0.064, (now - last) / 1000) : 1 / 60
            last = now

            const config = frame.current
            const state = scene.current
            syncCards(state, config.count)

            /* --- scroll: the wheel writes a target, the ring only ever rides
               the eased value, so a fling cannot jump a card. */
            const sk = 1 - Math.pow(1 - config.scrollLerp, dt * 60)
            state.progressCurrent +=
                (state.progressTarget - state.progressCurrent) * sk

            // A completed lap is subtracted from both values at once. One lap
            // is exactly 360° of ring, so the picture does not move a pixel —
            // it only keeps the numbers small however long the reader scrolls.
            const lapEnd = config.entryFraction + config.lapProgress
            if (state.progressCurrent >= lapEnd) {
                state.progressCurrent -= config.lapProgress
                state.progressTarget -= config.lapProgress
            }

            const progress = state.progressCurrent
            const entry = smoothstep(
                clamp(progress / config.entryFraction, 0, 1)
            )
            const ride =
                config.entryFraction < 1
                    ? Math.max(
                          0,
                          (progress - config.entryFraction) /
                              (1 - config.entryFraction)
                      )
                    : 0
            state.entry = entry

            /* --- hover, still lerping underneath; `paint` damps it by entry */
            // Frame-rate independent form of the original's fixed 0.15 lerp.
            const k = 1 - Math.pow(1 - HOVER_LERP, dt * 60)
            const p = state.parallax
            p.currentX += (p.targetX - p.currentX) * k
            p.currentY += (p.targetY - p.currentY) * k
            p.currentZ += (p.targetZ - p.currentZ) * k

            for (const item of state.cards) {
                item.currentRotation +=
                    (item.targetRotation - item.currentRotation) * k
                item.currentScale += (item.targetScale - item.currentScale) * k
                item.currentX += (item.targetX - item.currentX) * k
                item.currentY += (item.targetY - item.currentY) * k
            }

            /* --- the ring: fly in over the entry, then turn, and keep turning */
            state.ring.x = 0
            state.ring.scale =
                config.baseScale + (config.zoomScale - config.baseScale) * entry
            state.ring.y = config.lift * entry
            state.ring.rotation = -ride * config.spanDeg

            paint()
        }

        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [])

    /* ---- the scroll controller. It only ever writes `progressTarget`; the
     * frame loop eases the ring toward it. */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        const state = scene.current

        const advance = (deltaPx: number) => {
            // No ceiling: forward scroll loops the ring for as long as the
            // reader keeps going. The floor is the rest pose.
            state.progressTarget = Math.max(
                0,
                state.progressTarget + deltaPx / frame.current.scrollTotalPx
            )
        }

        /** The wheel goes back to the page only once the ring has been wound
         * all the way back to its rest pose and the reader is still scrolling
         * up. Forward never gives it up — the sequence loops instead. */
        const spent = (delta: number) => delta < 0 && state.progressTarget <= 0

        const onWheel = (event: WheelEvent) => {
            let delta = event.deltaY
            if (event.deltaMode === 1) delta *= 16
            else if (event.deltaMode === 2) delta *= node.clientHeight || 800
            delta = clamp(delta, -WHEEL_CLAMP, WHEEL_CLAMP)
            if (spent(delta)) return
            event.preventDefault()
            advance(delta)
        }

        let touchY: number | null = null
        const onTouchStart = (event: TouchEvent) => {
            touchY = event.touches[0]?.clientY ?? null
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
            if (spent(delta)) return
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
        const percentX = centreX ? (pointerX - centreX) / centreX : 0
        const percentY = centreY ? (pointerY - centreY) / centreY : 0

        state.parallax.targetY = percentX * config.tilt
        state.parallax.targetX = -percentY * config.tilt
        state.parallax.targetZ = (percentX + percentY) * config.twist

        for (const item of state.cards) {
            // Card centres are derived rather than measured — one layout read
            // per card per pointer move is what makes the original stutter.
            const cardX =
                centreX +
                config.baseScale *
                    (config.ringRadius * Math.cos(item.angle) + item.currentX)
            const cardY =
                centreY +
                config.baseScale *
                    (config.ringRadius * Math.sin(item.angle) + item.currentY)
            const distance = Math.hypot(pointerX - cardX, pointerY - cardY)

            if (distance < config.hoverRadius) {
                const force = Math.max(0, 1 - distance / config.falloff)
                const move = config.push * force
                item.targetRotation = 180 * force
                item.targetScale = 1 + config.grow * force
                item.targetX = move * Math.cos(item.angle)
                item.targetY = move * Math.sin(item.angle)
            } else {
                item.targetRotation = 0
                item.targetScale = 1
                item.targetX = 0
                item.targetY = 0
            }
        }
    }

    const handleLeave = () => {
        const state = scene.current
        for (const item of state.cards) {
            item.targetRotation = 0
            item.targetScale = 1
            item.targetX = 0
            item.targetY = 0
        }
        state.parallax.targetX = 0
        state.parallax.targetY = 0
        state.parallax.targetZ = 0
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
                // Left pannable on purpose: the ring claims a swipe by
                // cancelling the first touchmove, and stops claiming once it is
                // back at rest, so the page can scroll away from the section.
                touchAction: "manipulation",
                ...style,
            }}
        >
            <div
                ref={stageRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transformStyle: "preserve-3d",
                    perspective: `${STAGE_PERSPECTIVE}px`,
                    willChange: "transform",
                }}
            >
                <div
                    ref={ringRef}
                    style={{
                        position: "relative",
                        width: 0,
                        height: 0,
                        transformOrigin: "center",
                        willChange: "transform",
                    }}
                >
                    {Array.from({ length: cardCount }, (_, index) => {
                        const src = source[index % source.length]
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
                                            background: placeholderFill(index),
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
