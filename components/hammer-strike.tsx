"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * HAMMER STRIKE — a machined hammer swinging down onto an anvil that squashes
 * under the blow and rings out.
 *
 * The MECHANISM is loaders/Hammer.tsx's (rule 8 — the reference defines the
 * interaction), reproduced term for term on a 2.4s cycle:
 *
 *   - a 24x3 handle turning about its RIGHT end, with an 8x12 head hung off
 *     its left, on the keyframe 52deg / 52 / 0 / 8 / 0 / 0 / 52 / 52 at
 *     0/14/30/36/42/58/80/100%, every segment on cubic-bezier(0.25,0.1,0.25,1)
 *     — so it falls, strikes at 30%, rebounds 8 degrees, settles, and is drawn
 *     back up;
 *   - a 13x6 anvil squashing to (1.07, 0.78) about its own BOTTOM at the 30%
 *     strike, back to square by 36%, then a much smaller second squash at 42%
 *     — the ring after the blow — and square again by 48%;
 *   - a 44x1 ground line, and a 5px boss on the pivot.
 *
 * The two tracks are the same clock: the anvil's squash begins on the frame
 * the hammer's angle reaches zero. That is the source's timing, and it is the
 * whole gag.
 *
 * Every length is the source's divided by 5. The handle's pivot is the
 * source's transform-origin, its right end, NOT its centre — swinging about
 * the centre would send the head through the anvil.
 *
 * SOLID, NOT SPRITES. Every part is a real bevelled body shaded by the same
 * analytic matcap the origami ports use. The squash is a genuine non-uniform
 * scale, which is why the normal matrix here is a real inverse transpose and
 * not the transpose shortcut: squash a box with the shortcut and its
 * highlight slides the wrong way as it compresses.
 *
 * Rule 6 recipe: ONE GL context built in useEffect([]); every live input read
 * from a ref inside a raw rAF loop; loseContext() is never called.
 */

/* --------------------------------------------------------------- constants */

const TAU = Math.PI * 2
const DPR_CAP = 2
/** Vertical field of view. Framing is the Distance dial's job, not this. */
const FOV = (45 * Math.PI) / 180
const NEAR = 0.1
const FAR = 200

/** The source's 56-unit design box, in world units. */
const UNIT = 1 / 5
const wx = (x: number) => (x - 28) * UNIT
const wy = (y: number) => (28 - y) * UNIT

/** The ground line: 44 x 1 at y = 43. */
const GROUND_W = 44 * UNIT
const GROUND_H = 1 * UNIT
const GROUND_Y = wy(43.5)
const GROUND_MIX = 0.16

/** The anvil: 13 x 6 at (10, 37), squashing about its own bottom edge. */
const ANVIL_W = 13 * UNIT
const ANVIL_H = 6 * UNIT
const ANVIL_X = wx(10 + 13 / 2)
const ANVIL_BOTTOM = wy(43)
const ANVIL_MIX = 0.3

/** The handle turns about its right end: the source's transform-origin. */
const PIVOT_X = wx(38)
const PIVOT_Y = wy(30.5)
/** Handle 24 x 3, its centre 12 to the LEFT of the pivot. */
const HANDLE_W = 24 * UNIT
const HANDLE_H = 3 * UNIT
const HANDLE_DX = wx(14 + 12) - PIVOT_X
/** Head 8 x 12, hung off the handle's left end. */
const HEAD_W = 8 * UNIT
const HEAD_H = 12 * UNIT
const HEAD_DX = wx(11 + 4) - PIVOT_X
const HEAD_DY = wy(24.5 + 6) - PIVOT_Y

/** The boss on the pivot: 5px, at 60% of the accent. */
const BOSS_R = 2.5 * UNIT
const BOSS_X = wx(38)
const BOSS_Y = wy(30)
const BOSS_MIX = 0.4

const DEPTH = 0.5
const BEVEL = 0.06
const CORNER_SEG = 5
const BALL_SEG = 24

/**
 * The default Distance is 12, not 10: at the top of a 52-degree stroke the
 * head reaches y = 4.32, and a distance of 10 only shows 4.14 either side of
 * the axis, so the head clipped off the top of the frame. Measured, not
 * guessed — the probe asserts the whole swing stays inside the viewport.
 */
/** The source's swing, in degrees at the top of the stroke. */
const SWING_DEG = 52
/** The source's 2.4s cycle at the rate the loader ships at (--mfl-sp = 1/1.5). */
const PERIOD = 2.4 / 1.5
/** 50 on the Speed dial is that rate. */
const SPEED_REF = 50

/** The source's hammer track, in degrees. */
const SWING: Array<[number, number]> = [
    [0, 1], [0.14, 1], [0.3, 0], [0.36, 8 / SWING_DEG], [0.42, 0],
    [0.58, 0], [0.8, 1], [1, 1],
]
/** The source's anvil track: x scale and y scale, as keyframe stops. */
const SQUASH_X: Array<[number, number]> = [
    [0, 1], [0.28, 1], [0.3, 1.07], [0.36, 1], [0.4, 1],
    [0.42, 1.0111388561903647], [0.48, 1], [1, 1],
]
const SQUASH_Y: Array<[number, number]> = [
    [0, 1], [0.28, 1], [0.3, 0.78], [0.36, 1], [0.4, 1],
    [0.42, 0.964992166258854], [0.48, 1], [1, 1],
]

/* ---------------------------------------------------------------- keyframe */

/**
 * cubic-bezier(0.25, 0.1, 0.25, 1) solved for y at a given x — the source's
 * easing on the hammer. Newton from t = x; the curve is monotonic in x.
 */
function ease(x: number): number {
    x = Math.min(1, Math.max(0, x))
    let t = x
    for (let i = 0; i < 6; i++) {
        const mt = 1 - t
        const bx = 3 * mt * mt * t * 0.25 + 3 * mt * t * t * 0.25 + t * t * t
        const d =
            3 * 0.25 * (1 - 4 * t + 3 * t * t) +
            3 * 0.25 * (2 * t - 3 * t * t) +
            3 * t * t
        t = Math.min(1, Math.max(0, t - (bx - x) / Math.max(d, 1e-4)))
    }
    const mt = 1 - t
    return 3 * mt * mt * t * 0.1 + 3 * mt * t * t + t * t * t
}

/** A piecewise keyframe track. `eased` is false for the anvil, which the
 *  source animates linearly. */
function track(p: number, stops: Array<[number, number]>, eased: boolean): number {
    p = p - Math.floor(p)
    for (let i = 0; i < stops.length - 1; i++) {
        const [p0, v0] = stops[i]
        const [p1, v1] = stops[i + 1]
        if (p < p1) {
            if (p1 === p0) return v1
            const u = (p - p0) / (p1 - p0)
            return v0 + (v1 - v0) * (eased ? ease(u) : u)
        }
    }
    return stops[stops.length - 1][1]
}

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

const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
]

/* -------------------------------------------------------------------- mat4 */

type M4 = Float32Array

/** Column-major, GL order. */
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
 * reads outermost parent first, like walking a scene graph downwards. */

function rotX(m: M4, a: number) {
    if (a === 0) return
    const c = Math.cos(a), s = Math.sin(a)
    m4Ident(SCR_A)
    SCR_A[5] = c; SCR_A[6] = s; SCR_A[9] = -s; SCR_A[10] = c
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

/** m := m * S(x, y, z). This is why nm3 does the real inverse. */
function scaleXYZ(m: M4, x: number, y: number, z: number) {
    m[0] *= x; m[1] *= x; m[2] *= x
    m[4] *= y; m[5] *= y; m[6] *= y
    m[8] *= z; m[9] *= z; m[10] *= z
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
 * Normal matrix: the INVERSE TRANSPOSE of the model's upper-left 3x3. The
 * transpose alone would do for a rotation or a uniform scale — but this scene
 * squashes boxes on ONE axis, and a non-uniform scale needs the real inverse
 * or its normals tilt the wrong way and the highlight slides as it squashes.
 */
function nm3(m: M4, out: Float32Array) {
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

/**
 * A BEVELLED extrusion of a closed 2D outline, wound CCW, into a solid of
 * depth 2h.
 *
 * The bevel is not decoration. A matcap shades by the view-space normal alone,
 * so a flat face square to the camera has one normal and therefore one flat
 * value all over — a plain extruded bar reads as grey cardboard next to
 * anything curved. The bevel is a narrow band whose normal sweeps 45 degrees
 * around the whole outline, and it is what puts a lit edge on the part. It is
 * also what a machined part actually has.
 */
function bevelExtrude(outline: Array<[number, number]>, h: number, bevel: number): Geo {
    const pos: number[] = [], nrm: number[] = [], idx: number[] = []
    const n = outline.length

    // Inward normal at each vertex: the average of its two adjacent edges'
    // left normals, which for a CCW outline point into the solid.
    const inward: Array<[number, number]> = []
    for (let i = 0; i < n; i++) {
        const p0 = outline[(i - 1 + n) % n], p1 = outline[i], p2 = outline[(i + 1) % n]
        const e0 = [p1[0] - p0[0], p1[1] - p0[1]]
        const e1 = [p2[0] - p1[0], p2[1] - p1[1]]
        const l0 = Math.hypot(e0[0], e0[1]) || 1
        const l1 = Math.hypot(e1[0], e1[1]) || 1
        const nx = -e0[1] / l0 + -e1[1] / l1
        const ny = e0[0] / l0 + e1[0] / l1
        const ln = Math.hypot(nx, ny) || 1
        inward.push([nx / ln, ny / ln])
    }
    const inset = outline.map(
        (p, i) => [p[0] + inward[i][0] * bevel, p[1] + inward[i][1] * bevel] as [number, number]
    )

    let cx = 0, cy = 0
    for (const p of inset) { cx += p[0]; cy += p[1] }
    cx /= n; cy /= n

    const push = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
        pos.push(x, y, z); nrm.push(nx, ny, nz)
        return pos.length / 3 - 1
    }

    // The two flat faces, each a fan over the inset outline.
    for (const z of [h, -h]) {
        const nz = z > 0 ? 1 : -1
        const c = push(cx, cy, z, 0, 0, nz)
        const ring: number[] = []
        for (const p of inset) ring.push(push(p[0], p[1], z, 0, 0, nz))
        for (let i = 0; i < n; i++) {
            const a = ring[i], b = ring[(i + 1) % n]
            if (nz > 0) idx.push(c, a, b)
            else idx.push(c, b, a)
        }
    }

    // Three bands round the outline: bevel, side, bevel. Each vertex is
    // duplicated per band so the 45-degree bevel keeps its own normal instead
    // of averaging into the face or the side.
    const band = (
        z0: number, z1: number, r0: "inset" | "out", r1: "inset" | "out", nzz: number
    ) => {
        const start = pos.length / 3
        for (let i = 0; i < n; i++) {
            const pa = (r0 === "inset" ? inset : outline)[i]
            const pb = (r1 === "inset" ? inset : outline)[i]
            const nx = -inward[i][0], ny = -inward[i][1]
            const l = Math.hypot(nx, ny, nzz) || 1
            push(pa[0], pa[1], z0, nx / l, ny / l, nzz / l)
            push(pb[0], pb[1], z1, nx / l, ny / l, nzz / l)
        }
        for (let i = 0; i < n; i++) {
            const a = start + i * 2, b = a + 1
            const c2 = start + ((i + 1) % n) * 2, d = c2 + 1
            idx.push(a, b, c2, b, d, c2)
        }
    }
    band(h, h - bevel, "inset", "out", 1)
    band(h - bevel, -(h - bevel), "out", "out", 0)
    band(-(h - bevel), -h, "out", "inset", -1)

    return pack(pos, nrm, idx)
}

/** A rounded rectangle centred on the origin, wound CCW. */
function roundRect(w: number, h: number, r: number, seg: number): Array<[number, number]> {
    const hw = w / 2, hh = h / 2
    const rr = Math.max(0, Math.min(r, hw, hh))
    const out: Array<[number, number]> = []
    // Corner centres, in CCW order starting bottom-right.
    const corners: Array<[number, number, number]> = [
        [hw - rr, -(hh - rr), -Math.PI / 2],
        [hw - rr, hh - rr, 0],
        [-(hw - rr), hh - rr, Math.PI / 2],
        [-(hw - rr), -(hh - rr), Math.PI],
    ]
    for (const [ccx, ccy, a0] of corners) {
        for (let i = 0; i <= seg; i++) {
            const a = a0 + (i / seg) * (Math.PI / 2)
            out.push([ccx + rr * Math.cos(a), ccy + rr * Math.sin(a)])
        }
    }
    return out
}

/** three.js SphereGeometry(radius, widthSeg, heightSeg), term for term. */
function sphereGeo(radius: number, wSeg: number, hSeg: number): Geo {
    const pos: number[] = [], nrm: number[] = [], idx: number[] = []
    const grid: number[][] = []
    let n = 0
    for (let iy = 0; iy <= hSeg; iy++) {
        const row: number[] = []
        const v = iy / hSeg
        for (let ix = 0; ix <= wSeg; ix++) {
            const u = ix / wSeg
            const x = -radius * Math.cos(u * TAU) * Math.sin(v * Math.PI)
            const y = radius * Math.cos(v * Math.PI)
            const z = radius * Math.sin(u * TAU) * Math.sin(v * Math.PI)
            pos.push(x, y, z)
            nrm.push(x / radius, y / radius, z / radius)
            row.push(n++)
        }
        grid.push(row)
    }
    for (let iy = 0; iy < hSeg; iy++) {
        for (let ix = 0; ix < wSeg; ix++) {
            const a = grid[iy][ix + 1], b = grid[iy][ix]
            const c = grid[iy + 1][ix], d = grid[iy + 1][ix + 1]
            if (iy !== 0) idx.push(a, b, d)
            if (iy !== hSeg - 1) idx.push(b, c, d)
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
 * The same procedural matcap the origami ports in this folder use, so a scene
 * built from these parts sits beside them: the lit colour is a function of the
 * view-space normal alone, with no light in the scene.
 *
 * KEY and FILL are the directions fitted to a photographed chrome matcap
 * (RMSE 0.15 over the hemisphere — two lobes cannot express every reflected
 * band a real chrome ball carries). The lobes are authored in DISPLAY space,
 * so there is no encode at the end.
 */
const FRAG = `
precision highp float;

varying vec3 vN;

uniform vec3 uBase;
uniform vec3 uAcc;

const vec3 KEY  = vec3(-0.4364, 0.4601, 0.7733);
const vec3 FILL = vec3( 0.7831, 0.1309, 0.6080);

void main() {
    vec3 n = normalize(vN);
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

/* ------------------------------------------------------------ GL plumbing */

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

/* -------------------------------------------------------------------- props */

interface HammerGroup {
    /** How far back the hammer is drawn, in degrees. The source is 52. */
    swing: number
    /** The whole piece, as a percent of the source's size. */
    size: number
    /** Camera pitch, degrees. 0 is the loader's flat front view. */
    tilt: number
}

const HAMMER_DEFAULTS: HammerGroup = { swing: 46, size: 109, tilt: 0 }

interface Props {
    background: string
    baseColor: string
    accentColor: string
    speed: number
    distance: number
    hammer: HammerGroup
    style?: React.CSSProperties
}

/* ---------------------------------------------------------------- component */

export default function HammerStrike(props: Partial<Props>) {
    const {
        background = "#0C0C0C",
        baseColor = "#7E7E7E",
        accentColor = "#FFFFFF",
        speed = 50,
        distance = 25,
        style,
    } = props

    // A group the designer never opened arrives undefined; spread-merge over
    // the typed defaults rather than a ?? chain, which is where one missed key
    // silently pins a control forever (rule 11).
    const hammer: HammerGroup = { ...HAMMER_DEFAULTS, ...(props.hammer || {}) }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const live = useRef({
        bg: [0, 0, 0] as RGB,
        base: [0, 0, 0] as RGB,
        acc: [0, 0, 0] as RGB,
        speed,
        distance,
        hammer,
    })
    live.current = {
        bg: parseColor(background, [0.05, 0.05, 0.05]),
        base: parseColor(baseColor, [0.56, 0.6, 0.65]),
        acc: parseColor(accentColor, [1, 1, 1]),
        speed,
        distance,
        hammer,
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: false,
            antialias: true,
            depth: true,
            stencil: false,
        }) as WebGLRenderingContext | null
        if (!gl) return

        const prog = buildProgram(gl)
        if (!prog) return
        gl.useProgram(prog)

        const aPos = gl.getAttribLocation(prog, "aPos")
        const aNrm = gl.getAttribLocation(prog, "aNrm")
        const uMVP = gl.getUniformLocation(prog, "uMVP")
        const uNM = gl.getUniformLocation(prog, "uNM")
        const uBase = gl.getUniformLocation(prog, "uBase")
        const uAcc = gl.getUniformLocation(prog, "uAcc")
        // A typo'd name resolves to null and the uniform silently never
        // reaches the shader (rule 8's verification list).
        if (!uMVP || !uNM || !uBase || !uAcc) {
            console.error("HammerStrike: uniform location missing")
            return
        }
        gl.enableVertexAttribArray(aPos)
        gl.enableVertexAttribArray(aNrm)
        gl.enable(gl.DEPTH_TEST)

        const ground = upload(gl, bevelExtrude(roundRect(GROUND_W, GROUND_H, GROUND_H / 2, 3), DEPTH * 0.6, BEVEL * 0.5))
        const anvil = upload(gl, bevelExtrude(roundRect(ANVIL_W, ANVIL_H, 1 * UNIT, CORNER_SEG), DEPTH, BEVEL))
        const handle = upload(gl, bevelExtrude(roundRect(HANDLE_W, HANDLE_H, 1.5 * UNIT, CORNER_SEG), DEPTH * 0.7, BEVEL))
        const head = upload(gl, bevelExtrude(roundRect(HEAD_W, HEAD_H, 2 * UNIT, CORNER_SEG), DEPTH, BEVEL))
        const boss = upload(gl, sphereGeo(BOSS_R, BALL_SEG, BALL_SEG))
        if (!ground || !anvil || !handle || !head || !boss) return

        /* ---- sizing ---- */
        let dpr = 1
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const cssW = canvas.clientWidth || host.clientWidth || 0
            const cssH = canvas.clientHeight || host.clientHeight || 0
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
        let phase = 0

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
            // Clamped: a backgrounded tab returns with a multi-second dt.
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now

            const P = live.current
            const size = P.hammer.size / 100
            // 50 is the rate the source shipped at; 0 stops it.
            phase = (phase + (dt * (P.speed / SPEED_REF)) / PERIOD) % 1

            const w = canvas.width, h = canvas.height
            const aspect = w / h
            persp(proj, FOV, aspect, NEAR, FAR)
            // Fit against the SHORT edge: a portrait host would otherwise crop
            // the scene horizontally, since the field of view is vertical.
            const dist = P.distance / Math.min(1, aspect)
            m4Ident(view)
            trans(view, 0, 0, -dist)
            rotX(view, (P.hammer.tilt * Math.PI) / 180)
            m4Mul(proj, view, pv)

            gl.clearColor(P.bg[0], P.bg[1], P.bg[2], 1)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.uniform3fv(uAcc, P.acc)

            // The track is stored as a FRACTION of the swing, so the Swing dial
            // scales the whole stroke without moving any keyframe stop. World
            // y runs UP where the source's runs down, so the angle is negated:
            // a positive CSS rotation is clockwise on screen.
            const deg = track(phase, SWING, true) * P.hammer.swing
            const ang = -(deg * Math.PI) / 180
            const sx = track(phase, SQUASH_X, false)
            const sy = track(phase, SQUASH_Y, false)

            const scene = () => {
                m4Ident(model)
                scaleU(model, size)
            }

            gl.uniform3fv(uBase, mixRGB(P.base, P.bg, GROUND_MIX))
            scene()
            trans(model, 0, GROUND_Y, 0)
            drawWith(ground)

            // The anvil squashes about its own BOTTOM edge, so it spreads
            // downwards into the ground instead of sinking through it.
            gl.uniform3fv(uBase, mixRGB(P.base, P.bg, ANVIL_MIX))
            scene()
            trans(model, ANVIL_X, ANVIL_BOTTOM + (ANVIL_H * sy) / 2, 0)
            scaleXYZ(model, sx, sy, 1)
            drawWith(anvil)

            // Handle and head share one frame hung on the pivot, which is why
            // the head swings on the handle's length rather than about itself.
            gl.uniform3fv(uBase, P.base)
            const onPivot = () => {
                scene()
                trans(model, PIVOT_X, PIVOT_Y, 0)
                rotZ(model, ang)
            }
            onPivot()
            trans(model, HANDLE_DX, 0, 0)
            drawWith(handle)
            onPivot()
            trans(model, HEAD_DX, HEAD_DY, 0)
            drawWith(head)

            gl.uniform3fv(uBase, mixRGB(P.base, P.bg, BOSS_MIX))
            scene()
            trans(model, BOSS_X, BOSS_Y, 0)
            drawWith(boss)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            freeMesh(gl, ground)
            freeMesh(gl, anvil)
            freeMesh(gl, handle)
            freeMesh(gl, head)
            freeMesh(gl, boss)
            gl.deleteProgram(prog)
            // No loseContext(): getContext hands back the same context per
            // canvas, so StrictMode's mount/cleanup/mount would reuse a
            // force-lost one and render black (rule 6).
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
