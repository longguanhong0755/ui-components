"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    seed: 7,
    loopMs: 6960,
    bendAmount: 15,
    stemSway: 150,
    swayMix: 40,
    gustSize: 100,
    lean: 7,
    moundHeight: 4,
    moundSize: 100,
    bladeLength: 100,
    bladeWidth: 100,
    focusBlur: 5,
    haze: 30,
    rimStrength: 80,
    litColor: "#BE81B3",
    hotColor: "#C9539F",
    shadowColor: "#2C1945",
    rootColor: "#201335",
    rockColor: "#3A302F",
    rockLitColor: "#6B5B57",
    rockDarkColor: "#1A1418",
    stemColor: "#8A5789",
    glowColor: "#2A1F3D",
    glowAmount: 40,
    flowerSize: 100,
    hover: 50,
    grain: 0,
    vignette: 0,
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

// ── helpers ──

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)
const clamp01 = (v: number) => clamp(v, 0, 1)
const sstep = (a: number, b: number, x: number) => {
    const t = clamp01((x - a) / (b - a))
    return t * t * (3 - 2 * t)
}
const num = (v: any, f: number) => (typeof v === "number" && Number.isFinite(v) ? v : f)

function parseColor(input: any, fallback = "#000000"): [number, number, number] {
    let s = typeof input === "string" ? input.trim() : ""
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
    }
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (m) {
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && p.every((x) => !isNaN(x))) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return input === fallback ? [0, 0, 0] : parseColor(fallback, fallback)
}

function mix3(a: number[], b: number[], t: number): [number, number, number] {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function mulberry32(a: number) {
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function hash2(x: number, y: number, s: number) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2246822519 | 0)) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
}

function vnoise(x: number, y: number, s: number) {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = x - ix
    const fy = y - iy
    const ux = fx * fx * (3 - 2 * fx)
    const uy = fy * fy * (3 - 2 * fy)
    const a = hash2(ix, iy, s)
    const b = hash2(ix + 1, iy, s)
    const c = hash2(ix, iy + 1, s)
    const d = hash2(ix + 1, iy + 1, s)
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

function mound(wx: number, wz: number, seed: number) {
    const f =
        vnoise(wx, wz, seed) * 0.6 +
        vnoise(wx * 2.1 + 5.2, wz * 2.1 + 1.3, seed + 1) * 0.28 +
        vnoise(wx * 4.3 + 2.7, wz * 4.3 + 9.1, seed + 2) * 0.12
    return clamp01((f - 0.5) * 1.9 + 0.5)
}

// Horizon of the grass, frame fraction (y down): 0.656 on the left rising to ~0.559 from x 0.66.
function ridge(x: number) {
    const s = clamp01(x / 0.66)
    const e = s * s * (3 - 2 * s)
    return 0.656 - 0.097 * e + 0.007 * Math.sin(x * 23 + 1.3) + 0.005 * Math.sin(x * 41 + 0.4)
}

function lowerBound(a: Float32Array, n: number, y: number) {
    let lo = 0
    let hi = n
    while (lo < hi) {
        const m = (lo + hi) >> 1
        if (a[m] < y) lo = m + 1
        else hi = m
    }
    return lo
}

// ── scene data (frame fractions, measured from the reference) ──

const ROCK_SHAPES: Record<string, { pts: number[][]; peak: number[] }> = {
    boulder: { pts: [[0, 1], [0.02, 0.62], [0.09, 0.32], [0.22, 0.1], [0.42, 0], [0.66, 0.03], [0.84, 0.14], [0.95, 0.38], [1, 0.72], [1, 1]], peak: [0.5, 0.32] },
    wedge: { pts: [[0, 1], [0.06, 0.68], [0.2, 0.34], [0.4, 0.04], [0.5, 0], [0.62, 0.12], [0.8, 0.42], [0.94, 0.7], [1, 1]], peak: [0.47, 0.35] },
    small: { pts: [[0, 1], [0.08, 0.5], [0.3, 0.1], [0.58, 0], [0.84, 0.25], [1, 0.7], [1, 1]], peak: [0.55, 0.38] },
    slab: { pts: [[0, 1], [0.06, 0.45], [0.28, 0.12], [0.66, 0], [0.9, 0.2], [1, 0.6], [1, 1]], peak: [0.6, 0.4] },
    pointed: { pts: [[0, 1], [0.15, 0.5], [0.42, 0.04], [0.55, 0], [0.78, 0.4], [1, 1]], peak: [0.5, 0.4] },
    edge: { pts: [[0, 1], [0, 0.15], [0.45, 0], [0.85, 0.3], [1, 1]], peak: [0.4, 0.4] },
}

const ROCKS = [
    { x0: 0.283, x1: 0.332, y0: 0.648, y1: 0.69, shape: "small" },
    { x0: 0.545, x1: 0.635, y0: 0.596, y1: 0.65, shape: "slab" },
    { x0: -0.004, x1: 0.03, y0: 0.656, y1: 0.722, shape: "edge" },
    { x0: -0.01, x1: 0.166, y0: 0.607, y1: 0.78, shape: "wedge" },
    { x0: 0.693, x1: 0.889, y0: 0.545, y1: 0.735, shape: "boulder" },
    { x0: 0.322, x1: 0.389, y0: 0.694, y1: 0.78, shape: "small" },
    { x0: 0.435, x1: 0.508, y0: 0.735, y1: 0.783, shape: "slab" },
    { x0: 0.557, x1: 0.598, y0: 0.762, y1: 0.828, shape: "pointed" },
    { x0: 0.815, x1: 0.923, y0: 0.811, y1: 1.04, shape: "small" },
]

const CLUMPS = [
    { x0: 0.186, x1: 0.227, yTop: 0.71, yBase: 0.79, heads: 5, r: 3, spread: 0.6, twig: false, w: 0.8 },
    { x0: 0.347, x1: 0.383, yTop: 0.566, yBase: 0.7, heads: 6, r: 2.4, spread: 0.35, twig: true, w: 0.7 },
    { x0: 0.513, x1: 0.523, yTop: 0.616, yBase: 0.66, heads: 2, r: 2.2, spread: 0.3, twig: false, w: 0.7 },
    { x0: 0.572, x1: 0.592, yTop: 0.514, yBase: 0.61, heads: 3, r: 2.6, spread: 0.35, twig: true, w: 0.7 },
    { x0: 0.677, x1: 0.689, yTop: 0.52, yBase: 0.575, heads: 2, r: 2.4, spread: 0.3, twig: false, w: 0.7 },
    { x0: 0.705, x1: 0.766, yTop: 0.434, yBase: 0.575, heads: 5, r: 3.9, spread: 0.3, twig: true, w: 0.8 },
    { x0: 0.77, x1: 0.821, yTop: 0.607, yBase: 0.725, heads: 5, r: 6.5, spread: 0.58, twig: false, w: 1.0 },
    { x0: 0.852, x1: 0.884, yTop: 0.507, yBase: 0.575, heads: 3, r: 2.6, spread: 0.35, twig: true, w: 0.7 },
    { x0: 0.962, x1: 0.977, yTop: 0.514, yBase: 0.585, heads: 2, r: 2.4, spread: 0.3, twig: false, w: 0.7 },
]

// ── bakes ──

const STRIDE = 13
const STRIP_VERTS = 14

function bakeBlades(count: number, seed: number, moundAmp: number, moundSize: number, leanDeg: number) {
    const rnd = mulberry32(seed * 7919 + 13)
    const raw = new Float32Array(count * STRIDE)
    const keys = new Float32Array(count)
    const ms = 100 / Math.max(moundSize, 10)
    const leanBase = (leanDeg * Math.PI) / 180
    for (let i = 0; i < count; i++) {
        const d = rnd() < 0.6 ? 1 - Math.sqrt(1 - rnd()) : rnd()
        const x = -0.03 + 1.06 * rnd()
        const rg = ridge(x)
        const persp = 0.28 + 0.72 * d
        const wx = ((x - 0.5) / persp) * 6 * ms
        const wz = d * 9 * ms
        const H = mound(wx, wz, seed)
        const Hr = mound(wx + 0.25, wz, seed)
        const yb = rg + (1.04 - rg) * Math.pow(d, 1.1) - H * moundAmp * (0.25 + 0.75 * d)
        const height = (0.011 + 0.058 * Math.pow(d, 1.5)) * (0.6 + 0.8 * rnd()) * (0.7 + 0.6 * H)
        const width = 0.8 + 2.4 * d * d + rnd() * 0.6
        const lean = leanBase + (rnd() - 0.5) * 0.55 + (Hr - H) * 1.2
        const corner = 1 - 0.45 * sstep(0.6, 1.15, (1 - x) * 0.65 + d * 0.65)
        const lit = clamp01((0.08 + 1.1 * sstep(0.3, 0.8, H) - (Hr - H) * 2.0 + (rnd() - 0.5) * 0.25) * corner)
        const band = Math.exp(-Math.pow((yb - 0.8) / 0.09, 2)) * sstep(0.18, 0.35, x) * (1 - sstep(0.82, 0.97, x))
        const rim = clamp01((0.25 + 0.75 * band) * (0.35 + 0.65 * sstep(0.4, 0.85, H)) + (rnd() - 0.5) * 0.2)
        const hot = sstep(0.35, 0.75, vnoise(wx * 0.7 + 31, wz * 0.7 + 7, seed + 5))
        const o = i * STRIDE
        raw[o] = x
        raw[o + 1] = yb
        raw[o + 2] = height
        raw[o + 3] = width
        raw[o + 4] = lean
        raw[o + 5] = lit
        raw[o + 6] = rim
        raw[o + 7] = hot
        raw[o + 8] = rnd() * Math.PI * 2
        raw[o + 9] = 3 + Math.floor(rnd() * 5)
        raw[o + 10] = Math.pow(1 - d, 4)
        raw[o + 11] = sstep(0.84, 1.0, d)
        raw[o + 12] = (0.85 + 0.25 * rnd()) * Math.sqrt(corner)
        keys[i] = yb
    }
    const idx = new Uint32Array(count)
    for (let i = 0; i < count; i++) idx[i] = i
    idx.sort((a, b) => keys[a] - keys[b])
    const data = new Float32Array(count * STRIDE)
    const sorted = new Float32Array(count)
    for (let i = 0; i < count; i++) {
        const s = idx[i]
        data.set(raw.subarray(s * STRIDE, s * STRIDE + STRIDE), i * STRIDE)
        sorted[i] = keys[s]
    }
    return { data, keys: sorted }
}

function bakeGround(seed: number, moundAmp: number, moundSize: number) {
    const N = 160
    const ms = 100 / Math.max(moundSize, 10)
    const out = new Float32Array((N + 1) * 6)
    for (let i = 0; i <= N; i++) {
        const x = -0.02 + (1.04 * i) / N
        const wx = ((x - 0.5) / 0.28) * 6 * ms
        const top = ridge(x) - mound(wx, 0, seed) * moundAmp * 0.25 + 0.012
        out.set([x, top, 0, x, 1.02, 1], i * 6)
    }
    return out
}

function bakeRocks(seed: number) {
    const rnd = mulberry32(seed * 131 + 5)
    const out: number[] = []
    const ranges: { first: number; count: number; y: number }[] = []
    const L = [0.75, -0.66]
    const ll = Math.hypot(L[0], L[1])
    L[0] /= ll
    L[1] /= ll
    ROCKS.forEach((rk, ri) => {
        const first = out.length / 6
        const shape = ROCK_SHAPES[rk.shape]
        const pts: number[][] = []
        const base = shape.pts
        for (let i = 0; i < base.length; i++) {
            const a = base[i]
            const b = base[(i + 1) % base.length]
            pts.push(a)
            if (i < base.length - 1) {
                const mx = (a[0] + b[0]) / 2
                const my = (a[1] + b[1]) / 2
                const dx = b[0] - a[0]
                const dy = b[1] - a[1]
                const l = Math.hypot(dx, dy) || 1
                const j = (rnd() - 0.5) * 0.08
                pts.push([mx - (dy / l) * j, my + (dx / l) * j])
            }
        }
        const C = shape.peak
        const Q = pts.map((p) => {
            const t = 0.45 + (rnd() - 0.5) * 0.2
            return [p[0] + (C[0] - p[0]) * t + (rnd() - 0.5) * 0.04, p[1] + (C[1] - p[1]) * t + (rnd() - 0.5) * 0.04]
        })
        const cx = (rk.x0 + rk.x1) / 2
        const rg = ridge(cx)
        const dd = Math.pow(clamp01((rk.y1 - rg) / (1.04 - rg)), 1 / 1.1)
        const haze = Math.pow(1 - dd, 4)
        const toF = (p: number[]) => [rk.x0 + p[0] * (rk.x1 - rk.x0), rk.y0 + p[1] * (rk.y1 - rk.y0)]
        const tri = (a: number[], b: number[], c: number[], inner: boolean) => {
            const gx = (a[0] + b[0] + c[0]) / 3 - C[0]
            const gy = (a[1] + b[1] + c[1]) / 3 - C[1]
            const ax = gx * (rk.x1 - rk.x0) * 1.5
            const ay = gy * (rk.y1 - rk.y0)
            const l = Math.hypot(ax, ay) || 1
            let facing = (ax / l) * L[0] + (ay / l) * L[1]
            if (inner) facing *= 0.5
            const shade = clamp(0.5 + 0.45 * facing + (rnd() - 0.5) * 0.28, 0.04, 1)
            for (const p of [a, b, c]) {
                const f = toF(p)
                out.push(f[0], f[1], shade, p[1], haze, ri * 1.7)
            }
        }
        const n = pts.length
        for (let i = 0; i < n; i++) {
            const i2 = (i + 1) % n
            tri(pts[i], pts[i2], Q[i2], false)
            tri(pts[i], Q[i2], Q[i], false)
            tri(C, Q[i], Q[i2], true)
        }
        ranges.push({ first, count: out.length / 6 - first, y: rk.y1 - 0.12 * (rk.y1 - rk.y0) })
    })
    return { data: new Float32Array(out), ranges }
}

function bakeFlowers(seed: number) {
    const rnd = mulberry32(seed * 31 + 7)
    const out: number[] = []
    const ranges: { first: number; count: number; y: number }[] = []
    CLUMPS.forEach((c, ci) => {
        const first = out.length / 12
        const len = c.yBase - c.yTop
        const bx0 = (c.x0 + c.x1) / 2
        const cs = ci * 3.1
        const hOf = (y: number) => clamp((c.yBase - y) / len, 0, 1.3)
        const vert = (px: number, py: number, ox: number, oy: number, kind: number, ux: number, uy: number, seedv: number) => {
            out.push(px, py, ox, oy, hOf(py), kind, len, seedv, bx0, c.yBase, ux, uy)
        }
        const seg = (ax: number, ay: number, bx: number, by: number, hw: number) => {
            const dx = (bx - ax) * 1200
            const dy = (by - ay) * 800
            const l = Math.hypot(dx, dy) || 1
            const nx = (-dy / l) * hw
            const ny = (dx / l) * hw
            vert(ax, ay, nx, ny, 0, 1, 0, cs)
            vert(ax, ay, -nx, -ny, 0, -1, 0, cs)
            vert(bx, by, nx, ny, 0, 1, 0, cs)
            vert(bx, by, nx, ny, 0, 1, 0, cs)
            vert(ax, ay, -nx, -ny, 0, -1, 0, cs)
            vert(bx, by, -nx, -ny, 0, -1, 0, cs)
        }
        const head = (hx: number, hy: number, r: number, s: number) => {
            const R = r * 1.25
            const cs2 = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]
            for (const k of cs2) vert(hx, hy, k[0] * R, k[1] * R, 1, k[0] * 1.25, k[1] * 1.25, s)
        }
        const hw = 0.75 * c.w + 0.6
        for (let j = 0; j < c.heads; j++) {
            const hx = c.x0 + (c.x1 - c.x0) * (j === 0 ? 0.5 + (rnd() - 0.5) * 0.4 : rnd())
            const hy = j === 0 ? c.yTop : c.yTop + len * c.spread * rnd()
            const bx = bx0 + (rnd() - 0.5) * (c.x1 - c.x0) * 0.25
            const by = c.yBase
            const kx = bx + (hx - bx) * 0.2
            const ky = (by + hy) / 2
            const P: number[][] = []
            for (let s = 0; s <= 9; s++) {
                const t = s / 9
                const u = 1 - t
                P.push([u * u * bx + 2 * u * t * kx + t * t * hx, u * u * by + 2 * u * t * ky + t * t * hy])
            }
            for (let s = 0; s < 9; s++) seg(P[s][0], P[s][1], P[s + 1][0], P[s + 1][1], hw)
            if (c.twig && rnd() < 0.8) {
                const at = P[4 + Math.floor(rnd() * 4)]
                const dir = rnd() < 0.5 ? -1 : 1
                const tx = at[0] + dir * (0.006 + rnd() * 0.01)
                const ty = at[1] - (0.012 + rnd() * 0.014)
                seg(at[0], at[1], tx, ty, hw * 0.8)
                head(tx, ty, c.r * 0.55, rnd() * 10)
            }
            head(hx, hy, c.r * (0.85 + 0.4 * rnd()), rnd() * 10)
        }
        ranges.push({ first, count: out.length / 12 - first, y: c.yBase })
    })
    return { data: new Float32Array(out), ranges }
}

// ── shaders ──

const WIND_GLSL = `
uniform float uGust;
uniform float uSway;
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float pnoise(vec2 p, float P){
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float x0 = mod(i.x, P); float x1 = mod(i.x + 1.0, P);
  float a = hash21(vec2(x0, i.y)); float b = hash21(vec2(x1, i.y));
  float c = hash21(vec2(x0, i.y + 1.0)); float d = hash21(vec2(x1, i.y + 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}
float windAt(vec2 p, float t, float ph, float k){
  const float TAU = 6.2831853;
  float g = 0.65 * pnoise(vec2(p.x * 2.5 * uGust - t * 4.0, p.y * 3.5 * uGust + 0.7), 4.0)
          + 0.35 * pnoise(vec2(p.x * 5.0 * uGust - t * 8.0, p.y * 7.0 * uGust + 3.1), 8.0);
  float s = 0.78 + 0.22 * cos(TAU * 3.0 * (t - 0.79));
  float sway = sin(TAU * k * t + ph);
  return s * mix(g * 1.3, sway, uSway) + 0.2;
}
`

const BLADE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aV;
layout(location=1) in vec4 aA;
layout(location=2) in vec4 aB;
layout(location=3) in vec4 aC;
layout(location=4) in float aS;
uniform vec2 uRes;
uniform float uT;
uniform float uAmp;
uniform float uLen;
uniform float uWidth;
uniform float uBlurPx;
uniform float uHazeAmt;
uniform vec4 uMouse;
${WIND_GLSL}
out float vH; out float vSide; out float vLit; out float vRim; out float vHot;
out float vHaze; out float vAlpha; out float vSoft; out float vShade; out float vLight;
void main(){
  float h = aV.x;
  float unit = uRes.y / 800.0;
  float w = windAt(aA.xy, uT, aC.x, aC.y);
  vec2 dm = (aA.xy - uMouse.xy) * vec2(uRes.x / uRes.y, 1.0);
  float near = exp(-dot(dm, dm) / 0.04);
  w += near * uMouse.z * (dm.x * inversesqrt(dm.x * dm.x + 0.0064)) * (1.8 + 1.6 * uMouse.w);
  float bend = w * uAmp;
  float len = aA.z * uRes.y * uLen;
  float sl = sin(aB.x); float cl = cos(aB.x);
  float hh = h * h;
  vec2 p = aA.xy * uRes + vec2(len * (sl * h + bend * hh), -len * h * cl * (1.0 - 0.35 * bend * bend * hh));
  vec2 tang = normalize(vec2(sl + 2.0 * bend * h, -cl) + vec2(1e-5));
  vec2 nrm = vec2(-tang.y, tang.x);
  float halfW = 0.5 * aA.w * uWidth * unit * pow(1.0 - h, 0.75);
  float blur = aC.w * uBlurPx * unit;
  float wTot = halfW + 0.5 + blur * 0.5;
  p += nrm * aV.y * wTot;
  vSoft = clamp((wTot - halfW) / wTot, 0.02, 1.0);
  vAlpha = clamp(0.45 + halfW, 0.0, 1.0) * mix(1.0, 0.55, aC.w);
  vH = h; vSide = aV.y; vLit = aB.y; vHot = aB.w;
  vRim = aB.z * (1.0 + near * uMouse.z * 0.6);
  vHaze = aC.z * uHazeAmt; vShade = aS;
  vLight = clamp(0.5 + 0.45 * w, 0.0, 1.0);
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
}`

const BLADE_FS = `#version 300 es
precision highp float;
uniform vec3 uRoot; uniform vec3 uShadow; uniform vec3 uGrass; uniform vec3 uLit;
uniform vec3 uHot; uniform vec3 uRim; uniform vec3 uHaze; uniform float uRimAmt;
in float vH; in float vSide; in float vLit; in float vRim; in float vHot;
in float vHaze; in float vAlpha; in float vSoft; in float vShade; in float vLight;
out vec4 o;
void main(){
  float h = vH;
  vec3 body = mix(uShadow, uGrass, smoothstep(0.0, 0.55, vLit));
  body = mix(body, mix(uLit, uHot, vHot), smoothstep(0.45, 1.0, vLit));
  vec3 col = mix(uRoot, body, smoothstep(0.0, 0.6, h + vLit * 0.2));
  float rim = vRim * smoothstep(0.35, 1.0, h) * (0.45 + 0.75 * vLight) * uRimAmt;
  col = mix(col, uRim, clamp(rim, 0.0, 1.0));
  col *= vShade;
  col = mix(col, uHaze, clamp(vHaze, 0.0, 1.0));
  float cov = clamp((1.0 - abs(vSide)) / max(vSoft, 0.02), 0.0, 1.0);
  float a = cov * vAlpha * (1.0 - 0.45 * smoothstep(0.8, 1.0, h));
  o = vec4(col * a, a);
}`

const GROUND_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aP;
layout(location=1) in float aT;
out float vT;
void main(){ vT = aT; gl_Position = vec4(aP.x * 2.0 - 1.0, 1.0 - aP.y * 2.0, 0.0, 1.0); }`

const GROUND_FS = `#version 300 es
precision highp float;
uniform vec3 uRoot; uniform vec3 uShadow; uniform vec3 uHaze; uniform float uHazeAmt;
in float vT; out vec4 o;
void main(){
  vec3 top = mix(uShadow, uHaze, uHazeAmt * 0.5);
  o = vec4(mix(top, uRoot, smoothstep(0.0, 0.5, vT)), 1.0);
}`

const FULL_VS = `#version 300 es
precision highp float;
out vec2 vUV;
void main(){
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  vUV = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`

const SKY_FS = `#version 300 es
precision highp float;
uniform vec3 uBg; uniform vec3 uGlow; uniform float uGlowAmt;
in vec2 vUV; out vec4 o;
void main(){
  float y = 1.0 - vUV.y;
  o = vec4(mix(uBg, uGlow, uGlowAmt * pow(smoothstep(0.0, 0.62, y), 1.6)), 1.0);
}`

const OVERLAY_FS = `#version 300 es
precision highp float;
uniform float uGrain; uniform float uVig; uniform float uSeed; uniform vec2 uRes;
in vec2 vUV; out vec4 o;
float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 c = (vUV - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float v = uVig * smoothstep(0.35, 1.05, length(c) * 1.1);
  float n = h1(gl_FragCoord.xy + vec2(uSeed, uSeed * 0.37)) - 0.5;
  float g = uGrain * 0.35;
  vec3 add = vec3(max(n, 0.0) * 2.0 * g);
  float a = v + (1.0 - v) * max(-n, 0.0) * 2.0 * g;
  o = vec4(add * (1.0 - v), a);
}`

const ROCK_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aP;
layout(location=1) in vec4 aI;
out vec2 vP; out float vShade; out float vY; out float vHaze; out float vSeed;
void main(){
  vP = aP; vShade = aI.x; vY = aI.y; vHaze = aI.z; vSeed = aI.w;
  gl_Position = vec4(aP.x * 2.0 - 1.0, 1.0 - aP.y * 2.0, 0.0, 1.0);
}`

const ROCK_FS = `#version 300 es
precision highp float;
uniform vec3 uRockDark; uniform vec3 uRock; uniform vec3 uRockLit; uniform vec3 uHaze;
uniform float uHazeAmt; uniform float uAspect;
in vec2 vP; in float vShade; in float vY; in float vHaze; in float vSeed;
out vec4 o;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y); }
void main(){
  vec3 col = mix(uRockDark, uRock, smoothstep(0.0, 0.5, vShade));
  col = mix(col, uRockLit, smoothstep(0.5, 1.0, vShade));
  vec2 q = vP * vec2(uAspect, 1.0) * 160.0 + vSeed * 17.0;
  float n = vn(q) * 0.6 + vn(q * 2.7) * 0.4;
  col *= 0.82 + 0.36 * n;
  col *= mix(1.0, 0.45, smoothstep(0.55, 1.0, vY));
  col = mix(col, uHaze, clamp(vHaze * uHazeAmt, 0.0, 1.0));
  o = vec4(col, 1.0);
}`

const FLOWER_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aP;
layout(location=1) in vec2 aO;
layout(location=2) in vec4 aI;
layout(location=3) in vec4 aJ;
uniform vec2 uRes; uniform float uT; uniform float uAmp; uniform float uHead; uniform vec4 uMouse;
${WIND_GLSL}
out vec2 vUV; out float vKind; out float vH; out float vSeed;
void main(){
  float unit = uRes.y / 800.0;
  vec2 base = aJ.xy;
  float w = windAt(base, uT, base.x * 37.0, 4.0);
  vec2 dm = (base - uMouse.xy) * vec2(uRes.x / uRes.y, 1.0);
  float near = exp(-dot(dm, dm) / 0.04);
  w += near * uMouse.z * (dm.x * inversesqrt(dm.x * dm.x + 0.0064)) * (1.8 + 1.6 * uMouse.w);
  float bend = w * uAmp;
  float hb = aI.x;
  float L = aI.z * uRes.y;
  vec2 p = aP * uRes + vec2(L * bend * hb * hb, L * 0.3 * bend * bend * hb * hb);
  float sc = aI.y > 0.5 ? uHead : 1.0;
  p += aO * unit * sc;
  vUV = aJ.zw; vKind = aI.y; vH = hb; vSeed = aI.w;
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
}`

const FLOWER_FS = `#version 300 es
precision highp float;
uniform vec3 uStem; uniform vec3 uStemTip; uniform vec3 uFlower;
in vec2 vUV; in float vKind; in float vH; in float vSeed;
out vec4 o;
void main(){
  if (vKind < 0.5) {
    float cov = (1.0 - smoothstep(0.35, 1.0, abs(vUV.x))) * 0.95;
    vec3 c = mix(uStem, uStemTip, smoothstep(0.4, 1.0, vH));
    o = vec4(c * cov, cov);
    return;
  }
  float r = length(vUV);
  float ang = atan(vUV.y, vUV.x);
  float edge = 0.86 + 0.07 * sin(ang * 11.0 + vSeed * 13.0) + 0.04 * sin(ang * 23.0 + vSeed * 7.0);
  float cov = 1.0 - smoothstep(edge - 0.14, edge + 0.04, r);
  vec3 dark = uFlower * 0.55;
  vec3 hi = mix(uFlower, vec3(1.0), 0.4);
  vec3 c = mix(dark, uFlower, 1.0 - smoothstep(-0.3, 0.85, vUV.y));
  c = mix(c, hi, (1.0 - smoothstep(-0.75, -0.1, vUV.y)) * (1.0 - smoothstep(0.2, 0.9, abs(vUV.x))) * 0.8);
  c *= 0.92 + 0.16 * fract(sin(dot(floor(vUV * 9.0), vec2(12.9898, 78.233)) + vSeed) * 43758.5453);
  o = vec4(c * cov, cov);
}`

// ── GL plumbing ──

function makeProgram(gl: WebGL2RenderingContext, vs: string, fs: string, names: string[]) {
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
    const prog = gl.createProgram()!
    gl.attachShader(prog, v)
    gl.attachShader(prog, f)
    gl.linkProgram(prog)
    gl.deleteShader(v)
    gl.deleteShader(f)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("Program link failed: " + gl.getProgramInfoLog(prog))
    const u: Record<string, WebGLUniformLocation> = {}
    for (const n of names) {
        const l = gl.getUniformLocation(prog, n)
        if (l === null) throw new Error("Missing uniform " + n)
        u[n] = l
    }
    return { prog, u }
}

function createScene(gl: WebGL2RenderingContext) {
    const blade = makeProgram(gl, BLADE_VS, BLADE_FS, ["uRes", "uT", "uAmp", "uLen", "uWidth", "uBlurPx", "uHazeAmt", "uMouse", "uGust", "uSway", "uRoot", "uShadow", "uGrass", "uLit", "uHot", "uRim", "uHaze", "uRimAmt"])
    const ground = makeProgram(gl, GROUND_VS, GROUND_FS, ["uRoot", "uShadow", "uHaze", "uHazeAmt"])
    const sky = makeProgram(gl, FULL_VS, SKY_FS, ["uBg", "uGlow", "uGlowAmt"])
    const overlay = makeProgram(gl, FULL_VS, OVERLAY_FS, ["uGrain", "uVig", "uSeed", "uRes"])
    const rock = makeProgram(gl, ROCK_VS, ROCK_FS, ["uRockDark", "uRock", "uRockLit", "uHaze", "uHazeAmt", "uAspect"])
    const flower = makeProgram(gl, FLOWER_VS, FLOWER_FS, ["uRes", "uT", "uAmp", "uHead", "uMouse", "uGust", "uSway", "uStem", "uStemTip", "uFlower"])

    const strip = new Float32Array(STRIP_VERTS * 2)
    for (let s = 0; s <= 6; s++) strip.set([s / 6, -1, s / 6, 1], s * 4)
    const stripBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, stripBuf)
    gl.bufferData(gl.ARRAY_BUFFER, strip, gl.STATIC_DRAW)
    const instBuf = gl.createBuffer()!
    const bladeVao = gl.createVertexArray()!
    gl.bindVertexArray(bladeVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, stripBuf)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0)
    for (let l = 1; l <= 4; l++) {
        gl.enableVertexAttribArray(l)
        gl.vertexAttribDivisor(l, 1)
    }
    gl.bindVertexArray(null)

    const groundBuf = gl.createBuffer()!
    const groundVao = gl.createVertexArray()!
    gl.bindVertexArray(groundVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuf)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 12, 0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 12, 8)
    gl.bindVertexArray(null)

    const rockBuf = gl.createBuffer()!
    const rockVao = gl.createVertexArray()!
    gl.bindVertexArray(rockVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, rockBuf)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8)
    gl.bindVertexArray(null)

    const flowerBuf = gl.createBuffer()!
    const flowerVao = gl.createVertexArray()!
    gl.bindVertexArray(flowerVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, flowerBuf)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 48, 0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 48, 8)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 48, 16)
    gl.enableVertexAttribArray(3)
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 48, 32)
    gl.bindVertexArray(null)

    const emptyVao = gl.createVertexArray()!

    return {
        blade, ground, sky, overlay, rock, flower,
        stripBuf, instBuf, bladeVao, groundBuf, groundVao, rockBuf, rockVao, flowerBuf, flowerVao, emptyVao,
        bladeKey: "", sceneKey: "",
        keys: new Float32Array(0), count: 0, groundCount: 0,
        events: [] as { y: number; kind: number; first: number; count: number }[],
    }
}

export interface StillCameraLookingProps {
    background?: string
    grassColor?: string
    tipColor?: string
    flowerColor?: string
    speed?: number
    wind?: number
    density?: number
    scale?: number
    hover?: number
    advanced?: {
        seed?: number
        loopMs?: number
        bendAmount?: number
        stemSway?: number
        swayMix?: number
        gustSize?: number
        lean?: number
        moundHeight?: number
        moundSize?: number
        bladeLength?: number
        bladeWidth?: number
        focusBlur?: number
        haze?: number
        rimStrength?: number
        litColor?: string
        hotColor?: string
        shadowColor?: string
        rootColor?: string
        rockColor?: string
        rockLitColor?: string
        rockDarkColor?: string
        stemColor?: string
        glowColor?: string
        glowAmount?: number
        flowerSize?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * Grass hillside in the wind
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function StillCameraLooking(props: StillCameraLookingProps) {
    props = withMovedControls(props)
    const {
        background = "#6D4991",
        grassColor = "#8A5789",
        tipColor = "#B8B0E8",
        flowerColor = "#FFC800",
        speed = 50,
        wind = 100,
        density = 70,
        scale = 200,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const valsRef = useRef<any>(null)
    valsRef.current = { background, grassColor, tipColor, flowerColor, speed, wind, density, scale, advanced: props.advanced }

    useEffect(() => {
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return
        const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true }) as WebGL2RenderingContext | null
        if (!gl) return

        let scene: ReturnType<typeof createScene> | null = null
        const init = () => {
            try {
                scene = createScene(gl)
            } catch (err) {
                console.error(err)
                scene = null
            }
        }
        init()

        let lost = false
        const onLost = (e: Event) => {
            e.preventDefault()
            lost = true
            scene = null
        }
        const onRestored = () => {
            lost = false
            init()
        }
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        let cssW = root.offsetWidth
        let cssH = root.offsetHeight
        const ro = new ResizeObserver(() => {
            cssW = root.offsetWidth
            cssH = root.offsetHeight
        })
        ro.observe(root)

        const ptr = { x: 0.5, y: 0.5, ex: 0.5, ey: 0.5, over: 0, down: 0, overE: 0, downE: 0 }
        const onMove = (e: PointerEvent) => {
            const w = canvas.offsetWidth || 1
            const h = canvas.offsetHeight || 1
            ptr.x = e.offsetX / w
            ptr.y = e.offsetY / h
            ptr.over = 1
        }
        const onLeave = () => {
            ptr.over = 0
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            ptr.down = 1
        }
        const onUp = () => {
            ptr.down = 0
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        let raf = 0
        let last: number | null = null
        let T = 0
        let frameNo = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last === null ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            frameNo++
            const g = scene
            if (!g || lost) return

            const v = valsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(v.advanced ?? {}) }
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const W = Math.max(1, Math.round(cssW * dpr))
            const H = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== W || canvas.height !== H) {
                canvas.width = W
                canvas.height = H
            }

            // bake when the layout-defining values change
            const seed = Math.round(num(adv.seed, 7))
            const moundAmp = num(adv.moundHeight, 4) / 100
            const moundSize = num(adv.moundSize, 100)
            const leanDeg = num(adv.lean, 7)
            const count = Math.round(clamp((25000 * num(v.density, 70)) / 70, 2000, 40000))
            const bKey = `${count}|${seed}|${moundAmp}|${moundSize}|${leanDeg}`
            if (bKey !== g.bladeKey) {
                const b = bakeBlades(count, seed, moundAmp, moundSize, leanDeg)
                gl.bindVertexArray(null)
                gl.bindBuffer(gl.ARRAY_BUFFER, g.instBuf)
                gl.bufferData(gl.ARRAY_BUFFER, b.data, gl.STATIC_DRAW)
                const gd = bakeGround(seed, moundAmp, moundSize)
                gl.bindBuffer(gl.ARRAY_BUFFER, g.groundBuf)
                gl.bufferData(gl.ARRAY_BUFFER, gd, gl.STATIC_DRAW)
                g.groundCount = gd.length / 3
                g.keys = b.keys
                g.count = count
                g.bladeKey = bKey
            }
            const sKey = `${seed}`
            if (sKey !== g.sceneKey) {
                const r = bakeRocks(seed)
                const f = bakeFlowers(seed)
                gl.bindVertexArray(null)
                gl.bindBuffer(gl.ARRAY_BUFFER, g.rockBuf)
                gl.bufferData(gl.ARRAY_BUFFER, r.data, gl.STATIC_DRAW)
                gl.bindBuffer(gl.ARRAY_BUFFER, g.flowerBuf)
                gl.bufferData(gl.ARRAY_BUFFER, f.data, gl.STATIC_DRAW)
                g.events = [
                    ...r.ranges.map((x) => ({ ...x, kind: 0 })),
                    ...f.ranges.map((x) => ({ ...x, kind: 1 })),
                ].sort((a, b) => a.y - b.y)
                g.sceneKey = sKey
            }

            // time: loops every loopMs at speed 50
            const reduce = !!(mq && mq.matches)
            const sp = num(v.speed, 50) / 50
            if (!reduce) T += dt * sp
            const L = Math.max(num(adv.loopMs, 6960), 1000) / 1000
            const frac = (x: number) => ((x % 1) + 1) % 1
            const tNow = frac(T / L)
            const tLag = frac((T - 0.15 * sp) / L)

            // pointer, eased
            // position trails the cursor; on a fresh entry it starts where the pointer is, so it never sweeps across
            if (ptr.over && ptr.overE < 0.02) {
                ptr.ex = ptr.x
                ptr.ey = ptr.y
            }
            const kPos = 1 - Math.exp(-dt * 6)
            ptr.ex += (ptr.x - ptr.ex) * kPos
            ptr.ey += (ptr.y - ptr.ey) * kPos
            ptr.overE += (ptr.over - ptr.overE) * (1 - Math.exp(-dt * 2.5))
            ptr.downE += (ptr.down - ptr.downE) * (1 - Math.exp(-dt * 4))
            const pStrength = sstep(0, 1, ptr.overE) * (num(adv.hover, 50) / 50)
            const pDown = sstep(0, 1, ptr.downE)

            // colours
            const bg = parseColor(v.background, "#000000")
            const glow = parseColor(adv.glowColor, ADVANCED_DEFAULTS.glowColor)
            const glowAmt = num(adv.glowAmount, 40) / 100
            const haze = mix3(bg, glow, glowAmt)
            const hazeAmt = num(adv.haze, 30) / 100
            const grass = parseColor(v.grassColor, "#8A5789")
            const tip = parseColor(v.tipColor, "#B8B0E8")
            const flowerC = parseColor(v.flowerColor, "#C77FC0")
            const lit = parseColor(adv.litColor, ADVANCED_DEFAULTS.litColor)
            const hot = parseColor(adv.hotColor, ADVANCED_DEFAULTS.hotColor)
            const shadow = parseColor(adv.shadowColor, ADVANCED_DEFAULTS.shadowColor)
            const rootC = parseColor(adv.rootColor, ADVANCED_DEFAULTS.rootColor)
            const stem = parseColor(adv.stemColor, ADVANCED_DEFAULTS.stemColor)
            const stemTip = mix3(stem, flowerC, 0.5)

            const sc = num(v.scale, 100) / 100
            const amp = (num(v.wind, 40) / 40) * (num(adv.bendAmount, 15) / 100)
            const gust = Math.max(num(adv.gustSize, 100), 10) / 100
            const gustF = 1 / gust
            const sway = clamp01(num(adv.swayMix, 40) / 100)

            gl.viewport(0, 0, W, H)
            gl.disable(gl.DEPTH_TEST)
            gl.disable(gl.BLEND)

            // sky
            gl.useProgram(g.sky.prog)
            gl.uniform3fv(g.sky.u.uBg, bg)
            gl.uniform3fv(g.sky.u.uGlow, glow)
            gl.uniform1f(g.sky.u.uGlowAmt, glowAmt)
            gl.bindVertexArray(g.emptyVao)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

            // ground fill under the blades
            gl.useProgram(g.ground.prog)
            gl.uniform3fv(g.ground.u.uRoot, rootC)
            gl.uniform3fv(g.ground.u.uShadow, shadow)
            gl.uniform3fv(g.ground.u.uHaze, haze)
            gl.uniform1f(g.ground.u.uHazeAmt, hazeAmt)
            gl.bindVertexArray(g.groundVao)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, g.groundCount)

            // per-frame uniforms
            const bu = g.blade.u
            gl.useProgram(g.blade.prog)
            gl.uniform2f(bu.uRes, W, H)
            gl.uniform1f(bu.uT, tNow)
            gl.uniform1f(bu.uAmp, amp)
            gl.uniform1f(bu.uLen, sc * (num(adv.bladeLength, 100) / 100))
            gl.uniform1f(bu.uWidth, sc * (num(adv.bladeWidth, 100) / 100))
            gl.uniform1f(bu.uBlurPx, num(adv.focusBlur, 5))
            gl.uniform1f(bu.uHazeAmt, hazeAmt)
            gl.uniform4f(bu.uMouse, ptr.ex, ptr.ey, pStrength, pDown)
            gl.uniform1f(bu.uGust, gustF)
            gl.uniform1f(bu.uSway, sway)
            gl.uniform3fv(bu.uRoot, rootC)
            gl.uniform3fv(bu.uShadow, shadow)
            gl.uniform3fv(bu.uGrass, grass)
            gl.uniform3fv(bu.uLit, lit)
            gl.uniform3fv(bu.uHot, hot)
            gl.uniform3fv(bu.uRim, tip)
            gl.uniform3fv(bu.uHaze, haze)
            gl.uniform1f(bu.uRimAmt, num(adv.rimStrength, 80) / 100)

            const ru = g.rock.u
            gl.useProgram(g.rock.prog)
            gl.uniform3fv(ru.uRockDark, parseColor(adv.rockDarkColor, ADVANCED_DEFAULTS.rockDarkColor))
            gl.uniform3fv(ru.uRock, parseColor(adv.rockColor, ADVANCED_DEFAULTS.rockColor))
            gl.uniform3fv(ru.uRockLit, parseColor(adv.rockLitColor, ADVANCED_DEFAULTS.rockLitColor))
            gl.uniform3fv(ru.uHaze, haze)
            gl.uniform1f(ru.uHazeAmt, hazeAmt)
            gl.uniform1f(ru.uAspect, W / H)

            const fu = g.flower.u
            gl.useProgram(g.flower.prog)
            gl.uniform2f(fu.uRes, W, H)
            gl.uniform1f(fu.uT, tLag)
            gl.uniform1f(fu.uAmp, amp * (num(adv.stemSway, 150) / 100))
            gl.uniform1f(fu.uHead, sc * (num(adv.flowerSize, 100) / 100))
            gl.uniform4f(fu.uMouse, ptr.ex, ptr.ey, pStrength, pDown)
            gl.uniform1f(fu.uGust, gustF)
            gl.uniform1f(fu.uSway, sway)
            gl.uniform3fv(fu.uStem, stem)
            gl.uniform3fv(fu.uStemTip, stemTip)
            gl.uniform3fv(fu.uFlower, flowerC)

            const drawBlades = (from: number, to: number) => {
                if (to <= from) return
                gl.useProgram(g.blade.prog)
                gl.bindVertexArray(g.bladeVao)
                gl.bindBuffer(gl.ARRAY_BUFFER, g.instBuf)
                const base = from * STRIDE * 4
                const st = STRIDE * 4
                gl.vertexAttribPointer(1, 4, gl.FLOAT, false, st, base)
                gl.vertexAttribPointer(2, 4, gl.FLOAT, false, st, base + 16)
                gl.vertexAttribPointer(3, 4, gl.FLOAT, false, st, base + 32)
                gl.vertexAttribPointer(4, 1, gl.FLOAT, false, st, base + 48)
                gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, STRIP_VERTS, to - from)
            }

            // back to front: blades by root depth, rocks and flower clumps slotted in
            let cursor = 0
            for (const ev of g.events) {
                const end = lowerBound(g.keys, g.count, ev.y)
                drawBlades(cursor, end)
                cursor = Math.max(cursor, end)
                if (ev.kind === 0) {
                    gl.useProgram(g.rock.prog)
                    gl.bindVertexArray(g.rockVao)
                } else {
                    gl.useProgram(g.flower.prog)
                    gl.bindVertexArray(g.flowerVao)
                }
                gl.drawArrays(gl.TRIANGLES, ev.first, ev.count)
            }
            drawBlades(cursor, g.count)

            // grain + vignette
            const grain = num(adv.grain, 0) / 100
            const vig = num(adv.vignette, 15) / 100
            if (grain > 0 || vig > 0) {
                gl.useProgram(g.overlay.prog)
                gl.uniform1f(g.overlay.u.uGrain, grain)
                gl.uniform1f(g.overlay.u.uVig, vig)
                gl.uniform1f(g.overlay.u.uSeed, (frameNo * 17) % 1000)
                gl.uniform2f(g.overlay.u.uRes, W, H)
                gl.bindVertexArray(g.emptyVao)
                gl.drawArrays(gl.TRIANGLES, 0, 3)
            }
            gl.bindVertexArray(null)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            const g = scene
            if (g && !gl.isContextLost()) {
                for (const p of [g.blade, g.ground, g.sky, g.overlay, g.rock, g.flower]) gl.deleteProgram(p.prog)
                for (const b of [g.stripBuf, g.instBuf, g.groundBuf, g.rockBuf, g.flowerBuf]) gl.deleteBuffer(b)
                for (const a of [g.bladeVao, g.groundVao, g.rockVao, g.flowerVao, g.emptyVao]) gl.deleteVertexArray(a)
            }
            scene = null
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
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
