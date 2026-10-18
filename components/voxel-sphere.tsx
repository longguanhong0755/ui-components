"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Voxel Sphere — a ball made of cubes that breathes apart and back together.
 *
 * Every cube is one instance of a single box, and none of them are placed on the
 * CPU. The instance carries only a direction and a seed; the vertex shader
 * derives the position, the rotation and the scale from those two numbers and
 * the clock. That is what makes the count affordable — several thousand cubes
 * cost one draw call and no per-frame buffer writes.
 *
 * The directions come off the Fibonacci sphere, which spaces points evenly
 * without the crowding at the poles that latitude/longitude sampling produces.
 * The breath that pushes them outward is a wave that travels across the sphere
 * rather than a single pulse — cubes on the far side move a beat after the near
 * ones, so the ball reads as something with a size instead of a shape being
 * scaled.
 *
 * Each cube also turns on its own axis at its own rate, so the surface glitters
 * as faces catch the light at different moments.
 */

const PERSPECTIVE = 0.15

/** How fast each cube turns on its own axis. The panel used to own this. */
const TUMBLE = 20 * 0.18

const DEFAULTS = {
    color: "#FFD000",
    tip: "#0081FF",
    sheen: "#FFFFFF",
    count: 20,
    cube: 10,
    breath: 10,
    wave: 20,
    gap: 4,
    gloss: 10,
    speed: 6,
    direction: "left",
    dragSensitivity: 5,
    sizePercent: 85,
}

type Config = {
    color: string
    tip: string
    sheen: string
    count: number
    cube: number
    breath: number
    wave: number
    gap: number
    gloss: number
    speed: number
    direction: "right" | "left"
    dragSensitivity: number
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    const count = clamp(cfg.count, 1, 20, DEFAULTS.count)
    return {
        // Squared: at the sparse end a few extra cubes read clearly, at the
        // dense end it takes hundreds to make any difference.
        cubes: Math.round(40 + count * count * 9),
        cube: 0.02 + clamp(cfg.cube, 1, 20, DEFAULTS.cube) * 0.006,
        breath: clamp(cfg.breath, 0, 20, DEFAULTS.breath) * 0.022,
        // How many wave crests fit around the sphere. 0 makes every cube move
        // together, which reads as a scaling ball rather than a breathing one.
        wave: clamp(cfg.wave, 0, 20, DEFAULTS.wave) * 0.35,
        // Fixed at what used to be the top of the slider: the cubes always turn
        // on their own axes, which is what keeps the shell glittering.
        tumble: TUMBLE,
        // The resting radius. Larger spreads the same cubes over more sphere,
        // so the shell reads as more open.
        gap: 0.8 + clamp(cfg.gap, 0, 20, DEFAULTS.gap) * 0.035,
        /*
         * Read backwards on purpose: 1 on the panel is the hard pinpoint and 20
         * the broad wet sheen.
         *
         * The specular exponent runs the other way — a big exponent is a tight
         * highlight — so the slider is inverted here rather than in the shader,
         * which keeps every mapping in this one function.
         */
        gloss: 6 + (21 - clamp(cfg.gloss, 1, 20, DEFAULTS.gloss)) * 7,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.14,
        heading: cfg.direction === "left" ? -1 : 1,
    }
}

/** A box, plus one direction and one seed per instance. */
function buildCubes(count: number): THREE.InstancedBufferGeometry | THREE.BoxGeometry {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const dir = new Float32Array(count * 3)
    const seed = new Float32Array(count)

    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < count; i++) {
        const y = 1 - (i / Math.max(1, count - 1)) * 2
        const ring = Math.sqrt(Math.max(0, 1 - y * y))
        const theta = golden * i
        dir[i * 3] = Math.cos(theta) * ring
        dir[i * 3 + 1] = y
        dir[i * 3 + 2] = Math.sin(theta) * ring
        seed[i] = Math.random()
    }

    geometry.setAttribute("aDir", new THREE.InstancedBufferAttribute(dir, 3))
    geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1))
    return geometry
}

const CUBE_VERTEX = /* glsl */ `
    attribute vec3 aDir;
    attribute float aSeed;

    uniform float uTime;
    uniform float uCube;
    uniform float uBreath;
    uniform float uWave;
    uniform float uTumble;
    uniform float uGap;

    varying vec3 vNormal;
    varying vec3 vView;
    varying float vOut;

    /** Rotation about an arbitrary axis — Rodrigues, as a matrix. */
    mat3 rotate(vec3 axis, float angle) {
        float c = cos(angle);
        float s = sin(angle);
        float t = 1.0 - c;
        vec3 a = normalize(axis);
        return mat3(
            t * a.x * a.x + c,        t * a.x * a.y - s * a.z,  t * a.x * a.z + s * a.y,
            t * a.x * a.y + s * a.z,  t * a.y * a.y + c,        t * a.y * a.z - s * a.x,
            t * a.x * a.z - s * a.y,  t * a.y * a.z + s * a.x,  t * a.z * a.z + c
        );
    }

    void main() {
        /*
         * The breath is a wave crossing the sphere, not a single pulse.
         *
         * Phase depends on the cube's own direction, so the far side moves a
         * beat behind the near side and the ball reads as a body with a size.
         * A uniform pulse just looks like the whole object being scaled.
         */
        float phase = dot(aDir, vec3(0.3, 1.0, 0.2)) * uWave;
        float push = sin(uTime * 1.2 + phase) * 0.5 + 0.5;
        float radius = uGap + push * uBreath * 6.0;

        // Every cube turns on its own axis at its own rate, so faces catch the
        // light at different moments and the shell glitters as it moves.
        vec3 axis = normalize(aDir + vec3(0.4, 0.2, 0.7));
        mat3 spin = rotate(axis, uTime * uTumble * (0.5 + aSeed));

        // Cubes further out are drawn slightly smaller, which reads as the
        // shell thinning as it expands.
        float size = uCube * (1.1 - push * 0.35) * (0.7 + aSeed * 0.6);
        vec3 local = spin * (position * size);
        vec3 world = aDir * radius + local;

        vec4 mv = modelViewMatrix * vec4(world, 1.0);
        // The instance rotation has to reach the normal too, or the lighting
        // stays fixed while the cube turns and the faces read as printed on.
        vNormal = normalize(normalMatrix * (spin * normal));
        vView = -mv.xyz;
        vOut = push;
        gl_Position = projectionMatrix * mv;
    }
`

const CUBE_FRAGMENT = /* glsl */ `
    uniform vec3 uColor;
    uniform vec3 uTip;
    uniform vec3 uSheen;
    uniform float uGloss;

    varying vec3 vNormal;
    varying vec3 vView;
    varying float vOut;

    const vec3 KEY = vec3(0.45, 0.7, 0.55);
    const vec3 FILL = vec3(-0.6, -0.2, 0.75);

    void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(vView);

        // Colour tracks how far out the cube has been pushed, so the breath is
        // legible as heat as well as motion.
        vec3 base = mix(uColor, uTip, vOut);

        float key = max(dot(n, normalize(KEY)), 0.0);
        float fill = max(dot(n, normalize(FILL)), 0.0) * 0.4;
        // Flat faces held at one value with a hard change at the edge, which is
        // what makes a cube read as a cube.
        vec3 col = base * (0.28 + key * 0.75 + fill);

        vec3 h = normalize(normalize(KEY) + v);
        col += uSheen * pow(max(dot(n, h), 0.0), uGloss) * 0.7;

        // A little rim, so cubes at the silhouette separate from each other
        // instead of merging into one dark mass.
        col += uTip * pow(1.0 - max(dot(n, v), 0.0), 4.0) * 0.35;

        gl_FragColor = vec4(col, 1.0);
    }
`

class VoxelScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)
    private group = new THREE.Group()

    private geometry: THREE.BufferGeometry
    private material: THREE.ShaderMaterial
    private mesh: THREE.InstancedMesh

    private time = 0
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
        el.style.cursor = "grab"
        el.style.touchAction = "none"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: CUBE_VERTEX,
            fragmentShader: CUBE_FRAGMENT,
            uniforms: {
                uTime: { value: 0 },
                uCube: { value: S.cube },
                uBreath: { value: S.breath },
                uWave: { value: S.wave },
                uTumble: { value: S.tumble },
                uGap: { value: S.gap },
                uColor: { value: new THREE.Color(cfg.color) },
                uTip: { value: new THREE.Color(cfg.tip) },
                uSheen: { value: new THREE.Color(cfg.sheen) },
                uGloss: { value: S.gloss },
            },
        })

        this.geometry = buildCubes(S.cubes) as THREE.BufferGeometry
        this.mesh = this.makeMesh(S.cubes)
        this.group.add(this.mesh)
        this.scene.add(this.group)

        this.bindEvents()
    }

    private makeMesh(count: number): THREE.InstancedMesh {
        const mesh = new THREE.InstancedMesh(this.geometry, this.material, count)
        /*
         * The instance matrices are left at identity on purpose.
         *
         * Placement, rotation and scale all come out of the vertex shader from
         * the direction and seed attributes, so there is nothing to write here
         * per frame — but the buffer starts zero-filled, and a zero matrix
         * collapses every cube to the origin, so it does have to be filled once.
         */
        const identity = new THREE.Matrix4()
        for (let i = 0; i < count; i++) mesh.setMatrixAt(i, identity)
        mesh.instanceMatrix.needsUpdate = true
        // The shader moves the cubes, so three's culling maths cannot see where
        // they really are.
        mesh.frustumCulled = false
        return mesh
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
            const s = clamp(this.cfg.dragSensitivity, 0, 10, 3) * 0.007
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
        const S = settingsFor(cfg)
        const u = this.material.uniforms

        u.uCube.value = S.cube
        u.uBreath.value = S.breath
        u.uWave.value = S.wave
        u.uTumble.value = S.tumble
        u.uGap.value = S.gap
        u.uGloss.value = S.gloss
        u.uColor.value.set(cfg.color || "#ffffff")
        u.uTip.value.set(cfg.tip || "#ffffff")
        u.uSheen.value.set(cfg.sheen || "#ffffff")

        // Only the count owns the instance buffers; everything else is a
        // uniform.
        if (cfg.count !== prev.count) {
            this.group.remove(this.mesh)
            this.mesh.dispose()
            this.geometry.dispose()
            this.geometry = buildCubes(S.cubes) as THREE.BufferGeometry
            this.mesh = this.makeMesh(S.cubes)
            this.group.add(this.mesh)
        }
        this.updateCamera()
    }

    private updateCamera() {
        const w = Math.max(1, this.width)
        const h = Math.max(1, this.height)
        const aspect = w / h
        const distance = 1 / PERSPECTIVE
        const sizePct = clamp(this.cfg.sizePercent, 20, 200, 85)
        // Framed for the sphere at full breath, so nothing clips at the top of
        // the expansion.
        const span = 4.6 * (100 / sizePct)
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
        this.time += dt

        if (!this.isDragging) {
            const decay = Math.exp(-dt * 3)
            this.dragY += this.velY
            this.dragX += this.velX
            this.velX *= decay
            this.velY *= decay
            this.spinAngle += S.speed * S.heading * dt
        }

        this.material.uniforms.uTime.value = this.time
        this.group.rotation.y = this.spinAngle + this.dragY
        this.group.rotation.x = clamp(this.dragX * 0.5, -0.9, 0.9, 0)

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.unbind()
        this.mesh.dispose()
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

interface VoxelSphereProps {
    color?: string
    tip?: string
    sheen?: string
    count?: number
    cube?: number
    breath?: number
    wave?: number
    gap?: number
    gloss?: number
    speed?: number
    direction?: "right" | "left"
    dragSensitivity?: number
    sizePercent?: number
    style?: React.CSSProperties
}

function __BaseImpl_VoxelSphere(props: VoxelSphereProps) {
    const {
        color = DEFAULTS.color,
        tip = DEFAULTS.tip,
        sheen = DEFAULTS.sheen,
        count = DEFAULTS.count,
        cube = DEFAULTS.cube,
        breath = DEFAULTS.breath,
        wave = DEFAULTS.wave,
        gap = DEFAULTS.gap,
        gloss = DEFAULTS.gloss,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction,
        dragSensitivity = DEFAULTS.dragSensitivity,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<VoxelScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        color,
        tip,
        sheen,
        count,
        cube,
        breath,
        wave,
        gap,
        gloss,
        speed,
        direction,
        dragSensitivity,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: VoxelScene
        try {
            scene = new VoxelScene(container, cfgRef.current)
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
        color,
        tip,
        sheen,
        count,
        cube,
        breath,
        wave,
        gap,
        gloss,
        speed,
        direction,
        dragSensitivity,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Voxel sphere"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 160,
                minHeight: 160,
                overflow: "hidden",
                ...style,
            }}
        />
    )
}

VoxelSphere.displayName = "Voxel Sphere"
VoxelSphere.defaultProps = { ...DEFAULTS }

const __presetProps = {
  "color": "#FFD000",
  "tip": "#0081FF",
  "sheen": "#FFFFFF",
  "count": 20,
  "cube": 10,
  "gap": 4,
  "breath": 10,
  "wave": 20,
  "gloss": 10,
  "speed": 6,
  "direction": "left",
  "dragSensitivity": 5,
  "sizePercent": 85
};

export default function VoxelSphere(props: Record<string, unknown>) {
  return <__BaseImpl_VoxelSphere {...(__presetProps as Record<string, unknown>)} {...props} />;
}
