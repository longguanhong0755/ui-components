"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Coins — ported from the Codrops "Origami" 3D motion graphics set (Item3).
 *
 * A ring of flat discs. Two rotations stacked on top of each other: the ring
 * itself turns slowly about the screen axis, and every disc tumbles on all
 * three of its own axes at the same rate. The discs start edge-on to the ring
 * and stepped half a slot about their own axis, which is what makes it read as
 * a carousel of coins rather than a plate of them.
 */

const MATCAP =
    "https://framerusercontent.com/images/vAQ2QjTRfv9wqQADIrYT1GY2Lf0.png"

const PERSPECTIVE = 0.15

const COIN_RADIUS = 1

const DEFAULTS = {
    colors: ["#FFFFFF","#00F2FF","#0042FF","#CEFF00","#FFBC00","#9E00FF","#00FF9B","#FF8073"],
    shine: 6,
    count: 8,
    ringRadius: 3,
    thickness: 4,
    spinSpeed: 20,
    orbitSpeed: 9,
    direction: "right",
    dragSensitivity: 3,
    tiltX: 0,
    sizePercent: 93,
}

type Config = {
    colors: string[]
    shine: number
    count: number
    ringRadius: number
    thickness: number
    spinSpeed: number
    orbitSpeed: number
    direction: "right" | "left"
    dragSensitivity: number
    tiltX: number
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
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

function patchShine(
    material: THREE.MeshMatcapMaterial,
    shineUniform: { value: number }
) {
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uShine = shineUniform
        shader.fragmentShader = shader.fragmentShader
            .replace("void main() {", "uniform float uShine;\nvoid main() {")
            .replace(
                "vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;",
                `vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
                vec3 pKey = normalize( vec3( -0.4, 0.85, 0.55 ) );
                vec3 pFill = normalize( vec3( 0.8, 0.05, 0.6 ) );
                float pk = max( dot( normal, pKey ), 0.0 );
                float pf = max( dot( normal, pFill ), 0.0 );
                float shade = 0.40 + 0.50 * pk + 0.24 * pf;
                outgoingLight *= mix( 1.0, shade, uShine );
                float lum = dot( outgoingLight, vec3( 0.2126, 0.7152, 0.0722 ) );
                float dark = pow( 1.0 - clamp( lum, 0.0, 1.0 ), 3.0 );
                float rim = pow( 1.0 - max( dot( normal, normalize( vViewPosition ) ), 0.0 ), 3.0 );
                outgoingLight += matcapColor.rgb * ( dark * ( 0.22 * pk + 0.30 * rim ) + rim * 0.06 ) * uShine;`
            )
    }
    material.needsUpdate = true
}

class CoinsScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)
    private group = new THREE.Group()
    private ring = new THREE.Group()
    private spinners: THREE.Group[] = []

    private materials: THREE.MeshMatcapMaterial[] = []
    private shineUniform = { value: 0.6 }
    private geometry: THREE.CylinderGeometry

    private ringAngle = 0
    private coinAngle = 0
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
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.cursor = "grab"
        el.style.touchAction = "none"
        container.appendChild(el)

        this.shineUniform.value = clamp(cfg.shine, 0, 10, 6) / 10
        this.materials = this.makeMaterials(cfg.colors)

        this.geometry = this.makeGeometry()
        this.buildRing()

        this.group.add(this.ring)
        this.scene.add(this.group)

        this.applyMatcap()
        this.bindEvents()
    }

    private makeMaterials(colors: string[]): THREE.MeshMatcapMaterial[] {
        const list = colors && colors.length ? colors : DEFAULTS.colors
        return list.map((c) => {
            const m = new THREE.MeshMatcapMaterial({
                color: new THREE.Color(c || "#ffffff"),
                side: THREE.DoubleSide,
            })
            patchShine(m, this.shineUniform)
            return m
        })
    }

    private makeGeometry(): THREE.CylinderGeometry {
        // Slider 1-10 maps to a disc 0.05-0.5 deep; the source uses 0.1.
        const depth = clamp(this.cfg.thickness, 1, 10, 2) * 0.05
        return new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, depth, 64)
    }

    private buildRing() {
        for (let i = this.ring.children.length - 1; i >= 0; i--) {
            this.ring.remove(this.ring.children[i])
        }
        this.spinners = []

        const n = Math.round(clamp(this.cfg.count, 3, 24, 8))
        const radius = clamp(this.cfg.ringRadius, 2, 12, 6) * 0.5

        for (let i = 0; i < n; i++) {
            const a = (i * 2 * Math.PI) / n + Math.PI / 4
            const slot = new THREE.Group()
            slot.position.set(radius * Math.cos(a), radius * Math.sin(a), 0)
            slot.rotation.z = (i * 2 * Math.PI) / n

            const spinner = new THREE.Group()
            spinner.rotation.set(0, Math.PI / n, Math.PI / 2)
            const material = this.materials[i % this.materials.length]
            spinner.add(new THREE.Mesh(this.geometry, material))

            slot.add(spinner)
            this.ring.add(slot)
            this.spinners.push(spinner)
        }
    }

    private applyMatcap() {
        loadMatcap(MATCAP).then((t) => {
            if (this.disposed || !t) return
            for (const m of this.materials) {
                m.matcap = t
                m.needsUpdate = true
            }
        })
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
            const s = clamp(this.cfg.dragSensitivity, 1, 10, 3) * 0.007
            this.dragY += dx * s
            this.dragX += dy * s
            this.velY = dx * s
            this.velX = dy * s
        }
        const up = () => {
            this.isDragging = false
            el.style.cursor = "grab"
        }
        el.addEventListener("pointerdown", down)
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
        this.shineUniform.value = clamp(cfg.shine, 0, 10, 6) / 10

        const prevColors = (
            prev.colors && prev.colors.length ? prev.colors : DEFAULTS.colors
        ).join(",")
        const nextColors = (
            cfg.colors && cfg.colors.length ? cfg.colors : DEFAULTS.colors
        ).join(",")
        let colorsChanged = false
        if (nextColors !== prevColors) {
            colorsChanged = true
            for (const m of this.materials) m.dispose()
            this.materials = this.makeMaterials(cfg.colors)
            this.applyMatcap()
        }

        if (clamp(cfg.thickness, 1, 10, 2) !== clamp(prev.thickness, 1, 10, 2)) {
            const next = this.makeGeometry()
            this.ring.traverse((o) => {
                const m = o as THREE.Mesh
                if (m.isMesh) m.geometry = next
            })
            this.geometry.dispose()
            this.geometry = next
        }
        if (
            clamp(cfg.count, 3, 24, 8) !== clamp(prev.count, 3, 24, 8) ||
            clamp(cfg.ringRadius, 2, 12, 6) !== clamp(prev.ringRadius, 2, 12, 6) ||
            colorsChanged
        ) {
            this.buildRing()
        }
        this.updateCamera()
    }

    private updateCamera() {
        const w = Math.max(1, this.width)
        const h = Math.max(1, this.height)
        const aspect = w / h
        const distance = 1 / PERSPECTIVE
        const sizePct = clamp(this.cfg.sizePercent, 20, 200, 85)
        const radius = clamp(this.cfg.ringRadius, 2, 12, 6) * 0.5
        // Ring plus one coin, with a little air, so the frame stays put while
        // the coins tumble through their widest profile.
        const span = 2.3 * (radius + COIN_RADIUS) * (100 / sizePct)
        const visibleHeight = aspect < 1 ? span / aspect : span

        this.camera.aspect = aspect
        this.camera.position.set(0, 0, distance)
        this.camera.lookAt(0, 0, 0)
        this.camera.fov =
            2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI)
        this.camera.near = Math.max(0.1, distance - 30)
        this.camera.far = distance + 30
        this.camera.updateProjectionMatrix()
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const dir = this.cfg.direction === "left" ? -1 : 1
        // The source steps 0.01 rad per frame at 60fps: 0.6 rad/s at speed 6.
        this.ringAngle -= clamp(this.cfg.orbitSpeed, 0, 20, 6) * 0.1 * dt * dir
        this.coinAngle += clamp(this.cfg.spinSpeed, 0, 20, 6) * 0.1 * dt

        this.ring.rotation.z = this.ringAngle
        const n = Math.max(1, this.spinners.length)
        for (const s of this.spinners) {
            s.rotation.set(
                this.coinAngle,
                Math.PI / n + this.coinAngle,
                Math.PI / 2 + this.coinAngle
            )
        }

        if (!this.isDragging) {
            const decay = Math.exp(-dt * 3)
            this.dragY += this.velY
            this.dragX += this.velX
            this.velX *= decay
            this.velY *= decay
        }

        const tiltX = (clamp(this.cfg.tiltX, -60, 60, 0) * Math.PI) / 180
        this.group.rotation.set(tiltX + this.dragX * 0.5, this.dragY, 0)

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.unbind()
        this.geometry.dispose()
        for (const m of this.materials) m.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface CoinsProps {
    colors?: string[]
    shine?: number
    count?: number
    ringRadius?: number
    thickness?: number
    spinSpeed?: number
    orbitSpeed?: number
    direction?: "right" | "left"
    dragSensitivity?: number
    tiltX?: number
    sizePercent?: number
    style?: React.CSSProperties
}

function __BaseImpl_Coins(props: CoinsProps) {
    const {
        colors = ["#FFFFFF","#00F2FF","#0042FF","#CEFF00","#FFBC00","#9E00FF","#00FF9B","#FF8073"],
        shine = DEFAULTS.shine,
        count = DEFAULTS.count,
        ringRadius = DEFAULTS.ringRadius,
        thickness = DEFAULTS.thickness,
        spinSpeed = DEFAULTS.spinSpeed,
        orbitSpeed = DEFAULTS.orbitSpeed,
        direction = DEFAULTS.direction as "right" | "left",
        dragSensitivity = DEFAULTS.dragSensitivity,
        tiltX = DEFAULTS.tiltX,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<CoinsScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        colors,
        shine,
        count,
        ringRadius,
        thickness,
        spinSpeed,
        orbitSpeed,
        direction,
        dragSensitivity,
        tiltX,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: CoinsScene
        try {
            scene = new CoinsScene(container, cfgRef.current)
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
        colors,
        shine,
        count,
        ringRadius,
        thickness,
        spinSpeed,
        orbitSpeed,
        direction,
        dragSensitivity,
        tiltX,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Ring of tumbling coins"
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

Coins.displayName = "Coins"

const __presetProps = {
  "shine": 6,
  "count": 8,
  "ringRadius": 7,
  "thickness": 4,
  "spinSpeed": 20,
  "orbitSpeed": 0,
  "direction": "right",
  "dragSensitivity": 3,
  "tiltX": 0,
  "sizePercent": 93
};

export default function Coins(props: Record<string, unknown>) {
  return <__BaseImpl_Coins {...(__presetProps as Record<string, unknown>)} {...props} />;
}
