"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Helix Shaft — strands of lamps winding down the inside of a shaft.
 *
 * Each lamp knows two numbers: which strand it belongs to and how far along
 * that strand it sits. Everything else — the angle round the wall, the depth,
 * the pulse running down it — is that pair plus the clock, so the whole field
 * is one draw call of points with nothing written per frame.
 *
 * The angle is taken from the wrapped depth rather than from the lamp's index,
 * which matters: index-based winding makes the helix scroll as a rigid barber
 * pole, while depth-based winding keeps the spiral fixed in space and lets the
 * lamps travel along it, which is what a stairwell of lights actually does.
 */

// Length of the shaft in world units. The lamps wrap within it.
const SPAN = 22

const DEFAULTS = {
    core: "#FFB000",
    halo: "#DF00FF",
    strands: 30,
    lamps: 20,
    twist: 20,
    spread: 11,
    bead: 8,
    glow: 11,
    speed: 4,
    direction: "forward",
    sizePercent: 100,
}

type Config = {
    core: string
    halo: string
    strands: number
    lamps: number
    twist: number
    spread: number
    bead: number
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
    const strands = Math.round(clamp(cfg.strands, 1, 50, DEFAULTS.strands))
    const lamps = clamp(cfg.lamps, 1, 20, DEFAULTS.lamps)
    // Squared: at the sparse end each lamp is an event, at the dense end the
    // strand wants to read as a continuous cable.
    const perStrand = Math.round(24 + lamps * lamps * 1.3)
    return {
        strands,
        perStrand,
        count: strands * perStrand,
        spacing: SPAN / perStrand,
        // Turns per unit of depth. Kept modest: past about half a turn per unit
        // the near lamps cross the frame faster than the eye can follow them.
        twist: clamp(cfg.twist, 0, 20, DEFAULTS.twist) * 0.055,
        radius: 0.25 + clamp(cfg.spread, 1, 20, DEFAULTS.spread) * 0.055,
        bead: 12 + clamp(cfg.bead, 1, 20, DEFAULTS.bead) * 11,
        glow: 0.25 + clamp(cfg.glow, 1, 20, DEFAULTS.glow) * 0.12,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.42,
        heading: cfg.direction === "reverse" ? -1 : 1,
        zoom: 100 / clamp(cfg.sizePercent, 40, 200, DEFAULTS.sizePercent),
    }
}

const LAMP_VERTEX = /* glsl */ `
attribute float aSlot;
attribute float aStrand;

uniform float uTime;
uniform float uSpacing;
uniform float uSpan;
uniform float uTwist;
uniform float uRadius;
uniform float uBead;
uniform float uStrands;
uniform float uHeight;

varying float vDepth;
varying float vPulse;

void main() {
    // Depth wrapped by the length of the shaft: the lamp that passes the lens
    // is already back at the far end, with no counter and no respawn.
    float z = mod(aSlot * uSpacing + uTime, uSpan);

    // Winding taken from depth, so the spiral stands still and the lamps move
    // along it rather than the whole helix rotating past.
    float ang = (aStrand / uStrands) * 6.2831853 + z * uTwist;

    // The wall breathes a little, which stops the strands reading as three
    // perfectly parallel wires drawn on a cylinder.
    float rad = uRadius * (0.88 + 0.12 * sin(z * 0.55 + aStrand * 1.7));

    vec3 p = vec3(cos(ang) * rad, sin(ang) * rad, -z);

    // Cubed, so the pulse is a travelling band of a few bright lamps rather
    // than a general rise and fall over the whole strand.
    float wave = 0.5 + 0.5 * sin(z * 1.15 - uTime * 2.6 + aStrand * 1.3);
    vPulse = wave * wave * wave;
    vDepth = z / uSpan;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // Perspective size by hand: sprites do not get it for free, and a fixed
    // size makes the far end of the shaft read as confetti at the same scale
    // as the lamp about to pass your ear.
    gl_PointSize = uBead * (uHeight / 900.0) / max(-mv.z, 0.08);
}
`

const LAMP_FRAGMENT = /* glsl */ `
precision highp float;

uniform vec3 uCore;
uniform vec3 uHalo;
uniform float uGlow;

varying float vDepth;
varying float vPulse;

void main() {
    vec2 d = gl_PointCoord - 0.5;
    float fall = clamp(1.0 - length(d) * 2.0, 0.0, 1.0);
    // One falloff cannot be both a sharp lamp and the glow around it, so the
    // spike and the bloom are two powers of the same ramp.
    float shape = pow(fall, 5.0) + pow(fall, 1.6) * 0.3;

    vec3 col = mix(uHalo, uCore, vPulse * 0.75 + (1.0 - vDepth) * 0.35);

    // Out of the dark at the far end, cut before it reaches the lens.
    float fog = (1.0 - smoothstep(0.35, 0.95, vDepth)) * smoothstep(0.0, 0.05, vDepth);

    float a = shape * fog * uGlow * (0.30 + vPulse * 1.5);
    gl_FragColor = vec4(col * a, a);
}
`

class HelixShaftScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(70, 1, 0.05, SPAN + 6)
    private geometry = new THREE.BufferGeometry()
    private material: THREE.ShaderMaterial
    private points: THREE.Points | null = null
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
            uRadius: { value: S.radius },
            uBead: { value: S.bead },
            uStrands: { value: S.strands },
            uHeight: { value: 900 },
            uCore: { value: new THREE.Color(cfg.core) },
            uHalo: { value: new THREE.Color(cfg.halo) },
            uGlow: { value: S.glow },
        }
        this.material = new THREE.ShaderMaterial({
            vertexShader: LAMP_VERTEX,
            fragmentShader: LAMP_FRAGMENT,
            uniforms: this.uniforms,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
        })
        this.rebuild()
        this.camera.position.set(0, 0, 0)
        this.camera.lookAt(0, 0, -1)
    }

    private rebuild() {
        const S = settingsFor(this.cfg)
        const count = S.count
        const pos = new Float32Array(count * 3)
        const slot = new Float32Array(count)
        const strand = new Float32Array(count)
        let i = 0
        for (let s = 0; s < S.strands; s++) {
            for (let k = 0; k < S.perStrand; k++) {
                slot[i] = k
                strand[i] = s
                i++
            }
        }
        this.geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3))
        this.geometry.setAttribute("aSlot", new THREE.BufferAttribute(slot, 1))
        this.geometry.setAttribute("aStrand", new THREE.BufferAttribute(strand, 1))
        if (!this.points) {
            this.points = new THREE.Points(this.geometry, this.material)
            // The vertex shader does the placing; the position buffer is zeros.
            this.points.frustumCulled = false
            this.scene.add(this.points)
        }
        this.uniforms.uSpacing.value = S.spacing
        this.uniforms.uStrands.value = S.strands
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
        this.uniforms.uHeight.value = this.height
        this.updateCamera()
    }

    private updateCamera() {
        const aspect = this.width / this.height
        const S = settingsFor(this.cfg)
        // Inside the shaft, so the camera holds still and the field of view
        // does the framing; portrait needs a wider one or the strands crowd in.
        const span = 2.0 * S.zoom
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
        this.uniforms.uRadius.value = S.radius
        this.uniforms.uBead.value = S.bead
        this.uniforms.uGlow.value = S.glow
        ;(this.uniforms.uCore.value as THREE.Color).set(cfg.core)
        ;(this.uniforms.uHalo.value as THREE.Color).set(cfg.halo)
        // Only the two counts own the buffers.
        if (cfg.strands !== prev.strands || cfg.lamps !== prev.lamps) {
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
        if (this.points) this.scene.remove(this.points)
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        if (canvas.parentNode === this.container) this.container.removeChild(canvas)
    }
}

type Props = Config & { style?: React.CSSProperties }

export default function HelixShaft(props: Props) {
    const {
        core = DEFAULTS.core,
        halo = DEFAULTS.halo,
        strands = DEFAULTS.strands,
        lamps = DEFAULTS.lamps,
        twist = DEFAULTS.twist,
        spread = DEFAULTS.spread,
        bead = DEFAULTS.bead,
        glow = DEFAULTS.glow,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<HelixShaftScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        core,
        halo,
        strands,
        lamps,
        twist,
        spread,
        bead,
        glow,
        speed,
        direction,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: HelixShaftScene
        try {
            scene = new HelixShaftScene(container, cfgRef.current)
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
        core,
        halo,
        strands,
        lamps,
        twist,
        spread,
        bead,
        glow,
        speed,
        direction,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Strands of lamps winding down a shaft"
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

HelixShaft.displayName = "Helix Shaft"
HelixShaft.defaultProps = { ...DEFAULTS }
