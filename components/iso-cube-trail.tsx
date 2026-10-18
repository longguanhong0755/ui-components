"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * ISO CUBE TRAIL — an isometric quilt of 3000 rounded cubes that the pointer
 * presses into, dragging a stretched dent behind it.
 *
 * Port of Anemolo/ThreeJs-Instancing-mouse-effect (Codrops, "Mouse Effect with
 * Instancing in Three.js", demo 1). The interaction, the motion and the framing
 * are the source's, term for term (rule 8):
 *
 *   - a TRUE isometric orthographic camera at (40, 40, 40) looking at the
 *     origin, fitted so the SHORT canvas edge always spans 2x Distance world
 *     units — the source's `size = 4` with its ratio/ratioW swap;
 *   - a 55 x 55 grid of 0.5-unit rounded boxes, 27.5 units across, of which the
 *     camera only ever sees the middle ~12;
 *   - the pointer ray-cast onto the ground plane, then TWO smoothed points:
 *     `uPos0` chases the hit, `uPos1` trails `uPos0` through a lerped velocity,
 *     and the influence field is the distance to the SEGMENT between them, so a
 *     fast sweep stretches the dent into a capsule and a still pointer relaxes
 *     it back to a circle;
 *   - that distance through `smoothstep(2, 5 * mouseSize)`, pushing each cube
 *     down by one unit at full strength — the bowl;
 *   - a 3-second intro where every cube scales up from zero and drops one unit,
 *     staggered by its distance from the centre;
 *   - a standing radial sine bob, 0.1 units, that keeps the field alive when
 *     nothing is happening — which is every frame on the Framer canvas;
 *   - the source's per-instance colour ramp: a weighted white-to-base fade by
 *     distance from the centre, which is what makes the middle read cyan and
 *     the corners near-black.
 *
 * WHAT IS NOT THE SOURCE'S: the machinery. No three, no GSAP, no postprocessing,
 * no glslify, no npm at all (rule 10, self-contained). WebGL2 throughout, one
 * instanced draw per pass, and three r155's MeshPhysicalMaterial re-derived
 * inline — Lambert diffuse plus a GGX lobe at the 0.0525 roughness floor three
 * clamps to, ambient plus that inverted hemisphere (sky 0x9f9f9f DARKER than
 * ground 0xffffff, so side faces read brighter than tops), one key light at
 * intensity 4 with a 2048 shadow map and one unshadowed fill at 0x909090. The
 * pinpoint white specks on every cube corner are that GGX lobe on the rounded
 * edge, not a texture; they are the single most recognisable thing in the
 * reference frames and the corner segments exist to carry them.
 *
 * DELIBERATE DEPARTURES, each one machinery or a defect:
 *
 *   1. Density sets the CELL against a fixed 27.5-unit reference footprint, and
 *      the GRID is then fitted to what the camera can actually see. In the
 *      source, Density is a cube count on a field that grows with it, so
 *      turning it down shrinks the field out from under a camera that cannot
 *      see its edge — and the colour ramp and the intro stagger, both keyed to
 *      world distance from the centre, change shape with it. Its fixed 27.5
 *      also only covers its own window aspect: a wide frame, or any Distance
 *      past ~5, walks the field edge into shot. At the defaults the fit lands
 *      on exactly its 55 x 55 of 0.5.
 *   2. Everything vertical is in CELLS, not absolute world units: the intro
 *      lift (source 1.0 at cell 0.5 -> 2 cells), the bob (0.1 -> 0.2 cells) and
 *      the pointer Lift. Identical at the default Density, and the relief keeps
 *      its proportion to the cubes at every other one.
 *   3. `Reach` scales the smoothstep's INNER edge with its outer one, 0.4 : 1,
 *      instead of the source's fixed 2.0. The source's inner edge is a constant
 *      while the outer is `5 * mouseSize`, so any mouseSize under 0.4 inverts
 *      them and GLSL's smoothstep is undefined there. Identical at the default.
 *   4. The rotation rotates the NORMAL too. The source rotates only the
 *      position, because it replaces `project_vertex` and leaves
 *      `defaultnormal_vertex` alone, so at any Rotation > 0 its cubes turn
 *      while their shading stays welded to the world axes. That is a defect,
 *      not a look.
 *   5. Shadow bias. The source ships `shadow.bias = 0`, and its own published
 *      frames carry the acne it causes — a scatter of solid-black cube tops
 *      around the rim of the bowl. Fixed with a normal offset in shadow texels.
 *   5a. The shadow camera and the pointer's hit plane are a uniform SCALE of
 *      the source's, keyed to how much ground the frame needs. Its hand-picked
 *      +-10 shadow box and 20x20 hit plane fit its own `size = 4` at a window
 *      aspect and nothing else: at any bigger Distance its shadows stop at a
 *      ring inside the frame and the dent freezes before reaching the edge.
 *      Exactly its numbers at its own framing.
 *   5b. The intro tween runs past 1, to the last cube's own window, instead of
 *      stopping there and leaving every cube past radius 11.375 permanently
 *      half-scale and floating. Same rate, so nothing the source could see
 *      changes; it is only visible at all once the grid is fitted (1).
 *   6. Every per-frame lerp is dt-corrected (`1 - exp(-k dt)`). The source's
 *      0.08 and 0.05 per FRAME make the dent lag differently at 60 and 120Hz.
 *   7. The pointer is read from the host's own box as a RATIO of client
 *      coordinates, not from `window.innerWidth`, and the phase accumulators
 *      are wrapped to 2pi on the CPU instead of feeding a forever-growing
 *      `uTime` into a float32 uniform.
 *   8. The canvas is transparent and `Background` is the root's CSS colour
 *      (rule 8b), where the source's canvas is opaque black. One consequence:
 *      where the dent bends steeply the cubes pull apart, and those seams now
 *      show the Background instead of the source's hard-wired black — 0.02% of
 *      the frame at the default Density, which is the same colour anyway.
 *
 * NOT PORTED, deliberately: the `follower` mesh of demos 2 and 3 (a cube or
 * sphere riding the cursor). It is a second material, a second shadow caster
 * and a control group of its own, and demo 1 — the README's frame — has none.
 *
 * Rule 6 recipe: ONE GL context built in useEffect([]); every live input read
 * from a ref inside a raw rAF loop (raw rAF ticks on the Framer canvas, unlike
 * IntersectionObserver or framer-motion appear props). Never calls
 * loseContext() — getContext() hands back the SAME force-lost context on the
 * next StrictMode mount and renders black. Density and Shape rebuild buffers,
 * never the context.
 */

/* ---------------------------------------------------------------- constants */

// The source's grid: 55 cells of 0.5. Density now sets the resolution of this
// FIXED footprint, so the colour ramp and the intro stagger — both keyed to
// world distance from the centre — never change shape with it.
const FIELD = 27.5

// Isometric. Only the DIRECTION matters to an orthographic projection; the
// magnitude is the source's and is kept so near/far read the same.
const EYE: [number, number, number] = [40, 40, 40]
const NEAR = 0.001
const FAR = 1000

// The source's invisible hit plane is a 20x20 quad at the origin, and a ray
// that misses it leaves the dent parked where it was. The visible ground
// footprint is barely wider than this, so it only bites in the far corners.
const HIT_HALF = 10

// Geometry, all in units of ONE CELL so `uSide` scales it. The source builds
// each shape at an absolute 0.5 and lets it overlap its neighbours; the
// cylinder, torus and icosahedron are all wider than their cell there too.
const CORNER_R = 0.2 // source RoundedBox radius 0.1 on a 0.5 box
const CORNER_SEGS = 3
const CYL_RADIUS = 1.0 // CylinderGeometry(0.5, 0.5, 0.5) / 0.5
const CYL_HEIGHT = 1.0
const CYL_SEGS = 24 // source 32; segment counts are not a design control
const TORUS_RING = 0.5 // TorusGeometry(0.25, 0.15) / 0.5
const TORUS_TUBE = 0.3
const TORUS_TUBULAR = 32 // source 48
const TORUS_RADIAL = 10 // source 12
const ICO_RADIUS = 1.0 // IcosahedronGeometry(0.5, 0) / 0.5

// Intro: the source's 3s linear tween on uAnimate, and its `+ 1.0` drop.
const INTRO_SECONDS = 3
const INTRO_LIFT_CELLS = 2 // 1.0 world at cell 0.5
const BOB_CELLS = 0.2 // 0.1 world at cell 0.5
const ROT_INTRO_PHASE = 3.14 // the source's literal, not PI

/* Grid coverage. The camera's ground footprint is a rhombus, and the ground
 * point under the frame's own corner is at 0.7071 * halfW +- 1.2247 * halfH on
 * each axis — so that sum is the field half-extent the frame needs. The source
 * ships a fixed 27.5 and gets away with it at its own window aspect and its own
 * `size = 4`; at any wider aspect, or any bigger Distance, its field edge walks
 * into frame. Here the grid is FITTED to the frame instead, never smaller than
 * the source's own footprint, and coarsened rather than allowed to exceed
 * COLS_MAX instances-per-side.
 *
 * MARGIN_CELLS is the tallest a cube can get — half a cube, the bob, the intro
 * lift and a full-range Lift, plus one cell of slack — because a raised cube at
 * the edge still needs a neighbour behind it. */
const FIT_U = Math.SQRT1_2
const FIT_V = Math.sqrt(1.5)
const MARGIN_CELLS = 0.5 + BOB_CELLS + INTRO_LIFT_CELLS + 4 + 1
const COLS_MAX = 160

/* The source's OWN framing requirement: size 4 at 3:2, which is what its
 * hand-picked +-10 shadow box and 20x20 hit plane were sized against. Any
 * framing that needs no more than this keeps both of them exactly; a wider one
 * scales them, so the shadow's cutoff and the pointer's reach stay in the same
 * place relative to the frame instead of becoming a ring inside it. */
const FIT_REF = FIT_U * 6 + FIT_V * 4

// Pointer field. `Reach` 50 reproduces smoothstep(2.0, 5.0) exactly.
const REACH_REF = 5
const REACH_INNER_RATIO = 0.4 // the source's fixed 2.0 over that 5.0

// The source's per-frame lerps, as rates per second: 0.08/frame at 60Hz is
// -ln(1 - 0.08) * 60, and the velocity chain's 0.05/frame likewise. Its
// `uPos1 += vel` treats vel as a per-frame step, so the gain is 0.05 * 60.
const POS_K = 5.004
const VEL_K = 3.078
const VEL_GAIN = 3.0
const PRESENCE_K = 8.0 // fade rate for the hover in/out dent strength

/* Lights, frozen. Rule 8b: lighting is not a design control. These are the
 * source's four lights, colour-managed to linear the way three r155 does
 * (useLegacyLights defaults to false there, so no PI scale factor). */
const AMBIENT = 1.0 // AmbientLight(0xffffff, 1)
const HEMI_SKY = 0.346566 // HemisphereLight sky 0x9f9f9f, srgb -> linear
const HEMI_GROUND = 1.0 // ... ground 0xffffff. Yes: the sky is the DARK one.
const KEY_DIR: [number, number, number] = [10, 5, 10]
const KEY_INTENSITY = 4.0
const FILL_DIR: [number, number, number] = [-10, 5, 10]
const FILL_INTENSITY = 0.279013 // DirectionalLight(0x909090, 1)
const ROUGH_FLOOR = 0.0525 // three's clamp on roughness 0
const F0 = 0.04 // non-metal specular at normal incidence

// The source's DirectionalLightShadow, verbatim: a +-10 ortho box, 2048 map.
const SHADOW_SIZE = 2048
const SHADOW_HALF = 10
const SHADOW_NEAR = 0.5
const SHADOW_FAR = 40
const SHADOW_BIAS = 0.0006
const SHADOW_NORMAL_OFFSET = 1.5 // in shadow texels

const MAX_DPR = 1.5 // the source's Math.min(devicePixelRatio, 1.5)

/* ------------------------------------------------------------------ shaders */

/* Shared by the shadow and scene vertex passes so the two can never disagree
 * about where a cube is. This is the source's replaced `project_vertex`, term
 * for term, with the two fixes noted in the header (rotated normal, cell-
 * relative vertical units). */
const SOLVE = `
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aOffset;

uniform float uSide;
uniform vec2  uPos0;
uniform vec2  uPos1;
uniform float uInner;
uniform float uOuter;
uniform float uGrow;
uniform float uLift;
uniform float uBob;
uniform float uIntroLift;
uniform float uRotAmount;
uniform float uRotPhase;
uniform float uTwist;
uniform float uBobPhase;
uniform float uFreq;
uniform float uAnimate;

float map(float value, float min1, float max1, float min2, float max2){
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

// The source's rotationMatrix, which is the transpose of the usual Rodrigues
// form — i.e. a turn by -angle. Kept as-is: with one axis and one dial, the
// sign is the direction the source spins in.
mat3 rotationMatrix(vec3 axis, float angle){
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat3(
        oc * axis.x * axis.x + c,          oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
        oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c,          oc * axis.y * axis.z - axis.x * s,
        oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c);
}

float sdSegment(vec2 p, vec2 a, vec2 b){
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-12), 0.0, 1.0);
    return length(pa - ba * h);
}

// glsl-easings, as glslify inlined them into the source's built bundle.
float cubicOut(float t){ float f = t - 1.0; return f * f * f + 1.0; }
float cubicInOut(float t){
    return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
}

void solve(out vec3 world, out vec3 nrm, out float toCenter){
    vec3 t = aPos * uSide;
    nrm = aNormal;
    toCenter = length(aOffset);

    float mt = smoothstep(uInner, uOuter, sdSegment(aOffset, uPos0, uPos1));

    // Mouse scale
    t *= 1.0 + cubicOut(1.0 - mt) * uGrow;

    // Instance animation: a per-cube window opening later the further out it is.
    // end - start is (toCenter + 1.5) * 0.06, never zero, so map() is safe.
    float start = toCenter * 0.02;
    float end = start + (toCenter + 1.5) * 0.06;
    float anim = map(clamp(uAnimate, start, end), start, end, 0.0, 1.0);

    if (uRotAmount != 0.0) {
        mat3 R = rotationMatrix(vec3(0.0, 1.0, 1.0),
            uRotAmount * (anim * ${ROT_INTRO_PHASE.toFixed(4)} + uRotPhase + toCenter * 0.4 * uTwist));
        t = R * t;
        nrm = R * nrm;
    }

    // Mouse offset — the dent. uLift is signed and already in world units.
    t.y += (1.0 - mt) * uLift;

    t *= cubicInOut(anim);
    t.y += cubicInOut(1.0 - anim) * uIntroLift;
    t.y += sin(uBobPhase + toCenter * uFreq) * uBob;

    world = vec3(aOffset.x, 0.0, aOffset.y) + t;
}
`

const SHADOW_VERT = `#version 300 es
precision highp float;
${SOLVE}
uniform mat4 uLightViewProj;
void main(){
    vec3 world; vec3 nrm; float tc;
    solve(world, nrm, tc);
    gl_Position = uLightViewProj * vec4(world, 1.0);
}
`

const SHADOW_FRAG = `#version 300 es
precision highp float;
void main(){}
`

const SCENE_VERT = `#version 300 es
precision highp float;
${SOLVE}
uniform mat4  uViewProj;
uniform mat4  uLightViewProj;
uniform float uNormalOffset;
uniform vec3  uBase;
uniform vec3  uWeights;
uniform float uDegrade;

out vec3 vWorld;
out vec3 vNormal;
out vec3 vDiffuse;
out vec4 vLightPos;

void main(){
    vec3 world; vec3 nrm; float toCenter;
    solve(world, nrm, toCenter);

    vWorld = world;
    vNormal = nrm;

    // The source's instance colour, computed here instead of on the CPU so a
    // colour or Falloff edit never rebuilds a buffer. Its weights are
    // 1 - 0.5 * (channel's share of the base colour), so center = 1 leaves
    // the base untouched and center = 0 collapses to the residual tint.
    // three lets this go negative and the framebuffer clamps it; clamping here
    // is the same picture without a pow(negative) in the middle of it.
    float center = 1.0 - toCenter * 0.12 * uDegrade;
    vec3 tint = clamp(center * uWeights + (1.0 - uWeights), 0.0, 1.0);
    vDiffuse = uBase * tint;

    // Normal offset rather than a fat depth bias: the receivers are the flat
    // tops of cubes under a 19-degree light, which is exactly where a constant
    // bias has to grow until the contact shadow detaches.
    vLightPos = uLightViewProj * vec4(world + nrm * uNormalOffset, 1.0);
    gl_Position = uViewProj * vec4(world, 1.0);
}
`

/* three r155 MeshPhysicalMaterial with metalness 0, roughness 0, no env map and
 * no tone mapping, which is what the source asks for. That reduces to Lambert
 * plus one GGX lobe per light, with roughness pinned at three's 0.0525 clamp
 * and its geometryRoughness term — the derivative of the normal, which is what
 * keeps the corner highlights from aliasing into fireflies. */
const SCENE_FRAG = `#version 300 es
precision highp float;
// GLSL ES 3.00 gives sampler types no default precision in a fragment shader,
// and omitting this is a compile error, not a warning.
precision highp sampler2DShadow;

in vec3 vWorld;
in vec3 vNormal;
in vec3 vDiffuse;
in vec4 vLightPos;
out vec4 fragColor;

uniform vec3  uEye;
uniform vec3  uKeyDir;
uniform vec3  uFillDir;
uniform sampler2DShadow uShadowMap;
uniform float uShadowTexel;

const float PI = 3.141592653589793;
const float RECIPROCAL_PI = 0.3183098861837907;

float pow2(float x){ return x * x; }

vec3 F_Schlick(vec3 f0, float f90, float dotVH){
    float f = pow(1.0 - dotVH, 5.0);
    return f0 * (1.0 - f) + vec3(f90) * f;
}
float V_GGX_SmithCorrelated(float alpha, float dotNL, float dotNV){
    float a2 = pow2(alpha);
    float gv = dotNL * sqrt(a2 + (1.0 - a2) * pow2(dotNV));
    float gl = dotNV * sqrt(a2 + (1.0 - a2) * pow2(dotNL));
    return 0.5 / max(gv + gl, 1e-6);
}
float D_GGX(float alpha, float dotNH){
    float a2 = pow2(alpha);
    float d = pow2(dotNH) * (a2 - 1.0) + 1.0;
    return RECIPROCAL_PI * a2 / pow2(d);
}
vec3 BRDF_GGX(vec3 L, vec3 V, vec3 N, float roughness){
    float alpha = pow2(roughness);
    vec3 H = normalize(L + V);
    float dotNL = clamp(dot(N, L), 0.0, 1.0);
    float dotNV = clamp(dot(N, V), 0.0, 1.0);
    float dotNH = clamp(dot(N, H), 0.0, 1.0);
    float dotVH = clamp(dot(V, H), 0.0, 1.0);
    return F_Schlick(vec3(${F0.toFixed(6)}), 1.0, dotVH)
         * (V_GGX_SmithCorrelated(alpha, dotNL, dotNV) * D_GGX(alpha, dotNH));
}

// 3x3 of hardware-lerped comparisons, which is the PCFSoft the source asks for
// without hand-rolling the lerp.
float shadowFactor(){
    vec3 pc = vLightPos.xyz / vLightPos.w * 0.5 + 0.5;
    if (pc.x < 0.0 || pc.x > 1.0 || pc.y < 0.0 || pc.y > 1.0 || pc.z > 1.0) return 1.0;
    float lit = 0.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            lit += texture(uShadowMap,
                vec3(pc.xy + vec2(float(x), float(y)) * uShadowTexel,
                     pc.z - ${SHADOW_BIAS.toFixed(6)}));
        }
    }
    return lit / 9.0;
}

vec3 toSRGB(vec3 c){
    return mix(c * 12.92,
               1.055 * pow(max(c, vec3(0.0031308)), vec3(1.0 / 2.4)) - 0.055,
               step(0.0031308, c));
}

void main(){
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uEye - vWorld);
    vec3 albedo = vDiffuse;

    vec3 dxy = max(abs(dFdx(N)), abs(dFdy(N)));
    float roughness = min(${ROUGH_FLOOR.toFixed(6)} + max(max(dxy.x, dxy.y), dxy.z), 1.0);

    // Indirect: ambient plus the source's inverted hemisphere.
    float hemiWeight = 0.5 * N.y + 0.5;
    vec3 irradiance = vec3(${AMBIENT.toFixed(6)} + mix(${HEMI_GROUND.toFixed(6)}, ${HEMI_SKY.toFixed(6)}, hemiWeight));
    vec3 col = irradiance * albedo * RECIPROCAL_PI;

    // Key, shadowed. three multiplies the shadow into the light COLOUR, so it
    // dims the specular lobe too.
    {
        vec3 lc = vec3(${KEY_INTENSITY.toFixed(6)}) * shadowFactor();
        vec3 irr = max(dot(N, uKeyDir), 0.0) * lc;
        col += irr * (albedo * RECIPROCAL_PI + BRDF_GGX(uKeyDir, V, N, roughness));
    }
    // Fill, unshadowed.
    {
        vec3 irr = max(dot(N, uFillDir), 0.0) * vec3(${FILL_INTENSITY.toFixed(6)});
        col += irr * (albedo * RECIPROCAL_PI + BRDF_GGX(uFillDir, V, N, roughness));
    }

    fragColor = vec4(toSRGB(clamp(col, 0.0, 1.0)), 1.0);
}
`

/* ------------------------------------------------------------------ helpers */

// Colour parser accepting "#rgb", "#rrggbb", "#rrggbbaa", "rgb()", "rgba()",
// "hsl()", "hsla()" and "var(--token, fallback)" — a hex-only parse makes the
// colour input look dead on a themed project.
function parseColor(input: string): [number, number, number] {
    if (!input) return [0, 0, 0]
    let s = String(input).trim()

    const v = s.match(/^var\(\s*--[^,)]+\s*,\s*(.+)\)$/i)
    if (v) s = v[1].trim()

    if (s[0] === "#") {
        const h = s.slice(1)
        const n = (i: number, len: number) =>
            parseInt(len === 1 ? h[i] + h[i] : h.slice(i * 2, i * 2 + 2), 16) / 255
        if (h.length === 3 || h.length === 4) return [n(0, 1), n(1, 1), n(2, 1)]
        if (h.length === 6 || h.length === 8) return [n(0, 2), n(1, 2), n(2, 2)]
        return [0, 0, 0]
    }

    const rgb = s.match(/^rgba?\(([^)]+)\)$/i)
    if (rgb) {
        const p = rgb[1].split(/[\s,/]+/).filter(Boolean)
        const ch = (x: string) =>
            x.endsWith("%") ? parseFloat(x) / 100 : parseFloat(x) / 255
        return [ch(p[0]) || 0, ch(p[1]) || 0, ch(p[2]) || 0]
    }

    const hsl = s.match(/^hsla?\(([^)]+)\)$/i)
    if (hsl) {
        const p = hsl[1].split(/[\s,/]+/).filter(Boolean)
        const h = ((parseFloat(p[0]) % 360) + 360) % 360
        const sa = parseFloat(p[1]) / 100
        const l = parseFloat(p[2]) / 100
        const c = (1 - Math.abs(2 * l - 1)) * sa
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
        const m = l - c / 2
        const t: [number, number, number] =
            h < 60 ? [c, x, 0] :
            h < 120 ? [x, c, 0] :
            h < 180 ? [0, c, x] :
            h < 240 ? [0, x, c] :
            h < 300 ? [x, 0, c] : [c, 0, x]
        return [t[0] + m, t[1] + m, t[2] + m]
    }

    return [0, 0, 0]
}

function srgbToLinear(c: number): number {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/* ------------------------------------------------------------------ matrices
 * Column-major, the layout uniformMatrix4fv wants. Two projections and a
 * lookAt is the whole requirement, which is why there is no matrix library.
 */

type M4 = Float32Array

function mul(a: M4, b: M4, out: M4): M4 {
    for (let c = 0; c < 4; c++) {
        const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3]
        out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3
        out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3
        out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3
        out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3
    }
    return out
}

// Symmetric orthographic box, the only kind either camera here needs.
function orthoBox(halfW: number, halfH: number, near: number, far: number, out: M4): M4 {
    out.fill(0)
    out[0] = 1 / halfW
    out[5] = 1 / halfH
    out[10] = -2 / (far - near)
    out[14] = -(far + near) / (far - near)
    out[15] = 1
    return out
}

// lookAt the origin from (ex, ey, ez), with an explicit up. Returns the VIEW
// matrix; its basis ROWS are the camera axes in world space.
function lookAtOrigin(
    ex: number, ey: number, ez: number,
    ux: number, uy: number, uz: number,
    out: M4
): M4 {
    let zx = ex, zy = ey, zz = ez
    let l = Math.hypot(zx, zy, zz) || 1
    zx /= l; zy /= l; zz /= l
    let xx = uy * zz - uz * zy
    let xy = uz * zx - ux * zz
    let xz = ux * zy - uy * zx
    l = Math.hypot(xx, xy, xz) || 1
    xx /= l; xy /= l; xz /= l
    const yx = zy * xz - zz * xy
    const yy = zz * xx - zx * xz
    const yz = zx * xy - zy * xx
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0
    out[12] = -(xx * ex + xy * ey + xz * ez)
    out[13] = -(yx * ex + yy * ey + yz * ez)
    out[14] = -(zx * ex + zy * ey + zz * ez)
    out[15] = 1
    return out
}

/* --------------------------------------------------------------- GL plumbing */

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("IsoCubeTrail shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function link(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram | null {
    const v = compile(gl, gl.VERTEX_SHADER, vs)
    const f = compile(gl, gl.FRAGMENT_SHADER, fs)
    if (!v || !f) return null
    const p = gl.createProgram()
    if (!p) return null
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.linkProgram(p)
    gl.deleteShader(v)
    gl.deleteShader(f)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("IsoCubeTrail link:", gl.getProgramInfoLog(p))
        return null
    }
    return p
}

function uniforms(
    gl: WebGL2RenderingContext,
    p: WebGLProgram
): Record<string, WebGLUniformLocation | null> {
    const out: Record<string, WebGLUniformLocation | null> = {}
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number
    for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i)
        if (info) out[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(p, info.name)
    }
    return out
}

/* ----------------------------------------------------------------- geometry
 * Every shape is built in units of ONE CELL and scaled by uSide, so Density and
 * Gap move the cubes without ever regenerating a vertex. Winding is CCW seen
 * from outside, so a single cullFace(BACK) covers all four.
 */

type Mesh = { pos: Float32Array; nor: Float32Array; idx: Uint16Array }

// (normal, u, v) with u x v == normal, for all six faces.
const FACES: [number[], number[], number[]][] = [
    [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
]

/* A rounded box of side 1 and corner radius `r`.
 *
 * Each face is a grid over a NON-UNIFORM coordinate list: `segs` samples across
 * each corner arc and ONE across the flat middle, because a uniform grid at
 * this radius spends every sample on the flat part and resolves the arc with a
 * single quad. Each sample is then projected onto the true rounded surface by
 * clamping it into the inner box and pushing it out by `r` — which hands back
 * the exact normal as a side effect, so nothing has to be averaged. */
function roundedBox(r: number, segs: number): Mesh {
    const b = 0.5 - r
    const axis: number[] = []
    for (let k = 0; k <= segs; k++) axis.push(-b - r * Math.cos((k * Math.PI) / (2 * segs)))
    axis.push(b)
    for (let k = 1; k <= segs; k++) axis.push(b + r * Math.sin((k * Math.PI) / (2 * segs)))

    const m = axis.length
    const pos: number[] = []
    const nor: number[] = []
    const idx: number[] = []

    for (const [n, u, v] of FACES) {
        const base = pos.length / 3
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < m; j++) {
                const su = axis[i]
                const sv = axis[j]
                const px = n[0] * 0.5 + u[0] * su + v[0] * sv
                const py = n[1] * 0.5 + u[1] * su + v[1] * sv
                const pz = n[2] * 0.5 + u[2] * su + v[2] * sv
                const cx = Math.max(-b, Math.min(b, px))
                const cy = Math.max(-b, Math.min(b, py))
                const cz = Math.max(-b, Math.min(b, pz))
                const dx = px - cx, dy = py - cy, dz = pz - cz
                const L = Math.hypot(dx, dy, dz) || 1
                nor.push(dx / L, dy / L, dz / L)
                pos.push(cx + (dx / L) * r, cy + (dy / L) * r, cz + (dz / L) * r)
            }
        }
        for (let i = 0; i < m - 1; i++) {
            for (let j = 0; j < m - 1; j++) {
                const a = base + i * m + j
                idx.push(a, a + m, a + m + 1, a, a + m + 1, a + 1)
            }
        }
    }
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) }
}

// three's CylinderGeometry: side wall plus two fan caps, Y up.
function cylinder(radius: number, height: number, segs: number): Mesh {
    const pos: number[] = []
    const nor: number[] = []
    const idx: number[] = []
    const h = height / 2

    for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2
        const sx = Math.sin(a), sz = Math.cos(a)
        pos.push(sx * radius, h, sz * radius)
        nor.push(sx, 0, sz)
        pos.push(sx * radius, -h, sz * radius)
        nor.push(sx, 0, sz)
    }
    for (let i = 0; i < segs; i++) {
        const a = i * 2
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2)
    }

    for (const sign of [1, -1]) {
        const base = pos.length / 3
        pos.push(0, sign * h, 0)
        nor.push(0, sign, 0)
        for (let i = 0; i <= segs; i++) {
            const a = (i / segs) * Math.PI * 2
            pos.push(Math.sin(a) * radius, sign * h, Math.cos(a) * radius)
            nor.push(0, sign, 0)
        }
        for (let i = 0; i < segs; i++) {
            if (sign > 0) idx.push(base, base + 1 + i, base + 2 + i)
            else idx.push(base, base + 2 + i, base + 1 + i)
        }
    }
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) }
}

// three's TorusGeometry: ring in the XY plane, tube around Z.
function torus(ring: number, tube: number, tubular: number, radial: number): Mesh {
    const pos: number[] = []
    const nor: number[] = []
    const idx: number[] = []
    for (let j = 0; j <= radial; j++) {
        for (let i = 0; i <= tubular; i++) {
            const u = (i / tubular) * Math.PI * 2
            const v = (j / radial) * Math.PI * 2
            pos.push(
                (ring + tube * Math.cos(v)) * Math.cos(u),
                (ring + tube * Math.cos(v)) * Math.sin(u),
                tube * Math.sin(v)
            )
            nor.push(Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v))
        }
    }
    for (let j = 1; j <= radial; j++) {
        for (let i = 1; i <= tubular; i++) {
            const a = (tubular + 1) * j + i - 1
            const b = (tubular + 1) * (j - 1) + i - 1
            const c = (tubular + 1) * (j - 1) + i
            const d = (tubular + 1) * j + i
            idx.push(a, b, d, b, c, d)
        }
    }
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) }
}

// three's IcosahedronGeometry at detail 0: 20 flat-shaded faces, so the normal
// is the face's own — which is what computeVertexNormals gives a non-indexed
// polyhedron.
function icosahedron(radius: number): Mesh {
    const t = (1 + Math.sqrt(5)) / 2
    const v = [
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ].map((p) => {
        const L = Math.hypot(p[0], p[1], p[2])
        return [(p[0] / L) * radius, (p[1] / L) * radius, (p[2] / L) * radius]
    })
    const f = [
        0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
        1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
        3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
        4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
    ]
    const pos: number[] = []
    const nor: number[] = []
    const idx: number[] = []
    for (let i = 0; i < f.length; i += 3) {
        const a = v[f[i]], b = v[f[i + 1]], c = v[f[i + 2]]
        const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
        const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
        const nx = e1[1] * e2[2] - e1[2] * e2[1]
        const ny = e1[2] * e2[0] - e1[0] * e2[2]
        const nz = e1[0] * e2[1] - e1[1] * e2[0]
        const L = Math.hypot(nx, ny, nz) || 1
        // The face's normal comes from its own winding, so an inward-wound
        // entry in the table would be culled AND shaded backwards. On a convex
        // hull centred at the origin, `normal . centroid > 0` settles it.
        const dot = nx * (a[0] + b[0] + c[0]) + ny * (a[1] + b[1] + c[1]) + nz * (a[2] + b[2] + c[2])
        const flip = dot < 0 ? -1 : 1
        const tri = flip > 0 ? [a, b, c] : [a, c, b]
        for (const p of tri) {
            pos.push(p[0], p[1], p[2])
            nor.push((nx / L) * flip, (ny / L) * flip, (nz / L) * flip)
        }
        idx.push(i, i + 1, i + 2)
    }
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) }
}

type ShapeKind = "box" | "cylinder" | "torus" | "icosahedron"

function buildShape(kind: ShapeKind): Mesh {
    switch (kind) {
        case "cylinder": return cylinder(CYL_RADIUS, CYL_HEIGHT, CYL_SEGS)
        case "torus": return torus(TORUS_RING, TORUS_TUBE, TORUS_TUBULAR, TORUS_RADIAL)
        case "icosahedron": return icosahedron(ICO_RADIUS)
        default: return roundedBox(CORNER_R, CORNER_SEGS)
    }
}

/* -------------------------------------------------------------------- props */

interface FieldProps {
    falloff: number
    ripple: number
}
interface CursorProps {
    reach: number
    lift: number
    grow: number
}
interface RotationProps {
    amount: number
    twist: number
}
interface Props {
    background: string
    baseColor: string
    shape: ShapeKind
    density: number
    gap: number
    speed: number
    distance: number
    field: Partial<FieldProps>
    cursor: Partial<CursorProps>
    rotation: Partial<RotationProps>
    style?: React.CSSProperties
}

// Spread-merged over a typed literal, never a hand-written ?? chain: a group
// left unset arrives undefined, and one missed key silently pins a dial forever.
const FIELD_DEFAULTS: FieldProps = { falloff: 150, ripple: 100 }
const CURSOR_DEFAULTS: CursorProps = { reach: 50, lift: -200, grow: 0 }
const ROTATION_DEFAULTS: RotationProps = { amount: 0, twist: 100 }

/* ---------------------------------------------------------------- component */

function __BaseImpl_IsoCubeTrail(props: Partial<Props>) {
    const {
        background = "#000000",
        baseColor = "#00FFBF",
        shape = "box",
        density = 83,
        gap = 53,
        speed = 50,
        distance = 4,
        field,
        cursor,
        rotation,
        style,
    } = props

    const f: FieldProps = { ...FIELD_DEFAULTS, ...(field || {}) }
    const cu: CursorProps = { ...CURSOR_DEFAULTS, ...(cursor || {}) }
    const ro: RotationProps = { ...ROTATION_DEFAULTS, ...(rotation || {}) }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Every live input the loop reads (rule 6): touching one must never tear
    // the context down and recompile shaders.
    const live = useRef({
        base: [0, 0, 1] as number[],
        weights: [1, 1, 1] as number[],
        shape: shape as ShapeKind,
        density,
        gap,
        speed,
        distance,
        f,
        cu,
        ro,
    })

    {
        const lin = parseColor(baseColor).map(srgbToLinear)
        const total = lin[0] + lin[1] + lin[2]
        // The source's weight derivation: share of the total, halved, inverted.
        // A black base makes `total` zero and every share Infinity there; unit
        // weights keep the ramp finite and the diffuse is zero anyway.
        live.current.weights =
            total > 1e-6 ? lin.map((c) => 1 - 0.5 * (c / total)) : [1, 1, 1]
        live.current.base = lin
        live.current.shape = shape
        live.current.density = density
        live.current.gap = gap
        live.current.speed = speed
        live.current.distance = distance
        live.current.f = f
        live.current.cu = cu
        live.current.ro = ro
    }

    useEffect(() => {
        const canvas = canvasRef.current
        const host = hostRef.current
        if (!canvas || !host) return

        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: true,
            premultipliedAlpha: true,
            preserveDrawingBuffer: true,
        })
        if (!gl) {
            console.warn("IsoCubeTrail: WebGL2 unavailable")
            return
        }

        /* ---- programs */
        const progShadow = link(gl, SHADOW_VERT, SHADOW_FRAG)
        const progScene = link(gl, SCENE_VERT, SCENE_FRAG)
        if (!progShadow || !progScene) return
        const uShadowP = uniforms(gl, progShadow)
        const uSceneP = uniforms(gl, progScene)

        /* ---- geometry buffers, rebuilt on Shape only */
        const posBuf = gl.createBuffer()!
        const norBuf = gl.createBuffer()!
        const idxBuf = gl.createBuffer()!
        const offBuf = gl.createBuffer()!

        const vao = gl.createVertexArray()!
        gl.bindVertexArray(vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, norBuf)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, offBuf)
        gl.enableVertexAttribArray(2)
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0)
        gl.vertexAttribDivisor(2, 1)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)
        gl.bindVertexArray(null)

        let shapeKind: ShapeKind | null = null
        let indexCount = 0

        function buildGeometry(kind: ShapeKind) {
            const mesh = buildShape(kind)
            gl!.bindBuffer(gl!.ARRAY_BUFFER, posBuf)
            gl!.bufferData(gl!.ARRAY_BUFFER, mesh.pos, gl!.STATIC_DRAW)
            gl!.bindBuffer(gl!.ARRAY_BUFFER, norBuf)
            gl!.bufferData(gl!.ARRAY_BUFFER, mesh.nor, gl!.STATIC_DRAW)
            gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, idxBuf)
            gl!.bufferData(gl!.ELEMENT_ARRAY_BUFFER, mesh.idx, gl!.STATIC_DRAW)
            indexCount = mesh.idx.length
            shapeKind = kind
        }

        let gridCols = -1
        let gridCell = -1
        let instances = 0

        // The source's placement, x * size - gridSize/2 + size/2: centred, and
        // with an odd column count one row lands on exactly x = 0, as its own
        // 55 does.
        function buildGrid(cols: number, cell: number) {
            const half = (cols * cell) / 2
            const off = new Float32Array(cols * cols * 2)
            for (let i = 0; i < cols; i++) {
                const x = i * cell - half + cell / 2
                for (let j = 0; j < cols; j++) {
                    const k = (i * cols + j) * 2
                    off[k] = x
                    off[k + 1] = j * cell - half + cell / 2
                }
            }
            gl!.bindBuffer(gl!.ARRAY_BUFFER, offBuf)
            gl!.bufferData(gl!.ARRAY_BUFFER, off, gl!.STATIC_DRAW)
            instances = cols * cols
            gridCols = cols
            gridCell = cell
        }

        /* ---- shadow target */
        const shadowTex = gl.createTexture()!
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, shadowTex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SHADOW_SIZE, SHADOW_SIZE, 0,
            gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null)
        // LINEAR + COMPARE_REF_TO_TEXTURE is what makes each tap a hardware-
        // lerped comparison, so a 3x3 reads like three's PCFSoft.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL)

        const shadowFbo = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTex, 0)
        // No colour attachment at all: say so, or the default draw buffer names
        // COLOR_ATTACHMENT0 and the FBO reads as incomplete on some drivers.
        gl.drawBuffers([gl.NONE])
        gl.readBuffer(gl.NONE)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        /* ---- pointer state, all in ground-plane world coordinates */
        let mouseX = 0
        let mouseZ = 0
        let pos0X = 0, pos0Z = 0
        let pos1X = 0, pos1Z = 0
        let velX = 0, velZ = 0
        let hovering = false
        // Dent strength, faded 0..1 on hover in/out. Kept SEPARATE from the
        // pos0/pos1 trail so leaving never has to park that trail at a far-off
        // point — doing that let its velocity integrator wind up huge while
        // the pointer was away, which then took seconds to unwind on return
        // and read as "hover stopped working" after a leave/re-enter.
        let presence = 0

        // Camera basis, written by the frame loop, read by the pointer handler.
        const axX = [1, 0, 0]
        const axY = [0, 1, 0]
        const axZ = [0, 0, 1]
        let halfW = 6
        let halfH = 4
        let hitHalf = HIT_HALF

        const onMove = (e: PointerEvent) => {
            hovering = true
            // A ratio of client coordinates: both sides carry the canvas zoom,
            // so it divides out. Never an absolute px read off the rect.
            const r = host!.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            const ndcX = ((e.clientX - r.left) / r.width) * 2 - 1
            const ndcY = -((e.clientY - r.top) / r.height) * 2 + 1

            // Orthographic: the ray direction is the same everywhere, only the
            // origin slides across the image plane.
            const ox = EYE[0] + ndcX * halfW * axX[0] + ndcY * halfH * axY[0]
            const oy = EYE[1] + ndcX * halfW * axX[1] + ndcY * halfH * axY[1]
            const oz = EYE[2] + ndcX * halfW * axX[2] + ndcY * halfH * axY[2]
            const dy = -axZ[1]
            if (Math.abs(dy) < 1e-6) return
            const t = -oy / dy
            if (t <= 0) return
            const hx = ox + t * -axZ[0]
            const hz = oz + t * -axZ[2]
            // The source's 20x20 hit plane: a miss leaves the dent parked.
            // Scaled with the framing, or a zoomed-out instance would freeze
            // the dent well inside its own frame.
            if (Math.abs(hx) > hitHalf || Math.abs(hz) > hitHalf) return
            mouseX = hx
            mouseZ = hz
        }
        const onLeave = () => {
            hovering = false
        }
        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerleave", onLeave)

        /* ---- frame */
        const viewM = new Float32Array(16)
        const projM = new Float32Array(16)
        const vpM = new Float32Array(16)
        const lviewM = new Float32Array(16)
        const lprojM = new Float32Array(16)
        const lvpM = new Float32Array(16)

        const keyLen = Math.hypot(KEY_DIR[0], KEY_DIR[1], KEY_DIR[2])
        const keyN = KEY_DIR.map((v) => v / keyLen)
        const fillLen = Math.hypot(FILL_DIR[0], FILL_DIR[1], FILL_DIR[2])
        const fillN = FILL_DIR.map((v) => v / fillLen)

        // Phases accumulate wrapped to 2pi instead of feeding a forever-growing
        // seconds count into a float32 uniform, and a Speed edit therefore
        // changes the rate without jumping the pattern.
        let bobPhase = 0
        let rotPhase = 0
        let introT = 0

        let raf = 0
        let prev = performance.now()

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min(0.05, Math.max(0, (now - prev) / 1000))
            prev = now

            const L = live.current
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = Math.max(1, Math.round(host!.clientWidth * dpr))
            const ch = Math.max(1, Math.round(host!.clientHeight * dpr))
            if (canvas!.width !== cw || canvas!.height !== ch) {
                canvas!.width = cw
                canvas!.height = ch
            }

            if (L.shape !== shapeKind) buildGeometry(L.shape)

            /* -- camera: the source's ratio/ratioW swap, so the SHORT edge
                  always spans 2 x Distance world units. */
            const aspect = cw / ch
            let rw = aspect
            let rh = 1 / aspect
            if (rw > rh) rh = 1
            else rw = 1
            halfW = L.distance * rw
            halfH = L.distance * rh

            lookAtOrigin(EYE[0], EYE[1], EYE[2], 0, 1, 0, viewM)
            axX[0] = viewM[0]; axX[1] = viewM[4]; axX[2] = viewM[8]
            axY[0] = viewM[1]; axY[1] = viewM[5]; axY[2] = viewM[9]
            axZ[0] = viewM[2]; axZ[1] = viewM[6]; axZ[2] = viewM[10]
            orthoBox(halfW, halfH, NEAR, FAR, projM)
            mul(projM, viewM, vpM)

            /* -- grid fitted to that framing. Density sets the CELL, the frame
                  sets how many of them; at the defaults this lands on exactly
                  the source's 55 x 55 of 0.5. cellMin is the closed form of
                  "coarsen until cols fits COLS_MAX": cols is
                  2 * (need + MARGIN * cell) / cell, which is COLS_MAX when
                  cell = 2 * need / (COLS_MAX - 2 * MARGIN). */
            const n = Math.max(8, Math.min(140, Math.round(L.density)))
            const needBase = FIT_U * halfW + FIT_V * halfH
            const cellMin = (2 * needBase) / (COLS_MAX - 2 * MARGIN_CELLS)
            const cell = Math.max(FIELD / n, cellMin)
            const extent = Math.max(FIELD / 2, needBase + MARGIN_CELLS * cell)
            const cols = Math.min(COLS_MAX, Math.max(8, Math.ceil((2 * extent) / cell)))
            if (cols !== gridCols || cell !== gridCell) buildGrid(cols, cell)

            const side = cell * Math.max(0.05, 1 - L.gap / 100)
            const rate = L.speed / 50 // 50 is the rate the source shipped at

            /* -- shadow camera and hit plane, both a uniform scale of the
                  source's. The light is DIRECTIONAL, so sliding it along its
                  own axis changes no shading — only what the depth range
                  brackets. fit == 1 reproduces its +-10 box, 0.5..40 range and
                  20x20 hit plane exactly. */
            const fit = Math.max(1, needBase / FIT_REF)
            const lightHalf = SHADOW_HALF * fit
            hitHalf = HIT_HALF * fit
            const ld = keyLen * fit
            lookAtOrigin(keyN[0] * ld, keyN[1] * ld, keyN[2] * ld, 0, 1, 0, lviewM)
            orthoBox(lightHalf, lightHalf, SHADOW_NEAR * fit, SHADOW_FAR * fit, lprojM)
            mul(lprojM, lviewM, lvpM)

            bobPhase = (bobPhase + 2 * rate * dt) % (Math.PI * 2)
            rotPhase = (rotPhase + rate * dt) % (Math.PI * 2)

            /* -- intro. The source stops uAnimate at 1, which is short of the
                  window of any cube past radius 11.375 — those simply never
                  finish scaling up. It never shows, because its own framing
                  cannot see that far; a wider frame or a bigger Distance makes
                  a ring of half-size floating cubes, which is what the fitted
                  grid above would otherwise expose. Same RATE (1 per 3s), so
                  every cube's window opens and closes on the source's schedule;
                  it just runs on until the last one is done. */
            const rMax = Math.SQRT2 * ((cols * cell) / 2 - cell / 2)
            const animMax = 0.08 * rMax + 0.09
            introT = Math.min(INTRO_SECONDS * animMax, introT + dt)
            const animate = introT / INTRO_SECONDS

            /* -- the two trail points, dt-corrected */
            const kPos = 1 - Math.exp(-POS_K * dt)
            pos0X += (mouseX - pos0X) * kPos
            pos0Z += (mouseZ - pos0Z) * kPos
            const kVel = 1 - Math.exp(-VEL_K * dt)
            velX += ((pos0X - pos1X) * VEL_GAIN - velX) * kVel
            velZ += ((pos0Z - pos1Z) * VEL_GAIN - velZ) * kVel
            pos1X += velX * dt
            pos1Z += velZ * dt

            const kPresence = 1 - Math.exp(-PRESENCE_K * dt)
            presence += ((hovering ? 1 : 0) - presence) * kPresence

            /* -- the pointer field's two smoothstep edges */
            const outer = Math.max(0.05, (REACH_REF * L.cu.reach) / 50)
            const inner = outer * REACH_INNER_RATIO

            /* -- values shared by both vertex passes */
            const setSolve = (u: Record<string, WebGLUniformLocation | null>) => {
                gl!.uniform1f(u.uSide!, side)
                gl!.uniform2f(u.uPos0!, pos0X, pos0Z)
                gl!.uniform2f(u.uPos1!, pos1X, pos1Z)
                gl!.uniform1f(u.uInner!, inner)
                gl!.uniform1f(u.uOuter!, outer)
                gl!.uniform1f(u.uGrow!, (L.cu.grow / 100) * presence)
                gl!.uniform1f(u.uLift!, (L.cu.lift / 100) * cell * presence)
                gl!.uniform1f(u.uBob!, BOB_CELLS * cell)
                gl!.uniform1f(u.uIntroLift!, INTRO_LIFT_CELLS * cell)
                gl!.uniform1f(u.uRotAmount!, L.ro.amount / 100)
                gl!.uniform1f(u.uRotPhase!, rotPhase)
                gl!.uniform1f(u.uTwist!, L.ro.twist / 100)
                gl!.uniform1f(u.uBobPhase!, bobPhase)
                gl!.uniform1f(u.uFreq!, L.f.ripple / 100)
                gl!.uniform1f(u.uAnimate!, animate)
            }

            /* -- PASS A: shadow depth from the key light */
            // Unbind it first: rendering into a texture still bound to a
            // sampler is what Chrome reports as a framebuffer feedback loop,
            // even when the program does not sample it.
            gl!.activeTexture(gl!.TEXTURE0)
            gl!.bindTexture(gl!.TEXTURE_2D, null)
            gl!.enable(gl!.DEPTH_TEST)
            gl!.enable(gl!.CULL_FACE)
            gl!.cullFace(gl!.BACK)
            gl!.bindFramebuffer(gl!.FRAMEBUFFER, shadowFbo)
            gl!.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE)
            gl!.clear(gl!.DEPTH_BUFFER_BIT)
            gl!.useProgram(progShadow)
            gl!.bindVertexArray(vao)
            setSolve(uShadowP)
            gl!.uniformMatrix4fv(uShadowP.uLightViewProj!, false, lvpM)
            gl!.drawElementsInstanced(gl!.TRIANGLES, indexCount, gl!.UNSIGNED_SHORT, 0, instances)

            /* -- PASS B: the lit field, straight to the MSAA back buffer */
            gl!.bindFramebuffer(gl!.FRAMEBUFFER, null)
            gl!.viewport(0, 0, cw, ch)
            gl!.clearColor(0, 0, 0, 0)
            gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT)
            gl!.useProgram(progScene)
            setSolve(uSceneP)
            gl!.activeTexture(gl!.TEXTURE0)
            gl!.bindTexture(gl!.TEXTURE_2D, shadowTex)
            gl!.uniform1i(uSceneP.uShadowMap!, 0)
            gl!.uniform1f(uSceneP.uShadowTexel!, 1 / SHADOW_SIZE)
            gl!.uniform1f(uSceneP.uNormalOffset!,
                (SHADOW_NORMAL_OFFSET * 2 * lightHalf) / SHADOW_SIZE)
            gl!.uniform3f(uSceneP.uEye!, EYE[0], EYE[1], EYE[2])
            gl!.uniform3f(uSceneP.uKeyDir!, keyN[0], keyN[1], keyN[2])
            gl!.uniform3f(uSceneP.uFillDir!, fillN[0], fillN[1], fillN[2])
            gl!.uniform3f(uSceneP.uBase!, L.base[0], L.base[1], L.base[2])
            gl!.uniform3f(uSceneP.uWeights!, L.weights[0], L.weights[1], L.weights[2])
            gl!.uniform1f(uSceneP.uDegrade!, L.f.falloff / 100)
            gl!.uniformMatrix4fv(uSceneP.uViewProj!, false, vpM)
            gl!.uniformMatrix4fv(uSceneP.uLightViewProj!, false, lvpM)
            gl!.drawElementsInstanced(gl!.TRIANGLES, indexCount, gl!.UNSIGNED_SHORT, 0, instances)
        }

        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerleave", onLeave)
            // No loseContext(): getContext hands back the SAME context on the
            // next StrictMode mount, and a force-lost one renders black.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                overflow: "hidden",
                minWidth: 1200,
                minHeight: 800,
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
  "background": "#000000",
  "baseColor": "#00FFBF",
  "shape": "box",
  "density": 83,
  "gap": 53,
  "speed": 50,
  "distance": 4,
  "field": {
    "ripple": 100,
    "falloff": 150
  },
  "cursor": {
    "grow": 0,
    "lift": -200,
    "reach": 50
  },
  "rotation": {
    "twist": 100,
    "amount": 0
  }
};

export default function IsoCubeTrail(props: Record<string, unknown>) {
  return <__BaseImpl_IsoCubeTrail {...(__presetProps as Record<string, unknown>)} {...props} />;
}
