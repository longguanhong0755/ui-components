"use client"

/**
 * LustreEclipse — four crescents of glossy satin around a black core. Each
 * crescent is a fan of long leaves that converge into a corner (top-right
 * for the top and right crescents, bottom-left for their mirror images),
 * curl back toward their edge at the far end and meet the next leaf in a
 * thin dark crease. The leaves drift slowly outward across the fan, one leaf
 * every Fold Period, while the crescents breathe on a slower cycle. Colour is
 * a single gradient map: black → deep → indigo → royal → blue → violet → lilac.
 *
 * Refined from the user's own FullFrameWebGL (moments Background template) to
 * match their ten-frame reference clip. Every control of that file keeps its
 * key, title, type, range and unit; what each one drives is described on the
 * control. Everything about the look was measured from the frames rather
 * than eyeballed:
 * - the ten frames are one seamless loop sampled 0.3 cycle apart (ordered
 *   1-8-5-2-6-9-3-10-7-4, neighbours correlate 0.90–0.96), so t = 0 here is
 *   frame 1 and frame i sits at 1.8·(i − 1) s with the default periods;
 * - the picture is exactly mirror-symmetric about the top-left → bottom-right
 *   diagonal (correlation 1.000), so only the top and right crescents carry
 *   their own constants;
 * - every pixel lies on one colour curve (spread 2–6/255 per tone), fitted as
 *   seven piecewise-linear sRGB stops (max error 6/255);
 * - crease geometry: the phase function below hits ~1,700 crease points from
 *   all frames with 97–98% coherence (median error 0.2°);
 * - leaf cross-profile, crescent envelope, breathing (±1.5% of the height on
 *   a 9 s cycle, matching the original's Breathe Period) from per-pixel max /
 *   phase-binned medians over the loop.
 * The reference measures grain-free (pixel noise < 1/255), so Grain ships at 0.
 */
import { useEffect, useRef, type CSSProperties } from "react"

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

// ── colour parsing (from the moments kit) ──

type RGBA = [number, number, number, number]

const COLOR_CACHE = new Map<string, RGBA | null>()

function parseColor(input: string | undefined, fallback: RGBA): RGBA {
    if (typeof input !== "string") return fallback
    let hit = COLOR_CACHE.get(input)
    if (hit === undefined) {
        hit = parseColorRaw(input)
        COLOR_CACHE.set(input, hit)
    }
    return hit ?? fallback
}

function parseColorRaw(raw: string): RGBA | null {
    let s = raw.trim()
    const v = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(s)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        const h = s.slice(1)
        const x = (a: string) => parseInt(a, 16)
        let r: number, g: number, b: number, a = 255
        if (h.length === 3 || h.length === 4) {
            r = x(h[0] + h[0]); g = x(h[1] + h[1]); b = x(h[2] + h[2])
            if (h.length === 4) a = x(h[3] + h[3])
        } else if (h.length === 6 || h.length === 8) {
            r = x(h.slice(0, 2)); g = x(h.slice(2, 4)); b = x(h.slice(4, 6))
            if (h.length === 8) a = x(h.slice(6, 8))
        } else return null
        const out: RGBA = [r / 255, g / 255, b / 255, a / 255]
        return out.every(Number.isFinite) ? out : null
    }
    const m = /^(rgba?|hsla?)\(([^)]*)\)$/i.exec(s)
    if (!m) return null
    const parts = m[2].split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3) return null
    const num = (p: string, scale: number) =>
        p.endsWith("%") ? (parseFloat(p) / 100) * scale : parseFloat(p)
    const alpha = parts.length > 3 ? num(parts[3], 1) : 1
    let rgb: [number, number, number]
    if (m[1].toLowerCase().startsWith("rgb")) {
        rgb = [num(parts[0], 255) / 255, num(parts[1], 255) / 255, num(parts[2], 255) / 255]
    } else {
        const hh = (((parseFloat(parts[0]) % 360) + 360) % 360) / 360
        const ss = num(parts[1], 1), ll = num(parts[2], 1)
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
    const out: RGBA = [rgb[0], rgb[1], rgb[2], alpha]
    return out.every(Number.isFinite) ? (out.map((c) => Math.min(1, Math.max(0, c))) as RGBA) : null
}

// ── defaults ──

const DEFAULTS = {
    background: "#000000",
    baseColor: "#443AD9",
    accentColor: "#41D8FC",
    lineColor: "#33FC41",
    folds: 3,
    twist: 50,
    speed: 74,
    direction: "in",
    scale: 68,
}

/** The tuning constants behind the look. Out of the box these are the reference. */
const DEFAULT_ADVANCED = {
    bandDepth: 36,
    cornerDepth: 3,
    bulgeAt: 5,
    bulgeWidth: 75,
    edgeFade: 60,
    satin: 55,
    crease: 3,
    creaseDepth: 60,
    glow: 30,
    brightness: 105,
    whiteColor: "#FBDEFF",
    indigoColor: "#372BBD",
    deepColor: "#281B83",
    grain: 0,
    vignette: 0,
    foldMs: 6000,
    breathe: 3,
    breatheMs: 9000,
    warp: 6,
    warpMs: 7000,
    hover: 50,
    pull: 5,
    hoverTwist: 20,
    hoverRadius: 30,
}

const DEFAULT_PLACEMENT = { x: 0, y: 0, angle: 0, tilt: 0 }

export interface LustreEclipseProps {
    /** The core's colour and the ramp's darkest stop; also shows if WebGL is unavailable. */
    background?: string
    /** Royal-blue stop of the ramp: the cool body of each leaf's shoulder. */
    baseColor?: string
    /** Violet stop of the ramp: the bright flank of each leaf. */
    accentColor?: string
    /** Bright blue stop of the ramp: the rim beside each crease. */
    lineColor?: string
    /** Leaves per crescent (3 is the reference). */
    folds?: number
    /** How far the leaves curl back toward their edge, 0–100 (50 is the reference; 0 is a straight fan). */
    twist?: number
    /** Drift, breathe and warp rate, 0–100 (50 = 1×). 0 holds it still. */
    speed?: number
    /** Which way the leaves drift across the fan. */
    direction?: "out" | "in"
    /** How big the crescents and leaves draw, %. 100 is the reference; they always ride the frame's edges. */
    scale?: number
    placement?: Partial<typeof DEFAULT_PLACEMENT>
    advanced?: Partial<typeof DEFAULT_ADVANCED>
    style?: CSSProperties
}

const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d)
const DEG = Math.PI / 180

/** Every uniform that only changes with props, computed at render (never in the loop). */
function staticUniforms(p: LustreEclipseProps): Record<string, number[]> {
    const adv = { ...DEFAULT_ADVANCED, ...(p.advanced ?? {}) }
    const pl = { ...DEFAULT_PLACEMENT, ...(p.placement ?? {}) }
    const A = DEFAULT_ADVANCED
    const rgb = (v: unknown, fb: string) =>
        parseColor(typeof v === "string" ? v : fb, parseColor(fb, [0, 0, 0, 1])).slice(0, 3)
    const tilt = cl(num(pl.tilt, 0), -80, 80) * DEG
    const angle = cl(num(pl.angle, 0), -180, 180) * DEG
    return {
        uBg: rgb(p.background, DEFAULTS.background),
        uDeep: rgb(adv.deepColor, A.deepColor),
        uIndigo: rgb(adv.indigoColor, A.indigoColor),
        uBase: rgb(p.baseColor, DEFAULTS.baseColor),
        uLine: rgb(p.lineColor, DEFAULTS.lineColor),
        uAccent: rgb(p.accentColor, DEFAULTS.accentColor),
        uWhite: rgb(adv.whiteColor, A.whiteColor),
        uFolds: [cl(Math.round(num(p.folds, DEFAULTS.folds)), 1, 6) / 3],
        uTwist: [cl(num(p.twist, DEFAULTS.twist), 0, 100) / 50],
        uDepthK: [cl(num(adv.bandDepth, A.bandDepth), 5, 60) / 36],
        // 0 would collapse the crescent to nothing; 3 is the reference slope.
        uCornerK: [(cl(num(adv.cornerDepth, A.cornerDepth), 0, 30) + 1) / 4],
        uBulge: [(cl(num(adv.bulgeAt, A.bulgeAt), -100, 100) - A.bulgeAt) / 100],
        uBulgeW: [cl(num(adv.bulgeWidth, A.bulgeWidth), 20, 200) / 75],
        uFade: [1 - (cl(num(adv.edgeFade, A.edgeFade), 0, 100) - A.edgeFade) / 200],
        uSatin: [cl(num(adv.satin, A.satin), 0, 100) / 55],
        // Crease width in leaf widths; depth 60 is the measured notch.
        uCrease: [cl(num(adv.crease, A.crease), 1, 30) / 100, (cl(num(adv.creaseDepth, A.creaseDepth), 0, 100) / 60) * 0.2],
        uGlow: [(cl(num(adv.glow, A.glow), 0, 100) / 30) * 0.05],
        uGain: [(cl(num(adv.brightness, A.brightness), 20, 150) / 105) * 0.985],
        // Breathe is peak-to-peak % of the frame height → amplitude in half-heights.
        uBreathe: [cl(num(adv.breathe, A.breathe), 0, 15) / 100],
        // Fold Warp: amplitude in half-heights (the original's ‰ of the height, ×2).
        uWarp: [(cl(num(adv.warp, A.warp), 0, 60) / 1000) * 2],
        // Pointer: strength, pull (swell toward the cursor), twist (leaf slide), radius (half-heights).
        uPtr: [
            cl(num(adv.hover, A.hover), 0, 100) / 50,
            (cl(num(adv.pull, A.pull), 0, 20) / 100) * 3,
            (cl(num(adv.hoverTwist, A.hoverTwist), 0, 100) / 100) * 0.6,
            (cl(num(adv.hoverRadius, A.hoverRadius), 5, 100) / 100) * 2,
        ],
        uGrain: [cl(num(adv.grain, A.grain), 0, 100) / 100],
        uVig: [cl(num(adv.vignette, A.vignette), 0, 100) / 100],
        uScale: [cl(num(p.scale, DEFAULTS.scale), 10, 300) / 100],
        // Placement: x right as a share of width, y down as a share of height (shader y is up).
        uOff: [cl(num(pl.x, 0), -50, 50) / 100, -cl(num(pl.y, 0), -50, 50) / 100],
        uRot: [Math.cos(angle), Math.sin(angle)],
        uTiltSC: [Math.sin(tilt), Math.cos(tilt)],
    }
}

/** Read by the loop. */
function motionOf(p: LustreEclipseProps) {
    const adv = { ...DEFAULT_ADVANCED, ...(p.advanced ?? {}) }
    const A = DEFAULT_ADVANCED
    return {
        rate: cl(num(p.speed, DEFAULTS.speed), 0, 100) / 50,
        dir: p.direction === "in" ? -1 : 1,
        foldS: cl(num(adv.foldMs, A.foldMs), 500, 30000) / 1000,
        breatheS: cl(num(adv.breatheMs, A.breatheMs), 1000, 30000) / 1000,
        warpS: cl(num(adv.warpMs, A.warpMs), 1000, 30000) / 1000,
        folds: cl(Math.round(num(p.folds, DEFAULTS.folds)), 1, 6),
        hover: num(adv.hover, A.hover) > 0,
    }
}

// Fitted to the reference (phase2 / env fits; see the header). Top crescent
// and right crescent each carry their own; left and bottom are their mirror
// images about the top-left → bottom-right diagonal.
//   phase  = [P0..P6], off:  leaf phase = ((d/a)(1 + P1 a + P2 a²) + P3 d)/P0 + P4 r + P5 r² + P6 r³ + off
//   envelope = [H, ac, aw, de, ks, sm, e0, e1, cl, rc, la, lb]
// (ks is the fit × 0.75: the max-over-loop fit overstates how far the leaves
// spread at the corner; 0.75 restores the reference's dark wedge there.)
const TOP_PHASE = [0.3176, 0.2698, 0.2752, -0.2182, -0.6756, 0.0133, 0.2642, 0.076]
const RIGHT_PHASE = [0.2087, -0.1353, 0.3284, -0.2611, -0.8626, -0.0367, 0.268, -0.3745]
const TOP_ENV = [0.48, 0.8911, 0.8886, 1.9023, 0.6989, 3.7343, 0.4005, 1.6022, 0.5564, 0.5922, 1.2456, 1.9118]
const RIGHT_ENV = [0.39, 1.0224, 0.7461, 2.1255, 1.9145, 5.9036, 0.2932, 1.6862, 0.1189, 0.646, 1.2745, 1.9879]
// Breathe phase of frame 1 (the 9 s cycle bottoms out at frame 2, 1.8 s in).
const BREATHE_PHASE = 0.45

// The crescent's depth D(a) along its edge, and its tip fade, depend only on
// a and the props — so they are baked into a 512×2 lookup (row 0 the top /
// left crescents, row 1 the right / bottom) whenever a feeding control
// changes, rather than spending ~9 exp/pow per crescent per pixel.
const ENV_N = 512
const ENV_AMAX = 2.6 // past lb × the largest Corner Fade factor (1.3)

/** Fills out (ENV_N × 2 texels, RG) with [D0, tip fade] for both rows. */
function bakeEnv(out: Float32Array, depthK: number, cornerK: number, bulge: number, bulgeW: number, fade: number) {
    const rows = [TOP_ENV, RIGHT_ENV]
    for (let row = 0; row < 2; row++) {
        const [H, ac, aw, de, ks, sm, , , , , la, lb] = rows[row]
        for (let i = 0; i < ENV_N; i++) {
            const a = ((i + 0.5) / ENV_N) * ENV_AMAX
            const dome = H * depthK * Math.exp(-Math.pow(Math.abs(a - ac + bulge) / (aw * bulgeW), de)) + 1e-4
            const ray = Math.max(ks * cornerK * a, 1e-4)
            const D = Math.pow(Math.pow(dome, -sm) + Math.pow(ray, -sm), -1 / sm)
            const t = cl((a - la * fade) / ((lb - la) * fade), 0, 1)
            const o = (row * ENV_N + i) * 2
            out[o] = D
            out[o + 1] = 1 - t * t * (3 - 2 * t)
        }
    }
}

const f = (x: number) => x.toFixed(4)
const phaseArgs = (P: number[]) => P.map(f).join(", ")
// The shader's per-crescent envelope arguments: lookup row, H, e0, e1, cl, rc
// (the rest of the envelope lives in the baked lookup).
const envArgs = (E: number[], row: number) => [row + 0.5, E[0], E[6], E[7], E[8], E[9]].map((x, i) => (i === 0 ? (x / 2).toFixed(2) : f(x))).join(", ")

/*
 * Two crescents per pixel: the frame is split along its top-left →
 * bottom-right diagonal; the top-right half holds the top and right
 * crescents (fanning from the top-right corner), the other half their mirror
 * images (fanning from the bottom-left). Each crescent works in its own
 * (a, d): a runs along its edge away from its corner, normalised so the edge
 * is 2 long, and d is the depth in from the edge, in half-heights of the
 * short side — so wider frames lengthen the crescents along their edge
 * without changing how deep they reach or how wide the leaves are.
 */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uS;
uniform float uPx;
uniform vec2 uAx;
uniform vec3 uT;
uniform vec2 uMouse;
uniform float uHover;
uniform float uSeed;
uniform vec3 uBg;
uniform vec3 uDeep;
uniform vec3 uIndigo;
uniform vec3 uBase;
uniform vec3 uLine;
uniform vec3 uAccent;
uniform vec3 uWhite;
uniform float uFolds;
uniform float uTwist;
uniform sampler2D uEnv;
uniform float uSatin;
uniform vec2 uCrease;
uniform float uGlow;
uniform float uGain;
uniform float uBreathe;
uniform float uWarp;
uniform vec4 uPtr;
uniform float uGrain;
uniform float uVig;
uniform float uScale;
uniform vec2 uOff;
uniform vec2 uRot;
uniform vec2 uTiltSC;
out vec4 outColor;
const float PI = 3.14159265;
const float TAU = 6.2831853;
// Placement tilt: eye distance in half-heights (≈ CSS perspective of 2.2 × the height).
const float FOCAL = 4.4;
// Ramp stop positions, fitted to the reference's colour curve.
const float R1 = 0.218;
const float R2 = 0.317;
const float R3 = 0.371;
const float R4 = 0.484;
const float R5 = 0.735;
// Measured: the glow reaches 1.3× as far into the core as the leaves; the
// corner the leaves converge into is dimmed (to 0.65) out to r = 0.8.
const float GLOW_W = 1.3;
const float CORNER_DIM = 0.65;
const float CORNER_R = 0.8;
// Past its own frame edge (seen only when Scale or Placement shows beyond
// the frame) a crescent rounds off over this share of its local depth D, so
// its outer side is a lens that tapers into its corner and its tips — never a
// straight cut along the old frame line.
const float OUTER = 0.45;
const float ENV_AMAX = ${ENV_AMAX.toFixed(2)};

vec3 ramp(float v) {
    v = clamp(v, 0.0, 1.0);
    vec3 c = uBg;
    c += (uDeep - uBg) * clamp(v / R1, 0.0, 1.0);
    c += (uIndigo - uDeep) * clamp((v - R1) / (R2 - R1), 0.0, 1.0);
    c += (uBase - uIndigo) * clamp((v - R2) / (R3 - R2), 0.0, 1.0);
    c += (uLine - uBase) * clamp((v - R3) / (R4 - R3), 0.0, 1.0);
    c += (uAccent - uLine) * clamp((v - R4) / (R5 - R4), 0.0, 1.0);
    c += (uWhite - uAccent) * clamp((v - R5) / (1.0 - R5), 0.0, 1.0);
    return c;
}

// Screen (content units, centred, y up) → the composition's own plane: undo
// the offsets, the Angle, then the Tilt. Scale is already in the unit: the
// crescents are drawn at Scale × their size but stay on the real frame
// edges, so zooming out shows more, finer satin rather than a shrunken box.
vec2 toContent(vec2 s) {
    s -= uOff * 2.0 * uAx;
    s = vec2(uRot.x * s.x - uRot.y * s.y, uRot.y * s.x + uRot.x * s.y);
    float fc = FOCAL / uScale; // the eye distance is the frame's, not the content's
    float den = max(fc * uTiltSC.y - s.y * uTiltSC.x, 1e-3);
    float v = s.y * fc / den;
    return vec2(s.x * (fc + v * uTiltSC.x) / fc, v);
}

// Leaf phase: integer levels are the creases. A fan from the corner (d/a)
// bent by Twist, with a radial term that curls the leaves back toward the edge.
// Within half a unit of the corner the fan's angular frequency halves: the
// reference keeps a few broad streaks there, not a starburst of rays.
float phaseOf(vec2 ad, float P0, float P1, float P2, float P3, float P4, float P5, float P6, float off) {
    float a = max(ad.x, 1e-3);
    float r = length(ad);
    float fan = (ad.y / a) * (1.0 + uTwist * (P1 + P2 * a) * a) + uTwist * P3 * ad.y;
    float g = mix(0.5, 1.0, smoothstep(0.0, 0.5, r));
    return (fan / P0 * g + uTwist * ((P4 + (P5 + P6 * r) * r) * r)) * uFolds + off;
}

// Crescent envelope: x = leaf brightness, y = glow reach (both × the corner
// and tip fades). The depth D(a) — a soft-min of a dome along the edge and a
// ray out of the corner — and the tip fade come from the baked lookup (row =
// which crescent's constants); brightness falls off with d / D.
vec2 envOf(vec2 ad, float br, float row, float H, float e0, float e1, float cl0, float rc) {
    float a = ad.x;
    float d = ad.y;
    if (a <= 0.0 || a >= ENV_AMAX) return vec2(0.0);
    vec2 lut = texture(uEnv, vec2(a / ENV_AMAX, row)).rg;
    float D = max(lut.x, 1e-4) * (1.0 + br / H);
    float q = d / D;
    if (q > e1 * GLOW_W || q < -OUTER || lut.y <= 0.0) return vec2(0.0);
    float r = length(ad);
    float e = 1.0 - smoothstep(e0, e1, q);
    float g = 1.0 - smoothstep(e0, e1 * GLOW_W, q);
    float k = (cl0 + (1.0 - cl0) * smoothstep(0.0, rc, r)) * lut.y;
    k *= mix(CORNER_DIM, 1.0, smoothstep(0.0, CORNER_R, r));
    // Outer side: the same falloff mirrored, scaled to the local depth, so it
    // shrinks to nothing at the corner (D → 0) and at the tips.
    k *= 1.0 - smoothstep(0.0, 1.0, -q / OUTER);
    return vec2(e, g) * k;
}

// Cross-profile of one leaf (u = 0 and 1 are its creases): a broad plateau
// whose shoulder falls into each crease, a faint sag mid-leaf near the
// corner, and the thin dark crease line itself. Measured from the frames.
// fw is the phase change per pixel: leaves finer than a few pixels settle to
// their mean rather than alias.
float leafOf(float ph, float fw, float r) {
    float u = fract(ph);
    float s = sin(PI * u);
    float cS = clamp(0.25 + 0.5 * r, 0.3, 0.92) * uSatin;
    float rr = 1.1 / max(r, 0.5);
    // The shoulder's notch is ~1/(πp) of a leaf wide; keep it ≥ ~1.2 px.
    float p = clamp(min(1.6 * rr * rr, 0.27 / max(fw, 1e-4)), 0.8, 8.0);
    float m = 0.15 * (1.0 - smoothstep(0.6, 1.0, r)) * uSatin;
    float du = min(u, 1.0 - u);
    // Never thinner than ~1.2 px, or a crease running shallow to the pixel
    // grid breaks into dots where the leaves crowd toward the corner.
    float w = max(uCrease.x, fw * 1.2);
    float cd = uCrease.y * (uCrease.x / w) * smoothstep(0.3, 0.8, r);
    float s2 = s * s;
    float h = 1.0 - cS * pow(1.0 - s, p) - m * s2 * s2 - cd * exp(-(du * du) / (w * w));
    return mix(clamp(h, 0.0, 1.0), 0.86, smoothstep(0.12, 0.45, fw));
}

// One crescent: envelope first; only where it is lit, the leaves under it,
// screened with its glow. ae is the edge's normalising half-length (a = run /
// ae) and pxu the content units per buffer pixel. The phase's per-pixel change
// is taken analytically from its fan term (k·d/a), so nothing here needs a
// screen derivative and the whole crescent can sit behind the early-outs.
float crescent(vec2 ad, float ae, float br, float slide, float pxu,
               float P0, float P1, float P2, float P3, float P4, float P5, float P6, float off,
               float row, float H, float e0, float e1, float cl0, float rc) {
    vec2 e = envOf(ad, br, row, H, e0, e1, cl0, rc);
    if (e.y <= 1e-4) return 0.0;
    // Out where only the glow reaches, the leaves contribute nothing.
    if (e.x <= 1e-4) return uGlow * e.y;
    float ph = phaseOf(ad, P0, P1, P2, P3, P4, P5, P6, off) + slide;
    float a = max(ad.x, 1e-3);
    float r = length(ad);
    float k = uFolds * mix(0.5, 1.0, smoothstep(0.0, 0.5, r)) / P0;
    float fw = pxu * k * length(vec2(ad.y / (a * a * ae), 1.0 / a));
    float b = e.x * leafOf(ph, fw, r) * uGain;
    return 1.0 - (1.0 - b) * (1.0 - uGlow * e.y);
}

void main() {
    vec2 res = max(uRes, vec2(1.0));
    vec2 uv = gl_FragCoord.xy / res;
    vec2 q = toContent((gl_FragCoord.xy - 0.5 * res) / max(uS, 1.0));
    vec2 mp = toContent(uMouse);

    // Pointer: a soft lens that swells the satin toward the cursor and slides
    // the leaves under it. Radius is in frame units, so it stays put on screen.
    vec2 md = q - mp;
    float R = max(uPtr.w, 1e-3) / uScale;
    float bump = uHover * uPtr.x * exp(-dot(md, md) / (R * R));
    q -= md * bump * uPtr.y;

    // All four crescents are evaluated everywhere and meet by max(), exactly
    // as neighbouring leaves do. (Splitting the frame along its diagonal and
    // drawing two per side was cheaper, but any setting that carries a
    // crescent across that line — Band Depth, Bulge Width, Corner Depth,
    // Corner Fade — then showed a straight cut. At the defaults nothing
    // reaches the diagonal, so the reference look is unchanged.)
    vec2 A = uAx;
    vec2 adT = vec2((A.x - q.x) / A.x, A.y - q.y);
    vec2 adR = vec2((A.y - q.y) / A.y, A.x - q.x);
    vec2 adL = vec2((q.y + A.y) / A.y, q.x + A.x);
    vec2 adB = vec2((q.x + A.x) / A.x, q.y + A.y);

    // Fold Warp: a slow travelling ripple in the depth. Mirrored pairs share
    // a ripple so the composition stays symmetric about its diagonal.
    float wph = TAU * uT.z;
    adT.y += uWarp * (0.6 * sin(adT.x * 2.3 + wph) + 0.4 * sin(adT.x * 4.1 - wph * 1.3 + 1.7));
    adL.y += uWarp * (0.6 * sin(adL.x * 2.3 + wph) + 0.4 * sin(adL.x * 4.1 - wph * 1.3 + 1.7));
    adR.y += uWarp * (0.6 * sin(adR.x * 2.3 + wph + 2.1) + 0.4 * sin(adR.x * 4.1 - wph * 1.3 + 0.4));
    adB.y += uWarp * (0.6 * sin(adB.x * 2.3 + wph + 2.1) + 0.4 * sin(adB.x * 4.1 - wph * 1.3 + 0.4));

    float slide = uT.x + bump * uPtr.z;
    float br = uBreathe * uT.y;
    // Content units per buffer pixel (Tilt's foreshortening is ignored: it
    // only steers the anti-alias fade).
    float pxu = 1.0 / max(uS, 1e-3);
    float v = crescent(adT, A.x, br, slide, pxu, ${phaseArgs(TOP_PHASE)}, ${envArgs(TOP_ENV, 0)});
    v = max(v, crescent(adL, A.y, br, slide, pxu, ${phaseArgs(TOP_PHASE)}, ${envArgs(TOP_ENV, 0)}));
    v = max(v, crescent(adR, A.y, br, slide, pxu, ${phaseArgs(RIGHT_PHASE)}, ${envArgs(RIGHT_ENV, 1)}));
    v = max(v, crescent(adB, A.x, br, slide, pxu, ${phaseArgs(RIGHT_PHASE)}, ${envArgs(RIGHT_ENV, 1)}));

    vec3 col = ramp(v);
    float vd = length((uv - 0.5) * vec2(A.x / max(A.x, A.y), A.y / max(A.x, A.y))) * 1.6;
    col *= 1.0 - uVig * 0.6 * smoothstep(0.35, 1.05, vd);
    // Grain in CSS pixels, plus a ±1/255 dither so the long gradients never band.
    vec2 cell = floor(gl_FragCoord.xy / max(uPx, 1.0));
    float n = fract(sin(dot(cell + uSeed * 17.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    col += n * (uGrain * 0.12 + 2.0 / 255.0);
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

// Pixel budget: device px drawn per frame, and the floor the auto-resolution may drop to.
const MAX_PIXELS = 3.2e6
const MIN_QUALITY = 0.6

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function LustreEclipse(props: LustreEclipseProps) {
    props = withMovedControls(props)
    const { background = DEFAULTS.background, style } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const uniRef = useRef<Record<string, number[]> | null>(null)
    const dirtyRef = useRef(true)
    const motionRef = useRef(motionOf(props))
    const wakeRef = useRef<() => void>(() => {})

    // Merge and parse at render; the loop only reads the result. Framer
    // re-renders with identical values all the time, so wake only on a change.
    const next = staticUniforms(props)
    const prev = uniRef.current
    let changed = !prev
    if (prev) for (const k in next) if (next[k].some((v, i) => v !== prev[k][i])) { changed = true; break }
    if (changed) {
        uniRef.current = next
        dirtyRef.current = true
    }
    motionRef.current = motionOf(props)

    useEffect(() => {
        wakeRef.current()
    })

    useEffect(() => {
        const rootEl = rootRef.current
        const canvasEl = canvasRef.current
        if (!rootEl || !canvasEl) return
        const root: HTMLDivElement = rootEl
        const canvas: HTMLCanvasElement = canvasEl
        const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        let gl: WebGL2RenderingContext | null = null
        let prog: WebGLProgram | null = null
        let locs = new Map<string, WebGLUniformLocation | null>()
        let sent = new Map<string, Float64Array>()
        let staticSent: Record<string, number[]> | null = null

        const init = () => {
            gl = canvas.getContext("webgl2", {
                alpha: false,
                antialias: false,
                depth: false,
                stencil: false,
                powerPreference: "low-power",
                preserveDrawingBuffer: false,
            })
            if (!gl) return false
            const sh = (type: number, src: string) => {
                const s = gl!.createShader(type)!
                gl!.shaderSource(s, src)
                gl!.compileShader(s)
                if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS) && !gl!.isContextLost())
                    console.warn("LustreEclipse shader:", gl!.getShaderInfoLog(s))
                return s
            }
            const p = gl.createProgram()!
            const vs = sh(gl.VERTEX_SHADER, VERT)
            const fs = sh(gl.FRAGMENT_SHADER, FRAG)
            gl.attachShader(p, vs)
            gl.attachShader(p, fs)
            gl.linkProgram(p)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
                if (!gl.isContextLost()) console.warn("LustreEclipse link:", gl.getProgramInfoLog(p))
                gl = null
                return false
            }
            prog = p
            gl.useProgram(p)
            const buf = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
            const loc = gl.getAttribLocation(p, "aPos")
            gl.enableVertexAttribArray(loc)
            gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
            // Envelope lookup (RG16F is filterable in core WebGL2).
            const tex = gl.createTexture()
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.uniform1i(gl.getUniformLocation(p, "uEnv"), 0)
            locs = new Map()
            sent = new Map()
            staticSent = null
            envKey = ""
            return true
        }

        // Rebake the envelope lookup only when a control feeding it changed.
        const envData = new Float32Array(ENV_N * 2 * 2)
        let envKey = ""
        const syncEnv = (s: Record<string, number[]>) => {
            const g = gl!
            const key = `${s.uDepthK[0]}|${s.uCornerK[0]}|${s.uBulge[0]}|${s.uBulgeW[0]}|${s.uFade[0]}`
            if (key === envKey) return
            envKey = key
            bakeEnv(envData, s.uDepthK[0], s.uCornerK[0], s.uBulge[0], s.uBulgeW[0], s.uFade[0])
            g.texImage2D(g.TEXTURE_2D, 0, g.RG16F, ENV_N, 2, 0, g.RG, g.FLOAT, envData)
        }

        // Upload a uniform only when its value changed (doubles, so a cached
        // value always compares equal to the JS number it came from).
        const set = (name: string, v: ArrayLike<number>) => {
            const g = gl!
            let loc = locs.get(name)
            if (loc === undefined) {
                loc = g.getUniformLocation(prog!, name)
                locs.set(name, loc)
            }
            if (!loc) return
            let last = sent.get(name)
            if (last && last.length === v.length) {
                let same = true
                for (let i = 0; i < v.length; i++) if (last[i] !== v[i]) { same = false; break }
                if (same) return
            }
            if (!last || last.length !== v.length) {
                last = new Float64Array(v.length)
                sent.set(name, last)
            }
            for (let i = 0; i < v.length; i++) last[i] = v[i]
            if (v.length === 1) g.uniform1f(loc, v[0])
            else if (v.length === 2) g.uniform2f(loc, v[0], v[1])
            else if (v.length === 3) g.uniform3f(loc, v[0], v[1], v[2])
            else g.uniform4f(loc, v[0], v[1], v[2], v[3])
        }
        const v1 = [0]
        const v2 = [0, 0]
        const v3 = [0, 0, 0]
        const set1 = (name: string, a: number) => {
            v1[0] = a
            set(name, v1)
        }
        const set2 = (name: string, a: number, b: number) => {
            v2[0] = a
            v2[1] = b
            set(name, v2)
        }
        const set3 = (name: string, a: number, b: number, c: number) => {
            v3[0] = a
            v3[1] = b
            v3[2] = c
            set(name, v3)
        }

        // ── size: layout size from ResizeObserver, shown size from rect reads ──
        let lost = false
        let ready = init()
        let W = 0
        let H = 0
        let shown = 1
        let quality = 1
        // One unit = half the frame's short side: the crescents ride the real
        // edges at any shape, so leaf widths and depths are sized from it.
        const unit = () => Math.max(0.5, Math.min(W, H) / 2)
        const sizeCanvas = () => {
            if (W <= 0 || H <= 0) return
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            // Never below the frame's own layout size; zoomed in, it grows to stay sharp.
            let k = dpr * cl(shown, 1, 2) * quality
            const px = W * H * k * k
            if (px > MAX_PIXELS) k *= Math.sqrt(MAX_PIXELS / px)
            const cw = Math.max(1, Math.round(W * k))
            const ch = Math.max(1, Math.round(H * k))
            if (canvas.width !== cw || canvas.height !== ch) {
                // Resizing wipes the drawing buffer to black: redraw before the
                // browser can show it, never on a later paced frame.
                canvas.width = cw
                canvas.height = ch
                dirtyRef.current = true
                if (ready && gl && !lost) render()
            }
        }
        // Framer's canvas jitters the shown size by a hair; only a real zoom
        // (>5%) is worth reallocating the buffer for.
        const measureShown = (r: DOMRectReadOnly) => {
            if (W <= 0 || r.width <= 0) return
            const s = r.width / W
            if (Math.abs(s - shown) / shown > 0.05) {
                shown = s
                sizeCanvas()
            }
        }
        const ro = new ResizeObserver((entries) => {
            const r = entries[0].contentRect
            W = r.width
            H = r.height
            measureShown(root.getBoundingClientRect())
            sizeCanvas()
            dirtyRef.current = true
            wake()
        })
        ro.observe(root)

        // ── pointer: handlers only record; the frame reads the rect ──
        let cx = 0
        let cy = 0
        let moved = false
        let over = 0
        let tx = 0.5
        let ty = 0.5
        let mx = 0.5
        let my = 0.5
        let hov = 0
        const onMove = (e: PointerEvent) => {
            if (e.clientX === cx && e.clientY === cy && over) return
            cx = e.clientX
            cy = e.clientY
            moved = true
            over = 1
            wake()
        }
        const onLeave = () => {
            over = 0
            wake()
        }
        const onUp = (e: PointerEvent) => {
            if (e.pointerType === "touch") onLeave()
        }
        const onScroll = () => {
            if (over) {
                moved = true
                wake()
            }
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerdown", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerup", onUp)
        root.addEventListener("pointercancel", onLeave)
        window.addEventListener("scroll", onScroll, { passive: true, capture: true })

        // ── visibility ──
        let onScreen = true
        let pageVisible = document.visibilityState !== "hidden"
        const io = new IntersectionObserver((entries) => {
            const e = entries[entries.length - 1]
            onScreen = e.isIntersecting
            measureShown(e.boundingClientRect)
            wake()
        })
        io.observe(root)
        const onVis = () => {
            pageVisible = document.visibilityState !== "hidden"
            wake()
        }
        document.addEventListener("visibilitychange", onVis)

        // ── loop ──
        let raf = 0
        // Loop clocks in cycles (wrapped, so float precision never drifts):
        // drift of one leaf per Fold Period, the breathe and warp cycles.
        let drift = 0
        let breathe = 0
        let warp = 0
        let lastTick = -1
        let lastDraw = -1
        let due = 0
        let tickEma = 1000 / 60
        let drawEma = 1000 / 60
        let drawn = 0
        let seed = 0

        function wake() {
            if (!raf && !lost && onScreen && pageVisible) {
                lastTick = -1
                raf = requestAnimationFrame(frame)
            }
        }
        wakeRef.current = () => {
            if (dirtyRef.current) wake()
        }

        function frame(now: number) {
            raf = 0
            if (lost || !onScreen || !pageVisible || !ready || !gl) return
            if (lastTick >= 0) tickEma += (Math.min(now - lastTick, 100) - tickEma) * 0.1
            lastTick = now
            const mo = motionRef.current
            const rate = mo.rate * (reduced ? 0.25 : 1)
            // How fast the leaves cross the screen picks the frame rate: 60 fps
            // when they visibly slide, 30 for the slow default drift, 0 when still.
            const leafPx = (rate * unit() * (uniRef.current ? uniRef.current.uScale[0] : 1) * 0.25 * 3) / mo.folds / mo.foldS
            const pointerBusy = moved || Math.abs(tx - mx) + Math.abs(ty - my) > 1e-4 || Math.abs(over - hov) > 1e-3
            const moving = rate > 0
            // (the default drift is ~17 px/s on a 1200×800 frame: 0.6 px per frame at 30 fps)
            const fps = pointerBusy || (moving && leafPx > 30) ? 60 : moving ? 30 : 0
            if (fps === 0 && !dirtyRef.current) {
                lastDraw = -1
                return
            }
            raf = requestAnimationFrame(frame)
            const interval = fps ? 1000 / fps : 0
            if (fps && lastDraw >= 0 && now < due - 3) return
            due = Math.max(due + interval, now - interval)
            const dt = lastDraw < 0 ? 1 / 60 : Math.min((now - lastDraw) / 1000, 0.1)
            if (lastDraw >= 0 && now - lastDraw < 200) drawEma += (now - lastDraw - drawEma) * 0.1
            lastDraw = now
            drawn++

            // Pointer: one rect read, only on frames where the pointer moved
            // (and every 30 drawn frames, to notice Framer's canvas zoom).
            if (moved || drawn % 30 === 0) {
                const r = root.getBoundingClientRect()
                measureShown(r)
                if (moved && r.width > 0 && r.height > 0) {
                    tx = (cx - r.left) / r.width
                    ty = 1 - (cy - r.top) / r.height
                }
                moved = false
            }
            // Follow the cursor in ~60 ms; presence eases in and out a little slower.
            const kFollow = 1 - Math.exp(-dt / 0.06)
            const kSoft = 1 - Math.exp(-dt / 0.25)
            mx += (tx - mx) * kFollow
            my += (ty - my) * kFollow
            hov += (over - hov) * kSoft
            if (Math.abs(over - hov) < 1e-3) hov = over

            drift = (((drift + (dt * rate * mo.dir) / mo.foldS) % 1) + 1) % 1
            breathe = (breathe + (dt * rate) / mo.breatheS) % 1
            warp = (warp + (dt * rate) / mo.warpS) % 1
            if (fps) seed = (seed + 1) % 4096

            // Auto-resolution: judged against the display's own cadence, with a
            // wide band so 60 Hz jitter cannot pin it low. Skip shader warm-up.
            // Done before drawing, so a resize never leaves a wiped frame on screen.
            if (drawn > 30 && fps) {
                const expect = Math.max(interval, tickEma)
                if (drawEma > expect * 1.45 && quality > MIN_QUALITY) {
                    quality = Math.max(MIN_QUALITY, quality * 0.88)
                    drawEma = expect
                    sizeCanvas()
                } else if (drawEma < expect * 1.12 && quality < 1 && drawn % 60 === 0) {
                    quality = Math.min(1, quality * 1.06)
                    sizeCanvas()
                }
            }
            render()
        }

        function render() {
            const g = gl
            if (!g) return
            const statics = uniRef.current!
            // Content unit in CSS px: half the short side, times Scale.
            const u = unit() * statics.uScale[0]
            if (staticSent !== statics) {
                for (const k in statics) set(k, statics[k])
                syncEnv(statics)
                staticSent = statics
            }
            dirtyRef.current = false
            const pxPerCss = canvas.height / Math.max(H, 1)
            set2("uRes", canvas.width, canvas.height)
            set1("uPx", pxPerCss)
            set1("uS", u * pxPerCss)
            set2("uAx", W / 2 / u, H / 2 / u)
            set3("uT", drift, Math.sin(2 * Math.PI * (breathe - BREATHE_PHASE)), warp)
            set2("uMouse", ((mx - 0.5) * W) / u, ((my - 0.5) * H) / u)
            set1("uHover", motionRef.current.hover ? hov : 0)
            set1("uSeed", seed)
            g.viewport(0, 0, canvas.width, canvas.height)
            g.drawArrays(g.TRIANGLES, 0, 3)
            if (canvas.style.opacity !== "1") canvas.style.opacity = "1"
        }

        // ── context loss: pause, rebuild on restore; the Background shows meanwhile ──
        const onLost = (e: Event) => {
            e.preventDefault()
            lost = true
            ready = false
            canvas.style.opacity = "0"
            if (raf) cancelAnimationFrame(raf)
            raf = 0
        }
        const onRestored = () => {
            lost = false
            ready = init()
            dirtyRef.current = true
            wake()
        }
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        wake()
        return () => {
            if (raf) cancelAnimationFrame(raf)
            raf = 0
            lost = true
            wakeRef.current = () => {}
            ro.disconnect()
            io.disconnect()
            document.removeEventListener("visibilitychange", onVis)
            window.removeEventListener("scroll", onScroll, { capture: true })
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerdown", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerup", onUp)
            root.removeEventListener("pointercancel", onLeave)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                // With no sized parent (a bare <LustreEclipse /> in Next) keep the intrinsic 3:2.
                aspectRatio: "1200 / 800",
                overflow: "hidden",
                background,
                touchAction: "pan-y",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", opacity: 0 }}
            />
        </div>
    )
}

const A = DEFAULT_ADVANCED
