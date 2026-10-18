"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

// ---- Defaults --------------------------------------------------------
// One source of truth: every DEFAULT_* below is also the defaultValue
// the panel points at, so the signature and the controls cannot drift.

/** Pearl -> mint -> aqua -> royal blue -> indigo -> violet -> lilac,
 *  read off the reference frames. The ramp wraps, so the last stop
 *  blends back into the first with no seam on the strand. */
const DEFAULT_COLORS = [
    "#F4F5F9",
    "#BCE9E0",
    "#8CCDF2",
    "#5B7BF0",
    "#3A2AE0",
    "#7A3CF0",
    "#D6BEF7",
]

const DEFAULT_SURFACE = {
    /** How clear a disc gets when it faces the camera square on. At 0
     *  the wafer is an opaque plate and the component is the reference's
     *  pearlescent material; the higher it goes the more of the stack
     *  behind shows through. Grazing angles stay solid either way --
     *  that difference is what reads as glass. */
    translucency: 5,
    /** Contrast of the light-to-dark sweep across a disc's face. */
    sheen: 5,
    /** The specular bloom on the lit side of each face. */
    specular: 5,
    /** Fresnel edge glow. The reference's discs are rimmed, not lit. */
    rim: 6,
}

const DEFAULT_FRAMING = {
    /** Scale of the whole sculpture. 5 leaves it at the size the
     *  reference frames it at; the range runs from a third of that to
     *  well past the edges of the frame. */
    size: 5,
    /** Nudge from centre, in pixels. Dragging adds to these rather than
     *  replacing them -- a component cannot write back to its own
     *  props, so the panel sets where it sits and the drag is an offset
     *  from there, held until the pointer puts it somewhere else. */
    x: 0,
    y: 0,
    /** Starting yaw, degrees. The turn from Speed is added to it. */
    turn: -18,
    /** Elevation, degrees. Positive looks down on the knot. */
    tilt: 14,
}

const DEFAULTS = {
    background: "#161618",
    discs: 221,
    depth: 7.6,
    discSize: 6.1,
    thickness: 3,
    parallax: 10,
    drag: true,
    rotate: true,
    speed: 5,
    direction: "ccw",
    morph: 0,
    drift: 10,
}

// ---- Fixed look ------------------------------------------------------
// Not controls: these are the render, not the design. Changing any of
// them makes a different picture rather than a differently-tuned one.

/** Camera sits this far back, in knot radii. Sets how strong the
 *  perspective is -- the reference's near/far size ratio is about 1.5,
 *  which is this distance over a unit-radius knot. */
const CAM_DIST = 5.0
/** The trefoil is not written about its own centre: y = cos t - a cos 2t
 *  runs from -(1+a) to about +a, so the shape hangs low by half a unit.
 *  Measured at -0.469 and constant to within 0.01 across every value of
 *  `a` and `b` these controls can reach, so it is subtracted as a
 *  constant rather than re-measured per frame. Without it the knot
 *  renders below the middle of the frame at every camera angle. */
const KNOT_CENTER_Y = -0.469
/** Fixed pose applied to the knot before the turntable, in radians.
 *
 *  This is not decoration. The trefoil maps to itself under
 *  (x,y,z) -> (-x,y,-z) -- that is just t -> -t -- so a turntable about
 *  the Y axis repeats its whole silhouette every 180 degrees and the
 *  loop reads as half as long as it is. Rolling the knot off that axis
 *  first moves its symmetry away from the turntable's, and the full
 *  turn becomes 360 degrees of distinct views. It also gives the
 *  off-square stance the reference frames are shot from. */
const POSE_ROLL = (28 * Math.PI) / 180
const POSE_PITCH = (22 * Math.PI) / 180
/** Max |P| of the centred trefoil at the panel's defaults. Fixed rather
 *  than measured per frame, so a breathing knot visibly reaches further
 *  instead of being rescaled back into the same box every frame -- push
 *  Morph and Depth up and it grows on screen, which is the point. */
const KNOT_RADIUS = 3.28
/** Screen scale at Zoom 5, as a share of the short edge. Sized so the
 *  furthest disc, magnified by the nearest perspective, still lands
 *  inside the frame: (1 + discRadius) * nearPers * FIT < 0.5. */
const FIT = 0.33
/** Key light in camera space: upper-left and slightly toward the
 *  viewer -- the reference's three-point studio rig reduced to the one
 *  light that is actually readable in it. */
const LIGHT = (() => {
    const v = [-0.42, 0.72, -0.55]
    const m = Math.hypot(v[0], v[1], v[2])
    return [v[0] / m, v[1] / m, v[2] / m]
})()
/** How far the far side of the knot fades toward the ground colour. */
const FOG = 0.24
/** Radians per second at Speed 10, and the morph clock's own rate. */
const SPIN_RATE = 0.09
const MORPH_RATE = 0.32
/** Ramp wraps per second at Colour Drift 10. */
const DRIFT_RATE = 0.012
/** How near the cursor has to come, as a share of the short edge,
 *  before the colour starts following it. Generous on purpose: the
 *  strand is thin and a reach measured to the disc itself would mean
 *  hunting for a hit. */
const HOVER_REACH = 0.16
/** Where in the palette the cursor sits when it is being followed. 0.5
 *  is the middle of the ramp whatever its length, which for the default
 *  palette is the saturated indigo core. */
const HOVER_ANCHOR = 0.5
/** Disc diameter in knot units at Disc Size 10, and thickness in the
 *  same units at Thickness 10. The reference's disc diameter is about a
 *  sixth of the knot's span, which is Disc Size 5. */
const DISC_SPAN = 0.32
const THICK_SPAN = 0.12
/** Below this the projected thickness is not worth a path of its own.
 *  A disc facing the camera projects its own thickness to nearly
 *  nothing, so this skips the body layer exactly where it would not
 *  have been visible -- and those are the discs that cover the most
 *  pixels, so it is also where the saving is. */
const BAND_MIN_PX = 0.75

// ---- Helpers ---------------------------------------------------------

type RGB = [number, number, number]

/** Accepts the shapes a Framer Color control hands over: #rgb, #rgba,
 *  #rrggbb, #rrggbbaa, rgb(), rgba(). Alpha is dropped -- opacity here
 *  belongs to Translucency, not to the palette. */
function parseColor(input: string): RGB {
    const s = (input || "").trim()
    if (s.charAt(0) === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) {
            h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
        }
        const n = parseInt(h.slice(0, 6), 16)
        if (!isFinite(n)) return [255, 255, 255]
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    const m = s.match(/-?\d*\.?\d+/g)
    if (m && m.length >= 3) {
        return [Number(m[0]), Number(m[1]), Number(m[2])]
    }
    return [255, 255, 255]
}

/** Sample a wrapping ramp. Smoothstepped between stops so the palette
 *  reads as one pearlescent sweep rather than as N segments. */
function rampAt(stops: RGB[], u: number, out: RGB) {
    const n = stops.length
    if (n === 1) {
        out[0] = stops[0][0]
        out[1] = stops[0][1]
        out[2] = stops[0][2]
        return
    }
    const x = u - Math.floor(u)
    const f = x * n
    const i0 = Math.floor(f) % n
    const i1 = (i0 + 1) % n
    let k = f - Math.floor(f)
    k = k * k * (3 - 2 * k)
    const a = stops[i0]
    const b = stops[i1]
    out[0] = a[0] + (b[0] - a[0]) * k
    out[1] = a[1] + (b[1] - a[1]) * k
    out[2] = a[2] + (b[2] - a[2]) * k
}

function clamp(v: number, lo: number, hi: number) {
    return v < lo ? lo : v > hi ? hi : v
}

function rgbString(r: number, g: number, b: number, a: number) {
    return (
        "rgba(" +
        Math.round(clamp(r, 0, 255)) +
        "," +
        Math.round(clamp(g, 0, 255)) +
        "," +
        Math.round(clamp(b, 0, 255)) +
        "," +
        clamp(a, 0, 1).toFixed(3) +
        ")"
    )
}

/** The trefoil and its derivative, sharing one evaluation. `a` is the
 *  second-harmonic amplitude (2 in the original) and `b` the depth of
 *  the z fold (1 in the original). Writes x,y,z,dx,dy,dz at `off`. */
function knot(
    t: number,
    a: number,
    b: number,
    p: Float64Array,
    off: number
) {
    const s1 = Math.sin(t)
    const c1 = Math.cos(t)
    const s2 = Math.sin(2 * t)
    const c2 = Math.cos(2 * t)
    const s3 = Math.sin(3 * t)
    const c3 = Math.cos(3 * t)
    p[off] = s1 + a * s2
    p[off + 1] = c1 - a * c2
    p[off + 2] = -b * s3
    p[off + 3] = c1 + 2 * a * c2
    p[off + 4] = -s1 + 2 * a * s2
    p[off + 5] = -3 * b * c3
}

/** Semi-axes and rotation of the ellipse that the 2x2 matrix with
 *  columns (a,b) and (c,d) maps the unit circle onto -- the closed-form
 *  SVD. Doing this rather than transforming the context is what lets
 *  the rim stroke have a real width in screen pixels, which matters
 *  most exactly where the transform is most anisotropic: the edge-on
 *  slivers, where a transformed stroke would blow out to a smear. */
function ellipseAxes(
    a: number,
    b: number,
    c: number,
    d: number,
    out: Float64Array
) {
    const E = (a + d) * 0.5
    const F = (a - d) * 0.5
    const G = (b + c) * 0.5
    const H = (b - c) * 0.5
    const Q = Math.hypot(E, H)
    const R = Math.hypot(F, G)
    out[0] = Q + R // major
    out[1] = Math.abs(Q - R) // minor
    out[2] = (Math.atan2(H, E) + Math.atan2(G, F)) * 0.5 // rotation
}

// ---- Props -----------------------------------------------------------

export interface NacreSpineSurface {
    translucency?: number
    sheen?: number
    specular?: number
    rim?: number
}

export interface NacreSpineFraming {
    size?: number
    x?: number
    y?: number
    turn?: number
    tilt?: number
}

export interface NacreSpineProps {
    /** Palette laid along the strand's arc length. Wraps, so any number
     *  of stops joins back to the first with no seam. */
    colors?: string[]
    background?: string
    /** How many discs are threaded onto the strand. */
    discs?: number
    /** Amplitude of the knot's z fold. 5 is the original's b = 1. */
    depth?: number
    /** Disc diameter as a share of the knot, not in pixels -- the discs
     *  keep their proportion to the strand at any frame size. */
    discSize?: number
    /** Disc thickness: how deep the wafer is through its edge, in the
     *  same units as Disc Size. 0 is the reference's flat plate. */
    thickness?: number
    surface?: NacreSpineSurface
    /** How far the pointer leans the turntable. */
    parallax?: number
    /** Whether the sculpture can be dragged around the frame. On touch
     *  this claims the gesture, so a full-bleed hero will not scroll
     *  under a finger while it is on. */
    drag?: boolean
    /** Whether the turntable turns at all. */
    rotate?: boolean
    /** Turntable rate. */
    speed?: number
    direction?: "cw" | "ccw"
    /** How much the knot's own reach breathes as it turns. */
    morph?: number
    /** How fast the palette travels along the strand when the pointer
     *  is not driving it. Hovering overrides this. */
    drift?: number
    framing?: NacreSpineFraming
    style?: CSSProperties
}

/** Snapshot of the panel the animation loop reads. The loop is started
 *  once and never restarted on a prop change -- it reads this instead,
 *  so dragging a slider retunes the running knot rather than rebuilding
 *  it from a cold clock. */
interface Live {
    stops: RGB[]
    bg: RGB
    discs: number
    depth: number
    discSize: number
    thickness: number
    translucency: number
    sheen: number
    specular: number
    rim: number
    parallax: number
    drag: boolean
    rotate: boolean
    speed: number
    dir: number
    morph: number
    drift: number
    size: number
    panX: number
    panY: number
    turn: number
    tilt: number
}

export default function NacreSpine({
    colors = ["#F4F5F9","#BCE9E0","#8CCDF2","#5B7BF0","#3A2AE0","#7A3CF0","#D6BEF7"],
    background = DEFAULTS.background,
    discs = DEFAULTS.discs,
    depth = DEFAULTS.depth,
    discSize = DEFAULTS.discSize,
    thickness = DEFAULTS.thickness,
    surface,
    parallax = DEFAULTS.parallax,
    drag = DEFAULTS.drag,
    rotate = DEFAULTS.rotate,
    speed = DEFAULTS.speed,
    direction = DEFAULTS.direction,
    morph = DEFAULTS.morph,
    drift = DEFAULTS.drift,
    framing,
    style,
}: NacreSpineProps) {
    const surf = { ...DEFAULT_SURFACE, ...surface }
    const frm = { ...DEFAULT_FRAMING, ...framing }

    const hostRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const liveRef = useRef<Live | null>(null)

    const list = colors && colors.length > 0 ? colors : DEFAULT_COLORS
    liveRef.current = {
        stops: list.map(parseColor),
        bg: parseColor(background),
        discs: Math.max(8, Math.round(discs)),
        depth,
        discSize,
        thickness,
        translucency: surf.translucency,
        sheen: surf.sheen,
        specular: surf.specular,
        rim: surf.rim,
        parallax,
        drag,
        rotate,
        speed,
        dir: direction === "ccw" ? -1 : 1,
        morph,
        drift,
        size: frm.size,
        panX: frm.x,
        panY: frm.y,
        turn: frm.turn,
        tilt: frm.tilt,
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let width = 0
        let height = 0
        let dpr = 1

        // Curve sampling buffers, grown on demand.
        let denseN = 0
        let dense = new Float64Array(0) // x,y,z,dx,dy,dz per sample
        let arc = new Float64Array(0)
        let tAt = new Float64Array(0)

        // Per-disc buffers, grown on demand.
        let discN = 0
        let sx = new Float64Array(0)
        let sy = new Float64Array(0)
        let sz = new Float64Array(0)
        let mA = new Float64Array(0)
        let mB = new Float64Array(0)
        let mC = new Float64Array(0)
        let mD = new Float64Array(0)
        let offX = new Float64Array(0) // half the thickness, in screen px
        let offY = new Float64Array(0)
        let rad = new Float64Array(0) // screen reach of the whole wafer
        let facing = new Float64Array(0)
        let lambert = new Float64Array(0)
        let order: number[] = []

        const axes = new Float64Array(3)
        const probe = new Float64Array(6)
        const col: RGB = [0, 0, 0]

        const ensureDense = (n: number) => {
            if (n === denseN) return
            denseN = n
            dense = new Float64Array(n * 6)
            arc = new Float64Array(n)
            tAt = new Float64Array(n)
        }

        const ensureDiscs = (n: number) => {
            if (n === discN) return
            discN = n
            sx = new Float64Array(n)
            sy = new Float64Array(n)
            sz = new Float64Array(n)
            mA = new Float64Array(n)
            mB = new Float64Array(n)
            mC = new Float64Array(n)
            mD = new Float64Array(n)
            offX = new Float64Array(n)
            offY = new Float64Array(n)
            rad = new Float64Array(n)
            facing = new Float64Array(n)
            lambert = new Float64Array(n)
            order = new Array(n)
            for (let i = 0; i < n; i++) order[i] = i
        }

        const resize = () => {
            // clientWidth/clientHeight, NOT getBoundingClientRect().
            //
            // The rect is measured after transforms. A preview pane
            // showing this component at 47%, or a zoomed-out Framer
            // canvas, is a CSS scale on an ancestor -- so the rect comes
            // back as the *scaled* size while the element's own layout
            // box is still full size. Writing the scaled number back as
            // an explicit pixel size on the canvas shrinks it to a box
            // in the top-left corner of its own host, and because the
            // host paints the same background underneath, the frame
            // still looks full while everything drawn is confined to
            // that corner and clipped at its edge. clientWidth is the
            // layout box and is immune to all of it.
            const w = Math.max(1, host.clientWidth)
            const h = Math.max(1, host.clientHeight)
            const d = Math.min(2, window.devicePixelRatio || 1)
            if (w === width && h === height && d === dpr) return
            width = w
            height = h
            dpr = d
            // Only the backing store is sized here. The element keeps
            // the width/height of 100% it is given in the JSX, so it
            // always fills the host whatever transform is above it.
            canvas.width = Math.round(w * d)
            canvas.height = Math.round(h * d)
        }

        // Pointer. Drives three separate things: the turntable lean,
        // which eases back to nothing when the cursor goes; the colour
        // chase, which stays where it was left; and the drag, which
        // holds its offset until it is dragged somewhere else.
        let pointerX = 0
        let pointerY = 0
        let cursorX = 0
        let cursorY = 0
        let hovering = false
        let leanX = 0
        let leanY = 0
        let rampShift = 0

        // Auto-centring offset, and whether it has been seeded yet. The
        // first frame snaps to it so the sculpture opens centred rather
        // than sliding in from wherever the raw projection put it.
        let fitX = 0
        let fitY = 0
        let fitted = false

        // Drag offset. Runtime only: a Framer component cannot write
        // back to its own props, so dragging turns the turntable
        // (yaw/tilt) rather than moving the sculpture on screen.
        let dragging = false
        let dragId = -1
        let grabX = 0
        let grabY = 0
        let baseYaw = 0
        let baseTilt = 0
        let dragYaw = 0
        let dragTilt = 0
        /** Radians of turntable rotation per screen pixel of drag. */
        const DRAG_ROT_RATE = 0.012

        const onDown = (e: PointerEvent) => {
            const p = liveRef.current
            if (!p || !p.drag || dragging) return
            dragging = true
            dragId = e.pointerId
            grabX = e.clientX
            grabY = e.clientY
            baseYaw = dragYaw
            baseTilt = dragTilt
            canvas.style.cursor = "grabbing"
            try {
                canvas.setPointerCapture(e.pointerId)
            } catch {
                // capture is a convenience -- the move handler still
                // tracks without it
            }
        }

        const endDrag = (e: PointerEvent) => {
            if (!dragging || e.pointerId !== dragId) return
            dragging = false
            dragId = -1
            const p = liveRef.current
            canvas.style.cursor = p && p.drag ? "grab" : "default"
            // A drag can be released well outside the canvas, and no
            // pointerleave arrives for it while the pointer is
            // captured. Settle the hover state from where the cursor
            // actually is, or the colour stays pinned to whichever disc
            // it was last near.
            const r = canvas.getBoundingClientRect()
            if (
                e.clientX < r.left ||
                e.clientX > r.right ||
                e.clientY < r.top ||
                e.clientY > r.bottom
            ) {
                pointerX = 0
                pointerY = 0
                hovering = false
            }
            try {
                canvas.releasePointerCapture(e.pointerId)
            } catch {
                // already released, or never captured
            }
        }

        // Backstop: if capture failed, the pointer can be released
        // outside the canvas and the canvas' own pointerup never
        // arrives, which would leave the sculpture stuck to the cursor.
        const onWindowUp = (e: PointerEvent) => endDrag(e)

        const onMove = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return
            // The mirror image of the problem in resize(). Here the
            // transform-scaled rect is the right thing to measure
            // against, because clientX/clientY are in that same scaled
            // screen space -- but everything drawn is in layout pixels,
            // so both the cursor position and the drag delta have to be
            // brought back across. Under a 47% preview a hand moving
            // 100 screen pixels has moved the sculpture 213 of its own.
            const kx = width / r.width
            const ky = height / r.height
            cursorX = (e.clientX - r.left) * kx
            cursorY = (e.clientY - r.top) * ky
            pointerX = (cursorX / width) * 2 - 1
            pointerY = (cursorY / height) * 2 - 1
            hovering = true
            if (dragging && e.pointerId === dragId) {
                dragYaw = baseYaw + (e.clientX - grabX) * kx * DRAG_ROT_RATE
                dragTilt = clamp(
                    baseTilt + (e.clientY - grabY) * ky * DRAG_ROT_RATE,
                    -1.2,
                    1.2
                )
            }
        }
        // Leaving does NOT end a drag: while the pointer is captured the
        // cursor is free to travel outside the canvas, and cutting the
        // drag at the edge would make the sculpture stick to the frame.
        const onLeave = () => {
            if (dragging) return
            pointerX = 0
            pointerY = 0
            hovering = false
        }
        const onCancel = (e: PointerEvent) => {
            endDrag(e)
            pointerX = 0
            pointerY = 0
            hovering = false
        }

        canvas.addEventListener("pointerdown", onDown)
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerup", endDrag)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointercancel", onCancel)
        window.addEventListener("pointerup", onWindowUp)

        let ro: ResizeObserver | null = null
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(resize)
            ro.observe(host)
        } else {
            window.addEventListener("resize", resize)
        }
        resize()

        let raf = 0
        let last = 0
        let clock = 0
        let spin = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const p = liveRef.current
            if (!p) return

            const dt = last === 0 ? 1 / 60 : Math.min(0.05, (now - last) / 1000)
            last = now
            clock += dt

            resize()
            if (width === 0 || height === 0) return

            // ---- clocks
            if (p.rotate) spin += dt * p.speed * SPIN_RATE * p.dir
            const mp = clock * MORPH_RATE

            // The lean is frozen mid-drag. The cursor is already moving
            // the sculpture; letting it swing the turntable at the same
            // time reads as the thing fighting the hand that holds it.
            const leanK = p.parallax / 10
            if (!dragging) {
                const ease = Math.min(1, dt * 4)
                leanX += (pointerX - leanX) * ease
                leanY += (pointerY - leanY) * ease
            }

            // Panel says drag is off: give back whatever the pointer
            // turned, rather than stranding the turntable at an angle
            // the panel's own Turn/Tilt no longer account for.
            if (!p.drag && (dragYaw !== 0 || dragTilt !== 0)) {
                const back = Math.min(1, dt * 4)
                dragYaw += (0 - dragYaw) * back
                dragTilt += (0 - dragTilt) * back
                if (Math.abs(dragYaw) < 0.001) dragYaw = 0
                if (Math.abs(dragTilt) < 0.001) dragTilt = 0
            }

            const yaw =
                (p.turn * Math.PI) / 180 + spin + leanX * 0.45 * leanK + dragYaw
            const tilt =
                (p.tilt * Math.PI) / 180 - leanY * 0.32 * leanK + dragTilt

            // ---- knot shape this frame
            const mk = p.morph / 10
            const aAmp = 2 + mk * 0.55 * Math.sin(mp)
            const bAmp = (p.depth / 5) * (1 + mk * 0.4 * Math.sin(mp * 0.77 + 1.7))

            const n = p.discs
            ensureDiscs(n)
            ensureDense(Math.min(3600, Math.max(600, n * 6)))

            // ---- dense sample, and the cumulative arc length along it.
            // The knot is closed, so t runs the full period and the last
            // sample lands back on the first.
            let total = 0
            for (let i = 0; i < denseN; i++) {
                const t = (Math.PI * 2 * i) / (denseN - 1)
                tAt[i] = t
                knot(t, aAmp, bAmp, dense, i * 6)
                if (i > 0) {
                    const o = i * 6
                    const q = o - 6
                    total += Math.hypot(
                        dense[o] - dense[q],
                        dense[o + 1] - dense[q + 1],
                        dense[o + 2] - dense[q + 2]
                    )
                }
                arc[i] = total
            }

            // ---- camera constants for this frame
            const cyw = Math.cos(yaw)
            const syw = Math.sin(yaw)
            const ct = Math.cos(tilt)
            const st = Math.sin(tilt)
            const cr = Math.cos(POSE_ROLL)
            const sr = Math.sin(POSE_ROLL)
            const cp = Math.cos(POSE_PITCH)
            const sp = Math.sin(POSE_PITCH)
            // Size 5 is exactly the scale the reference frames it at;
            // the ends run from a third of that to well past the frame.
            const sizeK = 0.35 + (p.size / 10) * 1.3
            const S = Math.min(width, height) * FIT * sizeK
            const cx = width * 0.5
            const cy = height * 0.5

            const radius = (p.discSize / 10) * DISC_SPAN
            const halfThick = ((p.thickness / 10) * THICK_SPAN) / 2

            // ---- resample at even arc length, project, shade
            let cursor = 0
            for (let i = 0; i < n; i++) {
                // i/n, not i/(n-1): on a closed loop the last disc must
                // not land on top of the first.
                const u = i / n
                const s = u * total
                while (cursor < denseN - 2 && arc[cursor + 1] < s) cursor++
                const segLen = arc[cursor + 1] - arc[cursor]
                const f = segLen > 1e-9 ? (s - arc[cursor]) / segLen : 0
                const t = tAt[cursor] + (tAt[cursor + 1] - tAt[cursor]) * f
                // Evaluated analytically at the interpolated t rather
                // than lerped off the dense samples: the tangent is what
                // orients the disc, and a chord's direction visibly
                // stairsteps the fan on the tight bends.
                knot(t, aAmp, bAmp, probe, 0)

                const x0 = probe[0] / KNOT_RADIUS
                const y0 = (probe[1] - KNOT_CENTER_Y) / KNOT_RADIUS
                const z0 = probe[2] / KNOT_RADIUS
                let dx = probe[3]
                let dy = probe[4]
                let dz = probe[5]
                const dm = Math.hypot(dx, dy, dz) || 1
                dx /= dm
                dy /= dm
                dz /= dm

                // Fixed model pose: roll about Z, then pitch about X.
                // Applied to the knot itself, before the turntable, so
                // the turntable is no longer turning about the knot's
                // own symmetry axis.
                const xr = x0 * cr - y0 * sr
                const yr = x0 * sr + y0 * cr
                const x = xr
                const y = yr * cp - z0 * sp
                const z = yr * sp + z0 * cp

                const ndxr = dx * cr - dy * sr
                const ndyr = dx * sr + dy * cr
                const ndx = ndxr
                const ndy = ndyr * cp - dz * sp
                const ndz = ndyr * sp + dz * cp

                // yaw about Y, then tilt about X
                const x1 = x * cyw + z * syw
                const z1 = -x * syw + z * cyw
                const y2 = y * ct - z1 * st
                const z2 = y * st + z1 * ct

                const nx1 = ndx * cyw + ndz * syw
                const nz1 = -ndx * syw + ndz * cyw
                const ny2 = ndy * ct - nz1 * st
                const nz2 = ndy * st + nz1 * ct

                const dep = Math.max(0.4, z2 + CAM_DIST)
                const pers = CAM_DIST / dep

                sx[i] = cx + x1 * pers * S
                sy[i] = cy - y2 * pers * S
                sz[i] = z2

                // view vector: point -> camera, which sits at (0,0,-D)
                let vx = -x1
                let vy = -y2
                let vz = -CAM_DIST - z2
                const vm = Math.hypot(vx, vy, vz) || 1
                vx /= vm
                vy /= vm
                vz /= vm
                facing[i] = Math.abs(nx1 * vx + ny2 * vy + nz2 * vz)
                lambert[i] = Math.abs(
                    nx1 * LIGHT[0] + ny2 * LIGHT[1] + nz2 * LIGHT[2]
                )

                // Half the thickness, along the tangent, toward the
                // camera -- so this always points at the face we can
                // actually see.
                const sgn = nz2 < 0 ? 1 : -1
                offX[i] = nx1 * sgn * halfThick * pers * S
                offY[i] = -ny2 * sgn * halfThick * pers * S

                // Any orthonormal pair spanning the plane normal to the
                // tangent describes the same circle, so this needs no
                // parallel transport along the strand -- only the
                // tangent matters, which is also why the discs never
                // twist relative to each other the way a ribbon would.
                let ux: number
                let uy: number
                let uz: number
                if (Math.abs(nz2) < 0.9) {
                    ux = -ny2
                    uy = nx1
                    uz = 0
                } else {
                    ux = 0
                    uy = -nz2
                    uz = ny2
                }
                const um = Math.hypot(ux, uy, uz) || 1
                ux /= um
                uy /= um
                uz /= um
                const wx = ny2 * uz - nz2 * uy
                const wy = nz2 * ux - nx1 * uz
                const wz = nx1 * uy - ny2 * ux
                const wm = Math.hypot(wx, wy, wz) || 1

                const k = radius * pers * S

                // Screen deltas of the disc's own two axes. Perspective
                // is taken at the disc's centre and held across its
                // face -- a disc is small enough that the difference is
                // under a pixel, and it keeps the projection an exact
                // ellipse instead of a general conic.
                mA[i] = ux * k
                mB[i] = -uy * k
                mC[i] = (wx / wm) * k
                mD[i] = -(wy / wm) * k

                // Upper bound on how far this wafer reaches from its
                // own centre on screen: the disc can never project
                // wider than its full radius, plus the half-thickness
                // it is offset by. Used for the auto-centre below, and
                // an upper bound keeps that continuous -- the true
                // major axis is exact but the bound never jumps as the
                // disc turns.
                rad[i] = k + Math.hypot(offX[i], offY[i])
            }

            // ---- centre on what is actually drawn.
            //
            // The knot's own centre already projects exactly to the
            // middle of the frame -- but that is not the same as the
            // picture being centred, because perspective magnifies the
            // near side of the sculpture and not the far. Measured over
            // a full turn the drawn bounds sit about 4% high and swing
            // 8% either way horizontally. So the offset is measured
            // from the discs themselves and taken out.
            //
            // Eased rather than applied outright, but only just. A max
            // over continuous functions is itself continuous, so these
            // bounds never jump as the disc setting the extreme hands
            // over -- they only kink. There is no noise here to filter,
            // and the ease is only wide enough to absorb a real step: a
            // change of disc count, or a resize. Measured over a full
            // turn it leaves under 1% of residual drift, against 8%
            // with no centring at all. The first frame snaps, so it
            // opens centred instead of sliding in.
            let bxMin = Infinity
            let bxMax = -Infinity
            let byMin = Infinity
            let byMax = -Infinity
            for (let i = 0; i < n; i++) {
                const rr = rad[i]
                if (sx[i] - rr < bxMin) bxMin = sx[i] - rr
                if (sx[i] + rr > bxMax) bxMax = sx[i] + rr
                if (sy[i] - rr < byMin) byMin = sy[i] - rr
                if (sy[i] + rr > byMax) byMax = sy[i] + rr
            }
            const wantX = cx - (bxMin + bxMax) * 0.5
            const wantY = cy - (byMin + byMax) * 0.5
            if (fitted) {
                const settle = Math.min(1, dt * 8)
                fitX += (wantX - fitX) * settle
                fitY += (wantY - fitY) * settle
            } else {
                fitX = wantX
                fitY = wantY
                fitted = true
            }

            // Everything downstream -- hover, culling, drawing -- works
            // in placed coordinates, so the shift goes in here once
            // rather than at every use.
            const shiftX = fitX + p.panX
            const shiftY = fitY + p.panY
            for (let i = 0; i < n; i++) {
                sx[i] += shiftX
                sy[i] += shiftY
            }

            // ---- the pointer takes the colour, or the clock keeps it
            let nearest = -1
            if (hovering) {
                const reach = Math.min(width, height) * HOVER_REACH
                let bestD2 = reach * reach
                for (let i = 0; i < n; i++) {
                    const ddx = sx[i] - cursorX
                    const ddy = sy[i] - cursorY
                    const d2 = ddx * ddx + ddy * ddy
                    if (d2 < bestD2) {
                        bestD2 = d2
                        nearest = i
                    }
                }
            }
            if (nearest >= 0) {
                // Chase the shortest way round the loop. The strand
                // crosses itself, so screen-adjacent discs can be half a
                // turn apart along the curve; without the wrap the ramp
                // would bolt the long way at every crossing.
                let delta = HOVER_ANCHOR - nearest / n - rampShift
                delta -= Math.round(delta)
                rampShift += delta * Math.min(1, dt * 5)
            } else {
                rampShift += dt * p.drift * DRIFT_RATE
            }

            // ---- back to front. Sorting a permutation left over from
            // the previous frame rather than a fresh 0..n-1 is not a
            // bug and is a little faster: consecutive frames are nearly
            // sorted already.
            order.sort((p1, p2) => sz[p2] - sz[p1])

            // ---- paint
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.fillStyle = rgbString(p.bg[0], p.bg[1], p.bg[2], 1)
            ctx.fillRect(0, 0, width, height)

            const sheenK = p.sheen / 10
            const rimK = p.rim / 10
            const specK = p.specular / 10
            // The clear end of the glass. Grazing angles climb back to
            // opaque below, which is the whole of the effect.
            const clearA = 1 - 0.78 * (p.translucency / 10)

            // Screen direction of the key light, for the face gradient.
            const gm = Math.hypot(LIGHT[0], LIGHT[1]) || 1
            const gx = LIGHT[0] / gm
            const gy = -LIGHT[1] / gm

            ctx.lineJoin = "round"

            for (let q = 0; q < n; q++) {
                const i = order[q]
                const a = mA[i]
                const b = mB[i]
                const c = mC[i]
                const d = mD[i]
                ellipseAxes(a, b, c, d, axes)
                const major = axes[0]
                const minor = axes[1]
                const rot = axes[2]
                if (major < 0.35) continue

                const ox = offX[i]
                const oy = offY[i]
                const bleed = major + Math.hypot(ox, oy) + 4
                const px = sx[i]
                const py = sy[i]
                if (
                    px < -bleed ||
                    px > width + bleed ||
                    py < -bleed ||
                    py > height + bleed
                ) {
                    continue
                }

                rampAt(p.stops, i / n + rampShift, col)

                // Lambert on a two-sided plate, then a Fresnel term that
                // climbs as the disc turns edge-on -- which is what
                // makes the reference's slivers read as bright blades
                // rather than as dark ones.
                const shade = 0.44 + 0.56 * lambert[i]
                const fres = Math.pow(1 - facing[i], 3)

                let r = col[0] * shade
                let g = col[1] * shade
                let bl = col[2] * shade

                // Iridescence: a pastel that turns on facing angle and
                // on position, so neighbouring discs never flash in
                // unison the way a purely view-driven tint would.
                const kk = facing[i] * 3.4 + (i / n) * 6.283 + clock * 0.15
                const im = clamp(fres * rimK * 0.9, 0, 1)
                r += (205 + 50 * Math.sin(kk) - r) * im
                g += (214 + 41 * Math.sin(kk + 2.1) - g) * im
                bl += (242 + 13 * Math.sin(kk + 4.2) - bl) * im

                // Aerial fade toward the ground colour with depth. This
                // is the whole of the depth cue; the reference has no
                // contact shadow and no disc-on-disc darkening.
                const fog = clamp((sz[i] + 1) * 0.5, 0, 1) * FOG
                r += (p.bg[0] - r) * fog
                g += (p.bg[1] - g) * fog
                bl += (p.bg[2] - bl) * fog

                // Glass: clear square on, solid at grazing angles. A
                // softer exponent than the rim's, so the whole disc
                // thickens as it turns rather than only its edge.
                const alpha =
                    clearA + (1 - clearA) * Math.pow(1 - facing[i], 1.6)

                const fx = px + ox
                const fy = py + oy

                // ---- body: the swept hull of the two faces. Exactly
                // the union of the back face, the front face, and the
                // parallelogram spanning the two tangent lines between
                // them -- a convex body swept along a segment is the
                // Minkowski sum of the two, and that is what it is.
                const span = Math.hypot(ox, oy) * 2
                if (span >= BAND_MIN_PX) {
                    const bx = px - ox
                    const by = py - oy
                    const ex = -oy / (span * 0.5)
                    const ey = ox / (span * 0.5)
                    // half-width of the band: the ellipse's own support
                    // in the direction across the sweep
                    const h = Math.hypot(a * ex + b * ey, c * ex + d * ey)
                    const hx = ex * h
                    const hy = ey * h

                    // Wound the same way round as ctx.ellipse traverses
                    // (increasing angle). Under the nonzero rule an
                    // opposite winding would cancel against the faces
                    // and punch a hole through the middle of the body.
                    ctx.beginPath()
                    ctx.moveTo(bx - hx, by - hy)
                    ctx.lineTo(fx - hx, fy - hy)
                    ctx.lineTo(fx + hx, fy + hy)
                    ctx.lineTo(bx + hx, by + hy)
                    ctx.closePath()
                    ctx.moveTo(bx + major * Math.cos(rot), by + major * Math.sin(rot))
                    ctx.ellipse(bx, by, major, minor, rot, 0, Math.PI * 2)
                    ctx.moveTo(fx + major * Math.cos(rot), fy + major * Math.sin(rot))
                    ctx.ellipse(fx, fy, major, minor, rot, 0, Math.PI * 2)
                    // Deeper than the face and a little denser: this is
                    // the glass you are looking through, and the front
                    // face is drawn over it rather than instead of it.
                    ctx.fillStyle = rgbString(
                        r * 0.82,
                        g * 0.82,
                        bl * 0.86,
                        alpha * 0.8
                    )
                    ctx.fill()
                }

                // ---- front face
                // Extent of this ellipse along the light direction --
                // the support function |M^T g| -- so the sweep spans the
                // face exactly however the disc happens to be turned.
                const ext = Math.hypot(a * gx + b * gy, c * gx + d * gy) || major

                const grad = ctx.createLinearGradient(
                    fx - gx * ext,
                    fy - gy * ext,
                    fx + gx * ext,
                    fy + gy * ext
                )
                const dk = 1 - 0.3 * sheenK
                const hiMix = 0.2 + 0.55 * sheenK
                grad.addColorStop(0, rgbString(r * dk, g * dk, bl * dk, alpha))
                grad.addColorStop(0.55, rgbString(r, g, bl, alpha))
                grad.addColorStop(
                    1,
                    rgbString(
                        r + (255 - r) * hiMix,
                        g + (255 - g) * hiMix,
                        bl + (255 - bl) * hiMix,
                        alpha
                    )
                )

                ctx.beginPath()
                ctx.ellipse(fx, fy, major, minor, rot, 0, Math.PI * 2)
                ctx.fillStyle = grad
                ctx.fill()

                // Specular bloom on the lit side, clipped to the face by
                // reusing the path rather than by a clip() -- fill()
                // does not consume the path, so this and the stroke
                // below cost no extra geometry.
                if (specK > 0 && major > 2) {
                    const scx = fx + gx * ext * 0.42
                    const scy = fy + gy * ext * 0.42
                    const sr2 = Math.max(1.5, major * 0.62)
                    const spec = ctx.createRadialGradient(
                        scx,
                        scy,
                        0,
                        scx,
                        scy,
                        sr2
                    )
                    spec.addColorStop(0, rgbString(255, 255, 255, 0.5 * specK))
                    spec.addColorStop(1, rgbString(255, 255, 255, 0))
                    ctx.fillStyle = spec
                    ctx.fill()
                }

                if (rimK > 0) {
                    ctx.lineWidth = clamp(major * 0.055 + 0.4, 0.5, 2.6)
                    ctx.strokeStyle = rgbString(
                        r + (255 - r) * 0.7,
                        g + (255 - g) * 0.7,
                        bl + (255 - bl) * 0.7,
                        clamp((0.35 + 0.65 * fres) * rimK, 0, 1)
                    )
                    ctx.stroke()
                }
            }
        }

        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointerdown", onDown)
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerup", endDrag)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointercancel", onCancel)
            window.removeEventListener("pointerup", onWindowUp)
            if (ro) ro.disconnect()
            else window.removeEventListener("resize", resize)
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    cursor: drag ? "grab" : "default",
                    // With Drag off nothing here consumes a gesture --
                    // the pointer only leans the turntable and leads
                    // the colour -- so the page keeps every one of its
                    // own. With it on the sculpture has to claim the
                    // touch, which on a full-bleed hero means a finger
                    // starting on it moves it instead of scrolling.
                    touchAction: drag ? "none" : "auto",
                }}
            />
        </div>
    )
}
