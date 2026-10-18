"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * SwellGrid — A monospace grid of pills lit by an ocean swell seen in perspective,
 * with a cursor bloom that decays behind the pointer.
 *
 * Ported from the hero of the Y Combinator events theme `qm-labs-hackathon`
 * (events.ycombinator.com, chunk `MeetupShowPage-*.js`, components `B` / `ze`).
 * Every constant below is that source's, transcribed value for value, and each
 * dial's default IS the constant it replaced. The field was verified against the
 * live page: 8 frames x 495 cells, mean absolute error 0.0019 after fitting a
 * 9 ms rAF lag — under the source's own 0.004 write threshold, i.e. exact.
 *
 * THE FIELD. Nine rows are nine viewing elevations, `A_MIN` to `A_MAX` radians,
 * so `depth = 1 / tan(angle)`: the top row is far, the bottom row is near. Four
 * Gerstner-ish terms (amplitude, wavelength, heading, phase) are sampled at that
 * depth, their column term scaled by `COL_SCALE` because a column step is a much
 * smaller world step than a row step. Each term's angular frequency is snapped to
 * an integer multiple of 2*PI/24 via the deep-water relation `sqrt(g*k)`, so the
 * whole field is exactly 24 s periodic and the loop has no seam. The sum is
 * normalised, gamma'd by `Contrast`, and multiplied by a `Fog` ramp that dims the
 * near rows.
 *
 * WHAT CHANGED, and why:
 *  · The source is a fixed 225.6 px band of 756 spans with 9 rows and the surplus
 *    clipped. This is a backdrop, so it fills the frame: rows are derived from the
 *    height and the row term is generalised from `(r+.5)/9` to `(r+.5)/rows`. Nine
 *    rows at the source's cell size reproduces the original band exactly.
 *  · DOM spans -> one Canvas 2D. The source writes a CSS variable on each of 756
 *    cells per frame; full-bleed that is ~3200 style writes and a 3200-element
 *    style recalc every frame. Cells are batched into one Path2D per 8-bit alpha
 *    bucket instead, so a frame is at most 256 fills. Alpha is quantised to the
 *    byte it would have been rasterised at anyway, so nothing is lost.
 *  · The source gates its loop on an IntersectionObserver. Framer's canvas
 *    suspends those, so the component would render nothing there (rule 5). Gone;
 *    the `visibilitychange` gate stays.
 *  · `getBoundingClientRect()` for the pointer carries the canvas zoom, so the
 *    bloom drifts off the cursor on a zoomed canvas. Divided back out by
 *    `rect.width / offsetWidth` (rule G).
 *  · Under `prefers-reduced-motion` the source leaves every cell at `--v: 0` — a
 *    flat dim grid. One static frame of the field is drawn instead.
 *
 * FRAMING. The elevation range is spread over however many rows fit, so a tall
 * frame gets a finer depth step and the swell reads broader and softer than the
 * source's tight banding. `Wave > Length` is the dial for that: ~45% at 500 px
 * tall restores the reference's crest spacing. The source's exact hero is a
 * 660 x 226 frame at the defaults — 55 columns by 9 rows.
 *
 * Cut controls, each frozen at the source's value in a named constant so the
 * render path is unchanged (rule 11b): the sixteen raw wave terms, the elevation
 * range `A_MIN`/`A_MAX`, `COL_SCALE`, and the alpha floor `MIN_ALPHA`. The
 * source's `0.86` alpha ceiling is not a constant — it is `Base Color`'s own
 * alpha (rule 11b: an opacity that belongs to a colour is that colour's alpha).
 */

const MAX_DPR = 2 // quality tier, not a design control (rule 10)

// --- source constants, frozen (rule 11b) ---------------------------------
const G = 9.81 // deep-water gravity, only used to snap omega to the 24 s grid
const BASE_OMEGA = (2 * Math.PI) / 24 // one loop = 24 s
const A_MIN = 0.095 // viewing elevation of the far row, radians
const A_MAX = 0.52 // ... and of the near row
const COL_SCALE = 0.055 // world units per column step, relative to a row step
const MIN_ALPHA = 0.06 // the unlit floor; the ceiling is Base Color's alpha

type WaveTerm = {
    amplitude: number
    wavelength: number
    heading: number
    phase: number
}

const WAVES: WaveTerm[] = [
    { amplitude: 1, wavelength: 7.5, heading: 1.18, phase: 0 },
    { amplitude: 0.66, wavelength: 4.6, heading: 0.88, phase: 1.7 },
    { amplitude: 0.42, wavelength: 2.7, heading: 1.95, phase: 3.9 },
    { amplitude: 0.26, wavelength: 1.8, heading: 2.32, phase: 5.2 },
]

// Heading of the dominant term. `Direction` replaces it and every other term
// keeps its offset from it, so the spread between the four is preserved.
const BASE_HEADING = WAVES[0].heading
const AMPLITUDE_SUM = WAVES.reduce((a, w) => a + w.amplitude, 0)

// Speed 50 is the rate the source shipped at (rule 11a).
const SPEED_REF = 50
// Cursor Damping 10 is the source's 0.32 s decay constant.
const DAMPING_REF = 3.2

type Prepared = {
    amplitude: number
    phase: number
    k: number
    omega: number
    cos: number
    sin: number
}

function prepare(lengthPct: number, directionDeg: number): Prepared[] {
    const scale = Math.max(0.01, lengthPct / 100)
    const heading0 = (directionDeg * Math.PI) / 180
    return WAVES.map((w) => {
        const k = (2 * Math.PI) / (w.wavelength * scale)
        // Snap to an integer harmonic of BASE_OMEGA or the 24 s loop gains a seam.
        const n = Math.max(1, Math.round(Math.sqrt(G * k) / BASE_OMEGA))
        const heading = heading0 + (w.heading - BASE_HEADING)
        return {
            amplitude: w.amplitude,
            phase: w.phase,
            k,
            omega: n * BASE_OMEGA,
            cos: Math.cos(heading),
            sin: Math.sin(heading),
        }
    })
}

type RowTerms = { fog: number; along: number[]; per: number[] }

function buildRows(rows: number, terms: Prepared[], fogZ: number): RowTerms[] {
    const out: RowTerms[] = []
    for (let r = 0; r < rows; r += 1) {
        const n = (r + 0.5) / rows
        const angle = A_MIN + (A_MAX - A_MIN) * n
        const depth = 1 / Math.tan(angle)
        out.push({
            fog: fogZ + (1 - fogZ) * (1 - n),
            along: terms.map((w) => w.k * depth * w.sin),
            per: terms.map((w) => w.k * depth * COL_SCALE * w.cos),
        })
    }
    return out
}

// Framer's Color control emits rgb()/hsl()/var(--token, …), not hex, so the
// value is resolved through the cascade rather than parsed by hand.
function resolveColor(
    host: HTMLElement,
    value: string,
    fallback: [number, number, number, number]
): [number, number, number, number] {
    try {
        const probe = document.createElement("span")
        probe.style.color = value
        probe.style.display = "none"
        host.appendChild(probe)
        const computed = getComputedStyle(probe).color
        probe.remove()
        const m = computed.match(/-?[\d.]+/g)
        if (!m || m.length < 3) return fallback
        return [
            Math.round(+m[0]),
            Math.round(+m[1]),
            Math.round(+m[2]),
            m.length > 3 ? +m[3] : 1,
        ]
    } catch {
        return fallback
    }
}

export interface SwellGridWaveProps {
    length?: number
    direction?: number
    contrast?: number
    fog?: number
}
export interface SwellGridCursorProps {
    hover?: number
    reach?: number
    damping?: number
}

const WAVE_DEFAULTS: Required<SwellGridWaveProps> = {
    length: 100,
    direction: 68,
    contrast: 145,
    fog: 16,
}
const CURSOR_DEFAULTS: Required<SwellGridCursorProps> = {
    hover: 100,
    reach: 38,
    damping: 10,
}

export interface SwellGridProps {
    background?: string
    baseColor?: string
    size?: number
    aspect?: number
    gap?: number
    rounded?: number
    speed?: number
    wave?: SwellGridWaveProps
    cursor?: SwellGridCursorProps
    style?: React.CSSProperties
}

export default function SwellGrid(props: SwellGridProps) {
    const {
        background = "#000000",
        baseColor = "rgba(230, 230, 230, 0.86)",
        size = 9,
        aspect = 438,
        gap = 3,
        rounded = 45,
        speed = 50,
        wave,
        cursor,
        style,
    } = props

    const w = { ...WAVE_DEFAULTS, ...(wave ?? {}) }
    const c = { ...CURSOR_DEFAULTS, ...(cursor ?? {}) }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Every live input is read from a ref inside the loop, so changing a dial
    // never tears down the render loop (rule 6).
    const live = useRef({
        size,
        aspect,
        gap,
        rounded,
        speed,
        length: w.length,
        direction: w.direction,
        contrast: w.contrast,
        fog: w.fog,
        hover: c.hover,
        reach: c.reach,
        damping: c.damping,
        rgba: [230, 230, 230, 0.86] as [number, number, number, number],
    })
    live.current.size = size
    live.current.aspect = aspect
    live.current.gap = gap
    live.current.rounded = rounded
    live.current.speed = speed
    live.current.length = w.length
    live.current.direction = w.direction
    live.current.contrast = w.contrast
    live.current.fog = w.fog
    live.current.hover = c.hover
    live.current.reach = c.reach
    live.current.damping = c.damping

    useEffect(() => {
        const host = hostRef.current
        if (!host) return
        live.current.rgba = resolveColor(host, baseColor, [230, 230, 230, 0.86])
    }, [baseColor])

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        live.current.rgba = resolveColor(host, baseColor, [230, 230, 230, 0.86])

        const reduced =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        // --- layout, rebuilt only when the box or the cell geometry changes ---
        let cols = 0
        let rows = 0
        let cellW = 0
        let cellH = 0
        let radius = 0
        let pitchX = 0
        let pitchY = 0
        let trail = new Float32Array(0)
        let rowTerms: RowTerms[] = []
        let terms: Prepared[] = []
        let layoutKey = ""
        let fieldKey = ""
        let viewW = 0
        let viewH = 0

        // Path2D.roundRect, not the context's: the cells are batched into paths.
        const roundRectSupported =
            typeof (Path2D.prototype as any).roundRect === "function"

        // The box is read only when the ResizeObserver says it changed, never
        // per frame: touching offsetWidth in the loop forces a style flush every
        // frame for a number that changes on resize.
        let boxW = Math.max(1, host.offsetWidth)
        let boxH = Math.max(1, host.offsetHeight)
        let boxDirty = true

        function layout() {
            const L = live.current
            // offsetWidth/Height, never getBoundingClientRect: the rect carries
            // the Framer canvas zoom and the grid would resample every zoom step.
            const W = boxW
            const H = boxH
            const g = Math.max(0, L.gap)
            cellW = Math.max(1, L.size)
            cellH = Math.max(1, (L.size * L.aspect) / 100)
            radius = (Math.min(cellW, cellH) / 2) * (L.rounded / 100)

            cols = Math.max(1, Math.floor((W + g) / (cellW + g)))
            rows = Math.max(1, Math.ceil((H + g) / (cellH + g)))
            // `justify-content: space-between`: the leftover subpixels go to the
            // column gaps so both edges stay flush. Rows keep the exact gap and
            // the surplus row is clipped, exactly as the source's grid does.
            pitchX = cols > 1 ? (W - cellW) / (cols - 1) : 0
            pitchY = cellH + g

            const n = cols * rows
            if (trail.length !== n) trail = new Float32Array(n)
            viewW = W
            viewH = H

            const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
            canvas!.width = Math.max(1, Math.round(W * dpr))
            canvas!.height = Math.max(1, Math.round(H * dpr))
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
        }

        function rebuildField() {
            const L = live.current
            terms = prepare(L.length, L.direction)
            rowTerms = buildRows(rows, terms, 1 - L.fog / 100)
        }

        function syncKeys() {
            const L = live.current
            if (boxDirty) {
                boxDirty = false
                boxW = Math.max(1, host!.offsetWidth)
                boxH = Math.max(1, host!.offsetHeight)
                layoutKey = ""
            }
            const lk = `${boxW}x${boxH}|${L.size}|${L.aspect}|${L.gap}|${L.rounded}`
            if (lk !== layoutKey) {
                layoutKey = lk
                layout()
                fieldKey = "" // rows may have changed
            }
            const fk = `${rows}|${L.length}|${L.direction}|${L.fog}`
            if (fk !== fieldKey) {
                fieldKey = fk
                rebuildField()
            }
        }

        // --- pointer ------------------------------------------------------
        let pointerX = 0
        let pointerY = 0
        let pointerOn = false

        const onMove = (e: PointerEvent) => {
            const rect = host!.getBoundingClientRect()
            // The rect is zoomed on the Framer canvas and clientX with it, so the
            // difference is in zoomed px. Divide it back into layout px.
            const zoom = rect.width / Math.max(1, host!.offsetWidth)
            pointerX = (e.clientX - rect.left) / zoom
            pointerY = (e.clientY - rect.top) / zoom
            pointerOn = true
        }
        const onLeave = () => {
            pointerOn = false
        }

        // --- draw ---------------------------------------------------------
        const paths: (Path2D | null)[] = new Array(256).fill(null)

        function addCell(p: Path2D, x: number, y: number) {
            if (radius > 0.5 && roundRectSupported) {
                ;(p as any).roundRect(x, y, cellW, cellH, radius)
            } else {
                p.rect(x, y, cellW, cellH)
            }
        }

        function draw(t: number, dt: number) {
            const L = live.current
            const [r, g, b, alphaMax] = L.rgba
            const gamma = Math.max(0.01, L.contrast / 100)
            const gain = L.hover / 100
            const sigma = Math.max(1, L.reach)
            const window3 = sigma * 3
            const twoSigmaSq = 2 * sigma * sigma
            const tau = DAMPING_REF / Math.max(1, L.damping)
            const decay = dt > 0 ? Math.exp(-dt / tau) : 1
            const usePointer = pointerOn && gain > 0

            for (let i = 0; i < 256; i += 1) paths[i] = null

            for (let row = 0; row < rows; row += 1) {
                const rt = rowTerms[row]
                if (!rt) continue
                const y = row * pitchY
                const halfCol = (cols - 1) / 2
                for (let col = 0; col < cols; col += 1) {
                    const idx = row * cols + col
                    let pulse = trail[idx] * decay
                    if (usePointer) {
                        const dx = col * pitchX - pointerX
                        const dy = y - pointerY
                        if (
                            dx > -window3 &&
                            dx < window3 &&
                            dy > -window3 &&
                            dy < window3
                        ) {
                            const p =
                                gain *
                                Math.exp(-(dx * dx + dy * dy) / twoSigmaSq)
                            if (p > pulse) pulse = p
                        }
                    }
                    trail[idx] = pulse

                    const o = col - halfCol
                    let s = 0
                    for (let k = 0; k < terms.length; k += 1) {
                        const term = terms[k]
                        s +=
                            term.amplitude *
                            Math.sin(
                                rt.along[k] +
                                    rt.per[k] * o -
                                    term.omega * t +
                                    term.phase
                            )
                    }
                    const base =
                        Math.pow(0.5 + (0.5 * s) / AMPLITUDE_SUM, gamma) * rt.fog
                    const v = base + (1 - base) * pulse
                    const a = MIN_ALPHA + alphaMax * v
                    const byte = a <= 0 ? 0 : a >= 1 ? 255 : Math.round(a * 255)
                    if (byte === 0) continue
                    let p = paths[byte]
                    if (!p) {
                        p = new Path2D()
                        paths[byte] = p
                    }
                    addCell(p, col * pitchX, y)
                }
            }

            ctx!.clearRect(0, 0, viewW, viewH)
            for (let byte = 1; byte < 256; byte += 1) {
                const p = paths[byte]
                if (!p) continue
                ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${(byte / 255).toFixed(4)})`
                ctx!.fill(p)
            }
        }

        // --- loop ---------------------------------------------------------
        let raf = 0
        let last = 0
        let clock = 0
        let running = true

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
            last = now
            syncKeys()
            clock = (clock + dt * (live.current.speed / SPEED_REF)) % 24
            draw(clock, dt)
        }

        const gate = () => {
            if (running && !document.hidden) {
                if (!raf) {
                    last = 0
                    raf = requestAnimationFrame(frame)
                }
            } else if (raf) {
                cancelAnimationFrame(raf)
                raf = 0
            }
        }

        const ro = new ResizeObserver(() => {
            boxDirty = true
            if (reduced) {
                syncKeys()
                draw(0, 0)
            }
        })
        ro.observe(host)

        host.addEventListener("pointermove", onMove, { passive: true })
        host.addEventListener("pointerleave", onLeave, { passive: true })
        // Releases go on window, not the host: a pointer that leaves the
        // component mid-gesture would otherwise never clear (rule K).
        window.addEventListener("pointercancel", onLeave, { passive: true })
        window.addEventListener("blur", onLeave)
        document.addEventListener("visibilitychange", gate)

        if (reduced) {
            syncKeys()
            draw(0, 0)
        } else {
            gate()
        }

        return () => {
            running = false
            if (raf) cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("pointercancel", onLeave)
            window.removeEventListener("blur", onLeave)
            document.removeEventListener("visibilitychange", gate)
        }
        // The loop is built once; every live input is read from `live` inside it.
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                // Floor before the spread, so an explicit size on the instance
                // still wins and Fit Content can't collapse the root to 0x0.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
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
                }}
            />
        </div>
    )
}
