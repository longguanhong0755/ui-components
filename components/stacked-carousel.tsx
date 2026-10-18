"use client"

/**
 * StackedCarousel3D
 *
 * A deck of image planes stacked along Z, tilted in view, scrolled
 * endlessly by the wheel. Hovering a plane flattens it to face the camera,
 * pops it forward and pushes its neighbours apart.
 *
 * Port notes (CLAUDE.md rule 10):
 * - `three` and `gsap` removed. Raw WebGL1: one quad, one draw call per plane,
 *   depth-tested and painter-sorted back-to-front by view depth — the same
 *   pipeline three gave the source (depthWrite on, transparent sort, hovered
 *   forced last by renderOrder). Picking is ray/plane math on the CPU, so the
 *   source's second invisible mesh group is gone.
 * - No per-frame setState; every live input read from a ref (rule 6).
 * - Sizing from `clientWidth`/`clientHeight`, never `getBoundingClientRect`
 *   (rule G). The pointer pick DOES use the rect — a client-space coordinate
 *   has no other reference — but normalizes by `r.width` before rescaling to
 *   `vw`, so the canvas zoom cancels out.
 * - Motion is dt-corrected: the source lerped per frame, so its speed was tied
 *   to the frame rate.
 *
 * 1:1 with the reference (rule 8 — the reference defines the interaction):
 * - Hover flatten is the source's quaternion path: the plane's LOCAL rotation
 *   tweens 0 -> eulerXYZ(inverse(rootQuat)) over 1.2s power3.out, and its world
 *   rotation is rootRotation * localRotation. An euler lerp of the root angles
 *   only matches this on a single axis, so it stopped being valid the moment
 *   the yaw dial came back.
 * - Wheel gain, auto-drift rate, damping, intro curve and the depth-staggered
 *   intro all reproduce the source's numbers at its defaults.
 * - Every cut control below is frozen at the value the source shipped with, so
 *   a default instance renders and behaves identically.
 * - Pick is front-face only (`den < 0`), matching three's FrontSide raycast.
 *
 * Deliberately NOT matched:
 * - `premultipliedAlpha`. three's renderer defaults it true while leaving the
 *   textures straight-alpha, so the source haloed at any soft edge. This uses a
 *   straight-alpha context + SRC_ALPHA blending, which is correct.
 * - Auto-drift stays dt-corrected rather than per-frame, so it does not run 2x
 *   fast on a 120Hz display.
 * - `Speed` is rule 11a's dial (-100..100, 50 = the shipped rate) rather than
 *   the source's raw per-frame number. Reach is +/-36 units/sec against the
 *   source's +/-300; the shared vocabulary pins the scale.
 */
import * as React from "react"
import { useEffect, useRef } from "react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Frozen: Camera > Distance and Size were one dial. */
const CAMERA_DISTANCE = 900
/** Frozen: Camera > Perspective, at the value the source shipped with. */
const PERSPECTIVE = 45
/**
 * Frozen: the `Count` dial, at the 20 it shipped defaulting to. It is a FLOOR,
 * not a fixed size — the deck holds `max(20, images.length)` planes, so a
 * default instance is plane-for-plane what it was, and a designer who lists 30
 * pictures gets 30 rather than silently losing ten to a dial that is no longer
 * there to raise. Under the floor the pictures cycle (`idx % slots.length`),
 * which is what made 8 defaults read as a deck of 20 in the first place.
 */
const DECK_MIN = 20

interface CameraGroup {
    /** pitch, degrees — the source's View Angle X */
    tilt?: number
    /** yaw, degrees — the source's View Angle Y */
    angle?: number
}

interface Props {
    /** flat list of picture URLs — the Array control's rows ARE the images */
    images?: string[]
    cardWidth?: number
    cardHeight?: number
    /** z-distance between two cards in the deck, px */
    gap?: number
    /** 0..100; 0 stops, 50 is the rate the carousel shipped at */
    speed?: number
    /** which way the deck drifts. `forward` = cards travel toward the viewer. */
    direction?: "forward" | "backward"
    camera?: CameraGroup
    style?: React.CSSProperties
}

/** The card box, in px, on the folder's shared 40–800 span. Defaults are the
 *  shipped 420x300, so an untouched instance is unchanged; the old single `Size`
 *  set the width only and pinned the height to a frozen 300/420 aspect. */
const DEFAULT_CARD_W = 420
const DEFAULT_CARD_H = 300

/* Cut controls (rule 10), each frozen at the value the source shipped with. */
/** Wheel gain. The source was `deltaY * scrollSpeed(8) * 0.05`. */
const SCROLL_GAIN = 0.4
/** How fast the scroll settles, per frame at 60fps. The source's 0.05. */
const DAMPING = 0.05
/** Extra px the neighbours are pushed apart on hover. The source's 0. */
const HOVER_GAP = 0
/** Stack offset in the tilted root space. The source's posX / posY. */
const POS_X = 0
const POS_Y = 0
/** World units/sec at dial 50 — the source's 0.3 per frame at 60fps. */
const SPEED_AT_50 = 18
/**
 * World units/sec at dial 100 — 6x the shipped drift, a full lap of the default
 * deck in ~18s where a linear dial took ~56s and still read as a crawl.
 *
 * The dial is PIECEWISE, not one power curve: linear from 0 to the shipped
 * anchor at 50, quadratic from 50 to here. A single curve steep enough to reach
 * this maximum flattens its own bottom end — at x^2.5 the whole 1..15 stretch
 * lands under 1 unit/sec, indistinguishable from stopped, which is a dial that
 * maps to nothing over a sixth of its travel (rule F). Splitting at the anchor
 * keeps every low value visibly different and puts the compression where the
 * top end is free.
 */
const SPEED_AT_100 = 108
/** Hover flatten tween, seconds. The source's gsap duration. */
const FLATTEN_DUR = 1.2

/* Dummy pictures, so a fresh instance is never blank and every card is
 * DISTINCT. Inline SVG data URIs, never photo URLs: the previous Unsplash
 * defaults had already lost one ID to a 404 — which left that card on its 1x1
 * init texture, a flat grey chip — and none of them resolve offline, behind a
 * proxy, or on a Framer canvas with no network. One set across the folder. */
const DUMMY_PAIRS: ReadonlyArray<[string, string]> = [
    ["FF7A45", "FFB199"],
    ["4D7CFE", "9BC1FF"],
    ["16C79A", "9BE7C4"],
    ["FFC53D", "FFE9A8"],
    ["B15CFF", "E0B8FF"],
    ["FF4D7E", "FFB3C7"],
]
const dummyImage = (i: number, w = 1200, h = 800) => {
    const [a, b] = DUMMY_PAIRS[i % DUMMY_PAIRS.length]
    const n = String(i + 1).padStart(2, "0")
    return (
        `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E` +
        `%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E` +
        `%3Cstop offset='0' stop-color='%23${a}'/%3E%3Cstop offset='1' stop-color='%23${b}'/%3E` +
        `%3C/linearGradient%3E%3C/defs%3E%3Crect width='${w}' height='${h}' fill='url(%23g)'/%3E` +
        `%3Ctext x='50%25' y='50%25' dy='.35em' text-anchor='middle' ` +
        `font-family='Inter, Helvetica, Arial, sans-serif' font-size='${Math.round(Math.min(w, h) * 0.34)}' ` +
        `font-weight='700' fill='rgba(255,255,255,0.9)'%3E${n}%3C/text%3E%3C/svg%3E`
    )
        /* Spaces, quotes and parens are all invalid inside an unquoted CSS
         * `url(...)`, and a card painting this through
         * `backgroundImage: url(${src})` drops the whole declaration and
         * renders empty — measured, not guessed. Encoding them keeps ONE
         * string usable as an <img> src, a CSS url() and a GL texture alike. */
        .replace(/ /g, "%20")
        .replace(/'/g, "%27")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29")
}

// Typed so every optional field has a value at the read site (rule 10 — an
// untyped literal narrows the prop type and every omitted field errors).
// Eight cards on a 420x300 face, so the deck reads as a deck.
const DEFAULT_ITEMS: string[] = Array.from({ length: 8 }, (_, i) =>
    dummyImage(i, 840, 600)
)

const DEFAULT_CAMERA: Required<CameraGroup> = {
    tilt: 50,
    angle: 0,
}

/**
 * Everything the frame loop reads, flattened. Groups are spread-merged over
 * their defaults, never resolved by a hand-written `??` chain — a chain
 * silently skips a field the designer never touched.
 */
interface Resolved {
    items: string[]
    /** JSON of `items`, computed once per render so the loop never stringifies */
    mediaKey: string
    visibleCount: number
    imageWidth: number
    imageHeight: number
    zSpacing: number
    perspective: number
    cameraDistance: number
    viewAngleX: number
    viewAngleY: number
    /** world units/sec, signed */
    autoScrollSpeed: number
}

function resolve(p: Props): Resolved {
    // Spread-merge over the typed defaults — an unopened group arrives
    // undefined, and a `??` chain is where one missed key pins a control.
    const camera = { ...DEFAULT_CAMERA, ...p.camera }
    const items = p.images && p.images.length ? p.images : DEFAULT_ITEMS
    // Magnitude and direction are two dials now, so clamp the magnitude at 0:
    // an instance holding the old signed dial's negative would otherwise drift
    // backward AND ignore the Direction row it can see.
    const dial = Math.min(100, Math.max(0, p.speed ?? 50))
    const over = (dial - 50) / 50
    const rate =
        dial <= 50
            ? SPEED_AT_50 * (dial / 50)
            : SPEED_AT_50 + (SPEED_AT_100 - SPEED_AT_50) * over * over
    return {
        items,
        mediaKey: JSON.stringify(items),
        visibleCount: Math.max(DECK_MIN, items.length),
        imageWidth: Math.max(1, Math.round(p.cardWidth ?? DEFAULT_CARD_W)),
        imageHeight: Math.max(1, Math.round(p.cardHeight ?? DEFAULT_CARD_H)),
        zSpacing: p.gap ?? 100,
        perspective: PERSPECTIVE,
        cameraDistance: CAMERA_DISTANCE,
        viewAngleX: camera.tilt,
        viewAngleY: camera.angle,
        // Positive scroll raises each card's z, and the camera sits at +z
        // looking down -z, so positive is toward the viewer.
        autoScrollSpeed: p.direction === "backward" ? -rate : rate,
    }
}

// ---------------------------------------------------------------------------
// mat4 (column-major, the layout gl.uniformMatrix4fv expects)
// ---------------------------------------------------------------------------

type M4 = Float32Array

function m4Identity(): M4 {
    // prettier-ignore
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])
}

function m4Mul(a: M4, b: M4, out: M4): M4 {
    for (let c = 0; c < 4; c++) {
        const b0 = b[c * 4],
            b1 = b[c * 4 + 1],
            b2 = b[c * 4 + 2],
            b3 = b[c * 4 + 3]
        out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3
        out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3
        out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3
        out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3
    }
    return out
}

function m4Perspective(
    fovDeg: number,
    aspect: number,
    near: number,
    far: number,
    out: M4
): M4 {
    const f = 1 / Math.tan(((fovDeg * Math.PI) / 180) * 0.5)
    out.fill(0)
    out[0] = f / aspect
    out[5] = f
    out[10] = (far + near) / (near - far)
    out[11] = -1
    out[14] = (2 * far * near) / (near - far)
    return out
}

/**
 * Rotation from an XYZ euler, written column-major. Byte-for-byte the matrix
 * three's `Matrix4.makeRotationFromEuler` produces for order "XYZ", which is
 * what the source's `THREE.Euler(x, y, 0, "XYZ")` fed the meshes.
 */
function m4RotXYZ(rx: number, ry: number, rz: number, out: M4): M4 {
    const cx = Math.cos(rx),
        sx = Math.sin(rx)
    const cy = Math.cos(ry),
        sy = Math.sin(ry)
    const cz = Math.cos(rz),
        sz = Math.sin(rz)
    out[0] = cy * cz
    out[1] = sx * sy * cz + cx * sz
    out[2] = -cx * sy * cz + sx * sz
    out[3] = 0
    out[4] = -cy * sz
    out[5] = -sx * sy * sz + cx * cz
    out[6] = cx * sy * sz + sx * cz
    out[7] = 0
    out[8] = sy
    out[9] = -sx * cy
    out[10] = cx * cy
    out[11] = 0
    out[12] = 0
    out[13] = 0
    out[14] = 0
    out[15] = 1
    return out
}

/**
 * XYZ euler of a rotation matrix's TRANSPOSE (i.e. of its inverse), the same
 * decomposition three's `Euler.setFromRotationMatrix(m, "XYZ")` runs. The
 * source got this vector from `quat(root).invert()` then read it back as an
 * euler; transposing is the same operation without the quaternion detour.
 */
function eulerOfInverse(r: M4, out: { x: number; y: number; z: number }) {
    // Transpose: element (row, col) of Rt is r[row*4 + col].
    const m11 = r[0],
        m12 = r[1],
        m13 = r[2]
    const m22 = r[5],
        m23 = r[6]
    const m32 = r[9],
        m33 = r[10]
    out.y = Math.asin(Math.max(-1, Math.min(1, m13)))
    if (Math.abs(m13) < 0.9999999) {
        out.x = Math.atan2(-m23, m33)
        out.z = Math.atan2(-m12, m11)
    } else {
        out.x = Math.atan2(m32, m22)
        out.z = 0
    }
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const VERT = `
attribute vec2 aPos;
uniform mat4 uMVP;
varying vec2 vUV;
void main() {
    vUV = aPos + 0.5;
    gl_Position = uMVP * vec4(aPos, 0.0, 1.0);
}`

const FRAG = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uTex;
uniform float uHasTex;
void main() {
    vec4 c = uHasTex > 0.5 ? texture2D(uTex, vUV) : vec4(0.15, 0.15, 0.15, 1.0);
    float a = c.a;
    // The source's alphaTest: 0.02. Discarded texels write no depth.
    if (a < 0.02) discard;
    gl_FragColor = vec4(c.rgb, a);
}`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("StackedCarousel3D shader:", gl.getShaderInfoLog(s))
    }
    return s
}

const PLACEHOLDER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23262626' width='800' height='600'/%3E%3C/svg%3E"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StackedCarousel3D(props: Props) {
    // Every control key is destructured out, so `rest` carries only the DOM
    // props Framer injects (id, className, tabIndex, …). Spreading the whole
    // prop bag onto a div makes React warn on `images`, `camera`, `speed`, …
    const {
        images: _images,
        cardWidth: _cardWidth,
        cardHeight: _cardHeight,
        gap: _gap,
        speed: _speed,
        direction: _direction,
        camera: _camera,
        style,
        ...rest
    } = props
    const p = resolve(props)

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Every live input read from this ref inside the loop (rule 6).
    const propsRef = useRef(p)
    propsRef.current = p

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const glOrNull = canvas.getContext("webgl", {
            alpha: true,
            antialias: true,
            depth: true,
            premultipliedAlpha: false,
        })
        if (!glOrNull) return
        // Typed non-null here rather than narrowed by the guard: TypeScript
        // drops a narrowing inside a hoisted `function` declaration (it could
        // be called before the guard ran), and every helper below is one.
        const gl: WebGLRenderingContext = glOrNull

        // -- program -------------------------------------------------------
        const prog = gl.createProgram()!
        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        gl.useProgram(prog)

        const aPos = gl.getAttribLocation(prog, "aPos")
        const uMVP = gl.getUniformLocation(prog, "uMVP")
        const uTex = gl.getUniformLocation(prog, "uTex")
        const uHasTex = gl.getUniformLocation(prog, "uHasTex")

        const quad = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quad)
        // prettier-ignore
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -0.5,-0.5,  0.5,-0.5,  -0.5,0.5,
            -0.5, 0.5,  0.5,-0.5,   0.5,0.5,
        ]), gl.STATIC_DRAW)
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        // The source's materials were depthWrite: true with three's default
        // LessEqualDepth test, drawn in three's transparent order (far first,
        // renderOrder ahead of depth). Reproduced exactly.
        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)
        gl.depthMask(true)
        gl.enable(gl.BLEND)
        gl.blendFuncSeparate(
            gl.SRC_ALPHA,
            gl.ONE_MINUS_SRC_ALPHA,
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA
        )
        gl.uniform1i(uTex, 0)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

        // -- texture pool --------------------------------------------------
        interface Slot {
            tex: WebGLTexture
            ready: boolean
        }
        let slots: Slot[] = []

        function newTexture() {
            const t = gl.createTexture()!
            gl.bindTexture(gl.TEXTURE_2D, t)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                new Uint8Array([38, 38, 38, 255])
            )
            // NPOT-safe: no mipmaps, clamped. three does the same downgrade for
            // NPOT textures under WebGL1.
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            return t
        }

        function upload(tex: WebGLTexture, src: TexImageSource) {
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                src
            )
        }

        function disposeSlots() {
            for (const s of slots) gl.deleteTexture(s.tex)
            slots = []
        }

        function buildMedia() {
            disposeSlots()
            const list = propsRef.current.items
            slots = list.map((src) => {
                const slot: Slot = { tex: newTexture(), ready: false }
                const img = new Image()
                img.crossOrigin = "anonymous"
                img.onload = () => {
                    upload(slot.tex, img)
                    slot.ready = true
                }
                // An empty row still gets a card, so the deck never gains a hole
                // when a designer adds a slot before picking the picture.
                img.src = src || PLACEHOLDER
                return slot
            })
        }

        buildMedia()

        // -- sizing (clientWidth, never getBoundingClientRect) --------------
        let vw = 1
        let vh = 1
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            vw = Math.max(1, host.clientWidth)
            vh = Math.max(1, host.clientHeight)
            canvas.width = Math.round(vw * dpr)
            canvas.height = Math.round(vh * dpr)
            gl.viewport(0, 0, canvas.width, canvas.height)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(host)

        // Pause offscreen, as the source did.
        let isVisible = false
        const io = new IntersectionObserver((e) => {
            isVisible = e[0].isIntersecting
        })
        io.observe(host)

        // -- interaction ----------------------------------------------------
        let ndcX = -9999
        let ndcY = -9999
        let overHost = false
        let targetScroll = 0
        let currentScroll = 0
        let hovered = -1

        /** Per-plane flatten tween, replaying gsap's 1.2s power3.out. */
        interface Flatten {
            v: number
            from: number
            to: number
            t: number
        }
        let flat: Flatten[] = []

        /** Frame constants the pick re-uses to build its ray. */
        let fTan = 1
        let fAspect = 1
        let fCamZ = 900

        const toNdc = (e: { clientX: number; clientY: number }) => {
            // Client space has no reference but the rect. Normalizing by
            // r.width before rescaling to vw cancels the canvas zoom (rule G).
            const r = canvas.getBoundingClientRect()
            const px = ((e.clientX - r.left) / r.width) * vw
            const py = ((e.clientY - r.top) / r.height) * vh
            return { nx: (px / vw) * 2 - 1, ny: -(py / vh) * 2 + 1 }
        }

        const onMove = (e: PointerEvent) => {
            const c = toNdc(e)
            ndcX = c.nx
            ndcY = c.ny
            overHost = true
        }
        const onLeave = () => {
            ndcX = -9999
            ndcY = -9999
            overHost = false
        }
        const onWheel = (e: WheelEvent) => {
            if (overHost) targetScroll -= e.deltaY * SCROLL_GAIN
        }
        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerleave", onLeave)
        // Bound on window so a pointer that leaves mid-gesture still resolves.
        window.addEventListener("wheel", onWheel, { passive: true })

        // -- loop -----------------------------------------------------------
        const proj = m4Identity()
        const view = m4Identity()
        const model = m4Identity()
        const rootRot = m4Identity()
        const localRot = m4Identity()
        const worldRot = m4Identity()
        const vp = m4Identity()
        const mvp = m4Identity()

        // eulerXYZ(inverse(rootRot)), recomputed only when the angles change —
        // the source cached it the same way behind lastAngleX / lastAngleY.
        const flatEuler = { x: 0, y: 0, z: 0 }
        let lastRx = NaN
        let lastRy = NaN

        let lastMediaKey = propsRef.current.mediaKey
        let intro = 0
        let last = performance.now()
        let raf = 0

        interface Item {
            i: number
            /** stack-space position, pre root rotation */
            x: number
            y: number
            z: number
            /** the pure normalized z, kept apart from the animated z so a wrap
             *  is detected on the wrap coordinate and not on the hover push */
            bz: number
            sx: number
            sy: number
            /** view-space depth, for the painter sort */
            wz: number
        }
        let items: Item[] = []
        const order: number[] = []

        /**
         * World matrix for one plane. Its position lives in the tilted root
         * space, so the root rotation is applied to it. Its ORIENTATION is
         * rootRotation * localRotation, where local tweens 0 -> flatEuler — so
         * a fully flattened plane's world rotation is root * root^-1 = identity
         * and it faces the camera. This is the source's mesh-under-rotated-group
         * composition; an euler lerp of the root angles only agrees with it when
         * one of the two angles is zero.
         */
        function buildModel(it: Item, f: number, grow: number, out: M4): M4 {
            // position rotated into world space by the root
            const wx = rootRot[0] * it.x + rootRot[4] * it.y + rootRot[8] * it.z
            const wy = rootRot[1] * it.x + rootRot[5] * it.y + rootRot[9] * it.z
            const wz =
                rootRot[2] * it.x + rootRot[6] * it.y + rootRot[10] * it.z

            m4RotXYZ(flatEuler.x * f, flatEuler.y * f, flatEuler.z * f, localRot)
            m4Mul(rootRot, localRot, worldRot)

            const sx = it.sx * grow
            const sy = it.sy * grow
            out[0] = worldRot[0] * sx
            out[1] = worldRot[1] * sx
            out[2] = worldRot[2] * sx
            out[3] = 0
            out[4] = worldRot[4] * sy
            out[5] = worldRot[5] * sy
            out[6] = worldRot[6] * sy
            out[7] = 0
            out[8] = worldRot[8]
            out[9] = worldRot[9]
            out[10] = worldRot[10]
            out[11] = 0
            out[12] = wx
            out[13] = wy
            out[14] = wz
            out[15] = 1
            return out
        }

        /**
         * Ray/plane pick against the planes' current transforms. Front faces
         * only (`den < 0`), matching three's FrontSide raycast on the source's
         * invisible interaction meshes — which also carried the same rotation
         * tween and a 1.2x box on the hovered one.
         */
        function pick(nx: number, ny: number): number {
            const rox = 0,
                roy = 0,
                roz = fCamZ
            const rdx = nx * fTan * fAspect
            const rdy = ny * fTan
            const rdz = -1
            let hit = -1
            let hitT = Infinity
            for (const it of items) {
                if (Number.isNaN(it.z)) continue
                const grow = hovered === it.i ? 1.2 : 1
                buildModel(it, flat[it.i] ? flat[it.i].v : 0, grow, model)
                const ax = model[0],
                    ay = model[1],
                    az = model[2]
                const bx = model[4],
                    by = model[5],
                    bz = model[6]
                const cxw = model[12]
                const cyw = model[13]
                const czw = model[14]
                const nxw = ay * bz - az * by
                const nyw = az * bx - ax * bz
                const nzw = ax * by - ay * bx
                const den = rdx * nxw + rdy * nyw + rdz * nzw
                if (den > -1e-8) continue // back-facing or edge-on
                const t =
                    ((cxw - rox) * nxw +
                        (cyw - roy) * nyw +
                        (czw - roz) * nzw) /
                    den
                if (t <= 0 || t >= hitT) continue
                const px = rox + rdx * t - cxw
                const py = roy + rdy * t - cyw
                const pz = roz + rdz * t - czw
                const u =
                    (px * ax + py * ay + pz * az) / (ax * ax + ay * ay + az * az)
                const v =
                    (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz)
                if (Math.abs(u) <= 0.5 && Math.abs(v) <= 0.5) {
                    hitT = t
                    hit = it.i
                }
            }
            return hit
        }

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min((now - last) / 1000, 0.1)
            last = now
            const c = propsRef.current

            // The source's intro was a gsap tween on gsap's own ticker, so it
            // ran whether or not the render loop was gated. Advance it first.
            intro = Math.min(1, intro + dt / 2.4)

            if (!isVisible) return

            if (c.mediaKey !== lastMediaKey) {
                lastMediaKey = c.mediaKey
                buildMedia()
            }

            // power3.inOut, gsap's ease on the source's 2.4s intro tween.
            const introProg =
                intro < 0.5
                    ? 4 * intro ** 3
                    : 1 - Math.pow(-2 * intro + 2, 3) / 2

            const count = Math.max(1, Math.round(c.visibleCount))
            if (flat.length !== count) {
                flat = new Array(count).fill(null).map(() => ({
                    v: 0,
                    from: 0,
                    to: 0,
                    t: 1,
                }))
            }
            if (items.length !== count) {
                // A count change rebuilt every mesh in the source, so every
                // plane snapped. Same here — NaN z means "snap on first frame".
                items = new Array(count).fill(null).map((_, i) => ({
                    i,
                    x: POS_X,
                    y: POS_Y,
                    z: NaN,
                    bz: NaN,
                    sx: c.imageWidth,
                    sy: c.imageHeight,
                    wz: 0,
                }))
            }

            // The source's per-frame lerp factor, made frame-rate independent.
            const lf = 1 - Math.pow(1 - DAMPING, dt * 60)

            currentScroll += (targetScroll - currentScroll) * lf
            if (hovered === -1) targetScroll += c.autoScrollSpeed * dt

            const rx = (c.viewAngleX * Math.PI) / 180
            const ry = (c.viewAngleY * Math.PI) / 180
            if (rx !== lastRx || ry !== lastRy) {
                m4RotXYZ(rx, ry, 0, rootRot)
                eulerOfInverse(rootRot, flatEuler)
                lastRx = rx
                lastRy = ry
            }

            const camZ = c.cameraDistance
            const totalDepth = Math.max(1, count * c.zSpacing)
            const maxZ = camZ - 50
            const minZ = maxZ - totalDepth

            const aspect = vw / vh
            m4Perspective(c.perspective, aspect, 0.1, 20000, proj)
            view[14] = -camZ
            m4Mul(proj, view, vp)

            fTan = Math.tan(((c.perspective * Math.PI) / 180) * 0.5)
            fAspect = aspect
            fCamZ = camZ

            // --- pick: against last frame's transforms, as three did --------
            const hit = overHost ? pick(ndcX, ndcY) : -1
            const prevHovered = hovered
            hovered = hit

            // Retarget the flatten tweens, gsap overwrite: "auto" — restart from
            // wherever the value currently is.
            if (hovered !== prevHovered) {
                if (prevHovered >= 0 && flat[prevHovered]) {
                    const t = flat[prevHovered]
                    t.from = t.v
                    t.to = 0
                    t.t = 0
                }
                if (hovered >= 0 && flat[hovered]) {
                    const t = flat[hovered]
                    t.from = t.v
                    t.to = 1
                    t.t = 0
                }
            }
            for (const t of flat) {
                if (t.t >= 1) continue
                t.t = Math.min(1, t.t + dt / FLATTEN_DUR)
                const e = 1 - Math.pow(1 - t.t, 3) // power3.out
                t.v = t.from + (t.to - t.from) * e
            }

            // Hover holds the scroll where it is.
            if (hovered >= 0)
                targetScroll +=
                    (currentScroll - targetScroll) * Math.min(lf * 1.5, 1)

            // --- layout ----------------------------------------------------
            const diag = Math.hypot(c.imageWidth, c.imageHeight)
            const pushSpread = diag * 0.5 + HOVER_GAP
            let hoveredZ = 0
            if (hovered >= 0) {
                const o = hovered * c.zSpacing + currentScroll
                hoveredZ =
                    ((((o - minZ) % totalDepth) + totalDepth) % totalDepth) +
                    minZ
            }

            for (const it of items) {
                const i = it.i
                const o = i * c.zSpacing + currentScroll
                const norm =
                    ((((o - minZ) % totalDepth) + totalDepth) % totalDepth) +
                    minZ
                const first = Number.isNaN(it.bz)
                const prevBz = first ? norm : it.bz
                it.bz = norm

                let tz = norm
                let ty = POS_Y
                let tsx = c.imageWidth
                let tsy = c.imageHeight

                // Depth-staggered intro.
                const depthFactor = (maxZ - norm) / totalDepth
                const itemProg = Math.max(
                    0,
                    Math.min(1, (introProg - depthFactor * 0.4) / 0.6)
                )
                const ease = 1 - Math.pow(1 - itemProg, 3)
                const inv = 1 - ease
                tz -= 300 * inv
                ty -= 60 * inv
                tsx *= 0.4 + 0.6 * ease
                tsy *= 0.4 + 0.6 * ease

                let distFromHover = 0
                if (hovered >= 0) {
                    if (i === hovered) {
                        tz += 60
                    } else {
                        distFromHover = tz - hoveredZ
                        if (distFromHover > totalDepth / 2)
                            distFromHover -= totalDepth
                        if (distFromHover < -totalDepth / 2)
                            distFromHover += totalDepth
                        if (distFromHover < -0.1) tz -= pushSpread
                        else if (distFromHover > 0.1) tz += pushSpread
                    }
                }

                // Snap on a wrap, lerp otherwise. The wrap test is on `bz` (the
                // pure normalized z), never on the animated z — the hover push
                // moves the animated z by pushSpread, which at a small spacing
                // x count exceeds totalDepth/2 and would read as a wrap forever.
                const jumped =
                    first ||
                    Math.abs(norm - prevBz) > totalDepth * 0.5 ||
                    (introProg > 0.99 &&
                        Math.abs(tz - it.z) > pushSpread * 0.8 &&
                        Math.abs(distFromHover) > totalDepth * 0.35)

                if (jumped) {
                    it.z = tz
                    it.y = ty
                    it.sx = tsx
                    it.sy = tsy
                } else {
                    it.z += (tz - it.z) * lf
                    it.y += (ty - it.y) * lf
                    it.sx += (tsx - it.sx) * lf
                    it.sy += (tsy - it.sy) * lf
                }

                it.wz =
                    rootRot[2] * it.x + rootRot[6] * it.y + rootRot[10] * it.z
            }

            // --- draw: far to near, hovered last (the source's renderOrder 10)
            order.length = 0
            for (let i = 0; i < items.length; i++) order.push(i)
            order.sort((a, b) => {
                if (a === hovered) return 1
                if (b === hovered) return -1
                return items[a].wz - items[b].wz
            })

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

            for (const idx of order) {
                const it = items[idx]
                buildModel(it, flat[idx].v, 1, model)
                m4Mul(vp, model, mvp)
                gl.uniformMatrix4fv(uMVP, false, mvp)
                const slot = slots.length ? slots[idx % slots.length] : null
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, slot ? slot.tex : null)
                gl.uniform1f(uHasTex, slot && slot.ready ? 1 : 0)
                gl.drawArrays(gl.TRIANGLES, 0, 6)
            }
        }

        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            io.disconnect()
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("wheel", onWheel)
            disposeSlots()
            gl.deleteBuffer(quad)
            gl.deleteProgram(prog)
            // Never loseContext(): getContext returns the same context per
            // canvas, so a StrictMode remount would reuse a force-lost one.
        }
    }, [])

    return (
        <div
            {...rest}
            ref={hostRef}
            style={{
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                position: "relative",
                overflow: "hidden",
                isolation: "isolate",
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
                }}
            />
        </div>
    )
}
