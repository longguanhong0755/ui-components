"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * Vortex Dust — motes falling in toward a drain.
 *
 * Each mote is held in polar coordinates and moves by two numbers: an angular
 * rate that rises as it gets closer, and a slow inward drift. That rising rate
 * is the whole effect — it is what bends the paths into spirals instead of
 * straight lines to the middle, and it is the same reason water speeds up as it
 * goes down a plughole.
 *
 * Motes that reach the middle are respawned at the rim with a new angle, so the
 * population is constant and the spiral never empties out.
 *
 * The trail is a destination-out fade rather than a stored path, so the canvas
 * stays transparent and sits over whatever fill the frame has.
 */

const DEFAULTS = {
    colorA: "#FFFFFF",
    colorB: "#7900FF",
    count: 20,
    size: 8,
    pull: 20,
    speed: 10,
    followPointer: true,
    strength: 10,
}

type Config = {
    colorA: string
    colorB: string
    count: number
    size: number
    pull: number
    speed: number
    followPointer: boolean
    strength: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the vortex wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        count: Math.round(50 + clamp(cfg.count, 1, 20, DEFAULTS.count) * 40),
        size: 0.4 + clamp(cfg.size, 1, 20, DEFAULTS.size) * 0.13,
        // Inward drift, as a fraction of the radius per second.
        pull: 0.02 + clamp(cfg.pull, 0, 20, DEFAULTS.pull) * 0.018,
        speed: 8 + clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 6,
        // How much of the way to the cursor the drain travels.
        follow: clamp(cfg.strength, 1, 20, DEFAULTS.strength) * 0.05,
    }
}

type Mote = { a: number; r: number; tint: number; wob: number }

class VortexScene {
    private container: HTMLElement
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private cfg: Config

    private motes: Mote[] = []
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

    private rim() {
        // Beyond the corner, so motes drift in from off-frame rather than
        // appearing on a visible circle.
        return Math.max(this.width, this.height) * 0.78
    }

    private spawn(m: Mote, scatter: boolean) {
        m.a = Math.random() * Math.PI * 2
        // On the first fill the radii are spread across the whole disc, or the
        // opening frames would show one tight ring marching inward.
        m.r = scatter ? Math.random() * this.rim() : this.rim() * (0.9 + Math.random() * 0.2)
        m.tint = Math.random()
        m.wob = Math.random() * Math.PI * 2
    }

    private build() {
        const S = settingsFor(this.cfg)
        this.motes = []
        for (let i = 0; i < S.count; i++) {
            const m: Mote = { a: 0, r: 0, tint: 0, wob: 0 }
            this.spawn(m, true)
            this.motes.push(m)
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
        const first = this.width === 0
        this.width = width
        this.height = height
        this.canvas.width = Math.round(width * this.dpr)
        this.canvas.height = Math.round(height * this.dpr)
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
        if (first || this.motes.length === 0) this.build()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        if (prev.count !== cfg.count) this.build()
    }

    private step() {
        if (this.disposed || this.width <= 0 || this.motes.length === 0) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        const ctx = this.ctx
        this.time += dt

        if (this.px >= 0) {
            const k = 1 - Math.exp(-dt * 6)
            this.px += (this.tx - this.px) * k
            this.py += (this.ty - this.py) * k
        }
        const want = this.cfg.followPointer && this.px >= 0 ? this.gripTarget : 0
        this.grip += (want - this.grip) * (1 - Math.exp(-dt * 2.5))

        const homeX = this.width * 0.5
        const homeY = this.height * 0.5
        const cx = homeX + (this.px - homeX) * this.grip * S.follow * 1.6
        const cy = homeY + (this.py - homeY) * this.grip * S.follow * 1.6

        /*
         * The trail, fixed at what the old Fade slider gave at 20 — a short
         * smear rather than long arcs. Scaled by the frame time, so it looks
         * the same on a 144Hz screen as on a 60Hz one.
         */
        ctx.globalCompositeOperation = "destination-out"
        ctx.fillStyle = "rgba(0,0,0," + Math.min(0.6, 0.29 * dt * 60) + ")"
        ctx.fillRect(0, 0, this.width, this.height)
        ctx.globalCompositeOperation = "source-over"

        ctx.lineCap = "round"
        const a = this.cfg.colorA || DEFAULTS.colorA
        const b = this.cfg.colorB || DEFAULTS.colorB
        const rim = this.rim()

        for (let i = 0; i < this.motes.length; i++) {
            const m = this.motes[i]

            const px = cx + Math.cos(m.a) * m.r
            const py = cy + Math.sin(m.a) * m.r

            /*
             * Angular rate scaled by the inverse of the radius. A constant rate
             * would turn the field into a rigid disc; this is what makes the
             * paths spiral and the middle spin up.
             */
            m.a += (S.speed / (m.r * 0.35 + 24)) * dt * 6
            m.r -= m.r * S.pull * dt * 1.6
            // A little breathing on the radius, so the spiral is not a set of
            // perfectly clean arcs.
            m.r += Math.sin(this.time * 1.4 + m.wob) * 6 * dt

            if (m.r < 6) {
                this.spawn(m, false)
                continue
            }

            const x = cx + Math.cos(m.a) * m.r
            const y = cy + Math.sin(m.a) * m.r
            const near = 1 - Math.min(1, m.r / rim)

            ctx.strokeStyle = m.tint < 0.5 ? a : b
            ctx.globalAlpha = 0.15 + near * 0.7
            ctx.lineWidth = S.size * (0.6 + near * 1.6)
            ctx.beginPath()
            ctx.moveTo(px, py)
            ctx.lineTo(x, y)
            ctx.stroke()
        }
        ctx.globalAlpha = 1
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

interface VortexDustProps {
    colorA?: string
    colorB?: string
    count?: number
    size?: number
    pull?: number
    speed?: number
    followPointer?: boolean
    strength?: number
    style?: React.CSSProperties
}

export default function VortexDust(props: VortexDustProps) {
    const {
        colorA = DEFAULTS.colorA,
        colorB = DEFAULTS.colorB,
        count = DEFAULTS.count,
        size = DEFAULTS.size,
        pull = DEFAULTS.pull,
        speed = DEFAULTS.speed,
        followPointer = DEFAULTS.followPointer,
        strength = DEFAULTS.strength,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<VortexScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        colorA,
        colorB,
        count,
        size,
        pull,
        speed,
        followPointer,
        strength,
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
    }, [colorA, colorB, count, size, pull, speed, followPointer, strength])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Dust spiralling inward toward a drifting centre"
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

VortexDust.displayName = "Vortex Dust"
