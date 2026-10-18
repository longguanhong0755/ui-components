"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
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
 * Ticker Delta — an impossible triangle wrapped in three bands of running
 * type, the words sliding round it like a conveyor that has no end.
 *
 * Built after a reference animation supplied as eleven still frames: a rounded
 * triangular beam floating over flat yellow, its top face yellow with a bold
 * repeating word, its left face white with a headline, its right face black
 * with a light line of small type, all three scrolling. There was no source to
 * transcribe, so everything here is measured off those frames. The name is
 * ours; so is the bold word on the top face, which in the reference is the
 * studio's own name — type it back in if that is what you want.
 *
 * WHAT THE FRAMES SAY, AND WHAT IS TRANSCRIBED
 *
 *   It is a Penrose triangle.  Each colour is the OUTER face of one leg and the
 *       INNER face of the next — white is outside on the left leg and inside on
 *       the top, yellow outside on the top and inside on the bottom, black
 *       outside on the bottom and inside on the left. No real ring does that;
 *       a beam running along Y, then X, then Z does, seen down the (1, 1, 1)
 *       diagonal. Each strip is then the +X, +Y or +Z face of the beam, and
 *       each turns its corner as a flat cap — which is why "DYNAMIC" fans
 *       round the top-left corner in plane instead of wrapping a cylinder.
 *   It is isometric.  Both slanted legs measure 30.1° off horizontal and the
 *       white and black faces both measure 62 px across: equal faces, a square
 *       section, the exact diagonal. So the camera is orthographic down
 *       (1, 1, 1) and the beam's section is square, fixed in code.
 *   Proportions.  Beam width is 0.24 of the leg (Thickness 5). The inner
 *       corners are rounded about a fifth of a beam (Roundness 2.5). The
 *       triangle's side is 0.41 of the frame (see FIT_*).
 *   Flow.  All three bands run the same way along the beam: up the left,
 *       across the top, back down the bottom — clockwise on screen. The white
 *       headline reads WITH the flow, tops to the outside; the other two read
 *       AGAINST it, tops to the hole. Both are transcribed per face (SIGNS).
 *   Light.  The top face is shown at its own colour, the left at three
 *       quarters (pure white renders as the reference's 190 grey), the right
 *       a little brighter than that so its light type matches. Fixed in code.
 *   Ground.  A soft shadow below and left of centre, 27% dark at its heart,
 *       and a floor that is a shade darker at the top. Fixed in code but for
 *       the shadow's strength.
 *
 * HOW THE IMPOSSIBLE PART IS BUILT
 *
 *   One swept tube, open at both ends. It starts half-way up the left leg, runs
 *   the whole loop, and finishes half-way up the same leg again — displaced by
 *   (L, L, L). That displacement is exactly along the view direction, so under
 *   an orthographic camera the two ends land on the same pixels and the loop
 *   closes. The cut is on a straight run on purpose: a bend's inner wall
 *   overlaps its own cap on screen, and with the near end a whole lap closer
 *   to the camera, a cut there lets the wall punch through the cap.
 *
 *   Arc length jumps at the seam, but no band covers a whole lap, so each band
 *   unwraps it at a point on the far side of the loop where that band is out
 *   of sight (uCut). The type therefore runs through the seam unbroken at its
 *   own natural length — nothing is stretched to fit the loop.
 *
 *   The tube's frame is parallel-transported, which means its four faces swap
 *   places once per lap (the section comes back turned a quarter). So bands are
 *   not tube faces: a fragment knows which band it is by which axis its normal
 *   points along most, and takes its texture coordinates from the path — arc
 *   length along, offset across — which every face shares.
 *
 *   The type is the browser's own rendering at the panel's font, drawn once per
 *   face into a canvas strip that repeats along the beam. The strip holds only
 *   the letter coverage; fill and ink are mixed in the shader, so recolouring
 *   never redraws anything.
 *
 * Hovering eases the belt from Speed up to Hover Speed and back down when the
 * cursor leaves; a drag still takes it over entirely. Touch has no hover, so
 * on a phone it simply runs at Speed.
 *
 * No Transition row: the motion is a hand-rolled clock moving texture phase,
 * with nothing framer-motion could be handed. Speed and Hover Speed carry it,
 * and the ease between them is fixed in code (HOVER_ATTACK / HOVER_RELEASE).
 * At high hover speeds the type is motion-blurred along the band by its own
 * travel per frame, so it rushes instead of strobing.
 *
 * The `framer` import supplies the property controls only — under plain Next.js,
 * alias it to a stub exporting a no-op `addPropertyControls`, a `ControlType`
 * object, and a `RenderTarget` with `current: () => "preview"`.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 720
 * @framerIntrinsicHeight 720
 * @framerDisableUnlink
 */

/* --------------------------------------------------------------- constants --
 * The view, the light and the ground are the look, not knobs.
 */

/** Leg length in world units. Everything else is a share of it. */
const LEG = 1

/** The view direction, from the object to the camera. Isometric: it is what
 * lets the loop's (L, L, L) gap vanish. */
const VIEW = new THREE.Vector3(1, 1, 1).normalize()

/** How much of an axis survives isometric projection, √(2/3). */
const ISO = Math.sqrt(2 / 3)

/** The triangle's side (between the sharp corners of its centreline), as a
 * share of the frame's width and height — whichever is tighter wins. The height
 * share is the reference's 295 px of 720; the object and its shadow together
 * span about 1.55 sides tall and 1.12 wide, which is what the pair is fitted on. */
const FIT_W = 0.57
const FIT_H = 0.41

/** Thickness 0 → 10 maps the beam's width across 0.14 → 0.34 of the leg. The
 * reference is 0.24, which is Thickness 5; much past 0.34 the hole closes and
 * the triangle stops reading as one. */
const THICK_MIN = 0.14
const THICK_STEP = 0.02

/** Roundness adds this much of a beam to the inner corner radius per step. At
 * 0 the inner corner is sharp and the outer one is a beam wide; the reference's
 * fifth of a beam is Roundness 2.5. */
const ROUND_STEP = 0.08
/** Straight runs must survive, so the centreline radius stops here. */
const MAX_RADIUS = 0.45 * LEG

/** Samples per quarter bend; the caps carry fanned type, so they want enough
 * of these that a letter's edge stays straight. */
const BEND_SEGS = 40
const LINE_SEGS = 4

/** Shading per axis: a fragment's brightness is AMBIENT + n·KEY (+ BACK). Top (+Y) lands
 * on exactly 1, so the top face shows its Fill as typed; left (+Z) at 0.75 and
 * right (+X) at 0.85, read off the reference. */
const AMBIENT = 0.3
const KEY = new THREE.Vector3(0.55, 0.7, 0.45)
/** A weak fill from the opposite side, so a bend's outer wall turning away
 * from the key stays a darker shade of its band (as in the stills) instead of
 * dropping toward black at the silhouette. Flat faces never see it. */
const BACK = new THREE.Vector3(0.25, 0.1, 0.25)

/** Band order everywhere in this file: 0 left (+Z), 1 top (+Y), 2 right (+X). */
type FaceKey = "leftFace" | "topFace" | "rightFace"
const FACE_KEYS: FaceKey[] = ["leftFace", "topFace", "rightFace"]

/** Which way each band's type reads relative to the flow. The left reads with
 * it (tops outward); top and right read against it (tops toward the hole). */
const SIGNS: [number, number, number] = [1, -1, -1]

/** Canvas height for one band, i.e. the beam's width in texels. */
const TEX_H = 256
/** WebGL guarantees 4096; a long line at a large size is drawn smaller rather
 * than clipped. */
const MAX_TEX_W = 4096
/** Space between repeats, in ems of the band's own type. */
const GAP_EM = 0.9

/** Speed 1 is this many legs a second; 5 is the reference's pace. */
const SPEED_UNIT = 0.034 * LEG
/** How fast a fling from a drag dies away, per second. */
const FLING_DECAY = 3
/** Hover Speed runs on Speed's scale but goes ten times further: 10 is twice
 * the default pace, 100 is twenty times it. */
const MAX_HOVER_SPEED = 100
/** Time constants, in seconds, for the belt closing on Hover Speed when the
 * cursor arrives and back on Speed when it leaves. The attack is short so the
 * speed-up answers the cursor rather than trailing it. */
const HOVER_ATTACK = 0.15
const HOVER_RELEASE = 0.3
/** Share of a frame's travel the type is smeared over. A whole frame: at high
 * hover speeds consecutive frames then join up instead of strobing. */
const SHUTTER = 1
/** Never smear a band over more than half its own repeat — past that it is a
 * grey stripe, not fast type. */
const MAX_BLUR = 0.5

/** The ground: a soft shadow under and left of centre, in sides of the
 * triangle from its centre (screen space, y down). Measured off the frames. */
const SHADOW_OFFSET = { x: -0.13, y: 0.74 }
const SHADOW_SIGMA = { x: 0.27, y: 0.1 }
/** Peak darkness per step of Shadow. 5 is the reference's 27%. */
const SHADOW_STEP = 0.054

/** The floor falls off toward the top of the frame, about 11% at the edge. */
const FLOOR_GRADIENT = "linear-gradient(to bottom, rgba(0,0,0,0.11) 0%, rgba(0,0,0,0) 55%)"

/* ------------------------------------------------------------------- types -- */

type Weight = "light" | "regular" | "bold"
type Direction = "cw" | "ccw"

export interface Face {
    /** One repeat of the band's type. It runs round the beam end to end. */
    text: string
    /** Type size, in tenths of the beam's width. */
    size: number
    /** Light or Bold override the Font row's weight; Regular keeps it. */
    weight: Weight
    /** The face itself. */
    fill: string
    /** The type on it. */
    ink: string
}

export interface TickerDeltaProps {
    /** The face that looks left: down the left leg, round the top-left corner,
     * along the underside of the top. */
    leftFace: Partial<Face>
    /** The face that looks up: along the top, round the right corner, along the
     * inside of the bottom leg. */
    topFace: Partial<Face>
    /** The face that looks right: along the bottom, round the bottom-left
     * corner, up the inside of the left leg. */
    rightFace: Partial<Face>
    background: string
    /** Family, style and letter spacing for all three faces. Size is per face,
     * as a share of the beam. */
    font: React.CSSProperties
    /** How thick the beam is against the triangle. */
    thickness: number
    /** How round the corners are. */
    roundness: number
    /** How dark the shadow on the floor is. 0 removes it. */
    shadow: number
    /** How fast the type runs while a mouse or pen rests on the frame, on the
     * same scale as Speed. Eases in on enter and back out on leave. */
    hoverSpeed: number
    /** How fast the type runs. 0 holds it. */
    speed: number
    direction: Direction
    /** Drag round the triangle to wind the type along by hand. */
    drag: boolean
    /** How big the whole triangle draws in the frame, as a % of its fitted
     * size. 100 is the reference's fit (FIT_W / FIT_H); the shadow scales
     * along with it. */
    scale: number
    style?: React.CSSProperties
}

/* ---------------------------------------------------------------- defaults -- */

const DEFAULT_LEFT: Face = {
    text: "WE BUILD DYNAMIC BRAND EXPERIENCE",
    size: 7,
    weight: "regular",
    fill: "#FFFFFF",
    ink: "#111111",
}

const DEFAULT_TOP: Face = {
    text: "STUDIO -",
    size: 5,
    weight: "bold",
    fill: "#FEFE66",
    ink: "#111111",
}

const DEFAULT_RIGHT: Face = {
    text: "CORPORATE IDENTITY DESIGN -",
    size: 3,
    weight: "light",
    fill: "#121212",
    ink: "#E8E8E8",
}

const FACE_DEFAULTS: Record<FaceKey, Face> = {
    leftFace: DEFAULT_LEFT,
    topFace: DEFAULT_TOP,
    rightFace: DEFAULT_RIGHT,
}

const DEFAULT_FONT: React.CSSProperties = {
    fontFamily: "Montserrat, 'Avenir Next', Inter, Helvetica, Arial, sans-serif",
    fontWeight: 400,
}

const DEFAULTS = {
    leftFace: DEFAULT_LEFT,
    topFace: DEFAULT_TOP,
    rightFace: DEFAULT_RIGHT,
    background: "#0B0B0B",
    font: {

        defaultValue: {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Montserrat, 'Avenir Next', Inter, Helvetica, Arial, sans-serif","fontWeight":400,"lineHeight":"1.5em","letterSpacing":"0em"},"fontFamily":"Montserrat, 'Avenir Next', Inter, Helvetica, Arial, sans-serif","variant":"Regular","fontWeight":400,"fontSize":"16px","lineHeight":"1.5em","letterSpacing":"0em","textAlign":"left"},
    thickness: 5,
    roundness: 2.5,
    shadow: 2.3,
    hoverSpeed: 13.5,
    speed: 3.2,
    direction: "cw",
    drag: true,
    scale: 149,
}

type Config = {
    faces: [Face, Face, Face]
    font: React.CSSProperties
    thickness: number
    roundness: number
    shadow: number
    hoverSpeed: number
    speed: number
    direction: Direction
    drag: boolean
    scale: number
}

/* ----------------------------------------------------------------- helpers -- */

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

type Rgba = [number, number, number, number]

/** A scratch 2D context normalises any colour CSS accepts. Framer can hand a
 * token as `var(--token, fallback)`, which a canvas cannot resolve, so the
 * fallback is used. */
const colorCache = new Map<string, Rgba>()
let colorCtx: CanvasRenderingContext2D | null = null

function parseColor(input: string | undefined, fallback: string): Rgba {
    const raw = (input || fallback).trim()
    const hit = colorCache.get(raw)
    if (hit) return hit
    let css = raw
    const token = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(css)
    if (token) css = token[1]
    if (!colorCtx) colorCtx = document.createElement("canvas").getContext("2d")
    let out: Rgba = [0, 0, 0, 1]
    if (colorCtx) {
        colorCtx.fillStyle = "#000000"
        colorCtx.fillStyle = css
        const normal = String(colorCtx.fillStyle)
        if (normal.startsWith("#") && normal.length === 7) {
            out = [
                parseInt(normal.slice(1, 3), 16) / 255,
                parseInt(normal.slice(3, 5), 16) / 255,
                parseInt(normal.slice(5, 7), 16) / 255,
                1,
            ]
        } else {
            const parts = normal.match(/[\d.]+/g)
            if (parts && parts.length >= 3) {
                out = [
                    Number(parts[0]) / 255,
                    Number(parts[1]) / 255,
                    Number(parts[2]) / 255,
                    parts.length > 3 ? Number(parts[3]) : 1,
                ]
            }
        }
    }
    colorCache.set(raw, out)
    return out
}

/** Whether the Background is see-through. Read during render, so it parses
 * the string alone — a canvas here would answer differently on the server and
 * the client and the floor gradient would not hydrate. */
function isTransparent(input: string): boolean {
    let css = (input || "").trim().toLowerCase()
    const token = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(css)
    if (token) css = token[1].trim()
    if (!css || css === "transparent") return true
    if (/^#[0-9a-f]{8}$/.test(css)) return css.endsWith("00")
    if (/^#[0-9a-f]{4}$/.test(css)) return css.endsWith("0")
    const alpha = /^(?:rgba?|hsla?)\(.*[,/]\s*([\d.]+)(%?)\s*\)$/.exec(css)
    return !!alpha && Number(alpha[1]) === 0
}

function fontWeightFor(face: Face, font: React.CSSProperties): string {
    if (face.weight === "light") return "300"
    if (face.weight === "bold") return "700"
    return String(font.fontWeight ?? 400)
}

function fontStringFor(face: Face, font: React.CSSProperties, px: number): string {
    const family = font.fontFamily || (DEFAULT_FONT.fontFamily as string)
    const style = font.fontStyle === "italic" ? "italic" : "normal"
    return `${style} ${fontWeightFor(face, font)} ${px}px ${family}`
}

/** The band's text as one line: newlines and runs of space are a single space,
 * since the type runs on a single track. */
function lineOf(face: Face): string {
    return String(face.text ?? "").replace(/\s+/g, " ").trim()
}

/** What a band's canvas is keyed on, so a recolour is not a redraw. */
function faceKeyOf(face: Face, font: React.CSSProperties): string {
    return [
        lineOf(face),
        face.size,
        fontWeightFor(face, font),
        font.fontFamily,
        font.fontStyle,
        font.letterSpacing,
    ].join("|")
}

type Strip = { canvas: HTMLCanvasElement; aspect: number }

/**
 * One repeat of a band's type as a coverage mask: white letters on black,
 * exactly one repeat wide so it tiles along the beam. `aspect` is the repeat's
 * length in beam widths.
 */
function drawStrip(face: Face, font: React.CSSProperties): Strip {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const text = lineOf(face)
    const fontPx = (clamp(face.size, 0, 10, 5) / 10) * TEX_H
    if (!ctx || !text || fontPx < 1) {
        canvas.width = 4
        canvas.height = 4
        if (ctx) {
            ctx.fillStyle = "#000"
            ctx.fillRect(0, 0, 4, 4)
        }
        return { canvas, aspect: 1 }
    }

    const setFont = () => {
        ctx.font = fontStringFor(face, font, fontPx)
        const spacing = font.letterSpacing
        const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
        if (spacing !== undefined && spacing !== null && "letterSpacing" in c) {
            try {
                c.letterSpacing =
                    typeof spacing === "number" ? `${spacing}px` : String(spacing)
            } catch {
                /* an unparseable value leaves the default */
            }
        }
    }

    setFont()
    const gap = GAP_EM * fontPx
    const unitW = ctx.measureText(text).width + gap
    const scale = Math.min(1, MAX_TEX_W / unitW)
    canvas.width = Math.max(4, Math.round(unitW * scale))
    canvas.height = Math.max(4, Math.round(TEX_H * scale))
    // Resizing resets the context, so the font is set again after it.
    setFont()
    ctx.setTransform(canvas.width / unitW, 0, 0, canvas.height / TEX_H, 0, 0)
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, unitW, TEX_H)
    ctx.fillStyle = "#FFF"
    ctx.textBaseline = "alphabetic"
    // Centre the capitals on the beam, which is what a band of caps wants.
    const cap = ctx.measureText("H").actualBoundingBoxAscent || fontPx * 0.7
    ctx.fillText(text, gap / 2, TEX_H / 2 + cap / 2)
    return { canvas, aspect: unitW / TEX_H }
}

/* ---------------------------------------------------------------- geometry --
 * The centreline: legs along +Y, +X, +Z, each LEG long, with quarter bends of
 * radius R. It starts half-way up the left leg and ends half-way up the same
 * leg displaced by (L, L, L) — the same pixels, one view-depth nearer.
 */

type PathPoint = { c: THREE.Vector3; t: THREE.Vector3 }

/** Indices of the samples at the middle of the top and bottom legs, where the
 * bands that do not show there unwrap their coordinate. */
type PathMarks = { midTop: number; midBottom: number }

function buildPath(R: number): { pts: PathPoint[]; marks: PathMarks } {
    const L = LEG
    const pts: PathPoint[] = []
    const marks: PathMarks = { midTop: 0, midBottom: 0 }
    const push = (c: THREE.Vector3, t: THREE.Vector3) => {
        const last = pts[pts.length - 1]
        if (last && last.c.distanceToSquared(c) < 1e-14) return
        pts.push({ c, t: t.clone().normalize() })
    }
    // c(θ) = centre + R (cos θ e0 + sin θ e1), moving with increasing θ.
    const arc = (
        centre: THREE.Vector3,
        e0: THREE.Vector3,
        e1: THREE.Vector3,
        from: number,
        to: number
    ) => {
        const segs = Math.max(2, Math.round((BEND_SEGS * Math.abs(to - from)) / (Math.PI / 2)))
        for (let i = 0; i <= segs; i++) {
            const a = from + ((to - from) * i) / segs
            const c = centre
                .clone()
                .addScaledVector(e0, R * Math.cos(a))
                .addScaledVector(e1, R * Math.sin(a))
            const t = e0.clone().multiplyScalar(-Math.sin(a)).addScaledVector(e1, Math.cos(a))
            push(c, t)
        }
    }
    /** A straight run; returns the index of its middle sample. */
    const line = (a: THREE.Vector3, b: THREE.Vector3): number => {
        const t = b.clone().sub(a)
        let mid = 0
        for (let i = 0; i <= LINE_SEGS; i++) {
            push(a.clone().lerp(b, i / LINE_SEGS), t)
            if (i === LINE_SEGS / 2) mid = pts.length - 1
        }
        return mid
    }
    const X = new THREE.Vector3(1, 0, 0)
    const Y = new THREE.Vector3(0, 1, 0)
    const Z = new THREE.Vector3(0, 0, 1)
    const nX = X.clone().negate()
    const nY = Y.clone().negate()
    const nZ = Z.clone().negate()
    const lap = new THREE.Vector3(L, L, L)

    line(new THREE.Vector3(0, L / 2, 0), new THREE.Vector3(0, L - R, 0))
    arc(new THREE.Vector3(R, L - R, 0), nX, Y, 0, Math.PI / 2)
    marks.midTop = line(new THREE.Vector3(R, L, 0), new THREE.Vector3(L - R, L, 0))
    arc(new THREE.Vector3(L - R, L, R), nZ, X, 0, Math.PI / 2)
    marks.midBottom = line(new THREE.Vector3(L, L, R), new THREE.Vector3(L, L, L - R))
    arc(new THREE.Vector3(L, L + R, L - R), nY, Z, 0, Math.PI / 2)
    line(new THREE.Vector3(L, L + R, L), new THREE.Vector3(0, L / 2, 0).add(lap))
    return { pts, marks }
}

/**
 * The square beam swept along the path: four ribbons, each carrying the path's
 * arc length (aU) and the offset across its own face (aV). Wound so each faces
 * out; the back half is culled, which under this camera is exactly the half
 * that cannot be seen.
 */
function buildBeam(
    width: number,
    R: number
): { geometry: THREE.BufferGeometry; length: number; cuts: [number, number, number] } {
    const { pts: path, marks } = buildPath(R)
    const count = path.length
    const half = width / 2

    // Arc length and a parallel-transported section frame at every sample.
    const s = new Float64Array(count)
    const p: THREE.Vector3[] = []
    const q: THREE.Vector3[] = []
    let fp = new THREE.Vector3(0, 0, 1)
    let fq = new THREE.Vector3().crossVectors(path[0].t, fp).normalize()
    const turn = new THREE.Quaternion()
    for (let i = 0; i < count; i++) {
        if (i > 0) {
            s[i] = s[i - 1] + path[i].c.distanceTo(path[i - 1].c)
            turn.setFromUnitVectors(path[i - 1].t, path[i].t)
            fp = fp.clone().applyQuaternion(turn)
            const t = path[i].t
            fp.addScaledVector(t, -fp.dot(t)).normalize()
            fq = new THREE.Vector3().crossVectors(t, fp).normalize()
        }
        p.push(fp)
        q.push(fq)
    }

    const verts = count * 2 * 4
    const position = new Float32Array(verts * 3)
    const normal = new Float32Array(verts * 3)
    const aU = new Float32Array(verts)
    const aV = new Float32Array(verts)
    const index: number[] = []
    const n = new THREE.Vector3()
    const m = new THREE.Vector3()
    const v = new THREE.Vector3()
    let k = 0
    for (let face = 0; face < 4; face++) {
        const base = k
        for (let i = 0; i < count; i++) {
            const sign = face < 2 ? 1 : -1
            n.copy(face % 2 === 0 ? p[i] : q[i]).multiplyScalar(sign)
            // Across the face: n × t, so (t, m) seen from outside reads like
            // a page — which is what keeps the type un-mirrored.
            m.crossVectors(n, path[i].t)
            for (const side of [-1, 1]) {
                v.copy(path[i].c).addScaledVector(n, half).addScaledVector(m, side * half)
                position.set([v.x, v.y, v.z], k * 3)
                normal.set([n.x, n.y, n.z], k * 3)
                aU[k] = s[i]
                aV[k] = side * half
                k++
            }
        }
        for (let i = 0; i < count - 1; i++) {
            const a = base + i * 2
            const b = a + 1
            const a2 = a + 2
            const b2 = a + 3
            index.push(a, a2, b, a2, b2, b)
        }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3))
    geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3))
    geometry.setAttribute("aU", new THREE.BufferAttribute(aU, 1))
    geometry.setAttribute("aV", new THREE.BufferAttribute(aV, 1))
    geometry.setIndex(index)
    const length = s[count - 1]
    // Arc length wraps at the seam, but no band covers a whole lap, so each
    // unwraps it somewhere that band cannot be seen: the left band in the
    // middle of the bottom leg, the right band in the middle of the top, the
    // top band never (it does not cross the seam on the left leg).
    return {
        geometry,
        length,
        cuts: [s[marks.midBottom], length * 2, s[marks.midTop]],
    }
}

/* ----------------------------------------------------------------- shaders -- */

const BEAM_VERTEX = /* glsl */ `
attribute float aU;
attribute float aV;
varying vec3 vN;
varying float vU;
varying float vV;
varying float vScreenY;
void main() {
    vN = normal;
    vU = aU;
    vV = aV;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vScreenY = clip.y / clip.w;
    gl_Position = clip;
}
`

const BEAM_FRAGMENT = /* glsl */ `
uniform sampler2D uTex0;
uniform sampler2D uTex1;
uniform sampler2D uTex2;
uniform vec3 uLambda;
uniform vec3 uPhase;
uniform vec3 uBlur;
/** Each band's texture width in texels, so a smear knows how far it reaches. */
uniform vec3 uTexW;
uniform vec3 uSign;
uniform vec3 uCut;
uniform float uLoop;
uniform float uWidth;
uniform vec3 uFill0;
uniform vec3 uFill1;
uniform vec3 uFill2;
uniform vec3 uInk0;
uniform vec3 uInk1;
uniform vec3 uInk2;
uniform vec3 uKey;
uniform vec3 uBack;
uniform float uAmbient;
varying vec3 vN;
varying float vU;
varying float vV;
varying float vScreenY;

/** Where this fragment sits in one band's texture. */
vec2 bandUV(float lambda, float phase, float s, float cut) {
    // Per fragment, not per vertex: the jump lands on one hidden line.
    float u = vU >= cut ? vU - uLoop : vU;
    return vec2(s * (u / lambda - phase), 0.5 + s * vV / uWidth);
}

/**
 * The band's coverage, smeared along the band over this frame's travel.
 * Explicit gradients (taken before any branch) keep the mip choice correct in
 * the per-band branch below. Three taps, each with its footprint stretched
 * along u to cover a third of the travel: the footprints butt end to end, so
 * the sampler's own filtering joins them into one streak — no ghost letters —
 * however far the frame moved. More taps buy nothing but cost; twelve made a
 * blurred frame four times slower. At rest this is the single fetch it was.
 */
float smear(sampler2D tex, vec2 uv, vec2 gx, vec2 gy, float blur, float texW) {
    if (blur * texW < 1.0) return textureGrad(tex, uv, gx, gy).r;
    const float n = 3.0;
    // Lengthen the footprint, never shorten it: the top and right bands read
    // backwards, so their u falls across the screen and the reach must follow.
    vec2 sx = gx + vec2((gx.x < 0.0 ? -1.0 : 1.0) * blur / n, 0.0);
    float sum = 0.0;
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float o = ((fi + 0.5) / n - 0.5) * blur;
        sum += textureGrad(tex, uv + vec2(o, 0.0), sx, gy).r;
    }
    return sum / n;
}

void main() {
    vec3 n = normalize(vN);
    vec2 uv0 = bandUV(uLambda.x, uPhase.x, uSign.x, uCut.x);
    vec2 uv1 = bandUV(uLambda.y, uPhase.y, uSign.y, uCut.y);
    vec2 uv2 = bandUV(uLambda.z, uPhase.z, uSign.z, uCut.z);
    // Derivatives outside the branch, where every fragment of the quad runs.
    vec2 gx0 = dFdx(uv0); vec2 gy0 = dFdy(uv0);
    vec2 gx1 = dFdx(uv1); vec2 gy1 = dFdy(uv1);
    vec2 gx2 = dFdx(uv2); vec2 gy2 = dFdy(uv2);
    vec3 fill;
    vec3 ink;
    float c;
    // The band is whichever axis the surface faces most: +Z left, +Y top,
    // +X right. On a bend wall that is the face it is turning out of. Only
    // that band's texture is read.
    if (n.z >= n.x && n.z >= n.y) {
        fill = uFill0; ink = uInk0; c = smear(uTex0, uv0, gx0, gy0, uBlur.x, uTexW.x);
    } else if (n.y >= n.x) {
        fill = uFill1; ink = uInk1; c = smear(uTex1, uv1, gx1, gy1, uBlur.y, uTexW.y);
    } else {
        fill = uFill2; ink = uInk2; c = smear(uTex2, uv2, gx2, gy2, uBlur.z, uTexW.z);
    }
    float shade = clamp(uAmbient + dot(max(n, 0.0), uKey) + dot(max(-n, 0.0), uBack), 0.0, 1.06);
    // A touch more light toward the top of the frame, as in the stills.
    shade *= 0.975 + 0.025 * vScreenY;
    gl_FragColor = vec4(mix(fill, ink, c) * shade, 1.0);
}
`

const SHADOW_VERTEX = /* glsl */ `
void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const SHADOW_FRAGMENT = /* glsl */ `
uniform vec2 uCenter;
uniform vec2 uSigma;
uniform float uStrength;
void main() {
    vec2 d = (gl_FragCoord.xy - uCenter) / uSigma;
    gl_FragColor = vec4(0.0, 0.0, 0.0, uStrength * exp(-0.5 * dot(d, d)));
}
`

/* ------------------------------------------------------------------- scene -- */

class DeltaScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private camera: THREE.OrthographicCamera
    private scene = new THREE.Scene()
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh
    private shadowMaterial: THREE.ShaderMaterial
    private shadowMesh: THREE.Mesh

    private geometryKey = ""
    private beamWidth = 0.24
    private loopLength = 1
    private textures: (THREE.CanvasTexture | null)[] = [null, null, null]
    private textureKeys = ["", "", ""]
    private aspects = [1, 1, 1]
    private lambdas = [1, 1, 1]

    private width = 1
    private height = 1
    private side = 1
    private frameId = 0
    private lastT = 0
    private disposed = false
    private visible = true
    private observer: IntersectionObserver | null = null
    private reducedMotion: MediaQueryList | null = null

    /** Where the type is along the beam, in world units. */
    private scroll = 0
    private fling = 0
    private press = { id: -1, angle: 0, time: 0, velocity: 0 }
    /** The running speed actually in use, eased toward targetRate(). Negative
     * until the first frame sets it. */
    private rate = -1
    private hovering = false
    /** Where the belt was when the last frame was drawn, for the blur. */
    private drawnScroll = 0

    /** Set by the host so a static render can repaint once fonts land. */
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

        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40)
        // Looking down the diagonal at the triangle's centre, Y up: +Y projects
        // straight up, +X down-right, +Z down-left.
        const target = new THREE.Vector3(LEG / 3, (2 * LEG) / 3, 0)
        this.camera.position.copy(target).addScaledVector(VIEW, 10 * LEG)
        this.camera.up.set(0, 1, 0)
        this.camera.lookAt(target)

        const blank = () => {
            const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
            t.needsUpdate = true
            return t
        }

        this.material = new THREE.ShaderMaterial({
            vertexShader: BEAM_VERTEX,
            fragmentShader: BEAM_FRAGMENT,
            side: THREE.FrontSide,
            uniforms: {
                uTex0: { value: blank() },
                uTex1: { value: blank() },
                uTex2: { value: blank() },
                uLambda: { value: new THREE.Vector3(1, 1, 1) },
                uPhase: { value: new THREE.Vector3() },
                uBlur: { value: new THREE.Vector3() },
                uTexW: { value: new THREE.Vector3(4, 4, 4) },
                uSign: { value: new THREE.Vector3(...SIGNS) },
                uCut: { value: new THREE.Vector3() },
                uLoop: { value: 1 },
                uWidth: { value: 0.24 },
                uFill0: { value: new THREE.Vector3() },
                uFill1: { value: new THREE.Vector3() },
                uFill2: { value: new THREE.Vector3() },
                uInk0: { value: new THREE.Vector3() },
                uInk1: { value: new THREE.Vector3() },
                uInk2: { value: new THREE.Vector3() },
                uKey: { value: KEY.clone() },
                uBack: { value: BACK.clone() },
                uAmbient: { value: AMBIENT },
            },
        })
        this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        this.shadowMaterial = new THREE.ShaderMaterial({
            vertexShader: SHADOW_VERTEX,
            fragmentShader: SHADOW_FRAGMENT,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            uniforms: {
                uCenter: { value: new THREE.Vector2() },
                uSigma: { value: new THREE.Vector2(1, 1) },
                uStrength: { value: 0 },
            },
        })
        this.shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.shadowMaterial)
        this.shadowMesh.frustumCulled = false
        this.shadowMesh.renderOrder = -1
        this.scene.add(this.shadowMesh)

        if (typeof window.matchMedia === "function") {
            this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
        }
        if (typeof document !== "undefined" && document.fonts) {
            document.fonts.addEventListener("loadingdone", this.onFontsLoaded)
        }

        this.applyConfig()
    }

    /* ---- config --------------------------------------------------------------- */

    private applyConfig() {
        const cfg = this.cfg
        const width = (THICK_MIN + THICK_STEP * clamp(cfg.thickness, 0, 10, DEFAULTS.thickness)) * LEG
        const radius = Math.max(
            width / 2,
            Math.min(MAX_RADIUS, width / 2 + width * ROUND_STEP * clamp(cfg.roundness, 0, 10, DEFAULTS.roundness))
        )
        const geometryKey = `${width}|${radius}`
        if (geometryKey !== this.geometryKey) {
            this.geometryKey = geometryKey
            const { geometry, length, cuts } = buildBeam(width, radius)
            this.mesh.geometry.dispose()
            this.mesh.geometry = geometry
            this.beamWidth = width
            this.loopLength = length
            this.material.uniforms.uCut.value.set(cuts[0], cuts[1], cuts[2])
            this.material.uniforms.uLoop.value = length
        }
        this.material.uniforms.uWidth.value = this.beamWidth

        this.buildTextures(false)

        const u = this.material.uniforms
        cfg.faces.forEach((face, i) => {
            const fallback = FACE_DEFAULTS[FACE_KEYS[i]]
            const fill = parseColor(face.fill, fallback.fill)
            const ink = parseColor(face.ink, fallback.ink)
            ;(u[`uFill${i}`].value as THREE.Vector3).set(fill[0], fill[1], fill[2])
            ;(u[`uInk${i}`].value as THREE.Vector3).set(ink[0], ink[1], ink[2])
        })

        this.layout()
    }

    /** Redraw any band whose type changed; `force` redraws all (fonts landed). */
    private buildTextures(force: boolean) {
        const cfg = this.cfg
        const maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
        cfg.faces.forEach((face, i) => {
            const key = faceKeyOf(face, cfg.font)
            if (!force && key === this.textureKeys[i] && this.textures[i]) return
            this.textureKeys[i] = key
            const strip = drawStrip(face, cfg.font)
            const texture = new THREE.CanvasTexture(strip.canvas)
            texture.wrapS = THREE.RepeatWrapping
            texture.wrapT = THREE.ClampToEdgeWrapping
            texture.minFilter = THREE.LinearMipmapLinearFilter
            texture.magFilter = THREE.LinearFilter
            texture.anisotropy = maxAniso
            texture.colorSpace = THREE.NoColorSpace
            texture.needsUpdate = true
            this.textures[i]?.dispose()
            this.textures[i] = texture
            this.aspects[i] = strip.aspect
            this.material.uniforms.uTexW.value.setComponent(i, strip.canvas.width)
            this.material.uniforms[`uTex${i}`].value = texture
            this.requestFont(face)
        })

        // A repeat is as long as its canvas is wide, in beam widths — no band is
        // ever stretched to fit the loop (see uCut).
        for (let i = 0; i < 3; i++) this.lambdas[i] = this.beamWidth * this.aspects[i]
        this.material.uniforms.uLambda.value.set(this.lambdas[0], this.lambdas[1], this.lambdas[2])
    }

    private fontRequests = new Set<string>()

    /** Ask for the face's font; the loadingdone listener redraws when it lands. */
    private requestFont(face: Face) {
        if (typeof document === "undefined" || !document.fonts) return
        const spec = fontStringFor(face, this.cfg.font, 32)
        if (this.fontRequests.has(spec)) return
        this.fontRequests.add(spec)
        document.fonts.load(spec, lineOf(face) || "A").then(
            () => this.onFontsLoaded(),
            () => undefined
        )
    }

    private onFontsLoaded = () => {
        if (this.disposed) return
        this.buildTextures(true)
        this.onRedraw?.()
    }

    /** Fit the triangle to the frame, and the shadow under it. */
    private layout() {
        const w = this.width
        const h = this.height
        const fitted = Math.max(1, Math.min(w * FIT_W, h * FIT_H))
        this.side = fitted * (clamp(this.cfg.scale, 10, 200, DEFAULTS.scale) / 100)
        const pxPerUnit = this.side / (LEG * ISO)
        const halfW = w / 2 / pxPerUnit
        const halfH = h / 2 / pxPerUnit
        this.camera.left = -halfW
        this.camera.right = halfW
        this.camera.top = halfH
        this.camera.bottom = -halfH
        this.camera.updateProjectionMatrix()

        const dpr = this.renderer.getPixelRatio()
        const cx = w / 2 + SHADOW_OFFSET.x * this.side
        const cy = h / 2 + SHADOW_OFFSET.y * this.side
        const su = this.shadowMaterial.uniforms
        su.uCenter.value.set(cx * dpr, (h - cy) * dpr)
        su.uSigma.value.set(SHADOW_SIGMA.x * this.side * dpr, SHADOW_SIGMA.y * this.side * dpr)
        const strength = SHADOW_STEP * clamp(this.cfg.shadow, 0, 10, 5)
        su.uStrength.value = strength
        this.shadowMesh.visible = strength > 0
    }

    /* ---- frame ---------------------------------------------------------------- */

    /** `moving` is false for a still frame (the Framer canvas), which never
     * blurs. */
    private draw(moving = false) {
        const phase = (lambda: number) => {
            const x = this.scroll / lambda
            return x - Math.floor(x)
        }
        const u = this.material.uniforms
        u.uPhase.value.set(phase(this.lambdas[0]), phase(this.lambdas[1]), phase(this.lambdas[2]))
        // Smear each band over the distance it travelled since the last frame
        // drawn, measured in its own repeats. At Speed that is a sliver of a
        // texel and changes nothing; at a high Hover Speed the type jumps whole
        // letters a frame, and without this it strobes instead of rushing.
        const step = moving ? Math.abs(this.scroll - this.drawnScroll) * SHUTTER : 0
        this.drawnScroll = this.scroll
        const blur = (lambda: number) => Math.min(MAX_BLUR, step / lambda)
        u.uBlur.value.set(blur(this.lambdas[0]), blur(this.lambdas[1]), blur(this.lambdas[2]))
        this.renderer.render(this.scene, this.camera)
    }

    /** The running speed the belt should be heading for: Hover Speed while a
     * pointer rests on the frame, Speed otherwise. World units a second. */
    private targetRate(): number {
        const still = this.reducedMotion?.matches ? 0 : 1
        const steps = this.hovering
            ? clamp(this.cfg.hoverSpeed, 0, MAX_HOVER_SPEED, DEFAULTS.hoverSpeed)
            : clamp(this.cfg.speed, 0, 10, DEFAULTS.speed)
        return steps * SPEED_UNIT * still
    }

    private advance(dt: number) {
        const target = this.targetRate()
        // First frame starts at speed rather than spinning up from rest.
        if (this.rate < 0) this.rate = target
        // Eased, not switched, and frame-rate independent. Quick to answer the
        // cursor arriving; a little slower to wind down once it has gone.
        const ease = this.hovering ? HOVER_ATTACK : HOVER_RELEASE
        this.rate += (target - this.rate) * (1 - Math.exp(-dt / ease))
        if (this.press.id !== -1) return
        const dir = this.cfg.direction === "ccw" ? -1 : 1
        this.scroll += (dir * this.rate + this.fling) * dt
        this.fling *= Math.exp(-FLING_DECAY * dt)
        if (Math.abs(this.fling) < 1e-4) this.fling = 0
    }

    /* ---- pointer: wind the belt round the centre ------------------------------ */

    private angleOf(event: PointerEvent): number {
        const rect = this.container.getBoundingClientRect()
        // Screen y runs down, so this angle grows clockwise — the forward flow.
        return Math.atan2(
            event.clientY - (rect.top + rect.height / 2),
            event.clientX - (rect.left + rect.width / 2)
        )
    }

    private onPointerDown = (event: PointerEvent) => {
        if (!this.cfg.drag) return
        if (event.pointerType === "mouse" && event.button !== 0) return
        this.press = { id: event.pointerId, angle: this.angleOf(event), time: performance.now(), velocity: 0 }
        this.fling = 0
        try {
            this.container.setPointerCapture(event.pointerId)
        } catch {
            /* capture is a nicety */
        }
        this.setCursor("grabbing")
    }

    private onPointerMove = (event: PointerEvent) => {
        if (event.pointerId !== this.press.id) return
        const angle = this.angleOf(event)
        let delta = angle - this.press.angle
        if (delta > Math.PI) delta -= 2 * Math.PI
        if (delta < -Math.PI) delta += 2 * Math.PI
        // Close to the centre one pixel is a large angle; cap a single step.
        delta = Math.max(-0.5, Math.min(0.5, delta))
        this.press.angle = angle
        const ds = (delta / (2 * Math.PI)) * this.loopLength
        this.scroll += ds
        const now = performance.now()
        const dt = Math.max(1, now - this.press.time) / 1000
        this.press.time = now
        this.press.velocity = this.press.velocity * 0.5 + (ds / dt) * 0.5
    }

    private onPointerUp = (event: PointerEvent) => {
        if (event.pointerId !== this.press.id) return
        // What the hand added on top of the running speed carries on, then fades.
        const dir = this.cfg.direction === "ccw" ? -1 : 1
        const idle = performance.now() - this.press.time > 80
        this.fling = idle ? 0 : this.press.velocity - dir * Math.max(0, this.rate)
        this.press.id = -1
        this.setCursor(this.cfg.drag ? "grab" : "")
    }

    /** Hover is a mouse or pen resting on the frame. A finger has no hover —
     * on touch a tap would latch the fast speed until the next tap elsewhere. */
    private onPointerEnter = (event: PointerEvent) => {
        if (event.pointerType === "touch") return
        this.hovering = true
    }

    private onPointerLeave = (event: PointerEvent) => {
        if (event.pointerType === "touch") return
        this.hovering = false
    }

    private setCursor(value: string) {
        if (this.container.style.cursor === value) return
        this.container.style.cursor = value
    }

    private attach() {
        const node = this.container
        node.addEventListener("pointerdown", this.onPointerDown)
        node.addEventListener("pointermove", this.onPointerMove)
        node.addEventListener("pointerup", this.onPointerUp)
        node.addEventListener("pointercancel", this.onPointerUp)
        node.addEventListener("pointerenter", this.onPointerEnter)
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
        node.removeEventListener("pointerdown", this.onPointerDown)
        node.removeEventListener("pointermove", this.onPointerMove)
        node.removeEventListener("pointerup", this.onPointerUp)
        node.removeEventListener("pointercancel", this.onPointerUp)
        node.removeEventListener("pointerenter", this.onPointerEnter)
        node.removeEventListener("pointerleave", this.onPointerLeave)
        this.hovering = false
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
        this.setCursor(cfg.drag ? "grab" : "")
    }

    /** One frame for the Framer canvas, at rest. */
    renderStatic() {
        if (this.disposed) return
        this.draw()
    }

    start() {
        this.attach()
        this.setCursor(this.cfg.drag ? "grab" : "")
        this.lastT = -1
        // Timed off the frame's own timestamp, not performance.now() inside the
        // callback. The callback runs late by however long the page's other
        // work took, and by a different amount every frame, while the display
        // still shows frames on a steady beat — so stepping by the callback's
        // clock moves the type unevenly between frames that are on screen for
        // equal time. Invisible when slow; a visible stutter at hover speed.
        const loop = (now: number) => {
            if (this.disposed) return
            this.frameId = requestAnimationFrame(loop)
            let dt = this.lastT < 0 ? 0 : (now - this.lastT) / 1000
            this.lastT = now
            if (!this.visible) return
            if (!isFinite(dt) || dt < 0) dt = 0
            // A tab back from the background must not jump the belt. Generous
            // enough that a device dropping to 10 fps still runs at true speed
            // rather than visibly dragging.
            if (dt > 0.1) dt = 0.1
            this.advance(dt)
            this.draw(true)
        }
        this.frameId = requestAnimationFrame(loop)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.detach()
        if (typeof document !== "undefined" && document.fonts) {
            document.fonts.removeEventListener("loadingdone", this.onFontsLoaded)
        }
        this.mesh.geometry.dispose()
        this.material.dispose()
        this.shadowMesh.geometry.dispose()
        this.shadowMaterial.dispose()
        this.textures.forEach((t) => t?.dispose())
        for (let i = 0; i < 3; i++) {
            const t = this.material.uniforms[`uTex${i}`].value as THREE.Texture
            if (!this.textures.includes(t as THREE.CanvasTexture)) t.dispose()
        }
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
 * @framerIntrinsicWidth 720
 * @framerIntrinsicHeight 720
 * @framerDisableUnlink
 */
function __BaseImpl_TickerDelta(props: Partial<TickerDeltaProps>) {
    const {
        leftFace = {"ink":"#FFFFFF","fill":"#0A006B","size":7,"text":"WE BUILD DYNAMIC BRAND EXPERIENCE","weight":"regular"},
        topFace = {"ink":"#111111","fill":"#FEFE66","size":5,"text":"STUDIO -","weight":"bold"},
        rightFace = {"ink":"#FFFFFF","fill":"#0027FF","size":3,"text":"CORPORATE IDENTITY DESIGN -","weight":"regular"},
        background = DEFAULTS.background,
        font = {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Montserrat, 'Avenir Next', Inter, Helvetica, Arial, sans-serif","fontWeight":400,"lineHeight":"1.5em","letterSpacing":"0em"},
        thickness = DEFAULTS.thickness,
        roundness = DEFAULTS.roundness,
        shadow = DEFAULTS.shadow,
        hoverSpeed = DEFAULTS.hoverSpeed,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction,
        drag = DEFAULTS.drag,
        scale = DEFAULTS.scale,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<DeltaScene | null>(null)

    // Rebuilt per render and read by the scene, so a slider drag lands on the
    // next frame without the renderer ever being torn down. Faces merge
    // partial-safe.
    const cfgRef = useRef<Config>(null as unknown as Config)
    const cfg: Config = {
        faces: [
            { ...DEFAULT_LEFT, ...leftFace },
            { ...DEFAULT_TOP, ...topFace },
            { ...DEFAULT_RIGHT, ...rightFace },
        ],
        font: { ...DEFAULT_FONT, ...font },
        thickness,
        roundness,
        shadow,
        hoverSpeed,
        speed,
        direction,
        drag,
        scale,
    }
    cfgRef.current = cfg

    const faceKey = cfg.faces
        .map((f) => `${faceKeyOf(f, cfg.font)}#${f.fill}#${f.ink}`)
        .join("||")

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: DeltaScene
        try {
            scene = new DeltaScene(container, cfgRef.current)
        } catch {
            // No WebGL — an empty ground rather than a thrown render.
            return
        }
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
    }, [faceKey, thickness, roundness, shadow, hoverSpeed, speed, direction, drag, scale])

    const label = cfg.faces.map(lineOf).filter(Boolean).join(" · ")

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label={label || "An impossible triangle wrapped in scrolling type"}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                backgroundColor: background,
                // The floor's fall-off belongs to a ground; over a transparent
                // frame it would only tint the page underneath.
                backgroundImage: isTransparent(background) ? undefined : FLOOR_GRADIENT,
                // Vertical swipes still scroll the page; sideways ones wind the belt.
                touchAction: drag ? "pan-y" : undefined,
                userSelect: "none",
                ...style,
            }}
        />
    )
}

TickerDelta.displayName = "Ticker Delta"
TickerDelta.defaultProps = { ...DEFAULTS }

/* ---------------------------------------------------------------- controls -- */

function faceControls(defaults: Face, where: string) {
    return {
        type: ControlType.Object,
        controls: {
            text: {
                type: ControlType.String,
                title: "Text",
                defaultValue: defaults.text,
                placeholder: "One repeat of the band",
                description: `Runs ${where}, repeating end to end. Include your own separator, e.g. a trailing " -".`,
            },
            size: {
                type: ControlType.Number,
                title: "Size",
                min: 0,
                max: 10,
                step: 0.1,
                defaultValue: defaults.size,
                description: "Type size in tenths of the beam's width.",
            },
            weight: {
                type: ControlType.Enum,
                title: "Weight",
                options: ["light", "regular", "bold"],
                optionTitles: ["Light", "Regular", "Bold"],
                displaySegmentedControl: true,
                defaultValue: defaults.weight,
                description: "Regular uses the Font row's own weight.",
            },
            fill: {
                type: ControlType.Color,
                title: "Fill",
                defaultValue: defaults.fill,
            },
            ink: {
                type: ControlType.Color,
                title: "Text Color",
                defaultValue: defaults.ink,
            },
        },
        defaultValue: defaults,
    }
}

const __presetProps = {
  "background": "#0B0B0B",
  "font": {
    "variant": "Regular",
    "fontSize": "16px",
    "textAlign": "left",
    "fontFamily": "Montserrat, 'Avenir Next', Inter, Helvetica, Arial, sans-serif",
    "fontWeight": 400,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  },
  "leftFace": {
    "ink": "#FFFFFF",
    "fill": "#0A006B",
    "size": 7,
    "text": "TEXT COMPONENT",
    "weight": "regular"
  },
  "topFace": {
    "ink": "#111111",
    "fill": "#FEFE66",
    "size": 5,
    "text": "TEXT COMPONENT",
    "weight": "bold"
  },
  "rightFace": {
    "ink": "#FFFFFF",
    "fill": "#0027FF",
    "size": 3,
    "text": "TEXT COMPONENT",
    "weight": "regular"
  },
  "thickness": 5,
  "roundness": 2.5,
  "shadow": 2.3,
  "hoverSpeed": 13.5,
  "speed": 3.2,
  "direction": "cw",
  "drag": true,
  "scale": 149
};

export default function TickerDelta(props: Record<string, unknown>) {
  return <__BaseImpl_TickerDelta {...(__presetProps as Record<string, unknown>)} {...props} />;
}
