"use client"

import { motion, useMotionValue, type Transition } from "motion/react"
import React, { useEffect, useMemo, useRef, useState } from "react"

/* ------------------------------------------------------------------ *
 * Fixed look. These are the animation's identity, not knobs.
 * ------------------------------------------------------------------ */

// Perspective as a multiple of the cube's edge — 1200px against the brief's
// 300px face.
const PERSPECTIVE_RATIO = 4

// The cube's edge as a share of the frame's short side. It needs headroom: at
// this camera angle the cube's projected width is ~1.4x its edge, and a
// mid-turn layer swings a further half-tile past that.
const CUBE_FILL = 0.42

// The scrambled pose is dwelt on for less time than the assembled letter.
const SCRAMBLE_DWELL = 0.45

// Glyph metrics are measured at this size and scaled; large enough that
// rounding in the ink box does not matter.
const PROBE = 100

// Used until the real ink box has been measured. Cap height of a grotesque is
// roughly 0.72em; the letter is a hair low against its line box.
const FALLBACK_INK: Ink = { hRatio: 0.72, wRatio: 0.6, dxRatio: 0, dyRatio: 0.01 }

// Degrees of orbit per pixel dragged, at Sensitivity 5.
const DRAG_DEG_PER_PX = 0.07

// How far past level a drag may tilt the cube. Beyond this the yaw axis is
// nearly edge-on to the screen and the orbit stops answering the pointer.
const PITCH_LIMIT = 85

// A cube has four faces on the yaw ring; the other two are the caps.
const RING = 4
const FACE_COUNT = 6

// The brief's curve: stepped, decisive, no overshoot.
const DEFAULT_TRANSITION: Transition = {
    type: "tween",
    duration: 0.6,
    ease: [0.22, 1, 0.36, 1],
}

const DEFAULT_FONT: React.CSSProperties = {
    fontFamily: "'Arial Black', Impact, Inter, Helvetica, sans-serif",
    fontWeight: 900,
}

const DEFAULT_GLYPH_COLOR = "#000000"

// The sticker's whole finish. Inset is what makes Radius read: with the
// stickers butted the rounded corners meet in four-cornered white notches,
// and with a gap they become separate stickers on a body. The gap shows the
// Edge colour, so one colour is both the hairline and the grout.
const DEFAULT_FACE: GlyphTumblerFace = {
    fill: "#ffffff",
    edge: "#c0c0c0",
    edgeWidth: 1,
    radius: 0,
    inset: 0,
}

// Six rows for six faces. Also the fallback when the list is emptied, so the
// component still reads with zero props.
const DEFAULT_GLYPHS: GlyphItem[] = [
    { text: "L", color: DEFAULT_GLYPH_COLOR },
    { text: "A", color: DEFAULT_GLYPH_COLOR },
    { text: "N", color: DEFAULT_GLYPH_COLOR },
    { text: "D", color: DEFAULT_GLYPH_COLOR },
    { text: "E", color: DEFAULT_GLYPH_COLOR },
    { text: "R", color: DEFAULT_GLYPH_COLOR },
]

/* ------------------------------------------------------------------ *
 * Content
 * ------------------------------------------------------------------ */

export interface GlyphTumblerFace {
    fill: string
    edge: string
    edgeWidth: number
    radius: number
    inset: number
}

export interface GlyphItem {
    text?: string
    color?: string
}

/** Rows may also be bare strings, so an earlier plain list still resolves. */
function textOf(item: GlyphItem | string): string {
    return typeof item === "string" ? item : item?.text ?? ""
}

function colorOf(item: GlyphItem | string): string {
    return typeof item === "string"
        ? DEFAULT_GLYPH_COLOR
        : item?.color ?? DEFAULT_GLYPH_COLOR
}

/* ------------------------------------------------------------------ *
 * Cube model
 * ------------------------------------------------------------------ */

type Axis = "x" | "y"
type DirKey = "px" | "nx" | "py" | "ny" | "pz" | "nz"
type Matrix = number[][]

interface Sticker {
    /** Which of the six faces this sticker was born on. */
    face: number
    row: number
    col: number
}

interface Cubie {
    id: string
    /** Lattice position, 0..n-1 per axis. */
    pos: [number, number, number]
    /** Maps the cubie's local axes to world axes; starts as the identity. */
    orient: Matrix
    stickers: Partial<Record<DirKey, Sticker>>
}

interface Move {
    axis: Axis
    layer: number
    dir: 1 | -1
}

interface Ink {
    /** Ink height as a share of font size — font size is derived from it. */
    hRatio: number
    wRatio: number
    /** Correction from the line box's centre to the ink's, as a share of font size. */
    dxRatio: number
    dyRatio: number
}

// CSS's rotation sense, in CSS's axes (x right, y down, z toward the viewer).
// rotateX(90deg) sends +y to +z, which is why `rotateX(90deg) translateZ(h)`
// lands the top face; rotateY(90deg) sends +z to +x, landing the right face.
const ROT: Record<Axis, Matrix> = {
    x: [
        [1, 0, 0],
        [0, 0, -1],
        [0, 1, 0],
    ],
    y: [
        [0, 0, 1],
        [0, 1, 0],
        [-1, 0, 0],
    ],
}

// Each cubie's own six faces, placed on its body. Y points down, so -y is the
// top face and +y the bottom.
const FACE_DIRS: { dir: DirKey; place: (h: number) => string }[] = [
    { dir: "pz", place: (h) => `translateZ(${h}px)` },
    { dir: "nz", place: (h) => `rotateY(180deg) translateZ(${h}px)` },
    { dir: "px", place: (h) => `rotateY(90deg) translateZ(${h}px)` },
    { dir: "nx", place: (h) => `rotateY(-90deg) translateZ(${h}px)` },
    { dir: "ny", place: (h) => `rotateX(90deg) translateZ(${h}px)` },
    { dir: "py", place: (h) => `rotateX(-90deg) translateZ(${h}px)` },
]

function transpose(m: Matrix): Matrix {
    return [
        [m[0][0], m[1][0], m[2][0]],
        [m[0][1], m[1][1], m[2][1]],
        [m[0][2], m[1][2], m[2][2]],
    ]
}

function multiply(a: Matrix, b: Matrix): Matrix {
    const out: Matrix = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ]
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            out[r][c] =
                a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c]
        }
    }
    return out
}

function apply(m: Matrix, v: number[]): number[] {
    return [
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
    ]
}

/** CSS wants column-major, and our matrices map local vectors to world ones. */
function matrix3d(m: Matrix): string {
    const v = [
        m[0][0], m[1][0], m[2][0], 0,
        m[0][1], m[1][1], m[2][1], 0,
        m[0][2], m[1][2], m[2][2], 0,
        0, 0, 0, 1,
    ]
    return `matrix3d(${v.join(", ")})`
}

/**
 * Which slice of which face's glyph a sticker shows. Faces 0..3 are the yaw
 * ring (front, right, back, left) and 4/5 the caps; the caps are read with the
 * front edge at the bottom, which is how they land as the cube rolls forward.
 */
function stickerAt(
    dir: DirKey,
    i: number,
    j: number,
    k: number,
    n: number
): Sticker | null {
    const last = n - 1
    switch (dir) {
        case "pz":
            return k === last ? { face: 0, row: j, col: i } : null
        case "px":
            return i === last ? { face: 1, row: j, col: last - k } : null
        case "nz":
            return k === 0 ? { face: 2, row: j, col: last - i } : null
        case "nx":
            return i === 0 ? { face: 3, row: j, col: k } : null
        case "ny":
            return j === 0 ? { face: 4, row: k, col: i } : null
        default:
            return j === last ? { face: 5, row: last - k, col: i } : null
    }
}

/** Every cubie with at least one face on the surface — the core is never seen. */
function buildCubies(n: number): Cubie[] {
    const identity: Matrix = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ]
    const out: Cubie[] = []
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            for (let k = 0; k < n; k++) {
                const onSurface =
                    i === 0 ||
                    j === 0 ||
                    k === 0 ||
                    i === n - 1 ||
                    j === n - 1 ||
                    k === n - 1
                if (!onSurface) continue
                const stickers: Partial<Record<DirKey, Sticker>> = {}
                for (const { dir } of FACE_DIRS) {
                    const s = stickerAt(dir, i, j, k, n)
                    if (s) stickers[dir] = s
                }
                out.push({
                    id: `${i}-${j}-${k}`,
                    pos: [i, j, k],
                    orient: identity,
                    stickers,
                })
            }
        }
    }
    return out
}

const AXIS_INDEX: Record<Axis, number> = { x: 0, y: 1 }

/** Bakes a completed turn into the cubies it moved. */
function applyMove(cubies: Cubie[], move: Move, n: number): Cubie[] {
    const base = ROT[move.axis]
    const r = move.dir === 1 ? base : transpose(base)
    const o = (n - 1) / 2
    const ai = AXIS_INDEX[move.axis]
    return cubies.map((cu) => {
        if (cu.pos[ai] !== move.layer) return cu
        const centred = [cu.pos[0] - o, cu.pos[1] - o, cu.pos[2] - o]
        const moved = apply(r, centred)
        return {
            ...cu,
            pos: [
                Math.round(moved[0] + o),
                Math.round(moved[1] + o),
                Math.round(moved[2] + o),
            ] as [number, number, number],
            orient: multiply(r, cu.orient),
        }
    })
}

/**
 * Deterministic 0..1 from three integers. Stands in for Math.random so the
 * scramble is stable across a re-render and identical under SSR.
 */
function hash(a: number, b: number, c: number): number {
    let h = (a * 374761393 + b * 668265263 + c * 2246822519) >>> 0
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function moveFor(cycle: number, index: number, n: number): Move {
    return {
        axis: hash(cycle, index, 1) < 0.5 ? "x" : "y",
        layer: Math.min(n - 1, Math.floor(hash(cycle, index, 2) * n)),
        dir: hash(cycle, index, 3) < 0.5 ? 1 : -1,
    }
}

/**
 * Rows 1..4 ride the yaw ring, so the face beside the one facing you always
 * carries the next row of the list; 5 and 6 sit on the caps. Faces hold the
 * row's index, not its glyph, so its colour travels with it.
 */
function initialFaces(count: number): number[] {
    return Array.from({ length: FACE_COUNT }, (_, k) => k % count)
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export interface GlyphTumblerProps {
    glyphs?: (GlyphItem | string)[]
    background?: string
    font?: React.CSSProperties
    grid?: number
    yaw?: number
    pitch?: number
    glyphScale?: number
    face?: Partial<GlyphTumblerFace>
    drag?: boolean
    sensitivity?: number
    hold?: number
    turns?: number
    /**
     * Drives every slice turn and the whole-cube quarter turn — both are
     * framer-motion animations, so the panel's tween or spring plays them.
     */
    transition?: Transition
    style?: React.CSSProperties
}

export default function GlyphTumbler({
    glyphs = [{"text":"L","color":"#000000"},{"text":"A","color":"#000000"},{"text":"N","color":"#000000"},{"text":"D","color":"#000000"},{"text":"E","color":"#000000"},{"text":"R","color":"#000000"}],
    background = "#000000",
    font = {"fontFamily":"'Arial Black', Impact, Inter, Helvetica, sans-serif","variant":"Regular","fontWeight":900,"fontSize":"16px","lineHeight":"1.5em","letterSpacing":"0em","textAlign":"left"},
    grid = 3,
    yaw = -35,
    pitch = -18,
    glyphScale = 0.95,
    face,
    drag = true,
    sensitivity = 5,
    hold = 1.2,
    turns = 2,
    transition = {"type":"tween","stiffness":800,"damping":60,"mass":1,"duration":0.6,"ease":[0.22,1,0.36,1]},
    style,
}: GlyphTumblerProps) {
    // Merged, not defaulted per field, so a partial object from the panel is
    // safe and the signature can never drift from the control.
    const faceStyle = { ...DEFAULT_FACE, ...face }
    const n = Math.max(2, Math.min(5, Math.round(grid)))
    const scrambleLength = Math.max(1, Math.min(4, Math.round(turns)))

    // A row the user has cleared is a row they are done with; an emptied list
    // falls back to the defaults rather than rendering a blank cube.
    const items = useMemo(() => {
        const list = (glyphs ?? [])
            .map((item) => ({ text: textOf(item), color: colorOf(item) }))
            .filter((item) => item.text.trim().length > 0)
        return list.length > 0 ? list : DEFAULT_GLYPHS.map((g) => ({ ...g }))
    }, [glyphs]) as { text: string; color: string }[]

    // fontSize, lineHeight and letterSpacing come off the extended Font
    // control and all three fight this layout: the first two are derived from
    // the face, and letter-spacing widens a glyph's advance so centring the
    // box no longer centres the letter — it slides out of its own crop.
    const {
        fontSize: _size,
        lineHeight: _leading,
        letterSpacing: _tracking,
        wordSpacing: _words,
        ...fontRest
    } = (font ?? {}) as React.CSSProperties

    const family = String(fontRest.fontFamily ?? "sans-serif")
    const weight = String(fontRest.fontWeight ?? 400)
    const slant = String(fontRest.fontStyle ?? "normal")
    const fontKey = `${slant} ${weight} ${PROBE}px ${family}`

    /* -- Sizing off the frame, so Grid and a size slider cannot disagree -- */

    const wrapRef = useRef<HTMLDivElement>(null)
    const [box, setBox] = useState({ w: 0, h: 0 })
    useEffect(() => {
        const el = wrapRef.current
        if (!el || typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver((entries) => {
            const r = entries[0].contentRect
            setBox({ w: r.width, h: r.height })
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const size = Math.min(box.w, box.h) * CUBE_FILL
    const tile = size / n

    /* -- Glyph metrics: centre on the ink, never on the baseline -- */

    // A JSON key, not a joined string: a row is free to contain whatever
    // separator we would otherwise have picked.
    const labelKey = useMemo(
        () => JSON.stringify(Array.from(new Set(items.map((i) => i.text)))),
        [items]
    )
    const [ink, setInk] = useState<Record<string, Ink>>({})
    useEffect(() => {
        let cancelled = false
        const measure = () => {
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
            if (!ctx || cancelled) return
            ctx.font = fontKey
            const next: Record<string, Ink> = {}
            for (const label of JSON.parse(labelKey) as string[]) {
                if (!label) continue
                const m = ctx.measureText(label)
                const iA = m.actualBoundingBoxAscent
                const iD = m.actualBoundingBoxDescent
                const iL = m.actualBoundingBoxLeft
                const iR = m.actualBoundingBoxRight
                const fA = m.fontBoundingBoxAscent
                const fD = m.fontBoundingBoxDescent
                const height = iA + iD
                if (!(height > 0) || !(fA + fD > 0)) continue
                next[label] = {
                    hRatio: height / PROBE,
                    wRatio: (iL + iR) / PROBE,
                    // The span's box is one advance wide; the ink sits inside
                    // it wherever the sidebearings put it.
                    dxRatio: (m.width - iR + iL) / (2 * PROBE),
                    // With line-height 1 the box centre falls on the font's
                    // box centre, not the letter's. This is the gap.
                    dyRatio: (fD - fA - iD + iA) / (2 * PROBE),
                }
            }
            if (!cancelled) setInk(next)
        }
        if (typeof document === "undefined") return
        if (document.fonts?.ready) {
            document.fonts.ready.then(() => {
                if (!cancelled) measure()
            })
        } else {
            measure()
        }
        return () => {
            cancelled = true
        }
    }, [labelKey, fontKey])

    /* -- Drag orbit -- */

    // Motion values, not state: a pointer move writes straight to the
    // transform without re-rendering 156 sticker divs on every frame of a
    // drag. `dragging` is state only because the cursor and the autoplay
    // pause need it, and it changes twice per gesture.
    const orbitYaw = useMotionValue(0)
    const orbitPitch = useMotionValue(0)
    const [dragging, setDragging] = useState(false)
    const lastPoint = useRef<{ x: number; y: number } | null>(null)

    useEffect(() => {
        if (drag) return
        orbitYaw.set(0)
        orbitPitch.set(0)
        setDragging(false)
    }, [drag, orbitYaw, orbitPitch])

    const beginDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!drag) return
        e.currentTarget.setPointerCapture(e.pointerId)
        lastPoint.current = { x: e.clientX, y: e.clientY }
        setDragging(true)
    }

    const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        const from = lastPoint.current
        if (!drag || !from) return
        const step = DRAG_DEG_PER_PX * sensitivity
        lastPoint.current = { x: e.clientX, y: e.clientY }
        orbitYaw.set(orbitYaw.get() + (e.clientX - from.x) * step)
        // Clamped where it accumulates rather than where it is read, so the
        // cube answers the pointer the instant the drag comes back.
        const next = orbitPitch.get() - (e.clientY - from.y) * step
        orbitPitch.set(
            Math.max(
                -PITCH_LIMIT - pitch,
                Math.min(PITCH_LIMIT - pitch, next)
            )
        )
    }

    const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!lastPoint.current) return
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId)
        }
        lastPoint.current = null
        setDragging(false)
    }

    /* -- Cube state -- */

    const [cubies, setCubies] = useState<Cubie[]>(() => buildCubies(n))
    const [beat, setBeat] = useState(0)
    const [faceItems, setFaceItems] = useState<number[]>(() =>
        initialFaces(items.length)
    )

    useEffect(() => {
        setCubies(buildCubies(n))
        setBeat(0)
    }, [n])

    useEffect(() => {
        setFaceItems(initialFaces(items.length))
    }, [items.length])

    // A cycle is: hold assembled, scramble, hold scrambled, unscramble, spin.
    const beatsPerCycle = 2 * scrambleLength + 3
    const cycle = Math.floor(beat / beatsPerCycle)
    const b = beat - cycle * beatsPerCycle
    const lastBeat = beatsPerCycle - 1

    let move: Move | null = null
    let holdMs = 0
    if (b === 0) {
        holdMs = Math.max(0.05, hold) * 1000
    } else if (b <= scrambleLength) {
        move = moveFor(cycle, b - 1, n)
    } else if (b === scrambleLength + 1) {
        holdMs = Math.max(0.05, hold) * 1000 * SCRAMBLE_DWELL
    } else if (b <= 2 * scrambleLength + 1) {
        // Undo last-in-first-out — turns do not commute, so undoing them in
        // the order they were made would leave the glyph in pieces.
        const undone = moveFor(cycle, 2 * scrambleLength + 1 - b, n)
        move = { ...undone, dir: undone.dir === 1 ? -1 : 1 }
    }
    const spinning = b === lastBeat

    // Re-glyph the face that has just gone to the back — two cycles before it
    // faces you, so no glyph ever changes while it can be seen.
    useEffect(() => {
        const back = (cycle + 2) % RING
        setFaceItems((prev) => {
            const next = prev.slice()
            next[back] = (cycle + 2) % items.length
            return next
        })
    }, [cycle, items.length])

    // Hold beats are the only ones the clock drives; every other beat ends
    // when its animation reports back. Holding a drag stops the clock, so the
    // sequence parks on the next assembled letter instead of spinning the
    // cube out from under the pointer; a turn already in flight still lands.
    useEffect(() => {
        if (holdMs <= 0 || dragging) return
        const id = window.setTimeout(() => setBeat((x) => x + 1), holdMs)
        return () => window.clearTimeout(id)
    }, [beat, holdMs, dragging])

    // Watchdog: a Transition that never completes (a user-set repeat, say)
    // would otherwise leave the cube stopped mid-turn for good.
    useEffect(() => {
        if (holdMs > 0) return
        const id = window.setTimeout(() => setBeat((x) => x + 1), 6000)
        return () => window.clearTimeout(id)
    }, [beat, holdMs])

    const finishTurn = () => {
        if (!move) return
        setCubies((prev) => applyMove(prev, move as Move, n))
        setBeat((x) => x + 1)
    }

    const finishSpin = () => {
        if (spinning) setBeat((x) => x + 1)
    }

    /* -- Render -- */

    const half = tile / 2
    const offset = (n - 1) / 2
    const turningAxis = move ? AXIS_INDEX[move.axis] : -1

    const renderCubie = (cu: Cubie) => {
        const [i, j, k] = cu.pos
        const x = (i - offset) * tile
        const y = (j - offset) * tile
        const z = (k - offset) * tile
        return (
            <div
                key={cu.id}
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: tile,
                    height: tile,
                    marginLeft: -half,
                    marginTop: -half,
                    transformStyle: "preserve-3d",
                    transform: `translate3d(${x}px, ${y}px, ${z}px) ${matrix3d(
                        cu.orient
                    )}`,
                }}
            >
                {FACE_DIRS.map(({ dir, place }) => {
                    const sticker = cu.stickers[dir]
                    const item = sticker
                        ? items[faceItems[sticker.face] % items.length]
                        : null
                    const label = item?.text ?? ""
                    const metrics = ink[label] || FALLBACK_INK
                    // Single glyphs are fitted by ink height, so every letter
                    // lands the same size and a wide one crops against the
                    // grid the way the reference's do. A row holding more
                    // than one character has to fit its width too.
                    const fit =
                        label.length > 1
                            ? Math.max(metrics.hRatio, metrics.wRatio)
                            : metrics.hRatio
                    const glyphSize = (glyphScale * size) / fit
                    return (
                        <div
                            key={dir}
                            style={{
                                position: "absolute",
                                inset: 0,
                                // Shows through the gap when Inset opens one,
                                // which is what makes the stickers read as
                                // separate tiles on a body.
                                background: faceStyle.edge,
                                transform: place(half),
                                backfaceVisibility: "hidden",
                            }}
                        >
                          <div
                            style={{
                                position: "absolute",
                                inset: faceStyle.inset,
                                overflow: "hidden",
                                background: faceStyle.fill,
                                borderRadius: faceStyle.radius,
                            }}
                          >
                            {sticker && label && (
                                // The face's whole glyph, shifted so this
                                // sticker shows its own slice of it. The
                                // offset carries the inset, so the letter is
                                // continuous across the face however wide the
                                // gaps are.
                                <div
                                    style={{
                                        position: "absolute",
                                        left:
                                            -sticker.col * tile -
                                            faceStyle.inset,
                                        top:
                                            -sticker.row * tile -
                                            faceStyle.inset,
                                        width: size,
                                        height: size,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <span
                                        style={{
                                            ...fontRest,
                                            fontSize: glyphSize,
                                            lineHeight: 1,
                                            color: item?.color,
                                            whiteSpace: "pre",
                                            transform: `translate(${
                                                glyphSize * metrics.dxRatio
                                            }px, ${
                                                glyphSize * metrics.dyRatio
                                            }px)`,
                                        }}
                                    >
                                        {label}
                                    </span>
                                </div>
                            )}
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: faceStyle.radius,
                                    boxShadow: `inset 0 0 0 ${faceStyle.edgeWidth}px ${faceStyle.edge}`,
                                    pointerEvents: "none",
                                }}
                            />
                          </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const inLayer = (cu: Cubie) =>
        move !== null && cu.pos[turningAxis] === move.layer

    return (
        <div
            ref={wrapRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                perspective: `${size * PERSPECTIVE_RATIO}px`,
                userSelect: "none",
                cursor: drag ? (dragging ? "grabbing" : "grab") : undefined,
                // Horizontal drags rotate, vertical ones still scroll the
                // page. Yaw is the gesture that matters on a cube, and a
                // full-bleed hero that eats the page's scroll is worse than
                // one that cannot be tilted by thumb.
                touchAction: drag ? "pan-y" : undefined,
                ...style,
            }}
            onPointerDown={beginDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
        >
            {size > 0 && (
                // The orbit is its own layer above the autoplay pose, so the
                // pointer and the quarter-turn never write to the same
                // transform and neither can interrupt the other.
                <motion.div
                    style={{
                        position: "relative",
                        width: size,
                        height: size,
                        transformStyle: "preserve-3d",
                        rotateX: orbitPitch,
                        rotateY: orbitYaw,
                    }}
                >
                <motion.div
                    style={{
                        position: "absolute",
                        inset: 0,
                        transformStyle: "preserve-3d",
                        willChange: "transform",
                    }}
                    animate={{
                        rotateX: pitch,
                        // The spin beat targets the next cycle's angle, so the
                        // quarter turn runs during it and is already in place
                        // when the cycle rolls over.
                        rotateY: yaw - 90 * (cycle + (spinning ? 1 : 0)),
                    }}
                    transition={transition}
                    onAnimationComplete={finishSpin}
                >
                    {/* The turning layer. Keyed by beat so each turn mounts at
                        zero and animates to a square 90°, then bakes. */}
                    <motion.div
                        key={beat}
                        style={{
                            position: "absolute",
                            inset: 0,
                            transformStyle: "preserve-3d",
                        }}
                        animate={
                            move
                                ? {
                                      rotateX:
                                          move.axis === "x"
                                              ? move.dir * 90
                                              : 0,
                                      rotateY:
                                          move.axis === "y"
                                              ? move.dir * 90
                                              : 0,
                                  }
                                : { rotateX: 0, rotateY: 0 }
                        }
                        transition={transition}
                        onAnimationComplete={finishTurn}
                    >
                        {cubies.filter(inLayer).map(renderCubie)}
                    </motion.div>

                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            transformStyle: "preserve-3d",
                        }}
                    >
                        {cubies
                            .filter((cu) => !inLayer(cu))
                            .map(renderCubie)}
                    </div>
                </motion.div>
                </motion.div>
            )}
        </div>
    )
}
