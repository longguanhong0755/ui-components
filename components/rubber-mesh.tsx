"use client"

/**
 * RubberMesh
 *
 * An image plane made of a lattice. The pointer bulges the sheet toward itself
 * — the reference's in-plane sine warp, `pos.y += sin(uv.x * PI) * shift *
 * 0.625` and its mirror on x — spring-lerped, flattening when the pointer
 * leaves. A click dissolves to the next picture: each texture's own luminance
 * displaces the other's sample along y, then the two are mixed by progress.
 *
 * Ported from https://codepen.io/pizza3/pen/GRoaENX ("Rubber Mesh Swipe
 * Transition", after https://twitter.com/romanus_march/status/1250068202257776643).
 *
 * THE GESTURE IS THE ONE CHANGE, AND IT WAS ASKED FOR. The reference is
 * drag-driven ("PULL & RELEASE IMAGE UP OR DOWN") via react-use-gesture, with
 * a 150px release threshold deciding whether the swipe commits. Here hover
 * drives the stretch and a click commits the swipe. Everything else — the warp
 * formula, the dissolve, the two-slot texture ping-pong, the caption swap — is
 * the reference's.
 *
 * NO `three`, NO react-spring, NO react-use-gesture. Raw WebGL1 (rule 10:
 * self-contained beats convenient). What those three libraries were doing here
 * is small and is now explicit:
 * - PerspectiveCamera + a plane at z = 0 facing it -> the projection of a
 *   coplanar quad is a constant scale, so it is two numbers, not a matrix.
 * - PlaneGeometry(2, 3, 10, 10) -> one unit lattice in normalized plane space,
 *   with the plane's px size as a uniform. Tessellated finer than the
 *   reference's 10x10 (see LATTICE below) — the same warp, less faceting.
 * - TextureLoader -> Image + texImage2D, NPOT-safe (clamped, LINEAR, no
 *   mipmaps), which is the downgrade three applies under WebGL1 anyway.
 * - react-spring's `useSpring` + `onFrame` -> a `MotionValue` tweened by
 *   framer-motion `animate()`, which buys the native `ControlType.Transition`
 *   (rule 2) instead of a hard-coded mass/tension pair.
 *
 * WHAT THE PORT FIXES (rule 10 — in scope even though the ask was "add it"):
 * - PER-FRAME setState. The pen's spring `onFrame` writes { X, Y, P } into
 *   React state 60x/sec, re-rendering <Noise> every frame for its whole life.
 *   Pointer and progress live in refs and go straight to uniforms; React
 *   renders the structure once.
 * - NINE DEAD UNIFORMS. `time`, `border`, `scaleX`, `scaleY`, `transition`,
 *   `swipe`, `width`, `radius` and `scale` are declared and never read by
 *   either shader. `displacement` is worse: it loads a second full-resolution
 *   Unsplash photo that nothing ever samples. All cut, along with that fetch.
 * - `plane.geometry.vertices.forEach` wraps two SCALAR lerps and runs them 121
 *   times a frame to compute the same two numbers. Also `.vertices` does not
 *   exist on a BufferGeometry, so the pen is pinned to a three build old
 *   enough to still return Geometry from PlaneGeometry. One lerp now, and
 *   dt-correct rather than per-frame (rule P — a fixed per-frame factor is a
 *   different settle at a different frame rate).
 * - `setTimeout(400)` to swap the hidden slot's texture. The transition is a
 *   spring with no fixed length, so at any slower setting the swap lands
 *   mid-dissolve and the picture jumps. Driven off the tween's completion now.
 * - PROGRESS IS CLAMPED to [0, 1] before upload. The reference's spring is
 *   underdamped (mass 2, tension 670 => zeta ~= 0.36) so progress overshoots
 *   past 1, and `mix` then EXTRAPOLATES past the destination texture into
 *   out-of-gamut colour — a flash at the end of every swipe. The bulge still
 *   gets the full springiness; only the mix factor is clamped.
 *
 * WHAT THE PORT CHANGES ON PURPOSE (flagged, not silent):
 * - FRAMING. The reference fits the plane with `width/3000`, `height/6000` and
 *   two device breakpoints, then sets `resolution.z` AND `.w` to the same
 *   scalar — which scales both axes together and squashes the picture. That
 *   only ever works full-bleed. Replaced with a real cover-fit computed per
 *   texture from the measured box and the image's own aspect, so `Width` and
 *   `Height` mean what they say and two images of different aspect both fill.
 * - CAPTION POSITION. The reference pins it at `margin-left: 27%`,
 *   `margin-top: 29vh` — numbers tied to its full-viewport plane. Centred over
 *   the plane here.
 * - CANVAS PARITY (rule 5). The Framer canvas delivers no pointer events, so a
 *   hover-only component sits dead on it. On the canvas target only, the two
 *   shifts are driven by a slow sine instead. Live and preview are hover-only.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
import { animate, motionValue } from "motion/react"
import * as React from "react"
import {
    startTransition,
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Framer bundles its own framer-motion and its exported `Transition` type is
 * not assignable to what `animate(value, ...)` accepts, so the shape is spelled
 * out. A type alias, not an interface, or it loses the implicit index signature
 * the intersection needs. Same alias as RepetitionHover / CreditCard3DTilt.
 */
type Motion = {
    type?: "spring" | "tween" | "keyframes" | "inertia"
    duration?: number
    ease?: [number, number, number, number]
    delay?: number
    stiffness?: number
    damping?: number
    mass?: number
    bounce?: number
    restSpeed?: number
    restDelta?: number
}

type FontValue = CSSProperties & { variant?: string }

/**
 * Only the picture is meaningful. Framer does not seed a new array entry from
 * the item control's nested `defaultValue`s, so a row added on the canvas
 * arrives with every field `undefined` — every read site falls back.
 */
interface SlideData {
    image?: string
    label?: string
}

interface TextGroup {
    font?: FontValue
    color?: string
}

interface Props {
    images?: SlideData[]
    background?: string
    // Keyed `itemWidth` / `itemHeight`, never `width` / `height`: Framer
    // injects numeric size props under those names and would clobber the
    // control (rule 11a). The panel still reads "Width" / "Height".
    itemWidth?: number
    itemHeight?: number
    rounded?: number
    stretch?: number
    damping?: number
    dissolve?: number
    transition?: Motion
    text?: TextGroup
    style?: CSSProperties
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/* Dummy pictures, so a fresh instance is never blank and every plate is
 * DISTINCT. Inline SVG data URIs, never photo URLs: the reference's three
 * Unsplash links 404 the day those IDs die, and show nothing offline, behind a
 * proxy, or on a canvas with no network. One set across the folder.
 * The gradient matters here beyond looking like something — the dissolve
 * displaces each texture by the OTHER's luminance, so a flat fill would give a
 * uniform offset and the transition would read as a plain cross-fade. */
const DUMMY_PAIRS: ReadonlyArray<[string, string]> = [
    ["4D7CFE", "9BC1FF"],
    ["16C79A", "9BE7C4"],
    ["FF7A45", "FFB199"],
    ["B15CFF", "E0B8FF"],
    ["FFC53D", "FFE9A8"],
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
        /* Spaces, quotes and parens are invalid unquoted inside a CSS
         * `url(...)`, and the static fallback paints this through
         * `backgroundImage`. Encoding them keeps ONE string usable as an
         * <img> src, a CSS url() and a GL texture alike. */
        .replace(/ /g, "%20")
        .replace(/'/g, "%27")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29")
}

/** Typed, so the optional `label` an omitted field would drop stays readable at
 *  every use site (rule 10 — an untyped literal narrows the prop type). */
const DEFAULT_IMAGES: SlideData[] = [
    { image: dummyImage(0), label: "ICELAND" },
    { image: dummyImage(1), label: "MALDIVES" },
    { image: dummyImage(2), label: "NAMIBIA" },
]

const DEFAULT_FONT: FontValue = {
    fontSize: "84px",
    variant: "Black",
    letterSpacing: "-0.02em",
    lineHeight: "1em",
}

/** The reference's drag spring (react-spring `mass: 2, tension: 670`), which is
 *  what actually drove `progress`. Its `duration = 2` / `easing: "easeInOut"`
 *  fields were declared and never read. */
const DEFAULT_TRANSITION: Motion = {
    type: "spring",
    mass: 2,
    stiffness: 670,
    damping: 26,
}

/**
 * Lattice resolution. The reference is PlaneGeometry(2, 3, 10, 10) — 11x11
 * vertices — so its sine bow is a 10-segment polyline and the texture inside
 * each quad is a linear stretch. Same warp, finer sampling: 48x48 is 2401
 * vertices and 13824 indices, uploaded once, and costs nothing per frame
 * because the displacement is in the vertex shader.
 */
const LATTICE = 48

/**
 * The pointer offset that stands in for the reference's release threshold. The
 * pen commits a swipe past 150px of drag and maps `shift = -Y / 100`,
 * `shiftx = X / 1000` — so a committing drag reaches shift 1.5 and shiftx 0.15.
 * Hover has no threshold, so the box EDGE is what 150px of drag was: at full
 * deflection the sheet bows exactly as far as a committing pull did, and the
 * 10:1 vertical:horizontal ratio the reference's two divisors encode survives.
 */
const SHIFT_Y_AT_EDGE = 1.5
const SHIFT_X_AT_EDGE = 0.15

/**
 * `Damping` -> the exponential rate, per second. The reference lerps 0.01 of
 * the remaining distance per frame, which at 60fps is a rate of
 * -60 * ln(0.99) = 0.603/s — a 1.7 SECOND time constant, i.e. Damping 5 on this
 * dial. That is the pen's molasses, still reachable; the default is quicker
 * because hover has no drag to lead it.
 */
const DAMPING_TO_RATE = 0.12

/** Reference `intensity` is 0.3, i.e. Dissolve 30 (rule 3 — the float becomes a
 *  whole-number percent and is divided back out here). */
const DISSOLVE_SCALE = 0.01

/** Above this the GPU cost stops buying visible sharpness (rule 10 — a DPR cap
 *  is the component's own job, not a dial). */
const MAX_DPR = 2

/** Canvas-only idle: the Framer canvas fires no pointer events, so the sheet
 *  breathes instead of sitting flat. Small enough to read as an idle, not as a
 *  motion the reference has. */
const IDLE_AMPLITUDE = 0.35
const IDLE_RATE = 0.6

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

/**
 * `aPos` is -0.5..0.5 in PLANE units, so the reference's world-space bow has to
 * be renormalized: its plane is 2 wide by 3 tall and the bow is
 * `sin(...) * shift * 5.0 * 0.125` = 0.625 world units per unit of shift.
 * Vertically that is 0.625 / 3 of the plane, horizontally 0.625 / 2. Keeping
 * the ratio is what keeps the warp the reference's rather than merely similar.
 */
const VERT = `
precision highp float;
attribute vec2 aPos;
uniform vec2 uScale;
uniform float uShift;
uniform float uShiftX;
varying vec2 vUv;
const float PI = 3.1415926535897932384626433832795;
void main() {
    vec2 uv = aPos + 0.5;
    vec2 p = aPos;
    p.y += sin(uv.x * PI) * uShift * 0.2083333333;
    p.x += sin(uv.y * PI) * uShiftX * 0.3125;
    vUv = uv;
    gl_Position = vec4(p * uScale * 2.0, 0.0, 1.0);
}
`

/**
 * The reference's dissolve, unchanged: each texture is displaced along y by the
 * OTHER texture's luminance, scaled by how far the transition has run, then the
 * two are mixed. The only additions are the per-texture cover fit (one vec2
 * each, where the reference had one shared scalar applied to both axes) and the
 * corner radius, done in plane px so it follows the sheet as it stretches.
 */
const FRAG = `
precision highp float;
uniform sampler2D uTex1;
uniform sampler2D uTex2;
uniform vec2 uCover1;
uniform vec2 uCover2;
uniform vec2 uPlanePx;
uniform float uProgress;
uniform float uIntensity;
uniform float uRadius;
varying vec2 vUv;
void main() {
    vec2 uv1 = (vUv - 0.5) * uCover1 + 0.5;
    vec2 uv2 = (vUv - 0.5) * uCover2 + 0.5;

    vec4 d1 = texture2D(uTex1, uv1);
    vec4 d2 = texture2D(uTex2, uv2);
    float displace1 = (d1.r + d1.g + d1.b) * 0.33;
    float displace2 = (d2.r + d2.g + d2.b) * 0.33;

    vec4 t1 = texture2D(uTex1, vec2(uv1.x, uv1.y + uProgress * (displace2 * uIntensity)));
    vec4 t2 = texture2D(uTex2, vec2(uv2.x, uv2.y + (1.0 - uProgress) * (displace1 * uIntensity)));
    vec4 color = mix(t1, t2, uProgress);

    // Rounded rect in plane px. No fwidth: OES_standard_derivatives is an
    // extension under WebGL1, and the plane is drawn at its own px size, so a
    // fixed one-px feather is already screen-correct.
    vec2 q = abs((vUv - 0.5) * uPlanePx) - uPlanePx * 0.5 + uRadius;
    float sd = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - uRadius;
    float mask = 1.0 - smoothstep(-1.0, 1.0, sd);

    gl_FragColor = vec4(color.rgb, color.a * mask);
}
`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) =>
    v < lo ? lo : v > hi ? hi : v

function compile(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        // Surfaced rather than swallowed: a silently failed compile renders a
        // blank plate that looks exactly like a missing picture.
        console.error("RubberMesh shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

/**
 * Sub-rect to sample so the picture COVERS the plane without distorting.
 * Wider-than-plane crops horizontally, taller crops vertically. The reference
 * scaled both axes by one number, which is a squash, not a fit.
 */
function coverScale(
    planeW: number,
    planeH: number,
    imgW: number,
    imgH: number
): [number, number] {
    if (planeW <= 0 || planeH <= 0 || imgW <= 0 || imgH <= 0) return [1, 1]
    const planeAspect = planeW / planeH
    const imgAspect = imgW / imgH
    return imgAspect > planeAspect
        ? [planeAspect / imgAspect, 1]
        : [1, imgAspect / planeAspect]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RubberMeshProps extends Props {}

export default function RubberMesh(props: RubberMeshProps) {
    const {
        images = DEFAULT_IMAGES,
        background = "#000000",
        itemWidth = 600,
        itemHeight = 400,
        rounded = 8,
        stretch = 197,
        damping = 30,
        dissolve = 53,
        transition = DEFAULT_TRANSITION,
        text,
        style,
    } = props

    const isStatic = false
    const isCanvas = false

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasHostRef = useRef<HTMLDivElement>(null)
    const [webglFailed, setWebglFailed] = useState(false)

    /** Which caption is showing. The only piece of transition state React needs
     *  — everything the GL loop reads lives in refs. */
    const [current, setCurrent] = useState(0)

    const slides = images.filter((s) => s && s.image)
    const slideCount = slides.length
    /** Structural key: the effect rebuilds textures when the LIST changes, and
     *  never when a colour or a dial does (rule 6). */
    const imagesKey = slides.map((s) => s.image).join("\n")

    // -- live inputs, read from the loop, never in the effect's deps ---------
    const cfgRef = useRef({
        itemWidth,
        itemHeight,
        rounded,
        stretch,
        damping,
        dissolve,
        isCanvas,
    })
    cfgRef.current = {
        itemWidth,
        itemHeight,
        rounded,
        stretch,
        damping,
        dissolve,
        isCanvas,
    }

    /** Pointer deflection, -1..1 from the plane centre. */
    const pointerRef = useRef({ x: 0, y: 0, inside: false })
    /** The dissolve position. A MotionValue read with `.get()` in the loop, not
     *  subscribed to: a subscription dies on a StrictMode remount while the
     *  value survives, which freezes the render with no error. */
    const progressRef = useRef(motionValue(0))
    /** Which slot is on screen. false => slot 1, true => slot 2. The
     *  reference's `active`. */
    const activeRef = useRef(false)
    const busyRef = useRef(false)
    /** Set by the effect so the click handler can retarget a texture slot. */
    const setSlotRef = useRef<((slot: 0 | 1, index: number) => void) | null>(
        null
    )

    // -----------------------------------------------------------------------
    // GL
    // -----------------------------------------------------------------------
    useEffect(() => {
        if (isStatic) return
        const host = canvasHostRef.current
        if (!host || slideCount === 0) return

        const canvas = document.createElement("canvas")
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.display = "block"
        const glOrNull = canvas.getContext("webgl", {
            alpha: true,
            antialias: true,
            depth: false,
            premultipliedAlpha: false,
            powerPreference: "high-performance",
        }) as WebGLRenderingContext | null
        if (!glOrNull) {
            startTransition(() => setWebglFailed(true))
            return
        }
        const gl: WebGLRenderingContext = glOrNull
        host.appendChild(canvas)
        startTransition(() => setWebglFailed(false))

        let disposed = false

        // -- program --------------------------------------------------------
        const vs = compile(gl, gl.VERTEX_SHADER, VERT)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()
        if (!vs || !fs || !prog) {
            startTransition(() => setWebglFailed(true))
            if (canvas.parentElement === host) host.removeChild(canvas)
            return
        }
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.bindAttribLocation(prog, 0, "aPos")
        gl.linkProgram(prog)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("RubberMesh link:", gl.getProgramInfoLog(prog))
            startTransition(() => setWebglFailed(true))
            gl.deleteProgram(prog)
            if (canvas.parentElement === host) host.removeChild(canvas)
            return
        }
        gl.useProgram(prog)

        // Uniform locations are per PROGRAM — never cached across programs.
        const uni = {
            scale: gl.getUniformLocation(prog, "uScale"),
            shift: gl.getUniformLocation(prog, "uShift"),
            shiftX: gl.getUniformLocation(prog, "uShiftX"),
            tex1: gl.getUniformLocation(prog, "uTex1"),
            tex2: gl.getUniformLocation(prog, "uTex2"),
            cover1: gl.getUniformLocation(prog, "uCover1"),
            cover2: gl.getUniformLocation(prog, "uCover2"),
            planePx: gl.getUniformLocation(prog, "uPlanePx"),
            progress: gl.getUniformLocation(prog, "uProgress"),
            intensity: gl.getUniformLocation(prog, "uIntensity"),
            radius: gl.getUniformLocation(prog, "uRadius"),
        }

        // -- lattice --------------------------------------------------------
        const verts = new Float32Array((LATTICE + 1) * (LATTICE + 1) * 2)
        let v = 0
        for (let y = 0; y <= LATTICE; y++) {
            for (let x = 0; x <= LATTICE; x++) {
                verts[v++] = x / LATTICE - 0.5
                // +y is UP in clip space; the reference's uv.y runs the same
                // way through its plane, so the bow keeps its orientation.
                verts[v++] = 0.5 - y / LATTICE
            }
        }
        const idx = new Uint16Array(LATTICE * LATTICE * 6)
        let k = 0
        for (let y = 0; y < LATTICE; y++) {
            for (let x = 0; x < LATTICE; x++) {
                const a = y * (LATTICE + 1) + x
                const b = a + 1
                const c = a + LATTICE + 1
                const d = c + 1
                idx[k++] = a
                idx[k++] = c
                idx[k++] = b
                idx[k++] = b
                idx[k++] = c
                idx[k++] = d
            }
        }
        const vbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        const ibo = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW)

        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        // Straight (non-premultiplied) alpha — the corner mask is the only
        // thing that is ever partly transparent, and the root's CSS background
        // is what shows through it.
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        gl.clearColor(0, 0, 0, 0)

        // -- textures -------------------------------------------------------
        interface Tex {
            tex: WebGLTexture
            w: number
            h: number
        }
        /* three sets UNPACK_FLIP_Y_WEBGL from `texture.flipY`, which DEFAULTS
         * to true, so every uv in the reference's shaders is written against a
         * flipped texture. Raw WebGL defaults to false: without this the
         * picture renders upside down — measured on the default gradient's
         * corners, not reasoned. Pixel-store state is per context, so once is
         * enough. */
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

        const newTexture = (): WebGLTexture => {
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
            // NPOT-safe: clamped, LINEAR, no mipmaps — the downgrade three
            // applies to a non-power-of-two texture under WebGL1.
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            return t
        }

        /* One texture per unique URL: a designer listing the same picture twice
         * should not make the naive path fetch and upload it twice. It is also
         * why cleanup deletes from this map rather than per slide. */
        const texByUrl = new Map<string, Tex>()
        const urls = slides.map((s) => s.image || "")
        for (const url of urls) {
            if (texByUrl.has(url)) continue
            const entry: Tex = { tex: newTexture(), w: 1, h: 1 }
            texByUrl.set(url, entry)
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
                if (disposed) return
                gl.bindTexture(gl.TEXTURE_2D, entry.tex)
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    img
                )
                entry.w = img.naturalWidth || 1
                entry.h = img.naturalHeight || 1
            }
            img.src = url
        }
        const texAt = (i: number): Tex =>
            texByUrl.get(urls[((i % urls.length) + urls.length) % urls.length])!

        /** The two slots the reference ping-pongs between. */
        const slots: [Tex, Tex] = [texAt(0), texAt(slideCount > 1 ? 1 : 0)]
        setSlotRef.current = (slot, index) => {
            slots[slot] = texAt(index)
        }

        /* The slots have just been rebuilt to pictures 0 and 1, so the swipe
         * state has to go back with them. Editing the list on the canvas
         * mid-transition otherwise leaves `active` and `progress` pointing at a
         * slot that no longer holds what the caption claims. */
        activeRef.current = false
        busyRef.current = false
        progressRef.current.set(0)
        startTransition(() => setCurrent(0))

        // -- sizing ---------------------------------------------------------
        // offsetWidth/offsetHeight, never getBoundingClientRect — the rect
        // carries the Framer canvas zoom and every size would drift with it.
        let viewW = 1
        let viewH = 1
        const resize = () => {
            if (disposed) return
            viewW = Math.max(1, host.offsetWidth)
            viewH = Math.max(1, host.offsetHeight)
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            canvas.width = Math.max(1, Math.round(viewW * dpr))
            canvas.height = Math.max(1, Math.round(viewH * dpr))
            gl.viewport(0, 0, canvas.width, canvas.height)
        }
        resize()
        let ro: ResizeObserver | null = null
        if (typeof ResizeObserver === "function") {
            ro = new ResizeObserver(resize)
            ro.observe(host)
        }
        window.addEventListener("resize", resize)

        // -- loop -----------------------------------------------------------
        let shift = 0
        let shiftX = 0
        let raf = 0
        let last = 0
        let elapsed = 0

        const frame = (now: number) => {
            if (disposed) return
            raf = requestAnimationFrame(frame)

            // The first rAF timestamp precedes this effect, so dt can be
            // negative on frame one; clamped, and capped so a backgrounded tab
            // does not resume with one enormous step.
            const dt = last === 0 ? 0 : clamp((now - last) / 1000, 0, 0.1)
            last = now
            elapsed += dt

            const c = cfgRef.current
            const planeW = Math.max(1, c.itemWidth)
            const planeH = Math.max(1, c.itemHeight)
            const gain = Math.max(0, c.stretch) / 100

            let targetY: number
            let targetX: number
            if (c.isCanvas) {
                // No pointer events reach a component on the Framer canvas, so
                // the sheet breathes rather than sitting flat (rule 5).
                targetY =
                    Math.sin(elapsed * IDLE_RATE) *
                    SHIFT_Y_AT_EDGE *
                    IDLE_AMPLITUDE *
                    gain
                targetX =
                    Math.cos(elapsed * IDLE_RATE * 0.7) *
                    SHIFT_X_AT_EDGE *
                    IDLE_AMPLITUDE *
                    gain
            } else {
                const p = pointerRef.current
                // `shift = -Y / 100` in the reference: the sheet follows the
                // pointer, so a pointer BELOW centre sags the sheet down.
                targetY = p.inside ? -p.y * SHIFT_Y_AT_EDGE * gain : 0
                targetX = p.inside ? p.x * SHIFT_X_AT_EDGE * gain : 0
            }

            // dt-correct exponential settle. The reference's fixed 0.01 per
            // frame is a different curve at a different frame rate (rule P).
            const rate = Math.max(1, c.damping) * DAMPING_TO_RATE
            const a = 1 - Math.exp(-rate * dt)
            shift += (targetY - shift) * a
            shiftX += (targetX - shiftX) * a

            const cover1 = coverScale(planeW, planeH, slots[0].w, slots[0].h)
            const cover2 = coverScale(planeW, planeH, slots[1].w, slots[1].h)

            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.useProgram(prog)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, slots[0].tex)
            gl.uniform1i(uni.tex1, 0)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, slots[1].tex)
            gl.uniform1i(uni.tex2, 1)

            gl.uniform2f(uni.scale, planeW / viewW, planeH / viewH)
            gl.uniform2f(uni.cover1, cover1[0], cover1[1])
            gl.uniform2f(uni.cover2, cover2[0], cover2[1])
            gl.uniform2f(uni.planePx, planeW, planeH)
            gl.uniform1f(uni.shift, shift)
            gl.uniform1f(uni.shiftX, shiftX)
            // Clamped: the reference's spring overshoots past 1 and `mix` then
            // extrapolates past the destination texture into out-of-gamut
            // colour — a flash at the end of every swipe.
            gl.uniform1f(uni.progress, clamp(progressRef.current.get(), 0, 1))
            gl.uniform1f(uni.intensity, c.dissolve * DISSOLVE_SCALE)
            // Percent of the MAX radius — half the short side (rule 7), so 100
            // is the same shape at any Width/Height.
            gl.uniform1f(
                uni.radius,
                (clamp(c.rounded, 0, 100) / 100) * Math.min(planeW, planeH) * 0.5
            )

            gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
            gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            setSlotRef.current = null
            ro?.disconnect()
            window.removeEventListener("resize", resize)
            for (const entry of texByUrl.values()) gl.deleteTexture(entry.tex)
            gl.deleteBuffer(vbo)
            gl.deleteBuffer(ibo)
            gl.deleteProgram(prog)
            // Never loseContext(): getContext returns the same context per
            // canvas, so a StrictMode remount would reuse a force-lost one and
            // render black (rule 6).
            if (canvas.parentElement === host) host.removeChild(canvas)
        }
    }, [isStatic, imagesKey, slideCount])

    // -----------------------------------------------------------------------
    // Pointer
    // -----------------------------------------------------------------------
    const onPointerMove = useCallback((e: React.PointerEvent) => {
        const host = hostRef.current
        if (!host) return
        // offsetWidth/offsetHeight for the SIZE (rule G); the rect is only
        // used for the origin, where the zoom cancels against the event's own
        // client coordinates.
        const rect = host.getBoundingClientRect()
        const w = Math.max(1, host.offsetWidth)
        const h = Math.max(1, host.offsetHeight)
        const scaleX = rect.width / w
        const scaleY = rect.height / h
        const px = (e.clientX - rect.left) / (scaleX || 1)
        const py = (e.clientY - rect.top) / (scaleY || 1)
        pointerRef.current = {
            x: clamp((px / w - 0.5) * 2, -1, 1),
            y: clamp((py / h - 0.5) * 2, -1, 1),
            inside: true,
        }
    }, [])

    const onPointerLeave = useCallback(() => {
        pointerRef.current = { ...pointerRef.current, inside: false }
    }, [])

    /**
     * The reference's commit, minus the drag threshold. It advances `current`,
     * runs progress across, and only then writes the FOLLOWING picture into the
     * slot that just went off screen — the pen did that on a 400ms timer, which
     * lands mid-dissolve at any slower transition.
     */
    const advance = useCallback(() => {
        if (slideCount < 2 || busyRef.current) return
        busyRef.current = true

        const next = (current + 1) % slideCount
        const goingTo = activeRef.current ? 0 : 1
        setCurrent(next)

        // Typed as the local `Motion` alias plus the callback, never cast to an
        // overload parameter: casting picks framer-motion's OBJECT-target
        // overload and the MotionValue call then fails to compile.
        const opts: Motion & { onComplete?: () => void } = {
            ...transition,
            onComplete: () => {
                busyRef.current = false
                activeRef.current = !activeRef.current
                // The slot now hidden is the one we just left.
                const hidden: 0 | 1 = goingTo === 1 ? 0 : 1
                setSlotRef.current?.(hidden, (next + 1) % slideCount)
            },
        }
        animate(progressRef.current, goingTo, opts)
    }, [current, slideCount, transition])

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                advance()
            }
        },
        [advance]
    )

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    const root: CSSProperties = {
        width: "100%",
        height: "100%",
        // Floor BEFORE the spread, so an explicit size on the instance still
        // wins and a 100% root can never collapse to 0x0 under Fit Content.
        minWidth: 1200,
        minHeight: 800,
        ...style,
        position: "relative",
        overflow: "hidden",
        background,
        userSelect: "none",
        outline: "none",
    }

    // The list can shrink under a live index — editing the array on the canvas
    // is exactly how — so nothing reads `current` unclamped.
    const shown = slideCount ? Math.min(current, slideCount - 1) : 0
    const label = slides[shown]?.label
    const font = text?.font ?? DEFAULT_FONT
    const textColor = text?.color ?? "#FFFFFF"

    if (slideCount === 0) {
        return (
            <div style={root}>
                {isCanvas && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(255,255,255,0.9)",
                            opacity: 0.5,
                            fontSize: 14,
                        }}
                    >
                        Add images to Images
                    </div>
                )}
            </div>
        )
    }

    // Thumbnail, export and a failed context all get the picture itself rather
    // than an empty box.
    if (isStatic || webglFailed) {
        return (
            <div style={root}>
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: itemWidth,
                        height: itemHeight,
                        borderRadius:
                            (clamp(rounded, 0, 100) / 100) *
                            Math.min(itemWidth, itemHeight) *
                            0.5,
                        backgroundImage: `url(${slides[0].image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
                {label && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pointerEvents: "none",
                            color: textColor,
                            ...font,
                        }}
                    >
                        {label}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div
            ref={hostRef}
            role="button"
            tabIndex={0}
            aria-label={
                label ? `${label}. Next image` : "Next image"
            }
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onPointerCancel={onPointerLeave}
            onClick={advance}
            onKeyDown={onKeyDown}
            style={{
                ...root,
                cursor: slideCount > 1 ? "pointer" : "default",
                touchAction: "manipulation",
            }}
        >
            <div
                ref={canvasHostRef}
                style={{ position: "absolute", inset: 0 }}
            />

            {/* Captions are stacked and cross-faded, as in the reference: the
                outgoing one lifts 20px and fades while the incoming settles. */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                }}
            >
                {slides.map((s, i) => (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            textAlign: "center",
                            color: textColor,
                            ...font,
                            opacity: i === shown ? 1 : 0,
                            transform:
                                i === shown
                                    ? "translateY(0px)"
                                    : "translateY(20px)",
                            transition: "opacity 0.4s, transform 0.4s",
                        }}
                    >
                        {s.label ?? ""}
                    </div>
                ))}
            </div>
        </div>
    )
}

RubberMesh.displayName = "RubberMesh"
