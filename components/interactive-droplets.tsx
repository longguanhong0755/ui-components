"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Interactive Droplets — a chain of oily water beads that runs after the
 * pointer and fuses back into itself when it catches up.
 *
 * Mechanism: a fullscreen quad raymarches a signed distance field made of one
 * sphere per trail node, blended with an exponential smooth-minimum. The
 * surface colour is not lit — it is two tinted samples of 3D value noise read
 * along the reflected ray, one drifting with time and one against it, then
 * raised to a high power. That last crush is what makes it read as wet: it
 * throws almost the whole range to black and leaves only the few directions
 * where both noise fields agree as bright films on the bead.
 *
 * Sprites or instanced meshes cannot do this: the join between two droplets is
 * the whole point, and only a distance field has a surface *between* the
 * spheres for the normal — and therefore the reflection — to bend across.
 *
 * The trail is chased with a per-second ease rather than the original's
 * shift-one-slot-per-frame, which ran shorter on a 120 Hz display than on 60.
 */

// The uniform array and the shader loop must agree; the panel maximum for
// Trail is this same number. Raising one without the others silently caps.
const MAX_TRAIL = 20

// How long the pointer must sit still before the idle drift takes the lead.
const IDLE_AFTER = 0.6

const DEFAULTS = {
    droplet: "#968BA1",
    sheen: "#BFBFC5",
    trail: 20,
    dropSize: 5,
    merge: 5,
    lag: 10,
    idleOn: true,
    idle: {
        defaultValue: {"speed":8,"spread":10}, speed: 8, spread: 10 },
    restOn: true,
    rest: {
        defaultValue: {"x":50,"y":50,"size":9}, x: 74, y: 62, size: 14 },
    shimmer: 20,
    glow: 2,
    contrast: 20,
    sizePercent: 173,
}

type IdleCfg = { speed: number; spread: number }
type RestCfg = { x: number; y: number; size: number }

type Config = {
    droplet: string
    sheen: string
    trail: number
    dropSize: number
    merge: number
    lag: number
    idleOn: boolean
    idle: IdleCfg
    restOn: boolean
    rest: RestCfg
    shimmer: number
    glow: number
    contrast: number
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the field wants the real ones. */
function settingsFor(cfg: Config) {
    const idle = cfg.idle ?? DEFAULTS.idle
    const rest = cfg.rest ?? DEFAULTS.rest
    return {
        count: clamp(cfg.trail, 1, MAX_TRAIL, DEFAULTS.trail),
        // Radius of the head bead in screen halves; every later node steps
        // down linearly to a fraction of it, which is what makes the chain
        // taper instead of reading as a sausage of equal balls.
        head: 0.03 + clamp(cfg.dropSize, 1, 20, DEFAULTS.dropSize) * 0.0075,
        // Reversed: the exponent is the *sharpness* of the smooth minimum, so
        // a low k is the gooey end. The panel should read the way it looks.
        blend: 2 + (21 - clamp(cfg.merge, 1, 20, DEFAULTS.merge)) * 0.6,
        // Per second. The head gets twice the grip so the chain stretches out
        // on a fast flick and closes up again when the pointer stops.
        lagRate: 2 + clamp(cfg.lag, 1, 20, DEFAULTS.lag) * 1.2,
        shimmer: clamp(cfg.shimmer, 0, 20, DEFAULTS.shimmer) * 0.05,
        // The panel keeps only the top half of the old range: below this the
        // crush left the beads almost unlit, so 1 starts where 11 used to be.
        intensity: (10 + clamp(cfg.glow, 1, 10, DEFAULTS.glow)) * 0.19,
        // 12 lands on 7.0, the exponent the original effect was tuned at.
        contrast: 1 + clamp(cfg.contrast, 1, 20, DEFAULTS.contrast) * 0.5,
        idleRate: clamp(idle.speed, 1, 20, DEFAULTS.idle.speed) * 0.09,
        idleSpread: clamp(idle.spread, 1, 20, DEFAULTS.idle.spread) * 0.055,
        restRadius: 0.15 + clamp(rest.size, 1, 20, DEFAULTS.rest.size) * 0.0285,
        restX: clamp(rest.x, 0, 100, DEFAULTS.rest.x) / 50 - 1,
        restY: 1 - clamp(rest.y, 0, 100, DEFAULTS.rest.y) / 50,
        zoom: 100 / clamp(cfg.sizePercent, 20, 300, DEFAULTS.sizePercent),
    }
}

const DROPLET_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    // Already in clip space; no camera object is involved.
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const DROPLET_FRAGMENT = /* glsl */ `
precision highp float;

#define MAX_TRAIL ${MAX_TRAIL}
#define EPS 1e-4

// Noise cells per unit of reflected direction. Pinned at the top of its useful
// range: anything lower spreads one cell across most of a bead, and the film
// reads as a few flat painted patches rather than as a reflection.
#define DETAIL 5.0

varying vec2 vUv;

uniform float uTime;
uniform vec2 uAspect;
uniform float uZoom;
uniform vec2 uTrail[MAX_TRAIL];
uniform float uCount;
uniform float uHead;
uniform float uBlend;
uniform float uRestOn;
uniform vec2 uRestPos;
uniform float uRestRadius;
uniform vec3 uDroplet;
uniform vec3 uSheen;
uniform float uIntensity;
uniform float uContrast;

float rnd3D(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453123);
}

float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    // Quintic, not the usual smoothstep cubic. The cubic's second derivative
    // jumps at every cell boundary, and on a surface this glossy that shows up
    // as the square creases quilted across each bead.
    vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

    float a000 = rnd3D(i);
    float a100 = rnd3D(i + vec3(1.0, 0.0, 0.0));
    float a010 = rnd3D(i + vec3(0.0, 1.0, 0.0));
    float a110 = rnd3D(i + vec3(1.0, 1.0, 0.0));
    float a001 = rnd3D(i + vec3(0.0, 0.0, 1.0));
    float a101 = rnd3D(i + vec3(1.0, 0.0, 1.0));
    float a011 = rnd3D(i + vec3(0.0, 1.0, 1.0));
    float a111 = rnd3D(i + vec3(1.0, 1.0, 1.0));

    return mix(
        mix(mix(a000, a100, u.x), mix(a010, a110, u.x), u.y),
        mix(mix(a001, a101, u.x), mix(a011, a111, u.x), u.y),
        u.z
    );
}

// Exponential smooth minimum. Unlike the polynomial one it takes any number of
// terms in a row without the joins fighting each other, which is what lets a
// long trail fuse into a single skin instead of a string of lumps.
float smoothMin(float d1, float d2, float k) {
    return -log(exp(-k * d1) + exp(-k * d2)) / k;
}

float sdSphere(vec3 p, vec3 centre, float r) {
    return length(p - centre) - r;
}

float map(vec3 p) {
    float d = 1e5;

    for (int i = 0; i < MAX_TRAIL; i++) {
        if (float(i) >= uCount) break;
        float fi = float(i);
        // Beads shrink toward the tail so the chain reads as one thing being
        // dragged, not as a queue of identical balls.
        float r = uHead * (uCount - fi) / uCount;
        vec3 centre = vec3(uTrail[i] * uAspect * uZoom, 0.0);
        d = smoothMin(d, sdSphere(p, centre, r), uBlend);
    }

    if (uRestOn > 0.5) {
        vec3 centre = vec3(uRestPos * uAspect * uZoom, 0.0);
        d = smoothMin(d, sdSphere(p, centre, uRestRadius), uBlend);
    }

    return d;
}

vec3 generateNormal(vec3 p) {
    return normalize(vec3(
        map(p + vec3(EPS, 0.0, 0.0)) - map(p + vec3(-EPS, 0.0, 0.0)),
        map(p + vec3(0.0, EPS, 0.0)) - map(p + vec3(0.0, -EPS, 0.0)),
        map(p + vec3(0.0, 0.0, EPS)) - map(p + vec3(0.0, 0.0, -EPS))
    ));
}

vec3 dropletColor(vec3 normal, vec3 rayDir) {
    vec3 reflectDir = reflect(rayDir, normal);

    // Two noise fields sliding opposite ways along the reflection. One alone
    // just crawls; counter-drift is what makes the film look like it is being
    // stretched over a moving surface.
    float noisePos = noise3D(reflectDir * DETAIL + uTime);
    float noiseNeg = noise3D(reflectDir * DETAIL - uTime);

    return (uDroplet * noisePos + uSheen * noiseNeg) * uIntensity;
}

void main() {
    vec2 p = (vUv * 2.0 - 1.0) * uAspect * uZoom;

    // Orthographic: every ray shares one direction, so the beads keep their
    // circular silhouette wherever they sit in the frame.
    vec3 rayDir = vec3(0.0, 0.0, -1.0);
    vec3 ray = vec3(p, 1.0);

    float dist = 1e5;
    for (int i = 0; i < 32; i++) {
        dist = map(ray);
        // The smooth minimum is not a true distance near a join, so a full
        // step overshoots and punches holes through the neck between beads.
        ray += rayDir * dist * 0.9;
        if (dist < EPS) break;
        if (ray.z < -2.0) break;
    }

    // The march ends on a hard hit or a miss; widening the last distance into
    // a ramp is what gives the silhouette an edge instead of a staircase.
    float a = 1.0 - smoothstep(0.0, 0.006 * uZoom, dist);
    if (a <= 0.0) discard;

    vec3 col = pow(dropletColor(generateNormal(ray), rayDir), vec3(uContrast));

    gl_FragColor = vec4(col * a, a);
}
`

class DropletScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry: THREE.PlaneGeometry
    private material: THREE.ShaderMaterial
    private uniforms: Record<string, THREE.IUniform>
    private trail: THREE.Vector2[]
    private target = new THREE.Vector2(0, 0)
    private width = 1
    private height = 1
    private time = 0
    private idleFor = IDLE_AFTER
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        })
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const canvas = this.renderer.domElement
        canvas.style.cssText =
            "position:absolute;inset:0;width:100%;height:100%;display:block"
        container.appendChild(canvas)

        const S = settingsFor(cfg)
        this.trail = Array.from(
            { length: MAX_TRAIL },
            () => new THREE.Vector2(0, 0)
        )

        this.uniforms = {
            uTime: { value: 0 },
            uAspect: { value: new THREE.Vector2(1, 1) },
            uZoom: { value: S.zoom },
            uTrail: { value: this.trail },
            uCount: { value: S.count },
            uHead: { value: S.head },
            uBlend: { value: S.blend },
            uRestOn: { value: cfg.restOn ? 1 : 0 },
            uRestPos: { value: new THREE.Vector2(S.restX, S.restY) },
            uRestRadius: { value: S.restRadius },
            uDroplet: { value: new THREE.Color(cfg.droplet) },
            uSheen: { value: new THREE.Color(cfg.sheen) },
            uIntensity: { value: S.intensity },
            uContrast: { value: S.contrast },
        }

        this.geometry = new THREE.PlaneGeometry(2, 2)
        this.material = new THREE.ShaderMaterial({
            vertexShader: DROPLET_VERTEX,
            fragmentShader: DROPLET_FRAGMENT,
            uniforms: this.uniforms,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        })
        const quad = new THREE.Mesh(this.geometry, this.material)
        quad.frustumCulled = false
        this.scene.add(quad)

        window.addEventListener("pointermove", this.onPointerMove)
    }

    private onPointerMove = (e: PointerEvent) => {
        if (this.disposed) return
        const r = this.container.getBoundingClientRect()
        if (r.width <= 0 || r.height <= 0) return
        // Normalised against the component's own box, not the page, so the
        // beads land under the cursor wherever the frame sits on the canvas.
        this.target.set(
            ((e.clientX - r.left) / r.width) * 2 - 1,
            -((e.clientY - r.top) / r.height) * 2 + 1
        )
        this.idleFor = 0
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            this.frameId = requestAnimationFrame(loop)
            this.step()
        }
        this.frameId = requestAnimationFrame(loop)
    }

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        // Raymarching with a six-tap normal is expensive per pixel; 1.5 keeps
        // the edges clean without paying for a full retina buffer.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
        this.renderer.setSize(this.width, this.height, false)
        const m = Math.min(this.width, this.height)
        this.uniforms.uAspect.value.set(this.width / m, this.height / m)
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)
        this.uniforms.uZoom.value = S.zoom
        this.uniforms.uCount.value = S.count
        this.uniforms.uHead.value = S.head
        this.uniforms.uBlend.value = S.blend
        this.uniforms.uRestOn.value = cfg.restOn ? 1 : 0
        this.uniforms.uRestPos.value.set(S.restX, S.restY)
        this.uniforms.uRestRadius.value = S.restRadius
        this.uniforms.uDroplet.value.set(cfg.droplet)
        this.uniforms.uSheen.value.set(cfg.sheen)
        this.uniforms.uIntensity.value = S.intensity
        this.uniforms.uContrast.value = S.contrast
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.shimmer
        this.idleFor += dt

        let tx = this.target.x
        let ty = this.target.y
        if (this.cfg.idleOn && this.idleFor > IDLE_AFTER) {
            // A pair of unrelated frequencies, so the wander never repeats a
            // visible lap the way a circle would.
            const t = now / 1000
            tx += Math.sin(t * S.idleRate * 1.7) * S.idleSpread * 1.3
            ty += Math.sin(t * S.idleRate * 1.1 + 1.3) * S.idleSpread
        }

        const head = 1 - Math.exp(-dt * S.lagRate * 2)
        const body = 1 - Math.exp(-dt * S.lagRate)
        this.trail[0].x += (tx - this.trail[0].x) * head
        this.trail[0].y += (ty - this.trail[0].y) * head
        for (let i = 1; i < MAX_TRAIL; i++) {
            this.trail[i].lerp(this.trail[i - 1], body)
        }

        this.uniforms.uTime.value = this.time
        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        window.removeEventListener("pointermove", this.onPointerMove)
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    }
}

export interface InteractiveDropletsProps {
    droplet?: string
    sheen?: string
    trail?: number
    dropSize?: number
    merge?: number
    lag?: number
    idleOn?: boolean
    idle?: IdleCfg
    restOn?: boolean
    rest?: RestCfg
    shimmer?: number
    glow?: number
    contrast?: number
    sizePercent?: number
    style?: React.CSSProperties
}

export default function InteractiveDroplets(props: InteractiveDropletsProps) {
    const {
        droplet = DEFAULTS.droplet,
        sheen = DEFAULTS.sheen,
        trail = DEFAULTS.trail,
        dropSize = DEFAULTS.dropSize,
        merge = DEFAULTS.merge,
        lag = DEFAULTS.lag,
        idleOn = DEFAULTS.idleOn,
        idle = { speed: 8, spread: 10 },
        restOn = DEFAULTS.restOn,
        rest = { x: 74, y: 62, size: 14 },
        shimmer = DEFAULTS.shimmer,
        glow = DEFAULTS.glow,
        contrast = DEFAULTS.contrast,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<DropletScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        droplet,
        sheen,
        trail,
        dropSize,
        merge,
        lag,
        idleOn,
        idle,
        restOn,
        rest,
        shimmer,
        glow,
        contrast,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: DropletScene
        try {
            scene = new DropletScene(container, cfgRef.current)
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
        droplet,
        sheen,
        trail,
        dropSize,
        merge,
        lag,
        idleOn,
        idle?.speed,
        idle?.spread,
        restOn,
        rest?.x,
        rest?.y,
        rest?.size,
        shimmer,
        glow,
        contrast,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Liquid droplets that follow the pointer"
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

InteractiveDroplets.displayName = "Interactive Droplets"
