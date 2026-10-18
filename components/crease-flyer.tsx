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
 * Crease Flyer — a poster that arrives as a crumpled ball of paper, opens out
 * flat, holds, then is screwed back up and tossed so the next one can arrive.
 *
 * Built after a reference animation supplied as seven still frames: a loop of
 * risograph-style posters (blue, white, acid yellow) for Big Cartel, each one
 * passing through a tight faceted wad, a half-opened sheet whose type is
 * legible through the creases, and a perfectly flat print. There was no source
 * to transcribe, so everything here is reverse-engineered from those frames —
 * the poster proportions and layouts of the stand-ins are measured off them,
 * the timeline is ours. The name is ours too; the stand-in posters carry the
 * reference's headlines but not its domain.
 *
 * One sheet, one draw call. The sheet is a dense plane whose every vertex is
 * placed in the vertex shader from a single `uCrumple` (0 flat → 1 ball):
 *
 *  - **Creases.** Each crease is a family of parallel folds across the sheet —
 *    a triangle wave with its own direction, spacing and phase. Paper folds
 *    into flat facets, and a sum of triangle waves is piecewise planar
 *    everywhere — facets of every size meeting at sharp lines — which is
 *    exactly what an unfolded wad looks like; smooth noise gives a pillow. The
 *    creases are rolled on the CPU per poster, so the ones that deepen as it
 *    crumples are the same ones it opens out of. They arrive across the whole
 *    sheet at once, and also jostle it in its own plane so the half-open
 *    sheet's outline goes ragged (the reference's fourth frame).
 *  - **The ball.** The sheet is wrapped onto a sphere through the octahedral
 *    map: its centre lands on the pole facing the camera and its edges meet
 *    round the back, so the wad shows a scrap of the print on its face (frame
 *    six's "…ay as well / …rt right"). The crease field pushes the skin in and
 *    out radially and shoves it sideways, which is what makes the silhouette
 *    jagged and folds flaps over pockets.
 *  - **Order.** The edges crumple before the middle, so the sheet gathers from
 *    its border inward and opens from the middle out.
 *
 * Lighting is one key light from the upper left plus ambient, on per-facet
 * normals taken from screen-space derivatives, so a crease is a hard change of
 * shade rather than a soft one. The deep shadows in the reference's folds are a
 * cavity term — the skin pushed in below the ball's radius goes dark — rather
 * than a shadow map: a self-intersecting wad is a shadow map's worst case, and
 * the cavity reads the same at a fraction of the cost. The lighting is
 * normalised so a flat poster facing the camera shows its print exactly.
 *
 * The component draws no caption, so there is no Text row: the posters are the
 * content, and the stand-ins' type is part of the stand-ins. There is no
 * Transition row either — every motion here is a hand-rolled clock feeding
 * shader uniforms and the mesh transform, with no framer-motion animation a
 * spring or tween could be handed to. Playback carries its own Speed and Spin.
 *
 * The `framer` import supplies the property controls only — under plain Next.js,
 * alias it to a stub exporting a no-op `addPropertyControls`, a `ControlType`
 * object, and a `RenderTarget` with `current: () => "preview"`.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 720
 * @framerIntrinsicHeight 900
 * @framerDisableUnlink
 */

/* --------------------------------------------------------------- constants --
 * The camera, the light and the shape of the crumple are the look, not knobs.
 */

/** Narrow, so a flat poster is nearly orthographic — the reference's flat
 * frames have no perspective on them — while a tumbling wad still has depth. */
const CAM_FOV = 30
const CAM_Z = 10

/** World units of frame height visible at z = 0. */
const VIEW_HEIGHT = 2 * CAM_Z * Math.tan((CAM_FOV * Math.PI) / 360)

/** The most of the frame a poster may take on either axis. Poster Width and
 * Height are honoured up to this and then scaled down together, so a frame
 * smaller than the poster still shows all of it on its own proportions. */
const FRAME_FILL = 0.92

/** Grid density of the sheet. Every crease has to land across several rows of
 * triangles to read as a fold rather than a kink, and the wad packs the whole
 * grid into a fifth of its size. */
const SEG_X = 120
const SEG_Y = 170

/** Crease slots allocated in the shader; `Creases` picks how many are live. */
const MAX_CREASES = 48

/** How far ahead of the middle the edges crumple, as a share of the timeline.
 * The reference gathers from the border inward; at 0 the sheet would shrink
 * uniformly like a photo being scaled. */
const EDGE_LEAD = 0.35

/** The key light, in view space: high and to the left, falling across the
 * wad so the folds facing away go dark — where the reference's lit ridges and
 * shadowed pockets put it. */
const LIGHT_DIR = new THREE.Vector3(-0.45, 0.55, 0.75).normalize()
const AMBIENT = 0.42
const DIFFUSE = 0.72

/** Phase lengths at Speed 5, in seconds. Opening is the slow, legible part —
 * the half-open sheet is the frame worth seeing — and the toss is quick. */
const BASE_DURATION = {
    enter: 0.75,
    unfold: 1.7,
    crumple: 1.25,
    exit: 0.55,
}

/** The ends of the Y Offset slider. Not pixels: ±this is the picture's own top
 * or bottom edge flush with the sheet, whatever slack the crop leaves. */
const OFFSET_RANGE = 250

/** Stand-in posters are drawn at this size: A-series proportions, which is
 * what the reference's posters measure out at. */
const POSTER_W = 1024
const POSTER_H = 1448

/** Uploaded pictures are capped here on their long side before they become a
 * texture — past it a poster is never on screen large enough to use it. */
const TEXTURE_MAX = 2048

/** How far a press may travel and still count as a tap rather than a drag. */
const TAP_SLOP = 8

/* ---------------------------------------------------------------- defaults --
 * One source of truth per group: the signature merges these and each control's
 * `defaultValue` points at the same constant, so the panel and the props can
 * never drift.
 */

type Play = "loop" | "hover" | "click"

const DEFAULT_PAPER = {
    creases: 5,
    crumple: 5,
    ballSize: 5,
    shadow: 6,
}

const DEFAULT_PLAYBACK = {
    play: "loop" as Play,
    hold: 2.5,
    speed: 5,
    spin: 5,
}

const DEFAULTS = {
    images: [],
    background: "#141414",
    posterWidth: 412,
    posterHeight: 584,
    paper: DEFAULT_PAPER,
    tilt: 4,
    playback: DEFAULT_PLAYBACK,
}

/* ------------------------------------------------------------------- types -- */

type ResponsiveImage = { src?: string; srcSet?: string; alt?: string } | string

/**
 * One Images row: the poster, and which band of its height the sheet shows. A
 * bare responsive image is what an older instance holds — and what
 * `ControlType.ResponsiveImage`'s own string/object shapes are — so both still
 * resolve.
 */
type ImageEntry = { image?: ResponsiveImage; offsetY?: number } | ResponsiveImage

export interface Paper {
    /** How many crease lines the sheet carries. More is a finer, busier wad. */
    creases: number
    /** How deep the folds go — how jagged the wad, how warped the half-open
     * sheet. 0 crumples it into a smooth ball. */
    crumple: number
    /** How big the wad is next to the flat poster. */
    ballSize: number
    /** How dark the pockets inside the wad go. */
    shadow: number
}

export interface Playback {
    /** Loop on its own, hold until the pointer enters, or hold until it is
     * clicked. */
    play: Play
    /** Seconds each poster lies flat before it is crumpled. Loop only. */
    hold: number
    /** How fast it crumples and opens. */
    speed: number
    /** How far the wad tumbles on its way in and out. 0 keeps it facing you. */
    spin: number
}

export interface CreaseFlyerProps {
    /** The posters, shown in order and looped. Empty falls back to three
     * stand-in posters. */
    images: ImageEntry[]
    background: string
    posterWidth: number
    posterHeight: number
    paper: Partial<Paper>
    /** How far the flat poster leans away from the pointer. */
    tilt: number
    playback: Partial<Playback>
    style?: React.CSSProperties
}

type Config = {
    images: ImageEntry[]
    posterWidth: number
    posterHeight: number
    paper: Paper
    tilt: number
    playback: Playback
}

/* ----------------------------------------------------------------- helpers -- */

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v
}

function srcOf(image: ResponsiveImage): string {
    if (typeof image === "string") return image
    return image?.src ?? ""
}

function altOf(image: ResponsiveImage): string {
    if (typeof image === "string") return ""
    return image?.alt ?? ""
}

/** Unwrap an entry that may be a full row or a bare image. */
function imageOf(entry: ImageEntry): ResponsiveImage {
    if (entry && typeof entry === "object" && "image" in entry) {
        return (entry.image ?? "") as ResponsiveImage
    }
    return entry as ResponsiveImage
}

function offsetOf(entry: ImageEntry): number {
    if (entry && typeof entry === "object" && "offsetY" in entry) {
        const n = (entry as { offsetY?: number }).offsetY
        return typeof n === "number" && isFinite(n) ? n : 0
    }
    return 0
}

function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
}

function easeInCubic(t: number): number {
    return t * t * t
}

/** A small overshoot, so the arriving wad lands with a little weight. */
function easeOutBack(t: number): number {
    const c1 = 1.4
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** Seeded, so every crumple is different but a given poster's creases are the
 * same on the way in as on the way out. Seeded by cycle count, never by
 * `Math.random`, and only ever run on the client. */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/**
 * Panel values are abstract scales; the shader wants world units. Every
 * mapping lands its default on the look in the reference frames.
 */
function settingsFor(cfg: Config, viewWidthPx: number, viewHeightPx: number) {
    const worldPerPx = VIEW_HEIGHT / Math.max(1, viewHeightPx)
    const pw = clamp(cfg.posterWidth, 80, 1600, DEFAULTS.posterWidth)
    const ph = clamp(cfg.posterHeight, 80, 2000, DEFAULTS.posterHeight)
    // The frame wins: a poster bigger than it is scaled down whole, never
    // squeezed on one axis.
    const fit = Math.min(
        1,
        (FRAME_FILL * Math.max(1, viewWidthPx)) / pw,
        (FRAME_FILL * Math.max(1, viewHeightPx)) / ph
    )
    const width = pw * fit * worldPerPx
    const height = ph * fit * worldPerPx

    const paper = cfg.paper
    const crumple = clamp(paper.crumple, 0, 10, DEFAULT_PAPER.crumple)
    const ballSize = clamp(paper.ballSize, 0, 10, DEFAULT_PAPER.ballSize)
    const playback = cfg.playback
    const speed = clamp(playback.speed, 0, 10, DEFAULT_PLAYBACK.speed)

    return {
        width,
        height,
        creaseCount: Math.round(
            8 + clamp(paper.creases, 0, 10, DEFAULT_PAPER.creases) * 4
        ),
        // 5 lands on the reference wads: about a third of the poster's height
        // across, spikes included.
        ballRadius: height * (0.08 + ballSize * 0.016),
        // Radial push per standard deviation of crease, as a share of the
        // radius. The field's folds are short next to its spread, so this is
        // mostly slope: 5 tilts a typical facet of the wad about 45°, the
        // jagged silhouette in the reference.
        ballJag: crumple * 0.03,
        // How far the half-open sheet buckles out of its plane, world units per
        // standard deviation. 5 tilts a typical facet about 20° — the type
        // still reads through it, as it does in the reference's open frame.
        crinkle: height * crumple * 0.0032,
        shadow: (clamp(paper.shadow, 0, 10, DEFAULT_PAPER.shadow) / 10) * 0.9,
        tilt: clamp(cfg.tilt, 0, 10, DEFAULTS.tilt) * 0.035,
        play:
            playback.play === "click"
                ? "click"
                : playback.play === "hover"
                  ? "hover"
                  : ("loop" as Play),
        hold: clamp(playback.hold, 0.5, 10, DEFAULT_PLAYBACK.hold),
        // Geometric, so every step of the slider is the same felt change.
        pace: Math.pow(0.82, speed - 5),
        spin: clamp(playback.spin, 0, 10, DEFAULT_PLAYBACK.spin) / 5,
    }
}

/* ------------------------------------------------------------------ shader -- */

const SHEET_VERTEX = /* glsl */ `
uniform vec2 uSize;
uniform float uCrumple;
uniform float uCreaseCount;
uniform float uCreaseInvStd;
uniform vec4 uCreaseLine[${MAX_CREASES}];
uniform vec2 uCreaseShape[${MAX_CREASES}];
uniform float uBallRadius;
uniform float uBallJag;
uniform float uCrinkle;

varying vec2 vUv;
varying vec3 vViewPos;
varying float vCavity;

/**
 * The crease field, at a point on the sheet measured in sheet heights. Each
 * crease is a family of parallel folds — a triangle wave across the sheet with
 * its own direction, spacing and phase — and its amplitude's sign decides
 * which way the first fold goes. A triangle wave is straight lines meeting at
 * sharp corners, so a sum of them is piecewise planar everywhere: facets of
 * every size meeting at hard lines, the way crushed paper actually opens out.
 * Smooth noise gives a pillow; this gives paper. Each fold line gets a slight
 * bend so none of them reads as ruled.
 *
 * Returned in standard deviations, so every gain downstream means the same
 * thing whatever Creases is set to.
 */
float creaseField(vec2 p) {
    float h = 0.0;
    for (int i = 0; i < ${MAX_CREASES}; i++) {
        if (float(i) >= uCreaseCount) break;
        vec4 line = uCreaseLine[i];
        vec2 shape = uCreaseShape[i];
        vec2 n = line.xy;
        float along = dot(p, vec2(-n.y, n.x));
        float d = dot(p, n) + 0.02 * sin(along * 7.0 + shape.y);
        float w = line.w;
        h += shape.x * w * (abs(fract(d / w + line.z) - 0.5) - 0.25);
    }
    return clamp(h * uCreaseInvStd, -3.0, 3.0);
}

void main() {
    // The plane is a unit square; the poster's size arrives as a uniform, so
    // dragging Poster Width is a uniform write rather than a geometry rebuild.
    vec2 q = position.xy;
    vec2 p = vec2(q.x * uSize.x / uSize.y, q.y);
    float h = creaseField(p);

    // The edges crumple ahead of the middle: 0 at the centre of the sheet, 1
    // at its corners. Gathers from the border in, opens from the middle out.
    float rad = clamp(length(q * 2.0) * 0.70710678, 0.0, 1.0);
    float lc = clamp(
        uCrumple * (1.0 + ${EDGE_LEAD.toFixed(2)}) - (1.0 - rad) * ${EDGE_LEAD.toFixed(2)},
        0.0,
        1.0
    );
    // The creases come in first, across the whole sheet at once — the half-open
    // frame is creased edge to edge, middle included — and stay; the wrap onto
    // the ball follows, border first.
    float crinkle = smoothstep(0.0, 0.3, uCrumple);
    float ball = smoothstep(0.12, 1.0, lc);

    // Two more readings of the same creases, taken across the sheet at a turn.
    // They jostle the half-open sheet in its own plane, so its outline goes
    // ragged instead of staying a clean rectangle, and they shove the wad's
    // skin sideways below.
    float h2 = creaseField(vec2(p.y, -p.x) * 1.3);
    float h3 = creaseField(vec2(-p.y, p.x) * 1.15 + 0.07);

    // --- the sheet, drawing in on itself and buckling along its creases ---
    vec3 flatPos = vec3(
        q * uSize * (1.0 - 0.25 * crinkle) + vec2(h2, h3) * uCrinkle * 0.5 * crinkle,
        h * uCrinkle * crinkle
    );

    // --- the wad ---
    // Octahedral map: the sheet's centre lands on the pole facing the camera
    // and its four edges meet round the back, each folded onto itself — a
    // sheet wrapped round a ball. Orientation-preserving, so the printed side
    // faces out everywhere.
    vec2 o = q * 2.0;
    float zc = 1.0 - abs(o.x) - abs(o.y);
    vec2 oxy = zc < 0.0 ? (1.0 - abs(o.yx)) * sign(o) : o;
    vec3 dir = normalize(vec3(oxy, zc));

    // Shoved sideways as well as in and out, so flaps fold over the pockets
    // beside them instead of only standing straight out.
    dir = normalize(dir + vec3(h2, h3, -0.5 * (h2 + h3)) * 0.6 * uBallJag);
    vec3 ballPos = dir * uBallRadius * (1.0 + uBallJag * h);

    vec3 pos = mix(flatPos, ballPos, ball);

    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;

    // Pushed in below the wad's skin, or down in a crease valley of the
    // half-open sheet: either way, somewhere the key light does not reach.
    vCavity = ball * smoothstep(0.0, 1.6, -h)
        + (1.0 - ball) * crinkle * smoothstep(0.0, 2.0, -h) * 0.35;
}
`

const SHEET_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uImageAspect;
uniform float uSheetAspect;
uniform float uOffset;
uniform vec3 uBackColor;
uniform float uShadow;
uniform vec3 uLightDir;

varying vec2 vUv;
varying vec3 vViewPos;
varying float vCavity;

void main() {
    // One normal per triangle, straight from the screen: a crease is a hard
    // change of shade, the way a fold catches light. Always faces the camera,
    // which is what lights both sides of the paper the same way.
    vec3 n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
    float facing = ${AMBIENT.toFixed(2)} + ${DIFFUSE.toFixed(2)} * uLightDir.z;
    float light = (${AMBIENT.toFixed(2)} + ${DIFFUSE.toFixed(2)} * max(dot(n, uLightDir), 0.0)) / facing;

    vec3 base;
    if (gl_FrontFacing) {
        // The poster on its own aspect, cropped to the sheet — cover, never
        // squeezed. A picture wider than the sheet loses its sides; a taller
        // one loses top and bottom, and Y Offset picks which band shows. The
        // offset arrives as ±1 — the picture's own top or bottom edge flush
        // with the sheet — scaled by however much this crop hides.
        vec2 uv = vUv;
        float s = uImageAspect / uSheetAspect;
        if (s > 1.0) {
            uv.x = (uv.x - 0.5) / s + 0.5;
        } else {
            uv.y = (uv.y - 0.5) * s + 0.5 + clamp(uOffset, -1.0, 1.0) * (1.0 - s) * 0.5;
        }
        base = texture2D(uMap, clamp(uv, 0.0, 1.0)).rgb;
    } else {
        // Posters are printed one side; the back is bare paper.
        base = uBackColor * 0.94;
    }

    float cavity = 1.0 - uShadow * clamp(vCavity, 0.0, 1.0);
    // Written straight through: the textures are tagged as no colour space, so
    // a flat poster facing the camera shows its print byte for byte.
    gl_FragColor = vec4(base * light * cavity, 1.0);
}
`

/* -------------------------------------------------------- stand-in posters --
 * With no images the component still has to read as the reference, so it
 * draws three posters of its own, measured off the reference frames: a blue
 * one, a white one and an acid-yellow one, heavy grotesk headlines over a line
 * of serif and an outlined pill.
 */

const HEAD_FONT = `"Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif`
const SERIF_FONT = `Georgia, "Times New Roman", serif`
const SANS_FONT = `"Helvetica Neue", Helvetica, Arial, sans-serif`
/** Arial Black's cap height as a share of its em, so a headline can be sized
 * by the box its capitals should fill. */
const HEAD_CAP = 0.716

type Run = { text: string; italic?: boolean }

/** A headline stretched to fill a box given in fractions of the poster —
 * scaled across to its width and sized up to its height, the way the
 * reference's display type sits wall to wall. */
function headline(
    ctx: CanvasRenderingContext2D,
    text: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number
) {
    const bx = x0 * POSTER_W
    const bw = (x1 - x0) * POSTER_W
    const bh = (y1 - y0) * POSTER_H
    ctx.font = `900 ${Math.round(bh / HEAD_CAP)}px ${HEAD_FONT}`
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
    const m = ctx.measureText(text)
    const left = m.actualBoundingBoxLeft ?? 0
    const measured = (m.actualBoundingBoxRight ?? m.width) + left
    ctx.save()
    ctx.translate(bx, y1 * POSTER_H)
    ctx.scale(bw / Math.max(1, measured), 1)
    ctx.fillText(text, left, 0)
    ctx.restore()
}

/** One line of serif, with italic runs, left-aligned or centred on x. */
function serifLine(
    ctx: CanvasRenderingContext2D,
    runs: Run[],
    x: number,
    baseline: number,
    size: number,
    align: "left" | "center"
) {
    const px = Math.round(size * POSTER_H)
    const fontOf = (r: Run) => `${r.italic ? "italic " : ""}400 ${px}px ${SERIF_FONT}`
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
    const widths = runs.map((r) => {
        ctx.font = fontOf(r)
        return ctx.measureText(r.text).width
    })
    const total = widths.reduce((a, b) => a + b, 0)
    let cx = align === "center" ? x * POSTER_W - total / 2 : x * POSTER_W
    runs.forEach((r, i) => {
        ctx.font = fontOf(r)
        ctx.fillText(r.text, cx, baseline * POSTER_H)
        cx += widths[i]
    })
}

function pill(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    label: string
) {
    const x = x0 * POSTER_W
    const y = y0 * POSTER_H
    const w = (x1 - x0) * POSTER_W
    const h = (y1 - y0) * POSTER_H
    const r = h / 2
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2)
    ctx.lineTo(x + r, y + h)
    ctx.arc(x + r, y + r, r, Math.PI / 2, (Math.PI * 3) / 2)
    ctx.closePath()
    ctx.lineWidth = h * 0.085
    ctx.stroke()
    ctx.font = `500 ${Math.round(h * 0.42)}px ${SANS_FONT}`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(label, x + w / 2, y + h / 2 + h * 0.02)
}

/** The yellow poster's three little glyphs: a bin, a trophy, a bin. */
function glyphs(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    const x = x0 * POSTER_W
    const y = y0 * POSTER_H
    const w = (x1 - x0) * POSTER_W
    const h = (y1 - y0) * POSTER_H
    const cell = w / 3
    const lw = h * 0.09
    ctx.lineWidth = lw
    ctx.lineJoin = "round"
    const bin = (cx: number) => {
        const bw = cell * 0.62
        ctx.strokeRect(cx - bw / 2, y + h * 0.2, bw, h * 0.78)
        ctx.fillRect(cx - bw * 0.62, y + h * 0.06, bw * 1.24, lw * 1.2)
        for (let k = -1; k <= 1; k++) {
            ctx.fillRect(cx + k * bw * 0.24 - lw * 0.35, y + h * 0.34, lw * 0.7, h * 0.52)
        }
    }
    const trophy = (cx: number) => {
        const cw = cell * 0.64
        ctx.beginPath()
        ctx.moveTo(cx - cw / 2, y + h * 0.04)
        ctx.lineTo(cx + cw / 2, y + h * 0.04)
        ctx.quadraticCurveTo(cx + cw / 2, y + h * 0.56, cx, y + h * 0.6)
        ctx.quadraticCurveTo(cx - cw / 2, y + h * 0.56, cx - cw / 2, y + h * 0.04)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.arc(cx - cw / 2, y + h * 0.22, cw * 0.2, Math.PI / 2, (Math.PI * 3) / 2)
        ctx.moveTo(cx + cw / 2, y + h * 0.02)
        ctx.arc(cx + cw / 2, y + h * 0.22, cw * 0.2, -Math.PI / 2, Math.PI / 2)
        ctx.stroke()
        ctx.fillRect(cx - lw * 0.6, y + h * 0.58, lw * 1.2, h * 0.24)
        ctx.fillRect(cx - cw * 0.34, y + h * 0.84, cw * 0.68, h * 0.14)
    }
    bin(x + cell * 0.5)
    trophy(x + cell * 1.5)
    bin(x + cell * 2.5)
}

interface StandIn {
    paper: string
    ink: string
    draw: (ctx: CanvasRenderingContext2D) => void
}

/** The URL on the stand-ins' pill. A placeholder, never the reference's own. */
const PILL_LABEL = "your-site.com"

const STAND_INS: StandIn[] = [
    {
        paper: "#bff0ec",
        ink: "#2b2b2b",
        draw: (ctx) => {
            headline(ctx, "DITCH", 0.121, 0.049, 0.886, 0.244)
            serifLine(ctx, [{ text: "Questioning yourself" }], 0.058, 0.508, 0.029, "left")
            serifLine(
                ctx,
                [{ text: "never got " }, { text: "anyone, anywhere.", italic: true }],
                0.058,
                0.537,
                0.029,
                "left"
            )
            pill(ctx, 0.631, 0.48, 0.934, 0.535, PILL_LABEL)
            headline(ctx, "DOUBT", 0.063, 0.769, 0.947, 0.96)
        },
    },
    {
        paper: "#f1f1ef",
        ink: "#363636",
        draw: (ctx) => {
            headline(ctx, "CHECK", 0.07, 0.051, 0.848, 0.196)
            headline(ctx, "YOU OUT", 0.065, 0.207, 0.942, 0.354)
            pill(ctx, 0.353, 0.478, 0.652, 0.534, PILL_LABEL)
            serifLine(ctx, [{ text: "Your doodles," }], 0.5, 0.7, 0.054, "center")
            serifLine(
                ctx,
                [{ text: "day dreams", italic: true }, { text: " and dumb" }],
                0.5,
                0.761,
                0.054,
                "center"
            )
            serifLine(ctx, [{ text: "ideas have never" }], 0.5, 0.822, 0.054, "center")
            serifLine(ctx, [{ text: "looked so good.", italic: true }], 0.5, 0.883, 0.054, "center")
        },
    },
    {
        paper: "#e6fd2f",
        ink: "#3c4314",
        draw: (ctx) => {
            headline(ctx, "THERE’S", 0.057, 0.047, 0.947, 0.202)
            headline(ctx, "NEVER", 0.153, 0.222, 0.842, 0.373)
            serifLine(ctx, [{ text: "May as well" }], 0.067, 0.497, 0.029, "left")
            serifLine(ctx, [{ text: "start right now.", italic: true }], 0.067, 0.528, 0.029, "left")
            pill(ctx, 0.352, 0.474, 0.648, 0.531, PILL_LABEL)
            glyphs(ctx, 0.685, 0.476, 0.868, 0.529)
            headline(ctx, "A GOOD", 0.057, 0.615, 0.935, 0.776)
            headline(ctx, "TIME", 0.26, 0.802, 0.749, 0.953)
        },
    },
]

/** Paper, not a flat fill: a few faint blotches and a per-pixel grain, the
 * reference's prints are visibly on stock. Seeded, so it is the same each
 * time. */
function paperTexture(ctx: CanvasRenderingContext2D, seed: number) {
    const rand = mulberry32(seed)
    for (let i = 0; i < 14; i++) {
        const x = rand() * POSTER_W
        const y = rand() * POSTER_H
        const r = POSTER_W * (0.15 + rand() * 0.35)
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        const dark = rand() < 0.6
        g.addColorStop(0, dark ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.05)")
        g.addColorStop(1, "rgba(0,0,0,0)")
        ctx.fillStyle = g
        ctx.fillRect(0, 0, POSTER_W, POSTER_H)
    }
}

function grain(ctx: CanvasRenderingContext2D, seed: number) {
    try {
        const img = ctx.getImageData(0, 0, POSTER_W, POSTER_H)
        const d = img.data
        let s = seed >>> 0
        for (let i = 0; i < d.length; i += 4) {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0
            const n = ((s >>> 24) - 128) * 0.07
            d[i] += n
            d[i + 1] += n
            d[i + 2] += n
        }
        ctx.putImageData(img, 0, 0)
    } catch {
        // Grain is a finish, not the poster.
    }
}

/** Drawn once per document and shared by every instance. */
const standInCache = new Map<number, HTMLCanvasElement>()

function standInCanvas(index: number): HTMLCanvasElement | null {
    const i = index % STAND_INS.length
    const cached = standInCache.get(i)
    if (cached) return cached
    const canvas = document.createElement("canvas")
    canvas.width = POSTER_W
    canvas.height = POSTER_H
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    const def = STAND_INS[i]
    ctx.fillStyle = def.paper
    ctx.fillRect(0, 0, POSTER_W, POSTER_H)
    paperTexture(ctx, 101 + i * 31)
    ctx.fillStyle = def.ink
    ctx.strokeStyle = def.ink
    // Riso ink sits slightly into the paper rather than on top of it.
    ctx.globalAlpha = 0.93
    def.draw(ctx)
    ctx.globalAlpha = 1
    grain(ctx, 7 + i * 13)
    standInCache.set(i, canvas)
    return canvas
}

/* --------------------------------------------------------------- textures -- */

interface Poster {
    texture: THREE.Texture
    aspect: number
    /** The bare-paper colour the back of the sheet shows. */
    back: THREE.Color
}

/** One decoded image per URL per document, shared by every instance. */
const imageCache = new Map<string, HTMLImageElement | null>()
const imagePending = new Map<string, Promise<HTMLImageElement | null>>()

function loadImage(url: string): Promise<HTMLImageElement | null> {
    if (imageCache.has(url)) return Promise.resolve(imageCache.get(url) ?? null)
    const pending = imagePending.get(url)
    if (pending) return pending
    const p = new Promise<HTMLImageElement | null>((resolve) => {
        const img = new window.Image()
        // Without this the upload throws on a cross-origin picture. A host
        // that will not send the header loses the picture, not the component.
        img.crossOrigin = "anonymous"
        img.onload = () => {
            imageCache.set(url, img)
            resolve(img)
        }
        img.onerror = () => {
            imageCache.set(url, null)
            resolve(null)
        }
        img.src = url
    })
    imagePending.set(url, p)
    return p
}

/** The back of a printed poster is its paper, and the paper is whatever the
 * print's own border is. Averaged off a thumbnail's outer ring. */
function borderColor(source: CanvasImageSource): THREE.Color {
    const fallback = new THREE.Color(0.9, 0.9, 0.9)
    try {
        const c = document.createElement("canvas")
        c.width = c.height = 12
        const ctx = c.getContext("2d")
        if (!ctx) return fallback
        ctx.drawImage(source, 0, 0, 12, 12)
        const d = ctx.getImageData(0, 0, 12, 12).data
        let r = 0
        let g = 0
        let b = 0
        let n = 0
        for (let y = 0; y < 12; y++) {
            for (let x = 0; x < 12; x++) {
                if (x > 0 && x < 11 && y > 0 && y < 11) continue
                const i = (y * 12 + x) * 4
                r += d[i]
                g += d[i + 1]
                b += d[i + 2]
                n++
            }
        }
        return new THREE.Color(r / n / 255, g / n / 255, b / n / 255)
    } catch {
        return fallback
    }
}

function finishTexture(texture: THREE.Texture, anisotropy: number) {
    // No colour space on purpose, so sampling returns the authored sRGB bytes
    // and the fragment shader writes them straight back out.
    texture.colorSpace = THREE.NoColorSpace
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
    // The wad shows the print at every angle there is.
    texture.anisotropy = anisotropy
    texture.needsUpdate = true
}

function standInPoster(index: number, anisotropy: number): Poster | null {
    const canvas = standInCanvas(index)
    if (!canvas) return null
    const texture = new THREE.CanvasTexture(canvas)
    finishTexture(texture, anisotropy)
    return {
        texture,
        aspect: POSTER_W / POSTER_H,
        back: new THREE.Color(STAND_INS[index % STAND_INS.length].paper),
    }
}

/** An uploaded picture, redrawn onto a canvas no larger than it needs to be.
 * Going through a canvas also proves the picture is readable: a tainted one
 * throws here, once, rather than on every upload. */
function imagePoster(img: HTMLImageElement, anisotropy: number): Poster | null {
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h) return null
    const scale = Math.min(1, TEXTURE_MAX / Math.max(w, h))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(w * scale))
    canvas.height = Math.max(1, Math.round(h * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    try {
        ctx.getImageData(0, 0, 1, 1)
    } catch {
        return null
    }
    const texture = new THREE.CanvasTexture(canvas)
    finishTexture(texture, anisotropy)
    return { texture, aspect: w / h, back: borderColor(canvas) }
}

/** The back of the sheet while its picture is still decoding. */
const BLANK_BACK = new THREE.Color(0.9, 0.9, 0.9)

/** Bare paper to draw with while a picture is still decoding. */
function blankTexture(): THREE.DataTexture {
    const t = new THREE.DataTexture(
        new Uint8Array([228, 228, 224, 255]),
        1,
        1,
        THREE.RGBAFormat
    )
    t.needsUpdate = true
    return t
}

/* ------------------------------------------------------------------ scene --
 * Nothing in here knows React exists. It takes a config, a size and a command
 * to start; everything the panel changes arrives through updateConfig.
 */

type Phase = "enter" | "unfold" | "hold" | "crumple" | "exit"

const NEXT_PHASE: Record<Phase, Phase> = {
    enter: "unfold",
    unfold: "hold",
    hold: "crumple",
    crumple: "exit",
    exit: "enter",
}

class FlyerScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera: THREE.PerspectiveCamera
    private geometry: THREE.PlaneGeometry
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh
    private blank: THREE.DataTexture

    private posters: (Poster | null)[] = []
    private postersKey = ""
    private postersToken = 0

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false
    private visible = true
    private observer: IntersectionObserver | null = null

    /** Where the sequence is. `cycle` counts posters shown, and seeds both the
     * creases and the tumble so each crumple is its own. */
    private tl = { phase: "enter" as Phase, t: 0, index: 0, cycle: 0, advance: false }

    /** The tumble the wad arrives with and the one it leaves with, in radians
     * per axis. Rolled per cycle. */
    private rotIn = new THREE.Vector3()
    private rotOut = new THREE.Vector3()

    /** Pointer lean, as a target and the eased value the sheet rides. */
    private lean = { tx: 0, ty: 0, x: 0, y: 0 }
    private press = { x: 0, y: 0, id: -1 }

    private settingsCache: ReturnType<typeof settingsFor> | null = null

    /** Set by the host so a static render can repaint once the posters land. */
    onPostersReady: (() => void) | null = null

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        // Transparent, not black: Background is a CSS fill on the frame behind
        // the canvas, so it takes any colour Framer can express.
        this.renderer.setClearColor(0x000000, 0)
        const canvas = this.renderer.domElement
        canvas.style.cssText =
            "position:absolute;inset:0;width:100%;height:100%;display:block"
        container.appendChild(canvas)

        this.camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 100)
        this.camera.position.z = CAM_Z

        this.blank = blankTexture()

        this.geometry = new THREE.PlaneGeometry(1, 1, SEG_X, SEG_Y)

        const lines: THREE.Vector4[] = []
        const shapes: THREE.Vector2[] = []
        for (let i = 0; i < MAX_CREASES; i++) {
            lines.push(new THREE.Vector4())
            shapes.push(new THREE.Vector2())
        }

        this.material = new THREE.ShaderMaterial({
            vertexShader: SHEET_VERTEX,
            fragmentShader: SHEET_FRAGMENT,
            side: THREE.DoubleSide,
            uniforms: {
                uSize: { value: new THREE.Vector2(1, 1.414) },
                uCrumple: { value: 1 },
                uCreaseCount: { value: 28 },
                uCreaseInvStd: { value: 1 },
                uCreaseLine: { value: lines },
                uCreaseShape: { value: shapes },
                uBallRadius: { value: 0.2 },
                uBallJag: { value: 0.12 },
                uCrinkle: { value: 0.1 },
                uMap: { value: this.blank as THREE.Texture },
                uImageAspect: { value: POSTER_W / POSTER_H },
                uSheetAspect: { value: POSTER_W / POSTER_H },
                uOffset: { value: 0 },
                uBackColor: { value: new THREE.Color(0.9, 0.9, 0.9) },
                uShadow: { value: 0.5 },
                uLightDir: { value: LIGHT_DIR.clone() },
            },
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        // Every vertex is placed in the shader, so the bounding sphere three
        // would cull against describes nothing that is actually on screen.
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        this.rollCycle()
        this.applyConfig()
        this.loadPosters()
    }

    /* ---- everything the panel owns is a uniform ----------------------------- */

    private settings() {
        if (!this.settingsCache) {
            this.settingsCache = settingsFor(this.cfg, this.width, this.height)
        }
        return this.settingsCache
    }

    private applyConfig() {
        const S = this.settings()
        const u = this.material.uniforms
        ;(u.uSize.value as THREE.Vector2).set(S.width, S.height)
        u.uSheetAspect.value = S.width / S.height
        u.uCreaseCount.value = S.creaseCount
        this.writeCreaseSpread()
        u.uBallRadius.value = S.ballRadius
        u.uBallJag.value = S.ballJag
        u.uCrinkle.value = S.crinkle
        u.uShadow.value = S.shadow
    }

    /** The field's spread for the creases that are live, so the shader can
     * hand back standard deviations: Creases then changes how busy the paper
     * is, never how deep it folds. A triangle wave of unit slope and spacing w
     * spans ±w/4 evenly, which is a variance of w²/48. */
    private writeCreaseSpread() {
        const lines = this.material.uniforms.uCreaseLine.value as THREE.Vector4[]
        const shapes = this.material.uniforms.uCreaseShape.value as THREE.Vector2[]
        const count = Math.min(MAX_CREASES, this.settings().creaseCount)
        let variance = 0
        for (let i = 0; i < count; i++) {
            const aw = shapes[i].x * lines[i].w
            variance += (aw * aw) / 48
        }
        this.material.uniforms.uCreaseInvStd.value = 1 / Math.sqrt(Math.max(1e-6, variance))
    }

    /** New creases and a new tumble for the poster about to arrive. Only ever
     * called while the wad is scaled to nothing, so the swap is never seen. */
    private rollCycle() {
        const rand = mulberry32(this.tl.cycle * 9973 + 17)
        const lines = this.material.uniforms.uCreaseLine.value as THREE.Vector4[]
        const shapes = this.material.uniforms.uCreaseShape.value as THREE.Vector2[]
        for (let i = 0; i < MAX_CREASES; i++) {
            const angle = rand() * Math.PI * 2
            // Fold spacing in sheet heights: mostly short, a few long — the
            // big folds a wad is first crushed along, with the fine crinkle
            // inside them.
            const r = rand()
            const w = 0.06 + 0.5 * r * r
            lines[i].set(Math.cos(angle), Math.sin(angle), rand(), w)
            shapes[i].set(rand() * 2 - 1, rand() * Math.PI * 2)
        }
        this.writeCreaseSpread()
        const turn = (lo: number, hi: number) =>
            (rand() < 0.5 ? -1 : 1) * (lo + rand() * (hi - lo))
        this.rotIn.set(turn(0.5, 1.1), turn(1.6, 3.0), turn(0.2, 0.7))
        this.rotOut.set(turn(0.5, 1.1), turn(1.6, 3.0), turn(0.2, 0.7))
    }

    private sourceList(): string[] {
        const list = this.cfg.images
        if (list && list.length) return list.map((entry) => srcOf(imageOf(entry)))
        return STAND_INS.map(() => "")
    }

    private loadPosters() {
        const sources = this.sourceList()
        const key = sources.join("|")
        // Keyed on the list, so a slider drag that arrives while pictures are
        // still decoding does not start a second load of the same list.
        if (key === this.postersKey) return
        this.postersKey = key
        const token = ++this.postersToken
        const anisotropy = this.renderer.capabilities.getMaxAnisotropy()
        const usingStandIns = !(this.cfg.images && this.cfg.images.length)

        const old = this.posters
        this.posters = sources.map((src, i) =>
            usingStandIns || !src ? standInPoster(i, anisotropy) : null
        )
        old.forEach((p) => p?.texture.dispose())
        if (usingStandIns) {
            this.onPostersReady?.()
            return
        }

        sources.forEach((src, i) => {
            if (!src) return
            loadImage(src).then((img) => {
                if (this.disposed || token !== this.postersToken) return
                // A picture that will not load gets a stand-in, so the loop
                // never has a hole in it.
                this.posters[i] =
                    (img && imagePoster(img, anisotropy)) ||
                    standInPoster(i, anisotropy)
                this.onPostersReady?.()
            })
        })
    }

    /* ---- timeline ----------------------------------------------------------- */

    private durations() {
        const k = this.settings().pace
        return {
            enter: BASE_DURATION.enter * k,
            unfold: BASE_DURATION.unfold * k,
            crumple: BASE_DURATION.crumple * k,
            exit: BASE_DURATION.exit * k,
        }
    }

    private advanceTimeline(dt: number) {
        const S = this.settings()
        const D = this.durations()
        const tl = this.tl
        tl.t += dt
        // A loop rather than an if, so a long frame can cross more than one
        // phase boundary and still land in the right place.
        for (let guard = 0; guard < 8; guard++) {
            if (tl.phase === "hold") {
                if (tl.advance) {
                    tl.advance = false
                    tl.t = 0
                    tl.phase = "crumple"
                    continue
                }
                if (S.play !== "loop" || tl.t < S.hold) break
                tl.t -= S.hold
                tl.phase = "crumple"
                continue
            }
            const dur = D[tl.phase]
            if (tl.t < dur) break
            tl.t -= dur
            const leaving = tl.phase
            tl.phase = NEXT_PHASE[leaving]
            if (leaving === "exit") {
                const count = Math.max(1, this.posters.length)
                tl.index = (tl.index + 1) % count
                tl.cycle += 1
                this.rollCycle()
            }
        }
        tl.advance = false
    }

    /**
     * The pose at this point of the timeline: how crumpled, how big, and how
     * turned. Every phase starts where the last one left off — the tumble the
     * wad arrives with unwinds to exactly zero as it opens, and the one it
     * leaves with winds up from zero as it closes — so the sheet never jumps.
     */
    private pose() {
        const tl = this.tl
        const D = this.durations()
        const S = this.settings()
        const rot = new THREE.Vector3()
        let crumple = 0
        let scale = 1
        if (tl.phase === "hold") {
            return { crumple, scale, rot }
        }
        const p = clamp01(tl.t / Math.max(1e-3, D[tl.phase]))
        switch (tl.phase) {
            case "enter":
                crumple = 1
                scale = Math.max(0, easeOutBack(p))
                rot.copy(this.rotIn).multiplyScalar(1 + 0.6 * (1 - p))
                break
            case "unfold":
                crumple = 1 - easeInOutCubic(p)
                rot.copy(this.rotIn).multiplyScalar(1 - easeOutCubic(p))
                break
            case "crumple":
                crumple = easeInOutCubic(p)
                rot.copy(this.rotOut).multiplyScalar(easeInCubic(p))
                break
            case "exit":
                crumple = 1
                scale = 1 - easeInCubic(p)
                rot.copy(this.rotOut).multiplyScalar(1 + 0.8 * p)
                break
        }
        rot.multiplyScalar(S.spin)
        return { crumple, scale, rot }
    }

    private draw(dt: number) {
        const S = this.settings()
        const u = this.material.uniforms
        const { crumple, scale, rot } = this.pose()

        // The poster on show, read fresh each frame: a list that has just
        // shrunk, a picture that has just landed and a Y Offset that is being
        // dragged all show up on the next frame.
        const count = Math.max(1, this.posters.length)
        const index = this.tl.index % count
        const poster = this.posters[index]
        u.uMap.value = poster ? poster.texture : this.blank
        u.uImageAspect.value = poster ? poster.aspect : POSTER_W / POSTER_H
        ;(u.uBackColor.value as THREE.Color).copy(poster ? poster.back : BLANK_BACK)
        const entry = this.cfg.images[index]
        u.uOffset.value = entry
            ? clamp(offsetOf(entry), -OFFSET_RANGE, OFFSET_RANGE, 0) / OFFSET_RANGE
            : 0
        u.uCrumple.value = crumple

        // The lean only applies to paper lying flat; the wad has its tumble.
        const ease = 1 - Math.exp(-dt * 6)
        this.lean.x += (this.lean.tx - this.lean.x) * ease
        this.lean.y += (this.lean.ty - this.lean.y) * ease
        const flatness = 1 - crumple
        this.mesh.rotation.set(
            rot.x + this.lean.y * S.tilt * flatness,
            rot.y + this.lean.x * S.tilt * flatness,
            rot.z
        )
        this.mesh.scale.setScalar(Math.max(1e-4, scale))

        this.setCursor(this.tl.phase === "hold" ? "pointer" : "default")
        this.renderer.render(this.scene, this.camera)
    }

    /* ---- input -------------------------------------------------------------- */

    /** A click while a poster lies flat sends it on. Ignored mid-crumple, so
     * an impatient double-click does not skip a poster unseen. */
    advance() {
        if (this.tl.phase === "hold") this.tl.advance = true
    }

    private onPointerMove = (event: PointerEvent) => {
        const rect = this.container.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return
        // Measured against the box that is on screen, so a Framer canvas zoom
        // or any CSS transform above the frame does not skew it.
        this.lean.tx = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1, 0)
        this.lean.ty = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1, 0)
    }

    private onPointerEnter = () => {
        // Hover is the same trigger as a click, fired on entry rather than a
        // tap: the poster sent on as soon as the pointer arrives.
        if (this.cfg.playback.play === "hover") this.advance()
    }

    private onPointerLeave = () => {
        this.lean.tx = 0
        this.lean.ty = 0
    }

    private onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return
        this.press = { x: event.clientX, y: event.clientY, id: event.pointerId }
    }

    private onPointerUp = (event: PointerEvent) => {
        if (event.pointerId !== this.press.id) return
        this.press.id = -1
        const moved = Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y)
        if (moved <= TAP_SLOP) this.advance()
    }

    private attach() {
        const node = this.container
        node.addEventListener("pointermove", this.onPointerMove)
        node.addEventListener("pointerenter", this.onPointerEnter)
        node.addEventListener("pointerleave", this.onPointerLeave)
        node.addEventListener("pointerdown", this.onPointerDown)
        node.addEventListener("pointerup", this.onPointerUp)
        // Nothing to animate while the frame is scrolled out of view, and the
        // clock does not run either — so the opening plays when it arrives.
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
        node.removeEventListener("pointerenter", this.onPointerEnter)
        node.removeEventListener("pointerleave", this.onPointerLeave)
        node.removeEventListener("pointerdown", this.onPointerDown)
        node.removeEventListener("pointerup", this.onPointerUp)
        this.observer?.disconnect()
        this.observer = null
    }

    /** Written straight to the node, and only on a change. */
    private setCursor(value: string) {
        if (this.container.style.cursor === value) return
        this.container.style.cursor = value
    }

    /* ---- host --------------------------------------------------------------- */

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)
        this.camera.aspect = this.width / this.height
        this.camera.updateProjectionMatrix()
        this.settingsCache = null
        this.applyConfig()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        this.settingsCache = null
        // Only the poster list owns textures, and loadPosters is a no-op when
        // the list has not changed. Everything else is a uniform.
        this.loadPosters()
        this.applyConfig()
    }

    /** One frame for the Framer canvas: the first poster, lying flat, so the
     * instance shows the user's own picture while they lay out the page. */
    renderStatic() {
        if (this.disposed) return
        this.tl.phase = "hold"
        this.tl.t = 0
        this.tl.index = 0
        this.draw(1)
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
            // A tab that has been in the background must not spend a whole
            // crumple in one frame.
            if (dt > 0.05) dt = 0.05
            this.advanceTimeline(dt)
            this.draw(dt)
        }
        this.frameId = requestAnimationFrame(loop)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.detach()
        this.geometry.dispose()
        this.material.dispose()
        this.blank.dispose()
        this.posters.forEach((p) => p?.texture.dispose())
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
 * @framerIntrinsicHeight 900
 * @framerDisableUnlink
 */
export default function CreaseFlyer(props: Partial<CreaseFlyerProps>) {
    const {
        images = DEFAULTS.images,
        background = DEFAULTS.background,
        posterWidth = DEFAULTS.posterWidth,
        posterHeight = DEFAULTS.posterHeight,
        paper = {"shadow":6,"creases":6.5,"crumple":6.7,"ballSize":5},
        tilt = DEFAULTS.tilt,
        playback = {"hold":2.5,"play":"loop","spin":5,"speed":5},
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<FlyerScene | null>(null)

    // Rebuilt per render rather than read through props inside the loop, so a
    // slider drag shows up on the next frame without the effect below ever
    // tearing the renderer down. Both groups are merged partial-safe.
    const cfgRef = useRef<Config>(null as unknown as Config)
    const cfg: Config = {
        images: Array.isArray(images) ? images : [],
        posterWidth,
        posterHeight,
        paper: { ...DEFAULT_PAPER, ...paper },
        tilt,
        playback: { ...DEFAULT_PLAYBACK, ...playback },
    }
    cfgRef.current = cfg

    /** What the textures are keyed on, so a re-ordered or re-cropped list is a
     * change and a re-render of the same list is not. */
    const imageKey = cfg.images
        .map((entry) => `${srcOf(imageOf(entry))}@${offsetOf(entry)}`)
        .join("|")

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: FlyerScene
        try {
            scene = new FlyerScene(container, cfgRef.current)
        } catch {
            // No WebGL — an empty frame rather than a thrown render.
            return
        }
        sceneRef.current = scene
        scene.setSize(container.clientWidth, container.clientHeight)

        const still = isStatic()
        if (still) {
            scene.onPostersReady = () => scene.renderStatic()
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
    }, [
        imageKey,
        posterWidth,
        posterHeight,
        tilt,
        cfg.paper.creases,
        cfg.paper.crumple,
        cfg.paper.ballSize,
        cfg.paper.shadow,
        cfg.playback.play,
        cfg.playback.hold,
        cfg.playback.speed,
        cfg.playback.spin,
    ])

    const clickToAdvance = cfg.playback.play === "click"
    const first = cfg.images[0]

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label={
                (first ? altOf(imageOf(first)) : "") ||
                "A poster that unfolds from a crumpled ball of paper, then is crumpled again for the next"
            }
            // Focusable only when a click is what moves it on, so the keyboard
            // can do the same; a looping instance is decoration.
            tabIndex={clickToAdvance ? 0 : undefined}
            onKeyDown={
                clickToAdvance
                    ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              sceneRef.current?.advance()
                          }
                      }
                    : undefined
            }
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 200,
                minHeight: 200,
                overflow: "hidden",
                background,
                outline: "none",
                ...style,
            }}
        />
    )
}

CreaseFlyer.displayName = "Crease Flyer"
CreaseFlyer.defaultProps = { ...DEFAULTS }
