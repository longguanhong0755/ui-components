"use client"

/**
 * TidalSheen — glossy blue satin laid in folds along a long spindle, turning
 * slowly so every fold slides across its own length.
 *
 * Refined from the user's own FullFrameSatin (moments Background template).
 * Every control of that file keeps its key, title, type, range and unit;
 * `scale` drove fold width rather than size, so it is retitled "Fold Size"
 * and a real `Scale` (key `zoom`) sits beside it. The fold geometry is the
 * original's; the shading is new: per-pixel normals across *and* along each
 * fold, a cyan key with a royal fill from the opposite side, a broad satin
 * sheen plus a tight clear-coat glint, soft cavity shadow in the creases
 * deepening toward the spindle's sides, and film grain in CSS pixels.
 *
 * Laid out on a fixed 1200×800 design frame, as GelPebble is: framed on the
 * frame's height, or on its width when the frame is narrower than 3:2, so a
 * frame of any shape shows the same composition (wider or taller frames show
 * more cloth around it). Geometry defaults were fitted to the reference's
 * crease lines at 3:2.
 *
 * Pointer (the Response group): the cloth dents under the cursor and is
 * dragged along with it, the key light leans toward it so the gloss sweeps
 * over the folds, a small light rides with it, and a tap or quick sweep sends
 * a ripple out through the satin.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
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
    background: "#00FF3C",
    baseColor: "#E6FF0A",
    accentColor: "#4900FF",
    speed: 11,
    scale: 53,
    zoom: 90,
    curve: 100,
    sheen: 100,
    angle: 154,
}

/** The tuning constants behind the look. Out of the box these are the look. */
const DEFAULT_ADVANCED = {
    folds: 14,
    radius: 170,
    lens: 105,
    pinch: 20,
    bow: 5,
    spin: 8,
    offset: 52,
    wobble: 60,
    peak: 65,
    depth: 80,
    bulge: 60,
    light: 40,
    ambient: 10,
    diffuse: 105,
    shine: 20,
    spec: 80,
    rim: 20,
    crease: 3,
    edge: 70,
    field: 92,
    fieldCenter: 0,
    royal: 100,
    deepColor: "#064574",
    steelColor: "#0870A8",
    midColor: "#0A86C6",
    hover: 50,
    grain: 16,
    vignette: 12,
}

const DEFAULT_PLACEMENT = { x: 0, y: 0, tilt: 0 }

/** Pointer response, each 0–10. Advanced › Hover scales all of them at once. */
const DEFAULT_RESPONSE = { reach: 5, strength: 5, ripple: 5, glint: 5 }

export interface TidalSheenProps {
    /** Ground shown in the creases, and alone if WebGL is unavailable. */
    background?: string
    /** The royal blue washed over the flanks that face away from the key light. */
    baseColor?: string
    /** The cyan of the key light, the crests and the glints. */
    accentColor?: string
    /** Turn rate of the spindle, 0–100 (50 = the original's 1×). */
    speed?: number
    /** Fold width, % (was titled "Scale"; it widens the folds, it does not zoom). */
    scale?: number
    /** How big the fabric draws in its frame, %. Below 100 more of the spindle shows. */
    zoom?: number
    /** 0 = straight parallel folds, 100 = folds bowed round the spindle. */
    curve?: number
    /** Strength of the gloss, rim lines and glints, %. */
    sheen?: number
    /** Direction of the spindle in the picture plane, °. Stands in for Placement's Angle. */
    angle?: number
    placement?: Partial<typeof DEFAULT_PLACEMENT>
    /** How the cloth answers the pointer: dent reach and strength, tap ripples, the following light. */
    response?: Partial<typeof DEFAULT_RESPONSE>
    advanced?: Partial<typeof DEFAULT_ADVANCED>
    style?: CSSProperties
}

const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d)
const DEG = Math.PI / 180

/** Every uniform that only changes with props, computed at render (never in the loop). */
function staticUniforms(p: TidalSheenProps): Record<string, number[]> {
    const adv = { ...DEFAULT_ADVANCED, ...(p.advanced ?? {}) }
    const pl = { ...DEFAULT_PLACEMENT, ...(p.placement ?? {}) }
    const rs = { ...DEFAULT_RESPONSE, ...(p.response ?? {}) }
    const reach = cl(num(rs.reach, DEFAULT_RESPONSE.reach), 0, 10)
    const rgb = (v: unknown, fb: RGBA) => parseColor(typeof v === "string" ? v : undefined, fb).slice(0, 3)
    const ang = cl(num(p.angle, DEFAULTS.angle), 0, 180) * DEG
    const tilt = cl(num(pl.tilt, DEFAULT_PLACEMENT.tilt), -60, 60) * DEG
    const foldSize = cl(num(p.scale, DEFAULTS.scale), 10, 300) / 100
    return {
        uBg: rgb(p.background ?? DEFAULTS.background, [0.008, 0.118, 0.208, 1]),
        uBase: rgb(p.baseColor ?? DEFAULTS.baseColor, [0.039, 0.4, 1, 1]),
        uAccent: rgb(p.accentColor ?? DEFAULTS.accentColor, [0.039, 0.659, 0.941, 1]),
        uDeep: rgb(adv.deepColor, [0.024, 0.271, 0.455, 1]),
        uSteel: rgb(adv.steelColor, [0.031, 0.439, 0.659, 1]),
        uMid: rgb(adv.midColor, [0.039, 0.525, 0.776, 1]),
        uCurve: [cl(num(p.curve, DEFAULTS.curve), 0, 100) / 100],
        uSheen: [cl(num(p.sheen, DEFAULTS.sheen), 0, 100) / 60],
        // along = (cos, -sin), across = (sin, cos), as the original built them from uAngle.
        uAxis: [Math.cos(ang), -Math.sin(ang), Math.sin(ang), Math.cos(ang)],
        uN: [cl(num(adv.folds, DEFAULT_ADVANCED.folds), 2, 60) / Math.PI / Math.max(foldSize, 0.05)],
        uRadius: [cl(num(adv.radius, DEFAULT_ADVANCED.radius), 50, 400) / 100],
        uLens: [cl(num(adv.lens, DEFAULT_ADVANCED.lens), 50, 400) / 100],
        uPinch: [cl(num(adv.pinch, DEFAULT_ADVANCED.pinch), 5, 100) / 100],
        uBow: [cl(num(adv.bow, DEFAULT_ADVANCED.bow), -50, 50) / 100],
        uOffset: [cl(num(adv.offset, DEFAULT_ADVANCED.offset), 0, 100) / 100],
        uWobble: [cl(num(adv.wobble, DEFAULT_ADVANCED.wobble), 0, 100) / 100],
        uPeak: [cl(num(adv.peak, DEFAULT_ADVANCED.peak), 20, 92) / 100],
        uDepth: [cl(num(adv.depth, DEFAULT_ADVANCED.depth), 0, 200) / 100],
        uLight: [cl(num(adv.light, DEFAULT_ADVANCED.light), -85, 85) * DEG],
        uAmb: [cl(num(adv.ambient, DEFAULT_ADVANCED.ambient), 0, 100) / 100],
        uDiff: [cl(num(adv.diffuse, DEFAULT_ADVANCED.diffuse), 0, 200) / 100],
        uShine: [cl(num(adv.shine, DEFAULT_ADVANCED.shine), 1, 256)],
        uSpec: [cl(num(adv.spec, DEFAULT_ADVANCED.spec), 0, 200) / 100],
        uRim: [cl(num(adv.rim, DEFAULT_ADVANCED.rim), 0, 200) / 100],
        uCrease: [cl(num(adv.crease, DEFAULT_ADVANCED.crease), 1, 40) / 100],
        uEdge: [cl(num(adv.edge, DEFAULT_ADVANCED.edge), 0, 100) / 100],
        uField: [cl(num(adv.field, DEFAULT_ADVANCED.field), 0, 100) / 100],
        uFieldC: [cl(num(adv.fieldCenter, DEFAULT_ADVANCED.fieldCenter), -100, 100) / 100],
        uRoyal: [cl(num(adv.royal, DEFAULT_ADVANCED.royal), 0, 100) / 100],
        uHoverK: [cl(num(adv.hover, DEFAULT_ADVANCED.hover), 0, 100) / 50],
        uGrain: [cl(num(adv.grain, DEFAULT_ADVANCED.grain), 0, 100) / 100],
        uVig: [cl(num(adv.vignette, DEFAULT_ADVANCED.vignette), 0, 100) / 100],
        uZoom: [cl(num(p.zoom, DEFAULTS.zoom), 50, 100) / 100],
        uBulge: [cl(num(adv.bulge, DEFAULT_ADVANCED.bulge), 0, 150) / 100],
        // Placement: x right as a share of width, y down as a share of height (shader y is up).
        uOff: [cl(num(pl.x, DEFAULT_PLACEMENT.x), -50, 50) / 100, -cl(num(pl.y, DEFAULT_PLACEMENT.y), -50, 50) / 100],
        uTiltSC: [Math.sin(tilt), Math.cos(tilt)],
        // Dent falloff exp(-d² · k): the original's k = 9 at Reach 5, wider as Reach grows.
        uReach: [9 * (5 / Math.max(reach, 0.5)) ** 2],
        uDent: [cl(num(rs.strength, DEFAULT_RESPONSE.strength), 0, 10) / 5],
        uGlint: [cl(num(rs.glint, DEFAULT_RESPONSE.glint), 0, 10) / 5],
    }
}

/** Not uniforms, but read by the loop: turn rate (rad per clock second) and fold reach. */
function motionOf(p: TidalSheenProps) {
    const adv = { ...DEFAULT_ADVANCED, ...(p.advanced ?? {}) }
    const rs = { ...DEFAULT_RESPONSE, ...(p.response ?? {}) }
    const hk = cl(num(adv.hover, DEFAULT_ADVANCED.hover), 0, 100) / 50
    return {
        ripple: (cl(num(rs.ripple, DEFAULT_RESPONSE.ripple), 0, 10) / 5) * hk,
        glint: (cl(num(rs.glint, DEFAULT_RESPONSE.glint), 0, 10) / 5) * hk,
        rate: (cl(num(p.speed, DEFAULTS.speed), 0, 100) / 50) * cl(num(adv.spin, DEFAULT_ADVANCED.spin), 0, 90) * DEG,
        across: cl(num(adv.radius, DEFAULT_ADVANCED.radius), 50, 400) / 100,
        hover: cl(num(adv.hover, DEFAULT_ADVANCED.hover), 0, 100) > 0,
    }
}

/*
 * Satin spindle: folds of uneven width laid along the meridians of a long
 * spindle on the angle diagonal. Fold coordinate = asin(b / R(a)) · N, so folds
 * bow outward, pinch toward the two ends and crowd at the limbs. The spindle
 * turns at a constant rate, so every fold slides across its own length.
 * (All of that, and the uniform names, are the original FRAG's.)
 *
 * Shading, new here: the fold coordinate is sampled at the pixel and one pixel
 * right/up, so each fold gets a true screen-space normal that follows its bend
 * and the pointer's dent. Each fold: soft cavity crease → rising flank facing a
 * royal fill → rounded crest → steep flank facing the cyan key, with a broad
 * satin sheen and a tight clear-coat glint on top.
 */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uPx;
uniform float uPhase;
uniform vec2 uMouse;
uniform float uS;
uniform float uHover;
uniform vec2 uDrag;
uniform float uSeed;
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform vec3 uDeep;
uniform vec3 uSteel;
uniform vec3 uMid;
uniform float uCurve;
uniform float uSheen;
uniform vec4 uAxis;
uniform float uN;
uniform float uRadius;
uniform float uLens;
uniform float uPinch;
uniform float uBow;
uniform float uOffset;
uniform float uWobble;
uniform float uPeak;
uniform float uDepth;
uniform float uLight;
uniform float uAmb;
uniform float uDiff;
uniform float uShine;
uniform float uSpec;
uniform float uRim;
uniform float uCrease;
uniform float uEdge;
uniform float uField;
uniform float uFieldC;
uniform float uRoyal;
uniform float uHoverK;
uniform float uGrain;
uniform float uVig;
uniform float uZoom;
uniform float uBulge;
uniform vec2 uOff;
uniform vec2 uTiltSC;
uniform float uReach;
uniform float uDent;
uniform float uGlint;
uniform vec2 uLean;
// Ripples: design-frame position, age (s), strength; strength 0 = none.
uniform vec4 uRip[4];
out vec4 outColor;
const float PI = 3.14159265;
// The cloth is laid out on a fixed 1200×800 design frame (as GelPebble is): s is
// in design-frame heights, so a wider or taller frame shows more of the same
// cloth rather than restretching it.
const float DESIGN_ASP = 1.5;
// Placement tilt: eye distance in frame heights (≈ CSS perspective of 2.2 × height).
const float FOCAL = 2.2;
// Past this the original clamped asin at ±0.999, leaving a dead band when zoomed
// out; here it carries on along its tangent so the cloth keeps folding.
const float X0 = 0.96;
const float LIMB_SLOPE = 1.6;
// Ripple: front speed (design heights / s), ring width, and how fast it dies (1/s).
const float RIP_SPEED = 0.55;
const float RIP_W = 0.085;
const float RIP_DECAY = 1.7;
// Folds dragged per (frame height / s) of pointer travel across them.
const float DRAGK = 0.16;
// Lean of the royal fill from straight on, mirrored from the key: grazing.
const float FILL_LEAN = 1.15;

uint pcg(uint v) {
    uint s = v * 747796405u + 2891336453u;
    uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
    return (w >> 22u) ^ w;
}
float rnd(uint v) { return float(pcg(v)) * (1.0 / 4294967296.0); }

vec3 ramp(float v) {
    v = clamp(v, 0.0, 1.0);
    vec3 c = mix(uBg, uDeep, smoothstep(0.0, 0.25, v));
    c = mix(c, uSteel, smoothstep(0.2, 0.45, v));
    c = mix(c, uMid, smoothstep(0.42, 0.68, v));
    c = mix(c, uAccent, smoothstep(0.62, 0.92, v));
    return c;
}
// The ramp tops out at Accent; past that the key keeps brightening it rather
// than leaving a flat plateau of accent across every well-lit face.
vec3 rampHot(float v) {
    return ramp(v * 0.85) * (1.0 + 0.6 * max(v * 0.85 - 0.92, 0.0));
}

// Screen (frame heights, centred, y up) → the cloth's own plane: undo the
// offsets, then the perspective tilt, then Scale. Turning (uAxis) comes after.
vec2 toPlane(vec2 s) {
    s -= uOff * uRes / max(uS, 1.0);
    float d = max(FOCAL * uTiltSC.y - s.y * uTiltSC.x, 1e-3);
    float v = s.y * FOCAL / d;
    return vec2(s.x * (FOCAL + v * uTiltSC.x) / FOCAL, v) / uZoom;
}

// Continuous fold coordinate at plane point q (integers are creases).
// aux = (x across the spindle, a along it as a share of the frame, bn, dent).
float foldAt(vec2 q, vec2 mp, out vec4 aux) {
    float asp = DESIGN_ASP;
    float aMax = max(0.5 * (asp * abs(uAxis.x) + abs(uAxis.y)), 0.05);
    float bMax = max(0.5 * (asp * abs(uAxis.z) + abs(uAxis.w)), 0.05);
    float a = dot(q, uAxis.xy);
    float b = dot(q, uAxis.zw);
    float ar = a / aMax;
    // The original clamps an to ±1, which kinks every fold where the spindle
    // ends (never inside the frame at 100%, but plain once zoomed out or
    // tilted). Past the end the cos profile carries on with matching slope
    // and eases to half the pinch instead.
    float an = abs(a) / max(aMax * uLens, 1e-3);
    float c = 0.5 * uPinch / max(1.0 - uPinch, 1e-3);
    float prof = an <= 1.0 ? cos(an * 0.5 * PI) : -c * (1.0 - exp(-0.5 * PI * (an - 1.0) / max(c, 1e-3)));
    float w = max(mix(1.0, mix(uPinch, 1.0, prof), uCurve), 0.05);
    float bn = b / bMax + uBow * uCurve * ar * ar;
    float x = bn / max(uRadius * w, 1e-3);
    float ax = abs(x);
    // Past X0 the slope eases from asin's own down to LIMB_SLOPE, so the cloth
    // beyond the limb keeps folds of a sane width instead of pinstripes.
    float t = ax - X0;
    float s0 = 1.0 / sqrt(1.0 - X0 * X0);
    float ph = ax < X0 ? asin(ax) : asin(X0) + LIMB_SLOPE * t + (s0 - LIMB_SLOPE) * 0.12 * (1.0 - exp(-t / 0.12));
    float phi = mix(x, sign(x) * ph, uCurve);
    vec2 dm = q - mp;
    float g = exp(-dot(dm, dm) * uReach) * clamp(uHover, 0.0, 1.0) * uHoverK * uDent;
    // Capped so the dent never shifts the folds faster than they are spaced,
    // which would fold the cloth over itself.
    float push = 0.35 + clamp(dot(uDrag, uAxis.zw) * DRAGK, -0.25, 0.25);
    float m = (phi - uPhase) * uN + uOffset + g * push;

    aux = vec4(x, ar, bn, g);
    return m + uWobble * (0.5 * sin(m * 0.73 + 1.3) + 0.5 * sin(m * 0.31 + 4.0));
}

void main() {
    vec2 s = (gl_FragCoord.xy - 0.5 * uRes) / max(uS, 1.0);
    vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));
    vec2 mp = toPlane(uMouse);
    vec4 aux;
    float m2 = foldAt(toPlane(s), mp, aux);
    // The fold coordinate's screen gradient: the fold's direction and its width.
    // m2 is smooth (no fract yet), so the 2×2-quad derivatives are exact enough
    // and cost nothing; sampling foldAt twice more tripled the shader.
    vec2 gm = vec2(dFdx(m2), dFdy(m2));
    float fw = max(abs(gm.x) + abs(gm.y), 1e-4);
    vec2 gd = gm / max(length(gm), 1e-6);
    float x = aux.x;
    float ar = aux.y;
    float bn = aux.z;
    float g = aux.w;
    // Folds crowded below ~3 px flatten to their average instead of aliasing.
    float detail = 1.0 - smoothstep(0.2, 0.45, fw);

    float id = floor(m2);
    float p = fract(m2);
    float pk = clamp(uPeak + (rnd(floatBitsToUint(id)) - 0.5) * 0.14, 0.2, 0.92);
    float sp;
    float ds;
    if (p < pk) {
        sp = 0.5 * p / pk;
        ds = 0.5 / pk;
    } else {
        float r = max(1.0 - pk, 1e-3);
        sp = 0.5 + 0.5 * (p - pk) / r;
        ds = 0.5 / r;
    }
    float dh = PI * cos(PI * sp) * ds;
    // Each fold swells and slackens along its length, so its sheen comes and
    // goes in patches the way real satin does rather than running as a rule.
    float swell = 1.0 + 0.3 * sin(ar * 2.6 + rnd(floatBitsToUint(id) ^ 0x51ED27u) * 6.2832);
    float tilt = -dh * uDepth * swell * (1.0 + 0.7 * g) * detail;
    vec2 ac = uAxis.zw;
    // The spindle's own curve: toward its sides the cloth turns away from the
    // view, so the folds sit on a rounded surface rather than a flat sheet.
    vec3 n = normalize(vec3(tilt * gd + ac * clamp(x, -1.2, 1.2) * uBulge, 1.0));
    // A tap or a quick sweep sends a low wave out through the cloth. It tilts the
    // surface rather than moving the folds, so the gloss rides over the ring.
    vec2 rn = vec2(0.0);
    float ring = 0.0;
    for (int i = 0; i < 4; i++) {
        vec4 r = uRip[i];
        if (r.w <= 0.0) continue;
        vec2 d = s - r.xy;
        float l = max(length(d), 1e-4);
        float e = (l - r.z * RIP_SPEED) / RIP_W;
        float a = r.w * exp(-r.z * RIP_DECAY) * exp(-e * e * 0.5);
        rn += d / l * a * cos(e * 1.6);
        ring += a * max(cos(e * 1.6 + 0.8), 0.0);
    }
    n = normalize(n + vec3(rn * detail, 0.0));
    // The key leans toward the pointer, so moving across the cloth sweeps its
    // gloss over the folds the way tilting real satin under a lamp does.
    vec3 L = normalize(vec3(ac * sin(uLight) + uLean, cos(uLight)));
    float diff = max(dot(n, L), 0.0);
    // Royal fill grazing in from the opposite side: only the steep away flanks
    // catch it, which is where the reference glows electric blue.
    vec3 Lf = vec3(-ac * sin(FILL_LEAN), cos(FILL_LEAN));
    float fill = max(dot(n, Lf), 0.0);
    fill *= fill;
    float nh = max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0);
    float sheenLobe = pow(nh, max(uShine, 1.0));
    float coat = sheenLobe * sheenLobe * sheenLobe; // pow(nh, 3 · shine)

    float edge = mix(1.0, sqrt(max(1.0 - x * x, 0.0)), uEdge);
    float fd = (bn - uFieldC) / 0.7;
    float field = mix(1.0 - uField, 1.0, exp(-fd * fd));
    float cw = max(uCrease, fw * 1.5);
    float occl = mix(1.0, smoothstep(0.0, cw * 2.0, p) * smoothstep(0.0, cw, 1.0 - p), detail);
    // Broad cavity: light reaches less far down into each valley.
    // Broad cavity. Toward the spindle's sides the folds crowd and stand
    // steeper, so their valleys fall to near black while the ridges keep their
    // light (the reference's top-right and bottom-left), not a uniform dimming.
    float limb = smoothstep(0.3, 0.95, abs(x));
    float cavW = mix(0.3, 0.42, limb);
    float cav = mix(1.0, mix(mix(0.6, 0.06, limb), 1.0, smoothstep(0.0, cavW, p) * smoothstep(0.0, cavW * 0.7, 1.0 - p)), detail);
    float lit = edge * field;
    // The key end of the spindle sits in its cyan light: brighter key and a cyan
    // ambient that keeps even the away flanks teal there.
    float keyEnd = mix(0.75, 1.65, smoothstep(-0.3, 1.0, ar));
    float endAmb = 0.32 * smoothstep(-0.3, 0.9, ar);
    float v = (uAmb * (1.0 - 0.8 * limb) + endAmb + uDiff * diff * keyEnd) * mix(0.08, 1.0, occl) * cav * lit;
    v += 0.12 * g * (0.4 + diff);

    vec3 col = rampHot(v);
    // Royal owns the spindle's upper end, cyan its lower end (as in the reference).
    float region = mix(0.15, 1.0, 1.0 - smoothstep(-0.7, 0.55, ar));
    // ...and it falls from the upper side: the lower-left side of the spindle
    // gets none, so its away flanks drop to black between bright ridges.
    region *= smoothstep(-1.05, -0.45, bn);
    // At the royal end every face is royal, not only the steep ones.
    float royalEnd = 1.0 - smoothstep(-0.95, -0.25, ar);
    float wR = uRoyal * region * smoothstep(mix(0.5, 0.05, royalEnd), 0.85, fill) * mix(0.08, 1.0, occl);
    float royalLum = (0.6 + 1.15 * fill) * cav * lit;
    col = mix(col, uBase * (0.3 + 0.95 * royalLum), wR);
    // Terminator: where neither light wins the cloth turns away from both, so
    // the hand-over from cyan to royal runs through shadow, not a pale mix.
    col *= 1.0 - 0.25 * uRoyal * region * 4.0 * wR * (1.0 - wR);

    // Gloss: broad satin sheen + a tighter coat, both tinted by the key.
    vec3 specCol = uAccent * 1.3;
    col += specCol * (sheenLobe * uSpec + coat * uSpec * 1.4) * uSheen * lit * occl;
    float rw = max(cw * 0.8, fw);
    float rd = (p - cw * 2.6) / rw;
    float rim = exp(-rd * rd) * uRim * uSheen * mix(0.5, 1.0, edge) * detail;
    col += rim * (uBase * 0.9 + uAccent * 0.15);
    // the ripple's crest catches the light as it passes
    col += specCol * 0.22 * ring * uSheen * occl;

    // Pointer light: a small lamp hovering over the cloth; its glint rides the folds.
    if (uHover * uHoverK * uGlint > 0.001) {
        vec2 dc = uMouse - s;
        vec3 Lc = normalize(vec3(dc, 0.32));
        float att = clamp(uHover, 0.0, 1.0) * uHoverK * uGlint * exp(-dot(dc, dc) * 5.0);
        float nc = max(dot(n, normalize(Lc + vec3(0.0, 0.0, 1.0))), 0.0);
        col += att * occl * (uAccent * 0.18 * max(dot(n, Lc), 0.0) + specCol * 0.55 * pow(nc, 48.0) * uSheen);
    }

    // Soft shoulder on the brightest channel, scaling all three, so hot glints
    // keep their shape and their hue instead of clipping toward white.
    float top = max(col.r, max(col.g, col.b));
    if (top > 0.9) col *= (0.9 + 0.1 * (1.0 - exp(-(top - 0.9) / 0.1))) / top;
    float vd = length(uv - 0.5) * 1.41421;
    col *= 1.0 - uVig * 0.85 * smoothstep(0.35, 1.0, vd);
    // Film grain in CSS pixels, stronger in the mids; plus a dither against banding.
    uvec2 cell = uvec2(gl_FragCoord.xy / max(uPx, 1.0));
    uint h0 = cell.x * 1973u + cell.y * 9277u + floatBitsToUint(uSeed) * 26699u;
    float gr = rnd(h0) + rnd(h0 ^ 0x9E3779B9u) - 1.0;
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    // The same noise, at ±1/255 minimum, doubles as the dither.
    col += gr * (uGrain * 0.16 * (0.25 + 0.75 * sqrt(clamp(luma, 0.0, 1.0))) + 1.0 / 255.0);
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

// Pixel budget: device px drawn per frame, and the floor the auto-resolution may drop to.
const MAX_PIXELS = 2.6e6
const MIN_QUALITY = 0.6

export default function TidalSheen(props: TidalSheenProps) {
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
        // Typed consts so the hoisted frame() below keeps the narrowing.
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
                    console.warn("TidalSheen shader:", gl!.getShaderInfoLog(s))
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
                if (!gl.isContextLost()) console.warn("TidalSheen link:", gl.getProgramInfoLog(p))
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
            else if (v.length === 3) g.uniform3f(loc, v[0], v[1], v[2])
            else g.uniform4f(loc, v[0], v[1], v[2], v[3])
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
            // Never below the frame's own layout size (a preview that shrinks the
            // frame with a CSS transform would otherwise drop resolution and
            // re-size on every scale step); zoomed in, it grows to stay sharp.
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
        let lastU = -1
        let lastV = -1
        let vxT = 0
        let vyT = 0
        let dragX = 0
        let dragY = 0
        let leanX = 0
        let leanY = 0
        // Up to four live ripples: (x, y) in design-frame units, age (s), strength.
        const rip = new Float32Array(16)
        let ripNext = 0
        let ripLive = false
        let ripSentLive = true
        let lastRipX = 1e9
        let lastRipY = 1e9
        let tapped = false
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
            lastU = -1
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
        const onDown = (e: PointerEvent) => {
            tapped = true
            onMove(e)
            moved = true
        }
        root.addEventListener("pointerdown", onDown)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerup", onUp)
        root.addEventListener("pointercancel", onLeave)
        window.addEventListener("scroll", onScroll, { passive: true, capture: true })

        // ── visibility ──
        let onScreen = true
        let pageVisible = typeof document === "undefined" || document.visibilityState !== "hidden"
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
        let phase = 0
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
            // Drift speed on screen (px/s) picks the rate: soft satin moving under
            // ~1.5 px a frame at 30 fps cannot be told from 60, so it is not drawn faster.
            const rate = mo.rate * (reduced ? 0.25 : 1)
            const S = designS()
            const driftPx = rate * mo.across * S * 0.6
            const leanTX = over ? (((tx - 0.5) * W) / S) * 0.35 * mo.glint : 0
            const leanTY = over ? (((ty - 0.5) * H) / S) * 0.35 * mo.glint : 0
            const pointerBusy =
                moved ||
                ripLive ||
                Math.abs(tx - mx) + Math.abs(ty - my) > 1e-4 ||
                Math.abs(over - hov) > 1e-3 ||
                Math.abs(dragX) + Math.abs(dragY) > 1e-3 ||
                Math.abs(leanTX - leanX) + Math.abs(leanTY - leanY) > 1e-4
            const drifting = rate > 0
            const fps = pointerBusy || driftPx > 45 ? 60 : driftPx > 10 ? 30 : drifting ? 15 : 0
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
                    const u = (cx - r.left) / r.width
                    const v = (cy - r.top) / r.height
                    if (lastU >= 0) {
                        vxT = ((u - lastU) * W) / S / Math.max(dt, 1 / 240)
                        vyT = (-(v - lastV) * H) / S / Math.max(dt, 1 / 240)
                    }
                    lastU = u
                    lastV = v
                    tx = u
                    ty = 1 - v
                    // Ripples: every tap, and a quick sweep every quarter frame-height.
                    const px = ((u - 0.5) * W) / S
                    const py = ((0.5 - v) * H) / S
                    const fast = Math.hypot(vxT, vyT) > 0.9 && Math.hypot(px - lastRipX, py - lastRipY) > 0.25
                    if ((tapped || fast) && mo.ripple > 0 && !reduced) {
                        const o = ripNext * 4
                        rip[o] = px
                        rip[o + 1] = py
                        rip[o + 2] = 0
                        rip[o + 3] = (tapped ? 1.0 : 0.4) * mo.ripple
                        ripNext = (ripNext + 1) % 4
                        lastRipX = px
                        lastRipY = py
                        ripLive = true
                    }
                    tapped = false
                }
                moved = false
            }
            // Follow the cursor in ~60 ms; presence and drag ease a little slower.
            const kFollow = 1 - Math.exp(-dt / 0.06)
            const kSoft = 1 - Math.exp(-dt / 0.2)
            mx += (tx - mx) * kFollow
            my += (ty - my) * kFollow
            hov += (over - hov) * kSoft
            dragX += (cl(vxT, -6, 6) - dragX) * kSoft
            dragY += (cl(vyT, -6, 6) - dragY) * kSoft
            vxT *= 0.5
            vyT *= 0.5
            if (Math.abs(over - hov) < 1e-3) hov = over
            if (Math.abs(dragX) + Math.abs(dragY) < 1e-3) dragX = dragY = 0
            leanX += (leanTX - leanX) * kSoft
            leanY += (leanTY - leanY) * kSoft
            ripLive = false
            for (let o = 0; o < 16; o += 4) {
                if (rip[o + 3] <= 0) continue
                rip[o + 2] += dt
                if (rip[o + 2] > 2.6) rip[o + 3] = 0
                else ripLive = true
            }

            phase = (phase + dt * rate) % 600 // ponytail: wraps once per ~5 h at default speed (one visible step); float precision of the fold coordinate needs it
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
            const mo = motionRef.current
            const statics = uniRef.current!
            if (staticSent !== statics) {
                for (const k in statics) set(k, statics[k])
                staticSent = statics
            }
            dirtyRef.current = false
            set("uRes", [canvas.width, canvas.height])
            set("uPx", [canvas.height / Math.max(H, 1)])
            set("uPhase", [phase])
            set("uS", [(canvas.height * S) / Math.max(H, 1)])
            set("uMouse", [((mx - 0.5) * W) / S, ((my - 0.5) * H) / S])
            set("uHover", [mo.hover ? hov : 0])
            set("uDrag", [dragX, dragY])
            set("uLean", [leanX, leanY])
            if (ripLive || ripSentLive) {
                let loc = locs.get("uRip")
                if (loc === undefined) {
                    loc = g.getUniformLocation(prog!, "uRip")
                    locs.set("uRip", loc)
                }
                g.uniform4fv(loc, rip)
                ripSentLive = ripLive
            }
            set("uSeed", [seed])
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
            root.removeEventListener("pointerdown", onDown)
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
                // With no sized parent (a bare <TidalSheen /> in Next) keep the intrinsic 3:2.
                aspectRatio: "1200 / 800",
                ...style,
                overflow: "hidden",
                background,
                touchAction: "pan-y",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", opacity: 0 }}
            />
        </div>
    )
}
