"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Morph Solid — one polished object turning into another, and another.
 *
 * The shapes are distance fields rather than meshes, which is the only reason
 * this works: blending two fields blends the *solids*, so a cube becomes an
 * octahedron by growing new faces and losing old ones. Morphing two meshes can
 * only ever interpolate vertices between them, and a cube and an octahedron do
 * not have vertices that correspond — the in-between is a crumpled bag.
 *
 * Four shapes are held at once and the blend runs around them on a loop, easing
 * so each one is recognisable for a moment before it goes. The rounding is a
 * single subtraction applied to whichever field is showing, so every solid keeps
 * the same softened edge as it changes.
 *
 * The surface is shaded as polished metal against a procedural room: a gradient
 * with two lamps in it, sampled along the reflected ray. Nothing is behind the
 * object to reflect, so the room has to be invented — and a metal with nothing
 * to reflect reads as grey plastic.
 */

/*
 * Fixed shape and finish. Each of these used to be a slider, and each is now
 * pinned where it looked best: a mid-sized solid with hard edges and a hard
 * specular window.
 */
const SIZE = 0.35 + 7 * 0.022
const ROUNDING = 0
const POLISH = 6 + 20 * 14

const DEFAULTS = {
    metal: "#8700FF",
    roomTop: "#4B00FF",
    roomBottom: "#000000",
    hold: 11,
    metalness: 0,
    rimOn: true,
    rim: {
        defaultValue: {"color":"#FFFFFF","light":20}, color: "#63B4FF", light: 10 },
    speed: 13,
    direction: "right",
    dragSensitivity: 7,
    sizePercent: 100,
}

type Config = {
    metal: string
    roomTop: string
    roomBottom: string
    hold: number
    metalness: number
    rimOn: boolean
    // Grouped, so the panel shows one row until the rim is switched on.
    rim: { color: string; light: number }
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
        rounding: ROUNDING,
        size: SIZE,
        /*
         * How long each shape is held before the blend moves on.
         *
         * The blend is eased toward the whole numbers, so a high value keeps
         * each solid recognisable and a low one leaves it permanently between
         * two things.
         */
        hold: 1.0 + clamp(cfg.hold, 0, 20, DEFAULTS.hold) * 0.4,
        polish: POLISH,
        // How much of the room the surface reflects, against how much of its own
        // colour it keeps.
        metalness: clamp(cfg.metalness, 0, 20, DEFAULTS.metalness) / 20,
        /*
         * The toggle decides whether the rim exists at all, so switching it off
         * costs nothing in the shader rather than leaving a term multiplied by a
         * number the panel can no longer reach.
         */
        rim: cfg.rimOn
            ? clamp(cfg.rim?.light, 0, 20, DEFAULTS.rim.light) * 0.07
            : 0,
        rimColor: cfg.rim?.color || DEFAULTS.rim.color,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.055,
        heading: cfg.direction === "left" ? -1 : 1,
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

const MORPH_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec2 uResolution;
    uniform vec3 uMetal;
    uniform vec3 uRoomTop;
    uniform vec3 uRoomBottom;
    uniform vec3 uGlow;
    uniform float uTime;
    uniform float uRounding;
    uniform float uSize;
    uniform float uHold;
    uniform float uPolish;
    uniform float uMetalness;
    uniform float uRim;
    uniform float uYaw;
    uniform float uPitch;

    varying vec2 vUv;

    mat3 rotY(float a) {
        float c = cos(a), s = sin(a);
        return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
    }

    mat3 rotX(float a) {
        float c = cos(a), s = sin(a);
        return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
    }

    float sdSphere(vec3 p, float r) {
        return length(p) - r;
    }

    float sdBox(vec3 p, float b) {
        vec3 q = abs(p) - vec3(b);
        return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
    }

    /** Octahedron: the sum of the absolute coordinates, normalised. */
    float sdOctahedron(vec3 p, float s) {
        p = abs(p);
        return (p.x + p.y + p.z - s) * 0.57735027;
    }

    float sdTorus(vec3 p, float big, float small) {
        vec2 q = vec2(length(p.xz) - big, p.y);
        return length(q) - small;
    }

    /**
     * The solid, somewhere between four shapes.
     *
     * Blending the fields blends the solids themselves: a cube becomes an
     * octahedron by growing faces and losing others, which is something vertex
     * interpolation between two meshes cannot do — those two have no
     * corresponding vertices, and the in-between is a crumpled bag.
     */
    float map(vec3 p) {
        float s = uSize;
        // Where in the cycle of four we are.
        float t = uTime;
        float stage = floor(t);
        float frac = fract(t);
        // Eased toward the whole numbers, so each shape is held and recognised
        // before the next one arrives.
        float k = smoothstep(0.0, 1.0, clamp((frac - 0.5) * uHold + 0.5, 0.0, 1.0));

        float a, b;
        float which = mod(stage, 4.0);
        if (which < 0.5) {
            a = sdBox(p, s * 0.78);
            b = sdSphere(p, s);
        } else if (which < 1.5) {
            a = sdSphere(p, s);
            b = sdOctahedron(p, s * 1.25);
        } else if (which < 2.5) {
            a = sdOctahedron(p, s * 1.25);
            b = sdTorus(p, s * 0.72, s * 0.34);
        } else {
            a = sdTorus(p, s * 0.72, s * 0.34);
            b = sdBox(p, s * 0.78);
        }

        // Subtracting a constant from a distance field rounds every edge it has
        // by that amount, so all four solids share one softened edge.
        return mix(a, b, k) - uRounding;
    }

    /** Gradient of the field, which is its normal — nothing is stored. */
    vec3 normalAt(vec3 p) {
        vec2 e = vec2(0.0015, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }

    /** The room the metal has to reflect: a gradient with two lamps in it. */
    vec3 room(vec3 dir) {
        vec3 base = mix(uRoomBottom, uRoomTop, clamp(dir.y * 0.5 + 0.5, 0.0, 1.0));
        float key = pow(max(dot(dir, normalize(vec3(0.5, 0.75, 0.4))), 0.0), 26.0);
        float fill = pow(max(dot(dir, normalize(vec3(-0.6, -0.2, 0.75))), 0.0), 10.0);
        return base + vec3(1.0) * (key * 1.7 + fill * 0.35);
    }

    void main() {
        float aspect = uResolution.x / max(1.0, uResolution.y);
        vec2 uv = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);

        vec3 ro = vec3(0.0, 0.0, 2.6);
        vec3 rd = normalize(vec3(uv, -1.5));

        // The object turns rather than the camera, so the room's lights stay put
        // and the highlights slide across the surface as it moves.
        mat3 R = rotX(uPitch) * rotY(uYaw);

        float t = 0.0;
        float hit = 0.0;
        for (int i = 0; i < 90; i++) {
            vec3 p = R * (ro + rd * t);
            float d = map(p);
            if (d < 0.0008) { hit = 1.0; break; }
            // Short of the full step: the blend of two fields is no longer a
            // true distance, and a full step can overshoot the surface.
            t += d * 0.85;
            if (t > 6.0) break;
        }

        if (hit < 0.5) discard;

        vec3 p = R * (ro + rd * t);
        vec3 n = normalAt(p);
        vec3 v = normalize(R * -rd);

        vec3 reflected = room(reflect(-v, n));
        // A metal keeps almost none of its own colour and shows the room
        // instead; dialling that back leaves something more like painted stone.
        vec3 body = mix(uMetal * (0.25 + max(dot(n, normalize(vec3(0.4, 0.8, 0.5))), 0.0) * 0.8),
                        reflected * uMetal,
                        uMetalness);

        // Fresnel: every surface is a mirror at a grazing angle, whatever it is
        // made of, and this is most of what makes it look polished.
        float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
        vec3 col = mix(body, reflected, fres * 0.7);

        vec3 L = normalize(vec3(0.5, 0.75, 0.4));
        vec3 h = normalize(L + v);
        col += vec3(1.0) * pow(max(dot(n, h), 0.0), uPolish) * 1.1;

        // A coloured rim, so the silhouette reads against a dark frame.
        col += uGlow * fres * uRim * 3.0;

        gl_FragColor = vec4(col, 1.0);
    }
`

class MorphScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private time = 0
    private yaw = 0.5
    private pitch = 0.3
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
        // Every pixel walks its own ray, so the cost is squarely in the fragment
        // stage and the ratio is capped below the display's.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
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
            fragmentShader: MORPH_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uMetal: { value: new THREE.Color(cfg.metal) },
                uRoomTop: { value: new THREE.Color(cfg.roomTop) },
                uRoomBottom: { value: new THREE.Color(cfg.roomBottom) },
                uGlow: { value: new THREE.Color(S.rimColor) },
                uTime: { value: 0 },
                uRounding: { value: S.rounding },
                uSize: { value: S.size },
                uHold: { value: S.hold },
                uPolish: { value: S.polish },
                uMetalness: { value: S.metalness },
                uRim: { value: S.rim },
                uYaw: { value: this.yaw },
                uPitch: { value: this.pitch },
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
        this.renderer.setSize(width, height, false)
        this.material.uniforms.uResolution.value.set(width, height)
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.material.uniforms
        u.uMetal.value.set(cfg.metal || "#ffffff")
        u.uRoomTop.value.set(cfg.roomTop || "#ffffff")
        u.uRoomBottom.value.set(cfg.roomBottom || "#000000")
        u.uGlow.value.set(S.rimColor)
        u.uRounding.value = S.rounding
        // Size is scaled by the panel's percentage here rather than by moving
        // the camera, since the object is a field and has no bounding box to
        // frame on.
        u.uSize.value = S.size * (clamp(cfg.sizePercent, 20, 200, 85) / 85)
        u.uHold.value = S.hold
        u.uPolish.value = S.polish
        u.uMetalness.value = S.metalness
        u.uRim.value = S.rim
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.speed

        if (!this.isDragging) {
            const decay = Math.exp(-dt * 3)
            this.yaw += this.velY
            this.pitch += this.velX
            this.velX *= decay
            this.velY *= decay
            this.yaw += S.speed * S.heading * dt * 2.0
        }

        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uYaw.value = this.yaw
        // Held short of the poles: tipped fully over, a solid loses the three
        // quarter view that shows its faces.
        u.uPitch.value = clamp(this.pitch, -1.1, 1.1, 0)
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

export interface MorphSolidProps {
    metal?: string
    roomTop?: string
    roomBottom?: string
    hold?: number
    metalness?: number
    rimOn?: boolean
    rim?: { color: string; light: number }
    speed?: number
    direction?: "right" | "left"
    dragSensitivity?: number
    sizePercent?: number
    style?: React.CSSProperties
}

function __BaseImpl_MorphSolid(props: MorphSolidProps) {
    const {
        metal = DEFAULTS.metal,
        roomTop = DEFAULTS.roomTop,
        roomBottom = DEFAULTS.roomBottom,
        hold = DEFAULTS.hold,
        metalness = DEFAULTS.metalness,
        rimOn = DEFAULTS.rimOn,
        rim = {"color":"#FFFFFF","light":20},
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction,
        dragSensitivity = DEFAULTS.dragSensitivity,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<MorphScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        metal,
        roomTop,
        roomBottom,
        hold,
        metalness,
        rimOn,
        rim,
        speed,
        direction,
        dragSensitivity,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: MorphScene
        try {
            scene = new MorphScene(container, cfgRef.current)
        } catch {
            // No WebGL — render an empty frame rather than throwing.
            return
        }
        sceneRef.current = scene
        scene.setSize(container.clientWidth, container.clientHeight)
        scene.updateConfig(cfgRef.current)
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
        metal,
        roomTop,
        roomBottom,
        hold,
        metalness,
        rimOn,
        rim,
        speed,
        direction,
        dragSensitivity,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Morphing solid"
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

MorphSolid.displayName = "Morph Solid"

const __presetProps = {
  "metal": "#8700FF",
  "roomTop": "#4B00FF",
  "roomBottom": "#000000",
  "hold": 11,
  "metalness": 0,
  "rimOn": true
};

export default function MorphSolid(props: Record<string, unknown>) {
  return <__BaseImpl_MorphSolid {...(__presetProps as Record<string, unknown>)} {...props} />;
}
