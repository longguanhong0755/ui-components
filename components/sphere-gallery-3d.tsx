"use client"

import * as React from "react"

/**
 * SPHERE GALLERY 3D — media nodes distributed on a spherical shell around a
 * lit nucleus, wired to it by live line segments.
 *
 * RAW WebGL. No `three`, no npm dependency of any kind (rule 10): a library
 * import resolves through Framer's ESM CDN at paste time, pins the component to
 * that CDN, and stops the file being readable end to end. Everything three was
 * doing here — perspective projection, the YXZ rig, quaternion billboarding,
 * the pointer ray, the sphere tessellation, texture upload — is ~200 lines of
 * arithmetic, so it lives in this file.
 *
 * Architecture (rule 6 / rule 8): the GL context is built ONCE in
 * `useEffect([])`, every live prop is read from a ref inside a raw rAF loop,
 * and cleanup never calls `loseContext()` (getContext returns the same context
 * per canvas, so a StrictMode remount would reuse a force-lost one).
 *
 * Interaction (rule 8 — pointer input is mandatory on every 3D component):
 *   • drag        — camera orbit, yaw/pitch accumulated, pitch clamped,
 *                   inertia on release, bound on `window` so a drag that
 *                   leaves the host still tracks and still releases.
 *   • hover       — magnetic attraction. The pointer is a RAY, not a 2D point:
 *                   each node is pulled toward the closest point on the
 *                   camera ray, so the effect is correct at any orbit angle.
 *   • wheel       — dolly the camera between Min/Max Zoom, damped.
 *   • click       — raycast, open that node's link in a new tab. Suppressed on
 *                   the Framer canvas so editing never navigates.
 */

/* ------------------------------------------------------------------- types */

export interface GalleryItem {
    image?: string
    link?: string
}

/** The content list lives in its own object, one shape across the folder. */
export interface CoreGroup {
    /** its ALPHA is the halo glow — the two used to be separate dials */
    coreColor?: string
    /** percent of the shell radius */
    coreSize?: number
    /** its ALPHA is the wireframe opacity */
    lineColor?: string
}

export type SpinDirection = "clockwise" | "counterclockwise"

export interface SphereGallery3DProps {
    images?: GalleryItem[]
    /** how many media nodes hang off the core */
    branches?: number
    background?: string
    /** whole-scene magnification, percent; 100 is the shipped framing */
    scale?: number
    /** node height, percent of the radius */
    size?: number
    /** per-node radial jitter, percent of the radius */
    scatter?: number
    /** 0-100, 50 = the shipped spin rate */
    speed?: number
    /** which way the auto-spin turns, seen from above */
    direction?: SpinDirection
    /** magnetic pull AND capture radius, percent; 0 is off */
    hover?: number
    /** node corner radius, percent of half its short side */
    rounded?: number
    core?: CoreGroup
    className?: string
    style?: React.CSSProperties
}

/* ---------------------------------------------------------------- defaults */

/* Dummy pictures, so a fresh instance is never blank and every node on the
 * sphere is DISTINCT — twelve alike plates give no sense of rotation. Inline
 * SVG data URIs, never photo URLs: a default pointing at a CDN 404s the day
 * that ID dies and shows nothing offline, behind a proxy, or on a Framer canvas
 * with no network. One set across the folder; the colour cycles every six while
 * the numeral keeps counting, so all twelve stay tellable apart. */
const DUMMY_PAIRS: ReadonlyArray<[string, string]> = [
    ["FF7A45", "FFB199"],
    ["4D7CFE", "9BC1FF"],
    ["16C79A", "9BE7C4"],
    ["FFC53D", "FFE9A8"],
    ["B15CFF", "E0B8FF"],
    ["FF4D7E", "FFB3C7"],
]
const dummyImage = (i: number, w = 1200, h = 800) => {
    const [a, b] = DUMMY_PAIRS[i % DUMMY_PAIRS.length]
    const n = String(i + 1).padStart(2, "0")
    return (
        `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E` +
        `%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E` +
        `%3Cstop offset='0' stop-color='%23${a}'/%3E%3Cstop offset='1' stop-color='%23${b}'/%3E` +
        `%3C/linearGradient%3E%3C/defs%3E%3Crect width='${w}' height='${h}' fill='url(%23g)'/%3E` +
        `%3Ctext x='50%25' y='50%25' dy='.35em' text-anchor='middle' ` +
        `font-family='Inter, Helvetica, Arial, sans-serif' font-size='${Math.round(Math.min(w, h) * 0.34)}' ` +
        `font-weight='700' fill='rgba(255,255,255,0.9)'%3E${n}%3C/text%3E%3C/svg%3E`
    )
        /* Spaces, quotes and parens are all invalid inside an unquoted CSS
         * `url(...)`, and a card painting this through
         * `backgroundImage: url(${src})` drops the whole declaration and
         * renders empty — measured, not guessed. Encoding them keeps ONE
         * string usable as an <img> src, a CSS url() and a GL texture alike. */
        .replace(/ /g, "%20")
        .replace(/'/g, "%27")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29")
}

const DEFAULT_ITEMS: GalleryItem[] = Array.from({ length: 12 }, (_, i) => ({
    image: dummyImage(i, 800, 600),
    link: "",
}))

/* ----------------------------------------------------------------- shaders
 * GLSL ES 1.00, so the same source compiles on a WebGL2 context and on a
 * WebGL1 fallback.
 *
 * One quad per node. The rounded corner is an SDF, not a texture and not a
 * DOM clip: the mask is computed in the fragment shader so it stays exact at
 * every distance and every node scale, with one screen pixel of feather.
 *
 * That feather comes from `uAA`, NOT from `fwidth()`. Derivatives are core in
 * GLSL ES 3.00 but need OES_standard_derivatives on a WebGL1 context, and a
 * shader that fails to compile there takes the whole component with it. The
 * CPU already knows the node's depth and scale, so one pixel in the SDF's own
 * units is exact arithmetic — no extension, no branch.
 */

const QUAD_VERT = /* glsl */ `
precision highp float;
attribute vec2 aCorner;      // unit quad, -0.5 .. 0.5
uniform mat4 uMVP;
varying vec2 vUv;
void main() {
    vUv = aCorner + 0.5;
    gl_Position = uMVP * vec4(aCorner, 0.0, 1.0);
}
`

const QUAD_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uMap;
uniform float uHasTex;
uniform vec2  uHalf;     // half extents in aspect-correct local units
uniform float uRadius;   // corner radius in those same units
uniform float uAA;       // one screen pixel, in those same units
uniform float uOpacity;
uniform float uDim;      // depth shading, 0 = fully in shadow
uniform vec3  uPlaceholder;

float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
    vec2 p = (vUv - 0.5) * 2.0 * uHalf;
    /* uRadius reaching half the SHORT side means a full circle, not a stadium.
     * The sampled point still spans the plate's true half-extents, but the SDF
     * box narrows toward a square as the radius grows, so at maximum the two
     * meet at a circle and the long axis is clipped away. Deriving the dial
     * back out of uRadius keeps this to zero extra uniforms. */
    float sHalf = min(uHalf.x, uHalf.y);
    float t = sHalf > 0.0 ? clamp(uRadius / sHalf, 0.0, 1.0) : 0.0;
    vec2 box = mix(uHalf, vec2(sHalf), t);
    float d = sdRoundBox(p, box, uRadius);
    float aa = max(uAA, 1e-5);
    float mask = 1.0 - smoothstep(-aa, aa, d);
    if (mask <= 0.002) discard;

    vec3 col = mix(uPlaceholder, texture2D(uMap, vUv).rgb, uHasTex);
    col *= uDim;

    float a = mask * uOpacity;
    if (a <= 0.002) discard;
    // premultiplied: the context is premultipliedAlpha, and the additive halo
    // below needs blendFunc(ONE, ONE) to bloom rather than wash out
    gl_FragColor = vec4(col * a, a);
}
`

const SOLID_VERT = /* glsl */ `
precision highp float;
attribute vec3 aPos;
uniform mat4 uMVP;
uniform float uScale;
void main() {
    gl_Position = uMVP * vec4(aPos * uScale, 1.0);
}
`

const SOLID_FRAG = /* glsl */ `
precision mediump float;
uniform vec4 uColor;
void main() {
    gl_FragColor = vec4(uColor.rgb * uColor.a, uColor.a);
}
`

/* ---------------------------------------------------------------- constants */

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const BASE_SPIN = 0.22 // rad/sec at Auto Rotate 100
const SPRING_STIFFNESS = 70 // 1/sec^2 pull toward the magnetic target
const HOVER_POP = 0.3 // extra scale on a fully captured node
// 0 = pure radial, 1 = pure billboard. Measured: at 0.45 a node on the FAR
// side (radial normal ~180° from the camera) still lands ~81° off face-on and
// renders as a razor sliver. 0.75 caps the worst case near 45°, so every node
// stays readable while the rig still reads as a shell and not a flat wall.
const BILLBOARD_BLEND = 0.75
/* Cut controls (rule 10), frozen at the value the sphere shipped with. */
const RADIUS = 12 // shell radius, world units — was the `Radius` dial
const DAMPING = 0.6 // spring settle, 0-1 — was the `Damping` dial
const FOV = 45 // ° vertical — was `Camera > Perspective`
const MIN_DIST = 18 // wheel dolly clamp, world units, at Scale 100
const MAX_DIST = 70
const REST_DIST_MUL = 2.8 // resting dolly = RADIUS * this, at Scale 100
const DEFAULT_BRANCHES = 12 // matches DEFAULT_ITEMS.length
const MAX_BRANCHES = 60
const ZOOM_GAIN = 1 // wheel gain
const ORBIT_SPEED = 0.25 // ° of camera swing per dragged pixel
const ORBIT_DAMPING = 0.6 // how fast the orbit settles after release
const ORBIT_LIMIT = 70 // ° pitch clamp either side of level
const DEPTH_FLOOR = 0.32 // how dark the far side of the shell goes
const ZOOM_RATE = 9 // 1/sec camera dolly damping
const CLICK_SLOP_PX = 5
const CLICK_MS = 450
const PLACEHOLDER = "#1b1b20"
const SPHERE_W = 32 // core tessellation, matching the shipped look
const SPHERE_H = 24
const NEAR = 0.1
const FAR = 2000

/** stable per-index jitter — a seeded hash, never Math.random, so the shell
 * does not reshuffle itself on every re-render */
function hash01(i: number): number {
    const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453
    return s - Math.floor(s)
}

const clamp = (v: number, lo: number, hi: number) =>
    v < lo ? lo : v > hi ? hi : v

/* -------------------------------------------------------------------- colour
 * Robust parse (rule 6): #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba().
 * Values stay in sRGB and go straight to the framebuffer — which is exactly
 * what three did here too: a ShaderMaterial gets no colorspace chunk injected,
 * and a MeshBasicMaterial's sRGB->linear decode is undone by the output
 * conversion. So the pixels match, and blending still happens in sRGB.
 */
function parseColor(input: string | undefined, fallback: number[]): number[] {
    if (!input) return fallback.slice()
    const s = String(input).trim()

    const m = s.match(/^rgba?\(([^)]+)\)$/i)
    if (m) {
        const parts = m[1].split(/[,\s/]+/).filter(Boolean)
        const ch = (t: string) =>
            t.indexOf("%") >= 0 ? parseFloat(t) / 100 : parseFloat(t) / 255
        const r = ch(parts[0] ?? "0")
        const g = ch(parts[1] ?? "0")
        const b = ch(parts[2] ?? "0")
        const a = parts[3] === undefined ? 1 : parseFloat(parts[3])
        if ([r, g, b, a].some((v) => !isFinite(v))) return fallback.slice()
        return [clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1), clamp(a, 0, 1)]
    }

    let h = s.replace(/^#/, "")
    if (h.length === 3 || h.length === 4) {
        h = h
            .split("")
            .map((c) => c + c)
            .join("")
    }
    if (h.length !== 6 && h.length !== 8) return fallback.slice()
    const n = parseInt(h, 16)
    if (!isFinite(n)) return fallback.slice()
    if (h.length === 6) {
        return [
            ((n >> 16) & 255) / 255,
            ((n >> 8) & 255) / 255,
            (n & 255) / 255,
            1,
        ]
    }
    return [
        ((n >>> 24) & 255) / 255,
        ((n >>> 16) & 255) / 255,
        ((n >>> 8) & 255) / 255,
        (n & 255) / 255,
    ]
}

/* ---------------------------------------------------------------- math
 * Column-major mat4, GL order. Everything here is what `three` was providing;
 * none of it is more than a page.
 */

type M4 = Float32Array

function mat4(): M4 {
    const m = new Float32Array(16)
    m[0] = m[5] = m[10] = m[15] = 1
    return m
}

/** vertical-FOV perspective, identical to three's PerspectiveCamera */
function perspective(out: M4, fovyRad: number, aspect: number): M4 {
    const f = 1 / Math.tan(fovyRad / 2)
    out.fill(0)
    out[0] = f / aspect
    out[5] = f
    out[10] = (FAR + NEAR) / (NEAR - FAR)
    out[11] = -1
    out[14] = (2 * FAR * NEAR) / (NEAR - FAR)
    return out
}

function mul(out: M4, a: M4, b: M4): M4 {
    for (let c = 0; c < 4; c++) {
        const b0 = b[c * 4],
            b1 = b[c * 4 + 1],
            b2 = b[c * 4 + 2],
            b3 = b[c * 4 + 3]
        out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3
        out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3
        out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3
        out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3
    }
    return out
}

/**
 * The rig's rotation, Euler order YXZ with z = 0 — i.e. Ry(yaw) · Rx(pitch).
 * That order is what makes a drag read as a turntable and not as a tumbling
 * object. Written into a mat4 whose translation column is the camera dolly, so
 * `view · group` is one matrix and never two.
 */
function rigView(out: M4, yaw: number, pitch: number, camZ: number): M4 {
    const a = Math.cos(pitch),
        b = Math.sin(pitch)
    const c = Math.cos(yaw),
        d = Math.sin(yaw)
    out[0] = c
    out[1] = 0
    out[2] = -d
    out[3] = 0
    out[4] = d * b
    out[5] = a
    out[6] = c * b
    out[7] = 0
    out[8] = a * d
    out[9] = -b
    out[10] = a * c
    out[11] = 0
    out[12] = 0
    out[13] = 0
    out[14] = -camZ
    out[15] = 1
    return out
}

/** the same rotation as a plain 3x3, row-major, for the CPU-side vector work */
function rigBasis(yaw: number, pitch: number): number[] {
    const a = Math.cos(pitch),
        b = Math.sin(pitch)
    const c = Math.cos(yaw),
        d = Math.sin(yaw)
    // rows
    return [c, d * b, a * d, 0, a, -b, -d, c * b, a * c]
}

/** R · v */
function applyBasis(R: number[], x: number, y: number, z: number, out: number[]) {
    out[0] = R[0] * x + R[1] * y + R[2] * z
    out[1] = R[3] * x + R[4] * y + R[5] * z
    out[2] = R[6] * x + R[7] * y + R[8] * z
}

/** Rᵀ · v — world -> rig-local, the inverse of a pure rotation */
function applyBasisT(R: number[], x: number, y: number, z: number, out: number[]) {
    out[0] = R[0] * x + R[3] * y + R[6] * z
    out[1] = R[1] * x + R[4] * y + R[7] * z
    out[2] = R[2] * x + R[5] * y + R[8] * z
}

type Quat = [number, number, number, number] // x, y, z, w

/** rig quaternion for Euler YXZ with z = 0, i.e. qYaw · qPitch */
function quatFromYawPitch(yaw: number, pitch: number, out: Quat): Quat {
    const cy = Math.cos(yaw / 2),
        sy = Math.sin(yaw / 2)
    const cx = Math.cos(pitch / 2),
        sx = Math.sin(pitch / 2)
    out[0] = cy * sx
    out[1] = sy * cx
    out[2] = -sy * sx
    out[3] = cy * cx
    return out
}

/**
 * Shortest rotation taking +Z onto `dir` (a unit vector). three's
 * setFromUnitVectors, specialised to vFrom = (0,0,1) — the quad's own normal.
 */
function quatFromZTo(dx: number, dy: number, dz: number, out: Quat): Quat {
    let r = dz + 1
    let x: number, y: number, z: number, w: number
    if (r < 1e-6) {
        // antiparallel: any axis perpendicular to +Z will do
        x = 0
        y = -1
        z = 0
        w = 0
    } else {
        x = -dy
        y = dx
        z = 0
        w = r
    }
    const len = Math.hypot(x, y, z, w) || 1
    out[0] = x / len
    out[1] = y / len
    out[2] = z / len
    out[3] = w / len
    return out
}

/** three's Quaternion.slerp, including the shortest-path flip */
function quatSlerp(a: Quat, b: Quat, t: number, out: Quat): Quat {
    if (t <= 0) {
        out[0] = a[0]
        out[1] = a[1]
        out[2] = a[2]
        out[3] = a[3]
        return out
    }
    if (t >= 1) {
        out[0] = b[0]
        out[1] = b[1]
        out[2] = b[2]
        out[3] = b[3]
        return out
    }

    const ax = a[0],
        ay = a[1],
        az = a[2],
        aw = a[3]
    let bx = b[0],
        by = b[1],
        bz = b[2],
        bw = b[3]

    let cosHalf = aw * bw + ax * bx + ay * by + az * bz
    if (cosHalf < 0) {
        cosHalf = -cosHalf
        bx = -bx
        by = -by
        bz = -bz
        bw = -bw
    }

    if (cosHalf >= 1) {
        out[0] = ax
        out[1] = ay
        out[2] = az
        out[3] = aw
        return out
    }

    const sqrSin = 1 - cosHalf * cosHalf
    if (sqrSin <= Number.EPSILON) {
        const s = 1 - t
        out[0] = s * ax + t * bx
        out[1] = s * ay + t * by
        out[2] = s * az + t * bz
        out[3] = s * aw + t * bw
        const len =
            Math.hypot(out[0], out[1], out[2], out[3]) || 1
        out[0] /= len
        out[1] /= len
        out[2] /= len
        out[3] /= len
        return out
    }

    const sinHalf = Math.sqrt(sqrSin)
    const half = Math.atan2(sinHalf, cosHalf)
    const ra = Math.sin((1 - t) * half) / sinHalf
    const rb = Math.sin(t * half) / sinHalf
    out[0] = ax * ra + bx * rb
    out[1] = ay * ra + by * rb
    out[2] = az * ra + bz * rb
    out[3] = aw * ra + bw * rb
    return out
}

/** position · rotation · scale, straight into a column-major mat4 */
function compose(
    out: M4,
    px: number,
    py: number,
    pz: number,
    q: Quat,
    sx: number,
    sy: number,
    sz: number
): M4 {
    const x = q[0],
        y = q[1],
        z = q[2],
        w = q[3]
    const x2 = x + x,
        y2 = y + y,
        z2 = z + z
    const xx = x * x2,
        xy = x * y2,
        xz = x * z2
    const yy = y * y2,
        yz = y * z2,
        zz = z * z2
    const wx = w * x2,
        wy = w * y2,
        wz = w * z2

    out[0] = (1 - (yy + zz)) * sx
    out[1] = (xy + wz) * sx
    out[2] = (xz - wy) * sx
    out[3] = 0
    out[4] = (xy - wz) * sy
    out[5] = (1 - (xx + zz)) * sy
    out[6] = (yz + wx) * sy
    out[7] = 0
    out[8] = (xz + wy) * sz
    out[9] = (yz - wx) * sz
    out[10] = (1 - (xx + yy)) * sz
    out[11] = 0
    out[12] = px
    out[13] = py
    out[14] = pz
    out[15] = 1
    return out
}

/** the quad's right / up / normal axes, i.e. the rotation matrix's columns */
function quatAxes(q: Quat, right: number[], up: number[], normal: number[]) {
    const x = q[0],
        y = q[1],
        z = q[2],
        w = q[3]
    const x2 = x + x,
        y2 = y + y,
        z2 = z + z
    const xx = x * x2,
        xy = x * y2,
        xz = x * z2
    const yy = y * y2,
        yz = y * z2,
        zz = z * z2
    const wx = w * x2,
        wy = w * y2,
        wz = w * z2
    right[0] = 1 - (yy + zz)
    right[1] = xy + wz
    right[2] = xz - wy
    up[0] = xy - wz
    up[1] = 1 - (xx + zz)
    up[2] = yz + wx
    normal[0] = xz + wy
    normal[1] = yz - wx
    normal[2] = 1 - (xx + yy)
}

/* ------------------------------------------------------------ core geometry
 * three's SphereGeometry(1, 32, 24), generated inline. The halo reuses the
 * same positions with a deduped edge index — which is what material.wireframe
 * was building under the hood.
 */
function buildSphere(widthSeg: number, heightSeg: number) {
    const pos: number[] = []
    const grid: number[][] = []
    let index = 0

    for (let iy = 0; iy <= heightSeg; iy++) {
        const row: number[] = []
        const v = iy / heightSeg
        const theta = v * Math.PI
        for (let ix = 0; ix <= widthSeg; ix++) {
            const u = ix / widthSeg
            const phi = u * Math.PI * 2
            pos.push(
                -Math.cos(phi) * Math.sin(theta),
                Math.cos(theta),
                Math.sin(phi) * Math.sin(theta)
            )
            row.push(index++)
        }
        grid.push(row)
    }

    const tris: number[] = []
    for (let iy = 0; iy < heightSeg; iy++) {
        for (let ix = 0; ix < widthSeg; ix++) {
            const a = grid[iy][ix + 1]
            const b = grid[iy][ix]
            const c = grid[iy + 1][ix]
            const d = grid[iy + 1][ix + 1]
            if (iy !== 0) tris.push(a, b, d)
            if (iy !== heightSeg - 1) tris.push(b, c, d)
        }
    }

    // Three edges per triangle, NOT a deduped edge set. Shared edges are
    // therefore drawn twice, and under additive blending that is exactly a
    // 2x brighter lattice — measured at 1.85-1.90x against the reference,
    // which is what the halo has always looked like. Deduping here dims the
    // glow by half. (It is also what three does: getWireframeAttribute pushes
    // a,b, b,c, c,a per face and dropped its edge cache years ago.)
    const edges: number[] = []
    for (let i = 0; i < tris.length; i += 3) {
        const a = tris[i], b = tris[i + 1], c = tris[i + 2]
        edges.push(a, b, b, c, c, a)
    }

    return {
        positions: new Float32Array(pos),
        tris: new Uint16Array(tris),
        edges: new Uint16Array(edges),
    }
}

/* ---------------------------------------------------------------- runtime */

interface Loaded {
    image: HTMLImageElement | null
    aspect: number
    texture: WebGLTexture | null
    /** the texture has been uploaded and the uniforms bound to it */
    applied: boolean
}

interface NodeRT {
    /** magnetic displacement in rig-local space, and its velocity */
    ox: number
    oy: number
    oz: number
    vx: number
    vy: number
    vz: number
    /** last frame's resolved transform — what the hit test reads */
    px: number
    py: number
    pz: number
    q: Quat
    hx: number
    hy: number
}

interface Live {
    count: number
    radius: number
    depthRand: number
    itemSize: number
    coreColor: string
    coreSize: number
    coreGlow: number
    lineColor: string
    lineOpacity: number
    /** node corner radius, 0-1 fraction of the max radius */
    rounded: number
    /** signed rad/sec — the Direction enum is folded in as the sign */
    spin: number
    force: number
    hoverDist: number
    /** whole-scene magnification, 1 = the shipped framing */
    scale: number
    minZoom: number
    maxZoom: number
    zoomGain: number
    orbitSpeed: number
    orbitDamping: number
    orbitLimit: number
}

function makeNode(): NodeRT {
    return {
        ox: 0,
        oy: 0,
        oz: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        px: 0,
        py: 0,
        pz: 0,
        q: [0, 0, 0, 1],
        hx: 0,
        hy: 0,
    }
}

function compile(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("[SphereGallery3D] shader", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function link(
    gl: WebGLRenderingContext,
    vertSrc: string,
    fragSrc: string
): WebGLProgram | null {
    const v = compile(gl, gl.VERTEX_SHADER, vertSrc)
    const f = compile(gl, gl.FRAGMENT_SHADER, fragSrc)
    if (!v || !f) return null
    const p = gl.createProgram()
    if (!p) return null
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.linkProgram(p)
    gl.deleteShader(v)
    gl.deleteShader(f)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("[SphereGallery3D] link", gl.getProgramInfoLog(p))
        gl.deleteProgram(p)
        return null
    }
    return p
}

/* -------------------------------------------------------------- component */

export default function SphereGallery3D(props: SphereGallery3DProps) {
    const {
        images = DEFAULT_ITEMS,
        branches: branchesProp = 34,
        background = "#000000",
        scale = 60,
        size = 28,
        scatter = 0,
        speed = 18,
        direction = "counterclockwise",
        hover = 200,
        rounded = 18,
        // a group the designer never opened arrives undefined (rule 8) — every
        // field also carries its own fallback below
        core = { coreSize: 24, coreColor: "#FFFFFF59", lineColor: "#FFFFFF59" },
        className,
        style,
    } = props

    /* The image list is a SOURCE, not a count: `branches` says how many nodes
     * exist and node i draws `items[i % items.length]`. One image therefore
     * fills every branch, which is the point — the list is not padded, so a
     * repeated image is still ONE decoded texture. */
    const itemsProp = images
    const items = itemsProp && itemsProp.length ? itemsProp : DEFAULT_ITEMS
    const branches = clamp(Math.round(branchesProp), 1, MAX_BRANCHES)

    const hostRef = React.useRef<HTMLDivElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null)

    /* ---------------------------------------------------------- live props
     * Every input the loop reads lives in a ref. Putting any of these in the
     * setup effect's deps would rebuild the GL context on every slider tick.
     */
    const radius = RADIUS
    const coreColor = core.coreColor ?? "#7ab8ffff"
    const lineColor = core.lineColor ?? "#4a6a9959"
    // The halo glow and the wireframe opacity ARE alphas, so they live in their
    // own colour rather than as a second dial that can disagree with it.
    const coreAlpha = parseColor(coreColor, [0.48, 0.72, 1, 1])[3]
    const lineAlpha = parseColor(lineColor, [0.29, 0.42, 0.6, 0.35])[3]
    /* Positive yaw carries the front of the shell to the RIGHT, which seen from
     * ABOVE — the axis the sphere actually turns about — is anticlockwise. That
     * is the sense the component shipped with, so it is the default. */
    const spinSign = direction === "clockwise" ? -1 : 1

    const live = React.useRef<Live>({} as Live)
    live.current = {
        count: branches,
        radius,
        depthRand: clamp(scatter / 100, 0, 1),
        itemSize: radius * clamp(size / 100, 0.01, 2),
        coreColor,
        coreSize: radius * clamp((core.coreSize ?? 16) / 100, 0, 1),
        coreGlow: coreAlpha,
        lineColor,
        lineOpacity: lineAlpha,
        rounded: clamp(rounded / 100, 0, 1),
        // 50 is the rate the sphere shipped at (rule 11); Direction is the sign
        spin: (BASE_SPIN * speed * spinSign) / 50,
        // One Hover Pull dial drives both the pull and the capture radius: they
        // are one gesture, and two dials for it is where "hover does nothing"
        // comes from (rule M).
        force: clamp(hover / 100, 0, 3),
        hoverDist: radius * clamp((hover / 100) * 0.35, 0, 3),
        // Scale DIVIDES the camera dolly rather than resizing the shell: node
        // size, scatter, core size and the hover reach are all percentages OF
        // the radius, so growing the radius would move every one of them too.
        scale: clamp(scale / 100, 0.2, 4),
        minZoom: MIN_DIST,
        maxZoom: MAX_DIST,
        zoomGain: ZOOM_GAIN,
        orbitSpeed: ORBIT_SPEED,
        orbitDamping: ORBIT_DAMPING,
        orbitLimit: ORBIT_LIMIT,
    }

    /* --------------------------------------------------------- link table
     * Read by the click handler, which is bound once — so it cannot close over
     * the props array.
     */
    const linksRef = React.useRef<string[]>([])
    // one entry per BRANCH, cycled like the images — the hit test returns a node
    // index, so this table has to be node-indexed too
    linksRef.current = Array.from(
        { length: branches },
        (_, i) => items[i % items.length]?.link || ""
    )

    /* -------------------------------------------------------------- media
     * This effect only decodes images. The GL upload happens in the loop,
     * where the context is in scope — the media effect is declared first, so
     * on the very first mount there is no context here yet.
     */
    const mediaRef = React.useRef<Loaded[]>([])
    const graveyardRef = React.useRef<WebGLTexture[]>([])
    const mediaKey = React.useMemo(
        () => items.map((it) => it?.image || "").join("|"),
        [items]
    )

    React.useEffect(() => {
        let alive = true
        const loaded: Loaded[] = items.map(() => ({
            image: null,
            aspect: 1,
            texture: null,
            applied: false,
        }))
        mediaRef.current = loaded

        items.forEach((item, i) => {
            const url = item?.image
            if (!url) return
            const img = new Image()
            // same as three's TextureLoader.setCrossOrigin("anonymous"): a
            // tainted canvas cannot be used as a texture source at all
            img.crossOrigin = "anonymous"
            img.onload = () => {
                if (!alive) return
                loaded[i].image = img
                loaded[i].aspect =
                    (img.naturalWidth || 1) / Math.max(1, img.naturalHeight || 1)
            }
            img.onerror = () => {
                /* leave the placeholder fill */
            }
            img.src = url
        })

        return () => {
            alive = false
            // the loop owns the GL objects, so hand them back rather than
            // deleting from an effect that may outlive the context
            loaded.forEach((l) => {
                if (l.texture) graveyardRef.current.push(l.texture)
                l.texture = null
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mediaKey])

    /* ------------------------------------------------------------ GL setup */
    React.useEffect(() => {
        const canvas = canvasRef.current
        const host = hostRef.current
        if (!canvas || !host) return

        const attrs: WebGLContextAttributes = {
            antialias: true,
            alpha: true,
            premultipliedAlpha: true,
            depth: true,
            powerPreference: "high-performance",
        }
        const gl = (canvas.getContext("webgl2", attrs) ||
            canvas.getContext("webgl", attrs) ||
            canvas.getContext(
                "experimental-webgl",
                attrs
            )) as WebGLRenderingContext | null

        if (!gl) {
            console.error("[SphereGallery3D] WebGL unavailable")
            return
        }

        const isGL2 =
            typeof WebGL2RenderingContext !== "undefined" &&
            gl instanceof WebGL2RenderingContext
        const aniso =
            gl.getExtension("EXT_texture_filter_anisotropic") ||
            gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic")

        /* --------------------------------------------------------- programs */
        const quadProg = link(gl, QUAD_VERT, QUAD_FRAG)
        const solidProg = link(gl, SOLID_VERT, SOLID_FRAG)
        if (!quadProg || !solidProg) return

        const qLoc = {
            aCorner: gl.getAttribLocation(quadProg, "aCorner"),
            uMVP: gl.getUniformLocation(quadProg, "uMVP"),
            uMap: gl.getUniformLocation(quadProg, "uMap"),
            uHasTex: gl.getUniformLocation(quadProg, "uHasTex"),
            uHalf: gl.getUniformLocation(quadProg, "uHalf"),
            uRadius: gl.getUniformLocation(quadProg, "uRadius"),
            uAA: gl.getUniformLocation(quadProg, "uAA"),
            uOpacity: gl.getUniformLocation(quadProg, "uOpacity"),
            uDim: gl.getUniformLocation(quadProg, "uDim"),
            uPlaceholder: gl.getUniformLocation(quadProg, "uPlaceholder"),
        }
        const sLoc = {
            aPos: gl.getAttribLocation(solidProg, "aPos"),
            uMVP: gl.getUniformLocation(solidProg, "uMVP"),
            uScale: gl.getUniformLocation(solidProg, "uScale"),
            uColor: gl.getUniformLocation(solidProg, "uColor"),
        }
        // a typo'd getUniformLocation fails silently and the effect just never
        // appears (rule 8) — say so loudly instead
        const missing = [
            ...Object.entries(qLoc),
            ...Object.entries(sLoc),
        ].filter(([, v]) => v === null || v === -1)
        if (missing.length) {
            console.error(
                "[SphereGallery3D] unresolved GL locations:",
                missing.map(([k]) => k).join(", ")
            )
        }

        /* --------------------------------------------------------- buffers */
        const quadBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            // two triangles, CCW, spanning -0.5..0.5
            new Float32Array([
                -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5,
                0.5,
            ]),
            gl.STATIC_DRAW
        )

        const ball = buildSphere(SPHERE_W, SPHERE_H)
        const ballBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, ballBuf)
        gl.bufferData(gl.ARRAY_BUFFER, ball.positions, gl.STATIC_DRAW)
        const ballTri = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballTri)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ball.tris, gl.STATIC_DRAW)
        const ballEdge = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballEdge)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ball.edges, gl.STATIC_DRAW)

        // one segment per node: [core surface, node]. Grown, never per-frame
        // reallocated — a node count change is the only thing that resizes it.
        const lineBuf = gl.createBuffer()
        let lineData = new Float32Array(0)
        const ensureLines = (n: number) => {
            if (lineData.length === n * 6) return
            lineData = new Float32Array(n * 6)
            gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf)
            gl.bufferData(gl.ARRAY_BUFFER, lineData, gl.DYNAMIC_DRAW)
        }

        /* -------------------------------------------------------- textures */
        const white = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, white)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([255, 255, 255, 255])
        )
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        const isPOT = (v: number) => (v & (v - 1)) === 0 && v > 0

        const upload = (img: HTMLImageElement): WebGLTexture | null => {
            const tex = gl.createTexture()
            if (!tex) return null
            gl.bindTexture(gl.TEXTURE_2D, tex)
            // v = 1 is the top of the quad, and must therefore be the top of
            // the image — three's texture.flipY default, spelled out
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
            // SRGB8_ALPHA8, matching the internal format three picked for a
            // texture tagged SRGBColorSpace: the sampler decodes sRGB -> linear
            // in hardware, and because this shader writes its result straight
            // out with no encode, the photos land on screen linearised —
            // darker and more contrasty than the source file.
            //
            // That is the look this component has always shipped, and it is
            // reproduced here on purpose (measured: mean |delta| 0.18/255
            // against the three build; with a plain gl.RGBA upload it was
            // 6.10/255). To show the photos at true sRGB instead, pass
            // gl.RGBA as the internal format below — nothing else changes.
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                isGL2 ? (gl as any).SRGB8_ALPHA8 : gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                img
            )
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            // WebGL1 cannot mip a non-power-of-two texture, and gallery images
            // never are; it falls back to a plain bilinear minify
            const mip =
                isGL2 || (isPOT(img.naturalWidth) && isPOT(img.naturalHeight))
            if (mip) {
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_MIN_FILTER,
                    gl.LINEAR_MIPMAP_LINEAR
                )
                gl.generateMipmap(gl.TEXTURE_2D)
                if (aniso) {
                    const max = gl.getParameter(
                        (aniso as any).MAX_TEXTURE_MAX_ANISOTROPY_EXT
                    )
                    gl.texParameterf(
                        gl.TEXTURE_2D,
                        (aniso as any).TEXTURE_MAX_ANISOTROPY_EXT,
                        Math.min(8, max || 1)
                    )
                }
            } else {
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_MIN_FILTER,
                    gl.LINEAR
                )
            }
            return tex
        }

        /* ------------------------------------------------------------ size */
        let vw = 1
        let vh = 1
        const resize = () => {
            // clientWidth, not the injected width prop: in Framer's preview the
            // size props are not numeric and the buffer would come out 0x0
            const w = Math.max(1, host.clientWidth)
            const h = Math.max(1, host.clientHeight)
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            vw = Math.max(1, Math.round(w * dpr))
            vh = Math.max(1, Math.round(h * dpr))
            if (canvas.width !== vw) canvas.width = vw
            if (canvas.height !== vh) canvas.height = vh
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(host)

        /* ----------------------------------------------------------- input */
        const pointer = {
            nx: 0,
            ny: 0,
            inside: false,
            dragging: false,
            lastX: 0,
            lastY: 0,
            downX: 0,
            downY: 0,
            downAt: 0,
        }

        const orbit = {
            yaw: 0,
            pitch: 0,
            yawVel: 0, // deg/sec, inertia after release
            pitchVel: 0,
            spin: 0, // auto-rotation accumulator, radians
            zoom: clamp(
                live.current.radius * REST_DIST_MUL,
                live.current.minZoom,
                live.current.maxZoom
            ),
            zoomTarget: 0,
        }
        orbit.zoomTarget = orbit.zoom

        /* The dolly the frame was actually drawn with — `orbit.zoom` is the
         * wheel's own value, Scale divides it. The hit test and the cursor
         * probe must ray-cast from the SAME camera the pixels came from, so
         * they read this and never `orbit.zoom`. */
        let camDist = orbit.zoom / live.current.scale

        const nodes: NodeRT[] = []
        const setNdc = (e: PointerEvent) => {
            // a ratio, so the canvas zoom that rides on getBoundingClientRect
            // cancels out of both terms (rule G's exception)
            const r = host.getBoundingClientRect()
            pointer.nx = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1
            pointer.ny = -((e.clientY - r.top) / Math.max(1, r.height)) * 2 + 1
        }

        /* ------------------------------------------------------------- ray
         * The camera sits at (0,0,z) and never rotates — the RIG rotates — so
         * unprojecting an NDC point is one tangent and no matrix inverse.
         */
        const rayO = [0, 0, 0]
        const rayD = [0, 0, -1]
        const rayOL = [0, 0, 0]
        const rayDL = [0, 0, -1]
        const tmpA = [0, 0, 0]
        const axR = [0, 0, 0]
        const axU = [0, 0, 0]
        const axN = [0, 0, 0]

        const buildRay = (camZ: number, fovRad: number, aspect: number) => {
            const th = Math.tan(fovRad / 2)
            const dx = pointer.nx * th * aspect
            const dy = pointer.ny * th
            const dz = -1
            const len = Math.hypot(dx, dy, dz) || 1
            rayO[0] = 0
            rayO[1] = 0
            rayO[2] = camZ
            rayD[0] = dx / len
            rayD[1] = dy / len
            rayD[2] = dz / len
        }

        /**
         * Ray vs. the node quads, in RIG-LOCAL space — the ray is un-rotated
         * once instead of every node being rotated into world. Returns the
         * nearest hit index, or -1.
         */
        const hitTest = (R: number[]): number => {
            applyBasisT(R, rayO[0], rayO[1], rayO[2], rayOL)
            applyBasisT(R, rayD[0], rayD[1], rayD[2], rayDL)

            let best = -1
            let bestT = Infinity
            for (let i = 0; i < nodes.length; i++) {
                const nd = nodes[i]
                quatAxes(nd.q, axR, axU, axN)
                const denom =
                    rayDL[0] * axN[0] + rayDL[1] * axN[1] + rayDL[2] * axN[2]
                if (Math.abs(denom) < 1e-8) continue
                const ox = nd.px - rayOL[0]
                const oy = nd.py - rayOL[1]
                const oz = nd.pz - rayOL[2]
                const t = (ox * axN[0] + oy * axN[1] + oz * axN[2]) / denom
                if (t <= 0 || t >= bestT) continue
                const hx = rayOL[0] + rayDL[0] * t - nd.px
                const hy = rayOL[1] + rayDL[1] * t - nd.py
                const hz = rayOL[2] + rayDL[2] * t - nd.pz
                const u = hx * axR[0] + hy * axR[1] + hz * axR[2]
                const v = hx * axU[0] + hy * axU[1] + hz * axU[2]
                if (Math.abs(u) > nd.hx || Math.abs(v) > nd.hy) continue
                bestT = t
                best = i
            }
            return best
        }

        // the rig basis of the frame just rendered — the hit test must use the
        // same one the pixels were drawn with
        let frameBasis = rigBasis(0, 0)

        const onPointerDown = (e: PointerEvent) => {
            setNdc(e)
            pointer.inside = true
            pointer.dragging = true
            pointer.lastX = e.clientX
            pointer.lastY = e.clientY
            pointer.downX = e.clientX
            pointer.downY = e.clientY
            pointer.downAt = performance.now()
            orbit.yawVel = 0
            orbit.pitchVel = 0
            canvas.style.cursor = "grabbing"
        }

        const onPointerMove = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            const inBox =
                e.clientX >= r.left &&
                e.clientX <= r.right &&
                e.clientY >= r.top &&
                e.clientY <= r.bottom
            pointer.inside = inBox || pointer.dragging
            if (pointer.inside) setNdc(e)

            if (!pointer.dragging) {
                if (inBox) {
                    buildRay(camDist, (FOV * Math.PI) / 180, vw / vh)
                    const idx = hitTest(frameBasis)
                    canvas.style.cursor =
                        idx >= 0 && linksRef.current[idx] ? "pointer" : "grab"
                }
                return
            }

            const dx = e.clientX - pointer.lastX
            const dy = e.clientY - pointer.lastY
            pointer.lastX = e.clientX
            pointer.lastY = e.clientY

            const L = live.current
            // degrees per pixel -> radians, applied straight to the rig
            orbit.yaw += (dx * L.orbitSpeed * Math.PI) / 180
            orbit.pitch += (dy * L.orbitSpeed * Math.PI) / 180
            const lim = (L.orbitLimit * Math.PI) / 180
            orbit.pitch = clamp(orbit.pitch, -lim, lim)

            // carry the instantaneous rate for release inertia
            orbit.yawVel = dx * L.orbitSpeed * 60
            orbit.pitchVel = dy * L.orbitSpeed * 60
        }

        const release = (e: PointerEvent) => {
            if (!pointer.dragging) return
            pointer.dragging = false
            canvas.style.cursor = "grab"

            const dt = performance.now() - pointer.downAt
            const dist =
                Math.abs(e.clientX - pointer.downX) +
                Math.abs(e.clientY - pointer.downY)

            // a click, not a drag: navigate
            if (dist <= CLICK_SLOP_PX && dt <= CLICK_MS) {
                orbit.yawVel = 0
                orbit.pitchVel = 0
                setNdc(e)
                buildRay(camDist, (FOV * Math.PI) / 180, vw / vh)
                const idx = hitTest(frameBasis)
                const url = idx >= 0 ? linksRef.current[idx] : ""
                if (url) {
                    window.open(url, "_blank", "noopener,noreferrer")
                }
            }
        }

        const onLeave = () => {
            if (!pointer.dragging) pointer.inside = false
        }

        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            const L = live.current
            orbit.zoomTarget = clamp(
                orbit.zoomTarget + e.deltaY * 0.02 * L.zoomGain,
                L.minZoom,
                L.maxZoom
            )
        }

        canvas.style.cursor = "grab"
        canvas.style.touchAction = "none"
        canvas.addEventListener("pointerdown", onPointerDown)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("wheel", onWheel, { passive: false })
        // move/up on window: a pointer that leaves the host mid-drag must still
        // orbit, and must still release (rule 8)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", release)
        window.addEventListener("pointercancel", release)

        /* ------------------------------------------------------------ state */
        const proj = mat4()
        const view = mat4()
        const viewProj = mat4()
        const model = mat4()
        const mvp = mat4()
        const qRig: Quat = [0, 0, 0, 1]
        const qCamLocal: Quat = [0, 0, 0, 1]
        const qRadial: Quat = [0, 0, 0, 1]
        const forwardLocal = [0, 0, -1]
        const placeholderRGB = parseColor(PLACEHOLDER, [0, 0, 0, 1])
        const order: number[] = []

        gl.clearColor(0, 0, 0, 0)
        gl.enable(gl.DEPTH_TEST)

        /* ------------------------------------------------------------ loop */
        let raf = 0
        let prev = performance.now()

        const frame = () => {
            raf = requestAnimationFrame(frame)

            const now = performance.now()
            const dt = Math.min(0.05, (now - prev) / 1000)
            prev = now

            const L = live.current
            const media = mediaRef.current
            const n = Math.max(0, L.count | 0)
            // images CYCLE across the branches: 1 image fills all of them, 3
            // repeat 4x across 12. Modulo rather than a padded media array, so a
            // repeated image stays ONE decoded texture. Every read of a node's
            // media goes through here — sizing and drawing must agree on the
            // aspect or the rounded-corner SDF is fed a box it isn't drawing.
            const mediaFor = (i: number): Loaded | undefined =>
                media.length ? media[i % media.length] : undefined

            /* -------------------------------------- retired GL textures */
            const grave = graveyardRef.current
            while (grave.length) gl.deleteTexture(grave.pop() as WebGLTexture)

            /* ------------------------------------------ node bookkeeping */
            while (nodes.length < n) nodes.push(makeNode())
            if (nodes.length > n) nodes.length = n
            ensureLines(n)

            /* ------------------------------------------------- viewport */
            gl.viewport(0, 0, vw, vh)
            // depthMask gates the depth CLEAR, not just depth writes, and the
            // previous frame ended with it false (the transparent passes turn
            // it off). Without this the depth buffer is cleared exactly once:
            // the solid nucleus draws on frame 1, then fails its own equal-depth
            // test forever, and every later frame depth-tests the nodes against
            // frame 1's stale values.
            gl.depthMask(true)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

            /* -------------------------------------------------- camera */
            const lo = Math.min(L.minZoom, L.maxZoom)
            const hi = Math.max(L.minZoom, L.maxZoom)
            orbit.zoomTarget = clamp(orbit.zoomTarget, lo, hi)
            orbit.zoom +=
                (orbit.zoomTarget - orbit.zoom) * (1 - Math.exp(-ZOOM_RATE * dt))
            // Scale 200% halves the dolly, so the shell draws twice as large.
            camDist = orbit.zoom / Math.max(0.001, L.scale)

            const fovRad = (FOV * Math.PI) / 180
            const aspect = vw / vh
            perspective(proj, fovRad, aspect)

            /* --------------------------------------------------- orbit */
            if (!pointer.dragging) {
                // exponential decay, dt-correct — orbitDamping 0 stops instantly
                const keep =
                    L.orbitDamping <= 0
                        ? 0
                        : Math.exp((-6 / Math.max(0.001, L.orbitDamping)) * dt)
                orbit.yaw += ((orbit.yawVel * dt * Math.PI) / 180) * keep
                orbit.pitch += ((orbit.pitchVel * dt * Math.PI) / 180) * keep
                orbit.yawVel *= keep
                orbit.pitchVel *= keep
                const lim = (L.orbitLimit * Math.PI) / 180
                orbit.pitch = clamp(orbit.pitch, -lim, lim)
            }
            orbit.spin += L.spin * dt
            if (orbit.spin > Math.PI * 2) orbit.spin -= Math.PI * 2

            const yaw = orbit.spin + orbit.yaw
            const pitch = orbit.pitch
            rigView(view, yaw, pitch, camDist)
            mul(viewProj, proj, view)

            const R = rigBasis(yaw, pitch)
            frameBasis = R
            quatFromYawPitch(yaw, pitch, qRig)
            // the camera has no rotation of its own, so its orientation
            // expressed in rig-local space is simply the rig's inverse
            qCamLocal[0] = -qRig[0]
            qCamLocal[1] = -qRig[1]
            qCamLocal[2] = -qRig[2]
            qCamLocal[3] = qRig[3]
            // camera forward is -Z in world; Rᵀ takes it to rig-local
            applyBasisT(R, 0, 0, -1, forwardLocal)

            const coreR = Math.max(0.001, L.coreSize)

            /* ---------------------------------------------------- core */
            gl.useProgram(solidProg)
            gl.uniformMatrix4fv(sLoc.uMVP, false, viewProj)
            gl.bindBuffer(gl.ARRAY_BUFFER, ballBuf)
            gl.enableVertexAttribArray(sLoc.aPos)
            gl.vertexAttribPointer(sLoc.aPos, 3, gl.FLOAT, false, 0, 0)

            if (L.coreSize > 0.001) {
                const c = parseColor(L.coreColor, [0.48, 0.72, 1, 1])
                gl.disable(gl.BLEND)
                gl.enable(gl.CULL_FACE)
                gl.cullFace(gl.BACK)
                gl.depthMask(true)
                gl.uniform1f(sLoc.uScale, coreR)
                gl.uniform4f(sLoc.uColor, c[0], c[1], c[2], 1)
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballTri)
                gl.drawElements(
                    gl.TRIANGLES,
                    ball.tris.length,
                    gl.UNSIGNED_SHORT,
                    0
                )
                gl.disable(gl.CULL_FACE)
            }
            gl.disableVertexAttribArray(sLoc.aPos)

            gl.enable(gl.BLEND)
            gl.depthMask(false)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

            /* The mesh halo is the core's OUTER layer, and it is transparent,
             * so it writes no depth and the depth buffer cannot sort it. It has
             * to be PAINTED in the right place instead: after everything behind
             * the core, before everything in front of it.
             *
             * Drawn here — with the solid nucleus, as it used to be — a plate
             * that had rotated to the back was correctly hidden by the SOLID
             * layer but still painted over the MESH, so it read as sandwiched
             * between the core's two layers instead of behind both.
             *
             * The nodes are already depth-sorted back to front below, so the
             * halo just goes in at the crossover. */
            const drawHalo = () => {
                if (L.coreGlow <= 0.002) return
                const c = parseColor(L.coreColor, [0.48, 0.72, 1, 1])
                gl.useProgram(solidProg)
                gl.uniformMatrix4fv(sLoc.uMVP, false, viewProj)
                gl.bindBuffer(gl.ARRAY_BUFFER, ballBuf)
                gl.enableVertexAttribArray(sLoc.aPos)
                gl.vertexAttribPointer(sLoc.aPos, 3, gl.FLOAT, false, 0, 0)
                // additive premultiplied — what makes the halo bloom rather
                // than sit as a flat grey mesh over the nucleus
                gl.blendFunc(gl.ONE, gl.ONE)
                gl.uniform1f(sLoc.uScale, coreR * 1.45)
                gl.uniform4f(sLoc.uColor, c[0], c[1], c[2], L.coreGlow)
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballEdge)
                gl.drawElements(
                    gl.LINES,
                    ball.edges.length,
                    gl.UNSIGNED_SHORT,
                    0
                )
                gl.disableVertexAttribArray(sLoc.aPos)
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
            }

            if (!n) {
                gl.disableVertexAttribArray(sLoc.aPos)
                // no plates to sort against, so the halo has nothing to sit
                // between — draw it and go
                drawHalo()
                return
            }

            /* -------------------------------------------- magnetic ray */
            const hovering =
                pointer.inside && L.force > 0 && L.hoverDist > 0
            if (hovering) buildRay(camDist, fovRad, aspect)

            /* ------------------------------------------------- layout */
            const worldPerPixel = (2 * Math.tan(fovRad / 2)) / vh

            for (let i = 0; i < n; i++) {
                const nd = nodes[i]

                // --- Fibonacci / golden-spiral shell -------------------
                // (i + 0.5)/n, not i/(n-1): the endpoint form doubles up a
                // point on each pole and leaves a bald ring below it
                const y = 1 - (2 * (i + 0.5)) / n
                const rr = Math.sqrt(Math.max(0, 1 - y * y))
                const th = GOLDEN_ANGLE * i
                // ±half the Scatter setting: a full-amplitude jitter would let
                // a node land at radius 0, i.e. inside the nucleus
                const jitter = 1 + (hash01(i) - 0.5) * L.depthRand
                const Rr = L.radius * jitter

                const bx = Math.cos(th) * rr * Rr
                const by = y * Rr
                const bz = Math.sin(th) * rr * Rr

                // --- magnetic attraction -------------------------------
                // The cursor is a RAY through the scene, so "near the pointer"
                // means near that line in 3D — correct from every orbit angle.
                // A screen-space test would drag the far side of the shell too.
                let capture = 0
                let tx = 0,
                    ty = 0,
                    tz = 0
                if (hovering) {
                    // rest position in WORLD space
                    applyBasis(R, bx, by, bz, tmpA)
                    const wx = tmpA[0],
                        wy = tmpA[1],
                        wz = tmpA[2]
                    // closest point on the ray, three's Ray.closestPointToPoint
                    // (t clamped at the origin, never behind the camera)
                    const t = Math.max(
                        0,
                        (wx - rayO[0]) * rayD[0] +
                            (wy - rayO[1]) * rayD[1] +
                            (wz - rayO[2]) * rayD[2]
                    )
                    const cx = rayO[0] + rayD[0] * t
                    const cy = rayO[1] + rayD[1] * t
                    const cz = rayO[2] + rayD[2] * t
                    const d = Math.hypot(cx - wx, cy - wy, cz - wz)
                    if (d < L.hoverDist) {
                        const u = 1 - d / L.hoverDist
                        capture = u * u * (3 - 2 * u) // smoothstep
                        // world -> rig-local, then scaled by the capture
                        applyBasisT(R, cx - wx, cy - wy, cz - wz, tmpA)
                        const k = capture * L.force
                        tx = tmpA[0] * k
                        ty = tmpA[1] * k
                        tz = tmpA[2] * k
                        // and pop it toward the viewer so the captured node
                        // reads as lifted off the shell, not just slid along it
                        const pop = -k * L.radius * 0.12
                        tx += forwardLocal[0] * pop
                        ty += forwardLocal[1] * pop
                        tz += forwardLocal[2] * pop
                    }
                }

                // --- spring toward that target -------------------------
                // damped harmonic, integrated with dt-correct decay. DAMPING is
                // frozen at the shipped 60% — the decay rate, not a per-frame
                // multiply, so it stays correct at any frame rate.
                const damp = 2 + DAMPING * 16
                nd.vx += (tx - nd.ox) * SPRING_STIFFNESS * dt
                nd.vy += (ty - nd.oy) * SPRING_STIFFNESS * dt
                nd.vz += (tz - nd.oz) * SPRING_STIFFNESS * dt
                const decay = Math.exp(-damp * dt)
                nd.vx *= decay
                nd.vy *= decay
                nd.vz *= decay
                nd.ox += nd.vx * dt
                nd.oy += nd.vy * dt
                nd.oz += nd.vz * dt

                const px = bx + nd.ox
                const py = by + nd.oy
                const pz = bz + nd.oz
                nd.px = px
                nd.py = py
                nd.pz = pz

                // --- orientation ---------------------------------------
                // radial first: the quad's +Z normal points straight away from
                // the nucleus, built from unit vectors rather than a lookAt(),
                // which resolves its target in WORLD space and would therefore
                // swing as the rig rotates
                const radLen = Math.hypot(px, py, pz) || 1
                quatFromZTo(px / radLen, py / radLen, pz / radLen, qRadial)
                // then part-way toward the camera, so a node crossing the
                // silhouette never thins to an invisible edge
                quatSlerp(qRadial, qCamLocal, BILLBOARD_BLEND, nd.q)

                // --- size ----------------------------------------------
                // SAME cycled lookup as the draw loop. If this indexed media[i]
                // while the draw indexed media[i % len], a duplicated image gave
                // node > 0 a SQUARE quad (aspect 1, no entry) under an SDF told
                // the box was the picture's aspect — the mask then squeezes and
                // Rounded 100 stops being a full round.
                const m = mediaFor(i)
                const aspectI = m?.aspect || 1
                const s = L.itemSize * (1 + HOVER_POP * capture)
                nd.hx = (s * aspectI) / 2
                nd.hy = s / 2

                // the string to the nucleus is built AFTER the depth sort, in
                // sorted order, so it can be split at the core with its plate

                order[i] = i
            }
            order.length = n

            /* --------------------------------------------------- nodes
             * Back to front. Transparent quads have no depth write, so the
             * only thing making the far side of the shell sit BEHIND the near
             * side is this sort — the same one three's transparent pass runs.
             */
            const depthOf = (nd: NodeRT) =>
                R[6] * nd.px + R[7] * nd.py + R[8] * nd.pz // world z
            order.sort((a, b) => depthOf(nodes[a]) - depthOf(nodes[b]))

            /* Where the sorted run crosses the core. The core is centred on the
             * origin, so a plate with world z < 0 is behind it and one with
             * z >= 0 is in front; `order` is ascending, so this is one scan. */
            let split = 0
            while (split < n && depthOf(nodes[order[split]]) < 0) split++

            /* --------------------------------------------------- lines
             * Built in SORTED order, so a string can be split at the core the
             * same way its plate is — a string to a back node belongs behind
             * the mesh with the node it feeds, not in front of it.
             */
            for (let o = 0; o < n; o++) {
                const nd = nodes[order[o]]
                const len = Math.hypot(nd.px, nd.py, nd.pz) || 1
                const k = coreR / len
                lineData[o * 6 + 0] = nd.px * k
                lineData[o * 6 + 1] = nd.py * k
                lineData[o * 6 + 2] = nd.pz * k
                lineData[o * 6 + 3] = nd.px
                lineData[o * 6 + 4] = nd.py
                lineData[o * 6 + 5] = nd.pz
            }
            if (L.lineOpacity > 0.002) {
                gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, lineData)
            }

            const drawStrings = (from: number, count: number) => {
                if (count <= 0 || L.lineOpacity <= 0.002) return
                const c = parseColor(L.lineColor, [0.29, 0.42, 0.6, 1])
                gl.useProgram(solidProg)
                gl.uniformMatrix4fv(sLoc.uMVP, false, viewProj)
                gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf)
                gl.enableVertexAttribArray(sLoc.aPos)
                gl.vertexAttribPointer(sLoc.aPos, 3, gl.FLOAT, false, 0, 0)
                gl.uniform1f(sLoc.uScale, 1)
                gl.uniform4f(sLoc.uColor, c[0], c[1], c[2], L.lineOpacity)
                gl.drawArrays(gl.LINES, from * 2, count * 2)
                gl.disableVertexAttribArray(sLoc.aPos)
            }

            const beginQuads = () => {
                gl.useProgram(quadProg)
                gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
                gl.enableVertexAttribArray(qLoc.aCorner)
                gl.vertexAttribPointer(qLoc.aCorner, 2, gl.FLOAT, false, 0, 0)
                gl.uniform1i(qLoc.uMap, 0)
                gl.uniform3f(
                    qLoc.uPlaceholder,
                    placeholderRGB[0],
                    placeholderRGB[1],
                    placeholderRGB[2]
                )
                gl.uniform1f(qLoc.uOpacity, 1)
                gl.activeTexture(gl.TEXTURE0)
            }

            const drawQuads = (from: number, to: number) => {
            for (let o = from; o < to; o++) {
                const i = order[o]
                const nd = nodes[i]
                const m = mediaFor(i)

                // lazy upload: the image decoded in the media effect, but only
                // the loop has the context
                if (m && m.image && !m.texture) {
                    m.texture = upload(m.image)
                    m.applied = false
                    m.image = null
                }

                const aspectI = m?.aspect || 1
                const hasTex = m && m.texture ? 1 : 0
                gl.bindTexture(gl.TEXTURE_2D, hasTex ? (m as Loaded).texture : white)
                gl.uniform1f(qLoc.uHasTex, hasTex)
                // Percent of the max radius — half the plate's short side.
                // 100 is a true CIRCLE at any aspect: the shader narrows its
                // SDF box to match, and the plate's long axis is clipped.
                if (hasTex) {
                    gl.uniform2f(qLoc.uHalf, aspectI / 2, 0.5)
                    gl.uniform1f(
                        qLoc.uRadius,
                        L.rounded * Math.min(aspectI / 2, 0.5)
                    )
                } else {
                    gl.uniform2f(qLoc.uHalf, 0.5, 0.5)
                    gl.uniform1f(qLoc.uRadius, L.rounded * 0.5)
                }

                const sy = nd.hy * 2
                const sx = nd.hx * 2
                compose(model, nd.px, nd.py, nd.pz, nd.q, sx, sy, 1)
                mul(mvp, viewProj, model)
                gl.uniformMatrix4fv(qLoc.uMVP, false, mvp)

                // --- depth shading -------------------------------------
                const depth =
                    R[6] * nd.px + R[7] * nd.py + R[8] * nd.pz // world z
                const tt = clamp((depth + L.radius) / (2 * L.radius), 0, 1)
                gl.uniform1f(qLoc.uDim, DEPTH_FLOOR + (1 - DEPTH_FLOOR) * tt)

                // one screen pixel, expressed in the SDF's own units. The
                // quad's world half-extent is sy * uHalf, so world -> SDF is a
                // divide by sy — no derivatives needed.
                const dist = Math.max(0.001, camDist - depth)
                gl.uniform1f(qLoc.uAA, (worldPerPixel * dist) / Math.max(1e-4, sy))

                gl.drawArrays(gl.TRIANGLES, 0, 6)
            }
            }

            /* ------------------------------------------- paint order
             * Everything behind the core, then the core's mesh layer, then
             * everything in front. The solid layer is already down and holds
             * the depth buffer, so a back plate is occluded by it; the mesh
             * writes no depth and can only be sorted by being painted here.
             */
            drawStrings(0, split)
            beginQuads()
            drawQuads(0, split)
            gl.disableVertexAttribArray(qLoc.aCorner)

            drawHalo()

            drawStrings(split, n - split)
            beginQuads()
            drawQuads(split, n)
            gl.disableVertexAttribArray(qLoc.aCorner)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointerdown", onPointerDown)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("wheel", onWheel)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", release)
            window.removeEventListener("pointercancel", release)

            gl.deleteBuffer(quadBuf)
            gl.deleteBuffer(ballBuf)
            gl.deleteBuffer(ballTri)
            gl.deleteBuffer(ballEdge)
            gl.deleteBuffer(lineBuf)
            gl.deleteTexture(white)
            mediaRef.current.forEach((m) => {
                if (m.texture) gl.deleteTexture(m.texture)
                m.texture = null
            })
            while (graveyardRef.current.length) {
                gl.deleteTexture(graveyardRef.current.pop() as WebGLTexture)
            }
            gl.deleteProgram(quadProg)
            gl.deleteProgram(solidProg)
            // never loseContext(): getContext returns the same context per
            // canvas, so a StrictMode remount would reuse a force-lost one
        }
        // built once — every live input is read from `live.current`
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /* -------------------------------------------------------------- render */
    return (
        <div
            ref={hostRef}
            className={className}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                // Framer Fit Content collapses a 100% root to 0x0 — floor it
                // BEFORE the spread, so an explicit instance size still wins
                minWidth: 1200,
                minHeight: 800,
                overflow: "hidden",
                background,
                isolation: "isolate",
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
