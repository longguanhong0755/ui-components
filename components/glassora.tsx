"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef, useState } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    cycleMs: 5000,
    turn1StartMs: 270,
    turn1Ms: 1730,
    turn2StartMs: 2930,
    turn2Ms: 1740,
    ease1X1: 68,
    ease1Y1: 28,
    ease1X2: 48,
    ease1Y2: 80,
    ease2X1: 63,
    ease2Y1: 25,
    ease2X2: 48,
    ease2Y2: 68,
    reverseSecond: true,
    yaw: 25,
    pitch: 14,
    roll: 4,
    camera: 700,
    offsetX: 0,
    offsetY: 0,
    tracking: -3,
    bevel: 3,
    ior: 150,
    envLight: 100,
    rim: 60,
    reflection: 100,
    absorb: 20,
    tint: "#EAF2EC",
    exposure: 300,
    renderScale: 100,
    grain: 0,
    vignette: 0,
    hover: 100,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
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

const STACK = `"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif`
const CAP = 0.72
const MAX_COLORS = 6
const MAX_EDGES = 24
const MAX_LETTERS = 8
const LETTER_KEYS = [
    "letter1Color", "letter2Color", "letter3Color", "letter4Color",
    "letter5Color", "letter6Color", "letter7Color", "letter8Color",
]
const LETTER_FALLBACKS = ["#FF4D6D", "#FFB347", "#4DD4FF", "#9B6BFF", "#7CFF8A", "#FF7AE0", "#FFE14D", "#4D7CFF"]

/** Letters in the word, spaces not counted. Decides how many Letter rows show. */
function letterCount(text: any) {
    return Array.from(typeof text === "string" ? text : "").filter((c) => c.trim()).length
}

const VERT = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uOff;
uniform float uPx;
uniform float uCam;
uniform mat3 uRot;
uniform vec3 uBox;
uniform sampler2D uSdf;
uniform float uBevel;
uniform float uIor;
uniform float uDisp;
uniform float uEnv;
uniform float uRim;
uniform float uRefl;
uniform vec3 uTint;
uniform vec4 uColor;
uniform float uAbsorb;
uniform float uExposure;
uniform vec3 uBg;
uniform float uGrain;
uniform float uVig;
uniform float uTime;
uniform vec3 uPtr;
uniform int uMode;
uniform vec4 uStops[${MAX_COLORS}];
uniform int uStopN;
uniform float uGradAng;
uniform vec2 uHalf;
uniform float uEdge[${MAX_EDGES}];
uniform int uEdgeN;
uniform vec4 uSeg[${MAX_EDGES + 1}];
out vec4 outColor;

float map(vec3 p){
  vec2 uv = vec2(p.x / (2.0 * uBox.x) + 0.5, 0.5 - p.y / (2.0 * uBox.y));
  float d2 = texture(uSdf, uv).r;
  vec2 q = abs(p.xy) - uBox.xy;
  d2 += length(max(q, 0.0));
  float r = uBevel;
  vec2 w = vec2(d2 + r, abs(p.z) - (uBox.z - r));
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - r;
}

vec3 nrm(vec3 p){
  const vec2 k = vec2(1.0, -1.0);
  const float e = 0.003;
  return normalize(k.xyy * map(p + k.xyy * e) + k.yyx * map(p + k.yyx * e) +
                   k.yxy * map(p + k.yxy * e) + k.xxx * map(p + k.xxx * e));
}

vec4 gradAt(float t){
  int n = max(uStopN, 1);
  if (n == 1) return uStops[0];
  float f = clamp(t, 0.0, 1.0) * float(n - 1);
  int i = min(int(floor(f)), n - 2);
  return mix(uStops[i], uStops[i + 1], f - float(i));
}

// Letter colour at an object-space point, so it stays on the letters as they tumble.
vec4 surfColor(vec3 p){
  if (uMode == 1) {
    vec2 d = vec2(cos(uGradAng), sin(uGradAng));
    float ext = max(abs(d.x) * uHalf.x + abs(d.y) * uHalf.y, 1e-3);
    return gradAt(0.5 + 0.5 * dot(p.xy, d) / ext);
  }
  if (uMode == 2) {
    int seg = 0;
    for (int i = 0; i < ${MAX_EDGES}; i++) {
      if (i >= uEdgeN) break;
      if (p.x > uEdge[i]) seg = i + 1;
    }
    return uSeg[seg];
  }
  return uColor;
}

float band(float a, float c, float w){ return smoothstep(w, w * 0.35, abs(a - c)); }

float env(vec3 d){
  float az = atan(d.x, d.z);
  float el = asin(clamp(d.y, -1.0, 1.0));
  float e = 0.0;
  e += 1.5 * band(az, -0.75, 0.32) * band(el, 0.55, 0.38);
  e += 1.1 * band(az, 1.05, 0.07) * band(el, 0.1, 0.75);
  e += 1.3 * band(az, 2.75, 0.10) * band(el, 0.25, 0.6);
  e += 0.9 * band(az, -2.5, 0.06) * band(el, -0.1, 0.7);
  e += 0.7 * band(az, 0.35, 0.05) * band(el, 0.9, 0.25);
  e += 0.8 * band(el, 1.25, 0.12);
  e += 0.05 * smoothstep(-0.2, -1.0, d.y);
  vec3 L = normalize(vec3(uPtr.x * 0.9, uPtr.y * 0.9, 1.0));
  e += uPtr.z * 1.4 * smoothstep(0.94, 0.995, dot(d, L));
  return e * uEnv;
}

float exitEnv(vec3 ri, vec3 n2, float ior, mat3 toW){
  vec3 o = refract(ri, -n2, ior);
  if (dot(o, o) < 1e-6) return 0.55 * env(toW * reflect(ri, -n2));
  return env(toW * o);
}

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main(){
  vec2 pc = gl_FragCoord.xy - 0.5 * uRes - uOff;
  float px = max(uPx, 1e-3);
  vec3 ro = vec3(0.0, 0.0, uCam);
  vec3 rd = normalize(vec3(pc / px, -uCam));
  vec3 roo = uRot * ro;
  vec3 rdo = uRot * rd;
  vec3 col = uBg;

  vec3 bmax = uBox + vec3(0.02);
  vec3 sg = vec3(rdo.x >= 0.0 ? 1.0 : -1.0, rdo.y >= 0.0 ? 1.0 : -1.0, rdo.z >= 0.0 ? 1.0 : -1.0);
  vec3 inv = 1.0 / (sg * max(abs(rdo), vec3(1e-6)));
  vec3 t0 = (-bmax - roo) * inv;
  vec3 t1 = (bmax - roo) * inv;
  vec3 tmn = min(t0, t1);
  vec3 tmx = max(t0, t1);
  float tn = max(max(tmn.x, tmn.y), max(tmn.z, 0.0));
  float tf = min(min(tmx.x, tmx.y), tmx.z);

  if (tf > tn) {
    float pix = 1.0 / (px * uCam);
    float t = tn;
    bool hit = false;
    float minR = 1e9;
    for (int i = 0; i < 110; i++) {
      vec3 p = roo + rdo * t;
      float d = map(p);
      minR = min(minR, d / (pix * t));
      if (d < pix * t * 0.35) { hit = true; break; }
      t += d * 0.9;
      if (t > tf) break;
    }
    if (hit) {
      vec3 p = roo + rdo * t;
      vec3 n = nrm(p);
      mat3 toW = transpose(uRot);
      float cosi = clamp(dot(-rdo, n), 0.0, 1.0);
      float F = 0.04 + 0.96 * pow(1.0 - cosi, 5.0);
      float eR = env(toW * reflect(rdo, n));
      vec3 ri = refract(rdo, n, 1.0 / uIor);
      if (dot(ri, ri) < 1e-6) ri = rdo;
      vec3 q = p - n * 0.006;
      float path = 0.0;
      for (int i = 0; i < 48; i++) {
        float d = map(q);
        if (d > 0.0) break;
        float s = max(-d, 0.006);
        q += ri * s;
        path += s;
      }
      vec3 n2 = nrm(q);
      vec3 tr = vec3(
        exitEnv(ri, n2, uIor - uDisp, toW),
        exitEnv(ri, n2, uIor, toW),
        exitEnv(ri, n2, uIor + uDisp, toW)
      );
      tr *= uTint * exp(-uAbsorb * path);
      vec3 c = vec3(eR) * F * uRefl + tr * (1.0 - F);
      float rim = smoothstep(0.22, 0.62, min(length(n.xy), abs(n.z)));
      c += vec3(rim) * uRim * (0.2 + 0.8 * min(eR, 1.5));
      col = min(1.0 - exp(-c * uExposure * 1.25), vec3(0.9));
      vec4 sc = surfColor(p);
      if (sc.a > 0.001) {
        vec3 nw = toW * n;
        float lit = clamp(dot(nw, normalize(vec3(-0.35, 0.6, 0.72))), 0.0, 1.0);
        vec3 body = sc.rgb * (0.78 + 0.22 * lit);
        body += vec3(min(eR, 1.5)) * F * uRefl * 0.35 + vec3(rim) * uRim * 0.25 * min(eR, 1.0);
        col = mix(col, clamp(body, 0.0, 1.0), sc.a);
      }
    } else if (minR < 1.5) {
      col = mix(col, vec3(0.35 * uEnv), (1.0 - minR / 1.5) * 0.3);
    }
  }

  vec2 uvc = (gl_FragCoord.xy / uRes - 0.5) * 2.0;
  col *= 1.0 - uVig * smoothstep(0.4, 1.5, length(uvc));
  float g = hash(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5;
  col += g * uGrain * 0.18;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

function parseColor(input: any, fallback: number[] = [0, 0, 0]): number[] {
    if (typeof input !== "string") return fallback
    const s = input.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("")
        if (h.length < 6) return fallback
        const n = parseInt(h.slice(0, 6), 16)
        if (isNaN(n)) return fallback
        const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, isNaN(a) ? 1 : a]
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3) {
            const a = p.length >= 4 && !isNaN(p[3]) ? (m[1].includes("%") && p[3] > 1 ? p[3] / 100 : p[3]) : 1
            return [p[0] / 255, p[1] / 255, p[2] / 255, Math.max(0, Math.min(1, a))]
        }
    }
    return fallback
}

function bezier(x1: number, y1: number, x2: number, y2: number, x: number) {
    if (x <= 0) return 0
    if (x >= 1) return 1
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
    const sx = (t: number) => ((ax * t + bx) * t + cx) * t
    let t = x
    for (let i = 0; i < 8; i++) {
        const xt = sx(t) - x
        const dx = (3 * ax * t + 2 * bx) * t + cx
        if (Math.abs(xt) < 1e-6 || Math.abs(dx) < 1e-6) break
        t -= xt / dx
    }
    if (!(t >= 0 && t <= 1) || Math.abs(sx(t) - x) > 1e-4) {
        let lo = 0, hi = 1
        t = x
        for (let i = 0; i < 24; i++) {
            if (sx(t) < x) lo = t
            else hi = t
            t = (lo + hi) / 2
        }
    }
    return ((ay * t + by) * t + cy) * t
}

function thetaAt(ms: number, adv: typeof ADVANCED_DEFAULTS) {
    const cycle = Math.max(500, adv.cycleMs)
    const local = ((ms % cycle) + cycle) % cycle
    const s1 = adv.turn1StartMs, d1 = Math.max(50, adv.turn1Ms)
    const s2 = adv.turn2StartMs, d2 = Math.max(50, adv.turn2Ms)
    if (local >= s1 && local < s1 + d1) {
        const b = bezier(adv.ease1X1 / 100, adv.ease1Y1 / 100, adv.ease1X2 / 100, adv.ease1Y2 / 100, (local - s1) / d1)
        return 360 * b
    }
    if (local >= s2 && local < s2 + d2) {
        const b = bezier(adv.ease2X1 / 100, adv.ease2Y1 / 100, adv.ease2X2 / 100, adv.ease2Y2 / 100, (local - s2) / d2)
        return adv.reverseSecond ? 360 * (1 - b) : 360 * b
    }
    return 0
}

function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
    let k = 0
    v[0] = 0
    z[0] = -1e20
    z[1] = 1e20
    for (let q = 1; q < n; q++) {
        let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        while (s <= z[k]) {
            k--
            s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        }
        k++
        v[k] = q
        z[k] = s
        z[k + 1] = 1e20
    }
    k = 0
    for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++
        d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
    }
}

function edt2d(grid: Float64Array, w: number, h: number) {
    const n = Math.max(w, h)
    const f = new Float64Array(n), d = new Float64Array(n)
    const v = new Int32Array(n), z = new Float64Array(n + 1)
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) f[y] = grid[y * w + x]
        edt1d(f, h, d, v, z)
        for (let y = 0; y < h; y++) grid[y * w + x] = d[y]
    }
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) f[x] = grid[y * w + x]
        edt1d(f, w, d, v, z)
        for (let x = 0; x < w; x++) grid[y * w + x] = d[x]
    }
}

type Sdf = {
    data: Float32Array; w: number; h: number; hx: number; hy: number; halfText: number; inkY: number
    /** Object-space x of the boundary between each pair of characters. */
    edges: number[]
    /** Letter index (spaces skipped) of each segment between edges. */
    segLetter: number[]
}

function buildSdf(text: string, font: (px: number) => string, trackingPct: number): Sdf {
    const empty = { data: new Float32Array(16).fill(1), w: 4, h: 4, hx: 0.5, hy: 0.5, halfText: 0.5, inkY: 0.5, edges: [], segLetter: [0] }
    if (!text || !text.trim()) return empty
    const c = document.createElement("canvas")
    const ctx = c.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D
    if (!ctx) return empty
    let F = 200
    const setFont = () => {
        ctx.font = font(F)
        if ("letterSpacing" in ctx) (ctx as any).letterSpacing = `${(trackingPct / 100) * F}px`
    }
    setFont()
    let m = ctx.measureText(text)
    let tw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight
    if (tw > 1800) {
        F = Math.max(40, Math.floor((F * 1800) / tw))
        setFont()
        m = ctx.measureText(text)
        tw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight
    }
    const asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent
    const pad = Math.ceil(F * 0.12)
    const w = Math.max(4, Math.ceil(tw + 2 * pad))
    const h = Math.max(4, Math.ceil(asc + desc + 2 * pad))
    c.width = w
    c.height = h
    setFont()
    ctx.fillStyle = "#fff"
    ctx.textBaseline = "alphabetic"
    ctx.textAlign = "left"
    const x0 = pad + m.actualBoundingBoxLeft
    ctx.fillText(text, x0, pad + asc)
    const chars = Array.from(text)
    const spacing = (trackingPct / 100) * F
    const edges: number[] = []
    const segLetter: number[] = []
    let letter = -1
    for (let i = 0; i < chars.length; i++) {
        if (chars[i].trim()) letter++
        segLetter.push(Math.max(0, letter))
        if (i < chars.length - 1 && edges.length < MAX_EDGES) {
            const advance = ctx.measureText(chars.slice(0, i + 1).join("")).width
            edges.push((x0 + advance - spacing / 2 - w / 2) / F)
        }
    }
    const img = ctx.getImageData(0, 0, w, h).data
    const N = w * h
    const out = new Float64Array(N), inn = new Float64Array(N), alpha = new Float32Array(N)
    for (let i = 0; i < N; i++) {
        const a = img[i * 4 + 3] / 255
        alpha[i] = a
        const inside = a > 0.5
        out[i] = inside ? 0 : 1e20
        inn[i] = inside ? 1e20 : 0
    }
    edt2d(out, w, h)
    edt2d(inn, w, h)
    const data = new Float32Array(N)
    for (let i = 0; i < N; i++) {
        const a = alpha[i]
        let sd = a > 0.5 ? -(Math.sqrt(inn[i]) - 0.5) : Math.sqrt(out[i]) - 0.5
        if (a > 0.02 && a < 0.98) sd = 0.5 - a
        data[i] = sd / F
    }
    return {
        data, w, h, hx: w / (2 * F), hy: h / (2 * F),
        halfText: Math.max(0.1, tw / (2 * F)),
        inkY: Math.max(0.05, (asc + desc) / (2 * F)),
        edges,
        segLetter,
    }
}

const rx = (a: number) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c] }
const ry = (a: number) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c] }
const rz = (a: number) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1] }
function mul(A: number[], B: number[]) {
    const R = new Array(9).fill(0)
    for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
            R[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]
    return R
}
const DEG = Math.PI / 180

export interface SingleWordElysianProps {
    background?: string
    colorMode?: "single" | "gradient" | "multi"
    color?: string
    colors?: string[]
    letterColors?: {
        letter1Color?: string
        letter2Color?: string
        letter3Color?: string
        letter4Color?: string
        letter5Color?: string
        letter6Color?: string
        letter7Color?: string
        letter8Color?: string
    }
    gradientAngle?: number
    text?: string
    font?: Record<string, unknown>
    size?: number
    speed?: number
    depth?: number
    dispersion?: number
    dragSensitivity?: number
    hover?: number
    advanced?: {
        cycleMs?: number
        turn1StartMs?: number
        turn1Ms?: number
        turn2StartMs?: number
        turn2Ms?: number
        ease1X1?: number
        ease1Y1?: number
        ease1X2?: number
        ease1Y2?: number
        ease2X1?: number
        ease2Y1?: number
        ease2X2?: number
        ease2Y2?: number
        reverseSecond?: boolean
        yaw?: number
        pitch?: number
        roll?: number
        camera?: number
        offsetX?: number
        offsetY?: number
        tracking?: number
        bevel?: number
        ior?: number
        envLight?: number
        rim?: number
        reflection?: number
        absorb?: number
        tint?: string
        exposure?: number
        renderScale?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * Glass Word Flip — one extruded glass word tumbling end over end.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function SingleWordElysian(props: SingleWordElysianProps) {
    props = withMovedControls(props)
    const {
        text = "TEXT",
        font = {"variant":"Bold","fontSize":"16px","textAlign":"left","fontFamily":"Inter","fontWeight":700,"lineHeight":"1.5em","letterSpacing":"2em"},
        size = 303,
        speed = 50,
        depth = 23,
        dispersion = 0,
        dragSensitivity = 100,
        background = "#000000",
        colorMode = "single",
        color = "#FFFFFF",
        colors = ["#C5FF00","#FF7C00"],
        gradientAngle = 0,
        letterColors = {},
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props
    const [failed, setFailed] = useState(false)
    const fillRgba = parseColor(color, [1, 1, 1, 0])

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return

        const S = {
            w: root.offsetWidth || 1200,
            h: root.offsetHeight || 800,
            tl: 0,
            last: -1,
            px: 0, py: 0, tpx: 0, tpy: 0,
            over: 0, tover: 0,
            pressStart: -1,
            key: "",
            fontsV: 0,
            sdf: null as Sdf | null,
            dragging: false,
            lastX: 0, lastY: 0, lastT: 0, moved: 0,
            dTheta: 0, dYaw: 0, vTheta: 0, vYaw: 0,
        }

        const bump = () => { S.fontsV++ }
        const fonts: any = (document as any).fonts
        if (!document.getElementById("ok-inter-900")) {
            const link = document.createElement("link")
            link.id = "ok-inter-900"
            link.rel = "stylesheet"
            link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap"
            link.onload = () => { fonts?.load?.("900 100px Inter").then(bump, bump) }
            document.head.appendChild(link)
        }
        fonts?.addEventListener?.("loadingdone", bump)
        fonts?.ready?.then(bump, () => {})

        let gl: WebGL2RenderingContext | null = null
        let prog: WebGLProgram | null = null
        let tex: WebGLTexture | null = null
        const U: Record<string, WebGLUniformLocation> = {}
        const stopBuf = new Float32Array(MAX_COLORS * 4)
        const edgeBuf = new Float32Array(MAX_EDGES)
        const segBuf = new Float32Array((MAX_EDGES + 1) * 4)
        const letterBuf = new Float32Array(MAX_LETTERS * 4)
        try {
            gl = canvas.getContext("webgl2", {
                antialias: false,
                alpha: false,
                premultipliedAlpha: false,
                preserveDrawingBuffer: true,
            }) as WebGL2RenderingContext | null
            if (!gl) throw new Error("webgl2 unavailable")
            const sh = (type: number, src: string) => {
                const s = gl!.createShader(type)!
                gl!.shaderSource(s, src)
                gl!.compileShader(s)
                if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) || "shader")
                return s
            }
            prog = gl.createProgram()!
            gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
            gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
            gl.linkProgram(prog)
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link")
            gl.useProgram(prog)
            for (const name of [
                "uRes", "uOff", "uPx", "uCam", "uRot", "uBox", "uSdf", "uBevel", "uIor", "uDisp", "uEnv",
                "uRim", "uRefl", "uTint", "uColor", "uAbsorb", "uExposure", "uBg", "uGrain", "uVig", "uTime", "uPtr",
                "uMode", "uStops", "uStopN", "uGradAng", "uHalf", "uEdge", "uEdgeN", "uSeg",
            ]) {
                const loc = gl.getUniformLocation(prog, name)
                if (!loc) throw new Error(`uniform ${name} not found`)
                U[name] = loc
            }
            tex = gl.createTexture()
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
        } catch (e) {
            console.warn("[GlassWord]", e)
            setFailed(true)
            return () => fonts?.removeEventListener?.("loadingdone", bump)
        }

        const ro = new ResizeObserver(() => {
            S.w = root.offsetWidth
            S.h = root.offsetHeight
        })
        ro.observe(root)

        const onMove = (e: PointerEvent) => {
            const w = root.offsetWidth || 1, h = root.offsetHeight || 1
            S.tpx = Math.max(-1, Math.min(1, (e.offsetX / w) * 2 - 1))
            S.tpy = Math.max(-1, Math.min(1, -((e.offsetY / h) * 2 - 1)))
            S.tover = 1
        }
        const onEnter = () => { S.tover = 1 }
        const onLeave = () => { S.tover = 0; S.tpx = 0; S.tpy = 0 }
        let pressed = false
        const onDown = (e: PointerEvent) => {
            pressed = true
            S.dragging = true
            S.lastX = e.clientX
            S.lastY = e.clientY
            S.lastT = performance.now()
            S.moved = 0
            S.vTheta = 0
            S.vYaw = 0
        }
        const onDrag = (e: PointerEvent) => {
            if (!S.dragging) return
            const dx = e.clientX - S.lastX, dy = e.clientY - S.lastY
            const t = performance.now()
            const dtMs = Math.max(8, t - S.lastT)
            S.lastX = e.clientX
            S.lastY = e.clientY
            S.lastT = t
            S.moved += Math.abs(dx) + Math.abs(dy)
            const sens = (Math.max(0, Math.min(100, propsRef.current.dragSensitivity ?? 50)) / 50) * 0.4
            if (sens <= 0) return
            S.dTheta += dy * sens
            S.dYaw += dx * sens
            const cap = 1500
            S.vTheta = S.vTheta * 0.5 + 0.5 * Math.max(-cap, Math.min(cap, ((dy * sens) / dtMs) * 1000))
            S.vYaw = S.vYaw * 0.5 + 0.5 * Math.max(-cap, Math.min(cap, ((dx * sens) / dtMs) * 1000))
        }
        const onUp = () => {
            pressed = false
            if (!S.dragging) return
            S.dragging = false
            if (performance.now() - S.lastT > 80) { S.vTheta = 0; S.vYaw = 0 }
            if (S.moved < 5 && S.pressStart < 0) S.pressStart = performance.now()
        }
        window.addEventListener("pointermove", onDrag)
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        let raf = 0
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const g = gl!
            const dt = S.last < 0 ? 0 : Math.min((now - S.last) / 1000, 1 / 20)
            S.last = now
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const f = p.font ?? {}
            const fam = f.fontFamily ? `${f.fontFamily}, ${STACK}` : STACK
            const weight = f.fontWeight ?? 900
            const fstyle = f.fontStyle ?? "normal"
            const txt = p.text ?? "Elysian"
            const key = `${txt}|${fstyle}|${weight}|${fam}|${adv.tracking}|${S.fontsV}`
            if (key !== S.key) {
                S.key = key
                const sdf = buildSdf(txt, (px) => `${fstyle} ${weight} ${px}px ${fam}`, adv.tracking)
                S.sdf = sdf
                g.bindTexture(g.TEXTURE_2D, tex)
                g.texImage2D(g.TEXTURE_2D, 0, g.R16F, sdf.w, sdf.h, 0, g.RED, g.FLOAT, sdf.data)
            }
            const sdf = S.sdf!

            const reduced = !!mq?.matches
            const spd = Math.max(0, Math.min(100, p.speed ?? 50))
            if (!reduced) S.tl += dt * 1000 * (spd / 50)

            const hv = Math.max(0, Math.min(2, adv.hover / 50))
            const k = 1 - Math.exp(-dt * 6)
            S.px += (S.tpx - S.px) * k
            S.py += (S.tpy - S.py) * k
            S.over += (S.tover - S.over) * k

            let theta = reduced ? 0 : thetaAt(S.tl, adv)
            if (S.pressStart >= 0) {
                const u = (now - S.pressStart) / 1100
                if (u >= 1 && !pressed) S.pressStart = -1
                else if (!reduced && hv > 0)
                    theta += 360 * bezier(adv.ease1X1 / 100, adv.ease1Y1 / 100, adv.ease1X2 / 100, adv.ease1Y2 / 100, Math.min(1, u))
            }
            if (!S.dragging) {
                S.dTheta += S.vTheta * dt
                S.dYaw += S.vYaw * dt
                const fr = Math.exp(-dt * 4)
                S.vTheta *= fr
                S.vYaw *= fr
                const back = 1 - Math.exp(-dt * 3)
                S.dTheta += (Math.round(S.dTheta / 360) * 360 - S.dTheta) * back
                S.dYaw += (0 - S.dYaw) * back
            }
            theta += S.dTheta
            const tilt = reduced ? 0 : hv * S.over
            const yaw = (adv.yaw + S.dYaw + S.px * 8 * tilt) * DEG
            const pitch = (adv.pitch + S.py * 8 * tilt) * DEG
            const M = mul(mul(mul(rx(pitch), ry(yaw)), rz(adv.roll * DEG)), rx(theta * DEG))

            const w = Math.max(1, S.w), h = Math.max(1, S.h)
            const dpr = Math.min(2, window.devicePixelRatio || 1) * Math.max(0.25, Math.min(1, adv.renderScale / 100))
            const cw = Math.max(1, Math.round(w * dpr)), ch = Math.max(1, Math.round(h * dpr))
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw
                canvas.height = ch
            }
            g.viewport(0, 0, cw, ch)

            const effSize = Math.max(4, Math.min(p.size ?? 110, (w * 0.9) / (2 * sdf.halfText), (h * 0.7) / (2 * sdf.hy)))
            const hd = Math.max(0.02, (CAP * Math.max(1, p.depth ?? 45)) / 100 / 2)
            const bevel = Math.max(0.002, Math.min(adv.bevel / 100, hd * 0.8))
            const bg = parseColor(p.background, [0, 0, 0])
            const tint = parseColor(adv.tint, [0.92, 0.95, 0.93])
            const tcol = parseColor(p.color ?? "rgba(255, 255, 255, 0)", [1, 1, 1, 0])

            const mode = p.colorMode === "gradient" ? 1 : p.colorMode === "multi" ? 2 : 0
            const list: any[] = Array.isArray(p.colors) && p.colors.length ? p.colors : ["#FFFFFF"]
            const nStops = Math.min(MAX_COLORS, list.length)
            for (let i = 0; i < MAX_COLORS; i++) {
                const c = parseColor(list[Math.min(i, nStops - 1)], [1, 1, 1, 1])
                stopBuf[i * 4] = c[0]
                stopBuf[i * 4 + 1] = c[1]
                stopBuf[i * 4 + 2] = c[2]
                stopBuf[i * 4 + 3] = c[3] ?? 1
            }
            // Multi: one colour row per letter (up to 8); longer words reuse them in turn.
            // The group arrives undefined until it is opened, so each row falls back.
            const lc = p.letterColors ?? {}
            for (let i = 0; i < MAX_LETTERS; i++) {
                const c = parseColor(lc[LETTER_KEYS[i]] ?? LETTER_FALLBACKS[i], [1, 1, 1, 1])
                letterBuf[i * 4] = c[0]
                letterBuf[i * 4 + 1] = c[1]
                letterBuf[i * 4 + 2] = c[2]
                letterBuf[i * 4 + 3] = c[3] ?? 1
            }
            const nLetters = Math.max(1, Math.min(MAX_LETTERS, letterCount(txt)))
            const nEdges = Math.min(MAX_EDGES, sdf.edges.length)
            for (let i = 0; i < MAX_EDGES; i++) edgeBuf[i] = i < nEdges ? sdf.edges[i] : 1e9
            for (let s = 0; s <= MAX_EDGES; s++) {
                const li = sdf.segLetter[Math.min(s, sdf.segLetter.length - 1)] ?? 0
                const o = (li % nLetters) * 4
                segBuf[s * 4] = letterBuf[o]
                segBuf[s * 4 + 1] = letterBuf[o + 1]
                segBuf[s * 4 + 2] = letterBuf[o + 2]
                segBuf[s * 4 + 3] = letterBuf[o + 3]
            }

            // Centre the word's on-screen silhouette, not its 3D origin: at the rest
            // pose the yaw/pitch/roll and perspective push the projected letters off
            // centre. Project the ink box at rest and shift by its bounds' midpoint.
            // Rest pose only, so the tumble itself does not wobble the position.
            const camD = Math.max(2, adv.camera / 100)
            const pxD = effSize * dpr
            const R = mul(mul(rx(adv.pitch * DEG), ry(adv.yaw * DEG)), rz(adv.roll * DEG))
            let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9
            for (let i = 0; i < 8; i++) {
                const ox = (i & 1 ? 1 : -1) * sdf.halfText
                const oy = (i & 2 ? 1 : -1) * sdf.inkY
                const oz = (i & 4 ? 1 : -1) * hd
                const wx = R[0] * ox + R[1] * oy + R[2] * oz
                const wy = R[3] * ox + R[4] * oy + R[5] * oz
                const wz = R[6] * ox + R[7] * oy + R[8] * oz
                const s = (pxD * camD) / Math.max(0.1, camD - wz)
                const sx = wx * s, sy = wy * s
                if (sx < mnx) mnx = sx
                if (sx > mxx) mxx = sx
                if (sy < mny) mny = sy
                if (sy > mxy) mxy = sy
            }
            const cx = (mnx + mxx) / 2, cy = (mny + mxy) / 2

            g.useProgram(prog)
            g.activeTexture(g.TEXTURE0)
            g.bindTexture(g.TEXTURE_2D, tex)
            g.uniform2f(U.uRes, cw, ch)
            g.uniform2f(U.uOff, (adv.offsetX / 100) * w * dpr - cx, -(adv.offsetY / 100) * h * dpr - cy)
            g.uniform1f(U.uPx, effSize * dpr)
            g.uniform1f(U.uCam, Math.max(2, adv.camera / 100))
            g.uniformMatrix3fv(U.uRot, false, new Float32Array(M))
            g.uniform3f(U.uBox, sdf.hx, sdf.hy, hd)
            g.uniform1i(U.uSdf, 0)
            g.uniform1f(U.uBevel, bevel)
            g.uniform1f(U.uIor, Math.max(1.05, adv.ior / 100))
            g.uniform1f(U.uDisp, (Math.max(0, Math.min(100, p.dispersion ?? 40)) / 100) * 0.05)
            g.uniform1f(U.uEnv, adv.envLight / 100)
            g.uniform1f(U.uRim, adv.rim / 100)
            g.uniform1f(U.uRefl, adv.reflection / 100)
            g.uniform3f(U.uTint, tint[0], tint[1], tint[2])
            g.uniform4f(U.uColor, tcol[0], tcol[1], tcol[2], tcol[3] ?? 1)
            g.uniform1f(U.uAbsorb, (adv.absorb / 100) * 1.5)
            g.uniform1f(U.uExposure, adv.exposure / 100)
            g.uniform3f(U.uBg, bg[0], bg[1], bg[2])
            g.uniform1f(U.uGrain, adv.grain / 100)
            g.uniform1f(U.uVig, adv.vignette / 100)
            g.uniform1f(U.uTime, now / 1000)
            g.uniform3f(U.uPtr, S.px, S.py, reduced ? 0 : S.over * hv * 0.8)
            g.uniform1i(U.uMode, mode)
            g.uniform4fv(U.uStops, stopBuf)
            g.uniform1i(U.uStopN, nStops)
            g.uniform1f(U.uGradAng, (p.gradientAngle ?? 0) * DEG)
            g.uniform2f(U.uHalf, sdf.halfText, sdf.inkY)
            g.uniform1fv(U.uEdge, edgeBuf)
            g.uniform1i(U.uEdgeN, nEdges)
            g.uniform4fv(U.uSeg, segBuf)
            g.drawArrays(g.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onEnter)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            window.removeEventListener("pointermove", onDrag)
            fonts?.removeEventListener?.("loadingdone", bump)
            if (gl) {
                if (tex) gl.deleteTexture(tex)
                if (prog) gl.deleteProgram(prog)
            }
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
                touchAction: "none",
                background,
                ...style,
            }}
        >
            {failed ? (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: (fillRgba[3] ?? 1) > 0.5 ? color : "#C8CCC7",
                        fontFamily: font.fontFamily ? `${font.fontFamily}, ${STACK}` : STACK,
                        fontWeight: font.fontWeight ?? 900,
                        fontSize: size,
                        letterSpacing: "-0.03em",
                        textShadow: "0 1px 0 #828782, 0 2px 0 #454843, 0 3px 0 #282B28",
                    }}
                >
                    {text}
                </div>
            ) : (
                <canvas
                    ref={canvasRef}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
                />
            )}
        </div>
    )
}

// Control order arranged in the builder.
