"use client"

/**
 * #45 ScrollBulge
 *
 * Infinite-scroll image slider. Scrolling bulges each plane toward the viewer:
 * the vertex nearest the scroll axis is pushed along +Z by a sine falloff, so
 * the faster the scroll the deeper the bend. Vertical and horizontal, with
 * snap-to-slide and autoplay.
 *
 * Was `Scroll3DSlider`, which carried five effect presets. Only the distortion
 * one survives — it is the whole point of the component, and it is what the
 * name now says. `carousel`, `coverflow`, `cube` and `cards` were rotate/depth
 * variations any Framer stack can already do.
 *
 * NO `three`. The renderer is raw WebGL1 (rule 10: self-contained beats
 * convenient). A bare `three` import resolves through a CDN at paste time, and
 * when that CDN is unreachable Framer refuses the whole component with "couldn't
 * load one of its external dependencies" — a component that only works while a
 * third party is up. What three was doing here is small and is now explicit:
 * - PerspectiveCamera -> one column-major projection matrix, rebuilt on resize.
 * - PlaneGeometry per slide -> ONE 32x16 unit lattice shared by every slide,
 *   with the slide's size as a uniform. 30 slides cost one buffer, not 30.
 * - `applyDistortion` rewriting 561 vertices per slide per frame on the CPU
 *   (plus `computeVertexNormals`, whose normals nothing sampled) -> the same
 *   formula in the VERTEX shader, no per-frame upload.
 * - Raycaster -> a ray/plane hit at z = 0 and a box test, since every slide
 *   lies on that plane.
 * - scene.background + Color parsing -> the canvas clears to transparent and
 *   the root div's CSS background shows through, which it already painted.
 * Texture filtering matches three's WebGL1 NPOT downgrade (clamped, LINEAR, no
 * mipmaps), and blending matches its transparent material (depth tested and
 * written, both faces, straight alpha).
 */
import * as React from "react"
import { startTransition, useEffect, useRef, useState } from "react"

// ---------------------------------------------------------------------------
// Config defaults
// ---------------------------------------------------------------------------

/* Dummy pictures, so a fresh instance is never blank and every card is
 * DISTINCT — five identical grey plates read as a frozen carousel even while
 * it scrolls. Inline SVG data URIs, never photo URLs: a default pointing at a
 * CDN 404s the day that ID dies (one of the old Unsplash defaults already had)
 * and shows nothing offline, behind a proxy, or on a canvas with no network.
 * One set across the folder. */
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

// A row with no picture needs no constant: its slide keeps the 1x1 grey init
// texture at uOpacity 0, which the fragment shader already paints as the plate.

// Typed, so the optional `link` an omitted field would drop is still readable
// at every use site (rule 10 — an untyped literal narrows the prop type).
const DEFAULT_SLIDES: SlideData[] = DUMMY_PAIRS.map((_, i) => ({
    image: dummyImage(i, 1200, 800),
}))

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlideData {
    image?: string
    link?: string
}

/** The content list lives in its own object, one shape across the folder. */
/* Panel follows rule 11 — 15 leaf dials, down from 38, whole numbers (rule 3).
 * This was the heaviest panel in the folder. Changed keys, clean break, no
 * fallbacks:
 *   backgroundColor -> background
 *   borderRadius    -> rounded   (0-0.15 shader units -> 0-100 %; a SCALE
 *                                 change, so a live instance's radius resets)
 *   slideSize.{aspectRatio, minHeight, maxHeight, randomHeights} -> size
 *   slideSize.gap   -> gap       (0-1 float -> 0-100 %)
 *   effect.distortionStrength -> intensity  (the other two terms belonged to
 *                                 the cut presets and went with them)
 *   scrollTuning.{wheelSpeed, dragSpeed} -> speed
 *   autoplay.{enabled, speed}    -> autoplay  (0 is off; a separate boolean for
 *                                 an off state is a control that does nothing)
 *
 * Cut and frozen (rule 10 — performance knobs and micro-tuning are the
 * component's own job): `maxDpr`, `enableMotion`, `respectReducedMotion`,
 * `interactive`, `slideSize.activeScale`, `snap`, `scrollTuning.smoothing`,
 * `scrollTuning.momentum`, `effect.perspective` and `linkIndicator`.
 *
 * Third pass — the list moved into the folder's standard `Images` object and
 * the per-slide `title` came out:
 *   slides -> images      ("Images" OBJECT whose Items rows are
 *                                { image, link } — two flat fields)
 *   slides[].title -> CUT
 *
 * Fourth pass — renamed ScrollBulge, one effect, no overlay:
 *   preset -> CUT               Only `distortion` survives. A one-option Enum
 *                               is a control that maps to nothing (rule 1).
 *   text   -> CUT               The whole overlay went with it: the caption was
 *                               already gone, so Font/Color/Position styled
 *                               nothing but a slide counter.
 *
 * `Link` is UNAFFECTED by dropping the overlay. The overlay's arrow was an
 * affordance, never the mechanism — clicking the active slide opens its link
 * (pointer, touch and the Enter key all do), and that path is untouched.
 *
 * Fifth pass — `Count` added, then CUT:
 *   count -> CUT, frozen at the 0 it shipped defaulting to, which meant "one
 *            slide per image". The loop is now `images.length` and the panel
 *            row is gone; a live instance that left it at 0 is unchanged, one
 *            that raised it loses its repeats and shows each picture once.
 * Repeated pictures SHARE one GPU texture: the loader runs once per unique URL
 * and the result is assigned to every mesh using it. Loading per mesh would
 * fetch and upload the same picture once per slide.
 *
 * Sixth pass — the slide box is sized in px and autoplay is its own system.
 * Clean break on keys (rule 11c), and three of these RESET a live instance
 * because the stored number means something different, which no `?? oldKey`
 * fallback can migrate:
 *   size            -> slideWidth + slideHeight   (percent of a shipped band ->
 *                      two px dials, titled `Width` / `Height`. The KEYS cannot
 *                      be `width` / `height`: Framer injects those as the
 *                      instance's own size and the controls would fight it.)
 *   slideSize random band -> CUT. Slides were 1.0-1.5 world units tall at
 *                      random; a `Height` dial that only set the TOP of that
 *                      range is a control that lies (rule F). Every slide is
 *                      now exactly Width x Height.
 *   gap             -> px, was %.                 (SCALE change — resets)
 *   intensity max   -> 100, was 300.              (a stored 300 clamps to 100)
 *   speed           -> drag  (`Drag Sensitivity`) The wheel/pointer/touch gain.
 *                      It used to drive autoplay's rate too, which welded an
 *                      input gain to an autonomous rate (rule M).
 *   autoplay        -> autoplay (Boolean) + autoplayDirection + autoplaySpeed.
 *                      The 0-is-off number could not say WHICH WAY it advanced.
 *
 * Layout, offsets and the scroll accumulator are all in CSS px now; only the
 * shader uniforms are converted to world units, by the measured height. That
 * is what makes a px Width mean the same size on any canvas.
 */
interface ScrollBulgeProps {
    images?: SlideData[]
    background?: string
    direction?: "vertical" | "horizontal"
    /** corner radius, percent of the max radius */
    rounded?: number
    /** slide width, px. NOT `width` — Framer injects that one. */
    slideWidth?: number
    /** slide height, px. NOT `height` — Framer injects that one. */
    slideHeight?: number
    /** spacing between slides, px */
    gap?: number
    /** scales the bulge depth, 0-100; 100 is the shipped look */
    intensity?: number
    /** wheel/pointer/touch gain, 0-100, 50 = the shipped rate */
    drag?: number
    autoplay?: boolean
    /** which way autoplay advances the deck */
    autoplayDirection?: "forward" | "backward"
    /** 0-100, 50 = half a world unit per second, the old dial's midpoint */
    autoplaySpeed?: number
    style?: React.CSSProperties
}

/* Cut controls (rule 10), frozen at the value the slider shipped with. */
/** Camera field of view. Was `effect.perspective`, cut and frozen. */
const CAMERA_FOV = 45
const CAMERA_Z = 5
/** World units the camera spans vertically at z = 0 — `2·tan(fov/2)·camZ`. It
 *  does NOT depend on the canvas size, so one world unit is always
 *  `viewH / VIEW_WORLD_H` CSS px, on every canvas. */
const VIEW_WORLD_H =
    2 * Math.tan(((CAMERA_FOV * Math.PI) / 180) * 0.5) * CAMERA_Z
/** px per world unit at the component's 800px height floor. Layout and scroll
 *  now run in CSS px, so `Width` / `Height` / `Gap` can be px dials and a drag
 *  moves the same number of content px on any canvas. Every rate and threshold
 *  the slider shipped with was written in world units, so each one is now
 *  `x * PX_PER_WORLD` — identical feel at 800px, and no longer size-dependent. */
const PX_PER_WORLD = 800 / VIEW_WORLD_H
const SNAP_TO_SLIDE = false
const SNAP_STRENGTH = (20 / 100) * 0.15
const SCROLL_SMOOTHING = (10 / 100) * 0.5
const MOMENTUM_FRICTION = 0.8 + (80 / 100) * 0.19
const INTERACTIVE = true
const MAX_DPR = 2
const ENABLE_MOTION = true
const RESPECT_REDUCED_MOTION = true

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const wrap = (value: number, range: number) => ((value % range) + range) % range

/* `parseColor` went with `three`. The GL canvas clears to transparent and the
 * root div's CSS background paints behind it, so the Background control's value
 * is handed straight to CSS — which understands every colour form Framer emits
 * without a hand-written rgb()/hsl() reader in the middle. */

// ---------------------------------------------------------------------------
// Static fallback
// ---------------------------------------------------------------------------

function StaticFallback({
    slides,
    backgroundColor,
    aspect,
    style,
}: {
    slides: SlideData[]
    backgroundColor: string
    /** slide width / height, from the two px dials */
    aspect: number
    style?: React.CSSProperties
}) {
    const validSlides = slides.filter((s) => s.image)

    // Size floor BEFORE the spread, so an explicit size on the instance still
    // wins (rule 10). Spread-first pinned every instance to 100%/100% and a
    // Fit-Content parent then collapsed it.
    const shell: React.CSSProperties = {
        width: "100%",
        height: "100%",
        minWidth: 1200,
        minHeight: 800,
        ...style,
        background: backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    }

    if (validSlides.length === 0) {
        return <div style={shell} />
    }

    const firstWithImage = validSlides[0]

    return (
        <div style={shell}>
            {firstWithImage?.image && (
                <div
                    style={{
                        maxWidth: "60%",
                        maxHeight: "70%",
                        aspectRatio: `${aspect}`,
                        overflow: "hidden",
                        borderRadius: 2,
                    }}
                >
                    <img
                        src={firstWithImage.image}
                        alt=""
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScrollBulge(props: ScrollBulgeProps) {
    const {
        images = [{"image":"https://images.unsplash.com/photo-1693487048787-a19cc08ded79?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OXx8dmlicmFudCUyMGltYWdlfGVufDB8MHwwfHx8Mg%3D%3D"},{"image":"https://images.unsplash.com/photo-1782267917417-5d63b6eff010?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fHZpYnJhbnQlMjBpbWFnZXxlbnwwfDB8MHx8fDI%3D\n"},{"image":"https://images.unsplash.com/photo-1763010156913-8f81b3f1a047?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjN8fHZpYnJhbnQlMjBpbWFnZXxlbnwwfDB8MHx8fDI%3D"},{"image":"https://images.unsplash.com/photo-1741114056868-e9ab2d56ed64?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjZ8fHZpYnJhbnQlMjBpbWFnZXxlbnwwfDB8MHx8fDI%3D"},{"image":"https://images.unsplash.com/photo-1773701766715-9fd379d7ead6?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDJ8fHZpYnJhbnQlMjBpbWFnZXxlbnwwfDB8MHx8fDI%3D"},{"image":"https://images.unsplash.com/photo-1772204635505-953ffdc44cac?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjQ1fHx2aWJyYW50JTIwaW1hZ2V8ZW58MHwwfDB8fHwy"}],
        background = "#141414",
        direction = "vertical",
        rounded = 0,
        slideWidth = 350,
        slideHeight = 200,
        gap = 16,
        intensity = 100,
        drag = 50,
        autoplay = true,
        autoplayDirection = "forward",
        autoplaySpeed = 100,
        style,
    } = props
    // Pulled out of the group before anything depends on it — Framer hands back
    // a fresh `images` object every render, so a memo or effect keyed on the
    // group itself would rebuild every time (rule G).
    const slidesProp = images
    const slides =
        slidesProp && slidesProp.length ? slidesProp : DEFAULT_SLIDES

    // How many slides the loop holds: one per picture. This was the `Count`
    // control, frozen at the 0 it shipped defaulting to — 0 meant exactly this
    // (rule 11b: the row goes, the render path does not). Floored at 1 so a
    // loop always has something in it.
    const imageCount = slides.filter((s) => s.image).length
    const loopCount = Math.max(1, imageCount || 1)

    const backgroundColor = background

    /* The slide box, in CSS px. Two dials, so a designer sets the picture the
     * way they set every other box in Framer; the deck is uniform because a
     * `Height` that only capped a random band would be a control that lies
     * (rule F). Whole numbers (rule 3), floored at 1 so a zero-area plane can
     * never divide the cover fit by zero. */
    const slideW = Math.max(1, Math.round(slideWidth))
    const slideH = Math.max(1, Math.round(slideHeight))
    const slideGapPx = Math.max(0, Math.round(gap))

    /* effect — one Intensity dial scaling the bulge depth. `effectRotation`,
     * `effectDepth` and `effectPerspective` went with the cut presets; nothing
     * else read them. 100 is the shipped depth and is now the TOP of the dial:
     * past it the near vertex punches through the camera's near plane. */
    const strength = Math.max(0, Math.min(100, intensity)) / 100
    const distortionStrength = 2.5 * strength

    const snapToSlide = SNAP_TO_SLIDE
    const snapStrength = SNAP_STRENGTH

    /* Autoplay is its own system now: on/off, which way, how fast. Its rate is
     * an autonomous one and must not share a dial with the input gain (rule M).
     * px per second, so the deck creeps at the same visible rate on any canvas. */
    const autoplayEnabled = !!autoplay
    const autoplayPxPerSec =
        (Math.max(0, autoplaySpeed) / 100) *
        PX_PER_WORLD *
        (autoplayDirection === "backward" ? -1 : 1)

    // 50 is the wheel/drag/touch rate the slider shipped at (rule 11). One gain
    // for all three inputs — they are the same decision, "how far the deck
    // moves per unit of input", not three.
    const scrollSmoothing = SCROLL_SMOOTHING
    const momentumFriction = MOMENTUM_FRICTION
    const dragGain = (Math.max(0, drag) / 50) * 0.01 * PX_PER_WORLD

    // 0..1 fraction of the max radius; the shader scales it by the plane's own
    // half short-side, so one number is one shape at any aspect.
    const borderRadius = Math.max(0, Math.min(100, rounded)) / 100
    const interactive = INTERACTIVE
    const maxDpr = MAX_DPR
    const enableMotion = ENABLE_MOTION
    const respectReducedMotion = RESPECT_REDUCED_MOTION

    // Geometry key — triggers scene rebuild when layout props change. `loopCount`
    // is in it because the mesh set itself is rebuilt when the count moves.
    const geometryKey = `${slideW}-${slideH}-${slideGapPx}-${loopCount}`

    const outerRef = useRef<HTMLDivElement>(null)
    const canvasContainerRef = useRef<HTMLDivElement>(null)
    const [activeSlide, setActiveSlide] = useState(0)
    const [webglFailed, setWebglFailed] = useState(false)

    const scrollTargetRef = useRef<((delta: number) => void) | null>(null)
    const activeSlideIndexRef = useRef(0)

    // Stabilize slides reference
    const slidesRef = useRef(slides)
    const slidesKey = JSON.stringify(
        slides.map((s) => `${s.image || ""}|${s.link || ""}`)
    )
    const slidesKeyRef = useRef(slidesKey)
    if (slidesKey !== slidesKeyRef.current) {
        slidesKeyRef.current = slidesKey
        slidesRef.current = slides
    }

    // Reduced motion (ref-based for canvas RAF loop — don't break render loop)
    const prefersReducedMotionRef = useRef(false)
    useEffect(() => {
        if (typeof window === "undefined") return
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        const update = () => {
            prefersReducedMotionRef.current = mq.matches
        }
        update()
        mq.addEventListener?.("change", update)
        return () => mq.removeEventListener?.("change", update)
    }, [])

    // Config ref for animation loop
    const configRef = useRef({
        backgroundColor,
        direction,
        slideW,
        slideH,
        slideGapPx,
        distortionStrength,
        borderRadius,
        scrollSmoothing,
        momentumFriction,
        dragGain,
        snapToSlide,
        snapStrength,
        autoplayEnabled,
        autoplayPxPerSec,
        maxDpr,
        enableMotion,
        respectReducedMotion,
        interactive,
    })
    configRef.current = {
        backgroundColor,
        direction,
        slideW,
        slideH,
        slideGapPx,
        distortionStrength,
        borderRadius,
        scrollSmoothing,
        momentumFriction,
        dragGain,
        snapToSlide,
        snapStrength,
        autoplayEnabled,
        autoplayPxPerSec,
        maxDpr,
        enableMotion,
        respectReducedMotion,
        interactive,
    }

    // -----------------------------------------------------------------------
    // Main WebGL setup
    // -----------------------------------------------------------------------
    useEffect(() => {
        const container = canvasContainerRef.current
        if (!container) return () => {}

        const validSlides = slidesRef.current.filter((s) => s.image)
        if (validSlides.length === 0) return () => {}

        // The loop holds `loopCount` slides; picture i is validSlides[i % n].
        // The modulo stays after the Count cut — it is what keeps the mesh set
        // and the picture list from ever disagreeing.
        const totalSlides = loopCount
        const slideAt = (i: number) => validSlides[i % validSlides.length]

        const canvas = document.createElement("canvas")
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.display = "block"
        const glOrNull = canvas.getContext("webgl", {
            alpha: true,
            antialias: true,
            depth: true,
            premultipliedAlpha: false,
            powerPreference: "high-performance",
        })
        if (!glOrNull) {
            startTransition(() => setWebglFailed(true))
            return () => {}
        }
        // Typed non-null rather than narrowed by the guard: TypeScript drops a
        // narrowing inside a hoisted `function` declaration, and the helpers
        // below are hoisted.
        const gl: WebGLRenderingContext = glOrNull
        container.appendChild(canvas)

        startTransition(() => setWebglFailed(false))

        // offsetWidth/offsetHeight, never getBoundingClientRect — the rect
        // carries the canvas zoom and every size would drift with it (rule G).
        const getSize = () => ({
            width: Math.max(1, container.offsetWidth),
            height: Math.max(1, container.offsetHeight),
        })
        /** CSS pixels, kept in sync by `resize` — the pick and the projection
         *  both read them, and neither may touch the rect (rule G). */
        let viewW = 1
        let viewH = 1
        /** World units per CSS px, from the MEASURED height. The whole layout —
         *  slide box, gap, offsets, loop length, the scroll accumulator — is in
         *  px; only the shader uniforms are converted. That is what makes a px
         *  Width the same size on a 700px canvas and a 1600px one. */
        let pxToWorld = VIEW_WORLD_H / 800

        let disposed = false

        // The GL canvas clears to TRANSPARENT and the root div's CSS background
        // shows through, so `background` needs no colour parsing and no GL
        // clear colour — the same result with one fewer thing to keep in sync.

        /** Column-major perspective, the layout uniformMatrix4fv expects. */
        const proj = new Float32Array(16)
        const setProj = (aspect: number) => {
            const f = 1 / Math.tan(((CAMERA_FOV * Math.PI) / 180) * 0.5)
            const near = 0.1
            const far = 100
            proj.fill(0)
            proj[0] = f / aspect
            proj[5] = f
            proj[10] = (far + near) / (near - far)
            proj[11] = -1
            proj[14] = (2 * far * near) / (near - far)
        }

        // Generate slide dimensions — use the stacking axis for offsets
        const isHorizLayout = configRef.current.direction === "horizontal"

        // Every slide is the same box now, so the stacking pitch is one number
        // instead of a per-slide array: widths in horizontal, heights in
        // vertical. All CSS px.
        const slideBoxW = configRef.current.slideW
        const slideBoxH = configRef.current.slideH
        const stackSize = isHorizLayout ? slideBoxW : slideBoxH
        const gapPx = configRef.current.slideGapPx

        const slideOffsets: number[] = []
        for (let i = 0; i < totalSlides; i++) {
            slideOffsets.push(i * (stackSize + gapPx))
        }

        const loopLength = totalSlides * (stackSize + gapPx)
        const halfLoop = loopLength / 2

        /* Shaders. The bulge moved from a CPU rewrite of 561 vertices per slide
         * per frame (three's `applyDistortion` + `needsUpdate` + a normals
         * rebuild nothing sampled) into the VERTEX shader — same formula, same
         * 32x16 tessellation, no per-frame buffer upload. */
        const coverVertexShader = `
            attribute vec2 aXY;          // unit quad, -0.5..0.5
            uniform vec2 uSize;          // slide width, height
            uniform float uAxisPos;      // slide position along the scroll axis
            uniform float uHoriz;        // 1 = horizontal stacking
            uniform float uStrength;     // signed bulge depth
            uniform mat4 uProj;
            uniform float uCamZ;
            varying vec2 vUv;
            void main() {
                vUv = aXY + 0.5;
                float x = aXY.x * uSize.x;
                float y = aXY.y * uSize.y;
                // Distance from the scroll axis, in the slide's LOCAL space —
                // the source measured it the same way before adding the mesh
                // position, so the peak tracks the slide's travel.
                float d = uHoriz > 0.5
                    ? length(vec2(uAxisPos + x, y))
                    : length(vec2(x, uAxisPos + y));
                float falloff = max(0.0, 1.0 - d * 0.5);
                float bend = pow(sin(falloff * 1.5707963), 1.5);
                vec3 p = vec3(
                    x + (uHoriz > 0.5 ? uAxisPos : 0.0),
                    y + (uHoriz > 0.5 ? 0.0 : uAxisPos),
                    bend * uStrength - uCamZ
                );
                gl_Position = uProj * vec4(p, 1.0);
            }
        `
        const coverFragmentShader = `
            precision mediump float;
            uniform sampler2D uTexture;
            uniform vec2 uPlaneAspect;
            uniform vec2 uImageAspect;
            uniform float uOpacity;
            uniform float uBorderRadius;
            varying vec2 vUv;
            void main() {
                vec2 uv = vUv;
                float planeRatio = uPlaneAspect.x / uPlaneAspect.y;
                float imageRatio = uImageAspect.x / uImageAspect.y;
                if (planeRatio > imageRatio) {
                    float scale = imageRatio / planeRatio;
                    uv.y = uv.y * scale + (1.0 - scale) * 0.5;
                } else {
                    float scale = planeRatio / imageRatio;
                    uv.x = uv.x * scale + (1.0 - scale) * 0.5;
                }
                vec4 texColor = texture2D(uTexture, uv);
                vec4 placeholder = vec4(0.15, 0.15, 0.15, 1.0);
                gl_FragColor = mix(placeholder, texColor, uOpacity);

                if (uBorderRadius > 0.0) {
                    float ar = uPlaneAspect.x / uPlaneAspect.y;
                    vec2 uvCorr = (vUv - 0.5) * vec2(ar, 1.0);
                    /* uBorderRadius is 0..1. 1.0 is a true CIRCLE at ANY slide
                     * aspect, not a stadium: the SDF box narrows toward a
                     * square as the dial climbs while the radius grows to half
                     * that square's side, so the two land together. The plane
                     * itself never changes size — the long axis is simply
                     * clipped away. */
                    float t = uBorderRadius;
                    vec2 half0 = vec2(ar * 0.5, 0.5);
                    float sHalf = min(half0.x, half0.y);
                    vec2 halfSize = mix(half0, vec2(sHalf), t);
                    float r = t * sHalf;
                    vec2 q = abs(uvCorr) - halfSize + r;
                    float d = length(max(q, 0.0)) - r;
                    gl_FragColor.a *= 1.0 - smoothstep(-0.003, 0.003, d);
                }
                // A fully clipped corner must not write depth, or the slide
                // behind it is punched out through the hole.
                if (gl_FragColor.a < 0.01) discard;
            }
        `

        const compile = (type: number, src: string) => {
            const s = gl.createShader(type)!
            gl.shaderSource(s, src)
            gl.compileShader(s)
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                console.warn("ScrollBulge shader:", gl.getShaderInfoLog(s))
            return s
        }

        const prog = gl.createProgram()!
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, coverVertexShader))
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, coverFragmentShader))
        gl.linkProgram(prog)
        gl.useProgram(prog)

        const aXY = gl.getAttribLocation(prog, "aXY")
        const U = {
            size: gl.getUniformLocation(prog, "uSize"),
            axisPos: gl.getUniformLocation(prog, "uAxisPos"),
            horiz: gl.getUniformLocation(prog, "uHoriz"),
            strength: gl.getUniformLocation(prog, "uStrength"),
            proj: gl.getUniformLocation(prog, "uProj"),
            camZ: gl.getUniformLocation(prog, "uCamZ"),
            texture: gl.getUniformLocation(prog, "uTexture"),
            planeAspect: gl.getUniformLocation(prog, "uPlaneAspect"),
            imageAspect: gl.getUniformLocation(prog, "uImageAspect"),
            opacity: gl.getUniformLocation(prog, "uOpacity"),
            borderRadius: gl.getUniformLocation(prog, "uBorderRadius"),
        }

        /* ONE grid buffer for every slide. three built a PlaneGeometry per mesh
         * because its vertices carried the slide's size; here the size is a
         * uniform, so 30 slides cost one 33x17 lattice, not 30. */
        const SEG_X = 32
        const SEG_Y = 16
        const grid: number[] = []
        for (let iy = 0; iy <= SEG_Y; iy++)
            for (let ix = 0; ix <= SEG_X; ix++)
                grid.push(ix / SEG_X - 0.5, iy / SEG_Y - 0.5)
        const idx: number[] = []
        for (let iy = 0; iy < SEG_Y; iy++)
            for (let ix = 0; ix < SEG_X; ix++) {
                const a = iy * (SEG_X + 1) + ix
                const b = a + 1
                const c = a + SEG_X + 1
                const d = c + 1
                idx.push(a, c, b, b, c, d)
            }
        const vbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(grid), gl.STATIC_DRAW)
        gl.enableVertexAttribArray(aXY)
        gl.vertexAttribPointer(aXY, 2, gl.FLOAT, false, 0, 0)
        const ibo = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
        gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(idx),
            gl.STATIC_DRAW
        )
        const INDEX_COUNT = idx.length

        // three's transparent material default: depth tested and written, both
        // faces (a bulged plane never turns away far enough to matter).
        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)
        gl.depthMask(true)
        gl.disable(gl.CULL_FACE)
        gl.enable(gl.BLEND)
        gl.blendFuncSeparate(
            gl.SRC_ALPHA,
            gl.ONE_MINUS_SRC_ALPHA,
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA
        )
        gl.uniform1i(U.texture, 0)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

        interface Slide {
            index: number
            offset: number
            width: number
            height: number
            tex: WebGLTexture
            /** picture pixels, for the cover fit */
            imgW: number
            imgH: number
            opacity: number
            opacityTarget: number
            /** wrapped position along the scroll axis, written every frame */
            pos: number
        }

        /* One texture per unique URL, not one per slide: a designer who lists
         * the same picture in 30 rows makes the naive path fetch and upload it
         * 30 times.
         * Slides sharing a URL share the texture object, which is also why the
         * cleanup deletes from this map — a shared texture deleted per slide
         * would be deleted 30 times. */
        const texByUrl = new Map<string, WebGLTexture>()
        const newTexture = () => {
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
            // NPOT-safe: clamped, no mipmaps — the same downgrade three applies
            // to a non-power-of-two texture under WebGL1.
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            return t
        }

        const slidesGL: Slide[] = []
        const byUrl = new Map<string, Slide[]>()

        for (let i = 0; i < totalSlides; i++) {
            const height = slideBoxH
            const width = slideBoxW
            const imgUrl = slideAt(i).image || ""
            let tex = texByUrl.get(imgUrl)
            if (!tex) {
                tex = newTexture()
                texByUrl.set(imgUrl, tex)
            }
            const slide: Slide = {
                index: i,
                offset: slideOffsets[i],
                width,
                height,
                tex,
                imgW: 1,
                imgH: 1,
                opacity: 0,
                opacityTarget: 0,
                pos: 0,
            }
            slidesGL.push(slide)
            const group = byUrl.get(imgUrl)
            if (group) group.push(slide)
            else byUrl.set(imgUrl, [slide])
        }

        for (const [imgUrl, group] of byUrl) {
            if (!imgUrl) continue
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
                if (disposed) return
                gl.bindTexture(gl.TEXTURE_2D, group[0].tex)
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    img
                )
                for (const s of group) {
                    s.imgW = img.naturalWidth || 1
                    s.imgH = img.naturalHeight || 1
                    s.opacityTarget = 1
                }
            }
            img.src = imgUrl
        }

        // Scroll state
        let scrollPosition = 0
        let scrollTarget = 0
        let scrollMomentum = 0
        let isScrolling = false
        let lastFrameTime = 0

        let distortionAmount = 0
        let distortionTarget = 0
        let velocityPeak = 0
        let scrollDirection = 0
        let directionTarget = 0
        const velocityHistory = [0, 0, 0, 0, 0]

        let isDragging = false
        let dragStartY = 0
        let dragStartX = 0
        let dragDelta = 0
        let totalDragDistance = 0
        let touchStartX = 0
        let touchStartY = 0
        let touchLastX = 0
        let touchLastY = 0
        let touchTotalDistance = 0

        let activeSlideIndex = -1
        let scrollTimeout: ReturnType<typeof setTimeout> | null = null
        let isHovered = false
        let autoplayIdleTime = 0

        const addDistortionBurst = (amount: number) => {
            distortionTarget = Math.min(1, distortionTarget + amount)
        }

        /* Pick, replacing three's Raycaster. Every slide sits on the z = 0
         * plane, so the ray from the camera through the pointer meets it at a
         * single point and the test is a box check in world units — no BVH, no
         * per-vertex intersection. It ignores the bulge, which three's raycast
         * did follow; the difference is at most the bulge depth at the pointer
         * and never changes WHICH slide is under it, since the slides do not
         * overlap along the stacking axis. */
        const getClickedSlide = (
            clientX: number,
            clientY: number
        ): number | null => {
            // Client space has no reference but the rect. Normalizing by
            // r.width before the projection cancels the canvas zoom (rule G).
            const r = canvas.getBoundingClientRect()
            if (!r.width || !r.height) return null
            const nx = ((clientX - r.left) / r.width) * 2 - 1
            const ny = -((clientY - r.top) / r.height) * 2 + 1
            const tan = Math.tan(((CAMERA_FOV * Math.PI) / 180) * 0.5)
            const aspect = viewW / viewH
            const axisIsX = isHorizLayout
            // Camera at (0,0,CAMERA_Z) looking down -z; the z = 0 plane is
            // CAMERA_Z away, so the ray's xy scales by exactly that.
            const wx = nx * tan * aspect * CAMERA_Z
            const wy = ny * tan * CAMERA_Z
            // The slides' boxes are in px, so the hit point comes back to px
            // before the box test — mixing the two silently picks the wrong
            // slide at every canvas height but one.
            const hx = wx / pxToWorld
            const hy = wy / pxToWorld
            let hit: number | null = null
            let best = Infinity
            for (const s of slidesGL) {
                const cx = axisIsX ? s.pos : 0
                const cy = axisIsX ? 0 : s.pos
                if (
                    Math.abs(hx - cx) <= s.width / 2 &&
                    Math.abs(hy - cy) <= s.height / 2
                ) {
                    const d = Math.abs(s.pos)
                    if (d < best) {
                        best = d
                        hit = s.index
                    }
                }
            }
            return hit
        }

        // --- Event handlers ---
        const onWheel = (e: WheelEvent) => {
            if (!configRef.current.interactive) return
            e.preventDefault()
            const isHoriz = configRef.current.direction === "horizontal"
            const rawDelta = isHoriz
                ? Math.abs(e.deltaX) > Math.abs(e.deltaY)
                    ? e.deltaX
                    : e.deltaY
                : e.deltaY
            const clampedDelta =
                Math.sign(rawDelta) * Math.min(Math.abs(rawDelta), 150)
            addDistortionBurst(Math.abs(clampedDelta) * 0.001)
            scrollTarget += clampedDelta * configRef.current.dragGain
            isScrolling = true
            if (scrollTimeout) clearTimeout(scrollTimeout)
            scrollTimeout = setTimeout(() => (isScrolling = false), 150)
        }

        const onTouchStart = (e: TouchEvent) => {
            if (!configRef.current.interactive) return
            touchStartX = touchLastX = e.touches[0].clientX
            touchStartY = touchLastY = e.touches[0].clientY
            touchTotalDistance = 0
            scrollMomentum = 0
            if (scrollTimeout) clearTimeout(scrollTimeout)
        }

        const onTouchMove = (e: TouchEvent) => {
            if (!configRef.current.interactive) return
            e.preventDefault()
            const isHoriz = configRef.current.direction === "horizontal"
            const delta = isHoriz
                ? e.touches[0].clientX - touchLastX
                : e.touches[0].clientY - touchLastY
            touchLastX = e.touches[0].clientX
            touchLastY = e.touches[0].clientY
            touchTotalDistance += Math.abs(delta)
            addDistortionBurst(Math.abs(delta) * 0.02)
            // Touch used a hard-coded rate and ignored the dial entirely — a
            // control that mapped to nothing on the one input phones have.
            scrollTarget -= delta * configRef.current.dragGain
            isScrolling = true
        }

        const onTouchEnd = () => {
            if (!configRef.current.interactive) return
            const isHoriz = configRef.current.direction === "horizontal"
            if (touchTotalDistance < 10) {
                const clicked = getClickedSlide(touchStartX, touchStartY)
                if (clicked !== null) {
                    const clickedLink = slideAt(clicked)?.link
                    if (clicked === activeSlideIndex && clickedLink) {
                        window.open(clickedLink, "_blank", "noopener")
                    } else {
                        scrollToSlide(clicked)
                    }
                }
            }
            const swipeDelta = isHoriz
                ? touchLastX - touchStartX
                : touchLastY - touchStartY
            const swipeVelocity = swipeDelta * 0.005
            if (Math.abs(swipeVelocity) > 0.5) {
                scrollMomentum = -swipeVelocity * 0.1 * PX_PER_WORLD
                addDistortionBurst(Math.abs(swipeVelocity) * 0.45)
                isScrolling = true
                if (scrollTimeout) clearTimeout(scrollTimeout)
                scrollTimeout = setTimeout(() => (isScrolling = false), 800)
            } else {
                if (scrollTimeout) clearTimeout(scrollTimeout)
                scrollTimeout = setTimeout(() => (isScrolling = false), 150)
            }
        }

        const onPointerDown = (e: PointerEvent) => {
            if (!configRef.current.interactive) return
            if (e.pointerType === "touch") return
            isDragging = true
            dragStartX = e.clientX
            dragStartY = e.clientY
            dragDelta = 0
            totalDragDistance = 0
            scrollMomentum = 0
            canvas.style.cursor = "grabbing"
        }

        const onPointerMove = (e: PointerEvent) => {
            if (e.pointerType === "touch") return
            if (!configRef.current.interactive) return

            if (!isDragging) {
                // Update cursor: show pointer when hovering active slide with a link
                const hovered = getClickedSlide(e.clientX, e.clientY)
                if (
                    hovered === activeSlideIndex &&
                    slideAt(activeSlideIndex)?.link
                ) {
                    canvas.style.cursor = "pointer"
                } else {
                    canvas.style.cursor = "grab"
                }
                return
            }

            const isHoriz = configRef.current.direction === "horizontal"
            const delta = isHoriz
                ? e.clientX - dragStartX
                : e.clientY - dragStartY
            dragStartX = e.clientX
            dragStartY = e.clientY
            dragDelta = delta
            totalDragDistance += Math.abs(delta)
            addDistortionBurst(Math.abs(delta) * 0.02)
            scrollTarget -= delta * configRef.current.dragGain
            isScrolling = true
        }

        const onPointerUp = (e: PointerEvent) => {
            if (!isDragging) return
            if (e.pointerType === "touch") return
            isDragging = false
            canvas.style.cursor = configRef.current.interactive
                ? "grab"
                : "default"
            if (totalDragDistance < 10) {
                const clicked = getClickedSlide(e.clientX, e.clientY)
                if (clicked !== null) {
                    const clickedLink = slideAt(clicked)?.link
                    if (clicked === activeSlideIndex && clickedLink) {
                        window.open(clickedLink, "_blank", "noopener")
                    } else {
                        scrollToSlide(clicked)
                    }
                }
                return
            }
            if (Math.abs(dragDelta) > 2) {
                scrollMomentum = -dragDelta * 0.01 * PX_PER_WORLD
                addDistortionBurst(Math.abs(dragDelta) * 0.005)
                isScrolling = true
                if (scrollTimeout) clearTimeout(scrollTimeout)
                scrollTimeout = setTimeout(() => (isScrolling = false), 800)
            }
        }

        canvas.style.cursor = interactive ? "grab" : "default"

        const scrollToSlide = (targetIndex: number) => {
            const targetOffset = slideOffsets[targetIndex]
            const wrappedPos = wrap(scrollTarget, loopLength)
            let delta = targetOffset - wrappedPos
            if (delta > halfLoop) delta -= loopLength
            if (delta < -halfLoop) delta += loopLength
            // Burst scale is per WORLD unit of travel, and `delta` is px now.
            addDistortionBurst(Math.min(1, (Math.abs(delta) * 0.4) / PX_PER_WORLD))
            scrollTarget += delta
            isScrolling = true
            if (scrollTimeout) clearTimeout(scrollTimeout)
            scrollTimeout = setTimeout(() => (isScrolling = false), 600)
        }

        scrollTargetRef.current = (delta: number) => {
            addDistortionBurst((Math.abs(delta) * 0.3) / PX_PER_WORLD)
            scrollTarget += delta
            isScrolling = true
            if (scrollTimeout) clearTimeout(scrollTimeout)
            scrollTimeout = setTimeout(() => (isScrolling = false), 300)
        }

        const onMouseEnter = () => {
            isHovered = true
        }
        const onMouseLeave = () => {
            isHovered = false
            autoplayIdleTime = 0
        }

        container.addEventListener("mouseenter", onMouseEnter)
        container.addEventListener("mouseleave", onMouseLeave)
        container.addEventListener("wheel", onWheel, { passive: false })
        container.addEventListener("touchstart", onTouchStart, {
            passive: true,
        })
        container.addEventListener("touchmove", onTouchMove, {
            passive: false,
        })
        container.addEventListener("touchend", onTouchEnd)
        container.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)

        // Resize
        const resize = () => {
            const s = getSize()
            viewW = s.width
            viewH = s.height
            pxToWorld = VIEW_WORLD_H / viewH
            const dpr = Math.min(
                window.devicePixelRatio || 1,
                configRef.current.maxDpr
            )
            canvas.width = Math.round(viewW * dpr)
            canvas.height = Math.round(viewH * dpr)
            gl.viewport(0, 0, canvas.width, canvas.height)
            setProj(viewW / viewH)
        }

        let resizeObserver: ResizeObserver | null = null
        if (typeof ResizeObserver === "function") {
            resizeObserver = new ResizeObserver(resize)
            resizeObserver.observe(container)
        } else {
            window.addEventListener("resize", resize)
        }
        resize()

        // Animation loop
        let rafId = 0

        const animate = (time: number) => {
            rafId = requestAnimationFrame(animate)

            const cfg = configRef.current
            const motionEnabled =
                cfg.enableMotion &&
                !(cfg.respectReducedMotion && prefersReducedMotionRef.current)

            const rawDelta = lastFrameTime
                ? (time - lastFrameTime) / 1000
                : 0.016
            const deltaTime = Math.min(rawDelta, 0.1)
            lastFrameTime = time

            const previousScroll = scrollPosition

            // Every threshold below is a px one now: each is the world figure
            // the slider shipped with, times PX_PER_WORLD.
            const EPS_MOMENTUM = 0.001 * PX_PER_WORLD

            if (motionEnabled && isScrolling) {
                scrollTarget += scrollMomentum
                scrollMomentum *= cfg.momentumFriction
                if (Math.abs(scrollMomentum) < EPS_MOMENTUM) scrollMomentum = 0
            }

            // Snap-to-slide
            if (
                cfg.snapToSlide &&
                !isScrolling &&
                Math.abs(scrollMomentum) < EPS_MOMENTUM
            ) {
                const wrappedPos = wrap(scrollTarget, loopLength)
                let bestDist = Infinity
                let bestOffset = 0
                for (let i = 0; i < totalSlides; i++) {
                    let d = slideOffsets[i] - wrappedPos
                    if (d > halfLoop) d -= loopLength
                    if (d < -halfLoop) d += loopLength
                    if (Math.abs(d) < Math.abs(bestDist)) {
                        bestDist = d
                        bestOffset = d
                    }
                }
                if (Math.abs(bestOffset) > EPS_MOMENTUM) {
                    scrollTarget += bestOffset * cfg.snapStrength
                }
            }

            // Autoplay
            if (
                cfg.autoplayEnabled &&
                motionEnabled &&
                !isScrolling &&
                !isDragging
            ) {
                if (isHovered) {
                    autoplayIdleTime = 0
                } else {
                    autoplayIdleTime += deltaTime
                    if (autoplayIdleTime > 0.8) {
                        scrollTarget += cfg.autoplayPxPerSec * deltaTime
                    }
                }
            } else {
                autoplayIdleTime = 0
            }

            scrollPosition +=
                (scrollTarget - scrollPosition) * cfg.scrollSmoothing

            // Prevent float drift
            if (Math.abs(scrollPosition) > loopLength * 1000) {
                const offset =
                    Math.floor(scrollPosition / loopLength) * loopLength
                scrollPosition -= offset
                scrollTarget -= offset
            }

            const frameDelta = scrollPosition - previousScroll

            if (Math.abs(frameDelta) > 0.00001 * PX_PER_WORLD) {
                directionTarget = frameDelta > 0 ? 1 : -1
            }
            scrollDirection += (directionTarget - scrollDirection) * 0.08

            const velocity = Math.abs(frameDelta) / deltaTime
            velocityHistory.push(velocity)
            velocityHistory.shift()
            const avgVelocity =
                velocityHistory.reduce((a, b) => a + b) / velocityHistory.length

            if (avgVelocity > velocityPeak) velocityPeak = avgVelocity
            const isDecelerating =
                avgVelocity / (velocityPeak + EPS_MOMENTUM) < 0.7 &&
                velocityPeak > 0.5 * PX_PER_WORLD
            velocityPeak *= 0.99

            if (velocity > 0.05 * PX_PER_WORLD)
                distortionTarget = Math.max(
                    distortionTarget,
                    Math.min(1, (velocity * 0.1) / PX_PER_WORLD)
                )
            if (isDecelerating || avgVelocity < 0.2 * PX_PER_WORLD)
                distortionTarget *= isDecelerating ? 0.95 : 0.855

            distortionAmount += (distortionTarget - distortionAmount) * 0.1

            const signedDistortion = distortionAmount * scrollDirection

            // The background is the root div's CSS fill, so a colour change
            // needs nothing here — the canvas clears to transparent over it.

            const isHoriz = cfg.direction === "horizontal"
            let closestDist = Infinity
            let closestIdx = 0

            // Clears to TRANSPARENT: the root div's background shows through.
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.useProgram(prog)
            gl.uniformMatrix4fv(U.proj, false, proj)
            gl.uniform1f(U.camZ, CAMERA_Z)
            gl.uniform1f(U.horiz, isHoriz ? 1 : 0)
            gl.uniform1f(U.borderRadius, cfg.borderRadius)
            gl.activeTexture(gl.TEXTURE0)

            const strength = motionEnabled
                ? cfg.distortionStrength * signedDistortion
                : 0

            for (const s of slidesGL) {
                let pos = -(s.offset - wrap(scrollPosition, loopLength))
                pos = wrap(pos + halfLoop, loopLength) - halfLoop
                s.pos = pos

                if (Math.abs(pos) < closestDist) {
                    closestDist = Math.abs(pos)
                    closestIdx = s.index
                }

                // Opacity fade-in
                if (s.opacity < s.opacityTarget) {
                    s.opacity = Math.min(
                        s.opacityTarget,
                        s.opacity + deltaTime * 1.8
                    )
                }

                // Off-loop slides are skipped, as the source skipped their
                // distortion — here it also skips the draw call.
                const maxSlideExtent = isHoriz ? cfg.slideW : cfg.slideH
                if (Math.abs(pos) > halfLoop + maxSlideExtent) continue

                // px -> world, the only conversion in the file. The plane
                // aspect is a RATIO, so it stays in px and needs none.
                gl.uniform2f(
                    U.size,
                    s.width * pxToWorld,
                    s.height * pxToWorld
                )
                gl.uniform2f(U.planeAspect, s.width, s.height)
                gl.uniform2f(U.imageAspect, s.imgW, s.imgH)
                gl.uniform1f(U.opacity, s.opacity)
                gl.uniform1f(U.axisPos, pos * pxToWorld)
                gl.uniform1f(U.strength, strength)
                gl.bindTexture(gl.TEXTURE_2D, s.tex)
                gl.drawElements(
                    gl.TRIANGLES,
                    INDEX_COUNT,
                    gl.UNSIGNED_SHORT,
                    0
                )
            }

            if (closestIdx !== activeSlideIndex) {
                activeSlideIndex = closestIdx
                activeSlideIndexRef.current = closestIdx
                startTransition(() => setActiveSlide(closestIdx))
            }
        }

        rafId = requestAnimationFrame(animate)

        return () => {
            disposed = true
            scrollTargetRef.current = null
            cancelAnimationFrame(rafId)
            if (scrollTimeout) clearTimeout(scrollTimeout)
            if (resizeObserver) resizeObserver.disconnect()
            else window.removeEventListener("resize", resize)

            container.removeEventListener("mouseenter", onMouseEnter)
            container.removeEventListener("mouseleave", onMouseLeave)
            container.removeEventListener("wheel", onWheel)
            container.removeEventListener("touchstart", onTouchStart)
            container.removeEventListener("touchmove", onTouchMove)
            container.removeEventListener("touchend", onTouchEnd)
            container.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", onPointerUp)

            // Textures are shared between duplicate slides — deleted once each,
            // from the URL map, never per slide.
            for (const tex of texByUrl.values()) gl.deleteTexture(tex)
            gl.deleteBuffer(vbo)
            gl.deleteBuffer(ibo)
            gl.deleteProgram(prog)
            // Never loseContext(): getContext returns the same context per
            // canvas, so a StrictMode remount would reuse a force-lost one.
            if (canvas.parentElement === container) {
                container.removeChild(canvas)
            }
        }
    }, [slidesKey, direction, geometryKey])

    // Valid slides — the ones that actually carry an image.
    const validSlides = slides.filter((s) => s.image)
    // The live region counts SLIDES in the loop, not pictures: with duplicates
    // on, "3 of 4" would stop matching what the reader is scrolling through.
    const slideCount = loopCount
    const clampedActive = Math.min(activeSlide, slideCount - 1)

    if (webglFailed) {
        return (
            <StaticFallback
                slides={slides}
                backgroundColor={backgroundColor}
                aspect={slideW / slideH}
                style={style}
            />
        )
    }

    if (validSlides.length === 0) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    minWidth: 1200,
                    minHeight: 800,
                    ...style,
                    background: backgroundColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            />
        )
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!interactive) return
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
        if (tag === "input" || tag === "textarea" || tag === "select") return
        if ((e.target as HTMLElement)?.isContentEditable) return

        // Half a world unit, the shipped arrow step, expressed in the px the
        // scroll accumulator now counts in.
        const ARROW_STEP = 0.5 * PX_PER_WORLD
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
            e.preventDefault()
            scrollTargetRef.current?.(ARROW_STEP)
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
            e.preventDefault()
            scrollTargetRef.current?.(-ARROW_STEP)
        } else if (e.key === "Enter") {
            // Modulo, same as the loop's `slideAt`: with duplicates on, the
            // active slide index runs past the picture list.
            const link =
                validSlides[
                    activeSlideIndexRef.current % (validSlides.length || 1)
                ]?.link
            if (link) window.open(link, "_blank", "noopener")
        }
    }

    return (
        <div
            ref={outerRef}
            role="region"
            aria-roledescription="carousel"
            aria-label="Image Slider"
            tabIndex={0}
            onKeyDown={onKeyDown}
            data-slider-45
            style={{
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                ...style,
                position: "relative",
                overflow: "hidden",
                background: backgroundColor,
                touchAction: interactive ? "none" : undefined,
                userSelect: "none",
                outline: "none",
            }}
        >
            <style>{`[data-slider-45]:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }`}</style>

            <div
                ref={canvasContainerRef}
                style={{ position: "absolute", inset: 0 }}
            />

            <div
                aria-live="polite"
                aria-atomic="true"
                style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    overflow: "hidden",
                    clip: "rect(0,0,0,0)",
                    whiteSpace: "nowrap",
                    border: 0,
                }}
            >
                Slide {clampedActive + 1} of {slideCount}
            </div>

        </div>
    )
}

ScrollBulge.displayName = "ScrollBulge"
