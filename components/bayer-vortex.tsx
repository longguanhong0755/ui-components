"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * Bayer Vortex — spiral arms, ordered-dithered.
 *
 * The field is a spiral: the angle plus a term that grows with the log of the
 * radius, which is what makes the arms curl tighter toward the middle instead
 * of fanning out evenly. Taking the log rather than the radius itself is the
 * whole difference between a whirlpool and a pinwheel.
 *
 * Tone is quantised with an 8×8 Bayer matrix. Each pixel is compared against a
 * threshold taken from its position in that matrix, so a smooth gradient turns
 * into the fixed cross-hatch of ordered dithering rather than the noise of a
 * random one — the pattern is stable frame to frame, which is why it reads as
 * a texture and not as static.
 *
 * The field is drawn into a small buffer and scaled up with smoothing off, so
 * the dither cells stay square and hard-edged. Smoothing it would blur the very
 * pattern the whole thing is made of.
 *
 * Hovering winds it up. The boost is applied to the clock's rate rather than to
 * the clock itself, and it eases in and out, so the spin gathers and falls away
 * instead of jumping the arms to a new position the moment the pointer arrives.
 */

// The ordered-dither threshold map. Values 0–63, arranged so that neighbouring
// cells are as far apart in the sequence as possible — that spread is what
// makes the pattern look even rather than clumped.
const BAYER8 = [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
    14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
    51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55,
    23, 61, 29, 53, 21,
]

const DEFAULTS = {
    colorA: "#031300",
    colorB: "#00FFFA",
    accent: "#0FFB06",
    pixel: 20,
    levels: 2,
    arms: 20,
    twist: 0,
    speed: 9,
    hoverBoost: true,
    boost: 12,
}

type Config = {
    colorA: string
    colorB: string
    accent: string
    pixel: number
    levels: number
    arms: number
    twist: number
    speed: number
    hoverBoost: boolean
    boost: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the field wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        // Screen pixels per dither cell.
        pixel: 14 - clamp(cfg.pixel, 1, 20, DEFAULTS.pixel) * 0.55,
        levels: Math.max(2, Math.round(clamp(cfg.levels, 2, 8, DEFAULTS.levels))),
        arms: Math.round(1 + clamp(cfg.arms, 1, 20, DEFAULTS.arms) * 0.6),
        twist: clamp(cfg.twist, 0, 20, DEFAULTS.twist) * 0.5,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.18,
        // Extra turns of the clock while the pointer is over it, as a multiple
        // of the resting rate.
        boost: clamp(cfg.boost, 0, 20, DEFAULTS.boost) * 0.32,
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

class VortexScene {
    private container: HTMLElement
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private cfg: Config

    private buffer: HTMLCanvasElement
    private bufferCtx: CanvasRenderingContext2D
    private image: ImageData | null = null
    private bufferWidth = 0
    private bufferHeight = 0

    private width = 0
    private height = 0
    private time = 0
    private frameId = 0
    private lastT = 0
    private disposed = false

    // Eased rather than switched, so the wind-up and the run-down are both
    // gradual — see the note at the top.
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
        // Belt and braces with the context flag: some browsers scale the
        // element itself and would smooth the cells on the way up.
        this.canvas.style.imageRendering = "pixelated"
        container.appendChild(this.canvas)

        const ctx = this.canvas.getContext("2d")
        if (!ctx) throw new Error("no 2d context")
        this.ctx = ctx

        this.buffer = document.createElement("canvas")
        const bufferCtx = this.buffer.getContext("2d")
        if (!bufferCtx) throw new Error("no 2d context")
        this.bufferCtx = bufferCtx

        container.addEventListener("pointerenter", this.onEnter)
        container.addEventListener("pointerleave", this.onLeave)
        container.addEventListener("pointercancel", this.onLeave)
    }

    private onEnter = () => {
        this.gripTarget = 1
    }
    private onLeave = () => {
        this.gripTarget = 0
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
        this.width = width
        this.height = height
        this.canvas.width = Math.round(width)
        this.canvas.height = Math.round(height)
        this.resizeBuffer()
    }

    private resizeBuffer() {
        const S = settingsFor(this.cfg)
        const pixel = Math.max(1, S.pixel)
        const w = Math.max(16, Math.round(this.width / pixel))
        const h = Math.max(16, Math.round(this.height / pixel))
        if (w === this.bufferWidth && h === this.bufferHeight) return
        this.bufferWidth = w
        this.bufferHeight = h
        this.buffer.width = w
        this.buffer.height = h
        this.image = this.bufferCtx.createImageData(w, h)
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        // Only the cell size changes the buffer; everything else is read per
        // frame.
        if (prev.pixel !== cfg.pixel) this.resizeBuffer()
    }

    private step() {
        if (this.disposed || this.width <= 0) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        if (!this.image) return

        const wanted = this.cfg.hoverBoost ? this.gripTarget : 0
        this.grip += (wanted - this.grip) * (1 - Math.exp(-dt * 2.5))
        /*
         * The boost multiplies the rate the clock advances at, not the clock
         * itself. Scaling the clock would jump the arms to a new position the
         * moment the pointer arrived; scaling the rate winds them up from
         * wherever they already are.
         */
        this.time += dt * (1 + this.grip * S.boost)

        const dark = parseHex(this.cfg.colorA || DEFAULTS.colorA)
        const light = parseHex(this.cfg.colorB || DEFAULTS.colorB)
        const hot = parseHex(this.cfg.accent || DEFAULTS.accent)

        const data = this.image.data
        const bw = this.bufferWidth
        const bh = this.bufferHeight
        const levels = S.levels
        const last = levels - 1
        const t = this.time * S.speed

        // The eye of the vortex sits in the middle of the frame.
        const cx = bw * 0.5
        const cy = bh * 0.5
        const scale = 2 / Math.min(bw, bh)

        for (let y = 0; y < bh; y++) {
            for (let x = 0; x < bw; x++) {
                const dx = (x - cx) * scale
                const dy = (y - cy) * scale
                const r = Math.sqrt(dx * dx + dy * dy) + 0.0001
                const a = Math.atan2(dy, dx)

                /*
                 * The log of the radius, not the radius. That is what winds the
                 * arms tighter toward the middle and makes it a whirlpool
                 * rather than a pinwheel.
                 */
                const spiral = a * S.arms + Math.log(r) * S.twist - t * 4
                let v = 0.5 + 0.5 * Math.sin(spiral)

                // Faded out at the rim so the arms do not simply stop at the
                // edge of the frame, and pinched at the eye.
                v *= Math.min(1, r * 3.2) * Math.max(0, 1 - r * 0.55)

                /*
                 * Ordered dithering: the threshold comes from where the pixel
                 * sits in the 8×8 matrix, so the pattern is fixed in place. A
                 * random threshold would give the same average tone as noise
                 * that crawls from frame to frame.
                 */
                const m = BAYER8[(y & 7) * 8 + (x & 7)] / 64 - 0.5
                let idx = Math.round(v * last + m)
                if (idx < 0) idx = 0
                else if (idx > last) idx = last

                const f = idx / last
                // The top level takes the accent, so the brightest parts of the
                // arms carry a second colour.
                const to = idx === last && levels > 2 ? hot : light
                const i = (y * bw + x) * 4
                data[i] = dark[0] + (to[0] - dark[0]) * f
                data[i + 1] = dark[1] + (to[1] - dark[1]) * f
                data[i + 2] = dark[2] + (to[2] - dark[2]) * f
                data[i + 3] = 255
            }
        }

        this.bufferCtx.putImageData(this.image, 0, 0)
        // Smoothing off: the dither cells have to stay square, and blurring
        // them destroys the only thing the picture is made of.
        this.ctx.imageSmoothingEnabled = false
        this.ctx.drawImage(this.buffer, 0, 0, this.width, this.height)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.container.removeEventListener("pointerenter", this.onEnter)
        this.container.removeEventListener("pointerleave", this.onLeave)
        this.container.removeEventListener("pointercancel", this.onLeave)
        if (this.canvas.parentNode === this.container) {
            this.container.removeChild(this.canvas)
        }
    }
}

export interface BayerVortexProps {
    colorA?: string
    colorB?: string
    accent?: string
    pixel?: number
    levels?: number
    arms?: number
    twist?: number
    speed?: number
    hoverBoost?: boolean
    boost?: number
    style?: React.CSSProperties
}

export default function BayerVortex(props: BayerVortexProps) {
    const {
        colorA = DEFAULTS.colorA,
        colorB = DEFAULTS.colorB,
        accent = DEFAULTS.accent,
        pixel = DEFAULTS.pixel,
        levels = DEFAULTS.levels,
        arms = DEFAULTS.arms,
        twist = DEFAULTS.twist,
        speed = DEFAULTS.speed,
        hoverBoost = DEFAULTS.hoverBoost,
        boost = DEFAULTS.boost,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<VortexScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        colorA,
        colorB,
        accent,
        pixel,
        levels,
        arms,
        twist,
        speed,
        hoverBoost,
        boost,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: VortexScene
        try {
            scene = new VortexScene(container, cfgRef.current)
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
        accent,
        pixel,
        levels,
        arms,
        twist,
        speed,
        hoverBoost,
        boost,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A dithered vortex of spiral arms"
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

BayerVortex.displayName = "Bayer Vortex"
