"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * VORTEX DUST FALL — a bright wire ring in a horizontal plane, with a column
 * of dust spilling off its rim and falling away below it.
 *
 * WHAT THE REFERENCE SHOWS (10 frames, reverse-engineered):
 *
 *  - One thin, continuous, very bright ellipse near the top of the frame. It
 *    is smooth — no grain, no beading — so it is NOT particles. It is a real
 *    circle in a horizontal plane, drawn as its own ribbon pass. Its near arc
 *    reads fatter and brighter than its far arc, which is plain perspective.
 *  - The ellipse's minor/major ratio is ~0.32. For a circle in a plane that
 *    ratio is sin(pitch), so the camera sits ~19° above the plane. TILT
 *    defaults to 20.
 *  - The "swirl inside the ellipse" and the "falling column below it" are the
 *    SAME population. Looking 20° down into a column of dust, the top of the
 *    column fills the ellipse and the front wall of it falls away underneath.
 *    Two effects, one draw.
 *  - A fuzzy spray sits ABOVE the ring plane with noticeably larger, softer
 *    blobs in it. Those are two separate things: particles are launched
 *    slightly upward at birth (the spray), and near-camera particles defocus
 *    into bokeh discs (the size).
 *
 * FRAMING — the ring sits above the frame's centre by a fraction of the frame
 * HEIGHT, applied AFTER the perspective divide. Doing it in world space is
 * what silently breaks Tilt; see FRAME_SHIFT.
 *
 * ARCHITECTURE (rule 8) — WebGL point sprites, one drawArrays(POINTS) for the
 * dust plus one TRIANGLE_STRIP for the ring. Every particle is ANALYTIC: no
 * simulation, no pool bookkeeping, no CPU per-particle work. Each point owns a
 * phase offset `u`, and its whole life is a closed-form function of
 *
 *     tau = fract(u + phase)
 *
 * which is exactly why the motion loops for free and why the very first frame
 * is already at steady state. `u` is uniform on [0,1), so at t = 0 the lives
 * are already spread evenly through the column. A pool that seeds particles as
 * it goes instead spends its first second visibly filling up — that warm-up
 * ramp is present in the reference frames themselves, and is not reproduced
 * here on purpose.
 *
 * VERTICAL — a rim puff plus a LINEAR descent:
 *
 *     y = rise * bump(tau) * rimWeight  -  H * tau^q
 *     bump(tau) = (tau/tp) * exp(1 - tau/tp)     peaks at exactly 1 at tau = tp
 *
 * The descent term is the important half, and its exponent is the single
 * number that sets how the column's density falls off with depth. Density per
 * unit depth goes as 1/(dy/dtau), i.e. as tau^(1-q):
 *
 *   q = 2 (free fall)  top:bottom time = 0.41 — measured, this put the bottom
 *                      band at 0.2% of the ring band and turned the
 *                      reference's long even column into a bright cap with
 *                      nothing under it.
 *   q = 1 (terminal)   1.00 — dead even, and the reference's disc is visibly
 *                      denser than its column, so this is too flat.
 *   q = 1.35 (shipped) 1.49 — dust lingers in the vortex plane, then
 *                      accelerates away. Matches the reference.
 *
 * The form keeps y(1) = -H exactly at every q, so `Height` stays the fall
 * depth whatever the profile.
 *
 * bump() decays to 1.3e-4 by tau = 1 (tp = 0.08), so the puff cannot disturb
 * where the column ends and `Height` stays exactly the fall depth. rimWeight
 * gates the puff to particles born near the rim: the reference's spray sits
 * around the OUTSIDE of the ellipse, not over its middle, because it is dust
 * being thrown off the rim rather than the whole disc rising.
 *
 * SPIN — angular rate decays as the dust falls, so the column reads as
 * near-vertical streaks low down while the disc still swirls at the top:
 * theta = a0 + turns*TAU * (1 - exp(-L*tau)) / (1 - exp(-L)). Normalised by
 * its own tail so `Spin` always means total turns over one life, whatever L is.
 *
 * DEPTH OF FIELD, focus at infinity — coc_px = K*focal/rz^2, NOT K*focal/rz.
 * A world-space blur radius that goes as 1/depth projects as 1/depth^2; get
 * that exponent wrong and the coc/size ratio is constant at every depth, so
 * the whole field defocuses uniformly and the Blur dial reads as a brightness
 * dial. Alpha is then divided by the area ratio for energy conservation and
 * walked back by pow(ratio, 0.8), i.e. a net pow(ratio, -1.2) — physically
 * exact bokeh reads too dim against a near-black ground.
 *
 * BLENDING — additive premultiplied, depth test off. Overlaps bloom to a hot
 * white core, which is what the reference does everywhere the column folds
 * over itself. The canvas clears transparent; the background is CSS underneath.
 *
 * HOVER — the reference itself has no gesture, but this port adds one on
 * request: hovering the frame eases in a subtle camera reaction — tilt drifts
 * toward the cursor's vertical position, the camera pulls in slightly, and
 * the swirl speeds up — then eases back out on pointer leave. `Hover`
 * controls the strength and `Transition` controls the ease.
 */

/* ---------------------------------------------------------------- constants */

const DPR_CAP = 1.5
const FOV_DEG = 42
const TAU = Math.PI * 2

/** Points per unit of `Density`. Density 120 -> 36,000 sprites. */
const PTS_PER_DENSITY = 300

/** `Radius` is a percent of this, so the dial is a whole number (rule 3). */
const RADIUS_REF = 300
/** `Dot Size` is a percent of this world radius. */
const DOT_REF = 2.0
/** `Blur` is a percent of this. World-area units: coc_px = K*focal/rz^2. */
const BLUR_REF = 5000

/** One particle life, in seconds, at `Speed` 50 — the rate it shipped at. */
const LIFE_AT_50 = 3.2

/* Cut controls, frozen at the value the scene shipped with (rule 8b): the
 * panel row is gone, the render path reads these and is unchanged. */

/** Outward flare over one life. The column is near-straight in the reference;
 *  it splays a little just under the rim and then runs parallel. */
const DRIFT = 0.05
/** Spin decay constant. Higher = the swirl dies off sooner as dust falls. */
const SPIN_LAMBDA = 3.0
/**
 * Descent exponent. Density per unit depth goes as tau^(1-q), so this is the
 * dial-free number that decides how top-heavy the column is. 1 = dead even,
 * 2 = free fall. 1.35 puts 1.49x as much life in the top half of the column
 * as the bottom, which is the reference's profile. Frozen, not exposed: it is
 * micro-physics no designer tunes (rule 11b), and `Height` plus the alpha
 * falloff already cover what the column looks like.
 */
const FALL_EASE = 1.35
/** Fraction of a life at which the rim puff peaks. Small: the reference's
 *  spray is a tight burst right at the rim, not a slow lob. */
const SPRAY_PEAK = 0.08
/** Birth radius, normalised, at which the rim puff starts to apply. */
const SPRAY_RIM = 0.5
/**
 * Framing: how far ABOVE the frame's centre the ring sits, as a fraction of
 * frame height. Puts the ellipse ~26% down the frame, as in the reference.
 *
 * This is a SCREEN offset, and it has to be. It was a world-space lift of the
 * ring plane, which quietly broke the Tilt dial: the camera is a rotation
 * about world X plus a pullback, so it sits at (0, D*sin t, D*cos t) and aims
 * at the ORIGIN. Lifting the ring to y = +195 then dropped the true elevation
 * to the ring's own plane from 20° to atan(147/940) = 8.9°, and since the
 * ellipse's minor/major ratio reads that true elevation, Tilt 20 measured
 * 0.165 against the reference's 0.32 — a control that does not mean what it
 * says (rule F). Offsetting in screen space leaves the camera aimed at the
 * ring plane, so Tilt is the real elevation and the ratio is sin(Tilt).
 */
const FRAME_SHIFT = 0.24
/** Birth radius band, as a fraction of `Radius`. sqrt() makes it area-uniform,
 *  so the disc fills evenly instead of piling up in the middle. The band starts
 *  at 0.35 rather than 0: a hollow shell shows see-through middles, and a solid
 *  disc loses the rim. */
const BIRTH_R0 = 0.35
/** Emission coherence. Birth angle = a random arc of this width PLUS a term
 *  proportional to the phase offset, so particles of similar age share a
 *  similar angle and the disc grows the faint spiral arms the reference has.
 *  At TAU the arms wash out completely; at 0 the emission is a hard spoke. */
const ARM_SPREAD = TAU * 0.75
const ARM_TURNS = 2.0
/** Ribbon half-width as a multiple of the ring's core half-width. The extra
 *  room is where the glow halo is painted. */
const RIBBON = 3.0
/** Ring tessellation. */
const RING_SEG = 720

/* ------------------------------------------------------------------ shaders */

// Every particle's whole life is solved here — position, spin, turbulence,
// projection, sprite size, depth of field and alpha. Nothing per-particle
// happens on the CPU, which is what makes tens of thousands of them free.
const VERT_DUST = `
precision highp float;

// x = birth angle seed 0..1, y = phase offset u 0..1,
// z = birth radius seed 0..1, w = turbulence phase seed 0..1
attribute vec4 aA;
// x = size seed 0..1, y = brightness seed 0..1
attribute vec2 aB;

uniform vec2  uRes;
uniform float uFocal;
uniform float uPhase;      // lives elapsed, wrapped to 0..1 on the CPU
uniform float uRadius;
uniform float uRise;       // rim puff peak, world units
uniform float uFall;       // fall depth over one life, world units
uniform float uSpinTurns;  // signed, turns per life
uniform float uScatter;    // world units of turbulence at end of life
uniform float uDotWorld;   // sprite world radius
uniform float uBlurK;      // depth-of-field strength, world-area units
uniform float uCamDist;
uniform float uTilt;       // radians
uniform float uYPx;        // framing offset, device px, +up
uniform float uAlpha;      // Base Color alpha

varying float vAlpha;

const float TAU = 6.2831853;

void main() {
    float tau = fract(aA.y + uPhase);

    // Emission angle: a random arc plus an age-proportional sweep. The sweep
    // is what draws the spiral arms — same-age particles share an angle.
    float ang = aA.x * ${ARM_SPREAD.toFixed(6)} + aA.y * TAU * ${ARM_TURNS.toFixed(1)};

    // Area-uniform birth radius, flaring slightly as it falls.
    float rN = mix(${BIRTH_R0.toFixed(3)}, 1.0, sqrt(aA.z));
    float r  = uRadius * rN * (1.0 + ${DRIFT.toFixed(3)} * tau);

    // Rim puff over a linear descent. bump peaks at 1 at tau = SPRAY_PEAK and
    // is ~0 by the end of life, so uFall stays exactly the fall depth.
    float tp   = ${SPRAY_PEAK.toFixed(3)};
    float bump = (tau / tp) * exp(1.0 - tau / tp);
    // Only dust born near the rim is thrown upward — the spray rings the
    // OUTSIDE of the ellipse in the reference, it does not lift the disc.
    float rimW = smoothstep(${SPRAY_RIM.toFixed(3)}, 1.0, rN);
    float y    = uRise * bump * rimW - uFall * pow(tau, ${FALL_EASE.toFixed(2)});

    // Spin, decaying. Normalised by its own tail so uSpinTurns is exactly the
    // number of turns completed over one full life.
    float L  = ${SPIN_LAMBDA.toFixed(1)};
    float sp = (1.0 - exp(-L * tau)) / (1.0 - exp(-L));
    float th = ang + uSpinTurns * TAU * sp;

    vec3 p = vec3(r * cos(th), y, r * sin(th));

    // Turbulence grows with age: the column is tight at the rim and ragged
    // further down, as in the reference.
    float n = aA.w * TAU;
    p.x += uScatter * tau * sin(n * 3.1 + tau * 5.3);
    p.z += uScatter * tau * sin(n * 4.7 + tau * 4.1 + 1.7);
    p.y += uScatter * tau * 0.6 * sin(n * 2.3 + tau * 6.7 + 3.3);

    // Camera: pitch only, no yaw. +z is toward the viewer. The camera aims at
    // the RING PLANE (y = 0) — framing is applied after the divide, below.
    float ct = cos(uTilt), st = sin(uTilt);
    float y2 =  p.y * ct - p.z * st;
    float z2 =  p.y * st + p.z * ct;
    float rz = uCamDist - z2;

    // Behind or level with the eye: park it off-screen with zero alpha rather
    // than let the perspective divide blow up.
    float live = step(1.0, rz);
    rz = max(rz, 1.0);

    vec2 s = vec2(p.x, y2) * uFocal / rz;
    s.y += uYPx;
    gl_Position = vec4(s / (uRes * 0.5), 0.0, 1.0);

    // Sharp projected radius, then the defocus disc. Focus at infinity, so the
    // world-space coc goes as 1/depth and its projection as 1/depth^2.
    float sizePx = uDotWorld * (0.6 + 0.8 * aB.x) * uFocal / rz;
    float coc    = uBlurK * uFocal / (rz * rz);
    float tot    = sizePx + coc;
    float ratio  = max(tot / max(sizePx, 0.0001), 1.0);

    // Drivers cap gl_PointSize (often at 64), and a clamp the shader does not
    // do itself is a clamp that differs per GPU. Do it here so a high Blur
    // looks the same everywhere.
    gl_PointSize = clamp(tot, 1.0, 64.0);

    // Short: tau ~ 0 IS the ring plane, and the plane is the brightest part
    // of the reference. A long fade-in empties the middle of the ellipse.
    float fadeIn  = smoothstep(0.0, 0.02, tau);
    // Gentle: density is already uniform in depth, so this is the only thing
    // shaping the column's falloff. A steeper exponent empties the lower half.
    float fadeOut = pow(1.0 - tau, 0.7);
    // pow(ratio,-2) conserves energy across the disc; pow(ratio,0.8) walks it
    // back, because exact bokeh reads too dim on a near-black ground.
    vAlpha = uAlpha * live * fadeIn * fadeOut
           * (0.35 + 0.65 * aB.y) * pow(ratio, -1.2);
}
`

const FRAG_DUST = `
precision highp float;
uniform vec3 uColor;
varying float vAlpha;
void main() {
    // Soft round sprite. Cut outside the disc so the sprite never shows its
    // square, which additive blending would otherwise stack into a grid.
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d) * 4.0;
    if (r2 > 1.0) discard;
    float a = vAlpha * exp(-r2 * 3.0);
    gl_FragColor = vec4(uColor * a, a);
}
`

// The ring is a screen-space ribbon, not gl.LINES: lineWidth clamps to 1 on
// every desktop driver, so thickness has to be built from geometry. Each strip
// vertex projects its own point AND its neighbour, and offsets along the
// perpendicular of the projected segment — which is why the ribbon keeps a
// constant screen thickness all the way round an ellipse whose tangent
// direction is changing.
const VERT_RING = `
precision highp float;

// x = position around the circle 0..1, y = side -1 or +1
attribute vec2 aRing;

uniform vec2  uRes;
uniform float uFocal;
uniform float uRadius;
uniform float uCamDist;
uniform float uTilt;
uniform float uYPx;     // framing offset, device px, +up
uniform float uThick;   // device px, core width
uniform float uSeg;

varying float vSide;
varying float vNear;

const float TAU = 6.2831853;

vec2 projPx(float a, out float rz) {
    vec3 p = vec3(uRadius * cos(a), 0.0, uRadius * sin(a));
    float ct = cos(uTilt), st = sin(uTilt);
    float y2 = p.y * ct - p.z * st;
    float z2 = p.y * st + p.z * ct;
    rz = max(uCamDist - z2, 1.0);
    return vec2(p.x, y2) * uFocal / rz + vec2(0.0, uYPx);
}

void main() {
    float a0 = aRing.x * TAU;
    float a1 = a0 + TAU / uSeg;
    float rz0, rz1;
    vec2 s0 = projPx(a0, rz0);
    vec2 s1 = projPx(a1, rz1);

    vec2 d  = s1 - s0;
    float dl = max(length(d), 0.0001);
    vec2 nrm = vec2(-d.y, d.x) / dl;

    // Perspective thickness: the near arc really is closer, so it really is
    // fatter. This is the reference's brighter lower arc, not a fudge.
    float near   = uCamDist / rz0;
    float halfW  = uThick * 0.5 * ${RIBBON.toFixed(1)} * near;
    vec2 px = s0 + nrm * aRing.y * halfW;

    gl_Position = vec4(px / (uRes * 0.5), 0.0, 1.0);
    vSide = aRing.y;
    vNear = near;
}
`

const FRAG_RING = `
precision highp float;
uniform vec3  uColor;
uniform float uAlpha;
varying float vSide;
varying float vNear;
void main() {
    // The ribbon is RIBBON x wider than the line itself; the core lives in the
    // middle third and the rest is glow.
    float s    = abs(vSide);
    float core = exp(-pow(s * ${RIBBON.toFixed(1)}, 2.0) * 4.0);
    float halo = exp(-s * s * 2.2) * 0.20;
    float a    = (core + halo) * uAlpha * clamp(vNear, 0.7, 1.4);
    gl_FragColor = vec4(uColor * a, a);
}
`

/* ------------------------------------------------------------------ helpers */

/**
 * Framer's Color control does NOT hand back hex. It emits `rgb()`, `rgba()`,
 * `hsl()`, `hsla()` and `var(--token, fallback)`, so a hex-only parser makes
 * the colour dials look dead. Returns premultiplication-ready 0..1 RGB plus
 * alpha.
 */
function parseColor(input?: string): [number, number, number, number] {
    if (!input) return [1, 1, 1, 1]
    let s = String(input).trim()

    // var(--token, fallback) -> use the fallback, which is a real colour.
    const v = s.match(/^var\(\s*[^,)]+\s*,\s*(.+)\)$/i)
    if (v) s = v[1].trim()

    const rgb = s.match(/^rgba?\(([^)]+)\)$/i)
    if (rgb) {
        const p = rgb[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat)
        return [
            (p[0] || 0) / 255,
            (p[1] || 0) / 255,
            (p[2] || 0) / 255,
            p.length > 3 && isFinite(p[3]) ? p[3] : 1,
        ]
    }

    const hsl = s.match(/^hsla?\(([^)]+)\)$/i)
    if (hsl) {
        const p = hsl[1].split(/[,\s/]+/).filter(Boolean)
        const h = (parseFloat(p[0]) || 0) / 360
        const sa = (parseFloat(p[1]) || 0) / 100
        const l = (parseFloat(p[2]) || 0) / 100
        const a = p.length > 3 && isFinite(parseFloat(p[3])) ? parseFloat(p[3]) : 1
        const q = l < 0.5 ? l * (1 + sa) : l + sa - l * sa
        const pp = 2 * l - q
        const hue = (t: number) => {
            if (t < 0) t += 1
            if (t > 1) t -= 1
            if (t < 1 / 6) return pp + (q - pp) * 6 * t
            if (t < 1 / 2) return q
            if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6
            return pp
        }
        return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3), a]
    }

    let x = s.replace("#", "")
    if (x.length === 3 || x.length === 4)
        x = x.split("").map((c) => c + c).join("")
    if (x.length < 6) return [1, 1, 1, 1]
    return [
        parseInt(x.slice(0, 2), 16) / 255,
        parseInt(x.slice(2, 4), 16) / 255,
        parseInt(x.slice(4, 6), 16) / 255,
        x.length >= 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1,
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
        console.warn("VortexDustFall shader:", gl.getShaderInfoLog(sh))
    return sh
}

function linkProg(gl: WebGLRenderingContext, vs: string, fs: string) {
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        console.warn("VortexDustFall link:", gl.getProgramInfoLog(prog))
    return prog
}

/* --------------------------------------------------------------------- props */

interface Props {
    background?: string
    /** Dust colour. Its ALPHA is the dust intensity. */
    baseColor?: string
    /** Ring colour. Its ALPHA is the ring intensity. */
    accentColor?: string
    density?: number
    /** % of DOT_REF world radius */
    dotSize?: number
    /** 0..100; 50 is the rate the scene shipped at */
    speed?: number
    /** Camera pullback, world units */
    distance?: number
    /** Camera pitch above the ring plane, degrees */
    tilt?: number
    ring?: {
        /** % of RADIUS_REF */
        radius?: number
        /** core width in CSS px */
        thickness?: number
    }
    fall?: {
        /** fall depth as a % of the ring radius */
        height?: number
        /** signed turns per life, as a -100..100 dial */
        spin?: number
        /** upward launch peak, % — 100 puts the peak at a quarter of the fall */
        spray?: number
    }
    field?: {
        /** turbulence, % */
        scatter?: number
        /** depth of field, % of BLUR_REF */
        blur?: number
    }
    hover?: {
        /** hover reactivity strength, % */
        amount?: number
        /** ease in/out timing for the hover response */
        transition?: {
            type?: "tween" | "spring"
            duration?: number
            ease?: string
        }
    }
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* A group the designer never opened arrives `undefined`, so each is spread over
 * a typed defaults literal rather than read through a `??` chain — one missed
 * key in a hand-written chain is what silently pins a control forever
 * (rule 11). Typed, so an omitted optional field is not a tsc error at the
 * read site (rule 10). */
const DEFAULT_RING: Required<NonNullable<Props["ring"]>> = {
    radius: 142,
    thickness: 11,
}
const DEFAULT_FALL: Required<NonNullable<Props["fall"]>> = {
    height: 140,
    spin: 36,
    spray: 0,
}
const DEFAULT_FIELD: Required<NonNullable<Props["field"]>> = {
    scatter: 300,
    blur: 0,
}
const DEFAULT_HOVER: Required<NonNullable<Props["hover"]>> = {
    amount: 103,
    transition: { type: "tween", duration: 0.6, ease: "easeOut" },
}

/* ----------------------------------------------------------------- component */

export default function VortexDustFall(props: Props) {
    const {
        background = "#000000",
        baseColor = "#FFFFFF",
        accentColor = "#FFFFFF",
        density = 129,
        dotSize = 107,
        speed = 46,
        distance = 1495,
        tilt = 7,
        style,
    } = props

    const ring = { ...DEFAULT_RING, ...(props.ring ?? {}) }
    const fall = { ...DEFAULT_FALL, ...(props.fall ?? {}) }
    const field = { ...DEFAULT_FIELD, ...(props.field ?? {}) }
    const hover = { ...DEFAULT_HOVER, ...(props.hover ?? {}) }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    // Pointer position/engagement, normalised -1..1 with y flipped so +1 is
    // the top of the frame. Read every frame inside the render loop, so it
    // lives in a ref rather than state (rule 6).
    const pointerRef = useRef({ x: 0, y: 0, active: 0 })

    // Every live input reaches the loop through a ref. Nothing here may land in
    // the effect's deps or the GL context is rebuilt on each prop change and
    // the shaders recompile (rule 6).
    const live = useRef({
        baseColor, accentColor, density, dotSize, speed, distance, tilt,
        ring, fall, field, hover,
    })
    live.current = {
        baseColor, accentColor, density, dotSize, speed, distance, tilt,
        ring, fall, field, hover,
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            premultipliedAlpha: true,
            depth: false,
        }) as WebGLRenderingContext | null
        if (!gl) return

        const dustProg = linkProg(gl, VERT_DUST, FRAG_DUST)
        const ringProg = linkProg(gl, VERT_RING, FRAG_RING)

        const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n)

        const dA = {
            a: gl.getAttribLocation(dustProg, "aA"),
            b: gl.getAttribLocation(dustProg, "aB"),
        }
        const dU = {
            res: U(dustProg, "uRes"), focal: U(dustProg, "uFocal"),
            phase: U(dustProg, "uPhase"), radius: U(dustProg, "uRadius"),
            rise: U(dustProg, "uRise"), fallD: U(dustProg, "uFall"),
            spinTurns: U(dustProg, "uSpinTurns"), scatter: U(dustProg, "uScatter"),
            dotWorld: U(dustProg, "uDotWorld"), blurK: U(dustProg, "uBlurK"),
            camDist: U(dustProg, "uCamDist"), tilt: U(dustProg, "uTilt"),
            yPx: U(dustProg, "uYPx"), alpha: U(dustProg, "uAlpha"),
            color: U(dustProg, "uColor"),
        }
        const rA = { ring: gl.getAttribLocation(ringProg, "aRing") }
        const rU = {
            res: U(ringProg, "uRes"), focal: U(ringProg, "uFocal"),
            radius: U(ringProg, "uRadius"), camDist: U(ringProg, "uCamDist"),
            tilt: U(ringProg, "uTilt"), yPx: U(ringProg, "uYPx"),
            thick: U(ringProg, "uThick"), seg: U(ringProg, "uSeg"),
            color: U(ringProg, "uColor"), alpha: U(ringProg, "uAlpha"),
        }

        /* ---- dust buffers, rebuilt only when Density changes ---- */
        const aBuf = gl.createBuffer()!
        const bBuf = gl.createBuffer()!
        let builtDensity = -1
        let count = 0

        const buildDust = (d: number) => {
            count = Math.max(1000, Math.round(d * PTS_PER_DENSITY))
            const arrA = new Float32Array(count * 4)
            const arrB = new Float32Array(count * 2)
            const rnd = mulberry32(0x51dd0c7)
            for (let i = 0; i < count; i++) {
                arrA[i * 4] = rnd()          // birth angle seed
                arrA[i * 4 + 1] = rnd()      // phase offset -> uniform lives at t=0
                arrA[i * 4 + 2] = rnd()      // birth radius seed
                arrA[i * 4 + 3] = rnd()      // turbulence phase
                arrB[i * 2] = rnd()          // size seed
                arrB[i * 2 + 1] = rnd()      // brightness seed
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, aBuf)
            gl.bufferData(gl.ARRAY_BUFFER, arrA, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bBuf)
            gl.bufferData(gl.ARRAY_BUFFER, arrB, gl.STATIC_DRAW)
            builtDensity = d
        }

        /* ---- ring ribbon, built once ---- */
        const ringBuf = gl.createBuffer()!
        const ringVerts = (RING_SEG + 1) * 2
        {
            const arr = new Float32Array(ringVerts * 2)
            for (let i = 0; i <= RING_SEG; i++) {
                const t = i / RING_SEG
                arr[i * 4] = t
                arr[i * 4 + 1] = -1
                arr[i * 4 + 2] = t
                arr[i * 4 + 3] = 1
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, ringBuf)
            gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW)
        }

        /* ---- additive premultiplied, depth off ---- */
        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE)

        /* ---- sizing ---- */
        let dpr = 1
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const cssW = canvas.clientWidth || host.clientWidth || 1
            const cssH = canvas.clientHeight || host.clientHeight || 1
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            gl.viewport(0, 0, w, h)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        /* ---- loop ---- */
        // Phase is accumulated, not derived from absolute time: changing Speed
        // then changes the RATE and never teleports the field to a new phase.
        let phase = 0
        let last = performance.now()
        let raf = 0
        // Eased hover state: lerps toward pointerRef's target each frame so
        // the reaction ramps in/out over `Transition` instead of snapping.
        let hoverX = 0
        let hoverY = 0
        let hoverAmt = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min((now - last) / 1000, 0.05)
            last = now
            const L = live.current

            if (L.density !== builtDensity) buildDust(L.density)
            if (count === 0) return

            // Ease the pointer toward its target over `Hover.Transition`'s
            // duration, so the reaction ramps rather than snaps.
            const hoverDur = Math.max(0.05, L.hover.transition?.duration ?? 0.6)
            const hoverK = 1 - Math.exp(-dt / hoverDur)
            const pt = pointerRef.current
            hoverX += (pt.x - hoverX) * hoverK
            hoverY += (pt.y - hoverY) * hoverK
            hoverAmt += (pt.active - hoverAmt) * hoverK
            const hoverAmount = L.hover.amount / 100

            // Speed 0 freezes the field outright. Hovering speeds the swirl
            // up slightly, easing back out on pointer leave.
            const speedBoost = 1 + hoverAmt * hoverAmount * 0.6
            phase = (phase + (dt * ((L.speed / 50) * speedBoost)) / LIFE_AT_50) % 1

            const w = canvas.width
            const h = canvas.height
            const focal = h / (2 * Math.tan(((FOV_DEG / 2) * Math.PI) / 180))

            const radius = RADIUS_REF * (L.ring.radius / 100)
            const fallH = radius * (L.fall.height / 100)
            // Spray 100 throws the rim puff a quarter of the fall depth above
            // the ring plane.
            const rise = fallH * (L.fall.spray / 400)
            // Screen space, so it scales with the frame and never moves the
            // camera's aim point off the ring plane.
            const yPx = h * FRAME_SHIFT
            // 100 on the dial = 1.5 turns per life; 50 is the shipped swirl.
            const spinTurns = (L.fall.spin / 100) * 1.5
            const scatter = radius * (L.field.scatter / 100) * 0.15
            const dotWorld = DOT_REF * (L.dotSize / 100)
            const blurK = BLUR_REF * (L.field.blur / 100)
            // Cursor's vertical position nudges the pitch, and hovering pulls
            // the camera in slightly — both scaled by `Hover` and eased in/out
            // by hoverAmt.
            const tiltRad =
                (L.tilt * Math.PI) / 180 +
                hoverY * hoverAmount * hoverAmt * ((10 * Math.PI) / 180)
            const camDist = L.distance - hoverAmt * hoverAmount * 150

            const [br, bg, bb, ba] = parseColor(L.baseColor)
            const [ar, ag, ab, aa] = parseColor(L.accentColor)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)

            /* ==== DUST ==== */
            gl.useProgram(dustProg)
            gl.uniform2f(dU.res, w, h)
            gl.uniform1f(dU.focal, focal)
            gl.uniform1f(dU.phase, phase)
            gl.uniform1f(dU.radius, radius)
            gl.uniform1f(dU.rise, rise)
            gl.uniform1f(dU.fallD, fallH)
            gl.uniform1f(dU.spinTurns, spinTurns)
            gl.uniform1f(dU.scatter, scatter)
            gl.uniform1f(dU.dotWorld, dotWorld * dpr)
            gl.uniform1f(dU.blurK, blurK * dpr)
            gl.uniform1f(dU.camDist, camDist)
            gl.uniform1f(dU.tilt, tiltRad)
            gl.uniform1f(dU.yPx, yPx)
            gl.uniform1f(dU.alpha, ba)
            gl.uniform3f(dU.color, br, bg, bb)

            gl.bindBuffer(gl.ARRAY_BUFFER, aBuf)
            gl.enableVertexAttribArray(dA.a)
            gl.vertexAttribPointer(dA.a, 4, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ARRAY_BUFFER, bBuf)
            gl.enableVertexAttribArray(dA.b)
            gl.vertexAttribPointer(dA.b, 2, gl.FLOAT, false, 0, 0)
            gl.drawArrays(gl.POINTS, 0, count)

            /* ==== RING ==== */
            gl.useProgram(ringProg)
            gl.uniform2f(rU.res, w, h)
            gl.uniform1f(rU.focal, focal)
            gl.uniform1f(rU.radius, radius)
            gl.uniform1f(rU.camDist, camDist)
            gl.uniform1f(rU.tilt, tiltRad)
            gl.uniform1f(rU.yPx, yPx)
            gl.uniform1f(rU.thick, L.ring.thickness * dpr)
            gl.uniform1f(rU.seg, RING_SEG)
            gl.uniform3f(rU.color, ar, ag, ab)
            gl.uniform1f(rU.alpha, aa)

            gl.bindBuffer(gl.ARRAY_BUFFER, ringBuf)
            gl.enableVertexAttribArray(rA.ring)
            gl.vertexAttribPointer(rA.ring, 2, gl.FLOAT, false, 0, 0)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, ringVerts)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            // No loseContext() — getContext hands back the same context per
            // canvas, so StrictMode's remount would reuse a force-lost one and
            // render black (rule 6).
        }
    }, [])

    return (
        <div
            ref={hostRef}
            onPointerMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                pointerRef.current = {
                    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
                    y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
                    active: 1,
                }
            }}
            onPointerLeave={() => {
                pointerRef.current = { x: 0, y: 0, active: 0 }
            }}
            style={{
                // Floor BEFORE the spread, so an explicit size on the instance
                // still wins. The canvas is absolutely positioned, so the root
                // has no in-flow content and collapses under Fit Content.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
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
                }}
            />
        </div>
    )
}
