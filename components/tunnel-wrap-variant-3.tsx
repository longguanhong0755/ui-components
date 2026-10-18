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
 * The cursor gate's settle. The tunnel shipped with an exponential approach at
 * 6/sec inside the rAF loop — ~0.5s to land. The steering follow is NOT on this
 * control: its target moves with the pointer every frame, so it is a filter on
 * a moving target, not a state change (rule 1 — a control must map to something
 * a designer can see change).
 */
const DEFAULT_TRANSITION: Motion = {
    type: "tween",
    duration: 0.5,
    // easeOut, as the cubic-bezier the tuple type needs.
    ease: [0, 0, 0.58, 1],
}

/**
 * QUANTUM TUNNEL — behaviour-exact raw-GL port of the Three.js original.
 *
 * The brief was "the exact component, same interactiveness and animation", so
 * this is a REIMPLEMENTATION, not a reinterpretation: every line of geometry,
 * shading, steering and post-processing below is the original's arithmetic,
 * carried over verbatim. What changed is only what had to, and each of those is
 * called out where it happens.
 *
 * WHAT LEFT WITH THREE.JS, AND WHAT REPLACED IT
 *
 *   PerspectiveCamera / modelViewMatrix / projectionMatrix  the camera sits at
 *   the origin and only ever ROLLS about Z, so the model-view is one 2D
 *   rotation and the projection is four scalars (`uProj`). Same matrix, no
 *   library — near 0.1 / far 200 are kept so the far plane still clips a tunnel
 *   longer than 200 units exactly as it did.
 *
 *   EffectComposer + UnrealBloomPass  rebuilt as raw GL, pass for pass, not
 *   approximated by a per-sprite halo: a 0.1-threshold luminosity high-pass
 *   (0.299/0.587/0.114 luma, 0.01 smooth width), five mips at 1/2 … 1/32 of the
 *   CSS size, each blurred separably with the same gaussian and the same kernel
 *   radii [3, 5, 7, 9, 11] (sigma == radius), composited with
 *   `mix(factor, 1.2 - factor, 0.4)` over factors [1, .8, .6, .4, .2], then
 *   added over the base image with SRC_ALPHA/ONE. The tint colours are dropped
 *   because all five were white. The whole chain still runs — only its dial is
 *   gone, frozen at the 300% the tunnel shipped at (`BLOOM_STRENGTH`).
 *
 * INTERACTION IS THE ORIGINAL'S: hover steering, not orbit. The pointer bends
 * the tunnel — `uCurve` displaces each point by `pow(z/length, 2) * 50`, so the
 * far end swings and the near end barely moves — plus a `mouse.x * 0.1` camera
 * roll. Steering eases at 0.05 per frame and HOLDS where it was left when the
 * pointer leaves, as the original did. This is the one place the folder's
 * click-and-drag orbit rule is deliberately not followed: it would be a second
 * gesture the original does not have, and the ask was for the original.
 *
 * GEOMETRY IS PROCEDURAL, so nothing rebuilds. The original rebuilt the whole
 * scene whenever Particle Count or Tunnel Radius changed. The buffer here holds
 * four hashes per point and the cylinder is derived in the vertex shader —
 * `angle = h1 * TAU`, `r = radius + (h2 - 0.5) * 5`, `z = -h3 * length` — which
 * is the same distribution the CPU loop produced, from a deterministic PRNG so
 * a reload cannot reshuffle the wall. Count is the draw call's length.
 *
 * FRAME-RATE. The original advanced `time += 0.01` per FRAME, so the tunnel ran
 * at whatever speed the display happened to tick at. That is `0.6/sec` at 60Hz,
 * and it is now derived from dt — identical at 60Hz, correct everywhere else,
 * which also survives this folder's 30fps throttle on the Framer canvas. The
 * 0.05-per-frame steering ease is dt-corrected the same way.
 *
 * Rule 6 recipe verbatim: ONE GL context built in useEffect([]), every live
 * input read from a ref inside a raw rAF loop, never loseContext().
 */

/* ==================================================================== GL CORE
 * Everything between the GL CORE markers is annotation-free JS on purpose: the
 * verification harness slices this range straight out of the file and evals it,
 * so the shaders and the mirrors under test are literally the ones on disk.
 * ------------------------------------------------------------ GL CORE START */

const TAU = Math.PI * 2
const CANVAS_FPS = 30
// The original's Particle Count control tops out at 30000.
const MAX_POINTS = 30000
// PerspectiveCamera(70, aspect, 0.1, 200).
const CAM_FOV = 70
const CAM_NEAR = 0.1
const CAM_FAR = 200
// Particle size was normalised against a 1920x1080 viewport.
const BASELINE_W = 1920
const BASELINE_H = (1920 * 9) / 16
// time += 0.01 per frame, which is this per second at 60Hz.
const TIME_PER_SEC = 0.6
// Steering ease was 0.05 per frame at 60Hz.
const EASE_PER_FRAME = 0.05
// UnrealBloomPass constructor arguments: (resolution, strength, radius, threshold).
const BLOOM_RADIUS = 0.4
const BLOOM_THRESHOLD = 0.1
const BLOOM_SMOOTH = 0.01
const BLOOM_KERNELS = [3, 5, 7, 9, 11]
const BLOOM_FACTORS = [1.0, 0.8, 0.6, 0.4, 0.2]
// 16x16 glyph atlas at 1024px.
const ATLAS_COLS = 16
const ATLAS_SIZE = 1024
/** Density 100 draws the full point budget. */
const DENSITY_AT_100 = MAX_POINTS
/* Dot Size is a real px diameter now, not a percent of the shipped size.
 * gl_PointSize = uParticleSize * vpScale / depth, so a px number only means
 * something at a stated depth: REF_DEPTH is a quarter into the shipped
 * 100-unit tunnel, and a glyph there is exactly `dotSize` px on a baseline
 * 1920x1080 viewport. Nearer glyphs are bigger and farther ones smaller, as
 * perspective requires, and vpScale rescales the whole field on other viewport
 * sizes — that normalisation is what keeps the tunnel looking the same, and it
 * is why the px is exact at the baseline size rather than everywhere.
 * 20px x 25 = 500, the size the tunnel shipped at. */
const REF_DEPTH = 25

function detectDeviceQuality(win: any, nav: any) {
    if (!win) return 1
    const cores = nav.hardwareConcurrency || 4
    const memory = nav.deviceMemory || 8
    const isMobile = "ontouchstart" in win || nav.maxTouchPoints > 0
    const pixelRatio = win.devicePixelRatio || 1
    if (cores <= 2 || memory <= 2 || (isMobile && pixelRatio > 2)) return 0
    if (cores <= 4 || memory <= 4 || isMobile) return 1
    return 2
}

// Typed as a number-keyed record: the quality tier is computed, so a literal
// {0,1,2} object cannot be indexed by it under `strict`.
const PARTICLE_MULTIPLIER: Record<number, number> = { 0: 0.3, 1: 0.6, 2: 1 }
const PIXEL_RATIO_MAP: Record<number, number> = { 0: 1, 1: 1.5, 2: 2 }

// Deterministic, so a reload cannot reshuffle the wall or the atlas. The
// original called Math.random() for both.
function mulberry32(a: any) {
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// Binary only. The Glyphs enum (Binary / Hex / Katakana) is gone, so the
// fragment shader's rowOffset is a constant 0 and the hex and katakana row
// bands were unreachable — the strings that filled them went with the control.
const ATLAS_BINARY = "01"

function buildAtlasCanvas(doc: any) {
    const c = doc.createElement("canvas")
    c.width = ATLAS_SIZE
    c.height = ATLAS_SIZE
    const ctx = c.getContext("2d")
    if (!ctx) return c
    const charSize = ATLAS_SIZE / ATLAS_COLS
    ctx.font = `bold ${charSize * 0.6}px monospace`
    ctx.fillStyle = "white"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    const rnd = mulberry32(0x51a7ee)
    const total = ATLAS_COLS * ATLAS_COLS
    for (let i = 0; i < total; i++) {
        const col = i % ATLAS_COLS
        const row = Math.floor(i / ATLAS_COLS)
        const x = col * charSize + charSize / 2
        const y = row * charSize + charSize / 2
        const char = ATLAS_BINARY[Math.floor(rnd() * ATLAS_BINARY.length)]
        ctx.fillText(char, x, y)
    }
    return c
}

// Four hashes per point: the three the CPU loop drew for angle / radius / z,
// plus aRandom, which drives the glyph pick and the flicker.
function buildSeeds(n: any, seed: any) {
    const a = new Float32Array(n * 4)
    const rnd = mulberry32(seed)
    for (let i = 0; i < n; i++) {
        a[i * 4] = rnd()
        a[i * 4 + 1] = rnd()
        a[i * 4 + 2] = rnd()
        a[i * 4 + 3] = rnd()
    }
    return a
}

/* ---- scene ---- */

const SCENE_VERT = `
precision highp float;

// x angle hash, y radius hash, z depth hash, w aRandom
attribute vec4 aSeed;

uniform float uTime;
uniform float uSpeed;
uniform float uLength;
uniform float uRadius;
uniform float uSpread;
uniform float uRings;
uniform float uTwist;
uniform vec2  uCurve;
uniform float uParticleSize;
uniform float uViewportScale;
uniform float uRoll;
// x f/aspect, y f, z (far+near)/(near-far), w 2*far*near/(near-far)
uniform vec4  uProj;
// xy pointer in ndc, z mode (-1 magnet, 0 none, +1 repel), w how live it is
uniform vec4  uCursor;
uniform float uCurR;
uniform float uCurS;

varying float vZ;
varying float vRandom;

void main() {
    vRandom = aSeed.w;

    // The cylinder the original filled on the CPU, derived here so that
    // Particle Count and Tunnel Radius no longer rebuild the scene.
    float angle = aSeed.x * ${TAU.toFixed(10)};
    float r = uRadius + (aSeed.y - 0.5) * uSpread;
    // Gap 0 leaves the original's uniform random depth — a cloud. Above 0 the
    // depth snaps to rings, and the ring count is derived on the CPU so the
    // spacing always tiles the wrap period exactly: leave a remainder in and an
    // empty band cycles through the tunnel forever.
    float zf = uRings > 0.5 ? floor(aSeed.z * uRings) / uRings : aSeed.z;
    vec3 position = vec3(cos(angle) * r, sin(angle) * r, -(zf * uLength));

    vec3 pos = position;

    // Infinite Scroll (Z-Movement)
    pos.z = mod(pos.z + uTime * uSpeed, uLength);
    pos.z -= uLength;

    // Twist effect
    float twistAngle = pos.z * uTwist * 0.1;
    float c = cos(twistAngle);
    float s = sin(twistAngle);
    mat2 rot = mat2(c, -s, s, c);
    pos.xy = rot * pos.xy;

    // Curve (Mouse Steering)
    float bendFactor = (pos.z / uLength);
    bendFactor = pow(abs(bendFactor), 2.0);
    pos.x += uCurve.x * bendFactor * 50.0;
    pos.y += uCurve.y * bendFactor * 50.0;

    vZ = pos.z;

    // modelViewMatrix for a camera parked at the origin and rolled about Z:
    // the view transform is the inverse of that roll, and nothing else.
    float cr = cos(uRoll);
    float sr = sin(uRoll);
    vec3 mv = vec3(cr * pos.x + sr * pos.y, -sr * pos.x + cr * pos.y, pos.z);

    // Magnet / Repel. Applied in VIEW space at this point's own depth, so the
    // brush is a constant-size disc on SCREEN: walked as a cone instead, it
    // would sweep the near glyphs and leave the far wall untouched. The two
    // camera terms come out of uProj rather than being uploaded twice.
    if (uCursor.w > 0.001 && abs(uCursor.z) > 0.5) {
        float tanHalf = 1.0 / uProj.y;
        float aspect = uProj.y / uProj.x;
        float depth = max(-mv.z, 0.001);
        vec2 cw = vec2(uCursor.x * aspect, uCursor.y) * tanHalf * depth;
        vec2 d = mv.xy - cw;
        float dist = max(length(d), 0.0001);
        float R = max(uCurR * tanHalf * depth, 0.0001);
        float f = 1.0 - smoothstep(0.0, R, dist);
        f *= f;
        float amt = uCurS * R * f * uCursor.w;
        vec2 dir = d / dist;
        // Magnet is capped at the distance to the cursor ray: uncapped, a point
        // overshoots and piles up on the far side of it.
        mv.xy += uCursor.z > 0.0 ? dir * amt : -dir * min(amt, dist * 0.9);
    }

    // Normalize particle size based on viewport to maintain consistent visual
    // appearance.
    gl_PointSize = (uParticleSize * uViewportScale / -mv.z);

    // A gl_PointSize of 0 does NOT vanish: the driver clamps it up to its
    // minimum point size, so Dot Size 0 left the whole tunnel drawn as 1-2px
    // specks and a point past the near plane still rasterized. Both cases have
    // to leave clip space instead.
    if (-mv.z < 1.0 || uParticleSize <= 0.0) {
        gl_PointSize = 0.0;
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }

    gl_Position = vec4(
        uProj.x * mv.x,
        uProj.y * mv.y,
        uProj.z * mv.z + uProj.w,
        -mv.z
    );
}
`

const SCENE_FRAG = `
precision highp float;

uniform sampler2D uTex;
uniform float uCols;
uniform vec3 uPal[8];
uniform float uPalN;
uniform float uTime;

varying float vRandom;

// The palette ramp, generalised from the original's two colours to a palette of
// up to eight. Two entries reduce it to the original's mix(a, b, t) — same
// operation. What changed is what feeds t: it was tunnel depth, so the
// swatches split into bands along the tunnel; it is a per-glyph hash now, so
// they intermix everywhere and the intermediate blends show up with them.
vec3 ramp(float t) {
    float n = max(uPalN - 1.0, 0.0);
    if (n < 0.5) return uPal[0];
    float x = clamp(t, 0.0, 1.0) * n;
    float i = floor(x);
    float f = x - i;
    vec3 a = uPal[0];
    vec3 b = uPal[0];
    for (int k = 0; k < 8; k++) {
        if (float(k) == i) a = uPal[k];
        if (float(k) == i + 1.0) b = uPal[k];
    }
    return mix(a, b, f);
}

void main() {
    float charTick = floor(uTime * 10.0 + vRandom * 10.0);

    // rowOffset was the Glyphs enum's row band (0 binary / 6 hex / 11 katakana).
    // Binary is the only set now, so the term is a constant 0 and is gone.
    float charIndex = mod(charTick, 10.0) + floor(vRandom * 10.0);

    vec2 uv = gl_PointCoord;
    float charSize = 1.0 / uCols;
    float col = mod(charIndex, uCols);
    float row = floor(charIndex / uCols);
    vec2 charUV = vec2((col + uv.x) * charSize, 1.0 - ((row + 1.0 - uv.y) * charSize));

    vec4 tex = texture2D(uTex, charUV);
    if (tex.a < 0.5) discard;

    // Colour is PER GLYPH, not per depth. Each point takes its own position in
    // the ramp, so every swatch is intermixed through the whole tunnel instead
    // of owning a depth band at one end of it.
    // Hashed off vRandom rather than read raw: vRandom also picks the glyph and
    // drives the flicker, and using it directly would weld colour to character
    // — the 0s and the 1s would come out as two different colours.
    float cMix = fract(sin(vRandom * 91.7 + 3.1) * 43758.5453);

    vec3 color = ramp(cMix);

    float flicker = sin(uTime * 20.0 + vRandom * 100.0) * 0.5 + 0.5;
    color += flicker * 0.1;

    gl_FragColor = vec4(color, 1.0);
}
`

/* ---- post: UnrealBloomPass, rebuilt ---- */

const QUAD_VERT = `
precision highp float;
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

// LuminosityHighPassShader with UnrealBloomPass's settings: default colour
// black, default opacity 0, so everything under the threshold is dropped
// outright rather than dimmed.
const HIGHPASS_FRAG = `
precision highp float;
uniform sampler2D tDiffuse;
uniform float luminosityThreshold;
uniform float smoothWidth;
varying vec2 vUv;
void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    vec3 luma = vec3(0.299, 0.587, 0.114);
    float v = dot(texel.xyz, luma);
    vec4 outputColor = vec4(0.0, 0.0, 0.0, 0.0);
    float alpha = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v);
    gl_FragColor = mix(outputColor, texel, alpha);
}
`

// One material per mip; KERNEL_RADIUS and SIGMA are both the mip's kernel size,
// as in getSeperableBlurMaterial.
function blurFrag(kernelRadius: any) {
    return `
precision highp float;
#define KERNEL_RADIUS ${kernelRadius}
#define SIGMA ${kernelRadius}
uniform sampler2D colorTexture;
uniform vec2 texSize;
uniform vec2 direction;
varying vec2 vUv;
float gaussianPdf(in float x, in float sigma) {
    return 0.39894 * exp(-0.5 * x * x / (sigma * sigma)) / sigma;
}
void main() {
    vec2 invSize = 1.0 / texSize;
    float fSigma = float(SIGMA);
    float weightSum = gaussianPdf(0.0, fSigma);
    vec3 diffuseSum = texture2D(colorTexture, vUv).rgb * weightSum;
    for (int i = 1; i < KERNEL_RADIUS; i++) {
        float x = float(i);
        float w = gaussianPdf(x, fSigma);
        vec2 uvOffset = direction * invSize * x;
        vec3 sample1 = texture2D(colorTexture, vUv + uvOffset).rgb;
        vec3 sample2 = texture2D(colorTexture, vUv - uvOffset).rgb;
        diffuseSum += (sample1 + sample2) * w;
        weightSum += 2.0 * w;
    }
    gl_FragColor = vec4(diffuseSum / weightSum, 1.0);
}
`
}

// getCompositeMaterial. The five bloomTintColors were all white, so they are
// dropped rather than uploaded as five vec3(1.0).
const COMPOSITE_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D blurTexture1;
uniform sampler2D blurTexture2;
uniform sampler2D blurTexture3;
uniform sampler2D blurTexture4;
uniform sampler2D blurTexture5;
uniform float bloomStrength;
uniform float bloomRadius;
float lerpBloomFactor(const in float factor) {
    float mirrorFactor = 1.2 - factor;
    return mix(factor, mirrorFactor, bloomRadius);
}
void main() {
    gl_FragColor = bloomStrength * (
        lerpBloomFactor(${BLOOM_FACTORS[0].toFixed(1)}) * texture2D(blurTexture1, vUv) +
        lerpBloomFactor(${BLOOM_FACTORS[1].toFixed(1)}) * texture2D(blurTexture2, vUv) +
        lerpBloomFactor(${BLOOM_FACTORS[2].toFixed(1)}) * texture2D(blurTexture3, vUv) +
        lerpBloomFactor(${BLOOM_FACTORS[3].toFixed(1)}) * texture2D(blurTexture4, vUv) +
        lerpBloomFactor(${BLOOM_FACTORS[4].toFixed(1)}) * texture2D(blurTexture5, vUv));
}
`

// CopyShader, plus the output colour-space encode three applies on the way to
// the screen. `uEncode` exists because the original applies it to exactly ONE
// of the two writes: the base image is blitted by a built-in MeshBasicMaterial,
// which carries three's colorspace_fragment chunk, while the bloom is added by
// a raw ShaderMaterial, which does not. Encoding both would visibly lift the
// bloom, and encoding neither washes the whole frame out.
const COPY_FRAG = `
precision highp float;
uniform sampler2D tDiffuse;
uniform float opacity;
uniform float uEncode;
varying vec2 vUv;
vec3 linearToSRGB(vec3 c) {
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(0.41666)) - 0.055;
    return mix(lo, hi, step(vec3(0.0031308), c));
}
void main() {
    vec4 texel = opacity * texture2D(tDiffuse, vUv);
    vec3 rgb = uEncode > 0.5 ? linearToSRGB(texel.rgb) : texel.rgb;
    gl_FragColor = vec4(rgb, texel.a);
}
`

/* ---- CPU mirrors of the GPU math. Test-only: the GPU is what runs in
       production, these exist so the invariants can be asserted numerically
       instead of eyeballed. Keep them line-for-line with the shaders. ------- */

// The four non-zero terms of THREE.PerspectiveCamera's projection matrix.
function projTerms(fov: any, aspect: any, near: any, far: any) {
    const f = 1 / Math.tan(((fov * Math.PI) / 180) * 0.5)
    return [f / aspect, f, (far + near) / (near - far), (2 * far * near) / (near - far)]
}

function scrollZ(z0: any, time: any, speed: any, length: any) {
    const m = (((z0 + time * speed) % length) + length) % length
    return m - length
}

function twistApply(x: any, y: any, z: any, twist: any) {
    const a = z * twist * 0.1
    const c = Math.cos(a)
    const s = Math.sin(a)
    // mat2(c, -s, s, c) is column-major, so the rows are (c, s) and (-s, c).
    return [c * x + s * y, -s * x + c * y]
}

function bendFactor(z: any, length: any) {
    return Math.pow(Math.abs(z / length), 2)
}

function viewFromWorld(p: any, roll: any) {
    const c = Math.cos(roll)
    const s = Math.sin(roll)
    return [c * p[0] + s * p[1], -s * p[0] + c * p[1], p[2]]
}

function worldFromView(v: any, roll: any) {
    const c = Math.cos(roll)
    const s = Math.sin(roll)
    return [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]]
}

function projectNdc(mv: any, proj: any) {
    const w = -mv[2]
    return [(proj[0] * mv[0]) / w, (proj[1] * mv[1]) / w, (proj[2] * mv[2] + proj[3]) / w]
}

function gaussianPdf(x: any, sigma: any) {
    return (0.39894 * Math.exp((-0.5 * x * x) / (sigma * sigma))) / sigma
}

function lerpBloomFactor(factor: any, radius: any) {
    return factor + (1.2 - factor - factor) * radius
}

// UnrealBloomPass's mip chain: half the CSS size, then halved four more times.
function mipSizes(w: any, h: any) {
    const out = []
    let rx = Math.round(w / 2)
    let ry = Math.round(h / 2)
    for (let i = 0; i < 5; i++) {
        out.push([Math.max(1, rx), Math.max(1, ry)])
        rx = Math.round(rx / 2)
        ry = Math.round(ry / 2)
    }
    return out
}

// The fragment shader's glyph pick, mirrored so it can be asserted numerically.
// Binary only, so the index never leaves the atlas's first two rows.
function charIndexOf(random: any, time: any) {
    const charTick = Math.floor(time * 10 + random * 10)
    return (charTick % 10) + Math.floor(random * 10)
}

function viewportScaleOf(w: any, h: any) {
    return Math.sqrt((w * h) / (BASELINE_W * BASELINE_H))
}

// THREE.ColorManagement has been on by default since r152, so `new Color(hex)`
// converts sRGB to the linear working space before it ever reaches a uniform.
// Skipping this is not a subtle difference: #0040FF uploads as 0.051, not
// 0.251, and every mix along the depth ramp lands in the wrong place.
function srgbToLinear(c: any) {
    return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4)
}

function parseLinearColor(input: any) {
    const c = parseColor(input)
    return [srgbToLinear(c[0]), srgbToLinear(c[1]), srgbToLinear(c[2])]
}

// Framer ControlType.Color emits "#rgb", "#rrggbb", "#rrggbbaa" or "rgb()/rgba()".
function parseColor(input: any) {
    if (!input) return [0, 0, 0]
    const s = String(input).trim()
    const fn = s.match(/rgba?\(([^)]+)\)/i)
    if (fn) {
        const p = fn[1].split(",").map((v) => parseFloat(v.trim()))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }
    let h = s.replace("#", "")
    if (h.length === 3 || h.length === 4) {
        h = h
            .split("")
            .map((ch) => ch + ch)
            .join("")
    }
    h = h.padEnd(6, "0")
    return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
    ]
}

// Gap tiles the wrap period exactly or not at all: take the ring count from the
// requested spacing, then derive the spacing back from it. 0 means "cloud".
function ringsForGap(gap: any, length: any) {
    if (!gap || gap <= 0) return 0
    return Math.max(1, Math.round(length / gap))
}

function compileShader(gl: any, type: any, src: any, tag: any) {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("QuantumTunnel " + tag + ":", gl.getShaderInfoLog(sh))
    }
    return sh
}

function buildProgram(gl: any, vsrc: any, fsrc: any, tag: any) {
    const p = gl.createProgram()
    gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vsrc, tag + ".vert"))
    gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fsrc, tag + ".frag"))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.warn("QuantumTunnel link " + tag + ":", gl.getProgramInfoLog(p))
    }
    return p
}

/* -------------------------------------------------------------- GL CORE END */

/* --------------------------------------------------------------------- props */

/* Panel follows rule 8b — 15 leaf dials, hybrid layout, shared ranges.
 *
 * All 22 rows used to sit inside four groups plus two loose debug switches,
 * with none of the headline dials at the top level.
 *
 * Changed keys, clean break, no fallbacks:
 *   colour.bgColor        -> background   (top level)
 *   colour.palette        -> colors.list  (Colors modal, add/remove swatches)
 *   field.particleCount   -> density      (top level, 0..100)
 *   field.particleSize    -> dotSize      (top level, 0..40 px)
 *   motion.speed          -> speed        (top level, 0..100)
 *   field.tunnel*         -> tunnel { radius, length }
 *   interaction.*         -> cursor { mode, strength }
 *
 * Cut and frozen. Three were debug knobs, which rule 10 says are the
 * component's own job: `quality`, `transparentBackground`, `animationPaused`.
 * `glow` and its intensity are gone outright — the room light behind the
 * tunnel, plus the CSS gradient that drew it. The rest went neutral-first:
 * `gap` (0), `spread` (5), `mouseSensitivity` (100), `bloom` (300 — the post
 * chain is untouched, only its dial went), `glyphs` (binary).
 *
 * `cursor.steering` / `reach` / `strength` collapse into ONE `Strength` dial
 * (rule 8b: a second dial that only scales a first one is a cut). 100 is the
 * tuning the tunnel shipped at — steering 80, reach 30, push 60 — and the dial
 * scales all three together, so 0 makes the cursor inert in every mode.
 *
 * SCALE CHANGES — not migratable, the stored number means something else now:
 *   `speed`    was the raw rate (0..50, shipped 30); 50 is now that rate.
 *   `density`  was a point count (1000..30000, shipped 12000); it is now a
 *              percent of the 30000 budget, so the shipped value is 40.
 *   `dotSize`  was the raw size (50..500, shipped 500), then a 0..100 percent
 *              of it; it is a px DIAMETER now, 0..40, measured at REF_DEPTH on
 *              a baseline 1920x1080 viewport. 20 is the shipped size.
 *              Two deliberate consequences: the upload now carries the
 *              buffer-to-CSS pixel ratio, because gl_PointSize is in
 *              FRAMEBUFFER px and the glyphs were therefore drawing half size
 *              on a DPR-2 screen; and Dot Size stops at 40px where the old
 *              dial's 100% could reach 500 raw units (= 20px) — the ceiling is
 *              higher, not lower.
 *
 * COLOUR IS NO LONGER A DEPTH RAMP. The palette used to be walked from the far
 * end of the tunnel to the near end, so each swatch owned a band of depth and
 * the two defaults read as a blue far end and a red near one. Every glyph now
 * takes its own hashed position along the same ramp, so the swatches — and the
 * blends between them — are intermixed through the whole field. The control is
 * untouched; only what feeds it changed. `uLength` and `vZ` left the fragment
 * shader with the depth term (both still live in the vertex shader).
 */

interface ColorsGroup {
    list: string[]
}
interface TunnelGroup {
    radius: number
    length: number
}
interface CursorGroup {
    mode: string
    strength: number
}

/* Cut controls (rule 8b), frozen at the value the tunnel shipped with. */
const QUALITY = "-1"
const TRANSPARENT_BACKGROUND = false
const ANIMATION_PAUSED = false
const GAP = 0
const SPREAD = 5
const MOUSE_SENSITIVITY = 100
const BLOOM_STRENGTH = 300
/** Tunnel rate at Speed 50 — the rate it shipped at. */
const SPEED_AT_50 = 30
/* The three pointer terms at Cursor Strength 100, in their shipped ratio. */
const STEERING_AT_100 = 80
const REACH_AT_100 = 30
const PUSH_AT_100 = 60
/** Ramp stops. Glyphs take a random position along them — no depth order. */
const DEFAULT_COLORS = ["#0040FF", "#FF0000"]

interface Props {
    background?: string
    colors?: Partial<ColorsGroup>
    /** 0..100, percent of the 30000-point budget */
    density?: number
    /** px diameter at REF_DEPTH, 0..40; 20 is the size the tunnel shipped at */
    dotSize?: number
    /** 0..100; 50 is the rate the tunnel shipped at */
    speed?: number
    tunnel?: Partial<TunnelGroup>
    cursor?: Partial<CursorGroup>
    transition?: Motion
    style?: React.CSSProperties
}

function __BaseImpl_QuantumTunnel(props: Props) {
    const {
        background = "#000000",
        // a group the designer never opened arrives undefined (rule 8)
        colors = {"list":["#FFF100","#1100FF"]},
        density = 20,
        dotSize = 12,
        speed = 50,
        tunnel = {"length":100,"radius":16},
        cursor = {"mode":"steer","strength":100},
        transition = {"ease":[0,0,0.58,1],"type":"tween","delay":0,"duration":0.6},
        style,
    } = props

    /* The cursor gate. A MotionValue read by the loop with .get(), never a
     * setState — and the Transition lives in a ref so changing it cannot land in
     * the GL effect's deps and rebuild the context (rule 6). */
    const gateMV = useRef(motionValue(0)).current
    const transitionRef = useRef(transition)
    transitionRef.current = transition

    const bgColor = background
    // The designer can empty the swatch list; a zero-length ramp would leave
    // the depth gradient with nothing to interpolate.
    const palette =
        colors.list && colors.list.length ? colors.list : DEFAULT_COLORS

    // Density is a percent of the point budget, Dot Size a percent of the size
    // the tunnel shipped at. Both expand back into what the loop already reads.
    const particleCount = (Math.max(0, Math.min(100, density)) / 100) * DENSITY_AT_100
    const particleSize = Math.max(0, Math.min(40, dotSize)) * REF_DEPTH
    const tunnelRadius = tunnel.radius ?? 15
    const tunnelLength = tunnel.length ?? 100
    const gap = GAP
    const spread = SPREAD
    const bloomStrength = BLOOM_STRENGTH

    // 50 is the shipped rate
    const tunnelSpeed = (speed / 50) * SPEED_AT_50
    const twist = 0
    const animationPaused = ANIMATION_PAUSED

    const cursorMode = cursor.mode ?? "steer"
    const mouseSensitivity = MOUSE_SENSITIVITY
    // One dial drives every pointer effect: how far the tunnel bends in Steer,
    // how wide the brush reaches, and how hard Magnet / Repel pull or push.
    // 100 is the shipped tuning and the ceiling; 0 makes the cursor inert in
    // every mode. Clamp matches the control's 0–100 range — a live instance
    // stored above 100 by the old 0–200 dial reads back as 100.
    const cursorAmount = Math.min(100, Math.max(0, cursor.strength ?? 100)) / 100
    // Steer is scaled on the EASED value, not on the bend alone: the camera
    // roll is driven by that same eased number, so scaling only the bend left
    // the tunnel still rolling at Strength 0 and Steer never reached inert.
    const curveStrength = STEERING_AT_100
    const steerGain = cursorAmount
    const cursorRadius = REACH_AT_100 * cursorAmount
    const cursorStrength = PUSH_AT_100 * cursorAmount
    const transparentBackground = TRANSPARENT_BACKGROUND
    const quality = QUALITY

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // The original compared a STRING enum value against the number -1, so Auto
    // never fired and every instance silently ran Balanced. Parsed properly
    // here; pick Balanced explicitly to get exactly what the original drew.
    const q = Number(quality)
    const requested = Number.isFinite(q) ? q : -1
    const effectiveQuality =
        requested === -1
            ? detectDeviceQuality(
                  typeof window === "undefined" ? null : window,
                  typeof navigator === "undefined" ? ({} as any) : navigator
              )
            : requested

    // Every live input flows through this ref: the GL context is built once and
    // must never be torn down by a control change (rule 6).
    const live = useRef<any>({})
    live.current = {
        count: Math.min(
            MAX_POINTS,
            Math.floor(
                particleCount * (PARTICLE_MULTIPLIER[effectiveQuality] ?? 0.6)
            )
        ),
        tunnelRadius,
        tunnelLength,
        gap,
        spread,
        // the 0..100 dial is converted to the raw rate before the loop sees it
        speed: tunnelSpeed,
        twist: twist / 100,
        curveStrength: curveStrength / 10,
        steerGain,
        particleSize,
        palette,
        bgColor,
        transparentBackground,
        bloomStrength: bloomStrength / 100,
        cursorMode,
        mouseSensitivity: mouseSensitivity / 100,
        cursorRadius: cursorRadius / 100,
        cursorStrength: cursorStrength / 100,
        animationPaused,
        pixelRatio: PIXEL_RATIO_MAP[effectiveQuality] ?? 1.5,
    }

    // x/y are the eased steering, tx/ty its target, ndc the raw pointer the
    // brush needs, and `active` fades the brush in on the first real move so a
    // freshly loaded tunnel is not already dented at the origin.
    const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0, ndcX: 0, ndcY: 0, active: 0, target: 0 })

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        // WebGL2 first, only for float render targets: three's composer runs
        // its buffers at half float, and an 8-bit chain clamps the additive
        // pile-up before the high-pass ever sees it, which visibly weakens the
        // bloom. Shaders stay ESSL1, which WebGL2 accepts unchanged.
        const attrs = {
            alpha: true,
            antialias: effectiveQuality >= 2,
            premultipliedAlpha: false,
            depth: false,
            preserveDrawingBuffer: false,
        }
        const gl2 = canvas.getContext("webgl2", attrs) as any
        const gl = (gl2 ||
            canvas.getContext("webgl", attrs)) as WebGLRenderingContext | null
        if (!gl) return
        const isGL2 = !!gl2

        let floatRT: any = null
        if (isGL2) {
            if (gl.getExtension("EXT_color_buffer_half_float") || gl.getExtension("EXT_color_buffer_float")) {
                floatRT = { internal: (gl as any).RGBA16F, type: (gl as any).HALF_FLOAT }
            }
        } else {
            const ext = gl.getExtension("OES_texture_half_float")
            if (ext && gl.getExtension("EXT_color_buffer_half_float")) {
                floatRT = { internal: gl.RGBA, type: ext.HALF_FLOAT_OES }
            }
        }

        /* ---- programs ---- */
        const sceneProg = buildProgram(gl, SCENE_VERT, SCENE_FRAG, "scene")
        const highProg = buildProgram(gl, QUAD_VERT, HIGHPASS_FRAG, "highpass")
        const blurProgs = BLOOM_KERNELS.map((k, i) =>
            buildProgram(gl, QUAD_VERT, blurFrag(k), "blur" + i)
        )
        const compProg = buildProgram(gl, QUAD_VERT, COMPOSITE_FRAG, "composite")
        const copyProg = buildProgram(gl, QUAD_VERT, COPY_FRAG, "copy")

        const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n)
        const su = {
            time: U(sceneProg, "uTime"),
            speed: U(sceneProg, "uSpeed"),
            length: U(sceneProg, "uLength"),
            radius: U(sceneProg, "uRadius"),
            spread: U(sceneProg, "uSpread"),
            rings: U(sceneProg, "uRings"),
            twist: U(sceneProg, "uTwist"),
            curve: U(sceneProg, "uCurve"),
            size: U(sceneProg, "uParticleSize"),
            vpScale: U(sceneProg, "uViewportScale"),
            roll: U(sceneProg, "uRoll"),
            proj: U(sceneProg, "uProj"),
            cursor: U(sceneProg, "uCursor"),
            curR: U(sceneProg, "uCurR"),
            curS: U(sceneProg, "uCurS"),
            tex: U(sceneProg, "uTex"),
            cols: U(sceneProg, "uCols"),
            pal: U(sceneProg, "uPal[0]"),
            palN: U(sceneProg, "uPalN"),
        }
        const hu = {
            tex: U(highProg, "tDiffuse"),
            threshold: U(highProg, "luminosityThreshold"),
            smooth: U(highProg, "smoothWidth"),
        }
        const bu = blurProgs.map((p) => ({
            tex: U(p, "colorTexture"),
            texSize: U(p, "texSize"),
            direction: U(p, "direction"),
        }))
        const cu = {
            b1: U(compProg, "blurTexture1"),
            b2: U(compProg, "blurTexture2"),
            b3: U(compProg, "blurTexture3"),
            b4: U(compProg, "blurTexture4"),
            b5: U(compProg, "blurTexture5"),
            strength: U(compProg, "bloomStrength"),
            radius: U(compProg, "bloomRadius"),
        }
        const yu = {
            tex: U(copyProg, "tDiffuse"),
            opacity: U(copyProg, "opacity"),
            encode: U(copyProg, "uEncode"),
        }

        /* ---- geometry: one static buffer, forever ---- */
        const seedBuf = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)
        gl.bufferData(gl.ARRAY_BUFFER, buildSeeds(MAX_POINTS, 0x5eed01), gl.STATIC_DRAW)
        const aSeed = gl.getAttribLocation(sceneProg, "aSeed")

        const quadBuf = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]),
            gl.STATIC_DRAW
        )
        const quadLocs = [highProg, ...blurProgs, compProg, copyProg].map((p) =>
            gl.getAttribLocation(p, "aPos")
        )

        /* ---- glyph atlas ---- */
        const tex = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, tex)
        // three's CanvasTexture uploads flipped; the fragment shader's charUV
        // arithmetic assumes that origin, so row 0 must land at v = 1.
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildAtlasCanvas(document))
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        // NearestFilter both ways, as the original set.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        /* ---- render targets ---- */
        interface RT {
            fb: WebGLFramebuffer
            tex: WebGLTexture
            w: number
            h: number
        }
        const targets: RT[] = []
        const makeRT = (w: number, h: number, float: boolean): RT => {
            const t = gl.createTexture()!
            gl.bindTexture(gl.TEXTURE_2D, t)
            if (float && floatRT) {
                gl.texImage2D(gl.TEXTURE_2D, 0, floatRT.internal, w, h, 0, gl.RGBA, floatRT.type, null)
            } else {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
            }
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            const fb = gl.createFramebuffer()!
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            const rt = { fb, tex: t, w, h }
            targets.push(rt)
            return rt
        }
        const dropRTs = () => {
            for (const rt of targets) {
                gl.deleteFramebuffer(rt.fb)
                gl.deleteTexture(rt.tex)
            }
            targets.length = 0
        }

        let base: RT | null = null
        let bright: RT | null = null
        let mipsH: RT[] = []
        let mipsV: RT[] = []

        let cssW = 0
        let cssH = 0
        // Buffer-to-CSS pixel ratio. gl_PointSize is in FRAMEBUFFER pixels, so
        // Dot Size only means CSS px if the upload carries this — without it a
        // 20px glyph draws 10 CSS px wide on a DPR-2 screen and the dial's unit
        // is a lie on exactly the displays a designer works on.
        let bufRatio = 1
        let bufW = 0
        let bufH = 0
        let vpScale = 1

        const buildTargets = () => {
            dropRTs()
            base = makeRT(bufW, bufH, true)
            const sizes = mipSizes(cssW, cssH)
            bright = makeRT(sizes[0][0], sizes[0][1], true)
            mipsH = sizes.map((s) => makeRT(s[0], s[1], true))
            mipsV = sizes.map((s) => makeRT(s[0], s[1], true))
        }

        const resize = () => {
            const L = live.current
            const w = canvas.clientWidth || host.clientWidth || 0
            const h = canvas.clientHeight || host.clientHeight || 0
            if (w <= 0 || h <= 0) return
            const ratio = Math.min(L.pixelRatio, window.devicePixelRatio || 1)
            const nw = Math.max(1, Math.round(w * ratio))
            const nh = Math.max(1, Math.round(h * ratio))
            if (w === cssW && h === cssH && nw === bufW && nh === bufH) return
            cssW = w
            cssH = h
            bufW = nw
            bufH = nh
            bufRatio = ratio
            canvas.width = bufW
            canvas.height = bufH
            // Recalculated on resize, exactly as the original's handler did.
            vpScale = viewportScaleOf(cssW, cssH)
            buildTargets()
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        /* ---- pointer: steering (the original's gesture) or the brush ---- */
        let gateAnim: { stop: () => void } | null = null
        const gateTo = (to: number) => {
            if (mouse.current.target === to) return
            mouse.current.target = to
            gateAnim?.stop()
            gateAnim = animate(gateMV, to, transitionRef.current)
        }
        const onMouseMove = (e: MouseEvent) => {
            const L = live.current
            if (L.cursorMode === "off") return
            const rect = host.getBoundingClientRect()
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
            const m = mouse.current
            // Steering keeps the original's inverted, sensitivity-scaled aim.
            m.tx = -x * L.mouseSensitivity
            m.ty = -y * L.mouseSensitivity
            // The brush needs the raw pointer, unscaled: it is a position on
            // screen, not an amount of steering.
            m.ndcX = x
            m.ndcY = y
            gateTo(1)
        }
        // Steering holds where the pointer left it, as the original did — but
        // the brush lets go, or a magnet would stay clamped on an empty screen.
        const onLeave = () => gateTo(0)
        host.addEventListener("mousemove", onMouseMove)
        host.addEventListener("mouseleave", onLeave)

        const minFrame = 1000 / CANVAS_FPS

        const drawQuad = (progIndex: number, prog: WebGLProgram) => {
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
            const loc = quadLocs[progIndex]
            gl.enableVertexAttribArray(loc)
            gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        const bindRT = (rt: RT | null) => {
            if (rt) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, rt.fb)
                gl.viewport(0, 0, rt.w, rt.h)
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null)
                gl.viewport(0, 0, bufW, bufH)
            }
        }

        /* ---- loop ---- */
        let raf = 0
        let last = performance.now()
        let acc = 0
        let time = 0
        const palBuf = new Float32Array(24)

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min((now - last) / 1000, 0.05)
            last = now
            acc += dt * 1000
            if (acc < minFrame) return
            const step = acc / 1000
            acc = 0

            if (cssW <= 0 || cssH <= 0 || !base) {
                resize()
                if (cssW <= 0 || cssH <= 0 || !base) return
            }

            const L = live.current

            // timeRef += 0.01 per frame, expressed as a rate so the tunnel runs
            // at the same speed whatever the display does.
            if (!L.animationPaused) time += step * TIME_PER_SEC

            // Smooth Steering: 0.05 per frame at 60Hz, dt-corrected.
            const k = 1 - Math.pow(1 - EASE_PER_FRAME, step * 60)
            const m = mouse.current
            const steering = L.cursorMode === "steer"
            // Steering eases toward the pointer in Steer mode and back to
            // centre in the others, so switching mode unbends the tunnel
            // instead of freezing it in whatever lean it was left at.
            // Cursor Strength gains the eased steering itself, so both things
            // it drives — the tunnel bend and the camera roll below — scale
            // together, and 0 leaves Steer indistinguishable from Off.
            m.x += ((steering ? m.tx * L.steerGain : 0) - m.x) * k
            m.y += ((steering ? m.ty * L.steerGain : 0) - m.y) * k
            // Cursor gate: the Transition control owns the easing, the loop reads.
            m.active = gateMV.get()

            // Linear, because that is the space three's uniforms were in.
            const bg = parseLinearColor(L.bgColor)
            const proj = projTerms(CAM_FOV, cssW / Math.max(1, cssH), CAM_NEAR, CAM_FAR)
            const count = Math.max(1, Math.min(MAX_POINTS, L.count))
            const transparent = L.transparentBackground === true
            const lengthW = Math.max(1, L.tunnelLength)
            const rings = ringsForGap(L.gap, lengthW)

            const list = L.palette && L.palette.length ? L.palette : ["#FFFFFF"]
            const palN = Math.max(1, Math.min(8, list.length))
            for (let i = 0; i < palN; i++) {
                const c = parseLinearColor(list[i])
                palBuf[i * 3] = c[0]
                palBuf[i * 3 + 1] = c[1]
                palBuf[i * 3 + 2] = c[2]
            }

            const brush =
                L.cursorMode === "magnet" ? -1 : L.cursorMode === "repel" ? 1 : 0

            /* -- scene -- */
            // Transparent mode renders straight to the screen, exactly as the
            // original did: the composer, and therefore the bloom, is skipped.
            bindRT(transparent ? null : base)
            gl.disable(gl.DEPTH_TEST)
            gl.clearColor(
                transparent ? 0 : bg[0],
                transparent ? 0 : bg[1],
                transparent ? 0 : bg[2],
                transparent ? 0 : 1
            )
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.enable(gl.BLEND)
            // THREE.AdditiveBlending.
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE)

            gl.useProgram(sceneProg)
            gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)
            gl.enableVertexAttribArray(aSeed)
            gl.vertexAttribPointer(aSeed, 4, gl.FLOAT, false, 0, 0)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.uniform1i(su.tex, 0)
            gl.uniform1f(su.cols, ATLAS_COLS)
            gl.uniform1f(su.time, time)
            gl.uniform1f(su.speed, L.speed)
            gl.uniform1f(su.length, lengthW)
            gl.uniform1f(su.radius, L.tunnelRadius)
            gl.uniform1f(su.spread, L.spread)
            gl.uniform1f(su.rings, rings)
            gl.uniform1f(su.twist, L.twist)
            gl.uniform2f(su.curve, m.x * L.curveStrength, m.y * L.curveStrength)
            gl.uniform1f(su.size, L.particleSize * bufRatio)
            gl.uniform1f(su.vpScale, vpScale)
            // Subtle camera roll. It follows the steering, so it is zero in the
            // brush modes rather than a second thing the cursor does.
            gl.uniform1f(su.roll, m.x * 0.1)
            gl.uniform4f(su.proj, proj[0], proj[1], proj[2], proj[3])
            gl.uniform4f(
                su.cursor,
                m.ndcX,
                m.ndcY,
                brush,
                brush === 0 ? 0 : m.active
            )
            gl.uniform1f(su.curR, L.cursorRadius * 0.9)
            gl.uniform1f(su.curS, L.cursorStrength * L.mouseSensitivity)
            gl.uniform3fv(su.pal, palBuf)
            gl.uniform1f(su.palN, palN)
            gl.drawArrays(gl.POINTS, 0, count)

            if (transparent) return

            /* -- bloom: high pass -- */
            gl.disable(gl.BLEND)
            bindRT(bright)
            gl.useProgram(highProg)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, base!.tex)
            gl.uniform1i(hu.tex, 0)
            gl.uniform1f(hu.threshold, BLOOM_THRESHOLD)
            gl.uniform1f(hu.smooth, BLOOM_SMOOTH)
            drawQuad(0, highProg)

            /* -- bloom: five separable mips -- */
            let input = bright!
            for (let i = 0; i < 5; i++) {
                gl.useProgram(blurProgs[i])
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, input.tex)
                gl.uniform1i(bu[i].tex, 0)
                gl.uniform2f(bu[i].texSize, mipsH[i].w, mipsH[i].h)
                gl.uniform2f(bu[i].direction, 1, 0)
                bindRT(mipsH[i])
                drawQuad(1 + i, blurProgs[i])

                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, mipsH[i].tex)
                gl.uniform1i(bu[i].tex, 0)
                gl.uniform2f(bu[i].direction, 0, 1)
                bindRT(mipsV[i])
                drawQuad(1 + i, blurProgs[i])

                input = mipsV[i]
            }

            /* -- bloom: composite into mip 0's horizontal target -- */
            bindRT(mipsH[0])
            gl.useProgram(compProg)
            const slots = [cu.b1, cu.b2, cu.b3, cu.b4, cu.b5]
            for (let i = 0; i < 5; i++) {
                gl.activeTexture(gl.TEXTURE0 + i)
                gl.bindTexture(gl.TEXTURE_2D, mipsV[i].tex)
                gl.uniform1i(slots[i], i)
            }
            gl.uniform1f(cu.strength, L.bloomStrength)
            gl.uniform1f(cu.radius, BLOOM_RADIUS)
            drawQuad(6, compProg)

            /* -- to screen: base, then bloom added over it -- */
            bindRT(null)
            gl.useProgram(copyProg)
            gl.disable(gl.BLEND)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, base!.tex)
            gl.uniform1i(yu.tex, 0)
            gl.uniform1f(yu.opacity, 1)
            // Encoded: the original's base blit goes through a built-in
            // material, which carries the output colour-space conversion.
            gl.uniform1f(yu.encode, 1)
            drawQuad(7, copyProg)

            gl.enable(gl.BLEND)
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
            gl.bindTexture(gl.TEXTURE_2D, mipsH[0].tex)
            // Raw: the original adds the bloom with CopyShader, which has no
            // colour-space chunk, so it lands on top in linear values.
            gl.uniform1f(yu.encode, 0)
            drawQuad(7, copyProg)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            gateAnim?.stop()
            host.removeEventListener("mousemove", onMouseMove)
            host.removeEventListener("mouseleave", onLeave)
            dropRTs()
            gl.deleteTexture(tex)
            gl.deleteBuffer(seedBuf)
            gl.deleteBuffer(quadBuf)
            // No loseContext(): getContext hands back the same context per
            // canvas, so a force-lost one survives StrictMode's remount.
        }
    }, [effectiveQuality])

    // The Glow control drew a CSS radial "room light" behind the tunnel. It is
    // gone, so the root is the flat background the canvas composites over.
    // Bloom — the light the glyphs themselves throw — is unaffected.
    const backdrop = transparentBackground ? "transparent" : bgColor

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the style spread: the canvas is absolutely
                // positioned, so the root has no in-flow content and would
                // collapse to a dot under Framer's Fit Content sizing. The
                // original had no floor and did collapse.
                minWidth: 800,
                minHeight: 600,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background: backdrop,
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
  "speed": 8,
  "colors": {
    "list": [
      "#FF0000",
      "#FFFFFF"
    ]
  },
  "cursor": {
    "mode": "magnet",
    "strength": 100
  },
  "tunnel": {
    "length": 100,
    "radius": 16
  },
  "density": 20,
  "dotSize": 12,
  "background": "#000000",
  "transition": {
    "ease": [
      0,
      0,
      0.58,
      1
    ],
    "type": "tween",
    "delay": 0,
    "duration": 0.6
  }
};

export default function QuantumTunnel(props: Record<string, unknown>) {
  return <__BaseImpl_QuantumTunnel {...(__presetProps as Record<string, unknown>)} {...props} />;
}
