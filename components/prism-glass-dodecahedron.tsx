"use client"

/**
 * PeridotCore — a clear glass dodecahedron with a lemon-and-lime light glowing
 * at its heart, ray-traced in WebGL2. The solid is traced analytically (a convex
 * polyhedron is the intersection of its face planes): every ray refracts in,
 * bounces internally up to eight times with total internal reflection, and
 * splits into red, green and blue at each exit for the rainbow fire along the
 * edges. Rounded edges draw thin white lines inside and out, the near facets
 * catch a lilac-white softbox, and faint vertical light leaks hang above and
 * below it, as in a long-exposure studio shot.
 *
 * Built after the user's reference still (a clear dodecahedron on black). The
 * rest pose, lens and size were fitted to it (silhouette IoU 0.94 against its
 * outline and edge lines): rotation vector REST_ROT, camera 5.3 circumradii
 * away, circumradius 0.309 × the frame height. The lemon core is how the
 * reference reads: a dodecahedron's opposite faces are parallel, so the middle
 * facet is a window onto the light straight behind the gem, cut by the back
 * edges; the studio (STUDIO, BACK) was then tuned against the reference's tone
 * and hue statistics over contact sheets.
 *
 * It turns slowly on its own, leans toward the pointer, lights a torch sheen
 * under the cursor (facets nearby flash), spins under a drag with inertia, and
 * flares its core on a tap.
 */

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"

// ─── Types and defaults ─────────────────────────────────────────────────────

type ShapeName = "dodecahedron" | "icosahedron" | "octahedron" | "cube"
type Direction = "left" | "right"

interface Placement {
    x: number
    y: number
    angle: number
    tilt: number
}
const DEFAULT_PLACEMENT: Placement = { x: 0, y: 0, angle: 0, tilt: 0 }

interface Response {
    drag: boolean
    lean: number
    glint: number
    flare: number
}
const DEFAULT_RESPONSE: Response = { drag: true, lean: 5, glint: 5, flare: 5 }

/** Tuning values behind the look. Out of the box these are the look. */
const DEFAULT_ADVANCED = {
    bevel: 20,
    distance: 53,
    ior: 165,
    bounces: 6,
    exposure: 140,
    keyColor: "#E6E0FF",
    keyLight: 170,
    keyAngle: -128,
    rimLight: 100,
    ambient: 60,
    absorption: 60,
    coreSize: 0,
    coreGlow: 100,
    streaks: 50,
    streakColor: "#C8D8B4",
    spinTilt: 18,
    float: 3,
    floatPeriod: 6,
    flareTime: 1.4,
}
type Advanced = typeof DEFAULT_ADVANCED

export interface PeridotCoreProps {
    background?: string
    /** The solid the glass is cut as. Dodecahedron is the reference. */
    shape?: ShapeName
    /** Size of the gem in its frame, %. 100 is the reference framing. */
    scale?: number
    /** Colour the glass passes, deeper the further light travels through it. */
    tint?: string
    /** The light caught in the core. */
    coreColor?: string
    /** The second light that flecks the upper facets. */
    accentColor?: string
    /** How far the glass splits light into colour fringes, 0–100. */
    dispersion?: number
    placement?: Partial<Placement>
    response?: Partial<Response>
    /** Spin speed, 0–10. 0 holds it still. Motion is a hand-rolled loop, so there is no Transition row. */
    speed?: number
    direction?: Direction
    advanced?: Partial<Advanced>
    style?: CSSProperties
}

// ─── Fitted constants ───────────────────────────────────────────────────────

const REF_W = 1200
const REF_H = 800
const REF_ASPECT = REF_W / REF_H
/** Circumradius as a share of the contained unit S (123.7 px in the reference's 400 px frame). */
const GEM_SHARE = 0.309
/** Rest orientation, a rotation vector fitted to the reference's silhouette and edges. */
const REST_ROT: [number, number, number] = [0.771, 0.238, -0.447]
/** Device-pixel budget for the canvas; a 4K frame steps down instead of heating the GPU. */
const PIXEL_BUDGET = 4_200_000
/** Lean toward the pointer at Lean 10, degrees. */
const LEAN_MAX = 16
const D2R = Math.PI / 180

const PHI = (1 + Math.sqrt(5)) / 2

interface ShapeDef {
    normals: number[][]
    /** Plane distance (inradius / circumradius). */
    pd: number
    /** sin of the angle between adjacent face normals: turns a plane distance into a distance along the face. */
    sina: number
}

function unit(v: number[]): number[] {
    const l = Math.hypot(v[0], v[1], v[2]) || 1
    return [v[0] / l, v[1] / l, v[2] / l]
}

function shapeDef(s: ShapeName): ShapeDef {
    const n: number[][] = []
    const pm = [-1, 1]
    if (s === "icosahedron") {
        for (const a of pm) for (const b of pm) for (const c of pm) n.push(unit([a, b, c]))
        for (const a of pm)
            for (const b of pm) {
                n.push(unit([0, a / PHI, b * PHI]))
                n.push(unit([a / PHI, b * PHI, 0]))
                n.push(unit([a * PHI, 0, b / PHI]))
            }
        return { normals: n, pd: 0.7946544723, sina: 0.6666666667 }
    }
    if (s === "octahedron") {
        for (const a of pm) for (const b of pm) for (const c of pm) n.push(unit([a, b, c]))
        return { normals: n, pd: 0.5773502692, sina: 0.9428090416 }
    }
    if (s === "cube") {
        for (const a of pm) {
            n.push([a, 0, 0])
            n.push([0, a, 0])
            n.push([0, 0, a])
        }
        return { normals: n, pd: 0.5773502692, sina: 1 }
    }
    for (const a of pm)
        for (const b of pm) {
            n.push(unit([0, a * PHI, b]))
            n.push(unit([a * PHI, b, 0]))
            n.push(unit([a, 0, b * PHI]))
        }
    return { normals: n, pd: 0.7946544723, sina: 0.894427191 }
}

/** sin of the angle between adjacent normals, per solid (read every frame, so cached). */
const SHAPE_SINA: Record<ShapeName, number> = {
    dodecahedron: shapeDef("dodecahedron").sina,
    icosahedron: shapeDef("icosahedron").sina,
    octahedron: shapeDef("octahedron").sina,
    cube: shapeDef("cube").sina,
}

// ─── Shaders ────────────────────────────────────────────────────────────────

const VERT = `#version 300 es
uniform vec2 uRes;
uniform vec2 uCentre;
uniform vec2 uRoll;
uniform vec2 uHalf;
void main() {
    int id = gl_VertexID;
    vec2 c = vec2((id == 1 || id == 2 || id == 4) ? 1.0 : -1.0, (id == 2 || id == 4 || id == 5) ? 1.0 : -1.0);
    vec2 q = c * uHalf;
    // Content frame -> screen: Angle turns the content clockwise.
    vec2 s = vec2(uRoll.x * q.x + uRoll.y * q.y, -uRoll.y * q.x + uRoll.x * q.y);
    gl_Position = vec4((uCentre + s) / uRes * 2.0 - 1.0, 0.0, 1.0);
}`

// The studio, baked once into an equirectangular HDR map (world frame) whenever
// a light setting changes: a dim green-grey dome and the hard-edged softboxes
// of STUDIO that do not sway. Rebaking is the only cost of a light change.
const BAKE_VERT = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const BAKE_FRAG_TEMPLATE = `#version 300 es
precision highp float;
#define NS __NS__
out vec4 outColor;
uniform vec2 uSize;
uniform vec3 uAmb;
uniform vec3 uSC[NS];
uniform vec3 uSU[NS];
uniform vec3 uSHS[NS];
uniform vec3 uSCol[NS];
uniform int uRGBM;
const float PI = 3.14159265;
// A softbox on the tangent plane round its centre: a rectangle, or (hs.y < 0)
// a round glow of radius hs.x that is hottest in the middle and fades softly
// to its rim, so a light seen whole through a facet never reads as a shape.
float box(vec3 d, vec3 c, vec3 u, vec2 hs, float soft) {
    float k = dot(d, c);
    if (k <= 0.05) return 0.0;
    vec3 v = cross(c, u);
    vec2 p = vec2(dot(d, u), dot(d, v)) / k;
    if (hs.y < 0.0) {
        float r = length(p) / hs.x;
        return (1.0 - smoothstep(1.0 - soft / hs.x, 1.0 + soft / hs.x, r)) * (0.55 + 0.45 * exp(-r * r * 2.5));
    }
    vec2 e = abs(p) - hs;
    float sd = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
    return 1.0 - smoothstep(-soft, soft, sd);
}
void main() {
    vec2 uv = gl_FragCoord.xy / uSize;
    float ph = (uv.x - 0.5) * 2.0 * PI;
    float th = uv.y * PI;
    vec3 w = vec3(sin(th) * sin(ph), cos(th), -sin(th) * cos(ph));
    vec3 c = uAmb * (0.35 + 0.65 * smoothstep(-0.6, 0.9, w.y));
    for (int i = 0; i < NS; i++) c += uSCol[i] * box(w, uSC[i], uSU[i], uSHS[i].xy, uSHS[i].z);
    if (uRGBM == 1) {
        // 8-bit fallback: RGB scaled by a shared multiplier in alpha (range 32).
        float m = clamp(max(c.r, max(c.g, c.b)) / 32.0, 1.0 / 255.0, 1.0);
        m = ceil(m * 255.0) / 255.0;
        outColor = vec4(c / (m * 32.0), m);
    } else outColor = vec4(c, 1.0);
}`

// The solid is traced analytically in its own frame: a convex polyhedron is the
// intersection of its face half-spaces, so entry and every internal hop is one
// pass over the planes. The environment is the baked map plus a few analytic
// lights behind the gem (they sway, and they must stay sharp through the
// magnifying centre facet).
const FRAG_TEMPLATE = `#version 300 es
precision highp float;
#define NP __NP__
#define PD __PD__
#define SINA __SINA__
#define COSA __COSA__
#define SINH __SINH__
const vec3 PN[NP] = vec3[NP](__PN__);
out vec4 outColor;

uniform vec2 uCentre;
uniform vec2 uRoll;
uniform float uPxU;
uniform float uCam;
uniform mat3 uInv;
uniform vec3 uRoO;
uniform vec2 uBob;
uniform vec3 uIor;
uniform int uNC;
uniform int uBounces;
uniform float uBevel;
uniform float uBevelK;
uniform int uAA;
uniform vec3 uAbsorb;
uniform float uExpo;
uniform sampler2D uEnv;
uniform int uRGBM;
uniform mat3 uRotW;
uniform vec3 uBackDir;
uniform float uBackCos;
#define NK __NK__
uniform vec3 uBkC[NK];
uniform vec3 uBkU[NK];
uniform vec3 uBkHS[NK];
uniform vec3 uBkCol[NK];
uniform mat3 uCoreRot;
uniform float uCoreS;
uniform vec3 uCoreUp;
uniform vec3 uCoreCol;
uniform vec3 uAccCol;
uniform float uCoreGlow;
uniform vec3 uGlC;
uniform float uGlR;
uniform vec3 uGlCol;
uniform vec3 uTorch;
uniform vec3 uTorchCol;
uniform vec3 uHalo;
uniform float uStreak;
uniform vec3 uStreakCol;
uniform float uTime;

// A softbox on the tangent plane round its centre: a rectangle, or (hs.y < 0)
// a round glow of radius hs.x that is hottest in the middle and fades softly
// to its rim, so a light seen whole through a facet never reads as a shape.
float box(vec3 d, vec3 c, vec3 u, vec2 hs, float soft) {
    float k = dot(d, c);
    if (k <= 0.05) return 0.0;
    vec3 v = cross(c, u);
    vec2 p = vec2(dot(d, u), dot(d, v)) / k;
    if (hs.y < 0.0) {
        float r = length(p) / hs.x;
        return (1.0 - smoothstep(1.0 - soft / hs.x, 1.0 + soft / hs.x, r)) * (0.55 + 0.45 * exp(-r * r * 2.5));
    }
    vec2 e = abs(p) - hs;
    float sd = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
    return 1.0 - smoothstep(-soft, soft, sd);
}

// Torch beam weight for the current sample: facets catch the glint light only
// near the pointer, so the hover effect stays under the cursor.
float gBeam = 0.0;
// The studio in direction d (object space). Crisp panel edges are what break
// each facet into separate shards.
vec3 env(vec3 d) {
    vec3 w = uRotW * d;
    vec2 uv = vec2(atan(w.x, -w.z) * 0.15915494 + 0.5, acos(clamp(w.y, -1.0, 1.0)) * 0.31830989);
    vec4 t = textureLod(uEnv, uv, 0.0);
    vec3 c = uRGBM == 1 ? t.rgb * t.a * 32.0 : t.rgb;
    // The lights behind the gem: one dot product gates them all.
    if (dot(w, uBackDir) > uBackCos)
        for (int i = 0; i < NK; i++) c += uBkCol[i] * box(w, uBkC[i], uBkU[i], uBkHS[i].xy, uBkHS[i].z);
    // Pointer glint: a small round light.
    // Soft rim (starts ~40% wider than the core) so a facet catching it fades in instead of switching on.
    float g = dot(w, uGlC);
    float g0 = uGlR - (1.0 - uGlR);
    if (g > g0) c += uGlCol * gBeam * smoothstep(g0, mix(uGlR, 1.0, 0.5), g);
    return c;
}

// Rounded edges: within uBevel of an edge (measured along the face), the normal
// turns toward the neighbouring face on a circular profile, reaching the
// bisector at the edge. This is what draws the thin white lines.
// Nearest edge met by the current sample, in bevel widths: a sample that
// touched a rounded edge is always supersampled (see main).
float gEdge = 1e9;
// Adjacent faces of a regular solid all meet at one angle, so the profile's
// trig is constant (COSA, SINA, and uBevelK = tan(half angle) / bevel width):
// with x = sin(a) = (bevel - e) * uBevelK, tan(a) = x / sqrt(1 - x²).
vec3 bevelN(vec3 p, vec3 n) {
    if (uBevel <= 0.0) return n;
    vec3 acc = n;
    for (int j = 0; j < NP; j++) {
        vec3 nj = PN[j];
        float c = dot(n, nj);
        if (abs(c - COSA) > 0.02) continue;
        float e = (PD - dot(nj, p)) / SINA;
        gEdge = min(gEdge, e / uBevel);
        if (e < uBevel) {
            float x = min((uBevel - e) * uBevelK, SINH);
            acc += (nj - n * c) * (x / (SINA * sqrt(1.0 - x * x)));
        }
    }
    return normalize(acc);
}

// The glowing core: a smaller solid of the same cut, turned its own way, sitting
// inside the glass. Its faces glow Core Light; faces turned up glow Accent Light,
// and its own rounded edges burn paler. Seen through different outer facets it
// shatters into the lemon and lime shards of the reference.
// Returns the hit distance along (p, d) in object space, or -1.
float hitCore(vec3 p, vec3 d, out vec3 nc, out vec3 pc) {
    vec3 q = uCoreRot * p;
    vec3 v = uCoreRot * d;
    float pdc = PD * uCoreS;
    float t0 = -1e9;
    float t1 = 1e9;
    nc = vec3(0.0, 0.0, 1.0);
    for (int i = 0; i < NP; i++) {
        float dn = dot(PN[i], v);
        float nm = pdc - dot(PN[i], q);
        if (abs(dn) < 1e-7) {
            if (nm < 0.0) return -1.0;
            continue;
        }
        float t = nm / dn;
        if (dn < 0.0) {
            if (t > t0) {
                t0 = t;
                nc = PN[i];
            }
        } else t1 = min(t1, t);
    }
    if (!(t0 < t1 && t0 > 0.0)) return -1.0;
    pc = q + v * t0;
    return t0;
}

vec3 coreShade(vec3 nc, vec3 pc) {
    float up = dot(nc, uCoreUp);
    // Each face its own brightness, from its orientation: no hash, so every GPU agrees.
    float f = 0.85 + 0.25 * dot(nc, vec3(0.267, 0.534, 0.802));
    vec3 c = mix(uCoreCol * f, uAccCol, smoothstep(0.35, 0.85, up));
    // Paler lines along the core's own edges.
    float e = 1e9;
    for (int j = 0; j < NP; j++) {
        float cj = dot(nc, PN[j]);
        if (cj > 0.999 || cj < 0.0) continue;
        e = min(e, (PD * uCoreS - dot(PN[j], pc)) / SINA);
    }
    float line = 1.0 - smoothstep(0.004, 0.02, e);
    return c * (1.0 + 0.2 * line) + vec3(0.1) * line * dot(uCoreCol, vec3(0.33));
}

// Haze: light the core scatters into the glass around it, gathered along a
// segment by its closest approach to the centre.
vec3 coreHaze(vec3 p, vec3 d, float len) {
    float tc = clamp(-dot(p, d), 0.0, len);
    float r = length(p + d * tc) / max(1e-3, uCoreS);
    return uCoreCol * uCoreGlow * exp(-r * r * 0.9) * min(len, 1.2);
}

// Dispersion: one light path is followed (the middle wavelength), and only at
// each exit is the light split: red and blue refract out at their own angles
// and each samples the studio for its own channel. Where the middle wavelength
// is trapped by total internal reflection but red or blue still escapes, half
// of it is let out: the fire along the edges.
vec3 exitLight(vec3 d, vec3 nb, float eta, out vec3 dOut) {
    dOut = refract(d, -nb, eta);
    if (uNC == 1) return dot(dOut, dOut) > 0.0 ? env(dOut) : vec3(0.0);
    vec3 dR = refract(d, -nb, uIor.x);
    vec3 dB = refract(d, -nb, uIor.z);
    vec3 e;
    e.r = dot(dR, dR) > 0.0 ? env(dR).r : 0.0;
    e.g = dot(dOut, dOut) > 0.0 ? env(dOut).g : 0.0;
    e.b = dot(dB, dB) > 0.0 ? env(dB).b : 0.0;
    return e;
}

vec3 trace(vec3 ro, vec3 rd, float tIn, vec3 nIn, float eta, out float sig) {
    vec3 p = ro + rd * tIn;
    vec3 n = bevelN(p, nIn);
    float F0 = (eta - 1.0) / (eta + 1.0);
    F0 *= F0;
    float ci = clamp(-dot(rd, n), 0.0, 1.0);
    float F = F0 + (1.0 - F0) * pow(1.0 - ci, 5.0);
    vec3 col = env(reflect(rd, n)) * F;
    vec3 d = refract(rd, n, 1.0 / eta);
    if (dot(d, nIn) >= -1e-4) d = refract(rd, nIn, 1.0 / eta);
    vec3 thr = vec3(1.0 - F);
    sig = dot(nIn, vec3(1.0, 7.0, 49.0));
    for (int k = 0; k < 8; k++) {
        if (k >= uBounces) break;
        float tb = 1e9;
        vec3 ne = vec3(0.0, 1.0, 0.0);
        for (int i = 0; i < NP; i++) {
            float dn = dot(PN[i], d);
            if (dn > 1e-5) {
                float t = (PD - dot(PN[i], p)) / dn;
                if (t < tb) {
                    tb = t;
                    ne = PN[i];
                }
            }
        }
        tb = max(tb, 0.0);
        vec3 nc;
        vec3 pc;
        float tcore = uCoreS > 0.0 ? hitCore(p, d, nc, pc) : -1.0;
        if (tcore > 0.0 && tcore < tb) {
            col += thr * (coreHaze(p, d, tcore) + coreShade(nc, pc) * exp(-uAbsorb * tcore));
            sig += dot(nc, vec3(5.3, 11.1, 2.9)) + 40.0;
            return col;
        }
        if (uCoreS > 0.0) col += thr * coreHaze(p, d, tb);
        p += d * tb;
        thr *= exp(-uAbsorb * tb);
        if (k == 0) sig += dot(ne, vec3(3.1, 17.3, 5.7));
        // Rounded edges only where they read as lines: deeper in, an edge seen
        // through two or three reflections is thinner than a pixel and only
        // aliases into dashes, so the later hops use the flat faces.
        vec3 nb = k == 0 ? bevelN(p, ne) : ne;
        vec3 dOut;
        vec3 e = exitLight(d, nb, eta, dOut);
        vec3 dR = reflect(d, nb);
        if (dot(dR, ne) >= -1e-4) dR = reflect(d, ne);
        if (dot(dOut, dOut) > 0.0) {
            float ct = clamp(dot(dOut, nb), 0.0, 1.0);
            float Fo = F0 + (1.0 - F0) * pow(1.0 - ct, 5.0);
            col += thr * (1.0 - Fo) * e;
            thr *= Fo;
        } else col += thr * e * 0.5;
        d = dR;
        p -= ne * 1e-4;
    }
    col += thr * env(d) * 0.5;
    return col;
}

vec2 toContent(vec2 frag) {
    vec2 s = frag - uCentre;
    return vec2(uRoll.x * s.x - uRoll.y * s.y, uRoll.y * s.x + uRoll.x * s.y);
}

// How far a pixel's ray passes outside the solid (≤ 0 when it goes through):
// the solid's plane distance at the ray's closest approach to the centre.
// Contours of it follow the silhouette, so a glow built on it hugs the gem's
// outline instead of being a circle.
float gemOut(vec2 q) {
    vec3 rd = uInv * normalize(vec3(q / (uPxU * uCam), -1.0));
    vec3 p = uRoO + rd * max(-dot(uRoO, rd), 0.0);
    float d = -1e9;
    for (int i = 0; i < NP; i++) d = max(d, dot(PN[i], p) - PD);
    return d;
}

vec4 sampleAt(vec2 frag, out float sig) {
    vec2 q = toContent(frag);
    vec3 rd = uInv * normalize(vec3(q / (uPxU * uCam), -1.0));
    vec3 ro = uRoO;
    sig = -100.0;
    gEdge = 1e9;
    // Bounding sphere first: most of the strip is empty.
    float b = dot(ro, rd);
    float h = b * b - dot(ro, ro) + 1.0005;
    if (h < 0.0) return vec4(0.0);
    float tIn = -1e9;
    float t1 = 1e9;
    vec3 nIn = vec3(0.0, 0.0, 1.0);
    for (int i = 0; i < NP; i++) {
        float dn = dot(PN[i], rd);
        float nm = PD - dot(PN[i], ro);
        if (abs(dn) < 1e-7) {
            if (nm < 0.0) return vec4(0.0);
            continue;
        }
        float t = nm / dn;
        if (dn < 0.0) {
            if (t > tIn) {
                tIn = t;
                nIn = PN[i];
            }
        } else t1 = min(t1, t);
    }
    if (!(tIn < t1 && tIn > 0.0)) return vec4(0.0);
    // Torch: a soft sheen on the glass centred exactly under the pointer, and a
    // beam that lets the facets around it flash with the glint light.
    vec2 dq = (q - uTorch.xy) / uTorch.z;
    float r2 = dot(dq, dq);
    gBeam = exp(-r2 * 0.7);
    vec3 col = trace(ro, rd, tIn, nIn, uIor.y, sig);
    return vec4(col, 1.0);
}

vec3 tone(vec3 c) {
    c = 1.0 - exp(-c * uExpo);
    return pow(c, vec3(1.0 / 2.2));
}

// Light leaks: thin vertical columns that hang off the gem's top and bottom.
const vec4 SK[6] = vec4[6](
    vec4(-0.32, 0.030, 1.00, 0.35),
    vec4(-0.12, 0.060, 0.50, 0.50),
    vec4(0.08, 0.035, 0.80, 0.45),
    vec4(0.30, 0.050, 0.45, 0.40),
    vec4(-0.55, 0.080, 0.30, 0.60),
    vec4(0.55, 0.070, 0.25, 0.50)
);
float streaks(vec2 u) {
    float s = 0.0;
    float ay = abs(u.y);
    float side = u.y < 0.0 ? 1.0 : 0.55;
    for (int i = 0; i < 6; i++) {
        vec4 k = SK[i];
        float dx = (u.x - k.x) / k.y;
        float y0 = sqrt(max(0.0, 1.0 - k.x * k.x)) * 0.8;
        float dy = ay - y0;
        float fall = exp(-max(dy, 0.0) / k.w) * smoothstep(-0.2, 0.1, dy);
        float fl = 0.65 + 0.35 * sin(uTime * (0.7 + 0.23 * float(i)) + float(i) * 2.1);
        s += k.z * exp(-dx * dx) * fall * fl;
    }
    return s * side;
}

const vec2 RG[5] = vec2[5](vec2(0.0), vec2(0.125, 0.375), vec2(-0.375, 0.125), vec2(-0.125, -0.375), vec2(0.375, -0.125));

void main() {
    vec2 frag = gl_FragCoord.xy;
    // Edge-adaptive AA: one sample, then four more only on quads that straddle
    // a silhouette, a facet boundary or a sharp line. One call site keeps the
    // shader small.
    vec4 acc = vec4(0.0);
    float n = 0.0;
    for (int i = 0; i < 5; i++) {
        float sg;
        vec4 s = sampleAt(frag + RG[i], sg);
        vec4 cs = vec4(tone(s.rgb) * s.a, s.a);
        acc += cs;
        n += 1.0;
        if (i == 0) {
            vec3 fc = fwidth(cs.rgb);
            bool edge = fwidth(sg) > 0.5 || max(fc.r, max(fc.g, fc.b)) > 0.06 || fwidth(cs.a) > 0.01;
            if (uAA == 0 || (!edge && gEdge > 1.6)) break;
        }
    }
    acc /= n;
    // Hover glow, as light coming out of the gem rather than a disc laid on it:
    // the facets near the cursor brighten in their own colours (a multiply, so
    // dark facets stay dark and the cut keeps its contrast), a thin rim lights
    // inside the outline, and a bloom shaped like the silhouette spills out
    // from it, strongest on the side the cursor is on. Inner rim and bloom meet
    // at the same value on the outline, so there is no seam.
    if (uHalo.x + uHalo.y + uHalo.z + uTorchCol.x > 0.0) {
        vec2 cq = toContent(frag);
        vec2 dq = (cq - uTorch.xy) / uTorch.z;
        float r2 = dot(dq, dq);
        float d = gemOut(cq);
        float side = 0.3 + 0.7 * exp(-r2 * 0.06);
        float outside = step(0.0, d);
        float bloom = exp(-max(d, 0.0) / 0.07) * (1.0 - smoothstep(0.26, 0.36, d)) * outside;
        float rimIn = exp(min(d, 0.0) / 0.045) * (1.0 - outside);
        vec3 boost = uTorchCol * 1.6 * exp(-r2 * 0.5);
        acc.rgb = min(acc.rgb * (1.0 + boost), vec3(acc.a));
        vec3 L = clamp(uHalo * side * (bloom + rimIn), 0.0, 1.0);
        acc.rgb += L * (1.0 - acc.rgb);
        acc.a += max(L.r, max(L.g, L.b)) * (1.0 - acc.a);
    }
    vec3 st = vec3(0.0);
    if (uStreak > 0.0) {
        vec2 u = (toContent(frag) - uBob) / uPxU;
        st = 1.0 - exp(-uStreakCol * streaks(u) * uStreak);
    }
    // Straight alpha: the leaks add light over any Background.
    vec3 rgb = acc.rgb + st * (1.0 - acc.a);
    float a = acc.a + max(st.r, max(st.g, st.b)) * (1.0 - acc.a);
    outColor = a > 1e-4 ? vec4(rgb / a, a) : vec4(0.0);
}`

function bakeFrag(): string {
    return BAKE_FRAG_TEMPLATE.replace("__NS__", String(STUDIO.length))
}

function fragFor(s: ShapeName): string {
    const d = shapeDef(s)
    const f = (x: number) => x.toFixed(9)
    return FRAG_TEMPLATE.replace("__NP__", String(d.normals.length))
        .replace("__NK__", String(BACK.length))
        .replace("__PD__", f(d.pd))
        .replace("__SINA__", f(d.sina))
        .replace("__COSA__", f(Math.sqrt(1 - d.sina * d.sina)))
        .replace("__SINH__", f(Math.sin(0.5 * Math.asin(d.sina))))
        .replace("__PN__", d.normals.map((v) => `vec3(${f(v[0])}, ${f(v[1])}, ${f(v[2])})`).join(", "))
}

// ─── Small helpers ──────────────────────────────────────────────────────────

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

function clampN(v: number, lo: number, hi: number) {
    return Math.min(hi, Math.max(lo, v))
}

const colorCache = new Map<string, number[]>()
/** Parses a CSS colour to linear RGB. */
function toLin(c: unknown, fb: number[]): number[] {
    if (typeof c !== "string") return fb
    const hit = colorCache.get(c)
    if (hit) return hit
    let out: number[] | null = null
    const v = /var\(\s*--[^,]+,\s*(.+)\)/.exec(c)
    const s = v ? v[1] : c
    const rgb = s.match(/rgba?\(([^)]+)\)/i)
    if (rgb) {
        const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat)
        if (parts.length >= 3) out = [parts[0] / 255, parts[1] / 255, parts[2] / 255]
    } else {
        const hex = s.match(/#([0-9a-f]{3,8})/i)
        if (hex) {
            let h = hex[1]
            if (h.length === 3 || h.length === 4) h = h.split("").map((x) => x + x).join("")
            out = [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]
        }
    }
    const res = out && out.every((x) => isFinite(x)) ? out.map((x) => Math.pow(clampN(x, 0, 1), 2.2)) : fb
    if (colorCache.size > 200) colorCache.clear()
    colorCache.set(c, res)
    return res
}

type Quat = [number, number, number, number]

function qMul(a: Quat, b: Quat, out: Quat): Quat {
    const x = a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1]
    const y = a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0]
    const z = a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3]
    const w = a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
    out[0] = x
    out[1] = y
    out[2] = z
    out[3] = w
    return out
}

function qRotvec(x: number, y: number, z: number, out: Quat): Quat {
    const th = Math.hypot(x, y, z)
    if (th < 1e-12) {
        out[0] = 0
        out[1] = 0
        out[2] = 0
        out[3] = 1
        return out
    }
    const s = Math.sin(th / 2) / th
    out[0] = x * s
    out[1] = y * s
    out[2] = z * s
    out[3] = Math.cos(th / 2)
    return out
}

function qNorm(q: Quat) {
    const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1
    q[0] /= l
    q[1] /= l
    q[2] /= l
    q[3] /= l
}

/** Row-major rotation matrix (object → world) from a unit quaternion. */
function qMat(q: Quat, m: Float32Array) {
    const [x, y, z, w] = q
    m[0] = 1 - 2 * (y * y + z * z)
    m[1] = 2 * (x * y - z * w)
    m[2] = 2 * (x * z + y * w)
    m[3] = 2 * (x * y + z * w)
    m[4] = 1 - 2 * (x * x + z * z)
    m[5] = 2 * (y * z - x * w)
    m[6] = 2 * (x * z - y * w)
    m[7] = 2 * (y * z + x * w)
    m[8] = 1 - 2 * (x * x + y * y)
}

/** World vector into object space: Mᵀ·v. */
function toObj(m: Float32Array, v: number[], out: number[]) {
    out[0] = m[0] * v[0] + m[3] * v[1] + m[6] * v[2]
    out[1] = m[1] * v[0] + m[4] * v[1] + m[7] * v[2]
    out[2] = m[2] * v[0] + m[5] * v[1] + m[8] * v[2]
}

// ─── The studio (camera frame: x right, y up, +z toward the viewer) ─────────

interface BoxLight {
    /** Centre direction (camera frame). */
    c: number[]
    /** Half-size on the tangent plane (or radius, -1 for a round glow), and edge softness. */
    hs: [number, number, number]
    /** Linear colour × intensity. */
    col: [number, number, number]
    /** Which panel control scales it: the key, the rim group, the core or accent colour, or fixed. */
    role: "key" | "rim" | "core" | "accent" | "fixed"
    /** Turn of the panel about its own centre, degrees. */
    roll?: number
}
/** Horizontal axis of a softbox (up × centre), turned by its roll. */
function axisInto(c: number[], roll: number, out: number[]) {
    let ux = c[2]
    let uz = -c[0]
    const l = Math.hypot(ux, uz) || 1
    ux /= l
    uz /= l
    // v = c × u
    const vx = c[1] * uz
    const vy = c[2] * ux - c[0] * uz
    const vz = -c[1] * ux
    const a = roll * D2R
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    out[0] = ux * ca + vx * sa
    out[1] = vy * sa
    out[2] = uz * ca + vz * sa
}
function normInto(v: number[], out: number[]) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1
    out[0] = v[0] / l
    out[1] = v[1] / l
    out[2] = v[2] / l
}
// STUDIO — fitted by eye against the reference over contact sheets. Light seen
// straight through the gem (behind it) shows in the middle facets, light behind
// one side shows through the opposite side's facets, and the front panels show
// in reflection and on the rounded edges.
const STUDIO: BoxLight[] = [
    // lilac-white key; its azimuth comes from Advanced › Key Angle
    { c: [0, 0, 0], hs: [0.55, 0.42, 0.03], col: [0.8, 0.76, 1], role: "key" },
    // white strip overhead
    { c: [0.18, 0.95, 0.15], hs: [0.9, 0.08, 0.02], col: [6, 6, 6], role: "rim" },
    // dim green-grey fill on the right
    { c: [0.9, 0.15, 0.25], hs: [0.3, 0.6, 0.08], col: [0.25, 0.32, 0.26], role: "rim" },
    // lilac-white panel behind, up and right: the lower-left facets look into it
    { c: [0.45, 0.45, -0.77], hs: [0.35, 0.3, 0.02], col: [4.2, 4.0, 5.2], role: "fixed" },
    // grey-white panel behind, low and left
    { c: [-0.5, -0.35, -0.8], hs: [0.25, 0.35, 0.02], col: [0.8, 0.85, 0.8], role: "fixed" },
    // stray core glow to the sides, so the side facets flash lemon as it turns
    { c: [-0.55, 0.05, -0.83], hs: [0.1, -1, 0.05], col: [2.4, 0, 0], role: "core" },
    { c: [0.45, -0.35, -0.82], hs: [0.07, -1, 0.04], col: [1.8, 0, 0], role: "core" },
    // white panel in front, left: reflections on the near facets
    { c: [-0.6, 0.2, 0.75], hs: [0.25, 0.5, 0.02], col: [3, 3, 3], role: "fixed" },
]
// BACK — the lights straight behind the gem, traced analytically rather than
// baked: they sway, and the centre facet magnifies them about tenfold, which no
// affordable map resolution survives. Opposite facets are parallel, so this
// cluster always shows in the middle of the gem, cut by the back edges.
const BACK: BoxLight[] = [
    // the core: a round lemon glow, hottest in the middle (hs.y < 0 = round).
    // Smaller than the centre facet's window (about ±0.075), so the facet shows
    // a glowing orb with glass round it, never a pane of flat yellow.
    { c: [0.005, -0.005, -1], hs: [0.05, -1, 0.0225], col: [3.2, 0, 0], role: "core" },
    // its wider halo
    { c: [0.005, -0.005, -1], hs: [0.09, -1, 0.0540], col: [0.35, 0, 0], role: "core" },
    // lime above it: the green on the upper shards
    { c: [-0.02, 0.0600, -1], hs: [0.0275, -1, 0.0150], col: [3.8, 0, 0], role: "accent" },
    { c: [0.0450, 0.0510, -1], hs: [0.0150, -1, 0.0090], col: [2.6, 0, 0], role: "accent" },
    // a lilac-white bar across the core
    { c: [0.012, -0.01, -1], hs: [0.0065, 0.35, 0.002], col: [2.2, 2.1, 2.6], role: "fixed", roll: 35 },
]
/** The cluster is tested only for directions within this angle of straight back. */
const BACK_GATE = Math.cos(27 * (Math.PI / 180))
/** Baked studio map size (equirectangular). */
const ENV_W = 1024
const ENV_H = 512
/** Core glow in linear units at Core Glow 100%; Accent the same. */
const CORE_K = 1.6
const ACC_K = 1.6
/** The core's rest orientation inside the glass (rotation vector). */
const CORE_ROT: [number, number, number] = [0.42, 1.05, 0.18]
// /STUDIO
const KEY_BASE = 4
/** Turns v about the vertical axis (cA, sA), then about the horizontal (cB, sB). */
function swayInto(v: number[], cA: number, sA: number, cB: number, sB: number) {
    const x = v[0] * cA + v[2] * sA
    const z = -v[0] * sA + v[2] * cA
    const y = v[1]
    v[0] = x
    v[1] = y * cB - z * sB
    v[2] = y * sB + z * cB
}
/** Pointer glint: a round light about 8° across (cosine of its radius). */
const GLINT_COS = Math.cos(8 * (Math.PI / 180))
/** How far the lights behind the gem sway, radians. */
const SWAY = 3 * D2R
/** Key softbox direction from its azimuth: low, to the side, slightly behind at the default. */
function keyDirInto(az: number, out: number[]) {
    const a = az * D2R
    out[0] = Math.sin(a) * 0.62
    out[1] = -0.45
    out[2] = Math.cos(a) * 0.62 + 0.3
    normInto(out, out)
}
const UP = [0, 1, 0]
// Colour fallbacks, linear (module constants so the frame loop allocates nothing).
const FB_TINT = [0.72, 0.86, 0.67]
const FB_CORE = [0.85, 0.77, 0.04]
const FB_ACC = [0.03, 0.65, 0.07]
const FB_KEY = [0.72, 0.65, 1]
const FB_LEAK = [0.58, 0.69, 0.45]

const NAMES = [
    "uRes", "uCentre", "uRoll", "uHalf", "uPxU", "uCam", "uInv", "uRoO", "uBob", "uIor", "uNC", "uBounces",
    "uBevel", "uBevelK", "uAA", "uAbsorb", "uExpo", "uEnv", "uRGBM", "uRotW", "uBackDir", "uBackCos", "uBkC", "uBkU", "uBkHS", "uBkCol", "uCoreRot", "uCoreS", "uCoreUp", "uCoreCol", "uAccCol", "uCoreGlow", "uGlC", "uGlR", "uGlCol", "uTorch", "uTorchCol", "uHalo", "uStreak", "uStreakCol", "uTime",
] as const
type UName = (typeof NAMES)[number]

interface Prog {
    prog: WebGLProgram
    slots: Record<UName, { loc: WebGLUniformLocation | null; v: Float64Array }>
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function PeridotCore({
    background = "#000000",
    shape = "icosahedron",
    scale = 140,
    tint = "#DDEFD6",
    coreColor = "#FF0000",
    accentColor = "#0012FF",
    dispersion = 35,
    placement = {"x":0,"y":0,"tilt":0,"angle":0},
    response = {"drag":true,"lean":5,"flare":5,"glint":5},
    speed = 5,
    direction = "right",
    advanced = {"ior":165,"bevel":20,"float":3,"ambient":60,"bounces":8,"streaks":50,"coreGlow":100,"coreSize":0,"distance":53,"exposure":140,"keyAngle":-128,"keyColor":"#9076FF","keyLight":170,"rimLight":100,"spinTilt":18,"flareTime":1.4,"absorption":60,"floatPeriod":6,"streakColor":"#C8D8B4"},
    style,
}: PeridotCoreProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const hitRef = useRef<HTMLDivElement>(null)
    // Merged here, at render, so the loop never allocates them.
    const adv: Advanced = { ...DEFAULT_ADVANCED, ...(advanced ?? {}) }
    const pl: Placement = { ...DEFAULT_PLACEMENT, ...(placement ?? {}) }
    const rs: Response = { ...DEFAULT_RESPONSE, ...(response ?? {}) }
    const live = { shape, scale, tint, coreColor, accentColor, dispersion, speed, direction, adv, pl, rs }
    const liveRef = useRef(live)
    liveRef.current = live
    const wakeRef = useRef<() => void>(() => {})
    const [generation, setGeneration] = useState(0)

    // Framer re-renders often with nothing changed; only a real change draws.
    const key = JSON.stringify(live)
    const keyRef = useRef("")
    useEffect(() => {
        if (key === keyRef.current) return
        keyRef.current = key
        wakeRef.current()
    })

    useEffect(() => {
        const rootEl = rootRef.current
        const canvasEl = canvasRef.current
        const hitEl = hitRef.current
        if (!rootEl || !canvasEl) return
        const ctx = canvasEl.getContext("webgl2", {
            antialias: false,
            alpha: true,
            premultipliedAlpha: false,
            depth: false,
            stencil: false,
            powerPreference: "low-power",
            preserveDrawingBuffer: false,
        })
        if (!ctx) return
        const root: HTMLDivElement = rootEl
        const canvas: HTMLCanvasElement = canvasEl
        const gl: WebGL2RenderingContext = ctx

        let disposed = false
        let raf = 0
        const vao = gl.createVertexArray()
        const progs = new Map<ShapeName, Prog | null>()

        const compile = (type: number, src: string) => {
            const s = gl.createShader(type)!
            gl.shaderSource(s, src)
            gl.compileShader(s)
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                const log = gl.getShaderInfoLog(s)
                gl.deleteShader(s)
                throw new Error("shader: " + log)
            }
            return s
        }
        // One program per solid: its planes are constants in the shader, so the
        // plane loops unroll and never index a uniform array.
        const progFor = (s: ShapeName): Prog | null => {
            if (progs.has(s)) return progs.get(s) ?? null
            let out: Prog | null = null
            try {
                const vs = compile(gl.VERTEX_SHADER, VERT)
                const fs = compile(gl.FRAGMENT_SHADER, fragFor(s))
                const prog = gl.createProgram()!
                gl.attachShader(prog, vs)
                gl.attachShader(prog, fs)
                gl.linkProgram(prog)
                gl.deleteShader(vs)
                gl.deleteShader(fs)
                if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(prog))
                const slots = {} as Prog["slots"]
                for (const n of NAMES) slots[n] = { loc: gl.getUniformLocation(prog, n), v: new Float64Array(4).fill(NaN) }
                out = { prog, slots }
            } catch (err) {
                // The Background stays showing; the component just has no gem.
                if (!gl.isContextLost()) console.error("PeridotCore:", err)
            }
            progs.set(s, out)
            return out
        }

        // The studio map. Half-float when the GPU can render to it; otherwise
        // 8-bit with a shared multiplier in alpha (RGBM), decoded in the shader.
        let envTex: WebGLTexture | null = null
        let envFbo: WebGLFramebuffer | null = null
        let envRGBM = false
        let bakeProg: WebGLProgram | null = null
        const bakeLoc: Record<string, WebGLUniformLocation | null> = {}
        // What the map was last baked for.
        let bkKc: number[] | null = null
        let bkCc: number[] | null = null
        const bkN = new Float64Array(5).fill(NaN)
        try {
            const vs = compile(gl.VERTEX_SHADER, BAKE_VERT)
            const fs = compile(gl.FRAGMENT_SHADER, bakeFrag())
            bakeProg = gl.createProgram()!
            gl.attachShader(bakeProg, vs)
            gl.attachShader(bakeProg, fs)
            gl.linkProgram(bakeProg)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            if (!gl.getProgramParameter(bakeProg, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(bakeProg))
            for (const n of ["uSize", "uAmb", "uSC", "uSU", "uSHS", "uSCol", "uRGBM"]) bakeLoc[n] = gl.getUniformLocation(bakeProg, n)
            const makeTarget = (half: boolean) => {
                const t = gl.createTexture()
                gl.bindTexture(gl.TEXTURE_2D, t)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
                if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, ENV_W, ENV_H, 0, gl.RGBA, gl.HALF_FLOAT, null)
                else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, ENV_W, ENV_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
                const f = gl.createFramebuffer()
                gl.bindFramebuffer(gl.FRAMEBUFFER, f)
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
                const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
                gl.bindFramebuffer(gl.FRAMEBUFFER, null)
                if (!ok) {
                    gl.deleteTexture(t)
                    gl.deleteFramebuffer(f)
                    return false
                }
                envTex = t
                envFbo = f
                return true
            }
            const half = !!gl.getExtension("EXT_color_buffer_float") && makeTarget(true)
            if (!half) {
                envRGBM = true
                makeTarget(false)
            }
        } catch (err) {
            if (!gl.isContextLost()) console.error("PeridotCore:", err)
        }
        const sC = new Float32Array(STUDIO.length * 3)
        const sU = new Float32Array(STUDIO.length * 3)
        const sHS = new Float32Array(STUDIO.length * 3)
        const sCol = new Float32Array(STUDIO.length * 3)
        const bakeDir = [0, 0, 1]
        const bakeAxis = [1, 0, 0]
        function bake(keyAz: number, kc: number[], kk: number, rim: number, amb: number, ccol: number[], glowK0: number) {
            if (!bakeProg || !envFbo) return
            for (let i = 0; i < STUDIO.length; i++) {
                const bl = STUDIO[i]
                if (bl.role === "key") keyDirInto(keyAz, bakeDir)
                else normInto(bl.c, bakeDir)
                sC.set(bakeDir, i * 3)
                axisInto(bakeDir, bl.roll ?? 0, bakeAxis)
                sU.set(bakeAxis, i * 3)
                sHS[i * 3] = bl.hs[0]
                sHS[i * 3 + 1] = bl.hs[1]
                sHS[i * 3 + 2] = bl.hs[2]
                for (let k = 0; k < 3; k++)
                    sCol[i * 3 + k] =
                        bl.role === "key" ? kc[k] * kk : bl.role === "rim" ? bl.col[k] * rim : bl.role === "core" ? ccol[k] * bl.col[0] * glowK0 : bl.col[k]
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, envFbo)
            gl.viewport(0, 0, ENV_W, ENV_H)
            gl.useProgram(bakeProg)
            gl.bindVertexArray(vao)
            gl.uniform2f(bakeLoc.uSize, ENV_W, ENV_H)
            gl.uniform3f(bakeLoc.uAmb, 0.05 * amb, 0.07 * amb, 0.05 * amb)
            gl.uniform3fv(bakeLoc.uSC, sC)
            gl.uniform3fv(bakeLoc.uSU, sU)
            gl.uniform3fv(bakeLoc.uSHS, sHS)
            gl.uniform3fv(bakeLoc.uSCol, sCol)
            gl.uniform1i(bakeLoc.uRGBM, envRGBM ? 1 : 0)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        }

        // Uniforms upload only when their value changed (Float64 cache, so a JS
        // number compares equal to itself).
        let cur: Prog | null = null
        const f1 = (n: UName, a: number) => {
            const s = cur!.slots[n]
            if (s.v[0] !== a) {
                s.v[0] = a
                gl.uniform1f(s.loc, a)
            }
        }
        const i1 = (n: UName, a: number) => {
            const s = cur!.slots[n]
            if (s.v[0] !== a) {
                s.v[0] = a
                gl.uniform1i(s.loc, a)
            }
        }
        const f2 = (n: UName, a: number, b: number) => {
            const s = cur!.slots[n]
            if (s.v[0] !== a || s.v[1] !== b) {
                s.v[0] = a
                s.v[1] = b
                gl.uniform2f(s.loc, a, b)
            }
        }
        const f3 = (n: UName, a: number, b: number, c: number) => {
            const s = cur!.slots[n]
            if (s.v[0] !== a || s.v[1] !== b || s.v[2] !== c) {
                s.v[0] = a
                s.v[1] = b
                s.v[2] = c
                gl.uniform3f(s.loc, a, b, c)
            }
        }
        const v3 = (n: UName, v: number[], k = 1) => f3(n, v[0] * k, v[1] * k, v[2] * k)

        // Layout size from ResizeObserver only; never read per frame.
        let cssW = Math.max(1, root.offsetWidth)
        let cssH = Math.max(1, root.offsetHeight)
        let dpr = 1
        let quality = 1
        // Resolution per quality level; the two lowest also trace fewer bounces,
        // and the lowest drops the wavelength split and edge supersampling.
        const LEVELS = [1, 0.85, 0.72, 0.6]
        let level = 0
        let bannedUntil = 0
        // How big the frame is shown against its layout size (Framer's canvas
        // zoom, a scaled preview). The buffer never drops below the layout size.
        let shown = 1
        const dims = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array | null
        const maxSide = Math.min(4096, dims?.[0] || 4096, dims?.[1] || 4096)
        const applySize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            const k0 = dpr * clampN(shown, 1, 2)
            const budget = Math.min(1, Math.sqrt(PIXEL_BUDGET / Math.max(1, cssW * cssH * k0 * k0)))
            const sc = Math.min(k0 * budget * quality, maxSide / cssW, maxSide / cssH)
            const w = Math.max(1, Math.round(cssW * sc))
            const h = Math.max(1, Math.round(cssH * sc))
            let changed = false
            if (canvas.width !== w) {
                canvas.width = w
                changed = true
            }
            if (canvas.height !== h) {
                canvas.height = h
                changed = true
            }
            // Setting the size wipes the buffer; redraw now so a paced loop never shows it blank.
            if (changed && !disposed) draw()
        }
        const noteShown = (rw: number) => {
            if (cssW < 4 || rw < 4) return
            const s = clampN(rw / cssW, 0.25, 4)
            if (isFinite(s) && Math.abs(s - shown) > 0.05 * shown) {
                shown = s
                applySize()
                wake()
            }
        }

        // Pointer: handlers only record; the rect is read at most once per frame.
        const ptr = { cx: 0, cy: 0, lx: 0, ly: 0, u: 0.5, v: 0.5, over: false, moved: false, down: false, dragging: false, sx: 0, sy: 0, st: 0, dx: 0, dy: 0 }
        const rect = { left: 0, top: 0, width: 1, height: 1 }
        const onMove = (e: PointerEvent) => {
            // A mouse released outside the window never sends pointerup: the next
            // move arrives with no button held, so end the drag there.
            if (ptr.down && e.pointerType === "mouse" && e.buttons === 0) {
                onUp(e)
                return
            }
            if (e.clientX === ptr.cx && e.clientY === ptr.cy && ptr.over) return
            if (ptr.down) {
                ptr.dx += e.clientX - ptr.cx
                ptr.dy += e.clientY - ptr.cy
                if (Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > 5) ptr.dragging = true
            }
            ptr.cx = e.clientX
            ptr.cy = e.clientY
            ptr.over = true
            ptr.moved = true
            wake()
        }
        const onEnter = (e: PointerEvent) => {
            ptr.cx = e.clientX
            ptr.cy = e.clientY
            ptr.over = true
            ptr.moved = true
            wake()
        }
        const onLeave = () => {
            if (!ptr.down) ptr.over = false
            wake()
        }
        const onDown = (e: PointerEvent) => {
            if (e.button > 0) return
            if (liveRef.current.rs.drag) {
                // Keep the drag ours to the end: capture the pointer, and stop the
                // browser starting a text selection or a native drag, either of
                // which cancels the pointer stream mid-spin.
                if (e.pointerType === "mouse") e.preventDefault()
                try {
                    root.setPointerCapture(e.pointerId)
                } catch {
                    // a synthetic or already-released pointer cannot be captured
                }
                // Grabbing a coasting gem catches it.
                st.wx = 0
                st.wy = 0
                st.wz = 0
                root.style.cursor = "grabbing"
            }
            ptr.down = true
            ptr.dragging = false
            ptr.sx = e.clientX
            ptr.sy = e.clientY
            ptr.st = performance.now()
            ptr.dx = 0
            ptr.dy = 0
            onEnter(e)
        }
        let tapped = false
        let released = false
        function onUp(e: PointerEvent) {
            if (!ptr.down) return
            root.style.cursor = ""
            if (!ptr.dragging && performance.now() - ptr.st < 400) tapped = true
            if (ptr.dragging) released = true
            ptr.down = false
            ptr.dragging = false
            if (e.pointerType !== "mouse") ptr.over = false
            try {
                if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId)
            } catch {
                // already released
            }
            wake()
        }
        const onNoDefault = (e: Event) => {
            if (ptr.down) e.preventDefault()
        }
        const onWinMove = (e: PointerEvent) => {
            if (ptr.down) onMove(e)
        }
        const onScroll = () => {
            if (ptr.over) ptr.moved = true
        }
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointermove", onWinMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)
        root.addEventListener("lostpointercapture", onUp)
        root.addEventListener("dragstart", onNoDefault)
        document.addEventListener("selectstart", onNoDefault)
        window.addEventListener("scroll", onScroll, { passive: true, capture: true })

        const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        let reduced = !!mq?.matches
        const onMq = () => {
            reduced = !!mq?.matches
            wake()
        }
        mq?.addEventListener?.("change", onMq)

        let visible = true
        const io = new IntersectionObserver((es) => {
            const last = es[es.length - 1]
            visible = last.isIntersecting
            noteShown(last.boundingClientRect.width)
            wake()
        })
        io.observe(root)
        const onVis = () => wake()
        document.addEventListener("visibilitychange", onVis)

        const onLost = (e: Event) => {
            e.preventDefault()
            disposed = true
            cancelAnimationFrame(raf)
        }
        const onRestored = () => setGeneration((g) => g + 1)
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        // GPU time per frame, when the browser exposes it: the honest measure of
        // whether this device keeps up (editor jank must not read as a slow GPU).
        const tq = gl.getExtension("EXT_disjoint_timer_query_webgl2") as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null
        // In flight, with the quality level each was issued at: a result from
        // before a step says nothing about the new size.
        const pending: WebGLQuery[] = []
        const pendingLvl: number[] = []

        // ── Motion state ──
        const Q: Quat = [0, 0, 0, 1]
        qRotvec(REST_ROT[0], REST_ROT[1], REST_ROT[2], Q)
        const qa: Quat = [0, 0, 0, 1]
        const qb: Quat = [0, 0, 0, 1]
        const qd: Quat = [0, 0, 0, 1]
        const M = new Float32Array(9)
        const swayV = [0, 0, 1]
        const hitBox = [NaN, NaN, NaN]
        const axisV = [1, 0, 0]
        const o = [0, 0, 0]
        const roO = [0, 0, 0]
        const Mc = new Float32Array(9)
        const qc: Quat = [0, 0, 0, 1]
        const bkC = new Float32Array(BACK.length * 3)
        const bkU = new Float32Array(BACK.length * 3)
        const bkHS = new Float32Array(BACK.length * 3)
        const bkCol = new Float32Array(BACK.length * 3)
        const tmp = [0, 0, 0]
        const st = {
            t: 0,
            // angular velocity, world frame (rad/s)
            wx: 0,
            wy: 0,
            wz: 0,
            primed: false,
            over: 0,
            lx: 0,
            ly: 0,
            lvx: 0,
            lvy: 0,
            gx: 0,
            gy: 0,
            tx: 0,
            ty: 0,
            flare: 0,
        }
        // Recent drag turns for the release velocity: [time ms, x, y, z] × 8.
        const hist = new Float64Array(32)
        let histN = 0
        let histI = 0

        let lastTick = -1
        let due = 0
        let cadence = 16.7
        let gpuEma = 0
        let lateEma = 1
        let startAt = -1
        let probedAt = -1e9
        let banMs = 2500
        let slowMs = 0
        let goodMs = 0
        let frameNo = 0
        let scheduled = false
        let settledNow = false

        function wake() {
            if (disposed || scheduled) return
            scheduled = true
            raf = requestAnimationFrame(loop)
        }
        wakeRef.current = wake

        const ro = new ResizeObserver((entries) => {
            const r = entries[0].contentRect
            cssW = Math.max(1, r.width)
            cssH = Math.max(1, r.height)
            const b = root.getBoundingClientRect()
            rect.left = b.left
            rect.top = b.top
            rect.width = b.width
            rect.height = b.height
            shown = cssW > 4 && b.width > 4 ? clampN(b.width / cssW, 0.25, 4) : shown
            applySize()
            wake()
        })
        ro.observe(root)

        // Physics and pointer: advances the state by dt seconds of real time.
        function step(dt: number, now: number) {
            const L = liveRef.current
            const A = L.adv
            const R = L.rs
            if (ptr.moved || frameNo % 30 === 0) {
                const b = root.getBoundingClientRect()
                rect.left = b.left
                rect.top = b.top
                rect.width = b.width
                rect.height = b.height
                noteShown(b.width)
                if (ptr.moved) {
                    ptr.moved = false
                    ptr.u = (ptr.cx - b.left) / Math.max(1, b.width)
                    ptr.v = (ptr.cy - b.top) / Math.max(1, b.height)
                }
            }
            const rate = reduced ? 0 : clampN(num(L.speed, 5), 0, 10) / 5
            st.t += dt * rate

            // Content frame: the pointer relative to the gem's centre, Angle undone, in gem radii.
            const P = L.pl
            const S = Math.min(cssH, cssW / REF_ASPECT)
            const pxU = GEM_SHARE * S * (clampN(num(L.scale, 100), 20, 140) / 100)
            const sx = (ptr.u - 0.5 - num(P.x, 0) / 100) * cssW
            const sy = -(ptr.v - 0.5 - num(P.y, 0) / 100) * cssH
            const ra = num(P.angle, 0) * D2R
            const ca = Math.cos(ra)
            const sa = Math.sin(ra)
            const px = (ca * sx - sa * sy) / pxU
            const py = (sa * sx + ca * sy) / pxU

            const lean = clampN(num(R.lean, 5), 0, 10) / 10
            const on = ptr.over
            st.over += ((on ? 1 : 0) - st.over) * (1 - Math.exp(-dt * 6))
            if (Math.abs((on ? 1 : 0) - st.over) < 1e-3) st.over = on ? 1 : 0

            // Lean: a damped spring toward the pointer (secondary motion).
            const tx = on && !ptr.down ? clampN(px / 1.6, -1, 1) * lean : 0
            const ty = on && !ptr.down ? clampN(py / 1.6, -1, 1) * lean : 0
            const w0 = 7
            const n = Math.max(1, Math.ceil(dt / (1 / 120)))
            const h = dt / n
            for (let i = 0; i < n; i++) {
                st.lvx += (w0 * w0 * (tx - st.lx) - 2 * w0 * st.lvx) * h
                st.lvy += (w0 * w0 * (ty - st.ly) - 2 * w0 * st.lvy) * h
                st.lx += st.lvx * h
                st.ly += st.lvy * h
            }

            // Glint: follows the cursor in ~40 ms.
            const kg = 1 - Math.exp(-dt * 25)
            st.gx += (clampN(px, -1.2, 1.2) - st.gx) * kg
            st.gy += (clampN(py, -1.2, 1.2) - st.gy) * kg
            st.tx += (px - st.tx) * kg
            st.ty += (py - st.ty) * kg

            // Spin: auto-turn about a tilted axis, a drag turns it 1:1, a flick coasts.
            const tilt = clampN(num(A.spinTilt, 18), -60, 60) * D2R
            const sgn = L.direction === "left" ? -1 : 1
            const omega = 0.06 * clampN(num(L.speed, 5), 0, 10) * sgn * (reduced ? 0 : 1)
            const ax = Math.sin(tilt) * omega
            const ay = Math.cos(tilt) * omega
            if (!st.primed) {
                st.wx = ax
                st.wy = ay
                st.wz = 0
                st.primed = true
            }
            const rpxShown = pxU * Math.max(0.05, rect.width / Math.max(1, cssW))
            if (ptr.down && ptr.dragging && R.drag) {
                // Screen delta → content frame (y up), then a turn of |d| / radius.
                const dxs = ptr.dx
                const dys = -ptr.dy
                ptr.dx = 0
                ptr.dy = 0
                const dxc = ca * dxs - sa * dys
                const dyc = sa * dxs + ca * dys
                const rx = -dyc / rpxShown
                const ry = dxc / rpxShown
                qRotvec(rx, ry, 0, qa)
                qMul(qa, Q, Q)
                qNorm(Q)
                hist[histI * 4] = now
                hist[histI * 4 + 1] = rx
                hist[histI * 4 + 2] = ry
                hist[histI * 4 + 3] = 0
                histI = (histI + 1) % 8
                histN = Math.min(8, histN + 1)
                st.wx = 0
                st.wy = 0
                st.wz = 0
            } else {
                if (released) {
                    // Release velocity: the turns of the last 80 ms, not a smoothed EMA.
                    let sx2 = 0
                    let sy2 = 0
                    let sz2 = 0
                    let t0 = now
                    for (let i = 0; i < histN; i++) {
                        const tt = hist[i * 4]
                        if (now - tt <= 80) {
                            sx2 += hist[i * 4 + 1]
                            sy2 += hist[i * 4 + 2]
                            sz2 += hist[i * 4 + 3]
                            t0 = Math.min(t0, tt)
                        }
                    }
                    const span = Math.max(16, now - t0 + 16) / 1000
                    st.wx = sx2 / span
                    st.wy = sy2 / span
                    st.wz = sz2 / span
                    const wl = Math.hypot(st.wx, st.wy, st.wz)
                    if (wl > 12) {
                        st.wx *= 12 / wl
                        st.wy *= 12 / wl
                        st.wz *= 12 / wl
                    }
                }
                if (ptr.down) {
                    // Held without dragging: hold still under the finger.
                    st.wx *= Math.exp(-dt * 10)
                    st.wy *= Math.exp(-dt * 10)
                    st.wz *= Math.exp(-dt * 10)
                } else {
                    // Coast: exponential friction toward the auto-turn, plus a small
                    // constant pull so the tail ends instead of crawling for seconds.
                    const k = 1 - Math.exp(-dt * 0.9)
                    let ex = (ax - st.wx) * (1 - k)
                    let ey = (ay - st.wy) * (1 - k)
                    let ez = (0 - st.wz) * (1 - k)
                    const el = Math.hypot(ex, ey, ez)
                    const lin = 0.06 * dt
                    const f = el > lin ? (el - lin) / el : 0
                    ex *= f
                    ey *= f
                    ez *= f
                    st.wx = ax - ex
                    st.wy = ay - ey
                    st.wz = -ez
                }
                qRotvec(st.wx * dt, st.wy * dt, st.wz * dt, qa)
                qMul(qa, Q, Q)
                qNorm(Q)
                histN = 0
            }
            released = false

            if (tapped) {
                tapped = false
                if (clampN(num(R.flare, 5), 0, 10) > 0) st.flare = 1
            }
            const ft = Math.max(0.1, num(A.flareTime, 1.4))
            st.flare = Math.max(0, st.flare * Math.exp(-dt / ft) - (dt / ft) * 0.03)

            const springsStill =
                Math.abs(tx - st.lx) + Math.abs(ty - st.ly) + Math.abs(st.lvx) + Math.abs(st.lvy) < 1e-4 &&
                (st.over === 0 || (Math.abs(clampN(px, -1.2, 1.2) - st.gx) + Math.abs(clampN(py, -1.2, 1.2) - st.gy) + Math.abs(px - st.tx) + Math.abs(py - st.ty) < 1e-3))
            settledNow =
                rate === 0 &&
                !ptr.dragging &&
                Math.hypot(st.wx, st.wy, st.wz) < 1e-4 &&
                springsStill &&
                st.flare === 0 &&
                (st.over === 0 || st.over === 1)
        }

        function draw() {
            if (gl.isContextLost()) return
            const L = liveRef.current
            const A = L.adv
            const P = L.pl
            const R = L.rs
            const pr = progFor(L.shape)
            const W = gl.drawingBufferWidth
            const H = gl.drawingBufferHeight
            gl.viewport(0, 0, W, H)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            if (!pr) return
            cur = pr
            gl.useProgram(pr.prog)
            gl.bindVertexArray(vao)

            const bscale = W / cssW
            // Contained unit: the height, or the width over the reference aspect in a narrower frame.
            const S = Math.min(cssH, cssW / REF_ASPECT) * bscale
            const pxU = GEM_SHARE * S * (clampN(num(L.scale, 100), 20, 140) / 100)
            const cam = clampN(num(A.distance, 53), 25, 200) / 10

            // Display orientation: Placement Tilt, then the lean, then the spinning body.
            const R2 = LEAN_MAX * D2R
            qRotvec(-clampN(num(P.tilt, 0), -90, 90) * D2R, 0, 0, qa)
            qRotvec(-st.ly * R2, st.lx * R2, 0, qb)
            qMul(qa, qb, qd)
            qMul(qd, Q, qd)
            qMat(qd, M)

            const flo = clampN(num(A.float, 3), 0, 20) / 100
            const fp = Math.max(0.5, num(A.floatPeriod, 6))
            const bob = flo * Math.sin((2 * Math.PI * st.t) / fp)
            tmp[0] = 0
            tmp[1] = -bob
            tmp[2] = cam
            toObj(M, tmp, roO)

            const ra = num(P.angle, 0) * D2R
            const cx = W * 0.5 + (num(P.x, 0) / 100) * W
            const cy = H * 0.5 - (num(P.y, 0) / 100) * H
            const rad = pxU * (1.03 + Math.abs(bob))
            const streak = (clampN(num(A.streaks, 50), 0, 200) / 100) * 0.22 * (1 + 1.5 * st.flare)

            f2("uRes", W, H)
            f2("uCentre", cx, cy)
            // Keep the touch hit area on the gem (CSS px), only when it moved.
            if (hitEl) {
                const hr = (pxU * 1.03) / bscale
                const hl = cx / bscale - hr
                const ht = (H - cy) / bscale - hr
                if (Math.abs(hl - hitBox[0]) + Math.abs(ht - hitBox[1]) + Math.abs(hr - hitBox[2]) > 0.5) {
                    hitBox[0] = hl
                    hitBox[1] = ht
                    hitBox[2] = hr
                    hitEl.style.transform = `translate(${hl}px, ${ht}px)`
                    hitEl.style.width = `${2 * hr}px`
                    hitEl.style.height = `${2 * hr}px`
                }
            }
            f2("uRoll", Math.cos(ra), Math.sin(ra))
            // The quad covers the gem, and a full-height strip for the light leaks.
            // Wide enough for the hover halo to fade out before the quad's edge.
            f2("uHalf", rad * 1.4 + 2, streak > 0 ? Math.hypot(W, H) : rad * 1.4 + 2)
            f1("uPxU", pxU)
            f1("uCam", cam)
            gl.uniformMatrix3fv(pr.slots.uInv.loc, false, M)
            v3("uRoO", roO)
            f2("uBob", 0, bob * pxU)

            const ior = clampN(num(A.ior, 152), 100, 250) / 100
            const fl = clampN(num(R.flare, 5), 0, 10) / 5
            const disp = (clampN(num(L.dispersion, 35), 0, 100) / 100) * 0.06 * (1 + 0.8 * st.flare * fl)
            f3("uIor", ior - disp, ior, ior + disp)
            i1("uNC", disp > 1e-4 && level < 3 ? 3 : 1)
            const bn = Math.round(clampN(num(A.bounces, 6), 1, 8))
            i1("uBounces", level >= 3 ? Math.min(bn, 3) : level >= 2 ? Math.min(bn, 4) : bn)
            i1("uAA", level >= 3 ? 0 : 1)
            const bev = clampN(num(A.bevel, 20), 0, 80) / 1000
            f1("uBevel", bev)
            // Circular profile reaching the bisector at the edge: radius = width / tan(half angle).
            const halfA = 0.5 * Math.asin(SHAPE_SINA[L.shape] ?? SHAPE_SINA.dodecahedron)
            f1("uBevelK", bev > 0 ? Math.tan(halfA) / bev : 0)
            const tn = toLin(L.tint, FB_TINT)
            const ab = (clampN(num(A.absorption, 30), 0, 300) / 100) * 0.6
            f3("uAbsorb", -Math.log(Math.max(0.02, tn[0])) * ab, -Math.log(Math.max(0.02, tn[1])) * ab, -Math.log(Math.max(0.02, tn[2])) * ab)
            f1("uExpo", (clampN(num(A.exposure, 100), 10, 400) / 100) * 1.1)

            // The studio map: rebaked only when a light setting changes.
            const kc = toLin(A.keyColor, FB_KEY)
            const ccol = toLin(L.coreColor, FB_CORE)
            const acol = toLin(L.accentColor, FB_ACC)
            const glowK0 = clampN(num(A.coreGlow, 100), 0, 400) / 100
            const kk = KEY_BASE * (clampN(num(A.keyLight, 100), 0, 400) / 100)
            const rim = clampN(num(A.rimLight, 100), 0, 400) / 100
            const amb = clampN(num(A.ambient, 100), 0, 400) / 100
            const keyAz = num(A.keyAngle, -128)
            // toLin returns one cached array per colour string, so identity is equality.
            const stale =
                kc !== bkKc || ccol !== bkCc || keyAz !== bkN[0] || kk !== bkN[1] || rim !== bkN[2] || amb !== bkN[3] || glowK0 !== bkN[4]
            if (stale && envTex) {
                bkKc = kc
                bkCc = ccol
                bkN[0] = keyAz
                bkN[1] = kk
                bkN[2] = rim
                bkN[3] = amb
                bkN[4] = glowK0
                bake(keyAz, kc, kk, rim, amb, ccol, glowK0)
                cur = pr
                gl.useProgram(pr.prog)
                gl.bindVertexArray(vao)
                gl.viewport(0, 0, W, H)
            }
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, envTex)
            i1("uEnv", 0)
            i1("uRGBM", envRGBM ? 1 : 0)
            // Object → world, for the map lookup.
            gl.uniformMatrix3fv(pr.slots.uRotW.loc, true, M)

            // Core and accent lights brighten on hover and flare on a tap.
            const lightK = glowK0 * (1 + 0.08 * st.over + 2.2 * st.flare * fl)
            const accK = glowK0 * (1 + 1.6 * st.flare * fl)
            // The lights behind the gem sway a few degrees on two slow, unrelated
            // periods, so the shards drift through the facets as it turns.
            const swA = SWAY * Math.sin(st.t * 0.55)
            const swB = SWAY * 0.7 * Math.sin(st.t * 0.41)
            const cA = Math.cos(swA)
            const sA = Math.sin(swA)
            const cB = Math.cos(swB)
            const sB = Math.sin(swB)
            swayV[0] = 0
            swayV[1] = 0
            swayV[2] = -1
            swayInto(swayV, cA, sA, cB, sB)
            v3("uBackDir", swayV)
            f1("uBackCos", BACK_GATE)
            for (let i = 0; i < BACK.length; i++) {
                const bl = BACK[i]
                normInto(bl.c, swayV)
                swayInto(swayV, cA, sA, cB, sB)
                bkC.set(swayV, i * 3)
                axisInto(swayV, bl.roll ?? 0, axisV)
                bkU.set(axisV, i * 3)
                bkHS[i * 3] = bl.hs[0]
                bkHS[i * 3 + 1] = bl.hs[1]
                bkHS[i * 3 + 2] = bl.hs[2]
                for (let k = 0; k < 3; k++)
                    bkCol[i * 3 + k] =
                        bl.role === "core" ? ccol[k] * bl.col[0] * lightK : bl.role === "accent" ? acol[k] * bl.col[0] * accK : bl.col[k]
            }
            gl.uniform3fv(pr.slots.uBkC.loc, bkC)
            gl.uniform3fv(pr.slots.uBkU.loc, bkU)
            gl.uniform3fv(pr.slots.uBkHS.loc, bkHS)
            gl.uniform3fv(pr.slots.uBkCol.loc, bkCol)

            // The core turns slowly against the glass, so the shards keep shifting
            // even while the gem itself is held still by a drag.
            qRotvec(CORE_ROT[0], CORE_ROT[1], CORE_ROT[2], qa)
            qRotvec(0, -0.35 * st.t * 0.3, 0, qb)
            qMul(qb, qa, qc)
            qMat(qc, Mc)
            gl.uniformMatrix3fv(pr.slots.uCoreRot.loc, false, Mc)
            f1("uCoreS", clampN(num(A.coreSize, 45), 0, 80) / 100)
            // World up → object → core frame.
            toObj(M, UP, tmp)
            toObj(Mc, tmp, o)
            v3("uCoreUp", o)
            const glowK = clampN(num(A.coreGlow, 100), 0, 400) / 100
            const coreK = CORE_K * glowK * (1 + 0.15 * st.over + 2.2 * st.flare * fl)
            v3("uCoreCol", toLin(L.coreColor, FB_CORE), coreK)
            v3("uAccCol", toLin(L.accentColor, FB_ACC), ACC_K * glowK * (1 + 1.6 * st.flare * fl))
            f1("uCoreGlow", 0.08 * (1 + 1.5 * st.flare * fl))

            // Glint: a small light placed so a sphere through the gem's outline
            // would mirror it right under the cursor.
            const g2 = st.gx * st.gx + st.gy * st.gy
            const gs = g2 > 0.9 ? Math.sqrt(0.9 / g2) : 1
            const nx = st.gx * gs
            const ny = st.gy * gs
            const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
            tmp[0] = 2 * nz * nx
            tmp[1] = 2 * nz * ny
            tmp[2] = 2 * nz * nz - 1
            // World frame, as the map lookup.
            v3("uGlC", tmp)
            f1("uGlR", GLINT_COS)
            // Hover light takes the gem's own colours: core mostly, a touch of accent (display space).
            const gw = (clampN(num(R.glint, 5), 0, 10) / 5) * st.over
            const hc0 = 0.8 * Math.pow(ccol[0], 1 / 2.2) + 0.2 * Math.pow(acol[0], 1 / 2.2)
            const hc1 = 0.8 * Math.pow(ccol[1], 1 / 2.2) + 0.2 * Math.pow(acol[1], 1 / 2.2)
            const hc2 = 0.8 * Math.pow(ccol[2], 1 / 2.2) + 0.2 * Math.pow(acol[2], 1 / 2.2)
            // Softer facet flashes (was 8): bright enough to sparkle, not to pop out of the glass.
            const gk = 3.5 * gw * (reduced ? 0.5 : 1)
            f3("uGlCol", gk * (0.7 + 0.3 * hc0), gk * (0.7 + 0.3 * hc1), gk * (0.7 + 0.3 * hc2))
            // Torch sheen: content-frame buffer px, about a quarter of the gem across.
            f3("uTorch", st.tx * pxU, st.ty * pxU, pxU * 0.28)
            const tk = 0.55 * gw
            f3("uTorchCol", tk * (0.65 + 0.35 * hc0), tk * (0.65 + 0.35 * hc1), tk * (0.65 + 0.35 * hc2))
            const hk = 0.3 * gw
            f3("uHalo", hk * hc0, hk * hc1, hk * hc2)

            f1("uStreak", streak)
            v3("uStreakCol", toLin(A.streakColor, FB_LEAK))
            f1("uTime", st.t)

            const timing = tq && pending.length < 4
            let q: WebGLQuery | null = null
            if (timing) {
                q = gl.createQuery()
                if (q) gl.beginQuery(tq!.TIME_ELAPSED_EXT, q)
            }
            gl.drawArrays(gl.TRIANGLES, 0, 6)
            if (q) {
                gl.endQuery(tq!.TIME_ELAPSED_EXT)
                pending.push(q)
                pendingLvl.push(level)
            }
        }

        function pollGpu() {
            if (!tq || !pending.length) return
            const q = pending[0]
            if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) return
            const disjoint = gl.getParameter(tq.GPU_DISJOINT_EXT)
            const ms = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6
            gl.deleteQuery(q)
            pending.shift()
            const lv = pendingLvl.shift()
            if (!disjoint && frameNo > 30 && lv === level) gpuEma = gpuEma ? gpuEma + (ms - gpuEma) * 0.15 : ms
        }

        function loop(now: number) {
            scheduled = false
            if (disposed || !visible || document.hidden) {
                lastTick = -1
                return
            }
            if (lastTick >= 0) cadence = Math.min(cadence + (now - lastTick - cadence) * 0.05, Math.max(4, now - lastTick) + 0.2)
            // Paced with an accumulator: 60 fps while things move quickly, 30 fps
            // for a slow idle turn, nothing once settled.
            const S = Math.min(cssH, cssW / REF_ASPECT)
            const edgeSpeed = Math.hypot(st.wx, st.wy, st.wz) * GEM_SHARE * S
            const slow = !ptr.down && st.over === 0 && st.flare === 0 && edgeSpeed < 25
            const period = slow ? 1000 / 30 : 1000 / 60
            if (lastTick >= 0 && now < due - 3) {
                wake()
                return
            }
            due = lastTick < 0 || now - due > 50 ? now + period : due + period
            const dt = lastTick < 0 ? 0 : Math.min((now - lastTick) / 1000, 1 / 20)
            const gapMs = lastTick < 0 ? 0 : Math.min(now - lastTick, 250)
            lastTick = now
            frameNo++

            pollGpu()
            // Quality budget. Step down when drawn frames arrive late against the
            // paced period and (where the GPU timer exists) this component's own
            // GPU time is a real share of the frame, so editor jank on the main
            // thread never costs resolution. An iGPU downclocks under light load
            // and its timer then reads slow while every frame lands on time, so
            // climbing does not trust the timer: after 4 s of on-time frames it
            // probes one level up, and a probe that fails bans that level for
            // twice as long as the last one.
            const ms = gapMs
            if (gapMs > 0) lateEma += (gapMs / period - lateEma) * 0.1
            if (startAt < 0) startAt = now
            if (frameNo > 30 && now - startAt > 2500) {
                const gpuBusy = !tq || gpuEma <= 0 || gpuEma > 0.6 * (1000 / 60)
                const slow = lateEma > 1.3 && gpuBusy
                const good = lateEma < 1.15
                if (slow) {
                    slowMs += ms
                    goodMs = 0
                } else if (good) {
                    goodMs += ms
                    slowMs = 0
                } else {
                    slowMs = 0
                    goodMs = 0
                }
                if (slowMs > (tq ? 1000 : 1500) && level < LEVELS.length - 1) {
                    // Falling straight back from a probe: ban that level for longer.
                    if (now - probedAt < 3000) {
                        banMs = Math.min(60000, banMs * 2)
                        bannedUntil = now + banMs
                    }
                    level++
                    quality = LEVELS[level]
                    slowMs = 0
                    gpuEma = 0
                    lateEma = 1
                    applySize()
                } else if (goodMs > 4000 && level > 0 && now > bannedUntil) {
                    level--
                    probedAt = now
                    quality = LEVELS[level]
                    goodMs = 0
                    gpuEma = 0
                    lateEma = 1
                    applySize()
                }
            }

            step(dt, now)
            draw()
            if (!settledNow) wake()
        }
        applySize()
        wake()

        return () => {
            disposed = true
            wakeRef.current = () => {}
            cancelAnimationFrame(raf)
            ro.disconnect()
            io.disconnect()
            root.removeEventListener("pointerenter", onEnter)
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onWinMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            root.removeEventListener("lostpointercapture", onUp)
            root.removeEventListener("dragstart", onNoDefault)
            document.removeEventListener("selectstart", onNoDefault)
            window.removeEventListener("scroll", onScroll, { capture: true })
            mq?.removeEventListener?.("change", onMq)
            document.removeEventListener("visibilitychange", onVis)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            if (gl.isContextLost()) return
            for (const q of pending) gl.deleteQuery(q)
            pending.length = 0
            for (const p of progs.values()) if (p) gl.deleteProgram(p.prog)
            if (bakeProg) gl.deleteProgram(bakeProg)
            if (envTex) gl.deleteTexture(envTex)
            if (envFbo) gl.deleteFramebuffer(envFbo)
            if (vao) gl.deleteVertexArray(vao)
        }
    }, [generation])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                // Only bites when the parent leaves the height open.
                aspectRatio: `${REF_W} / ${REF_H}`,
                ...style,
                overflow: "hidden",
                background,
                touchAction: "pan-y",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTapHighlightColor: "transparent",
            }}
        >
            {/* Over the gem only: touch-action none, so a finger can spin it on
                both axes while the rest of the frame still scrolls the page.
                Placed imperatively from the loop when the gem moves. */}
            <div
                ref={hitRef}
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                    borderRadius: "50%",
                    touchAction: rs.drag ? "none" : "pan-y",
                    cursor: rs.drag ? "grab" : undefined,
                }}
            />
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}

// Control order arranged in the builder.
