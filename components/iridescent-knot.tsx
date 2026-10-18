"use client"

import type { CSSProperties } from "react"
import { useEffect, useRef } from "react"

// Framer's editing canvas does not exist outside Framer: this build always
// renders in a real browser. Same values the live preview runs under.
const RenderTarget = {
    current: () => "preview",
    hasRestrictions: () => false,
    canvas: "canvas",
    export: "export",
    preview: "preview",
    thumbnail: "thumbnail",
}

/**
 * Single Closed Curve — an iridescent 3D tube knot that turns about the vertical
 * axis while the camera dollies in and pulls back out to the wide shot it started on.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    cycleMs: 9750,
    turns: 2,
    startAngle: 180,
    aroundWaves: 4,
    upWaves: 6,
    knotHeight: 50,
    pinch: 0,
    depthWobble: 0,
    segments: 1500,
    sides: 20,
    perspective: 300,
    bands: 80,
    bandDrift: 39,
    rimAmount: 55,
    specular: 70,
    shininess: 200,
    lightAngle: 135,
    lightHeight: 45,
    backDim: 30,
    saturation: 100,
    exposure: 100,
    dofBlur: 2,
    focusDepth: 100,
    rimColor: "#3A8CFF",
    pinkColor: "#E05AB4",
    orangeColor: "#FF4A1E",
    yellowColor: "#F2C83A",
    greenColor: "#2FAA3A",
    shadowColor: "#342A36",
    grain: 0,
    vignette: 0,
    hover: 0,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"cycleMs":"advanced","hover":"advanced"}}
const GROUP_FALLBACKS: Record<string, any> = { advanced: ADVANCED_DEFAULTS }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

// One continuous camera path, in seconds of the 5 s cycle. The first and last keys are the
// same pose, and the spline wraps its slopes across them, so the loop has no seam.
// [time, scale (frame heights per unit), camera distance, tube radius, aimX, aimY, depth of field]
const REF_CYCLE = 5.0
const SHOT: number[][] = [
    [0.0, 0.29, 8.0, 0.009, 0, 0, 0],
    [0.63, 0.3, 6.5, 0.012, 0.02, 0, 0],
    [1.25, 0.52, 3.6, 0.03, 0.22, 0.05, 0],
    [1.88, 0.72, 2.7, 0.04, 0.2, 0.05, 0],
    [2.5, 0.86, 2.25, 0.045, 0.05, 0, 0],
    [2.93, 0.82, 2.25, 0.048, -0.02, 0, 0],
    [3.36, 0.58, 2.55, 0.05, -0.1, 0, 0],
    [3.97, 0.33, 3.6, 0.034, -0.08, 0, 0],
    // settle back into the opening wide shot so 5.0 s is the same frame as 0 s
    [4.5, 0.3, 5.6, 0.016, -0.03, 0, 0],
    [5.0, 0.29, 8.0, 0.009, 0, 0, 0],
]

function slope(keys: number[][], i: number, c: number) {
    const n = keys.length
    // the first and last keys are the same pose: take their slope across the wrap
    const wrap = i <= 0 || i >= n - 1
    const l0 = wrap ? keys[n - 2] : keys[i - 1]
    const l1 = wrap ? keys[n - 1] : keys[i]
    const r0 = wrap ? keys[0] : keys[i]
    const r1 = wrap ? keys[1] : keys[i + 1]
    const dl = (l1[c] - l0[c]) / Math.max(1e-6, l1[0] - l0[0])
    const dr = (r1[c] - r0[c]) / Math.max(1e-6, r1[0] - r0[0])
    if (dl * dr <= 0) return 0
    const avg = (dl + dr) / 2
    const lim = 3 * Math.min(Math.abs(dl), Math.abs(dr))
    return Math.sign(avg) * Math.min(Math.abs(avg), lim)
}

function sampleKeys(keys: number[][], t: number, c: number) {
    const n = keys.length
    if (t <= keys[0][0]) return keys[0][c]
    if (t >= keys[n - 1][0]) return keys[n - 1][c]
    let i = 0
    while (i < n - 2 && t > keys[i + 1][0]) i++
    const t0 = keys[i][0]
    const t1 = keys[i + 1][0]
    const h = Math.max(1e-6, t1 - t0)
    const u = (t - t0) / h
    const p0 = keys[i][c]
    const p1 = keys[i + 1][c]
    const m0 = slope(keys, i, c) * h
    const m1 = slope(keys, i + 1, c) * h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1
}

function sampleShot(t: number) {
    const keys = SHOT
    return {
        k: sampleKeys(keys, t, 1),
        D: sampleKeys(keys, t, 2),
        r: sampleKeys(keys, t, 3),
        ax: sampleKeys(keys, t, 4),
        ay: sampleKeys(keys, t, 5),
        dof: Math.max(0, Math.min(1, sampleKeys(keys, t, 6))),
    }
}

const colorCache = new Map<string, number[]>()
function parseColor(input: string): number[] {
    let c = typeof input === "string" ? input.trim() : "#000000"
    if (colorCache.has(c)) return colorCache.get(c)!
    let src = c
    if (src.startsWith("var(")) {
        const comma = src.indexOf(",")
        src = comma >= 0 ? src.slice(comma + 1, src.lastIndexOf(")")).trim() : "#000000"
    }
    let out = [0, 0, 0, 1]
    try {
        const cv = document.createElement("canvas")
        cv.width = cv.height = 1
        const ctx = cv.getContext("2d")!
        ctx.clearRect(0, 0, 1, 1)
        ctx.fillStyle = "#000000"
        ctx.fillStyle = src
        ctx.fillRect(0, 0, 1, 1)
        const d = ctx.getImageData(0, 0, 1, 1).data
        out = [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255]
    } catch (e) {}
    colorCache.set(c, out)
    return out
}

const MESH_VS = `#version 300 es
precision highp float;
in vec3 aP;
in vec3 aO;
in float aU;
uniform float uR;
uniform float uAlpha;
uniform float uK;
uniform float uD;
uniform float uAspect;
uniform vec2 uAim;
uniform float uNear;
uniform float uFar;
out vec3 vN;
out vec3 vV;
out float vU;
out float vZ;
out float vW;
void main() {
    vec3 p = aP + uR * aO;
    float c = cos(uAlpha);
    float s = sin(uAlpha);
    vec3 q = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
    vec3 n = vec3(aO.x * c - aO.z * s, aO.y, aO.x * s + aO.z * c);
    vec3 rel = vec3(q.x - uAim.x, q.y - uAim.y, q.z - uD);
    float w = -rel.z;
    vN = n;
    vV = -rel;
    vU = aU;
    vZ = q.z;
    vW = w;
    float zn = 2.0 * (w - uNear) / max(uFar - uNear, 1e-3) - 1.0;
    gl_Position = vec4(2.0 * uK * uAspect * uD * rel.x, 2.0 * uK * uD * rel.y, zn * w, w);
}`

const MESH_FS = `#version 300 es
precision highp float;
in vec3 vN;
in vec3 vV;
in float vU;
in float vZ;
in float vW;
uniform vec3 uPal[5];
uniform vec3 uShadow;
uniform vec3 uLight;
uniform float uBands;
uniform float uDrift;
uniform float uRimAmt;
uniform float uSpec;
uniform float uShine;
uniform float uBackDim;
uniform float uHue;
uniform float uSat;
uniform float uExposure;
uniform float uFocusW;
uniform float uCocRange;
uniform float uDof;
uniform float uNear;
uniform float uFar;
layout(location = 0) out vec4 oCol;
layout(location = 1) out vec4 oInfo;

vec3 pal(float x) {
    float y = fract(x) * 5.0;
    int i = int(floor(y));
    if (i > 4) i = 4;
    int j = i + 1;
    if (j > 4) j = 0;
    float f = smoothstep(0.0, 1.0, fract(y));
    return mix(uPal[i], uPal[j], f);
}

vec3 hueRot(vec3 c, float a) {
    const vec3 k = vec3(0.57735);
    float ca = cos(a);
    return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
}

void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(vV);
    float ndv = dot(N, V);
    if (ndv < 0.0) { N = -N; ndv = -ndv; }
    float fr = 1.0 - clamp(ndv, 0.0, 1.0);
    vec3 L = normalize(uLight);
    float ndl = dot(N, L);
    float ph = vU * uBands + 0.45 * ndl + 0.35 * fr + uDrift;
    vec3 col = pal(ph);
    col = mix(col, uPal[0] * 1.1, smoothstep(0.55, 0.95, fr) * uRimAmt);
    float lit = smoothstep(-0.55, 0.35, ndl);
    col = mix(uShadow * 0.6, col, lit);
    col *= 0.6 + 0.55 * max(ndl, 0.0);
    vec3 H = normalize(L + V);
    float sp = pow(max(dot(N, H), 0.0), max(uShine, 1.0)) * uSpec;
    col += mix(vec3(1.0), pal(ph + 0.5), 0.4) * sp;
    float nearness = clamp((vZ + 1.0) * 0.5, 0.0, 1.0);
    col *= mix(1.0 - uBackDim, 1.0, nearness);
    col = hueRot(col, uHue);
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(l), col, uSat) * uExposure;
    oCol = vec4(clamp(col, 0.0, 1.0), 1.0);
    float coc = clamp(abs(vW - uFocusW) / max(uCocRange, 1e-3), 0.0, 1.0) * uDof;
    oInfo = vec4(coc, clamp((vW - uNear) / max(uFar - uNear, 1e-3), 0.0, 1.0), 0.0, 1.0);
}`

const QUAD_VS = `#version 300 es
out vec2 vUv;
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vUv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const POST_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uCol;
uniform sampler2D uInfo;
uniform vec2 uTexel;
uniform float uMaxR;
out vec4 o;
void main() {
    vec4 c0 = texture(uCol, vUv);
    vec2 i0 = texture(uInfo, vUv).rg;
    vec4 acc = c0;
    float ws = 1.0;
    for (int i = 0; i < 40; i++) {
        float fi = float(i) + 0.5;
        float rr = sqrt(fi / 40.0) * uMaxR;
        float a = fi * 2.39996323;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * rr * uTexel;
        vec4 ci = texture(uCol, uv);
        vec2 ii = texture(uInfo, uv).rg;
        float coc = ii.r;
        if (ii.g > i0.g + 0.002) coc = min(coc, i0.r);
        float w = clamp(coc * uMaxR - rr + 1.0, 0.0, 1.0);
        acc += ci * w;
        ws += w;
    }
    o = acc / ws;
}`

const OVERLAY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform float uGrain;
uniform float uVig;
uniform float uSeed;
uniform vec2 uRes;
out vec4 o;
float hash(vec2 p) {
    p = fract(p * vec2(443.897, 441.423));
    p += dot(p, p.yx + 19.19);
    return fract((p.x + p.y) * p.x);
}
void main() {
    vec2 px = floor(vUv * uRes);
    float h = hash(px + uSeed);
    float ag = uGrain * 0.22;
    vec2 d = (vUv - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0);
    float av = uVig * smoothstep(0.25, 0.95, length(d));
    float a = ag + av * (1.0 - ag);
    o = vec4(vec3(h * ag), a);
}`

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
    const mk = (type: number, src: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(s)
            gl.deleteShader(s)
            throw new Error("Shader compile failed: " + log)
        }
        return s
    }
    const v = mk(gl.VERTEX_SHADER, vs)
    const f = mk(gl.FRAGMENT_SHADER, fs)
    const p = gl.createProgram()!
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.linkProgram(p)
    gl.deleteShader(v)
    gl.deleteShader(f)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        throw new Error("Program link failed: " + gl.getProgramInfoLog(p))
    }
    return p
}

function U(gl: WebGL2RenderingContext, p: WebGLProgram, name: string) {
    const l = gl.getUniformLocation(p, name)
    if (l === null) throw new Error("Missing uniform " + name)
    return l
}

function buildKnot(adv: typeof ADVANCED_DEFAULTS) {
    const n = Math.max(1, Math.round(adv.aroundWaves))
    const m = Math.max(1, Math.round(adv.upWaves))
    const ys = adv.knotHeight / 100
    const p = adv.pinch / 100
    const q = adv.depthWobble / 100
    const seg = Math.max(60, Math.min(1500, Math.round(adv.segments)))
    const sides = Math.max(6, Math.min(32, Math.round(adv.sides)))
    const pt = (t: number) => {
        const th = n * t
        const rho = 1 + q * Math.cos(m * t) * Math.sin(th)
        return [rho * Math.cos(th), ys * Math.sin(m * t) * (1 - p - p * Math.cos(th)), rho * Math.sin(th)]
    }
    const rings = seg + 1
    const pos = new Float32Array(rings * sides * 3)
    const off = new Float32Array(rings * sides * 3)
    const uu = new Float32Array(rings * sides)
    const e = 1e-4
    for (let i = 0; i < rings; i++) {
        const t = ((i % seg) / seg) * Math.PI * 2
        const c = pt(t)
        const a = pt(t + e)
        const b = pt(t - e)
        let tx = a[0] - b[0]
        let ty = a[1] - b[1]
        let tz = a[2] - b[2]
        const tl = Math.hypot(tx, ty, tz) || 1
        tx /= tl
        ty /= tl
        tz /= tl
        // B = T × up, N = B × T
        let bx = -tz
        let by = 0
        let bz = tx
        const bl = Math.hypot(bx, by, bz) || 1
        bx /= bl
        bz /= bl
        const nx = by * tz - bz * ty
        const ny = bz * tx - bx * tz
        const nz = bx * ty - by * tx
        for (let j = 0; j < sides; j++) {
            const v = (j / sides) * Math.PI * 2
            const cv = Math.cos(v)
            const sv = Math.sin(v)
            const idx = i * sides + j
            pos[idx * 3] = c[0]
            pos[idx * 3 + 1] = c[1]
            pos[idx * 3 + 2] = c[2]
            off[idx * 3] = cv * nx + sv * bx
            off[idx * 3 + 1] = cv * ny + sv * by
            off[idx * 3 + 2] = cv * nz + sv * bz
            uu[idx] = i / seg
        }
    }
    const idx = new Uint32Array(seg * sides * 6)
    let k = 0
    for (let i = 0; i < seg; i++) {
        for (let j = 0; j < sides; j++) {
            const j1 = (j + 1) % sides
            const a = i * sides + j
            const b = i * sides + j1
            const c = (i + 1) * sides + j
            const d = (i + 1) * sides + j1
            idx[k++] = a
            idx[k++] = c
            idx[k++] = b
            idx[k++] = b
            idx[k++] = c
            idx[k++] = d
        }
    }
    return { pos, off, uu, idx }
}

export interface SingleClosedCurveProps {
    background?: string
    speed?: number
    scale?: number
    thickness?: number
    zoom?: number
    hueShift?: number
    cycleMs?: number
    hover?: number
    advanced?: {
        turns?: number
        startAngle?: number
        aroundWaves?: number
        upWaves?: number
        knotHeight?: number
        pinch?: number
        depthWobble?: number
        segments?: number
        sides?: number
        perspective?: number
        bands?: number
        bandDrift?: number
        rimAmount?: number
        specular?: number
        shininess?: number
        lightAngle?: number
        lightHeight?: number
        backDim?: number
        saturation?: number
        exposure?: number
        dofBlur?: number
        focusDepth?: number
        rimColor?: string
        pinkColor?: string
        orangeColor?: string
        yellowColor?: string
        greenColor?: string
        shadowColor?: string
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

export default function SingleClosedCurve(props: SingleClosedCurveProps) {
    props = withMovedControls(props)
    const {
        speed = 50,
        scale = 50,
        thickness = 82,
        zoom = 100,
        hueShift = 360,
        background = "#000000",
        style,
    } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(null)
    propsRef.current = { speed, scale, thickness, zoom, hueShift, background, advanced: props.advanced }

    useEffect(() => {
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return
        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: true,
            premultipliedAlpha: true,
            depth: true,
        }) as WebGL2RenderingContext | null
        if (!gl) return

        let raf = 0
        let disposed = false
        const res: any = {}
        try {
            res.mesh = compile(gl, MESH_VS, MESH_FS)
            res.post = compile(gl, QUAD_VS, POST_FS)
            res.overlay = compile(gl, QUAD_VS, OVERLAY_FS)
            const mp = res.mesh
            res.mu = {
                uR: U(gl, mp, "uR"),
                uAlpha: U(gl, mp, "uAlpha"),
                uK: U(gl, mp, "uK"),
                uD: U(gl, mp, "uD"),
                uAspect: U(gl, mp, "uAspect"),
                uAim: U(gl, mp, "uAim"),
                uNear: U(gl, mp, "uNear"),
                uFar: U(gl, mp, "uFar"),
                uPal: U(gl, mp, "uPal[0]"),
                uShadow: U(gl, mp, "uShadow"),
                uLight: U(gl, mp, "uLight"),
                uBands: U(gl, mp, "uBands"),
                uDrift: U(gl, mp, "uDrift"),
                uRimAmt: U(gl, mp, "uRimAmt"),
                uSpec: U(gl, mp, "uSpec"),
                uShine: U(gl, mp, "uShine"),
                uBackDim: U(gl, mp, "uBackDim"),
                uHue: U(gl, mp, "uHue"),
                uSat: U(gl, mp, "uSat"),
                uExposure: U(gl, mp, "uExposure"),
                uFocusW: U(gl, mp, "uFocusW"),
                uCocRange: U(gl, mp, "uCocRange"),
                uDof: U(gl, mp, "uDof"),
            }
            res.pu = {
                uCol: U(gl, res.post, "uCol"),
                uInfo: U(gl, res.post, "uInfo"),
                uTexel: U(gl, res.post, "uTexel"),
                uMaxR: U(gl, res.post, "uMaxR"),
            }
            res.ou = {
                uGrain: U(gl, res.overlay, "uGrain"),
                uVig: U(gl, res.overlay, "uVig"),
                uSeed: U(gl, res.overlay, "uSeed"),
                uRes: U(gl, res.overlay, "uRes"),
            }
        } catch (err) {
            console.error(err)
            return
        }

        const aP = gl.getAttribLocation(res.mesh, "aP")
        const aO = gl.getAttribLocation(res.mesh, "aO")
        const aU = gl.getAttribLocation(res.mesh, "aU")
        const vao = gl.createVertexArray()!
        const emptyVao = gl.createVertexArray()!
        const bufP = gl.createBuffer()!
        const bufO = gl.createBuffer()!
        const bufU = gl.createBuffer()!
        const bufI = gl.createBuffer()!
        gl.bindVertexArray(vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, bufP)
        gl.enableVertexAttribArray(aP)
        gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, bufO)
        gl.enableVertexAttribArray(aO)
        gl.vertexAttribPointer(aO, 3, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, bufU)
        gl.enableVertexAttribArray(aU)
        gl.vertexAttribPointer(aU, 1, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufI)
        gl.bindVertexArray(null)

        let meshKey = ""
        let indexCount = 0
        const ensureMesh = (adv: typeof ADVANCED_DEFAULTS) => {
            const key = [
                adv.aroundWaves,
                adv.upWaves,
                adv.knotHeight,
                adv.pinch,
                adv.depthWobble,
                adv.segments,
                adv.sides,
            ].join(",")
            if (key === meshKey) return
            meshKey = key
            const m = buildKnot(adv)
            gl.bindVertexArray(vao)
            gl.bindBuffer(gl.ARRAY_BUFFER, bufP)
            gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bufO)
            gl.bufferData(gl.ARRAY_BUFFER, m.off, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, bufU)
            gl.bufferData(gl.ARRAY_BUFFER, m.uu, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufI)
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW)
            gl.bindVertexArray(null)
            indexCount = m.idx.length
        }

        // Offscreen target for the depth-of-field shot
        let fbo: WebGLFramebuffer | null = null
        let texCol: WebGLTexture | null = null
        let texInfo: WebGLTexture | null = null
        let depthRb: WebGLRenderbuffer | null = null
        let fboW = 0
        let fboH = 0
        const makeTex = (w: number, h: number, filter: number) => {
            const t = gl.createTexture()!
            gl.bindTexture(gl.TEXTURE_2D, t)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            return t
        }
        const freeFbo = () => {
            if (fbo) gl.deleteFramebuffer(fbo)
            if (texCol) gl.deleteTexture(texCol)
            if (texInfo) gl.deleteTexture(texInfo)
            if (depthRb) gl.deleteRenderbuffer(depthRb)
            fbo = null
            texCol = null
            texInfo = null
            depthRb = null
            fboW = fboH = 0
        }
        const ensureFbo = (w: number, h: number) => {
            if (fbo && fboW === w && fboH === h) return
            freeFbo()
            texCol = makeTex(w, h, gl.LINEAR)
            texInfo = makeTex(w, h, gl.NEAREST)
            depthRb = gl.createRenderbuffer()!
            gl.bindRenderbuffer(gl.RENDERBUFFER, depthRb)
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h)
            fbo = gl.createFramebuffer()!
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texCol, 0)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, texInfo, 0)
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb)
            gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1])
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            fboW = w
            fboH = h
        }

        // Sizing
        const resize = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            const w = Math.max(1, Math.round(root.offsetWidth * dpr))
            const h = Math.max(1, Math.round(root.offsetHeight * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        // Pointer response: eased aim pull and a press-in dolly, scaled by Advanced → Hover.
        const pointer = { x: 0, y: 0, tx: 0, ty: 0, over: 0, tOver: 0, down: 0 }
        const onMove = (e: PointerEvent) => {
            const rect = root.getBoundingClientRect()
            pointer.tx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1))
            pointer.ty = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1))
        }
        const onEnter = () => {
            pointer.tOver = 1
        }
        const onLeave = () => {
            pointer.tOver = 0
        }
        const onDown = () => {
            pointer.down = 1
        }
        const onUp = () => {
            pointer.down = 0
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const rt = RenderTarget.current()
        const stillTarget = rt === RenderTarget.thumbnail || rt === RenderTarget.export
        const mq =
            typeof window !== "undefined" && window.matchMedia
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null

        let phase = 0
        let last: number | null = null
        let frame = 0

        const draw = () => {
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            ensureMesh(adv)
            const W = canvas.width
            const H = canvas.height

            const t = phase * REF_CYCLE
            const s = sampleShot(t)
            const z = Math.max(0, Math.min(100, p.zoom)) / 100
            const f0 = SHOT[0]
            const k = (f0[1] + (s.k - f0[1]) * z) * (Math.max(1, p.scale) / 100)
            const hoverAmt = Math.max(0, adv.hover ?? 50) / 50
            let D = f0[2] + (s.D - f0[2]) * z
            D = Math.max(1.5, 1 + (D - 1) * (Math.max(10, adv.perspective) / 100))
            D = Math.max(1.2, D - pointer.down * 0.4 * hoverAmt)
            const r = s.r * (Math.max(0, p.thickness) / 100)
            const ax = s.ax * z + pointer.x * 0.12 * pointer.over * hoverAmt
            const ay = s.ay * z - pointer.y * 0.12 * pointer.over * hoverAmt
            const dofBlurPx = (adv.dofBlur / 100) * H
            const dof = s.dof * z
            const useDof = dof > 0.01 && dofBlurPx > 0.5
            const alpha = ((adv.startAngle + 360 * Math.round(adv.turns) * phase) * Math.PI) / 180
            // band drift locked to whole palette laps per cycle so it repeats with the loop
            const cycleS = Math.max(1000, adv.cycleMs) / 1000
            const laps = adv.bandDrift > 0 ? Math.max(1, Math.round((adv.bandDrift / 100) * cycleS)) : 0
            const drift = phase * laps
            const near = 0.05
            const far = D + 3

            const bg = parseColor(p.background)
            const bgPm = [bg[0] * bg[3], bg[1] * bg[3], bg[2] * bg[3], bg[3]]

            gl.viewport(0, 0, W, H)
            if (useDof) {
                ensureFbo(W, H)
                gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
                gl.clearBufferfv(gl.COLOR, 0, bgPm)
                gl.clearBufferfv(gl.COLOR, 1, [1, 1, 0, 1])
                gl.clearBufferfv(gl.DEPTH, 0, [1])
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null)
                gl.clearColor(bgPm[0], bgPm[1], bgPm[2], bgPm[3])
                gl.clearDepth(1)
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            }

            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LEQUAL)
            gl.disable(gl.BLEND)
            gl.disable(gl.CULL_FACE)
            gl.useProgram(res.mesh)
            const mu = res.mu
            gl.uniform1f(mu.uR, r)
            gl.uniform1f(mu.uAlpha, alpha)
            gl.uniform1f(mu.uK, k)
            gl.uniform1f(mu.uD, D)
            gl.uniform1f(mu.uAspect, H / W)
            gl.uniform2f(mu.uAim, ax, ay)
            gl.uniform1f(mu.uNear, near)
            gl.uniform1f(mu.uFar, far)
            const pal = [adv.rimColor, adv.pinkColor, adv.orangeColor, adv.yellowColor, adv.greenColor]
            const palArr = new Float32Array(15)
            pal.forEach((c, i) => {
                const v = parseColor(c)
                palArr[i * 3] = v[0]
                palArr[i * 3 + 1] = v[1]
                palArr[i * 3 + 2] = v[2]
            })
            gl.uniform3fv(mu.uPal, palArr)
            const sh = parseColor(adv.shadowColor)
            gl.uniform3f(mu.uShadow, sh[0], sh[1], sh[2])
            const la = (adv.lightAngle * Math.PI) / 180
            const lh = (adv.lightHeight * Math.PI) / 180
            gl.uniform3f(mu.uLight, Math.cos(la) * Math.cos(lh), Math.sin(la) * Math.cos(lh), Math.sin(lh))
            gl.uniform1f(mu.uBands, Math.max(1, Math.round(adv.bands)))
            gl.uniform1f(mu.uDrift, drift)
            gl.uniform1f(mu.uRimAmt, adv.rimAmount / 100)
            gl.uniform1f(mu.uSpec, adv.specular / 100)
            gl.uniform1f(mu.uShine, adv.shininess)
            gl.uniform1f(mu.uBackDim, adv.backDim / 100)
            gl.uniform1f(mu.uHue, (p.hueShift * Math.PI) / 180)
            gl.uniform1f(mu.uSat, adv.saturation / 100)
            gl.uniform1f(mu.uExposure, adv.exposure / 100)
            // focus plane sits at focusDepth % of the way from the knot centre towards the camera
            gl.uniform1f(mu.uFocusW, D - adv.focusDepth / 100)
            gl.uniform1f(mu.uCocRange, 0.8)
            gl.uniform1f(mu.uDof, useDof ? dof : 0)
            gl.bindVertexArray(vao)
            gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0)

            gl.bindVertexArray(emptyVao)
            gl.disable(gl.DEPTH_TEST)
            if (useDof) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null)
                gl.viewport(0, 0, W, H)
                gl.useProgram(res.post)
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, texCol)
                gl.activeTexture(gl.TEXTURE1)
                gl.bindTexture(gl.TEXTURE_2D, texInfo)
                gl.uniform1i(res.pu.uCol, 0)
                gl.uniform1i(res.pu.uInfo, 1)
                gl.uniform2f(res.pu.uTexel, 1 / W, 1 / H)
                gl.uniform1f(res.pu.uMaxR, dofBlurPx)
                gl.drawArrays(gl.TRIANGLES, 0, 3)
            }

            const grain = Math.max(0, adv.grain) / 100
            const vig = Math.max(0, adv.vignette) / 100
            if (grain > 0 || vig > 0) {
                gl.enable(gl.BLEND)
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
                gl.useProgram(res.overlay)
                gl.uniform1f(res.ou.uGrain, grain)
                gl.uniform1f(res.ou.uVig, vig)
                gl.uniform1f(res.ou.uSeed, (frame % 97) * 7.31)
                gl.uniform2f(res.ou.uRes, W, H)
                gl.drawArrays(gl.TRIANGLES, 0, 3)
                gl.disable(gl.BLEND)
            }
            gl.bindVertexArray(null)
        }

        const tick = (now: number) => {
            if (disposed) return
            raf = requestAnimationFrame(tick)
            const dt = last === null ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            frame++
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const frozen = stillTarget || (mq ? mq.matches : false)
            if (frozen) {
                phase = 0
            } else {
                const cycle = Math.max(1000, adv.cycleMs) / 1000
                const rate = Math.max(0, p.speed) / 50
                phase = (phase + (dt * rate) / cycle) % 1
            }
            const ease = 1 - Math.pow(0.001, dt || 1 / 60)
            pointer.x += (pointer.tx - pointer.x) * ease
            pointer.y += (pointer.ty - pointer.y) * ease
            pointer.over += (pointer.tOver - pointer.over) * ease
            draw()
        }
        raf = requestAnimationFrame(tick)

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onEnter)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            freeFbo()
            gl.deleteBuffer(bufP)
            gl.deleteBuffer(bufO)
            gl.deleteBuffer(bufU)
            gl.deleteBuffer(bufI)
            gl.deleteVertexArray(vao)
            gl.deleteVertexArray(emptyVao)
            gl.deleteProgram(res.mesh)
            gl.deleteProgram(res.post)
            gl.deleteProgram(res.overlay)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
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
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
