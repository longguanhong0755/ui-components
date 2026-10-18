"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

interface MotionGroup {
    shiftX?: number
    shiftY?: number
    tiltX?: number
    tiltY?: number
    twist?: number
}

interface Props {
    image?: unknown
    background?: string
    copies?: number
    itemWidth?: number
    itemHeight?: number
    rounded?: number
    perspective?: number
    speed?: number
    fade?: number
    hoverOut?: "hold" | "reset"
    motion?: MotionGroup
    style?: CSSProperties
}

const PLACEHOLDER = "rgba(255, 255, 255, 0.12)"

const AMT_SLOPE = 0.02
const AMT_BASE = 0.05

const BASE_FPS = 60

const MAX_DT = 0.05

const SPEED_REFERENCE = 50

const DEFAULT_MOTION: Required<MotionGroup> = {
    shiftX: 250,
    shiftY: 90,
    tiltX: 8,
    tiltY: 15,
    twist: 5,
}

function srcOf(v: unknown): string | null {
    if (!v) return null
    if (typeof v === "string") return v || null
    const src = (v as { src?: string }).src
    return src || null
}

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

function radiusFromPercent(w: number, h: number, pct: number): number {
    return (Math.min(w, h) / 2) * clamp(pct, 0, 100) * 0.01
}

export default function ImageMotionTrail(props: Props) {
    const {
        image = {"src":"https://images.unsplash.com/photo-1702488341515-a4e801e9bbb9?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHx0b3BpYy1mZWVkfDc3fGJvOGpRS1RhRTBZfHxlbnwwfHx8fHw%3D","alt":""},
        background = "#000000",
        copies = 20,
        itemWidth = 400,
        itemHeight = 300,
        rounded = 0,
        perspective = 84,
        speed = 50,
        fade = 0,
        hoverOut = "reset",
        motion,
        style,
    } = props

    const m: Required<MotionGroup> = { ...DEFAULT_MOTION, ...(motion ?? {}) }

    const rootRef = useRef<HTMLDivElement | null>(null)
    const nodesRef = useRef<(HTMLDivElement | null)[]>([])

    const aimRef = useRef({ nx: 0, ny: 0 })

    const stateRef = useRef<
        { x: number; y: number; rx: number; ry: number; rz: number }[]
    >([])

    const cfgRef = useRef({ copies, speed, m, hoverOut })
    cfgRef.current = { copies, speed, m, hoverOut }

    const count = Math.max(1, Math.round(copies))
    const itemW = Math.max(1, Math.round(itemWidth))
    const itemH = Math.max(1, Math.round(itemHeight))
    const radius = radiusFromPercent(itemW, itemH, rounded)

    const halfFov = (clamp(perspective, 1, 179) * Math.PI) / 360
    const perspectivePx = Math.round(itemH / 2 / Math.tan(halfFov))

    useEffect(() => {
        const root = rootRef.current
        if (!root) return

        const onMove = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            aimRef.current.nx = ((e.clientX - r.left) / r.width) * 2 - 1
            aimRef.current.ny = ((e.clientY - r.top) / r.height) * 2 - 1
        }

        const onLeave = () => {
            if (cfgRef.current.hoverOut !== "reset") return
            aimRef.current.nx = 0
            aimRef.current.ny = 0
        }

        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)
        return () => {
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
        }
    }, [])

    useEffect(() => {
        let raf = 0
        let last = performance.now()

        const tick = (now: number) => {
            const dt = clamp((now - last) / 1000, 0, MAX_DT)
            last = now

            const { copies: n, speed: sp, m: mm } = cfgRef.current
            const total = Math.max(1, Math.round(n))
            const gain = Math.max(0, sp) / SPEED_REFERENCE

            const { nx, ny } = aimRef.current
            const tx = nx * mm.shiftX
            const ty = ny * mm.shiftY
            const trx = ny * mm.tiltX
            const tryy = nx * mm.tiltY
            const trz = nx * mm.twist

            const st = stateRef.current
            for (let i = 0; i < total; i++) {
                const node = nodesRef.current[i]
                if (!node) continue
                if (!st[i]) st[i] = { x: 0, y: 0, rx: 0, ry: 0, rz: 0 }
                const s = st[i]

                const amt = clamp((AMT_SLOPE * i + AMT_BASE) * gain, 0, 1)
                const a = amt >= 1 ? 1 : 1 - Math.pow(1 - amt, dt * BASE_FPS)

                s.x += (tx - s.x) * a
                s.y += (ty - s.y) * a
                s.rx += (trx - s.rx) * a
                s.ry += (tryy - s.ry) * a
                s.rz += (trz - s.rz) * a

                node.style.transform =
                    `translateX(${s.x.toFixed(2)}px) ` +
                    `translateY(${s.y.toFixed(2)}px) ` +
                    `rotateX(${s.rx.toFixed(2)}deg) ` +
                    `rotateY(${s.ry.toFixed(2)}deg) ` +
                    `rotateZ(${s.rz.toFixed(2)}deg)`
            }

            raf = requestAnimationFrame(tick)
        }

        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [])

    const src = srcOf(image)
    const fadeAmt = clamp(fade, 0, 100) / 100

    return (
        <div
            ref={rootRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background,
                display: "grid",
                placeItems: "center",
                ...style,
            }}
        >
            <div
                style={{
                    display: "grid",
                    placeItems: "center",
                    perspective: `${perspectivePx}px`,
                }}
            >
                {Array.from({ length: count }, (_, i) => {
                    const ramp = (i + 1) / count
                    const opacity = 1 - fadeAmt * (1 - ramp)

                    return (
                        <div
                            key={i}
                            ref={(node) => {
                                nodesRef.current[i] = node
                            }}
                            style={{
                                gridArea: "1 / 1 / 2 / 2",
                                position: "relative",
                                width: itemW,
                                height: itemH,
                                borderRadius: radius,
                                overflow: "hidden",
                                opacity,
                                backgroundColor: src
                                    ? "transparent"
                                    : PLACEHOLDER,
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
                                        pointerEvents: "none",
                                    }}
                                />
                            ) : null}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
