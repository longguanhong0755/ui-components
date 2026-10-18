"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import {
    animate,
    type AnimationPlaybackControls,
    type Transition,
} from "motion/react"
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"

/**
 * Metallic Cube — a real 3D Rubik's cube: every cubie on the shell is a rounded
 * box, auto-scrambled by layer quarter-turns, tumbling on its own and draggable.
 *
 * It takes the same controls as Solid Cube, so the two are the same object seen
 * two ways — this one through WebGL, that one projected onto a 2D canvas. In
 * Metallic mode both wear the same Polished Metal matcap, which is what makes
 * them match.
 */

// A matcap is a lit sphere baked into an image, sampled by the view-space
// normal. It is the whole metal look, which is why the scene needs no lights
// for it — and it is the exact texture Solid Cube samples by hand.
const POLISHED_METAL_MATCAP =
    "https://framerusercontent.com/images/Wkm2ineJ1Md7Xb1oyjF6dqbAw.png"

// The six stickers a real cube wears, in +x, -x, +y, -y, +z, -z order. Custom
// mode starts from these, and falls back to them if the panel's list is emptied
// so the cube is never left unpainted.
const RUBIK_COLORS = [
    "#B71234",
    "#FF5800",
    "#FFFFFF",
    "#FFD500",
    "#009B48",
    "#0046AD",
]

// Shading and perspective are no longer on the panel — these are the values
// they sat at, now fixed.
const SHADING = 0.5
const PERSPECTIVE = 0.15

const DEFAULTS = {
    colorMode: "metallic",
    colors: ["#B71234", "#FF5800", "#FFFFFF", "#FFD500", "#009B48", "#0046AD"],
    tint: "#ffffff",
    cubeGrid: 3,
    gap: 1,
    rotation: { x: 0, y: 11, z: 0 },
    transition: {
        type: "spring",
        stiffness: 200,
        damping: 20,
        mass: 1,
    } as Transition,
    sizePercent: 95,
    dragSensitivity: 3,
}

// Face order is +x, -x, +y, -y, +z, -z — the classic sticker colours in that
// order.
const FACE_AXIS: Array<[number, number, number]> = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
]

// Faces that were never on the outside are the cube's own body, so they stay
// black the way a real one is.
const BLANK_COLOR = "#000000"

// The bevel, as a share of the cubie's side. Solid Cube stands the same radius
// in by bending its corner normals; here it is real geometry.
const ROUND_SHARE = 0.0735
const ROUND_SEGMENTS = 3

// Cube half-extent is 1, so the model spans [-1, 1] on every axis — the same
// space Solid Cube projects from, which is what lets the framing match.
const AXIS_NAMES = ["x", "y", "z"] as const

type Config = {
    colorMode: "metallic" | "custom"
    colors: string[]
    tint: string
    cubeGrid: number
    gap: number
    rotation: { x: number; y: number; z: number }
    transition: Transition
    sizePercent: number
    dragSensitivity: number
}

type Move = { axis: number; layer: number; dir: number }

function clampGrid(n: number): number {
    return Math.max(2, Math.min(8, Math.round(n)))
}

function clampSpin(v: number | undefined): number {
    if (typeof v !== "number" || !isFinite(v)) return 0
    return Math.max(-12, Math.min(12, v))
}

/** Cell centres sit at -1 + (2i+1)/grid, so a quarter turn maps centre to centre. */
function centreOf(i: number, grid: number): number {
    return -1 + (2 * i + 1) / grid
}

function centreIndex(c: number, grid: number): number {
    return Math.max(0, Math.min(grid - 1, Math.round((c * grid + grid - 1) / 2)))
}

function snapCentre(c: number, grid: number): number {
    return centreOf(centreIndex(c, grid), grid)
}

/** The matcap is loaded once per document — several cubes share the texture. */
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

class MetallicCubeScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)
    private group = new THREE.Group()
    private ambient = new THREE.AmbientLight(0xffffff, 1)
    private key = new THREE.DirectionalLight(0xffffff, 0)

    private cubies: THREE.Mesh[] = []
    private geometries: THREE.BufferGeometry[] = []
    private matcapMaterial: THREE.MeshMatcapMaterial
    private stickerMaterial: THREE.MeshLambertMaterial

    // Turn state. Members are re-parented to the pivot for the duration, so the
    // spring drives one rotation instead of every cubie's own transform.
    private pivot = new THREE.Group()
    private turn: Move | null = null
    private turnTarget = 0
    private turnControls: AnimationPlaybackControls | null = null
    private lastMove: Move | null = null

    // Tumble angles, in the same units and with the same drag mapping Solid
    // Cube uses.
    private ax = 0.5
    private ay = 0.6
    private az = 0

    private isDragging = false
    private lastMouseX = 0
    private lastMouseY = 0

    private width = 0
    private height = 0
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
        // Vertex colours carry the stickers; one material covers every cubie.
        this.stickerMaterial = new THREE.MeshLambertMaterial({
            vertexColors: true,
        })

        // The key rides the camera, so a face darkens as it turns away from the
        // viewer rather than away from a fixed lamp — which is how Solid Cube's
        // shading reads, since its darkening comes from how edge-on a face is.
        this.key.position.set(0.4, 0.7, 1)
        this.camera.add(this.key)
        this.scene.add(this.ambient, this.camera, this.group)
        this.group.add(this.pivot)

        this.build()
        this.applyShading()
        this.bindEvents()
        if (cfg.colorMode !== "custom") this.ensureMatcap()
    }

    private ensureMatcap() {
        if (this.matcapMaterial.matcap) return
        loadMatcap().then((t) => {
            if (this.disposed || !t) return
            this.matcapMaterial.matcap = t
            this.matcapMaterial.needsUpdate = true
        })
    }

    /**
     * One rounded box per shell cubie. Each carries its own geometry because
     * the stickers live in a vertex-colour attribute — the colour has to travel
     * with the cubie, and a turn moves the mesh itself, so nothing needs
     * permuting afterwards.
     */
    private build() {
        this.clearCubies()
        const grid = clampGrid(this.cfg.cubeGrid)
        const gap = Math.max(0, Math.min(20, Math.round(this.cfg.gap)))
        const side = (2 / grid) * (1 - gap / 100)
        const radius = side * ROUND_SHARE
        const material = this.material()

        for (let i = 0; i < grid; i++)
            for (let j = 0; j < grid; j++)
                for (let k = 0; k < grid; k++) {
                    const onShell =
                        i === 0 ||
                        i === grid - 1 ||
                        j === 0 ||
                        j === grid - 1 ||
                        k === 0 ||
                        k === grid - 1
                    if (!onShell) continue

                    const geometry = new RoundedBoxGeometry(
                        side,
                        side,
                        side,
                        ROUND_SEGMENTS,
                        radius
                    )
                    this.geometries.push(geometry)
                    const mesh = new THREE.Mesh(geometry, material)
                    mesh.position.set(
                        centreOf(i, grid),
                        centreOf(j, grid),
                        centreOf(k, grid)
                    )
                    // Only the faces that start on the outside get a sticker.
                    mesh.userData.outer = [
                        i === grid - 1,
                        i === 0,
                        j === grid - 1,
                        j === 0,
                        k === grid - 1,
                        k === 0,
                    ]
                    this.group.add(mesh)
                    this.cubies.push(mesh)
                }

        this.applyStickers()
        this.stopTurn()
    }

    private clearCubies() {
        for (const mesh of this.cubies) mesh.removeFromParent()
        for (const geometry of this.geometries) geometry.dispose()
        this.cubies = []
        this.geometries = []
    }

    private material() {
        return this.cfg.colorMode === "custom"
            ? this.stickerMaterial
            : this.matcapMaterial
    }

    /**
     * The six sticker colours. The panel's list is cycled if it holds fewer
     * than six — one colour paints the whole cube.
     */
    private palette(): THREE.Color[] {
        const list = (this.cfg.colors || []).filter(Boolean)
        const source = list.length ? list : RUBIK_COLORS
        const colors: THREE.Color[] = []
        for (let f = 0; f < 6; f++)
            colors.push(new THREE.Color(source[f % source.length]))
        return colors
    }

    /**
     * A vertex belongs to whichever face its normal points hardest along, so
     * the colour boundary lands in the middle of the bevel — which is where the
     * edge of a real sticker sits.
     */
    private applyStickers() {
        if (this.cfg.colorMode !== "custom") return
        const palette = this.palette()
        const blank = new THREE.Color(BLANK_COLOR)

        for (const mesh of this.cubies) {
            const geometry = mesh.geometry as THREE.BufferGeometry
            const normals = geometry.getAttribute("normal")
            const count = normals.count
            let colors = geometry.getAttribute("color") as
                | THREE.BufferAttribute
                | undefined
            if (!colors || colors.count !== count) {
                colors = new THREE.BufferAttribute(
                    new Float32Array(count * 3),
                    3
                )
                geometry.setAttribute("color", colors)
            }
            const outer = mesh.userData.outer as boolean[]

            for (let v = 0; v < count; v++) {
                const nx = normals.getX(v)
                const ny = normals.getY(v)
                const nz = normals.getZ(v)
                let face = 0
                let best = -Infinity
                for (let f = 0; f < 6; f++) {
                    const a = FACE_AXIS[f]
                    const d = nx * a[0] + ny * a[1] + nz * a[2]
                    if (d > best) {
                        best = d
                        face = f
                    }
                }
                const c = outer[face] ? palette[face] : blank
                colors.setXYZ(v, c.r, c.g, c.b)
            }
            colors.needsUpdate = true
        }
    }

    /**
     * The ambient/key balance, fixed at what the old Shading control's 50%
     * produced: enough key for the sides to separate, enough ambient that a
     * face turned away is still readable.
     */
    private applyShading() {
        this.ambient.intensity = 1 - 0.45 * SHADING
        this.key.intensity = 1.35 * SHADING
    }

    private bindEvents() {
        const el = this.renderer.domElement

        const onPointerDown = (e: PointerEvent) => {
            this.isDragging = true
            this.lastMouseX = e.clientX
            this.lastMouseY = e.clientY
            el.style.cursor = "grabbing"
        }
        const onPointerMove = (e: PointerEvent) => {
            if (!this.isDragging) return
            const dx = e.clientX - this.lastMouseX
            const dy = e.clientY - this.lastMouseY
            this.lastMouseX = e.clientX
            this.lastMouseY = e.clientY
            const sens = (this.cfg.dragSensitivity ?? 3) * 0.008
            this.ay += dx * sens
            this.ax += dy * sens
        }
        const onPointerUp = () => {
            this.isDragging = false
            el.style.cursor = "grab"
        }

        el.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)
        el.addEventListener("pointerleave", onPointerUp)

        this.disposeEvents = () => {
            el.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", onPointerUp)
            el.removeEventListener("pointerleave", onPointerUp)
        }
    }

    private disposeEvents = () => {}

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
        if (cfg.colorMode !== "custom") this.ensureMatcap()
        this.matcapMaterial.color.set(cfg.tint || "#ffffff")

        // Geometry only depends on these two; everything else is repaint.
        if (
            clampGrid(cfg.cubeGrid) !== clampGrid(prev.cubeGrid) ||
            Math.round(cfg.gap) !== Math.round(prev.gap)
        ) {
            this.build()
        } else {
            if (cfg.colorMode !== prev.colorMode) {
                const material = this.material()
                for (const mesh of this.cubies) mesh.material = material
            }
            this.applyStickers()
        }
        this.applyShading()
        this.updateCamera()
    }

    /**
     * Solid Cube frames the cube by scaling model units to pixels; the same
     * framing here is a distance and a field of view. Its projection magnifies
     * by (1 + z · PERSPECTIVE), and a camera at distance D magnifies by
     * 1/(1 - z/D), so D is that constant's reciprocal.
     */
    private updateCamera() {
        const w = Math.max(1, this.width)
        const h = Math.max(1, this.height)
        const aspect = w / h
        const distance = 1 / PERSPECTIVE

        const sizePct = Math.max(
            20,
            Math.min(200, Math.round(this.cfg.sizePercent))
        )
        // 0.26 is Solid Cube's scale factor: at 100% one model unit covers 26%
        // of the frame's shorter side, so that side spans 1/0.26 model units.
        const minExtent = (1 / 0.26) * (100 / sizePct)
        const visibleHeight = aspect < 1 ? minExtent / aspect : minExtent

        this.camera.aspect = aspect
        this.camera.position.set(0, 0, distance)
        this.camera.lookAt(0, 0, 0)
        this.camera.fov =
            2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI)
        this.camera.near = Math.max(0.1, distance - 10)
        this.camera.far = distance + 10
        this.camera.updateProjectionMatrix()
    }

    private stopTurn() {
        this.turnControls?.stop()
        this.turnControls = null
        // Anything still parented to the pivot goes back to the group with its
        // world transform intact, so a rebuild mid-turn leaves nothing stranded.
        for (let i = this.pivot.children.length - 1; i >= 0; i--)
            this.group.attach(this.pivot.children[i])
        this.pivot.rotation.set(0, 0, 0)
        this.turn = null
    }

    private pickMove() {
        const grid = clampGrid(this.cfg.cubeGrid)
        let m: Move
        let tries = 0
        do {
            m = {
                axis: Math.floor(Math.random() * 3),
                layer: Math.floor(Math.random() * grid),
                dir: Math.random() < 0.5 ? 1 : -1,
            }
            tries++
        } while (
            tries < 8 &&
            this.lastMove &&
            m.axis === this.lastMove.axis &&
            m.layer === this.lastMove.layer &&
            m.dir === -this.lastMove.dir
        )

        const axis = AXIS_NAMES[m.axis]
        this.pivot.rotation.set(0, 0, 0)
        for (const mesh of this.cubies) {
            if (centreIndex(mesh.position[axis], grid) !== m.layer) continue
            // attach keeps the world transform, so the cubie does not jump as
            // it changes parent.
            this.pivot.attach(mesh)
        }

        this.turn = m
        this.turnTarget = (m.dir * Math.PI) / 2
        this.lastMove = m

        this.turnControls = animate(0, 1, {
            ...(this.cfg.transition as any),
            onUpdate: (v: number) => {
                this.pivot.rotation[axis] = this.turnTarget * v
            },
            onComplete: () => {
                this.commitTurn()
                this.turnControls = null
            },
        })
    }

    /**
     * A spring overshoots and settles, so the turn is committed from the exact
     * quarter turn rather than from wherever the spring stopped.
     */
    private commitTurn() {
        const m = this.turn
        if (!m) return
        const grid = clampGrid(this.cfg.cubeGrid)
        this.pivot.rotation.set(0, 0, 0)
        this.pivot.rotation[AXIS_NAMES[m.axis]] = this.turnTarget
        this.pivot.updateMatrixWorld(true)

        for (let i = this.pivot.children.length - 1; i >= 0; i--) {
            const mesh = this.pivot.children[i]
            this.group.attach(mesh)
            // Rounding errors accumulate over hundreds of turns otherwise.
            mesh.position.set(
                snapCentre(mesh.position.x, grid),
                snapCentre(mesh.position.y, grid),
                snapCentre(mesh.position.z, grid)
            )
        }
        this.pivot.rotation.set(0, 0, 0)
        this.turn = null
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
            this.ax += clampSpin(rot?.x) * k * dt
            this.ay += clampSpin(rot?.y) * k * dt
            this.az += clampSpin(rot?.z) * k * dt
        }
        this.group.rotation.set(this.ax, this.ay, this.az)

        if (!this.turn && !this.turnControls) this.pickMove()

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.turnControls?.stop()
        this.turnControls = null
        this.disposeEvents()
        this.clearCubies()
        this.matcapMaterial.dispose()
        this.stickerMaterial.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

interface MetallicCubeProps {
    colorMode?: "metallic" | "custom"
    colors?: string[]
    tint?: string
    cubeGrid?: number
    gap?: number
    rotation?: { x: number; y: number; z: number }
    transition?: Transition
    sizePercent?: number
    dragSensitivity?: number
    style?: React.CSSProperties
}

export default function MetallicCube(props: MetallicCubeProps) {
    const {
        colorMode = DEFAULTS.colorMode,
        colors = ["#B71234", "#FF5800", "#FFFFFF", "#FFD500", "#009B48", "#0046AD"],
        tint = DEFAULTS.tint,
        cubeGrid = DEFAULTS.cubeGrid,
        gap = DEFAULTS.gap,
        rotation = { x: 0, y: 11, z: 0 },
        transition = {
            type: "spring",
            stiffness: 200,
            damping: 20,
            mass: 1,
        } as Transition,
        sizePercent = DEFAULTS.sizePercent,
        dragSensitivity = DEFAULTS.dragSensitivity,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<MetallicCubeScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        colorMode,
        colors,
        tint,
        cubeGrid,
        gap,
        rotation,
        transition,
        sizePercent,
        dragSensitivity,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        let scene: MetallicCubeScene
        try {
            scene = new MetallicCubeScene(container, cfgRef.current)
        } catch {
            // No WebGL — render nothing rather than throwing.
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
        colorMode,
        // Joined, not the array: an Array control hands back a fresh identity
        // every render, which would re-push config on every render.
        (colors || []).join(","),
        tint,
        cubeGrid,
        gap,
        rotation?.x,
        rotation?.y,
        rotation?.z,
        transition,
        sizePercent,
        dragSensitivity,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Metallic Rubik's cube"
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

MetallicCube.displayName = "Metallic Cube"
