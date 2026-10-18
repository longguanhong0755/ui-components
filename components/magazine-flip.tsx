"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/* --------------------------------------------------------------- constants --
 * The camera and the deck's proportions are the look, not knobs. They are
 * pinned here and the panel's px sizes are solved against them.
 */

/** Vertical field of view. The source's value; a wider one flattens the grazing
 * angle the whole effect is built on. */
const CAM_FOV = 75

/** How far back the camera sits, in world units. Everything on screen is
 * derived from this and the frame's pixel height, so a page measured in px is
 * the same fraction of the frame at any size. */
const CAM_Z = 6

/** World units of frame height visible at z = 0. */
const VIEW_HEIGHT = 2 * CAM_Z * Math.tan((CAM_FOV * Math.PI) / 360)

/** Segments across the sheet. The riffle bends it along its width and the wave
 * bends it along its height, so both axes need enough vertices to curve rather
 * than fold. Past this the silhouette stops improving. */
const PAGE_SEGMENTS = 40

/** Instances are allocated once at this ceiling and `mesh.count` is moved, so
 * dragging Pages never rebuilds a buffer. */
const MAX_PAGES = 60

/** A sheet's thickness as a fraction of its width. Small enough that the edge
 * is a hairline, large enough that a stacked deck has visible depth. */
const THICKNESS_RATIO = 0.005

/** The ends of the Offset slider. Not pixels: ±this is the picture's own
 * leading or trailing edge flush with the sheet, whatever slack the crop
 * happens to leave. Measured in px it would be measured against a crop the user
 * cannot see the size of, and would spend most of its travel pinned against an
 * edge. */
const OFFSET_RANGE = 250

/** Atlas cells are square and capped, so a long Images list stays inside one
 * texture the driver will actually accept. */
const CELL_MAX = 512
const ATLAS_MAX = 4096

/** With no images the deck still has to read as a deck, so the stand-ins are
 * numbered and carry the varied aspect ratios real pages come in. */
const PLACEHOLDER_ASPECTS = [
    0.72, 1.5, 0.78, 1.33, 1.0, 1.62, 0.68, 1.2, 0.86, 1.45,
]
const PLACEHOLDER_COUNT = 10

/* ---------------------------------------------------------------- defaults --
 * One source of truth per group: the signature merges these and each control's
 * `defaultValue` points at the same constant, so the panel and the props can
 * never drift.
 */

const DEFAULT_VIEW = {
    tap: true,
    zoom: 5,
    speed: 5,
}

const DEFAULT_TRAVEL = {
    drift: 2,
    smoothing: 5,
    wave: 5,
}

const DEFAULTS = {
    images: [{"image":{"src":"https://images.unsplash.com/photo-1656872626435-0d5b22738091?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDExN3x8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1687618083947-691b6c4adb4d?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDEzMnx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1689872330402-fef4837b23c4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDEzNHx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1741335661494-a2c26dfa7613?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDEzNnx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1735485410477-27bbc75261ff?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE0MXx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1757008845699-431fc010a051?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE0NXx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1617866238699-c96c5b1e5639?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE0OHx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1729779831897-5b8ce9aca81d?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE1Nnx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1744732053134-8890d62d9db4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE3Mnx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1697215786004-682b1684c65e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE3Nnx8fGVufDB8fHx8fA%3D%3D","alt":""},"offsetY":0}],
    background: "#000000",
    pages: 20,
    spacing: 5,
    tilt: 0,
    turn: 0,
    pageWidth: 600,
    pageHeight: 500,
    view: DEFAULT_VIEW,
    scrollSens: 5,
    travel: DEFAULT_TRAVEL,
}

/** How dark the corridor goes behind a sheet that is being held up. The look,
 * not a knob: any less and the display does not separate, any more and the
 * component reads as switched off. */
const CORRIDOR_DIM = 0.22

/** How far a pointer may travel and still count as a tap rather than a drag,
 * in px, and how long it may be held. */
const TAP_SLOP = 6
const TAP_MS = 600

/** The ID buffer is the whole frame, redrawn at up to this on its long side.
 * Small enough to allocate without thinking about it, large enough that a sheet
 * is several pixels wide everywhere but the very middle of the frame — where it
 * is a line on screen too, and a tap there is ambiguous however it is
 * answered. */
const PICK_MAX = 1600

/* ------------------------------------------------------------------- types -- */

type ResponsiveImage = { src?: string; srcSet?: string; alt?: string } | string

/**
 * One Images row: the picture, and which band of the crop shows. The field is
 * still `offsetY` although it now moves whichever axis the crop hides, because
 * it is the key instances already on a canvas have their value stored under and
 * renaming it would quietly reset every one of them. A bare responsive image is
 * what an older instance holds — and what `ControlType.ResponsiveImage`'s own
 * string/object shapes are — so both still resolve.
 */
type ImageEntry = { image?: ResponsiveImage; offsetY?: number } | ResponsiveImage

export interface View {
    /** Whether tapping a sheet lifts it out of the line. */
    tap: boolean
    /** How much of the frame the held-up sheet fills. */
    zoom: number
    /** How fast it travels out of the line and back. */
    speed: number
}

export interface Travel {
    /** How fast the corridor walks on its own, signed. */
    drift: number
    /** How much weight the corridor carries after the input stops. */
    smoothing: number
    /** How hard a fast pass bows each sheet. 0 keeps them flat. */
    wave: number
}

export interface MagazineFlipProps {
    /** The pages. Empty falls back to numbered placeholders. */
    images: ImageEntry[]
    background: string
    /** Sheets in the deck. Fewer images than pages simply repeat. */
    pages: number
    /** Gap between sheets once the deck has split, on an abstract scale. */
    spacing: number
    /** Resting pitch of the whole corridor. */
    tilt: number
    /** How far the sheets turn to face you. 0 is the source's grazing view. */
    turn: number
    pageWidth: number
    pageHeight: number
    view: Partial<View>
    /** How far one notch of wheel walks the corridor. */
    scrollSens: number
    travel: Partial<Travel>
    style?: React.CSSProperties
}

type Config = {
    images: ImageEntry[]
    pages: number
    spacing: number
    tilt: number
    turn: number
    pageWidth: number
    pageHeight: number
    view: View
    scrollSens: number
    travel: Travel
}

/* ----------------------------------------------------------------- helpers -- */

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
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

/** GSAP's power2.inOut, the curve the source plays its timelines on and what
 * the tap blend is eased with here. Cubic, not quadratic — power1 is the
 * quadratic one. */
function power2InOut(t: number): number {
    if (t <= 0) return 0
    if (t >= 1) return 1
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Panel values are abstract scales; the shader wants world units. Every mapping
 * lands its default on the source's own number, so a default instance is the
 * original and the sliders open out from there.
 */
function settingsFor(cfg: Config, viewWidthPx: number, viewHeightPx: number) {
    const worldPerPx = VIEW_HEIGHT / Math.max(1, viewHeightPx)
    const viewAspect = Math.max(1, viewWidthPx) / Math.max(1, viewHeightPx)
    const pageWidthPx = clamp(cfg.pageWidth, 40, 1200, DEFAULTS.pageWidth)
    const pageHeightPx = clamp(cfg.pageHeight, 40, 1600, DEFAULTS.pageHeight)
    const pageWidth = pageWidthPx * worldPerPx
    const pageHeight = pageHeightPx * worldPerPx
    const spacing = clamp(cfg.spacing, 0, 10, DEFAULTS.spacing)
    const smoothing = clamp(
        cfg.travel.smoothing,
        0,
        10,
        DEFAULT_TRAVEL.smoothing
    )
    const wave = clamp(cfg.travel.wave, 0, 10, DEFAULT_TRAVEL.wave)
    const drift = clamp(cfg.travel.drift, -10, 10, DEFAULT_TRAVEL.drift)

    // Where a held-up sheet sits: in front of the corridor, which reaches to
    // about a page width ahead of the origin, but never so close to the camera
    // that it starts clipping.
    const focusZ = Math.min(CAM_Z * 0.55, pageWidth * 0.75)
    // The frame, measured on that plane rather than at the origin — it is
    // nearer the camera, so it is a smaller window and the sheet needs less
    // scaling to fill it.
    const planeHeight = (VIEW_HEIGHT * (CAM_Z - focusZ)) / CAM_Z
    const planeWidth = planeHeight * viewAspect
    const fill = 0.6 + clamp(cfg.view.zoom, 0, 10, DEFAULT_VIEW.zoom) * 0.04

    return {
        pageWidth,
        pageHeight,
        pageWidthPx,
        pageHeightPx,
        worldPerPx,
        pages: Math.round(clamp(cfg.pages, 4, MAX_PAGES, DEFAULTS.pages)),
        // Proportional to the sheet, never absolute: the deck holds its
        // composition when Page Width moves. 5 lands on the source's spacing of
        // half a page width.
        pageSpacing: pageWidth * (0.1 + spacing * 0.08),
        thickness: pageWidth * THICKNESS_RATIO,
        tilt: (clamp(cfg.tilt, -45, 45, DEFAULTS.tilt) * Math.PI) / 180,
        turn: (clamp(cfg.turn, -60, 60, DEFAULTS.turn) * Math.PI) / 180,
        // The bow is a world-unit displacement along the corridor, so it scales
        // with the sheet too. 5 lands on the source's 0.4 at a 2-unit page.
        wave: pageWidth * 0.04 * wave,
        // Geometric, not linear: the top of the slider has to reach a genuinely
        // heavy corridor, and a linear ramp spends most of its travel between
        // "instant" and "nearly instant". 5 lands on the source's 0.12 per
        // 60Hz frame.
        lerp: 0.35 * Math.pow(0.82, smoothing),
        driftPerSecond: drift * pageWidth * 0.15,
        wheel: 0.4 + clamp(cfg.scrollSens, 0, 10, DEFAULTS.scrollSens) * 0.16,
        tapToView: cfg.view.tap !== false,
        focusZ,
        // Whichever of the two axes runs out first, so a landscape page in a
        // tall frame is held at the frame's width and a portrait one at its
        // height. Both are solved on the display plane, so Zoom means the same
        // fraction of what you can see at any frame size.
        focusScale: Math.min(
            (planeHeight * fill) / pageHeight,
            (planeWidth * fill) / pageWidth
        ),
        // Seconds out of the line, and the same back.
        viewDuration:
            1.6 - clamp(cfg.view.speed, 0, 10, DEFAULT_VIEW.speed) * 0.13,
    }
}

/* ------------------------------------------------------------------ shader -- */

const PAGE_VERTEX = /* glsl */ `
attribute float aIndex;
attribute vec4 aRect;
attribute float aAspect;
attribute float aOffset;

uniform float uPageThickness;
uniform float uPageWidth;
uniform float uPageHeight;
uniform float uMeshCount;
uniform float uPageSpacing;
uniform float uScrollY;
uniform float uSpeedY;
uniform float uWave;
uniform float uTilt;
uniform float uTurn;
uniform float uFocusIndex;
uniform float uFocusProgress;
uniform float uFocusScale;
uniform float uFocusZ;

varying vec2 vUv;
varying vec4 vRect;
varying float vAspect;
varying float vOffset;
varying float vIndex;
varying float vDim;

/** Kept as a half-turn rather than a bare PI: three prepends its own defines to
 * a ShaderMaterial, and a global named PI is one collision away from a shader
 * that will not compile. */
const float TAU_HALF = 3.14159265359;

mat3 rotY(float a) {
    return mat3(cos(a), 0.0, sin(a), 0.0, 1.0, 0.0, -sin(a), 0.0, cos(a));
}

mat3 rotX(float a) {
    return mat3(1.0, 0.0, 0.0, 0.0, cos(a), -sin(a), 0.0, sin(a), cos(a));
}

void main() {
    float PI = TAU_HALF;

    // The geometry is a unit box and the sheet's size arrives as uniforms, so a
    // Page Width drag is a uniform write rather than a geometry rebuild.
    vec3 basePos = vec3(
        position.x * uPageWidth,
        position.y * uPageHeight,
        position.z * uPageThickness
    );

    // Sheets turn about the spine — the left edge, not the middle. It is also
    // the pivot the tap blend walks away from.
    vec3 rotationCenter = vec3(-uPageWidth * 0.5, 0.0, 0.0);

    float fromMiddle = aIndex - (uMeshCount - 1.0) * 0.5;

    // The resting pose: the source's opening timeline evaluated at its end.
    // Every per-sheet term of the riffle cancels there — the index delay, the
    // stack along the deck's thickness, the crumple near the spine — and the
    // turns it accumulates fold back to a quarter, so what is left is the same
    // pair of angles on every sheet. Tilt and Turn are measured from it: at 0
    // you get the source's own grazing three-quarter view, and positive Turn
    // swings the sheets round to face you.
    float yAngle = -PI * 0.5 + uTurn;
    float xAngle = uTilt;

    // --- the scroll, wrapped ---
    // The corridor is walked in the sheet's own Z, before the rotation, so the
    // travel axis swings into place with everything else. Wrapping is done on
    // the sheet's centre and applied as one offset to all of its vertices —
    // wrapping each vertex would tear a sheet in half as it crossed the seam.
    float boxCenterZ = uPageSpacing * (-fromMiddle);
    float maxZ = uMeshCount * (uPageSpacing + uPageThickness) * 0.5;

    // Bow along the sheet's own height, scaled by how fast the corridor is
    // moving. Flat at rest; a fast pass curls every sheet the same way.
    float bow = sin((position.y + 0.5) * 2.0) * uWave;
    float speed = clamp(uSpeedY / uPageWidth * 4.0, -2.0, 2.0);

    float zCorridor = mod(boxCenterZ - uScrollY + maxZ, 2.0 * maxZ) - maxZ
        - bow * speed;

    // --- tap to view -------------------------------------------------------
    // 1 only on the sheet being held up.
    float focused = step(abs(aIndex - uFocusIndex), 0.5);
    float e = focused * uFocusProgress;

    // Rigid at every point of the blend, rather than a straight line drawn
    // between two poses: the pivot walks from the spine to the sheet's own
    // centre, both angles unwind to zero, its place in the corridor fades, and
    // it grows. It turns and travels — it never stretches.
    float k = mix(1.0, uFocusScale, e);
    vec3 pivot = rotationCenter * (1.0 - e);

    vec3 vertexLocal = basePos * k - pivot;
    vertexLocal.z += zCorridor * (1.0 - e);

    vec3 rotated = rotY(yAngle * (1.0 - e)) * vertexLocal + pivot;
    // Where the opening leaves the deck: half a page back along Z and half a
    // page along X, so the corridor stands centred on the origin rather than
    // hanging off its spine.
    rotated.z -= uPageWidth * 0.5 * (1.0 - e);
    rotated.x += uPageWidth * 0.5 * (1.0 - e);

    vec3 newPosition = rotX(xAngle * (1.0 - e)) * rotated;
    newPosition.z += uFocusZ * e;

    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    gl_Position = projectionMatrix * viewMatrix * modelPosition;

    vUv = uv;
    vRect = aRect;
    vAspect = aAspect;
    // A share of the picture's own crop, not a distance: ±1 is one of its own
    // edges flush with the sheet. The fragment shader scales it by whatever
    // slack this particular picture leaves, on whichever axis the crop hides.
    vOffset = aOffset;
    vIndex = aIndex;
    // Everything but the sheet being held up steps back into the dark.
    vDim = uFocusProgress * (1.0 - focused);
}
`

const PAGE_FRAGMENT = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uPageAspect;

varying vec2 vUv;
varying vec4 vRect;
varying float vAspect;
varying float vOffset;
varying float vDim;

void main() {
    // Cover, on the picture's own aspect: the sheet crops the overflow instead
    // of squeezing the photograph into the page's proportions. Exactly one axis
    // overflows — which one is decided by the picture, not by us — and Offset
    // slides the picture through whichever it is. The pages are portrait and
    // most photographs are not, so a control that only ever moved the picture
    // up and down would sit dead on nearly every list a user actually brings:
    // a 3:2 photograph on a 2:3 page hides 125% of its own width and nothing at
    // all of its height.
    vec2 uv = vUv;
    float s = vAspect / uPageAspect;
    // The share of the picture that survives on the overflowing axis, and how
    // far it can travel inside what is hidden. The offset arrives as a share of
    // that slack rather than a distance, so the ends of the slider are the
    // picture's own edges whatever this particular crop happens to leave.
    float band = min(s, 1.0 / s);
    float slack = (1.0 - band) * 0.5;
    float slide = clamp(vOffset, -1.0, 1.0) * slack;
    if (s >= 1.0) {
        // Wider than the sheet: its sides are hidden. Positive slides the
        // picture right, which brings its left edge into view — the same
        // direction of travel as positive does on a tall one.
        uv.x = (uv.x - 0.5) * band + 0.5 - slide;
    } else {
        // Taller: its top and bottom are hidden. Positive slides the picture
        // down, bringing its top edge into view.
        uv.y = (uv.y - 0.5) * band + 0.5 + slide;
    }

    // The cell's rect is stored inset by a texel, so a sheet's edge never picks
    // up its neighbour in the atlas.
    vec2 atlasUv = mix(vRect.xy, vRect.zw, clamp(uv, 0.0, 1.0));
    vec4 color = texture2D(uAtlas, atlasUv);

    // The corridor steps back while a sheet is held up, so the display reads
    // against something quieter than itself. Darkened, not faded: alpha would
    // put see-through sheets into the depth buffer ahead of solid ones and the
    // corridor would start showing through itself.
    gl_FragColor = vec4(color.rgb * mix(1.0, ${CORRIDOR_DIM.toFixed(2)}, vDim), color.a);
}
`

/**
 * The picking pass. Same vertex shader and the same uniforms — so whatever is
 * drawn at a pixel is exactly what answers for it — with the instance index
 * written out as a colour instead of the picture. Offset by one so that nothing
 * at all reads back as zero.
 */
const PICK_FRAGMENT = /* glsl */ `
varying float vIndex;

void main() {
    gl_FragColor = vec4((vIndex + 1.0) / 255.0, 0.0, 0.0, 1.0);
}
`

/* ------------------------------------------------------------------ atlas --
 * Thirty sheets are one draw call only if they share one texture, so every
 * picture is drawn into a grid of square cells and each instance carries the
 * rect it should sample. The cells are square rather than page-shaped so that
 * changing Page Width or Height never touches the atlas: the fragment shader
 * does the cover-fit, which is also what keeps Y Offset live.
 */

interface Cell {
    /** (u0, vBottom, u1, vTop) in atlas uv, inset by a texel. */
    rect: [number, number, number, number]
    /** The picture's own aspect, for the cover-fit in the fragment shader. */
    aspect: number
}

interface Atlas {
    texture: THREE.Texture
    cells: Cell[]
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
        // Without this the atlas canvas is tainted the moment a cross-origin
        // picture lands on it and the texture upload throws. A host that will
        // not send the header loses the picture, not the component.
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

function drawPlaceholder(
    ctx: CanvasRenderingContext2D,
    index: number,
    x: number,
    y: number,
    w: number,
    h: number
) {
    const hue = (index * 47) % 360
    const grad = ctx.createLinearGradient(x, y, x + w, y + h)
    grad.addColorStop(0, `hsl(${hue}, 22%, 27%)`)
    grad.addColorStop(0.55, `hsl(${hue}, 18%, 13%)`)
    grad.addColorStop(1, `hsl(${(hue + 40) % 360}, 24%, 23%)`)
    ctx.fillStyle = grad
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = "rgba(255,255,255,0.14)"
    ctx.lineWidth = Math.max(1, Math.round(w * 0.008))
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
    ctx.fillStyle = "rgba(255,255,255,0.68)"
    ctx.font = `500 ${Math.round(
        Math.min(w, h) * 0.26
    )}px ui-sans-serif, system-ui, -apple-system, sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(String(index + 1).padStart(2, "0"), x + w / 2, y + h / 2)
}

/**
 * Build the shared texture. `sources` may hold empty strings — a slot with no
 * picture, or one whose picture would not load, gets a numbered stand-in so the
 * deck never has a hole in it.
 */
async function buildAtlas(
    sources: string[],
    maxAnisotropy: number
): Promise<Atlas | null> {
    const n = Math.max(1, sources.length)
    const images = await Promise.all(
        sources.map((src) => (src ? loadImage(src) : Promise.resolve(null)))
    )

    const cols = Math.ceil(Math.sqrt(n))
    const rows = Math.ceil(n / cols)
    const cell = Math.min(CELL_MAX, Math.floor(ATLAS_MAX / Math.max(cols, rows)))
    const canvas = document.createElement("canvas")
    canvas.width = cols * cell
    canvas.height = rows * cell
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    const paint = (useImages: boolean): Cell[] => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const cells: Cell[] = []
        for (let i = 0; i < n; i++) {
            const cx = (i % cols) * cell
            const cy = Math.floor(i / cols) * cell
            const img = useImages ? images[i] : null
            const aspect =
                img && img.naturalHeight > 0
                    ? img.naturalWidth / img.naturalHeight
                    : PLACEHOLDER_ASPECTS[i % PLACEHOLDER_ASPECTS.length]
            // Contained, never stretched: the cell holds the whole picture on
            // its own proportions and the shader crops from there.
            const w = aspect >= 1 ? cell : cell * aspect
            const h = aspect >= 1 ? cell / aspect : cell
            const dx = cx + (cell - w) / 2
            const dy = cy + (cell - h) / 2
            if (img) ctx.drawImage(img, dx, dy, w, h)
            else drawPlaceholder(ctx, i, dx, dy, w, h)

            // A texel of inset on every side. Mipmaps average across cell
            // borders otherwise, and a sheet seen at a grazing angle is deep
            // into the mip chain.
            const u0 = (dx + 1) / canvas.width
            const u1 = (dx + w - 1) / canvas.width
            const vTop = 1 - (dy + 1) / canvas.height
            const vBottom = 1 - (dy + h - 1) / canvas.height
            cells.push({ rect: [u0, vBottom, u1, vTop], aspect })
        }
        return cells
    }

    let cells = paint(true)
    try {
        // A picture served without CORS headers taints the canvas, and the
        // failure would otherwise surface as a thrown upload inside the render
        // loop, once per frame. Catch it here and fall back to stand-ins.
        ctx.getImageData(0, 0, 1, 1)
    } catch {
        cells = paint(false)
    }

    const texture = new THREE.CanvasTexture(canvas)
    // Tagged as no colour space on purpose, so sampling returns the authored
    // sRGB bytes. The fragment shader writes them straight through and adds no
    // output encoding of its own — decoding on read without encoding on write
    // is what darkens everything.
    texture.colorSpace = THREE.NoColorSpace
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
    // The whole point of this component is sheets seen almost edge-on, which is
    // exactly the case trilinear filtering alone blurs to mush.
    texture.anisotropy = maxAnisotropy
    texture.needsUpdate = true
    return { texture, cells }
}

/** A neutral 1x1 to draw with while the real atlas is still decoding. */
function blankTexture(): THREE.DataTexture {
    const t = new THREE.DataTexture(
        new Uint8Array([46, 46, 48, 255]),
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

class MagazineScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera: THREE.PerspectiveCamera
    private geometry: THREE.BoxGeometry
    private material: THREE.ShaderMaterial
    private pickMaterial: THREE.ShaderMaterial
    private mesh: THREE.InstancedMesh
    private blank: THREE.DataTexture
    private atlas: Atlas | null = null

    /** One pixel of render target, read back on a tap to say which sheet is
     * under the pointer. */
    private pickTarget = new THREE.WebGLRenderTarget(1, 1)
    private pickBuffer = new Uint8Array(4)

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false
    private atlasToken = 0
    private atlasKey = ""

    /** Instance buffers, allocated once at MAX_PAGES. */
    private rectAttr: THREE.InstancedBufferAttribute
    private aspectAttr: THREE.InstancedBufferAttribute
    private offsetAttr: THREE.InstancedBufferAttribute

    /** Where the input has pushed the corridor, and the eased value it rides. */
    private scroll = { target: 0, current: 0, speed: 0 }
    private drag = { active: false, lastX: 0, id: -1 }

    /**
     * Which sheet is being held up, how far out of the line it has travelled,
     * and which way it is going. `index` outlives `target` reaching 0, because
     * the sheet has to keep its identity all the way back into the corridor.
     */
    private focus = { index: -1, t: 0, target: 0 }

    /**
     * Where the pointer went down, so a drag is not mistaken for a tap — and
     * which sheet was under it at that moment. The hit is taken on the way down
     * rather than on the way up because the corridor is still drifting under the
     * finger: by the time a press is let go it has moved on, and the sheet the
     * user aimed at is no longer the one at those coordinates.
     */
    private tap = { x: 0, y: 0, at: 0, id: -1, hit: -1 }

    private settingsCache: ReturnType<typeof settingsFor> | null = null

    /** Set by the host so a static render can repaint once the pictures land. */
    onAtlasReady: (() => void) | null = null

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        // Transparent, not black: the Background control is a CSS fill on the
        // frame behind the canvas, so it takes any colour Framer can express.
        this.renderer.setClearColor(0x000000, 0)
        const canvas = this.renderer.domElement
        canvas.style.cssText =
            "position:absolute;inset:0;width:100%;height:100%;display:block"
        container.appendChild(canvas)

        this.camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 200)
        this.camera.position.z = CAM_Z
        this.scene.add(this.camera)

        this.blank = blankTexture()

        // A unit box: the sheet's real size is applied in the vertex shader, so
        // this is built once and never rebuilt.
        this.geometry = new THREE.BoxGeometry(
            1,
            1,
            1,
            PAGE_SEGMENTS,
            PAGE_SEGMENTS,
            1
        )

        this.material = new THREE.ShaderMaterial({
            vertexShader: PAGE_VERTEX,
            fragmentShader: PAGE_FRAGMENT,
            transparent: true,
            uniforms: {
                uPageThickness: { value: 0.01 },
                uPageWidth: { value: 2 },
                uPageHeight: { value: 3 },
                uMeshCount: { value: DEFAULTS.pages },
                uPageSpacing: { value: 1 },
                uScrollY: { value: 0 },
                uSpeedY: { value: 0 },
                uWave: { value: 0.4 },
                uTilt: { value: 0 },
                uTurn: { value: 0 },
                uFocusIndex: { value: -1 },
                uFocusProgress: { value: 0 },
                uFocusScale: { value: 1 },
                uFocusZ: { value: 0 },
                uPageAspect: { value: 2 / 3 },
                uAtlas: { value: this.blank as THREE.Texture },
            },
        })

        // The same uniforms object, deliberately: the pick has to agree with
        // the frame the user was looking at down to the last vertex, and two
        // copies of these values could not.
        this.pickMaterial = new THREE.ShaderMaterial({
            vertexShader: PAGE_VERTEX,
            fragmentShader: PICK_FRAGMENT,
            uniforms: this.material.uniforms,
        })

        this.mesh = new THREE.InstancedMesh(
            this.geometry,
            this.material,
            MAX_PAGES
        )
        // Every vertex is displaced in the shader, so the bounding sphere three
        // would cull against describes nothing that is actually on screen.
        this.mesh.frustumCulled = false

        const index = new Float32Array(MAX_PAGES)
        for (let i = 0; i < MAX_PAGES; i++) index[i] = i
        this.geometry.setAttribute(
            "aIndex",
            new THREE.InstancedBufferAttribute(index, 1)
        )
        this.rectAttr = new THREE.InstancedBufferAttribute(
            new Float32Array(MAX_PAGES * 4),
            4
        )
        this.aspectAttr = new THREE.InstancedBufferAttribute(
            new Float32Array(MAX_PAGES).fill(1),
            1
        )
        this.offsetAttr = new THREE.InstancedBufferAttribute(
            new Float32Array(MAX_PAGES),
            1
        )
        this.geometry.setAttribute("aRect", this.rectAttr)
        this.geometry.setAttribute("aAspect", this.aspectAttr)
        this.geometry.setAttribute("aOffset", this.offsetAttr)
        // Until the atlas lands every sheet reads the blank texture whole.
        for (let i = 0; i < MAX_PAGES; i++) this.rectAttr.setXYZW(i, 0, 0, 1, 1)
        this.rectAttr.needsUpdate = true

        this.scene.add(this.mesh)

        this.applyConfig()
        this.loadAtlas()
    }

    /* ---- everything the panel owns is a uniform or an instance attribute --- */

    private applyConfig() {
        const S = this.settings()
        const u = this.material.uniforms
        this.mesh.count = S.pages
        u.uMeshCount.value = S.pages
        u.uPageWidth.value = S.pageWidth
        u.uPageHeight.value = S.pageHeight
        u.uPageThickness.value = S.thickness
        u.uPageSpacing.value = S.pageSpacing
        u.uWave.value = S.wave
        u.uTilt.value = S.tilt
        u.uTurn.value = S.turn
        u.uPageAspect.value = S.pageWidthPx / S.pageHeightPx
        u.uFocusScale.value = S.focusScale
        u.uFocusZ.value = S.focusZ
        this.writeOffsets()
        // A sheet that has just been configured out of existence — the deck
        // shortened past it, or tap-to-view switched off — cannot be left held
        // up with nothing to put it back.
        if (this.focus.index >= S.pages || !S.tapToView) this.clearFocus()
    }

    private clearFocus() {
        this.focus.index = -1
        this.focus.t = 0
        this.focus.target = 0
        this.material.uniforms.uFocusIndex.value = -1
        this.material.uniforms.uFocusProgress.value = 0
    }

    /** The offsets are read where the picture is drawn, not baked in when a
     * sheet is created, so dragging one re-frames every sheet already on
     * screen. Normalised to ±1 on the way in: what the panel calls 250 is the
     * end of the picture, not 250 of anything, and only the fragment shader
     * knows which axis this crop hides or how much of it. */
    private writeOffsets() {
        const list = this.cfg.images
        const count = Math.max(1, list.length)
        for (let i = 0; i < MAX_PAGES; i++) {
            const entry = list.length ? list[i % count] : undefined
            const offset = entry
                ? clamp(offsetOf(entry), -OFFSET_RANGE, OFFSET_RANGE, 0)
                : 0
            this.offsetAttr.setX(i, offset / OFFSET_RANGE)
        }
        this.offsetAttr.needsUpdate = true
    }

    /** Which picture each sheet shows: the list, repeated, exactly as the source
     * cycles its own thirteen pages across thirty sheets. */
    private writeCells() {
        const cells = this.atlas?.cells
        if (!cells || !cells.length) return
        for (let i = 0; i < MAX_PAGES; i++) {
            const c = cells[i % cells.length]
            this.rectAttr.setXYZW(i, c.rect[0], c.rect[1], c.rect[2], c.rect[3])
            this.aspectAttr.setX(i, c.aspect)
        }
        this.rectAttr.needsUpdate = true
        this.aspectAttr.needsUpdate = true
    }

    private sourceList(): string[] {
        const list = this.cfg.images
        if (list && list.length) {
            return list.map((entry) => srcOf(imageOf(entry)))
        }
        return Array.from({ length: PLACEHOLDER_COUNT }, () => "")
    }

    private loadAtlas() {
        const sources = this.sourceList()
        const key = sources.join("|")
        // Keyed on the list, not on whether the build has landed: a config
        // change that arrives while the pictures are still decoding must not
        // start a second build of the same atlas.
        if (key === this.atlasKey) return
        this.atlasKey = key
        const token = ++this.atlasToken
        buildAtlas(sources, this.renderer.capabilities.getMaxAnisotropy())
            .then((atlas) => {
                if (this.disposed || token !== this.atlasToken) {
                    atlas?.texture.dispose()
                    return
                }
                this.atlas?.texture.dispose()
                this.atlas = atlas
                if (atlas) {
                    this.material.uniforms.uAtlas.value = atlas.texture
                    this.writeCells()
                }
                this.onAtlasReady?.()
            })
            .catch(() => {})
    }

    private settings() {
        if (!this.settingsCache) {
            this.settingsCache = settingsFor(this.cfg, this.width, this.height)
        }
        return this.settingsCache
    }

    /* ------------------------------------------------------------- pick ---- */

    /**
     * Which sheet is drawn at a point, answered by drawing it. Every vertex
     * position in this component exists only inside the vertex shader, so the
     * geometry three would raycast against describes nothing that is on screen.
     * The deck is re-rendered instead through the same vertex shader with the
     * instance index written out as a colour, and the pixel under the pointer is
     * read back — so whatever is drawn there is what answers, curl, crop,
     * overlap and all.
     *
     * The whole frame is redrawn rather than one pixel through an offset camera.
     * That costs a few more milliseconds once per press and buys the one thing
     * that matters: the ID buffer is the picture on screen, at the same aspect
     * through the same camera, so the only thing left to get right is which
     * pixel to read.
     */
    private pick(clientX: number, clientY: number): number {
        const rect = this.container.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return -1
        // Normalised against the box that is actually on screen. A frame's
        // layout size and its drawn size are not the same number under a Framer
        // canvas zoom, a browser zoom, or any CSS transform above it, and
        // mixing the two slides every hit sideways by the zoom factor.
        const u = (clientX - rect.left) / rect.width
        const v = (clientY - rect.top) / rect.height
        if (u < 0 || v < 0 || u >= 1 || v >= 1) return -1

        // One scale for both axes, so the ID buffer keeps the camera's aspect.
        // A target of a different shape would stretch the deck across it and
        // put every hit in the wrong place.
        const scale = Math.min(1, PICK_MAX / Math.max(this.width, this.height))
        const tw = Math.max(1, Math.round(this.width * scale))
        const th = Math.max(1, Math.round(this.height * scale))
        if (this.pickTarget.width !== tw || this.pickTarget.height !== th) {
            this.pickTarget.setSize(tw, th)
        }

        const previous = this.mesh.material
        this.mesh.material = this.pickMaterial
        this.renderer.setRenderTarget(this.pickTarget)
        // Opaque, so "no sheet here" reads back as a solid zero rather than as
        // whatever was left in the buffer.
        this.renderer.setClearColor(0x000000, 1)
        this.renderer.render(this.scene, this.camera)
        this.renderer.readRenderTargetPixels(
            this.pickTarget,
            Math.min(tw - 1, Math.floor(u * tw)),
            // readRenderTargetPixels counts rows from the bottom of the buffer;
            // the pointer counts them from the top of the frame.
            Math.min(th - 1, Math.floor((1 - v) * th)),
            1,
            1,
            this.pickBuffer
        )
        this.renderer.setRenderTarget(null)
        this.renderer.setClearColor(0x000000, 0)
        this.mesh.material = previous

        const hit = this.pickBuffer[0] - 1
        return hit >= 0 && hit < this.settings().pages ? hit : -1
    }

    /**
     * A tap, carrying the sheet that was under the pointer when it went down.
     * One tap anywhere at all puts a held-up sheet back — including a tap on
     * the sheet itself, which is the thing most within reach when you want it
     * closed.
     */
    private onTap(hit: number) {
        if (!this.settings().tapToView) return
        if (this.focus.index >= 0) {
            this.focus.target = 0
            return
        }
        if (hit >= 0) {
            this.focus.index = hit
            this.focus.target = 1
        }
    }

    private onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && this.focus.index >= 0) {
            this.focus.target = 0
        }
    }

    /* ------------------------------------------------------------ input ---- */

    private wheelScale(event: WheelEvent): number {
        // deltaMode 1 is lines and 2 is pages; both have to become pixels or a
        // Firefox notch walks the corridor a fraction as far as a Chrome one.
        if (event.deltaMode === 1) return 16
        if (event.deltaMode === 2) return this.height
        return 1
    }

    private onWheel = (event: WheelEvent) => {
        if (this.disposed) return
        // A sheet is being read; the line it came out of holds still under it,
        // so it goes back to exactly the place it left. The wheel goes back to
        // the page while it is up there.
        if (this.focus.index >= 0) return
        event.preventDefault()
        const scale = this.wheelScale(event)
        const dx = event.deltaX * scale
        const dy = event.deltaY * scale
        // The corridor runs across the frame, so a trackpad's sideways swipe is
        // the gesture that matches it — but a mouse only has a wheel, and that
        // has to drive it too. Whichever axis the gesture is on wins.
        const dominant = Math.abs(dx) > Math.abs(dy) ? dx : dy
        const S = this.settings()
        this.push(dominant * S.worldPerPx * S.wheel)
    }

    private onPointerDown = (event: PointerEvent) => {
        if (this.disposed || event.button !== 0) return
        this.tap = {
            x: event.clientX,
            y: event.clientY,
            at: performance.now(),
            id: event.pointerId,
            // Answered against the frame the user was looking at when they
            // pressed. Nothing needs picking to close, so this only runs when
            // there is something to open.
            hit:
                this.focus.index < 0 && this.settings().tapToView
                    ? this.pick(event.clientX, event.clientY)
                    : -1,
        }
        this.container.setPointerCapture?.(event.pointerId)
        // The corridor does not scroll under a sheet that is being read, but the
        // press still has to be tracked so that letting go can put it back.
        if (this.focus.index >= 0) return
        this.drag.active = true
        this.drag.lastX = event.clientX
        this.drag.id = event.pointerId
    }

    private onPointerMove = (event: PointerEvent) => {
        if (!this.drag.active || event.pointerId !== this.drag.id) return
        const delta = this.drag.lastX - event.clientX
        this.drag.lastX = event.clientX
        // Finger travel is shorter than wheel travel, so it is scaled up — the
        // source does the same, at the same factor.
        const S = this.settings()
        this.push(delta * 2 * S.worldPerPx * S.wheel)
    }

    private onPointerUp = (event: PointerEvent) => {
        if (event.pointerId === this.drag.id) {
            this.drag.active = false
            this.drag.id = -1
        }
        if (event.pointerId !== this.tap.id) return
        this.container.releasePointerCapture?.(event.pointerId)
        this.tap.id = -1
        // A press that stayed put and was let go quickly is a tap; anything
        // else was a drag on the corridor and must not also open a sheet.
        const moved = Math.hypot(
            event.clientX - this.tap.x,
            event.clientY - this.tap.y
        )
        if (moved <= TAP_SLOP && performance.now() - this.tap.at <= TAP_MS) {
            this.onTap(this.tap.hit)
        }
    }

    /** An interrupted press is neither a drag nor a tap. */
    private onPointerCancel = (event: PointerEvent) => {
        if (event.pointerId === this.drag.id) {
            this.drag.active = false
            this.drag.id = -1
        }
        if (event.pointerId === this.tap.id) {
            this.container.releasePointerCapture?.(event.pointerId)
            this.tap.id = -1
        }
    }

    private push(worldDelta: number) {
        if (!isFinite(worldDelta)) return
        this.scroll.target += worldDelta
        this.scroll.speed += worldDelta
    }

    private attach() {
        const node = this.container
        node.addEventListener("wheel", this.onWheel, { passive: false })
        node.addEventListener("pointerdown", this.onPointerDown)
        node.addEventListener("pointermove", this.onPointerMove)
        node.addEventListener("pointerup", this.onPointerUp)
        node.addEventListener("pointercancel", this.onPointerCancel)
        // Escape closes what a tap opened. On the window rather than the frame,
        // because nothing here takes keyboard focus for a key press to land on.
        window.addEventListener("keydown", this.onKeyDown)
    }

    private detach() {
        const node = this.container
        node.removeEventListener("wheel", this.onWheel)
        node.removeEventListener("pointerdown", this.onPointerDown)
        node.removeEventListener("pointermove", this.onPointerMove)
        node.removeEventListener("pointerup", this.onPointerUp)
        node.removeEventListener("pointercancel", this.onPointerCancel)
        window.removeEventListener("keydown", this.onKeyDown)
    }

    /* ------------------------------------------------------------- host ---- */

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
        // Only the picture list owns a texture, and loadAtlas is a no-op when
        // the list has not actually changed. Everything else is a uniform or an
        // instance attribute, so a slider drag rebuilds nothing.
        this.loadAtlas()
        this.applyConfig()
        this.writeCells()
    }

    /** Written straight to the node rather than through React, and only on a
     * change: a re-render would otherwise have to run for the cursor to catch up
     * with a tap. Compared against the live value rather than a cached one,
     * because React puts `grab` back every time it re-renders the frame. */
    private setCursor(value: string) {
        if (this.container.style.cursor === value) return
        this.container.style.cursor = value
    }

    /** One frame, for a static render. */
    renderStatic() {
        if (this.disposed) return
        this.renderer.render(this.scene, this.camera)
    }

    start() {
        this.attach()
        this.lastT = performance.now()
        const loop = () => {
            if (this.disposed) return
            this.frameId = requestAnimationFrame(loop)
            this.step()
        }
        this.frameId = requestAnimationFrame(loop)
    }

    private step() {
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A tab that has been in the background must not deposit a minute of
        // drift in one frame.
        if (dt > 0.05) dt = 0.05

        const S = this.settings()
        const u = this.material.uniforms

        // The one blend, played forwards on a tap and backwards on the next.
        // Linear in time and eased on the way out to the shader, so opening and
        // closing are the same curve read in opposite directions.
        if (this.focus.index >= 0) {
            const rate = dt / Math.max(0.05, S.viewDuration)
            this.focus.t = Math.min(
                1,
                Math.max(0, this.focus.t + (this.focus.target ? rate : -rate))
            )
            if (this.focus.t === 0 && this.focus.target === 0) {
                this.focus.index = -1
            }
        }
        u.uFocusIndex.value = this.focus.index
        u.uFocusProgress.value = power2InOut(this.focus.t)

        this.setCursor(
            this.focus.index >= 0 && this.focus.target === 1
                ? "zoom-out"
                : "grab"
        )

        // The corridor holds still under a sheet that is being read — and while
        // it is travelling back, so it lands where it left.
        if (S.driftPerSecond !== 0 && this.focus.index < 0) {
            this.push(S.driftPerSecond * dt)
        }

        // Frame-rate independent forms of the source's per-frame constants: it
        // applies each of them once a frame, so a 120Hz display would settle
        // twice as fast and curl half as hard.
        const k = dt * 60
        const ease = 1 - Math.pow(1 - S.lerp, k)
        this.scroll.current += (this.scroll.target - this.scroll.current) * ease
        this.scroll.speed *= Math.pow(0.835, k)

        // The shader wraps on one full corridor length, so walking both ends of
        // the lerp back by exactly that is invisible — and it keeps a corridor
        // that has been scrolled for an hour inside float precision.
        const period = S.pages * (S.pageSpacing + S.thickness)
        if (Math.abs(this.scroll.current) > period) {
            const wrap = Math.sign(this.scroll.current) * period
            this.scroll.current -= wrap
            this.scroll.target -= wrap
        }

        u.uScrollY.value = this.scroll.current
        u.uSpeedY.value = this.scroll.speed

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.detach()
        this.geometry.dispose()
        this.material.dispose()
        this.pickMaterial.dispose()
        this.pickTarget.dispose()
        this.blank.dispose()
        this.atlas?.texture.dispose()
        this.mesh.dispose()
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        canvas.parentNode?.removeChild(canvas)
    }
}

/* -------------------------------------------------------------- component -- */

export default function MagazineFlip(props: Partial<MagazineFlipProps>) {
    const {
        images = DEFAULTS.images,
        background = DEFAULTS.background,
        pages = DEFAULTS.pages,
        spacing = DEFAULTS.spacing,
        tilt = DEFAULTS.tilt,
        turn = DEFAULTS.turn,
        pageWidth = DEFAULTS.pageWidth,
        pageHeight = DEFAULTS.pageHeight,
        view,
        scrollSens = DEFAULTS.scrollSens,
        travel,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<MagazineScene | null>(null)

    // Rebuilt per render rather than read through props inside the loop, so
    // dragging a slider shows up on the next frame without the effect below ever
    // tearing the renderer down. Both groups are merged partial-safe: an
    // instance that set only one field still gets the rest.
    const cfgRef = useRef<Config>(null as unknown as Config)
    const cfg: Config = {
        images: Array.isArray(images) ? images : [],
        pages,
        spacing,
        tilt,
        turn,
        pageWidth,
        pageHeight,
        view: { ...DEFAULT_VIEW, ...view },
        scrollSens,
        travel: { ...DEFAULT_TRAVEL, ...travel },
    }
    cfgRef.current = cfg

    /** What the atlas is keyed on, so a re-ordered or re-cropped list is a
     * change and a re-render of the same list is not. */
    const imageKey = cfg.images
        .map((entry) => `${srcOf(imageOf(entry))}@${offsetOf(entry)}`)
        .join("|")

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: MagazineScene
        try {
            scene = new MagazineScene(container, cfgRef.current)
        } catch {
            // No WebGL — an empty frame rather than a thrown render.
            return
        }
        sceneRef.current = scene
        scene.setSize(container.clientWidth, container.clientHeight)
        scene.start()

        const ro = new ResizeObserver(() => {
            scene.setSize(container.clientWidth, container.clientHeight)
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
    }, [
        imageKey,
        pages,
        spacing,
        tilt,
        turn,
        pageWidth,
        pageHeight,
        scrollSens,
        cfg.view.tap,
        cfg.view.zoom,
        cfg.view.speed,
        cfg.travel.drift,
        cfg.travel.smoothing,
        cfg.travel.wave,
    ])

    const first = cfg.images[0]

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label={
                (first ? altOf(imageOf(first)) : "") ||
                "A corridor of magazine pages you scroll through, and tap to hold one up"
            }
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 200,
                minHeight: 200,
                overflow: "hidden",
                background,
                cursor: "grab",
                // The corridor is walked sideways, so a touch drag across it has
                // to reach the pointer handlers rather than being eaten as a
                // horizontal pan. Vertical page scrolling still gets through.
                touchAction: "pan-y",
                ...style,
            }}
        />
    )
}
