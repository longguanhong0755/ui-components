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
 * The hover and grab gates' settle. The scene shipped with exponential
 * approaches at 6/sec (hover) and 8/sec (grab) inside the rAF loop — ~0.5s and
 * ~0.38s to land. Both now run on one Transition, defaulted to the hover
 * timing: they belong to the same gesture on the same body, and settling them
 * on two different curves would read as two effects fighting.
 */
const DEFAULT_TRANSITION: Motion = {
    type: "tween",
    duration: 0.5,
    // easeOut, as the cubic-bezier the tuple type needs.
    ease: [0, 0, 0.58, 1],
}

/**
 * IRIDESCENT DROP — thin-film soap blob for Framer.
 *
 * ARCHITECTURE NOTE, up front: this is the one component in 3d/ that is NOT a
 * point cloud. The reference is a continuous shaded surface with sharp
 * speculars and a visible interior; no arrangement of sprites produces that.
 * So it is a RAYMARCHED SDF in the fragment shader — rule 6's context recipe
 * (one GL context, live inputs in refs, raw rAF, never loseContext) applies
 * verbatim, but rule 8's "all the maths in the vertex shader" does not.
 *
 * The geometry is a sphere displaced by a sum of sine products, not by fbm.
 * Noise is the obvious choice and the wrong one here: the marcher evaluates the
 * field tens of times per pixel, and three octaves of value noise at that rate
 * is unaffordable, while the reference lobes are broad and smooth enough that
 * two sine triples reproduce them. Sines are also analytically differentiable,
 * which is what makes the step bound below provable rather than hopeful.
 *
 * DISPLACING AN SDF BREAKS ITS DISTANCE BOUND. length(p) - R is a true
 * distance; length(p) - R - A*L(p) is not, and marching it at full step punches
 * holes through the surface at grazing angles. The Lipschitz constant is
 * bounded exactly here — for sin(a.x)sin(b.y)sin(c.z) the gradient magnitude
 * cannot exceed |(a,b,c)| — so the CPU computes
 *
 *     stepK = 1 / (1 + A*S*K + cursorGradient)
 *
 * and every march step is scaled by it. That bound is asserted numerically
 * against sampled gradients, not assumed.
 *
 * THE SHEEN IS INTERFERENCE, not a gradient. Film thickness comes from a
 * domain-warped fbm advecting over the surface (evaluated only at hits, where
 * it is affordable), the optical path difference folds in the refracted view
 * angle, and the colour is the cosine spectrum of that path difference. That is
 * why the palette cycles amber -> magenta -> violet -> cyan instead of lerping,
 * and why the rim desaturates while the middle stays saturated.
 *
 * TWO MARCHES. The reference shows an interior contour offset from the
 * silhouette — the far film seen through the near one. So the front hit is
 * shaded, the ray continues to the back surface, and that second film is added
 * back through the Fresnel transmission. Inner Film dials it to zero.
 *
 * MOTION is a free tumble on two axes, so unlike the brain there is no upright
 * to protect: drag steers BOTH axes. Auto-tumble gates out while held and the
 * release hands off to velocity with exponential decay. One `Speed` sets every
 * rate in the scene (morph and tumble, at their shipped ratio); `Direction`
 * carries the tumble's sign.
 */

/* ==================================================================== GL CORE
 * Everything between the GL CORE markers is annotation-free JS on purpose: the
 * verification harness slices this range straight out of the file and evals it,
 * so the shaders and the field maths under test are the ones on disk. The JS
 * mirror of the SDF lives here too, right beside the GLSL, and the harness
 * checks the two against each other pixel-for-value.
 * ------------------------------------------------------------ GL CORE START */

const BLOB_R = 620
const FOV = 34
// Lower than the point-cloud components on purpose: every pixel inside the
// bounding sphere runs a march, so cost scales with the square of this.
const DPR_CAP = 1.25
const TAU = Math.PI * 2

// Palette stops. Five is the cap: the ramp is walked by a fixed-bound loop in
// the fragment shader (WebGL1 forbids indexing a uniform array with a
// non-constant expression), so the bound is compiled in.
const MAX_COLORS = 5
const DEFAULT_COLORS = ["#F2C98A", "#E3A8E0"]
// Accent Mix was a dial; cut and frozen at its shipped default (50%). The panel
// row is gone, the render path is unchanged — it is compiled into the shader.
const ACCENT_MIX = 0.5

// Lump field frequencies. Two sine triples: the first sets the broad lobes, the
// second breaks their symmetry so the silhouette never reads as a lattice.
const LA = [2.3, 2.9, 2.1]
const LB = [3.7, 3.1, 4.3]
const LW1 = 0.62
const LW2 = 0.38

// Exact bound on |grad L| for the unit-scale field. Each factor is a sine, so
// the partial in x cannot exceed the x frequency, and the gradient magnitude of
// a product of sines is bounded by the norm of the frequency vector.
const LUMP_K =
    LW1 * Math.sqrt(LA[0] * LA[0] + LA[1] * LA[1] + LA[2] * LA[2]) +
    LW2 * Math.sqrt(LB[0] * LB[0] + LB[1] * LB[1] + LB[2] * LB[2])

// max |grad| of exp(-r^2/s^2) is sqrt(2/e)/s
const GAUSS_K = Math.sqrt(2 / Math.E)

const VERT = `
precision highp float;
attribute vec2 aPos;
void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

#define TAU 6.2831853
#define IOR 1.33
// A soap film reflects only a few percent of what hits it; the rest goes
// through. Using the interference colour as a full albedo is what turns the
// reference's pastel sheen into neon. The tint rides ON white.
#define FILM_SAT 0.78
#define MAX_STEPS 104
#define MAX_BACK 40

uniform vec2  uRes;
uniform float uFocal;
uniform float uDist;
uniform float uPitchCam;
uniform float uRoll;
uniform mat3  uRot;        // world -> object, the inverse tumble
uniform vec3  uCenter;     // drift offset, world
uniform float uRadius;
uniform float uLumpAmp;
uniform float uLumpScale;
uniform vec3  uMorph;
uniform float uStepK;      // 1 / Lipschitz bound; see the header note
uniform float uBoundR;
uniform float uFilm;
uniform float uFilmVar;
uniform float uSheenScale;
uniform float uSheenT;
uniform float uInner;
uniform float uColorCount;
uniform vec3  uColors[${MAX_COLORS}];
uniform vec3  uAcc;         // last palette entry; the rim tint
uniform vec4  uCursor;     // world hit xyz + eased hover amount
uniform float uCurR;
uniform float uCurS;
uniform float uHover;
uniform float uDebug;
uniform vec3  uProbe;
uniform float uProbeScale;

/* ------------------------------------------------------------------ field */

float lumpField(vec3 q) {
    float a = sin(q.x * ${LA[0]} + uMorph.x) *
              sin(q.y * ${LA[1]} + uMorph.y) *
              sin(q.z * ${LA[2]} + uMorph.z);
    float b = sin(q.y * ${LB[0]} - uMorph.y) *
              sin(q.z * ${LB[1]} + uMorph.x) *
              sin(q.x * ${LB[2]} - uMorph.z);
    return a * ${LW1} + b * ${LW2};
}

float mapBlob(vec3 p) {
    vec3 r = p - uCenter;
    // The lump field is glued to the BODY, so it is sampled in object space and
    // tumbles with it. The cursor is not: it stays put in world space while the
    // drop turns through it, which is how a poke reads.
    vec3 q = (uRot * r) * (uLumpScale / uRadius);
    float d = length(r) - uRadius - uLumpAmp * lumpField(q);
    vec3 dv = p - uCursor.xyz;
    d -= uCurS * uCursor.w * exp(-dot(dv, dv) / (uCurR * uCurR));
    return d;
}

vec3 calcNormal(vec3 p, float h) {
    vec2 k = vec2(1.0, -1.0);
    return normalize(k.xyy * mapBlob(p + k.xyy * h) +
                     k.yyx * mapBlob(p + k.yyx * h) +
                     k.yxy * mapBlob(p + k.yxy * h) +
                     k.xxx * mapBlob(p + k.xxx * h));
}

/* ------------------------------------------------------- thickness + colour */

float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash13(i);
    float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
    return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
               mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}

float fbm2(vec3 p) {
    return vnoise(p) * 0.667 + vnoise(p * 2.07) * 0.333;
}

// Only ever called at a hit, so the octaves and the warp are affordable here in
// a way they would never be inside the march.
float filmThickness(vec3 pObj) {
    vec3 q = pObj * (uSheenScale / uRadius);
    float w = fbm2(q + vec3(uSheenT * 0.6, -uSheenT * 0.4, uSheenT * 0.25));
    // Warp strength stays under one noise cell. Past that the warped lookup
    // jumps more than a cell between adjacent pixels and the thickness field
    // aliases into per-pixel speckle instead of flowing in bands.
    float f = fbm2(q * 1.55 + (w - 0.5) * 0.9 + vec3(0.0, uSheenT * 0.5, 0.0));
    return uFilm + (f - 0.5) * 2.0 * uFilmVar;
}

// Cosine approximation of the interference spectrum. Not a two-colour lerp —
// the cycling through amber, magenta, violet and cyan IS the physics, and a
// gradient cannot reproduce the order those hues arrive in.
vec3 iridescence(float opd) {
    // The three wavelengths have to be EVENLY spread. At (600, 550, 450) red
    // and green sit 9% apart, stay nearly in phase across the first few orders,
    // and co-vary into yellow-green — magenta becomes unreachable, because
    // magenta needs red high while green is low. Evenly staggered ratios give
    // the whole amber -> magenta -> violet -> cyan run the reference shows.
    return 0.5 + 0.5 * cos(TAU * opd / vec3(680.0, 550.0, 440.0));
}

// Piecewise-linear walk across the palette. WebGL1 forbids uColors[idx] with a
// non-constant idx, so both ends of the segment are fished out by a
// fixed-bound loop. Slots past uColorCount are filled with the last entry on
// the CPU, so the i0 + 1 lookup can never land on a stale colour.
vec3 rampColor(float t) {
    float x = clamp(t, 0.0, 1.0) * max(uColorCount - 1.0, 0.0);
    float i0 = floor(x);
    float f = x - i0;
    vec3 a = uColors[0];
    vec3 b = uColors[0];
    for (int i = 0; i < ${MAX_COLORS}; i++) {
        if (float(i) == i0) a = uColors[i];
        if (float(i) == i0 + 1.0) b = uColors[i];
    }
    return mix(a, b, f);
}

float ggx(vec3 n, vec3 v, vec3 l, float rough) {
    vec3 h = normalize(v + l);
    float a = max(rough * rough, 1e-4);
    float ndh = max(dot(n, h), 0.0);
    float d = ndh * ndh * (a * a - 1.0) + 1.0;
    return (a * a) / (3.14159265 * max(d * d, 1e-6)) * max(dot(n, l), 0.0);
}

const vec3 L1 = vec3(-0.42, 0.72, -0.55);
const vec3 L2 = vec3(0.66, -0.32, 0.68);

vec3 shadeFilm(vec3 pObj, vec3 n, vec3 rd, float hoverG) {
    float cosI = clamp(dot(n, -rd), 0.0, 1.0);
    float sinT2 = (1.0 - cosI * cosI) / (IOR * IOR);
    float cosT = sqrt(max(0.0, 1.0 - sinT2));
    float opd = 2.0 * IOR * filmThickness(pObj) * cosT;

    vec3 film = iridescence(opd);
    // Designer steer: the Colors ramp is driven by the same phase and blended
    // over the spectral result at a fixed 50% (ACCENT_MIX, frozen — it used to
    // be a dial), so the palette recolours the sheen without flattening the way
    // it moves. The ramp is a plain RGB lerp between neighbouring stops, so
    // adjacent stops decide which hues it passes THROUGH: amber to cyan runs
    // straight through pale green and swamps everything. Amber to violet passes
    // through pink, and the cyan comes from the spectral term. Same base
    // wavelength as the red channel, so the ramp stays in step with the
    // spectral cycle instead of beating against it.
    float ph = 0.5 + 0.5 * cos(TAU * opd / 680.0);
    vec3 col = mix(film, rampColor(ph), ${ACCENT_MIX.toFixed(2)});
    col = mix(vec3(1.0), col, FILM_SAT);

    vec3 l1 = normalize(L1);
    vec3 l2 = normalize(L2);
    float k1 = 0.5 + 0.5 * dot(n, l1);
    float k2 = 0.5 + 0.5 * dot(n, l2);
    vec3 lit = col * (0.32 + k1 * 0.62) + uAcc * (k2 * k2) * 0.06;

    float F = 0.06 + 0.94 * pow(1.0 - cosI, 5.0);
    lit += vec3(1.0) * F * 0.42;
    // Speculars are deliberately left to blow out — the reference highlights
    // are clipped white, not shaded.
    lit += vec3(1.0) * ggx(n, -rd, l1, 0.075) * 1.15;
    lit += vec3(1.0) * ggx(n, -rd, l2, 0.34) * 0.22;
    lit *= 1.0 + hoverG * uHover;
    return lit;
}

/* --------------------------------------------------------------- background */

// Only the dither uses this now. The background star specks were cut: the plate
// is the CSS gradient alone, so nothing in the frame parallaxes against the
// drop and uTime is no longer needed by the fragment shader.
float hash21(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
}

/* --------------------------------------------------------------------- main */

void main() {
    // Probe mode: the harness reads back the SDF at a supplied world point so
    // the JS mirror can be checked against this exact GLSL, not against a
    // reimplementation of it.
    if (uDebug > 1.5) {
        float v = clamp(mapBlob(uProbe) / uProbeScale * 0.5 + 0.5, 0.0, 1.0);
        float hi = floor(v * 255.0) / 255.0;
        gl_FragColor = vec4(hi, fract(v * 255.0), 0.0, 1.0);
        return;
    }

    vec2 s = gl_FragCoord.xy - uRes * 0.5;
    float cr = cos(uRoll);
    float sr = sin(uRoll);
    vec2 v2 = vec2(s.x * cr + s.y * sr, -s.x * sr + s.y * cr) / uFocal;
    float cp = cos(uPitchCam);
    float sp = sin(uPitchCam);
    vec3 rd = normalize(vec3(v2.x, v2.y * cp - sp, v2.y * sp + cp));
    vec3 ro = vec3(0.0, uDist * sp, -uDist * cp);

    // Bounding sphere first. Without this every pixel in the frame pays for a
    // march, and the drop covers well under a third of it.
    vec3 oc = ro - uCenter;
    float b = dot(oc, rd);
    float c0 = dot(oc, oc) - uBoundR * uBoundR;
    float disc = b * b - c0;

    vec3 col = vec3(0.0);
    float alpha = 0.0;
    float steps = 0.0;

    if (disc > 0.0) {
        float sq = sqrt(disc);
        float t = max(-b - sq, 0.0);
        float tEnd = -b + sq;
        float hit = 0.0;
        float minPix = 1e9;
        float tBest = t;

        for (int i = 0; i < MAX_STEPS; i++) {
            if (t > tEnd) break;
            vec3 p = ro + rd * t;
            float d = mapBlob(p);
            // world size of one pixel at this depth, for the silhouette AA
            float px = t / uFocal;
            float pd = d / max(px, 1e-6);
            if (pd < minPix) { minPix = pd; tBest = t; }
            if (d < px * 0.35) { hit = 1.0; break; }
            // Floor the step at a quarter pixel. A grazing ray runs almost
            // parallel to the surface with d barely shrinking, and without a
            // floor it creeps until the step budget is gone — which used to
            // fall through to the miss branch and paint a black fringe right
            // on the silhouette. Any overshoot the floor introduces is
            // sub-pixel by construction.
            t += max(d * uStepK, px * 0.25);
            steps += 1.0;
        }

        // A near miss is still shaded, at its closest approach, and only the
        // alpha feathers. Dropping it to black is what makes a burned ray
        // visible; this way an exhausted grazing ray just matches its
        // neighbours and fades out.
        float edge = smoothstep(1.1, -0.1, minPix);
        if (hit > 0.5 || edge > 0.002) {
            if (hit < 0.5) t = tBest;
            vec3 p = ro + rd * t;
            vec3 n = calcNormal(p, max(t / uFocal, 0.35));
            vec3 pObj = uRot * (p - uCenter);
            vec3 dv = p - uCursor.xyz;
            float g = exp(-dot(dv, dv) / (uCurR * uCurR)) * uCursor.w;
            // g^8: a radius that reads as a gentle swell floods the frame when
            // it is reused for brightness.
            float g2 = g * g; g2 = g2 * g2; g2 = g2 * g2;

            col = shadeFilm(pObj, n, rd, g2);
            float cosI = clamp(dot(n, -rd), 0.0, 1.0);
            float F = 0.06 + 0.94 * pow(1.0 - cosI, 5.0);

            // Second march: exit the body, shade the far film, add it back
            // through the transmission. This is the interior contour.
            if (uInner > 0.001) {
                // Marched BACKWARDS from the far bound, not forwards from the
                // front hit. Starting just inside the body puts the march where
                // the distance is ~0, so a distance-based step barely advances,
                // the budget runs out, and whether the back surface is found at
                // all comes down to per-pixel noise — which renders as speckle
                // across the whole middle of the drop, not as a missing
                // feature. From outside the far side the distance is large and
                // the march converges the same way the front one does.
                float tb = tEnd;
                float found = 0.0;
                for (int j = 0; j < MAX_BACK; j++) {
                    if (tb <= t) break;
                    float db = mapBlob(ro + rd * tb);
                    float pxb = tb / uFocal;
                    if (db < pxb * 0.35) { found = 1.0; break; }
                    tb -= max(db * uStepK, pxb * 0.25);
                }
                if (found > 0.5) {
                    vec3 pb = ro + rd * tb;
                    vec3 nb = -calcNormal(pb, max(tb / uFocal, 0.35));
                    vec3 pbObj = uRot * (pb - uCenter);
                    // The far film is seen THROUGH the near one, so it comes
                    // back heavily attenuated. At anything near full weight it
                    // simply doubles the body's brightness and washes the sheen
                    // out to white.
                    col += shadeFilm(pbObj, nb, rd, 0.0) * uInner * (1.0 - F) * 0.32;
                }
            }
            alpha = hit > 0.5 ? 1.0 : edge;
        }
    }

    if (uDebug > 0.5) {
        // Convergence probe: red wherever the march burned every step without
        // landing. A screenshot cannot show this; a hole in the surface can
        // look exactly like a dark patch of film.
        float burned = step(float(MAX_STEPS) - 1.5, steps);
        gl_FragColor = vec4(burned, alpha, 0.0, 1.0);
        return;
    }

    // Dither before the 8-bit write. The reference plate has visible ring
    // banding across its background gradient; that is an artefact of the
    // capture, not something to reproduce.
    float dth = (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
    col += dth;

    gl_FragColor = vec4(col * alpha, alpha);
}
`

/* ---------------------------------------------- JS mirror of the field maths */

// Mirrors lumpField/mapBlob above. The harness renders the GLSL in probe mode
// and compares it against this, so the Lipschitz proof below is proved about
// the shader that actually runs.
function lumpFieldJS(qx: any, qy: any, qz: any, m: any) {
    const a =
        Math.sin(qx * LA[0] + m[0]) *
        Math.sin(qy * LA[1] + m[1]) *
        Math.sin(qz * LA[2] + m[2])
    const bb =
        Math.sin(qy * LB[0] - m[1]) *
        Math.sin(qz * LB[1] + m[0]) *
        Math.sin(qx * LB[2] - m[2])
    return a * LW1 + bb * LW2
}

function mapBlobJS(p: any, S: any) {
    const rx = p[0] - S.center[0]
    const ry = p[1] - S.center[1]
    const rz = p[2] - S.center[2]
    const R = S.rot
    const k = S.lumpScale / S.radius
    const qx = (R[0] * rx + R[1] * ry + R[2] * rz) * k
    const qy = (R[3] * rx + R[4] * ry + R[5] * rz) * k
    const qz = (R[6] * rx + R[7] * ry + R[8] * rz) * k
    let d =
        Math.sqrt(rx * rx + ry * ry + rz * rz) -
        S.radius -
        S.lumpAmp * lumpFieldJS(qx, qy, qz, S.morph)
    const dx = p[0] - S.cursor[0]
    const dy = p[1] - S.cursor[1]
    const dz = p[2] - S.cursor[2]
    d -=
        S.curS *
        S.curAmt *
        Math.exp(-(dx * dx + dy * dy + dz * dz) / (S.curR * S.curR))
    return d
}

/**
 * The whole reason the march is safe. |grad d| <= 1 + |grad displacement|, and
 * every displacement term here has a closed-form gradient bound, so the step
 * multiplier is derived rather than tuned. Overshooting this is what tears
 * holes in a displaced SDF at grazing angles.
 */
function lipschitz(S: any) {
    const lump = (S.lumpAmp * S.lumpScale * LUMP_K) / S.radius
    const cur = (Math.abs(S.curS) * S.curAmt * GAUSS_K) / S.curR
    return 1 + lump + cur
}

function boundRadius(S: any) {
    return S.radius + S.lumpAmp + Math.max(0, S.curS) * S.curAmt + 12
}

/* --------------------------------------------------------- camera + helpers */

// Same camera basis as the rest of 3d/: right (1,0,0), up (0,c,s),
// forward (0,-s,c), camera at -dist * forward.
function projectWorld(p: any, cam: any) {
    const c = Math.cos(cam.pitch)
    const s = Math.sin(cam.pitch)
    const vx = p[0]
    const vy = p[1] * c + p[2] * s
    const vz = cam.dist - p[1] * s + p[2] * c
    const cr = Math.cos(cam.roll)
    const sr = Math.sin(cam.roll)
    return {
        x: ((vx * cr - vy * sr) * cam.focal) / vz,
        y: ((vx * sr + vy * cr) * cam.focal) / vz,
        z: vz,
    }
}

/**
 * Screen -> world ray -> bounding sphere. Peels the transforms in reverse:
 * roll is applied last in the shader, so it is undone first. The fourth
 * component flags a true intersection; on a miss the ray's closest approach is
 * pushed out to the sphere so the hover falloff stays continuous across the
 * limb instead of snapping off.
 */
function sphereHit(sx: any, sy: any, cam: any, radius: any, centre: any) {
    const cr = Math.cos(cam.roll)
    const sr = Math.sin(cam.roll)
    const ux = sx * cr + sy * sr
    const uy = -sx * sr + sy * cr
    const dx = ux / cam.focal
    const dy = uy / cam.focal
    const c = Math.cos(cam.pitch)
    const s = Math.sin(cam.pitch)
    let rx = dx
    let ry = dy * c - s
    let rz = dy * s + c
    const rl = Math.hypot(rx, ry, rz)
    rx /= rl; ry /= rl; rz /= rl
    const ox = 0 - centre[0]
    const oy = cam.dist * s - centre[1]
    const oz = -cam.dist * c - centre[2]
    const b = ox * rx + oy * ry + oz * rz
    const cc = ox * ox + oy * oy + oz * oz - radius * radius
    const disc = b * b - cc
    let t
    if (disc >= 0) {
        t = -b - Math.sqrt(disc)
        if (t < 0) t = -b + Math.sqrt(disc)
        if (t < 0) return null
        return [centre[0] + ox + rx * t, centre[1] + oy + ry * t, centre[2] + oz + rz * t, 1]
    }
    t = -b
    if (t < 0) return null
    const px = ox + rx * t
    const py = oy + ry * t
    const pz = oz + rz * t
    const pl = Math.hypot(px, py, pz) || 1
    const k = radius / pl
    return [centre[0] + px * k, centre[1] + py * k, centre[2] + pz * k, 0]
}

// World -> object. Object->world is Ry(yaw) * Rx(pitch); this is its transpose,
// which for an orthonormal rotation is also its inverse.
function tumbleMatrix(yaw: any, pitch: any) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw)
    const cx = Math.cos(pitch), sx = Math.sin(pitch)
    // Ry * Rx, row-major
    const m = [
        cy, sy * sx, sy * cx,
        0, cx, -sx,
        -sy, cy * sx, cy * cx,
    ]
    // transpose
    return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]
}

/**
 * WebGL reads uniformMatrix3fv as COLUMN-major when transpose is false, so
 * handing it a row-major array silently uploads that array's TRANSPOSE. Both
 * are rotations, so the render still looks plausible — it just applies the
 * forward tumble where the JS mirror applies the inverse, and every claim
 * proved about the mirror stops describing the shader. tumbleMatrix returns
 * row-major world->object; this converts it for the upload.
 */
function mat3ColMajor(m: any) {
    return new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]])
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
        h = h.split("").map((ch) => ch + ch).join("")
    }
    h = h.padEnd(6, "0")
    return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
    ]
}

function compileShader(gl: any, type: any, src: any, tag: any) {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("IridescentDrop " + tag + ":", gl.getShaderInfoLog(sh))
    }
    return sh
}

/* -------------------------------------------------------------- GL CORE END */

/* --------------------------------------------------------------------- props */

/* Panel follows rule 8b — 15 leaf dials, hybrid layout, shared ranges.
 *
 * All 22 rows used to sit inside five groups with nothing at the top level.
 * The headline dials are now top level. This scene is a single lit blob, not
 * a point field, so it has no `Density` / `Dot Size`: rule 8b drops what a
 * scene has no geometry for rather than shipping a dial that means nothing.
 *
 * Changed keys, clean break, no fallbacks:
 *   colour.*              -> top level
 *   camera.cameraDistance -> distance   (top level)
 *   motion.morphSpeed     -> speed      (top level, 0..100)
 *   field.*               -> film { thickness, sheen, inner } + shape { radius, lumpiness }
 *   baseColor/accentColor -> colors[]   (top level, up to MAX_COLORS stops)
 *   motion.tumbleSpeed    -> tumbleSpeed (top level, titled `Motion` — a group
 *                            of one row is a disclosure triangle for nothing)
 *
 * Cut and frozen, neutral-first (rule 8b): `camera.tiltStart` (0),
 * `camera.rollStart` (0), `motion.drift` (3 of 25 — near-neutral), `accentMix`
 * (50, compiled into the shader), `glow` (the shipped vignette colour), and the
 * whole Interaction group, which is four dials tuning one gesture that still
 * works exactly as it shipped. `field.lumpScale` and `motion.sheenSpeed`
 * follow the dial they sat beside.
 *
 * SCALE CHANGE — not migratable: `speed` was the raw morph rate (0..60,
 * shipped 6); it is now rule 8b's dial where 50 is that shipped rate.
 *
 * SECOND PASS — one Speed, one Direction:
 *   tumbleSpeed (titled `Motion`, signed °/s)  -> CUT. The one `Speed` now
 *     drives BOTH the morph and the tumble at their shipped ratio, and the sign
 *     that dial used to carry moved to `direction` (Clockwise / Counter).
 *     Two rates on one continuous motion was two dials describing the same
 *     thing (rule 8b: a second dial that only scales a first one).
 *   background star specks -> CUT from the shader. The plate is the CSS
 *     gradient alone; `uTime` went with them, since nothing else read it.
 *
 * THIRD PASS — plainer names, one less group:
 *   distance (1400..6000 world units) -> `Scale` (0..100). A camera pullback in
 *     world units is the machinery, not the thing the designer is setting; what
 *     they see is how big the drop is. 50 is the shipped framing and the dial is
 *     geometric in APPARENT size — every 50 points is a doubling — because
 *     apparent size goes as 1/distance and a linear distance dial crawls at one
 *     end and lurches at the other. NOT MIGRATABLE: the stored number is the
 *     same either way, so a live instance at 2600 now reads as Scale 2600.
 *   shape.radius -> CUT, frozen at the shipped 100%. It and `Scale` were two
 *     dials for one thing: at a fixed field of view, growing the body and
 *     walking the camera in are the same picture (rule 8b, a second dial that
 *     only scales a first one). `Scale` is the one that survives, because it
 *     reframes without touching the lump-to-body ratio.
 *   shape.lumpiness -> top level. It was the only row left in the group, and a
 *     group of one is a disclosure triangle for nothing.
 *   film { thickness, sheen, inner } -> iridescence { hue, detail, transparency }
 *     `Film` named the physics, not the look. Thickness in nanometres is the
 *     honest unit and the wrong control: what moves is the HUE. `Sheen` sized
 *     the swirl pattern, which is `Detail`. `Inner` was how much of the far
 *     surface reads through the near one, which is `Transparency`.
 *     `Hue` is 0..100 anchored so 50 is the shipped 420nm; the shader still
 *     gets nanometres.
 */

interface IridescenceGroup {
    /** 0..100, anchored so 50 is the shipped 420nm film. */
    hue: number
    /** Swirl pattern size, %. Was `film.sheen`. */
    detail: number
    /** How much of the far surface reads through, %. Was `film.inner`. */
    transparency: number
}
/* No motion group and no motion dial: one `Speed` drives every rate in the
 * scene and `Direction` carries the sign the old signed dial held. */

// Ratios that reproduce the shipped look from the dial that now drives each pair.
const VARIATION_PER_THICKNESS = 170 / 420
const TUMBLE_TILT_PER_SPEED = 7 / 10
// Hover glow follows |lift|: the drop brightens where the cursor deforms it,
// and the dent direction (a negative lift) still reads as a dent.
const LIFT_REF = 70
const GLOW_AT_REF = 120

/* Cut controls (rule 8b), frozen at the value the scene shipped with. */
const LUMP_SCALE = 100
const SHEEN_SPEED = 12
const DRIFT = 3
const TILT_START = 0
const ROLL_START = 0
const GLOW = "rgba(196, 118, 62, 0.30)"
const CURSOR_RADIUS = 30
const CURSOR_LIFT = -70
const DRAG_SPEED = 100
const DRAG_INERTIA = 65
/** Body radius, % of BLOB_R. Was `shape.radius`; `Scale` reframes instead. */
const BODY_RADIUS_PCT = 100
/** Morph rate at Speed 50 — the rate the drop shipped at. */
const MORPH_AT_50 = 6
/** Tumble rate at Speed 50, °/s — the rate the drop shipped at. */
const TUMBLE_AT_50 = 10

/* --- Scale: a 0..100 dial standing in for the camera pullback. Apparent size
 * goes as 1/distance, so the dial is geometric — every SCALE_PER_DOUBLE points
 * doubles the drop on screen — and 50 lands exactly on the shipped framing.
 * Linear in world units instead would crawl at the near end and lurch at the
 * far one, which is what "Distance" felt like. */
const DIST_AT_50 = 2600
const SCALE_PER_DOUBLE = 50
function scaleToDistance(scale: number) {
    return DIST_AT_50 / Math.pow(2, (scale - 50) / SCALE_PER_DOUBLE)
}

/* --- Hue: 0..100 in, nanometres out. Two straight segments meeting at the
 * shipped 420nm, so 50 is exactly the film the shader was tuned against and
 * both ends still reach the range it was tuned across. */
const NM_MIN = 150
const NM_MID = 420
const NM_MAX = 1400
function hueToNanometres(hue: number) {
    const h = Math.max(0, Math.min(100, hue))
    return h <= 50
        ? NM_MIN + (h / 50) * (NM_MID - NM_MIN)
        : NM_MID + ((h - 50) / 50) * (NM_MAX - NM_MID)
}

interface IridescentDropProps {
    background?: string
    /** Ramp stops, up to MAX_COLORS. Replaces Base Color / Accent Color. */
    colors?: string[]
    /** 0..100; 50 is the rate the drop shipped at. Drives morph AND tumble. */
    speed?: number
    /** Which way the drop turns. Carries the sign the old signed dial held. */
    direction?: "cw" | "ccw"
    /** 0..100; 50 is the shipped framing, +50 doubles the drop on screen. */
    scale?: number
    /** Lump amplitude, % of the body radius. Was `shape.lumpiness`. */
    lumpiness?: number
    iridescence?: Partial<IridescenceGroup>
    width?: number
    height?: number
    transition?: Motion
    style?: React.CSSProperties
}

/* ----------------------------------------------------------------- component */

function __BaseImpl_IridescentDrop(props: IridescentDropProps) {
    const {
        background = "#000000",
        colors = ["#4300FF","#00FF06"],
        speed = 100,
        direction = "cw",
        scale = 20,
        lumpiness = 25,
        // a group the designer never opened arrives undefined (rule 8)
        iridescence = {"hue":100,"detail":20,"transparency":100},
        transition = {"ease":[0,0,0.58,1],"mass":1,"type":"tween","damping":60,"duration":0.5,"stiffness":800},
        style,
    } = props

    /* The hover and grab gates. MotionValues read by the loop with .get(), so
     * nothing here re-renders; the Transition lives in a ref so changing it can
     * never land in the GL effect's deps and rebuild the context (rule 6). */
    const hoverMV = useRef(motionValue(0)).current
    const grabMV = useRef(motionValue(0)).current
    const transitionRef = useRef(transition)
    transitionRef.current = transition
    const glow = GLOW

    const radius = BODY_RADIUS_PCT
    const lumpScale = LUMP_SCALE

    // Panel names are the designer's; the loop keeps the physical ones.
    const filmThickness = hueToNanometres(iridescence.hue ?? 50)
    const sheenScale = iridescence.detail ?? 70
    const innerFilm = iridescence.transparency ?? 55

    // 50 is the shipped rate, for every motion in the scene. Direction only
    // signs the tumble — the morph is a phase advance with no handedness, so a
    // negative one would just run the same lump sequence backwards.
    const morphSpeed = (speed / 50) * MORPH_AT_50
    const tumbleSpeed =
        (direction === "ccw" ? -1 : 1) * (speed / 50) * TUMBLE_AT_50
    const sheenSpeed = SHEEN_SPEED
    const drift = DRIFT

    const cameraDistance = scaleToDistance(scale)
    const tiltStart = TILT_START
    const rollStart = ROLL_START

    const cursorRadius = CURSOR_RADIUS
    const cursorLift = CURSOR_LIFT
    const dragSpeed = DRAG_SPEED
    const dragInertia = DRAG_INERTIA

    // Each condensed dial expands back into what the loop already reads.
    const thicknessVariation = filmThickness * VARIATION_PER_THICKNESS
    const tumbleTilt = tumbleSpeed * TUMBLE_TILT_PER_SPEED
    // Tilt is static, so the scroll ramp lerps from a value to itself.
    const tiltEnd = tiltStart
    const rollEnd = rollStart
    const hoverGlow = GLOW_AT_REF * Math.min(3, Math.abs(cursorLift) / LIFT_REF)

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Every live input flows through this ref: the GL context is built once and
    // must never be torn down by a control change (rule 6).
    const live = useRef({
        colors,
        radius, lumpiness, lumpScale, filmThickness, thicknessVariation,
        sheenScale, innerFilm,
        tumbleSpeed, tumbleTilt, morphSpeed, sheenSpeed, drift,
        cameraDistance, tiltStart, tiltEnd, rollStart, rollEnd,
        cursorRadius, cursorLift, hoverGlow, dragSpeed, dragInertia,
    })
    live.current = {
        colors,
        radius, lumpiness, lumpScale, filmThickness, thicknessVariation,
        sheenScale, innerFilm,
        tumbleSpeed, tumbleTilt, morphSpeed, sheenSpeed, drift,
        cameraDistance, tiltStart, tiltEnd, rollStart, rollEnd,
        cursorRadius, cursorLift, hoverGlow, dragSpeed, dragInertia,
    }

    // `active` is hover, off until the first real pointermove so the drop is
    // undisturbed on load. `grab` gates the auto-tumble while dragging.
    const pointer = useRef({ x: 0, y: 0, active: 0, target: 0, grab: 0 })
    const drag = useRef({
        on: false, lastX: 0, lastY: 0, tPrev: 0,
        velX: 0, velY: 0, yaw: 0, pitch: 0, id: -1,
    })

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

        const prog = gl.createProgram()!
        gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT, "vert"))
        gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG, "frag"))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.warn("IridescentDrop link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const aPos = gl.getAttribLocation(prog, "aPos")
        const U = (n: string) => gl.getUniformLocation(prog, n)
        const u = {
            res: U("uRes"), focal: U("uFocal"), dist: U("uDist"),
            pitchCam: U("uPitchCam"), roll: U("uRoll"), rot: U("uRot"),
            center: U("uCenter"), radius: U("uRadius"), lumpAmp: U("uLumpAmp"),
            lumpScale: U("uLumpScale"), morph: U("uMorph"), stepK: U("uStepK"),
            boundR: U("uBoundR"), film: U("uFilm"), filmVar: U("uFilmVar"),
            sheenScale: U("uSheenScale"), sheenT: U("uSheenT"),
            inner: U("uInner"), colorCount: U("uColorCount"),
            colors: U("uColors[0]"),
            acc: U("uAcc"), cursor: U("uCursor"), curR: U("uCurR"),
            curS: U("uCurS"), hover: U("uHover"),
            debug: U("uDebug"), probe: U("uProbe"), probeScale: U("uProbeScale"),
        }

        // Scratch for the palette upload — reused every frame, never allocated
        // inside the loop.
        const palBuf = new Float32Array(MAX_COLORS * 3)

        // One oversized triangle, not a quad: no shared edge to crack, three
        // vertices instead of six, and every pixel is covered exactly once.
        const buf = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]),
            gl.STATIC_DRAW
        )
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        // Premultiplied OVER, not additive: the drop is an opaque body sitting
        // on the CSS ember, not a cloud of light adding to it.
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

        /* ---- sizing: measure the ELEMENT. width/height props are not numeric
               in the Framer preview, only on the canvas. ---- */
        let cssW = 0
        let cssH = 0
        let dpr = 1
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

        /* ---- pointer: hover glow + free tumble on both axes ---- */
        let hoverAnim: { stop: () => void } | null = null
        let grabAnim: { stop: () => void } | null = null
        const gateHover = (to: number) => {
            if (pointer.current.target === to) return
            pointer.current.target = to
            hoverAnim?.stop()
            hoverAnim = animate(hoverMV, to, transitionRef.current)
        }
        const gateGrab = (to: number) => {
            grabAnim?.stop()
            grabAnim = animate(grabMV, to, transitionRef.current)
        }
        const onMove = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            pointer.current.x = e.clientX - r.left
            pointer.current.y = e.clientY - r.top
            gateHover(1)
            const d = drag.current
            if (!d.on) return
            const now = performance.now()
            const dt = Math.max(4, now - d.tPrev) / 1000
            d.tPrev = now
            const k = (TAU * live.current.dragSpeed) / 100
            const dY = ((e.clientX - d.lastX) / Math.max(1, cssW)) * k
            // Vertical drag steers the second tumble axis. The drop has no
            // upright to protect, unlike a brain, so both axes are fair game.
            const dP = ((e.clientY - d.lastY) / Math.max(1, cssH)) * k
            d.lastX = e.clientX
            d.lastY = e.clientY
            d.yaw += dY
            d.pitch += dP
            // Smoothed, so one jittery sample cannot launch the flywheel.
            d.velX = d.velX * 0.55 + (dY / dt) * 0.45
            d.velY = d.velY * 0.55 + (dP / dt) * 0.45
        }
        const onDown = (e: PointerEvent) => {
            const d = drag.current
            d.on = true
            gateGrab(1)
            d.lastX = e.clientX
            d.lastY = e.clientY
            d.tPrev = performance.now()
            d.velX = 0
            d.velY = 0
            d.id = e.pointerId
            try { host.setPointerCapture(e.pointerId) } catch (err) {}
            host.style.cursor = "grabbing"
        }
        const release = () => {
            const d = drag.current
            if (!d.on) return
            d.on = false
            gateGrab(0)
            try { if (d.id >= 0) host.releasePointerCapture(d.id) } catch (err) {}
            d.id = -1
            host.style.cursor = "grab"
        }
        const onLeave = () => gateHover(0)
        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerleave", onLeave)
        host.addEventListener("pointerdown", onDown)
        host.addEventListener("pointercancel", release)
        // On window, not host: a drag released outside must still let go.
        window.addEventListener("pointerup", release)

        /* ---- scroll progress ---- */
        const onCanvas = false
        const scrollProgress = () => {
            const r = host.getBoundingClientRect()
            const vh = window.innerHeight || 1
            const span = r.height + vh
            if (span <= 0) return 0
            const p = (vh - r.top) / span
            return p < 0 ? 0 : p > 1 ? 1 : p
        }

        /* ---- loop ---- */
        let raf = 0
        let last = performance.now()
        let clock = 0
        let tumbleY = 0
        let tumbleX = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min((now - last) / 1000, 0.05)
            last = now

            if (cssW <= 0 || cssH <= 0) {
                resize()
                if (cssW <= 0 || cssH <= 0) return
            }

            const L = live.current
            const p = pointer.current
            const d = drag.current
            // Both gates: the Transition control owns the easing, the loop reads.
            p.active = hoverMV.get()
            p.grab = grabMV.get()

            const gate = 1 - p.grab
            tumbleY = (tumbleY + dt * ((L.tumbleSpeed * Math.PI) / 180) * gate) % TAU
            tumbleX = (tumbleX + dt * ((L.tumbleTilt * Math.PI) / 180) * gate) % TAU
            if (!d.on) {
                d.yaw += d.velX * dt
                d.pitch += d.velY * dt
                const decay = 40 * Math.pow(0.03, Math.min(1, L.dragInertia / 100))
                const k = Math.exp(-decay * dt)
                d.velX *= k
                d.velY *= k
                if (Math.abs(d.velX) < 1e-4) d.velX = 0
                if (Math.abs(d.velY) < 1e-4) d.velY = 0
            }
            d.yaw = d.yaw % TAU
            d.pitch = d.pitch % TAU
            clock += dt

            const prog01 = onCanvas ? 0 : scrollProgress()
            const pitchCam =
                ((L.tiltStart + (L.tiltEnd - L.tiltStart) * prog01) * Math.PI) / 180
            // Negated so a positive control value dips the RIGHT edge.
            const roll =
                (-(L.rollStart + (L.rollEnd - L.rollStart) * prog01) * Math.PI) / 180

            const wDev = canvas.width
            const hDev = canvas.height
            const focal = hDev / (2 * Math.tan(((FOV / 2) * Math.PI) / 180))

            const radius = (L.radius / 100) * BLOB_R
            const lumpAmp = (L.lumpiness / 100) * radius
            const lumpScale = L.lumpScale / 100
            const curR = Math.max(1, (L.cursorRadius / 100) * radius)
            const dist = Math.max(radius * 1.8, L.cameraDistance)

            // Drift: a slow Lissajous so the drop never sits perfectly still.
            const dAmp = (L.drift / 100) * radius
            const centre = [
                Math.sin(clock * 0.23) * dAmp,
                Math.cos(clock * 0.17) * dAmp * 0.8,
                Math.sin(clock * 0.11) * dAmp * 0.5,
            ]

            const cam = { pitch: pitchCam, roll, dist, focal }
            let hx = 0, hy = 0, hz = 0
            const boundNoCur = radius + lumpAmp + 12
            if (p.active > 0.001) {
                const hit = sphereHit(
                    p.x * dpr - wDev / 2,
                    -(p.y * dpr - hDev / 2),
                    cam,
                    boundNoCur,
                    centre
                )
                if (hit) { hx = hit[0]; hy = hit[1]; hz = hit[2] }
            }

            const S = {
                radius, lumpAmp, lumpScale,
                morph: [
                    clock * (L.morphSpeed / 100) * 1.0,
                    clock * (L.morphSpeed / 100) * 0.73 + 1.7,
                    clock * (L.morphSpeed / 100) * 1.31 + 4.2,
                ],
                center: centre,
                rot: tumbleMatrix(tumbleY + d.yaw, tumbleX + d.pitch),
                cursor: [hx, hy, hz],
                curS: L.cursorLift,
                curR,
                curAmt: p.active,
            }
            const stepK = 1 / lipschitz(S)
            const boundR = boundRadius(S)

            // Palette -> flat vec3[MAX_COLORS]. An empty list falls back so a
            // designer who clears it never gets a black drop. Slots past the
            // count are filled with the LAST entry, so rampColor's i0 + 1
            // lookup can never read a stale colour at the top of the ramp.
            const pal =
                Array.isArray(L.colors) && L.colors.length > 0
                    ? L.colors.slice(0, MAX_COLORS)
                    : DEFAULT_COLORS
            for (let i = 0; i < MAX_COLORS; i++) {
                const [cr2, cg2, cb2] = parseColor(
                    pal[Math.min(i, pal.length - 1)]
                )
                palBuf[i * 3] = cr2
                palBuf[i * 3 + 1] = cg2
                palBuf[i * 3 + 2] = cb2
            }
            // Rim tint: the top of the ramp, so it always belongs to the palette.
            const [ar, ag, ab] = parseColor(pal[pal.length - 1])

            gl.uniform2f(u.res, wDev, hDev)
            gl.uniform1f(u.focal, focal)
            gl.uniform1f(u.dist, dist)
            gl.uniform1f(u.pitchCam, pitchCam)
            gl.uniform1f(u.roll, roll)
            gl.uniformMatrix3fv(u.rot, false, mat3ColMajor(S.rot))
            gl.uniform3f(u.center, centre[0], centre[1], centre[2])
            gl.uniform1f(u.radius, radius)
            gl.uniform1f(u.lumpAmp, lumpAmp)
            gl.uniform1f(u.lumpScale, lumpScale)
            gl.uniform3f(u.morph, S.morph[0], S.morph[1], S.morph[2])
            gl.uniform1f(u.stepK, stepK)
            gl.uniform1f(u.boundR, boundR)
            gl.uniform1f(u.film, L.filmThickness)
            gl.uniform1f(u.filmVar, L.thicknessVariation)
            gl.uniform1f(u.sheenScale, L.sheenScale / 100)
            gl.uniform1f(u.sheenT, clock * (L.sheenSpeed / 100))
            gl.uniform1f(u.inner, L.innerFilm / 100)
            gl.uniform1f(u.colorCount, pal.length)
            gl.uniform3fv(u.colors, palBuf)
            gl.uniform3f(u.acc, ar, ag, ab)
            gl.uniform4f(u.cursor, hx, hy, hz, p.active)
            gl.uniform1f(u.curR, curR)
            gl.uniform1f(u.curS, L.cursorLift)
            gl.uniform1f(u.hover, L.hoverGlow / 100)
            gl.uniform1f(u.debug, 0)
            gl.uniform3f(u.probe, 0, 0, 0)
            gl.uniform1f(u.probeScale, 1000)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            hoverAnim?.stop()
            grabAnim?.stop()
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerleave", onLeave)
            host.removeEventListener("pointerdown", onDown)
            host.removeEventListener("pointercancel", release)
            window.removeEventListener("pointerup", release)
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
                cursor: "grab",
                touchAction: "none",
                // The ember void is CSS, not a second GL pass: the canvas clears
                // to transparent and composites over this.
                // No top-left shine layer: a fixed blue-grey wash at 6% 4% read
                // as a smudge on the plate and mapped to no control (rule 1).
                background: `radial-gradient(62% 58% at 50% 54%, ${glow} 0%, transparent 68%), radial-gradient(120% 110% at 50% 50%, transparent 38%, rgba(0,0,0,0.55) 100%), ${background}`,
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
  "colors": [
    "#4300FF",
    "#00FF06"
  ],
  "speed": 100,
  "direction": "cw",
  "scale": 20,
  "lumpiness": 25,
  "iridescence": {
    "hue": 100,
    "detail": 20,
    "transparency": 100
  },
  "transition": {
    "ease": [
      0,
      0,
      0.58,
      1
    ],
    "mass": 1,
    "type": "tween",
    "damping": 60,
    "duration": 0.5,
    "stiffness": 800
  }
};

export default function IridescentDrop(props: Record<string, unknown>) {
  return <__BaseImpl_IridescentDrop {...(__presetProps as Record<string, unknown>)} {...props} />;
}
