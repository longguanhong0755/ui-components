"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { animate, type Transition } from "motion/react"

/**
 * GlowCounter
 *
 * A large glowing number with animated outline copies
 * arriving from behind and settling onto the main number.
 *
 * Features:
 * - Framer native font control
 * - Animated outline conveyor
 * - Pointer parallax
 * - Pointer-following highlight
 * - Landing flash
 * - Backlight glow
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */

type Props = {
    value?: number
    background?: string
    font?: React.CSSProperties
    color?: string
    transition?: Transition
    speed?: number
    hover?: boolean
    style?: React.CSSProperties
}

const DEFAULT_NUMBER_FONT: React.CSSProperties = {
    fontFamily:
        '"DM Serif Display", "Times New Roman", serif',
    fontWeight: 400,
    fontSize: 420,
    lineHeight: "1em",
    letterSpacing: "-0.02em",
}

/* -------------------------------- */
/* Animation constants */
/* -------------------------------- */

const SMOOTH = 6
const INTRO = 0.8

const COPIES = 2

const BACK = {
    x: -0.045,
    y: -0.085,
    scale: 0.94,
}

const DEPTH = {
    front: 0.03,
    back: 0.015,
}

const LAND_FADE = 3

const CONTACT = 0.25

const FLASH = {
    attack: 18,
    decay: 2.5,
}

const KICK = 0.012

const OUTLINE_BACK_OPACITY = 0.55

const IDLE = {
    ax: 0.35,
    ay: 0.25,
    fx: 0.5,
    fy: 0.37,
}

/* -------------------------------- */
/* Helpers */
/* -------------------------------- */

const fmt = new Intl.NumberFormat(
    "en-US",
    {
        maximumFractionDigits: 0,
    }
)

const clamp = (
    value: number,
    min: number,
    max: number
) =>
    Math.min(
        max,
        Math.max(min, value)
    )

const lerp = (
    a: number,
    b: number,
    t: number
) =>
    a +
    (b - a) * t

const mix = (
    color: string,
    percentage: number
) =>
    `color-mix(in srgb, ${color} ${percentage}%, transparent)`

/* -------------------------------- */
/* Outline positioning */
/* -------------------------------- */

function place(
    p: number,
    px: number,
    py: number
) {
    const depth = lerp(
        DEPTH.front,
        DEPTH.back,
        p
    )

    const x =
        BACK.x * p +
        px * depth

    const y =
        BACK.y * p +
        py * depth

    const scale =
        1 +
        (BACK.scale - 1) * p

    return `translate(${x}em, ${y}em) scale(${scale})`
}

/* -------------------------------- */
/* Outline visibility */
/* -------------------------------- */

function visibility(
    p: number
) {
    if (p >= 1) {
        return (
            OUTLINE_BACK_OPACITY *
            clamp(
                2 - p,
                0,
                1
            )
        )
    }

    return (
        lerp(
            1,
            OUTLINE_BACK_OPACITY,
            p
        ) *
        clamp(
            p * LAND_FADE,
            0,
            1
        )
    )
}

/* -------------------------------- */
/* Component */
/* -------------------------------- */

export default function GlowCounter(
    props: Props
) {
    const {
        value = 120,

        background = "#000000",

        font = {"variant":"Regular","fontSize":420,"textAlign":"left","fontFamily":"\"DM Serif Display\", \"Times New Roman\", serif","fontWeight":400,"lineHeight":"1em","letterSpacing":"-0.02em"},

        color = "#FFFFFF",

        transition = {
            type: "spring",
            duration: 1.1,
            bounce: 0.15,
            delay: 0.8,
        },

        speed = 100,

        hover = true,

        style,
    } = props

    /*
     * Native Framer font object
     */
    const numberFont = {
        ...DEFAULT_NUMBER_FONT,
        ...(font ?? {}),
    }

    const numberColor =
        color ??
        "#FFFFFF"

    const text =
        fmt.format(
            Math.max(
                0,
                Math.round(value)
            )
        )

    /* -------------------------------- */
    /* Refs */
    /* -------------------------------- */

    const rootRef =
        useRef<HTMLDivElement>(null)

    const filledRef =
        useRef<HTMLDivElement>(null)

    const glowRef =
        useRef<HTMLSpanElement>(null)

    const backlightRef =
        useRef<HTMLSpanElement>(null)

    const copyRefs =
        useRef<
            (HTMLDivElement | null)[]
        >(
            Array.from(
                {
                    length: COPIES,
                },
                () => null
            )
        )

    /* -------------------------------- */
    /* Live state */
    /* -------------------------------- */

    const live =
        useRef({
            hover,
            speed,
        })

    live.current.hover =
        hover

    live.current.speed =
        speed

    const phase =
        useRef(0)

    const pointer =
        useRef({
            inside: false,
            x: 0,
            y: 0,
        })

    /* -------------------------------- */
    /* Animation conveyor */
    /* -------------------------------- */

    const transitionKey =
        JSON.stringify(
            transition
        )

    useEffect(() => {
        const spec =
            transition as Exclude<
                Transition,
                { type: false }
            > & {
                from?: unknown
            }

        const {
            from: _ignored,
            ...tween
        } = spec

        let stopped = false

        let controls:
            | {
                  stop: () => void
              }
            | null = null

        const step = () => {
            if (stopped)
                return

            const from =
                phase.current

            const to =
                Math.round(from) +
                1

            const speedFactor =
                Math.max(
                    0.02,
                    live.current.speed
                ) / 50

            const scaledTween =
                typeof tween.duration ===
                "number"
                    ? {
                          ...tween,
                          duration:
                              tween.duration /
                              speedFactor,
                      }
                    : tween

            controls =
                animate(
                    from,
                    to,
                    {
                        ...scaledTween,

                        onUpdate: (
                            value: number
                        ) => {
                            phase.current =
                                value
                        },

                        onComplete: () => {
                            phase.current =
                                to %
                                COPIES

                            step()
                        },
                    }
                )
        }

        step()

        return () => {
            stopped = true
            controls?.stop()
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transitionKey])

    /* -------------------------------- */
    /* Render loop */
    /* -------------------------------- */

    useEffect(() => {
        const root =
            rootRef.current

        if (!root)
            return

        let raf = 0
        let last = -1
        let time = 0

        let sinceHit = 1000

        const previousDepth =
            Array.from(
                {
                    length: COPIES,
                },
                () => NaN
            )

        const current = {
            x: 0,
            y: 0,
        }

        /* ---------------------------- */
        /* Pointer */
        /* ---------------------------- */

        const onMove = (
            event: PointerEvent
        ) => {
            const rect =
                root.getBoundingClientRect()

            if (
                rect.width === 0 ||
                rect.height === 0
            ) {
                return
            }

            pointer.current.inside =
                true

            pointer.current.x =
                clamp(
                    ((event.clientX -
                        rect.left) /
                        rect.width) *
                        2 -
                        1,
                    -1,
                    1
                )

            pointer.current.y =
                clamp(
                    ((event.clientY -
                        rect.top) /
                        rect.height) *
                        2 -
                        1,
                    -1,
                    1
                )
        }

        const onLeave = () => {
            pointer.current.inside =
                false
        }

        root.addEventListener(
            "pointermove",
            onMove
        )

        root.addEventListener(
            "pointerleave",
            onLeave
        )

        /* ---------------------------- */
        /* Animation frame */
        /* ---------------------------- */

        const tick = (
            now: number
        ) => {
            raf =
                requestAnimationFrame(
                    tick
                )

            const delta =
                last < 0
                    ? 0
                    : Math.min(
                          0.05,
                          (now - last) /
                              1000
                      )

            last = now

            const speedFactor =
                Math.max(
                    0,
                    live.current.speed
                ) / 50

            time +=
                delta * speedFactor

            const point =
                pointer.current

            const tracking =
                live.current.hover &&
                point.inside

            const targetX =
                tracking
                    ? point.x
                    : Math.sin(
                          time *
                              IDLE.fx
                      ) *
                      IDLE.ax

            const targetY =
                tracking
                    ? point.y
                    : Math.cos(
                          time *
                              IDLE.fy
                      ) *
                      IDLE.ay

            const smoothing =
                1 -
                Math.exp(
                    -delta *
                        SMOOTH
                )

            current.x +=
                (targetX -
                    current.x) *
                smoothing

            current.y +=
                (targetY -
                    current.y) *
                smoothing

            /* ------------------------ */
            /* Intro */
            /* ------------------------ */

            const fade =
                clamp(
                    time / INTRO,
                    0,
                    1
                )

            const intro =
                1 -
                (1 - fade) *
                    (1 - fade)

            /* ------------------------ */
            /* Pointer highlight */
            /* ------------------------ */

            root.style.setProperty(
                "--gc-mx",
                `${50 + current.x * 45}%`
            )

            root.style.setProperty(
                "--gc-my",
                `${45 + current.y * 45}%`
            )

            /* ------------------------ */
            /* Outline copies */
            /* ------------------------ */

            const phaseValue =
                phase.current

            for (
                let i = 0;
                i < COPIES;
                i++
            ) {
                const element =
                    copyRefs.current[
                        i
                    ]

                const p =
                    (((i + 1 -
                        phaseValue) %
                        COPIES) +
                        COPIES) %
                    COPIES

                const signedP =
                    p >
                    COPIES - 0.5
                        ? p - COPIES
                        : p

                /* Landing detection */
                if (
                    previousDepth[
                        i
                    ] >
                        CONTACT &&
                    signedP <=
                        CONTACT
                ) {
                    sinceHit = 0
                }

                previousDepth[i] =
                    signedP

                if (!element)
                    continue

                element.style.transform =
                    place(
                        p,
                        current.x,
                        current.y
                    )

                element.style.opacity =
                    String(
                        visibility(p) *
                            intro
                    )
            }

            /* ------------------------ */
            /* Landing flash */
            /* ------------------------ */

            sinceHit +=
                delta * speedFactor

            const flash =
                (1 -
                    Math.exp(
                        -sinceHit *
                            FLASH.attack
                    )) *
                Math.exp(
                    -sinceHit *
                        FLASH.decay
                )

            /* ------------------------ */
            /* Main number */
            /* ------------------------ */

            const filled =
                filledRef.current

            if (filled) {
                filled.style.transform =
                    `${place(
                        0,
                        current.x,
                        current.y
                    )} scale(${
                        1 +
                        KICK *
                            flash
                    })`

                filled.style.opacity =
                    String(intro)
            }

            /* ------------------------ */
            /* Glow */
            /* ------------------------ */

            const glow =
                glowRef.current

            if (glow) {
                glow.style.opacity =
                    String(
                        0.65 +
                            0.35 *
                                flash
                    )
            }

            /* ------------------------ */
            /* Backlight */
            /* ------------------------ */

            const backlight =
                backlightRef.current

            if (backlight) {
                backlight.style.opacity =
                    String(
                        0.9 *
                            flash
                    )

                backlight.style.transform =
                    `scale(${
                        1 +
                        0.03 *
                            flash
                    })`
            }
        }

        raf =
            requestAnimationFrame(
                tick
            )

        return () => {
            cancelAnimationFrame(
                raf
            )

            root.removeEventListener(
                "pointermove",
                onMove
            )

            root.removeEventListener(
                "pointerleave",
                onLeave
            )
        }
    }, [])

    /* -------------------------------- */
    /* Number gradient */
    /* -------------------------------- */

    const fill =
        `radial-gradient(
            circle at var(--gc-mx, 35%) var(--gc-my, 40%),
            ${numberColor} 0%,
            ${mix(numberColor, 92)} 16%,
            ${mix(numberColor, 55)} 42%,
            ${mix(numberColor, 22)} 80%
        )`

    /* -------------------------------- */
    /* Shared text layer */
    /* -------------------------------- */

    const layer: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        display: "block",
        textAlign: "center",
        whiteSpace: "nowrap",
    }

    /* -------------------------------- */
    /* Gradient number */
    /* -------------------------------- */

    const gradientText: React.CSSProperties = {
        ...layer,

        backgroundImage: fill,

        WebkitBackgroundClip:
            "text",

        backgroundClip:
            "text",

        color: "transparent",

        WebkitTextFillColor:
            "transparent",
    }

    /* -------------------------------- */
    /* Outline */
    /* -------------------------------- */

    const outline: React.CSSProperties = {
        ...layer,

        color: mix(
            numberColor,
            3
        ),

        WebkitTextFillColor:
            mix(
                numberColor,
                3
            ),

        WebkitTextStroke:
            `max(1px, 0.004em) ${mix(
                numberColor,
                40
            )}`,

        textShadow:
            `0 0 0.05em ${mix(
                numberColor,
                45
            )}`,
    }

    /* -------------------------------- */
    /* Render */
    /* -------------------------------- */

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",

                width: "100%",
                height: "100%",

                minWidth: 1200,
                minHeight: 800,

                ...style,

                background,

                display: "flex",

                alignItems:
                    "center",

                justifyContent:
                    "center",

                overflow: "hidden",

                isolation: "isolate",

                userSelect: "none",

                touchAction: "pan-y",
            }}
        >
            <div
                style={{
                    ...numberFont,

                    position:
                        "relative",

                    isolation:
                        "isolate",

                    fontVariantNumeric:
                        "lining-nums tabular-nums",

                    whiteSpace:
                        "nowrap",
                }}
            >
                {/* Invisible sizer */}
                <span
                    style={{
                        visibility:
                            "hidden",
                    }}
                    aria-hidden
                >
                    {text}
                </span>

                {/* Animated outline copies */}
                {Array.from(
                    {
                        length: COPIES,
                    },
                    (_, index) => (
                        <div
                            key={index}
                            ref={(
                                element
                            ) => {
                                copyRefs.current[
                                    index
                                ] =
                                    element
                            }}
                            style={{
                                position:
                                    "absolute",

                                inset: 0,

                                opacity: 0,
                            }}
                            aria-hidden
                        >
                            <span
                                style={
                                    outline
                                }
                            >
                                {text}
                            </span>
                        </div>
                    )
                )}

                {/* Main number */}
                <div
                    ref={filledRef}
                    style={{
                        position:
                            "absolute",

                        inset: 0,

                        opacity: 0,
                    }}
                >
                    {/* Backlight */}
                    <span
                        ref={
                            backlightRef
                        }
                        style={{
                            ...layer,

                            color:
                                numberColor,

                            filter:
                                "blur(0.09em)",

                            opacity: 0,
                        }}
                        aria-hidden
                    >
                        {text}
                    </span>

                    {/* Glow */}
                    <span
                        ref={glowRef}
                        style={{
                            ...gradientText,

                            opacity: 0.65,

                            filter:
                                "blur(0.05em)",
                        }}
                        aria-hidden
                    >
                        {text}
                    </span>

                    {/* Main number */}
                    <span
                        style={
                            gradientText
                        }
                        aria-label={
                            text
                        }
                    >
                        {text}
                    </span>
                </div>
            </div>
        </div>
    )
}

/* -------------------------------- */
/* Framer Property Controls */
/* -------------------------------- */
