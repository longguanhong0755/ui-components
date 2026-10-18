import * as React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
const RenderTarget = {
    current: () => "preview",
    canvas: "canvas",
    export: "export",
    thumbnail: "thumbnail",
    preview: "preview",
}

const DEFAULT_IMAGE =
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/612d1402-0ad9-4135-3bbc-a30a6a252b00/w=800"

// ── Easing from a Framer Transition (for the Enter animation) ───────────────
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
    const cx = 3 * x1
    const bx = 3 * (x2 - x1) - cx
    const ax = 1 - cx - bx
    const cy = 3 * y1
    const by = 3 * (y2 - y1) - cy
    const ay = 1 - cy - by
    const fx = (t: number) => ((ax * t + bx) * t + cx) * t
    const dfx = (t: number) => (3 * ax * t + 2 * bx) * t + cx
    return (x: number) => {
        if (x <= 0) return 0
        if (x >= 1) return 1
        let t = x
        for (let i = 0; i < 8; i++) {
            const e = fx(t) - x
            const d = dfx(t)
            if (Math.abs(e) < 1e-5 || d === 0) break
            t -= e / d
        }
        return ((ay * t + by) * t + cy) * t
    }
}
const EASE_PRESETS: Record<string, [number, number, number, number]> = {
    linear: [0, 0, 1, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
}
function makeEaseFn(ease: any): (t: number) => number {
    if (Array.isArray(ease) && ease.length === 4)
        return cubicBezier(ease[0], ease[1], ease[2], ease[3])
    if (typeof ease === "string" && EASE_PRESETS[ease])
        return cubicBezier(...EASE_PRESETS[ease])
    return cubicBezier(0, 0, 0.58, 1)
}

function PixelateSvgFilter({
    id = "pixelate-filter",
    size = 16,
    crossLayers = false,
}: {
    id?: string
    size?: number
    crossLayers?: boolean
}) {
    return (
        <svg
            style={{
                userSelect: "none",
                position: "absolute",
                width: 0,
                height: 0,
            }}
        >
            <defs>
                <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
                    <feConvolveMatrix
                        kernelMatrix="1 1 1 1 1 1 1 1 1"
                        result="AVG"
                    />
                    <feFlood x="1" y="1" width="1" height="1" />
                    <feComposite
                        operator="arithmetic"
                        k1="0"
                        k2="1"
                        k3="0"
                        k4="0"
                        width={size}
                        height={size}
                    />
                    <feTile result="TILE" />
                    <feComposite
                        in="AVG"
                        in2="TILE"
                        operator="in"
                        k1="0"
                        k2="1"
                        k3="0"
                        k4="0"
                    />
                    <feMorphology
                        operator="dilate"
                        radius={size / 2}
                        result="NORMAL"
                    />
                    <feOffset dx="0" dy="0" />
                    <feMerge>
                        <feMergeNode in="NORMAL" />
                    </feMerge>

                    {crossLayers && (
                        <>
                            <feConvolveMatrix
                                kernelMatrix="1 1 1 1 1 1 1 1 1"
                                result="AVG"
                            />
                            <feFlood x="1" y="1" width="1" height="1" />
                            <feComposite
                                in2="SourceGraphic"
                                operator="arithmetic"
                                k1="0"
                                k2="1"
                                k3="0"
                                k4="0"
                                width={size / 2}
                                height={size}
                            />
                            <feTile result="TILE" />
                            <feComposite
                                in="AVG"
                                in2="TILE"
                                operator="in"
                                k1="0"
                                k2="1"
                                k3="0"
                                k4="0"
                            />
                            <feMorphology
                                operator="dilate"
                                radius={size / 2}
                                result="FALLBACKX"
                            />
                            <feConvolveMatrix
                                kernelMatrix="1 1 1 1 1 1 1 1 1"
                                result="AVG"
                            />
                            <feFlood x="1" y="1" width="1" height="1" />
                            <feComposite
                                in2="SourceGraphic"
                                operator="arithmetic"
                                k1="0"
                                k2="1"
                                k3="0"
                                k4="0"
                                width={size}
                                height={size / 2}
                            />
                            <feTile result="TILE" />
                            <feComposite
                                in="AVG"
                                in2="TILE"
                                operator="in"
                                k1="0"
                                k2="1"
                                k3="0"
                                k4="0"
                            />
                            <feMorphology
                                operator="dilate"
                                radius={size / 2}
                                result="FALLBACKY"
                            />
                            <feMerge>
                                <feMergeNode in="FALLBACKX" />
                                <feMergeNode in="FALLBACKY" />
                                <feMergeNode in="NORMAL" />
                            </feMerge>
                        </>
                    )}
                </filter>
            </defs>
        </svg>
    )
}

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const checkIsMobile = () => {
            const hasTouch =
                "ontouchstart" in window || navigator.maxTouchPoints > 0
            const isSmallScreen = window.innerWidth <= 810
            setIsMobile(hasTouch || isSmallScreen)
        }
        checkIsMobile()
        window.addEventListener("resize", checkIsMobile)
        return () => window.removeEventListener("resize", checkIsMobile)
    }, [])
    return isMobile
}

/**
 * Pixelate Image
 *
 * Reveals an image through an SVG pixelation filter driven by the cursor's
 * distance from the center (pixelate or depixelate on hover). Optional label
 * slides up from the bottom over a scrim on hover.
 *
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1000
 * @framerIntrinsicHeight 700
 */
function __BaseImpl_PixelateComponent(props: any) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        image,
        imageWidth,
        imageHeight,
        intensity,
        pixelateMode,
        animationMode,
        enterEase,
        enterPosition,
        enterReplay,
        hoverArea,
        safeArea,
        style,
    } = props

    const mode = animationMode ?? "hover"
    const containerRef = useRef<HTMLDivElement>(null)
    const rafRef = useRef<number | null>(null)
    const hasPlayedRef = useRef(false)
    const [isHovering, setIsHovering] = useState(false)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const isMobile = useIsMobile()

    const imageSrc = image?.src || image || DEFAULT_IMAGE

    // Intensity 1–100; remapped so 50% ≈ the old 100% strength (2× internally).
    const strength = Math.max(1, Math.min(200, intensity * 2))

    const minPixelation = 1
    const maxPixelation = Math.max(
        minPixelation + 1,
        Math.floor(1 + (strength / 100) * 127)
    )

    const getInitialPixelation = useCallback(
        () => (pixelateMode === "depixelate" ? maxPixelation : minPixelation),
        [pixelateMode, maxPixelation]
    )

    // State (not a motion value) so each move re-renders and updates the filter.
    const [pixelation, setPixelation] = useState(getInitialPixelation())

    const updatePixelation = useCallback(
        (clientX: number, clientY: number) => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            const distanceX = clientX - centerX
            const distanceY = clientY - centerY
            const distance = Math.sqrt(
                distanceX * distanceX + distanceY * distanceY
            )
            const diagonalDistance = Math.sqrt(
                rect.width * rect.width + rect.height * rect.height
            )
            const expandedRadius = (diagonalDistance / 2) * (hoverArea / 100)
            const safeAreaRadius = (diagonalDistance / 2) * (safeArea / 100)
            const effectiveDistance = Math.max(0, distance - safeAreaRadius)
            const effectiveRadius = Math.max(1, expandedRadius - safeAreaRadius)
            const normalizedDistance = Math.min(
                1,
                effectiveDistance / effectiveRadius
            )
            const finalDistance =
                pixelateMode === "depixelate"
                    ? normalizedDistance
                    : 1 - normalizedDistance
            const newPixelation =
                minPixelation + (maxPixelation - minPixelation) * finalDistance
            setPixelation(newPixelation)
        },
        [
            hoverArea,
            safeArea,
            pixelateMode,
            minPixelation,
            maxPixelation,
            setPixelation,
        ]
    )

    const handleMouseMove = useCallback(
        (event: React.MouseEvent) => {
            if (mode !== "hover" || isCanvas || isMobile) return
            updatePixelation(event.clientX, event.clientY)
        },
        [mode, isCanvas, isMobile, updatePixelation]
    )
    const handleMouseEnter = useCallback(() => {
        if (mode !== "hover" || isCanvas || isMobile) return
        setIsHovering(true)
    }, [mode, isCanvas, isMobile])
    const handleMouseLeave = useCallback(() => {
        if (mode !== "hover" || isCanvas || isMobile) return
        setIsHovering(false)
        setPixelation(getInitialPixelation())
    }, [mode, isCanvas, isMobile, getInitialPixelation, setPixelation])

    // Global tracking for the expanded hover area (hover mode only).
    useEffect(() => {
        if (mode !== "hover" || isCanvas || isMobile || !containerRef.current)
            return
        const handleGlobalMouseMove = (event: MouseEvent) => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            const diagonalDistance = Math.sqrt(
                rect.width * rect.width + rect.height * rect.height
            )
            const expandedRadius = (diagonalDistance / 2) * (hoverArea / 100)
            const distanceX = event.clientX - centerX
            const distanceY = event.clientY - centerY
            const distance = Math.sqrt(
                distanceX * distanceX + distanceY * distanceY
            )
            const isWithinHoverArea = distance <= expandedRadius
            if (isWithinHoverArea && !isHovering) {
                setIsHovering(true)
            } else if (!isWithinHoverArea && isHovering) {
                setIsHovering(false)
                setPixelation(getInitialPixelation())
            }
            if (isWithinHoverArea) {
                updatePixelation(event.clientX, event.clientY)
            }
        }
        window.addEventListener("mousemove", handleGlobalMouseMove)
        return () =>
            window.removeEventListener("mousemove", handleGlobalMouseMove)
    }, [
        mode,
        isCanvas,
        isMobile,
        hoverArea,
        isHovering,
        updatePixelation,
        setPixelation,
        getInitialPixelation,
    ])

    // Enter mode: auto-tween pixelation when the component scrolls into view.
    useEffect(() => {
        if (mode !== "enter") return
        const from = getInitialPixelation()
        const to = pixelateMode === "depixelate" ? minPixelation : maxPixelation
        // In the Framer editor show the finished state.
        if (isCanvas) {
            setPixelation(to)
            return
        }
        const el = containerRef.current
        if (!el) return
        const threshold =
            enterPosition === "middle" ? 0.5 : enterPosition === "below" ? 1 : 0
        const easeFn = makeEaseFn(enterEase?.ease)
        const durMs = (enterEase?.duration ?? 1) * 1000

        setPixelation(from)

        const play = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            const start = performance.now()
            const tick = (now: number) => {
                const t = durMs > 0 ? Math.min(1, (now - start) / durMs) : 1
                setPixelation(from + (to - from) * easeFn(t))
                if (t < 1) rafRef.current = requestAnimationFrame(tick)
            }
            rafRef.current = requestAnimationFrame(tick)
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        if (!hasPlayedRef.current) {
                            hasPlayedRef.current = true
                            play()
                        }
                    } else if (enterReplay === "yes") {
                        hasPlayedRef.current = false
                        if (rafRef.current) cancelAnimationFrame(rafRef.current)
                        setPixelation(from)
                    }
                })
            },
            { threshold }
        )
        observer.observe(el)
        return () => {
            observer.disconnect()
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        mode,
        isCanvas,
        pixelateMode,
        enterPosition,
        enterReplay,
        minPixelation,
        maxPixelation,
        getInitialPixelation,
        JSON.stringify(enterEase),
    ])

    // Overscan the image past the box so the pixelation filter's tiled/dilated
    // edges never leave transparent gaps. Clipped by the container's overflow.
    const inset = -(strength / 100) * 50
    const grow = `calc(100% + ${(strength / 100) * 100}px)`
    const mediaBase: React.CSSProperties = {
        position: "absolute",
        inset,
        width: grow,
        height: grow,
        objectFit: "cover",
        objectPosition: "center center",
        userSelect: "none",
    }
    const pxNow = Math.max(minPixelation, Math.min(maxPixelation, pixelation))
    const overlayOpacity =
        isCanvas || pxNow <= 1 ? 0 : Math.min(1, Math.max(0, (pxNow - 1) / 8))

    return (
        <div
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
            }}
        >
            <motion.div
                ref={containerRef}
                style={{
                    position: "relative",
                    width: `${imageWidth}px`,
                    height: `${imageHeight}px`,
                    flex: "0 0 auto",
                    overflow: "hidden",
                    userSelect: "none",
                }}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {!isMobile && pxNow > 1 && (
                    <PixelateSvgFilter
                        id="pixelate-filter"
                        size={pxNow}
                        crossLayers={false}
                    />
                )}

                <motion.img
                    src={imageSrc}
                    alt={image?.alt || "Base image"}
                    style={{ ...mediaBase, zIndex: 1 }}
                />

                {!isMobile && (
                    <motion.img
                        src={imageSrc}
                        alt={image?.alt || "Pixelated image"}
                        style={{
                            ...mediaBase,
                            filter: "url(#pixelate-filter)",
                            zIndex: 2,
                            opacity: overlayOpacity,
                            transition: "opacity 0.1s ease-out",
                        }}
                    />
                )}
            </motion.div>
        </div>
    )
}

const COMPONENT_DEFAULTS = {
    imageWidth: 800,
    imageHeight: 500,
    intensity: 10,
    pixelateMode: "depixelate",
    animationMode: "enter",
    hoverArea: 100,
    safeArea: 10,
    enterEase: { type: "tween", duration: 1, ease: "easeInOut" },
    enterPosition: "above",
    enterReplay: "no",
    image: null,
}

PixelateComponent.displayName = "Pixelate Image"

const __presetProps = {
  "image": {
    "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/612d1402-0ad9-4135-3bbc-a30a6a252b00/w=800"
  },
  "safeArea": 10,
  "enterEase": {
    "ease": "easeInOut",
    "mass": 1,
    "type": "tween",
    "damping": 60,
    "duration": 1,
    "stiffness": 800
  },
  "intensity": 50,
  "imageWidth": 800,
  "enterReplay": "no",
  "imageHeight": 500,
  "pixelateMode": "depixelate",
  "animationMode": "hover",
  "enterPosition": "above"
};

export default function PixelateComponent(props: Record<string, unknown>) {
  return <__BaseImpl_PixelateComponent {...(__presetProps as Record<string, unknown>)} {...props} />;
}
