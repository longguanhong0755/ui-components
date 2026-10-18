"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Arch Corridor — a run of glowing rounded-square outlines, seen from inside.
 *
 * Each arch is one continuous closed ribbon: the outline is sampled into a loop
 * of points, every point carries the outward normal of the curve at that point,
 * and the vertex shader pushes the two sides of the ribbon apart along it. That
 * is what keeps the line unbroken. Offsetting radially instead — the obvious
 * shortcut for a shape centred on the origin — makes the stroke swell towards
 * the corners and pinch on the flats, because the radius and the curve normal
 * only agree where the shape is a circle. LineLoop is not an option either:
 * every desktop driver clamps line width to one pixel, so there would be no
 * weight control at all and nothing to hang the glow on.
 *
 * The twist is taken from each arch's depth rather than its index, so the
 * spiral stands still in space and the arches travel along it, and it stays a
 * uniform instead of something baked into a matrix that a slider drag would
 * have to rebuild.
 */

// Length of the corridor in world units.
const SPAN = 22
// Sampling of one arch outline. Fixed: the corner radius changes the shape, not
// how finely it is drawn, and at this density the curve is already smooth.
const ARC_STEPS = 10
const EDGE_STEPS = 5

const DEFAULTS = {
    background: "#000000",
    near: "#FF00CD",
    far: "#00E4FF",
    arches: 14,
    twist: 20,
    gauge: 4,
    cornerRadius: 34,
    opening: 100,
    glow: 20,
    animate: true,
    speed: 4,
    direction: "forward",
    sizePercent: 100,
}

type Config = {
    background: string
    near: string
    far: string
    arches: number
    twist: number
    gauge: number
    cornerRadius: number
    opening: number
    glow: number
    animate: boolean
    speed: number
    direction: "forward" | "reverse"
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    const arches = clamp(cfg.arches, 1, 20, DEFAULTS.arches)
    // Squared: the first few arches change the whole read of the corridor, the
    // last few only thicken a colonnade that is already dense.
    const count = Math.round(6 + arches * arches * 0.55)
    return {
        count,
        spacing: SPAN / count,
        opening: clamp(cfg.opening, 30, 100, DEFAULTS.opening) * 0.01,
        corner: 0.02 + clamp(cfg.cornerRadius, 0, 100, DEFAULTS.cornerRadius) * 0.0096,
        // Turns per unit of depth; a whole turn over the corridor is plenty.
        twist: clamp(cfg.twist, 0, 20, DEFAULTS.twist) * 0.022,
        width: 0.008 + clamp(cfg.gauge, 1, 20, DEFAULTS.gauge) * 0.0085,
        glow: 0.25 + clamp(cfg.glow, 1, 20, DEFAULTS.glow) * 0.13,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.38,
        heading: cfg.direction === "reverse" ? -1 : 1,
        zoom: 100 / clamp(cfg.sizePercent, 40, 200, DEFAULTS.sizePercent),
    }
}

/**
 * The outline of a unit rounded square, as a closed loop of points. Built on a
 * half-size of 1 and scaled by the opening in the shader, so the opening slider
 * is a uniform write rather than a rebuild.
 */
function traceOutline(corner: number): THREE.Vector2[] {
    const c = Math.min(Math.max(corner, 0.02), 0.98)
    const k = 1 - c
    const centres: [number, number][] = [
        [k, -k],
        [k, k],
        [-k, k],
        [-k, -k],
    ]
    const pts: THREE.Vector2[] = []
    for (let q = 0; q < 4; q++) {
        const [cx, cy] = centres[q]
        // Each quadrant's arc sweeps a quarter turn, starting where the
        // previous straight edge left off.
        const a0 = (q * Math.PI) / 2 - Math.PI / 2
        for (let j = 0; j <= ARC_STEPS; j++) {
            const a = a0 + (j / ARC_STEPS) * (Math.PI / 2)
            pts.push(new THREE.Vector2(cx + Math.cos(a) * c, cy + Math.sin(a) * c))
        }
        // Interior points of the straight edge to the next arc. Endpoints are
        // already on the arcs; repeating one gives a zero-length segment and a
        // normalize() of nothing.
        const from = pts[pts.length - 1]
        const nq = (q + 1) % 4
        const b0 = (nq * Math.PI) / 2 - Math.PI / 2
        const to = new THREE.Vector2(
            centres[nq][0] + Math.cos(b0) * c,
            centres[nq][1] + Math.sin(b0) * c
        )
        if (from.distanceTo(to) > 1e-4) {
            for (let j = 1; j < EDGE_STEPS; j++) {
                const t = j / EDGE_STEPS
                pts.push(
                    new THREE.Vector2(
                        from.x + (to.x - from.x) * t,
                        from.y + (to.y - from.y) * t
                    )
                )
            }
        }
    }
    return pts
}

/** The outline widened into a ribbon: two vertices per point, pushed apart in
 *  the shader along the curve normal stored here. */
function buildOutline(corner: number): THREE.BufferGeometry {
    const pts = traceOutline(corner)
    const n = pts.length
    // One extra column repeating the first point, so the ribbon closes with the
    // same seam every other join has rather than a visible butt end.
    const cols = n + 1
    const pos = new Float32Array(cols * 2 * 3)
    const nrm = new Float32Array(cols * 2 * 2)
    const side = new Float32Array(cols * 2)
    const dir = new THREE.Vector2()
    const prev = new THREE.Vector2()
    const next = new THREE.Vector2()

    for (let i = 0; i < cols; i++) {
        const idx = i % n
        const p = pts[idx]
        // The average of the two neighbouring segment directions, each
        // normalised first: the sampling is denser round the corners than along
        // the flats, and a plain difference of neighbours would lean towards
        // whichever side happens to be further away.
        prev.subVectors(p, pts[(idx - 1 + n) % n])
        next.subVectors(pts[(idx + 1) % n], p)
        if (prev.lengthSq() > 1e-12) prev.normalize()
        if (next.lengthSq() > 1e-12) next.normalize()
        dir.addVectors(prev, next)
        if (dir.lengthSq() < 1e-12) dir.copy(next)
        dir.normalize()
        // Right-hand normal, which points outward for a loop traced counter
        // clockwise.
        const nx = dir.y
        const ny = -dir.x

        for (let s = 0; s < 2; s++) {
            const v = i * 2 + s
            pos[v * 3 + 0] = p.x
            pos[v * 3 + 1] = p.y
            pos[v * 3 + 2] = 0
            nrm[v * 2 + 0] = nx
            nrm[v * 2 + 1] = ny
            side[v] = s === 0 ? -1 : 1
        }
    }

    const index: number[] = []
    for (let i = 0; i < cols - 1; i++) {
        const a = i * 2
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    geo.setAttribute("aNormal", new THREE.BufferAttribute(nrm, 2))
    geo.setAttribute("aSide", new THREE.BufferAttribute(side, 1))
    geo.setIndex(index)
    return geo
}

const ARCH_VERTEX = /* glsl */ `
attribute vec2 aNormal;
attribute float aSide;
attribute float aSlot;

uniform float uTime;
uniform float uSpacing;
uniform float uSpan;
uniform float uTwist;
uniform float uOpening;
uniform float uWidth;

varying float vSide;
varying float vDepth;

void main() {
    // Depth wrapped by the length of the corridor: the arch that passes the
    // lens is already back at the far end, with nothing respawned and no
    // counter to drift over a long session.
    float z = mod(aSlot * uSpacing + uTime, uSpan);

    // Part of the widening rides with distance. A stroke of constant world
    // width falls under a pixel at the far end and scintillates as it moves;
    // one of constant screen width has no taper left to read as depth.
    float w = uWidth * (0.5 + z * 0.35);

    vec2 p = position.xy * uOpening + aNormal * aSide * w * 0.5;

    // Angle from depth, not from index, so the spiral stands still in space and
    // the arches travel along it.
    float a = z * uTwist;
    float ca = cos(a);
    float sa = sin(a);
    p = mat2(ca, sa, -sa, ca) * p;

    vSide = aSide;
    vDepth = z / uSpan;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, -z, 1.0);
}
`

const ARCH_FRAGMENT = /* glsl */ `
precision highp float;

uniform vec3 uNear;
uniform vec3 uFar;
uniform float uGlow;

varying float vSide;
varying float vDepth;

void main() {
    float across = 1.0 - abs(vSide);
    // One falloff cannot be both a hard stroke and the haze around it, so the
    // core and the bloom are two powers of the same ramp.
    float shape = pow(across, 5.0) + pow(across, 1.6) * 0.35;

    vec3 col = mix(uNear, uFar, vDepth);

    // Out of the dark at the far end, cut before an arch swallows the lens, so
    // no single arch ever fills the frame with a flat band of colour.
    float fog = (1.0 - smoothstep(0.35, 0.95, vDepth)) * smoothstep(0.0, 0.06, vDepth);

    float amount = shape * fog * uGlow;
    gl_FragColor = vec4(col * amount, amount);
}
`

class ArchCorridorScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(70, 1, 0.05, SPAN + 6)
    private geometry: THREE.BufferGeometry | null = null
    private material: THREE.ShaderMaterial
    private mesh: THREE.InstancedMesh | null = null
    private uniforms: Record<string, THREE.IUniform>
    private width = 1
    private height = 1
    private time = 0
    private lastT = 0
    private frameId = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        const canvas = this.renderer.domElement
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        container.appendChild(canvas)

        const S = settingsFor(cfg)
        this.uniforms = {
            uTime: { value: 0 },
            uSpacing: { value: S.spacing },
            uSpan: { value: SPAN },
            uTwist: { value: S.twist },
            uOpening: { value: S.opening },
            uWidth: { value: S.width },
            uNear: { value: new THREE.Color(cfg.near) },
            uFar: { value: new THREE.Color(cfg.far) },
            uGlow: { value: S.glow },
        }
        this.material = new THREE.ShaderMaterial({
            vertexShader: ARCH_VERTEX,
            fragmentShader: ARCH_FRAGMENT,
            uniforms: this.uniforms,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            side: THREE.DoubleSide,
        })
        this.rebuild()
        this.camera.position.set(0, 0, 0)
        this.camera.lookAt(0, 0, -1)
    }

    private rebuild() {
        const S = settingsFor(this.cfg)
        if (this.mesh) {
            this.scene.remove(this.mesh)
            this.mesh.dispose()
            this.mesh = null
        }
        this.geometry?.dispose()
        const geo = buildOutline(S.corner)
        this.geometry = geo

        const mesh = new THREE.InstancedMesh(geo, this.material, S.count)
        // The instance matrix buffer starts zero-filled and a zero matrix
        // collapses every arch to a point; write the identity once. All the
        // placing happens in the vertex shader.
        const identity = new THREE.Matrix4()
        const slot = new Float32Array(S.count)
        for (let i = 0; i < S.count; i++) {
            mesh.setMatrixAt(i, identity)
            slot[i] = i
        }
        mesh.instanceMatrix.needsUpdate = true
        geo.setAttribute("aSlot", new THREE.InstancedBufferAttribute(slot, 1))
        // The shader moves the arches down the corridor; three cannot know
        // where any of this ends up.
        mesh.frustumCulled = false
        this.scene.add(mesh)
        this.mesh = mesh
        this.uniforms.uSpacing.value = S.spacing
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            this.frameId = requestAnimationFrame(loop)
            this.step()
        }
        this.frameId = requestAnimationFrame(loop)
    }

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)
        this.updateCamera()
    }

    private updateCamera() {
        const aspect = this.width / this.height
        const S = settingsFor(this.cfg)
        // Framed on the opening one unit ahead; portrait needs a wider field or
        // the arches close over the top and bottom of the frame.
        const span = S.opening * 2.1 * S.zoom
        const visibleHeight = aspect < 1 ? span / aspect : span
        this.camera.aspect = aspect
        this.camera.fov = 2 * Math.atan(visibleHeight / 2 / 1.0) * (180 / Math.PI)
        this.camera.updateProjectionMatrix()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        const S = settingsFor(cfg)
        this.uniforms.uTwist.value = S.twist
        this.uniforms.uOpening.value = S.opening
        this.uniforms.uWidth.value = S.width
        this.uniforms.uGlow.value = S.glow
        ;(this.uniforms.uNear.value as THREE.Color).set(cfg.near)
        ;(this.uniforms.uFar.value as THREE.Color).set(cfg.far)
        // The arch count and the corner radius own the buffer; opening, the
        // twist, the weight and the colours are all uniform writes.
        if (cfg.arches !== prev.arches || cfg.cornerRadius !== prev.cornerRadius) this.rebuild()
        if (cfg.sizePercent !== prev.sizePercent) this.updateCamera()
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A tab coming back from the background must not teleport the corridor.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        if (this.cfg.animate) this.time += dt * S.speed * S.heading
        this.uniforms.uTime.value = this.time
        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        if (this.mesh) {
            this.scene.remove(this.mesh)
            this.mesh.dispose()
        }
        this.geometry?.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        if (canvas.parentNode === this.container) this.container.removeChild(canvas)
    }
}

export interface ArchCorridorProps {
    background?: string
    near?: string
    far?: string
    arches?: number
    twist?: number
    gauge?: number
    cornerRadius?: number
    opening?: number
    glow?: number
    animate?: boolean
    speed?: number
    direction?: "forward" | "reverse"
    sizePercent?: number
    style?: React.CSSProperties
}

export default function ArchCorridor(props: ArchCorridorProps) {
    const {
        background = DEFAULTS.background,
        near = DEFAULTS.near,
        far = DEFAULTS.far,
        arches = DEFAULTS.arches,
        twist = DEFAULTS.twist,
        gauge = DEFAULTS.gauge,
        cornerRadius = DEFAULTS.cornerRadius,
        opening = DEFAULTS.opening,
        glow = DEFAULTS.glow,
        animate = DEFAULTS.animate,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction as "forward" | "reverse",
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<ArchCorridorScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        background,
        near,
        far,
        arches,
        twist,
        gauge,
        cornerRadius,
        opening,
        glow,
        animate,
        speed,
        direction,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: ArchCorridorScene
        try {
            scene = new ArchCorridorScene(container, cfgRef.current)
        } catch {
            // No WebGL — an empty frame beats a thrown error on the canvas.
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
    }, [background, near, far, arches, twist, gauge, cornerRadius, opening, glow, animate, speed, direction, sizePercent])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A run of glowing arch outlines turning slowly as it recedes"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                backgroundColor: background,
                ...style,
            }}
        />
    )
}

ArchCorridor.displayName = "Arch Corridor"
ArchCorridor.defaultProps = { ...DEFAULTS }
