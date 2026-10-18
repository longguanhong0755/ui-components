"use client"

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react"
import type { MotionValue, Transition } from "motion/react"
import { useEffect, useRef } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
import * as THREE from "three"

/* ------------------------------------------------------------------ *
 *  StencilMoon
 *
 *  Built after a reference animation supplied as eight frames: a sphere
 *  wrapped in rows of bold white "2024" on a flat deep blue, turning
 *  slowly, with a pinched star of type at one pole. Our component is
 *  called StencilMoon.
 *
 *  WHAT THE FRAMES SHOW, AND WHAT IS TRANSCRIBED HERE
 *
 *    Ground.      A flat #09409D, sampled off the frames. The same blue
 *                 shows between the letters, with nothing of the far side
 *                 visible through them: the type is a stencil on the near
 *                 hemisphere only, and the gaps are holes onto the ground.
 *    Size.        The sphere spans 562 of the frame's 720px width, centred
 *                 -- 78% of the short side.
 *    Rows.        Latitude bands of type, each a word repeated round the
 *                 sphere, nearly touching. About five bands cover the 150
 *                 degrees from the pole to the far limb, so six pole to
 *                 pole. "2024" goes round about four times a row, which is
 *                 what an undistorted word comes to at that row height.
 *    The pole.    The "floral and asterisk motif" is not drawn. It is the
 *                 rows themselves pinching into the pole of an ordinary
 *                 UV sphere, the way an equirectangular map pinches: the
 *                 nearer a band is to the pole, the shorter its circle and
 *                 the tighter its words crowd into petals. That pole faces
 *                 you, down and to the left: 0.86R from centre at -30
 *                 degrees off straight down, which puts the axis 30 degrees
 *                 out of the screen plane.
 *    The motion.  Across the eight frames the petals open out of the pole
 *                 and every band climbs one band's height towards the far
 *                 side, and frame 8 is frame 1 again. The rows STREAM out
 *                 of the pole; the sphere barely turns. That is the
 *                 repeating texture's offset scrolling in V (the brief's
 *                 RepeatWrapping), not a rotation, so it is the Flow
 *                 control. The pole drifts a few pixels between frames,
 *                 which is the Wobble.
 *    Finish.      Flat and unlit, no shading. The glyph edges are HARD:
 *                 measured across an edge, the frames go from ground to
 *                 full white inside two pixels. The bloom is not a bright
 *                 rim but a faint wide haze, lifting the gaps between the
 *                 letters by about a tenth of the way to white.
 *
 *  HOW IT IS DRAWN
 *
 *    One three.js sphere with a small unlit shader, the type as a mask.
 *    The words are drawn into an offscreen 2D canvas with the panel's own
 *    font, one band per line of Text, each word repeated round the band.
 *    The canvas is white on black and read as a mask only, so the glyph
 *    colour is one uniform and filtered edges never pick up a dark fringe.
 *    The texture wraps on both axes: round the sphere because every band
 *    is a whole number of words, and down it because the canvas holds
 *    exactly one tile of bands and the offset scrolls through it.
 *
 *    SHARP EDGES. A sampled bitmap of type is soft wherever it is not
 *    drawn at exactly one texel per pixel, and on a sphere it never is:
 *    the front is magnified, the limb and the pole crushed through the
 *    mipmaps. So the mask is not used as coverage. It is drawn with a
 *    small blur, which turns it into a smooth ramp across every edge -- a
 *    cheap distance field -- and the shader cuts that ramp at its middle,
 *    re-drawing the edge `fwidth` wide: one screen pixel, at any scale.
 *    Sharpness is how many pixels that edge is allowed.
 *
 *    The band height in the canvas is tied to the width -- `rowH = W / 2N`
 *    -- so a texel is square on the sphere's equator and the type is not
 *    stretched there whatever Rows says. Words are spaced out to fill the
 *    band rather than squeezed to fit it.
 *
 *  WHERE WE DEVIATE, AND WHY
 *
 *    - three.js directly, not @react-three/fiber with framer-motion-3d.
 *      One mesh does not need a reconciler, and framer-motion-3d is no
 *      longer maintained. The library's other 3D pieces do the same.
 *    - The bloom is a CSS drop-shadow on the canvas, not a post pass. Only
 *      the glyphs are opaque there, so the shadow follows the type and the
 *      limb exactly, and it costs one compositor filter rather than an
 *      effect composer and two extra render targets. A hairline halo sits
 *      under the wide haze; anything tighter and brighter than that smears
 *      the hard edge, which the first build did.
 *    - Entrance. The reference is a loop with no start. A landing section
 *      needs one, so the sphere scales and fades up as it comes into view,
 *      with a quarter turn and a surge of rows that the Transition plays.
 *    - Parallax. A section that ignores the pointer reads as a video, so
 *      the sphere leans a little towards the cursor.
 * ------------------------------------------------------------------ */

/* ----------------------------------------------------------- constants */

const TAU = Math.PI * 2
const DEG = Math.PI / 180

/** Vertical field of view. A long lens: the frames show almost no
 *  perspective swell, and the rows foreshorten like an orthographic
 *  sphere. Fixed -- perspective is the look, not a knob. */
const FOV_DEG = 22

/** Segments round and down the sphere. Enough that the limb stays a
 *  circle at any frame size and the pole pinch is smooth. */
const SEGMENTS_ROUND = 160
const SEGMENTS_DOWN = 112

/** Widest the type canvas gets. The front of a large sphere on a 2x screen
 *  covers about a thousand device pixels for a quarter of the texture's
 *  width, so this keeps it sharp there. */
const SHEET_WIDTH = 4096

/** Most lines of Text the sheet will hold. Each is a band; past this the
 *  canvas gets tall enough to start costing memory. */
const MAX_LINES = 12

/** Space between repeats of a word, as a share of the type's ink height.
 *  The frames run the words on with barely more than a letter gap. */
const WORD_GAP = 0.2

/** Most a band may tighten every gap to make a whole number of words, as
 *  a share of the ink height. Past this it drops a word instead. */
const MAX_TIGHTEN = 0.05

/** Row Gap 10, as the share of each band left empty. */
const MAX_ROW_GAP = 0.5

/** Flow 10, in bands per second. The frames climb one band per loop. */
const MAX_FLOW = 0.8

/** Spin 10, in radians per second about the polar axis. */
const MAX_SPIN = 0.6

/** Wobble 10, in degrees the axis drifts. The frames' 2 is about 3. */
const MAX_WOBBLE = 15

/** Rate of that drift, rad/s. Slow enough to read as drift, not rocking. */
const WOBBLE_RATE = 0.45

/** Parallax 10, in radians of lean with the cursor at the frame's edge. */
const MAX_PARALLAX = 0.4

/** Hover Speed 10, how many times faster Flow and Spin run while the
 *  pointer sits over the sphere. 0 leaves the pace unchanged. */
const MAX_HOVER_BOOST = 3

/** How fast the hover speed-up eases in and out once the pointer enters
 *  or leaves, per second. */
const HOVER_FOLLOW = 5

/** Drag 10's extra rotation per pixel the pointer drags, in radians. */
const DRAG_RATE = 0.006

/** How fast the lean catches the cursor, per second. Exponential, so it
 *  is the same feel at 60Hz and 120Hz. */
const PARALLAX_FOLLOW = 4

/** Where the entrance starts: scale, extra spin in radians, and extra
 *  bands of flow -- the rows surge out of the pole as the sphere lands. */
const INTRO_SCALE = 0.72
const INTRO_SPIN = Math.PI / 2
const INTRO_FLOW = 1.5

/** Glow 10, as the radius of the hairline halo and the wide haze, as a
 *  share of the sphere's radius, and their strength. Measured off the
 *  frames: on a 281px radius the gaps sit 20-40 levels above the ground
 *  out to about 10px from an edge, with no bright rim. Glow 4 is that. */
const GLOW_TIGHT = 0.008
const GLOW_WIDE = 0.085
const GLOW_TIGHT_ALPHA = 0.35
const GLOW_WIDE_ALPHA = 0.32

/** The blur the mask is drawn with, as a share of a band's height. This
 *  is the width of the ramp the shader cuts the edge out of: wide enough
 *  that the ramp survives the mipmaps at the limb, narrow enough that the
 *  cut does not visibly round the corners of the glyphs. */
const MASK_BLUR = 0.01

/** Sharpness 0 and 10, as the width of the glyph edge in device pixels.
 *  Geometric between them, so 8 -- the frames' hard edge -- is about one
 *  pixel and the low end opens out into a soft focus. */
const EDGE_AT_ZERO = 8
const EDGE_AT_TEN = 0.6

/** Brightness 0, as the share of the Text Color still shown. Never fully
 *  gone: the type is the component. */
const BRIGHTNESS_FLOOR = 0.08

/** The U of three's SphereGeometry that faces +Z, i.e. the camera, before
 *  any spin. Its azimuth is 2πU measured from -X towards +Z. */
const FRONT_U = 0.25

/** Ink height as a share of the em, until the face has been measured. */
const FALLBACK_INK = 0.72

/** Text is measured at this size and scaled. */
const PROBE = 100

/* ----------------------------------------------------------- defaults */

export interface StencilMoonFont {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    letterSpacing?: string | number
    /** Ignored for the type's size, which Rows decides. Only read to turn a
     *  px letter spacing into a share of the em. */
    fontSize?: string | number
}

export interface StencilMoonAxis {
    /** How far the pole leans out of the screen towards you, in degrees.
     *  0 puts the axis upright in the screen plane; 90 points the pole
     *  straight at you. */
    tilt: number
    /** Which way the facing pole sits, in degrees round the screen from
     *  straight down. Negative swings it left. */
    lean: number
    /** How far the axis drifts, 0..10. */
    wobble: number
}

const DEFAULT_TEXT = ["2027"]
const DEFAULT_BACKGROUND = "#000000"
const DEFAULT_TEXT_COLOR = "#FFFFFF"

const DEFAULT_FONT: StencilMoonFont = {
    variant: "Regular",
    fontSize: "16px",
    fontStyle: "normal",
    textAlign: "left",
    fontFamily: "Arvo",
    fontWeight: 800,
    lineHeight: "1.5em",
    letterSpacing: "0em",
} as StencilMoonFont

// Side by side with the frames, six bands drew the type at about three
// quarters of the reference's height on the sphere; five is the match.
const DEFAULT_ROWS = 8
const DEFAULT_SPHERE_SIZE = 78

const DEFAULT_AXIS: StencilMoonAxis = {
    tilt: 30,
    lean: -30,
    wobble: 2,
}

// The bands very nearly touch in the frames -- a tenth of a band apart.
const DEFAULT_ROW_GAP = 0.3

export interface StencilMoonFinish {
    /** How strongly the type shows, 0..10. 10 is Text Color as picked;
     *  lower lets the ground through it, for a softer, dimmer sphere. */
    brightness: number
    /** How hard the glyph edges are, 0..10. 8 is a one-pixel edge, the
     *  frames' crisp cut; lower opens it into a soft focus. */
    sharpness: number
    /** The haze off the type and the limb, 0..10. */
    glow: number
}

const DEFAULT_FINISH: StencilMoonFinish = {
    brightness: 10,
    sharpness: 10,
    glow: 4,
}

const DEFAULT_ANIMATE = true
const DEFAULT_PARALLAX = 0
const DEFAULT_FLOW = 7.1
// The frames do not turn: frame 8 lands on frame 1 with every word where it
// was. The bands' word-starts share one meridian (the reference's tile is
// one word wide), and the gap along it stays round the back.
const DEFAULT_SPIN = 10
const DEFAULT_HOVER_SPEED = 4.8
const DEFAULT_DRAG = false

/** Drives the entrance: the scale, fade, quarter turn and surge of rows
 *  as the sphere comes into view. Flow and Spin run on their own clock. */
const DEFAULT_TRANSITION: Transition = {
    mass: 1,
    type: "spring",
    delay: 0,
    bounce: 0.18,
    damping: 60,
    duration: 1.6,
    stiffness: 800,
}

/* --------------------------------------------------------------- props */

export interface StencilMoonProps {
    /** One band of type per line, cycled down the sphere. Each line is
     *  repeated round its band as many times as fits. Empty lines are
     *  skipped; an empty list falls back to "2024". */
    text?: string[]
    /** The ground. It also shows through every gap in the type. */
    background?: string
    /** The type's face. Its size is set by Rows, not by the font. */
    font?: StencilMoonFont
    textColor?: string
    /** Bands of type from pole to pole. */
    rows?: number
    /** The sphere's diameter as a share of the frame's short side, in %. */
    sphereSize?: number
    axis?: Partial<StencilMoonAxis>
    /** Empty space between bands, 0..10. 0 lets the rows touch. */
    rowGap?: number
    /** Brightness, Sharpness and Glow of the type. */
    finish?: Partial<StencilMoonFinish>
    /** Play the entrance when the sphere first comes into view. */
    animateIn?: boolean
    /** How far the sphere leans towards the cursor, 0..10. */
    parallax?: number
    /** How much faster Flow and Spin run while the pointer hovers the
     *  sphere, 0..10. 0 leaves the pace unchanged. */
    hoverSpeed?: number
    /** Let the pointer drag the sphere round by hand, on top of Spin. */
    drag?: boolean
    /** How fast the bands stream out of the facing pole, -10..10.
     *  Negative draws them back into it. */
    flow?: number
    /** Turn about the polar axis, -10..10. */
    spin?: number
    /** Drives the entrance (scale, fade, quarter turn, surge of rows).
     *  Flow, Spin and Wobble are a continuous loop and take no curve. */
    transition?: Transition
    style?: CSSProperties
}

/* ------------------------------------------------------------ helpers */

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

function finite(value: number | undefined, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

interface Rgba {
    r: number
    g: number
    b: number
    a: number
}

/** Any CSS colour the panel can hand us, as sRGB 0..255 plus alpha. Read
 *  through a 1x1 canvas so rgba(), hsl() and named colours all resolve,
 *  alpha included -- three's Color drops alpha. */
let swatch: CanvasRenderingContext2D | null = null
const colorCache = new Map<string, Rgba>()

function cssColor(input: string): Rgba {
    const hit = colorCache.get(input)
    if (hit) return hit
    if (!swatch) {
        const c = document.createElement("canvas")
        c.width = 1
        c.height = 1
        swatch = c.getContext("2d", { willReadFrequently: true })
    }
    if (!swatch) return { r: 255, g: 255, b: 255, a: 1 }
    swatch.globalCompositeOperation = "copy"
    swatch.fillStyle = "#000"
    swatch.fillStyle = input
    swatch.fillRect(0, 0, 1, 1)
    const d = swatch.getImageData(0, 0, 1, 1).data
    const out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }
    colorCache.set(input, out)
    return out
}

/* ------------------------------------------------------------- the type */

type Ctx2D = CanvasRenderingContext2D & { letterSpacing?: string }

function fontString(font: StencilMoonFont, size: number): string {
    const style = font.fontStyle || "normal"
    const weight = font.fontWeight ?? 700
    const family = font.fontFamily || (DEFAULT_FONT.fontFamily as string)
    return `${style} ${weight} ${size}px ${family}`
}

/** Letter spacing as a share of the em, whatever unit the panel used. */
function trackingEm(font: StencilMoonFont): number {
    const raw = font.letterSpacing
    const base = parseFloat(String(font.fontSize ?? "")) || 16
    if (typeof raw === "number") return Number.isFinite(raw) ? raw / base : 0
    if (typeof raw !== "string") return 0
    const n = parseFloat(raw)
    if (!Number.isFinite(n)) return 0
    const unit = raw.trim().toLowerCase()
    if (unit.endsWith("em")) return n
    if (unit.endsWith("%")) return n / 100
    return n / base
}

function hasNativeSpacing(ctx: Ctx2D): boolean {
    return "letterSpacing" in ctx
}

function setType(ctx: Ctx2D, font: StencilMoonFont, size: number, trackPx: number) {
    ctx.font = fontString(font, size)
    if (hasNativeSpacing(ctx)) ctx.letterSpacing = `${trackPx}px`
}

/** Advance of a line from its first glyph to the end of its last. */
function lineWidth(ctx: Ctx2D, text: string, trackPx: number): number {
    const w = ctx.measureText(text).width
    // Native spacing is added after every character, the last one too.
    if (hasNativeSpacing(ctx)) return w - trackPx
    return w + trackPx * (Array.from(text).length - 1)
}

function fillLine(ctx: Ctx2D, text: string, x: number, y: number, trackPx: number) {
    if (hasNativeSpacing(ctx) || trackPx === 0) {
        ctx.fillText(text, x, y)
        return
    }
    let at = x
    for (const ch of Array.from(text)) {
        ctx.fillText(ch, at, y)
        at += ctx.measureText(ch).width + trackPx
    }
}

interface Sheet {
    canvas: HTMLCanvasElement
    /** Bands in one tile of the sheet -- one per line of Text. */
    lines: number
}

/** The type, as one vertically-wrapping tile of bands: white on black,
 *  read as alpha. Band height is `W / 2N` so a texel is square on the
 *  equator and the words are their own shape there. */
function drawSheet(
    lines: string[],
    rows: number,
    gapShare: number,
    font: StencilMoonFont,
    maxSize: number
): Sheet | null {
    const count = lines.length
    if (count === 0) return null

    let width = Math.min(SHEET_WIDTH, maxSize)
    let rowH = Math.floor(width / (2 * rows))
    if (rowH * count > maxSize) rowH = Math.floor(maxSize / count)
    width = rowH * 2 * rows
    const height = rowH * count
    if (rowH < 4 || width < 16) return null

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const raw = canvas.getContext("2d")
    if (!raw) return null
    const ctx = raw as Ctx2D

    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = "#FFFFFF"
    // The ramp the shader cuts the edge from (see SHARP EDGES). Where the
    // canvas cannot filter, the plain antialiased edge is a one-texel ramp
    // and the cut still holds; it just softens sooner at the limb.
    const blur = Math.max(1, rowH * MASK_BLUR)
    if ("filter" in ctx) ctx.filter = `blur(${blur.toFixed(2)}px)`
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"

    const track = trackingEm(font)

    // One size for every band, set by the tallest ink among them, so a
    // list of different words still reads as one setting.
    setType(ctx, font, PROBE, track * PROBE)
    let inkMax = 0
    for (const line of lines) {
        const m = ctx.measureText(line)
        const ink = (m.actualBoundingBoxAscent || 0) + (m.actualBoundingBoxDescent || 0)
        inkMax = Math.max(inkMax, ink)
    }
    if (inkMax <= 0) inkMax = FALLBACK_INK * PROBE

    const target = rowH * (1 - gapShare)
    const baseSize = (PROBE * target) / inkMax

    for (let k = 0; k < count; k++) {
        const line = lines[k]
        let size = baseSize
        setType(ctx, font, size, track * size)
        let advance = lineWidth(ctx, line, track * size)
        // A line longer than the whole circumference has to come down in
        // size -- stretching it would distort the face.
        if (advance > width * 0.96) {
            size *= (width * 0.96) / advance
            setType(ctx, font, size, track * size)
            advance = lineWidth(ctx, line, track * size)
        }
        const m = ctx.measureText(line)
        const ascent = m.actualBoundingBoxAscent || FALLBACK_INK * size
        const descent = m.actualBoundingBoxDescent || 0
        const gap = target * WORD_GAP

        // A whole number of words, so the band meets itself at the seam.
        // Whatever that leaves over is shared out across EVERY gap in the
        // band -- between letters as well as between words -- rather than
        // dumped into the word gap: there it lines up down every band into
        // one blank meridian that sweeps past as the sphere turns. Rounding
        // may also ask the band to tighten; past a hair it drops a word
        // and loosens instead, so letters never collide.
        const glyphs = Math.max(1, Array.from(line).length)
        let repeats = Math.max(1, Math.round(width / (advance + gap)))
        let share = (width / repeats - advance - gap) / glyphs
        if (share < -MAX_TIGHTEN * target && repeats > 1) {
            repeats -= 1
            share = (width / repeats - advance - gap) / glyphs
        }
        const spacing = track * size + share
        setType(ctx, font, size, spacing)
        const drawn = advance + share * (glyphs - 1)
        const slot = width / repeats
        const baseline = k * rowH + (rowH - (ascent + descent)) / 2 + ascent
        // Words are centred from U = 0.25, the meridian that faces the
        // camera at rest whatever the Axis -- the tilt and lean turn the
        // sphere about the view axis and the X axis, neither of which
        // moves the azimuth in front of you. So every band shows a whole
        // word facing you, as the frames do, and the gap between repeats
        // sits off to the sides. A word that crosses the seam is drawn on
        // both sides of it.
        for (let i = 0; i < repeats; i++) {
            const centre = (width * FRONT_U + i * slot) % width
            const x = centre - drawn / 2
            fillLine(ctx, line, x, baseline, spacing)
            if (x < 0) fillLine(ctx, line, x + width, baseline, spacing)
            if (x + drawn > width) fillLine(ctx, line, x - width, baseline, spacing)
        }
    }

    return { canvas, lines: count }
}

/* ------------------------------------------------------------- shader */

/** `uMaskMatrix` is the texture's own offset/repeat, so the scroll still
 *  lives on `texture.offset` where RepeatWrapping expects it. */
const VERT = `
uniform mat3 uMaskMatrix;
varying vec2 vUv;
void main() {
    vUv = (uMaskMatrix * vec3(uv, 1.0)).xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/** See SHARP EDGES. The mask is a smooth ramp across every glyph edge;
 *  its middle is the edge, and `fwidth` says how much of the ramp one
 *  device pixel spans here, so the cut is `uEdge` pixels wide wherever
 *  this fragment sits -- magnified at the front or crushed at the pole. */
const FRAG = `
uniform sampler2D uMask;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uEdge;
varying vec2 vUv;
void main() {
    float d = texture2D(uMask, vUv).g;
    float w = max(fwidth(d) * uEdge, 1e-4);
    float cover = clamp((d - 0.5) / w + 0.5, 0.0, 1.0);
    gl_FragColor = vec4(uColor, cover * uAlpha);
    #include <colorspace_fragment>
}
`

/* ------------------------------------------------------------ runtime */

/** Live settings the draw loop reads, so a slider repaints the next frame
 *  without tearing the renderer down. */
interface Live {
    textColor: string
    sphereSize: number
    tilt: number
    lean: number
    wobble: number
    /** 0..1 share of the Text Color shown. */
    brightness: number
    /** Edge width in device pixels. */
    edge: number
    glow: number
    parallax: number
    flow: number
    spin: number
    hoverSpeedMul: number
    dragEnabled: boolean
}

interface Runtime {
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    /** Pointer lean, outermost. */
    tiltRig: THREE.Group
    /** The polar axis' orientation and wobble. */
    axisRig: THREE.Group
    mesh: THREE.Mesh
    material: THREE.ShaderMaterial
    uniforms: {
        uMask: THREE.IUniform<THREE.Texture | null>
        uMaskMatrix: THREE.IUniform<THREE.Matrix3>
        uColor: THREE.IUniform<THREE.Color>
        uAlpha: THREE.IUniform<number>
        uEdge: THREE.IUniform<number>
    }
    texture: THREE.CanvasTexture | null
    tileLines: number
    maxTexture: number
    width: number
    height: number
    /** Bands travelled, signed. */
    flow: number
    spin: number
    clock: number
    still: boolean
    visible: boolean
    pointer: { tx: number; ty: number; x: number; y: number }
    hover: boolean
    hoverT: number
    dragRot: { x: number; y: number }
    drag: { active: boolean; lastX: number; lastY: number }
    colorKey: string
    glowKey: string
    lastT: number
    raf: number
}

/* ----------------------------------------------------------- component */

export default function StencilMoon({
    text = DEFAULT_TEXT,
    background = DEFAULT_BACKGROUND,
    font,
    textColor = DEFAULT_TEXT_COLOR,
    rows = DEFAULT_ROWS,
    sphereSize = DEFAULT_SPHERE_SIZE,
    axis,
    rowGap = DEFAULT_ROW_GAP,
    finish,
    animateIn = DEFAULT_ANIMATE,
    parallax = DEFAULT_PARALLAX,
    hoverSpeed = DEFAULT_HOVER_SPEED,
    drag = DEFAULT_DRAG,
    flow = DEFAULT_FLOW,
    spin = DEFAULT_SPIN,
    transition = DEFAULT_TRANSITION,
    style,
}: StencilMoonProps) {
    const resolvedFont: StencilMoonFont = { ...DEFAULT_FONT, ...font }
    const resolvedAxis: StencilMoonAxis = { ...DEFAULT_AXIS, ...axis }
    const resolvedFinish: StencilMoonFinish = { ...DEFAULT_FINISH, ...finish }

    const words = (text ?? [])
        .filter((line) => typeof line === "string" && line.trim())
        .map((line) => line.trim())
        .slice(0, MAX_LINES)
    const lines = words.length > 0 ? words : DEFAULT_TEXT

    const bandCount = clamp(Math.round(finite(rows, DEFAULT_ROWS)), 2, 16)
    const gapShare = (clamp(finite(rowGap, DEFAULT_ROW_GAP), 0, 10) / 10) * MAX_ROW_GAP

    const hostRef = useRef<HTMLDivElement | null>(null)
    const stageRef = useRef<HTMLDivElement | null>(null)
    const runRef = useRef<Runtime | null>(null)

    const live: Live = {
        textColor,
        sphereSize: clamp(finite(sphereSize, DEFAULT_SPHERE_SIZE), 10, 160) / 100,
        tilt: finite(resolvedAxis.tilt, DEFAULT_AXIS.tilt) * DEG,
        lean: finite(resolvedAxis.lean, DEFAULT_AXIS.lean) * DEG,
        wobble: (clamp(finite(resolvedAxis.wobble, 0), 0, 10) / 10) * MAX_WOBBLE * DEG,
        brightness:
            BRIGHTNESS_FLOOR +
            (1 - BRIGHTNESS_FLOOR) *
                (clamp(finite(resolvedFinish.brightness, DEFAULT_FINISH.brightness), 0, 10) / 10),
        edge:
            EDGE_AT_ZERO *
            Math.pow(
                EDGE_AT_TEN / EDGE_AT_ZERO,
                clamp(finite(resolvedFinish.sharpness, DEFAULT_FINISH.sharpness), 0, 10) / 10
            ),
        glow: clamp(finite(resolvedFinish.glow, DEFAULT_FINISH.glow), 0, 10) / 10,
        parallax: (clamp(finite(parallax, 0), 0, 10) / 10) * MAX_PARALLAX,
        flow: (clamp(finite(flow, 0), -10, 10) / 10) * MAX_FLOW,
        spin: (clamp(finite(spin, 0), -10, 10) / 10) * MAX_SPIN,
        hoverSpeedMul: 1 + (clamp(finite(hoverSpeed, 0), 0, 10) / 10) * MAX_HOVER_BOOST,
        dragEnabled: !!drag,
    }
    const liveRef = useRef<Live>(live)
    liveRef.current = live

    /* ---- entrance: one motion value framer-motion plays ---- */

    const intro: MotionValue<number> = useMotionValue(animateIn ? 0 : 1)
    const opacity = useTransform(intro, [0, 1], [0, 1])
    // Unclamped, so a spring's overshoot carries through to the scale.
    const scale = useTransform(intro, (v: number) => INTRO_SCALE + (1 - INTRO_SCALE) * v)
    const inView = useInView(hostRef, { once: true, amount: 0.3 })
    const transitionKey = JSON.stringify(transition ?? null)

    useEffect(() => {
        const reduced =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        if (!animateIn || reduced) {
            intro.set(1)
            return
        }
        if (!inView) {
            intro.set(0)
            return
        }
        // Replays whenever the curve changes, so it can be previewed on
        // Framer's canvas by editing the Transition.
        intro.set(0)
        const controls = animate(0, 1, {
            ...transition,
            onUpdate: (v: number) => intro.set(v),
        })
        return () => controls.stop()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animateIn, inView, transitionKey])

    /* ---- the renderer, built once ---- */

    useEffect(() => {
        const host = hostRef.current
        const stage = stageRef.current
        if (!host || !stage) return

        const canvas = document.createElement("canvas")
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.display = "block"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        stage.appendChild(canvas)

        let renderer: THREE.WebGLRenderer
        try {
            renderer = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                // MSAA keeps the limb a clean circle; the type's own edges
                // are cut one pixel wide in the shader.
                antialias: true,
                powerPreference: "high-performance",
            })
        } catch {
            stage.removeChild(canvas)
            return
        }
        renderer.setClearColor(0x000000, 0)
        renderer.outputColorSpace = THREE.SRGBColorSpace

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.1, 100)

        const geometry = new THREE.SphereGeometry(1, SEGMENTS_ROUND, SEGMENTS_DOWN)
        const uniforms: Runtime["uniforms"] = {
            uMask: { value: null },
            uMaskMatrix: { value: new THREE.Matrix3() },
            uColor: { value: new THREE.Color(1, 1, 1) },
            uAlpha: { value: 1 },
            uEdge: { value: 1 },
        }
        // Unlit, like the MeshBasicMaterial the brief named -- the colour is
        // flat -- but with its own edge (see SHARP EDGES).
        const material = new THREE.ShaderMaterial({
            vertexShader: VERT,
            fragmentShader: FRAG,
            uniforms,
            transparent: true,
            // Front faces only: the gaps open onto the ground, never onto
            // the far side of the sphere. That is the frames' stencil.
            side: THREE.FrontSide,
            depthWrite: false,
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.visible = false

        const axisRig = new THREE.Group()
        // Lean round the screen applied after the tilt out of it, so the
        // two read independently: Tilt is how far the pole faces you,
        // Lean is where on the screen it sits.
        axisRig.rotation.order = "ZXY"
        axisRig.add(mesh)
        const tiltRig = new THREE.Group()
        tiltRig.add(axisRig)
        scene.add(tiltRig)

        const run: Runtime = {
            renderer,
            scene,
            camera,
            tiltRig,
            axisRig,
            mesh,
            material,
            uniforms,
            texture: null,
            tileLines: 1,
            maxTexture: renderer.capabilities.maxTextureSize || 4096,
            width: 1,
            height: 1,
            flow: 0,
            spin: 0,
            clock: 0,
            still:
                typeof window.matchMedia === "function" &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            visible: true,
            pointer: { tx: 0, ty: 0, x: 0, y: 0 },
            hover: false,
            hoverT: 0,
            dragRot: { x: 0, y: 0 },
            drag: { active: false, lastX: 0, lastY: 0 },
            colorKey: "",
            glowKey: "",
            lastT: 0,
            raf: 0,
        }
        runRef.current = run

        const resize = () => {
            const w = Math.max(1, host.clientWidth)
            const h = Math.max(1, host.clientHeight)
            run.width = w
            run.height = h
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
            renderer.setSize(w, h, false)
            camera.aspect = w / h
            camera.updateProjectionMatrix()
        }
        resize()

        const ro = new ResizeObserver(resize)
        ro.observe(host)

        const io = new IntersectionObserver(
            (entries) => {
                run.visible = entries.some((e) => e.isIntersecting)
            },
            { rootMargin: "120px" }
        )
        io.observe(host)

        // Rule: bind releases on window, not the element -- the pointer
        // can leave the sphere mid-drag.
        const endDrag = () => {
            run.drag.active = false
        }
        window.addEventListener("pointerup", endDrag)
        window.addEventListener("pointercancel", endDrag)

        const tanHalf = Math.tan((FOV_DEG * DEG) / 2)

        const tick = (now: number) => {
            run.raf = requestAnimationFrame(tick)
            const dt = run.lastT ? Math.min((now - run.lastT) / 1000, 0.05) : 1 / 60
            run.lastT = now
            if (!run.visible || document.hidden) return

            const p = liveRef.current
            const pace = run.still ? 0 : dt
            run.clock += pace
            const hoverTarget = run.hover ? 1 : 0
            run.hoverT += (hoverTarget - run.hoverT) * (1 - Math.exp(-dt * HOVER_FOLLOW))
            const speedMul = run.still ? 1 : 1 + run.hoverT * (p.hoverSpeedMul - 1)
            run.flow += pace * p.flow * speedMul
            run.spin = (run.spin + pace * p.spin * speedMul) % TAU

            // What is left of the entrance. A spring may overshoot past 1,
            // which lets the turn and the surge settle back as well.
            const late = 1 - intro.get()

            /* --- the bands streaming out of the pole ---
             * One band is 1/N of V, and the tile of `lines` bands is
             * repeated N/lines times, so a band is 1/lines of the tile.
             * The offset falls as the type climbs north, away from the
             * facing pole. */
            const tex = run.texture
            if (tex) {
                const surge = late * INTRO_FLOW * (p.flow < 0 ? -1 : 1)
                const o = -(run.flow + surge) / run.tileLines
                tex.offset.y = o - Math.floor(o)
                tex.updateMatrix()
                uniforms.uMaskMatrix.value.copy(tex.matrix)
            }

            mesh.rotation.y = run.spin + late * INTRO_SPIN * (p.spin < 0 ? -1 : 1)

            /* --- the axis, and its drift --- */
            const tilt = p.tilt + Math.sin(run.clock * WOBBLE_RATE) * p.wobble
            const lean = p.lean + Math.cos(run.clock * WOBBLE_RATE * 0.77) * p.wobble * 0.7
            // Negative X brings the south pole -- the one the type's feet
            // point at -- round to face the camera.
            axisRig.rotation.set(-tilt, 0, lean)

            /* --- lean towards the cursor --- */
            const pt = run.pointer
            const follow = 1 - Math.exp(-dt * PARALLAX_FOLLOW)
            pt.x += (pt.tx - pt.x) * follow
            pt.y += (pt.ty - pt.y) * follow
            tiltRig.rotation.set(
                pt.y * p.parallax + run.dragRot.x,
                pt.x * p.parallax + run.dragRot.y,
                0
            )

            /* --- framing: the limb, not the centre, at Sphere Size ---
             * A unit sphere at distance d shows a silhouette of radius
             * 1 / sqrt(d^2 - 1) at unit depth. Solve for d so that is the
             * asked share of the short side's half-extent. */
            const aspect = run.width / run.height
            const k = Math.max(0.01, p.sphereSize * tanHalf * Math.min(aspect, 1))
            camera.position.set(0, 0, Math.sqrt(1 + 1 / (k * k)))
            camera.lookAt(0, 0, 0)

            /* --- colour, brightness, edge --- */
            const ink = cssColor(p.textColor)
            if (run.colorKey !== p.textColor) {
                run.colorKey = p.textColor
                uniforms.uColor.value.setRGB(
                    ink.r / 255,
                    ink.g / 255,
                    ink.b / 255,
                    THREE.SRGBColorSpace
                )
            }
            // Brightness lets the ground through the type rather than
            // darkening it: dimmed white on blue goes pale blue, which is
            // the soft version of this look, not a muddy grey.
            uniforms.uAlpha.value = ink.a * p.brightness
            uniforms.uEdge.value = p.edge

            /* --- bloom ---
             * A drop-shadow on the canvas: only the type is opaque there,
             * so the halo follows the glyphs and the limb exactly. It is
             * shadowing what is drawn, so it dims with Brightness too. */
            const radiusPx = (p.sphereSize * Math.min(run.width, run.height)) / 2
            let filter = "none"
            if (p.glow > 0) {
                const rgb = `${ink.r}, ${ink.g}, ${ink.b}`
                const tight = Math.max(0.5, p.glow * GLOW_TIGHT * radiusPx).toFixed(2)
                const wide = (p.glow * GLOW_WIDE * radiusPx).toFixed(2)
                filter =
                    `drop-shadow(0 0 ${tight}px rgba(${rgb}, ${GLOW_TIGHT_ALPHA.toFixed(3)})) ` +
                    `drop-shadow(0 0 ${wide}px rgba(${rgb}, ${GLOW_WIDE_ALPHA.toFixed(3)}))`
            }
            if (run.glowKey !== filter) {
                run.glowKey = filter
                canvas.style.filter = filter
            }

            renderer.render(scene, camera)
        }
        run.raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(run.raf)
            ro.disconnect()
            io.disconnect()
            window.removeEventListener("pointerup", endDrag)
            window.removeEventListener("pointercancel", endDrag)
            if (run.texture) run.texture.dispose()
            geometry.dispose()
            material.dispose()
            renderer.dispose()
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
            runRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /* ---- the type sheet, rebuilt when what is on it changes ---- */

    const sheetKey = JSON.stringify([
        lines,
        bandCount,
        gapShare,
        resolvedFont.fontFamily,
        resolvedFont.fontWeight,
        resolvedFont.fontStyle,
        resolvedFont.letterSpacing,
        resolvedFont.fontSize,
    ])

    useEffect(() => {
        const run = runRef.current
        if (!run) return
        let cancelled = false

        const build = () => {
            if (cancelled || runRef.current !== run) return
            const sheet = drawSheet(lines, bandCount, gapShare, resolvedFont, run.maxTexture)
            if (!sheet) return
            const tex = new THREE.CanvasTexture(sheet.canvas)
            // A ramp, not colour: read straight, no sRGB decode.
            tex.colorSpace = THREE.NoColorSpace
            tex.wrapS = THREE.RepeatWrapping
            tex.wrapT = THREE.RepeatWrapping
            tex.anisotropy = run.renderer.capabilities.getMaxAnisotropy()
            tex.repeat.set(1, bandCount / sheet.lines)
            if (run.texture) tex.offset.copy(run.texture.offset)
            const old = run.texture
            run.texture = tex
            run.tileLines = sheet.lines
            run.uniforms.uMask.value = tex
            tex.updateMatrix()
            run.uniforms.uMaskMatrix.value.copy(tex.matrix)
            run.mesh.visible = true
            if (old) old.dispose()
        }

        build()

        // The face may not be loaded yet -- Framer loads fonts lazily --
        // so draw again once it is, and whenever a font finishes loading.
        const fonts = typeof document !== "undefined" ? document.fonts : undefined
        if (fonts) {
            fonts
                .load(fontString(resolvedFont, PROBE), lines.join(""))
                .then(() => build())
                .catch(() => undefined)
            fonts.addEventListener("loadingdone", build)
        }
        return () => {
            cancelled = true
            if (fonts) fonts.removeEventListener("loadingdone", build)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sheetKey])

    /* ---- pointer ---- */

    const onPointerMove = (ev: ReactPointerEvent<HTMLDivElement>) => {
        const run = runRef.current
        const host = hostRef.current
        if (!run || !host) return
        const rect = host.getBoundingClientRect()
        run.pointer.tx = clamp(((ev.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1, -1, 1)
        run.pointer.ty = clamp(((ev.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1, -1, 1)
        if (run.drag.active) {
            const dx = ev.clientX - run.drag.lastX
            const dy = ev.clientY - run.drag.lastY
            run.drag.lastX = ev.clientX
            run.drag.lastY = ev.clientY
            run.dragRot.y += dx * DRAG_RATE
            run.dragRot.x = clamp(run.dragRot.x + dy * DRAG_RATE, -1.2, 1.2)
        }
    }
    const onPointerDown = (ev: ReactPointerEvent<HTMLDivElement>) => {
        const run = runRef.current
        if (!run || !liveRef.current.dragEnabled) return
        run.drag.active = true
        run.drag.lastX = ev.clientX
        run.drag.lastY = ev.clientY
    }
    const onPointerEnter = () => {
        const run = runRef.current
        if (run) run.hover = true
    }
    const onPointerLeave = () => {
        const run = runRef.current
        if (!run) return
        run.pointer.tx = 0
        run.pointer.ty = 0
        run.hover = false
    }

    return (
        <div
            ref={hostRef}
            onPointerEnter={onPointerEnter}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerLeave={onPointerLeave}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                ...style,
            }}
        >
            <motion.div
                ref={stageRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity,
                    scale,
                }}
            />
        </div>
    )
}
