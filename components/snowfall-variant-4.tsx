import { useRef, useEffect, type CSSProperties } from "react"

interface SnowfallProps {
    count?: number
    speedMin?: number
    speedMax?: number
    wind?: number
    windVariation?: number
    sizeMin?: number
    sizeMax?: number
    opacityMin?: number
    opacityMax?: number
    direction?: "down" | "up"
    color?: string
    style?: CSSProperties
}

interface Flake {
    x: number
    y: number
    r: number
    vy: number
    vx: number
    phase: number
    sway: number
    alpha: number
}

/**
 * Snowfall
 *
 * A customizable canvas snowfall: density, randomized per-flake speed and size
 * (within min/max ranges), per-flake wind drift, opacity, fall direction and
 * colour. Always live.
 *
 * @framerIntrinsicWidth 700
 * @framerIntrinsicHeight 440
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
function __BaseImpl_Snowfall(props: SnowfallProps) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        count = 632,
        speedMin = 0.8,
        speedMax = 2.7,
        wind = -1,
        windVariation = 0,
        sizeMin = 2,
        sizeMax = 2.5,
        opacityMin = 30,
        opacityMax = 90,
        direction = "down",
        color = "#ffffff",
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    // Live config read by the loop so tweaks don't re-scatter the snow.
    const cfg = useRef({ color, wind, windVariation })
    cfg.current = { color, wind, windVariation }

    useEffect(() => {
        if (typeof window === "undefined") return
        const canvas = canvasRef.current
        const cont = containerRef.current
        if (!canvas || !cont) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const cv: HTMLCanvasElement = canvas
        const box: HTMLDivElement = cont
        const g: CanvasRenderingContext2D = ctx

        let raf = 0
        let W = 0
        let H = 0
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        let flakes: Flake[] = []
        const rand = (a: number, b: number) => a + Math.random() * (b - a)
        const dirSign = direction === "up" ? -1 : 1
        const sLo = Math.min(speedMin, speedMax)
        const sHi = Math.max(speedMin, speedMax)
        const rLo = Math.min(sizeMin, sizeMax)
        const rHi = Math.max(sizeMin, sizeMax)
        const oLo = Math.min(opacityMin, opacityMax) / 100
        const oHi = Math.max(opacityMin, opacityMax) / 100

        function build(entry?: ResizeObserverEntry) {
            // Prefer the observer's contentRect, then layout box, then
            // getBoundingClientRect (which can read 0 on the Framer canvas at
            // setup) so the field fills the frame instead of collapsing to the
            // top-left corner.
            const cr = entry?.contentRect
            const rw =
                cr?.width ||
                box.clientWidth ||
                box.getBoundingClientRect().width
            const rh =
                cr?.height ||
                box.clientHeight ||
                box.getBoundingClientRect().height
            W = Math.max(1, Math.floor(rw) || 1)
            H = Math.max(1, Math.floor(rh) || 1)
            cv.width = Math.floor(W * dpr)
            cv.height = Math.floor(H * dpr)
            cv.style.width = W + "px"
            cv.style.height = H + "px"
            g.setTransform(dpr, 0, 0, dpr, 0, 0)
            const n = Math.max(0, Math.round(count))
            flakes = new Array(n)
            for (let i = 0; i < n; i++) {
                flakes[i] = {
                    x: Math.random() * W,
                    y: Math.random() * H,
                    r: rand(rLo, rHi),
                    vy: rand(sLo, sHi),
                    vx: rand(-1, 1),
                    phase: Math.random() * Math.PI * 2,
                    sway: rand(0.2, 0.9),
                    alpha: rand(oLo, oHi),
                }
            }
        }

        function draw() {
            const { color } = cfg.current
            g.clearRect(0, 0, W, H)
            g.fillStyle = color
            for (let i = 0; i < flakes.length; i++) {
                const f = flakes[i]
                g.globalAlpha = f.alpha
                g.beginPath()
                g.arc(f.x, f.y, f.r, 0, Math.PI * 2)
                g.fill()
            }
            g.globalAlpha = 1
        }

        function loop(t: number) {
            const { wind: wBase, windVariation: wVar } = cfg.current
            for (let i = 0; i < flakes.length; i++) {
                const f = flakes[i]
                f.y += f.vy * dirSign
                f.x +=
                    wBase +
                    f.vx * wVar +
                    Math.sin(t * 0.0012 + f.phase) * f.sway
                if (dirSign > 0 && f.y - f.r > H) {
                    f.y = -f.r
                    f.x = Math.random() * W
                } else if (dirSign < 0 && f.y + f.r < 0) {
                    f.y = H + f.r
                    f.x = Math.random() * W
                }
                if (f.x < -f.r) f.x = W + f.r
                else if (f.x > W + f.r) f.x = -f.r
            }
            draw()
            raf = requestAnimationFrame(loop)
        }

        build()
        draw() // first frame (also the export/thumbnail frame)
        raf = requestAnimationFrame(loop) // always live

        const ro = new ResizeObserver((entries) => {
            build(entries[0])
            draw()
        })
        ro.observe(box)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        count,
        speedMin,
        speedMax,
        sizeMin,
        sizeMax,
        opacityMin,
        opacityMax,
        direction,
    ])

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 80,
                minHeight: 80,
                overflow: "hidden",
                background: "transparent",
                borderRadius: 0,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, display: "block" }}
            />
        </div>
    )
}

const COMPONENT_DEFAULTS = {
    count: 160,
    wind: 0,
    windVariation: 0.8,
    sizeMin: 1,
    sizeMax: 4,
    speedMin: 0.6,
    speedMax: 2.4,
    opacityMin: 30,
    opacityMax: 90,
    direction: "down",
    color: "#ffffff",
}

const __presetProps = {
  "wind": 10,
  "color": "#7FBEFF",
  "count": 1200,
  "sizeMax": 3.5,
  "sizeMin": 0.5,
  "speedMax": 0,
  "speedMin": 1,
  "direction": "up",
  "background": "rgba(0, 0, 0, 0)",
  "opacityMax": 100,
  "opacityMin": 63,
  "windVariation": 5
};

export default function Snowfall(props: Record<string, unknown>) {
  return <__BaseImpl_Snowfall {...(__presetProps as Record<string, unknown>)} {...props} />;
}
