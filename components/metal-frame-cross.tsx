"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * METAL FRAME CROSS — a wire cube that grows six square tubes.
 *
 * The reference's fourth "+" is the hollow one: an open box cross with a
 * square window down every arm. Built as seven rigid parts — a twelve-bar cube
 * frame that never moves, and six four-bar tubes that slide out along the axes
 * — so the seed state is just the cube frame and the assembled state is the
 * open cross.
 *
 * ── THE ARM BARS ARE THINNER THAN THE FRAME BARS, DELIBERATELY ────────────
 * At Travel 0 each arm tube occupies exactly the same four lines as the frame
 * bars it hides inside. Equal thickness would put two sets of faces on the
 * same planes and the seed frame would z-fight along every edge. The arm bars
 * are 0.10 against the frame's 0.12, so they are strictly interior at rest and
 * no two faces are ever coincident. The 17% difference is visible at full
 * extension and reads as a nested tube, which is what it is.
 *
 * Bars are 0.62 half-length against a 0.5 frame half-size, so the corners
 * close instead of leaving a notch, and an extended arm overlaps the frame it
 * grew out of rather than floating free of it.
 */

/* ---------------------------------------------------------------- constants */

/** Device pixel ratio cap. Chamfered edges show stair-stepping on the
 *  silhouette long before the shading does, so MSAA carries most of the load
 *  and 2 is plenty. */
const DPR_CAP = 2

/** Seconds per assemble/hold/collapse cycle at Speed 50 — the rate the loader
 *  shipped at, measured off the reference at 3.45s. */
const CYCLE_SEC_AT_50 = 3.45

/** How the non-hold part of the cycle divides. Measured from the reference:
 *  of the 51% that is not hold, 31% is the outward move, 29% the retract, and
 *  40% the pause on the seed. */
const F_EXPAND = 0.31
const F_COLLAPSE = 0.29
const F_REST = 0.4

/** Camera azimuth. Fixed, not a control: 45 deg with the default pitch is the
 *  isometric view the reference is drawn in, and Spin already covers wanting a
 *  different angle. */
const YAW_DEG = 45

/** Vertical field of view. Deliberately NOT orthographic: the perspective is
 *  what makes the view vector vary across a face, and without it a flat mirror
 *  face samples one direction and renders as one flat patch of colour. */
const FOV_DEG = 28

/** Chamfer, in world units, on every box in the scene. The single most
 *  load-bearing number in the geometry: a perfect box has three visible
 *  normals from any camera, so a mirror material renders it as three flat
 *  tonal patches, and at axis-aligned spin angles it drops to two and reads as
 *  a black-and-white graphic. A chamfer adds a facet at every edge whose
 *  normal sweeps the full 90 degrees between its neighbours, so each edge
 *  catches the horizon as a bright line. That line is what says metal. */
const CHAMFER = 0.045

/** Scene clock wrap. Only values mod one period are ever read, so this is
 *  invisible, and it keeps a long session out of the range where a float
 *  loses resolution. */
const TAU = Math.PI * 2

/** Cube frame half-size, bar half-thicknesses, bar half-length. */
const FRAME = 0.5
const BAR_FRAME = 0.12
const BAR_ARM = 0.1
const BAR_LEN = FRAME + BAR_FRAME

/** How far an arm tube travels at Travel 100. One frame width, so the extended
 *  arm still overlaps the frame and the cross reads as one body. */
const ARM_STEP = 0.92

const PART_COUNT = 7

/** Arm directions, in part order after the frame itself. */
const DIRS: V3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

/* ------------------------------------------------------------------ shaders */

/** Rigid parts are posed on the CPU and handed over as a quaternion and an
 *  offset each. The lookup is written as a bounded loop with a constant index
 *  rather than uQ[pid]: dynamic indexing of a uniform array is legal in a
 *  GLSL ES 1.0 vertex shader but not universally reliable, and this compiles
 *  to the same thing everywhere. */
const VERT = `
precision highp float;
attribute vec3 aPos;
attribute vec3 aNrm;
attribute float aPart;
uniform vec4 uQ[7];
uniform vec3 uT[7];
uniform float uSpin;
uniform float uYaw;
uniform float uPitch;
uniform float uRoll;
uniform float uDist;
uniform float uFov;
uniform float uAspect;
varying vec3 vN;
varying vec3 vP;
vec3 qrot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
vec3 rotZ(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }
void main() {
  int pid = int(aPart + 0.5);
  vec4 q = uQ[0];
  vec3 t = uT[0];
  for (int k = 1; k < 7; k++) {
    if (k == pid) { q = uQ[k]; t = uT[k]; }
  }
  vec3 pl = qrot(q, aPos) + t;
  vec3 pw = rotY(pl, uSpin);
  vN = rotY(qrot(q, aNrm), uSpin);
  vP = pw;
  vec3 v = rotX(rotY(pw, -uYaw), uPitch);
  v.z -= uDist;
  v = rotZ(v, uRoll);
  float f = 1.0 / tan(uFov * 0.5);
  float zn = 0.05;
  float zf = 200.0;
  gl_Position = vec4(
    v.x * f / uAspect,
    v.y * f,
    ((zf + zn) / (zn - zf)) * v.z + (2.0 * zf * zn) / (zn - zf),
    -v.z
  );
}
`

/** Identical in every component of this family, so a Rosette and a Pinwheel
 *  dropped on the same artboard are visibly the same metal. */
const FRAG = `
precision highp float;
varying vec3 vN;
varying vec3 vP;
uniform vec3 uCamPos;
uniform vec3 uBase;
uniform float uRough;
uniform float uReflect;

const float PI = 3.14159265359;

// The environment IS the material. A box face has one normal, so the GGX lobes
// below are nearly constant across it — a flat mirror face either flashes
// whole or stays dark, and directional lights alone render as matte paint.
// What makes chrome read as chrome is structure in what it reflects: a HARD
// horizon, and a few bright softboxes that land as crisp blobs.
const vec3 SKY_LOW = vec3(0.30, 0.35, 0.47);
const vec3 SKY_HIGH = vec3(0.80, 0.84, 0.95);
const vec3 GROUND_DEEP = vec3(0.0035, 0.0038, 0.0050);
const vec3 GROUND_NEAR = vec3(0.052, 0.055, 0.066);
const vec3 HORIZON = vec3(0.55, 0.53, 0.49);

// Softbox directions, aimed at the REFLECTION vectors the visible faces
// actually produce at the resting camera — up-back-left for the tops, and the
// two low directions the front side faces mirror into. Aimed anywhere else the
// blobs land off-screen and every face renders as a flat plate.
const vec3 BOX_A_DIR = vec3(-0.5774, 0.5774, -0.5774);
const vec3 BOX_B_DIR = vec3(0.5774, -0.5774, -0.5774);
const vec3 BOX_C_DIR = vec3(-0.5774, -0.5774, 0.5774);
const vec3 BOX_A = vec3(1.90, 1.90, 1.96);
const vec3 BOX_B = vec3(1.30, 1.26, 1.20);
const vec3 BOX_C = vec3(1.00, 1.03, 1.12);

float boxLobe(vec3 R, vec3 d, float sharp) {
  return pow(max(dot(R, d), 0.0), sharp);
}

vec3 envSample(vec3 R, float r) {
  float t = clamp(R.y * 0.5 + 0.5, 0.0, 1.0);
  // The floor is a lit studio sweep, not a void. A hard cut straight to black
  // renders every vertical face as black plastic under a white lid.
  vec3 ground = mix(GROUND_DEEP, GROUND_NEAR, smoothstep(-0.85, -0.02, R.y));
  vec3 sky = mix(SKY_LOW, SKY_HIGH, smoothstep(0.02, 0.90, R.y));
  // The horizon edge is the signature of a mirror. Roughness is the ONLY thing
  // that softens it, which is what makes the Roughness dial legible.
  float e = 0.006 + 0.45 * r * r;
  vec3 c = mix(ground, sky, smoothstep(0.5 - e, 0.5 + e, t));
  c += HORIZON * exp(-(R.y * R.y) / (0.004 + 0.30 * r * r)) * (1.0 - 0.6 * r);
  c += BOX_A * boxLobe(R, BOX_A_DIR, mix(500.0, 5.0, r));
  c += BOX_B * boxLobe(R, BOX_B_DIR, mix(260.0, 4.0, r));
  c += BOX_C * boxLobe(R, BOX_C_DIR, mix(200.0, 3.0, r));
  return c;
}

float dGGX(float NoH, float a) {
  float a2 = a * a;
  float d = NoH * NoH * (a2 - 1.0) + 1.0;
  return a2 / (PI * d * d);
}

float vSmith(float NoV, float NoL, float a) {
  float a2 = a * a;
  float gv = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2);
  float gl = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
  return 0.5 / max(gv + gl, 1e-5);
}

vec3 fSchlick(vec3 f0, float u) { return f0 + (1.0 - f0) * pow(1.0 - u, 5.0); }

vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

vec3 srgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

vec3 lightTerm(vec3 N, vec3 V, vec3 L, vec3 f0, float a, vec3 col) {
  vec3 H = normalize(L + V);
  float NoL = max(dot(N, L), 0.0);
  float NoV = max(dot(N, V), 1e-4);
  float NoH = max(dot(N, H), 0.0);
  float VoH = max(dot(V, H), 0.0);
  return dGGX(NoH, a) * vSmith(NoV, NoL, a) * fSchlick(f0, VoH) * col * NoL;
}

void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(uCamPos - vP);
  float r = clamp(uRough, 0.03, 1.0);
  float a = r * r;
  vec3 f0 = clamp(uBase * uReflect, vec3(0.0), vec3(1.0));
  float NoV = max(dot(N, V), 1e-4);
  vec3 R = reflect(-V, N);
  vec3 Fe = f0 + (max(vec3(1.0 - r), f0) - f0) * pow(1.0 - NoV, 5.0);
  vec3 col = envSample(R, r) * Fe;
  // Two directional glints, aimed at the two front softboxes so a lit edge and
  // its reflection agree. Deliberately weak: on flat faces the env does the work.
  col += lightTerm(N, V, BOX_A_DIR, f0, a, vec3(0.55, 0.55, 0.57));
  col += lightTerm(N, V, BOX_B_DIR, f0, a, vec3(0.22, 0.21, 0.20));
  gl_FragColor = vec4(srgb(aces(col)), 1.0);
}
`

/* -------------------------------------------------------------- geometry kit */

type V3 = [number, number, number]
type Quat = [number, number, number, number]

export const QI: Quat = [0, 0, 0, 1]

export function qAxis(axis: V3, ang: number): Quat {
  const l = Math.hypot(axis[0], axis[1], axis[2]) || 1
  const s = Math.sin(ang / 2)
  return [(axis[0] / l) * s, (axis[1] / l) * s, (axis[2] / l) * s, Math.cos(ang / 2)]
}

export function qMul(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ]
}

/** Same formula the vertex shader uses, so a CPU-side assertion about where a
 *  part lands is an assertion about what the GPU will draw. */
export function qRot(q: Quat, v: V3): V3 {
  const t: V3 = [
    2 * (q[1] * v[2] - q[2] * v[1]),
    2 * (q[2] * v[0] - q[0] * v[2]),
    2 * (q[0] * v[1] - q[1] * v[0]),
  ]
  return [
    v[0] + q[3] * t[0] + (q[1] * t[2] - q[2] * t[1]),
    v[1] + q[3] * t[1] + (q[2] * t[0] - q[0] * t[2]),
    v[2] + q[3] * t[2] + (q[0] * t[1] - q[1] * t[0]),
  ]
}

/** Compose parent then child: world = P(C(local)). */
export function compose(
  pq: Quat,
  pt: V3,
  cq: Quat,
  ct: V3
): { q: Quat; t: V3 } {
  const rt = qRot(pq, ct)
  return { q: qMul(pq, cq), t: [rt[0] + pt[0], rt[1] + pt[1], rt[2] + pt[2]] }
}

/** A hinge: rotate by q about the world point pivot. */
export function hinge(q: Quat, pivot: V3): { q: Quat; t: V3 } {
  const r = qRot(q, pivot)
  return { q, t: [pivot[0] - r[0], pivot[1] - r[1], pivot[2] - r[2]] }
}

export interface Mesh {
  pos: number[]
  nrm: number[]
  part: number[]
  idx: number[]
}

export const emptyMesh = (): Mesh => ({ pos: [], nrm: [], part: [], idx: [] })

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

/**
 * One chamfered box: six inset faces, twelve edge facets, eight corner facets.
 * Because both tangent insets are the same CHAMFER, every edge and corner cut
 * is a true 45 degree bevel and its normal is the exact bisector — no
 * approximation, which is why the winding assertion can demand a dot of 1.
 *
 * Facets are emitted in whatever order is convenient and REVERSED if their
 * geometric normal disagrees with the intended one. That is cheaper to get
 * right than three hand-derived winding rules, and the probe re-checks all of
 * them anyway.
 */
export function chamferedBox(
  m: Mesh,
  half: V3,
  centre: V3,
  part: number,
  chamfer: number = CHAMFER
) {
  const c = Math.min(chamfer, Math.min(half[0], Math.min(half[1], half[2])) * 0.49)
  const h = half
  const i: V3 = [h[0] - c, h[1] - c, h[2] - c]

  const facet = (verts: V3[], n: V3) => {
    const [p0, p1, p2] = verts
    const e1: V3 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]
    const e2: V3 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]]
    const g: V3 = [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0],
    ]
    const ordered =
      g[0] * n[0] + g[1] * n[1] + g[2] * n[2] >= 0 ? verts : verts.slice().reverse()
    const base = m.pos.length / 3
    for (const v of ordered) {
      m.pos.push(v[0] + centre[0], v[1] + centre[1], v[2] + centre[2])
      m.nrm.push(n[0], n[1], n[2])
      m.part.push(part)
    }
    for (let k = 1; k < ordered.length - 1; k++) m.idx.push(base, base + k, base + k + 1)
  }

  const at = (a: number, av: number, b: number, bv: number, w: number, wv: number): V3 => {
    const p: V3 = [0, 0, 0]
    p[a] = av
    p[b] = bv
    p[w] = wv
    return p
  }

  // Six faces, inset by the chamfer in their own tangent plane.
  for (let a = 0; a < 3; a++) {
    const b = (a + 1) % 3
    const w = (a + 2) % 3
    for (const s of [-1, 1]) {
      facet(
        [
          at(a, s * h[a], b, -i[b], w, -i[w]),
          at(a, s * h[a], b, i[b], w, -i[w]),
          at(a, s * h[a], b, i[b], w, i[w]),
          at(a, s * h[a], b, -i[b], w, i[w]),
        ],
        at(a, s, b, 0, w, 0)
      )
    }
  }

  // Twelve edge facets. Each spans the 90 degrees between two faces, so its
  // normal is their bisector and it is what catches the horizon.
  for (let a = 0; a < 3; a++) {
    for (let b = a + 1; b < 3; b++) {
      const w = 3 - a - b
      for (const sa of [-1, 1]) {
        for (const sb of [-1, 1]) {
          facet(
            [
              at(a, sa * h[a], b, sb * i[b], w, i[w]),
              at(a, sa * i[a], b, sb * h[b], w, i[w]),
              at(a, sa * i[a], b, sb * h[b], w, -i[w]),
              at(a, sa * h[a], b, sb * i[b], w, -i[w]),
            ],
            norm(at(a, sa, b, sb, w, 0))
          )
        }
      }
    }
  }

  // Eight corner facets.
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        facet(
          [
            [sx * h[0], sy * i[1], sz * i[2]],
            [sx * i[0], sy * h[1], sz * i[2]],
            [sx * i[0], sy * i[1], sz * h[2]],
          ],
          norm([sx, sy, sz])
        )
      }
    }
  }
}

export const packMesh = (m: Mesh) => ({
  pos: new Float32Array(m.pos),
  nrm: new Float32Array(m.nrm),
  part: new Float32Array(m.part),
  idx: new Uint16Array(m.idx),
})

/** The four bars of a square tube running along `axis`, as half-extents and
 *  centres. Used for both the frame (three tubes crossed) and each arm. */
function tube(axis: number, thick: number): { half: V3; centre: V3 }[] {
  const b = (axis + 1) % 3
  const c = (axis + 2) % 3
  const out: { half: V3; centre: V3 }[] = []
  for (const sb of [-1, 1]) {
    for (const sc of [-1, 1]) {
      const half: V3 = [thick, thick, thick]
      half[axis] = BAR_LEN
      const centre: V3 = [0, 0, 0]
      centre[b] = sb * FRAME
      centre[c] = sc * FRAME
      out.push({ half, centre })
    }
  }
  return out
}

export function buildGeometry() {
  const m = emptyMesh()
  // Part 0: the cube frame. Three crossed tubes give exactly the twelve edges
  // of a cube, with no bar emitted twice.
  for (let axis = 0; axis < 3; axis++) {
    for (const bar of tube(axis, BAR_FRAME)) {
      chamferedBox(m, bar.half, bar.centre, 0)
    }
  }
  // Parts 1..6: one four-bar tube per arm, modelled coincident with the frame.
  for (let k = 0; k < DIRS.length; k++) {
    const axis = DIRS[k][0] !== 0 ? 0 : DIRS[k][1] !== 0 ? 1 : 2
    for (const bar of tube(axis, BAR_ARM)) {
      chamferedBox(m, bar.half, bar.centre, k + 1)
    }
  }
  return packMesh(m)
}

export interface Pose {
  q: Quat
  t: V3
}

export function partTransforms(ext: number, m: MotionProps): Pose[] {
  const d = (m.travel / 100) * ARM_STEP * ext
  const out: Pose[] = [{ q: QI, t: [0, 0, 0] }]
  for (const dir of DIRS) {
    out.push({ q: QI, t: [dir[0] * d, dir[1] * d, dir[2] * d] })
  }
  return out
}

/* -------------------------------------------------------------------- cycle */

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeIn = (t: number) => t * t * t

/**
 * Where in the assemble/hold/collapse loop we are, as a 0..1 extension.
 * `u` is the cycle phase in 0..1, `hold` the held fraction in 0..1. The four
 * segments run rest, expand, hold, collapse — the reference opens on the seed,
 * so the pause belongs at the front.
 *
 * Exported so the probe can assert the segment joins are continuous instead of
 * looking at a render and deciding it seems smooth.
 */
export function extension(u: number, hold: number): number {
  const h = Math.min(Math.max(hold, 0), 1)
  const rem = 1 - h
  if (rem <= 1e-6) return 1
  const tRest = rem * F_REST
  const tExp = rem * F_EXPAND
  const tCol = rem * F_COLLAPSE
  const p = u - Math.floor(u)
  if (p < tRest) return 0
  if (p < tRest + tExp) return easeOut((p - tRest) / tExp)
  if (p < tRest + tExp + h) return 1
  return 1 - easeIn(Math.min((p - tRest - tExp - h) / tCol, 1))
}

/* ------------------------------------------------------------------- colour */

/**
 * Framer's Color control does not hand back hex. It emits `rgb()`, `rgba()`,
 * `hsl()`, and `var(--token, <fallback>)` when the colour came from a style
 * token — a hex-only parser makes the dial look dead. Returns LINEAR rgb,
 * because everything downstream of it is a lighting term.
 */
export function parseLinearColor(css: string, fallback: V3): V3 {
  const s = (css || "").trim()
  if (!s) return fallback
  const varMatch = s.match(/^var\([^,]+,\s*(.+)\)$/i)
  if (varMatch) return parseLinearColor(varMatch[1], fallback)
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  const hex = s.match(/^#([0-9a-f]{3,8})$/i)
  if (hex) {
    let d = hex[1]
    if (d.length === 3 || d.length === 4) d = d.split("").map((c) => c + c).join("")
    if (d.length >= 6) {
      return [
        toLinear(parseInt(d.slice(0, 2), 16) / 255),
        toLinear(parseInt(d.slice(2, 4), 16) / 255),
        toLinear(parseInt(d.slice(4, 6), 16) / 255),
      ]
    }
    return fallback
  }
  const rgb = s.match(/^rgba?\(([^)]+)\)$/i)
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean)
    if (parts.length >= 3) {
      const ch = (t: string) =>
        t.endsWith("%") ? parseFloat(t) / 100 : parseFloat(t) / 255
      return [toLinear(ch(parts[0])), toLinear(ch(parts[1])), toLinear(ch(parts[2]))]
    }
    return fallback
  }
  const hsl = s.match(/^hsla?\(([^)]+)\)$/i)
  if (hsl) {
    const parts = hsl[1].split(/[\s,/]+/).filter(Boolean)
    if (parts.length >= 3) {
      const hDeg = ((parseFloat(parts[0]) % 360) + 360) % 360
      const sat = parseFloat(parts[1]) / 100
      const lig = parseFloat(parts[2]) / 100
      const c = (1 - Math.abs(2 * lig - 1)) * sat
      const x = c * (1 - Math.abs(((hDeg / 60) % 2) - 1))
      const m = lig - c / 2
      const table: V3[] = [
        [c, x, 0],
        [x, c, 0],
        [0, c, x],
        [0, x, c],
        [x, 0, c],
        [c, 0, x],
      ]
      const t = table[Math.floor(hDeg / 60) % 6]
      return [toLinear(t[0] + m), toLinear(t[1] + m), toLinear(t[2] + m)]
    }
    return fallback
  }
  return fallback
}

/* --------------------------------------------------------------------- props */

interface MaterialProps {
  roughness: number
  reflect: number
}
export interface MotionProps {
  spin: number
  travel: number
  hold: number
}
interface CameraProps {
  tilt: number
  sideTilt: number
}

interface Props {
  background: string
  baseColor: string
  speed: number
  distance: number
  material: Partial<MaterialProps>
  motion: Partial<MotionProps>
  camera: Partial<CameraProps>
  style?: React.CSSProperties
}

/** A group the designer never opened arrives undefined, and one they opened and
 *  closed can arrive missing a field. Spread-merging over a typed literal covers
 *  both; a hand-written ?? chain is where one missed key silently pins a control
 *  forever. */
const DEF_MATERIAL: MaterialProps = { roughness: 66, reflect: 100 }
export const DEF_MOTION: MotionProps = { spin: 75, travel: 113, hold: 32 }
const DEF_CAMERA: CameraProps = { tilt: 35, sideTilt: 0 }

const DEF_BASE_LINEAR: V3 = [0.68, 0.71, 0.75]

/* ---------------------------------------------------------------- component */

export default function MetalFrameCross(props: Partial<Props>) {
  const {
    background = "#000000",
    baseColor = "#C0C0C0",
    speed = 50,
    distance = 30,
    style,
  } = props

  const material = { ...DEF_MATERIAL, ...(props.material || {}) }
  const motion = { ...DEF_MOTION, ...(props.motion || {}) }
  const camera = { ...DEF_CAMERA, ...(props.camera || {}) }

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Every live input the frame loop reads lives in a ref. Putting any of them
  // in the effect deps rebuilds the context and recompiles the shaders on every
  // keystroke in the panel.
  const live = useRef({
    baseColor,
    speed,
    distance,
    roughness: material.roughness,
    reflect: material.reflect,
      spin: motion.spin,
      travel: motion.travel,
      hold: motion.hold,
    tilt: camera.tilt,
    sideTilt: camera.sideTilt,
  })
  live.current = {
    baseColor,
    speed,
    distance,
    roughness: material.roughness,
    reflect: material.reflect,
      spin: motion.spin,
      travel: motion.travel,
      hold: motion.hold,
    tilt: camera.tilt,
    sideTilt: camera.sideTilt,
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      depth: true,
      premultipliedAlpha: true,
    }) as WebGLRenderingContext | null
    if (!gl) return

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("MetalFrameCross shader:", gl.getShaderInfoLog(sh))
      }
      return sh
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("MetalFrameCross link:", gl.getProgramInfoLog(prog))
      return
    }
    gl.useProgram(prog)

    const geo = buildGeometry()
    const mkBuf = (data: Float32Array, attr: string, size: number) => {
      const b = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(prog, attr)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
    }
    mkBuf(geo.pos, "aPos", 3)
    mkBuf(geo.nrm, "aNrm", 3)
    mkBuf(geo.part, "aPart", 1)
    const ibo = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW)

    const U = (n: string) => gl.getUniformLocation(prog, n)
    const uSpin = U("uSpin")
    const uYaw = U("uYaw")
    const uPitch = U("uPitch")
    const uRoll = U("uRoll")
    const uDist = U("uDist")
    const uFov = U("uFov")
    const uAspect = U("uAspect")
    const uCamPos = U("uCamPos")
    const uBase = U("uBase")
    const uRough = U("uRough")
    const uReflect = U("uReflect")
    // Array uniforms are addressed element by element. Querying "uQ" alone
    // returns the location of element 0 only, and every other part would then
    // silently draw at the identity pose.
    const uQ: (WebGLUniformLocation | null)[] = []
    const uT: (WebGLUniformLocation | null)[] = []
    for (let k = 0; k < PART_COUNT; k++) {
      uQ.push(U("uQ[" + k + "]"))
      uT.push(U("uT[" + k + "]"))
    }

    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LESS)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.frontFace(gl.CCW)
    gl.clearColor(0, 0, 0, 0)

    let bw = 0
    let bh = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
      // clientWidth, not the injected width/height props: in the Framer preview
      // those are not numeric and the buffer would size to NaN.
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (w === bw && h === bh) return
      bw = w
      bh = h
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let raf = 0
    let last = -1
    let spinAngle = 0
    let cycle = 0
    const D2R = Math.PI / 180

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // The first rAF timestamp can predate the effect that starts the loop, so
      // the first dt is negative unless it is clamped.
      const dt = last < 0 ? 0 : Math.min(Math.max((now - last) / 1000, 0), 0.1)
      last = now
      const L = live.current

      spinAngle = (spinAngle + dt * L.spin * D2R) % TAU
      const rate = L.speed / 50
      if (rate > 0) cycle = (cycle + (dt * rate) / CYCLE_SEC_AT_50) % 1

      // Speed 0 parks the loop on the assembled form, not on the seed: a single
      // collapsed block frozen on the canvas reads as a broken component.
      const ext = rate > 0 ? extension(cycle, L.hold / 100) : 1

      resize()
      const pitch = L.tilt * D2R
      const yaw = YAW_DEG * D2R
      const d = L.distance
      const poses = partTransforms(ext, { spin: L.spin, travel: L.travel, hold: L.hold })
      for (let k = 0; k < PART_COUNT; k++) {
        const p = poses[k]
        gl.uniform4f(uQ[k], p.q[0], p.q[1], p.q[2], p.q[3])
        gl.uniform3f(uT[k], p.t[0], p.t[1], p.t[2])
      }
      gl.uniform1f(uSpin, spinAngle)
      gl.uniform1f(uYaw, yaw)
      gl.uniform1f(uPitch, pitch)
      gl.uniform1f(uRoll, L.sideTilt * D2R)
      gl.uniform1f(uDist, d)
      gl.uniform1f(uFov, FOV_DEG * D2R)
      gl.uniform1f(uAspect, bw / Math.max(bh, 1))
      gl.uniform3f(
        uCamPos,
        Math.sin(yaw) * Math.cos(pitch) * d,
        Math.sin(pitch) * d,
        Math.cos(yaw) * Math.cos(pitch) * d
      )
      const bc = parseLinearColor(L.baseColor, DEF_BASE_LINEAR)
      gl.uniform3f(uBase, bc[0], bc[1], bc[2])
      gl.uniform1f(uRough, Math.min(Math.max(L.roughness / 100, 0), 1))
      gl.uniform1f(uReflect, Math.min(Math.max(L.reflect / 100, 0), 1))

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.drawElements(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_SHORT, 0)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      // No WEBGL_lose_context here on purpose: getContext hands back the same
      // context per canvas, so a StrictMode remount would reuse a force-lost one
      // and render black.
    }
  }, [])

  return (
    <div
      style={{
        // Floor before the spread, so an explicit size on the instance wins but
        // a Fit Content parent cannot collapse this to 0x0.
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
