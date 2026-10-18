"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Glass Prism — a solid bar of optical glass, turning, and draggable.
 *
 * The body is a cylinder with very few sides, which is what a prism is: three
 * gives the classic triangular bar, six a hexagonal rod, twelve something close
 * to a glass cylinder. The geometry is then de-indexed before its normals are
 * computed, so every triangle gets the normal of its own face rather than an
 * average of the faces meeting at each vertex. That single step is the whole
 * difference between a prism and a barrel — shared vertices give smooth shading,
 * and smooth shading over three sides reads as a lumpy tube, not as flats with
 * hard edges between them.
 *
 * There is nothing behind the prism to refract, so the room is procedural: a
 * gradient with two lamps in it, sampled once along the reflected ray and three
 * times along the refracted one at slightly different indices. Those three
 * samples are where the colour along the edges comes from, and they are the
 * reason a prism is worth drawing at all.
 *
 * Both walls of the bar are drawn and the alpha is carried by the fresnel and
 * the highlights, so a face turned flat toward the viewer is nearly clear and
 * whatever sits behind reads straight through it. The prism is described by its
 * edges and its glints rather than by a wash of colour over its silhouette.
 */

const PERSPECTIVE = 0.15

/*
 * Fixed glass properties. Each of these used to be a slider, and each is now
 * pinned at what was the top of its range — optical glass, fully dispersed,
 * fully clear, with a hard specular window.
 */
const GIRTH = 0.25 + 20 * 0.055
const IOR = 1.05 + 20 * 0.042
const DISPERSION = 20 * 0.005
const GLOSS = 20 + 13 * 34

/**
 * How much of its own colour the glass keeps.
 *
 * With clarity pinned at clear the old tint term fell to zero, which would have
 * left the Glass control doing nothing at all. A small fixed amount keeps the
 * bar answering to its colour while still reading as clear glass rather than as
 * a coloured rod.
 */
const TINT = 0.3

const DEFAULTS = {
    glass: "#FFFFFF",
    roomTop: "#FFFFFF",
    roomBottom: "#FFFFFF",
    highlight: "#FFFFFF",
    sides: 3,
    length: 20,
    twist: 3,
    edge: 20,
    tilt: 20,
    speed: 10,
    direction: "right" as const,
    dragSensitivity: 10,
    sizePercent: 100,
}

type Config = {
    glass: string
    roomTop: string
    roomBottom: string
    highlight: string
    sides: number
    length: number
    twist: number
    edge: number
    tilt: number
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
        sides: Math.round(clamp(cfg.sides, 3, 12, DEFAULTS.sides)),
        /*
         * Length starts at almost nothing.
         *
         * The old mapping had a floor of 0.5 before the slider was even read, so
         * 1 was still a substantial bar. Now 1 is a wafer barely thicker than
         * the caps and the range opens out from there.
         */
        length: 0.08 + (clamp(cfg.length, 1, 20, DEFAULTS.length) - 1) * 0.17,
        girth: GIRTH,
        // Radians of rotation from one end of the bar to the other.
        twist: clamp(cfg.twist, 0, 10, DEFAULTS.twist) * 0.16,
        ior: IOR,
        dispersion: DISPERSION,
        tint: TINT,
        edge: clamp(cfg.edge, 1, 20, DEFAULTS.edge) * 0.09,
        gloss: GLOSS,
        // How far the bar is laid over from standing upright.
        tilt: (clamp(cfg.tilt, 0, 20, DEFAULTS.tilt) / 20 - 0.5) * 2.4,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.09,
        heading: cfg.direction === "left" ? -1 : 1,
    }
}

/**
 * The bar.
 *
 * A cylinder with a handful of sides is already a prism; the work is in the
 * shading normals. De-indexing first means no vertex is shared between two
 * faces, so computeVertexNormals gives each triangle its own face normal and
 * the flats stay flat with hard edges between them. Left indexed, the normals
 * average across the corners and three sides shade as one soft tube.
 */
function buildPrism(
    sides: number,
    length: number,
    girth: number,
    twist: number
): THREE.BufferGeometry {
    // Height segments only matter when the bar is twisted; a straight prism is
    // described perfectly by one.
    const rings = twist > 0.001 ? 96 : 1
    const base = new THREE.CylinderGeometry(girth, girth, length, sides, rings)

    if (twist > 0.001) {
        const pos = base.getAttribute("position") as THREE.BufferAttribute
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i)
            const y = pos.getY(i)
            const z = pos.getZ(i)
            // Rotation proportional to height, so the twist accumulates evenly
            // down the bar rather than kinking at one end.
            const a = (y / length) * twist * 6.0
            const c = Math.cos(a)
            const s = Math.sin(a)
            pos.setXYZ(i, x * c - z * s, y, x * s + z * c)
        }
        pos.needsUpdate = true
    }

    // Standing on end is the least interesting view of a prism — laid over, the
    // caps and two of the flats are visible at once.
    base.rotateZ(Math.PI * 0.5)

    const flat = base.toNonIndexed()
    base.dispose()
    flat.computeVertexNormals()
    return flat
}

const PRISM_VERTEX = /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vView;

    void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
    }
`

const PRISM_FRAGMENT = /* glsl */ `
    uniform vec3 uGlass;
    uniform vec3 uRoomTop;
    uniform vec3 uRoomBottom;
    uniform vec3 uHighlight;
    uniform float uIor;
    uniform float uDispersion;
    uniform float uTint;
    uniform float uEdge;
    uniform float uGloss;

    varying vec3 vNormal;
    varying vec3 vView;

    // Two lamps in view space, so the glints stay put while the bar turns under
    // them. A light fixed to the model turns with it, and the surface then reads
    // as painted rather than as lit.
    const vec3 KEY = vec3(0.55, 0.72, 0.42);
    const vec3 FILL = vec3(-0.62, -0.28, 0.73);

    /** The room the prism is standing in: a gradient with two lights in it. */
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
         * Both walls are drawn, and the far one arrives with its normal pointing
         * away from the camera. Flipping it back is what lets the inside of the
         * bar be shaded as a surface — without it the far wall takes the fresnel
         * of a face turned away and comes out as a flat silhouette, which is
         * most of what makes glass read as a solid lump.
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
         * Refraction sampled three times at slightly different indices and
         * recombined per channel.
         *
         * One sample would be colourless. The spread is what puts the fringe of
         * colour along the edges, where the ray bends hardest and the three
         * paths diverge most — and on a prism, which is all edges, it is the
         * entire point.
         */
        float eta = 1.0 / max(1.001, uIor);
        vec3 rRay = refract(-v, n, eta * (1.0 + uDispersion));
        vec3 gRay = refract(-v, n, eta);
        vec3 bRay = refract(-v, n, eta * (1.0 - uDispersion));
        vec3 refracted = vec3(room(rRay).r, room(gRay).g, room(bRay).b);

        // Beer-Lambert in spirit: what the bar keeps of its own colour, laid
        // over what it is bending.
        vec3 tinted = mix(refracted, refracted * uGlass, uTint);

        vec3 col = mix(tinted, reflected, rim);

        /*
         * Each flat is pushed apart in brightness by how squarely it faces the
         * key light.
         *
         * A handful of faces all bending the room by nearly the same amount come
         * out at nearly the same value, and the bar reads as one silhouette with
         * no faces in it. The term is stepped rather than smooth, so a face
         * holds one value across its whole width and changes at the edge — which
         * is what makes an edge an edge.
         */
        float face = smoothstep(-0.35, 0.9, dot(n, normalize(KEY)));
        col *= 0.72 + face * 0.55;

        /*
         * Gloss: a tight lobe off each lamp, plus a broad sheen underneath.
         *
         * Taken off the half vector rather than the normal alone, so a highlight
         * slides across a face as the bar turns instead of sitting in one spot.
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
         * see through. A high floor here paints every face at the same weight
         * whichever way it is turned, and the bar comes out looking like a
         * coloured plastic rod.
         */
        float alpha = 0.05 + rim * 0.85 + clamp(spec, 0.0, 1.0) * 0.75;
        alpha += uTint * 0.16;
        // A little more weight on the faces turned toward the light, so a lit
        // face and a shaded one are told apart by more than colour alone.
        alpha += face * 0.1;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0) * facing);
    }
`

class PrismScene {
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
            vertexShader: PRISM_VERTEX,
            fragmentShader: PRISM_FRAGMENT,
            uniforms: {
                uGlass: { value: new THREE.Color(cfg.glass) },
                uRoomTop: { value: new THREE.Color(cfg.roomTop) },
                uRoomBottom: { value: new THREE.Color(cfg.roomBottom) },
                uHighlight: { value: new THREE.Color(cfg.highlight) },
                uIor: { value: S.ior },
                uDispersion: { value: S.dispersion },
                uTint: { value: S.tint },
                uEdge: { value: S.edge },
                uGloss: { value: S.gloss },
            },
            transparent: true,
            // Both walls: seeing the far side of the bar through the near one is
            // the whole of what makes it read as glass rather than as a painted
            // shape.
            side: THREE.DoubleSide,
            depthWrite: false,
        })

        this.geometry = buildPrism(S.sides, S.length, S.girth, S.twist)
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
            // Kept so the bar carries on turning after the pointer lets go.
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
        u.uTint.value = S.tint
        u.uEdge.value = S.edge
        u.uGloss.value = S.gloss

        // Only the four shape controls own the geometry; everything else is a
        // uniform, so dragging a colour never rebuilds a buffer.
        if (
            cfg.sides !== prev.sides ||
            cfg.length !== prev.length ||
            cfg.twist !== prev.twist
        ) {
            const next = buildPrism(S.sides, S.length, S.girth, S.twist)
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
        const S = settingsFor(this.cfg)
        // Framed on the bar's longest dimension plus a margin, so a long prism
        // swinging end-on never clips as it turns.
        const span = (S.length + S.girth * 2 + 0.6) * (100 / sizePct)
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
        // The resting tilt plus whatever has been dragged, held short of the
        // poles: seen exactly end-on a prism is a polygon, and every flat that
        // describes it disappears at once.
        this.group.rotation.z = clamp(S.tilt + this.dragX * 0.5, -1.35, 1.35, 0)

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

export interface GlassPrismProps {
    glass?: string
    roomTop?: string
    roomBottom?: string
    highlight?: string
    sides?: number
    length?: number
    twist?: number
    edge?: number
    tilt?: number
    speed?: number
    direction?: "right" | "left"
    dragSensitivity?: number
    sizePercent?: number
    style?: React.CSSProperties
}

export default function GlassPrism(props: GlassPrismProps) {
    const {
        glass = DEFAULTS.glass,
        roomTop = DEFAULTS.roomTop,
        roomBottom = DEFAULTS.roomBottom,
        highlight = DEFAULTS.highlight,
        sides = DEFAULTS.sides,
        length = DEFAULTS.length,
        twist = DEFAULTS.twist,
        edge = DEFAULTS.edge,
        tilt = DEFAULTS.tilt,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction,
        dragSensitivity = DEFAULTS.dragSensitivity,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<PrismScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        glass,
        roomTop,
        roomBottom,
        highlight,
        sides,
        length,
        twist,
        edge,
        tilt,
        speed,
        direction,
        dragSensitivity,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: PrismScene
        try {
            scene = new PrismScene(container, cfgRef.current)
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
        sides,
        length,
        twist,
        edge,
        tilt,
        speed,
        direction,
        dragSensitivity,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Glass prism"
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

GlassPrism.displayName = "Glass Prism"
