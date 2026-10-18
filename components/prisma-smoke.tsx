"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Prisma Smoke — ink turning over inside a block of glass.
 *
 * The solid is a rounded box, which is one shape rather than two: subtracting a
 * radius from a box's distance field rounds every edge by that amount, so a
 * single control walks the whole way from a hard cube to a sphere with nothing
 * switching over in between. There is no cube mesh and no sphere mesh — the same
 * field is both.
 *
 * The smoke is genuinely inside it. The ray is marched to the surface, refracted
 * there, and then walked through the interior sampling a noise field, gathering
 * colour and losing transmittance as it goes. That is why the ink turns as the
 * block turns and why it is thicker where you look through more of it: the
 * picture is the sum of everything along the ray, which a texture on the surface
 * could never be.
 *
 * The noise is domain-warped — its coordinate is displaced by another sample of
 * itself — which is what draws round clouds out into the folded sheets that read
 * as ink in water. One round gives clouds; two gives the long filaments in the
 * reference.
 *
 * Everything the glass does is in the fresnel: nearly clear face-on, bright at
 * the silhouette. That is where the crescent along the edge comes from, and it
 * is all of what separates glass from a coloured ball. There is deliberately no
 * specular lobe — a lamp reflected off a curved surface lands as one hard dot
 * that sits on top of the picture and does not move with the smoke, which reads
 * as a blemish rather than as light.
 */

/** The camera the rays are cast from. */
const CAM_Z = 2.8
const FOCAL = 1.6

/** Half-width of the block. The panel used to own this. */
const BLOCK_SIZE = 0.35 + 1 * 0.028

/**
 * How hard the glass bends what is behind it — optical glass, near enough.
 * The panel used to own this too.
 */
const REFRACTION = 1.0 + 20 * 0.035

const DEFAULTS = {
    ink: "#000000",
    smoke: "#00FFEE",
    glass: "#000000",
    rounding: 4,
    density: 20,
    swirl: 20,
    detail: 1,
    contrast: 20,
    edgeShine: 20,
    speed: 8,
    direction: "left",
    dragSensitivity: 10,
    sizePercent: 100,
}

type Config = {
    ink: string
    smoke: string
    glass: string
    rounding: number
    density: number
    swirl: number
    detail: number
    contrast: number
    edgeShine: number
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
        size: BLOCK_SIZE,
        /*
         * Rounding, as a share of the half-width.
         *
         * At 0 the field is a box with hard edges; at 1 the rounding has eaten
         * the whole shape and it is exactly a sphere. One field, no switch.
         */
        rounding: clamp(cfg.rounding, 0, 20, DEFAULTS.rounding) / 20,
        density: clamp(cfg.density, 1, 20, DEFAULTS.density) * 0.55,
        // Octaves, as a float the shader fades the last one in with — stepping
        // octaves in whole numbers pops visibly.
        detail: 1.0 + clamp(cfg.detail, 1, 20, DEFAULTS.detail) * 0.16,
        // How far each warp round displaces the coordinate: the difference
        // between clouds and drawn-out sheets of ink.
        swirl: clamp(cfg.swirl, 0, 20, DEFAULTS.swirl) * 0.06,
        contrast: 0.4 + clamp(cfg.contrast, 1, 20, DEFAULTS.contrast) * 0.055,
        refraction: REFRACTION,
        // The crescent along the silhouette. There is no separate specular
        // highlight any more, so this alone carries the surface.
        edgeShine: clamp(cfg.edgeShine, 0, 20, DEFAULTS.edgeShine) * 0.08,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.055,
        heading: cfg.direction === "left" ? -1 : 1,
        zoom: 100 / clamp(cfg.sizePercent, 20, 200, 90),
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

const SMOKE_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec2 uResolution;
    uniform vec3 uInk;
    uniform vec3 uSmoke;
    uniform vec3 uGlass;
    uniform float uTime;
    uniform float uSize;
    uniform float uRounding;
    uniform float uDensity;
    uniform float uDetail;
    uniform float uSwirl;
    uniform float uContrast;
    uniform float uRefraction;
    uniform float uEdgeShine;
    // How far the ink has been shoved by the drag, and not yet settled back.
    uniform vec3 uFlow;
    uniform float uYaw;
    uniform float uPitch;
    uniform float uZoom;
    uniform float uCamZ;
    uniform float uFocal;

    varying vec2 vUv;

    mat3 rotY(float a) {
        float c = cos(a), s = sin(a);
        return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
    }

    mat3 rotX(float a) {
        float c = cos(a), s = sin(a);
        return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
    }

    /**
     * Rounded box — cube and sphere in one field.
     *
     * Shrinking the box by r and then subtracting r back rounds every edge by
     * exactly r. At r = 0 it is a box; when r has eaten the whole half-width
     * there is nothing left to be square and it is a sphere. Nothing switches
     * over between the two.
     */
    float sdSolid(vec3 p) {
        float r = uSize * uRounding;
        vec3 b = vec3(uSize - r);
        vec3 q = abs(p) - b;
        return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
    }

    float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    /** Value noise in three dimensions, with a smoothstep fade. */
    float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), u.x),
                mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), u.x), u.y),
            mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), u.x),
                mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), u.x), u.y),
            u.z
        );
    }

    /** Four octaves, the tail ones faded in by weight so Detail never pops. */
    float fbm(vec3 p) {
        float sum = 0.0;
        float amp = 0.5;
        float norm = 0.0;
        for (int i = 0; i < 4; i++) {
            float w = clamp(uDetail - float(i), 0.0, 1.0);
            sum += noise(p) * amp * w;
            norm += amp * w;
            p *= 2.03;
            amp *= 0.5;
        }
        return sum / max(0.0001, norm);
    }

    /**
     * How much ink is at this point.
     *
     * Domain warped: the coordinate handed to the noise is first displaced by
     * another sample of it. One round pulls the noise into blobs, and the second
     * draws those blobs out into the folded sheets that read as ink in water —
     * plain noise here would look like fog, however it moved.
     */
    float inkAt(vec3 p) {
        vec3 q = p * 2.2;
        // The whole body turns slowly on its own, so the ink is never static
        // even where the flow is gentle.
        q = rotY(uTime * 0.15) * q;

        /*
         * The drag, pushed through the ink.
         *
         * Dragging already carries the smoke around with the block, since both
         * live in the same frame — but liquid in a moving container does not
         * simply travel with it, it lags and slops against the walls. Offsetting
         * the noise domain by the drag and letting that offset settle back is
         * what turns a solid block of ink into something with fluid in it.
         */
        q += uFlow;

        vec3 w1 = vec3(
            fbm(q + vec3(0.0, uTime * 0.22, 0.0)),
            fbm(q + vec3(3.1, -uTime * 0.18, 1.7)),
            fbm(q + vec3(-2.3, 0.0, uTime * 0.2))
        );
        vec3 w2 = vec3(
            fbm(q * 1.6 + w1 * uSwirl * 5.0 + uTime * 0.12),
            fbm(q * 1.6 - w1 * uSwirl * 5.0 - uTime * 0.1),
            fbm(q * 1.6 + w1.zxy * uSwirl * 5.0)
        );
        float f = fbm(q * 1.9 + w2 * uSwirl * 5.0);

        // Pushed away from the middle, so the ink has definite sheets with clear
        // water between them rather than an even haze.
        return pow(clamp(f * 1.5, 0.0, 1.0), uContrast * 2.0);
    }

    void main() {
        float aspect = uResolution.x / max(1.0, uResolution.y);
        vec2 uv = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5) * uZoom;

        vec3 ro = vec3(0.0, 0.0, uCamZ);
        vec3 rd = normalize(vec3(uv, -uFocal));

        // The block turns rather than the camera, so the lights stay put and the
        // highlights slide across the surface as it moves.
        mat3 R = rotX(uPitch) * rotY(uYaw);
        vec3 roLocal = R * ro;
        vec3 rdLocal = R * rd;

        // March to the surface.
        float t = 0.0;
        float hit = 0.0;
        for (int i = 0; i < 64; i++) {
            float d = sdSolid(roLocal + rdLocal * t);
            if (d < 0.001) { hit = 1.0; break; }
            t += d;
            if (t > 8.0) break;
        }

        if (hit < 0.5) discard;

        vec3 p = roLocal + rdLocal * t;

        // Normal from the gradient of the field — nothing is stored.
        vec2 e = vec2(0.0012, 0.0);
        vec3 n = normalize(vec3(
            sdSolid(p + e.xyy) - sdSolid(p - e.xyy),
            sdSolid(p + e.yxy) - sdSolid(p - e.yxy),
            sdSolid(p + e.yyx) - sdSolid(p - e.yyx)
        ));
        vec3 v = -rdLocal;
        float facing = max(dot(n, v), 0.0);

        /*
         * Refraction at the surface.
         *
         * The ray that goes on to gather the smoke is bent here, which is what
         * makes the ink appear to sit behind glass — it shifts and stretches
         * near the silhouette, exactly where a real block bends hardest.
         */
        vec3 through = refract(rdLocal, n, 1.0 / max(1.001, uRefraction));
        if (dot(through, through) < 0.0001) through = reflect(rdLocal, n);

        /*
         * Walk the inside.
         *
         * A fixed number of steps between the near wall and wherever the field
         * turns positive again. Colour is gathered front to back and
         * transmittance is spent as it goes, so ink nearer the viewer hides what
         * is behind it — which is why the body has depth rather than reading as
         * one flat swirl.
         */
        vec3 acc = vec3(0.0);
        float trans = 1.0;
        vec3 sp = p + through * 0.01;
        float stepLen = (uSize * 2.4) / 30.0;

        for (int i = 0; i < 30; i++) {
            float inside = sdSolid(sp);
            if (inside > 0.0) break;

            float ink = inkAt(sp);
            // Thinned toward the glass, so the smoke does not end on a hard
            // line against the wall of its container.
            float shell = clamp(-inside / (uSize * 0.35), 0.0, 1.0);
            float dens = ink * uDensity * shell;

            // Lighter where the ink is thin and dark where it gathers, which is
            // what gives the sheets their edges.
            vec3 tint = mix(uSmoke, uInk, smoothstep(0.15, 0.75, ink));

            // Beer-Lambert: what this slab absorbs depends on how much is in it.
            float a = 1.0 - exp(-dens * stepLen * 9.0);
            acc += trans * a * tint;
            trans *= 1.0 - a;
            if (trans < 0.01) break;

            sp += through * stepLen;
        }

        // Whatever light was not absorbed passes through as clear glass.
        vec3 col = acc + trans * uGlass * 0.12;

        /*
         * The glass itself, entirely fresnel.
         *
         * Nearly clear face-on and bright at the silhouette — that swing is
         * where the crescent along the edge comes from, and it is all of what
         * separates glass from a coloured ball. There is deliberately no
         * specular lobe: a lamp reflected off a curved surface lands as a single
         * hard dot that sits on top of the picture and does not move with the
         * smoke, which reads as a blemish rather than as light.
         */
        float f = pow(1.0 - facing, 4.0);
        // Two falloffs off the same fresnel: a broad one for the body of the
        // edge and a tight one for the bright line right at the silhouette.
        // Both take the glass colour, since there is no separate sheen now.
        col += uGlass * f * uEdgeShine * 2.5;
        col += uGlass * pow(f, 2.0) * uEdgeShine * 1.4;

        // Solid where there is ink or a lit edge, and clear where the block is
        // empty, so the frame behind reads through the middle.
        float alpha = clamp((1.0 - trans) + f * uEdgeShine * 2.0 + 0.06, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
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

    private time = 0
    // Square on to the camera at rest, so the block sits level rather than
    // arriving already tipped.
    private yaw = 0
    private pitch = 0
    // What the drag has shoved through the ink, which settles back on its own.
    private flow = new THREE.Vector3()
    private velX = 0
    private velY = 0
    private isDragging = false
    private lastX = 0
    private lastY = 0

    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        /*
         * Capped well below the display's.
         *
         * Every pixel walks a ray to the surface and then thirty more through
         * the volume, each of those sampling four octaves of 3D noise. This is
         * comfortably the most expensive thing in the set, and the ratio is the
         * only lever that costs nothing visually.
         */
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25))
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
            vertexShader: QUAD_VERTEX,
            fragmentShader: SMOKE_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uInk: { value: new THREE.Color(cfg.ink) },
                uSmoke: { value: new THREE.Color(cfg.smoke) },
                uGlass: { value: new THREE.Color(cfg.glass) },
                uTime: { value: 0 },
                uSize: { value: S.size },
                uRounding: { value: S.rounding },
                uDensity: { value: S.density },
                uDetail: { value: S.detail },
                uSwirl: { value: S.swirl },
                uContrast: { value: S.contrast },
                uRefraction: { value: S.refraction },
                uEdgeShine: { value: S.edgeShine },
                uFlow: { value: new THREE.Vector3() },
                uYaw: { value: this.yaw },
                uPitch: { value: this.pitch },
                uZoom: { value: S.zoom },
                uCamZ: { value: CAM_Z },
                uFocal: { value: FOCAL },
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
            this.yaw += dx * s
            this.pitch += dy * s
            // Kept, so the block carries on turning after the pointer lets go.
            this.velY = dx * s
            this.velX = dy * s
            /*
             * The same movement, pushed into the ink.
             *
             * Opposed to the drag, because fluid lags behind the container it
             * is in — swing a jar and the liquid piles up on the trailing wall.
             * Accumulated rather than set, so a long drag builds a stronger
             * push than a flick.
             */
            this.flow.x -= dx * s * 0.9
            this.flow.y += dy * s * 0.9
            this.flow.z += (dx + dy) * s * 0.25
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
        this.renderer.setSize(width, height, false)
        this.material.uniforms.uResolution.value.set(width, height)
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.material.uniforms
        u.uInk.value.set(cfg.ink || "#000000")
        u.uSmoke.value.set(cfg.smoke || "#ffffff")
        u.uGlass.value.set(cfg.glass || "#ffffff")
        u.uSize.value = S.size
        u.uRounding.value = S.rounding
        u.uDensity.value = S.density
        u.uDetail.value = S.detail
        u.uSwirl.value = S.swirl
        u.uContrast.value = S.contrast
        u.uRefraction.value = S.refraction
        u.uEdgeShine.value = S.edgeShine
        u.uZoom.value = S.zoom
        // Nothing owns a buffer: the whole scene is one quad and a distance
        // field.
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        // The clock drives the ink whether or not the block is turning, so it
        // keeps moving inside even at zero spin.
        this.time += dt

        if (!this.isDragging) {
            // A fling decays over about a second, then the idle turn takes back
            // over — so a throw reads as momentum, not as a speed change.
            const decay = Math.exp(-dt * 3)
            this.yaw += this.velY
            this.pitch += this.velX
            this.velX *= decay
            this.velY *= decay
            this.yaw += S.speed * S.heading * dt
        }

        /*
         * The ink settles back over a couple of seconds.
         *
         * Per second rather than per frame, so it takes the same time at 30Hz as
         * at 120Hz. Slower than the block's own spin-down on purpose: the glass
         * stops before what is inside it does.
         */
        this.flow.multiplyScalar(Math.exp(-dt * 0.9))

        const u = this.material.uniforms
        u.uTime.value = this.time * (0.4 + S.speed * 2.0)
        // Both axes run free, so the block can be turned right over and round.
        // There is no up to protect: the ink looks the same from every side.
        u.uYaw.value = this.yaw
        u.uPitch.value = this.pitch
        u.uFlow.value.copy(this.flow)

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

interface PrismaSmokeProps {
    ink?: string
    smoke?: string
    glass?: string
    rounding?: number
    density?: number
    swirl?: number
    detail?: number
    contrast?: number
    edgeShine?: number
    speed?: number
    direction?: "right" | "left"
    dragSensitivity?: number
    sizePercent?: number
    style?: React.CSSProperties
}

function __BaseImpl_PrismaSmoke(props: PrismaSmokeProps) {
    const {
        ink = DEFAULTS.ink,
        smoke = DEFAULTS.smoke,
        glass = DEFAULTS.glass,
        rounding = DEFAULTS.rounding,
        density = DEFAULTS.density,
        swirl = DEFAULTS.swirl,
        detail = DEFAULTS.detail,
        contrast = DEFAULTS.contrast,
        edgeShine = DEFAULTS.edgeShine,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction as "right" | "left",
        dragSensitivity = DEFAULTS.dragSensitivity,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<SmokeScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        ink,
        smoke,
        glass,
        rounding,
        density,
        swirl,
        detail,
        contrast,
        edgeShine,
        speed,
        direction,
        dragSensitivity,
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
        ink,
        smoke,
        glass,
        rounding,
        density,
        swirl,
        detail,
        contrast,
        edgeShine,
        speed,
        direction,
        dragSensitivity,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Glass block with smoke inside"
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

PrismaSmoke.displayName = "Prisma Smoke"
PrismaSmoke.defaultProps = { ...DEFAULTS }

const __presetProps = {
  "ink": "#000000",
  "smoke": "#00E21C",
  "glass": "#424242",
  "rounding": 0,
  "density": 8,
  "swirl": 11,
  "detail": 20,
  "contrast": 20,
  "edgeShine": 20,
  "speed": 8,
  "direction": "left",
  "dragSensitivity": 10,
  "sizePercent": 100
};

export default function PrismaSmoke(props: Record<string, unknown>) {
  return <__BaseImpl_PrismaSmoke {...(__presetProps as Record<string, unknown>)} {...props} />;
}
