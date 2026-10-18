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

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    cycleMs: 6200,
    easing: 70,
    ballSize: 66,
    ballX: 50,
    ballY: 50,
    knotX: -25,
    knotY: 74,
    sweepDir: 83,
    axisTilt: 10,
    poleGap: 100,
    segPerTurn: 110,
    tubeSides: 14,
    bridgeLen: 4,
    lift: 60,
    layerGap: 110,
    knotBulge: 45,
    strandCount: 8,
    strandAngle: 45,
    ridgeDepth: 90,
    spinBlur: 60,
    lightAngle: 225,
    lightElevation: 55,
    ambient: 30,
    diffuse: 72,
    ballShade: 15,
    specular: 55,
    shininess: 20,
    grooveDark: 70,
    interiorDim: 45,
    grooveColor: "#3E012F",
    valleyColor: "#008164",
    shadowColor: "#16D89D",
    topColor: "#00800D",
    bgCorner: "#3E0101",
}

type Vec3 = [number, number, number]
type Mat3 = number[]

const PI = Math.PI

const VS = `#version 300 es
precision highp float;
in vec2 aSA;
uniform mat3 uMA;
uniform mat3 uMB;
uniform mat3 uV;
uniform float uPhaseA;
uniform float uPhaseB;
uniform float uN;
uniform float uTh0;
uniform float uR;
uniform float uPe;
uniform float uW;
uniform float uLift;
uniform float uRadA;
uniform float uFlip;
uniform float uKnot;
uniform float uSegs;
uniform vec2 uScale;
uniform vec2 uOffset;
out vec3 vN;
out vec3 vT;
out vec3 vA;
out vec3 vRad;
out float vAlpha;
out float vL;
out float vK;
const float PI = 3.141592653589793;
float thetaOf(float q) { return uTh0 + (PI - 2.0 * uTh0) * clamp(q, 0.0, 1.0); }
vec3 spiral(float q, float ph) {
    float th = thetaOf(q);
    float az = 2.0 * uN * th + ph;
    return vec3(sin(th) * cos(az), cos(th), sin(th) * sin(az));
}
vec3 center(float s, out float k) {
    float q = mix(s, 1.0 - s, uFlip);
    k = smoothstep(1.0 - uPe - uW, 1.0 - uPe + uW, q);
    vec3 a = uMA * spiral(q, uPhaseA) * uRadA;
    vec3 b = uMB * spiral(1.0 - q, uPhaseB);
    vec3 m = mix(a, b, k);
    float len = length(m);
    vec3 dir = len > 1e-4 ? m / len : normalize(a);
    float rad = mix(uRadA, 1.0, k) + uLift * 4.0 * k * (1.0 - k);
    return dir * rad;
}
float arcLen(float s) { return 2.0 * uN * (cos(uTh0) - cos(thetaOf(s))); }
void main() {
    float s = aSA.x;
    float al = aSA.y;
    float k;
    vec3 c = center(s, k);
    float e = 1.0 / uSegs;
    float kk;
    vec3 c1 = center(max(s - e, 0.0), kk);
    vec3 c2 = center(min(s + e, 1.0), kk);
    vec3 T = c2 - c1;
    float tl = length(T);
    T = tl > 1e-6 ? T / tl : vec3(1.0, 0.0, 0.0);
    vec3 n0 = normalize(c);
    vec3 bN = cross(T, n0);
    float bl = length(bN);
    bN = bl > 1e-5 ? bN / bl : normalize(cross(T, abs(T.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)));
    vec3 nN = cross(bN, T);
    float L = arcLen(s);
    float Ltot = arcLen(1.0);
    float Lend = min(L, Ltot - L);
    float tt = clamp(Lend / uR, 0.0, 1.0);
    float cap = sqrt(max(1.0 - (1.0 - tt) * (1.0 - tt), 0.0));
    float rr = uR * cap * (1.0 + uKnot * exp(-Lend / (uR * 5.0)));
    vec3 dirR = cos(al) * nN + sin(al) * bN;
    vec3 p = c + dirR * rr;
    float endSign = L < Ltot - L ? -1.0 : 1.0;
    vec3 nrm = normalize(dirR * max(cap, 0.001) + T * endSign * (1.0 - tt));
    vec3 pv = uV * p;
    vN = uV * nrm;
    vT = uV * T;
    vA = uV * (-sin(al) * nN + cos(al) * bN);
    vRad = uV * n0;
    vAlpha = al;
    vL = L;
    vK = k;
    gl_Position = vec4(pv.x * uScale.x + uOffset.x, pv.y * uScale.y + uOffset.y, -pv.z * 0.25, 1.0);
}`

const FS = `#version 300 es
precision highp float;
in vec3 vN;
in vec3 vT;
in vec3 vA;
in vec3 vRad;
in float vAlpha;
in float vL;
in float vK;
uniform vec3 uCG;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uC4;
uniform vec3 uLight;
uniform float uStrands;
uniform float uStrandTan;
uniform float uRidge;
uniform float uBlurB;
uniform float uR;
uniform float uSpec;
uniform float uShin;
uniform float uAmb;
uniform float uDiff;
uniform float uGroove;
uniform float uBack;
uniform float uGlobal;
out vec4 outColor;
const float TAU = 6.283185307179586;
vec3 ramp(float x) {
    x = clamp(x, 0.0, 1.0);
    if (x < 0.12) return mix(uCG, uC0, x / 0.12);
    if (x < 0.32) return mix(uC0, uC1, (x - 0.12) / 0.2);
    if (x < 0.58) return mix(uC1, uC2, (x - 0.32) / 0.26);
    if (x < 0.8) return mix(uC2, uC3, (x - 0.58) / 0.22);
    return mix(uC3, uC4, (x - 0.8) / 0.2);
}
void main() {
    vec3 g = normalize(vN);
    vec3 T = normalize(vT);
    vec3 A = normalize(vA);
    vec3 rad = normalize(vRad);
    // Strand coordinate: each strand is a rounded bulge between two narrow dark gaps.
    float ph = uStrands * (vAlpha - vL / max(uR, 1e-4) * uStrandTan);
    float fw = fwidth(ph);
    float aa = 1.0 - smoothstep(1.2, 2.6, fw);
    float blur = mix(1.0, uBlurB, vK);
    float amp = uRidge * blur * aa;
    float x = fract(ph / TAU) * 2.0 - 1.0;
    float slope = x / sqrt(max(1.0 - x * x, 0.08));
    vec3 dirS = normalize(A - T * uStrandTan);
    vec3 n = normalize(g - dirS * (slope * amp * 0.55));
    float diff = max(dot(n, uLight), 0.0);
    float wrapAO = mix(1.0 - uGroove, 1.0, smoothstep(-0.15, 0.7, dot(g, rad)));
    float gapW = mix(0.55, 0.72, 1.0 - amp);
    float valley = mix(1.0, 1.0 - smoothstep(gapW, 1.0, abs(x)) * 0.85, amp);
    float glob = uGlobal * dot(rad, uLight);
    float lum = (uAmb + diff * uDiff + glob) * wrapAO * valley;
    float inside = smoothstep(0.15, -0.35, rad.z);
    lum *= mix(1.0, 1.0 - uBack, inside);
    vec3 col = ramp(lum);
    vec3 H = normalize(uLight + vec3(0.0, 0.0, 1.0));
    float sp = pow(max(dot(n, H), 0.0), uShin) * uSpec * wrapAO * valley;
    col = mix(col, uC4, clamp(sp, 0.0, 1.0));
    outColor = vec4(col, 1.0);
}`

const UNIFORMS = [
    "uMA", "uMB", "uV", "uPhaseA", "uPhaseB", "uN", "uTh0", "uR", "uPe", "uW",
    "uLift", "uRadA", "uFlip", "uKnot", "uSegs", "uScale", "uOffset",
    "uCG", "uC0", "uC1", "uC2", "uC3", "uC4", "uLight", "uStrands", "uStrandTan",
    "uRidge", "uBlurB", "uSpec", "uShin", "uAmb", "uDiff", "uGroove", "uBack", "uGlobal",
]

function parseColor(c: unknown, fb: Vec3): Vec3 {
    if (typeof c !== "string") return fb
    let s = c.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.split("").map((x) => x + x).join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
        return fb
    }
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (m) {
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2])) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fb
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))
const num = (x: unknown, fb: number) => (typeof x === "number" && isFinite(x) ? x : fb)
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Vec3): Vec3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1
    return [a[0] / l, a[1] / l, a[2] / l]
}
const neg = (a: Vec3): Vec3 => [-a[0], -a[1], -a[2]]
const fromCols = (x: Vec3, y: Vec3, z: Vec3): Mat3 => [...x, ...y, ...z]
const mulMV = (m: Mat3, v: Vec3): Vec3 => [
    m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
    m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
    m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
]
const mulMM = (a: Mat3, b: Mat3): Mat3 => {
    const o = new Array(9).fill(0)
    for (let c = 0; c < 3; c++)
        for (let r = 0; r < 3; r++) {
            let s = 0
            for (let k = 0; k < 3; k++) s += a[k * 3 + r] * b[c * 3 + k]
            o[c * 3 + r] = s
        }
    return o
}
const rotAxis = (u: Vec3, ang: number): Mat3 => {
    const [x, y, z] = u
    const c = Math.cos(ang)
    const s = Math.sin(ang)
    const t = 1 - c
    return [
        c + x * x * t, y * x * t + z * s, z * x * t - y * s,
        x * y * t - z * s, c + y * y * t, z * y * t + x * s,
        x * z * t + y * s, y * z * t - x * s, c + z * z * t,
    ]
}
const spiralJS = (q: number, ph: number, N: number, th0: number): Vec3 => {
    const th = th0 + (PI - 2 * th0) * clamp(q, 0, 1)
    const az = 2 * N * th + ph
    return [Math.sin(th) * Math.cos(az), Math.cos(th), Math.sin(th) * Math.sin(az)]
}

export interface SphereMadeRopeProps {
    speed?: number
    turns?: number
    ropeThickness?: number
    twist?: number
    ropeColor?: string
    highlightColor?: string
    background?: string
    enableDrag?: boolean
    advanced?: {
        cycleMs?: number
        easing?: number
        ballSize?: number
        ballX?: number
        ballY?: number
        knotX?: number
        knotY?: number
        sweepDir?: number
        axisTilt?: number
        poleGap?: number
        segPerTurn?: number
        tubeSides?: number
        bridgeLen?: number
        lift?: number
        layerGap?: number
        knotBulge?: number
        strandCount?: number
        strandAngle?: number
        ridgeDepth?: number
        spinBlur?: number
        lightAngle?: number
        lightElevation?: number
        ambient?: number
        diffuse?: number
        ballShade?: number
        specular?: number
        shininess?: number
        grooveDark?: number
        interiorDim?: number
        grooveColor?: string
        valleyColor?: string
        shadowColor?: string
        topColor?: string
        bgCorner?: string
    }
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function SphereMadeRope(props: SphereMadeRopeProps) {
    const {
        speed = 50,
        turns = 15,
        ropeThickness = 95,
        twist = 50,
        ropeColor = "#00A351",
        highlightColor = "#A3FCE7",
        background = "#000000",
        enableDrag = true,
        style,
    } = props
    const adv = { ...ADVANCED_DEFAULTS, ...(props.advanced ?? {}) }

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const live = useRef<any>(null)
    live.current = { speed, turns, ropeThickness, twist, ropeColor, highlightColor, enableDrag, adv }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: true }) as WebGL2RenderingContext | null
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)!
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader compile failed")
            return sh
        }
        const vs = compile(gl.VERTEX_SHADER, VS)
        const fs = compile(gl.FRAGMENT_SHADER, FS)
        const prog = gl.createProgram()!
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.bindAttribLocation(prog, 0, "aSA")
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "program link failed")
        const U: Record<string, WebGLUniformLocation> = {}
        for (const name of UNIFORMS) {
            const loc = gl.getUniformLocation(prog, name)
            if (loc === null) throw new Error(`Missing uniform ${name}`)
            U[name] = loc
        }

        const vao = gl.createVertexArray()!
        const vbo = gl.createBuffer()!
        const ibo = gl.createBuffer()!
        let meshSegs = 0
        let meshSides = 0
        let indexCount = 0
        const buildMesh = (segs: number, sides: number) => {
            const verts = new Float32Array((segs + 1) * (sides + 1) * 2)
            let o = 0
            for (let i = 0; i <= segs; i++)
                for (let j = 0; j <= sides; j++) {
                    verts[o++] = i / segs
                    verts[o++] = (j / sides) * PI * 2
                }
            const idx = new Uint32Array(segs * sides * 6)
            let k = 0
            for (let i = 0; i < segs; i++)
                for (let j = 0; j < sides; j++) {
                    const a = i * (sides + 1) + j
                    const b = a + sides + 1
                    idx[k++] = a
                    idx[k++] = b
                    idx[k++] = a + 1
                    idx[k++] = a + 1
                    idx[k++] = b
                    idx[k++] = b + 1
                }
            gl.bindVertexArray(vao)
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
            gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW)
            gl.bindVertexArray(null)
            indexCount = idx.length
            meshSegs = segs
            meshSides = sides
        }

        let W = 1
        let H = 1
        const resize = () => {
            W = Math.max(1, root.offsetWidth)
            H = Math.max(1, root.offsetHeight)
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        // Drag-to-rotate: an extra yaw/pitch applied on top of the automatic view rotation.
        let dragging = false
        let dragYaw = 0
        let dragPitch = 0
        let lastPX = 0
        let lastPY = 0
        const onPointerDown = (e: PointerEvent) => {
            if (!live.current.enableDrag) return
            dragging = true
            lastPX = e.clientX
            lastPY = e.clientY
        }
        const onPointerMove = (e: PointerEvent) => {
            if (!dragging) return
            const dx = e.clientX - lastPX
            const dy = e.clientY - lastPY
            lastPX = e.clientX
            lastPY = e.clientY
            dragYaw += dx * 0.008
            dragPitch = clamp(dragPitch + dy * 0.008, -1.4, 1.4)
        }
        const onPointerUp = () => {
            dragging = false
        }
        canvas.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)
        window.addEventListener("pointercancel", onPointerUp)

        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        const rt = RenderTarget.current()
        const frozenTarget = rt === RenderTarget.export || rt === RenderTarget.thumbnail

        // Cycle state. Every cycle starts with winding A's outer pole (the knot) at K0 in view space.
        const st = {
            sig: "",
            prog: 0,
            flip: 0,
            phaseA: 0,
            MA: [1, 0, 0, 0, 1, 0, 0, 0, 1] as Mat3,
            MBb: [1, 0, 0, 0, 1, 0, 0, 0, 1] as Mat3,
            Q: [1, 0, 0, 0, 1, 0, 0, 0, 1] as Mat3,
            u: [0, 0, 1] as Vec3,
            tau: PI / 2,
        }
        const resetState = (a: typeof ADVANCED_DEFAULTS, sig: string) => {
            let kx = num(a.knotX, -25) / 100
            let ky = num(a.knotY, 74) / 100
            const r2 = kx * kx + ky * ky
            if (r2 > 0.96) {
                const f = Math.sqrt(0.96 / r2)
                kx *= f
                ky *= f
            }
            const K0 = norm([kx, ky, Math.sqrt(Math.max(0, 1 - kx * kx - ky * ky))])
            const sd = (num(a.sweepDir, 30) * PI) / 180
            let d: Vec3 = [Math.cos(sd), Math.sin(sd), 0]
            const kd = dot(d, K0)
            d = norm([d[0] - K0[0] * kd, d[1] - K0[1] * kd, d[2] - K0[2] * kd])
            const u = norm(cross(K0, d))
            const tau = (clamp(num(a.axisTilt, 90), 10, 170) * PI) / 180
            const dB = mulMV(rotAxis(u, tau), K0)
            st.u = u
            st.tau = tau
            st.MBb = fromCols(u, dB, cross(u, dB))
            st.Q = rotAxis(u, PI - tau)
            st.MA = fromCols(u, neg(K0), cross(u, neg(K0)))
            st.phaseA = 0
            st.flip = 0
            st.prog = 0
            st.sig = sig
        }
        const easeP = (p: number, e: number) => p + (0.5 - 0.5 * Math.cos(PI * p) - p) * e
        const trackPhase = (pe: number, N: number, th0: number) => {
            const shed = mulMV(st.MA, spiralJS(1 - pe, st.phaseA, N, th0))
            const m = st.MBb
            const lx = m[0] * shed[0] + m[1] * shed[1] + m[2] * shed[2]
            const lz = m[6] * shed[0] + m[7] * shed[1] + m[8] * shed[2]
            const psi = Math.atan2(lz, lx)
            const th = th0 + (PI - 2 * th0) * clamp(pe, 0, 1)
            return psi - 2 * N * th
        }

        let raf = 0
        let last = -1
        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            const Lv = live.current
            const a = Lv.adv as typeof ADVANCED_DEFAULTS
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now

            const N = clamp(Math.round(num(Lv.turns, 18)), 3, 80)
            const sides = clamp(Math.round(num(a.tubeSides, 14)), 4, 32)
            const segs = clamp(Math.round(N * num(a.segPerTurn, 110)), 200, 16000)
            if (segs !== meshSegs || sides !== meshSides) buildMesh(segs, sides)

            const sig = [a.knotX, a.knotY, a.sweepDir, a.axisTilt].join("|")
            if (sig !== st.sig) resetState(a, sig)

            const th0 = (clamp(num(a.poleGap, 50), 0, 100) / 100) * (PI / N)
            const r = (PI / (2 * N)) * (clamp(num(Lv.ropeThickness, 100), 10, 300) / 100)
            const w = Math.max(0.002, num(a.bridgeLen, 4) / 200)
            const e = clamp(num(a.easing, 70), 0, 100) / 100
            const reduced = !!(mq && mq.matches)
            const frozen = frozenTarget || reduced
            const cycleSec = Math.max(500, num(a.cycleMs, 9000)) / 1000
            const rate = frozen ? 0 : Math.max(0, num(Lv.speed, 50)) / 50 / cycleSec

            if (frozen) {
                st.prog = 0
            } else {
                st.prog += dt * rate
                while (st.prog >= 1) {
                    st.phaseA = trackPhase(1 + w, N, th0)
                    st.MA = mulMM(st.Q, st.MBb)
                    st.flip = 1 - st.flip
                    st.prog -= 1
                }
            }

            const pE = easeP(st.prog, e)
            const pe = -w + (1 + 2 * w) * pE
            const phaseB = trackPhase(pe, N, th0)
            const V = rotAxis(st.u, pE * (PI - st.tau))
            const Vd = mulMM(mulMM(rotAxis([0, 1, 0], dragYaw), rotAxis([1, 0, 0], dragPitch)), V)
            canvas.style.pointerEvents = Lv.enableDrag ? "auto" : "none"
            canvas.style.cursor = Lv.enableDrag ? (dragging ? "grabbing" : "grab") : "default"
            const dpE = 1 - e + e * 0.5 * PI * Math.sin(PI * st.prog)
            const spinTurns = ((N * (PI - 2 * th0)) / PI) * (1 + 2 * w) * dpE * rate
            const blurB = 1 / (1 + (num(a.spinBlur, 60) / 100) * 1.4 * spinTurns)
            const gap = (r * num(a.layerGap, 110)) / 100
            const sm = clamp(pE / 0.15, 0, 1)
            const radA = 1 - gap * sm * sm * (3 - 2 * sm)

            const S = clamp(num(a.ballSize, 99), 10, 200) / 100 / (1 + r)
            const mn = Math.min(W, H)
            const la = (num(a.lightAngle, 225) * PI) / 180
            const le = (num(a.lightElevation, 55) * PI) / 180
            const light = norm([Math.cos(le) * Math.cos(la), Math.cos(le) * Math.sin(la), Math.sin(le)])
            const strands = Math.round((num(a.strandCount, 8) * clamp(num(Lv.twist, 50), 0, 100)) / 50)

            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.clearColor(0, 0, 0, 0)
            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LESS)
            gl.disable(gl.CULL_FACE)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.useProgram(prog)
            gl.uniformMatrix3fv(U.uMA, false, st.MA)
            gl.uniformMatrix3fv(U.uMB, false, st.MBb)
            gl.uniformMatrix3fv(U.uV, false, Vd)
            gl.uniform1f(U.uPhaseA, st.phaseA)
            gl.uniform1f(U.uPhaseB, phaseB)
            gl.uniform1f(U.uN, N)
            gl.uniform1f(U.uTh0, th0)
            gl.uniform1f(U.uR, r)
            gl.uniform1f(U.uPe, pe)
            gl.uniform1f(U.uW, w)
            gl.uniform1f(U.uLift, (r * num(a.lift, 60)) / 100)
            gl.uniform1f(U.uRadA, radA)
            gl.uniform1f(U.uFlip, st.flip)
            gl.uniform1f(U.uKnot, num(a.knotBulge, 45) / 100)
            gl.uniform1f(U.uSegs, segs)
            gl.uniform2f(U.uScale, (S * mn) / W, (S * mn) / H)
            gl.uniform2f(U.uOffset, num(a.ballX, 50) / 50 - 1, 1 - num(a.ballY, 50) / 50)
            gl.uniform3fv(U.uCG, parseColor(a.grooveColor, [0.04, 0.004, 0.243]))
            gl.uniform3fv(U.uC0, parseColor(a.valleyColor, [0.086, 0.024, 0.463]))
            gl.uniform3fv(U.uC1, parseColor(a.shadowColor, [0.086, 0.29, 0.847]))
            gl.uniform3fv(U.uC2, parseColor(Lv.ropeColor, [0.278, 0.522, 0.973]))
            gl.uniform3fv(U.uC3, parseColor(a.topColor, [0.431, 0.686, 0.953]))
            gl.uniform3fv(U.uC4, parseColor(Lv.highlightColor, [0.639, 0.894, 0.988]))
            gl.uniform3fv(U.uLight, light)
            gl.uniform1f(U.uStrands, strands)
            gl.uniform1f(U.uStrandTan, Math.tan((clamp(num(a.strandAngle, 45), -80, 80) * PI) / 180))
            gl.uniform1f(U.uRidge, clamp(num(a.ridgeDepth, 90), 0, 100) / 100)
            gl.uniform1f(U.uBlurB, blurB)
            gl.uniform1f(U.uSpec, num(a.specular, 55) / 100)
            gl.uniform1f(U.uShin, Math.max(1, num(a.shininess, 20)))
            gl.uniform1f(U.uAmb, num(a.ambient, 30) / 100)
            gl.uniform1f(U.uDiff, num(a.diffuse, 72) / 100)
            gl.uniform1f(U.uGroove, clamp(num(a.grooveDark, 70), 0, 100) / 100)
            gl.uniform1f(U.uBack, clamp(num(a.interiorDim, 45), 0, 100) / 100)
            gl.uniform1f(U.uGlobal, num(a.ballShade, 15) / 100)
            gl.bindVertexArray(vao)
            gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0)
            gl.bindVertexArray(null)
        }
        raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", onPointerUp)
            window.removeEventListener("pointercancel", onPointerUp)
            gl.deleteBuffer(vbo)
            gl.deleteBuffer(ibo)
            gl.deleteVertexArray(vao)
            gl.deleteProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                ...style,
                overflow: "hidden",
                background,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", pointerEvents: enableDrag ? "auto" : "none", touchAction: "none" }}
            />
        </div>
    )
}
