"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Abyss Field — cold water under pressure, filling the frame.
 *
 * Four noise fields, and what each one is for matters more than that there are
 * four. Two of them are sampled on a coordinate squashed to a third of its
 * height, which makes their features long and vertical, and those two are used
 * as a displacement rather than as anything you see: they drag the third field
 * sideways into slow columns of current. A fourth is ridged — folded about its
 * midpoint so the zero crossings become crests instead of troughs — and that
 * one is the pale veining. Ridge crossfades between the smooth body and the
 * veined one, because at either extreme it is wrong: all body is a lava lamp,
 * all veins is cracked ice.
 *
 * The field drifts upward on its own clock while the warp works across it on a
 * slower lateral one. Two clocks rather than one: driving both from the same
 * time makes the columns travel with the current they are carving, and the
 * whole thing slides as a single printed sheet instead of churning.
 *
 * Drift alone still reads as a texture being moved, though, because every part
 * of it travels the same distance in the same direction. So the coordinate is
 * bent before anything samples it — two crossed sines of different length and
 * rate, plus a weaker vertical partner driven by the already-bent x. Crossed,
 * they only repeat when both come back round together, so the water never
 * returns to the same shape on a beat you can follow.
 *
 * There is no ball and no pointer interaction: the field fills the canvas
 * edge to edge and drifts sideways on its own clock, set by Spin.
 */

const DEFAULTS = {
    deep: "#050F2E",
    mid: "#123C8C",
    surge: "#2FA8E8",
    crest: "#C4F2FF",
    zoom: 6,
    warp: 9,
    ridge: 11,
    sway: 8,
    detail: 20,
    speed: 7,
    spin: 4,
    hover: 12,
}

type Config = {
    deep: string
    mid: string
    surge: string
    crest: string
    zoom: number
    warp: number
    ridge: number
    sway: number
    detail: number
    speed: number
    spin: number
    hover: number
}

/*
 * The panel used to own these two, on the same 1–20 scale as everything else.
 *
 * Sharpness at its floor and Exposure a little over unity is the pair the water
 * actually wants: the field sits high enough to reach the Surge stop across most
 * of the ball, with the pale Crest left for the vein cores. Anywhere else and
 * one of the four stops stops earning its place — a hard Sharpness pulls the
 * light into seams and the middle two colours vanish, a low Exposure sinks the
 * whole ball onto Deep. Pinned here rather than deleted from the shader, so the
 * uniform wiring and the ramp are untouched.
 */
const SHARPNESS = 0.4 + 1 * 0.3
const EXPOSURE = 0.3 + 10 * 0.1

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.09,
        // How many noise cells fit across the canvas. Linear, because the eye
        // reads this one as a zoom and a zoom that accelerates feels broken.
        zoom: 0.6 + clamp(cfg.zoom, 1, 20, DEFAULTS.zoom) * 0.28,
        // How far the two squashed bands drag the body field. This is what turns
        // an even mottle into columns; at 0 there are no columns at all.
        warp: clamp(cfg.warp, 0, 20, DEFAULTS.warp) * 0.31,
        // Crossfade between the smooth body and the ridged veining. Neither end
        // is where it wants to live, which is why it is a fade and not a toggle.
        ridge: clamp(cfg.ridge, 0, 20, DEFAULTS.ridge) * 0.05,
        // Amplitude of the standing sway, in noise units. The field spans a
        // little over two of them across the frame, so the top of this range
        // is enough to fold a column back over itself, which is the point at
        // which it stops reading as a pattern being moved and starts reading
        // as water.
        sway: clamp(cfg.sway, 0, 20, DEFAULTS.sway) * 0.03,
        // Fed to the shader as a float so the last octave fades in by weight —
        // stepping octaves in whole numbers pops visibly. Tops out at 5.
        detail: 1.0 + clamp(cfg.detail, 1, 20, DEFAULTS.detail) * 0.2,
        sharpness: SHARPNESS,
        exposure: EXPOSURE,
        // Noise units per second of idle drift, always running underneath.
        spin: clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.06,
        // Strength of the eddy and the colour lift the pointer stirs into the
        // water. 0 turns the interaction off entirely.
        hover: clamp(cfg.hover, 0, 200, DEFAULTS.hover) * 0.03,
    }
}

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const ABYSS_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec2 uResolution;
    uniform vec3 uDeep;
    uniform vec3 uMid;
    uniform vec3 uSurge;
    uniform vec3 uCrest;
    uniform float uTime;
    uniform float uZoom;
    uniform float uWarp;
    uniform float uRidge;
    uniform float uSway;
    uniform float uSharpness;
    uniform float uDetail;
    uniform float uExposure;
    uniform float uYaw;
    uniform vec2 uPointer;
    uniform float uActive;
    uniform float uHover;

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
     * The zero-weight octaves are branched around rather than multiplied out:
     * "oct" is the same for every pixel in a given call, so the branch is
     * uniform across the wavefront and costs nothing, where letting the noise
     * run and scaling it by zero would be the most expensive no-op in the file.
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
     * The same stack, ridged.
     *
     * Each octave is folded about its midpoint and inverted, so what were the
     * noise's zero crossings become sharp crests. Squaring the result narrows
     * them further. That is the difference between a field of blobs and a field
     * of veins, and it cannot be had by contrast-stretching plain fbm — a
     * stretch keeps the peaks where the blobs already were, and the whole point
     * is that the crests land on the boundaries between them.
     */
    float ridged(vec2 p, float oct) {
        float sum = 0.0;
        float amp = 0.5;
        float norm = 0.0;
        for (int i = 0; i < 5; i++) {
            float w = clamp(oct - float(i), 0.0, 1.0);
            if (w > 0.0) {
                float v = 1.0 - abs(noise(p) * 2.0 - 1.0);
                sum += v * v * amp * w;
                norm += amp * w;
            }
            p *= 2.03;
            p = mat2(0.8, 0.6, -0.6, 0.8) * p;
            amp *= 0.5;
        }
        return sum / max(0.0001, norm);
    }

    /**
     * Four stops with overlapping windows, weighted late — most of the water is
     * dark and the pale end is meant to be rare. The overlap matters: butted
     * ranges leave a seam where one blend ends and the next begins, which shows
     * up as a contour line drawn across the body.
     */
    vec3 ramp(float t) {
        vec3 c = mix(uDeep, uMid, smoothstep(0.05, 0.45, t));
        c = mix(c, uSurge, smoothstep(0.42, 0.78, t));
        return mix(c, uCrest, smoothstep(0.74, 1.0, t));
    }

    void main() {
        vec2 uv = vUv - 0.5;
        // Corrected on the wider axis, so the noise cells stay square in any
        // frame rather than stretching into ovals.
        uv.x *= uResolution.x / max(1.0, uResolution.y);

        /*
         * Two clocks. The field rises on its own; the warp crawls sideways at
         * about a fifth of that rate. Driving both from one time makes the
         * columns travel with the current they are carving, and the result
         * slides as a single printed sheet rather than churning.
         */
        vec2 p = uv * uZoom - vec2(uYaw, 0.0);

        /*
         * The pointer doesn't pan the field anymore — it reaches into it. A
         * radial falloff around the pointer's position, taken in the same
         * aspect-corrected, pre-zoom space as uv so it holds its size across
         * Zoom settings, drives a tangential push that curls the current into
         * a gentle eddy where the water is touched. The same falloff lifts the
         * ramp value near the end of main, so the flow and the colour react
         * to the pointer together instead of the whole sheet sliding under it.
         */
        vec2 toPointer = uv - uPointer;
        float influence = uActive * exp(-dot(toPointer, toPointer) * 5.0) * uHover;
        vec2 tangent = vec2(-toPointer.y, toPointer.x);
        p += tangent * influence;
        vec2 flow = vec2(0.0, uTime);
        vec2 lateral = vec2(uTime * 0.21, 0.0);

        /*
         * The sway, applied to the coordinate before anything samples it, so
         * the warp bands, the body and the veining all bend together as one
         * body of water. Applied to the body field alone it would slide against
         * a warp that stayed put, and the two would visibly come apart.
         *
         * Two waves of different length and rate rather than one. A single sine
         * has a period, and a period is a beat — the water returns to the same
         * shape on a count you can follow, which is the tell that it is a
         * texture being pushed rather than something moving. Crossed like this
         * the pattern only repeats when both come back round together, which at
         * these frequencies is far longer than anyone watches.
         *
         * The vertical partner is a third the strength and driven by the
         * already-swayed x, so the rise and fall follows the horizontal bend
         * instead of running independently of it. Pure side-to-side reads as a
         * sheet sliding; the small rise against it is what gives it volume.
         */
        float sway = sin(p.y * 1.9 - uTime * 1.3) * 0.55
                   + sin(p.y * 3.7 + uTime * 0.9 + 1.7) * 0.25;
        p.x += sway * uSway;
        p.y += sin(p.x * 2.3 + uTime * 1.1) * uSway * 0.35;

        /*
         * The two warp bands, sampled on a coordinate squashed to a third of its
         * height. That squash is the whole reason this reads as current: the
         * bands vary slowly up the frame and quickly across it, so the
         * displacement they apply is long and vertical. Sampled square, the same
         * two fields warp the body into an even mottle with no direction in it.
         */
        vec2 wq = p * vec2(1.0, 0.32);
        vec2 warp = vec2(
            fbm(wq + lateral, uDetail),
            fbm(wq + lateral * 1.4 + vec2(4.3, 2.1), uDetail)
        );
        vec2 push = warp * uWarp;

        float calm = fbm(p + push - flow, uDetail);
        // The veining runs finer than the body and drifts a little faster, so
        // the two never lock together into one shape.
        float veins = ridged(p * 1.35 + push * 0.8 - flow * 1.15, uDetail);

        float v = mix(calm, veins, uRidge);
        v = clamp(pow(clamp(v, 0.0, 1.0), uSharpness) * uExposure, 0.0, 1.0);
        // The same influence that curls the current also pales it, so the
        // touched water reads brighter rather than just differently shaped.
        v = clamp(v + influence * 0.6, 0.0, 1.0);

        vec3 col = ramp(v);
        gl_FragColor = vec4(col, 1.0);
    }
`

class AbyssScene {
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

    // Pointer position, aspect-corrected into the same pre-zoom space as the
    // shader's uv, plus an active flag that fades in while the pointer is
    // over the canvas and back out when it leaves — both smoothed so the
    // eddy the pointer stirs up settles in and out rather than snapping.
    private targetPointerX = 0
    private targetPointerY = 0
    private pointerX = 0
    private pointerY = 0
    private targetActive = 0
    private active = 0

    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        // Four five-octave stacks per pixel, one of them ridged: this is
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
            fragmentShader: ABYSS_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uDeep: { value: new THREE.Color(cfg.deep) },
                uMid: { value: new THREE.Color(cfg.mid) },
                uSurge: { value: new THREE.Color(cfg.surge) },
                uCrest: { value: new THREE.Color(cfg.crest) },
                uTime: { value: 0 },
                uZoom: { value: S.zoom },
                uWarp: { value: S.warp },
                uRidge: { value: S.ridge },
                uSway: { value: S.sway },
                uSharpness: { value: S.sharpness },
                uDetail: { value: S.detail },
                uExposure: { value: S.exposure },
                uYaw: { value: 0 },
                uPointer: { value: new THREE.Vector2(0, 0) },
                uActive: { value: 0 },
                uHover: { value: S.hover },
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

        const move = (e: PointerEvent) => {
            const rect = el.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            const aspect = rect.width / Math.max(1, rect.height)
            this.targetPointerX = ((e.clientX - rect.left) / rect.width - 0.5) * aspect
            this.targetPointerY = (e.clientY - rect.top) / rect.height - 0.5
            this.targetActive = 1
        }
        const leave = () => {
            this.targetActive = 0
        }

        el.addEventListener("pointermove", move)
        el.addEventListener("pointerleave", leave)
        el.addEventListener("pointercancel", leave)

        this.unbind = () => {
            el.removeEventListener("pointermove", move)
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
        this.renderer.setSize(width, height, false)
        this.material.uniforms.uResolution.value.set(width, height)
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.material.uniforms
        // Nothing here owns a buffer — the quad never changes — so every
        // control is a uniform write and changing a colour reallocates nothing.
        u.uDeep.value.set(cfg.deep || DEFAULTS.deep)
        u.uMid.value.set(cfg.mid || DEFAULTS.mid)
        u.uSurge.value.set(cfg.surge || DEFAULTS.surge)
        u.uCrest.value.set(cfg.crest || DEFAULTS.crest)
        u.uZoom.value = S.zoom
        u.uWarp.value = S.warp
        u.uRidge.value = S.ridge
        u.uSway.value = S.sway
        u.uDetail.value = S.detail
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A tab returning after a minute would otherwise advance the field by a
        // minute in one frame, and the water jumps to an unrelated shape.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.speed
        // Idle drift keeps running underneath the hover lean.
        this.yaw += S.spin * dt

        // Position tracks quickly; the active fade is slower, so entering and
        // leaving the canvas settles the eddy in and out instead of snapping
        // it on and off.
        const posEase = 1 - Math.exp(-dt * 8)
        const activeEase = 1 - Math.exp(-dt * 3)
        this.pointerX += (this.targetPointerX - this.pointerX) * posEase
        this.pointerY += (this.targetPointerY - this.pointerY) * posEase
        this.active += (this.targetActive - this.active) * activeEase

        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uYaw.value = this.yaw
        u.uPointer.value.set(this.pointerX, this.pointerY)
        u.uActive.value = this.active
        u.uHover.value = S.hover
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

interface AbyssOrbProps {
    deep?: string
    mid?: string
    surge?: string
    crest?: string
    zoom?: number
    warp?: number
    ridge?: number
    sway?: number
    detail?: number
    speed?: number
    spin?: number
    hover?: number
    style?: React.CSSProperties
}

export default function AbyssOrb(props: AbyssOrbProps) {
    const {
        deep = DEFAULTS.deep,
        mid = DEFAULTS.mid,
        surge = DEFAULTS.surge,
        crest = DEFAULTS.crest,
        zoom = DEFAULTS.zoom,
        warp = DEFAULTS.warp,
        ridge = DEFAULTS.ridge,
        sway = DEFAULTS.sway,
        detail = DEFAULTS.detail,
        speed = DEFAULTS.speed,
        spin = DEFAULTS.spin,
        hover = DEFAULTS.hover,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<AbyssScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        deep,
        mid,
        surge,
        crest,
        zoom,
        warp,
        ridge,
        sway,
        detail,
        speed,
        spin,
        hover,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: AbyssScene
        try {
            scene = new AbyssScene(container, cfgRef.current)
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
    }, [deep, mid, surge, crest, zoom, warp, ridge, sway, detail, speed, spin, hover])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A field of deep water lit from within"
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

AbyssOrb.displayName = "Abyss Orb"
AbyssOrb.defaultProps = { ...DEFAULTS }
