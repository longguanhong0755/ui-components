"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

const PERSPECTIVE = 0.15

const CORNER_MARGIN = 1.06

const INNER_BITE = 0.42

const DEFAULTS = {
    filings: "#005CFF",
    distant: "#B773FF",
    density: 20,
    filament: 10,
    thickness: 1,
    magnet: 10,
    axis: 0,
    glow: 20,
    pulse: 20,
    speed: 20,
    direction: "out" as const,
    shimmer: 11,
    hover: 13,
    sizePercent: 113,
}

type Config = {
    filings: string
    distant: string
    density: number
    filament: number
    thickness: number
    magnet: number
    axis: number
    glow: number
    pulse: number
    speed: number
    direction: "out" | "in"
    shimmer: number
    hover: number
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

function settingsFor(cfg: Config) {
    const density = clamp(cfg.density, 1, 20, DEFAULTS.density)
    const count = Math.round(900 + density * density * 70)
    const zoom = clamp(cfg.sizePercent, 20, 200, DEFAULTS.sizePercent) / 100
    return {
        count,
        zoom,
        magnet: (0.05 + clamp(cfg.magnet, 1, 20, DEFAULTS.magnet) * 0.016) * zoom,
        length:
            (0.012 + clamp(cfg.filament, 1, 20, DEFAULTS.filament) * 0.0075) *
            zoom,
        thickness: 0.1 + clamp(cfg.thickness, 1, 20, DEFAULTS.thickness) * 0.028,
        axis: (clamp(cfg.axis, 0, 360, DEFAULTS.axis) * Math.PI) / 180,
        glow: 0.25 + clamp(cfg.glow, 1, 20, DEFAULTS.glow) * 0.075,
        pulse: clamp(cfg.pulse, 0, 20, DEFAULTS.pulse) / 20,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.055,
        heading: cfg.direction === "in" ? -1 : 1,
        shimmer: clamp(cfg.shimmer, 0, 20, DEFAULTS.shimmer) / 20,
        hover: clamp(cfg.hover, 0, 20, DEFAULTS.hover) * 0.09,
    }
}

function buildFilings(count: number): THREE.InstancedBufferGeometry {
    const home = new Float32Array(count * 2)
    const seed = new Float32Array(count)
    const vary = new Float32Array(count)

    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const t = Math.pow(Math.random(), 1.35)
        home[i * 2] = Math.cos(a) * t
        home[i * 2 + 1] = Math.sin(a) * t
        seed[i] = Math.random()
        vary[i] = 0.55 + Math.random() * 0.9
    }

    const base = new THREE.PlaneGeometry(1, 1)
    const geometry = new THREE.InstancedBufferGeometry()
    geometry.index = base.index
    geometry.setAttribute("position", base.attributes.position)
    geometry.setAttribute("uv", base.attributes.uv)
    geometry.setAttribute("aHome", new THREE.InstancedBufferAttribute(home, 2))
    geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1))
    geometry.setAttribute("aVary", new THREE.InstancedBufferAttribute(vary, 1))
    geometry.instanceCount = count
    base.dispose()
    return geometry
}

const FILING_VERTEX = /* glsl */ `
    attribute vec2 aHome;
    attribute float aSeed;
    attribute float aVary;

    uniform float uTime;
    uniform float uCover;
    uniform float uMagnet;
    uniform float uLength;
    uniform float uThickness;
    uniform float uAxis;
    uniform float uPulse;
    uniform float uHeading;
    uniform float uShimmer;

    varying float vStrength;
    varying float vBright;
    varying vec2 vUv;

    const float PI = 3.14159265359;

    vec2 spin(vec2 v, float a) {
        float c = cos(a), s = sin(a);
        return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
    }

    void main() {
        float t = length(aHome);
        vec2 dir = t > 0.0001 ? aHome / t : vec2(0.0, 1.0);
        vec2 paper = dir * mix(uMagnet * ${INNER_BITE}, uCover, t);

        vec2 q = spin(paper, -uAxis);
        float r = max(length(q), 0.0001);
        vec2 rh = q / r;

        vec2 B = 3.0 * rh * rh.y - vec2(0.0, 1.0);
        vec2 along = spin(normalize(B), uAxis);
        vec2 across = vec2(-along.y, along.x);

        float rn = r / max(uMagnet, 0.0001);
        vStrength = clamp(1.0 / (rn * rn * rn), 0.0, 1.0);

        float theta = acos(clamp(rh.y, -1.0, 1.0));
        float sin2 = max(1.0 - rh.y * rh.y, 0.02);
        float L = max(r / sin2, 0.05);
        float g = fract(theta / PI - uTime / L * uHeading);
        float wave = pow(1.0 - abs(g * 2.0 - 1.0), 3.0);
        float flick = 0.5 + 0.5 * sin(uTime * 9.0 + aSeed * 61.0);
        vBright =
            mix(1.0, 0.45 + 0.55 * flick, uShimmer) * (1.0 + uPulse * wave * 2.2);

        float len = uLength * aVary * (0.55 + 0.75 * pow(vStrength, 0.25));

        vec2 e = position.xy;
        vec2 world = paper + along * (e.x * len) + across * (e.y * len * uThickness);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 0.0, 1.0);
    }
`

const FILING_FRAGMENT = /* glsl */ `
    uniform vec3 uFilings;
    uniform vec3 uDistant;
    uniform float uGlow;
    uniform float uBoost;

    varying float vStrength;
    varying float vBright;
    varying vec2 vUv;

    void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float across = abs(p.y);
        float along = abs(p.x);
        if (across > 1.0 || along > 1.0) discard;

        float body = pow(1.0 - across, 4.0) + pow(1.0 - across, 1.4) * 0.28;
        float taper = pow(1.0 - along, 0.65);

        vec3 col = mix(uDistant, uFilings, pow(vStrength, 0.35) + uBoost * 0.35);
        float a = body * taper * vBright * (0.25 + vStrength * 1.1) * uGlow;
        a = clamp(a * (1.0 + uBoost), 0.0, 1.4);
        gl_FragColor = vec4(col * a, a);
    }
`

const MAGNET_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const MAGNET_FRAGMENT = /* glsl */ `
    uniform vec3 uFilings;
    uniform float uGlow;
    uniform float uBoost;
    varying vec2 vUv;

    void main() {
        float d = length(vUv - 0.5) * 2.0;
        if (d > 1.0) discard;
        float fall = 1.0 - d;
        float core = pow(fall, 7.0);
        float skirt = pow(fall, 1.8) * 0.45;
        float a = clamp((core + skirt) * uGlow * (1.0 + uBoost), 0.0, 1.0);
        gl_FragColor = vec4(uFilings * a, a);
    }
`

class FilingsScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)

    private geometry: THREE.InstancedBufferGeometry
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private magnetGeometry = new THREE.PlaneGeometry(1, 1)
    private magnetMaterial: THREE.ShaderMaterial
    private magnetMesh: THREE.Mesh

    private time = 0
    private hovered = false
    private grip = 0

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
        el.style.touchAction = "none"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: FILING_VERTEX,
            fragmentShader: FILING_FRAGMENT,
            uniforms: {
                uTime: { value: 0 },
                uCover: { value: 1.5 },
                uMagnet: { value: S.magnet },
                uLength: { value: S.length },
                uThickness: { value: S.thickness },
                uAxis: { value: S.axis },
                uPulse: { value: S.pulse },
                uHeading: { value: S.heading },
                uShimmer: { value: S.shimmer },
                uFilings: { value: new THREE.Color(cfg.filings) },
                uDistant: { value: new THREE.Color(cfg.distant) },
                uGlow: { value: S.glow },
                uBoost: { value: 0 },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
        })

        this.geometry = buildFilings(S.count)
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        this.magnetMaterial = new THREE.ShaderMaterial({
            vertexShader: MAGNET_VERTEX,
            fragmentShader: MAGNET_FRAGMENT,
            uniforms: {
                uFilings: { value: new THREE.Color(cfg.filings) },
                uGlow: { value: S.glow },
                uBoost: { value: 0 },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
        })
        this.magnetMesh = new THREE.Mesh(this.magnetGeometry, this.magnetMaterial)
        this.scene.add(this.magnetMesh)
        this.sizeMagnet(S.magnet)

        this.bindEvents()
    }

    private sizeMagnet(magnet: number) {
        this.magnetMesh.scale.setScalar(Math.max(0.001, magnet) * 2.6)
    }

    private bindEvents() {
        const el = this.renderer.domElement
        const enter = () => {
            this.hovered = true
        }
        const leave = () => {
            this.hovered = false
        }
        el.addEventListener("pointerenter", enter)
        el.addEventListener("pointerleave", leave)
        el.addEventListener("pointercancel", leave)
        this.unbind = () => {
            el.removeEventListener("pointerenter", enter)
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
        this.updateCamera()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.material.uniforms

        u.uMagnet.value = S.magnet
        u.uLength.value = S.length
        u.uThickness.value = S.thickness
        u.uAxis.value = S.axis
        u.uPulse.value = S.pulse
        u.uHeading.value = S.heading
        u.uShimmer.value = S.shimmer
        u.uGlow.value = S.glow
        u.uFilings.value.set(cfg.filings || "#ffffff")
        u.uDistant.value.set(cfg.distant || "#ffffff")

        this.magnetMaterial.uniforms.uFilings.value.set(cfg.filings || "#ffffff")
        this.magnetMaterial.uniforms.uGlow.value = S.glow
        this.sizeMagnet(S.magnet)

        if (cfg.density !== prev.density) {
            const next = buildFilings(S.count)
            this.geometry.dispose()
            this.geometry = next
            this.mesh.geometry = next
        }
        this.updateCamera()
    }

    private updateCamera() {
        const w = Math.max(1, this.width)
        const h = Math.max(1, this.height)
        const aspect = w / h
        const distance = 1 / PERSPECTIVE
        const visibleHeight = aspect < 1 ? 2.0 / aspect : 2.0

        this.camera.aspect = aspect
        this.camera.position.set(0, 0, distance)
        this.camera.lookAt(0, 0, 0)
        this.camera.fov =
            2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI)
        this.camera.near = Math.max(0.1, distance - 20)
        this.camera.far = distance + 20
        this.camera.updateProjectionMatrix()

        const halfH = visibleHeight / 2
        const halfW = halfH * aspect
        this.material.uniforms.uCover.value =
            Math.hypot(halfW, halfH) * CORNER_MARGIN
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

        const target = this.hovered ? 1 : 0
        this.grip += (target - this.grip) * (1 - Math.exp(-dt * 4))
        const boost = this.grip * S.hover

        this.material.uniforms.uTime.value = this.time
        this.material.uniforms.uBoost.value = boost
        this.magnetMaterial.uniforms.uBoost.value = boost

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.unbind()
        this.geometry.dispose()
        this.material.dispose()
        this.magnetGeometry.dispose()
        this.magnetMaterial.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

interface MagnetFilamentsProps {
    filings?: string
    distant?: string
    density?: number
    filament?: number
    thickness?: number
    magnet?: number
    axis?: number
    glow?: number
    pulse?: number
    speed?: number
    direction?: "out" | "in"
    shimmer?: number
    hover?: number
    sizePercent?: number
    style?: React.CSSProperties
}

export default function MagnetFilaments(props: MagnetFilamentsProps) {
    const {
        filings = DEFAULTS.filings,
        distant = DEFAULTS.distant,
        density = DEFAULTS.density,
        filament = DEFAULTS.filament,
        thickness = DEFAULTS.thickness,
        magnet = DEFAULTS.magnet,
        axis = DEFAULTS.axis,
        glow = DEFAULTS.glow,
        pulse = DEFAULTS.pulse,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction,
        shimmer = DEFAULTS.shimmer,
        hover = DEFAULTS.hover,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<FilingsScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        filings,
        distant,
        density,
        filament,
        thickness,
        magnet,
        axis,
        glow,
        pulse,
        speed,
        direction,
        shimmer,
        hover,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: FilingsScene
        try {
            scene = new FilingsScene(container, cfgRef.current)
        } catch {
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
        filings,
        distant,
        density,
        filament,
        thickness,
        magnet,
        axis,
        glow,
        pulse,
        speed,
        direction,
        shimmer,
        hover,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Iron filings aligned to a magnetic field"
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

MagnetFilaments.displayName = "Magnet Filaments"
