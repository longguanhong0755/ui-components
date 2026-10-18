"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * PIPE RUNNER — a ball running a full circle through a fat half-pipe that
 * spins the other way and overshoots.
 *
 * Port of `Item6` ("Travel") from d3adrabbit/origami (Codrops, "Origami: Free
 * 3D Motion Graphics"). The reference defines the interaction, the motion and
 * the framing (rule 8), and this reproduces them term for term:
 *
 *   - a TubeGeometry swept along a semicircle of radius 2 with tube radius
 *     0.8, 20 segments along and 8 around, drawn DoubleSide because it is open
 *     at both ends;
 *   - a sphere of radius 0.7 riding a semicircle of radius 2.02 — just inside
 *     the tube;
 *   - the ball's tween runs `t: 0 -> 2` over 1.5s, linear, and the curve
 *     multiplies t by PI, so the ball travels a WHOLE circle, not the
 *     semicircle the curve is named after. That is the reference's behaviour,
 *     not a typo to be fixed;
 *   - the tube turns from its resting PI to -PI over the same 1.5s with
 *     `back.out`, so it overshoots the full turn and settles back;
 *   - `<group scale={0.8}>` and NO `<Center>`, so the composition is
 *     deliberately off-centre;
 *   - no pointer interaction of any kind — the reference has none.
 *
 * WHAT THE PORT CHANGES (machinery only):
 *
 *   - three.js + @react-three/fiber + drei + GSAP become raw WebGL and a raw
 *     rAF loop (rules 6 and 10). Nothing is imported that is not in this file.
 *   - TubeGeometry along a circular arc IS a torus segment, so `torusGeo` with
 *     an `arc` argument builds it. three's computeFrenetFrames would pick a
 *     different starting normal for the same planar curve, which only moves
 *     where the seam falls; the surface is identical.
 *   - the 8-segment cross-section is kept, not smoothed: it is the reference's
 *     silhouette at this size, and the normals are per-column so it still
 *     shades round.
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

/** The reference's two radii: the tube's centreline and the ball's path. */
const PATH_R = 2
const BALL_PATH_R = 2.02
const TUBE_R = 0.8
const BALL_R = 0.7
/** three's TubeGeometry(path, 20, 0.8, 8, false): 20 along, 8 around. */
const TUBE_ALONG = 20
const TUBE_AROUND = 8
const BALL_SEG_W = 32
const BALL_SEG_H = 16
const GROUP_SCALE = 0.8
/** One lap of the ball, and one overshooting turn of the tube. */
const LAP = 1.5

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
 * three.js TorusGeometry(radius, tube, tubeSeg, ringSeg, arc), term for term.
 * With `arc` short of a full turn the ring is an open sweep, which is also
 * what a TubeGeometry along a circular arc produces — the frame three's
 * computeFrenetFrames picks for a planar curve differs only in where the seam
 * falls, and the surface is the same torus segment.
 */
function torusGeo(radius: number, tube: number, tubeSeg: number, ringSeg: number, arc: number = TAU): Geo {
    const pos: number[] = [], nrm: number[] = [], idx: number[] = []
    for (let j = 0; j <= tubeSeg; j++) {
        const v = (j / tubeSeg) * TAU
        const cv = Math.cos(v), sv = Math.sin(v)
        for (let i = 0; i <= ringSeg; i++) {
            const u = (i / ringSeg) * arc
            const cu = Math.cos(u), su = Math.sin(u)
            pos.push((radius + tube * cv) * cu, (radius + tube * cv) * su, tube * sv)
            // (vertex - ring centre) / tube, already unit length.
            nrm.push(cv * cu, cv * su, sv)
        }
    }
    for (let j = 1; j <= tubeSeg; j++) {
        for (let i = 1; i <= ringSeg; i++) {
            const a = (ringSeg + 1) * j + i - 1
            const b = (ringSeg + 1) * (j - 1) + i - 1
            const c = (ringSeg + 1) * (j - 1) + i
            const d = (ringSeg + 1) * j + i
            idx.push(a, b, d, b, c, d)
        }
    }
    return pack(pos, nrm, idx)
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
            // The pole rows collapse to a point, so one of each pair would be
            // degenerate — three skips exactly these two.
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

interface TravelGroup {
    /** Ball radius as a percent of the reference's 0.7. */
    ballSize: number
    /** Tube radius as a percent of the reference's 0.8. */
    tubeSize: number
    /** How far round the pipe goes. The reference is a semicircle. */
    arc: number
}

const TRAVEL_DEFAULTS: TravelGroup = {
    ballSize: 100,
    tubeSize: 100,
    arc: 180,
}

interface Props {
    background?: string
    baseColor?: string
    accentColor?: string
    /** 0..100; 50 is the rate the reference runs at. */
    speed?: number
    /** Camera pullback in world units. */
    distance?: number
    travel?: Partial<TravelGroup>
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ---------------------------------------------------------------- component */

export default function PipeRunner(props: Props) {
    const {
        background = "#0C0C0C",
        baseColor = "#5F5F5F",
        accentColor = "#FFFFFF",
        speed = 29,
        distance = 20,
        travel,
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
        travel: TRAVEL_DEFAULTS,
    })
    live.current = {
        base: parseColor(baseColor, [0.56, 0.6, 0.65]),
        acc: parseColor(accentColor, [1, 1, 1]),
        speed,
        distance,
        travel: { ...TRAVEL_DEFAULTS, ...travel },
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
            console.error("PipeRunner: uniform location missing")
            return
        }

        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)
        gl.clearColor(0, 0, 0, 0)

        /* The ball never changes shape — Ball Size is a uniform scale on the
         * model matrix. The pipe does: Tube Size and Arc change the sweep
         * itself, so those two rebuild the BUFFERS, never the context (rule 8). */
        const ball = upload(gl, sphereGeo(BALL_R, BALL_SEG_W, BALL_SEG_H))
        if (!ball) return
        let tube: Mesh | null = null
        let geoKey = ""
        const ensureTube = (tubeR: number, arc: number) => {
            const k = tubeR.toFixed(4) + "|" + arc.toFixed(4)
            if (k === geoKey) return
            geoKey = k
            if (tube) freeMesh(gl, tube)
            tube = upload(gl, torusGeo(PATH_R, tubeR, TUBE_AROUND, TUBE_ALONG, arc))
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
            ensureTube(TUBE_R * (P.travel.tubeSize / 100), (P.travel.arc * Math.PI) / 180)
            if (!tube) return

            clock = (clock + dt * (P.speed / 50)) % LAP
            const u = clock / LAP

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

            // A WHOLE circle: the reference tweens t from 0 to 2 through a
            // getPoint() that multiplies by PI.
            const a = u * TAU
            m4Ident(model)
            scaleU(model, GROUP_SCALE)
            trans(model, Math.cos(a) * BALL_PATH_R, Math.sin(a) * BALL_PATH_R, 0)
            scaleU(model, P.travel.ballSize / 100)
            drawWith(ball)

            // PI to -PI, so a whole turn backwards, overshooting on back.out.
            m4Ident(model)
            scaleU(model, GROUP_SCALE)
            rotZ(model, Math.PI - TAU * easeBackOut(u))
            drawWith(tube)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            freeMesh(gl, ball)
            if (tube) freeMesh(gl, tube)
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
