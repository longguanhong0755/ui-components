"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"

/* ------------------------------------------------------------------ *
 *  PixelTrail
 *  A wall of square cells the cursor burns into. Every cell it crosses
 *  snaps to full opacity, holds, then fades, so the pointer drags a
 *  dissolving tail of pixels behind it.
 *
 *  Four decisions carry the effect:
 *
 *    1. THE SNAP. A cell lights with its transition switched off and only
 *       the fade is timed. That asymmetry -- instant on, slow off -- is
 *       what makes it read as something being *struck* rather than
 *       something following the cursor. Ease the rise and the whole field
 *       turns into a soft glow with no pixel character left in it.
 *
 *    2. THE PACE. A pointermove is not one position: the browser coalesces
 *       every hardware sample taken since the last frame into it, and a
 *       handler that reads only `clientX` throws most of a fast flick
 *       away. Every coalesced sample is stamped, so the trail is laid down
 *       at the pointer's own rate rather than the frame rate's -- and
 *       between samples the segment is walked in half-cell steps, so a
 *       jump from off-screen still arrives as a line and not a dotted one.
 *
 *    3. THE SCALE. Framer's canvas -- and any transformed ancestor -- draws
 *       the frame at some zoom. The pointer arrives in screen pixels and
 *       the grid is laid out in CSS pixels, so the two have to be divided
 *       apart before the hit test. Skip it and the trail drifts further
 *       from the cursor the further across the frame it goes, which is the
 *       one failure that makes the whole thing look broken.
 *
 *    4. THE DIFFERENCE BLEND. The caption is not drawn over the trail so
 *       much as XORed with it: white type on a white ground is invisible
 *       until a pixel passes under it, and then that fragment of the word
 *       inverts. The text is revealed by the trail instead of sitting on
 *       top of it, which is the reason the thing is worth building.
 *
 *  Nothing re-renders while the pointer moves. React lays the grid out
 *  once per size or Column change; the trail is written straight to the
 *  cells' inline opacity, and one timer per cell schedules its fade.
 *  Colour and radius reach every cell through two custom properties set
 *  on the grid, so a thousand nodes can share one frozen style object.
 * ------------------------------------------------------------------ */

/* ---------------------------------------------------------- constants */

/** Ceiling on live cells. A tall frame at a high Column count would
 *  otherwise ask for tens of thousands of nodes; past this the grid is
 *  coarsened instead, because leaving the bottom of the frame unpaved is
 *  the one failure the user would actually see. */
const MAX_CELLS = 4200
/** A pixel dims like phosphor. Even decay reads truer here than an eased
 *  curve, which makes the tail linger and then leave all at once. */
const FADE_EASING = "linear"
/** The gap between two pointer samples is walked every half cell. Finer
 *  only re-lights cells that are already lit; coarser starts to skip them
 *  when the pointer outruns the sampling rate. */
const WALK_FRACTION = 0.5
/** Cap on that walk, so a pointer arriving from off-screen costs a
 *  bounded amount of work rather than one stamp per pixel travelled. */
const MAX_WALK_STEPS = 96
/** Side margin the caption keeps off the frame edge. Fixed, not exposed:
 *  it is a percentage, so it is already the same margin at every width. */
const CAPTION_INSET = "12%"
/** The width the user's font size is authored against. Text scales with
 *  the frame from here, the way the original's 6vw did, so one setting
 *  reads on a phone and on a display. */
const REFERENCE_WIDTH = 1200
/** How far that scaling may run. The floor keeps a headline legible in a
 *  narrow column; the ceiling stops a wide frame from setting type at a
 *  size nobody asked for. */
const TEXT_SCALE_MIN = 0.34
const TEXT_SCALE_MAX = 1.9

/* ----------------------------------------------------------- defaults */

const DEFAULT_BACKGROUND = "#FFFFFF"

/** One field, one paragraph. The browser decides where the lines fall. */
const DEFAULT_TEXT = "We specialize in turning space into complex shapes"

const DEFAULT_FONT_SIZE = 76

const DEFAULT_FONT: CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontSize: DEFAULT_FONT_SIZE,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    lineHeight: 1.04,
}

/** White, because Invert ships on: differenced against a white ground it
 *  prints black, and against a struck pixel it prints white. */
const DEFAULT_TEXT_COLOR = "#FFFFFF"

/** The cell itself. No width or height here -- Columns divides the frame
 *  and a cell is square, so its size falls out of the layout rather than
 *  fighting it from a second slider. */
const DEFAULT_PIXEL = {
    color: "#FFFFFF",
    gap: 0,
    radius: 0,
}

/** How a strike behaves once it has landed. */
const DEFAULT_TRAIL = {
    hold: 0.3,
    fade: 0.45,
    reach: 0,
}

const DEFAULTS = {
    invert: true,
    columns: 20,
}

/* -------------------------------------------------------------- types */

/** Style objects that also carry CSS custom properties. */
type StyleWithVars = CSSProperties & Record<`--${string}`, string>

/** `text-wrap` is newer than the React typings in some setups. */
type StyleWithWrap = CSSProperties & { textWrap?: string }

/** Older typings do not know about coalesced samples. */
type Coalescing = { getCoalescedEvents?: () => PointerEvent[] }

/** One style object shared by every cell. Colour and radius arrive as
 *  custom properties from the grid, so changing either updates a single
 *  node instead of a thousand, and React never diffs a cell's style --
 *  which is also what keeps it from wiping the opacity we write by hand. */
const CELL_STYLE: CSSProperties = {
    width: "100%",
    aspectRatio: "1 / 1",
    background: "var(--pt-color)",
    borderRadius: "var(--pt-radius)",
    opacity: 0,
    mixBlendMode: "difference",
    // No will-change. It is the obvious thing to reach for on a fading
    // element and it is wrong at this count: a promotion hint on every
    // cell asks for thousands of compositor layers, which costs far more
    // than the opacity transitions it was meant to smooth.
}

export interface PixelTrailPixel {
    /** Colour a struck cell burns to */
    color?: string
    /** Space between cells, px. At 0 the trail is solid; above it, a grid */
    gap?: number
    /** Cell corner radius, px. At half the cell size the trail is dots */
    radius?: number
}

export interface PixelTrailTrail {
    /** Seconds a struck cell sits at full before it starts to go */
    hold?: number
    /** Seconds it then takes to fade out */
    fade?: number
    /** Cells lit around the one under the cursor, dimmer with distance */
    reach?: number
}

export interface PixelTrailProps {
    /** The caption, as one paragraph. It breaks itself to fit the frame */
    text?: string
    /** Ground the trail is struck into */
    background?: string
    /** Framer font object; the size is authored at 1200px and scales */
    font?: CSSProperties
    /** One colour for the whole caption */
    textColor?: string
    /** Blend the caption with what is behind it, so the trail inverts it */
    invert?: boolean
    /** Cells across the frame. Rows follow, because a cell is square */
    columns?: number
    pixel?: PixelTrailPixel
    trail?: PixelTrailTrail
    style?: CSSProperties
}

interface Grid {
    cols: number
    rows: number
    gap: number
    /** Cell edge plus one gap: the distance from a cell to its neighbour,
     *  and the only number the hit test needs. */
    pitch: number
    count: number
}

/* ----------------------------------------------------------- component */

export default function PixelTrail({
    text = "WATCH THE PIXELS\nCOME ALIVE",
    background = "#000000",
    font,
    textColor = "#FFFFFF",
    invert = DEFAULTS.invert,
    columns = DEFAULTS.columns,
    pixel,
    trail,
    style,
}: PixelTrailProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const gridRef = useRef<HTMLDivElement>(null)
    const cellsRef = useRef<HTMLElement[]>([])
    const timersRef = useRef<number[]>([])
    const lastRef = useRef<{ x: number; y: number } | null>(null)

    const px = { ...DEFAULT_PIXEL, ...pixel }
    const tr = { ...DEFAULT_TRAIL, ...trail }

    // Zero until the client measures. Rendering no cells on the server is
    // the only honest first paint: the grid depends on a size we do not
    // have yet, and guessing one would mismatch on hydration.
    const [size, setSize] = useState({ w: 0, h: 0 })

    useEffect(() => {
        const host = hostRef.current
        if (!host) return

        // Layout pixels, deliberately. getBoundingClientRect would hand
        // back the zoomed size on Framer's canvas, and the grid this
        // number lays out is in CSS pixels -- mixing the two is what puts
        // the trail somewhere the cursor is not.
        const read = (w: number, h: number) =>
            setSize((s) =>
                Math.abs(s.w - w) < 0.5 && Math.abs(s.h - h) < 0.5
                    ? s
                    : { w, h }
            )

        read(host.clientWidth, host.clientHeight)

        const ro = new ResizeObserver((entries) => {
            const box = entries[0]?.contentRect
            if (box) read(box.width, box.height)
        })
        ro.observe(host)
        return () => ro.disconnect()
    }, [])

    const grid: Grid = useMemo(() => {
        const gap = Math.max(0, px.gap)
        let cols = Math.max(2, Math.round(columns))
        if (size.w <= 0 || size.h <= 0)
            return { cols, rows: 0, gap, pitch: 0, count: 0 }

        const measure = (c: number) => {
            const cell = Math.max(1, (size.w - gap * (c - 1)) / c)
            const pitch = cell + gap
            // One row past the bottom edge, so a partial row is clipped by
            // the frame rather than leaving the ground showing under it.
            return {
                pitch,
                rows: Math.max(1, Math.ceil((size.h + gap) / pitch)),
            }
        }

        let m = measure(cols)
        let guard = 0
        while (cols * m.rows > MAX_CELLS && cols > 2 && guard++ < 16) {
            cols = Math.max(2, Math.floor(cols * 0.85))
            m = measure(cols)
        }

        return { cols, rows: m.rows, gap, pitch: m.pitch, count: cols * m.rows }
    }, [columns, px.gap, size.w, size.h])

    // Live mirror of everything the pointer handlers read. They are never
    // re-bound when a control moves, and a strike already in flight keeps
    // the timing it was struck with.
    const liveRef = useRef({
        cols: 0,
        rows: 0,
        pitch: 0,
        hold: DEFAULT_TRAIL.hold,
        fade: DEFAULT_TRAIL.fade,
        reach: DEFAULT_TRAIL.reach,
    })
    liveRef.current = {
        cols: grid.cols,
        rows: grid.rows,
        pitch: grid.pitch,
        hold: Math.max(0, tr.hold),
        fade: Math.max(0, tr.fade),
        reach: Math.max(0, Math.round(tr.reach)),
    }

    // Cells are collected from the DOM rather than through a ref per node:
    // a thousand inline ref callbacks would be re-created and re-attached
    // on every render, and the list only changes when the grid does.
    useEffect(() => {
        for (const t of timersRef.current) if (t) window.clearTimeout(t)
        const g = gridRef.current
        cellsRef.current = g ? (Array.from(g.children) as HTMLElement[]) : []
        timersRef.current = new Array(cellsRef.current.length).fill(0)
        lastRef.current = null
    }, [grid.cols, grid.rows])

    useEffect(
        () => () => {
            for (const t of timersRef.current) if (t) window.clearTimeout(t)
        },
        []
    )

    /** Strike one cell and schedule its fade. */
    const strike = (col: number, row: number, alpha: number) => {
        const { cols, rows, hold, fade } = liveRef.current
        if (col < 0 || row < 0 || col >= cols || row >= rows) return

        const i = row * cols + col
        const el = cellsRef.current[i]
        if (!el) return

        const pending = timersRef.current[i]
        if (pending) window.clearTimeout(pending)

        // Never dim a cell that is already brighter: a glancing pass at the
        // edge of Reach must not cut into the core the cursor has just laid
        // down. A cell mid-fade reads as 0 here, so it re-lights in full.
        const current = parseFloat(el.style.opacity) || 0
        const next = current > alpha ? current : alpha

        el.style.transition = "none"
        el.style.opacity = String(next)

        timersRef.current[i] = window.setTimeout(() => {
            timersRef.current[i] = 0
            el.style.transition = `opacity ${fade}s ${FADE_EASING}`
            el.style.opacity = "0"
        }, hold * 1000)
    }

    /** Strike whatever sits under one point on the pointer's path. */
    const stamp = (x: number, y: number) => {
        const { pitch, reach } = liveRef.current
        if (pitch <= 0) return

        const col = Math.floor(x / pitch)
        const row = Math.floor(y / pitch)

        if (reach <= 0) {
            strike(col, row, 1)
            return
        }
        // Round falloff, not square: Chebyshev distance would light the
        // corners of the neighbourhood as brightly as its edges, and the
        // trail would read as a box being dragged.
        for (let dr = -reach; dr <= reach; dr++) {
            for (let dc = -reach; dc <= reach; dc++) {
                const d = Math.sqrt(dc * dc + dr * dr)
                if (d > reach + 0.5) continue
                strike(col + dc, row + dr, 1 - d / (reach + 1))
            }
        }
    }

    /** Draw from the last known point to this one, then remember it. */
    const trace = (x: number, y: number) => {
        const pitch = liveRef.current.pitch
        const last = lastRef.current

        if (last) {
            const dx = x - last.x
            const dy = y - last.y
            const steps = Math.min(
                MAX_WALK_STEPS,
                Math.ceil(Math.sqrt(dx * dx + dy * dy) / (pitch * WALK_FRACTION))
            )
            for (let i = 1; i < steps; i++) {
                stamp(last.x + (dx * i) / steps, last.y + (dy * i) / steps)
            }
        }

        stamp(x, y)
        lastRef.current = { x, y }
    }

    const onPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
        const host = hostRef.current
        if (!host || liveRef.current.pitch <= 0) return

        // Measured at the top of the handler, before a single cell is
        // written to. The browser has already flushed last frame's opacity
        // writes and none of ours are pending, so the query is free -- and
        // reading it fresh is what keeps the trail under the cursor when
        // the page scrolls or the canvas pans beneath it.
        const rect = host.getBoundingClientRect()
        const layoutWidth = host.offsetWidth
        const scale = layoutWidth > 0 ? rect.width / layoutWidth : 1
        if (!(scale > 0)) return

        const native = e.nativeEvent as PointerEvent & Coalescing
        const samples = native.getCoalescedEvents
            ? native.getCoalescedEvents()
            : []
        const points: Array<{ clientX: number; clientY: number }> =
            samples.length ? samples : [native]

        for (const p of points) {
            trace((p.clientX - rect.left) / scale, (p.clientY - rect.top) / scale)
        }
    }

    const gridStyle: StyleWithVars = {
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
        gap: `${grid.gap}px`,
        alignContent: "start",
        // The host takes the pointer. Hit-testing a thousand cells to
        // arrive at the same coordinates is work for nothing.
        pointerEvents: "none",
        "--pt-color": px.color,
        "--pt-radius": `${Math.max(0, px.radius)}px`,
    }

    const cells = useMemo(
        () =>
            Array.from({ length: grid.count }, (_, i) => (
                <div key={i} style={CELL_STYLE} />
            )),
        [grid.count]
    )

    const caption = (text || "").trim()
    const face = { ...DEFAULT_FONT, ...font }
    const authored =
        typeof face.fontSize === "number"
            ? face.fontSize
            : parseFloat(String(face.fontSize ?? "")) || DEFAULT_FONT_SIZE
    // The user's size is authored against REFERENCE_WIDTH and rides the
    // frame from there. Everything else in the face is already relative --
    // letter spacing in em, line height unitless -- so scaling the one
    // number carries the whole setting with it.
    const textScale =
        size.w > 0
            ? Math.min(
                  TEXT_SCALE_MAX,
                  Math.max(TEXT_SCALE_MIN, size.w / REFERENCE_WIDTH)
              )
            : 1

    // The box does the placing and the span does the setting. Keeping the
    // two apart is what stops the font object from reaching the layout:
    // it is spread onto the span alone, so nothing it carries can move the
    // caption off the middle of the frame.
    const captionBoxStyle: CSSProperties = {
        // Centred by the flex parent, never by a transform on the text.
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `0 ${CAPTION_INSET}`,
        mixBlendMode: invert ? "difference" : "normal",
        pointerEvents: "none",
        userSelect: "none",
    }

    const captionTextStyle: StyleWithWrap = {
        ...face,
        // Everything below is set after the face and not before it.
        // Framer's extended Font control carries its own alignment, and
        // where the caption sits is this component's decision rather than
        // the typeface's -- spread the face last and it silently wins.
        color: textColor,
        fontSize: Math.round(authored * textScale * 100) / 100,
        // Full width first, then centre. A shrink-to-fit flex item would
        // centre the block as a whole and leave the lines inside it ragged
        // against its own edge, which reads as "nearly centred".
        width: "100%",
        margin: 0,
        textAlign: "center",
        // One field, one paragraph: the browser picks the breaks, so the
        // copy re-flows at every width instead of carrying the breaks
        // whoever typed it happened to want on a desktop. Balanced, so a
        // headline does not end on a single orphaned word.
        textWrap: "balance",
        // A URL or a compound long enough to outrun the frame breaks
        // rather than pushing the whole caption off its centre.
        overflowWrap: "break-word",
    }

    return (
        <div
            ref={hostRef}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onPointerLeave={() => {
                lastRef.current = null
            }}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                // The caption differences against this frame and nothing
                // outside it. Without the isolate it would blend with
                // whatever the component happens to be dropped on.
                isolation: "isolate",
                ...style,
            }}
        >
            <div ref={gridRef} style={gridStyle}>
                {cells}
            </div>

            {caption && (
                <div style={captionBoxStyle}>
                    <span style={captionTextStyle}>{caption}</span>
                </div>
            )}
        </div>
    )
}
