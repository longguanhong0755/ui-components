"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ *
 *  SilkFringe
 *  A travelling wave riding over a hemispherical bulge, on a single
 *  full-screen WebGL quad.
 *
 *  The picture is one scalar field:
 *    1. the sample point is normalised against the LONG side, framed
 *       (centre / scale) and rotated so +u runs corner to corner --
 *       bottom-left to top-right, the direction the strips travel
 *    2. domain-warped a couple of folds              -> the fabric billow
 *    3. a hemispherical bulge sits across the other diagonal, stretched
 *       along it into a ridge (Tilt swings that ridge against the wave).
 *       It enters the phase as a delay:
 *         phi = k * (u + height * sqrt(1 - rho^2)) - travel
 *       so a strip reaching the ridge is held back over the dome and
 *       released past it. The strips are born at one corner, bend around
 *       the bulge, and leave by the other -- they are never cut by it
 *    4. that phase drives a midnight -> blue -> violet -> crimson ramp
 *    5. |grad phi| says how far the bulge has squeezed the strips past
 *       their open-field spacing. It gates the white-pink glare, so the
 *       specular lands on the compressed flank -- the caustic -- and
 *       never on the slack corners the strips relax into
 *
 *  Step 3 is the whole effect: one phase delay, not a second wave.
 * ------------------------------------------------------------------ */

/* ----------------------------------------------------------- defaults */

const MAX_STOPS = 8

/** How the frame is cropped around the field. */
const DEFAULT_FRAME = {
    scale: 5,
    centerX: 0,
    centerY: 0,
}

/** The dome the strips ride over. */
const DEFAULT_BULGE = {
    size: 4.5,
    height: 6,
    stretch: 5,
    tilt: 0,
    softness: 3,
    centerX: 0,
    centerY: 0,
}

/** The fold that gives the strips their fabric billow. */
const DEFAULT_WARP = {
    amount: 0.8,
    scale: 2.5,
    detail: 2,
}

/** How the field is shaded once it has a value. */
const DEFAULT_SURFACE = {
    focus: 6,
    ramp: 1.25,
    sheen: 6,
    glow: 4,
    grain: 2.5,
    opacity: 100,
}

/** The slow motions riding on top of Speed. */
const DEFAULT_TRAVEL = {
    direction: "forward" as const,
    drift: 1.2,
    breathe: 3,
}

const DEFAULTS = {
    colors: [
        "#07032A", // trough, midnight indigo
        "#160D86", // indigo
        "#2E1BE8", // royal blue, the broad flank
        "#4B28F2", // electric blue-violet
        "#8A2BE0", // violet
        "#C227A8", // magenta
        "#EC2350", // crimson
        "#FF6A4A", // ember crest
    ],
    background: "#191818",
    // 45 sends the strips from the bottom-left corner to the top-right, which
    // lays them along the other diagonal -- top-left to bottom-right.
    angle: -180,
    folds: 18,
    speed: 1.9,
    paused: false,
    interactive: true,
    sensitivity: 10,
}

/* -------------------------------------------------------------- types */

export interface SilkFringeFrame {
    /** 0-10 abstract zoom, 5 = neutral (exponential) */
    scale?: number
    /** Framing offset, % of half-width */
    centerX?: number
    /** Framing offset, % of half-height */
    centerY?: number
}

export interface SilkFringeBulge {
    /** 0-10 how wide the dome is across the travel direction */
    size?: number
    /** 0-10 how far the dome holds a strip back. 0 leaves a flat wave */
    height?: number
    /** 0-10 how far the dome is drawn out into a ridge */
    stretch?: number
    /** Angle of that ridge to the wave, degrees. 0 lays it across the travel */
    tilt?: number
    /** 0-10 rounding of the rim, so the strips do not break over its edge */
    softness?: number
    /** Dome offset from centre, % of half-width */
    centerX?: number
    /** Dome offset from centre, % of half-height */
    centerY?: number
}

export interface SilkFringeWarp {
    /** 0-10 how far the fold pushes the sample point */
    amount?: number
    /** 0-10 size of the fold, smaller = longer billow */
    scale?: number
    /** Folds fed back into each other, 1-3 */
    detail?: number
}

export interface SilkFringeSurface {
    /** 0-10 how tightly the glare is confined to the compressed flank */
    focus?: number
    /** 0-10 palette weighting, higher = deeper troughs */
    ramp?: number
    /** 0-10 directional glare on the strip flanks */
    sheen?: number
    /** 0-10 isotropic bloom on the crests */
    glow?: number
    /** 0-10 dither, also kills 8-bit colour banding */
    grain?: number
    /** 0-100 */
    opacity?: number
}

export interface SilkFringeTravel {
    /** Which corner the strips are born at */
    direction?: "forward" | "back"
    /** -10..10 slow swing of the travel direction */
    drift?: number
    /** 0-10 slow swell and collapse of the bulge */
    breathe?: number
}

export interface SilkFringeProps {
    /** Palette stops, trough -> crest */
    colors?: string[]
    /** Colour filling the troughs, under the field */
    background?: string
    frame?: SilkFringeFrame
    /** Direction the strips travel, degrees. Turns the whole composition */
    angle?: number
    /** Strips across the frame in open field; the bulge crowds them tighter */
    folds?: number
    bulge?: SilkFringeBulge
    warp?: SilkFringeWarp
    surface?: SilkFringeSurface
    /** 0-10 rate the strips travel */
    speed?: number
    travel?: SilkFringeTravel
    /** Freeze the animation */
    paused?: boolean
    /** Let the pointer drag the framing around */
    interactive?: boolean
    /** 0-10 pointer influence */
    sensitivity?: number
    style?: CSSProperties
}

/* ------------------------------------------------------------- shaders */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
#define MAX_STOPS ${MAX_STOPS}

varying vec2 vUv;

uniform float uTime;
uniform vec3  uColors[MAX_STOPS];
uniform int   uCount;
uniform float uAspect;
uniform vec2  uCenter;
uniform float uScale;
uniform float uRotation;
uniform float uFreq;
uniform vec2  uDome;
uniform vec2  uRadius;
uniform float uTilt;
uniform float uHeight;
uniform float uSoft;
uniform float uWarp;
uniform float uWarpFreq;
uniform float uDetail;
uniform float uPixel;
uniform float uPhase;
uniform float uKnee;
uniform float uRamp;
uniform float uSheen;
uniform float uGlow;
uniform float uGrain;
uniform vec3  uBg;
uniform float uOpacity;

// Key light for the strips, pre-normalised because GLSL ES will not run
// normalize() in a const initialiser. Up and to the left, slightly toward
// the viewer. Fixed: this is the look, and a movable light is a lighting rig.
const vec3  LIGHT_DIR  = vec3(-0.5503, 0.6003, 0.5803);
const float SPEC_BUMP  = 1.6;  // how far the slope tilts the normal
const float SPEC_SHINE = 26.0; // exponent: higher = tighter, harder glare
// The glare is white-pink rather than white: a neutral highlight on a
// crimson crest reads as a blown-out pixel, not as satin.
const vec3  SPEC_TINT  = vec3(1.0, 0.92, 0.95);
// How far the band profile is pulled from a sine toward a triangle. A sine
// spends most of its period parked near the crest and the trough, which
// crushes the violets into a rim around a fat red strip; a triangle gives
// every palette stop about the same width of band. 0.7 keeps a little of the
// sine's softness at the crest, which is where the glare sits.
const float BAND_SHAPE = 0.7;
// Compression, as a multiple of the open-field spacing, that already counts
// as fully caustic. Past this the glare is at full strength.
const float FULL_PILE  = 1.2;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Non-cyclic ramp: 0 is the trough, 1 the crest. Because the field is a
// sine, every band comes out symmetric about its crest, which is what reads
// as a lit ribbon rather than a sawtooth stripe.
vec3 palette(float t) {
    t = clamp(t, 0.0, 1.0);
    float span = float(uCount - 1);
    if (span < 0.5) return uColors[0];

    float u = t * span;
    float i = min(floor(u), span - 1.0);
    float k = clamp(u - i, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);

    vec3 a = uColors[0];
    vec3 b = uColors[0];
    for (int n = 0; n < MAX_STOPS; n++) {
        if (float(n) == i)       a = uColors[n];
        if (float(n) == i + 1.0) b = uColors[n];
    }
    return mix(a, b, k);
}

void main() {
    vec2 p = vUv * 2.0 - 1.0;
    // Normalise against the LONG side. The bulge then scales with the frame
    // instead of keeping its size while the canvas grows past it, which is
    // what stops a wide hero from cropping the dome down to a corner.
    p *= vec2(min(uAspect, 1.0), min(1.0 / uAspect, 1.0));
    p = (p - uCenter) / max(uScale, 0.01);
    // +q.x is the travel direction; +q.y runs along the ridge.
    vec2 q = rot(-uRotation) * p;

    // --- domain warp --------------------------------------------------
    // Each fold feeds back into the next, so two are already enough to give
    // the strips their billow instead of leaving them ruled lines.
    for (int i = 0; i < 3; i++) {
        float fi = float(i) + 1.0;
        float on = step(fi - 0.5, uDetail); // loop bound must stay constant
        q += on * (uWarp / fi) * vec2(
            sin(uWarpFreq * fi * q.y + uPhase * 0.70 + fi * 1.7),
            sin(uWarpFreq * fi * q.x - uPhase * 0.50 + fi * 2.3)
        );
    }

#ifdef HAS_DERIV
    // q is continuous everywhere, so its derivative is safe to take
    float pix = length(vec2(fwidth(q.x), fwidth(q.y)));
#else
    float pix = uPixel;
#endif

    // --- the bulge ------------------------------------------------------
    // rho is the distance across the dome, 1 at its rim. sqrt(1 - rho^2) is
    // the hemisphere; the uSoft floor rounds the rim so its slope stays
    // finite instead of standing vertical and shattering the strips there.
    // The point is turned into the dome's own frame first, so uTilt swings
    // the ridge against the wave without moving the wave.
    vec2 d = (rot(-uTilt) * (q - uDome)) / uRadius;
    float rho2 = dot(d, d);
    float inside = step(rho2, 1.0);
    float root = sqrt(max(1.0 - rho2, 0.0) + uSoft * uSoft);
    float dome = (root - uSoft) * inside;
    // d(dome)/d(rho2), carried for the gradient below
    float slope = -0.5 / root * inside;

    // --- the phase ------------------------------------------------------
    // One travelling wave, delayed over the dome. The gradient is analytic,
    // so the shading below never has to guess at the slope.
    float phi = uFreq * (q.x + uHeight * dome) - uPhase;
    // grad(rho^2), carried back out of the dome's own frame
    vec2  grho = rot(uTilt) * (2.0 * d / uRadius);
    vec2  g    = uFreq * (vec2(1.0, 0.0) + uHeight * slope * grho);
    float gm = length(g);

    // --- band-limit -----------------------------------------------------
    // The strips run to knife-edge on the compressed flank, which is exactly
    // where they would alias worst. Fade them as they approach the pixel.
    float fw = pix * gm;
    float fade = 1.0 / (1.0 + fw * fw * 0.35);

    float sn = sin(phi);
    float wave = mix(sn, asin(clamp(sn, -1.0, 1.0)) / 1.5707963, BAND_SHAPE);
    float t = clamp(wave * fade * 0.5 + 0.5, 0.0, 1.0);
    float shaped = pow(t, uRamp);

    // --- caustic gate ---------------------------------------------------
    // gm / uFreq is the local spacing against the open-field spacing: 1 out
    // where the wave runs undisturbed, higher on the flank the dome has
    // squeezed. Only the top of that range is allowed to glare.
    float dens = clamp((gm / max(uFreq, 1e-4) - 1.0) / FULL_PILE, 0.0, 1.0);
    float hot = smoothstep(1.0 - uKnee, 1.0, dens);

    // --- pseudo-normal specular -----------------------------------------
    // There is no surface here to light, so build a normal from the field
    // itself: direction from the phase gradient, magnitude from the strip's
    // own slope. The gradient is unit-normalised first, so the tilt stays a
    // shape rather than a consequence of how many folds the user asked for.
    vec2 tilt = (g / max(gm, 1e-4)) * cos(phi) * fade;
    vec3 N = normalize(vec3(-tilt * SPEC_BUMP, 1.0));
    float spec = pow(max(dot(N, LIGHT_DIR), 0.0), SPEC_SHINE) * uSheen * hot;

#ifdef HAS_DERIV
    float dt = fwidth(shaped) * 0.5;
#else
    float dt = 0.004;
#endif
    dt = clamp(dt, 0.0005, 0.25);

    // 3 taps across the ramp: cheap anti-alias for the crest
    vec3 col = (palette(shaped) + palette(shaped - dt) + palette(shaped + dt)) / 3.0;

    // Glow is the isotropic bloom on a crest; spec is the directional glare
    // that moves as the strip turns. Both are caustic, so both are gated.
    float bloom = uGlow * hot * smoothstep(0.70, 1.0, shaped);
    col += (bloom + spec) * SPEC_TINT;

    // the ground shows through the troughs only
    col += uBg * (1.0 - smoothstep(0.0, 0.35, shaped));

    col += (hash(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5) * uGrain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), uOpacity);
}
`

/* ------------------------------------------------------------- helpers */

let parseCtx: CanvasRenderingContext2D | null | undefined

/** CSS colour string -> normalised rgb triple. */
function toRGB(css: string): [number, number, number] {
    if (!css) return [0, 0, 0]
    const s = css.trim()

    const hex = /^#([0-9a-f]{3,8})$/i.exec(s)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4) {
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        }
        const n = parseInt(h.slice(0, 6), 16)
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }

    const fn = /^rgba?\(([^)]+)\)$/i.exec(s)
    if (fn) {
        const parts = fn[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3)
        const v = parts.map((x) =>
            x.indexOf("%") >= 0 ? parseFloat(x) * 2.55 : parseFloat(x)
        )
        return [(v[0] || 0) / 255, (v[1] || 0) / 255, (v[2] || 0) / 255]
    }

    // named colours, hsl(), oklch() ... let the browser resolve it
    if (typeof document !== "undefined") {
        if (parseCtx === undefined) {
            parseCtx = document.createElement("canvas").getContext("2d")
        }
        if (parseCtx) {
            parseCtx.fillStyle = "#000000"
            parseCtx.fillStyle = s
            const out = parseCtx.fillStyle
            if (typeof out === "string" && out.charAt(0) === "#" && out !== s) {
                return toRGB(out)
            }
        }
    }
    return [0, 0, 0]
}

function compile(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh)
        return null
    }
    return sh
}

// A handful of trig ops per pixel, so it holds full retina rate on anything
// that can run WebGL at all. Nothing here worth trading away.
const DPR_CAP = 2

type Resolved = {
    colors: string[]
    background: string
    frame: Required<SilkFringeFrame>
    angle: number
    folds: number
    bulge: Required<SilkFringeBulge>
    warp: Required<SilkFringeWarp>
    surface: Required<SilkFringeSurface>
    speed: number
    travel: Required<SilkFringeTravel>
    paused: boolean
    interactive: boolean
    sensitivity: number
}

/* ----------------------------------------------------------- component */

export default function SilkFringe({
    colors = ["#D8D8D8", "#5100FF", "#003FFF"],
    background = DEFAULTS.background,
    frame,
    angle = DEFAULTS.angle,
    folds = DEFAULTS.folds,
    bulge,
    warp,
    surface,
    speed = DEFAULTS.speed,
    travel,
    paused = DEFAULTS.paused,
    interactive = DEFAULTS.interactive,
    sensitivity = DEFAULTS.sensitivity,
    style,
}: SilkFringeProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [failed, setFailed] = useState(false)

    // Live prop mirror. The render loop reads from here, so tweaking a control
    // never tears down the GL context. Each object is merged over its own
    // DEFAULT_*, so a partial object from the panel is safe.
    const resolved: Resolved = {
        colors,
        background,
        frame: { ...DEFAULT_FRAME, ...frame },
        angle,
        folds,
        bulge: { ...DEFAULT_BULGE, ...bulge },
        warp: { ...DEFAULT_WARP, ...warp },
        surface: { ...DEFAULT_SURFACE, ...surface },
        speed,
        travel: { ...DEFAULT_TRAVEL, ...travel },
        paused,
        interactive,
        sensitivity,
    }
    const propsRef = useRef<Resolved>(resolved)
    propsRef.current = resolved

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        let disposed = false
        let raf = 0
        let gl: WebGLRenderingContext | null = null
        let program: WebGLProgram | null = null
        let buffer: WebGLBuffer | null = null
        let uni: Record<string, WebGLUniformLocation | null> = {}

        let onScreen = true
        let pageVisible = true

        // accumulators, so a speed change never snaps the pattern
        let elapsed = 0
        let phase = 0
        let drift = 0
        let breathePhase = 0
        let lastNow = 0

        // pointer, smoothed
        let px = 0
        let py = 0
        let tx = 0
        let ty = 0

        const colorBuf = new Float32Array(MAX_STOPS * 3)

        /* ------------------------------------------------------ setup */

        function init(): boolean {
            const ctx =
                (canvas.getContext("webgl", {
                    alpha: true,
                    antialias: false,
                    premultipliedAlpha: false,
                    powerPreference: "high-performance",
                }) as WebGLRenderingContext | null) ||
                (canvas.getContext(
                    "experimental-webgl"
                ) as WebGLRenderingContext | null)

            if (!ctx) return false
            gl = ctx

            const deriv = gl.getExtension("OES_standard_derivatives")
            const hp = gl.getShaderPrecisionFormat(
                gl.FRAGMENT_SHADER,
                gl.HIGH_FLOAT
            )
            const precision = hp && hp.precision > 0 ? "highp" : "mediump"

            const prelude =
                (deriv
                    ? "#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIV 1\n"
                    : "") +
                "precision " +
                precision +
                " float;\n"

            const vs = compile(gl, gl.VERTEX_SHADER, VERT)
            const fs = compile(gl, gl.FRAGMENT_SHADER, prelude + FRAG)
            if (!vs || !fs) return false

            const prog = gl.createProgram()
            if (!prog) return false
            gl.attachShader(prog, vs)
            gl.attachShader(prog, fs)
            gl.bindAttribLocation(prog, 0, "aPos")
            gl.linkProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false

            program = prog
            gl.useProgram(prog)

            buffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([-1, -1, 3, -1, -1, 3]),
                gl.STATIC_DRAW
            )
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

            const names = [
                "uTime",
                "uColors[0]",
                "uCount",
                "uAspect",
                "uCenter",
                "uScale",
                "uRotation",
                "uFreq",
                "uDome",
                "uRadius",
                "uTilt",
                "uHeight",
                "uSoft",
                "uWarp",
                "uWarpFreq",
                "uDetail",
                "uPixel",
                "uPhase",
                "uKnee",
                "uRamp",
                "uSheen",
                "uGlow",
                "uGrain",
                "uBg",
                "uOpacity",
            ]
            uni = {}
            for (const n of names) uni[n] = gl.getUniformLocation(prog, n)

            gl.clearColor(0, 0, 0, 0)
            return true
        }

        /* ----------------------------------------------------- resize */

        function resize() {
            if (!gl) return
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const w = Math.max(1, Math.round(host.clientWidth * dpr))
            const h = Math.max(1, Math.round(host.clientHeight * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
                gl.viewport(0, 0, w, h)
            }
        }

        /* ------------------------------------------------------ frame */

        function draw(dt: number) {
            if (!gl || !program) return
            const p = propsRef.current
            const fr = p.frame
            const bl = p.bulge
            const s = p.surface
            const tv = p.travel

            const frozen = p.paused
            if (!frozen) {
                elapsed += dt
                phase += dt * p.speed * 0.9 * (tv.direction === "back" ? -1 : 1)
                drift += dt * tv.drift * 0.012
                breathePhase += dt * 0.22
            }

            // pointer easing
            const ease = Math.min(1, dt * 4)
            px += (tx - px) * ease
            py += (ty - py) * ease
            const pull = p.interactive ? p.sensitivity * 0.045 : 0

            const list = (
                p.colors && p.colors.length ? p.colors : DEFAULTS.colors
            ).slice(0, MAX_STOPS)
            colorBuf.fill(0)
            for (let i = 0; i < list.length; i++) {
                const c = toRGB(list[i])
                colorBuf[i * 3] = c[0]
                colorBuf[i * 3 + 1] = c[1]
                colorBuf[i * 3 + 2] = c[2]
            }
            const bg = toRGB(p.background)

            const w = canvas.width
            const h = canvas.height
            // exponential so 5 is neutral and the useful range is reachable
            const scale = Math.pow(2.4, (fr.scale - 5) / 2.5)
            const rotation = (p.angle * Math.PI) / 180 + drift

            // The dome is placed on screen but read in travel space, so its
            // offset rotates with the wave instead of sliding across it. It is
            // divided by Scale for the same reason: the offset is a fraction
            // of the frame, so zooming must not walk the dome out of it.
            const bx = bl.centerX / 100 / scale
            const by = bl.centerY / 100 / scale
            const cos = Math.cos(rotation)
            const sin = Math.sin(rotation)

            // Breathe swells the dome, which is what makes the strips crowd
            // and release without the wave itself changing speed.
            const breathe = 1 + tv.breathe * 0.045 * Math.sin(breathePhase)
            const ru = (0.18 + bl.size * 0.13) * breathe
            const rv = ru * (0.4 + bl.stretch * 0.5)

            gl.useProgram(program)
            gl.uniform1f(uni["uTime"], elapsed)
            gl.uniform3fv(uni["uColors[0]"], colorBuf)
            gl.uniform1i(uni["uCount"], Math.max(1, list.length))
            gl.uniform1f(uni["uAspect"], w / Math.max(1, h))
            gl.uniform2f(
                uni["uCenter"],
                fr.centerX / 100 + px * pull,
                -fr.centerY / 100 - py * pull
            )
            gl.uniform1f(uni["uScale"], scale)
            gl.uniform1f(uni["uRotation"], rotation)
            gl.uniform1f(uni["uFreq"], p.folds * 1.6)
            gl.uniform2f(uni["uDome"], cos * bx + sin * by, -sin * bx + cos * by)
            gl.uniform2f(uni["uRadius"], ru, rv)
            gl.uniform1f(uni["uTilt"], (bl.tilt * Math.PI) / 180)
            gl.uniform1f(uni["uHeight"], bl.height * 0.14)
            gl.uniform1f(uni["uSoft"], 0.02 + bl.softness * 0.045)
            gl.uniform1f(uni["uWarp"], p.warp.amount * 0.1)
            gl.uniform1f(uni["uWarpFreq"], p.warp.scale)
            gl.uniform1f(uni["uDetail"], p.warp.detail)
            // Fallback for the no-derivatives case: one device pixel measured
            // in field units, which is what fwidth(q) returns before the warp
            // bends it. The long side carries the field, so it sets the ruler.
            gl.uniform1f(uni["uPixel"], 2 / Math.max(1, Math.max(w, h)) / scale)
            gl.uniform1f(uni["uPhase"], phase)
            // Focus narrows the slice of the compression range allowed to
            // glare: a wide knee bathes every strip, a narrow one keeps the
            // glare caustic.
            gl.uniform1f(uni["uKnee"], 0.55 * Math.pow(0.1, s.focus / 10))
            gl.uniform1f(uni["uRamp"], 0.6 + s.ramp * 0.52)
            gl.uniform1f(uni["uSheen"], s.sheen * 0.09)
            gl.uniform1f(uni["uGlow"], s.glow * 0.14)
            gl.uniform1f(uni["uGrain"], s.grain * 0.006)
            gl.uniform3f(uni["uBg"], bg[0], bg[1], bg[2])
            gl.uniform1f(
                uni["uOpacity"],
                Math.max(0, Math.min(1, s.opacity / 100))
            )

            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        function loop(now: number) {
            if (disposed) return
            raf = requestAnimationFrame(loop)
            if (!onScreen || !pageVisible) {
                lastNow = now
                return
            }
            const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.05) : 0
            lastNow = now
            resize()
            draw(dt)
        }

        /* --------------------------------------------------- listeners */

        if (!init()) {
            setFailed(true)
            return
        }

        const ro =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => resize())
                : null
        if (ro) ro.observe(host)

        const io =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(
                      (entries) => {
                          onScreen = entries.some((e) => e.isIntersecting)
                      },
                      { rootMargin: "128px" }
                  )
                : null
        if (io) io.observe(host)

        const onVisibility = () => {
            pageVisible = document.visibilityState !== "hidden"
        }
        document.addEventListener("visibilitychange", onVisibility)

        const onPointer = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            if (!r.width || !r.height) return
            tx = ((e.clientX - r.left) / r.width) * 2 - 1
            ty = ((e.clientY - r.top) / r.height) * 2 - 1
        }
        const onLeave = () => {
            tx = 0
            ty = 0
        }
        host.addEventListener("pointermove", onPointer)
        host.addEventListener("pointerleave", onLeave)

        const onLost = (e: Event) => {
            e.preventDefault()
            cancelAnimationFrame(raf)
        }
        const onRestored = () => {
            if (disposed) return
            lastNow = 0
            if (init()) raf = requestAnimationFrame(loop)
            else setFailed(true)
        }
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        resize()
        raf = requestAnimationFrame(loop)

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            if (ro) ro.disconnect()
            if (io) io.disconnect()
            document.removeEventListener("visibilitychange", onVisibility)
            host.removeEventListener("pointermove", onPointer)
            host.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            if (gl) {
                if (buffer) gl.deleteBuffer(buffer)
                if (program) gl.deleteProgram(program)
                const lose = gl.getExtension("WEBGL_lose_context")
                if (lose) lose.loseContext()
            }
        }
    }, [])

    // Static approximation for the rare no-WebGL case.
    const stops = colors && colors.length ? colors : DEFAULTS.colors
    const fallbackStyle: CSSProperties = failed
        ? {
              background:
                  "linear-gradient(45deg, " +
                  stops.concat(stops.slice().reverse()).join(", ") +
                  ")",
              filter: "blur(40px) saturate(1.3)",
          }
        : {}

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    ...fallbackStyle,
                }}
            />
        </div>
    )
}
