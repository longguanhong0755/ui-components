"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Particle Saturn — the planet and its rings drawn entirely in motes, turning on
 * its own and draggable.
 *
 * There is no planet here, only its surface: motes spread over a sphere by the
 * Fibonacci spiral, which is the one cheap way to cover one evenly — the obvious
 * latitude and longitude loop crowds everything at the poles and leaves the
 * equator bare. The disc reads as solid because a sphere seen from outside
 * bunches its surface toward the limb, so the silhouette thickens on its own
 * without a single mote being placed there deliberately.
 *
 * The rings orbit rather than spin. Each mote keeps its own radius and is placed
 * by the clock at an angle that advances as the inverse three-halves power of
 * that radius, which is Kepler's law — so the inner rings visibly outrun the
 * outer ones and the band reads as matter in orbit instead of a turning decal.
 *
 * The divisions are carved out of the radius distribution, not painted over it:
 * a mote is never given a radius that falls inside a gap, so a gap stays empty
 * however the rings are lit or how long the page is left open.
 *
 * The body is treated as solid even though it is only a shell of motes. Two
 * things are dropped before they are ever drawn: the motes on the far side of
 * the sphere, and the ring motes that pass behind it. Both are cut in the vertex
 * shader by putting the vertex outside the clip volume, which costs nothing and
 * never reaches the fragment stage at all.
 *
 * Dropping the far hemisphere matters as much as hiding the rings. Two Fibonacci
 * spirals seen through each other beat against one another, and the sphere comes
 * out covered in swirling lines that belong to neither of them — cut to the near
 * side alone, the surface reads as a lit shell.
 *
 * Three angles, applied in a deliberate order. Tilt opens the ring plane toward
 * the viewer and the spin turns the model on its own axis, but neither can lean
 * the figure across the frame — that has to happen *after* the other two, about
 * the axis the camera looks down. That is Roll, and it is why the group's Euler
 * order is set rather than left at its default: with the default order the roll
 * is applied first, inside the tilt, where it merely spins the rings within
 * their own plane and nothing appears to happen.
 */

const PERSPECTIVE = 0.15
/**
 * World units of height the camera shows before Size % is applied.
 *
 * Fixed on purpose. Solved from the rings instead, the camera backs off every
 * time they are widened and the whole figure shrinks with it — Size % is the one
 * control that should change how large this is drawn.
 */
const VIEW_SPAN = 6.4
/** The body is one unit across; the ring radii are shares of it. */
const CORE_RADIUS = 1
const MAX_MOTES = 90000
/**
 * Half-thickness of the ring plane. The panel used to own this; real rings are a
 * few tens of metres thick against a hundred thousand kilometres of width, so
 * there was never much in it to adjust.
 */
const RING_THICKNESS = 0.011
/**
 * How many more motes the rings get than the body at the same density.
 *
 * The rings sweep a much larger area than the body's disc, so an equal count
 * spreads thinner over them and the sphere reads as the denser of the two.
 */
const RING_MOTE_FACTOR = 1.35
const TAU = Math.PI * 2

const DEFAULTS = {
    coreColor: "#997F00",
    ringColor: "#FFD400",
    density: 20,
    particleSize: 14,
    glow: 20,
    tilt: 6,
    roll: 7,
    spinSpeed: 7,
    ringOptions: {
        defaultValue: {"gaps":1,"orbitSpeed":20,"innerRadius":117,"outerRadius":262},
        innerRadius: 138,
        outerRadius: 262,
        gaps: 2,
        orbitSpeed: 9,
    },
    dragSensitivity: 2,
    sizePercent: 134,
}

type RingOptions = {
    innerRadius: number
    outerRadius: number
    gaps: number
    orbitSpeed: number
}

type Config = {
    coreColor: string
    ringColor: string
    density: number
    particleSize: number
    glow: number
    tilt: number
    roll: number
    spinSpeed: number
    ringOptions: RingOptions
    dragSensitivity: number
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/**
 * Panel values are whole numbers; the scene wants the real ones.
 *
 * Everything the shader and the builders read comes out of here under a name
 * that says what it is in world terms — radii in world units, angles in radians,
 * rates in radians per second, counts as counts.
 */
function settingsFor(cfg: Config) {
    // Read with a fallback: an instance placed before the group existed will not
    // carry the object at all.
    const ring = cfg.ringOptions ?? DEFAULTS.ringOptions

    const density = clamp(cfg.density, 1, 20, DEFAULTS.density)

    /*
     * One density drives both clouds, but not with the same count. The rings
     * cover a far larger area than the disc of the body does, so given equal
     * counts they come out visibly thinner than the sphere — the ring cloud is
     * scaled up by a fixed factor to match, and the two stay in step at every
     * setting of the slider.
     *
     * Squared, because ten thousand more motes is invisible at the dense end and
     * the whole difference at the sparse one.
     */
    const baseMotes = 600 + density * density * 95
    const coreMotes = Math.min(MAX_MOTES, Math.round(baseMotes))
    const ringMotes = Math.min(MAX_MOTES, Math.round(baseMotes * RING_MOTE_FACTOR))

    // The ring edges are shares of the body, so the proportions hold whatever
    // Size % is doing to the figure as a whole.
    const innerFraction =
        clamp(ring.innerRadius, 105, 200, DEFAULTS.ringOptions.innerRadius) / 100
    const outerFraction =
        clamp(ring.outerRadius, 110, 300, DEFAULTS.ringOptions.outerRadius) / 100

    return {
        coreMotes,
        ringMotes,
        // Pixel size of a mote at the model's own distance; the shader scales it
        // by depth from there.
        moteSize: 0.5 + clamp(cfg.particleSize, 1, 20, DEFAULTS.particleSize) * 0.13,
        glow: 0.15 + clamp(cfg.glow, 1, 20, DEFAULTS.glow) * 0.055,
        // How far the ring plane is opened toward the viewer.
        tiltRadians: (clamp(cfg.tilt, -80, 80, DEFAULTS.tilt) * Math.PI) / 180,
        // And how far the whole figure leans across the frame.
        rollRadians: (clamp(cfg.roll, -90, 90, DEFAULTS.roll) * Math.PI) / 180,
        // Radians per second about the model's own axis.
        spinRate: clamp(cfg.spinSpeed, 0, 20, DEFAULTS.spinSpeed) * 0.05,
        innerRadius: innerFraction * CORE_RADIUS,
        // Never inside the inner edge, whatever the two sliders are set to.
        outerRadius: Math.max(innerFraction + 0.08, outerFraction) * CORE_RADIUS,
        gapCount: Math.round(clamp(ring.gaps, 0, 4, DEFAULTS.ringOptions.gaps)),
        // Pinned: the panel used to own this.
        ringThickness: RING_THICKNESS,
        orbitRate:
            clamp(ring.orbitSpeed, 0, 20, DEFAULTS.ringOptions.orbitSpeed) * 0.11,
    }
}

type Settings = ReturnType<typeof settingsFor>

/** True where a radius falls inside one of the divisions. */
function insideGap(S: Settings, radius: number, span: number): boolean {
    for (let g = 0; g < S.gapCount; g++) {
        // Evenly spaced through the rings, each one narrower than the last, the
        // way the real divisions run.
        const centre = S.innerRadius + span * ((g + 1) / (S.gapCount + 1))
        const halfWidth = span * (0.075 - g * 0.011)
        if (Math.abs(radius - centre) < halfWidth) return true
    }
    return false
}

/**
 * A radius that is not inside a division.
 *
 * The gaps are carved out of the distribution rather than painted over the
 * rings: a mote never receives a radius that falls in one, so a gap stays empty
 * however the rings are lit and however long the page is left open.
 */
function pickRingRadius(S: Settings, span: number): number {
    for (let attempt = 0; attempt < 10; attempt++) {
        /*
         * Square-rooted, because a ring is an annulus: drawing the radius flat
         * puts the same number of motes in every band of radius, and the inner
         * bands — which have far less area — come out visibly denser.
         */
        const u = Math.sqrt(Math.random())
        const radius = S.innerRadius + u * span
        if (!insideGap(S, radius, span)) return radius
    }
    // Every attempt landed in a gap, which only happens with wide divisions on
    // narrow rings: put it at the outer edge rather than in the gap.
    return S.outerRadius
}

/**
 * The core and the rings, as parameters rather than positions.
 *
 * A mote carries what it belongs to, where it sits along that population, a seed
 * of its own, and — for a ring mote — the radius it orbits at. Everything else
 * is worked out in the vertex shader from the clock, so nothing is written per
 * frame.
 */
function buildCloud(S: Settings): THREE.BufferGeometry {
    const count = S.coreMotes + S.ringMotes
    const position = new Float32Array(count * 3)
    const kind = new Float32Array(count)
    const along = new Float32Array(count)
    const seed = new Float32Array(count)
    const radius = new Float32Array(count)

    for (let i = 0; i < S.coreMotes; i++) {
        // Named position so three can build a bounding sphere; the shader
        // ignores it and derives everything from the parameters.
        kind[i] = 0
        along[i] = (i + 0.5) / S.coreMotes
        seed[i] = Math.random()
        radius[i] = 0
    }

    const span = S.outerRadius - S.innerRadius
    for (let i = 0; i < S.ringMotes; i++) {
        const k = S.coreMotes + i
        kind[k] = 1
        along[k] = i / Math.max(1, S.ringMotes - 1)
        seed[k] = Math.random()
        radius[k] = pickRingRadius(S, span)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3))
    geometry.setAttribute("aKind", new THREE.BufferAttribute(kind, 1))
    geometry.setAttribute("aAlong", new THREE.BufferAttribute(along, 1))
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1))
    geometry.setAttribute("aRadius", new THREE.BufferAttribute(radius, 1))
    return geometry
}

const SATURN_VERTEX = /* glsl */ `
    attribute float aKind;
    attribute float aAlong;
    attribute float aSeed;
    attribute float aRadius;

    uniform float uTime;
    uniform float uMoteSize;
    uniform float uOrbitRate;
    uniform float uRingThickness;
    uniform float uCoreRadius;
    uniform float uPixelRatio;

    varying float vKind;
    varying float vBright;

    const float TAU = 6.28318530718;

    float hash11(float n) {
        return fract(sin(n * 78.233) * 43758.5453);
    }

    void main() {
        vec3 modelPos;
        float bright = 1.0;

        if (aKind < 0.5) {
            /*
             * The core: motes spread over a sphere by the Fibonacci spiral —
             * stepped up the axis at a constant rate and turned by the golden
             * angle each time. A latitude and longitude loop crowds the poles
             * and leaves the equator bare.
             */
            float y = 1.0 - aAlong * 2.0;
            float ringRadius = sqrt(max(0.0, 1.0 - y * y));
            float theta = aAlong * 2399.96;
            modelPos = vec3(cos(theta) * ringRadius, y, sin(theta) * ringRadius) * uCoreRadius;

            // A little scatter off the surface, or the spiral itself shows as a
            // swirl of lines across the disc.
            modelPos *= 1.0 + (hash11(aSeed * 91.7) - 0.5) * 0.012;

            bright = 0.55 + hash11(aSeed * 13.1) * 0.6;
        } else {
            /*
             * The rings orbit rather than spin. The angle advances as the
             * inverse three-halves power of the radius — Kepler's law — so the
             * inner rings visibly outrun the outer ones, which is the whole
             * difference between matter in orbit and a turning decal.
             */
            float orbitRadius = aRadius;
            float rate = uOrbitRate / pow(max(orbitRadius, 0.2), 1.5);
            float theta = aSeed * TAU + uTime * rate;

            // Rings are extraordinarily thin: a hair of vertical scatter, and no
            // more.
            float lift = (hash11(aSeed * 37.9) - 0.5) * 2.0 * uRingThickness;
            modelPos = vec3(cos(theta) * orbitRadius, lift, sin(theta) * orbitRadius);

            /*
             * Ringlets: brightness banded on the radius itself, so the fine
             * light and dark lanes stay put as the motes orbit through them —
             * exactly as they do in the real rings.
             */
            float lane = hash11(floor(orbitRadius * 46.0));
            bright = (0.35 + lane * 0.95) * (0.6 + hash11(aSeed * 5.3) * 0.7);
        }

        vec4 viewPos = modelViewMatrix * vec4(modelPos, 1.0);

        /*
         * The body is solid, so anything behind it is cut rather than dimmed.
         *
         * The test is made against the ray from the camera, not against the view
         * axis. Measuring how far a mote sits from the axis and comparing that
         * with the radius is the obvious version and it leaks: under perspective
         * a mote further out than the radius but further away as well still
         * *projects* inside the disc, so a band of the far rings kept showing
         * through the planet. Asking how close the sphere's centre comes to this
         * mote's own ray answers the question the picture is actually asking.
         *
         * In view space the camera is the origin and the model sits at the
         * fourth column of its own matrix.
         */
        vec3 modelCentre = modelViewMatrix[3].xyz;
        vec3 fromCamera = viewPos.xyz;
        float rayLength = max(length(fromCamera), 1e-5);
        vec3 rayDir = fromCamera / rayLength;

        // Where the sphere's centre falls along this ray, and how far off it is.
        float alongRay = dot(modelCentre, rayDir);
        float offAxis = length(modelCentre - rayDir * alongRay);

        bool occluded;
        if (aKind < 0.5) {
            /*
             * A core mote is on the hidden hemisphere when its own outward
             * normal faces away from the camera. Taken against the ray rather
             * than against a fixed direction, so the limb stays correct at the
             * edges of a wide frame.
             */
            occluded = dot(viewPos.xyz - modelCentre, rayDir) > 0.0;
        } else {
            /*
             * A ring mote is hidden when its ray meets the sphere at all and it
             * lies beyond where that ray enters — the near intersection, not the
             * centre, or motes crossing in front of the body would be cut too.
             */
            float inside = uCoreRadius * uCoreRadius - offAxis * offAxis;
            float nearHit = alongRay - sqrt(max(inside, 0.0));
            occluded = inside > 0.0 && rayLength > nearHit;
        }

        /*
         * The cut is made by putting the vertex outside the clip volume with no
         * size: a fragment shader cannot decline to draw a point it has already
         * been handed a position for, and discarding in the fragment stage would
         * pay for every one of them first.
         */
        if (occluded) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            gl_PointSize = 0.0;
            vKind = aKind;
            vBright = 0.0;
            return;
        }

        gl_Position = projectionMatrix * viewPos;
        // Perspective size: a mote twice as far is half as wide, which is what
        // keeps the near edge of the rings heavier than the far one.
        gl_PointSize = uMoteSize * uPixelRatio * (9.0 / max(0.001, -viewPos.z));

        vKind = aKind;
        vBright = bright;
    }
`

const SATURN_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec3 uCoreColor;
    uniform vec3 uRingColor;
    uniform float uGlow;

    varying float vKind;
    varying float vBright;

    void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;

        // A tight spike with a little bloom around it: the spike is the mote,
        // the bloom is what lets a dense patch read as one body of light.
        float fall = 1.0 - d;
        float shape = pow(fall, 5.0) + pow(fall, 1.6) * 0.3;

        vec3 col = vKind < 0.5 ? uCoreColor : uRingColor;
        float a = shape * vBright * (0.35 + uGlow);

        // Premultiplied against the additive blend: overlapping motes pile into
        // brightness rather than one hiding the next, which is what makes the
        // dense limb of the core read as a solid edge.
        gl_FragColor = vec4(col * a, a);
    }
`

class SaturnScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)
    private group = new THREE.Group()

    private cloudGeometry: THREE.BufferGeometry
    private material: THREE.ShaderMaterial
    private cloud: THREE.Points

    private time = 0
    private spinAngle = 0
    private dragYaw = 0
    private dragPitch = 0
    private velocityYaw = 0
    private velocityPitch = 0
    private isDragging = false
    private lastX = 0
    private lastY = 0

    private width = 0
    private height = 0
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        this.renderer.setPixelRatio(dpr)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setClearColor(0x000000, 0)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.cursor = "grab"
        el.style.touchAction = "none"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: SATURN_VERTEX,
            fragmentShader: SATURN_FRAGMENT,
            uniforms: {
                uTime: { value: 0 },
                uMoteSize: { value: S.moteSize },
                uOrbitRate: { value: S.orbitRate },
                uRingThickness: { value: S.ringThickness },
                uCoreRadius: { value: CORE_RADIUS },
                uPixelRatio: { value: dpr },
                uCoreColor: { value: new THREE.Color(cfg.coreColor) },
                uRingColor: { value: new THREE.Color(cfg.ringColor) },
                uGlow: { value: S.glow },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
        })

        this.cloudGeometry = buildCloud(S)
        this.cloud = new THREE.Points(this.cloudGeometry, this.material)
        // The shader places every mote, so three's culling maths cannot know
        // where they really are.
        this.cloud.frustumCulled = false
        this.group.add(this.cloud)

        /*
         * Roll last, then tilt, then the model's own turn.
         *
         * three composes the default XYZ order with the Z rotation applied
         * first — inside the tilt, where it only spins the rings within their
         * own plane and the figure never leans. ZXY puts it outermost, about the
         * axis the camera looks down, which is what makes the whole thing sit
         * diagonally in the frame.
         */
        this.group.rotation.order = "ZXY"
        this.scene.add(this.group)

        this.bindEvents()
    }

    private bindEvents() {
        const el = this.renderer.domElement

        const down = (e: PointerEvent) => {
            this.isDragging = true
            this.lastX = e.clientX
            this.lastY = e.clientY
            this.velocityYaw = 0
            this.velocityPitch = 0
            el.style.cursor = "grabbing"
        }
        const move = (e: PointerEvent) => {
            if (!this.isDragging) return
            const dx = e.clientX - this.lastX
            const dy = e.clientY - this.lastY
            this.lastX = e.clientX
            this.lastY = e.clientY
            const s = clamp(this.cfg.dragSensitivity, 0, 10, 3) * 0.007
            this.dragYaw += dx * s
            this.dragPitch += dy * s
            // Kept so the model carries on turning after the pointer lets go.
            this.velocityYaw = dx * s
            this.velocityPitch = dy * s
        }
        const up = () => {
            this.isDragging = false
            el.style.cursor = "grab"
        }

        el.addEventListener("pointerdown", down)
        // move and up on the window, so a drag continues once the pointer has
        // left the frame.
        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", up)
        window.addEventListener("pointercancel", up)

        this.unbind = () => {
            el.removeEventListener("pointerdown", down)
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerup", up)
            window.removeEventListener("pointercancel", up)
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
        const prev = this.cfg
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.material.uniforms

        u.uMoteSize.value = S.moteSize
        u.uOrbitRate.value = S.orbitRate
        u.uRingThickness.value = S.ringThickness
        u.uGlow.value = S.glow
        u.uCoreColor.value.set(cfg.coreColor || "#ffffff")
        u.uRingColor.value.set(cfg.ringColor || "#ffffff")

        /*
         * Only the controls that own a buffer rebuild one. The ring geometry is
         * baked into the radii, so the edges, the gaps and the two counts
         * rebuild the cloud; a colour, an angle or a speed is a uniform write
         * and nothing more.
         */
        const prevRing = prev.ringOptions ?? DEFAULTS.ringOptions
        const nextRing = cfg.ringOptions ?? DEFAULTS.ringOptions
        const cloudChanged =
            cfg.density !== prev.density ||
            nextRing.innerRadius !== prevRing.innerRadius ||
            nextRing.outerRadius !== prevRing.outerRadius ||
            nextRing.gaps !== prevRing.gaps

        if (cloudChanged) {
            const next = buildCloud(S)
            this.cloudGeometry.dispose()
            this.cloudGeometry = next
            this.cloud.geometry = next
        }

        this.updateCamera()
    }

    private updateCamera() {
        const w = Math.max(1, this.width)
        const h = Math.max(1, this.height)
        const aspect = w / h
        const distance = 1 / PERSPECTIVE
        const sizePct = clamp(this.cfg.sizePercent, 20, 200, 90)

        /*
         * A fixed span, scaled only by Size %. Solving it from the outermost
         * ring means the camera backs off whenever the rings are widened, and
         * the body shrinks along with everything else — which is exactly what it
         * must not do when only the rings were adjusted.
         */
        const span = VIEW_SPAN * (100 / sizePct)
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

        const S = settingsFor(this.cfg)

        // The rings orbit whether or not anyone is looking; the clock runs from
        // the moment the component is placed.
        this.time += dt

        if (!this.isDragging) {
            const decay = Math.exp(-dt * 3)
            this.dragYaw += this.velocityYaw
            this.dragPitch += this.velocityPitch
            this.velocityYaw *= decay
            this.velocityPitch *= decay
            // The model's own turn, given up while a drag is in hand so the two
            // do not fight over the same axis.
            this.spinAngle += S.spinRate * dt
        }

        /*
         * Pitch clamped: tipped past the pole the rings are seen edge-on from
         * the wrong side and the model loses the three-quarter view the whole
         * figure depends on.
         */
        const pitch = Math.max(-1.2, Math.min(1.2, this.dragPitch))
        this.group.rotation.set(
            S.tiltRadians + pitch,
            this.dragYaw + this.spinAngle,
            S.rollRadians
        )

        this.material.uniforms.uTime.value = this.time
        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.unbind()
        this.cloudGeometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface ParticleSaturnProps {
    coreColor?: string
    ringColor?: string
    density?: number
    particleSize?: number
    glow?: number
    tilt?: number
    roll?: number
    spinSpeed?: number
    ringOptions?: RingOptions
    dragSensitivity?: number
    sizePercent?: number
    style?: React.CSSProperties
}

export default function ParticleSaturn(props: ParticleSaturnProps) {
    const {
        coreColor = DEFAULTS.coreColor,
        ringColor = DEFAULTS.ringColor,
        density = DEFAULTS.density,
        particleSize = DEFAULTS.particleSize,
        glow = DEFAULTS.glow,
        tilt = DEFAULTS.tilt,
        roll = DEFAULTS.roll,
        spinSpeed = DEFAULTS.spinSpeed,
        ringOptions = {"gaps":1,"orbitSpeed":9,"innerRadius":105,"outerRadius":262},
        dragSensitivity = DEFAULTS.dragSensitivity,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<SaturnScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        coreColor,
        ringColor,
        density,
        particleSize,
        glow,
        tilt,
        roll,
        spinSpeed,
        ringOptions,
        dragSensitivity,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: SaturnScene
        try {
            scene = new SaturnScene(container, cfgRef.current)
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
        // The grouped control is an object: watch its fields, since the object
        // itself is a new reference on every render.
    }, [
        coreColor,
        ringColor,
        density,
        particleSize,
        glow,
        tilt,
        roll,
        spinSpeed,
        ringOptions?.innerRadius,
        ringOptions?.outerRadius,
        ringOptions?.gaps,
        ringOptions?.orbitSpeed,
        dragSensitivity,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A ringed planet drawn entirely in particles"
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

ParticleSaturn.displayName = "Particle Saturn"
ParticleSaturn.defaultProps = { ...DEFAULTS }
