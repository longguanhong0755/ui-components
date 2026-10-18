"use client"

/**
 * RadialCardCarousel
 *
 * A 3D wheel carousel that arranges IMAGES along a circular arc. Drag momentum
 * physics with pointer capture, click-to-center, mouse wheel, auto-play, and
 * scale / opacity / brightness falloff with distance from the front of the wheel.
 */
import * as React from "react"
import { useRef, useEffect, useCallback, useMemo, useState } from "react"
import { animate } from "motion/react"

/**
 * motion's `animate()` option bag. `AnimationOptions` is not exported by
 * the copy of motion that ships inside Framer, and its `Transition` type
 * is not assignable to what `animate(value, …)` accepts, so the shape is
 * spelled out here — a type alias, not an interface, or it loses the implicit
 * index signature the intersection needs.
 */
type Motion = {
    type?: "spring" | "tween" | "keyframes" | "inertia"
    duration?: number
    ease?: [number, number, number, number]
    delay?: number
    stiffness?: number
    damping?: number
    mass?: number
    bounce?: number
    restSpeed?: number
    restDelta?: number
}

/**
 * The snap the carousel shipped with: a hand-rolled 1000ms easeOutCubic rAF
 * tween. It is a real Transition now (rule 2), so a designer gets native Spring
 * physics and the wheel can overshoot its stop and settle back.
 */
const DEFAULT_TRANSITION: Motion = {
    type: "tween",
    // easeOutCubic, as the cubic-bezier the tuple type needs.
    ease: [0.33, 1, 0.68, 1],
    mass: 1,
    damping: 60,
    duration: 1,
    stiffness: 800,
}

/**
 * The flick release used a 500ms snap where a click used 1000ms. One Transition
 * cannot carry two durations, so the release keeps its half-length feel by
 * scaling whatever the control says — a tween's duration, a spring's stiffness.
 */
const FLICK_SCALE = 0.5

/** Pointer travel under this many px is a click, not a drag. */
const CLICK_SLOP = 6

/**
 * Distance falloff. The front card is scaled UP, so the wheel's real extent is
 * not `radius` — it is `SCALE_NEAR * cornerDistance`. One helper, used by both
 * the per-frame write and the fit, so the two can never drift apart.
 */
const SCALE_NEAR = 1.18
const SCALE_FALLOFF = 0.65
const scaleAtRatio = (ratio: number) => SCALE_NEAR - ratio * SCALE_FALLOFF

/** Breathing room left around the fitted wheel. */
const FIT_MARGIN = 0.96

/**
 * Frozen default of the cut `Size` control (rule 11b: the panel row goes, the
 * render path does not). It was a control that lied — the card width AND the
 * wheel radius are both linear in it, so the auto-fit divided it straight back
 * out and a 20× change moved the rendered pixels by 0.6%. `Scale` is the dial
 * that actually resizes the wheel; this only sets the card's base proportion,
 * which `aspect` then shapes.
 */
const CARD_BASE = 220

const DEFAULT_IMAGES: string[] = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=600&q=80",
]

/** The designed default of the `items` prop. */
const DEFAULT_ITEMS: string[] = [
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8cGVyc29ufGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8cGVyc29ufGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHBlcnNvbnxlbnwwfHwwfHx8MA%3D%3D",
    "https://plus.unsplash.com/premium_photo-1690587673708-d6ba8a1579a5?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzN8fHBlcnNvbnxlbnwwfHwwfHx8MA%3D%3D",
    "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NTB8fHBlcnNvbnxlbnwwfHwwfHx8MA%3D%3D",
]

export interface RadialCardCarouselProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, "style"> {
    /** Image array — a URL string per card. */
    items?: string[]
    background?: string
    /** Percent of the auto-fit: 100 fills the frame, above it the wheel crops. */
    scale?: number
    /** Card height as a percent of its width — the shape dial. */
    aspect?: number
    /** Percent of the max radius — half the short side (rule 7). */
    rounded?: number
    /** Signed: 0 stops it, sign is the travel direction, 50 is the shipped 3s step. */
    speed?: number
    transition?: Motion
    style?: React.CSSProperties
}

export default function RadialCardCarousel(props: RadialCardCarouselProps) {
    const {
        items = DEFAULT_ITEMS,
        background = "#0a0a0f",
        scale = 64,
        aspect = 136,
        rounded = 24,
        speed = 100,
        transition = DEFAULT_TRANSITION,
        style,
        ...rest
    } = props

    // Live input in a ref: `animateTo` is a useCallback and a fresh Transition
    // object every render would otherwise rebuild it, and every callback that
    // depends on it, on each render (rule G).
    const transitionRef = useRef(transition)
    transitionRef.current = transition

    const outerRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const carouselRef = useRef<HTMLDivElement>(null)
    const cardsRef = useRef<(HTMLDivElement | null)[]>([])
    const rotationRef = useRef<number>(0)
    const animFrameRef = useRef<number>(0)
    const snapAnim = useRef<{ stop: () => void } | null>(null)
    const isDraggingRef = useRef<boolean>(false)
    const autoPlayTimerRef = useRef<number>(0)

    const [containerSize, setContainerSize] = useState({ w: 1200, h: 800 })

    const dragInfo = useRef({
        startX: 0,
        lastX: 0,
        lastTime: 0,
        velocity: 0,
        moved: 0,
        downIndex: -1,
    })

    const sources = useMemo(() => {
        const list = (items ?? []).filter(Boolean)
        return list.length > 0 ? list : DEFAULT_IMAGES
    }, [items])

    const multiplier = useMemo(
        () => (sources.length === 0 ? 0 : Math.max(1, Math.ceil(10 / sources.length))),
        [sources.length]
    )

    const CARDS = useMemo(
        () =>
            Array(multiplier)
                .fill(null)
                .flatMap((_, i) => sources.map((src, j) => ({ src, id: `img-${i}-${j}` }))),
        [sources, multiplier]
    )

    const anglePerCard = CARDS.length > 0 ? 360 / CARDS.length : 0
    // The props drive the box directly — no ResizeObserver on a card, because
    // the card is no longer arbitrary user content whose size must be measured.
    const cardW = CARD_BASE
    const cardH = Math.max(1, Math.round((CARD_BASE * aspect) / 100))
    // Percent of the MAXIMUM radius = half the short side (rule 7). A CSS
    // percentage border-radius resolves per axis and would give an ellipse.
    const cardRadius = (Math.min(cardW, cardH) / 2) * (Math.min(100, Math.max(0, rounded)) / 100)

    const radius = useMemo(() => {
        const total = CARDS.length
        if (total <= 1) return cardH * 1.2
        const arcTarget = cardW * 0.65
        const R = arcTarget / (2 * Math.sin(Math.PI / total))
        return Math.max(R, cardH * 1.1)
    }, [CARDS.length, cardW, cardH])

    /**
     * The wheel's real swept box, not a `radius * 2.4` guess.
     *
     * A card is scaled about the WHEEL CENTRE (its transform-origin is the hub),
     * and the front card is scaled UP to 1.18 — so the top extent is
     * `1.18 * cornerDistance`, well past `radius`, and it was being clipped.
     * The box is also lopsided: the back card is at 0.53, so the wheel spans far
     * more above the hub than below it, and centring the HUB left ~180px dead at
     * the bottom while the top ran off the edge.
     *
     * Sweep every angle a card can occupy (the wheel spins, so the union over
     * 0–360° is the envelope), take the four corners at that angle's scale, and
     * fit + recentre THAT box.
     */
    const fit = useMemo(() => {
        if (containerSize.w === 0 || containerSize.h === 0 || CARDS.length === 0) {
            return { scale: 0.65, dx: 0, dy: 0 }
        }
        let minX = Infinity
        let maxX = -Infinity
        let minY = Infinity
        let maxY = -Infinity
        for (let deg = 0; deg < 360; deg += 2) {
            let normalized = deg
            if (normalized > 180) normalized -= 360
            const s = scaleAtRatio(Math.abs(normalized) / 180)
            const rad = (deg * Math.PI) / 180
            const c = Math.cos(rad)
            const sn = Math.sin(rad)
            // Card box relative to the hub, before its rotate/scale.
            for (const x of [-cardW / 2, cardW / 2]) {
                for (const y of [-radius, -radius + cardH]) {
                    const px = x * s
                    const py = y * s
                    // CSS rotate() with a y-down axis is the plain rotation matrix.
                    const rx = px * c - py * sn
                    const ry = px * sn + py * c
                    if (rx < minX) minX = rx
                    if (rx > maxX) maxX = rx
                    if (ry < minY) minY = ry
                    if (ry > maxY) maxY = ry
                }
            }
        }
        const boxW = maxX - minX
        const boxH = maxY - minY
        // Scale is a percent OF the fit, so 100 always fills the frame whatever
        // the image count or aspect, and the dial reads the same on every setup.
        const zoom =
            Math.min(containerSize.w / boxW, containerSize.h / boxH) *
            FIT_MARGIN *
            (Math.max(1, scale) / 100)
        // Centre the CONTENT box, not the hub. Translate is in the unscaled outer
        // space and applies after the scale, so the offset carries the scale.
        return {
            scale: zoom,
            dx: -((minX + maxX) / 2) * zoom,
            dy: -((minY + maxY) / 2) * zoom,
        }
    }, [containerSize, radius, cardW, cardH, CARDS.length, scale])

    useEffect(() => {
        const el = outerRef.current
        if (!el) return
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect
            if (width > 0 && height > 0) setContainerSize({ w: width, h: height })
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const updateCardScales = useCallback(() => {
        const currentRot = rotationRef.current
        cardsRef.current.forEach((card, index) => {
            if (!card) return
            const baseAngle = index * anglePerCard
            const cardAngle = baseAngle + currentRot
            let normalized = cardAngle % 360
            if (normalized > 180) normalized -= 360
            if (normalized < -180) normalized += 360
            const dist = Math.abs(normalized)
            const ratio = dist / 180
            const scale = scaleAtRatio(ratio)
            const opacity = 1 - ratio * 0.55
            const brightness = 1 - ratio * 0.65
            const zIndex = Math.round(1000 - dist)

            card.style.transform = `rotate(${baseAngle}deg) scale(${scale})`
            card.style.opacity = String(opacity)
            card.style.filter = `brightness(${brightness})`
            card.style.zIndex = String(zIndex)
        })
    }, [anglePerCard])

    // A value tween: motion drives 0 -> 1 and the callback writes the
    // rotation, so `rotationRef` stays the single source of truth the drag
    // handlers already write to, and the Transition owns only the curve. A
    // spring can therefore carry the wheel past its stop and settle back —
    // something the fixed easeOutCubic ramp could never do.
    const animateTo = useCallback(
        (target: number, scale = 1) => {
            snapAnim.current?.stop()
            const start = rotationRef.current
            const delta = target - start
            const t = transitionRef.current
            const opts: Motion =
                scale === 1
                    ? t
                    : {
                          ...t,
                          ...(typeof t.duration === "number"
                              ? { duration: t.duration * scale }
                              : {}),
                          ...(typeof t.stiffness === "number"
                              ? { stiffness: t.stiffness / (scale * scale) }
                              : {}),
                      }
            snapAnim.current = animate(0, 1, {
                ...opts,
                onUpdate: (p: number) => {
                    rotationRef.current = start + delta * p
                    if (carouselRef.current) {
                        carouselRef.current.style.transform = `rotate(${rotationRef.current}deg)`
                    }
                    updateCardScales()
                },
            })
        },
        [updateCardScales]
    )

    const navigate = useCallback(
        (direction: number) => {
            if (CARDS.length === 0) return
            cancelAnimationFrame(animFrameRef.current)
            snapAnim.current?.stop()
            const target = rotationRef.current + anglePerCard * direction * -1
            const snapped = Math.round(target / anglePerCard) * anglePerCard
            animateTo(snapped)
        },
        [anglePerCard, animateTo, CARDS.length]
    )

    /**
     * Bring one card to the front. Its resting rotation is `-index * angle`, but
     * the wheel has spun any number of full turns by now, so pick the congruent
     * target nearest the CURRENT rotation — otherwise clicking a neighbour can
     * unwind the whole wheel the long way round.
     */
    const goToIndex = useCallback(
        (index: number) => {
            if (CARDS.length === 0) return
            cancelAnimationFrame(animFrameRef.current)
            snapAnim.current?.stop()
            const base = -index * anglePerCard
            const turns = Math.round((rotationRef.current - base) / 360)
            animateTo(base + turns * 360)
        },
        [anglePerCard, animateTo, CARDS.length]
    )

    const handlePointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (CARDS.length === 0) return
            isDraggingRef.current = true
            cancelAnimationFrame(animFrameRef.current)
            snapAnim.current?.stop()
            dragInfo.current.startX = e.clientX
            dragInfo.current.lastX = e.clientX
            dragInfo.current.lastTime = Date.now()
            dragInfo.current.velocity = 0
            dragInfo.current.moved = 0
            // Read the card under the press here: pointer capture retargets every
            // later event to the container, so `e.target` on pointerup is useless.
            const hit = (e.target as HTMLElement | null)?.closest?.("[data-index]")
            dragInfo.current.downIndex = hit ? Number((hit as HTMLElement).dataset.index) : -1

            if (containerRef.current) {
                containerRef.current.setPointerCapture(e.pointerId)
                containerRef.current.style.cursor = "grabbing"
            }
        },
        [CARDS.length]
    )

    const handlePointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!isDraggingRef.current) return
            const currentX = e.clientX
            const deltaX = currentX - dragInfo.current.lastX
            const now = Date.now()
            const dt = now - dragInfo.current.lastTime
            if (dt > 0) {
                dragInfo.current.velocity = deltaX / dt
            }
            dragInfo.current.moved = Math.abs(currentX - dragInfo.current.startX)
            rotationRef.current += deltaX * 0.25
            if (carouselRef.current) {
                carouselRef.current.style.transform = `rotate(${rotationRef.current}deg)`
            }
            updateCardScales()
            dragInfo.current.lastX = currentX
            dragInfo.current.lastTime = now
        },
        [updateCardScales]
    )

    const handlePointerUp = useCallback(
        (e?: React.PointerEvent<HTMLDivElement>) => {
            if (!isDraggingRef.current) return
            isDraggingRef.current = false
            if (containerRef.current) {
                containerRef.current.style.cursor = "grab"
                if (e && e.pointerId !== undefined) {
                    try {
                        containerRef.current.releasePointerCapture(e.pointerId)
                    } catch {}
                }
            }
            // A press that never travelled is a click on that image.
            if (dragInfo.current.moved < CLICK_SLOP && dragInfo.current.downIndex >= 0) {
                goToIndex(dragInfo.current.downIndex)
                return
            }
            const inertiaFactor = 120
            const projectedDelta = dragInfo.current.velocity * inertiaFactor
            const targetRotation = rotationRef.current + projectedDelta
            const snapped = Math.round(targetRotation / anglePerCard) * anglePerCard
            animateTo(snapped)
        },
        [anglePerCard, animateTo, goToIndex]
    )

    const handleWheel = useCallback(
        (e: React.WheelEvent<HTMLDivElement>) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
            cancelAnimationFrame(animFrameRef.current)
            snapAnim.current?.stop()
            const delta = e.deltaY * 0.15
            rotationRef.current -= delta
            if (carouselRef.current) {
                carouselRef.current.style.transform = `rotate(${rotationRef.current}deg)`
            }
            updateCardScales()

            window.clearTimeout((handleWheel as any).timeout)
            ;(handleWheel as any).timeout = window.setTimeout(() => {
                const snapped = Math.round(rotationRef.current / anglePerCard) * anglePerCard
                animateTo(snapped, FLICK_SCALE)
            }, 150)
        },
        [anglePerCard, animateTo, updateCardScales]
    )

    // First card front-of-wheel on mount, and re-seed when the ring is rebuilt.
    useEffect(() => {
        if (CARDS.length === 0) return
        rotationRef.current = 0
        if (carouselRef.current) {
            carouselRef.current.style.transform = "rotate(0deg)"
        }
        updateCardScales()
    }, [anglePerCard, updateCardScales, CARDS.length, radius])

    useEffect(() => {
        if (speed === 0 || CARDS.length === 0) return
        // One signed dial: the sign is the direction, the magnitude the rate.
        // 50 reproduces the 3000ms step the carousel shipped with.
        const dir = speed < 0 ? -1 : 1
        const autoPlayInterval = (3000 * 50) / Math.abs(speed)
        autoPlayTimerRef.current = window.setInterval(() => {
            if (!isDraggingRef.current) {
                navigate(dir)
            }
        }, autoPlayInterval)
        return () => clearInterval(autoPlayTimerRef.current)
    }, [speed, navigate, CARDS.length])

    useEffect(() => {
        return () => {
            cancelAnimationFrame(animFrameRef.current)
            snapAnim.current?.stop()
        }
    }, [])

    return (
        <div
            {...rest}
            ref={outerRef}
            style={{
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                position: "relative",
                overflow: "hidden",
                userSelect: "none",
                touchAction: "none",
                backgroundColor: background,
                ...style,
            }}
        >
            <div
                ref={containerRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "grab",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
            >
                <div
                    style={{
                        transform: `translate(${fit.dx}px, ${fit.dy}px) scale(${fit.scale})`,
                        transformOrigin: "center",
                    }}
                >
                    <div
                        ref={carouselRef}
                        style={{
                            position: "relative",
                            width: 0,
                            height: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {CARDS.map((card, index) => {
                            const baseAngle = (index / CARDS.length) * 360
                            return (
                                <div
                                    key={card.id}
                                    ref={(el) => {
                                        cardsRef.current[index] = el
                                    }}
                                    data-index={index}
                                    style={{
                                        position: "absolute",
                                        left: -(cardW / 2),
                                        top: -radius,
                                        width: cardW,
                                        height: cardH,
                                        transformOrigin: `50% ${radius}px`,
                                        transform: `rotate(${baseAngle}deg)`,
                                        willChange: "transform, opacity, filter",
                                    }}
                                >
                                    <img
                                        src={card.src}
                                        alt=""
                                        draggable={false}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            display: "block",
                                            borderRadius: cardRadius,
                                            pointerEvents: "none",
                                            backgroundColor: "#16161e",
                                        }}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

RadialCardCarousel.displayName = "Radial Image Carousel"
