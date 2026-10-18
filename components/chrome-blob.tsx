"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Chrome Blob — a bead of liquid metal that reaches for the pointer, swallows
 * its own satellites, and splits apart when clicked.
 *
 * The body is a signed distance field raymarched in a fullscreen quad: a
 * handful of spheres joined by a smooth minimum, which is what lets two of them
 * merge with a neck rather than intersect as two balls. Real geometry cannot do
 * that without rebuilding a mesh every frame.
 *
 * The blend radius of that smooth minimum is the single most important number
 * here — small is water pulling apart into beads, large is treacle that never
 * separates at all.
 *
 * Because the field is blended it is no longer a true distance, so the march
 * steps a fraction of what the field reports. Marching the full distance
 * overshoots at every neck and punches holes straight through the metal.
 */

/** Must match the shader's loop bound, or raising the panel silently caps. */
const MAX_BLOBS = 7

/** How far the camera sits from the field; the shader marches to match. */
const CAM_Z = 3.2

const DEFAULTS = {
    metal: "#FFFFFF",
    glow: "#FFFFFF",
    satellites: 12,
    viscosity: 11,
    reach: 20,
    grip: 20,
    burst: 10,
    shine: 20,
    speed: 20,
    direction: "right" as const,
    transition: {"ease":[0.3,1,0.4,1],"mass":1,"type":"tween","delay":0.5,"damping":60,"duration":1,"stiffness":800},
    sizePercent: 100,
}

type Config = {
    metal: string
    glow: string
    satellites: number
    viscosity: number
    reach: number
    grip: number
    burst: number
    shine: number
    speed: number
    direction: "right" | "left"
    transition: any
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        // One is the core; the rest orbit it.
        blobs: Math.round(2 + clamp(cfg.satellites, 1, 20, 9) * 0.25),
        // Blend radius of the smooth minimum: small is water, large treacle.
        viscosity: 0.06 + clamp(cfg.viscosity, 1, 20, 11) * 0.032,
        // How far the satellites swing from the core.
        reach: 0.28 + clamp(cfg.reach, 1, 20, 12) * 0.032,
        // Per-second rate at which the core chases the pointer. Low is heavy
        // mercury lagging behind; high is glued to the cursor.
        grip: 1.5 + clamp(cfg.grip, 1, 20, 10) * 0.7,
        burst: clamp(cfg.burst, 0, 20, 12) * 0.055,
        shine: clamp(cfg.shine, 0, 20, 13) / 20,
        speed: clamp(cfg.speed, 0, 20, 6) * 0.11,
        heading: cfg.direction === "left" ? -1 : 1,
        zoom: 100 / clamp(cfg.sizePercent, 20, 200, 90),
    }
}

/**
 * Samples a Framer Transition by hand — a raw canvas has no motion runtime.
 * Newton's method inverts x(t); springs borrow the default curve.
 */
function makeEaseFn(transition: any) {
    const duration =
        typeof transition?.duration === "number" && isFinite(transition.duration)
            ? Math.max(0.08, transition.duration)
            : 0.8
    const delay =
        typeof transition?.delay === "number" && isFinite(transition.delay)
            ? Math.max(0, transition.delay)
            : 0.5
    const raw =
        Array.isArray(transition?.ease) && transition.ease.length === 4
            ? transition.ease
            : [0.3, 1, 0.4, 1]
    const [x1, y1, x2, y2] = raw.map((n: any) =>
        typeof n === "number" && isFinite(n) ? n : 0
    )
    const bez = (a: number, b: number, t: number) => {
        const u = 1 - t
        return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t
    }
    const dbez = (a: number, b: number, t: number) => {
        const u = 1 - t
        return 3 * u * u * a + 6 * u * t * (b - a) + 3 * t * t * (1 - b)
    }
    return {
        duration,
        delay,
        ease: (t: number) => {
            const x = Math.max(0, Math.min(1, t))
            let g = x
            for (let i = 0; i < 5; i++) {
                const err = bez(x1, x2, g) - x
                const d = dbez(x1, x2, g)
                if (Math.abs(d) < 1e-5) break
                g -= err / d
            }
            return bez(y1, y2, Math.max(0, Math.min(1, g)))
        },
    }
}

const QUAD_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    // Already in clip space; no camera object is involved.
    gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`

const BLOB_FRAGMENT = /* glsl */ `
#define MAX_BLOBS ${MAX_BLOBS}
#define CAM_Z ${CAM_Z}

precision highp float;

uniform vec2 uResolution;
uniform vec3 uMetal;
uniform vec3 uGlow;
uniform vec4 uBlobs[ MAX_BLOBS ];
uniform float uCount;
uniform float uBlend;
uniform float uShine;
uniform float uZoom;

varying vec2 vUv;

/**
 * Polynomial smooth minimum. The correction term is what builds the neck
 * between two nearly touching blobs; a plain min() leaves them intersecting as
 * two hard spheres with a visible crease.
 */
float smin( float a, float b, float k ) {
    float h = clamp( 0.5 + 0.5 * ( b - a ) / k, 0.0, 1.0 );
    return mix( b, a, h ) - k * h * ( 1.0 - h );
}

float field( vec3 p ) {
    float d = 1e5;
    for ( int i = 0; i < MAX_BLOBS; i++ ) {
        if ( float( i ) < uCount ) {
            vec4 b = uBlobs[ i ];
            d = smin( d, length( p - b.xyz ) - b.w, uBlend );
        }
    }
    return d;
}

/** Central differences: six field evaluations, and worth every one of them. */
vec3 fieldNormal( vec3 p ) {
    vec2 e = vec2( 0.0015, 0.0 );
    return normalize( vec3(
        field( p + e.xyy ) - field( p - e.xyy ),
        field( p + e.yxy ) - field( p - e.yxy ),
        field( p + e.yyx ) - field( p - e.yyx )
    ) );
}

/**
 * The world the metal reflects. There is no environment map here, so the sky
 * is a function: a bright band overhead, a darker ground, and one hot spot for
 * the specular to catch. A constant colour reflects as nothing at all and the
 * blob comes out looking like matte clay.
 */
vec3 sky( vec3 dir ) {
    float up = dir.y * 0.5 + 0.5;
    vec3 col = mix( vec3( 0.05, 0.06, 0.09 ), vec3( 0.55, 0.62, 0.75 ), pow( up, 1.6 ) );
    col += vec3( 1.0 ) * pow( max( dot( dir, normalize( vec3( -0.4, 0.75, 0.5 ) ) ), 0.0 ), 26.0 ) * 1.4;
    col += vec3( 0.35, 0.5, 0.7 ) * pow( max( dot( dir, normalize( vec3( 0.7, -0.3, 0.4 ) ) ), 0.0 ), 8.0 ) * 0.5;
    return col;
}

void main() {
    float aspect = uResolution.x / max( uResolution.y, 1.0 );
    vec2 p = ( vUv - 0.5 ) * uZoom;
    p.x *= aspect;

    vec3 ro = vec3( 0.0, 0.0, CAM_Z );
    vec3 rd = normalize( vec3( p, -1.4 ) );

    float t = 0.0;
    float hit = 0.0;
    for ( int i = 0; i < 72; i++ ) {
        vec3 pos = ro + rd * t;
        float d = field( pos );
        if ( d < 0.0016 ) { hit = 1.0; break; }
        // The blended field is no longer a true distance, so the step is short
        // of what it reports — a full step overshoots at every neck.
        t += d * 0.85;
        if ( t > 7.0 ) break;
    }

    if ( hit < 0.5 ) {
        gl_FragColor = vec4( 0.0 );
        return;
    }

    vec3 pos = ro + rd * t;
    vec3 n = fieldNormal( pos );
    vec3 v = -rd;
    float facing = max( dot( n, v ), 0.0 );

    vec3 refl = reflect( rd, n );
    vec3 col = sky( refl ) * uMetal;

    // Fresnel at a fixed exponent, scaled by the panel: chrome goes almost
    // perfectly mirrored at grazing angles whatever its body colour.
    float fres = pow( 1.0 - facing, 5.0 );
    col = mix( col * 0.55, sky( refl ) * 1.3, 0.35 + fres * 0.65 );
    col += uGlow * fres * 0.5;

    float spec = pow( max( dot( n, normalize( normalize( vec3( -0.4, 0.75, 0.5 ) ) + v ) ), 0.0 ), 140.0 );
    col += vec3( 1.0 ) * spec * 2.4 * uShine;

    float a = clamp( 0.55 + fres * 0.5 + spec, 0.0, 1.0 );
    // Premultiplied: the silhouette stays clean over whatever the frame holds.
    gl_FragColor = vec4( col * a, a );
}
`

type Blob = {
    /** Where it actually is; it chases its orbit rather than sitting on it. */
    pos: THREE.Vector3
    radius: number
    phase: number
    /** Per-blob response rate, so the body trails out unevenly when yanked. */
    lag: number
}

class BlobScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry: THREE.PlaneGeometry
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private blobs: Blob[] = []
    private core = new THREE.Vector3(0, 0, 0)
    private coreVel = new THREE.Vector3(0, 0, 0)
    private coreTarget = new THREE.Vector3(0, 0, 0)
    private orbit = new THREE.Vector3(0, 0, 0)
    private splitT = -1

    private clockT = 0
    private width = 0
    private height = 0
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        // Raymarching with six extra field evaluations for the normal: the
        // pixel ratio is capped well below the display's.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.cursor = "pointer"
        el.style.touchAction = "none"
        container.appendChild(el)

        const S = settingsFor(cfg)
        this.geometry = new THREE.PlaneGeometry(2, 2)
        this.material = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: BLOB_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uMetal: { value: new THREE.Color(cfg.metal || "#DCE6F2") },
                uGlow: { value: new THREE.Color(cfg.glow || "#7FE3FF") },
                uBlobs: {
                    value: Array.from(
                        { length: MAX_BLOBS },
                        () => new THREE.Vector4(0, 0, 0, 0)
                    ),
                },
                uCount: { value: S.blobs },
                uBlend: { value: S.viscosity },
                uShine: { value: S.shine },
                uZoom: { value: S.zoom },
            },
            transparent: true,
            depthTest: false,
            depthWrite: false,
        })
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        this.buildBlobs(cfg)
        this.bindEvents()
    }

    private buildBlobs(cfg: Config) {
        const S = settingsFor(cfg)
        this.blobs = []
        for (let i = 0; i < S.blobs; i++) {
            // Deterministic phases, so every instance on a canvas moves alike.
            const phase = (i * 2.399) % (Math.PI * 2)
            this.blobs.push({
                pos: new THREE.Vector3(),
                // The first is the core and the rest are satellites; a set of
                // equal blobs reads as a cluster rather than as one body.
                radius: i === 0 ? 0.42 : 0.13 + ((i * 37) % 11) * 0.012,
                phase,
                // Spread across the set, so a yank draws the body out into a
                // ragged tail rather than sliding every bead over as one rigid
                // arrangement.
                lag: 0.45 + ((i * 53) % 7) * 0.16,
            })
        }
    }

    /** Pointer in the same space the shader marches in. */
    private toField(e: PointerEvent): THREE.Vector2 | null {
        const rect = this.renderer.domElement.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return null
        const S = settingsFor(this.cfg)
        const aspect = rect.width / rect.height
        const u = (e.clientX - rect.left) / rect.width
        // uv is bottom-up and the page is top-down.
        const v = 1 - (e.clientY - rect.top) / rect.height
        // The ray's spread at the plane the blob lives on: without this factor
        // the metal lands somewhere other than the cursor.
        const k = CAM_Z / 1.4
        return new THREE.Vector2(
            (u - 0.5) * S.zoom * aspect * k,
            (v - 0.5) * S.zoom * k
        )
    }

    private bindEvents() {
        const el = this.renderer.domElement
        const move = (e: PointerEvent) => {
            const p = this.toField(e)
            if (p) this.coreTarget.set(p.x, p.y, 0)
        }
        const down = () => {
            // Ignored while a split is already running. Restarting the timer
            // mid-flight snapped the beads back to the body and threw them out
            // again from wherever they happened to be, so a second click made
            // the metal jump rather than doing nothing.
            if (this.splitT >= 0) return
            if (settingsFor(this.cfg).burst <= 0) return
            this.splitT = 0
        }
        const leave = () => {
            // Sent home, so an untouched instance settles in the middle.
            this.coreTarget.set(0, 0, 0)
        }
        el.addEventListener("pointermove", move)
        el.addEventListener("pointerdown", down)
        el.addEventListener("pointerleave", leave)
        el.addEventListener("pointercancel", leave)
        this.unbind = () => {
            el.removeEventListener("pointermove", move)
            el.removeEventListener("pointerdown", down)
            el.removeEventListener("pointerleave", leave)
            el.removeEventListener("pointercancel", leave)
        }
    }

    private unbind = () => {}

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
        this.width = width
        this.height = height
        this.renderer.setSize(width, height, false)
        const dpr = this.renderer.getPixelRatio()
        ;(this.material.uniforms.uResolution.value as THREE.Vector2).set(
            width * dpr,
            height * dpr
        )
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.material.uniforms
        ;(u.uMetal.value as THREE.Color).set(cfg.metal || "#DCE6F2")
        ;(u.uGlow.value as THREE.Color).set(cfg.glow || "#7FE3FF")
        u.uCount.value = S.blobs
        u.uBlend.value = S.viscosity
        u.uShine.value = S.shine
        u.uZoom.value = S.zoom
        // Only the count owns the blob list.
        if (S.blobs !== settingsFor(prev).blobs) this.buildBlobs(cfg)
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        this.clockT += dt
        const S = settingsFor(this.cfg)
        const timing = makeEaseFn(this.cfg.transition)

        // The core is sprung, not eased. A plain lerp always trails the
        // pointer by the same fraction and never overshoots, so the body slides
        // about without ever looking pulled; a spring builds momentum on the
        // way and swings past on arrival, which is what reads as weight.
        // Damping is tied to the stiffness so the response stays near critical
        // whatever Follow is set to — under-damping it at low Follow left the
        // blob bouncing for seconds after every move.
        const stiffness = S.grip * S.grip * 1.6
        const damping = 2.0 * Math.sqrt(stiffness) * 0.85
        this.coreVel.addScaledVector(
            this.orbit.subVectors(this.coreTarget, this.core),
            stiffness * dt
        )
        this.coreVel.multiplyScalar(Math.exp(-damping * dt))
        this.core.addScaledVector(this.coreVel, dt)

        // The split runs out and back on one timeline: the satellites are
        // flung off the core and then drawn in again.
        let split = 0
        if (this.splitT >= 0) {
            this.splitT += dt
            const out = timing.duration
            if (this.splitT <= out) {
                split = timing.ease(this.splitT / out)
            } else if (this.splitT <= out + timing.delay) {
                split = 1
            } else if (this.splitT <= out * 2 + timing.delay) {
                split = 1 - timing.ease((this.splitT - out - timing.delay) / out)
            } else {
                this.splitT = -1
            }
        }

        const uBlobs = this.material.uniforms.uBlobs.value as THREE.Vector4[]
        for (let i = 0; i < MAX_BLOBS; i++) {
            if (i >= this.blobs.length) {
                uBlobs[i].set(0, 0, 0, 0)
                continue
            }
            const b = this.blobs[i]
            if (i === 0) {
                b.pos.copy(this.core)
                uBlobs[i].set(this.core.x, this.core.y, 0, b.radius)
                continue
            }
            // Satellites ride a slow orbit that never repeats exactly, because
            // the two rates are irrational multiples of each other.
            const a = this.clockT * S.speed * S.heading + b.phase
            const swing = S.reach * (0.7 + 0.3 * Math.sin(this.clockT * 0.7 + b.phase))
            const push = 1 + split * S.burst * (6 + (i % 3))
            this.orbit.set(
                this.core.x + Math.cos(a) * swing * push,
                this.core.y + Math.sin(a * 1.31 + b.phase) * swing * push,
                Math.sin(a * 0.77) * swing * 0.5
            )
            // Each satellite *chases* its place in the orbit rather than being
            // written into it. That single change is what makes a drag pull the
            // body: the beads fall behind the core, the smooth minimum stretches
            // the necks between them, and the whole thing draws out into a tail
            // that catches up once the pointer stops. Writing the orbit position
            // straight in moves every bead in lockstep and the blob only ever
            // slides across the frame.
            b.pos.lerp(this.orbit, 1 - Math.exp(-dt * S.grip * b.lag))
            uBlobs[i].set(
                b.pos.x,
                b.pos.y,
                b.pos.z,
                // Thinned as it is flung or stretched away from the core, so a
                // trailing bead reads as drawn-out metal rather than as a copy
                // of the body that happens to be somewhere else.
                b.radius *
                    (1 - split * 0.35) *
                    (1 - Math.min(0.4, b.pos.distanceTo(this.core) * 0.25))
            )
        }

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.unbind()
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface ChromeBlobProps {
    /** @default "#FFFFFF" */
    metal?: string
    /** @default "#FFFFFF" */
    glow?: string
    /** How many smaller beads orbit and merge with the core. @default 12 */
    satellites?: number
    /** 1 is water snapping into beads; 20 is treacle that never parts. @default 11 */
    viscosity?: number
    /** How far the satellites swing from the body. @default 20 */
    reach?: number
    /** 1 lags heavily behind the pointer; 20 is glued to it. @default 20 */
    grip?: number
    /** 0 ignores clicks; 20 flings the beads right off the body. @default 10 */
    burst?: number
    /** @default 20 */
    shine?: number
    /** @default 20 */
    speed?: number
    /** @default "right" */
    direction?: "right" | "left"
    /** The delay is how long it stays apart before merging back. */
    transition?: any
    /** @default 100 */
    sizePercent?: number
    style?: React.CSSProperties
}

export default function ChromeBlob(props: ChromeBlobProps) {
    const {
        metal = DEFAULTS.metal,
        glow = DEFAULTS.glow,
        satellites = DEFAULTS.satellites,
        viscosity = DEFAULTS.viscosity,
        reach = DEFAULTS.reach,
        grip = DEFAULTS.grip,
        burst = DEFAULTS.burst,
        shine = DEFAULTS.shine,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction,
        transition = DEFAULTS.transition,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<BlobScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        metal,
        glow,
        satellites,
        viscosity,
        reach,
        grip,
        burst,
        shine,
        speed,
        direction,
        transition,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: BlobScene
        try {
            scene = new BlobScene(container, cfgRef.current)
        } catch {
            // No WebGL — an empty frame beats a thrown render.
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
        metal,
        glow,
        satellites,
        viscosity,
        reach,
        grip,
        burst,
        shine,
        speed,
        direction,
        transition,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Liquid metal blob that follows the pointer"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 180,
                minHeight: 180,
                overflow: "hidden",
                ...style,
            }}
        />
    )
}

ChromeBlob.displayName = "Chrome Blob"
