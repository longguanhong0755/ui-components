"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Smoke Vortex — turbulence winding into a drain, drawn per pixel.
 *
 * Smoke is not noise. Noise is static that happens to look grainy; smoke is
 * noise that has been dragged through a flow field, so its detail is stretched
 * along the direction the fluid is moving. That stretching is done here by
 * domain warping: the coordinate handed to the noise is first displaced by
 * another sample of the same noise, twice over. Each round makes the streaks
 * longer and more filamentary, which is why two rounds read as smoke where one
 * reads as clouds.
 *
 * The flow itself is a vortex — every point is rotated about the centre by an
 * angle that grows as you approach it, the way it does over a drain. Since the
 * inner ring turns faster than the outer one, any pattern crossing the field is
 * sheared into a spiral without a spiral ever being drawn.
 *
 * Hovering does not deform the field — it drives it harder. The whole clock
 * speeds up while the pointer is over the frame and eases back when it leaves,
 * over about a second in each direction, so the column winds up and runs down
 * like something with mass rather than switching between two speeds.
 */

const DEFAULTS = {
    smoke: "#FFF700",
    deep: "#FFF700",
    ember: "#FFF700",
    detail: 20,
    turbulence: 20,
    swirl: 10,
    density: 4,
    contrast: 20,
    emberAmount: 0,
    speed: 5,
    hoverBoost: 20,
    sizePercent: 100,
}

type Config = {
    smoke: string
    deep: string
    ember: string
    detail: number
    turbulence: number
    swirl: number
    density: number
    contrast: number
    emberAmount: number
    speed: number
    hoverBoost: number
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        // Octaves of noise, as a float the shader fades the last one in with —
        // stepping octaves in whole numbers pops visibly.
        detail: 1.0 + clamp(cfg.detail, 1, 20, DEFAULTS.detail) * 0.25,
        // How far each warp round displaces the coordinate. This is what turns
        // round clouds into drawn-out filaments.
        turbulence: clamp(cfg.turbulence, 0, 20, DEFAULTS.turbulence) * 0.12,
        /*
         * The panel's 1-10 covers what used to be the top half of a 0-20
         * slider: 1 lands where the old 10 was and 10 where the old 20 was.
         * Below that the winding was too slack to read as a vortex at all, so
         * the whole range now sits inside the part that was worth having.
         */
        swirl: 2.8 + (clamp(cfg.swirl, 1, 10, DEFAULTS.swirl) - 1) * 0.3111,
        density: 0.25 + clamp(cfg.density, 1, 10, DEFAULTS.density) * 0.055,
        contrast: 0.6 + clamp(cfg.contrast, 1, 20, DEFAULTS.contrast) * 0.13,
        ember: clamp(cfg.emberAmount, 0, 20, DEFAULTS.emberAmount) * 0.06,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.07,
        // Extra speed while hovered, as a multiple of the resting speed: 0
        // leaves it alone, 20 runs it at four times.
        hoverBoost: clamp(cfg.hoverBoost, 0, 20, DEFAULTS.hoverBoost) * 0.15,
        zoom: 100 / clamp(cfg.sizePercent, 20, 200, 100),
    }
}

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const SMOKE_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec2 uResolution;
    uniform vec3 uSmoke;
    uniform vec3 uDeep;
    uniform vec3 uEmber;
    uniform float uTime;
    uniform float uDetail;
    uniform float uTurbulence;
    uniform float uSwirl;
    uniform float uDensity;
    uniform float uContrast;
    uniform float uEmberAmount;
    uniform float uZoom;

    varying vec2 vUv;

    float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
    }

    /** Value noise with a smoothstep fade, so no cell edges show. */
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    /**
     * Six octaves, each half the amplitude and twice the frequency of the last.
     * The Detail control fades the tail octaves in by weight rather than by
     * count — dropping a whole octave at once is visible as a pop.
     */
    float fbm(vec2 p) {
        float sum = 0.0;
        float amp = 0.5;
        float norm = 0.0;
        for (int i = 0; i < 6; i++) {
            float w = clamp(uDetail - float(i), 0.0, 1.0);
            sum += noise(p) * amp * w;
            norm += amp * w;
            p *= 2.02;
            // Each octave is rotated slightly, which breaks up the grid
            // alignment that otherwise shows as faint plaid.
            p = mat2(0.8, 0.6, -0.6, 0.8) * p;
            amp *= 0.5;
        }
        return sum / max(0.0001, norm);
    }

    void main() {
        vec2 uv = (vUv - 0.5) * uZoom;
        uv.x *= uResolution.x / max(1.0, uResolution.y);

        /*
         * The vortex.
         *
         * Rotation by an angle that grows toward the centre, so the inner rings
         * turn faster than the outer ones. That difference is the whole effect:
         * anything crossing the field gets sheared into a spiral without a
         * spiral being drawn anywhere.
         *
         * Hovering changes nothing here. It only advances the clock faster,
         * which is why the column keeps its exact size and framing whatever the
         * pointer is doing.
         */
        float r = length(uv);
        float a = atan(uv.y, uv.x) + uSwirl / (r + 0.35) - uTime * 0.6;
        vec2 p = vec2(cos(a), sin(a)) * r;

        /*
         * Two rounds of domain warping. The first pulls the noise into blobs,
         * the second draws those blobs out into filaments — which is the
         * difference between cloud and smoke.
         */
        vec2 q = vec2(fbm(p * 1.6 + uTime * 0.15), fbm(p * 1.6 - uTime * 0.11));
        vec2 s = vec2(
            fbm(p * 2.1 + q * uTurbulence * 4.0 + uTime * 0.2),
            fbm(p * 2.1 - q * uTurbulence * 4.0 - uTime * 0.17)
        );
        float f = fbm(p * 2.6 + s * uTurbulence * 4.0);

        // Thinned toward the edge of the frame so the column has a shape rather
        // than filling the rectangle corner to corner.
        float fall = exp(-r * r * 1.1);
        float d = pow(clamp(f * uDensity * 3.2 * fall, 0.0, 1.0), uContrast);

        // Deep in the shadowed folds, pale where it is thin. The warp field
        // itself picks out the folds, so this costs no extra samples.
        vec3 col = mix(uDeep, uSmoke, pow(d, 0.6));

        // Embers glow only in the densest, most sheared parts, near the middle.
        float heat = pow(max(dot(s, s), 0.0), 1.2) * exp(-r * 2.2);
        col += uEmber * heat * uEmberAmount * 6.0;

        float alpha = clamp(d * 1.15, 0.0, 1.0);
        gl_FragColor = vec4(col * alpha, alpha);
    }
`

class SmokeScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    // Eased toward 1 while the pointer is over the frame and back to 0 when it
    // leaves; the boost is scaled by it rather than switched on with it.
    private hover = 0
    private hoverTarget = 0
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

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        // Six octaves of noise per pixel, three times over for the warp: this
        // is fragment-bound, so the ratio is capped below the display's.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
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
            fragmentShader: SMOKE_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uSmoke: { value: new THREE.Color(cfg.smoke) },
                uDeep: { value: new THREE.Color(cfg.deep) },
                uEmber: { value: new THREE.Color(cfg.ember) },
                uTime: { value: 0 },
                uDetail: { value: S.detail },
                uTurbulence: { value: S.turbulence },
                uSwirl: { value: S.swirl },
                uDensity: { value: S.density },
                uContrast: { value: S.contrast },
                uEmberAmount: { value: S.ember },
                uZoom: { value: S.zoom },
            },
            transparent: true,
            depthTest: false,
            depthWrite: false,
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)
        this.bindEvents()
    }

    private bindEvents() {
        const el = this.renderer.domElement
        const enter = () => {
            this.hoverTarget = 1
        }
        const leave = () => {
            this.hoverTarget = 0
        }
        /*
         * enter/leave rather than over/out: the latter pair also fire as the
         * pointer crosses between children, and while this canvas has none
         * today, a boost that flickers on an unrelated DOM change is a hard
         * thing to track down later.
         */
        el.addEventListener("pointerenter", enter)
        el.addEventListener("pointerleave", leave)
        // A pointer lifted or cancelled outside the frame never sends a leave.
        el.addEventListener("pointercancel", leave)
        this.unbind = () => {
            el.removeEventListener("pointerenter", enter)
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
        this.material.uniforms.uResolution.value.set(width, height)
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.material.uniforms
        u.uSmoke.value.set(cfg.smoke || "#ffffff")
        u.uDeep.value.set(cfg.deep || "#000000")
        u.uEmber.value.set(cfg.ember || "#ffffff")
        u.uDetail.value = S.detail
        u.uTurbulence.value = S.turbulence
        u.uSwirl.value = S.swirl
        u.uDensity.value = S.density
        u.uContrast.value = S.contrast
        u.uEmberAmount.value = S.ember
        u.uZoom.value = S.zoom
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)

        /*
         * The boost eases in and out over about a second.
         *
         * Fluid has mass: switching the clock rate the instant the pointer
         * arrives reads as a jump cut, and the wind-up is most of what sells the
         * hover as the column responding rather than as two animations being
         * swapped. Framed per second, so it takes the same time on a 30Hz
         * display as on a 120Hz one.
         */
        this.hover += (this.hoverTarget - this.hover) * (1 - Math.exp(-dt * 3.5))
        // Only the clock speeds up — nothing about the field's shape or scale
        // depends on this.
        this.time += dt * S.speed * (1 + S.hoverBoost * this.hover)

        this.material.uniforms.uTime.value = this.time

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

export interface SmokeVortexProps extends Partial<Config> {
    /** The colour of the thin, lit parts. */
    smoke?: string
    /** Deep in the folds. */
    deep?: string
    ember?: string
    /** How hard the field winds toward the centre. 1-10. */
    swirl?: number
    /** 0 leaves round clouds; high draws them into filaments. 0-20. */
    turbulence?: number
    /** How fine the smallest wisps get. 1-20. */
    detail?: number
    /** 1-10. */
    density?: number
    /** High keeps only the thickest smoke and clears the rest. 1-20. */
    contrast?: number
    /** Heat showing through the densest folds. 0-20. */
    emberAmount?: number
    /** 0-20. */
    speed?: number
    /** Extra speed while hovered. 0 is off; 20 is four times. */
    hoverBoost?: number
    /** Percent. 20-200. */
    sizePercent?: number
    style?: React.CSSProperties
}

type Props = SmokeVortexProps

function __BaseImpl_SmokeVortex(props: Props) {
    const {
        smoke = DEFAULTS.smoke,
        deep = DEFAULTS.deep,
        ember = DEFAULTS.ember,
        detail = DEFAULTS.detail,
        turbulence = DEFAULTS.turbulence,
        swirl = DEFAULTS.swirl,
        density = DEFAULTS.density,
        contrast = DEFAULTS.contrast,
        emberAmount = DEFAULTS.emberAmount,
        speed = DEFAULTS.speed,
        hoverBoost = DEFAULTS.hoverBoost,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<SmokeScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        smoke,
        deep,
        ember,
        detail,
        turbulence,
        swirl,
        density,
        contrast,
        emberAmount,
        speed,
        hoverBoost,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: SmokeScene
        try {
            scene = new SmokeScene(container, cfgRef.current)
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
        smoke,
        deep,
        ember,
        detail,
        turbulence,
        swirl,
        density,
        contrast,
        emberAmount,
        speed,
        hoverBoost,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Smoke vortex"
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

SmokeVortex.displayName = "Smoke Vortex"

const __presetProps = {
  "smoke": "#FFF700",
  "deep": "#FFF700",
  "ember": "#FFF700",
  "swirl": 10,
  "turbulence": 20,
  "detail": 20,
  "density": 4,
  "contrast": 20,
  "emberAmount": 0,
  "speed": 5,
  "hoverBoost": 20,
  "sizePercent": 100
};

export default function SmokeVortex(props: Record<string, unknown>) {
  return <__BaseImpl_SmokeVortex {...(__presetProps as Record<string, unknown>)} {...props} />;
}
