"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Low Poly Asteroid — a faceted rock tumbling in space that blows apart into
 * its own facets when clicked and pulls itself back together.
 *
 * The shatter runs entirely in the vertex shader: every triangle carries its
 * centroid and a random seed as attributes, so a single uniform can throw all
 * three hundred facets outward and spin each one about its own centre. That is
 * one draw call for the whole break-up — splitting the rock into real meshes
 * would cost hundreds.
 */

const PERSPECTIVE = 0.15

// Pixels of pointer travel a press may carry and still count as a click.
const DRAG_SLOP = 5

const DEFAULTS = {
    detail: 3,
    roughness: 100,
    colorA: "#000000",
    colorB: "#FFD900",
    rimColor: "#FFFFFF",
    shatter: {
        enabled: true,
        distance: 100,
        tumble: 12,
    },
    transition: {
        type: "tween",
        duration: 0.75,
        delay: 0.6,
        ease: "backOut",
    } as Transition,
    rotation: { x: 3, y: 5, z: 1 },
    dragSensitivity: 10,
    sizePercent: 100,
}

type Transition = {
    type?: string
    duration?: number
    // Read as the beat the rock stays apart before it pulls itself back
    // together — the break has nothing in front of it to be delayed against.
    delay?: number
    ease?: string | number[]
}

type Config = {
    detail: number
    roughness: number
    colorA: string
    colorB: string
    rimColor: string
    shatter: { enabled: boolean; distance: number; tumble: number }
    transition: Transition
    rotation: { x: number; y: number; z: number }
    dragSensitivity: number
    sizePercent: number
}

const NAMED_EASES: Record<string, number[]> = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
    circIn: [0.55, 0, 1, 0.45],
    circOut: [0, 0.55, 0.45, 1],
    circInOut: [0.85, 0, 0.15, 1],
    backIn: [0.36, 0, 0.66, -0.56],
    backOut: [0.34, 1.56, 0.64, 1],
    backInOut: [0.68, -0.6, 0.32, 1.6],
    anticipate: [0.36, 0, 0.66, -0.56],
}

/** The Transition control is sampled by hand — its ease is a bezier lookup. */
function makeEaseFn(transition?: Transition) {
    let pts: number[] = NAMED_EASES.backOut
    const ease = transition?.ease
    if (Array.isArray(ease) && ease.length === 4 && ease.every(Number.isFinite))
        pts = ease as number[]
    else if (typeof ease === "string" && NAMED_EASES[ease])
        pts = NAMED_EASES[ease]

    const [x1, y1, x2, y2] = pts
    if (x1 === y1 && x2 === y2) return (t: number) => t

    const bez = (a: number, b: number, t: number) => {
        const u = 1 - t
        return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t
    }
    return (t: number) => {
        const x = Math.max(0, Math.min(1, t))
        let s = x
        for (let i = 0; i < 8; i++) {
            const cx = bez(x1, x2, s) - x
            const u = 1 - s
            const dx =
                3 * u * u * x1 + 6 * u * s * (x2 - x1) + 3 * s * s * (1 - x2)
            if (Math.abs(dx) < 1e-6) break
            s -= cx / dx
            s = Math.max(0, Math.min(1, s))
        }
        return bez(y1, y2, s)
    }
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

function hash(x: number, y: number, z: number): number {
    const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
    return s - Math.floor(s)
}

/** Value noise on the sphere, used to knock the rock out of round. */
function noise3(x: number, y: number, z: number): number {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const zi = Math.floor(z)
    const xf = x - xi
    const yf = y - yi
    const zf = z - zi
    const u = xf * xf * (3 - 2 * xf)
    const v = yf * yf * (3 - 2 * yf)
    const w = zf * zf * (3 - 2 * zf)

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const c = (i: number, j: number, k: number) => hash(xi + i, yi + j, zi + k)

    const x00 = lerp(c(0, 0, 0), c(1, 0, 0), u)
    const x10 = lerp(c(0, 1, 0), c(1, 1, 0), u)
    const x01 = lerp(c(0, 0, 1), c(1, 0, 1), u)
    const x11 = lerp(c(0, 1, 1), c(1, 1, 1), u)
    return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w) * 2 - 1
}

const ROCK_VERTEX = /* glsl */ `
    attribute vec3 aCentroid;
    attribute vec3 aSeed;
    uniform float uShatter;
    uniform float uDistance;
    uniform float uTumble;
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vHeight;

    // Rodrigues rotation: a facet spins about an axis through its own centroid,
    // which is what makes the debris tumble instead of sliding outward flat.
    vec3 rotateAround(vec3 p, vec3 axis, float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return p * c + cross(axis, p) * s + axis * dot(axis, p) * (1.0 - c);
    }

    void main() {
        vec3 local = position - aCentroid;
        vec3 axis = normalize(aSeed * 2.0 - 1.0 + vec3(0.001));
        local = rotateAround(local, axis, uShatter * uTumble * aSeed.x);

        // Each facet flies along its own centroid direction, scattered a little
        // by its seed so the cloud does not expand as a perfect shell.
        vec3 dir = normalize(aCentroid + (aSeed - 0.5) * 0.6);
        vec3 world = aCentroid + dir * uShatter * uDistance + local;

        vHeight = length(aCentroid);
        vec4 mv = modelViewMatrix * vec4(world, 1.0);
        // The normal turns with its facet, so a tumbling shard catches light
        // from the face it is actually showing.
        vNormal = normalize(
            normalMatrix * rotateAround(normal, axis, uShatter * uTumble * aSeed.x)
        );
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
    }
`

const ROCK_FRAGMENT = /* glsl */ `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uRim;
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vHeight;

    void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(vView);

        // Ridges keep the light colour and hollows the dark one, so the rock
        // reads as worn stone rather than tinted plastic.
        float t = clamp((vHeight - 0.82) * 2.4, 0.0, 1.0);
        vec3 base = mix(uColorB, uColorA, t);

        float diff = clamp(dot(n, normalize(vec3(0.5, 0.7, 0.9))), 0.0, 1.0);
        float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);

        vec3 col = base * (0.22 + diff * 0.95) + uRim * rim * 0.5;
        gl_FragColor = vec4(col, 1.0);
    }
`

class AsteroidScene {
    private container: HTMLElement
    private cfg: Config
    private ease: (t: number) => number

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)
    private group = new THREE.Group()

    private geometry: THREE.BufferGeometry
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    // Shatter clock: out, hold, back. `phase` is -1 when idle.
    private phase = -1
    private clock = 0

    private ax = 0.3
    private ay = 0.4
    private isDragging = false
    private lastX = 0
    private lastY = 0
    // Distance the pointer has travelled since it went down, which is what
    // separates a click from a drag that happens to end where it started.
    private travelled = 0

    private width = 0
    private height = 0
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        this.ease = makeEaseFn(cfg.transition)

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
            vertexShader: ROCK_VERTEX,
            fragmentShader: ROCK_FRAGMENT,
            uniforms: {
                uShatter: { value: 0 },
                uDistance: { value: 0.6 },
                uTumble: { value: 6 },
                uColorA: { value: new THREE.Color(cfg.colorA) },
                uColorB: { value: new THREE.Color(cfg.colorB) },
                uRim: { value: new THREE.Color(cfg.rimColor) },
            },
        })

        this.geometry = this.buildGeometry()
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.group.add(this.mesh)
        this.scene.add(this.group)

        this.bindEvents()
    }

    /**
     * The rock is an icosahedron pushed in and out by noise, then flattened to
     * per-triangle normals. Centroids and seeds are baked in as attributes so
     * the shader can treat each triangle as an independent body.
     */
    private buildGeometry(): THREE.BufferGeometry {
        const detail = clamp(this.cfg.detail, 0, 3, 2)
        const rough = clamp(this.cfg.roughness, 0, 100, 30) / 100

        const base = new THREE.IcosahedronGeometry(1, detail)
        const positions = base.getAttribute("position") as THREE.BufferAttribute
        const v = new THREE.Vector3()
        for (let i = 0; i < positions.count; i++) {
            v.fromBufferAttribute(positions, i)
            // Sampling the noise on the unit direction keeps shared vertices in
            // agreement, so the surface has no cracks.
            const n =
                noise3(v.x * 2.2, v.y * 2.2, v.z * 2.2) * 0.7 +
                noise3(v.x * 5.1, v.y * 5.1, v.z * 5.1) * 0.3
            v.multiplyScalar(1 + n * rough * 0.5)
            positions.setXYZ(i, v.x, v.y, v.z)
        }

        const geometry = base.toNonIndexed()
        base.dispose()
        geometry.computeVertexNormals()

        const pos = geometry.getAttribute("position") as THREE.BufferAttribute
        const centroids = new Float32Array(pos.count * 3)
        const seeds = new Float32Array(pos.count * 3)
        for (let t = 0; t < pos.count; t += 3) {
            let cx = 0
            let cy = 0
            let cz = 0
            for (let k = 0; k < 3; k++) {
                cx += pos.getX(t + k)
                cy += pos.getY(t + k)
                cz += pos.getZ(t + k)
            }
            cx /= 3
            cy /= 3
            cz /= 3
            const s0 = hash(cx, cy, cz)
            const s1 = hash(cy + 3.1, cz + 1.7, cx + 9.4)
            const s2 = hash(cz + 6.2, cx + 4.4, cy + 2.9)
            for (let k = 0; k < 3; k++) {
                const i = (t + k) * 3
                centroids[i] = cx
                centroids[i + 1] = cy
                centroids[i + 2] = cz
                seeds[i] = s0
                seeds[i + 1] = s1
                seeds[i + 2] = s2
            }
        }
        geometry.setAttribute(
            "aCentroid",
            new THREE.BufferAttribute(centroids, 3)
        )
        geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3))
        return geometry
    }

    private bindEvents() {
        const el = this.renderer.domElement
        const down = (e: PointerEvent) => {
            this.isDragging = true
            this.lastX = e.clientX
            this.lastY = e.clientY
            this.travelled = 0
            el.style.cursor = "grabbing"
        }
        const move = (e: PointerEvent) => {
            if (!this.isDragging) return
            const dx = e.clientX - this.lastX
            const dy = e.clientY - this.lastY
            this.lastX = e.clientX
            this.lastY = e.clientY
            // Path length, not the distance back to where it started: a drag
            // that loops round to its own starting point is still a drag.
            this.travelled += Math.hypot(dx, dy)
            const s = clamp(this.cfg.dragSensitivity, 0, 10, 3) * 0.007
            this.ay += dx * s
            this.ax += dy * s
        }
        const up = () => {
            this.isDragging = false
            el.style.cursor = "grab"
        }
        const click = () => {
            // A drag that begins and ends on the canvas still fires a click, so
            // the rock used to break every time one was released on it. Anything
            // past a few pixels of travel was a drag and is left alone — the
            // slack is there because a real click almost always carries a pixel
            // or two of wobble with it.
            if (this.travelled > DRAG_SLOP) return
            if (this.cfg.shatter.enabled && this.phase < 0) {
                this.phase = 0
                this.clock = 0
            }
        }
        el.addEventListener("pointerdown", down)
        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", up)
        el.addEventListener("pointerleave", up)
        el.addEventListener("click", click)
        this.unbind = () => {
            el.removeEventListener("pointerdown", down)
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerup", up)
            el.removeEventListener("pointerleave", up)
            el.removeEventListener("click", click)
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
        this.ease = makeEaseFn(cfg.transition)
        const u = this.material.uniforms
        u.uColorA.value.set(cfg.colorA)
        u.uColorB.value.set(cfg.colorB)
        u.uRim.value.set(cfg.rimColor)
        u.uDistance.value = clamp(cfg.shatter.distance, 0, 200, 60) / 100
        u.uTumble.value = clamp(cfg.shatter.tumble, 0, 12, 6)

        if (cfg.detail !== prev.detail || cfg.roughness !== prev.roughness) {
            const next = this.buildGeometry()
            this.geometry.dispose()
            this.geometry = next
            this.mesh.geometry = next
        }
        if (!cfg.shatter.enabled) {
            this.phase = -1
            u.uShatter.value = 0
        }
        this.updateCamera()
    }

    private updateCamera() {
        const w = Math.max(1, this.width)
        const h = Math.max(1, this.height)
        const aspect = w / h
        const distance = 1 / PERSPECTIVE
        const sizePct = clamp(this.cfg.sizePercent, 20, 200, 85)
        // The frame allows for the debris, so a big shatter is not clipped.
        const reach = 1 + clamp(this.cfg.shatter.distance, 0, 200, 60) / 140
        const span = reach * 2.7 * (100 / sizePct)
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

        if (!this.isDragging) {
            const rot = this.cfg.rotation
            const k = 0.05
            this.ax += clamp(rot?.x ?? 0, -12, 12, 0) * k * dt
            this.ay += clamp(rot?.y ?? 0, -12, 12, 0) * k * dt
            this.group.rotation.z += clamp(rot?.z ?? 0, -12, 12, 0) * k * dt
        }
        this.group.rotation.x = this.ax
        this.group.rotation.y = this.ay

        // Out on the Transition's duration, held apart for its delay, then back
        // on the same duration — one click is the whole cycle.
        const duration = Math.max(0.1, this.cfg.transition?.duration ?? 0.75)
        const hold = clamp(this.cfg.transition?.delay ?? 0, 0, 10, 0)
        if (this.phase >= 0) {
            this.clock += dt
            let raw = 0
            if (this.clock < duration) {
                raw = this.clock / duration
            } else if (this.clock < duration + hold) {
                raw = 1
            } else if (this.clock < duration * 2 + hold) {
                raw = 1 - (this.clock - duration - hold) / duration
            } else {
                raw = 0
                this.phase = -1
            }
            this.material.uniforms.uShatter.value = this.ease(
                Math.max(0, Math.min(1, raw))
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

type Props = Partial<Config> & { style?: React.CSSProperties }

export default function LowPolyAsteroid(props: Props) {
    const {
        detail = DEFAULTS.detail,
        roughness = DEFAULTS.roughness,
        colorA = DEFAULTS.colorA,
        colorB = DEFAULTS.colorB,
        rimColor = DEFAULTS.rimColor,
        shatter = DEFAULTS.shatter,
        transition = DEFAULTS.transition,
        rotation = DEFAULTS.rotation,
        dragSensitivity = DEFAULTS.dragSensitivity,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<AsteroidScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        detail,
        roughness,
        colorA,
        colorB,
        rimColor,
        shatter,
        transition,
        rotation,
        dragSensitivity,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: AsteroidScene
        try {
            scene = new AsteroidScene(container, cfgRef.current)
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
        detail,
        roughness,
        colorA,
        colorB,
        rimColor,
        shatter?.enabled,
        shatter?.distance,
        shatter?.tumble,
        transition,
        rotation?.x,
        rotation?.y,
        rotation?.z,
        dragSensitivity,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Low poly asteroid"
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

LowPolyAsteroid.displayName = "Low Poly Asteroid"
LowPolyAsteroid.defaultProps = { ...DEFAULTS }
