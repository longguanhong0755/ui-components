"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

// ---------------------------------------------------------------------------
// Scene constants
// ---------------------------------------------------------------------------

const FOV = 45
const CAM_Z = 2
/** World height of the plane that exactly fills the frustum at CAM_Z. */
const PLANE_H = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360)
/**
 * The plane is drawn 8% larger than the frustum. The vertex tilt pushes the far
 * corners AWAY from the camera, which shrinks their projection — without the
 * overscan the background would show as a wedge along the receding edge.
 * The shader converts plane-uv back to canvas-uv (see CANVAS_UV) so the effect
 * field and the mouse stay in the same space.
 */
const OVERSCAN = 1.08
/** Vertex displacement toward/away from the camera, world units. */
const TILT = 0.1
/** Hover damping rate the Speed control is a fraction of: 50 = this, per second. */
const REF_RATE = 3.1
/**
 * Full-burn front velocity the Speed control is a fraction of, world units per
 * second (frame height == 1). A VELOCITY, not a duration: a centre click on a
 * 3:2 frame travels ~0.97 world units (~1.2s at Speed 50) and a corner click
 * ~1.95 (~2.4s). Farther honestly takes longer.
 */
const REF_BURN_VEL = 0.8
/** How fast the pointer follower chases the pointer, per second. */
const MOUSE_RATE = 9
/**
 * Raggedness is a paper-FIBRE scale, so it must not grow with the front. Capped
 * at the radius the component shipped at (Reveal Size 60% -> 0.30), which keeps
 * the pocket bit-identical at the default, still scales the wobble down on a
 * small pocket, and stops the full-frame front reading as a smooth circle.
 * Mirrored as RAGGED_CAP in the fragment shader — keep the two in step.
 */
const RAGGED_CAP = 0.3

/** Front driver states. */
const IDLE = 0
const BURNING = 1
const BURNED = 2
const UNBURNING = 3

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

// three's ShaderMaterial prelude already declares `position`, `uv`,
// `modelViewMatrix` and `projectionMatrix` — do not redeclare them here.
const VERTEX_SRC = /* glsl */ `
uniform vec2 uResolution;
uniform vec2 uSize1;
uniform vec2 uSize2;
uniform vec2 uMouse;
uniform float uTilt;

varying vec2 vUv;
varying vec2 vUv1;
varying vec2 vUv2;

// object-fit: cover. Shrink the sampled range on whichever axis overflows so
// the image is cropped, never stretched.
vec2 coverUv(vec2 p, vec2 res, vec2 img) {
    float ra = res.x / max(res.y, 1.0);
    float ia = img.x / max(img.y, 1.0);
    vec2 s = ra > ia ? vec2(1.0, ia / ra) : vec2(ra / ia, 1.0);
    return (p - 0.5) * s + 0.5;
}

void main() {
    vUv = uv;
    vUv1 = coverUv(uv, uResolution, uSize1);
    vUv2 = coverUv(uv, uResolution, uSize2);

    // Subtle plane tilt: the quadrant under the cursor leans toward the camera.
    // Driven by the LIVE pointer, not the frozen burn epicentre, so the plane
    // still responds while the burn runs.
    vec3 pos = position;
    vec2 m = uMouse * 2.0 - 1.0;
    vec2 c = uv - 0.5;
    pos.z += (c.x * m.x + c.y * m.y) * uTilt;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const FRAGMENT_SRC = /* glsl */ `
precision highp float;

#define OVERSCAN ${OVERSCAN.toFixed(4)}
#define RAGGED_CAP ${RAGGED_CAP.toFixed(4)}

uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform vec2 uCenter;              // canvas-uv: pointer while idle, click point while burning
uniform float uFront;              // signed front radius, world units (frame height == 1)
uniform float uRevealRadius;       // pocket radius, world units — scales fibre + ember
uniform float uTime;
uniform vec2 uResolution;
uniform float uDistortionStrength; // 0..1
uniform float uEmberWidth;         // 0..1 of the pocket radius
uniform vec3 uEmberColor;

varying vec2 vUv;
varying vec2 vUv1;
varying vec2 vUv2;

// --- 2D simplex noise (Ashima / Gustavson), range ~[-1, 1] ------------------
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// 4 octaves, range ~[-0.94, 0.94].
float fbm(vec2 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 4; i++) {
        s += a * snoise(p);
        p *= 2.02;
        a *= 0.5;
    }
    return s;
}

void main() {
    // Plane-uv -> canvas-uv, so the field and the centre share one space
    // regardless of the overscan the tilt needs.
    vec2 cu = (vUv - 0.5) * OVERSCAN + 0.5;

    float aspect = uResolution.x / max(uResolution.y, 1.0);
    // World space: frame height is 1.0, width is the aspect. EVERY threshold
    // below lives here, so the fibre scale and the ember lip keep their real
    // size whether the front is a small pocket or wider than the frame.
    vec2 p = vec2(cu.x * aspect, cu.y);
    vec2 c = vec2(uCenter.x * aspect, uCenter.y);

    float dist = clamp(uDistortionStrength, 0.0, 1.0);
    float R = max(uRevealRadius, 0.01);

    // Antialias width, ~2 CSS px in world units.
    float aa = clamp(2.0 / max(uResolution.y, 1.0), 0.0005, 0.05);

    // Everything that must collapse as the hole closes reads open, which is
    // just the front measured against the pocket radius. The CPU never sends a
    // second progress scalar — hover and burn are the same field.
    float open = clamp(uFront / R, 0.0, 1.0);

    float d = distance(p, c);

    // Ragged rim: noise pushes the front in and out so the edge never reads as
    // a circle. Amplitude is capped at the fibre scale (see RAGGED_CAP).
    float n = clamp(fbm(p * 3.0 + vec2(0.0, uTime * 0.05)) * 0.5 + 0.5, 0.0, 1.0);
    float ragged = d + (n * 2.0 - 1.0) * 0.35 * min(R, RAGGED_CAP) * open;

    // Ember width is a fraction of the pocket radius and collapses with open,
    // so a resting frame is untouched texture 1 at ANY ember width, Reveal Size
    // or canvas height: the CPU parks the front at -(aa + 0.014 * R), which is
    // always outside both the char band (2w) and the reveal feather (aa).
    float w = R * max(uEmberWidth * open, 0.004);

    // Negative inside the hole, positive on the unburned side, zero at the front.
    float burn = ragged - uFront;

    // Heat shimmer: refract the unburned image near the front only.
    float shimmer = (1.0 - smoothstep(0.0, w * 3.0, abs(burn))) * dist * 0.05;
    vec2 q = vec2(snoise(p * 6.0 + uTime * 0.6),
                  snoise(p * 6.0 + 31.7 - uTime * 0.5)) * shimmer;

    vec3 c1 = texture2D(uTexture1, vUv1 + q).rgb;
    vec3 c2 = texture2D(uTexture2, vUv2).rgb;

    // Char band, ahead of the front and fading out over 2w. Applied to c1, so
    // the reveal below masks it out inside the hole.
    float charAmt = 1.0 - smoothstep(0.0, w * 2.0, burn);
    c1 = mix(c1, c1 * vec3(0.12, 0.09, 0.08), charAmt * 0.9);

    float reveal = 1.0 - smoothstep(-aa, aa, burn);
    vec3 col = mix(c1, c2, reveal);

    // Ember lip: burn in [0, w], hottest at the front, killed on the
    // already-revealed side so it never glows over texture 2.
    float ember = clamp(smoothstep(w, 0.0, burn)
                      * smoothstep(-4.0 * aa, aa, burn), 0.0, 1.0);
    vec3 hot = mix(uEmberColor, vec3(1.0, 0.92, 0.62), pow(ember, 5.0));
    col = mix(col, hot, ember);
    col += uEmberColor * pow(ember, 2.0) * 0.7;

    gl_FragColor = vec4(col, 1.0);
}
`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** #fff | #rrggbb | #rrggbbaa | rgb()/rgba() -> linear-ish 0..1 triple. */
function parseColor(input: string | undefined, fallback: [number, number, number]) {
    if (!input) return fallback
    const s = input.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) {
            h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
        }
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n)) {
                return [
                    ((n >> 16) & 255) / 255,
                    ((n >> 8) & 255) / 255,
                    (n & 255) / 255,
                ] as [number, number, number]
            }
        }
        return fallback
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const parts = m[1].split(",").map((x) => parseFloat(x))
        if (parts.length >= 3 && parts.every((x) => !isNaN(x))) {
            return [parts[0] / 255, parts[1] / 255, parts[2] / 255] as [
                number,
                number,
                number,
            ]
        }
    }
    return fallback
}

const EMBER_FALLBACK: [number, number, number] = [1, 0.27, 0]

interface LiquidBurnRevealProps {
    image1?: string
    image2?: string
    /** 0-100, 50 = the rate this component shipped at. Drives hover AND burn. */
    animationSpeed?: number
    /** Percent. */
    distortionStrength?: number
    emberColor?: string
    /** Percent of the pocket radius. */
    emberWidth?: number
    /** Pocket diameter as a percent of the frame height. */
    revealSize?: number
    style?: React.CSSProperties
}

/**
 * Live inputs the rAF loop reads. Everything here is written by a render-time
 * effect and never by the loop's own deps, so a property edit cannot restart
 * the loop or rebuild the GL context.
 */
interface Live {
    target: number
    speed: number
    distortion: number
    emberWidth: number
    radius: number
    ember: [number, number, number]
    mouseX: number
    mouseY: number
    interactive: boolean
}

export default function LiquidBurnReveal(props: LiquidBurnRevealProps) {
    const {
        image1 = "https://images.unsplash.com/photo-1506260408121-e353d10b87c7?q=80&w=2728&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D\n",
        image2 = "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        animationSpeed = 50,
        distortionStrength = 25,
        emberColor = "#FF4500",
        emberWidth = 8,
        revealSize = 33,
        style,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const uniformsRef = useRef<Record<string, THREE.IUniform> | null>(null)

    const url1 = image1 || ""
    const url2 = image2 || ""

    const live = useRef<Live>({
        target: 0,
        speed: 50,
        distortion: 0.25,
        emberWidth: 0.08,
        radius: 0.3,
        ember: EMBER_FALLBACK,
        mouseX: 0.5,
        mouseY: 0.5,
        interactive: true,
    })

    // Push props into the ref every render. No deps array on purpose: this is
    // a plain assignment, and it must never be the thing that restarts GL.
    const interactive = true
    live.current.speed = animationSpeed
    live.current.distortion = Math.max(0, Math.min(100, distortionStrength)) / 100
    live.current.emberWidth = Math.max(1, Math.min(20, emberWidth)) / 100
    // Reveal Size is a DIAMETER as a percent of the frame height; the shader
    // wants a radius in a space where the frame height is 1.0.
    live.current.radius = (Math.max(5, Math.min(150, revealSize)) / 100) * 0.5
    live.current.ember = parseColor(emberColor, EMBER_FALLBACK)
    live.current.interactive = interactive

    // ---- GL: built once ---------------------------------------------------
    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        let renderer: THREE.WebGLRenderer
        try {
            renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: false,
                alpha: true,
                powerPreference: "high-performance",
            })
        } catch {
            return
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        // Pass-through colour: the shader mixes raw texel values and an sRGB
        // hex ember, so no encode/decode should happen on either end.
        renderer.outputColorSpace = THREE.LinearSRGBColorSpace

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100)
        camera.position.z = CAM_Z

        // 1x1 dark pixel so the samplers are bound before the photos land.
        const placeholder = new THREE.DataTexture(
            new Uint8Array([17, 17, 17, 255]),
            1,
            1,
            THREE.RGBAFormat
        )
        placeholder.needsUpdate = true

        const uniforms: Record<string, THREE.IUniform> = {
            uTexture1: { value: placeholder },
            uTexture2: { value: placeholder },
            uCenter: { value: new THREE.Vector2(0.5, 0.5) },
            uFront: { value: -1 },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(1, 1) },
            uDistortionStrength: { value: 0.25 },
            uEmberWidth: { value: 0.08 },
            uRevealRadius: { value: 0.3 },
            uEmberColor: { value: new THREE.Vector3(1, 0.27, 0) },
            uSize1: { value: new THREE.Vector2(1, 1) },
            uSize2: { value: new THREE.Vector2(1, 1) },
            uTilt: { value: TILT },
        }
        uniformsRef.current = uniforms

        // 48x48 segments: enough for the tilt to read as a plane, not a fan.
        const geometry = new THREE.PlaneGeometry(1, 1, 48, 48)
        const material = new THREE.ShaderMaterial({
            vertexShader: VERTEX_SRC,
            fragmentShader: FRAGMENT_SRC,
            uniforms,
            transparent: false,
            depthTest: false,
            depthWrite: false,
        })
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)

        // ---- sizing -------------------------------------------------------
        let cw = 0
        let ch = 0
        const resize = () => {
            const w = host.clientWidth || 1200
            const h = host.clientHeight || 800
            if (w === cw && h === ch) return
            cw = w
            ch = h
            renderer.setSize(w, h, false)
            camera.aspect = w / h
            camera.updateProjectionMatrix()
            mesh.scale.set(PLANE_H * camera.aspect * OVERSCAN, PLANE_H * OVERSCAN, 1)
            ;(uniforms.uResolution.value as THREE.Vector2).set(w, h)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(host)

        // ---- front driver state -------------------------------------------
        let mode = IDLE
        /** Signed front radius, world units. Seeded closed, or open on canvas. */
        let front = live.current.interactive ? -0.1 : live.current.radius
        /** Smoothed pointer — drives the tilt always, and the centre while idle. */
        let mx = 0.5
        let my = 0.5
        /** Burn epicentre. Frozen at the pointer on ignition. */
        let cx = 0.5
        let cy = 0.5

        /** ~2 CSS px in world units. Must match the shader's aa. */
        const aaOf = () => Math.min(Math.max(2 / (ch || 800), 0.0005), 0.05)
        /**
         * Where the closed front parks: outside the char band (2w) AND outside
         * the reveal feather (aa), so a resting frame is untouched texture 1.
         */
        const closedOf = (R: number) => -(aaOf() + 0.014 * R)
        /**
         * Front radius that has consumed the whole upper layer: the farthest
         * corner of the OVERSCAN box from the frozen epicentre, padded so the
         * last ragged wisp, the ember lip and the feather all clear the frame.
         * Recomputed every frame, so editing Reveal Size or resizing the host
         * mid-burn can never leave a surviving sliver.
         */
        const fullOf = (R: number) => {
            const A = (cw || 1200) / (ch || 800)
            const ov = (OVERSCAN - 1) / 2
            const x0 = -ov * A
            const x1 = (1 + ov) * A
            const y0 = -ov
            const y1 = 1 + ov
            const ox = cx * A
            const oy = cy
            const d = Math.max(
                Math.hypot(x0 - ox, y0 - oy),
                Math.hypot(x1 - ox, y0 - oy),
                Math.hypot(x0 - ox, y1 - oy),
                Math.hypot(x1 - ox, y1 - oy)
            )
            const amp = 0.35 * Math.min(R, RAGGED_CAP)
            const w = R * Math.max(live.current.emberWidth, 0.004)
            return d + amp + 2 * w + 4 * aaOf()
        }

        // ---- pointer ------------------------------------------------------
        // Native listeners rather than React props: hover must not re-render.
        const onEnter = () => {
            if (live.current.interactive) live.current.target = 1
        }
        const onLeave = () => {
            if (live.current.interactive) live.current.target = 0
        }
        const onMove = (e: PointerEvent) => {
            if (!live.current.interactive) return
            // getBoundingClientRect is correct HERE and only here: clientX is in
            // the same zoomed space as the rect, so the ratio cancels the zoom.
            const r = host.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            live.current.mouseX = (e.clientX - r.left) / r.width
            live.current.mouseY = 1 - (e.clientY - r.top) / r.height
        }
        /**
         * Ignite, or reverse. The epicentre is frozen at the SMOOTHED pointer,
         * which is exactly where the pocket rim already is, so the front is
         * continuous even when the click lands mid-open. A click at any moment
         * flips the direction: nothing is one-shot, and nothing waits.
         */
        const onDown = () => {
            if (!live.current.interactive) return
            if (mode === IDLE) {
                cx = mx
                cy = my
                mode = BURNING
            } else if (mode === BURNING || mode === BURNED) {
                mode = UNBURNING
            } else {
                mode = BURNING
            }
        }
        host.addEventListener("pointerenter", onEnter)
        host.addEventListener("pointerleave", onLeave)
        host.addEventListener("pointermove", onMove, { passive: true })
        host.addEventListener("pointerdown", onDown)
        // A pointer that leaves through the window edge never fires
        // pointerleave on the host — release on window too.
        const onWindowOut = (e: PointerEvent) => {
            if (!e.relatedTarget) onLeave()
        }
        window.addEventListener("pointerout", onWindowOut)
        window.addEventListener("blur", onLeave)

        // ---- loop ---------------------------------------------------------
        let raf = 0
        let prev = performance.now()
        let elapsed = 0

        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            const dt = Math.min((now - prev) / 1000, 0.05)
            prev = now
            elapsed += dt

            const L = live.current
            const R = Math.max(L.radius, 0.01)
            const speed = Math.max(0, Math.min(100, L.speed)) / 50

            // The tilt tracks the live pointer in every mode.
            const km = 1 - Math.exp(-MOUSE_RATE * dt)
            mx += (L.mouseX - mx) * km
            my += (L.mouseY - my) * km

            if (mode === IDLE) {
                // Hover pocket: frame-rate independent damping toward the
                // capped radius. Speed 0 genuinely freezes, 50 is the shipped
                // rate. The centre follows the pointer.
                cx = mx
                cy = my
                const closed = closedOf(R)
                const target = L.target > 0.5 ? R : closed
                const rate = speed * REF_RATE
                const k = rate > 0 ? 1 - Math.exp(-rate * dt) : 0
                front += (target - front) * k
            } else {
                // Full burn: integrate the front at a VELOCITY (rule P), from
                // the frozen epicentre, so a corner click honestly takes longer
                // than a centre one.
                const vel = speed * REF_BURN_VEL
                if (mode === BURNING) {
                    const full = fullOf(R)
                    front = Math.min(front + vel * dt, full)
                    if (front >= full) mode = BURNED
                } else if (mode === BURNED) {
                    // Hold. Recomputed so a resize keeps the frame consumed.
                    front = fullOf(R)
                } else {
                    // Rewind. The frozen epicentre drifts back to the live
                    // pointer at the follower's own rate, so by the time the
                    // front is down to pocket size the centre has already
                    // arrived and IDLE's cx = mx is a no-op, not a jump.
                    cx += (mx - cx) * km
                    cy += (my - cy) * km
                    // A pointer still over the host takes the hole back AS a
                    // pocket the moment the front reaches Reveal Size — it
                    // never collapses to nothing and pops open again. With the
                    // pointer gone there is no pocket to land in, so it runs
                    // all the way closed as before.
                    const floor = L.target > 0.5 ? R : closedOf(R)
                    // Guarded, never a bare max(): reversing a burn that had
                    // not yet grown past R would otherwise snap the front UP
                    // to the floor. Below it, hand straight back and let the
                    // hover damping own the rest.
                    if (front > floor) front = Math.max(front - vel * dt, floor)
                    if (front <= floor) mode = IDLE
                }
            }

            uniforms.uTime.value = elapsed
            uniforms.uFront.value = front
            ;(uniforms.uCenter.value as THREE.Vector2).set(cx, cy)
            ;(uniforms.uMouse.value as THREE.Vector2).set(mx, my)
            uniforms.uDistortionStrength.value = L.distortion
            uniforms.uEmberWidth.value = L.emberWidth
            uniforms.uRevealRadius.value = R
            ;(uniforms.uEmberColor.value as THREE.Vector3).set(
                L.ember[0],
                L.ember[1],
                L.ember[2]
            )

            renderer.render(scene, camera)
        }
        raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointerenter", onEnter)
            host.removeEventListener("pointerleave", onLeave)
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerout", onWindowOut)
            window.removeEventListener("blur", onLeave)
            scene.remove(mesh)
            geometry.dispose()
            material.dispose()
            placeholder.dispose()
            uniformsRef.current = null
            // dispose() only, never forceContextLoss(): the canvas hands back
            // the same context next mount and a force-lost one renders black.
            renderer.dispose()
        }
    }, [])

    // ---- textures: reload only when a URL changes -------------------------
    useEffect(() => {
        const uniforms = uniformsRef.current
        if (!uniforms) return

        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin("anonymous")
        const owned: THREE.Texture[] = []
        let cancelled = false

        const load = (url: string, slot: "uTexture1" | "uTexture2", sizeKey: string) => {
            if (!url) return
            loader.load(
                url,
                (tex: THREE.Texture) => {
                    if (cancelled) {
                        tex.dispose()
                        return
                    }
                    tex.minFilter = THREE.LinearFilter
                    tex.magFilter = THREE.LinearFilter
                    tex.generateMipmaps = false
                    tex.wrapS = THREE.ClampToEdgeWrapping
                    tex.wrapT = THREE.ClampToEdgeWrapping
                    // Left at the default (no colour space) so the texel value
                    // reaches the shader exactly as authored — see the
                    // LinearSRGBColorSpace note on the renderer.
                    owned.push(tex)
                    uniforms[slot].value = tex
                    const img = tex.image as { width: number; height: number }
                    ;(uniforms[sizeKey].value as THREE.Vector2).set(
                        img.width || 1,
                        img.height || 1
                    )
                },
                undefined,
                () => {
                    /* keep the placeholder on a failed load */
                }
            )
        }

        load(url1, "uTexture1", "uSize1")
        load(url2, "uTexture2", "uSize2")

        return () => {
            cancelled = true
            for (const t of owned) t.dispose()
        }
    }, [url1, url2])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the spread so an explicit size on the instance
                // still wins, and a Fit-Content root cannot collapse to 0x0.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                isolation: "isolate",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                }}
            />
        </div>
    )
}
