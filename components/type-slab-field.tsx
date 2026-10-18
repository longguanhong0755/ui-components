"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/* ---------------------------------------------------------------- constants */

const FOV = 30 // degrees, the source's lens
const NEAR = 1
const FAR = 2000

// Source material. Cut from the panel as micro-physics (rule 11b) and frozen.
const METALNESS = 0.9
const ROUGHNESS = 0.2

// Source lights: SpotLight(colour, 1, 1000, 1) — intensity 1, cutoff 1000,
// cone half-angle 1 radian, penumbra 0, decay 1, aimed at the origin. Their
// fixed (20, y, 3) is held here as a fraction of the frustum's half-width, so
// the same 20 comes out at the default Distance and the cone still covers the
// sheet at any other.
const LIGHT_X_F = 20 / 10.718
const LIGHT_Z_F = 3 / 10.718
const CONE_COS = Math.cos(1)
const LIGHT_CUTOFF = 1000
const KEY_GAIN_F = 20 / 10.718 // white light: y = pointer * 20
const ACCENT_GAIN_F = 10 / 10.718 // blue light: y = pointer * 10
// TweenMax.to(light.position, 2.5, {y}) restarted every frame is an ease, not
// a step: 2.5s to arrive, as a rate so a 30fps frame moves the same distance.
const LIGHT_K = 3 / 2.5

// Source z ramp: map(d/4, 0.3, 0, 0, 1) - 5, i.e. -4 at the cursor falling one
// unit of z per 1.2 of distance. Both are per 5 units of cell spacing.
const NEAR_Z = -4
const RAMP = 1.2
const REF_SPACING = 5
// Source per-mesh tween duration: clamp(d/3, 0.5, 1.5) seconds, in the same
// per-spacing terms. ln(20) gets an exponential to 95% inside that time.
const LAG_DIV = 3
const LAG_MIN = 0.5
const LAG_MAX = 1.5
const LAG_K = 3

// Source fog, black from 32 to 45 with the camera 40 out.
const FOG_NEAR_F = 32 / 40
const FOG_SPAN_F = 13 / 40

// Idle Lissajous. It walks the HIT POINT across the sheet in world units
// rather than the pointer across the frame, so it can never point at empty
// space with the whole field sunk to black. IDLE_REACH is the fraction of the
// sheet's half-extent it covers; IDLE_AY is the pointer height the two lights
// see, which is all they ever read of it.
const IDLE_REACH = 0.55
const IDLE_AY = 0.55
const IDLE_WX = 0.45 // rad/s at Speed 50
const IDLE_WY = 0.31

// Glyph rasterisation. 160px on a 400px canvas leaves 1.25 ems of headroom
// around the em box for ascenders, descenders and swashes; ALPHA_CUT is the
// mask threshold and TRACE_EPS the simplification tolerance, in pixels, which
// is what turns a staircase back into a diagonal.
const RASTER_EM = 160
const RASTER_BOX = 400
const ALPHA_CUT = 127
const TRACE_EPS = 1.1

// A cell is one glyph; this is the ceiling on how many the sheet will draw at
// once, so a small canvas at a high Density cannot ask for 20k of them.
const MAX_CELLS = 2600
// ...and this is the ceiling on how far past the frame the sheet is built, so
// that a wide Fade cannot quietly turn Density into a different cell size.
const COVER_MAX = 1.6

const MAX_DPR = 2

/* ------------------------------------------------------------------ shaders */

// A JS number with no fraction stringifies without a point, and GLSL then
// types it as an int — `float * 1` does not compile and the component goes
// black. Every interpolated constant goes through here.
function f(n: number): string {
    return Number.isInteger(n) ? n.toFixed(1) : String(n)
}

const VERT = `#version 300 es
precision highp float;

in vec3 aPos;       // xy in ems (the em box is 0..1), z the extrusion fraction
in vec3 aNormal;    // in the same baked space as aPos, not world space
in vec2 aCell;      // per instance: column, row

uniform mat4 uView, uProj;
uniform vec2 uOrigin;
uniform float uSize, uDepth, uSpacing;
uniform sampler2D uCellZ;

out vec3 vPos;
out vec3 vNormal;
out float vFogDepth;

void main() {
    float z = texelFetch(uCellZ, ivec2(aCell), 0).r;
    vec3 world = vec3(
        aPos.xy * uSize + uOrigin + aCell * uSpacing,
        z + aPos.z * uDepth
    );
    vec4 mv = uView * vec4(world, 1.0);
    vPos = world;
    // aPos is scaled by (Size, Size, Depth), so normals take the inverse
    // transpose of that. Caps and side walls come through unchanged; the bevel
    // faces are the ones that would otherwise tilt with the dials.
    vNormal = normalize(vec3(aNormal.xy, aNormal.z * uSize / uDepth));
    vFogDepth = -mv.z;   // three's fog is view depth, not distance
    gl_Position = uProj * mv;
}`

// three r108's MeshPhysicalMaterial under two spots, with PHYSICALLY_CORRECT_
// LIGHTS off: irradiance carries a PI factor that the Lambert BRDF divides
// straight back out, the spot cone is a hard step at penumbra 0, and the
// distance term is (1 - d/cutoff) at decay 1. No env map, so there is no
// indirect term at all — the emissive is the whole ambient.
const FRAG = `#version 300 es
precision highp float;

in vec3 vPos;
in vec3 vNormal;
in float vFogDepth;

uniform vec3 uEye;
uniform vec3 uAlbedo, uEmissive;
uniform vec3 uKeyPos, uKeyColor;
uniform vec3 uAccentPos, uAccentColor;
uniform vec3 uFogColor;
uniform float uFogNear, uFogFar;

out vec4 outColor;

const float PI = 3.141592653589793;
const float METALNESS = ${f(METALNESS)};
const float ROUGHNESS = ${f(ROUGHNESS)};
const float CONE_COS = ${f(CONE_COS)};
const float CUTOFF = ${f(LIGHT_CUTOFF)};

vec3 fresnel(vec3 f0, float vDotH) {
    // three's Schlick approximation, the exp2 form
    float f = exp2((-5.55473 * vDotH - 6.98316) * vDotH);
    return f0 * (1.0 - f) + f;
}

float ggx(float nDotH, float a2) {
    float d = nDotH * nDotH * (a2 - 1.0) + 1.0;
    return a2 / (PI * d * d);
}

float smithV(float nDotL, float nDotV, float a2) {
    float gv = nDotL * sqrt(nDotV * nDotV * (1.0 - a2) + a2);
    float gl = nDotV * sqrt(nDotL * nDotL * (1.0 - a2) + a2);
    return 0.5 / max(gv + gl, 1e-6);
}

vec3 spot(vec3 lightPos, vec3 color, vec3 n, vec3 v, vec3 diffuse, vec3 f0, float a2) {
    vec3 lv = lightPos - vPos;
    float dist = length(lv);
    vec3 l = lv / max(dist, 1e-6);
    // the source aims both spots at the origin; three's spot direction runs
    // from the target back to the light
    vec3 sdir = normalize(lightPos);
    if (dot(l, sdir) <= CONE_COS) return vec3(0.0);
    float atten = clamp(1.0 - dist / CUTOFF, 0.0, 1.0);

    float nDotL = dot(n, l);
    if (nDotL <= 0.0) return vec3(0.0);
    float nDotV = max(dot(n, v), 1e-4);
    vec3 h = normalize(l + v);

    // irradiance = color * atten * nDotL * PI  (the non-physical PI)
    vec3 irradiance = color * atten * nDotL * PI;
    vec3 dif = irradiance * diffuse / PI;
    vec3 spe = irradiance * fresnel(f0, max(dot(v, h), 0.0))
             * smithV(nDotL, nDotV, a2) * ggx(max(dot(n, h), 0.0), a2);
    return dif + spe;
}

void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(uEye - vPos);
    if (!gl_FrontFacing) n = -n;

    vec3 diffuse = uAlbedo * (1.0 - METALNESS);
    vec3 f0 = mix(vec3(0.04), uAlbedo, METALNESS);
    float a = ROUGHNESS * ROUGHNESS;
    float a2 = max(a * a, 1e-6);

    vec3 c = uEmissive;
    c += spot(uKeyPos, uKeyColor, n, v, diffuse, f0, a2);
    c += spot(uAccentPos, uAccentColor, n, v, diffuse, f0, a2);

    float fog = smoothstep(uFogNear, uFogFar, vFogDepth);
    outColor = vec4(mix(c, uFogColor, fog), 1.0);
}`

/* --------------------------------------------------------------- ear clipping */

// Ear clipping with hole bridging, the mapbox/earcut algorithm minus its
// z-order hash — a traced glyph runs to a few hundred points, where the plain
// O(n^2) walk costs microseconds and the hash is only a liability. Input is a
// flat [x, y, x, y, ...] with the outer ring first and each hole's start index
// in `holeStarts`; output is triangle indices into that same array.
interface ENode {
    i: number
    x: number
    y: number
    prev: ENode
    next: ENode
    steiner: boolean
}

function makeNode(i: number, x: number, y: number): ENode {
    const n = { i, x, y, steiner: false } as ENode
    n.prev = n
    n.next = n
    return n
}

function insertNode(i: number, x: number, y: number, last: ENode | null): ENode {
    const n = makeNode(i, x, y)
    if (!last) return n
    n.next = last.next
    n.prev = last
    last.next.prev = n
    last.next = n
    return n
}

function removeNode(n: ENode) {
    n.next.prev = n.prev
    n.prev.next = n.next
}

function area3(p: ENode, q: ENode, r: ENode): number {
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y)
}

function sameXY(a: ENode, b: ENode): boolean {
    return a.x === b.x && a.y === b.y
}

function ringArea(data: number[], start: number, end: number): number {
    let sum = 0
    for (let i = start, j = end - 2; i < end; i += 2) {
        sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1])
        j = i
    }
    return sum
}

function ringToList(
    data: number[],
    start: number,
    end: number,
    clockwise: boolean
): ENode | null {
    let last: ENode | null = null
    if (clockwise === ringArea(data, start, end) > 0) {
        for (let i = start; i < end; i += 2) last = insertNode(i, data[i], data[i + 1], last)
    } else {
        for (let i = end - 2; i >= start; i -= 2) last = insertNode(i, data[i], data[i + 1], last)
    }
    if (last && sameXY(last, last.next)) {
        removeNode(last)
        last = last.next
    }
    return last
}

function filterPoints(start: ENode | null, end?: ENode): ENode | null {
    if (!start) return start
    if (!end) end = start
    let p = start
    let again: boolean
    do {
        again = false
        if (!p.steiner && (sameXY(p, p.next) || area3(p.prev, p, p.next) === 0)) {
            removeNode(p)
            p = end = p.prev
            if (p === p.next) break
            again = true
        } else {
            p = p.next
        }
    } while (again || p !== end)
    return end
}

function inTriangle(
    ax: number, ay: number, bx: number, by: number,
    cx: number, cy: number, px: number, py: number
): boolean {
    return (
        (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
        (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
        (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0
    )
}

function isEar(ear: ENode): boolean {
    const a = ear.prev
    const b = ear
    const c = ear.next
    if (area3(a, b, c) >= 0) return false // reflex, cannot be an ear
    let p = c.next
    while (p !== a) {
        if (
            inTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area3(p.prev, p, p.next) >= 0
        ) {
            return false
        }
        p = p.next
    }
    return true
}

function intersects(p1: ENode, q1: ENode, p2: ENode, q2: ENode): boolean {
    const o1 = Math.sign(area3(p1, q1, p2))
    const o2 = Math.sign(area3(p1, q1, q2))
    const o3 = Math.sign(area3(p2, q2, p1))
    const o4 = Math.sign(area3(p2, q2, q1))
    if (o1 !== o2 && o3 !== o4) return true
    return false
}

function intersectsPolygon(a: ENode, b: ENode): boolean {
    let p = a
    do {
        if (
            p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i &&
            intersects(p, p.next, a, b)
        ) {
            return true
        }
        p = p.next
    } while (p !== a)
    return false
}

function locallyInside(a: ENode, b: ENode): boolean {
    return area3(a.prev, a, a.next) < 0
        ? area3(a, b, a.next) >= 0 && area3(a, a.prev, b) >= 0
        : area3(a, b, a.prev) < 0 || area3(a, a.next, b) < 0
}

function middleInside(a: ENode, b: ENode): boolean {
    let p = a
    let inside = false
    const px = (a.x + b.x) / 2
    const py = (a.y + b.y) / 2
    do {
        if (
            p.y > py !== p.next.y > py &&
            p.next.y !== p.y &&
            px < ((p.next.x - p.x) * (py - p.y)) / (p.next.y - p.y) + p.x
        ) {
            inside = !inside
        }
        p = p.next
    } while (p !== a)
    return inside
}

function splitPolygon(a: ENode, b: ENode): ENode {
    const a2 = makeNode(a.i, a.x, a.y)
    const b2 = makeNode(b.i, b.x, b.y)
    const an = a.next
    const bp = b.prev
    a.next = b
    b.prev = a
    a2.next = an
    an.prev = a2
    b2.next = a2
    a2.prev = b2
    bp.next = b2
    b2.prev = bp
    return b2
}

function findHoleBridge(hole: ENode, outer: ENode): ENode | null {
    let p = outer
    let qx = -Infinity
    let m: ENode | null = null
    // the horizontal ray from the hole's leftmost point, and the outer edge it
    // hits first
    do {
        if (hole.y <= p.y && hole.y >= p.next.y && p.next.y !== p.y) {
            const x = p.x + ((hole.y - p.y) * (p.next.x - p.x)) / (p.next.y - p.y)
            if (x <= hole.x && x > qx) {
                qx = x
                m = p.x < p.next.x ? p : p.next
                if (x === hole.x) return m
            }
        }
        p = p.next
    } while (p !== outer)
    if (!m) return null

    // then the vertex of that edge with the smallest angle to the ray, so the
    // bridge cannot cross anything
    const stop = m
    const mx = m.x
    const my = m.y
    let tanMin = Infinity
    p = m
    do {
        if (
            hole.x >= p.x && p.x >= mx && hole.x !== p.x &&
            inTriangle(hole.y < my ? hole.x : qx, hole.y, mx, my, hole.y < my ? qx : hole.x, hole.y, p.x, p.y)
        ) {
            const tan = Math.abs(hole.y - p.y) / (hole.x - p.x)
            if (
                locallyInside(p, hole) &&
                (tan < tanMin ||
                    (tan === tanMin && (p.x > m!.x || (p.x === m!.x && p.y > my))))
            ) {
                m = p
                tanMin = tan
            }
        }
        p = p.next
    } while (p !== stop)
    return m
}

function cureLocalIntersections(start: ENode, triangles: number[]): ENode {
    let p = start
    do {
        const a = p.prev
        const b = p.next.next
        if (
            !sameXY(a, b) && intersects(a, p, p.next, b) &&
            locallyInside(a, b) && locallyInside(b, a)
        ) {
            triangles.push(a.i / 2, p.i / 2, b.i / 2)
            removeNode(p)
            removeNode(p.next)
            p = start = b
        }
        p = p.next
    } while (p !== start)
    return filterPoints(p) as ENode
}

function splitEarcut(start: ENode, triangles: number[]) {
    let a = start
    do {
        let b = a.next.next
        while (b !== a.prev) {
            if (a.i !== b.i && !intersectsPolygon(a, b) && middleInside(a, b) && locallyInside(a, b) && locallyInside(b, a)) {
                let c = splitPolygon(a, b)
                a = filterPoints(a, a.next) as ENode
                c = filterPoints(c, c.next) as ENode
                earcutLinked(a, triangles, 0)
                earcutLinked(c, triangles, 0)
                return
            }
            b = b.next
        }
        a = a.next
    } while (a !== start)
}

function earcutLinked(start: ENode | null, triangles: number[], pass: number) {
    if (!start) return
    let ear: ENode = start
    let stop: ENode = start
    while (ear.prev !== ear.next) {
        const prev: ENode = ear.prev
        const next: ENode = ear.next
        if (isEar(ear)) {
            triangles.push(prev.i / 2, ear.i / 2, next.i / 2)
            removeNode(ear)
            ear = next.next
            stop = next.next
            continue
        }
        ear = next
        if (ear === stop) {
            // no ear found: clean up and try the harder passes
            if (pass === 0) earcutLinked(filterPoints(ear), triangles, 1)
            else if (pass === 1) {
                const cured = cureLocalIntersections(filterPoints(ear) as ENode, triangles)
                earcutLinked(cured, triangles, 2)
            } else if (pass === 2) splitEarcut(ear, triangles)
            break
        }
    }
}

function earcut(data: number[], holeStarts: number[]): number[] {
    const outerEnd = holeStarts.length ? holeStarts[0] * 2 : data.length
    let outer = ringToList(data, 0, outerEnd, true)
    const triangles: number[] = []
    if (!outer || outer.next === outer.prev) return triangles

    // holes are bridged leftmost first, as earcut does: bridging them in input
    // order lets one bridge cross another and the fallback passes then have to
    // untangle it
    const queue: ENode[] = []
    for (let h = 0; h < holeStarts.length; h++) {
        const start = holeStarts[h] * 2
        const end = h + 1 < holeStarts.length ? holeStarts[h + 1] * 2 : data.length
        const list = ringToList(data, start, end, false)
        if (!list) continue
        if (list === list.next) list.steiner = true
        let leftmost = list
        let p = list.next
        do {
            if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p
            p = p.next
        } while (p !== list)
        queue.push(leftmost)
    }
    queue.sort((a, b) => a.x - b.x)
    for (const hole of queue) {
        const bridge = findHoleBridge(hole, outer!)
        if (!bridge) continue
        const rev = splitPolygon(bridge, hole)
        filterPoints(rev, rev.next)
        outer = filterPoints(bridge, bridge.next)
    }

    earcutLinked(outer, triangles, 0)
    return triangles
}

/* ----------------------------------------------------------- glyph outlines */

type Ring = number[] // flat x, y, x, y ... in em units, y up, em box centred

interface Glyph {
    ch: string
    rings: Ring[]
    holes: boolean[]
    // how much of the source's chamfer this glyph can carry without eating
    // itself — see outlineGlyph
    bevel: number
}

// Crack following on the alpha mask: walk the boundary between filled and
// empty pixels keeping filled on the LEFT, which gives one closed loop per
// component boundary and per hole, on integer pixel corners. Saddles (two
// filled pixels touching only at a corner) are resolved by always taking the
// sharpest right turn, which is what keeps 4-connected strokes from fusing
// diagonally.
function traceMask(mask: Uint8Array, w: number, h: number): number[][] {
    const at = (x: number, y: number) =>
        x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]
    const seen = new Set<number>()
    const loops: number[][] = []
    // directions: 0 right, 1 down, 2 left, 3 up
    const dx = [1, 0, -1, 0]
    const dy = [0, 1, 0, -1]

    const valid = (x: number, y: number, d: number) => {
        // the pixel on the left of the travel direction must be filled and the
        // one on the right empty
        if (d === 0) return at(x, y - 1) === 1 && at(x, y) === 0
        if (d === 1) return at(x, y) === 1 && at(x - 1, y) === 0
        if (d === 2) return at(x - 1, y) === 1 && at(x - 1, y - 1) === 0
        return at(x - 1, y - 1) === 1 && at(x, y - 1) === 0
    }

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (at(x, y) !== 1 || at(x, y - 1) !== 0) continue
            if (seen.has((y * (w + 1) + x) * 4)) continue
            let cx = x
            let cy = y
            let d = 0
            const loop: number[] = []
            for (let guard = 0; guard < w * h * 8; guard++) {
                const key = (cy * (w + 1) + cx) * 4 + d
                if (seen.has(key)) break
                seen.add(key)
                loop.push(cx, cy)
                cx += dx[d]
                cy += dy[d]
                // sharpest right turn first, then straight, then left
                let nd = -1
                for (const t of [3, 0, 1, 2]) {
                    const cand = (d + t) % 4
                    if (valid(cx, cy, cand)) {
                        nd = cand
                        break
                    }
                }
                if (nd < 0) break
                d = nd
                if (cx === x && cy === y && d === 0) break
            }
            if (loop.length >= 6) loops.push(loop)
        }
    }
    return loops
}

// Ramer-Douglas-Peucker on a CLOSED loop, which cannot be done in one pass:
// the chord from the first point back to itself is degenerate, every distance
// to it is zero and the whole ring simplifies away to a single point. The ring
// is cut at its leftmost point and at whichever point is farthest from that,
// and the two open chains are simplified separately.
function rdp(pts: number[], a: number, b: number, keep: Uint8Array, eps: number) {
    const stack: [number, number][] = [[a, b]]
    keep[a] = 1
    keep[b] = 1
    while (stack.length) {
        const [i0, i1] = stack.pop()!
        if (i1 <= i0 + 1) continue
        const ax = pts[i0 * 2]
        const ay = pts[i0 * 2 + 1]
        const ex = pts[i1 * 2] - ax
        const ey = pts[i1 * 2 + 1] - ay
        const el = Math.hypot(ex, ey) || 1
        let worst = -1
        let wi = -1
        for (let i = i0 + 1; i < i1; i++) {
            const d = Math.abs((pts[i * 2] - ax) * ey - (pts[i * 2 + 1] - ay) * ex) / el
            if (d > worst) {
                worst = d
                wi = i
            }
        }
        if (worst > eps) {
            keep[wi] = 1
            stack.push([i0, wi], [wi, i1])
        }
    }
}

function simplifyLoop(loop: number[], eps: number): number[] {
    const n = loop.length / 2
    if (n < 5) return loop
    let s = 0
    for (let i = 1; i < n; i++) {
        if (
            loop[i * 2] < loop[s * 2] ||
            (loop[i * 2] === loop[s * 2] && loop[i * 2 + 1] < loop[s * 2 + 1])
        ) {
            s = i
        }
    }
    const pts: number[] = []
    for (let i = 0; i < n; i++) {
        const k = (s + i) % n
        pts.push(loop[k * 2], loop[k * 2 + 1])
    }
    // farthest point from the start: the second cut
    let far = 1
    let fd = -1
    for (let i = 1; i < n; i++) {
        const d = Math.hypot(pts[i * 2] - pts[0], pts[i * 2 + 1] - pts[1])
        if (d > fd) {
            fd = d
            far = i
        }
    }
    const keep = new Uint8Array(n)
    rdp(pts, 0, far, keep, eps)
    // the closing chain runs far -> n-1 -> 0, so it is walked with the start
    // appended rather than by wrapping the index inside rdp
    const tail: number[] = []
    for (let i = far; i < n; i++) tail.push(pts[i * 2], pts[i * 2 + 1])
    tail.push(pts[0], pts[1])
    const tailKeep = new Uint8Array(tail.length / 2)
    rdp(tail, 0, tail.length / 2 - 1, tailKeep, eps)
    for (let i = 1; i < tailKeep.length - 1; i++) {
        if (tailKeep[i]) keep[far + i] = 1
    }

    const out: number[] = []
    for (let i = 0; i < n; i++) {
        if (keep[i]) out.push(pts[i * 2], pts[i * 2 + 1])
    }
    return out
}

function loopArea(r: number[]): number {
    let a = 0
    for (let i = 0, n = r.length / 2; i < n; i++) {
        const j = (i + 1) % n
        a += r[i * 2] * r[j * 2 + 1] - r[j * 2] * r[i * 2 + 1]
    }
    return a / 2
}

function pointInLoop(px: number, py: number, r: number[]): boolean {
    let inside = false
    for (let i = 0, n = r.length / 2, j = n - 1; i < n; j = i++) {
        const xi = r[i * 2]
        const yi = r[i * 2 + 1]
        const xj = r[j * 2]
        const yj = r[j * 2 + 1]
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
}

// One offscreen canvas for the whole component. Rasterise the character, cut
// the mask at ALPHA_CUT, trace it, simplify it, and hand back rings in em
// units with the em box centred on the origin — so a cell only has to place
// that centre and every glyph keeps the font's own baseline relationship.
function outlineGlyph(
    ctx: CanvasRenderingContext2D,
    ch: string,
    fontSpec: string
): Glyph | null {
    const box = RASTER_BOX
    ctx.clearRect(0, 0, box, box)
    ctx.font = fontSpec
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "#fff"
    ctx.fillText(ch, box / 2, box / 2)

    const px = ctx.getImageData(0, 0, box, box).data
    const mask = new Uint8Array(box * box)
    let any = false
    for (let i = 0; i < mask.length; i++) {
        if (px[i * 4 + 3] > ALPHA_CUT) {
            mask[i] = 1
            any = true
        }
    }
    if (!any) return null

    const loops = traceMask(mask, box, box)
        .map((l) => simplifyLoop(l, TRACE_EPS))
        .filter((l) => l.length >= 6 && Math.abs(loopArea(l)) > 4)
    if (!loops.length) return null

    // em units, y up, centred on the draw point
    const rings: Ring[] = loops.map((l) => {
        const r: number[] = []
        for (let i = 0; i < l.length; i += 2) {
            r.push((l[i] - box / 2) / RASTER_EM, (box / 2 - l[i + 1]) / RASTER_EM)
        }
        return r
    })

    // nesting: a ring inside an odd number of others is a hole. Then force the
    // TrueType sense the extruder expects — outers clockwise, holes counter-
    // clockwise in this y-up space — so one fixed formula gives every wall its
    // outward normal.
    const holes: boolean[] = rings.map((r, i) => {
        let depth = 0
        for (let j = 0; j < rings.length; j++) {
            if (j !== i && pointInLoop(r[0], r[1], rings[j])) depth++
        }
        return depth % 2 === 1
    })
    for (let i = 0; i < rings.length; i++) {
        const a = loopArea(rings[i])
        const wantNegative = !holes[i] // clockwise in y-up is negative area
        if (wantNegative === a > 0) {
            const r = rings[i]
            const flipped: number[] = []
            for (let k = r.length - 2; k >= 0; k -= 2) flipped.push(r[k], r[k + 1])
            rings[i] = flipped
        }
    }

    // The chamfer insets the cap by a fixed fraction of the em, which is fine
    // on the source's chunky kanji and destroys a light face: at 3.3% of the em
    // a hairline stroke is narrower than twice the inset, the offset outline
    // crosses itself, and those cap triangles inverte and get culled away. The
    // stroke's half-width is area over perimeter for anything long and thin, so
    // that is measured here and the chamfer is clamped to 60% of it, which
    // holds the cap at roughly 40% of the stroke whatever the weight. A bold
    // face measures at or just under the source's own full value, so the port
    // this grew out of is reproduced; a hairline gets a proportionate chamfer
    // instead of one that erases it.
    let filled = 0
    for (let i = 0; i < mask.length; i++) filled += mask[i]
    const area = filled / (RASTER_EM * RASTER_EM)
    let perim = 0
    for (const r of rings) {
        for (let i = 0, n = r.length / 2; i < n; i++) {
            const j = (i + 1) % n
            perim += Math.hypot(r[j * 2] - r[i * 2], r[j * 2 + 1] - r[i * 2 + 1])
        }
    }
    const halfWidth = perim > 0 ? area / perim : BEVEL_SIZE
    const bevel = Math.max(0.15, Math.min(1, (0.6 * halfWidth) / BEVEL_SIZE))

    return { ch, rings, holes, bevel }
}

/* ------------------------------------------------------------------ extruder */

interface Span {
    first: number
    count: number
}

// three's ExtrudeGeometry bevel, in the units this file bakes in: sizes as a
// fraction of the em and thicknesses as a fraction of the extrusion, so both
// scale with the Size and Depth dials instead of being fixed world numbers.
// bevelOffset cancels bevelSize, so the body sits at the glyph's true outline
// and each cap is pulled IN by 0.1 over 0.2 of depth — a chamfer, not a flare.
const BEVEL_SEGMENTS = 5
const BEVEL_THICK = 0.2 / 13 // of the extrusion
const BEVEL_SIZE = 0.1 / 3 // of the em
const BEVEL_OFFSET = -0.1 / 3
// The back chamfer is one extrusion deep in the fog and its cap is culled, so
// it is built flat: measured at 0.0004 of one 8-bit level against the full
// profile, for 45% fewer wall triangles on every instance.
const BACK_BEVEL = false

// three's getBevelVec: the miter at a contour point, as the offset that moves
// the outline OUTWARD by one unit, with its length clamped at sqrt(2) exactly
// as the source clamps it. Outward, not inward: measured by rendering the
// source at bevelOffset 0 and -0.1 and comparing silhouette coverage (17.9%
// against 15.0%, so a positive bs grows the glyph).
function bevelVec(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number
): [number, number] {
    const pvx = px - ax
    const pvy = py - ay
    const nvx = bx - px
    const nvy = by - py
    const pvLenSq = pvx * pvx + pvy * pvy
    const collinear = pvx * nvy - pvy * nvx
    let tx: number
    let ty: number
    let shrink: number
    if (Math.abs(collinear) > Number.EPSILON) {
        const pvLen = Math.sqrt(pvLenSq)
        const nvLen = Math.sqrt(nvx * nvx + nvy * nvy)
        const psx = ax - pvy / pvLen
        const psy = ay + pvx / pvLen
        const nsx = bx - nvy / nvLen
        const nsy = by + nvx / nvLen
        const sf = ((nsx - psx) * nvy - (nsy - psy) * nvx) / collinear
        tx = psx + pvx * sf - px
        ty = psy + pvy * sf - py
        const lenSq = tx * tx + ty * ty
        if (lenSq <= 2) return [tx, ty]
        shrink = Math.sqrt(lenSq / 2)
    } else {
        let sameDir = false
        if (pvx > Number.EPSILON) sameDir = nvx > Number.EPSILON
        else if (pvx < -Number.EPSILON) sameDir = nvx < -Number.EPSILON
        else sameDir = Math.sign(pvy) === Math.sign(nvy)
        if (sameDir) {
            tx = -pvy
            ty = pvx
            shrink = Math.sqrt(pvLenSq)
        } else {
            tx = pvx
            ty = pvy
            shrink = Math.sqrt(pvLenSq / 2)
        }
    }
    return [tx / shrink, ty / shrink]
}

function bevelProfile(scale: number): [number, number][] {
    const size = BEVEL_SIZE * scale
    const offset = BEVEL_OFFSET * scale
    const prof: [number, number][] = []
    if (BACK_BEVEL) {
        for (let b = 0; b < BEVEL_SEGMENTS; b++) {
            const t = (b / BEVEL_SEGMENTS) * (Math.PI / 2)
            prof.push([-BEVEL_THICK * Math.cos(t), size * Math.sin(t) + offset])
        }
    }
    prof.push([0, size + offset])
    prof.push([1, size + offset])
    for (let b = BEVEL_SEGMENTS - 1; b >= 0; b--) {
        const t = (b / BEVEL_SEGMENTS) * (Math.PI / 2)
        prof.push([1 + BEVEL_THICK * Math.cos(t), size * Math.sin(t) + offset])
    }
    return prof
}

// Extrudes every glyph once into one interleaved buffer of
// [x, y, z, nx, ny, nz], xy in ems and z running 0 (back) to 1 (front) before
// the chamfer pushes past it. Size and Depth are uniforms on top of that.
function buildGeometry(glyphs: Glyph[]): { data: Float32Array; spans: Span[] } {
    const out: number[] = []
    const spans: Span[] = []

    for (const glyph of glyphs) {
        const first = out.length / 6
        const prof = bevelProfile(glyph.bevel)
        const px: number[] = []
        const py: number[] = []
        const ringSpan: [number, number][] = []
        for (const r of glyph.rings) {
            ringSpan.push([px.length, r.length / 2])
            for (let i = 0; i < r.length; i += 2) {
                px.push(r[i])
                py.push(r[i + 1])
            }
        }

        // miter per point, from its own ring's neighbours
        const mx = new Array<number>(px.length).fill(0)
        const my = new Array<number>(px.length).fill(0)
        for (const [start, n] of ringSpan) {
            for (let i = 0; i < n; i++) {
                const c = start + i
                const a = start + ((i - 1 + n) % n)
                const b = start + ((i + 1) % n)
                const v = bevelVec(px[c], py[c], px[a], py[a], px[b], py[b])
                mx[c] = v[0]
                my[c] = v[1]
            }
        }

        // caps: each outer ring with the holes it encloses, ear-clipped once
        // and reused at both offsets
        const tris: number[] = []
        for (let o = 0; o < glyph.rings.length; o++) {
            if (glyph.holes[o]) continue
            const own: number[] = []
            for (let k = 0; k < glyph.rings.length; k++) {
                if (!glyph.holes[k]) continue
                const [hs] = ringSpan[k]
                // the smallest containing outer owns the hole
                let bestArea = Infinity
                let best = -1
                for (let j = 0; j < glyph.rings.length; j++) {
                    if (glyph.holes[j]) continue
                    if (!pointInLoop(px[hs], py[hs], glyph.rings[j])) continue
                    const a = Math.abs(loopArea(glyph.rings[j]))
                    if (a < bestArea) {
                        bestArea = a
                        best = j
                    }
                }
                if (best === o) own.push(k)
            }
            const flat: number[] = []
            const map: number[] = []
            const holeStarts: number[] = []
            const push = (ri: number) => {
                const [s, n] = ringSpan[ri]
                for (let i = 0; i < n; i++) {
                    flat.push(px[s + i], py[s + i])
                    map.push(s + i)
                }
            }
            push(o)
            for (const k of own) {
                holeStarts.push(map.length)
                push(k)
            }
            for (const idx of earcut(flat, holeStarts)) tris.push(map[idx])
        }

        const ringX = (k: number, bs: number) => px[k] + mx[k] * bs
        const ringY = (k: number, bs: number) => py[k] + my[k] * bs
        const capBack = prof[0]
        const capFront = prof[prof.length - 1]
        for (let i = 0; i < tris.length; i += 3) {
            let a = tris[i]
            let b = tris[i + 1]
            let c = tris[i + 2]
            // the front cap faces +z, so force it counter-clockwise in xy
            const cross =
                (px[b] - px[a]) * (py[c] - py[a]) - (py[b] - py[a]) * (px[c] - px[a])
            if (cross < 0) {
                const t = b
                b = c
                c = t
            }
            for (const k of [a, b, c]) {
                out.push(ringX(k, capFront[1]), ringY(k, capFront[1]), capFront[0], 0, 0, 1)
            }
            for (const k of [a, c, b]) {
                out.push(ringX(k, capBack[1]), ringY(k, capBack[1]), capBack[0], 0, 0, -1)
            }
        }

        // one band of wall per profile step, flat-shaded like the source's
        // non-indexed computeVertexNormals
        for (const [start, n] of ringSpan) {
            for (let i = 0; i < n; i++) {
                const a = start + i
                const b = start + ((i + 1) % n)
                for (let s = 0; s < prof.length - 1; s++) {
                    const lo = prof[s]
                    const hi = prof[s + 1]
                    const quad: number[][] = [
                        [ringX(a, lo[1]), ringY(a, lo[1]), lo[0]],
                        [ringX(b, hi[1]), ringY(b, hi[1]), hi[0]],
                        [ringX(b, lo[1]), ringY(b, lo[1]), lo[0]],
                        [ringX(a, lo[1]), ringY(a, lo[1]), lo[0]],
                        [ringX(a, hi[1]), ringY(a, hi[1]), hi[0]],
                        [ringX(b, hi[1]), ringY(b, hi[1]), hi[0]],
                    ]
                    for (let t = 0; t < 6; t += 3) {
                        const p0 = quad[t]
                        const p1 = quad[t + 1]
                        const p2 = quad[t + 2]
                        const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]
                        const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]]
                        let nx = e1[1] * e2[2] - e1[2] * e2[1]
                        let ny = e1[2] * e2[0] - e1[0] * e2[2]
                        let nz = e1[0] * e2[1] - e1[1] * e2[0]
                        const len = Math.hypot(nx, ny, nz) || 1
                        nx /= len
                        ny /= len
                        nz /= len
                        for (const q of [p0, p1, p2]) out.push(q[0], q[1], q[2], nx, ny, nz)
                    }
                }
            }
        }

        spans.push({ first, count: out.length / 6 - first })
    }

    return { data: new Float32Array(out), spans }
}

/* --------------------------------------------------------------------- math */

function perspective(fovDeg: number, aspect: number, near: number, far: number) {
    const t = 1 / Math.tan((fovDeg * Math.PI) / 360)
    const m = new Float32Array(16)
    m[0] = t / aspect
    m[5] = t
    m[10] = (far + near) / (near - far)
    m[11] = -1
    m[14] = (2 * far * near) / (near - far)
    return m
}

function parseColor(input: string): [number, number, number] {
    if (!input) return [0, 0, 0]
    let s = String(input).trim()
    const v = s.match(/var\(\s*[^,)]+\s*,\s*([^)]+)\)/i)
    if (v) s = v[1].trim()

    const hsl = s.match(/hsla?\(([^)]+)\)/i)
    if (hsl) {
        const p = hsl[1].split(/[,/\s]+/).filter(Boolean)
        const h = (((parseFloat(p[0]) || 0) % 360) + 360) / 360
        const sa = (parseFloat(p[1]) || 0) / 100
        const li = (parseFloat(p[2]) || 0) / 100
        const c = (1 - Math.abs(2 * li - 1)) * sa
        const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
        const m = li - c / 2
        const k = Math.floor(h * 6) % 6
        const t: [number, number, number][] = [
            [c, x, 0],
            [x, c, 0],
            [0, c, x],
            [0, x, c],
            [x, 0, c],
            [c, 0, x],
        ]
        const q = t[k < 0 ? 0 : k]
        return [q[0] + m, q[1] + m, q[2] + m]
    }

    const fn = s.match(/rgba?\(([^)]+)\)/i)
    if (fn) {
        const p = fn[1]
            .split(/[,/\s]+/)
            .filter(Boolean)
            .map((n) => parseFloat(n))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }

    let h = s.replace("#", "")
    if (h.length === 3 || h.length === 4) {
        h = h
            .split("")
            .map((c) => c + c)
            .join("")
    }
    h = h.padEnd(6, "0")
    return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
    ]
}

function compile(gl: WebGL2RenderingContext, src: string, type: number) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh))
    }
    return sh
}

/* ---------------------------------------------------------------- component */

interface GridGroup {
    depth: number
    reach: number
}

interface LightGroup {
    sway: number
}

// Framer's extended Font control hands back a CSS style object. Only the face
// matters here — the world Size dial owns how big a glyph is, so fontSize,
// lineHeight and letterSpacing are ignored by design.
interface FontValue {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
}

interface Props {
    background: string
    baseColor: string
    accentColor: string
    keyColor: string
    text: string
    font: FontValue
    density: number
    size: number
    speed: number
    distance: number
    fade: number
    grid: GridGroup
    lights: LightGroup
    style?: React.CSSProperties
}

// A group the designer never opened arrives undefined, and a hand-written ??
// chain is where one missed key pins a control forever — so every group is
// spread over a typed literal instead (rule 11).
const GRID_DEFAULTS: GridGroup = { depth: 260, reach: 200 }
const LIGHT_DEFAULTS: LightGroup = { sway: 100 }
const FONT_DEFAULTS: FontValue = {
    fontFamily: "Inter, system-ui, sans-serif",
    fontWeight: 700,
    fontStyle: "normal",
}

// The source's material was colour #ababab under a #ffffff emissive. Base
// Color is the emissive — the paper-white face is what a designer is actually
// picking — and the albedo keeps the source's ratio to it.
const ALBEDO_F = 0xab / 0xff

function __BaseImpl_TypeSlabField(props: Partial<Props>) {
    const {
        background = "#000000",
        baseColor = "#ffffff",
        accentColor = "#6EB9FF",
        keyColor = "#6EB9FF",
        text = "MAKE IT SIMPLE",
        density = 17,
        size = 60,
        speed = 50,
        distance = 40,
        fade = 400,
        style,
    } = props
    const grid: GridGroup = { ...GRID_DEFAULTS, ...(props.grid || {}) }
    const lights: LightGroup = { ...LIGHT_DEFAULTS, ...(props.lights || {}) }
    const font: FontValue = { ...FONT_DEFAULTS, ...(props.font || {}) }
    const fontSpec = `${font.fontStyle || "normal"} ${font.fontWeight || 400} ${RASTER_EM}px ${font.fontFamily || "sans-serif"}`

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // every live input the loop reads, so nothing here is an effect dep
    const live = useRef({
        base: [1, 1, 1] as number[],
        accent: [0, 0, 0] as number[],
        key: [1, 1, 1] as number[],
        fog: [0, 0, 0] as number[],
        text,
        fontSpec,
        density,
        size,
        speed,
        distance,
        fade,
        depth: grid.depth,
        reach: grid.reach,
        sway: lights.sway,
    })
    live.current = {
        base: parseColor(baseColor),
        accent: parseColor(accentColor),
        key: parseColor(keyColor),
        fog: parseColor(background),
        text: String(text ?? ""),
        fontSpec,
        density: Math.max(2, Math.round(density)),
        size,
        speed,
        distance,
        fade,
        depth: grid.depth,
        reach: grid.reach,
        sway: lights.sway,
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: true,
            premultipliedAlpha: true,
        })
        if (!gl) return

        /* -- program */
        const prog = gl.createProgram()!
        gl.attachShader(prog, compile(gl, VERT, gl.VERTEX_SHADER))
        gl.attachShader(prog, compile(gl, FRAG, gl.FRAGMENT_SHADER))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)
        const U = (n: string) => gl.getUniformLocation(prog, n)
        const u = {
            view: U("uView"),
            proj: U("uProj"),
            origin: U("uOrigin"),
            size: U("uSize"),
            depth: U("uDepth"),
            spacing: U("uSpacing"),
            cellZ: U("uCellZ"),
            eye: U("uEye"),
            albedo: U("uAlbedo"),
            emissive: U("uEmissive"),
            keyPos: U("uKeyPos"),
            keyColor: U("uKeyColor"),
            accentPos: U("uAccentPos"),
            accentColor: U("uAccentColor"),
            fogColor: U("uFogColor"),
            fogNear: U("uFogNear"),
            fogFar: U("uFogFar"),
        }
        const aPos = gl.getAttribLocation(prog, "aPos")
        const aNormal = gl.getAttribLocation(prog, "aNormal")
        const aCell = gl.getAttribLocation(prog, "aCell")

        /* -- glyph outlines, rasterised once per character per face */
        const raster = document.createElement("canvas")
        raster.width = RASTER_BOX
        raster.height = RASTER_BOX
        const rctx = raster.getContext("2d", { willReadFrequently: true })
        const glyphCache = new Map<string, Glyph | null>()
        const fontsAsked = new Set<string>()

        const geomBuf = gl.createBuffer()
        let spans: Span[] = []
        let chars: string[] = [] // the unique drawable characters, in draw order
        let charIndex = new Map<string, number>()
        let vaos: WebGLVertexArrayObject[] = []
        let instBufs: WebGLBuffer[] = []
        let counts: number[] = []
        let geomKey = ""

        function releaseVaos() {
            for (const v of vaos) gl!.deleteVertexArray(v)
            for (const b of instBufs) gl!.deleteBuffer(b)
            vaos = []
            instBufs = []
        }

        function rebuildGlyphs(txt: string, spec: string) {
            geomKey = txt + "|" + spec
            const wanted: string[] = []
            const seen = new Set<string>()
            for (const ch of txt) {
                if (!ch.trim()) continue
                if (seen.has(ch)) continue
                seen.add(ch)
                wanted.push(ch)
            }
            const glyphs: Glyph[] = []
            chars = []
            charIndex = new Map()
            for (const ch of wanted) {
                const key = ch + "|" + spec
                let g = glyphCache.get(key)
                if (g === undefined) {
                    g = rctx ? outlineGlyph(rctx, ch, spec) : null
                    glyphCache.set(key, g)
                }
                if (!g) continue
                charIndex.set(ch, chars.length)
                chars.push(ch)
                glyphs.push(g)
            }

            const built = buildGeometry(glyphs)
            spans = built.spans
            gl!.bindBuffer(gl!.ARRAY_BUFFER, geomBuf)
            gl!.bufferData(gl!.ARRAY_BUFFER, built.data, gl!.STATIC_DRAW)

            releaseVaos()
            for (let i = 0; i < spans.length; i++) {
                const vao = gl!.createVertexArray()!
                gl!.bindVertexArray(vao)
                gl!.bindBuffer(gl!.ARRAY_BUFFER, geomBuf)
                gl!.enableVertexAttribArray(aPos)
                gl!.vertexAttribPointer(aPos, 3, gl!.FLOAT, false, 24, 0)
                gl!.enableVertexAttribArray(aNormal)
                gl!.vertexAttribPointer(aNormal, 3, gl!.FLOAT, false, 24, 12)
                const ib = gl!.createBuffer()!
                gl!.bindBuffer(gl!.ARRAY_BUFFER, ib)
                gl!.enableVertexAttribArray(aCell)
                gl!.vertexAttribPointer(aCell, 2, gl!.FLOAT, false, 0, 0)
                gl!.vertexAttribDivisor(aCell, 1)
                vaos.push(vao)
                instBufs.push(ib)
            }
            gl!.bindVertexArray(null)
            counts = spans.map(() => 0)
            layoutKey = "" // the cells have to be handed out again

            // a webfont may not have arrived yet: ask for it, and rebuild once
            // it has rather than living with the fallback face
            if (!fontsAsked.has(spec) && (document as any).fonts) {
                fontsAsked.add(spec)
                // in a try: FontFaceSet.load throws synchronously on a shorthand
                // it cannot parse, and this runs inside the rAF loop
                try {
                    ;(document as any).fonts
                        .load(spec)
                        .then(() => {
                            for (const ch of wanted) glyphCache.delete(ch + "|" + spec)
                            geomKey = ""
                        })
                        .catch(() => {})
                } catch (e) {
                    /* the fallback face is what it is */
                }
            }
        }

        /* -- the sheet: cells filled with the text, wrapping, top row first */
        let cols = 0
        let rows = 0
        let cellZ = new Float32Array(0)
        let layoutKey = ""
        const zTex = gl.createTexture()
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, zTex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        let seeded = false

        function rebuildLayout(c: number, r: number, txt: string) {
            cols = c
            rows = r
            layoutKey = `${c}x${r}|${txt}`
            cellZ = new Float32Array(cols * rows)
            const cells: number[][] = spans.map(() => [])
            const letters = [...txt]
            if (letters.length) {
                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < cols; col++) {
                        // row 0 is the bottom of the world, so the text reads
                        // down the frame rather than up it
                        const seq = (rows - 1 - row) * cols + col
                        const ch = letters[seq % letters.length]
                        const gi = charIndex.get(ch)
                        if (gi === undefined) continue // spaces and unrenderables
                        cells[gi].push(col, row)
                    }
                }
            }
            counts = cells.map((c2) => c2.length / 2)
            for (let i = 0; i < cells.length; i++) {
                gl!.bindBuffer(gl!.ARRAY_BUFFER, instBufs[i])
                gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(cells[i]), gl!.STATIC_DRAW)
            }
            gl!.bindTexture(gl!.TEXTURE_2D, zTex)
            gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.R32F, cols, rows, 0, gl!.RED, gl!.FLOAT, null)
            seeded = false
        }

        /* -- pointer, in NDC */
        let ndcX = 0
        let ndcY = 0
        let real = false
        const onMove = (e: PointerEvent) => {
            const r = host!.getBoundingClientRect()
            // getBoundingClientRect carries the canvas zoom, but so does the
            // pointer's own clientX/Y, so the ratio is zoom-independent
            if (r.width <= 0 || r.height <= 0) return
            ndcX = ((e.clientX - r.left) / r.width) * 2 - 1
            ndcY = -((e.clientY - r.top) / r.height) * 2 + 1
            real = true
        }
        host.addEventListener("pointermove", onMove)

        /* -- size */
        let cw = 0
        let ch2 = 0
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            // clientWidth, not the injected width prop: in the Framer preview
            // that prop is not a number
            const w = Math.max(1, Math.round(canvas!.clientWidth * dpr))
            const h = Math.max(1, Math.round(canvas!.clientHeight * dpr))
            if (w === cw && h === ch2) return
            cw = w
            ch2 = h
            canvas!.width = w
            canvas!.height = h
        }
        const ro = new ResizeObserver(resize)
        ro.observe(host)
        resize()

        gl.enable(gl.DEPTH_TEST)
        gl.enable(gl.CULL_FACE)
        gl.cullFace(gl.BACK)
        gl.clearColor(0, 0, 0, 0)

        const view = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
        let raf = 0
        let last = -1
        let clock = 0
        let lightSeeded = false
        let keyY = 0
        let accentY = 0
        let hitX = 0
        let hitY = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            // the first rAF timestamp precedes the effect, so the first dt is
            // negative unless it is clamped
            const dt = last < 0 ? 1 / 60 : Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now
            const P = live.current
            resize()

            if (geomKey !== P.text + "|" + P.fontSpec) rebuildGlyphs(P.text, P.fontSpec)

            /* -- layout: a sheet that covers the frustum whatever the canvas */
            const aspect = cw / Math.max(1, ch2)
            const tan = Math.tan((FOV * Math.PI) / 360)
            const halfH = tan * P.distance
            const halfW = halfH * aspect
            // Density is cells DOWN the frame, so the glyphs keep their size
            // when only the width changes. The sheet then has to cover more
            // than the frustum at z=0: cells sink away from the pointer, and a
            // sunken one is seen through a wider cone. It is covered out to
            // where the fog has closed completely — past that a cell is the
            // background colour and building it would draw nothing.
            const fogFar =
                P.distance * (FOG_NEAR_F + FOG_SPAN_F * Math.max(P.fade / 100, 0.01))
            const coverF = Math.min(fogFar / P.distance, COVER_MAX)
            let s = (2 * halfH) / P.density
            let c = Math.ceil((2 * halfW * coverF) / s) + 2
            let r = Math.ceil((2 * halfH * coverF) / s) + 2
            if (c * r > MAX_CELLS) {
                s *= Math.sqrt((c * r) / MAX_CELLS)
                c = Math.ceil((2 * halfW * coverF) / s) + 2
                r = Math.ceil((2 * halfH * coverF) / s) + 2
            }
            if (layoutKey !== `${c}x${r}|${P.text}`) rebuildLayout(c, r, P.text)

            const em = s * (P.size / 100)
            const depth = s * (P.depth / 100)
            const originX = -((cols - 1) / 2) * s
            const originY = -((rows - 1) / 2) * s

            /* -- camera: on the axis, looking straight down -z */
            const eye: [number, number, number] = [0, 0, P.distance]
            view[14] = -P.distance
            const proj = perspective(FOV, aspect, NEAR, FAR)

            /* -- pointer, and the idle walk that stands in for one */
            if (!real) {
                clock += dt * (P.speed / 50)
                hitX = halfW * IDLE_REACH * Math.sin(clock * IDLE_WX * Math.PI)
                hitY = halfH * IDLE_REACH * Math.cos(clock * IDLE_WY * Math.PI)
                ndcY = IDLE_AY * Math.cos(clock * IDLE_WY * Math.PI)
            } else {
                // the source raycasts the pointer onto the z=0 plane; with the
                // camera on the axis that plane is exactly the frustum's own
                // cross-section, so the hit is the NDC scaled by its half-size
                hitX = ndcX * halfW
                hitY = ndcY * halfH
            }

            /* -- per cell z, eased with the source's distance-lagged duration */
            const scale = s / REF_SPACING
            const nearZ = NEAR_Z * scale
            const ramp = Math.max(RAMP * scale * (P.reach / 100), 1e-3)
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const cx = originX + col * s
                    const cy = originY + row * s
                    const d = Math.hypot(hitX - cx, hitY - cy)
                    const target = nearZ - d / ramp
                    const dur = Math.min(
                        LAG_MAX,
                        Math.max(LAG_MIN, d / (LAG_DIV * scale))
                    )
                    const i = row * cols + col
                    if (!seeded) cellZ[i] = target
                    else cellZ[i] += (target - cellZ[i]) * (1 - Math.exp((-LAG_K * dt) / dur))
                }
            }
            seeded = true
            gl!.activeTexture(gl!.TEXTURE0)
            gl!.bindTexture(gl!.TEXTURE_2D, zTex)
            gl!.texSubImage2D(gl!.TEXTURE_2D, 0, 0, 0, cols, rows, gl!.RED, gl!.FLOAT, cellZ)

            /* -- lights: fixed left and right, easing their height to the pointer */
            const sway = P.sway / 100
            const ka = lightSeeded ? 1 - Math.exp(-LIGHT_K * dt) : 1
            lightSeeded = true
            keyY += (ndcY * KEY_GAIN_F * halfH * sway - keyY) * ka
            accentY += (ndcY * ACCENT_GAIN_F * halfH * sway - accentY) * ka
            const lightX = LIGHT_X_F * halfH
            const lightZ = LIGHT_Z_F * halfH

            /* -- draw */
            gl!.viewport(0, 0, cw, ch2)
            gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT)
            gl!.useProgram(prog)
            gl!.uniformMatrix4fv(u.view, false, view)
            gl!.uniformMatrix4fv(u.proj, false, proj)
            gl!.uniform2f(u.origin, originX, originY)
            gl!.uniform1f(u.size, em)
            gl!.uniform1f(u.depth, depth)
            gl!.uniform1f(u.spacing, s)
            gl!.uniform1i(u.cellZ, 0)
            gl!.uniform3f(u.eye, eye[0], eye[1], eye[2])
            gl!.uniform3f(
                u.albedo,
                P.base[0] * ALBEDO_F,
                P.base[1] * ALBEDO_F,
                P.base[2] * ALBEDO_F
            )
            gl!.uniform3f(u.emissive, P.base[0], P.base[1], P.base[2])
            gl!.uniform3f(u.keyPos, lightX, keyY, lightZ)
            gl!.uniform3f(u.keyColor, P.key[0], P.key[1], P.key[2])
            gl!.uniform3f(u.accentPos, -lightX, accentY, lightZ)
            gl!.uniform3f(u.accentColor, P.accent[0], P.accent[1], P.accent[2])
            gl!.uniform3f(u.fogColor, P.fog[0], P.fog[1], P.fog[2])
            const fogNear = P.distance * FOG_NEAR_F
            gl!.uniform1f(u.fogNear, fogNear)
            gl!.uniform1f(
                u.fogFar,
                fogNear + P.distance * FOG_SPAN_F * Math.max(P.fade / 100, 0.01)
            )
            for (let i = 0; i < vaos.length; i++) {
                if (!counts[i]) continue
                gl!.bindVertexArray(vaos[i])
                gl!.drawArraysInstanced(gl!.TRIANGLES, spans[i].first, spans[i].count, counts[i])
            }
            gl!.bindVertexArray(null)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointermove", onMove)
            // No loseContext(): getContext hands back the SAME context on the
            // next StrictMode mount, and a force-lost one renders black.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                overflow: "hidden",
                minWidth: 1200,
                minHeight: 800,
                background,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}

const __presetProps = {
  "text": "MAKE IT SIMPLE",
  "font": {
    "variant": "Regular",
    "fontSize": "16px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 700,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  },
  "background": "#000000",
  "baseColor": "#ffffff",
  "accentColor": "#6EB9FF",
  "keyColor": "#6EB9FF",
  "density": 24,
  "size": 60,
  "speed": 50,
  "distance": 40,
  "fade": 400,
  "grid": {
    "depth": 20,
    "reach": 245
  },
  "lights": {
    "sway": 0,
    "keyColor": "#ffffff"
  }
};

export default function TypeSlabField(props: Record<string, unknown>) {
  return <__BaseImpl_TypeSlabField {...(__presetProps as Record<string, unknown>)} {...props} />;
}
