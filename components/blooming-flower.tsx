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
 * The bloom gate's settle. A spring, not a tween: a flower opening wants the
 * small overshoot at the end of the travel — the petals fling slightly past
 * open and settle back. Designers get native Spring physics (rule 2).
 */
const DEFAULT_TRANSITION: Motion = {
    type: "spring",
    stiffness: 90,
    damping: 18,
    mass: 1,
}

/**
 * BLOOMING FLOWER — a point-cloud flower that opens on hover and closes to a
 * bud when the pointer leaves.
 *
 * WHAT THIS IS: ~60k–100k GL point sprites forming a layered flower on a stem.
 * Three kinds of point share one buffer and one `drawArrays(POINTS)` call:
 *   0 — PETAL. The bulk. Placed on a parametric petal surface.
 *   1 — STAMEN. A dense dome of accent-coloured points at the centre.
 *   2 — STEM. A swaying tapered stalk running from the flower down past the
 *       bottom of the frame, so the flower is rooted rather than floating.
 *
 * THE JOINT. Head and stem share ONE expression for the lateral sway, `swayAt`,
 * the head reading it at t = 0 and the stem along its length. That is why the
 * flower cannot drift off the top of its own stalk. The head also scales with
 * the bloom while the stem does NOT — a stem that shrank with the bud would
 * pull its own root out of the ground every time the pointer left — and both
 * hang off one fixed `ATTACH_Y`, so the flower never slides up its own stalk.
 *
 * PETAL SURFACE. Each petal point stores (u, v) — u along the midrib base→tip,
 * v across the width — plus its petal azimuth φ and its whorl index. The midrib
 * is a CIRCULAR ARC in the (radial, up) plane: the angle from +Y varies linearly
 * with arclength, `θ(s) = θ0 + k·s`, so a closed form gives the midrib without
 * any stepping. That is the whole reason a petal can curl smoothly for free in
 * the vertex shader. It is written in the half-angle form, `s·sin(θ0 + ks/2)·
 * sinc(ks/2)`, which needs no guarded divide and stays exact as `k → 0` — see
 * the comment at the arc itself for why the direct `(cos θ0 − cos θ)/k` cannot.
 *
 * PETAL WIDTH comes from the petal's ANGULAR SLOT at each point's own radius,
 * never from its length, so neighbouring petals keep a real gap at every petal
 * count instead of fusing into one disc.
 *
 * THE BLOOM. One uniform, `uBloom` ∈ [0,1], drives everything: the base pitch
 * θ0, the tip pitch θ1 (0.28 rad closed → 1.55, the tip splaying out to
 * horizontal), petal length, overall scale and stamen radius.
 * Inner whorls stay tighter than outer ones at the same bloom, and `Stagger`
 * delays each whorl's window so the flower opens outside-in.
 *
 * IDLE IS NOT STILL. Framer's canvas needs visible motion without scroll or
 * IntersectionObserver, and this scene has no rotation to supply it — the
 * flower does not spin. What moves is WEATHER: the stalk sways, every petal
 * flutters on its own phase and the head breathes ±1.2%.
 * `Speed` is the rate of all of it at once — one clock, so nothing can run at
 * odds with anything else — and 0 is genuinely dead still. Raw rAF (rule 6).
 *
 * ONE DRAW CALL. The canvas is transparent; `Background` is a CSS layer
 * underneath it, never a GL clear colour or a GL pass.
 *
 * Rule 6 recipe: ONE GL context built in useEffect([]); every live input read
 * from a ref inside a raw rAF loop. Never calls loseContext().
 */

/* ---------------------------------------------------------------- constants */

const TAU = Math.PI * 2
/** Petal midrib arclength at the outermost whorl, world units. Scene reference. */
const PETAL_LEN = 520
/** Stamen dome radius, world units. */
const CORE_R = 85
const FOV = 34
/** Point clouds can afford a little more than the raymarched components' 1.25. */
const DPR_CAP = 1.5

/**
 * Camera pullback at the default framing, world units. Measured, not guessed:
 * an open flower's half-extent projects to 353x328 of a 600x400 half-frame at
 * this distance, so it fills the frame without any petal tip leaving it, and
 * the stem still has room to run out of the bottom. Solved with ATTACH_Y.
 */
const BASE_DISTANCE = 2080

/**
 * Petal points per unit of Density. Density 45 gives ~63k petal points, ~3.5k
 * per petal at the default 6x3 — enough for a petal to read as a surface. The
 * width rewrite made each petal narrower, so the old budget left them looking
 * like dust rather than like petals.
 */
const PETAL_PER_DENSITY = 1400
/** Stamen and stem as a share of the petal count. */
const CORE_SHARE = 0.1
const STEM_SHARE = 0.26

/**
 * Point radius at Dot Size 100, world units. `Dot Size` is a PERCENT of this
 * (rule 8b) — a px radius would mean a different dot at every Density and
 * Distance.
 */
const DOT_AT_100 = 2.4

/**
 * Wind rate at Speed 50 — the rate the scene shipped at, per rule 8b's reading.
 * It scales ONE clock, so sway, flutter and breathing all speed up together and
 * can never drift out of relation to each other. Amplitude is NOT
 * on this dial: a rate and a strength are two meanings and rule M keeps them off
 * one control.
 */
const WIND_AT_50 = 1

/* Cut controls (rule 8b), frozen at the value the scene shipped with. The panel
 * row is gone; the render path is unchanged. Cut because each only scales a
 * dial already on the panel, or is geometry a designer would not re-dial:
 *   Scatter  — petal thickness. It is what makes this a point CLOUD flower
 *              rather than a shaded surface, but one value reads right at every
 *              Density, so it is not a decision.
 *   Curl     — tip curl at full bloom. Bloom already owns the open/closed
 *              travel; a second dial scaling its endpoint is rule 8b's
 *              "a second dial that only scales a first one".
 *   Cup      — how far the petal edges curl toward the concave side.
 *   Roll     — camera roll. `Tilt` is the framing dial; a flower has no lean.
 */
/** Petal thickness — gaussian spread along the petal normal, world units. */
const SCATTER = 9
/** Camera roll, radians. */
const ROLL = 0
/**
 * Whorl bloom stagger, 0..1 (cut to make panel room for `Stem Color` — rule M:
 * a system that is not the flower's own colour cannot borrow the flower's).
 * Frozen at the 55 it shipped at: outer whorls still open ahead of inner ones.
 */
const STAGGER = 0.55

/* ------------------------------------------------------------------ shaders */

/**
 * Vertex shader. Attribute meaning is PER KIND — one buffer, three layouts,
 * selected by aB.z:
 *
 *   kind 0 (petal)   aA = (u, v, φ, whorl 0..1)   aB = (jitter, gauss, 0, —)
 *   kind 1 (stamen)  aA = (r 0..1, azimuth, elev 0..1, —)  aB = (jitter, —, 1, —)
 *   kind 2 (stem)    aA = (t 0..1 down, azimuth, radial 0..1, —)  aB = (jitter, —, 2, —)
 *
 * aB.y is a gaussian, and only the petal branch reads it. aB.w is unused since
 * the pollen motes were removed; it stays in the layout because the two vec4s
 * are what keeps the stride at a flat 32 bytes.
 */
const VERT = `
precision highp float;

attribute vec4 aA;
attribute vec4 aB;

uniform vec2  uRes;
uniform float uFocal;
uniform float uDist;
uniform float uPitch;
uniform float uRoll;
uniform float uTime;       // seconds, for sway / flutter / breathing
uniform float uDot;        // point radius, world units
uniform float uBloom;      // 0 = closed bud, 1 = fully open
uniform float uStagger;    // 0..1, how far apart the whorls open
uniform float uPetalLen;
uniform float uPetals;     // petals per whorl — sets the angular slot, see halfW
uniform float uCoreR;
uniform float uScatter;
uniform vec3  uBase;
uniform vec3  uStem;
uniform vec3  uAccent;
uniform float uAccentMix;  // 0..1

varying vec3  vCol;
varying float vA;

#define PI  3.14159265
#define TAU 6.28318530

// Petal pitch measured FROM +Y (0 = straight up). Closed is a near-vertical
// bud; open splays the base out and curls the tip past horizontal.
const float TH0_BUD  = 0.10;
const float TH0_OPEN = 0.42;
const float TH1_BUD  = 0.28;
const float TH1_OPEN = 1.55;   // ~89 degrees — the tip splays out to horizontal

const float BUD_SCALE = 0.45;  // whole-flower scale when closed
const float BUD_LEN   = 0.72;  // petal length when closed
const float CUP       = 0.42;  // edge curl toward the concave side (cut dial)
const float FLUTTER   = 0.055; // per-petal idle wobble, radians at the tip
/**
 * Share of its angular slot a petal fills. The half-width CANNOT be a fraction
 * of petal length: at 6 petals the slot at mid-petal is 282 world units wide
 * and a length-derived petal was 416, so neighbours overlapped by 47% and the
 * open flower fused into one disc with no lobes at all. Deriving the width from
 * the slot instead keeps a real gap between petals at EVERY petal count.
 */
const float PETAL_FILL = 0.72;

/* --- the stem --- */
/**
 * Where the stem meets the flower, world y — and the scene's framing offset,
 * since everything hangs off it. Solved with BASE_DISTANCE against three
 * constraints at once: the open flower's half-extent inside 600x400, its centre
 * above the frame centre, and the stem still bright where it crosses the bottom
 * edge. 40 / 2080 lands at 353x328, centre +139px, crossing at t = 0.41.
 */
const float ATTACH_Y  = 40.0;
/**
 * Stem length below the attach point. A stem that STOPS inside the frame is
 * still a floating flower with a stick attached, so this has to outrun the
 * bottom edge at the far end of the Distance range too — where the scene is
 * small and the stem foreshortens hardest. Solved against the projection, not
 * guessed: it crosses the bottom edge by t = 0.53 at Distance 2600 / Tilt 42.
 */
const float STEM_LEN  = 3000.0;
/** Stem radius at the attach point; it thickens toward the ground. */
const float STEM_R    = 24.0;
/** Peak sway at the flower head, world units. */
const float SWAY      = 26.0;

/**
 * Per-whorl bloom window. Outer whorls (ln = 0) open first; Stagger widens the
 * gap. At Stagger 1 the outermost whorl is fully open by uBloom 0.3 and the
 * innermost only starts there — the flower unpacks outside-in.
 */
float whorlBloom(float ln) {
    float sp = uStagger * 0.7;
    float lo = ln * sp;
    float hi = lo + (1.0 - sp);
    return smoothstep(lo, hi, uBloom);
}

/**
 * Where the stem is, laterally, at height t (0 = the flower, 1 = the ground).
 * The root is fixed and the head is free, so the amplitude grows with (1-t)^2.
 * The HEAD reads this at t = 0 — that shared call is the whole joint: the
 * flower cannot drift off the top of its own stem, because both are the same
 * expression evaluated at the same t.
 */
vec2 swayAt(float t) {
    float amp = SWAY * (1.0 - t) * (1.0 - t);
    float ph  = uTime * 0.55 - t * 1.2;
    return vec2(sin(ph), sin(ph * 0.83 + 1.7)) * amp;
}

void main() {
    float kind = aB.z;
    float jit  = aB.x;

    // Whole-flower scale, plus a breath so a Framer canvas never sees a still
    // frame even with Speed at 0.
    float S = mix(BUD_SCALE, 1.0, uBloom) * (1.0 + sin(uTime * 0.9) * 0.012);

    vec3  P;
    vec3  col;
    float bri;
    float szv = 0.55 + jit * 1.1;

    if (kind < 0.5) {
        /* ---------------------------------------------------------- petal */
        float u   = aA.x;
        float v   = aA.y;
        float phi = aA.z;
        float ln  = aA.w;

        float b     = whorlBloom(ln);
        float inner = 1.0 - ln * 0.32;   // inner whorls are smaller and tighter

        float th0 = mix(TH0_BUD, TH0_OPEN, b) * (0.70 + 0.30 * inner);
        float th1 = mix(TH1_BUD, TH1_OPEN * inner, b);
        // Wind flutter, strongest at the tip; each petal on its own phase.
        th1 += sin(uTime * 1.7 + aA.z * 3.0 + ln * 2.4) * FLUTTER;

        float L = uPetalLen * (0.42 + 0.58 * inner) * mix(BUD_LEN, 1.0, b);
        float s = u * L;

        // Circular-arc midrib, in the half-angle form. The direct integral is
        //   R = (cos th0 - cos th)/k,  H = (sin th - sin th0)/k
        // which needs a guarded k and STILL loses the straight-petal limit: at
        // k == 0 the numerator is exactly 0, so a guarded denominator collapses
        // the petal to zero length, and a small enough epsilon just moves the
        // failure into float32 cancellation. Applying
        //   cos A - cos B = 2 sin((A+B)/2) sin((B-A)/2)
        //   sin B - sin A = 2 cos((A+B)/2) sin((B-A)/2)
        // factors k out into a single sinc, which is 1 at zero with no divide.
        float k   = (th1 - th0) / max(L, 1.0);
        float x   = k * s * 0.5;
        float sc  = abs(x) < 1e-4 ? 1.0 : sin(x) / x;   // sinc; exact at x = 0
        float mid = th0 + x;
        float R   = s * sin(mid) * sc;   // radial advance
        float H   = s * cos(mid) * sc;   // vertical advance
        float th  = th0 + k * s;         // true tip angle, for the surface normal

        vec3 rh = vec3(cos(phi), 0.0, sin(phi));   // radial
        vec3 tt = vec3(-sin(phi), 0.0, cos(phi));  // tangential = width axis
        vec3 nh = rh * cos(th) - vec3(0.0, 1.0, 0.0) * sin(th);  // surface normal

        // Width profile: zero at base and tip, widest just past the middle.
        float wp = pow(max(sin(PI * pow(u, 0.85)), 0.0), 0.55);
        // Half of the petal's angular slot, taken at THIS point's radius, so a
        // petal fans out with the arc it has to share and never crosses its
        // neighbour however many petals the designer asks for.
        float radial = uCoreR * 1.10 + R;
        float halfW  = wp * PETAL_FILL * (PI / max(uPetals, 3.0)) * radial;

        P = rh * radial
          + vec3(0.0, H, 0.0)
          + tt * (v * halfW)
          - nh * (CUP * halfW * v * v)        // cupping: edges toward concave
          + nh * (aB.y * uScatter * (0.35 + wp));  // petal thickness

        // Accent gathers at the tip and along the rim, which is where a real
        // petal's colour breaks. Accent Mix also recruits a share of the body
        // points outright, so the dial still reads at low tip/rim coverage.
        float tip  = smoothstep(0.55, 1.0, u);
        float rim  = smoothstep(0.55, 1.0, abs(v));
        float mixA = clamp(
            uAccentMix * (0.35 + tip * 0.80 + rim * 0.50)
            + step(jit, uAccentMix) * 0.25,
            0.0, 1.0);
        col = mix(uBase, uAccent, mixA);
        bri = (0.35 + jit * 0.50) * (0.55 + wp * 0.55) * (0.75 + b * 0.45);
        // Every petal converges at u = 0. Without this fade they stack additively
        // there and the flower grows an opaque white knot over the stamens.
        bri *= smoothstep(0.0, 0.22, u);
    } else if (kind < 1.5) {
        /* --------------------------------------------------------- stamen */
        float cr = aA.x;
        float ca = aA.y;
        float el = aA.z * PI * 0.5;   // 0 = rim, PI/2 = crown of the dome

        float rad = uCoreR * (0.30 + 0.70 * cr) * mix(0.72, 1.0, uBloom);
        P = vec3(cos(ca) * cos(el), sin(el) * 0.85, sin(ca) * cos(el)) * rad;
        P.y += uCoreR * 0.12;

        col = mix(uAccent, vec3(1.0), 0.35 * jit);
        bri = (0.50 + jit * 0.55) * (0.50 + uBloom * 0.60);
        szv *= 0.85;
    } else {
        /* ----------------------------------------------------------- stem */
        float t   = aA.x;            // 0 at the flower, 1 at the ground
        float az  = aA.y;
        float rr  = aA.z;            // 0..1, already surface-biased on the CPU
        float rad = STEM_R * (0.55 + 0.45 * t);   // thickens toward the root
        vec2  sw  = swayAt(t);

        P = vec3(cos(az) * rr * rad + sw.x,
                 -t * STEM_LEN,
                 sin(az) * rr * rad + sw.y);

        col = uStem;
        // Brightest just under the flower, falling off toward the ground, so
        // the stem reads as lit from the bloom rather than as a drawn line.
        bri = (0.30 + jit * 0.35) * (0.70 + 0.40 * (1.0 - t));
        // Fade the far end out entirely. Length alone cannot win at every
        // Distance and Tilt — at a steep top-down the stem foreshortens faster
        // than any finite stalk can outrun — so the tail vanishes into the
        // background rather than ever showing a cut end.
        bri *= 1.0 - smoothstep(0.62, 1.0, t);
        szv *= 0.75;
    }

    // Energy conservation across the bloom. Blending is additive, so the same
    // point budget packed into the bud's 0.45x area lands ~5x the flux per pixel
    // and the closed flower saturates to a solid white blob. Scaling brightness
    // with the area the points now cover keeps the bud the same colour it is
    // when open, instead of a lamp.
    if (kind < 1.5) bri *= pow(S, 1.05);

    // The HEAD scales with the bloom and rides the top of the stem; the stem
    // does not scale at all. A stem that shrank with the bud would pull its own
    // root out of the ground every time the pointer left.
    if (kind < 1.5) {
        P *= S;
        P.xz += swayAt(0.0);
    }
    // One fixed attach point for every kind. It replaces the old bloom-driven
    // recentring: with a stem the flower must NOT slide up and down its own
    // stalk as it opens, and a real flower's tips genuinely do drop as the bud
    // splays, which is what a fixed attach renders.
    P.y += ATTACH_Y;

    /* ------ camera ------
     * Camera sits at world (0, dist*sin(pitch), -dist*cos(pitch)), looking at
     * the origin, then rolls in screen space. */
    float c  = cos(uPitch);
    float sp = sin(uPitch);
    float ry = P.y * c + P.z * sp;
    float rz = uDist - P.y * sp + P.z * c;

    if (rz < 30.0) {
        gl_Position  = vec4(2.0, 2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vA   = 0.0;
        vCol = uBase;
        return;
    }

    float cr = cos(uRoll);
    float sr = sin(uRoll);
    float sx = (P.x * cr - ry * sr) * uFocal / rz;
    float sy = (P.x * sr + ry * cr) * uFocal / rz;
    gl_Position  = vec4(sx / (uRes.x * 0.5), sy / (uRes.y * 0.5), 0.0, 1.0);
    gl_PointSize = clamp(uDot * uFocal / rz * szv, 1.0, 26.0);

    float dep = 1.0 - 0.50 * smoothstep(uDist * 0.55, uDist * 1.50, rz);

    vCol = col;
    vA   = clamp(bri * dep, 0.0, 3.0);
}
`

/** Soft round dot. Premultiplied, so the alpha is folded into the colour. */
const FRAG = `
precision highp float;
varying vec3  vCol;
varying float vA;
void main() {
    vec2  c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float a = vA * (1.0 - smoothstep(0.5, 1.0, d));
    gl_FragColor = vec4(vCol * a, a);
}
`

/* ------------------------------------------------------------------ helpers */

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
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function gauss(rnd: () => number) {
    const u1 = Math.max(1e-9, rnd())
    const u2 = rnd()
    const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2)
    return Math.max(-3, Math.min(3, g))
}

/**
 * Draw u with density proportional to the petal's width profile, so points
 * cover the petal by AREA. Sampling u uniformly would pile them up at the base
 * and the tip, where the petal is narrow — the two places a flower most needs
 * to read as a clean silhouette.
 */
function sampleU(rnd: () => number) {
    for (let i = 0; i < 24; i++) {
        const u = rnd()
        const w = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, 0.85))), 0.55)
        if (rnd() < w) return u
    }
    return rnd()
}

function compile(
    gl: WebGLRenderingContext,
    type: number,
    src: string,
    tag: string
) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("BloomingFlower shader " + tag + ":", gl.getShaderInfoLog(sh))
    }
    return sh
}

/* --------------------------------------------------------------------- props */

interface FlowerGroup {
    /** Petals per whorl. */
    petals: number
    /** Concentric whorls, outermost first. */
    layers: number
}

interface Props {
    background?: string
    baseColor?: string
    stemColor?: string
    accentColor?: string
    accentMix?: number
    density?: number
    dotSize?: number
    /** 0..100 wind rate; 50 is the rate the flower shipped at, 0 is dead still. */
    speed?: number
    /** Camera pullback, world units. */
    distance?: number
    /** Camera pitch above the flower, degrees. */
    tilt?: number
    flower?: Partial<FlowerGroup>
    /** 0..100. How far the flower closes at idle. 100 = a full bud, 0 = never closes. */
    closed?: number
    /** The shape before `closed` moved to the top level. Still read. */
    bloom?: { closed?: number; stagger?: number }
    transition?: Motion
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ----------------------------------------------------------------- component */

function __BaseImpl_BloomingFlower(props: Props) {
    const {
        background = "#07060C",
        baseColor = "#C4327E",
        stemColor = "#2F7A4F",
        accentColor = "#FFD98A",
        accentMix = 100,
        density: densityInput = 100,
        dotSize = 10,
        speed = 50,
        distance = 2820,
        tilt = 66,
        flower = { petals: 16, layers: 1 },
        bloom,
        transition = { ease: [0.44, 0, 0.56, 1], mass: 1, type: "tween", delay: 0, damping: 60, duration: 0.4, stiffness: 800 },
        style,
    } = props

    // Density feeds the geometry buffer's point count directly, so an
    // unguarded NaN there rounds every loop bound to NaN, the buffer builds
    // with zero points, and the canvas goes blank — and stays blank, since
    // the bad value gets cached as the last "built" key. Clamp and fall back.
    const density = Number.isFinite(densityInput)
        ? Math.max(1, Math.min(100, densityInput))
        : 100

    const { petals = 16, layers = 1 } = flower
    const closed = props.closed ?? bloom?.closed ?? 100

    /* The bloom gate. A MotionValue read by the loop with .get(), never a
     * setState — and the Transition lives in a ref so changing it cannot land in
     * the GL effect's deps and rebuild the context (rule 6). */
    const gateMV = useRef(motionValue(0)).current
    const transitionRef = useRef(transition)
    transitionRef.current = transition

    // 50 is the shipped rate. Scales the single clock every wind term reads.
    const windRate = (Math.max(0, speed) / 50) * WIND_AT_50
    // Dot Size is a percent of the scene's reference radius (rule 8b).
    const dotWorld = (Math.max(1, dotSize) / 100) * DOT_AT_100
    // `Closed` folds into the gate rather than into the shader: it sets how far
    // the IDLE end of the travel drops. At Closed 0 the flower is always open
    // and hovering does nothing, which is what a 0 on that dial should mean.
    const closedAmt = Math.max(0, Math.min(100, closed)) / 100

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Every live input flows through this ref: the GL context is built once and
    // must never be torn down by a control change (rule 6).
    const live = useRef({
        base: parseColor(baseColor),
        stem: parseColor(stemColor),
        accent: parseColor(accentColor),
        accentMix: Math.max(0, Math.min(100, accentMix)) / 100,
        density,
        dotWorld,
        windRate,
        distance,
        tilt,
        petals,
        layers,
        closedAmt,
    })
    live.current = {
        base: parseColor(baseColor),
        stem: parseColor(stemColor),
        accent: parseColor(accentColor),
        accentMix: Math.max(0, Math.min(100, accentMix)) / 100,
        density,
        dotWorld,
        windRate,
        distance,
        tilt,
        petals,
        layers,
        closedAmt,
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

        /* ---- program ---- */
        const prog = gl.createProgram()!
        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT, "vert"))
        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG, "frag"))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.warn("BloomingFlower link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const aA = gl.getAttribLocation(prog, "aA")
        const aB = gl.getAttribLocation(prog, "aB")
        const U = (n: string) => gl.getUniformLocation(prog, n)
        const u = {
            res: U("uRes"),
            focal: U("uFocal"),
            dist: U("uDist"),
            pitch: U("uPitch"),
            roll: U("uRoll"),
            time: U("uTime"),
            dot: U("uDot"),
            bloom: U("uBloom"),
            stagger: U("uStagger"),
            petalLen: U("uPetalLen"),
            petals: U("uPetals"),
            coreR: U("uCoreR"),
            scatter: U("uScatter"),
            base: U("uBase"),
            stem: U("uStem"),
            accent: U("uAccent"),
            accentMix: U("uAccentMix"),
        }

        /* ---- geometry buffer (rebuilt when density / petals / whorls change) ---- */
        const buf = gl.createBuffer()!
        let count = 0
        let builtKey = ""

        const build = (d: number, nPetals: number, nLayers: number) => {
            const P = Math.max(3, Math.round(nPetals))
            const LN = Math.max(1, Math.round(nLayers))

            const petalTotal = Math.max(600, Math.round(d * PETAL_PER_DENSITY))
            const coreTotal = Math.round(petalTotal * CORE_SHARE)
            const stemTotal = Math.round(petalTotal * STEM_SHARE)
            // Points are apportioned to each whorl and then, inside that whorl,
            // to each petal via Math.round (and floored to a minimum of 1 per
            // petal), so the points actually pushed for a whorl can land a few
            // over its share of petalTotal. Without headroom, the buffer they
            // overflow into is short by exactly that many floats:
            // `data.subarray(0, p * 8)` below silently clamps to the array's
            // real (smaller) length while `count` still claims the larger `p`,
            // and that mismatch makes gl.drawArrays refuse to draw the whole
            // buffer — not just the overflow — leaving the canvas blank. Worst
            // case is under P points per whorl, so P * LN is ample.
            const petalHeadroom = P * LN
            const total = petalTotal + petalHeadroom + coreTotal + stemTotal

            // 8 floats per point: aA (vec4) then aB (vec4), interleaved.
            const data = new Float32Array(total * 8)
            const rnd = mulberry32(0x5eed10f)
            let p = 0
            const push = (
                a0: number, a1: number, a2: number, a3: number,
                b0: number, b1: number, b2: number, b3: number
            ) => {
                const o = p * 8
                data[o] = a0; data[o + 1] = a1; data[o + 2] = a2; data[o + 3] = a3
                data[o + 4] = b0; data[o + 5] = b1; data[o + 6] = b2; data[o + 7] = b3
                p++
            }

            // Outer whorls are larger, so they take proportionally more points.
            const weights: number[] = []
            let wSum = 0
            for (let l = 0; l < LN; l++) {
                const w = 1 - (l / Math.max(1, LN)) * 0.45
                weights.push(w)
                wSum += w
            }

            for (let l = 0; l < LN; l++) {
                const ln = LN === 1 ? 0 : l / (LN - 1)
                // Half-step each whorl so petals interleave instead of stacking.
                const offset = (l * Math.PI) / P
                const perLayer = Math.round((petalTotal * weights[l]) / wSum)
                const perPetal = Math.max(1, Math.round(perLayer / P))
                for (let k = 0; k < P; k++) {
                    const phi = offset + (k * TAU) / P
                    for (let i = 0; i < perPetal; i++) {
                        push(
                            sampleU(rnd),
                            rnd() * 2 - 1,
                            phi,
                            ln,
                            rnd(),
                            gauss(rnd),
                            0,
                            0
                        )
                    }
                }
            }

            for (let i = 0; i < coreTotal; i++) {
                // cbrt keeps the dome solid rather than shell-heavy.
                push(
                    Math.cbrt(rnd()),
                    rnd() * TAU,
                    rnd(),
                    0,
                    rnd(),
                    0,
                    1,
                    0
                )
            }

            for (let i = 0; i < stemTotal; i++) {
                // pow(r, 0.4) biases the cross-section toward its SURFACE. A
                // uniform-area disc (sqrt) piles additive flux down the middle
                // and the stem reads as a lit rod instead of a round stalk.
                push(rnd(), rnd() * TAU, Math.pow(rnd(), 0.4), 0, rnd(), 0, 2, 0)
            }

            count = p
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, p * 8), gl.STATIC_DRAW)
            builtKey = `${d}|${P}|${LN}`
        }

        /* ---- GL state ---- */
        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        // Additive on premultiplied: overlapping petal points bloom to a hot core.
        gl.blendFunc(gl.ONE, gl.ONE)

        /* ---- sizing ---- */
        let cssW = 0, cssH = 0, dpr = 1
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            cssW = canvas.clientWidth || host.clientWidth || 0
            cssH = canvas.clientHeight || host.clientHeight || 0
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

        /* ---- pointer (the bloom gate) ----
         * The gate is a 0..1 amount, not a position, so nothing has to be
         * measured (rule G — no getBoundingClientRect). `pointerenter` /
         * `pointerleave` fire once per crossing, unlike `pointermove`, which
         * would re-arm the animation on every single move event. */
        let gate = 0
        let gateAnim: { stop: () => void } | null = null
        const gateTo = (to: number) => {
            if (gate === to) return
            gate = to
            gateAnim?.stop()
            gateAnim = animate(gateMV, to, transitionRef.current)
        }
        const onEnter = () => gateTo(1)
        const onLeave = () => gateTo(0)
        host.addEventListener("pointerenter", onEnter)
        host.addEventListener("pointerleave", onLeave)

        /* ---- animation loop ---- */
        let raf = 0
        let last = performance.now()
        let time = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min((now - last) / 1000, 0.05)
            last = now

            if (cssW <= 0 || cssH <= 0) {
                resize()
                if (cssW <= 0 || cssH <= 0) return
            }

            const L = live.current
            const key = `${L.density}|${Math.max(3, Math.round(L.petals))}|${Math.max(1, Math.round(L.layers))}`
            if (key !== builtKey) build(L.density, L.petals, L.layers)
            if (count === 0) return

            // Wind time, not wall time: Speed scales the clock every motion
            // term reads, so Speed 0 holds the whole scene still.
            // Wrapped on the CPU — an unbounded accumulator eventually costs
            // float32 precision inside the shader's trig.
            time = (time + dt * L.windRate) % 3600

            // The gate is 0..1 hover; `Closed` sets how far the idle end drops.
            // Closed 0 pins bloom at 1 — always open, hover does nothing.
            const bloomAmt = 1 - L.closedAmt * (1 - gateMV.get())

            const wDev = canvas.width
            const hDev = canvas.height
            const focal = hDev / (2 * Math.tan(((FOV / 2) * Math.PI) / 180))

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)

            gl.useProgram(prog)
            gl.uniform2f(u.res, wDev, hDev)
            gl.uniform1f(u.focal, focal)
            gl.uniform1f(u.dist, Math.max(400, L.distance))
            gl.uniform1f(u.pitch, (L.tilt * Math.PI) / 180)
            gl.uniform1f(u.roll, ROLL)
            gl.uniform1f(u.time, time)
            gl.uniform1f(u.dot, L.dotWorld)
            gl.uniform1f(u.bloom, bloomAmt)
            gl.uniform1f(u.stagger, STAGGER)
            gl.uniform1f(u.petalLen, PETAL_LEN)
            gl.uniform1f(u.petals, Math.max(3, Math.round(L.petals)))
            gl.uniform1f(u.coreR, CORE_R)
            gl.uniform1f(u.scatter, SCATTER)
            gl.uniform3f(u.base, L.base[0], L.base[1], L.base[2])
            gl.uniform3f(u.stem, L.stem[0], L.stem[1], L.stem[2])
            gl.uniform3f(u.accent, L.accent[0], L.accent[1], L.accent[2])
            gl.uniform1f(u.accentMix, L.accentMix)

            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.enableVertexAttribArray(aA)
            gl.vertexAttribPointer(aA, 4, gl.FLOAT, false, 32, 0)
            gl.enableVertexAttribArray(aB)
            gl.vertexAttribPointer(aB, 4, gl.FLOAT, false, 32, 16)

            gl.drawArrays(gl.POINTS, 0, count)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            gateAnim?.stop()
            host.removeEventListener("pointerenter", onEnter)
            host.removeEventListener("pointerleave", onLeave)
            // No loseContext(): getContext returns the same context per canvas,
            // so StrictMode's mount/cleanup/mount would reuse a force-lost one.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the style spread: the canvas is absolutely
                // positioned, so the root has no in-flow content and would
                // collapse to a dot under Framer's Fit Content sizing.
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

const __presetProps = {
  "background": "#07060C",
  "baseColor": "#C4327E",
  "stemColor": "#2F7A4F",
  "accentColor": "#FFD98A",
  "accentMix": 100,
  "density": 100,
  "dotSize": 10,
  "speed": 50,
  "distance": 2820,
  "tilt": 66,
  "closed": 100,
  "flower": {
    "layers": 1,
    "petals": 16
  },
  "transition": {
    "ease": [
      0.44,
      0,
      0.56,
      1
    ],
    "mass": 1,
    "type": "tween",
    "delay": 0,
    "damping": 60,
    "duration": 0.4,
    "stiffness": 800
  }
};

export default function BloomingFlower(props: Record<string, unknown>) {
  return <__BaseImpl_BloomingFlower {...(__presetProps as Record<string, unknown>)} {...props} />;
}
