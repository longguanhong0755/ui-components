"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Paper Fold — a crumpled sheet, lit and slowly working itself flat and back.
 *
 * The shape is ridged noise: take ordinary noise, fold it about zero, and invert
 * it. Ordinary noise gives rolling hills, which read as cloth or terrain; folding
 * it turns every zero crossing into a sharp crest, and sharp crests are what
 * paper has. That one operation is the difference between a bedsheet and a
 * discarded letter.
 *
 * The lighting is flat-shaded, and deliberately so. The normal is recovered in
 * the fragment shader from the derivatives of the interpolated world position,
 * which are constant across a triangle — so every triangle gets exactly one
 * value, the facets read as facets, and the creases come out as hard lines
 * between two tones. Smooth normals over the same geometry look like plastic:
 * the fold is there in the silhouette but the shading rounds it off.
 *
 * A sheen term rides on top, because paper is not matte. It scatters forward
 * along the grazing angle, which is why a crumpled page has that pale flare
 * along the crests facing away from you rather than at them.
 */

const DEFAULTS = {
    paper: "#000000",
    shade: "#000000",
    sheenColor: "#00E7FF",
    crease: 0,
    scale: 20,
    depth: 10,
    detail: 20,
    tilt: 20,
    sheen: 10,
    contrast: 15,
    speed: 6,
}

type Config = {
    paper: string
    shade: string
    sheenColor: string
    crease: number
    scale: number
    depth: number
    detail: number
    sheen: number
    tilt: number
    contrast: number
    speed: number
}

/** Vertices per side. Enough that a crease is a line, not a staircase. */
const SEGMENTS = 260

/**
 * The sheet is built at twice the size the camera covers.
 *
 * Tilting it shortens what the frame sees of it, and a sheet cut to exactly fill
 * the frame face-on leaves bare bands along the top and bottom the moment it is
 * laid back. The spare half is the margin that pays for the tilt.
 */
const SHEET = 8

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        // How far the noise is folded toward true creases. 0 leaves rolling
        // hills; full turns every zero crossing into an edge.
        crease: clamp(cfg.crease, 0, 20, DEFAULTS.crease) / 20,
        scale: 0.5 + clamp(cfg.scale, 1, 20, DEFAULTS.scale) * 0.22,
        depth: clamp(cfg.depth, 1, 20, DEFAULTS.depth) * 0.06,
        // Octaves, as a float the shader fades the last one in with — stepping
        // octaves in whole numbers pops visibly as the slider moves.
        detail: 1.0 + clamp(cfg.detail, 1, 20, DEFAULTS.detail) * 0.2,
        sheen: clamp(cfg.sheen, 0, 20, DEFAULTS.sheen) * 0.09,
        // How far the sheet is laid back from face-on, in radians.
        tilt: (clamp(cfg.tilt, 0, 20, DEFAULTS.tilt) / 20) * 0.9,
        contrast: 0.4 + clamp(cfg.contrast, 1, 20, DEFAULTS.contrast) * 0.09,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.05,
    }
}

const FOLD_VERTEX = /* glsl */ `
    uniform float uTime;
    uniform float uScale;
    uniform float uDepth;
    uniform float uDetail;
    uniform float uCrease;

    varying vec3 vWorld;
    varying float vHeight;

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

    /**
     * The sheet.
     *
     * Each octave is folded about zero before it is added, by the Crease amount:
     * at 0 this is plain fbm and the surface rolls, and at 1 every octave has a
     * hard crest at each of its zero crossings. Folding *per octave* rather than
     * once at the end is what puts creases at every size, which is how a real
     * crumple looks — a few big folds with smaller ones running across them.
     */
    float sheet(vec2 p) {
        float sum = 0.0;
        float amp = 0.5;
        float norm = 0.0;
        for (int i = 0; i < 5; i++) {
            float w = clamp(uDetail - float(i), 0.0, 1.0);
            float n = noise(p) * 2.0 - 1.0;
            // The fold. mix keeps it continuous as the slider moves, so the
            // sheet eases between cloth and paper rather than snapping.
            n = mix(n, 1.0 - abs(n) * 2.0, uCrease);
            sum += n * amp * w;
            norm += amp * w;
            p = mat2(0.8, 0.6, -0.6, 0.8) * p * 2.07;
            amp *= 0.5;
        }
        return sum / max(0.0001, norm);
    }

    void main() {
        vec3 pos = position;
        // The sheet works itself flat and back rather than sliding past: the
        // field is sampled at a moving offset in a third dimension, so folds
        // rise and settle in place.
        vec2 q = pos.xy * uScale + vec2(uTime * 0.35, uTime * 0.22);
        float h = sheet(q);
        pos.z += h * uDepth * 3.0;

        vec4 world = modelMatrix * vec4(pos, 1.0);
        vWorld = world.xyz;
        vHeight = h;
        gl_Position = projectionMatrix * viewMatrix * world;
    }
`

const FOLD_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec3 uPaper;
    uniform vec3 uShade;
    uniform vec3 uSheenColor;
    uniform float uSheen;
    uniform float uContrast;

    varying vec3 vWorld;
    varying float vHeight;

    void main() {
        /*
         * Flat shading, from the derivatives of the world position.
         *
         * Those are constant across a triangle, so this hands every facet one
         * normal and the creases come out as hard lines. Interpolated vertex
         * normals over the same geometry round the folds off and the sheet
         * turns to plastic.
         */
        vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
        // Facing the camera, always: the sheet is one-sided and a back-facing
        // normal would light a facet as if it were in shadow.
        if (n.z < 0.0) n = -n;

        vec3 lightDir = normalize(vec3(-0.45, 0.6, 0.66));
        float key = clamp(dot(n, lightDir), 0.0, 1.0);
        // A dim fill from the opposite side, so the darkest facets still read as
        // paper rather than as holes.
        float fill = clamp(dot(n, normalize(vec3(0.5, -0.3, 0.5))), 0.0, 1.0) * 0.25;

        float lit = clamp((key + fill - 0.5) * uContrast * 2.0 + 0.5, 0.0, 1.0);
        vec3 col = mix(uShade, uPaper, lit);

        /*
         * Sheen.
         *
         * Paper scatters forward, so the flare sits where the surface turns away
         * from the eye, not where it faces the light. That grazing term is what
         * separates paper from matte board.
         */
        vec3 view = normalize(cameraPosition - vWorld);
        float grazing = 1.0 - clamp(dot(n, view), 0.0, 1.0);
        float sheen = pow(grazing, 3.0) * uSheen * 2.2;
        col += uSheenColor * sheen;

        // The sheet is opaque; the frame shows around it, not through it.
        gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
`

class FoldScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60)
    private geometry = new THREE.PlaneGeometry(SHEET, SHEET, SEGMENTS, SEGMENTS)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private time = 0
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
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: FOLD_VERTEX,
            fragmentShader: FOLD_FRAGMENT,
            uniforms: {
                uTime: { value: 0 },
                uScale: { value: S.scale },
                uDepth: { value: S.depth },
                uDetail: { value: S.detail },
                uCrease: { value: S.crease },
                uSheen: { value: S.sheen },
                uContrast: { value: S.contrast },
                uPaper: { value: new THREE.Color(cfg.paper) },
                uShade: { value: new THREE.Color(cfg.shade) },
                uSheenColor: { value: new THREE.Color(cfg.sheenColor) },
            },
            side: THREE.DoubleSide,
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)
        this.applyTilt(S.tilt)
    }

    private applyTilt(tilt: number) {
        // The sheet lies back rather than the camera moving, so the frame stays
        // filled however far it is tipped.
        this.mesh.rotation.set(-tilt, tilt * 0.35, 0)
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
        this.width = width
        this.height = height
        this.renderer.setSize(width, height, false)
        this.updateCamera()
    }

    private updateCamera() {
        const aspect = Math.max(1, this.width) / Math.max(1, this.height)
        this.camera.aspect = aspect
        /*
         * Pulled back far enough that the sheet covers the frame on its shorter
         * axis, whichever that is. A fixed distance leaves bare corners on a
         * tall frame, which is where this kind of component usually breaks.
         */
        const halfV = Math.tan((this.camera.fov * Math.PI) / 360)
        const needed = 2.0 / Math.min(halfV * aspect, halfV)
        this.camera.position.set(0, 0, needed * 1.02)
        this.camera.lookAt(0, 0, 0)
        this.camera.updateProjectionMatrix()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.material.uniforms
        u.uScale.value = S.scale
        u.uDepth.value = S.depth
        u.uDetail.value = S.detail
        u.uCrease.value = S.crease
        u.uSheen.value = S.sheen
        u.uContrast.value = S.contrast
        u.uPaper.value.set(cfg.paper || "#ffffff")
        u.uShade.value.set(cfg.shade || "#000000")
        u.uSheenColor.value.set(cfg.sheenColor || "#ffffff")
        this.applyTilt(S.tilt)
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        this.time += dt * settingsFor(this.cfg).speed
        this.material.uniforms.uTime.value = this.time
        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

interface PaperFoldProps {
    paper?: string
    shade?: string
    sheenColor?: string
    crease?: number
    scale?: number
    depth?: number
    detail?: number
    sheen?: number
    tilt?: number
    contrast?: number
    speed?: number
    style?: React.CSSProperties
}

export default function PaperFold(props: PaperFoldProps) {
    const {
        paper = DEFAULTS.paper,
        shade = DEFAULTS.shade,
        sheenColor = DEFAULTS.sheenColor,
        crease = DEFAULTS.crease,
        scale = DEFAULTS.scale,
        depth = DEFAULTS.depth,
        detail = DEFAULTS.detail,
        sheen = DEFAULTS.sheen,
        tilt = DEFAULTS.tilt,
        contrast = DEFAULTS.contrast,
        speed = DEFAULTS.speed,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<FoldScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        paper,
        shade,
        sheenColor,
        crease,
        scale,
        depth,
        detail,
        sheen,
        tilt,
        contrast,
        speed,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: FoldScene
        try {
            scene = new FoldScene(container, cfgRef.current)
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
    }, [paper, shade, sheenColor, crease, scale, depth, detail, sheen, tilt, contrast, speed])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Folded paper sheet"
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

PaperFold.displayName = "Paper Fold"
