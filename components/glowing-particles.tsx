"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Glowing Particles — a burst of light thrown out of a hot core.
 *
 * The points are not scattered through the volume: they sit on rays, several to
 * a ray, each staggered a little behind the last, so a group reads as a streak
 * rather than as noise. The rays decelerate, which piles them up where they
 * finish — the circular rim is not a primitive, it is several thousand streak
 * endpoints arriving on the same shell.
 *
 * All travel happens in the vertex shader — the position attribute is a unit
 * direction and radius comes from time — so tens of thousands of points cost no
 * per-frame CPU work. The scene is then rendered off-screen and run through a
 * two-level separable gaussian, composited back additively. Point sprites
 * cannot bloom on their own: their light stops dead at the sprite edge, and the
 * spill past it is most of what makes light look like light.
 */

const PERSPECTIVE = 0.15

/** How far the burst throws. Fixed — the panel used to own this. */
const REACH = 2.7

const DEFAULTS = {
    color: "#CFE6FF",
    hot: "#FFFFFF",
    density: 16,
    streak: 8,
    speed: 20,
    size: 4,
    bloom: 0,
    rim: 20,
    haze: 20,
    spin: 20,
    direction: "right",
    sizePercent: 90,
}

type Config = {
    color: string
    hot: string
    density: number
    streak: number
    speed: number
    size: number
    bloom: number
    rim: number
    haze: number
    spin: number
    direction: "right" | "left"
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    const density = clamp(cfg.density, 1, 20, DEFAULTS.density)
    const streak = clamp(cfg.streak, 1, 20, DEFAULTS.streak)
    return {
        // Squared, because doubling the ray count barely reads at the sparse end
        // and the top of the slider is where it wants to be dense.
        rays: Math.round(50 + density * density * 7),
        // Points per ray. More of them is a longer, more continuous streak
        // rather than more particles somewhere else.
        perRay: Math.round(1 + streak * 1.7),
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.05,
        size: 1.2 + clamp(cfg.size, 1, 20, DEFAULTS.size) * 1.4,
        bloom: clamp(cfg.bloom, 0, 20, DEFAULTS.bloom) * 0.075,
        // 1 puts every ray on the same shell — one clean circle. Lower lets the
        // lengths scatter and the edge goes ragged.
        rim: clamp(cfg.rim, 0, 20, DEFAULTS.rim) / 20,
        haze: clamp(cfg.haze, 0, 20, DEFAULTS.haze) * 0.075,
        spin: clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.05,
        heading: cfg.direction === "left" ? -1 : 1,
    }
}

/**
 * Points grouped onto shared directions.
 *
 * Ray directions come off the Fibonacci sphere: evenly spread, with none of the
 * clumping at the poles that naive lat/long sampling gives. Then jittered,
 * because a perfectly even fan reads as a manufactured object.
 */
function buildCloud(rays: number, perRay: number): THREE.BufferGeometry {
    const count = rays * perRay
    const dir = new Float32Array(count * 3)
    const offset = new Float32Array(count)
    const seed = new Float32Array(count)

    const golden = Math.PI * (3 - Math.sqrt(5))
    let i = 0

    for (let r = 0; r < rays; r++) {
        const y = 1 - (r / Math.max(1, rays - 1)) * 2
        const ring = Math.sqrt(Math.max(0, 1 - y * y))
        const theta = golden * r
        let dx = Math.cos(theta) * ring
        let dy = y
        let dz = Math.sin(theta) * ring

        // Jitter, then renormalise, so every ray still leaves the core at the
        // same speed — otherwise the shorter vectors lag and the rim dents.
        dx += (Math.random() - 0.5) * 0.1
        dy += (Math.random() - 0.5) * 0.1
        dz += (Math.random() - 0.5) * 0.1
        const len = Math.hypot(dx, dy, dz) || 1
        dx /= len
        dy /= len
        dz /= len

        // How far this particular ray gets. The Rim control pulls all of these
        // toward 1 at render time.
        const rayLife = 0.6 + Math.random() * 0.4
        const phase = Math.random()

        for (let p = 0; p < perRay; p++) {
            dir[i * 3] = dx
            dir[i * 3 + 1] = dy
            dir[i * 3 + 2] = dz
            // The tail sits a fraction of a cycle behind the head; that offset
            // is the whole of what turns a group of points into a streak.
            offset[i] = phase + (p / perRay) * 0.2
            seed[i] = rayLife
            i++
        }
    }

    const geometry = new THREE.BufferGeometry()
    // Named `position` so three still builds a bounding sphere; the shader
    // treats it as a direction and derives the real position from time.
    geometry.setAttribute("position", new THREE.BufferAttribute(dir, 3))
    geometry.setAttribute("aOffset", new THREE.BufferAttribute(offset, 1))
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1))
    return geometry
}

const PARTICLE_VERTEX = /* glsl */ `
    attribute float aOffset;
    attribute float aSeed;

    uniform float uTime;
    uniform float uSpeed;
    uniform float uRadius;
    uniform float uSize;
    uniform float uRim;
    uniform float uPixelRatio;

    varying float vLife;
    varying float vBright;

    void main() {
        // Each trail runs its own clock, so the cloud never pulses in unison.
        float t = fract(aOffset + uTime * uSpeed * (0.65 + aSeed * 0.7));

        /*
         * Rays decelerate: 1 - (1-t)^3 covers most of the distance early and
         * then crawls, so points bunch where they finish. That bunching draws
         * the rim, and uRim pulls the per-ray lengths together so they all
         * arrive at the same shell.
         */
        float life = mix(aSeed, 1.0, uRim);
        float r = uRadius * life * (1.0 - pow(1.0 - t, 3.0));

        vec4 mv = modelViewMatrix * vec4(position * r, 1.0);
        gl_Position = projectionMatrix * mv;

        float shrink = 1.0 - t * 0.45;
        gl_PointSize =
            uSize * shrink * uPixelRatio * (10.0 / max(0.001, -mv.z));

        float birth = smoothstep(0.0, 0.05, t);
        // Held almost to the shell and then cut, which is what keeps the rim an
        // edge rather than a fade.
        float death = 1.0 - smoothstep(0.82, 1.0, t);
        // Sparkle, fast enough to read as scintillation rather than a throb.
        float flick = 0.5 + 0.5 * sin(uTime * 9.0 + aSeed * 43.0 + aOffset * 61.0);
        vBright = birth * death * flick;
        vLife = t;
    }
`

const PARTICLE_FRAGMENT = /* glsl */ `
    uniform vec3 uColor;
    uniform vec3 uHot;

    varying float vLife;
    varying float vBright;

    void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float fall = 1.0 - d;

        // A tight spike with a little bloom around it: the spike is the spark
        // and the loose term is what keeps neighbouring points reading as one
        // haze rather than as separate dots.
        float shape = pow(fall, 5.0) + pow(fall, 1.6) * 0.3;

        // Light leaves the core white and takes on colour as it travels.
        vec3 col = mix(uHot, uColor, smoothstep(0.0, 0.55, vLife));
        float a = shape * vBright;
        // Premultiplied, against an additive blend: brightness carries alpha, so
        // there is no sprite edge to see.
        gl_FragColor = vec4(col * a, a);
    }
`

const HAZE_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const HAZE_FRAGMENT = /* glsl */ `
    uniform vec3 uColor;
    uniform float uHaze;

    varying vec2 vUv;

    void main() {
        float d = length(vUv - 0.5) * 2.0;
        if (d > 1.0) discard;
        // A wide soft falloff for the burst to sit in, so the cloud is not
        // floating in a hole. Nothing tight here — the core is made of
        // overlapping particles and their bloom, not of a painted disc.
        float haze = pow(1.0 - d, 1.5);
        float a = clamp(haze * uHaze, 0.0, 1.0);
        gl_FragColor = vec4(uColor * a, a);
    }
`

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        // Already in clip space; no camera involved.
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

/**
 * One axis of a separable gaussian, five taps at linear-sampled offsets.
 *
 * Two of these passes cost ten samples where the equivalent 2D kernel costs
 * eighty-one, and the result is identical because a gaussian is separable.
 */
const BLUR_FRAGMENT = /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uStep;
    varying vec2 vUv;

    void main() {
        vec4 sum = texture2D(tDiffuse, vUv) * 0.227027;
        sum += texture2D(tDiffuse, vUv + uStep * 1.3846) * 0.3162162;
        sum += texture2D(tDiffuse, vUv - uStep * 1.3846) * 0.3162162;
        sum += texture2D(tDiffuse, vUv + uStep * 3.2307) * 0.0702702;
        sum += texture2D(tDiffuse, vUv - uStep * 3.2307) * 0.0702702;
        gl_FragColor = sum;
    }
`

const COMPOSITE_FRAGMENT = /* glsl */ `
    uniform sampler2D tBase;
    uniform sampler2D tNear;
    uniform sampler2D tWide;
    uniform float uBloom;
    varying vec2 vUv;

    void main() {
        vec4 base = texture2D(tBase, vUv);
        // Two radii: the near one is the halation right around each spark, the
        // wide one the glow over the whole burst. A single radius can be one or
        // the other and never both.
        vec4 glow = texture2D(tNear, vUv) * 0.85 + texture2D(tWide, vUv) * 1.15;
        vec4 col = base + glow * uBloom;
        gl_FragColor = vec4(col.rgb, clamp(col.a, 0.0, 1.0));
    }
`

class BurstScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)
    private group = new THREE.Group()

    private geometry: THREE.BufferGeometry
    private material: THREE.ShaderMaterial
    private points: THREE.Points

    private hazeGeometry = new THREE.PlaneGeometry(1, 1)
    private hazeMaterial: THREE.ShaderMaterial
    private haze: THREE.Mesh

    // Post chain: the scene lands in rtBase, then two ping-ponged blur levels.
    private rtBase: THREE.WebGLRenderTarget | null = null
    private rtHalfA: THREE.WebGLRenderTarget | null = null
    private rtHalfB: THREE.WebGLRenderTarget | null = null
    private rtQuarterA: THREE.WebGLRenderTarget | null = null
    private rtQuarterB: THREE.WebGLRenderTarget | null = null

    private quadScene = new THREE.Scene()
    private quadCamera = new THREE.Camera()
    private quadGeometry = new THREE.PlaneGeometry(2, 2)
    private quad: THREE.Mesh
    private blurMaterial: THREE.ShaderMaterial
    private compositeMaterial: THREE.ShaderMaterial

    private time = 0
    private spinAngle = 0
    private width = 0
    private height = 0
    private dpr = 1
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            alpha: true,
            premultipliedAlpha: true,
        })
        this.dpr = Math.min(window.devicePixelRatio || 1, 2)
        this.renderer.setPixelRatio(this.dpr)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setClearColor(0x000000, 0)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: PARTICLE_VERTEX,
            fragmentShader: PARTICLE_FRAGMENT,
            uniforms: {
                uTime: { value: 0 },
                uSpeed: { value: S.speed },
                uRadius: { value: REACH },
                uSize: { value: S.size },
                uRim: { value: S.rim },
                uPixelRatio: { value: this.dpr },
                uColor: { value: new THREE.Color(cfg.color) },
                uHot: { value: new THREE.Color(cfg.hot) },
            },
            transparent: true,
            // Light adds up. Overlapping points have to compound into the
            // blown-out core rather than one occluding the next.
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
        })

        this.geometry = buildCloud(S.rays, S.perRay)
        this.points = new THREE.Points(this.geometry, this.material)
        // The shader moves everything, so three's culling maths cannot know
        // where the points really are.
        this.points.frustumCulled = false
        this.group.add(this.points)

        this.hazeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(cfg.color) },
                uHaze: { value: S.haze },
            },
            vertexShader: HAZE_VERTEX,
            fragmentShader: HAZE_FRAGMENT,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
        })
        this.haze = new THREE.Mesh(this.hazeGeometry, this.hazeMaterial)

        // Outside the spinning group: it is a billboard, and a radial glow
        // turned edge-on disappears.
        this.scene.add(this.haze)
        this.scene.add(this.group)
        this.applyScales()

        this.blurMaterial = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: BLUR_FRAGMENT,
            uniforms: {
                tDiffuse: { value: null },
                uStep: { value: new THREE.Vector2() },
            },
            depthTest: false,
            depthWrite: false,
        })

        this.compositeMaterial = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: COMPOSITE_FRAGMENT,
            uniforms: {
                tBase: { value: null },
                tNear: { value: null },
                tWide: { value: null },
                uBloom: { value: S.bloom },
            },
            depthTest: false,
            depthWrite: false,
            transparent: true,
            // Everything upstream is premultiplied, so the canvas draw is a
            // straight src-over on premultiplied colour.
            blending: THREE.CustomBlending,
            blendSrc: THREE.OneFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
        })

        this.quad = new THREE.Mesh(this.quadGeometry, this.blurMaterial)
        this.quad.frustumCulled = false
        this.quadScene.add(this.quad)
    }

    private applyScales() {
        // The haze reaches past the particles, so the burst has something to sit
        // in rather than a hole around it.
        this.haze.scale.setScalar(REACH * 2.6)
    }

    private makeTargets(w: number, h: number) {
        this.disposeTargets()
        // Half float where it is available: bloom sums many bright samples, and
        // an 8-bit buffer clips them to white before the blur ever sees them.
        const type = this.renderer.capabilities.isWebGL2
            ? THREE.HalfFloatType
            : THREE.UnsignedByteType
        const opts = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type,
            depthBuffer: false,
            stencilBuffer: false,
        }
        const half = (n: number) => Math.max(1, Math.floor(n / 2))
        const quarter = (n: number) => Math.max(1, Math.floor(n / 4))
        this.rtBase = new THREE.WebGLRenderTarget(w, h, opts)
        // Blurring at half and quarter resolution is most of why this is cheap,
        // and costs nothing visible — the output is a wide gaussian either way.
        this.rtHalfA = new THREE.WebGLRenderTarget(half(w), half(h), opts)
        this.rtHalfB = new THREE.WebGLRenderTarget(half(w), half(h), opts)
        this.rtQuarterA = new THREE.WebGLRenderTarget(
            quarter(w),
            quarter(h),
            opts
        )
        this.rtQuarterB = new THREE.WebGLRenderTarget(
            quarter(w),
            quarter(h),
            opts
        )
    }

    private disposeTargets() {
        for (const rt of [
            this.rtBase,
            this.rtHalfA,
            this.rtHalfB,
            this.rtQuarterA,
            this.rtQuarterB,
        ]) {
            rt?.dispose()
        }
        this.rtBase = null
        this.rtHalfA = null
        this.rtHalfB = null
        this.rtQuarterA = null
        this.rtQuarterB = null
    }

    private blurPass(
        source: THREE.Texture,
        target: THREE.WebGLRenderTarget,
        dx: number,
        dy: number
    ) {
        this.blurMaterial.uniforms.tDiffuse.value = source
        this.blurMaterial.uniforms.uStep.value.set(
            dx / target.width,
            dy / target.height
        )
        this.quad.material = this.blurMaterial
        this.renderer.setRenderTarget(target)
        this.renderer.clear()
        this.renderer.render(this.quadScene, this.quadCamera)
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
        this.makeTargets(
            Math.max(1, Math.floor(width * this.dpr)),
            Math.max(1, Math.floor(height * this.dpr))
        )
        this.updateCamera()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.material.uniforms

        u.uSpeed.value = S.speed
        u.uSize.value = S.size
        u.uRim.value = S.rim
        u.uColor.value.set(cfg.color || "#ffffff")
        u.uHot.value.set(cfg.hot || "#ffffff")

        this.hazeMaterial.uniforms.uColor.value.set(cfg.color || "#ffffff")
        this.hazeMaterial.uniforms.uHaze.value = S.haze
        this.compositeMaterial.uniforms.uBloom.value = S.bloom

        // Only the counts own the buffers; everything else is a uniform.
        if (cfg.density !== prev.density || cfg.streak !== prev.streak) {
            const next = buildCloud(S.rays, S.perRay)
            this.geometry.dispose()
            this.geometry = next
            this.points.geometry = next
        }
        this.applyScales()
        this.updateCamera()
    }

    private updateCamera() {
        const w = Math.max(1, this.width)
        const h = Math.max(1, this.height)
        const aspect = w / h
        const distance = 1 / PERSPECTIVE
        const sizePct = clamp(this.cfg.sizePercent, 20, 200, 90)
        // Framed on the haze rather than on the particles, so the glow is not
        // clipped square at the edge of the canvas.
        const span = 7.4 * (100 / sizePct)
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
        this.time += dt
        this.spinAngle += S.spin * S.heading * dt

        this.material.uniforms.uTime.value = this.time
        // Turned on two axes at once, so no ray ever traces the same path twice
        // and the burst never settles into a readable pattern.
        this.group.rotation.y = this.spinAngle
        this.group.rotation.x = Math.sin(this.spinAngle * 0.6) * 0.35

        const base = this.rtBase
        const hA = this.rtHalfA
        const hB = this.rtHalfB
        const qA = this.rtQuarterA
        const qB = this.rtQuarterB
        if (!base || !hA || !hB || !qA || !qB) {
            this.renderer.setRenderTarget(null)
            this.renderer.render(this.scene, this.camera)
            return
        }

        this.renderer.setRenderTarget(base)
        this.renderer.clear()
        this.renderer.render(this.scene, this.camera)

        // Near halation, then the same buffer blurred again at quarter res for
        // the wide glow. Chaining the second level off the first is what gets a
        // very wide radius out of a five-tap kernel.
        this.blurPass(base.texture, hA, 1, 0)
        this.blurPass(hA.texture, hB, 0, 1)
        this.blurPass(hB.texture, qA, 1, 0)
        this.blurPass(qA.texture, qB, 0, 1)

        const c = this.compositeMaterial.uniforms
        c.tBase.value = base.texture
        c.tNear.value = hB.texture
        c.tWide.value = qB.texture
        this.quad.material = this.compositeMaterial
        this.renderer.setRenderTarget(null)
        this.renderer.clear()
        this.renderer.render(this.quadScene, this.quadCamera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.geometry.dispose()
        this.material.dispose()
        this.hazeGeometry.dispose()
        this.hazeMaterial.dispose()
        this.quadGeometry.dispose()
        this.blurMaterial.dispose()
        this.compositeMaterial.dispose()
        this.disposeTargets()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface GlowingParticlesProps {
    color?: string
    hot?: string
    density?: number
    streak?: number
    speed?: number
    size?: number
    bloom?: number
    rim?: number
    haze?: number
    spin?: number
    direction?: "right" | "left"
    sizePercent?: number
    style?: React.CSSProperties
}

function __BaseImpl_GlowingParticles(props: GlowingParticlesProps) {
    const {
        color = DEFAULTS.color,
        hot = DEFAULTS.hot,
        density = DEFAULTS.density,
        streak = DEFAULTS.streak,
        speed = DEFAULTS.speed,
        size = DEFAULTS.size,
        bloom = DEFAULTS.bloom,
        rim = DEFAULTS.rim,
        haze = DEFAULTS.haze,
        spin = DEFAULTS.spin,
        direction = DEFAULTS.direction as "right" | "left",
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<BurstScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        color,
        hot,
        density,
        streak,
        speed,
        size,
        bloom,
        rim,
        haze,
        spin,
        direction,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: BurstScene
        try {
            scene = new BurstScene(container, cfgRef.current)
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
        color,
        hot,
        density,
        streak,
        speed,
        size,
        bloom,
        rim,
        haze,
        spin,
        direction,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Glowing particle burst"
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

GlowingParticles.displayName = "Glowing Particles"

const __presetProps = {
  "color": "#CFE6FF",
  "hot": "#FFFFFF",
  "density": 16,
  "streak": 8,
  "rim": 20,
  "bloom": 0,
  "haze": 20,
  "size": 4,
  "speed": 20,
  "spin": 20,
  "direction": "right",
  "sizePercent": 90
};

export default function GlowingParticles(props: Record<string, unknown>) {
  return <__BaseImpl_GlowingParticles {...(__presetProps as Record<string, unknown>)} {...props} />;
}
