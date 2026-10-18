"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * DARK CLUSTER — an icosphere exploded into extruded triangular shards that
 * breathe, spin, and light up under the pointer.
 *
 * Ported from kekkorider/codrops-tutorial-dark-cluster (three.js WebGPU + TSL +
 * GSAP). The reference defines the interaction and it is reproduced as it is
 * (rule 8): what changed is the machinery, not what the thing does.
 *
 * ── WHAT YOU ARE LOOKING AT ───────────────────────────────────────────────
 * Every face of an icosphere becomes a triangular prism: the face itself, the
 * same triangle pushed radially outward by `Extrusion`, and six side walls
 * bridging them. Each prism is then scaled about its OWN centroid by a noise
 * field, so the shell of shards opens and closes.
 *
 * The shading is one dot product. A face is lit by how much its normal points
 * back at the world origin, so the OUTER caps — normals pointing away — are
 * black, and the INNER caps are `Base Color`. Backface culling then does the
 * rest: on the near side of the sphere you see black outer caps, and through
 * the gaps between them you see the FAR side's bright inner caps. Dark
 * outside, lit inside. That is the whole trick and it is why the shading has
 * no light source.
 *
 * ── THE HOVER POINT IS ON THE FAR SIDE, DELIBERATELY ──────────────────────
 * The reference raycasts an invisible sphere whose material is `BackSide`, so
 * three keeps the BACK intersection — the point diametrically behind the one
 * under the pointer. That reads as a mistake until you notice which faces are
 * visible: the lit ones are the far side's inner caps. Lighting the near side
 * would light the faces that are culled. So the far root of the ray/sphere
 * intersection is the correct one and is what this port takes.
 *
 * The glow lives in WORLD space, not on the mesh, so shards spin THROUGH a
 * stationary lit region rather than carrying it around with them.
 *
 * ── POST ──────────────────────────────────────────────────────────────────
 * Two passes. The scene renders to an FBO with a real depth texture; a
 * fullscreen pass draws the white outlines from that depth and lays an ordered
 * Bayer dither over the result.
 *
 * The outline operator is a second difference of window depth, not the
 * reference's Sobel, and the difference is not cosmetic. A Sobel is a SLOPE
 * detector: on a flat facet turned ~45° to the view it reads the same gradient
 * as a genuine silhouette step, so with a frustum fitted to the cluster it
 * floods whole facets white — measured at 10 % of the frame before this
 * changed. Window depth is affine in screen space across any planar triangle,
 * so `|d(-1) + d(+1) - 2 d(0)|` is exactly zero on a facet at ANY angle and
 * non-zero only where depth actually breaks. Same white hairlines, no tuning
 * against the camera.
 *
 * The frustum is fitted to the cluster (near/far a hair outside it) rather than
 * left at three's 0.1/1000. That is what gives window depth range here: at the
 * reference's defaults every depth in the scene sits above 0.9999 and the
 * neighbour differences are ~1e-5.
 *
 * ── WHY NOT three ─────────────────────────────────────────────────────────
 * Raw WebGL2, no npm import (rule 10). The reference needs WebGPU + TSL +
 * BatchedMesh + two addon nodes + GSAP + three-start; the scene is 80 prisms
 * and two shader passes. WebGL2 is required rather than WebGL1 only for the
 * depth texture the outline pass samples.
 *
 * Rule 6's context recipe applies verbatim: context built once in
 * useEffect([]), every live input read from a ref, raw rAF, no loseContext.
 */

/* ---------------------------------------------------------------- constants */

const DPR_CAP = 2

/** Vertical field of view. three's PerspectiveCamera default, which is what
 *  the reference runs. */
const FOV_DEG = 50

/** Reference face extrusion, as a fraction of the icosphere radius. `Extrusion`
 *  is a percentage of this being 100. */
const EXTRUSION_REF = 0.45

/** The noise remap the reference ships: scale runs [0.15, 0.75] about each
 *  shard's own centroid. `Shard Size` scales the pair. */
const SCALE_MIN = 0.15
const SCALE_MAX = 0.75

/** Noise cells per second at Speed 50 — the reference's `time.mul(0.5)`. */
const CHURN_RATE = 0.5

/** The gradient noise is periodic over this many lattice cells, so the clock
 *  wraps here with no visible jump and the hash never sees a large argument
 *  (a fract(sin(·)) hash quantizes badly past ~1e5). */
const NOISE_PERIOD = 289

/** Hover falloff. The reference is smoothstep(0.8, 0.2) on distance, i.e. full
 *  strength inside 0.2 and nothing past 0.8 — a 1:4 inner/outer ratio, which
 *  `Reach` preserves while it moves the outer edge. */
const REACH_RATIO = 0.25

/** Extra shard scale at full hover, at Lift 50. The reference's remap(0,1,0,0.45). */
const LIFT_REF = 0.45

/** Settling rates for the pointer glow, 1/sec. The reference is a 0.5 s GSAP
 *  power2.out tween on the point and 0.5 s in / 0.2 s out on the strength.
 *  Micro-physics, so constants rather than dials (rule 11b). */
const POINT_RATE = 6
const STRENGTH_IN_RATE = 6
const STRENGTH_OUT_RATE = 15

/** Second-difference of window depth that counts as an edge. Zero on a flat
 *  facet whatever its angle, so this only has to clear float noise and the
 *  smallest shard-against-shard step worth drawing. */
const EDGE_THRESHOLD = 0.03

/* ------------------------------------------------------------------ geometry */

/** The 20 base icosahedron faces, three.js's own vertex table and winding. */
const ICO_T = (1 + Math.sqrt(5)) / 2
// prettier-ignore
const ICO_VERTS = [
    -1, ICO_T, 0,   1, ICO_T, 0,   -1, -ICO_T, 0,   1, -ICO_T, 0,
    0, -1, ICO_T,   0, 1, ICO_T,   0, -1, -ICO_T,   0, 1, -ICO_T,
    ICO_T, 0, -1,   ICO_T, 0, 1,   -ICO_T, 0, -1,   -ICO_T, 0, 1,
]
// prettier-ignore
const ICO_INDEX = [
    0, 11, 5,   0, 5, 1,   0, 1, 7,   0, 7, 10,   0, 10, 11,
    1, 5, 9,    5, 11, 4,  11, 10, 2, 10, 7, 6,   7, 1, 8,
    3, 9, 4,    3, 4, 2,   3, 2, 6,   3, 6, 8,    3, 8, 9,
    4, 9, 5,    2, 4, 11,  6, 2, 10,  8, 6, 7,    9, 8, 1,
]

/** The prism, as the reference lists it: an inward-facing base cap (1,3,2), six
 *  side-wall triangles, and an outward-facing top cap (4,5,6). Indices are
 *  1-based into [v1 v2 v3 v4 v5 v6], v4..v6 being v1..v3 pushed out. */
// prettier-ignore
const PRISM = [
    1, 3, 2,
    1, 2, 4,
    2, 5, 4,
    2, 3, 5,
    3, 6, 5,
    3, 1, 6,
    1, 4, 6,
    4, 5, 6,
]
const VERTS_PER_FACE = 24

interface ClusterGeometry {
    /** Vertex position relative to its own prism's centroid. */
    centered: Float32Array
    /** The prism centroid, repeated per vertex. */
    centroid: Float32Array
    /** Flat per-triangle normal. Uniform scale about the centroid leaves it
     *  unchanged, so it is baked rather than derived in the shader. */
    normal: Float32Array
    count: number
    /** Distance from the origin to the furthest vertex, for the frustum fit. */
    radius: number
}

/** Subdivide the icosahedron `detail` times and project onto the unit sphere,
 *  then build one extruded prism per face. Non-indexed, flat-shaded. */
function buildCluster(detail: number, extrusion: number): ClusterGeometry {
    const cols = detail + 1
    const faces: number[] = [] // flat x,y,z triples, 3 per face

    const push = (v: number[]) => {
        const L = Math.hypot(v[0], v[1], v[2]) || 1
        faces.push(v[0] / L, v[1] / L, v[2] / L)
    }

    for (let f = 0; f < ICO_INDEX.length; f += 3) {
        const a = ICO_INDEX[f] * 3
        const b = ICO_INDEX[f + 1] * 3
        const c = ICO_INDEX[f + 2] * 3
        // P(u,v) = a + (b-a)*u/cols + (c-a)*v/cols, barycentric grid.
        const P = (u: number, v: number) => [
            ICO_VERTS[a] +
                ((ICO_VERTS[b] - ICO_VERTS[a]) * u + (ICO_VERTS[c] - ICO_VERTS[a]) * v) / cols,
            ICO_VERTS[a + 1] +
                ((ICO_VERTS[b + 1] - ICO_VERTS[a + 1]) * u +
                    (ICO_VERTS[c + 1] - ICO_VERTS[a + 1]) * v) / cols,
            ICO_VERTS[a + 2] +
                ((ICO_VERTS[b + 2] - ICO_VERTS[a + 2]) * u +
                    (ICO_VERTS[c + 2] - ICO_VERTS[a + 2]) * v) / cols,
        ]
        for (let u = 0; u < cols; u++) {
            for (let v = 0; v + u < cols; v++) {
                push(P(u, v)); push(P(u + 1, v)); push(P(u, v + 1))
                if (u + v < cols - 1) {
                    push(P(u + 1, v)); push(P(u + 1, v + 1)); push(P(u, v + 1))
                }
            }
        }
    }

    const numFaces = faces.length / 9
    const n = numFaces * VERTS_PER_FACE
    const centered = new Float32Array(n * 3)
    const centroid = new Float32Array(n * 3)
    const normal = new Float32Array(n * 3)

    const p = new Float32Array(18) // v1..v6
    let radius = 0
    let w = 0

    for (let fi = 0; fi < numFaces; fi++) {
        const o = fi * 9
        for (let k = 0; k < 9; k++) p[k] = faces[o + k]

        const cx = (p[0] + p[3] + p[6]) / 3
        const cy = (p[1] + p[4] + p[7]) / 3
        const cz = (p[2] + p[5] + p[8]) / 3
        // The reference's faceDirection: centroid minus mesh position (origin),
        // normalized. Radial, so the prism grows straight out of the shell.
        const dl = Math.hypot(cx, cy, cz) || 1
        const dx = (cx / dl) * extrusion
        const dy = (cy / dl) * extrusion
        const dz = (cz / dl) * extrusion
        for (let k = 0; k < 3; k++) {
            p[9 + k * 3] = p[k * 3] + dx
            p[10 + k * 3] = p[k * 3 + 1] + dy
            p[11 + k * 3] = p[k * 3 + 2] + dz
        }
        for (let k = 0; k < 6; k++)
            radius = Math.max(radius, Math.hypot(p[k * 3], p[k * 3 + 1], p[k * 3 + 2]))

        for (let t = 0; t < PRISM.length; t += 3) {
            const i0 = (PRISM[t] - 1) * 3
            const i1 = (PRISM[t + 1] - 1) * 3
            const i2 = (PRISM[t + 2] - 1) * 3
            const e1x = p[i1] - p[i0], e1y = p[i1 + 1] - p[i0 + 1], e1z = p[i1 + 2] - p[i0 + 2]
            const e2x = p[i2] - p[i0], e2y = p[i2 + 1] - p[i0 + 1], e2z = p[i2 + 2] - p[i0 + 2]
            let nx = e1y * e2z - e1z * e2y
            let ny = e1z * e2x - e1x * e2z
            let nz = e1x * e2y - e1y * e2x
            const nl = Math.hypot(nx, ny, nz) || 1
            nx /= nl; ny /= nl; nz /= nl

            for (const idx of [i0, i1, i2]) {
                centered[w] = p[idx] - cx
                centroid[w] = cx
                normal[w] = nx
                centered[w + 1] = p[idx + 1] - cy
                centroid[w + 1] = cy
                normal[w + 1] = ny
                centered[w + 2] = p[idx + 2] - cz
                centroid[w + 2] = cz
                normal[w + 2] = nz
                w += 3
            }
        }
    }

    return { centered, centroid, normal, count: n, radius }
}

/* ------------------------------------------------------------------ shaders */

const SCENE_VERT = `#version 300 es
precision highp float;

in vec3 aCentered;
in vec3 aCentroid;
in vec3 aNormal;

uniform mat3  uRot;
uniform float uCamDist;
uniform float uTanHalf;
uniform float uAspect;
uniform float uNear;
uniform float uFar;
uniform float uTime;
uniform float uScaleMin;
uniform float uScaleMax;
uniform vec3  uHoverPoint;
uniform float uHoverStrength;
uniform float uReachIn;
uniform float uReachOut;
uniform float uLift;

out vec3  vNormalW;
out vec3  vPosW;
out vec3  vViewPos;
out float vHover;

// Periodic gradient noise. mod() on the lattice makes it repeat every
// NOISE_PERIOD cells, which is what lets the CPU clock wrap without a jump and
// keeps the hash argument small enough to stay exact.
vec2 grad(vec2 p) {
    p = mod(p, ${NOISE_PERIOD}.0);
    float a = fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453) * 6.2831853;
    return vec2(cos(a), sin(a));
}

float noise2(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = dot(grad(i),                f);
    float b = dot(grad(i + vec2(1., 0.)), f - vec2(1., 0.));
    float c = dot(grad(i + vec2(0., 1.)), f - vec2(0., 1.));
    float d = dot(grad(i + vec2(1., 1.)), f - vec2(1., 1.));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.4;
}

void main() {
    vec3 cW = uRot * aCentroid;

    // The reference's hover term, written as a rising smoothstep so it is
    // defined: GLSL smoothstep(edge0, edge1, x) with edge0 > edge1 is not.
    float hov = (1.0 - smoothstep(uReachIn, uReachOut, distance(cW, uHoverPoint)))
              * uHoverStrength;

    float n = clamp(noise2(aCentroid.yz + uTime) * 0.5 + 0.5, 0.0, 1.0);
    float s = mix(uScaleMin, uScaleMax, n) + hov * uLift;

    vec3 pW = uRot * (aCentroid + aCentered * s);
    vec3 vp = vec3(pW.x, pW.y, pW.z - uCamDist);

    vNormalW = normalize(uRot * aNormal);
    vPosW    = pW;
    vViewPos = vp;
    vHover   = hov;

    float f = 1.0 / uTanHalf;
    gl_Position = vec4(
        vp.x * f / uAspect,
        vp.y * f,
        ((uFar + uNear) / (uNear - uFar)) * vp.z + (2.0 * uFar * uNear) / (uNear - uFar),
        -vp.z
    );
}`

const SCENE_FRAG = `#version 300 es
precision highp float;

in vec3  vNormalW;
in vec3  vPosW;
in vec3  vViewPos;
in float vHover;

uniform vec3 uBase;
uniform vec3 uAccent;
uniform vec3 uShadow;

out vec4 fragColor;

// The reference samples a yellow matcap PNG. A file that has to be fetched is
// not a self-contained code component (rule 10), so the matcap is generated:
// three's own matcapUV, then a lit hemisphere in Accent Color with a specular
// pip and a rim — the same read as a metal matcap, with the colour on a dial.
vec3 matcap(vec3 nV, vec3 viewPos, vec3 accent) {
    vec3 viewDir = normalize(viewPos);
    vec3 x = normalize(vec3(viewDir.z, 0.0, -viewDir.x));
    vec3 y = cross(viewDir, x);
    vec2 uv = vec2(dot(x, nV), dot(y, nV)) * 0.495 + 0.5;

    vec2 p = uv * 2.0 - 1.0;
    float r = min(length(p), 1.0);
    vec3 sn = vec3(p, sqrt(max(0.0, 1.0 - r * r)));
    float lam = clamp(dot(sn, normalize(vec3(-0.35, 0.55, 0.75))), 0.0, 1.0);

    vec3 col = accent * (0.18 + 0.95 * pow(lam, 0.85));
    col += vec3(1.0) * pow(lam, 48.0) * 0.85;
    col += accent * smoothstep(0.62, 1.0, r) * 0.55;
    return col;
}

void main() {
    vec3 n = normalize(vNormalW);

    // How much the face looks back at the world origin. Outer caps face away
    // and go black; inner caps face in and take Base Color.
    float d = dot(n, normalize(-vPosW)) * 0.5 + 0.5;

    vec3 lit = mix(uBase, matcap(n, vViewPos, uAccent), clamp(vHover, 0.0, 1.0));
    fragColor = vec4(mix(uShadow, lit, smoothstep(0.35, 0.95, d)), 1.0);
}`

const POST_VERT = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}`

const POST_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uColor;
uniform sampler2D uDepth;
uniform vec2  uTexel;
uniform float uOutline;
uniform float uLevels;

out vec4 fragColor;

// Recursive Bayer: no matrix indexing, exact 8x8 ordered threshold in [0,1).
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(a * 0.5) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(a * 0.5) * 0.25 + bayer2(a); }

void main() {
    vec3 c = texture(uColor, vUv).rgb;

    if (uOutline > 0.0) {
        // Window depth is affine in screen space over a planar triangle, so the
        // second difference vanishes on a facet at any angle and survives only
        // at a real depth break. A Sobel here would read a steep facet as an
        // edge and fill it (see the header).
        float dC = texture(uDepth, vUv).r;
        float dL = texture(uDepth, vUv - vec2(uTexel.x, 0.0)).r;
        float dR = texture(uDepth, vUv + vec2(uTexel.x, 0.0)).r;
        float dD = texture(uDepth, vUv - vec2(0.0, uTexel.y)).r;
        float dU = texture(uDepth, vUv + vec2(0.0, uTexel.y)).r;

        float e = max(abs(dL + dR - 2.0 * dC), abs(dD + dU - 2.0 * dC));
        c += vec3(step(${EDGE_THRESHOLD}, e) * uOutline);
    }

    if (uLevels > 1.5) {
        c = floor(clamp(c, 0.0, 1.0) * uLevels + bayer8(gl_FragCoord.xy)) / uLevels;
    }

    fragColor = vec4(c, 1.0);
}`

/* -------------------------------------------------------------------- helpers */

/** Framer's Color control emits hex, rgb()/rgba() and var(--token, fallback) —
 *  a hex-only parse makes the dial look dead (rule F). */
function parseColor(s: string | undefined, fallback: [number, number, number]) {
    if (!s) return fallback
    let t = s.trim()
    const v = t.match(/var\([^,]+,\s*(.+)\)\s*$/)
    if (v) t = v[1].trim()
    const fn = t.match(/^(?:rgb|rgba|hsl|hsla)\(([^)]+)\)/i)
    if (fn) {
        const parts = fn[1].split(/[\s,/]+/).filter(Boolean)
        if (/^hsl/i.test(t)) {
            const h = (parseFloat(parts[0]) % 360 + 360) % 360 / 360
            const sa = parseFloat(parts[1]) / 100
            const l = parseFloat(parts[2]) / 100
            const q = l < 0.5 ? l * (1 + sa) : l + sa - l * sa
            const p = 2 * l - q
            const ch = (o: number) => {
                let x = h + o
                if (x < 0) x += 1
                if (x > 1) x -= 1
                if (x < 1 / 6) return p + (q - p) * 6 * x
                if (x < 1 / 2) return q
                if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
                return p
            }
            return [ch(1 / 3), ch(0), ch(-1 / 3)] as [number, number, number]
        }
        return [
            (parseFloat(parts[0]) || 0) / 255,
            (parseFloat(parts[1]) || 0) / 255,
            (parseFloat(parts[2]) || 0) / 255,
        ] as [number, number, number]
    }
    let h = t.replace("#", "")
    if (h.length === 3 || h.length === 4)
        h = h.split("").map((ch) => ch + ch).join("")
    h = h.padEnd(6, "0")
    return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
    ] as [number, number, number]
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        console.warn("DarkCluster shader:", gl.getShaderInfoLog(sh))
    return sh
}

function linkProg(gl: WebGL2RenderingContext, vs: string, fs: string) {
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        console.warn("DarkCluster link:", gl.getProgramInfoLog(prog))
    return prog
}

/* ---------------------------------------------------------------------- props */

interface ClusterGroup {
    /** Radial face extrusion, % of the reference 0.45 of the sphere radius. */
    extrusion?: number
    /** Degrees per second about Y. Negative turns the way the reference does. */
    spin?: number
}

interface HoverGroup {
    /** Glow radius, % of the sphere radius. */
    reach?: number
    /** Extra shard scale under the pointer, % — 50 is the reference's 0.45. */
    lift?: number
}

interface RenderGroup {
    /** Whiteness added at a detected depth edge, %. 0 turns the pass off. */
    outline?: number
    /** Ordered-dither strength, %. 0 leaves the frame at full precision. */
    dither?: number
}

/** A group the designer never opened arrives undefined, so each is spread over
 *  a typed literal rather than read through a `??` chain (rule 11). */
const CLUSTER_DEFAULTS: Required<ClusterGroup> = { extrusion: 95, spin: 29 }
const HOVER_DEFAULTS: Required<HoverGroup> = { reach: 100, lift: 70 }
const RENDER_DEFAULTS: Required<RenderGroup> = { outline: 100, dither: 50 }

interface Props {
    background?: string
    baseColor?: string
    accentColor?: string
    shadowColor?: string
    /** Subdivision level of the icosphere: 1..4 gives 20/80/180/320 shards. */
    density?: number
    /** % of the reference [0.15, 0.75] scale band. */
    shardSize?: number
    /** 0..100; 50 is the rate the cluster shipped at. 0 freezes it. */
    speed?: number
    /** Camera pullback in world units. The sphere has radius 1. */
    distance?: number
    cluster?: ClusterGroup
    hover?: HoverGroup
    render?: RenderGroup
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ------------------------------------------------------------------ component */

export default function DarkCluster(props: Props) {
    const {
        background = "#000000",
        baseColor = "#FFCB00",
        accentColor = "#FFDE65",
        shadowColor = "#5900FF",
        density = 2,
        shardSize = 100,
        speed = 50,
        distance = 4,
        cluster,
        hover,
        render,
        style,
    } = props

    const c: Required<ClusterGroup> = { ...CLUSTER_DEFAULTS, ...(cluster || {}) }
    const h: Required<HoverGroup> = { ...HOVER_DEFAULTS, ...(hover || {}) }
    const r: Required<RenderGroup> = { ...RENDER_DEFAULTS, ...(render || {}) }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const live = useRef({
        background, baseColor, accentColor, shadowColor, density, shardSize, speed, distance,
        extrusion: c.extrusion, spin: c.spin,
        reach: h.reach, lift: h.lift,
        outline: r.outline, dither: r.dither,
    })
    live.current = {
        background, baseColor, accentColor, shadowColor, density, shardSize, speed, distance,
        extrusion: c.extrusion, spin: c.spin,
        reach: h.reach, lift: h.lift,
        outline: r.outline, dither: r.dither,
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        // WebGL2 for the depth texture the outline pass samples.
        const gl = canvas.getContext("webgl2", {
            alpha: false,
            antialias: false,
            depth: true,
        }) as WebGL2RenderingContext | null
        if (!gl) {
            console.warn("DarkCluster: WebGL2 unavailable")
            return
        }

        const sceneProg = linkProg(gl, SCENE_VERT, SCENE_FRAG)
        const postProg = linkProg(gl, POST_VERT, POST_FRAG)

        const SU = (n: string) => gl.getUniformLocation(sceneProg, n)
        const su = {
            rot: SU("uRot"), camDist: SU("uCamDist"), tanHalf: SU("uTanHalf"),
            aspect: SU("uAspect"), near: SU("uNear"), far: SU("uFar"),
            time: SU("uTime"), scaleMin: SU("uScaleMin"), scaleMax: SU("uScaleMax"),
            hoverPoint: SU("uHoverPoint"), hoverStrength: SU("uHoverStrength"),
            reachIn: SU("uReachIn"), reachOut: SU("uReachOut"), lift: SU("uLift"),
            base: SU("uBase"), accent: SU("uAccent"), shadow: SU("uShadow"),
        }
        const PU = (n: string) => gl.getUniformLocation(postProg, n)
        const pu = {
            color: PU("uColor"), depth: PU("uDepth"), texel: PU("uTexel"),
            outline: PU("uOutline"), levels: PU("uLevels"),
        }

        const aCentered = gl.getAttribLocation(sceneProg, "aCentered")
        const aCentroid = gl.getAttribLocation(sceneProg, "aCentroid")
        const aNormal = gl.getAttribLocation(sceneProg, "aNormal")
        const aPost = gl.getAttribLocation(postProg, "aPos")

        /* ---- scene geometry ---- */
        const sceneVao = gl.createVertexArray()!
        const bufCentered = gl.createBuffer()!
        const bufCentroid = gl.createBuffer()!
        const bufNormal = gl.createBuffer()!
        gl.bindVertexArray(sceneVao)
        const bind = (buf: WebGLBuffer, loc: number) => {
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.enableVertexAttribArray(loc)
            gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0)
        }
        bind(bufCentered, aCentered)
        bind(bufCentroid, aCentroid)
        bind(bufNormal, aNormal)
        gl.bindVertexArray(null)

        let vertCount = 0
        let sceneRadius = 1
        let builtDetail = -1
        let builtExtrusion = -1
        const rebuild = (detail: number, extrusion: number) => {
            const g = buildCluster(detail, extrusion)
            gl.bindBuffer(gl.ARRAY_BUFFER, bufCentered)
            gl.bufferData(gl.ARRAY_BUFFER, g.centered, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bufCentroid)
            gl.bufferData(gl.ARRAY_BUFFER, g.centroid, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bufNormal)
            gl.bufferData(gl.ARRAY_BUFFER, g.normal, gl.STATIC_DRAW)
            vertCount = g.count
            sceneRadius = g.radius
            builtDetail = detail
            builtExtrusion = extrusion
        }

        /* ---- fullscreen triangle ---- */
        const postVao = gl.createVertexArray()!
        gl.bindVertexArray(postVao)
        const postBuf = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, postBuf)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]),
            gl.STATIC_DRAW
        )
        gl.enableVertexAttribArray(aPost)
        gl.vertexAttribPointer(aPost, 2, gl.FLOAT, false, 0, 0)
        gl.bindVertexArray(null)

        /* ---- offscreen target ---- */
        const fbo = gl.createFramebuffer()!
        const colorTex = gl.createTexture()!
        const depthTex = gl.createTexture()!
        for (const tex of [colorTex, depthTex]) {
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        }

        let cssW = 0, cssH = 0, dpr = 1, wpx = 1, hpx = 1
        const sizeTargets = () => {
            gl.bindTexture(gl.TEXTURE_2D, colorTex)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, wpx, hpx, 0, gl.RGBA,
                gl.UNSIGNED_BYTE, null)
            gl.bindTexture(gl.TEXTURE_2D, depthTex)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, wpx, hpx, 0,
                gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null)
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                gl.TEXTURE_2D, colorTex, 0)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
                gl.TEXTURE_2D, depthTex, 0)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        }

        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            cssW = canvas.clientWidth || host.clientWidth || 1
            cssH = canvas.clientHeight || host.clientHeight || 1
            const nw = Math.max(1, Math.round(cssW * dpr))
            const nh = Math.max(1, Math.round(cssH * dpr))
            if (nw === wpx && nh === hpx && canvas.width === nw) return
            wpx = nw; hpx = nh
            canvas.width = wpx
            canvas.height = hpx
            sizeTargets()
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        /* ---- pointer ---- */
        const ptr = { x: 0, y: 0, has: false }
        const onMove = (e: PointerEvent) => {
            const b = host.getBoundingClientRect()
            // Zoom-free: both sides carry the canvas zoom and clientWidth is the
            // unzoomed reference (rule G).
            const k = b.width > 0 ? host.clientWidth / b.width : 1
            ptr.x = (e.clientX - b.left) * k
            ptr.y = (e.clientY - b.top) * k
            ptr.has = true
        }
        const onLeave = () => { ptr.has = false }
        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerleave", onLeave)
        window.addEventListener("pointerup", onLeave) // rule K

        /* ---- loop ---- */
        const hoverPoint = new Float32Array([0, 0, -1])
        let hoverStrength = 0
        const rot = new Float32Array(9)
        let spinAngle = 0
        let noiseT = 0
        let last = performance.now()
        let raf = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dtReal = Math.min((now - last) / 1000, 0.05)
            last = now
            if (cssW <= 0 || cssH <= 0) { resize(); return }

            const L = live.current
            const detail = Math.max(0, Math.round(L.density) - 1)
            const extrusion = (L.extrusion / 100) * EXTRUSION_REF
            if (detail !== builtDetail || extrusion !== builtExtrusion)
                rebuild(detail, extrusion)

            const rate = L.speed / 50
            const dt = dtReal * rate
            spinAngle = (spinAngle + dt * (L.spin * Math.PI) / 180) % (Math.PI * 2)
            noiseT = (noiseT + dt * CHURN_RATE) % NOISE_PERIOD

            /* camera + frustum, fitted to the cluster so the depth pass has range */
            const camDist = Math.max(L.distance, sceneRadius + 0.2)
            const near = Math.max(0.05, camDist - sceneRadius - 0.1)
            const far = camDist + sceneRadius + 0.1
            const tanHalf = Math.tan((FOV_DEG * Math.PI) / 360)
            const aspect = wpx / Math.max(1, hpx)

            /* pointer glow: the FAR root of the ray against the unit sphere */
            let targetStrength = 0
            if (ptr.has) {
                const ndcX = (ptr.x / Math.max(1, cssW)) * 2 - 1
                const ndcY = 1 - (ptr.y / Math.max(1, cssH)) * 2
                let dx = ndcX * tanHalf * aspect
                let dy = ndcY * tanHalf
                let dz = -1
                const dl = Math.hypot(dx, dy, dz)
                dx /= dl; dy /= dl; dz /= dl
                // |o + t d|^2 = 1, o = (0, 0, camDist)
                const b = 2 * camDist * dz
                const cc = camDist * camDist - 1
                const disc = b * b - 4 * cc
                if (disc >= 0) {
                    const t = (-b + Math.sqrt(disc)) / 2 // far root — see header
                    if (t > 0) {
                        targetStrength = 1
                        const k = 1 - Math.exp(-dtReal * POINT_RATE)
                        hoverPoint[0] += (t * dx - hoverPoint[0]) * k
                        hoverPoint[1] += (t * dy - hoverPoint[1]) * k
                        hoverPoint[2] += (camDist + t * dz - hoverPoint[2]) * k
                    }
                }
            }
            const sRate = targetStrength > hoverStrength
                ? STRENGTH_IN_RATE
                : STRENGTH_OUT_RATE
            hoverStrength += (targetStrength - hoverStrength) *
                (1 - Math.exp(-dtReal * sRate))

            /* ---- pass 1: shards into the FBO ---- */
            const bg = parseColor(L.background, [0.086, 0.09, 0.114])
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
            gl.viewport(0, 0, wpx, hpx)
            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LEQUAL)
            gl.enable(gl.CULL_FACE)
            gl.cullFace(gl.BACK)
            gl.disable(gl.BLEND)
            gl.clearColor(bg[0], bg[1], bg[2], 1)
            gl.clearDepth(1)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

            gl.useProgram(sceneProg)
            const ca = Math.cos(spinAngle), sa = Math.sin(spinAngle)
            // Column-major rotation about Y.
            rot[0] = ca; rot[1] = 0; rot[2] = -sa
            rot[3] = 0;  rot[4] = 1; rot[5] = 0
            rot[6] = sa; rot[7] = 0; rot[8] = ca
            gl.uniformMatrix3fv(su.rot, false, rot)
            gl.uniform1f(su.camDist, camDist)
            gl.uniform1f(su.tanHalf, tanHalf)
            gl.uniform1f(su.aspect, aspect)
            gl.uniform1f(su.near, near)
            gl.uniform1f(su.far, far)
            gl.uniform1f(su.time, noiseT)
            const sz = L.shardSize / 100
            gl.uniform1f(su.scaleMin, SCALE_MIN * sz)
            gl.uniform1f(su.scaleMax, SCALE_MAX * sz)
            gl.uniform3fv(su.hoverPoint, hoverPoint)
            gl.uniform1f(su.hoverStrength, hoverStrength)
            const reachOut = Math.max(0.01, L.reach / 100)
            gl.uniform1f(su.reachIn, reachOut * REACH_RATIO)
            gl.uniform1f(su.reachOut, reachOut)
            gl.uniform1f(su.lift, (L.lift / 50) * LIFT_REF)
            const base = parseColor(L.baseColor, [0.8, 0.8, 0.8])
            const accent = parseColor(L.accentColor, [1, 0.776, 0.239])
            const shadow = parseColor(L.shadowColor, [0, 0, 0])
            gl.uniform3fv(su.base, base)
            gl.uniform3fv(su.accent, accent)
            gl.uniform3fv(su.shadow, shadow)

            gl.bindVertexArray(sceneVao)
            gl.drawArrays(gl.TRIANGLES, 0, vertCount)

            /* ---- pass 2: outline + dither to the canvas ---- */
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            gl.viewport(0, 0, wpx, hpx)
            gl.disable(gl.DEPTH_TEST)
            gl.disable(gl.CULL_FACE)
            gl.useProgram(postProg)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, colorTex)
            gl.uniform1i(pu.color, 0)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, depthTex)
            gl.uniform1i(pu.depth, 1)
            gl.uniform2f(pu.texel, 1 / wpx, 1 / hpx)
            gl.uniform1f(pu.outline, L.outline / 100)
            // 0 % leaves full precision; 100 % quantizes to 2 levels.
            gl.uniform1f(pu.levels, L.dither > 0
                ? Math.max(2, Math.round(2 + (1 - L.dither / 100) * 46))
                : 0)
            gl.bindVertexArray(postVao)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
            gl.bindVertexArray(null)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("pointerup", onLeave)
            // No loseContext() — rule 6.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor before the style spread (rule 6).
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                // Also the GL clear colour: the dither and the Sobel run over the
                // whole frame in the reference, background included, so the
                // background has to be IN the buffer. CSS carries it too, for the
                // frame before the first draw.
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
