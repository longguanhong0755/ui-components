"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Hex Flux — a honeycomb lattice with a current running through it.
 *
 * The plane is folded onto one hexagon by testing two offset rectangular
 * lattices and keeping whichever centre is nearer. That is the whole tiling: no
 * axial coordinates, no rounding of cube coordinates, one comparison. Drawing
 * hexes as geometry would need thousands of quads and would still not give a
 * cheap way to ask "which cell is this pixel in".
 *
 * What makes it a *flow* rather than a lit-up grid is that every cell samples
 * the field at its own centre — one value for the entire cell, not per pixel. A
 * smooth field read per pixel just looks like fog behind a grid; read per cell
 * it quantises into a mosaic, and a wave crossing it advances cell by cell the
 * way a signal crosses a circuit.
 *
 * The wave and the noise are added, not multiplied. Multiplying let the noise
 * gate the wave out entirely in its low patches, and the current appeared to
 * stall in mid-frame.
 */

const DEFAULTS = {
    ground: "#07090F",
    cell: "#16324A",
    lit: "#59E7D2",
    edge: "#8FA6C4",
    cellSize: 1,
    flow: 11,
    wave: 4,
    detail: 20,
    gap: 10,
    outline: 10,
    glow: 20,
    speed: 20,
    followPointer: true,
    bloom: 20,
}

type Config = {
    ground: string
    cell: string
    lit: string
    edge: string
    cellSize: number
    flow: number
    wave: number
    detail: number
    gap: number
    outline: number
    glow: number
    speed: number
    followPointer: boolean
    bloom: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    const size = clamp(cfg.cellSize, 1, 20, DEFAULTS.cellSize)
    return {
        /*
         * Reversed here rather than in the shader: a bigger Cell Size means
         * fewer hexes across the frame, so the number the shader multiplies by
         * has to come down as the panel value goes up.
         */
        density: 3.0 + (21 - size) * 1.6,
        flow: clamp(cfg.flow, 0, 20, DEFAULTS.flow) * 0.075,
        // Wavelength of the travelling front, in cells.
        wave: 0.05 + clamp(cfg.wave, 0, 20, DEFAULTS.wave) * 0.055,
        detail: 1.0 + clamp(cfg.detail, 1, 20, DEFAULTS.detail) * 0.16,
        // How much of the hex is left unpainted, as a fraction of its radius.
        gap: 0.04 + clamp(cfg.gap, 0, 20, DEFAULTS.gap) * 0.016,
        outline: 0.5 + clamp(cfg.outline, 0, 20, DEFAULTS.outline) * 0.16,
        glow: clamp(cfg.glow, 0, 20, DEFAULTS.glow) * 0.07,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.09,
        /*
         * Reversed here, not in the shader: the shader wants the falloff
         * coefficient of a gaussian, and a *smaller* coefficient is a wider
         * bloom. The panel reads as "how much", so the number has to come down
         * as the slider goes up.
         */
        bloom: (21 - clamp(cfg.bloom, 0, 20, DEFAULTS.bloom)) * 0.024,
    }
}

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const HEX_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform vec3 uGround;
    uniform vec3 uCell;
    uniform vec3 uLit;
    uniform vec3 uEdge;
    uniform float uTime;
    uniform float uDensity;
    uniform float uFlow;
    uniform float uWave;
    uniform float uDetail;
    uniform float uGap;
    uniform float uOutline;
    uniform float uGlow;
    uniform float uGrip;
    uniform float uBloom;

    varying vec2 vUv;

    float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 34.56);
        return fract(p.x * p.y * 95.43);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
        );
    }

    float fbm(vec2 p) {
        float sum = 0.0;
        float amp = 0.5;
        float norm = 0.0;
        for (int i = 0; i < 5; i++) {
            float w = clamp(uDetail - float(i), 0.0, 1.0);
            sum += noise(p) * amp * w;
            norm += amp * w;
            p = mat2(0.8, 0.6, -0.6, 0.8) * p * 2.03;
            amp *= 0.5;
        }
        return sum / max(0.0001, norm);
    }

    /*
     * Fold the plane onto one hexagon. Two rectangular lattices, one offset by
     * half a step in each axis; the nearer centre wins. Returns the local
     * position in xy and the cell centre in zw.
     */
    vec4 hexFold(vec2 p) {
        vec2 s = vec2(1.0, 1.7320508);
        vec2 h = s * 0.5;
        vec2 a = mod(p, s) - h;
        vec2 b = mod(p - h, s) - h;
        vec2 gv = dot(a, a) < dot(b, b) ? a : b;
        return vec4(gv, p - gv);
    }

    /** Distance to the hexagon boundary in the local frame. */
    float hexDist(vec2 p) {
        p = abs(p);
        return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
    }

    void main() {
        float aspect = uResolution.x / max(1.0, uResolution.y);
        vec2 uv = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
        vec2 p = uv * uDensity;

        vec4 cellData = hexFold(p);
        vec2 local = cellData.xy;
        vec2 id = cellData.zw;

        /*
         * The field is read once at the cell centre, so every pixel in a cell
         * agrees. Sampling per pixel instead gives a smooth wash that happens to
         * have a grid drawn on top of it — the lattice stops being the subject.
         */
        vec2 drift = vec2(uTime * uFlow, uTime * uFlow * 0.35);
        float body = fbm(id * 0.13 + drift);

        // A front travelling along the lattice. Whole cells light in turn.
        float front = 0.5 + 0.5 * sin(dot(id, vec2(0.62, 0.78)) * uWave - uTime * 1.4);

        // Added, not multiplied: multiplying let the noise gate the front out in
        // its low patches and the current looked like it stalled.
        float charge = clamp(body * 0.75 + front * 0.45 - 0.25, 0.0, 1.0);

        // A bloom of charge round the cursor, falling off over a few cells.
        vec2 aim = vec2((uPointer.x - 0.5) * aspect, uPointer.y - 0.5) * uDensity;
        float near = length(id - aim);
        charge += uGrip * exp(-near * near * uBloom) * 0.9;
        charge = clamp(charge, 0.0, 1.0);

        // The painted face shrinks and grows with the charge, which reads as the
        // cell filling rather than merely brightening.
        float d = hexDist(local);
        float radius = (0.5 - uGap) * (0.55 + charge * 0.45);
        float aa = fwidth(d) + 0.0005;
        float face = 1.0 - smoothstep(radius - aa, radius + aa, d);

        // The outline is drawn in pixels, not in cell units, so it stays the
        // same weight whatever the density is set to.
        float rim = 1.0 - smoothstep(0.0, uOutline, abs(d - (0.5 - uGap)) / max(fwidth(d), 0.0001));

        vec3 col = uGround;
        col = mix(col, uCell, face);
        col = mix(col, uLit, face * smoothstep(0.25, 1.0, charge));
        col += uEdge * rim * (0.25 + charge * 0.75);
        col += uLit * face * pow(charge, 3.0) * uGlow * 3.0;

        gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
`

class HexScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private pointer = new THREE.Vector2(0.5, 0.5)
    private pointerTarget = new THREE.Vector2(0.5, 0.5)
    private grip = 0
    private gripTarget = 0

    private time = 0
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setClearColor(0x000000, 0)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: HEX_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uPointer: { value: new THREE.Vector2(0.5, 0.5) },
                uGround: { value: new THREE.Color(cfg.ground) },
                uCell: { value: new THREE.Color(cfg.cell) },
                uLit: { value: new THREE.Color(cfg.lit) },
                uEdge: { value: new THREE.Color(cfg.edge) },
                uTime: { value: 0 },
                uDensity: { value: S.density },
                uFlow: { value: S.flow },
                uWave: { value: S.wave },
                uDetail: { value: S.detail },
                uGap: { value: S.gap },
                uOutline: { value: S.outline },
                uGlow: { value: S.glow },
                uGrip: { value: 0 },
                uBloom: { value: S.bloom },
            },
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        container.addEventListener("pointerenter", this.onEnter)
        container.addEventListener("pointerleave", this.onLeave)
        container.addEventListener("pointercancel", this.onLeave)
        container.addEventListener("pointermove", this.onMove)
    }

    private onEnter = () => {
        this.gripTarget = 1
    }
    private onLeave = () => {
        this.gripTarget = 0
    }
    private onMove = (e: PointerEvent) => {
        const rect = this.container.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        this.pointerTarget.set(
            (e.clientX - rect.left) / rect.width,
            1 - (e.clientY - rect.top) / rect.height
        )
    }

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
        this.renderer.setSize(width, height, false)
        this.material.uniforms.uResolution.value.set(width, height)
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.material.uniforms
        u.uGround.value.set(cfg.ground || "#000000")
        u.uCell.value.set(cfg.cell || "#16324A")
        u.uLit.value.set(cfg.lit || "#59E7D2")
        u.uEdge.value.set(cfg.edge || "#8FA6C4")
        u.uDensity.value = S.density
        u.uFlow.value = S.flow
        u.uWave.value = S.wave
        u.uDetail.value = S.detail
        u.uGap.value = S.gap
        u.uOutline.value = S.outline
        u.uGlow.value = S.glow
        u.uBloom.value = S.bloom
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        this.time += dt * settingsFor(this.cfg).speed

        this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-dt * 10))
        const want = this.cfg.followPointer ? this.gripTarget : 0
        this.grip += (want - this.grip) * (1 - Math.exp(-dt * 4))

        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uPointer.value.copy(this.pointer)
        u.uGrip.value = this.grip

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.container.removeEventListener("pointerenter", this.onEnter)
        this.container.removeEventListener("pointerleave", this.onLeave)
        this.container.removeEventListener("pointercancel", this.onLeave)
        this.container.removeEventListener("pointermove", this.onMove)
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

interface HexFluxProps {
    ground?: string
    cell?: string
    lit?: string
    edge?: string
    cellSize?: number
    flow?: number
    wave?: number
    detail?: number
    gap?: number
    outline?: number
    glow?: number
    speed?: number
    followPointer?: boolean
    bloom?: number
    style?: React.CSSProperties
}

export default function HexFlux(props: HexFluxProps) {
    const {
        ground = DEFAULTS.ground,
        cell = DEFAULTS.cell,
        lit = DEFAULTS.lit,
        edge = DEFAULTS.edge,
        cellSize = DEFAULTS.cellSize,
        flow = DEFAULTS.flow,
        wave = DEFAULTS.wave,
        detail = DEFAULTS.detail,
        gap = DEFAULTS.gap,
        outline = DEFAULTS.outline,
        glow = DEFAULTS.glow,
        speed = DEFAULTS.speed,
        followPointer = DEFAULTS.followPointer,
        bloom = DEFAULTS.bloom,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<HexScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        ground,
        cell,
        lit,
        edge,
        cellSize,
        flow,
        wave,
        detail,
        gap,
        outline,
        glow,
        speed,
        followPointer,
        bloom,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: HexScene
        try {
            scene = new HexScene(container, cfgRef.current)
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
        ground,
        cell,
        lit,
        edge,
        cellSize,
        flow,
        wave,
        detail,
        gap,
        outline,
        glow,
        speed,
        followPointer,
        bloom,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A honeycomb lattice with a current running through it"
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

HexFlux.displayName = "Hex Flux"
HexFlux.defaultProps = { ...DEFAULTS }
