"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    hotColor: "#F5A623",
    pinkColor: "#B43552",
    magentaColor: "#902FD9",
    violetColor: "#624BE1",
    rimColor: "#2EC5D8",
    rimAmount: 35,
    veinStrength: 45,
    warp: 70,
    noiseScale: 160,
    seed: 7,
    brightness: 100,
    diffuse: 75,
    ambient: 45,
    sphereSize: 72,
    cubeSize: 46,
    fov: 38,
    offsetX: 50,
    offsetY: 50,
    spinY: -39,
    phaseY: 52,
    roll: -15,
    rollSpeed: 9,
    tilt: 20,
    tiltSwing: 8,
    tiltPeriod: 7000,
    warmAxisTilt: 50,
    warmAxisAngle: 20,
    edgeWidth: 2,
    edgeGlint: 70,
    innerEdge: 35,
    reflectBoost: 0,
    bounces: 5,
    maxPixels: 1600,
    grain: 0,
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
uniform vec2 uCenter;
uniform mat3 uRot;
uniform float uFocal, uDist, uS, uR;
uniform float uIor, uDisp;
uniform vec3 uBg;
uniform vec3 uC0, uC1, uC2, uC3, uC4, uC5;
uniform vec3 uRim;
uniform float uRimAmt, uVein, uWarp, uNoiseScale, uSeed, uBright, uDiffuse, uAmbient;
uniform vec3 uWarmAxis;
uniform vec3 uLightDir;
uniform float uEdgeW, uEdgeAmt, uInnerEdge, uReflBoost;
uniform int uBounces;
uniform float uGrain, uVignette, uTime;

float hash3(vec3 p){
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}
vec3 pal(float t){
  t = clamp(t, 0.0, 1.0) * 5.0;
  if (t < 1.0) return mix(uC0, uC1, t);
  if (t < 2.0) return mix(uC1, uC2, t - 1.0);
  if (t < 3.0) return mix(uC2, uC3, t - 2.0);
  if (t < 4.0) return mix(uC3, uC4, t - 3.0);
  return mix(uC4, uC5, t - 4.0);
}
vec3 marble(vec3 n, vec3 rd){
  vec3 p = n * uNoiseScale + vec3(uSeed * 1.37, uSeed * 2.11, uSeed * 0.73);
  float w = fbm(p);
  vec3 q = p + uWarp * vec3(w, -w * 0.8, w * 0.6) * 2.0;
  float v = fbm(q * 1.7);
  float g = dot(n, uWarmAxis);
  float tc = 0.5 - 0.5 * g + (v - 0.45) * 0.5 * uWarp;
  vec3 base = pal(tc);
  float bands = 0.5 + 0.5 * sin(q.y * 5.0 + q.x * 1.5 + v * 12.0);
  float vein = smoothstep(0.72, 0.97, bands) * uVein;
  vec3 col = mix(base, pal(tc + 0.18) * 0.55, vein);
  col += base * 0.22 * uVein * smoothstep(0.8, 1.0, 1.0 - bands);
  vec3 nw = uRot * n;
  col *= uAmbient + uDiffuse * max(dot(nw, uLightDir), 0.0);
  float f = pow(1.0 - abs(dot(n, rd)), 3.0);
  col += mix(uRim, uC1, smoothstep(-0.3, 0.3, g)) * f * uRimAmt;
  return col * uBright;
}
float sgn(float x){ return x >= 0.0 ? 1.0 : -1.0; }
vec3 sinv(vec3 d){
  vec3 s = vec3(sgn(d.x), sgn(d.y), sgn(d.z));
  return 1.0 / (s * max(abs(d), vec3(1e-6)));
}
bool boxEnter(vec3 ro, vec3 rd, out float t, out vec3 n){
  vec3 inv = sinv(rd);
  vec3 t1 = (-uS - ro) * inv, t2 = (uS - ro) * inv;
  vec3 tn = min(t1, t2), tf = max(t1, t2);
  float tN = max(max(tn.x, tn.y), tn.z);
  float tF = min(min(tf.x, tf.y), tf.z);
  if (tN > tF || tF < 0.0) return false;
  t = tN;
  if (tN == tn.x) n = vec3(-sgn(rd.x), 0.0, 0.0);
  else if (tN == tn.y) n = vec3(0.0, -sgn(rd.y), 0.0);
  else n = vec3(0.0, 0.0, -sgn(rd.z));
  return true;
}
float boxExit(vec3 ro, vec3 rd, out vec3 n){
  vec3 inv = sinv(rd);
  vec3 tf = max((-uS - ro) * inv, (uS - ro) * inv);
  float t = min(min(tf.x, tf.y), tf.z);
  if (t == tf.x) n = vec3(sgn(rd.x), 0.0, 0.0);
  else if (t == tf.y) n = vec3(0.0, sgn(rd.y), 0.0);
  else n = vec3(0.0, 0.0, sgn(rd.z));
  return t;
}
float edgeDist(vec3 p, vec3 n){
  vec3 d = uS - abs(p) + abs(n) * 1000.0;
  return min(min(d.x, d.y), d.z);
}
vec3 trace(vec3 ro, vec3 rd, float ior){
  float t; vec3 n;
  if (!boxEnter(ro, rd, t, n)) return uBg;
  vec3 p = ro + rd * t;
  float ci = clamp(-dot(rd, n), 0.0, 1.0);
  float F0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
  float F = F0 + (1.0 - F0) * pow(1.0 - ci, 5.0);
  vec3 col = uBg * F;
  vec3 nw = uRot * n;
  float lit = 0.35 + 0.65 * max(dot(nw, uLightDir), 0.0);
  col += vec3(1.0 - smoothstep(0.0, uEdgeW, edgeDist(p, n))) * uEdgeAmt * lit;
  float thr = 1.0 - F;
  rd = refract(rd, n, 1.0 / ior);
  ro = p - n * 1e-4;
  for (int i = 0; i < 8; i++){
    if (i >= uBounces) break;
    vec3 m;
    float tx = boxExit(ro, rd, m);
    float b = dot(ro, rd);
    float c = dot(ro, ro) - uR * uR;
    float h = b * b - c;
    if (h > 0.0){
      float ts = -b - sqrt(h);
      if (ts > 1e-4 && ts < tx){
        vec3 q = ro + rd * ts;
        col += thr * marble(normalize(q), rd);
        return col;
      }
    }
    p = ro + rd * tx;
    col += thr * (1.0 - smoothstep(0.0, uEdgeW, edgeDist(p, m))) * uEdgeAmt * uInnerEdge;
    vec3 rt = refract(rd, -m, ior);
    vec3 rr = reflect(rd, m);
    if (dot(rt, rt) > 1e-6){
      float c2 = clamp(dot(rt, m), 0.0, 1.0);
      float Fi = F0 + (1.0 - F0) * pow(1.0 - c2, 5.0);
      Fi = mix(Fi, 1.0, uReflBoost);
      col += thr * (1.0 - Fi) * uBg;
      thr *= Fi;
    }
    rd = rr;
    ro = p - m * 1e-4;
  }
  return col + thr * uBg;
}
float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = (gl_FragCoord.xy - uCenter * uRes) / max(uRes.y, 1.0);
  vec3 roW = vec3(0.0, 0.0, uDist);
  vec3 rdW = normalize(vec3(uv, -uFocal));
  mat3 inv = transpose(uRot);
  vec3 ro = inv * roW;
  vec3 rd = inv * rdW;
  vec3 col;
  float b = dot(ro, rd);
  float c = dot(ro, ro) - 3.0 * uS * uS;
  if (b * b - c < 0.0) col = uBg;
  else if (uDisp < 0.0005) col = trace(ro, rd, uIor);
  else {
    col.r = trace(ro, rd, uIor - uDisp).r;
    col.g = trace(ro, rd, uIor).g;
    col.b = trace(ro, rd, uIor + uDisp).b;
  }
  vec2 sc = gl_FragCoord.xy / max(uRes, vec2(1.0)) - 0.5;
  sc.x *= uRes.x / max(uRes.y, 1.0);
  col *= 1.0 - uVignette * smoothstep(0.25, 0.95, length(sc));
  col = pow(max(col, vec3(0.0)), vec3(1.0 / 2.2));
  col += (h2(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5) * uGrain * 0.18;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const UNIFORMS = [
    "uRes", "uCenter", "uRot", "uFocal", "uDist", "uS", "uR", "uIor", "uDisp", "uBg",
    "uC0", "uC1", "uC2", "uC3", "uC4", "uC5", "uRim", "uRimAmt", "uVein", "uWarp",
    "uNoiseScale", "uSeed", "uBright", "uDiffuse", "uAmbient", "uWarmAxis", "uLightDir",
    "uEdgeW", "uEdgeAmt", "uInnerEdge", "uReflBoost", "uBounces", "uGrain", "uVignette", "uTime",
]

function parseColor(input: string | undefined, fallback: string): [number, number, number] {
    let s = (input || fallback).trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.split("").map((ch) => ch + ch).join("")
        const n = parseInt(h.slice(0, 6), 16)
        if (!isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (m) {
        const parts = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
        if (parts.length >= 3 && parts.every((x) => !isNaN(x))) return [parts[0] / 255, parts[1] / 255, parts[2] / 255]
    }
    if (s === fallback) return [0, 0, 0]
    return parseColor(fallback, fallback)
}

function lin(c: [number, number, number]): [number, number, number] {
    return [Math.pow(c[0], 2.2), Math.pow(c[1], 2.2), Math.pow(c[2], 2.2)]
}

function mul3(a: number[][], b: number[][]): number[][] {
    const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]
    return r
}

export interface TransparentGlassCubeProps {
    speed?: number
    scale?: number
    ior?: number
    dispersion?: number
    dragSensitivity?: number
    speedBoost?: number
    hoverGlow?: number
    colorWarm?: string
    colorCool?: string
    background?: string
    advanced?: {
        hotColor?: string
        pinkColor?: string
        magentaColor?: string
        violetColor?: string
        rimColor?: string
        rimAmount?: number
        veinStrength?: number
        warp?: number
        noiseScale?: number
        seed?: number
        brightness?: number
        diffuse?: number
        ambient?: number
        sphereSize?: number
        cubeSize?: number
        fov?: number
        offsetX?: number
        offsetY?: number
        spinY?: number
        phaseY?: number
        roll?: number
        rollSpeed?: number
        tilt?: number
        tiltSwing?: number
        tiltPeriod?: number
        warmAxisTilt?: number
        warmAxisAngle?: number
        edgeWidth?: number
        edgeGlint?: number
        innerEdge?: number
        reflectBoost?: number
        bounces?: number
        maxPixels?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * Transparent Glass Cube — a ray-traced crystal cube tumbling around a marbled sphere.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function TransparentGlassCube(props: TransparentGlassCubeProps) {
    const {
        speed = 50,
        scale = 100,
        ior = 150,
        dispersion = 100,
        dragSensitivity = 50,
        speedBoost = 60,
        hoverGlow = 40,
        colorWarm = "#E55F42",
        colorCool = "#4921A8",
        background = "#000000",
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    const dirtyRef = useRef(true)
    const hoverRef = useRef(false)
    const dragRef = useRef({ active: false, lastX: 0, lastY: 0, yaw: 0, pitch: 0 })
    propsRef.current = props
    dirtyRef.current = true

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return
        const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true })
        if (!gl) return

        let program: WebGLProgram | null = null
        let vs: WebGLShader | null = null
        let fs: WebGLShader | null = null
        let vao: WebGLVertexArrayObject | null = null
        const loc: Record<string, WebGLUniformLocation> = {}

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)
            if (!sh) throw new Error("GlassCube: createShader failed")
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error("GlassCube shader: " + gl.getShaderInfoLog(sh))
            return sh
        }
        try {
            vs = compile(gl.VERTEX_SHADER, VERT)
            fs = compile(gl.FRAGMENT_SHADER, FRAG)
            program = gl.createProgram()
            if (!program) throw new Error("GlassCube: createProgram failed")
            gl.attachShader(program, vs)
            gl.attachShader(program, fs)
            gl.linkProgram(program)
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("GlassCube link: " + gl.getProgramInfoLog(program))
            for (const name of UNIFORMS) {
                const l = gl.getUniformLocation(program, name)
                if (l === null) throw new Error("GlassCube: missing uniform " + name)
                loc[name] = l
            }
            vao = gl.createVertexArray()
        } catch (err) {
            console.error(err)
            return
        }

        const size = { w: container.offsetWidth, h: container.offsetHeight }
        const ro = new ResizeObserver(() => {
            size.w = container.offsetWidth
            size.h = container.offsetHeight
            dirtyRef.current = true
        })
        ro.observe(container)

        const onPointerEnter = () => {
            hoverRef.current = true
            dirtyRef.current = true
            const glow = Math.max(0, propsRef.current.hoverGlow ?? 40)
            container.style.filter = glow > 0 ? `drop-shadow(0 0 ${glow * 0.6}px ${propsRef.current.colorWarm || "#E55F42"})` : ""
        }
        const onPointerLeave = () => {
            hoverRef.current = false
            dirtyRef.current = true
            container.style.filter = ""
        }
        const onPointerDown = (e: PointerEvent) => {
            dragRef.current.active = true
            dragRef.current.lastX = e.clientX
            dragRef.current.lastY = e.clientY
        }
        const onPointerMove = (e: PointerEvent) => {
            if (!dragRef.current.active) return
            const sens = (Math.max(0, propsRef.current.dragSensitivity ?? 50) / 100) * 0.5
            dragRef.current.yaw += (e.clientX - dragRef.current.lastX) * sens
            dragRef.current.pitch += (e.clientY - dragRef.current.lastY) * sens
            dragRef.current.lastX = e.clientX
            dragRef.current.lastY = e.clientY
            dirtyRef.current = true
        }
        const onPointerUp = () => { dragRef.current.active = false }
        container.addEventListener("pointerenter", onPointerEnter)
        container.addEventListener("pointerleave", onPointerLeave)
        canvas.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)
        window.addEventListener("pointercancel", onPointerUp)

        const mql = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        const onMql = () => { dirtyRef.current = true }
        mql?.addEventListener?.("change", onMql)

        const render = (t: number, wall: number) => {
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const sc = Math.max(0.05, (p.scale ?? 100) / 100)

            let dpr = Math.min(window.devicePixelRatio || 1, 2)
            const area = Math.max(1, size.w * size.h)
            const maxPx = Math.max(100, adv.maxPixels) * 1000
            if (area * dpr * dpr > maxPx) dpr = Math.sqrt(maxPx / area)
            const W = Math.max(1, Math.round(size.w * dpr))
            const H = Math.max(1, Math.round(size.h * dpr))
            if (canvas.width !== W || canvas.height !== H) {
                canvas.width = W
                canvas.height = H
            }

            const d2r = Math.PI / 180
            const a = (adv.phaseY + adv.spinY * t + dragRef.current.yaw) * d2r
            const tiltPeriod = Math.max(100, adv.tiltPeriod) / 1000
            const b = (adv.tilt + adv.tiltSwing * Math.sin((2 * Math.PI * t) / tiltPeriod) + dragRef.current.pitch) * d2r
            const c = (adv.roll + adv.rollSpeed * t) * d2r
            const Ry = [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]]
            const Rx = [[1, 0, 0], [0, Math.cos(b), -Math.sin(b)], [0, Math.sin(b), Math.cos(b)]]
            const Rz = [[Math.cos(c), -Math.sin(c), 0], [Math.sin(c), Math.cos(c), 0], [0, 0, 1]]
            const R = mul3(Rz, mul3(Rx, Ry))
            const rot = new Float32Array([R[0][0], R[1][0], R[2][0], R[0][1], R[1][1], R[2][1], R[0][2], R[1][2], R[2][2]])

            const fov = Math.min(120, Math.max(5, adv.fov)) * d2r
            const focal = 1 / Math.tan(fov / 2)
            const cubeFrac = Math.max(0.05, adv.cubeSize / 100)
            const dist = 1 + (2 * focal) / cubeFrac
            const s = sc
            const pxWorld = (dist - s) / (focal * H)
            const edgeW = Math.max(1e-5, adv.edgeWidth * dpr * pxWorld)

            const wt = adv.warmAxisTilt * d2r
            const wa = adv.warmAxisAngle * d2r
            const warm = [Math.sin(wt) * Math.sin(wa), Math.cos(wt), Math.sin(wt) * Math.cos(wa)]
            const L = [0.4, 0.8, 0.6]
            const lLen = Math.hypot(L[0], L[1], L[2])
            const glowMul = hoverRef.current ? 1 + Math.max(0, p.hoverGlow ?? 40) / 100 : 1

            gl.viewport(0, 0, W, H)
            gl.useProgram(program)
            gl.bindVertexArray(vao)
            gl.uniform2f(loc.uRes, W, H)
            gl.uniform2f(loc.uCenter, adv.offsetX / 100, 1 - adv.offsetY / 100)
            gl.uniformMatrix3fv(loc.uRot, false, rot)
            gl.uniform1f(loc.uFocal, focal)
            gl.uniform1f(loc.uDist, dist)
            gl.uniform1f(loc.uS, s)
            gl.uniform1f(loc.uR, s * Math.min(0.98, Math.max(0.05, adv.sphereSize / 100)))
            gl.uniform1f(loc.uIor, Math.max(1.01, (p.ior ?? 150) / 100))
            gl.uniform1f(loc.uDisp, ((p.dispersion ?? 30) / 100) * 0.067)
            gl.uniform3fv(loc.uBg, lin(parseColor(p.background, "#000000")))
            gl.uniform3fv(loc.uC0, lin(parseColor(adv.hotColor, ADVANCED_DEFAULTS.hotColor)))
            gl.uniform3fv(loc.uC1, lin(parseColor(p.colorWarm, "#E55F42")))
            gl.uniform3fv(loc.uC2, lin(parseColor(adv.pinkColor, ADVANCED_DEFAULTS.pinkColor)))
            gl.uniform3fv(loc.uC3, lin(parseColor(adv.magentaColor, ADVANCED_DEFAULTS.magentaColor)))
            gl.uniform3fv(loc.uC4, lin(parseColor(adv.violetColor, ADVANCED_DEFAULTS.violetColor)))
            gl.uniform3fv(loc.uC5, lin(parseColor(p.colorCool, "#4921A8")))
            gl.uniform3fv(loc.uRim, lin(parseColor(adv.rimColor, ADVANCED_DEFAULTS.rimColor)))
            gl.uniform1f(loc.uRimAmt, (adv.rimAmount / 100) * glowMul)
            gl.uniform1f(loc.uVein, adv.veinStrength / 100)
            gl.uniform1f(loc.uWarp, adv.warp / 100)
            gl.uniform1f(loc.uNoiseScale, adv.noiseScale / 100)
            gl.uniform1f(loc.uSeed, adv.seed)
            gl.uniform1f(loc.uBright, adv.brightness / 100)
            gl.uniform1f(loc.uDiffuse, adv.diffuse / 100)
            gl.uniform1f(loc.uAmbient, adv.ambient / 100)
            gl.uniform3f(loc.uWarmAxis, warm[0], warm[1], warm[2])
            gl.uniform3f(loc.uLightDir, L[0] / lLen, L[1] / lLen, L[2] / lLen)
            gl.uniform1f(loc.uEdgeW, edgeW)
            gl.uniform1f(loc.uEdgeAmt, (adv.edgeGlint / 100) * glowMul)
            gl.uniform1f(loc.uInnerEdge, adv.innerEdge / 100)
            gl.uniform1f(loc.uReflBoost, adv.reflectBoost / 100)
            gl.uniform1i(loc.uBounces, Math.max(1, Math.min(8, Math.round(adv.bounces))))
            gl.uniform1f(loc.uGrain, adv.grain / 100)
            gl.uniform1f(loc.uVignette, adv.vignette / 100)
            gl.uniform1f(loc.uTime, wall)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        let raf = 0
        let last = -1
        let t = 0
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const reduce = !!mql?.matches
            if (reduce) {
                if (!dirtyRef.current) return
                dirtyRef.current = false
                render(2.42, 0)
                return
            }
            const p = propsRef.current
            const boost = hoverRef.current ? 1 + Math.max(0, p.speedBoost ?? 60) / 100 : 1
            const sp = (Math.max(0, p.speed ?? 50) / 50) * boost
            t += dt * sp
            dirtyRef.current = false
            render(t, now / 1000)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            mql?.removeEventListener?.("change", onMql)
            container.removeEventListener("pointerenter", onPointerEnter)
            container.removeEventListener("pointerleave", onPointerLeave)
            canvas.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", onPointerUp)
            window.removeEventListener("pointercancel", onPointerUp)
            if (vao) gl.deleteVertexArray(vao)
            if (program) gl.deleteProgram(program)
            if (vs) gl.deleteShader(vs)
            if (fs) gl.deleteShader(fs)
        }
    }, [])

    return (
        <div
            ref={containerRef}
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
