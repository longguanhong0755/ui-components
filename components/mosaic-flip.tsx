"use client"

/**
 * Mosaic Flip — a wall of little cubes standing in a grid, each one carrying a
 * slice of the same picture on its front and back faces so the grid reads as a
 * single image. The cubes never sit still: every tile drifts toward and away
 * from the camera on its own clock, which gives the flat picture a slow,
 * breathing relief.
 *
 * Tapping the wall turns it to the next image and keeps going round the list.
 * The incoming picture is painted onto the faces that are currently turned
 * away, then every cube rotates a half turn — staggered out from the centre of
 * the grid — so the new picture arrives as a ripple rather than a cut. Taps
 * during a turn are queued, so an impatient reader still advances one image per
 * tap instead of losing them.
 *
 * The wall always fills the frame it is given: Columns and Rows say how many
 * cubes, and the frame says how big they are. Pictures are never stretched to
 * those proportions — each one is measured once, then covers the wall on its
 * own aspect and is cropped, with a per-image Offset Y for choosing which band
 * of a tall picture shows. The offset moves the picture behind the cubes; the
 * cubes themselves never move.
 *
 * Ported to a single-file Framer / Next.js component from
 * https://github.com/Animmaster/cube-efffect (Mosaic Flip Hover Effect) — same
 * cube geometry, same centre-out stagger and the same reveal queue, with GSAP's
 * tweens rebuilt on one animation frame loop, the grid sized to its frame
 * instead of to a fixed 12 × 9 of 60px tiles, and its hover-a-caption trigger
 * replaced by a tap on the artwork.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, PointerEvent, ReactElement } from "react"

/* ------------------------------------------------------------------ types */

/** Framer hands `ControlType.Image` back as a URL string on older versions and
 * as a responsive-image object on newer ones. Accept both. */
type ImageInput = string | { src?: string } | null | undefined

export interface MosaicImage {
    image?: ImageInput
    /** Slides this picture up or down behind the wall, as a share of the
     * wall's height. The cubes stay put. */
    offsetY?: number
}

export type MosaicOrigin = "center" | "edges" | "start" | "random"

export interface MosaicFlipProps {
    images?: (MosaicImage | ImageInput)[]
    background?: string
    columns?: number
    rows?: number
    gap?: number
    speed?: number
    stagger?: number
    origin?: MosaicOrigin
    float?: number
    hover?: number
    size?: number
    style?: CSSProperties
}

/** One source of truth for the panel and the signature, so the two can never
 * drift apart. */
const DEFAULTS = {
    background: "#000000",
    columns: 12,
    rows: 8,
    gap: 0,
    speed: 7,
    stagger: 5,
    origin: "center",
    float: 5,
    hover: 10,
    size: 77,
}

/* -------------------------------------------------------------- internals */

/** The six faces of a cube, each pushed out half a tile from the tile's centre.
 * Front and rear carry the picture and do the flipping, the sides carry it too
 * so the edge glimpsed mid-turn still belongs to the wall, and the caps — which
 * are never seen straight on — take the background colour and disappear. */
const FACES = [
    { key: "front", transform: (half: number) => `translateZ(${half}px)` },
    {
        key: "rear",
        transform: (half: number) => `rotateY(180deg) translateZ(${half}px)`,
    },
    {
        key: "right",
        transform: (half: number) => `rotateY(90deg) translateZ(${half}px)`,
    },
    {
        key: "left",
        transform: (half: number) => `rotateY(-90deg) translateZ(${half}px)`,
    },
    {
        key: "top",
        transform: (half: number) => `rotateX(90deg) translateZ(${half}px)`,
    },
    {
        key: "bottom",
        transform: (half: number) => `rotateX(-90deg) translateZ(${half}px)`,
    },
] as const

/** Camera distance, fixed because there is one right answer: near enough that
 * the cubes at the edges of a wide wall read as cubes, far enough that they do
 * not fan out into a fish-eye. */
const PERSPECTIVE = 800

/** The drift's clock, in seconds per leg. Fast enough to never look frozen,
 * slow enough that no single cube draws the eye — this is the look, not a
 * knob. */
const DRIFT_MIN = 0.6
const DRIFT_MAX = 1.4

/** Seconds between the first tile starting to drift and the next one joining,
 * so the wall wakes up as a wave instead of all at once. */
const FLOAT_STAGGER = 0.015

/** Sizes the wall for SSR and the first paint, before the frame is measured.
 * Matches the intrinsic size above, so a server render lands close. */
const FALLBACK_FRAME = { width: 1200, height: 700 }

/** How many stand-in pictures the wall cycles through with no images set. */
const PLACEHOLDER_COUNT = 6

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

/** Stands in for GSAP's `power3.inOut` on the half turn. */
const easeInOutQuart = (t: number): number =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2

/** Stands in for GSAP's `sine.inOut` on the drift. */
const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2

const randomBetween = (min: number, max: number): number =>
    min + Math.random() * (max - min)

function resolveSrc(image: ImageInput): string | null {
    if (!image) return null
    if (typeof image === "string") return image || null
    const src = image.src
    return typeof src === "string" && src ? src : null
}

/** Rows may be `{ image, offsetY }` from the control, or a bare image from an
 * older list — both mean the same thing here. */
function resolveEntry(entry: MosaicImage | ImageInput): {
    src: string | null
    offsetY: number
} {
    if (entry && typeof entry === "object" && "image" in entry) {
        return {
            src: resolveSrc(entry.image),
            offsetY: typeof entry.offsetY === "number" ? entry.offsetY : 0,
        }
    }
    return { src: resolveSrc(entry as ImageInput), offsetY: 0 }
}

/** Stand-in artwork so the wall renders on its own with no props. Gradients
 * slice under `background-size` exactly like a photograph does, so the
 * placeholders spread across the grid the same way real images do. */
function placeholderFill(index: number): string {
    const hue = (index * 47 + 200) % 360
    return `linear-gradient(140deg, hsl(${hue} 42% 44%), hsl(${
        (hue + 50) % 360
    } 58% 9%))`
}

/**
 * Per-tile delay for the half turn, following GSAP's grid stagger: measure each
 * cell's distance from an origin cell, normalise it across the grid, and spend
 * `span` seconds handing the turn out along that ramp.
 */
function computeDelays(
    columns: number,
    rows: number,
    origin: MosaicOrigin,
    span: number
): number[] {
    const total = columns * rows
    const distances = new Array<number>(total)
    const originX = origin === "start" ? 0 : columns / 2 - 0.5
    const originY = origin === "start" ? 0 : rows / 2 - 0.5

    let max = -Infinity
    let min = Infinity
    for (let i = 0; i < total; i += 1) {
        const x = (i % columns) - originX
        const y = originY - Math.floor(i / columns)
        const distance = Math.sqrt(x * x + y * y)
        distances[i] = distance
        if (distance > max) max = distance
        if (distance < min) min = distance
    }

    const range = max - min || 1
    const delays = distances.map((distance) => {
        const ratio = (distance - min) / range
        return (origin === "edges" ? 1 - ratio : ratio) * span
    })

    if (origin === "random") {
        for (let i = delays.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1))
            const swap = delays[i]
            delays[i] = delays[j]
            delays[j] = swap
        }
    }

    return delays
}

/* ------------------------------------------------------------ scene state */

/** One tile's drift: where it left, where it is heading, and the window it has
 * to get there. When the window closes it picks a new one and keeps going. */
interface Drift {
    from: number
    to: number
    start: number
    duration: number
}

interface Scene {
    /** Settled rotation of every tile, in degrees — 180 per reveal so far. */
    rotation: number
    /** The half turn in flight, or null when the wall is at rest. `start` is
     * -1 until the loop stamps it, so the turn is timed against the frame
     * clock and begins on the first frame after the repaint. */
    flip: { from: number; to: number; start: number; duration: number } | null
    drifts: Drift[]
}

/** Everything the frame loop needs, refreshed on every render so a control
 * tweak never has to tear the loop down and build it again. */
interface Frame {
    tiles: number
    amplitude: number
    hover: number
    columns: number
    rows: number
}

/** One picture, already sized to cover the wall on its own aspect: the CSS
 * background value, the sheet it is painted at, and where the top-left of that
 * sheet sits relative to the top-left of the grid. */
interface Slide {
    css: string
    url: string | null
    width: number
    height: number
    x: number
    y: number
}

/* -------------------------------------------------------------- component */

export default function MosaicFlip({
    images = [{"image":"https://images.unsplash.com/photo-1663076125875-b8454612ed9b?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NTB8fHZpYnJhbnQlMjBiYWNrZ3JvdW5kJTIwaW1hZ2V8ZW58MHwwfDB8fHwy","offsetY":0}],
    background = DEFAULTS.background,
    columns = DEFAULTS.columns,
    rows = DEFAULTS.rows,
    gap = DEFAULTS.gap,
    speed = DEFAULTS.speed,
    stagger = DEFAULTS.stagger,
    origin = DEFAULTS.origin,
    float = DEFAULTS.float,
    hover = DEFAULTS.hover,
    size = DEFAULTS.size,
    style,
}: MosaicFlipProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const tileRefs = useRef<(HTMLDivElement | null)[]>([])

    const [frameSize, setFrameSize] = useState({ width: 0, height: 0 })

    /* ---- the reel: the user's pictures, or placeholders when none are set */
    const reel = useMemo(() => {
        const entries = (images ?? [])
            .map(resolveEntry)
            .filter((entry) => entry.src)
        if (entries.length) {
            return entries.map((entry) => ({
                css: `url("${entry.src}")`,
                url: entry.src,
                offsetY: entry.offsetY,
            }))
        }
        return Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => ({
            css: placeholderFill(i),
            url: null as string | null,
            offsetY: 0,
        }))
    }, [images])

    /* ---- natural proportions, measured once per picture ------------------
     * A photograph squeezed into the grid's proportions is the one thing that
     * gives this effect away, so every picture is measured after it loads and
     * then covers the wall on its own aspect instead of being stretched to it.
     * Until a measurement lands the picture fills the wall, which is what a
     * gradient placeholder wants anyway. */
    const aspects = useRef(new Map<string, number>())
    const [measured, redraw] = useState(0)
    const urlKey = reel.map((slide) => slide.url ?? "").join("|")

    useEffect(() => {
        let cancelled = false
        urlKey
            .split("|")
            .filter(Boolean)
            .forEach((url) => {
                if (aspects.current.has(url)) return
                const probe = new window.Image()
                probe.onload = () => {
                    if (cancelled || !probe.naturalWidth || !probe.naturalHeight)
                        return
                    aspects.current.set(
                        url,
                        probe.naturalWidth / probe.naturalHeight
                    )
                    redraw((tick) => tick + 1)
                }
                probe.src = url
            })
        return () => {
            cancelled = true
        }
    }, [urlKey])

    /**
     * Which picture is showing, and how many half turns it took to get there.
     * The parity of `count` says which face is pointing at the camera, so the
     * incoming picture can be painted on the face that is turned away and only
     * become visible once the tiles have swung round.
     */
    const [phase, setPhase] = useState({ count: 0, active: 0, previous: 0 })

    const activeRef = useRef(0)
    activeRef.current = phase.active
    /** The last picture asked for, which runs ahead of `active` while a turn is
     * in flight — so a second tap mid-turn advances two, rather than being
     * swallowed. */
    const targetRef = useRef(0)
    /** A turn in flight is never interrupted: the tap is held here and played
     * the moment the wall settles. */
    const revealingRef = useRef(false)
    const queuedRef = useRef<number | null>(null)

    const columnCount = Math.max(1, Math.round(columns))
    const rowCount = Math.max(1, Math.round(rows))
    const tileCount = columnCount * rowCount

    /* ---- geometry: the frame decides how big a cube is -------------------
     * Columns and Rows already say how the wall is divided, so the cube size
     * falls out of the frame rather than being a control of its own. The wall
     * takes the largest square tile that fits both ways and centres itself,
     * which is the whole responsive story: the same composition on a laptop, a
     * tablet and a phone, at whatever size the frame gives it. */
    const frameWidth = frameSize.width || FALLBACK_FRAME.width
    const frameHeight = frameSize.height || FALLBACK_FRAME.height

    // Width and Height are independent scale controls for the finished mosaic.
    // The cube grid is sized once from the full frame, then scaled horizontally
    // and vertically. This prevents changing Width from also changing Height
    // (the previous min(width, height) calculation made the whole wall shrink
    // diagonally).
    // One Size control scales the entire mosaic uniformly, preserving its aspect ratio.
    const sizeScale = clamp(size ?? DEFAULTS.size, 10, 100) / 100
    const baseTile = Math.max(
        1,
        Math.min(
            (frameWidth - gap * (columnCount - 1)) / columnCount,
            (frameHeight - gap * (rowCount - 1)) / rowCount
        )
    )
    const tile = baseTile
    const half = tile / 2
    const sheetWidth = columnCount * tile
    const sheetHeight = rowCount * tile

    /* ---- cover each picture to the wall, then nudge it by its own offset */
    const slides = useMemo<Slide[]>(
        () =>
            reel.map((entry) => {
                const aspect = entry.url ? aspects.current.get(entry.url) : null
                const width =
                    aspect && aspect > 0
                        ? Math.max(sheetWidth, sheetHeight * aspect)
                        : sheetWidth
                const height =
                    aspect && aspect > 0 ? width / aspect : sheetHeight
                return {
                    css: entry.css,
                    url: entry.url,
                    width,
                    height,
                    x: (sheetWidth - width) / 2,
                    y:
                        (sheetHeight - height) / 2 +
                        (clamp(entry.offsetY, -100, 100) / 100) * sheetHeight,
                }
            }),
        // `measured` ticks when a measurement lands — the only thing that tells
        // this memo the aspects behind the ref have changed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [reel, sheetWidth, sheetHeight, urlKey, measured]
    )

    /* ---- derived motion: abstract 0–10 scales mapped to real units */
    const flipDuration = clamp(1.2 - clamp(speed, 0, 10) * 0.1, 0.2, 1.2)
    const staggerSpan = clamp(stagger, 0, 10) * 0.12
    // The drift is measured in tiles, so it reads the same on a wall of 30px
    // cubes as on one of 120px cubes.
    const amplitude = clamp(float, 0, 10) * 0.13 * tile

    const scene = useRef<Scene>({ rotation: 0, flip: null, drifts: [] })

    /* ---- hover: the pointer creates a local depth response -----------------
     * Hovering is deliberately tied to the cube geometry: tiles close to the
     * pointer lift toward the viewer and those farther away stay calm. This
     * makes the 3D wall feel tangible without competing with the image flip. */
    const pointerRef = useRef({ x: 0, y: 0, active: false })
    const hoverRef = useRef(0)
    const targetHoverRef = useRef(0)
    const HOVER_RADIUS = 2.8
    const HOVER_LIFT = 0.34
    const HOVER_TILT = 4
    const HOVER_SCALE = 0.035

    const frame = useRef<Frame>({
        tiles: tileCount,
        amplitude,
        hover: 0,
        columns: columnCount,
        rows: rowCount,
    })
    frame.current = {
        tiles: tileCount,
        amplitude,
        hover: clamp(hover, 0, 10) / 10,
        columns: columnCount,
        rows: rowCount,
    }

    const delaysRef = useRef<number[]>([])
    useEffect(() => {
        delaysRef.current = computeDelays(
            columnCount,
            rowCount,
            origin,
            staggerSpan
        )
    }, [columnCount, rowCount, origin, staggerSpan])

    /* ---- measure */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        const observer = new ResizeObserver((entries) => {
            const rect = entries[0].contentRect
            setFrameSize({ width: rect.width, height: rect.height })
        })
        observer.observe(node)
        setFrameSize({ width: node.clientWidth, height: node.clientHeight })
        return () => observer.disconnect()
    }, [])

    /* ---- the reveal queue ------------------------------------------------
     * Paint first, turn second: bumping `count` re-renders the hidden faces
     * with the incoming picture, and the effect below starts the turn once that
     * paint has landed. */
    const revealRef = useRef<(index: number) => void>(() => {})
    const reveal = useCallback((index: number) => {
        if (revealingRef.current) {
            queuedRef.current = index
            return
        }
        if (index === activeRef.current) return

        revealingRef.current = true
        queuedRef.current = null
        activeRef.current = index
        setPhase((current) => ({
            count: current.count + 1,
            active: index,
            previous: current.active,
        }))
    }, [])
    revealRef.current = reveal

    /** Tap anywhere on the wall for the next picture, wrapping at the end. */
    const advance = useCallback(() => {
        if (slides.length < 2) return
        const next = (targetRef.current + 1) % slides.length
        targetRef.current = next
        revealRef.current(next)
    }, [slides.length])

    /* A shorter list can leave the wall pointed at a picture that is no longer
     * there, so walk it back to the last one rather than showing a blank. */
    useEffect(() => {
        if (phase.active < slides.length) return
        targetRef.current = slides.length - 1
        revealRef.current(slides.length - 1)
    }, [slides.length, phase.active])

    useEffect(() => {
        if (phase.count === 0) return
        scene.current.flip = {
            from: (phase.count - 1) * 180,
            to: phase.count * 180,
            start: -1,
            duration: flipDuration,
        }
        // Only the turn counter starts a turn — a speed tweak mid-flight must
        // not restart one.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase.count])

    /* ---- the frame loop */
    useEffect(() => {
        let raf = 0

        const paint = (timestamp: number) => {
            const now = timestamp / 1000
            const config = frame.current
            const state = scene.current
            const delays = delaysRef.current

            targetHoverRef.current = pointerRef.current.active
                ? config.hover
                : 0
            hoverRef.current +=
                (targetHoverRef.current - hoverRef.current) *
                (1 - Math.exp(-10 * 1 / 60))

            if (state.drifts.length !== config.tiles) {
                const next: Drift[] = []
                for (let i = 0; i < config.tiles; i += 1) {
                    next.push(
                        state.drifts[i] ?? {
                            from: 0,
                            to: randomBetween(
                                -config.amplitude,
                                config.amplitude
                            ),
                            start: now + i * FLOAT_STAGGER,
                            duration: randomBetween(DRIFT_MIN, DRIFT_MAX),
                        }
                    )
                }
                state.drifts = next
            }

            const flip = state.flip
            if (flip && flip.start < 0) flip.start = now
            let settled = flip !== null

            for (let i = 0; i < config.tiles; i += 1) {
                const column = i % config.columns
                const row = Math.floor(i / config.columns)
                const drift = state.drifts[i]
                if (now >= drift.start + drift.duration) {
                    drift.from = drift.to
                    drift.to = randomBetween(-config.amplitude, config.amplitude)
                    drift.start = now
                    drift.duration = randomBetween(DRIFT_MIN, DRIFT_MAX)
                }
                const driftProgress = clamp(
                    (now - drift.start) / drift.duration,
                    0,
                    1
                )
                const z =
                    drift.from +
                    (drift.to - drift.from) * easeInOutSine(driftProgress)

                let rotation = state.rotation
                if (flip) {
                    const progress = clamp(
                        (now - flip.start - (delays[i] ?? 0)) / flip.duration,
                        0,
                        1
                    )
                    if (progress < 1) settled = false
                    rotation =
                        flip.from +
                        (flip.to - flip.from) * easeInOutQuart(progress)
                }

                const node = tileRefs.current[i]
                if (node) {
                    const px =
                        pointerRef.current.x *
                        (config.columns > 0 ? config.columns - 1 : 0)
                    const py =
                        pointerRef.current.y *
                        (config.rows > 0 ? config.rows - 1 : 0)
                    const dx = column - px
                    const dy = row - py
                    const distance = Math.sqrt(dx * dx + dy * dy)
                    const proximity = pointerRef.current.active
                        ? clamp(1 - distance / HOVER_RADIUS, 0, 1)
                        : 0
                    const hover = proximity * hoverRef.current
                    // The hovered tile rises toward the viewer, while its
                    // immediate neighbours respond less. The tiny scale change
                    // makes the depth response visible even on small tiles.
                    const hoverZ = hover * HOVER_LIFT * tile
                    const tiltX = (py - row) * hover * HOVER_TILT
                    const tiltY = (column - px) * hover * HOVER_TILT
                    const scale = 1 + hover * HOVER_SCALE

                    node.style.transform =
                        `translateZ(${z + hoverZ}px) ` +
                        `rotateX(${tiltX}deg) ` +
                        `rotateY(${rotation + tiltY}deg) ` +
                        `scale(${scale})`
                }
            }

            if (flip && settled) {
                state.rotation = flip.to
                state.flip = null
                revealingRef.current = false
                const queued = queuedRef.current
                queuedRef.current = null
                if (queued !== null && queued !== activeRef.current) {
                    revealRef.current(queued)
                }
            }

            raf = requestAnimationFrame(paint)
        }

        raf = requestAnimationFrame(paint)
        return () => cancelAnimationFrame(raf)
    }, [])

    /* ---- faces ------------------------------------------------------------
     * The picture is one sheet laid across the whole grid and each face shows
     * its own window onto it. Front and rear swap roles every turn: whichever
     * one is facing away holds the incoming picture. */
    const showingFront = phase.count % 2 === 0
    const activeSlide = slides[phase.active] ?? slides[0]
    const previousSlide = slides[phase.previous] ?? slides[0]
    const frontSlide = showingFront ? activeSlide : previousSlide
    const rearSlide = showingFront ? previousSlide : activeSlide

    const faceBase: CSSProperties = {
        position: "absolute",
        width: tile,
        height: tile,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
    }

    const tiles: ReactElement[] = []
    for (let i = 0; i < tileCount; i += 1) {
        const column = i % columnCount
        const row = Math.floor(i / columnCount)

        tiles.push(
            <div
                key={i}
                ref={(node) => {
                    tileRefs.current[i] = node
                }}
                style={{
                    position: "relative",
                    width: tile,
                    height: tile,
                    transformStyle: "preserve-3d",
                    willChange: "transform",
                }}
            >
                {FACES.map((face) => {
                    const isCap = face.key === "top" || face.key === "bottom"
                    const slide = isCap
                        ? null
                        : face.key === "front"
                          ? frontSlide
                          : face.key === "rear"
                            ? rearSlide
                            : activeSlide

                    return (
                        <div
                            key={face.key}
                            style={{
                                ...faceBase,
                                transform: face.transform(half),
                                backgroundImage: slide ? slide.css : "none",
                                backgroundSize: slide
                                    ? `${slide.width}px ${slide.height}px`
                                    : undefined,
                                backgroundPosition: slide
                                    ? `${slide.x - column * tile}px ${
                                          slide.y - row * tile
                                      }px`
                                    : undefined,
                                backgroundColor: slide ? undefined : background,
                            }}
                        />
                    )
                })}
            </div>
        )
    }

    const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect || rect.width <= 0 || rect.height <= 0) return

        if (event.pointerType === "touch") return

        pointerRef.current = {
            x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
            y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
            active: true,
        }
    }, [])

    const handlePointerLeave = useCallback(() => {
        pointerRef.current.active = false
    }, [])

    return (
        <div
            ref={containerRef}
            onClick={advance}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background,
                perspective: `${PERSPECTIVE}px`,
                transformStyle: "preserve-3d",
                cursor: slides.length > 1 ? "pointer" : "default",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                userSelect: "none",
                ...style,
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${columnCount}, ${tile}px)`,
                    gridTemplateRows: `repeat(${rowCount}, ${tile}px)`,
                    gap,
                    transform: `scale(${sizeScale})`,
                    transformStyle: "preserve-3d",
                    pointerEvents: "none",
                }}
            >
                {tiles}
            </div>
        </div>
    )
}
