"use client"

/**
 * FrondBurst — thousands of luminous hairlines burst from one white-hot point
 * on the left edge, fan out teal above and electric-blue below, and curl back
 * into nested fern fronds over a near-black ground with faint fractal
 * silhouettes. Fronds sway, light pulses run out along the strands, the
 * pointer parts them like a finger through hair, and a tap sends a flare out
 * from the source.
 *
 * Refined from the user's `StillImageThousands` and matched to their
 * reference still (a Mandelbrot "field lines" render). The panel keeps every
 * control that  component had, under the same keys, titles, ranges and units.
 *
 * How it draws: each strand is a curve integrated on the CPU (launch angle →
 * gentle bend away from the axis → tightening hook back toward the source),
 * rebuilt only when a control that shapes it changes. The strands are drawn as
 * instanced anti-aliased hairlines, added together in a float buffer so dense
 * bundles sum to glow and the core burns white, then tone-mapped over a cached
 * ground pass that holds the Mandelbrot-edged silhouettes.
 */

import { useEffect, useRef, type CSSProperties } from "react"

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

// ── types & defaults ────────────────────────────────────────────────────────

/** Which way the burst travels: from the source edge toward the opposite one. */
type Direction = "toRight" | "toLeft" | "toBottom" | "toTop"

/** Per direction: the turn applied about the source (°, clockwise on screen),
 *  and whether Source Y counts from the far end of the edge so the teal
 *  fronds stay on the side the turn carries them to. */
const DIRECTIONS: Record<Direction, { angle: number; flip: boolean }> = {
    toRight: { angle: 0, flip: false },
    toLeft: { angle: 180, flip: true },
    toBottom: { angle: 90, flip: true },
    toTop: { angle: -90, flip: false },
}

interface Entrance {
    animate: boolean
    delay: number
    duration: number
}

interface Advanced {
    sourceY: number
    fanLength: number
    jet: number
    tufts: number
    absorb: number
    tuftSpread: number
    sway: number
    swayMs: number
    pulseMs: number
    pulseWidth: number
    pulseBoost: number
    coreColor: string
    midColor: string
    deepColor: string
    slateColor: string
    coreSize: number
    corePulse: number
    tipFade: number
    leadShare: number
    leadBoost: number
    minOpacity: number
    lineGain: number
    lineWidth: number
    fractal: number
    fractalGlow: number
    seed: number
    hover: number
    grain: number
    vignette: number
}

export interface FrondBurstProps {
    /** Ground of the frame; also the colour inside the fractal silhouettes. */
    background?: string
    /** Royal blue of the lower strands. */
    baseColor?: string
    /** Teal of the upper strands. */
    accentColor?: string
    /** Number of strands in the burst. */
    density?: number
    /** How far the strands bend away from the axis and hook back (0–100). */
    curl?: number
    /** Core glow and pulse brightness (0–100). */
    glow?: number
    /** Which way the strands burst across the frame. */
    direction?: Direction
    /** The strands grow out of the source when the component first shows. */
    entrance?: Partial<Entrance>
    /** Animation speed (0–100); 0 freezes the scene. */
    speed?: number
    /** How big the burst draws in its frame (%). 100 is the reference framing. */
    scale?: number
    advanced?: Partial<Advanced>
    style?: CSSProperties
}

const DEFAULT_ENTRANCE: Entrance = { animate: true, delay: 0, duration: 1.8 }

const DEFAULT_ADVANCED: Advanced = {
    sourceY: 45,
    fanLength: 100,
    jet: 200,
    tufts: 11,
    absorb: 40,
    tuftSpread: 100,
    sway: 26,
    swayMs: 13400,
    pulseMs: 4000,
    pulseWidth: 12,
    pulseBoost: 120,
    coreColor: "#DFFFFF",
    midColor: "#4F7BFF",
    deepColor: "#1A1E8A",
    slateColor: "#14506A",
    coreSize: 75,
    corePulse: 41,
    tipFade: 41,
    leadShare: 15,
    leadBoost: 250,
    minOpacity: 30,
    lineGain: 130,
    lineWidth: 90,
    fractal: 0,
    fractalGlow: 8,
    seed: 7,
    hover: 50,
    grain: 0,
    vignette: 0,
}

const DEFAULTS = {
    background: "#02080A",
    baseColor: "#2E3FD8",
    accentColor: "#1FB8A8",
    density: 800,
    curl: 50,
    glow: 41,
    speed: 50,
    scale: 135,
}

// ── constants ───────────────────────────────────────────────────────────────

/** The reference frame (user's original intrinsic size). */
const REF_W = 1200
const REF_H = 800
const REF_ASPECT = REF_W / REF_H
/** Points per strand. Hooks are the tightest part; 128 keeps them round. */
const PTS = 128
/** Of those, the points spent on the stem; the rest go to the hook and its tail. */
const PTS_STEM = 84
/** The source sits this far left of the frame edge (model units = frame
 *  height), so the steepest strands already enter the frame spread out, as
 *  they do in the reference. */
const SOURCE_BACK = 0.06
/** The longer reach of the reference frame above or below the source (model units). */
const REF_HALF_H = 0.55
/** Widest launch angle either side of the axis (rad). */
const LAUNCH_MAX = 0.75
/** The axis that splits the up-curling and down-curling families sits a
 *  touch above horizontal in the reference. */
const SPLIT = 0.05
/** Perspective distance for Tilt, in units of the composition height. */
const PERSPECTIVE = 2.4
/** Total drawing-buffer pixel budget. */
const MAX_PIXELS = 4.2e6
const QUALITY_LEVELS = [1, 0.85, 0.72, 0.6]

// ── small helpers ───────────────────────────────────────────────────────────

type RGB = [number, number, number]
const COLOR_CACHE = new Map<string, RGB | null>()

function parseColor(input: unknown, fallback: RGB): RGB {
    if (typeof input !== "string") return fallback
    let hit = COLOR_CACHE.get(input)
    if (hit === undefined) {
        hit = parseColorRaw(input)
        COLOR_CACHE.set(input, hit)
    }
    return hit ?? fallback
}

function parseColorRaw(raw: string): RGB | null {
    let s = raw.trim()
    const v = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(s)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        const h = s.slice(1)
        const x = (a: string) => parseInt(a, 16) / 255
        let out: RGB
        if (h.length === 3 || h.length === 4) out = [x(h[0] + h[0]), x(h[1] + h[1]), x(h[2] + h[2])]
        else if (h.length === 6 || h.length === 8) out = [x(h.slice(0, 2)), x(h.slice(2, 4)), x(h.slice(4, 6))]
        else return null
        return out.every(Number.isFinite) ? out : null
    }
    const m = /^(rgba?|hsla?)\(([^)]*)\)$/i.exec(s)
    if (!m) return null
    const parts = m[2].split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3) return null
    const num = (p: string, scale: number) => (p.endsWith("%") ? (parseFloat(p) / 100) * scale : parseFloat(p))
    let rgb: RGB
    if (m[1].toLowerCase().startsWith("rgb")) {
        rgb = [num(parts[0], 255) / 255, num(parts[1], 255) / 255, num(parts[2], 255) / 255]
    } else {
        const hh = (((parseFloat(parts[0]) % 360) + 360) % 360) / 360
        const ss = num(parts[1], 1)
        const ll = num(parts[2], 1)
        const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
        const p = 2 * ll - q
        const f = (t: number) => {
            t = (t + 1) % 1
            if (t < 1 / 6) return p + (q - p) * 6 * t
            if (t < 1 / 2) return q
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
            return p
        }
        rgb = [f(hh + 1 / 3), f(hh), f(hh - 1 / 3)]
    }
    return rgb.every(Number.isFinite) ? (rgb.map((c) => Math.min(1, Math.max(0, c))) as RGB) : null
}

/**
 * A colour as light: run it backwards through the composite's soft-clip, so a
 * single strand at nominal brightness shows exactly the chosen colour, dim
 * strands deepen and dense bundles burn toward white — the way the
 * reference's blues go from deep royal to periwinkle.
 */
function asLight(c: RGB): RGB {
    const f = (v: number) => -Math.log(1 - Math.min(v, 0.96)) / 1.25
    return [f(c[0]), f(c[1]), f(c[2])]
}

function num(v: unknown, d: number, lo = -Infinity, hi = Infinity): number {
    const n = typeof v === "number" && Number.isFinite(v) ? v : d
    return Math.min(hi, Math.max(lo, n))
}

function mulberry32(seed: number) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Smooth 1-D value noise in [0, 1): neighbouring strands get neighbouring values. */
function vnoise(x: number, seed: number) {
    const h = (i: number) => {
        const t = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453
        return t - Math.floor(t)
    }
    const i = Math.floor(x)
    const f = x - i
    const u = f * f * (3 - 2 * f)
    return h(i) * (1 - u) + h(i + 1) * u
}

function smooth(e0: number, e1: number, x: number) {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)
}

/** One level deep: Framer re-renders with fresh-but-equal objects. */
function sameProps(a: FrondBurstProps, b: FrondBurstProps | null): boolean {
    if (!b) return false
    const ka = Object.keys(a) as (keyof FrondBurstProps)[]
    const kb = Object.keys(b)
    if (ka.length !== kb.length) return false
    for (const k of ka) {
        const x = a[k]
        const y = b[k]
        if (x === y) continue
        if (k === "style") continue
        if (x && y && typeof x === "object" && typeof y === "object") {
            const ox = x as Record<string, unknown>
            const oy = y as Record<string, unknown>
            const kx = Object.keys(ox)
            if (kx.length !== Object.keys(oy).length) return false
            for (const kk of kx) if (ox[kk] !== oy[kk]) return false
            continue
        }
        return false
    }
    return true
}

// ── strand geometry (CPU) ───────────────────────────────────────────────────

interface Geometry {
    key: string
    n: number
    pts: Float32Array // n × PTS × (x, y, arc length, launch angle)
    lines: Float32Array // row 0: n × (alpha hash, lead hash, pulse phase, length); row 1: n × (reference length, run-on, stem end, 0)
    maxLen: number
}

interface ShapeParams {
    n: number
    curl: number // 0..2 (50 → 1)
    fan: number // 0.1..3
    jet: number // 0..8
    lobes: number // 0..18
    absorb: number // 0..0.95
    spread: number // 0.3..2
    seed: number
    reachX: number // ≥ 1: how much further across than the reference frame the strands must run
    reachY: number // ≥ 1: the same, up and down
}

function shapeKey(s: ShapeParams) {
    return [s.n, s.curl, s.fan, s.jet, s.lobes, s.absorb, s.spread, s.seed, s.reachX, s.reachY].join("|")
}

/**
 * Each strand: launched at θ0, it runs straight while it is in the jet, bends
 * away from the axis at the rate measured along the reference's strands, and
 * finishes in a hairpin (an arc of radius rh, then a short trailing leg).
 * Neighbouring strands get neighbouring values (smooth noise, not per-strand
 * dice), so bundles stay coherent and never tangle.
 */
function buildGeometry(s: ShapeParams): Geometry {
    const n = s.n
    const pts = new Float32Array(n * PTS * 4)
    const lines = new Float32Array(n * 8)
    const rnd = mulberry32(Math.floor(s.seed) * 7919 + 13)
    // Launch angles are dealt from a density profile measured round the
    // reference's source: a crowd on the jet (Jet sets how tight), a bright
    // teal bundle that climbs at about +32° and a blue one that sweeps down
    // from about -20°. Strands launched together run together, so the bundles
    // read as the reference's lead fronds.
    const G = 512
    const cdf = new Float64Array(G + 1)
    for (let g = 0; g <= G; g++) {
        const t = (g / G) * 2 - 1
        const th = t * LAUNCH_MAX
        const d =
            0.55 +
            s.jet * 0.9 * Math.exp(-(th / 0.07) * (th / 0.07)) +
            0.8 * Math.exp(-((th - 0.5) / 0.12) * ((th - 0.5) / 0.12)) +
            0.7 * Math.exp(-((th + 0.36) / 0.12) * ((th + 0.36) / 0.12))
        cdf[g] = g === 0 ? 0 : cdf[g - 1] + d
    }
    for (let g = 0; g <= G; g++) cdf[g] /= cdf[G]
    let gi = 0
    const lobeShift = rnd()
    let maxLen = 0
    const SUB = 4
    for (let i = 0; i < n; i++) {
        const target = Math.min(1, Math.max(0, (i + 0.5 + (rnd() - 0.5) * 0.8) / n))
        while (gi < G - 1 && cdf[gi + 1] < target) gi++
        while (gi > 0 && cdf[gi] > target) gi--
        const f = (target - cdf[gi]) / Math.max(1e-12, cdf[gi + 1] - cdf[gi])
        const u = ((gi + Math.min(1, Math.max(0, f))) / G) * 2 - 1
        const side = u >= 0 ? 1 : -1
        const a = Math.abs(u) // 0 on the axis, 1 at the widest launch
        const th0 = SPLIT + side * LAUNCH_MAX * a
        // Fronds: strands are dealt into lobes either side of the axis. Every
        // hook curls on away from the axis, and inside a lobe each strand is a
        // little longer, with a wider hook, than the one before it, so its
        // arch closes over the shorter strands beyond it — nested hairpins
        // that never cross.
        let lam = 1
        if (s.lobes > 0) {
            const wob = 0.12 * Math.sin(a * 17.0 + lobeShift * 6.28)
            const x = Math.pow(a, 0.75) * s.lobes + lobeShift + wob
            lam = x - Math.floor(x)
        }
        // Length: the jet strands run longest and carry the burst across a
        // wide frame; the steep ones are short.
        const sd = s.seed + (side > 0 ? 0 : 50)
        const lBase = s.fan * (side > 0 ? 0.95 : 1.15) * ((side > 0 ? 0.6 + 0.08 * (1 - a) : 0.38 + 0.5 * (1 - a)) + 1.1 * Math.exp(-(a / 0.12) * (a / 0.12)))
        const L = lBase * (1 - s.absorb * (1 - lam)) * (0.88 + 0.24 * vnoise(a * 23, sd)) * (0.96 + 0.08 * rnd())
        // Hook: a hairpin, not a spiral — the strand arcs over at radius rh,
        // then runs on down a short trailing leg, like the reference's
        // fronds. Tighter toward the lobe's edges; Curl sets how far it turns.
        const rh = 0.024 * s.spread * (0.45 + 0.55 * lam) * (0.8 + 0.4 * vnoise(a * 13 + 3, sd))
        const turn = Math.min(3.4, s.curl * (2.4 + 0.7 * vnoise(a * 11 + 7, sd)))
        const lArc = Math.min(L * 0.45, turn * rh)
        const lTail = Math.min(L * 0.2, (0.015 + 0.06 * lam) * s.spread)
        // Bend away from the axis, in rad per frame height, as measured along
        // strands traced through the reference: ~2 on the jet and ~3.5 on
        // most strands once they leave it, steeper strands more; the climbing
        // bundles bend only ~1.2, which is what sweeps them out to the far corners.
        const bc = side > 0 ? 0.5 : -0.36
        const bundle = Math.exp(-((th0 - SPLIT - bc) / 0.14) * ((th0 - SPLIT - bc) / 0.14))
        const kb = s.curl * (0.15 + 1.65 * smooth(0, 0.16, a) + 2.5 * a + 6 * Math.pow(a, 6)) * (1 - 0.68 * bundle) * (0.92 + 0.16 * vnoise(a * 6 + 11, sd))
        const jetRun = 0.04 + 0.2 * Math.exp(-a / 0.12)
        // Zoomed out (or in a frame wider or taller than the reference), the
        // field keeps going: the stem is drawn at true scale, then the strand
        // carries straight on outward for as far as the frame needs before it
        // hooks. At the reference framing nothing is inserted.
        const stemEnd = L - lTail - lArc
        // A strand runs on only along the way the frame grew: one heading
        // across into a wider frame, one climbing into a taller one, judged by
        // where its stem points when it ends. Strands run on by different
        // amounts, so the fronds land at every distance rather than all at the edge.
        const hEnd = Math.min(1.55, Math.abs(th0 - SPLIT) + kb * Math.max(0, stemEnd - jetRun))
        const need = Math.abs(Math.cos(hEnd)) * REF_ASPECT * (s.reachX - 1) + Math.abs(Math.sin(hEnd)) * REF_HALF_H * (s.reachY - 1)
        const ext = need * (0.45 + 0.75 * (0.5 * vnoise(a * 9 + 2, sd + 17) + 0.5 * rnd()))
        const Ln = L + ext
        const hookEnd = Ln - lTail
        const hookStart = hookEnd - lArc
        let x = 0
        let y = 0
        let h = th0
        let sArc = 0
        const base = i * PTS * 4
        pts[base] = 0
        pts[base + 1] = 0
        pts[base + 2] = 0
        pts[base + 3] = th0
        // Points crowd into the hook so it stays round however long the strand runs.
        const sSplit = Math.max(0, hookStart - lArc * 0.3 - 0.01)
        const w = lArc * 0.25
        const fe = Math.min(0.04, stemEnd * 0.5)
        for (let j = 1; j < PTS; j++) {
            const sTo = j <= PTS_STEM ? (sSplit * j) / PTS_STEM : sSplit + ((Ln - sSplit) * (j - PTS_STEM)) / (PTS - 1 - PTS_STEM)
            // the stem curves gently; only the hook needs fine steps
            const sub = j <= PTS_STEM ? 2 : SUB
            const ds = (sTo - sArc) / sub
            for (let k = 0; k < sub; k++) {
                const sm = sArc + ds * 0.5
                // arc length as the reference strand would have it (the inserted run removed)
                const so = sm < stemEnd ? sm : sm < stemEnd + ext ? stemEnd : sm - ext
                // the bend eases off once a stem stands vertical; only the hook turns it further
                let bend = kb * smooth(jetRun * 0.5, jetRun * 1.5, so) * (1 - smooth(1.35, 1.75, Math.abs(h - SPLIT)))
                // ...and rests along the inserted run, so the strand carries straight on
                if (ext > 0) bend *= 1 - (smooth(stemEnd - fe, stemEnd, sm) - smooth(stemEnd + ext, stemEnd + ext + fe, sm))
                // curvature 1/rh across the arc, eased in and out
                const hk = lArc > 1e-5 ? (smooth(hookStart - w, hookStart + w, sm) - smooth(hookEnd - w, hookEnd + w, sm)) / Math.max(rh, 1e-4) : 0
                h += side * (bend + hk) * ds
                x += Math.cos(h) * ds
                y += Math.sin(h) * ds
                sArc += ds
            }
            const o = base + j * 4
            pts[o] = x
            pts[o + 1] = y
            pts[o + 2] = sArc
            pts[o + 3] = th0
        }
        lines[i * 4] = rnd()
        lines[i * 4 + 1] = rnd()
        lines[i * 4 + 2] = rnd()
        lines[i * 4 + 3] = Ln
        lines[n * 4 + i * 4] = L
        lines[n * 4 + i * 4 + 1] = ext
        lines[n * 4 + i * 4 + 2] = stemEnd
        if (Ln > maxLen) maxLen = Ln
    }
    return { key: shapeKey(s), n, pts, lines, maxLen }
}

// ── shaders ─────────────────────────────────────────────────────────────────

/**
 * Frame ↔ model mapping, shared by every pass. Model units are the
 * composition height; the origin is the source, x right, y up. Placement:
 * Angle then Tilt about the content centre, offsets last.
 */
const MAP_GLSL = `
uniform vec2 uSrc;      // source, frame CSS px (before Placement)
uniform float uUnit;    // CSS px per model unit
uniform vec2 uPivot;    // Placement pivot, frame CSS px
uniform vec4 uPlace;    // cos(angle), sin(angle), tilt (rad), perspective (CSS px)
uniform vec2 uOffset;   // Placement offset, CSS px

vec2 modelToFrame(vec2 p) {
    vec2 d = uSrc + vec2(p.x, -p.y) * uUnit - uPivot;
    d = vec2(d.x * uPlace.x - d.y * uPlace.y, d.x * uPlace.y + d.y * uPlace.x);
    float st = sin(uPlace.z);
    float k = uPlace.w / max(uPlace.w - d.y * st, 1.0);
    d = vec2(d.x, d.y * cos(uPlace.z)) * k;
    return uPivot + d + uOffset;
}

vec2 frameToModel(vec2 f) {
    vec2 q = f - uOffset - uPivot;
    float st = sin(uPlace.z);
    float ct = cos(uPlace.z);
    float dy = q.y * uPlace.w / max(ct * uPlace.w + q.y * st, 1e-3);
    float k = uPlace.w / max(uPlace.w - dy * st, 1.0);
    vec2 d = vec2(q.x / k, dy);
    d = vec2(d.x * uPlace.x + d.y * uPlace.y, -d.x * uPlace.y + d.y * uPlace.x);
    vec2 w = d + uPivot - uSrc;
    return vec2(w.x, -w.y) / uUnit;
}
`

const LINE_VS = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uPts;
uniform sampler2D uLine;
uniform float uPxPerCss;
uniform vec2 uBuf;
uniform float uTime;
uniform vec3 uSway;      // amplitude (rad), angular freq, enabled
uniform vec4 uHover;     // mouse model xy, amount, radius
uniform vec4 uGrow;      // front (model units), enabled, tap front, tap strength
uniform vec4 uPulse;     // period (s), width, boost, glow
uniform vec4 uLook;      // tip brightness, lead share, lead boost, min opacity
uniform vec2 uWidth;     // line width CSS px, gain
uniform vec3 uAccent, uBase, uMid, uDeep, uSlate, uCore;
${MAP_GLSL}
out vec3 vCol;
out float vD;
out float vHalf;
out float vW;

const float PI = 3.14159265;

vec2 deform(vec2 p, float sAbs, float th, float ph) {
    // Sway: each strand bends about the source a little more the further out
    // it is; neighbours share a phase, so whole fronds wave together.
    // Past the reference length the lever stops growing, so a strand that runs
    // on across a zoomed-out frame sways no further than one that doesn't.
    float sl = min(sAbs, 1.0);
    float a = uSway.x * uSway.z * pow(sl, 1.3)
        * (sin(uSway.y * uTime + th * 3.1 + ph * 0.9) + 0.35 * sin(uSway.y * 1.7 * uTime - sl * 5.0 + th * 2.0))
        / max(1.0, length(p));
    float c = cos(a), s = sin(a);
    p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    // Pointer: strands part around it like hair round a finger.
    vec2 d = p - uHover.xy;
    float e = exp(-dot(d, d) / (uHover.w * uHover.w));
    p += d * 0.55 * uHover.z * e;
    return p;
}

void main() {
    int line = gl_InstanceID;
    int idx = gl_VertexID >> 1;
    float side = float(gl_VertexID & 1) * 2.0 - 1.0;
    int last = textureSize(uPts, 0).x - 1;
    vec4 P = texelFetch(uPts, ivec2(idx, line), 0);
    vec4 A = texelFetch(uPts, ivec2(max(idx - 1, 0), line), 0);
    vec4 B = texelFetch(uPts, ivec2(min(idx + 1, last), line), 0);
    vec4 L = texelFetch(uLine, ivec2(line, 0), 0);
    vec4 L2 = texelFetch(uLine, ivec2(line, 1), 0);
    float th = P.w;
    vec2 back = vec2(${SOURCE_BACK.toFixed(4)}, 0.0);
    vec2 p = deform(P.xy, P.z, th, L.z) - back;
    vec2 pa = deform(A.xy, A.z, th, L.z) - back;
    vec2 pb = deform(B.xy, B.z, th, L.z) - back;
    vec2 sp = modelToFrame(p) * uPxPerCss;
    vec2 sa = modelToFrame(pa) * uPxPerCss;
    vec2 sb = modelToFrame(pb) * uPxPerCss;
    vec2 t = sb - sa;
    float tl = length(t);
    t = tl > 1e-5 ? t / tl : vec2(1.0, 0.0);
    vec2 nrm = vec2(-t.y, t.x);

    float w = max(uWidth.x * uPxPerCss, 0.05);
    float wd = max(w, 1.0);
    float half_ = wd * 0.5 + 1.0;
    vec2 pos = sp + nrm * side * half_;
    gl_Position = vec4(pos / uBuf * 2.0 - 1.0, 0.0, 1.0);
    gl_Position.y = -gl_Position.y;
    vD = side * half_;
    vHalf = wd * 0.5;
    vW = w / wd;

    // ── colour ──
    // Where the strand would be at the reference framing: a run-on inserted
    // for a zoomed-out frame holds its stem-end look rather than fading out.
    float so = P.z < L2.z ? P.z : (P.z < L2.z + L2.y ? L2.z : P.z - L2.y);
    float sN = so / max(L2.x, 1e-4);
    float sTravel = P.z / max(L.w, 1e-4);
    float r = min(length(P.xy), 1.1);
    float ang = th - ${SPLIT.toFixed(3)};
    float upW = smoothstep(0.1, 0.42, ang);
    float loW = smoothstep(0.1, 0.45, -ang);
    float hc = fract(L.x * 7.31 + L.y * 3.17);
    vec3 cyan = mix(uAccent, uCore, 0.15);
    // the reference's jet blues sit at red ≈ green: base, pulled a touch toward violet
    vec3 violet = vec3(uBase.r * 1.1, uBase.g * 0.8, uBase.b);
    // middle: cyan out of the core, periwinkle further out
    vec3 col = mix(cyan, violet, smoothstep(0.06, 0.3, P.x));
    col = mix(col, uBase, smoothstep(0.6, 1.2, P.x) * 0.6);
    // lower: royal, deepening at the tips, which turn cyan-teal near the end
    vec3 lo = mix(uBase, uDeep, smoothstep(0.25, 0.75, r));
    lo = mix(lo, mix(uMid, uAccent, 0.5), smoothstep(0.8, 1.0, sN) * 0.45);
    lo = mix(mix(uAccent, uSlate, 0.45), lo, smoothstep(0.08, 0.32, P.x));
    col = mix(col, lo, loW);
    // upper: teal, dimming to slate up and out
    vec3 hi = mix(uAccent, uSlate, smoothstep(0.35, 0.8, r) * 0.7);
    col = mix(col, hi, upW);
    // near the source strands alternate teal / blue line by line
    float alt = exp(-r / 0.14);
    col = mix(col, hc < 0.45 ? cyan : mix(uMid, cyan, 0.25), alt * 0.8);
    col = mix(col, uCore, exp(-r / 0.04) * 0.6);

    // ── brightness ──
    float alpha = mix(uLook.w, 1.0, L.x) * (L.y < uLook.y ? uLook.z : 1.0);
    float bri = mix(1.0, uLook.x, smoothstep(0.15, 1.0, sN));
    // the jet's body: a luminous electric-blue spread out to ~0.4 of the height
    bri *= 1.0 + 1.5 * exp(-(ang / 0.32) * (ang / 0.32)) * smoothstep(0.04, 0.2, r) * (1.0 - smoothstep(0.3, 1.1, r));
    // light gathers on the strands nearest the jet; the outer ones are
    // dimmer, and the upper fronds glow less than the blue below
    bri *= mix(1.0, ang > 0.0 ? 0.8 : 0.35, smoothstep(0.1, 0.7, abs(ang) / ${LAUNCH_MAX.toFixed(3)}));
    bri *= 1.0 + 0.9 * loW * smoothstep(0.1, 0.35, r);
    // light pulse running source → tip, sine in-out over 3/4 of each pass
    float up = fract(uTime / max(uPulse.x, 0.1) + L.z);
    float e = 0.5 - 0.5 * cos(PI * min(up / 0.75, 1.0));
    float pw = max(uPulse.y, 1e-3);
    float spos = -pw + e * (1.0 + 2.0 * pw);
    float px = (sTravel - spos) / pw;
    float pulse = abs(px) < 1.0 ? 0.5 + 0.5 * cos(PI * px) : 0.0;
    bri *= 1.0 + uPulse.z * uPulse.w * pulse;
    // pointer light
    vec2 dm = p + back - uHover.xy;
    bri *= 1.0 + 1.6 * uHover.z * exp(-dot(dm, dm) / (uHover.w * uHover.w * 1.8));
    // entrance: strands grow out of the source, a bright head at the front
    if (uGrow.y > 0.5) {
        float g = uGrow.x - P.z;
        bri *= smoothstep(0.0, 0.03, g) * (1.0 + 2.5 * exp(-(g / 0.04) * (g / 0.04)));
    }
    // tap flare: a bright wave running out along every strand
    float tw = (P.z - uGrow.z) / 0.06;
    bri *= 1.0 + uGrow.w * 3.0 * exp(-tw * tw);
    vCol = col * alpha * bri * uWidth.y;
}`

const LINE_FS = `#version 300 es
precision highp float;
in vec3 vCol;
in float vD;
in float vHalf;
in float vW;
out vec4 o;
void main() {
    float cov = clamp(vHalf + 0.5 - abs(vD), 0.0, 1.0) * vW;
    o = vec4(vCol * cov, 1.0);
}`

const QUAD_VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

/**
 * Ground: the fractal silhouettes behind the strands — a long region
 * along the lower left and a smaller one in the top right, with genuinely
 * fractal (Julia-set) edges. R = inside, G = a thin rim just outside the edge.
 */
const GROUND_FS = `#version 300 es
precision highp float;
uniform vec2 uGroundRes;
uniform vec2 uFrame;
${MAP_GLSL}
out vec4 o;

float tri(float x) { return abs(fract(x * 0.5) * 2.0 - 1.0); }

// The edge is one flank of the "cauliflower" Julia set (z² + 1/4), laid along
// the region's border and mirrored end to end so it runs any length; its
// overall bow is flattened out so only the buds remain. Returns
// (inside 0..1, rim 0..1) for a point u along the border, n inside it (model
// units).
const float JK = 1.8; // Julia units per model unit
vec2 edge(float u, float n) {
    if (n > 0.09) return vec2(1.0, 0.0);
    if (n < -0.06) return vec2(0.0, 0.0);
    float y = 0.12 + 0.6 * tri(u * JK / 0.6);
    float x = 0.8 - 1.2 * (y - 0.4) * (y - 0.4) - n * JK;
    vec2 z = vec2(x, y);
    vec2 dz = vec2(1.0, 0.0);
    float m2 = 0.0;
    for (int k = 0; k < 200; k++) {
        dz = 2.0 * vec2(z.x * dz.x - z.y * dz.y, z.x * dz.y + z.y * dz.x);
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + vec2(0.25, 0.0);
        m2 = dot(z, z);
        if (m2 > 1024.0) break;
    }
    if (m2 <= 1024.0) return vec2(1.0, 0.0);
    float de = 0.5 * sqrt(m2) * log(m2) / max(length(dz), 1e-8) / JK; // model units
    float px = 1.5 / uUnit;                                           // ~1.5 CSS px
    float inside = 1.0 - smoothstep(0.0, px, de);
    float rim = exp(-de / 0.01) * smoothstep(0.0, px, de);
    return vec2(inside, rim);
}

void main() {
    vec2 f = gl_FragCoord.xy / uGroundRes * uFrame;
    f.y = uFrame.y - f.y;
    // silhouettes are laid out from the source row on the frame's left edge
    vec2 p = frameToModel(f);
    // lower-left region: below a line falling to the right
    vec2 b0 = vec2(0.0, -0.21);
    vec2 dl = normalize(vec2(0.563, -0.42));
    vec2 rel = p - b0;
    float nLow = -(dl.x * rel.y - dl.y * rel.x);
    vec2 lo = edge(dot(dl, rel) + 0.37, nLow);
    // upper-right region: above a shallow bowl
    float yu = 0.3 + 4.0 * (p.x - 0.66) * (p.x - 0.66);
    float nUp = (p.y - yu) / sqrt(1.0 + pow(8.0 * (p.x - 0.66), 2.0));
    vec2 hi = edge(p.x + 0.11, nUp);
    o = vec4(max(lo.x, hi.x), max(lo.y, hi.y), 0.0, 1.0);
}`

const COMPOSITE_FS = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uLines;
uniform sampler2D uGround;
uniform vec2 uBuf;
uniform float uPxPerCss;
uniform vec3 uBg;
uniform vec3 uAccentS;   // sRGB
uniform vec3 uCoreL;
uniform vec3 uAccentL;
uniform vec4 uFx;        // fractal, fractal glow, grain, vignette
uniform vec4 uCoreP;     // core radius (model), glow, time-phase, unused
uniform float uFrameT;
${MAP_GLSL}
out vec4 o;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

void main() {
    vec2 uv = gl_FragCoord.xy / uBuf;
    vec3 light = texture(uLines, uv).rgb;
    vec2 g = texture(uGround, uv).rg;
    vec2 f = vec2(gl_FragCoord.x, uBuf.y - gl_FragCoord.y) / uPxPerCss;
    vec2 q = frameToModel(f) + vec2(${SOURCE_BACK.toFixed(4)}, 0.0);
    // core: a white-hot squeeze where the strands leave the source
    float cr = max(uCoreP.x, 1e-4);
    // one-sided: nothing burns behind the source
    vec2 qe = vec2(q.x * (q.x < 0.0 ? 2.5 : 0.55), q.y * 2.6);
    float core = exp(-dot(qe, qe) / (cr * cr));
    float halo = exp(-length(vec2(q.x * (q.x < 0.0 ? 2.5 : 0.6), q.y * 2.4)) / (cr * 1.6)) * 0.12;
    light += (uCoreL * core * 1.6 + mix(uAccentL, uCoreL, 0.5) * halo) * uCoreP.y;
    // soft-clip so dense bundles glow toward white
    vec3 tm = 1.0 - exp(-light * 1.25);
    vec3 ground = uBg * mix(1.0, 0.32, uFx.x * (1.0 - g.x));
    ground += uAccentS * g.y * uFx.y * uFx.x * 0.6;
    vec3 c = 1.0 - (1.0 - ground) * (1.0 - tm);
    vec2 cuv = gl_FragCoord.xy / uBuf;
    float vd = length((cuv - 0.5) * vec2(uBuf.x / max(uBuf.y, 1.0), 1.0));
    c *= 1.0 - uFx.w * smoothstep(0.35, 1.0, vd);
    vec2 gp = floor(gl_FragCoord.xy / max(uPxPerCss, 1.0));
    c += (h21(gp + uFrameT * 17.0) - 0.5) * 0.15 * uFx.z;
    o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`

// ── GL plumbing ─────────────────────────────────────────────────────────────

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
    const sh = (type: number, src: string) => {
        const s = gl.createShader(type)
        if (!s) throw new Error("createShader failed")
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
            const log = gl.getShaderInfoLog(s) || "shader compile failed"
            gl.deleteShader(s)
            throw new Error(log)
        }
        return s
    }
    const p = gl.createProgram()
    if (!p) throw new Error("createProgram failed")
    const v = sh(gl.VERTEX_SHADER, vs)
    const f = sh(gl.FRAGMENT_SHADER, fs)
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.bindAttribLocation(p, 0, "aPos")
    gl.linkProgram(p)
    gl.deleteShader(v)
    gl.deleteShader(f)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
        throw new Error(gl.getProgramInfoLog(p) || "link failed")
    }
    return p
}

/** Uniform setter that uploads only on change (doubles, not float32). */
class Uniforms {
    private loc = new Map<string, WebGLUniformLocation | null>()
    private last = new Map<string, Float64Array>()
    constructor(private gl: WebGL2RenderingContext, private prog: WebGLProgram) {}
    private get(name: string) {
        let l = this.loc.get(name)
        if (l === undefined) {
            l = this.gl.getUniformLocation(this.prog, name)
            this.loc.set(name, l)
        }
        return l
    }
    private changed(name: string, a: number, b = 0, c = 0, d = 0) {
        let v = this.last.get(name)
        if (!v) {
            v = new Float64Array([NaN, NaN, NaN, NaN])
            this.last.set(name, v)
        }
        if (v[0] === a && v[1] === b && v[2] === c && v[3] === d) return false
        v[0] = a
        v[1] = b
        v[2] = c
        v[3] = d
        return true
    }
    f1(n: string, a: number) {
        if (this.changed(n, a)) this.gl.uniform1f(this.get(n), a)
    }
    f2(n: string, a: number, b: number) {
        if (this.changed(n, a, b)) this.gl.uniform2f(this.get(n), a, b)
    }
    f3(n: string, a: number, b: number, c: number) {
        if (this.changed(n, a, b, c)) this.gl.uniform3f(this.get(n), a, b, c)
    }
    f4(n: string, a: number, b: number, c: number, d: number) {
        if (this.changed(n, a, b, c, d)) this.gl.uniform4f(this.get(n), a, b, c, d)
    }
    i1(n: string, a: number) {
        if (this.changed(n, a, -1)) this.gl.uniform1i(this.get(n), a)
    }
}

interface Target {
    tex: WebGLTexture
    fbo: WebGLFramebuffer
    w: number
    h: number
}

// ── component ───────────────────────────────────────────────────────────────

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function FrondBurst(props: FrondBurstProps) {
    props = withMovedControls(props)
    const {
        background = DEFAULTS.background,
        baseColor = DEFAULTS.baseColor,
        accentColor = DEFAULTS.accentColor,
        density = DEFAULTS.density,
        curl = DEFAULTS.curl,
        glow = DEFAULTS.glow,
        speed = DEFAULTS.speed,
        scale = DEFAULTS.scale,
        direction = "toTop",
        style,
    } = props
    void [baseColor, accentColor, density, curl, glow, speed, scale, direction]
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props
    const wakeRef = useRef<() => void>(() => {})

    // Every render may carry new values: let the loop decide if anything changed.
    useEffect(() => {
        wakeRef.current()
    })

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const reduced =
            typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        let onCanvas = false
        try {
            onCanvas = RenderTarget.current() === RenderTarget.canvas
        } catch {
            onCanvas = false
        }

        // ── GL state (rebuilt on context restore) ──
        let gl: WebGL2RenderingContext | null = null
        let lineProg: WebGLProgram | null = null
        let groundProg: WebGLProgram | null = null
        let compProg: WebGLProgram | null = null
        let uL: Uniforms | null = null
        let uG: Uniforms | null = null
        let uC: Uniforms | null = null
        let vao: WebGLVertexArrayObject | null = null
        let quad: WebGLBuffer | null = null
        let ptsTex: WebGLTexture | null = null
        let lineTex: WebGLTexture | null = null
        let lineTarget: Target | null = null
        let groundTarget: Target | null = null
        let floatOK = false
        let geomUploaded = ""
        let uploadedN = -1
        let lastBuild = -1e9
        let refineTimer = 0
        let groundKey = ""
        let lost = false
        let geom: Geometry | null = null
        let timerExt: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null = null
        const queries: { q: WebGLQuery; level: number }[] = []

        const makeTarget = (w: number, h: number, float: boolean, filter: number): Target | null => {
            if (!gl) return null
            const tex = gl.createTexture()
            const fbo = gl.createFramebuffer()
            if (!tex || !fbo) return null
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texImage2D(gl.TEXTURE_2D, 0, float ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
            const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            if (!ok) {
                gl.deleteTexture(tex)
                gl.deleteFramebuffer(fbo)
                return null
            }
            return { tex, fbo, w, h }
        }
        const dropTarget = (t: Target | null) => {
            if (!t || !gl) return
            gl.deleteTexture(t.tex)
            gl.deleteFramebuffer(t.fbo)
        }

        const initGL = (): boolean => {
            gl = canvas.getContext("webgl2", {
                alpha: false,
                antialias: false,
                depth: false,
                stencil: false,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                powerPreference: "low-power",
            })
            if (!gl) return false
            try {
                lineProg = compile(gl, LINE_VS, LINE_FS)
                groundProg = compile(gl, QUAD_VS, GROUND_FS)
                compProg = compile(gl, QUAD_VS, COMPOSITE_FS)
            } catch (e) {
                if (!gl.isContextLost()) console.error("FrondBurst:", e)
                gl = null
                return false
            }
            uL = new Uniforms(gl, lineProg)
            uG = new Uniforms(gl, groundProg)
            uC = new Uniforms(gl, compProg)
            floatOK = !!gl.getExtension("EXT_color_buffer_float") || !!gl.getExtension("EXT_color_buffer_half_float")
            timerExt = gl.getExtension("EXT_disjoint_timer_query_webgl2") as typeof timerExt
            quad = gl.createBuffer()
            vao = gl.createVertexArray()
            gl.bindVertexArray(vao)
            gl.bindBuffer(gl.ARRAY_BUFFER, quad)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
            gl.bindVertexArray(null)
            ptsTex = gl.createTexture()
            lineTex = gl.createTexture()
            for (const t of [ptsTex, lineTex]) {
                gl.bindTexture(gl.TEXTURE_2D, t)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            }
            geomUploaded = ""
            uploadedN = -1
            groundKey = ""
            lineTarget = null
            groundTarget = null
            queries.length = 0
            return true
        }

        // ── size & resolution ──
        let W = 0 // layout CSS px
        let H = 0
        let shown = 1
        let quality = 0
        let bufW = 0
        let bufH = 0
        let pxPerCss = 1
        const measureShown = () => {
            if (W <= 0) return
            const r = root.getBoundingClientRect()
            const s = Math.min(2, Math.max(1, r.width / W))
            if (Math.abs(s - shown) / shown > 0.05) {
                shown = s
                return true
            }
            return false
        }
        const sizeBuffers = () => {
            if (!gl || W <= 0 || H <= 0) return
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            let k = dpr * shown * QUALITY_LEVELS[quality]
            const px = W * H * k * k
            if (px > MAX_PIXELS) k *= Math.sqrt(MAX_PIXELS / px)
            const bw = Math.max(1, Math.round(W * k))
            const bh = Math.max(1, Math.round(H * k))
            pxPerCss = bw / W
            if (bw === bufW && bh === bufH && lineTarget) return
            bufW = bw
            bufH = bh
            canvas.width = bw
            canvas.height = bh
            dropTarget(lineTarget)
            lineTarget = makeTarget(bw, bh, floatOK, gl.NEAREST)
            if (!lineTarget && floatOK) {
                floatOK = false
                lineTarget = makeTarget(bw, bh, false, gl.NEAREST)
            }
            groundKey = ""
            // Redraw now: a resized canvas is blank until the next paint.
            draw(lastNow)
        }

        // ── pointer (stored as a 0–1 share of the frame) ──
        let ptrClientX = 0
        let ptrClientY = 0
        let ptrMoved = false
        let ptrInside = false
        let ptrU = 0.5
        let ptrV = 0.5
        let hoverTarget = 0
        let hover = 0
        let mxModel = 0
        let myModel = 0
        let mxEase = 0
        let myEase = 0
        let tapTime = -1e9
        const onMove = (e: PointerEvent) => {
            if (e.clientX === ptrClientX && e.clientY === ptrClientY && ptrInside) return
            ptrClientX = e.clientX
            ptrClientY = e.clientY
            ptrMoved = true
            ptrInside = true
            wake()
        }
        const onLeave = () => {
            ptrInside = false
            wake()
        }
        const onDown = (e: PointerEvent) => {
            ptrClientX = e.clientX
            ptrClientY = e.clientY
            ptrMoved = true
            ptrInside = e.pointerType === "mouse"
            tapTime = realT
            wake()
        }
        const onUp = (e: PointerEvent) => {
            if (e.pointerType !== "mouse") {
                ptrInside = false
                wake()
            }
        }
        const onScroll = () => {
            if (ptrInside) {
                ptrMoved = true
                wake()
            }
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        root.addEventListener("pointerup", onUp)
        root.addEventListener("pointercancel", onLeave)
        window.addEventListener("scroll", onScroll, { passive: true, capture: true })

        // ── frame mapping (CPU copy of MAP_GLSL) ──
        const map = {
            srcX: 0, srcY: 0, unit: 1, pivX: 0, pivY: 0, ca: 1, sa: 0, tilt: 0, persp: 1, offX: 0, offY: 0,
            alongLen: 1, perpLen: 1, perpPos: 0,
        }
        const updateMap = (p: FrondBurstProps) => {
            const adv = { ...DEFAULT_ADVANCED, ...p.advanced }
            const key = (typeof p.direction === "string" && p.direction in DIRECTIONS ? p.direction : "toRight") as Direction
            const dir = DIRECTIONS[key]
            const vertical = key === "toBottom" || key === "toTop"
            // Contain the 1200×800 composition laid along the travel direction:
            // S is its short side. The burst enters from the source edge, so a
            // longer frame extends its world onward rather than pulling the
            // source off the edge.
            const alongLen = vertical ? H : W
            const perpLen = vertical ? W : H
            const S = Math.min(perpLen, alongLen / REF_ASPECT)
            const sc = num(p.scale, DEFAULTS.scale, 10, 300) / 100
            map.unit = S * sc
            const sy = num(adv.sourceY, DEFAULT_ADVANCED.sourceY, 0, 100) / 100
            const perpPos = (perpLen - S) / 2 + (dir.flip ? 1 - sy : sy) * S
            map.alongLen = alongLen
            map.perpLen = perpLen
            map.perpPos = perpPos
            if (key === "toRight") {
                map.srcX = 0
                map.srcY = perpPos
            } else if (key === "toLeft") {
                map.srcX = W
                map.srcY = perpPos
            } else if (key === "toBottom") {
                map.srcX = perpPos
                map.srcY = 0
            } else {
                map.srcX = perpPos
                map.srcY = H
            }
            // Direction turns the burst about its source.
            map.pivX = map.srcX
            map.pivY = map.srcY
            const ang = (dir.angle * Math.PI) / 180
            map.ca = Math.cos(ang)
            map.sa = Math.sin(ang)
            map.tilt = 0
            map.persp = PERSPECTIVE * S
            map.offX = 0
            map.offY = 0
        }
        const frameToModel = (fx: number, fy: number): [number, number] => {
            const qx = fx - map.offX - map.pivX
            const qy = fy - map.offY - map.pivY
            const st = Math.sin(map.tilt)
            const ct = Math.cos(map.tilt)
            const dy = (qy * map.persp) / Math.max(ct * map.persp + qy * st, 1e-3)
            const k = map.persp / Math.max(map.persp - dy * st, 1)
            const dx = qx / k
            const rx = dx * map.ca + dy * map.sa
            const ry = -dx * map.sa + dy * map.ca
            return [(rx + map.pivX - map.srcX) / map.unit, -(ry + map.pivY - map.srcY) / map.unit]
        }
        const setMapUniforms = (u: Uniforms) => {
            u.f2("uSrc", map.srcX, map.srcY)
            u.f1("uUnit", map.unit)
            u.f2("uPivot", map.pivX, map.pivY)
            u.f4("uPlace", map.ca, map.sa, map.tilt, map.persp)
            u.f2("uOffset", map.offX, map.offY)
        }

        // ── loop state ──
        let raf = 0
        let running = false
        let visible = true
        let clock = 0 // animation time, s (scaled by Speed)
        let realT = 0 // real time since start, s
        let lastNow = 0
        let lastTick = -1
        let due = 0
        let dirty = true
        let lastProps: FrondBurstProps | null = null
        let growStart = -1
        let growDone = !(DEFAULT_ENTRANCE.animate) || onCanvas || reduced
        let lateEma = 1
        let gpuEma = 0
        let goodFor = 0
        let slowFor = 0
        let banUntil = 0
        let drawn = 0
        let measuredAt = 0
        let warm = 0

        const shapeOf = (p: FrondBurstProps): ShapeParams => {
            const adv = { ...DEFAULT_ADVANCED, ...p.advanced }
            return {
                n: Math.round(num(p.density, DEFAULTS.density, 50, 2000)),
                curl: num(p.curl, DEFAULTS.curl, 0, 100) / 50,
                fan: num(adv.fanLength, DEFAULT_ADVANCED.fanLength, 10, 300) / 100,
                jet: num(adv.jet, DEFAULT_ADVANCED.jet, 0, 800) / 100,
                lobes: Math.round(num(adv.tufts, DEFAULT_ADVANCED.tufts, 0, 18)),
                absorb: num(adv.absorb, DEFAULT_ADVANCED.absorb, 0, 95) / 100,
                spread: num(adv.tuftSpread, DEFAULT_ADVANCED.tuftSpread, 30, 200) / 100,
                seed: Math.round(num(adv.seed, DEFAULT_ADVANCED.seed, 0, 999)),
                reachX: reachOf(true),
                reachY: reachOf(false),
            }
        }
        // How much further than at the reference framing the strands must run
        // to reach the frame's edges: 1 in a 1200×800 frame at 100%, more when
        // zoomed out or in a wider or taller frame. Stepped, so a Scale drag
        // rebuilds the strands at most once per 5%.
        const reachOf = (across: boolean) => {
            if (W <= 0 || H <= 0 || map.unit <= 0) return 1
            const r = across
                ? map.alongLen / map.unit / REF_ASPECT
                : Math.max(map.perpPos, map.perpLen - map.perpPos) / map.unit / REF_HALF_H
            return Math.ceil(Math.max(1, r) * 20 - 1e-6) / 20
        }

        const uploadGeometry = () => {
            if (!gl || !geom || geomUploaded === geom.key) return
            // Same strand count: overwrite in place rather than reallocating.
            const same = uploadedN === geom.n
            gl.bindTexture(gl.TEXTURE_2D, ptsTex)
            if (same) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PTS, geom.n, gl.RGBA, gl.FLOAT, geom.pts)
            else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, PTS, geom.n, 0, gl.RGBA, gl.FLOAT, geom.pts)
            gl.bindTexture(gl.TEXTURE_2D, lineTex)
            if (same) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, geom.n, 2, gl.RGBA, gl.FLOAT, geom.lines)
            else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, geom.n, 2, 0, gl.RGBA, gl.FLOAT, geom.lines)
            uploadedN = geom.n
            geomUploaded = geom.key
        }

        const draw = (now: number) => {
            if (!gl || lost || !lineProg || !groundProg || !compProg || !uL || !uG || !uC || !lineTarget) return
            if (W <= 0 || H <= 0) return
            const p = propsRef.current
            const adv = { ...DEFAULT_ADVANCED, ...p.advanced }
            updateMap(p)
            const sp = shapeOf(p)
            const key = shapeKey(sp)
            const keepDraft = !!geom && geom.key === key + "|draft" && realT - lastBuild < 0.25
            if (!geom || (geom.key !== key && !keepDraft)) {
                // While a shape control (or Scale) is being dragged, rebuilds come
                // every few ms: draw a half-count draft, then sharpen once it rests.
                const fast = realT - lastBuild < 0.25 && sp.n > 200
                geom = buildGeometry(fast ? { ...sp, n: Math.round(sp.n / 2) } : sp)
                if (fast) {
                    geom.key = key + "|draft"
                    clearTimeout(refineTimer)
                    refineTimer = window.setTimeout(() => wake(), 260)
                }
                lastBuild = realT
            }
            uploadGeometry()

            // ground (cached; rebuilt only when the mapping or size changes)
            const fractal = num(adv.fractal, DEFAULT_ADVANCED.fractal, 0, 100) / 100
            const gw = Math.max(1, Math.round(bufW / 2))
            const gh = Math.max(1, Math.round(bufH / 2))
            const gKey = fractal > 0 ? [gw, gh, W, H, map.srcX, map.srcY, map.unit, map.ca, map.sa, map.tilt, map.offX, map.offY].join("|") : "off"
            if (gKey !== groundKey) {
                if (!groundTarget || groundTarget.w !== gw || groundTarget.h !== gh) {
                    dropTarget(groundTarget)
                    groundTarget = makeTarget(gw, gh, false, gl.LINEAR)
                }
                if (groundTarget) {
                    gl.bindFramebuffer(gl.FRAMEBUFFER, groundTarget.fbo)
                    gl.viewport(0, 0, gw, gh)
                    if (fractal > 0) {
                        gl.useProgram(groundProg)
                        uG.f2("uGroundRes", gw, gh)
                        uG.f2("uFrame", W, H)
                        setMapUniforms(uG)
                        gl.bindVertexArray(vao)
                        gl.drawArrays(gl.TRIANGLES, 0, 3)
                    } else {
                        gl.clearColor(0, 0, 0, 1)
                        gl.clear(gl.COLOR_BUFFER_BIT)
                    }
                }
                groundKey = gKey
            }

            // timer query: how long the GPU spends on this frame
            let q: WebGLQuery | null = null
            if (timerExt && queries.length < 4) {
                q = gl.createQuery()
                if (q) gl.beginQuery(timerExt.TIME_ELAPSED_EXT, q)
            }

            // strands
            const glowK = num(p.glow, DEFAULTS.glow, 0, 100) / 50
            const accent = asLight(parseColor(p.accentColor, [0.12, 0.72, 0.66]))
            const base = asLight(parseColor(p.baseColor, [0.18, 0.25, 0.85]))
            const mid = asLight(parseColor(adv.midColor, [0.31, 0.48, 1]))
            const deep = asLight(parseColor(adv.deepColor, [0.1, 0.12, 0.54]))
            const slate = asLight(parseColor(adv.slateColor, [0.08, 0.31, 0.42]))
            const coreC = asLight(parseColor(adv.coreColor, [0.87, 1, 1]))
            gl.bindFramebuffer(gl.FRAMEBUFFER, lineTarget.fbo)
            gl.viewport(0, 0, bufW, bufH)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.useProgram(lineProg)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, ptsTex)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, lineTex)
            uL.i1("uPts", 0)
            uL.i1("uLine", 1)
            uL.f1("uPxPerCss", pxPerCss)
            uL.f2("uBuf", bufW, bufH)
            uL.f1("uTime", clock)
            setMapUniforms(uL)
            const swayMs = num(adv.swayMs, DEFAULT_ADVANCED.swayMs, 1000, 30000)
            uL.f3("uSway", num(adv.sway, DEFAULT_ADVANCED.sway, 0, 80) / 1000, (Math.PI * 2 * 1000) / swayMs, 1)
            const hoverAmt = (num(adv.hover, DEFAULT_ADVANCED.hover, 0, 100) / 50) * hover
            uL.f4("uHover", mxEase, myEase, hoverAmt, 0.085)
            const growFront = growDone ? 1e3 : growProgress() * (geom ? geom.maxLen : 1) * 1.04
            const tapAge = realT - tapTime
            const tapFront = tapAge * 0.9
            const tapK = tapAge >= 0 && tapAge < 2.2 ? (1 - tapAge / 2.2) * glowK : 0
            uL.f4("uGrow", growFront, growDone ? 0 : 1, tapFront, tapK)
            uL.f4(
                "uPulse",
                num(adv.pulseMs, DEFAULT_ADVANCED.pulseMs, 500, 20000) / 1000,
                num(adv.pulseWidth, DEFAULT_ADVANCED.pulseWidth, 1, 60) / 100,
                num(adv.pulseBoost, DEFAULT_ADVANCED.pulseBoost, 0, 400) / 100,
                glowK
            )
            uL.f4(
                "uLook",
                num(adv.tipFade, DEFAULT_ADVANCED.tipFade, 0, 100) / 100,
                num(adv.leadShare, DEFAULT_ADVANCED.leadShare, 0, 50) / 100,
                num(adv.leadBoost, DEFAULT_ADVANCED.leadBoost, 100, 500) / 100,
                num(adv.minOpacity, DEFAULT_ADVANCED.minOpacity, 0, 100) / 100
            )
            // Strand light is tuned at 1100 strands; fewer strands each carry
            // a little more so the burst keeps its weight.
            const nK = Math.pow(1100 / (geom ? geom.n : 1100), 0.35)
            uL.f2(
                "uWidth",
                num(adv.lineWidth, DEFAULT_ADVANCED.lineWidth, 20, 400) / 100,
                (num(adv.lineGain, DEFAULT_ADVANCED.lineGain, 10, 400) / 100) * 0.16 * nK * (floatOK ? 1 : 0.5)
            )
            uL.f3("uAccent", accent[0], accent[1], accent[2])
            uL.f3("uBase", base[0], base[1], base[2])
            uL.f3("uMid", mid[0], mid[1], mid[2])
            uL.f3("uDeep", deep[0], deep[1], deep[2])
            uL.f3("uSlate", slate[0], slate[1], slate[2])
            uL.f3("uCore", coreC[0], coreC[1], coreC[2])
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE)
            gl.bindVertexArray(null)
            if (geom) gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, PTS * 2, geom.n)
            gl.disable(gl.BLEND)

            // composite
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            gl.viewport(0, 0, bufW, bufH)
            gl.useProgram(compProg)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, lineTarget.tex)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, groundTarget ? groundTarget.tex : null)
            uC.i1("uLines", 0)
            uC.i1("uGround", 1)
            uC.f2("uBuf", bufW, bufH)
            uC.f1("uPxPerCss", pxPerCss)
            setMapUniforms(uC)
            const bg = parseColor(p.background, [0.008, 0.03, 0.04])
            const accS = parseColor(p.accentColor, [0.12, 0.72, 0.66])
            uC.f3("uBg", bg[0], bg[1], bg[2])
            uC.f3("uAccentS", accS[0], accS[1], accS[2])
            uC.f3("uCoreL", coreC[0], coreC[1], coreC[2])
            uC.f3("uAccentL", accent[0], accent[1], accent[2])
            uC.f4(
                "uFx",
                fractal,
                num(adv.fractalGlow, DEFAULT_ADVANCED.fractalGlow, 0, 100) / 100,
                num(adv.grain, DEFAULT_ADVANCED.grain, 0, 100) / 100,
                num(adv.vignette, DEFAULT_ADVANCED.vignette, 0, 100) / 100
            )
            const pulseS = num(adv.pulseMs, DEFAULT_ADVANCED.pulseMs, 500, 20000) / 1000
            const cp = 0.5 - 0.5 * Math.cos((Math.PI * 2 * clock) / pulseS)
            const corePulse = num(adv.corePulse, DEFAULT_ADVANCED.corePulse, 0, 100) / 100
            const coreR = (num(adv.coreSize, DEFAULT_ADVANCED.coreSize, 0, 200) / 1000) * 0.6 * (1 + corePulse * (cp - 0.5))
            let coreGlow = glowK * (1 + 1.5 * tapK)
            if (!growDone) coreGlow *= smooth(0, 0.25, growProgress())
            uC.f4("uCoreP", coreR, coreGlow, 0, 0)
            uC.f1("uFrameT", Math.floor(realT * 24))
            gl.bindVertexArray(vao)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
            gl.bindVertexArray(null)

            if (q && timerExt) {
                gl.endQuery(timerExt.TIME_ELAPSED_EXT)
                queries.push({ q, level: quality })
            }
            drawn++
        }

        const growProgress = () => {
            if (growDone) return 1
            const ent = { ...DEFAULT_ENTRANCE, ...propsRef.current.entrance }
            if (growStart < 0) return 0
            const t = (realT - growStart - num(ent.delay, 0, 0, 10)) / Math.max(0.05, num(ent.duration, 1.8, 0.2, 10))
            const x = Math.min(1, Math.max(0, t))
            return 1 - Math.pow(1 - x, 3)
        }

        const pollQueries = () => {
            if (!gl || !timerExt) return
            const disjoint = gl.getParameter(timerExt.GPU_DISJOINT_EXT)
            while (queries.length) {
                const { q, level } = queries[0]
                if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break
                const ms = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6
                gl.deleteQuery(q)
                queries.shift()
                if (!disjoint && level === quality && warm > 30) gpuEma = gpuEma ? gpuEma * 0.9 + ms * 0.1 : ms
            }
        }

        /** Whether anything on screen is still moving, and how fast it needs drawing. */
        const wantRate = (p: FrondBurstProps): number => {
            const adv = { ...DEFAULT_ADVANCED, ...p.advanced }
            const spd = num(p.speed, DEFAULTS.speed, 0, 100)
            const interacting =
                Math.abs(hover - hoverTarget) > 0.002 ||
                (hover > 0.002 && (Math.abs(mxEase - mxModel) > 1e-4 || Math.abs(myEase - myModel) > 1e-4)) ||
                !growDone ||
                realT - tapTime < 2.3
            if (interacting) return 60
            const animating =
                !reduced &&
                spd > 0 &&
                (num(adv.sway, 26, 0, 80) > 0 ||
                    num(adv.pulseBoost, 120, 0, 400) * num(p.glow, 41, 0, 100) > 0 ||
                    num(adv.corePulse, 41, 0, 100) > 0)
            if (animating) return 30
            if (num(adv.grain, 0, 0, 100) > 0 && !reduced) return 24
            return 0
        }

        const tick = (now: number) => {
            raf = 0
            if (!running) return
            const dtRaw = lastTick < 0 ? 0 : Math.min(0.1, (now - lastTick) / 1000)
            lastTick = now
            lastNow = now
            const p = propsRef.current
            realT += dtRaw
            const spd = num(p.speed, DEFAULTS.speed, 0, 100) / 50
            if (!reduced) clock = (clock + dtRaw * spd) % 36000

            // pointer: one rect read per frame, only when it moved or the page scrolled
            if (ptrMoved) {
                ptrMoved = false
                const r = root.getBoundingClientRect()
                if (r.width > 0 && r.height > 0) {
                    ptrU = (ptrClientX - r.left) / r.width
                    ptrV = (ptrClientY - r.top) / r.height
                    if (W > 0) {
                        const s = Math.min(2, Math.max(1, r.width / W))
                        if (Math.abs(s - shown) / shown > 0.05) {
                            shown = s
                            sizeBuffers()
                        }
                    }
                }
            }
            hoverTarget = ptrInside ? 1 : 0
            updateMap(p)
            const [mx, my] = frameToModel(ptrU * W, ptrV * H)
            mxModel = mx + SOURCE_BACK
            myModel = my
            // Follow, don't trail: ~80 ms to the cursor; the light fades slower.
            const kf = 1 - Math.exp(-dtRaw / 0.05)
            const kh = 1 - Math.exp(-dtRaw / (hoverTarget > hover ? 0.12 : 0.35))
            if (hover < 0.002 && hoverTarget > 0) {
                mxEase = mxModel
                myEase = myModel
            }
            mxEase += (mxModel - mxEase) * kf
            myEase += (myModel - myEase) * kf
            hover += (hoverTarget - hover) * kh
            if (hoverTarget === 0 && hover < 0.002) hover = 0

            if (!growDone) {
                const ent = { ...DEFAULT_ENTRANCE, ...p.entrance }
                if (!ent.animate) growDone = true
                else if (growStart < 0 && visible) growStart = realT
                else if (growProgress() >= 1) growDone = true
            }

            if (!sameProps(p, lastProps)) {
                lastProps = p
                dirty = true
            }
            const rate = wantRate(p)
            const period = rate > 0 ? 1000 / rate : 0
            let doDraw = false
            if (dirty) doDraw = true
            else if (rate > 0 && now >= due - 3) doDraw = true
            if (doDraw) {
                if (rate > 0) {
                    due = Math.max(due + period, now - period)
                    if (due < now) due = now + period
                }
                pollQueries()
                adaptQuality(now, period, dtRaw)
                draw(now)
                dirty = false
                warm++
            }
            if (drawn - measuredAt >= 30) {
                measuredAt = drawn
                if (measureShown()) sizeBuffers()
            }
            if (rate > 0 || dirty) raf = requestAnimationFrame(tick)
            else running = false
        }

        /** Step resolution down when frames run late and the GPU is the cause; win it back later. */
        const adaptQuality = (now: number, period: number, dt: number) => {
            if (period <= 0 || warm < 30) return
            const target = period
            const late = (dt * 1000) / target
            lateEma = lateEma * 0.9 + late * 0.1
            const gpuShare = timerExt ? gpuEma / target : late
            if (lateEma > 1.3 && gpuShare > 0.6) {
                slowFor += dt
                goodFor = 0
            } else {
                slowFor = 0
                goodFor += dt
            }
            if (slowFor > 0.5 && quality < QUALITY_LEVELS.length - 1) {
                quality++
                slowFor = 0
                goodFor = 0
                banUntil = now + 4000
                gpuEma = 0
                sizeBuffers()
            } else if (goodFor > 4 && quality > 0 && now > banUntil && (!timerExt || gpuEma < target * 0.45)) {
                quality--
                goodFor = 0
                gpuEma = 0
                banUntil = now + 8000
                sizeBuffers()
            }
        }

        const wake = () => {
            dirty = true
            if (running || !visible || lost || !gl) return
            running = true
            lastTick = -1
            due = 0
            raf = requestAnimationFrame(tick)
        }
        wakeRef.current = () => {
            if (!sameProps(propsRef.current, lastProps)) wake()
        }

        // ── observers ──
        const ro = new ResizeObserver((entries) => {
            const e = entries[entries.length - 1]
            const cr = e.contentRect
            W = cr.width
            H = cr.height
            measureShown()
            sizeBuffers()
            wake()
        })
        ro.observe(root)
        const io = new IntersectionObserver((entries) => {
            const e = entries[entries.length - 1]
            visible = e.isIntersecting && document.visibilityState !== "hidden"
            if (visible) wake()
        })
        io.observe(root)
        const onVis = () => {
            visible = document.visibilityState !== "hidden"
            if (visible) wake()
        }
        document.addEventListener("visibilitychange", onVis)

        const onLost = (e: Event) => {
            e.preventDefault()
            lost = true
            running = false
            if (raf) cancelAnimationFrame(raf)
            raf = 0
        }
        const onRestored = () => {
            lost = false
            if (initGL()) {
                bufW = 0
                bufH = 0
                sizeBuffers()
                wake()
            }
        }
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        if (initGL()) {
            const r = root.getBoundingClientRect()
            W = root.clientWidth || r.width
            H = root.clientHeight || r.height
            measureShown()
            sizeBuffers()
            wake()
        }

        return () => {
            running = false
            if (raf) cancelAnimationFrame(raf)
            clearTimeout(refineTimer)
            ro.disconnect()
            io.disconnect()
            document.removeEventListener("visibilitychange", onVis)
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            root.removeEventListener("pointerup", onUp)
            root.removeEventListener("pointercancel", onLeave)
            window.removeEventListener("scroll", onScroll, { capture: true })
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            wakeRef.current = () => {}
            if (gl && !gl.isContextLost()) {
                dropTarget(lineTarget)
                dropTarget(groundTarget)
                for (const { q } of queries) gl.deleteQuery(q)
                gl.deleteTexture(ptsTex)
                gl.deleteTexture(lineTex)
                gl.deleteBuffer(quad)
                gl.deleteVertexArray(vao)
                gl.deleteProgram(lineProg)
                gl.deleteProgram(groundProg)
                gl.deleteProgram(compProg)
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
                aspectRatio: `${REF_W} / ${REF_H}`,
                overflow: "hidden",
                background,
                touchAction: "pan-y",
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

// ── property controls ───────────────────────────────────────────────────────
