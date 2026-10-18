"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const SDF_SIZE = 512
const SDF_SPREAD = 128
const D_RANGE = (SDF_SPREAD * 2) / SDF_SIZE
const MASK_SIZE = 512 // the mark is built once, so it gets the full field
const MASK_BOX = 0.72 // fraction of the field the mark is fitted into
const MASK_CUT = 0.5 // alpha / luminance threshold
const ALPHA_MIN = 0.02 // see-through fraction (of the DRAWN rect) that means "cutout"
const FACE_FALLBACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
// The silhouette shown until a source is chosen, and whenever one fails to load.
const FALLBACK_PATH = "M13.6 2L5.2 13.4h5L9.2 22l9.6-12.2h-5.6L13.6 2Z"

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
`

const FRAG_SRC = `#version 300 es
` + COMMON + `
uniform float uArcs, uFlash, uRim;
uniform vec3  uPointer;   // uv.xy, active

void main(){
  float t = uTime;
  float d = sdf(vUv);
  vec2 pp = vUv * vec2(uAspect, 1.0);

  // storm backdrop
  vec3 col = uBg;
  col += mix(uBg, uBase, 0.10) * fbm(pp * 2.2 + vec2(t * 0.04, t * 0.01));

  // occasional sheet flash
  float slot = floor(t * 0.45);
  float ph   = fract(t * 0.45);
  float big  = step(0.68, hash21(vec2(slot, 3.7))) * exp(-ph * 16.0);

  // the mark: dark slate body, lit by flashes
  float inside = smoothstep(0.005, -0.005, d);
  vec3 body = mix(uBg, uBase, 0.14) + big * uBase * 0.95 * uFlash;
  col = mix(col, body, inside);
  float rim = exp(-abs(d) / 0.012) * 0.5;
  col += rim * uBase * uRim;

  // pointer draws the storm closer
  vec2 dp = (vUv - uPointer.xy) * vec2(uAspect, 1.0);
  float pb = 1.0 + 2.4 * uPointer.z * exp(-dot(dp, dp) * 34.0);

  // fBm zigzag arcs crawling the contour
  float fade = edgeFade(vUv);
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    float n  = fbm(pp * mix(3.0, 8.0, fi / 2.0) + vec2(t * (1.2 + fi * 0.9), fi * 19.3)) - 0.5;
    float e  = abs(d + n * 0.11);
    float fl = hash21(vec2(floor(t * (6.0 + fi * 3.0)), fi));
    fl = mix(0.15, 1.0, smoothstep(0.25, 0.95, fl));
    float bolt = pow(0.0042 * pb / (e + 0.0022), 1.35) * fl;
    bolt = min(bolt, 6.0);
    col += bolt * uArcs * mix(uBase, uAccent, fi / 2.0) * fade;
  }
  // tight white core arc
  float n0 = fbm(pp * 5.0 + vec2(t * 2.4, 7.7)) - 0.5;
  float e0 = abs(d + n0 * 0.10);
  float corefl = mix(0.25, 1.15, hash21(vec2(floor(t * 9.0), 11.0)));
  col += min(pow(0.0026 * pb / (e0 + 0.0016), 1.6), 8.0) * corefl * uHigh() * uArcs * fade;

  col += big * uBase * 0.62 * uFlash * (0.25 + 0.75 * inside);
  col = col / (1.0 + col * 0.18);
  col *= 0.4 + 0.6 * edgeFade(vUv);
  col += (hash21(vUv * 431.0 + uTime) - 0.5) / 128.0;
  frag = vec4(col, 1.0);
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
        console.error("ElementalLightning " + tag + " shader:", gl.getShaderInfoLog(sh))
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
        console.error("ElementalLightning " + tag + " link:", gl.getProgramInfoLog(p))
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

function fontFamilyOf(f: unknown): string {
    if (typeof f === "string" && f.trim()) return f
    const o = f as { fontFamily?: string } | undefined
    return o && o.fontFamily ? o.fontFamily : FACE_FALLBACK
}

function fontWeightOf(f: unknown): string {
    const o = f as { fontWeight?: number | string } | undefined
    return o && o.fontWeight ? String(o.fontWeight) : "700"
}

// ---- the mark: one mask, three ways to make it -----------------------------
//
// Everything downstream reads a signed distance field, so both sources end at the
// same place: an ImageData whose ALPHA is 1 inside the mark and 0 outside.
// SDF_SPREAD is a quarter of the field size on purpose — that makes the encoded
// range (D_RANGE) independent of resolution.

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

function rasterizeText(text: string, family: string, weight: string, size: number): ImageData | null {
    if (typeof document === "undefined") return null
    const c = maskCanvas(size)
    const ctx = c.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    const box = size * MASK_BOX
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    // Fit by MEASURING, not by guessing: set a probe size, read the advance, then
    // scale so the longest line fills the box. A fixed size makes one word tiny and
    // the next one clip.
    const lines = String(text).split("\n")
    const probe = 100
    ctx.font = weight + " " + probe + "px " + family
    let widest = 1
    for (const ln of lines) widest = Math.max(widest, ctx.measureText(ln).width)
    const byWidth = (box / widest) * probe
    const byHeight = (box / (lines.length * 1.12)) * probe
    const fs = Math.max(4, Math.min(byWidth, byHeight))
    ctx.font = weight + " " + fs.toFixed(1) + "px " + family
    ctx.fillStyle = "#fff"
    const step = fs * 1.12
    const y0 = size / 2 - ((lines.length - 1) * step) / 2
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], size / 2, y0 + i * step)
    return ctx.getImageData(0, 0, size, size)
}

/** ControlType.Image is a string on most Framer versions, an object on newer. */
function resolveImage(v: unknown): string {
    if (!v) return ""
    if (typeof v === "string") return v
    const o = v as { src?: string }
    return typeof o.src === "string" ? o.src : ""
}

// An image, fitted to the box and thresholded into a silhouette.
//
// Two traps live here, and the first pass at this port fell into both.
//
// 1. The mask canvas is BIGGER than the fitted image — MASK_BOX is 0.72 — so its
//    margin is transparent no matter what was drawn. Probing alpha over the whole
//    canvas therefore answered "this source has alpha" for every source, on its
//    very first sample, and the luminance branch was unreachable. An opaque PNG
//    then thresholded to a solid rectangle: the storm traced the image's bounding
//    box and the embers span off its perimeter. Alpha is sampled inside the DRAWN
//    rect only, and it takes ALPHA_MIN of the samples to count as a cutout, so one
//    stray antialiased pixel cannot decide it.
// 2. "Bright is inside" is wrong for the commonest PNG there is — a dark logo on
//    white — which would come back as the page with the logo punched out of it.
//    Polarity is read off the drawn rect's BORDER instead: whatever frames the
//    picture is the background, and the mark is whatever contrasts with it.
//
// Everything outside the drawn rect is background by definition and is cleared
// explicitly — under the dark-mark polarity the empty margin has luminance 0 and
// would otherwise threshold as one enormous mark.
function rasterizeImage(src: HTMLImageElement, size: number): ImageData | null {
    const w = src.naturalWidth
    const h = src.naturalHeight
    if (typeof document === "undefined" || !w || !h) return null
    const c = maskCanvas(size)
    const ctx = c.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    const box = size * MASK_BOX
    const k = Math.min(box / w, box / h) // contain, so nothing is cropped away
    const dw = w * k
    const dh = h * k
    const ox = (size - dw) / 2
    const oy = (size - dh) / 2
    try {
        ctx.drawImage(src, ox, oy, dw, dh)
    } catch {
        return null
    }
    let img: ImageData
    try {
        img = ctx.getImageData(0, 0, size, size)
    } catch {
        // a cross-origin source taints the canvas; keep whatever field we had
        return null
    }
    const d = img.data
    const x0 = Math.max(0, Math.ceil(ox))
    const y0 = Math.max(0, Math.ceil(oy))
    const x1 = Math.min(size, Math.floor(ox + dw))
    const y1 = Math.min(size, Math.floor(oy + dh))
    if (x1 - x0 < 2 || y1 - y0 < 2) return null
    const step = Math.max(1, Math.round((x1 - x0) / 96))
    const lumAt = (i: number) => (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 255000

    // is it a cutout? — inside the drawn rect only
    let sampled = 0
    let clear = 0
    for (let y = y0; y < y1; y += step) {
        for (let x = x0; x < x1; x += step) {
            sampled++
            if (d[(y * size + x) * 4 + 3] < 250) clear++
        }
    }
    const hasAlpha = sampled > 0 && clear / sampled > ALPHA_MIN

    // which way round? — the border of the drawn rect is the background
    let bSum = 0
    let bN = 0
    for (let x = x0; x < x1; x += step) {
        bSum += lumAt((y0 * size + x) * 4) + lumAt(((y1 - 1) * size + x) * 4)
        bN += 2
    }
    for (let y = y0; y < y1; y += step) {
        bSum += lumAt((y * size + x0) * 4) + lumAt((y * size + x1 - 1) * 4)
        bN += 2
    }
    const brightBg = bN > 0 && bSum / bN > MASK_CUT

    const aThr = MASK_CUT * 255
    for (let y = 0; y < size; y++) {
        const inRow = y >= y0 && y < y1
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4
            if (!inRow || x < x0 || x >= x1) {
                d[i + 3] = 0
                continue
            }
            let inside: boolean
            if (hasAlpha) inside = d[i + 3] > aThr
            else {
                const lum = lumAt(i)
                inside = brightBg ? lum < MASK_CUT : lum > MASK_CUT
            }
            d[i + 3] = inside ? 255 : 0
        }
    }
    return img
}

// Two-pass chamfer: an approximate euclidean distance for the cost of two sweeps
// over the buffer, which is what keeps a field cheap enough to rebuild whenever the
// mark changes.
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

type MarkGroup = {
    source?: string
    // resolveImage() takes either shape Framer has shipped this control as
    image?: string | { src?: string }
    text?: string
    // Framer has shipped this control as both an object and a bare family string,
    // so the read below accepts either rather than betting on one.
    font?: string | { fontFamily?: string; fontWeight?: number | string }
}
const MARK_DEFAULTS: Required<Pick<MarkGroup, "source" | "text">> = { source: "text", text: "storm" }

type Group = {
    arcs?: number
    flash?: number
    rim?: number
}
const GROUP_DEFAULTS: Required<Group> = { arcs: 100, flash: 100, rim: 100 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    speed?: number
    hover?: number
    zoom?: number
    mark?: MarkGroup
    storm?: Group
}

export default function ElementalLightning(props: Props) {
    const {
        style,
        background = "#03030A",
        baseColor = "#5B63FF",
        accentColor = "#EAE8FF",
        density = 240,
        speed = 50,
        hover = 100,
        zoom = 110,
        mark,
        storm,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const g_ = { ...GROUP_DEFAULTS, ...(storm || {}) }
    const mark_ = { ...MARK_DEFAULTS, ...(mark || {}) }

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
        accent: accentColor,
        source: String(mark_.source || "text"),
        image: resolveImage((mark_ as MarkGroup).image),
        text: String(mark_.text ?? ""),
        fontFamily: fontFamilyOf((mark_ as MarkGroup).font),
        fontWeight: fontWeightOf((mark_ as MarkGroup).font),
        density: Math.round(clampN(num(density, 240), 0, 2000)),
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        zoom: clampN(num(zoom, 110), 40, 300) / 100,
        arcs: clampN(num(g_.arcs, 100), 0, 300) / 100,
        flash: clampN(num(g_.flash, 100), 0, 300) / 100,
        rim: clampN(num(g_.rim, 100), 0, 300) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl2", { alpha: false, antialias: false })
        if (!gl) {
            console.error("ElementalLightning: WebGL2 unavailable")
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

        // ---- the mark: rasterise, distance-transform, upload ----
        const sdfTex = gl.createTexture()
        const partBuf = gl.createBuffer()
        const partVao = gl.createVertexArray()
        let edges: number[] = []
        let partCount = 0
        let builtCount = -1

        // ---- the mark ----
        let markKey = ""
        const media = { img: null as HTMLImageElement | null, url: "" }
        let haveMask = false
        let warned = false

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
            builtCount = -1
            haveMask = true
            return true
        }

        const fallback = () => uploadMask(rasterizePath(FALLBACK_PATH, MASK_SIZE), MASK_SIZE)

        const buildMark = (v: Record<string, number | string>) => {
            const src = v.source as string
            if (src === "image") {
                const url = v.image as string
                if (!url) return fallback()
                if (media.url !== url) {
                    media.url = url
                    media.img = null // or the OLD picture keeps rasterizing under the new key
                    const im = new Image()
                    im.crossOrigin = "anonymous" // or getImageData taints and throws
                    // Both handlers check the url is still the current one: a fast
                    // A -> B swap can land A's onload after B started, and without
                    // the guard A would win and stick.
                    im.onload = () => {
                        if (media.url !== url) return
                        media.img = im
                        markKey = "" // force a rebuild now that the pixels exist
                    }
                    im.onerror = () => {
                        if (media.url !== url) return
                        media.img = null
                        markKey = ""
                        if (!warned) {
                            warned = true
                            // crossOrigin="anonymous" makes a host without CORS fail
                            // HERE rather than tainting the canvas later, so this is
                            // the only place that failure is observable.
                            console.warn(
                                "ElementalLightning: the image could not be loaded (bad URL, or a host that does not send CORS headers), showing the fallback mark"
                            )
                        }
                    }
                    im.src = url
                    // hold the mark we already have while the next one decodes;
                    // dropping to the bolt glyph between two pictures reads as a bug
                    return haveMask ? true : fallback()
                }
                const im = media.img
                if (!im || !im.naturalWidth) return haveMask ? true : fallback()
                return uploadMask(rasterizeImage(im, MASK_SIZE), MASK_SIZE) || fallback()
            }
            const text = (v.text as string).trim()
            if (!text) return fallback()
            return uploadMask(
                rasterizeText(text, v.fontFamily as string, v.fontWeight as string, MASK_SIZE),
                MASK_SIZE
            )
        }

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

            const key =
                (v.source as string) + "|" + (v.image as string) + "|" + (v.text as string) + "|" +
                (v.fontFamily as string) + "|" + (v.fontWeight as string)
            if (key !== markKey) {
                markKey = key
                buildMark(v)
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

            gl.useProgram(prog)
            gl.viewport(0, 0, bw, bh)
            gl.uniform1f(u("uTime"), clock)
            gl.uniform1f(u("uAspect"), aspect)
            gl.uniform2f(u("uScale"), scx, scy)
            gl.uniform2f(u("uShift"), 0.0, 0.0)
            gl.uniform3f(u("uBg"), ...(parseColor(v.bg as string, [0.01, 0.02, 0.04]) as [number, number, number]))
            gl.uniform3f(u("uBase"), ...(parseColor(v.base as string, [0.4, 0.6, 0.8]) as [number, number, number]))
            gl.uniform3f(u("uAccent"), ...(parseColor(v.accent as string, [0.8, 0.9, 1]) as [number, number, number]))
            gl.uniform3f(u("uPointer"), ptr.x, ptr.y, ptr.on * (v.hover as number))
            gl.uniform1f(u("uArcs"), v.arcs as number)
            gl.uniform1f(u("uFlash"), v.flash as number)
            gl.uniform1f(u("uRim"), v.rim as number)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, sdfTex)
            gl.uniform1i(u("uSDF"), 0)

            gl.drawArrays(gl.TRIANGLES, 0, 3)

            if (partCount > 0) {
                gl.useProgram(partProg)
                gl.uniform1f(pu("uTime"), clock)
                gl.uniform2f(pu("uScale"), scx, scy)
                gl.uniform2f(pu("uShift"), 0.0, 0.0)
                gl.uniform1f(pu("uDpr"), dpr)
                gl.uniform1f(pu("uWind"), ptr.wind * (v.hover as number))
                gl.uniform4f(pu("uCfgA"), 0.055, 0.3, 0.9, 1.0)
                gl.uniform4f(pu("uCfgB"), 0.015, 1.2, 2.6, 0.8)
                gl.uniform3f(pu("uColA"), 0.45, 0.5, 1.0)
                gl.uniform3f(pu("uColB"), 0.95, 0.95, 1.0)
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
