"use client"

/**
 * CandyShoal — a loose shoal of glossy spheres that drift, breathe and fuse
 * like syrup, raymarched as one smooth-min SDF.
 *
 * Refined from the user's own `ClusterAboutGlossy`. Every control it had
 * keeps its key, title, type, range and unit, so existing instances keep
 * their values. What changed:
 * - Each ray marches only the spheres it passes near, not all 100, and the
 *   frame is paced (60 fps while moving, none once still) with adaptive
 *   resolution, so it runs on phones and integrated GPUs.
 * - Palette: Solid (the original), Gradient, or Scatter. Where spheres fuse,
 *   the neck takes the mix of their colours (OKLab, with chroma held so the
 *   mix stays vivid: red + blue makes purple, not mud).
 * - Spheres ride springs, so the pointer's push wobbles. Press and hold to
 *   gather the nearby ones into one fused blob; release and they spring back.
 * - Placement (X Offset, Angle, Tilt); Advanced › Offset Y stands in for
 *   Y Offset.
 */

import { useEffect, useMemo, useRef } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ types */

type Palette = "solid" | "gradient" | "scatter"

interface Advanced {
    deep: number
    rimLift: number
    shadowColor: string
    highlight: string
    envColor: string
    fleckColor: string
    rimStrength: number
    glowSize: number
    glowStrength: number
    specStrength: number
    windowWidth: number
    reflection: number
    occlusion: number
    mixSpread: number
    largeSize: number
    mediumSize: number
    smallSize: number
    tinySize: number
    fieldWidth: number
    fieldHeight: number
    depth: number
    offsetY: number
    wander: number
    breathMs: number
    clump: number
    fov: number
    seed: number
    pointerRadius: number
    pointerPush: number
    resolution: number
    grain: number
    vignette: number
}

interface Placement {
    x: number
    angle: number
    tilt: number
}

export interface CandyShoalProps {
    /** Solid background behind the shoal. */
    background?: string
    /** Number of spheres, 8–100. */
    count?: number
    /** How readily spheres fuse, 0–100. */
    merge?: number
    /** Size of the spheres and the shoal, %. */
    scale?: number
    /** Solid uses Color; Gradient and Scatter use Colors. */
    palette?: Palette
    /** Body colour in the Solid palette. */
    color?: string
    /** Colours for the Gradient and Scatter palettes. */
    colors?: string[]
    placement?: Partial<Placement>
    /** Press-and-hold pull, 0–10. 0 turns it off. */
    gather?: number
    /** Drift tempo, 0–100. */
    speed?: number
    /** Strength of the pointer's push, 0–100 %. 0 turns it off. */
    hover?: number
    advanced?: Partial<Advanced>
    style?: CSSProperties
}

/* --------------------------------------------------------------- defaults */

/** The tuned look. Out of the box Advanced changes nothing. */
const DEFAULT_ADVANCED: Advanced = {
    deep: 59,
    rimLift: 130,
    shadowColor: "#381B20",
    highlight: "#A8F0E0",
    envColor: "#2C5253",
    fleckColor: "#E06A30",
    rimStrength: 70,
    glowSize: 5,
    glowStrength: 40,
    specStrength: 95,
    windowWidth: 26,
    reflection: 35,
    occlusion: 60,
    mixSpread: 150,
    largeSize: 142,
    mediumSize: 92,
    smallSize: 58,
    tinySize: 27,
    fieldWidth: 56,
    fieldHeight: 45,
    depth: 35,
    offsetY: 6,
    wander: 16,
    breathMs: 2850,
    clump: 50,
    fov: 35,
    seed: 7,
    pointerRadius: 30,
    pointerPush: 12,
    resolution: 70,
    grain: 0,
    vignette: 6,
}

const DEFAULT_PLACEMENT: Placement = { x: 0, angle: 0, tilt: 0 }

// Neighbours in this order mix into clean hues: amber+red is orange,
// red+blue is purple, blue+teal is cyan.
const DEFAULT_COLORS = ["#FFB21E", "#E0142F", "#3A3BFF", "#12C9B0"]

const DEFAULTS = {
    background: "#000000",
    count: 50,
    merge: 50,
    scale: 168,
    palette: "scatter",
    color: "#DE24B0",
    gather: 5,
    speed: 50,
}

const MAX_SPHERES = 100
const DEG = Math.PI / 180

// Sphere springs: about 1.3 Hz and under-damped, so a push or a release
// lands with one soft wobble, like a jelly settling.
const SPRING_K = 70
const SPRING_C = 5.4
const SUBSTEP = 1 / 120
// Gather reaches further than the hover push; a fist, not a fingertip.
const GATHER_REACH = 1.8

/* ---------------------------------------------------------------- shaders */

const VERT = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
precision highp int;

#define MAX_SPHERES 100
// The most spheres one ray carries. Each ray first collects only the spheres
// it passes near, then marches those - a handful, instead of all 100 at every
// step. That list is the whole speed-up. 24 leaves room for the denser shoal
// a full count makes.
#define LMAX 24

uniform vec2 uRes;
uniform vec4 uS[MAX_SPHERES];
uniform vec4 uC[MAX_SPHERES]; // OKLab L, a, b and chroma per sphere
uniform int uCount;
uniform float uK;
uniform float uKc;
uniform float uMargin;
uniform vec4 uCam; // lens shift xy, roll cos, roll sin
uniform float uFov;
uniform float uDeepF;
uniform float uRimF;
uniform float uMulti;
uniform vec3 uShadow;
uniform vec3 uHi;
uniform vec3 uEnv;
uniform vec3 uBg;
uniform vec3 uFleck;
uniform float uSpec;
uniform float uRimAmt;
uniform float uGlow;
uniform float uGlowAmt;
uniform float uAO;
uniform float uRefl;
uniform float uWinW;
uniform float uGrain;
uniform float uVig;
uniform float uSeed;
out vec4 outColor;

vec4 ls[LMAX];
vec4 lc[LMAX];
int ln;

float smin(float a, float b, float k) {
    if (k < 1e-5) return min(a, b);
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}

float map(vec3 p) {
    float d = 1e5;
    for (int i = 0; i < LMAX; i++) {
        if (i >= ln) break;
        vec4 s = ls[i];
        d = smin(d, length(p - s.xyz) - s.w, uK);
    }
    return d;
}

// The same union, carrying each sphere's colour through the blend: where two
// spheres fuse, the neck takes the mix of the two.
vec4 mapColor(vec3 p) {
    float d = 1e5;
    vec4 c = lc[0];
    for (int i = 0; i < LMAX; i++) {
        if (i >= ln) break;
        vec4 s = ls[i];
        float di = length(p - s.xyz) - s.w;
        float w = uKc > 1e-5 ? clamp(0.5 + 0.5 * (d - di) / uKc, 0.0, 1.0) : step(di, d);
        c = mix(c, lc[i], w);
        d = smin(d, di, uK);
    }
    return c;
}

// OKLab -> sRGB. The ab vector is stretched back to the mixed chroma, so a
// blend keeps the saturation of its parents instead of greying in the middle;
// near-complementary pairs, whose hue is undefined there, are let grey.
vec3 toSrgb(vec4 c) {
    vec2 ab = c.yz;
    float m = length(ab);
    if (m > 1e-5) ab *= mix(1.0, c.w / m, smoothstep(0.05, 0.35, m / max(c.w, 1e-5)));
    float l_ = c.x + 0.3963377774 * ab.x + 0.2158037573 * ab.y;
    float m_ = c.x - 0.1055613458 * ab.x - 0.0638541728 * ab.y;
    float s_ = c.x - 0.0894841775 * ab.x - 1.2914855480 * ab.y;
    vec3 q = vec3(l_ * l_ * l_, m_ * m_ * m_, s_ * s_ * s_);
    vec3 lin = clamp(vec3(
        4.0767416621 * q.x - 3.3077115913 * q.y + 0.2309699292 * q.z,
        -1.2684380046 * q.x + 2.6097574011 * q.y - 0.3413193965 * q.z,
        -0.0041960863 * q.x - 0.7034186147 * q.y + 1.7076147010 * q.z
    ), 0.0, 1.0);
    return mix(lin * 12.92, 1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, lin));
}

vec3 calcNormal(vec3 p) {
    const vec2 e = vec2(1.0, -1.0) * 0.0012;
    return normalize(
        e.xyy * map(p + e.xyy) +
        e.yyx * map(p + e.yyx) +
        e.yxy * map(p + e.yxy) +
        e.xxx * map(p + e.xxx)
    );
}

float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Studio environment: teal walls, a dark grey floor, one softbox window above and slightly behind.
vec4 env(vec3 r) {
    vec3 c = mix(uEnv * 0.45, uEnv, smoothstep(-0.7, 0.7, r.y));
    c = mix(vec3(0.36, 0.345, 0.35) * 0.5, c, smoothstep(-0.55, 0.05, r.y));
    float ang = atan(r.y, r.z);
    float band = smoothstep(1.66, 1.82, ang) * (1.0 - smoothstep(2.30, 2.34, ang));
    float wx = 1.0 - smoothstep(uWinW - 0.025, uWinW, abs(r.x));
    float win = band * wx;
    vec3 hiLow = uHi * vec3(0.49, 0.64, 0.6);
    vec3 h = mix(hiLow, uHi, smoothstep(1.70, 2.15, ang));
    return vec4(mix(c, h, win), win);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
    // Placement: shift the lens, then roll about the shifted centre.
    uv -= uCam.xy;
    uv = vec2(uv.x * uCam.z - uv.y * uCam.w, uv.x * uCam.w + uv.y * uCam.z);
    float camD = 1.0 / max(uFov, 1e-3);
    vec3 ro = vec3(0.0, 0.0, camD);
    vec3 rd = normalize(vec3(uv * uFov, -1.0));
    vec3 col = uBg;

    // Collect the spheres this ray passes within reach of (radius plus the
    // blend, glow and edge margin), and the span of t they cover.
    ln = 0;
    float t = 1e5;
    float tEnd = -1e5;
    for (int i = 0; i < MAX_SPHERES; i++) {
        if (i >= uCount) break;
        vec4 s = uS[i];
        vec3 oc = ro - s.xyz;
        float b = dot(oc, rd);
        float R = s.w + uMargin;
        float disc = b * b - dot(oc, oc) + R * R;
        if (disc > 0.0) {
            float sq = sqrt(disc);
            t = min(t, -b - sq);
            tEnd = max(tEnd, -b + sq);
            ls[ln] = s;
            lc[ln] = uC[i];
            ln++;
            // ponytail: drops spheres past LMAX on one ray; raise LMAX if a dense gather ever shows a hole
            if (ln == LMAX) break;
        }
    }

    if (ln > 0) {
        t = max(t, 0.0);
        float dmin = 1e5;
        float tmin = t;
        bool hit = false;
        for (int i = 0; i < 72; i++) {
            vec3 p = ro + rd * t;
            float d = map(p);
            if (d < dmin) { dmin = d; tmin = t; }
            if (d < 0.0006 * t) { hit = true; break; }
            t += d;
            if (t > tEnd) break;
        }
        if (hit) {
            vec3 p = ro + rd * t;
            vec3 n = calcNormal(p);
            vec3 base = toSrgb(mapColor(p));
            vec3 deep = base * uDeepF;
            vec3 rim = min(base * uRimF, vec3(1.0));
            vec3 shadow = mix(uShadow, base * 0.3, uMulti);
            float ndv = clamp(dot(n, -rd), 0.0, 1.0);
            float fres = pow(1.0 - ndv, 3.0);
            vec3 L = normalize(vec3(-0.45, 0.75, 0.6));
            float dif = clamp((dot(n, L) + 0.5) / 1.5, 0.0, 1.0);

            float occ = 0.0;
            float w = 1.0;
            for (int j = 1; j <= 4; j++) {
                float h = 0.018 * float(j);
                occ += (h - map(p + n * h)) * w;
                w *= 0.65;
            }
            occ = clamp(1.0 - uAO * occ * 16.0, 0.0, 1.0);

            vec3 body = mix(deep, base, dif * dif);
            body += base * 0.18 * pow(1.0 - ndv, 1.5);
            body = mix(shadow, body, occ);

            vec3 r = reflect(rd, n);
            vec4 e = env(r);
            float refl = uRefl * (0.1 + 0.4 * fres) * occ;
            col = mix(body, e.rgb, refl * (1.0 - e.a));

            float side = clamp(0.65 + 0.5 * dot(n.xy, normalize(vec2(-0.7, -0.5))), 0.0, 1.2);
            col += rim * fres * uRimAmt * side * mix(0.4, 1.0, occ);

            col = mix(col, e.rgb, e.a * uSpec * smoothstep(0.15, 0.7, occ));

            vec3 Lo = normalize(vec3(-0.6, -0.4, 0.7));
            float fl = pow(max(dot(r, Lo), 0.0), 900.0);
            col += uFleck * fl * 1.2 * occ;
        } else {
            vec3 rim = min(toSrgb(mapColor(ro + rd * tmin)) * uRimF, vec3(1.0));
            float pix = 2.0 * uFov * max(tmin, 1e-3) / max(uRes.y, 1.0);
            float edge = 1.0 - smoothstep(0.0, pix * 1.2, max(dmin, 0.0));
            float glow = uGlowAmt * exp(-max(dmin, 0.0) / max(uGlow, 1e-4));
            col = uBg + rim * glow * 0.6;
            col = mix(col, rim * 0.9, edge * 0.7);
        }
    }

    vec2 q = gl_FragCoord.xy / max(uRes, vec2(1.0)) - 0.5;
    float vig = smoothstep(0.25, 0.85, length(q));
    col *= 1.0 - uVig * vig;
    col += (hash(gl_FragCoord.xy + uSeed) - 0.5) * uGrain * 0.18;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

/* ---------------------------------------------------------------- helpers */

type RGB = [number, number, number]

function parseColor(c: unknown, fb: RGB): RGB {
    if (typeof c !== "string") return fb
    const s = c.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((x) => x + x)
                .join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
        return fb
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const parts = m[1]
            .split(/[\s,\/]+/)
            .filter(Boolean)
            .map(parseFloat)
        if (parts.length >= 3 && parts.slice(0, 3).every((v) => !isNaN(v)))
            return [parts[0] / 255, parts[1] / 255, parts[2] / 255]
    }
    const v = s.match(/var\([^,]+,\s*(.+)\)$/)
    if (v) return parseColor(v[1], fb)
    return fb
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))

/** sRGB -> OKLab, plus its chroma as a fourth channel (see toSrgb in FRAG). */
function toLab(rgb: RGB): [number, number, number, number] {
    const r = toLinear(rgb[0])
    const g = toLinear(rgb[1])
    const b = toLinear(rgb[2])
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A, B, Math.hypot(A, B)]
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

type Sphere = {
    hx: number
    hy: number
    hz: number
    cls: number
    jit: number
    ph: number[]
    fr: number[]
    bp: number
}

const NOMINAL_R = [0.178, 0.115, 0.072, 0.034]

function buildSpheres(seed: number): Sphere[] {
    const rnd = mulberry32(seed * 9973 + 17)
    const out: Sphere[] = []
    for (let i = 0; i < MAX_SPHERES; i++) {
        let x = 0
        let y = 0
        do {
            x = rnd() * 2 - 1
            y = rnd() * 2 - 1
        } while (x * x + y * y > 1)
        const z = rnd() * 2 - 1
        const u = rnd()
        const cls = u < 0.17 ? 0 : u < 0.52 ? 1 : u < 0.83 ? 2 : 3
        const ph: number[] = []
        const fr: number[] = []
        for (let k = 0; k < 6; k++) {
            ph.push(rnd() * Math.PI * 2)
            fr.push(Math.PI * 2 * (k % 2 === 0 ? 0.12 + rnd() * 0.26 : 0.2 + rnd() * 0.3))
        }
        out.push({ hx: x, hy: y, hz: z, cls, jit: 0.88 + rnd() * 0.24, ph, fr, bp: (rnd() - 0.5) * 1.6 })
    }
    // Light relaxation so the resting layout is a loose cluster, not one lump.
    const E = [0.85, 0.45, 0.35]
    for (let it = 0; it < 30; it++) {
        for (let i = 0; i < out.length; i++) {
            for (let j = i + 1; j < out.length; j++) {
                const a = out[i]
                const b = out[j]
                const dx = (a.hx - b.hx) * E[0]
                const dy = (a.hy - b.hy) * E[1]
                const dz = (a.hz - b.hz) * E[2]
                const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-4
                const want = (NOMINAL_R[a.cls] * a.jit + NOMINAL_R[b.cls] * b.jit) * 0.8
                if (d < want) {
                    const push = ((want - d) / d) * 0.5
                    a.hx += (dx * push) / E[0]
                    a.hy += (dy * push) / E[1]
                    a.hz += (dz * push) / E[2]
                    b.hx -= (dx * push) / E[0]
                    b.hy -= (dy * push) / E[1]
                    b.hz -= (dz * push) / E[2]
                }
            }
        }
        for (const s of out) {
            const r = Math.sqrt(s.hx * s.hx + s.hy * s.hy)
            if (r > 1) {
                s.hx /= r
                s.hy /= r
            }
            s.hz = Math.max(-1, Math.min(1, s.hz))
        }
    }
    return out
}

/**
 * Each sphere's own colour, as OKLab + chroma. Gradient runs left to right
 * across the shoal by each sphere's home; Scatter deals the colours out in
 * turn (sphere order is already random in space, so neighbours differ).
 */
function paintSpheres(spheres: Sphere[], palette: Palette, color: string, colors: string[]): Float32Array {
    const out = new Float32Array(MAX_SPHERES * 4)
    const fallback = toLab(parseColor(color, [0.769, 0.055, 0.161]))
    const stops = palette === "solid" || colors.length === 0 ? [fallback] : colors.map((c) => toLab(parseColor(c, [0.5, 0.5, 0.5])))
    const n = stops.length
    for (let i = 0; i < MAX_SPHERES; i++) {
        let c = stops[0]
        if (palette === "gradient" && n > 1) {
            const f = Math.max(0, Math.min(1, (spheres[i].hx + 1) / 2)) * (n - 1)
            const k = Math.min(n - 2, Math.floor(f))
            const t = f - k
            c = [0, 1, 2, 3].map((j) => stops[k][j] + (stops[k + 1][j] - stops[k][j]) * t) as typeof c
        } else if (palette === "scatter") c = stops[i % n]
        out.set(c, i * 4)
    }
    return out
}

/* --------------------------------------------------------------- component */

type Frame = {
    background: string
    count: number
    merge: number
    scale: number
    multi: boolean
    gather: number
    speed: number
    hover: number
    adv: Advanced
    pl: Placement
    spheres: Sphere[]
    paint: Float32Array
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function CandyShoal({
    background = DEFAULTS.background,
    count = DEFAULTS.count,
    merge = DEFAULTS.merge,
    scale = DEFAULTS.scale,
    palette = DEFAULTS.palette,
    color = DEFAULTS.color,
    colors = ["#FFB21E","#E0142F","#3A3BFF","#12C9B0"],
    placement = {"x":0,"tilt":0,"angle":0},
    gather = DEFAULTS.gather,
    speed = DEFAULTS.speed,
    hover = 100,
    advanced = {"fov":35,"deep":59,"seed":7,"clump":50,"depth":35,"grain":0,"hover":50,"wander":16,"offsetY":6,"rimLift":130,"breathMs":2850,"envColor":"#2C5253","glowSize":5,"tinySize":27,"vignette":6,"highlight":"#A8F0E0","largeSize":142,"mixSpread":150,"occlusion":60,"smallSize":58,"fieldWidth":56,"fleckColor":"#E06A30","mediumSize":92,"reflection":35,"resolution":70,"fieldHeight":45,"pointerPush":12,"rimStrength":70,"shadowColor":"#381B20","windowWidth":26,"glowStrength":40,"specStrength":95,"pointerRadius":30},
    style,
}: CandyShoalProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const adv = { ...DEFAULT_ADVANCED, ...advanced }
    const seed = Math.round(adv.seed)
    const spheres = useMemo(() => buildSpheres(seed), [seed])
    const colorsKey = colors.join("|")
    const paint = useMemo(
        () => paintSpheres(spheres, palette, color, colors),
        // colors is keyed by content: Framer hands over a fresh array each render
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [spheres, palette, color, colorsKey]
    )

    const frameRef = useRef<Frame>(null as unknown as Frame)
    frameRef.current = {
        background,
        count,
        merge,
        scale,
        multi: palette !== "solid" && colors.length > 0,
        gather,
        speed,
        hover,
        adv,
        pl: { ...DEFAULT_PLACEMENT, ...placement },
        spheres,
        paint,
    }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return

        let disposed = false
        let raf = 0
        let gl: WebGL2RenderingContext | null = null
        let prog: WebGLProgram | null = null
        let vao: WebGLVertexArrayObject | null = null
        let U: Record<string, WebGLUniformLocation | null> = {}
        let soft = false
        let onScreen = true
        let pageVisible = true
        let reduced = false

        // Frame size in CSS px, from the ResizeObserver only - the loop never
        // reads layout.
        let W = Math.max(1, root.clientWidth || 1200)
        let H = Math.max(1, root.clientHeight || 800)
        // Share of full resolution, lowered while the GPU falls behind
        let quality = 1

        // Raw client coordinates from the events; turned into a 0-1 share of
        // the frame once per frame, against the box as displayed.
        const pointer = { x: 0, y: 0, u: 0.5, v: 0.5, inside: false, down: false, moved: false, lastMove: -1e9 }
        let rectDirty = true

        // Reused every frame - nothing allocated in the loop
        const pos = new Float32Array(MAX_SPHERES * 4)
        const home = new Float32Array(MAX_SPHERES * 2)
        const spring = new Float32Array(MAX_SPHERES * 4) // offset x, y, velocity x, y
        const target = new Float32Array(MAX_SPHERES * 2)
        let time = 0
        let acc = 0
        let frameNo = 0
        let lastNow = 0
        let lastDraw = -1e9
        let drawnFrame: Frame | null = null
        let lookFrame: Frame | null = null
        let paintSent: Float32Array | null = null
        let forceDraw = true
        let frameMs = 16.7
        let postDrawMs = 16.7
        let slowFor = 0
        let fastFor = 0
        let justDrew = false
        const colorCache = new Map<string, RGB>()
        const rgb = (css: string, fb: RGB) => {
            let c = colorCache.get(css)
            if (!c) {
                if (colorCache.size > 32) colorCache.clear()
                c = parseColor(css, fb)
                colorCache.set(css, c)
            }
            return c
        }

        /* ------------------------------------------------------ setup */

        function init(): boolean {
            const ctx = canvas!.getContext("webgl2", {
                alpha: false,
                antialias: false,
                depth: false,
                stencil: false,
                premultipliedAlpha: false,
                // The original kept the buffer; that costs a copy every frame
                // and is only needed for readback. Without it a frame we skip
                // still shows the last one drawn.
                preserveDrawingBuffer: false,
                // an ornament on a page should never wake a laptop's discrete GPU
                powerPreference: "low-power",
            }) as WebGL2RenderingContext | null
            if (!ctx) return false
            gl = ctx
            const compile = (type: number, src: string) => {
                const sh = ctx.createShader(type)
                if (!sh) return null
                ctx.shaderSource(sh, src)
                ctx.compileShader(sh)
                if (!ctx.getShaderParameter(sh, ctx.COMPILE_STATUS)) {
                    console.warn("CandyShoal shader:", ctx.getShaderInfoLog(sh))
                    ctx.deleteShader(sh)
                    return null
                }
                return sh
            }
            const vs = compile(ctx.VERTEX_SHADER, VERT)
            const fs = compile(ctx.FRAGMENT_SHADER, FRAG)
            const p = ctx.createProgram()
            if (!vs || !fs || !p) return false
            ctx.attachShader(p, vs)
            ctx.attachShader(p, fs)
            ctx.linkProgram(p)
            ctx.deleteShader(vs)
            ctx.deleteShader(fs)
            if (!ctx.getProgramParameter(p, ctx.LINK_STATUS)) return false
            prog = p
            vao = ctx.createVertexArray()
            ctx.bindVertexArray(vao)
            ctx.useProgram(p)
            U = {}
            for (const n of [
                "uRes", "uS", "uC", "uCount", "uK", "uKc", "uMargin", "uCam", "uFov", "uDeepF", "uRimF",
                "uMulti", "uShadow", "uHi", "uEnv", "uBg", "uFleck", "uSpec", "uRimAmt", "uGlow", "uGlowAmt",
                "uAO", "uRefl", "uWinW", "uGrain", "uVig", "uSeed",
            ])
                U[n] = ctx.getUniformLocation(p, n)
            try {
                const dbg = ctx.getExtension("WEBGL_debug_renderer_info")
                const rend = String(ctx.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : ctx.RENDERER))
                soft = /swiftshader|llvmpipe|software|basic render/i.test(rend)
            } catch (e) {
                soft = false
            }
            lookFrame = null
            paintSent = null
            forceDraw = true
            return true
        }

        /** Size the drawing buffer; true when it changed. */
        function applySize(): boolean {
            if (!gl) return false
            const f = frameRef.current
            const device = Math.min(window.devicePixelRatio || 1, 2)
            const res = Math.max(0.2, Math.min(1, f.adv.resolution / 100))
            let cw = W * device * res
            let ch = H * device * res
            const maxPx = soft ? 160000 : 900000
            if (cw * ch > maxPx) {
                const k = Math.sqrt(maxPx / (cw * ch))
                cw *= k
                ch *= k
            }
            const w = Math.max(1, Math.round(cw * quality))
            const h = Math.max(1, Math.round(ch * quality))
            if (canvas!.width === w && canvas!.height === h) return false
            canvas!.width = w
            canvas!.height = h
            gl.viewport(0, 0, w, h)
            return true
        }

        /* ------------------------------------------------------ state */

        /** Advance drift and springs; returns whether anything still moves. */
        function step(dt: number, now: number): boolean {
            const f = frameRef.current
            const a = f.adv
            const rate = reduced ? 0 : Math.max(0, Math.min(100, f.speed)) / 50
            time += dt * rate
            const t = time

            // one layout read, and only while the pointer moves or the page scrolled
            if (pointer.inside && (pointer.moved || rectDirty)) {
                const r = root!.getBoundingClientRect()
                if (r.width > 0 && r.height > 0) {
                    pointer.u = (pointer.x - r.left) / r.width
                    pointer.v = (pointer.y - r.top) / r.height
                }
                pointer.moved = false
                rectDirty = false
            }

            // Placement as the shader applies it: lens shift, then roll.
            // Inverting it puts the pointer on the shoal's own plane.
            const aspect = W / H
            const shiftX = (f.pl.x / 100) * 2 * aspect
            const shiftY = -(a.offsetY / 100) * 2
            const ca = Math.cos(f.pl.angle * DEG)
            const sa = Math.sin(f.pl.angle * DEG)
            const ux = (pointer.u - 0.5) * 2 * aspect - shiftX
            const uy = (0.5 - pointer.v) * 2 - shiftY
            const px = ux * ca - uy * sa
            const py = ux * sa + uy * ca
            const ct = Math.cos(f.pl.tilt * DEG)
            const st = Math.sin(f.pl.tilt * DEG)

            const n = Math.max(1, Math.min(MAX_SPHERES, Math.round(f.count)))
            const s = Math.max(0.5, Math.min(2, f.scale / 100))
            const halfX = (a.fieldWidth / 100) * aspect
            const halfY = a.fieldHeight / 100
            const halfZ = a.depth / 100
            const wander = (a.wander / 100) * 2
            const breathT = Math.max(0.2, a.breathMs / 1000)
            const squeezeAmt = (Math.max(0, Math.min(100, a.clump)) / 100) * 0.4
            const breathWobble = 0.6 * Math.sin(t * 0.53)

            const hv = reduced ? 0 : Math.max(0, f.hover) / 50
            const g = reduced ? 0 : Math.max(0, Math.min(10, f.gather)) / 10
            const gathering = pointer.inside && pointer.down && g > 0
            const pR = Math.max(0.01, (a.pointerRadius / 100) * 2)
            const gR = pR * GATHER_REACH
            // With Gather off, a press parts them harder, as the original did.
            const push = pointer.inside && !gathering ? (a.pointerPush / 100) * 2 * hv * (pointer.down ? 1.6 : 1) : 0
            // at the default 5 the near ones close 80% of the way: one fused blob
            const pull = gathering ? Math.min(0.95, g * 1.6) : 0

            for (let i = 0; i < n; i++) {
                const sp = f.spheres[i]
                const b = 0.5 + 0.5 * Math.cos((Math.PI * 2 * t) / breathT + sp.bp + breathWobble)
                const sq = 1 - squeezeAmt * b
                const wx = wander * (0.62 * Math.sin(sp.fr[0] * t + sp.ph[0]) + 0.38 * Math.sin(sp.fr[1] * t + sp.ph[1]))
                const wy = wander * (0.62 * Math.sin(sp.fr[2] * t + sp.ph[2]) + 0.38 * Math.sin(sp.fr[3] * t + sp.ph[3]))
                const wz = wander * 0.8 * (0.62 * Math.sin(sp.fr[4] * t + sp.ph[4]) + 0.38 * Math.sin(sp.fr[5] * t + sp.ph[5]))
                const x = (sp.hx * halfX + wx) * sq * s
                const y0 = (sp.hy * halfY + wy) * sq * s
                const z0 = (sp.hz * halfZ + wz) * sq * s
                // Tilt about the camera's right axis; positive tips the top away
                const y = y0 * ct + z0 * st
                const z = z0 * ct - y0 * st
                home[i * 2] = x
                home[i * 2 + 1] = y
                pos[i * 4 + 2] = z
                pos[i * 4 + 3] = sphereRadius(a, sp.cls) * sp.jit * s

                let tx = 0
                let ty = 0
                if (push > 0 || pull > 0) {
                    const dx = x - px
                    const dy = y - py
                    const d2 = dx * dx + dy * dy
                    if (pull > 0) {
                        const k = pull * Math.exp(-d2 / (gR * gR))
                        tx = -dx * k
                        ty = -dy * k
                    } else {
                        const d = Math.sqrt(d2) || 1e-4
                        const k = push * Math.exp(-d2 / (pR * pR))
                        tx = (dx / d) * k
                        ty = (dy / d) * k
                    }
                }
                target[i * 2] = tx
                target[i * 2 + 1] = ty
            }

            // Springs on a fixed substep, so the wobble is the same at any
            // refresh rate
            acc = Math.min(acc + dt, SUBSTEP * 8)
            let moving = false
            while (acc >= SUBSTEP) {
                acc -= SUBSTEP
                for (let i = 0; i < n; i++) {
                    const j = i * 4
                    for (let c = 0; c < 2; c++) {
                        const v = spring[j + 2 + c] + (SPRING_K * (target[i * 2 + c] - spring[j + c]) - SPRING_C * spring[j + 2 + c]) * SUBSTEP
                        spring[j + 2 + c] = v
                        spring[j + c] += v * SUBSTEP
                    }
                }
            }
            for (let i = 0; i < n; i++) {
                const j = i * 4
                // within half a pixel of rest and barely moving: nothing to draw
                if (
                    Math.abs(spring[j + 2]) + Math.abs(spring[j + 3]) > 0.004 ||
                    Math.abs(target[i * 2] - spring[j]) + Math.abs(target[i * 2 + 1] - spring[j + 1]) > 0.0015
                )
                    moving = true
                pos[j] = home[i * 2] + spring[j]
                pos[j + 1] = home[i * 2 + 1] + spring[j + 1]
            }
            return rate > 0 || moving || now - pointer.lastMove < 200
        }

        /* ------------------------------------------------------ frame */

        function draw() {
            if (!gl || !prog) return
            const f = frameRef.current
            const a = f.adv
            const iw = canvas!.width
            const ih = canvas!.height
            const n = Math.max(1, Math.min(MAX_SPHERES, Math.round(f.count)))
            const s = Math.max(0.5, Math.min(2, f.scale / 100))
            const k = (Math.max(0, Math.min(100, f.merge)) / 100) * 0.2 * s
            const glow = Math.max(0.0005, a.glowSize / 400)

            gl.uniform2f(U.uRes, iw, ih)
            gl.uniform4fv(U.uS, pos, 0, n * 4)
            gl.uniform1i(U.uCount, n)
            gl.uniform1f(U.uK, k)
            gl.uniform1f(U.uKc, k * Math.max(0, a.mixSpread / 100))
            // how near a ray must pass to matter: the blend, the halo, the edge
            gl.uniform1f(U.uMargin, k + glow * 6 + 0.02)
            gl.uniform4f(
                U.uCam,
                (f.pl.x / 100) * 2 * (W / H),
                -(a.offsetY / 100) * 2,
                Math.cos(f.pl.angle * DEG),
                Math.sin(f.pl.angle * DEG)
            )

            if (paintSent !== f.paint) {
                gl.uniform4fv(U.uC, f.paint)
                paintSent = f.paint
            }

            // Look uniforms only change with props
            if (lookFrame !== f) {
                lookFrame = f
                gl.uniform1f(U.uFov, Math.tan(((Math.max(10, Math.min(90, a.fov)) / 2) * Math.PI) / 180))
                gl.uniform1f(U.uDeepF, a.deep / 100)
                gl.uniform1f(U.uRimF, a.rimLift / 100)
                gl.uniform1f(U.uMulti, f.multi ? 1 : 0)
                const sh = rgb(a.shadowColor, [0.22, 0.106, 0.125])
                gl.uniform3f(U.uShadow, sh[0], sh[1], sh[2])
                const hi = rgb(a.highlight, [0.66, 0.94, 0.88])
                gl.uniform3f(U.uHi, hi[0], hi[1], hi[2])
                const en = rgb(a.envColor, [0.17, 0.32, 0.325])
                gl.uniform3f(U.uEnv, en[0], en[1], en[2])
                const bg = rgb(f.background, [0, 0, 0])
                gl.uniform3f(U.uBg, bg[0], bg[1], bg[2])
                const fl = rgb(a.fleckColor, [0.88, 0.416, 0.188])
                gl.uniform3f(U.uFleck, fl[0], fl[1], fl[2])
                gl.uniform1f(U.uSpec, a.specStrength / 100)
                gl.uniform1f(U.uRimAmt, a.rimStrength / 100)
                gl.uniform1f(U.uGlow, glow)
                gl.uniform1f(U.uGlowAmt, a.glowStrength / 100)
                gl.uniform1f(U.uAO, a.occlusion / 100)
                gl.uniform1f(U.uRefl, a.reflection / 100)
                gl.uniform1f(U.uWinW, Math.max(0.03, a.windowWidth / 100))
                gl.uniform1f(U.uGrain, a.grain / 100)
                gl.uniform1f(U.uVig, a.vignette / 100)
            }
            frameNo = (frameNo + 1) % 997
            gl.uniform1f(U.uSeed, frameNo * 13.17)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        /* Drop resolution while frames run long, win it back once they run
           fast again. rAF's own interval right after a draw is the signal:
           a GPU that cannot keep up delays the next frame. */
        // ponytail: frame-time heuristic, not a GPU timer; EXT_disjoint_timer_query if it ever misjudges
        function adapt(ms: number) {
            postDrawMs += (ms - postDrawMs) * 0.1
            if (postDrawMs > 26) {
                slowFor += ms
                fastFor = 0
            } else if (postDrawMs < 19) {
                fastFor += ms
                slowFor = 0
            }
            if (slowFor > 600 && quality > 0.6) {
                quality = Math.max(0.6, quality * 0.85)
                slowFor = 0
                postDrawMs = 16.7
            } else if (fastFor > 4000 && quality < 1) {
                quality = Math.min(1, quality / 0.85)
                fastFor = 0
            }
        }

        function loop(now: number) {
            if (disposed) return
            raf = requestAnimationFrame(loop)
            if (!onScreen || !pageVisible) {
                lastNow = 0
                return
            }
            const ms = lastNow ? now - lastNow : 0
            lastNow = now
            if (ms > 0) {
                frameMs += (Math.min(ms, 100) - frameMs) * 0.1
                if (justDrew) adapt(ms)
            }
            justDrew = false
            const active = step(Math.min(ms / 1000, 0.05), now)

            const f = frameRef.current
            const resized = applySize()
            const changed = forceDraw || resized || f !== drawnFrame
            // 60 fps while anything moves - the drift covers a few pixels a
            // frame, so 30 would judder - and none once it has settled. Half
            // a frame of slack keeps the cadence even on 90-144 Hz screens.
            if (!changed && !active) return
            if (now - lastDraw < 1000 / 60 - frameMs * 0.5) return
            lastDraw = now
            drawnFrame = f
            forceDraw = false
            draw()
            justDrew = true
        }

        if (!init()) return

        /* --------------------------------------------------- pointer */

        // Handlers only record; the work happens once per frame.
        const record = (e: PointerEvent) => {
            pointer.x = e.clientX
            pointer.y = e.clientY
            pointer.moved = true
            pointer.inside = true
            pointer.lastMove = performance.now()
        }
        const onLeave = () => {
            pointer.inside = false
            pointer.down = false
            pointer.lastMove = performance.now()
        }
        const onDown = (e: PointerEvent) => {
            record(e)
            pointer.down = true
        }
        const onUp = (e: PointerEvent) => {
            pointer.down = false
            pointer.lastMove = performance.now()
            // a lifted finger ends the hover on touch
            if (e.pointerType === "touch") pointer.inside = false
        }
        const onScroll = () => {
            rectDirty = true
        }
        const passive: AddEventListenerOptions = { passive: true }
        root.addEventListener("pointermove", record, passive)
        root.addEventListener("pointerenter", record, passive)
        root.addEventListener("pointerleave", onLeave, passive)
        root.addEventListener("pointerdown", onDown, passive)
        window.addEventListener("pointerup", onUp, passive)
        window.addEventListener("pointercancel", onUp, passive)
        window.addEventListener("scroll", onScroll, { passive: true, capture: true })

        /* --------------------------------------------------- lifecycle */

        const ro =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver((entries) => {
                      const r = entries[entries.length - 1].contentRect
                      W = Math.max(1, r.width)
                      H = Math.max(1, r.height)
                      rectDirty = true
                      forceDraw = true
                  })
                : null
        if (ro) ro.observe(root)
        const io =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(
                      (en) => {
                          onScreen = en.some((e) => e.isIntersecting)
                          forceDraw = true
                      },
                      { rootMargin: "128px" }
                  )
                : null
        if (io) io.observe(root)
        const onVisibility = () => {
            pageVisible = document.visibilityState !== "hidden"
            forceDraw = true
        }
        document.addEventListener("visibilitychange", onVisibility)
        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        reduced = !!mq && mq.matches
        const onMQ = (e: MediaQueryListEvent) => {
            reduced = e.matches
            forceDraw = true
        }
        if (mq) mq.addEventListener("change", onMQ)

        const onLost = (e: Event) => {
            e.preventDefault()
            cancelAnimationFrame(raf)
        }
        const onRestored = () => {
            if (disposed) return
            lastNow = 0
            if (init()) raf = requestAnimationFrame(loop)
        }
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        raf = requestAnimationFrame(loop)

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            if (ro) ro.disconnect()
            if (io) io.disconnect()
            document.removeEventListener("visibilitychange", onVisibility)
            if (mq) mq.removeEventListener("change", onMQ)
            root.removeEventListener("pointermove", record)
            root.removeEventListener("pointerenter", record)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            window.removeEventListener("scroll", onScroll, { capture: true })
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            if (gl) {
                gl.deleteVertexArray(vao)
                gl.deleteProgram(prog)
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
                // The original had a 1200 x 800 minimum here, which overflowed
                // every phone; the intrinsic size above does that job in Framer.
                ...style,
                overflow: "hidden",
                background,
                // Vertical swipes still scroll the page on touch; a press and
                // a sideways drag reach the shoal.
                touchAction: "pan-y",
            }}
        >
            <canvas
                ref={canvasRef}
                aria-hidden
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}

/** Sphere diameter class -> radius in world units (stage height is 2). */
function sphereRadius(a: Advanced, cls: number): number {
    const d = cls === 0 ? a.largeSize : cls === 1 ? a.mediumSize : cls === 2 ? a.smallSize : a.tinySize
    return d / 800
}

/* --------------------------------------------------------------- controls */
