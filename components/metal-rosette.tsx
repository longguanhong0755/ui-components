"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * METAL ROSETTE — seven chrome cubes that fly apart into a 3D plus, and back.
 *
 * The form is the DBM "+" mark read as voxels: a centre cube plus its six
 * face-neighbours. Seen down the [1,1,1] axis those six arms land on the
 * vertices of a regular hexagon and the centre cube shows three faces meeting
 * in a Y, which is exactly the rosette in the reference. The loop is the
 * reference's: the arms start coincident with the centre (one cube), shoot out
 * along their axes, hold, and retract.
 *
 * ── WHY TRIANGLES, NOT POINT SPRITES ──────────────────────────────────────
 * Rule 8 mandates WebGL point sprites with every transform in the vertex
 * shader, and that is right for a particle field. This is a solid body, and a
 * point sprite cannot carry a specular highlight ACROSS a face — the highlight
 * is the whole reason the thing reads as metal. So the geometry is an indexed
 * triangle mesh, 7 cubes, 168 vertices, one drawElements per frame. Everything
 * else in rule 8 is unchanged: the camera, the spin and the arm displacement
 * are still scalar uniforms resolved in the vertex shader, there is no matrix
 * library, the context is built once and every live input is read from a ref.
 *
 * ── THE MATERIAL IS ANALYTIC ──────────────────────────────────────────────
 * No matcap. A photographed chrome ball cannot be fitted by the two lobes this
 * shader can afford, and a matcap is locked to view space — it would rotate
 * WITH the object and the highlight would never sweep. Instead: GGX specular
 * from two fixed directional lights, plus a procedural sky/ground environment
 * sampled by the reflection vector in WORLD space. The object spins under a
 * static environment, so the horizon band walks across the faces. Metals have
 * no diffuse term, so every non-specular photon here comes from that env.
 *
 * Output is ACES then exact sRGB at the end of main(). Skipping either makes a
 * raw-WebGL port of a physically-shaded scene about 2.2x too dark; the probe
 * asserts linear 0.2 lands on 149/255 through this exact code.
 */

/* ---------------------------------------------------------------- constants */

/** Device pixel ratio cap. Flat mirror faces show stair-stepping on their
 *  silhouette long before they show it in the shading, so MSAA carries most of
 *  the load here and 2 is plenty. */
const DPR_CAP = 2

/** Cube edge in world units. Travel 100% moves an arm exactly one edge, so its
 *  inner face lands flush against the centre cube. */
const CELL = 1

/** Seconds per assemble/hold/collapse cycle at Speed 50 — the rate the loader
 *  shipped at, measured off the reference at 3.45s. */
const CYCLE_SEC_AT_50 = 3.45

/** How the non-hold part of the cycle divides. Measured from the reference:
 *  of the 51% that is not hold, 31% is the outward move, 29% the retract, and
 *  40% the pause on the seed cube. */
const F_EXPAND = 0.31
const F_COLLAPSE = 0.29
const F_REST = 0.4

/** Camera azimuth. Fixed, not a control: 45 deg with a 35 deg pitch is the
 *  isometric view the reference is drawn in, and Spin already covers wanting a
 *  different angle. */
const YAW_DEG = 45

/** Vertical field of view. This is NOT orthographic and the difference is
 *  measurable: at Distance 10 the six arms sit at different depths, so their
 *  projected radii spread by 11% and the hexagon of the reference is slightly
 *  irregular. Their ANGLES stay exactly 60 deg apart, which is what carries the
 *  rosette read, and the perspective is what makes the view vector vary across
 *  a face — without it a flat mirror face samples one direction and renders as
 *  one flat patch of colour. The probe asserts both numbers. */
const FOV_DEG = 28

/** Scene clock wrap, in radians of spin and in cycles. Only differences and
 *  values mod one period are ever read, so this is invisible, and it keeps a
 *  long session out of the range where a float loses resolution. */
const TAU = Math.PI * 2

/* ------------------------------------------------------------------ shaders */

const VERT = `
precision highp float;
attribute vec3 aPos;
attribute vec3 aNrm;
attribute vec3 aArm;
uniform float uSpin;
uniform float uYaw;
uniform float uPitch;
uniform float uRoll;
uniform float uDist;
uniform float uFov;
uniform float uTravel;
uniform float uAspect;
varying vec3 vN;
varying vec3 vP;
vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
vec3 rotZ(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }
void main() {
  vec3 pw = rotY(aPos + aArm * uTravel, uSpin);
  vN = rotY(aNrm, uSpin);
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

const FRAG = `
precision highp float;
varying vec3 vN;
varying vec3 vP;
uniform vec3 uCamPos;
uniform vec3 uBase;
uniform float uRough;
uniform float uReflect;

const float PI = 3.14159265359;

// The environment IS the material. A cube face has one normal, so the GGX
// lobes below are nearly constant across it — a flat mirror face either
// flashes whole or stays dark, and directional lights alone render as matte
// paint. What makes chrome read as chrome is structure in what it reflects:
// a HARD horizon, and a few bright softboxes that land as crisp blobs.
const vec3 SKY_LOW = vec3(0.30, 0.35, 0.47);
const vec3 SKY_HIGH = vec3(0.80, 0.84, 0.95);
const vec3 GROUND_DEEP = vec3(0.0035, 0.0038, 0.0050);
const vec3 GROUND_NEAR = vec3(0.052, 0.055, 0.066);
const vec3 HORIZON = vec3(0.55, 0.53, 0.49);

// Softbox directions, aimed at the REFLECTION vectors the visible faces
// actually produce at the resting camera — up-back-left for the cube tops,
// and the two low directions the +X and +Z side faces mirror into. Aimed
// anywhere else the blobs land off-screen and the faces render as flat plates,
// which is exactly what a plain sky/ground gradient already gives.
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
  // The horizon edge is the signature of a mirror. Roughness is the ONLY
  // thing that softens it, which is what makes the Roughness dial legible.
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

/* ----------------------------------------------------------------- geometry */

type V3 = [number, number, number]

/** The seven cells: centre, then the six face-neighbours. A cell's entry is
 *  also its travel direction, so the centre never moves. */
const ARMS: V3[] = [
  [0, 0, 0],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

/** Chamfer, as a fraction of the cube half-size. Not a control, and the single
 *  most load-bearing number in the geometry. A perfect cube has three visible
 *  normals from any camera, so a mirror material renders it as three flat tonal
 *  patches — at axis-aligned spin angles it drops to two and the thing reads as
 *  a black-and-white graphic rather than an object. A chamfer adds a facet at
 *  every edge whose normal sweeps the whole 90 degrees between its neighbours,
 *  so each edge catches the horizon as a bright line. That line is what says
 *  metal. Kept small enough that the silhouette is still a cube. */
const CHAMFER = 0.09

/** Axis basis: outward normal plus the tangent pair chosen so cross(u, v) == n.
 *  Winding is not trusted to that identity anywhere below — every facet is
 *  emitted and then flipped if its geometric normal disagrees, and the probe
 *  re-checks all of them. */
const FACES: { n: V3; u: V3; v: V3 }[] = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
]

const CORNERS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
]

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

export function buildRosette() {
  const pos: number[] = []
  const nrm: number[] = []
  const arm: number[] = []
  const idx: number[] = []
  const h = CELL * 0.5
  const c = h * CHAMFER
  const i = h - c

  for (const a of ARMS) {
    /** Emit one convex facet: its vertices in order, and the outward normal it
     *  is meant to have. If the order winds the other way, reverse it — that is
     *  cheaper to get right than three hand-derived winding rules. */
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
      const base = pos.length / 3
      for (const v of ordered) {
        pos.push(v[0], v[1], v[2])
        nrm.push(n[0], n[1], n[2])
        arm.push(a[0], a[1], a[2])
      }
      for (let k = 1; k < ordered.length - 1; k++) idx.push(base, base + k, base + k + 1)
    }

    // The six faces, inset by the chamfer in their own tangent plane.
    for (const f of FACES) {
      facet(
        CORNERS.map(
          ([cu, cv]): V3 => [
            f.n[0] * h + f.u[0] * i * cu + f.v[0] * i * cv,
            f.n[1] * h + f.u[1] * i * cu + f.v[1] * i * cv,
            f.n[2] * h + f.u[2] * i * cu + f.v[2] * i * cv,
          ]
        ),
        f.n
      )
    }

    // The twelve edge facets. Each spans the 90 degrees between two faces, so
    // its normal is their bisector and it is what catches the horizon.
    for (let ax = 0; ax < 3; ax++) {
      for (let bx = ax + 1; bx < 3; bx++) {
        const wx = 3 - ax - bx
        for (const sa of [-1, 1]) {
          for (const sb of [-1, 1]) {
            const at = (av: number, bv: number, wv: number): V3 => {
              const p: V3 = [0, 0, 0]
              p[ax] = av
              p[bx] = bv
              p[wx] = wv
              return p
            }
            const n: V3 = [0, 0, 0]
            n[ax] = sa
            n[bx] = sb
            facet(
              [
                at(sa * h, sb * i, i),
                at(sa * i, sb * h, i),
                at(sa * i, sb * h, -i),
                at(sa * h, sb * i, -i),
              ],
              norm(n)
            )
          }
        }
      }
    }

    // The eight corner facets.
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          facet(
            [
              [sx * h, sy * i, sz * i],
              [sx * i, sy * h, sz * i],
              [sx * i, sy * i, sz * h],
            ],
            norm([sx, sy, sz])
          )
        }
      }
    }
  }

  return {
    pos: new Float32Array(pos),
    nrm: new Float32Array(nrm),
    arm: new Float32Array(arm),
    idx: new Uint16Array(idx),
  }
}

/* -------------------------------------------------------------------- cycle */

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeIn = (t: number) => t * t * t

/**
 * Where in the assemble/hold/collapse loop we are, as a 0..1 arm extension.
 * `u` is the cycle phase in 0..1, `hold` the held fraction in 0..1. The four
 * segments run rest, expand, hold, collapse — the reference opens on the seed
 * cube, so the pause belongs at the front.
 *
 * Exported so the probe can assert the segment joins are continuous instead of
 * looking at a render and deciding it seems smooth.
 */
export function armExtension(u: number, hold: number): number {
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
      const seg = Math.floor(hDeg / 60) % 6
      const table: V3[] = [
        [c, x, 0],
        [x, c, 0],
        [0, c, x],
        [0, x, c],
        [x, 0, c],
        [c, 0, x],
      ]
      const t = table[seg]
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
interface MotionProps {
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

/** A group the designer never opened arrives undefined, and one they opened
 *  and closed can arrive missing a field. Spread-merging over a typed literal
 *  covers both; a hand-written ?? chain is where one missed key silently pins
 *  a control forever. */
const DEF_MATERIAL: MaterialProps = { roughness: 18, reflect: 90 }
const DEF_MOTION: MotionProps = { spin: 18, travel: 100, hold: 48 }
const DEF_CAMERA: CameraProps = { tilt: 35, sideTilt: 0 }

const DEF_BASE_LINEAR: V3 = [0.68, 0.71, 0.75]

/* ---------------------------------------------------------------- component */

export default function MetalRosette(props: Partial<Props>) {
  const {
    background = "#000000",
    baseColor = "#A5A5A5",
    speed = 50,
    distance = 30,
    style,
  } = props

  const material = { ...DEF_MATERIAL, ...(props.material || {}) }
  const motion = { ...DEF_MOTION, ...(props.motion || {}) }
  const camera = { ...DEF_CAMERA, ...(props.camera || {}) }

  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Every live input the frame loop reads lives in a ref. Putting any of them
  // in the effect deps rebuilds the context and recompiles the shaders on each
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
        console.error("MetalRosette shader:", gl.getShaderInfoLog(sh))
      }
      return sh
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("MetalRosette link:", gl.getProgramInfoLog(prog))
      return
    }
    gl.useProgram(prog)

    const geo = buildRosette()
    const mkBuf = (data: Float32Array, name: string, size: number) => {
      const b = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(prog, name)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
      return b
    }
    mkBuf(geo.pos, "aPos", 3)
    mkBuf(geo.nrm, "aNrm", 3)
    mkBuf(geo.arm, "aArm", 3)
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
    const uTravel = U("uTravel")
    const uAspect = U("uAspect")
    const uCamPos = U("uCamPos")
    const uBase = U("uBase")
    const uRough = U("uRough")
    const uReflect = U("uReflect")

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
      // clientWidth, not the injected width/height props: in the Framer
      // preview those are not numeric and the buffer would size to NaN.
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
      // The first rAF timestamp can predate the effect that starts the loop,
      // so the first dt is negative unless it is clamped.
      const dt = last < 0 ? 0 : Math.min(Math.max((now - last) / 1000, 0), 0.1)
      last = now
      const L = live.current

      spinAngle = (spinAngle + dt * L.spin * D2R) % TAU
      const rate = L.speed / 50
      if (rate > 0) cycle = (cycle + (dt * rate) / CYCLE_SEC_AT_50) % 1

      // Speed 0 parks the loop on the assembled form, not on the seed: a
      // single cube frozen on the canvas reads as a broken component.
      const ext = rate > 0 ? armExtension(cycle, L.hold / 100) : 1

      resize()
      const pitch = L.tilt * D2R
      const yaw = YAW_DEG * D2R
      const d = L.distance
      gl.uniform1f(uSpin, spinAngle)
      gl.uniform1f(uYaw, yaw)
      gl.uniform1f(uPitch, pitch)
      gl.uniform1f(uRoll, L.sideTilt * D2R)
      gl.uniform1f(uDist, d)
      gl.uniform1f(uFov, FOV_DEG * D2R)
      gl.uniform1f(uTravel, ext * (L.travel / 100) * CELL)
      gl.uniform1f(uAspect, bw / Math.max(bh, 1))
      gl.uniform3f(
        uCamPos,
        Math.sin(yaw) * Math.cos(pitch) * d,
        Math.sin(pitch) * d,
        Math.cos(yaw) * Math.cos(pitch) * d
      )
      const base = parseLinearColor(L.baseColor, DEF_BASE_LINEAR)
      gl.uniform3f(uBase, base[0], base[1], base[2])
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
      // context per canvas, so a StrictMode remount would reuse a force-lost
      // one and render black.
    }
  }, [])

  return (
    <div
      ref={hostRef}
      style={{
        // Floor before the spread, so an explicit size on the instance wins
        // but a Fit Content parent cannot collapse this to 0x0.
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
