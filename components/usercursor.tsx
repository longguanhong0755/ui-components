import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
const useIsStaticRenderer = () => false
import {
    motion,
    useMotionValue,
    useSpring,
    useTransform,
    animate,
    type SpringOptions,
} from "framer-motion"

/**
 * UserCursor — a custom cursor follower that replaces the OS cursor inside
 * its surface. An arrow glyph tracks the pointer with spring physics; a
 * colored label pill trails behind on a laggier spring, rocking with motion
 * and scaling while pressed.
 *
 * The host is a relative container with `overflow: hidden`; the cursor shows
 * while the pointer is inside it and the native cursor is hidden there. The
 * cursor layer is `pointer-events: none` so clicks pass through. Skipped on
 * coarse-pointer (touch) devices.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 200
 * @framerIntrinsicHeight 200
 */
export default function UserCursor(props: Props) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        name,
        arrow,
        label,
        color,
        textColor,
        size,
        labelTiltStrength,
        showLabel,
        // Flat offsets (Framer-friendly).
        offsetX,
        offsetY,
        labelOffsetX,
        labelOffsetY,
        labelOffsetUseDefault,
        pressScale,
        classNames,
        // Non-serializable advanced overrides (programmatic only).
        offset: offsetOverride,
        labelOffset: labelOffsetOverride,
        style,
    } = props

    // Fixed behavior (previously configurable; locked to sensible defaults).
    const fullScreen = false
    const hideNativeCursor = true
    const hideOnTouch = true
    const zIndex = 50

    const isStatic = useIsStaticRenderer()

    // --- touch detection -----------------------------------------------------
    const [isTouchDevice, setIsTouchDevice] = useState(false)
    useEffect(() => {
        if (!hideOnTouch) {
            setIsTouchDevice(false)
            return
        }
        if (typeof window === "undefined" || !window.matchMedia) return
        const mql = window.matchMedia("(pointer: coarse)")
        const sync = () => setIsTouchDevice(!!mql.matches)
        sync()
        // Modern + legacy listener APIs.
        if (mql.addEventListener) {
            mql.addEventListener("change", sync)
            return () => mql.removeEventListener("change", sync)
        }
        const legacy = mql as MediaQueryList & {
            addListener?: (l: (e: MediaQueryListEvent) => void) => void
            removeListener?: (l: (e: MediaQueryListEvent) => void) => void
        }
        legacy.addListener?.(sync)
        return () => legacy.removeListener?.(sync)
    }, [hideOnTouch])

    // --- container refs ------------------------------------------------------
    const containerRef = useRef<HTMLDivElement | null>(null)

    // --- visible state (gated by trigger + presence) ------------------------
    // `hovering` = pointer is over the surface (or has moved at least once in
    // fullScreen mode). `pressed` = mouse button is currently down.
    const [hovering, setHovering] = useState(false)
    const [pressed, setPressed] = useState(false)

    // Fixed spring configs (good defaults). Arrow is snappier; label trails.
    const arrowSpring = useMemo<SpringOptions>(
        () => ({ stiffness: 380, damping: 32, mass: 0.6 }),
        []
    )
    const labelSpringCfg = useMemo<SpringOptions>(
        () => ({ stiffness: 220, damping: 26, mass: 0.7 }),
        []
    )

    // Resolved offsets. `labelOffsetUseDefault` makes the label offset
    // automatically follow `size`; turn it off to use the explicit numeric
    // labelOffsetX / labelOffsetY values. Programmatic `offsetOverride` /
    // `labelOffsetOverride` win over both.
    const resolvedOffset = useMemo(
        () => ({
            x: offsetOverride?.x ?? offsetX,
            y: offsetOverride?.y ?? offsetY,
        }),
        [offsetOverride?.x, offsetOverride?.y, offsetX, offsetY]
    )

    const resolvedLabelOffset = useMemo(() => {
        if (labelOffsetOverride) {
            return {
                x: labelOffsetOverride.x ?? size * 0.9,
                y: labelOffsetOverride.y ?? size * 0.2 + 6,
            }
        }
        if (labelOffsetUseDefault) {
            return { x: size * 0.9, y: size * 0.2 + 6 }
        }
        return { x: labelOffsetX, y: labelOffsetY }
    }, [
        labelOffsetOverride?.x,
        labelOffsetOverride?.y,
        labelOffsetUseDefault,
        labelOffsetX,
        labelOffsetY,
        size,
    ])

    // --- motion values --------------------------------------------------------
    // Raw pointer position (in container-local CSS px, or viewport px when
    // fullScreen). Initialized off-screen so springs don't snap from (0,0)
    // until we have a real reading.
    const mouseX = useMotionValue(-9999)
    const mouseY = useMotionValue(-9999)

    // Spring-smoothed positions. Arrow is snappier, label trails.
    const arrowX = useSpring(mouseX, arrowSpring)
    const arrowY = useSpring(mouseY, arrowSpring)
    const labelX = useSpring(mouseX, labelSpringCfg)
    const labelY = useSpring(mouseY, labelSpringCfg)

    // Press scale (springy bounce on press/release).
    const scaleMV = useMotionValue(1)
    useEffect(() => {
        const controls = animate(scaleMV, pressed ? pressScale : 1, {
            type: "spring",
            stiffness: 500,
            damping: 28,
            mass: 0.5,
        })
        return () => controls.stop()
    }, [pressed, pressScale, scaleMV])

    // Label tilt is derived from velocity magnitude, capped at
    // ±labelTiltStrength, with a small sign tied to horizontal velocity so
    // the pill rocks forward and back as the cursor reverses direction.
    const labelTiltTarget = useMotionValue(0)
    const labelRotation = useSpring(labelTiltTarget, {
        stiffness: 200,
        damping: 24,
        mass: 0.6,
    })

    // --- pointer listeners ---------------------------------------------------
    const lastSampleRef = useRef<{ x: number; y: number; t: number } | null>(
        null
    )

    useEffect(() => {
        if (isStatic || isTouchDevice) return
        if (typeof window === "undefined") return

        const container = containerRef.current
        // In non-fullScreen mode we *need* a container to anchor the cursor;
        // in fullScreen we listen to window directly.
        if (!fullScreen && !container) return

        const getLocal = (clientX: number, clientY: number) => {
            if (fullScreen) return { x: clientX, y: clientY }
            const rect = container!.getBoundingClientRect()
            return { x: clientX - rect.left, y: clientY - rect.top }
        }

        const onMove = (e: MouseEvent) => {
            const { x, y } = getLocal(e.clientX, e.clientY)

            // Velocity for direction-aware tilt & label rocking.
            const now =
                typeof performance !== "undefined"
                    ? performance.now()
                    : Date.now()
            const last = lastSampleRef.current
            let vx = 0
            let vy = 0
            if (last) {
                const dt = Math.max(1, now - last.t) // ms, avoid div-by-zero
                vx = ((x - last.x) / dt) * 1000 // px/sec
                vy = ((y - last.y) / dt) * 1000
            }
            lastSampleRef.current = { x, y, t: now }

            mouseX.set(x + resolvedOffset.x)
            mouseY.set(y + resolvedOffset.y)

            // Label rock: sign by horizontal velocity, magnitude by overall
            // speed clamped to labelTiltStrength.
            const speed = Math.hypot(vx, vy)
            const norm = Math.min(1, speed / 1500)
            const sign = vx === 0 ? 0 : vx > 0 ? 1 : -1
            labelTiltTarget.set(sign * norm * labelTiltStrength)

            if (fullScreen) setHovering(true)
        }

        const onDown = () => setPressed(true)
        const onUp = () => setPressed(false)

        const onEnter = () => setHovering(true)
        const onLeave = () => {
            setHovering(false)
            // Reset velocity sample so re-entering doesn't yield a huge dt.
            lastSampleRef.current = null
            // Settle label tilt back to neutral on leave.
            labelTiltTarget.set(0)
        }

        if (fullScreen) {
            window.addEventListener("mousemove", onMove)
            window.addEventListener("mousedown", onDown)
            window.addEventListener("mouseup", onUp)
        } else {
            const el = container!
            el.addEventListener("mousemove", onMove as EventListener)
            el.addEventListener("mousedown", onDown)
            el.addEventListener("mouseup", onUp)
            el.addEventListener("mouseenter", onEnter)
            el.addEventListener("mouseleave", onLeave)
        }

        return () => {
            if (fullScreen) {
                window.removeEventListener("mousemove", onMove)
                window.removeEventListener("mousedown", onDown)
                window.removeEventListener("mouseup", onUp)
            } else {
                const el = container!
                el.removeEventListener("mousemove", onMove as EventListener)
                el.removeEventListener("mousedown", onDown)
                el.removeEventListener("mouseup", onUp)
                el.removeEventListener("mouseenter", onEnter)
                el.removeEventListener("mouseleave", onLeave)
            }
            // Make sure we drop a `pressed` flag if we unmount mid-press.
            setPressed(false)
        }
    }, [
        isStatic,
        isTouchDevice,
        fullScreen,
        labelTiltStrength,
        resolvedOffset.x,
        resolvedOffset.y,
        mouseX,
        mouseY,
        labelTiltTarget,
    ])

    // --- visibility resolution ----------------------------------------------
    // Visible while the pointer is over the surface. Always visible in the
    // static/canvas render so designers see what they're configuring.
    const visible = useMemo(() => {
        if (isStatic) return true
        if (isTouchDevice) return false
        return hovering
    }, [isStatic, isTouchDevice, hovering])

    // --- static-renderer one-frame setup ------------------------------------
    // Place the arrow at a sensible canvas-visible spot so designers see it
    // without needing to hover. Center-ish of the intrinsic box.
    useEffect(() => {
        if (!isStatic) return
        const el = containerRef.current
        const w = el?.clientWidth ?? 400
        const h = el?.clientHeight ?? 300
        mouseX.set(w * 0.4 + resolvedOffset.x)
        mouseY.set(h * 0.4 + resolvedOffset.y)
        labelTiltTarget.set(0)
        // Force springs to current value to avoid an animation in static.
        arrowX.set(w * 0.4 + resolvedOffset.x)
        arrowY.set(h * 0.4 + resolvedOffset.y)
        labelX.set(w * 0.4 + resolvedOffset.x)
        labelY.set(h * 0.4 + resolvedOffset.y)
    }, [
        isStatic,
        resolvedOffset.x,
        resolvedOffset.y,
        mouseX,
        mouseY,
        labelTiltTarget,
        arrowX,
        arrowY,
        labelX,
        labelY,
    ])

    // --- transform composition ----------------------------------------------
    // Arrow x/y already include `resolvedOffset` (we baked it into mouseX/Y).
    // Label position adds `resolvedLabelOffset` on top.
    const labelTranslateX = useTransform(
        labelX,
        (v) => v + resolvedLabelOffset.x
    )
    const labelTranslateY = useTransform(
        labelY,
        (v) => v + resolvedLabelOffset.y
    )

    // --- arrow content ------------------------------------------------------
    const arrowContent: React.ReactNode = useMemo(() => {
        if (typeof arrow === "function") {
            try {
                return (arrow as (c: string) => React.ReactNode)(color)
            } catch {
                return null
            }
        }
        if (arrow !== undefined && arrow !== null)
            return arrow as React.ReactNode
        // Default macOS-ish cursor pointing up-left, anchored at tip (0,0).
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: "block", overflow: "visible" }}
            >
                <path
                    d="M5 3 L23 14 L14 16 L11 24 Z"
                    fill={color}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth={0.6}
                    strokeLinejoin="round"
                />
            </svg>
        )
    }, [arrow, color, size])

    // --- label content -------------------------------------------------------
    const labelContent: React.ReactNode = useMemo(() => {
        if (label !== undefined && label !== null) return label
        return (
            <div
                className={classNames?.labelText}
                style={{
                    color: textColor,
                    // Scale label text with Size (≈12px at size 28).
                    fontSize: Math.max(7, size * 0.43),
                    lineHeight: 1.1,
                    fontWeight: 600,
                    fontFamily:
                        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    whiteSpace: "nowrap",
                    letterSpacing: 0.1,
                }}
            >
                {name}
            </div>
        )
    }, [label, name, textColor, size, classNames?.labelText])

    // --- early bail-outs ----------------------------------------------------
    if (isTouchDevice) return null

    // --- styles --------------------------------------------------------------
    // Bounded host: the pointer target + clipping/anchoring container, fixed
    // 200×200. Native OS cursor hidden inside it.
    const hostStyle: React.CSSProperties = {
        position: "relative",
        width: 200,
        height: 200,
        overflow: "hidden",
        cursor: hideNativeCursor ? "none" : undefined,
        ...style,
    }

    // Cursor-layer style (the element that holds the moving arrow + label).
    const layerStyle: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex,
    }

    // For non-fullScreen, the cursor layer lives *inside* the container so
    // its coordinate space matches the container-local pointer coordinates.
    // For fullScreen, the cursor layer is a portal-like fixed div rendered
    // alongside (NOT inside) the host so it can cover the whole viewport
    // regardless of where the component sits on the page.
    return (
        <>
            <div
                ref={containerRef}
                className={classNames?.root}
                style={hostStyle}
            >
                <CursorLayer
                    layerStyle={layerStyle}
                    visible={visible}
                    arrowX={arrowX}
                    arrowY={arrowY}
                    labelX={labelTranslateX}
                    labelY={labelTranslateY}
                    labelRotation={labelRotation}
                    scale={scaleMV}
                    showLabel={showLabel}
                    color={color}
                    size={size}
                    arrowContent={arrowContent}
                    labelContent={labelContent}
                    classNames={classNames}
                />
            </div>
        </>
    )
}

// -----------------------------------------------------------------------------
// CursorLayer — the moving arrow + label, factored out so we can render it
// rendered inside the host container.
// -----------------------------------------------------------------------------

function CursorLayer(props: {
    layerStyle: React.CSSProperties
    visible: boolean
    arrowX: any
    arrowY: any
    labelX: any
    labelY: any
    labelRotation: any
    scale: any
    showLabel: boolean
    color: string
    size: number
    arrowContent: React.ReactNode
    labelContent: React.ReactNode
    classNames?: ClassNames
}) {
    const {
        layerStyle,
        visible,
        arrowX,
        arrowY,
        labelX,
        labelY,
        labelRotation,
        scale,
        showLabel,
        color,
        size,
        arrowContent,
        labelContent,
        classNames,
    } = props

    return (
        <div style={layerStyle}>
            {/* Label trails — render BEHIND the arrow so the arrow tip is
                always visually on top. */}
            {showLabel && (
                <motion.div
                    className={classNames?.label}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        x: labelX,
                        y: labelY,
                        rotate: labelRotation,
                        scale,
                        background: color,
                        borderRadius: 999,
                        // Pill padding scales with Size (≈5/10px at size 28).
                        padding: `${size * 0.18}px ${size * 0.36}px`,
                        boxShadow:
                            "0 4px 12px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)",
                        opacity: visible ? 1 : 0,
                        transformOrigin: "0% 50%",
                        transition: "opacity 140ms ease",
                        willChange: "transform, opacity",
                        userSelect: "none",
                        pointerEvents: "none",
                    }}
                >
                    {labelContent}
                </motion.div>
            )}

            <motion.div
                className={classNames?.cursor}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    x: arrowX,
                    y: arrowY,
                    scale,
                    width: size,
                    height: size,
                    opacity: visible ? 1 : 0,
                    transformOrigin: "0% 0%", // anchor at arrow tip
                    transition: "opacity 140ms ease",
                    willChange: "transform, opacity",
                    pointerEvents: "none",
                }}
            >
                <div
                    className={classNames?.arrow}
                    style={{ width: size, height: size }}
                >
                    {arrowContent}
                </div>
            </motion.div>
        </div>
    )
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ClassNames = {
    root?: string
    cursor?: string
    arrow?: string
    label?: string
    labelText?: string
}

type Props = {
    // Visual / content
    name: string
    arrow?: React.ReactNode | ((color: string) => React.ReactNode)
    label?: React.ReactNode
    color: string
    textColor: string
    size: number
    labelTiltStrength: number

    // Behavior
    showLabel: boolean

    // Offsets — flat (controllable) form.
    offsetX: number
    offsetY: number
    labelOffsetUseDefault: boolean
    labelOffsetX: number
    labelOffsetY: number

    // Press feedback
    pressScale: number

    // Programmatic-only overrides (kept in Props for spec parity).
    offset?: { x?: number; y?: number }
    labelOffset?: { x?: number; y?: number }
    classNames?: ClassNames

    style?: React.CSSProperties
}

const COMPONENT_DEFAULTS = {
    color: "#FFFFFF",
    size: 56,
    pressScale: 0.92,
    offsetX: 0,
    offsetY: 0,
    showLabel: true,
    name: "Robert",
    textColor: "#000000",
    labelTiltStrength: 25,
    labelOffsetUseDefault: true,
    labelOffsetX: 25,
    labelOffsetY: 12,
}
