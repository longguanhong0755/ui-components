"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Metallic Dodecahedron — a platonic solid in polished metal whose faces lift
 * off the body when clicked, hold apart for a beat and settle back, draggable
 * and tumbling on its own.
 *
 * Each face is its own mesh, cut out of the solid by grouping triangles that
 * share a normal — that is what lets a face travel along its own normal during
 * the burst instead of the whole solid scaling up. The metal is a matcap, so
 * the scene needs no lights for it.
 */

// A matcap is a lit sphere baked into an image, sampled by the view-space
// normal — the same texture the cube elements use, which is what makes the
// finishes match across the set.
const POLISHED_METAL_MATCAP =
    "https://framerusercontent.com/images/Wkm2ineJ1Md7Xb1oyjF6dqbAw.png"

const PERSPECTIVE = 0.15

// Pixels of pointer travel a press may carry and still count as a click.
const DRAG_SLOP = 5

type Transition = {
    type?: string
    duration?: number
    // Read as the beat the faces stay lifted before they settle back — the
    // burst has nothing in front of it to be delayed against.
    delay?: number
    ease?: string | number[]
}

type Config = {
    shape: "tetrahedron" | "octahedron" | "dodecahedron" | "icosahedron"
    finish: "metal" | "solid" | "wire"
    tint: string
    color: string
    edges: boolean
    edgeColor: string
    burst: { enabled: boolean; distance: number; twist: number }
    transition: Transition
    rotation: { x: number; y: number; z: number }
    dragSensitivity: number
    sizePercent: number
}

const DEFAULTS: Config = {
    shape: "dodecahedron",
    finish: "metal",
    tint: "#FFFFFF",
    color: "#E8542F",
    edges: true,
    edgeColor: "#FFFFFF",
    burst: {
        enabled: true,
        distance: 30,
        twist: 20,
    },
    transition: {
        type: "tween",
        duration: 0.6,
        delay: 0.6,
        ease: "easeOut",
    },
    rotation: { x: 2, y: 6, z: 0 },
    dragSensitivity: 10,
    sizePercent: 100,
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

/**
 * The Transition control is sampled by hand — its ease becomes a cubic-bezier
 * lookup. Springs have no closed form to sample here, so they fall back to the
 * default curve and keep their duration.
 */
function makeEaseFn(transition?: Transition) {
    let pts: number[] = NAMED_EASES.easeOut
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

function baseGeometry(shape: Config["shape"]): THREE.BufferGeometry {
    switch (shape) {
        case "tetrahedron":
            return new THREE.TetrahedronGeometry(1)
        case "octahedron":
            return new THREE.OctahedronGeometry(1)
        case "icosahedron":
            return new THREE.IcosahedronGeometry(1)
        default:
            return new THREE.DodecahedronGeometry(1)
    }
}

type Face = {
    mesh: THREE.Mesh
    normal: THREE.Vector3
}

/** The matcap is loaded once per document — several solids share the texture. */
let matcapTexture: THREE.Texture | null = null
let matcapPending: Promise<THREE.Texture | null> | null = null

function loadMatcap(): Promise<THREE.Texture | null> {
    if (matcapTexture) return Promise.resolve(matcapTexture)
    if (matcapPending) return matcapPending
    matcapPending = new Promise((resolve) => {
        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin("anonymous")
        loader.load(
            POLISHED_METAL_MATCAP,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace
                matcapTexture = texture
                resolve(texture)
            },
            undefined,
            () => resolve(null)
        )
    })
    return matcapPending
}

class SolidScene {
    private container: HTMLElement
    private cfg: Config
    private ease: (t: number) => number

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)
    private group = new THREE.Group()

    private faces: Face[] = []
    private edgeLines: THREE.LineSegments | null = null
    private matcapMaterial: THREE.MeshMatcapMaterial
    private solidMaterial: THREE.MeshLambertMaterial
    private wireMaterial: THREE.MeshBasicMaterial
    private edgeMaterial: THREE.LineBasicMaterial
    private ambient = new THREE.AmbientLight(0xffffff, 0.6)
    private key = new THREE.DirectionalLight(0xffffff, 0.9)

    // Burst clock: out, hold, back. `phase` is -1 when idle.
    private phase = -1
    private clock = 0

    private ax = 0.4
    private ay = 0.5
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

        this.matcapMaterial = new THREE.MeshMatcapMaterial({
            color: new THREE.Color(cfg.tint || "#ffffff"),
        })
        this.solidMaterial = new THREE.MeshLambertMaterial({
            color: new THREE.Color(cfg.color || "#ffffff"),
            flatShading: true,
        })
        this.wireMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(cfg.color || "#ffffff"),
            wireframe: true,
        })
        this.edgeMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(cfg.edgeColor || "#ffffff"),
            transparent: true,
            opacity: 0.5,
        })

        this.key.position.set(0.5, 0.8, 1)
        this.camera.add(this.key)
        this.scene.add(this.ambient, this.camera, this.group)

        this.build()
        this.bindEvents()
        if (cfg.finish === "metal") this.ensureMatcap()
    }

    private ensureMatcap() {
        if (this.matcapMaterial.matcap) return
        loadMatcap().then((t) => {
            if (this.disposed || !t) return
            this.matcapMaterial.matcap = t
            this.matcapMaterial.needsUpdate = true
        })
    }

    private material() {
        if (this.cfg.finish === "metal") return this.matcapMaterial
        if (this.cfg.finish === "wire") return this.wireMaterial
        return this.solidMaterial
    }

    /**
     * Triangles are bucketed by the plane they lie in: a pentagon of a
     * dodecahedron is three triangles that all point the same way, so one bucket
     * is one face. Each bucket becomes a mesh centred on its own centroid, which
     * is what lets a face rotate about itself during the twist.
     *
     * The normal is worked out here from the triangle's own corners rather than
     * read off the geometry. PolyhedronGeometry — which every one of these
     * solids is built from — stores each vertex's normalised POSITION as its
     * normal, for smooth shading. Those point in as many directions as there are
     * corners, so bucketing by them split every pentagon into its three separate
     * triangles and sent each one off along a corner instead of along the face.
     */
    private build() {
        this.clear()
        const source = baseGeometry(this.cfg.shape).toNonIndexed()
        const pos = source.getAttribute("position") as THREE.BufferAttribute

        // A dodecahedron's faces point along axes with exact zeros in them, and
        // -0 and 0 write themselves differently — without this the same plane
        // can land in two buckets.
        const q = (v: number) => (Math.abs(v) < 1e-6 ? 0 : v).toFixed(3)

        const a = new THREE.Vector3()
        const b = new THREE.Vector3()
        const c = new THREE.Vector3()
        const ab = new THREE.Vector3()
        const ac = new THREE.Vector3()
        const fn = new THREE.Vector3()

        const buckets = new Map<
            string,
            { starts: number[]; normal: THREE.Vector3 }
        >()
        for (let t = 0; t < pos.count; t += 3) {
            a.fromBufferAttribute(pos, t)
            b.fromBufferAttribute(pos, t + 1)
            c.fromBufferAttribute(pos, t + 2)
            ab.subVectors(b, a)
            ac.subVectors(c, a)
            // Wound counter-clockwise from outside, so this points outward.
            fn.crossVectors(ab, ac).normalize()
            const key = `${q(fn.x)}|${q(fn.y)}|${q(fn.z)}`
            const entry = buckets.get(key)
            if (entry) entry.starts.push(t)
            else buckets.set(key, { starts: [t], normal: fn.clone() })
        }

        const material = this.material()
        for (const { starts, normal } of buckets.values()) {
            const verts: number[] = []
            const centroid = new THREE.Vector3()
            for (const t of starts)
                for (let k = 0; k < 3; k++) {
                    const i = t + k
                    centroid.x += pos.getX(i)
                    centroid.y += pos.getY(i)
                    centroid.z += pos.getZ(i)
                }
            centroid.divideScalar(starts.length * 3)

            for (const t of starts)
                for (let k = 0; k < 3; k++) {
                    const i = t + k
                    verts.push(
                        pos.getX(i) - centroid.x,
                        pos.getY(i) - centroid.y,
                        pos.getZ(i) - centroid.z
                    )
                }

            const geometry = new THREE.BufferGeometry()
            geometry.setAttribute(
                "position",
                new THREE.Float32BufferAttribute(verts, 3)
            )
            geometry.computeVertexNormals()

            const mesh = new THREE.Mesh(geometry, material)
            mesh.position.copy(centroid)
            mesh.userData.home = centroid.clone()
            this.faces.push({ mesh, normal: normal.clone() })
            this.group.add(mesh)
        }

        // Edges are drawn from the whole solid, so the wire cage stays put
        // while the faces travel — the burst reads as the skin coming off.
        const edgeGeometry = new THREE.EdgesGeometry(source, 1)
        this.edgeLines = new THREE.LineSegments(edgeGeometry, this.edgeMaterial)
        this.edgeLines.visible = this.cfg.edges
        this.group.add(this.edgeLines)

        source.dispose()
    }

    private clear() {
        for (const f of this.faces) {
            f.mesh.removeFromParent()
            f.mesh.geometry.dispose()
        }
        this.faces = []
        if (this.edgeLines) {
            this.edgeLines.removeFromParent()
            this.edgeLines.geometry.dispose()
            this.edgeLines = null
        }
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
            const s = clamp(this.cfg.dragSensitivity, 0, 10, 3) * 0.008
            this.ay += dx * s
            this.ax += dy * s
        }
        const up = () => {
            this.isDragging = false
            el.style.cursor = "grab"
        }
        const click = () => {
            // A drag that begins and ends on the canvas still fires a click, so
            // anything past a few pixels of travel is left alone. The slack is
            // there because a real click almost always carries a pixel or two
            // of wobble with it.
            if (this.travelled > DRAG_SLOP) return
            if (this.cfg.burst.enabled && this.phase < 0) {
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
        if (cfg.finish === "metal") this.ensureMatcap()

        this.matcapMaterial.color.set(cfg.tint || "#ffffff")
        this.solidMaterial.color.set(cfg.color || "#ffffff")
        this.wireMaterial.color.set(cfg.color || "#ffffff")
        this.edgeMaterial.color.set(cfg.edgeColor || "#ffffff")

        if (cfg.shape !== prev.shape) {
            this.build()
        } else {
            if (cfg.finish !== prev.finish) {
                const material = this.material()
                for (const f of this.faces) f.mesh.material = material
            }
            if (this.edgeLines) this.edgeLines.visible = cfg.edges
        }
        if (!cfg.burst.enabled) this.phase = -1
        this.updateCamera()
    }

    private updateCamera() {
        const w = Math.max(1, this.width)
        const h = Math.max(1, this.height)
        const aspect = w / h
        const distance = 1 / PERSPECTIVE
        const sizePct = clamp(this.cfg.sizePercent, 20, 200, 90)
        // Room is left for the burst, so an open solid never clips the frame.
        const reach = 1 + clamp(this.cfg.burst.distance, 0, 100, 30) / 100
        const span = reach * 2.9 * (100 / sizePct)
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
            const k = 0.06
            this.ax += clamp(rot?.x ?? 0, -12, 12, 0) * k * dt
            this.ay += clamp(rot?.y ?? 0, -12, 12, 0) * k * dt
            this.group.rotation.z += clamp(rot?.z ?? 0, -12, 12, 0) * k * dt
        }
        this.group.rotation.x = this.ax
        this.group.rotation.y = this.ay

        // Out on the Transition's duration, held apart for its delay, then back
        // on the same duration — one click is the whole cycle.
        const duration = Math.max(0.05, this.cfg.transition?.duration ?? 0.6)
        const hold = clamp(this.cfg.transition?.delay ?? 0, 0, 10, 0)
        let raw = 0
        if (this.phase >= 0) {
            this.clock += dt
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
        }
        const eased = this.ease(Math.max(0, Math.min(1, raw)))
        const distance = (clamp(this.cfg.burst.distance, 0, 100, 30) / 100) * eased
        const twist = (clamp(this.cfg.burst.twist, 0, 90, 20) * Math.PI) / 180

        for (const f of this.faces) {
            const home = f.mesh.userData.home as THREE.Vector3
            f.mesh.position.copy(home).addScaledVector(f.normal, distance)
            // Each face turns about its own normal, so the burst spirals rather
            // than sliding straight out.
            f.mesh.setRotationFromAxisAngle(f.normal, twist * eased)
        }
        if (this.edgeLines) this.edgeLines.visible = this.cfg.edges

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.unbind()
        this.clear()
        this.matcapMaterial.dispose()
        this.solidMaterial.dispose()
        this.wireMaterial.dispose()
        this.edgeMaterial.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface MetallicDodecahedronProps {
    shape?: "tetrahedron" | "octahedron" | "dodecahedron" | "icosahedron"
    finish?: "metal" | "solid" | "wire"
    tint?: string
    color?: string
    edges?: boolean
    edgeColor?: string
    burst?: { enabled: boolean; distance: number; twist: number }
    transition?: Transition
    rotation?: { x: number; y: number; z: number }
    dragSensitivity?: number
    sizePercent?: number
    style?: React.CSSProperties
}

export default function MetallicDodecahedron(props: MetallicDodecahedronProps) {
    const {
        shape = DEFAULTS.shape,
        finish = DEFAULTS.finish,
        tint = DEFAULTS.tint,
        color = DEFAULTS.color,
        edges = DEFAULTS.edges,
        edgeColor = DEFAULTS.edgeColor,
        burst = { twist: 20, enabled: true, distance: 30 },
        transition = {
            ease: "easeOut",
            mass: 1,
            type: "tween",
            delay: 0.6,
            damping: 60,
            duration: 0.6,
            stiffness: 800,
        } as Transition,
        rotation = { x: 2, y: 6, z: 0 },
        dragSensitivity = DEFAULTS.dragSensitivity,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<SolidScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        shape,
        finish,
        tint,
        color,
        edges,
        edgeColor,
        burst,
        transition,
        rotation,
        dragSensitivity,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: SolidScene
        try {
            scene = new SolidScene(container, cfgRef.current)
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
        shape,
        finish,
        tint,
        color,
        edges,
        edgeColor,
        burst?.enabled,
        burst?.distance,
        burst?.twist,
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
            aria-label="Metallic dodecahedron"
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

MetallicDodecahedron.displayName = "Metallic Dodecahedron"
MetallicDodecahedron.defaultProps = { ...DEFAULTS }
