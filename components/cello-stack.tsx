"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { animate } from "motion/react"
import type { AnimationPlaybackControls, Transition } from "motion/react"
import * as THREE from "three"

// Framer's editing canvas does not exist outside Framer: this build always
// renders in a real browser. Same values the live preview runs under.
const RenderTarget = {
    current: () => "preview",
    hasRestrictions: () => false,
    canvas: "canvas",
    export: "export",
    preview: "preview",
    thumbnail: "thumbnail",
}

/**
 * Cello Stack — a pile of picture cards sealed in crinkled plastic, the next
 * card sliding up over the last and pushing the pile into slivers at the top.
 *
 * Built after a reference animation supplied as ten still frames: a square
 * record sleeve on black, filled with alternating cyan and yellow ticket stubs,
 * each carrying a header line, a stub column of small print and badges, and one
 * huge condensed word — all of it under shrink-wrap with milky, crumpled edges.
 * There was no source to transcribe, so everything here is measured off those
 * frames, alongside a written brief. The name is ours.
 *
 * Each card is one of the user's Images, cover-cropped on its own proportions
 * with a per-picture Y Offset — design the ticket elsewhere, drop it in here.
 * With no images the pile deals two generated placeholder tickets drawn after
 * the reference's layout. Their copy is ours (AFTER / HOURS): the reference is
 * a real release's artwork, and its names are not ours to ship.
 *
 * WHAT THE FRAMES SAY
 *
 *   The lower card is always in front.  Every card hides the bottom of the one
 *       above it; nothing ever overlaps the other way. So the pile is drawn top
 *       (back) to bottom (front), and each card shows only its own top band.
 *   The pile compresses upward.  At rest the front card's top edge sits at
 *       0.46 of the sleeve and the ones behind at 0.22, 0.09, 0.03, 0 — each
 *       gap half the one below it (STACK_RATIO). Four slivers behind the front
 *       card is the reference (Stack 4). The front card shows whole, and the
 *       next one peeks 3.5% of the sleeve in at the bottom (PEEK).
 *   It moves in steps.  In seven of the ten frames the front card's top sits
 *       within 0.44–0.50 of the sleeve; the other three catch it mid-flight.
 *       So it holds, then deals the next card — driven here by framer-motion's
 *       `animate` on the panel's Transition, then Hold seconds of rest.
 *   A card is 0.52 of the sleeve tall (Card Height 52) and runs its full
 *       width; the left edges step by a pixel or two from card to card
 *       (JITTER), drifting slightly over time.
 *   The plastic.  A faint even haze, broad soft horizontal sheens, and crumple
 *       that is strongest at the edges and worst at the bottom-left corner,
 *       where the film bunches and overhangs the sleeve white.
 *
 * DRAG
 *
 *   The pile is a scrub: drag up and every card rides up with the pointer,
 *   the front one following it one-for-one at Sensitivity 5 (a card's travel
 *   is its own height). Let go and it settles on the nearest whole card —
 *   or, after a throw, on the one the throw's speed carries it to — played on
 *   the panel's Transition with that speed handed in, so the default spring
 *   overshoots and bounces back into place. A tap deals the next card. Auto
 *   play waits while a hand is on it and resumes Hold seconds after it lands.
 *
 * WHERE THIS DEPARTS FROM THE WRITTEN BRIEF, AND WHY
 *
 *   The brief scrolls one big-word texture across all the boxes by UV. The
 *       frames do not: the yellow card always carries the first word and the
 *       cyan the second, and a word is cut exactly where the card in front of
 *       it begins. So each card's artwork rides with its own card here — which
 *       is also what lets a card be a picture.
 *   The brief wraps each box in a MeshPhysicalMaterial with transmission. The
 *       view is dead front-on, where transmission reduces to "the stack seen
 *       through a bumpy film" — so the stack is rendered once to a target and
 *       a wrap shader refracts it through a procedural crinkle normal field
 *       (edge- and corner-weighted, as the brief asks) and lights it with
 *       drifting horizontal sheens and glints. The film is one sheet over the
 *       whole sleeve, as in the frames, not one per box.
 *   Cuboids seen dead-on show only their front face. The box depth reads in
 *       the frames as a darker lip on each top edge and the shadow it drops on
 *       the card behind — so those two are drawn, and the rest is a plane.
 *
 * The `framer` import supplies the property controls only — under plain Next.js,
 * alias it to a stub exporting a no-op `addPropertyControls`, a `ControlType`
 * object, and a `RenderTarget` with `current: () => "preview"`.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 560
 * @framerIntrinsicHeight 560
 * @framerDisableUnlink
 */

/* --------------------------------------------------------------- constants --
 * The pile's shape, the sleeve and the light are the look, not knobs.
 */

/** Margin between the frame and the sleeve, as a share of the shorter side —
 * room for the film's overhang to show against the Background. */
const SLEEVE_INSET = 0.06

/** Each sliver of the pile is this share of the one below it. Measured gaps
 * between top edges at rest: 0.24, 0.13, 0.06, 0.03 of the sleeve. */
const STACK_RATIO = 0.5

/** How much of the next card shows at the bottom while the front one rests. */
const PEEK = 0.035

/** Card width as a share of the sleeve; the slack is where jitter lives. */
const CARD_W = 0.99

/** Horizontal stagger per card, as a share of the sleeve's width: a fixed
 * offset per card plus a slow drift of about a third of that. */
const JITTER = 0.0045
const JITTER_DRIFT = 0.35

/** The shadow a card's top edge drops on the card behind, in sleeve heights,
 * and how dark it is right at the edge. */
const SHADOW_H = 0.032
const SHADOW_ALPHA = 0.42

/** Cards further back are a shade darker, per step, down to a floor. */
const DEPTH_SHADE = 0.03
const DEPTH_SHADE_MIN = 0.86

/** What shows inside the sleeve where no card covers it. */
const SLEEVE_INSIDE = 0x121212

/** The darker lip on each card's top edge, as a share of the card. */
const LIP = 0.022

/** Every card the pile can show at once: Stack's max, the front, and the two
 * on their way in, plus one in flight at either end. */
const STACK_MAX = 8
const POOL = STACK_MAX + 4

/** A card whose picture has not landed yet (or would not load) fills its box
 * with this, so the pile keeps its shape while it waits. */
const PENDING_FILL = new THREE.Vector3(0.14, 0.14, 0.14)

/** The placeholder tickets' type: a heavy condensed face for the big word and
 * stub title, and a plain grotesque for the small print, which holds at 8px
 * where a display face would close up. Fixed — they are demo artwork, not a
 * typesetting job; real cards are the user's own pictures. */
const PLACEHOLDER_FONT: React.CSSProperties = {
    fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', 'Franklin Gothic Bold', sans-serif",
    fontWeight: 400,
}
const UI_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const PLACEHOLDER_INK = "#111111"

/** Texture width bounds for one placeholder ticket. */
const TEX_MIN = 256
const TEX_MAX = 2048

/** How fast the glare eases toward the pointer, per second. */
const GLARE_EASE = 4

/** A press that moves less than this is a tap, which deals the next card. */
const TAP_SLOP = 5
/** How far ahead a throw is projected, in seconds of its release speed, to
 * pick the card it lands on — and the most cards one throw can move. */
const THROW_LOOKAHEAD = 0.22
const THROW_MAX = 3
/** A release this long after the pointer last moved is a drop, not a throw. */
const THROW_STALE_MS = 90

/* ------------------------------------------------------------------- types -- */

type Direction = "up" | "down"

/** What `ControlType.ResponsiveImage` hands over, or a bare URL. */
export type ImageSource = string | { src?: string; srcSet?: string; alt?: string }

export interface ImageItem {
    image?: ImageSource
    /** Which band of the picture's crop shows: -250 its bottom edge, 0 the
     * centre, 250 its top. A share of the crop, never pixels. */
    offsetY?: number
}

export interface Wrap {
    /** Seal the stack in plastic, or show it bare. */
    show: boolean
    /** How bright the sheens and glints on the film are. */
    gloss: number
    /** How crumpled the film is — most at the edges and bottom-left. */
    crinkle: number
}

export interface CelloStackProps {
    /** One card per picture, dealt in order and repeated. Bare images are
     * accepted too. Empty deals the placeholder tickets. */
    images: (ImageItem | ImageSource)[]
    /** Around the sleeve. */
    background: string
    /** How many cards peek out above the front one. */
    stack: number
    /** Card height, as a percentage of the sleeve. Cards run its full width. */
    cardHeight: number
    radius: number
    wrap: Partial<Wrap>
    /** How far the sheen on the film swings after the pointer. 0 holds it. */
    glareFollow: number
    /** Drag the pile up or down by hand; a tap deals the next card. */
    drag: boolean
    /** How far the pile travels per pixel dragged. 5 keeps the front card
     * under the pointer. */
    sensitivity: number
    /** Seconds each card rests before the next is dealt. */
    hold: number
    direction: Direction
    /** Drives the deal — one card's travel from below into the front — and
     * the settle after a drag, which starts at the throw's own speed. */
    transition: Transition
    style?: React.CSSProperties
}

/* ---------------------------------------------------------------- defaults -- */

/** A placeholder ticket's copy and colour, measured off the reference's two. */
type Ticket = { word: string; title: string; line: string; color: string }

const PLACEHOLDERS: Ticket[] = [
    {
        word: "AFTER",
        title: "SLOW CITY",
        line: "SIDE A · TRACK 04 · RECORDED LIVE AT DUSK",
        color: "#F8C62B",
    },
    {
        word: "HOURS",
        title: "HALCYON",
        line: 'FROM THE RECORD "NIGHT DRIVE"',
        color: "#22A6E0",
    },
]

const DEFAULT_WRAP: Wrap = { show: true, gloss: 5, crinkle: 5 }

/** Underdamped (damping ratio ≈ 0.55): a card lands, overshoots its resting
 * line by about an eighth of its travel and springs back — the bouncy end.
 * The frames' own give is smaller (damping 18 gets it); this is livelier so a
 * throw reads as physical. Picks up a throw's speed as its start velocity. */
const DEFAULT_TRANSITION: Transition = { type: "spring", stiffness: 170, damping: 14, mass: 1 }

const DEFAULTS = {
    images: [],
    background: "#000000",
    stack: 4,
    cardHeight: 42,
    radius: 2,
    wrap: DEFAULT_WRAP,
    glareFollow: 4,
    drag: true,
    sensitivity: 10,
    hold: 1.4,
    direction: "down",
    transition: {

        defaultValue: {"mass":1,"type":"spring","damping":14,"stiffness":170},"type":"spring","stiffness":170,"damping":14,"mass":1},
}

/** One resolved card picture. The offset is carried as given and read at
 * draw time, so dragging it re-frames every card already in the pile. */
type Picture = { src: string; alt: string; offsetY: number }

type Config = {
    /** Empty means placeholders. */
    pictures: Picture[]
    stack: number
    cardHeight: number
    radius: number
    wrap: Wrap
    glareFollow: number
}

/* ----------------------------------------------------------------- helpers -- */

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** A stable 0…1 per integer — each dealt card keeps its own stagger. */
function hash(k: number): number {
    const x = Math.sin(k * 127.1 + 311.7) * 43758.5453
    return x - Math.floor(x)
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n)
}

function isItem(entry: ImageItem | ImageSource): entry is ImageItem {
    return typeof entry === "object" && entry !== null && ("image" in entry || "offsetY" in entry)
}

/** The picture in an entry, whether it is an `{ image, offsetY }` row, a bare
 * ResponsiveImage object, or a URL string. */
function imageOf(entry: ImageItem | ImageSource | null | undefined): { src: string; alt: string } {
    if (!entry) return { src: "", alt: "" }
    const source = isItem(entry) ? entry.image : entry
    if (!source) return { src: "", alt: "" }
    if (typeof source === "string") return { src: source, alt: "" }
    return { src: source.src || "", alt: source.alt || "" }
}

function offsetOf(entry: ImageItem | ImageSource | null | undefined): number {
    if (!entry || !isItem(entry)) return 0
    return clamp(entry.offsetY ?? 0, -250, 250, 0)
}

/** The panel's list as pictures; rows with no picture yet are skipped. */
function picturesOf(input: (ImageItem | ImageSource)[] | undefined): Picture[] {
    if (!Array.isArray(input)) return []
    const out: Picture[] = []
    for (const entry of input) {
        const { src, alt } = imageOf(entry)
        if (src) out.push({ src, alt, offsetY: offsetOf(entry) })
    }
    return out
}

/**
 * The cover crop for a picture in a card, as texture-space scale and offset
 * (v measured from the picture's top). `cover` overflows the box on one axis;
 * the offset picks which part of that overflow shows — as a share of it, never
 * as pixels — exactly `objectPosition: 50% ${50 - (offsetY / 250) * 50}%`. So
 * -250 sits the picture's bottom edge on the card's, 250 its top, and 0 is the
 * centred crop the box would have had anyway.
 */
function coverCrop(
    imageW: number,
    imageH: number,
    boxW: number,
    boxH: number,
    offsetY: number
): [number, number, number, number] {
    if (imageW <= 0 || imageH <= 0 || boxW <= 0 || boxH <= 0) return [1, 1, 0, 0]
    const imageAspect = imageW / imageH
    const boxAspect = boxW / boxH
    if (imageAspect > boxAspect) {
        // Wider than the box: crop the sides, centred. No band to choose.
        const sx = boxAspect / imageAspect
        return [sx, 1, (1 - sx) / 2, 0]
    }
    const sy = imageAspect / boxAspect
    const position = (50 - (offsetY / 250) * 50) / 100
    return [1, sy, 0, position * (1 - sy)]
}

/** Natural sizes, per URL, shared across instances. */
const naturalSizes = new Map<string, { w: number; h: number }>()

/* -------------------------------------------------------------- pile curve --
 * Where a card's top edge sits, as a share of the sleeve, against its place in
 * the pile p: 0 the front card at rest, 1 the next one peeking in at the
 * bottom, -1 … -N the slivers behind. Knots at whole p, joined by a monotone
 * cubic so a card never stalls or kinks as it passes a resting place.
 */

type Curve = { x0: number; ys: number[]; ms: number[] }

function buildCurve(stack: number, cardHeight: number): Curve {
    const N = stack
    const y0 = 1 - PEEK - cardHeight
    const y1 = 1 - PEEK
    const rN = Math.pow(STACK_RATIO, N)
    const ys: number[] = [0] // p = -N-1: buried under the top sliver
    for (let p = -N; p <= 0; p++) {
        ys.push((y0 * (Math.pow(STACK_RATIO, -p) - rN)) / (1 - rN))
    }
    ys.push(y1, 2 * y1 - y0) // p = 1 peeking, p = 2 below the sleeve

    // Fritsch–Carlson tangents on unit spacing.
    const n = ys.length
    const d: number[] = []
    for (let i = 0; i < n - 1; i++) d.push(ys[i + 1] - ys[i])
    const ms: number[] = new Array(n).fill(0)
    ms[0] = d[0]
    ms[n - 1] = d[n - 2]
    for (let i = 1; i < n - 1; i++) ms[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
    for (let i = 0; i < n - 1; i++) {
        if (d[i] === 0) {
            ms[i] = 0
            ms[i + 1] = 0
            continue
        }
        const a = ms[i] / d[i]
        const b = ms[i + 1] / d[i]
        const s = a * a + b * b
        if (s > 9) {
            const t = 3 / Math.sqrt(s)
            ms[i] = t * a * d[i]
            ms[i + 1] = t * b * d[i]
        }
    }
    return { x0: -N - 1, ys, ms }
}

function evalCurve(c: Curve, p: number): number {
    const n = c.ys.length
    const x = p - c.x0
    if (x <= 0) return c.ys[0]
    if (x >= n - 1) return c.ys[n - 1] + c.ms[n - 1] * (x - (n - 1))
    const i = Math.floor(x)
    const t = x - i
    const t2 = t * t
    const t3 = t2 * t
    return (
        (2 * t3 - 3 * t2 + 1) * c.ys[i] +
        (t3 - 2 * t2 + t) * c.ms[i] +
        (-2 * t3 + 3 * t2) * c.ys[i + 1] +
        (t3 - t2) * c.ms[i + 1]
    )
}

/* ------------------------------------------------------------- card artwork --
 * One card drawn to a canvas at its on-screen proportions. Positions are shares
 * of the card's width and height, measured off the reference's 400 × 210 stub;
 * sizes use `u`, the height capped at the reference's aspect, so a wide card
 * does not grow its badges past their column.
 */

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string }

function setSpacing(ctx: Ctx, spacing: React.CSSProperties["letterSpacing"]) {
    if (!("letterSpacing" in ctx)) return
    try {
        ctx.letterSpacing =
            spacing === undefined || spacing === null
                ? "0px"
                : typeof spacing === "number"
                  ? `${spacing}px`
                  : String(spacing)
    } catch {
        /* an unparseable value leaves the default */
    }
}

function displayFont(font: React.CSSProperties, px: number): string {
    const family = font.fontFamily || (PLACEHOLDER_FONT.fontFamily as string)
    const style = font.fontStyle === "italic" ? "italic" : "normal"
    return `${style} ${font.fontWeight ?? 400} ${px}px ${family}`
}

function uiFont(px: number, weight = 700): string {
    return `normal ${weight} ${px}px ${UI_FONT}`
}

/** Cap height as a share of the font size, measured once per face. */
function capRatio(ctx: Ctx, font: string): number {
    ctx.font = font.replace(/\d+(\.\d+)?px/, "100px")
    const m = ctx.measureText("H")
    const a = m.actualBoundingBoxAscent
    return a && isFinite(a) && a > 10 ? a / 100 : 0.72
}

/** Small print on one line, shrunk to fit its width rather than clipped. */
function smallText(
    ctx: Ctx,
    text: string,
    x: number,
    baseline: number,
    px: number,
    maxW: number,
    weight = 700,
    align: CanvasTextAlign = "left"
) {
    if (!text) return
    setSpacing(ctx, "0px")
    ctx.font = uiFont(px, weight)
    const w = ctx.measureText(text).width
    if (w > maxW && maxW > 0) ctx.font = uiFont(px * (maxW / w), weight)
    ctx.textAlign = align
    ctx.textBaseline = "alphabetic"
    ctx.fillText(text, x, baseline)
}

/**
 * The big word: caps the full height of its box, set to the box's width. A
 * word that runs wide is condensed (to half), one that runs short is spread a
 * little (to 1.25×) and centred — the reference word always spans the card.
 */
function bigWord(
    ctx: Ctx,
    word: string,
    box: { x: number; y: number; w: number; h: number },
    font: React.CSSProperties
) {
    const text = word.trim()
    if (!text) return
    const ratio = capRatio(ctx, displayFont(font, 100))
    let px = box.h / ratio
    ctx.font = displayFont(font, px)
    setSpacing(ctx, font.letterSpacing)
    const tw = ctx.measureText(text).width
    if (tw <= 0) return
    let sx = box.w / tw
    if (sx < 0.5) {
        px *= sx / 0.5
        sx = 0.5
        ctx.font = displayFont(font, px)
    }
    sx = Math.min(sx, 1.25)
    const cap = px * ratio
    const drawnW = tw * (px / (box.h / ratio)) * sx
    ctx.save()
    ctx.translate(box.x + (box.w - drawnW) / 2, box.y + (box.h + cap) / 2)
    ctx.scale(sx, 1)
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
    ctx.fillText(text, 0, 0)
    ctx.restore()
}

/** The stub's heading: one line, or two when splitting the words sets it
 * meaningfully bigger — "HALCYON" on one, "SLOW / CITY" on two. */
function stubTitle(
    ctx: Ctx,
    title: string,
    box: { x: number; y: number; w: number; h: number },
    font: React.CSSProperties
) {
    const words = title.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return
    const ratio = capRatio(ctx, displayFont(font, 100))
    setSpacing(ctx, font.letterSpacing)
    const widthAt100 = (s: string) => {
        ctx.font = displayFont(font, 100)
        return ctx.measureText(s).width / 100
    }
    const lineCap = box.h * 0.5
    const gapShare = 0.22
    const fit = (lines: string[]) => {
        const capH = lines.length === 1 ? lineCap : (box.h / (2 + gapShare))
        let px = capH / ratio
        const widest = Math.max(...lines.map(widthAt100))
        if (widest * px > box.w) px = box.w / widest
        return px
    }
    let lines = [words.join(" ")]
    let px = fit(lines)
    if (words.length > 1) {
        let best: string[] = lines
        let bestPx = 0
        for (let i = 1; i < words.length; i++) {
            const pair = [words.slice(0, i).join(" "), words.slice(i).join(" ")]
            const p2 = fit(pair)
            if (p2 > bestPx) {
                bestPx = p2
                best = pair
            }
        }
        if (bestPx > px * 1.15) {
            lines = best
            px = bestPx
        }
    }
    ctx.font = displayFont(font, px)
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
    const cap = px * ratio
    lines.forEach((l, i) => ctx.fillText(l, box.x, box.y + cap + i * cap * (1 + gapShare)))
}

function rule(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + w, y, x + w, y + h, rr)
    ctx.arcTo(x + w, y + h, x, y + h, rr)
    ctx.arcTo(x, y + h, x, y, rr)
    ctx.arcTo(x, y, x + w, y, rr)
    ctx.closePath()
}

function arrow(ctx: Ctx, x0: number, x1: number, y: number, head: number) {
    rule(ctx, x0, y, x1, y)
    ctx.beginPath()
    ctx.moveTo(x1 - head, y - head)
    ctx.lineTo(x1, y)
    ctx.lineTo(x1 - head, y + head)
    ctx.stroke()
}

function star(ctx: Ctx, cx: number, cy: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(cx, cy - r)
    ctx.quadraticCurveTo(cx, cy, cx + r * 0.8, cy)
    ctx.quadraticCurveTo(cx, cy, cx, cy + r)
    ctx.quadraticCurveTo(cx, cy, cx - r * 0.8, cy)
    ctx.quadraticCurveTo(cx, cy, cx, cy - r)
    ctx.fill()
}

/** Four small squares on the diagonals — the reference's little "x" mark. */
function dotCross(ctx: Ctx, cx: number, cy: number, s: number) {
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.fillRect(cx + dx * s - s / 2, cy + dy * s - s / 2, s, s)
    }
}

function drawHeaderPlayer(ctx: Ctx, W: number, H: number, u: number) {
    const cy = H * 0.12
    const s = u * 0.022
    const x = W * 0.785
    ctx.beginPath()
    ctx.moveTo(x, cy - s)
    ctx.lineTo(x + s * 1.5, cy)
    ctx.lineTo(x, cy + s)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(x + s * 2.2, cy - s, s * 0.45, s * 2)
    ctx.fillRect(x + s * 3.1, cy - s, s * 0.45, s * 2)
    rule(ctx, W * 0.83, cy, W * 0.915, cy)
    ctx.beginPath()
    ctx.arc(W * 0.885, cy, u * 0.012, 0, Math.PI * 2)
    ctx.fill()
    smallText(ctx, "4:26", W * 0.965, cy + u * 0.016, u * 0.044, W * 0.05, 700, "right")
}

function drawStub(ctx: Ctx, W: number, H: number, u: number, colX: number, index: number, fill: string) {
    const x = W * 0.035
    const right = colX - W * 0.015
    const mid = (x + right) / 2

    // A few lines of liner notes.
    const notes = ["Cut at half speed", "for a warmer low", "end. Side A."]
    notes.forEach((n, i) =>
        smallText(ctx, n, x, H * 0.285 + i * u * 0.035, u * 0.026, W * 0.125, 500)
    )
    // An asterisk in a ring.
    const ax = right - u * 0.03
    const ay = H * 0.315
    const ar = u * 0.024
    ctx.beginPath()
    ctx.arc(ax, ay, ar, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3 + Math.PI / 2
        rule(ctx, ax - Math.cos(a) * ar * 0.6, ay - Math.sin(a) * ar * 0.6, ax + Math.cos(a) * ar * 0.6, ay + Math.sin(a) * ar * 0.6)
    }

    // Number pill, arrow, mark.
    const py = H * 0.39
    const ph = u * 0.07
    const pw = W * 0.072
    roundRect(ctx, x, py, pw, ph, ph * 0.2)
    ctx.stroke()
    smallText(ctx, `No.${pad2(index + 1)}`, x + pw / 2, py + ph * 0.7, u * 0.036, pw * 0.85, 800, "center")
    arrow(ctx, x + pw + W * 0.012, x + pw + W * 0.05, py + ph / 2, u * 0.016)
    dotCross(ctx, right - u * 0.03, py + ph / 2, u * 0.011)

    rule(ctx, x, H * 0.495, right, H * 0.495)

    // Emblem: an oval mark on even cards, a globe on odd ones.
    const ey = H * 0.58
    if (index % 2 === 0) {
        const ew = Math.min(W * 0.05, u * 0.1)
        const eh = u * 0.042
        ctx.beginPath()
        ctx.ellipse(mid, ey, ew, eh, 0, 0, Math.PI * 2)
        ctx.stroke()
        for (let i = -1; i <= 1; i++) {
            const bx = mid + i * eh * 0.55
            rule(ctx, bx - eh * 0.25, ey + eh * 0.45, bx + eh * 0.25, ey - eh * 0.45)
        }
    } else {
        const r = u * 0.05
        ctx.beginPath()
        ctx.arc(mid, ey, r, 0, Math.PI * 2)
        ctx.stroke()
        for (const k of [0.35, 0.75]) {
            ctx.beginPath()
            ctx.ellipse(mid, ey, r * k, r, 0, 0, Math.PI * 2)
            ctx.stroke()
        }
        for (const k of [-0.5, 0, 0.5]) {
            const hw = r * Math.sqrt(1 - k * k)
            rule(ctx, mid - hw, ey + k * r, mid + hw, ey + k * r)
        }
    }

    rule(ctx, x, H * 0.665, right, H * 0.665)

    // The ring badge in a notched octagon.
    const by = H * 0.83
    const R = Math.min(u * 0.125, (right - x) / 2)
    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
        const a = Math.PI / 8 + (i * Math.PI) / 4
        const px = mid + Math.cos(a) * R * 1.08
        const py2 = by + Math.sin(a) * R * 1.08
        if (i === 0) ctx.moveTo(px, py2)
        else ctx.lineTo(px, py2)
    }
    ctx.closePath()
    ctx.fill()
    ctx.save()
    ctx.strokeStyle = fill
    ctx.fillStyle = fill
    ctx.lineWidth = Math.max(1, R * 0.03)
    ctx.beginPath()
    ctx.arc(mid, by, R * 0.86, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(mid, by, R * 0.42, 0, Math.PI * 2)
    ctx.stroke()
    const ring = "SONG OF THE DAY • SONG OF THE DAY • "
    ctx.font = uiFont(R * 0.17, 800)
    setSpacing(ctx, "0px")
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    for (let i = 0; i < ring.length; i++) {
        ctx.save()
        ctx.translate(mid, by)
        ctx.rotate((i / ring.length) * Math.PI * 2)
        ctx.fillText(ring[i], 0, -R * 0.64)
        ctx.restore()
    }
    rule(ctx, mid, by - R * 0.26, mid, by + R * 0.26)
    rule(ctx, mid - R * 0.13, by - R * 0.08, mid + R * 0.13, by - R * 0.08)
    ctx.restore()
}

function drawFooter(ctx: Ctx, W: number, H: number, u: number, index: number) {
    const x = W * 0.27
    smallText(ctx, "SIDE", x, H * 0.775, u * 0.026, W * 0.05, 700)
    smallText(ctx, `A·${pad2(index + 1)}`, x, H * 0.775 + u * 0.032, u * 0.026, W * 0.05, 700)
    arrow(ctx, x, x + W * 0.045, H * 0.895, u * 0.018)
    for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.arc(x + u * 0.008 + i * u * 0.026, H * 0.955, u * 0.008, 0, Math.PI * 2)
        ctx.fill()
    }
    star(ctx, W * 0.36, H * 0.79, u * 0.05)
    star(ctx, W * 0.39, H * 0.9, u * 0.036)
    star(ctx, W * 0.405, H * 0.775, u * 0.016)
    rule(ctx, W * 0.425, H * 0.74, W * 0.425, H * 0.975)

    // A waveform in a box, its own shape per card.
    const bx = W * 0.445
    const bw = W * 0.21
    const by = H * 0.75
    const bh = H * 0.2
    ctx.strokeRect(bx, by, bw, bh)
    const ph = index * 1.7 + 0.4
    ctx.beginPath()
    ctx.moveTo(bx, by + bh)
    const steps = 64
    for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const env = Math.sin(Math.PI * t) * 0.8 + 0.2
        const w = 0.55 * Math.sin(t * 7 + ph) + 0.3 * Math.sin(t * 13 + ph * 2) + 0.15 * Math.sin(t * 23 + ph * 3)
        ctx.lineTo(bx + t * bw, by + bh * (0.6 - 0.32 * w * env))
    }
    ctx.lineTo(bx + bw, by + bh)
    ctx.closePath()
    ctx.fill()

    const rx = W * 0.685
    if (index % 2 === 0) {
        smallText(ctx, "PLAYLIST:", rx, H * 0.78, u * 0.03, W * 0.13, 800)
        smallText(ctx, "NIGHT DRIVE", rx, H * 0.78 + u * 0.035, u * 0.03, W * 0.13, 800)
        smallText(ctx, "MIX", rx, H * 0.78 + u * 0.07, u * 0.03, W * 0.13, 800)
        const tx = W * 0.86
        const tw = W * 0.07
        const th = u * 0.05
        const ty = H * 0.775
        roundRect(ctx, tx, ty, tw, th, th / 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(tx + th / 2, ty + th / 2, th * 0.28, 0, Math.PI * 2)
        ctx.stroke()
    } else {
        // An elbow arrow into a TRACK pill.
        const ay = H * 0.8
        rule(ctx, rx + W * 0.06, ay, rx + W * 0.06, ay - u * 0.03)
        rule(ctx, rx + W * 0.06, ay, rx, ay)
        ctx.beginPath()
        ctx.moveTo(rx + u * 0.014, ay - u * 0.014)
        ctx.lineTo(rx, ay)
        ctx.lineTo(rx + u * 0.014, ay + u * 0.014)
        ctx.stroke()
        const tx = W * 0.85
        const tw = W * 0.105
        const th = u * 0.065
        const ty = ay - th / 2
        roundRect(ctx, tx, ty, tw, th, th * 0.15)
        ctx.stroke()
        smallText(ctx, "TRACK", tx + tw / 2, ty + th * 0.72, u * 0.04, tw * 0.8, 800, "center")
    }
    // A word mark: two slashes and WAVES.
    const wy = H * 0.945
    const wx = W * 0.705
    const s = u * 0.045
    for (let i = 0; i < 2; i++) {
        const sx = wx + i * s * 0.55
        ctx.beginPath()
        ctx.moveTo(sx + s * 0.3, wy - s)
        ctx.lineTo(sx + s * 0.5, wy - s)
        ctx.lineTo(sx + s * 0.2, wy)
        ctx.lineTo(sx, wy)
        ctx.closePath()
        ctx.fill()
    }
    smallText(ctx, "WAVES", wx + s * 1.35, wy, u * 0.062, W * 0.2, 900)
}

/** One placeholder ticket. The box's lip is not drawn here — the card shader
 * adds it, so a picture card gets the same edge. */
function drawTicket(ticket: Ticket, index: number, W: number, H: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas")
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext("2d") as Ctx | null
    if (!ctx) return canvas

    const fill = ticket.color
    const ink = PLACEHOLDER_INK
    const font = PLACEHOLDER_FONT
    const u = Math.min(H, W * 0.53)

    ctx.fillStyle = fill
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = ink
    ctx.strokeStyle = ink
    ctx.lineWidth = Math.max(1, u * 0.006)
    ctx.lineCap = "butt"

    const colX = W * 0.235
    rule(ctx, colX, H * 0.055, colX, H * 0.975)

    const headX = W * 0.265
    smallText(ctx, ticket.line, headX, H * 0.12 + u * 0.021, u * 0.058, W * 0.765 - headX, 800)
    drawHeaderPlayer(ctx, W, H, u)

    ctx.fillStyle = ink
    bigWord(ctx, ticket.word, { x: W * 0.262, y: H * 0.215, w: W * 0.705, h: H * 0.47 }, font)
    stubTitle(
        ctx,
        ticket.title,
        { x: W * 0.035, y: H * 0.065, w: colX - W * 0.05, h: Math.min(H * 0.19, u * 0.19) },
        font
    )

    drawStub(ctx, W, H, u, colX, index, fill)
    ctx.fillStyle = ink
    ctx.strokeStyle = ink
    drawFooter(ctx, W, H, u, index)
    return canvas
}

/* ----------------------------------------------------------------- shaders -- */

const CARD_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const CARD_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uFill;
uniform vec4 uCrop;
uniform vec2 uSize;
uniform float uRadius;
uniform float uShade;
uniform float uDpr;
uniform float uLip;
varying vec2 vUv;
float sdRound(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
    vec2 p = (vUv - 0.5) * uSize;
    float d = sdRound(p, uSize * 0.5, min(uRadius, 0.5 * min(uSize.x, uSize.y)));
    float a = clamp(0.5 - d * uDpr, 0.0, 1.0);

    // Cover crop: st is the picture's own 0…1 with v from its top; the
    // texture is uploaded flipped, so v is turned back for the lookup.
    vec2 st = vec2(vUv.x, 1.0 - vUv.y) * uCrop.xy + uCrop.zw;
    vec3 c = uHasMap > 0.5 ? texture2D(uMap, vec2(st.x, 1.0 - st.y)).rgb : uFill;

    // The box's top edge: a darker lip and a catch of light under it.
    float fromTop = (1.0 - vUv.y) * uSize.y;
    float lip = uLip * uSize.y;
    float catchLight = max(1.0 / uDpr, uSize.y * 0.006);
    if (fromTop < lip) c *= 0.88;
    else if (fromTop < lip + catchLight) c = mix(c, vec3(1.0), 0.3);

    gl_FragColor = vec4(c * uShade, a);
}
`

const SHADOW_FRAGMENT = /* glsl */ `
uniform float uAlpha;
varying vec2 vUv;
void main() {
    float fall = 1.0 - vUv.y;
    float ends = smoothstep(0.0, 0.01, vUv.x) * smoothstep(1.0, 0.99, vUv.x);
    gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha * fall * fall * ends);
}
`

const WRAP_VERTEX = /* glsl */ `
void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/**
 * The film. Everything is in device pixels off gl_FragCoord: q is the sleeve's
 * own 0…1 (y up), p the same in sleeve-short-sides so the noise is round.
 * A ridged-noise height field — long folds plus fine crumple — is weighted to
 * the edges and corners (bottom-left most), and its normal both refracts the
 * stack beneath and catches the light.
 */
const WRAP_FRAGMENT = /* glsl */ `
uniform sampler2D uStack;
uniform vec4 uRect;
uniform float uTime;
uniform float uWrap;
uniform float uGloss;
uniform float uCrinkle;
uniform vec2 uGlare;

float sq(float x) { return x * x; }
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float ridged(vec2 p) {
    float a = 0.0;
    float amp = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 4; i++) {
        float n = noise(p);
        a += amp * (1.0 - abs(2.0 * n - 1.0));
        p = m * p;
        amp *= 0.5;
    }
    return a;
}
float field(vec2 p, float mask) {
    float folds = ridged(vec2(p.x * 0.6 + p.y * 0.35, p.y * 1.1 - p.x * 0.3) * 5.0);
    float crumple = ridged(p * 18.0 + 7.3);
    return mask * (0.7 * folds + 0.35 * crumple);
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 size = uRect.zw - uRect.xy;
    float S = min(size.x, size.y);
    vec2 q = (frag - uRect.xy) / size;
    vec2 p = (frag - uRect.xy) / S;
    vec2 dd = max(uRect.xy - frag, frag - uRect.zw);
    float beyond = max(dd.x, dd.y) / S;
    bool inside = beyond <= 0.0;

    if (uWrap < 0.5) {
        if (!inside) discard;
        gl_FragColor = vec4(texture2D(uStack, q).rgb, 1.0);
        return;
    }

    vec2 top = size / S;
    float corners = exp(-length(p) / 0.16)
        + 0.45 * (exp(-length(p - top) / 0.12)
                + exp(-length(p - vec2(top.x, 0.0)) / 0.12)
                + exp(-length(p - vec2(0.0, top.y)) / 0.12));
    corners = min(corners, 1.2);

    // The film overhangs the sleeve a few pixels, raggedly, most at corners.
    float ragged = 0.003 + 0.012 * corners + 0.006 * noise(p * 40.0);
    if (beyond > ragged) discard;

    float inner = inside
        ? min(min(q.x * size.x, (1.0 - q.x) * size.x), min(q.y * size.y, (1.0 - q.y) * size.y)) / S
        : 0.0;
    float edge = exp(-inner / 0.03);
    // The face itself stays nearly smooth; the film crumples where it turns
    // the sleeve's edges and bunches at the corners.
    float mask = uCrinkle * (0.02 + 0.6 * edge + 0.9 * corners);

    float e = 1.5 / S;
    float h0 = field(p, mask);
    float hx = field(p + vec2(e, 0.0), mask);
    float hy = field(p + vec2(0.0, e), mask);
    vec3 n = normalize(vec3((h0 - hx) / e * 0.02, (h0 - hy) / e * 0.02, 1.0));

    // Light from the upper left, swung by the pointer.
    vec2 L = normalize(vec2(-0.55 + 0.6 * uGlare.x, 0.85 + 0.3 * uGlare.y));
    float facing = dot(n.xy, L) / 0.12;
    float lit = clamp(facing, 0.0, 1.0);
    float dark = clamp(-facing, 0.0, 1.0);
    float glint = lit * lit * lit;

    // Broad horizontal sheens that the creases bend and break.
    float t = uTime;
    float y = q.y + n.y * 0.6 + 0.015 * sin(q.x * 5.0 + t * 0.35);
    float c1 = 0.72 + 0.06 * sin(t * 0.21) + 0.15 * uGlare.y;
    float c2 = 0.28 + 0.05 * sin(t * 0.17 + 2.0) + 0.15 * uGlare.y;
    float broad = exp(-sq((y - c1) / 0.09)) * 0.55 + exp(-sq((y - c2) / 0.12)) * 0.35;
    broad *= smoothstep(-0.1, 0.6, q.x + 0.25 * uGlare.x) * (0.6 + 0.4 * noise(p * 3.0 + t * 0.05));
    float streak = exp(-sq((y - c1 - 0.05) / 0.012))
        * smoothstep(0.35, 0.9, noise(vec2(p.x * 9.0 - t * 0.3, 1.7)));

    float sheen = uGloss * (0.1 * broad + 0.35 * streak + 0.6 * glint);
    float milk = 0.18 * edge * (0.5 + 0.5 * noise(p * 30.0));

    if (inside) {
        vec3 col = texture2D(uStack, clamp(q + n.xy * 0.01, 0.001, 0.999)).rgb;
        col *= 1.0 - 0.22 * dark;
        col = mix(col, vec3(1.0), clamp(sheen + milk + 0.025, 0.0, 0.95));
        gl_FragColor = vec4(col, 1.0);
    } else {
        // Bare film past the sleeve's edge: milky, catching the same light.
        float a = clamp(0.55 + 0.35 * sheen, 0.0, 0.95) * clamp((ragged - beyond) * S, 0.0, 1.0);
        vec3 col = vec3(0.93) * (1.0 - 0.25 * dark);
        gl_FragColor = vec4(col * a, a);
    }
}
`

/* ------------------------------------------------------------------- scene -- */

type Slot = {
    card: THREE.Mesh
    cardMat: THREE.ShaderMaterial
    shadow: THREE.Mesh
    shadowMat: THREE.ShaderMaterial
}

class SleeveScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private stackScene = new THREE.Scene()
    private stackCamera: THREE.OrthographicCamera
    private target: THREE.WebGLRenderTarget
    private wrapScene = new THREE.Scene()
    private wrapCamera = new THREE.Camera()
    private wrapMat: THREE.ShaderMaterial
    private wrapMesh: THREE.Mesh
    private slots: Slot[] = []
    private plane = new THREE.PlaneGeometry(1, 1)
    /** Placeholder tickets, per index, redrawn when the card's size changes. */
    private tickets = new Map<number, { key: string; tex: THREE.CanvasTexture }>()
    /** The user's pictures, per URL. Independent of the card's size: the crop
     * is done in the shader, so a resize never reloads anything. */
    private pictures = new Map<string, { tex: THREE.Texture | null; w: number; h: number }>()
    private curve: Curve = buildCurve(DEFAULTS.stack, DEFAULTS.cardHeight / 100)

    private width = 1
    private height = 1
    private sw = 1
    private sh = 1
    private time = 0
    private glare = new THREE.Vector2()
    private glareTarget = new THREE.Vector2()
    private frameId = 0
    private lastT = 0
    private disposed = false
    private visible = true
    private observer: IntersectionObserver | null = null
    private reducedMotion: MediaQueryList | null = null
    private fontRequests = new Set<string>()

    /** Where the pile is, in cards dealt; set by the host's animation. */
    getScroll: () => number = () => 0
    /** Set by the host so a static render can repaint once fonts or pictures land. */
    onRedraw: (() => void) | null = null

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        // Transparent: Background is a CSS fill on the frame behind the canvas.
        this.renderer.setClearColor(0x000000, 0)
        const canvas = this.renderer.domElement
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block"
        container.appendChild(canvas)

        this.stackCamera = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10)
        this.target = new THREE.WebGLRenderTarget(1, 1, { samples: 4, depthBuffer: false })

        for (let i = 0; i < POOL; i++) {
            const cardMat = new THREE.ShaderMaterial({
                vertexShader: CARD_VERTEX,
                fragmentShader: CARD_FRAGMENT,
                transparent: true,
                depthTest: false,
                depthWrite: false,
                uniforms: {
                    uMap: { value: null },
                    uHasMap: { value: 0 },
                    uFill: { value: PENDING_FILL.clone() },
                    uCrop: { value: new THREE.Vector4(1, 1, 0, 0) },
                    uSize: { value: new THREE.Vector2(1, 1) },
                    uRadius: { value: 0 },
                    uShade: { value: 1 },
                    uDpr: { value: 1 },
                    uLip: { value: LIP },
                },
            })
            const shadowMat = new THREE.ShaderMaterial({
                vertexShader: CARD_VERTEX,
                fragmentShader: SHADOW_FRAGMENT,
                transparent: true,
                depthTest: false,
                depthWrite: false,
                uniforms: { uAlpha: { value: SHADOW_ALPHA } },
            })
            const card = new THREE.Mesh(this.plane, cardMat)
            const shadow = new THREE.Mesh(this.plane, shadowMat)
            card.frustumCulled = false
            shadow.frustumCulled = false
            card.visible = false
            shadow.visible = false
            this.stackScene.add(shadow, card)
            this.slots.push({ card, cardMat, shadow, shadowMat })
        }

        this.wrapMat = new THREE.ShaderMaterial({
            vertexShader: WRAP_VERTEX,
            fragmentShader: WRAP_FRAGMENT,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            // The shader writes premultiplied colour, as the context expects.
            premultipliedAlpha: true,
            uniforms: {
                uStack: { value: this.target.texture },
                uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
                uTime: { value: 0 },
                uWrap: { value: 1 },
                uGloss: { value: 1 },
                uCrinkle: { value: 1 },
                uGlare: { value: new THREE.Vector2() },
            },
        })
        this.wrapMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.wrapMat)
        this.wrapMesh.frustumCulled = false
        this.wrapScene.add(this.wrapMesh)

        if (typeof window.matchMedia === "function") {
            this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
        }
        if (document.fonts) document.fonts.addEventListener("loadingdone", this.onFontsLoaded)

        this.applyConfig()
    }

    /* ---- config --------------------------------------------------------------- */

    private stackCount(): number {
        return Math.round(clamp(this.cfg.stack, 1, STACK_MAX, DEFAULTS.stack))
    }

    private cardShare(): number {
        return clamp(this.cfg.cardHeight, 25, 90, DEFAULTS.cardHeight) / 100
    }

    private applyConfig() {
        this.curve = buildCurve(this.stackCount(), this.cardShare())
        const wrap = this.cfg.wrap
        const u = this.wrapMat.uniforms
        u.uWrap.value = wrap.show ? 1 : 0
        u.uGloss.value = clamp(wrap.gloss, 0, 10, DEFAULT_WRAP.gloss) / 5
        u.uCrinkle.value = clamp(wrap.crinkle, 0, 10, DEFAULT_WRAP.crinkle) / 5
        this.syncPictures()
        this.layout()
    }

    /** Size the sleeve to the frame, its render target to the sleeve, and the
     * placeholder artwork to the cards' on-screen size. */
    private layout() {
        const w = this.width
        const h = this.height
        const inset = Math.round(Math.min(w, h) * SLEEVE_INSET)
        this.sw = Math.max(1, w - 2 * inset)
        this.sh = Math.max(1, h - 2 * inset)
        const dpr = this.renderer.getPixelRatio()
        this.target.setSize(Math.max(1, Math.round(this.sw * dpr)), Math.max(1, Math.round(this.sh * dpr)))

        // Sleeve pixels, y up.
        this.stackCamera.left = 0
        this.stackCamera.right = this.sw
        this.stackCamera.top = this.sh
        this.stackCamera.bottom = 0
        this.stackCamera.updateProjectionMatrix()

        this.wrapMat.uniforms.uRect.value.set(inset * dpr, inset * dpr, (inset + this.sw) * dpr, (inset + this.sh) * dpr)
        this.buildTickets(false)
    }

    /** Start loading any new picture and let go of any the list no longer has. */
    private syncPictures() {
        const wanted = new Set(this.cfg.pictures.map((p) => p.src))
        for (const [src, entry] of this.pictures) {
            if (wanted.has(src)) continue
            entry.tex?.dispose()
            this.pictures.delete(src)
        }
        for (const src of wanted) {
            if (this.pictures.has(src)) continue
            const entry: { tex: THREE.Texture | null; w: number; h: number } = { tex: null, w: 0, h: 0 }
            // A size seen before crops the pending fill right while this copy
            // loads; none seen fills the box, which is a fine first paint.
            const known = naturalSizes.get(src)
            if (known) {
                entry.w = known.w
                entry.h = known.h
            }
            this.pictures.set(src, entry)
            const img = new window.Image()
            // WebGL can only upload a picture its host allows cross-origin, and
            // Framer's own image CDN does. One that refuses keeps the pending
            // fill rather than tainting the canvas.
            img.crossOrigin = "anonymous"
            img.decoding = "async"
            img.onload = () => {
                if (this.disposed || this.pictures.get(src) !== entry) return
                entry.w = img.naturalWidth
                entry.h = img.naturalHeight
                naturalSizes.set(src, { w: entry.w, h: entry.h })
                const tex = new THREE.Texture(img)
                tex.minFilter = THREE.LinearMipmapLinearFilter
                tex.magFilter = THREE.LinearFilter
                tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
                tex.colorSpace = THREE.NoColorSpace
                tex.needsUpdate = true
                entry.tex = tex
                this.onRedraw?.()
            }
            img.src = src
        }
    }

    /** Redraw any placeholder whose size changed; `force` redraws all (fonts
     * landed). Only drawn while there are no pictures to show. */
    private buildTickets(force: boolean) {
        if (this.cfg.pictures.length > 0) {
            this.tickets.forEach((e) => e.tex.dispose())
            this.tickets.clear()
            return
        }
        const dpr = this.renderer.getPixelRatio()
        const cw = CARD_W * this.sw
        const ch = this.cardShare() * this.sh
        const W = Math.round(clamp(Math.round((cw * dpr) / 64) * 64, TEX_MIN, TEX_MAX, 1024))
        const H = Math.max(16, Math.round((W * ch) / cw))
        const maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
        PLACEHOLDERS.forEach((ticket, i) => {
            const key = `${W}|${H}`
            const had = this.tickets.get(i)
            if (!force && had && had.key === key) return
            const tex = new THREE.CanvasTexture(drawTicket(ticket, i, W, H))
            tex.minFilter = THREE.LinearMipmapLinearFilter
            tex.magFilter = THREE.LinearFilter
            tex.anisotropy = maxAniso
            tex.colorSpace = THREE.NoColorSpace
            tex.needsUpdate = true
            had?.tex.dispose()
            this.tickets.set(i, { key, tex })
        })
        this.requestFonts()
    }

    private requestFonts() {
        if (!document.fonts) return
        for (const spec of [displayFont(PLACEHOLDER_FONT, 32), uiFont(32, 800)]) {
            if (this.fontRequests.has(spec)) continue
            this.fontRequests.add(spec)
            document.fonts.load(spec, "AH").then(
                () => this.onFontsLoaded(),
                () => undefined
            )
        }
    }

    private onFontsLoaded = () => {
        if (this.disposed) return
        if (this.cfg.pictures.length > 0) return
        this.buildTickets(true)
        this.onRedraw?.()
    }

    /* ---- frame ---------------------------------------------------------------- */

    private draw() {
        const s = this.getScroll()
        const N = this.stackCount()
        const share = this.cardShare()
        const pictures = this.cfg.pictures
        const count = pictures.length || PLACEHOLDERS.length
        const dpr = this.renderer.getPixelRatio()
        const cw = CARD_W * this.sw
        const ch = share * this.sh
        const shH = SHADOW_H * this.sh
        const radius = clamp(this.cfg.radius, 0, 100, DEFAULTS.radius)

        let used = 0
        const first = Math.ceil(s - N - 1)
        const last = Math.floor(s + 2)
        for (let k = first; k <= last && used < POOL; k++) {
            const p = k - s
            const topY = evalCurve(this.curve, p) * this.sh
            if (topY >= this.sh) continue
            const index = ((k % count) + count) % count
            let map: THREE.Texture | null
            let crop: [number, number, number, number] = [1, 1, 0, 0]
            if (pictures.length > 0) {
                // The offset is read here, every frame, so dragging it
                // re-frames the cards already in the pile.
                const picture = pictures[index]
                const entry = this.pictures.get(picture.src)
                map = entry?.tex ?? null
                if (entry) crop = coverCrop(entry.w, entry.h, cw, ch, picture.offsetY)
            } else {
                const ticket = this.tickets.get(index)
                if (!ticket) continue
                map = ticket.tex
            }
            const slot = this.slots[used]
            const jitter =
                JITTER * this.sw * (2 * hash(k) - 1 + JITTER_DRIFT * Math.sin(this.time * 0.6 + 6.283 * hash(k + 17.3)))
            const cx = this.sw / 2 + jitter
            const top = this.sh - topY

            slot.card.position.set(cx, top - ch / 2, 0)
            slot.card.scale.set(cw, ch, 1)
            slot.card.renderOrder = used * 2 + 1
            slot.card.visible = true
            const u = slot.cardMat.uniforms
            u.uMap.value = map
            u.uHasMap.value = map ? 1 : 0
            u.uCrop.value.set(crop[0], crop[1], crop[2], crop[3])
            u.uSize.value.set(cw, ch)
            u.uRadius.value = radius
            u.uDpr.value = dpr
            u.uShade.value = Math.max(DEPTH_SHADE_MIN, 1 - DEPTH_SHADE * Math.max(0, -p))

            slot.shadow.position.set(cx, top + shH / 2, 0)
            slot.shadow.scale.set(cw, shH, 1)
            slot.shadow.renderOrder = used * 2
            slot.shadow.visible = true
            used++
        }
        for (let i = used; i < POOL; i++) {
            this.slots[i].card.visible = false
            this.slots[i].shadow.visible = false
        }

        this.renderer.setRenderTarget(this.target)
        this.renderer.setClearColor(SLEEVE_INSIDE, 1)
        this.renderer.render(this.stackScene, this.stackCamera)
        this.renderer.setRenderTarget(null)
        this.renderer.setClearColor(0x000000, 0)
        const w = this.wrapMat.uniforms
        w.uTime.value = this.time
        w.uGlare.value.copy(this.glare)
        this.renderer.render(this.wrapScene, this.wrapCamera)
    }

    /* ---- pointer: the sheen swings after it ----------------------------------- */

    private onPointerMove = (event: PointerEvent) => {
        const rect = this.container.getBoundingClientRect()
        const follow = clamp(this.cfg.glareFollow, 0, 10, DEFAULTS.glareFollow) / 10
        const nx = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1
        const ny = 1 - ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2
        this.glareTarget.set(nx * follow, ny * follow)
    }

    private onPointerLeave = () => {
        this.glareTarget.set(0, 0)
    }

    private attach() {
        const node = this.container
        node.addEventListener("pointermove", this.onPointerMove)
        node.addEventListener("pointerleave", this.onPointerLeave)
        if (typeof IntersectionObserver !== "undefined") {
            this.observer = new IntersectionObserver((entries) => {
                this.visible = entries.some((e) => e.isIntersecting)
            })
            this.observer.observe(node)
        }
    }

    private detach() {
        const node = this.container
        node.removeEventListener("pointermove", this.onPointerMove)
        node.removeEventListener("pointerleave", this.onPointerLeave)
        this.observer?.disconnect()
        this.observer = null
    }

    /* ---- host ----------------------------------------------------------------- */

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)
        this.layout()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        this.applyConfig()
    }

    /** One frame for the Framer canvas, at rest. */
    renderStatic() {
        if (this.disposed) return
        this.draw()
    }

    start() {
        this.attach()
        this.lastT = performance.now()
        const loop = () => {
            if (this.disposed) return
            this.frameId = requestAnimationFrame(loop)
            const now = performance.now()
            let dt = (now - this.lastT) / 1000
            this.lastT = now
            if (!this.visible) return
            if (!isFinite(dt) || dt < 0) dt = 0
            if (dt > 0.05) dt = 0.05
            if (!this.reducedMotion?.matches) this.time += dt
            this.glare.lerp(this.glareTarget, 1 - Math.exp(-GLARE_EASE * dt))
            this.draw()
        }
        this.frameId = requestAnimationFrame(loop)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.detach()
        if (document.fonts) document.fonts.removeEventListener("loadingdone", this.onFontsLoaded)
        for (const slot of this.slots) {
            slot.cardMat.dispose()
            slot.shadowMat.dispose()
        }
        this.plane.dispose()
        this.wrapMesh.geometry.dispose()
        this.wrapMat.dispose()
        this.tickets.forEach((e) => e.tex.dispose())
        this.tickets.clear()
        this.pictures.forEach((e) => e.tex?.dispose())
        this.pictures.clear()
        this.target.dispose()
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        canvas.parentNode?.removeChild(canvas)
    }
}

/* -------------------------------------------------------------- component -- */

/** On the Framer canvas frames are painted on demand, so a board full of
 * instances is not a board full of render loops. */
function isStatic(): boolean {
    try {
        return RenderTarget.current() === RenderTarget.canvas
    } catch {
        return false
    }
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 560
 * @framerIntrinsicHeight 560
 * @framerDisableUnlink
 */
export default function CelloStack(props: Partial<CelloStackProps>) {
    const {
        images = DEFAULTS.images,
        background = DEFAULTS.background,
        stack = DEFAULTS.stack,
        cardHeight = DEFAULTS.cardHeight,
        radius = DEFAULTS.radius,
        wrap = {"show":false,"gloss":5,"crinkle":5},
        glareFollow = DEFAULTS.glareFollow,
        drag = DEFAULTS.drag,
        sensitivity = DEFAULTS.sensitivity,
        hold = DEFAULTS.hold,
        direction = DEFAULTS.direction,
        transition = {"mass":1,"type":"spring","damping":14,"stiffness":170},
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<SleeveScene | null>(null)
    /** Cards dealt so far, fractional mid-deal. Read by the scene every frame. */
    const scrollRef = useRef(0)
    const transitionRef = useRef<Transition>(DEFAULT_TRANSITION)
    transitionRef.current = transition ?? DEFAULT_TRANSITION

    // Rebuilt per render and read by the scene, so a slider drag lands on the
    // next frame without the renderer being torn down. Groups merge partial-safe.
    const cfgRef = useRef<Config>(null as unknown as Config)
    const cfg: Config = {
        pictures: picturesOf(images),
        stack,
        cardHeight,
        radius,
        wrap: { ...DEFAULT_WRAP, ...wrap },
        glareFollow,
    }
    cfgRef.current = cfg
    const cfgKey = JSON.stringify(cfg)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: SleeveScene
        try {
            scene = new SleeveScene(container, cfgRef.current)
        } catch {
            // No WebGL — an empty ground rather than a thrown render.
            return
        }
        scene.getScroll = () => scrollRef.current
        sceneRef.current = scene
        scene.setSize(container.clientWidth, container.clientHeight)

        const still = isStatic()
        if (still) {
            scene.onRedraw = () => scene.renderStatic()
            scene.renderStatic()
        } else {
            scene.start()
        }

        const ro = new ResizeObserver(() => {
            scene.setSize(container.clientWidth, container.clientHeight)
            if (still) scene.renderStatic()
        })
        ro.observe(container)
        return () => {
            ro.disconnect()
            scene.dispose()
            sceneRef.current = null
        }
    }, [])

    useEffect(() => {
        const scene = sceneRef.current
        if (!scene) return
        scene.updateConfig(cfgRef.current)
        if (isStatic()) scene.renderStatic()
    }, [cfgKey])

    // Read live by the handlers below, so a slider change never rebinds them
    // mid-gesture.
    const liveRef = useRef({ hold, direction, drag, sensitivity, cardHeight })
    liveRef.current = { hold, direction, drag, sensitivity, cardHeight }

    // One clock for the pile: rest for Hold, then deal a card on the
    // Transition; a hand on it takes over, and letting go plays the settle on
    // the same Transition, starting at the throw's speed.
    const transitionKey = JSON.stringify(transition ?? null)
    useEffect(() => {
        const container = containerRef.current
        if (!container || isStatic()) return
        let alive = true
        let timer = 0
        let playing: AnimationPlaybackControls | null = null
        const press = { id: -1, startY: 0, startScroll: 0, lastY: 0, lastT: 0, velocity: 0, moved: false }
        const reduce =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        const step = () => (liveRef.current.direction === "down" ? -1 : 1)

        const halt = () => {
            window.clearTimeout(timer)
            playing?.stop()
            playing = null
        }

        const schedule = () => {
            window.clearTimeout(timer)
            const rest = clamp(liveRef.current.hold, 0, 10, DEFAULTS.hold) * 1000
            timer = window.setTimeout(() => settle(Math.round(scrollRef.current) + step(), 0), rest)
        }

        /** Play the pile to a whole card, from wherever it is, at `velocity`
         * cards a second. */
        const settle = (to: number, velocity: number) => {
            if (!alive) return
            halt()
            if (reduce) {
                // Reduced motion: the card is simply there.
                scrollRef.current = to
                schedule()
                return
            }
            playing = animate(scrollRef.current, to, {
                ...transitionRef.current,
                velocity,
                onUpdate: (v: number) => {
                    scrollRef.current = v
                },
                onComplete: () => {
                    scrollRef.current = to
                    playing = null
                    if (alive && press.id === -1) schedule()
                },
            })
        }

        /** Pixels of drag per card: the front card's own travel, which is its
         * height on screen — so at Sensitivity 5 it stays under the pointer. */
        const pxPerCard = () => {
            const w = container.clientWidth
            const h = container.clientHeight
            const sleeve = h - 2 * Math.round(Math.min(w, h) * SLEEVE_INSET)
            const share = clamp(liveRef.current.cardHeight, 25, 90, DEFAULTS.cardHeight) / 100
            const gain = Math.max(0.1, clamp(liveRef.current.sensitivity, 0, 10, DEFAULTS.sensitivity) / 5)
            return Math.max(20, sleeve * share) / gain
        }

        const setCursor = (value: string) => {
            if (container.style.cursor !== value) container.style.cursor = value
        }

        const onDown = (event: PointerEvent) => {
            if (!liveRef.current.drag || press.id !== -1) return
            if (event.pointerType === "mouse" && event.button !== 0) return
            halt()
            const now = performance.now()
            Object.assign(press, {
                id: event.pointerId,
                startY: event.clientY,
                startScroll: scrollRef.current,
                lastY: event.clientY,
                lastT: now,
                velocity: 0,
                moved: false,
            })
            try {
                container.setPointerCapture(event.pointerId)
            } catch {
                /* capture is a nicety */
            }
            setCursor("grabbing")
        }

        const onMove = (event: PointerEvent) => {
            if (event.pointerId !== press.id) return
            const ppc = pxPerCard()
            // Up the screen is forward: the pile rides up with the pointer.
            const dy = press.startY - event.clientY
            if (!press.moved && Math.abs(dy) < TAP_SLOP) return
            press.moved = true
            scrollRef.current = press.startScroll + dy / ppc
            const now = performance.now()
            const dt = Math.max(1, now - press.lastT) / 1000
            const instant = (press.lastY - event.clientY) / ppc / dt
            // Smoothed, so one jittery sample does not decide the throw.
            press.velocity = press.velocity * 0.35 + instant * 0.65
            press.lastY = event.clientY
            press.lastT = now
        }

        const release = (event: PointerEvent, cancelled: boolean) => {
            if (event.pointerId !== press.id) return
            press.id = -1
            setCursor(liveRef.current.drag ? "grab" : "")
            const here = scrollRef.current
            if (!press.moved) {
                // A tap deals the next card, the same way the clock would.
                if (!cancelled) settle(Math.round(here) + step(), 0)
                else schedule()
                return
            }
            const stale = performance.now() - press.lastT > THROW_STALE_MS
            const velocity = stale ? 0 : press.velocity
            const base = Math.round(here)
            const aim = Math.round(here + velocity * THROW_LOOKAHEAD)
            settle(Math.max(base - THROW_MAX, Math.min(base + THROW_MAX, aim)), velocity)
        }
        const onUp = (event: PointerEvent) => release(event, false)
        const onCancel = (event: PointerEvent) => release(event, true)

        container.addEventListener("pointerdown", onDown)
        container.addEventListener("pointermove", onMove)
        container.addEventListener("pointerup", onUp)
        container.addEventListener("pointercancel", onCancel)
        setCursor(liveRef.current.drag ? "grab" : "")
        // Land wherever a previous clock left the pile, then rest as usual.
        if (Math.abs(scrollRef.current - Math.round(scrollRef.current)) > 1e-3) {
            settle(Math.round(scrollRef.current), 0)
        } else {
            schedule()
        }
        return () => {
            alive = false
            halt()
            container.removeEventListener("pointerdown", onDown)
            container.removeEventListener("pointermove", onMove)
            container.removeEventListener("pointerup", onUp)
            container.removeEventListener("pointercancel", onCancel)
            setCursor("")
        }
    }, [hold, direction, transitionKey, drag])

    const alts = cfg.pictures.map((p) => p.alt.trim()).filter(Boolean)
    const label = cfg.pictures.length === 0 ? PLACEHOLDERS.map((t) => t.word).join(" ") : alts.join(", ")

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label={label ? `A sealed stack of cards: ${label}` : "A sealed stack of cards"}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                backgroundColor: background,
                userSelect: "none",
                // The drag is vertical, so the browser must not take vertical
                // swipes over the pile for page scroll while Drag is on.
                touchAction: drag ? "none" : undefined,
                ...style,
            }}
        />
    )
}

CelloStack.displayName = "Cello Stack"
CelloStack.defaultProps = { ...DEFAULTS }

/* ---------------------------------------------------------------- controls -- */
