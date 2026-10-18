"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Squish Cube — a block of polished jelly that flattens when you shove it and
 * wobbles itself back into shape.
 *
 * The squash is a pure non-uniform scale applied in the vertex shader: the axis
 * being pushed shrinks by `1 - s` and the other two swell by `1 + s * 0.5`, so
 * volume stays roughly constant and the block reads as rubber rather than as a
 * shrinking box. Because it is exactly a scale, the normal has an exact form
 * too — `normalize(n / scale)` — which is why the highlights stay glued to the
 * surface through the deformation. An earlier version displaced vertices along
 * their normals by a noise term and recomputed nothing; the matcap then lit a
 * cube that was no longer there and the whole thing looked like printed paper.
 *
 * The wobble is a decaying sinusoid on top of the drag-driven squash, not a
 * spring integrated per frame: a spring stiff enough to look like jelly needs a
 * timestep smaller than a dropped frame, and one hitch made it explode.
 */

const POLISHED_METAL_MATCAP =
    "https://framerusercontent.com/images/Wkm2ineJ1Md7Xb1oyjF6dqbAw.png"

const PERSPECTIVE = 0.15

/** The panel used to own this; a slower tumble read as a stall. */
const IDLE_TUMBLE = 0.13

const DEFAULTS = {
    color: "#FFFFFF",
    shine: 10,
    round: 6,
    squash: 20,
    wobble: 20,
    recovery: 20,
    speed: 10,
    direction: "left",
    dragSensitivity: 10,
    tiltX: 0,
    sizePercent: 100,
}

type Config = {
    color: string
    shine: number
    round: number
    squash: number
    wobble: number
    recovery: number
    speed: number
    direction: "right" | "left"
    dragSensitivity: number
    tiltX: number
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the simulation wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        // The corner radius as a fraction of the half-extent. Past ~0.45 the
        // cube is a sphere and the squash stops reading as a squash.
        radius: 0.06 + clamp(cfg.round, 1, 20, 12) * 0.019,
        // How much of the pointer's travel becomes compression.
        squash: clamp(cfg.squash, 1, 20, 12) * 0.021,
        // Ring frequency of the wobble, in Hz. Low is a beanbag, high is rubber.
        wobbleHz: 1.6 + clamp(cfg.wobble, 1, 20, 11) * 0.42,
        // Reciprocal of the decay time: high snaps back, low keeps quivering.
        recovery: 1.2 + clamp(cfg.recovery, 1, 20, 9) * 0.55,
        drag: clamp(cfg.dragSensitivity, 1, 10, 4) * 0.007,
        spin: clamp(cfg.speed, 0, 20, 6) * 0.09,
        heading: cfg.direction === "left" ? -1 : 1,
        shine: clamp(cfg.shine, 0, 10, 7) / 10,
    }
}

const matcapCache = new Map<string, THREE.Texture>()
const matcapPending = new Map<string, Promise<THREE.Texture | null>>()

function loadMatcap(url: string): Promise<THREE.Texture | null> {
    const cached = matcapCache.get(url)
    if (cached) return Promise.resolve(cached)
    const pending = matcapPending.get(url)
    if (pending) return pending
    const p = new Promise<THREE.Texture | null>((resolve) => {
        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin("anonymous")
        loader.load(
            url,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace
                matcapCache.set(url, texture)
                resolve(texture)
            },
            undefined,
            () => resolve(null)
        )
    })
    matcapPending.set(url, p)
    return p
}

class SquishScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)
    private group = new THREE.Group()
    private mesh: THREE.Mesh
    private geometry: THREE.BufferGeometry
    private material: THREE.MeshMatcapMaterial

    private uScale = { value: new THREE.Vector3(1, 1, 1) }
    private uShine = { value: 0.7 }

    // Squash amount per axis, and the phase of the ring-down that follows it.
    private press = new THREE.Vector3(0, 0, 0)
    private ringT = 0
    private ringAmp = new THREE.Vector3(0, 0, 0)

    private spinAngle = 0
    private dragX = 0
    private dragY = 0
    private velX = 0
    private velY = 0
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

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.cursor = "grab"
        el.style.touchAction = "none"
        container.appendChild(el)

        this.geometry = this.buildBox(cfg)
        this.material = new THREE.MeshMatcapMaterial({
            color: new THREE.Color(cfg.color || "#ffffff"),
        })
        this.patch()
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.group.add(this.mesh)
        this.scene.add(this.group)

        loadMatcap(POLISHED_METAL_MATCAP).then((t) => {
            if (this.disposed || !t) return
            this.material.matcap = t
            this.material.needsUpdate = true
        })

        this.bindEvents()
    }

    /**
     * A rounded box built by pushing a tessellated cube's vertices onto the
     * nearest corner sphere. three's own RoundedBox is not in the core build.
     *
     * Two things here are the difference between a smooth bead and the faceted,
     * stair-stepped block an earlier version produced:
     *
     * - the geometry stays **indexed**. De-indexing and calling
     *   `computeVertexNormals` gives one normal per triangle, which is right for
     *   a cut solid and wrong for a rounded one: every quad of the tessellation
     *   shades as its own flat tile.
     * - the normal is **written analytically**, not averaged. Every surface
     *   point is `centre + r * dir`, so `dir` *is* the exact normal. Averaging
     *   face normals instead smears the shading across the seam where the flat
     *   face meets the corner sphere, and because that seam follows the quad
     *   grid the smear reads as a staircase running around each edge.
     */
    private buildBox(cfg: Config): THREE.BufferGeometry {
        const S = settingsFor(cfg)
        // Held below half the side, or the inner box inverts and the clamp
        // below starts folding the surface through itself.
        const r = Math.min(S.radius, 0.49)
        // Dense enough that the corner spheres carry their own curvature; the
        // rounding lives in a band a few segments wide, so a coarse grid bands
        // visibly right where the eye is looking.
        const g = new THREE.BoxGeometry(1, 1, 1, 44, 44, 44)
        const pos = g.attributes.position as THREE.BufferAttribute
        const nrm = g.attributes.normal as THREE.BufferAttribute
        const half = 0.5 - r
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i)
            const y = pos.getY(i)
            const z = pos.getZ(i)
            // The corner-sphere centre is the point clamped into the inner box;
            // every surface point is then that centre plus r in its direction.
            const cx = Math.max(-half, Math.min(half, x))
            const cy = Math.max(-half, Math.min(half, y))
            const cz = Math.max(-half, Math.min(half, z))
            const dx = x - cx
            const dy = y - cy
            const dz = z - cz
            const len = Math.hypot(dx, dy, dz) || 1
            const nx = dx / len
            const ny = dy / len
            const nz = dz / len
            pos.setXYZ(i, cx + nx * r, cy + ny * r, cz + nz * r)
            nrm.setXYZ(i, nx, ny, nz)
        }
        pos.needsUpdate = true
        nrm.needsUpdate = true
        g.scale(1.35, 1.35, 1.35)
        return g
    }

    private patch() {
        this.material.onBeforeCompile = (shader) => {
            shader.uniforms.uScale = this.uScale
            shader.uniforms.uShine = this.uShine
            shader.vertexShader = shader.vertexShader
                .replace("void main() {", "uniform vec3 uScale;\nvoid main() {")
                .replace(
                    "#include <beginnormal_vertex>",
                    `#include <beginnormal_vertex>
                    // Exact normal for a pure scale — the inverse scale, renormalised.
                    objectNormal = normalize( objectNormal / uScale );`
                )
                .replace(
                    "#include <begin_vertex>",
                    `#include <begin_vertex>
                    transformed *= uScale;`
                )
            shader.fragmentShader = shader.fragmentShader
                .replace("void main() {", "uniform float uShine;\nvoid main() {")
                .replace(
                    "vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;",
                    `vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
                    vec3 mView = normalize( vViewPosition );
                    vec3 mKey = normalize( vec3( -0.3, 0.75, 0.85 ) );
                    float mk = max( dot( normal, mKey ), 0.0 );
                    // Pulled apart in value first: a white glint laid on a
                    // near-white matcap is invisible until the body has shade.
                    outgoingLight *= mix( 1.0, 0.30 + 0.85 * mk, uShine );
                    float rim = pow( 1.0 - max( dot( normal, mView ), 0.0 ), 4.0 );
                    float spec = pow( max( dot( normal, normalize( mKey + mView ) ), 0.0 ), 90.0 );
                    outgoingLight += ( spec * 1.9 + rim * 0.30 ) * uShine;`
                )
        }
        this.material.needsUpdate = true
    }

    private bindEvents() {
        const el = this.renderer.domElement
        const down = (e: PointerEvent) => {
            this.isDragging = true
            this.lastX = e.clientX
            this.lastY = e.clientY
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
            // Shoving sideways compresses X, shoving up and down compresses Y.
            // Signless, because a push either way flattens the same axis.
            this.press.x = Math.min(0.55, this.press.x + Math.abs(dx) * S.squash * 0.06)
            this.press.y = Math.min(0.55, this.press.y + Math.abs(dy) * S.squash * 0.06)
        }
        const up = () => {
            if (!this.isDragging) return
            this.isDragging = false
            el.style.cursor = "grab"
            // The compression at release becomes the amplitude of the ring-down.
            this.ringAmp.copy(this.press)
            this.ringT = 0
        }
        const leave = () => up()
        el.addEventListener("pointerdown", down)
        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", up)
        el.addEventListener("pointerleave", leave)
        el.addEventListener("pointercancel", leave)
        this.unbind = () => {
            el.removeEventListener("pointerdown", down)
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerup", up)
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
        this.material.color.set(cfg.color || "#ffffff")
        this.uShine.value = settingsFor(cfg).shine
        // Only the corner radius owns the buffer; a colour drag must not
        // reallocate 30k vertices.
        if (clamp(cfg.round, 1, 20, 12) !== clamp(prev.round, 1, 20, 12)) {
            const next = this.buildBox(cfg)
            this.geometry.dispose()
            this.geometry = next
            this.mesh.geometry = next
        }
        this.updateCamera()
    }

    private updateCamera() {
        const aspect = Math.max(1, this.width) / Math.max(1, this.height)
        const distance = 1 / PERSPECTIVE
        const sizePct = clamp(this.cfg.sizePercent, 20, 200, 85)
        // Framed on the cube at full bulge and on its diagonal, so a hard shove
        // never clips a corner off the frame.
        const span = 2.9 * (100 / sizePct)
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

        if (this.isDragging) {
            // Held still while gripped, the block relaxes: only continued
            // movement keeps it compressed.
            const relax = Math.exp(-dt * 4)
            this.press.multiplyScalar(relax)
        } else {
            this.press.multiplyScalar(Math.exp(-dt * S.recovery * 1.6))
            const decay = Math.exp(-dt * 3)
            this.dragY += this.velY
            this.dragX += this.velX
            this.velX *= decay
            this.velY *= decay
            this.spinAngle += S.spin * S.heading * dt
            this.ringT += dt
            this.ringAmp.multiplyScalar(Math.exp(-dt * S.recovery))
        }

        const ring = Math.sin(this.ringT * S.wobbleHz * Math.PI * 2)
        const sx = this.press.x + (this.isDragging ? 0 : this.ringAmp.x * ring)
        const sy = this.press.y + (this.isDragging ? 0 : this.ringAmp.y * ring)
        // Squeezing one axis bulges the other two by half as much each, which
        // holds volume near enough that the eye reads incompressible rubber.
        this.uScale.value.set(
            1 - sx + sy * 0.5,
            1 - sy + sx * 0.5,
            1 + (sx + sy) * 0.5
        )

        const tiltX = (clamp(this.cfg.tiltX, 0, 60, 12) * Math.PI) / 180
        this.mesh.rotation.y = this.spinAngle
        this.mesh.rotation.x = this.spinAngle * IDLE_TUMBLE
        this.group.rotation.set(
            tiltX + Math.max(-1, Math.min(1, this.dragX * 0.5)),
            this.dragY,
            0
        )

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

export interface SquishCubeProps {
    /** 0 is flat gel; 10 is wet polished rubber. */
    color?: string
    shine?: number
    /** 1 is a hard-edged block; 20 is nearly a ball. */
    round?: number
    /** How far a shove flattens it. */
    squash?: number
    /** 1 is a slow beanbag heave; 20 is a tight rubber ring. */
    wobble?: number
    /** 1 keeps quivering for seconds; 20 snaps straight back. */
    recovery?: number
    speed?: number
    direction?: "right" | "left"
    dragSensitivity?: number
    tiltX?: number
    sizePercent?: number
    style?: React.CSSProperties
}

export default function SquishCube(props: SquishCubeProps) {
    const {
        color = DEFAULTS.color,
        shine = DEFAULTS.shine,
        round = DEFAULTS.round,
        squash = DEFAULTS.squash,
        wobble = DEFAULTS.wobble,
        recovery = DEFAULTS.recovery,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction as "right" | "left",
        dragSensitivity = DEFAULTS.dragSensitivity,
        tiltX = DEFAULTS.tiltX,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<SquishScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        color,
        shine,
        round,
        squash,
        wobble,
        recovery,
        speed,
        direction,
        dragSensitivity,
        tiltX,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: SquishScene
        try {
            scene = new SquishScene(container, cfgRef.current)
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
        color,
        shine,
        round,
        squash,
        wobble,
        recovery,
        speed,
        direction,
        dragSensitivity,
        tiltX,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Soft cube that squashes when dragged"
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

SquishCube.displayName = "Squish Cube"
