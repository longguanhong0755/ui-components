"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * Seigaiha — the blue sea wave, drawn as overlapping scales.
 *
 * Each scale is a stack of filled half-discs, largest first, so the bands come
 * out as solid rings rather than as strokes. That is what makes the overlap
 * work: a scale drawn later covers the one before it, and what survives is a
 * crescent — the same way the pattern is cut in cloth. Stroked arcs cannot do
 * it, because there is nothing to cover with and every ring stays visible
 * through its neighbours.
 *
 * Scales are spaced one radius apart, so each sits over half of the one beside
 * it, and the rows are drawn from the top of the frame down. Reverse the order
 * and the overlap inverts: the pattern still tiles, but the scales face the
 * wrong way and stop reading as water.
 *
 * The travelling offset wraps at exactly one radius, which is the pattern's own
 * period. Wrapping at any other distance leaves the leading edge of the frame
 * empty for part of the cycle, which is a gap that appears and heals as the
 * pattern moves.
 *
 * The cursor lifts the colour of the scales it passes and leaves their size
 * alone — a swell there breaks the tiling and shows as scales of two sizes.
 */

const DEFAULTS = {
    colorA: "#00FFF0",
    colorB: "#004100",
    colors: [] as string[],
    count: 1,
    rings: 20,
    thickness: 20,
    overlap: 20,
    speed: 20,
    direction: "right",
    followPointer: true,
    strength: 11,
}

type Config = {
    colorA: string
    colorB: string
    colors: string[]
    count: number
    rings: number
    thickness: number
    overlap: number
    speed: number
    direction: string
    followPointer: boolean
    strength: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the pattern wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        // Scale radius in pixels.
        radius: 116 - clamp(cfg.count, 1, 20, DEFAULTS.count) * 4.4,
        rings: Math.round(2 + clamp(cfg.rings, 1, 20, DEFAULTS.rings) * 0.4),
        thickness: 0.4 + clamp(cfg.thickness, 1, 20, DEFAULTS.thickness) * 0.22,
        // How far a row sits over the one behind it, as a share of the radius.
        // Below about a third the crowns separate and the water falls apart.
        overlap: 0.24 + clamp(cfg.overlap, 1, 20, DEFAULTS.overlap) * 0.019,
        outline: clamp(cfg.thickness, 0, 20, DEFAULTS.thickness) * 0.09,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.05,
        reach: 90 + clamp(cfg.strength, 1, 20, DEFAULTS.strength) * 22,
    }
}

/** Accepts #rgb and #rrggbb; anything else falls back to mid grey. */
function parseHex(hex: string): number[] {
    const h = (hex || "").replace("#", "").trim()
    if (h.length === 3) {
        return [
            parseInt(h[0] + h[0], 16),
            parseInt(h[1] + h[1], 16),
            parseInt(h[2] + h[2], 16),
        ]
    }
    if (h.length >= 6) {
        return [
            parseInt(h.slice(0, 2), 16),
            parseInt(h.slice(2, 4), 16),
            parseInt(h.slice(4, 6), 16),
        ]
    }
    return [128, 128, 128]
}

function mix(a: number[], b: number[], t: number, alpha: number) {
    const r = Math.round(a[0] + (b[0] - a[0]) * t)
    const g = Math.round(a[1] + (b[1] - a[1]) * t)
    const bl = Math.round(a[2] + (b[2] - a[2]) * t)
    return "rgba(" + r + "," + g + "," + bl + "," + alpha + ")"
}

class WaveScene {
    private container: HTMLElement
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private cfg: Config

    private width = 0
    private height = 0
    private dpr = 1
    private time = 0
    private frameId = 0
    private lastT = 0
    private disposed = false

    private px = -1
    private py = -1
    private tx = -1
    private ty = -1
    private grip = 0
    private gripTarget = 0

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.canvas = document.createElement("canvas")
        this.canvas.style.position = "absolute"
        this.canvas.style.inset = "0"
        this.canvas.style.width = "100%"
        this.canvas.style.height = "100%"
        container.appendChild(this.canvas)

        const ctx = this.canvas.getContext("2d")
        if (!ctx) throw new Error("no 2d context")
        this.ctx = ctx

        container.addEventListener("pointerenter", this.onEnter)
        container.addEventListener("pointerleave", this.onLeave)
        container.addEventListener("pointercancel", this.onLeave)
        container.addEventListener("pointermove", this.onMove)
    }

    private onEnter = () => {
        this.gripTarget = 1
    }
    private onLeave = () => {
        this.gripTarget = 0
    }
    private onMove = (e: PointerEvent) => {
        const rect = this.container.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        this.tx = e.clientX - rect.left
        this.ty = e.clientY - rect.top
        if (this.px < 0) {
            this.px = this.tx
            this.py = this.ty
        }
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            this.frameId = requestAnimationFrame(loop)
            this.step()
        }
        loop()
    }

    setSize(width: number, height: number) {
        if (this.disposed || width <= 0 || height <= 0) return
        this.dpr = Math.min(window.devicePixelRatio || 1, 2)
        this.width = width
        this.height = height
        this.canvas.width = Math.round(width * this.dpr)
        this.canvas.height = Math.round(height * this.dpr)
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        // The whole pattern is derived each frame, so nothing rebuilds.
        this.cfg = cfg
    }

    private step() {
        if (this.disposed || this.width <= 0) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        const ctx = this.ctx
        this.time += dt

        if (this.px >= 0) {
            const k = 1 - Math.exp(-dt * 10)
            this.px += (this.tx - this.px) * k
            this.py += (this.ty - this.py) * k
        }
        const hover = this.cfg.followPointer && this.px >= 0 ? this.gripTarget : 0
        this.grip += (hover - this.grip) * (1 - Math.exp(-dt * 3.5))

        ctx.clearRect(0, 0, this.width, this.height)
        ctx.lineCap = "butt"

        const palette = (
            this.cfg.colors && this.cfg.colors.length
                ? this.cfg.colors
                : [this.cfg.colorA || DEFAULTS.colorA]
        ).map(parseHex)
        const b = parseHex(this.cfg.colorB || DEFAULTS.colorB)
        const R = Math.max(14, S.radius)
        const rowH = R * S.overlap
        // Two margin columns either side, because the offset can carry a scale
        // a full period before the wrap brings it back.
        const cols = Math.ceil(this.width / R) + 4
        const rows = Math.ceil(this.height / rowH) + 4
        // Wrapped at one radius (or two rows) — the pattern's own period, so
        // the wrap is invisible and no edge is ever left uncovered.
        const travel = this.time * S.speed * 40
        const driftX =
            this.cfg.direction === "left"
                ? -(travel % R)
                : this.cfg.direction === "right" || !this.cfg.direction
                  ? travel % R
                  : 0
        const driftY =
            this.cfg.direction === "up"
                ? -(travel % (rowH * 2))
                : this.cfg.direction === "down"
                  ? travel % (rowH * 2)
                  : 0
        const reach2 = S.reach * S.reach

        /*
         * Top to bottom, so each row covers the tops of the one behind it. The
         * other order inverts the overlap and the scales face the wrong way.
         */
        for (let r = -2; r < rows; r++) {
            const y = r * rowH + driftY
            // Every other row is offset half a scale — that offset is what
            // makes the crowns interlock instead of stacking.
            const shift = (((r % 2) + 2) % 2) * R * 0.5
            const crest =
                palette[(((r % palette.length) + palette.length) % palette.length)]
            for (let c = -2; c < cols; c++) {
                const x = c * R + shift + driftX

                let lift = 0
                if (this.grip > 0.01) {
                    const dx = x - this.px
                    const dy = y - this.py
                    const d2 = dx * dx + dy * dy
                    if (d2 < reach2) {
                        // Colour only. Growing the scale would break the
                        // spacing the whole tiling depends on.
                        lift = (1 - Math.sqrt(d2) / S.reach) * this.grip
                    }
                }

                /*
                 * Largest first, so each band covers the middle of the one
                 * before it and only a ring of it survives.
                 */
                for (let i = S.rings; i >= 1; i--) {
                    const t = i / S.rings
                    // Bands alternate, and the ramp outward gives the scale its
                    // depth; the cursor pushes the whole stack brighter.
                    const band = i % 2 === 0 ? 0.15 : 0.75
                    ctx.fillStyle = mix(
                        b,
                        crest,
                        Math.min(1, band * (0.35 + t * 0.75) + lift * 0.7),
                        1
                    )
                    ctx.beginPath()
                    ctx.arc(x, y, R * t, Math.PI, Math.PI * 2)
                    ctx.closePath()
                    ctx.fill()

                    if (S.outline > 0.02 && i === S.rings) {
                        // One outline on the outer edge only — a line on every
                        // band closes the scale up into a solid blob.
                        ctx.strokeStyle = mix(b, crest, 0.9, 0.5)
                        ctx.lineWidth = S.outline * 2
                        ctx.stroke()
                    }
                }
            }
        }
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.container.removeEventListener("pointerenter", this.onEnter)
        this.container.removeEventListener("pointerleave", this.onLeave)
        this.container.removeEventListener("pointercancel", this.onLeave)
        this.container.removeEventListener("pointermove", this.onMove)
        if (this.canvas.parentNode === this.container) {
            this.container.removeChild(this.canvas)
        }
    }
}

export interface SeigaihaProps {
    colorA?: string
    colorB?: string
    colors?: string[]
    count?: number
    rings?: number
    thickness?: number
    overlap?: number
    speed?: number
    direction?: string
    followPointer?: boolean
    strength?: number
    style?: React.CSSProperties
}

export default function Seigaiha(props: SeigaihaProps) {
    const {
        colorA = DEFAULTS.colorA,
        colorB = DEFAULTS.colorB,
        colors = DEFAULTS.colors,
        count = DEFAULTS.count,
        rings = DEFAULTS.rings,
        thickness = DEFAULTS.thickness,
        overlap = DEFAULTS.overlap,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction,
        followPointer = DEFAULTS.followPointer,
        strength = DEFAULTS.strength,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<WaveScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        colorA,
        colorB,
        colors,
        count,
        rings,
        thickness,
        overlap,
        speed,
        direction,
        followPointer,
        strength,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: WaveScene
        try {
            scene = new WaveScene(container, cfgRef.current)
        } catch {
            // No canvas — render an empty frame rather than throwing.
            return
        }
        sceneRef.current = scene
        scene.setSize(container.clientWidth, container.clientHeight)
        scene.start()

        const ro = new ResizeObserver(() => {
            scene.setSize(container.clientWidth, container.clientHeight)
        })
        ro.observe(container)
        return () => {
            ro.disconnect()
            scene.dispose()
            sceneRef.current = null
        }
    }, [])

    useEffect(() => {
        sceneRef.current?.updateConfig(cfgRef.current)
    }, [
        colorA,
        colorB,
        colors,
        count,
        rings,
        thickness,
        overlap,
        speed,
        direction,
        followPointer,
        strength,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Overlapping wave scales in the seigaiha pattern"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                ...style,
            }}
        />
    )
}

Seigaiha.displayName = "Seigaiha"
Seigaiha.defaultProps = { ...DEFAULTS }
