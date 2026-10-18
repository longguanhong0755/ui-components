"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * Cell Field — territory, drawn in dots.
 *
 * A handful of seeds drift about, and every dot in the lattice belongs to
 * whichever seed is nearest. That is a Voronoi diagram, and the borders between
 * the cells are never computed — they appear where the nearest seed changes,
 * which is exactly where they belong.
 *
 * The borders are found instead by comparing the two nearest seeds. Where those
 * distances are almost equal the dot is on a boundary, so it is dimmed; deep
 * inside a cell one seed wins outright and the dot is at full strength. That
 * ratio is scale-free, so the borders stay the same weight whether the cells
 * are large or small.
 *
 * The cursor is one more seed. It carves out its own territory and shoves the
 * borders of its neighbours as it goes.
 */

const DEFAULTS = {
    background: "#000000",
    colorA: "#FF0000",
    colorB: "#FFDA00",
    cells: 20,
    count: 20,
    size: 20,
    edge: 13,
    speed: 20,
    followPointer: true,
    strength: 20,
}

type Config = {
    background: string
    colorA: string
    colorB: string
    cells: number
    count: number
    size: number
    edge: number
    speed: number
    followPointer: boolean
    strength: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the field wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        /*
         * Cell size in pixels, not a seed count. A fixed count leaves a narrow
         * frame with one cell across its whole width — which reads as a plain
         * dot grid, because there is no border in view to tell one territory
         * from the next. Sizing the cell and deriving the count from the area
         * keeps the same density in a hero banner and in a sidebar.
         */
        cell: 250 - clamp(cfg.cells, 1, 20, DEFAULTS.cells) * 9.5,
        spacing: 54 - clamp(cfg.count, 1, 20, DEFAULTS.count) * 1.9,
        size: 0.6 + clamp(cfg.size, 1, 20, DEFAULTS.size) * 0.14,
        // How wide the dimmed band along a border is. High is a broad
        // gradient between cells, low is a hairline.
        edge: 0.04 + clamp(cfg.edge, 1, 20, DEFAULTS.edge) * 0.036,
        speed: 6 + clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 5,
        // The cursor seed's weight. Above one it wins ground it would not win
        // on distance alone, so its cell swells.
        bias: 0.6 + clamp(cfg.strength, 1, 20, DEFAULTS.strength) * 0.045,
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

type Seed = { x: number; y: number; vx: number; vy: number; tint: number }

class CellScene {
    private container: HTMLElement
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private cfg: Config

    private seeds: Seed[] = []
    private width = 0
    private height = 0
    private dpr = 1
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

    /** How many territories this frame has room for at the chosen cell size. */
    private wanted(S: ReturnType<typeof settingsFor>) {
        const w = this.width || 300
        const h = this.height || 300
        const area = (w * h) / (S.cell * S.cell)
        return Math.max(2, Math.min(40, Math.round(area)))
    }

    private spawn(S: ReturnType<typeof settingsFor>) {
        const a = Math.random() * Math.PI * 2
        this.seeds.push({
            x: Math.random() * (this.width || 300),
            y: Math.random() * (this.height || 300),
            vx: Math.cos(a) * S.speed,
            vy: Math.sin(a) * S.speed,
            /*
             * Spread by the golden ratio rather than at random. Two random
             * tints land close together often enough that neighbouring cells
             * come out the same colour and the border between them disappears.
             */
            tint: (this.tintSeq++ * 0.6180339887) % 1,
        })
    }

    private tintSeq = 0

    private build() {
        const S = settingsFor(this.cfg)
        this.seeds = []
        const n = this.wanted(S)
        for (let i = 0; i < n; i++) this.spawn(S)
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
        const first = this.width === 0
        /*
         * Positions are held in pixels, so a resize would leave everything past
         * the new edge to be wrapped or clamped there all at once — a pile of
         * particles down one side. Scaling them with the frame keeps the
         * arrangement and leaves nothing outside.
         */
        if (!first && this.width > 0 && this.height > 0) {
            const kx = width / this.width
            const ky = height / this.height
            for (let i = 0; i < this.seeds.length; i++) {
                this.seeds[i].x *= kx
                this.seeds[i].y *= ky
            }
        }
        this.width = width
        this.height = height
        this.canvas.width = Math.round(width * this.dpr)
        this.canvas.height = Math.round(height * this.dpr)
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
        if (first || this.seeds.length === 0) this.build()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        // The cell size only changes how many seeds the frame wants, and the
        // step loop grows or drops them one at a time, so nothing rebuilds.
        this.cfg = cfg
    }

    private step() {
        if (this.disposed || this.width <= 0 || this.seeds.length === 0) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        const ctx = this.ctx

        /*
         * Added and dropped one at a time rather than rebuilt, so dragging the
         * frame wider grows new territory into it instead of reshuffling every
         * cell on screen.
         */
        const want = this.wanted(S)
        if (this.seeds.length < want) this.spawn(S)
        else if (this.seeds.length > want) this.seeds.pop()

        if (this.px >= 0) {
            const k = 1 - Math.exp(-dt * 12)
            this.px += (this.tx - this.px) * k
            this.py += (this.ty - this.py) * k
        }
        const hover = this.cfg.followPointer && this.px >= 0 ? this.gripTarget : 0
        this.grip += (hover - this.grip) * (1 - Math.exp(-dt * 4))

        for (let i = 0; i < this.seeds.length; i++) {
            const s = this.seeds[i]
            // Speed is read from the slider each frame, so the heading is kept
            // and only the rate changes.
            const sp = Math.hypot(s.vx, s.vy) || 1
            s.x += (s.vx / sp) * S.speed * dt
            s.y += (s.vy / sp) * S.speed * dt
            /*
              * Reflected rather than wrapped — a seed that wrapped would drag
              * its whole cell across the frame in one frame. The overshoot is
              * mirrored back in and the heading is set outright rather than
              * negated, so a seed that finds itself outside (after a resize,
              * say) is turned inward once instead of flipping every frame and
              * sticking to the edge.
              */
            if (s.x < 0) {
                s.x = -s.x
                s.vx = Math.abs(s.vx)
            } else if (s.x > this.width) {
                s.x = 2 * this.width - s.x
                s.vx = -Math.abs(s.vx)
            }
            if (s.y < 0) {
                s.y = -s.y
                s.vy = Math.abs(s.vy)
            } else if (s.y > this.height) {
                s.y = 2 * this.height - s.y
                s.vy = -Math.abs(s.vy)
            }
        }

        ctx.clearRect(0, 0, this.width, this.height)
        // Painted rather than left clear, so the dots sit on their own ground.
        // A transparent value here lets the frame's own fill through.
        if (this.cfg.background) {
            ctx.fillStyle = this.cfg.background
            ctx.fillRect(0, 0, this.width, this.height)
        }

        const a = parseHex(this.cfg.colorA || DEFAULTS.colorA)
        const b = parseHex(this.cfg.colorB || DEFAULTS.colorB)
        const step = Math.max(8, S.spacing)
        const cols = Math.ceil(this.width / step) + 1
        const rows = Math.ceil(this.height / step) + 1
        const ox = (this.width - (cols - 1) * step) * 0.5
        const oy = (this.height - (rows - 1) * step) * 0.5
        const cursorLive = this.grip > 0.02 && this.px >= 0

        for (let r = 0; r < rows; r++) {
            const y = oy + r * step
            for (let c = 0; c < cols; c++) {
                const x = ox + c * step

                // Nearest and second nearest, in one pass. The second is what
                // the borders are made of.
                let best = Infinity
                let second = Infinity
                let tint = 0
                for (let i = 0; i < this.seeds.length; i++) {
                    const s = this.seeds[i]
                    const dx = x - s.x
                    const dy = y - s.y
                    const d = dx * dx + dy * dy
                    if (d < best) {
                        second = best
                        best = d
                        tint = s.tint
                    } else if (d < second) {
                        second = d
                    }
                }

                if (cursorLive) {
                    const dx = x - this.px
                    const dy = y - this.py
                    // Divided by the bias, which is how a weighted Voronoi
                    // works: the cursor claims ground it would lose on plain
                    // distance, and its cell grows.
                    const d = ((dx * dx + dy * dy) / S.bias) * (1 / this.grip)
                    if (d < best) {
                        second = best
                        best = d
                        tint = 0.5
                    } else if (d < second) {
                        second = d
                    }
                }

                const d1 = Math.sqrt(best)
                const d2 = Math.sqrt(second === Infinity ? best : second)
                /*
                 * How firmly this dot belongs to its cell. Zero on a border,
                 * one deep inside. A ratio rather than a distance, so it does
                 * not change when the cells do.
                 */
                const own = d1 + d2 > 0.001 ? (d2 - d1) / (d2 + d1) : 1
                const solid = Math.min(1, own / S.edge)

                ctx.fillStyle = mix(a, b, tint, 0.12 + solid * 0.8)
                ctx.beginPath()
                ctx.arc(x, y, S.size * (0.45 + solid * 0.75), 0, Math.PI * 2)
                ctx.fill()
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

interface CellFieldProps {
    background?: string
    colorA?: string
    colorB?: string
    cells?: number
    count?: number
    size?: number
    edge?: number
    speed?: number
    followPointer?: boolean
    strength?: number
    style?: React.CSSProperties
}

export default function CellField(props: CellFieldProps) {
    const {
        background = DEFAULTS.background,
        colorA = DEFAULTS.colorA,
        colorB = DEFAULTS.colorB,
        cells = DEFAULTS.cells,
        count = DEFAULTS.count,
        size = DEFAULTS.size,
        edge = DEFAULTS.edge,
        speed = DEFAULTS.speed,
        followPointer = DEFAULTS.followPointer,
        strength = DEFAULTS.strength,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<CellScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        background,
        colorA,
        colorB,
        cells,
        count,
        size,
        edge,
        speed,
        followPointer,
        strength,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: CellScene
        try {
            scene = new CellScene(container, cfgRef.current)
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
        background,
        colorA,
        colorB,
        cells,
        count,
        size,
        edge,
        speed,
        followPointer,
        strength,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Dots grouped into drifting cells around moving seeds"
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
