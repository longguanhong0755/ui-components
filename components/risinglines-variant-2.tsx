import * as React from "react"
import { useEffect, useRef } from "react"
const RenderTarget = {
    current: () => "preview",
    canvas: "canvas",
    export: "export",
    thumbnail: "thumbnail",
    preview: "preview",
}

/**
 * RisingLines — a flat horizontal blob of light emitting two layers of rising
 * particles: thin pixel-line "trail" sparks and softer circular glowing blobs.
 *
 * Visuals are layered back-to-front each frame:
 *   1. Opaque black background
 *   2. (additive) Horizon blob — a single horizontally-stretched radial
 *      gradient anchored to the horizon line, bright in the center and fading
 *      out toward the left/right edges (only when `showHorizon` is on)
 *   3. (additive) Circular glow blobs rising from the horizon
 *   4. (additive) Pixel-line trail sparks rising from the blob
 *
 * Spawn positions are seeded (Mulberry32, seed 0xC0FFEE) so the layout is
 * stable across reloads; motion is rAF-driven and remains time-based.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 400
 */
function __BaseImpl_RisingLines(props: Props) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        className,
        particles,
        color,
        showHorizon,
        horizonColor,
        riseSpeed: riseSpeedRaw,
        opacity: opacityRaw,
        horizonOpacity: horizonOpacityRaw,
        scale: scaleRaw,
        style,
    } = props

    // Whole-number panel inputs scaled back to the float ranges the render
    // logic works against. Keeps edit-panel controls at integer steps while
    // leaving the animation math in convenient units.
    const riseSpeed = riseSpeedRaw / 100
    const opacity = opacityRaw / 100
    const horizonOpacity = horizonOpacityRaw / 100
    const scale = scaleRaw / 2

    const containerRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const rafRef = useRef<number | null>(null)
    const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
    // Freeze ONLY on true static renders (export / thumbnail). The Framer
    // canvas and Preview run the live rAF loop so the lines animate while
    // editing. Gating on useIsStaticRenderer() (true on canvas) is what
    // previously froze it to a warm-up frame.
    const renderTarget = RenderTarget.current()
    const isStatic =
        renderTarget === RenderTarget.export ||
        renderTarget === RenderTarget.thumbnail

    // Parse hex/rgb to [r,g,b] 0-255 — done once per prop change, never per frame.
    const parseColor = (input: string): [number, number, number] => {
        if (!input) return [255, 255, 255]
        const s = input.trim()
        if (s.startsWith("#")) {
            let hex = s.slice(1)
            if (hex.length === 3) {
                hex = hex
                    .split("")
                    .map((c) => c + c)
                    .join("")
            }
            const num = parseInt(hex, 16)
            return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
        }
        const m = s.match(/rgba?\(([^)]+)\)/i)
        if (m) {
            const parts = m[1].split(",").map((p) => parseFloat(p.trim()))
            return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
        }
        return [255, 255, 255]
    }

    useEffect(() => {
        const container = containerRef.current
        const canvas = canvasRef.current
        if (!container || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const cParticle = parseColor(color)
        const cHorizon = parseColor(horizonColor)

        // World-scale multiplier — `scale` zooms element sizes. `defaultScale`
        // is 3.5 so the user-facing default reads as "1x". At higher values
        // sparks render taller.
        const defaultScale = 3.5
        const worldScale = Math.max(0.1, scale) / defaultScale

        // ---- Seeded PRNG (Mulberry32) --------------------------------------
        // A fixed seed makes the spawn pattern identical across reloads.
        const makeRng = (seed: number) => {
            let s = seed >>> 0
            return () => {
                s = (s + 0x6d2b79f5) >>> 0
                let t = s
                t = Math.imul(t ^ (t >>> 15), t | 1)
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296
            }
        }
        const rng = makeRng(0xc0ffee)

        // ---- Particle SoA buffers ------------------------------------------
        // Each spark "particle" is a tiny vertical pixel-line trail rising
        // from the horizon blob. SoA layout keeps the per-frame loop
        // cache-friendly.
        let particleCount = 0
        let pX = new Float32Array(0)
        let pY = new Float32Array(0)
        let pVY = new Float32Array(0) // upward velocity (pixels/sec)
        let pHeight = new Float32Array(0) // spark height in device-pixels (20–100)
        let pLife = new Float32Array(0) // current life (seconds)
        let pLifeMax = new Float32Array(0) // total lifetime (seconds)

        // Secondary layer: small circular glowing blobs rising alongside the
        // line sparks. Independent SoA buffers; same seeded `rng()`.
        let blobCount = 0
        let bX = new Float32Array(0)
        let bY = new Float32Array(0)
        let bVY = new Float32Array(0) // upward velocity (pixels/sec)
        let bR = new Float32Array(0) // radius in device-pixels (~1.5–5 × worldScale)
        let bLife = new Float32Array(0)
        let bLifeMax = new Float32Array(0)

        // Center-biased x sampling: average of 3 uniforms yields a smooth
        // dome-shaped (Irwin–Hall) distribution centered at w/2 — matches
        // the horizontal falloff of the horizon blob.
        const sampleCenterX = (w: number) => {
            const r = (rng() + rng() + rng()) / 3
            return r * w
        }

        // Sample a spark "trail" height in device-pixels. Most cluster around
        // 30–50 px with a minority (~12%) stretching to 70–100 px so the
        // trails read as long streams of light rather than stubby ticks.
        const sampleSparkHeight = () => {
            let tall: number
            if (rng() < 0.12) {
                tall = 70 + rng() * 30 // tall outlier: 70–100 px
            } else {
                tall = 20 + Math.pow(rng(), 0.7) * 35 // main cluster ~20–55 px
            }
            return Math.max(1, Math.floor(tall * worldScale))
        }

        // Horizon Y position — flush to the bottom edge. The sparks and blobs
        // all rise from this line.
        const getHorizonY = (h: number) => h - 1

        const initParticles = () => {
            const { w, h } = sizeRef.current
            // `particles` is the spark count at the reference 800×400 frame,
            // scaled by the actual area so density stays consistent at any size.
            const area = w * h
            const refArea = 800 * 400
            const target = Math.max(0, Math.floor((particles * area) / refArea))
            particleCount = Math.min(target, 4000)
            pX = new Float32Array(particleCount)
            pY = new Float32Array(particleCount)
            pVY = new Float32Array(particleCount)
            pHeight = new Float32Array(particleCount)
            pLife = new Float32Array(particleCount)
            pLifeMax = new Float32Array(particleCount)

            const horizonY = getHorizonY(h)
            for (let i = 0; i < particleCount; i++) {
                pX[i] = sampleCenterX(w)
                // Distribute initial Y across the area above the horizon
                pY[i] = horizonY - rng() * horizonY * 0.95
                // Velocity is scale-independent — `scale` must not change speed.
                pVY[i] = 10 + rng() * 40
                pHeight[i] = sampleSparkHeight()
                pLifeMax[i] = 2 + rng() * 4
                pLife[i] = rng() * pLifeMax[i]
            }

            // Secondary blob layer — ~30% of spark count, scaled the same way.
            const blobTarget = Math.max(0, Math.floor(target * 0.3))
            blobCount = Math.min(blobTarget, 1200)
            bX = new Float32Array(blobCount)
            bY = new Float32Array(blobCount)
            bVY = new Float32Array(blobCount)
            bR = new Float32Array(blobCount)
            bLife = new Float32Array(blobCount)
            bLifeMax = new Float32Array(blobCount)

            for (let i = 0; i < blobCount; i++) {
                bX[i] = sampleCenterX(w)
                bY[i] = horizonY - rng() * horizonY * 0.95
                // Slightly slower than the line sparks so the layers separate.
                // Scale-independent — `scale` must not change speed.
                bVY[i] = 8 + rng() * 28
                // Power-distributed radius: mostly small with a few larger.
                bR[i] = (1.5 + Math.pow(rng(), 1.8) * 3.5) * worldScale
                bLifeMax[i] = 3 + rng() * 5
                bLife[i] = rng() * bLifeMax[i]
            }
        }

        const resize = (entry?: ResizeObserverEntry) => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            // Prefer the observer's contentRect, then layout box (clientWidth),
            // then getBoundingClientRect. On the Framer canvas
            // getBoundingClientRect can read 0 at setup, pinning the field to
            // the 800×400 fallback in the top-left; contentRect / clientWidth
            // report the real size so it fills the frame.
            const cr = entry?.contentRect
            const rectW =
                cr?.width ||
                container.clientWidth ||
                container.getBoundingClientRect().width
            const rectH =
                cr?.height ||
                container.clientHeight ||
                container.getBoundingClientRect().height
            const w = Math.max(1, Math.floor(rectW) || 800)
            const h = Math.max(1, Math.floor(rectH) || 400)
            sizeRef.current = { w, h, dpr }
            canvas.width = Math.floor(w * dpr)
            canvas.height = Math.floor(h * dpr)
            canvas.style.width = `${w}px`
            canvas.style.height = `${h}px`
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

            initParticles()
        }

        resize()
        const ro = new ResizeObserver((entries) => resize(entries[0]))
        ro.observe(container)

        const drawFrame = (deltaSec: number) => {
            const { w, h } = sizeRef.current
            const dt = Math.max(0.001, Math.min(0.05, deltaSec))

            const horizonY = getHorizonY(h)

            // (1) Opaque black background — no trails for this look.
            ctx.globalCompositeOperation = "source-over"
            ctx.fillStyle = "rgb(0,0,0)"
            ctx.fillRect(0, 0, w, h)

            // Switch to additive for all glow layers.
            ctx.globalCompositeOperation = "lighter"

            // (2) Horizon blob — single horizontally-stretched radial gradient.
            const horizonAlpha = Math.max(0, Math.min(1, horizonOpacity))
            if (showHorizon && horizonAlpha > 0.001) {
                const rx = w * 0.5
                const ry = 40 * worldScale
                ctx.save()
                ctx.translate(w / 2, horizonY)
                ctx.scale(rx / ry, 1)
                const hGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, ry)
                hGrad.addColorStop(
                    0,
                    `rgba(${cHorizon[0]},${cHorizon[1]},${cHorizon[2]},${horizonAlpha})`
                )
                hGrad.addColorStop(
                    0.35,
                    `rgba(${cHorizon[0]},${cHorizon[1]},${cHorizon[2]},${horizonAlpha * 0.65})`
                )
                hGrad.addColorStop(
                    0.7,
                    `rgba(${cHorizon[0]},${cHorizon[1]},${cHorizon[2]},${horizonAlpha * 0.2})`
                )
                hGrad.addColorStop(
                    1,
                    `rgba(${cHorizon[0]},${cHorizon[1]},${cHorizon[2]},0)`
                )
                ctx.fillStyle = hGrad
                ctx.fillRect(-ry - 2, -ry - 2, (ry + 2) * 2, (ry + 2) * 2)
                ctx.restore()
            }

            const riseSpeedMul = Math.max(0, riseSpeed) * 10 // 0–0.6 -> 0–6x
            // Respawn is driven purely by POSITION (a particle reaching the top),
            // never by elapsed time. So every particle always travels the full
            // horizon→top distance regardless of speed or scale. Speed changes
            // only how fast it moves; scale only its size. Alpha fades by travel
            // progress, not by a lifetime clock.
            const denom = Math.max(1, horizonY)

            // (3) Circular glow blobs — update + draw.
            for (let i = 0; i < blobCount; i++) {
                const effVy = bVY[i] * (1.0 + riseSpeedMul)
                bY[i] -= effVy * dt
                // Respawn only once fully off the top — guarantees full travel.
                if (bY[i] < -bR[i] * 2) {
                    bX[i] = sampleCenterX(w)
                    bY[i] = horizonY - rng() * 10
                    bVY[i] = 8 + rng() * 28
                    bR[i] = (1.5 + Math.pow(rng(), 1.8) * 3.5) * worldScale
                }
                // Travel progress 0 (horizon) → 1 (top); fade in then out.
                const t = Math.max(0, Math.min(1, (horizonY - bY[i]) / denom))
                const fade =
                    t < 0.2 ? t / 0.2 : Math.max(0, 1 - (t - 0.2) / 0.8)
                const a = fade * opacity
                if (a < 0.01) continue

                const cx = bX[i]
                const cy = bY[i]
                const r = bR[i]
                // Tight radial halo — the 0.4 mid-stop pulls the falloff in so
                // we don't reintroduce a heavy bloom.
                const bGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
                const aClamped = Math.min(1, a)
                bGrad.addColorStop(
                    0,
                    `rgba(${cParticle[0]},${cParticle[1]},${cParticle[2]},${aClamped})`
                )
                bGrad.addColorStop(
                    0.4,
                    `rgba(${cParticle[0]},${cParticle[1]},${cParticle[2]},${aClamped * 0.45})`
                )
                bGrad.addColorStop(
                    1,
                    `rgba(${cParticle[0]},${cParticle[1]},${cParticle[2]},0)`
                )
                ctx.fillStyle = bGrad
                ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
                // Crisp 1px white core for the larger blobs only.
                if (r > 2.5) {
                    ctx.fillStyle = `rgba(255,255,255,${aClamped})`
                    ctx.fillRect(Math.floor(cx), Math.floor(cy), 1, 1)
                }
            }

            // (4) Pixel-line trail sparks — update + draw.
            for (let i = 0; i < particleCount; i++) {
                const effVy = pVY[i] * (1.0 + riseSpeedMul)
                pY[i] -= effVy * dt
                // Respawn only once fully off the top — guarantees full travel.
                if (pY[i] < -pHeight[i]) {
                    pX[i] = sampleCenterX(w)
                    pY[i] = horizonY - rng() * 10
                    pVY[i] = 10 + rng() * 40
                    pHeight[i] = sampleSparkHeight()
                }
                // Travel progress 0 (horizon) → 1 (top); triangular fade.
                const t = Math.max(0, Math.min(1, (horizonY - pY[i]) / denom))
                const fade =
                    t < 0.2 ? t / 0.2 : Math.max(0, 1 - (t - 0.2) / 0.8)
                const a = fade * opacity
                if (a < 0.01) continue

                const px = Math.floor(pX[i])
                const py = Math.floor(pY[i])
                const lineHeight = pHeight[i]
                // Vertical alpha gradient — top transparent, lower ~30% full
                // alpha (near the blob), fading out over the upper 70%.
                const aClamped = Math.min(1, a)
                const sGrad = ctx.createLinearGradient(
                    0,
                    py,
                    0,
                    py + lineHeight
                )
                sGrad.addColorStop(
                    0,
                    `rgba(${cParticle[0]},${cParticle[1]},${cParticle[2]},0)`
                )
                sGrad.addColorStop(
                    0.7,
                    `rgba(${cParticle[0]},${cParticle[1]},${cParticle[2]},${aClamped})`
                )
                sGrad.addColorStop(
                    1,
                    `rgba(${cParticle[0]},${cParticle[1]},${cParticle[2]},${aClamped})`
                )
                ctx.fillStyle = sGrad
                ctx.fillRect(px, py, 1, lineHeight)
            }
        }

        if (isStatic) {
            // Warm up so the static frame shows particles mid-flight rather
            // than a sea of spawning particles at the horizon.
            for (let i = 0; i < 60; i++) drawFrame(1 / 60)
            return () => {
                ro.disconnect()
            }
        }

        let lastT = performance.now()
        const loop = (t: number) => {
            const deltaSec = (t - lastT) / 1000
            lastT = t
            drawFrame(deltaSec)
            rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)

        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
            ro.disconnect()
        }
    }, [
        particles,
        color,
        showHorizon,
        horizonColor,
        riseSpeed,
        opacity,
        horizonOpacity,
        scale,
        isStatic,
    ])

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 100,
                minHeight: 60,
                overflow: "hidden",
                background: "#000",
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

type Props = {
    className: string
    particles: number // 0–1000 spark count at the 800×400 reference frame
    color: string
    // Whole-number panel inputs (scaled internally before use)
    riseSpeed: number // 0–60  → ÷100 → 0–0.6
    opacity: number // 0–100 → ÷100 → 0–1
    scale: number // 1–20  → ÷2  → 0.5–10
    showHorizon: boolean // toggle horizon blob + its controls
    horizonColor: string
    horizonOpacity: number // 0–100 → ÷100 → 0–1
    style?: React.CSSProperties
}

const COMPONENT_DEFAULTS = {
    className: "",
    particles: 500,
    color: "#DF44F8",
    riseSpeed: 25,
    opacity: 100,
    scale: 7,
    showHorizon: true,
    horizonColor: "#C918F8",
    horizonOpacity: 85,
}

const __presetProps = {
  "color": "#D4F4FF",
  "scale": 1,
  "opacity": 100,
  "direction": "down",
  "particles": 1000,
  "riseSpeed": 1
};

export default function RisingLines(props: Record<string, unknown>) {
  return <__BaseImpl_RisingLines {...(__presetProps as Record<string, unknown>)} {...props} />;
}
