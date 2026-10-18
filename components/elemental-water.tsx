"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const SDF_SIZE = 512
const SDF_SPREAD = 128
const D_RANGE = (SDF_SPREAD * 2) / SDF_SIZE
const SIM_RES = 512
const MASK_SIZE = 512 // the mark is built once

const VERT_SRC = `#version 300 es
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const COMMON = `
precision highp float;
uniform sampler2D uSDF;
uniform float uTime;
uniform float uAspect;
uniform vec2  uScale;
uniform vec2  uShift;
uniform vec3  uBg, uBase, uAccent;
in vec2 vUv;
out vec4 frag;

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1,0));
  float c = hash21(i + vec2(0,1)), d = hash21(i + vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = r * p * 2.03; a *= 0.5; }
  return v;
}
/* signed distance in mask-uv units; extended analytically past the texture
   border so out-of-range samples keep growing instead of clamping (kills
   the rectangular clamp artifacts) */
float sdf(vec2 uv){
  vec2 m = 0.5 + (uv - 0.5 - uShift) * uScale;
  vec2 mc = clamp(m, 0.0, 1.0);
  float d = (texture(uSDF, vec2(mc.x, 1.0 - mc.y)).r - 0.5) * ${D_RANGE.toFixed(4)};
  return d + length(m - mc);
}
// The old Highlight dial, derived: one lightened step off Accent. Three colour
// controls instead of four, and nothing about the look changes.
vec3 uHigh(){ return mix(uAccent, vec3(1.0), 0.55); }
float edgeFade(vec2 uv){
  return smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x)
       * smoothstep(0.0, 0.05, uv.y) * smoothstep(1.0, 0.95, uv.y);
}
`.replace("${D_RANGE.toFixed(4)}", D_RANGE.toFixed(4))

const FRAG_SRC = `#version 300 es
` + COMMON + `
uniform sampler2D uState;
uniform vec2 uSimTexel;
uniform float uRipple, uRefract, uGlint;
/* cover-map panel uv into the square sim so rings stay circular on screen */
vec2 simUV(vec2 uv){
  return 0.5 + (uv - 0.5) * vec2(uAspect, 1.0) / max(uAspect, 1.0);
}
void main(){
  vec2 suv = simUV(vUv);
  float h  = texture(uState, suv).r;
  float hx = texture(uState, suv + vec2(uSimTexel.x, 0.0)).r - texture(uState, suv - vec2(uSimTexel.x, 0.0)).r;
  float hy = texture(uState, suv + vec2(0.0, uSimTexel.y)).r - texture(uState, suv - vec2(0.0, uSimTexel.y)).r;
  vec2 grad = vec2(hx, hy);
  vec3 nrm = normalize(vec3(-grad * 30.0, 1.0));

  vec2 ruv = vUv + grad * 0.22 * uRefract;          // refracted lookup
  float d  = sdf(ruv);

  // deep water base
  vec3 col = mix(uBg, mix(uBg, uBase, 0.30), vUv.y * 0.8 + h * 0.25);
  col += uBase * 0.20 * fbm(vUv * vec2(uAspect, 1.0) * 3.0 + uTime * 0.05) * 0.3;

  // the mark, seen through the surface
  float logo = smoothstep(0.005, -0.005, d);
  float glow = exp(-max(d, 0.0) / 0.09) * 0.26;
  vec3 markCol = mix(uAccent, uHigh(), logo * 0.6);
  col += markCol * (logo * 0.92 + glow);

  // ripple shading: crests bright, troughs barely darker
  col += uBase * 0.85 * clamp(h * 1.8 * uRipple, -0.06, 1.0);
  col += uAccent * 0.62 * pow(clamp(h * 2.6 * uRipple, 0.0, 1.0), 2.0) * 0.5;

  // specular glint
  vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(nrm, H), 0.0), 150.0);
  col += spec * uHigh() * 0.9 * uGlint;

  col *= 0.35 + 0.65 * edgeFade(vUv);
  col += (hash21(vUv * 617.0 + uTime) - 0.5) / 128.0;
  frag = vec4(col, 1.0);
}
`

const SIM_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec3 uDrop; // sim-uv.xy, strength
in vec2 vUv;
out vec4 frag;
void main(){
  vec2 s = texture(uState, vUv).rg;
  float l = texture(uState, vUv - vec2(uTexel.x, 0.0)).r;
  float r = texture(uState, vUv + vec2(uTexel.x, 0.0)).r;
  float u = texture(uState, vUv + vec2(0.0, uTexel.y)).r;
  float d = texture(uState, vUv - vec2(0.0, uTexel.y)).r;
  float next = (l + r + u + d) * 0.5 - s.g;
  next *= 0.984;
  if (uDrop.z != 0.0){
    float dd = distance(vUv, uDrop.xy);
    next += uDrop.z * exp(-dd * dd * 3800.0);
  }
  frag = vec4(next, s.r, 0.0, 1.0);
}
`

const PART_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;    // spawn point, y-up mask uv
layout(location=1) in vec2 aNorm;   // outward contour normal
layout(location=2) in float aSeed;
uniform float uTime;
uniform vec2  uScale;
uniform vec2  uShift;
uniform float uDpr;
uniform float uWind;
uniform vec4  uCfgA;  // travel, lifeMin, lifeMax, alongNormal
uniform vec4  uCfgB;  // wiggle, sizeMin, sizeMax, sparse
out float vFade;
out float vMixC;
float h1(float n){ return fract(sin(n) * 43758.5453); }
void main(){
  float hs   = h1(aSeed * 1.31);
  float life = mix(uCfgA.y, uCfgA.z, hs);
  float tt   = uTime / life + aSeed * 13.7;
  float ph   = fract(tt);
  float cyc  = floor(tt);
  float r1 = h1(aSeed + cyc * 0.317);
  float r2 = h1(aSeed * 2.13 + cyc * 0.771);
  float on = step(uCfgB.w, r2);

  vec2 dir = normalize(mix(vec2(0.0, 1.0), aNorm, uCfgA.w) + (vec2(r1, h1(r1 * 7.0)) - 0.5) * 0.8);
  float trav = uCfgA.x * (0.45 + 0.9 * r1);
  vec2 p = aPos + aNorm * 0.004 + dir * trav * ph;
  p.x += sin(ph * 10.0 + r1 * 40.0 + uTime * 0.5) * uCfgB.x * ph;
  p.x += uWind * 0.08 * ph;

  vec2 uv = 0.5 + uShift + (p - 0.5) / uScale;
  vFade = on * smoothstep(0.0, 0.12, ph) * smoothstep(1.0, 0.5, ph) * mix(0.35, 1.0, r2);
  vMixC = h1(aSeed * 3.7 + cyc);
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = mix(uCfgB.y, uCfgB.z, h1(aSeed * 5.11 + cyc)) * uDpr * (1.0 - 0.45 * ph);
}
`

const PART_FRAG = `#version 300 es
precision highp float;
uniform vec3 uColA;
uniform vec3 uColB;
in float vFade;
in float vMixC;
out vec4 frag;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float a = exp(-r2 * 3.5) * (1.0 - r2);
  frag = vec4(mix(uColA, uColB, vMixC) * a * vFade, 1.0);
}
`

function compile(gl: WebGL2RenderingContext, type: number, src: string, tag: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("ElementalWater " + tag + " shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function link(gl: WebGL2RenderingContext, vs: string, fs: string, tag: string): WebGLProgram | null {
    const v = compile(gl, gl.VERTEX_SHADER, vs, tag)
    const f = compile(gl, gl.FRAGMENT_SHADER, fs, tag)
    if (!v || !f) return null
    const p = gl.createProgram()
    if (!p) return null
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("ElementalWater " + tag + " link:", gl.getProgramInfoLog(p))
        return null
    }
    return p
}

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

function clampN(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

function rng(seed: number): () => number {
    let a = seed >>> 0
    return function () {
        a += 0x6d2b79f5
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function parseColor(input: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!input) return fb
    const str = String(input).trim()
    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255]
        }
        return fb
    }
    const m = str.match(/[\d.]+/g)
    if (m && m.length >= 3) {
        return [
            Math.min(255, parseFloat(m[0])) / 255,
            Math.min(255, parseFloat(m[1])) / 255,
            Math.min(255, parseFloat(m[2])) / 255,
        ]
    }
    return fb
}

// ---- the mark: rasterise a silhouette into a mask -----------------------------------
//
// Everything downstream reads a signed distance field: an ImageData whose ALPHA is
// 1 inside the mark and 0 outside. SDF_SPREAD is a quarter of the field size on
// purpose, which keeps the encoded range (D_RANGE) independent of resolution.

function maskCanvas(size: number) {
    const c = document.createElement("canvas")
    c.width = size
    c.height = size
    return c
}

function rasterizePath(pathStr: string, size: number): ImageData | null {
    if (typeof document === "undefined" || typeof Path2D === "undefined") return null
    const c = maskCanvas(size)
    const ctx = c.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    const box = size * 0.6
    const s = box / 24
    const off = (size - box) / 2
    ctx.setTransform(s, 0, 0, s, off, off)
    ctx.fillStyle = "#fff"
    try {
        ctx.fill(new Path2D(pathStr))
    } catch {
        return null
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    return ctx.getImageData(0, 0, size, size)
}

// Two-pass chamfer: an approximate euclidean distance for the cost of two sweeps
// over the buffer, which is what keeps a field cheap enough to rebuild whenever the
// mark changes — and cheap enough to rebuild from a video several times a second.
function chamfer(d: Float32Array, w: number, h: number) {
    const D1 = 1
    const D2 = Math.SQRT2
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x
            let v = d[i]
            if (x > 0) v = Math.min(v, d[i - 1] + D1)
            if (y > 0) {
                v = Math.min(v, d[i - w] + D1)
                if (x > 0) v = Math.min(v, d[i - w - 1] + D2)
                if (x < w - 1) v = Math.min(v, d[i - w + 1] + D2)
            }
            d[i] = v
        }
    }
    for (let y = h - 1; y >= 0; y--) {
        for (let x = w - 1; x >= 0; x--) {
            const i = y * w + x
            let v = d[i]
            if (x < w - 1) v = Math.min(v, d[i + 1] + D1)
            if (y < h - 1) {
                v = Math.min(v, d[i + w] + D1)
                if (x < w - 1) v = Math.min(v, d[i + w + 1] + D2)
                if (x > 0) v = Math.min(v, d[i + w - 1] + D2)
            }
            d[i] = v
        }
    }
}

function buildSDF(img: ImageData, size: number): Uint8Array {
    const n = size * size
    const spread = size / 4 // keeps D_RANGE resolution-independent
    const dOut = new Float32Array(n)
    const dIn = new Float32Array(n)
    for (let i = 0; i < n; i++) {
        const inside = img.data[i * 4 + 3] > 127
        dOut[i] = inside ? 0 : 1e9
        dIn[i] = inside ? 1e9 : 0
    }
    chamfer(dOut, size, size)
    chamfer(dIn, size, size)
    const enc = new Uint8Array(n)
    for (let i = 0; i < n; i++) {
        const d = dOut[i] - dIn[i] // positive outside, negative inside
        enc[i] = Math.max(0, Math.min(255, Math.round((0.5 + (0.5 * d) / spread) * 255)))
    }
    return enc
}

// Contour pixels with their outward normals, in y-up mask uv: the particle spawn
// set, so embers leave the surface rather than the bounding box.
function edgePoints(img: ImageData, size: number): number[] {
    const pts: number[] = []
    const a = (x: number, y: number) => img.data[(y * size + x) * 4 + 3] > 127
    const stride = Math.max(1, Math.round(size / 512))
    for (let y = 1; y < size - 1; y += stride) {
        for (let x = 1; x < size - 1; x += stride) {
            if (!a(x, y)) continue
            const l = a(x - 1, y)
            const r = a(x + 1, y)
            const up = a(x, y - 1)
            const dn = a(x, y + 1)
            if (l && r && up && dn) continue
            const gx = (r ? 1 : 0) - (l ? 1 : 0)
            const gy = (dn ? 1 : 0) - (up ? 1 : 0)
            let nx = -gx
            let ny = gy // outward, y flipped to y-up
            const len = Math.hypot(nx, ny)
            if (!len) {
                nx = 0
                ny = 1
            } else {
                nx /= len
                ny /= len
            }
            pts.push((x + 0.5) / size, 1 - (y + 0.5) / size, nx, ny)
        }
    }
    return pts
}

interface Group {
    ripple?: number
    refraction?: number
    glint?: number
}
const GROUP_DEFAULTS: Required<Group> = { ripple: 100, refraction: 100, glint: 100 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    density?: number
    speed?: number
    hover?: number
    zoom?: number
    water?: Group
}

export default function ElementalWater(props: Props) {
    const {
        style,
        background = "#02080E",
        baseColor = "#FFFFFF",
        density = 160,
        speed = 50,
        hover = 100,
        zoom = 106,
        water,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const g_ = { ...GROUP_DEFAULTS, ...(water || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const ptrRef = useRef({ x: 0.5, y: 0.5, on: 0, lastX: 0.5, lastY: 0.5, wind: 0, t: 0 })

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would rebuild the GL context on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        bg: background,
        base: baseColor,
        accent: "#8CEBFF",
        density: Math.round(clampN(num(density, 160), 0, 2000)),
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        zoom: clampN(num(zoom, 106), 40, 300) / 100,
        ripple: clampN(num(g_.ripple, 100), 0, 300) / 100,
        refraction: clampN(num(g_.refraction, 100), 0, 400) / 100,
        glint: clampN(num(g_.glint, 100), 0, 300) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl2", { alpha: false, antialias: false })
        if (!gl) {
            console.error("ElementalWater: WebGL2 unavailable")
            return
        }

        const prog = link(gl, VERT_SRC, FRAG_SRC, "main")
        const partProg = link(gl, PART_VERT, PART_FRAG, "particles")
        if (!prog || !partProg) return

        const locs = new Map<string, WebGLUniformLocation | null>()
        const u = (n: string) => {
            if (!locs.has("m:" + n)) locs.set("m:" + n, gl.getUniformLocation(prog, n))
            return locs.get("m:" + n) as WebGLUniformLocation | null
        }
        const pu = (n: string) => {
            if (!locs.has("p:" + n)) locs.set("p:" + n, gl.getUniformLocation(partProg, n))
            return locs.get("p:" + n) as WebGLUniformLocation | null
        }

        const R = rng(20260825)

        // --- ripple field: two textures, ping-ponged ---
        const simTex: (WebGLTexture | null)[] = [null, null]
        const simFbo: (WebGLFramebuffer | null)[] = [null, null]
        let simSrc = 0
        let simOk = false
        if (gl.getExtension("EXT_color_buffer_float")) {
            for (let i = 0; i < 2; i++) {
                const t = gl.createTexture()
                gl.bindTexture(gl.TEXTURE_2D, t)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, SIM_RES, SIM_RES, 0, gl.RG, gl.HALF_FLOAT, null)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
                const f = gl.createFramebuffer()
                gl.bindFramebuffer(gl.FRAMEBUFFER, f)
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
                gl.clearColor(0, 0, 0, 0)
                gl.clear(gl.COLOR_BUFFER_BIT)
                simTex[i] = t
                simFbo[i] = f
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            simOk = true
        } else {
            // Without float render targets the wave step cannot hold a signed height,
            // so the surface stays flat rather than rendering garbage.
            console.warn("ElementalWater: EXT_color_buffer_float unavailable, ripples off")
        }
        const simProg = simOk ? link(gl, VERT_SRC, SIM_FRAG, "sim") : null
        const uSim = (n: string) => (simProg ? gl.getUniformLocation(simProg, n) : null)
        const drops: { x: number; y: number; s: number }[] = []
        let nextAutoDrop = 0.6

        // ---- the mark: rasterise, distance-transform, upload ----
        const sdfTex = gl.createTexture()
        const partBuf = gl.createBuffer()
        const partVao = gl.createVertexArray()
        let edges: number[] = []
        let partCount = 0
        let builtCount = -1

        // ---- the mark ----
        let markSize = MASK_SIZE

        const uploadMask = (img: ImageData | null, size: number) => {
            if (!img) return false
            gl.bindTexture(gl.TEXTURE_2D, sdfTex)
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, size, size, 0, gl.RED, gl.UNSIGNED_BYTE, buildSDF(img, size))
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            edges = edgePoints(img, size)
            markSize = size
            builtCount = -1
            return true
        }

        // No mark image: an empty path rasterises to an all-transparent mask, which
        // the distance transform encodes as "outside" everywhere, so the sdf lookup
        // never lights up a silhouette.
        uploadMask(rasterizePath("", MASK_SIZE), MASK_SIZE)

        const buildParticles = (count: number) => {
            builtCount = count
            partCount = edges.length ? count : 0
            if (!partCount) return
            const nPts = edges.length / 4
            const data = new Float32Array(count * 5)
            for (let i = 0; i < count; i++) {
                const j = (R() * nPts) | 0
                data[i * 5] = edges[j * 4]
                data[i * 5 + 1] = edges[j * 4 + 1]
                data[i * 5 + 2] = edges[j * 4 + 2]
                data[i * 5 + 3] = edges[j * 4 + 3]
                data[i * 5 + 4] = R() * 100 + i * 0.618
            }
            gl.bindVertexArray(partVao)
            gl.bindBuffer(gl.ARRAY_BUFFER, partBuf)
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 20, 0)
            gl.enableVertexAttribArray(1)
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 8)
            gl.enableVertexAttribArray(2)
            gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16)
            gl.bindVertexArray(null)
        }

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            const sp = v.speed as number
            clock += dt * sp

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            const bw = Math.max(2, Math.round(cw * dpr))
            const bh = Math.max(2, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }

            if ((v.density as number) !== builtCount) buildParticles(v.density as number)

            const ptr = ptrRef.current
            // per-second, so a flick decays the same on any refresh rate
            ptr.wind += (0 - ptr.wind) * (1 - Math.exp(-dt * sp * 2.4))

            const aspect = bw / Math.max(bh, 1)
            const fit = Math.min(aspect, 1)
            const zoomK = v.zoom as number
            const scx = (aspect / fit) * zoomK
            const scy = (1 / fit) * zoomK

            // --- step the ripple field ---
            if (simProg && simOk) {
                if (clock > nextAutoDrop) {
                    // the field keeps seeding itself, so the water is never still
                    drops.push({
                        x: 0.12 + R() * 0.76,
                        y: 0.12 + R() * 0.76,
                        s: (0.12 + R() * 0.3) * (v.ripple as number),
                    })
                    nextAutoDrop = clock + 0.5 + R() * 1.4
                }
                gl.useProgram(simProg)
                gl.viewport(0, 0, SIM_RES, SIM_RES)
                gl.uniform2f(uSim("uTexel"), 1 / SIM_RES, 1 / SIM_RES)
                // Two substeps a frame, fixed: the wave step is only stable at its own
                // rate, so Speed scales what is DROPPED into it, never the step itself.
                for (let i = 0; i < 2; i++) {
                    const drop = drops.shift()
                    if (drop) {
                        const a2 = bw / Math.max(bh, 1)
                        const f = Math.max(a2, 1)
                        gl.uniform3f(
                            uSim("uDrop"),
                            0.5 + (drop.x - 0.5) * (a2 / f),
                            0.5 + (drop.y - 0.5) * (1 / f),
                            drop.s
                        )
                    } else {
                        gl.uniform3f(uSim("uDrop"), 0, 0, 0)
                    }
                    gl.bindFramebuffer(gl.FRAMEBUFFER, simFbo[1 - simSrc])
                    gl.activeTexture(gl.TEXTURE1)
                    gl.bindTexture(gl.TEXTURE_2D, simTex[simSrc])
                    gl.uniform1i(uSim("uState"), 1)
                    gl.drawArrays(gl.TRIANGLES, 0, 3)
                    simSrc = 1 - simSrc
                }
                gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            }

            gl.useProgram(prog)
            gl.viewport(0, 0, bw, bh)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform1f(u("uAspect"), aspect)
            gl.uniform2f(u("uScale"), scx, scy)
            gl.uniform2f(u("uShift"), 0.0, 0.0)
            gl.uniform3f(u("uBg"), ...(parseColor(v.bg as string, [0.01, 0.02, 0.04]) as [number, number, number]))
            gl.uniform3f(u("uBase"), ...(parseColor(v.base as string, [0.4, 0.6, 0.8]) as [number, number, number]))
            gl.uniform3f(u("uAccent"), ...(parseColor(v.accent as string, [0.8, 0.9, 1]) as [number, number, number]))
            gl.uniform1f(u("uRipple"), v.ripple as number)
            gl.uniform1f(u("uRefract"), v.refraction as number)
            gl.uniform1f(u("uGlint"), v.glint as number)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, sdfTex)
            gl.uniform1i(u("uSDF"), 0)

            if (simOk) {
                gl.activeTexture(gl.TEXTURE1)
                gl.bindTexture(gl.TEXTURE_2D, simTex[simSrc])
                gl.uniform1i(u("uState"), 1)
                gl.uniform2f(u("uSimTexel"), 1 / SIM_RES, 1 / SIM_RES)
            }

            gl.drawArrays(gl.TRIANGLES, 0, 3)

            if (partCount > 0) {
                gl.useProgram(partProg)
                gl.uniform1f(pu("uTime"), clock)
                gl.uniform2f(pu("uScale"), scx, scy)
                gl.uniform2f(pu("uShift"), 0.0, 0.0)
                gl.uniform1f(pu("uDpr"), dpr)
                gl.uniform1f(pu("uWind"), ptr.wind * (v.hover as number))
                gl.uniform4f(pu("uCfgA"), 0.1, 4.0, 8.0, 0.15)
                gl.uniform4f(pu("uCfgB"), 0.02, 1.5, 3.5, 0.5)
                gl.uniform3f(pu("uColA"), 0.1, 0.24, 0.3)
                gl.uniform3f(pu("uColB"), 0.22, 0.4, 0.48)
                gl.enable(gl.BLEND)
                gl.blendFunc(gl.ONE, gl.ONE)
                gl.bindVertexArray(partVao)
                gl.drawArrays(gl.POINTS, 0, partCount)
                gl.bindVertexArray(null)
                gl.disable(gl.BLEND)
            }

            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant — offset and size scale together — so
        // this is safe on a zoomed Framer canvas where absolute px are not.
        const track = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            const ptr = ptrRef.current
            const x = clampN((e.clientX - r.left) / r.width, 0, 1)
            const y = clampN(1 - (e.clientY - r.top) / r.height, 0, 1)
            const dx = x - ptr.lastX
            const dy = y - ptr.lastY
            ptr.wind = clampN(ptr.wind + dx * 6, -1, 1)
            // Speed of travel sets the ring: a slow drift barely dents the surface, a
            // flick throws a real drop in. Capped, or a fast sweep queues dozens and the
            // field saturates into white noise.
            const sped = Math.hypot(dx, dy) / Math.max(1 / 240, (performance.now() - ptr.t) / 1000)
            ptr.t = performance.now()
            if (sped > 0.05 && drops.length < 6) {
                drops.push({ x, y, s: Math.min(sped * 0.14, 0.55) * (vRef.current.hover as number) })
            }
            ptr.lastX = x
            ptr.lastY = y
            ptr.x = x
            ptr.y = y
            ptr.on = 1
        }
        const onLeave = () => {
            ptrRef.current.on = 0
        }

        canvas.addEventListener("pointermove", track)
        canvas.addEventListener("pointerenter", track)
        canvas.addEventListener("pointerleave", onLeave)
        raf = requestAnimationFrame(render)

        // Never loseContext(): getContext returns the same context per canvas, so
        // StrictMode's mount -> cleanup -> mount would reuse a force-lost one.
        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", track)
            canvas.removeEventListener("pointerenter", track)
            canvas.removeEventListener("pointerleave", onLeave)
        }
    }, [])

    return (
        <div
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                minWidth: 1200,
                minHeight: 800,
                width: typeof width === "number" && width > 0 ? width : "100%",
                height: typeof height === "number" && height > 0 ? height : "100%",
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
