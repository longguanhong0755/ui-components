"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Harmonic Shell — a sphere whose radius is a standing wave on its own surface.
 *
 * The radius at any point is built from four terms: two that count lobes going
 * round the equator, two that count rings going from pole to pole. Raising each
 * to a power sharpens it, so a gentle bulge becomes a petal and then a spike.
 * Integer counts are what make the shape close on itself — a fractional lobe
 * count leaves a step where the surface comes back round to where it started,
 * and the whole thing reads as broken rather than as a form.
 *
 * The normals are worked out per vertex by evaluating the surface twice more, a
 * hair away in each of the two angles, and crossing the tangents that gives.
 * That is three evaluations instead of one, and worth every one of them: the
 * mesh changes shape every frame, so anything precomputed is stale immediately,
 * and screen-space derivatives would give facet normals — right for folded paper,
 * wrong for something grown.
 *
 * The lobe counts drift continuously between whole numbers rather than stepping,
 * which is what makes it breathe instead of flicking between shapes.
 */

const PERSPECTIVE = 0.15

const DEFAULTS = {
    deep: "#3400FF",
    mid: "#00CFFF",
    bright: "#FF00EF",
    rim: "#AC0093",
    size: 130,
    lobes: 8,
    petals: 8,
    rings: 8,
    bands: 8,
    sharpness: 20,
    amplitude: 1,
    morph: 20,
    spin: 9,
    tilt: 0,
    shine: 20,
    glow: 20,
    speed: 9,
    followPointer: true,
    lean: 20,
}

type Config = {
    deep: string
    mid: string
    bright: string
    rim: string
    size: number
    lobes: number
    petals: number
    rings: number
    bands: number
    sharpness: number
    amplitude: number
    morph: number
    spin: number
    tilt: number
    shine: number
    glow: number
    speed: number
    followPointer: boolean
    lean: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the surface wants the real ones. */
function settingsFor(cfg: Config) {
    const amp = 0.06 + clamp(cfg.amplitude, 1, 20, DEFAULTS.amplitude) * 0.021
    return {
        sizeScale: clamp(cfg.size, 20, 200, DEFAULTS.size) / 100,
        // Whole counts. Each of these is a number of lobes or rings, and a
        // fraction of one leaves a seam where the surface fails to close.
        lobes: Math.round(clamp(cfg.lobes, 0, 8, DEFAULTS.lobes)),
        petals: Math.round(clamp(cfg.petals, 0, 8, DEFAULTS.petals)),
        rings: Math.round(clamp(cfg.rings, 0, 8, DEFAULTS.rings)),
        bands: Math.round(clamp(cfg.bands, 0, 8, DEFAULTS.bands)),
        /*
         * The exponent. Below one the terms are broad swells; above about three
         * they pinch into spikes, and the surface starts to need the finer mesh
         * to hold its points.
         */
        sharpness: 0.35 + clamp(cfg.sharpness, 1, 20, DEFAULTS.sharpness) * 0.3,
        amp,
        morph: clamp(cfg.morph, 0, 20, DEFAULTS.morph) * 0.055,
        spin: clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.07,
        tilt: clamp(cfg.tilt, 0, 20, DEFAULTS.tilt) * 0.045,
        shine: 8 + clamp(cfg.shine, 1, 20, DEFAULTS.shine) * 7,
        glow: clamp(cfg.glow, 0, 20, DEFAULTS.glow) * 0.055,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.12,
        lean: clamp(cfg.lean, 0, 20, DEFAULTS.lean) * 0.05,
        // Every term is at most one, so four of them at full amplitude is the
        // furthest any point of the surface can reach.
        reach: 0.18 + amp * 4,
    }
}

const SHELL_VERTEX = /* glsl */ `
    uniform float uTime;
    uniform float uLobes;
    uniform float uPetals;
    uniform float uRings;
    uniform float uBands;
    uniform float uSharp;
    uniform float uAmp;
    uniform float uMorph;
    uniform float uBase;

    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying float vHeight;

    /*
     * The radius. Absolute values before the power: a negative base with a
     * fractional exponent is undefined, and on a GPU that shows up as holes
     * punched through the surface rather than as an error.
     */
    float shape(float th, float ph) {
        // The counts drift between whole numbers, which is what makes the form
        // breathe rather than flick from one shape to the next.
        float m1 = uLobes + sin(uTime * 0.23) * uMorph;
        float m2 = uPetals + sin(uTime * 0.31 + 1.7) * uMorph;
        float m3 = uRings + sin(uTime * 0.19 + 3.1) * uMorph;
        float m4 = uBands + sin(uTime * 0.27 + 4.6) * uMorph;

        float r = pow(abs(sin(m1 * ph)), uSharp)
                + pow(abs(cos(m2 * ph)), uSharp)
                + pow(abs(sin(m3 * th)), uSharp)
                + pow(abs(cos(m4 * th)), uSharp);
        return uBase + r * uAmp;
    }

    vec3 surf(float th, float ph) {
        vec3 dir = vec3(sin(th) * cos(ph), cos(th), sin(th) * sin(ph));
        return dir * shape(th, ph);
    }

    void main() {
        vec3 d = normalize(position);
        float ph = atan(d.z, d.x);
        float th = acos(clamp(d.y, -1.0, 1.0));

        vec3 p = surf(th, ph);

        // Two more evaluations, a hair away in each angle. The mesh changes
        // every frame, so there is nothing worth precomputing.
        float e = 0.004;
        vec3 dTh = surf(th + e, ph) - p;
        vec3 dPh = surf(th, ph + e) - p;
        vec3 n = cross(dTh, dPh);
        float len = length(n);
        n = len > 1e-8 ? n / len : d;
        // Near a pole the two tangents nearly coincide and the cross product can
        // come out inward; the radial direction settles which way is out.
        if (dot(n, d) < 0.0) n = -n;

        vHeight = (length(p) - uBase) / max(uAmp * 4.0, 0.0001);
        vNormal = normalize(normalMatrix * n);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vViewPos = mv.xyz;
        gl_Position = projectionMatrix * mv;
    }
`

const SHELL_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec3 uDeep;
    uniform vec3 uMid;
    uniform vec3 uBright;
    uniform vec3 uRim;
    uniform float uShine;
    uniform float uGlow;

    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying float vHeight;

    void main() {
        vec3 n = normalize(vNormal);
        // Both walls are drawn, so the far side needs its normal turned or the
        // inside of a deep lobe reads as a flat silhouette.
        if (!gl_FrontFacing) n = -n;

        vec3 view = normalize(-vViewPos);

        // Lights in view space, fixed to the frame, so the highlights stay put
        // while the shell turns under them.
        const vec3 KEY = vec3(-0.42, 0.6, 0.68);
        const vec3 FILL = vec3(0.6, -0.35, 0.72);

        float key = max(dot(n, KEY), 0.0);
        float fill = max(dot(n, FILL), 0.0) * 0.35;
        vec3 halfway = normalize(KEY + view);
        float spec = pow(max(dot(n, halfway), 0.0), uShine);

        // Three stops with height: the troughs, the body, the tips of the lobes.
        vec3 col = mix(uDeep, uMid, smoothstep(0.05, 0.55, vHeight));
        col = mix(col, uBright, smoothstep(0.6, 1.0, vHeight));
        col *= 0.35 + key * 0.85 + fill;

        // A fixed exponent, with the panel scaling the term. An adjustable
        // exponent goes from no edge at all to nothing but edge in two steps.
        float fres = pow(1.0 - max(dot(n, view), 0.0), 4.0);
        col += uRim * fres * (0.5 + uGlow * 6.0);
        col += uBright * spec * 0.5;

        gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
`

class ShellScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200)
    private group = new THREE.Group()
    private geometry = new THREE.SphereGeometry(1, 180, 128)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private width = 1
    private height = 1

    private pointer = new THREE.Vector2(0.5, 0.5)
    private pointerTarget = new THREE.Vector2(0.5, 0.5)
    private grip = 0
    private gripTarget = 0
    private leanX = 0
    private leanY = 0
    private spun = 0

    private time = 0
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setClearColor(0x000000, 0)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: SHELL_VERTEX,
            fragmentShader: SHELL_FRAGMENT,
            uniforms: {
                uTime: { value: 0 },
                uLobes: { value: S.lobes },
                uPetals: { value: S.petals },
                uRings: { value: S.rings },
                uBands: { value: S.bands },
                uSharp: { value: S.sharpness },
                uAmp: { value: S.amp },
                uMorph: { value: S.morph },
                uBase: { value: 0.16 },
                uDeep: { value: new THREE.Color(cfg.deep) },
                uMid: { value: new THREE.Color(cfg.mid) },
                uBright: { value: new THREE.Color(cfg.bright) },
                uRim: { value: new THREE.Color(cfg.rim) },
                uShine: { value: S.shine },
                uGlow: { value: S.glow },
            },
            side: THREE.DoubleSide,
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.group.add(this.mesh)
        this.group.scale.setScalar(S.sizeScale)
        this.scene.add(this.group)

        container.addEventListener("pointerenter", this.onEnter)
        container.addEventListener("pointerleave", this.onLeave)
        container.addEventListener("pointercancel", this.onLeave)
        container.addEventListener("pointermove", this.onMove)
    }

    private onEnter = () => {
        this.gripTarget = 1
    }
    private onLeave = () => {
        this.gripTarget = 0
    }
    private onMove = (e: PointerEvent) => {
        const rect = this.container.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        this.pointerTarget.set(
            (e.clientX - rect.left) / rect.width,
            1 - (e.clientY - rect.top) / rect.height
        )
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
        this.width = width
        this.height = height
        this.renderer.setSize(width, height, false)
        this.updateCamera()
    }

    private updateCamera() {
        const aspect = Math.max(1, this.width) / Math.max(1, this.height)
        const distance = 1 / PERSPECTIVE
        const S = settingsFor(this.cfg)
        // Framed on the surface at its furthest reach, so a lobe growing out
        // during a morph never clips.
        const span = S.reach * 2.7
        const visibleHeight = aspect < 1 ? span / aspect : span

        this.camera.aspect = aspect
        this.camera.position.set(0, 0, distance)
        this.camera.lookAt(0, 0, 0)
        this.camera.fov = 2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI)
        this.camera.near = Math.max(0.1, distance - 20)
        this.camera.far = distance + 20
        this.camera.updateProjectionMatrix()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)
        // Nothing here owns a buffer: the sphere is only a supply of directions,
        // and every control is read inside the vertex shader.
        const u = this.material.uniforms
        u.uLobes.value = S.lobes
        u.uPetals.value = S.petals
        u.uRings.value = S.rings
        u.uBands.value = S.bands
        u.uSharp.value = S.sharpness
        u.uAmp.value = S.amp
        u.uMorph.value = S.morph
        u.uShine.value = S.shine
        u.uGlow.value = S.glow
        u.uDeep.value.set(cfg.deep || "#1B1046")
        u.uMid.value.set(cfg.mid || "#4FA9D8")
        u.uBright.value.set(cfg.bright || "#FFE9A8")
        u.uRim.value.set(cfg.rim || "#FF7BC2")

        this.group.scale.setScalar(S.sizeScale)
        this.updateCamera()
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.speed
        this.spun += dt * S.spin

        this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-dt * 8))
        const want = this.cfg.followPointer ? this.gripTarget : 0
        this.grip += (want - this.grip) * (1 - Math.exp(-dt * 3.5))

        const wantX = -S.tilt - (this.pointer.y - 0.5) * 2 * S.lean * this.grip
        const wantY = (this.pointer.x - 0.5) * 2 * S.lean * this.grip
        const k = 1 - Math.exp(-dt * 3)
        this.leanX += (wantX - this.leanX) * k
        this.leanY += (wantY - this.leanY) * k
        this.group.rotation.x = this.leanX
        this.group.rotation.y = this.leanY + this.spun

        this.material.uniforms.uTime.value = this.time

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.container.removeEventListener("pointerenter", this.onEnter)
        this.container.removeEventListener("pointerleave", this.onLeave)
        this.container.removeEventListener("pointercancel", this.onLeave)
        this.container.removeEventListener("pointermove", this.onMove)
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

interface HarmonicShellProps {
    deep?: string
    mid?: string
    bright?: string
    rim?: string
    size?: number
    lobes?: number
    petals?: number
    rings?: number
    bands?: number
    sharpness?: number
    amplitude?: number
    morph?: number
    spin?: number
    tilt?: number
    shine?: number
    glow?: number
    speed?: number
    followPointer?: boolean
    lean?: number
    style?: React.CSSProperties
}

export default function HarmonicShell(props: HarmonicShellProps) {
    const {
        deep = DEFAULTS.deep,
        mid = DEFAULTS.mid,
        bright = DEFAULTS.bright,
        rim = DEFAULTS.rim,
        size = DEFAULTS.size,
        lobes = DEFAULTS.lobes,
        petals = DEFAULTS.petals,
        rings = DEFAULTS.rings,
        bands = DEFAULTS.bands,
        sharpness = DEFAULTS.sharpness,
        amplitude = DEFAULTS.amplitude,
        morph = DEFAULTS.morph,
        spin = DEFAULTS.spin,
        tilt = DEFAULTS.tilt,
        shine = DEFAULTS.shine,
        glow = DEFAULTS.glow,
        speed = DEFAULTS.speed,
        followPointer = DEFAULTS.followPointer,
        lean = DEFAULTS.lean,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<ShellScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        deep,
        mid,
        bright,
        rim,
        size,
        lobes,
        petals,
        rings,
        bands,
        sharpness,
        amplitude,
        morph,
        spin,
        tilt,
        shine,
        glow,
        speed,
        followPointer,
        lean,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: ShellScene
        try {
            scene = new ShellScene(container, cfgRef.current)
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
        deep,
        mid,
        bright,
        rim,
        size,
        lobes,
        petals,
        rings,
        bands,
        sharpness,
        amplitude,
        morph,
        spin,
        tilt,
        shine,
        glow,
        speed,
        followPointer,
        lean,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A shell whose radius is a standing wave on its own surface"
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

HarmonicShell.displayName = "Harmonic Shell"
HarmonicShell.defaultProps = { ...DEFAULTS }
