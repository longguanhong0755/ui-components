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
    spinRate: 50,
    startAngle: 0,
    cellSize: 45,
    cellVariance: 9,
    jitter: 0,
    seed: 529,
    offsetY: 3,
    perspective: 600,
    filmBlue: "#3A46D8",
    filmMagenta: "#A41E62",
    filmPeach: "#F09080",
    rimColor: "#F5B0A0",
    seamColor: "#C15F5B",
    filmScale: 188,
    filmCoverage: 78,
    rimStrength: 109,
    seamWidth: 1,
    refraction: 100,
    interiorDark: 33,
    bubbleMin: 4,
    bubbleMax: 8,
    bubbleClump: 7,
    specular: 47,
    glow: 12,
    exposure: 100,
    resolution: 100,
    grain: 100,
    vignette: 0,
}

const VERT = `#version 300 es
void main(){
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uRes;
uniform float uTime;
uniform mat3 uM;
uniform vec4 uCells[32];
uniform int uCount;
uniform int uBubbles;
uniform float uScale;
uniform float uOffsetY;
uniform float uCamDist;
uniform float uBound;
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uFilmA;
uniform vec3 uFilmB;
uniform vec3 uFilmC;
uniform vec3 uRimC;
uniform vec3 uSeamC;
uniform float uIri;
uniform float uFilmFreq;
uniform float uCover;
uniform float uRimStr;
uniform float uSeamW;
uniform float uRefract;
uniform float uDark;
uniform float uBubMin;
uniform float uBubMax;
uniform float uClump;
uniform float uSpec;
uniform float uGlow;
uniform float uExposure;
uniform float uGrain;
uniform float uVig;
uniform float uSeed;

float h1(vec3 p){
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
vec3 h3(float n){
    return fract(sin(vec3(n, n + 1.3, n + 2.7)) * vec3(43758.5453, 22578.1459, 19642.3490));
}
float vnoise(vec3 x){
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(h1(i), h1(i + vec3(1,0,0)), f.x), mix(h1(i + vec3(0,1,0)), h1(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(h1(i + vec3(0,0,1)), h1(i + vec3(1,0,1)), f.x), mix(h1(i + vec3(0,1,1)), h1(i + vec3(1,1,1)), f.x), f.y),
        f.z);
}
float fbm(vec3 p){
    float s = 0.5 * vnoise(p);
    s += 0.25 * vnoise(p * 2.03 + vec3(1.7, 9.2, 3.1));
    return s / 0.75;
}

// thin-film palette: indigo -> violet -> magenta -> red -> peach -> thin gold -> thin teal -> indigo
vec3 pal(float x){
    x = fract(x);
    vec3 c1 = vec3(0.455, 0.098, 0.502);
    vec3 c3 = vec3(0.816, 0.188, 0.290);
    vec3 c5 = vec3(0.941, 0.784, 0.470);
    vec3 c6 = vec3(0.251, 0.784, 0.753);
    if (x < 0.22) return mix(uFilmA, c1, smoothstep(0.0, 0.22, x));
    if (x < 0.42) return mix(c1, uFilmB, smoothstep(0.22, 0.42, x));
    if (x < 0.56) return mix(uFilmB, c3, smoothstep(0.42, 0.56, x));
    if (x < 0.74) return mix(c3, uFilmC, smoothstep(0.56, 0.74, x));
    if (x < 0.84) return mix(uFilmC, c5, smoothstep(0.74, 0.84, x));
    if (x < 0.90) return mix(c5, c6, smoothstep(0.84, 0.90, x));
    return mix(c6, uFilmA, smoothstep(0.90, 1.0, x));
}

// camera-fixed studio environment: broad curved colour bands with dark gaps
vec3 env(vec3 d, float warp){
    float a = d.y * 1.4 + d.x * 0.45 + warp;
    vec3 c = pal(a * 0.55 * uIri + 0.15);
    float s = 0.5 + 0.5 * sin(a * 4.2 + d.z * 1.5);
    float lum = 0.18 + 1.0 * pow(s, 1.6);
    return c * lum;
}

void main(){
    vec2 frag = gl_FragCoord.xy;
    float ms = max(min(uRes.x, uRes.y), 1.0);
    vec2 ctr = 0.5 * uRes - vec2(0.0, uOffsetY * uRes.y);
    float sc = max(uScale, 0.01);
    vec2 p = (frag - ctr) / (0.5 * ms) / sc;

    float D = max(uCamDist, 1.5);
    float f = 0.8 * sqrt(D * D - 1.0);
    vec3 rdW = normalize(vec3(p, -f));
    vec3 ro = uM * vec3(0.0, 0.0, D);
    vec3 rd = uM * rdW;
    vec3 Lw = normalize(vec3(-0.45, 0.65, 0.62));
    vec3 L = uM * Lw;
    float pxW = 2.0 / (ms * sc) * D / f;

    vec3 col = uBg;

    float bb = dot(ro, rd);
    float bh = bb * bb - (dot(ro, ro) - uBound * uBound);
    if (bh > 0.0){
        float tHit = 1e9;
        int hitId = -1;
        vec3 hc = vec3(0.0);
        float hr = 1.0;
        float edge = 1e9;
        for (int i = 0; i < 32; i++){
            if (i >= uCount) break;
            vec4 c = uCells[i];
            vec3 oc = ro - c.xyz;
            float b = dot(oc, rd);
            float o2 = dot(oc, oc);
            float perp = sqrt(max(o2 - b * b, 0.0)) - c.w;
            edge = min(edge, perp);
            float h = b * b - (o2 - c.w * c.w);
            if (h > 0.0){
                float t = -b - sqrt(h);
                if (t > 0.0 && t < tHit){ tHit = t; hitId = i; hc = c.xyz; hr = c.w; }
            }
        }

        float glowW = max(uGlow * pxW, 1e-5);
        float cover = clamp(0.5 - edge / pxW, 0.0, 1.0);

        if (hitId < 0){
            float e = max(edge, 0.0);
            col += uRimC * exp(-e / glowW) * 0.18;
            col = mix(col, uRimC * 0.7, cover);
        } else {
            vec3 P = ro + rd * tHit;
            vec3 n = normalize(P - hc);
            float ndv = clamp(dot(n, -rd), 0.0, 1.0);
            vec3 lp = (P - hc) / hr;
            float cs = float(hitId) * 7.31 + uSeed;
            vec3 nW = n * uM;

            float nz = fbm(lp * uFilmFreq + vec3(cs, cs * 0.7, cs * 1.3));
            float n2 = vnoise(lp * uFilmFreq * 0.6 + vec3(11.3 + cs));
            float warp = (nz - 0.5) * 1.6 * uIri + fract(cs * 0.37) * 0.8;
            float fres = pow(1.0 - ndv, 2.0);

            vec3 reflW = reflect(rdW, nW);
            vec3 reflC = env(reflW, warp + (1.0 - ndv) * 0.6);
            vec3 rrW = refract(rdW, nW, 0.8);
            vec3 back = env(rrW, warp * 0.7 + 1.3) * 0.45;
            float darkM = smoothstep(0.35, 0.7, n2);
            vec3 interior = mix(uBase * 0.6 + back * uRefract, uBase * 0.15, darkM * uDark);

            float w = clamp(uCover + (1.0 - uCover) * fres, 0.0, 1.0);
            vec3 cc = mix(interior, reflC, w);
            cc += uRimC * pow(1.0 - ndv, 4.0) * uRimStr;
            float sp = pow(max(dot(reflW, Lw), 0.0), 14.0) * (0.5 + nz);
            cc += vec3(1.0, 0.86, 0.8) * sp * uSpec;

            // seams: where this cell meets its neighbours
            float md = 1e9;
            for (int j = 0; j < 32; j++){
                if (j >= uCount) break;
                if (j == hitId) continue;
                vec4 cj = uCells[j];
                md = min(md, length(P - cj.xyz) - cj.w);
            }
            md = max(md, 0.0);
            float sw = max(uSeamW * pxW, 1e-5);
            float seam = exp(-pow(md / sw, 2.0));
            float core = exp(-pow(md / (sw * 0.3), 2.0));
            cc = mix(cc, uSeamC, seam * 0.85);
            cc += mix(uSeamC, vec3(1.0, 0.8, 0.7), 0.5) * core * 0.4;

            // trapped air bubbles, fixed in the cell
            float tb = 1e9;
            vec3 bn = vec3(0.0, 0.0, 1.0);
            float ci = float(hitId) * 31.7 + uSeed * 3.1;
            for (int k = 0; k < 16; k++){
                if (k >= uBubbles) break;
                float fk = float(k);
                vec3 cl = h3(ci + floor(fk / 3.0) * 5.3) * 2.0 - 1.0;
                vec3 rn = h3(ci + fk * 7.9 + 100.0) * 2.0 - 1.0;
                vec3 lpos = mix(rn * 0.7, cl * 0.6 + rn * 0.15, uClump);
                float ll = length(lpos);
                lpos *= min(1.0, 0.8 / max(ll, 1e-4));
                float br = mix(uBubMin, uBubMax, h3(ci + fk * 3.3 + 50.0).x) * hr;
                vec3 bc = hc + lpos * hr;
                vec3 oc = ro - bc;
                float b = dot(oc, rd);
                float h = b * b - (dot(oc, oc) - br * br);
                if (h > 0.0){
                    float t = -b - sqrt(h);
                    if (t > tHit && t < tb){ tb = t; bn = normalize(ro + rd * t - bc); }
                }
            }
            if (tb < 1e8){
                float bd = clamp(dot(bn, -rd), 0.0, 1.0);
                vec3 fill = mix(cc * 0.6, vec3(0.98, 0.6, 0.55), 0.55);
                vec3 bcol = mix(cc * 0.3, fill, smoothstep(0.05, 0.35, bd));
                bcol += vec3(1.0, 0.85, 0.85) * pow(max(dot(reflect(rd, bn), L), 0.0), 18.0) * 0.9;
                cc = mix(cc, bcol, 0.92);
            }

            col = mix(col + uRimC * 0.18, cc, cover);
        }
    }

    col *= uExposure;
    vec2 q = frag / max(uRes, vec2(1.0)) - 0.5;
    col *= 1.0 - uVig * smoothstep(0.25, 0.85, length(q) * 1.2);
    col += (h1(vec3(frag, floor(uTime * 24.0))) - 0.5) * uGrain * 0.22;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const UNIFORMS = [
    "uRes", "uTime", "uM", "uCells[0]", "uCount", "uBubbles", "uScale", "uOffsetY",
    "uCamDist", "uBound", "uBg", "uBase", "uFilmA", "uFilmB", "uFilmC", "uRimC",
    "uSeamC", "uIri", "uFilmFreq", "uCover", "uRimStr", "uSeamW", "uRefract", "uDark",
    "uBubMin", "uBubMax", "uClump", "uSpec", "uGlow", "uExposure", "uGrain", "uVig", "uSeed",
]

function parseColor(input: any, fallback: [number, number, number]): [number, number, number] {
    if (typeof input !== "string") return fallback
    let s = input.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
        return fallback
    }
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (m) {
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && p.every((x) => !isNaN(x))) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fallback
}

function mulberry32(a: number) {
    return () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function layoutCells(n: number, sizePct: number, variancePct: number, jitterPct: number, seed: number) {
    const rnd = mulberry32(seed * 9301 + n * 17 + 1)
    const base = Math.min(0.62, (sizePct / 100) * Math.sqrt(20 / n))
    const shell = Math.max(0.05, 1 - base)
    const data = new Float32Array(128)
    const ga = Math.PI * (3 - Math.sqrt(5))
    const j = jitterPct / 100
    let ext = 0
    for (let i = 0; i < n; i++) {
        let y = 1 - ((i + 0.5) / n) * 2
        const r = Math.sqrt(Math.max(0, 1 - y * y))
        const phi = i * ga
        let x = Math.cos(phi) * r
        let z = Math.sin(phi) * r
        x += (rnd() * 2 - 1) * j
        y += (rnd() * 2 - 1) * j
        z += (rnd() * 2 - 1) * j
        const len = Math.hypot(x, y, z) || 1
        x = (x / len) * shell
        y = (y / len) * shell
        z = (z / len) * shell
        const rad = base * (1 + ((rnd() * 2 - 1) * variancePct) / 100)
        data[i * 4] = x
        data[i * 4 + 1] = y
        data[i * 4 + 2] = z
        data[i * 4 + 3] = rad
        ext = Math.max(ext, shell + rad)
    }
    return { data, ext: Math.max(ext, 0.1) }
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)
    if (!sh) throw new Error("shader alloc failed")
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh)
        gl.deleteShader(sh)
        throw new Error("shader compile failed: " + log)
    }
    return sh
}

export interface ClusterAboutSoapProps {
    speed?: number
    scale?: number
    cells?: number
    iridescence?: number
    tilt?: number
    density?: number
    dragSensitivity?: number
    hoverIntensity?: number
    baseColor?: string
    background?: string
    advanced?: {
        spinRate?: number
        startAngle?: number
        cellSize?: number
        cellVariance?: number
        jitter?: number
        seed?: number
        offsetY?: number
        perspective?: number
        filmBlue?: string
        filmMagenta?: string
        filmPeach?: string
        rimColor?: string
        seamColor?: string
        filmScale?: number
        filmCoverage?: number
        rimStrength?: number
        seamWidth?: number
        refraction?: number
        interiorDark?: number
        bubbleMin?: number
        bubbleMax?: number
        bubbleClump?: number
        specular?: number
        glow?: number
        exposure?: number
        resolution?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function ClusterAboutSoap(props: ClusterAboutSoapProps) {
    const {
        speed = 50,
        scale = 77,
        cells = 19,
        iridescence = 60,
        tilt = 20,
        density = 2,
        baseColor = "#541326",
        background = "#000101",
        dragSensitivity = 50,
        hoverIntensity = 100,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const liveRef = useRef<any>(null)
    liveRef.current = { speed, scale, cells, iridescence, tilt, density, baseColor, background, dragSensitivity, hoverIntensity, advanced: props.advanced }
    const dragRef = useRef({ active: false, lastX: 0, lastY: 0, yaw: 0, pitch: 0 })
    const hoverRef = useRef({ target: 0, value: 0 })

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: false, alpha: false }) as WebGL2RenderingContext | null
        if (!gl) return

        const vs = compile(gl, gl.VERTEX_SHADER, VERT)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()
        if (!prog) throw new Error("program alloc failed")
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link failed: " + gl.getProgramInfoLog(prog))
        const U: Record<string, WebGLUniformLocation> = {}
        for (const name of UNIFORMS) {
            const loc = gl.getUniformLocation(prog, name)
            if (loc === null) throw new Error("missing uniform " + name)
            U[name] = loc
        }
        const vao = gl.createVertexArray()

        let cssW = root.offsetWidth
        let cssH = root.offsetHeight
        const ro = new ResizeObserver(() => {
            cssW = root.offsetWidth
            cssH = root.offsetHeight
        })
        ro.observe(root)

        const target = RenderTarget.current()
        const isStill = target === RenderTarget.thumbnail || target === RenderTarget.export
        const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        let lost = false
        const onLost = (e: Event) => {
            e.preventDefault()
            lost = true
        }
        canvas.addEventListener("webglcontextlost", onLost)

        canvas.style.cursor = "grab"
        canvas.style.touchAction = "none"
        const onPointerDown = (e: PointerEvent) => {
            dragRef.current.active = true
            dragRef.current.lastX = e.clientX
            dragRef.current.lastY = e.clientY
            canvas.style.cursor = "grabbing"
        }
        const onPointerMove = (e: PointerEvent) => {
            if (!dragRef.current.active) return
            const dx = e.clientX - dragRef.current.lastX
            const dy = e.clientY - dragRef.current.lastY
            dragRef.current.lastX = e.clientX
            dragRef.current.lastY = e.clientY
            const sens = Math.max(0, liveRef.current.dragSensitivity) / 100
            dragRef.current.yaw += dx * 0.008 * sens
            dragRef.current.pitch = Math.max(
                -1.3,
                Math.min(1.3, dragRef.current.pitch + dy * 0.008 * sens)
            )
        }
        const endDrag = () => {
            dragRef.current.active = false
            canvas.style.cursor = "grab"
        }
        const onPointerEnter = () => {
            hoverRef.current.target = 1
        }
        const onPointerLeave = () => {
            hoverRef.current.target = 0
        }
        canvas.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", endDrag)
        window.addEventListener("pointercancel", endDrag)
        root.addEventListener("pointerenter", onPointerEnter)
        root.addEventListener("pointerleave", onPointerLeave)

        let layoutKey = ""
        let layout = layoutCells(20, 44, 10, 6, 7)
        let angle = 0
        let clock = 0
        let last = -1
        let raf = 0
        const R = new Float32Array(9)

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            if (lost) return
            const P = liveRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(P.advanced ?? {}) }
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const frozen = isStill || (mq ? mq.matches : false)
            hoverRef.current.value += (hoverRef.current.target - hoverRef.current.value) * Math.min(1, dt * 6)
            const hoverT = hoverRef.current.value * (Math.max(0, P.hoverIntensity) / 100)
            if (!frozen) {
                angle += ((adv.spinRate * Math.PI) / 180) * ((Math.max(0, P.speed) / 50) * (1 + hoverT)) * dt
                clock += dt
            }

            const dpr = Math.min(window.devicePixelRatio || 1, 2) * Math.max(0.25, adv.resolution / 100)
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }

            const n = Math.max(1, Math.min(32, Math.round(P.cells)))
            const key = `${n}|${adv.cellSize}|${adv.cellVariance}|${adv.jitter}|${adv.seed}`
            if (key !== layoutKey) {
                layoutKey = key
                layout = layoutCells(n, adv.cellSize, adv.cellVariance, adv.jitter, adv.seed)
            }

            // rotation about a near-horizontal axis: face rolls toward the viewer and down,
            // offset by drag (yaw spins the cluster, pitch tilts the axis)
            const tr = (P.tilt * Math.PI) / 180 + dragRef.current.pitch
            const x = Math.cos(tr)
            const y = -Math.sin(tr)
            const z = 0
            const th = angle + (adv.startAngle * Math.PI) / 180 + dragRef.current.yaw
            const c = Math.cos(th)
            const s = Math.sin(th)
            const k = 1 - c
            R[0] = c + x * x * k
            R[1] = x * y * k - z * s
            R[2] = x * z * k + y * s
            R[3] = y * x * k + z * s
            R[4] = c + y * y * k
            R[5] = y * z * k - x * s
            R[6] = z * x * k - y * s
            R[7] = z * y * k + x * s
            R[8] = c + z * z * k

            const iri = Math.max(0, P.iridescence) / 60

            gl.viewport(0, 0, w, h)
            gl.useProgram(prog)
            gl.bindVertexArray(vao)
            gl.uniform2f(U.uRes, w, h)
            gl.uniform1f(U.uTime, clock)
            gl.uniformMatrix3fv(U.uM, false, R)
            gl.uniform4fv(U["uCells[0]"], layout.data)
            gl.uniform1i(U.uCount, n)
            gl.uniform1i(U.uBubbles, Math.max(0, Math.min(16, Math.round(P.density))))
            gl.uniform1f(U.uScale, Math.max(1, P.scale) / 100 / layout.ext)
            gl.uniform1f(U.uOffsetY, adv.offsetY / 100)
            gl.uniform1f(U.uCamDist, Math.max(150, adv.perspective) / 100)
            gl.uniform1f(U.uBound, layout.ext + 0.15)
            gl.uniform3fv(U.uBg, parseColor(P.background, [0, 0.004, 0.004]))
            gl.uniform3fv(U.uBase, parseColor(P.baseColor, [0.329, 0.075, 0.149]))
            gl.uniform3fv(U.uFilmA, parseColor(adv.filmBlue, [0.227, 0.275, 0.847]))
            gl.uniform3fv(U.uFilmB, parseColor(adv.filmMagenta, [0.643, 0.118, 0.384]))
            gl.uniform3fv(U.uFilmC, parseColor(adv.filmPeach, [0.941, 0.565, 0.502]))
            gl.uniform3fv(U.uRimC, parseColor(adv.rimColor, [0.961, 0.69, 0.627]))
            gl.uniform3fv(U.uSeamC, parseColor(adv.seamColor, [0.757, 0.373, 0.357]))
            gl.uniform1f(U.uIri, iri)
            gl.uniform1f(U.uFilmFreq, (adv.filmScale / 100) * 1.1)
            gl.uniform1f(U.uCover, Math.min(1, (adv.filmCoverage / 100) * Math.min(iri, 1.5)))
            gl.uniform1f(U.uRimStr, adv.rimStrength / 100)
            gl.uniform1f(U.uSeamW, adv.seamWidth * dpr)
            gl.uniform1f(U.uRefract, adv.refraction / 100)
            gl.uniform1f(U.uDark, adv.interiorDark / 100)
            gl.uniform1f(U.uBubMin, adv.bubbleMin / 100)
            gl.uniform1f(U.uBubMax, Math.max(adv.bubbleMin, adv.bubbleMax) / 100)
            gl.uniform1f(U.uClump, adv.bubbleClump / 100)
            gl.uniform1f(U.uSpec, adv.specular / 100)
            gl.uniform1f(U.uGlow, adv.glow * dpr)
            gl.uniform1f(U.uExposure, adv.exposure / 100)
            gl.uniform1f(U.uGrain, adv.grain / 100)
            gl.uniform1f(U.uVig, adv.vignette / 100)
            gl.uniform1f(U.uSeed, adv.seed)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", endDrag)
            window.removeEventListener("pointercancel", endDrag)
            root.removeEventListener("pointerenter", onPointerEnter)
            root.removeEventListener("pointerleave", onPointerLeave)
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
