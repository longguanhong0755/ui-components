"use client"

/**
 * HoneyFold — liquid satin laid in long diagonal sheets, each carrying big
 * lens-shaped swirls ("eyes"): a pale crest, a deep valley round it and a calm
 * middle, with crisp seams where one sheet overlaps the next. The whole cloth
 * drifts and slowly reshapes; the pointer swells the folds under it.
 *
 * Refined from the user's own FullFrameLiquid (moments Background template)
 * to match their yellow reference still. Every control of that file keeps its
 * key, title, type, range and unit. What changed underneath:
 * - eyes are one continuous field (smooth-min over neighbouring cells), so the
 *   box-shaped cell edges the old max() of two cells left are gone;
 * - tone follows the eye's height profile through a linear 3-stop ramp
 *   (measured from the reference: orange → yellow → pale lime), with the
 *   original's lighting kept as a lighter relief term;
 * - seams are antialiased across the band step;
 * - `scale` is now framed so 100% is the reference (the old default 72 is
 *   baked into the band/eye defaults); placement, framing, pointer mapping
 *   and the render loop follow the house rules.
 */
import { useEffect, useRef, type CSSProperties } from "react"

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
    background: "#0057FF",
    baseColor: "#001FFF",
    accentColor: "#FFDF06",
    speed: 50,
    scale: 72,
    warp: 100,
    angle: 45,
    cycle: 0,
    hover: 100,
}

/** The tuning constants behind the look. Out of the box these are the look. */
const DEFAULT_ADVANCED = {
    bandWidth: 50,
    ellipseLength: 120,
    ellipseHeight: 100,
    period: 170,
    stagger: 43,
    tilt: 8,
    point: 20,
    rimWidth: 20,
    relief: 70,
    lightAngle: 135,
    curve: 50,
    driftSpeed: 15,
    driftAngle: 78,
    morph: 50,
    reshape: 50,
    seam: 25,
    seamWidth: 2,
    seamLength: 70,
    fold: 15,
    shadow: 25,
    rim: 60,
    ring: 50,
    fadeMs: 0,
    ways: 3,
    hi2: "#F7D9D9",
    mid2: "#E79D9D",
    deep2: "#DD7677",
    hi3: "#EEDFFE",
    mid3: "#CDA1FE",
    deep3: "#B575FD",
    hoverRadius: 25,
    grain: 0,
    vignette: 0,
}

const DEFAULT_PLACEMENT = { x: 0, y: 0, tilt: 0 }

export interface HoneyFoldProps {
    /** Highlight tone of the first colourway (the crests), and the ground shown if WebGL is unavailable. */
    background?: string
    /** Mid tone of the first colourway: the calm middle of each sheet. */
    baseColor?: string
    /** Deep tone of the first colourway: the valleys round each eye. */
    accentColor?: string
    /** Drift and reshape rate, 0–100 (50 = 1×). 0 holds it still. */
    speed?: number
    /** How big the cloth draws, %. 100 is the reference framing; below it more of the cloth shows. */
    scale?: number
    /** Strength of the slow domain warp that bends the sheets, %. */
    warp?: number
    /** Direction the sheets run, °. Stands in for Placement's Angle. */
    angle?: number
    /** Seconds × 1000 each colourway holds before cutting to the next; 0 keeps the first. */
    cycle?: number
    /** Strength of the pointer's swell, 0–100 % (50 = 1×). 0 turns it off. */
    hover?: number
    placement?: Partial<typeof DEFAULT_PLACEMENT>
    advanced?: Partial<typeof DEFAULT_ADVANCED>
    style?: CSSProperties
}

const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d)
const DEG = Math.PI / 180

/** Every uniform that only changes with props, computed at render (never in the loop). */
function staticUniforms(p: HoneyFoldProps): Record<string, number[]> {
    const adv = { ...DEFAULT_ADVANCED, ...(p.advanced ?? {}) }
    const pl = { ...DEFAULT_PLACEMENT, ...(p.placement ?? {}) }
    const rgb = (v: unknown, fb: string) =>
        parseColor(typeof v === "string" ? v : fb, parseColor(fb, [0, 0, 0, 1])).slice(0, 3)
    const ang = cl(num(p.angle, DEFAULTS.angle), 0, 90) * DEG
    const light = num(adv.lightAngle, DEFAULT_ADVANCED.lightAngle) * DEG
    const drift = num(adv.driftAngle, DEFAULT_ADVANCED.driftAngle) * DEG
    // Drift in design heights per second: the original's "% of the width" on a 3:2 frame.
    const dSpd = (Math.max(0, num(adv.driftSpeed, DEFAULT_ADVANCED.driftSpeed)) / 100) * 1.5
    const tilt = cl(num(pl.tilt, DEFAULT_PLACEMENT.tilt), -60, 60) * DEG
    return {
        uHi1: rgb(p.background, DEFAULTS.background),
        uMid1: rgb(p.baseColor, DEFAULTS.baseColor),
        uDeep1: rgb(p.accentColor, DEFAULTS.accentColor),
        uHi2: rgb(adv.hi2, DEFAULT_ADVANCED.hi2),
        uMid2: rgb(adv.mid2, DEFAULT_ADVANCED.mid2),
        uDeep2: rgb(adv.deep2, DEFAULT_ADVANCED.deep2),
        uHi3: rgb(adv.hi3, DEFAULT_ADVANCED.hi3),
        uMid3: rgb(adv.mid3, DEFAULT_ADVANCED.mid3),
        uDeep3: rgb(adv.deep3, DEFAULT_ADVANCED.deep3),
        uWarp: [cl(num(p.warp, DEFAULTS.warp), 0, 100) / 60],
        uDir: [Math.cos(ang), Math.sin(ang)],
        uCycle: [Math.max(0, num(p.cycle, DEFAULTS.cycle)) / 1000],
        uFade: [Math.max(0, num(adv.fadeMs, DEFAULT_ADVANCED.fadeMs)) / 1000],
        uWays: [cl(Math.round(num(adv.ways, DEFAULT_ADVANCED.ways)), 1, 3)],
        uScale: [cl(num(p.scale, DEFAULTS.scale), 10, 300) / 100],
        uBand: [Math.max(10, num(adv.bandWidth, DEFAULT_ADVANCED.bandWidth)) / 100],
        uLen: [Math.max(20, num(adv.ellipseLength, DEFAULT_ADVANCED.ellipseLength)) / 200],
        uTall: [cl(num(adv.ellipseHeight, DEFAULT_ADVANCED.ellipseHeight), 20, 100) / 200],
        uPeriod: [Math.max(40, num(adv.period, DEFAULT_ADVANCED.period)) / 100],
        uStagger: [num(adv.stagger, DEFAULT_ADVANCED.stagger) / 100],
        uTilt: [num(adv.tilt, DEFAULT_ADVANCED.tilt) / 100],
        uPoint: [cl(num(adv.point, DEFAULT_ADVANCED.point), 0, 70) / 100],
        uRimW: [cl(num(adv.rimWidth, DEFAULT_ADVANCED.rimWidth), 5, 80) / 100],
        uRelief: [Math.max(0, num(adv.relief, DEFAULT_ADVANCED.relief)) / 50],
        uLight: [Math.cos(light), Math.sin(light)],
        uCurve: [num(adv.curve, DEFAULT_ADVANCED.curve) / 50],
        uDrift: [dSpd * Math.cos(drift), -dSpd * Math.sin(drift)],
        uMorph: [Math.max(0, num(adv.morph, DEFAULT_ADVANCED.morph)) / 100],
        uMorphAmt: [Math.max(0, num(adv.reshape, DEFAULT_ADVANCED.reshape)) / 50],
        uSeam: [Math.max(0, num(adv.seam, DEFAULT_ADVANCED.seam)) / 60],
        uSeamW: [cl(num(adv.seamWidth, DEFAULT_ADVANCED.seamWidth), 0.5, 10)],
        uSeamLen: [cl(num(adv.seamLength, DEFAULT_ADVANCED.seamLength), 0, 100) / 100],
        uFold: [Math.max(0, num(adv.fold, DEFAULT_ADVANCED.fold)) / 50],
        uShadow: [Math.max(0, num(adv.shadow, DEFAULT_ADVANCED.shadow)) / 50],
        uRim: [Math.max(0, num(adv.rim, DEFAULT_ADVANCED.rim)) / 70],
        uRing: [Math.max(0, num(adv.ring, DEFAULT_ADVANCED.ring)) / 60],
        // Hover radius: % of the original's frame width → design heights.
        uHoverR: [(Math.max(1, num(adv.hoverRadius, DEFAULT_ADVANCED.hoverRadius)) / 100) * 1.5],
        uHoverK: [cl(num(p.hover, DEFAULTS.hover), 0, 100) / 50],
        uGrain: [cl(num(adv.grain, DEFAULT_ADVANCED.grain), 0, 100) / 100],
        uVig: [cl(num(adv.vignette, DEFAULT_ADVANCED.vignette), 0, 100) / 100],
        // Placement: x right as a share of width, y down as a share of height (shader y is up).
        uOff: [cl(num(pl.x, DEFAULT_PLACEMENT.x), -50, 50) / 100, -cl(num(pl.y, DEFAULT_PLACEMENT.y), -50, 50) / 100],
        uTiltSC: [Math.sin(tilt), Math.cos(tilt)],
    }
}

/** Read by the loop: clock rate, drift speed (design heights / s), hover on. */
function motionOf(p: HoneyFoldProps) {
    const adv = { ...DEFAULT_ADVANCED, ...(p.advanced ?? {}) }
    const scale = cl(num(p.scale, DEFAULTS.scale), 10, 300) / 100
    return {
        rate: cl(num(p.speed, DEFAULTS.speed), 0, 100) / 50,
        drift: ((Math.max(0, num(adv.driftSpeed, DEFAULT_ADVANCED.driftSpeed)) / 100) * 1.5) * scale,
        morph: Math.max(0, num(adv.morph, DEFAULT_ADVANCED.morph)) * Math.max(0, num(adv.reshape, DEFAULT_ADVANCED.reshape)),
        hover: num(p.hover, DEFAULTS.hover) > 0,
    }
}

/*
 * Liquid satin (the original's model, refined against the reference still):
 * straight diagonal sheets (bands) that breathe under a slow sine warp. Each
 * sheet carries a chain of long lens-shaped eyes; the sheets are offset along
 * their length, so the field steps at every seam, as if one sheet overlapped
 * the next. Tone is the eye's height profile — calm middle, pale crest at the
 * rim, deep valley just outside — through one linear 3-stop ramp, plus a
 * lighter relief term from the original's light. The domain drifts at the
 * measured heading (78°, 15% of the width per second).
 */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uS;
uniform float uPx;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform float uSeed;
uniform vec3 uHi1;
uniform vec3 uMid1;
uniform vec3 uDeep1;
uniform vec3 uHi2;
uniform vec3 uMid2;
uniform vec3 uDeep2;
uniform vec3 uHi3;
uniform vec3 uMid3;
uniform vec3 uDeep3;
uniform float uWarp;
uniform vec2 uDir;
uniform float uCycle;
uniform float uFade;
uniform float uWays;
uniform float uScale;
uniform float uBand;
uniform float uLen;
uniform float uTall;
uniform float uPeriod;
uniform float uStagger;
uniform float uTilt;
uniform float uPoint;
uniform float uRimW;
uniform float uRelief;
uniform vec2 uLight;
uniform float uCurve;
uniform vec2 uDrift;
uniform float uMorph;
uniform float uMorphAmt;
uniform float uSeam;
uniform float uSeamW;
uniform float uSeamLen;
uniform float uFold;
uniform float uShadow;
uniform float uRim;
uniform float uRing;
uniform float uHoverR;
uniform float uHoverK;
uniform float uGrain;
uniform float uVig;
uniform vec2 uOff;
uniform vec2 uTiltSC;
out vec4 outColor;
// Placement tilt: eye distance in frame heights (≈ CSS perspective of 2.2 × height).
const float FOCAL = 2.2;
// Blend width of the smooth-min between neighbouring eyes, in eye radii.
const float EYE_K = 0.35;
// The reference's calm areas sit a little above the ramp's middle stop.
const float BASE_TONE = 0.58;

float h11(float n) { return fract(sin(n * 127.1 + 11.7) * 43758.5453); }
float bell(float x) { return exp(-x * x); }

vec3 ramp(float s, vec3 hi, vec3 mid, vec3 deep) {
    s = clamp(s, 0.0, 1.0);
    return s < 0.5 ? mix(deep, mid, s * 2.0) : mix(mid, hi, s * 2.0 - 1.0);
}
vec3 way(float i, float s) {
    if (i < 0.5) return ramp(s, uHi1, uMid1, uDeep1);
    if (i < 1.5) return ramp(s, uHi2, uMid2, uDeep2);
    return ramp(s, uHi3, uMid3, uDeep3);
}
float seamMask(float a, float bi, float tm) {
    return smoothstep(-0.6, 0.2, sin(a * 1.15 + bi * 2.3 + 0.35 * tm) + (uSeamLen - 0.5) * 2.0);
}

// Screen (design heights, centred, y up) → the cloth's own plane: undo the
// offsets, then the perspective tilt.
vec2 toPlane(vec2 s) {
    s -= uOff * uRes / max(uS, 1.0);
    float d = max(FOCAL * uTiltSC.y - s.y * uTiltSC.x, 1e-3);
    float v = s.y * FOCAL / d;
    return vec2(s.x * (FOCAL + v * uTiltSC.x) / FOCAL, v);
}

// Elliptic distance to the nearest eye of band bi (1 = on the crest), as a
// smooth min over three neighbouring cells so the field never steps inside a band.
float eyeD(float a, float vv, float bi, float tm) {
    float bw = uBand;
    float P = uPeriod;
    float shift = bi * uStagger + h11(bi) * 0.25 + 0.06 * uMorphAmt * sin(tm * 0.6 + bi * 1.3);
    float f = fract(a / P + shift) - 0.5;
    float Lx = uLen * (1.0 + 0.12 * uMorphAmt * sin(tm * 0.8 + bi * 2.1));
    float Ly = uTall * bw * (1.0 + 0.10 * uMorphAmt * sin(tm * 0.7 + bi * 0.9 + 1.0));
    float cy = (vv - 0.5 - 0.06 * uMorphAmt * sin(tm * 0.5 + bi * 1.7)) * bw;
    float d = 1e3;
    for (int j = -1; j <= 1; j++) {
        vec2 e = vec2((f - float(j)) * P / Lx, cy / Ly);
        e.y += uTilt * e.x;
        e.y /= 1.0 - uPoint * min(e.x * e.x, 1.0);
        float dj = length(e);
        float h = clamp(0.5 + 0.5 * (d - dj) / EYE_K, 0.0, 1.0);
        d = mix(d, dj, h) - EYE_K * h * (1.0 - h);
    }
    return d;
}

// Height profile of an eye: (crest at d = 1, valley just outside it, the
// inner rise from the eye's calm middle up to its crest).
vec3 eyeShape(float d) {
    float w = uRimW;
    return vec3(bell((d - 1.0) / w), bell((d - 1.0 - 1.5 * w) / (1.2 * w)), smoothstep(0.15, 1.0, d) * (1.0 - smoothstep(1.0, 1.0 + w, d)));
}

// Tone of a sheet: eye profile, a broad slow swell of light across the
// cloth (the reference is never flat between eyes), fold shade and seam shadow.
float sheetTone(vec3 cv, float a, float v, float bi, float tm) {
    float s = BASE_TONE + uRing * 0.34 * cv.x - uRim * 0.5 * cv.y + uRing * 0.08 * cv.z;
    s += 0.1 * sin(a * 1.7 + bi * 2.6 + 0.4 * tm) * (1.0 - cv.x);
    s += uFold * 0.12 * (0.5 - v);
    s -= uShadow * 0.2 * smoothstep(0.82, 1.0, v) * mix(0.35, 1.0, seamMask(a, bi + 1.0, tm));
    return s;
}

float toneAt(float a, float v, float bi, float tm) {
    vec3 cv = eyeShape(eyeD(a, v, bi, tm));
    return sheetTone(cv, a, v, bi, tm);
}

void main() {
    vec2 res = max(uRes, vec2(1.0));
    vec2 uv = gl_FragCoord.xy / res;
    float t = uTime;
    float tm = t * uMorph;

    vec2 q = toPlane((gl_FragCoord.xy - 0.5 * res) / max(uS, 1.0));
    vec2 mp = toPlane(uMouse);

    // Pointer: a soft lens that swells the folds under it.
    vec2 md = q - mp;
    float r = max(uHoverR, 1e-3);
    float bump = uHover * uHoverK * exp(-dot(md, md) / (r * r));
    q -= md * bump * 0.3;

    vec2 p = q / max(uScale, 0.05) - uDrift * t;

    // Gentle sine domain warp: the sheets stay near-straight diagonals but breathe.
    float w = uWarp * (1.0 + bump * 0.8);
    p.x += w * 0.05 * sin(1.3 * p.y + 0.9 * tm + 0.4);
    p.y += w * 0.04 * sin(1.6 * p.x - 0.7 * tm + 1.9);
    p += w * 0.02 * vec2(sin(2.7 * p.y - 1.1 * tm), cos(2.3 * p.x + 0.8 * tm));

    // Band frame: a along the diagonal, b across it.
    vec2 nrm = vec2(-uDir.y, uDir.x);
    float a = dot(p, uDir);
    float b = dot(p, nrm);
    b += uCurve * (0.035 * sin(a * 1.9 + 0.5 * tm) + 0.018 * sin(a * 3.7 - 0.3 * tm + 1.0));
    float bs = b / uBand;
    float bi = floor(bs);
    float v = fract(bs);
    float fw = max(fwidth(bs), 1e-5);

    vec3 cv = eyeShape(eyeD(a, v, bi, tm));
    float s = sheetTone(cv, a, v, bi, tm);

    // Relief: the original's light across the eye's height field. The height
    // is smooth inside a band; on quads that straddle a seam it is not, so
    // those pixels take no relief rather than a spike.
    float hgt = cv.x - 0.6 * cv.y;
    vec2 gh = vec2(dFdx(hgt), dFdy(hgt)) * uS;
    float inBand = fwidth(bi) > 0.0 ? 0.0 : 1.0;
    float slope = dot(gh, uLight) * 0.15 * uRelief * inBand;
    s += 0.2 * slope / sqrt(1.0 + slope * slope);

    // Antialias the seam: within half a pixel of a band edge, blend in the
    // neighbouring sheet's tone by its coverage.
    float dLo = v / fw;
    float dHi = (1.0 - v) / fw;
    if (min(dLo, dHi) < 0.5) {
        float nb = dLo < dHi ? bi - 1.0 : bi + 1.0;
        float nv = dLo < dHi ? v + 1.0 : v - 1.0;
        float sOther = toneAt(a, clamp(nv, 0.0, 1.0), nb, tm);
        s = mix(s, sOther, 0.5 - min(dLo, dHi));
    }

    // The crisp bright seam on each sheet's edge.
    float line = 1.0 - smoothstep(uSeamW * 0.5 * uPx, uSeamW * 0.5 * uPx + 1.0, dLo);
    s += uSeam * (0.35 * line + 0.08 * exp(-dLo / (uSeamW * uPx * 4.0 + 1.0))) * seamMask(a, bi, tm);

    // Colourways: hard cuts every uCycle seconds (optional crossfade).
    vec3 col = way(0.0, s);
    if (uCycle > 0.01 && uWays > 1.5) {
        float ph = t / uCycle;
        float k = floor(ph);
        float i0 = k - uWays * floor(k / uWays);
        float i1 = i0 + 1.0 >= uWays - 0.5 ? 0.0 : i0 + 1.0;
        float f = uFade > 0.001 ? smoothstep(uCycle - uFade, uCycle, fract(ph) * uCycle) : 0.0;
        col = mix(way(i0, s), way(i1, s), f);
    }

    col += bump * 0.05;
    float vd = length((uv - 0.5) * vec2(res.x / res.y / max(res.x / res.y, 1.0), 1.0)) * 1.25;
    col *= 1.0 - uVig * 0.55 * smoothstep(0.25, 0.85, vd);
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
const MAX_PIXELS = 2.6e6
const MIN_QUALITY = 0.6

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function HoneyFold(props: HoneyFoldProps) {
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
        let sent = new Map<string, number[]>()
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
                    console.warn("HoneyFold shader:", gl!.getShaderInfoLog(s))
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
                if (!gl.isContextLost()) console.warn("HoneyFold link:", gl.getProgramInfoLog(p))
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
            locs = new Map()
            sent = new Map()
            staticSent = null
            return true
        }

        // Upload a uniform only when its value changed.
        const set = (name: string, v: number[]) => {
            const g = gl!
            let loc = locs.get(name)
            if (loc === undefined) {
                loc = g.getUniformLocation(prog!, name)
                locs.set(name, loc)
            }
            if (!loc) return
            let last = sent.get(name)
            if (last && last.length === v.length && last.every((x, i) => x === v[i])) return
            if (!last || last.length !== v.length) {
                last = v.slice()
                sent.set(name, last)
            } else for (let i = 0; i < v.length; i++) last[i] = v[i]
            if (v.length === 1) g.uniform1f(loc, v[0])
            else if (v.length === 2) g.uniform2f(loc, v[0], v[1])
            else g.uniform3f(loc, v[0], v[1], v[2])
        }
        const v1 = [0]
        const v2 = [0, 0]
        const set1 = (name: string, a: number) => {
            v1[0] = a
            set(name, v1)
        }
        const set2 = (name: string, a: number, b: number) => {
            v2[0] = a
            v2[1] = b
            set(name, v2)
        }

        // ── size: layout size from ResizeObserver, shown size from rect reads ──
        let lost = false
        let ready = init()
        let W = 0
        let H = 0
        let shown = 1
        let quality = 1
        // Design-frame height in CSS px: the frame's height, or its width × 2/3
        // when it is narrower than 1200×800, so the composition never crops sideways.
        const designS = () => Math.max(1, Math.min(H, (W * 800) / 1200))
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
                // browser can show it, never on a later paced frame (that gap
                // was the blink).
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
        let clock = 0
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
            const S = designS()
            // Drift speed on screen picks the frame rate: 60 fps while the
            // cloth visibly slides, 30 for a slow reshape alone, 0 when still.
            const driftPx = rate * mo.drift * S
            const pointerBusy = moved || Math.abs(tx - mx) + Math.abs(ty - my) > 1e-4 || Math.abs(over - hov) > 1e-3
            const moving = rate > 0 && (driftPx > 0.5 || mo.morph > 0)
            const fps = pointerBusy || driftPx > 12 ? 60 : moving ? 30 : 0
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
            const kSoft = 1 - Math.exp(-dt / 0.2)
            mx += (tx - mx) * kFollow
            my += (ty - my) * kFollow
            hov += (over - hov) * kSoft
            if (Math.abs(over - hov) < 1e-3) hov = over

            // ponytail: the clock wraps once an hour (one visible step), as the original's did; float precision needs it
            clock = (clock + dt * rate) % 3600
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
            const S = designS()
            const statics = uniRef.current!
            if (staticSent !== statics) {
                for (const k in statics) set(k, statics[k])
                staticSent = statics
            }
            dirtyRef.current = false
            set2("uRes", canvas.width, canvas.height)
            set1("uPx", canvas.height / Math.max(H, 1))
            set1("uS", (canvas.height * S) / Math.max(H, 1))
            set1("uTime", clock)
            set2("uMouse", ((mx - 0.5) * W) / S, ((my - 0.5) * H) / S)
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
                // With no sized parent (a bare <HoneyFold /> in Next) keep the intrinsic 3:2.
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
