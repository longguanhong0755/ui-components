"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Refract Gem — a cut stone that bends the light passing through it and throws
 * the colours apart at its edges.
 *
 * Glass has a different index of refraction for every wavelength, which is why
 * a prism makes a spectrum. Here the ray through each facet is refracted three
 * times — once for red, once for green, once for blue, each at a slightly
 * different index — and the three samples are recombined. That single fact is
 * the whole component: with one shared index the stone looks like tinted
 * plastic no matter how bright the highlights are.
 *
 * There is no environment map, so the world the stone refracts is a function of
 * direction: a bright sky, a dark ground, and two hot spots for the facets to
 * catch. A constant colour refracts to nothing and the gem comes out flat.
 *
 * The geometry is de-indexed and its normals recomputed, so every triangle
 * carries one normal and the stone reads as cut. Indexed geometry averages the
 * normals across shared corners and a faceted solid shades as a soft barrel.
 */

const PERSPECTIVE = 0.15

/**
 * Six the panel used to own, pinned at the settings that were kept.
 *
 * Crispness at its maximum feeds three numbers — the light panels' edge width,
 * the specular exponent, and how far each facet cell tips from its neighbours —
 * which is why they are three constants rather than one.
 *
 * Stretch, dispersion and the index of refraction each have a wide range that
 * only makes the stone worse either side of the value here, and brightness at
 * zero is what keeps the body dark enough for the reflections to read.
 */
const SOURCE_EDGE = 0.4 / (1 + 20 * 1.6)
const SPECULAR = 40 + 20 * 60
const FACET_TIP = 0.1 + 20 * 0.014
const STRETCH = 0.35 + 7 * 0.085
const DISPERSION = 10 * 0.004
const INDEX = 1.05 + 10 * 0.035
const BRIGHTNESS = 0

/**
 * The resting pitch, in radians. The panel used to own it; 40° is the angle
 * that shows the table, the girdle and a little of the pavilion at once, and
 * anything much either side of it flattens the stone into a plan or an
 * elevation. Dragging still tips it freely from here.
 */
const TILT_X = 0

type Cut = "brilliant" | "spire" | "drum"

type Config = {
    tint: string
    accent: string
    shine: string
    shape: Cut
    facets: number
    detail: number
    edgeGlow: number
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
        // Sides around the girdle — the stone's actual facet count. Three is a
        // wedge, eight is a classic cut, twenty-four is near enough round.
        sides: Math.round(clamp(cfg.facets, 3, 24, 8)),
        cut: cfg.shape,
        // How coarsely the surface is broken up on top of the cut, applied as a
        // wobble to the normals rather than to the geometry — cheaper, and it
        // keeps the silhouette clean.
        detail: 1.5 + clamp(cfg.detail, 1, 20, 20) * 0.75,
        edgeGlow: 0.15 + clamp(cfg.edgeGlow, 0, 20, 12) * 0.06,
        // The panel used to own these; see the constants above.
        stretch: STRETCH,
        sourceEdge: SOURCE_EDGE,
        specular: SPECULAR,
        facetTip: FACET_TIP,
        dispersion: DISPERSION,
        index: INDEX,
        brightness: BRIGHTNESS,
        spin: clamp(cfg.speed, 0, 20, 5) * 0.09,
        heading: cfg.direction === "left" ? -1 : 1,
        drag: clamp(cfg.dragSensitivity, 1, 10, 3) * 0.007,
    }
}

const GEM_VERTEX = /* glsl */ `
varying vec3 vNormalV;
varying vec3 vViewV;
varying vec3 vLocal;

void main() {
    vLocal = position;
    vNormalV = normalize( normalMatrix * normal );
    vec4 mv = modelViewMatrix * vec4( position, 1.0 );
    vViewV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
}
`

const GEM_FRAGMENT = /* glsl */ `
uniform vec3 uTint;
uniform vec3 uAccent;
uniform vec3 uShine;
uniform float uDetail;
uniform float uSourceEdge;
uniform float uSpecular;
uniform float uFacetTip;
uniform float uDispersion;
uniform float uIndex;
uniform float uBrightness;
uniform float uEdgeGlow;
uniform float uTime;

varying vec3 vNormalV;
varying vec3 vViewV;
varying vec3 vLocal;

float hash31( vec3 p ) {
    return fract( sin( dot( p, vec3( 127.1, 311.7, 74.7 ) ) ) * 43758.5453123 );
}

float noise3( vec3 p ) {
    vec3 i = floor( p );
    vec3 f = fract( p );
    vec3 u = f * f * ( 3.0 - 2.0 * f );
    return mix(
        mix(
            mix( hash31( i ), hash31( i + vec3( 1.0, 0.0, 0.0 ) ), u.x ),
            mix( hash31( i + vec3( 0.0, 1.0, 0.0 ) ), hash31( i + vec3( 1.0, 1.0, 0.0 ) ), u.x ),
            u.y
        ),
        mix(
            mix( hash31( i + vec3( 0.0, 0.0, 1.0 ) ), hash31( i + vec3( 1.0, 0.0, 1.0 ) ), u.x ),
            mix( hash31( i + vec3( 0.0, 1.0, 1.0 ) ), hash31( i + vec3( 1.0, 1.0, 1.0 ) ), u.x ),
            u.y
        ),
        u.z
    );
}

/**
 * The world the stone looks out on — a studio, not a sky.
 *
 * The sources are hard-edged panels rather than smooth falloffs. That is the
 * whole reason a real gem photographs crisp: it is not reflecting a gradient,
 * it is reflecting a rectangle of light with a definite border, so every facet
 * either catches the panel or does not and the edge between the two lands as a
 * clean line. Smooth "pow(dot, n)" lobes — the first version — give a facet a
 * gentle ramp from bright to dark across its width, and that ramp is what read
 * as soft plastic. (Quotes, not backticks: a backtick here would close this
 * template literal and throw a JavaScript parse error pointing somewhere else
 * entirely.)
 */
vec3 sky( vec3 dir ) {
    float up = dir.y * 0.5 + 0.5;
    vec3 col = mix( vec3( 0.02, 0.03, 0.055 ), vec3( 0.34, 0.40, 0.52 ), pow( up, 2.0 ) );

    // Overhead panel: a broad hard-bordered slab of light above the stone.
    float key = smoothstep( 0.34 - uSourceEdge, 0.34 + uSourceEdge, dir.y )
              * smoothstep( -0.55 - uSourceEdge, -0.55 + uSourceEdge, dir.x );
    col += uShine * key * 1.5;

    // A narrow strip low to one side, so facets pointing down still have
    // something to find. Two sources, because with one every facet facing away
    // from it goes uniformly black and the stone loses its interior.
    float strip = smoothstep( -0.18 - uSourceEdge, -0.18 + uSourceEdge, dir.y )
                * ( 1.0 - smoothstep( 0.02 - uSourceEdge, 0.02 + uSourceEdge, dir.y ) )
                * smoothstep( 0.1 - uSourceEdge, 0.1 + uSourceEdge, dir.x );
    col += uShine * strip * 0.85;

    // The horizon itself, kept tight: a facet sweeping across it flashes.
    col += uShine * exp( -pow( dir.y / 0.035, 2.0 ) ) * 0.3;
    return col;
}

void main() {
    vec3 n = normalize( vNormalV );
    if ( !gl_FrontFacing ) n = -n;
    vec3 v = normalize( vViewV );

    // Facets on top of the geometry's own: the normal is nudged by a coarse
    // noise cell, so the stone has more cuts than it has triangles. Faceting
    // the geometry that finely instead would cost thousands of triangles for
    // a silhouette nobody would see change.
    vec3 cell = floor( vLocal * uDetail );
    vec3 jitter = normalize( vec3(
        hash31( cell ) - 0.5,
        hash31( cell + 11.3 ) - 0.5,
        hash31( cell + 27.9 ) - 0.5
    ) );
    // One constant offset per cell, so the boundary between two cells is a
    // hard crease rather than a gradient — that crease is the facet edge.
    n = normalize( n + jitter * uFacetTip );

    float facing = max( dot( n, v ), 0.0 );
    // Schlick with the exponent fixed; the panel scales the term instead.
    float fres = pow( 1.0 - facing, 5.0 );

    // Three indices, three rays, three samples. This is the dispersion — one
    // shared index gives tinted plastic however bright the highlights get.
    vec3 rd = -v;
    vec3 rr = refract( rd, n, 1.0 / ( uIndex - uDispersion ) );
    vec3 rg = refract( rd, n, 1.0 / uIndex );
    vec3 rb = refract( rd, n, 1.0 / ( uIndex + uDispersion ) );
    vec3 through = vec3( sky( rr ).r, sky( rg ).g, sky( rb ).b );

    vec3 refl = sky( reflect( rd, n ) );

    // What the stone lets through, tinted by its body; what it mirrors is not
    // tinted at all, because a reflection off the surface never entered it.
    vec3 col = through * uTint * ( 0.6 + uBrightness * 1.2 );
    col = mix( col, refl, 0.25 + fres * 0.6 );

    // Fire at the edges: the spectrum is widest where the ray grazes, so the
    // colour separation is weighted by the same fresnel term.
    col += uAccent * fres * uEdgeGlow * ( 0.6 + uDispersion * 60.0 );

    // Two lobes off the key: a pinpoint and a tighter core inside it. The pair
    // gives the highlight a hard middle without shrinking it to a single pixel,
    // which is what one very high exponent on its own does.
    vec3 hKey = normalize( normalize( vec3( -0.35, 0.8, 0.5 ) ) + v );
    float spec = pow( max( dot( n, hKey ), 0.0 ), uSpecular ) * 1.9
               + pow( max( dot( n, hKey ), 0.0 ), uSpecular * 4.0 ) * 1.2;
    col += uShine * spec;

    float a = clamp( 0.32 + fres * 0.7 + spec, 0.0, 1.0 );
    // Premultiplied over additive blending: the far facets shine through the
    // near ones instead of being hidden, which is what a clear stone does.
    gl_FragColor = vec4( col * a, a );
}
`

class GemScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)
    private group = new THREE.Group()

    private geometry: THREE.BufferGeometry
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private clockT = 0
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

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.cursor = "grab"
        el.style.touchAction = "none"
        container.appendChild(el)

        const S = settingsFor(cfg)
        this.geometry = this.buildStone(cfg)
        this.material = new THREE.ShaderMaterial({
            vertexShader: GEM_VERTEX,
            fragmentShader: GEM_FRAGMENT,
            uniforms: {
                uTint: { value: new THREE.Color(cfg.tint || "#9BD8FF") },
                uAccent: { value: new THREE.Color(cfg.accent || "#FFD9A0") },
                uShine: { value: new THREE.Color(cfg.shine || "#FFFFFF") },
                uDetail: { value: S.detail },
                uSourceEdge: { value: S.sourceEdge },
                uSpecular: { value: S.specular },
                uFacetTip: { value: S.facetTip },
                uDispersion: { value: S.dispersion },
                uIndex: { value: S.index },
                uBrightness: { value: S.brightness },
                uEdgeGlow: { value: S.edgeGlow },
                uTime: { value: 0 },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false,
        })
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.group.add(this.mesh)
        this.scene.add(this.group)

        this.bindEvents()
    }

    /**
     * The profile of each cut, as [radius, height] pairs read from the top
     * down. Turning this profile around the axis on a fixed number of sides is
     * what actually cuts the stone.
     *
     * A radius of zero is a point — the table above or the culet below — and
     * the builder emits a fan there instead of a band of quads.
     */
    private profileFor(cut: Cut): Array<[number, number]> {
        switch (cut) {
            case "spire":
                // A double point — the sharpest silhouette of the set.
                return [
                    [0.0, 1.15],
                    [0.55, 0.35],
                    [1.0, -0.05],
                    [0.0, -1.15],
                ]
            case "drum":
                // A barrel with a bevel top and bottom: no point anywhere, so
                // every facet is a flat panel catching the light.
                return [
                    [0.72, 0.72],
                    [1.0, 0.44],
                    [1.0, -0.44],
                    [0.72, -0.72],
                ]
            case "brilliant":
            default:
                // Crown, girdle, pavilion to a culet.
                return [
                    [0.6, 0.62],
                    [0.94, 0.34],
                    [1.0, 0.12],
                    [0.0, -1.05],
                ]
        }
    }

    /**
     * Turns the profile on `sides` facets.
     *
     * The previous version subdivided an icosahedron, which is why the control
     * behaved backwards: subdividing a solid does not give it more facets, it
     * gives it *smoother* ones, so turning the dial up rounded the stone off
     * into a ball. Here the count is the number of sides around the girdle, so
     * three is a wedge and twenty-four is nearly round — the range reads the
     * way the label promises.
     *
     * Every triangle is emitted with its own three vertices and the normals
     * computed afterwards, so each facet gets exactly one normal. Sharing
     * vertices between facets averages their normals and a cut stone shades as
     * a soft barrel.
     */
    private buildStone(cfg: Config): THREE.BufferGeometry {
        const S = settingsFor(cfg)
        const profile = this.profileFor(S.cut)
        const sides = S.sides
        const verts: number[] = []

        const ringPoint = (radius: number, y: number, i: number) => {
            // Half a step of offset, so a low-sided stone presents a flat face
            // to the camera rather than an edge.
            const a = ((i % sides) + 0.5) * ((Math.PI * 2) / sides)
            return [
                Math.cos(a) * radius * S.stretch,
                y,
                Math.sin(a) * radius,
            ] as const
        }
        const push = (p: readonly number[]) => {
            verts.push(p[0], p[1], p[2])
        }

        for (let k = 0; k < profile.length - 1; k++) {
            const [rTop, yTop] = profile[k]
            const [rBot, yBot] = profile[k + 1]
            for (let i = 0; i < sides; i++) {
                const t0 = ringPoint(rTop, yTop, i)
                const t1 = ringPoint(rTop, yTop, i + 1)
                const b0 = ringPoint(rBot, yBot, i)
                const b1 = ringPoint(rBot, yBot, i + 1)
                if (rTop <= 1e-5) {
                    // Apex above: one triangle down to the ring below it.
                    push([0, yTop, 0])
                    push(b1)
                    push(b0)
                } else if (rBot <= 1e-5) {
                    // Culet below.
                    push(t0)
                    push(t1)
                    push([0, yBot, 0])
                } else {
                    push(t0)
                    push(t1)
                    push(b1)
                    push(t0)
                    push(b1)
                    push(b0)
                }
            }
        }

        // Caps: the table on top and, on a cut that ends flat, the back.
        const capTop = profile[0]
        if (capTop[0] > 1e-5) {
            for (let i = 0; i < sides; i++) {
                push([0, capTop[1], 0])
                push(ringPoint(capTop[0], capTop[1], i))
                push(ringPoint(capTop[0], capTop[1], i + 1))
            }
        }
        const capBottom = profile[profile.length - 1]
        if (capBottom[0] > 1e-5) {
            for (let i = 0; i < sides; i++) {
                push([0, capBottom[1], 0])
                push(ringPoint(capBottom[0], capBottom[1], i + 1))
                push(ringPoint(capBottom[0], capBottom[1], i))
            }
        }

        const g = new THREE.BufferGeometry()
        g.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(verts), 3)
        )
        // One normal per triangle: the stone has to read as cut.
        g.computeVertexNormals()
        return g
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
            const S = settingsFor(this.cfg)
            this.dragY += dx * S.drag
            this.dragX += dy * S.drag
            this.velY = dx * S.drag
            this.velX = dy * S.drag
        }
        const up = () => {
            this.isDragging = false
            el.style.cursor = "grab"
        }
        const leave = () => {
            up()
        }
        el.addEventListener("pointerdown", down)
        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", up)
        el.addEventListener("pointerleave", leave)
        el.addEventListener("pointercancel", leave)
        this.unbind = () => {
            el.removeEventListener("pointerdown", down)
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerup", up)
            el.removeEventListener("pointerleave", leave)
            el.removeEventListener("pointercancel", leave)
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
        ;(u.uTint.value as THREE.Color).set(cfg.tint || "#9BD8FF")
        ;(u.uAccent.value as THREE.Color).set(cfg.accent || "#FFD9A0")
        ;(u.uShine.value as THREE.Color).set(cfg.shine || "#FFFFFF")
        u.uDetail.value = S.detail
        u.uSourceEdge.value = S.sourceEdge
        u.uSpecular.value = S.specular
        u.uFacetTip.value = S.facetTip
        u.uDispersion.value = S.dispersion
        u.uIndex.value = S.index
        u.uBrightness.value = S.brightness
        u.uEdgeGlow.value = S.edgeGlow
        // Only the three controls that decide the cut own the buffer.
        const prevS = settingsFor(prev)
        if (
            S.sides !== prevS.sides ||
            S.cut !== prevS.cut ||
            S.stretch !== prevS.stretch
        ) {
            const next = this.buildStone(cfg)
            this.geometry.dispose()
            this.geometry = next
            this.mesh.geometry = next
        }
        this.updateCamera()
    }

    private updateCamera() {
        const aspect = Math.max(1, this.width) / Math.max(1, this.height)
        const distance = 1 / PERSPECTIVE
        const sizePct = clamp(this.cfg.sizePercent, 20, 200, 85)
        const S = settingsFor(this.cfg)
        // Framed on whichever way the stone is longest: a stretched cut is
        // wider than it is tall, and framing on the height alone let the ends
        // run off the sides of the frame.
        const span = 2.4 * Math.max(1, S.stretch) * (100 / sizePct)
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

        this.clockT += dt
        const S = settingsFor(this.cfg)
        this.material.uniforms.uTime.value = this.clockT

        if (!this.isDragging) {
            const decay = Math.exp(-dt * 3)
            this.dragY += this.velY
            this.dragX += this.velX
            this.velX *= decay
            this.velY *= decay
            this.spinAngle += S.spin * S.heading * dt
        }

        this.mesh.rotation.y = this.spinAngle
        // No pitch clamp: this one tumbles freely on both axes and keeps going
        // as far as the pointer takes it. A clamp is there to protect a
        // three-quarter view of something with an obvious top, and a cut stone
        // is worth looking at from underneath as well.
        this.group.rotation.set(TILT_X + this.dragX * 0.5, this.dragY, 0)

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

export interface RefractGemProps {
    /** The body colour of the stone. */
    tint?: string
    /** The colour thrown out around the edges. */
    accent?: string
    /** The light it reflects — the panels, and the highlights they cast. */
    shine?: string
    /**
     * Brilliant points below, Spire points both ways, Drum is a flat-panelled
     * barrel.
     */
    shape?: Cut
    /**
     * Sides around the stone: 3 is a wedge, 8 is a classic cut, 24 is nearly
     * round.
     */
    facets?: number
    /** 1 is a few big flats; 20 is a crushed-ice surface. */
    detail?: number
    edgeGlow?: number
    speed?: number
    direction?: "right" | "left"
    dragSensitivity?: number
    /** Percent. */
    sizePercent?: number
    style?: React.CSSProperties
}

function __BaseImpl_RefractGem(props: RefractGemProps) {
    const {
        tint = "#000000",
        accent = "#F5F5F5",
        shine = "#E9E9E9",
        shape = "brilliant",
        facets = 10,
        detail = 20,
        edgeGlow = 12,
        speed = 20,
        direction = "right",
        dragSensitivity = 3,
        sizePercent = 85,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<GemScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        tint,
        accent,
        shine,
        shape,
        facets,
        detail,
        edgeGlow,
        speed,
        direction,
        dragSensitivity,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: GemScene
        try {
            scene = new GemScene(container, cfgRef.current)
        } catch {
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
        tint,
        accent,
        shine,
        shape,
        facets,
        detail,
        edgeGlow,
        speed,
        direction,
        dragSensitivity,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Cut gemstone that refracts and disperses light"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 180,
                minHeight: 180,
                overflow: "hidden",
                ...style,
            }}
        />
    )
}

RefractGem.displayName = "Refract Gem"

const __presetProps = {
  "tint": "#000000",
  "accent": "#F5F5F5",
  "shine": "#E9E9E9",
  "shape": "brilliant",
  "facets": 10,
  "detail": 20,
  "edgeGlow": 12,
  "speed": 12,
  "direction": "right",
  "dragSensitivity": 3,
  "sizePercent": 85
};

export default function RefractGem(props: Record<string, unknown>) {
  return <__BaseImpl_RefractGem {...(__presetProps as Record<string, unknown>)} {...props} />;
}
