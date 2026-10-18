"use client"

import { useEffect, useMemo, useRef } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ types */

/** Framer hands `ControlType.Image` back as a URL string on older versions and
 * as a responsive-image object on newer ones. Accept both. */
type ImageInput = string | { src?: string; srcSet?: string } | null | undefined

export interface RotatingGalleryItem {
    image?: ImageInput
    /** Slides the picture inside its own window. Positive is down, as in CSS. */
    offsetY?: number
}

export interface RotatingGalleryRotation {
    /** Turns per screen of travel. 0 leaves the pictures flat. */
    spin?: number
    /** How far the turn is spread across the plane — the ribbon twist. */
    twist?: number
    /** The axis the plane turns about. */
    axis?: "y" | "x"
}

export interface RotatingGalleryProps {
    images?: (RotatingGalleryItem | ImageInput)[]
    background?: string
    spacing?: number
    cardWidth?: number
    cardHeight?: number
    radius?: number
    rotation?: RotatingGalleryRotation
    tap?: boolean
    scrollLock?: boolean
    hold?: number
    scrollSensitivity?: number
    smoothing?: number
    drag?: boolean
    dragSensitivity?: number
    style?: CSSProperties
}

/* ------------------------------------------------------------ group defaults
 * One source of truth for every default: the signature merges these, and each
 * control's `defaultValue` is the matching slice of the same constant. */

const DEFAULT_ROTATION: Required<RotatingGalleryRotation> = {
    spin: 5,
    twist: 3,
    axis: "y",
}

const DEFAULT_IMAGES: RotatingGalleryItem[] = [{"image":{"src":"https://images.unsplash.com/photo-1631700010907-eeca2d4f2a39?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjA5fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1758600433359-fbac540190c4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjE2fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1564564295391-7f24f26f568b?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjQ3fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1504207742709-f7e8858f8a73?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzE0fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1601724381920-b02fd5193b8b?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzE5fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1649864731714-1363b5c4456c?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzI1fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1758600588113-c4861529a9a6?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzMxfHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1777146464379-c527ae8c92f0?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzQ1fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1702571186188-fa38b53570e3?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzkxfHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","alt":""},"offsetY":0},{"image":{"src":"https://images.unsplash.com/photo-1654944989879-b3ef6a3f69a3?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NTE4fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D\n","alt":""},"offsetY":0}]

const DEFAULT_BACKGROUND = "#000000"
const DEFAULT_SPACING = 16
const DEFAULT_CARD_WIDTH = 400
const DEFAULT_CARD_HEIGHT = 300
const DEFAULT_RADIUS = 16
const DEFAULT_TAP = true
const DEFAULT_SCROLL_LOCK = true
const DEFAULT_HOLD = 10
const DEFAULT_SCROLL_SENSITIVITY = 10
const DEFAULT_SMOOTHING = 0
const DEFAULT_DRAG = true
const DEFAULT_DRAG_SENSITIVITY = 10

/* -------------------------------------------------------------- internals */

/** The reference's camera, kept exactly: a 45° lens 20 units back. Every world
 * measurement in here is derived from it, so the pair is a constant rather than
 * two dials that can disagree. */
const CAMERA_FOV = 45
const CAMERA_Z = 20

/** The frame's height in world units. It falls out of the lens alone, so it is
 * the same whatever size the frame is drawn — which makes it the natural unit
 * for anything measured in screens. */
const VIEWPORT_HEIGHT =
    2 * Math.tan((CAMERA_FOV * Math.PI) / 180 / 2) * CAMERA_Z

/** The reference's `widthSegments: 100`. The twist is handed out along the
 * plane's width, so the width is the axis that needs the vertices. */
const WIDTH_SEGMENTS = 100

const MAX_DPR = 2

/** Stand-in artwork so the column renders on its own with no props. */
const PLACEHOLDER_COUNT = 8

/**
 * A pixel of gesture moves the column a pixel, at Sens. 5.
 *
 * The reference converts at `0.005` world units per wheel pixel and `0.1` per
 * dragged pixel — numbers tuned for a page that has nothing else to do, where
 * the column creeping at a quarter of the wheel's speed just reads as slow
 * scrolling. A section that has TAKEN the wheel cannot creep: the page is being
 * held still, so anything less than the travel the reader asked for reads as
 * the scroll having broken. One to one also makes `Hold` exact — a screen of
 * travel is a screen of scrolling.
 */
const GESTURE_GAIN = 1
/** A single wheel event never advances more than this, so a trackpad fling
 * cannot throw the column a dozen cards in one tick. */
const WHEEL_CLAMP = 240

/** A gap longer than this ends a run of wheel events. Long enough to cover a
 * slow reader clicking a mouse wheel a notch at a time, short enough that
 * setting off again is a new run. */
const WHEEL_RUN_GAP = 400

/* --- the tap. One curve out and the same curve back, so a picture that is
 * sent home retraces exactly what it did on the way up. */

/** How long the picture takes to come up, and the same to go back. */
const FOCUS_SECONDS = 0.6
/** How much of the frame the chosen picture is brought up to fill. */
const FOCUS_FILL = 0.82
/** ...and no more than this much magnification, so a small card in a big frame
 * cannot be flown into the camera's lap. */
const FOCUS_MAX_SCALE = 4
/** What the rest of the column falls to while one picture is up. Not zero: the
 * column has to stay legible as the thing the picture came out of. */
const FOCUS_DIM = 0.28

/** A press that travels further than this, or lasts longer, was not a tap. */
const TAP_SLOP_PX = 6
const TAP_MS = 500

/** Half-width of the corner's antialiased edge, in CSS pixels. */
const EDGE_AA_PX = 1.5

/** The column is repeated until it is at least this much longer than the frame,
 * measured in cards. The wrap happens half a column from the centre, so the
 * slack is what keeps that point off screen at both ends. */
const WRAP_SLACK_CARDS = 3

/** A ceiling on the repeats, so a tiny card in a tall frame cannot ask for
 * thousands of draws. */
const MAX_PLANES = 120

/**
 * Wraps a position into the window `[-span/2, span/2)` — the whole trick behind
 * a column that runs forever in BOTH directions. Every plane is placed at its
 * own offset along an endless lattice and then folded into the one window
 * centred on the screen, so the far end of the column is always waiting at
 * whichever edge the travel is heading for. Nothing is remembered between
 * frames, which is what makes reversing free: there is no leading and trailing
 * end to keep straight, and no state that can be right for one direction and
 * wrong for the other.
 */
function wrapTo(value: number, span: number): number {
    return value - span * Math.floor(value / span + 0.5)
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

/** The curve the tap rides. Symmetric, so playing the progress backwards
 * retraces the path forwards exactly — which is the whole ask of a picture that
 * has to go back the way it came. */
function easeInOut(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Smoothing 0–10 → the lerp the scroll rides. Geometric, so every step of the
 * slider adds the same proportion of float rather than the same amount.
 *
 * The scale runs from 0.25 — near enough to hand-tight that the column tracks
 * the wheel — down to 0.004, and the reference's `ease: 0.01` sits at 8. It is
 * the top of the range that matters here: with `Scroll Lock` on, the section
 * has stopped the page, so anything that coasts for seconds reads as the page
 * having jammed rather than as the gallery gliding.
 */
function easeFor(smoothing: number): number {
    return 0.25 * Math.pow(0.016, clamp(smoothing, 0, 10) / 10)
}

/**
 * Hold 0–10 → how much SCROLLING the section may swallow before the wheel goes
 * back to the page, measured in screens. 10 — the default — never gives it
 * back: the column keeps looping for as long as the reader keeps scrolling. 0
 * is the same as no lock at all.
 */
function holdFor(hold: number): number {
    const held = clamp(hold, 0, 10)
    return held >= 10 ? Infinity : held * VIEWPORT_HEIGHT
}

function srcOf(value: ImageInput): string | null {
    if (!value) return null
    if (typeof value === "string") return value.trim() || null
    if (value.src) return value.src
    // A pasted link can arrive as srcSet alone. Its first entry is the URL; the
    // density suffix after the space is not part of it.
    const first = value.srcSet?.split(",")[0]?.trim().split(/\s+/)[0]
    return first || null
}

/** Rows may be `{ image, offsetY }` from the control, or a bare image from an
 * older list — both mean the same thing here. */
function resolveEntry(entry: RotatingGalleryItem | ImageInput): {
    src: string | null
    offsetY: number
} {
    if (entry && typeof entry === "object" && "image" in entry) {
        return {
            src: srcOf(entry.image),
            offsetY: typeof entry.offsetY === "number" ? entry.offsetY : 0,
        }
    }
    return { src: srcOf(entry as ImageInput), offsetY: 0 }
}

/** Stand-in artwork, painted rather than fetched so the component ships no
 * assets of its own. The same hue walk the rest of the library uses, so a run
 * of our placeholders reads as one set. */
function makePlaceholder(index: number): HTMLCanvasElement | null {
    if (typeof document === "undefined") return null
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 640
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    const hue = (index * 47 + 200) % 360
    const gradient = ctx.createLinearGradient(0, 0, 512, 640)
    gradient.addColorStop(0, `hsl(${hue} 42% 44%)`)
    gradient.addColorStop(1, `hsl(${(hue + 50) % 360} 58% 9%)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 640)
    return canvas
}

/* ---------------------------------------------------------------- shaders */

const VERTEX_SHADER = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform float uPosition;
uniform float uSpin;
uniform float uFlat;
uniform float uDistortion;
uniform vec3 distortionAxis;
uniform vec3 rotationAxis;

varying vec2 vUv;

float PI = 3.141592653589793238;

mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return mat4(oc * axis.x * axis.x + c,          oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0,
                oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c,          oc * axis.y * axis.z - axis.x * s, 0.0,
                oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c,          0.0,
                0.0,                               0.0,                               0.0,                              1.0);
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
    mat4 m = rotationMatrix(axis, angle);
    return (m * vec4(v, 1.0)).xyz;
}

float qinticInOut(float t) {
    return t < 0.5
        ? +16.0 * pow(t, 5.0)
        : -0.5 * abs(pow(2.0 * t - 2.0, 5.0)) + 1.0;
}

void main() {
    vUv = uv;

    float norm = 0.5;

    vec3 newpos = position;

    // Where this vertex sits along the twist axis. Every vertex runs the same
    // phase; this is the head start it gets, and it is what turns a flip into
    // a twist.
    float offset = (dot(distortionAxis, position) + norm / 2.0) / norm;

    float localprogress = clamp(
        (fract(uPosition * uSpin * 0.01) - 0.01 * uDistortion * offset) /
            (1.0 - 0.01 * uDistortion),
        0.0,
        2.0
    );

    // uFlat unwinds the turn this plane's position asks for, down to nothing
    // at 1. It scales the ANGLE rather than the phase, so the plane relaxes out
    // of whatever twist it was caught in — every vertex arriving at flat
    // together — instead of racing along the rest of the curve to get there.
    localprogress = qinticInOut(localprogress) * PI * (1.0 - uFlat);

    newpos = rotate(newpos, rotationAxis, localprogress);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newpos, 1.0);
}
`

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 uImageSize;
uniform vec2 uPlaneSize;
uniform sampler2D tMap;
uniform float uOffset;
uniform float uRadius;
uniform float uAA;
uniform float uDim;

varying vec2 vUv;

void main() {
    // Cover, not stretch: the largest centred rectangle of the CARD's aspect
    // that fits inside the picture. Until the picture has decoded the caller
    // passes the card's own size, which makes both ratios 1 and fills the box.
    vec2 ratio = vec2(
        min((uPlaneSize.x / uPlaneSize.y) / (uImageSize.x / uImageSize.y), 1.0),
        min((uPlaneSize.y / uPlaneSize.x) / (uImageSize.y / uImageSize.x), 1.0)
    );

    // ...and the offset picks which band of the cropped overflow shows. Clamped
    // to the slack that actually exists, so a picture already filling the box
    // on that axis cannot be dragged off it.
    float slack = (1.0 - ratio.y) * 0.5;
    float shift = clamp(uOffset * ratio.y, -slack, slack);

    vec2 uv = vec2(
        vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
        vUv.y * ratio.y + (1.0 - ratio.y) * 0.5 + shift
    );

    vec3 rgb = texture2D(tMap, uv).rgb * uDim;

    // Rounded corner, cut in the card's own surface space so the twist carries
    // it rather than flattening it.
    vec2 halfSize = uPlaneSize * 0.5;
    vec2 q = abs((vUv - 0.5) * uPlaneSize) - halfSize + uRadius;
    float dist = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - uRadius;
    float alpha = 1.0 - smoothstep(-uAA, uAA, dist);

    // Premultiplied: the canvas composites over the container's background.
    gl_FragColor = vec4(rgb * alpha, alpha);
}
`

/* ------------------------------------------------------------- gl helpers */

function compile(
    gl: WebGLRenderingContext,
    type: number,
    source: string
): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(
            "RotatingGallery: shader failed —",
            gl.getShaderInfoLog(shader)
        )
        gl.deleteShader(shader)
        return null
    }
    return shader
}

function link(gl: WebGLRenderingContext): WebGLProgram | null {
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vs || !fs) return null
    const program = gl.createProgram()
    if (!program) return null
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn(
            "RotatingGallery: program failed —",
            gl.getProgramInfoLog(program)
        )
        gl.deleteProgram(program)
        return null
    }
    return program
}

/**
 * The reference's `Plane(gl, { widthSegments: 100, heightSegments: 1 })`: a unit
 * quad centred on the origin, with v = 1 at the top to match a texture uploaded
 * flipped.
 */
function buildPlane(segments: number): {
    position: Float32Array
    uv: Float32Array
    index: Uint16Array
} {
    const cols = segments + 1
    const position = new Float32Array(cols * 2 * 3)
    const uv = new Float32Array(cols * 2 * 2)
    const index = new Uint16Array(segments * 6)

    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < cols; col++) {
            const i = row * cols + col
            const u = col / segments
            const v = 1 - row
            position[i * 3] = u - 0.5
            position[i * 3 + 1] = v - 0.5
            position[i * 3 + 2] = 0
            uv[i * 2] = u
            uv[i * 2 + 1] = v
        }
    }
    for (let col = 0; col < segments; col++) {
        const a = col
        const b = col + 1
        const c = cols + col
        const d = cols + col + 1
        index.set([a, c, b, b, c, d], col * 6)
    }
    return { position, uv, index }
}

/** Column-major perspective, matching OGL's `Camera.perspective`. */
function perspective(
    out: Float32Array,
    fovDeg: number,
    aspect: number,
    near: number,
    far: number
): void {
    const f = 1 / Math.tan((fovDeg * Math.PI) / 180 / 2)
    out.fill(0)
    out[0] = f / aspect
    out[5] = f
    out[10] = (far + near) / (near - far)
    out[11] = -1
    out[14] = (2 * far * near) / (near - far)
}

/* -------------------------------------------------------------- component */

export default function RotatingGallery({
    images = DEFAULT_IMAGES,
    background = DEFAULT_BACKGROUND,
    spacing = DEFAULT_SPACING,
    cardWidth = DEFAULT_CARD_WIDTH,
    cardHeight = DEFAULT_CARD_HEIGHT,
    radius = DEFAULT_RADIUS,
    rotation,
    tap = DEFAULT_TAP,
    scrollLock = DEFAULT_SCROLL_LOCK,
    hold = DEFAULT_HOLD,
    scrollSensitivity = DEFAULT_SCROLL_SENSITIVITY,
    smoothing = DEFAULT_SMOOTHING,
    drag = DEFAULT_DRAG,
    dragSensitivity = DEFAULT_DRAG_SENSITIVITY,
    style,
}: RotatingGalleryProps) {
    const turn = { ...DEFAULT_ROTATION, ...rotation }

    const rootRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    const entries = useMemo(() => (images ?? []).map(resolveEntry), [images])
    const count = entries.length || PLACEHOLDER_COUNT
    /** The load effect only cares that the URLs changed, not that Framer hands
     * back a fresh array on every render. */
    const srcKey = entries.map((entry) => entry.src ?? "").join("\n")

    /** Everything the render loop reads, refreshed every render so the loop is
     * never rebuilt and a dragged slider lands on the next frame. */
    const live = useRef({
        entries,
        count,
        spacing,
        cardWidth,
        cardHeight,
        radius,
        turn,
        tap,
        scrollLock,
        hold,
        scrollSensitivity,
        smoothing,
        drag,
        dragSensitivity,
    })
    live.current = {
        entries,
        count,
        spacing,
        cardWidth,
        cardHeight,
        radius,
        turn,
        tap,
        scrollLock,
        hold,
        scrollSensitivity,
        smoothing,
        drag,
        dragSensitivity,
    }

    /** Decoded pictures waiting to be uploaded, and whether the set is dirty. */
    const decoded = useRef<{
        list: (HTMLImageElement | null)[]
        dirty: boolean
    }>({ list: [], dirty: true })

    /* -------------------------------------------------------- image load --- */

    useEffect(() => {
        let alive = true
        const srcs = srcKey ? srcKey.split("\n") : []
        decoded.current.list = srcs.map(() => null)
        decoded.current.dirty = true

        srcs.forEach((src, slot) => {
            if (!src) return
            const img = new Image()
            // Asked for first, because WebGL may only upload a picture the page
            // is allowed to read: without the header the texture is tainted and
            // texImage2D throws.
            img.crossOrigin = "anonymous"
            let anonymous = true
            img.onload = () => {
                if (!alive) return
                decoded.current.list[slot] = img
                // A flag the render loop reads. Uploading from here would race
                // the context's own setup.
                decoded.current.dirty = true
            }
            img.onerror = () => {
                if (!alive) return
                if (anonymous) {
                    // A host that sends no CORS header at all REJECTS the
                    // anonymous request outright. Fetch it plainly instead; the
                    // upload is where an unusable picture is caught.
                    anonymous = false
                    img.removeAttribute("crossorigin")
                    img.src = src
                    return
                }
                console.warn("RotatingGallery: image failed to load — " + src)
                decoded.current.list[slot] = null
                decoded.current.dirty = true
            }
            img.src = src
        })

        return () => {
            alive = false
        }
    }, [srcKey])

    /* ------------------------------------------------------------- scene --- */

    useEffect(() => {
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return

        const options: WebGLContextAttributes = {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
        }
        const gl = (canvas.getContext("webgl", options) ||
            canvas.getContext(
                "experimental-webgl",
                options
            )) as WebGLRenderingContext | null
        if (!gl) {
            console.warn("RotatingGallery: WebGL is unavailable.")
            return
        }

        const program = link(gl)
        if (!program) return
        gl.useProgram(program)

        /* ------------------------------------------------------ geometry --- */

        const plane = buildPlane(WIDTH_SEGMENTS)

        const positionBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, plane.position, gl.STATIC_DRAW)
        const aPosition = gl.getAttribLocation(program, "position")
        gl.enableVertexAttribArray(aPosition)
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0)

        const uvBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, plane.uv, gl.STATIC_DRAW)
        const aUv = gl.getAttribLocation(program, "uv")
        gl.enableVertexAttribArray(aUv)
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0)

        const indexBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, plane.index, gl.STATIC_DRAW)

        const uniform = (name: string) => gl.getUniformLocation(program, name)
        const uProjection = uniform("projectionMatrix")
        const uModelView = uniform("modelViewMatrix")
        const uPosition = uniform("uPosition")
        const uSpin = uniform("uSpin")
        const uDistortion = uniform("uDistortion")
        const uDistortionAxis = uniform("distortionAxis")
        const uRotationAxis = uniform("rotationAxis")
        const uPlaneSize = uniform("uPlaneSize")
        const uImageSize = uniform("uImageSize")
        const uOffset = uniform("uOffset")
        const uRadius = uniform("uRadius")
        const uAA = uniform("uAA")
        const uFlat = uniform("uFlat")
        const uDim = uniform("uDim")
        gl.uniform1i(uniform("tMap"), 0)

        // The reference's `depthTest: false` / `depthWrite: false`: the column
        // is drawn in order and nothing needs to occlude anything. The blend is
        // ours, for the corner radius, and it is premultiplied.
        gl.disable(gl.DEPTH_TEST)
        gl.disable(gl.CULL_FACE)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        gl.clearColor(0, 0, 0, 0)

        /* ------------------------------------------------------ textures --- */

        const placeholders = new Map<number, HTMLCanvasElement | null>()
        const placeholderFor = (index: number) => {
            if (!placeholders.has(index)) {
                placeholders.set(index, makePlaceholder(index))
            }
            return placeholders.get(index) ?? null
        }

        type Slot = { tex: WebGLTexture | null; width: number; height: number }
        const slots: Slot[] = []

        const growTo = (n: number) => {
            while (slots.length < n) {
                const tex = gl.createTexture()
                gl.bindTexture(gl.TEXTURE_2D, tex)
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_WRAP_S,
                    gl.CLAMP_TO_EDGE
                )
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_WRAP_T,
                    gl.CLAMP_TO_EDGE
                )
                // The reference's `generateMipmaps: false`, which a picture of
                // arbitrary size needs anyway.
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
                slots.push({ tex, width: 0, height: 0 })
            }
            while (slots.length > n) {
                const slot = slots.pop()
                if (slot?.tex) gl.deleteTexture(slot.tex)
            }
        }

        const uploadAll = (n: number) => {
            growTo(n)
            const list = decoded.current.list
            // The reference uploads through OGL, which flips by default;
            // without this the pictures arrive upside down.
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
            for (let i = 0; i < n; i++) {
                const slot = slots[i]
                const img = list[i] ?? null
                const source: TexImageSource | null = img ?? placeholderFor(i)
                gl.bindTexture(gl.TEXTURE_2D, slot.tex)
                if (!source) continue
                // A picture from a host that serves no CORS header taints the
                // context and this throws. Caught here so the frame still
                // draws, and so the slot is cleared rather than retried sixty
                // times a second.
                try {
                    gl.texImage2D(
                        gl.TEXTURE_2D,
                        0,
                        gl.RGBA,
                        gl.RGBA,
                        gl.UNSIGNED_BYTE,
                        source
                    )
                    slot.width =
                        img?.naturalWidth ?? (source as HTMLCanvasElement).width
                    slot.height =
                        img?.naturalHeight ?? (source as HTMLCanvasElement).height
                } catch (err) {
                    console.warn(
                        "RotatingGallery: a picture cannot be drawn — its host sends no CORS header. Upload it to Framer, or serve it from one that does.",
                        err
                    )
                    decoded.current.list[i] = null
                    slot.width = 0
                    slot.height = 0
                }
            }
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            decoded.current.dirty = false
        }

        /* ---------------------------------------------------------- size --- */

        let cssW = 1
        let cssH = 1
        /** World units per CSS pixel. Written by `resize`, read by the gestures
         * so a pixel of wheel is a pixel of column at any frame size. */
        let unitsPerPx = VIEWPORT_HEIGHT
        const projection = new Float32Array(16)
        const modelView = new Float32Array(16)

        const resize = () => {
            // clientWidth / clientHeight, never getBoundingClientRect — that
            // one carries the Framer canvas zoom.
            const w = canvas.clientWidth || 1
            const h = canvas.clientHeight || 1
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const bw = Math.max(1, Math.round(w * dpr))
            const bh = Math.max(1, Math.round(h * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
            cssW = w
            cssH = h
            unitsPerPx = VIEWPORT_HEIGHT / h
            gl.viewport(0, 0, bw, bh)
            perspective(projection, CAMERA_FOV, bw / bh, 0.1, 100)
            gl.uniformMatrix4fv(uProjection, false, projection)
        }
        resize()
        const observer =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => resize())
                : null
        observer?.observe(canvas)

        /* ------------------------------------------------------- gesture --- */

        const scroll = { current: 0, target: 0, grabbed: 0 }

        /* --- the tap. `index` is the plane that is up (or on its way home),
         * `phase` walks 0→1 and back at a fixed rate, and `target` is where it
         * is walking to. One number, played forwards or backwards, is what
         * makes the return the outward path in reverse. */
        const focus = { index: -1, phase: 0, target: 0 }

        /** Last frame's layout, so a tap can be tested against what is actually
         * on screen rather than against a pose recomputed from stale props. */
        const layout = { ys: [] as number[], sx: 0, sy: 0, count: 0 }

        /**
         * Which plane is under a pointer, or -1. Measured against each card's
         * UNTWISTED box: the twist narrows what is drawn, sometimes to a
         * ribbon, and asking the reader to hit that would make the middle
         * picture — the one the whole effect is about — the hardest to choose.
         */
        const pick = (clientX: number, clientY: number): number => {
            const rect = root.getBoundingClientRect()
            if (!rect.width || !rect.height) return -1
            // Read as a fraction of the box, so the Framer canvas zoom that
            // getBoundingClientRect carries divides straight back out.
            const worldX =
                ((clientX - rect.left) / rect.width - 0.5) * cssW * unitsPerPx
            const worldY =
                (0.5 - (clientY - rect.top) / rect.height) * cssH * unitsPerPx
            if (Math.abs(worldX) > layout.sx / 2) return -1
            let best = -1
            let bestDistance = Infinity
            for (let i = 0; i < layout.count; i++) {
                const distance = Math.abs(worldY - layout.ys[i])
                if (distance <= layout.sy / 2 && distance < bestDistance) {
                    best = i
                    bestDistance = distance
                }
            }
            return best
        }

        const applyCursor = () => {
            root.style.cursor =
                focus.index >= 0
                    ? "zoom-out"
                    : live.current.drag
                      ? "grab"
                      : "default"
        }

        const onTap = (clientX: number, clientY: number) => {
            if (!live.current.tap) return
            if (focus.index >= 0) {
                // Anywhere at all sends it back down the way it came — including
                // onto another picture, which the reader can then choose once
                // the column is its own again.
                focus.target = 0
                applyCursor()
                return
            }
            const hit = pick(clientX, clientY)
            if (hit < 0) return
            focus.index = hit
            focus.target = 1
            // The column stops where it stands, so the picture has a fixed
            // place to come back to.
            scroll.target = scroll.current
            applyCursor()
        }

        /** How much scrolling the lock has spent, and which way it is spending it.
         * Reset by a reversal and by the section leaving the frame, so every
         * fresh approach gets the full hold. */
        let spent = 0
        let spentDir = 0
        /** Whether THIS run of wheel events is being held, and when the last
         * one arrived. The decision is taken once, when a run starts, and kept
         * to the end of it: a reader who is still scrolling must never have the
         * page snatched out from under the gesture. */
        let runLocked = false
        let lastWheelAt = -Infinity

        const onWheel = (event: WheelEvent) => {
            let delta = event.deltaY
            if (event.deltaMode === 1) delta *= 16
            else if (event.deltaMode === 2) delta *= root.clientHeight || 800
            delta = clamp(delta, -WHEEL_CLAMP, WHEEL_CLAMP)
            const travel =
                delta *
                unitsPerPx *
                GESTURE_GAIN *
                (live.current.scrollSensitivity / 5)

            if (focus.index >= 0) {
                // A picture is up. The column is held still under it, and the
                // page must not slide out from behind it either.
                if (live.current.scrollLock && event.cancelable) {
                    event.preventDefault()
                }
                return
            }

            const now = performance.now()
            const started = now - lastWheelAt > WHEEL_RUN_GAP
            lastWheelAt = now

            if (live.current.scrollLock && travel !== 0) {
                const direction = Math.sign(travel)
                const turned = direction !== spentDir
                if (turned) {
                    // Turning round is a fresh pass at the section, not a
                    // continuation of the one that spent the budget.
                    spentDir = direction
                    spent = 0
                }
                // Decided at the start of a run and held to its end, so a
                // release can only ever land between gestures.
                if (started || turned) runLocked = spent < holdFor(live.current.hold)
                if (runLocked) {
                    // Spent in SCROLLING, not in travel: `Hold` says how long
                    // the page is held and `Scroll Sens.` says how far the
                    // column goes meanwhile. Counting travel would tie the two
                    // together, so raising the sensitivity would quietly
                    // shorten the hold.
                    spent += Math.abs(delta) * unitsPerPx
                    // The whole point of the lock: the page holds still and
                    // this wheel tick turns the column instead. `cancelable`
                    // is checked because a browser that has already committed
                    // to scrolling sends the event uncancelable.
                    if (event.cancelable) event.preventDefault()
                }
            } else if (!live.current.scrollLock) {
                runLocked = false
            }

            scroll.target += travel
        }

        let touchY: number | null = null
        const onTouchStart = (event: TouchEvent) => {
            touchY = event.touches[0]?.clientY ?? null
        }
        const onTouchMove = (event: TouchEvent) => {
            const y = event.touches[0]?.clientY
            if (y == null || touchY == null) return
            const delta = clamp(touchY - y, -WHEEL_CLAMP, WHEEL_CLAMP)
            touchY = y
            if (focus.index >= 0) return
            scroll.target +=
                delta *
                unitsPerPx *
                GESTURE_GAIN *
                (live.current.scrollSensitivity / 5)
        }
        const onTouchEnd = () => {
            touchY = null
        }

        let dragStart: number | null = null
        /** Where a press started, so a release can tell a tap from a drag or a
         * swipe. Kept for every pointer type — touch does not drag the column,
         * but it certainly taps. */
        let pressed: { x: number; y: number; at: number } | null = null

        const onPointerDown = (event: PointerEvent) => {
            pressed = { x: event.clientX, y: event.clientY, at: performance.now() }
            // Touch already drives the column through the passive path above,
            // where it can do so without taking the page's gesture away. A
            // picture that is up holds the column still, so nothing may drag it.
            if (
                !live.current.drag ||
                event.pointerType === "touch" ||
                focus.index >= 0
            ) {
                return
            }
            dragStart = event.clientY
            scroll.grabbed = scroll.target
            root.setPointerCapture?.(event.pointerId)
            root.style.cursor = "grabbing"
        }
        const onPointerMove = (event: PointerEvent) => {
            if (dragStart == null) return
            scroll.target =
                scroll.grabbed +
                (dragStart - event.clientY) *
                    unitsPerPx *
                    GESTURE_GAIN *
                    (live.current.dragSensitivity / 5)
        }
        const onPointerUp = (event: PointerEvent) => {
            if (dragStart != null) {
                dragStart = null
                root.releasePointerCapture?.(event.pointerId)
            }
            if (pressed) {
                const travelled = Math.hypot(
                    event.clientX - pressed.x,
                    event.clientY - pressed.y
                )
                const held = performance.now() - pressed.at
                pressed = null
                if (travelled <= TAP_SLOP_PX && held <= TAP_MS) {
                    onTap(event.clientX, event.clientY)
                    return
                }
            }
            applyCursor()
        }
        const onPointerCancel = () => {
            dragStart = null
            pressed = null
            applyCursor()
        }

        // Not passive: the lock has to be able to keep the page still.
        root.addEventListener("wheel", onWheel, { passive: false })
        root.addEventListener("touchstart", onTouchStart, { passive: true })
        root.addEventListener("touchmove", onTouchMove, { passive: true })
        root.addEventListener("touchend", onTouchEnd, { passive: true })
        root.addEventListener("touchcancel", onTouchEnd, { passive: true })
        root.addEventListener("pointerdown", onPointerDown)
        root.addEventListener("pointermove", onPointerMove)
        root.addEventListener("pointerup", onPointerUp)
        root.addEventListener("pointercancel", onPointerCancel)

        /* ----------------------------------------------------- offscreen --- */

        let visible = true
        const intersect =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(
                      (records) => {
                          const showing =
                              records[records.length - 1]?.isIntersecting ?? true
                          // Left the frame: the next approach gets the whole
                          // hold again, whichever way it arrives from.
                          if (!showing) {
                              spent = 0
                              spentDir = 0
                              runLocked = false
                          }
                          visible = showing
                      },
                      { rootMargin: "200px" }
                  )
                : null
        intersect?.observe(root)

        /* --------------------------------------------------------- frame --- */

        let sources = -1

        let raf = 0
        let previous = performance.now()

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min((now - previous) / 1000, 0.1)
            previous = now
            if (!visible) return

            const props = live.current
            const pictures = Math.max(1, props.count)

            resize()

            if (sources !== pictures) {
                decoded.current.dirty = true
                sources = pictures
            }
            if (decoded.current.dirty) uploadAll(pictures)

            /* --- the scroll. Frame-rate normalised, so the coast is the same
             * length on a 120Hz display as on a 60Hz one. */
            /* --- the tap, walked at a fixed rate so out and back take the
             * same time whatever else is going on. */
            if (focus.phase !== focus.target) {
                const way = focus.target > focus.phase ? 1 : -1
                focus.phase = clamp(
                    focus.phase + (way * dt) / FOCUS_SECONDS,
                    0,
                    1
                )
                if (focus.phase === 0) focus.index = -1
            }
            const lifted = easeInOut(focus.phase)

            /* --- the scroll. A picture that is up holds the column exactly
             * where it stood, so it has somewhere to come back to. */
            if (focus.index < 0) {
                const ease = 1 - Math.pow(1 - easeFor(props.smoothing), dt * 60)
                scroll.current += (scroll.target - scroll.current) * ease
            }

            /* --- the camera's world, in the units the planes are measured in.
             * The reference derives these from the window; here the frame is
             * whatever the user drew. */
            const viewportH = VIEWPORT_HEIGHT

            const sx = Math.max(0.001, props.cardWidth * unitsPerPx)
            const sy = Math.max(0.001, props.cardHeight * unitsPerPx)
            const step = sy + Math.max(0, props.spacing) * unitsPerPx

            /* --- how long the column has to be. The wrap point sits half a
             * column from the centre, so the column must clear the frame plus a
             * few cards or that point lands in sight. A short list is repeated
             * rather than left with a hole in it: eight 300px cards are only
             * 2752px of column, which a tall frame outruns. */
            const spanNeeded = viewportH + WRAP_SLACK_CARDS * sy
            const repeats = Math.max(
                1,
                Math.min(
                    Math.max(1, Math.floor(MAX_PLANES / pictures)),
                    Math.ceil(spanNeeded / (step * pictures))
                )
            )
            const n = pictures * repeats
            const total = step * n

            // A picture cannot stay up if the column it belongs to has been
            // rebuilt underneath it.
            if (focus.index >= n) {
                focus.index = -1
                focus.phase = 0
                focus.target = 0
            }

            /* --- where the chosen picture is brought to: the middle of the
             * frame, flat, and forward until it fills `FOCUS_FILL` of the
             * smaller dimension. Forward rather than merely bigger, so it
             * reads as the picture coming out of the column towards the
             * reader. */
            const viewportW = viewportH * (cssW / Math.max(1, cssH))
            const focusScale = clamp(
                Math.min((FOCUS_FILL * viewportH) / sy, (FOCUS_FILL * viewportW) / sx),
                1,
                FOCUS_MAX_SCALE
            )
            const focusDepth = CAMERA_Z * (1 - 1 / focusScale)

            /* --- what is on screen, for the next tap to be tested against. */
            if (layout.ys.length !== n) layout.ys.length = n
            for (let i = 0; i < n; i++) {
                layout.ys[i] = wrapTo(step * i - scroll.current, total)
            }
            layout.sx = sx
            layout.sy = sy
            layout.count = n

            gl.uniform1f(uSpin, clamp(props.turn.spin, 0, 10))
            gl.uniform1f(uDistortion, clamp(props.turn.twist, 0, 10))
            // The reference's diagonal: the head start runs across the plane AND
            // up it, which is what keeps the twist from reading as a hinge.
            gl.uniform3f(uDistortionAxis, 1, 1, 0)
            if (props.turn.axis === "x") gl.uniform3f(uRotationAxis, 1, 0, 0)
            else gl.uniform3f(uRotationAxis, 0, 1, 0)
            gl.uniform2f(uPlaneSize, sx, sy)
            gl.uniform1f(
                uRadius,
                clamp(props.radius * unitsPerPx, 0, Math.min(sx, sy) / 2)
            )
            gl.uniform1f(uAA, EDGE_AA_PX * unitsPerPx)

            gl.clear(gl.COLOR_BUFFER_BIT)

            const drawPlane = (i: number) => {
                const chosen = i === focus.index
                // Folded into one window centred on the screen, so the column
                // presents the same face to a scroll up as to a scroll down and
                // the jump happens half a column away in either direction.
                const home = layout.ys[i]
                // The chosen picture walks its own offset out to nothing, so it
                // arrives dead centre and leaves from exactly where it stood.
                const y = chosen ? home * (1 - lifted) : home

                // The reference's map from screen position to rotation phase:
                // 5 a screen below, 15 a screen above. `fract` in the shader
                // turns that into the repeating turn. Read at the picture's
                // HOME position even as it lifts, so the twist it unwinds is
                // the one it was caught in rather than one it slides through.
                gl.uniform1f(uPosition, 10 + (5 * (chosen ? home : y)) / viewportH)
                gl.uniform1f(uFlat, chosen ? lifted : 0)
                gl.uniform1f(uDim, chosen ? 1 : 1 - (1 - FOCUS_DIM) * lifted)

                modelView.fill(0)
                modelView[0] = sx
                modelView[5] = sy
                modelView[10] = 1
                modelView[13] = y
                modelView[14] = -CAMERA_Z + (chosen ? focusDepth * lifted : 0)
                modelView[15] = 1
                gl.uniformMatrix4fv(uModelView, false, modelView)

                // The list repeats along the column, so a plane past the end of
                // it shows the picture that many places from the start.
                const source = i % pictures
                const slot = slots[source]
                if (!slot) return
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, slot.tex)
                // No measurement yet means no aspect to honour, and the card's
                // own size fills the box — the right first paint.
                if (slot.width > 0 && slot.height > 0) {
                    gl.uniform2f(uImageSize, slot.width, slot.height)
                } else {
                    gl.uniform2f(uImageSize, sx, sy)
                }
                // Read here rather than baked in at upload, so dragging the
                // slider re-frames the picture already on screen.
                const offsetPx = props.entries[source]?.offsetY ?? 0
                gl.uniform1f(uOffset, offsetPx / Math.max(1, props.cardHeight))

                gl.drawElements(
                    gl.TRIANGLES,
                    plane.index.length,
                    gl.UNSIGNED_SHORT,
                    0
                )
            }

            // The chosen picture goes last. Nothing here writes depth — the
            // column is drawn in order — so last is what puts it in front.
            for (let i = 0; i < n; i++) if (i !== focus.index) drawPlane(i)
            if (focus.index >= 0 && focus.index < n) drawPlane(focus.index)
        }
        raf = requestAnimationFrame(frame)

        /* ------------------------------------------------------ teardown --- */

        return () => {
            cancelAnimationFrame(raf)
            observer?.disconnect()
            intersect?.disconnect()
            root.removeEventListener("wheel", onWheel)
            root.removeEventListener("touchstart", onTouchStart)
            root.removeEventListener("touchmove", onTouchMove)
            root.removeEventListener("touchend", onTouchEnd)
            root.removeEventListener("touchcancel", onTouchEnd)
            root.removeEventListener("pointerdown", onPointerDown)
            root.removeEventListener("pointermove", onPointerMove)
            root.removeEventListener("pointerup", onPointerUp)
            root.removeEventListener("pointercancel", onPointerCancel)
            slots.forEach((slot) => slot.tex && gl.deleteTexture(slot.tex))
            gl.deleteBuffer(positionBuffer)
            gl.deleteBuffer(uvBuffer)
            gl.deleteBuffer(indexBuffer)
            gl.deleteProgram(program)
            // Never loseContext(): getContext hands the same context back per
            // canvas, so a remount would find a dead one.
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                // The wheel and the finger are read without being taken, so the
                // page still scrolls past the section.
                touchAction: "pan-y",
                cursor: drag ? "grab" : "default",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}
