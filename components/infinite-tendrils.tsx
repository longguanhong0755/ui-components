"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * Flow Ribbons — particles let loose in a field of angles.
 *
 * There is no path anywhere in this. A noise function returns an angle for
 * every point in the plane, each particle reads the angle under itself and
 * takes one step along it, and the ribbons are just the record of where they
 * went. Neighbouring points hold similar angles, so particles that start apart
 * end up running in parallel — that is where the combed, contour-map look comes
 * from, and it is a property of the noise rather than anything drawn.
 *
 * The angle is two octaves: a long swell that sets the overall sweep and a
 * finer one riding on it that gives the ribbons their fray. One octave alone
 * is either too smooth to look alive or too rough to comb.
 *
 * Trails are a fade rather than a stored path: each frame the whole canvas is
 * pulled a little toward transparent with a destination-out fill, so old ink
 * thins out and the canvas keeps compositing over whatever is behind it. The
 * Trail control is exponential — that fill is a repeated multiply, so only a
 * geometric slider gives an even feel across its range.
 *
 * The cursor gathers rather than pushes: ribbons near it steer onto a bearing
 * that is most of a right angle off the line to the pointer, so they curve in,
 * wind around it and orbit. Taking that bearing the other way round is what
 * makes ribbons appear to shoot out of the cursor instead of following it.
 */

const DEFAULTS = {
    colorA: "#7B6CFF",
    colorB: "#37E5C8",
    count: 12,
    scale: 8,
    size: 6,
    trail: 16,
    speed: 20,
    followPointer: true,
    strength: 20,
}

type Config = {
    colorA: string
    colorB: string
    count: number
    scale: number
    size: number
    trail: number
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
    const trail = clamp(cfg.trail, 1, 20, DEFAULTS.trail)
    return {
        count: Math.round(90 + clamp(cfg.count, 1, 20, DEFAULTS.count) * 65),
        // Field frequency. Low is long sweeping ribbons, high is turbulence.
        scale: 0.09 + clamp(cfg.scale, 1, 20, DEFAULTS.scale) * 0.055,
        size: 0.4 + clamp(cfg.size, 1, 20, DEFAULTS.size) * 0.16,
        /*
         * Each frame multiplies what is on the canvas by (1 - fade), so the ink
         * that survives after n frames is that raised to the n. A linear
         * slider on the fade would spend its whole top half looking identical;
         * a geometric one spreads the range evenly.
         *
         * The floor matters more than it looks. Canvas alpha is eight bits, and
         * below about 0.02 a multiply no longer moves the last step or two to
         * zero — it rounds back to what it was, and the faintest ink stays on
         * the canvas for good. At 0.02 the longest trail is gone inside three
         * seconds and nothing is left behind.
         */
        fade: Math.max(0.02, 0.18 * Math.pow(0.8907, trail - 1)),
        speed: 12 + clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 9,
        reach: 90 + clamp(cfg.strength, 1, 20, DEFAULTS.strength) * 26,
        // How hard the cursor overrides the field angle at the middle of that
        // reach. Near 1 the whirl wins outright.
        whirl: 0.35 + clamp(cfg.strength, 1, 20, DEFAULTS.strength) * 0.032,
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

/* A hash and a lerped value noise. Cheap, and smooth enough that the angles it
 * returns do not tear the ribbons apart between neighbouring cells. */
function hash(x: number, y: number): number {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    return s - Math.floor(s)
}

function noise2(x: number, y: number): number {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    const u = xf * xf * (3 - 2 * xf)
    const v = yf * yf * (3 - 2 * yf)
    const a = hash(xi, yi)
    const b = hash(xi + 1, yi)
    const c = hash(xi, yi + 1)
    const d = hash(xi + 1, yi + 1)
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v
}

type Mote = {
    x: number
    y: number
    life: number
    span: number
    tint: number
    weight: number
    pace: number
}

class FlowScene {
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

    private spawn(m: Mote) {
        m.x = Math.random() * this.width
        m.y = Math.random() * this.height
        // Staggered lifetimes, or the whole population would blink out at once.
        m.span = 2 + Math.random() * 6
        m.life = m.span
        m.tint = Math.random()
        // Thin hairs with a few heavier strokes among them reads as depth; one
        // uniform width reads as a screen effect.
        m.weight = 0.35 + Math.random() * Math.random() * 1.9
        m.pace = 0.6 + Math.random() * 0.8
    }

    private build() {
        const S = settingsFor(this.cfg)
        this.motes = []
        for (let i = 0; i < S.count; i++) {
            const m: Mote = {
                x: 0,
                y: 0,
                life: 0,
                span: 1,
                tint: 0,
                weight: 1,
                pace: 1,
            }
            this.spawn(m)
            // Lifetimes spread across the range on the first fill, so the
            // population does not turn over all at once a few seconds in.
            m.life = Math.random() * m.span
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
        // Only the count owns the population; the field, the trail and the
        // reach are read each frame, so the ribbons keep running while the
        // sliders move.
        if (prev.count !== cfg.count) this.build()
    }

    private step() {
        if (this.disposed || this.width <= 0 || this.motes.length === 0) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        const stalled = dt > 0.4
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        const ctx = this.ctx
        this.time += dt

        /*
         * A long gap means the loop was not running — a hidden tab, a section
         * scrolled out, the component switched away and back. The canvas still
         * holds the last frame it drew, which would reappear as a slab of stale
         * ribbon, so it is wiped rather than faded into.
         */
        if (stalled) ctx.clearRect(0, 0, this.width, this.height)

        if (this.px >= 0) {
            const k = 1 - Math.exp(-dt * 12)
            this.px += (this.tx - this.px) * k
            this.py += (this.ty - this.py) * k
        }
        const want = this.cfg.followPointer && this.px >= 0 ? this.gripTarget : 0
        this.grip += (want - this.grip) * (1 - Math.exp(-dt * 4))

        /*
         * The trail. destination-out subtracts alpha instead of painting a
         * colour over the top, so the canvas fades toward transparent and sits
         * on whatever fill the frame has rather than needing its own.
         *
         * Scaled by the frame time, so a long trail on a 144Hz screen looks the
         * same as on a 60Hz one instead of vanishing twice as fast.
         */
        const fade = Math.min(0.6, S.fade * dt * 60)
        ctx.globalCompositeOperation = "destination-out"
        ctx.fillStyle = "rgba(0,0,0," + fade + ")"
        ctx.fillRect(0, 0, this.width, this.height)
        ctx.globalCompositeOperation = "source-over"

        ctx.lineCap = "round"
        const reach = S.reach
        const reach2 = reach * reach
        const a = parseHex(this.cfg.colorA || DEFAULTS.colorA)
        const b = parseHex(this.cfg.colorB || DEFAULTS.colorB)

        for (let i = 0; i < this.motes.length; i++) {
            const m = this.motes[i]

            /*
             * Two octaves of the field. The third dimension is time, folded
             * into the sample position, so the whole thing slowly reorganises
             * instead of holding one shape forever.
             */
            const swell = noise2(
                m.x * S.scale * 0.01 + this.time * 0.12,
                m.y * S.scale * 0.01 - this.time * 0.09
            )
            const fray = noise2(
                m.x * S.scale * 0.031 - this.time * 0.2,
                m.y * S.scale * 0.031 + this.time * 0.16
            )
            let ang = (swell * 0.78 + fray * 0.22) * Math.PI * 4
            const pace = S.speed * m.pace

            if (this.grip > 0.01) {
                // Measured toward the pointer, not away from it. The other way
                // round the ribbons spiral outward and appear to be thrown off
                // the cursor rather than gathering around it.
                const dx = this.px - m.x
                const dy = this.py - m.y
                const d2 = dx * dx + dy * dy
                if (d2 < reach2 && d2 > 1) {
                    const dist = Math.sqrt(d2)
                    // Squared falloff — a soft outer edge with a firm core, so
                    // the whirl has a centre rather than a flat disc of pull.
                    const f = (1 - dist / reach) * (1 - dist / reach) * this.grip
                    /*
                     * The heading to steer toward: the bearing to the pointer,
                     * turned by nearly a right angle. A quarter turn short of
                     * it leaves a component pointing at the cursor, so distant
                     * ribbons come in; the turn opens out to a full right angle
                     * close in, where a pure orbit keeps them circling instead
                     * of piling into a blob at the middle.
                     */
                    const swing = Math.PI * (0.5 - 0.16 * (dist / reach))
                    const target = Math.atan2(dy, dx) - swing
                    let delta = target - ang
                    // Wrapped to the short way round, or a mote near the seam
                    // turns the long way and the ribbon kinks.
                    while (delta > Math.PI) delta -= Math.PI * 2
                    while (delta < -Math.PI) delta += Math.PI * 2
                    ang += delta * Math.min(1, f * S.whirl * 2.2)
                }
            }

            const px = m.x
            const py = m.y
            m.x += Math.cos(ang) * pace * dt
            m.y += Math.sin(ang) * pace * dt
            m.life -= dt

            // Respawned on death or on leaving the frame, so the population
            // stays even instead of draining into a corner.
            if (
                m.life <= 0 ||
                m.x < -10 ||
                m.x > this.width + 10 ||
                m.y < -10 ||
                m.y > this.height + 10
            ) {
                this.spawn(m)
                continue
            }

            /*
             * Faded in at birth and out at death. Without it a ribbon starts
             * and ends on a hard dot, and with a long trail those dots are the
             * first thing the eye finds.
             */
            const t = m.life / m.span
            const ends = Math.min(1, Math.min(t, 1 - t) * 6)
            ctx.strokeStyle = mix(a, b, m.tint, 0.2 + ends * 0.55)
            ctx.lineWidth = S.size * m.weight
            ctx.beginPath()
            ctx.moveTo(px, py)
            ctx.lineTo(m.x, m.y)
            ctx.stroke()
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

interface FlowRibbonsProps {
    colorA?: string
    colorB?: string
    count?: number
    scale?: number
    size?: number
    trail?: number
    speed?: number
    followPointer?: boolean
    strength?: number
    style?: React.CSSProperties
}

function __BaseImpl_FlowRibbons(props: FlowRibbonsProps) {
    const {
        colorA = DEFAULTS.colorA,
        colorB = DEFAULTS.colorB,
        count = DEFAULTS.count,
        scale = DEFAULTS.scale,
        size = DEFAULTS.size,
        trail = DEFAULTS.trail,
        speed = DEFAULTS.speed,
        followPointer = DEFAULTS.followPointer,
        strength = DEFAULTS.strength,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<FlowScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        colorA,
        colorB,
        count,
        scale,
        size,
        trail,
        speed,
        followPointer,
        strength,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: FlowScene
        try {
            scene = new FlowScene(container, cfgRef.current)
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
        count,
        scale,
        size,
        trail,
        speed,
        followPointer,
        strength,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Particles tracing ribbons through a field of angles"
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

FlowRibbons.displayName = "Flow Ribbons"

const __presetProps = {
  "size": 5,
  "count": 18,
  "scale": 14,
  "speed": 100,
  "trail": 20,
  "colorA": "",
  "colorB": "",
  "strength": 13,
  "followPointer": true
};

export default function FlowRibbons(props: Record<string, unknown>) {
  return <__BaseImpl_FlowRibbons {...(__presetProps as Record<string, unknown>)} {...props} />;
}
