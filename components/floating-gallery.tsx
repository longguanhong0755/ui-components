"use client"

import * as React from "react"
import { useRef, useEffect, useState, useCallback } from "react"
import { animate } from "motion/react"

/**
 * framer-motion's `animate()` option bag. `AnimationOptions` is not exported by
 * the copy of framer-motion that ships inside Framer, and its `Transition` type
 * is not assignable to what `animate(value, …)` accepts, so the shape is
 * spelled out here — a type alias, not an interface, or it loses the implicit
 * index signature the intersection needs.
 */
type Motion = {
    type?: "spring" | "tween" | "keyframes" | "inertia"
    duration?: number
    ease?: [number, number, number, number]
    delay?: number
    stiffness?: number
    damping?: number
    mass?: number
    bounce?: number
    restSpeed?: number
    restDelta?: number
}

/**
 * The click-to-zoom settle. The gallery shipped with an exponential approach at
 * 12/sec inside the rAF loop — ~0.25s to land — so the default reproduces that
 * timing. Picking a card is a state change, which is what a Transition
 * describes; the pointer repulsion is NOT on this control, because its target
 * moves with the cursor every frame and is a filter, not a transition.
 */
const DEFAULT_TRANSITION: Motion = {
    type: "tween",
    duration: 0.25,
    // easeOut, as the cubic-bezier the tuple type needs.
    ease: [0, 0, 0.58, 1],
}

/**
 * FloatingGallery
 *
 * Physics-based floating image gallery:
 *  - continuous downward drift, per-image speed multiplier, seamless wrap
 *  - cursor repulsion with lerped return to the drift line
 *  - click an image to freeze it, travel it to the CENTRE of the container and
 *    zoom it above everything; click again to release it back onto its slot
 *
 * Architecture note (framer.md / rule 6): all per-frame work runs in ONE raw rAF
 * loop writing `transform` straight to the DOM. No per-frame React state — 60fps
 * setState on N nodes is what makes these galleries stutter. Live prop values are
 * read from a ref inside the loop, so changing a control never restarts the loop.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

/* Panel follows rule 11's shared vocabulary — 14 leaf dials, whole numbers
 * (rule 3). Changed keys, clean break, no fallbacks:
 *   baseSpeed            -> speed      (px/sec -> 0-100 where 50 is the
 *                                       shipped 40 px/sec)
 *   hoverForce           -> hover      (px -> % where 100 is the shipped 120px)
 *   repulsionRadius      -> reach
 *   zoomScale            -> zoom
 *   backgroundColor      -> background
 *   images[].borderRadius-> rounded    (one component dial in percent; a
 *                                       per-image px radius meant a different
 *                                       shape on every card)
 *
 * Second pass — the list moved into the folder's standard `Images` object and
 * the per-image layout fields came out:
 *   images         -> images   ("Images" OBJECT whose Items rows are a
 *                                     single flat Image picker)
 *   images[].alt   -> CUT            The cards are decorative; alt is "".
 *   rotation       -> CUT, frozen at its default of 0 — the per-image tilt.
 *                                     Nothing renders differently.
 *   control `description` strings -> CUT across the panel.
 *   images[].width / height / startX / startY -> CUT, frozen in LAYOUT below.
 *                                     The per-card boxes are back as ONE pair,
 *                                     `cardWidth` / `cardHeight` (Width /
 *                                     Height, 40–800 px), sizing LAYOUT slot 1;
 *                                     the other five scale in proportion.
 *
 * Those four were not one value each — they were a six-entry collage, a
 * distinct size and spot per card. Freezing each to a single constant would
 * have stacked every card at one size on one spot, so the whole table is what
 * is frozen and card i takes `LAYOUT[i % LAYOUT.length]`. The first six render
 * pixel-identical to before; a seventh image reuses slot 1's size and place.
 *
 * Third pass:
 *   hover  0-200% -> 0-100%   The dial now only ATTENUATES the push. 100 is
 *                             still the 120px it shipped with, so a stored
 *                             value keeps its exact meaning and no instance
 *                             moves; what is gone is the headroom above the
 *                             shipped force. This is a deliberate departure
 *                             from rule 11a's 0-200 span.
 *   reach  title -> "Cursor Area"   Key unchanged. It IS the cursor's field
 *                             radius, and the panel now says so.
 *   zoom   -> CUT (rule 11b), frozen at its 160% default in ZOOM. Click-to-
 *                             zoom still works and looks identical; only the
 *                             dial is gone. The Transition control still owns
 *                             that travel.
 *
 * Fourth pass:
 *   hover  0-100 -> 0-50   Key, meaning and unit-less scale all unchanged in
 *                          KIND — 50 now delivers the 120px the dial's old 100
 *                          delivered, so the repulsion AT MAXIMUM is exactly
 *                          what it always was. The `%` suffix went with it: the
 *                          number was never a percentage of anything visible,
 *                          and "50%" at the top of the dial reads as if there
 *                          were another half above it.
 *
 *                          This is a SCALE change, which no fallback can
 *                          migrate — the stored number is the same number
 *                          either way. A live instance left at the old default
 *                          of 100 clamps to 50 and is unchanged; any instance
 *                          set BELOW 50 now pushes twice as hard as it did and
 *                          has to be re-set by hand. Deliberate, one-off.
 *
 * Fifth pass:
 *   hover  -> CUT (rule 11b), frozen at 0. The dial's default was already 0,
 *             so no stored instance changes value; what is gone is the
 *             ability to turn cursor repulsion on at all. The pointer-force
 *             math stays in the rAF loop — it just always resolves to 0 now.
 */

interface GalleryImage {
    src?: string
    link?: string
}

/** The content list lives in its own object, one shape across the folder. */
interface Props {
    images?: GalleryImage[]
    background?: string
    cardWidth?: number // px, the reference card (LAYOUT slot 1)
    cardHeight?: number // px, the reference card (LAYOUT slot 1)
    rounded?: number // percent of the max radius
    speed?: number // 0-100, 50 = 40 px/sec
    reach?: number // px, radius of the cursor's push field ("Cursor Area")
    fade?: number // percent of the half-height over which edges fade
    transition?: Motion
    style?: React.CSSProperties
}

/** The reference card box, in px, on the folder's shared 40–800 span. It is
 *  LAYOUT slot 1; every other slot scales in proportion, so the collage keeps
 *  its variety. Defaults are the 220x280 slot 1 shipped at, so an untouched
 *  instance is pixel-identical. */
const DEFAULT_CARD_W = 220
const DEFAULT_CARD_H = 280
const SIZE_MIN = 40
const SIZE_MAX = 800

/** 50 on the Speed dial reproduces the drift the gallery shipped with. */
const SPEED_REF = 40 // px/sec
/** Zoom was cut from the panel (rule 11b): the behaviour is unchanged, the
 *  scale a picked card travels to is frozen at the dial's old default. It is a
 *  CEILING — see ZOOM_FIT. */
const ZOOM = 1.6 // 160%
/** A picked card travels to the container centre and is capped to this share of
 *  the frame on both axes. Zooming in place meant a card seeded near an edge
 *  grew straight through the root's `overflow: hidden` and lost its sides; the
 *  cap covers the other half of the same defect, where a large Width/Height
 *  makes 160% wider than the container no matter where it sits. A card already
 *  bigger than the frame therefore zooms DOWN to fit, which is what "opens
 *  whole, in the middle" has to mean at that size. */
const ZOOM_FIT = 0.9

type Particle = {
    /** unwrapped drift position, px, in container space */
    x: number
    y: number
    /** current repulsion displacement, px */
    dx: number
    dy: number
    /** 0 = sitting in the collage, 1 = fully picked (centred + zoomed). ONE
     *  progress drives both the travel and the scale, so the card cannot be
     *  half-way to the middle at full size. */
    z: number
    /** the value the Transition is currently travelling to (0 or 1) */
    targetZ: number
    w: number
    h: number
    mult: number
}

/** deterministic 0..1 from an index — no Math.random, so SSR/canvas/preview agree */
function hash01(i: number): number {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
    return s - Math.floor(s)
}

/* The collage, frozen (rule 11b). These were four per-image dials; they are one
 * table now, cycled by index, so the composition survives the cut and any
 * number of images still scatters. x/y are percent of the container. */
const LAYOUT: ReadonlyArray<{
    w: number
    h: number
    x: number
    y: number
}> = [
    { w: 220, h: 280, x: 12, y: 10 },
    { w: 260, h: 200, x: 42, y: 35 },
    { w: 200, h: 260, x: 74, y: 8 },
    { w: 240, h: 240, x: 26, y: 62 },
    { w: 220, h: 300, x: 60, y: 74 },
    { w: 180, h: 220, x: 88, y: 48 },
]

/* Dummy pictures, one per LAYOUT slot, so a fresh instance shows the collage
 * with CONTENT rather than six empty frames — an empty slot gave no sense of
 * the scatter or the parallax. Inline SVG data URIs, never photo URLs: a
 * default pointing at a CDN 404s the day that ID dies and shows nothing
 * offline, behind a proxy, or on a Framer canvas with no network. One set
 * across the folder. */
const DUMMY_PAIRS: ReadonlyArray<[string, string]> = [
    ["FF7A45", "FFB199"],
    ["4D7CFE", "9BC1FF"],
    ["16C79A", "9BE7C4"],
    ["FFC53D", "FFE9A8"],
    ["B15CFF", "E0B8FF"],
    ["FF4D7E", "FFB3C7"],
]
const dummyImage = (i: number, w = 1200, h = 800) => {
    const [a, b] = DUMMY_PAIRS[i % DUMMY_PAIRS.length]
    const n = String(i + 1).padStart(2, "0")
    return (
        `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E` +
        `%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E` +
        `%3Cstop offset='0' stop-color='%23${a}'/%3E%3Cstop offset='1' stop-color='%23${b}'/%3E` +
        `%3C/linearGradient%3E%3C/defs%3E%3Crect width='${w}' height='${h}' fill='url(%23g)'/%3E` +
        `%3Ctext x='50%25' y='50%25' dy='.35em' text-anchor='middle' ` +
        `font-family='Inter, Helvetica, Arial, sans-serif' font-size='${Math.round(Math.min(w, h) * 0.34)}' ` +
        `font-weight='700' fill='rgba(255,255,255,0.9)'%3E${n}%3C/text%3E%3C/svg%3E`
    )
        /* Spaces, quotes and parens are all invalid inside an unquoted CSS
         * `url(...)`, and a card painting this through
         * `backgroundImage: url(${src})` drops the whole declaration and
         * renders empty — measured, not guessed. Encoding them keeps ONE
         * string usable as an <img> src, a CSS url() and a GL texture alike. */
        .replace(/ /g, "%20")
        .replace(/'/g, "%27")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29")
}

/** Six slots, each already carrying a picture at its slot's own shape. */
const DEFAULT_ITEMS: GalleryImage[] = LAYOUT.map((slot, i) => ({
    src: dummyImage(i, slot.w * 3, slot.h * 3),
}))

const DEFAULT_IMAGES: GalleryImage[] = DEFAULT_ITEMS

/**
 * Corner geometry for a w x h box at `pct` of the maximum radius.
 *
 * `pct` 100 is a true CIRCLE at ANY aspect, not a stadium: the clip box narrows
 * toward a square as the radius grows, so the two meet at a circle of diameter
 * `min(w, h)` and the long axis is simply clipped away. The element's own box
 * never changes size, so nothing around it reflows as the dial moves.
 *
 * Returned as `clipPath` rather than `borderRadius` because a border-radius can
 * only ever describe a rounded rectangle inscribed in the box — at 100 on a
 * non-square card that is a pill, which is what this replaces.
 */
function roundedClip(w: number, h: number, pct: number): string {
    const t = Math.max(0, Math.min(100, pct)) / 100
    const short = Math.min(w, h)
    const insetX = (t * (w - short)) / 2
    const insetY = (t * (h - short)) / 2
    return `inset(${insetY}px ${insetX}px round ${(t * short) / 2}px)`
}

export default function FloatingGallery(props: Props) {
    const {
        images = [{"src":"data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27660%27%20height=%27840%27%3E%3Cdefs%3E%3ClinearGradient%20id=%27g%27%20x1=%270%27%20y1=%270%27%20x2=%271%27%20y2=%271%27%3E%3Cstop%20offset=%270%27%20stop-color=%27%23FF7A45%27/%3E%3Cstop%20offset=%271%27%20stop-color=%27%23FFB199%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width=%27660%27%20height=%27840%27%20fill=%27url%28%23g%29%27/%3E%3Ctext%20x=%2750%25%27%20y=%2750%25%27%20dy=%27.35em%27%20text-anchor=%27middle%27%20font-family=%27Inter,%20Helvetica,%20Arial,%20sans-serif%27%20font-size=%27224%27%20font-weight=%27700%27%20fill=%27rgba%28255,255,255,0.9%29%27%3E01%3C/text%3E%3C/svg%3E"},{"src":"data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27780%27%20height=%27600%27%3E%3Cdefs%3E%3ClinearGradient%20id=%27g%27%20x1=%270%27%20y1=%270%27%20x2=%271%27%20y2=%271%27%3E%3Cstop%20offset=%270%27%20stop-color=%27%234D7CFE%27/%3E%3Cstop%20offset=%271%27%20stop-color=%27%239BC1FF%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width=%27780%27%20height=%27600%27%20fill=%27url%28%23g%29%27/%3E%3Ctext%20x=%2750%25%27%20y=%2750%25%27%20dy=%27.35em%27%20text-anchor=%27middle%27%20font-family=%27Inter,%20Helvetica,%20Arial,%20sans-serif%27%20font-size=%27204%27%20font-weight=%27700%27%20fill=%27rgba%28255,255,255,0.9%29%27%3E02%3C/text%3E%3C/svg%3E"},{"src":"data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27600%27%20height=%27780%27%3E%3Cdefs%3E%3ClinearGradient%20id=%27g%27%20x1=%270%27%20y1=%270%27%20x2=%271%27%20y2=%271%27%3E%3Cstop%20offset=%270%27%20stop-color=%27%2316C79A%27/%3E%3Cstop%20offset=%271%27%20stop-color=%27%239BE7C4%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width=%27600%27%20height=%27780%27%20fill=%27url%28%23g%29%27/%3E%3Ctext%20x=%2750%25%27%20y=%2750%25%27%20dy=%27.35em%27%20text-anchor=%27middle%27%20font-family=%27Inter,%20Helvetica,%20Arial,%20sans-serif%27%20font-size=%27204%27%20font-weight=%27700%27%20fill=%27rgba%28255,255,255,0.9%29%27%3E03%3C/text%3E%3C/svg%3E"},{"src":"data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27720%27%20height=%27720%27%3E%3Cdefs%3E%3ClinearGradient%20id=%27g%27%20x1=%270%27%20y1=%270%27%20x2=%271%27%20y2=%271%27%3E%3Cstop%20offset=%270%27%20stop-color=%27%23FFC53D%27/%3E%3Cstop%20offset=%271%27%20stop-color=%27%23FFE9A8%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width=%27720%27%20height=%27720%27%20fill=%27url%28%23g%29%27/%3E%3Ctext%20x=%2750%25%27%20y=%2750%25%27%20dy=%27.35em%27%20text-anchor=%27middle%27%20font-family=%27Inter,%20Helvetica,%20Arial,%20sans-serif%27%20font-size=%27245%27%20font-weight=%27700%27%20fill=%27rgba%28255,255,255,0.9%29%27%3E04%3C/text%3E%3C/svg%3E"},{"src":"data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27660%27%20height=%27900%27%3E%3Cdefs%3E%3ClinearGradient%20id=%27g%27%20x1=%270%27%20y1=%270%27%20x2=%271%27%20y2=%271%27%3E%3Cstop%20offset=%270%27%20stop-color=%27%23B15CFF%27/%3E%3Cstop%20offset=%271%27%20stop-color=%27%23E0B8FF%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width=%27660%27%20height=%27900%27%20fill=%27url%28%23g%29%27/%3E%3Ctext%20x=%2750%25%27%20y=%2750%25%27%20dy=%27.35em%27%20text-anchor=%27middle%27%20font-family=%27Inter,%20Helvetica,%20Arial,%20sans-serif%27%20font-size=%27224%27%20font-weight=%27700%27%20fill=%27rgba%28255,255,255,0.9%29%27%3E05%3C/text%3E%3C/svg%3E"},{"src":"data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27540%27%20height=%27660%27%3E%3Cdefs%3E%3ClinearGradient%20id=%27g%27%20x1=%270%27%20y1=%270%27%20x2=%271%27%20y2=%271%27%3E%3Cstop%20offset=%270%27%20stop-color=%27%23FF4D7E%27/%3E%3Cstop%20offset=%271%27%20stop-color=%27%23FFB3C7%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width=%27540%27%20height=%27660%27%20fill=%27url%28%23g%29%27/%3E%3Ctext%20x=%2750%25%27%20y=%2750%25%27%20dy=%27.35em%27%20text-anchor=%27middle%27%20font-family=%27Inter,%20Helvetica,%20Arial,%20sans-serif%27%20font-size=%27184%27%20font-weight=%27700%27%20fill=%27rgba%28255,255,255,0.9%29%27%3E06%3C/text%3E%3C/svg%3E"}],
        background = "#0b0b0d",
        cardWidth = 220,
        cardHeight = 280,
        rounded = 16,
        speed = 50,
        reach = 260,
        fade = 0,
        transition = {"ease":[0,0,0.58,1],"mass":1,"type":"tween","damping":60,"duration":0.25,"stiffness":800},
        style,
    } = props

    // Width / Height size the collage's REFERENCE card — LAYOUT slot 1 — and
    // every other slot keeps its proportion to it, so the collage stays a
    // collage. One pair of dials cannot be six card boxes, and flattening all
    // six to one size would delete the composition the LAYOUT table exists for.
    const slotSX = Math.max(1, cardWidth) / DEFAULT_CARD_W
    const slotSY = Math.max(1, cardHeight) / DEFAULT_CARD_H

    const rootRef = useRef<HTMLDivElement>(null)
    const partsRef = useRef<Particle[]>([])
    /* The DOM nodes live in their OWN ref, not on the particle.
     *
     * React runs a ref callback right after the render that created the node,
     * which is BEFORE the effect that seeds the particles — so a callback that
     * wrote onto `partsRef.current[i]` found an empty array on the only pass
     * that ever runs, every node stayed unlinked, and the loop had nothing to
     * write a transform to. Nothing moved. Keeping the nodes separate means the
     * two are never ordered against each other. */
    const nodesRef = useRef<Array<HTMLDivElement | null>>([])
    const sizeRef = useRef({ w: 0, h: 0 })
    const pointerRef = useRef({ x: 0, y: 0, active: false })
    const [zoomed, setZoomed] = useState<number | null>(null)
    // Live input in a ref: a fresh Transition object every render would land in
    // the loop effect's deps and restart it (rule 6 / rule G).
    const transitionRef = useRef(transition)
    transitionRef.current = transition
    /** One running scale tween per card, so picking a new one drops the old. */
    const zoomAnims = useRef<Array<{ stop: () => void } | null>>([])

    const zoomedRef = useRef<number | null>(null)
    zoomedRef.current = zoomed

    // live prop mirror — read inside the loop so control edits never rebuild it
    const cfgRef = useRef({ speed, reach, fade })
    cfgRef.current = { speed, reach, fade }

    // Pulled out of the group before anything depends on it — Framer hands back
    // a fresh `images` object every render (rule G).
    const itemsProp = images
    const items =
        itemsProp && itemsProp.length ? itemsProp : DEFAULT_IMAGES
    const count = items.length

    /** (re)seed particles whenever the layout inputs or container size change */
    const seed = useCallback(() => {
        const { w: W, h: H } = sizeRef.current
        if (!W || !H) return
        partsRef.current = items.map((_im, i) => {
            const slot = LAYOUT[i % LAYOUT.length]
            const w = slot.w * slotSX
            const h = slot.h * slotSY
            const prev = partsRef.current[i]
            return {
                x: (slot.x / 100) * W - w / 2,
                // keep vertical progress across a resize so a reflow doesn't snap
                y: prev ? prev.y : (slot.y / 100) * H - h / 2,
                dx: prev ? prev.dx : 0,
                dy: prev ? prev.dy : 0,
                z: prev ? prev.z : 0,
                targetZ: prev ? prev.targetZ : 0,
                w,
                h,
                // 0.65x .. 1.35x — varied paces without any image stalling
                mult: 0.65 + hash01(i) * 0.7,
            }
        })
        // LAYOUT is a module constant, so only the card COUNT and the two size
        // dials can change the seed — primitives, never the Images object (rule G).
    }, [count, slotSX, slotSY])

    useEffect(() => {
        const root = rootRef.current
        if (!root) return
        // offsetWidth/Height, not getBoundingClientRect: rect carries canvas zoom
        const measure = () => {
            sizeRef.current = { w: root.offsetWidth, h: root.offsetHeight }
            seed()
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(root)
        return () => ro.disconnect()
    }, [seed])

    useEffect(() => {
        let raf = 0
        let last = performance.now()

        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            // clamp dt: a backgrounded tab returns a huge delta and teleports everything
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now

            const { w: W, h: H } = sizeRef.current
            if (!W || !H) return

            const cfg = cfgRef.current
            const R = Math.max(1, cfg.reach)
            // Cursor repulsion is permanently off (rule 11b cut, fifth pass):
            // the Hover dial is gone from the panel and its force is frozen
            // at 0, so the block below this never fires.
            const F = 0
            const drift = (Math.max(0, cfg.speed) / 50) * SPEED_REF
            // Fade spans this many px in from each horizontal edge
            const fadePx = (Math.max(0, Math.min(100, cfg.fade)) / 100) * (H / 2)
            const p = pointerRef.current
            const zi = zoomedRef.current

            // frame-rate independent lerp: same settle time at 30 or 144 fps
            const kOut = 1 - Math.exp(-8 * dt) // toward the repelled target

            for (let i = 0; i < partsRef.current.length; i++) {
                const a = partsRef.current[i]
                const node = nodesRef.current[i]
                if (!node) continue
                const frozen = zi === i

                if (!frozen) {
                    a.y += drift * a.mult * dt
                    // seamless wrap: recycle a full height above the top edge
                    const span = H + a.h
                    if (a.y > H) a.y -= span
                    else if (a.y < -a.h) a.y += span
                }

                let tx = 0
                let ty = 0
                if (p.active && !frozen && F > 0) {
                    const cx = a.x + a.w / 2
                    const cy = a.y + a.h / 2
                    let vx = cx - p.x
                    let vy = cy - p.y
                    const d = Math.hypot(vx, vy)
                    if (d < R) {
                        // guard the degenerate cursor-exactly-on-center case
                        const inv = d > 0.001 ? 1 / d : 0
                        const fall = 1 - d / R
                        // squared falloff: soft at the rim, firm at the core
                        const push = F * fall * fall
                        tx = vx * inv * push
                        ty = vy * inv * push
                    }
                }
                a.dx += (tx - a.dx) * kOut
                a.dy += (ty - a.dy) * kOut

                // Zoom: picking a card is a state change, so the Transition
                // control owns the travel and the loop only reads `a.z`. A
                // spring can therefore overshoot and settle back, which the old
                // in-loop lerp could not.
                const targetZ = frozen ? 1 : 0
                if (a.targetZ !== targetZ) {
                    a.targetZ = targetZ
                    zoomAnims.current[i]?.stop()
                    const from = a.z
                    const delta = targetZ - from
                    zoomAnims.current[i] = animate(0, 1, {
                        ...transitionRef.current,
                        onUpdate: (t: number) => {
                            a.z = from + delta * t
                        },
                        onComplete: () => {
                            zoomAnims.current[i] = null
                        },
                    })
                }

                /* A picked card travels to the MIDDLE of the container as it
                 * grows. Scaling in place put a card seeded near an edge
                 * straight through the root's `overflow: hidden` and cut its
                 * sides off. `scale()` is about the box's own centre, so
                 * landing the top-left on (W-w)/2, (H-h)/2 puts the card's
                 * centre exactly on the container's at any scale.
                 *
                 * The base is the LIVE drift position, so the blend still
                 * tracks it: the repulsion offset is decaying to 0 while z
                 * ramps up, and on release the card lerps back onto a slot that
                 * has already resumed drifting. */
                const baseX = a.x + a.dx
                const baseY = a.y + a.dy
                const z = a.z
                const px = baseX + ((W - a.w) / 2 - baseX) * z
                const py = baseY + ((H - a.h) / 2 - baseY) * z
                // Cap the zoom to what the frame can hold — on BOTH axes, and
                // measured against the card's own box, so one dial cannot make
                // the picked card wider than the thing clipping it.
                const fit = Math.min(
                    ZOOM,
                    (W * ZOOM_FIT) / Math.max(1, a.w),
                    (H * ZOOM_FIT) / Math.max(1, a.h)
                )
                const s = 1 + (fit - 1) * z

                // the loop owns this transform outright (rule J)
                node.style.transform =
                    `translate3d(${px}px, ${py}px, 0) scale(${s})`

                /* The picked card also owns the stack while it is IN FLIGHT, not
                 * only while `zoomed === i`: React drops that flag the instant
                 * the second click lands, so a z-index in the style prop sent
                 * the card behind its neighbours for the whole return travel.
                 * The loop owns it, like the transform (rule J). */
                node.style.zIndex = z > 0.001 ? "999" : "1"

                if (fadePx > 0) {
                    const cy = a.y + a.h / 2
                    const edge = Math.min(cy, H - cy)
                    const o = Math.max(0, Math.min(1, edge / fadePx))
                    // the edge fade lifts as the card comes to the middle, so a
                    // card picked while half-faded is not opened dim
                    node.style.opacity = `${o + (1 - o) * z}`
                } else {
                    node.style.opacity = "1"
                }
            }
        }

        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [])

    const onPointerMove = (e: React.PointerEvent) => {
        const root = rootRef.current
        if (!root) return
        const r = root.getBoundingClientRect()
        // rect scale factor undoes the canvas zoom so px math stays in layout space
        const sx = r.width ? root.offsetWidth / r.width : 1
        const sy = r.height ? root.offsetHeight / r.height : 1
        pointerRef.current = {
            x: (e.clientX - r.left) * sx,
            y: (e.clientY - r.top) * sy,
            active: true,
        }
    }
    const onPointerLeave = () => {
        pointerRef.current.active = false
    }

    return (
        <div
            ref={rootRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            /* Clicking anywhere puts an open card back. This handler is the
             * BACKGROUND half of that — a click on a card is settled by the
             * card, which stops the event before it arrives here. Nothing to
             * gate on when nothing is open, so a plain click on the collage
             * still does what it always did. */
            onClick={() => {
                if (zoomed !== null) setZoomed(null)
            }}
            style={{
                // floor before the spread so an explicit instance size still wins
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background,
                isolation: "isolate",
                touchAction: "none",
                ...style,
            }}
        >
            {items.map((im, i) => {
                const slot = LAYOUT[i % LAYOUT.length]
                const w = slot.w * slotSX
                const h = slot.h * slotSY
                const isZoom = zoomed === i
                const link = im.link || ""
                /* Click zooms; clicking the ALREADY-zoomed card follows its
                 * link. Same order the other galleries in this folder use —
                 * opening the link on the first click would make the zoom
                 * unreachable the moment a link was set.
                 *
                 * While a card IS open, every other click puts it back: on the
                 * background (handled on the root), on this card, or on any
                 * neighbour. Picking a different card straight from the open
                 * state is deliberately NOT a swap — one click means one thing,
                 * and the card the pointer is over while another is centred is
                 * usually behind it. */
                const activate = (e?: React.SyntheticEvent) => {
                    /* A card settles its OWN click, always — so the root's
                     * dismiss below only ever sees the background. Stopping on
                     * some paths and not others would leave the open path
                     * leaning on React's render snapshot to keep the root from
                     * undoing the pick on the very same click; that does hold,
                     * but only for as long as `zoomed` is read from state and
                     * never from a ref, which is not a thing to have to
                     * remember. Measured: with the root reading a live value,
                     * the un-stopped path dismissed every pick instantly. */
                    e?.stopPropagation()
                    if (isZoom && link) {
                        window.open(link, "_blank", "noopener")
                        return
                    }
                    if (zoomed !== null) {
                        setZoomed(null)
                        return
                    }
                    setZoomed(i)
                }
                return (
                    <div
                        key={i}
                        ref={(n) => {
                            nodesRef.current[i] = n
                        }}
                        onClick={activate}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isZoom}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                activate(e)
                            }
                        }}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: w,
                            height: h,
                            // transform AND zIndex are owned by the rAF loop
                            // (rule J) — never declared here
                            // percent of the max radius — half the card's short
                            // side — so one number is one shape at every size,
                            // and 100 is a true circle at every aspect
                            clipPath: roundedClip(w, h, rounded),
                            cursor: "pointer",
                            userSelect: "none",
                            background: "rgba(255,255,255,0.06)",
                            /* drop-shadow, not box-shadow: clip-path clips the
                             * element's own painting, and a box-shadow is painted
                             * OUTSIDE the box, so it would be clipped away
                             * entirely. A filter shadow is built from the
                             * post-clip alpha and follows the circle. */
                            filter: isZoom
                                ? "drop-shadow(0 30px 40px rgba(0,0,0,0.55))"
                                : "drop-shadow(0 10px 15px rgba(0,0,0,0.35))",
                            transition: "box-shadow 240ms ease",
                            willChange: "transform",
                        }}
                    >
                        {im.src ? (
                            <img
                                src={im.src}
                                alt=""
                                draggable={false}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                    pointerEvents: "none",
                                }}
                            />
                        ) : null}
                    </div>
                )
            })}
        </div>
    )
}

FloatingGallery.displayName = "Floating Gallery"
