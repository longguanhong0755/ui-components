"use client"

import * as React from "react"
import { useEffect, useLayoutEffect, useRef } from "react"

/**
 * DemandOrbit — a bundle of thin rings that fans from a full circle down to a
 * narrow tilted ellipse, spinning in 3D about one shared diagonal axis, with a
 * question card and an answer card laid over it.
 *
 * GEOMETRY. Every ring is a 3D circle rotated about the same in-plane axis
 * (AXIS_DEG clockwise from vertical). Its projection is an ellipse whose major
 * semi-axis is the radius (along the axis) and whose minor is R·|cos φ|. Ring
 * `t` (0 outer … 1 inner) sits at φ = spin + Spread·t, shrinks from R_OUTER to
 * R_INNER, and drifts its centre along the axis — which is what makes the
 * bundle pinch at the upper right and lower left. `spin = 0` is the reference
 * frame: outer ring a circle, inner ring the narrow ellipse.
 *
 * MOTION. One raw rAF loop (ticks on the Framer canvas as well as preview —
 * rule 5/6) writes `rx` straight to each <ellipse>; React renders the rings
 * once per ring count. The loop also plays the intro: rings fade in
 * outer→inner, then the question card, then the answer card, each rising 16px.
 * The intro is written from a layout effect, so an export / static render that
 * never runs JS shows the finished frame.
 *
 * Everything lives on a 1100×800 design stage scaled to fit the host
 * (offsetWidth/offsetHeight via ResizeObserver, never getBoundingClientRect).
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */

type FontValue = React.CSSProperties & { variant?: string }

type Props = {
    background?: string
    lineColor?: string
    rings?: number
    size?: number
    speed?: number
    spread?: number
    textColor?: string
    dragSensitivity?: number
    style?: React.CSSProperties
}

// Design stage — the reference frame's coordinate space.
const STAGE_W = 1100
const STAGE_H = 800
const AXIS_DEG = 24.7
const R_OUTER = 343
const R_INNER = 284
const C_OUTER = { x: 546, y: 384 }
const C_INNER = { x: 565, y: 355 }

// Speed 50 = one full turn every 20 s.
const DEG_PER_SEC_AT_50 = 18
// Hover speeds the spin up — a cheap, always-safe way to show the bundle responds to the pointer.
const HOVER_SPEED_MULT = 1.8
// Drag maps horizontal pointer travel straight to spin, at `dragSensitivity`'s max.
const DRAG_DEG_PER_PX = 0.6

// Frozen design constants (not dials).
const LINE_WIDTH = 1 // was the `Line Width` dial; cut to make room for `Size` (15-leaf cap)
const CARD_FILL = "#FFFFFF"
const CARD_BORDER = "rgba(20, 24, 40, 0.09)"
const CARD_SHADOW = "0 1px 2px rgba(20,24,40,0.04), 0 8px 24px rgba(20,24,40,0.05)"
const CARD_RADIUS = 12
const MUTED_OPACITY = 0.68
const INTRO_RING_DELAY = 0.1
const INTRO_RING_STAGGER = 0.035
const INTRO_RING_DUR = 0.5
const INTRO_Q_DELAY = 0.5
const INTRO_A_DELAY = 1.05
const INTRO_CARD_DUR = 0.8
const INTRO_RISE = 16

const QUESTION_FONT: FontValue = {
    fontSize: "22px",
    letterSpacing: "-0.02em",
    lineHeight: "1.2em",
}
const LABEL_FONT: FontValue = {
    fontSize: "14px",
    letterSpacing: "0.12em",
    lineHeight: "1.2em",
}
const TITLE_FONT: FontValue = {
    fontSize: "31px",
    letterSpacing: "-0.03em",
    lineHeight: "1.15em",
}
const SUBTITLE_FONT: FontValue = {
    fontSize: "15px",
    letterSpacing: "-0.01em",
    lineHeight: "1.3em",
}

// Fallback stacks until a font is picked (the Font control's value carries its own family).
const SERIF = 'Georgia, "Times New Roman", serif'
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace'
const SANS = 'Inter, system-ui, -apple-system, sans-serif'

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOut = (v: number) => 1 - Math.pow(1 - v, 3)

function ringGeom(i: number, n: number) {
    const t = n > 1 ? i / (n - 1) : 0
    return {
        t,
        r: R_OUTER + (R_INNER - R_OUTER) * t,
        cx: C_OUTER.x + (C_INNER.x - C_OUTER.x) * t,
        cy: C_OUTER.y + (C_INNER.y - C_OUTER.y) * t,
    }
}

export default function DemandOrbit(props: Props) {
    const {
        background = "#000000",
        lineColor = "#FFFFFF",
        rings = 24,
        size = 74,
        speed = 50,
        spread = 68,
        textColor = "#16171A",
        dragSensitivity = 50,
        style,
    } = props

    const n = Math.max(1, Math.round(rings))

    const rootRef = useRef<HTMLDivElement>(null)
    const stageRef = useRef<HTMLDivElement>(null)
    const ringEls = useRef<(SVGEllipseElement | null)[]>([])
    ringEls.current.length = n

    // Live inputs for the loop — never effect deps.
    const live = useRef({ speed, spread, n, dragSensitivity })
    live.current = { speed, spread, n, dragSensitivity }

    // Current spin angle, readable outside the rAF loop (drag needs it on pointerdown).
    const spinRef = useRef(0)
    const hoverRef = useRef(false)
    const dragRef = useRef({ active: false, startX: 0, startSpin: 0 })

    // Fit the stage to the host.
    useLayoutEffect(() => {
        const root = rootRef.current
        const stage = stageRef.current
        if (!root || !stage) return
        const fit = () => {
            const w = root.offsetWidth
            const h = root.offsetHeight
            if (!w || !h) return
            const s = Math.min(w / STAGE_W, h / STAGE_H)
            stage.style.transform = `translate(-50%, -50%) scale(${s})`
        }
        fit()
        const ro = new ResizeObserver(fit)
        ro.observe(root)
        return () => ro.disconnect()
    }, [])

    // Hide the intro targets before first paint; the loop brings them in.
    useLayoutEffect(() => {
        for (const el of ringEls.current) el?.setAttribute("stroke-opacity", "0")
    }, [])

    // Hover (speed boost) and drag (manual spin) — bound on the root and window
    // so a release outside the component still ends the drag (rule: gesture
    // releases bind on window).
    useEffect(() => {
        const root = rootRef.current
        if (!root) return
        const onEnter = () => {
            hoverRef.current = true
        }
        const onLeave = () => {
            hoverRef.current = false
        }
        const onDown = (e: PointerEvent) => {
            dragRef.current = { active: true, startX: e.clientX, startSpin: spinRef.current }
        }
        const onMove = (e: PointerEvent) => {
            if (!dragRef.current.active) return
            const { dragSensitivity: ds } = live.current
            const degPerPx = (ds / 100) * DRAG_DEG_PER_PX
            spinRef.current =
                (dragRef.current.startSpin + (e.clientX - dragRef.current.startX) * degPerPx) % 360
        }
        const onUp = () => {
            dragRef.current.active = false
        }
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)
        return () => {
            root.removeEventListener("pointerenter", onEnter)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    useEffect(() => {
        let raf = 0
        let start = -1
        let last = -1
        let introDone = false

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            if (start < 0) start = last = now
            const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
            last = now
            const el = (now - start) / 1000
            const { speed: sp, spread: spr, n: count } = live.current

            if (!dragRef.current.active) {
                const mult = hoverRef.current ? HOVER_SPEED_MULT : 1
                spinRef.current = (spinRef.current + (sp / 50) * DEG_PER_SEC_AT_50 * mult * dt) % 360
            }
            const spin = spinRef.current

            const els = ringEls.current
            for (let i = 0; i < count; i++) {
                const node = els[i]
                if (!node) continue
                const { t, r } = ringGeom(i, count)
                const phi = ((spin + spr * t) * Math.PI) / 180
                node.setAttribute("rx", (r * Math.abs(Math.cos(phi))).toFixed(2))
                if (!introDone) {
                    const k = clamp01(
                        (el - INTRO_RING_DELAY - i * INTRO_RING_STAGGER) /
                            INTRO_RING_DUR
                    )
                    node.setAttribute("stroke-opacity", easeOut(k).toFixed(3))
                }
            }

            if (!introDone) {
                const ringsEnd =
                    INTRO_RING_DELAY + count * INTRO_RING_STAGGER + INTRO_RING_DUR
                if (el > ringsEnd) {
                    introDone = true
                    for (const node of els) node?.setAttribute("stroke-opacity", "1")
                }
            }
        }
        raf = requestAnimationFrame(frame)
        return () => cancelAnimationFrame(raf)
    }, [])

    // First render: reference-frame geometry (spin 0), so a static render is right.
    const ellipses = []
    for (let i = 0; i < n; i++) {
        const { t, r, cx, cy } = ringGeom(i, n)
        const rx = +(r * Math.abs(Math.cos((spread * t * Math.PI) / 180))).toFixed(2)
        ellipses.push(
            <ellipse
                key={i}
                ref={(node) => {
                    ringEls.current[i] = node
                }}
                cx={cx}
                cy={cy}
                rx={rx}
                ry={r}
                transform={`rotate(${AXIS_DEG} ${cx} ${cy})`}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
                vectorEffect="non-scaling-stroke"
            />
        )
    }

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                ...style,
                background,
                overflow: "hidden",
            }}
        >
            <div
                ref={stageRef}
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: STAGE_W,
                    height: STAGE_H,
                    transform: "translate(-50%, -50%)",
                    transformOrigin: "50% 50%",
                }}
            >
                <svg
                    width={STAGE_W}
                    height={STAGE_H}
                    viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
                    style={{ position: "absolute", inset: 0, overflow: "visible" }}
                    aria-hidden="true"
                >
                    {/* Size scales the bundle about the outer ring's centre; strokes stay LINE_WIDTH px. */}
                    <g
                        transform={`translate(${C_OUTER.x} ${C_OUTER.y}) scale(${
                            size / 100
                        }) translate(${-C_OUTER.x} ${-C_OUTER.y})`}
                    >
                        {ellipses}
                    </g>
                </svg>
            </div>
        </div>
    )
}
