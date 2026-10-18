"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Image Grid — a field of photographs that swells under the cursor and drains to
 * grey as it falls away from it.
 *
 * The port is samueljarry/codrops-tutorial-grid, mechanism intact. Two things
 * carry the whole effect and both are worth stating:
 *
 * The camera is orthographic at a fixed -1..1 on both axes, so world space is
 * *stretched* to the container rather than fitted to it. Nothing in the scene is
 * square in world units; a card is made square by giving it a height of
 * width * aspect. Solving the camera to the aspect instead — the obvious move —
 * breaks the grid maths, because the cursor also arrives normalised to -1..1.
 *
 * Every card reads one number: the squared distance from its own position to the
 * cursor. That number is the scale (near swells, far settles), the z (so a swollen
 * card sits in front of its neighbours without any sorting) and the drain to
 * luminance in the fragment shader. One value, three uses, no state per card.
 *
 * Cards fly out of the centre line on arrival: y is held at 0 until x has almost
 * reached its column, so the grid unfolds sideways first and drops into rows
 * after. That is the tutorial's own intro and it is why the y target is a
 * conditional rather than a constant.
 */

// Each card is its own draw call — the textures differ, so they cannot be
// instanced without an atlas. This is the ceiling before the frame rate goes.
// ponytail: hard cap on cards, atlas + InstancedMesh if a denser grid is wanted.
const MAX_CARDS = 420

const DEFAULTS = {
    images: [
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/5f084e5a-2e3f-4239-be1a-5084a6dcef00/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9652cf81-4644-4471-1122-4e40ef6e2600/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/1640f8fe-2cb1-4026-88e3-10dd0019f400/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/20fd03c3-49d6-408c-3ac9-8c5a6ed2b500/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4b1ec233-9a09-4483-1adb-404a93094100/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8fd4d2a3-a363-4658-d6ee-84790bc8f300/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3ad8e2bd-dc38-49ba-d186-1a5ab1428d00/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/93ba867c-59af-4b58-8021-c0c0fbce8300/w=800",
        },
    ],
    cell: 72,
    cardSize: 40,
    magnify: 8,
    radius: 240,
    drain: 10,
    assemble: true,
}

type ImageValue = string | { src?: string } | null | undefined

type Config = {
    images: ImageValue[]
    cell: number
    cardSize: number
    magnify: number
    radius: number
    drain: number
    assemble: boolean
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

// Where the swell starts dropping off, as a fraction of the radius. Everything
// inside PLATEAU is at full size, so the cursor lifts a patch of cards rather
// than one card with a few half-grown neighbours; the rim is what keeps a card
// from popping as it crosses the edge.
const PLATEAU = 0.55

/** 1 inside the plateau, easing to 0 at the radius, 0 beyond it. */
function falloffAt(reach: number): number {
    if (reach <= PLATEAU) return 1
    if (reach >= 1) return 0
    const t = (reach - PLATEAU) / (1 - PLATEAU)
    return 1 - t * t * (3 - 2 * t)
}

/** Panel values are whole numbers; the scene wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        cell: clamp(cfg.cell, 40, 400, DEFAULTS.cell),
        // The card fills this much of its cell. The tutorial's 0.4 leaves the
        // grid airy enough that a swollen card has somewhere to swell into.
        fill: clamp(cfg.cardSize, 5, 100, DEFAULTS.cardSize) / 100,
        // 10 is the tutorial's 4x (halved in portrait, where a card that big
        // covers most of the column and the field stops reading as a grid).
        magnify: 1 + clamp(cfg.magnify, 1, 20, DEFAULTS.magnify) * 0.3,
        // The cursor's reach, in screen pixels. The tutorial derived this from
        // the aspect and a magic 12, which meant the swell changed size when the
        // layer was resized; a pixel radius holds still.
        radius: clamp(cfg.radius, 40, 400, DEFAULTS.radius),
        drain: clamp(cfg.drain, 0, 20, DEFAULTS.drain) / 10,
    }
}

function srcOf(img: ImageValue): string {
    if (typeof img === "string") return img
    return img?.src ?? ""
}

function sourcesOf(cfg: Config): string[] {
    const list = Array.isArray(cfg.images) ? cfg.images : []
    return list.map(srcOf).filter(Boolean)
}

/** One texture per URL per document, shared by every instance on the page. */
const textureCache = new Map<string, THREE.Texture>()
const texturePending = new Map<string, Promise<THREE.Texture | null>>()

function loadTexture(url: string): Promise<THREE.Texture | null> {
    const cached = textureCache.get(url)
    if (cached) return Promise.resolve(cached)
    const pending = texturePending.get(url)
    if (pending) return pending
    const p = new Promise<THREE.Texture | null>((resolve) => {
        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin("anonymous")
        loader.load(
            url,
            (texture) => {
                // Left in its raw colour space on purpose: the shader is written
                // by hand, so three injects neither a decode nor an encode and
                // the bytes pass straight through.
                texture.minFilter = THREE.LinearMipmapLinearFilter
                textureCache.set(url, texture)
                resolve(texture)
            },
            undefined,
            () => resolve(null)
        )
    })
    texturePending.set(url, p)
    return p
}

const CARD_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const CARD_FRAGMENT = /* glsl */ `
uniform sampler2D uTexture;
uniform float uDistance;
uniform float uDrain;
uniform vec2 uCover;

varying vec2 vUv;

vec3 getLuminance(vec3 color) {
    vec3 luminance = vec3(0.2126, 0.7152, 0.0722);
    return vec3(dot(luminance, color));
}

void main() {
    // The cards are square and photographs are not, so the uv is squeezed about
    // the centre to crop rather than stretch.
    vec2 uv = (vUv - 0.5) * uCover + 0.5;
    vec4 image = texture2D(uTexture, uv);

    float distanceFactor = clamp(uDistance * uDrain, 0.0, 1.0);

    vec3 imageLum = getLuminance(image.xyz);
    vec3 color = mix(image.xyz, imageLum, distanceFactor);

    gl_FragColor = vec4(color, 1.0);
}
`

type Card = {
    mesh: THREE.Mesh
    material: THREE.ShaderMaterial
    col: number
    row: number
    slot: number
    home: THREE.Vector3
    target: THREE.Vector3
}

class ImageGridScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    // Fixed -1..1 on both axes: world space is stretched to the container, and
    // the cursor arrives in the same normalised space with no unprojection.
    private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
    private geometry = new THREE.PlaneGeometry(1, 1)
    private cards: Card[] = []
    private columns = 1
    private rows = 1
    private baseScale = new THREE.Vector3(1, 1, 1)
    private maxScale = new THREE.Vector3(1, 1, 1)
    private scratch = new THREE.Vector3()

    private textures: (THREE.Texture | null)[] = []
    private sources: string[] = []

    private mouse = new THREE.Vector2()
    private targetMouse = new THREE.Vector2()
    private hover = 0
    private targetHover = 0

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
        })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.setClearColor(0x000000, 0)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.touchAction = "none"
        container.appendChild(el)

        this.camera.position.z = 5

        el.addEventListener("pointermove", this.onPointerMove)
        el.addEventListener("pointerenter", this.onPointerEnter)
        el.addEventListener("pointerleave", this.onPointerLeave)
        el.addEventListener("pointercancel", this.onPointerLeave)

        this.loadTextures()
    }

    private onPointerMove = (e: PointerEvent) => {
        const rect = this.renderer.domElement.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        // Normalised to -1..1, y flipped: the page counts downward, world space
        // counts up.
        this.targetMouse.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -(((e.clientY - rect.top) / rect.height) * 2 - 1)
        )
        this.targetHover = 1
    }

    private onPointerEnter = () => {
        this.targetHover = 1
    }

    /**
     * The swell is eased away rather than the cursor being parked somewhere far
     * off — a cursor sent to infinity lerps *through* the grid on its way there
     * and drags a bulge across every card it passes.
     */
    private onPointerLeave = () => {
        this.targetHover = 0
    }

    private loadTextures() {
        const sources = sourcesOf(this.cfg)
        this.sources = sources
        this.textures = sources.map(() => null)
        sources.forEach((src, i) => {
            loadTexture(src).then((tex) => {
                if (this.disposed || this.sources[i] !== src) return
                this.textures[i] = tex
                this.applyTexture(i)
            })
        })
    }

    /** Hands a newly arrived texture to every card holding that slot. */
    private applyTexture(slot: number) {
        const tex = this.textures[slot]
        if (!tex) return
        const img = tex.image as { width?: number; height?: number } | undefined
        const ia = (img?.width || 1) / (img?.height || 1)
        for (const card of this.cards) {
            if (card.slot !== slot) continue
            card.material.uniforms.uTexture.value = tex
            ;(card.material.uniforms.uCover.value as THREE.Vector2).set(
                ia > 1 ? 1 / ia : 1,
                ia > 1 ? 1 : ia
            )
        }
    }

    /**
     * Which photograph a cell gets. Hashed from the cell's own coordinates
     * rather than drawn at random: a random draw reshuffles the whole field
     * every time the layer is resized.
     */
    private slotFor(col: number, row: number): number {
        const n = Math.max(1, this.textures.length)
        return Math.abs(((col * 73856093) ^ (row * 19349663)) >>> 0) % n
    }

    private build() {
        this.clearCards()
        const S = settingsFor(this.cfg)

        let columns = Math.max(1, Math.floor(this.width / S.cell))
        let rows = Math.max(1, Math.floor(this.height / S.cell))
        // Trimmed from the longer axis first, so a capped grid keeps its shape.
        while (columns * rows > MAX_CARDS) {
            if (columns >= rows) columns--
            else rows--
        }
        this.columns = columns
        this.rows = rows
        this.resolveScales()

        for (let i = 0; i < columns; i++) {
            for (let j = 0; j < rows; j++) {
                const slot = this.slotFor(i, j)
                const material = new THREE.ShaderMaterial({
                    vertexShader: CARD_VERTEX,
                    fragmentShader: CARD_FRAGMENT,
                    uniforms: {
                        uTexture: { value: this.textures[slot] ?? null },
                        uDistance: { value: 0 },
                        uDrain: { value: S.drain },
                        uCover: { value: new THREE.Vector2(1, 1) },
                    },
                })
                const mesh = new THREE.Mesh(this.geometry, material)
                mesh.scale.copy(this.baseScale)
                const card: Card = {
                    mesh,
                    material,
                    col: i,
                    row: j,
                    slot,
                    home: new THREE.Vector3(),
                    target: new THREE.Vector3(),
                }
                this.cards.push(card)
                this.scene.add(mesh)
            }
        }

        this.resolveHomes()
        for (const card of this.cards) {
            // Off: the grid is simply there. On: everything starts stacked on
            // the centre and unfolds.
            if (!this.cfg.assemble) card.mesh.position.copy(card.home)
            else card.mesh.position.set(0, 0, 0)
        }
        for (let i = 0; i < this.textures.length; i++) this.applyTexture(i)
    }

    /** Card size in world units. Square on screen, hence the aspect on y. */
    private resolveScales() {
        const S = settingsFor(this.cfg)
        const aspect = Math.max(1e-3, this.width / Math.max(1, this.height))
        const columnWidth = 2 / this.columns
        const w = columnWidth * S.fill
        this.baseScale.set(w, w * aspect, 1)
        const portrait = this.width < this.height
        this.maxScale
            .copy(this.baseScale)
            .multiplyScalar(portrait ? S.magnify * 0.5 : S.magnify)
    }

    /** The cell centre each card is heading for, in the stretched -1..1 space. */
    private resolveHomes() {
        const cellW = 2 / this.columns
        const cellH = 2 / this.rows
        for (const card of this.cards) {
            card.home.set(
                -1 + (card.col + 0.5) * cellW,
                -1 + (card.row + 0.5) * cellH,
                0
            )
        }
    }

    setSize(width: number, height: number) {
        if (this.disposed) return
        const S = settingsFor(this.cfg)
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)

        const columns = Math.max(1, Math.floor(this.width / S.cell))
        const rows = Math.max(1, Math.floor(this.height / S.cell))
        // A resize that does not change the count only re-solves the maths;
        // rebuilding on every pixel of a drag would restart the intro.
        if (columns !== this.columns || rows !== this.rows || !this.cards.length) {
            this.build()
        } else {
            this.resolveScales()
            this.resolveHomes()
        }
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        const S = settingsFor(cfg)
        for (const card of this.cards) {
            card.material.uniforms.uDrain.value = S.drain
        }
        // Only the controls that own cards rebuild them; magnify, radius and
        // drain are read every frame or written straight to the uniform.
        if (sourcesOf(cfg).join("|") !== sourcesOf(prev).join("|")) {
            this.loadTextures()
            this.build()
        } else if (
            cfg.cell !== prev.cell ||
            cfg.assemble !== prev.assemble
        ) {
            this.build()
        } else {
            this.resolveScales()
            this.resolveHomes()
        }
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            this.frameId = requestAnimationFrame(loop)
            this.step()
        }
        this.frameId = requestAnimationFrame(loop)
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A tab returning from the background must not teleport the field.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)

        this.mouse.lerp(this.targetMouse, 1 - Math.pow(0.0125, dt))
        this.hover += (this.targetHover - this.hover) * (1 - Math.exp(-dt * 5))

        const positionRate = 1 - Math.pow(0.005 / this.columns, dt)
        const scaleRate = 1 - Math.pow(0.0002, dt)

        for (const card of this.cards) {
            const mesh = card.mesh

            // Measured in pixels on the screen, not in world units: world space
            // here is stretched to the container, so a world distance means a
            // different number of pixels on each axis and a circle of influence
            // would come out as an ellipse.
            const dx = (this.mouse.x - mesh.position.x) * 0.5 * this.width
            const dy = (this.mouse.y - mesh.position.y) * 0.5 * this.height
            const reach = Math.sqrt(dx * dx + dy * dy) / S.radius

            this.scratch.lerpVectors(
                this.baseScale,
                this.maxScale,
                falloffAt(reach) * this.hover
            )
            mesh.scale.lerp(this.scratch, scaleRate)

            // Squared, so the drain and the depth keep the tutorial's curve
            // while the swell itself gets the flat-topped one.
            const distance = reach * reach
            // The same number as the depth, so a swollen card sits in front of
            // its neighbours with no sorting anywhere.
            mesh.position.z = -distance
            card.material.uniforms.uDistance.value = distance

            // y is held on the centre line until x has nearly arrived — this is
            // what makes the grid unfold sideways and then drop into rows.
            const settledX = Math.abs(card.home.x - mesh.position.x) < 0.075
            card.target.set(
                card.home.x,
                settledX ? card.home.y : 0,
                mesh.position.z
            )
            mesh.position.lerp(card.target, positionRate)
        }

        this.renderer.render(this.scene, this.camera)
    }

    private clearCards() {
        for (const card of this.cards) {
            this.scene.remove(card.mesh)
            card.material.dispose()
        }
        this.cards = []
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        const el = this.renderer.domElement
        el.removeEventListener("pointermove", this.onPointerMove)
        el.removeEventListener("pointerenter", this.onPointerEnter)
        el.removeEventListener("pointerleave", this.onPointerLeave)
        el.removeEventListener("pointercancel", this.onPointerLeave)
        this.clearCards()
        this.geometry.dispose()
        this.renderer.dispose()
        if (el.parentNode === this.container) this.container.removeChild(el)
        // Textures are shared through the module cache and are deliberately not
        // disposed — another instance on the page may still be drawing them.
    }
}

export interface ImageGridProps {
    images?: ImageValue[]
    cell?: number
    cardSize?: number
    magnify?: number
    radius?: number
    drain?: number
    assemble?: boolean
    style?: React.CSSProperties
}

export default function ImageGrid(props: ImageGridProps) {
    const {
        images = DEFAULTS.images,
        cell = DEFAULTS.cell,
        cardSize = DEFAULTS.cardSize,
        magnify = DEFAULTS.magnify,
        radius = DEFAULTS.radius,
        drain = DEFAULTS.drain,
        assemble = DEFAULTS.assemble,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<ImageGridScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = { images, cell, cardSize, magnify, radius, drain, assemble }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: ImageGridScene
        try {
            scene = new ImageGridScene(container, cfgRef.current)
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
        // Contents, not identity: Framer hands back a fresh array every render.
        Array.isArray(images) ? images.map(srcOf).join("|") : "",
        cell,
        cardSize,
        magnify,
        radius,
        drain,
        assemble,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Grid of photographs that swell under the pointer"
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

ImageGrid.displayName = "Image Grid"
