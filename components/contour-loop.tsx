"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Contour Loop — a lobed field of contours running endlessly inward.
 *
 * The figure is a radius pushed out and pulled in around the turn, and every
 * contour is that same curve scaled about the middle — so the outermost line is
 * the shape of the innermost, whatever the shape happens to be. Slicing the
 * field at regular intervals draws the whole nesting at once: no loop, no
 * vertices, nothing to walk.
 *
 * The lobes are three harmonics of direction, and they are built by the angle
 * addition identities straight from the direction vector rather than from its
 * angle. An angle has a branch cut where it rolls from one turn to the next, and
 * any term that is not a whole number of turns tears along it — a dotted line of
 * ruined pixels straight across the frame. Polynomials of the direction have no
 * branch cut to tear at.
 *
 * The harmonics are pinned at fixed offsets from each other. Left aligned,
 * every lobe peaks in the same place and a blend of two of them comes out
 * looking like a symmetrical flower rather than like something found.
 *
 * Running the clock through the slice index sends the whole nesting inward or
 * outward while the figure itself stays exactly where it is: the shape stands
 * still and the lines travel through it. A line leaves at the rim as another is
 * born in the middle, on the same frame, for ever.
 */

/*
 * How fast the highlight chases the cursor, per second. A little lag keeps it
 * trailing the pointer rather than welded to it.
 */
const CURSOR_FOLLOW = 9.0

const DEFAULTS = {
    ink: "#00FFD7",
    lit: "#FFFFFF",
    spacing: 49,
    form: 10,
    warp: 13,
    spin: 5,
    weight: 1,
    speed: 9,
    direction: "out",
    reach: 12,
}

type Config = {
    ink: string
    lit: string
    spacing: number
    form: number
    warp: number
    spin: number
    weight: number
    speed: number
    direction: "in" | "out"
    reach: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    /*
     * Where the figure sits along the three harmonics: nought is the first, one
     * the second, two the third, and the weights are the overlap at each stop.
     * They always sum to one, and that is what bounds the pull by Warp alone —
     * so a lobe can never drag the radius through zero and turn the contours
     * inside out, with nothing left to clamp in the shader.
     */
    const x = ((clamp(cfg.form, 1, 20, DEFAULTS.form) - 1) / 19) * 2
    const weights = [
        Math.max(0, 1 - Math.abs(x)),
        Math.max(0, 1 - Math.abs(x - 1)),
        Math.max(0, 1 - Math.abs(x - 2)),
    ] as const

    return {
        spacing: clamp(cfg.spacing, 10, 200, DEFAULTS.spacing),
        weights,
        // Stopped short of one, for the same reason.
        warp: clamp(cfg.warp, 0, 20, DEFAULTS.warp) * 0.0375,
        // Turns per second of the whole figure.
        spin: clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.012,
        // Half the line width in pixels, held above one so a hairline does not
        // dash itself apart against the pixel grid.
        weight: Math.max(1.2, 0.6 + clamp(cfg.weight, 1, 20, DEFAULTS.weight) * 0.3),
        // Contours per second.
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.12,
        heading: cfg.direction === "out" ? -1 : 1,
        // Squared, because the useful settings are the tight ones.
        reach: 60 + Math.pow(clamp(cfg.reach, 1, 20, DEFAULTS.reach), 2) * 2.6,
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

const LOOP_FRAGMENT = /* glsl */ `
    precision highp float;

    /*
     * Fixed offsets between the harmonics, written out rather than computed.
     * Aligned, every lobe peaks in the same place and a blend of two of them
     * comes out a symmetrical flower rather than something found.
     */
    #define OFF2 vec2(1.0, 0.0)
    #define OFF3 vec2(0.62161, 0.78333)
    #define OFF5 vec2(-0.50485, 0.86321)

    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uHold;
    uniform float uTime;
    uniform float uSpin;
    uniform vec3 uInk;
    uniform vec3 uLit;
    uniform float uSpacing;
    uniform vec3 uWeights;
    uniform float uWarp;
    uniform float uWeight;
    uniform float uReach;

    varying vec2 vUv;

    void main() {
        vec2 centre = uResolution * 0.5;
        vec2 p = vUv * uResolution - centre;

        float near = 1.0 - smoothstep(0.0, uReach, length(p + centre - uPointer));
        near = near * near * uHold;

        float cs = cos(uSpin);
        float sn = sin(uSpin);
        p = mat2(cs, sn, -sn, cs) * p;

        float r = length(p);
        vec2 dir = p / max(r, 0.00001);

        /*
         * Two, three and five turns of the direction, built by the angle
         * addition identities from the direction itself. Taken from its angle
         * instead, every one of them tears along the branch cut where the angle
         * rolls over — a dotted line of ruined pixels across the frame.
         */
        float c = dir.x;
        float s = dir.y;
        vec2 h2 = vec2(c * c - s * s, 2.0 * c * s);
        vec2 h3 = vec2(c * h2.x - s * h2.y, s * h2.x + c * h2.y);
        vec2 h5 = vec2(h2.x * h3.x - h2.y * h3.y, h2.y * h3.x + h2.x * h3.y);

        float lobes = uWeights.x * dot(h2, OFF2)
                    + uWeights.y * dot(h3, OFF3)
                    + uWeights.z * dot(h5, OFF5);

        // The radius, pushed out and pulled in around the turn. Every contour
        // is this same curve scaled, so the outermost is the shape of the
        // innermost.
        float k = r * (1.0 + uWarp * lobes) / uSpacing - uTime;

        // How fast the slices stack up here, which is what turns a distance
        // measured in contours into one measured in pixels.
        float rate = max(fwidth(k), 0.0001);
        /*
         * The lobes depend on direction alone, so what they add to that rate
         * goes as one over the radius: near the middle the contours crowd past
         * anything a pixel can hold, and drawing them anyway is a boiling mess.
         * The rate is therefore what opens the hole, and it opens exactly as far
         * as it has to and no further.
         */
        if (rate > 0.9) discard;
        float fade = 1.0 - smoothstep(0.45, 0.9, rate);

        float f = fract(k);
        float line = min(f, 1.0 - f) / rate;

        // A crisp edge either side of the line's own half width, rather than a
        // fade across the whole of it.
        float mask = (1.0 - smoothstep(uWeight - 1.0, uWeight + 1.0, line)) * fade;
        if (mask < 0.004) discard;

        vec3 col = mix(uInk, uLit, near);
        float a = mask * (0.75 + 0.25 * near);

        // Premultiplied, so the frame shows between the lines.
        gl_FragColor = vec4(col * a, a);
    }
`

class LoopScene {
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
    private spin = 0

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
            fragmentShader: LOOP_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uPointer: { value: new THREE.Vector2(-1e4, -1e4) },
                uHold: { value: 0 },
                uTime: { value: 0 },
                uSpin: { value: 0 },
                uInk: { value: new THREE.Color(cfg.ink) },
                uLit: { value: new THREE.Color(cfg.lit) },
                uSpacing: { value: S.spacing },
                uWeights: { value: new THREE.Vector3(...S.weights) },
                uWarp: { value: S.warp },
                uWeight: { value: S.weight },
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
        // A returning tab must not run the nesting through a dozen contours.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        /*
         * Both folded. One contour and one turn each leave the figure exactly
         * where it was, so neither fold shows — and neither number ever grows
         * large enough to lose the precision the slicing needs.
         */
        this.time = (this.time + dt * S.speed * S.heading) % 1
        this.spin = (this.spin + dt * S.spin) % 1

        this.eased.lerp(this.target, 1 - Math.exp(-dt * CURSOR_FOLLOW))
        this.hold += (this.wantHold - this.hold) * (1 - Math.exp(-dt * 5))

        const dpr = this.renderer.getPixelRatio()
        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uSpin.value = this.spin * Math.PI * 2
        u.uPointer.value.copy(this.eased)
        u.uHold.value = this.hold
        u.uSpacing.value = S.spacing * dpr
        u.uWeights.value.set(S.weights[0], S.weights[1], S.weights[2])
        u.uWarp.value = S.warp
        u.uWeight.value = S.weight * dpr
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

export interface ContourLoopProps {
    /** The nesting at rest. */
    ink?: string
    /** What the lines turn where the pointer passes. */
    lit?: string
    /** Distance from one contour out to the next. */
    spacing?: number
    /** 1 leans on two lobes, 10 on three, 20 on five — and every setting between is a blend of them. */
    form?: number
    /** 0 leaves plain rings; 20 pulls them into a deeply lobed knot. */
    warp?: number
    /** 0 holds the figure square to the frame; higher turns the whole thing. */
    spin?: number
    /** 1 is a hairline; 20 nearly closes the gap between contours. */
    weight?: number
    /** 0 stops the travel. The figure itself never moves either way. */
    speed?: number
    /** In/out travel direction. */
    direction?: "in" | "out"
    /** How wide a stretch of the lines the cursor lights up. */
    reach?: number
    style?: React.CSSProperties
}

export default function ContourLoop(props: ContourLoopProps) {
    const {
        ink = DEFAULTS.ink,
        lit = DEFAULTS.lit,
        spacing = DEFAULTS.spacing,
        form = DEFAULTS.form,
        warp = DEFAULTS.warp,
        spin = DEFAULTS.spin,
        weight = DEFAULTS.weight,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction as "in" | "out",
        reach = DEFAULTS.reach,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<LoopScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        ink,
        lit,
        spacing,
        form,
        warp,
        spin,
        weight,
        speed,
        direction,
        reach,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: LoopScene
        try {
            scene = new LoopScene(container, cfgRef.current)
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
    }, [ink, lit, spacing, form, warp, spin, weight, speed, direction, reach])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A lobed field of contours running endlessly inward"
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

ContourLoop.displayName = "Contour Loop"
