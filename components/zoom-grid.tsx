"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/**
 * ZoomGrid — an image cut into a square grid, where every cell magnifies into
 * its OWN centre by how close it is to the pointer. A port of the "Canvas Grid
 * Mouse Effect" pen (creativeocean, emBOove).
 *
 * Canvas 2D, one `drawImage` per cell, raw rAF. Deliberately not a shader: the
 * whole effect IS a per-cell source rect, `drawImage` needs no CORS on the
 * user's image (a GL texture does, and a Framer image dropped from an arbitrary
 * host would silently go black), and ~500 cells a frame is what the reference
 * already runs at 2000x2000.
 *
 * The cell law, unchanged from the reference:
 *
 *     s   = 1 - clamp(0, 1, d / reach)      d = |cell centre - focus|
 *     src = cell / (1 + (Zoom - 1) * s)     centred on the cell centre
 *
 * So a cell far from the focus reads its own square 1:1 and is invisible
 * against the base image; a cell under the focus reads a sliver and blows it up
 * to full cell size. Nothing moves — the grid is static and only what each cell
 * SAMPLES changes, which is what keeps the frame readable as one picture.
 *
 * `reach` is velocity-driven, and that is the reference's real trick: it eases
 * toward a value taken from the pointer LAG (the gap between the raw pointer and
 * the eased focus), so the lens opens while the pointer sweeps and closes to
 * nothing about a second after it stops. A stationary pointer leaves the plain
 * image. Two deviations from the pen, both deliberate:
 *
 *   - The pen's reach = 2 x lag has no ceiling, so a hard flick can blow the
 *     lens out to the whole frame. `Reach` is that ceiling in px, and nothing
 *     else: below it the law is the reference's, unscaled.
 *   - GSAP is out (repo rule), so `quickTo`'s expo tween is a dt-correct
 *     exponential follow, `1 - exp(-k*dt)`. Same shape: fast start, long tail.
 *   - The pen's magnification is `1 / (1 - s)`, which runs to infinity and to a
 *     zero-width source rect at the focus. `Zoom` is that curve with a ceiling:
 *     equal to the pen's at the s a real pointer reaches (s 0.9 is 10x there,
 *     10.9x here at the default Zoom of 12), bounded where the pen's is not.
 *
 * `Size` is the grid CELL, in px, not the component's size — it is the one size
 * dial the component has (rule 11a) because the cell is the item.
 *
 * Canvas parity: a Framer canvas never delivers a pointer, and a pointer-only
 * component would sit there as a flat image. An idle Lissajous focus drifts the
 * lens whenever the pointer is away, opened to a fixed fraction of `Reach`
 * rather than by the lag law (the idle path is slow, and its lag alone would
 * open a lens smaller than one cell). Both the path and that opening scale with
 * `Speed`, so Speed 0 is the plain image with the lens on hover only. The
 * handover to a real pointer, and back, is the same eased blend.
 *
 * Measurement is `clientWidth`/`clientHeight` + ResizeObserver, never
 * `getBoundingClientRect` (rule G) — the latter carries the canvas zoom and the
 * lens would sit off the pointer on a zoomed canvas.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */

/* ---------------------------------------------------------------- types --- */

interface ResponsiveImageLike {
    src?: string
    srcSet?: string
    alt?: string
}

interface Props {
    image?: ResponsiveImageLike | string
    background?: string
    size?: number
    zoom?: number
    reach?: number
    damping?: number
    speed?: number
    fade?: number
    dotSize?: number
    dotColor?: string
    style?: CSSProperties
}

/* ------------------------------------------------------------ constants --- */

/** Quality tier, not a design control — picked, not exposed (rule 10). */
const MAX_DPR = 2

const TAU = Math.PI * 2

/** Focus follow rate at Damping 50, per second. The reference's expo tween. */
const FOLLOW_RATE = 6

/** How fast the open reach chases the lag. The pen's 2s power2 ease. */
const REACH_RATE = 1.6

/** Pointer takeover / release fade, per second. */
const HOVER_RATE = 8

/**
 * Open reach per unit of pointer lag — the reference's `s = 2 * d / cw`, which
 * is reach = 2 x lag once its normalisation is unwound, and is framesize
 * independent. `Reach` is the ceiling on it, not a rescaling of it: a lens that
 * always opened to the full dial would be the whole frame on any sweep, which
 * is the one thing the reference never does.
 */
const LAG_GAIN = 2

/** Cell alpha reaches 1 at this s — blends the lens rim into the base image. */
const RIM_RAMP = 8

/**
 * How far the lens opens while no pointer is here, as a fraction of `Reach`.
 * The lag law alone cannot do this job: the idle path is slow by design, its
 * lag is a few tens of px, and the lens would be smaller than one cell — the
 * component would look dead on the Framer canvas, which never has a pointer.
 * Scaled by Speed, so Speed 0 is a clean image with the effect on hover only.
 */
const IDLE_OPEN = 0.45

/** Idle focus path, in frame widths/heights and rad/s at Speed 50. */
const DRIFT_AX = 0.32
const DRIFT_AY = 0.28
const DRIFT_WX = 0.6
const DRIFT_WY = 0.95

const D = {
    image: {"alt":"","src":"https://images.unsplash.com/photo-1695805311440-628c4db1c1d5?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NTh8fG5hdHVyZSUyMGltYWdlfGVufDB8MHwwfHx8Mg%3D%3D"} as ResponsiveImageLike,
    background: "#000000",
    size: 72,
    zoom: 3,
    reach: 600,
    damping: 94,
    speed: 50,
    fade: 0,
    dotSize: 15,
    dotColor: "#ffffff",
}

/* ----------------------------------------------------------------- util --- */

/** Framer hands a ResponsiveImage as {src, srcSet, alt} or a bare string. */
function srcOf(v: unknown): string {
    if (!v) return ""
    if (typeof v === "string") return v
    return (v as ResponsiveImageLike).src || ""
}

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

/**
 * Framer's Color control can hand back `var(--token, rgb(...))`, which CSS
 * resolves and `ctx.fillStyle` does not — an unparseable value is dropped
 * silently and the dots keep whatever colour was set last. Take the fallback.
 */
function cssColor(v: string): string {
    if (!v.startsWith("var(")) return v
    const comma = v.indexOf(",")
    if (comma < 0) return "#ffffff"
    return v.slice(comma + 1, v.lastIndexOf(")")).trim() || "#ffffff"
}

interface Cell {
    x: number
    y: number
    s: number
}

/* ------------------------------------------------------------ component --- */

export default function ZoomGrid(props: Props) {
    const src = srcOf(props.image ?? D.image)
    const background = props.background ?? D.background
    const style = props.style

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imgRef = useRef<HTMLImageElement | null>(null)

    /** Live props read inside the loop — never effect deps (rule 6). */
    const live = useRef({
        size: D.size,
        zoom: D.zoom,
        reach: D.reach,
        damping: D.damping,
        speed: D.speed,
        fade: D.fade,
        dotSize: D.dotSize,
        dotColor: D.dotColor,
    })
    live.current.size = Math.max(4, props.size ?? D.size)
    live.current.zoom = Math.max(1, props.zoom ?? D.zoom)
    live.current.reach = Math.max(0, props.reach ?? D.reach)
    live.current.damping = clamp(props.damping ?? D.damping, 1, 100)
    live.current.speed = Math.max(0, props.speed ?? D.speed)
    live.current.fade = clamp(props.fade ?? D.fade, 0, 100)
    live.current.dotSize = Math.max(0, props.dotSize ?? D.dotSize)
    live.current.dotColor = props.dotColor ?? D.dotColor

    /* Image load. Separate from the loop so a new src never rebuilds context. */
    useEffect(() => {
        if (!src) {
            imgRef.current = null
            return
        }
        const img = new Image()
        // No crossOrigin: drawImage needs none, and asking for it would break
        // every host that does not answer with CORS headers.
        img.decoding = "async"
        img.src = src
        img.onload = () => {
            imgRef.current = img
        }
        return () => {
            img.onload = null
        }
    }, [src])

    /* The loop. Built once. */
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let cw = 0
        let ch = 0
        let dpr = 1
        let cellPx = 0
        let cells: Cell[] = []

        const st = {
            fx: 0,
            fy: 0,
            reach: -1, // < 0 = uninitialised: opens at full Reach on mount
            hover: 0,
            hoverTarget: 0,
            px: 0,
            py: 0,
            t: 0,
        }

        function rebuild() {
            const w = canvas.clientWidth || 1
            const h = canvas.clientHeight || 1
            const nd = Math.min(MAX_DPR, window.devicePixelRatio || 1)
            const nw = Math.max(1, Math.round(w * nd))
            const nh = Math.max(1, Math.round(h * nd))
            const nc = Math.max(2, Math.round(live.current.size * nd))
            if (nw === cw && nh === ch && nc === cellPx) return
            if (nw !== cw || nh !== ch) {
                canvas.width = nw
                canvas.height = nh
                if (cw === 0) {
                    st.fx = nw / 2
                    st.fy = nh / 2
                    st.px = nw / 2
                    st.py = nh / 2
                }
            }
            cw = nw
            ch = nh
            dpr = nd
            cellPx = nc
            cells = []
            for (let x = 0; x <= cw; x += cellPx) {
                for (let y = 0; y <= ch; y += cellPx) cells.push({ x, y, s: 0 })
            }
        }

        const ro = new ResizeObserver(rebuild)
        ro.observe(canvas)
        rebuild()

        function onMove(e: PointerEvent) {
            // offsetX/Y is in the canvas's own untransformed space, so it does
            // not carry the Framer canvas zoom the way clientX would.
            const w = canvas.clientWidth || 1
            const h = canvas.clientHeight || 1
            st.px = (e.offsetX / w) * cw
            st.py = (e.offsetY / h) * ch
            st.hoverTarget = 1
        }
        function onLeave() {
            st.hoverTarget = 0
        }
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointercancel", onLeave)

        let raf = 0
        let last = performance.now()

        function frame(now: number) {
            raf = requestAnimationFrame(frame)
            const dt = clamp((now - last) / 1000, 0, 0.05)
            last = now
            rebuild()

            const p = live.current

            /* focus: idle drift, handed over to the pointer while it is here */
            st.t += dt * (p.speed / 50)
            const driftX = cw * (0.5 + DRIFT_AX * Math.sin(st.t * DRIFT_WX))
            const driftY = ch * (0.5 + DRIFT_AY * Math.sin(st.t * DRIFT_WY + 1.3))
            st.hover += (st.hoverTarget - st.hover) * (1 - Math.exp(-HOVER_RATE * dt))
            const tx = driftX + (st.px - driftX) * st.hover
            const ty = driftY + (st.py - driftY) * st.hover

            const k = FOLLOW_RATE * (p.damping / 50)
            const a = 1 - Math.exp(-k * dt)
            st.fx += (tx - st.fx) * a
            st.fy += (ty - st.fy) * a

            /* reach: opens with the lag, shuts when the focus catches up */
            const lag = Math.hypot(tx - st.fx, ty - st.fy)
            const full = p.reach * dpr
            const idle = full * IDLE_OPEN * Math.min(1, p.speed / 50)
            const rTarget = idle + (Math.min(full, LAG_GAIN * lag) - idle) * st.hover
            if (st.reach < 0) st.reach = full
            st.reach += (rTarget - st.reach) * (1 - Math.exp(-REACH_RATE * dt))

            /* draw */
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.clearRect(0, 0, cw, ch)
            const img = imgRef.current
            if (!img || !img.naturalWidth || !img.naturalHeight) return

            const iw = img.naturalWidth
            const ih = img.naturalHeight
            const scale = Math.max(cw / iw, ch / ih) // cover
            const vw = cw / scale
            const vh = ch / scale
            const ox = (iw - vw) / 2
            const oy = (ih - vh) / 2

            ctx.globalAlpha = 1
            ctx.drawImage(img, ox, oy, vw, vh, 0, 0, cw, ch)

            const R = st.reach
            const fadeK = p.fade / 100
            const zoomK = p.zoom - 1
            const half = cellPx / 2
            for (let i = 0; i < cells.length; i++) {
                const c = cells[i]
                if (R < 1) {
                    c.s = 0
                    continue
                }
                const d = Math.hypot(c.x + half - st.fx, c.y + half - st.fy)
                const s = 1 - Math.min(1, d / R)
                c.s = s
                if (s < 0.001) continue
                // source square, centred on the cell centre, shrunk by the
                // magnification — this is the whole effect
                const ss = cellPx / (1 + zoomK * s) / scale
                const sx = clamp(ox + (c.x + half) / scale - ss / 2, 0, Math.max(0, iw - ss))
                const sy = clamp(oy + (c.y + half) / scale - ss / 2, 0, Math.max(0, ih - ss))
                // RIM_RAMP: a cell at s ~ 0 is drawn at ~1:1 but resampled on
                // its own sub-rect, which differs from the base draw by up to
                // ~6% of a channel where the cover scale is fractional. Fading
                // the outermost cells in removes that tile edge at the lens rim.
                ctx.globalAlpha = (1 - fadeK * (1 - s)) * Math.min(1, s * RIM_RAMP)
                ctx.drawImage(img, sx, sy, ss, ss, c.x, c.y, cellPx, cellPx)
            }

            if (p.dotSize > 0) {
                const dr = (cellPx * p.dotSize) / 100
                ctx.globalAlpha = 1
                ctx.fillStyle = cssColor(p.dotColor)
                ctx.beginPath()
                for (let i = 0; i < cells.length; i++) {
                    const c = cells[i]
                    if (c.s < 0.001) continue
                    const r = dr * c.s
                    // moveTo before every arc, or the subpaths chain together
                    ctx.moveTo(c.x + r, c.y)
                    ctx.arc(c.x, c.y, r, 0, TAU)
                }
                ctx.fill()
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointercancel", onLeave)
        }
    }, [])

    return (
        <div
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                minWidth: 1200,
                minHeight: 800,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}
