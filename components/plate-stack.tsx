"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * PLATE STACK — five rounded plates stacked face to face, each turning a
 * quarter and overshooting, one after another.
 *
 * Port of `Item7` ("Stagger") from d3adrabbit/origami (Codrops, "Origami: Free
 * 3D Motion Graphics"). The reference defines the interaction, the motion and
 * the framing (rule 8), and this reproduces them term for term:
 *
 *   - five drei <RoundedBox> of 1 x 0.1 x 1 with corner radius 0.02, at
 *     y = (i - 1) * 0.1 — exactly their own thickness apart, so the stack is
 *     solid with no gaps;
 *   - `<Center scale={3} rotation={[PI/10, PI/4, 0]}>`, and the stack's bbox
 *     centre is NOT the origin (the plates run from -0.15 to +0.35), so the
 *     Center offset is real here, unlike in the other items;
 *   - one `gsap.to` turning every plate `y: "+=PI/2"` over 1s with `ease:
 *     "back"` — which resolves to back.out — staggered 0.1s apart, so the
 *     whole tween is 1.4s long and then repeats;
 *   - no pointer interaction of any kind — the reference has none.
 *
 * WHY THE LOOP IS SEAMLESS: a 1 x 1 plate turned a quarter about its own
 * vertical axis maps onto itself, so the snap back from PI/2 to 0 is invisible.
 *
 * WHAT THE PORT CHANGES (machinery only):
 *
 *   - three.js + @react-three/fiber + drei + GSAP become raw WebGL and a raw
 *     rAF loop (rules 6 and 10). Nothing is imported that is not in this file.
 *   - the rounded box is built as its exact parts — six inset flat faces,
 *     twelve quarter-cylinder edges, eight spherical corners — rather than by
 *     displacing a subdivided cube, so the flat faces stay flat and the
 *     specular does not crawl across them.
 *   - `MeshMatcapMaterial` sampling a photographed chrome sphere becomes the
 *     analytic matcap in FRAG below, so Base Color / Accent Color drive the
 *     material instead of a dropdown of three baked textures.
 *
 * Keys are new — this file has no earlier shape and therefore no legacy
 * fallbacks to carry (rule 11c, clean break).
 */
/* --------------------------------------------------------------- constants */

const TAU = Math.PI * 2
const DPR_CAP = 2
/** Vertical field of view. Framing is the Distance dial's job, not this. */
const FOV = (45 * Math.PI) / 180
const NEAR = 0.1
const FAR = 200

/** The reference's plate, its spacing and its framing. */
const PLATE_W = 1
const PLATE_H = 0.1
const PLATE_D = 1
const SPACING = 0.1
const SCALE = 3
const TILT_X = Math.PI / 10
const TILT_Y = Math.PI / 4
/** drei's <RoundedBox smoothness> default. */
const ROUND_SEG = 4
/** The largest radius the plate can carry: half its shortest side. */
const MAX_R = PLATE_H / 2
/** One plate's quarter turn, and the reference's 0.1s stagger. */
const SWEEP = Math.PI / 2
const DUR = 1

/* ------------------------------------------------------------------ colour */

type RGB = [number, number, number]

/**
 * Framer's Color control does NOT hand back hex. Depending on where the swatch
 * came from it emits `rgb()`, `rgba()`, `hsl()`, `hsla()` or
 * `var(--token, <fallback>)`, so a hex-only parser silently pins every colour
 * to its default and the dial reads as dead.
 */
function parseColor(input: string | undefined, fb: RGB): RGB {
    if (!input) return fb
    let s = String(input).trim()
    const v = /^var\(\s*--[^,]+,\s*(.+)\)\s*$/i.exec(s)
    if (v) s = v[1].trim()

    if (s.charAt(0) === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) {
            h =
                h.charAt(0) + h.charAt(0) +
                h.charAt(1) + h.charAt(1) +
                h.charAt(2) + h.charAt(2)
        }
        if (h.length < 6) return fb
        const n = parseInt(h.slice(0, 6), 16)
        if (!isFinite(n)) return fb
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }

    const m = /^(rgba?|hsla?)\(([^)]+)\)\s*$/i.exec(s)
    if (!m) return fb
    const parts = m[2].split(/[\s,/]+/).filter((x) => x.length > 0)
    if (parts.length < 3) return fb

    if (m[1].charAt(0).toLowerCase() === "r") {
        const ch = (t: string) =>
            t.indexOf("%") >= 0 ? (parseFloat(t) / 100) * 255 : parseFloat(t)
        const r = ch(parts[0]), g = ch(parts[1]), b = ch(parts[2])
        if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return fb
        return [r / 255, g / 255, b / 255]
    }

    // hsl() / hsla(). The hue may carry a deg / rad / turn unit.
    let hue = parseFloat(parts[0])
    if (parts[0].indexOf("turn") >= 0) hue *= 360
    else if (parts[0].indexOf("rad") >= 0) hue *= 180 / Math.PI
    const sat = parseFloat(parts[1]) / 100
    const lit = parseFloat(parts[2]) / 100
    if (!isFinite(hue) || !isFinite(sat) || !isFinite(lit)) return fb
    const c = (1 - Math.abs(2 * lit - 1)) * sat
    const hp = (((hue % 360) + 360) % 360) / 60
    const x = c * (1 - Math.abs((hp % 2) - 1))
    let r = 0, g = 0, b = 0
    if (hp < 1) { r = c; g = x } else if (hp < 2) { r = x; g = c }
    else if (hp < 3) { g = c; b = x } else if (hp < 4) { g = x; b = c }
    else if (hp < 5) { r = x; b = c } else { r = c; b = x }
    const mm = lit - c / 2
    return [r + mm, g + mm, b + mm]
}

/* -------------------------------------------------------------------- mat4 */

type M4 = Float32Array

/** Column-major, GL order — the same layout three.js uploads. */
function m4(): M4 {
    const o = new Float32Array(16)
    o[0] = o[5] = o[10] = o[15] = 1
    return o
}

function m4Ident(o: M4): M4 {
    o.fill(0)
    o[0] = o[5] = o[10] = o[15] = 1
    return o
}

/** out = a * b. `out` must not alias either input. */
function m4Mul(a: M4, b: M4, out: M4): M4 {
    for (let c = 0; c < 4; c++) {
        const b0 = b[c * 4], b1 = b[c * 4 + 1]
        const b2 = b[c * 4 + 2], b3 = b[c * 4 + 3]
        out[c * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3
        out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3
        out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3
        out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3
    }
    return out
}

const SCR_A = m4()
const SCR_B = m4()

/* Every transform below POST-multiplies (m := m * R), so a chain of calls
 * reads outermost parent first, exactly like walking a three.js scene graph
 * downwards. Euler order XYZ means R = Rx * Ry * Rz, which is what
 * Matrix4.makeRotationFromEuler builds for three's default order — call
 * rotX, then rotY, then rotZ to reproduce it. */

function rotX(m: M4, a: number) {
    if (a === 0) return
    const c = Math.cos(a), s = Math.sin(a)
    m4Ident(SCR_A)
    SCR_A[5] = c; SCR_A[6] = s; SCR_A[9] = -s; SCR_A[10] = c
    m.set(m4Mul(m, SCR_A, SCR_B))
}

function rotY(m: M4, a: number) {
    if (a === 0) return
    const c = Math.cos(a), s = Math.sin(a)
    m4Ident(SCR_A)
    SCR_A[0] = c; SCR_A[2] = -s; SCR_A[8] = s; SCR_A[10] = c
    m.set(m4Mul(m, SCR_A, SCR_B))
}

function rotZ(m: M4, a: number) {
    if (a === 0) return
    const c = Math.cos(a), s = Math.sin(a)
    m4Ident(SCR_A)
    SCR_A[0] = c; SCR_A[1] = s; SCR_A[4] = -s; SCR_A[5] = c
    m.set(m4Mul(m, SCR_A, SCR_B))
}

/** m := m * T(x, y, z) */
function trans(m: M4, x: number, y: number, z: number) {
    m[12] = m[0] * x + m[4] * y + m[8]  * z + m[12]
    m[13] = m[1] * x + m[5] * y + m[9]  * z + m[13]
    m[14] = m[2] * x + m[6] * y + m[10] * z + m[14]
    m[15] = m[3] * x + m[7] * y + m[11] * z + m[15]
}

/** m := m * S(s), uniform. */
function scaleU(m: M4, s: number) {
    for (let i = 0; i < 12; i++) m[i] *= s
}

function persp(out: M4, fovy: number, aspect: number, near: number, far: number): M4 {
    const f = 1 / Math.tan(fovy / 2)
    out.fill(0)
    out[0] = f / aspect
    out[5] = f
    out[10] = (far + near) / (near - far)
    out[11] = -1
    out[14] = (2 * far * near) / (near - far)
    return out
}

/**
 * Normal matrix: the INVERSE TRANSPOSE of the model's upper-left 3x3, written
 * column-major as a mat3. The view is a pure translation, so a model normal is
 * already the view-space normal.
 *
 * The transpose alone would do for rotations and uniform scale (the leftover
 * 1/s is divided out by the normalize() in the fragment shader), but a
 * non-uniform scale — a disc squashed on two axes but not the third — needs
 * the real inverse, or its normals tilt the wrong way and the shading slides
 * as the dial moves.
 */
function nm3(m: M4, out: Float32Array) {
    // rows of the maths matrix: (a d g) (b e h) (c f i)
    const a = m[0], b = m[1], c = m[2]
    const d = m[4], e = m[5], f = m[6]
    const g = m[8], h = m[9], i = m[10]
    const C11 = e * i - h * f
    const C12 = -(b * i - h * c)
    const C13 = b * f - e * c
    const det = a * C11 + d * C12 + g * C13
    if (!det) {
        out[0] = a; out[1] = b; out[2] = c
        out[3] = d; out[4] = e; out[5] = f
        out[6] = g; out[7] = h; out[8] = i
        return
    }
    const s = 1 / det
    // The cofactor matrix over det IS the inverse transpose.
    out[0] = C11 * s
    out[1] = -(d * i - g * f) * s
    out[2] = (d * h - g * e) * s
    out[3] = C12 * s
    out[4] = (a * i - g * c) * s
    out[5] = -(a * h - g * b) * s
    out[6] = C13 * s
    out[7] = -(a * f - d * c) * s
    out[8] = (a * e - d * b) * s
}
/* ---------------------------------------------------------------- geometry */

interface Geo {
    pos: Float32Array
    nrm: Float32Array
    idx: Uint16Array
}

function pack(pos: number[], nrm: number[], idx: number[]): Geo {
    return {
        pos: new Float32Array(pos),
        nrm: new Float32Array(nrm),
        idx: new Uint16Array(idx),
    }
}

/* Every builder below winds its triangles CCW as seen from OUTSIDE the
 * surface, because the fragment shader flips the normal on a back face the
 * way three's DoubleSide does. Get a winding backwards and the shading
 * inverts on that piece. */
/**
 * A rounded box, built as its exact three parts rather than by displacing a
 * subdivided cube: six flat faces inset by the radius, twelve quarter-cylinder
 * edges, eight spherical corner octants. That is the Minkowski sum of a box
 * and a sphere, so every normal is exact and the flat faces stay perfectly
 * flat — a displaced-cube approximation rounds them slightly and the specular
 * crawls across what should be a mirror.
 *
 * drei's <RoundedBox> is what the reference uses; the radius means the same
 * thing here, and is clamped to the shortest half-extent. At that clamp whole
 * pieces collapse to nothing — the two faces normal to the shortest axis, and
 * the four edges running along it — so each piece is skipped when its own
 * extent is zero rather than emitted as degenerate triangles.
 */
function roundedBoxGeo(w: number, h: number, d: number, radius: number, seg: number): Geo {
    const pos: number[] = [], nrm: number[] = [], idx: number[] = []
    const hx = w / 2, hy = h / 2, hz = d / 2
    const r = Math.max(0, Math.min(radius, hx, hy, hz))
    // Inner half-extents: the box the rounding is swept around.
    const ex = hx - r, ey = hy - r, ez = hz - r
    const HALF = Math.PI / 2

    const push = (px: number, py: number, pz: number, nx: number, ny: number, nz: number) => {
        pos.push(px, py, pz)
        nrm.push(nx, ny, nz)
        return pos.length / 3 - 1
    }
    const quad = (a: number, b: number, c: number, dd: number) => {
        idx.push(a, b, c, a, c, dd)
    }

    /* Six flat faces, each inset by r on both in-plane axes. The quad winds
     * a -> a+2u -> a+2u+2v, so its face normal is u x v: every pair below is
     * ordered so that cross product comes out along n. */
    const face = (n: [number, number, number], u: [number, number, number], v: [number, number, number]) => {
        if (!(u[0] || u[1] || u[2]) || !(v[0] || v[1] || v[2])) return
        const cx = n[0] * hx, cy = n[1] * hy, cz = n[2] * hz
        const a = push(cx - u[0] - v[0], cy - u[1] - v[1], cz - u[2] - v[2], n[0], n[1], n[2])
        const b = push(cx + u[0] - v[0], cy + u[1] - v[1], cz + u[2] - v[2], n[0], n[1], n[2])
        const c = push(cx + u[0] + v[0], cy + u[1] + v[1], cz + u[2] + v[2], n[0], n[1], n[2])
        const dd = push(cx - u[0] + v[0], cy - u[1] + v[1], cz - u[2] + v[2], n[0], n[1], n[2])
        quad(a, b, c, dd)
    }
    face([1, 0, 0], [0, 0, -ez], [0, ey, 0])
    face([-1, 0, 0], [0, 0, ez], [0, ey, 0])
    face([0, 1, 0], [ex, 0, 0], [0, 0, -ez])
    face([0, -1, 0], [ex, 0, 0], [0, 0, ez])
    face([0, 0, 1], [ex, 0, 0], [0, ey, 0])
    face([0, 0, -1], [-ex, 0, 0], [0, ey, 0])

    if (r > 0) {
        /* Twelve quarter-cylinder edges. `axis` is the edge's own direction;
         * the two remaining axes carry the quarter turn. */
        const edge = (axis: 0 | 1 | 2, s1: number, s2: number) => {
            const half = axis === 0 ? ex : axis === 1 ? ey : ez
            if (half === 0) return
            const e1 = axis === 0 ? ey : axis === 1 ? ez : ex
            const e2 = axis === 0 ? ez : axis === 1 ? ex : ey
            const put = (t: number, ang: number) => {
                const c = Math.cos(ang), sn = Math.sin(ang)
                const a1 = s1 * (e1 + r * c), a2 = s2 * (e2 + r * sn)
                const n1 = s1 * c, n2 = s2 * sn
                if (axis === 0) return push(t * half, a1, a2, 0, n1, n2)
                if (axis === 1) return push(a2, t * half, a1, n2, 0, n1)
                return push(a1, a2, t * half, n1, n2, 0)
            }
            for (let k = 0; k < seg; k++) {
                const a0 = (k / seg) * HALF, a1 = ((k + 1) / seg) * HALF
                const p0 = put(-1, a0), p1 = put(1, a0)
                const p2 = put(1, a1), p3 = put(-1, a1)
                // The sweep's handedness follows s1 * s2, and it is NEGATIVE
                // that leaves the quad already wound outward.
                if (s1 * s2 < 0) quad(p0, p1, p2, p3)
                else quad(p3, p2, p1, p0)
            }
        }
        for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
            edge(0, s1, s2); edge(1, s1, s2); edge(2, s1, s2)
        }

        /* Eight spherical corner octants. The theta = 0 row is the octant's
         * pole and collapses to a point, so the first triangle of each quad
         * there would be degenerate — skipped, exactly as sphereGeo does. */
        for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
            const base = pos.length / 3
            for (let i = 0; i <= seg; i++) {
                const th = (i / seg) * HALF          // polar, from +Y
                for (let j = 0; j <= seg; j++) {
                    const ph = (j / seg) * HALF      // azimuth, X toward Z
                    const nx = sx * Math.sin(th) * Math.cos(ph)
                    const ny = sy * Math.cos(th)
                    const nz = sz * Math.sin(th) * Math.sin(ph)
                    push(sx * ex + r * nx, sy * ey + r * ny, sz * ez + r * nz, nx, ny, nz)
                }
            }
            // d(phi) x d(theta) = sin(theta) * sx*sy*sz * n, so the natural
            // winding is already outward only when that product is positive.
            const flip = sx * sy * sz < 0
            for (let i = 0; i < seg; i++) {
                for (let j = 0; j < seg; j++) {
                    const a = base + i * (seg + 1) + j
                    const b = a + 1
                    const c = a + (seg + 1) + 1
                    const dd = a + (seg + 1)
                    if (flip) {
                        idx.push(dd, c, b)
                        if (i !== 0) idx.push(dd, b, a)
                    } else {
                        if (i !== 0) idx.push(a, b, c)
                        idx.push(a, c, dd)
                    }
                }
            }
        }
    }

    return pack(pos, nrm, idx)
}

/* ----------------------------------------------------------------- shaders */

const VERT = `
precision highp float;

attribute vec3 aPos;
attribute vec3 aNrm;

uniform mat4 uMVP;
uniform mat3 uNM;

varying vec3 vN;

void main() {
    vN = uNM * aNrm;
    gl_Position = uMVP * vec4(aPos, 1.0);
}
`

/**
 * A PROCEDURAL matcap. The reference shades every mesh with
 * MeshMatcapMaterial against one of three photographed sphere textures
 * (chrome, iridescent, glossy purple): the lit colour is a lookup by the
 * view-space normal, with no light in the scene at all.
 *
 * Sampling a bitmap here would pin the component to an external asset and
 * leave a designer with a dropdown of three fixed looks, so the same shading
 * model is evaluated analytically instead and the two colour dials drive the
 * material directly.
 *
 * KEY and FILL are MEASURED, not invented: the reference's chrome matcap was
 * decoded, unwrapped to view-space normals and least-squares fitted, and those
 * are the two highlight directions that came back. The fit's residual is the
 * honest part of this — RMSE 0.15 over the hemisphere — because a photographed
 * chrome ball carries several reflected bands that two lobes cannot express.
 *
 * So this is an approximation and a DELIBERATE deviation, in one respect: the
 * reference matcap is near-black (0.05) for a surface facing the camera, which
 * on flat geometry drops whole plates and discs out of the frame. The body
 * term here keeps those faces readable. Everything else — where the highlight
 * sits, where the second lobe sits, the hot grazing rim — follows the
 * measurement.
 *
 * The lobes are authored in DISPLAY space, not linear, so there is no encode
 * at the end — unlike a ported physically-lit three scene, which needs one.
 */
const FRAG = `
precision highp float;

varying vec3 vN;

uniform vec3 uBase;
uniform vec3 uAcc;

// Fitted highlight directions of the reference's chrome matcap.
const vec3 KEY  = vec3(-0.4364, 0.4601, 0.7733);
const vec3 FILL = vec3( 0.7831, 0.1309, 0.6080);

void main() {
    vec3 n = normalize(vN);
    // three's DoubleSide flips the normal on a back face, and the reference
    // draws the open tube and the extruded wedges that way. On a CLOSED solid
    // no back face ever wins the depth test, so this changes nothing there —
    // but every builder's winding has to be right for it (see 'geometry').
    if (!gl_FrontFacing) n = -n;
    float k = max(dot(n, KEY), 0.0);
    float f = max(dot(n, FILL), 0.0);
    // Facing ratio: 1 at the silhouette, 0 dead-on.
    float graze = 1.0 - clamp(abs(n.z), 0.0, 1.0);

    vec3 c = uBase * (0.08 + 0.62 * pow(k, 2.0));
    c += uAcc * 0.80 * pow(k, 9.0);
    c += uAcc * 0.35 * pow(f, 6.0);
    // The matcap's bright top edge: grazing, and weighted upwards.
    c += uAcc * 0.32 * pow(graze, 3.0) * (0.40 + 0.60 * max(n.y, 0.0));

    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`

/* ---------------------------------------------------------------- GL plumbing */

interface Mesh {
    pos: WebGLBuffer
    nrm: WebGLBuffer
    idx: WebGLBuffer
    count: number
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("shader: " + gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function buildProgram(gl: WebGLRenderingContext): WebGLProgram | null {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return null
    const p = gl.createProgram()
    if (!p) return null
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("link: " + gl.getProgramInfoLog(p))
        return null
    }
    return p
}

function upload(gl: WebGLRenderingContext, g: Geo): Mesh | null {
    const pos = gl.createBuffer(), nrm = gl.createBuffer(), idx = gl.createBuffer()
    if (!pos || !nrm || !idx) return null
    gl.bindBuffer(gl.ARRAY_BUFFER, pos)
    gl.bufferData(gl.ARRAY_BUFFER, g.pos, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, nrm)
    gl.bufferData(gl.ARRAY_BUFFER, g.nrm, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW)
    return { pos, nrm, idx, count: g.idx.length }
}

function freeMesh(gl: WebGLRenderingContext, m: Mesh) {
    gl.deleteBuffer(m.pos)
    gl.deleteBuffer(m.nrm)
    gl.deleteBuffer(m.idx)
}

function bindMesh(gl: WebGLRenderingContext, m: Mesh, aPos: number, aNrm: number) {
    gl.bindBuffer(gl.ARRAY_BUFFER, m.pos)
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, m.nrm)
    gl.vertexAttribPointer(aNrm, 3, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idx)
}
/* ------------------------------------------------------------------- easing */

/** GSAP `back` — which resolves to back.out — at its default overshoot of
 *  1.70158. Verified against gsap 3.12.5: back.out(0.1) = 0.408828,
 *  back.out(0.5) = 1.087697, so it does overshoot past 1 and settle back. */
function easeBackOut(t: number): number {
    const c = 1.70158
    const u = t - 1
    return u * u * ((c + 1) * u + c) + 1
}

/* -------------------------------------------------------------------- props */

interface StackGroup {
    /** How many plates. The reference ships 5. */
    count: number
    /** Corner radius as a percent of the maximum — half the plate's shortest
     *  side (rule 7b). The reference's 0.02 on a 0.1-thick plate is 40. */
    rounded: number
    /** Gap between one plate's start and the next, in ms at Speed 50. */
    stagger: number
}

const STACK_DEFAULTS: StackGroup = {
    count: 5,
    rounded: 40,
    stagger: 100,
}

interface PlateStackProps {
    background?: string
    baseColor?: string
    accentColor?: string
    /** 0..100; 50 is the rate the reference runs at. */
    speed?: number
    /** Camera pullback in world units. */
    distance?: number
    stack?: Partial<StackGroup>
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ---------------------------------------------------------------- component */

export default function PlateStack(props: PlateStackProps) {
    const {
        background = "#0C0C0C",
        baseColor = "#3D3B3B",
        accentColor = "#FFFFFF",
        speed = 71,
        distance = 20,
        // A group the designer never opened arrives undefined, and one row
        // of it can be missing on its own, so merge over a typed literal
        // rather than reaching for `??` at every read site (rule 11).
        stack,
        style,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    /* Every live input the loop reads. Written on render, never a dep of the
     * GL effect — a colour change must not rebuild the context (rule 6). */
    const live = useRef({
        base: [0, 0, 0] as RGB,
        acc: [0, 0, 0] as RGB,
        speed: 50,
        distance: 6,
        stack: STACK_DEFAULTS,
    })
    live.current = {
        base: parseColor(baseColor, [0.56, 0.6, 0.65]),
        acc: parseColor(accentColor, [1, 1, 1]),
        speed,
        distance,
        stack: { ...STACK_DEFAULTS, ...stack },
    }

    useEffect(() => {
        const canvas = canvasRef.current
        const host = hostRef.current
        if (!canvas || !host) return

        const gl = canvas.getContext("webgl", {
            antialias: true,
            alpha: true,
            premultipliedAlpha: true,
            depth: true,
        }) as WebGLRenderingContext | null
        if (!gl) return

        const prog = buildProgram(gl)
        if (!prog) return
        gl.useProgram(prog)

        const aPos = gl.getAttribLocation(prog, "aPos")
        const aNrm = gl.getAttribLocation(prog, "aNrm")
        gl.enableVertexAttribArray(aPos)
        gl.enableVertexAttribArray(aNrm)

        const uMVP = gl.getUniformLocation(prog, "uMVP")
        const uNM = gl.getUniformLocation(prog, "uNM")
        const uBase = gl.getUniformLocation(prog, "uBase")
        const uAcc = gl.getUniformLocation(prog, "uAcc")
        // A typo'd name resolves to null and the uniform silently never
        // uploads, so say so loudly instead of rendering a black frame.
        if (!uMVP || !uNM || !uBase || !uAcc) {
            console.error("PlateStack: uniform location missing")
            return
        }

        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)
        gl.clearColor(0, 0, 0, 0)

        /* One plate, drawn `count` times. Only Rounded changes its vertices. */
        let plate: Mesh | null = null
        let geoKey = ""
        const ensureGeo = (radius: number) => {
            const k = radius.toFixed(5)
            if (k === geoKey) return
            geoKey = k
            if (plate) freeMesh(gl, plate)
            plate = upload(gl, roundedBoxGeo(PLATE_W, PLATE_H, PLATE_D, radius, ROUND_SEG))
        }

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

        /* ---- loop ---- */
        const proj = m4(), view = m4(), pv = m4(), model = m4(), mvp = m4()
        const nrmMat = new Float32Array(9)
        let raf = 0
        let last = performance.now()
        let clock = 0

        const drawWith = (mesh: Mesh) => {
            m4Mul(pv, model, mvp)
            nm3(model, nrmMat)
            gl.uniformMatrix4fv(uMVP, false, mvp)
            gl.uniformMatrix3fv(uNM, false, nrmMat)
            bindMesh(gl, mesh, aPos, aNrm)
            gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0)
        }

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now

            const P = live.current
            const count = Math.max(1, Math.round(P.stack.count))
            ensureGeo(MAX_R * (P.stack.rounded / 100))
            if (!plate) return
            const stag = P.stack.stagger / 1000
            const cycle = DUR + stag * (count - 1)
            clock = (clock + dt * (P.speed / 50)) % cycle

            const w = canvas.width, h = canvas.height
            const aspect = w / h
            persp(proj, FOV, aspect, NEAR, FAR)
            // Fit against the SHORT edge: a portrait host would otherwise crop
            // the scene horizontally, since the field of view is vertical.
            const dist = P.distance / Math.min(1, aspect)
            m4Ident(view)
            trans(view, 0, 0, -dist)
            m4Mul(proj, view, pv)

            gl.uniform3fv(uBase, P.base)
            gl.uniform3fv(uAcc, P.acc)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

            // <Center> measures the stack once, at rest. The plates run from
            // (0 - 1) to (count - 2) steps, so the bbox centre is at
            // (count - 3) / 2 steps — 0.1 for the reference's five.
            const centerY = ((count - 3) / 2) * SPACING

            for (let i = 0; i < count; i++) {
                const u = Math.min(1, Math.max(0, (clock - i * stag) / DUR))
                m4Ident(model)
                // Euler XYZ on the Center group: R = Rx * Ry.
                rotX(model, TILT_X)
                rotY(model, TILT_Y)
                scaleU(model, SCALE)
                trans(model, 0, -centerY, 0)
                trans(model, 0, (i - 1) * SPACING, 0)
                rotY(model, SWEEP * easeBackOut(u))
                drawWith(plate)
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            if (plate) freeMesh(gl, plate)
            gl.deleteProgram(prog)
            // No loseContext(): getContext hands back the same context per
            // canvas, so StrictMode's mount/cleanup/mount would reuse a
            // force-lost one and render black (rule 6).
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the spread: the canvas is absolutely positioned,
                // so the root has no in-flow content and collapses to a dot
                // under Framer's Fit Content sizing.
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
