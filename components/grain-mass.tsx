"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* -------------------------------------------------------------------------
 * GrainMass
 *
 * A volumetric cloud of ~100–260k shaded grains, marbled gold and black,
 * held together by a soft ellipsoid spring and churned by curl noise. The
 * mass bursts out of nothing, gathers, turns, elongates, flares and
 * disperses on a loop.
 *
 * Simulation runs on the GPU: positions and velocities live in a pair of
 * float textures that ping-pong through a fragment shader (MRT, two colour
 * attachments per step). The draw pass reads those textures by gl_VertexID
 * and emits one shaded point sprite per texel, so nothing but uniforms
 * crosses the CPU/GPU line per frame.
 * ---------------------------------------------------------------------- */

/* ---- the look, not knobs -----------------------------------------------
 * These are the render, not preferences. The reference is lit by a single
 * key from the upper left with a hard falloff — that is what makes the gold
 * in the crevices go brown and the black grains readable at all (they are
 * visible only by their specular pip; matte black on a dark ground vanishes).
 * Exposing any of them is a way to make the mass read flat.
 * --------------------------------------------------------------------- */
const KEY_LIGHT = [-0.55, 0.62, 0.52] as const // normalised in the shader
const SPEC_POWER = 34.0 // tight, wet-looking highlight on every bead
const FOV = 42 // degrees, vertical
const MARBLE_SCALE = 1.75 // patch size relative to the mass radius
const MASS_RADIUS = 1.0 // world units; framing is done by moving the camera
// The lumpy target radius carries grains past the nominal radius, so the
// edge you actually see is outside it. Scale is measured against this, or
// the percentage lies about how much of the frame the mass takes.
const VISUAL_EXTENT = 1.4
// Restoring force toward each grain's home point, driven by the Return
// control. The floor still recovers, just slowly enough to look like drifting
// dust; the ceiling snaps back inside a few frames.
const SPRING_MIN = 5.0
const SPRING_MAX = 70.0
const NOISE_SCALE = 1.35 // curl field frequency
const BURST_SPEED = 3.1 // outward impulse at birth
const BOOT_SECONDS = 5.5 // gather time when Lifecycle is off
const MAX_POINT_PX = 48.0 // safe ceiling for gl_PointSize on mobile GPUs
// Every colour warms and darkens toward this as it turns away from the key,
// rather than toward one fixed brown. Tinting the grain's own colour is what
// keeps a blue bead blue in shadow instead of turning the whole palette to
// rust; the warmth is the light's, not the grain's.
const SHADOW_TINT = [0.34, 0.2, 0.09] as const
// Uniform array size. Eight marbled populations is already more than the eye
// separates in a churning mass, and the panel is capped to match.
const MAX_COLORS = 8

export interface GrainColor {
    /** The grain's own colour. */
    color: string
    /** Abstract 0–10; how hard *this* colour blooms. 5 is neutral. */
    glow: number
}

/** A bare colour string is accepted too, so an earlier list still resolves. */
export type GrainColorInput = GrainColor | string

export interface GrainMassProps {
    /** The marbled populations. Grains are split evenly between them. */
    colors?: GrainColorInput[]
    background?: string
    /** Abstract 0–10; maps to grain count, capped by screen size and DPR. */
    density?: number
    /** Mass diameter as a share of the shorter frame edge, in percent. */
    scale?: number
    /** Abstract 0–10; how far the rim breaks into satellites and dust. */
    fray?: number
    /** Lean of the spin axis, in degrees. */
    tilt?: number
    /** Bead diameter at the mass centre, in CSS pixels. */
    grainSize?: number
    /** Abstract 0–10; master bloom, scaled per colour by its own Glow. */
    glow?: number
    /**
     * Birth → churn → elongate → flare → dispersal, on a loop. Off by
     * default and deliberately absent from the panel: the endless churn is
     * the hero state. Still driveable in code.
     */
    lifecycle?: boolean
    /** Seconds for one birth-to-dispersal loop. Only read when `lifecycle`. */
    cycle?: number
    /** Hover repel. Strength 0 turns the response off. */
    repel?: Partial<GrainRepel>
    /** Abstract 0–10; yaw rate of the whole mass. */
    rotateSpeed?: number
    /** Abstract 0–10; curl-noise advection rate — the internal churn. */
    boil?: number
    style?: CSSProperties
}

export const DEFAULT_COLORS: GrainColor[] = [
    { color: "#FFC12B", glow: 6.2 },
    { color: "#AA00FF", glow: 10 },
    { color: "#4300FF", glow: 10 },
    { color: "#63BAFF", glow: 10 },
]

export interface GrainRepel {
    /** Abstract 0–10; how wide an area of the frame the cursor clears. */
    reach: number
    /** Abstract 0–10; how far out of the mass the grains are shoved. */
    strength: number
    /** Abstract 0–10; how briskly they fall back into place afterwards. */
    recover: number
}

export const DEFAULT_REPEL: GrainRepel = { reach: 5.5, strength: 6, recover: 1.3 }

/** Reads either shape in the colours array, so a bare string still works. */
function colorOf(c: GrainColorInput | undefined): string {
    if (!c) return "#FFFFFF"
    return typeof c === "string" ? c : c.color || "#FFFFFF"
}

function glowOf(c: GrainColorInput | undefined): number {
    if (!c || typeof c === "string") return 5
    return typeof c.glow === "number" ? c.glow : 5
}

/* ---------------------------------------------------------------- shaders */

/** Fullscreen triangle from gl_VertexID alone — no buffers anywhere. */
const VS_QUAD = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

/**
 * Value noise with analytic gradients (the `noised` form), so one call gives
 * both the field and its derivative. Curl then costs three noise evaluations
 * instead of the eighteen a finite-difference curl would need — which is what
 * makes 260k particles affordable per frame.
 */
const NOISE = `
float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

vec4 vnoised(vec3 x) {
    vec3 i = floor(x);
    vec3 w = fract(x);
    vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
    vec3 du = 30.0 * w * w * (w * (w - 2.0) + 1.0);

    float a = hash13(i + vec3(0.0, 0.0, 0.0));
    float b = hash13(i + vec3(1.0, 0.0, 0.0));
    float c = hash13(i + vec3(0.0, 1.0, 0.0));
    float d = hash13(i + vec3(1.0, 1.0, 0.0));
    float e = hash13(i + vec3(0.0, 0.0, 1.0));
    float f = hash13(i + vec3(1.0, 0.0, 1.0));
    float g = hash13(i + vec3(0.0, 1.0, 1.0));
    float h = hash13(i + vec3(1.0, 1.0, 1.0));

    float k0 = a;
    float k1 = b - a;
    float k2 = c - a;
    float k3 = e - a;
    float k4 = a - b - c + d;
    float k5 = a - c - e + g;
    float k6 = a - b - e + f;
    float k7 = -a + b + c - d + e - f - g + h;

    float v = k0 + k1 * u.x + k2 * u.y + k3 * u.z
            + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x
            + k7 * u.x * u.y * u.z;

    vec3 dv = du * vec3(
        k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z,
        k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x,
        k3 + k6 * u.x + k5 * u.y + k7 * u.x * u.y
    );

    return vec4(v, dv);
}

float vnoise(vec3 x) { return vnoised(x).x; }

/** curl(psi) where psi is three decorrelated noise fields. Divergence free,
 *  so the cloud churns without gaining or losing volume. */
vec3 curlNoise(vec3 p) {
    vec4 n1 = vnoised(p);
    vec4 n2 = vnoised(p + vec3(31.416, 47.853, 12.793));
    vec4 n3 = vnoised(p + vec3(-8.271, 63.147, 91.428));
    return vec3(n3.z - n2.w, n1.w - n3.y, n2.y - n1.z);
}

/** The lumpy silhouette. Depends only on the material direction, so the
 *  shape belongs to the mass and turns with it rather than swimming
 *  through it as the body rotates. */
float shapeLump(vec3 dir) {
    float n = vnoised(dir * 0.75 + 11.3).x;
    n += 0.55 * vnoised(dir * 1.90 + 47.9).x;
    return 0.42 + 1.20 * (n / 1.55);
}
`

/** One simulation step. Writes position and velocity in a single pass. */
const FS_SIM = `#version 300 es
precision highp float;

uniform sampler2D uPos;
uniform sampler2D uVel;
uniform sampler2D uSeed;

uniform float uDt;
uniform float uTime;
uniform float uReset;
uniform float uRadius;
uniform float uSpring;
uniform float uDamp;
uniform float uBoilAmp;
uniform float uNoiseScale;
uniform float uBurst;
uniform float uDisperse;
uniform float uFray;
uniform vec3  uAniso;

uniform mat3  uRot;
uniform mat4  uViewProj;
uniform vec2  uPointer;
uniform float uPointerOn;
uniform float uReach;
uniform float uStrength;
uniform float uAspect;

layout(location = 0) out vec4 oPos;
layout(location = 1) out vec4 oVel;

${NOISE}

void main() {
    ivec2 tc = ivec2(gl_FragCoord.xy);
    vec4 seed = texelFetch(uSeed, tc, 0);
    vec3 sdir = normalize(seed.xyz + vec3(1e-5));
    float sLen = length(seed.xyz);

    if (uReset > 0.5) {
        // Everything starts in a speck at the origin with an outward kick.
        // That is the burst: it flies apart, the spring catches it, and the
        // catch is what reads as a mass condensing out of the dark.
        oPos = vec4(seed.xyz * 0.05, 0.0);
        oVel = vec4(sdir * uBurst * (0.5 + 0.9 * seed.w), 0.0);
        return;
    }

    vec3 p = texelFetch(uPos, tc, 0).xyz;
    vec3 v = texelFetch(uVel, tc, 0).xyz;
    float dt = uDt;

    // The fray: a slice of the cloud sits further out on a weaker leash.
    // That is what throws satellites and trailing dust instead of a clean
    // edge, and it is why the rim looks like it is coming apart while the
    // core does not.
    float out0 = smoothstep(0.93, 1.0, seed.w);
    float loose = out0 * uFray;

    // Where this grain belongs — a fixed point in the mass's own material,
    // not merely a distance from its centre. Springing to a radius lets a
    // shoved grain slide anywhere around the shell and settle there, so the
    // silhouette survives but the arrangement does not: the marbling smears,
    // and nothing ever returns to where it was. A point has an address, so
    // the mass has a rest pose it can be pushed out of and fall back into.
    vec3 base = seed.xyz * shapeLump(sdir) * uRadius * (1.0 + loose * 0.65);
    base *= uAniso;

    float d = max(length(p), 1e-5);
    vec3 nd = p / d;

    float k = uSpring * (1.0 - 0.55 * out0);
    v += (base - p) * k * dt;

    // The churn stays a force rather than a displacement of the home point.
    // Displacing the home directly needs an amplitude big enough to see, and
    // at that size the value noise's own integer lattice shows through and
    // the silhouette goes blocky. As a force the spring divides it down, so
    // the flow reads as a surface crawling over a shape that is still there.
    vec3 c = curlNoise(p * uNoiseScale + vec3(0.0, uTime * 0.11, 0.0));
    c += 0.48 * curlNoise(p * uNoiseScale * 2.35 + vec3(19.7, 3.1, -7.4));
    v += c * uBoilAmp * k * (1.0 + loose * 0.8) * dt;

    if (uPointerOn > 0.5 && uStrength > 0.0) {
        // The pointer lives in screen space, so the grain is carried there
        // and the resulting push is carried back — uRot is orthonormal, so
        // its transpose is its inverse.
        vec4 cp = uViewProj * vec4(uRot * p, 1.0);
        vec2 sp = cp.xy / max(cp.w, 1e-4);
        vec2 dv = (sp - uPointer) * vec2(uAspect, 1.0);
        float dist = length(dv);
        float infl = smoothstep(uReach, 0.0, dist);
        if (infl > 0.0) {
            vec2 dirv = dist > 1e-4 ? dv / dist : vec2(1.0, 0.0);
            vec2 swirl = vec2(-dirv.y, dirv.x);
            vec3 push = vec3(dirv + swirl * 0.85, 0.0);
            v += transpose(uRot) * push * uStrength * infl * dt;
        }
    }

    v += nd * uDisperse * dt;
    v *= pow(uDamp, dt * 60.0);
    p += v * dt;

    oPos = vec4(p, 0.0);
    oVel = vec4(v, 0.0);
}`

/** One point sprite per simulation texel, addressed by gl_VertexID. */
const VS_POINTS = `#version 300 es
precision highp float;

uniform sampler2D uPos;
uniform sampler2D uSeed;
uniform int   uTexSize;
uniform mat3  uRot;
uniform mat4  uViewProj;
uniform float uPointScale;
uniform vec3  uColors[${MAX_COLORS}];
uniform float uGlows[${MAX_COLORS}];
uniform int   uColorCount;
uniform float uMarbleScale;
uniform float uMarbleSeed;

out vec3  vColor;
out float vGlow;
out float vForm;
out float vAO;

${NOISE}

const vec3 L = normalize(vec3(${KEY_LIGHT[0]}, ${KEY_LIGHT[1]}, ${KEY_LIGHT[2]}));

void main() {
    int id = gl_VertexID;
    ivec2 tc = ivec2(id % uTexSize, id / uTexSize);
    vec3 p = texelFetch(uPos, tc, 0).xyz;
    vec4 seed = texelFetch(uSeed, tc, 0);

    gl_Position = uViewProj * vec4(uRot * p, 1.0);

    // Beads vary in size, and near ones are bigger — both are what stop the
    // cloud reading as a flat stipple.
    float sizeJitter = 0.70 + 0.62 * seed.w;
    gl_PointSize = clamp(
        uPointScale * sizeJitter / max(gl_Position.w, 0.01),
        1.0,
        ${MAX_POINT_PX.toFixed(1)}
    );

    // The colour split is sampled in *material* space, so the patches are
    // large and contiguous and stay welded to the grains as the mass turns.
    // Sampling at the live position instead would boil the colours through
    // each other; sampling per-grain at random would give salt-and-pepper,
    // which is the one failure that kills the whole look.
    float m = 0.66 * vnoise(seed.xyz * uMarbleScale + uMarbleSeed)
            + 0.34 * vnoise(seed.xyz * uMarbleScale * 2.1 + uMarbleSeed * 1.7 + 5.0);
    // Value noise is bell-shaped; this spreads it back out so the palette
    // splits into even shares, and sharpens the patch borders.
    m = smoothstep(0.30, 0.70, m);

    // Even bands of one smooth field, so colours land in palette order across
    // the mass and read as strata rather than confetti. Listing a colour
    // twice is how you weight it — two golds to one black gives the
    // reference's roughly 2:1 split.
    int idx = int(clamp(floor(m * float(uColorCount)), 0.0, float(uColorCount - 1)));
    vColor = uColors[idx];
    vGlow = uGlows[idx];

    // The bead's own normal is a sphere, so on its own it shades every grain
    // identically and the mass comes out flat. This is the *mass's* normal —
    // the direction out of its centre — and it is what puts the key on the
    // upper left and lets the far side fall away into amber.
    vec3 macroN = normalize(uRot * normalize(p + vec3(1e-5)));
    // Key plus a soft fill from the camera. The key alone loses the whole
    // far half to black, and with it the gold/black marbling over there —
    // which is the thing the reference is actually about. The fill is what
    // keeps the mass legible edge to edge while the key still gives it form.
    float key = clamp((dot(macroN, L) + 0.35) / 1.35, 0.0, 1.0);
    float fill = max(0.0, macroN.z);
    vForm = 0.10 + 0.62 * key + 0.28 * fill;

    // Grains sitting in a dent of the silhouette are more enclosed than
    // grains on a ridge. Reusing the shape field costs one noise call and
    // gives the crevices their darkening for free.
    vAO = smoothstep(0.50, 1.15, shapeLump(normalize(seed.xyz + vec3(1e-5))));
}`

const FS_POINTS = `#version 300 es
precision highp float;

in vec3  vColor;
in float vGlow;
in float vForm;
in float vAO;

uniform vec3  uBounce;
uniform vec3  uBg;
uniform float uFade;
uniform float uFlare;

out vec4 fragColor;

const vec3 L = normalize(vec3(${KEY_LIGHT[0]}, ${KEY_LIGHT[1]}, ${KEY_LIGHT[2]}));

void main() {
    // Every grain is shaded as a sphere, not filled as a disc. The reference
    // beads have a top-left highlight and a dark underside, and that single
    // fact is most of why the mass reads as matter rather than as dots.
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    uv.y = -uv.y;
    float r2 = dot(uv, uv);
    if (r2 > 1.0) discard;

    vec3 n = vec3(uv, sqrt(max(0.0, 1.0 - r2)));
    float micro = max(0.0, (dot(n, L) + 0.35) / 1.35);
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), ${SPEC_POWER.toFixed(1)});

    // Form first, bead second: the mass's own curvature sets how much light
    // this part of it gets, and the bead's curvature only modulates within
    // that. Getting that order wrong is what makes a particle render read as
    // confetti rather than as an object — every grain is lit the same and
    // the mass has no side facing the key.
    float shade = vForm * (0.55 + 0.45 * micro)
    float ao = 0.35 + 0.65 * vAO;

    // How little of itself the grain has to give back. Dark grains lean on
    // the pip and on their neighbours' spill; bright ones barely need either,
    // and doubling up on them just blows the highlight out.
    float dim = 1.0 - clamp(max(max(vColor.r, vColor.g), vColor.b), 0.0, 1.0);

    // The grain's own colour, warmed and dropped toward the shadow tint as it
    // turns away from the key. Lit colour is driven past 1.0 on purpose: the
    // overshoot is what the bright pass picks up, and that spill onto the
    // ground is half of why the reference reads as lit rather than drawn.
    vec3 body = vColor * mix(
        vec3(${SHADOW_TINT[0]}, ${SHADOW_TINT[1]}, ${SHADOW_TINT[2]}),
        vec3(1.0),
        smoothstep(0.05, 0.60, shade)
    );

    // The pip must not die with the form, or the whole shadow side turns to
    // mud and the populations stop being tellable apart — which is the one
    // thing the reference is actually about. Dark grains get a hotter one,
    // because on them it is all there is.
    // The dim lift and the bounce are what keep a near-black grain readable
    // against a near-black ground. Without them the dark population reads as
    // a hole in the mass instead of as beads, and the marbling — the whole
    // point — only shows where it happens to sit next to something bright.
    vec3 col = body * (0.10 + 1.75 * shade) * ao
             + vColor * dim * (0.30 + 0.55 * shade) * ao
             + vec3(1.0, 0.95, 0.84) * spec * (1.60 + 1.00 * dim) * (0.35 + 0.65 * vForm)
             + uBounce * 0.34 * dim * shade * ao;

    col *= uFlare;

    // Grains are opaque and depth tested, so the lifecycle fade cannot use
    // alpha for coverage without sorting. Fading toward the ground colour
    // instead is exact for any background and costs nothing — which leaves
    // alpha free to carry this grain's bloom weight to the bright pass.
    col = mix(uBg, col, uFade);

    fragColor = vec4(col, vGlow * uFade);
}`

const FS_BRIGHT = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform vec2 uRes;
uniform float uThreshold;
out vec4 fragColor;
void main() {
    // Alpha is the grain's own glow weight, written by the point pass. The
    // scene is opaque, so the channel was going spare, and carrying it here
    // is what lets one colour bloom hard while another stays matte without a
    // second render target.
    vec4 t = texture(uScene, gl_FragCoord.xy / uRes);
    float l = max(max(t.r, t.g), t.b);
    float k = max(l - uThreshold, 0.0) / max(l, 1e-4);
    fragColor = vec4(t.rgb * k * t.a, 1.0);
}`

const FS_BLUR = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uRes;
uniform vec2 uDir;
out vec4 fragColor;
void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 t = uDir / uRes;
    vec3 c = texture(uSrc, uv).rgb * 0.227027;
    c += (texture(uSrc, uv + t * 1.384615).rgb + texture(uSrc, uv - t * 1.384615).rgb) * 0.316216;
    c += (texture(uSrc, uv + t * 3.230769).rgb + texture(uSrc, uv - t * 3.230769).rgb) * 0.070270;
    fragColor = vec4(c, 1.0);
}`

const FS_COMPOSITE = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2 uRes;
uniform float uGlow;
uniform float uTime;
out vec4 fragColor;
void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec3 c = texture(uScene, uv).rgb;
    c += texture(uBloom, uv).rgb * uGlow;

    vec2 q = uv - 0.5;
    q.x *= uRes.x / max(uRes.y, 1.0);
    c *= 1.0 - 0.40 * smoothstep(0.35, 1.00, length(q));

    // Gentle shoulder, driven by the brightest channel rather than each one
    // separately: a per-channel divide pulls red down first and turns the
    // hottest gold lime. The flare pushes well past 1.0, so this matters.
    c = c / (1.0 + max(max(c.r, c.g), c.b) * 0.55);

    float g = fract(sin(dot(gl_FragCoord.xy + uTime * 60.0, vec2(12.9898, 78.233))) * 43758.5453);
    c += (g - 0.5) * 0.018;

    fragColor = vec4(c, 1.0);
}`

/* ---------------------------------------------------------------- helpers */

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1)
    return t * t * (3 - 2 * t)
}

/** Parses any CSS colour string to linear-ish 0–1 RGB via a scratch canvas. */
let parseCtx: CanvasRenderingContext2D | null = null
function parseColor(input: string, fallback: [number, number, number]): [number, number, number] {
    if (typeof document === "undefined") return fallback
    if (!parseCtx) {
        const c = document.createElement("canvas")
        c.width = 1
        c.height = 1
        parseCtx = c.getContext("2d", { willReadFrequently: true })
    }
    if (!parseCtx) return fallback
    try {
        parseCtx.clearRect(0, 0, 1, 1)
        parseCtx.fillStyle = "#000"
        parseCtx.fillStyle = input
        parseCtx.fillRect(0, 0, 1, 1)
        const d = parseCtx.getImageData(0, 0, 1, 1).data
        return [d[0] / 255, d[1] / 255, d[2] / 255]
    } catch {
        return fallback
    }
}

function perspective(fovyDeg: number, aspect: number, near: number, far: number): Float32Array {
    const f = 1 / Math.tan((fovyDeg * Math.PI) / 360)
    const nf = 1 / (near - far)
    // column-major, matching gl.uniformMatrix4fv(..., false, m)
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0,
    ])
}

/** Bakes a camera pull-back of `dist` straight into the projection. */
function viewProjection(fovyDeg: number, aspect: number, dist: number): Float32Array {
    const m = perspective(fovyDeg, aspect, 0.1, 100)
    // proj * translate(0, 0, -dist): only the third column feeds the fourth.
    m[12] = m[8] * -dist
    m[13] = m[9] * -dist
    m[14] = m[10] * -dist + m[14]
    m[15] = m[11] * -dist
    return m
}

/** Rz(tilt) * Ry(yaw) * Rx(wobble), column-major mat3. */
function orientation(tiltRad: number, yawRad: number, wobbleRad: number): Float32Array {
    const cz = Math.cos(tiltRad), sz = Math.sin(tiltRad)
    const cy = Math.cos(yawRad), sy = Math.sin(yawRad)
    const cx = Math.cos(wobbleRad), sx = Math.sin(wobbleRad)

    // Row-major products, transposed on the way out.
    const r00 = cz * cy, r01 = cz * sy * sx - sz * cx, r02 = cz * sy * cx + sz * sx
    const r10 = sz * cy, r11 = sz * sy * sx + cz * cx, r12 = sz * sy * cx - cz * sx
    const r20 = -sy,     r21 = cy * sx,                r22 = cy * cx

    return new Float32Array([r00, r10, r20, r01, r11, r21, r02, r12, r22])
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        if (typeof console !== "undefined") {
            console.warn("[GrainMass] shader compile failed:", gl.getShaderInfoLog(sh))
        }
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function link(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
    const vs = compile(gl, gl.VERTEX_SHADER, vsSrc)
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc)
    if (!vs || !fs) return null
    const p = gl.createProgram()
    if (!p) return null
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        if (typeof console !== "undefined") {
            console.warn("[GrainMass] program link failed:", gl.getProgramInfoLog(p))
        }
        gl.deleteProgram(p)
        return null
    }
    return p
}

/** Cached uniform lookups — getUniformLocation every frame is not free. */
function uniformCache(gl: WebGL2RenderingContext, program: WebGLProgram) {
    const map = new Map<string, WebGLUniformLocation | null>()
    return (name: string) => {
        if (!map.has(name)) map.set(name, gl.getUniformLocation(program, name))
        return map.get(name) ?? null
    }
}

function makeTexture(
    gl: WebGL2RenderingContext,
    w: number,
    h: number,
    internal: number,
    format: number,
    type: number,
    data: ArrayBufferView | null
): WebGLTexture | null {
    const t = gl.createTexture()
    if (!t) return null
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
}

/** Simulation state is addressed by texel, so it must never be filtered. */
function makeDataTexture(
    gl: WebGL2RenderingContext,
    size: number,
    internal: number,
    type: number,
    data: ArrayBufferView | null
): WebGLTexture | null {
    const t = makeTexture(gl, size, size, internal, gl.RGBA, type, data)
    if (!t) return null
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    return t
}

/**
 * A shell of seeds: an even direction, a radius rank, and one spare random.
 *
 * Directions come off a golden-angle spiral rather than out of a random
 * generator. Now that every grain is sprung to its spawn point and stays
 * there, the cloud's distribution *is* the render: random directions clump
 * the way Poisson samples always do, and where the old shell spring let curl
 * noise slide grains tangentially and even that out, a point spring holds
 * the clumps and the gaps exactly where they landed. The spiral has no
 * clumps to hold. It is jittered by a fraction of the spacing, or the spiral
 * itself becomes the pattern you see.
 */
function seedData(size: number): Float32Array {
    const n = size * size
    const out = new Float32Array(n * 4)
    const golden = Math.PI * (3 - Math.sqrt(5))
    // Mean angular spacing on the sphere; a third of it is enough to break
    // the spiral without reintroducing clumping.
    const jitter = (2 / Math.sqrt(n)) * 0.33
    for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n
        const z = 1 - 2 * t
        const rxy = Math.sqrt(Math.max(0, 1 - z * z))
        const phi = golden * i
        let x = Math.cos(phi) * rxy + (Math.random() * 2 - 1) * jitter
        let y = Math.sin(phi) * rxy + (Math.random() * 2 - 1) * jitter
        let zz = z + (Math.random() * 2 - 1) * jitter
        const l = Math.hypot(x, y, zz) || 1
        // A shell, not a filled ball. In a solid ball only the ~N^(2/3)
        // grains on the front surface are ever seen, so the skin stays gappy
        // however many grains you add. Packing them into the outer third
        // instead puts most of the cloud where the eye is, which is what
        // gets the tight granular skin the reference has.
        const r = Math.cbrt(0.35 + 0.65 * Math.random())
        out[i * 4] = (x / l) * r
        out[i * 4 + 1] = (y / l) * r
        out[i * 4 + 2] = (zz / l) * r
        out[i * 4 + 3] = Math.random()
    }
    return out
}

/* -------------------------------------------------------------- component */

function __BaseImpl_GrainMass({
    colors,
    background = "#0D1114",
    density = 9,
    scale = 106,
    fray = 8.9,
    tilt = 45,
    grainSize = 1.5,
    glow = 4,
    lifecycle = false,
    cycle = 20,
    repel,
    rotateSpeed = 10,
    boil = 10,
    style,
}: GrainMassProps) {
    const rep: GrainRepel = { ...DEFAULT_REPEL, ...(repel || {}) }

    const hostRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    // Why we could not render, if we could not. Kept as state so the degraded
    // layer is real DOM rather than something painted into a canvas we may
    // not be able to get a 2D context for.
    const [degraded, setDegraded] = useState<string | null>(null)
    // Bumped when the GPU hands the context back after a loss, to rebuild.
    const [generation, setGeneration] = useState(0)

    // Flattened once per palette change, not per frame: the parse walks a
    // scratch 2D canvas, and the bounce colour is a reduction over the list.
    const key = JSON.stringify(colors ?? null)
    const palette = useMemo(() => {
        const list = (colors && colors.length ? colors : DEFAULT_COLORS).slice(0, MAX_COLORS)
        const rgb = new Float32Array(MAX_COLORS * 3)
        const glows = new Float32Array(MAX_COLORS)
        const bounce: [number, number, number] = [0, 0, 0]
        list.forEach((c, i) => {
            const v = parseColor(colorOf(c), [1, 1, 1])
            rgb[i * 3] = v[0]
            rgb[i * 3 + 1] = v[1]
            rgb[i * 3 + 2] = v[2]
            // 5 is neutral, so the row reads the same way as every other
            // abstract scale in the panel rather than as a raw multiplier.
            glows[i] = clamp(glowOf(c), 0, 10) / 5
            bounce[0] += v[0]
            bounce[1] += v[1]
            bounce[2] += v[2]
        })
        const n = Math.max(1, list.length)
        // The light the mass throws at itself is the palette's own average —
        // it is why the black beads in the reference sit in gold, not grey.
        return { rgb, glows, count: n, bounce: bounce.map((c) => c / n) as [number, number, number],
            lead: parseColor(colorOf(list[0]), [1, 0.76, 0.23]) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    const bgRGB = useMemo(() => parseColor(background, [0.05, 0.07, 0.08]), [background])

    // Everything the frame loop reads, refreshed on every render, so moving a
    // slider never has to tear the simulation down and rebuild it.
    const live = useRef({
        palette, bgRGB, glow,
        scale, fray, tilt, grainSize,
        lifecycle, cycle, rep, rotateSpeed, boil,
    })
    live.current = {
        palette, bgRGB, glow,
        scale, fray, tilt, grainSize,
        lifecycle, cycle, rep, rotateSpeed, boil,
    }

    // The only prop that forces a rebuild: it resizes the simulation
    // textures. Bucketed to 32 so dragging the slider does not thrash.
    const bucket = Math.max(64, Math.round((96 + (clamp(density, 0, 10) / 10) * 416) / 32) * 32)

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        // Say why, out loud. A component that quietly degrades to a blur is
        // indistinguishable from one that is working badly, and every failure
        // below is an environment problem the page owner can act on.
        const bail = (why: string) => {
            if (typeof console !== "undefined") console.warn("[GrainMass] " + why)
            setDegraded(why)
        }

        // Two attempts. `high-performance` asks the browser for the discrete
        // GPU, and on a hybrid-graphics machine — or one whose GPU process
        // failed to start, which a full disk is enough to cause — that ask can
        // be refused outright and hand back null. The plain request usually
        // still succeeds, so never let the hint be the reason nothing renders.
        const attrs: WebGLContextAttributes[] = [
            {
                alpha: false,
                antialias: false,
                depth: true,
                premultipliedAlpha: false,
                powerPreference: "high-performance",
            },
            { alpha: false, antialias: false, depth: true },
        ]
        let gl: WebGL2RenderingContext | null = null
        for (const a of attrs) {
            gl = canvas.getContext("webgl2", a) as WebGL2RenderingContext | null
            if (gl) break
        }

        if (!gl) {
            bail("the browser would not create a WebGL2 context — check that hardware acceleration is on, and that the page is not already holding more live WebGL contexts than the browser allows")
            return
        }
        if (gl.isContextLost()) {
            bail("the WebGL2 context was already lost on acquisition")
            return
        }

        // A lost context is recoverable, but only if we ask: without
        // preventDefault the browser never fires `restored`, and the component
        // stays dead until a reload.
        const onLost = (e: Event) => {
            e.preventDefault()
            if (typeof console !== "undefined") console.warn("[GrainMass] WebGL context lost; awaiting restore")
        }
        const onRestored = () => setGeneration((g) => g + 1)
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)
        const dropContextListeners = () => {
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
        }

        const extFloat = gl.getExtension("EXT_color_buffer_float")
        const extHalf = gl.getExtension("EXT_color_buffer_half_float")
        if (!extFloat && !extHalf) {
            dropContextListeners()
            bail("this GPU cannot render to float textures (no EXT_color_buffer_float or EXT_color_buffer_half_float)")
            return
        }
        const simInternal = extFloat ? gl.RGBA32F : gl.RGBA16F
        const simType = extFloat ? gl.FLOAT : gl.HALF_FLOAT

        const simProg = link(gl, VS_QUAD, FS_SIM)
        const pointProg = link(gl, VS_POINTS, FS_POINTS)
        const brightProg = link(gl, VS_QUAD, FS_BRIGHT)
        const blurProg = link(gl, VS_QUAD, FS_BLUR)
        const compProg = link(gl, VS_QUAD, FS_COMPOSITE)
        if (!simProg || !pointProg || !brightProg || !blurProg || !compProg) {
            dropContextListeners()
            bail("a shader failed to compile or link — see the log above")
            return
        }

        const uSim = uniformCache(gl, simProg)
        const uPt = uniformCache(gl, pointProg)
        const uBright = uniformCache(gl, brightProg)
        const uBlur = uniformCache(gl, blurProg)
        const uComp = uniformCache(gl, compProg)

        // Attribute-less rendering everywhere, so one empty VAO covers every
        // draw in the file.
        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)

        /* ---- simulation state ---- */
        const small =
            typeof window !== "undefined" &&
            typeof window.matchMedia === "function" &&
            window.matchMedia("(max-width: 820px)").matches
        const texSize = Math.min(bucket, small ? 256 : 512)
        const count = texSize * texSize

        const seedTex = makeDataTexture(gl, texSize, gl.RGBA32F, gl.FLOAT, seedData(texSize))
        const posTex = [
            makeDataTexture(gl, texSize, simInternal, simType, null),
            makeDataTexture(gl, texSize, simInternal, simType, null),
        ]
        const velTex = [
            makeDataTexture(gl, texSize, simInternal, simType, null),
            makeDataTexture(gl, texSize, simInternal, simType, null),
        ]
        const simFbo = [gl.createFramebuffer(), gl.createFramebuffer()]
        let ok = true
        for (let i = 0; i < 2; i++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, simFbo[i])
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, posTex[i], 0)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, velTex[i], 0)
            gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1])
            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) ok = false
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        if (!ok) {
            dropContextListeners()
            bail("the simulation framebuffer came back incomplete")
            return
        }

        /* ---- screen-sized targets ---- */
        let sceneTex: WebGLTexture | null = null
        let sceneDepth: WebGLRenderbuffer | null = null
        let sceneFbo: WebGLFramebuffer | null = null
        const bloomTex: (WebGLTexture | null)[] = [null, null]
        const bloomFbo: (WebGLFramebuffer | null)[] = [null, null]
        let vw = 0
        let vh = 0
        let bw = 1
        let bh = 1
        let dpr = 1

        const dropTargets = () => {
            if (sceneTex) gl.deleteTexture(sceneTex)
            if (sceneDepth) gl.deleteRenderbuffer(sceneDepth)
            if (sceneFbo) gl.deleteFramebuffer(sceneFbo)
            sceneTex = null
            sceneDepth = null
            sceneFbo = null
            for (let i = 0; i < 2; i++) {
                if (bloomTex[i]) gl.deleteTexture(bloomTex[i])
                if (bloomFbo[i]) gl.deleteFramebuffer(bloomFbo[i])
                bloomTex[i] = null
                bloomFbo[i] = null
            }
        }

        const resize = () => {
            const cssW = Math.max(1, host.clientWidth)
            const cssH = Math.max(1, host.clientHeight)
            let d = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2)
            // A pixel budget rather than a DPR cap: a 4K frame at 2x is four
            // times the shading of a 1080p one for no visible gain.
            const budget = 2400000
            if (cssW * cssH * d * d > budget) d = Math.sqrt(budget / (cssW * cssH))
            dpr = Math.max(0.75, d)

            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (w === vw && h === vh && sceneFbo) return
            vw = w
            vh = h
            canvas.width = w
            canvas.height = h
            bw = Math.max(1, w >> 2)
            bh = Math.max(1, h >> 2)

            dropTargets()

            sceneTex = makeTexture(gl, vw, vh, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null)
            sceneDepth = gl.createRenderbuffer()
            gl.bindRenderbuffer(gl.RENDERBUFFER, sceneDepth)
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, vw, vh)
            sceneFbo = gl.createFramebuffer()
            gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFbo)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0)
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, sceneDepth)
            gl.drawBuffers([gl.COLOR_ATTACHMENT0])

            for (let i = 0; i < 2; i++) {
                bloomTex[i] = makeTexture(gl, bw, bh, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null)
                bloomFbo[i] = gl.createFramebuffer()
                gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFbo[i])
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bloomTex[i], 0)
                gl.drawBuffers([gl.COLOR_ATTACHMENT0])
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        }
        resize()

        setDegraded(null)

        /* ---- hover ---- */
        // Tracked on the window, not on the host. A hero puts a headline and
        // a button on top of the canvas, and those swallow the host's own
        // pointer events — the repel then dies precisely where the copy is,
        // which is where the cursor spends its time. Reading the window and
        // testing the rect ourselves means hovering anywhere over the frame
        // works, through whatever is stacked on top of it. No button, no tap:
        // a mouse or pen moving across the frame is the whole gesture.
        const pointer = { x: 0, y: 0, tx: 0, ty: 0, on: false }

        const track = (clientX: number, clientY: number) => {
            const r = host.getBoundingClientRect()
            if (r.width < 1 || r.height < 1) return
            const nx = ((clientX - r.left) / r.width) * 2 - 1
            const ny = 1 - ((clientY - r.top) / r.height) * 2
            // A margin past the edge, so grains at the rim still feel a cursor
            // that has just left the frame rather than snapping back.
            const inside = Math.abs(nx) < 1.25 && Math.abs(ny) < 1.25
            if (inside && !pointer.on) {
                // Arrive where the cursor actually is, instead of sweeping in
                // from wherever it was last seen and ploughing the mass on the
                // way past.
                pointer.x = nx
                pointer.y = ny
            }
            pointer.tx = nx
            pointer.ty = ny
            pointer.on = inside
        }

        // Hover only. `pointerdown` is deliberately not listened for, so a tap
        // or a click does nothing on its own, and touch is skipped outright —
        // there is no hover to have, and treating a touch-drag as one turns
        // every scroll past the section into a swipe through the mass.
        const onPointerMove = (e: PointerEvent) => {
            if (e.pointerType === "touch") return
            track(e.clientX, e.clientY)
        }
        const onMouseMove = (e: MouseEvent) => track(e.clientX, e.clientY)
        const onLeave = () => {
            pointer.on = false
        }

        // Capture phase, on the window. A bubble-phase listener is stopped
        // dead by any overlay that calls stopPropagation in its own pointer
        // handler — which hero sections, sliders and menu layers routinely do,
        // and which is the difference between this working on a bare canvas
        // and working on a real page. Capture runs before anything can cancel
        // it. `mousemove` is carried alongside because some embeddings deliver
        // it when pointer events are swallowed.
        const listen = { passive: true, capture: true } as AddEventListenerOptions
        window.addEventListener("pointermove", onPointerMove, listen)
        window.addEventListener("mousemove", onMouseMove, listen)
        window.addEventListener("pointercancel", onLeave, listen)
        // Once the cursor is off the document we stop hearing about it, so
        // without this the last position would stay pressed into the mass.
        document.addEventListener("mouseleave", onLeave)

        /* ---- run only while on screen ---- */
        let onScreen = true
        const io =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(
                      (entries) => {
                          onScreen = entries.some((en) => en.isIntersecting)
                      },
                      { threshold: 0 }
                  )
                : null
        io?.observe(host)

        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => resize()) : null
        ro?.observe(host)

        const reduced =
            typeof window !== "undefined" &&
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        /* ---- frame loop ---- */
        let raf = 0
        let last = typeof performance !== "undefined" ? performance.now() : 0
        let clock = 0
        let yaw = 0
        let src = 0
        let reset = 1 // first step seeds the burst
        let prevPhase = 0

        const draw = (now: number) => {
            raf = requestAnimationFrame(draw)

            const rawDt = (now - last) / 1000
            last = now
            if (!onScreen || document.hidden) return

            const dt = clamp(rawDt, 0, 1 / 30)
            clock += dt

            const L = live.current
            const aspect = vw / Math.max(vh, 1)

            // The influence point chases the cursor rather than teleporting to
            // it, so a fast sweep ploughs a furrow across the mass instead of
            // punching a hole in one place and another hole in the next.
            const follow = 1 - Math.exp(-dt * 16)
            pointer.x += (pointer.tx - pointer.x) * follow
            pointer.y += (pointer.ty - pointer.y) * follow

            /* -- lifecycle phase -------------------------------------- */
            // Reduced motion keeps the mass, drops the repeated build-up and
            // blow-apart: it settles into the churn and stays there.
            const looping = L.lifecycle && !reduced
            const cycleSec = Math.max(4, L.cycle)
            const phase = looping
                ? (clock % cycleSec) / cycleSec
                : Math.min(clock / BOOT_SECONDS, 1) * 0.42

            if (looping && phase < prevPhase) reset = 1
            prevPhase = phase

            const fadeIn = smoothstep(0, 0.055, phase)
            const fade = looping ? fadeIn * (1 - smoothstep(0.9, 1, phase)) : fadeIn
            const elong = looping ? smoothstep(0.62, 0.86, phase) : 0
            const release = looping ? smoothstep(0.86, 0.99, phase) : 0
            // Two flares: the burst it is born in, and the one it goes out on.
            const flare =
                1 +
                1.15 * (1 - smoothstep(0, 0.1, phase)) +
                (looping ? 1.9 * smoothstep(0.83, 0.89, phase) * (1 - smoothstep(0.89, 0.97, phase)) : 0)

            const speedScale = reduced ? 0.45 : 1
            yaw += (clamp(L.rotateSpeed, 0, 10) / 10) * 0.5 * speedScale * dt

            /* -- matrices --------------------------------------------- */
            const tanHalf = Math.tan((FOV * Math.PI) / 360)
            const minHalf = (MASS_RADIUS * VISUAL_EXTENT * 100) / Math.max(clamp(L.scale, 5, 200), 5)
            const dist = aspect >= 1 ? minHalf / tanHalf : minHalf / (aspect * tanHalf)
            const viewProj = viewProjection(FOV, aspect, dist)
            const rot = orientation(
                (L.tilt * Math.PI) / 180,
                yaw,
                Math.sin(clock * 0.13) * 0.08 // a hint of tumble; the reference is mostly yaw
            )

            /* -- simulate --------------------------------------------- */
            const dst = 1 - src
            gl.disable(gl.DEPTH_TEST)
            gl.disable(gl.BLEND)
            gl.bindFramebuffer(gl.FRAMEBUFFER, simFbo[dst])
            gl.viewport(0, 0, texSize, texSize)
            gl.useProgram(simProg)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, posTex[src])
            gl.uniform1i(uSim("uPos"), 0)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, velTex[src])
            gl.uniform1i(uSim("uVel"), 1)
            gl.activeTexture(gl.TEXTURE2)
            gl.bindTexture(gl.TEXTURE_2D, seedTex)
            gl.uniform1i(uSim("uSeed"), 2)

            gl.uniform1f(uSim("uDt"), dt)
            gl.uniform1f(uSim("uTime"), clock)
            gl.uniform1f(uSim("uReset"), reset)
            gl.uniform1f(uSim("uRadius"), MASS_RADIUS)
            // Return is the spring constant, so it sets both how hard the
            // mass resists the cursor and how briskly it recovers — the two
            // are the same number, and pretending otherwise would be two
            // sliders for one physical fact.
            const springK = SPRING_MIN + Math.pow(clamp(L.rep.recover, 0, 10) / 10, 1.5) * (SPRING_MAX - SPRING_MIN)
            gl.uniform1f(uSim("uSpring"), springK * (1 - release))
            // Damping tracks the spring, or a stiff Return rings like a bell
            // and a slack one never settles. Just under critical, so the mass
            // lands with a little life in it rather than gliding to a halt.
            gl.uniform1f(uSim("uDamp"), Math.exp(-1.7 * Math.sqrt(springK) / 60) + 0.085 * release)
            // Boil is an amplitude in world units, not a raw force: the
            // shader multiplies it back up by the spring, so how far the
            // surface crawls stays the same whatever Return is set to.
            gl.uniform1f(
                uSim("uBoilAmp"),
                (0.01 + (clamp(L.boil, 0, 10) / 10) * 0.11) * speedScale * (1 + release * 1.6)
            )
            gl.uniform1f(uSim("uNoiseScale"), NOISE_SCALE)
            gl.uniform1f(uSim("uBurst"), BURST_SPEED)
            gl.uniform1f(uSim("uDisperse"), release * 2.6)
            gl.uniform1f(uSim("uFray"), clamp(L.fray, 0, 10) / 10)
            gl.uniform3f(uSim("uAniso"), 1 - 0.28 * elong, 1 + 0.58 * elong, 1 - 0.28 * elong)
            gl.uniformMatrix3fv(uSim("uRot"), false, rot)
            gl.uniformMatrix4fv(uSim("uViewProj"), false, viewProj)
            gl.uniform2f(uSim("uPointer"), pointer.x, pointer.y)
            gl.uniform1f(uSim("uPointerOn"), pointer.on ? 1 : 0)
            // Reach sets how much of the frame the cursor clears, in NDC
            // half-heights. Curved so the low end stays a dent and the top end
            // sweeps most of the mass — linear made the default hollow it.
            gl.uniform1f(
                uSim("uReach"),
                0.04 + Math.pow(clamp(L.rep.reach, 0, 10) / 10, 1.8) * 0.66
            )
            // Grains now hold a rest position, so the push can be violent
            // without costing the shape — displacement is force over spring,
            // and at the top of this range that is nearly two mass radii, far
            // enough to clear the frame. Curved so the default still dents.
            gl.uniform1f(
                uSim("uStrength"),
                Math.pow(clamp(L.rep.strength, 0, 10) / 10, 1.6) * 60
            )
            gl.uniform1f(uSim("uAspect"), aspect)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            src = dst
            reset = 0

            /* -- draw the grains -------------------------------------- */
            gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFbo)
            gl.viewport(0, 0, vw, vh)
            // Alpha 0: the ground has no bloom weight of its own, so a light
            // background cannot smear itself across the bright pass.
            gl.clearColor(L.bgRGB[0], L.bgRGB[1], L.bgRGB[2], 0)
            gl.clearDepth(1)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            // Opaque beads with a depth test: correct occlusion for a quarter
            // of a million sprites without sorting a single one of them.
            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LESS)

            gl.useProgram(pointProg)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, posTex[src])
            gl.uniform1i(uPt("uPos"), 0)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, seedTex)
            gl.uniform1i(uPt("uSeed"), 1)
            gl.uniform1i(uPt("uTexSize"), texSize)
            gl.uniformMatrix3fv(uPt("uRot"), false, rot)
            gl.uniformMatrix4fv(uPt("uViewProj"), false, viewProj)
            gl.uniform1f(uPt("uPointScale"), Math.max(0.5, L.grainSize) * dpr * dist)
            gl.uniform3fv(uPt("uColors"), L.palette.rgb)
            gl.uniform1fv(uPt("uGlows"), L.palette.glows)
            gl.uniform1i(uPt("uColorCount"), L.palette.count)
            gl.uniform1f(uPt("uMarbleScale"), MARBLE_SCALE)
            gl.uniform1f(uPt("uMarbleSeed"), 7.31)
            gl.uniform3f(uPt("uBounce"), L.palette.bounce[0], L.palette.bounce[1], L.palette.bounce[2])
            gl.uniform3f(uPt("uBg"), L.bgRGB[0], L.bgRGB[1], L.bgRGB[2])
            gl.uniform1f(uPt("uFade"), fade)
            gl.uniform1f(uPt("uFlare"), flare)
            gl.drawArrays(gl.POINTS, 0, count)

            gl.disable(gl.DEPTH_TEST)

            /* -- bloom ------------------------------------------------- */
            gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFbo[0])
            gl.viewport(0, 0, bw, bh)
            gl.useProgram(brightProg)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, sceneTex)
            gl.uniform1i(uBright("uScene"), 0)
            gl.uniform2f(uBright("uRes"), bw, bh)
            gl.uniform1f(uBright("uThreshold"), 0.45)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            gl.useProgram(blurProg)
            gl.uniform2f(uBlur("uRes"), bw, bh)
            // Widening radii on the same pair: three cheap passes read as one
            // broad glow, which is the light spilling onto the ground behind.
            const radii = [1, 2, 3]
            for (let i = 0; i < radii.length; i++) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFbo[1])
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, bloomTex[0])
                gl.uniform1i(uBlur("uSrc"), 0)
                gl.uniform2f(uBlur("uDir"), radii[i], 0)
                gl.drawArrays(gl.TRIANGLES, 0, 3)

                gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFbo[0])
                gl.bindTexture(gl.TEXTURE_2D, bloomTex[1])
                gl.uniform1i(uBlur("uSrc"), 0)
                gl.uniform2f(uBlur("uDir"), 0, radii[i])
                gl.drawArrays(gl.TRIANGLES, 0, 3)
            }

            /* -- composite --------------------------------------------- */
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            gl.viewport(0, 0, vw, vh)
            gl.useProgram(compProg)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, sceneTex)
            gl.uniform1i(uComp("uScene"), 0)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, bloomTex[0])
            gl.uniform1i(uComp("uBloom"), 1)
            gl.uniform2f(uComp("uRes"), vw, vh)
            gl.uniform1f(uComp("uGlow"), (clamp(L.glow, 0, 10) / 10) * 1.6)
            gl.uniform1f(uComp("uTime"), clock)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        raf = requestAnimationFrame(draw)

        return () => {
            cancelAnimationFrame(raf)
            io?.disconnect()
            ro?.disconnect()
            window.removeEventListener("pointermove", onPointerMove, listen)
            window.removeEventListener("mousemove", onMouseMove, listen)
            window.removeEventListener("pointercancel", onLeave, listen)
            document.removeEventListener("mouseleave", onLeave)
            dropContextListeners()

            dropTargets()
            if (seedTex) gl.deleteTexture(seedTex)
            for (let i = 0; i < 2; i++) {
                if (posTex[i]) gl.deleteTexture(posTex[i])
                if (velTex[i]) gl.deleteTexture(velTex[i])
                if (simFbo[i]) gl.deleteFramebuffer(simFbo[i])
            }
            if (vao) gl.deleteVertexArray(vao)
            gl.deleteProgram(simProg)
            gl.deleteProgram(pointProg)
            gl.deleteProgram(brightProg)
            gl.deleteProgram(blurProg)
            gl.deleteProgram(compProg)
        }
    }, [bucket, generation])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                touchAction: "pan-y",
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
                    opacity: degraded ? 0 : 1,
                }}
            />
            {degraded ? (
                // Above the canvas and made of DOM, not pixels: by the time we
                // know we cannot render, the canvas may already be bound to a
                // WebGL context and will not hand back a 2D one to draw into.
                <div
                    aria-hidden
                    title={"GrainMass: " + degraded}
                    style={{
                        position: "absolute",
                        inset: 0,
                        background:
                            "radial-gradient(circle at 50% 50%, rgba(" +
                            palette.lead.map((c) => Math.round(c * 255)).join(",") +
                            ",0.26) 0%, rgba(0,0,0,0) 62%)",
                        pointerEvents: "none",
                    }}
                />
            ) : null}
        </div>
    )
}

const __presetProps = {
  "colors": [
    {
      "glow": 6.2,
      "color": "#FFC12B"
    },
    {
      "glow": 10,
      "color": "#AA00FF"
    },
    {
      "glow": 10,
      "color": "#4300FF"
    },
    {
      "glow": 10,
      "color": "#63BAFF"
    }
  ],
  "background": "#0D1114",
  "density": 9,
  "scale": 106,
  "fray": 8.9,
  "tilt": 45,
  "grainSize": 1.5,
  "glow": 10,
  "repel": {
    "reach": 5.5,
    "recover": 1.3,
    "strength": 6
  },
  "rotateSpeed": 10,
  "boil": 10
};

export default function GrainMass(props: Record<string, unknown>) {
  return <__BaseImpl_GrainMass {...(__presetProps as Record<string, unknown>)} {...props} />;
}
