import * as React from "react"
import { useRef, useEffect } from "react"

/**
 * ParticleVoid - A sleek 3D particle tunnel flowing along radial spokes
 * towards a central black circular void, with mathematically consistent gaps.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 */

type Props = {
    x?: number
    y?: number
    radius?: number
    density?: number
    gap?: number
    particleSize?: number
    colors?: string[]
    direction?: "inside" | "outside"
    speed?: number
    style?: React.CSSProperties
}

function __BaseImpl_ParticleVoid(props: Props) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        x = 50,
        y = 50,
        radius = 100,
        density = 30,
        gap = 40,
        particleSize = 10,
        colors = ["#ffffff"],
        direction = "inside",
        speed = 2,
        style,
    } = props

    // Void color is fixed (the void is a solid black hole).
    const color = "#000000"

    // Direction + speed → signed flow rate along Z. "inside" pulls particles
    // toward the void, "outside" pushes them away.
    // Speed 1–20 slider → /2 effective (20 = old 10).
    const speedAmt = Math.max(0, speed) / 2
    const flowSpeed = direction === "inside" ? -speedAmt : speedAmt

    const perspective = 200
    const tunnelSpread = 1

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const animRef = useRef<number>(0)
    const sizeRef = useRef({ w: 600, h: 400 })

    // Mathematical flow offset along Z depth
    const offsetRef = useRef(0)

    const maxDepth = 600

    // ─── Resize Observer ─────────────────────────────────────

    useEffect(() => {
        const container = containerRef.current
        const canvas = canvasRef.current
        if (!container || !canvas) return

        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect
                const dpr = window.devicePixelRatio || 1
                canvas.width = width * dpr
                canvas.height = height * dpr
                canvas.style.width = `${width}px`
                canvas.style.height = `${height}px`
                sizeRef.current = { w: width, h: height }
            }
        })
        ro.observe(container)
        return () => ro.disconnect()
    }, [])

    // ─── Animation Loop ──────────────────────────────────────

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let lastTime = performance.now()

        const wrap = (val: number, max: number) => {
            return ((val % max) + max) % max
        }

        const draw = (now: number) => {
            const dt = Math.min((now - lastTime) / 16.667, 3) // Normalize to ~60fps
            lastTime = now

            const { w, h } = sizeRef.current
            const dpr = window.devicePixelRatio || 1

            // Update depth offset for continuous Z movement
            offsetRef.current = wrap(
                offsetRef.current - flowSpeed * dt,
                maxDepth
            )

            // Transparent canvas — clear each frame so whatever sits behind the
            // component shows through.
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, w, h)

            const cx = w / 2
            const cy = h / 2

            // Void position anchored top-left: 0% = left/top edge, 50 = center, 100 = right/bottom
            const centreCx = (x / 100) * w
            const centreCy = (y / 100) * h

            // Offset from screen center drives the tunnel parallax skew with depth
            const oxPx = centreCx - cx
            const oyPx = centreCy - cy

            const scaleVoid = perspective / (perspective + maxDepth)

            // Base radius in 3D that projects exactly to radius at maxDepth
            const R_centre_3d = radius / scaleVoid

            // ─── 1. Mathematically Generate & Project Particles ────
            const activeDensity = Math.max(density, 1) // Number of spokes
            const activeGap = Math.max(gap, 10) // Depth spacing gap
            // Tile the depth cycle with a whole number of evenly spaced slots so
            // the wrap is seamless. Using ceil + an inclusive loop previously put
            // an extra particle at the seam, overlapping another → a doubled
            // (≈2× brighter) ring that scrolled through depth periodically.
            const particlesPerSpoke = Math.max(
                1,
                Math.round(maxDepth / activeGap)
            )
            const effGap = maxDepth / particlesPerSpoke

            type ProjectedParticle = {
                x: number
                y: number
                size: number
                alpha: number
                z: number
                color: string
            }
            const projected: ProjectedParticle[] = []

            for (let i = 0; i < activeDensity; i++) {
                const baseAngle = (i / activeDensity) * Math.PI * 2

                for (let k = 0; k < particlesPerSpoke; k++) {
                    const z = wrap(offsetRef.current + k * effGap, maxDepth)
                    const depthFactor = z / maxDepth
                    const scale = perspective / (perspective + z)

                    // Projected tunnel center at this particle's depth
                    const projCx = cx + oxPx * depthFactor
                    const projCy = cy + oyPx * depthFactor

                    // 3D radius and scale it down as it goes deeper
                    const R_3d =
                        R_centre_3d + (1 - depthFactor) * tunnelSpread * (w / 2)
                    const R_proj = R_3d * scale

                    const px = projCx + R_proj * Math.cos(baseAngle)
                    const py = projCy + R_proj * Math.sin(baseAngle)

                    // Clip off-screen particles
                    if (px < -20 || px > w + 20 || py < -20 || py > h + 20)
                        continue

                    // Size scales with 3D perspective
                    const size = Math.max(0.4, particleSize * scale)

                    // Depth Fade: opacity decreases as particles approach the void (depthFactor -> 1)
                    const alpha = Math.max(0.05, 1 - depthFactor * 0.9)

                    // Color assignment (cycles down both spokes and depth for visual harmony)
                    const colorIdx = (i + k) % colors.length
                    const color = colors[colorIdx]

                    projected.push({
                        x: px,
                        y: py,
                        size,
                        alpha,
                        z,
                        color,
                    })
                }
            }

            // Sort back-to-front (Z-Buffer simulation) for perfect overlap layered graphics
            projected.sort((a, b) => b.z - a.z)

            // Draw mathematically generated flowing particles
            for (let i = 0; i < projected.length; i++) {
                const pt = projected[i]
                ctx.globalAlpha = pt.alpha
                ctx.fillStyle = pt.color
                ctx.beginPath()
                ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2)
                ctx.fill()
            }
            ctx.globalAlpha = 1.0

            // ─── 2. Draw Centre (Solid Circle) ────────────────
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(centreCx, centreCy, radius, 0, Math.PI * 2)
            ctx.fill()

            animRef.current = requestAnimationFrame(draw)
        }

        animRef.current = requestAnimationFrame(draw)
        return () => cancelAnimationFrame(animRef.current)
    }, [x, y, radius, density, gap, particleSize, colors, flowSpeed])

    return (
        <div
            ref={containerRef}
            style={{
                width: 600,
                height: 400,
                ...style,
                position: "relative",
                overflow: "hidden",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                }}
            />
        </div>
    )
}

// ─── Default Props ───────────────────────────────────────────

// ─── Property Controls ──────────────────────────────────────

const COMPONENT_DEFAULTS = {
    x: 50,
    y: 50,
    radius: 100,
    density: 30,
    gap: 40,
    particleSize: 10,
    colors: ["#ffffff"],
    direction: "inside",
    speed: 2,
}

const __presetProps = {
  "x": 50,
  "y": 50,
  "gap": 40,
  "speed": 2,
  "colors": [
    "#ffffff"
  ],
  "radius": 10,
  "density": 30,
  "direction": "inside",
  "particleSize": 4
};

export default function ParticleVoid(props: Record<string, unknown>) {
  return <__BaseImpl_ParticleVoid {...(__presetProps as Record<string, unknown>)} {...props} />;
}
