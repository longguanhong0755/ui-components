"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

// Never a static render outside Framer.
const useIsStaticRenderer = () => false

/**
 * StarburstGraph — a single hub throwing thin spokes out to a scatter of dots,
 * turning slowly in 3D so the spokes lengthen and shorten as they swing
 * through depth. The pointer REPELS: every dot inside Reach is pushed straight
 * away from it and springs back when the pointer leaves, the spoke staying
 * pinned to the hub so the whole burst parts around the cursor.
 *
 * Canvas 2D, not WebGL: a few hundred lines and dots a frame is nothing, and
 * Canvas 2D draws antialiased hairlines natively. One raw rAF loop (it ticks
 * on the Framer canvas); every live input is read from a ref, so a panel
 * change never tears the loop down. Density rebuilds the dot set inside the
 * loop, never the loop. Colours go through a hidden probe element so a Framer
 * colour token (`var(--…)`) resolves to something the 2D context accepts.
 *
 * Repel is a per-dot spring in SCREEN px, driven from the dot's un-pushed
 * projected position — so the push never feeds back into its own target and a
 * parked pointer holds a steady hollow instead of a jitter.
 *
 * Pointer is read on `window` and mapped into the host's own px with
 * `offsetWidth / rect.width`, so a zoomed Framer canvas still puts the hollow
 * exactly under the cursor.
 */

// ─── Frozen constants (not design controls) ────────────────────────────────

/** Rotation rate at Speed 50, rad/s. */
const BASE_SPIN = 0.12
/** Fixed pitch so the burst is seen slightly from above. */
const PITCH = 0.35
/** Camera distance in scene radii — sets how strong the perspective is. */
const CAMERA = 3.2
/** Shortest spoke as a fraction of Spread — keeps a dense knot at the hub. */
const MIN_REACH = 0.06
/** Spring stiffness of the repel, 1/s². */
const STIFFNESS = 140
/** Push depth at Hover 100, as a fraction of Reach. */
const PUSH = 0.55
const MAX_DPR = 2
const SEED = 7

// ─── Types ─────────────────────────────────────────────────────────────────

interface CursorProps {
    hover?: number
    reach?: number
    damping?: number
}

interface Props {
    background?: string
    dotColor?: string
    lineColors?: string[]
    density?: number
    dotSize?: number
    scale?: number
    spread?: number
    lineWidth?: number
    speed?: number
    cursor?: CursorProps
    style?: React.CSSProperties
}

interface Node {
    x: number
    y: number
    z: number
    idx: number // stable index, so a line's colour never flickers as depth order changes
    r: number // radius factor 0–1
    ox: number // screen offset + velocity (repel spring)
    oy: number
    vx: number
    vy: number
    sx: number // this frame's drawn position
    sy: number
    depth: number
}

const CURSOR_DEFAULTS: Required<CursorProps> = { hover: 100, reach: 160, damping: 40 }

// ─── Helpers ───────────────────────────────────────────────────────────────

function mulberry32(a: number) {
    return () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Seeded, so a given Density always gives the same burst. Growing Density
 *  keeps every existing dot where it was and only adds new ones. */
function buildNodes(count: number, prev: Node[]): Node[] {
    const rand = mulberry32(SEED)
    const out: Node[] = []
    for (let i = 0; i < count; i++) {
        // Uniform direction on the sphere.
        const u = rand() * 2 - 1
        const a = rand() * Math.PI * 2
        const s = Math.sqrt(1 - u * u)
        // Mostly mid-length spokes, a long tail of far ones.
        const len = MIN_REACH + (1 - MIN_REACH) * Math.pow(rand(), 0.75)
        const r = 0.35 + 0.65 * Math.pow(rand(), 2)
        const old = prev[i]
        out.push({
            x: s * Math.cos(a) * len,
            y: u * len,
            z: s * Math.sin(a) * len,
            idx: i,
            r,
            ox: old ? old.ox : 0,
            oy: old ? old.oy : 0,
            vx: old ? old.vx : 0,
            vy: old ? old.vy : 0,
            sx: 0,
            sy: 0,
            depth: 0,
        })
    }
    return out
}

function resolveColor(probe: HTMLElement | null, value: string, fallback: string) {
    if (!probe) return fallback
    probe.style.color = ""
    probe.style.color = value
    return probe.style.color ? getComputedStyle(probe).color : fallback
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function StarburstGraph(props: Props) {
    const {
        background = "#000000",
        dotColor = "#FFFFFF",
        lineColors = ["#FF0000","#FF9900","#FFEE00","#33CC33","#3399FF","#9933FF"],
        density = 200,
        dotSize = 6,
        spread = 31,
        lineWidth = 3,
        speed = 50,
        scale = 112,
        cursor = {"hover":100,"reach":160,"damping":40},
        style,
    } = props
    const c = { ...CURSOR_DEFAULTS, ...cursor }

    const isStatic = useIsStaticRenderer()
    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const probeRef = useRef<HTMLSpanElement>(null)

    const live = useRef({
        density,
        dotSize,
        spread,
        lineWidth,
        speed,
        scale,
        hover: c.hover,
        reach: c.reach,
        damping: c.damping,
        dot: "#fff",
        lines: ["rgba(255,255,255,0.55)"] as string[],
    })
    live.current.density = density
    live.current.dotSize = dotSize
    live.current.spread = spread
    live.current.lineWidth = lineWidth
    live.current.speed = speed
    live.current.scale = scale
    live.current.hover = c.hover
    live.current.reach = c.reach
    live.current.damping = c.damping

    useEffect(() => {
        live.current.dot = resolveColor(probeRef.current, dotColor, "#fff")
        live.current.lines = lineColors.length
            ? lineColors.map((col) => resolveColor(probeRef.current, col, "rgba(255,255,255,0.55)"))
            : ["rgba(255,255,255,0.55)"]
    }, [dotColor, lineColors])

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let w = 0
        let h = 0
        let dpr = 1
        const resize = () => {
            w = host.offsetWidth
            h = host.offsetHeight
            dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            canvas.width = Math.max(1, Math.round(w * dpr))
            canvas.height = Math.max(1, Math.round(h * dpr))
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(host)

        const pointer = { x: 0, y: 0, active: false }
        const move = (e: PointerEvent) => {
            const rect = host.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            // Undo the canvas zoom: rect is scaled, offsetWidth is not.
            const x = (e.clientX - rect.left) * (host.offsetWidth / rect.width)
            const y = (e.clientY - rect.top) * (host.offsetHeight / rect.height)
            pointer.x = x
            pointer.y = y
            pointer.active = x >= 0 && y >= 0 && x <= host.offsetWidth && y <= host.offsetHeight
        }
        const leave = () => {
            pointer.active = false
        }
        window.addEventListener("pointermove", move, { passive: true })
        document.addEventListener("pointerleave", leave)
        window.addEventListener("blur", leave)

        let nodes: Node[] = []
        let builtFor = -1
        let angle = 0
        let last = -1
        let raf = 0

        const frame = (now: number) => {
            const L = live.current
            const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000)
            last = now

            const count = Math.max(1, Math.round(L.density))
            if (count !== builtFor) {
                nodes = buildNodes(count, nodes)
                builtFor = count
            }

            angle = (angle + dt * BASE_SPIN * (L.speed / 50)) % (Math.PI * 2)
            const cy = Math.cos(angle)
            const sy = Math.sin(angle)
            const cp = Math.cos(PITCH)
            const sp = Math.sin(PITCH)

            const cx0 = w / 2
            const cy0 = h / 2
            const R = (Math.min(w, h) * L.spread * (L.scale / 100)) / 100
            const reach = Math.max(1, L.reach)
            const push = reach * PUSH * (L.hover / 100)
            // Damping 1–100 → damping ratio 0.1–1: higher settles faster.
            const zeta = 0.1 + 0.9 * ((Math.max(1, Math.min(100, L.damping)) - 1) / 99)
            const cDamp = 2 * zeta * Math.sqrt(STIFFNESS)

            for (const n of nodes) {
                // Yaw, then pitch.
                const x1 = n.x * cy + n.z * sy
                const z1 = -n.x * sy + n.z * cy
                const y2 = n.y * cp - z1 * sp
                const z2 = n.y * sp + z1 * cp
                const k = CAMERA / (CAMERA - z2)
                const bx = cx0 + x1 * k * R
                const by = cy0 - y2 * k * R
                n.depth = z2

                // Repel target from the un-pushed position.
                let tx = 0
                let ty = 0
                if (pointer.active && push > 0) {
                    const dx = bx - pointer.x
                    const dy = by - pointer.y
                    const d = Math.hypot(dx, dy)
                    if (d < reach) {
                        const f = 1 - d / reach
                        const m = push * f * f
                        const inv = d > 1e-3 ? 1 / d : 0
                        tx = d > 1e-3 ? dx * inv * m : m
                        ty = dy * inv * m
                    }
                }
                if (dt > 0) {
                    const ax = STIFFNESS * (tx - n.ox) - cDamp * n.vx
                    const ay = STIFFNESS * (ty - n.oy) - cDamp * n.vy
                    n.vx += ax * dt
                    n.vy += ay * dt
                    n.ox += n.vx * dt
                    n.oy += n.vy * dt
                }
                n.sx = bx + n.ox
                n.sy = by + n.oy
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, w, h)

            // Far to near, so near dots sit on top.
            const order = nodes.slice().sort((a, b) => a.depth - b.depth)

            ctx.lineWidth = Math.max(1, L.lineWidth)
            const lineColors = L.lines.length ? L.lines : ["rgba(255,255,255,0.55)"]
            for (const n of order) {
                ctx.strokeStyle = lineColors[n.idx % lineColors.length]
                ctx.globalAlpha = 0.45 + 0.55 * Math.min(1, Math.max(0, (n.depth + 1) / 2))
                ctx.beginPath()
                ctx.moveTo(cx0, cy0)
                ctx.lineTo(n.sx, n.sy)
                ctx.stroke()
            }

            ctx.fillStyle = L.dot
            for (const n of order) {
                const k = CAMERA / (CAMERA - n.depth)
                const rad = Math.max(0.5, L.dotSize * n.r * k * 0.5 * (L.scale / 100))
                ctx.globalAlpha = 0.7 + 0.3 * Math.min(1, Math.max(0, (n.depth + 1) / 2))
                ctx.beginPath()
                ctx.arc(n.sx, n.sy, rad, 0, Math.PI * 2)
                ctx.fill()
            }

            // Hub.
            ctx.globalAlpha = 1
            ctx.beginPath()
            ctx.arc(cx0, cy0, Math.max(1, L.dotSize * 0.6 * (L.scale / 100)), 0, Math.PI * 2)
            ctx.fill()

            if (!isStatic) raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("pointermove", move)
            document.removeEventListener("pointerleave", leave)
            window.removeEventListener("blur", leave)
        }
    }, [isStatic])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                ...style,
                background,
                overflow: "hidden",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
            <span ref={probeRef} aria-hidden style={{ display: "none" }} />
        </div>
    )
}

StarburstGraph.displayName = "Starburst Graph"
