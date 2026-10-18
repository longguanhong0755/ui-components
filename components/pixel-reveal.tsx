"use client"

import { useEffect, useRef } from "react"

const FALLBACK_IMG =
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/64c33201-edce-4ee4-1b30-a008a365fa00/w=800"

// One place every control default lives, so the panel and defaultProps agree.
const DEFAULTS = {
    background: "#000000",
    yPosition: 50,
    columns: 48,
    radius: 200,
    fade: 20,
    zoom: 100,
    palette: ["#FFFFFF", "#9A00FF"],
}

// A cell's energy decides what is drawn there: the image at the top of the
// range, the palette across the band below it, then nothing.
const IMAGE_AT = 0.45
const BLOCK_FLOOR = 0.24
// Only this share of the faintest cells light up at all, which is what keeps
// the edge of the trail ragged instead of a clean disc.
const INK_CHANCE = 0.3
// Energy lost per second at each end of the Fade slider. The slider counts up
// to a faster fade, so 1 is a trail that lingers and 50 one that barely lags.
const FADE_MIN = 0.1
const FADE_MAX = 2
const MAX_COLORS = 5
// Cells overlap by a fraction of a pixel — a seam shows between them otherwise.
const OVERLAP = 0.4

// A cell's fixed random value. Deterministic, so the same cell keeps the same
// brightness and the same place in the ragged edge from frame to frame.
function hash(x: number, y: number, s: number) {
    let h =
        Math.imul(x | 0, 374761393) +
        Math.imul(y | 0, 668265263) +
        Math.imul(s | 0, 1274126177)
    h = Math.imul(h ^ (h >>> 13), 1103515245)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
}

function clamp(n: any, min: number, max: number, fallback: number) {
    const v = typeof n === "number" ? n : parseFloat(n)
    if (!Number.isFinite(v)) return fallback
    return Math.min(max, Math.max(min, v))
}

// Accepts either a plain URL string or an object with a src/url field, so
// callers can pass whatever shape their image source comes in as.
function imageURL(value: any): string {
    if (!value) return ""
    if (typeof value === "string") return value
    return value.src || value.url || ""
}

// Panel values are whole numbers on friendly ranges; the render wants the
// fractional ones, so the mapping lives here only.
function settingsFor(p: any) {
    return {
        background: p?.background ?? DEFAULTS.background,
        columns: Math.round(clamp(p?.columns, 8, 48, DEFAULTS.columns)),
        // Straight pixels — the reach is measured in the same units as the
        // frame, so it does not change meaning when the frame is resized.
        radius: clamp(p?.radius, 40, 400, DEFAULTS.radius),
        // 1–50 counts up to a faster fade, spread across the useful range of
        // energy lost per second.
        fade:
            FADE_MIN +
            ((clamp(p?.fade, 1, 50, DEFAULTS.fade) - 1) / 49) *
                (FADE_MAX - FADE_MIN),
        zoom: clamp(p?.zoom, 100, 150, DEFAULTS.zoom) / 100,
        // Which line of the image is held at the middle of the frame as it
        // scales: 0 pins the top edge, 100 the bottom, 50 is dead centre.
        yPosition: clamp(p?.yPosition, 0, 100, DEFAULTS.yPosition) / 100,
        palette: paletteOf(p?.palette),
    }
}

// Up to five colours, brightest first: the one nearest the revealed image, then
// each step further out into the trail. Falls back rather than drawing nothing.
function paletteOf(value: any): string[] {
    const list = (Array.isArray(value) ? value : DEFAULTS.palette)
        .slice(0, MAX_COLORS)
        .filter((c: any) => typeof c === "string" && c)
    return list.length ? list : DEFAULTS.palette
}

interface PixelRevealProps {
    image?: string | { src?: string; url?: string; alt?: string }
    yPosition?: number
    palette?: string[]
    background?: string
    columns?: number
    radius?: number
    fade?: number
    zoom?: number
    style?: React.CSSProperties
}

/**
 * Pixel Reveal — the image is uncovered in pixel blocks under the pointer and
 * fades back out behind it.
 *
 * The background fills the whole frame; Width and Height size only the image
 * inside it, which is centred in whatever space is left.
 */
export default function PixelReveal(props: PixelRevealProps) {
    const rootRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const isStatic = false

    // Live props for the render loop — the loop starts once and reads the
    // newest values through this ref instead of restarting on every edit.
    const propsRef = useRef(props)
    propsRef.current = props

    // Filled by the effect below so the prop effects can drive it without
    // tearing the canvas down and rebuilding it.
    const apiRef = useRef<{
        redrawImage: () => void
        rebuildGrid: () => void
        seedTrail: () => void
    } | null>(null)

    const imageSrc = imageURL(props.image) || FALLBACK_IMG
    const S = settingsFor(props)

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // The seed is fixed: the speckle is meant to be stable, not to
        // reshuffle every time the component mounts.
        const SEED = 1

        let W = 0
        let H = 0
        let dpr = 1
        let cols = 0
        let rows = 0
        let cell = 0
        let energies = new Float32Array(0)
        let ready = false
        let interacted = false

        const pointer = { x: -1e4, y: -1e4, active: false }

        // The image is composited once, at frame resolution, and the blocks are
        // then cut straight out of it — far cheaper than filtering and scaling
        // the source for every cell of every frame.
        const off = document.createElement("canvas")
        // No crossOrigin: this canvas is only ever drawn from, never read back,
        // so a host without CORS headers is fine. Asking for it anyway would
        // fail the load outright on those hosts.
        let img = new Image()

        function redrawImage() {
            if (!ready || !W) return
            const c = off.getContext("2d")
            if (!c) return
            const L = settingsFor(propsRef.current)
            c.setTransform(dpr, 0, 0, dpr, 0, 0)
            c.clearRect(0, 0, W, H)

            // Cover the whole frame, then zoom past it. Y Position picks which
            // line of the image is held at the middle of the frame, so the
            // overflow a cover crop creates can be pushed either way.
            const base =
                Math.max(W / img.naturalWidth, H / img.naturalHeight) * L.zoom
            const dw = img.naturalWidth * base
            const dh = img.naturalHeight * base
            c.drawImage(
                img,
                W / 2 - dw / 2,
                H * L.yPosition - dh * L.yPosition,
                dw,
                dh
            )
        }

        function rebuildGrid() {
            if (!W || !H) return
            cols = settingsFor(propsRef.current).columns
            cell = W / cols
            rows = Math.ceil(H / cell)
            energies = new Float32Array(cols * rows)
        }

        function resize() {
            const r = root.getBoundingClientRect()
            if (!r.width || !r.height) return
            dpr = Math.min(2, window.devicePixelRatio || 1)
            W = r.width
            H = r.height
            canvas.width = Math.round(W * dpr)
            canvas.height = Math.round(H * dpr)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            off.width = canvas.width
            off.height = canvas.height
            rebuildGrid()
            redrawImage()
            if (isStatic || !interacted) seedTrail()
        }

        // Energy a point deposits into every cell, kept if it beats what the
        // cell already holds — a slow pointer then does not scrub its own trail
        // back down.
        function injectAt(px: number, py: number, strength: number) {
            const radius = settingsFor(propsRef.current).radius
            for (let iy = 0; iy < rows; iy++)
                for (let ix = 0; ix < cols; ix++) {
                    const cx = (ix + 0.5) * cell
                    const cy = (iy + 0.5) * cell
                    const dist = Math.hypot(cx - px, cy - py)
                    const r = hash(ix, iy, SEED)
                    const e =
                        clamp(1 - dist / radius, 0, 1, 0) *
                        (0.75 + r * 0.5) *
                        strength
                    const i = iy * cols + ix
                    if (e > energies[i]) energies[i] = e
                }
        }

        function render(dt: number) {
            ctx.clearRect(0, 0, W, H)
            if (!ready) return
            const L = settingsFor(propsRef.current)

            for (let iy = 0; iy < rows; iy++)
                for (let ix = 0; ix < cols; ix++) {
                    const i = iy * cols + ix
                    let e = energies[i]

                    if (pointer.active) {
                        const cx = (ix + 0.5) * cell
                        const cy = (iy + 0.5) * cell
                        const dist = Math.hypot(
                            cx - pointer.x,
                            cy - pointer.y
                        )
                        const r = hash(ix, iy, SEED)
                        e = Math.max(
                            e,
                            clamp(1 - dist / L.radius, 0, 1, 0) *
                                (0.75 + r * 0.5)
                        )
                    }

                    e = Math.max(0, e - dt * L.fade)
                    energies[i] = e
                    if (e <= BLOCK_FLOOR) continue

                    const x = ix * cell
                    const y = iy * cell
                    if (e > IMAGE_AT) {
                        ctx.drawImage(
                            off,
                            x * dpr,
                            y * dpr,
                            cell * dpr,
                            cell * dpr,
                            x,
                            y,
                            cell + OVERLAP,
                            cell + OVERLAP
                        )
                    } else {
                        // The band between the image and nothing is split
                        // evenly across the palette, so a colour is one step
                        // further out into the trail than the one before it.
                        const n = L.palette.length
                        const t = (e - BLOCK_FLOOR) / (IMAGE_AT - BLOCK_FLOOR)
                        const step = Math.min(
                            n - 1,
                            Math.max(0, Math.floor((1 - t) * n))
                        )
                        // The outermost slice is thinned out — that is what
                        // frays the edge instead of ending it on a curve. With
                        // a single colour there is no outermost slice to speak
                        // of, so half the band is kept solid rather than the
                        // whole trail turning to speckle.
                        const thinBelow = n === 1 ? 0.5 : 1 / n
                        if (t < thinBelow && hash(ix, iy, SEED) >= INK_CHANCE)
                            continue
                        ctx.fillStyle = L.palette[step]
                        ctx.fillRect(x, y, cell + OVERLAP, cell + OVERLAP)
                    }
                }
        }

        // A baked diagonal sweep: the still frame and a dissolving intro before
        // the pointer first arrives on a live page.
        function seedTrail() {
            if (!ready || !W || !energies.length) return
            energies.fill(0)
            const steps = 34
            for (let k = 0; k < steps; k++) {
                const u = k / (steps - 1)
                const px = W * (0.18 + 0.64 * u)
                const py =
                    H * (0.55 - 0.25 * u + 0.12 * Math.sin(u * Math.PI * 1.6))
                injectAt(px, py, 0.45 + 0.55 * u)
            }
            if (isStatic) {
                pointer.active = false
                render(0)
            }
        }

        apiRef.current = { redrawImage, rebuildGrid, seedTrail }

        function loadImage(src: string) {
            ready = false
            const next = new Image()
            next.onload = () => {
                img = next
                ready = true
                redrawImage()
                if (isStatic || !interacted) seedTrail()
            }
            next.onerror = () => {
                if (src === FALLBACK_IMG) return
                loadImage(FALLBACK_IMG)
            }
            next.src = src
        }
        loadImage(imageURL(propsRef.current?.image) || FALLBACK_IMG)

        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        const onMove = (e: PointerEvent) => {
            interacted = true
            const r = canvas.getBoundingClientRect()
            pointer.x = e.clientX - r.left
            pointer.y = e.clientY - r.top
            pointer.active = true
        }
        const onLeave = () => {
            pointer.active = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)

        let raf = 0
        let last = performance.now()
        function loop(now: number) {
            // Clamped so a backgrounded tab does not wipe the whole trail on
            // the first frame after it resumes.
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            render(dt)
            raf = window.requestAnimationFrame(loop)
        }
        raf = window.requestAnimationFrame(loop)

        return () => {
            window.cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
            apiRef.current = null
        }
    }, [isStatic, imageSrc])

    // A new grid means a new energy buffer, so the baked trail is laid down
    // again rather than being resampled from the old one.
    useEffect(() => {
        apiRef.current?.rebuildGrid()
        apiRef.current?.seedTrail()
    }, [S.columns])

    // These only change how the image is composited, so the trail is left
    // exactly where it is.
    useEffect(() => {
        apiRef.current?.redrawImage()
    }, [S.zoom, S.yPosition])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                // The background owns the whole frame, and so does the canvas
                // over it — the blocks trail everywhere, and only the image
                // itself is confined to the size set on the panel.
                backgroundColor: S.background,
                ...(props.style || {}),
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

PixelReveal.displayName = "Pixel Reveal"
PixelReveal.defaultProps = { ...DEFAULTS }
