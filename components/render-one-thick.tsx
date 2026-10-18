"use client"

/**
 * SolarSkein — a sunset-striped tube wound round a dark glass ball, tumbling
 * through a looping pose path. Built after the "RenderOneThick" render; the
 * scene, shaders and tuned values are that file's, unchanged. Added here: drag
 * to spin the skein (it springs back into the loop on release) and a hover
 * tilt that turns it toward the pointer.
 */

import * as React from "react"
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

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    cycleMs: 2970,
    key1Pct: 25,
    key2Pct: 54,
    key3Pct: 77,
    poleTiltDeg: 17,
    tilt1Deg: 30,
    tilt2Deg: 90,
    frontDeg: 45,
    topAngleDeg: 29,
    bottomAngleDeg: 169,
    taper: 65,
    ballSize: 75,
    offsetY: 1,
    camDist: 6,
    capColor: "#E0502A",
    yellowColor: "#F2C040",
    orangeColor: "#EE7A2E",
    redColor: "#D8302A",
    magentaColor: "#B0207A",
    violetColor: "#8A2A9A",
    shadow: 45,
    specular: 35,
    shininess: 24,
    ballBase: "#060101",
    pinkColor: "#E040A0",
    tealColor: "#2A8A8A",
    ballGlow: "#D38856",
    reflections: 80,
    rimStrength: 55,
    glowStart: "#1C0A20",
    edgeColor: "#000000",
    glowRadius: 220,
    glowFadeStartMs: 1300,
    glowFadeMs: 500,
    grain: 0,
    vignette: 0,
}
type Advanced = typeof ADVANCED_DEFAULTS

const DEFAULTS = {
    background: "#2D1707",
    turns: 10,
    twist: 30,
    scale: 66,
    thickness: 5,
    speed: 50,
}

const DEFAULT_INTERACTION = {
    drag: true,
    sensitivity: 5,
    hoverTilt: 5,
}

export interface SolarSkeinInteraction {
    /** Drag spins the skein; it springs back into the loop on release. */
    drag?: boolean
    /** 0–10; how far a pixel of drag turns it. */
    sensitivity?: number
    /** 0–10; how far it turns toward the pointer on hover. 0 is off. */
    hoverTilt?: number
}

export interface SolarSkeinProps {
    background?: string
    turns?: number
    twist?: number
    scale?: number
    thickness?: number
    interaction?: SolarSkeinInteraction
    speed?: number
    advanced?: Partial<Advanced>
    style?: React.CSSProperties
}

const SPT = 80 // tube samples per turn
const RADIAL = 14
const CAP = 5
const STOPS = [0.0, 0.12, 0.3, 0.55, 0.84, 0.98]
const D2R = Math.PI / 180
const TUBE_K = 0.015 // thickness % → tube radius in coil units
const LIGHT = (() => {
    const l = Math.hypot(-0.35, 0.85, 0.45)
    return [-0.35 / l, 0.85 / l, 0.45 / l]
})()

// Interaction feel — the look, not knobs.
const DRAG_UNIT = 0.0016 // rad per px at sensitivity 1 (5 → ~0.46° per px)
const PITCH_MAX = 1.3 // rad; past ~75° the skein reads edge-on
const SPRING_K = 6 // return-to-loop stiffness, 1/s²
const SPRING_C = 4 // damping, 1/s — slightly under critical, so it settles with a small overshoot
const FLING_MAX = 18 // rad/s cap on release velocity
const HOVER_MAX = 30 * D2R // tilt at hoverTilt 10 with the pointer on the edge
const HOVER_EASE = 5 // 1/s; how quickly the tilt follows the pointer

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const num = (v: unknown, fb: number) => (typeof v === "number" && isFinite(v) ? v : fb)
const fract = (x: number) => x - Math.floor(x)

const colorCache = new Map<string, number[]>()
function rgb(c: unknown, fb: number[] = [0, 0, 0]): number[] {
    if (typeof c !== "string") return fb
    const hit = colorCache.get(c)
    if (hit) return hit
    let out = fb
    const s = c.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((x) => x + x)
                .join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n)) out = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
    } else {
        const m = s.match(/rgba?\(([^)]+)\)/i)
        if (m) {
            const p = m[1]
                .split(/[\s,\/]+/)
                .filter(Boolean)
                .map(parseFloat)
            if (p.length >= 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2]))
                out = [p[0] / 255, p[1] / 255, p[2] / 255]
        }
    }
    colorCache.set(c, out)
    return out
}

// ── shaders ──
const HEAD = `#version 300 es
precision highp float;
`
const PROJ = `
uniform vec4 uProj;
uniform vec2 uNF;
vec4 project(vec3 p){
    float w = max(uProj.z - p.z, 0.001);
    float zn = 2.0 * (w - uNF.x) / max(uNF.y - uNF.x, 0.001) - 1.0;
    return vec4(p.x * uProj.x, p.y * uProj.y + uProj.w * w, zn * w, w);
}
`
const GRAD = `
uniform vec3 uCol[6];
uniform float uStop[6];
vec3 grad(float t){
    t = clamp(t, 0.0, 1.0);
    vec3 c = uCol[0];
    for (int i = 1; i < 6; i++) {
        float a = uStop[i - 1];
        float b = uStop[i];
        float k = clamp((t - a) / max(b - a, 0.0001), 0.0, 1.0);
        c = mix(c, uCol[i], k * k * (3.0 - 2.0 * k));
    }
    return c;
}
`
const FULL_VS =
    HEAD +
    `
void main(){
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`
const BG_FS =
    HEAD +
    `
uniform vec2 uCenter;
uniform float uRad;
uniform vec3 uGlow;
uniform vec3 uEdge;
out vec4 o;
void main(){
    float d = length(gl_FragCoord.xy - uCenter) / max(uRad, 1.0);
    float k = 1.0 - smoothstep(0.0, 1.0, d);
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    o = vec4(mix(uEdge, uGlow, k) + (n - 0.5) / 255.0, 1.0);
}`
const OVER_FS =
    HEAD +
    `
uniform vec2 uRes;
uniform float uGrain;
uniform float uVig;
uniform float uSeed;
out vec4 o;
void main(){
    vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));
    float n = fract(sin(dot(gl_FragCoord.xy + uSeed, vec2(12.9898, 78.233))) * 43758.5453);
    vec2 q = uv - 0.5;
    q.x *= uRes.x / max(uRes.y, 1.0);
    float g = uGrain * 0.35;
    float v = uVig * smoothstep(0.25, 0.9, length(q));
    float a = 1.0 - (1.0 - g) * (1.0 - v);
    o = vec4(vec3(n) * g * (1.0 - v), a);
}`
const TUBE_VS =
    HEAD +
    PROJ +
    `
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNor;
out vec3 vP;
out vec3 vN;
void main(){
    vP = aPos;
    vN = aNor;
    gl_Position = project(aPos);
}`
const TUBE_FS =
    HEAD +
    GRAD +
    `
in vec3 vP;
in vec3 vN;
uniform vec3 uCam;
uniform vec3 uLight;
uniform vec3 uShade;
uniform float uExt;
out vec4 o;
void main(){
    vec3 N = normalize(vN);
    vec3 V = normalize(uCam - vP);
    vec3 L = uLight;
    vec3 base = grad(0.5 + 0.5 * vP.y / max(uExt, 0.001));
    float h = 0.5 + 0.5 * dot(N, L);
    h = h * h * (3.0 - 2.0 * h);
    float lit = mix(uShade.x, 1.12, h);
    vec3 H = normalize(L + V);
    float sp = pow(max(dot(N, H), 0.0), max(uShade.z, 1.0)) * uShade.y;
    float fr = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
    float back = mix(0.72, 1.0, smoothstep(-0.8, 0.2, vP.z / max(uExt, 0.001)));
    vec3 c = (base * lit + base * fr * 0.18) * back + vec3(sp);
    o = vec4(c, 1.0);
}`
const BALL_VS =
    HEAD +
    PROJ +
    `
layout(location = 0) in vec3 aPos;
uniform float uR;
out vec3 vP;
out vec3 vN;
void main(){
    vP = aPos * uR;
    vN = aPos;
    gl_Position = project(vP);
}`
const BALL_FS =
    HEAD +
    GRAD +
    `
in vec3 vP;
in vec3 vN;
uniform vec3 uCam;
uniform mat3 uInv;
uniform vec3 uBase;
uniform vec3 uPink;
uniform vec3 uTeal;
uniform vec3 uGlowC;
uniform float uRefl;
uniform float uRim;
uniform float uBands;
out vec4 o;
void main(){
    vec3 N = normalize(vN);
    vec3 V = normalize(uCam - vP);
    float nv = clamp(dot(N, V), 0.0, 1.0);
    float edge = 1.0 - nv;
    vec3 R = reflect(-V, N);
    vec3 Rc = uInv * R;
    vec3 env = uPink * pow(max(dot(Rc, normalize(vec3(-0.1, 1.0, 0.15))), 0.0), 6.0) * 1.0;
    env += uTeal * pow(max(dot(Rc, normalize(vec3(0.6, 0.2, 0.75))), 0.0), 4.0) * 0.7;
    env += vec3(0.18, 0.54, 0.31) * pow(max(dot(Rc, normalize(vec3(0.85, -0.3, 0.45))), 0.0), 5.0) * 0.5;
    float band = 0.5 + 0.5 * cos(asin(clamp(Rc.y, -1.0, 1.0)) * uBands);
    env += grad(0.5 + 0.5 * R.y) * band * band * 0.22;
    env *= (0.1 + 0.9 * pow(edge, 0.8)) * uRefl;
    float gy = (N.y + 0.62) / 0.26;
    float g = exp(-gy * gy) * smoothstep(0.05, 0.6, nv);
    vec3 c = uBase + env + uGlowC * g * 0.5;
    vec3 rimC = mix(uGlowC * 1.2, uPink, smoothstep(-0.3, 0.6, N.y));
    c += rimC * pow(edge, 3.5) * uRim;
    o = vec4(c, 1.0);
}`

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)
    if (!sh) throw new Error("createShader failed")
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh)
        gl.deleteShader(sh)
        throw new Error("Shader compile: " + log)
    }
    return sh
}
function makeProgram(gl: WebGL2RenderingContext, vs: string, fs: string) {
    const p = gl.createProgram()
    if (!p) throw new Error("createProgram failed")
    const a = compile(gl, gl.VERTEX_SHADER, vs)
    const b = compile(gl, gl.FRAGMENT_SHADER, fs)
    gl.attachShader(p, a)
    gl.attachShader(p, b)
    gl.linkProgram(p)
    gl.detachShader(p, a)
    gl.detachShader(p, b)
    gl.deleteShader(a)
    gl.deleteShader(b)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("Program link: " + gl.getProgramInfoLog(p))
    return p
}
function U(gl: WebGL2RenderingContext, p: WebGLProgram, name: string) {
    const l = gl.getUniformLocation(p, name)
    if (l === null) throw new Error("Missing uniform " + name)
    return l
}

// ── tumble path: pole (thin end) direction over one cycle ──
type Keys = { pts: number[][]; ts: number[] }
function pathKeys(adv: Advanced): Keys {
    const pt = num(adv.poleTiltDeg, 17) * D2R
    const c = Math.cos(pt)
    const s = Math.sin(pt)
    const rz = (deg: number) => {
        const a = deg * D2R
        return [c * Math.sin(a), -c * Math.cos(a), s]
    }
    const f = num(adv.frontDeg, 45) * D2R
    const k3 = [Math.cos(f), -0.1, Math.sin(f)]
    const l3 = Math.hypot(k3[0], k3[1], k3[2]) || 1
    const t1 = clamp(num(adv.key1Pct, 25) / 100, 0.05, 0.9)
    const t2 = clamp(num(adv.key2Pct, 54) / 100, t1 + 0.02, 0.94)
    const t3 = clamp(num(adv.key3Pct, 77) / 100, t2 + 0.02, 0.97)
    return {
        pts: [[0, -c, s], rz(num(adv.tilt1Deg, 30)), rz(num(adv.tilt2Deg, 90)), [k3[0] / l3, k3[1] / l3, k3[2] / l3]],
        ts: [0, t1, t2, t3, 1],
    }
}
function pathAt(K: Keys, u: number, out: Float64Array) {
    let i = 0
    while (i < 3 && u >= K.ts[i + 1]) i++
    const x = clamp((u - K.ts[i]) / Math.max(K.ts[i + 1] - K.ts[i], 1e-4), 0, 1)
    const x2 = x * x
    const x3 = x2 * x
    const P0 = K.pts[(i + 3) % 4]
    const P1 = K.pts[i]
    const P2 = K.pts[(i + 1) % 4]
    const P3 = K.pts[(i + 2) % 4]
    for (let c = 0; c < 3; c++) {
        out[c] =
            0.5 *
            (2 * P1[c] +
                (-P0[c] + P2[c]) * x +
                (2 * P0[c] - 5 * P1[c] + 4 * P2[c] - P3[c]) * x2 +
                (-P0[c] + 3 * P1[c] - 3 * P2[c] + P3[c]) * x3)
    }
    const l = Math.hypot(out[0], out[1], out[2]) || 1
    out[0] /= l
    out[1] /= l
    out[2] /= l
}
// rotation (row-major) taking the base pole (0,-1,0) onto dir
function rotMat(dir: Float64Array, m: Float64Array) {
    let w = 1 - dir[1]
    let x = -dir[2]
    let z = dir[0]
    const l = Math.hypot(w, x, z) || 1
    w /= l
    x /= l
    z /= l
    m[0] = 1 - 2 * z * z
    m[1] = -2 * w * z
    m[2] = 2 * x * z
    m[3] = 2 * w * z
    m[4] = 1 - 2 * (x * x + z * z)
    m[5] = -2 * w * x
    m[6] = 2 * x * z
    m[7] = 2 * w * x
    m[8] = 1 - 2 * x * x
}
// m ← a · m (both row-major 3×3): applies the pointer rotation on top of the tumble
function premul(a: Float64Array, m: Float64Array) {
    for (let c = 0; c < 3; c++) {
        const x = m[c]
        const y = m[3 + c]
        const z = m[6 + c]
        m[c] = a[0] * x + a[1] * y + a[2] * z
        m[3 + c] = a[3] * x + a[4] * y + a[5] * z
        m[6 + c] = a[6] * x + a[7] * y + a[8] * z
    }
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function SolarSkein({
    background = DEFAULTS.background,
    turns = DEFAULTS.turns,
    twist = DEFAULTS.twist,
    scale = DEFAULTS.scale,
    thickness = DEFAULTS.thickness,
    interaction = {"drag":true,"hoverTilt":5,"sensitivity":5},
    speed = DEFAULTS.speed,
    advanced = {"grain":0,"taper":65,"shadow":45,"camDist":6,"cycleMs":2970,"key1Pct":25,"key2Pct":54,"key3Pct":77,"offsetY":1,"ballBase":"#060101","ballGlow":"#D38856","ballSize":75,"capColor":"#E0502A","frontDeg":45,"redColor":"#D8302A","specular":35,"tilt1Deg":30,"tilt2Deg":90,"vignette":0,"edgeColor":"#000000","glowStart":"#1C0A20","pinkColor":"#E040A0","shininess":24,"tealColor":"#2A8A8A","glowFadeMs":500,"glowRadius":220,"orangeColor":"#EE7A2E","poleTiltDeg":17,"reflections":80,"rimStrength":55,"topAngleDeg":29,"violetColor":"#8A2A9A","yellowColor":"#F2C040","magentaColor":"#B0207A","bottomAngleDeg":169,"glowFadeStartMs":1300},
    style,
}: SolarSkeinProps) {
    const touch = { ...DEFAULT_INTERACTION, ...interaction }
    const wrapRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<SolarSkeinProps>({})
    propsRef.current = { speed, scale, turns, twist, thickness, background, interaction: touch, advanced }
    const redrawRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        if (redrawRef.current) redrawRef.current()
    })

    useEffect(() => {
        const canvas = canvasRef.current
        const wrap = wrapRef.current
        if (!canvas || !wrap) return
        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        }) as WebGL2RenderingContext | null
        if (!gl) return

        // programs
        const bgProg = makeProgram(gl, FULL_VS, BG_FS)
        const overProg = makeProgram(gl, FULL_VS, OVER_FS)
        const tubeProg = makeProgram(gl, TUBE_VS, TUBE_FS)
        const ballProg = makeProgram(gl, BALL_VS, BALL_FS)
        const bgU = {
            center: U(gl, bgProg, "uCenter"),
            rad: U(gl, bgProg, "uRad"),
            glow: U(gl, bgProg, "uGlow"),
            edge: U(gl, bgProg, "uEdge"),
        }
        const ovU = {
            res: U(gl, overProg, "uRes"),
            grain: U(gl, overProg, "uGrain"),
            vig: U(gl, overProg, "uVig"),
            seed: U(gl, overProg, "uSeed"),
        }
        const tuU = {
            proj: U(gl, tubeProg, "uProj"),
            nf: U(gl, tubeProg, "uNF"),
            col: U(gl, tubeProg, "uCol[0]"),
            stop: U(gl, tubeProg, "uStop[0]"),
            cam: U(gl, tubeProg, "uCam"),
            light: U(gl, tubeProg, "uLight"),
            shade: U(gl, tubeProg, "uShade"),
            ext: U(gl, tubeProg, "uExt"),
        }
        const baU = {
            proj: U(gl, ballProg, "uProj"),
            nf: U(gl, ballProg, "uNF"),
            r: U(gl, ballProg, "uR"),
            col: U(gl, ballProg, "uCol[0]"),
            stop: U(gl, ballProg, "uStop[0]"),
            cam: U(gl, ballProg, "uCam"),
            inv: U(gl, ballProg, "uInv"),
            base: U(gl, ballProg, "uBase"),
            pink: U(gl, ballProg, "uPink"),
            teal: U(gl, ballProg, "uTeal"),
            glowC: U(gl, ballProg, "uGlowC"),
            refl: U(gl, ballProg, "uRefl"),
            rim: U(gl, ballProg, "uRim"),
            bands: U(gl, ballProg, "uBands"),
        }

        const emptyVao = gl.createVertexArray()

        // ball mesh (static UV sphere)
        const LAT = 32
        const LON = 48
        const ballPos = new Float32Array((LAT + 1) * (LON + 1) * 3)
        let bp = 0
        for (let i = 0; i <= LAT; i++) {
            const th = (i / LAT) * Math.PI
            for (let j = 0; j <= LON; j++) {
                const ph = (j / LON) * Math.PI * 2
                ballPos[bp++] = Math.sin(th) * Math.cos(ph)
                ballPos[bp++] = Math.cos(th)
                ballPos[bp++] = Math.sin(th) * Math.sin(ph)
            }
        }
        const ballIdx = new Uint16Array(LAT * LON * 6)
        let bi = 0
        for (let i = 0; i < LAT; i++)
            for (let j = 0; j < LON; j++) {
                const a = i * (LON + 1) + j
                const b = a + LON + 1
                ballIdx[bi++] = a
                ballIdx[bi++] = b
                ballIdx[bi++] = a + 1
                ballIdx[bi++] = a + 1
                ballIdx[bi++] = b
                ballIdx[bi++] = b + 1
            }
        const ballVao = gl.createVertexArray()
        const ballVbo = gl.createBuffer()
        const ballIbo = gl.createBuffer()
        gl.bindVertexArray(ballVao)
        gl.bindBuffer(gl.ARRAY_BUFFER, ballVbo)
        gl.bufferData(gl.ARRAY_BUFFER, ballPos, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballIbo)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ballIdx, gl.STATIC_DRAW)

        // tube mesh (rebuilt on the CPU every frame)
        const tubeVao = gl.createVertexArray()
        const tubeVbo = gl.createBuffer()
        const tubeIbo = gl.createBuffer()
        gl.bindVertexArray(tubeVao)
        gl.bindBuffer(gl.ARRAY_BUFFER, tubeVbo)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
        gl.bindVertexArray(null)

        const COS = new Float64Array(RADIAL)
        const SIN = new Float64Array(RADIAL)
        for (let a = 0; a < RADIAL; a++) {
            COS[a] = Math.cos((a / RADIAL) * Math.PI * 2)
            SIN[a] = Math.sin((a / RADIAL) * Math.PI * 2)
        }

        let curRings = 0
        let indexCount = 0
        let V = new Float32Array(0)
        let CX = new Float64Array(0),
            CY = CX,
            CZ = CX,
            RR = CX,
            TX = CX,
            TY = CX,
            TZ = CX,
            NX = CX,
            NY = CX,
            NZ = CX,
            BX = CX,
            BY = CX,
            BZ = CX

        const ensure = (N: number) => {
            const rings = N + 2 * CAP
            if (rings === curRings) return
            curRings = rings
            V = new Float32Array(rings * RADIAL * 6)
            const mk = () => new Float64Array(N)
            CX = mk(); CY = mk(); CZ = mk(); RR = mk()
            TX = mk(); TY = mk(); TZ = mk()
            NX = mk(); NY = mk(); NZ = mk()
            BX = mk(); BY = mk(); BZ = mk()
            const idx = new Uint16Array((rings - 1) * RADIAL * 6)
            let q = 0
            for (let k = 0; k < rings - 1; k++)
                for (let a = 0; a < RADIAL; a++) {
                    const a1 = (a + 1) % RADIAL
                    const i00 = k * RADIAL + a
                    const i01 = k * RADIAL + a1
                    const i10 = (k + 1) * RADIAL + a
                    const i11 = (k + 1) * RADIAL + a1
                    idx[q++] = i00
                    idx[q++] = i10
                    idx[q++] = i01
                    idx[q++] = i01
                    idx[q++] = i10
                    idx[q++] = i11
                }
            indexCount = idx.length
            gl.bindVertexArray(tubeVao)
            gl.bindBuffer(gl.ARRAY_BUFFER, tubeVbo)
            gl.bufferData(gl.ARRAY_BUFFER, V.byteLength, gl.DYNAMIC_DRAW)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tubeIbo)
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW)
            gl.bindVertexArray(null)
        }

        const put = (k: number, cx: number, cy: number, cz: number, rad: number, i: number, tw: number) => {
            const rw = Math.sqrt(Math.max(0, 1 - tw * tw))
            for (let a = 0; a < RADIAL; a++) {
                const ca = COS[a]
                const sa = SIN[a]
                const rx = ca * NX[i] + sa * BX[i]
                const ry = ca * NY[i] + sa * BY[i]
                const rz = ca * NZ[i] + sa * BZ[i]
                const o = (k * RADIAL + a) * 6
                V[o] = cx + rad * rx
                V[o + 1] = cy + rad * ry
                V[o + 2] = cz + rad * rz
                V[o + 3] = rx * rw + TX[i] * tw
                V[o + 4] = ry * rw + TY[i] * tw
                V[o + 5] = rz * rw + TZ[i] * tw
            }
        }

        const dir = new Float64Array(3)
        const m = new Float64Array(9)
        const inv = new Float32Array(9)
        const colArr = new Float32Array(18)
        const stopArr = new Float32Array(STOPS)
        const UM = new Float64Array(9) // pointer rotation: pitch (about x) after yaw (about y)
        let rotYaw = 0
        let rotPitch = 0
        let W = 1
        let H = 1
        let frame = 0

        const render = (t: number) => {
            const p = propsRef.current
            const adv: Advanced = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const nTurns = Math.round(clamp(num(p.turns, 10), 2, 16))
            const N = nTurns * SPT + 1
            ensure(N)

            {
                const ca = Math.cos(rotYaw)
                const sa = Math.sin(rotYaw)
                const cb = Math.cos(rotPitch)
                const sb = Math.sin(rotPitch)
                UM[0] = ca; UM[1] = 0; UM[2] = sa
                UM[3] = sb * sa; UM[4] = cb; UM[5] = -sb * ca
                UM[6] = -cb * sa; UM[7] = sb; UM[8] = cb * ca
            }

            const K = pathKeys(adv)
            const cycle = Math.max(0.2, num(adv.cycleMs, 2970) / 1000)
            const u = fract(t / cycle)
            const twoPh = fract(t / (2 * cycle)) * 2
            const env = twoPh < 1 ? 0 : Math.pow(Math.sin(Math.PI * (twoPh - 1)), 2)
            const lag = (clamp(num(p.twist, 30), 0, 100) / 100) * 1.4 * env
            const th0 = num(adv.topAngleDeg, 29) * D2R
            const th1 = num(adv.bottomAngleDeg, 169) * D2R
            const r0 = clamp(num(p.thickness, 5), 1, 10) * TUBE_K
            const taper = clamp(num(adv.taper, 65), 0, 95) / 100

            // centreline
            for (let i = 0; i < N; i++) {
                const s = i / (N - 1)
                pathAt(K, fract(u - lag * (1 - s)), dir)
                rotMat(dir, m)
                premul(UM, m)
                const th = th0 + (th1 - th0) * s
                const ph = Math.PI * 2 * nTurns * s
                const st = Math.sin(th)
                const px = st * Math.cos(ph)
                const py = Math.cos(th)
                const pz = st * Math.sin(ph)
                CX[i] = m[0] * px + m[1] * py + m[2] * pz
                CY[i] = m[3] * px + m[4] * py + m[5] * pz
                CZ[i] = m[6] * px + m[7] * py + m[8] * pz
                RR[i] = r0 * (1 - taper * Math.pow(s, 1.5))
            }
            // tangents
            for (let i = 0; i < N; i++) {
                const a = Math.max(i - 1, 0)
                const b = Math.min(i + 1, N - 1)
                const dx = CX[b] - CX[a]
                const dy = CY[b] - CY[a]
                const dz = CZ[b] - CZ[a]
                const l = Math.hypot(dx, dy, dz) || 1
                TX[i] = dx / l
                TY[i] = dy / l
                TZ[i] = dz / l
            }
            // parallel-transport frames
            let ax = 0,
                ay = 1,
                az = 0
            if (Math.abs(TY[0]) > 0.9) {
                ax = 1
                ay = 0
            }
            let nx = 0,
                ny = 0,
                nz = 0
            {
                const d = ax * TX[0] + ay * TY[0] + az * TZ[0]
                nx = ax - TX[0] * d
                ny = ay - TY[0] * d
                nz = az - TZ[0] * d
                const l = Math.hypot(nx, ny, nz) || 1
                nx /= l
                ny /= l
                nz /= l
            }
            for (let i = 0; i < N; i++) {
                if (i > 0) {
                    const d = nx * TX[i] + ny * TY[i] + nz * TZ[i]
                    const qx = nx - TX[i] * d
                    const qy = ny - TY[i] * d
                    const qz = nz - TZ[i] * d
                    const l = Math.hypot(qx, qy, qz)
                    if (l > 1e-6) {
                        nx = qx / l
                        ny = qy / l
                        nz = qz / l
                    }
                }
                NX[i] = nx
                NY[i] = ny
                NZ[i] = nz
                BX[i] = TY[i] * nz - TZ[i] * ny
                BY[i] = TZ[i] * nx - TX[i] * nz
                BZ[i] = TX[i] * ny - TY[i] * nx
            }
            // rings: start cap, body, end cap
            for (let k = 0; k < CAP; k++) {
                const ps = ((CAP - k) / CAP) * (Math.PI / 2)
                const sp = Math.sin(ps)
                const r = RR[0]
                put(k, CX[0] - TX[0] * r * sp, CY[0] - TY[0] * r * sp, CZ[0] - TZ[0] * r * sp, r * Math.cos(ps), 0, -sp)
            }
            for (let i = 0; i < N; i++) put(CAP + i, CX[i], CY[i], CZ[i], RR[i], i, 0)
            const e = N - 1
            for (let j = 1; j <= CAP; j++) {
                const ps = (j / CAP) * (Math.PI / 2)
                const sp = Math.sin(ps)
                const r = RR[e]
                put(CAP + N + j - 1, CX[e] + TX[e] * r * sp, CY[e] + TY[e] * r * sp, CZ[e] + TZ[e] * r * sp, r * Math.cos(ps), e, sp)
            }

            // camera
            const D = clamp(num(adv.camDist, 6), 3, 40)
            const Rext = 1 + r0
            const minSide = Math.min(W, H)
            const pxR = (clamp(num(p.scale, 88), 10, 200) / 100) * (minSide / 2)
            const f = (pxR / Math.max(H / 2, 1)) * (D / Rext)
            const offY = num(adv.offsetY, 1)
            const proj = [f / Math.max(W / H, 0.001), f, D, (-2 * offY) / 100]
            const nf = [Math.max(0.05, D - 2.5), D + 2.5]

            // gradient colours, bottom → top
            const cols = [adv.violetColor, adv.magentaColor, adv.redColor, adv.orangeColor, adv.yellowColor, adv.capColor]
            for (let i = 0; i < 6; i++) {
                const c = rgb(cols[i])
                colArr[i * 3] = c[0]
                colArr[i * 3 + 1] = c[1]
                colArr[i * 3 + 2] = c[2]
            }

            // backdrop glow: plum → brown, back to plum before the double cycle wraps
            const loopMs = 2 * cycle * 1000
            const tms = (((t * 1000) % loopMs) + loopMs) % loopMs
            const fadeMs = Math.max(1, num(adv.glowFadeMs, 500))
            const fin = clamp((tms - num(adv.glowFadeStartMs, 1300)) / fadeMs, 0, 1)
            const fout = clamp((loopMs - tms) / fadeMs, 0, 1)
            const mixK = fin * fout
            const g0 = rgb(adv.glowStart)
            const g1 = rgb(p.background, [0.176, 0.09, 0.027])
            const edge = rgb(adv.edgeColor)

            gl.viewport(0, 0, W, H)
            gl.disable(gl.BLEND)
            gl.disable(gl.DEPTH_TEST)
            gl.useProgram(bgProg)
            gl.uniform2f(bgU.center, W / 2, H * (0.5 - offY / 100))
            gl.uniform1f(bgU.rad, (num(adv.glowRadius, 220) / 100) * pxR)
            gl.uniform3f(bgU.glow, g0[0] + (g1[0] - g0[0]) * mixK, g0[1] + (g1[1] - g0[1]) * mixK, g0[2] + (g1[2] - g0[2]) * mixK)
            gl.uniform3f(bgU.edge, edge[0], edge[1], edge[2])
            gl.bindVertexArray(emptyVao)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            gl.depthMask(true)
            gl.clearDepth(1)
            gl.clear(gl.DEPTH_BUFFER_BIT)
            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LESS)

            // inner glass ball
            pathAt(K, fract(u - lag * 0.5), dir)
            rotMat(dir, m)
            premul(UM, m)
            for (let i = 0; i < 9; i++) inv[i] = m[i]
            const bb = rgb(adv.ballBase)
            const pk = rgb(adv.pinkColor)
            const tl = rgb(adv.tealColor)
            const bg = rgb(adv.ballGlow)
            gl.useProgram(ballProg)
            gl.uniform4f(baU.proj, proj[0], proj[1], proj[2], proj[3])
            gl.uniform2f(baU.nf, nf[0], nf[1])
            gl.uniform1f(baU.r, clamp(num(adv.ballSize, 75), 10, 100) / 100)
            gl.uniform3fv(baU.col, colArr)
            gl.uniform1fv(baU.stop, stopArr)
            gl.uniform3f(baU.cam, 0, 0, D)
            gl.uniformMatrix3fv(baU.inv, false, inv)
            gl.uniform3f(baU.base, bb[0], bb[1], bb[2])
            gl.uniform3f(baU.pink, pk[0], pk[1], pk[2])
            gl.uniform3f(baU.teal, tl[0], tl[1], tl[2])
            gl.uniform3f(baU.glowC, bg[0], bg[1], bg[2])
            gl.uniform1f(baU.refl, clamp(num(adv.reflections, 80), 0, 200) / 100)
            gl.uniform1f(baU.rim, clamp(num(adv.rimStrength, 55), 0, 200) / 100)
            gl.uniform1f(baU.bands, nTurns * 1.3)
            gl.bindVertexArray(ballVao)
            gl.drawElements(gl.TRIANGLES, ballIdx.length, gl.UNSIGNED_SHORT, 0)

            // tube
            gl.useProgram(tubeProg)
            gl.uniform4f(tuU.proj, proj[0], proj[1], proj[2], proj[3])
            gl.uniform2f(tuU.nf, nf[0], nf[1])
            gl.uniform3fv(tuU.col, colArr)
            gl.uniform1fv(tuU.stop, stopArr)
            gl.uniform3f(tuU.cam, 0, 0, D)
            gl.uniform3f(tuU.light, LIGHT[0], LIGHT[1], LIGHT[2])
            gl.uniform3f(
                tuU.shade,
                clamp(num(adv.shadow, 45), 0, 100) / 100,
                clamp(num(adv.specular, 35), 0, 200) / 100,
                clamp(num(adv.shininess, 24), 1, 256)
            )
            gl.uniform1f(tuU.ext, 1)
            gl.bindVertexArray(tubeVao)
            gl.bindBuffer(gl.ARRAY_BUFFER, tubeVbo)
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, V)
            gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0)

            // grain + vignette overlay
            const grain = clamp(num(adv.grain, 0), 0, 100) / 100
            const vig = clamp(num(adv.vignette, 0), 0, 100) / 100
            if (grain > 0 || vig > 0) {
                gl.disable(gl.DEPTH_TEST)
                gl.enable(gl.BLEND)
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
                gl.useProgram(overProg)
                gl.uniform2f(ovU.res, W, H)
                gl.uniform1f(ovU.grain, grain)
                gl.uniform1f(ovU.vig, vig)
                gl.uniform1f(ovU.seed, (frame % 97) * 7.13)
                gl.bindVertexArray(emptyVao)
                gl.drawArrays(gl.TRIANGLES, 0, 3)
                gl.disable(gl.BLEND)
            }
            gl.bindVertexArray(null)
            frame++
        }

        const reduced =
            typeof window !== "undefined" &&
            !!window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const target = RenderTarget.current()
        const frozen = reduced || target === RenderTarget.export || target === RenderTarget.thumbnail

        // The root keeps a 1200×800 floor; when the host is smaller the overflow is clipped,
        // so size and centre the scene on the part that is actually visible.
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            let w = Math.max(1, wrap.offsetWidth)
            let h = Math.max(1, wrap.offsetHeight)
            const parent = wrap.parentElement
            if (parent) {
                const pw = parent.clientWidth
                const ph = parent.clientHeight
                if (pw > 0) w = Math.min(w, pw)
                if (ph > 0) h = Math.min(h, ph)
            }
            canvas.style.width = w + "px"
            canvas.style.height = h + "px"
            W = Math.max(1, Math.round(w * dpr))
            H = Math.max(1, Math.round(h * dpr))
            if (canvas.width !== W) canvas.width = W
            if (canvas.height !== H) canvas.height = H
            if (frozen) render(0)
        }
        const ro = new ResizeObserver(resize)
        ro.observe(wrap)
        if (wrap.parentElement) ro.observe(wrap.parentElement)
        resize()

        // ── pointer: drag spins (offset + fling, sprung back to rest), hover tilts toward the pointer ──
        const touchNow = () => ({ ...DEFAULT_INTERACTION, ...(propsRef.current.interaction ?? {}) })
        let dragging = false
        let lastX = 0
        let lastY = 0
        let lastMove = 0
        let dYaw = 0
        let dPitch = 0
        let vYaw = 0
        let vPitch = 0
        let hX = 0 // hover tilt, current and target, as −1…1 across the canvas
        let hY = 0
        let tX = 0
        let tY = 0

        const onDown = (e: PointerEvent) => {
            if (!touchNow().drag || (e.pointerType === "mouse" && e.button !== 0)) return
            dragging = true
            lastX = e.clientX
            lastY = e.clientY
            lastMove = e.timeStamp
            vYaw = 0
            vPitch = 0
            try {
                wrap.setPointerCapture(e.pointerId)
            } catch {}
            wrap.style.cursor = "grabbing"
        }
        const onMove = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            tX = clamp(((e.clientX - r.left) / Math.max(r.width, 1)) * 2 - 1, -1, 1)
            tY = clamp(((e.clientY - r.top) / Math.max(r.height, 1)) * 2 - 1, -1, 1)
            if (!dragging) return
            const k = clamp(num(touchNow().sensitivity, 5), 0, 10) * DRAG_UNIT
            const dx = (e.clientX - lastX) * k
            const dy = (e.clientY - lastY) * k
            dYaw += dx
            dPitch = clamp(dPitch + dy, -PITCH_MAX, PITCH_MAX)
            const dt = (e.timeStamp - lastMove) / 1000
            if (dt > 0) {
                vYaw = clamp(vYaw * 0.5 + (dx / dt) * 0.5, -FLING_MAX, FLING_MAX)
                vPitch = clamp(vPitch * 0.5 + (dy / dt) * 0.5, -FLING_MAX, FLING_MAX)
            }
            lastX = e.clientX
            lastY = e.clientY
            lastMove = e.timeStamp
        }
        const onUp = (e: PointerEvent) => {
            if (!dragging) return
            dragging = false
            if (e.timeStamp - lastMove > 80) {
                vYaw = 0
                vPitch = 0
            }
            // Same pose, fewest turns to unwind on the way back.
            dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw))
            wrap.style.cursor = touchNow().drag ? "grab" : ""
        }
        const onLeave = () => {
            tX = 0
            tY = 0
        }

        let raf = 0
        if (frozen) {
            redrawRef.current = () => render(0)
            render(0)
        } else {
            wrap.addEventListener("pointerdown", onDown)
            wrap.addEventListener("pointermove", onMove)
            wrap.addEventListener("pointerup", onUp)
            wrap.addEventListener("pointercancel", onUp)
            wrap.addEventListener("pointerleave", onLeave)
            let last = -1
            let t = 0
            const tick = (now: number) => {
                const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
                last = now
                t += dt * (clamp(num(propsRef.current.speed, 50), 0, 100) / 50)

                if (!dragging) {
                    vYaw += (-SPRING_K * dYaw - SPRING_C * vYaw) * dt
                    vPitch += (-SPRING_K * dPitch - SPRING_C * vPitch) * dt
                    dYaw += vYaw * dt
                    dPitch += vPitch * dt
                }
                const ease = 1 - Math.exp(-HOVER_EASE * dt)
                hX += (tX - hX) * ease
                hY += (tY - hY) * ease
                const tilt = (clamp(num(touchNow().hoverTilt, 5), 0, 10) / 10) * HOVER_MAX
                rotYaw = dYaw + hX * tilt
                rotPitch = dPitch + hY * tilt

                render(t)
                raf = requestAnimationFrame(tick)
            }
            raf = requestAnimationFrame(tick)
        }

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            wrap.removeEventListener("pointerdown", onDown)
            wrap.removeEventListener("pointermove", onMove)
            wrap.removeEventListener("pointerup", onUp)
            wrap.removeEventListener("pointercancel", onUp)
            wrap.removeEventListener("pointerleave", onLeave)
            redrawRef.current = null
            gl.deleteBuffer(ballVbo)
            gl.deleteBuffer(ballIbo)
            gl.deleteBuffer(tubeVbo)
            gl.deleteBuffer(tubeIbo)
            gl.deleteVertexArray(ballVao)
            gl.deleteVertexArray(tubeVao)
            gl.deleteVertexArray(emptyVao)
            gl.deleteProgram(bgProg)
            gl.deleteProgram(overProg)
            gl.deleteProgram(tubeProg)
            gl.deleteProgram(ballProg)
        }
    }, [])

    return (
        <div
            ref={wrapRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                background: "#000000",
                // pan-y, not none: a horizontal swipe spins it on touch, a vertical one still scrolls the page.
                cursor: touch.drag ? "grab" : undefined,
                touchAction: touch.drag ? "pan-y" : undefined,
                ...style,
                overflow: "hidden",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
