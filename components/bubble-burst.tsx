"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Bubble Burst — a soap-film bubble that tears open where it is clicked. The
 * hole runs out from that point, its edge burning bright as the film retracts,
 * and the whole thing draws itself back together again.
 *
 * The burst is a **tear front**, not a fade. A hole opens at the struck point
 * and its boundary sweeps outward as an angular threshold, with the film simply
 * discarded behind it. Fading the shell out uniformly reads as the bubble
 * becoming a ghost, which is the one thing a bursting bubble never does: it
 * stays fully bright and stops existing, from one point outward.
 *
 * All the water the swallowed film used to hold is pulled into the retreating
 * edge, so that edge runs thick and bright — that lip is the entire visual
 * event of a burst. An earlier version also spawned hundreds of instanced
 * droplets riding the rim; at any size large enough to catch a highlight they
 * overlapped into a grey mass, and at any size small enough not to they were a
 * scatter of specks. The lip alone does the job the debris was there for.
 *
 * The film's colour is interference — thickness divided by how square-on the
 * surface is to the eye — so the bands crowd into the rim and crawl as it turns
 * rather than sitting on it like paint. Thickness is drained downward by
 * gravity, which is why the crown runs thin and nearly colourless, exactly as a
 * real bubble does in the moment before it goes.
 */

const PERSPECTIVE = 0.15

/** A press that travels less than this is a click, not a drag. */
const DRAG_SLOP = 5

/** Finite-difference step for the rebuilt normal, in sphere radii. */
const NORMAL_EPS = 0.03

/**
 * Three the panel used to own. Thickness and drain set where the interference
 * bands land and how hard gravity pulls the film down the sphere; the body term
 * is how much of the film shows away from the rim. Each has one setting that
 * reads as a soap bubble and a wide range either side that does not.
 */
const FILM_THICKNESS = 1.9
const FILM_DRAIN = 0.6
const FILM_BODY = 0.04

const DEFAULTS = {
    tint: "#FFFFFF",
    sheen: "#00BBFF",
    iridescence: 20,
    rim: 1,
    gloss: 20,
    wobble: 20,
    lip: 20,
    ragged: 20,
    transition: {"ease":[0.4,0,0.5,1],"mass":1,"type":"tween","delay":0.35,"damping":60,"duration":1.16,"stiffness":800},
    speed: 4,
    direction: "left",
    dragSensitivity: 5,
    sizePercent: 85,
}

type Config = {
    tint: string
    sheen: string
    iridescence: number
    rim: number
    gloss: number
    wobble: number
    lip: number
    ragged: number
    transition: any
    speed: number
    direction: "right" | "left"
    dragSensitivity: number
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        iridescence: clamp(cfg.iridescence, 0, 20, 13) * 0.09,
        rim: 0.2 + clamp(cfg.rim, 1, 20, 12) * 0.09,
        // Specular exponent. Big steps, because the gap between a soft sheen
        // and a wet window is two orders of magnitude of exponent.
        gloss: 60 + clamp(cfg.gloss, 1, 20, 14) * 34,
        wobble: clamp(cfg.wobble, 0, 20, 7) * 0.006,
        // Angular width of the bright edge, in radians — how much film has
        // been gathered into the retreating rim.
        lip: 0.05 + clamp(cfg.lip, 1, 20, 12) * 0.022,
        // How far the tear's edge wanders off a circle, in radians.
        ragged: clamp(cfg.ragged, 0, 20, 12) * 0.035,
        spin: clamp(cfg.speed, 0, 20, 4) * 0.09,
        heading: cfg.direction === "left" ? -1 : 1,
        drag: clamp(cfg.dragSensitivity, 1, 10, 3) * 0.007,
    }
}

/**
 * Samples a Framer Transition by hand — a raw canvas has no motion runtime.
 * Newton's method inverts x(t) of the cubic bézier; a spring has no closed form
 * here, so it borrows the default curve rather than pretending to be a spring.
 */
function makeEaseFn(transition: any): {
    duration: number
    delay: number
    ease: (t: number) => number
} {
    const duration =
        typeof transition?.duration === "number" && isFinite(transition.duration)
            ? Math.max(0.08, transition.duration)
            : 1.1
    const delay =
        typeof transition?.delay === "number" && isFinite(transition.delay)
            ? Math.max(0, transition.delay)
            : 0.35
    const raw =
        Array.isArray(transition?.ease) && transition.ease.length === 4
            ? transition.ease
            : [0.4, 0, 0.5, 1]
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

const SHELL_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uWobble;

varying vec3 vLocal;
varying vec3 vNormalV;
varying vec3 vViewV;

/** The film's own slow breathing, as a displacement along the radius. */
float skin( vec3 dir ) {
    return uWobble * (
        sin( dir.x * 3.1 + uTime * 0.9 ) +
        sin( dir.y * 2.4 - uTime * 0.7 ) +
        sin( dir.z * 3.7 + uTime * 1.1 )
    );
}

void main() {
    vec3 dir = normalize( position );
    float h = skin( dir );

    // The normal is rebuilt from two tangent samples of the same field.
    // Displacing without this leaves the sphere's own normals in place, and on
    // a surface this reflective the shading and the shape visibly disagree.
    vec3 ref = abs( dir.y ) < 0.9 ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
    vec3 t1 = normalize( cross( ref, dir ) );
    vec3 t2 = cross( dir, t1 );
    vec3 d1 = normalize( dir + t1 * ${NORMAL_EPS} );
    vec3 d2 = normalize( dir + t2 * ${NORMAL_EPS} );
    vec3 p0 = dir * ( 1.0 + h );
    vec3 p1 = d1 * ( 1.0 + skin( d1 ) );
    vec3 p2 = d2 * ( 1.0 + skin( d2 ) );
    vec3 n = normalize( cross( p1 - p0, p2 - p0 ) );
    if ( dot( n, dir ) < 0.0 ) n = -n;

    vLocal = dir;
    vNormalV = normalize( normalMatrix * n );
    vec4 mv = modelViewMatrix * vec4( p0, 1.0 );
    vViewV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
}
`

const SHELL_FRAGMENT = /* glsl */ `
uniform vec3 uTint;
uniform vec3 uSheen;
uniform float uIrid;
uniform float uRim;
uniform float uGloss;
uniform float uTime;

uniform vec3 uTearDir;
uniform float uTear;
uniform float uRagged;
uniform float uLip;

varying vec3 vLocal;
varying vec3 vNormalV;
varying vec3 vViewV;

const vec3 KEY = vec3( -0.45, 0.65, 0.8 );
const vec3 FILL = vec3( 0.72, -0.3, 0.6 );
const float THICKNESS = ${FILM_THICKNESS};
const float DRAIN = ${FILM_DRAIN};
const float BODY = ${FILM_BODY};

float hash31( vec3 p ) {
    return fract( sin( dot( p, vec3( 127.1, 311.7, 74.7 ) ) ) * 43758.5453123 );
}

float noise3( vec3 p ) {
    vec3 i = floor( p );
    vec3 f = fract( p );
    vec3 u = f * f * ( 3.0 - 2.0 * f );
    return mix(
        mix(
            mix( hash31( i ), hash31( i + vec3( 1.0, 0.0, 0.0 ) ), u.x ),
            mix( hash31( i + vec3( 0.0, 1.0, 0.0 ) ), hash31( i + vec3( 1.0, 1.0, 0.0 ) ), u.x ),
            u.y
        ),
        mix(
            mix( hash31( i + vec3( 0.0, 0.0, 1.0 ) ), hash31( i + vec3( 1.0, 0.0, 1.0 ) ), u.x ),
            mix( hash31( i + vec3( 0.0, 1.0, 1.0 ) ), hash31( i + vec3( 1.0, 1.0, 1.0 ) ), u.x ),
            u.y
        ),
        u.z
    );
}

/** Three cosines a third of a turn apart: a full spectrum in three instructions. */
vec3 interference( float path ) {
    return 0.5 + 0.5 * cos( 6.28318 * ( path + vec3( 0.0, 0.33, 0.67 ) ) );
}

void main() {
    // --- the hole ---------------------------------------------------------

    // Angular distance from the point that was struck; the film inside this
    // radius has already been drawn into the retreating edge.
    float away = acos( clamp( dot( normalize( vLocal ), uTearDir ), -1.0, 1.0 ) );
    // The edge wanders on two scales, so the hole is torn rather than cut. One
    // octave alone gives a smooth oval and the burst reads as a wipe.
    float wander = ( noise3( vLocal * 5.0 ) - 0.5 ) * uRagged
                 + ( noise3( vLocal * 14.0 ) - 0.5 ) * uRagged * 0.45;
    // The front has to finish past the far pole by more than the wander can
    // pull it back, or the film survives in patches on the far side and the
    // bubble never fully pops. The two noise terms swing by at most
    // uRagged * ( 0.5 + 0.45 * 0.5 ), so the sweep is widened by that much
    // plus a margin. A fixed 3.30 was short of it at high raggedness, which is
    // why the burst only sometimes completed.
    float span = 3.14159 + uRagged * 0.75 + 0.12;
    float front = uTear * span + wander;
    if ( away < front ) discard;

    // The lip: all the water the swallowed film used to hold, gathered into the
    // edge. A hard core with a wider halo behind it — one falloff cannot be
    // both a sharp bright line and a glow around it.
    float lipT = step( 0.001, uTear );
    float core = smoothstep( front + uLip * 0.35, front, away ) * lipT;
    float halo = smoothstep( front + uLip * 1.6, front, away ) * lipT;

    // --- the film ---------------------------------------------------------

    vec3 n = normalize( vNormalV );
    // Both walls are drawn, and the far one has to be turned round or the back
    // of the film shades as a flat silhouette.
    if ( !gl_FrontFacing ) n = -n;
    vec3 v = normalize( vViewV );
    float facing = max( dot( n, v ), 0.0 );

    // Gravity drains the film downward: the crown runs thin and colourless,
    // the base pools thick, with a slow marble through the middle.
    float pull = 0.5 - vLocal.y * 0.5;
    float t = THICKNESS * ( 1.0 + pull * DRAIN + noise3( vLocal * 2.0 + uTime * 0.12 ) * 0.5 );
    // Path length grows as the surface turns away from the eye, which is what
    // crowds the bands into the rim.
    float path = t / max( 0.25, facing );
    vec3 film = interference( path * uIrid );
    vec3 col = mix( uTint, film * uTint * 2.0, 0.75 );

    // Schlick, exponent fixed and the panel scaling the term: an adjustable
    // exponent runs from no edge at all to nothing but edge in two steps.
    float f = pow( 1.0 - facing, 5.0 );
    float rim = clamp( f * uRim * 3.0, 0.0, 1.0 );
    // A second, far tighter ring on the silhouette — the hard outline a heavy
    // glass bubble carries, which the broad fresnel alone never gives.
    float outline = pow( 1.0 - facing, 22.0 ) * 1.7;
    col += uSheen * ( rim * 0.5 + outline );

    // Three lobes: a pinpoint window, the wet highlight under it, and a broad
    // sheen. All in view space, so they hold still while the bubble turns —
    // fixed to the model they turn with it and it reads as painted.
    vec3 hKey = normalize( normalize( KEY ) + v );
    vec3 hFill = normalize( normalize( FILL ) + v );
    float spec = pow( max( dot( n, hKey ), 0.0 ), uGloss ) * 2.0
               + pow( max( dot( n, hKey ), 0.0 ), uGloss * 0.15 ) * 0.5
               + pow( max( dot( n, hFill ), 0.0 ), uGloss * 0.22 ) * 0.35;
    col += uSheen * spec;

    // The bright crescents a glass bubble shows just inside its own edge:
    // light that has crossed the far wall. Gated by a coarse noise, so there
    // are two or three of them rather than one continuous band.
    float arcs = exp( -pow( ( facing - 0.34 ) / 0.05, 2.0 ) )
               * smoothstep( 0.45, 0.72, noise3( vLocal * 1.7 + 3.1 ) );
    col += uSheen * arcs * 1.1;

    col += uSheen * ( core * 2.4 + halo * 0.5 );

    float a = BODY + rim * 0.8 + outline * 0.9 + clamp( spec, 0.0, 1.0 ) * 0.75
            + arcs * 0.55 + core * 1.2 + halo * 0.25;
    // The far wall is dimmed, so the near side of the film reads in front of
    // it instead of the two averaging into one grey shell.
    a *= gl_FrontFacing ? 1.0 : 0.55;

    a = clamp( a, 0.0, 1.0 );
    // Premultiplied over additive blending: near wall and far wall compound at
    // the rim instead of one hiding the other, and the middle stays clear over
    // whatever the frame is filled with.
    gl_FragColor = vec4( col * a, a );
}
`

type Phase = "whole" | "burst" | "hold" | "reform"

class BubbleScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)
    private group = new THREE.Group()
    private ball = new THREE.Group()

    private shellGeometry: THREE.BufferGeometry
    private shellMaterial: THREE.ShaderMaterial
    private shell: THREE.Mesh

    private raycaster = new THREE.Raycaster()
    private pointer = new THREE.Vector2()
    private tearDir = new THREE.Vector3(0, 1, 0)
    private up = new THREE.Vector3(0, 1, 0)

    private phase: Phase = "whole"
    private phaseT = 0
    /** 0 is a whole bubble, 1 is a hole that has swallowed all of it. */
    private tear = 0

    private clockT = 0
    private spinAngle = 0
    private dragX = 0
    private dragY = 0
    private velX = 0
    private velY = 0
    private isDragging = false
    private lastX = 0
    private lastY = 0
    private downX = 0
    private downY = 0

    private width = 0
    private height = 0
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
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

        // Dense: the tear's edge is decided per fragment, but the wobble is per
        // vertex, and a coarse sphere shows its facets on a surface this shiny.
        this.shellGeometry = new THREE.IcosahedronGeometry(1, 6)
        this.shellMaterial = new THREE.ShaderMaterial({
            vertexShader: SHELL_VERTEX,
            fragmentShader: SHELL_FRAGMENT,
            uniforms: {
                uTint: { value: new THREE.Color(cfg.tint || "#BFE9FF") },
                uSheen: { value: new THREE.Color(cfg.sheen || "#FFFFFF") },
                uIrid: { value: S.iridescence },
                uRim: { value: S.rim },
                uGloss: { value: S.gloss },
                uWobble: { value: S.wobble },
                uTime: { value: 0 },
                uTearDir: { value: new THREE.Vector3(0, 1, 0) },
                uTear: { value: 0 },
                uRagged: { value: S.ragged },
                uLip: { value: S.lip },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false,
        })
        this.shell = new THREE.Mesh(this.shellGeometry, this.shellMaterial)
        this.ball.add(this.shell)

        this.group.add(this.ball)
        this.scene.add(this.group)

        this.bindEvents()
    }

    /** Where on the film the pointer struck, in the bubble's own frame. */
    private hitDirection(e: PointerEvent): THREE.Vector3 | null {
        const rect = this.renderer.domElement.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return null
        this.pointer.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        )
        this.raycaster.setFromCamera(this.pointer, this.camera)
        const hit = this.raycaster.intersectObject(this.shell, false)[0]
        if (!hit) return null
        // World to object, so the hole stays on the film as the bubble turns
        // rather than sitting still in front of the camera.
        return this.shell.worldToLocal(hit.point.clone()).normalize()
    }

    private burst(at: THREE.Vector3 | null) {
        if (this.phase !== "whole") return
        // Struck off the bubble entirely — it goes at the crown, where the
        // drain has left the film thinnest, which is where a real one goes.
        this.tearDir.copy(at ?? this.up).normalize()
        ;(this.shellMaterial.uniforms.uTearDir.value as THREE.Vector3).copy(this.tearDir)
        this.phase = "burst"
        this.phaseT = 0
    }

    private bindEvents() {
        const el = this.renderer.domElement
        const down = (e: PointerEvent) => {
            this.isDragging = true
            this.lastX = e.clientX
            this.lastY = e.clientY
            this.downX = e.clientX
            this.downY = e.clientY
            this.velX = 0
            this.velY = 0
            el.style.cursor = "grabbing"
        }
        const move = (e: PointerEvent) => {
            if (!this.isDragging) return
            const dx = e.clientX - this.lastX
            const dy = e.clientY - this.lastY
            this.lastX = e.clientX
            this.lastY = e.clientY
            const S = settingsFor(this.cfg)
            this.dragY += dx * S.drag
            this.dragX += dy * S.drag
            this.velY = dx * S.drag
            this.velX = dy * S.drag
        }
        const up = (e: PointerEvent) => {
            if (!this.isDragging) return
            this.isDragging = false
            el.style.cursor = "pointer"
            const travel = Math.hypot(e.clientX - this.downX, e.clientY - this.downY)
            if (travel <= DRAG_SLOP) this.burst(this.hitDirection(e))
        }
        const cancel = () => {
            this.isDragging = false
            el.style.cursor = "pointer"
        }
        el.addEventListener("pointerdown", down)
        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", up)
        el.addEventListener("pointercancel", cancel)
        this.unbind = () => {
            el.removeEventListener("pointerdown", down)
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerup", up)
            el.removeEventListener("pointercancel", cancel)
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
        this.updateCamera()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.shellMaterial.uniforms
        ;(u.uTint.value as THREE.Color).set(cfg.tint || "#BFE9FF")
        ;(u.uSheen.value as THREE.Color).set(cfg.sheen || "#FFFFFF")
        u.uIrid.value = S.iridescence
        u.uRim.value = S.rim
        u.uGloss.value = S.gloss
        u.uWobble.value = S.wobble
        u.uRagged.value = S.ragged
        u.uLip.value = S.lip
        // Nothing here owns a buffer: the sphere never changes.
        this.updateCamera()
    }

    private updateCamera() {
        const aspect = Math.max(1, this.width) / Math.max(1, this.height)
        const distance = 1 / PERSPECTIVE
        const sizePct = clamp(this.cfg.sizePercent, 20, 200, 85)
        // Nothing ever leaves the sphere, so the frame is the sphere.
        const span = 2.55 * (100 / sizePct)
        const visibleHeight = aspect < 1 ? span / aspect : span

        this.camera.aspect = aspect
        this.camera.position.set(0, 0, distance)
        this.camera.lookAt(0, 0, 0)
        this.camera.fov =
            2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI)
        this.camera.near = Math.max(0.1, distance - 20)
        this.camera.far = distance + 20
        this.camera.updateProjectionMatrix()
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

        // A small state machine rather than one timeline, so the hold in the
        // middle is read straight off the Transition's delay and editing the
        // timing mid-flight cannot strand the bubble.
        this.phaseT += dt
        if (this.phase === "burst") {
            const p = Math.min(1, this.phaseT / timing.duration)
            this.tear = timing.ease(p)
            if (p >= 1) {
                this.phase = "hold"
                this.phaseT = 0
            }
        } else if (this.phase === "hold") {
            this.tear = 1
            if (this.phaseT >= timing.delay) {
                this.phase = "reform"
                this.phaseT = 0
            }
        } else if (this.phase === "reform") {
            const p = Math.min(1, this.phaseT / timing.duration)
            this.tear = 1 - timing.ease(p)
            if (p >= 1) {
                this.phase = "whole"
                this.phaseT = 0
                this.tear = 0
            }
        } else {
            this.tear = 0
        }

        // The film keeps its full brightness and simply stops existing behind
        // the front — it is never faded out, and the shell never grows: a
        // bursting bubble collapses into itself.
        this.shellMaterial.uniforms.uTear.value = this.tear
        this.shellMaterial.uniforms.uTime.value = this.clockT

        if (!this.isDragging) {
            const decay = Math.exp(-dt * 3)
            this.dragY += this.velY
            this.dragX += this.velX
            this.velX *= decay
            this.velY *= decay
            this.spinAngle += S.spin * S.heading * dt
        }

        this.ball.rotation.y = this.spinAngle
        // Pitch clamped: rolled past the pole the drained film shows its clear
        // crown to the camera and the bubble reads as an empty ring.
        this.group.rotation.set(
            Math.max(-1, Math.min(1, this.dragX * 0.5)),
            this.dragY,
            0
        )

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.unbind()
        this.shellGeometry.dispose()
        this.shellMaterial.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface BubbleBurstProps {
    tint?: string
    sheen?: string
    iridescence?: number
    rim?: number
    gloss?: number
    wobble?: number
    lip?: number
    ragged?: number
    transition?: any
    speed?: number
    direction?: "right" | "left"
    dragSensitivity?: number
    sizePercent?: number
    style?: React.CSSProperties
}

export default function BubbleBurst(props: BubbleBurstProps) {
    const {
        tint = DEFAULTS.tint,
        sheen = DEFAULTS.sheen,
        iridescence = DEFAULTS.iridescence,
        rim = DEFAULTS.rim,
        gloss = DEFAULTS.gloss,
        wobble = DEFAULTS.wobble,
        lip = DEFAULTS.lip,
        ragged = DEFAULTS.ragged,
        transition = {"ease":[0.4,0,0.5,1],"mass":1,"type":"tween","delay":0.35,"damping":60,"duration":1.16,"stiffness":800},
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction,
        dragSensitivity = DEFAULTS.dragSensitivity,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<BubbleScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        tint,
        sheen,
        iridescence,
        rim,
        gloss,
        wobble,
        lip,
        ragged,
        transition,
        speed,
        direction,
        dragSensitivity,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: BubbleScene
        try {
            scene = new BubbleScene(container, cfgRef.current)
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
        tint,
        sheen,
        iridescence,
        rim,
        gloss,
        wobble,
        lip,
        ragged,
        transition,
        speed,
        direction,
        dragSensitivity,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Soap bubble that tears open when clicked"
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

BubbleBurst.displayName = "Bubble Burst"
BubbleBurst.defaultProps = { ...DEFAULTS }
