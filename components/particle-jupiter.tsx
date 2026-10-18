"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Particle Jupiter — a gas giant made of nothing but particles, its belts drawn
 * by the winds rather than painted on.
 *
 * The bands are not a texture and not a colour ramp. Every particle sits at a
 * latitude and is carried east or west by the jet at that latitude, and the jets
 * alternate direction going up the globe — which is what Jupiter actually is.
 * Colour is read from the latitude a particle has been pushed to, so when
 * turbulence drags a parcel across a boundary it carries its colour with it and
 * the belt edges grow the curled filaments the real planet has. Paint the bands
 * on instead and the edges stay glassy no matter how much noise you add.
 *
 * The Great Red Spot is a place, not a set of particles: it holds a fixed
 * longitude while the jet streams parcels through it, and anything inside its
 * ellipse gets rotated about its centre, hardest at the middle. So it churns
 * continuously without ever running out of material or drifting off its band.
 *
 * All of that runs in the vertex shader off a clock. Position, wind, vortex and
 * shading are closed-form in latitude and time, so a hundred thousand particles
 * cost one uniform write per frame and no CPU work at all — where a cloud stepped
 * on the CPU would spend every frame walking a buffer of that size.
 */

// The planet is one unit across, so the model spans [-1, 1] the way the other
// 3D elements do — that is what lets the framing math be shared.
const PLANET_RADIUS = 1
const PERSPECTIVE = 0.15

// Panel density is scaled by this into an actual particle count. A gas giant
// needs a lot of parcels before it stops reading as gravel.
const PARTICLES_PER_STEP = 900

const DEFAULTS = {
    planet: {
        zone: "#E8D6B4",
        belt: "#9A6233",
        bands: 5,
        contrast: 4,
    },
    particles: {
        density: 90,
        size: 6,
        opacity: 100,
    },
    winds: {
        jet: 6,
        turbulence: 7,
        drift: 3,
    },
    spot: true,
    spotStyle: {
        color: "#C4462B",
        latitude: -20,
        longitude: 60,
        size: 9,
    },
    tilt: 0,
    spin: 4,
    direction: "ccw" as const,
    dragSensitivity: 10,
    sizePercent: 90,
}

// How fast the spot turns over, on the same scale its slider used to run on.
const SPOT_CHURN = 20

type Config = {
    planet: {
        zone: string
        belt: string
        bands: number
        contrast: number
    }
    particles: {
        density: number
        size: number
        opacity: number
    }
    winds: {
        jet: number
        turbulence: number
        drift: number
    }
    spot: boolean
    spotStyle: {
        color: string
        latitude: number
        longitude: number
        size: number
    }
    tilt: number
    spin: number
    direction: "cw" | "ccw"
    dragSensitivity: number
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/**
 * The whole planet, evaluated per particle per frame.
 *
 * Latitude and longitude go in as attributes and never change; everything that
 * moves is derived from them and the clock. That is what keeps the cloud static
 * in memory while the atmosphere circulates.
 */
const JUPITER_VERTEX = /* glsl */ `
    attribute float aLat;
    attribute float aLon;
    attribute float aSize;
    attribute float aSeed;

    uniform float uTime;
    uniform float uScale;
    uniform float uRadius;
    uniform float uBands;
    uniform float uJet;
    uniform float uTurb;
    uniform float uContrast;
    uniform vec3 uZone;
    uniform vec3 uBelt;
    uniform float uSpot;
    uniform vec3 uSpotColor;
    uniform float uSpotLat;
    uniform float uSpotLon;
    uniform float uSpotSize;
    uniform float uSpotSpin;

    varying vec3 vTint;
    varying float vShade;
    varying float vAlpha;

    const float PI = 3.14159265;
    const float TAU = 6.28318531;

    float hash(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
    }

    // Value noise: smooth, cheap, and quite enough for stirring an atmosphere.
    float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n000 = hash(i);
        float n100 = hash(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash(i + vec3(1.0, 1.0, 1.0));
        return mix(
            mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
            mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
            f.z
        );
    }

    /** Shortest signed distance between two longitudes. */
    float wrapLon(float x) {
        return mod(x + PI, TAU) - PI;
    }

    vec2 rotate(vec2 v, float a) {
        float c = cos(a);
        float s = sin(a);
        return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
    }

    void main() {
        float lat = aLat;
        float lon = aLon;

        // Normalised latitude, so the band count means bands from pole to pole
        // rather than radians.
        float nlat = lat / (PI * 0.5);

        /*
         * Zonal jets: the sign of this alternates up the globe, so neighbouring
         * bands are pulled in opposite directions. The shear between them is what
         * draws the belt boundaries — nothing here says "draw a stripe".
         */
        float jet = sin(nlat * PI * uBands);
        // Jets weaken toward the poles, as they do on the real planet, which is
        // what keeps the polar caps mottled instead of streaked.
        float jetFalloff = mix(0.35, 1.0, cos(lat) * cos(lat));
        lon += jet * jetFalloff * uJet * uTime;

        /*
         * Turbulence is applied to latitude AFTER the jet has moved the parcel,
         * and colour is read afterwards — so a parcel dragged over a boundary
         * takes its own colour across and the edge grows curls and filaments.
         */
        float swirl = noise(vec3(lon * 1.6, nlat * 5.0, uTime * 0.06)) - 0.5;
        float fine = noise(vec3(lon * 5.2, nlat * 13.0, uTime * 0.13)) - 0.5;
        lat += (swirl * 0.75 + fine * 0.3) * uTurb;
        // Held just short of the poles. Past ±90° the cosine goes negative, which
        // mirrors the parcel to the opposite side of the globe — a handful of
        // particles visibly teleporting across the disc.
        lat = clamp(lat, -1.5605, 1.5605);

        /*
         * The Great Red Spot is a location, not a group of particles: parcels
         * stream through it on the jet, and whatever is inside the ellipse is
         * rotated about its centre — hardest at the middle, nothing at the rim.
         * So it churns forever and cannot drift off its own band.
         */
        float spotAmount = 0.0;
        if (uSpot > 0.5) {
            // Longitude is scaled by cos(lat) so the ellipse is measured in real
            // angular distance and does not fan out toward the poles.
            vec2 d = vec2(wrapLon(lon - uSpotLon) * cos(lat), lat - uSpotLat);
            // Wider than tall, as it is on Jupiter.
            vec2 radii = vec2(uSpotSize * 1.7, uSpotSize);
            // Normalised into a circle first, so the rotation carries the
            // ellipse round with it rather than sweeping through it like a
            // paddle and fanning the parcels out sideways.
            vec2 unit = d / radii;
            float dn = length(unit);
            spotAmount = 1.0 - smoothstep(0.45, 1.0, dn);
            if (dn < 1.0) {
                /*
                 * Every ring inside the spot turns rigidly, by an angle that
                 * falls to nothing at the rim.
                 *
                 * The parcel is MOVED, never blended toward a moved copy of
                 * itself. Mixing a point with its own rotation lands on the
                 * chord between the two, which is closer to the centre than
                 * either — so the outer rings crept inward, and past half a turn
                 * they collapsed toward the middle entirely. That is what opened
                 * the bare crescent beside the spot. A differential rotation
                 * preserves area exactly, so the spot can churn forever without
                 * ever thinning out, and at the rim the angle reaches zero and
                 * the flow rejoins the jet with no seam.
                 */
                float fall = 1.0 - dn * dn;
                float ang = uSpotSpin * uTime * fall;
                vec2 rd = rotate(unit, ang) * radii;
                float newLat = uSpotLat + rd.y;
                lat = clamp(newLat, -1.5605, 1.5605);
                lon = uSpotLon + rd.x / max(0.25, cos(newLat));
            }
        }

        vec3 dir = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
        vec3 p = dir * uRadius;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);

        // Colour from the latitude the parcel ENDED UP at.
        float nlat2 = lat / (PI * 0.5);
        float band = smoothstep(-0.55, 0.55, sin(nlat2 * PI * uBands));
        vec3 base = mix(uBelt, uZone, band);
        // Per-particle brightness jitter, so a band is a crowd of parcels rather
        // than one flat wash of colour.
        base *= 0.82 + 0.36 * aSeed;
        vTint = mix(base, uSpotColor, spotAmount * 0.92);

        // Wrapped diffuse from a lamp fixed to the camera: the terminator softens
        // instead of cutting to black, which is how a deep atmosphere scatters
        // light past its own edge.
        vec3 nv = normalize(normalMatrix * dir);
        vec3 lightDir = normalize(vec3(0.45, 0.5, 1.0));
        float diff = clamp((dot(nv, lightDir) + 0.45) / 1.45, 0.0, 1.0);
        vShade = mix(0.14, 1.0, pow(diff, 1.0 + uContrast * 0.15));
        // A little extra at the limb, for the haze that rings a gas giant.
        vShade += pow(1.0 - abs(nv.z), 3.0) * 0.22;

        /*
         * The far hemisphere is faded out rather than drawn. These are round
         * sprites with no depth sorting, so leaving the back side in would let it
         * shine through the front and the planet would read as a wire ball
         * instead of a body.
         */
        vAlpha = smoothstep(-0.02, 0.3, nv.z);

        gl_PointSize = aSize * uScale / max(0.001, -mv.z);
        gl_Position = projectionMatrix * mv;
    }
`

const JUPITER_FRAGMENT = /* glsl */ `
    uniform float uOpacity;
    varying vec3 vTint;
    varying float vShade;
    varying float vAlpha;

    void main() {
        // Round the square point sprite off, else the atmosphere reads as gravel.
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.12, d) * vAlpha * uOpacity;
        if (a <= 0.01) discard;
        gl_FragColor = vec4(vTint * vShade, a);
    }
`

class JupiterScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)
    private tumble = new THREE.Group()
    private tilted = new THREE.Group()

    private material: THREE.ShaderMaterial
    private geometry = new THREE.BufferGeometry()
    private cloud: THREE.Points

    private ax = 0.05
    private ay = 0.3
    private vx = 0
    private vy = 0
    private isDragging = false
    private lastX = 0
    private lastY = 0

    private width = 0
    private height = 0
    private frameId = 0
    private lastT = 0
    private elapsed = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.cursor = "grab"
        el.style.touchAction = "none"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: JUPITER_VERTEX,
            fragmentShader: JUPITER_FRAGMENT,
            uniforms: {
                uTime: { value: 0 },
                uScale: { value: 300 },
                uRadius: { value: PLANET_RADIUS },
                uBands: { value: 7 },
                uJet: { value: 0.05 },
                uTurb: { value: 0.05 },
                uContrast: { value: 6 },
                uZone: { value: new THREE.Color(cfg.planet.zone) },
                uBelt: { value: new THREE.Color(cfg.planet.belt) },
                uOpacity: { value: 1 },
                uSpot: { value: cfg.spot ? 1 : 0 },
                uSpotColor: { value: new THREE.Color(cfg.spotStyle.color) },
                uSpotLat: { value: 0 },
                uSpotLon: { value: 0 },
                uSpotSize: { value: 0.2 },
                uSpotSpin: { value: 0.3 },
            },
            transparent: true,
            // Round sprites cannot sort themselves, so nothing writes depth and
            // the far hemisphere is faded in the vertex shader instead.
            depthWrite: false,
        })

        this.cloud = new THREE.Points(this.geometry, this.material)
        this.tilted.add(this.cloud)
        this.tumble.add(this.tilted)
        this.scene.add(this.tumble)

        this.build()
        this.applyUniforms()
        this.applyTilt()
        this.bindEvents()
    }

    /**
     * Latitude is drawn as asin(u), not uniformly.
     *
     * Spacing latitudes evenly puts the same number of parcels on a polar ring as
     * on the equator, and since those rings are far shorter the poles cake solid
     * while the equator goes thin. asin of a uniform draw spreads parcels evenly
     * over the surface, which is what an atmosphere looks like.
     */
    private build() {
        const count =
            clamp(this.cfg.particles.density, 10, 200, 90) * PARTICLES_PER_STEP

        // Position is a required attribute, but every particle's real place is
        // computed in the shader — so this carries the count and nothing else.
        const positions = new Float32Array(count * 3)
        const lats = new Float32Array(count)
        const lons = new Float32Array(count)
        const sizes = new Float32Array(count)
        const seeds = new Float32Array(count)

        for (let i = 0; i < count; i++) {
            lats[i] = Math.asin(Math.random() * 2 - 1)
            lons[i] = Math.random() * Math.PI * 2
            // A spread of sizes, weighted small: a few larger parcels give the
            // cloud some tooth without turning it lumpy.
            sizes[i] = 0.7 + Math.pow(Math.random(), 2.2) * 1.9
            seeds[i] = Math.random()
        }

        this.geometry.dispose()
        this.geometry = new THREE.BufferGeometry()
        this.geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
        )
        this.geometry.setAttribute("aLat", new THREE.BufferAttribute(lats, 1))
        this.geometry.setAttribute("aLon", new THREE.BufferAttribute(lons, 1))
        this.geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1))
        this.geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1))
        // The cloud is a full sphere and the camera never leaves it, so three's
        // own culling has nothing useful to decide.
        this.geometry.boundingSphere = new THREE.Sphere(
            new THREE.Vector3(),
            PLANET_RADIUS * 1.5
        )
        this.cloud.geometry = this.geometry
    }

    /** Every panel value except density is one of these — hence no rebuilds. */
    private applyUniforms() {
        const u = this.material.uniforms
        const cfg = this.cfg

        u.uZone.value.set(cfg.planet.zone || "#ffffff")
        u.uBelt.value.set(cfg.planet.belt || "#000000")
        u.uBands.value = clamp(cfg.planet.bands, 1, 10, 7)
        u.uContrast.value = clamp(cfg.planet.contrast, 0, 10, 6)
        u.uOpacity.value = clamp(cfg.particles.opacity, 0, 100, 100) / 100
        // Jets are slow: a whole slider step is a fraction of a radian per second
        // of shear, which at these speeds reads as weather rather than as spin.
        u.uJet.value = clamp(cfg.winds.jet, 0, 20, 6) * 0.012
        u.uTurb.value = clamp(cfg.winds.turbulence, 0, 20, 7) * 0.011
        u.uSpot.value = cfg.spot ? 1 : 0
        u.uSpotColor.value.set(cfg.spotStyle.color || "#C4462B")
        u.uSpotLat.value =
            (clamp(cfg.spotStyle.latitude, -60, 60, -20) * Math.PI) / 180
        u.uSpotLon.value =
            (clamp(cfg.spotStyle.longitude, 0, 360, 60) * Math.PI) / 180
        u.uSpotSize.value = clamp(cfg.spotStyle.size, 1, 20, 9) * 0.028
        u.uSpotSpin.value = SPOT_CHURN * 0.055
    }

    private applyTilt() {
        const tilt = clamp(this.cfg.tilt, -60, 60, 3)
        this.tilted.rotation.z = (tilt * Math.PI) / 180
    }

    private bindEvents() {
        const el = this.renderer.domElement
        const down = (e: PointerEvent) => {
            this.isDragging = true
            this.lastX = e.clientX
            this.lastY = e.clientY
            this.vx = 0
            this.vy = 0
            el.style.cursor = "grabbing"
        }
        const move = (e: PointerEvent) => {
            if (!this.isDragging) return
            const dx = e.clientX - this.lastX
            const dy = e.clientY - this.lastY
            this.lastX = e.clientX
            this.lastY = e.clientY
            const s = clamp(this.cfg.dragSensitivity, 0, 10, 3) * 0.006
            this.ay += dx * s
            this.ax += dy * s
            // Velocity is kept so the planet keeps turning after release.
            this.vy = dx * s
            this.vx = dy * s
        }
        const up = () => {
            this.isDragging = false
            el.style.cursor = "grab"
        }
        el.addEventListener("pointerdown", down)
        // On the window, not the canvas: a drag that leaves the frame would
        // otherwise stick the planet to the pointer forever.
        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", up)
        el.addEventListener("pointerleave", up)
        this.unbind = () => {
            el.removeEventListener("pointerdown", down)
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerup", up)
            el.removeEventListener("pointerleave", up)
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
        this.applyUniforms()
        this.applyTilt()

        // Density is the only thing that owns the buffers. Everything else —
        // winds, colours, bands, the spot — is a uniform, so it takes effect on
        // the next frame without touching a single attribute.
        if (cfg.particles.density !== prev.particles.density) this.build()
        this.updateCamera()
    }

    private updateCamera() {
        const w = Math.max(1, this.width)
        const h = Math.max(1, this.height)
        const aspect = w / h
        const distance = 1 / PERSPECTIVE
        const sizePct = clamp(this.cfg.sizePercent, 20, 200, 90)
        const span = PLANET_RADIUS * 2.5 * (100 / sizePct)
        const visibleHeight = aspect < 1 ? span / aspect : span

        this.camera.aspect = aspect
        this.camera.position.set(0, 0, distance)
        this.camera.lookAt(0, 0, 0)
        this.camera.fov =
            2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI)
        this.camera.near = Math.max(0.1, distance - 20)
        this.camera.far = distance + 20
        this.camera.updateProjectionMatrix()

        // A parcel is a fixed size in MODEL units, not in pixels: the sprite
        // scale is pixels-per-unit times the camera distance, so parcels stay
        // parcel-sized however the frame is sized or zoomed. Sizing them in raw
        // pixels is what turns the planet into a solid ball on a large frame and
        // into dust on a small one.
        const pixelsPerUnit = h / Math.max(0.001, visibleHeight)
        const size = clamp(this.cfg.particles.size, 1, 20, 6)
        this.material.uniforms.uScale.value =
            0.0016 * size * pixelsPerUnit * distance
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        // The atmosphere runs on its own clock, so Drift can slow the weather
        // right down without stopping the planet turning.
        this.elapsed += dt * clamp(this.cfg.winds.drift, 0, 20, 3)
        this.material.uniforms.uTime.value = this.elapsed

        if (!this.isDragging) {
            // A fling decays over roughly a second, then the idle spin takes back
            // over — so a throw reads as momentum, not as a speed change.
            const decay = Math.exp(-dt * 3)
            this.ay += this.vy
            this.ax += this.vx
            this.vx *= decay
            this.vy *= decay
            // Speed and heading are separate on the panel: a slider that ran
            // through zero to reverse made the middle of its range a dead spot.
            const heading = this.cfg.direction === "cw" ? -1 : 1
            this.ay += clamp(this.cfg.spin, 1, 20, 4) * heading * 0.05 * dt
        }
        // Vertical drag is damped: a gas giant read from near its equator is the
        // familiar view, and letting it tip all the way over loses the bands.
        this.tumble.rotation.set(this.ax * 0.35, this.ay, 0)

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

export interface ParticleJupiterProps {
    planet?: {
        zone: string
        belt: string
        bands: number
        contrast: number
    }
    particles?: {
        density: number
        size: number
        opacity: number
    }
    winds?: {
        jet: number
        turbulence: number
        drift: number
    }
    spot?: boolean
    spotStyle?: {
        color: string
        latitude: number
        longitude: number
        size: number
    }
    tilt?: number
    spin?: number
    direction?: "cw" | "ccw"
    dragSensitivity?: number
    sizePercent?: number
    style?: React.CSSProperties
}

export default function ParticleJupiter(props: ParticleJupiterProps) {
    const {
        planet = DEFAULTS.planet,
        particles = DEFAULTS.particles,
        winds = DEFAULTS.winds,
        spot = DEFAULTS.spot,
        spotStyle = DEFAULTS.spotStyle,
        tilt = DEFAULTS.tilt,
        spin = DEFAULTS.spin,
        direction = DEFAULTS.direction,
        dragSensitivity = DEFAULTS.dragSensitivity,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<JupiterScene | null>(null)

    // An Object control hands back only the keys that have been touched, so each
    // modal is merged over its defaults — a missing key would otherwise arrive
    // undefined and fall back silently inside every clamp.
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        planet: { ...DEFAULTS.planet, ...(planet ?? {}) },
        particles: { ...DEFAULTS.particles, ...(particles ?? {}) },
        winds: { ...DEFAULTS.winds, ...(winds ?? {}) },
        spot,
        spotStyle: { ...DEFAULTS.spotStyle, ...(spotStyle ?? {}) },
        tilt,
        spin,
        direction,
        dragSensitivity,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: JupiterScene
        try {
            scene = new JupiterScene(container, cfgRef.current)
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
        planet?.zone,
        planet?.belt,
        planet?.bands,
        planet?.contrast,
        particles?.density,
        particles?.size,
        particles?.opacity,
        winds?.jet,
        winds?.turbulence,
        winds?.drift,
        spot,
        spotStyle?.color,
        spotStyle?.latitude,
        spotStyle?.longitude,
        spotStyle?.size,
        tilt,
        spin,
        direction,
        dragSensitivity,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Gas giant made of particles"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 200,
                minHeight: 200,
                overflow: "hidden",
                ...style,
            }}
        />
    )
}

ParticleJupiter.displayName = "Particle Jupiter"
