"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Star Gate — a run of glowing star outlines receding down a corridor.
 *
 * Each star is one continuous closed ribbon. The outline is sampled into a loop
 * of points carrying the curve normal and a miter scale, and the vertex shader
 * pushes the ribbon apart along them. The miter is the whole reason this shape
 * works at all: a star is nothing but sharp corners, and averaged normals alone
 * neck the stroke to nothing at every single tip.
 *
 * Alternate gates counter-rotate. A single shared twist made the run read as
 * one rigid drill bit; opposing it every other gate gives the corridor a
 * shearing, interlocking motion instead.
 */

const SPAN = 22
const EDGE_STEPS = 5

const DEFAULTS = {
    near: "#00FFF0",
    far: "#2A00FF",
    points: 8,
    spike: 20,
    gates: 16,
    twist: 20,
    gauge: 5,
    glow: 3,
    speed: 2,
    direction: "forward",
    sizePercent: 136,
}

type Config = {
    near: string
    far: string
    points: number
    spike: number
    gates: number
    twist: number
    gauge: number
    glow: number
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
    const gates = clamp(cfg.gates, 1, 20, DEFAULTS.gates)
    const count = Math.round(6 + gates * gates * 0.55)
    return {
        count,
        points: Math.round(clamp(cfg.points, 3, 12, DEFAULTS.points)),
        // Reversed: the panel reads as how far the spikes stick out, which is a
        // small inner radius.
        inner: 0.92 - clamp(cfg.spike, 1, 20, DEFAULTS.spike) * 0.036,
        spacing: SPAN / count,
        scale: 0.66,
        twist: clamp(cfg.twist, 0, 20, DEFAULTS.twist) * 0.026,
        width: 0.008 + clamp(cfg.gauge, 1, 20, DEFAULTS.gauge) * 0.0085,
        glow: 0.25 + clamp(cfg.glow, 1, 20, DEFAULTS.glow) * 0.13,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.38,
        heading: cfg.direction === "reverse" ? -1 : 1,
        zoom: 100 / clamp(cfg.sizePercent, 40, 200, DEFAULTS.sizePercent),
    }
}

type Stroke = { pts: THREE.Vector2[]; closed: boolean }

/** Strokes widened into ribbons: two vertices per point, pushed apart in the
 *  shader along the normal and miter stored here. */
function ribbonFromStrokes(strokes: Stroke[]): THREE.BufferGeometry {
    const pos: number[] = []
    const nrm: number[] = []
    const side: number[] = []
    const miter: number[] = []
    const index: number[] = []
    const back = new THREE.Vector2()
    const fwd = new THREE.Vector2()
    const dir = new THREE.Vector2()
    let base = 0

    for (const st of strokes) {
        const n = st.pts.length
        if (n < 2) continue
        const cols = st.closed ? n + 1 : n
        for (let i = 0; i < cols; i++) {
            const k = i % n
            const p = st.pts[k]
            const kb = st.closed ? (k - 1 + n) % n : Math.max(k - 1, 0)
            const kf = st.closed ? (k + 1) % n : Math.min(k + 1, n - 1)
            back.subVectors(p, st.pts[kb])
            fwd.subVectors(st.pts[kf], p)
            if (back.lengthSq() > 1e-12) back.normalize()
            else back.set(0, 0)
            if (fwd.lengthSq() > 1e-12) fwd.normalize()
            else fwd.set(0, 0)
            dir.addVectors(back, fwd)
            if (dir.lengthSq() < 1e-12) dir.copy(fwd.lengthSq() > 1e-12 ? fwd : back)
            if (dir.lengthSq() < 1e-12) dir.set(1, 0)
            dir.normalize()
            const nx = dir.y
            const ny = -dir.x
            const segRef = fwd.lengthSq() > 1e-12 ? fwd : back
            // Capped, or a near-fold at a deep spike spikes off the screen.
            const m = Math.min(1 / Math.max(nx * segRef.y - ny * segRef.x, 0.3), 3.5)
            for (let s = 0; s < 2; s++) {
                pos.push(p.x, p.y, 0)
                nrm.push(nx, ny)
                side.push(s === 0 ? -1 : 1)
                miter.push(m)
            }
        }
        for (let i = 0; i < cols - 1; i++) {
            const v = base + i * 2
            index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2)
        }
        base += cols * 2
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute("aNormal", new THREE.Float32BufferAttribute(nrm, 2))
    geo.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1))
    geo.setAttribute("aMiter", new THREE.Float32BufferAttribute(miter, 1))
    geo.setIndex(index)
    return geo
}

function traceStar(points: number, inner: number): Stroke[] {
    const pts: THREE.Vector2[] = []
    const total = points * 2
    const corner = (i: number) => {
        const r = i % 2 === 0 ? 1 : inner
        const a = (i / total) * Math.PI * 2 - Math.PI / 2
        return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)
    }
    for (let e = 0; e < total; e++) {
        const from = corner(e)
        const to = corner((e + 1) % total)
        // Edge interior only; the next edge contributes its own start point.
        for (let j = 0; j < EDGE_STEPS; j++) {
            const t = j / EDGE_STEPS
            pts.push(
                new THREE.Vector2(
                    from.x + (to.x - from.x) * t,
                    from.y + (to.y - from.y) * t
                )
            )
        }
    }
    return [{ pts, closed: true }]
}

const STAR_VERTEX = /* glsl */ `
attribute vec2 aNormal;
attribute float aSide;
attribute float aMiter;
attribute float aSlot;

uniform float uTime;
uniform float uSpacing;
uniform float uSpan;
uniform float uTwist;
uniform float uScale;
uniform float uWidth;

varying float vSide;
varying float vDepth;

void main() {
    // Depth wrapped by the length of the corridor: the gate that passes the
    // lens is already back at the far end, with nothing respawned.
    float z = mod(aSlot * uSpacing + uTime, uSpan);

    // Part of the widening rides with distance, or the far stars fall under a
    // pixel and scintillate as they move.
    float w = uWidth * (0.5 + z * 0.35);

    vec2 p = position.xy * uScale + aNormal * aSide * aMiter * w * 0.5;

    // Every other gate turns the other way. mod on the slot rather than on the
    // depth, so a gate keeps its handedness for its whole run instead of
    // flipping as it wraps.
    float hand = mod(aSlot, 2.0) < 0.5 ? 1.0 : -1.0;
    float a = z * uTwist * hand;
    float ca = cos(a);
    float sa = sin(a);
    p = mat2(ca, sa, -sa, ca) * p;

    vSide = aSide;
    vDepth = z / uSpan;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, -z, 1.0);
}
`

const STAR_FRAGMENT = /* glsl */ `
precision highp float;

uniform vec3 uNear;
uniform vec3 uFar;
uniform float uGlow;

varying float vSide;
varying float vDepth;

void main() {
    float across = 1.0 - abs(vSide);
    // A hard core and a haze around it are two powers of the same ramp; one
    // falloff cannot be both.
    float shape = pow(across, 5.0) + pow(across, 1.6) * 0.35;

    vec3 col = mix(uNear, uFar, vDepth);
    float fog = (1.0 - smoothstep(0.35, 0.95, vDepth)) * smoothstep(0.0, 0.06, vDepth);

    float amount = shape * fog * uGlow;
    gl_FragColor = vec4(col * amount, amount);
}
`

class StarGateScene {
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
            uScale: { value: S.scale },
            uWidth: { value: S.width },
            uNear: { value: new THREE.Color(cfg.near) },
            uFar: { value: new THREE.Color(cfg.far) },
            uGlow: { value: S.glow },
        }
        this.material = new THREE.ShaderMaterial({
            vertexShader: STAR_VERTEX,
            fragmentShader: STAR_FRAGMENT,
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
        const geo = ribbonFromStrokes(traceStar(S.points, S.inner))
        this.geometry = geo

        const mesh = new THREE.InstancedMesh(geo, this.material, S.count)
        // A zero matrix collapses every gate to a point; write the identity
        // once, since all the placing happens in the vertex shader.
        const identity = new THREE.Matrix4()
        const slot = new Float32Array(S.count)
        for (let i = 0; i < S.count; i++) {
            mesh.setMatrixAt(i, identity)
            slot[i] = i
        }
        mesh.instanceMatrix.needsUpdate = true
        geo.setAttribute("aSlot", new THREE.InstancedBufferAttribute(slot, 1))
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
        const span = S.scale * 2.1 * S.zoom
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
        this.uniforms.uWidth.value = S.width
        this.uniforms.uGlow.value = S.glow
        ;(this.uniforms.uNear.value as THREE.Color).set(cfg.near)
        ;(this.uniforms.uFar.value as THREE.Color).set(cfg.far)
        // The count and the shape of the star own the buffers.
        if (
            cfg.gates !== prev.gates ||
            cfg.points !== prev.points ||
            cfg.spike !== prev.spike
        ) {
            this.rebuild()
        }
        if (cfg.sizePercent !== prev.sizePercent) this.updateCamera()
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.speed * S.heading
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

export interface StarGateProps extends Config {
    style?: React.CSSProperties
}

function __BaseImpl_StarGate(props: StarGateProps) {
    const {
        near = DEFAULTS.near,
        far = DEFAULTS.far,
        points = DEFAULTS.points,
        spike = DEFAULTS.spike,
        gates = DEFAULTS.gates,
        twist = DEFAULTS.twist,
        gauge = DEFAULTS.gauge,
        glow = DEFAULTS.glow,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction as Config["direction"],
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<StarGateScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        near,
        far,
        points,
        spike,
        gates,
        twist,
        gauge,
        glow,
        speed,
        direction,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: StarGateScene
        try {
            scene = new StarGateScene(container, cfgRef.current)
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
    }, [
        near,
        far,
        points,
        spike,
        gates,
        twist,
        gauge,
        glow,
        speed,
        direction,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A corridor of glowing star outlines"
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

StarGate.displayName = "Star Gate"
StarGate.defaultProps = { ...DEFAULTS }

const __presetProps = {
  "near": "#00FFF0",
  "far": "#2A00FF",
  "points": 8,
  "spike": 20,
  "gates": 16,
  "twist": 20,
  "gauge": 5,
  "glow": 3,
  "speed": 2,
  "direction": "forward",
  "sizePercent": 136
};

export default function StarGate(props: Record<string, unknown>) {
  return <__BaseImpl_StarGate {...(__presetProps as Record<string, unknown>)} {...props} />;
}
