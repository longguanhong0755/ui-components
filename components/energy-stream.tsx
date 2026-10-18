"use client"

/**
 * Energy Stream — a quarter of a million points falling through a waist.
 *
 * Every point rides one of a few hundred threads wound around a hyperboloid:
 * wide at the top, pinched at the middle, flaring out again at the bottom. Each
 * one falls from the top of the shape to the bottom on its own clock, fades in
 * as it enters and out as it leaves, and is brightest crossing the waist — so
 * the shape reads as a stream pouring through a neck rather than a mesh being
 * spun. A dim sphere of points sits inside the waist as the thing being poured
 * into.
 *
 * Give it one colour and it is a stream of that colour. Give it several and
 * the palette is laid around the ring — every strand takes its own colour and
 * blends into its neighbours, wrapping at the seam so there is no join — which
 * from overhead reads as a colour wheel and from the side as a shimmer.
 *
 * The cursor pushes the points off it. A clearing opens under the pointer and
 * follows it around the stage, the points it shoulders aside lighting up along
 * its lip, and it closes again on the way out. The push is measured in the
 * plane of the screen rather than in world space, so the clearing keeps its
 * shape and size from every camera angle and at every depth into the stream,
 * and it is sized as a fraction of the frame rather than in world units — a
 * Reach of 5 covers the same part of the picture whatever the stream is set to.
 *
 * That clearing is the whole of the interaction. Nothing here needs a tap, and
 * nothing waits to be triggered: the stream runs on its own and answers the
 * pointer, so it can sit behind a headline without competing for the click.
 *
 * Ported to a single-file Framer / Next.js component from a three.js sketch of
 * the same effect — same hyperboloid parameterisation and per-thread flow, with
 * three pieces rebuilt so the file carries one dependency and behaves inside a
 * frame:
 *
 *   - OrbitControls is replaced by the small damped orbit below, bound to the
 *     canvas rather than the window. The pose it starts in is a control rather
 *     than a hard-coded vector: Turn, Elevation and Zoom set where the camera
 *     stands, a drag or the wheel moves off that, and touching the control
 *     again takes it back. Switch the wheel off and the page scrolls straight
 *     past the section instead.
 *   - EffectComposer / UnrealBloomPass / FXAA are replaced by the mip-chain
 *     bloom below — a soft-knee bright pass, a 13-tap downsample chain and a
 *     9-tap tent upsample, composited with tone mapping at the end. It keeps
 *     the alpha channel, so the canvas still composites over the CSS ground
 *     instead of painting black over it.
 *   - Sizes come from the container, not the window, so several can sit on one
 *     page and it behaves in a Framer frame of any size.
 *
 * On the Framer canvas it paints a single formed frame per edit instead of
 * running a loop, so a board full of instances is not a board full of render
 * loops. The same still frame is what a visitor who asks for reduced motion
 * gets.
 *
 * Requires `three`.
 */

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"
import * as THREE from "three"

/* ---------------------------------------------------------------- defaults --
 * One source of truth per group: the signature merges these, the panel points
 * its defaultValue at them, so the two can never drift.
 */

// Up to this many colours can be laid around the ring. Eight is more than a
// palette needs and cheap: it is eight vec3 uniforms, not eight draw calls.
const MAX_COLORS = 8

const DEFAULT_COLORS = ["#F2CC35"]

const DEFAULT_BACKGROUND = "#0A0A12"

const DEFAULT_SHAPE = {
    height: 10,
    waist: 2.2,
    flare: 5,
    twist: 0.5,
}

const DEFAULT_CORE = {
    show: true,
    diameter: 2.4,
    color: "#FF8800",
    spin: 2,
}

const DEFAULT_CAMERA = {
    zoom: 7,
    turn: -180,
    elevation: 85,
    orbit: false,
    wheel: false,
}

/* ----------------------------------------------------------------- fixed --
 * These were controls once. Each of them has one right answer for this piece,
 * and a panel row spent on a number nobody should change is a row taken from
 * one they should. They are named here rather than buried in the maths.
 */

// Strands are cut from the point count rather than set beside it, so there is
// one density control instead of two that have to be kept in step. 300k points
// makes the 400 strands the piece was built with.
const POINTS_PER_STRAND = 750
const MIN_STRANDS = 24
const MAX_STRANDS = 2000

// How big a core dot is against its sphere.
const CORE_DOT = 5

// The bloom's shape. Strength is the Glow control; these two are what make it
// this bloom rather than a generic one.
const BLOOM_RADIUS = 1.2
const BLOOM_THRESHOLD = 0.96

// A drag turns the stage by as much as the pointer travelled, no more.
const DRAG_SPEED = 1

// The two corner lights, which take the first colour of the palette so the
// room is lit by the thing standing in it.
const GLOW_OPACITY = 0.25

/* ------------------------------------------------------------------- types -- */

export interface EnergyStreamShape {
    /** Top-to-bottom span of the shape, world units */
    height?: number
    /** Radius at the pinch, world units */
    waist?: number
    /** 0-10 how hard the shape opens out toward the ends */
    flare?: number
    /** Turns a point makes on its way down; negative winds the other way */
    twist?: number
}

export interface EnergyStreamCore {
    /** The sphere of points inside the waist */
    show?: boolean
    /** Across the sphere, world units — the same units Height and Waist are
     * in, so a diameter under twice the waist stays inside the stream */
    diameter?: number
    color?: string
    /** 0-10 how fast the core turns; negative turns it the other way, which
     * sets it against the stream */
    spin?: number
}

export interface EnergyStreamCamera {
    /** 0-10 how close the camera sits; a narrow frame backs off further so
     * the stream still fits inside it */
    zoom?: number
    /** Where the camera stands around the stream, degrees */
    turn?: number
    /** How far above the waist it stands, degrees. Unbounded: 90 is directly
     * overhead, past that carries on over the top and down the far side, and
     * negative looks up from below */
    elevation?: number
    /** Drag the stage to turn it from where Turn and Elevation left it */
    orbit?: boolean
    /** Let the wheel pull the camera in and out from where Zoom left it */
    wheel?: boolean
}

export interface EnergyStreamProps {
    /** One colour, or up to eight laid around the ring */
    colors?: string[]
    /** The ground the stream stands on */
    background?: string
    /** Total points. The strands they are wound onto are cut from this */
    particles?: number
    shape?: EnergyStreamShape
    /** Angle the whole shape leans in the frame; 90 lays it on its side */
    lean?: number
    /** 0-10 size of a single point */
    size?: number
    core?: EnergyStreamCore
    /** 0-10 how much bloom is added back over the stream */
    glow?: number
    /** 0-10 how hard the cursor pushes points off it; 0 leaves them alone */
    repel?: number
    /** 0-10 how fast points fall through the waist */
    flow?: number
    /** 0-10 how fast the whole stream turns; negative turns it the other way */
    spin?: number
    camera?: EnergyStreamCamera
    style?: CSSProperties
}

/* ----------------------------------------------------------------- shaders --
 * The stream is drawn entirely on the GPU: the buffer holds three random
 * numbers per point and nothing else, and the vertex shader derives where that
 * point is right now from the clock. Nothing is written back per frame, which
 * is what makes 300k points affordable.
 */

const PARTICLE_VERT = `
precision highp float;

uniform float uTime;
uniform float uFlow;
uniform float uSize;
uniform float uMinY;
uniform float uMaxY;
uniform float uWaist;
uniform float uFlare;
uniform float uTwist;
uniform float uSpin;
uniform vec2 uPointer;
uniform float uHover;
uniform float uReach;
uniform float uPush;
uniform float uAspect;
uniform vec3 uColors[MAX_COLORS];
uniform float uColorCount;

// x: where this point sits on its thread, y: which thread, z: which layer
attribute vec3 aRandom;

varying float vAlpha;
varying float vGlow;
varying float vProgress;
varying float vRepel;
varying vec3 vTint;

// A hyperboloid of one sheet: pinched to uWaist at y = 0, opening out toward
// the ends the smaller uFlare gets.
float radiusAtY(float y, float waist, float flare) {
    return waist * sqrt(1.0 + (y * y) / (flare * flare));
}

// The palette is laid around the ring rather than along the fall, so a strand
// carries one colour and blends into its neighbours. It wraps at the seam —
// the last colour runs back into the first — so there is no join to hide.
vec3 paletteAt(float t) {
    float n = max(1.0, uColorCount);
    float x = fract(t) * n;
    float lo = floor(x);
    int i = int(lo);
    int j = int(mod(lo + 1.0, n));

    // GLSL ES 1.0 will not index a uniform array with a computed value, so the
    // two entries are picked out by a loop, whose counter it will accept.
    vec3 a = uColors[0];
    vec3 b = uColors[0];
    for (int k = 0; k < MAX_COLORS; k++) {
        if (k == i) a = uColors[k];
        if (k == j) b = uColors[k];
    }
    return mix(a, b, x - lo);
}

void main() {
    // Layers run at slightly different rates, so the threads shear against
    // each other instead of reading as one rigid cage.
    float speedVar = 0.8 + 0.4 * aRandom.z;
    float progress = fract(aRandom.x + uTime * uFlow * speedVar);

    float y = mix(uMaxY, uMinY, progress);
    float r = radiusAtY(y, uWaist, uFlare) * mix(0.70, 1.00, aRandom.z);
    float phi = 6.2831853 * aRandom.y + progress * 6.2831853 * uTwist + uSpin;
    vec3 pos = vec3(r * cos(phi), y, r * sin(phi));

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vec4 clip = projectionMatrix * mv;

    // The cursor pushes points off it in the plane of the screen rather than
    // in world space, so the clearing it opens is the same shape and size
    // wherever the camera stands and however deep into the stream the point
    // is. Points behind the camera have no screen position to speak of, so
    // they sit the field out.
    vRepel = 0.0;
    if (uHover > 0.001 && clip.w > 0.0) {
        vec2 ndc = clip.xy / clip.w;
        vec2 away = vec2((ndc.x - uPointer.x) * uAspect, ndc.y - uPointer.y);
        float dist = length(away);
        float falloff = 1.0 - smoothstep(0.0, uReach, dist);
        vRepel = falloff * uHover;
        // Points sitting exactly under the cursor have no direction to run
        // in, so they are nudged along x and let the rest of the field carry
        // them out.
        vec2 dir = dist > 1e-4 ? away / dist : vec2(1.0, 0.0);
        clip.xy += vec2(dir.x / uAspect, dir.y) * vRepel * uPush * clip.w;
    }

    gl_PointSize = uSize / max(0.0001, -mv.z) * (1.0 + vRepel * 0.45);
    gl_Position = clip;

    // Brightest through the waist, and faded at both ends of the fall so no
    // point ever pops in or out of existence.
    float neckGlow = 1.0 - smoothstep(0.0, 0.28 * uMaxY, abs(y));
    float edgeFade = smoothstep(0.0, 0.06, progress) * (1.0 - smoothstep(0.94, 1.0, progress));

    vGlow = neckGlow;
    vAlpha = 0.23 + 0.62 * neckGlow * edgeFade;
    vProgress = progress;
    vTint = paletteAt(aRandom.y) * (0.90 + 0.20 * aRandom.z);
}
`

const PARTICLE_FRAG = `
precision highp float;

varying float vAlpha;
varying float vGlow;
varying float vProgress;
varying float vRepel;
varying vec3 vTint;

void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(uv, uv);
    if (r2 > 1.0) discard;

    float falloff = pow(1.0 - r2, 1.7);
    float sparkle = 0.85 + 0.15 * sin(50.0 * vProgress);

    vec3 col = vTint;
    col += 0.15 * vGlow;

    // What the cursor shoulders aside lights up as it goes, so the clearing
    // has a lip and reads as points being pushed rather than points vanishing.
    col += vTint * vRepel * 0.45;

    gl_FragColor = vec4(col, (vAlpha + vRepel * 0.15) * falloff * sparkle);
}
`

/* -------------------------------------------------------------------- bloom --
 * A mip chain rather than a gaussian: prefilter with a soft knee, halve five
 * times with the 13-tap kernel, then walk back up adding a 9-tap tent at each
 * step. Wide, cheap, and free of the ringing a two-pass blur gives on points
 * this small.
 */

const QUAD_VERT = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const PREFILTER_FRAG = `
precision highp float;
uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform float uKnee;
varying vec2 vUv;

void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float lum = max(c.r, max(c.g, c.b));
    float soft = clamp(lum - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 0.0001);
    gl_FragColor = vec4(c * max(soft, lum - uThreshold) / max(lum, 0.0001), 1.0);
}
`

const DOWN_FRAG = `
precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
varying vec2 vUv;

vec3 tap(float x, float y) {
    return texture2D(tDiffuse, vUv + vec2(x, y) * uTexel).rgb;
}

void main() {
    vec3 a = tap(-2.0,  2.0), b = tap( 0.0,  2.0), c = tap( 2.0,  2.0);
    vec3 d = tap(-2.0,  0.0), e = tap( 0.0,  0.0), f = tap( 2.0,  0.0);
    vec3 g = tap(-2.0, -2.0), h = tap( 0.0, -2.0), i = tap( 2.0, -2.0);
    vec3 j = tap(-1.0,  1.0), k = tap( 1.0,  1.0);
    vec3 l = tap(-1.0, -1.0), m = tap( 1.0, -1.0);

    vec3 sum = e * 0.125;
    sum += (a + c + g + i) * 0.03125;
    sum += (b + d + f + h) * 0.0625;
    sum += (j + k + l + m) * 0.125;
    gl_FragColor = vec4(sum, 1.0);
}
`

const UP_FRAG = `
precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform float uRadius;
varying vec2 vUv;

vec3 tap(float x, float y) {
    return texture2D(tDiffuse, vUv + vec2(x, y) * uTexel * uRadius).rgb;
}

void main() {
    vec3 sum = tap(-1.0,  1.0) + tap(0.0,  1.0) * 2.0 + tap(1.0,  1.0);
    sum += tap(-1.0,  0.0) * 2.0 + tap(0.0,  0.0) * 4.0 + tap(1.0,  0.0) * 2.0;
    sum += tap(-1.0, -1.0) + tap(0.0, -1.0) * 2.0 + tap(1.0, -1.0);
    gl_FragColor = vec4(sum * 0.0625, 1.0);
}
`

// The only pass that reaches the screen, so it is the only one that tone maps
// and converts to the output colour space. Alpha is carried through rather
// than replaced, which is what keeps the CSS ground visible behind the stream.
const COMPOSITE_FRAG = `
precision highp float;
uniform sampler2D tBase;
uniform sampler2D tBloom;
uniform float uStrength;
varying vec2 vUv;

void main() {
    vec4 base = texture2D(tBase, vUv);
    vec3 bloom = texture2D(tBloom, vUv).rgb * uStrength;
    float glow = max(bloom.r, max(bloom.g, bloom.b));
    gl_FragColor = vec4(base.rgb + bloom, clamp(base.a + glow, 0.0, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`

/* ------------------------------------------------------------------ params --
 * Grouped props hand back whole objects, but an object saved before a field
 * existed comes back without it — so merge rather than trust, and drop
 * undefined so a partial group cannot punch a hole in the defaults.
 */

function merge<T extends object>(base: T, over?: Partial<T>): T {
    const out = { ...base }
    if (!over) return out
    for (const key of Object.keys(over) as (keyof T)[]) {
        const value = over[key]
        if (value !== undefined) out[key] = value as T[keyof T]
    }
    return out
}

function makeParams(p: EnergyStreamProps) {
    // An empty palette is a palette the user is halfway through editing, not
    // an instruction to draw nothing.
    const picked = (p.colors ?? []).filter(
        (c) => typeof c === "string" && c.length > 0
    )
    // Anything but a real number here divides its way into a zero-length
    // buffer and the stream silently stops drawing, which is a miserable
    // thing to debug for the sake of one guard.
    const count = Number(p.particles)

    return {
        colors: (picked.length ? picked : DEFAULT_COLORS).slice(0, MAX_COLORS),
        background: p.background ?? DEFAULT_BACKGROUND,
        particles: Number.isFinite(count) && count >= 1 ? Math.round(count) : 500000,
        shape: merge(DEFAULT_SHAPE, p.shape),
        lean: p.lean ?? 0,
        size: p.size ?? 5,
        core: merge(DEFAULT_CORE, p.core),
        glow: p.glow ?? 10,
        repel: p.repel ?? 10,
        flow: p.flow ?? 10,
        spin: p.spin ?? 2,
        camera: merge(DEFAULT_CAMERA, p.camera),
    }
}

type Params = ReturnType<typeof makeParams>

/* ----------------------------------------------------------------- helpers -- */

// The pose the still frame is painted in: far enough into the run that every
// thread is populated, so a static render shows the stream and not its first
// frame.
const FROZEN_TIME = 2.4

// Per-frame decay of the orbit's leftover velocity. Low enough that a flick
// coasts, high enough that it never feels like ice.
const ORBIT_DAMPING = 0.08

const DEG = Math.PI / 180

// The core sphere is built once at this radius and scaled from there.
const CORE_RADIUS = 1.2

// Zoom is a 0-10 scale rather than a distance in world units, and it is squared
// so the close end of it — where a step of one actually changes the picture —
// gets most of the travel. 4 is the 12 units the piece was framed at.
const distanceFor = (zoom: number) =>
    3 + 25 * Math.pow(1 - Math.min(10, Math.max(0, zoom)) / 10, 2)

const makeRT = (w: number, h: number) =>
    new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: false,
        stencilBuffer: false,
    })

/* --------------------------------------------------------------- component -- */

export default function EnergyStream(props: EnergyStreamProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    // Rebuilt per render rather than read through props inside the loop, so
    // dragging a slider shows up on the next frame without the effect below
    // ever tearing the renderer down.
    const paramsRef = useRef<Params>(makeParams(props))
    paramsRef.current = makeParams(props)
    const p = paramsRef.current

    const apiRef = useRef<{
        invalidate: () => void
        setCloud: (count: number) => void
    } | null>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // Browsers cap the number of live WebGL contexts (~16 in Chrome). If
        // that is hit this throws and nothing below runs — no canvas is
        // appended and the frame is simply blank, which is a miserable thing
        // to debug. Fail loudly instead. See the cleanup for why it should not
        // happen: the context is released explicitly rather than left to GC.
        let renderer: THREE.WebGLRenderer
        try {
            renderer = new THREE.WebGLRenderer({
                antialias: false,
                alpha: true,
                powerPreference: "high-performance",
            })
        } catch (err) {
            console.error("[energy-stream] could not create a WebGL context:", err)
            return
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.setClearColor(0x000000, 0)
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1
        // Every pass below clears its own target, or deliberately does not.
        renderer.autoClear = false

        const canvas = renderer.domElement
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.display = "block"
        container.appendChild(canvas)

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200)

        /* ------------------------------------------------------ the stream */

        const uniforms = {
            uTime: { value: 0 },
            uFlow: { value: 0.2 },
            uSize: { value: 12 },
            uMinY: { value: -5 },
            uMaxY: { value: 5 },
            uWaist: { value: 2.2 },
            uFlare: { value: 2.5 },
            uTwist: { value: 0.5 },
            uSpin: { value: 0 },
            uPointer: { value: new THREE.Vector2(0, 0) },
            uHover: { value: 0 },
            uReach: { value: 0.36 },
            uPush: { value: 0.15 },
            uAspect: { value: 1 },
            uColors: {
                value: Array.from(
                    { length: MAX_COLORS },
                    () => new THREE.Color(DEFAULT_COLORS[0])
                ),
            },
            uColorCount: { value: 1 },
        }

        const streamMat = new THREE.ShaderMaterial({
            // The palette array has to be sized at compile time, and the loop
            // that reads it has to be bounded by the same number.
            defines: { MAX_COLORS },
            uniforms,
            vertexShader: PARTICLE_VERT,
            fragmentShader: PARTICLE_FRAG,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            transparent: true,
        })

        // One point costs three random numbers and nothing else: where it sits
        // on its thread, which thread that is, and which layer the thread
        // belongs to. Everything else is derived in the vertex shader.
        const buildCloud = (count: number) => {
            const lanes = Math.min(
                MAX_STRANDS,
                Math.max(MIN_STRANDS, Math.round(count / POINTS_PER_STRAND))
            )
            const per = Math.max(1, Math.floor(Math.max(1, count) / lanes))
            const total = lanes * per

            const geo = new THREE.BufferGeometry()
            // Unused, but three needs a position attribute to know the draw
            // count. Culling is off below because these stay at the origin.
            geo.setAttribute(
                "position",
                new THREE.BufferAttribute(new Float32Array(total * 3), 3)
            )

            const rnd = new Float32Array(total * 3)
            let i = 0
            for (let t = 0; t < lanes; t++) {
                const lane = t / lanes
                const layer = Math.random()
                for (let j = 0; j < per; j++) {
                    rnd[i * 3] = Math.random()
                    rnd[i * 3 + 1] = lane
                    rnd[i * 3 + 2] = layer
                    i++
                }
            }
            geo.setAttribute("aRandom", new THREE.BufferAttribute(rnd, 3))
            return geo
        }

        // Lean turns this, not the camera: the stream keeps falling along its
        // own axis and the whole piece tips over in the frame, so the wave
        // still runs the length of it once it is lying down.
        const rig = new THREE.Group()
        scene.add(rig)

        const stream = new THREE.Points(
            buildCloud(p.particles),
            streamMat
        )
        stream.frustumCulled = false
        rig.add(stream)

        /* -------------------------------------------------------- the core */

        // Built at the unit diameter below and scaled to whatever the
        // control asks for, so changing it never rebuilds a buffer.
        const coreGeo = new THREE.SphereGeometry(CORE_RADIUS, 48, 48)
        const coreMat = new THREE.PointsMaterial({
            size: 0.025,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
        })
        const core = new THREE.Points(coreGeo, coreMat)
        rig.add(core)

        /* ------------------------------------------------------- bloom rig */

        const quadScene = new THREE.Scene()
        const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
        const quadGeo = new THREE.PlaneGeometry(2, 2)
        const quad = new THREE.Mesh(quadGeo)
        quad.frustumCulled = false
        quadScene.add(quad)

        const passMat = (
            fragmentShader: string,
            extra: Record<string, THREE.IUniform>
        ) =>
            new THREE.ShaderMaterial({
                uniforms: { tDiffuse: { value: null }, ...extra },
                vertexShader: QUAD_VERT,
                fragmentShader,
                depthTest: false,
                depthWrite: false,
                blending: THREE.NoBlending,
                toneMapped: false,
            })

        const prefilterMat = passMat(PREFILTER_FRAG, {
            uThreshold: { value: 0.96 },
            uKnee: { value: 0.48 },
        })
        const downMat = passMat(DOWN_FRAG, {
            uTexel: { value: new THREE.Vector2() },
        })
        const upMat = passMat(UP_FRAG, {
            uTexel: { value: new THREE.Vector2() },
            uRadius: { value: 1.2 },
        })
        // Levels are laid back down on top of one another, so this one adds.
        upMat.blending = THREE.AdditiveBlending

        // The only pass that reaches the screen, so the only one left tone
        // mapped — that is what makes the includes in its shader fire.
        const compositeMat = new THREE.ShaderMaterial({
            uniforms: {
                tBase: { value: null },
                tBloom: { value: null },
                uStrength: { value: 0.6 },
            },
            vertexShader: QUAD_VERT,
            fragmentShader: COMPOSITE_FRAG,
            depthTest: false,
            depthWrite: false,
            blending: THREE.NoBlending,
            transparent: true,
        })

        const blit = (
            mat: THREE.Material,
            target: THREE.WebGLRenderTarget | null,
            clear: boolean
        ) => {
            quad.material = mat
            renderer.setRenderTarget(target)
            if (clear) renderer.clear(true, false, false)
            renderer.render(quadScene, quadCam)
        }

        /* ---------------------------------------------------------- sizing */

        const rtScene = makeRT(1, 1)
        let mips: { rt: THREE.WebGLRenderTarget; w: number; h: number }[] = []
        let renderHeight = 900
        let sizeW = 0
        let sizeH = 0
        let dirty = true

        const dropMips = () => {
            for (const m of mips) m.rt.dispose()
            mips = []
        }

        const resize = () => {
            const w = Math.max(1, container.clientWidth)
            const h = Math.max(1, container.clientHeight)
            if (w === sizeW && h === sizeH) return
            sizeW = w
            sizeH = h

            renderer.setSize(w, h)
            camera.aspect = w / h
            camera.updateProjectionMatrix()

            const dpr = renderer.getPixelRatio()
            const pw = Math.max(1, Math.round(w * dpr))
            const ph = Math.max(1, Math.round(h * dpr))
            renderHeight = ph
            rtScene.setSize(pw, ph)

            // As many halvings as the frame can carry, capped at five: past
            // that the top of the chain is a handful of texels and buys
            // nothing but another pass.
            const levels = Math.max(
                2,
                Math.min(5, Math.floor(Math.log2(Math.min(pw, ph))) - 3)
            )
            dropMips()
            let mw = Math.max(1, pw >> 1)
            let mh = Math.max(1, ph >> 1)
            for (let i = 0; i < levels; i++) {
                mips.push({ rt: makeRT(mw, mh), w: mw, h: mh })
                mw = Math.max(1, mw >> 1)
                mh = Math.max(1, mh >> 1)
            }

            dirty = true
        }

        resize()

        // The frame, not the window: this has to answer to a layout change, a
        // parent resize and a browser resize alike.
        const ro = new ResizeObserver(resize)
        ro.observe(container)

        // A stream nobody is looking at is a stream nobody has to pay for.
        let onScreen = true
        const io = new IntersectionObserver(
            (entries) => {
                onScreen = entries.some((e) => e.isIntersecting)
            },
            { rootMargin: "200px" }
        )
        io.observe(container)

        /* ----------------------------------------------------------- orbit */

        // Turn and Elevation are read as angles from the front of the stream,
        // so 0 / 0 is looking straight at its waist. Neither is bounded: both
        // are angles, and an angle that runs out at 85 is a worse camera than
        // one that carries on over the top.
        const thetaFor = (turn: number) => Math.PI / 2 + turn * DEG

        const orbit = {
            theta: thetaFor(p.camera.turn),
            el: p.camera.elevation * DEG,
            radius: distanceFor(p.camera.zoom),
            dTheta: 0,
            dEl: 0,
        }
        const leanAxis = new THREE.Vector3()
        let lastTurn = p.camera.turn
        let lastElevation = p.camera.elevation
        let lastZoom = p.camera.zoom
        let dragging = false

        const stepOrbit = () => {
            const c = paramsRef.current.camera
            // The panel sets the pose, then a drag or a wheel moves off it —
            // and what the visitor did stands until the control itself is
            // touched again, which is the moment the panel takes it back.
            if (c.turn !== lastTurn) {
                lastTurn = c.turn
                orbit.theta = thetaFor(c.turn)
                orbit.dTheta = 0
            }
            if (c.elevation !== lastElevation) {
                lastElevation = c.elevation
                orbit.el = c.elevation * DEG
                orbit.dEl = 0
            }
            if (c.zoom !== lastZoom) {
                lastZoom = c.zoom
                orbit.radius = distanceFor(c.zoom)
            }
            // A fraction of what is left goes on each frame and the rest is
            // decayed by the same fraction, so a drag coasts to a stop having
            // travelled exactly what the pointer asked for — leave the factor
            // off the first line and it travels 1 / damping times too far.
            orbit.theta += orbit.dTheta * ORBIT_DAMPING
            orbit.el += orbit.dEl * ORBIT_DAMPING
            orbit.dTheta *= 1 - ORBIT_DAMPING
            orbit.dEl *= 1 - ORBIT_DAMPING

            // The field of view is vertical, so a frame narrower than a
            // landscape one would cut the flare off at the sides. Back off far
            // enough to keep the shape inside it — at 3:2 and wider this is
            // exactly the distance asked for.
            const fit = Math.min(1.7, Math.max(1, 1.45 / (camera.aspect || 1)))
            const r = orbit.radius * fit

            const cosEl = Math.cos(orbit.el)
            const sinEl = Math.sin(orbit.el)
            const sinAz = Math.sin(orbit.theta)
            const cosAz = Math.cos(orbit.theta)

            camera.position.set(r * cosEl * sinAz, r * sinEl, r * cosEl * cosAz)
            // Up rides the same rotation the position does, rather than being
            // pinned to world up. That is what lets Elevation pass 90: with a
            // fixed up vector, a camera directly over the waist is looking
            // along its own up and has no way left to say which way is up, so
            // it has to be stopped short of the pole. This one has an answer
            // at every angle, so it can be carried over the top and round the
            // back with nothing to clamp.
            camera.up.set(-sinEl * sinAz, cosEl, -sinEl * cosAz)
            camera.lookAt(0, 0, 0)

            // Lean is a roll in the frame, not a rotation in world space: the
            // axis it turns about is the one the camera is looking down, so
            // 90° always lays the stream across the frame and never points it
            // at the viewer, whatever Turn and Elevation are set to.
            leanAxis.copy(camera.position).normalize()
            rig.quaternion.setFromAxisAngle(
                leanAxis,
                -paramsRef.current.lean * DEG
            )
        }

        /* ----------------------------------------------------------- input */

        let px = 0
        let py = 0

        // Where the cursor is in clip space, where the field has caught up to,
        // whether the pointer is over the stage at all, and how far the field
        // has faded in behind it. The field chases rather than snaps, so a
        // flicked cursor drags the clearing after it instead of teleporting it.
        const aim = new THREE.Vector2(0, 0)
        let aimed = false
        let over = false
        let hoverAmount = 0

        const onPointerDown = (e: PointerEvent) => {
            if (!paramsRef.current.camera.orbit) return
            dragging = true
            px = e.clientX
            py = e.clientY
            try {
                canvas.setPointerCapture(e.pointerId)
            } catch {}
        }

        const onPointerMove = (e: PointerEvent) => {
            // offsetX/Y is measured against the canvas, which fills the frame,
            // so the pointer is placed without reading layout back on a move.
            aim.set(
                (e.offsetX / (sizeW || 1)) * 2 - 1,
                1 - (e.offsetY / (sizeH || 1)) * 2
            )
            aimed = true

            if (!dragging) return
            const h = container.clientHeight || 1
            orbit.dTheta -= 2 * Math.PI * ((e.clientX - px) / h) * DRAG_SPEED
            orbit.dEl += 2 * Math.PI * ((e.clientY - py) / h) * DRAG_SPEED
            px = e.clientX
            py = e.clientY
        }

        const onPointerEnter = () => {
            over = true
        }

        const onPointerLeave = () => {
            over = false
        }

        const onPointerUp = (e: PointerEvent) => {
            if (dragging) {
                dragging = false
                try {
                    canvas.releasePointerCapture(e.pointerId)
                } catch {}
            }
        }

        const onPointerCancel = () => {
            dragging = false
            over = false
        }

        const onWheel = (e: WheelEvent) => {
            if (!paramsRef.current.camera.wheel) return
            // Only claimed when wheel zoom is on, so a hero that does not want
            // the wheel lets the page scroll straight past it.
            e.preventDefault()
            const step = e.deltaY > 0 ? 1.08 : 1 / 1.08
            orbit.radius = Math.min(28, Math.max(3, orbit.radius * step))
        }

        canvas.addEventListener("pointerdown", onPointerDown)
        canvas.addEventListener("pointermove", onPointerMove)
        canvas.addEventListener("pointerup", onPointerUp)
        canvas.addEventListener("pointercancel", onPointerCancel)
        canvas.addEventListener("pointerenter", onPointerEnter)
        canvas.addEventListener("pointerleave", onPointerLeave)
        canvas.addEventListener("wheel", onWheel, { passive: false })

        /* ----------------------------------------------------------- frame */

        // Colour strings are cheap to compare and expensive to parse, so they
        // are only pushed at three.js when they actually change.
        const parsed = { colors: "", core: "" }
        const recolour = (target: THREE.Color, css: string) => {
            try {
                target.setStyle(css)
            } catch {}
        }

        const applyParams = () => {
            const q = paramsRef.current

            const half = Math.max(0.5, q.shape.height / 2)
            uniforms.uMaxY.value = half
            uniforms.uMinY.value = -half
            uniforms.uWaist.value = Math.max(0.05, q.shape.waist)
            // Turning the control up has to open the shape out, and the
            // parameter it lands on runs the other way.
            uniforms.uFlare.value = 12.5 / Math.max(0.3, q.shape.flare)
            uniforms.uTwist.value = q.shape.twist
            uniforms.uFlow.value = q.flow * 0.05

            // Reach and push come off the one control: a cursor that clears a
            // wider circle is a cursor pushing harder, and splitting them was
            // two rows spent on one idea. Both are in clip units, where 2 is
            // the full height of the frame, so the clearing keeps its size on
            // screen whatever the camera or the shape is doing.
            uniforms.uAspect.value = camera.aspect || 1
            uniforms.uReach.value = 0.08 + q.repel * 0.056
            uniforms.uPush.value = q.repel * 0.03

            // gl_PointSize is in device pixels, so it has to answer to the
            // pixel ratio and to the height of the frame both — otherwise the
            // stream thins out in a small frame and coarsens on a retina one.
            uniforms.uSize.value = q.size * 2.4 * (renderHeight / 900)

            const palette = q.colors.join("|")
            if (parsed.colors !== palette) {
                parsed.colors = palette
                for (let i = 0; i < q.colors.length; i++) {
                    recolour(uniforms.uColors.value[i], q.colors[i])
                }
                uniforms.uColorCount.value = q.colors.length
            }
            if (parsed.core !== q.core.color) {
                parsed.core = q.core.color
                recolour(coreMat.color, q.core.color)
            }
            core.visible = q.core.show

            prefilterMat.uniforms.uThreshold.value = BLOOM_THRESHOLD
            prefilterMat.uniforms.uKnee.value = BLOOM_THRESHOLD * 0.5
            upMat.uniforms.uRadius.value = BLOOM_RADIUS
            compositeMat.uniforms.uStrength.value = q.glow * 0.15
        }

        const renderFrame = (t: number, dt: number) => {
            const q = paramsRef.current
            applyParams()
            stepOrbit()

            // Exponential chase rather than a fixed step per frame, so the
            // clearing arrives at the same speed on a 60Hz screen and a 144Hz
            // one. It follows the cursor faster than it fades in and out,
            // which is what stops the fade reading as a lag.
            const wanted = q.repel > 0 && over && aimed ? 1 : 0
            // Starting from cold, the field opens where the cursor already is
            // rather than sweeping in from wherever it was last seen.
            if (wanted && hoverAmount === 0) uniforms.uPointer.value.copy(aim)
            hoverAmount += (wanted - hoverAmount) * (1 - Math.exp(-dt * 7))
            if (hoverAmount < 0.002) hoverAmount = 0
            uniforms.uHover.value = hoverAmount
            uniforms.uPointer.value.lerp(aim, 1 - Math.exp(-dt * 16))

            uniforms.uTime.value = t
            // The stream turns twice over: the whole object, and the winding
            // of the threads inside it. Together they read as one rotation
            // with depth to it.
            const spin = t * 0.01 * q.spin
            uniforms.uSpin.value = spin
            stream.rotation.y = spin
            // The core keeps its own clock and its own sign, so it can be set
            // running against the stream rather than with it.
            core.rotation.y = t * 0.06 * q.core.spin

            // The core breathes on its own clock, a twentieth either side.
            // Its dots are scaled along with it, so Diameter reads as the
            // whole sphere growing rather than the same dots spreading out.
            const swell = q.core.diameter / (2 * CORE_RADIUS)
            core.scale.setScalar(swell * (1 + Math.sin(t * 1.6) * 0.05))
            coreMat.size = CORE_DOT * 0.005 * swell
            coreMat.opacity = 0.9

            // 1. the stream, into a linear buffer that can hold the values
            //    additive blending piles up past 1
            renderer.setRenderTarget(rtScene)
            renderer.clear(true, false, false)
            renderer.render(scene, camera)

            // 2. the bright pass, straight into the foot of the mip chain
            prefilterMat.uniforms.tDiffuse.value = rtScene.texture
            blit(prefilterMat, mips[0].rt, true)

            // 3. down the chain, halving each time
            for (let i = 1; i < mips.length; i++) {
                const src = mips[i - 1]
                downMat.uniforms.tDiffuse.value = src.rt.texture
                downMat.uniforms.uTexel.value.set(1 / src.w, 1 / src.h)
                blit(downMat, mips[i].rt, true)
            }

            // 4. and back up it, every level adding into the one below
            for (let i = mips.length - 1; i > 0; i--) {
                const src = mips[i]
                upMat.uniforms.tDiffuse.value = src.rt.texture
                upMat.uniforms.uTexel.value.set(1 / src.w, 1 / src.h)
                blit(upMat, mips[i - 1].rt, false)
            }

            // 5. out to the canvas: tone mapped, alpha intact, so the ground
            //    behind it still shows through
            compositeMat.uniforms.tBase.value = rtScene.texture
            compositeMat.uniforms.tBloom.value = mips[0].rt.texture
            blit(compositeMat, null, true)
        }

        /* ------------------------------------------------------------ loop */

        let prefersReduced = false
        try {
            prefersReduced = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches
        } catch {}

        const clock = new THREE.Clock()
        let last = 0

        const loop = () => {
            // For a visitor whose system asks for less movement, the piece is
            // a picture: painted once and repainted only when something it
            // stands on changes. A clearing that chases the cursor is exactly
            // the movement a visitor who asked for less of it does not want,
            // so the still frame is drawn without one.
            if (prefersReduced) {
                if (!dirty) return
                dirty = false
                hoverAmount = 0
                renderFrame(FROZEN_TIME, 0)
                return
            }
            if (!onScreen) return

            const t = clock.getElapsedTime()
            const dt = Math.min(0.1, t - last)
            last = t
            renderFrame(t, dt)
        }

        renderer.setAnimationLoop(loop)

        apiRef.current = {
            invalidate: () => {
                dirty = true
            },
            setCloud: (count: number) => {
                const previous = stream.geometry
                stream.geometry = buildCloud(count)
                previous.dispose()
                dirty = true
            },
        }

        return () => {
            renderer.setAnimationLoop(null)
            apiRef.current = null

            ro.disconnect()
            io.disconnect()
            canvas.removeEventListener("pointerdown", onPointerDown)
            canvas.removeEventListener("pointermove", onPointerMove)
            canvas.removeEventListener("pointerup", onPointerUp)
            canvas.removeEventListener("pointercancel", onPointerCancel)
            canvas.removeEventListener("pointerenter", onPointerEnter)
            canvas.removeEventListener("pointerleave", onPointerLeave)
            canvas.removeEventListener("wheel", onWheel)

            stream.geometry.dispose()
            streamMat.dispose()
            coreGeo.dispose()
            coreMat.dispose()
            quadGeo.dispose()
            prefilterMat.dispose()
            downMat.dispose()
            upMat.dispose()
            compositeMat.dispose()
            rtScene.dispose()
            dropMips()

            // dispose() frees GL resources but leaves the context itself alive
            // until the canvas is collected, which is not deterministic. This
            // effect re-runs on every StrictMode double mount and every hot
            // update, so without an explicit release they pile up, and once
            // the browser limit is reached the renderer above cannot be
            // constructed at all.
            renderer.dispose()
            renderer.forceContextLoss()
            canvas.remove()
        }
        // Mounted once. Everything the loop needs is read through paramsRef,
        // and the two things that cannot be — the point count and the thread
        // count — are handed in by the effect below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Rebuilding the buffer must not tear down the WebGL context, so the one
    // structural change the loop cannot absorb gets its own effect.
    const cloudKey = p.particles
    const builtRef = useRef(cloudKey)
    useEffect(() => {
        if (builtRef.current === cloudKey) return
        builtRef.current = cloudKey
        apiRef.current?.setCloud(cloudKey)
    }, [cloudKey])

    // Deliberately without a dependency list: this is what turns a prop
    // change into a repainted frame when reduced motion is on.
    useEffect(() => {
        apiRef.current?.invalidate()
    })

    /* -------------------------------------------------------------- ground */

    // The corner lights take the first colour of the palette, so the room is
    // lit by the thing standing in it rather than by a colour the user has to
    // keep in step with a second control.
    const cornerLight = (start: boolean): CSSProperties => ({
        position: "absolute",
        width: "55%",
        height: "55%",
        ...(start ? { left: "-18%", top: "-18%" } : { right: "-16%", bottom: "-16%" }),
        background: `radial-gradient(closest-side, ${p.colors[0]}, transparent 60%)`,
        filter: "blur(60px)",
        opacity: GLOW_OPACITY,
        mixBlendMode: "screen",
        pointerEvents: "none",
    })

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                // Or the browser claims the gesture for panning and the
                // pointermove stream dies mid-drag.
                touchAction: p.camera.orbit ? "none" : "auto",
                background: p.background,
                ...props.style,
            }}
        >
            <div style={cornerLight(true)} />
            <div style={cornerLight(false)} />
        </div>
    )
}
