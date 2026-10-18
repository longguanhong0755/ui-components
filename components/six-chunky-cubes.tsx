"use client"

import type { CSSProperties } from "react"
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
    cubeSize: 20,
    bevel: 6,
    gap: 40,
    centerX: 48,
    centerY: 55,
    gatherMs: 2800,
    holdMs: 1150,
    disperseMs: 2050,
    returnMs: 1500,
    clusterTension: 35,
    holdShift: 50,
    wobble: 6,
    hueShift: 40,
    dotCount: 40,
    dotSize: 38,
    dotStrength: 40,
    rimStrength: 110,
    rimRainbow: 35,
    faceContrast: 75,
    ao: 50,
    exposure: 115,
    blueColor: "#3A48E0",
    magentaColor: "#D040FF",
    metalColor: "#3A3F3C",
    lilacColor: "#F0B0F0",
    pearlColor: "#F1D3E6",
    amberColor: "#F0A030",
    greenColor: "#1FB070",
    renderScale: 100,
    grain: 0,
    vignette: 0,
}

type V3 = [number, number, number]
type Q = [number, number, number, number]

// Six cubes. lat = place in the interlocked cluster (view space, iso lattice).
// k0 = scattered ring (x%, y% of the reference frame, z), k3 = diagonal scatter.
// f31 = where the held cluster drifts to (frame 31). e* = orientations in degrees.
const CUBES: {
    lat: V3
    k0: V3
    e0: V3
    f31: [number, number]
    e2: V3
    k3: V3
    e3: V3
    axis: V3
}[] = [
    { lat: [-0.7071, 0.4082, 0.2887], k0: [30, 26, 0.15], e0: [-20, 35, -25], f31: [33, 39], e2: [10, -8, 4], k3: [25, 36, 0.1], e3: [4, -6, -4], axis: [0.3, 1, 0.2] },
    { lat: [0, 0.8165, -0.2887], k0: [52, 23, -0.2], e0: [40, -20, 15], f31: [62, 33], e2: [-8, 14, -6], k3: [67, 36, -0.1], e3: [-28, 30, 40], axis: [1, 0.2, 0.4] },
    { lat: [0.7071, 0.4082, 0.2887], k0: [78, 55, 0.1], e0: [-35, -50, 30], f31: [61, 56], e2: [12, 10, 5], k3: [53, 50, 0.25], e3: [30, 35, 42], axis: [0.2, 0.5, 1] },
    { lat: [-0.7071, -0.4082, -0.2887], k0: [15, 57, -0.1], e0: [25, 40, -35], f31: [27, 57], e2: [-10, -12, -4], k3: [43, 62, -0.25], e3: [-25, -35, 48], axis: [0.8, 0.6, 0.1] },
    { lat: [0, -0.8165, 0.2887], k0: [40, 78, 0.2], e0: [8, -10, 8], f31: [33, 73], e2: [8, -14, 6], k3: [25, 77, 0.05], e3: [28, -32, 45], axis: [0.1, 0.9, 0.5] },
    { lat: [0.7071, -0.4082, -0.2887], k0: [58, 76, -0.15], e0: [45, 30, -20], f31: [62, 77], e2: [-12, 9, -5], k3: [67, 77, 0], e3: [-5, 6, 3], axis: [0.6, 0.3, 0.8] },
]

function qAxis(ax: V3, deg: number): Q {
    const l = Math.hypot(ax[0], ax[1], ax[2]) || 1
    const h = (deg * Math.PI) / 360
    const s = Math.sin(h) / l
    return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(h)]
}
function qMul(a: Q, b: Q): Q {
    return [
        a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
        a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
        a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
        a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
    ]
}
function qEuler(e: V3): Q {
    return qMul(qAxis([0, 0, 1], e[2]), qMul(qAxis([0, 1, 0], e[1]), qAxis([1, 0, 0], e[0])))
}
function qSlerp(a: Q, b0: Q, t: number): Q {
    let b = b0
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
    if (d < 0) {
        b = [-b[0], -b[1], -b[2], -b[3]]
        d = -d
    }
    let wa: number
    let wb: number
    if (d > 0.9995) {
        wa = 1 - t
        wb = t
    } else {
        const th = Math.acos(Math.min(1, d))
        const s = Math.sin(th)
        wa = Math.sin((1 - t) * th) / s
        wb = Math.sin(t * th) / s
    }
    const r: Q = [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb, a[3] * wa + b[3] * wb]
    const l = Math.hypot(r[0], r[1], r[2], r[3]) || 1
    return [r[0] / l, r[1] / l, r[2] / l, r[3] / l]
}
// Column-major mat3 (local → view) for GLSL.
function qMat(q: Q, out: Float32Array, o: number) {
    const [x, y, z, w] = q
    out[o + 0] = 1 - 2 * (y * y + z * z)
    out[o + 1] = 2 * (x * y + z * w)
    out[o + 2] = 2 * (x * z - y * w)
    out[o + 3] = 2 * (x * y - z * w)
    out[o + 4] = 1 - 2 * (x * x + z * z)
    out[o + 5] = 2 * (y * z + x * w)
    out[o + 6] = 2 * (x * z + y * w)
    out[o + 7] = 2 * (y * z - x * w)
    out[o + 8] = 1 - 2 * (x * x + y * y)
}

// One corner of each cube towards the camera, a vertical edge up the middle.
const Q_ISO: Q = qMul(qAxis([1, 0, 0], 35.264), qAxis([0, 1, 0], -45))

function parseColor(c: any, fb: V3): V3 {
    if (typeof c !== "string") return fb
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
            if (!isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
        return fb
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1]
            .split(/[\s,\/]+/)
            .filter(Boolean)
            .map(parseFloat)
        if (p.length >= 3 && isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2]))
            return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fb
}

const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec3 uPos[6];
uniform mat3 uRot[6];
uniform float uH;
uniform float uR;
uniform float uIri;
uniform float uHue;
uniform float uDots;
uniform float uDotR;
uniform float uDotStr;
uniform float uRim;
uniform float uRimSat;
uniform float uContrast;
uniform float uAO;
uniform float uExposure;
uniform float uTime;
uniform float uGrain;
uniform float uVig;
uniform vec3 uBg;
uniform vec3 uBlue;
uniform vec3 uMagenta;
uniform vec3 uMetal;
uniform vec3 uLilac;
uniform vec3 uPearl;
uniform vec3 uAmber;
uniform vec3 uGreen;
out vec4 outColor;

bool act[6];

float sdRB(vec3 p){
    vec3 q = abs(p) - vec3(uH - uR);
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - uR;
}
float mapId(vec3 p, out int id){
    float d = 1e5; id = 0;
    for (int i = 0; i < 6; i++){
        if (!act[i]) continue;
        float di = sdRB((p - uPos[i]) * uRot[i]);
        if (di < d){ d = di; id = i; }
    }
    return d;
}
float map(vec3 p){ int id; return mapId(p, id); }

// Matcap around the screen-space normal direction (turns, 0 = facing right).
vec3 matcap(float a){
    vec3 c = uBlue;
    c = mix(c, uMagenta, smoothstep(0.0, 0.11, a));
    c = mix(c, uMetal, smoothstep(0.12, 0.22, a));
    c = mix(c, uMetal * 0.6, smoothstep(0.28, 0.38, a));
    c = mix(c, uLilac, smoothstep(0.38, 0.5, a));
    c = mix(c, uPearl, smoothstep(0.5, 0.57, a));
    c = mix(c, uAmber, smoothstep(0.63, 0.72, a));
    c = mix(c, uGreen, smoothstep(0.74, 0.81, a));
    c = mix(c, uBlue, smoothstep(0.84, 0.92, a));
    return c;
}

vec3 shade(vec3 p, int id, float px){
    vec3 c = uPos[id];
    mat3 R = uRot[id];
    vec3 lp = (p - c) * R;
    vec3 q = abs(lp) - vec3(uH - uR);
    vec3 ln;
    vec3 alp = abs(lp);
    if (max(q.x, max(q.y, q.z)) > 0.0) {
        ln = sign(lp) * max(q, 0.0);
    } else {
        ln = (alp.x > alp.y && alp.x > alp.z) ? vec3(sign(lp.x), 0.0, 0.0)
           : ((alp.y > alp.z) ? vec3(0.0, sign(lp.y), 0.0) : vec3(0.0, 0.0, sign(lp.z)));
    }
    ln = normalize(ln);
    vec3 n = R * ln;
    vec3 al = abs(ln);
    float flatness = max(al.x, max(al.y, al.z));
    float bevelW = 1.0 - smoothstep(0.86, 0.995, flatness);
    float rimLine = 1.0 - smoothstep(0.70, 0.79, flatness);
    vec2 fuv = (alp.x > alp.y && alp.x > alp.z) ? lp.yz : ((alp.y > alp.z) ? lp.xz : lp.xy);

    float k = length(n.xy);
    vec2 nd = k > 1e-4 ? n.xy / k : vec2(0.0);
    float ang = atan(n.y, n.x) / 6.2831853;
    ang += uHue * (p.y * 0.35 + p.x * 0.12) + float(id) * 0.015;
    ang = fract(ang);
    vec3 irid = matcap(ang) * 1.2;
    float g = dot(irid, vec3(0.3, 0.55, 0.15));
    vec3 base = mix(vec3(g) * 0.5 + uMetal * 0.35, irid, uIri);

    // Face facing the camera reads black; light grows towards the face's outer edge.
    float lum = smoothstep(0.1, 0.85, k);
    float tpos = dot(p.xy - c.xy, nd) / (uH * 1.25);
    float grad = mix(1.0 - uContrast * 0.85, 1.0 + uContrast * 0.4, smoothstep(-0.25, 0.95, tpos));
    vec3 col = base * lum * grad;
    col = max(col, uMetal * 0.18 * lum);

    // Perforated dot grid: clear on the dark faces, faint on the lit ones.
    vec2 g2 = fuv / (2.0 * uH) * uDots;
    float dd = length(fract(g2) - 0.5);
    float aa = px * uDots / (2.0 * uH) * 0.75 + 0.02;
    float hole = 1.0 - smoothstep(uDotR - aa, uDotR + aa, dd);
    float luma = dot(col, vec3(0.3, 0.55, 0.15));
    col *= 1.0 - uDotStr * hole * (1.0 - bevelW) * mix(1.0, 0.3, smoothstep(0.25, 0.9, luma));

    // Thin bright rim down the middle of each bevel, pearl with a rainbow fringe.
    float s = dot(lp, vec3(1.3, 1.9, 2.4)) / uH * 0.35 + uTime * 0.05 + float(id) * 0.17;
    vec3 rb = 0.5 + 0.5 * cos(6.2831853 * (s + vec3(0.0, 0.33, 0.67)));
    vec3 rimCol = mix(uPearl * 1.1, rb * 1.2 + 0.15, uRimSat);
    col = mix(col, col * 1.15 + rimCol * 0.12 * k, bevelW);
    col = mix(col, rimCol * uRim * (0.3 + 0.9 * k), rimLine);

    float o = map(p + n * 0.06);
    float occ = clamp(o / 0.06, 0.0, 1.0);
    col *= mix(1.0, 0.4 + 0.6 * occ, uAO);
    return col * uExposure;
}

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main(){
    float m = max(min(uRes.x, uRes.y), 1.0);
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * m);
    float px = 2.0 / m;
    float Rb = uH * 1.7321 + 2.0 * px;
    bool anyHit = false;
    float zTop = -1e5;
    float zBot = 1e5;
    for (int i = 0; i < 6; i++){
        vec2 dv = uv - uPos[i].xy;
        float d2 = dot(dv, dv);
        act[i] = d2 < Rb * Rb;
        if (act[i]){
            anyHit = true;
            float hz = sqrt(max(Rb * Rb - d2, 0.0));
            zTop = max(zTop, uPos[i].z + hz);
            zBot = min(zBot, uPos[i].z - hz);
        }
    }
    vec3 col = uBg;
    if (anyHit){
        float z = zTop;
        float minD = 1e5;
        vec3 pMin = vec3(uv, z);
        int idMin = 0;
        int id = 0;
        bool hit = false;
        vec3 p = vec3(uv, z);
        for (int st = 0; st < 72; st++){
            p = vec3(uv, z);
            float d = mapId(p, id);
            if (d < minD){ minD = d; pMin = p; idMin = id; }
            if (d < 0.0004){ hit = true; break; }
            z -= d;
            if (z < zBot) break;
        }
        if (hit) col = shade(p, id, px);
        else if (minD < 1.5 * px) col = mix(uBg, shade(pMin, idMin, px), 1.0 - smoothstep(0.0, 1.5 * px, minD));
    }
    vec2 vn = (gl_FragCoord.xy / uRes - 0.5) * 2.0;
    col *= 1.0 - uVig * smoothstep(0.35, 1.45, length(vn));
    col += (hash(gl_FragCoord.xy + fract(uTime * 7.13) * 100.0) - 0.5) * uGrain * 0.25;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const UNIFORMS = [
    "uRes", "uPos", "uRot", "uH", "uR", "uIri", "uHue", "uDots", "uDotR", "uDotStr", "uRim", "uRimSat",
    "uContrast", "uAO", "uExposure", "uTime", "uGrain", "uVig", "uBg", "uBlue", "uMagenta", "uMetal", "uLilac",
    "uPearl", "uAmber", "uGreen",
]

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)
    if (!sh) throw new Error("Could not create shader")
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh)
        gl.deleteShader(sh)
        throw new Error("Shader compile failed: " + log)
    }
    return sh
}

function hermite(p0: number, p1: number, m0: number, m1: number, T: number, u: number) {
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * T * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * T * m1
}

export interface SixChunkyCubesProps {
    speed?: number
    scale?: number
    spread?: number
    tumble?: number
    iridescence?: number
    background?: string
    animation?: boolean
    hoverSpeed?: number
    advanced?: {
        cubeSize?: number
        bevel?: number
        gap?: number
        centerX?: number
        centerY?: number
        gatherMs?: number
        holdMs?: number
        disperseMs?: number
        returnMs?: number
        clusterTension?: number
        holdShift?: number
        wobble?: number
        hueShift?: number
        dotCount?: number
        dotSize?: number
        dotStrength?: number
        rimStrength?: number
        rimRainbow?: number
        faceContrast?: number
        ao?: number
        exposure?: number
        blueColor?: string
        magentaColor?: string
        metalColor?: string
        lilacColor?: string
        pearlColor?: string
        amberColor?: string
        greenColor?: string
        renderScale?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * Six iridescent bevelled cubes gather into an interlocked isometric cluster, hold, and fly apart.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function SixChunkyCubes(props: SixChunkyCubesProps) {
    const {
        speed = 50,
        scale = 80,
        spread = 60,
        tumble = 50,
        iridescence = 100,
        background = "#000000",
        animation = true,
        hoverSpeed = 150,
        style,
    } = props

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rootRef = useRef<HTMLDivElement>(null)
    const propsRef = useRef<any>(props)
    const hoverRef = useRef(false)
    propsRef.current = props

    useEffect(() => {
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return
        const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: true })
        if (!gl) return

        const vs = compile(gl, gl.VERTEX_SHADER, VERT)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()
        if (!prog) throw new Error("Could not create program")
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("Link failed: " + gl.getProgramInfoLog(prog))
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const aPos = gl.getAttribLocation(prog, "aPos")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        const loc: Record<string, WebGLUniformLocation> = {}
        for (const n of UNIFORMS) {
            const l = gl.getUniformLocation(prog, n)
            if (l === null) throw new Error("Missing uniform " + n)
            loc[n] = l
        }

        let w = 1
        let h = 1
        const resize = () => {
            const a = { ...ADVANCED_DEFAULTS, ...(propsRef.current.advanced ?? {}) }
            const dpr = Math.min(window.devicePixelRatio || 1, 2) * Math.max(0.25, a.renderScale / 100)
            w = Math.max(1, Math.round(root.offsetWidth * dpr))
            h = Math.max(1, Math.round(root.offsetHeight * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const target = RenderTarget.current()
        const reduced =
            (typeof window !== "undefined" &&
                window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
            target === RenderTarget.thumbnail ||
            target === RenderTarget.export

        const pos = new Float32Array(18)
        const rot = new Float32Array(54)
        let clock = 0
        let last = -1
        let raf = 0
        let lastScale = -1

        const frame = (now: number) => {
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            if (adv.renderScale !== lastScale) {
                lastScale = adv.renderScale
                resize()
            }
            const rawDt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const dt = p.animation === false ? 0 : rawDt
            const hoverMul = hoverRef.current ? Math.max(0, (p.hoverSpeed ?? 150) / 100) : 1
            const rate = Math.max(0, (p.speed ?? 50) / 50) * hoverMul

            const T = [
                Math.max(0.1, adv.gatherMs / 1000),
                Math.max(0.1, adv.holdMs / 1000),
                Math.max(0.1, adv.disperseMs / 1000),
                Math.max(0.1, adv.returnMs / 1000),
            ]
            const total = T[0] + T[1] + T[2] + T[3]
            if (reduced) clock = T[0] + T[1] * 0.7
            else clock = (clock + dt * rate) % total

            let seg = 0
            let local = clock
            while (seg < 3 && local >= T[seg]) {
                local -= T[seg]
                seg++
            }
            const u = Math.min(1, Math.max(0, local / T[seg]))

            const sc = (p.scale ?? 100) / 100
            const h0 = adv.cubeSize / 100
            const D = 2 * h0 * (1 + adv.gap / 100)
            const spreadF = 0.4 + (p.spread ?? 60) / 100
            const tumbleF = Math.max(0, (p.tumble ?? 50) / 50)
            const hs = adv.holdShift / 100
            const tens = [1, adv.clusterTension / 100, adv.clusterTension / 100, 1]
            const cx = (adv.centerX - 50) / 50
            const cy = (50 - adv.centerY) / 50
            const rel = (v: V3 | [number, number]): V3 => [(v[0] - 48) / 50, (55 - v[1]) / 50, (v as V3)[2] ?? 0]
            const rotEase = seg === 0 ? 1 - (1 - u) * (1 - u) : seg === 2 ? u * u : u

            for (let i = 0; i < 6; i++) {
                const c = CUBES[i]
                const k0 = rel(c.k0).map((x) => x * spreadF) as V3
                const k1: V3 = [c.lat[0] * D, c.lat[1] * D, c.lat[2] * D]
                const f = rel(c.f31)
                const k2: V3 = [k1[0] + (f[0] - k1[0]) * hs, k1[1] + (f[1] - k1[1]) * hs, k1[2]]
                const k3 = rel(c.k3).map((x) => x * spreadF) as V3
                const K = [k0, k1, k2, k3]
                const out: V3 = [0, 0, 0]
                for (let a = 0; a < 3; a++) {
                    const P = (j: number) => K[(j + 4) % 4][a]
                    const Tt = (j: number) => T[(j + 4) % 4]
                    const m = (j: number) =>
                        ((P(j + 1) - P(j - 1)) / (Tt(j - 1) + Tt(j))) * tens[(j + 4) % 4]
                    out[a] = hermite(P(seg), P(seg + 1), m(seg), m(seg + 1), T[seg], u)
                }
                pos[i * 3 + 0] = cx + out[0] * sc
                pos[i * 3 + 1] = cy + out[1] * sc
                pos[i * 3 + 2] = out[2] * sc

                const Qk: Q[] = [
                    qSlerp(Q_ISO, qEuler(c.e0), tumbleF),
                    Q_ISO,
                    qSlerp(Q_ISO, qMul(qEuler(c.e2), Q_ISO), tumbleF),
                    qSlerp(Q_ISO, qEuler(c.e3), tumbleF),
                ]
                let q = qSlerp(Qk[seg], Qk[(seg + 1) % 4], rotEase)
                const wob = adv.wobble * tumbleF * Math.sin((clock / total) * Math.PI * 4 + i * 1.3)
                q = qMul(qAxis(c.axis, wob), q)
                qMat(q, rot, i * 9)
            }

            const hh = h0 * sc
            gl.viewport(0, 0, w, h)
            gl.uniform2f(loc.uRes, w, h)
            gl.uniform3fv(loc.uPos, pos)
            gl.uniformMatrix3fv(loc.uRot, false, rot)
            gl.uniform1f(loc.uH, hh)
            gl.uniform1f(loc.uR, Math.min(hh * 0.9, hh * 2 * (adv.bevel / 100)))
            gl.uniform1f(loc.uIri, Math.min(1, Math.max(0, (p.iridescence ?? 70) / 100)))
            gl.uniform1f(loc.uHue, adv.hueShift / 100)
            gl.uniform1f(loc.uDots, Math.max(1, adv.dotCount))
            gl.uniform1f(loc.uDotR, (adv.dotSize / 100) * 0.5)
            gl.uniform1f(loc.uDotStr, adv.dotStrength / 100)
            gl.uniform1f(loc.uRim, adv.rimStrength / 100)
            gl.uniform1f(loc.uRimSat, adv.rimRainbow / 100)
            gl.uniform1f(loc.uContrast, adv.faceContrast / 100)
            gl.uniform1f(loc.uAO, adv.ao / 100)
            gl.uniform1f(loc.uExposure, adv.exposure / 100)
            gl.uniform1f(loc.uTime, clock)
            gl.uniform1f(loc.uGrain, adv.grain / 100)
            gl.uniform1f(loc.uVig, adv.vignette / 100)
            gl.uniform3fv(loc.uBg, parseColor(p.background ?? "#000000", [0, 0, 0]))
            gl.uniform3fv(loc.uBlue, parseColor(adv.blueColor, [0.227, 0.282, 0.878]))
            gl.uniform3fv(loc.uMagenta, parseColor(adv.magentaColor, [0.816, 0.251, 1]))
            gl.uniform3fv(loc.uMetal, parseColor(adv.metalColor, [0.227, 0.247, 0.235]))
            gl.uniform3fv(loc.uLilac, parseColor(adv.lilacColor, [0.94, 0.69, 0.94]))
            gl.uniform3fv(loc.uPearl, parseColor(adv.pearlColor, [0.945, 0.827, 0.902]))
            gl.uniform3fv(loc.uAmber, parseColor(adv.amberColor, [0.94, 0.627, 0.188]))
            gl.uniform3fv(loc.uGreen, parseColor(adv.greenColor, [0.122, 0.69, 0.439]))
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            gl.deleteBuffer(buf)
            gl.deleteProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            onPointerEnter={() => {
                hoverRef.current = true
            }}
            onPointerLeave={() => {
                hoverRef.current = false
            }}
            style={{
                minWidth: 1200,
                minHeight: 800,
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
