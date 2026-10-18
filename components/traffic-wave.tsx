"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Traffic Wave — a night highway seen from a car that never arrives.
 *
 * A port of Anemolo's "Infinite Lights" (Codrops). Instanced meshes carry the
 * whole scene: tube segments for the head/tail light trails, quads for the
 * roadside posts down both shoulders, and two subdivided planes for the
 * carriageways. Nothing is written per frame — every instance derives its depth
 * from `mod(uTime * speed + aOffset.z, uTravelLength)`, so a light leaving the
 * far end reappears at the near end on the same frame with no respawn
 * bookkeeping and no drift over a long session.
 *
 * The road's curves are not geometry. A `getDistortion(progress)` function is
 * spliced into every vertex shader by `onBeforeCompile`, so road, lights and
 * posts all bend through one field and stay welded together. The obvious
 * alternative — building a curved mesh and flying a camera along it — cannot
 * work here, because the GPU places the lights and the CPU never learns where
 * they ended up. The camera instead re-evaluates the same curve in JS and looks
 * a short way down the warped corridor.
 *
 * Bloom is hand-rolled (bright pass → separable blur → additive composite)
 * rather than pulled from a post-processing library: the trails read as thin
 * plastic without it, and this repo carries only `three`.
 */

/** The corridor's depth in world units. Everything else is measured against it. */
const ROAD_LENGTH = 400

/**
 * Night air. Not a panel colour: it is what the far end of the road dissolves
 * into, and anything other than black reads as a coloured ground painted behind
 * the scene rather than as distance.
 */
const HAZE = 0x000000

const DEFAULTS = {
    leftLights: ["#FF102A", "#EB383E", "#FF102A"],
    rightLights: ["#DADAFA", "#BEBAE3", "#8F97E4"],
    stickColor: "#DADAFA",
    roadColor: "#080808",
    lineColor: "#D3D3DE",
    roadWidth: 20,
    lanes: 4,
    traffic: 20,
    sticks: 20,
    speed: 8,
    trailFade: 0,
    glow: 10,
    fov: 160,
    boostOn: true,
    boost: {
        defaultValue: {"fov":150,"amount":2}, amount: 2, fov: 150 },
}

type Config = {
    leftLights: string[]
    rightLights: string[]
    stickColor: string
    roadColor: string
    lineColor: string
    roadWidth: number
    lanes: number
    traffic: number
    sticks: number
    speed: number
    trailFade: number
    glow: number
    fov: number
    boostOn: boolean
    boost?: { amount?: number; fov?: number }
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the scene wants the real ones. */
function settingsFor(cfg: Config) {
    const traffic = clamp(cfg.traffic, 1, 20, DEFAULTS.traffic)
    const sticks = clamp(cfg.sticks, 1, 20, DEFAULTS.sticks)
    const boost = cfg.boost ?? DEFAULTS.boost
    const fov = clamp(cfg.fov, 40, 160, DEFAULTS.fov)
    return {
        roadWidth: clamp(cfg.roadWidth, 4, 20, DEFAULTS.roadWidth),
        lanes: clamp(cfg.lanes, 2, 4, DEFAULTS.lanes),
        // Squared: at the sparse end one more car pair reads clearly, at the
        // dense end it takes dozens before the road looks any busier.
        lightPairs: Math.round(6 + traffic * traffic * 0.3),
        // At least two, since the spacing divides by (total - 1).
        stickCount: Math.max(2, Math.round(5 + sticks * sticks * 0.25)),
        // 10 on the panel is the reference footage's pace.
        speedScale: clamp(cfg.speed, 0, 20, DEFAULTS.speed) / 10,
        // How far along a trail the head fades out; 8 gives the original 0.4.
        fade: clamp(cfg.trailFade, 0, 20, DEFAULTS.trailFade) / 20,
        glow: clamp(cfg.glow, 0, 20, DEFAULTS.glow) / 10,
        fov,
        boostSpeed: cfg.boostOn ? clamp(boost.amount ?? 2, 0, 10, 2) : 0,
        boostFov: cfg.boostOn ? clamp(boost.fov ?? 150, 40, 200, 150) : fov,
    }
}

const random = (min: number, max: number) => Math.random() * (max - min) + min
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

/**
 * The demo's smoothing helper, kept as-is: the returned value is the *change* to
 * apply, snapped to the target once it falls under `limit` so nothing creeps
 * forever toward a value it can never quite reach.
 */
function approach(current: number, target: number, speed = 0.1, limit = 0.001) {
    let change = (target - current) * speed
    if (Math.abs(change) < limit) change = target - current
    return change
}

// ---------------------------------------------------------------------------
// Distortions
// ---------------------------------------------------------------------------

type Distortion = {
    uniforms: Record<string, THREE.IUniform>
    /** Spliced into every vertex shader in place of the include below. */
    glsl: string
    /** The same curve in JS, so the camera can look where the road went. */
    camera?: (progress: number, time: number) => THREE.Vector3
}

const nsin = (v: number) => Math.sin(v) * 0.5 + 0.5

/** Fresh uniform objects per scene — one set shared by all five materials. */
function makeDistortion(): Distortion {
    // mountain — the default, and the only one that lifts the road in Z as well,
    // which is what makes the corridor crest and dip like hill country.
    const uniforms = {
        uFreq: new THREE.Uniform(new THREE.Vector3(3, 6, 10)),
        uAmp: new THREE.Uniform(new THREE.Vector3(30, 30, 20)),
    }
    return {
        uniforms,
        glsl: /* glsl */ `
            uniform vec3 uAmp;
            uniform vec3 uFreq;
            #define PI 3.14159265358979
            float nsin(float val){ return sin(val) * 0.5 + 0.5; }
            vec3 getDistortion(float progress){
                float movementProgressFix = 0.02;
                return vec3(
                    cos(progress * PI * uFreq.x + uTime) * uAmp.x - cos(movementProgressFix * PI * uFreq.x + uTime) * uAmp.x,
                    nsin(progress * PI * uFreq.y + uTime) * uAmp.y - nsin(movementProgressFix * PI * uFreq.y + uTime) * uAmp.y,
                    nsin(progress * PI * uFreq.z + uTime) * uAmp.z - nsin(movementProgressFix * PI * uFreq.z + uTime) * uAmp.z
                );
            }
        `,
        camera: (progress, time) => {
            const f = uniforms.uFreq.value
            const a = uniforms.uAmp.value
            const fix = 0.02
            const d = new THREE.Vector3(
                Math.cos(progress * Math.PI * f.x + time) * a.x -
                    Math.cos(fix * Math.PI * f.x + time) * a.x,
                nsin(progress * Math.PI * f.y + time) * a.y - nsin(fix * Math.PI * f.y + time) * a.y,
                nsin(progress * Math.PI * f.z + time) * a.z - nsin(fix * Math.PI * f.z + time) * a.z
            )
            return d.multiply(new THREE.Vector3(2, 2, 2)).add(new THREE.Vector3(0, 0, -5))
        },
    }
}

/** Where each vertex shader hands control to the chosen distortion. */
const DISTORTION_INCLUDE = "#include <getDistortion_vertex>"

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const FOG_PARS_VERT = THREE.ShaderChunk["fog_pars_vertex"]
const FOG_VERT = THREE.ShaderChunk["fog_vertex"]
const FOG_PARS_FRAG = THREE.ShaderChunk["fog_pars_fragment"]
const FOG_FRAG = THREE.ShaderChunk["fog_fragment"]

const CAR_LIGHTS_VERTEX = /* glsl */ `
    #define USE_FOG
    ${FOG_PARS_VERT}
    attribute vec3 aOffset;
    attribute vec3 aMetrics;
    attribute vec3 aColor;

    uniform float uTravelLength;
    uniform float uTime;
    uniform float uSpeedScale;

    varying vec2 vUv;
    varying vec3 vColor;
    ${DISTORTION_INCLUDE}

    void main() {
        vec3 transformed = position.xyz;
        float radius = aMetrics.r;
        float trailLength = aMetrics.g;
        float speed = aMetrics.b;

        transformed.xy *= radius;
        transformed.z *= trailLength;

        // Its own length is added back, so a trail is entirely past the far end
        // before the modulo snaps it around to the near end.
        transformed.z += trailLength - mod(uTime * speed * uSpeedScale + aOffset.z, uTravelLength);
        transformed.xy += aOffset.xy;

        float progress = abs(transformed.z / uTravelLength);
        transformed.xyz += getDistortion(progress);

        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
        gl_Position = projectionMatrix * mvPosition;
        vUv = uv;
        vColor = aColor;
        ${FOG_VERT}
    }
`

const CAR_LIGHTS_FRAGMENT = /* glsl */ `
    #define USE_FOG
    ${FOG_PARS_FRAG}
    varying vec3 vColor;
    varying vec2 vUv;
    uniform vec2 uFade;

    void main() {
        vec3 color = vec3(vColor);
        // uFade runs the opposite way for the two carriageways, so a trail
        // always tapers behind its light and never in front of it.
        float alpha = smoothstep(uFade.x, uFade.y, vUv.x);
        gl_FragColor = vec4(color, alpha);
        if (gl_FragColor.a < 0.0001) discard;
        ${FOG_FRAG}
    }
`

const SIDE_STICKS_VERTEX = /* glsl */ `
    #define USE_FOG
    ${FOG_PARS_VERT}
    attribute float aOffset;
    attribute vec3 aColor;
    attribute vec2 aMetrics;

    uniform float uTravelLength;
    uniform float uTime;
    uniform float uSpeedScale;

    varying vec3 vColor;

    mat4 rotationY(in float angle) {
        return mat4(cos(angle), 0, sin(angle), 0,
                    0, 1.0, 0, 0,
                    -sin(angle), 0, cos(angle), 0,
                    0, 0, 0, 1);
    }

    ${DISTORTION_INCLUDE}

    void main(){
        vec3 transformed = position.xyz;
        float stickWidth = aMetrics.x;
        float stickHeight = aMetrics.y;

        transformed.xy *= vec2(stickWidth, stickHeight);
        float travel = mod(uTime * 120. * uSpeedScale + aOffset, uTravelLength);

        // Turned edge-on to the road so the quad reads as a thin post.
        transformed = (rotationY(3.14 / 2.) * vec4(transformed, 1.)).xyz;
        transformed.z += -uTravelLength + travel;

        float progress = abs(transformed.z / uTravelLength);
        transformed.xyz += getDistortion(progress);

        // Lifted by half its height so the post stands on the ground rather
        // than being buried to its middle.
        transformed.y += stickHeight / 2.;
        transformed.x += -stickWidth / 2.;

        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
        gl_Position = projectionMatrix * mvPosition;
        vColor = aColor;
        ${FOG_VERT}
    }
`

const SIDE_STICKS_FRAGMENT = /* glsl */ `
    #define USE_FOG
    ${FOG_PARS_FRAG}
    varying vec3 vColor;
    void main(){
        gl_FragColor = vec4(vec3(vColor), 1.);
        ${FOG_FRAG}
    }
`

const ROAD_VERTEX = /* glsl */ `
    #define USE_FOG
    ${FOG_PARS_VERT}
    uniform float uTime;
    uniform float uTravelLength;
    varying vec2 vUv;
    ${DISTORTION_INCLUDE}

    void main() {
        vec3 transformed = position.xyz;
        // The plane is authored flat and rotated afterwards, so its own Y is the
        // road's depth and the distortion's X/Y land on the plane's X/Z.
        vec3 distortion = getDistortion((transformed.y + uTravelLength / 2.) / uTravelLength);
        transformed.x += distortion.x;
        transformed.z += distortion.y;
        transformed.y += -1. * distortion.z;

        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
        gl_Position = projectionMatrix * mvPosition;
        vUv = uv;
        ${FOG_VERT}
    }
`

const ROAD_MARKINGS_VARS = /* glsl */ `
    uniform float uLanes;
    uniform vec3 uBrokenLinesColor;
    uniform vec3 uShoulderLinesColor;
    uniform float uShoulderLinesWidthPercentage;
    uniform float uBrokenLinesWidthPercentage;
    uniform float uBrokenLinesLengthPercentage;
    uniform float uSpeedScale;
    highp float random(vec2 co) {
        highp float a = 12.9898;
        highp float b = 78.233;
        highp float c = 43758.5453;
        highp float dt = dot(co.xy, vec2(a, b));
        highp float sn = mod(dt, 3.14);
        return fract(sin(sn) * c);
    }
`

const ROAD_MARKINGS_FRAGMENT = /* glsl */ `
    uv.y = mod(uv.y + uTime * 0.1 * uSpeedScale, 1.);
    float brokenLineWidth = 1. / uLanes * uBrokenLinesWidthPercentage;
    float laneEmptySpace = 1. - uBrokenLinesLengthPercentage;

    float brokenLines = step(1. - brokenLineWidth * uLanes, fract(uv.x * uLanes)) * step(laneEmptySpace, fract(uv.y * 100.));
    // The outermost lane has no lane to its right, so its dashes are dropped.
    brokenLines *= step(uv.x * uLanes, uLanes - 1.);
    color = mix(color, uBrokenLinesColor, brokenLines);

    float shoulderLinesWidth = 1. / uLanes * uShoulderLinesWidthPercentage;
    float shoulderLines = step(1. - shoulderLinesWidth, uv.x) + step(uv.x, shoulderLinesWidth);
    color = mix(color, uShoulderLinesColor, shoulderLines);

    // Coarse across the road, very fine along it: asphalt grain, not snow.
    vec2 noiseFreq = vec2(4., 7000.);
    float roadNoise = random(floor(uv * noiseFreq) / noiseFreq) * 0.02 - 0.01;
    color += roadNoise;
`

const ROAD_BASE_FRAGMENT = /* glsl */ `
    #define USE_FOG
    varying vec2 vUv;
    uniform vec3 uColor;
    uniform float uTime;
    #include <roadMarkings_vars>
    ${FOG_PARS_FRAG}
    void main() {
        vec2 uv = vUv;
        vec3 color = vec3(uColor);
        #include <roadMarkings_fragment>
        gl_FragColor = vec4(color, 1.);
        ${FOG_FRAG}
    }
`

const ROAD_FRAGMENT = ROAD_BASE_FRAGMENT.replace(
    "#include <roadMarkings_fragment>",
    ROAD_MARKINGS_FRAGMENT
).replace("#include <roadMarkings_vars>", ROAD_MARKINGS_VARS)

// --- Bloom chain -----------------------------------------------------------

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        // Already in clip space; no camera object is involved.
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const BRIGHT_FRAGMENT = /* glsl */ `
    uniform sampler2D tScene;
    uniform float uThreshold;
    varying vec2 vUv;
    void main() {
        vec4 c = texture2D(tScene, vUv);
        float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
        // Hard knee: the trails are already far brighter than the asphalt, and a
        // soft knee only smears the road's grain into the glow.
        gl_FragColor = vec4(c.rgb * step(uThreshold, luma), 1.0);
    }
`

const BLUR_FRAGMENT = /* glsl */ `
    uniform sampler2D tSource;
    uniform vec2 uDirection;
    varying vec2 vUv;
    void main() {
        // Nine-tap gaussian, separable: two passes cost what one 2D pass would
        // spend on a fifth of the kernel.
        float weights[5];
        weights[0] = 0.2270270270;
        weights[1] = 0.1945945946;
        weights[2] = 0.1216216216;
        weights[3] = 0.0540540541;
        weights[4] = 0.0162162162;
        vec3 sum = texture2D(tSource, vUv).rgb * weights[0];
        for (int i = 1; i < 5; i++) {
            vec2 offset = uDirection * float(i);
            sum += texture2D(tSource, vUv + offset).rgb * weights[i];
            sum += texture2D(tSource, vUv - offset).rgb * weights[i];
        }
        gl_FragColor = vec4(sum, 1.0);
    }
`

const COMPOSITE_FRAGMENT = /* glsl */ `
    uniform sampler2D tScene;
    uniform sampler2D tBloom;
    uniform float uStrength;
    varying vec2 vUv;
    vec3 linearToSRGB(vec3 c) {
        vec3 lo = c * 12.92;
        vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(0.4166666)) - 0.055;
        return mix(lo, hi, step(vec3(0.0031308), c));
    }
    void main() {
        vec4 base = texture2D(tScene, vUv);
        vec3 bloom = texture2D(tBloom, vUv).rgb * uStrength;
        vec3 lit = base.rgb + bloom;
        // Glow spilling into the empty sky has to carry its own alpha, or the
        // halo above the horizon is multiplied away against the frame behind it.
        float alpha = clamp(base.a + max(bloom.r, max(bloom.g, bloom.b)), 0.0, 1.0);
        // A raw ShaderMaterial drawing to the screen gets no colour-space chunk
        // from three, so the encode is done by hand here.
        gl_FragColor = vec4(linearToSRGB(lit), alpha);
    }
`

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

class TrafficWaveScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera: THREE.PerspectiveCamera
    private fog: THREE.Fog
    private fogUniforms: Record<string, THREE.IUniform>

    private distortion!: Distortion
    private uTime = new THREE.Uniform(0)
    private uSpeedScale = new THREE.Uniform(1)
    private uTravelLength = new THREE.Uniform(ROAD_LENGTH)
    private uLeftFade = new THREE.Uniform(new THREE.Vector2(0, 0.6))
    private uRightFade = new THREE.Uniform(new THREE.Vector2(1, 0.4))
    private roadUniforms: Record<string, THREE.IUniform>[] = []

    private meshes: THREE.Mesh[] = []
    private quadCamera = new THREE.Camera()
    private quadScene = new THREE.Scene()
    private quad: THREE.Mesh
    private rtScene: THREE.WebGLRenderTarget
    private rtBlurA: THREE.WebGLRenderTarget
    private rtBlurB: THREE.WebGLRenderTarget
    private brightMat: THREE.ShaderMaterial
    private blurMat: THREE.ShaderMaterial
    private compositeMat: THREE.ShaderMaterial

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private elapsed = 0
    private timeOffset = 0
    private speedUp = 0
    private speedUpTarget = 0
    private fovTarget: number
    private disposed = false
    private lookTarget = new THREE.Vector3()

    private onDown: () => void
    private onUp: () => void

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        // The bloom chain adds four fullscreen passes; 1.5 keeps a retina panel
        // honest without quadrupling the fragment bill.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const canvas = this.renderer.domElement
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.display = "block"
        container.appendChild(canvas)

        this.camera = new THREE.PerspectiveCamera(S.fov, 1, 0.1, 10000)
        this.camera.position.set(0, 8, -5)
        this.fovTarget = S.fov

        // Fog near is a fifth of the corridor and far is well past its end: the
        // road must still be readable at the horizon, only bleached.
        this.fog = new THREE.Fog(new THREE.Color(HAZE), ROAD_LENGTH * 0.2, ROAD_LENGTH * 500)
        this.scene.fog = this.fog
        this.fogUniforms = {
            fogColor: { value: this.fog.color },
            fogNear: { value: this.fog.near },
            fogFar: { value: this.fog.far },
        }

        this.brightMat = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: BRIGHT_FRAGMENT,
            uniforms: { tScene: { value: null }, uThreshold: { value: 0.2 } },
            depthTest: false,
            depthWrite: false,
        })
        this.blurMat = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: BLUR_FRAGMENT,
            uniforms: {
                tSource: { value: null },
                uDirection: { value: new THREE.Vector2() },
            },
            depthTest: false,
            depthWrite: false,
        })
        this.compositeMat = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: COMPOSITE_FRAGMENT,
            uniforms: {
                tScene: { value: null },
                tBloom: { value: null },
                uStrength: { value: S.glow },
            },
            transparent: true,
            depthTest: false,
            depthWrite: false,
        })
        this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.brightMat)
        this.quad.frustumCulled = false
        this.quadScene.add(this.quad)

        const rtOpts = { colorSpace: THREE.LinearSRGBColorSpace }
        this.rtScene = new THREE.WebGLRenderTarget(1, 1, rtOpts)
        // Half resolution: a buffer about to be smeared over nine taps gains
        // nothing from full-res detail and costs four times as much.
        this.rtBlurA = new THREE.WebGLRenderTarget(1, 1, rtOpts)
        this.rtBlurB = new THREE.WebGLRenderTarget(1, 1, rtOpts)

        this.build()

        this.onDown = () => {
            const s = settingsFor(this.cfg)
            this.speedUpTarget = s.boostSpeed
            this.fovTarget = s.boostFov
        }
        this.onUp = () => {
            const s = settingsFor(this.cfg)
            this.speedUpTarget = 0
            this.fovTarget = s.fov
        }
        container.addEventListener("pointerdown", this.onDown)
        container.addEventListener("pointerleave", this.onUp)
        container.addEventListener("pointercancel", this.onUp)
        // On window, so releasing outside the frame still lets off the throttle.
        window.addEventListener("pointerup", this.onUp)
    }

    // --- construction ------------------------------------------------------

    /** Splices the active distortion into a material's vertex shader. */
    private withDistortion(material: THREE.ShaderMaterial) {
        const glsl = this.distortion.glsl
        material.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(DISTORTION_INCLUDE, glsl)
        }
        return material
    }

    private build() {
        const S = settingsFor(this.cfg)
        this.distortion = makeDistortion()
        this.uSpeedScale.value = S.speedScale
        this.uLeftFade.value.set(0, 1 - S.fade)
        this.uRightFade.value.set(1, 0 + S.fade)
        this.roadUniforms = []

        this.buildPlane(S, -1)
        this.buildPlane(S, 1)

        const left = this.buildCarLights(S, this.cfg.leftLights, 60, 80, this.uLeftFade)
        left.position.setX(-S.roadWidth / 2)
        const right = this.buildCarLights(S, this.cfg.rightLights, -120, -160, this.uRightFade)
        right.position.setX(S.roadWidth / 2)
        // A post field per shoulder, each seeded separately: mirroring one set
        // across the road makes the two sides pass the camera in lockstep.
        this.buildSticks(S, -1)
        this.buildSticks(S, 1)
    }

    private add(mesh: THREE.Mesh) {
        // The vertex shader does the placing, so three cannot know where any of
        // this ended up and would cull most of it on the first frame.
        mesh.frustumCulled = false
        this.scene.add(mesh)
        this.meshes.push(mesh)
        return mesh
    }

    private buildCarLights(
        S: ReturnType<typeof settingsFor>,
        palette: string[],
        speedMin: number,
        speedMax: number,
        fade: THREE.Uniform
    ) {
        // A unit-length tube; the shader stretches it to each trail's length.
        const curve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1))
        const base = new THREE.TubeGeometry(curve, 40, 1, 8, false)
        const geometry = new THREE.InstancedBufferGeometry()
        geometry.index = base.index
        geometry.attributes = base.attributes

        const pairs = S.lightPairs
        geometry.instanceCount = pairs * 2

        const laneWidth = S.roadWidth / S.lanes
        const source = palette && palette.length ? palette : DEFAULTS.leftLights
        const colors = source.map((c) => new THREE.Color(c))

        const aOffset: number[] = []
        const aMetrics: number[] = []
        const aColor: number[] = []

        for (let i = 0; i < pairs; i++) {
            const radius = random(0.05, 0.14)
            const trailLength = random(ROAD_LENGTH * 0.05, ROAD_LENGTH * 0.15)
            const speed = random(speedMin, speedMax)

            const lane = i % S.lanes
            // Car width and the drunk-driver shift are both fractions of a lane,
            // so widening the road never walks a car into its neighbour.
            const carWidth = random(0.3, 0.5) * laneWidth
            const laneX =
                lane * laneWidth -
                S.roadWidth / 2 +
                laneWidth / 2 +
                random(-0.2, 0.2) * laneWidth
            const offsetY = random(0.05, 1) + radius * 1.3
            const offsetZ = -random(0, ROAD_LENGTH)

            aOffset.push(laneX - carWidth / 2, offsetY, offsetZ)
            aOffset.push(laneX + carWidth / 2, offsetY, offsetZ)

            aMetrics.push(radius, trailLength, speed)
            aMetrics.push(radius, trailLength, speed)

            // Both lamps of one car share a colour, or the pair reads as two
            // motorcycles rather than one vehicle.
            const color = pickRandom(colors)
            aColor.push(color.r, color.g, color.b)
            aColor.push(color.r, color.g, color.b)
        }

        geometry.setAttribute(
            "aOffset",
            new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 3, false)
        )
        geometry.setAttribute(
            "aMetrics",
            new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 3, false)
        )
        geometry.setAttribute(
            "aColor",
            new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false)
        )

        const material = this.withDistortion(
            new THREE.ShaderMaterial({
                vertexShader: CAR_LIGHTS_VERTEX,
                fragmentShader: CAR_LIGHTS_FRAGMENT,
                transparent: true,
                uniforms: Object.assign(
                    {
                        uTime: this.uTime,
                        uTravelLength: this.uTravelLength,
                        uSpeedScale: this.uSpeedScale,
                        uFade: fade,
                    },
                    this.fogUniforms,
                    this.distortion.uniforms
                ),
            })
        )
        return this.add(new THREE.Mesh(geometry, material))
    }

    /** side: -1 left shoulder, 1 right shoulder. */
    private buildSticks(S: ReturnType<typeof settingsFor>, side: number) {
        const base = new THREE.PlaneGeometry(1, 1)
        const geometry = new THREE.InstancedBufferGeometry()
        geometry.index = base.index
        geometry.attributes = base.attributes

        const total = S.stickCount
        geometry.instanceCount = total
        const spacing = ROAD_LENGTH / (total - 1)
        const color = new THREE.Color(this.cfg.stickColor || DEFAULTS.stickColor)

        const aOffset: number[] = []
        const aColor: number[] = []
        const aMetrics: number[] = []

        for (let i = 0; i < total; i++) {
            // Doubled spacing plus a jitter of one gap: perfectly even posts
            // strobe against the frame rate, and this breaks the rhythm.
            aOffset.push((i - 1) * spacing * 2 + spacing * Math.random())
            aColor.push(color.r, color.g, color.b)
            aMetrics.push(random(0.12, 0.5), random(1.3, 1.7))
        }

        geometry.setAttribute(
            "aOffset",
            new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 1, false)
        )
        geometry.setAttribute(
            "aColor",
            new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false)
        )
        geometry.setAttribute(
            "aMetrics",
            new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 2, false)
        )

        const material = this.withDistortion(
            new THREE.ShaderMaterial({
                vertexShader: SIDE_STICKS_VERTEX,
                fragmentShader: SIDE_STICKS_FRAGMENT,
                // Turned edge-on, so half the time the camera sees its back.
                side: THREE.DoubleSide,
                uniforms: Object.assign(
                    {
                        uTime: this.uTime,
                        uTravelLength: this.uTravelLength,
                        uSpeedScale: this.uSpeedScale,
                    },
                    this.fogUniforms,
                    this.distortion.uniforms
                ),
            })
        )
        const mesh = this.add(new THREE.Mesh(geometry, material))
        // The shader plants each post at `x - width / 2`, which lands outside
        // the left shoulder but just inside the right one; the widest post is
        // 0.5, so that much is given back on the right.
        mesh.position.setX(side < 0 ? -S.roadWidth : S.roadWidth + 0.5)
        return mesh
    }

    /** side: -1 left carriageway, 1 right carriageway. */
    private buildPlane(S: ReturnType<typeof settingsFor>, side: number) {
        // 100 segments down the corridor: the distortion is evaluated per vertex
        // and a coarser plane turns the curve into visible facets.
        const geometry = new THREE.PlaneGeometry(S.roadWidth, ROAD_LENGTH, 20, 100)
        const uniforms: Record<string, THREE.IUniform> = {
            uTravelLength: this.uTravelLength,
            uColor: { value: new THREE.Color(this.cfg.roadColor) },
            uTime: this.uTime,
            uLanes: { value: S.lanes },
            uBrokenLinesColor: { value: new THREE.Color(this.cfg.lineColor) },
            uShoulderLinesColor: { value: new THREE.Color(this.cfg.lineColor) },
            uShoulderLinesWidthPercentage: { value: 0.05 },
            uBrokenLinesLengthPercentage: { value: 0.5 },
            uBrokenLinesWidthPercentage: { value: 0.1 },
            uSpeedScale: this.uSpeedScale,
        }
        this.roadUniforms.push(uniforms)

        const material = this.withDistortion(
            new THREE.ShaderMaterial({
                vertexShader: ROAD_VERTEX,
                fragmentShader: ROAD_FRAGMENT,
                side: THREE.DoubleSide,
                uniforms: Object.assign(uniforms, this.fogUniforms, this.distortion.uniforms),
            })
        )
        const mesh = new THREE.Mesh(geometry, material)
        mesh.rotation.x = -Math.PI / 2
        // Pushed half its own length away, so it starts at the camera's feet.
        mesh.position.z = -ROAD_LENGTH / 2
        // The two carriageways meet on the centre line, with no island between.
        mesh.position.x += (S.roadWidth / 2) * side
        return this.add(mesh)
    }

    private teardown() {
        for (const mesh of this.meshes) {
            this.scene.remove(mesh)
            mesh.geometry.dispose()
            ;(mesh.material as THREE.Material).dispose()
        }
        this.meshes = []
    }

    // --- lifecycle ---------------------------------------------------------

    start() {
        this.lastT = performance.now()
        const tick = () => {
            if (this.disposed) return
            this.step()
            this.frameId = requestAnimationFrame(tick)
        }
        this.frameId = requestAnimationFrame(tick)
    }

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)
        const pr = this.renderer.getPixelRatio()
        const w = Math.max(1, Math.floor(this.width * pr))
        const h = Math.max(1, Math.floor(this.height * pr))
        this.rtScene.setSize(w, h)
        this.rtBlurA.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1))
        this.rtBlurB.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1))
        this.camera.aspect = this.width / this.height
        this.camera.updateProjectionMatrix()
    }

    updateConfig(next: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = next
        const S = settingsFor(next)

        // Only these own buffers or shader source. Dragging a road colour must
        // never reallocate three hundred instanced tubes.
        const rebuild =
            next.roadWidth !== prev.roadWidth ||
            next.lanes !== prev.lanes ||
            next.traffic !== prev.traffic ||
            next.sticks !== prev.sticks ||
            next.stickColor !== prev.stickColor ||
            next.leftLights?.join(",") !== prev.leftLights?.join(",") ||
            next.rightLights?.join(",") !== prev.rightLights?.join(",")

        if (rebuild) {
            this.teardown()
            this.build()
        } else {
            this.uSpeedScale.value = S.speedScale
            this.uLeftFade.value.set(0, 1 - S.fade)
            this.uRightFade.value.set(1, 0 + S.fade)
            for (const u of this.roadUniforms) {
                ;(u.uColor.value as THREE.Color).set(next.roadColor)
                ;(u.uBrokenLinesColor.value as THREE.Color).set(next.lineColor)
                ;(u.uShoulderLinesColor.value as THREE.Color).set(next.lineColor)
            }
        }

        this.compositeMat.uniforms.uStrength.value = S.glow
        // Not eased: a slider drag should land where it was dropped. The easing
        // below exists only for the press-and-hold gesture.
        if (next.fov !== prev.fov && this.speedUpTarget === 0) {
            this.fovTarget = S.fov
            this.camera.fov = S.fov
            this.camera.updateProjectionMatrix()
        }
    }

    private step() {
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A tab returning from the background must not teleport the traffic.
        if (dt > 0.05) dt = 0.05
        this.elapsed += dt

        // The original's frame-rate-independent smoothing constant, kept exactly
        // so the boost ramps in over the same wall-clock time it always did.
        const k = Math.exp(-(-60 * Math.log2(1 - 0.1)) * dt)
        this.speedUp += approach(this.speedUp, this.speedUpTarget, k, 0.00001)
        this.timeOffset += this.speedUp * dt
        // Speeding up shifts the clock rather than the rate, so no light jumps
        // position at the moment the throttle is pressed.
        const time = this.elapsed + this.timeOffset
        this.uTime.value = time

        let updateCamera = false
        const fovChange = approach(this.camera.fov, this.fovTarget, k)
        if (fovChange !== 0) {
            this.camera.fov += fovChange * dt * 6
            updateCamera = true
        }
        if (this.distortion.camera) {
            // 0.025 is a short way down the road: far enough that the camera
            // leads into a curve, near enough that it does not swing wildly.
            const d = this.distortion.camera(0.025, time)
            this.lookTarget.set(
                this.camera.position.x + d.x,
                this.camera.position.y + d.y,
                this.camera.position.z + d.z
            )
            this.camera.lookAt(this.lookTarget)
            updateCamera = true
        }
        if (updateCamera) this.camera.updateProjectionMatrix()

        this.render()
    }

    private render() {
        const r = this.renderer
        r.setRenderTarget(this.rtScene)
        r.clear()
        r.render(this.scene, this.camera)

        const strength = this.compositeMat.uniforms.uStrength.value as number
        if (strength > 0.001) {
            this.quad.material = this.brightMat
            this.brightMat.uniforms.tScene.value = this.rtScene.texture
            r.setRenderTarget(this.rtBlurA)
            r.render(this.quadScene, this.quadCamera)

            const stepX = 1.5 / this.rtBlurA.width
            const stepY = 1.5 / this.rtBlurA.height

            this.quad.material = this.blurMat
            this.blurMat.uniforms.tSource.value = this.rtBlurA.texture
            ;(this.blurMat.uniforms.uDirection.value as THREE.Vector2).set(stepX, 0)
            r.setRenderTarget(this.rtBlurB)
            r.render(this.quadScene, this.quadCamera)

            this.blurMat.uniforms.tSource.value = this.rtBlurB.texture
            ;(this.blurMat.uniforms.uDirection.value as THREE.Vector2).set(0, stepY)
            r.setRenderTarget(this.rtBlurA)
            r.render(this.quadScene, this.quadCamera)
        }

        this.quad.material = this.compositeMat
        this.compositeMat.uniforms.tScene.value = this.rtScene.texture
        this.compositeMat.uniforms.tBloom.value = this.rtBlurA.texture
        r.setRenderTarget(null)
        r.clear()
        r.render(this.quadScene, this.quadCamera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.container.removeEventListener("pointerdown", this.onDown)
        this.container.removeEventListener("pointerleave", this.onUp)
        this.container.removeEventListener("pointercancel", this.onUp)
        window.removeEventListener("pointerup", this.onUp)
        this.teardown()
        this.quad.geometry.dispose()
        this.brightMat.dispose()
        this.blurMat.dispose()
        this.compositeMat.dispose()
        this.rtScene.dispose()
        this.rtBlurA.dispose()
        this.rtBlurB.dispose()
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        if (canvas.parentNode === this.container) this.container.removeChild(canvas)
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface TrafficWaveProps {
    leftLights?: string[]
    rightLights?: string[]
    stickColor?: string
    roadColor?: string
    lineColor?: string
    roadWidth?: number
    lanes?: number
    traffic?: number
    sticks?: number
    speed?: number
    trailFade?: number
    glow?: number
    fov?: number
    boostOn?: boolean
    boost?: { amount?: number; fov?: number }
    style?: React.CSSProperties
}

function __BaseImpl_TrafficWave(props: TrafficWaveProps) {
    const {
        leftLights = ["#FF102A","#EB383E","#FF102A"],
        rightLights = ["#DADAFA","#BEBAE3","#8F97E4"],
        stickColor = DEFAULTS.stickColor,
        roadColor = DEFAULTS.roadColor,
        lineColor = DEFAULTS.lineColor,
        roadWidth = DEFAULTS.roadWidth,
        lanes = DEFAULTS.lanes,
        traffic = DEFAULTS.traffic,
        sticks = DEFAULTS.sticks,
        speed = DEFAULTS.speed,
        trailFade = DEFAULTS.trailFade,
        glow = DEFAULTS.glow,
        fov = DEFAULTS.fov,
        boostOn = DEFAULTS.boostOn,
        boost,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<TrafficWaveScene | null>(null)
    const cfgRef = useRef<Config>(null as any)

    cfgRef.current = {
        leftLights,
        rightLights,
        stickColor,
        roadColor,
        lineColor,
        roadWidth,
        lanes,
        traffic,
        sticks,
        speed,
        trailFade,
        glow,
        fov,
        boostOn,
        boost,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: TrafficWaveScene
        try {
            scene = new TrafficWaveScene(container, cfgRef.current)
        } catch {
            // No WebGL — leave an empty frame rather than throwing on the canvas.
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
        sceneRef.current?.updateConfig(cfgRef.current)
    }, [
        leftLights?.join?.(","),
        rightLights?.join?.(","),
        stickColor,
        roadColor,
        lineColor,
        roadWidth,
        lanes,
        traffic,
        sticks,
        speed,
        trailFade,
        glow,
        fov,
        boostOn,
        boost?.amount,
        boost?.fov,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A night highway seen from a moving car, streaked with head and tail lights"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                cursor: boostOn ? "pointer" : "default",
                ...style,
            }}
        />
    )
}

TrafficWave.displayName = "Traffic Wave"

const __presetProps = {
  "stickColor": "#DADAFA",
  "roadColor": "#080808",
  "lineColor": "#D3D3DE",
  "lanes": 4,
  "roadWidth": 20,
  "traffic": 20,
  "sticks": 20,
  "speed": 8,
  "trailFade": 0,
  "glow": 10,
  "fov": 160,
  "boostOn": true
};

export default function TrafficWave(props: Record<string, unknown>) {
  return <__BaseImpl_TrafficWave {...(__presetProps as Record<string, unknown>)} {...props} />;
}
