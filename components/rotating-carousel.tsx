"use client"

import * as React from "react"
import { useRef, useMemo, useEffect, useState } from "react"
import {
    motion,
    useMotionValue,
    useTransform,
    useSpring,
    useVelocity,
    type MotionValue,
} from "motion/react"

/**
 * Smear Carousel — a 3D ring of cards that blurs with scroll velocity.
 *
 * Ported into this repo's standard (CLAUDE.md rule 10). Panel is 12 leaf dials,
 * whole numbers everywhere (rule 3). Clean break on keys, no fallbacks:
 *   size + aspect  -> imageWidth + imageHeight  (two px dials; the card is now
 *                     sized directly. NOT keyed `width`/`height`: Framer injects
 *                     those two names itself and would clobber the control.
 *                     Range retuned 50–1600 -> SIZE_MIN–SIZE_MAX, the folder's
 *                     shared 40–800 span.)
 *   (new)          -> fit         cover | contain
 *   (new)          -> yPosition   vertical framing, cover only
 *   perspective    -> CUT, frozen at FOV_DEG
 *   damping        -> CUT, frozen at SPRING_DAMPING
 *   hover          -> CUT, frozen at HOVER_ZOOM_PCT
 *   smear          -> CUT, frozen at SMEAR_PCT
 *   rotation       -> unchanged key and unit (degrees, 0..90), but floored at
 *                     ROTATION_FLOOR_DEG: 0 on the dial still turns 2°.
 * A cut control freezes its current default in a named constant and the render
 * path is unchanged (rule 11b) — nothing looks different, the row is just gone.
 *
 * The two soft edges are now a FADE to the background colour, not a
 * backdrop-filter blur.
 */

interface SmearItem {
    image: string
    link: string
}

interface Props {
    images: SmearItem[]
    background: string
    direction: "horizontal" | "vertical"
    imageWidth: number
    imageHeight: number
    fit: "cover" | "contain"
    yPosition: number
    gap: number
    rounded: number
    rotation: number
    speed: number
    style?: React.CSSProperties
}

/* Dummy pictures, so a fresh instance ships with a deck instead of an empty
 * Images array. Inline SVG data URIs, never photo URLs: a default pointing at a
 * CDN 404s the day that ID dies and shows nothing offline, behind a proxy, or
 * on a Framer canvas with no network. One set across the folder. */
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

/** Card ships 500 x 285 — the dummy is cut to that shape, not letterboxed. */
const DEFAULT_ITEMS: SmearItem[] = DUMMY_PAIRS.map((_, i) => ({
    image: dummyImage(i, 1000, 570),
    link: "",
}))

/** Gradient deck, still the fallback when a designer empties the array. */
const PLACEHOLDER_FILLS: string[] = [
    "linear-gradient(135deg, #1E3A8A, #3B82F6)",
    "linear-gradient(135deg, #064E3B, #10B981)",
    "linear-gradient(135deg, #b91c1c, #ef4444)",
    "linear-gradient(135deg, #c2410c, #f97316)",
    "linear-gradient(135deg, #4C1D95, #8B5CF6)",
    "linear-gradient(135deg, #164e63, #06b6d4)",
]

/** Ring needs enough cards that the far side is always off-screen. */
const MIN_CARDS = 18
/** Side cards are this fraction of the focused card. Fixed by the design. */
const SIDE_W = 0.64
const SIDE_H = 0.98
/** Degrees a card turns per step away from the focus, before the Rotation cap. */
const TURN_PER_STEP = 35
/** The cards never go fully flat: Rotation 0 on the panel still turns them 2°. */
const ROTATION_FLOOR_DEG = 2
/** Furthest step the ring ever places; 18 cards fold into ±9. */
const MAX_STEPS = 9
/** Cut controls, frozen at the value the component shipped with. */
const SPRING_STIFFNESS = 180
const SPRING_DAMPING = 100
const DEPTH_PER_STEP = 200
const SNAP_DELAY_MS = 150
const SMEAR_PCT = 50
const MAX_SMEAR_PX = 20
const HOVER_ZOOM_PCT = 6
const FOV_DEG = 90
/** How far in from each edge the ring fades out, as a percent of the host. */
const EDGE_FADE_PCT = 25
/** Card box range, one pair across framer/cards so Width and Height mean the
 *  same span on every component in the folder. Was 50–1600 here. A range change
 *  cannot be migrated by a key fallback — the stored number is the same either
 *  way — so a live instance above 800 is clamped by the panel on next edit. */
const SIZE_MIN = 40
const SIZE_MAX = 800

function __BaseImpl_SmearCarousel(props: Props) {
    const {
        // Defaulted in CODE too, not only by the control: a prop the control
        // has not filled in yet (canvas first paint, a code import, a test)
        // arrives undefined, and `= []` sent the deck to the gradient
        // placeholders even though the panel says six pictures (rule 11c).
        images = [{"link":"","image":"https://images.unsplash.com/photo-1769112112632-26be33f821b0?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHx0b3BpYy1mZWVkfDJ8NnNNVmpUTFNrZVF8fGVufDB8fHx8fA%3D%3D"},{"link":"","image":"https://images.unsplash.com/photo-1779380033776-ca3c5e64c893?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHx0b3BpYy1mZWVkfDN8NnNNVmpUTFNrZVF8fGVufDB8fHx8fA%3D%3D"},{"link":"","image":"https://images.unsplash.com/photo-1777661097541-e9ebeffe6aa2?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHx0b3BpYy1mZWVkfDEyfDZzTVZqVExTa2VRfHxlbnwwfHx8fHw%3D"},{"link":"","image":"https://images.unsplash.com/photo-1544200502-6652e105f865?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHx0b3BpYy1mZWVkfDE0fDZzTVZqVExTa2VRfHxlbnwwfHx8fHw%3D"},{"link":"","image":"https://images.unsplash.com/photo-1780552274859-b3a1e6effd50?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHx0b3BpYy1mZWVkfDE4fDZzTVZqVExTa2VRfHxlbnwwfHx8fHw%3D"},{"link":"","image":"https://images.unsplash.com/photo-1785495449093-81a1ecd00092?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHx0b3BpYy1mZWVkfDE5fDZzTVZqVExTa2VRfHxlbnwwfHx8fHw%3D"}],
        background = "#0a0a0c",
        direction = "horizontal",
        imageWidth = 500,
        imageHeight = 285,
        fit = "cover",
        yPosition = 50,
        gap = 26,
        rounded = 0,
        rotation = 90,
        speed = 40,
        style,
    } = props
    // Pulled out before anything depends on it — Framer hands back a fresh
    // array every render, so an effect keyed on it rebuilds every time (rule G).
    const items = images

    const hostRef = useRef<HTMLDivElement | null>(null)
    /* Whether the pointer is over the component at all.
     *
     * The cards live in a `preserve-3d` subtree under a perspective, and a
     * 3D-transformed box does not come back from hit-testing — measured: the
     * topmost element at the viewport centre is the ring container, never a
     * card, so a per-card onHoverStart never fires. The ROOT is a plain
     * untransformed box, so it hovers reliably; the focused card responds. */
    const [pointerOver, setPointerOver] = useState(false)
    const scrollTarget = useRef(0)
    const snapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const rawScroll = useMotionValue(0)

    const horizontal = direction === "horizontal"
    const cardW = Math.max(1, Math.round(imageWidth))
    const cardH = Math.max(1, Math.round(imageHeight))
    const sideW = Math.round(cardW * SIDE_W)
    const sideH = Math.round(cardH * SIDE_H)

    /* CSS perspective is a px distance derived from a field of view and the
     * measured host height. offsetHeight, never getBoundingClientRect — the
     * rect carries the canvas zoom. */
    const [hostH, setHostH] = useState(800)
    useEffect(() => {
        const host = hostRef.current
        if (!host) return
        const read = () => setHostH(Math.max(1, host.offsetHeight))
        read()
        const ro = new ResizeObserver(read)
        ro.observe(host)
        return () => ro.disconnect()
    }, [])
    const fovRad = (FOV_DEG * Math.PI) / 360
    const perspectivePx = Math.max(1, Math.round(hostH / 2 / Math.tan(fovRad)))

    /* Rotation is a literal degree cap with a 2° floor: the dial reads 0–90 and
     * the cards never turn less than 2°, so 0 on the panel is 2° of turn. */
    const maxTurn = Math.max(ROTATION_FLOOR_DEG, rotation)

    /* Where each step of the ring sits, in world px along the scroll axis.
     *
     * Gap is a SCREEN gap, and it has to be solved for, not assigned. A card
     * sits at `z = -k * DEPTH_PER_STEP` and is turned by `k * TURN_PER_STEP`,
     * so what reaches the screen is a perspective-divided, foreshortened quad
     * — never the box the layout says. Placing it at a world-px gap therefore
     * put it ON TOP of the focused card: measured, the first neighbour painted
     * from x=917 while the focused card ran to x=950, a 33px overlap. Rotation
     * was hiding it (a turned card projects a narrower footprint), so the
     * overlap only surfaced as Rotation came down, and it showed at the CORNERS
     * first — that is where Rounded clips the focused card away and lets the
     * card behind through the notch.
     *
     * So: project the card's two along-axis corners, and solve for the world
     * position that puts the nearer of them exactly `gap` px past the previous
     * card's far corner. Screen x of a corner `u` from the card centre is
     *     (A + u·cosθ) · P / (P + kD + u·sinθ)
     * which is monotonic in A, so the binding corner is just the larger root.
     * Chained from the focused card outward, once per render, not per frame. */
    const alongTable = useMemo(() => {
        const P = perspectivePx
        const half0 = (horizontal ? cardW : cardH) / 2
        const halfSide = (horizontal ? sideW : sideH) / 2
        const corners = [-halfSide, halfSide]
        /* Which way a corner swings in z. rotateY sends the corner at +x to
         * `z = -u·sinθ`, rotateX sends the corner at +y to `z = +u·sinθ` — the
         * opposite. Measured: with one sign for both, the vertical ring solved
         * against the wrong corner and overlapped by up to 205px. */
        const zSign = horizontal ? 1 : -1
        const table = [0]
        let prevEdge = half0 // focused card: turn 0 at z 0, so no divide
        for (let k = 1; k <= MAX_STEPS; k++) {
            const th =
                (Math.min(k * TURN_PER_STEP, maxTurn) * Math.PI) / 180
            const cos = Math.cos(th)
            const sin = Math.sin(th)
            const target = prevEdge + gap
            // a corner swung level with the eye has no finite solution; the
            // other corner is the binding one anyway
            const denom = (u: number) =>
                P + k * DEPTH_PER_STEP + zSign * u * sin
            const roots = corners
                .filter((u) => denom(u) > 1)
                .map((u) => (target * denom(u)) / P - u * cos)
            const A = roots.length
                ? Math.max(...roots)
                : table[k - 1] + halfSide * 2 + gap
            table.push(A)
            prevEdge = Math.max(
                ...corners.map((u) =>
                    denom(u) > 1 ? ((A + u * cos) * P) / denom(u) : target
                )
            )
        }
        return table
    }, [horizontal, cardW, cardH, sideW, sideH, gap, maxTurn, perspectivePx])

    const smoothScroll = useSpring(rawScroll, {
        stiffness: SPRING_STIFFNESS,
        damping: SPRING_DAMPING,
        mass: 1,
        restDelta: 0.001,
    })

    /* Progressive smear: blur tracks how fast the ring is actually moving, so
     * a flick smears and a settle sharpens. This is the effect the component
     * is named for. */
    const velocity = useVelocity(smoothScroll)
    const smearBlur = useTransform(velocity, (v) =>
        Math.min((Math.abs(v) * SMEAR_PCT) / 100, MAX_SMEAR_PX)
    )

    const renderItems = useMemo(() => {
        const pool: SmearItem[] =
            items && items.length > 0
                ? items
                : PLACEHOLDER_FILLS.map((fill) => ({ image: fill, link: "" }))
        const out: SmearItem[] = []
        while (out.length < MIN_CARDS) out.push(...pool)
        return out
    }, [items])
    const total = renderItems.length

    /* Idle drift. Raw rAF, which ticks on the Framer canvas — the component is
     * otherwise motionless there until someone scrolls it. */
    useEffect(() => {
        if (speed <= 0) return
        let raf = 0
        let last = performance.now()
        const tick = (now: number) => {
            const dt = Math.min(0.1, (now - last) / 1000)
            last = now
            // 50 is the reference rate: one card per second
            scrollTarget.current += (speed / 50) * dt
            rawScroll.set(scrollTarget.current)
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [speed, rawScroll])

    const snapSoon = () => {
        if (speed > 0) return // drifting: snapping would fight the drift
        if (snapTimeout.current) clearTimeout(snapTimeout.current)
        snapTimeout.current = setTimeout(() => {
            scrollTarget.current = Math.round(scrollTarget.current)
            rawScroll.set(scrollTarget.current)
        }, SNAP_DELAY_MS)
    }
    useEffect(() => {
        return () => {
            if (snapTimeout.current) clearTimeout(snapTimeout.current)
        }
    }, [])

    const onWheel = (e: React.WheelEvent) => {
        const along = horizontal
            ? Math.abs(e.deltaX) > Math.abs(e.deltaY)
                ? e.deltaX
                : e.deltaY * 0.8
            : e.deltaY
        scrollTarget.current += along * 0.004
        rawScroll.set(scrollTarget.current)
        snapSoon()
    }
    const onPan = (_e: PointerEvent, info: { delta: { x: number; y: number } }) => {
        const along = horizontal ? -info.delta.x : -info.delta.y
        scrollTarget.current += along * 0.005
        rawScroll.set(scrollTarget.current)
        if (snapTimeout.current) clearTimeout(snapTimeout.current)
    }
    const onPanEnd = (
        _e: PointerEvent,
        info: { velocity: { x: number; y: number } }
    ) => {
        const v = horizontal ? -info.velocity.x : -info.velocity.y
        scrollTarget.current += v * 0.0015
        if (speed <= 0) scrollTarget.current = Math.round(scrollTarget.current)
        rawScroll.set(scrollTarget.current)
    }

    /* The wheel/pan handlers live on the ROOT, not on an overlay above the
     * cards. A full-bleed gesture layer at a higher z-index eats every pointer
     * event on its way down, so the cards never see a hover. Events bubble, so
     * the root still gets the wheel and the pan. */
    return (
        <motion.div
            ref={hostRef}
            onWheel={onWheel}
            onPan={onPan as any}
            onPanEnd={onPanEnd as any}
            onPointerEnter={() => setPointerOver(true)}
            onPointerLeave={() => setPointerOver(false)}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                cursor: "grab",
                touchAction: horizontal ? "pan-y" : "pan-x",
                // Framer Fit Content collapses a 100% root to 0x0 — floor it
                // BEFORE the spread, so an explicit instance size still wins
                minWidth: 1200,
                minHeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                background,
                perspective: perspectivePx,
                isolation: "isolate",
                ...style,
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: 0,
                    height: 0,
                    transformStyle: "preserve-3d",
                }}
            >
                {renderItems.map((item, i) => (
                    <SmearCard
                        key={`card-${i}`}
                        item={item}
                        index={i}
                        total={total}
                        scroll={smoothScroll}
                        blur={smearBlur}
                        cardW={cardW}
                        cardH={cardH}
                        sideW={sideW}
                        sideH={sideH}
                        alongTable={alongTable}
                        maxTurn={maxTurn}
                        rounded={rounded}
                        fit={fit}
                        yPosition={yPosition}
                        background={background}
                        pointerOver={pointerOver}
                        horizontal={horizontal}
                    />
                ))}
            </div>

            <div style={edgeStyle(horizontal, false, background)} />
            <div style={edgeStyle(horizontal, true, background)} />
        </motion.div>
    )
}

/** The two soft edges that frame the ring: a FADE to the background colour, not
 *  a blur. A gradient overlay and not a mask on the ring, because a mask would
 *  flatten the `preserve-3d` subtree it is applied to and kill the depth. */
function edgeStyle(
    horizontal: boolean,
    far: boolean,
    background: string
): React.CSSProperties {
    // opaque AT the edge, transparent as it runs inward
    const to = horizontal ? (far ? "left" : "right") : far ? "top" : "bottom"
    return {
        position: "absolute",
        ...(horizontal
            ? {
                  top: 0,
                  bottom: 0,
                  width: `${EDGE_FADE_PCT}%`,
                  [far ? "right" : "left"]: 0,
              }
            : {
                  left: 0,
                  right: 0,
                  height: `${EDGE_FADE_PCT}%`,
                  [far ? "bottom" : "top"]: 0,
              }),
        backgroundImage: `linear-gradient(to ${to}, ${background} 0%, transparent 100%)`,
        pointerEvents: "none",
        zIndex: 4,
    }
}

interface CardProps {
    item: SmearItem
    index: number
    total: number
    scroll: MotionValue<number>
    blur: MotionValue<number>
    cardW: number
    cardH: number
    sideW: number
    sideH: number
    alongTable: number[]
    maxTurn: number
    rounded: number
    fit: "cover" | "contain"
    yPosition: number
    background: string
    pointerOver: boolean
    horizontal: boolean
}

function SmearCard({
    item,
    index,
    total,
    scroll,
    blur,
    cardW,
    cardH,
    sideW,
    sideH,
    alongTable,
    maxTurn,
    rounded,
    fit,
    yPosition,
    background,
    pointerOver,
    horizontal,
}: CardProps) {
    // signed distance from the focused slot, folded into ±total/2
    const offset = useTransform(scroll, (v) => {
        let mapped = (((index - v) % total) + total) % total
        if (mapped > total / 2) mapped -= total
        return mapped
    })
    const absOffset = useTransform(offset, Math.abs)

    const w = useTransform(absOffset, [0, 1], [cardW, sideW], { clamp: true })
    const h = useTransform(absOffset, [0, 1], [cardH, sideH], { clamp: true })

    /* Placement along the scroll axis: read the solved world position for this
     * step out of the shared table and interpolate between steps, so a card
     * mid-scroll travels smoothly between two collision-free slots. */
    const along = useTransform(offset, (o) => {
        const a = Math.min(Math.abs(o), MAX_STEPS)
        const k = Math.floor(a)
        const A =
            k >= MAX_STEPS
                ? alongTable[MAX_STEPS]
                : alongTable[k] + (alongTable[k + 1] - alongTable[k]) * (a - k)
        return Math.sign(o) * A
    })

    /* Centre by translating half the card, never by animating margins — a
     * margin is a layout write and would reflow the ring every frame (rule N). */
    const x = useTransform([along, w], ([a, cw]: number[]) =>
        horizontal ? a - cw / 2 : -cw / 2
    )
    const y = useTransform([along, h], ([a, ch]: number[]) =>
        horizontal ? -ch / 2 : a - ch / 2
    )
    const z = useTransform(absOffset, (a) => -a * DEPTH_PER_STEP)

    // same ramp the placement table was solved against
    const turn = useTransform(offset, (o) =>
        Math.sign(o) * Math.min(Math.abs(o) * TURN_PER_STEP, maxTurn)
    )
    const zIndex = useTransform(absOffset, (a) => 1000 - Math.round(a * 10))
    const opacity = useTransform(absOffset, [0, 5, 7], [1, 1, 0])

    /* Percent of the maximum radius — half the SHORT side — so one number is
     * one shape at every card size (rule 7), and 100 is a true CIRCLE at every
     * aspect rather than a pill: the clip box narrows toward a square as the
     * radius grows, so the two meet at a circle of diameter min(w, h) and the
     * long axis is clipped away. The card's own box never resizes, so the
     * carousel's spacing is untouched. Both sides animate, so this is derived
     * from both, as one clip string. */
    const clipPath = useTransform([w, h], ([cw, ch]: number[]) => {
        const t = Math.max(0, Math.min(100, rounded)) / 100
        const short = Math.min(cw, ch)
        const insetX = (t * (cw - short)) / 2
        const insetY = (t * (ch - short)) / 2
        return `inset(${insetY}px ${insetX}px round ${(t * short) / 2}px)`
    })
    const filter = useTransform(blur, (b) => (b > 0.05 ? `blur(${b}px)` : "none"))

    const src = item?.image ?? ""
    const isURL =
        src.startsWith("http") || src.startsWith("data:") || src.startsWith("/")
    /* Cover crops to fill the card and Y Position picks WHICH crop; contain
     * fits the whole picture inside it, where a vertical position has nothing
     * left to slide and the control is hidden. Contain also gets the background
     * colour UNDER the picture: the letterbox is otherwise a transparent hole
     * in the card and the cards stacked behind it show through. */
    const fillStyle: React.CSSProperties = isURL
        ? {
              backgroundColor: fit === "contain" ? background : undefined,
              backgroundImage: `url(${src})`,
              backgroundSize: fit,
              backgroundRepeat: "no-repeat",
              backgroundPosition:
                  fit === "cover"
                      ? `50% ${Math.max(0, Math.min(100, yPosition))}%`
                      : "50% 50%",
          }
        : {
              background:
                  src || PLACEHOLDER_FILLS[index % PLACEHOLDER_FILLS.length],
          }

    /* The focused card is the one under the pointer, by construction — it is
     * the card the carousel has brought to the centre. */
    const [focused, setFocused] = useState(false)
    useEffect(() => {
        const unsub = absOffset.on("change", (v) => setFocused(v < 0.5))
        setFocused(Math.abs(absOffset.get()) < 0.5)
        return unsub
    }, [absOffset])

    const scale = 1 + (pointerOver && focused ? HOVER_ZOOM_PCT / 100 : 0)

    const card = (
        <motion.div
            style={{
                position: "absolute",
                inset: 0,
                ...fillStyle,
                clipPath,
                opacity,
                filter,
            }}
            animate={{ scale }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
    )

    return (
        <motion.div
            style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: w,
                height: h,
                x,
                y,
                z,
                rotateY: horizontal ? turn : 0,
                rotateX: horizontal ? 0 : turn,
                zIndex,
                transformStyle: "preserve-3d",
                // the box resizes by design; keep the reflow local (rule N)
                contain: "layout",
            }}
        >
            {item?.link ? (
                <a
                    href={item.link}
                    style={{ position: "absolute", inset: 0, display: "block" }}
                >
                    {card}
                </a>
            ) : (
                card
            )}
        </motion.div>
    )
}

const __presetProps = {
  "images": [
    {
      "link": "",
      "image": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=2474&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
      "link": "",
      "image": "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
      "link": "",
      "image": "https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
      "link": "",
      "image": "https://images.unsplash.com/photo-1539634262233-7c0b48ab9503?q=80&w=2025&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
      "link": "",
      "image": "https://plus.unsplash.com/premium_photo-1677347335105-1bd16607a25e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzN8fG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D"
    },
    {
      "link": "",
      "image": "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    }
  ],
  "background": "#0a0a0c",
  "direction": "horizontal",
  "imageWidth": 500,
  "imageHeight": 285,
  "fit": "cover",
  "yPosition": 50,
  "gap": 26,
  "rounded": 0,
  "rotation": 90,
  "speed": 40
};

export default function SmearCarousel(props: Record<string, unknown>) {
  return <__BaseImpl_SmearCarousel {...(__presetProps as Record<string, unknown>)} {...props} />;
}
