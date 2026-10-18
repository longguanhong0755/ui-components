// @ts-nocheck
import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, animate } from "framer-motion"

const FALLBACK_IMAGES = [
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/5f084e5a-2e3f-4239-be1a-5084a6dcef00/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9652cf81-4644-4471-1122-4e40ef6e2600/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/1640f8fe-2cb1-4026-88e3-10dd0019f400/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/20fd03c3-49d6-408c-3ac9-8c5a6ed2b500/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4b1ec233-9a09-4483-1adb-404a93094100/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8fd4d2a3-a363-4658-d6ee-84790bc8f300/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3ad8e2bd-dc38-49ba-d186-1a5ab1428d00/w=800",
]

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 620
 */
function __BaseImpl_ProximityOrbit(__props) {
    const {
        images = [],
        orbitRadius = 12,
        imageScale = 10,
        imageFit = "cover",
        rounded = 0,
        opacity = 100,
        movementType = "continuous",
        direction = "counterclockwise",
        speed = 3,
        stepTransition = { duration: 0.5, ease: "easeInOut" },
        stackDirection = "lastToFirst",
        hoverAnimation = { type: "speedUp", speedMultiplier: 5 },
        style,
    } = { ...COMPONENT_DEFAULTS, ...__props }
    // Unpack hover sub-props
    const hoverType = hoverAnimation?.type ?? "none"
    const hoverSpeedMult = hoverAnimation?.speedMultiplier ?? 5
    // scale / opacity only used by "pause" type
    const hoverScaleVal = hoverAnimation?.scale ?? 6
    const hoverOpacityVal = hoverAnimation?.opacity ?? 100

    // ── State / refs ──────────────────────────────────────────────────────────
    const containerRef = useRef(null)
    const [rotation, setRotation] = useState(0)
    const [hoveredIndex, setHoveredIndex] = useState(null) // per-image (pause scale/opacity)
    const [liveSpeedMult, setLiveSpeedMult] = useState(1)
    const [isPaused, setIsPaused] = useState(false)

    const rotRef = useRef(0)
    const rafRef = useRef(null)
    const lastTimeRef = useRef(null)
    const stepAngleRef = useRef(0)

    // Mirror latest prop values into refs so animation loops read them
    // without needing to be restarted on every prop change.
    const hoverTypeRef = useRef(hoverType)
    const hoverSpeedRef = useRef(hoverSpeedMult)
    const liveSpeedRef = useRef(liveSpeedMult)
    const dirMultRef = useRef(direction === "counterclockwise" ? -1 : 1)
    hoverTypeRef.current = hoverType
    hoverSpeedRef.current = hoverSpeedMult
    liveSpeedRef.current = liveSpeedMult
    dirMultRef.current = direction === "counterclockwise" ? -1 : 1

    // ── Derived values ────────────────────────────────────────────────────────
    const radiusPx = orbitRadius * 24 // 1 → 24 px … 20 → 480 px
    const imageSizePx = imageScale * 20 // 1 → 20 px … 20 → 400 px
    // 0 = boxy (0%) … 20 = full rounded (50%). Linear spread between.
    const borderRadiusPct = (Math.max(0, Math.min(20, rounded)) / 20) * 50

    const imgs =
        Array.isArray(images) && images.length > 0 ? images : FALLBACK_IMAGES
    const hasImages = imgs.length > 0
    const n = hasImages ? imgs.length : 0

    // speed 1 = 20 s/rev, 5 = 4 s/rev, 10 = 2 s/rev
    const revDurationMs = (20 / speed) * 1000
    const stepDurationMs = n > 0 ? revDurationMs / n : revDurationMs

    // ── Continuous rotation via rAF ───────────────────────────────────────────
    useEffect(() => {
        if (movementType !== "continuous" || !hasImages) return
        if (isPaused) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            lastTimeRef.current = null
            return
        }

        const tick = (ts) => {
            if (lastTimeRef.current === null) lastTimeRef.current = ts
            const dt = Math.min(ts - lastTimeRef.current, 100)
            lastTimeRef.current = ts
            // dirMultRef handles CW (+1) vs CCW (−1) without restarting the loop
            const degsPerMs =
                (360 / revDurationMs) *
                liveSpeedRef.current *
                dirMultRef.current
            rotRef.current = rotRef.current + dt * degsPerMs
            setRotation(rotRef.current)
            rafRef.current = requestAnimationFrame(tick)
        }

        rafRef.current = requestAnimationFrame(tick)
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            lastTimeRef.current = null
        }
    }, [movementType, hasImages, revDurationMs, isPaused])

    // ── Step rotation via framer-motion animate() ─────────────────────────────
    // Animating the *angle* value means positions are recalculated every frame
    // through cos/sin → images travel the true circular arc, not a straight line.
    useEffect(() => {
        if (movementType !== "step" || n === 0 || isPaused) return

        let active = true
        let currentAnim = null

        const dirMult = direction === "counterclockwise" ? -1 : 1
        const stepSize = (360 / n) * dirMult

        // Respect liveSpeedMult (speed-up / speed-down hover)
        const effectiveDurationMs = stepDurationMs / liveSpeedMult
        const animMs = Math.max(effectiveDurationMs * 0.65, 150)
        const pauseMs = Math.max(effectiveDurationMs * 0.35, 100)

        // Build framer-motion animate options from the ControlType.Transition value.
        // Supports both tween (duration + ease) and spring.
        function makeAnimOpts(onUpdate, onComplete) {
            const base = { onUpdate, onComplete }
            if (stepTransition?.type === "spring") {
                return {
                    ...base,
                    type: "spring",
                    stiffness: stepTransition.stiffness ?? 100,
                    damping: stepTransition.damping ?? 15,
                    mass: stepTransition.mass ?? 1,
                }
            }
            return {
                ...base,
                duration: animMs / 1000,
                ease: stepTransition?.ease ?? "easeInOut",
            }
        }

        const doStep = () => {
            if (!active) return
            const from = stepAngleRef.current
            const to = from + stepSize
            stepAngleRef.current = to

            currentAnim = animate(
                from,
                to,
                makeAnimOpts(
                    (v) => {
                        if (active) setRotation(v)
                    },
                    () => {
                        if (active) setTimeout(doStep, pauseMs)
                    }
                )
            )
        }

        const timer = setTimeout(doStep, pauseMs)
        return () => {
            active = false
            clearTimeout(timer)
            if (currentAnim) currentAnim.stop()
        }
    }, [
        movementType,
        n,
        stepDurationMs,
        liveSpeedMult,
        isPaused,
        direction,
        stepTransition,
    ])

    // ── Reset on leaving the frame entirely (safety net) ──────────────────────
    const handleContainerLeave = useCallback(() => {
        setIsPaused(false)
        setLiveSpeedMult(1)
        setHoveredIndex(null)
    }, [])

    // ── Per-image hover ───────────────────────────────────────────────────────
    // All hover effects (pause / speed / scale / opacity) fire only when the
    // cursor is over an actual image — never over the center gap.
    const handleImageEnter = useCallback((index) => {
        const t = hoverTypeRef.current
        if (t === "pause") {
            setIsPaused(true)
        } else if (t === "speedUp") {
            setLiveSpeedMult(Math.max(hoverSpeedRef.current, 1))
        } else if (t === "speedDown") {
            setLiveSpeedMult(1 / Math.max(hoverSpeedRef.current, 1))
        }
        setHoveredIndex(index)
    }, [])

    const handleImageLeave = useCallback(() => {
        setIsPaused(false)
        setLiveSpeedMult(1)
        setHoveredIndex(null)
    }, [])

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            onMouseLeave={handleContainerLeave}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                ...style,
            }}
        >
            {hasImages &&
                imgs.map((src, i) => {
                    const baseAngle = (i / n) * 360
                    const totalAngleRad =
                        (baseAngle + rotation) * (Math.PI / 180)
                    const x = Math.cos(totalAngleRad) * radiusPx
                    const y = Math.sin(totalAngleRad) * radiusPx

                    // Scale / opacity changes only apply for "pause" type
                    const isHovered = hoveredIndex === i
                    const applyHover = isHovered && hoverType === "pause"

                    const targetScale = applyHover ? hoverScaleVal / 5 : 1
                    const targetOpacity = applyHover
                        ? hoverOpacityVal / 100
                        : opacity / 100

                    // When hovered (pause type), float the image above all siblings.
                    const baseZIndex =
                        stackDirection === "firstToLast" ? i + 1 : n - i
                    const zIndex = applyHover ? n + 10 : baseZIndex

                    return (
                        <div
                            key={i}
                            onMouseEnter={() => handleImageEnter(i)}
                            onMouseLeave={handleImageLeave}
                            style={{
                                position: "absolute",
                                left: "50%",
                                top: "50%",
                                zIndex,
                                willChange: "transform",
                                // Step mode: no CSS transition — framer-motion animate()
                                // drives the angle which recomputes x/y every frame.
                                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                            }}
                        >
                            <motion.div
                                animate={{
                                    opacity: targetOpacity,
                                    scale: targetScale,
                                }}
                                transition={{
                                    opacity: { duration: 0.2 },
                                    scale: { duration: 0.2 },
                                }}
                                style={{
                                    cursor:
                                        hoverType !== "none"
                                            ? "pointer"
                                            : "default",
                                    lineHeight: 0,
                                }}
                            >
                                <img
                                    src={src}
                                    alt=""
                                    draggable={false}
                                    style={{
                                        // cover: square box → circle at rounded 10.
                                        // contain: natural aspect → oval at 10.
                                        width: imageSizePx,
                                        height:
                                            imageFit === "cover"
                                                ? imageSizePx
                                                : "auto",
                                        objectFit: imageFit,
                                        display: "block",
                                        borderRadius: `${borderRadiusPct}%`,
                                        pointerEvents: "none",
                                        userSelect: "none",
                                    }}
                                />
                            </motion.div>
                        </div>
                    )
                })}
        </div>
    )
}

// ─── Property Controls ────────────────────────────────────────────────────────

const COMPONENT_DEFAULTS = {
    images: [
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/5f084e5a-2e3f-4239-be1a-5084a6dcef00/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9652cf81-4644-4471-1122-4e40ef6e2600/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/1640f8fe-2cb1-4026-88e3-10dd0019f400/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/20fd03c3-49d6-408c-3ac9-8c5a6ed2b500/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4b1ec233-9a09-4483-1adb-404a93094100/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8fd4d2a3-a363-4658-d6ee-84790bc8f300/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3ad8e2bd-dc38-49ba-d186-1a5ab1428d00/w=800",
    ],
    orbitRadius: 12,
    imageScale: 10,
    imageFit: "cover",
    rounded: 0,
    opacity: 100,
    movementType: "continuous",
    direction: "counterclockwise",
    speed: 3,
    stepTransition: { duration: 0.5, ease: "easeInOut" },
    stackDirection: "lastToFirst",
    hoverAnimation: {
        type: "speedUp",
        speedMultiplier: 5,
        scale: 6,
        opacity: 100,
    },
}

const __presetProps = {
  "speed": 3,
  "images": [
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/5f084e5a-2e3f-4239-be1a-5084a6dcef00/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9652cf81-4644-4471-1122-4e40ef6e2600/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/1640f8fe-2cb1-4026-88e3-10dd0019f400/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/20fd03c3-49d6-408c-3ac9-8c5a6ed2b500/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4b1ec233-9a09-4483-1adb-404a93094100/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8fd4d2a3-a363-4658-d6ee-84790bc8f300/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3ad8e2bd-dc38-49ba-d186-1a5ab1428d00/w=800"
  ],
  "opacity": 100,
  "rounded": 0,
  "imageFit": "cover",
  "direction": "counterclockwise",
  "imageScale": 7,
  "orbitRadius": 8,
  "movementType": "continuous",
  "hoverAnimation": {
    "type": "speedUp",
    "scale": 6,
    "opacity": 100,
    "speedMultiplier": 5
  },
  "stackDirection": "lastToFirst",
  "stepTransition": {
    "ease": "easeInOut",
    "mass": 1,
    "type": "spring",
    "damping": 60,
    "duration": 0.5,
    "stiffness": 800
  }
};

export default function ProximityOrbit(props: Record<string, unknown>) {
  return <__BaseImpl_ProximityOrbit {...(__presetProps as Record<string, unknown>)} {...props} />;
}
