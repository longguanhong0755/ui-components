"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react"
import type { MotionValue, Transition, ValueAnimationTransition } from "motion/react"
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
 * Jade Bagel — a fat ring cast out of deep extruded type, glowing green from
 * inside, its rows of letters rolling endlessly in through the hole.
 *
 * Built after a reference animation supplied as ten still frames (720 × 960)
 * and a written brief: a neon-green doughnut on black, its surface a lattice of
 * heavy capitals ("…VERTIGOVERTIGO…") with dark faces and bright walls, a soft
 * glow welling out of the hole. There was no source to transcribe, so everything
 * here was MEASURED off those frames: a silhouette fit of a ray-traced torus
 * (IoU 0.97), the time-average of all ten frames to read the motion, and colour
 * sampling. The name is ours.
 *
 * WHAT THE FRAMES SAY, AND WHAT IS TRANSCRIBED
 *
 *   The ring holds still.  The silhouette's bounding box is the same to the
 *       pixel in all ten frames. Only the type moves. So unlike the brief's
 *       "continuous rotation on X and Y", the pose is fixed (Angle,
 *       Orientation); Sway adds the brief's rotation back as a slow drift
 *       about that pose, and can be set to 0 for the reference exactly.
 *   It is a fat torus seen in strong perspective.  Tube 0.72 of the ring
 *       radius (Thickness 5), axis tilted 44.5° toward the viewer and pointing
 *       up-left on screen (137°) — the defaults of Angle and Orientation —
 *       camera 2.4 ring radii from the centre. The near (lower-right) side is
 *       visibly larger, which is what pushes the hole up and left of the
 *       silhouette's middle; framing boxes that outline (frameRing).
 *   Rows run round the ring; the roll runs round the tube.  Every row reads
 *       the word along the ring and every row is the same, aligned — so down
 *       the tube one letter repeats ("OOOO" across the front, and on the rim
 *       "EEEE" seen side-on). Averaged over time the letters smear into
 *       stripes along the tube's own circles: the rows roll, through the hole
 *       and back round the outside.
 *   Every letter keeps one shape.  The E's on the rim and the GOV's down the
 *       hole are both about 1.4 : 1, though the rim's are five times the size:
 *       the type is wrapped conformally (see ringField), rows growing with the
 *       ring's radius just as letters do. Six E's fill the 130° of tube from
 *       the hole to the right-hand rim — under a third of the tube in conformal
 *       measure (0.29 of it) — so 20 rows a turn; fourteen letters round the ring, so the
 *       seven-letter word once in each half (Rows, Repeats).
 *   Letter tops face out, toward the outer equator.  The rows near the hole
 *       read upright with their tops toward the outside edge, so a row's "up"
 *       points back the way the roll comes from.
 *   It is cut in two.  A plane through the axis splits the reference into
 *       halves, half a row out of step, with a thin bright seam between them.
 *       NOT transcribed — see below.
 *   Light from within.  Outward letter faces are a deep teal-navy (≈ #00273A);
 *       everything that faces into the ring — walls, undersides, the far side
 *       of the tube seen through the gaps — is lit mint-green (≈ #53F598), and
 *       it is brightest round the hole. That is a light in the tube's core plus
 *       the brief's point light at the centre, (0, 0, 0).
 *
 * HOW IT IS DRAWN
 *
 *   One raymarched fragment shader, then a bloom. The brief asks for
 *   TextGeometry bent round a spline; that needs a typeface JSON — a fetch or a
 *   huge embedded blob, either of which breaks one-file — and loses the user's
 *   own font. Instead the word is drawn once into a 2D canvas with whatever
 *   face the panel picks, a signed distance transform is run over it (the
 *   8SSEDT from PlasterDrum, copied here so the file stands alone), and that
 *   field is extruded inward from the torus surface in the marcher. Through
 *   the gaps the rays carry on into the hollow tube and find the backs of the
 *   letters on the far side, which is the lattice the reference shows.
 *
 *   The material is the brief's MeshPhysicalMaterial written out by hand —
 *   dark metal faces with a Fresnel sheen and a sharp key reflection — because
 *   a raymarched surface has no mesh to hang one on. The bloom is the brief's
 *   UnrealBloomPass, likewise hand-rolled (bright pass, two blurred levels,
 *   composite) since `three/examples` would be a second module.
 *
 * WHERE IT DEVIATES, AND WHY
 *
 *   No cut. The reference's seam reads as a fault on a page — a hard line
 *   where the type breaks and restarts — so the ring is one piece: the word
 *   goes round a whole number of times (Repeats) and meets itself with the
 *   same gap as any other pair of letters, and the rows run unbroken.
 *   Speed is our choice: ten frames give the direction of the roll, not the
 *   frame rate. The ring turns toward the pointer anywhere in the window
 *   (Pointer → Track); the reference is a rendered loop with no pointer.
 *   Angle and Orientation free the fitted pose. Resolution is governed by
 *   frame time, since a raymarch costs per pixel.
 *
 * The Transition plays the entrance — the ring swelling into place as its rows
 * roll in — on a framer-motion value the renderer reads every frame. The roll
 * itself is a hand-rolled clock; Speed drives that.
 *
 * The `framer` import supplies the property controls only — under plain Next.js,
 * alias it to a stub exporting a no-op `addPropertyControls`, a `ControlType`
 * object, and a `RenderTarget` with `current: () => "preview"`.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 720
 * @framerIntrinsicHeight 960
 * @framerDisableUnlink
 */

/* --------------------------------------------------------------- constants --
 * The pose, the cut and the light are the look, not knobs. World units are
 * the ring's radius.
 */

const TAU = Math.PI * 2
const DEG = Math.PI / 180

/** Camera distance from the ring's centre. Close: the near side is ~25%
 * larger than the far side in the frames. */
const CAMERA_DIST = 2.4

/** Framing. The ring's outline as the camera sees it — perspective and all —
 * is boxed, the box is centred in the frame and scaled to this share of it.
 * The reference's ring spans 672 of its 720 px, centred to within a few;
 * boxing the outline rather than placing the ring's centre keeps that true
 * at any Angle and Orientation, where perspective pushes the centre around. */
const FIT_SHARE = 0.93
/** Samples round the ring and round the tube when boxing the outline. */
const FIT_RING_STEPS = 48
const FIT_TUBE_STEPS = 24

/** Thickness 0 → 5 → 10 maps the tube to these shares of the ring radius;
 * 0.72 — Thickness 5 — is the reference. The top stays under 1: a tube as
 * wide as the ring closes the hole and the surface runs through itself. */
const TUBE_THIN = 0.4
const TUBE_REF = 0.72
const TUBE_FAT = 0.94

/** Depth 0 → 10: how far the letters reach into the tube, as a share of its
 * radius. 0.22 — Depth 5 — is the reference's walls, about as deep as the
 * strokes are wide. */
const DEPTH_MIN = 0.06
const DEPTH_STEP = 0.032

/** How conformally the rows are laid round the tube: 0 spaces them evenly in
 * angle, 1 grows them with the ring's radius exactly as the letters' widths
 * grow. The frames are not a clean grid — down the hole a letter spans ~23°
 * of the ring, round the outside ~10°, and the columns lean — so no single
 * wrap reproduces them; this blend was matched to them side by side, keeping
 * the hole's letters legible and the rim's from smearing. */
const CONFORMAL = 0.5

/** Edge rounding of every letter, ring radii. A hair, so the walls catch a
 * highlight along their lips. */
const BEVEL = 0.0035

/** The type texture: one repeat of the word, one row tall. Capitals fill
 * CAP_SHARE of the row; the rest is the gap between rows. Tight, as in the
 * frames: down the tube the letters all but touch, so the eye reads columns
 * ("OOOO", "EEEE") radiating from the hole rather than rings of words. */
const TEX_ROW = 224
const CAP_SHARE = 0.93
const MAX_TEX_W = 4096
/** Space between letters along a row, in ems, on top of the panel's own
 * letter spacing. Open, as in the frames — a channel between every column —
 * and the same gap closes each repeat of the word. */
const TRACKING_EM = 0.16
/** Half-range of the distance field, in texels. Wide enough that the
 * marcher crosses the gaps between letters in a few steps. */
const SDF_RANGE = 96

/** Steps per ray. Rays that slip between letters cross the hollow tube and
 * march the far wall too, so this is generous. */
const MAX_STEPS = 128

/** Glow 0 → 10 maps the bloom's strength and the haze in the hole. */
const BLOOM_UNIT = 0.1
const BLOOM_THRESHOLD = 1.15
const HAZE_UNIT = 0.03

/** Speed 1 rolls this many rows a second. */
const SPEED_UNIT = 0.11
/** Sway 1 is this much drift in radians; the drift's two periods are
 * unrelated so the ring never repeats a path. */
const SWAY_UNIT = 0.028
const SWAY_PERIOD_X = 13
const SWAY_PERIOD_Y = 17
/** Track. Strength 1 turns the ring this far toward a pointer at the edge
 * of the window, radians (Strength 10: ~34°). The turn follows on a
 * critically damped spring — it glides in and settles without overshoot —
 * whose speed Smoothing sets: 0 is this stiff (rad/s)… */
const TRACK_UNIT = 0.06
const TRACK_OMEGA_FAST = 12
/** …and 10 this loose. */
const TRACK_OMEGA_SLOW = 2
/** Largest spring step, as ω·dt; longer frames are split so it stays
 * stable at any frame rate. */
const TRACK_MAX_STEP = 0.4

/** The entrance: the ring swells from this share of its size, swings into
 * its pose from this far off it (radians, about the screen's x and y), and
 * rolls this many rows in, all on the one Transition. Modest on purpose — a
 * large swell or swing on an ease-out curve spends its first frames moving
 * very fast, which reads as a jolt rather than an arrival. */
const ENTRY_SCALE = 0.84
const ENTRY_TILT = -0.18
const ENTRY_TURN = 0.32
const ENTRY_ROLL = 1.2
/** Frames drawn unseen after everything is built, before the entrance may
 * start (see checkReady). */
const WARM_FRAMES = 6
/** How fast the roll's speed follows Speed and Direction, per second: a
 * flip from In to Out glides through a standstill in about a second. */
const ROLL_EASE = 2.2
/** Where the roll sits on the Framer canvas, which paints one still frame. */
const STATIC_FLOW = 0.3

/** Resolution, in device pixels per screen pixel. The letter edges are the
 * piece, so the scene starts at the screen's own density and, while frames
 * keep up, the governor climbs toward SUPERSAMPLE times it on each axis —
 * drawn larger and averaged down, the only antialiasing a raymarched edge
 * gets. That matters on a 1x screen; on a 2x screen the climb ends at 1 (the
 * panel is already that dense). Raymarching costs per pixel, so TARGET_PIXELS
 * caps it, and on a slow GPU the governor may drop to MIN_SHARE of the
 * screen's density — never further, where the type would go soft. */
const SUPERSAMPLE = 2
const TARGET_PIXELS = 2_600_000
const MIN_SHARE = 0.75
const SLOW_MS = 19
const FAST_MS = 17.5

/* ------------------------------------------------------------------- types -- */

type Direction = "in" | "out"

export interface JadeBagelRing {
    /** Rows of type round the tube. */
    rows?: number
    /** Whole words round the ring. Whole, so the last letter meets the first
     * with the same gap as any other pair — the ring has no join. */
    repeats?: number
    /** How fat the tube is against the ring. 0 is a slim ring. */
    thickness?: number
}

export interface JadeBagelPointer {
    /** Turn the ring toward the pointer, anywhere in the window. */
    track?: boolean
    /** How far it turns. */
    strength?: number
    /** How softly it follows. 0 is snappy, 10 floats after the pointer. */
    smoothing?: number
}

export interface JadeBagelProps {
    /** One repeat of the word. Every row reads it round the ring. */
    text: string
    background: string
    /** Family, weight, style and letter spacing. Size follows Rows. */
    font: CSSProperties
    /** The outward faces of the letters — the dark of the reference. */
    textColor: string
    /** Rows round the tube, words round the ring, and how fat it is. */
    ring: JadeBagelRing
    /** How far the ring's axis leans toward you, degrees. 0 looks straight
     * down the hole; 90 is edge-on. */
    angle: number
    /** Which way the axis points on screen, degrees anticlockwise from
     * right. */
    orientation: number
    /** How far the letters reach into the tube. */
    depth: number
    /** The light inside the ring: walls, undersides and the hole. */
    lightColor: string
    /** Bloom and haze round the lit faces. 0 turns them off. */
    glow: number
    /** Turning toward the pointer: on or off, how far, how softly. */
    pointer: JadeBagelPointer
    /** How fast the rows roll. 0 holds them. */
    speed: number
    /** In rolls the rows over the top and down into the hole; Out reverses. */
    direction: Direction
    /** Slow drift of the ring about its pose, the brief's X/Y rotation. */
    sway: number
    /** Plays the entrance: the ring swells into place as its rows roll in. */
    transition: Transition
    style?: CSSProperties
}

/* ---------------------------------------------------------------- defaults -- */

const DEFAULT_FONT: CSSProperties = {
    fontFamily: `Inter, "Arial Black", "Helvetica Neue", Arial, sans-serif`,
    fontWeight: 900,
}

const DEFAULT_RING: Required<JadeBagelRing> = {
    rows: 18,
    repeats: 4,
    thickness: 5,
}

const DEFAULT_POINTER: Required<JadeBagelPointer> = {
    track: true,
    strength: 5,
    smoothing: 5,
}

const DEFAULT_TRANSITION: Transition = {
    type: "tween",
    duration: 2.4,
    // Quint-out: arrives briskly and spends most of its time settling, but
    // without expo's near-instant first frames.
    ease: [0.22, 1, 0.36, 1],
}

const DEFAULTS = {
    text: "VERTIGO",
    background: "#000000",
    font: {

        defaultValue: {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Inter, \"Arial Black\", \"Helvetica Neue\", Arial, sans-serif","fontWeight":900,"lineHeight":"1.5em","letterSpacing":"0em"},"fontFamily":"Inter, \"Arial Black\", \"Helvetica Neue\", Arial, sans-serif","variant":"Regular","fontWeight":900,"fontSize":"16px","lineHeight":"1.5em","letterSpacing":"0em","textAlign":"left"},
    textColor: "#022439",
    ring: DEFAULT_RING,
    // The fitted pose: the axis leans 44.5° toward the viewer and points
    // up-left on screen.
    angle: 45,
    orientation: 140,
    depth: 5,
    lightColor: "#33FF6E",
    glow: 5,
    pointer: DEFAULT_POINTER,
    speed: 4,
    direction: "in",
    sway: 2,
    transition: {

        defaultValue: {"ease":[0.22,1,0.36,1],"mass":1,"type":"tween","damping":60,"duration":2.4,"stiffness":800},"type":"tween","stiffness":800,"damping":60,"mass":1,"duration":2.4,"ease":[0.22,1,0.36,1]},
}

type Config = {
    text: string
    font: CSSProperties
    textColor: string
    ring: Required<JadeBagelRing>
    angle: number
    orientation: number
    depth: number
    lightColor: string
    glow: number
    pointer: Required<JadeBagelPointer>
    speed: number
    direction: Direction
    sway: number
}

/* ----------------------------------------------------------------- helpers -- */

function clamp(v: number | undefined, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** The word as one line: every row is a single track. */
function lineOf(text: string): string {
    return String(text ?? "").replace(/\s+/g, " ").trim()
}

/** Read any CSS colour the panel can produce into linear-light rgb. Framer can
 * hand a token as `var(--token, fallback)`, which a canvas cannot resolve, so
 * the fallback is used. */
let swatch: CanvasRenderingContext2D | null = null
const colorCache = new Map<string, [number, number, number]>()

function linearRgb(input: string | undefined, fallback: string): [number, number, number] {
    const raw = (input || fallback).trim()
    const hit = colorCache.get(raw)
    if (hit) return hit
    let css = raw
    const token = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(css)
    if (token) css = token[1]
    if (!swatch) {
        const c = document.createElement("canvas")
        c.width = 1
        c.height = 1
        swatch = c.getContext("2d", { willReadFrequently: true })
    }
    let out: [number, number, number] = [0, 0, 0]
    if (swatch) {
        swatch.globalCompositeOperation = "copy"
        swatch.fillStyle = "#000"
        swatch.fillStyle = css
        swatch.fillRect(0, 0, 1, 1)
        const d = swatch.getImageData(0, 0, 1, 1).data
        const lin = (v: number) => {
            const s = v / 255
            return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
        }
        // A colour with alpha is taken at its strength: a half-transparent
        // light is a dimmer light.
        const a = d[3] / 255
        out = [lin(d[0]) * a, lin(d[1]) * a, lin(d[2]) * a]
    }
    colorCache.set(raw, out)
    return out
}

function faceOf(font: CSSProperties) {
    const family = String(font.fontFamily || DEFAULT_FONT.fontFamily)
    const weight = String(font.fontWeight ?? DEFAULT_FONT.fontWeight)
    const style = font.fontStyle === "italic" ? "italic" : "normal"
    // Tracking normalised to em, so it survives the size we actually draw at,
    // which the panel never sees.
    let tracking = 0
    const ls = font.letterSpacing
    if (typeof ls === "number") tracking = ls / 16
    else if (typeof ls === "string") {
        const v = parseFloat(ls)
        if (!Number.isNaN(v)) {
            if (ls.indexOf("em") >= 0) tracking = v
            else tracking = v / (parseFloat(String(font.fontSize ?? 16)) || 16)
        }
    }
    return { family, weight, style, tracking }
}

function fontSpec(font: CSSProperties, px: number): string {
    const f = faceOf(font)
    return `${f.style} ${f.weight} ${px}px ${f.family}`
}

/** What the type texture is keyed on, so a recolour is not a rebuild. */
function maskKeyOf(cfg: Config): string {
    const f = cfg.font
    return [lineOf(cfg.text), f.fontFamily, f.fontWeight, f.fontStyle, f.letterSpacing].join("|")
}

/* --------------------------------------------------------------- the field --
 * 8SSEDT, swept twice so distances propagate across the wrap seams — the word
 * tiles round the ring and the row tiles round the tube, so the field must wrap
 * on both axes. Transcribed from PlasterDrum, where the reasons for writing it
 * flat are given at length.
 */

function distanceField(alpha: Uint8Array, W: number, H: number, RANGE: number) {
    // Float → IEEE half, written out here rather than THREE.DataUtils because
    // this function runs in a Worker (see fieldWorkerSource) and may close
    // over nothing.
    const f32 = new Float32Array(1)
    const u32 = new Uint32Array(f32.buffer)
    function toHalf(v: number): number {
        f32[0] = v
        const x = u32[0]
        const sign = (x >>> 16) & 0x8000
        const e = ((x >>> 23) & 0xff) - 112
        let m = x & 0x7fffff
        if (e <= 0) {
            if (e < -10) return sign
            m = (m | 0x800000) >> (1 - e)
            return sign | ((m + 0x1000) >> 13)
        }
        if (e >= 31) return sign | 0x7c00
        return sign | ((e << 10) + ((m + 0x1000) >> 13))
    }

    const n = W * H
    const INF = 8000
    const ax = new Int16Array(n)
    const ay = new Int16Array(n)
    const bx = new Int16Array(n)
    const by = new Int16Array(n)

    for (let i = 0; i < n; i++) {
        if (alpha[i] > 127) {
            ax[i] = INF
            ay[i] = INF
        } else {
            bx[i] = INF
            by[i] = INF
        }
    }

    function sweep(gx: Int16Array, gy: Int16Array) {
        let i = 0
        let j = 0
        let dx = 0
        let dy = 0
        let q = 0
        let best = 0
        let xL = 0
        let xR = 0
        let yA = 0
        for (let y = 0; y < H; y++) {
            yA = y === 0 ? H - 1 : y - 1
            for (let x = 0; x < W; x++) {
                i = y * W + x
                best = gx[i] * gx[i] + gy[i] * gy[i]
                if (best === 0) continue
                xL = x === 0 ? W - 1 : x - 1
                xR = x === W - 1 ? 0 : x + 1
                j = y * W + xL
                dx = gx[j] - 1
                dy = gy[j]
                q = dx * dx + dy * dy
                if (q < best) { best = q; gx[i] = dx; gy[i] = dy }
                j = yA * W + x
                dx = gx[j]
                dy = gy[j] - 1
                q = dx * dx + dy * dy
                if (q < best) { best = q; gx[i] = dx; gy[i] = dy }
                j = yA * W + xL
                dx = gx[j] - 1
                dy = gy[j] - 1
                q = dx * dx + dy * dy
                if (q < best) { best = q; gx[i] = dx; gy[i] = dy }
                j = yA * W + xR
                dx = gx[j] + 1
                dy = gy[j] - 1
                q = dx * dx + dy * dy
                if (q < best) { best = q; gx[i] = dx; gy[i] = dy }
            }
            for (let x = W - 1; x >= 0; x--) {
                i = y * W + x
                best = gx[i] * gx[i] + gy[i] * gy[i]
                if (best === 0) continue
                xR = x === W - 1 ? 0 : x + 1
                j = y * W + xR
                dx = gx[j] + 1
                dy = gy[j]
                if (dx * dx + dy * dy < best) { gx[i] = dx; gy[i] = dy }
            }
        }
        for (let y = H - 1; y >= 0; y--) {
            yA = y === H - 1 ? 0 : y + 1
            for (let x = W - 1; x >= 0; x--) {
                i = y * W + x
                best = gx[i] * gx[i] + gy[i] * gy[i]
                if (best === 0) continue
                xL = x === 0 ? W - 1 : x - 1
                xR = x === W - 1 ? 0 : x + 1
                j = y * W + xR
                dx = gx[j] + 1
                dy = gy[j]
                q = dx * dx + dy * dy
                if (q < best) { best = q; gx[i] = dx; gy[i] = dy }
                j = yA * W + x
                dx = gx[j]
                dy = gy[j] + 1
                q = dx * dx + dy * dy
                if (q < best) { best = q; gx[i] = dx; gy[i] = dy }
                j = yA * W + xR
                dx = gx[j] + 1
                dy = gy[j] + 1
                q = dx * dx + dy * dy
                if (q < best) { best = q; gx[i] = dx; gy[i] = dy }
                j = yA * W + xL
                dx = gx[j] - 1
                dy = gy[j] + 1
                q = dx * dx + dy * dy
                if (q < best) { best = q; gx[i] = dx; gy[i] = dy }
            }
            for (let x = 0; x < W; x++) {
                i = y * W + x
                best = gx[i] * gx[i] + gy[i] * gy[i]
                if (best === 0) continue
                xL = x === 0 ? W - 1 : x - 1
                j = y * W + xL
                dx = gx[j] - 1
                dy = gy[j]
                if (dx * dx + dy * dy < best) { gx[i] = dx; gy[i] = dy }
            }
        }
    }

    sweep(ax, ay)
    sweep(ax, ay)
    sweep(bx, by)
    sweep(bx, by)

    const field = new Float32Array(n)
    for (let i = 0; i < n; i++) {
        const a01 = alpha[i] / 255
        let d: number
        if (a01 > 0.02 && a01 < 0.98) {
            // On an edge texel the canvas's own antialiasing is the sub-texel
            // distance to the outline; without it every curve terraces.
            d = 0.5 - a01
        } else {
            const dIn = Math.sqrt(ax[i] * ax[i] + ay[i] * ay[i])
            const dOut = Math.sqrt(bx[i] * bx[i] + by[i] * by[i])
            // Positive outside the glyph, negative inside.
            d = dOut > 0 ? dOut - 0.5 : -(dIn - 0.5)
        }
        field[i] = d
    }

    // Smooth it. Splicing the canvas's sub-texel edge values into the integer
    // transform leaves a ripple at texel pitch all along every outline, and
    // the walls — lit side-on by the light inside the ring — show it as
    // fine fluting. Two passes of a 1-2-1 kernel each way (wrapped, as the
    // field is) iron it flat; on a distance field that leaves the outline
    // where it was and softens only the sharpest corners, by about a texel.
    const tmp = new Float32Array(n)
    for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < H; y++) {
            const row = y * W
            for (let x = 0; x < W; x++) {
                const l = x === 0 ? W - 1 : x - 1
                const r = x === W - 1 ? 0 : x + 1
                tmp[row + x] = (field[row + l] + 2 * field[row + x] + field[row + r]) * 0.25
            }
        }
        for (let y = 0; y < H; y++) {
            const up = (y === 0 ? H - 1 : y - 1) * W
            const dn = (y === H - 1 ? 0 : y + 1) * W
            const row = y * W
            for (let x = 0; x < W; x++) {
                field[row + x] = (tmp[up + x] + 2 * tmp[row + x] + tmp[dn + x]) * 0.25
            }
        }
    }

    // Half floats, in texels, rather than PlasterDrum's eight bits: an
    // eight-bit field shows on the walls as terracing all the way down.
    const out = new Uint16Array(n)
    for (let i = 0; i < n; i++) {
        out[i] = toHalf(Math.max(-RANGE, Math.min(RANGE, field[i])))
    }
    return out
}

type Field = { data: ReturnType<typeof distanceField>; width: number; height: number }
type Mask = { alpha: Uint8Array; width: number; height: number }
type FieldReply = { id: number; out: ReturnType<typeof distanceField>; w: number; h: number }

/** The transform as a Worker, built from distanceField's own source so the
 * component stays one file. Even flat it costs a couple of hundred
 * milliseconds; on the main thread that is a stall in the middle of the
 * entrance every time a font lands or a letter is typed. */
function fieldWorkerSource(): string {
    return (
        "self.onmessage=function(e){var d=e.data;var f=" +
        String(distanceField) +
        ";var out=f(d.a,d.w,d.h,d.r);" +
        "self.postMessage({id:d.id,out:out,w:d.w,h:d.h},[out.buffer])}"
    )
}

/** How the face actually measures right now. A loaded font that measures
 * the same as what is already drawn changes nothing, so it rebuilds
 * nothing. */
let printCtx: CanvasRenderingContext2D | null = null
function fontPrint(cfg: Config): string {
    if (!printCtx) printCtx = document.createElement("canvas").getContext("2d")
    if (!printCtx) return ""
    printCtx.font = fontSpec(cfg.font, 100)
    const line = lineOf(cfg.text) || "H"
    return printCtx.measureText(line).width.toFixed(2) + "," + printCtx.measureText("H").actualBoundingBoxAscent.toFixed(2)
}

/** One repeat of the word, one row tall, as coverage — the input to the
 * wrapped signed distance field. Null when there is nothing to draw.
 *
 * The letters are set one at a time rather than with fillText on the whole
 * line, for two reasons. The gap after the last letter must be exactly the
 * gap between letters, or the word visibly breaks where it repeats — canvas
 * letterSpacing is missing in older Safari and its trailing space differs
 * between engines. And a round or slanted last letter overhangs its own
 * advance; set as one run its edge fell off the end of the texture, which is
 * the cut-off last letter. Pair widths (prefix measurements) keep the face's
 * kerning. */
function buildMask(cfg: Config): Mask | null {
    const line = lineOf(cfg.text)
    if (!line) return null
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    const face = faceOf(cfg.font)
    const setFont = (px: number) => {
        ctx.font = fontSpec(cfg.font, px)
        const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
        // Tracking is applied by hand below; make sure the context adds none.
        if ("letterSpacing" in c) {
            try {
                c.letterSpacing = "0px"
            } catch {
                /* recent API; absent means none */
            }
        }
    }

    // Size the face by its capitals, whatever the family's em proportions.
    setFont(100)
    const capRatio = (ctx.measureText("H").actualBoundingBoxAscent || 72) / 100
    const capPx = TEX_ROW * CAP_SHARE
    const fontPx = capPx / Math.max(0.2, capRatio)
    setFont(fontPx)

    const chars = Array.from(line)
    const track = (TRACKING_EM + face.tracking) * fontPx
    // Pen position of each letter, kerning included.
    const pens: number[] = []
    let prefix = ""
    for (let i = 0; i < chars.length; i++) {
        pens.push(ctx.measureText(prefix).width + i * track)
        prefix += chars[i]
    }
    const last = ctx.measureText(chars[chars.length - 1])
    const firstInk = Math.max(0, ctx.measureText(chars[0]).actualBoundingBoxLeft || 0)
    const lastPen = pens[pens.length - 1]
    // The repeat ends one tracking gap after the last letter's advance — or
    // after its ink, if that reaches further.
    const lastEnd = lastPen + Math.max(last.width, last.actualBoundingBoxRight || 0)
    // The join between repeats gets the face's own kerning for that pair
    // (last letter, then first), like every pair inside the word, so it is
    // no wider than any other gap — an unkerned "O V" stands out as a line.
    const pairKern =
        ctx.measureText(chars[chars.length - 1] + chars[0]).width -
        last.width -
        ctx.measureText(chars[0]).width
    const joinGap = Math.max(track + pairKern, fontPx * 0.02)
    const unitW = firstInk + lastEnd + joinGap
    if (!(unitW > 0)) return null
    const W = Math.max(8, Math.min(MAX_TEX_W, Math.ceil(unitW)))
    const H = TEX_ROW
    canvas.width = W
    canvas.height = H
    // Resizing resets the context, so the font is set again after it.
    setFont(fontPx)
    ctx.clearRect(0, 0, W, H)
    ctx.setTransform(W / unitW, 0, 0, 1, 0, 0)
    ctx.fillStyle = "#fff"
    ctx.textBaseline = "alphabetic"
    // Start half a gap in, so the texture's own seam falls mid-gap.
    const x0 = firstInk + joinGap / 2
    const baseline = H / 2 + capPx / 2
    for (let i = 0; i < chars.length; i++) ctx.fillText(chars[i], x0 + pens[i], baseline)
    const px = ctx.getImageData(0, 0, W, H).data
    const alpha = new Uint8Array(W * H)
    for (let i = 0; i < alpha.length; i++) alpha[i] = px[i * 4 + 3]
    return { alpha, width: W, height: H }
}

/* ---------------------------------------------------------------- shaders -- */

const QUAD_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const RING_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uUnitPx;
uniform float uCamDist;
uniform mat3 uRot;
uniform mat3 uRotInv;
uniform sampler2D uSdf;
uniform vec2 uTexSize;
uniform float uTube;
uniform float uDepth;
uniform float uRows;
uniform float uWords;
uniform float uK;
uniform float uFlow;
uniform vec3 uInk;
uniform vec3 uGlow;
uniform float uHaze;

const float TAU = 6.28318530718;
const float PI = 3.14159265359;
const float SDF_RANGE = ${SDF_RANGE.toFixed(1)};
const float BEVEL = ${BEVEL.toFixed(4)};
const float CONFORMAL = ${CONFORMAL.toFixed(3)};

/* The radial slab the letters occupy: from the torus surface uDepth inward. */
float slab(vec3 p, out vec2 q, out float rho) {
    q = vec2(length(p.xz) - 1.0, p.y);
    rho = length(q);
    return abs(rho - (uTube - uDepth * 0.5)) - uDepth * 0.5;
}

/* The ring, in its own frame: axis along y, ring radius 1.
 *   phi   runs round the ring and carries the word: right is +phi.
 *   theta runs round the tube from the outer equator, over the top (+y) and
 *         into the hole; a letter's up is -theta, so tops face outward.
 *
 * The rows are laid on partly CONFORMALLY (CONFORMAL), not evenly in theta:
 * a row's height grows with the ring's radius where it sits, as a letter's
 * width does, so letters are small and tight down the hole and large round
 * the outside without being squeezed thin at one end and smeared wide at
 * the other. In closed form the conformal coordinate round the tube is
 * atan(k tan(theta/2)) with k = sqrt((1 - r) / (1 + r)); written with
 * atan2 so it runs on through the inner equator without a jump.
 *
 * Each half of the cut ring starts a fresh word at its own cut, so a seam
 * only ever falls between words — never through a letter. */
/* The field, sampled with a cubic B-spline in four bilinear fetches. Plain
 * bilinear filtering is continuous but its slope jumps at every texel, and
 * the walls' normals come from that slope: they facet at texel pitch, which
 * shows as fine stripes down every letter wall and reads as blur. The march
 * keeps the one-fetch bilinear read; only the normals pay for this. */
vec4 bspline(float v) {
    vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
    vec4 s = n * n * n;
    float x = s.x;
    float y = s.y - 4.0 * s.x;
    float z = s.z - 4.0 * s.y + 6.0 * s.x;
    return vec4(x, y, z, 6.0 - x - y - z) * (1.0 / 6.0);
}

float sdfSmooth(vec2 uv) {
    vec2 tc = uv * uTexSize - 0.5;
    vec2 f = fract(tc);
    tc -= f;
    vec4 xc = bspline(f.x);
    vec4 yc = bspline(f.y);
    vec4 c = tc.xxyy + vec2(-0.5, 1.5).xyxy;
    vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
    vec4 o = (c + vec4(xc.yw, yc.yw) / s) / uTexSize.xxyy;
    float s0 = texture2D(uSdf, o.xz).r;
    float s1 = texture2D(uSdf, o.yz).r;
    float s2 = texture2D(uSdf, o.xw).r;
    float s3 = texture2D(uSdf, o.yw).r;
    float sx = s.x / (s.x + s.y);
    float sy = s.z / (s.z + s.w);
    return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}

/* Where p reads the field, and how to turn that reading into a distance.
 * False when p is above or below the shell: the slab alone bounds the
 * distance there (the rounded intersection is never nearer than it), so no
 * texture is read. Split from the read itself so the march's one-fetch
 * bilinear path and the normals' four-fetch smooth one are separate
 * functions — a select between them would run both on most GPUs. */
bool ringSetup(vec3 p, out vec2 uv, out float scale, out float w) {
    vec2 q;
    float rho;
    w = slab(p, q, rho);
    if (w > 0.015) return false;
    float th = atan(q.y, q.x);
    float ph = atan(p.z, p.x);
    // Half-angle sine and cosine straight from q, which is cheaper per step
    // than sin and cos of th.
    float ct = q.x / max(rho, 1e-5);
    float hc = sqrt(max(0.5 + 0.5 * ct, 0.0));
    float hs = sign(q.y) * sqrt(max(0.5 - 0.5 * ct, 0.0));
    uv = vec2(
        ph / TAU * uWords,
        mix(th / TAU, atan(uK * hs, hc) / PI, CONFORMAL) * uRows - uFlow
    );
    // World per texel on each axis; the smaller of the two keeps the step
    // safe. Rows per radian round the tube come from the blend's slope.
    float su = TAU * max(length(p.xz), 0.02) / (uWords * uTexSize.x);
    float g = hc * hc + uK * uK * hs * hs;
    float dv = uRows * mix(1.0 / TAU, uK / (TAU * g), CONFORMAL);
    float sv = max(rho, 0.02) / (dv * uTexSize.y);
    scale = min(su, sv);
    return true;
}

float ringCombine(float raw, float scale, float w) {
    float d2 = clamp(raw, -SDF_RANGE, SDF_RANGE) * scale;
    vec2 k = vec2(d2 + BEVEL, w + BEVEL);
    return min(max(k.x, k.y), 0.0) + length(max(k, 0.0)) - BEVEL;
}

float ringField(vec3 p) {
    vec2 uv;
    float scale, w;
    if (!ringSetup(p, uv, scale, w)) return w;
    return ringCombine(texture2D(uSdf, uv).r, scale, w);
}

float ringFieldSmooth(vec3 p) {
    vec2 uv;
    float scale, w;
    if (!ringSetup(p, uv, scale, w)) return w;
    return ringCombine(sdfSmooth(uv), scale, w);
}

vec3 calcNormal(vec3 p, float e) {
    vec2 h = vec2(1.0, -1.0) * e;
    return normalize(
        h.xyy * ringFieldSmooth(p + h.xyy) +
        h.yyx * ringFieldSmooth(p + h.yyx) +
        h.yxy * ringFieldSmooth(p + h.yxy) +
        h.xxx * ringFieldSmooth(p + h.xxx)
    );
}

float calcAO(vec3 p, vec3 n) {
    float occ = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 2; i++) {
        float h = 0.016 + 0.06 * float(i);
        occ += (h - ringField(p + n * h)) * sca;
        sca *= 0.7;
    }
    return clamp(1.0 - 3.2 * occ, 0.0, 1.0);
}

/* In-scatter from the point light at the centre, integrated along the ray
 * from the eye to t1: the haze welling out of the hole. Integrated from the
 * eye rather than from the bounding sphere, which would cut it off in a
 * visible disc, and faded by how close the ray passes to the light so the
 * ground beside the ring stays the reference's pure black. */
float haze(vec3 ro, vec3 rd, float t1) {
    const float K = 30.0;
    float b = dot(ro, rd);
    float c = max(dot(ro, ro) - b * b, 0.0);
    float s = sqrt(K);
    float m = sqrt(1.0 + K * c);
    float line = (atan(s * (t1 + b) / m) - atan(s * b / m)) / (s * m);
    return line * exp(-1.5 * c);
}

void main() {
    vec2 frag = vUv * uRes;
    vec2 s = (frag - uCenter) / uUnitPx;
    vec3 ro = uRot * vec3(0.0, 0.0, uCamDist);
    vec3 rd = uRot * normalize(vec3(s, -uCamDist));
    // World size of a pixel per unit of ray length.
    float pxPerT = 1.0 / (uCamDist * uUnitPx);

    vec3 col = vec3(0.0);
    float alpha = 0.0;

    float bound = 1.0 + uTube + 0.03;
    float b = dot(ro, rd);
    float h = b * b - (dot(ro, ro) - bound * bound);
    if (h > 0.0) {
        h = sqrt(h);
        float t0 = max(-b - h, 0.0);
        float t1 = -b + h;
        float t = t0;
        bool hit = false;
        float bestRel = 1e9;
        float bestT = t;

        for (int i = 0; i < ${MAX_STEPS}; i++) {
            vec3 p = ro + rd * t;
            float d = ringField(p);
            float pix = t * pxPerT;
            float rel = d / max(pix, 1e-6);
            if (rel < bestRel) {
                bestRel = rel;
                bestT = t;
            }
            if (d < 0.5 * pix) {
                hit = true;
                bestT = t;
                break;
            }
            t += d * 0.88;
            if (t > t1) break;
        }

        // On a miss, partial coverage from the closest pass: the only
        // antialiasing a raymarch on black gets.
        float cov = hit ? 1.0 : clamp(1.0 - bestRel, 0.0, 1.0);
        if (cov > 0.002) {
            vec3 p = ro + rd * bestT;
            // Half a pixel: any wider and the normal rounds every edge over,
            // which reads as blur on the type.
            vec3 n = calcNormal(p, max(0.0006, bestT * pxPerT * 0.5));
            float ao = calcAO(p, n);

            float rxz = max(length(p.xz), 1e-4);
            vec3 core = vec3(p.x / rxz, 0.0, p.z / rxz);
            vec3 toCore = core - p;
            float rho = max(length(toCore), 1e-4);
            vec3 inward = toCore / rho;
            // 0 on the letter faces, 1 at the bottom of the extrusion.
            float deep = clamp((uTube - rho) / max(uDepth, 1e-4), 0.0, 1.0);
            float outward = dot(n, -inward);

            // The light in the tube's core: wrapped, so the walls — which
            // stand side-on to it — still take most of it, and brighter the
            // deeper in they are.
            float inner = mix(0.42, 1.0, clamp(dot(n, inward) * 0.5 + 0.5, 0.0, 1.0));
            inner *= mix(0.6, 1.0, deep);
            // The brief's point light at the centre: lights the hole.
            float dc = max(length(p), 1e-4);
            float centre = max(dot(n, -p / dc), 0.0) / (1.0 + 3.0 * dc * dc);

            // Dark metal faces: Fresnel sheen of the green around them and a
            // sharp key reflection, fixed to the world so it stays put as the
            // ring sways.
            vec3 r = uRotInv * reflect(rd, n);
            float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 4.0);
            float key = pow(max(dot(r, normalize(vec3(-0.45, 0.65, 0.6))), 0.0), 48.0);
            float faceMask = smoothstep(0.35, 0.9, outward);

            // The inside of the ring is lit harder than the outside: the
            // frames are brightest round the hole and fall to a darker green
            // toward the outer rim.
            float hole = smoothstep(1.0 + uTube, 1.0 - uTube, rxz);

            vec3 lit = uInk * mix(0.45, 1.0, faceMask) * (0.35 + 0.65 * ao);
            lit += uGlow * inner * ao * 1.6 * mix(0.4, 1.3, hole) * (1.0 - 0.9 * faceMask);
            lit += uGlow * centre * 3.6;
            lit += (uGlow * 0.3 + uInk) * fres * 0.4 * faceMask;
            // Gloss on the walls from the light inside: the near-white mint
            // the frames show along the lips of the letters.
            float gloss = pow(max(dot(n, normalize(inward - rd)), 0.0), 18.0);
            lit += mix(uGlow, vec3(1.0), 0.45) * gloss * 0.9 * ao * mix(0.5, 1.2, hole) * (1.0 - faceMask);
            lit += vec3(0.75, 1.0, 0.85) * key * 0.9;

            col = lit * cov;
            alpha = cov;
        }

        col += uGlow * uHaze * haze(ro, rd, hit ? bestT : 1e4);
    }

    gl_FragColor = vec4(col, alpha);
}
`

/** Bright pass with a 4-tap box downsample. Soft knee, so the bloom fades in
 * rather than switching on at the threshold. */
const BRIGHT_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform vec2 uUvScale;
uniform float uThreshold;
void main() {
    vec2 uv = vUv * uUvScale;
    vec3 c = texture2D(uTex, uv + uTexel * vec2(-0.5, -0.5)).rgb;
    c += texture2D(uTex, uv + uTexel * vec2(0.5, -0.5)).rgb;
    c += texture2D(uTex, uv + uTexel * vec2(-0.5, 0.5)).rgb;
    c += texture2D(uTex, uv + uTexel * vec2(0.5, 0.5)).rgb;
    c *= 0.25;
    float l = max(c.r, max(c.g, c.b));
    float knee = 0.25;
    float soft = clamp(l - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 1e-4);
    float w = max(soft, l - uThreshold) / max(l, 1e-4);
    gl_FragColor = vec4(c * w, 1.0);
}
`

/** 9-tap Gaussian in five fetches, one axis at a time. */
const BLUR_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uStep;
void main() {
    vec2 o1 = uStep * 1.3846153846;
    vec2 o2 = uStep * 3.2307692308;
    vec3 c = texture2D(uTex, vUv).rgb * 0.2270270270;
    c += (texture2D(uTex, vUv + o1).rgb + texture2D(uTex, vUv - o1).rgb) * 0.3162162162;
    c += (texture2D(uTex, vUv + o2).rgb + texture2D(uTex, vUv - o2).rgb) * 0.0702702703;
    gl_FragColor = vec4(c, 1.0);
}
`

/** Scene plus bloom, tone-mapped and encoded. The output is premultiplied: the
 * glow is light added over whatever Background is behind the canvas. */
const COMPOSITE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloomA;
uniform sampler2D uBloomB;
uniform float uBloom;
// The scene is drawn into the corner of a fixed-size target (see draw): this
// is the share of it in use, and half a texel, so the edge never samples the
// unused part.
uniform vec2 uUvScale;
uniform vec2 uSceneTexel;
vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
    vec4 s = texture2D(uScene, min(vUv * uUvScale, uUvScale - 0.5 * uSceneTexel));
    vec3 glow = texture2D(uBloomA, vUv).rgb * 0.5 + texture2D(uBloomB, vUv).rgb * 0.08;
    vec3 c = aces(s.rgb + glow * uBloom);
    c = pow(c, vec3(1.0 / 2.2));
    float a = clamp(max(s.a, max(c.r, max(c.g, c.b))), 0.0, 1.0);
    gl_FragColor = vec4(c, a);
}
`

/* ------------------------------------------------------------------- scene -- */

class BagelScene {
    private host: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private camera = new THREE.Camera()
    private scene = new THREE.Scene()
    private quad: THREE.Mesh
    private ring: THREE.ShaderMaterial
    private bright: THREE.ShaderMaterial
    private blur: THREE.ShaderMaterial
    private composite: THREE.ShaderMaterial
    private rtScene: THREE.WebGLRenderTarget
    private rtA: THREE.WebGLRenderTarget
    private rtB: THREE.WebGLRenderTarget
    private rtC: THREE.WebGLRenderTarget
    private rtD: THREE.WebGLRenderTarget
    private blank: THREE.DataTexture
    private sdf: THREE.DataTexture | null = null
    private fieldKey = ""
    private fieldId = 0
    private fontRequests = new Set<string>()
    private worker: Worker | null = null
    private workerUrl: string | null = null
    private workerTried = false
    private fieldReady = false
    private compiled = false
    private readyFired = false
    private announced = false
    private running = false
    private warmFrames = 0

    private width = 1
    private height = 1
    private dpr = 1
    /** Resolution share the governor has settled on, and the cap above it. */
    private scale = 1
    private scaleCap = 1
    private scaleStart = 1
    private scaleFloor = 0.8
    /** Highest scale not yet found too slow; the governor never climbs back
     * past a level it had to leave, so the sharpness does not pump. */
    private ceiling = 1
    private frameMs = 16
    private frames = 0

    private frameId = 0
    private lastT = 0
    private clock = 0
    private disposed = false
    private visible = true
    private observer: IntersectionObserver | null = null
    private reducedMotion: MediaQueryList | null = null

    /** Where the rows are, in rows rolled, and how fast they are rolling.
     * The speed eases toward what Speed and Direction ask for, so a change —
     * a flip from In to Out included — glides through rather than snapping. */
    private flow = 0
    private vel = 0
    /** Track: where the turn is, how fast it is moving, and where the
     * pointer wants it — radians about the screen's y (x) and x (y). */
    private track = { x: 0, y: 0 }
    private trackVel = { x: 0, y: 0 }
    private trackTarget = { x: 0, y: 0 }
    /** The ring's outline boxed for framing (see frameRing): its centre and
     * size on the centre plane, in ring radii. */
    private fitCenter = { x: 0, y: 0 }
    private fitSize = { x: 3.4, y: 3.4 }
    private poseKey = ""

    private base = new THREE.Matrix3()
    private rot = new THREE.Matrix3()
    private rotInv = new THREE.Matrix3()
    private scratch = new THREE.Matrix4()
    private euler = new THREE.Euler()

    /** The entrance's progress, 0 → 1, read every frame. */
    entry: () => number = () => 1
    /** Set by the host so a static render can repaint once fonts land. */
    onRedraw: (() => void) | null = null
    /** Fired once the letters are built and every program is compiled — the
     * host holds the entrance until then. */
    onReady: (() => void) | null = null

    constructor(host: HTMLElement, mount: HTMLElement, cfg: Config) {
        this.host = host
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, premultipliedAlpha: true })
        this.dpr = Math.min(window.devicePixelRatio || 1, 2)
        this.renderer.setPixelRatio(this.dpr)
        // Transparent: Background is a CSS fill on the frame behind the canvas.
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.autoClear = true
        const canvas = this.renderer.domElement
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block"
        mount.appendChild(canvas)

        // Half float keeps the light inside the ring above 1.0 until the bloom
        // has seen it; without the extension it clips, and still looks right.
        const ext = this.renderer.extensions
        const floatOk = ext.has("EXT_color_buffer_float") || ext.has("EXT_color_buffer_half_float")
        const rtOpts = {
            type: floatOk ? THREE.HalfFloatType : THREE.UnsignedByteType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            depthBuffer: false,
            stencilBuffer: false,
        }
        this.rtScene = new THREE.WebGLRenderTarget(1, 1, rtOpts)
        this.rtA = new THREE.WebGLRenderTarget(1, 1, rtOpts)
        this.rtB = new THREE.WebGLRenderTarget(1, 1, rtOpts)
        this.rtC = new THREE.WebGLRenderTarget(1, 1, rtOpts)
        this.rtD = new THREE.WebGLRenderTarget(1, 1, rtOpts)

        this.blank = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
        this.blank.needsUpdate = true

        this.ring = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: RING_FRAGMENT,
            depthTest: false,
            depthWrite: false,
            uniforms: {
                uRes: { value: new THREE.Vector2(1, 1) },
                uCenter: { value: new THREE.Vector2(0, 0) },
                uUnitPx: { value: 100 },
                uCamDist: { value: CAMERA_DIST },
                uRot: { value: this.rot },
                uRotInv: { value: this.rotInv },
                uSdf: { value: this.blank },
                uTexSize: { value: new THREE.Vector2(1, 1) },
                uTube: { value: 0.72 },
                uDepth: { value: 0.16 },
                uRows: { value: DEFAULT_RING.rows },
                uWords: { value: DEFAULT_RING.repeats },
                uK: { value: 0.4 },
                uFlow: { value: 0 },
                uInk: { value: new THREE.Vector3() },
                uGlow: { value: new THREE.Vector3() },
                uHaze: { value: 0 },
            },
        })
        this.bright = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: BRIGHT_FRAGMENT,
            depthTest: false,
            depthWrite: false,
            uniforms: {
                uTex: { value: null },
                uTexel: { value: new THREE.Vector2() },
                uUvScale: { value: new THREE.Vector2(1, 1) },
                uThreshold: { value: BLOOM_THRESHOLD },
            },
        })
        this.blur = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: BLUR_FRAGMENT,
            depthTest: false,
            depthWrite: false,
            uniforms: { uTex: { value: null }, uStep: { value: new THREE.Vector2() } },
        })
        this.composite = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: COMPOSITE_FRAGMENT,
            depthTest: false,
            depthWrite: false,
            transparent: false,
            uniforms: {
                uScene: { value: this.rtScene.texture },
                uBloomA: { value: this.rtA.texture },
                uBloomB: { value: this.rtD.texture },
                uBloom: { value: 0 },
                uUvScale: { value: new THREE.Vector2(1, 1) },
                uSceneTexel: { value: new THREE.Vector2(1, 1) },
            },
        })
        this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.ring)
        this.quad.frustumCulled = false
        this.scene.add(this.quad)

        if (typeof window.matchMedia === "function") {
            this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
        }
        if (document.fonts) document.fonts.addEventListener("loadingdone", this.onFontsLoaded)

        this.applyConfig()
        // Starts at the speed it will run at; only later changes ease.
        this.vel = this.targetVel()
        void this.compileAll()
    }

    /* ---- config --------------------------------------------------------------- */

    private applyConfig() {
        const cfg = this.cfg
        this.requestField()
        const u = this.ring.uniforms
        const ink = linearRgb(cfg.textColor, DEFAULTS.textColor)
        const glow = linearRgb(cfg.lightColor, DEFAULTS.lightColor)
        ;(u.uInk.value as THREE.Vector3).set(ink[0], ink[1], ink[2])
        ;(u.uGlow.value as THREE.Vector3).set(glow[0], glow[1], glow[2])
        const th = clamp(cfg.ring.thickness, 0, 10, DEFAULT_RING.thickness) / 5
        const tube = th <= 1 ? TUBE_THIN + (TUBE_REF - TUBE_THIN) * th : TUBE_REF + (TUBE_FAT - TUBE_REF) * (th - 1)
        u.uTube.value = tube
        u.uDepth.value = tube * (DEPTH_MIN + DEPTH_STEP * clamp(cfg.depth, 0, 10, DEFAULTS.depth))
        u.uRows.value = Math.round(clamp(cfg.ring.rows, 4, 40, DEFAULT_RING.rows))
        u.uWords.value = Math.round(clamp(cfg.ring.repeats, 1, 8, DEFAULT_RING.repeats))
        u.uK.value = Math.sqrt((1 - tube) / (1 + tube))
        this.setPose(tube)
        const g = clamp(cfg.glow, 0, 10, DEFAULTS.glow)
        this.composite.uniforms.uBloom.value = g * BLOOM_UNIT
        // No word, no ring: nothing for the haze to well out of.
        u.uHaze.value = lineOf(cfg.text) ? g * HAZE_UNIT : 0
    }

    /** Rebuild the type field if the word, the face or the face's measured
     * shape changed. The coverage is drawn here (a few milliseconds); the
     * distance transform runs in the Worker, and the letters already on
     * screen stay until the new ones arrive, so typing never blanks it. */
    private requestField() {
        const key = maskKeyOf(this.cfg) + "|" + fontPrint(this.cfg)
        if (key === this.fieldKey) return
        this.fieldKey = key
        const id = ++this.fieldId
        const mask = buildMask(this.cfg)
        this.requestFont()
        if (!mask) {
            this.acceptField(id, null)
            return
        }
        const worker = this.getWorker()
        if (worker) {
            worker.postMessage({ id, a: mask.alpha, w: mask.width, h: mask.height, r: SDF_RANGE }, [mask.alpha.buffer])
        } else {
            const data = distanceField(mask.alpha, mask.width, mask.height, SDF_RANGE)
            this.acceptField(id, { data, width: mask.width, height: mask.height })
        }
    }

    private acceptField(id: number, field: Field | null) {
        if (this.disposed || id !== this.fieldId) return
        const u = this.ring.uniforms
        const old = this.sdf
        this.sdf = null
        if (field) {
            const tex = new THREE.DataTexture(field.data, field.width, field.height, THREE.RedFormat, THREE.HalfFloatType)
            tex.wrapS = THREE.RepeatWrapping
            tex.wrapT = THREE.RepeatWrapping
            tex.minFilter = THREE.LinearFilter
            tex.magFilter = THREE.LinearFilter
            tex.generateMipmaps = false
            tex.unpackAlignment = 1
            tex.needsUpdate = true
            this.sdf = tex
            u.uSdf.value = tex
            ;(u.uTexSize.value as THREE.Vector2).set(field.width, field.height)
        } else {
            // No word: a field that is all outside, so the ring is empty.
            u.uSdf.value = this.blank
            ;(u.uTexSize.value as THREE.Vector2).set(1, 1)
        }
        old?.dispose()
        this.fieldReady = true
        this.checkReady()
        this.onRedraw?.()
    }

    /** Start the Worker lazily, once. Anything that goes wrong — no Worker, a
     * blocked blob: URL, a strict CSP — lands on the synchronous path. */
    private getWorker(): Worker | null {
        if (this.workerTried) return this.worker
        this.workerTried = true
        if (typeof Worker === "undefined" || typeof URL === "undefined") return null
        try {
            this.workerUrl = URL.createObjectURL(new Blob([fieldWorkerSource()], { type: "text/javascript" }))
            const worker = new Worker(this.workerUrl)
            worker.onmessage = (e: MessageEvent<FieldReply>) => {
                const d = e.data
                this.acceptField(d.id, { data: d.out, width: d.w, height: d.h })
            }
            worker.onerror = () => {
                // A Worker that cannot run falls back to the main thread.
                this.worker?.terminate()
                this.worker = null
                this.fieldKey = ""
                this.requestField()
            }
            this.worker = worker
        } catch {
            this.worker = null
        }
        return this.worker
    }

    /** Ask for the face; when it lands, rebuild only if it measures
     * differently from what is drawn. */
    private requestFont() {
        if (!document.fonts) return
        const spec = fontSpec(this.cfg.font, 32)
        if (this.fontRequests.has(spec)) return
        this.fontRequests.add(spec)
        document.fonts.load(spec, lineOf(this.cfg.text) || "A").then(
            () => this.onFontsLoaded(),
            () => undefined
        )
    }

    private onFontsLoaded = () => {
        if (this.disposed) return
        this.requestField()
    }

    /* ---- ready ---------------------------------------------------------------- */

    /** Compile every program before anything is shown. Compiled on first use
     * instead, the raymarcher alone stalls a frame for a third of a second —
     * in the middle of the entrance, which then lurches to catch up. Uses
     * the browser's parallel compile where it has one. */
    private async compileAll() {
        const renderer = this.renderer as THREE.WebGLRenderer & {
            compileAsync?: (scene: THREE.Object3D, camera: THREE.Camera) => Promise<unknown>
        }
        for (const m of [this.ring, this.bright, this.blur, this.composite]) {
            if (this.disposed) return
            this.quad.material = m
            try {
                if (renderer.compileAsync) await renderer.compileAsync(this.scene, this.camera)
                else renderer.compile(this.scene, this.camera)
            } catch {
                /* compiled on first draw instead */
            }
        }
        this.compiled = true
        this.checkReady()
    }

    /** Once the letters and the programs are both in, start drawing unseen.
     * The first draw uploads the textures and finishes linking, and the GPU
     * takes a frame or two after it to settle; the entrance is announced only
     * after WARM_FRAMES more, so its opening frames are steady ones. */
    private checkReady() {
        if (this.readyFired || !this.fieldReady || !this.compiled || this.disposed) return
        this.readyFired = true
        this.draw()
        this.lastT = 0
        // No loop on the Framer canvas: nothing to wait for there.
        if (!this.running) this.announce()
    }

    private announce() {
        if (this.announced) return
        this.announced = true
        this.onReady?.()
    }

    get isReady(): boolean {
        return this.announced
    }

    /** Angle and Orientation as a world → ring frame — T, A, B right-handed,
     * A the axis, as matrix rows so M · p gives ring coordinates — then the
     * framing for it. */
    private setPose(tube: number) {
        const angle = clamp(this.cfg.angle, 0, 90, DEFAULTS.angle) * DEG
        const heading = clamp(this.cfg.orientation, -180, 180, DEFAULTS.orientation) * DEG
        const key = `${angle}|${heading}|${tube}`
        if (key === this.poseKey) return
        this.poseKey = key
        const A = new THREE.Vector3(Math.sin(angle) * Math.cos(heading), Math.sin(angle) * Math.sin(heading), Math.cos(angle))
        const helper = new THREE.Vector3(-Math.sin(heading), Math.cos(heading), 0)
        const T = new THREE.Vector3().crossVectors(A, helper).normalize()
        const B = new THREE.Vector3().crossVectors(T, A)
        this.base.set(T.x, T.y, T.z, A.x, A.y, A.z, B.x, B.y, B.z)
        this.frameRing(T, A, B, tube)
    }

    /** Box the ring's outline as the camera sees it: points over the whole
     * outer surface, turned into the world and projected onto the centre
     * plane. Taken at the pose only — not with the sway, the track or the
     * entrance on top — so the ring turns in place rather than being
     * re-centred under the pointer. */
    private frameRing(T: THREE.Vector3, A: THREE.Vector3, B: THREE.Vector3, tube: number) {
        let x0 = Infinity
        let x1 = -Infinity
        let y0 = Infinity
        let y1 = -Infinity
        for (let i = 0; i < FIT_RING_STEPS; i++) {
            const ph = (TAU * i) / FIT_RING_STEPS
            for (let j = 0; j < FIT_TUBE_STEPS; j++) {
                const th = (TAU * j) / FIT_TUBE_STEPS
                const rr = 1 + tube * Math.cos(th)
                const lx = rr * Math.cos(ph)
                const ly = tube * Math.sin(th)
                const lz = rr * Math.sin(ph)
                // World = Mᵀ · local, M's rows being T, A, B.
                const wx = T.x * lx + A.x * ly + B.x * lz
                const wy = T.y * lx + A.y * ly + B.y * lz
                const wz = T.z * lx + A.z * ly + B.z * lz
                const k = CAMERA_DIST / Math.max(0.05, CAMERA_DIST - wz)
                const sx = wx * k
                const sy = wy * k
                if (sx < x0) x0 = sx
                if (sx > x1) x1 = sx
                if (sy < y0) y0 = sy
                if (sy > y1) y1 = sy
            }
        }
        this.fitCenter = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }
        this.fitSize = { x: Math.max(0.1, x1 - x0), y: Math.max(0.1, y1 - y0) }
    }

    /* ---- size ----------------------------------------------------------------- */

    private resizeTargets() {
        const cw = Math.max(1, Math.round(this.width * this.dpr))
        const ch = Math.max(1, Math.round(this.height * this.dpr))
        // The scene target is sized once for the most the governor may ask
        // for, and each frame draws into a corner of it (draw). Changing
        // resolution is then a viewport, not a reallocation — reallocating
        // mid-motion is a hitch you can see in the roll.
        const sw = Math.max(1, Math.round(cw * this.scaleCap))
        const sh = Math.max(1, Math.round(ch * this.scaleCap))
        if (this.rtScene.width !== sw || this.rtScene.height !== sh) this.rtScene.setSize(sw, sh)
        const qw = Math.max(1, Math.round(cw / 4))
        const qh = Math.max(1, Math.round(ch / 4))
        this.rtA.setSize(qw, qh)
        this.rtB.setSize(qw, qh)
        const ew = Math.max(1, Math.round(cw / 8))
        const eh = Math.max(1, Math.round(ch / 8))
        this.rtC.setSize(ew, eh)
        this.rtD.setSize(ew, eh)
    }

    /* ---- frame ---------------------------------------------------------------- */

    private dirSign(): number {
        return this.cfg.direction === "out" ? -1 : 1
    }

    private pass(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
        this.quad.material = material
        this.renderer.setRenderTarget(target)
        this.renderer.render(this.scene, this.camera)
    }

    private draw() {
        const entry = Math.max(0, this.entry())
        const u = this.ring.uniforms
        const tw = this.rtScene.width
        const th = this.rtScene.height
        const sw = Math.max(1, Math.min(tw, Math.round(this.width * this.dpr * this.scale)))
        const sh = Math.max(1, Math.min(th, Math.round(this.height * this.dpr * this.scale)))
        this.rtScene.viewport.set(0, 0, sw, sh)
        const swell = ENTRY_SCALE + (1 - ENTRY_SCALE) * entry
        // Pixels per ring radius: the boxed outline fills FIT_SHARE of the
        // frame on its tighter axis, and its box sits in the middle.
        const unitPx = FIT_SHARE * Math.min(sw / this.fitSize.x, sh / this.fitSize.y) * swell
        ;(u.uRes.value as THREE.Vector2).set(sw, sh)
        ;(u.uCenter.value as THREE.Vector2).set(sw / 2 - this.fitCenter.x * unitPx, sh / 2 - this.fitCenter.y * unitPx)
        u.uUnitPx.value = unitPx

        // The pose, then the sway and the track on top of it, applied to the
        // ring in world space: ring-from-world = base · (sway · track)⁻¹.
        const swayAmp = clamp(this.cfg.sway, 0, 10, DEFAULTS.sway) * SWAY_UNIT
        const still = this.reducedMotion?.matches ? 0 : 1
        // The entrance swings the ring into its pose as it swells.
        const swing = 1 - entry
        const ax = swayAmp * still * Math.sin((TAU * this.clock) / SWAY_PERIOD_X) - this.track.y + ENTRY_TILT * swing
        const ay = swayAmp * still * Math.sin((TAU * this.clock) / SWAY_PERIOD_Y) + this.track.x + ENTRY_TURN * swing
        this.euler.set(ax, ay, 0, "YXZ")
        this.scratch.makeRotationFromEuler(this.euler).transpose()
        this.rot.setFromMatrix4(this.scratch).premultiply(this.base)
        this.rotInv.copy(this.rot).transpose()

        // The entrance rolls the rows in from a little behind where they run.
        const f = this.flow - (1 - entry) * ENTRY_ROLL * this.dirSign()
        // Rows are whole, so a row is a period of the field.
        u.uFlow.value = f - Math.floor(f)

        this.pass(this.ring, this.rtScene)

        const bloom = this.composite.uniforms.uBloom.value as number
        if (bloom > 0) {
            this.bright.uniforms.uTex.value = this.rtScene.texture
            ;(this.bright.uniforms.uTexel.value as THREE.Vector2).set(1 / tw, 1 / th)
            ;(this.bright.uniforms.uUvScale.value as THREE.Vector2).set(sw / tw, sh / th)
            this.pass(this.bright, this.rtA)
            const step = this.blur.uniforms.uStep.value as THREE.Vector2
            this.blur.uniforms.uTex.value = this.rtA.texture
            step.set(1 / this.rtA.width, 0)
            this.pass(this.blur, this.rtB)
            this.blur.uniforms.uTex.value = this.rtB.texture
            step.set(0, 1 / this.rtA.height)
            this.pass(this.blur, this.rtA)
            // Down a level for the wide halo.
            this.blur.uniforms.uTex.value = this.rtA.texture
            step.set(2 / this.rtA.width, 0)
            this.pass(this.blur, this.rtC)
            this.blur.uniforms.uTex.value = this.rtC.texture
            step.set(0, 1 / this.rtC.height)
            this.pass(this.blur, this.rtD)
        }
        ;(this.composite.uniforms.uUvScale.value as THREE.Vector2).set(sw / tw, sh / th)
        ;(this.composite.uniforms.uSceneTexel.value as THREE.Vector2).set(1 / tw, 1 / th)
        this.pass(this.composite, null)
    }

    private targetVel(): number {
        const still = this.reducedMotion?.matches ? 0 : 1
        return this.dirSign() * clamp(this.cfg.speed, 0, 10, DEFAULTS.speed) * SPEED_UNIT * still
    }

    private advance(dt: number) {
        const still = this.reducedMotion?.matches ? 0 : 1
        this.clock += dt * still
        this.vel += (this.targetVel() - this.vel) * (1 - Math.exp(-ROLL_EASE * dt))
        this.flow += this.vel * dt
        // Keep the clock small; only its fraction is ever drawn.
        if (Math.abs(this.flow) > 1e4) this.flow -= Math.trunc(this.flow)
        this.stepTrack(dt)
    }

    /** Hold the frame time near 60 fps by trading resolution for it. */
    private govern(ms: number) {
        this.frameMs += (ms - this.frameMs) * 0.1
        if (++this.frames < 20) return
        this.frames = 0
        // Small steps: a viewport change costs nothing, and a gentle one is
        // not seen as the type sharpening and softening.
        if (this.frameMs > SLOW_MS) {
            this.ceiling = Math.max(this.scaleFloor, this.scale * 0.98)
            this.scale = Math.max(this.scaleFloor, this.scale * 0.92)
        } else if (this.frameMs < FAST_MS) this.scale = Math.min(this.ceiling, this.scale * 1.04)
    }

    /* ---- pointer: track it ---------------------------------------------------- */

    /** The turn follows the pointer on a critically damped spring: it eases
     * in, glides, and settles on the target without overshooting or
     * wobbling, at any frame rate (long frames are split into short steps). */
    private stepTrack(dt: number) {
        const smooth = clamp(this.cfg.pointer.smoothing, 0, 10, DEFAULT_POINTER.smoothing) / 10
        const w = TRACK_OMEGA_FAST + (TRACK_OMEGA_SLOW - TRACK_OMEGA_FAST) * smooth
        const steps = Math.max(1, Math.ceil((w * dt) / TRACK_MAX_STEP))
        const h = dt / steps
        for (let i = 0; i < steps; i++) {
            for (const axis of ["x", "y"] as const) {
                const a = w * w * (this.trackTarget[axis] - this.track[axis]) - 2 * w * this.trackVel[axis]
                this.trackVel[axis] += a * h
                this.track[axis] += this.trackVel[axis] * h
            }
        }
    }

    /** Anywhere in the window, measured from the component's own centre: a
     * pointer at the window's edge is a full turn, so the ring keeps
     * watching it across the whole page, not only while hovered. */
    private onPointerMove = (event: PointerEvent) => {
        if (!this.cfg.pointer.track) return
        const rect = this.host.getBoundingClientRect()
        const halfW = Math.max(1, window.innerWidth / 2)
        const halfH = Math.max(1, window.innerHeight / 2)
        const nx = (event.clientX - (rect.left + rect.width / 2)) / halfW
        const ny = ((rect.top + rect.height / 2) - event.clientY) / halfH
        const amt = clamp(this.cfg.pointer.strength, 0, 10, DEFAULT_POINTER.strength) * TRACK_UNIT
        this.trackTarget.x = Math.max(-1, Math.min(1, nx)) * amt
        this.trackTarget.y = Math.max(-1, Math.min(1, ny)) * amt
    }

    /** The pointer left the window: glide back to the pose. */
    private onPointerOut = (event: MouseEvent) => {
        if (event.relatedTarget) return
        this.trackTarget.x = 0
        this.trackTarget.y = 0
    }

    private recentre = () => {
        this.trackTarget.x = 0
        this.trackTarget.y = 0
    }

    private attach() {
        window.addEventListener("pointermove", this.onPointerMove, { passive: true })
        document.addEventListener("mouseout", this.onPointerOut)
        window.addEventListener("blur", this.recentre)
        if (typeof IntersectionObserver !== "undefined") {
            this.observer = new IntersectionObserver((entries) => {
                this.visible = entries.some((e) => e.isIntersecting)
            })
            this.observer.observe(this.host)
        }
    }

    private detach() {
        window.removeEventListener("pointermove", this.onPointerMove)
        document.removeEventListener("mouseout", this.onPointerOut)
        window.removeEventListener("blur", this.recentre)
        this.observer?.disconnect()
        this.observer = null
    }

    /* ---- host ----------------------------------------------------------------- */

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)
        const devicePx = this.width * this.height * this.dpr * this.dpr
        // Scale is pixels drawn per canvas pixel, and the canvas is already
        // in device pixels: a 2x panel is dense enough at 1, a 1x panel
        // climbs toward SUPERSAMPLE.
        const want = this.dpr < 1.5 ? SUPERSAMPLE : 1
        const budget = Math.sqrt(TARGET_PIXELS / devicePx)
        // Native density on a 1x screen; on a 2x one, half of it to start
        // (CSS resolution) — the governor climbs from there if it can.
        this.scaleStart = Math.min(1 / this.dpr, budget, want)
        this.scaleFloor = Math.min(this.scaleStart, (1 / this.dpr) * MIN_SHARE)
        this.scaleCap = Math.max(this.scaleStart, Math.min(want, budget))
        this.ceiling = this.scaleCap
        if (this.scale <= 0 || this.scale > this.scaleCap) this.scale = this.scaleStart
        this.resizeTargets()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        this.applyConfig()
        if (!cfg.pointer.track) this.recentre()
    }

    /** One frame for the Framer canvas, at rest. */
    renderStatic() {
        if (this.disposed) return
        if (!this.readyFired) return
        this.flow = STATIC_FLOW
        this.scale = this.scaleCap
        this.draw()
    }

    start() {
        this.running = true
        this.attach()
        this.scale = this.scaleStart
        this.resizeTargets()
        this.lastT = 0
        // Timed off each frame's own timestamp rather than the moment the
        // callback happens to run: that one is vsync-aligned, so the roll
        // advances by exactly the time each frame will be on screen.
        const loop = (now: number) => {
            if (this.disposed) return
            this.frameId = requestAnimationFrame(loop)
            const ms = this.lastT ? now - this.lastT : 0
            this.lastT = now
            // Nothing is shown until the letters and programs are in.
            if (!this.visible || !this.readyFired) return
            let dt = ms / 1000
            if (!isFinite(dt) || dt < 0) dt = 0
            // A tab back from the background must not jump the roll.
            if (dt > 0.05) dt = 0.05
            this.advance(dt)
            this.draw()
            if (!this.announced && ++this.warmFrames >= WARM_FRAMES) this.announce()
            if (ms > 0 && ms < 200) this.govern(ms)
        }
        this.frameId = requestAnimationFrame(loop)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.detach()
        if (document.fonts) document.fonts.removeEventListener("loadingdone", this.onFontsLoaded)
        this.quad.geometry.dispose()
        ;[this.ring, this.bright, this.blur, this.composite].forEach((m) => m.dispose())
        ;[this.rtScene, this.rtA, this.rtB, this.rtC, this.rtD].forEach((rt) => rt.dispose())
        this.worker?.terminate()
        if (this.workerUrl) URL.revokeObjectURL(this.workerUrl)
        this.sdf?.dispose()
        this.blank.dispose()
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
 * @framerIntrinsicHeight 960
 * @framerDisableUnlink
 */
export default function JadeBagel(props: Partial<JadeBagelProps>) {
    const {
        text = DEFAULTS.text,
        background = DEFAULTS.background,
        font = {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Inter, \"Arial Black\", \"Helvetica Neue\", Arial, sans-serif","fontWeight":900,"lineHeight":"1.5em","letterSpacing":"0em"},
        textColor = DEFAULTS.textColor,
        ring = DEFAULTS.ring,
        depth = DEFAULTS.depth,
        lightColor = DEFAULTS.lightColor,
        glow = DEFAULTS.glow,
        angle = DEFAULTS.angle,
        orientation = DEFAULTS.orientation,
        pointer = DEFAULTS.pointer,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction,
        sway = DEFAULTS.sway,
        transition = {"ease":[0.22,1,0.36,1],"mass":1,"type":"tween","damping":60,"duration":2.4,"stiffness":800},
        style,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const mountRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<BagelScene | null>(null)
    // 0 on the server and on first paint alike, so nothing mismatches.
    const entry: MotionValue<number> = useMotionValue(0)
    // The canvas has faded in by a third of the way through; the swell, the
    // swing and the roll carry on settling after it. It starts at 0.002, not
    // 0: the browser skips compositing a fully transparent layer, and the
    // first composite of a large WebGL canvas is a ~130 ms stall — which,
    // from 0, landed in the opening frames of the entrance. Invisible either
    // way; this way the cost is paid during the warm-up.
    const fade = useTransform(entry, [0, 0.35], [0.002, 1])
    const inView = useInView(hostRef, { once: true, amount: 0.2 })
    // The letters are built and the programs compiled. The entrance waits for
    // it: started earlier, its first frames land on those stalls and it
    // lurches to catch up.
    const [ready, setReady] = useState(false)

    // Rebuilt per render and read by the scene, so a slider drag lands on the
    // next frame without the renderer ever being torn down.
    const cfg: Config = {
        text,
        font: { ...DEFAULT_FONT, ...font },
        textColor,
        ring: { ...DEFAULT_RING, ...ring },
        angle,
        orientation,
        depth,
        lightColor,
        glow,
        pointer: { ...DEFAULT_POINTER, ...pointer },
        speed,
        direction,
        sway,
    }
    const cfgRef = useRef<Config>(cfg)
    cfgRef.current = cfg
    const cfgKey = JSON.stringify(cfg)
    const transitionKey = JSON.stringify(transition ?? null)

    /* ---- the entrance: declared before the renderer so a static paint sees 1 */

    useEffect(() => {
        const reduced =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        if (isStatic() || reduced) {
            entry.set(1)
            sceneRef.current?.renderStatic()
            return
        }
        if (!inView || !ready) {
            entry.set(0)
            return
        }
        // Replays whenever the curve changes, so it can be judged by editing it.
        entry.set(0)
        // The panel hands back the general Transition shape; for one number it
        // is exactly the single-value options animate() takes.
        const controls = animate(entry, 1, transition as ValueAnimationTransition<number>)
        return () => controls.stop()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView, ready, transitionKey])

    /* ---- the renderer, built once ---- */

    useEffect(() => {
        const host = hostRef.current
        const mount = mountRef.current
        if (!host || !mount) return
        let scene: BagelScene
        try {
            scene = new BagelScene(host, mount, cfgRef.current)
        } catch {
            // No WebGL — an empty ground rather than a thrown render.
            return
        }
        sceneRef.current = scene
        scene.entry = () => entry.get()
        scene.setSize(host.clientWidth, host.clientHeight)

        const still = isStatic()
        scene.onReady = () => {
            setReady(true)
            if (still) scene.renderStatic()
        }
        // Without parallel compile and a Worker it can be ready already.
        if (scene.isReady) setReady(true)
        if (still) {
            scene.onRedraw = () => scene.renderStatic()
            scene.renderStatic()
        } else {
            scene.start()
        }

        const ro = new ResizeObserver(() => {
            scene.setSize(host.clientWidth, host.clientHeight)
            if (still) scene.renderStatic()
        })
        ro.observe(host)
        return () => {
            ro.disconnect()
            scene.dispose()
            sceneRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const scene = sceneRef.current
        if (!scene) return
        scene.updateConfig(cfgRef.current)
        if (isStatic()) scene.renderStatic()
    }, [cfgKey])

    return (
        <div
            ref={hostRef}
            role="img"
            aria-label={lineOf(text) ? `A glowing ring of the word ${lineOf(text)}` : "A glowing ring"}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                backgroundColor: background,
                userSelect: "none",
                ...style,
            }}
        >
            <motion.div ref={mountRef} style={{ position: "absolute", inset: 0, opacity: fade }} />
        </div>
    )
}

JadeBagel.displayName = "Jade Bagel"
JadeBagel.defaultProps = { ...DEFAULTS }

/* ---------------------------------------------------------------- controls -- */
