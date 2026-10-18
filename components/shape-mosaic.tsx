"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

const SHAPE_KINDS = 6

/*
 * How fast the field chases the cursor, per second — what five on the old
 * slider meant. Slower than this and the effect stops reading as the cursor's;
 * faster and it snaps to the pointer, which loses the sense of weight.
 */
const CURSOR_FOLLOW = 9.0

const DEFAULTS = {
    ink: "#8A8A8A",
    lit: "#FFCF6B",
    cell: 31,
    size: 9,
    kinds: 6,
    fill: 0,
    spin: 20,
    turn: 20,
    reach: 19,
}

type Config = {
    ink: string
    lit: string
    cell: number
    size: number
    kinds: number
    fill: number
    spin: number
    turn: number
    reach: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    const cell = clamp(cfg.cell, 14, 140, DEFAULTS.cell)
    return {
        cell,
        // A share of the cell. Never a full half, or neighbours touch and the
        // mosaic reads as one sheet.
        radius: cell * (0.1 + clamp(cfg.size, 1, 20, DEFAULTS.size) * 0.016),
        // The loop bound in the shader is this same constant; raising the panel
        // maximum without raising it there is a silent cap.
        kinds: clamp(cfg.kinds, 1, SHAPE_KINDS, DEFAULTS.kinds),
        // 0 is an outline, 1 is solid, and the shader crossfades between them.
        fill: clamp(cfg.fill, 0, 20, DEFAULTS.fill) / 20,
        // Stroke weight in pixels, held above one so a thin outline does not
        // dash itself apart against the pixel grid.
        stroke: Math.max(1.2, cell * 0.05),
        // Turns per second, before each tile's own seeded direction.
        spin: clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.05,
        // Extra turns under the cursor. Roughly one full turn at the top.
        turn: clamp(cfg.turn, 0, 20, DEFAULTS.turn) * 0.05,
        // Squared, because the useful settings are the tight ones.
        reach: 60 + Math.pow(clamp(cfg.reach, 1, 20, DEFAULTS.reach), 2) * 2.2,
    }
}

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        // Already in clip space; no camera object is involved.
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const MOSAIC_FRAGMENT = /* glsl */ `
    precision highp float;

    #define TAU 6.28318530718

    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uHold;
    uniform float uTime;
    uniform vec3 uInk;
    uniform vec3 uLit;
    uniform float uCell;
    uniform float uRadius;
    uniform float uKinds;
    uniform float uFill;
    uniform float uStroke;
    uniform float uTurn;
    uniform float uReach;

    varying vec2 vUv;

    float hash2(vec2 v) {
        return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453123);
    }

    /*
     * Signed distance to each shape, all measured from the same centre and all
     * sized by the same radius, so swapping one for another never shifts the
     * tile or changes how heavy it looks.
     */
    float shapeDist(int kind, vec2 v, float r) {
        if (kind == 0) return length(v) - r;
        if (kind == 1) return max(abs(v.x), abs(v.y)) - r * 0.86;
        // The equilateral triangle, sitting on its own centroid.
        if (kind == 2) return max(abs(v.x) * 0.866 + v.y * 0.5, -v.y) - r * 0.55;
        if (kind == 3) return abs(v.x) + abs(v.y) - r * 1.16;
        if (kind == 4) {
            float arm = r * 0.3;
            return min(max(abs(v.x) - r, abs(v.y) - arm),
                       max(abs(v.x) - arm, abs(v.y) - r));
        }
        // A ring is the circle's own edge, thickened.
        return abs(length(v) - r * 0.72) - r * 0.22;
    }

    void main() {
        vec2 p = vUv * uResolution;
        vec2 cell = floor(p / uCell);
        vec2 mid = (cell + 0.5) * uCell;

        float seed = hash2(cell);
        // Fixed per cell, so the mosaic holds still instead of crawling.
        int kind = int(min(floor(hash2(cell + 7.3) * uKinds), uKinds - 1.0));

        float near = 1.0 - smoothstep(0.0, uReach, length(mid - uPointer));
        near = near * near * uHold;

        // Half the tiles turn the other way; all turning together, the mosaic
        // reads as one plate rather than as separate tiles.
        float heading = seed < 0.5 ? 1.0 : -1.0;
        float ang = (uTime * (0.6 + seed) * heading + seed * TAU) + near * uTurn * TAU;
        float ca = cos(ang);
        float sa = sin(ang);
        vec2 v = mat2(ca, sa, -sa, ca) * (p - mid);

        float r = uRadius * (1.0 + near * 0.45);
        float d = shapeDist(kind, v, r);

        // Antialias against the shape's own gradient. A fixed pixel count
        // leaves the thin arms of a cross furry and the circles jagged.
        float aa = max(fwidth(d), 0.0001);
        float solid = 1.0 - smoothstep(-aa, aa, d);
        float outline = 1.0 - smoothstep(uStroke - aa, uStroke + aa, abs(d));
        float mask = mix(outline, solid, uFill);
        if (mask < 0.004) discard;

        vec3 col = mix(uInk, uLit, near);
        float a = mask * (0.65 + 0.35 * near);

        // Premultiplied, so the frame shows between the tiles.
        gl_FragColor = vec4(col * a, a);
    }
`

class MosaicScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private target = new THREE.Vector2(-1e4, -1e4)
    private eased = new THREE.Vector2(-1e4, -1e4)
    private hold = 0
    private wantHold = 0
    private time = 0

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setClearColor(0x000000, 0)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.touchAction = "none"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: MOSAIC_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uPointer: { value: new THREE.Vector2(-1e4, -1e4) },
                uHold: { value: 0 },
                uTime: { value: 0 },
                uInk: { value: new THREE.Color(cfg.ink) },
                uLit: { value: new THREE.Color(cfg.lit) },
                uCell: { value: S.cell },
                uRadius: { value: S.radius },
                uKinds: { value: S.kinds },
                uFill: { value: S.fill },
                uStroke: { value: S.stroke },
                uTurn: { value: S.turn },
                uReach: { value: S.reach },
            },
            transparent: true,
            depthTest: false,
            depthWrite: false,
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        el.addEventListener("pointermove", this.onPointerMove)
        el.addEventListener("pointerdown", this.onPointerMove)
        el.addEventListener("pointerleave", this.onPointerLeave)
        el.addEventListener("pointercancel", this.onPointerLeave)
    }

    private onPointerMove = (e: PointerEvent) => {
        const rect = this.renderer.domElement.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return
        // The shader works in device pixels, so the pointer arrives in them too.
        const x = ((e.clientX - rect.left) / rect.width) * this.width
        const y = (1 - (e.clientY - rect.top) / rect.height) * this.height
        this.target.set(x, y)
        if (this.wantHold === 0) this.eased.copy(this.target)
        this.wantHold = 1
    }

    private onPointerLeave = () => {
        this.wantHold = 0
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
        const dpr = this.renderer.getPixelRatio()
        this.width = width * dpr
        this.height = height * dpr
        this.material.uniforms.uResolution.value.set(this.width, this.height)
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const u = this.material.uniforms
        u.uInk.value.set(cfg.ink || DEFAULTS.ink)
        u.uLit.value.set(cfg.lit || DEFAULTS.lit)
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A returning tab must not spin every tile through a dozen turns.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.spin * Math.PI * 2
        this.eased.lerp(this.target, 1 - Math.exp(-dt * CURSOR_FOLLOW))
        this.hold += (this.wantHold - this.hold) * (1 - Math.exp(-dt * 5))

        const dpr = this.renderer.getPixelRatio()
        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uPointer.value.copy(this.eased)
        u.uHold.value = this.hold
        u.uCell.value = S.cell * dpr
        u.uRadius.value = S.radius * dpr
        u.uKinds.value = S.kinds
        u.uFill.value = S.fill
        u.uStroke.value = S.stroke * dpr
        u.uTurn.value = S.turn
        u.uReach.value = S.reach * dpr

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        const el = this.renderer.domElement
        el.removeEventListener("pointermove", this.onPointerMove)
        el.removeEventListener("pointerdown", this.onPointerMove)
        el.removeEventListener("pointerleave", this.onPointerLeave)
        el.removeEventListener("pointercancel", this.onPointerLeave)
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

interface ShapeMosaicProps {
    ink?: string
    lit?: string
    cell?: number
    size?: number
    kinds?: number
    fill?: number
    spin?: number
    turn?: number
    reach?: number
    style?: React.CSSProperties
}

export default function ShapeMosaic(props: ShapeMosaicProps) {
    const {
        ink = DEFAULTS.ink,
        lit = DEFAULTS.lit,
        cell = DEFAULTS.cell,
        size = DEFAULTS.size,
        kinds = DEFAULTS.kinds,
        fill = DEFAULTS.fill,
        spin = DEFAULTS.spin,
        turn = DEFAULTS.turn,
        reach = DEFAULTS.reach,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<MosaicScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        ink,
        lit,
        cell,
        size,
        kinds,
        fill,
        spin,
        turn,
        reach,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: MosaicScene
        try {
            scene = new MosaicScene(container, cfgRef.current)
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
    }, [ink, lit, cell, size, kinds, fill, spin, turn, reach])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A mosaic of small shapes that turn and grow toward the pointer"
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

ShapeMosaic.displayName = "Shape Mosaic"
