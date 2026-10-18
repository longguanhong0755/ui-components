"use client"

import * as React from "react"
import { useCallback, useEffect, useRef } from "react"
import type { CSSProperties } from "react"
import { animate, motionValue, type MotionValue } from "motion/react"

/* ---------------------------------------------------------------- types --- */

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

type Effect =
    | "zoom"
    | "rise"
    | "wipeLeft"
    | "wipeRight"
    | "split"
    | "wipeUp"
    | "wipeDown"
    | "swing"

type Property = "scale" | "scaleX" | "scaleY"

interface ImageSlot {
    image?: unknown
    fit?: Fit
    offsetX?: number
    offsetY?: number
}

type Fit = "cover" | "contain"

interface Props {
    slot?: ImageSlot
    background?: string
    effect?: Effect
    itemWidth?: number
    itemHeight?: number
    rounded?: number
    copies?: number
    initial?: number
    stagger?: number
    transition?: Motion
    style?: CSSProperties
}

/* ------------------------------------------------------------- constants --- */

const PLACEHOLDER = "rgba(255, 255, 255, 0.12)"

const MIN_COPIES = 2

const MAX_DELAY = 2

const EFFECTS: Record<
    Effect,
    {
        property: Property
        originX: number
        originY: number
    }
> = {
    zoom: {
        property: "scale",
        originX: 50,
        originY: 50,
    },

    rise: {
        property: "scale",
        originX: 50,
        originY: 100,
    },

    wipeLeft: {
        property: "scaleX",
        originX: 0,
        originY: 50,
    },

    wipeRight: {
        property: "scaleX",
        originX: 100,
        originY: 50,
    },

    split: {
        property: "scaleX",
        originX: 50,
        originY: 50,
    },

    wipeUp: {
        property: "scaleY",
        originX: 50,
        originY: 0,
    },

    wipeDown: {
        property: "scaleY",
        originX: 50,
        originY: 100,
    },

    swing: {
        property: "scaleY",
        originX: 150,
        originY: 100,
    },
}

const DEFAULT_TRANSITION: Motion = {
    type: "tween",
    duration: 0.8,
    ease: [0.65, 0, 0.35, 1],
}

const DEFAULT_IMAGE =
    "https://framerusercontent.com/images/aNsAT3jCvt4zglbWCUoFe33Q.jpg"

const DEFAULT_OFFSET = 0

const DEFAULT_FIT: Fit = "cover"

/* ------------------------------------------------------------ utilities --- */

/**
 * Framer may provide a ResponsiveImage object such as:
 *
 * { src, srcSet, alt }
 *
 * or a simple string.
 */
function srcOf(v: unknown): string | null {
    if (!v) return null

    if (typeof v === "string") {
        return v || null
    }

    const src = (v as { src?: string }).src

    return src || null
}

function clamp(
    v: number,
    lo: number,
    hi: number
): number {
    return v < lo ? lo : v > hi ? hi : v
}

/**
 * Converts Rounded (%) into a real pixel radius.
 *
 * 0%   = square
 * 50%  = half of the short side
 * 100% = true pill / maximum radius
 */
function radiusFromPercent(
    w: number,
    h: number,
    pct: number
): number {
    return (
        (Math.min(w, h) / 2) *
        clamp(pct, 0, 100) *
        0.01
    )
}

/* ------------------------------------------------------------ component --- */

export default function RepetitionHover(
    props: Props
) {
    const {
        slot,
        background = "#0B0B0D",
        effect = "split",
        itemWidth = 698,
        itemHeight = 450,
        rounded = 0,
        copies = 6,
        initial = 396,
        stagger = 500,
        transition = {"ease":[0.65,0,0.35,1],"mass":1,"type":"tween","damping":60,"duration":0.8,"stiffness":800},
        style,
    } = props

    /**
     * One DOM node per copy.
     *
     * Copy 0 = base image
     * Copy 1..N = cover images
     */
    const nodesRef = useRef<
        (HTMLDivElement | null)[]
    >([])

    /**
     * One MotionValue per copy.
     *
     * These values are intentionally persistent.
     * Replacing them while an animation is running would lose the current
     * animation state.
     */
    const valuesRef = useRef<
        MotionValue<number>[]
    >([])

    /**
     * Cleanup functions for MotionValue subscriptions.
     */
    const stopsRef = useRef<
        (() => void)[]
    >([])

    /**
     * IMPORTANT FIX:
     *
     * Keep references to all active animations.
     *
     * When the pointer changes direction we stop the previous animations
     * before starting the next pass.
     */
    const animationsRef = useRef<
        { stop: () => void }[]
    >([])

    /**
     * Tracks whether the pointer is currently inside the tile.
     */
    const hoveredRef = useRef(false)

    const cfg =
        EFFECTS[effect] ??
        EFFECTS.zoom

    /**
     * The currently active transform property.
     *
     * This is read at WRITE time so changing Effect does not require
     * recreating the MotionValues.
     */
    const propRef = useRef<Property>(
        cfg.property
    )

    propRef.current = cfg.property

    const tileW = Math.max(
        1,
        Math.round(itemWidth)
    )

    const tileH = Math.max(
        1,
        Math.round(itemHeight)
    )

    const radius = radiusFromPercent(
        tileW,
        tileH,
        rounded
    )

    const total = Math.max(
        MIN_COPIES,
        Math.round(copies)
    )

    /**
     * Initial is expressed as a percentage.
     *
     * 100 = 1x
     * 200 = 2x
     * 396 = 3.96x
     */
    const rest =
        clamp(initial, 0, 400) / 100

    const stepSec =
        clamp(stagger, 0, 1000) / 1000

    /**
     * Returns the persistent MotionValue for a copy.
     */
    const valueFor = useCallback(
        (
            i: number,
            seed: number
        ): MotionValue<number> => {
            let mv =
                valuesRef.current[i]

            if (!mv) {
                mv = motionValue(seed)

                valuesRef.current[i] = mv

                /**
                 * ONE owner for transform.
                 *
                 * React never writes transform.
                 * The MotionValue subscription does.
                 */
                stopsRef.current.push(
                    mv.on("change", (v) => {
                        const node =
                            nodesRef.current[i]

                        if (!node) return

                        node.style.transform = `${propRef.current}(${v})`
                    })
                )
            }

            return mv
        },
        []
    )

    /**
     * Repaint all copies from their current MotionValues.
     */
    const paint = useCallback(() => {
        const nodes =
            nodesRef.current

        const vals =
            valuesRef.current

        for (
            let i = 0;
            i < nodes.length;
            i++
        ) {
            const node = nodes[i]
            const value = vals[i]

            if (!node || !value) {
                continue
            }

            node.style.transform =
                `${propRef.current}(${value.get()})`
        }
    }, [])

    /**
     * Stop every currently running animation.
     *
     * This is the important part of the hover-stuck fix.
     */
    const stopAnimations =
        useCallback(() => {
            const animations =
                animationsRef.current

            for (const animation of animations) {
                animation.stop()
            }

            animationsRef.current = []
        }, [])

    /**
     * Apply the animation in either direction.
     *
     * enter:
     *
     *   base  → Initial → 100%
     *   cover → 100%   → 0%
     *
     * leave:
     *
     *   base  → 100%   → Initial
     *   cover → 0%     → 100%
     *
     * Before doing anything, existing animations are stopped.
     * MotionValues themselves are NOT reset.
     */
    const apply = useCallback(
        (
            enter: boolean,
            instant = false
        ) => {
            /**
             * FIX:
             *
             * Prevent old delayed/staggered animations from waking up later
             * and fighting with the new animation.
             */
            stopAnimations()

            for (
                let i = 0;
                i < total;
                i++
            ) {
                const base = i === 0

                /**
                 * Base:
                 *
                 * enter → 100%
                 * leave → Initial
                 *
                 * Covers:
                 *
                 * enter → 0%
                 * leave → 100%
                 */
                const to = enter
                    ? base
                        ? 1
                        : 0
                    : base
                        ? rest
                        : 1

                /**
                 * IMPORTANT:
                 *
                 * If this copy already exists, its current MotionValue
                 * is preserved.
                 *
                 * That means interrupting halfway through does not jump
                 * back to the beginning.
                 */
                const mv = valueFor(
                    i,
                    base
                        ? rest
                        : 1
                )

                /**
                 * Enter:
                 *
                 * topmost copy first
                 *
                 * Leave:
                 *
                 * reverse order
                 */
                const delay = instant
                    ? 0
                    : Math.min(
                          stepSec *
                              (
                                  enter
                                      ? total -
                                            1 -
                                            i
                                      : i
                              ),
                          MAX_DELAY
                      )

                const opts: Motion =
                    instant
                        ? {
                              duration: 0,
                          }
                        : {
                              ...transition,
                              delay,
                          }

                /**
                 * Start animation and keep its controller.
                 */
                const animation =
                    animate(
                        mv,
                        to,
                        opts
                    )

                animationsRef.current.push(
                    animation
                )
            }

            /**
             * Duration 0 does not always produce a change event,
             * particularly when the MotionValue is already at the target.
             *
             * Repaint explicitly.
             */
            if (instant) {
                paint()
            }
        },
        [
            paint,
            rest,
            stepSec,
            stopAnimations,
            total,
            transition,
            valueFor,
        ]
    )

    /**
     * When configuration changes, snap to the CURRENT interaction state.
     *
     * If hovered:
     *   apply hovered state
     *
     * If not hovered:
     *   apply resting state
     *
     * This prevents editing Initial / Copies / Effect from leaving
     * the component in an incorrect visual state.
     */
    useEffect(() => {
        apply(
            hoveredRef.current,
            true
        )
    }, [apply, effect])

    /**
     * Full cleanup.
     */
    useEffect(() => {
        return () => {
            /**
             * Stop all active animations.
             */
            for (const animation of animationsRef.current) {
                animation.stop()
            }

            animationsRef.current = []

            /**
             * Remove MotionValue subscriptions.
             */
            for (const stop of stopsRef.current) {
                stop()
            }

            stopsRef.current = []

            /**
             * Release MotionValues.
             */
            valuesRef.current = []
        }
    }, [])

    /* ----------------------------------------------------------- image --- */

    /**
     * Explicit fallback per field.
     */
    const src = srcOf(
        slot?.image ??
            DEFAULT_IMAGE
    )

    const fit: Fit =
        slot?.fit ??
        DEFAULT_FIT

    /**
     * Offset only applies to Cover.
     *
     * Contain has no crop slack to move through.
     */
    const offsetX =
        fit === "cover"
            ? clamp(
                  slot?.offsetX ??
                      DEFAULT_OFFSET,
                  -100,
                  100
              )
            : 0

    const offsetY =
        fit === "cover"
            ? clamp(
                  slot?.offsetY ??
                      DEFAULT_OFFSET,
                  -100,
                  100
              )
            : 0

    /* ----------------------------------------------------------- render --- */

    return (
        <div
            style={{
                /**
                 * Floor before spread so the component cannot collapse
                 * when Framer Fit Content is involved.
                 */
                minWidth: 1200,
                minHeight: 800,

                width: "100%",
                height: "100%",

                position: "relative",

                overflow: "hidden",

                background,

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                ...style,
            }}
        >
            <div
                data-tile
                onPointerEnter={() => {
                    hoveredRef.current = true

                    apply(true)
                }}
                onPointerLeave={() => {
                    hoveredRef.current = false

                    apply(false)
                }}
                style={{
                    position: "relative",

                    display: "grid",
                    placeItems: "center",

                    width: tileW,
                    height: tileH,

                    borderRadius: radius,

                    /**
                     * The tile owns the only clip.
                     */
                    overflow: "hidden",

                    cursor: "pointer",

                    backgroundColor: src
                        ? "transparent"
                        : PLACEHOLDER,

                    /**
                     * Every copy inherits the same transform origin.
                     */
                    transformOrigin:
                        `${cfg.originX}% ${cfg.originY}%`,
                }}
            >
                {Array.from(
                    {
                        length: total,
                    },
                    (_, i) => (
                        <div
                            key={i}
                            data-copy={i}
                            ref={(node) => {
                                nodesRef.current[
                                    i
                                ] = node
                            }}
                            style={{
                                /**
                                 * Stack every image in exactly the same
                                 * position.
                                 */
                                gridArea:
                                    "1 / 1 / 2 / 2",

                                width: "100%",
                                height: "100%",

                                /**
                                 * Inherit Effect origin.
                                 */
                                transformOrigin:
                                    "inherit",

                                /**
                                 * Every copy uses the same image.
                                 */
                                backgroundImage:
                                    src
                                        ? `url(${src})`
                                        : undefined,

                                backgroundSize:
                                    fit,

                                /**
                                 * Prevent Contain images from repeating.
                                 */
                                backgroundRepeat:
                                    "no-repeat",

                                /**
                                 * 0 = center
                                 *
                                 * ±100 = full crop range
                                 */
                                backgroundPosition:
                                    `${50 + offsetX / 2}% ${
                                        50 +
                                        offsetY / 2
                                    }%`,

                                /**
                                 * MotionValue owns transform.
                                 */
                                willChange:
                                    "transform",
                            }}
                        />
                    )
                )}
            </div>
        </div>
    )
}
