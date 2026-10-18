"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Silk Waves — a lit surface of travelling waves, not a coloured field.
 *
 * The whole difference between this and a gradient is that there is a surface
 * here. A height is summed from layered travelling waves, a normal is taken
 * from it, and the frame is then lit: a soft body, a tight highlight along the
 * crests, and a rim where the surface turns away. Colour alone has no crests —
 * it has light and dark places, which is why a ramp run through noise always
 * reads as something printed rather than something present.
 *
 * The normal is exact. Every layer is a sine of a dot product, and the slope of
 * a sine is a cosine, so the gradient falls out of the same loop that builds the
 * height for the cost of one extra multiply. Taking it by sampling the height a
 * pixel either side is the usual way and it is visibly worse: the highlight is
 * the derivative of the surface, so any stair-stepping in the difference lands
 * in the one place the eye is looking.
 *
 * Directions are spread by the golden angle. Spread evenly instead, the layers
 * share axes and the sum comes out as a plaid; spread randomly, some pair always
 * lands close enough to beat against each other and leave a slow throb across
 * the frame.
 *
 * The highlight is a spike plus a bloom — the same term at a high power and at a
 * low one. One falloff cannot be both a sharp glint and a glow around it, and a
 * crest without the glow reads as a scratch on glass.
 *
 * The specular goes on untinted and the colour comes from a ramp walked in
 * Oklab. A straight mix of two sRGB values passes through whatever lies between
 * them numerically, which for a navy and a rose is a dead mauve — and on a
 * surface this smooth it lies right across the middle of the frame.
 */

/*
 * The key light, in view space. Fixed to the frame rather than to the surface,
 * so the highlight stays where a light would be while the waves travel under
 * it. Moved with the surface it looks painted on.
 */
const KEY = [-0.42, 0.58, 0.7]

/*
 * How fast the swell follows the cursor, per second. Water carries a
 * disturbance late and keeps it a moment after the cause has moved on.
 */
const CURSOR_FOLLOW = 4.0

/** The loop bound in the shader. The panel maximum must not exceed it. */
const MAX_LAYERS = 7

const DEFAULTS = {
    trough: "#19E3FF",
    body: "#00117C",
    crest: "#E6A8FF",
    scale: 1,
    layers: 5,
    steep: 20,
    gloss: 7,
    sheen: 20,
    speed: 20,
    ripple: 12,
    reach: 20,
}

type Config = {
    trough: string
    body: string
    crest: string
    scale: number
    layers: number
    steep: number
    gloss: number
    sheen: number
    speed: number
    ripple: number
    reach: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/**
 * Linear-light RGB to Oklab. Framer hands colours over as sRGB and three
 * converts them to linear light on the way into a Color, which is what these
 * coefficients expect.
 */
function toOklab(hex: string, fallback: string): THREE.Vector3 {
    const c = new THREE.Color(hex || fallback)
    const l = Math.cbrt(0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b)
    const m = Math.cbrt(0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b)
    const s = Math.cbrt(0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b)
    return new THREE.Vector3(
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    )
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        // Waves across the frame's short side. Squared, because the difference
        // between two and four reads and the one between twenty and thirty
        // does not.
        scale: 1.4 + Math.pow(clamp(cfg.scale, 1, 20, DEFAULTS.scale), 1.6) * 0.11,
        // The loop bound in the shader is this same constant; raising the panel
        // maximum without raising it there is a silent cap.
        layers: clamp(cfg.layers, 1, MAX_LAYERS, DEFAULTS.layers),
        /*
         * How far the normal is tipped by the slope. This is the only thing
         * standing between a sheet of silk and a sea, and it is the control to
         * reach for first.
         */
        steep: 0.06 + clamp(cfg.steep, 1, 20, DEFAULTS.steep) * 0.028,
        /*
         * The specular exponent, and it runs the other way to the panel. A
         * tighter highlight is the glossier surface physically, but it covers
         * less of the frame and so reads as less shine, not more — so the
         * slider is wired to what it looks like. Raised rather than scaled,
         * because the useful range runs over five doublings.
         */
        shine: Math.pow(2.0, 3.0 + (21 - clamp(cfg.gloss, 1, 20, DEFAULTS.gloss)) * 0.28),
        // How much light the highlight actually carries.
        sheen: clamp(cfg.sheen, 0, 20, DEFAULTS.sheen) * 0.075,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.11,
        // The height of the swell the cursor drags along under the surface.
        ripple: clamp(cfg.ripple, 0, 20, DEFAULTS.ripple) * 0.05,
        // A share of the frame's short side, so the swell keeps its proportion.
        reach: 0.07 + clamp(cfg.reach, 1, 20, DEFAULTS.reach) * 0.025,
    }
}

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        // Already in clip space; no camera object is involved.
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const SILK_FRAGMENT = /* glsl */ `
    precision highp float;

    #define MAX_LAYERS ${MAX_LAYERS}
    // The angle between one layer's heading and the next. Irrational, so no two
    // of them ever line up however many are added.
    #define GOLDEN 2.39996323

    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uHold;
    uniform float uTime;
    uniform vec3 uTrough;
    uniform vec3 uBody;
    uniform vec3 uCrest;
    uniform vec3 uKey;
    uniform float uScale;
    uniform float uCount;
    uniform float uSteep;
    uniform float uShine;
    uniform float uSheen;
    uniform float uRipple;
    uniform float uReach;

    varying vec2 vUv;

    /** Oklab back to linear-light RGB, once, at the end. */
    vec3 rgbFromOklab(vec3 lab) {
        float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
        float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
        float s = lab.x - 0.0894841775 * lab.y - 1.291485548 * lab.z;
        l = l * l * l;
        m = m * m * m;
        s = s * s * s;
        return vec3(
            4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
        );
    }

    void main() {
        // The short side, so the swell keeps its proportion in any frame shape.
        float unit = min(uResolution.x, uResolution.y);
        vec2 p = (vUv * uResolution - uResolution * 0.5) / unit;

        float height = 0.0;
        vec2 slope = vec2(0.0);
        float amp = 1.0;
        float freq = uScale;
        float norm = 0.0;

        // Loop bounds must be constant; the count is compared inside instead.
        for (int i = 0; i < MAX_LAYERS; i++) {
            if (float(i) < uCount) {
                float fi = float(i);
                /*
                 * Headings a golden angle apart. Spread evenly they share axes
                 * and the sum comes out a plaid; spread at random, some pair
                 * always lands close enough to beat and leave a slow throb.
                 */
                float a = fi * GOLDEN;
                vec2 dir = vec2(cos(a), sin(a));

                float phase = dot(p, dir) * freq + uTime * (0.7 + fi * 0.31);
                height += sin(phase) * amp;
                /*
                 * The slope of a sine is its cosine, so the exact gradient
                 * costs one multiply inside the loop that was building the
                 * height anyway. Sampled a pixel either side instead, the
                 * stair-stepping lands in the highlight, which is the one place
                 * the eye is looking.
                 */
                slope += dir * cos(phase) * amp * freq;
                norm += amp;

                // Each layer half the height and near twice the frequency. Not
                // exactly twice, or the layers keep meeting at the same places.
                amp *= 0.55;
                freq *= 1.93;
            }
        }

        height /= max(norm, 0.0001);
        slope /= max(norm, 0.0001);

        // The swell the cursor drags along under the surface.
        vec2 rel = p - (uPointer - uResolution * 0.5) / unit;
        float dist = length(rel);
        float env = exp(-(dist * dist) / (uReach * uReach)) * uHold;
        float ring = dist * uScale * 1.6 - uTime * 2.2;
        height += sin(ring) * env * uRipple;
        /*
         * Only the carrier's own slope, not the envelope's. The envelope is
         * wide next to the wavelength, so its contribution is small — and
         * leaving it out keeps the swell from carrying a false shading edge
         * around its rim.
         */
        slope += (rel / max(dist, 0.0001)) * cos(ring) * uScale * 1.6 * env * uRipple;

        // The surface normal, tipped by the slope.
        vec3 n = normalize(vec3(-slope * uSteep, 1.0));
        vec3 view = vec3(0.0, 0.0, 1.0);
        vec3 halfway = normalize(uKey + view);

        // Wrapped rather than clipped, so the far side of a crest falls into
        // shade instead of into black.
        float body = dot(n, uKey) * 0.5 + 0.5;
        float sp = max(dot(n, halfway), 0.0);
        /*
         * A spike and a bloom, the same term at a high power and a low one. One
         * falloff cannot be both a sharp glint and the glow around it, and a
         * crest with only the spike reads as a scratch on glass.
         */
        float glint = pow(sp, uShine) + pow(sp, uShine * 0.16) * 0.14;
        float rim = pow(1.0 - max(dot(n, view), 0.0), 4.0);

        /*
         * The ramp is walked by the height and the light together, so the
         * troughs sit deep and the lit faces climb toward the crest colour
         * rather than the whole sheet shifting as one.
         */
        float t = clamp(mix(height * 0.5 + 0.5, body, 0.45), 0.0, 1.0);
        vec3 lab = t < 0.5
            ? mix(uTrough, uBody, t * 2.0)
            : mix(uBody, uCrest, t * 2.0 - 1.0);
        vec3 col = rgbFromOklab(lab);

        // The rim takes the crest colour; the highlight takes none. A tinted
        // specular is a coloured surface, not a lit one.
        col = mix(col, rgbFromOklab(uCrest), rim * 0.35);
        col += glint * uSheen;

        gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
`

class SilkScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private target = new THREE.Vector2(0, 0)
    private eased = new THREE.Vector2(0, 0)
    private hold = 0
    private wantHold = 0
    private time = 0

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.touchAction = "none"
        container.appendChild(el)

        const key = new THREE.Vector3(KEY[0], KEY[1], KEY[2]).normalize()

        this.material = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: SILK_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uPointer: { value: new THREE.Vector2(0, 0) },
                uHold: { value: 0 },
                uTime: { value: 0 },
                uTrough: { value: toOklab(cfg.trough, DEFAULTS.trough) },
                uBody: { value: toOklab(cfg.body, DEFAULTS.body) },
                uCrest: { value: toOklab(cfg.crest, DEFAULTS.crest) },
                uKey: { value: key },
                uScale: { value: S.scale },
                uCount: { value: S.layers },
                uSteep: { value: S.steep },
                uShine: { value: S.shine },
                uSheen: { value: S.sheen },
                uRipple: { value: S.ripple },
                uReach: { value: S.reach },
            },
            depthTest: false,
            depthWrite: false,
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        el.addEventListener("pointermove", this.onPointerMove)
        el.addEventListener("pointerdown", this.onPointerMove)
        el.addEventListener("pointerleave", this.onPointerLeave)
        el.addEventListener("pointercancel", this.onPointerLeave)
    }

    private onPointerMove = (e: PointerEvent) => {
        const rect = this.renderer.domElement.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return
        // The shader works in device pixels, so the pointer arrives in them too.
        const x = ((e.clientX - rect.left) / rect.width) * this.width
        const y = (1 - (e.clientY - rect.top) / rect.height) * this.height
        this.target.set(x, y)
        if (this.wantHold === 0) this.eased.copy(this.target)
        this.wantHold = 1
    }

    private onPointerLeave = () => {
        this.wantHold = 0
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            this.frameId = requestAnimationFrame(loop)
            this.step()
        }
        loop()
    }

    setSize(width: number, height: number) {
        if (this.disposed || width <= 0 || height <= 0) return
        this.renderer.setSize(width, height, false)
        const dpr = this.renderer.getPixelRatio()
        this.width = width * dpr
        this.height = height * dpr
        this.material.uniforms.uResolution.value.set(this.width, this.height)
        if (this.wantHold === 0) {
            this.target.set(this.width * 0.5, this.height * 0.5)
            this.eased.copy(this.target)
        }
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const u = this.material.uniforms
        u.uTrough.value.copy(toOklab(cfg.trough, DEFAULTS.trough))
        u.uBody.value.copy(toOklab(cfg.body, DEFAULTS.body))
        u.uCrest.value.copy(toOklab(cfg.crest, DEFAULTS.crest))
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A returning tab must not run the swell through a dozen crests.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.speed
        this.eased.lerp(this.target, 1 - Math.exp(-dt * CURSOR_FOLLOW))
        this.hold += (this.wantHold - this.hold) * (1 - Math.exp(-dt * 3))

        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uPointer.value.copy(this.eased)
        u.uHold.value = this.hold
        // Everything is a share of the frame, so none of it needs the ratio.
        u.uScale.value = S.scale
        u.uCount.value = S.layers
        u.uSteep.value = S.steep
        u.uShine.value = S.shine
        u.uSheen.value = S.sheen
        u.uRipple.value = S.ripple
        u.uReach.value = S.reach

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        const el = this.renderer.domElement
        el.removeEventListener("pointermove", this.onPointerMove)
        el.removeEventListener("pointerdown", this.onPointerMove)
        el.removeEventListener("pointerleave", this.onPointerLeave)
        el.removeEventListener("pointercancel", this.onPointerLeave)
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface SilkWavesProps {
    /** The deep, in the hollows between crests. */
    trough?: string
    /** The surface itself, which is most of the frame. */
    body?: string
    /** The lit faces, and the rim where the surface turns away. */
    crest?: string
    /** 1 is one long swell across the frame; 20 is a fine chop. */
    scale?: number
    /** 1 is a single travelling wave; each one after adds a finer set crossing it. */
    layers?: number
    /** 1 is a flat sheet catching light; 20 is a sea. The first thing to reach for. */
    steep?: number
    /** 1 is a hard pinpoint glint on each crest; 20 opens it into a broad wet sheen. */
    gloss?: number
    /** How much light the crests actually carry. 0 leaves the surface unlit. */
    sheen?: number
    /** 0 holds the swell where it stands. */
    speed?: number
    /** 0 ignores the cursor; 20 drags a deep ring of waves along under it. */
    ripple?: number
    /** How wide the swell around the cursor spreads. */
    reach?: number
    style?: React.CSSProperties
}

export default function SilkWaves(props: SilkWavesProps) {
    const {
        trough = DEFAULTS.trough,
        body = DEFAULTS.body,
        crest = DEFAULTS.crest,
        scale = DEFAULTS.scale,
        layers = DEFAULTS.layers,
        steep = DEFAULTS.steep,
        gloss = DEFAULTS.gloss,
        sheen = DEFAULTS.sheen,
        speed = DEFAULTS.speed,
        ripple = DEFAULTS.ripple,
        reach = DEFAULTS.reach,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<SilkScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        trough,
        body,
        crest,
        scale,
        layers,
        steep,
        gloss,
        sheen,
        speed,
        ripple,
        reach,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: SilkScene
        try {
            scene = new SilkScene(container, cfgRef.current)
        } catch {
            // No WebGL — render an empty frame rather than throwing.
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
        trough,
        body,
        crest,
        scale,
        layers,
        steep,
        gloss,
        sheen,
        speed,
        ripple,
        reach,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A lit surface of travelling waves, swelling under the pointer"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                ...style,
            }}
        />
    )
}

SilkWaves.displayName = "Silk Waves"
