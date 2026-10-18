const RenderTarget = {
    current: () => "preview",
    canvas: "canvas",
    export: "export",
    thumbnail: "thumbnail",
    preview: "preview",
}
import { useEffect, useRef, useState } from "react"

/**
 * ASCII Waves
 * A field of ASCII characters animated by layered pseudo-noise, with optional cursor interaction.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 */
function __BaseImpl_ASCIIWaves(props) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        characters,
        elementSize,
        color,
        direction,
        background,
        invert,
        waveTension,
        speed,
        noiseScale,
        intensity,
        hasCursorInteraction,
        interactionIntensity,
        interactionRadius,
        fontWeight,
        style,
    } = props

    const containerRef = useRef(null)
    const canvasRef = useRef(null)
    const rafRef = useRef(0)
    const startRef = useRef(performance.now())
    const pointerRef = useRef({ x: -9999, y: -9999, active: false })
    const [size, setSize] = useState({ w: 0, h: 0 })
    // Freeze ONLY on true static renders (export / thumbnail). The Framer
    // canvas and Preview run the live rAF loop so the waves animate while
    // editing. Gating on useIsStaticRenderer() (true on canvas) is what
    // previously froze it to a single frame.
    const renderTarget = RenderTarget.current()
    const isStatic =
        renderTarget === RenderTarget.export ||
        renderTarget === RenderTarget.thumbnail

    const rampArr = (
        characters && characters.length > 0 ? characters : " .:-+*=%@#"
    )
        .split("")
        [invert ? "reverse" : "slice"]()
        .join("")

    useEffect(() => {
        if (!containerRef.current) return
        const el = containerRef.current
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const cr = entry.contentRect
                setSize({
                    w: Math.max(1, Math.floor(cr.width)),
                    h: Math.max(1, Math.floor(cr.height)),
                })
            }
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    useEffect(() => {
        if (!hasCursorInteraction || isStatic) return
        const el = containerRef.current
        if (!el) return
        const onMove = (e) => {
            const rect = el.getBoundingClientRect()
            pointerRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                active: true,
            }
        }
        const onLeave = () => {
            pointerRef.current.active = false
        }
        el.addEventListener("pointermove", onMove)
        el.addEventListener("pointerleave", onLeave)
        return () => {
            el.removeEventListener("pointermove", onMove)
            el.removeEventListener("pointerleave", onLeave)
        }
    }, [hasCursorInteraction, isStatic])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const dpr = Math.max(
            1,
            Math.min(
                2,
                typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
            )
        )
        const { w, h } = size
        if (w === 0 || h === 0) return

        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
        ctx.scale(dpr, dpr)

        // Rescaled props divided back to their original fractional ranges:
        //   speed            slider/20  (slider 0–100, internal 0–5)
        //   waveTension      slider/10  (slider 1–20,  internal 0.1–2)
        //   noiseScale       slider/100 (slider 1–50,  internal 0.01–0.5)
        //   intensity        slider/10  (slider 1–30,  internal 0.1–3)
        //   interactionIntensity slider/10 (slider 0–50, internal 0–5)
        const speedVal = speed / 20
        const tensionVal = waveTension / 10
        // Twist is fixed (former Twist control default 10 → 0.1).
        const twistVal = 0.1
        const scaleVal = noiseScale / 100
        const intensityVal = intensity / 10
        const cursorForceVal = interactionIntensity / 10

        // Directional drift: shift noise sampling over time so waves travel.
        const driftMap = {
            left: [1, 0],
            right: [-1, 0],
            top: [0, 1],
            bottom: [0, -1],
        }
        const [driftX, driftY] =
            driftMap[direction as keyof typeof driftMap] || driftMap.left
        // Translation per second. Dominates the slow in-place morph below
        // so the pattern visibly travels in the chosen direction.
        const driftRate = 1.5

        const cell = Math.max(4, elementSize)
        const colStep = cell * 0.6
        const cols = Math.ceil(w / colStep) + 1
        const rows = Math.ceil(h / cell) + 1

        ctx.font = `${fontWeight} ${cell}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`
        ctx.textBaseline = "top"
        ctx.textAlign = "left"

        const noise = (x, y, t) => {
            const a = Math.sin(x * 1.3 + t) * Math.cos(y * 1.1 - t * 0.7)
            const b = Math.sin((x + y) * 0.7 + t * 0.5)
            const c = Math.sin(x * 0.4 - y * 0.6 + t * 0.3)
            return (a + b + c) / 3
        }

        const rampMax = rampArr.length - 1

        const draw = (now) => {
            const t = ((now - startRef.current) / 1000) * speedVal
            ctx.fillStyle = background
            ctx.fillRect(0, 0, w, h)
            ctx.fillStyle = color

            const p = pointerRef.current

            for (let j = 0; j < rows; j++) {
                for (let i = 0; i < cols; i++) {
                    const px = i * colStep
                    const py = j * cell
                    const ox = t * driftRate * driftX
                    const oy = t * driftRate * driftY
                    const nx =
                        i * scaleVal + ox + Math.sin((j + t) * twistVal) * 2
                    const ny =
                        j * scaleVal + oy + Math.cos((i + t) * twistVal) * 2
                    // Full wave churn + directional travel from ox/oy.
                    let v = noise(nx, ny, t * tensionVal)

                    if (hasCursorInteraction && p.active) {
                        const dx = px - p.x
                        const dy = py - p.y
                        const d = Math.sqrt(dx * dx + dy * dy)
                        if (d < interactionRadius) {
                            const falloff = 1 - d / interactionRadius
                            v +=
                                Math.sin(d * 0.08 - t * 4) *
                                falloff *
                                cursorForceVal
                        }
                    }

                    const norm = Math.max(
                        0,
                        Math.min(1, (v * intensityVal + 1) / 2)
                    )
                    const ch = rampArr.charAt(Math.round(norm * rampMax))
                    if (ch !== " ") ctx.fillText(ch, px, py)
                }
            }
        }

        if (isStatic) {
            draw(startRef.current + 1000)
            return
        }

        const loop = (now) => {
            draw(now)
            rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(rafRef.current)
    }, [
        size,
        elementSize,
        color,
        direction,
        background,
        rampArr,
        waveTension,
        speed,
        noiseScale,
        intensity,
        hasCursorInteraction,
        interactionIntensity,
        interactionRadius,
        fontWeight,
        isStatic,
    ])

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                overflow: "hidden",
                background,
                width: "100%",
                height: "100%",
            }}
        >
            <canvas ref={canvasRef} style={{ display: "block" }} />
        </div>
    )
}

const COMPONENT_DEFAULTS = {
    characters: " .:-+*=%@#",
    elementSize: 16,
    color: "#ffffff",
    direction: "left",
    background: "#000000",
    invert: false,
    fontWeight: "400",
    speed: 20,
    waveTension: 5,
    noiseScale: 12,
    intensity: 10,
    hasCursorInteraction: true,
    interactionIntensity: 15,
    interactionRadius: 160,
}

const __presetProps = {
  "color": "#ffffff",
  "speed": 20,
  "direction": "left",
  "intensity": 10,
  "characters": " °•◦○◉●",
  "fontWeight": "400",
  "noiseScale": 12,
  "elementSize": 16,
  "waveTension": 5,
  "interactionRadius": 160,
  "hasCursorInteraction": true,
  "interactionIntensity": 15
};

export default function ASCIIWaves(props: Record<string, unknown>) {
  return <__BaseImpl_ASCIIWaves {...(__presetProps as Record<string, unknown>)} {...props} />;
}
