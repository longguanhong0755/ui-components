"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"
import { animate, motion, useInView, useMotionValue } from "motion/react"
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
 * Auger Tape — a tapering corkscrew of ruled tape, a line of heavy capitals
 * running down it like grain down an auger.
 *
 * Built after a reference animation supplied as ten still frames (720 × 720):
 * a black ribbon spiralling down a black ground, "PLZ WASH YOUR HANDS" in white
 * capitals on its outside, a thin white ruling of lines and ticks over it, and
 * the inside of each coil showing through the gaps as pale grey with the type
 * mirrored in black. There was no source to transcribe, so everything here was
 * MEASURED off those frames (column and row scans, a cross-correlation for the
 * motion, and a least-squares fit of the coil model to ~75 edge points; worst
 * residual ~8 px of 720; only the arch of the top rules at each front's very
 * centre is beyond the model, by ~6 px). The name is ours.
 *
 * WHAT THE FRAMES SAY, AND WHAT IS TRANSCRIBED
 *
 *   The ribbon never moves.  Silhouettes, back strips and coil ends sit on the
 *       same pixels in all ten frames. Only the surface flows: the type steps
 *       25° of a turn left per frame on every coil, and the ruling ticks step
 *       the same 25° (they first look like +13° — that is 38° tick spacing
 *       aliasing). So text and ruling are one surface sliding along a fixed
 *       ribbon: a conveyor, not a spin.
 *   One phrase per turn, mapped by ANGLE.  Every coil shows the same letters at
 *       the same angles though the coils differ in size, so the type is laid on
 *       by angle, not arc length; lower, narrower coils simply carry it
 *       condensed. One repeat fills a turn (the front half shows ~10 of the
 *       phrase's 20 characters). See `repsFor`.
 *   Level fronts, falling backs.  Each coil's front is level (its top rule sits
 *       on the same row ±1 px from one end to the other), so the pitch is not
 *       spent evenly round the turn. Fitted: 12% of it drops in a fold round the
 *       left silhouette (FOLD_*), the rest is spent across the back, so every
 *       back strip is a near-straight diagonal from the foot of one coil's left
 *       end to the next coil's right end, arriving from above and tucked behind
 *       that coil (GLIDE_LINEAR).
 *   A funnel.  Coil half-widths 220, 206, 188, 162, 123 px top to bottom and
 *       spacings 171, 155, 147, 141: radius r(u) = R·(1 − 0.034u − 0.019u²) and
 *       pitch 1 − 0.052u per reference turn u (RADIUS_*, PITCH_TAPER). Top
 *       radius is 1.29 pitches (Coil Width 5).
 *   The far side is smaller.  Type on the inside of a back strip is 0.68 the
 *       size of type on a front, across and along; the middle of each front is
 *       ~7% taller than the band 150 px out to either side. That is depth
 *       scaling, but it is centred on each coil's own centre line — a real close
 *       camera would bow every coil by a different amount, and the frames bow
 *       them all much alike. So it is applied per coil (DEPTH_SCALE), with an
 *       orthographic camera ~2.3° below (ELEVATION). Together they give the
 *       measured edges: top rules arching ~10 px, bottom rules barely.
 *   The tape.  Five rules split the lettered band into quarters (0.34 of a
 *       pitch tall at the silhouettes). Ten ticks a turn cross it and overhang
 *       it by 0.057 of a pitch each side — and the ribbon itself runs out to
 *       the tick ends, black and opaque: that margin is the black gap between
 *       each back strip and the coil below it. Capitals are 0.76 of the ruled
 *       band, centred.
 *   Light.  Outside: type at full white facing you, ~0.75 at the left end and
 *       ~0.65 at the right (OUT_*). Inside: grey rising from 0.5 at the left
 *       end of a back strip to 0.92 at the right (IN_*). Fixed in code.
 *   Placement.  First coil's band centred at 8.9% of the frame height, fifth at
 *       92.7% (TOP_SHARE, BOTTOM_SHARE) — so the last coil is cut by the frame.
 *
 * WHERE IT DEVIATES, AND WHY
 *
 *   The ruling is drawn procedurally in the shader with screen-space widths, not
 *   baked into the type texture: a baked hairline either vanishes or turns into
 *   a stripe as the coils taper and as the tape turns edge-on at the ends.
 *   The number of repeats per turn is chosen from the type's own proportions
 *   (one for the reference phrase), so a short word is not stretched round a
 *   whole coil.
 *   Speed is our choice: the frames give 25° per frame but not the frame rate.
 *
 * The Transition plays the entrance — the canvas fading up while the tape winds
 * a third of a turn into place — on a framer-motion value the renderer reads
 * every frame. The running flow is a hand-rolled clock; Speed drives that.
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
 * The view, the coil's shape and the light are the look, not knobs. World units
 * are pitches of the top coil.
 */

const TAU = Math.PI * 2
const HALF_PI = Math.PI / 2

/** How far below the coils the view sits, as fitted. */
const ELEVATION = 0.0407
/** Depth scaling about each coil's own centre line: a point at angle θ is drawn
 * DEPTH_SCALE / (DEPTH_SCALE − cos θ) times its size — 1 at the silhouettes,
 * 1.24 at the front, 0.84 at the back, so the back reads at the measured 0.68
 * of the front. */
const DEPTH_SCALE = 5.25
const CAMERA_DIST = 60

/** Where the first and last coil bands sit, as a share of the frame height from
 * the top. The reference: 64 px and 668 px of 720. */
const TOP_SHARE = 0.089
const BOTTOM_SHARE = 0.927

/** The funnel was measured over four turns (five coils). Tapers are written in
 * those reference turns, and stretched over however many coils are shown, so
 * Coils changes how tightly it is wound, not how much it narrows. */
const REF_SPAN = 4
const RADIUS_LIN = 0.034
const RADIUS_QUAD = 0.019
const PITCH_TAPER = 0.052
/** The funnel stops narrowing at this share of the top radius. At the
 * reference taper the last coil is 0.56 and the off-frame turn below it 0.36,
 * so this only bites at high Taper, where it settles the spiral into a narrow
 * tail instead of a needle. */
const RADIUS_FLOOR = 0.3

/** Share of each turn's drop spent folding round the left silhouette, and the
 * half-width of that fold in radians. The rest falls across the back. */
const FOLD_DROP = 0.12
const FOLD_HALF = 0.21
/** Share of the glide that runs linearly in angle rather than on a cosine. Pure
 * cosine arrives level, and seen from below its inside then bows out under the
 * next coil's foot as a pale sliver the frames do not have; with this much
 * slope the strip comes in from above, tucked behind the coil. Best fit of
 * 0, 0.3 and 0.6. */
const GLIDE_LINEAR = 0.6

/** Coil Width 0 → 10 maps the top radius across this range of pitches. 1.29 —
 * Coil Width 5 — is the reference. */
const WIDTH_MIN = 0.4
const WIDTH_STEP = 0.178
/** The top coil never takes more than this share of the frame's width per side;
 * on a narrow frame the radius gives way so the coils still fill the height. */
const FIT_HALF_WIDTH = 0.47

/** Band Height 0 → 10 maps the ruled band across this range of pitches (at the
 * silhouettes; fronts draw it 1.24× taller); 0.34 — Band Height 5 — is the
 * reference. The ribbon runs MARGIN past it each side. */
const GRID_MIN = 0.1
const GRID_STEP = 0.048
const MARGIN = 0.057

/** Samples per turn. The fold is ~0.4 rad wide, so it gets a dozen and more. */
const SEGMENTS_PER_TURN = 256

/** Texture rows for the whole ribbon, margins included. */
const TEX_H = 256
/** WebGL guarantees 4096; a long phrase is drawn narrower rather than clipped
 * — it is stretched round the coil by angle anyway. */
const MAX_TEX_W = 4096
/** Capital height as a share of the ruled band. */
const CAP_SHARE = 0.76

/** The ruling: rules quarter the band, ticks cross it ten times a turn. Widths
 * are in device pixels so they stay hairlines on every coil. */
const RULES = 4
const TICKS_PER_TURN = 10
const LINE_PX = 1.25
const GRID_ALPHA = 0.8

/** Outside: brightness = AMBIENT + KEY · n·L, a light just left of the view. */
const OUT_AMBIENT = 0.55
const OUT_KEY = 0.45
const OUT_LIGHT = new THREE.Vector3(-0.12, 0, 1).normalize()
/** Inside: lit from the left, so a back strip brightens toward its right end. */
const IN_AMBIENT = 0.5
const IN_KEY = 0.42
const IN_LIGHT = new THREE.Vector3(-1, 0, 0.5).normalize()

/** Speed 1 is this many turns a second; 5 runs the phrase past in ~7 s. */
const SPEED_UNIT = 0.03
/** How fast a fling from a drag dies away, per second. */
const FLING_DECAY = 3
/** Scroll Sens. 1 winds this many turns per pixel scrolled; the wind is eased in
 * at SCROLL_EASE per second so a wheel's steps arrive as one glide. */
const SCROLL_UNIT = 0.0001
const SCROLL_EASE = 8
/** The entrance winds the tape this far into place while the canvas fades up. */
const ENTRY_WIND = 0.35

/* ------------------------------------------------------------------- types -- */

type Direction = "left" | "right"

export interface AugerTapeProps {
    /** One repeat of the type. It runs down the tape end to end. */
    text: string
    background: string
    /** Family, weight, style and letter spacing. Size is fixed to the band. */
    font: CSSProperties
    /** The type and ruling on the outside, and the inside's pale face. */
    textColor: string
    /** How many coils span the frame, top to bottom. */
    coils: number
    /** How sharply the spiral narrows toward the bottom. 0 is a straight coil. */
    taper: number
    /** How wide the top coil is against its pitch. */
    coilWidth: number
    /** How tall the tape is against the gap between coils. */
    bandHeight: number
    /** The tape's outside, and the type seen on its inside. */
    bandColor: string
    /** The rules and ticks over the tape. */
    grid: boolean
    /** Drag sideways to wind the tape along by hand. */
    drag: boolean
    /** How fast the type runs. 0 holds it. */
    speed: number
    /** Which way the type runs across the coil fronts. Left runs it downhill. */
    direction: Direction
    /** How far scrolling the page winds the tape on. 0 ignores the scroll. */
    scrollSens: number
    /** Plays the entrance: the canvas fades up as the tape winds into place. */
    transition: Transition
    style?: CSSProperties
}

/* ---------------------------------------------------------------- defaults -- */

const DEFAULT_FONT: CSSProperties = {
    fontFamily: `Inter, "Arial Black", "Helvetica Neue", Arial, sans-serif`,
    fontWeight: 900,
}

const DEFAULT_TRANSITION: Transition = {
    type: "tween",
    duration: 1.6,
    // Expo-out: the tape is nearly home in the first half and settles from there.
    ease: [0.16, 1, 0.3, 1],
}

const DEFAULTS = {
    text: "PLZ WASH YOUR HANDS",
    background: "#000000",
    font: {
        defaultValue: {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Inter, \"Arial Black\", \"Helvetica Neue\", Arial, sans-serif","fontWeight":900,"lineHeight":"1.5em","letterSpacing":"0em"},"fontFamily":"Inter, \"Arial Black\", \"Helvetica Neue\", Arial, sans-serif","variant":"Regular","fontWeight":900,"fontSize":"16px","lineHeight":"1.5em","letterSpacing":"0em","textAlign":"left"},
    textColor: "#FFFFFF",
    coils: 5,
    taper: 6.8,
    coilWidth: 6.7,
    bandHeight: 6.1,
    bandColor: "#000000",
    grid: true,
    drag: true,
    speed: 5,
    direction: "left",
    scrollSens: 0,
    transition: {
        defaultValue: {"ease":[0.16,1,0.3,1],"mass":1,"type":"tween","damping":60,"duration":1.6,"stiffness":800},"type":"tween","stiffness":800,"damping":60,"mass":1,"duration":1.6,"ease":[0.16,1,0.3,1]},
}

type Config = {
    text: string
    font: CSSProperties
    textColor: string
    coils: number
    taper: number
    coilWidth: number
    bandHeight: number
    bandColor: string
    grid: boolean
    drag: boolean
    speed: number
    direction: Direction
    scrollSens: number
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

function fontStringFor(font: CSSProperties, px: number): string {
    const family = font.fontFamily || (DEFAULT_FONT.fontFamily as string)
    const style = font.fontStyle === "italic" ? "italic" : "normal"
    const weight = String(font.fontWeight ?? DEFAULT_FONT.fontWeight)
    return `${style} ${weight} ${px}px ${family}`
}

/** The type as one line: the tape is a single track. */
function lineOf(text: string): string {
    return String(text ?? "").replace(/\s+/g, " ").trim()
}

/** The ruled band and the whole ribbon, in pitches. */
function bandOf(cfg: Config): { grid: number; band: number } {
    const grid = GRID_MIN + GRID_STEP * clamp(cfg.bandHeight, 0, 10, DEFAULTS.bandHeight)
    return { grid, band: grid + 2 * MARGIN }
}

/** What the type canvas is keyed on, so a recolour is not a redraw. */
function stripKeyOf(cfg: Config): string {
    const f = cfg.font
    return [lineOf(cfg.text), f.fontFamily, f.fontWeight, f.fontStyle, f.letterSpacing, cfg.bandHeight].join("|")
}

type Strip = { canvas: HTMLCanvasElement; aspect: number }

/**
 * One repeat of the type as a coverage mask, white on black, exactly one repeat
 * wide so it tiles round the coil. Rows span the whole ribbon, margins and all;
 * capitals are centred in the ruled band. `aspect` is the repeat's natural
 * length in ribbon heights.
 */
function drawStrip(cfg: Config): Strip {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const text = lineOf(cfg.text)
    const { grid, band } = bandOf(cfg)
    if (!ctx || !text) {
        canvas.width = 4
        canvas.height = 4
        if (ctx) {
            ctx.fillStyle = "#000"
            ctx.fillRect(0, 0, 4, 4)
        }
        return { canvas, aspect: 1 }
    }

    const capPx = CAP_SHARE * TEX_H * (grid / band)
    const setFont = (px: number) => {
        ctx.font = fontStringFor(cfg.font, px)
        const spacing = cfg.font.letterSpacing
        const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
        if (spacing !== undefined && spacing !== null && "letterSpacing" in c) {
            try {
                c.letterSpacing = typeof spacing === "number" ? `${spacing}px` : String(spacing)
            } catch {
                /* an unparseable value leaves the default */
            }
        }
    }

    // Size the face by its capitals, whatever the family's em proportions.
    setFont(100)
    const capRatio = (ctx.measureText("H").actualBoundingBoxAscent || 72) / 100
    const fontPx = capPx / capRatio
    setFont(fontPx)
    const space = ctx.measureText(" ").width
    const unitW = ctx.measureText(text + " ").width
    canvas.width = Math.max(4, Math.min(MAX_TEX_W, Math.ceil(unitW)))
    canvas.height = TEX_H
    // Resizing resets the context, so the font is set again after it.
    setFont(fontPx)
    ctx.setTransform(canvas.width / unitW, 0, 0, 1, 0, 0)
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, unitW, TEX_H)
    ctx.fillStyle = "#FFF"
    ctx.textBaseline = "alphabetic"
    // Half a space each side, so the seam falls in the middle of a word gap.
    ctx.fillText(text, space / 2, TEX_H / 2 + capPx / 2)
    return { canvas, aspect: unitW / TEX_H }
}

/* ---------------------------------------------------------------- geometry --
 * θ runs along the tape. θ = 0 is the front of the top coil; θ grows leftward
 * across each front, so x = −r sin θ, z = r cos θ (toward the viewer). Turn k
 * spans θ ∈ [2πk − π/2, 2πk + 3π/2): right silhouette, front, left silhouette,
 * back, and round to the next coil's right silhouette.
 */

type Shape = { coils: number; taper: number; radius: number; band: number }

/** How far through its drop a turn is at local angle tp: level across the front,
 * a short fold round the left silhouette, then a cosine glide across the back
 * that arrives level at the next coil. C¹ everywhere. */
function turnEase(tp: number): number {
    const ph = tp - HALF_PI
    const a = Math.max(0, Math.min(1, (ph + FOLD_HALF) / (2 * FOLD_HALF)))
    const fold = a * a * (3 - 2 * a)
    const glide = ph > 0 ? (1 - GLIDE_LINEAR) * ((1 - Math.cos(ph)) / 2) + GLIDE_LINEAR * (ph / Math.PI) : 0
    return FOLD_DROP * fold + (1 - FOLD_DROP) * glide
}

/** θ → u, the coil index with each turn's drop eased in. Fronts sit on integers. */
function turnOf(theta: number): number {
    const k = Math.floor((theta + HALF_PI) / TAU)
    return k + turnEase(theta - TAU * k)
}

/** Radius and centre-line height at turn coordinate u. */
function coilAt(shape: Shape, u: number): { r: number; y: number } {
    const per = REF_SPAN / Math.max(1, shape.coils - 1)
    const ref = u * per
    const t = shape.taper
    const r = shape.radius * Math.max(RADIUS_FLOOR, 1 - t * (RADIUS_LIN * ref + RADIUS_QUAD * ref * ref))
    // Pitch 1 − c·u, integrated: positive for every turn the ribbon has.
    const c = t * PITCH_TAPER * per
    return { r, y: -(u - (c * u * u) / 2) }
}

/** How much bigger a point at angle θ is drawn than at the silhouettes. */
function depthScale(cosTheta: number): number {
    return DEPTH_SCALE / (DEPTH_SCALE - cosTheta)
}

/** The widest a coil draws, as a share of its radius: just ahead of the
 * silhouettes, where depth scaling outgrows the turn away (cos θ = 1/DEPTH_SCALE). */
const WIDEST = DEPTH_SCALE / Math.sqrt(DEPTH_SCALE * DEPTH_SCALE - 1)

/** Where coil k's front band centre lands on the view's vertical axis. */
function viewYOf(shape: Shape, u: number): number {
    const { r, y } = coilAt(shape, u)
    return y * Math.cos(ELEVATION) + depthScale(1) * r * Math.sin(ELEVATION)
}

/** The tape: one strip from the top coil's right silhouette — edge-on, so the
 * cut cannot be seen — to the right silhouette one turn past the last coil. */
function buildRibbon(shape: Shape): THREE.BufferGeometry {
    const segs = SEGMENTS_PER_TURN * shape.coils
    const verts = (segs + 1) * 2
    const position = new Float32Array(verts * 3)
    const normal = new Float32Array(verts * 3)
    const aTheta = new Float32Array(verts)
    const aV = new Float32Array(verts)
    const half = shape.band / 2
    for (let i = 0; i <= segs; i++) {
        const theta = -HALF_PI + (TAU * shape.coils * i) / segs
        const { r, y } = coilAt(shape, turnOf(theta))
        const s = Math.sin(theta)
        const c = Math.cos(theta)
        // Scaled about the coil's own centre line, so the ribbon is bigger
        // where it faces you and smaller across the back.
        const d = depthScale(c)
        for (let side = 0; side < 2; side++) {
            const k = i * 2 + side
            position.set([-r * s * d, y + (side ? half : -half) * d, r * c * d], k * 3)
            normal.set([-s, 0, c], k * 3)
            aTheta[k] = theta
            aV[k] = side
        }
    }
    // Wound so the outside is the front face: seen from outside, θ runs right
    // to left, and (bottom i, top i, bottom i+1) turns anticlockwise.
    const index: number[] = []
    for (let i = 0; i < segs; i++) {
        const b0 = i * 2
        const t0 = b0 + 1
        const b1 = b0 + 2
        const t1 = b0 + 3
        index.push(b0, t0, b1, t0, t1, b1)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3))
    geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3))
    geometry.setAttribute("aTheta", new THREE.BufferAttribute(aTheta, 1))
    geometry.setAttribute("aV", new THREE.BufferAttribute(aV, 1))
    geometry.setIndex(index)
    return geometry
}

type Fit = { shape: Shape; scale: number; top: number }

/** Fit the coils to the frame: first and last band at TOP_SHARE and
 * BOTTOM_SHARE of its height, the top coil narrowed only if the width is short. */
function fitShape(cfg: Config, width: number, height: number): Fit {
    const coils = Math.round(clamp(cfg.coils, 2, 10, DEFAULTS.coils))
    const taper = clamp(cfg.taper, 0, 10, DEFAULTS.taper) / 5
    const { band } = bandOf(cfg)
    const radius = WIDTH_MIN + WIDTH_STEP * clamp(cfg.coilWidth, 0, 10, DEFAULTS.coilWidth)
    const scaleOf = (s: Shape) =>
        ((BOTTOM_SHARE - TOP_SHARE) * height) / Math.max(1e-3, viewYOf(s, 0) - viewYOf(s, coils - 1))
    let shape: Shape = { coils, taper, radius, band }
    let scale = scaleOf(shape)
    const maxR = (FIT_HALF_WIDTH * width) / scale / WIDEST
    if (radius > maxR) {
        shape = { ...shape, radius: maxR }
        scale = scaleOf(shape)
    }
    return { shape, scale, top: viewYOf(shape, 0) + (TOP_SHARE * height) / scale }
}

/** Whole repeats per turn, so the phrase meets itself at the seam: as many as
 * fit at the type's own proportions round the middle coil, and at least one. */
function repsFor(shape: Shape, aspect: number): number {
    const { r } = coilAt(shape, (shape.coils - 1) / 2)
    return Math.max(1, Math.round((TAU * r) / (aspect * shape.band)))
}

/* ----------------------------------------------------------------- shaders -- */

const vec3Of = (v: THREE.Vector3) => `vec3(${v.x.toFixed(5)}, ${v.y.toFixed(5)}, ${v.z.toFixed(5)})`

const TAPE_VERTEX = /* glsl */ `
attribute float aTheta;
attribute float aV;
varying float vTheta;
varying float vV;
varying vec3 vN;
void main() {
    vTheta = aTheta;
    vV = aV;
    vN = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const TAPE_FRAGMENT = /* glsl */ `
uniform sampler2D uTex;
uniform float uReps;
uniform float uFlow;
uniform float uMargin;
uniform float uGrid;
uniform float uLine;
uniform vec3 uInk;
uniform vec3 uBand;
varying float vTheta;
varying float vV;
varying vec3 vN;

const float TAU = 6.28318530718;

// Coverage of lines at every multiple of spacing, uLine device pixels wide.
float lines(float coord, float spacing) {
    float w = max(fwidth(coord), 1e-6);
    float d = abs(fract(coord / spacing + 0.5) - 0.5) * spacing;
    return clamp(uLine * 0.5 + 0.5 - d / w, 0.0, 1.0);
}

void main() {
    // Turns along the tape, moving with the flow; the type and the ticks both
    // ride on it, as in the reference.
    float turns = uFlow - vTheta / TAU;
    float type = texture2D(uTex, vec2(turns * uReps, vV)).r;

    float gv = (vV - uMargin) / (1.0 - 2.0 * uMargin);
    float edge = fwidth(gv) * uLine;
    float within = step(-edge, gv) * step(gv, 1.0 + edge);
    float rules = lines(gv, ${(1 / RULES).toFixed(5)}) * within;
    float ticks = lines(turns, ${(1 / TICKS_PER_TURN).toFixed(5)});
    float c = max(type, max(rules, ticks) * ${GRID_ALPHA.toFixed(3)} * uGrid);

    vec3 n = normalize(vN);
    vec3 color;
    if (gl_FrontFacing) {
        float shade = ${OUT_AMBIENT.toFixed(3)} + ${OUT_KEY.toFixed(3)} * max(dot(n, ${vec3Of(OUT_LIGHT)}), 0.0);
        color = mix(uBand, uInk * shade, c);
    } else {
        // The inside reads inverted: a pale lit face with the type dark on it.
        float shade = ${IN_AMBIENT.toFixed(3)} + ${IN_KEY.toFixed(3)} * max(dot(-n, ${vec3Of(IN_LIGHT)}), 0.0);
        color = mix(uInk * shade, uBand, c);
    }
    gl_FragColor = vec4(color, 1.0);
}
`

/* ------------------------------------------------------------------- scene -- */

class TapeScene {
    private host: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private camera: THREE.OrthographicCamera
    private scene = new THREE.Scene()
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh
    private blank: THREE.DataTexture

    private shapeKey = ""
    private shape: Shape | null = null
    private texture: THREE.CanvasTexture | null = null
    private textureKey = ""
    private aspect = 1
    private midRadiusPx = 200

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false
    private visible = true
    private observer: IntersectionObserver | null = null
    private reducedMotion: MediaQueryList | null = null
    private fontRequests = new Set<string>()

    /** Where the tape's surface is, in turns. */
    private flow = 0
    private fling = 0
    private press = { id: -1, x: 0, time: 0, velocity: 0 }
    private scrollTarget = 0
    private scrollDone = 0
    private lastScrollY = 0

    /** The entrance's progress, 0 → 1, read every frame. */
    entry: () => number = () => 1
    /** Set by the host so a static render can repaint once fonts land. */
    onRedraw: (() => void) | null = null

    constructor(host: HTMLElement, mount: HTMLElement, cfg: Config) {
        this.host = host
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        // Transparent: Background is a CSS fill on the frame behind the canvas.
        this.renderer.setClearColor(0x000000, 0)
        const canvas = this.renderer.domElement
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block"
        mount.appendChild(canvas)

        // Looking up from just below, Y up; frustum set per frame size in layout().
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, CAMERA_DIST * 3)
        this.camera.position.set(0, -Math.sin(ELEVATION) * CAMERA_DIST, Math.cos(ELEVATION) * CAMERA_DIST)
        this.camera.up.set(0, 1, 0)
        this.camera.lookAt(0, 0, 0)

        this.blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
        this.blank.needsUpdate = true

        this.material = new THREE.ShaderMaterial({
            vertexShader: TAPE_VERTEX,
            fragmentShader: TAPE_FRAGMENT,
            side: THREE.DoubleSide,
            uniforms: {
                uTex: { value: this.blank },
                uReps: { value: 1 },
                uFlow: { value: 0 },
                uMargin: { value: 0.1 },
                uGrid: { value: 1 },
                uLine: { value: LINE_PX },
                uInk: { value: new THREE.Vector3(1, 1, 1) },
                uBand: { value: new THREE.Vector3(0, 0, 0) },
            },
        })
        this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        if (typeof window.matchMedia === "function") {
            this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
        }
        if (document.fonts) document.fonts.addEventListener("loadingdone", this.onFontsLoaded)

        this.applyConfig()
    }

    /* ---- config --------------------------------------------------------------- */

    private applyConfig() {
        const cfg = this.cfg
        this.buildTexture(false)
        const u = this.material.uniforms
        const ink = parseColor(cfg.textColor, DEFAULTS.textColor)
        const band = parseColor(cfg.bandColor, DEFAULTS.bandColor)
        ;(u.uInk.value as THREE.Vector3).set(ink[0], ink[1], ink[2])
        ;(u.uBand.value as THREE.Vector3).set(band[0], band[1], band[2])
        u.uGrid.value = cfg.grid === false ? 0 : 1
        u.uLine.value = LINE_PX * this.renderer.getPixelRatio()
        this.layout()
    }

    /** Redraw the type if it changed; `force` redraws regardless (fonts landed). */
    private buildTexture(force: boolean) {
        const key = stripKeyOf(this.cfg)
        if (!force && key === this.textureKey && this.texture) return
        this.textureKey = key
        const strip = drawStrip(this.cfg)
        const texture = new THREE.CanvasTexture(strip.canvas)
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter
        // The tape turns edge-on at every coil's ends; without this the type
        // there smears to grey.
        texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
        texture.colorSpace = THREE.NoColorSpace
        texture.needsUpdate = true
        this.texture?.dispose()
        this.texture = texture
        this.aspect = strip.aspect
        this.material.uniforms.uTex.value = texture
        this.requestFont()
    }

    /** Ask for the face; the loadingdone listener redraws when it lands. */
    private requestFont() {
        if (!document.fonts) return
        const spec = fontStringFor(this.cfg.font, 32)
        if (this.fontRequests.has(spec)) return
        this.fontRequests.add(spec)
        document.fonts.load(spec, lineOf(this.cfg.text) || "A").then(
            () => this.onFontsLoaded(),
            () => undefined
        )
    }

    private onFontsLoaded = () => {
        if (this.disposed) return
        this.buildTexture(true)
        this.layout()
        this.onRedraw?.()
    }

    /** Fit the coils to the frame and rebuild the tape if its shape moved. */
    private layout() {
        const { shape, scale, top } = fitShape(this.cfg, this.width, this.height)
        const key = `${shape.coils}|${shape.taper}|${shape.radius.toFixed(5)}|${shape.band}`
        if (key !== this.shapeKey) {
            this.shapeKey = key
            this.mesh.geometry.dispose()
            this.mesh.geometry = buildRibbon(shape)
        }
        this.shape = shape
        this.camera.left = -this.width / 2 / scale
        this.camera.right = this.width / 2 / scale
        this.camera.top = top
        this.camera.bottom = top - this.height / scale
        this.camera.updateProjectionMatrix()

        const u = this.material.uniforms
        u.uMargin.value = MARGIN / shape.band
        u.uReps.value = repsFor(shape, this.aspect)
        this.midRadiusPx = Math.max(20, coilAt(shape, (shape.coils - 1) / 2).r * scale)
    }

    /* ---- frame ---------------------------------------------------------------- */

    private dirSign(): number {
        return this.cfg.direction === "right" ? -1 : 1
    }

    private draw() {
        // The entrance holds the tape a little behind where it runs to.
        const lag = (1 - this.entry()) * ENTRY_WIND * this.dirSign()
        const f = this.flow - lag
        // Repeats per turn and ticks per turn are whole, so a turn is a period.
        this.material.uniforms.uFlow.value = f - Math.floor(f)
        this.renderer.render(this.scene, this.camera)
    }

    private advance(dt: number) {
        const dir = this.dirSign()
        // Scroll is eased in whether or not a hand is on the tape.
        const pending = this.scrollTarget - this.scrollDone
        const step = pending * (1 - Math.exp(-SCROLL_EASE * dt))
        this.scrollDone += step
        this.flow += dir * step
        if (this.press.id !== -1) return
        const still = this.reducedMotion?.matches ? 0 : 1
        const auto = dir * clamp(this.cfg.speed, 0, 10, DEFAULTS.speed) * SPEED_UNIT * still
        this.flow += (auto + this.fling) * dt
        this.fling *= Math.exp(-FLING_DECAY * dt)
        if (Math.abs(this.fling) < 1e-5) this.fling = 0
        // Keep the clock small; only its fraction is ever drawn.
        if (Math.abs(this.flow) > 1e4) this.flow -= Math.trunc(this.flow)
    }

    /* ---- pointer: slide the tape under the finger ----------------------------- */

    private onPointerDown = (event: PointerEvent) => {
        if (!this.cfg.drag) return
        if (event.pointerType === "mouse" && event.button !== 0) return
        this.press = { id: event.pointerId, x: event.clientX, time: performance.now(), velocity: 0 }
        this.fling = 0
        try {
            this.host.setPointerCapture(event.pointerId)
        } catch {
            /* capture is a nicety */
        }
        this.setCursor("grabbing")
    }

    private onPointerMove = (event: PointerEvent) => {
        if (event.pointerId !== this.press.id) return
        const dx = event.clientX - this.press.x
        this.press.x = event.clientX
        // A pixel at the front of the middle coil is this much of a turn; the
        // type there tracks the finger. θ grows leftward, so left is forward.
        const df = -dx / (TAU * this.midRadiusPx)
        this.flow += df
        const now = performance.now()
        const dt = Math.max(1, now - this.press.time) / 1000
        this.press.time = now
        this.press.velocity = this.press.velocity * 0.5 + (df / dt) * 0.5
    }

    private onPointerUp = (event: PointerEvent) => {
        if (event.pointerId !== this.press.id) return
        // What the hand added on top of the running speed carries on, then fades.
        const auto = this.dirSign() * clamp(this.cfg.speed, 0, 10, DEFAULTS.speed) * SPEED_UNIT
        const idle = performance.now() - this.press.time > 80
        this.fling = idle ? 0 : this.press.velocity - auto
        this.press.id = -1
        this.setCursor(this.cfg.drag ? "grab" : "")
    }

    private onScroll = () => {
        const y = window.scrollY
        const delta = y - this.lastScrollY
        this.lastScrollY = y
        const sens = clamp(this.cfg.scrollSens, 0, 10, DEFAULTS.scrollSens)
        // Down winds the tape on the way it already runs; up winds it back.
        this.scrollTarget += delta * sens * SCROLL_UNIT
    }

    private setCursor(value: string) {
        if (this.host.style.cursor === value) return
        this.host.style.cursor = value
    }

    private attach() {
        const node = this.host
        node.addEventListener("pointerdown", this.onPointerDown)
        node.addEventListener("pointermove", this.onPointerMove)
        node.addEventListener("pointerup", this.onPointerUp)
        node.addEventListener("pointercancel", this.onPointerUp)
        this.lastScrollY = window.scrollY
        window.addEventListener("scroll", this.onScroll, { passive: true })
        if (typeof IntersectionObserver !== "undefined") {
            this.observer = new IntersectionObserver((entries) => {
                this.visible = entries.some((e) => e.isIntersecting)
            })
            this.observer.observe(node)
        }
    }

    private detach() {
        const node = this.host
        node.removeEventListener("pointerdown", this.onPointerDown)
        node.removeEventListener("pointermove", this.onPointerMove)
        node.removeEventListener("pointerup", this.onPointerUp)
        node.removeEventListener("pointercancel", this.onPointerUp)
        window.removeEventListener("scroll", this.onScroll)
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
        this.lastT = performance.now()
        const loop = () => {
            if (this.disposed) return
            this.frameId = requestAnimationFrame(loop)
            const now = performance.now()
            let dt = (now - this.lastT) / 1000
            this.lastT = now
            if (!this.visible) return
            if (!isFinite(dt) || dt < 0) dt = 0
            // A tab back from the background must not jump the tape.
            if (dt > 0.05) dt = 0.05
            this.advance(dt)
            this.draw()
        }
        this.frameId = requestAnimationFrame(loop)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.detach()
        if (document.fonts) document.fonts.removeEventListener("loadingdone", this.onFontsLoaded)
        this.mesh.geometry.dispose()
        this.material.dispose()
        this.texture?.dispose()
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
 * @framerIntrinsicHeight 720
 * @framerDisableUnlink
 */
function __BaseImpl_AugerTape(props: Partial<AugerTapeProps>) {
    const {
        text = DEFAULTS.text,
        background = DEFAULTS.background,
        font = {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Inter, \"Arial Black\", \"Helvetica Neue\", Arial, sans-serif","fontWeight":900,"lineHeight":"1.5em","letterSpacing":"0em"},
        textColor = DEFAULTS.textColor,
        coils = DEFAULTS.coils,
        taper = DEFAULTS.taper,
        coilWidth = DEFAULTS.coilWidth,
        bandHeight = DEFAULTS.bandHeight,
        bandColor = DEFAULTS.bandColor,
        grid = DEFAULTS.grid,
        drag = DEFAULTS.drag,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction,
        scrollSens = DEFAULTS.scrollSens,
        transition = {"ease":[0.16,1,0.3,1],"mass":1,"type":"tween","damping":60,"duration":1.6,"stiffness":800},
        style,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const mountRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<TapeScene | null>(null)
    // 0 on the server and on first paint alike, so nothing mismatches.
    const entry: MotionValue<number> = useMotionValue(0)
    const inView = useInView(hostRef, { once: true, amount: 0.2 })

    // Rebuilt per render and read by the scene, so a slider drag lands on the
    // next frame without the renderer ever being torn down.
    const cfg: Config = {
        text,
        font: { ...DEFAULT_FONT, ...font },
        textColor,
        coils,
        taper,
        coilWidth,
        bandHeight,
        bandColor,
        grid,
        drag,
        speed,
        direction,
        scrollSens,
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
        if (!inView) {
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
    }, [inView, transitionKey])

    /* ---- the renderer, built once ---- */

    useEffect(() => {
        const host = hostRef.current
        const mount = mountRef.current
        if (!host || !mount) return
        let scene: TapeScene
        try {
            scene = new TapeScene(host, mount, cfgRef.current)
        } catch {
            // No WebGL — an empty ground rather than a thrown render.
            return
        }
        sceneRef.current = scene
        scene.entry = () => entry.get()
        scene.setSize(host.clientWidth, host.clientHeight)

        const still = isStatic()
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
            aria-label={lineOf(text) || "A spiral of ruled tape"}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                backgroundColor: background,
                // Vertical swipes still scroll the page; sideways ones wind the tape.
                touchAction: drag ? "pan-y" : undefined,
                userSelect: "none",
                ...style,
            }}
        >
            <motion.div ref={mountRef} style={{ position: "absolute", inset: 0, opacity: entry }} />
        </div>
    )
}

AugerTape.displayName = "Auger Tape"
AugerTape.defaultProps = { ...DEFAULTS }

/* ---------------------------------------------------------------- controls -- */

const __presetProps = {
  "background": "#000000",
  "bandColor": "#000000",
  "textColor": "#FFFFFF",
  "text": "DRAG ME",
  "coils": 4,
  "taper": 6.8,
  "coilWidth": 6.7,
  "bandHeight": 6.1,
  "grid": true,
  "drag": true,
  "speed": 5,
  "direction": "left",
  "scrollSens": 0
};

export default function AugerTape(props: Record<string, unknown>) {
  return <__BaseImpl_AugerTape {...(__presetProps as Record<string, unknown>)} {...props} />;
}
