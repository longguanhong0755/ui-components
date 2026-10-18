import { useRef, useEffect, useCallback, type CSSProperties } from "react"
const useIsStaticRenderer = () => false

// Extract "r,g,b" from a hex or rgb(a) color string (alpha ignored).
function toRGB(c?: string): string {
    if (!c) return "0,0,0"
    const s = c.trim()
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(",").map((x) => x.trim())
        return `${p[0]},${p[1]},${p[2]}`
    }
    let h = s.replace("#", "")
    if (h.length === 3)
        h = h
            .split("")
            .map((x) => x + x)
            .join("")
    if (h.length >= 6) {
        return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`
    }
    return "0,0,0"
}

interface MobileHapticsProps {
    width?: number | string
    height?: number | string
    label?: string
    paddingX?: number
    paddingY?: number
    emojis?: string
    burstCount?: number
    power?: number
    spread?: number
    gravity?: number
    emojiSize?: number
    objectColor?: string
    textColor?: string
    radius?: number
    shakeIntensity?: number
    shadowEnabled?: boolean
    shadowIntensity?: number
    shadowOpacity?: number
    shadowColor?: string
    autoBurst?: boolean
    autoBurstInterval?: number
    font?: CSSProperties
    style?: CSSProperties
}

interface Particle {
    el: HTMLSpanElement
    x: number
    y: number
    vx: number
    vy: number
    rot: number
    vrot: number
    size: number
    bounces: number
    life: number
}

/**
 * Mobile Haptics
 *
 * Nudge the element — random emojis burst out and fly off freely under
 * gravity (no walls). The button shakes on tap.
 *
 * @framerIntrinsicWidth 360
 * @framerIntrinsicHeight 360
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
function __BaseImpl_MobileHaptics(props: MobileHapticsProps) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        label = "Click Here",
        paddingX = 24,
        paddingY = 18,
        emojis = "🎉,✨,😄,🔥,💥,⭐,💖,🤩,👍,🥳,🎊,😎",
        burstCount = 16,
        power = 12,
        spread = 55,
        gravity = 4,
        emojiSize = 20,
        objectColor = "#FFFFFF",
        textColor = "#111111",
        radius = 0,
        shakeIntensity = 0,
        shadowEnabled = false,
        shadowIntensity = 5,
        shadowOpacity = 50,
        shadowColor = "rgba(0,0,0,0.25)",
        autoBurst = true,
        autoBurstInterval = 2.2,
        font,
        style,
    } = props

    // Gravity 1–10 → physics value.
    const gravityVal = gravity * 0.15
    // Radius 0–20 → px: 0 boxy, 20 fully rounded (pill). 30 ≥ half a normal
    // button's height, so the browser clamps it to a pill.
    const radiusPx = (Math.max(0, Math.min(20, radius)) / 20) * 30

    const isStatic = useIsStaticRenderer()

    const containerRef = useRef<HTMLDivElement | null>(null)
    const layerRef = useRef<HTMLDivElement | null>(null)
    const objectRef = useRef<HTMLButtonElement | null>(null)
    const particlesRef = useRef<Particle[]>([])
    const rafRef = useRef<number>(0)
    const lastTsRef = useRef<number>(0)

    // Keep the latest config in a ref so rAF/burst closures never read stale props.
    const cfgRef = useRef({
        emojis,
        burstCount,
        power,
        spread,
        gravity: gravityVal,
        emojiSize,
        shakeIntensity,
    })
    cfgRef.current = {
        emojis,
        burstCount,
        power,
        spread,
        gravity: gravityVal,
        emojiSize,
        shakeIntensity,
    }

    const step = useCallback((ts: number) => {
        const cont = containerRef.current
        const arr = particlesRef.current
        const cfg = cfgRef.current
        if (!cont) {
            rafRef.current = 0
            return
        }
        let dt = lastTsRef.current ? (ts - lastTsRef.current) / 16.6667 : 1
        lastTsRef.current = ts
        if (dt > 3) dt = 3
        const H = cont.clientHeight
        const W = cont.clientWidth
        for (let i = arr.length - 1; i >= 0; i--) {
            const p = arr[i]
            p.vy += cfg.gravity * dt
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.rot += p.vrot * dt
            // No walls/floor — particles fly out freely.
            p.life -= dt
            if (
                p.life <= 0 ||
                p.y > H + p.size * 2.5 ||
                p.x < -p.size * 3 ||
                p.x > W + p.size * 3
            ) {
                p.el.remove()
                arr.splice(i, 1)
                continue
            }
            const fade = p.life < 22 ? Math.max(0, p.life / 22) : 1
            p.el.style.opacity = String(fade)
            p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`
        }
        if (arr.length > 0) {
            rafRef.current = requestAnimationFrame(step)
        } else {
            rafRef.current = 0
            lastTsRef.current = 0
        }
    }, [])

    const burst = useCallback(() => {
        if (typeof window === "undefined") return
        const cont = containerRef.current
        const layer = layerRef.current
        const obj = objectRef.current
        if (!cont || !layer) return
        const cfg = cfgRef.current

        const list = cfg.emojis
            .split(/[,\s]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        const safe = list.length ? list : ["🎉"]

        // Origin = centre of the nudged object, relative to the container.
        let ox = cont.clientWidth / 2
        let oy = cont.clientHeight / 2
        if (obj) {
            const cr = cont.getBoundingClientRect()
            const or = obj.getBoundingClientRect()
            ox = or.left - cr.left + or.width / 2
            oy = or.top - cr.top + or.height / 2
        }

        // The "nudge": quick shake of the object + a real device vibration.
        if (obj && typeof obj.animate === "function") {
            const s = cfg.shakeIntensity
            obj.animate(
                [
                    { transform: "translate(0px, 0px) rotate(0deg)" },
                    {
                        transform: `translate(${s}px, ${-s * 0.6}px) rotate(-2.5deg)`,
                    },
                    {
                        transform: `translate(${-s}px, ${s * 0.3}px) rotate(2.5deg)`,
                    },
                    { transform: `translate(${s * 0.5}px, 0px) rotate(-1deg)` },
                    { transform: "translate(0px, 0px) rotate(0deg)" },
                ],
                { duration: 260, easing: "cubic-bezier(.36,.07,.19,.97)" }
            )
        }
        const arr = particlesRef.current
        const MAX = 140
        const size = cfg.emojiSize
        for (let k = 0; k < cfg.burstCount; k++) {
            if (arr.length >= MAX) break
            const el = document.createElement("span")
            el.textContent = safe[(Math.random() * safe.length) | 0]
            el.style.position = "absolute"
            el.style.left = "0px"
            el.style.top = "0px"
            el.style.fontSize = `${size}px`
            el.style.lineHeight = "1"
            el.style.willChange = "transform, opacity"
            el.style.pointerEvents = "none"
            el.style.userSelect = "none"
            el.setAttribute("aria-hidden", "true")
            layer.appendChild(el)
            // Angle biased straight up (-90°) with random left/right spread.
            const ang =
                ((-90 + (Math.random() * 2 - 1) * cfg.spread) * Math.PI) / 180
            const speed = cfg.power * (0.65 + Math.random() * 0.8)
            arr.push({
                el,
                x: ox - size / 2,
                y: oy - size / 2,
                vx: Math.cos(ang) * speed,
                vy: Math.sin(ang) * speed,
                rot: Math.random() * 360,
                vrot: (Math.random() * 2 - 1) * 14,
                size,
                bounces: 2,
                life: 260,
            })
        }
        if (!rafRef.current) {
            lastTsRef.current = 0
            rafRef.current = requestAnimationFrame(step)
        }
    }, [step])

    // Optional auto-burst loop for demos / showcase pages.
    useEffect(() => {
        if (isStatic || !autoBurst) return
        const ms = Math.max(0.3, autoBurstInterval) * 1000
        const id = window.setInterval(() => burst(), ms)
        return () => window.clearInterval(id)
    }, [isStatic, autoBurst, autoBurstInterval, burst])

    // Cleanup on unmount.
    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            for (const p of particlesRef.current) p.el.remove()
            particlesRef.current = []
        }
    }, [])

    const isFullWidth = style?.width === "100%"
    const isFullHeight = style?.height === "100%"

    const objectStyle: CSSProperties = {
        position: "relative",
        zIndex: 2,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: `${paddingY}px ${paddingX}px`,
        border: "none",
        borderRadius: radiusPx,
        background: objectColor,
        color: textColor,
        cursor: "pointer",
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
        boxShadow: shadowEnabled
            ? `0px ${shadowIntensity * 1.5}px ${shadowIntensity * 2}px rgba(${toRGB(shadowColor)}, ${(Math.max(0, Math.min(100, shadowOpacity)) / 100).toFixed(2)})`
            : "none",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        ...(font || {}),
    }

    const containerStyle: CSSProperties = {
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: isFullWidth ? undefined : 200,
        minHeight: isFullHeight ? undefined : 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        ...style,
    }

    // Static canvas/export preview: pose a few emojis arcing above a resting object.
    if (isStatic) {
        const posed = emojis
            .split(/[,\s]+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 5)
        return (
            <div ref={containerRef} style={containerStyle}>
                {posed.map((em, i) => {
                    const t = posed.length > 1 ? i / (posed.length - 1) : 0.5
                    const angle = (-145 + t * 110) * (Math.PI / 180)
                    const r = 96
                    return (
                        <span
                            key={i}
                            aria-hidden="true"
                            style={{
                                position: "absolute",
                                left: "50%",
                                top: "50%",
                                fontSize: emojiSize,
                                lineHeight: 1,
                                transform: `translate(-50%, -50%) translate(${
                                    Math.cos(angle) * r
                                }px, ${Math.sin(angle) * r - 30}px) rotate(${
                                    (t - 0.5) * 44
                                }deg)`,
                            }}
                        >
                            {em}
                        </span>
                    )
                })}
                <div style={objectStyle}>{label}</div>
            </div>
        )
    }

    return (
        <div ref={containerRef} style={containerStyle}>
            <div
                ref={layerRef}
                aria-hidden="true"
                style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 3,
                    pointerEvents: "none",
                }}
            />
            <button
                ref={objectRef}
                type="button"
                onPointerDown={burst}
                aria-label={label}
                style={objectStyle}
            >
                {label}
            </button>
        </div>
    )
}

const COMPONENT_DEFAULTS = {
    label: "Click Here",
    paddingX: 24,
    paddingY: 18,
    objectColor: "#FFFFFF",
    textColor: "#111111",
    radius: 0,
    shakeIntensity: 0,
    shadowEnabled: false,
    shadowIntensity: 5,
    shadowOpacity: 50,
    shadowColor: "rgba(0,0,0,0.25)",
    font: {
        variant: "Bold",
        fontSize: "20px",
        letterSpacing: "-0.01em",
        lineHeight: "1em",
    },
    emojis: "🎉,✨,😄,🔥,💥,⭐,💖,🤩,👍,🥳,🎊,😎",
    emojiSize: 20,
    burstCount: 16,
    power: 12,
    spread: 55,
    gravity: 4,
    autoBurst: true,
    autoBurstInterval: 2.2,
}

const __presetProps = {
  "font": {
    "variant": "Bold",
    "fontSize": "20px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 700,
    "lineHeight": "1em",
    "letterSpacing": "-0.01em"
  },
  "label": "Click Me",
  "power": 16,
  "emojis": "⚽️ 🏀 🏈 ⚾️ 🎾 🏐 🏉 ",
  "radius": 20,
  "spread": 20,
  "gravity": 4,
  "paddingX": 48,
  "paddingY": 24,
  "autoBurst": true,
  "emojiSize": 24,
  "textColor": "#111111",
  "burstCount": 40,
  "objectColor": "#FFFFFF",
  "shadowColor": "rgba(0,0,0,0.25)",
  "shadowEnabled": false,
  "shadowOpacity": 50,
  "shakeIntensity": 0,
  "shadowIntensity": 5,
  "autoBurstInterval": 2.2
};

export default function MobileHaptics(props: Record<string, unknown>) {
  return <__BaseImpl_MobileHaptics {...(__presetProps as Record<string, unknown>)} {...props} />;
}
