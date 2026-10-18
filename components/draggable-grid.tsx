"use client"

import { motion, useMotionValue, animate } from "framer-motion"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"

type GridItem = {
    image?: { src?: string; srcSet?: string; alt?: string }
    alt?: string
}

interface DraggableGridProps {
    items: GridItem[]
    columns: number
    imageWidth: number
    imageHeight: number
    rounded: number
    gap: number
    enableWheel: boolean
    placeholderColor: string
    onItemClick?: (item: GridItem, index: number) => void
    style?: React.CSSProperties
}

const defaultItems: GridItem[] = [
    {
        image: {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/612d1402-0ad9-4135-3bbc-a30a6a252b00/w=800",
        },
        alt: "",
    },
    {
        image: {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6d2ad64a-102d-4eab-0efe-31479e34b500/w=800",
        },
        alt: "",
    },
    {
        image: {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/be854dd1-37aa-4fc7-f569-fdb948109300/w=800",
        },
        alt: "",
    },
    {
        image: {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/51984031-9176-484b-f5e0-4af9a8e9ed00/w=800",
        },
        alt: "",
    },
    {
        image: {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/34ce1842-4b7a-4d52-0302-38582c341700/w=800",
        },
        alt: "",
    },
    {
        image: {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/88369c6d-00cc-4ac9-74ca-0f0965e06300/w=800",
        },
        alt: "",
    },
    {
        image: {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/aeaa0756-9647-4f6c-d900-204bd25e4a00/w=800",
        },
        alt: "",
    },
    {
        image: {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/316d1761-fd79-4ca9-b8d4-f2bb20521a00/w=800",
        },
        alt: "",
    },
]

// Distinct visible color per tile (golden-angle hue rotation) so the grid is
// always visible even when images don't load.
function getItemColor(index: number) {
    const hue = (index * 137.508) % 360
    return `hsl(${hue}, 55%, 55%)`
}

// Deterministic PRNG (mulberry32) so the shuffle is stable across renders
// once seeded — no flicker on every re-render.
function mulberry32(seed: number) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// Fill a target length by repeating items, shuffled so neighbours don't
// duplicate the same source item where possible.
function fillAndShuffle<T>(items: T[], target: number, seed: number): T[] {
    if (items.length === 0) return []
    const rand = mulberry32(seed)
    const out: T[] = []
    // Build a pool: one shuffled copy of items, refilled when exhausted.
    const refill = () => {
        const pool = items.slice()
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1))
            ;[pool[i], pool[j]] = [pool[j], pool[i]]
        }
        return pool
    }
    let pool = refill()
    while (out.length < target) {
        if (pool.length === 0) pool = refill()
        const next = pool.pop()!
        // Try to avoid placing the same item immediately after itself.
        if (out.length > 0 && next === out[out.length - 1] && pool.length > 0) {
            const swap = pool.pop()!
            out.push(swap)
            pool.push(next)
        } else {
            out.push(next)
        }
    }
    return out
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 600
 */
function __BaseImpl_DraggableGrid(props: DraggableGridProps) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        items,
        columns,
        imageWidth,
        imageHeight,
        rounded,
        gap,
        enableWheel,
        placeholderColor,
        onItemClick,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const x = useMotionValue(0)
    const y = useMotionValue(0)

    const [containerSize, setContainerSize] = useState({ w: 800, h: 600 })
    const [isDragging, setIsDragging] = useState(false)
    const initializedRef = useRef(false)

    const pointerDownPos = useRef<{ x: number; y: number; t: number } | null>(
        null
    )
    const wheelAnimX = useRef<ReturnType<typeof animate> | null>(null)
    const wheelAnimY = useRef<ReturnType<typeof animate> | null>(null)
    const failedImages = useRef<Set<number>>(new Set())
    const [, forceRender] = useState(0)

    const safeItems =
        Array.isArray(items) && items.length > 0 ? items : defaultItems
    const safeColumns = Math.max(1, Math.min(20, Math.floor(columns || 5)))
    // Image dimensions match CurveGallery (px, clamped 20–4000).
    const safeImageWidth = Math.max(20, Math.min(4000, imageWidth ?? 150))
    const safeImageHeight = Math.max(20, Math.min(4000, imageHeight ?? 210))
    // Gap matches CurveGallery: control is 0–100, ×4 → px. Same value spaces
    // tiles from each other AND the grid edge from the boundary (padding).
    const safeGap = Math.max(0, Math.min(100, gap ?? 4)) * 4
    // Rounded matches CurveGallery: 0 = square … 20 = circle (on short side).
    const r = Math.max(0, Math.min(20, rounded ?? 3))
    const radius = (r / 20) * (Math.min(safeImageWidth, safeImageHeight) / 2)

    // Square grid: rows === columns. Fill all cells by repeating items in a
    // shuffled order, so a small source list still produces a full grid.
    const rows = safeColumns
    const totalCells = safeColumns * rows
    const displayItems = useMemo(
        () => fillAndShuffle(safeItems, totalCells, 0xc0ffee),
        [safeItems, totalCells]
    )

    const gridW = safeColumns * safeImageWidth + (safeColumns - 1) * safeGap
    const gridH = rows * safeImageHeight + (rows - 1) * safeGap

    // Measure container with ResizeObserver
    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const measure = () => {
            const rect = el.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
                setContainerSize({ w: rect.width, h: rect.height })
            }
        }
        measure()

        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    // Drag constraints: at either extreme the edge images stop exactly one
    // gap from the container border — no overshoot into empty space.
    // maxX/maxY: grid pinned `gap` from the top-left border.
    // minX/minY: grid's far edge `gap` from the bottom-right border.
    // When the grid is smaller than the container the range collapses to the
    // top-left position (min clamped to max), so it can't drift.
    const maxX = safeGap
    const minX = Math.min(maxX, containerSize.w - gridW - safeGap)
    const maxY = safeGap
    const minY = Math.min(maxY, containerSize.h - gridH - safeGap)

    const dragConstraints = {
        left: minX,
        right: maxX,
        top: minY,
        bottom: maxY,
    }

    // Pin the grid to the top-left corner so there are no centering margins —
    // the only spacing is the configured gap between images. Set once; after
    // that drag/wheel own the motion values.
    useEffect(() => {
        if (initializedRef.current) return
        if (containerSize.w === 0 || containerSize.h === 0) return

        x.set(maxX)
        y.set(maxY)
        initializedRef.current = true
    }, [containerSize.w, containerSize.h, maxX, maxY, x, y])

    // Wheel scrolling
    useEffect(() => {
        if (!enableWheel) return
        const el = containerRef.current
        if (!el) return

        const clamp = (v: number, mn: number, mx: number) =>
            Math.min(Math.max(v, mn), mx)

        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            const curX = x.get()
            const curY = y.get()
            const targetX = clamp(curX - e.deltaX, minX, maxX)
            const targetY = clamp(curY - e.deltaY, minY, maxY)
            if (wheelAnimX.current) wheelAnimX.current.stop()
            if (wheelAnimY.current) wheelAnimY.current.stop()
            wheelAnimX.current = animate(x, targetX, {
                duration: 0.3,
                ease: [0.22, 1, 0.36, 1],
            })
            wheelAnimY.current = animate(y, targetY, {
                duration: 0.3,
                ease: [0.22, 1, 0.36, 1],
            })
        }

        el.addEventListener("wheel", onWheel, { passive: false })
        return () => {
            el.removeEventListener("wheel", onWheel)
            if (wheelAnimX.current) wheelAnimX.current.stop()
            if (wheelAnimY.current) wheelAnimY.current.stop()
        }
    }, [enableWheel, minX, maxX, minY, maxY, x, y])

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY, t: Date.now() }
    }, [])

    const handlePointerUp = useCallback(
        (e: React.PointerEvent, item: GridItem, index: number) => {
            const start = pointerDownPos.current
            pointerDownPos.current = null
            if (!start) return
            const dx = e.clientX - start.x
            const dy = e.clientY - start.y
            const moved = Math.hypot(dx, dy)
            if (moved < 5) {
                onItemClick?.(item, index)
            }
        },
        [onItemClick]
    )

    const handleImageError = useCallback((index: number) => {
        failedImages.current.add(index)
        forceRender((n) => n + 1)
    }, [])

    const wrapperStyle: React.CSSProperties = {
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 600,
        minHeight: 600,
        margin: 0,
        boxSizing: "border-box",
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        cursor: isDragging ? "grabbing" : "grab",
        ...style,
    }

    const gridStyle: React.CSSProperties = {
        position: "absolute",
        top: 0,
        left: 0,
        width: gridW,
        height: gridH,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: `repeat(${safeColumns}, ${safeImageWidth}px)`,
        gridAutoRows: `${safeImageHeight}px`,
        gap: `${safeGap}px`,
        willChange: "transform",
    }

    return (
        <div ref={containerRef} style={wrapperStyle}>
            <motion.div
                style={{ ...gridStyle, x, y }}
                drag
                dragConstraints={dragConstraints}
                dragElastic={0}
                dragMomentum={true}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setIsDragging(false)}
            >
                {displayItems.map((item, index) => {
                    const src = item?.image?.src
                    const alt = item?.alt ?? item?.image?.alt ?? ""
                    const failed = failedImages.current.has(index)
                    return (
                        <div
                            key={index}
                            onPointerDown={handlePointerDown}
                            onPointerUp={(e) => handlePointerUp(e, item, index)}
                            style={{
                                position: "relative",
                                width: safeImageWidth,
                                height: safeImageHeight,
                                overflow: "hidden",
                                borderRadius: radius,
                                backgroundColor: getItemColor(index),
                                color: "rgba(255,255,255,0.85)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontFamily:
                                    "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                fontSize: Math.max(
                                    14,
                                    Math.round(
                                        Math.min(
                                            safeImageWidth,
                                            safeImageHeight
                                        ) * 0.16
                                    )
                                ),
                                fontWeight: 600,
                                cursor: isDragging ? "grabbing" : "pointer",
                            }}
                        >
                            <span style={{ position: "relative", zIndex: 0 }}>
                                {index + 1}
                            </span>
                            {src && !failed ? (
                                <img
                                    src={src}
                                    alt={alt}
                                    draggable={false}
                                    onError={() => handleImageError(index)}
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        pointerEvents: "none",
                                        userSelect: "none",
                                        display: "block",
                                        zIndex: 1,
                                    }}
                                />
                            ) : null}
                        </div>
                    )
                })}
            </motion.div>
        </div>
    )
}

const COMPONENT_DEFAULTS = {
    items: defaultItems,
    columns: 15,
    imageWidth: 200,
    imageHeight: 200,
    rounded: 3,
    gap: 5,
    enableWheel: false,
    placeholderColor: "#1a1a1f",
}

const __presetProps = {
  "gap": 5,
  "items": [
    {
      "alt": "",
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/612d1402-0ad9-4135-3bbc-a30a6a252b00/w=800"
      }
    },
    {
      "alt": "",
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6d2ad64a-102d-4eab-0efe-31479e34b500/w=800"
      }
    },
    {
      "alt": "",
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/be854dd1-37aa-4fc7-f569-fdb948109300/w=800"
      }
    },
    {
      "alt": "",
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/51984031-9176-484b-f5e0-4af9a8e9ed00/w=800"
      }
    },
    {
      "alt": "",
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/34ce1842-4b7a-4d52-0302-38582c341700/w=800"
      }
    },
    {
      "alt": "",
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/88369c6d-00cc-4ac9-74ca-0f0965e06300/w=800"
      }
    },
    {
      "alt": "",
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/aeaa0756-9647-4f6c-d900-204bd25e4a00/w=800"
      }
    },
    {
      "alt": "",
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/316d1761-fd79-4ca9-b8d4-f2bb20521a00/w=800"
      }
    }
  ],
  "columns": 15,
  "rounded": 3,
  "imageWidth": 200,
  "enableWheel": false,
  "imageHeight": 200,
  "onItemClick": null,
  "placeholderColor": "#1a1a1f"
};

export default function DraggableGrid(props: Record<string, unknown>) {
  return <__BaseImpl_DraggableGrid {...(__presetProps as Record<string, unknown>)} {...props} />;
}
