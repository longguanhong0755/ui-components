"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Phyllotaxis Disc — a seed head, with a pulse running out through it.
 *
 * Seeds are placed at the golden angle, 137.5°, one turn per seed, at a radius
 * proportional to the square root of the index. Those two rules together are the
 * only reason a sunflower packs evenly: the square root keeps the area per seed
 * constant, and the golden angle is the one rotation that never lets a seed line
 * up behind an earlier one, so no radial gaps ever open. Any rational multiple
 * of a turn collapses into visible spokes within a few dozen seeds.
 *
 * Every seed is one instance of a single disc, placed entirely in the vertex
 * shader from its index. Nothing is written per frame, and the whole head is one
 * draw call at any count.
 *
 * The head turns to face the cursor, which is what a real one does with the sun,
 * and the near side of it lights accordingly.
 */

const PERSPECTIVE = 0.15

const DEFAULTS = {
    seed: "#2B1B10",
    ripe: "#E9A13B",
    flash: "#FFF0C8",
    count: 9,
    spread: 1,
    disc: 3,
    interval: 6,
    depth: 20,
    swirl: 0,
    tilt: 16,
    glow: 4,
    speed: 10,
    followPointer: true,
    turn: 10,
    size: 110,
}

type Config = {
    seed: string
    ripe: string
    flash: string
    count: number
    spread: number
    disc: number
    interval: number
    depth: number
    swirl: number
    tilt: number
    glow: number
    speed: number
    followPointer: boolean
    turn: number
    size: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the scene wants the real ones. */
function settingsFor(cfg: Config) {
    const count = clamp(cfg.count, 1, 20, DEFAULTS.count)
    const spread = 0.012 + clamp(cfg.spread, 1, 20, DEFAULTS.spread) * 0.0022
    // Squared: below a few hundred seeds the spiral arms do not read at all.
    const seeds = Math.round(120 + count * count * 11)
    return {
        seeds,
        spread,
        disc: 0.006 + clamp(cfg.disc, 1, 20, DEFAULTS.disc) * 0.0022,
        // Wavelength of the pulse, measured in radius rather than in seeds, so
        // it stays the same shape when the count changes.
        interval: 4.0 + (21 - clamp(cfg.interval, 1, 20, DEFAULTS.interval)) * 2.2,
        depth: clamp(cfg.depth, 0, 20, DEFAULTS.depth) * 0.006,
        swirl: clamp(cfg.swirl, 0, 20, DEFAULTS.swirl) * 0.03,
        tilt: clamp(cfg.tilt, 0, 25, DEFAULTS.tilt) * 0.035,
        glow: clamp(cfg.glow, 0, 20, DEFAULTS.glow) * 0.07,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.28,
        // Radians of lean at the far corner of the frame. Kept under about half
        // a radian: past that the head turns its back and the spiral is lost.
        turn: clamp(cfg.turn, 0, 20, DEFAULTS.turn) * 0.055,
        // Outermost seed sits at spread · sqrt(n); that is what has to be framed.
        reach: spread * Math.sqrt(seeds),
        // Overall scale of the head, as a fraction — 1 is the framed default.
        size: clamp(cfg.size, 20, 200, DEFAULTS.size) / 100,
    }
}

const SEED_VERTEX = /* glsl */ `
    attribute float aIndex;

    uniform float uTime;
    uniform float uSpread;
    uniform float uDisc;
    uniform float uInterval;
    uniform float uDepth;
    uniform float uSwirl;
    uniform vec2 uSun;
    uniform float uGrip;

    varying float vPulse;
    varying float vRadial;
    varying float vLight;

    void main() {
        // The golden angle, and only the golden angle: any rational fraction of
        // a turn collapses the head into spokes within a few dozen seeds.
        float th = aIndex * 2.39996323 + uTime * uSwirl;
        // Square root keeps the area each seed occupies constant.
        float rad = uSpread * sqrt(aIndex);
        vec2 centre = vec2(cos(th), sin(th)) * rad;

        // A pulse travelling out from the middle. Radius, not index, so the
        // wavelength holds its shape when the seed count changes.
        float pulse = sin(rad * uInterval - uTime * 2.2);

        // Seeds stand a little proud on a crest, which is what makes the pulse
        // legible from the side rather than only as a change in colour.
        float lift = pulse * uDepth;
        float s = uDisc * (0.68 + 0.32 * pulse);

        vec3 p = vec3(position.xy * s + centre, lift);

        vPulse = pulse * 0.5 + 0.5;
        vRadial = clamp(rad / max(uSpread * 40.0, 0.0001), 0.0, 1.0);
        // The side of the head facing the light comes up brighter.
        vLight = 0.5 + 0.5 * dot(normalize(centre + vec2(0.0001)), uSun) * uGrip;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
`

const SEED_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec3 uSeed;
    uniform vec3 uRipe;
    uniform vec3 uFlash;
    uniform float uGlow;

    varying float vPulse;
    varying float vRadial;
    varying float vLight;

    void main() {
        // Three stops. Seed to ripe covers most of the pulse; the flash is only
        // the very top of a crest, so the wave has a bright edge rather than a
        // uniform tint.
        vec3 col = mix(uSeed, uRipe, smoothstep(0.15, 0.8, vPulse));
        col = mix(col, uFlash, smoothstep(0.86, 1.0, vPulse));
        col *= 0.6 + vLight * 0.7;
        // Outer seeds are younger and paler.
        col = mix(col, uRipe, vRadial * 0.2);
        col += uFlash * pow(vPulse, 6.0) * uGlow * 1.6;

        gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
`

class SeedHeadScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200)
    private group = new THREE.Group()
    private geometry = new THREE.CircleGeometry(1, 12)
    private material: THREE.ShaderMaterial
    private mesh: THREE.InstancedMesh

    private width = 1
    private height = 1

    private pointer = new THREE.Vector2(0.5, 0.5)
    private pointerTarget = new THREE.Vector2(0.5, 0.5)
    private grip = 0
    private gripTarget = 0
    private leanX = 0
    private leanY = 0

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
            vertexShader: SEED_VERTEX,
            fragmentShader: SEED_FRAGMENT,
            uniforms: {
                uTime: { value: 0 },
                uSpread: { value: S.spread },
                uDisc: { value: S.disc },
                uInterval: { value: S.interval },
                uDepth: { value: S.depth },
                uSwirl: { value: S.swirl },
                uSun: { value: new THREE.Vector2(0, 1) },
                uGrip: { value: 0 },
                uSeed: { value: new THREE.Color(cfg.seed) },
                uRipe: { value: new THREE.Color(cfg.ripe) },
                uFlash: { value: new THREE.Color(cfg.flash) },
                uGlow: { value: S.glow },
            },
        })

        this.mesh = this.buildSeeds(S.seeds)
        this.group.add(this.mesh)
        this.group.rotation.x = -S.tilt
        this.scene.add(this.group)

        container.addEventListener("pointerenter", this.onEnter)
        container.addEventListener("pointerleave", this.onLeave)
        container.addEventListener("pointercancel", this.onLeave)
        container.addEventListener("pointermove", this.onMove)
    }

    private buildSeeds(count: number) {
        const mesh = new THREE.InstancedMesh(this.geometry, this.material, count)
        /*
         * The instance matrix buffer starts zero-filled, and a zero matrix
         * collapses every instance to nothing. The shader does the placing, but
         * three still multiplies through this.
         */
        const identity = new THREE.Matrix4()
        const index = new Float32Array(count)
        for (let i = 0; i < count; i++) {
            mesh.setMatrixAt(i, identity)
            // Offset by one: seed zero would sit exactly on the axis and its
            // normalised direction would be undefined.
            index[i] = i + 1
        }
        mesh.instanceMatrix.needsUpdate = true
        mesh.geometry.setAttribute(
            "aIndex",
            new THREE.InstancedBufferAttribute(index, 1)
        )
        mesh.frustumCulled = false
        return mesh
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
        // The head at full tilt is no wider than its own reach, so the span is
        // simply that, with room for the lean. A smaller visible span makes the
        // same head fill more of the frame, so Size zooms by dividing here.
        const span = (S.reach * 2.5) / S.size
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
        const prev = this.cfg
        this.cfg = cfg
        const S = settingsFor(cfg)

        // Only the seed count owns a buffer.
        if (cfg.count !== prev.count) {
            this.group.remove(this.mesh)
            this.mesh.dispose()
            this.mesh = this.buildSeeds(S.seeds)
            this.group.add(this.mesh)
        }

        const u = this.material.uniforms
        u.uSpread.value = S.spread
        u.uDisc.value = S.disc
        u.uInterval.value = S.interval
        u.uDepth.value = S.depth
        u.uSwirl.value = S.swirl
        u.uGlow.value = S.glow
        u.uSeed.value.set(cfg.seed || "#2B1B10")
        u.uRipe.value.set(cfg.ripe || "#E9A13B")
        u.uFlash.value.set(cfg.flash || "#FFF0C8")

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

        this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-dt * 8))
        const want = this.cfg.followPointer ? this.gripTarget : 0
        this.grip += (want - this.grip) * (1 - Math.exp(-dt * 3.5))

        /*
         * The head turns to the cursor the way a real one turns to the sun —
         * eased, and slowly. Snapping the rotation to the pointer makes it read
         * as a mirror rather than as something alive.
         */
        const wantX = -S.tilt - (this.pointer.y - 0.5) * 2 * S.turn * this.grip
        const wantY = (this.pointer.x - 0.5) * 2 * S.turn * this.grip
        const k = 1 - Math.exp(-dt * 3)
        this.leanX += (wantX - this.leanX) * k
        this.leanY += (wantY - this.leanY) * k
        this.group.rotation.x = this.leanX
        this.group.rotation.y = this.leanY

        const u = this.material.uniforms
        u.uTime.value = this.time
        // Direction to the light, in the plane of the head.
        const dx = this.pointer.x - 0.5
        const dy = this.pointer.y - 0.5
        const len = Math.hypot(dx, dy) || 1
        u.uSun.value.set(dx / len, dy / len)
        u.uGrip.value = this.grip

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.container.removeEventListener("pointerenter", this.onEnter)
        this.container.removeEventListener("pointerleave", this.onLeave)
        this.container.removeEventListener("pointercancel", this.onLeave)
        this.container.removeEventListener("pointermove", this.onMove)
        this.mesh.dispose()
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface PhyllotaxisDiscProps {
    seed?: string
    ripe?: string
    flash?: string
    count?: number
    spread?: number
    disc?: number
    interval?: number
    depth?: number
    swirl?: number
    tilt?: number
    glow?: number
    speed?: number
    followPointer?: boolean
    turn?: number
    size?: number
    style?: React.CSSProperties
}

export default function PhyllotaxisDisc(props: PhyllotaxisDiscProps) {
    const {
        seed = DEFAULTS.seed,
        ripe = DEFAULTS.ripe,
        flash = DEFAULTS.flash,
        count = DEFAULTS.count,
        spread = DEFAULTS.spread,
        disc = DEFAULTS.disc,
        interval = DEFAULTS.interval,
        depth = DEFAULTS.depth,
        swirl = DEFAULTS.swirl,
        tilt = DEFAULTS.tilt,
        glow = DEFAULTS.glow,
        speed = DEFAULTS.speed,
        followPointer = DEFAULTS.followPointer,
        turn = DEFAULTS.turn,
        size = DEFAULTS.size,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<SeedHeadScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        seed,
        ripe,
        flash,
        count,
        spread,
        disc,
        interval,
        depth,
        swirl,
        tilt,
        glow,
        speed,
        followPointer,
        turn,
        size,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: SeedHeadScene
        try {
            scene = new SeedHeadScene(container, cfgRef.current)
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
        seed,
        ripe,
        flash,
        count,
        spread,
        disc,
        interval,
        depth,
        swirl,
        tilt,
        glow,
        speed,
        followPointer,
        turn,
        size,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A seed head packed on the golden angle, with a pulse running outward"
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

PhyllotaxisDisc.displayName = "Phyllotaxis Disc"
PhyllotaxisDisc.defaultProps = { ...DEFAULTS }
