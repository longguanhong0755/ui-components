"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Lava Lamp — blobs of wax rising, merging and falling, raymarched.
 *
 * There is no geometry here at all. The whole thing is one full-screen quad and
 * a distance field: every pixel walks a ray forward until it is close enough to
 * a surface to call it a hit. That is the only practical way to render blobs
 * that merge, because merging is a property of the field — take the smooth
 * minimum of two sphere distances instead of the hard minimum and the surface
 * between them necks and joins on its own. With triangles you would have to
 * rebuild the mesh every frame to get the same picture.
 *
 * The blobs rise and fall on their own clocks at rates that do not divide into
 * each other, so the lamp never repeats a configuration while anyone is
 * watching. They also squash as they turn at the top and bottom of their travel,
 * which is what wax does when it changes direction against the fluid it is in.
 *
 * Normals come from sampling the field either side of the hit point along each
 * axis — the gradient of a distance field is its normal, so no normal data has
 * to be stored anywhere.
 *
 * The cursor is a magnet. Blobs near it lean toward it and, because they are
 * metaballs, the ones that gather there neck together and merge on their own —
 * so the interaction costs nothing more than moving a few centres, and the
 * fluid does the rest. Nothing is added to the picture and no surface is cut;
 * the wax simply reaches. The pull eases in when the pointer arrives and lets
 * go when it leaves, so the blobs drift back to their own paths rather than
 * snapping.
 */

/** Ceiling on the blob count, and the shader's loop bound with it. */
const MAX_BLOBS = 20

/*
 * The camera the rays are cast from.
 *
 * Kept out here because the pointer has to be projected onto the blobs' own
 * plane with the same numbers the shader marches with — if these two drift
 * apart the cut lands somewhere other than under the cursor.
 */
const CAM_Z = 2.4
const RAY_FOCAL = 1.4

const DEFAULTS = {
    top: "#FFFE00",
    bottom: "#13BB00",
    sheen: "#FFF400",
    blobs: 20,
    scale: 5,
    viscosity: 5,
    speed: 20,
    glow: 20,
    gloss: 20,
    wander: 10,
    magnet: 20,
    sizePercent: 75,
}

type Config = {
    top: string
    bottom: string
    sheen: string
    blobs: number
    scale: number
    viscosity: number
    speed: number
    glow: number
    gloss: number
    wander: number
    magnet: number
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        blobs: Math.round(clamp(cfg.blobs, 1, MAX_BLOBS, DEFAULTS.blobs)),
        scale: 0.12 + clamp(cfg.scale, 1, 20, DEFAULTS.scale) * 0.022,
        /*
         * The blend radius of the smooth minimum.
         *
         * Small is water — blobs pass through each other and separate cleanly.
         * Large is treacle, where they reach for each other across a gap and
         * join before they ever touch.
         */
        viscosity: 0.05 + clamp(cfg.viscosity, 1, 20, DEFAULTS.viscosity) * 0.035,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.075,
        glow: 0.3 + clamp(cfg.glow, 0, 20, DEFAULTS.glow) * 0.06,
        gloss: 8 + clamp(cfg.gloss, 1, 20, DEFAULTS.gloss) * 5,
        // Sideways drift, so the column is not a set of pistons.
        wander: clamp(cfg.wander, 0, 20, DEFAULTS.wander) * 0.035,
        /*
         * How far a blob is pulled toward the cursor, as a fraction of the
         * distance to it.
         *
         * Kept well under 1: at 1 every blob in reach would sit exactly on the
         * pointer, and a field warped that hard also breaks the raymarch, since
         * a step taken on the old distance can then overshoot the new surface.
         */
        magnet: clamp(cfg.magnet, 0, 20, DEFAULTS.magnet) * 0.028,
        zoom: 100 / clamp(cfg.sizePercent, 20, 200, 100),
    }
}

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        // Already in clip space; no camera is involved.
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const LAVA_FRAGMENT = /* glsl */ `
    precision highp float;

    // Kept in step with the TypeScript constant, since GLSL loop bounds cannot
    // be uniforms.
    #define MAX_BLOBS ${MAX_BLOBS}

    uniform vec2 uResolution;
    uniform vec3 uTop;
    uniform vec3 uBottom;
    uniform vec3 uSheen;
    uniform float uTime;
    uniform float uCount;
    uniform float uScale;
    uniform float uViscosity;
    uniform float uGlow;
    uniform float uGloss;
    uniform float uWander;
    uniform float uZoom;
    // Where the cursor is, on the blobs' own plane, and how much pull it has
    // right now — eased, so this is 0 until the pointer arrives.
    uniform vec2 uPointer;
    uniform float uMagnet;

    varying vec2 vUv;

    /**
     * Smooth minimum — the whole trick.
     *
     * An ordinary min() of two distance fields gives two spheres with a crease
     * where they cross. This blends the two fields over a radius k, so the
     * surface necks between them and they read as one body of fluid. k is the
     * viscosity control.
     */
    float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
    }

    /** Where blob i is, and how big, at this instant. */
    vec4 blob(int i) {
        float f = float(i);
        // Rates deliberately not in ratio, so the lamp never returns to a
        // configuration it has already been in.
        float rate = 0.5 + fract(f * 0.37) * 0.6;
        float phase = f * 2.399;
        float y = sin(uTime * rate + phase) * 0.62;
        float x = sin(uTime * rate * 0.61 + phase * 1.7) * uWander;
        float z = cos(uTime * rate * 0.43 + phase * 2.3) * uWander;
        // Bigger blobs move slower, the way heavier ones do.
        float r = uScale * (0.75 + fract(f * 0.71) * 0.6);

        /*
         * The cursor's pull, applied to the centre rather than to the surface.
         *
         * Moving centres is all it takes: these are metaballs, so blobs drawn
         * to the same place neck and merge on their own, and the wax reaching
         * for the pointer is the fluid's own behaviour rather than an effect
         * laid over it. Falls off with the square of the distance, so only what
         * is nearby answers and the rest of the lamp carries on.
         */
        vec2 toPointer = uPointer - vec2(x, y);
        float grip = exp(-dot(toPointer, toPointer) * 2.2);
        // Smaller blobs are lighter, so they come further — the spread in how
        // much each one yields is what stops the group moving as one lump.
        float give = uMagnet * grip * (1.3 - r * 1.4);
        vec2 pulled = vec2(x, y) + toPointer * give;

        return vec4(pulled, z, r);
    }

    /**
     * The distance field: every blob, smoothly unioned.
     *
     * The loop bound has to be a compile-time constant, so it runs to the
     * ceiling and the guard inside skips the blobs that are not in use. Raising
     * the ceiling without raising this bound is a silent cap — the panel would
     * read 20 and the lamp would still show twelve.
     */
    float map(vec3 p) {
        float d = 1e9;
        for (int i = 0; i < MAX_BLOBS; i++) {
            if (float(i) < uCount) {
                vec4 b = blob(i);
                /*
                 * Squashed vertically by how fast it is travelling: wax pushes
                 * back against the fluid when it turns at the top or bottom of
                 * its run, and a perfect sphere reads as a bubble in a vacuum.
                 */
                float squash = 1.0 + 0.22 * sin(uTime * (0.5 + fract(float(i) * 0.37) * 0.6) + float(i) * 2.399);
                vec3 q = p - b.xyz;
                q.y /= squash;
                d = smin(d, length(q) - b.w, uViscosity);
            }
        }
        return d;
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

    void main() {
        // Square-aspect coordinates, so the blobs stay round in any frame.
        vec2 uv = (vUv - 0.5) * uZoom;
        uv.x *= uResolution.x / max(1.0, uResolution.y);

        // Injected from the TypeScript constants, so the pointer projection
        // cannot drift out of step with the rays.
        vec3 ro = vec3(0.0, 0.0, ${CAM_Z.toFixed(3)});
        vec3 rd = normalize(vec3(uv, -${RAY_FOCAL.toFixed(3)}));

        float t = 0.0;
        float hit = 0.0;
        for (int i = 0; i < 72; i++) {
            vec3 p = ro + rd * t;
            float d = map(p);
            if (d < 0.001) { hit = 1.0; break; }
            /*
             * Short of the full distance on purpose.
             *
             * The pull warps the field, and a warped field is no longer a true
             * distance — a step measured on it can land past the surface and
             * punch a hole through a blob. Nine tenths costs a few more
             * iterations and removes the risk.
             */
            t += d * 0.9;
            // The blobs live in a small box; anything past it is empty space.
            if (t > 5.0) break;
        }

        if (hit < 0.5) discard;

        vec3 p = ro + rd * t;
        vec3 n = normalAt(p);
        vec3 v = -rd;

        // Colour runs with height rather than with the surface, so a blob
        // changes colour as it rises instead of carrying its own paint.
        float h = clamp(p.y * 0.9 + 0.5, 0.0, 1.0);
        vec3 col = mix(uBottom, uTop, h);

        // Lit from the front-left, plus a wrap term so the shadowed side does
        // not go black — wax is translucent and never fully dark.
        vec3 L = normalize(vec3(-0.4, 0.7, 0.8));
        float diff = max(dot(n, L), 0.0);
        float wrap = 0.5 + 0.5 * dot(n, L);
        col *= 0.35 + diff * 0.6 + wrap * 0.25;

        // A rim that reads as light passing through the thin edge of the blob.
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        col += mix(uBottom, uTop, h) * fres * uGlow;

        vec3 hv = normalize(L + v);
        col += uSheen * pow(max(dot(n, hv), 0.0), uGloss) * 0.6;

        gl_FragColor = vec4(col, 1.0);
    }
`

class LavaScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    // Where the cursor is, in the blobs' own coordinates, and how much of the
    // pull is currently applied — eased in on arrival, out on leaving.
    private pointer = new THREE.Vector2(0, 0)
    private pointerTarget = new THREE.Vector2(0, 0)
    private grip = 0
    private gripTarget = 0
    private time = 0
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        // Capped at 1.5 rather than 2: every pixel walks its own ray, so the
        // cost here is squarely in the fragment stage.
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
            fragmentShader: LAVA_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uTop: { value: new THREE.Color(cfg.top) },
                uBottom: { value: new THREE.Color(cfg.bottom) },
                uSheen: { value: new THREE.Color(cfg.sheen) },
                uTime: { value: 0 },
                uCount: { value: S.blobs },
                uScale: { value: S.scale },
                uViscosity: { value: S.viscosity },
                uGlow: { value: S.glow },
                uGloss: { value: S.gloss },
                uWander: { value: S.wander },
                uZoom: { value: S.zoom },
                uPointer: { value: new THREE.Vector2(0, 0) },
                uMagnet: { value: 0 },
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

    /**
     * Screen position to the blobs' own coordinates.
     *
     * The blobs live around the origin and the camera looks down -z, so a
     * pointer is projected onto the z = 0 plane: the ray through a screen point
     * reaches that plane at CAM_Z / RAY_FOCAL times its screen offset. Doing
     * this with the same two numbers the shader marches with is what keeps the
     * cut under the cursor at every frame size and zoom.
     */
    private toField(e: PointerEvent): THREE.Vector2 | null {
        const el = this.renderer.domElement
        const rect = el.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return null
        const aspect = rect.width / rect.height
        const zoom = settingsFor(this.cfg).zoom
        const vx = (e.clientX - rect.left) / rect.width
        // The quad's uv runs bottom-up where the page runs top-down.
        const vy = 1 - (e.clientY - rect.top) / rect.height
        const k = CAM_Z / RAY_FOCAL
        return new THREE.Vector2(
            (vx - 0.5) * zoom * aspect * k,
            (vy - 0.5) * zoom * k
        )
    }

    private bindEvents() {
        const el = this.renderer.domElement
        el.style.touchAction = "none"

        const move = (e: PointerEvent) => {
            const p = this.toField(e)
            if (!p) return
            this.pointerTarget.copy(p)
            this.gripTarget = 1
        }
        const leave = () => {
            // The pointer's last position is kept, so the blobs let go from
            // where they were reaching rather than from wherever the pointer
            // happened to exit.
            this.gripTarget = 0
        }

        el.addEventListener("pointermove", move)
        el.addEventListener("pointerenter", move)
        el.addEventListener("pointerleave", leave)
        el.addEventListener("pointercancel", leave)
        this.unbind = () => {
            el.removeEventListener("pointermove", move)
            el.removeEventListener("pointerenter", move)
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
        u.uTop.value.set(cfg.top || "#ffffff")
        u.uBottom.value.set(cfg.bottom || "#ffffff")
        u.uSheen.value.set(cfg.sheen || "#ffffff")
        u.uCount.value = S.blobs
        u.uScale.value = S.scale
        u.uViscosity.value = S.viscosity
        u.uGlow.value = S.glow
        u.uGloss.value = S.gloss
        u.uWander.value = S.wander
        u.uZoom.value = S.zoom
        // Nothing here owns a buffer: the entire scene is one quad.
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

        /*
         * Both the grip and the pointer are eased, per second rather than per
         * frame, so this behaves the same at 30Hz and 120Hz.
         *
         * The position lags deliberately: wax has weight, and blobs that track
         * the cursor exactly read as a cursor effect, where blobs arriving a
         * moment late read as something being dragged.
         */
        this.grip += (this.gripTarget - this.grip) * (1 - Math.exp(-dt * 4.0))
        this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-dt * 9.0))

        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uPointer.value.copy(this.pointer)
        u.uMagnet.value = S.magnet * this.grip
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

export interface LavaLampProps {
    top?: string
    bottom?: string
    sheen?: string
    blobs?: number
    scale?: number
    viscosity?: number
    speed?: number
    glow?: number
    gloss?: number
    wander?: number
    magnet?: number
    sizePercent?: number
    style?: React.CSSProperties
}

function __BaseImpl_LavaLamp(props: LavaLampProps) {
    const {
        top = DEFAULTS.top,
        bottom = DEFAULTS.bottom,
        sheen = DEFAULTS.sheen,
        blobs = DEFAULTS.blobs,
        scale = DEFAULTS.scale,
        viscosity = DEFAULTS.viscosity,
        speed = DEFAULTS.speed,
        glow = DEFAULTS.glow,
        gloss = DEFAULTS.gloss,
        wander = DEFAULTS.wander,
        magnet = DEFAULTS.magnet,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<LavaScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        top,
        bottom,
        sheen,
        blobs,
        scale,
        viscosity,
        speed,
        glow,
        gloss,
        wander,
        magnet,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: LavaScene
        try {
            scene = new LavaScene(container, cfgRef.current)
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
        top,
        bottom,
        sheen,
        blobs,
        scale,
        viscosity,
        speed,
        glow,
        gloss,
        wander,
        magnet,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Lava lamp"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 160,
                overflow: "hidden",
                ...style,
            }}
        />
    )
}

LavaLamp.displayName = "Lava Lamp"
LavaLamp.defaultProps = { ...DEFAULTS }

const __presetProps = {
  "top": "#FFFE00",
  "bottom": "#13BB00",
  "sheen": "#FFF400",
  "blobs": 20,
  "scale": 5,
  "viscosity": 5,
  "wander": 10,
  "speed": 20,
  "glow": 20,
  "gloss": 20,
  "magnet": 20,
  "sizePercent": 75
};

export default function LavaLamp(props: Record<string, unknown>) {
  return <__BaseImpl_LavaLamp {...(__presetProps as Record<string, unknown>)} {...props} />;
}
