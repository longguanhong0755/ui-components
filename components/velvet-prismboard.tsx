"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
const GROUP_FALLBACKS: Record<string, any> = {  }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

/**
 * VioletHinge — eight hinged, lacquered wooden cubes that keep folding, the
 * way an infinity-cube fidget toy does. Each cycle starts and ends as a closed
 * 2×2×2 block, so the five motions (Classic, Flip, Ring, Twist, Bloom) chain
 * into each other without a seam; a motion picked mid-cycle takes over at the
 * next close.
 *
 * Built from the user's PurpleInfinityCube (same control keys, so instances
 * keep their values) and matched to their reference frame: saturated violet
 * painted wood, lemon corner discs with a dark rim, near-black indigo shade
 * faces, on a lime-to-grey wash.
 *
 * Interaction: the gloss follows the pointer (the glint sits under the cursor
 * on faces turned to the camera), the block leans toward it and its cubes ease
 * apart; drag spins it with inertia and it settles onto the nearest square
 * pose; holding the pointer down fast-forwards the folding.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

type Motion = "classic" | "flip" | "ring" | "twist" | "bloom"

/** Tuning values behind the look. Out of the box these change nothing. */
const DEFAULT_ADVANCED = {
    cycleMs: 3960,
    phaseOffset: 59,
    fold1Start: 0,
    fold1End: 25,
    fold2Start: 25,
    fold2End: 50,
    wheelStart: 50,
    wheelEnd: 100,
    easePower: 3,
    spinPerCycle: 180,
    tiltX: -14,
    tiltY: -16,
    wobble: 5,
    fov: 25,
    offsetX: 0,
    offsetY: 0,
    cubeGap: 1,
    highlightColor: "#8F50BE",
    midShadowColor: "#2B1A60",
    shadowColor: "#0B0233",
    faceLight: 60,
    lightX: -62,
    lightY: 50,
    faceGlow: 30,
    gloss: 40,
    shininess: 260,
    reflection: 35,
    bevel: 4,
    streak: 12,
    dotRadius: 26,
    dotRim: 1,
    rimDarkness: 55,
    markSize: 8,
    markStroke: 26,
    seamWidth: 1,
    seamDarkness: 35,
    grain: 4,
    vignette: 0,
    hover: 50,
}

type Advanced = typeof DEFAULT_ADVANCED

export interface VioletHingeProps {
    /** Ground colour, far from the glow corner. */
    background?: string
    /** Wash rising from the top-right corner into Background. */
    glow?: string
    /** Which fold sequence plays. Changes take over at the next closed block. */
    motion?: Motion
    /** Edge length of one cube, px. */
    size?: number
    faceColor?: string
    dotColor?: string
    markColor?: string
    /** Drag to spin the block; it settles on the nearest square pose. */
    drag?: boolean
    /** Fold tempo, 0–100 (50 = one cycle per Advanced › Cycle). */
    speed?: number
    /** Counter-clockwise turn of the whole block while it folds, 0–100. */
    spin?: number
    advanced?: Partial<Advanced>
    style?: React.CSSProperties
}

const DEFAULTS = {
    background: "#000000",
    glow: "#1D1D1D",
    motion: "bloom",
    size: 112,
    faceColor: "#9EFF00",
    dotColor: "#FFF800",
    markColor: "#00E2FF",
    drag: true,
    speed: 50,
    spin: 100,
}

const DEG = Math.PI / 180

function num(v: unknown, d: number) {
    const n = typeof v === "number" ? v : parseFloat(String(v))
    return Number.isFinite(n) ? n : d
}
function clamp01(x: number) {
    return x < 0 ? 0 : x > 1 ? 1 : x
}
function parseColor(c: unknown, fb: number[]): number[] {
    if (typeof c !== "string") return fb
    const s = c.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((ch) => ch + ch)
                .join("")
        if (h.length < 6) return fb
        const r = parseInt(h.slice(0, 2), 16)
        const g = parseInt(h.slice(2, 4), 16)
        const b = parseInt(h.slice(4, 6), 16)
        if ([r, g, b].some((v) => !Number.isFinite(v))) return fb
        return [r / 255, g / 255, b / 255]
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && p.slice(0, 3).every(Number.isFinite))
            return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fb
}
function easeInOut(x: number, p: number) {
    return x < 0.5 ? 0.5 * Math.pow(2 * x, p) : 1 - 0.5 * Math.pow(2 - 2 * x, p)
}
function seg(u: number, a: number, b: number) {
    if (b <= a) return u >= b ? 1 : 0
    return clamp01((u - a) / (b - a))
}

// ── Row-major 3×3 helpers ────────────────────────────────────────────────
type M3 = number[]
function rotX(a: number): M3 {
    const c = Math.cos(a),
        s = Math.sin(a)
    return [1, 0, 0, 0, c, -s, 0, s, c]
}
function rotY(a: number): M3 {
    const c = Math.cos(a),
        s = Math.sin(a)
    return [c, 0, s, 0, 1, 0, -s, 0, c]
}
function rotZ(a: number): M3 {
    const c = Math.cos(a),
        s = Math.sin(a)
    return [c, -s, 0, s, c, 0, 0, 0, 1]
}
/** Rotation by `a` about unit axis (x, y, z) — Rodrigues. */
function rotAxis(x: number, y: number, z: number, a: number): M3 {
    const c = Math.cos(a),
        s = Math.sin(a),
        t = 1 - c
    return [
        t * x * x + c, t * x * y - s * z, t * x * z + s * y,
        t * x * y + s * z, t * y * y + c, t * y * z - s * x,
        t * x * z - s * y, t * y * z + s * x, t * z * z + c,
    ]
}
function mul3(a: M3, b: M3): M3 {
    const o = new Array(9)
    for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
            o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]
    return o
}
function tr3(a: M3): M3 {
    return [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]]
}
function app3(m: M3, v: number[]) {
    return [
        m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
        m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
        m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
    ]
}
const I3: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]
/** Gram–Schmidt, so an eased matrix stays a rotation. */
function ortho(m: M3): M3 {
    let x = [m[0], m[3], m[6]]
    let y = [m[1], m[4], m[7]]
    const lx = Math.hypot(x[0], x[1], x[2]) || 1
    x = x.map((v) => v / lx)
    const d = x[0] * y[0] + x[1] * y[1] + x[2] * y[2]
    y = y.map((v, i) => v - d * x[i])
    const ly = Math.hypot(y[0], y[1], y[2]) || 1
    y = y.map((v) => v / ly)
    const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]]
    return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]
}
/** The 24 rotations that map a cube onto itself — the poses a drag settles on. */
const CUBE_ROTATIONS: M3[] = (() => {
    const out: M3[] = []
    const perms = [
        [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
    ]
    for (const p of perms)
        for (let s = 0; s < 8; s++) {
            const m = new Array(9).fill(0)
            for (let r = 0; r < 3; r++) m[r * 3 + p[r]] = s & (1 << r) ? -1 : 1
            const det =
                m[0] * (m[4] * m[8] - m[5] * m[7]) -
                m[1] * (m[3] * m[8] - m[5] * m[6]) +
                m[2] * (m[3] * m[7] - m[4] * m[6])
            if (det > 0) out.push(m)
        }
    return out
})()
function nearestCubeRotation(m: M3): M3 {
    let best = CUBE_ROTATIONS[0],
        bs = -Infinity
    for (const c of CUBE_ROTATIONS) {
        let s = 0
        for (let i = 0; i < 9; i++) s += c[i] * m[i]
        if (s > bs) {
            bs = s
            best = c
        }
    }
    return best
}

// ── Moves ────────────────────────────────────────────────────────────────
// Every move acts on the current pose of all eight cubes (centre p, rotation
// R), so a motion is just a list of moves played in order. Each starts and
// ends on the closed block, which is what lets motions and cycles chain.
type Cube = { p: number[]; R: M3 }

function recenter(cubes: Cube[]) {
    let cx = 0,
        cy = 0,
        cz = 0
    for (const c of cubes) {
        cx += c.p[0]
        cy += c.p[1]
        cz += c.p[2]
    }
    for (const c of cubes) {
        c.p[0] -= cx / 8
        c.p[1] -= cy / 8
        c.p[2] -= cz / 8
    }
}

/**
 * The user's original fold, in frame F: both halves swing 180° about the
 * shared front hinge (x = 0, z = 1, along y) — first one half, then the other
 * rolls over it — and the block closes again. F = I is the original; Flip
 * replays it turned 90° about z so the block rolls over its other hinge.
 */
function hingeFold(cubes: Cube[], k1: number, k2: number, F: M3) {
    if (k1 <= 0 && k2 <= 0) return
    const Ft = tr3(F)
    for (const q of cubes) {
        const o = app3(Ft, q.p)
        const Ry = rotY(-Math.PI * (o[0] > 0 ? k1 : k2))
        const r = app3(Ry, [o[0], o[1], o[2] - 1])
        q.p = app3(F, [r[0], r[1], r[2] + 1])
        q.R = mul3(mul3(F, mul3(Ry, Ft)), q.R)
    }
    recenter(cubes)
}

/**
 * Pinwheel (the user's original): the four two-deep rods turn together and
 * slide along each other's faces, opening into a ring around a square hole at
 * 45° and closing into a block at 90°. `back` turns the rear layer the other
 * way (Ring motion); 1 keeps the original.
 */
function pinwheel(cubes: Cube[], k: number, dir: number, back: number) {
    if (k <= 0) return
    const th = (Math.PI / 2) * k
    const d = 1 / Math.max(Math.abs(Math.cos(th)), Math.abs(Math.sin(th)))
    for (const q of cubes) {
        const sx = q.p[0] >= 0 ? 1 : -1
        const sy = q.p[1] >= 0 ? 1 : -1
        const a = th * dir * (q.p[2] >= 0 ? 1 : back)
        const c = Math.cos(a),
            s = Math.sin(a)
        const rx = q.p[0] - sx * 0.5
        const ry = q.p[1] - sy * 0.5
        q.p = [(sx * d) / 2 + c * rx - s * ry, (sy * d) / 2 + s * rx + c * ry, q.p[2]]
        q.R = mul3(rotZ(a), q.R)
    }
}

/** Rubik-style quarter turn of one layer (axis 0/1/2, side ±1), lifting out a touch as it turns. */
function layerTurn(cubes: Cube[], axis: number, side: number, k: number) {
    if (k <= 0) return
    const a = (Math.PI / 2) * k * side
    const R = axis === 0 ? rotX(a) : axis === 1 ? rotY(a) : rotZ(a)
    const lift = Math.sin(Math.PI * k) * LAYER_LIFT * side
    for (const q of cubes) {
        if (q.p[axis] * side <= 0) continue
        q.p = app3(R, q.p)
        q.p[axis] += lift
        q.R = mul3(R, q.R)
    }
}
/** How far a turning layer lifts clear of the block, in cube edges. */
const LAYER_LIFT = 0.14

/** Every cube flies out along its diagonal and twists a third-turn about it — the cube's own 3-fold axis, so it lands square. */
function bloom(cubes: Cube[], k: number) {
    if (k <= 0) return
    const out = Math.sin(Math.PI * k) * BLOOM_REACH
    for (const q of cubes) {
        const sx = q.p[0] >= 0 ? 1 : -1
        const sy = q.p[1] >= 0 ? 1 : -1
        const sz = q.p[2] >= 0 ? 1 : -1
        const r = rotAxis(sx / Math.sqrt(3), sy / Math.sqrt(3), sz / Math.sqrt(3), ((2 * Math.PI) / 3) * k)
        q.p = [q.p[0] + sx * out, q.p[1] + sy * out, q.p[2] + sz * out]
        q.R = mul3(r, q.R)
    }
}
/** How far each cube flies out at the height of a Bloom, in cube edges. */
const BLOOM_REACH = 0.3

/** Pose of the eight cubes at phase u of one cycle, starting from the closed block. */
function computeCubes(u: number, adv: Advanced, motion: Motion): Cube[] {
    const pw = Math.max(1, num(adv.easePower, 3))
    const e = (a: number, b: number) => easeInOut(seg(u, a, b), pw)
    const cubes: Cube[] = []
    for (let i = 0; i < 8; i++)
        cubes.push({ p: [i & 1 ? 0.5 : -0.5, i & 2 ? 0.5 : -0.5, i & 4 ? 0.5 : -0.5], R: I3 })

    if (motion === "flip") {
        hingeFold(cubes, e(0, 0.25), e(0.25, 0.5), I3)
        hingeFold(cubes, e(0.5, 0.75), e(0.75, 1), rotZ(Math.PI / 2))
    } else if (motion === "ring") {
        pinwheel(cubes, e(0, 0.5), 1, -1)
        pinwheel(cubes, e(0.5, 1), -1, -1)
    } else if (motion === "twist") {
        layerTurn(cubes, 1, 1, e(0, 1 / 3))
        layerTurn(cubes, 0, 1, e(1 / 3, 2 / 3))
        layerTurn(cubes, 2, 1, e(2 / 3, 1))
    } else if (motion === "bloom") {
        bloom(cubes, e(0, 0.8))
    } else {
        hingeFold(
            cubes,
            e(num(adv.fold1Start, 0) / 100, num(adv.fold1End, 25) / 100),
            e(num(adv.fold2Start, 25) / 100, num(adv.fold2End, 50) / 100),
            I3
        )
        pinwheel(cubes, e(num(adv.wheelStart, 50) / 100, num(adv.wheelEnd, 100) / 100), 1, 1)
    }
    return cubes
}

// ── Shaders ──────────────────────────────────────────────────────────────
const VERT = `#version 300 es
in vec3 aPos;
in vec3 aNorm;
in vec2 aUV;
in vec3 aTan;
in vec3 aBit;
uniform mat4 uProj;
uniform mat4 uMV;
uniform mat3 uNM;
out vec3 vN;
out vec3 vT;
out vec3 vB;
out vec3 vP;
out vec2 vUV;
flat out float vFace;
void main() {
    vN = uNM * aNorm;
    vT = uNM * aTan;
    vB = uNM * aBit;
    vUV = aUV;
    vFace = dot(aNorm, vec3(1.0, 2.0, 3.0)) + 3.0;
    vec4 p = uMV * vec4(aPos, 1.0);
    vP = p.xyz;
    gl_Position = uProj * p;
}`

const FRAG = `#version 300 es
precision highp float;
in vec3 vN;
in vec3 vT;
in vec3 vB;
in vec3 vP;
in vec2 vUV;
flat in float vFace;
uniform vec3 uFace;
uniform vec3 uHi;
uniform vec3 uMid;
uniform vec3 uShadow;
uniform vec3 uDot;
uniform vec3 uMark;
uniform vec3 uLight;
uniform vec3 uRay;
uniform float uLamp;
uniform float uF;
uniform float uDotR;
uniform float uRim;
uniform float uRimDark;
uniform float uMarkSize;
uniform float uMarkStroke;
uniform float uSeam;
uniform float uSeamDark;
uniform float uGlow;
uniform float uStreak;
uniform float uSeed;
uniform float uGloss;
uniform float uShine;
uniform float uRefl;
uniform float uBevel;
out vec4 o;

float h21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x),
               mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
    vec3 n0 = normalize(vN);
    float t = dot(n0, uLight);
    float F = clamp(uF, 0.05, 0.95);
    vec3 base;
    float k;
    if (t < 0.0) {
        float a = clamp(-t, 0.0, 1.0);
        base = mix(uMid, uShadow, a);
        k = mix(0.42, 0.2, a);
    } else if (t < F) {
        float a = t / F;
        base = mix(uMid, uFace, a);
        k = mix(0.42, 1.0, a);
    } else {
        float a = clamp((t - F) / max(1.0 - F, 0.001), 0.0, 1.0);
        base = mix(uFace, uHi, a);
        k = mix(1.0, 1.12, a);
    }
    vec2 uv = vUV;
    float g = clamp((uv.y - uv.x) * 0.5 + 0.5, 0.0, 1.0);
    base = mix(base, uHi, g * g * uGlow * 0.35 * clamp(t + 0.2, 0.0, 1.0));

    // Painted wood: long wavy fibres along u, soft growth bands and the odd
    // dark pore, seeded per cube and per face so no two faces repeat.
    vec2 w = uv + vec2(uSeed * 7.13 + vFace * 3.71, uSeed * 3.31 + vFace * 1.93);
    float warp = vn(w * vec2(1.3, 2.2)) * 0.8 + vn(w * vec2(3.5, 5.0)) * 0.25;
    float y = w.y * 8.0 + warp;
    float fib = vn(vec2(w.x * 1.6, y * 3.5));
    float fine = vn(vec2(w.x * 4.0, y * 16.0));
    float band = 0.5 + 0.5 * sin(y * 6.2832);
    float pore = smoothstep(0.86, 0.97, vn(vec2(w.x * 4.0, y * 70.0))) * smoothstep(0.6, 0.85, vn(w * vec2(3.0, 1.5) + 11.0));
    float wood = (fib - 0.5) * 1.1 + (fine - 0.5) * 0.3 + (band - 0.5) * 0.12 - pore * 0.9;
    base *= 1.0 + uStreak * 1.8 * wood;
    vec3 col = base;

    vec2 c = min(uv, 1.0 - uv);
    float d = length(c);
    float aa = max(fwidth(d), 0.0001);
    float dm = 1.0 - smoothstep(uDotR - aa, uDotR + aa, d);
    // Discs are paint on the same wood, so a whisper of the grain shows through.
    col = mix(col, uDot * k * (1.0 + uStreak * 0.6 * wood), dm);
    float rm = smoothstep(uDotR - uRim - aa, uDotR - uRim + aa, d) * dm;
    col = mix(col, col * (1.0 - uRimDark), rm * step(0.0001, uRim));

    vec2 q = uv - 0.5;
    float a1 = (q.x + q.y) * 0.70710678;
    float b1 = (q.x - q.y) * 0.70710678;
    float L = uMarkSize * 0.5;
    float wd = max(uMarkSize * uMarkStroke * 0.5, 0.0001);
    float sd = min(max(abs(a1) - L, abs(b1) - wd), max(abs(b1) - L, abs(a1) - wd));
    float aa2 = max(fwidth(sd), 0.0001);
    float mm = (1.0 - smoothstep(-aa2, aa2, sd)) * step(0.0001, uMarkSize);
    col = mix(col, uMark * mix(0.35, 1.0, clamp(k, 0.0, 1.0)), mm);

    float e = min(c.x, c.y);
    float aa3 = max(fwidth(e), 0.0001);
    float sm = 1.0 - smoothstep(uSeam - aa3, uSeam + aa3, e);
    col *= 1.0 - uSeamDark * sm * step(0.0001, uSeam);

    // Polish. A rounded bevel bends the normal toward each edge, so the rims
    // catch light like a sanded, lacquered block; then a clear coat on top.
    vec3 n = n0;
    if (uBevel > 0.0) {
        vec2 sg = sign(uv - 0.5);
        vec2 bv = clamp(1.0 - c / uBevel, 0.0, 1.0);
        bv *= bv;
        n = normalize(n0 + (normalize(vT) * sg.x * bv.x + normalize(vB) * sg.y * bv.y) * 1.4);
    }
    col *= clamp(1.0 + 0.9 * (dot(n, uLight) - t), 0.25, 1.8);
    vec3 V = normalize(-vP);
    float NV = clamp(dot(n, V), 0.0, 1.0);
    float fr = 0.04 + 0.96 * pow(1.0 - NV, 5.0);
    vec3 R = reflect(-V, n);
    // Studio softbox up-left plus a pale ceiling, seen in the lacquer.
    float box = smoothstep(0.62, 0.97, dot(R, normalize(uLight + vec3(0.0, 0.0, 0.6))));
    float sky = smoothstep(-0.2, 1.0, R.y);
    col += vec3(0.93, 0.9, 1.0) * uRefl * (box * 0.55 + sky * 0.12) * (0.08 + fr * 3.0);
    // Glint: a small lamp hung on the mirror of the cursor's ray off this
    // face's plane, so on whatever face the cursor is over, the highlight
    // peaks exactly under it.
    float den = dot(uRay, n0);
    if (den < -0.001) {
        vec3 pc = uRay * (dot(vP, n0) / den);
        vec3 Ls = normalize(pc + reflect(uRay, n0) * uLamp - vP);
        vec3 H = normalize(Ls + V);
        float NH = max(dot(n, H), 0.0);
        float sp = pow(NH, uShine) + 0.15 * pow(NH, uShine * 0.08);
        col += vec3(1.0, 0.97, 1.0) * uGloss * sp * clamp(dot(n, Ls) * 4.0, 0.0, 1.0);
    }
    o = vec4(col, 1.0);
}`

function cubeMesh(): Float32Array {
    const faces = [
        { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
        { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
        { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
        { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
        { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
        { n: [0, 0, -1], u: [1, 0, 0], v: [0, -1, 0] },
    ]
    const corners = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, -1],
        [1, 1],
        [-1, 1],
    ]
    const out: number[] = []
    for (const f of faces) {
        for (const [a, b] of corners) {
            for (let k = 0; k < 3; k++) out.push(f.n[k] * 0.5 + f.u[k] * a * 0.5 + f.v[k] * b * 0.5)
            out.push(f.n[0], f.n[1], f.n[2])
            out.push((a + 1) / 2, (b + 1) / 2)
            out.push(f.u[0], f.u[1], f.u[2])
            out.push(f.v[0], f.v[1], f.v[2])
        }
    }
    return new Float32Array(out)
}

/** Drag across the full frame width turns the block this far. */
const DRAG_TURN = Math.PI * 1.2
/** Fling friction and settle rate (per second) after release. */
const FLING_DECAY = 3.2
const SETTLE_RATE = 5

export default function VioletHinge(props: VioletHingeProps) {
    props = withMovedControls(props)
    const {
        background = DEFAULTS.background,
        glow = DEFAULTS.glow,
        motion = DEFAULTS.motion,
        size = DEFAULTS.size,
        faceColor = DEFAULTS.faceColor,
        dotColor = DEFAULTS.dotColor,
        markColor = DEFAULTS.markColor,
        drag = DEFAULTS.drag,
        speed = DEFAULTS.speed,
        spin = DEFAULTS.spin,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const grainRef = useRef<HTMLDivElement>(null)
    const propsRef = useRef({ motion, speed, size, spin, faceColor, dotColor, markColor, drag, advanced: props.advanced })
    propsRef.current = { motion, speed, size, spin, faceColor, dotColor, markColor, drag, advanced: props.advanced }
    const dirtyRef = useRef(true)
    dirtyRef.current = true

    const advR = { ...DEFAULT_ADVANCED, ...(props.advanced ?? {}) }
    const grainOpacity = clamp01(num(advR.grain, 0) / 100)
    const vignette = clamp01(num(advR.vignette, 0) / 100)

    useEffect(() => {
        const g = grainRef.current
        if (!g) return
        const c = document.createElement("canvas")
        c.width = 128
        c.height = 128
        const ctx = c.getContext("2d")
        if (!ctx) return
        const img = ctx.createImageData(128, 128)
        for (let i = 0; i < img.data.length; i += 4) {
            const v = Math.floor(Math.random() * 255)
            img.data[i] = v
            img.data[i + 1] = v
            img.data[i + 2] = v
            img.data[i + 3] = 255
        }
        ctx.putImageData(img, 0, 0)
        g.style.backgroundImage = `url(${c.toDataURL()})`
    }, [])

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: true,
            premultipliedAlpha: true,
            powerPreference: "low-power",
        }) as WebGL2RenderingContext | null
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)!
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                const log = gl.getShaderInfoLog(sh)
                gl.deleteShader(sh)
                throw new Error("Shader compile failed: " + log)
            }
            return sh
        }
        const vs = compile(gl.VERTEX_SHADER, VERT)
        const fs = compile(gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()!
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
            throw new Error("Program link failed: " + gl.getProgramInfoLog(prog))
        gl.useProgram(prog)

        const U = (n: string) => gl.getUniformLocation(prog, n)
        const u = {
            proj: U("uProj"),
            mv: U("uMV"),
            nm: U("uNM"),
            face: U("uFace"),
            hi: U("uHi"),
            mid: U("uMid"),
            shadow: U("uShadow"),
            dot: U("uDot"),
            mark: U("uMark"),
            light: U("uLight"),
            ray: U("uRay"),
            lamp: U("uLamp"),
            F: U("uF"),
            dotR: U("uDotR"),
            rim: U("uRim"),
            rimDark: U("uRimDark"),
            markSize: U("uMarkSize"),
            markStroke: U("uMarkStroke"),
            seam: U("uSeam"),
            seamDark: U("uSeamDark"),
            glow: U("uGlow"),
            streak: U("uStreak"),
            seed: U("uSeed"),
            gloss: U("uGloss"),
            shine: U("uShine"),
            refl: U("uRefl"),
            bevel: U("uBevel"),
        }

        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, cubeMesh(), gl.STATIC_DRAW)
        const stride = 14 * 4
        const attr = (name: string, n: number, off: number) => {
            const l = gl.getAttribLocation(prog, name)
            if (l < 0) return
            gl.enableVertexAttribArray(l)
            gl.vertexAttribPointer(l, n, gl.FLOAT, false, stride, off * 4)
        }
        attr("aPos", 3, 0)
        attr("aNorm", 3, 3)
        attr("aUV", 2, 6)
        attr("aTan", 3, 8)
        attr("aBit", 3, 11)

        gl.enable(gl.DEPTH_TEST)
        gl.enable(gl.CULL_FACE)
        gl.cullFace(gl.BACK)

        // Size from the observer only — no layout reads in the frame loop.
        let W = 0,
            H = 0,
            resScale = 1
        const applySize = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1) * resScale
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
            dirtyRef.current = true
        }
        const ro = new ResizeObserver((entries) => {
            const r = entries[0].contentRect
            W = r.width
            H = r.height
            applySize()
        })
        ro.observe(root)

        const reduce = !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        // Pointer. Handlers only record; the frame reads the displayed rect
        // once, and only when the pointer moved or the page scrolled.
        const ptr = {
            inside: false,
            down: false,
            dragging: false,
            cx: 0,
            cy: 0,
            lastX: 0,
            lastY: 0,
            dxPx: 0,
            dyPx: 0,
            moved: false,
            rect: { left: 0, top: 0, width: 1, height: 1 },
            u: 0.5,
            v: 0.5,
            over: 0,
            press: 0,
            sx: 0,
            sy: 0,
            lx: IDLE_GLINT[0],
            ly: IDLE_GLINT[1],
        }
        const onMove = (e: PointerEvent) => {
            ptr.inside = true
            ptr.cx = e.clientX
            ptr.cy = e.clientY
            if (ptr.dragging) {
                ptr.dxPx += e.clientX - ptr.lastX
                ptr.dyPx += e.clientY - ptr.lastY
            }
            ptr.lastX = e.clientX
            ptr.lastY = e.clientY
            ptr.moved = true
        }
        const onEnter = (e: PointerEvent) => {
            ptr.inside = true
            onMove(e)
        }
        const onLeave = (e: PointerEvent) => {
            if (!ptr.dragging) ptr.inside = false
            if (e.pointerType === "touch") ptr.inside = false
        }
        const onDown = (e: PointerEvent) => {
            ptr.down = true
            ptr.inside = true
            ptr.lastX = e.clientX
            ptr.lastY = e.clientY
            onMove(e)
            if (propsRef.current.drag) {
                ptr.dragging = true
                try {
                    root.setPointerCapture(e.pointerId)
                } catch {}
            }
        }
        const onUp = (e: PointerEvent) => {
            ptr.down = false
            ptr.dragging = false
            if (e.pointerType === "touch") ptr.inside = false
        }
        const onScroll = () => {
            ptr.moved = true
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)
        window.addEventListener("scroll", onScroll, true)

        // Cycle state. Each cycle starts on the closed block; at its close we
        // record where every cube landed and how it is turned, so the next
        // cycle (of any motion) carries on from exactly that pose.
        let cyc = 0
        let cycleIndex = 0
        let activeMotion: Motion = propsRef.current.motion
        let slotBase: M3[] = Array.from({ length: 8 }, () => I3)
        let slotSeed: number[] = Array.from({ length: 8 }, (_, i) => i * 0.137 + 0.21)
        let spinAng = 0
        let wob = 0
        // Drag rotation lives between tilt and spin, so a settled drag is just
        // the block resting on another face and the spin stays on screen.
        let D: M3 = I3
        let velX = 0,
            velY = 0
        let last = -1
        let lastDraw = -1
        let frameEMA = 16.7
        let raf = 0
        const mv = new Float32Array(16)
        const nm = new Float32Array(9)
        const proj = new Float32Array(16)

        const closeCycle = (adv: Advanced) => {
            const end = computeCubes(1, adv, activeMotion)
            const nb: M3[] = new Array(8)
            const ns: number[] = new Array(8)
            for (let k = 0; k < 8; k++) {
                const p = end[k].p
                const to = (p[0] > 0 ? 1 : 0) | (p[1] > 0 ? 2 : 0) | (p[2] > 0 ? 4 : 0)
                nb[to] = mul3(end[k].R, slotBase[k]).map(Math.round)
                ns[to] = slotSeed[k]
            }
            for (let k = 0; k < 8; k++) if (!nb[k]) return // never expected; keep the old pose rather than lose a cube
            slotBase = nb
            slotSeed = ns
        }

        const loop = (now: number) => {
            raf = requestAnimationFrame(loop)
            // 60 fps cap: a 120 Hz screen does half the work.
            if (lastDraw >= 0 && now - lastDraw < 1000 / 60 - 2) return
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            if (W <= 0 || H <= 0) return
            const p = propsRef.current
            const adv: Advanced = { ...DEFAULT_ADVANCED, ...(p.advanced ?? {}) }
            const h = Math.max(0, num(adv.hover, 50)) / 50

            if (ptr.moved) {
                const r = root.getBoundingClientRect()
                ptr.rect = { left: r.left, top: r.top, width: r.width || 1, height: r.height || 1 }
                ptr.u = (ptr.cx - r.left) / ptr.rect.width
                ptr.v = (ptr.cy - r.top) / ptr.rect.height
                ptr.moved = false
            }
            const tx = ptr.u * 2 - 1
            const ty = 1 - ptr.v * 2

            const ek = 1 - Math.exp(-dt * 6)
            const fast = 1 - Math.exp(-dt * 16)
            const overPrev = ptr.over
            ptr.over += ((ptr.inside ? 1 : 0) - ptr.over) * ek
            ptr.sx += ((ptr.inside ? tx : 0) - ptr.sx) * ek
            ptr.sy += ((ptr.inside ? ty : 0) - ptr.sy) * ek
            ptr.lx += ((ptr.inside ? tx : IDLE_GLINT[0]) - ptr.lx) * fast
            ptr.ly += ((ptr.inside ? ty : IDLE_GLINT[1]) - ptr.ly) * fast
            ptr.press += ((ptr.down ? 1 : 0) - ptr.press) * (1 - Math.exp(-dt * 8))

            const speedF = Math.max(0, Math.min(100, num(p.speed, 50))) / 50
            const spinF = Math.max(0, Math.min(100, num(p.spin, 50))) / 50
            const boost = 1 + (0.35 * ptr.over + 0.6 * ptr.press) * h
            const cycleSec = Math.max(0.3, num(adv.cycleMs, 3960) / 1000)
            if (!reduce) {
                cyc += (dt * speedF * boost) / cycleSec
                spinAng += (dt * speedF * boost * num(adv.spinPerCycle, 180) * DEG * spinF) / cycleSec
                wob += (dt * speedF) / cycleSec
            }
            const phase = cyc + num(adv.phaseOffset, 59) / 100
            const ci = Math.floor(phase)
            while (cycleIndex < ci) {
                closeCycle(adv)
                cycleIndex++
                activeMotion = p.motion
            }
            if (cycleIndex > ci) cycleIndex = ci // Start Phase dragged backwards
            // Frozen, there is no fold to keep seamless: show a new motion now.
            if ((reduce || speedF === 0) && activeMotion !== p.motion) activeMotion = p.motion
            const uPhase = reduce ? 0 : phase - ci

            // Tilt (with wobble and the lean toward the pointer) and spin.
            const wobA = reduce ? 0 : num(adv.wobble, 5) * DEG
            const ax = num(adv.tiltX, -14) * DEG + Math.sin(wob * Math.PI * 2) * wobA - ptr.sy * 20 * DEG * h * ptr.over
            const ay = num(adv.tiltY, -16) * DEG + Math.cos(wob * Math.PI * 2) * wobA + ptr.sx * 20 * DEG * h * ptr.over
            const T = mul3(rotX(ax), rotY(ay))
            const S = rotZ(spinAng)

            // Drag: turn about the screen's axes, fling, then settle square.
            const active = ptr.dragging && p.drag
            if (active && dt > 0) {
                const yaw = (ptr.dxPx / ptr.rect.width) * DRAG_TURN
                const pitch = (ptr.dyPx / ptr.rect.width) * DRAG_TURN
                ptr.dxPx = ptr.dyPx = 0
                velX += (yaw / dt - velX) * 0.5
                velY += (pitch / dt - velY) * 0.5
                D = turnInScreen(D, T, S, yaw, pitch)
            } else {
                ptr.dxPx = ptr.dyPx = 0
                const decay = Math.exp(-dt * FLING_DECAY)
                velX *= decay
                velY *= decay
                if (Math.abs(velX) + Math.abs(velY) > 0.4) {
                    D = turnInScreen(D, T, S, velX * dt, velY * dt)
                } else {
                    velX = velY = 0
                    const C = nearestCubeRotation(D)
                    const a = 1 - Math.exp(-dt * SETTLE_RATE)
                    let diff = 0
                    for (let i = 0; i < 9; i++) diff += Math.abs(C[i] - D[i])
                    D = diff < 1e-4 ? C : ortho(D.map((v, i) => v + (C[i] - v) * a))
                }
            }

            // Skip the draw entirely once nothing is moving.
            const moving =
                (!reduce && speedF > 0) ||
                Math.abs(ptr.over - overPrev) > 1e-4 ||
                Math.abs(ptr.lx - (ptr.inside ? tx : IDLE_GLINT[0])) > 1e-3 ||
                Math.abs(ptr.ly - (ptr.inside ? ty : IDLE_GLINT[1])) > 1e-3 ||
                Math.abs(ptr.press - (ptr.down ? 1 : 0)) > 1e-3 ||
                active ||
                velX !== 0 ||
                velY !== 0 ||
                D !== nearestCubeRotation(D)
            if (!moving && !dirtyRef.current) return
            dirtyRef.current = false

            // Step resolution down if frames run long (floor 60%).
            if (lastDraw >= 0) frameEMA += (now - lastDraw - frameEMA) * 0.05
            lastDraw = now
            if (frameEMA > 26 && resScale > 0.6) {
                resScale = Math.max(0.6, resScale * 0.85)
                frameEMA = 16.7
                applySize()
            }

            const G = mul3(mul3(T, S), D)
            const cubes = computeCubes(uPhase, adv, activeMotion)
            // Cubes ease apart under the pointer, showing the hinges.
            const spread = 1 + HOVER_SPREAD * ptr.over * h

            const cubePx = Math.max(4, num(p.size, 112))
            const fov = Math.max(5, Math.min(90, num(adv.fov, 25))) * DEG
            const f = 1 / Math.tan(fov / 2)
            const fpx = (f * H) / 2
            const Dz = fpx / cubePx
            const near = Math.max(0.01, Dz * 0.2)
            const far = Dz * 4 + 10
            const asp = W / H
            proj.fill(0)
            proj[0] = f / asp
            proj[5] = f
            proj[10] = (far + near) / (near - far)
            proj[11] = -1
            proj[14] = (2 * far * near) / (near - far)

            const offX = ((num(adv.offsetX, 0) / 100) * W) / cubePx
            const offY = (-(num(adv.offsetY, 0) / 100) * H) / cubePx
            const sc = 1 - Math.max(0, Math.min(50, num(adv.cubeGap, 1))) / 100

            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.useProgram(prog)
            gl.bindVertexArray(vao)

            gl.uniform3fv(u.face, parseColor(p.faceColor, [0.541, 0.282, 0.796]))
            gl.uniform3fv(u.hi, parseColor(adv.highlightColor, [0.561, 0.314, 0.745]))
            gl.uniform3fv(u.mid, parseColor(adv.midShadowColor, [0.169, 0.102, 0.376]))
            gl.uniform3fv(u.shadow, parseColor(adv.shadowColor, [0.043, 0.008, 0.2]))
            gl.uniform3fv(u.dot, parseColor(p.dotColor, [0.722, 0.702, 0.043]))
            gl.uniform3fv(u.mark, parseColor(p.markColor, [0.435, 0.827, 0.878]))
            const lx = num(adv.lightX, -62) / 100
            const ly = num(adv.lightY, 50) / 100
            const lz = Math.sqrt(Math.max(0.05, 1 - lx * lx - ly * ly))
            const ll = Math.hypot(lx, ly, lz) || 1
            gl.uniform3f(u.light, lx / ll, ly / ll, lz / ll)
            // View-space ray through the (eased) pointer, for the glint.
            const gx = (ptr.lx * asp) / f,
                gy = ptr.ly / f
            const gl2 = Math.hypot(gx, gy, 1)
            gl.uniform3f(u.ray, gx / gl2, gy / gl2, -1 / gl2)
            gl.uniform1f(u.lamp, GLINT_LAMP)
            gl.uniform1f(u.F, num(adv.faceLight, 60) / 100)
            gl.uniform1f(u.dotR, Math.max(0, num(adv.dotRadius, 26)) / 100)
            gl.uniform1f(u.rim, Math.max(0, num(adv.dotRim, 1)) / 100)
            gl.uniform1f(u.rimDark, clamp01(num(adv.rimDarkness, 55) / 100))
            gl.uniform1f(u.markSize, Math.max(0, num(adv.markSize, 8)) / 100)
            gl.uniform1f(u.markStroke, Math.max(0, num(adv.markStroke, 26)) / 100)
            gl.uniform1f(u.seam, Math.max(0, num(adv.seamWidth, 1)) / 100)
            gl.uniform1f(u.seamDark, clamp01(num(adv.seamDarkness, 35) / 100))
            gl.uniform1f(u.glow, clamp01(num(adv.faceGlow, 30) / 100))
            gl.uniform1f(u.streak, Math.max(0, num(adv.streak, 12)) / 100)
            gl.uniform1f(u.gloss, Math.max(0, num(adv.gloss, 40)) / 100)
            gl.uniform1f(u.shine, Math.max(1, num(adv.shininess, 260)))
            gl.uniform1f(u.refl, Math.max(0, num(adv.reflection, 35)) / 100)
            gl.uniform1f(u.bevel, Math.max(0, num(adv.bevel, 4)) / 100)
            gl.uniformMatrix4fv(u.proj, false, proj)

            for (let k = 0; k < 8; k++) {
                const c = cubes[k]
                const A = mul3(G, mul3(c.R, slotBase[k]))
                const t = app3(G, [c.p[0] * spread, c.p[1] * spread, c.p[2] * spread])
                mv[0] = A[0] * sc
                mv[1] = A[3] * sc
                mv[2] = A[6] * sc
                mv[3] = 0
                mv[4] = A[1] * sc
                mv[5] = A[4] * sc
                mv[6] = A[7] * sc
                mv[7] = 0
                mv[8] = A[2] * sc
                mv[9] = A[5] * sc
                mv[10] = A[8] * sc
                mv[11] = 0
                mv[12] = t[0] + offX
                mv[13] = t[1] + offY
                mv[14] = t[2] - Dz
                mv[15] = 1
                nm[0] = A[0]
                nm[1] = A[3]
                nm[2] = A[6]
                nm[3] = A[1]
                nm[4] = A[4]
                nm[5] = A[7]
                nm[6] = A[2]
                nm[7] = A[5]
                nm[8] = A[8]
                gl.uniformMatrix4fv(u.mv, false, mv)
                gl.uniformMatrix3fv(u.nm, false, nm)
                gl.uniform1f(u.seed, slotSeed[k])
                gl.drawArrays(gl.TRIANGLES, 0, 36)
            }
        }
        raf = requestAnimationFrame(loop)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onEnter)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            window.removeEventListener("scroll", onScroll, true)
            gl.deleteBuffer(buf)
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
                minWidth: 1200,
                minHeight: 800,
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: `radial-gradient(circle at 100% 0%, ${glow} 0%, ${background} 100%)`,
                isolation: "isolate",
                touchAction: drag ? "none" : "manipulation",
                cursor: drag ? "grab" : undefined,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
            <div
                ref={grainRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    backgroundRepeat: "repeat",
                    backgroundSize: "128px 128px",
                    mixBlendMode: "overlay",
                    opacity: grainOpacity * 0.6,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${vignette}) 100%)`,
                    opacity: vignette > 0 ? 1 : 0,
                }}
            />
        </div>
    )
}

/** Where the glint rests when no pointer is over the block, in frame units (-1…1). */
const IDLE_GLINT = [-0.22, 0.3]
/** How far the glint's lamp hangs off the face, in cube edges: nearer is a smaller, hotter spot. */
const GLINT_LAMP = 1.5
/** How far the cubes ease apart under the pointer at Hover 50, as a share of their spacing. */
const HOVER_SPREAD = 0.06

/** Apply a screen-space yaw/pitch to the drag rotation D, which sits under tilt T and spin S. */
function turnInScreen(D: M3, T: M3, S: M3, yaw: number, pitch: number): M3 {
    const M = mul3(T, S)
    return ortho(mul3(tr3(M), mul3(mul3(rotY(yaw), rotX(pitch)), mul3(M, D))))
}

// Control order arranged in the builder.
