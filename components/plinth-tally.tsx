"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ *
 *  PlinthTally
 *
 *  Numerals cut from thick slabs and stacked into an impossible tower:
 *  the upper one tipped foot-forward so its walls hang below it, the next
 *  tipped top-forward so its walls rise behind it, their leans summing to
 *  90° so the upper face lies in the plane of the lower one's top wall.
 *  Faces run a printed gradient from a saturated left edge to a cream
 *  sheen on the right; the walls are black, lit only where they turn to
 *  the light, and the edges are drawn — a white hairline where a face
 *  meets a visible wall, a coloured band under it, a rim line round each
 *  wall's silhouette, and gold all round the 2's cut tail. Grain over
 *  everything, four-point sparkles on black.
 *
 *  Built after the "28" numeral poster (blue 2 over orange 8 on black).
 *  The poster is a flat illustration of a 3D object; here the object is
 *  real. Each glyph is rasterised (the poster's 2 and 8 redrawn by hand,
 *  anything else in the chosen font), turned into a signed distance field
 *  on the CPU, and ray-marched as a true extrusion in WebGL2, so the
 *  walls, counters and corners the poster draws by hand fall out of the
 *  geometry and stay right as the stack turns to follow the pointer.
 *  Measured off the poster:
 *    Colour     2  #201CF7 → #288CF5 → cream;  8  #FB3E04 → #FBCD08 →
 *               cream; cream from ~78% across each face. Lines: red
 *               #FD3001 on the 2, blue #2318F7 on the 8, gold #FDBB03.
 *    Pose       2 leans −37°, 8 +53° (from the faces' foreshortening);
 *               slab depth from the height of the gold box.
 *    Light      only walls facing right catch the key (the 2's cream
 *               flank); counters fall into the slab's own shadow.
 *    Sparkles   four stars at the poster's own positions.
 * ------------------------------------------------------------------ */

type FontValue = CSSProperties

export interface PlinthTallyGlyph {
    character?: string
    from?: string
    to?: string
    rim?: string
    /** Degrees. Positive leans the top toward you (walls show above), negative the foot (walls show below). */
    lean?: number
}

export interface PlinthTallyEntrance {
    animate: boolean
    delay: number
    stagger: number
}

/** Tuning values. Out of the box Advanced changes nothing. */
const DEFAULT_ADVANCED = {
    stretch: 100,
    fov: 16,
    lineWidth: 11,
    sheenColor: "#F8F6E6",
    sheenStart: 78,
    highlightColor: "#FFFFFF",
    accentColor: "#FDBB03",
    keyLight: 100,
    gloss: 18,
    sparkleColor: "#FFFFFF",
    sparkleSize: 100,
    twinkle: 3.2,
}

export type PlinthTallyAdvanced = typeof DEFAULT_ADVANCED

export interface PlinthTallyProps {
    /** One slab per row, stacked in order: the character and its colours. */
    glyphs?: PlinthTallyGlyph[]
    background?: string
    /** Family and weight the slabs are cut from. Size is fitted to the frame. */
    font?: FontValue
    stack?: "column" | "row"
    /** 0–10. How far apart the slabs sit; low values let them overlap. */
    spacing?: number
    /** Four-point stars over the whole ground, behind the slabs. The first four sit where the poster has them. */
    sparkles?: number
    /** Size of the stack, in % of the poster's framing. The ground and stars always fill the frame. */
    scale?: number
    /** 0–10. Slab thickness. */
    depth?: number
    /** 0–10. Print grain over faces and ground. */
    grain?: number
    /** Slabs swing up into place when the component scrolls into view. Hand-rolled, so no Transition row. */
    entrance?: Partial<PlinthTallyEntrance>
    /** 0–10. Intensity of the cursor-follow turn. 0 disables it. */
    parallax?: number
    /** 0–10. Idle sway when the pointer is away. */
    drift?: number
    /** 0–10. How slowly the stack catches up with the pointer. */
    smoothing?: number
    advanced?: Partial<PlinthTallyAdvanced>
    style?: CSSProperties
}

const DEFAULT_GLYPHS: PlinthTallyGlyph[] = [
    { character: "2", from: "#201CF7", to: "#288CF5", rim: "#FD3001", lean: -37 },
    { character: "8", from: "#FB3E04", to: "#FBCD08", rim: "#2318F7", lean: 53 },
]

const DEFAULT_FONT: FontValue = {
    fontFamily: `"Arial Black", "Helvetica Neue", Arial, sans-serif`,
    fontWeight: 900,
}

const DEFAULT_ENTRANCE: PlinthTallyEntrance = { animate: true, delay: 0.2, stagger: 0.18 }

/** Most sparkles the panel offers. */
const MAX_STARS = 40

/**
 * Stars: x, y as a share of the frame, diameter as a share of its short side.
 * The first four are the poster's own; the rest follow a low-discrepancy (R2)
 * sequence, so any count spreads evenly over the whole frame rather than
 * clumping. Deterministic, so server and client render the same field.
 */
const STARS: [number, number, number][] = [
    [0.288, 0.08, 0.022],
    [0.155, 0.346, 0.014],
    [0.845, 0.41, 0.026],
    [0.812, 0.912, 0.015],
    ...Array.from({ length: MAX_STARS - 4 }, (_, i): [number, number, number] => {
        const n = i + 1
        const size = (Math.sin(n * 12.9898) * 43758.5453) % 1
        return [0.03 + 0.94 * ((0.37 + n * 0.7548776662) % 1), 0.03 + 0.94 * ((0.61 + n * 0.5698402910) % 1), 0.009 + 0.012 * Math.abs(size)]
    }),
]

/** Most slabs the shader loops over. */
const MAX_GLYPHS = 6
/** SDF cell: CELL px square covering CELL_EM em, so FONT_PX px per em. */
const CELL = 640
const CELL_EM = 1.6
const FONT_PX = CELL / CELL_EM
/** Widest ink a cell takes before the glyph is scaled down to fit. */
const MAX_INK_EM = 1.3
/** Share of the frame the stack fills at Scale 100, measured off the poster. */
const FIT = 0.87
/** Clearance between stacked slabs at their join, em. */
const CONTACT_GAP = 0.012
/** Entrance length per slab, seconds. */
const ENTER_SEC = 1.5
/** Rendered pixels per frame; the canvas is supersampled up to this. */
const PIXEL_BUDGET = 2.4e6

/* ------------------------------------------------------------------ helpers */

const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d)

function parseColor(c: string | undefined, d: [number, number, number]): [number, number, number] {
    if (!c || typeof c !== "string") return d
    const s = c.trim()
    let m = s.match(/^#([0-9a-f]{3,8})$/i)
    if (m) {
        let h = m[1]
        if (h.length <= 4) h = h.split("").map((x) => x + x).join("")
        return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]
    }
    m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return d
}

function familyString(f: unknown) {
    const def = DEFAULT_FONT.fontFamily as string
    if (!f || typeof f !== "string" || !f.trim()) return def
    if (f.includes(",") || f.includes('"') || f.includes("'")) return f
    return `"${f}", ${def}`
}

/** Felzenszwalb–Huttenlocher squared distance transform of one row/column. */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
    let k = 0
    v[0] = 0
    z[0] = -Infinity
    z[1] = Infinity
    for (let q = 1; q < n; q++) {
        let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        while (s <= z[k]) {
            k--
            s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        }
        k++
        v[k] = q
        z[k] = s
        z[k + 1] = Infinity
    }
    k = 0
    for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++
        d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
    }
}

/** Squared distance from every pixel to the nearest pixel where `seed` is true. */
function edt2d(seed: Uint8Array, n: number) {
    const INF = 1e20
    const g = new Float64Array(n * n)
    for (let i = 0; i < n * n; i++) g[i] = seed[i] ? 0 : INF
    const f = new Float64Array(n), d = new Float64Array(n), z = new Float64Array(n + 1)
    const v = new Int32Array(n)
    for (let x = 0; x < n; x++) {
        for (let y = 0; y < n; y++) f[y] = g[y * n + x]
        edt1d(f, n, d, v, z)
        for (let y = 0; y < n; y++) g[y * n + x] = d[y]
    }
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) f[x] = g[y * n + x]
        edt1d(f, n, d, v, z)
        for (let x = 0; x < n; x++) g[y * n + x] = d[x]
    }
    return g
}

/** Separable box blur of radius r, in place. */
function blur(a: Float32Array, n: number, r: number) {
    const tmp = new Float32Array(n)
    const k = 1 / (2 * r + 1)
    for (let pass = 0; pass < 2; pass++) {
        for (let line = 0; line < n; line++) {
            const at = (j: number) => (pass ? Math.min(n - 1, Math.max(0, j)) * n + line : line * n + Math.min(n - 1, Math.max(0, j)))
            for (let j = 0; j < n; j++) {
                let s = 0
                for (let o = -r; o <= r; o++) s += a[at(j + o)]
                tmp[j] = s * k
            }
            for (let j = 0; j < n; j++) a[at(j)] = tmp[j]
        }
    }
}

/* The poster's own 2 and 8, redrawn from it: a 1000 × 1050 box, y up, origin
 * at the centre. Used while Font is left on its default, because no stock
 * face has them — every font's 8 narrows at the top, and the poster's join
 * depends on the 8's upper bowl being as wide as the 2's foot. */
const POSTER_W = 1000
const POSTER_H = 1050
/** Drawn numerals stand this many em tall, like a font's figures. */
const POSTER_EM_H = 0.75

type Ellipse = [number, number, number, number]

const fillEllipse = (ctx: CanvasRenderingContext2D, [cx, cy, rx, ry]: Ellipse) => {
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
}

const ellipsePt = ([cx, cy, rx, ry]: Ellipse, a: number): [number, number] => [cx + rx * Math.cos((a * Math.PI) / 180), cy + ry * Math.sin((a * Math.PI) / 180)]

/** Band between two ellipses, each swept over its own [from, to] in degrees; the ends are cut straight across. */
const fillRing = (ctx: CanvasRenderingContext2D, o: Ellipse, i: Ellipse, [o0, o1]: number[], [i0, i1]: number[]) => {
    ctx.beginPath()
    for (let s = 0; s <= 96; s++) ctx.lineTo(...ellipsePt(o, o0 + ((o1 - o0) * s) / 96))
    for (let s = 96; s >= 0; s--) ctx.lineTo(...ellipsePt(i, i0 + ((i1 - i0) * s) / 96))
    ctx.fill()
}

/** Superellipse of exponent n: 2 is an ellipse, higher squares it off. */
const fillSuper = (ctx: CanvasRenderingContext2D, [cx, cy, rx, ry]: Ellipse, n: number) => {
    ctx.beginPath()
    for (let s = 0; s < 192; s++) {
        const a = (s / 192) * Math.PI * 2
        const c = Math.cos(a), si = Math.sin(a)
        ctx.lineTo(cx + rx * Math.sign(c) * Math.abs(c) ** (2 / n), cy + ry * Math.sign(si) * Math.abs(si) ** (2 / n))
    }
    ctx.fill()
}

const fillPoly = (ctx: CanvasRenderingContext2D, pts: number[][]) => {
    ctx.beginPath()
    pts.forEach(([x, y]) => ctx.lineTo(x, y))
    ctx.fill()
}

interface Drawn {
    draw: (ctx: CanvasRenderingContext2D) => void
    /** Strokes over the cut ends that are outlined in the accent. */
    accent?: (ctx: CanvasRenderingContext2D) => void
}

const TWO_OUTER: Ellipse = [0, 210, 470, 315]
const TWO_INNER: Ellipse = [-20, 200, 300, 150]
/** Where the 2's outer and inner curves stop at the tail; the cut runs between them. */
const TWO_TAIL: [number, number] = [171.6, 200]

const POSTER_NUMERALS: Record<string, Drawn> = {
    // Two stacked rings of nearly equal width, the upper one squared off so
    // its top runs flat under the 2's foot; flat, wide counters.
    "8": {
        draw: (ctx) => {
            fillSuper(ctx, [0, 275, 480, 250], 3)
            fillSuper(ctx, [0, -185, 500, 340], 2.3)
            ctx.globalCompositeOperation = "destination-out"
            fillEllipse(ctx, [0, 275, 220, 100])
            fillEllipse(ctx, [0, -185, 240, 140])
            ctx.globalCompositeOperation = "source-over"
        },
    },
    // A bowl swept from a tail at the far left, cut on a 33° slant (the
    // poster's gold box), a broad diagonal parallel on both edges, and a
    // deep base.
    "2": {
        draw: (ctx) => {
            fillRing(ctx, TWO_OUTER, TWO_INNER, [-38, TWO_TAIL[0]], [-38, TWO_TAIL[1]])
            fillPoly(ctx, [
                [216, 108],
                [370, 16],
                [-311, -240],
                [-470, -240],
                [-470, -150],
            ])
            fillPoly(ctx, [
                [-470, -525],
                [470, -525],
                [470, -240],
                [-470, -240],
            ])
        },
        accent: (ctx) => {
            // Round caps carry the gold a little round each corner, so the
            // box's upright edges take it too.
            ctx.lineWidth = 40
            ctx.lineCap = "round"
            ctx.beginPath()
            ctx.moveTo(...ellipsePt(TWO_OUTER, TWO_TAIL[0]))
            ctx.lineTo(...ellipsePt(TWO_INNER, TWO_TAIL[1]))
            ctx.stroke()
        },
    },
}

const isDefaultFont = (f: FontValue) => !f.fontFamily || f.fontFamily === DEFAULT_FONT.fontFamily

interface GlyphField {
    sdf: Float32Array
    /** 1 along cut ends outlined in the accent, 0 elsewhere. */
    accent: Float32Array
    inkW: number
    inkH: number
}

/**
 * One glyph as a signed distance field in em, ink centred in the cell
 * (negative inside). Coverage refines the edge to sub-pixel.
 */
function glyphField(ch: string, font: FontValue, stretch: number): GlyphField {
    const cv = document.createElement("canvas")
    cv.width = cv.height = CELL
    const ctx = cv.getContext("2d", { willReadFrequently: true })!
    const weight = font.fontWeight ?? 900
    const style = font.fontStyle ?? "normal"
    const fam = familyString(font.fontFamily)
    const setFont = (px: number) => (ctx.font = `${style} ${weight} ${px}px ${fam}`)
    ctx.fillStyle = "#fff"
    let w: number, h: number
    const n = CELL * CELL
    const accent = new Float32Array(n)
    const drawn = isDefaultFont(font) ? POSTER_NUMERALS[ch] : undefined
    if (drawn) {
        const k = (POSTER_EM_H * FONT_PX) / POSTER_H
        w = POSTER_W * k * stretch
        h = POSTER_H * k
        const place = (c: CanvasRenderingContext2D) => {
            c.translate(CELL / 2, CELL / 2)
            c.scale(k * stretch, -k)
        }
        ctx.save()
        place(ctx)
        drawn.draw(ctx)
        ctx.restore()
        if (drawn.accent) {
            const acv = document.createElement("canvas")
            acv.width = acv.height = CELL
            const actx = acv.getContext("2d", { willReadFrequently: true })!
            actx.strokeStyle = "#fff"
            place(actx)
            drawn.accent(actx)
            const ap = actx.getImageData(0, 0, CELL, CELL).data
            for (let i = 0; i < n; i++) accent[i] = ap[i * 4 + 3] / 255
            blur(accent, CELL, 1)
        }
    } else {
        setFont(FONT_PX)
        let m = ctx.measureText(ch)
        w = (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) * stretch
        h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
        const fitK = Math.min(1, (MAX_INK_EM * FONT_PX) / Math.max(w, h, 1))
        if (fitK < 1) {
            setFont(FONT_PX * fitK)
            m = ctx.measureText(ch)
            w = (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) * stretch
            h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
        }
        ctx.textBaseline = "alphabetic"
        ctx.textAlign = "left"
        ctx.save()
        ctx.translate(CELL / 2, CELL / 2)
        ctx.scale(stretch, 1)
        const left = -(m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2
        const base = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2
        ctx.fillText(ch, left, base)
        ctx.restore()
    }
    const px = ctx.getImageData(0, 0, CELL, CELL).data
    const a = new Float32Array(n)
    const ins = new Uint8Array(n), out = new Uint8Array(n)
    for (let i = 0; i < n; i++) {
        a[i] = px[i * 4 + 3] / 255
        ins[i] = a[i] >= 0.5 ? 1 : 0
        out[i] = 1 - ins[i]
    }
    const toIn = edt2d(ins, CELL)
    const toOut = edt2d(out, CELL)
    const sdf = new Float32Array(n)
    for (let i = 0; i < n; i++) {
        let d = ins[i] ? -(Math.sqrt(toOut[i]) - 0.5) : Math.sqrt(toIn[i]) - 0.5
        if (a[i] > 0.02 && a[i] < 0.98) d = 0.5 - a[i]
        sdf[i] = d / FONT_PX
    }
    // A light blur: the field is exact to the pixel, but its gradient — the
    // wall normals — steps from pixel to pixel and streaks the shading.
    blur(sdf, CELL, 2)
    return { sdf, accent, inkW: w / FONT_PX, inkH: h / FONT_PX }
}

/* ------------------------------------------------------------------ 3D maths */

type M3 = number[] // row-major 3×3

const mul = (a: M3, b: M3): M3 => {
    const r = new Array(9).fill(0)
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j]
    return r
}
const rotX = (a: number): M3 => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)]
const rotY = (a: number): M3 => [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)]
const apply = (m: M3, v: number[]) => [0, 1, 2].map((i) => m[i * 3] * v[0] + m[i * 3 + 1] * v[1] + m[i * 3 + 2] * v[2])

/** Ease-out. No overshoot: past rest, a slab would swing through its neighbour. */
const easeOut = (x: number) => 1 - (1 - x) ** 4

/* ------------------------------------------------------------------ shaders */

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
#define MAXG ${MAX_GLYPHS}
uniform sampler2D uSdf;
uniform vec2 uRes;
uniform int uCount;
uniform mat3 uRot[MAXG];   // world -> local
uniform vec3 uPos[MAXG];
uniform vec2 uInk[MAXG];   // ink half-size, em
uniform float uAlpha[MAXG];
uniform vec3 uFrom[MAXG];
uniform vec3 uTo[MAXG];
uniform vec3 uRim[MAXG];
uniform float uHalfD, uCellEm, uCells, uTexel, uTanF, uCamZ;
uniform vec3 uSheen, uHi, uAccent, uLight;
uniform float uSheenStart, uLine, uGrain, uGrainPx, uKey, uGloss;
out vec4 outColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

/** Glyph i's texel for local point q: R is the distance field, G the accent mask. */
vec4 cell(int i, vec2 q) {
  vec2 uv = q / uCellEm + 0.5;
  uv.y = 1.0 - uv.y;
  uv.x = (uv.x + float(i)) / uCells;
  return texture(uSdf, uv);
}

float sdf2(int i, vec2 q) {
  vec2 b = uInk[i] + 0.03;
  vec2 dq = abs(q) - b;
  float box = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0);
  // Outside the padded box: a lower bound, which must include the padding or
  // the box's own wall reads as a surface.
  if (box > 0.0) return box + 0.03;
  return cell(i, q).r;
}

vec2 grad2(int i, vec2 q) {
  float e = uTexel * 1.5;
  vec2 g = vec2(sdf2(i, q + vec2(e, 0.0)) - sdf2(i, q - vec2(e, 0.0)),
                sdf2(i, q + vec2(0.0, e)) - sdf2(i, q - vec2(0.0, e)));
  float l = length(g);
  return l > 1e-6 ? g / l : vec2(0.0, 1.0);
}

float sdGlyph(int i, vec3 p) {
  vec3 q = uRot[i] * (p - uPos[i]);
  vec2 w = vec2(sdf2(i, q.xy), abs(q.z) - uHalfD);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
}

float sdScene(vec3 p) {
  float d = 1e9;
  for (int i = 0; i < MAXG; i++) {
    if (i >= uCount) break;
    d = min(d, sdGlyph(i, p));
  }
  return d;
}

/** Soft shadow toward the key: the slab's own body darkens counters and the far side of a bowl. */
float shadow(vec3 p, vec3 l) {
  float r = 1.0, t = 0.02;
  for (int s = 0; s < 40; s++) {
    float d = sdScene(p + l * t);
    r = min(r, 10.0 * d / t);
    if (r < 0.01) return 0.0;
    t += clamp(d, 0.01, 0.2);
    if (t > 2.5) break;
  }
  return clamp(r, 0.0, 1.0);
}

/** Coverage of a line of half-width w at distance x, softened over one pixel. */
float line(float x, float w, float px) {
  return 1.0 - smoothstep(w - px * 0.5, w + px * 0.5, x);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  // Grain is sized in CSS pixels, so supersampling does not average it away.
  float grain = (hash(floor(frag / (uGrainPx * 1.5))) - 0.5) * uGrain;
  // The canvas is transparent so the ground colour and the stars behind it
  // show through; only the grain is printed over them (premultiplied).
  vec4 bg = vec4(vec3(step(0.0, grain)), 1.0) * abs(grain) * 0.035;

  vec2 uv = (frag - 0.5 * uRes) / uRes.y;
  vec3 ro = vec3(0.0, 0.0, uCamZ);
  vec3 rd = normalize(vec3(uv * 2.0 * uTanF, -1.0));
  float pxAng = 2.0 * uTanF / uRes.y;

  // Bound the march by the slabs' boxes.
  float tmin = 1e9, tmax = -1.0;
  for (int i = 0; i < MAXG; i++) {
    if (i >= uCount) break;
    vec3 o = uRot[i] * (ro - uPos[i]);
    vec3 d = uRot[i] * rd;
    vec3 b = vec3(uInk[i] + 0.04, uHalfD + 0.01);
    vec3 inv = 1.0 / d;
    vec3 t0 = (-b - o) * inv, t1 = (b - o) * inv;
    vec3 lo = min(t0, t1), hi = max(t0, t1);
    float a = max(max(lo.x, lo.y), lo.z), c = min(min(hi.x, hi.y), hi.z);
    if (c > max(a, 0.0)) { tmin = min(tmin, max(a, 0.0)); tmax = max(tmax, c); }
  }
  if (tmax < 0.0) { outColor = bg; return; }

  float t = tmin;
  int hit = -1;
  for (int s = 0; s < 200; s++) {
    vec3 p = ro + rd * t;
    float d = 1e9;
    int id = -1;
    for (int i = 0; i < MAXG; i++) {
      if (i >= uCount) break;
      float di = sdGlyph(i, p);
      if (di < d) { d = di; id = i; }
    }
    if (d < 0.35 * pxAng * t) { hit = id; break; }
    t += d * 0.9;
    if (t > tmax) break;
  }
  if (hit < 0) { outColor = bg; return; }

  int i = hit;
  vec3 p = ro + rd * t;
  vec3 q = uRot[i] * (p - uPos[i]);
  float d2 = sdf2(i, q.xy);
  float dz = abs(q.z) - uHalfD;
  float px = pxAng * t;
  float lw = uLine;
  mat3 toWorld = transpose(uRot[i]);
  vec3 V = -rd;

  // Printed gradient across the face, dithered by the grain like the poster's.
  float tx = clamp(q.x / (2.0 * uInk[i].x) + 0.5, 0.0, 1.0);
  float tg = clamp(tx + grain * 0.22, 0.0, 1.0);
  float ramp = clamp(tg / uSheenStart, 0.0, 1.0);
  vec3 paint = mix(uFrom[i], uTo[i], 1.0 - pow(1.0 - ramp, 1.4));
  paint = mix(paint, uSheen, smoothstep(uSheenStart, 1.0, tg));

  vec3 col;
  // Lines keep a constant width on screen: each is divided by how much the
  // surface is foreshortened across it.
  vec2 g = grad2(i, q.xy);
  vec2 tg2 = vec2(-g.y, g.x);
  vec3 nWall = toWorld * vec3(g, 0.0);
  if (dz > d2) {
    vec3 n = toWorld * vec3(0.0, 0.0, sign(q.z));
    float across = max(0.25, length(cross(nWall, rd)));
    // Only edges whose wall turns toward us get the hairline; an edge against
    // the sky stays clean, as on the poster.
    float seen = smoothstep(-0.05, 0.1, dot(nWall, V));
    if (q.z > 0.0) {
      // Face: the paint, turned a little by the light, a soft gloss, a white hairline.
      float ndl = max(dot(n, uLight), 0.0);
      vec3 h = normalize(uLight + V);
      col = paint * (0.96 + 0.35 * ndl) + uGloss * pow(max(dot(n, h), 0.0), 48.0);
      col = mix(col, uHi, line(-d2, lw / across, px) * seen);
    } else {
      // Back cap: only ever seen mid-entrance.
      col = mix(vec3(0.0), uRim[i], line(-d2, lw / across, px));
    }
  } else {
    // Wall: black, unless it turns to the key and takes the paint (the 2's cream flank).
    float key = smoothstep(0.55, 0.9, dot(nWall, uLight)) * uKey;
    if (key > 0.0) key *= shadow(p + nWall * 0.012, uLight);
    col = paint * key;

    // A cut end the drawing marked (the box on the 2's tail) is outlined all
    // round in the accent.
    float cap = smoothstep(0.3, 0.7, cell(i, q.xy).g);
    vec3 edge = mix(uRim[i], uAccent, cap);

    float alongZ = max(0.25, length(cross(toWorld * vec3(0.0, 0.0, 1.0), rd)));
    float alongT = max(0.25, length(cross(toWorld * vec3(tg2, 0.0), rd)));
    // Silhouette: where an outward-curving wall turns away, a rim line traces
    // its outline. Flat and inward-curving walls (counters) seen edge-on are
    // slivers, and a line there only flickers.
    float bend = dot(grad2(i, q.xy + tg2 * 0.01) - grad2(i, q.xy - tg2 * 0.01), tg2) / 0.02;
    float sil = (1.0 - smoothstep(0.05, 0.14, abs(dot(nWall, V)))) * smoothstep(0.3, 1.5, bend);
    col = mix(col, uRim[i], sil * (1.0 - cap));
    // The band under the face's hairline, and the cut end's far edge.
    col = mix(col, edge, line(uHalfD - q.z, lw * 1.6 / alongZ, px));
    col = mix(col, uAccent, cap * line(q.z + uHalfD, lw * 1.3 / alongZ, px));
    // Sharp corners: the outline's direction turns hard within a line's width.
    vec2 tn = tg2 * lw * 1.3 / alongT;
    float c = dot(grad2(i, q.xy + tn), grad2(i, q.xy - tn));
    col = mix(col, edge, 1.0 - smoothstep(0.55, 0.85, c));
  }
  col += grain * 0.06;
  outColor = mix(bg, vec4(col, 1.0), uAlpha[i]);
}`

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader")
    return s
}

function setupGpu(gl: WebGL2RenderingContext) {
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link")
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "aPos")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const names = ["uSdf", "uRes", "uCount", "uRot", "uPos", "uInk", "uAlpha", "uFrom", "uTo", "uRim", "uHalfD", "uCellEm", "uCells", "uTexel", "uTanF", "uCamZ", "uSheen", "uHi", "uAccent", "uLight", "uSheenStart", "uLine", "uGrain", "uGrainPx", "uKey", "uGloss"]
    const u: Record<string, WebGLUniformLocation | null> = {}
    for (const n of names) u[n] = gl.getUniformLocation(prog, n)
    return { u, tex }
}

/* ------------------------------------------------------------------ component */

interface Live {
    glyphs: PlinthTallyGlyph[]
    stack: "column" | "row"
    spacing: number
    depth: number
    grain: number
    entrance: PlinthTallyEntrance
    parallax: number
    drift: number
    smoothing: number
    scale: number
    adv: PlinthTallyAdvanced
}

/**
 * PlinthTally — numerals cut from thick slabs, stacked so each shows the wall the
 * other hides, turning in true 3D to follow the pointer.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1000
 * @framerIntrinsicHeight 1250
 */
export default function PlinthTally(props: PlinthTallyProps) {
    const {
        glyphs = [{"to":"#288CF5","rim":"#FD3001","from":"#201CF7","lean":-37,"character":"TEXT"},{"to":"#FBCD08","rim":"#2318F7","from":"#FB3E04","lean":53,"character":"TEXT"}],
        background = "#000000",
        font = {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"\"Arial Black\", \"Helvetica Neue\", Arial, sans-serif","fontWeight":900,"lineHeight":"1.5em","letterSpacing":"0em"},
        stack = "column",
        spacing = 3,
        sparkles = 0,
        scale = 75,
        depth = 3,
        grain = 5,
        parallax = 10,
        drift = 3,
        smoothing = 5,
        style,
    } = props
    const entrance = { ...DEFAULT_ENTRANCE, ...props.entrance }
    const adv = { ...DEFAULT_ADVANCED, ...props.advanced }

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [minSide, setMinSide] = useState(1000)

    const list = (glyphs.length ? glyphs : DEFAULT_GLYPHS)
        .filter((g) => (g.character ?? "").trim())
        .slice(0, MAX_GLYPHS)
    const liveRef = useRef<Live | null>(null)
    liveRef.current = { glyphs: list, stack, spacing, depth, grain, entrance, parallax, drift, smoothing, scale, adv }
    const dirtyRef = useRef(true)
    dirtyRef.current = true

    // Fields rebuild only when what feeds them changes.
    const fieldKey = JSON.stringify([list.map((g) => g.character), font.fontFamily, font.fontWeight, font.fontStyle, adv.stretch])
    const fieldsRef = useRef<{ key: string; fields: GlyphField[] } | null>(null)
    const [fieldTick, setFieldTick] = useState(0)

    useEffect(() => {
        let dead = false
        const build = () => {
            if (dead) return
            const stretch = Math.max(0.5, num(adv.stretch, 100) / 100)
            fieldsRef.current = { key: fieldKey, fields: list.map((g) => glyphField((g.character ?? "").trim(), font, stretch)) }
            setFieldTick((t) => t + 1)
        }
        const spec = `${font.fontStyle ?? "normal"} ${font.fontWeight ?? 900} ${FONT_PX}px ${familyString(font.fontFamily)}`
        const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
        if (fonts && typeof fonts.load === "function") fonts.load(spec, list.map((g) => g.character).join("")).then(build, build)
        else build()
        return () => {
            dead = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fieldKey])

    useEffect(() => {
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return
        const size = { w: 1000, h: 1250 }
        const measure = () => {
            size.w = root.offsetWidth || 1000
            size.h = root.offsetHeight || 1250
            setMinSide(Math.min(size.w, size.h))
            dirtyRef.current = true
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(root)

        const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true }) as WebGL2RenderingContext | null
        if (!gl) {
            console.warn("PlinthTally: WebGL2 is not available")
            return () => ro.disconnect()
        }
        let gpu: ReturnType<typeof setupGpu>
        try {
            gpu = setupGpu(gl)
        } catch (err) {
            console.error("PlinthTally:", err)
            return () => ro.disconnect()
        }
        const { u } = gpu
        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        const ptr = { tx: 0, ty: 0, x: 0, y: 0 }
        const onMove = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            ptr.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1))
            ptr.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1))
        }
        const onLeave = () => {
            ptr.tx = 0
            ptr.ty = 0
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)

        // Assume visible until the observer says otherwise; below the fold it
        // reports within a frame or two, freezing the clock (and the entrance).
        let visible = true
        let enterStart = -1
        const io = new IntersectionObserver((es) => {
            visible = es.some((e) => e.isIntersecting)
            dirtyRef.current = true
        })
        io.observe(root)

        let uploaded = ""
        let raf = 0
        let last = -1
        let clock = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000)
            last = now
            if (!visible) return
            const L = liveRef.current!
            const field = fieldsRef.current
            if (!field || !field.fields.length) return
            const A = L.adv
            const still = !!(mq && mq.matches)

            if (uploaded !== field.key) {
                const n = field.fields.length
                // One row of cells, two channels: distance, accent.
                const data = new Float32Array(CELL * n * CELL * 2)
                field.fields.forEach((f, k) => {
                    for (let y = 0; y < CELL; y++) {
                        let o = (y * CELL * n + k * CELL) * 2
                        for (let x = 0; x < CELL; x++, o += 2) {
                            data[o] = f.sdf[y * CELL + x]
                            data[o + 1] = f.accent[y * CELL + x]
                        }
                    }
                })
                gl.bindTexture(gl.TEXTURE_2D, gpu.tex)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, CELL * n, CELL, 0, gl.RG, gl.FLOAT, data)
                uploaded = field.key
                dirtyRef.current = true
            }

            // Pointer follow, frame-rate independent.
            const rate = 30 - (Math.max(0, Math.min(10, num(L.smoothing, 5))) / 10) * 28
            const k = 1 - Math.exp(-dt * rate)
            const settling = Math.abs(ptr.tx - ptr.x) + Math.abs(ptr.ty - ptr.y) > 1e-4
            ptr.x += (ptr.tx - ptr.x) * k
            ptr.y += (ptr.ty - ptr.y) * k
            const driftAmt = still ? 0 : Math.max(0, num(L.drift, 3))
            clock += dt
            // Entrance runs on the frame clock from the first visible frame.
            if (enterStart < 0) enterStart = clock
            const ent = L.entrance
            const N = field.fields.length
            const enterT = clock - enterStart - num(ent.delay, 0.2)
            const entering = ent.animate && !still && enterT < ENTER_SEC + Math.max(0, num(ent.stagger, 0.18)) * (N - 1)
            if (!dirtyRef.current && !settling && driftAmt === 0 && !entering) return
            dirtyRef.current = false

            const dpr = window.devicePixelRatio || 1
            const scale = Math.max(1, Math.min(dpr * 1.5, Math.sqrt(PIXEL_BUDGET / (size.w * size.h))))
            const cw = Math.max(1, Math.round(size.w * scale)), ch = Math.max(1, Math.round(size.h * scale))
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw
                canvas.height = ch
            }
            gl.viewport(0, 0, cw, ch)

            // Rest layout. In a column each slab hangs from the one above: the foot
            // of one face meets the top edge of the next, and Spacing slides it
            // down (or up, overlapping) from there. With leans summing to 90°
            // the upper face lies in the plane of the lower one's top
            // wall — the poster's impossible join.
            const halfD = (0.04 + Math.max(0, Math.min(10, num(L.depth, 3))) * 0.05) / 2
            const spc = Math.max(0, Math.min(10, num(L.spacing, 3)))
            const lean = field.fields.map((_, i) => (Math.max(-85, Math.min(85, num(L.glyphs[i]?.lean, DEFAULT_GLYPHS[i % 2].lean!))) * Math.PI) / 180)
            const hy = field.fields.map((f, i) => (f.inkH / 2) * Math.cos(lean[i]) + halfD * Math.abs(Math.sin(lean[i])))
            const hx = field.fields.map((f) => f.inkW / 2)
            const pos: number[][] = []
            for (let i = 0; i < N; i++) {
                if (i === 0) pos.push([0, 0, 0])
                else if (L.stack === "row") pos.push([pos[i - 1][0] + (hx[i - 1] + hx[i]) * (0.75 + spc * 0.08), 0, 0])
                else {
                    const foot = apply(rotX(lean[i - 1]), [0, -field.fields[i - 1].inkH / 2, halfD])
                    const top = apply(rotX(lean[i]), [0, field.fields[i].inkH / 2, halfD])
                    // Part them a hair along the difference of the face normals, so the
                    // upper face clears the lower slab's top wall and the lower face
                    // clears the upper slab's underside: each hides the other's wall.
                    const n0 = apply(rotX(lean[i - 1]), [0, 0, 1]), n1 = apply(rotX(lean[i]), [0, 0, 1])
                    const p = pos[i - 1]
                    pos.push([
                        0,
                        p[1] + foot[1] - top[1] + (n1[1] - n0[1]) * CONTACT_GAP - (spc - 3) * 0.05,
                        p[2] + foot[2] - top[2] + (n1[2] - n0[2]) * CONTACT_GAP,
                    ])
                }
            }
            let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
            pos.forEach((p, i) => {
                x0 = Math.min(x0, p[0] - hx[i])
                x1 = Math.max(x1, p[0] + hx[i])
                y0 = Math.min(y0, p[1] - hy[i])
                y1 = Math.max(y1, p[1] + hy[i])
            })
            const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
            // Scale 100 is the poster's framing: the stack fills 87% of the frame.
            const fit = FIT * Math.max(0.1, Math.min(1.5, num(L.scale, 100) / 100))
            const aspect = size.w / size.h
            const viewH = Math.max(y1 - y0, (x1 - x0) / aspect) / fit
            const fov = (Math.max(2, Math.min(90, num(A.fov, 16))) * Math.PI) / 180
            const tanF = Math.tan(fov / 2)
            const camZ = viewH / 2 / tanF

            // Whole-stack turn: pointer plus idle sway.
            const par = Math.max(0, Math.min(10, num(L.parallax, 5)))
            const yaw = ptr.x * par * 0.06 + Math.sin(clock * 0.35) * driftAmt * 0.016
            const pitch = ptr.y * par * 0.04 + Math.sin(clock * 0.27 + 1) * driftAmt * 0.009
            const G = mul(rotY(yaw), rotX(pitch))

            const rot: number[] = [], P: number[] = [], ink: number[] = [], alpha: number[] = []
            const from: number[] = [], to: number[] = [], rim: number[] = []
            for (let i = 0; i < N; i++) {
                let e = 1
                if (ent.animate && !still) {
                    const x = (enterT - i * Math.max(0, num(ent.stagger, 0.18))) / ENTER_SEC
                    e = x <= 0 ? 0 : x >= 1 ? 1 : easeOut(x)
                }
                // Swings up from edge-on into its lean.
                const sg = lean[i] < 0 ? -1 : 1
                const ang = lean[i] + (sg * Math.PI / 2 - lean[i]) * (1 - e)
                const M = mul(G, rotX(ang))
                for (let r = 0; r < 9; r++) rot.push(M[r])
                const rest = [pos[i][0] - cx, pos[i][1] - cy - (1 - e) * 0.25, pos[i][2]]
                P.push(...apply(G, rest))
                const f = field.fields[i]
                ink.push(f.inkW / 2, f.inkH / 2)
                alpha.push(Math.max(0, Math.min(1, e * 2.5)))
                const g = L.glyphs[i] ?? {}
                const d = DEFAULT_GLYPHS[i % 2]
                from.push(...parseColor(g.from, parseColor(d.from, [0, 0, 1])))
                to.push(...parseColor(g.to, parseColor(d.to, [0, 0.5, 1])))
                rim.push(...parseColor(g.rim, parseColor(d.rim, [1, 0, 0])))
            }

            gl.uniform1i(u.uSdf, 0)
            gl.uniform2f(u.uRes, cw, ch)
            gl.uniform1i(u.uCount, N)
            // Row-major local→world is column-major world→local.
            gl.uniformMatrix3fv(u.uRot, false, new Float32Array(rot))
            gl.uniform3fv(u.uPos, new Float32Array(P))
            gl.uniform2fv(u.uInk, new Float32Array(ink))
            gl.uniform1fv(u.uAlpha, new Float32Array(alpha))
            gl.uniform3fv(u.uFrom, new Float32Array(from))
            gl.uniform3fv(u.uTo, new Float32Array(to))
            gl.uniform3fv(u.uRim, new Float32Array(rim))
            gl.uniform1f(u.uHalfD, halfD)
            gl.uniform1f(u.uCellEm, CELL_EM)
            gl.uniform1f(u.uCells, N)
            gl.uniform1f(u.uTexel, CELL_EM / CELL)
            gl.uniform1f(u.uTanF, tanF)
            gl.uniform1f(u.uCamZ, camZ)
            gl.uniform3fv(u.uSheen, parseColor(A.sheenColor, [0.98, 0.96, 0.91]))
            gl.uniform3fv(u.uHi, parseColor(A.highlightColor, [1, 1, 1]))
            gl.uniform3fv(u.uAccent, parseColor(A.accentColor, [1, 0.76, 0.11]))
            // Key from the right, nearly side-on, so only walls turned that way take paint.
            const lx = 1, ly = 0.05, lz = 0.12, ll = Math.hypot(lx, ly, lz)
            gl.uniform3f(u.uLight, lx / ll, ly / ll, lz / ll)
            gl.uniform1f(u.uSheenStart, Math.max(0.05, Math.min(0.99, num(A.sheenStart, 78) / 100)))
            gl.uniform1f(u.uLine, Math.max(0, num(A.lineWidth, 11)) / 2000)
            gl.uniform1f(u.uGrain, Math.max(0, Math.min(10, num(L.grain, 5))) / 10)
            gl.uniform1f(u.uGrainPx, scale)
            gl.uniform1f(u.uKey, Math.max(0, num(A.keyLight, 100)) / 100)
            gl.uniform1f(u.uGloss, Math.max(0, num(A.gloss, 18)) / 100)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, gpu.tex)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            io.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
        }
    }, [])

    useEffect(() => {
        dirtyRef.current = true
    }, [fieldTick])

    const starCount = Math.max(0, Math.min(STARS.length, Math.round(num(sparkles, 4))))
    const starColor = adv.sparkleColor
    const starScale = Math.max(0, num(adv.sparkleSize, 100)) / 100
    const twinkle = Math.max(0.2, num(adv.twinkle, 3.2))

    return (
        <div
            ref={rootRef}
            style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background, ...style }}
        >
            <style>{`@keyframes plinthTallyTwinkle{0%,100%{transform:translate(-50%,-50%) scale(.72);opacity:.65}50%{transform:translate(-50%,-50%) scale(1);opacity:1}}@media (prefers-reduced-motion: reduce){.plinth-tally-star{animation:none!important}}`}</style>
            {/* Stars sit under the canvas: they fill the ground and never cover a slab. */}
            {STARS.slice(0, starCount).map(([x, y, s], i) => {
                const d = s * minSide * 1.6 * starScale
                return (
                    <svg
                        key={i}
                        className="plinth-tally-star"
                        viewBox="-1 -1 2 2"
                        aria-hidden
                        style={{
                            position: "absolute",
                            left: `${x * 100}%`,
                            top: `${y * 100}%`,
                            width: d,
                            height: d,
                            transform: "translate(-50%, -50%)",
                            animation: `plinthTallyTwinkle ${twinkle}s ease-in-out ${(-i * twinkle * 0.37).toFixed(2)}s infinite`,
                            pointerEvents: "none",
                            overflow: "visible",
                        }}
                    >
                        <path d="M0,-1 C.1,-.1 .1,-.1 1,0 C.1,.1 .1,.1 0,1 C-.1,.1 -.1,.1 -1,0 C-.1,-.1 -.1,-.1 0,-1Z" fill={starColor} />
                    </svg>
                )
            })}
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}

/* ------------------------------------------------------------------ controls */
