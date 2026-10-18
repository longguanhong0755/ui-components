"use client"

import { useEffect, useRef } from "react"

const FALLBACK_IMG =
    "https://images.unsplash.com/photo-1549804070-87eb7f0946b8?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"

// One place every control default lives, so the panel and defaultProps agree.
const DEFAULTS = {
    size: 300,
    rounding: 0,
    blur: 8,
    intro: true,
    introDuration: 1.5,
    ring: true,
    ringColor: "rgba(255,255,255,0.95)",
    icon: true,
}

// Rounding is a whole-number 0-20 on the panel spread across half the lens, so
// 0 is a hard square and 20 lands exactly on a circle at any size.
const ROUNDING_MAX = 20
// The blurred layer is scaled past its own edges — a blur filter thins out at
// the boundary and would otherwise show a soft seam around the frame.
const BLUR_OVERSCAN = 1.08

function clamp(n: any, min: number, max: number, fallback: number) {
    const v = typeof n === "number" ? n : parseFloat(n)
    if (!Number.isFinite(v)) return fallback
    return Math.min(max, Math.max(min, v))
}

// Accepts either a plain URL string or an object with a src/url field.
function imageURL(value: any): string {
    if (!value) return ""
    if (typeof value === "string") return value
    return value.src || value.url || ""
}

function easeInOut(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

interface BlurRevealImage {
    src: string
    alt?: string
}

interface BlurRevealRingOptions {
    color?: string
    icon?: boolean
}

interface BlurRevealProps {
    image?: BlurRevealImage
    size?: number
    rounding?: number
    blur?: number
    ring?: boolean
    ringOptions?: BlurRevealRingOptions
    intro?: boolean
    introDuration?: number
    style?: React.CSSProperties
}

// Panel values are whole numbers on friendly ranges; the render wants the
// fractional ones, so the mapping lives here only.
function settingsFor(p: any) {
    const size = Math.round(clamp(p?.size, 40, 600, DEFAULTS.size))
    const rounding = Math.round(
        clamp(p?.rounding, 0, ROUNDING_MAX, DEFAULTS.rounding)
    )
    return {
        size,
        // Half the lens is a full circle, so the top of the slider gets there
        // whatever the size is set to.
        radius: (rounding / ROUNDING_MAX) * (size / 2),
        blur: clamp(p?.blur, 0, 40, DEFAULTS.blur),
        intro: p?.intro !== false,
        introDuration: clamp(
            p?.introDuration,
            0.5,
            5,
            DEFAULTS.introDuration
        ),
        ring: p?.ring !== false,
        ringColor: p?.ringOptions?.color ?? DEFAULTS.ringColor,
        icon: p?.ringOptions?.icon !== false,
    }
}

/**
 * Blur Reveal — the frame holds a blurred image, and a lens following the
 * pointer uncovers the sharp one underneath it.
 *
 * On first paint the lens opens from the whole frame and closes down to its
 * set size as the blur ramps in, then hands over to the pointer.
 */
export default function BlurReveal(props: BlurRevealProps) {
    const {
        image,
        size = DEFAULTS.size,
        rounding = DEFAULTS.rounding,
        blur = DEFAULTS.blur,
        intro = DEFAULTS.intro,
        introDuration = DEFAULTS.introDuration,
        ring = DEFAULTS.ring,
        ringOptions = { color: DEFAULTS.ringColor, icon: DEFAULTS.icon },
        style,
    } = props

    const rootRef = useRef<HTMLDivElement | null>(null)
    const blurRef = useRef<HTMLDivElement | null>(null)
    const lensRef = useRef<HTMLDivElement | null>(null)
    const sharpRef = useRef<HTMLDivElement | null>(null)
    const iconRef = useRef<HTMLDivElement | null>(null)

    // Live props for the render loop — the loop starts once and reads the
    // newest values through this ref instead of restarting on every edit.
    const propsRef = useRef(props)
    propsRef.current = props

    const src = imageURL(image) || FALLBACK_IMG
    const S = settingsFor(props)

    useEffect(() => {
        if (
            !rootRef.current ||
            !blurRef.current ||
            !lensRef.current ||
            !sharpRef.current
        )
            return
        const root = rootRef.current!
        const blur = blurRef.current!
        const lens = lensRef.current!
        const sharp = sharpRef.current!

        let W = 0
        let H = 0
        // Lens centre, in frame pixels. Both the spring's position and its
        // target start at the middle so nothing snaps on the first frame.
        let x = 0
        let y = 0
        let tx = 0
        let ty = 0
        let interacted = false

        // Drawn size of the lens. During the intro it is the animated value;
        // afterwards it tracks the panel.
        let size = settingsFor(propsRef.current).size

        function paint(currentSize: number, currentBlur: number) {
            const L = settingsFor(propsRef.current)
            const half = currentSize / 2
            const left = x - half
            const top = y - half

            blur.style.filter = `blur(${currentBlur}px)`

            lens.style.width = `${currentSize}px`
            lens.style.height = `${currentSize}px`
            lens.style.transform = `translate3d(${left}px, ${top}px, 0)`
            lens.style.borderRadius = `${L.radius}px`
            lens.style.border = L.ring ? `1px solid ${L.ringColor}` : "none"

            // The sharp copy is laid out at frame size and pushed back by the
            // lens offset, so it stays registered with the blurred layer
            // underneath however the lens moves.
            sharp.style.width = `${W}px`
            sharp.style.height = `${H}px`
            sharp.style.transform = `translate3d(${-left}px, ${-top}px, 0)`

            if (iconRef.current) {
                iconRef.current.style.opacity = L.ring && L.icon ? "1" : "0"
            }
        }

        function measure() {
            const r = root.getBoundingClientRect()
            if (!r.width || !r.height) return
            const centred = !interacted
            W = r.width
            H = r.height
            if (centred) {
                x = tx = W / 2
                y = ty = H / 2
            }
        }

        measure()

        const ro = new ResizeObserver(() => {
            measure()
        })
        ro.observe(root)

        const onMove = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            interacted = true
            tx = e.clientX - r.left
            ty = e.clientY - r.top
        }
        // Off the frame the lens returns to the middle rather than sticking to
        // the last edge the pointer crossed.
        const onLeave = () => {
            tx = W / 2
            ty = H / 2
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)

        const introSettings = settingsFor(propsRef.current)
        let elapsed = 0
        const introFor = introSettings.intro ? introSettings.introDuration : 0
        // The lens opens wider than the diagonal, so the frame reads as fully
        // sharp before it closes down.
        const introFrom = Math.max(W, H) * 2

        let raf = 0
        let last = performance.now()
        function loop(now: number) {
            // Clamped so a backgrounded tab does not resolve the whole intro on
            // the first frame after it resumes.
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const L = settingsFor(propsRef.current)

            elapsed += dt
            const t = introFor > 0 ? Math.min(1, elapsed / introFor) : 1
            const e = easeInOut(t)
            size = introFrom + (L.size - introFrom) * e
            const blurNow = L.blur * e

            // The lens sits exactly on the pointer — no lag, no trailing.
            x = tx
            y = ty

            paint(size, blurNow)
            if (iconRef.current && introFor > 0) {
                iconRef.current.style.opacity =
                    L.ring && L.icon ? String(e) : "0"
            }
            raf = window.requestAnimationFrame(loop)
        }
        raf = window.requestAnimationFrame(loop)

        return () => {
            window.cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
        }
        // Only a new image or a new intro restarts the loop; every other panel
        // edit is picked up live through propsRef.
    }, [src, S.intro, S.introDuration])

    const layer = {
        position: "absolute" as const,
        top: 0,
        left: 0,
        backgroundImage: `url(${src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        pointerEvents: "none" as const,
    }

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                ...(style || {}),
            }}
            role="img"
            aria-label={image?.alt || "Blur reveal"}
        >
            <div
                ref={blurRef}
                style={{
                    ...layer,
                    width: `${BLUR_OVERSCAN * 100}%`,
                    height: `${BLUR_OVERSCAN * 100}%`,
                    // Centred so the overscan spills evenly off all four edges.
                    marginLeft: `${((1 - BLUR_OVERSCAN) / 2) * 100}%`,
                    marginTop: `${((1 - BLUR_OVERSCAN) / 2) * 100}%`,
                    filter: `blur(${S.blur}px)`,
                }}
            />
            <div
                ref={lensRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: S.size,
                    height: S.size,
                    borderRadius: S.radius,
                    border: S.ring ? `1px solid ${S.ringColor}` : "none",
                    overflow: "hidden",
                    boxSizing: "border-box",
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div ref={sharpRef} style={layer} />
                <div
                    ref={iconRef}
                    style={{
                        position: "relative",
                        opacity: S.ring && S.icon ? 1 : 0,
                        pointerEvents: "none",
                    }}
                    aria-hidden="true"
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={S.ringColor}
                        strokeWidth="1"
                        strokeLinecap="round"
                        focusable="false"
                    >
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </div>
            </div>
        </div>
    )
}
