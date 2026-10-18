"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

interface TrailNode {
    x: number
    y: number
    weight: number
}

// Shipped image. Unsplash, CORS-enabled, sized to the widest common canvas so the
// stretch to the host box never upsamples. Clearing the Image control in the panel
// sends `undefined` and the procedural watercolor below takes over again.
const DEFAULT_IMAGE =
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80"

// Cut controls, frozen at their shipped defaults — panel rows gone, render unchanged.
const MASK_OPACITY = 1 // was `Default Fill` (mask opacity), 100%
const BASE_RGB: [number, number, number] = [45, 106, 79] // was `Base Color`
const ACCENT_RGB: [number, number, number] = [30, 96, 145] // was `Accent Color`
const HIGHLIGHT_RGB: [number, number, number] = [116, 198, 157] // was `Highlight`

// Reference values at Hover Intensity = 50, the rate the component shipped at.
// One dial scales all three, so the reveal grows as a whole instead of as three knobs.
const REF_REVEAL_RADIUS = 60 // was `Snake Thickness`, px
const REF_TRAIL_NODES = 25 // was `Snake Length`
const REF_FADE_SPEED = 0.12 // was `Fade Speed`, 12% per frame

// The carve has to win against the heal, or the snake never reaches full transparency
// and the layer reads as permanently filled. Carving is fast, healing is the dial.
const CARVE_SPEED = 0.6

interface PixelMosaicProps {
    width?: number
    height?: number
    style?: React.CSSProperties
    layerColor?: string
    imageSrc?: string
    pixelSize?: number
    fillIntensity?: number
    hoverFillIntensity?: number
    hoverPersist?: boolean
}

// Distance squared from point (px,py) to line segment (ax,ay)-(bx,by)
function distToSegmentSq(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number
) {
    const dx = bx - ax
    const dy = by - ay
    const l2 = dx * dx + dy * dy
    if (l2 === 0) return (px - ax) * (px - ax) + (py - ay) * (py - ay)
    let t = ((px - ax) * dx + (py - ay) * dy) / l2
    t = Math.max(0, Math.min(1, t))
    const projX = ax + t * dx
    const projY = ay + t * dy
    return (px - projX) * (px - projX) + (py - projY) * (py - projY)
}

// Robust color parser handling hex (#fff, #ffffff, #ffffffff), rgb(), and rgba() strings
function parseColorRGB(
    colorStr?: string,
    defaultRGB: [number, number, number] = [255, 255, 255]
): [number, number, number] {
    if (!colorStr) return defaultRGB
    const str = String(colorStr).trim()

    // Handle rgb() / rgba() strings from Framer color picker
    if (str.startsWith("rgb")) {
        const matches = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/)
        if (matches) {
            return [
                Math.min(255, Math.max(0, Math.round(parseFloat(matches[1])))),
                Math.min(255, Math.max(0, Math.round(parseFloat(matches[2])))),
                Math.min(255, Math.max(0, Math.round(parseFloat(matches[3])))),
            ]
        }
    }

    // Handle Hex strings
    let hex = str.replace("#", "")
    if (hex.length === 3 || hex.length === 4) {
        hex = hex
            .split("")
            .map((c) => c + c)
            .join("")
    }
    if (hex.length >= 6) {
        const num = parseInt(hex.substring(0, 6), 16)
        if (!isNaN(num)) {
            return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
        }
    }

    return defaultRGB
}

function __BaseImpl_PixelMosaic(props: PixelMosaicProps) {
    const {
        width = 1000,
        height = 600,
        style,
        layerColor = "#FFFFFF80",
        imageSrc = "https://images.unsplash.com/photo-1446329813274-7c9036bd9a1f?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        pixelSize = 24,
        fillIntensity = 50,
        hoverFillIntensity = 100,
        hoverPersist = false,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Store live props in refs (CLAUDE.md Rule 6) — the loop is built once.
    const propsRef = useRef({
        pixelSize,
        fillIntensity,
        hoverFillIntensity,
        hoverPersist,
        imageSrc,
        layerColor,
    })

    useEffect(() => {
        propsRef.current = {
            pixelSize,
            fillIntensity,
            hoverFillIntensity,
            hoverPersist,
            imageSrc,
            layerColor,
        }
    }, [
        pixelSize,
        fillIntensity,
        hoverFillIntensity,
        hoverPersist,
        imageSrc,
        layerColor,
    ])

    const trailRef = useRef<TrailNode[]>([])
    const lastPosRef = useRef({ x: -1000, y: -1000 })

    // Single Canvas Animation Lifecycle
    useEffect(() => {
        const canvas = canvasRef.current
        const host = containerRef.current
        if (!canvas || !host) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let animationFrameId: number
        let cols = 0
        let rows = 0
        let gridPixelSize = 0
        let opacityGrid: number[][] = []
        let seedGrid: number[][] = []
        let carvedGrid: number[][] = [] // Keep mode: tiles the pointer has already opened
        let wasPersistent = false

        // Image loader
        const img = new Image()
        img.crossOrigin = "anonymous"
        let isImageLoaded = false
        let loadedSrc = ""

        const checkImageLoad = (src?: string) => {
            if (!src) {
                isImageLoaded = false
                loadedSrc = ""
                return
            }
            if (src === loadedSrc) return
            loadedSrc = src
            img.onload = () => {
                isImageLoaded = true
            }
            img.onerror = () => {
                isImageLoaded = false
            }
            img.src = src
        }

        // Trail node count, derived from the single hover dial (50 = shipped 25 nodes).
        const trailNodeCount = () =>
            Math.max(
                2,
                Math.round((REF_TRAIL_NODES * propsRef.current.hoverFillIntensity) / 50)
            )

        // Rebuilds the tile grid. Runs on resize AND whenever Pixel Size changes — the
        // grid dimensions are derived from it, so without this the panel dial only
        // resized the tiles and left the mosaic covering the wrong area.
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const cssW = canvas.clientWidth || host.clientWidth || 1000
            const cssH = canvas.clientHeight || host.clientHeight || 600

            if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
                canvas.width = cssW * dpr
                canvas.height = cssH * dpr
                // setTransform, not scale — scale compounds on every resize.
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            }

            const pSize = Math.max(4, Math.floor(propsRef.current.pixelSize))
            const newCols = Math.ceil(cssW / pSize) + 1
            const newRows = Math.ceil(cssH / pSize) + 1

            if (newCols !== cols || newRows !== rows || pSize !== gridPixelSize) {
                cols = newCols
                rows = newRows
                gridPixelSize = pSize
                opacityGrid = Array.from({ length: rows }, () =>
                    Array(cols).fill(MASK_OPACITY)
                )
                carvedGrid = Array.from({ length: rows }, () => Array(cols).fill(0))
                seedGrid = Array.from({ length: rows }, (_, r) =>
                    Array.from(
                        { length: cols },
                        (_, c) =>
                            Math.abs(Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1
                    )
                )
            }
        }

        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(host)

        // Track snake trail joints on pointer movement.
        // offsetX/offsetY, not getBoundingClientRect — the rect carries the canvas zoom.
        const handlePointerMove = (e: PointerEvent) => {
            const x = e.offsetX
            const y = e.offsetY

            const last = lastPosRef.current
            const distSq = (x - last.x) * (x - last.x) + (y - last.y) * (y - last.y)

            if (distSq > 36) {
                lastPosRef.current = { x, y }
                const maxNodes = trailNodeCount()

                trailRef.current.unshift({ x, y, weight: 1 })

                if (trailRef.current.length > maxNodes) {
                    trailRef.current.length = maxNodes
                }
            } else if (trailRef.current.length > 0) {
                trailRef.current[0].x = x
                trailRef.current[0].y = y
            }
        }

        const handlePointerLeave = () => {
            lastPosRef.current = { x: -1000, y: -1000 }
        }

        host.addEventListener("pointermove", handlePointerMove)
        host.addEventListener("pointerleave", handlePointerLeave)

        // Procedural Watercolor Texture — frozen palette, shown until an Image is set.
        const renderWatercolorBackground = (w: number, h: number, t: number) => {
            const grad = ctx.createLinearGradient(0, 0, w, h)
            grad.addColorStop(0, `rgb(${BASE_RGB.join(",")})`)
            grad.addColorStop(0.5, `rgb(${ACCENT_RGB.join(",")})`)
            grad.addColorStop(1, `rgb(${HIGHLIGHT_RGB.join(",")})`)
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, w, h)

            // Dynamic fluid color blobs
            const blobCount = 4
            for (let i = 0; i < blobCount; i++) {
                const bx = (Math.sin(t * 0.3 + i * 1.5) * 0.3 + 0.5) * w
                const by = (Math.cos(t * 0.2 + i * 2.0) * 0.3 + 0.5) * h
                const rad = Math.min(w, h) * (0.3 + 0.1 * Math.sin(t * 0.5 + i))

                const radial = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
                const col = i % 2 === 0 ? HIGHLIGHT_RGB : ACCENT_RGB
                radial.addColorStop(0, `rgba(${col.join(",")}, 0.7)`)
                radial.addColorStop(1, `rgba(${col.join(",")}, 0)`)
                ctx.fillStyle = radial
                ctx.beginPath()
                ctx.arc(bx, by, rad, 0, Math.PI * 2)
                ctx.fill()
            }
        }

        const startTime = performance.now()

        // Main Draw Loop
        const draw = (now: number) => {
            animationFrameId = requestAnimationFrame(draw)

            const currentProps = propsRef.current
            checkImageLoad(currentProps.imageSrc)

            const pSize = Math.max(4, Math.floor(currentProps.pixelSize))
            if (pSize !== gridPixelSize) resize()

            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const cssW = canvas.width / dpr
            const cssH = canvas.height / dpr
            const t = (now - startTime) * 0.001

            ctx.clearRect(0, 0, cssW, cssH)

            // 1. Base texture (image or procedural watercolor)
            if (isImageLoaded && img.complete && img.naturalWidth !== 0) {
                ctx.drawImage(img, 0, 0, cssW, cssH)
            } else {
                renderWatercolorBackground(cssW, cssH, t)
            }

            // 2. Decay snake trail node weights over time
            const trail = trailRef.current
            const maxNodes = trailNodeCount()

            for (let i = 0; i < trail.length; i++) {
                const tailRatio = 1 - i / maxNodes
                trail[i].weight *= 0.96
                trail[i].weight = Math.max(0, Math.min(tailRatio, trail[i].weight))
            }

            while (trail.length > 0 && trail[trail.length - 1].weight < 0.01) {
                trail.pop()
            }

            // 3. Update and draw the pixel layer.
            //    One hover dial, three derived terms — 50 keeps the shipped reveal.
            //    A stronger reveal is WIDER, LONGER and lingers longer, so the heal
            //    rate is the inverse of the dial.
            const hoverK = currentProps.hoverFillIntensity / 50
            const effectiveRadius = REF_REVEAL_RADIUS * hoverK
            const healSpeed =
                hoverK <= 0 ? 1 : Math.max(0.005, Math.min(1, REF_FADE_SPEED / hoverK))

            // Fill Intensity is the share of tiles painted, across the FULL range:
            // 100 covers everything, 0 leaves the texture bare.
            const fillCutoff = 1 - currentProps.fillIntensity / 100
            const isPersistent = currentProps.hoverPersist
            if (isPersistent !== wasPersistent) {
                // Leaving Keep must not leave old carves latched for the next time.
                if (!isPersistent) {
                    for (let r = 0; r < rows; r++) carvedGrid[r].fill(0)
                }
                wasPersistent = isPersistent
            }
            const [mR, mG, mB] = parseColorRGB(currentProps.layerColor, [255, 255, 255])

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cellX = c * pSize + pSize / 2
                    const cellY = r * pSize + pSize / 2

                    // Calculate proximity to snake trail segments
                    let isInsideSnake = false
                    if (trail.length > 0 && effectiveRadius > 0) {
                        for (let i = 0; i < trail.length - 1; i++) {
                            const nodeA = trail[i]
                            const nodeB = trail[i + 1]
                            const segWeight = (nodeA.weight + nodeB.weight) * 0.5

                            if (segWeight < 0.05) continue

                            const nodeRad = effectiveRadius * segWeight
                            const dSq = distToSegmentSq(
                                cellX,
                                cellY,
                                nodeA.x,
                                nodeA.y,
                                nodeB.x,
                                nodeB.y
                            )

                            if (dSq < nodeRad * nodeRad) {
                                isInsideSnake = true
                                break
                            }
                        }

                        if (!isInsideSnake) {
                            const head = trail[0]
                            const headRad = effectiveRadius * head.weight
                            const headDSq =
                                (cellX - head.x) * (cellX - head.x) +
                                (cellY - head.y) * (cellY - head.y)
                            if (headDSq < headRad * headRad) {
                                isInsideSnake = true
                            }
                        }
                    }

                    if (isInsideSnake) carvedGrid[r][c] = 1

                    // Resting paint for this tile, from the static Fill Intensity pattern.
                    const restOpacity =
                        seedGrid[r][c] < fillCutoff ? 0 : MASK_OPACITY
                    // Keep holds an opened tile open; Fade lets it heal back to rest.
                    const revealed =
                        isInsideSnake || (isPersistent && carvedGrid[r][c] === 1)
                    const target = revealed ? 0 : restOpacity

                    const current = opacityGrid[r][c]
                    const rate = target < current ? CARVE_SPEED : healSpeed
                    const next = current + (target - current) * rate
                    opacityGrid[r][c] = next

                    // Render pixel tile
                    if (next > 0.01) {
                        ctx.fillStyle = `rgba(${mR}, ${mG}, ${mB}, ${next})`
                        ctx.fillRect(c * pSize, r * pSize, pSize, pSize)
                    }
                }
            }
        }

        animationFrameId = requestAnimationFrame(draw)

        return () => {
            cancelAnimationFrame(animationFrameId)
            ro.disconnect()
            host.removeEventListener("pointermove", handlePointerMove)
            host.removeEventListener("pointerleave", handlePointerLeave)
        }
    }, [])

    return (
        <div
            ref={containerRef}
            style={{
                minWidth: 300,
                minHeight: 200,
                width: width ?? "100%",
                height: height ?? "100%",
                position: "relative",
                overflow: "hidden",
                boxSizing: "border-box",
                userSelect: "none",
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
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}

const __presetProps = {
  "layerColor": "#FFFFFF80",
  "imageSrc": "https://images.unsplash.com/photo-1788987259172-8d68fe102587?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHw2M3x8fGVufDB8fHx8fA%3D%3D",
  "pixelSize": 24,
  "fillIntensity": 50,
  "hoverFillIntensity": 100,
  "hoverPersist": false
};

export default function PixelMosaic(props: Record<string, unknown>) {
  return <__BaseImpl_PixelMosaic {...(__presetProps as Record<string, unknown>)} {...props} />;
}
