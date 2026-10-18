"use client"

/**
 * Text String — a paragraph that is secretly one long physical string.
 *
 * The text is laid out in reading order, then re-threaded into a zig-zag
 * (snake) sequence so every line links end-to-end with the next: line 1 runs
 * left to right, line 2 is walked right to left, and so on. Consecutive
 * characters in that snake are joined by distance constraints, so the whole
 * paragraph is a single Verlet-integrated chain.
 *
 * Ported to a single-file Framer / Next.js component from
 * https://github.com/prashantkoirala465/Text-String-Animation — same snake
 * layout, Verlet integration, iterative distance solver, character collision
 * and edge bouncing.
 *
 * Changed from the original: the string is unravelled by SCROLL, not by
 * dragging. Scroll progress drives a release front that walks backwards from
 * the end of the text; everything past the front drops out of the paragraph
 * and hangs off the last still-written character. Scrolling back up flies the
 * characters home into their sentence again, and tapping a word cuts the text
 * there so everything the reader sees after it falls away.
 *
 * Give the section more height than the viewport and the stage inside it pins
 * while the surplus is scrolled through, so the unravel is scrubbed over as
 * much scrolling as the height allows rather than being dumped by one flick.
 * Letters fall inside that pinned stage, so it drops into a page as a section
 * without spilling.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ types */

/** The CSS-ish object Framer's Font control hands back. Lengths arrive as bare
 * numbers or as strings with units depending on the field and the version. */
export interface TextStringFont {
    fontFamily?: string
    fontSize?: number | string
    fontWeight?: number | string
    fontStyle?: string
    lineHeight?: number | string
    letterSpacing?: number | string
}

/** A framer-motion transition, as produced by Framer's Transition control. */
export interface TextStringTransition {
    type?: string
    stiffness?: number
    damping?: number
    mass?: number
    duration?: number
    delay?: number
    ease?: string | number[]
}

export interface TextStringPhysics {
    unravel?: number
    gravity?: number
    slack?: number
    bounce?: number
}

export interface TextStringInteraction {
    smoothing?: number
    reverse?: boolean
    tapToBreak?: boolean
}

export interface TextStringProps {
    background?: string
    text?: string
    font?: TextStringFont
    textColor?: string
    columnWidth?: number
    offset?: number
    physics?: TextStringPhysics
    transition?: TextStringTransition
    interaction?: TextStringInteraction
    style?: CSSProperties
}

/** One character of the paragraph: a particle in the chain. `ox`/`oy` is its
 * home in the sentence, `px`/`py` its previous position (Verlet velocity). */
interface Letter {
    ch: string
    w: number
    x: number
    y: number
    ox: number
    oy: number
    px: number
    py: number
    locked: boolean
    /** Velocity in px/s while the letter is travelling home, and the clock and
     * starting point that a tween needs. Unused while it is falling — the
     * chain carries its velocity in `px`/`py` instead. */
    vx: number
    vy: number
    ht: number
    hx: number
    hy: number
    /** Last transform written to the DOM — skips redundant style writes. */
    tx: number
    ty: number
}

interface Sim {
    letters: Letter[]
    /** Rest length of the link between letter i and i + 1. */
    rest: number[]
    /** Reading-order index of the letter at each string-order slot. */
    reading: number[]
    /** Every glyph in reading order — what the cut walks along to find a word. */
    chars: string[]
    /** 1 where the link between letter i and i + 1 has been cut. Rebuilt only
     * when the cut moves. */
    severed: Uint8Array
    lineHeight: number
    radius: number
}

/* -------------------------------------------------------------- constants */

/** The simulation ticks at a fixed 120 Hz whatever the display does, capped so
 * a backgrounded tab does not resume into a spiral of catch-up steps. */
const FIXED_DT = 1 / 120
const MAX_STEPS = 4

/** Passes of the distance solver per tick. More passes, stiffer string. */
const ITERATIONS = 12
const DAMPING = 0.97
/** Gutter between the text column and its wrap width. */
const MARGIN = 20

/** A tap only counts as a tap if the pointer barely moved and was not held —
 * otherwise a touch-scroll gesture would snap the string on every swipe. */
const TAP_SLOP = 8
const TAP_TIMEOUT = 700

const DEFAULTS = {
    background: "#000000",
    text: "Create with intention.\nExplore without limits.\nTurn simple ideas into experiences.\nKeep moving forward.\nLet the work speak for itself.",
    font: {
        fontFamily: "Georgia, serif",
        fontSize: 20,
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: 0,
    } as TextStringFont,
    textColor: "#F5F0E8",
    columnWidth: 600,
    offset: 13,
    physics: { unravel: 5, gravity: 5, slack: 5, bounce: 5 },
    /** Critically damped and quick: letters arrive without wobbling. */
    transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        mass: 1,
    } as TextStringTransition,
    interaction: { smoothing: 6, reverse: true, tapToBreak: true },
}

/* -------------------------------------------------------------- internals */

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

/** Framer hands grouped controls back as partial objects when only some fields
 * have been touched, so every group is merged over its defaults. */
function merge<T extends object>(value: T | undefined, fallback: T): T {
    return { ...fallback, ...(value || {}) }
}

/**
 * Pasted copy is rarely plain text. Word documents and web pages are full of
 * non-breaking and typographic spaces, and anything copied out of an editor
 * arrives with hard line breaks in it. None of those is a plain space, so the
 * wrap sees no place to break: a non-breaking-spaced paragraph becomes one
 * enormous word that has to be chopped mid-syllable to fit the column, and a
 * newline is laid down as an invisible glyph that silently glues the word
 * before it to the word after.
 *
 * So every space-like character becomes a plain space and every break-like one
 * a newline, runs are collapsed the way HTML would collapse them, and
 * zero-width junk is dropped. After this the layout only ever sees " " and
 * "\n". Zero-width joiners are deliberately kept — they hold emoji together.
 */
function normalizeText(raw: string): string {
    return (
        raw
            // Every kind of line break becomes a newline.
            .replace(/\r\n?|\u2028|\u2029/g, "\n")
            // Every kind of horizontal space becomes a plain space: tab,
            // non-breaking space, and the typographic spaces pasted copy is
            // full of.
            .replace(
                /[\t\v\f\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g,
                " "
            )
            // Zero-width space, byte-order mark and soft hyphen carry no width
            // and no meaning here. U+200D (zero-width joiner) is left alone —
            // it is what holds a multi-part emoji together.
            .replace(/[\u200B\uFEFF\u00AD]/g, "")
            .replace(/ {2,}/g, " ")
            .replace(/ *\n */g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim()
    )
}

/** True for the characters the wrap may break at and a word may start after. */
function isBreak(ch: string): boolean {
    return ch === " " || ch === "\n"
}

/**
 * Resolve a CSS length to pixels. The Font control hands lengths back as bare
 * numbers (already px) on some fields and as unit strings on others, so both
 * have to be understood before anything can be measured on a canvas.
 */
function toPx(value: unknown, base: number, fallback: number): number {
    if (typeof value === "number") return isFinite(value) ? value : fallback
    if (typeof value === "string") {
        const num = parseFloat(value)
        if (!isFinite(num)) return fallback
        if (/r?em\s*$/.test(value)) return num * base
        if (/%\s*$/.test(value)) return (num / 100) * base
        return num
    }
    return fallback
}

/**
 * Line height in pixels. CSS treats a bare number as a multiple of the font
 * size, and that is what the Font control emits (1.4, "1.4em"), but a value
 * big enough to be a sensible line box in its own right is taken as pixels —
 * no typeface has a 4x leading, and none has a 4px line.
 */
function toLineHeight(value: unknown, fontSize: number): number {
    if (value === undefined || value === null || value === "") {
        return fontSize * 1.4
    }
    if (typeof value === "number") {
        return isFinite(value)
            ? value <= 4
                ? value * fontSize
                : value
            : fontSize * 1.4
    }
    const num = parseFloat(String(value))
    if (!isFinite(num)) return fontSize * 1.4
    if (/px\s*$/.test(String(value))) return num
    if (/r?em\s*$/.test(String(value))) return num * fontSize
    if (/%\s*$/.test(String(value))) return (num / 100) * fontSize
    return num <= 4 ? num * fontSize : num
}

/** Font weights the canvas font shorthand will accept. */
function toWeight(value: unknown): string {
    if (typeof value === "number" && isFinite(value)) return String(value)
    if (typeof value === "string") {
        const v = value.trim()
        if (/^\d{3}$/.test(v) || v === "normal" || v === "bold") return v
    }
    return "400"
}

/** Cubic-bezier easing, solved for t by Newton's method the way browsers do. */
function cubicBezier(
    x1: number,
    y1: number,
    x2: number,
    y2: number
): (x: number) => number {
    const cx = 3 * x1
    const bx = 3 * (x2 - x1) - cx
    const ax = 1 - cx - bx
    const cy = 3 * y1
    const by = 3 * (y2 - y1) - cy
    const ay = 1 - cy - by
    const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
    const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
    const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx
    return (x: number) => {
        if (x <= 0) return 0
        if (x >= 1) return 1
        let t = x
        for (let i = 0; i < 8; i++) {
            const dx = sampleX(t) - x
            if (Math.abs(dx) < 1e-5) break
            const slope = slopeX(t)
            if (Math.abs(slope) < 1e-6) break
            t -= dx / slope
        }
        return sampleY(clamp(t, 0, 1))
    }
}

const NAMED_EASES: Record<string, [number, number, number, number]> = {
    linear: [0, 0, 1, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
    circIn: [0.55, 0, 1, 0.45],
    circOut: [0, 0.55, 0.45, 1],
    circInOut: [0.85, 0, 0.15, 1],
    backIn: [0.36, 0, 0.66, -0.56],
    backOut: [0.34, 1.56, 0.64, 1],
    backInOut: [0.68, -0.6, 0.32, 1.6],
    anticipate: [0.36, 0, 0.66, -0.56],
}

/** How a letter travels home, resolved from the Transition control. */
interface HomeMotion {
    spring: boolean
    stiffness: number
    damping: number
    mass: number
    duration: number
    delay: number
    ease: (t: number) => number
}

const LINEAR = (t: number) => t

function resolveHome(transition: TextStringTransition): HomeMotion {
    const raw = transition.ease
    let ease = LINEAR
    if (Array.isArray(raw) && raw.length === 4) {
        ease = cubicBezier(raw[0], raw[1], raw[2], raw[3])
    } else if (typeof raw === "string" && NAMED_EASES[raw]) {
        const [a, b, c, d] = NAMED_EASES[raw]
        ease = cubicBezier(a, b, c, d)
    } else if (transition.type === "tween") {
        const [a, b, c, d] = NAMED_EASES.easeInOut
        ease = cubicBezier(a, b, c, d)
    }
    return {
        // Anything that is not explicitly a tween is integrated as a spring,
        // which is also what framer-motion defaults to.
        spring: transition.type !== "tween",
        // Clamped so a wild stiffness cannot outrun the fixed 120 Hz step and
        // blow the integrator up.
        stiffness: clamp(transition.stiffness ?? 400, 1, 5000),
        damping: clamp(transition.damping ?? 40, 0, 500),
        mass: clamp(transition.mass ?? 1, 0.1, 20),
        duration: clamp(transition.duration ?? 0.5, 0.01, 20),
        delay: clamp(transition.delay ?? 0, 0, 10),
        ease,
    }
}

/** Structural type for `Intl.Segmenter` so the file compiles whatever `lib`
 * the host project targets. */
type SegmenterCtor = new (
    locales?: string,
    options?: { granularity: "grapheme" }
) => { segment(input: string): Iterable<{ segment: string }> }

/** Split into user-perceived characters so emoji and combining marks stay
 * whole. `Intl.Segmenter` is missing on older Safari — fall back to code
 * points, which is correct for the Latin text this is built for. */
function segment(text: string): string[] {
    const Seg = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter
    if (typeof Seg === "function") {
        const seg = new Seg(undefined, { granularity: "grapheme" })
        return Array.from(seg.segment(text), (s) => s.segment)
    }
    return Array.from(text)
}

interface Position {
    x: number
    y: number
    w: number
    line: number
}

/**
 * Greedy word wrap in reading order. A space that triggers a break is kept at
 * the end of the line it broke, then the cursor resets — that keeps the chain
 * continuous across the fold instead of leaving a gap. A word too long to fit
 * on a line of its own is hard-broken mid-word, so a narrow column or a huge
 * font can never push glyphs outside the component.
 */
function layoutPositions(
    graphemes: string[],
    widths: number[],
    wrapWidth: number,
    lineHeight: number
): { positions: Position[]; lineCount: number } {
    const positions: Position[] = []
    let x = 0
    let line = 0

    for (let i = 0; i < graphemes.length; i++) {
        const w = widths[i]

        // A hard break the writer put there. Like a breaking space it is kept
        // at the end of the line it ends, which is what keeps the chain
        // continuous across the fold, but it is zero width and draws nothing.
        if (graphemes[i] === "\n") {
            positions.push({ x, y: line * lineHeight, w: 0, line })
            x = 0
            line++
            continue
        }

        if (graphemes[i] === " " && x > 0) {
            let wordW = 0
            for (
                let j = i + 1;
                j < graphemes.length && !isBreak(graphemes[j]);
                j++
            ) {
                wordW += widths[j]
            }
            if (x + w + wordW > wrapWidth) {
                positions.push({ x, y: line * lineHeight, w, line })
                x = 0
                line++
                continue
            }
        } else if (x > 0 && x + w > wrapWidth) {
            x = 0
            line++
        }

        positions.push({ x, y: line * lineHeight, w, line })
        x += w
    }

    return { positions, lineCount: line + 1 }
}

/**
 * Re-thread reading order into the snake: every other line is walked
 * backwards so the string joins line-end to line-end. The flip is chosen so
 * the final line always runs left to right, which leaves the free end of the
 * string at the end of the last sentence — where the reader's eye already is.
 */
function buildSnake(positions: Position[], lineCount: number): number[] {
    const lines: number[][] = Array.from({ length: lineCount }, () => [])
    for (let i = 0; i < positions.length; i++) lines[positions[i].line].push(i)

    const flipEven = (lineCount - 1) % 2 === 1
    const order: number[] = []
    for (let li = 0; li < lineCount; li++) {
        const reversed = flipEven ? li % 2 === 0 : li % 2 === 1
        const indices = lines[li]
        if (reversed) {
            for (let i = indices.length - 1; i >= 0; i--) order.push(indices[i])
        } else {
            for (let i = 0; i < indices.length; i++) order.push(indices[i])
        }
    }
    return order
}

/** Where the text column starts inside the component box. */
function columnLeft(rootW: number, columnWidth: number): number {
    const colW = Math.min(columnWidth, Math.max(160, rootW - 32))
    return (rootW - colW) / 2 + MARGIN
}

/**
 * The box the letters live and fall in: as wide as the section, and one
 * viewport tall or the whole section when that is shorter. Everything derives
 * the stage from this one place, so the measured layout, the physics bounds
 * and the element's own height can never disagree about where the floor is.
 */
function stageSize(root: HTMLElement): { w: number; h: number } {
    const vh = window.innerHeight || 0
    const rootH = root.clientHeight || 0
    const h = vh > 0 && rootH > 0 ? Math.min(vh, rootH) : rootH || vh || 600
    return { w: root.clientWidth || 0, h }
}

function wrapWidth(rootW: number, columnWidth: number): number {
    const colW = Math.min(columnWidth, Math.max(160, rootW - 32))
    return Math.max(40, colW - MARGIN * 2)
}

/* ------------------------------------------------------------- component */

export default function TextString(props: TextStringProps) {
    const background = props.background ?? DEFAULTS.background
    const physics = merge(props.physics, DEFAULTS.physics)
    const transition = merge(props.transition, DEFAULTS.transition)
    const interaction = merge(props.interaction, DEFAULTS.interaction)

    // Pasted copy is cleaned up before anything measures it.
    const text = normalizeText(props.text ?? DEFAULTS.text)
    const color = props.textColor || DEFAULTS.textColor
    const columnWidth = props.columnWidth ?? DEFAULTS.columnWidth
    const offset = props.offset ?? DEFAULTS.offset

    // Typography comes in as one CSS-ish object from the Font control, but the
    // layout is measured on a canvas and the physics needs real numbers, so
    // every field is resolved to pixels up front.
    const font = merge(props.font, DEFAULTS.font)
    const fontFamily = font.fontFamily || "Georgia, serif"
    const fontSize = toPx(font.fontSize, 16, 20)
    const fontWeight = toWeight(font.fontWeight)
    const fontStyle = font.fontStyle === "italic" ? "italic" : "normal"
    const requestedLineHeight = toLineHeight(font.lineHeight, fontSize)
    // Each glyph is its own absolutely-positioned element. A line-height below
    // the actual font size therefore makes consecutive rows physically overlap.
    // Keep a small breathing room so the Font control can never create stacked
    // glyphs, even when a very tight line-height is selected.
    const lineHeight = Math.max(fontSize * 1.05, requestedLineHeight)
    const letterSpacing = toPx(font.letterSpacing, fontSize, 0)
    /** Exactly what the measuring canvas is set to, and the rebuild key. */
    const cssFont = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`

    const rootRef = useRef<HTMLDivElement | null>(null)
    /** The pinned viewport-high stage the letters actually live and fall in.
     * The root is the scroll track; make it taller than the viewport and the
     * stage sticks while the extra height is scrolled through. */
    const stageRef = useRef<HTMLDivElement | null>(null)
    const spansRef = useRef<(HTMLSpanElement | null)[]>([])
    const simRef = useRef<Sim | null>(null)
    /** Rebuilds the layout at the current box size; swapped on every rebuild. */
    const relayoutRef = useRef<(() => void) | null>(null)

    /** Smoothed scroll progress, and the raw target it chases. */
    const progressRef = useRef(0)
    const targetRef = useRef(0)
    /** Wheel-driven progress, used only when the page itself cannot scroll. */
    const wheelRef = useRef(0)
    const pageScrollsRef = useRef(true)

    /**
     * Where a tap has cut the text, as a READING index: every glyph from here
     * to the end of the paragraph has been cut loose. Reading order, not chain
     * order — the chain snakes, so cutting along it drops the text to the left
     * of the tap on every other line and leaves the text to its right hanging,
     * which is backwards to anyone reading the sentence. Climbs back to
     * Infinity as the cut heals on rewind.
     */
    const cutRef = useRef(Number.POSITIVE_INFINITY)

    const [glyphs, setGlyphs] = useState<string[]>([])

    /** Live prop mirror — the animation loop reads this instead of restarting
     * whenever a slider moves. */
    const tuning = useRef({
        unravel: 0,
        gravity: 0,
        bounce: 0,
        smoothing: 0,
        sweep: 1,
        reverse: true,
        tapToBreak: true,
        home: resolveHome(DEFAULTS.transition),
    })
    tuning.current = {
        // How much of the paragraph a full scrub is worth. The default
        // finishes the unravel at about 85% of the scroll range, leaving the
        // last stretch to watch the pile settle. Below 3 the text can never
        // fully come apart however far the reader scrolls.
        unravel: 0.3 + (clamp(physics.unravel ?? 5, 0, 10) / 10) * 1.8,
        gravity: (clamp(physics.gravity ?? 5, 0, 10) / 10) * 0.3,
        bounce: (clamp(physics.bounce ?? 5, 0, 10) / 10) * 0.8,
        smoothing: 1 / (1 + clamp(interaction.smoothing ?? 6, 0, 10) * 1.2),
        // Shortest time the release front may take to sweep the whole
        // paragraph. Smoothing the scroll position alone is not enough: a
        // flick of the wheel moves progress far enough in one frame to cut
        // every letter loose at once, and the paragraph drops as a slab
        // instead of unravelling. Capping the front's speed in letters per
        // second keeps the cascade readable however hard the page is thrown,
        // while a slow scroll stays below the cap and tracks exactly.
        sweep: 0.3 + (clamp(interaction.smoothing ?? 6, 0, 10) / 10) * 2.7,
        reverse: interaction.reverse !== false,
        tapToBreak: interaction.tapToBreak !== false,
        home: resolveHome(transition),
    }

    /* ------------------------------------------------ build & measurement */

    useLayoutEffect(() => {
        const root = rootRef.current
        if (!root) return

        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        ctx.font = cssFont

        const graphemes = segment(text)
        // Tracking is folded into each glyph's advance rather than set as CSS:
        // every glyph is positioned individually, so `letter-spacing` on a
        // one-character span would only add a trailing gap nothing can see.
        const measureGlyph = (g: string) => {
            if (g === "\n") return 0
            const glyphWidth = ctx.measureText(g).width
            // Never allow tracking to make the measured advance smaller than
            // the glyph itself. Because every character is absolutely
            // positioned, a negative advance would make glyphs visibly stack.
            return Math.max(glyphWidth, glyphWidth + letterSpacing)
        }
        const widths = graphemes.map(measureGlyph)
        const slackFactor = 1 + (clamp(physics.slack ?? 5, 0, 10) / 10) * 0.4

        /** Reading-order home positions at the current box size. */
        const measure = (): { positions: Position[]; lineCount: number } => {
            const stage = stageSize(root)
            const rootW = stage.w || columnWidth
            const rootH = stage.h
            const { positions, lineCount } = layoutPositions(
                graphemes,
                widths,
                wrapWidth(rootW, columnWidth),
                lineHeight
            )
            const left = columnLeft(rootW, columnWidth)
            const blockH = lineCount * lineHeight
            const top = Math.min(
                (rootH * clamp(offset, 0, 100)) / 100,
                Math.max(0, rootH - blockH)
            )
            for (let i = 0; i < positions.length; i++) {
                positions[i].x += left
                positions[i].y += top
            }
            return { positions, lineCount }
        }

        const { positions, lineCount } = measure()
        const order = buildSnake(positions, lineCount)

        const letters: Letter[] = order.map((ri) => {
            const p = positions[ri]
            return {
                ch: graphemes[ri],
                w: p.w,
                x: p.x,
                y: p.y,
                ox: p.x,
                oy: p.y,
                px: p.x,
                py: p.y,
                locked: true,
                vx: 0,
                vy: 0,
                ht: 0,
                hx: p.x,
                hy: p.y,
                // NaN, not the home position: the render loop skips letters
                // that have not moved since the last write, and a letter at
                // rest never moves — so the opening frame has to be forced or
                // the paragraph never gets its first transform at all.
                tx: NaN,
                ty: NaN,
            }
        })

        // Rest lengths are measured once, from the pristine sentence, and are
        // deliberately not recomputed on resize — the string has a fixed
        // length even when the column it came from reflows.
        //
        // The link that folds one line into the next spans the ragged right
        // edge, so between a full line and a short one it can be several times
        // longer than a within-line link. Left uncapped it hangs as a visible
        // gap in the falling string, so fold links are clamped to a couple of
        // line heights. Both letters are still locked in the intact paragraph
        // when this matters, so the sentence itself is untouched.
        const maxLink = lineHeight * 2
        const rest: number[] = []
        for (let i = 0; i < letters.length - 1; i++) {
            const a = letters[i]
            const b = letters[i + 1]
            const dist = Math.hypot(
                b.ox + b.w / 2 - (a.ox + a.w / 2),
                b.oy - a.oy
            )
            rest.push(Math.min(dist, maxLink) * slackFactor)
        }

        simRef.current = {
            letters,
            rest,
            reading: order,
            chars: graphemes,
            severed: new Uint8Array(Math.max(0, letters.length - 1)),
            lineHeight,
            radius: Math.max(3, fontSize * 0.35),
        }

        relayoutRef.current = () => {
            const sim = simRef.current
            if (!sim) return
            const next = measure().positions
            for (let i = 0; i < sim.letters.length; i++) {
                const p = next[sim.reading[i]]
                const l = sim.letters[i]
                l.ox = p.x
                l.oy = p.y
                l.w = p.w
                if (l.locked) {
                    l.x = p.x
                    l.y = p.y
                    l.px = p.x
                    l.py = p.y
                    l.hx = p.x
                    l.hy = p.y
                    l.vx = 0
                    l.vy = 0
                }
            }
        }

        cutRef.current = Number.POSITIVE_INFINITY
        spansRef.current = new Array(letters.length).fill(null)
        // Force the new typography positions to be painted immediately on the
        // next frame instead of waiting for movement to exceed the old cache.
        for (const letter of letters) {
            letter.tx = NaN
            letter.ty = NaN
        }
        // A newline is a real particle in the chain but must draw nothing —
        // the spans are `white-space: pre`, so it would render as a line break.
        setGlyphs(letters.map((l) => (l.ch === "\n" ? "" : l.ch)))

        // Web fonts land after first paint and change every glyph width.
        let stale = false
        const fonts = (
            document as Document & { fonts?: { ready?: Promise<unknown> } }
        ).fonts
        if (fonts?.ready) {
            fonts.ready.then(() => {
                if (stale) return
                ctx.font = cssFont
                for (let i = 0; i < graphemes.length; i++) {
                    widths[i] = measureGlyph(graphemes[i])
                }
                relayoutRef.current?.()
                for (const letter of simRef.current?.letters ?? []) {
                    letter.tx = NaN
                    letter.ty = NaN
                }
            })
        }

        const ro = new ResizeObserver(() => relayoutRef.current?.())
        ro.observe(root)

        return () => {
            stale = true
            ro.disconnect()
            relayoutRef.current = null
            // Keep the previous simulation alive until the replacement layout
            // has been created. Font controls can emit several updates in quick
            // succession; clearing simRef here creates a visible collapsed/
            // empty frame between typography states.
        }
    }, [
        text,
        cssFont,
        letterSpacing,
        lineHeight,
        columnWidth,
        offset,
        physics.slack,
    ])

    /* -------------------------------------------------------- scroll input */

    useEffect(() => {
        const root = rootRef.current
        if (!root) return

        const measureScrollability = () => {
            const doc = document.documentElement
            pageScrollsRef.current = doc.scrollHeight - window.innerHeight > 4
        }
        measureScrollability()

        /** The stage is one viewport tall, or the whole section when that is
         * shorter. Everything above the section's height beyond that is scroll
         * track for the effect to be scrubbed through. */
        const fitStage = () => {
            const stage = stageRef.current
            if (!stage) return
            stage.style.height = `${stageSize(root).h}px`
        }
        fitStage()

        /**
         * Scroll progress, 0 to 1.
         *
         * A section taller than the viewport pins its stage and scrubs through
         * the surplus height: 0 as the section's top meets the top of the
         * screen, 1 once its bottom has been pulled up to the bottom of the
         * screen. That is what stops a single flick from dumping the whole
         * paragraph — make the section three viewports tall and the reader has
         * to scroll two full screens to finish the unravel, with the text
         * pinned in front of them the whole way.
         *
         * A section no taller than the viewport has no surplus to scrub, so it
         * falls back to its passage across the screen: 0 as its top reaches
         * the bottom of the viewport, 1 as its bottom leaves the top.
         */
        const readProgress = () => {
            if (!pageScrollsRef.current) {
                targetRef.current = wheelRef.current
                return
            }
            const rect = root.getBoundingClientRect()
            const vh = window.innerHeight || 1
            const scrub = rect.height - Math.min(vh, rect.height)
            targetRef.current =
                scrub > 40
                    ? clamp(-rect.top / scrub, 0, 1)
                    : clamp((vh - rect.top) / (rect.height + vh), 0, 1)
        }
        readProgress()
        progressRef.current = targetRef.current

        // A scroll event on the window is proof the page scrolls, whatever the
        // measurement said at mount — a page that only grows past the fold
        // once its images land would otherwise stay stuck on the wheel
        // fallback for good.
        const onScroll = () => {
            pageScrollsRef.current = true
            readProgress()
        }
        const onResize = () => {
            measureScrollability()
            fitStage()
            // The stage tracks the viewport, so a window resize moves the
            // floor even when the section's own box has not changed.
            relayoutRef.current?.()
            readProgress()
        }
        const onWheel = (e: WheelEvent) => {
            if (pageScrollsRef.current) return
            const height = stageRef.current?.clientHeight || 600
            wheelRef.current = clamp(
                wheelRef.current + e.deltaY / (height * 1.5),
                0,
                1
            )
            targetRef.current = wheelRef.current
            e.preventDefault()
        }

        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onResize)
        root.addEventListener("wheel", onWheel, { passive: false })

        return () => {
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onResize)
            root.removeEventListener("wheel", onWheel)
        }
    }, [])

    /* ------------------------------------------------------- tap to break */

    useEffect(() => {
        const root = rootRef.current
        if (!root) return

        let downX = 0
        let downY = 0
        let downAt = 0
        let downId = -1

        /** Cut the text at the word nearest the tap. Hit-testing against the
         * letters rather than listening on each of them keeps this to one
         * handler, and lets a tap land on a word instead of demanding a hit on
         * a glyph a few pixels wide. */
        const breakNear = (localX: number, localY: number) => {
            const sim = simRef.current
            if (!sim) return
            const { letters, reading, chars, lineHeight: lh } = sim

            let best = -1
            let bestDist = Math.max(60, lh * 2.5)
            for (let i = 0; i < letters.length; i++) {
                const l = letters[i]
                // Only the intact paragraph can be cut — letters already
                // falling are not part of a string worth cutting.
                if (!l.locked) continue
                const d = Math.hypot(
                    l.x + l.w / 2 - localX,
                    l.y + lh / 2 - localY
                )
                if (d < bestDist) {
                    bestDist = d
                    best = i
                }
            }
            if (best < 0) return

            // Back up to the start of the word, in reading order, so the cut
            // lands in the gap between two words and everything the reader
            // sees after the tapped word is what comes away.
            let start = reading[best]
            while (start > 0 && !isBreak(chars[start - 1])) start--

            cutRef.current = Math.min(cutRef.current, start)
        }

        const onDown = (e: PointerEvent) => {
            downId = e.pointerId
            downX = e.clientX
            downY = e.clientY
            downAt = e.timeStamp
        }

        const onUp = (e: PointerEvent) => {
            if (e.pointerId !== downId) return
            downId = -1
            if (!tuning.current.tapToBreak) return
            // A swipe that scrolls the page must not also snap the string.
            if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_SLOP) {
                return
            }
            if (e.timeStamp - downAt > TAP_TIMEOUT) return
            // Letter coordinates are relative to the stage, which slides
            // against the section as it sticks — measuring the root instead
            // would put the cut somewhere else on every scroll position.
            const rect = (stageRef.current ?? root).getBoundingClientRect()
            breakNear(e.clientX - rect.left, e.clientY - rect.top)
        }

        root.addEventListener("pointerdown", onDown)
        root.addEventListener("pointerup", onUp)
        root.addEventListener("pointercancel", onUp)

        return () => {
            root.removeEventListener("pointerdown", onDown)
            root.removeEventListener("pointerup", onUp)
            root.removeEventListener("pointercancel", onUp)
        }
    }, [])

    /* ------------------------------------------------------ simulation loop */

    useEffect(() => {
        const root = rootRef.current
        if (!root || glyphs.length === 0) return

        let frame = 0
        let last = -1
        let accumulator = 0
        let reached = 0
        /** The release front, as a fractional letter index: every letter past
         * it has left the sentence. Chases the scroll but is speed-limited, so
         * it is state that lives across ticks rather than a value derived from
         * progress alone. Starts past the end — nothing released. */
        let front = Number.POSITIVE_INFINITY
        /** Cut position the severed-link table was last built for. */
        let lastCut = -1

        // Reused between ticks: a uniform grid keeps collision near-linear
        // instead of testing every free letter against every other one.
        const buckets = new Map<number, number[]>()

        const simulate = (rootW: number, rootH: number) => {
            const sim = simRef.current
            if (!sim) return
            const { letters, rest, reading, severed, lineHeight: lh, radius } =
                sim
            const n = letters.length
            if (n === 0) return
            const t = tuning.current

            // Where the scroll wants the release front to be, and how far the
            // front is allowed to travel this tick to get there.
            const freed = progressRef.current * t.unravel * n
            const targetFront = n - 1 - clamp(freed, 0, n)
            const maxStep = (n / t.sweep) * FIXED_DT
            if (!Number.isFinite(front)) front = n - 1
            const prevFront = front
            if (front > targetFront) {
                front = Math.max(targetFront, front - maxStep)
            } else if (front < targetFront) {
                front = Math.min(targetFront, front + maxStep)
            }

            // A tapped cut knits itself back together only while the page is
            // actually scrolling back, at the same speed limit, so the repair
            // reads as one wave with the rest of the rewind. Healing whenever
            // the scroll merely sits still would yank a cut piece home about a
            // second after the tap, before it had finished falling. Turning
            // Rewind off makes a cut permanent, the same way it makes the
            // unravel permanent.
            if (t.reverse && front > prevFront && cutRef.current < n) {
                cutRef.current = Math.min(n, cutRef.current + maxStep)
                if (cutRef.current >= n) cutRef.current = Infinity
            }

            const frontIdx = Math.round(front)
            const cutIdx = Math.round(Math.min(cutRef.current, n))

            // The cut runs through one point of the text, but the chain snakes,
            // so it can meet the string in two places — the far end of the
            // tapped line and the fold below it. Sever every link that straddles
            // it, and the pieces the reader expects come away as one.
            if (cutIdx !== lastCut) {
                lastCut = cutIdx
                for (let i = 0; i < n - 1; i++) {
                    const a = reading[i] >= cutIdx
                    const b = reading[i + 1] >= cutIdx
                    severed[i] = a === b ? 0 : 1
                }
            }

            for (let i = n - 1; i >= 0; i--) {
                const l = letters[i]
                if (i > frontIdx || reading[i] >= cutIdx) {
                    if (l.locked) {
                        l.locked = false
                        l.px = l.x
                        l.py = l.y - 0.5
                    }
                } else if (!l.locked) {
                    // Re-locked: hand the letter to the Transition, starting
                    // from where it fell to and carrying the speed it was
                    // falling at, so a spring can overshoot the way a thrown
                    // thing does. Verlet stores that speed per tick.
                    l.locked = true
                    l.ht = 0
                    l.hx = l.x
                    l.hy = l.y
                    l.vx = clamp((l.x - l.px) / FIXED_DT, -1500, 1500)
                    l.vy = clamp((l.y - l.py) / FIXED_DT, -1500, 1500)
                }
            }

            // Verlet integration. A locked letter is not simulated — it eases
            // back into the sentence instead, so scrolling up reassembles the
            // paragraph rather than snapping it.
            for (let i = 0; i < n; i++) {
                const l = letters[i]
                if (l.locked) {
                    // Locked letters are no longer part of the string: they
                    // travel home under the Transition instead of the solver.
                    const home = t.home
                    l.ht += FIXED_DT
                    const elapsed = l.ht - home.delay
                    if (elapsed > 0) {
                        if (home.spring) {
                            const ax =
                                (-home.stiffness * (l.x - l.ox) -
                                    home.damping * l.vx) /
                                home.mass
                            const ay =
                                (-home.stiffness * (l.y - l.oy) -
                                    home.damping * l.vy) /
                                home.mass
                            l.vx += ax * FIXED_DT
                            l.vy += ay * FIXED_DT
                            l.x += l.vx * FIXED_DT
                            l.y += l.vy * FIXED_DT
                            if (
                                Math.abs(l.x - l.ox) < 0.05 &&
                                Math.abs(l.y - l.oy) < 0.05 &&
                                Math.abs(l.vx) < 2 &&
                                Math.abs(l.vy) < 2
                            ) {
                                l.x = l.ox
                                l.y = l.oy
                                l.vx = 0
                                l.vy = 0
                            }
                        } else {
                            const e = home.ease(
                                clamp(elapsed / home.duration, 0, 1)
                            )
                            l.x = l.hx + (l.ox - l.hx) * e
                            l.y = l.hy + (l.oy - l.hy) * e
                        }
                    }
                    l.px = l.x
                    l.py = l.y
                    continue
                }
                const vx = (l.x - l.px) * DAMPING
                const vy = (l.y - l.py) * DAMPING
                l.px = l.x
                l.py = l.y
                l.x += vx
                l.y += vy + t.gravity
            }

            // Distance constraints, solved by relaxation. Locked letters are
            // immovable anchors, so the freed tail hangs off the last
            // character still written into the sentence.
            for (let iter = 0; iter < ITERATIONS; iter++) {
                for (let i = 0; i < n - 1; i++) {
                    const a = letters[i]
                    const b = letters[i + 1]
                    if (a.locked && b.locked) continue
                    // A tapped link is gone: the two halves fall as separate
                    // pieces of string rather than one still hanging off the
                    // other.
                    if (severed[i] === 1) continue
                    const dx = b.x + b.w / 2 - (a.x + a.w / 2)
                    const dy = b.y - a.y
                    const dist = Math.hypot(dx, dy) || 0.001
                    const diff = (dist - rest[i]) / dist
                    if (a.locked) {
                        b.x -= dx * diff
                        b.y -= dy * diff
                    } else if (b.locked) {
                        a.x += dx * diff
                        a.y += dy * diff
                    } else {
                        a.x += dx * diff * 0.5
                        a.y += dy * diff * 0.5
                        b.x -= dx * diff * 0.5
                        b.y -= dy * diff * 0.5
                    }
                }
            }

            // Circle collision between non-adjacent free letters, bucketed by
            // a grid one collision-diameter wide.
            const cell = radius * 2
            for (const bucket of buckets.values()) bucket.length = 0
            for (let i = 0; i < n; i++) {
                const l = letters[i]
                if (l.locked) continue
                const gx = Math.floor((l.x + l.w / 2) / cell)
                const gy = Math.floor((l.y + lh / 2) / cell)
                const key = (gx + 4096) * 16384 + (gy + 4096)
                let bucket = buckets.get(key)
                if (!bucket) {
                    bucket = []
                    buckets.set(key, bucket)
                }
                bucket.push(i)
            }
            for (let i = 0; i < n; i++) {
                const a = letters[i]
                if (a.locked) continue
                const acx = a.x + a.w / 2
                const acy = a.y + lh / 2
                const gx = Math.floor(acx / cell)
                const gy = Math.floor(acy / cell)
                for (let ox = -1; ox <= 1; ox++) {
                    for (let oy = -1; oy <= 1; oy++) {
                        const bucket = buckets.get(
                            (gx + ox + 4096) * 16384 + (gy + oy + 4096)
                        )
                        if (!bucket) continue
                        for (let k = 0; k < bucket.length; k++) {
                            const j = bucket[k]
                            if (j <= i || j - i === 1) continue
                            const b = letters[j]
                            const dx = b.x + b.w / 2 - acx
                            const dy = b.y + lh / 2 - acy
                            const dist = Math.hypot(dx, dy) || 0.001
                            if (dist >= cell) continue
                            const push = ((cell - dist) / dist) * 0.5
                            a.x -= dx * push
                            a.y -= dy * push
                            b.x += dx * push
                            b.y += dy * push
                        }
                    }
                }
            }

            // Bounce off the component's own box.
            const bounce = t.bounce
            for (let i = 0; i < n; i++) {
                const l = letters[i]
                if (l.locked) continue
                if (l.x < 0) {
                    l.x = 0
                    l.px = l.x + (l.x - l.px) * bounce
                }
                if (l.x + l.w > rootW) {
                    l.x = rootW - l.w
                    l.px = l.x + (l.x - l.px) * bounce
                }
                if (l.y < 0) {
                    l.y = 0
                    l.py = l.y + (l.y - l.py) * bounce
                }
                if (l.y + lh > rootH) {
                    l.y = rootH - lh
                    l.py = l.y + (l.y - l.py) * bounce
                }
            }
        }

        const render = (now: number) => {
            frame = requestAnimationFrame(render)
            if (last < 0) {
                last = now
                return
            }
            const dt = Math.min((now - last) / 1000, MAX_STEPS * FIXED_DT)
            last = now

            const t = tuning.current
            let target = targetRef.current
            if (!t.reverse) {
                reached = Math.max(reached, target)
                target = reached
            } else {
                reached = target
            }
            progressRef.current += (target - progressRef.current) * t.smoothing

            accumulator += dt
            const { w: rootW, h: rootH } = stageSize(root)
            while (accumulator >= FIXED_DT) {
                simulate(rootW, rootH)
                accumulator -= FIXED_DT
            }

            const sim = simRef.current
            if (!sim) return
            const spans = spansRef.current
            for (let i = 0; i < sim.letters.length; i++) {
                const l = sim.letters[i]
                if (
                    Math.abs(l.x - l.tx) < 0.01 &&
                    Math.abs(l.y - l.ty) < 0.01
                ) {
                    continue
                }
                l.tx = l.x
                l.ty = l.y
                const span = spans[i]
                if (span) {
                    span.style.transform = `translate(${l.x.toFixed(2)}px, ${l.y.toFixed(2)}px)`
                }
            }
        }

        frame = requestAnimationFrame(render)
        return () => cancelAnimationFrame(frame)
    }, [glyphs])

    /* ----------------------------------------------------------- rendering */

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                // Deliberately not `overflow: hidden` — that would kill the
                // sticky stage. The stage does the clipping instead.
                background,
                userSelect: "none",
                WebkitUserSelect: "none",
                ...props.style,
            }}
        >
            {/* The paragraph as text, for screen readers and copy-paste. */}
            <span
                style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    margin: -1,
                    padding: 0,
                    overflow: "hidden",
                    clip: "rect(0 0 0 0)",
                    whiteSpace: "nowrap",
                    border: 0,
                }}
            >
                {text}
            </span>

            <div
                ref={stageRef}
                aria-hidden="true"
                style={{
                    position: "sticky",
                    top: 0,
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                }}
            >
                {glyphs.map((ch, i) => (
                    <span
                        key={i}
                        ref={(el) => {
                            spansRef.current[i] = el
                        }}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            fontFamily,
                            fontSize,
                            fontWeight,
                            fontStyle,
                            // Tracking is already baked into the measured
                            // positions, so it must not be applied again here.
                            // Match the measured line box so the DOM glyphs and
                            // the layout use the same vertical rhythm.
                            lineHeight: `${lineHeight}px`,
                            color,
                            whiteSpace: "pre",
                            pointerEvents: "none",
                        }}
                    >
                        {ch}
                    </span>
                ))}
            </div>
        </div>
    )
}
