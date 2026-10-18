"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Wind Pyre — a wall of flame that leans in the wind and catches on hover.
 *
 * The fire is a five-octave noise field warped by a coarser copy of itself,
 * with the sample coordinate scrolled *down* over time. That inversion is the
 * climb: a feature holding still in noise space has to be drawn further up the
 * screen every frame to keep matching. Advancing the coordinate upward instead
 * makes the flame pour down a drain.
 *
 * The field is flat, and it stays flat. What makes it read as a ball is the
 * shading: z is recovered from the disc radius, giving a real sphere normal,
 * and every light below is a fixed direction in view space rather than
 * something painted on: one broad lift from the upper left, and two darkening
 * terms — the limb turning away at the rim, the terminator opposite the key.
 *
 * There is no drag now — yaw still runs free on an idle Spin, but the only
 * thing a pointer does is cross the frame. Hovering ramps a single value up
 * over a few frames and back down on the way out, and that value scales
 * Exposure and the glow directly: the fire catches, rather than a light
 * switching on.
 *
 * Wind is an actual spring, not a blend: a slow two-tone sine stands in for a
 * gust, and the crown chases it with mass and damping rather than snapping
 * straight there, so it leans, overshoots slightly, and settles. The bend is
 * weighted by height squared, so the base stays rooted and the sway grows
 * toward the tip.
 */

const DEFAULTS = {
    soot: "#0C0604",
    ember: "#A82208",
    flame: "#FF7A1E",
    spark: "#FFE86B",
    highlight: "#929292",
    rise: 20,
    turbulence: 20,
    detail: 20,
    exposure: 10,
    shade: 5,
    edgeSoftness: 1,
    glowOn: true,
    glow: {
        defaultValue: {"color":"#FF7A1E","strength":20}, color: "#FF7A1E", strength: 6 },
    speed: 11,
    spin: 0,
    hoverIntensity: 40,
    wind: 100,
    sizePercent: 47,
}

type GlowConfig = { color: string; strength: number }

type Config = {
    soot: string
    ember: string
    flame: string
    spark: string
    highlight: string
    rise: number
    turbulence: number
    detail: number
    exposure: number
    shade: number
    edgeSoftness: number
    glowOn: boolean
    glow: GlowConfig
    speed: number
    spin: number
    hoverIntensity: number
    wind: number
    sizePercent: number
}

// How much of the frame the flame's noise field spans at Size 100%. Taken
// from the reference ball effect, which sat at 0.72 and left enough headroom
// for the plume to breathe within the frame.
const BASE_RADIUS = 0.72

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    // An instance placed before the glow group existed has no object at all.
    const glow = cfg.glow || DEFAULTS.glow
    return {
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.09,
        // How fast the sample coordinate walks down the field. Separate from
        // Speed because the churn of the flame and the rate it climbs are two
        // different things — fast churn with a slow climb reads as a furnace,
        // the reverse as a torch being carried past.
        rise: clamp(cfg.rise, 0, 20, DEFAULTS.rise) * 0.1,
        // Displacement of the warp round. 0 leaves round soft blobs; the top of
        // the range tears them into the licking tongues that read as flame.
        turbulence: clamp(cfg.turbulence, 0, 20, DEFAULTS.turbulence) * 0.1,
        // Fed to the shader as a float so the last octave fades in by weight —
        // stepping octaves in whole numbers pops visibly. Tops out at 5.
        detail: 1.0 + clamp(cfg.detail, 1, 20, DEFAULTS.detail) * 0.2,
        exposure: 0.3 + clamp(cfg.exposure, 1, 20, DEFAULTS.exposure) * 0.1,
        shade: clamp(cfg.shade, 0, 20, DEFAULTS.shade) * 0.075,
        // Kept small: the flame's own falloff already softens the top of the
        // ball, and a wide edge on the lit side turns the sphere into a smudge.
        edgeSoftness:
            0.01 + clamp(cfg.edgeSoftness, 1, 20, DEFAULTS.edgeSoftness) * 0.009,
        glowStrength: cfg.glowOn
            ? clamp(glow.strength, 0, 20, DEFAULTS.glow.strength) * 0.05
            : 0,
        glowColor: glow.color || DEFAULTS.glow.color,
        // Noise units per second of idle turn.
        spin: clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.06,
        // How hard the flame flares up on hover, as a fraction of its own
        // Exposure and glow — 0 makes hovering a no-op, 100 roughly doubles both.
        hoverIntensity:
            clamp(cfg.hoverIntensity, 0, 100, DEFAULTS.hoverIntensity) * 0.01,
        // Amplitude fed to the wind spring in step(), not used directly here —
        // 0 leaves the flame rooted straight up.
        wind: clamp(cfg.wind, 0, 100, DEFAULTS.wind) * 0.01,
        radius: BASE_RADIUS * clamp(cfg.sizePercent, 20, 200, 100) * 0.01,
    }
}

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const PYRE_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec2 uResolution;
    uniform vec3 uSoot;
    uniform vec3 uEmber;
    uniform vec3 uFlame;
    uniform vec3 uSpark;
    uniform vec3 uHighlight;
    uniform vec3 uGlowColor;
    uniform float uTime;
    uniform float uRise;
    uniform float uTurbulence;
    uniform float uDetail;
    uniform float uExposure;
    uniform float uShade;
    uniform float uEdgeSoftness;
    uniform float uGlowStrength;
    uniform float uRadius;
    uniform float uYaw;
    uniform float uHover;
    uniform float uHoverIntensity;
    uniform float uLean;

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
     * Five octaves, each half the amplitude and twice the frequency of the one
     * before. "oct" fades the tail in by weight rather than by count — dropping
     * a whole octave at once is visible as a pop.
     *
     * The zero-weight octaves are branched around rather than multiplied out.
     * "oct" is the same for every pixel in a given call, so the branch is
     * uniform across the wavefront and costs nothing, where letting the noise
     * run and scaling it by zero would be the most expensive no-op in the file:
     * the warp rounds only ask for three octaves and would pay for five.
     */
    float fbm(vec2 p, float oct) {
        float sum = 0.0;
        float amp = 0.5;
        float norm = 0.0;
        for (int i = 0; i < 5; i++) {
            float w = clamp(oct - float(i), 0.0, 1.0);
            if (w > 0.0) {
                sum += noise(p) * amp * w;
                norm += amp * w;
            }
            p *= 2.03;
            // Rotated between octaves, which breaks up the lattice alignment
            // that otherwise shows as faint plaid across the body.
            p = mat2(0.8, 0.6, -0.6, 0.8) * p;
            amp *= 0.5;
        }
        return sum / max(0.0001, norm);
    }

    /**
     * Four stops with overlapping windows. Four rather than two because most of
     * a flame's life is spent in the middle of the range, and a straight
     * dark-to-bright blend collapses it into one muddy orange. The overlap
     * matters too: butted ranges leave a seam where one blend ends and the next
     * begins, which shows up as a contour line drawn across the fire.
     */
    vec3 ramp(float t) {
        vec3 c = mix(uSoot, uEmber, smoothstep(0.02, 0.40, t));
        c = mix(c, uFlame, smoothstep(0.32, 0.72, t));
        return mix(c, uSpark, smoothstep(0.64, 1.0, t));
    }

    void main() {
        vec2 screen = vUv - 0.5;
        // Corrected on the wider axis, so noise features stay round instead of
        // stretching into an egg as the frame goes wide.
        screen.x *= uResolution.x / max(1.0, uResolution.y);
        // Worked in units of Size from here on: every constant below is then
        // independent of Size.
        vec2 uv = screen / max(0.0001, uRadius);

        /*
         * The plume.
         *
         * Both the warp and the field itself walk downward through noise space.
         * Sampling at p.y - t means a feature holding still in the field has to
         * be drawn further up the screen every frame, which is the climb. The
         * warp is a coarser copy on a faster clock, so it drags the fine detail
         * into tongues instead of merely wobbling it.
         *
         * Yaw is now driven only by the idle Spin turn, so this offset is
         * always horizontal — there is no pointer dragging it vertically.
         */
        // Height fraction, 0 at the bottom of the frame and 1 at the top —
        // moved up here so Wind can bend the sample point before the noise is
        // read from it, not just after.
        float h = uv.y * 0.5 + 0.5;
        // The base stays rooted and the crown leans with the wind: h*h keeps
        // the bend small low down and grows it toward the top, the way a real
        // flame roots at the wick and whips at the tip.
        vec2 p = uv * 1.55 - vec2(uYaw + uLean * h * h, 0.0);
        vec2 drift = vec2(0.0, uTime * uRise);
        float wOct = min(uDetail, 3.0);
        vec2 warp = vec2(
            fbm(p * 2.6 - drift * 1.35, wOct),
            fbm(p * 2.6 - drift * 1.15 + vec2(5.2, 1.3), wOct)
        );
        float n = fbm(p + warp * uTurbulence * 2.2 - drift, uDetail);

        /*
         * Weighted by height. The fuel is at the bottom, so the base burns near
         * saturation and the crown is starved — that gradient is what makes the
         * same noise field read as fire rather than as fog in a jar. No pinch
         * on x now: the flame is a wall filling the frame, not a column held
         * inside a boundary.
         */
        // Edge now softens this fade instead of drawing a screen-edge box —
        // a wider window keeps the crown legible instead of clipping it.
        float crownFade = smoothstep(-0.15, 1.05 + uEdgeSoftness * 2.0, h);
        float heat = n * mix(1.5, 0.12, crownFade);
        // The flame flares up on hover: Exposure ramps with it, so hovering
        // reads as the fire catching rather than as a lighting change.
        heat = clamp(heat * uExposure * (1.0 + uHover * uHoverIntensity), 0.0, 1.0);

        vec3 col = ramp(heat);
        // Highlight and Glow no longer catch a sphere normal — there isn't one
        // now — so they read straight off the flame: a soft light across the
        // top of the frame, and a bloom on the hottest pixels.
        col += uHighlight * heat * smoothstep(0.4, -0.6, uv.y) * 0.25;
        col += uGlowColor * uGlowStrength * heat * heat * 0.06 * (1.0 + uHover * uHoverIntensity);

        // Shade is now a plain global darken — the screen-edge vignette this
        // used to drive was a visible rectangle boxing in the flame, which is
        // exactly the clip the frame is meant to be free of.
        col *= mix(1.0, 0.4, clamp(uShade, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
    }
`

class PyreScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private time = 0
    private yaw = 0
    // Target flips on pointer enter/leave; the eased value is what actually
    // reaches the shader, so a quick flick across the frame doesn't flash it.
    private hoverTarget = 0
    private hover = 0
    // Wind sway: a real-time clock feeding the gust function, and the
    // spring's position/velocity pair.
    private windTime = 0
    private lean = 0
    private leanVel = 0

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
        // Five octaves of noise, three times over for the warp: this is
        // fragment-bound, so the ratio is capped below the display's.
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
            fragmentShader: PYRE_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uSoot: { value: new THREE.Color(cfg.soot) },
                uEmber: { value: new THREE.Color(cfg.ember) },
                uFlame: { value: new THREE.Color(cfg.flame) },
                uSpark: { value: new THREE.Color(cfg.spark) },
                uHighlight: { value: new THREE.Color(cfg.highlight) },
                uGlowColor: { value: new THREE.Color(S.glowColor) },
                uTime: { value: 0 },
                uRise: { value: S.rise },
                uTurbulence: { value: S.turbulence },
                uDetail: { value: S.detail },
                uExposure: { value: S.exposure },
                uShade: { value: S.shade },
                uEdgeSoftness: { value: S.edgeSoftness },
                uGlowStrength: { value: S.glowStrength },
                uRadius: { value: S.radius },
                uYaw: { value: 0 },
                uHover: { value: 0 },
                uHoverIntensity: { value: S.hoverIntensity },
                uLean: { value: 0 },
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

        el.addEventListener("pointerenter", enter)
        el.addEventListener("pointerleave", leave)

        this.unbind = () => {
            el.removeEventListener("pointerenter", enter)
            el.removeEventListener("pointerleave", leave)
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
        // Nothing here owns a buffer — the quad never changes — so every
        // control is a uniform write and dragging a colour reallocates nothing.
        u.uSoot.value.set(cfg.soot || DEFAULTS.soot)
        u.uEmber.value.set(cfg.ember || DEFAULTS.ember)
        u.uFlame.value.set(cfg.flame || DEFAULTS.flame)
        u.uSpark.value.set(cfg.spark || DEFAULTS.spark)
        u.uHighlight.value.set(cfg.highlight || DEFAULTS.highlight)
        u.uGlowColor.value.set(S.glowColor)
        u.uRise.value = S.rise
        u.uTurbulence.value = S.turbulence
        u.uDetail.value = S.detail
        u.uExposure.value = S.exposure
        u.uShade.value = S.shade
        u.uEdgeSoftness.value = S.edgeSoftness
        u.uGlowStrength.value = S.glowStrength
        u.uRadius.value = S.radius
        u.uHoverIntensity.value = S.hoverIntensity
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A tab returning after a minute would otherwise advance the field by a
        // minute in one frame, and the flame jumps to an unrelated shape.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.speed
        // Yaw runs free: the column turning about its own axis has no end.
        this.yaw += S.spin * dt

        // Eased toward the hover target rather than snapped, and faster on the
        // way in than the way out, so the flare catches quickly and settles
        // slowly instead of cutting in and out.
        const hoverRate = this.hoverTarget > this.hover ? 6 : 3
        this.hover += (this.hoverTarget - this.hover) * Math.min(1, dt * hoverRate)

        // Wind: a mass-spring chasing a slow, irregular gust target instead of
        // blending straight to it, so the crown leans, overshoots a touch, and
        // settles back — the difference between physics and a tween. Runs on
        // real time rather than the Speed-scaled fire clock, so Wind and Speed
        // stay independent.
        this.windTime += dt
        const gustAmplitude = S.wind * 0.4
        const gustTarget =
            (Math.sin(this.windTime * 0.9) * 0.6 +
                Math.sin(this.windTime * 0.37 + 1.7) * 0.4) *
            gustAmplitude
        const springAccel = (gustTarget - this.lean) * 26 - this.leanVel * 6.5
        this.leanVel += springAccel * dt
        this.lean += this.leanVel * dt

        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uYaw.value = this.yaw
        u.uHover.value = this.hover
        u.uLean.value = this.lean
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

export interface WindPyreProps {
    soot?: string
    ember?: string
    flame?: string
    spark?: string
    highlight?: string
    rise?: number
    turbulence?: number
    detail?: number
    exposure?: number
    shade?: number
    edgeSoftness?: number
    glowOn?: boolean
    glow?: GlowConfig
    speed?: number
    spin?: number
    hoverIntensity?: number
    wind?: number
    sizePercent?: number
    style?: React.CSSProperties
}

export default function WindPyre(props: WindPyreProps) {
    const {
        soot = DEFAULTS.soot,
        ember = DEFAULTS.ember,
        flame = DEFAULTS.flame,
        spark = DEFAULTS.spark,
        highlight = DEFAULTS.highlight,
        rise = DEFAULTS.rise,
        turbulence = DEFAULTS.turbulence,
        detail = DEFAULTS.detail,
        exposure = DEFAULTS.exposure,
        shade = DEFAULTS.shade,
        edgeSoftness = DEFAULTS.edgeSoftness,
        glowOn = DEFAULTS.glowOn,
        glow = { color: "#FF7A1E", strength: 6 },
        speed = DEFAULTS.speed,
        spin = DEFAULTS.spin,
        hoverIntensity = DEFAULTS.hoverIntensity,
        wind = DEFAULTS.wind,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<PyreScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        soot,
        ember,
        flame,
        spark,
        highlight,
        rise,
        turbulence,
        detail,
        exposure,
        shade,
        edgeSoftness,
        glowOn,
        glow,
        speed,
        spin,
        hoverIntensity,
        wind,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: PyreScene
        try {
            scene = new PyreScene(container, cfgRef.current)
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
        soot,
        ember,
        flame,
        spark,
        highlight,
        rise,
        turbulence,
        detail,
        exposure,
        shade,
        edgeSoftness,
        glowOn,
        // The group is a fresh object on every render, so its contents are the
        // dependency — the identity of the object itself says nothing.
        glow?.color,
        glow?.strength,
        speed,
        spin,
        hoverIntensity,
        wind,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A column of flame filling the frame"
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

WindPyre.displayName = "Wind Pyre"
