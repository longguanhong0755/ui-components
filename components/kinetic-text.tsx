"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Kinetic Type — a word tiled over a solid and dragged around it by the clock.
 *
 * A port of the MIT-licensed Codrops demo "Kinetic Typography with Three.js" by
 * Mario Carrillo (github.com/marioecg/codrops-kinetic-typo). Two of its demos
 * are here as one Shape control: the knot ("ENDLESS") and the twisted bar
 * ("TWISTED"), each keeping its own repeat counts, scroll rate and depth
 * treatment from the original shaders.
 *
 * The mechanism: the word is not geometry. It is drawn once into an offscreen
 * 2D canvas — ink on a fill plate — and that one tile is sampled with
 * `fract(vUv * repeat - time)`, so twelve copies march around the knot for the
 * cost of a single texture fetch. Motion is a texture offset, not a transform:
 * nothing is re-laid-out per frame and the type follows the surface exactly
 * however it curves.
 *
 * The original built that tile with a bmfont atlas rendered into a WebGLRenderTarget
 * every frame. A Framer component cannot carry the .fnt/.png pair alongside it, and
 * a render target redrawn per frame buys nothing when the word only changes when
 * the panel does — so the plate is a canvas texture, rebuilt on edit. Same tile,
 * one draw call less, and the Font control now picks any face Framer has.
 *
 * The word is stretched to the plate rather than set at a fixed size: fitting the
 * width is what makes the letters read as one continuous band on the surface, and
 * a short word at a fixed size would leave the tile mostly plate.
 */

/** Camera distance, from the original. Only the fov is solved, so this fixes perspective. */
const CAM_DISTANCE = 50

/** Visible height at that distance under the original's 45° camera — the framing to match. */
const SPAN = 2 * Math.tan((45 * Math.PI) / 180 / 2) * CAM_DISTANCE

/** Plate resolution. 16:9, like the render target it replaces. */
const TILE_W = 1024
const TILE_H = 576

/** The word takes this much of the plate's width; the rest is the gap between copies. */
const FILL_W = 0.9

type ShapeName = "torusKnot" | "box"

/** Per-demo constants, lifted from options.js and shaders.js. */
const SHAPES: Record<ShapeName, { repeat: [number, number] }> = {
    torusKnot: { repeat: [12, 3] },
    box: { repeat: [3, 3] },
}

const DEFAULTS = {
    shape: "torusKnot" as ShapeName,
    word: "COMPONENT",
    color: "#FFFFFF",
    fill: "#000000",
    density: 12,
    speed: 10,
    distort: 8,
    sizePercent: 102,
    hoverBoost: 7,
}

type FontValue = {
    fontFamily?: string
    fontSize?: number | string
    fontWeight?: number | string
    fontStyle?: string
    letterSpacing?: number | string
}

type Config = {
    shape: ShapeName
    word: string
    font: FontValue
    color: string
    fill: string
    density: number
    speed: number
    distort: number
    sizePercent: number
    hoverBoost: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/**
 * ControlType.Font hands back CSS strings — "60px", "-0.03em" — wherever the
 * panel shows a length. Arithmetic on those yields NaN, which propagates into
 * the canvas metrics and blanks the whole component.
 */
function toPx(v: unknown, fallback: number, emBasis: number): number {
    if (typeof v === "number" && isFinite(v)) return v
    if (typeof v === "string") {
        const n = parseFloat(v)
        if (!isFinite(n)) return fallback
        if (v.indexOf("em") >= 0) return n * emBasis
        if (v.indexOf("%") >= 0) return (n / 100) * emBasis
        return n
    }
    return fallback
}

/** Panel values are whole numbers; the scene wants the real ones. */
function settingsFor(cfg: Config) {
    const shape: ShapeName = SHAPES[cfg.shape] ? cfg.shape : DEFAULTS.shape
    const base = SHAPES[shape].repeat
    const font = cfg.font ?? {}
    // Font size is read as a share of the plate's height, not as points: the word
    // is stretched to the plate either way, so a px size would have no effect at
    // all. 60 is the original's roughly-two-thirds-tall band; past 100 the caps
    // run off the top and bottom of the tile, which is how the demo's own type
    // was cropped.
    const heightPct = clamp(toPx(font.fontSize, 60, 100), 10, 300, 60)
    const d = clamp(cfg.density, 1, 20, DEFAULTS.density) / 10
    return {
        shape,
        family: font.fontFamily || "Impact, Haettenschweiler, sans-serif",
        weight: font.fontWeight ?? 900,
        fontStyle: font.fontStyle ?? "normal",
        // Tracking arrives against the nominal size; re-express it on the 200px
        // basis the plate is drawn at.
        tracking: toPx(font.letterSpacing, 0, 1) * 2,
        capHeight: (heightPct / 100) * TILE_H,
        // Whole numbers of copies. A fractional repeat leaves a sliced word at
        // the seam where the tile wraps.
        repeat: [
            Math.max(1, Math.round(base[0] * d)),
            Math.max(1, Math.round(base[1] * d)),
        ] as [number, number],
        // 10 is the original rate; the per-shape multiplier stays in the shader.
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) / 10,
        // Scales the bar's twist. 10 is what the tutorial hard-coded; 0 leaves a
        // straight bar. The knot's shader does not read it, which is why the
        // control hides on that shape rather than sitting there doing nothing.
        distort: clamp(cfg.distort, 0, 20, DEFAULTS.distort) / 10,
        // Extra scroll rate while the pointer is over the frame, as a multiple of
        // the resting speed: 10 runs it at four times, 0 is no hover at all.
        hoverBoost: clamp(cfg.hoverBoost, 0, 20, DEFAULTS.hoverBoost) * 0.3,
        zoom: 100 / clamp(cfg.sizePercent, 20, 200, DEFAULTS.sizePercent),
    }
}

const VERTEX = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vPosition;

    uniform float uTime;
    uniform float uDistort;

    mat4 rotation3d(vec3 axis, float angle) {
        axis = normalize(axis);
        float s = sin(angle);
        float c = cos(angle);
        float oc = 1.0 - c;

        return mat4(
            oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
            oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
            oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
            0.0,                                0.0,                                0.0,                                1.0
        );
    }

    void main() {
        vUv = uv;

        vec3 pos = position;

        #ifdef SHAPE_BOX
            // Twist about the long axis: the further along the bar, the more
            // turn, so the type spirals instead of sliding flat.
            float angle = pos.x * 0.1 * uDistort;
            pos = (rotation3d(vec3(1., 0., 0.), angle) * vec4(pos, 1.)).xyz;
        #endif

        vPosition = pos;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
    }
`

const FRAGMENT = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vPosition;

    uniform float uTime;
    uniform vec2 uRepeat;
    uniform vec3 uFog;
    uniform sampler2D uTexture;

    void main() {
        vec3 fragColor;

        #ifdef SHAPE_TORUS
            float time = uTime * 0.4;
            vec2 uv = fract(vUv * -uRepeat - vec2(time, 0.));
            vec3 tex = texture2D(uTexture, uv).rgb;
            // Depth read off the knot itself: the far lobes sink into the plate
            // colour, which is what keeps the near and far passes of type from
            // reading as one flat tangle.
            float fog = clamp(vPosition.z / 6., 0., 1.);
            fragColor = mix(uFog, tex, fog);
        #endif

        #ifdef SHAPE_BOX
            float time = uTime * 0.25;
            vec2 uv = fract(vUv * uRepeat - vec2(time, 0.));
            fragColor = texture2D(uTexture, uv).rgb;
        #endif

        gl_FragColor = vec4(fragColor, 1.);
    }
`

function buildGeometry(shape: ShapeName): THREE.BufferGeometry {
    if (shape === "box") return new THREE.BoxGeometry(100, 10, 10, 64, 64, 64)
    return new THREE.TorusKnotGeometry(9, 3, 768, 3, 4, 3)
}

function definesFor(shape: ShapeName): Record<string, boolean> {
    return shape === "box" ? { SHAPE_BOX: true } : { SHAPE_TORUS: true }
}

class KineticScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(45, 1, 1, 1000)
    private geometry: THREE.BufferGeometry
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh
    private plate: HTMLCanvasElement
    private plateCtx: CanvasRenderingContext2D | null
    private texture: THREE.CanvasTexture
    private width = 1
    private height = 1
    private time = 0
    private lastT = 0
    private frameId = 0
    private disposed = false
    /** 0 resting, 1 fully hovered. Eased, never switched, so the type accelerates. */
    private grip = 0
    private hovered = false
    private onEnter = () => {
        this.hovered = true
    }
    private onLeave = () => {
        this.hovered = false
    }

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const canvas = this.renderer.domElement
        canvas.style.cssText =
            "position:absolute;inset:0;width:100%;height:100%;display:block;"
        container.appendChild(canvas)

        // enter/leave, not over/out — those also fire crossing between children.
        canvas.addEventListener("pointerenter", this.onEnter)
        canvas.addEventListener("pointerleave", this.onLeave)
        canvas.addEventListener("pointercancel", this.onLeave)

        this.plate = document.createElement("canvas")
        this.plate.width = TILE_W
        this.plate.height = TILE_H
        this.plateCtx = this.plate.getContext("2d")
        this.texture = new THREE.CanvasTexture(this.plate)
        this.texture.colorSpace = THREE.SRGBColorSpace
        this.texture.wrapS = THREE.RepeatWrapping
        this.texture.wrapT = THREE.RepeatWrapping
        this.texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
        this.drawPlate()

        this.geometry = buildGeometry(S.shape)
        this.material = new THREE.ShaderMaterial({
            vertexShader: VERTEX,
            fragmentShader: FRAGMENT,
            defines: definesFor(S.shape),
            uniforms: {
                uTime: { value: 0 },
                uRepeat: { value: new THREE.Vector2(S.repeat[0], S.repeat[1]) },
                uDistort: { value: S.distort },
                uFog: { value: new THREE.Color(cfg.fill || DEFAULTS.fill) },
                uTexture: { value: this.texture },
            },
            side: THREE.DoubleSide,
        })
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.scene.add(this.mesh)

        // A webfont chosen in the panel may not be resident when the plate is
        // first drawn; without this the tile keeps whatever fallback was loaded.
        const fonts = (document as any).fonts
        if (fonts?.ready?.then) {
            fonts.ready.then(() => {
                if (!this.disposed) this.drawPlate()
            })
        }
    }

    /** The one tile every copy of the word is sampled from. */
    private drawPlate() {
        const ctx = this.plateCtx
        if (!ctx) return
        const S = settingsFor(this.cfg)
        const word = (this.cfg.word ?? "").length ? this.cfg.word : DEFAULTS.word

        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.fillStyle = this.cfg.fill || DEFAULTS.fill
        ctx.fillRect(0, 0, TILE_W, TILE_H)

        // Measured at a large fixed size and then scaled onto the plate, so the
        // metrics stay precise for both very short and very long words.
        const BASIS = 200
        ctx.font = `${S.fontStyle} ${S.weight} ${BASIS}px ${S.family}`
        if ("letterSpacing" in ctx) (ctx as any).letterSpacing = `${S.tracking}px`
        const m = ctx.measureText(word)
        const w = Math.max(1, m.width)
        const ascent = m.actualBoundingBoxAscent || BASIS * 0.72
        const descent = m.actualBoundingBoxDescent || 0
        const h = Math.max(1, ascent + descent)

        // Non-uniform on purpose: fitting the width is what makes the letters read
        // as one continuous band, and the height is the panel's business. The
        // stretch that falls out of the two is the look — the original got it from
        // a pair of mismatched scale factors and a render target that ignored its
        // own aspect ratio.
        ctx.translate(TILE_W / 2, TILE_H / 2)
        ctx.scale((FILL_W * TILE_W) / w, S.capHeight / h)
        ctx.fillStyle = this.cfg.color || DEFAULTS.color
        ctx.textAlign = "center"
        ctx.textBaseline = "alphabetic"
        ctx.fillText(word, 0, h / 2 - descent)
        ctx.setTransform(1, 0, 0, 1, 0, 0)

        this.texture.needsUpdate = true
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            if (this.disposed) return
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
        const span = SPAN * S.zoom
        // Portrait needs a taller field or the bar and the knot lose their ends.
        const visibleHeight = aspect < 1 ? span / aspect : span

        this.camera.aspect = aspect
        this.camera.position.set(0, 0, CAM_DISTANCE)
        this.camera.lookAt(0, 0, 0)
        this.camera.fov =
            2 * Math.atan(visibleHeight / 2 / CAM_DISTANCE) * (180 / Math.PI)
        this.camera.near = Math.max(0.1, CAM_DISTANCE - 40)
        this.camera.far = CAM_DISTANCE + 40
        this.camera.updateProjectionMatrix()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        const S = settingsFor(cfg)

        if (S.shape !== settingsFor(prev).shape) {
            this.geometry.dispose()
            this.geometry = buildGeometry(S.shape)
            this.mesh.geometry = this.geometry
            this.material.defines = definesFor(S.shape)
            this.material.needsUpdate = true
        }

        const u = this.material.uniforms
        u.uRepeat.value.set(S.repeat[0], S.repeat[1])
        u.uDistort.value = S.distort
        u.uFog.value.set(cfg.fill || DEFAULTS.fill)

        // Only a change the plate actually shows is worth a redraw — dragging the
        // Copies slider must not re-rasterise type.
        if (
            cfg.word !== prev.word ||
            cfg.color !== prev.color ||
            cfg.fill !== prev.fill ||
            JSON.stringify(cfg.font) !== JSON.stringify(prev.font)
        ) {
            this.drawPlate()
        }

        this.updateCamera()
    }

    private step() {
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05 // a returning tab must not teleport the type

        const S = settingsFor(this.cfg)
        // Eased both ways: a hard switch snaps the word to a new position mid-glyph.
        const target = this.hovered && S.hoverBoost > 0 ? 1 : 0
        this.grip += (target - this.grip) * (1 - Math.exp(-dt * 4))
        this.time += dt * S.speed * (1 + this.grip * S.hoverBoost)
        this.material.uniforms.uTime.value = this.time

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.geometry.dispose()
        this.material.dispose()
        this.texture.dispose()
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        canvas.removeEventListener("pointerenter", this.onEnter)
        canvas.removeEventListener("pointerleave", this.onLeave)
        canvas.removeEventListener("pointercancel", this.onLeave)
        if (canvas.parentNode === this.container) this.container.removeChild(canvas)
    }
}

interface KineticTypeProps {
    shape?: ShapeName
    word?: string
    font?: FontValue
    color?: string
    fill?: string
    density?: number
    speed?: number
    distort?: number
    sizePercent?: number
    hoverBoost?: number
    style?: React.CSSProperties
}

function __BaseImpl_KineticType(props: KineticTypeProps) {
    const {
        shape = DEFAULTS.shape,
        word = DEFAULTS.word,
        font = { fontFamily: "Impact", fontSize: 60, fontWeight: 900 },
        color = DEFAULTS.color,
        fill = DEFAULTS.fill,
        density = DEFAULTS.density,
        speed = DEFAULTS.speed,
        distort = DEFAULTS.distort,
        sizePercent = DEFAULTS.sizePercent,
        hoverBoost = DEFAULTS.hoverBoost,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<KineticScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        shape,
        word,
        font: font ?? {},
        color,
        fill,
        density,
        speed,
        distort,
        sizePercent,
        hoverBoost,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: KineticScene
        try {
            scene = new KineticScene(container, cfgRef.current)
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
        // The font object is a new identity on every render, so depend on content.
    }, [
        shape,
        word,
        JSON.stringify(font),
        color,
        fill,
        density,
        speed,
        distort,
        sizePercent,
        hoverBoost,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label={`The word ${word} repeating over a moving surface`}
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

KineticType.displayName = "Kinetic Type"

const __presetProps = {
  "shape": "torusKnot",
  "word": "COMPONENT",
  "color": "#FFFFFF",
  "fill": "#000000",
  "density": 12,
  "speed": 10,
  "distort": 8,
  "sizePercent": 102,
  "hoverBoost": 7
};

export default function KineticType(props: Record<string, unknown>) {
  return <__BaseImpl_KineticType {...(__presetProps as Record<string, unknown>)} {...props} />;
}
