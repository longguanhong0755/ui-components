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
 * StarBurst — a radial explosion of light emanating from a focal point on the
 * canvas. `starCount` evenly-spaced angular spokes radiate outward; along each
 * spoke a column of small bright pulses travels from the center outward,
 * twinkling as they go. A soft
 * "flower" radial bloom sits at the center, layered behind the pulses for a
 * glowing core.
 *
 * Visuals are layered back-to-front each frame:
 *   1. Opaque black background
 *   2. (additive) Center flower bloom — small concentrated radial gradient
 *      at the focal point, fading sharply to transparent
 *   3. (additive) Per-spoke pulse particles — all rendered as thin streaks
 *      oriented along their spoke, with a motion-blur linear gradient
 *      (transparent trailing → bright leading) so overlapping streaks form
 *      continuous-looking rays, with a fixed intensity ramp brightening the
 *      outer end of each spoke.
 *
 * Particle spawn phases are seeded (Mulberry32, seed 0xBADF00D) so the
 * burst pattern is stable across reloads; motion is rAF-driven and remains
 * time-based.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 */
function __BaseImpl_StarBurst(props: Props) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        speed,
        starCount,
        color,
        centerX,
        centerY,
        starSize,
        opacity,
        flowerIntensity,
        twinkleSpeed,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const rafRef = useRef<number | null>(null)
    const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
    // Freeze ONLY on true static renders (export / thumbnail). The Framer
    // canvas and Preview run the live rAF loop so the burst animates while
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

        const cStar = parseColor(color)

        // Controls are authored as whole-number sliders (step 1); divide back to
        // the fractional working ranges the visuals expect. Mapping factors:
        //   ÷20 for the 0.05-step knobs, ÷100 for the 0.01-step (0..1) knobs,
        //   ÷10 for the 0.1-step knobs.
        const safeSpeed = Math.max(0, (speed ?? 10) / 10)
        const safeCenterX = Math.max(0, Math.min(1, (centerX ?? 50) / 100))
        const safeCenterY = Math.max(0, Math.min(1, (centerY ?? 100) / 100))
        const safeStarSize = Math.max(0.01, (starSize ?? 6) / 20)
        const safeOpacity = Math.max(0, Math.min(1, (opacity ?? 100) / 100))
        const safeFlowerIntensity = Math.max(0, (flowerIntensity ?? 10) / 20)
        const safeTwinkleSpeed = Math.max(0, (twinkleSpeed ?? 4) / 20)

        // ---- Seeded PRNG (Mulberry32) --------------------------------------
        // A fixed seed makes the per-spoke phase offsets and per-pulse phase
        // seeds identical across reloads, so the burst pattern reads the same
        // on every refresh. Motion advances with real-time dt.
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
        const rng = makeRng(0xbadf00d)

        // Clamp star count; pulses per spoke is fixed at 15. Total particle
        // count is capped at ~5000 for perf safety. Dense per-spoke counts let
        // overlapping streaks form continuous-looking rays.
        const sCount = Math.max(0, Math.floor(starCount))
        const pulsesPerSpoke = 15
        const MAX_TOTAL = 5000
        let nSpokes = sCount
        let perSpoke = pulsesPerSpoke
        if (nSpokes * perSpoke > MAX_TOTAL) {
            // Prefer keeping spoke count (visual fidelity of the burst shape)
            // and trim pulses per spoke instead.
            perSpoke = Math.max(1, Math.floor(MAX_TOTAL / Math.max(1, nSpokes)))
        }
        const particleCount = nSpokes * perSpoke

        // ---- Spoke angles (with small phase jitter so spokes don't twinkle
        // in lockstep) --------------------------------------------------------
        const spokeAngle = new Float32Array(nSpokes)
        const spokeCos = new Float32Array(nSpokes)
        const spokeSin = new Float32Array(nSpokes)
        for (let i = 0; i < nSpokes; i++) {
            const baseAngle = (i / Math.max(1, nSpokes)) * Math.PI * 2
            const jitter = (rng() - 0.5) * 0.02 // tiny per-spoke angular jitter
            spokeAngle[i] = baseAngle + jitter
            spokeCos[i] = Math.cos(spokeAngle[i])
            spokeSin[i] = Math.sin(spokeAngle[i])
        }

        // ---- Particle SoA buffers ------------------------------------------
        // Each pulse travels along one spoke from t=0 (center) outward. SoA
        // layout keeps the per-frame loop cache-friendly.
        const pSpokeIdx = new Uint16Array(particleCount)
        const pT = new Float32Array(particleCount) // distance along spoke, 0..~1.1
        const pSpeed = new Float32Array(particleCount) // dt-rate of pT growth
        const pSize = new Float32Array(particleCount) // 0.5..1.5 size factor
        const pPhase = new Float32Array(particleCount) // twinkle phase (rad)

        for (let i = 0; i < particleCount; i++) {
            pSpokeIdx[i] = i % nSpokes
            // Spread initial pT across [-0.05, 1.05] so on first frame pulses
            // already populate the full spoke length — overlapping streaks
            // form continuous-looking rays.
            pT[i] = -0.05 + rng() * 1.1
            // Per-pulse speed: 0.5..1.5 (relative units, multiplied by global
            // `speed` × 0.25 base rate), so a pulse takes ~2-6 sec to traverse
            // a spoke at speed=1. Variation prevents uniform-looking streaks.
            pSpeed[i] = (0.5 + rng() * 1.0) * 0.25
            pSize[i] = 0.7 + rng() * 0.8
            pPhase[i] = rng() * Math.PI * 2
        }

        // ---- Streak sprite -------------------------------------------------
        // Bake the trailing→leading gradient ONCE into a tiny offscreen canvas,
        // then drawImage it per particle. This removes the per-particle
        // createLinearGradient + rgba() string allocations (the old hot path
        // built ~15k short-lived strings/frame at high particle counts, whose
        // GC churn was the main source of stutter). Per-particle brightness is
        // applied via globalAlpha; the sprite holds the relative profile.
        const SPRITE_LEN = 64
        const streak = document.createElement("canvas")
        streak.width = SPRITE_LEN
        streak.height = 2
        const sctx = streak.getContext("2d")
        if (sctx) {
            const g = sctx.createLinearGradient(0, 0, SPRITE_LEN, 0)
            g.addColorStop(0, `rgba(${cStar[0]},${cStar[1]},${cStar[2]},0)`)
            g.addColorStop(0.7, `rgba(${cStar[0]},${cStar[1]},${cStar[2]},0.6)`)
            g.addColorStop(1, `rgba(${cStar[0]},${cStar[1]},${cStar[2]},1)`)
            sctx.fillStyle = g
            sctx.fillRect(0, 0, SPRITE_LEN, 2)
        }

        const resize = (entry?: ResizeObserverEntry) => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            // Prefer the observer's contentRect, then layout box (clientWidth),
            // then getBoundingClientRect. On the Framer canvas
            // getBoundingClientRect can read 0 at setup, pinning the burst to
            // the 800×600 fallback in the top-left; contentRect / clientWidth
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
            const h = Math.max(1, Math.floor(rectH) || 600)
            sizeRef.current = { w, h, dpr }
            canvas.width = Math.floor(w * dpr)
            canvas.height = Math.floor(h * dpr)
            canvas.style.width = `${w}px`
            canvas.style.height = `${h}px`
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }

        resize()
        const ro = new ResizeObserver((entries) => resize(entries[0]))
        ro.observe(container)

        // Accumulated time used for the twinkle sin() — independent of dt
        // clamping so twinkles stay smooth even on dropped frames.
        let timeSec = 0

        const drawFrame = (deltaSec: number) => {
            const { w, h, dpr } = sizeRef.current
            const dt = Math.max(0.001, Math.min(0.05, deltaSec))
            timeSec += dt

            if (w < 2 || h < 2) return

            const cx = safeCenterX * w
            const cy = safeCenterY * h
            // Max spoke length — diagonal to ensure spokes reach the far corner
            // even when the focal point is in one corner.
            const R = Math.sqrt(w * w + h * h)

            // (1) Opaque black background
            ctx.globalCompositeOperation = "source-over"
            ctx.fillStyle = "rgb(0,0,0)"
            ctx.fillRect(0, 0, w, h)

            // Switch to additive for all glow layers.
            ctx.globalCompositeOperation = "lighter"

            // (2) Center flower bloom — small concentrated radial gradient.
            // Drawn BEHIND the pulses so the spokes appear to emerge from it.
            // Sized as a fraction of the smaller canvas dimension so it stays
            // a contained glow at the origin rather than a dome over the
            // whole bottom area. Sharp falloff via tight gradient stops.
            const bloomAlpha = safeFlowerIntensity * safeOpacity
            if (bloomAlpha > 0.001) {
                const minDim = Math.min(w, h)
                const bloomR = Math.max(
                    8,
                    minDim *
                        0.18 *
                        (safeFlowerIntensity * 0.5 + 0.5) *
                        (0.6 + safeStarSize * 0.4)
                )
                const a = Math.min(1, bloomAlpha)
                const fGrad = ctx.createRadialGradient(
                    cx,
                    cy,
                    0,
                    cx,
                    cy,
                    bloomR
                )
                fGrad.addColorStop(
                    0,
                    `rgba(${cStar[0]},${cStar[1]},${cStar[2]},${a})`
                )
                fGrad.addColorStop(
                    0.3,
                    `rgba(${cStar[0]},${cStar[1]},${cStar[2]},${a * 0.5})`
                )
                fGrad.addColorStop(
                    0.7,
                    `rgba(${cStar[0]},${cStar[1]},${cStar[2]},${a * 0.15})`
                )
                fGrad.addColorStop(
                    1,
                    `rgba(${cStar[0]},${cStar[1]},${cStar[2]},0)`
                )
                ctx.fillStyle = fGrad
                ctx.fillRect(cx - bloomR, cy - bloomR, bloomR * 2, bloomR * 2)
            }

            // (3) Per-spoke pulse particles — all rendered as thin streaks
            // oriented along their spoke. The streak's trailing end (toward
            // the center) fades to transparent; the leading end (outward) is
            // bright color. Overlapping streaks at high density form
            // continuous-looking rays, with a fixed ramp brightening the outer
            // end of each spoke.
            for (let i = 0; i < particleCount; i++) {
                // Update along-spoke position. When a pulse passes the outer
                // edge it respawns just past center so emissions look continuous.
                pT[i] += pSpeed[i] * safeSpeed * dt
                if (pT[i] > 1.1) {
                    pT[i] = -0.05 - rng() * 0.05
                    pSize[i] = 0.7 + rng() * 0.8
                    pPhase[i] = rng() * Math.PI * 2
                }

                const t = pT[i]
                if (t < 0) continue // not yet emerged this cycle
                if (t >= 1.0) continue

                // Twinkle: 0.7..1.0 (subtle — never drops below 70% brightness
                // so pulses don't disappear at the trough).
                const twinkle =
                    0.7 +
                    0.3 * Math.sin(timeSec * safeTwinkleSpeed * 6 + pPhase[i])

                // Alpha curve along the spoke: quick fade-in [0, 0.06], full
                // brightness held across the body [0.06, 0.85], fast fade-out
                // [0.85, 1.0]. Rays stay vivid almost all the way to the edge.
                let fade: number
                if (t < 0.06) {
                    fade = t / 0.06
                } else if (t < 0.85) {
                    fade = 1
                } else {
                    fade = 1 - (t - 0.85) / 0.15
                }

                const a = Math.min(
                    1,
                    twinkle * fade * (1 + 0.5 * t) * safeOpacity
                )
                if (a < 0.005) continue

                const dist = t * R
                const sIdx = pSpokeIdx[i]
                const cosA = spokeCos[sIdx]
                const sinA = spokeSin[sIdx]

                // Head sits on the spoke at `dist`; the sprite extends back
                // toward the center over `lineLen`. Streak length: base +
                // per-pulse-speed factor, scaled by size & global starSize.
                const px = cx + cosA * dist
                const py = cy + sinA * dist
                const speedFactor = pSpeed[i] / 0.25 // ~0.5..1.5
                const lineLen =
                    (8 + 12 * speedFactor) *
                    (0.7 + 0.6 * pSize[i] * safeStarSize)

                // Draw the pre-baked streak sprite oriented along the spoke via a
                // direct transform — no save/restore, no per-particle gradient.
                ctx.setTransform(
                    dpr * cosA,
                    dpr * sinA,
                    -dpr * sinA,
                    dpr * cosA,
                    dpr * px,
                    dpr * py
                )
                ctx.globalAlpha = a
                ctx.drawImage(streak, -lineLen, -0.5, lineLen, 1)
            }

            // Restore the base transform / alpha for the next frame's bg + bloom.
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1
        }

        if (isStatic) {
            // Warm up so the static frame shows pulses mid-flight rather than
            // a sea of just-spawned points at the center.
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
        speed,
        starCount,
        color,
        centerX,
        centerY,
        starSize,
        opacity,
        flowerIntensity,
        twinkleSpeed,
        isStatic,
    ])

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
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
    speed: number
    starCount: number
    color: string
    centerX: number
    centerY: number
    starSize: number
    opacity: number
    flowerIntensity: number
    twinkleSpeed: number
    style?: React.CSSProperties
}

const COMPONENT_DEFAULTS = {
    speed: 10,
    starCount: 100,
    color: "#FFFFFF",
    centerX: 50,
    centerY: 100,
    starSize: 12,
    opacity: 50,
    flowerIntensity: 10,
    twinkleSpeed: 4,
}

const __presetProps = {
  "color": "#FF8200",
  "speed": 1,
  "centerX": 50,
  "centerY": 100,
  "opacity": 100,
  "starSize": 40,
  "starCount": 300,
  "twinkleSpeed": 37,
  "flowerIntensity": 60
};

export default function StarBurst(props: Record<string, unknown>) {
  return <__BaseImpl_StarBurst {...(__presetProps as Record<string, unknown>)} {...props} />;
}
