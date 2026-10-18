"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { animate, motionValue } from "motion/react"

/**
 * framer-motion's `animate()` option bag. `AnimationOptions` is not exported by
 * the copy of framer-motion that ships inside Framer, and its `Transition` type
 * is not assignable to what `animate(value, …)` accepts, so the shape is
 * spelled out here — a type alias, not an interface, or it loses the implicit
 * index signature the intersection needs.
 */
type Motion = {
    type?: "spring" | "tween" | "keyframes" | "inertia"
    duration?: number
    ease?: [number, number, number, number]
    delay?: number
    stiffness?: number
    damping?: number
    mass?: number
    bounce?: number
    restSpeed?: number
    restDelta?: number
}

/**
 * The hover gate's settle. The scene shipped with an exponential approach whose
 * rate came from a frozen HOVER_DAMPING of 80 — ~0.85s to land. That constant
 * and the `hEase` it fed are gone: a hand-rolled damping number is exactly what
 * ControlType.Transition replaces (rule 2), and it now carries native Spring
 * physics instead.
 */
const DEFAULT_TRANSITION: Motion = {
    type: "tween",
    duration: 0.85,
    // easeOut, as the cubic-bezier the tuple type needs.
    ease: [0, 0, 0.58, 1],
}

/**
 * PLASMA RING — sphere particle mesh with Fresnel rim for Framer.
 *
 * GEOMETRY  — sphere parametric (phi, theta). phi = latitude (−π/2..π/2),
 * theta = longitude (0..2π). Every particle sits on the sphere surface at
 * R * (cos φ·cos θ, sin φ, cos φ·sin θ). Outward normal = position / R.
 *
 * RING APPEARANCE  — Fresnel rim: alpha = pow(1 - |dot(norm, camDir)|, rimPower).
 * Normals facing the camera → invisible (center of sphere = dark hole).
 * Normals perpendicular to camera → fully bright (silhouette = the ring).
 * The "ring" is the silhouette of a sphere, not a torus.
 *
 * COLOUR  — by sphere latitude (world Y). A ramp of up to MAX_COLORS stops is
 * walked from the top pole (φ = +π/2, stop 0) to the bottom pole (φ = −π/2,
 * last stop). Poles additively bloom white.
 *
 * NOISE  — 3-octave fBm displaces each particle along its outward normal.
 * Displacement rotates edge-on normals slightly, fattening the visible ring
 * into the organic, cloth-like band seen in the reference.
 *
 * HOVER BULGE  — cursor ray is intersected with the sphere on the CPU. The
 * hit point becomes a world-space direction; the shader adds a gaussian outward
 * push to nearby particles, widening the Fresnel ring locally so the surface
 * "swells toward the viewer" under the pointer.
 *
 * Camera orbit: click-and-drag accumulates yaw/pitch, eased with damping.
 * Bind release on window, not host (CLAUDE.md gotcha). No loseContext().
 *
 * Rotation convention:
 *   x1 =  x·cy + z·sy
 *   z1 = −x·sy + z·cy          ← yaw around world Y
 *   y2 =  y·cp − z1·sp
 *   z2 =  y·sp + z1·cp         ← pitch around camera X
 *   rz = camDist − z2
 *
 * Camera world direction (from origin TO camera, = M⁻¹·(0,0,camDist)/camDist):
 *   camDir = (−sin(yaw)·cos(tp),  sin(tp),  cos(yaw)·cos(tp))
 * where tp = camPitch + tilt.
 */

/* ---------------------------------------------------------------- constants */

const DPR_CAP = 1.5
const FOV_DEG = 42
const TAU = Math.PI * 2

// Latitude ramp stops. Five is the cap: the ramp is walked by a fixed-bound
// loop in the vertex shader (WebGL1 forbids indexing a uniform array with a
// non-constant expression), so the bound is compiled in.
// Stop 1 is the TOP pole, the last stop is the BOTTOM pole — list order reads
// down the sphere. The two defaults are the colours the ring shipped with.
const MAX_COLORS = 5
const DEFAULT_COLORS = ["#FF3300", "#0055FF"]

/* ------------------------------------------------------------------ shaders */

// Sphere surface pass — Fresnel rim + noise + hover bulge. The only pass:
// there used to be a second one for the burst stream, removed with the burst.
const VERT_SPHERE = `
precision highp float;

// phi = latitude (−π/2..π/2), theta = longitude (0..2π)
attribute vec2 aPolar;
// x = size/brightness seed, y = noise phase seed
attribute vec2 aRnd;

uniform vec2  uRes;
uniform float uFocal;
uniform float uTime;
uniform float uRadius;
uniform float uWaveHeight;
uniform float uWaveLength;
uniform float uWaveSpeed;
uniform vec2  uWaveDir;    // unit direction vector in XZ plane (sin(da), cos(da))
uniform float uCamDist;
uniform float uCamYaw;
uniform float uCamPitch;
uniform float uTilt;
uniform float uRimPower;   // Fresnel sharpness — higher = thinner ring
uniform float uCenter;     // 0..1 alpha floor — fills the dark centre hole

// colour — latitude ramp, stop 0 = top pole, stop uColorCount-1 = bottom pole
uniform float uColorCount;
uniform vec3  uColors[${MAX_COLORS}];
uniform vec3  uHotspot;    // white bloom, mixed at poles

// camDir = normalised direction from sphere origin TO camera (world space)
// Derivation: M^{-1} · (0,0,1) = column 2 of M^T
//   = (−sin(yaw)·cos(tp),  sin(tp),  cos(yaw)·cos(tp))
uniform vec3  uCamDir;

// hover
uniform vec3  uHoverDir;   // normalised world-space dir to cursor hit on sphere
uniform float uHoverRadius;// hover size percentage (0..100)
uniform float uHoverPush;  // bulge amplitude
uniform float uHoverActive;// 0..1 eased

varying vec3  vCol;
varying float vAlpha;

/* ---- 3-octave fBm ---- */
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i),            hash2(i + vec2(1,0)), u.x),
               mix(hash2(i + vec2(0,1)), hash2(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) {
        v += a * noise2(p);
        p   = p * 2.3 + vec2(1.7, 9.2);
        a  *= 0.5;
    }
    return v;
}

/* ---- latitude ramp ----
 * Piecewise-linear walk across the palette, x = 0 at stop 0 (top pole) to
 * x = 1 at the last stop (bottom pole). WebGL1 forbids uColors[idx] with a
 * non-constant idx, so both ends of the segment are fished out by a
 * fixed-bound loop. Slots past uColorCount are filled with the LAST entry on
 * the CPU, so the i0 + 1 lookup can never land on a stale colour. */
vec3 rampColor(float x) {
    float p  = clamp(x, 0.0, 1.0) * max(uColorCount - 1.0, 0.0);
    float i0 = floor(p);
    float f  = p - i0;
    vec3 a = uColors[0];
    vec3 b = uColors[0];
    for (int i = 0; i < ${MAX_COLORS}; i++) {
        if (float(i) == i0)       a = uColors[i];
        if (float(i) == i0 + 1.0) b = uColors[i];
    }
    return mix(a, b, f);
}

void main() {
    float phi   = aPolar.x;
    float theta = aPolar.y;

    float sp  = sin(phi); float cp2 = cos(phi);
    float st  = sin(theta); float ct = cos(theta);

    // Outward normal = position on unit sphere
    vec3 norm = vec3(cp2 * ct, sp, cp2 * st);
    vec3 pos  = norm * uRadius;

    // ── Wave Surface Turbulence ───────────────────────────────────────────────
    // Continuous 3D wave motion driven by Wave Height, Wave Length, Wave Speed, and Wave Direction
    float wFreq = 6.2831853 / max(100.0, uWaveLength);
    float proj1 = norm.x * uWaveDir.x + norm.z * uWaveDir.y;
    float proj2 = norm.x * uWaveDir.y - norm.z * uWaveDir.x;
    // Every time term runs off the SAME scaled clock, so Speed 0 actually
    // stops the surface. Two of the three used to read the raw uTime, and the
    // sphere kept churning at Speed 0 — a dial that lied about its own low end.
    // ts == uTime at the shipped rate (uWaveSpeed 120), so the motion at
    // Speed 50 is unchanged.
    float ts = uTime * (uWaveSpeed / 120.0);
    float wave1 = sin(proj1 * wFreq * 800.0 + ts * 1.2) * cos(norm.y * wFreq * 600.0 + ts * 0.3);
    float wave2 = sin(proj2 * wFreq * 600.0 + norm.y * 1.5 - ts * 0.5);
    float smoothWave = (wave1 + wave2 * 0.5) * uWaveHeight;
    pos += norm * smoothWave;

    // ── Hover bulge & illumination spotlight ──────────────────────────────────
    // hFalloff dynamically scales hover area size from tight dot (22.0) to wide area (1.5)
    float hFalloff = mix(22.0, 1.5, clamp(uHoverRadius / 100.0, 0.0, 1.0));
    float hDot     = max(0.0, dot(norm, uHoverDir));
    float hEffect  = exp(-(1.0 - hDot) * hFalloff) * uHoverActive;
    float hBulge   = hEffect * uHoverPush;
    pos += norm * hBulge;

    // ── Camera rotation (yaw→pitch) ──────────────────────────────────────────
    float cy  = cos(uCamYaw); float sy = sin(uCamYaw);
    float tp  = uCamPitch + uTilt;
    float ctp = cos(tp);      float stp = sin(tp);

    float x1  =  pos.x * cy + pos.z * sy;
    float z1  = -pos.x * sy + pos.z * cy;
    float y2  =  pos.y * ctp - z1 * stp;
    float z2  =  pos.y * stp + z1 * ctp;
    float rz  =  uCamDist - z2;

    if (rz < 1.0) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        vAlpha = 0.0; vCol = vec3(0.0); return;
    }

    float sx  = x1 * uFocal / rz;
    float sy2 = y2 * uFocal / rz;
    gl_Position  = vec4(sx / (uRes.x * 0.5), sy2 / (uRes.y * 0.5), 0.0, 1.0);

    // ── Fresnel rim & Hover center mesh illumination ─────────────────────────
    // uCamDir points FROM origin TO camera in world space.
    // rimDot = 1 → facing camera (center hole). rimDot = 0 → silhouette edge.
    float rimDot  = abs(dot(norm, uCamDir));
    float fresnel = pow(max(1.0 - rimDot, 0.0), uRimPower);

    // Centre fill. An alpha floor WEIGHTED BY rimDot, which is exactly how
    // much a strand faces the camera — 1 dead centre, 0 at the silhouette.
    // A flat floor was measurably wrong: it lifted every mid-angle strand too,
    // and those project near the ring, so at 100% the silhouette itself gained
    // ~57/255 of additive haze and the ring stopped being the brightest thing
    // in frame. Weighted, the fill is strongest where the hole is and fades to
    // nothing at the edge. 0 leaves the hollow void.
    fresnel = max(fresnel, uCenter * rimDot);

    // On hover, illuminate center mesh lines around cursor spotlight
    float hoverAlpha = hEffect * 0.95;
    float finalAlpha = max(fresnel, hoverAlpha);

    float bri = 0.50 + aRnd.x * 0.50;

    // ── Colour: by sphere latitude (world Y = R·sin φ) ───────────────────────
    float t      = sp * 0.5 + 0.5;            // 0 = bottom pole, 1 = top pole
    // Ramp runs top -> bottom, so it is walked with 1 - t. Two stops reproduce
    // the old mix(bottom, top, t) exactly.
    vec3 baseCol = rampColor(1.0 - t);
    // White bloom at both poles — the silhouette there is brightest
    float polar  = min(pow(abs(sp), 4.0), 1.0);
    vec3 col     = mix(baseCol, uHotspot, polar * 0.88);

    vCol   = col;
    vAlpha = finalAlpha * bri;
}
`

// Fragment for the gl.LINES wireframe.
const FRAG = `
precision highp float;
varying vec3  vCol;
varying float vAlpha;
void main() {
    gl_FragColor = vec4(vCol * vAlpha, vAlpha);
}
`

/* ------------------------------------------------------------------- helpers */

function parseColor(input: string): [number, number, number] {
    if (!input) return [0, 0, 0]
    const s = input.trim()
    const fn = s.match(/rgba?\(([^)]+)\)/i)
    if (fn) {
        const p = fn[1].split(",").map((v) => parseFloat(v.trim()))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }
    let h = s.replace("#", "")
    if (h.length === 3 || h.length === 4)
        h = h.split("").map((c) => c + c).join("")
    h = h.padEnd(6, "0")
    return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
    ]
}

function mulberry32(a: number) {
    return () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        console.warn("PlasmaRing shader:", gl.getShaderInfoLog(sh))
    return sh
}

function linkProg(gl: WebGLRenderingContext, vs: string, fs: string) {
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        console.warn("PlasmaRing link:", gl.getProgramInfoLog(prog))
    return prog
}

/* --------------------------------------------------------------------- props */

/* Panel follows rule 8b — 15 leaf dials, hybrid layout, shared ranges.
 *
 * All 22 rows used to sit inside seven groups with nothing at the top level.
 * The headline dials are now top level. The ring is coloured by LATITUDE, so
 * the palette is a ramp of stops walked from top pole to bottom pole, not a
 * base plus an accent — and there is no `Accent Mix`, because the mix is
 * positional, not a share.
 *
 * Changed keys, clean break, no fallbacks:
 *   colour.topColor/botColor -> colors[]    (top level, up to MAX_COLORS stops)
 *   field.density            -> top level
 *   field.cameraDistance     -> distance -> scale  (top level, 0..100)
 *   wave.waveSpeed           -> speed       (top level, 0..100)
 *   wave.height              -> waveHeight  (top level, titled `Height`)
 *   ring/wave fields         -> prefix dropped inside the group (rule 8)
 *
 * The `Wave` group is gone: `Length` is cut and frozen at 1400, so the modal
 * held a single row. Its `Height` is now the top-level `Height` dial — keyed
 * `waveHeight`, NOT `height`, because Framer injects a numeric `height` size
 * prop and the two would collide. `Direction` is cut and frozen at 45°.
 *
 * `Length` freezes at 200, not at the 1400 it shipped at — a deliberate look
 * change, so the surface ripple is ~7× tighter than before.
 *
 * `Drag Sensitivity` (`dragSensitivity`) is the one control that came BACK: it
 * was the frozen orbit gain, and is now a 0..100 dial defaulting to the 60 it
 * was frozen at.
 *
 * `Center Opacity` (`centerOpacity`) is new behaviour, not a restored dial:
 * an alpha floor under the Fresnel that fills the dark middle. 0 is the
 * hollow ring the scene has always drawn, so the default changes nothing.
 *
 * `Density` now caps at 120, down from 200. A stored value above 120 clamps.
 *
 * Cut and frozen at the shipped value: `ring.rimPower`, the whole `Ring` group
 * (`radius`, `tilt`), and the whole `Hover` and `Orbit` groups. Those
 * behaviours still run exactly as they shipped — only the dials left the panel
 * (rule 8b: a cut freezes the default, it does not delete the behaviour).
 *
 * BURST — REMOVED OUTRIGHT, behaviour and all, on request. Not a rule-8b cut:
 * the bottom-pole radial push, its auto/click state machine, the whole second
 * draw pass with its dotted falling stream, and every uniform feeding them are
 * gone. `Dot Size` went with it — not frozen, DELETED, uniform and all: the
 * sphere is a gl.LINES wireframe, where gl_PointSize is ignored, so the burst
 * stream's particles were the only thing it ever sized.
 *
 * SCALE CHANGE — not migratable, neither of these can be carried by a fallback
 * because the stored number is the same either way:
 *   `speed` was the raw wave rate (0..1000, shipped 120), then a signed
 *   -100..100 dial; it is now unsigned 0..100 where 50 is the shipped rate.
 *   `waveHeight` was 0..140 (shipped 28); it is now 0..20, so a stored value
 *   above 20 clamps and the default moves to 12. Deliberate, not migratable.
 *   `distance` was a camera pullback in world units (400..2500, shipped 900);
 *   it is now `scale`, 0..100, mapped by CAM_FAR - CAM_PER_SCALE * scale.
 */

/* Cut controls (rule 8b), frozen at the value the scene shipped with. */
const RIM_POWER = 3
/** Cut with the `Ring` group. Sphere radius and camera pitch, as shipped. */
const RADIUS = 280
const TILT = 20
const HOVER_RADIUS = 35
const HOVER_PUSH = 90
const ORBIT_DAMPING = 50
/* ORBIT_LIMIT is gone, not frozen: the drag is infinite now. Pitch used to be
 * clamped to ±60°, so a vertical drag hit a wall halfway up the sphere. Both
 * axes now accumulate without a stop and wrap at a full turn (below), so the
 * only thing bounding the orbit is when the designer lets go. */
/** Wave rate at Speed 50 — the rate the ring shipped at. */
const WAVE_AT_50 = 120
/* Cut with the `Direction` dial and the `Wave > Length` row (rule 8b): the
 * panel rows are gone, the render path is unchanged and reads these. 45° is
 * the direction the wave shipped travelling. The wavelength is NOT the shipped
 * 1400: it is frozen at 200 — the bottom of the range the dial used to offer,
 * i.e. the tightest ripple — on request. */
const WAVE_DIRECTION = 45
const WAVE_LENGTH = 200

/* `Scale` -> camera pullback. Linear and inverted: more Scale = closer camera =
 * bigger sphere. The near end (Scale 100 -> 600) stays clear of the sphere's
 * own front cap — RADIUS 280 plus the maximum Height 20 and the hover bulge
 * (90) reaches z = 390, and a camera inside that would put points behind the
 * eye and blow up the perspective divide. Scale 80 = shipped framing (900). */
const CAM_FAR = 2100
const CAM_PER_SCALE = 15

interface Props {
    background?: string
    /** Latitude ramp stops, top pole first, up to MAX_COLORS. */
    colors?: string[]
    density?: number
    /** 0..100; 50 is the rate the ring shipped at */
    speed?: number
    /** Surface displacement, world units, 0..20. Key is NOT `height`: Framer
     *  injects a numeric `height` size prop and the two would collide. */
    waveHeight?: number
    /** 0..100 % — opacity of the sphere's dark centre. 0 is the hollow ring
     *  the scene shipped as; 100 fills it to the same alpha as the rim. */
    centerOpacity?: number
    /** 0..100, inverted camera pullback; 80 is the shipped framing */
    scale?: number
    /** Drag gain, 0..100 — degrees of orbit per pixel dragged, ÷100. 0 pins
     *  the camera. Input gain, deliberately NOT fused with `speed`, which is
     *  the autonomous wave rate (rule 11b). */
    dragSensitivity?: number
    transition?: Motion
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ----------------------------------------------------------------- component */

function __BaseImpl_PlasmaRing(props: Props) {
    const {
        background = "#000000",
        colors = ["#FF3300","#0055FF","#E200FF"],
        density = 120,
        speed = 100,
        waveHeight = 20,
        centerOpacity = 100,
        scale = 36,
        dragSensitivity = 100,
        transition = {"ease":[0,0,0.58,1],"mass":1,"type":"tween","delay":0,"damping":60,"duration":1,"stiffness":800},
        style,
    } = props

    /* The hover gate. A MotionValue read by the loop with .get(), never a
     * setState — and the Transition lives in a ref so changing it cannot land in
     * the GL effect's deps and rebuild the context (rule 6). */
    const hoverMV = useRef(motionValue(0)).current
    const transitionRef = useRef(transition)
    transitionRef.current = transition

    const cameraDistance = CAM_FAR - CAM_PER_SCALE * scale

    const radius = RADIUS
    const tilt = TILT
    const rimPower = RIM_POWER
    // Percent dial -> the shader's 0..1 alpha floor (rule 3).
    const center = centerOpacity / 100
    const waveLength = WAVE_LENGTH
    const waveDirection = WAVE_DIRECTION
    // 50 is the shipped rate
    const waveSpeed = (speed / 50) * WAVE_AT_50
    const hoverRadius = HOVER_RADIUS
    const hoverPush = HOVER_PUSH
    // Drag gain is a dial now — the frozen ORBIT_SPEED of 60 is its default,
    // so the shipped feel is unchanged until a designer moves it.
    const orbitSpeed = dragSensitivity
    const orbitDamping = ORBIT_DAMPING

    const hostRef   = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // All live inputs via ref — context never rebuilt on prop change (rule 6)
    const live = useRef({
        colors, density, cameraDistance,
        radius, tilt, rimPower, center,
        waveHeight, waveLength, waveSpeed, waveDirection,
        hoverRadius, hoverPush,
        orbitSpeed, orbitDamping,
    })
    live.current = {
        colors, density, cameraDistance,
        radius, tilt, rimPower, center,
        waveHeight, waveLength, waveSpeed, waveDirection,
        hoverRadius, hoverPush,
        orbitSpeed, orbitDamping,
    }

    // Camera orbit accumulator
    const cam  = useRef({ yaw: 0, pitch: 0, yawV: 0, pitchV: 0 })
    // Drag state (release bound on window per CLAUDE.md)
    const drag = useRef({ active: false, lastX: 0, lastY: 0 })
    // Hover state
    // `miss` is the ray-miss fade, held apart from the Transition-driven gate so
    // the two can never overwrite each other frame to frame.
    const hov  = useRef({ active: 0, target: 0, miss: 1, dirX: 0, dirY: 1, dirZ: 0, mx: 0, my: 0 })

    useEffect(() => {
        const host   = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: true, antialias: false, premultipliedAlpha: true, depth: false,
        }) as WebGLRenderingContext | null
        if (!gl) return

        /* ---- programs ---- */
        const sphereProg  = linkProg(gl, VERT_SPHERE, FRAG)

        const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n)

        // Scratch for the palette upload — reused every frame, never allocated
        // inside the loop.
        const palBuf = new Float32Array(MAX_COLORS * 3)

        // Sphere program uniform locations
        const sA = {
            polar: gl.getAttribLocation(sphereProg, "aPolar"),
            rnd:   gl.getAttribLocation(sphereProg, "aRnd"),
        }
        const sU = {
            res: U(sphereProg,"uRes"), focal: U(sphereProg,"uFocal"),
            time: U(sphereProg,"uTime"), radius: U(sphereProg,"uRadius"),
            waveHeight: U(sphereProg,"uWaveHeight"), waveLength: U(sphereProg,"uWaveLength"),
            waveSpeed: U(sphereProg,"uWaveSpeed"), waveDir: U(sphereProg,"uWaveDir"),
            camDist: U(sphereProg,"uCamDist"),
            camYaw: U(sphereProg,"uCamYaw"), camPitch: U(sphereProg,"uCamPitch"),
            tilt: U(sphereProg,"uTilt"), rimPow: U(sphereProg,"uRimPower"),
            center: U(sphereProg,"uCenter"),
            colorCount: U(sphereProg,"uColorCount"),
            colors: U(sphereProg,"uColors[0]"),
            hotspot: U(sphereProg,"uHotspot"), camDir: U(sphereProg,"uCamDir"),
            hoverDir: U(sphereProg,"uHoverDir"), hoverRadius: U(sphereProg,"uHoverRadius"),
            hoverPush: U(sphereProg,"uHoverPush"), hoverActive: U(sphereProg,"uHoverActive"),
        }

        /* ---- shared buffers (rebuilt when density changes) ---- */
        const polarBuf = gl.createBuffer()!
        const rndBuf   = gl.createBuffer()!
        const idxBuf   = gl.createBuffer()!
        let builtDensity = -1
        let count = 0
        let indexCount = 0

        const buildBuffers = (d: number) => {
            // Exact regular (theta, phi) grid — NO jitter on either axis.
            // Rendered as continuous gl.LINES mesh (meridians + latitude rings).
            const N_theta = Math.max(60, Math.round(d * 2.5))
            const N_phi   = Math.max(40, Math.round(d * 1.8))
            count = N_theta * N_phi

            const polarA = new Float32Array(count * 2)
            const rndA   = new Float32Array(count * 2)
            const rnd    = mulberry32(0xc0ffee7)
            let i = 0
            for (let ti = 0; ti < N_theta; ti++) {
                const theta = (ti + 0.5) / N_theta * TAU
                for (let pi = 0; pi < N_phi; pi++) {
                    const phi = ((pi + 0.5) / N_phi - 0.5) * Math.PI
                    polarA[i * 2]     = phi
                    polarA[i * 2 + 1] = theta
                    rndA[i * 2]       = rnd()
                    rndA[i * 2 + 1]   = rnd()
                    i++
                }
            }

            // Build index buffer for gl.LINES wireframe mesh
            // Meridians: N_theta * (N_phi - 1) line segments
            // Parallels: N_phi * N_theta line segments
            const numMeridianSegments = N_theta * (N_phi - 1)
            const numParallelSegments = N_phi * N_theta
            indexCount = (numMeridianSegments + numParallelSegments) * 2
            const indices = new Uint16Array(indexCount)
            let idx = 0

            // 1. Longitude / Meridian strands (vertical pole-to-pole lines)
            for (let ti = 0; ti < N_theta; ti++) {
                for (let pi = 0; pi < N_phi - 1; pi++) {
                    const curr = ti * N_phi + pi
                    const next = ti * N_phi + (pi + 1)
                    indices[idx++] = curr
                    indices[idx++] = next
                }
            }

            // 2. Latitude / Parallel rings (horizontal rings)
            for (let pi = 0; pi < N_phi; pi++) {
                for (let ti = 0; ti < N_theta; ti++) {
                    const curr = ti * N_phi + pi
                    const next = ((ti + 1) % N_theta) * N_phi + pi
                    indices[idx++] = curr
                    indices[idx++] = next
                }
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, polarBuf)
            gl.bufferData(gl.ARRAY_BUFFER, polarA, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, rndBuf)
            gl.bufferData(gl.ARRAY_BUFFER, rndA, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)
            builtDensity = d
        }

        /* ---- GL state: additive premultiplied (ONE, ONE) ---- */
        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE) // overlapping discs bloom to white hotspot

        /* ---- sizing ---- */
        let cssW = 0, cssH = 0, dpr = 1
        const resize = () => {
            dpr  = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            cssW = canvas.clientWidth  || host.clientWidth  || 1
            cssH = canvas.clientHeight || host.clientHeight || 1
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width  = w
                canvas.height = h
            }
            gl.viewport(0, 0, w, h)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        /* ---- pointer / orbit ---- */
        let hoverAnim: { stop: () => void } | null = null
        const gateHover = (to: number) => {
            if (hov.current.target === to) return
            hov.current.target = to
            hoverAnim?.stop()
            hoverAnim = animate(hoverMV, to, transitionRef.current)
        }
        const onPointerDown = (e: PointerEvent) => {
            drag.current = { active: true, lastX: e.clientX, lastY: e.clientY }
            host.setPointerCapture(e.pointerId)
        }
        const onPointerMove = (e: PointerEvent) => {
            // Track cursor CSS coords relative to host (for hover ray)
            const r = host.getBoundingClientRect()
            hov.current.mx     = e.clientX - r.left
            hov.current.my     = e.clientY - r.top
            gateHover(1)

            if (!drag.current.active) return
            const L = live.current
            const dx = e.clientX - drag.current.lastX
            const dy = e.clientY - drag.current.lastY
            drag.current.lastX = e.clientX
            drag.current.lastY = e.clientY
            const spd = (L.orbitSpeed / 100) * (Math.PI / 180)
            cam.current.yawV   += dx * spd
            cam.current.pitchV += dy * spd
        }
        const onPointerLeave = () => gateHover(0)
        const onPointerUp   = () => { drag.current.active = false }

        host.addEventListener("pointerdown",  onPointerDown)
        host.addEventListener("pointermove",  onPointerMove)
        host.addEventListener("pointerleave", onPointerLeave)
        // Release on window: drag that exits component still releases (rule 6 gotcha)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup",   onPointerUp)

        /* ---- hover ray-sphere intersection (CPU) ---- */
        // Intersect the ray from camera through cursor pixel with the sphere at origin.
        // Returns a normalised world-space direction to the hit point, or null.
        //
        // Rotation matrix M maps world → camera:
        //   M = [[cy,0,sy],[sy·sp,cp,−cy·sp],[−sy·cp,sp,cy·cp]]
        //
        // M⁻¹ = Mᵀ = [[cy,sy·sp,−sy·cp],[0,cp,sp],[sy,−cy·sp,cy·cp]]
        //
        // Camera world pos = Mᵀ·(0,0,camDist)
        //   = camDist·(−sy·cp, sp, cy·cp)   ← NOT (−sy·cp, sp, cy·cp) sign check:
        //   Mᵀ col 2 = [−sy·cp, sp, cy·cp]
        //
        // Camera-space ray dir through pixel (px,py): D_cam = (px/f, py/f, −1)
        // World ray dir: D_world = Mᵀ · D_cam
        const raySphereHit = (
            mx_css: number, my_css: number,
            focal: number, yaw: number, totalPitch: number, camDist: number, R: number
        ): [number, number, number] | null => {
            const cy  = Math.cos(yaw), sy = Math.sin(yaw)
            const ctp = Math.cos(totalPitch), stp = Math.sin(totalPitch)

            // Camera world position
            const Ox = -sy * ctp * camDist
            const Oy =  stp      * camDist
            const Oz =  cy * ctp * camDist

            // Camera-space ray through CSS pixel
            const px = mx_css * dpr - canvas.width  / 2
            const py = canvas.height / 2 - my_css * dpr
            const dcx = px / focal
            const dcy = py / focal
            const dcz = -1.0

            // World-space ray direction = Mᵀ · D_cam
            // Mᵀ = [[cy, sy*stp, -sy*ctp], [0, ctp, stp], [sy, -cy*stp, cy*ctp]]
            let Dx = dcx * cy  + dcy * sy * stp + dcz * (-sy * ctp)
            let Dy = dcx * 0   + dcy * ctp      + dcz * stp
            let Dz = dcx * sy  + dcy * (-cy * stp) + dcz * (cy * ctp)
            const DLen = Math.sqrt(Dx*Dx + Dy*Dy + Dz*Dz)
            Dx /= DLen; Dy /= DLen; Dz /= DLen

            // Ray-sphere: |O + t·D|² = R²
            const OdotD = Ox*Dx + Oy*Dy + Oz*Dz
            const OdotO = Ox*Ox + Oy*Oy + Oz*Oz
            const disc  = OdotD * OdotD - (OdotO - R * R)
            if (disc < 0) return null

            const t    = -OdotD - Math.sqrt(disc)
            if (t < 0) return null // hit behind camera

            const hx = Ox + t * Dx
            const hy = Oy + t * Dy
            const hz = Oz + t * Dz
            const hl = Math.sqrt(hx*hx + hy*hy + hz*hz) || 1
            return [hx/hl, hy/hl, hz/hl]
        }

        /* ---- rAF loop ---- */
        let raf     = 0
        let last    = performance.now()
        let elapsed = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min((now - last) / 1000, 0.05)
            last = now
            elapsed += dt

            if (cssW <= 0 || cssH <= 0) { resize(); return }

            const L = live.current

            if (L.density !== builtDensity) buildBuffers(L.density)
            if (count === 0) return

            /* ---- camera damping ---- */
            const damp    = 1 - Math.pow(L.orbitDamping / 100, dt * 10)
            cam.current.yaw   += cam.current.yawV * damp
            cam.current.pitch += cam.current.pitchV * damp
            // Infinite drag: no pitch clamp, so the sphere rolls all the way
            // over instead of hitting a wall at ±60°. Both angles are wrapped
            // into (−π, π] — every read is trig, so wrapping changes nothing
            // visually and keeps an unbounded accumulator from eating float
            // precision after a long drag.
            cam.current.yaw   = ((cam.current.yaw   + Math.PI) % TAU + TAU) % TAU - Math.PI
            cam.current.pitch = ((cam.current.pitch + Math.PI) % TAU + TAU) % TAU - Math.PI
            cam.current.yawV  *= (1 - damp * 1.4)
            cam.current.pitchV *= (1 - damp * 1.4)

            /* ---- hover gate ---- */
            // The Transition control owns the 0..1 gate; the loop reads it. The
            // ray-miss fade below is a SEPARATE multiplier, so a spring settling
            // the gate and the miss decay can no longer overwrite each other.
            const h       = hov.current
            h.active      = hoverMV.get() * h.miss

            /* ---- hover ray ---- */
            const wDev  = canvas.width
            const hDev  = canvas.height
            const focal = hDev / (2 * Math.tan((FOV_DEG / 2) * Math.PI / 180))
            const totalPitch = cam.current.pitch + (L.tilt * Math.PI) / 180

            if (h.active > 0.001) {
                const hit = raySphereHit(
                    h.mx, h.my, focal, cam.current.yaw, totalPitch, L.cameraDistance, L.radius
                )
                if (hit) {
                    h.dirX = hit[0]; h.dirY = hit[1]; h.dirZ = hit[2]
                    // Recover at the mirror of the decay, so a ray that grazes
                    // in and out of the sphere reads as one smooth fade.
                    h.miss = Math.min(1, h.miss / 0.8)
                } else {
                    h.miss *= 0.8 // fade out if ray misses sphere
                }
                h.active = hoverMV.get() * h.miss
            }

            /* ---- camera world direction ---- */
            // camDir = normalised direction from origin TO camera in world space
            // = Mᵀ · (0,0,1) = column 2 of Mᵀ = row 2 of M = (−sy·cp, sp, cy·cp)
            // where tp = totalPitch
            const cy  = Math.cos(cam.current.yaw), sy = Math.sin(cam.current.yaw)
            const ctp = Math.cos(totalPitch),       stp = Math.sin(totalPitch)
            const cdx = -sy * ctp
            const cdy =  stp
            const cdz =  cy * ctp
            const cdl = Math.sqrt(cdx*cdx + cdy*cdy + cdz*cdz) || 1

            /* ---- colours ---- */
            // Palette -> flat vec3[MAX_COLORS]. An empty list falls back so a
            // designer who clears it never gets a black ring. Slots past the
            // count are filled with the LAST entry, so rampColor's i0 + 1
            // lookup can never read a stale colour at the bottom of the ramp.
            const pal =
                Array.isArray(L.colors) && L.colors.length > 0
                    ? L.colors.slice(0, MAX_COLORS)
                    : DEFAULT_COLORS
            for (let i = 0; i < MAX_COLORS; i++) {
                const [pr, pg, pb] = parseColor(pal[Math.min(i, pal.length - 1)])
                palBuf[i * 3]     = pr
                palBuf[i * 3 + 1] = pg
                palBuf[i * 3 + 2] = pb
            }
            // Top stop drives the pole hotspot tint.
            const [tr, tg, tb] = parseColor(pal[0])
            // Hotspot: push toward white but tinted
            const hr = Math.min(1, tr * 0.6 + 0.8)
            const hg = Math.min(1, tg * 0.4 + 0.7)
            const hb = Math.min(1, tb * 0.5 + 0.8)

            const tiltRad   = (L.tilt   * Math.PI) / 180
            const timeVal   = elapsed * (L.waveSpeed / 50)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)

            /* ==== SPHERE PASS ==== */
            gl.useProgram(sphereProg)
            gl.uniform2f(sU.res,         wDev, hDev)
            gl.uniform1f(sU.focal,       focal)
            gl.uniform1f(sU.time,        timeVal)
            gl.uniform1f(sU.radius,      L.radius)
            gl.uniform1f(sU.waveHeight,  L.waveHeight)
            gl.uniform1f(sU.waveLength,  L.waveLength)
            gl.uniform1f(sU.waveSpeed,   L.waveSpeed)
            const da = (L.waveDirection * Math.PI) / 180
            gl.uniform2f(sU.waveDir,     Math.sin(da), Math.cos(da))
            gl.uniform1f(sU.camDist,     L.cameraDistance)
            gl.uniform1f(sU.camYaw,      cam.current.yaw)
            gl.uniform1f(sU.camPitch,    cam.current.pitch)
            gl.uniform1f(sU.tilt,        tiltRad)
            gl.uniform1f(sU.rimPow,      L.rimPower)
            gl.uniform1f(sU.center,      L.center)
            gl.uniform1f(sU.colorCount,  pal.length)
            gl.uniform3fv(sU.colors,     palBuf)
            gl.uniform3f(sU.hotspot,     hr, hg, hb)
            gl.uniform3f(sU.camDir,      cdx/cdl, cdy/cdl, cdz/cdl)
            gl.uniform3f(sU.hoverDir,    h.dirX, h.dirY, h.dirZ)
            gl.uniform1f(sU.hoverRadius, L.hoverRadius)
            gl.uniform1f(sU.hoverPush,   L.hoverPush)
            gl.uniform1f(sU.hoverActive, h.active)

            gl.bindBuffer(gl.ARRAY_BUFFER, polarBuf)
            gl.enableVertexAttribArray(sA.polar)
            gl.vertexAttribPointer(sA.polar, 2, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ARRAY_BUFFER, rndBuf)
            gl.enableVertexAttribArray(sA.rnd)
            gl.vertexAttribPointer(sA.rnd, 2, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)
            gl.drawElements(gl.LINES, indexCount, gl.UNSIGNED_SHORT, 0)

        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            hoverAnim?.stop()
            host.removeEventListener("pointerdown",  onPointerDown)
            host.removeEventListener("pointermove",  onPointerMove)
            host.removeEventListener("pointerleave", onPointerLeave)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup",   onPointerUp)
            // No loseContext() — rule 6
        }
    }, [])

    // CSS hazes at the poles — the two ends of the ramp, top-right and
    // bottom-left. Falls back if the designer clears the list.
    const stops = colors?.length ? colors : DEFAULT_COLORS
    const topGlow = stops[0] + "28"
    const botGlow = stops[stops.length - 1] + "28"

    return (
        <div
            ref={hostRef}
            style={{
                // Floor before style spread: canvas is absolute-positioned,
                // root has no in-flow content, collapses under Fit Content (rule 6)
                minWidth:  1200,
                minHeight: 800,
                width:     "100%",
                height:    "100%",
                position:  "relative",
                overflow:  "hidden",
                background: `radial-gradient(55% 40% at 68% 6%, ${topGlow} 0%, transparent 72%), radial-gradient(50% 38% at 25% 94%, ${botGlow} 0%, transparent 70%), ${background}`,
                cursor: "grab",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width:  "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}

const __presetProps = {
  "scale": 36,
  "speed": 100,
  "colors": [
    "#FF0000",
    "#FFDF00"
  ],
  "density": 120,
  "background": "#000000",
  "transition": {
    "ease": [
      0,
      0,
      0.58,
      1
    ],
    "mass": 1,
    "type": "tween",
    "delay": 0,
    "damping": 60,
    "duration": 1,
    "stiffness": 800
  },
  "waveHeight": 20,
  "centerOpacity": 100,
  "dragSensitivity": 100
};

export default function PlasmaRing(props: Record<string, unknown>) {
  return <__BaseImpl_PlasmaRing {...(__presetProps as Record<string, unknown>)} {...props} />;
}
