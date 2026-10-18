"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"

/**
 * Compare Slider — before and after, split by a handle you drag.
 *
 * Both images are laid out at full size on top of each other and the upper one
 * is cut with `clip-path`. Resizing the upper image instead is the obvious
 * approach and the wrong one: it would squash the picture as the handle moves,
 * and the two halves would no longer line up. Clipping shows part of an image
 * that is always at the same size and position, so the seam is invisible.
 *
 * Pointer capture is taken on press, so a drag that leaves the frame — or the
 * window — keeps working and still ends cleanly. Without it the handle sticks
 * to the cursor after the button is released outside.
 *
 * The handle is also a slider for the keyboard: arrows nudge, Home and End go
 * to the ends.
 */

const DEFAULTS = {
    start: 50,
    handleColor: "#FFFFFF",
    arrowColor: "rgba(0,0,0,0.55)",
    lineWidth: 4,
    handleSize: 50,
    rounded: 0,
    labelColor: "#FFFFFF",
    labelFill: "rgba(0,0,0,0.55)",
    beforeLabel: "Before",
    afterLabel: "After",
    showLabels: false,
    followHover: false,
}

type Config = {
    beforeImage: any
    afterImage: any
    start: number
    handleColor: string
    arrowColor: string
    lineWidth: number
    handleSize: number
    rounded: number
    labelFont: any
    labelColor: string
    labelFill: string
    beforeLabel: string
    afterLabel: string
    showLabels: boolean
    followHover: boolean
}

/** Framer's Font control hands back CSS-shaped keys, plus some it does not. */
function fontStyle(font: any): React.CSSProperties {
    if (!font || typeof font !== "object") return {}
    const out: React.CSSProperties = {}
    if (font.fontFamily) out.fontFamily = font.fontFamily
    if (font.fontSize !== undefined) out.fontSize = font.fontSize
    if (font.fontWeight !== undefined) out.fontWeight = font.fontWeight
    if (font.lineHeight !== undefined) out.lineHeight = font.lineHeight
    if (font.letterSpacing !== undefined) out.letterSpacing = font.letterSpacing
    if (font.textTransform) out.textTransform = font.textTransform
    return out
}

function srcOf(image: any): string {
    if (!image) return ""
    if (typeof image === "string") return image
    return image.src || image.url || ""
}

type Props = Partial<Config> & { style?: React.CSSProperties }

export default function CompareSlider(props: Props) {
    const {
        beforeImage = {"src":"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80"},
        afterImage = {"src":"https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80"},
        start = DEFAULTS.start,
        handleColor = DEFAULTS.handleColor,
        arrowColor = "rgba(0,0,0,0.55)",
        lineWidth = DEFAULTS.lineWidth,
        handleSize = DEFAULTS.handleSize,
        rounded = DEFAULTS.rounded,
        labelFont = {"variant":"Medium","fontSize":13,"textAlign":"left","fontFamily":"Inter","fontWeight":400,"lineHeight":"1.5em","letterSpacing":"0em"},
        labelColor = DEFAULTS.labelColor,
        labelFill = "rgba(0,0,0,0.55)",
        beforeLabel = DEFAULTS.beforeLabel,
        afterLabel = DEFAULTS.afterLabel,
        showLabels = DEFAULTS.showLabels,
        followHover = DEFAULTS.followHover,
        style,
    } = props

    const hostRef = useRef<HTMLDivElement | null>(null)
    const [pos, setPos] = useState(start)
    const dragging = useRef(false)

    // The control is the source of truth until the reader touches it, so
    // dragging the Start slider on the canvas shows what it will look like.
    useEffect(() => setPos(start), [start])

    const setFromClientX = (clientX: number) => {
        const el = hostRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        if (!r.width) return
        setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)))
    }

    const onDown = (e: React.PointerEvent) => {
        dragging.current = true
        // Captured, so a drag that leaves the frame keeps working and still
        // ends cleanly when the button comes up somewhere else.
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        setFromClientX(e.clientX)
    }
    const onMove = (e: React.PointerEvent) => {
        if (dragging.current || followHover) setFromClientX(e.clientX)
    }
    const onUp = (e: React.PointerEvent) => {
        dragging.current = false
        ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    }

    const onKey = (e: React.KeyboardEvent) => {
        const step = e.shiftKey ? 10 : 2
        if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - step))
        else if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + step))
        else if (e.key === "Home") setPos(0)
        else if (e.key === "End") setPos(100)
        else return
        e.preventDefault()
    }

    const before = srcOf(beforeImage)
    const after = srcOf(afterImage)
    const imgStyle: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        userSelect: "none",
        pointerEvents: "none",
    }
    const label: React.CSSProperties = {
        position: "absolute",
        bottom: 14,
        padding: "6px 10px",
        borderRadius: 999,
        background: labelFill,
        color: labelColor,
        pointerEvents: "none",
        ...fontStyle(labelFont),
    }

    return (
        <div
            ref={hostRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                borderRadius: rounded,
                touchAction: "none",
                cursor: followHover ? "default" : "ew-resize",
                ...style,
            }}
        >
            {before ? <img src={before} alt="" style={imgStyle} draggable={false} /> : null}

            {/*
             * Clipped, not resized. Resizing the upper image would squash the
             * picture as the handle moves and the two halves would stop lining
             * up; clipping shows part of an image that never moves.
             */}
            {after ? (
                <img
                    src={after}
                    alt=""
                    draggable={false}
                    style={{
                        ...imgStyle,
                        clipPath: "inset(0 0 0 " + pos + "%)",
                    }}
                />
            ) : null}

            {showLabels ? (
                <>
                    <div style={{ ...label, left: 14, opacity: pos > 12 ? 1 : 0 }}>
                        {beforeLabel}
                    </div>
                    <div style={{ ...label, right: 14, opacity: pos < 88 ? 1 : 0 }}>
                        {afterLabel}
                    </div>
                </>
            ) : null}

            <div
                aria-hidden="true"
                style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: "calc(" + pos + "% - " + lineWidth / 2 + "px)",
                    width: lineWidth,
                    background: handleColor,
                    pointerEvents: "none",
                }}
            />

            <div
                role="slider"
                tabIndex={0}
                aria-label="Compare before and after"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pos)}
                onKeyDown={onKey}
                style={{
                    position: "absolute",
                    top: "50%",
                    left: pos + "%",
                    width: handleSize,
                    height: handleSize,
                    marginLeft: -handleSize / 2,
                    marginTop: -handleSize / 2,
                    borderRadius: "50%",
                    background: handleColor,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    cursor: "ew-resize",
                    outlineOffset: 3,
                }}
            >
                <Arrow dir={-1} color={arrowColor} />
                <Arrow dir={1} color={arrowColor} />
            </div>
        </div>
    )
}

function Arrow({ dir, color }: { dir: number; color: string }) {
    return (
        <svg width="7" height="10" viewBox="0 0 7 10" fill="none" aria-hidden="true">
            <path
                d={dir < 0 ? "M5.5 1L1.5 5l4 4" : "M1.5 1l4 4-4 4"}
                stroke={color}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

CompareSlider.displayName = "Compare Slider"
