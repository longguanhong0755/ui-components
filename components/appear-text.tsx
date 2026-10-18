"use client";

import * as React from "react";
import { useMemo } from "react";
import { motion } from "framer-motion";

type Transition = {
    type?: string;
    stiffness?: number;
    damping?: number;
    mass?: number;
    ease?: string;
    duration?: number;
};

type Props = {
    text?: string;
    font?: React.CSSProperties;
    textColor?: string;
    backgroundColor?: string;
    rowCount?: number;
    repeatCount?: number;
    rowGap?: number;
    wordGap?: number;
    expandDurationSec?: number;
    holdDurationSec?: number;
    horizontalShiftPx?: number;
    zoomScalePct?: number;
    transition?: Transition;
    style?: React.CSSProperties;
};

export default function KineticTextGrid(props: Props) {
    const {
        text = "APPEAR TEXT",
        font = {
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 64,
            lineHeight: "1.5em",
            letterSpacing: "0em",
            textAlign: "left",
        },
        textColor = "#FFFFFF",
        backgroundColor = "#000000",
        rowCount = 5,
        repeatCount = 5,
        rowGap = 16,
        wordGap = 24,
        expandDurationSec = 1,
        holdDurationSec = 1,
        horizontalShiftPx = 80,
        zoomScalePct = 115,
        transition = {
            type: "tween",
            stiffness: 800,
            damping: 60,
            mass: 1,
            ease: "easeInOut",
            duration: 1,
        },
        style,
    } = props;

    // Keep counts odd for an exact geometric center
    const safeRowCount = rowCount % 2 === 0 ? rowCount + 1 : rowCount;
    const centerRowIndex = Math.floor(safeRowCount / 2);
    const safeRepeatCount =
        repeatCount % 2 === 0 ? repeatCount + 1 : repeatCount;
    const centerWordIndex = Math.floor(safeRepeatCount / 2);

    const rows = useMemo(
        () => Array.from({ length: safeRowCount }, (_, i) => i),
        [safeRowCount]
    );
    const words = useMemo(
        () => Array.from({ length: safeRepeatCount }, (_, i) => i),
        [safeRepeatCount]
    );

    const fontStyles = (font ?? {}) as React.CSSProperties;
    const maxZoomScale = zoomScalePct / 100;

    // How offset the grid is at rest, as a fraction of the full drift.
    // > 0 so rows are always staggered (never a flat, aligned grid).
    const HOME_FACTOR = 0.4;

    const ease = (transition as any)?.ease ?? "easeInOut";

    // ---- Timeline (seconds) — no gap between the in-beat and the wipe ----
    const motionSec = Math.max(0.1, expandDurationSec);
    const holdSec = Math.max(0, holdDurationSec);

    const tIn = motionSec; // zoomed + spread (all visible)
    const tWipe = tIn + motionSec; // wiped; one word left, centered, scale 1
    const tWord = tWipe + holdSec; // single-word hold ends
    const tReset = tWord + 0.4; // non-center rows back to home (hidden)
    const tReveal = tReset + motionSec * 0.7;
    const total = tReveal + Math.max(0.2, holdSec * 0.4);
    const n = (t: number) => t / total;

    const seq = (times: number[]) => ({
        duration: total,
        times,
        ease,
        repeat: Infinity,
    });

    const VISIBLE = "inset(0% 0% 0% 0%)";

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                backgroundColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                ...style,
            }}
        >
            {/* Zoom in during the spread; ease back to scale 1 during the wipe
                so the surviving word settles at normal size */}
            <motion.div
                animate={{ scale: [1, maxZoomScale, 1, 1] }}
                transition={seq([0, n(tIn), n(tWipe), 1])}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: rowGap,
                    position: "relative",
                    willChange: "transform",
                }}
            >
                {rows.map((rowIndex) => {
                    const isCenterRow = rowIndex === centerRowIndex;
                    const distanceFromCenterY = rowIndex - centerRowIndex;
                    const direction = rowIndex % 2 === 0 ? 1 : -1;

                    const speedMultiplier =
                        0.7 + (Math.abs(distanceFromCenterY) % 3) * 0.45;
                    const driftFull =
                        direction * horizontalShiftPx * speedMultiplier;
                    const driftHome = driftFull * HOME_FACTOR;

                    const wipeLTR = rowIndex % 2 === 0;
                    const hidden = wipeLTR
                        ? "inset(0% 0% 0% 100%)"
                        : "inset(0% 100% 0% 0%)";

                    // Center row: home → spread → center (during wipe) → hold
                    // centered → back to home. Others: home → spread → hold →
                    // back to home (hidden), never touching 0.
                    const xAnim = isCenterRow
                        ? {
                              values: [
                                  driftHome,
                                  driftFull,
                                  0,
                                  0,
                                  driftHome,
                                  driftHome,
                              ],
                              times: [
                                  0,
                                  n(tIn),
                                  n(tWipe),
                                  n(tReset),
                                  n(tReveal),
                                  1,
                              ],
                          }
                        : {
                              values: [
                                  driftHome,
                                  driftFull,
                                  driftFull,
                                  driftHome,
                                  driftHome,
                              ],
                              times: [0, n(tIn), n(tWord), n(tReset), 1],
                          };

                    return (
                        <motion.div
                            key={rowIndex}
                            animate={{ x: xAnim.values }}
                            transition={seq(xAnim.times)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: wordGap,
                                whiteSpace: "nowrap",
                                willChange: "transform",
                            }}
                        >
                            {words.map((wordIndex) => {
                                const isCenterWord =
                                    isCenterRow && wordIndex === centerWordIndex;

                                // The one word that survives — never wiped
                                if (isCenterWord) {
                                    return (
                                        <span
                                            key={wordIndex}
                                            style={{
                                                color: textColor,
                                                lineHeight: 1,
                                                display: "inline-block",
                                                clipPath: VISIBLE,
                                                ...fontStyles,
                                            }}
                                        >
                                            {text}
                                        </span>
                                    );
                                }

                                const denom = Math.max(1, safeRepeatCount - 1);
                                const sweepT = wipeLTR
                                    ? wordIndex / denom
                                    : (safeRepeatCount - 1 - wordIndex) / denom;

                                const wipeWindow = tWipe - tIn;
                                const perWipe = wipeWindow * 0.5;
                                const wStartOut =
                                    tIn + sweepT * (wipeWindow - perWipe);
                                const wEndOut = wStartOut + perWipe;

                                const revealWindow = tReveal - tReset;
                                const perReveal = revealWindow * 0.5;
                                const wStartIn =
                                    tReset + sweepT * (revealWindow - perReveal);
                                const wEndIn = wStartIn + perReveal;

                                return (
                                    <motion.span
                                        key={wordIndex}
                                        animate={{
                                            clipPath: [
                                                VISIBLE,
                                                VISIBLE,
                                                hidden,
                                                hidden,
                                                VISIBLE,
                                                VISIBLE,
                                            ],
                                        }}
                                        transition={seq([
                                            0,
                                            n(wStartOut),
                                            n(wEndOut),
                                            n(wStartIn),
                                            n(wEndIn),
                                            1,
                                        ])}
                                        style={{
                                            color: textColor,
                                            lineHeight: 1,
                                            display: "inline-block",
                                            clipPath: VISIBLE,
                                            willChange: "clip-path",
                                            ...fontStyles,
                                        }}
                                    >
                                        {text}
                                    </motion.span>
                                );
                            })}
                        </motion.div>
                    );
                })}
            </motion.div>
        </div>
    );
}
