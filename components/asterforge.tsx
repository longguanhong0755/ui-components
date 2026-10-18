"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

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

/* ------------------------------------------------------------------ *
 *  PewterAster
 *
 *  A ball of brushed-metal five-point star plates, packed so tightly
 *  that every tip sits in a neighbour's notch, turning slowly while a
 *  swell rolls down it. Modelled on a still render of a sphere of
 *  interlocking metal stars.
 *
 *  Layout: a Fibonacci spiral relaxed by repulsion into an even, mostly
 *  hexagonal packing; each star is then turned (coordinate descent on
 *  the tip-meets-tip collisions with its neighbours) so the plates lock
 *  together instead of crossing.
 *
 *  Interaction
 *    Hover   stars under the pointer lift off the ball, twist and catch
 *            the light; the ball leans toward the pointer.
 *    Tap     sends a ripple of lifting stars out from that point and all
 *            the way round to the far side.
 *    Drag    sideways spins the ball; let go and it coasts. Vertical
 *            drags still scroll the page on touch.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * ------------------------------------------------------------------ */

export interface PewterAsterProps {
    /** Fill behind the sphere. */
    background?: string
    /** Number of star plates; stars shrink as the count rises. */
    stars?: number
    /** Base metal colour of the stars before lighting. */
    color?: string
    /** 0–10: how far stars under the pointer lift, and how far the ball leans toward it. */
    hover?: number
    /** 0–10: strength of the ripple a tap sends across the ball. */
    tap?: number
    /** 0–10: turn rate. 5 = one turn every 16 s. */
    speed?: number
    /** 0–10: how far the stars push out in the travelling swell. */
    breathe?: number
    /** Tuning constants behind the look; a partial object is fine. */
    advanced?: Partial<PewterAsterAdvanced>
    style?: CSSProperties
}

export interface PewterAsterAdvanced {
    seed: number
    starSize: number
    innerRatio: number
    thickness: number
    bevel: number
    seam: number
    heightJitter: number
    ballSize: number
    camDistance: number
    offsetX: number
    offsetY: number
    lightX: number
    lightY: number
    lightZ: number
    ambient: number
    diffuse: number
    wrap: number
    specular: number
    shininess: number
    edgeShine: number
    faceCurve: number
    rimColor: string
    rimStrength: number
    interior: number
    grain: number
    vignette: number
    turnTime: number
    axisLean: number
    axisTip: number
    breatheTime: number
    waveSpread: number
    hoverTilt: number
    hoverEase: number
    hoverReach: number
    lift: number
    twist: number
    rippleSpeed: number
}

// The look, tuned against the reference. Percentages are of the unit named.
const DEFAULT_ADVANCED: PewterAsterAdvanced = {
    // Shape
    seed: 7, // starting turns for the interlock solver
    // Outer radius at 80 stars, % of the sphere radius. The largest the
    // packing takes with every tip locked in a notch and no plate crossing
    // another; the reference's ratio of star to spacing.
    starSize: 22,
    innerRatio: 52, // inner radius, % of outer
    thickness: 12, // plate, % of outer radius
    bevel: 35, // chamfer, % of thickness
    seam: 4, // gap the solver keeps between plates, % of outer radius
    heightJitter: 0, // random radial offset per star, % of sphere radius
    // Framing
    ballSize: 86, // diameter, % of the frame's short side; room for lifted stars
    // In sphere radii. Close, as in the reference: the front stars loom and
    // the rim ones crowd edge-on.
    camDistance: 3.6,
    offsetX: 0, // % of the frame
    offsetY: 0,
    // Light
    lightX: -50,
    lightY: 60,
    lightZ: 75,
    ambient: 10,
    diffuse: 118,
    wrap: 15,
    specular: 65,
    shininess: 18,
    edgeShine: 80, // highlight on the bevels, % of Specular
    faceCurve: 45, // face normals bent toward the sphere, for a soft per-star gradient
    rimColor: "#9EA6B3",
    rimStrength: 22,
    interior: 22, // brightness of far-side stars seen through the gaps
    grain: 0,
    vignette: 0,
    // Motion
    turnTime: 16, // s per turn at Speed 5
    axisLean: 15, // ° spin axis leans right
    axisTip: 10, // ° top of the axis tipped toward the viewer
    breatheTime: 8, // s per swell
    waveSpread: 120, // ° phase lag of the swell, top to bottom
    // Response
    hoverTilt: 24, // ° lean toward the pointer at Hover 10
    hoverEase: 400, // ms
    hoverReach: 29, // ° round the pointer that lifts
    lift: 22, // % of sphere radius at full strength
    twist: 29, // ° a fully lifted star turns
    rippleSpeed: 140, // °/s the tap ripple travels
}

const GRAIN_URL = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`

const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in float aKind;
layout(location=3) in vec3 aDir;
layout(location=4) in vec2 aInst; // x: turn, y: random 0..1
uniform mat3 uModel;
uniform float uFocal;
uniform float uAspect;
uniform float uCam;
uniform float uPush;
uniform float uBreath;
uniform float uWave;
uniform float uJitter;
uniform vec2 uOff;
uniform vec4 uHit;    // xyz: pointer on the ball (model space), w: hover strength
uniform vec4 uRip[4]; // xyz: tap point (model space), w: age in s, < 0 unused
uniform float uTap;
uniform float uReach;     // rad
uniform float uLift;      // sphere radii
uniform float uTwist;     // rad
uniform float uRipSpeed;  // rad/s
out vec3 vPos;
out vec3 vNor;
out float vKind;
out vec3 vDirW;
out float vGlow;
void main() {
    vec3 n = normalize(aDir);
    // Hover: stars within uReach of the pointer.
    float hov = uHit.w * smoothstep(uReach, 0.0, acos(clamp(dot(n, uHit.xyz), -1.0, 1.0)));
    // Tap: a ring travelling uRipSpeed, 0.3 rad wide, fading over ~1 s.
    float rip = 0.0;
    for (int i = 0; i < 4; i++) {
        float age = uRip[i].w;
        if (age < 0.0) continue;
        float x = (acos(clamp(dot(n, uRip[i].xyz), -1.0, 1.0)) - age * uRipSpeed) / 0.3;
        rip += exp(-x * x - age);
    }
    float e = hov + rip * uTap;
    vec3 up = abs(n.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 t = normalize(cross(up, n));
    vec3 b = cross(n, t);
    float ang = aInst.x + e * uTwist; // lifted stars twist out of their lock
    float c = cos(ang);
    float s = sin(ang);
    vec3 t2 = t * c + b * s;
    vec3 b2 = -t * s + b * c;
    float sw = max(sin(uBreath - uWave * (1.0 - n.y) * 0.5), 0.0);
    float r = 1.0 + aInst.y * uJitter + uPush * sw * sw + e * uLift;
    vec3 lp = t2 * aPos.x + b2 * aPos.y + n * (r + aPos.z);
    vec3 ln = normalize(t2 * aNor.x + b2 * aNor.y + n * aNor.z);
    vec3 wp = uModel * lp;
    vPos = wp;
    vNor = uModel * ln;
    vKind = aKind;
    vDirW = uModel * n;
    vGlow = min(e, 1.0);
    float w = max(uCam - wp.z, 0.001);
    gl_Position = vec4(wp.x * uFocal / uAspect + uOff.x * w, wp.y * uFocal + uOff.y * w, (-wp.z / 2.5) * w, w);
}`

const FRAG = `#version 300 es
precision highp float;
in vec3 vPos;
in vec3 vNor;
in float vKind;
in vec3 vDirW;
in float vGlow;
uniform vec3 uBase;
uniform vec3 uRim;
uniform vec3 uLight;
uniform float uCam;
uniform float uAmb;
uniform float uDiff;
uniform float uWrap;
uniform float uSpec;
uniform float uShin;
uniform float uEdge;
uniform float uCurve;
uniform float uRimS;
uniform float uInner;
out vec4 outColor;
void main() {
    vec3 N = normalize(vNor);
    if (vKind < 0.5) N = normalize(mix(N, normalize(vPos), uCurve));
    vec3 V = normalize(vec3(0.0, 0.0, uCam) - vPos);
    vec3 L = normalize(uLight);
    float diff = clamp((dot(N, L) + uWrap) / max(1.0 + uWrap, 0.001), 0.0, 1.0);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), max(uShin, 1.0)) * uSpec;
    if (vKind > 0.5 && vKind < 1.5) spec *= uEdge;
    float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0) * uRimS;
    float occl = mix(uInner, 1.0, smoothstep(-0.35, -0.05, dot(normalize(vDirW), V)));
    vec3 col = uBase * (uAmb + uDiff * diff) + vec3(spec) + uRim * rim;
    col *= occl * (1.0 + vGlow * 0.35);
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

function parseColor(input: unknown, fb: number[]): number[] {
    if (typeof input !== "string") return fb
    let s = input.trim()
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
        return fb
    }
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (m) {
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && p.slice(0, 3).every((x) => isFinite(x))) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fb
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

type V3 = number[]

const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const norm = (a: V3): V3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1
    return [a[0] / l, a[1] / l, a[2] / l]
}

/** Extruded five-point star: back cap, walls, 45° chamfer, inset front cap. Units = sphere radius. */
function buildStarMesh(ro: number, ri: number, thick: number, bev: number): Float32Array {
    const P: number[][] = []
    for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / 5
        const r = i % 2 === 0 ? ro : ri
        P.push([Math.cos(a) * r, Math.sin(a) * r])
    }
    const N: number[][] = []
    for (let i = 0; i < 10; i++) {
        const p = P[i]
        const q = P[(i + 1) % 10]
        const dx = q[0] - p[0]
        const dy = q[1] - p[1]
        const len = Math.hypot(dx, dy) || 1
        N.push([-dy / len, dx / len])
    }
    const I: number[][] = []
    for (let i = 0; i < 10; i++) {
        const n1 = N[(i + 9) % 10]
        const n2 = N[i]
        const d = Math.max(1 + n1[0] * n2[0] + n1[1] * n2[1], 0.2)
        const k = bev / d
        I.push([P[i][0] + (n1[0] + n2[0]) * k, P[i][1] + (n1[1] + n2[1]) * k])
    }
    const z0 = 0
    const z2 = thick
    const z1 = thick - bev
    const out: number[] = []
    const push = (p: V3, n: V3, kind: number) => out.push(p[0], p[1], p[2], n[0], n[1], n[2], kind)
    const tri = (a: V3, b: V3, c: V3, n: V3, kind: number) => {
        push(a, n, kind)
        push(b, n, kind)
        push(c, n, kind)
    }
    const quad = (a: V3, b: V3, c: V3, d: V3, n: V3, kind: number) => {
        tri(a, b, c, n, kind)
        tri(a, c, d, n, kind)
    }
    const s2 = Math.SQRT1_2
    for (let i = 0; i < 10; i++) {
        const j = (i + 1) % 10
        tri([0, 0, z2], [I[i][0], I[i][1], z2], [I[j][0], I[j][1], z2], [0, 0, 1], 0)
        tri([0, 0, z0], [P[j][0], P[j][1], z0], [P[i][0], P[i][1], z0], [0, 0, -1], 3)
        const o = [-N[i][0], -N[i][1]]
        quad(
            [P[i][0], P[i][1], z0],
            [P[j][0], P[j][1], z0],
            [P[j][0], P[j][1], z1],
            [P[i][0], P[i][1], z1],
            [o[0], o[1], 0],
            2
        )
        quad(
            [P[i][0], P[i][1], z1],
            [P[j][0], P[j][1], z1],
            [I[j][0], I[j][1], z2],
            [I[i][0], I[i][1], z2],
            [o[0] * s2, o[1] * s2, s2],
            1
        )
    }
    return new Float32Array(out)
}

/**
 * Star centres and turns: [x, y, z, spin, random] per star. The Fibonacci
 * spiral is relaxed by repulsion into an even packing, then each star is
 * turned so its tips point into its neighbours' notches rather than at their
 * tips, keeping `seam` clear between plates. Sizes are in sphere radii.
 */
function buildInstances(count: number, ro: number, ri: number, seam: number, seed: number): Float32Array {
    const n = count
    const p: V3[] = []
    for (let i = 0; i < n; i++) {
        const y = 1 - (2 * (i + 0.5)) / n
        const r = Math.sqrt(Math.max(0, 1 - y * y))
        const phi = i * 2.399963
        p.push([Math.cos(phi) * r, y, Math.sin(phi) * r])
    }
    const a = Math.sqrt((4 * Math.PI) / n) // mean spacing
    const step = 0.1 * a * a * a
    for (let it = 0; it < 60; it++) {
        const f: V3[] = p.map(() => [0, 0, 0])
        for (let i = 0; i < n; i++)
            for (let j = i + 1; j < n; j++) {
                const d = [p[i][0] - p[j][0], p[i][1] - p[j][1], p[i][2] - p[j][2]]
                const l2 = Math.max(dot(d, d), 1e-6)
                const inv = 1 / (l2 * Math.sqrt(l2))
                for (let c = 0; c < 3; c++) {
                    f[i][c] += d[c] * inv
                    f[j][c] -= d[c] * inv
                }
            }
        for (let i = 0; i < n; i++) {
            const fp = dot(f[i], p[i])
            const ft = [f[i][0] - p[i][0] * fp, f[i][1] - p[i][1] * fp, f[i][2] - p[i][2] * fp]
            const m = Math.hypot(ft[0], ft[1], ft[2]) * step
            const k = m > 0.1 * a ? (0.1 * a) / m : 1
            p[i] = norm([p[i][0] + ft[0] * step * k, p[i][1] + ft[1] * step * k, p[i][2] + ft[2] * step * k])
        }
    }

    // Tangent frames, exactly as the vertex shader builds them.
    const T: V3[] = []
    const B: V3[] = []
    for (const q of p) {
        const t = norm(cross(Math.abs(q[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0], q))
        T.push(t)
        B.push(cross(q, t))
    }
    // Neighbours within the first shell, with the direction to each in the
    // star's own frame.
    const nb: { j: number; phi: number }[][] = p.map(() => [])
    for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
            if (i === j) continue
            const d = [p[j][0] - p[i][0], p[j][1] - p[i][1], p[j][2] - p[i][2]]
            if (dot(d, d) > 1.4 * 1.4 * a * a) continue
            nb[i].push({ j, phi: Math.atan2(dot(d, B[i]), dot(d, T[i])) })
        }
    const phiOf = (i: number, j: number) => nb[i].find((e) => e.j === j)?.phi ?? 0
    // tip(i→j) = cos 5(φ − π/2 − θ): +1 when i's tip points at j, −1 for a
    // notch. Minimise Σ (1 + tip(i→j))(1 + tip(j→i)) over pairs — zero for
    // tip-into-notch, worst for tip-against-tip. For one star with the rest
    // held, that is a single cosine in 5θ, so each step is closed form.
    const rnd = mulberry32(seed * 9973 + 17)
    const theta = p.map(() => rnd() * Math.PI * 2)
    for (let sweep = 0; sweep < 40; sweep++)
        for (let i = 0; i < n; i++) {
            let C = 0
            let S = 0
            for (const { j, phi } of nb[i]) {
                const w = 1 + Math.cos(5 * (phiOf(j, i) - Math.PI / 2 - theta[j]))
                const psi = 5 * (phi - Math.PI / 2)
                C += w * Math.cos(psi)
                S += w * Math.sin(psi)
            }
            theta[i] = (Math.atan2(S, C) + Math.PI) / 5
        }

    // That only looks along the line between centres. Refine on the shapes
    // themselves: push each star's outline against its neighbours' (in its
    // own tangent plane) and keep the turn with the least penetration.
    const W = (2 * Math.PI) / 5
    // Radius of the outline at an angle from a tip, tabled over one tip-to-tip span.
    const E = [ri * Math.cos(Math.PI / 5) - ro, ri * Math.sin(Math.PI / 5)]
    const RAD_STEPS = 256
    const radTable = new Float64Array(RAD_STEPS + 1)
    for (let k = 0; k <= RAD_STEPS; k++) {
        const x = Math.min((k / RAD_STEPS) * W, W - (k / RAD_STEPS) * W)
        radTable[k] = (ro * E[1]) / (Math.cos(x) * E[1] - Math.sin(x) * E[0])
    }
    const radAt = (al: number) => {
        let u = (al / W) % 1
        if (u < 0) u += 1
        return radTable[(u * RAD_STEPS + 0.5) | 0]
    }
    // Outline samples, tip along +x: corners and edge midpoints.
    const OX: number[] = []
    const OY: number[] = []
    for (let k = 0; k < 10; k++) {
        const r0 = k % 2 ? ri : ro
        const r1 = k % 2 ? ro : ri
        const a0 = (k * Math.PI) / 5
        const a1 = a0 + Math.PI / 5
        OX.push(Math.cos(a0) * r0, (Math.cos(a0) * r0 + Math.cos(a1) * r1) / 2)
        OY.push(Math.sin(a0) * r0, (Math.sin(a0) * r0 + Math.sin(a1) * r1) / 2)
    }
    const GAP = seam
    // Neighbours in i's plane: centre, and how far j's frame is turned from i's.
    const local = nb.map((list, i) =>
        list.map(({ j }) => {
            const d = [p[j][0] - p[i][0], p[j][1] - p[i][1], p[j][2] - p[i][2]]
            return { j, cx: dot(d, T[i]), cy: dot(d, B[i]), dl: Math.atan2(dot(T[j], B[i]), dot(T[j], T[i])) }
        })
    )
    // Squared penetration, both ways, between star i turned to `th` and its
    // neighbours as they stand. `nq` holds each neighbour's outline in i's
    // polar coordinates, which do not change while only i turns.
    const cost = (i: number, th: number, nq: { tj: number; ang: number[]; rad: number[] }[]) => {
        let c = 0
        const ti = Math.PI / 2 + th
        const ci = Math.cos(ti)
        const si = Math.sin(ti)
        local[i].forEach(({ cx, cy }, m) => {
            const { tj, ang, rad } = nq[m]
            for (let k = 0; k < OX.length; k++) {
                const px = OX[k] * ci - OY[k] * si - cx
                const py = OX[k] * si + OY[k] * ci - cy
                const pi = radAt(Math.atan2(py, px) - tj) + GAP - Math.hypot(px, py)
                const pj = radAt(ang[k] - ti) + GAP - rad[k]
                if (pi > 0) c += pi * pi
                if (pj > 0) c += pj * pj
            }
        })
        return c
    }
    // Coarse pass over one tip-to-tip span, then a fine one round the best.
    for (let sweep = 0; sweep < 3; sweep++)
        for (let i = 0; i < n; i++) {
            const nq = local[i].map(({ j, cx, cy, dl }) => {
                const tj = Math.PI / 2 + theta[j] + dl
                const cj = Math.cos(tj)
                const sj = Math.sin(tj)
                const ang: number[] = []
                const rad: number[] = []
                for (let k = 0; k < OX.length; k++) {
                    const qx = cx + OX[k] * cj - OY[k] * sj
                    const qy = cy + OX[k] * sj + OY[k] * cj
                    ang.push(Math.atan2(qy, qx))
                    rad.push(Math.hypot(qx, qy))
                }
                return { tj, ang, rad }
            })
            let best = theta[i]
            let bestC = cost(i, best, nq)
            const centre = best
            for (let s = 0; s < 16; s++) {
                const th = centre + (s / 16) * W
                const c = cost(i, th, nq)
                if (c < bestC) [bestC, best] = [c, th]
            }
            const coarse = best
            for (let s = -4; s <= 4; s++) {
                const th = coarse + (s / 128) * W
                const c = cost(i, th, nq)
                if (c < bestC) [bestC, best] = [c, th]
            }
            theta[i] = best
        }

    const arr = new Float32Array(n * 5)
    for (let i = 0; i < n; i++) arr.set([p[i][0], p[i][1], p[i][2], theta[i], rnd()], i * 5)
    return arr
}

function mul(A: number[], B: number[]): number[] {
    const R = new Array(9).fill(0)
    for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) R[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]
    return R
}
const rx = (a: number) => {
    const c = Math.cos(a), s = Math.sin(a)
    return [1, 0, 0, 0, c, -s, 0, s, c]
}
const ry = (a: number) => {
    const c = Math.cos(a), s = Math.sin(a)
    return [c, 0, s, 0, 1, 0, -s, 0, c]
}
const rz = (a: number) => {
    const c = Math.cos(a), s = Math.sin(a)
    return [c, -s, 0, s, c, 0, 0, 0, 1]
}

export default function PewterAster({
    background = "#000000",
    stars = 221,
    color = "#430019",
    hover = 5,
    tap = 5,
    speed = 5,
    breathe = 4,
    advanced = {"lift":22,"seam":4,"seed":7,"wrap":15,"bevel":35,"grain":0,"twist":29,"lightX":-50,"lightY":60,"lightZ":75,"ambient":10,"axisTip":10,"diffuse":118,"offsetX":0,"offsetY":0,"axisLean":15,"ballSize":86,"interior":22,"rimColor":"#9EA6B3","specular":65,"starSize":22,"turnTime":16,"vignette":0,"edgeShine":80,"faceCurve":45,"hoverEase":400,"hoverTilt":24,"shininess":18,"thickness":12,"hoverReach":29,"innerRatio":52,"waveSpread":120,"breatheTime":8,"camDistance":3.6,"rimStrength":22,"rippleSpeed":140,"heightJitter":0},
    style,
}: PewterAsterProps) {
    const adv = { ...DEFAULT_ADVANCED, ...advanced }
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const valsRef = useRef({ stars, color, hover, tap, speed, breathe, adv })
    valsRef.current = { stars, color, hover, tap, speed, breathe, adv }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: true,
            premultipliedAlpha: true,
            preserveDrawingBuffer: true,
        })
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)
            if (!sh) throw new Error("shader alloc failed")
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader error")
            return sh
        }
        const vs = compile(gl.VERTEX_SHADER, VERT)
        const fs = compile(gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()
        if (!prog) throw new Error("program alloc failed")
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link error")
        gl.useProgram(prog)
        const loc = (name: string) => {
            const l = gl.getUniformLocation(prog, name)
            if (l === null) throw new Error("missing uniform " + name)
            return l
        }
        const U = {
            model: loc("uModel"),
            focal: loc("uFocal"),
            aspect: loc("uAspect"),
            cam: loc("uCam"),
            push: loc("uPush"),
            breath: loc("uBreath"),
            wave: loc("uWave"),
            hit: loc("uHit"),
            rip: loc("uRip"),
            tap: loc("uTap"),
            jitter: loc("uJitter"),
            off: loc("uOff"),
            reach: loc("uReach"),
            lift: loc("uLift"),
            twist: loc("uTwist"),
            ripSpeed: loc("uRipSpeed"),
            base: loc("uBase"),
            rim: loc("uRim"),
            light: loc("uLight"),
            amb: loc("uAmb"),
            diff: loc("uDiff"),
            wrap: loc("uWrap"),
            spec: loc("uSpec"),
            shin: loc("uShin"),
            edge: loc("uEdge"),
            curve: loc("uCurve"),
            rimS: loc("uRimS"),
            inner: loc("uInner"),
        }

        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        const meshBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, meshBuf)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12)
        gl.enableVertexAttribArray(2)
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24)
        const instBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, instBuf)
        gl.enableVertexAttribArray(3)
        gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 20, 0)
        gl.vertexAttribDivisor(3, 1)
        gl.enableVertexAttribArray(4)
        gl.vertexAttribPointer(4, 2, gl.FLOAT, false, 20, 12)
        gl.vertexAttribDivisor(4, 1)

        // Rebuilt only when the fields feeding them change.
        let meshKey = ""
        let instKey = ""
        let instCount = 0
        let vertCount = 0

        let cssW = root.offsetWidth || 1
        let cssH = root.offsetHeight || 1
        const resize = () => {
            cssW = Math.max(1, root.offsetWidth)
            cssH = Math.max(1, root.offsetHeight)
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.round(cssW * dpr)
            canvas.height = Math.round(cssH * dpr)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        // Pointer, in shares of the frame. `travel` tells a tap from a drag.
        const ptr = { nx: 0.5, ny: 0.5, over: false, down: false, lastNx: 0, lastNy: 0, lastT: 0, travel: 0, tx: 0, ty: 0 }
        let tapAt: number[] | null = null
        let radiusPx = 1
        let spinOff = 0
        let spinVel = 0
        const at = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            ptr.nx = (e.clientX - r.left) / Math.max(1, r.width)
            ptr.ny = (e.clientY - r.top) / Math.max(1, r.height)
        }
        const onMove = (e: PointerEvent) => {
            at(e)
            ptr.over = true
            if (!ptr.down) return
            const t = performance.now()
            // Moving a sphere radius turns the ball a radian: the front follows the finger.
            const d = ((ptr.nx - ptr.lastNx) * cssW) / radiusPx
            spinOff += d
            spinVel = spinVel * 0.5 + (d / (Math.max(1, t - ptr.lastT) / 1000)) * 0.5
            ptr.travel += Math.hypot((ptr.nx - ptr.lastNx) * cssW, (ptr.ny - ptr.lastNy) * cssH)
            ptr.lastNx = ptr.nx
            ptr.lastNy = ptr.ny
            ptr.lastT = t
        }
        const onDown = (e: PointerEvent) => {
            at(e)
            ptr.over = true
            ptr.down = true
            ptr.lastNx = ptr.nx
            ptr.lastNy = ptr.ny
            ptr.lastT = performance.now()
            ptr.travel = 0
            spinVel = 0
            try {
                root.setPointerCapture(e.pointerId)
            } catch (err) {}
            root.style.cursor = "grabbing"
        }
        const release = (e: PointerEvent, tapped: boolean) => {
            if (!ptr.down) return
            ptr.down = false
            root.style.cursor = "grab"
            if (tapped && ptr.travel < 6) tapAt = [ptr.nx, ptr.ny]
            if (performance.now() - ptr.lastT > 80) spinVel = 0 // held still before letting go
            spinVel = Math.max(-12, Math.min(12, spinVel))
            if (e.pointerType !== "mouse") ptr.over = false
        }
        const onUp = (e: PointerEvent) => release(e, true)
        const onCancel = (e: PointerEvent) => release(e, false)
        const onLeave = () => {
            if (!ptr.down) ptr.over = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerdown", onDown)
        root.addEventListener("pointerup", onUp)
        root.addEventListener("pointercancel", onCancel)
        root.addEventListener("pointerleave", onLeave)

        let still = false
        try {
            const rt = RenderTarget.current()
            still = rt === RenderTarget.thumbnail || rt === RenderTarget.export
        } catch (e) {
            still = false
        }
        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        const ripples: { c: V3; t0: number }[] = []
        const ripData = new Float32Array(16)
        let hitDir: V3 = [0, 0, 1]
        let hov = 0
        let clock = 0
        let last = -1
        let raf = 0
        const frame = (ms: number) => {
            raf = requestAnimationFrame(frame)
            const now = ms / 1000
            const dt = last < 0 ? 0 : Math.min(Math.max(0, now - last), 1 / 20)
            last = now
            const v = valsRef.current
            const a = v.adv
            const frozen = still || (mq ? mq.matches : false)
            if (!frozen) clock += (dt * Math.max(0, v.speed)) / 5

            // Geometry: star size scales with count so coverage stays the same.
            const n = Math.max(1, Math.round(v.stars))
            const ro_ = (Math.max(1, a.starSize) / 100) * Math.sqrt(80 / n)
            const ri_ = ro_ * Math.min(0.95, Math.max(0.1, a.innerRatio / 100))
            const thick = ro_ * Math.max(0.01, a.thickness / 100)
            const mk = `${ro_}|${ri_}|${thick}|${a.bevel}`
            if (mk !== meshKey) {
                meshKey = mk
                const mesh = buildStarMesh(ro_, ri_, thick, thick * Math.min(0.9, Math.max(0, a.bevel / 100)))
                gl.bindBuffer(gl.ARRAY_BUFFER, meshBuf)
                gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW)
                vertCount = mesh.length / 7
            }
            const seam = ro_ * Math.max(0, a.seam / 100)
            const seed = Math.round(a.seed)
            const ik = `${n}|${ro_}|${ri_}|${seam}|${seed}`
            if (ik !== instKey) {
                instKey = ik
                gl.bindBuffer(gl.ARRAY_BUFFER, instBuf)
                gl.bufferData(gl.ARRAY_BUFFER, buildInstances(n, ro_, ri_, seam, seed), gl.STATIC_DRAW)
                instCount = n
            }

            // Pointer: the ball leans toward it, eased.
            const hk = still ? 0 : Math.max(0, v.hover) / 10
            const k = 1 - Math.exp(-dt / Math.max(0.016, a.hoverEase / 1000))
            ptr.tx += ((ptr.over ? (ptr.nx - 0.5) * 2 * hk : 0) - ptr.tx) * k
            ptr.ty += ((ptr.over ? (ptr.ny - 0.5) * 2 * hk : 0) - ptr.ty) * k
            if (!ptr.down) {
                spinOff += spinVel * dt
                spinVel *= Math.exp(-dt * 2.5)
            }

            const D = Math.max(1.2, a.camDistance)
            const aspect = cssW / cssH
            radiusPx = ((Math.max(5, a.ballSize) / 100) * Math.min(cssW, cssH)) / 2
            const focal = ((2 * radiusPx) / cssH) * Math.sqrt(D * D - 1)
            const off = [a.offsetX / 50, -a.offsetY / 50] // in clip space
            const deg = Math.PI / 180
            const tilt = a.hoverTilt * deg
            const spin = (clock * Math.PI * 2) / Math.max(1, a.turnTime) + spinOff
            const model = mul(
                rx(a.axisTip * deg + ptr.ty * tilt),
                mul(ry(ptr.tx * tilt), mul(rz(-a.axisLean * deg), ry(spin)))
            )

            // Pointer → the point on the ball under it, in model space so it
            // turns with the stars. Ray from the camera (0, 0, D).
            const hitTest = (px: number, py: number): V3 | null => {
                const dx = ((px * 2 - 1 - off[0]) * aspect) / focal
                const dy = (1 - py * 2 - off[1]) / focal
                const dd = dx * dx + dy * dy + 1
                const disc = D * D - dd * (D * D - 1)
                if (disc < 0) return null
                const s = (D - Math.sqrt(disc)) / dd
                const w = [dx * s, dy * s, D - s]
                return [0, 1, 2].map((c) => model[c] * w[0] + model[3 + c] * w[1] + model[6 + c] * w[2])
            }
            const hit = ptr.over && !still ? hitTest(ptr.nx, ptr.ny) : null
            if (hit) hitDir = hit
            hov += ((hit ? hk * 1.4 : 0) - hov) * (1 - Math.exp(-dt / 0.15))
            if (tapAt) {
                const h = hitTest(tapAt[0], tapAt[1])
                if (h && v.tap > 0) ripples.push({ c: h, t0: now })
                if (ripples.length > 4) ripples.shift()
                tapAt = null
            }
            for (let i = 0; i < 4; i++) {
                const r = ripples[i]
                const age = r ? now - r.t0 : -1
                if (r && age < 4) ripData.set([r.c[0], r.c[1], r.c[2], age], i * 4)
                else ripData.set([0, 0, 1, -1], i * 4)
            }

            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LEQUAL)
            gl.disable(gl.CULL_FACE)
            gl.useProgram(prog)
            gl.bindVertexArray(vao)

            gl.uniformMatrix3fv(U.model, true, new Float32Array(model))
            gl.uniform1f(U.focal, focal)
            gl.uniform1f(U.aspect, aspect)
            gl.uniform1f(U.cam, D)
            gl.uniform1f(U.push, (Math.max(0, v.breathe) / 10) * 0.1)
            gl.uniform1f(U.breath, (clock * Math.PI * 2) / Math.max(1, a.breatheTime))
            gl.uniform1f(U.wave, Math.min(Math.PI, Math.max(0, a.waveSpread * deg)))
            gl.uniform1f(U.jitter, a.heightJitter / 100)
            gl.uniform2f(U.off, off[0], off[1])
            gl.uniform4f(U.hit, hitDir[0], hitDir[1], hitDir[2], hov)
            gl.uniform4fv(U.rip, ripData)
            gl.uniform1f(U.tap, (Math.max(0, v.tap) / 10) * 1.2)
            gl.uniform1f(U.reach, Math.max(0.01, a.hoverReach * deg))
            gl.uniform1f(U.lift, a.lift / 100)
            gl.uniform1f(U.twist, a.twist * deg)
            gl.uniform1f(U.ripSpeed, a.rippleSpeed * deg)
            const base = parseColor(v.color, [0.588, 0.604, 0.624])
            gl.uniform3f(U.base, base[0], base[1], base[2])
            const rim = parseColor(a.rimColor, [0.62, 0.65, 0.7])
            gl.uniform3f(U.rim, rim[0], rim[1], rim[2])
            const lit = Math.hypot(a.lightX, a.lightY, a.lightZ) > 1e-4
            gl.uniform3f(U.light, lit ? a.lightX : 0, lit ? a.lightY : 0, lit ? a.lightZ : 1)
            gl.uniform1f(U.amb, a.ambient / 100)
            gl.uniform1f(U.diff, a.diffuse / 100)
            gl.uniform1f(U.wrap, a.wrap / 100)
            gl.uniform1f(U.spec, a.specular / 100)
            gl.uniform1f(U.shin, Math.max(1, a.shininess))
            gl.uniform1f(U.edge, a.edgeShine / 100)
            gl.uniform1f(U.curve, Math.min(1, Math.max(0, a.faceCurve / 100)))
            gl.uniform1f(U.rimS, a.rimStrength / 100)
            gl.uniform1f(U.inner, Math.min(1, Math.max(0, a.interior / 100)))

            if (vertCount > 0 && instCount > 0) gl.drawArraysInstanced(gl.TRIANGLES, 0, vertCount, instCount)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerdown", onDown)
            root.removeEventListener("pointerup", onUp)
            root.removeEventListener("pointercancel", onCancel)
            root.removeEventListener("pointerleave", onLeave)
            gl.deleteBuffer(meshBuf)
            gl.deleteBuffer(instBuf)
            gl.deleteVertexArray(vao)
            gl.deleteProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
        }
    }, [])

    const grain = Math.max(0, Math.min(100, adv.grain)) / 100
    const vignette = Math.max(0, Math.min(100, adv.vignette)) / 100

    return (
        <div
            ref={rootRef}
            style={{
                width: "100%",
                height: "100%",
                ...style,
                position: "relative",
                overflow: "hidden",
                background,
                cursor: "grab",
                // Sideways drags spin the ball; vertical ones still scroll the page.
                touchAction: "pan-y",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "block" }}
            />
            {vignette > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${vignette * 0.9}) 100%)`,
                    }}
                />
            )}
            {grain > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        backgroundImage: GRAIN_URL,
                        backgroundSize: "160px 160px",
                        opacity: grain * 0.2,
                    }}
                />
            )}
        </div>
    )
}

/** A numeric Advanced field, its default read from DEFAULT_ADVANCED. */
function advNumber(
    key: Exclude<keyof PewterAsterAdvanced, "rimColor">,
    title: string,
    min: number,
    max: number,
    step: number,
    unit: string,
    description: string
) {
    return { type: ControlType.Number, title, min, max, step, unit, defaultValue: DEFAULT_ADVANCED[key], description }
}
