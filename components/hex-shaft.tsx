"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Hex Shaft — the inside of a honeycombed duct, seen from the middle of it.
 *
 * Every tile is one instance of a six-sided prism whose axis points at the
 * shaft's centre line. The instance matrix only ever holds the tile's angle
 * around the wall; the scroll down the shaft is added in the vertex shader
 * afterwards, because a translation along z survives the rotation untouched
 * and rewriting two thousand matrices a frame to move them all the same
 * distance is work nobody needs to do.
 *
 * The tiles ride in and out along their own radius on a wave rolling down the
 * duct. An earlier version brightened them in place instead, which read as a
 * pattern printed on a smooth pipe rather than as a surface with relief.
 */

// Length of the duct in world units, with the shaft radius fixed at 1.
const SHAFT_SPAN = 20

const DEFAULTS = {
    plate: "#3400FF",
    seam: "#00DCFF",
    columns: 24,
    relief: 20,
    shine: 20,
    glow: 20,
    speed: 5,
    direction: "reverse",
    sizePercent: 100,
}

type Config = {
    plate: string
    seam: string
    columns: number
    relief: number
    shine: number
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
    const columns = Math.round(clamp(cfg.columns, 6, 24, DEFAULTS.columns))
    // A pointy-top hexagon of circumradius r is r*sqrt(3) across the flats and
    // stacks at 1.5*r between rows. Solving from the arc length keeps the tiles
    // square-on to the wall at every column count.
    const arc = (Math.PI * 2) / columns
    const tileR = arc / Math.sqrt(3)
    const rowDz = tileR * 1.5
    const rows = Math.max(4, Math.ceil(SHAFT_SPAN / rowDz))
    return {
        columns,
        rows,
        tileR,
        rowDz,
        // A little under the true circumradius, so a dark seam stays between
        // neighbours instead of the wall closing into one solid tube.
        plateR: tileR * 0.9,
        plateDepth: tileR * 0.55,
        span: rows * rowDz,
        relief: clamp(cfg.relief, 0, 20, DEFAULTS.relief) * tileR * 0.09,
        // Specular exponent: small is a wide wash, large is a tight glint.
        shine: 4 + clamp(cfg.shine, 1, 20, DEFAULTS.shine) * 6,
        glow: clamp(cfg.glow, 0, 20, DEFAULTS.glow) * 0.09,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.35,
        heading: cfg.direction === "reverse" ? -1 : 1,
        zoom: 100 / clamp(cfg.sizePercent, 40, 200, DEFAULTS.sizePercent),
    }
}

const HEX_VERTEX = /* glsl */ `
attribute float aRow;
attribute float aCol;

uniform float uTime;
uniform float uDz;
uniform float uSpan;
uniform float uRelief;

varying vec3 vNormal;
varying vec3 vPos;
varying float vDepth;
varying float vPop;

void main() {
    // The tile's own centre gives its outward direction; relief has to travel
    // along that, not along a shared axis, or one side of the duct swells while
    // the opposite side caves in.
    vec3 c = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec2 radial = normalize(c.xy);

    float wave = sin(aRow * 0.55 + aCol * 0.8 - uTime * 1.6) * 0.5 + 0.5;
    vPop = wave;

    vec3 p = (instanceMatrix * vec4(position, 1.0)).xyz;
    p.xy += radial * (wave - 0.5) * uRelief;

    // Depth wrapped by the length of the duct: the first rank reappears at the
    // back on the same frame and nothing drifts over a long session.
    float z = mod(aRow * uDz + uTime, uSpan);
    p.z -= z;

    vDepth = z / uSpan;
    // The instance matrix carries rotation and translation only, so its upper
    // 3x3 is orthonormal and safe to use on a normal directly.
    vNormal = normalize(mat3(instanceMatrix) * normal);
    vPos = p;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const HEX_FRAGMENT = /* glsl */ `
precision highp float;

uniform vec3 uPlate;
uniform vec3 uSeam;
uniform float uShine;
uniform float uGlow;

varying vec3 vNormal;
varying vec3 vPos;
varying float vDepth;
varying float vPop;

// The camera sits at the origin looking down -z and never turns, so world and
// view space coincide and this key stays put while the duct rushes past.
const vec3 KEY = vec3(0.40, 0.66, 0.64);

void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(-vPos);
    float lam = max(dot(n, KEY), 0.0);
    float spec = pow(max(dot(reflect(-KEY, n), v), 0.0), uShine);
    // Fixed exponent: an adjustable one goes from no edge at all to nothing but
    // edge inside two slider steps.
    float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);

    // Squared, so only the tiles near the crest of the wave light up and the
    // wave reads as a moving band rather than a general brightening.
    float crest = vPop * vPop;

    vec3 col = uPlate * (0.10 + lam * 0.95)
        + vec3(spec) * 0.55
        + uSeam * (fres * 0.45 + crest * uGlow);

    // Cut the tiles that would otherwise pass through the lens, and let the far
    // end sink into the dark rather than ending on a hard wall.
    float fog = 1.0 - smoothstep(0.30, 0.95, vDepth);
    float mouth = smoothstep(0.0, 0.07, vDepth);
    float a = fog * mouth;

    gl_FragColor = vec4(col * a, a);
}
`

class HexShaftScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(70, 1, 0.05, SHAFT_SPAN + 6)
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
            uDz: { value: S.rowDz },
            uSpan: { value: S.span },
            uRelief: { value: S.relief },
            uPlate: { value: new THREE.Color(cfg.plate) },
            uSeam: { value: new THREE.Color(cfg.seam) },
            uShine: { value: S.shine },
            uGlow: { value: S.glow },
        }
        this.material = new THREE.ShaderMaterial({
            vertexShader: HEX_VERTEX,
            fragmentShader: HEX_FRAGMENT,
            uniforms: this.uniforms,
            transparent: true,
            premultipliedAlpha: true,
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

        // Built about the Y axis, then laid over so it extends along X: after
        // the per-tile spin about Z, X is the outward radius of the shaft.
        const geo = new THREE.CylinderGeometry(
            S.plateR,
            S.plateR,
            S.plateDepth,
            6
        )
        geo.rotateZ(-Math.PI / 2)
        this.geometry = geo

        const count = S.columns * S.rows
        const mesh = new THREE.InstancedMesh(geo, this.material, count)
        const rowAttr = new Float32Array(count)
        const colAttr = new Float32Array(count)
        const m = new THREE.Matrix4()
        let i = 0
        for (let r = 0; r < S.rows; r++) {
            // Alternate rows shifted half a column: without the offset the tiles
            // stack in straight lines and the wall reads as a grid of dots.
            const stagger = (r % 2) * 0.5
            for (let c = 0; c < S.columns; c++) {
                const theta = ((c + stagger) / S.columns) * Math.PI * 2
                m.makeRotationZ(theta)
                m.setPosition(Math.cos(theta), Math.sin(theta), 0)
                mesh.setMatrixAt(i, m)
                rowAttr[i] = r
                colAttr[i] = c
                i++
            }
        }
        mesh.instanceMatrix.needsUpdate = true
        geo.setAttribute("aRow", new THREE.InstancedBufferAttribute(rowAttr, 1))
        geo.setAttribute("aCol", new THREE.InstancedBufferAttribute(colAttr, 1))
        // The shader moves the tiles down the shaft; three cannot know where.
        mesh.frustumCulled = false
        this.scene.add(mesh)
        this.mesh = mesh

        this.uniforms.uDz.value = S.rowDz
        this.uniforms.uSpan.value = S.span
        this.uniforms.uRelief.value = S.relief
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
        // The camera is inside the duct, so it holds position and the field of
        // view does the framing: the wall has to reach the corners.
        const span = 2.0 * S.zoom
        const visibleHeight = aspect < 1 ? span / aspect : span
        this.camera.aspect = aspect
        this.camera.fov = 2 * Math.atan(visibleHeight / 2 / 0.9) * (180 / Math.PI)
        this.camera.updateProjectionMatrix()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        const S = settingsFor(cfg)
        this.uniforms.uRelief.value = S.relief
        this.uniforms.uShine.value = S.shine
        this.uniforms.uGlow.value = S.glow
        ;(this.uniforms.uPlate.value as THREE.Color).set(cfg.plate)
        ;(this.uniforms.uSeam.value as THREE.Color).set(cfg.seam)
        // Only the column count owns the tile geometry and the instance buffer.
        if (cfg.columns !== prev.columns) this.rebuild()
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

export interface HexShaftProps {
    plate?: string
    seam?: string
    columns?: number
    relief?: number
    shine?: number
    glow?: number
    speed?: number
    direction?: "forward" | "reverse"
    sizePercent?: number
    style?: React.CSSProperties
}

export default function HexShaft(props: HexShaftProps) {
    const {
        plate = DEFAULTS.plate,
        seam = DEFAULTS.seam,
        columns = DEFAULTS.columns,
        relief = DEFAULTS.relief,
        shine = DEFAULTS.shine,
        glow = DEFAULTS.glow,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction as "forward" | "reverse",
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<HexShaftScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        plate,
        seam,
        columns,
        relief,
        shine,
        glow,
        speed,
        direction,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: HexShaftScene
        try {
            scene = new HexShaftScene(container, cfgRef.current)
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
    }, [plate, seam, columns, relief, shine, glow, speed, direction, sizePercent])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="The inside of a honeycombed duct rushing past"
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

HexShaft.displayName = "Hex Shaft"
HexShaft.defaultProps = { ...DEFAULTS }
