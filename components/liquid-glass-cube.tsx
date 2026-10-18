"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Liquid Glass Cube — a block of glass that has not quite set, turning on its
 * own and draggable.
 *
 * The body is a superellipsoid rather than a box: every vertex of a sphere is
 * pushed out to |x|ⁿ + |y|ⁿ + |z|ⁿ = 1, which at a high n is a cube with a hair
 * of radius on its edges and at n = 2 a ball. One exponent covers the whole
 * range, and because the surface stays smooth there are no hard seams for the
 * refraction to break across — a real BoxGeometry has three vertices stacked at
 * every corner and glass shaded across those reads as folded paper.
 *
 * There is nothing behind the cube to refract, so the room is procedural: a
 * gradient with a couple of lights in it, sampled once along the reflected ray
 * and three times along the refracted one at slightly different indices, which
 * is where the colour fringing at the edges comes from. Both walls of the block
 * are drawn and the alpha is carried by the fresnel and the highlights, so a
 * face turned flat toward the viewer is nearly clear and the frame behind reads
 * straight through it: the block is described by its edges and its glints
 * rather than by a wash of colour over the whole silhouette.
 */

const PERSPECTIVE = 0.15

const DEFAULTS = {
    glass: "#FFFFFF",
    roomTop: "#FFFFFF",
    roomBottom: "#FFFFFF",
    highlight: "#FFC500",
    rounding: 15,
    refraction: 20,
    dispersion: 20,
    clarity: 20,
    edge: 20,
    gloss: 20,
    speed: 5,
    direction: "right",
    dragSensitivity: 3,
    sizePercent: 100,
}

type Config = {
    glass: string
    roomTop: string
    roomBottom: string
    highlight: string
    rounding: number
    refraction: number
    dispersion: number
    clarity: number
    edge: number
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
    return {
        /*
         * Rounding counts UP to rounder: 0 is a hard cube and 20 a ball.
         *
         * The exponent runs the other way — a big exponent is a sharp box and 2
         * is a sphere — so the slider is inverted here, and curved: the visible
         * radius changes fastest at the sharp end, so a linear exponent would
         * spend most of its travel looking identical.
         */
        exponent:
            2 +
            Math.pow(
                1 - clamp(cfg.rounding, 0, 20, DEFAULTS.rounding) / 20,
                1.6
            ) *
                48,
        // Air is 1. Water sits near 1.33, optical glass near 1.5.
        ior: 1.05 + clamp(cfg.refraction, 1, 20, DEFAULTS.refraction) * 0.042,
        dispersion: clamp(cfg.dispersion, 0, 20, DEFAULTS.dispersion) * 0.004,
        // Clear glass keeps very little of its own colour.
        clarity: clamp(cfg.clarity, 1, 20, DEFAULTS.clarity) / 20,
        edge: clamp(cfg.edge, 1, 20, DEFAULTS.edge) * 0.09,
        // Tightness of the specular lobe: a low gloss is a wet-looking sheen, a
        // high one a hard pinpoint.
        gloss: 20 + clamp(cfg.gloss, 1, 20, DEFAULTS.gloss) * 34,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.09,
        heading: cfg.direction === "left" ? -1 : 1,
    }
}

/**
 * A sphere pushed out onto the superellipsoid |x|ⁿ + |y|ⁿ + |z|ⁿ = 1.
 *
 * SphereGeometry is indexed, so its vertices are shared and
 * computeVertexNormals averages across them — that is what keeps the rounded
 * edges smooth. Rebuilt only when the rounding changes.
 */
function buildBody(exponent: number): THREE.BufferGeometry {
    // Dense, because at the sharp end of the slider the whole turn from one
    // face to the next happens across a couple of degrees — too few segments
    // there and the edge of the cube comes out visibly stepped.
    const geometry = new THREE.SphereGeometry(1, 192, 144)
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute
    const v = new THREE.Vector3()
    const n = Math.max(2, exponent)

    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).normalize()
        const denom =
            Math.pow(Math.abs(v.x), n) +
            Math.pow(Math.abs(v.y), n) +
            Math.pow(Math.abs(v.z), n)
        // Face centres land at 1 and corners a little beyond, which is exactly
        // what a rounded cube does.
        const r = Math.pow(denom, -1 / n)
        pos.setXYZ(i, v.x * r, v.y * r, v.z * r)
    }
    pos.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
}

const GLASS_VERTEX = /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vView;

    void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
    }
`

const GLASS_FRAGMENT = /* glsl */ `
    uniform vec3 uGlass;
    uniform vec3 uRoomTop;
    uniform vec3 uRoomBottom;
    uniform vec3 uHighlight;
    uniform float uIor;
    uniform float uDispersion;
    uniform float uClarity;
    uniform float uEdge;
    uniform float uGloss;

    varying vec3 vNormal;
    varying vec3 vView;

    // Two lamps in view space, so the glints stay put while the cube turns
    // under them — a light fixed to the model would turn with it and the
    // surface would read as painted.
    const vec3 KEY = vec3(0.55, 0.72, 0.42);
    const vec3 FILL = vec3(-0.62, -0.28, 0.73);

    /** The room the glass is standing in: a gradient with two lights in it. */
    vec3 room(vec3 dir) {
        vec3 base = mix(uRoomBottom, uRoomTop, clamp(dir.y * 0.5 + 0.5, 0.0, 1.0));
        float key = pow(max(dot(dir, normalize(KEY)), 0.0), 28.0);
        float fill = pow(max(dot(dir, normalize(FILL)), 0.0), 12.0);
        return base + uHighlight * (key * 1.6 + fill * 0.35);
    }

    void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(vView);
        /*
         * Both walls of the block are drawn, and the far one arrives with its
         * normal pointing away from the camera. Flipping it back is what lets
         * the inside of the glass be shaded as a surface — without it the far
         * wall takes the fresnel of a face turned away from the viewer and
         * comes out as a flat silhouette, which is most of why the cube read as
         * a solid lump rather than something with an inside.
         */
        if (!gl_FrontFacing) n = -n;
        float facing = gl_FrontFacing ? 1.0 : 0.45;

        // Schlick, with the exponent left at 5 and the panel scaling the term
        // rather than the power — a fresnel with an adjustable exponent goes
        // from "no edge" to "only edge" over about two slider steps.
        float f = clamp(pow(1.0 - max(dot(n, v), 0.0), 5.0), 0.0, 1.0);
        float rim = clamp(f * uEdge, 0.0, 1.0);

        vec3 reflected = room(reflect(-v, n));

        /*
         * Refraction is sampled three times at slightly different indices and
         * recombined per channel. One sample would be colourless; the spread is
         * what puts the fringe of colour around the edges, where the ray bends
         * hardest and the three paths diverge most.
         */
        float eta = 1.0 / max(1.001, uIor);
        vec3 rRay = refract(-v, n, eta * (1.0 + uDispersion));
        vec3 gRay = refract(-v, n, eta);
        vec3 bRay = refract(-v, n, eta * (1.0 - uDispersion));
        vec3 refracted = vec3(room(rRay).r, room(gRay).g, room(bRay).b);

        // Beer-Lambert in spirit: the glass keeps its own colour in proportion
        // to how little of it you are looking through.
        vec3 tinted = mix(refracted, refracted * uGlass, 1.0 - uClarity);

        vec3 col = mix(tinted, reflected, rim);

        /*
         * Each face is pushed apart in brightness by how squarely it faces the
         * key light.
         *
         * Six flat faces all bending the room by nearly the same amount come
         * out at nearly the same value, and the block reads as one silhouette
         * with no faces in it. This is what separates them — the term is stepped
         * rather than smooth, so a face holds one value across its whole width
         * and changes at the edge, which is what makes an edge an edge.
         */
        float face = smoothstep(-0.35, 0.9, dot(n, normalize(KEY)));
        col *= 0.72 + face * 0.55;

        /*
         * Gloss: a tight lobe off each lamp, plus a broad sheen underneath.
         *
         * Taken off the half vector rather than the normal alone, so a highlight
         * slides across the surface as the block turns instead of sitting in one
         * spot and reading as painted on.
         */
        vec3 hKey = normalize(normalize(KEY) + v);
        vec3 hFill = normalize(normalize(FILL) + v);
        float spec =
            pow(max(dot(n, hKey), 0.0), uGloss) * 1.35 +
            pow(max(dot(n, hFill), 0.0), uGloss * 0.35) * 0.5 +
            pow(max(dot(n, hKey), 0.0), 6.0) * 0.12;
        col += uHighlight * spec * facing;

        /*
         * Alpha is carried almost entirely by the rim and the highlights.
         *
         * A flat-on face is nearly clear, which is what makes it glass you can
         * see through: the frame behind reads straight through the middle, and
         * the block is drawn by its edges and its glints. A high floor here is
         * what made it look like a solid brick before — every face was painted
         * at the same weight whichever way it was turned.
         */
        float alpha = 0.05 + rim * 0.85 + clamp(spec, 0.0, 1.0) * 0.75;
        alpha += (1.0 - uClarity) * 0.16;
        // A little more weight on the faces turned toward the light, so a lit
        // face and a shaded one are told apart by more than colour alone.
        alpha += face * 0.1;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0) * facing);
    }
`

class GlassScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)
    private group = new THREE.Group()

    private geometry: THREE.BufferGeometry
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

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

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        })
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

        this.material = new THREE.ShaderMaterial({
            vertexShader: GLASS_VERTEX,
            fragmentShader: GLASS_FRAGMENT,
            uniforms: {
                uGlass: { value: new THREE.Color(cfg.glass) },
                uRoomTop: { value: new THREE.Color(cfg.roomTop) },
                uRoomBottom: { value: new THREE.Color(cfg.roomBottom) },
                uHighlight: { value: new THREE.Color(cfg.highlight) },
                uIor: { value: S.ior },
                uDispersion: { value: S.dispersion },
                uClarity: { value: S.clarity },
                uEdge: { value: S.edge },
                uGloss: { value: S.gloss },
            },
            transparent: true,
            // Both walls are drawn: seeing the far side of the block through
            // the near one is the whole of what makes it read as glass rather
            // than as a painted shape.
            side: THREE.DoubleSide,
            depthWrite: false,
        })

        this.geometry = buildBody(S.exponent)
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.group.add(this.mesh)
        this.scene.add(this.group)

        this.bindEvents()
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
            // Kept so the block carries on turning after the pointer lets go.
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

        u.uGlass.value.set(cfg.glass || "#ffffff")
        u.uRoomTop.value.set(cfg.roomTop || "#ffffff")
        u.uRoomBottom.value.set(cfg.roomBottom || "#000000")
        u.uHighlight.value.set(cfg.highlight || "#ffffff")
        u.uIor.value = S.ior
        u.uDispersion.value = S.dispersion
        u.uClarity.value = S.clarity
        u.uEdge.value = S.edge
        u.uGloss.value = S.gloss

        // Only the rounding owns the geometry; everything else is a uniform.
        if (cfg.rounding !== prev.rounding) {
            const next = buildBody(S.exponent)
            this.geometry.dispose()
            this.geometry = next
            this.mesh.geometry = next
        }
        this.updateCamera()
    }

    private updateCamera() {
        const w = Math.max(1, this.width)
        const h = Math.max(1, this.height)
        const aspect = w / h
        const distance = 1 / PERSPECTIVE
        const sizePct = clamp(this.cfg.sizePercent, 20, 200, 85)
        // A corner of the cube reaches further out than a face does, so the
        // frame allows for the corner and nothing clips as it turns.
        const span = 3.1 * (100 / sizePct)
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

        if (!this.isDragging) {
            // A fling decays over about a second, then the idle spin takes back
            // over — so a throw reads as momentum, not as a speed change.
            const decay = Math.exp(-dt * 3)
            this.dragY += this.velY
            this.dragX += this.velX
            this.velX *= decay
            this.velY *= decay
            this.spinAngle += S.speed * S.heading * dt
        }

        this.group.rotation.y = this.spinAngle + this.dragY
        // Vertical drag is damped and held short of the poles: tipped fully
        // over, a cube stops reading as a cube.
        this.group.rotation.x = clamp(this.dragX * 0.5, -0.9, 0.9, 0)

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

export interface LiquidGlassCubeProps {
    /** The colour it takes on, strongest through the thick. */
    glass?: string
    /** What the glass has to reflect and bend. */
    roomTop?: string
    roomBottom?: string
    highlight?: string
    /** 0 is a hard cube; 20 rounds it all the way to a ball. */
    rounding?: number
    /** How hard the light bends on its way through. */
    refraction?: number
    /** Splits the bend per colour, for a fringe at the edges. */
    dispersion?: number
    /** 20 is clear glass; lower is thicker and more coloured. */
    clarity?: number
    /** How bright the rim goes where the surface turns away. */
    edge?: number
    /** Low is a wet sheen across the surface; high is a pinpoint. */
    gloss?: number
    speed?: number
    direction?: "right" | "left"
    dragSensitivity?: number
    sizePercent?: number
    style?: React.CSSProperties
}

export default function LiquidGlassCube(props: LiquidGlassCubeProps) {
    const {
        glass = DEFAULTS.glass,
        roomTop = DEFAULTS.roomTop,
        roomBottom = DEFAULTS.roomBottom,
        highlight = DEFAULTS.highlight,
        rounding = DEFAULTS.rounding,
        refraction = DEFAULTS.refraction,
        dispersion = DEFAULTS.dispersion,
        clarity = DEFAULTS.clarity,
        edge = DEFAULTS.edge,
        gloss = DEFAULTS.gloss,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction,
        dragSensitivity = DEFAULTS.dragSensitivity,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<GlassScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        glass,
        roomTop,
        roomBottom,
        highlight,
        rounding,
        refraction,
        dispersion,
        clarity,
        edge,
        gloss,
        speed,
        direction,
        dragSensitivity,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: GlassScene
        try {
            scene = new GlassScene(container, cfgRef.current)
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
        glass,
        roomTop,
        roomBottom,
        highlight,
        rounding,
        refraction,
        dispersion,
        clarity,
        edge,
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
            aria-label="Liquid glass cube"
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

LiquidGlassCube.displayName = "Liquid Glass Cube"
LiquidGlassCube.defaultProps = { ...DEFAULTS }
