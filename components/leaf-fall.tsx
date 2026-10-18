"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/**
 * LEAF FALL
 *
 * Drifting, tumbling leaves on a transparent backdrop. Canvas 2D, no
 * dependencies, no WebGL, no Three.js. Drop it over a hero, a card, or a
 * whole page.
 *
 * WHY 2D AND NOT WEBGL
 *
 *   A falling leaf is read by its tumble, not by its path, and the tumble is
 *   the one thing a flat sprite normally cannot do: a billboarded quad always
 *   faces you, so it never thins to an edge and the whole drift reads as
 *   confetti sliding down a pane.
 *
 *   The trick here is that turning a flat leaf about its own vertical axis is
 *   exactly a horizontal squash. `ctx.scale(cos(phase), 1)` presents the face
 *   at 1, thins to an edge at 0, and flips to the back at -1, which the canvas
 *   gives for free because a negative scale mirrors the sprite. So the tumble
 *   costs one cosine and no 3D pipeline at all.
 *
 *   Everything else follows from that. No geometry means no Three, which means
 *   this ships as one file and adds nothing to the bundle.
 *
 * THE SPRITES
 *
 *   Filling a bezier leaf outline 150 times a frame is real work; blitting a
 *   pre-rendered bitmap is not. Each colour gets one offscreen canvas, baked
 *   once with its fill, its veins and its base shading, and the loop is then
 *   nothing but transform-and-blit.
 *
 *   Shapes are built from polar outlines rather than traced by hand: the maple
 *   is five lobes with notches cut between them, the ginkgo is a wavy fan with
 *   a cleft, the simple leaf is two arcs meeting at a point. Each has a stem,
 *   which matters more than it sounds — a leaf with no stem reads as a petal.
 *
 * DEPTH
 *
 *   Each leaf holds a depth in 0..1 that drives size, opacity and fall rate
 *   together. Near leaves are bigger, brighter and faster. Driving all three
 *   off one number is what makes it read as space rather than as a size
 *   distribution, and it costs one lerp.
 *
 * PERFORMANCE
 *
 *   Cheap by construction: N transformed blits per frame and nothing else, no
 *   per-frame allocation, no shadow, no filter, no gradient rebuilt in the
 *   loop. 150 leaves is comfortable; the count is exposed because the right
 *   number depends entirely on the panel size.
 *
 *   IntersectionObserver and visibilitychange stop the RAF outright when the
 *   canvas is offscreen or the tab is backgrounded. DPR is capped at 2.
 *
 * REDUCED MOTION
 *
 *   prefers-reduced-motion draws a single scattered frame and stops. Not an
 *   empty canvas, and not a loop nobody asked for.
 */

export type LeafShape = "Maple" | "Ginkgo" | "Simple"

export interface LeafFallProps {
    className?: string
    style?: CSSProperties
    /** Defaults to transparent so this can sit over anything. */
    background?: string
    shape?: LeafShape
    /** 1..400. */
    count?: number
    /** px, the long axis of a mid-depth leaf. */
    size?: number
    /** 0..1. Spread of sizes around `size`. */
    sizeVariance?: number
    /** 0..3. Descent rate. */
    fallSpeed?: number
    /** -2..2. Steady sideways drift. Negative blows left. */
    wind?: number
    /** 0..2. Side-to-side slip as a leaf sheds air off one edge, then the other. */
    sway?: number
    /** 0..2. How fast leaves turn over. 0 keeps every face to camera. */
    tumble?: number
    colors?: {
        a?: string
        b?: string
        c?: string
        d?: string
        e?: string
    }
    /** 0..1. How much the farthest leaves fade back. 0 is a flat field. */
    depthFade?: number
    /** 0..5. Leaves shove away from the pointer while hovering. 0 disables the listener. */
    repelIntensity?: number
}

export const LEAF_FALL_DEFAULTS = {
    background: "#000000",
    shape: "Maple",
    count: 231,
    size: 38,
    sizeVariance: 0.55,
    fallSpeed: 1,
    wind: 0.25,
    sway: 2,
    tumble: 2,
    colors: {
        a: "#C2410C",
        b: "#EA9227",
        c: "#8C2F1B",
        d: "#4A7C59",
        e: "#B8322D",
    },
    depthFade: 1,
    repelIntensity: 5,
} as const

/** Rough relative cost, for the catalog's GPU budget field. */
export const ESTIMATED_GPU_COST = 1 // 1 cheap, 5 heavy

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const TAU = Math.PI * 2

/* ------------------------------------------------------------------ */
/* leaf outlines                                                       */
/* ------------------------------------------------------------------ */

/**
 * All three are authored in a unit box centred on the origin, tip at -y, stem
 * at +y, so the sprite baker can treat them interchangeably.
 */

/** Lobe lengths, centre longest. Shared by the outline and its veins. */
const MAPLE_LEN = [0.62, 0.84, 1.0, 0.84, 0.62]

function pathMaple(ctx: CanvasRenderingContext2D) {
    // five lobes over a 200 degree fan, with a notch cut back between each
    const LOBES = 5
    const SPAN = 2.5
    const len = MAPLE_LEN
    // The shoulder spread and the notch depth are the whole silhouette, and
    // they trade against each other: narrow shoulders with a deep notch give
    // five spikes on a stalk, which reads as a thistle rather than a maple.
    // These are the widest lobes that still leave the notches visible.
    const SHOULDER = 0.34
    const SHOULDER_R = 0.72
    const NOTCH = 0.44
    const pts: [number, number][] = []
    for (let i = 0; i < LOBES; i++) {
        const a = -Math.PI / 2 - SPAN / 2 + (SPAN * i) / (LOBES - 1)
        // the shoulder, the point, then the other shoulder
        pts.push([Math.cos(a - SHOULDER) * len[i] * SHOULDER_R, Math.sin(a - SHOULDER) * len[i] * SHOULDER_R])
        pts.push([Math.cos(a) * len[i], Math.sin(a) * len[i]])
        pts.push([Math.cos(a + SHOULDER) * len[i] * SHOULDER_R, Math.sin(a + SHOULDER) * len[i] * SHOULDER_R])
        // the notch between this lobe and the next, cut back toward the stem
        if (i < LOBES - 1) {
            const na = a + SPAN / (LOBES - 1) / 2
            pts.push([Math.cos(na) * NOTCH, Math.sin(na) * NOTCH])
        }
    }
    ctx.beginPath()
    ctx.moveTo(0, 0.34)
    for (const [x, y] of pts) ctx.lineTo(x, y)
    ctx.closePath()
}

function pathGinkgo(ctx: CanvasRenderingContext2D) {
    const SPAN = 1.9
    ctx.beginPath()
    ctx.moveTo(0, 0.46)
    // the fan, with a wave along its outer edge
    const N = 40
    for (let i = 0; i <= N; i++) {
        const t = i / N
        const a = -Math.PI / 2 - SPAN / 2 + SPAN * t
        // the cleft: the fan is split down the middle
        const cleft = 1 - 0.22 * Math.exp(-Math.pow((t - 0.5) / 0.09, 2))
        const wave = 1 + 0.035 * Math.sin(t * 26)
        const r = 0.95 * cleft * wave
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
}

function pathSimple(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.moveTo(0, 0.5)
    ctx.quadraticCurveTo(0.62, 0.1, 0, -0.98)
    ctx.quadraticCurveTo(-0.62, 0.1, 0, 0.5)
    ctx.closePath()
}

function veinsMaple(ctx: CanvasRenderingContext2D) {
    const SPAN = 2.5
    const len = MAPLE_LEN
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 - SPAN / 2 + (SPAN * i) / 4
        ctx.moveTo(0, 0.22)
        ctx.lineTo(Math.cos(a) * len[i] * 0.86, Math.sin(a) * len[i] * 0.86)
    }
    ctx.stroke()
}

function veinsGinkgo(ctx: CanvasRenderingContext2D) {
    const SPAN = 1.9
    ctx.beginPath()
    for (let i = 0; i <= 9; i++) {
        const t = i / 9
        const a = -Math.PI / 2 - SPAN / 2 + SPAN * t
        ctx.moveTo(0, 0.4)
        ctx.lineTo(Math.cos(a) * 0.84, Math.sin(a) * 0.84)
    }
    ctx.stroke()
}

function veinsSimple(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.moveTo(0, 0.4)
    ctx.lineTo(0, -0.92)
    for (let i = 1; i <= 5; i++) {
        const y = 0.24 - i * 0.21
        const w = 0.42 * Math.sin((i / 6) * Math.PI)
        ctx.moveTo(0, y)
        ctx.lineTo(w, y - 0.16)
        ctx.moveTo(0, y)
        ctx.lineTo(-w, y - 0.16)
    }
    ctx.stroke()
}

/**
 * One leaf, baked to its own canvas at `px` on the long axis. The stem is drawn
 * before the blade so the blade covers where it joins.
 */
function bakeLeaf(shape: LeafShape, color: string, px: number): HTMLCanvasElement {
    const S = Math.max(8, Math.round(px))
    const c = document.createElement("canvas")
    c.width = S
    c.height = S
    const ctx = c.getContext("2d")
    if (!ctx) return c

    ctx.translate(S / 2, S / 2)
    ctx.scale(S / 2.35, S / 2.35)

    // stem
    ctx.strokeStyle = color
    ctx.lineWidth = 0.07
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(0, shape === "Ginkgo" ? 0.42 : 0.3)
    ctx.lineTo(0, 1.0)
    ctx.stroke()

    // blade
    if (shape === "Maple") pathMaple(ctx)
    else if (shape === "Ginkgo") pathGinkgo(ctx)
    else pathSimple(ctx)

    // a base-to-tip ramp: flat colour reads as a paper cut-out
    const grad = ctx.createLinearGradient(0, 0.5, 0, -1)
    grad.addColorStop(0, color)
    grad.addColorStop(1, color)
    ctx.fillStyle = grad
    ctx.fill()

    // shade the base half so the leaf has a near and far edge
    ctx.save()
    ctx.clip()
    const sh = ctx.createLinearGradient(0, 0.6, 0, -0.6)
    sh.addColorStop(0, "rgba(0,0,0,0.34)")
    sh.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = sh
    ctx.fillRect(-1.4, -1.4, 2.8, 2.8)

    // veins, clipped to the blade so they never run off the edge
    ctx.strokeStyle = "rgba(0,0,0,0.20)"
    ctx.lineWidth = 0.035
    if (shape === "Maple") veinsMaple(ctx)
    else if (shape === "Ginkgo") veinsGinkgo(ctx)
    else veinsSimple(ctx)
    ctx.restore()

    return c
}

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

type Leaf = {
    x: number
    y: number
    /** 0 far, 1 near. Drives size, opacity and fall rate together. */
    depth: number
    scale: number
    spin: number
    spinRate: number
    /** The turn-over. cos(flip) is the horizontal squash. */
    flip: number
    flipRate: number
    swayPh: number
    swayFreq: number
    swayAmp: number
    /** Pointer shove only; decays back to nothing. */
    vx: number
    vy: number
    sprite: number
}

export default function LeafFall(props: LeafFallProps) {
    const { className, style } = props
    const background = props.background ?? LEAF_FALL_DEFAULTS.background

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const controlsRef = useRef<{ start: () => void } | null>(null)

    // every knob is read through a ref so changing one never restarts the loop
    const live = useRef(props)
    live.current = props

    // sprites are rebuilt only when their inputs change, never per frame
    const rebuildSprites = useRef(true)
    const shape = props.shape ?? LEAF_FALL_DEFAULTS.shape
    const colorA = props.colors?.a ?? LEAF_FALL_DEFAULTS.colors.a
    const colorB = props.colors?.b ?? LEAF_FALL_DEFAULTS.colors.b
    const colorC = props.colors?.c ?? LEAF_FALL_DEFAULTS.colors.c
    const colorD = props.colors?.d ?? LEAF_FALL_DEFAULTS.colors.d
    const colorE = props.colors?.e ?? LEAF_FALL_DEFAULTS.colors.e
    const size = props.size ?? LEAF_FALL_DEFAULTS.size

    useEffect(() => {
        rebuildSprites.current = true
    }, [shape, colorA, colorB, colorC, colorD, colorE, size])

    useEffect(() => {
        const hostEl = hostRef.current
        const canvasEl = canvasRef.current
        if (!hostEl || !canvasEl) return
        // explicitly non-null consts: TS drops the narrowing inside the nested
        // function declarations below
        const host: HTMLDivElement = hostEl
        const canvas: HTMLCanvasElement = canvasEl
        const c2d = canvas.getContext("2d", { alpha: true })
        if (!c2d) return
        const ctx: CanvasRenderingContext2D = c2d

        const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
        let reduced = motion.matches

        let cssW = 1
        let cssH = 1
        let dpr = 1
        let sprites: HTMLCanvasElement[] = []
        let spriteMax = 1

        const leaves: Leaf[] = []
        let pointerX = -1e6
        let pointerY = -1e6

        function makeSprites() {
            const p = live.current
            const base = clamp(p.size ?? LEAF_FALL_DEFAULTS.size, 4, 400)
            const varr = clamp(p.sizeVariance ?? LEAF_FALL_DEFAULTS.sizeVariance, 0, 1)
            // bake at the largest size any leaf can reach, so scaling down is
            // a mip-quality shrink rather than a blurry blow-up
            spriteMax = Math.min(512, Math.ceil(base * (1 + varr) * 1.15 * Math.min(dpr, 2) * 1.25))
            const shp = p.shape ?? LEAF_FALL_DEFAULTS.shape
            sprites = [
                bakeLeaf(shp, p.colors?.a ?? LEAF_FALL_DEFAULTS.colors.a, spriteMax),
                bakeLeaf(shp, p.colors?.b ?? LEAF_FALL_DEFAULTS.colors.b, spriteMax),
                bakeLeaf(shp, p.colors?.c ?? LEAF_FALL_DEFAULTS.colors.c, spriteMax),
                bakeLeaf(shp, p.colors?.d ?? LEAF_FALL_DEFAULTS.colors.d, spriteMax),
                bakeLeaf(shp, p.colors?.e ?? LEAF_FALL_DEFAULTS.colors.e, spriteMax),
            ]
        }

        function seed(l: Leaf, fromTop: boolean) {
            const p = live.current
            const base = clamp(p.size ?? LEAF_FALL_DEFAULTS.size, 4, 400)
            const varr = clamp(p.sizeVariance ?? LEAF_FALL_DEFAULTS.sizeVariance, 0, 1)
            l.depth = Math.random()
            l.scale = base * (1 + (Math.random() * 2 - 1) * varr) * lerp(0.62, 1.15, l.depth)
            l.x = Math.random() * cssW
            l.y = fromTop ? -l.scale - Math.random() * cssH * 0.3 : Math.random() * cssH
            l.spin = Math.random() * TAU
            l.spinRate = (Math.random() * 2 - 1) * 1.5
            l.flip = Math.random() * TAU
            l.flipRate = 0.5 + Math.random() * 1.9
            l.swayPh = Math.random() * TAU
            l.swayFreq = 0.5 + Math.random() * 1.3
            l.swayAmp = 12 + Math.random() * 34
            l.vx = 0
            l.vy = 0
            l.sprite = (Math.random() * 5) | 0
        }

        function syncCount() {
            const want = clamp(Math.round(live.current.count ?? LEAF_FALL_DEFAULTS.count), 1, 400)
            while (leaves.length > want) leaves.pop()
            while (leaves.length < want) {
                const l = {} as Leaf
                seed(l, false)
                leaves.push(l)
            }
        }

        function resize() {
            const b = host.getBoundingClientRect()
            const w = Math.max(1, b.width)
            const h = Math.max(1, b.height)
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            if (w === cssW && h === cssH) return
            cssW = w
            cssH = h
            canvas.width = Math.round(w * dpr)
            canvas.height = Math.round(h * dpr)
            if (!leaves.length) syncCount()
        }

        function onPointerMove(e: PointerEvent) {
            const b = canvas.getBoundingClientRect()
            pointerX = e.clientX - b.left
            pointerY = e.clientY - b.top
        }
        function onLeave() {
            pointerX = -1e6
            pointerY = -1e6
        }

        let listening = false
        function syncPointer() {
            const want = (live.current.repelIntensity ?? LEAF_FALL_DEFAULTS.repelIntensity) > 0.001 && !reduced
            if (want === listening) return
            listening = want
            if (want) {
                window.addEventListener("pointermove", onPointerMove)
                host.addEventListener("pointerleave", onLeave)
            } else {
                window.removeEventListener("pointermove", onPointerMove)
                host.removeEventListener("pointerleave", onLeave)
                onLeave()
            }
        }

        let clock = 0

        function step(dt: number) {
            const p = live.current
            const fall = clamp(p.fallSpeed ?? LEAF_FALL_DEFAULTS.fallSpeed, 0, 3)
            const wind = clamp(p.wind ?? LEAF_FALL_DEFAULTS.wind, -2, 2)
            const sway = clamp(p.sway ?? LEAF_FALL_DEFAULTS.sway, 0, 2)
            const tumble = clamp(p.tumble ?? LEAF_FALL_DEFAULTS.tumble, 0, 2)
            const push = clamp(p.repelIntensity ?? LEAF_FALL_DEFAULTS.repelIntensity, 0, 5)
            const R = 130

            for (let i = 0; i < leaves.length; i++) {
                const l = leaves[i]
                // one depth number drives rate as well as size, so near leaves
                // outrun far ones and the field reads as space
                const dsp = lerp(0.6, 1.3, l.depth)

                l.y += fall * 46 * dsp * dt + l.vy * dt
                l.x +=
                    wind * 34 * dsp * dt +
                    Math.sin(clock * l.swayFreq + l.swayPh) * l.swayAmp * sway * dt +
                    l.vx * dt

                l.spin += l.spinRate * tumble * dt
                l.flip += l.flipRate * tumble * dt

                if (push > 0 && pointerX > -1e5) {
                    const dx = l.x - pointerX
                    const dy = l.y - pointerY
                    const d2 = dx * dx + dy * dy
                    if (d2 < R * R && d2 > 1) {
                        const d = Math.sqrt(d2)
                        const f = (1 - d / R) * push * 620
                        l.vx += (dx / d) * f * dt
                        l.vy += (dy / d) * f * dt
                    }
                }
                // the shove is a nudge, not a wind: bleed it off fast
                const damp = Math.exp(-2.6 * dt)
                l.vx *= damp
                l.vy *= damp

                // recycle off the bottom, wrap on the sides
                const m = l.scale
                if (l.y - m > cssH) seed(l, true)
                if (l.x < -m) l.x += cssW + m * 2
                else if (l.x > cssW + m) l.x -= cssW + m * 2
            }
        }

        function draw() {
            const p = live.current
            const fade = clamp(p.depthFade ?? LEAF_FALL_DEFAULTS.depthFade, 0, 1)

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

            for (let i = 0; i < leaves.length; i++) {
                const l = leaves[i]
                const sprite = sprites[l.sprite]
                if (!sprite) continue

                // the turn-over. A negative scale mirrors the sprite, which is
                // exactly what a leaf showing its back should do. Clamped off
                // zero so an edge-on leaf is a hairline, not a divide by zero.
                let sx = Math.cos(l.flip)
                const mag = Math.abs(sx)
                sx = mag < 0.06 ? (sx < 0 ? -0.06 : 0.06) : sx

                // opaque always — depth reads as a colour tint below, never as
                // transparency, so a crossing leaf can't show what's behind it
                ctx.translate(l.x, l.y)
                ctx.rotate(l.spin)
                ctx.scale(sx, 1)
                ctx.drawImage(sprite, -l.scale / 2, -l.scale / 2, l.scale, l.scale)
                // source-atop paints only onto pixels the sprite just covered,
                // so far leaves darken without any pixel losing its opacity
                const dim = fade * (1 - l.depth) * 0.6
                if (dim > 0.004) {
                    ctx.globalCompositeOperation = "source-atop"
                    ctx.fillStyle = `rgba(0,0,0,${dim})`
                    ctx.fillRect(-l.scale / 2, -l.scale / 2, l.scale, l.scale)
                    ctx.globalCompositeOperation = "source-over"
                }
                // resetting beats save/restore per leaf at this count
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            }
        }

        /* ---- scheduling ---- */
        let raf = 0
        let running = false
        let visible = true
        let prev = 0

        function frame(now: number) {
            raf = requestAnimationFrame(frame)
            const dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0
            prev = now
            clock += dt

            if (rebuildSprites.current) {
                rebuildSprites.current = false
                makeSprites()
                // sizes are derived from the same props, so re-seed the scales
                for (const l of leaves) {
                    const b = clamp(live.current.size ?? LEAF_FALL_DEFAULTS.size, 4, 400)
                    const v = clamp(live.current.sizeVariance ?? LEAF_FALL_DEFAULTS.sizeVariance, 0, 1)
                    l.scale = b * (1 + (Math.random() * 2 - 1) * v) * lerp(0.62, 1.15, l.depth)
                }
            }
            syncCount()
            syncPointer()

            if (!reduced) step(dt)
            draw()

            if (reduced) stop()
        }

        function start() {
            if (running || !visible || document.hidden) return
            running = true
            prev = 0
            raf = requestAnimationFrame(frame)
        }
        controlsRef.current = { start }
        function stop() {
            if (raf) cancelAnimationFrame(raf)
            raf = 0
            running = false
        }
        function onVisibility() {
            if (document.hidden) stop()
            else start()
        }
        function onMotion(e: MediaQueryListEvent) {
            reduced = e.matches
            stop()
            start()
        }

        const ro = new ResizeObserver(() => {
            resize()
            if (reduced) {
                stop()
                start()
            }
        })
        ro.observe(host)

        const io = new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? true
            if (visible) start()
            else stop()
        })
        io.observe(host)

        document.addEventListener("visibilitychange", onVisibility)
        motion.addEventListener("change", onMotion)

        resize()
        start()

        return () => {
            controlsRef.current = null
            stop()
            ro.disconnect()
            io.disconnect()
            document.removeEventListener("visibilitychange", onVisibility)
            motion.removeEventListener("change", onMotion)
            window.removeEventListener("pointermove", onPointerMove)
            host.removeEventListener("pointerleave", onLeave)
        }
    }, [])

    return (
        <div
            ref={hostRef}
            className={className}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "block",
                    width: "100%",
                    height: "100%",
                }}
            />
        </div>
    )
}
