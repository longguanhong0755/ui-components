"use client"

/**
 * OpalDrape — a floating stack of iridescent cloth sheets. A tap throws the
 * stack up: it fans apart along a twisting column, hangs, falls back bottom
 * sheet first and piles up with a few bounces. The pointer loosens, turns
 * and ripples it.
 *
 * Refined from the user's `FloatingStackAbout` (every control kept), with
 * the look matched to a reference clip of holographic fabric sheets on grey:
 *
 *   - sheets are cloth, not cards: each carries a diagonal S-fold and a
 *     second crease, and bends with its own velocity (edges trail behind —
 *     a dome on the way up, a cup on the way down) through an underdamped
 *     spring, so it wobbles on after the stack lands.
 *   - the stack rises along a twisted column: each sheet turns about the
 *     vertical axis and drifts on a helix in proportion to its height above
 *     the anchor sheet, and tips a few degrees off level, so no two are
 *     parallel at full spread.
 *   - sheets never pass through each other: positions are kept in stack
 *     order with a minimum gap (a landing sheet rides on the one below),
 *     each sheet's own fold and bend are capped by the room it has, and each
 *     draws in its own depth slice, so an upper sheet always covers a lower
 *     one.
 *   - surface: accent colours sweep through neighbouring hues across the
 *     sheet and with view angle (thin-film look), plus soft wrinkle normals,
 *     a fabric grain sized in CSS pixels, sparse glints, and a soft shadow
 *     from the sheet above.
 *
 * Deviations from the user's original, each because the demo assumption did
 * not survive as a component: the breath plays on tap (Play: Loop restores
 * the automatic cycle); the pointer is measured against the box as displayed
 * (`offsetX / offsetWidth` drifted at any canvas zoom); the 1200 × 800
 * min-size on the root is gone (it overflowed any smaller frame); and the
 * loop now paces itself and stops once everything is still.
 */

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

/** Tuning values; out of the box Advanced changes nothing. */
const DEFAULT_ADVANCED = {
    // what it is / where it sits
    stackX: 50,
    stackY: 62,
    anchor: 74,
    compactGap: 2,
    peakGap: 9,
    // camera
    pitch: 28,
    yaw: 25,
    camDist: 9,
    // cloth shape
    domeAmp: 16,
    sagAmp: 12,
    saddleAmp: 10,
    waveAmp: 12,
    creases: 50,
    sway: 10,
    tilt: 7,
    roundness: 10,
    // finish
    iridescence: 100,
    sheen: 45,
    accentMix: 100,
    frostOpacity: 62,
    glassOpacity: 30,
    edgeShade: 45,
    shadow: 45,
    texture: 40,
    glitter: 35,
    grain: 0,
    vignette: 0,
    // motion
    cycleMs: 3000,
    riseMs: 1140,
    holdMs: 1650,
    fallMs: 2650,
    staggerMs: 30,
    yawSwing: 6,
    followThrough: 50,
    float: 50,
    hover: 50,
}
type Advanced = typeof DEFAULT_ADVANCED

export interface OpalDrapeProps {
    background?: string
    sheets?: number
    spread?: number
    twist?: number
    size?: number
    bend?: number
    hueShift?: number
    play?: "tap" | "loop"
    toss?: number
    bounce?: number
    speed?: number
    image?: { src?: string; srcSet?: string; alt?: string } | string
    images?: Array<{ src?: string; srcSet?: string; alt?: string } | string>
    imageFit?: "contain" | "cover"
    imageX?: number
    imageY?: number
    copyTop?: boolean
    drag?: number
    advanced?: Partial<Advanced>
    style?: React.CSSProperties
}

// Sheet specs, top → bottom. k: 0 opaque iridescent, 1 frosted, 2 clear glass.
const SHEET_SPECS = [
    { a: "#9577B0", m: 0.0, k: 0, hue: 0.0, rib: 0 },
    { a: "#C83A3A", m: 0.7, k: 0, hue: 0.3, rib: 0 },
    { a: "#E07A6A", m: 0.6, k: 0, hue: 0.55, rib: 0 },
    { a: "#3E6FD8", m: 0.65, k: 0, hue: 0.8, rib: 0 },
    { a: "#D24FB5", m: 0.55, k: 0, hue: 0.1, rib: 0 },
    { a: "#F2F0F2", m: 0.6, k: 1, hue: 0.35, rib: 0 },
    { a: "#E4E6EA", m: 0.6, k: 1, hue: 0.6, rib: 1 },
    { a: "#F2B33A", m: 0.75, k: 0, hue: 0.9, rib: 0 },
    { a: "#E8613A", m: 0.65, k: 0, hue: 0.15, rib: 0 },
    { a: "#4FC6C0", m: 0.55, k: 0, hue: 0.45, rib: 0 },
    { a: "#5CC870", m: 0.5, k: 0, hue: 0.7, rib: 0 },
    { a: "#F2F0F2", m: 0.6, k: 1, hue: 0.25, rib: 0 },
    { a: "#D9A6D8", m: 0.5, k: 0, hue: 0.05, rib: 0 },
    { a: "#C9B8E8", m: 0.5, k: 2, hue: 0.5, rib: 0 },
    { a: "#A9C4E6", m: 0.5, k: 2, hue: 0.75, rib: 0 },
    { a: "#8A7CC8", m: 0.6, k: 2, hue: 0.0, rib: 0 },
]

const MAX_SHEETS = 24
// Pictures the Images list takes: one per sheet at most. Framer's maxCount cannot
// follow a prop, so the list allows the most sheets there can be, and only the
// first `sheets` pictures are loaded and shown.
const MAX_IMAGES = MAX_SHEETS
const SEG = 64
const MAX_PIXELS = 2_400_000
const DPR_CAP = 2
// Lean of the column: degrees of turn per unit of height above the anchor
// (a sheet is 2 units wide). Twist scales it; 50 % is this.
const TWIST_DEG_PER_UNIT = 10
// Share of the full spread the stack loosens to while the pointer is over it.
const HOVER_LIFT = 0.25
// Natural frequency of each sheet's bend; Follow-Through sets its damping.
const FLEX_HZ = 1.7
// How high the whole stack is thrown at Throw 50 %, in sheet half-widths.
const THROW_UNITS = 1.1
// Launch curve 1 − (1 − x)^p · (1 + p·x): eases out of rest, peaks in speed at
// 1/p of the rise, glides into the apex — no velocity jump at either end.
const THROW_POW = 3
// First landing bounce at Bounce 50 %: height in sheet half-widths and
// duration; each next bounce keeps BOUNCE_E of the height (ballistic, so
// √BOUNCE_E of the time). Three bounces, then it rests.
const BOUNCE_UNITS = 0.22
const BOUNCE_MS = 320
const BOUNCE_E = 0.38
// Landing order: each sheet down the stack lands this many staggers earlier,
// so the pile builds from the bottom while the top sheets still hang.
const LAND_SPREAD = 1.5
// Minimum gap kept between neighbours, as a share of the Compact Gap.
const MIN_GAP = 0.6
// Dragging: degrees the stack turns per CSS px at Drag 50 %, and how far the
// pointer must travel before a press counts as a drag (not a tap).
const DRAG_DEG_PER_PX = 0.35
const DRAG_SLOP = 5
// Most the camera tips up or down while dragging; it eases back on release.
const DRAG_PITCH_MAX = 25

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "")
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16)
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function smooth(x: number) {
    const c = Math.min(1, Math.max(0, x))
    return c * c * (3 - 2 * c)
}

function launch(x: number) {
    const c = Math.min(1, Math.max(0, x))
    return 1 - Math.pow(1 - c, THROW_POW) * (1 + THROW_POW * c)
}

/**
 * Lift share (0 packed … 1 apex) of a sheet at its own phase q: thrown up
 * until a, hangs until b, falls back under gravity (x²) until c.
 */
function flight(q: number, a: number, b: number, c: number) {
    if (q <= 0) return 0
    if (q < a) return launch(q / a)
    if (q < b) return 1 - 0.06 * smooth((q - a) / (b - a))
    if (q < c) {
        const x = (q - b) / (c - b)
        return 0.94 * (1 - x * x)
    }
    return 0
}

/**
 * Fan-out share of a sheet at phase q. It opens more slowly than the lift and
 * keeps opening through the hang, so the stack is still blooming at the top
 * of the throw instead of sitting there; it closes with the fall.
 */
function fanOut(q: number, b: number, c: number) {
    if (q <= 0) return 0
    if (q < b) return smooth(q / b)
    if (q < c) {
        const x = (q - b) / (c - b)
        return 1 - x * x
    }
    return 0
}

/** Phase within the launch where flight() reads s (launch is monotonic). */
function invThrow(s: number) {
    let lo = 0
    let hi = 1
    for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2
        if (launch(mid) < s) lo = mid
        else hi = mid
    }
    return (lo + hi) / 2
}

/** Height share of the landing bounces, ms after touchdown; d0 is the first one's length. */
function bounceAt(ms: number, d0: number) {
    if (ms <= 0 || d0 <= 0) return 0
    let h = 1
    let d = d0
    for (let k = 0; k < 3; k++) {
        if (ms < d) {
            const x = ms / d
            return h * 4 * x * (1 - x)
        }
        ms -= d
        h *= BOUNCE_E
        d *= Math.sqrt(BOUNCE_E)
    }
    return 0
}

function clampTo(v: number, ref: number, lim: number) {
    return Math.min(ref + lim, Math.max(ref - lim, v))
}

function fract(x: number) {
    return x - Math.floor(x)
}

/** Deterministic per-sheet scatter in 0..1. */
function scatter(i: number, k: number) {
    return fract(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453)
}

function clampN(v: unknown, fb: number, lo: number, hi: number) {
    const n = typeof v === "number" && isFinite(v) ? v : fb
    return Math.min(hi, Math.max(lo, n))
}

/** The URL behind a ResponsiveImage value (Framer passes an object, sometimes a string). */
function imageSrc(v: unknown): string {
    if (typeof v === "string") return v
    if (v && typeof v === "object" && typeof (v as { src?: unknown }).src === "string") return (v as { src: string }).src
    return ""
}

/** The uploaded pictures in order, empties dropped, at most `limit`; falls back to an older single `image`. */
function pictureSrcs(p: OpalDrapeProps, limit: number = MAX_IMAGES): string[] {
    const list = Array.isArray(p.images) ? p.images.map(imageSrc).filter(Boolean) : []
    if (list.length) return list.slice(0, Math.min(MAX_IMAGES, limit))
    const one = imageSrc(p.image)
    return one ? [one] : []
}

const VERT = `#version 300 es
precision highp float;
in vec2 aUV;
uniform mat3 uM;
uniform vec3 uT;
uniform float uDome;
uniform float uSag;
uniform float uSaddle;
uniform vec4 uFold;
uniform vec4 uFold2;
uniform vec4 uFlut;
uniform float uDist;
uniform vec2 uFocal;
uniform vec2 uOffset;
out vec2 vUV;
out vec3 vN;
out vec3 vPos;
out vec3 vTu;
out vec3 vTv;
float H(vec2 q) {
    float r2 = dot(q, q) * 0.5;
    float h = (uDome - uSag) * (1.0 - r2) + uSaddle * q.x * q.y;
    h += uFold.x * sin(2.4 * dot(q, uFold.yz) + uFold.w);
    h += uFold2.x * sin(3.0 * dot(q, uFold2.yz) + uFold2.w);
    h += uFlut.x * sin(5.0 * dot(q, uFlut.yz) - uFlut.w) * (0.25 + 0.75 * r2);
    return h;
}
void main() {
    vec2 q = aUV;
    const float e = 0.015;
    float h = H(q);
    float du = (H(q + vec2(e, 0.0)) - H(q - vec2(e, 0.0))) / (2.0 * e);
    float dv = (H(q + vec2(0.0, e)) - H(q - vec2(0.0, e))) / (2.0 * e);
    vec3 pc = uM * vec3(q.x, h, q.y) + uT;
    pc.z -= uDist;
    float w = max(-pc.z, 0.001);
    float zn = clamp((w - (uDist - 8.0)) / 16.0, 0.0, 1.0) * 2.0 - 1.0;
    gl_Position = vec4(pc.x * uFocal.x + uOffset.x * w, pc.y * uFocal.y + uOffset.y * w, zn * w, w);
    vUV = q;
    vN = uM * normalize(vec3(-du, 1.0, -dv));
    vTu = uM * vec3(1.0, du, 0.0);
    vTv = uM * vec3(0.0, dv, 1.0);
    vPos = pc;
}`

const FRAG = `#version 300 es
precision highp float;
in vec2 vUV;
in vec3 vN;
in vec3 vPos;
in vec3 vTu;
in vec3 vTv;
uniform vec3 uAccent;
uniform float uAccentMix;
uniform float uKind;
uniform float uAlpha;
uniform float uHueBase;
uniform float uHueShift;
uniform float uIri;
uniform float uSheen;
uniform float uRound;
uniform float uEdge;
uniform vec2 uLight;
uniform float uRib;
uniform float uOcc;
uniform float uSeed;
uniform float uCrease;
uniform float uTex;
uniform float uTexFreq;
uniform float uGlitter;
uniform float uOpaque;
uniform sampler2D uImg;
uniform float uUseImg;
uniform float uImgAspect;
uniform float uImgFit;
uniform vec2 uImgPos;
out vec4 fragColor;
const vec3 STOPS[8] = vec3[8](
    vec3(0.584, 0.467, 0.690),
    vec3(0.788, 0.663, 0.878),
    vec3(0.902, 0.867, 0.910),
    vec3(0.247, 0.796, 0.416),
    vec3(0.482, 0.878, 0.549),
    vec3(0.847, 0.941, 0.886),
    vec3(0.310, 0.776, 0.753),
    vec3(0.396, 0.345, 0.600)
);
vec3 ramp(float t) {
    float x = fract(t) * 8.0;
    int i0 = int(floor(x));
    int i1 = (i0 + 1) % 8;
    float f = x - floor(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(STOPS[i0], STOPS[i1], f);
}
// rotate a colour about the grey axis (hue turn that keeps lightness)
vec3 hueRot(vec3 c, float a) {
    const vec3 k = vec3(0.57735);
    float ca = cos(a);
    return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
}
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float wrinkle(vec2 p) {
    return vnoise(p) * 0.65 + vnoise(p * 2.3 + 7.1) * 0.35;
}
void main() {
    vec2 q = abs(vUV) - vec2(1.0 - uRound);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRound;
    float aa = max(fwidth(d), 1e-4);
    float cover = 1.0 - smoothstep(-aa, aa, d);
    if (cover < 0.002) discard;
    vec3 N = normalize(vN);
    // soft creases: the gradient of a low noise field, laid in the sheet's own frame
    vec2 wp = vUV * vec2(2.6, 3.4) + uSeed * 17.0;
    float w0 = wrinkle(wp);
    float gx = (wrinkle(wp + vec2(0.05, 0.0)) - w0) / 0.05;
    float gy = (wrinkle(wp + vec2(0.0, 0.05)) - w0) / 0.05;
    N = normalize(N - uCrease * 0.1 * (gx * normalize(vTu) + gy * normalize(vTv)));
    vec3 V = normalize(-vPos);
    float facing = dot(N, V);
    float back = step(facing, 0.0);
    if (facing < 0.0) N = -N;
    float ndv = clamp(abs(facing), 0.0, 1.0);
    float sweep = uIri * (0.22 * vUV.x + 0.08 * vUV.y + 0.45 * (1.0 - ndv) + 0.2 * N.x);
    vec3 iri = ramp(uHueBase + uHueShift + sweep);
    // the accent carries its own thin-film sweep through neighbouring hues
    vec3 acc = clamp(hueRot(uAccent, 6.2831 * (uHueShift + 0.5 * (sweep - 0.25))), 0.0, 1.0);
    float edgeW = smoothstep(0.45, 1.0, max(abs(vUV.x), abs(vUV.y)));
    float wav = 0.75 + 0.25 * sin(vUV.x * 2.3 - vUV.y * 1.7 + uHueBase * 6.2831);
    // accent leads (the reference's sheets each read as their own colour); the
    // shared holo ramp shows through toward the middle and carries the top sheet
    vec3 col = mix(iri, acc, clamp(uAccentMix * 2.0 * (0.7 + 0.3 * edgeW) * wav, 0.0, 1.0));
    // the user's picture on the sheet's front. Contain: fitted inside, the sheet's own
    // colour fills the rest. Cover: fills the sheet, uImgPos picks which part shows
    if (uUseImg > 0.5) {
        vec2 tuv = vUV * 0.5 + 0.5;
        if (uImgFit > 0.5) {
            tuv = uImgAspect >= 1.0
                ? vec2(tuv.x / uImgAspect + (1.0 - 1.0 / uImgAspect) * uImgPos.x, tuv.y)
                : vec2(tuv.x, tuv.y * uImgAspect + (1.0 - uImgAspect) * uImgPos.y);
        } else {
            tuv = uImgAspect >= 1.0
                ? vec2(tuv.x, (tuv.y - 0.5) * uImgAspect + 0.5)
                : vec2((tuv.x - 0.5) / uImgAspect + 0.5, tuv.y);
        }
        vec2 inb = step(vec2(0.0), tuv) * step(tuv, vec2(1.0));
        vec4 im = texture(uImg, clamp(tuv, 0.0, 1.0));
        col = mix(col, im.rgb, im.a * inb.x * inb.y * (1.0 - back));
    }
    float rim = smoothstep(-0.07, 0.0, d);
    float alpha = 1.0;
    if (uKind > 1.5) {
        col = mix(acc, vec3(1.0), 0.25);
        alpha = uAlpha + rim * 0.55 + pow(1.0 - ndv, 3.0) * 0.3;
    } else if (uKind > 0.5) {
        col = mix(col, uAccent, 0.78);
        float rib = sin(vUV.x * 260.0) * sin(vUV.y * 260.0);
        col *= 1.0 - uRib * 0.1 * (0.5 + 0.5 * rib);
        alpha = uAlpha + rim * 0.3;
    } else {
        col = mix(col, vec3(0.161, 0.082, 0.169), rim * uEdge);
    }
    vec3 L = normalize(vec3(-0.25 + uLight.x, 0.8 + uLight.y, 0.55));
    float diff = max(dot(N, L), 0.0);
    col *= 0.55 + 0.55 * diff;
    col = mix(col, vec3(0.329, 0.220, 0.353), back * 0.35);
    // shadow from the sheet above: deepest in the middle, edges stick out into the light
    col *= 1.0 - uOcc * (1.0 - 0.7 * edgeW);
    // fabric grain, about 1.5 CSS px, stuck to the sheet
    col *= 1.0 + uTex * 0.1 * (hash(floor(vUV * uTexFreq) + uSeed * 31.0) - 0.5);
    vec3 Hh = normalize(L + V);
    float spec = pow(max(dot(N, Hh), 0.0), 40.0) * uSheen;
    float fres = pow(1.0 - ndv, 3.0) * 0.18;
    col += vec3(0.96, 1.0, 0.94) * spec + fres;
    // sparse glints that catch the light as the sheet turns
    vec2 gc = vUV * 18.0 + uSeed * 9.0;
    vec2 gi = floor(gc);
    float gh = hash(gi + 3.7);
    vec2 go = vec2(hash(gi + 1.3), hash(gi + 5.9)) - 0.5;
    float dot0 = smoothstep(0.24, 0.0, length(fract(gc) - 0.5 - go * 0.5));
    float on = step(1.0 - 0.05 * uGlitter, gh);
    float tw = pow(max(dot(N, normalize(Hh + vec3(go, gh - 0.5) * 0.8)), 0.0), 6.0);
    col += on * dot0 * tw * 0.9 * (1.0 - back);
    col = clamp(col, 0.0, 1.0);
    alpha = clamp(alpha, 0.0, 1.0) * cover;
    // opaque pass: straight colour, the edge's cover goes to alpha-to-coverage
    fragColor = uOpaque > 0.5 ? vec4(col, alpha) : vec4(col * alpha, alpha);
}`

const UNIFORMS = [
    "uM", "uT", "uDome", "uSag", "uSaddle", "uFold", "uFold2", "uFlut", "uDist", "uFocal", "uOffset",
    "uAccent", "uAccentMix", "uKind", "uAlpha", "uHueBase", "uHueShift", "uIri", "uSheen",
    "uRound", "uEdge", "uLight", "uRib", "uOcc", "uSeed", "uCrease", "uTex", "uTexFreq", "uGlitter",
    "uOpaque", "uImg", "uUseImg", "uImgAspect", "uImgFit", "uImgPos",
]

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const s = gl.createShader(type)
    if (!s) throw new Error("OpalDrape: shader alloc failed")
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s)
        gl.deleteShader(s)
        throw new Error("OpalDrape: shader compile failed: " + log)
    }
    return s
}

const GRAIN_URL =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function OpalDrape(props: OpalDrapeProps) {
    props = withMovedControls(props)
    const { background = "#040404", play = "loop", drag = 50, style } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props
    const tapRef = useRef<() => void>(() => {})

    useEffect(() => {
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return
        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: true,
            premultipliedAlpha: true,
            // an ornament on a page should never wake a laptop's discrete GPU
            powerPreference: "low-power",
        })
        if (!gl) return

        let prog: WebGLProgram
        const U: Record<string, WebGLUniformLocation> = {}
        try {
            const vs = compile(gl, gl.VERTEX_SHADER, VERT)
            const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
            const p = gl.createProgram()
            if (!p) throw new Error("OpalDrape: program alloc failed")
            gl.attachShader(p, vs)
            gl.attachShader(p, fs)
            gl.bindAttribLocation(p, 0, "aUV")
            gl.linkProgram(p)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
                throw new Error("OpalDrape: link failed: " + gl.getProgramInfoLog(p))
            }
            prog = p
            for (const name of UNIFORMS) {
                const loc = gl.getUniformLocation(prog, name)
                if (loc === null) throw new Error("OpalDrape: missing uniform " + name)
                U[name] = loc
            }
        } catch (err) {
            console.error(err)
            return
        }

        // Shared sheet mesh: a SEG×SEG grid over -1..1, fine enough for the folds.
        const verts = new Float32Array((SEG + 1) * (SEG + 1) * 2)
        let vi = 0
        for (let j = 0; j <= SEG; j++) {
            for (let i = 0; i <= SEG; i++) {
                verts[vi++] = (i / SEG) * 2 - 1
                verts[vi++] = (j / SEG) * 2 - 1
            }
        }
        const idx = new Uint16Array(SEG * SEG * 6)
        let ii = 0
        for (let j = 0; j < SEG; j++) {
            for (let i = 0; i < SEG; i++) {
                const a = j * (SEG + 1) + i
                const b = a + 1
                const c = a + SEG + 1
                const d = c + 1
                idx[ii++] = a
                idx[ii++] = c
                idx[ii++] = b
                idx[ii++] = b
                idx[ii++] = c
                idx[ii++] = d
            }
        }
        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        const vbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        const ibo = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW)

        const accents = SHEET_SPECS.map((s) => hexToRgb(s.a))

        // pictures: one texture per slot of the Images list, each reloaded only when its src changes
        let disposed = false
        type Slot = { tex: WebGLTexture | null; src: string; ready: boolean; aspect: number }
        const slots: Slot[] = []
        let nPics = 0
        let readyPics = 0
        const makeSlot = (): Slot => {
            const t = gl.createTexture()
            gl.bindTexture(gl.TEXTURE_2D, t)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]))
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            return { tex: t, src: "", ready: false, aspect: 1 }
        }
        const countReady = () => {
            readyPics = 0
            for (let k = 0; k < nPics; k++) if (slots[k].ready) readyPics++
        }
        const syncImages = (srcs: string[]) => {
            nPics = srcs.length
            for (let k = 0; k < srcs.length; k++) {
                const src = srcs[k]
                if (!slots[k]) slots[k] = makeSlot()
                const sl = slots[k]
                if (sl.src === src) continue
                sl.src = src
                sl.ready = false
                forceDraw = true
                const im = new Image()
                im.crossOrigin = "anonymous"
                im.decoding = "async"
                im.onload = () => {
                    if (disposed || sl.src !== src) return
                    gl.bindTexture(gl.TEXTURE_2D, sl.tex)
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im)
                    gl.generateMipmap(gl.TEXTURE_2D)
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
                    sl.aspect = Math.max(0.05, im.naturalWidth / Math.max(1, im.naturalHeight))
                    sl.ready = true
                    countReady()
                    forceDraw = true
                }
                im.onerror = () => console.warn("OpalDrape: image failed to load")
                im.src = src
            }
            // slots past the list forget their picture, so adding it back reloads it
            for (let k = srcs.length; k < slots.length; k++) {
                if (slots[k].src) {
                    slots[k].src = ""
                    slots[k].ready = false
                    forceDraw = true
                }
            }
            countReady()
        }
        let seenImages: unknown = undefined
        let seenImage: unknown = undefined
        let seenSheets = -1
        let seenOnce = false

        // size from the ResizeObserver only - the loop never reads layout
        let cssW = Math.max(1, root.clientWidth)
        let cssH = Math.max(1, root.clientHeight)
        let dpr = 1
        let quality = 1
        // the quality the canvas is actually sized at; changes wait for a still moment
        let applied = 1
        let onScreen = true
        let pageVisible = true
        const applySize = () => {
            const device = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const budget = Math.sqrt(MAX_PIXELS / (cssW * cssH))
            dpr = Math.max(0.5, Math.min(device, budget) * applied)
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width === w && canvas.height === h) return false
            canvas.width = w
            canvas.height = h
            return true
        }

        const mql = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        // pointer: handlers record, the frame converts once against the box as displayed
        const pointer = { x: 0, y: 0, u: 0.5, v: 0.5, lu: 0.5, lv: 0.5, active: false, moved: false, down: false }
        let rectDirty = true
        const pt = { x: 0, y: 0, over: 0, down: 0, speed: 0 }
        // drag: the stack's own turn (yaw, kept) and tip (pitch, eases back), with spin on release
        const grab = { active: false, moved: false, x0: 0, y0: 0, lx: 0, ly: 0, lt: 0, yaw: 0, pitch: 0, vYaw: 0 }
        let swallowClick = false
        let pendingTap = false
        tapRef.current = () => {
            // a press that turned into a drag is not a tap
            if (swallowClick) {
                swallowClick = false
                return
            }
            pendingTap = true
            forceDraw = true
        }

        // per-sheet state
        const ph = new Float32Array(MAX_SHEETS).fill(1e3) // own timeline; past its end = at rest
        const S = new Float32Array(MAX_SHEETS) // spread share, 0 packed … 1 full
        const lifted = new Float32Array(MAX_SHEETS) // throw + bounce height
        const ys = new Float32Array(MAX_SHEETS) // height in the stack, anchor at 0
        const K = new Float32Array(MAX_SHEETS) // centre bend, limited against neighbours
        const Sd = new Float32Array(MAX_SHEETS) // corner lift, likewise
        const order = new Uint8Array(MAX_SHEETS) // draw order, opaque pass then translucent
        const carry = new Float32Array(MAX_SHEETS) // height left over from a relaunch, easing out
        const prevY = new Float32Array(MAX_SHEETS)
        const vel = new Float32Array(MAX_SHEETS)
        const flex = new Float32Array(MAX_SHEETS) // + dome (moving up), − cup (moving down)
        const flexV = new Float32Array(MAX_SHEETS)
        let lastN = 0
        let loopClock = 0
        let idleClock = 0
        let flutPh = 0
        let yawSw = -1
        let bob = 0
        let playingNow = false
        let relaunched = false

        /** Advance everything by dt seconds; true while anything is still moving. */
        function step(dt: number): boolean {
            const P = propsRef.current
            const adv: Advanced = { ...DEFAULT_ADVANCED, ...P.advanced }
            const reduced = !!(mql && mql.matches)
            const rate = reduced ? 0 : clampN(P.speed, 50, 0, 100) / 50
            const loopMode = P.play === "loop"
            const N = Math.round(clampN(P.sheets, 16, 6, MAX_SHEETS))
            const cycle = Math.max(500, adv.cycleMs)
            const a = Math.min(0.95, Math.max(0.02, adv.riseMs / cycle))
            const b = Math.min(0.97, Math.max(a + 0.01, adv.holdMs / cycle))
            const c = Math.min(0.99, Math.max(b + 0.01, adv.fallMs / cycle))
            const stag = (adv.staggerMs * 15) / Math.max(1, N - 1) / cycle
            const bnc = clampN(P.bounce, 50, 0, 100) / 50
            const d0 = BOUNCE_MS * Math.sqrt(bnc)
            const throwH = (clampN(P.toss, 50, 0, 100) / 50) * THROW_UNITS
            // one breath ends once the top sheet's bounces have died, never before Cycle
            const end = Math.max(1, c + (d0 * (1 + Math.sqrt(BOUNCE_E) + BOUNCE_E)) / cycle + 0.01)

            if (pointer.active && (pointer.moved || rectDirty)) {
                const r = root!.getBoundingClientRect()
                if (r.width > 0 && r.height > 0) {
                    pointer.u = (pointer.x - r.left) / r.width
                    pointer.v = (pointer.y - r.top) / r.height
                }
                pointer.moved = false
                rectDirty = false
            }
            // tilt follows in ~80 ms; hover presence fades over a quarter second
            const kf = 1 - Math.exp(-dt / 0.08)
            const kp = 1 - Math.exp(-dt / 0.25)
            const ox = pt.x, oy = pt.y, oo = pt.over, od = pt.down, os = pt.speed
            pt.x += ((pointer.active ? pointer.u * 2 - 1 : 0) - pt.x) * kf
            pt.y += ((pointer.active ? pointer.v * 2 - 1 : 0) - pt.y) * kf
            pt.over += ((pointer.active ? 1 : 0) - pt.over) * kp
            pt.down += ((pointer.down ? 1 : 0) - pt.down) * (1 - Math.exp(-dt * 8))
            const inst = dt > 0 ? Math.hypot(pointer.u - pointer.lu, pointer.v - pointer.lv) / dt : 0
            pointer.lu = pointer.u
            pointer.lv = pointer.v
            pt.speed += (Math.min(3, pointer.active ? inst : 0) - pt.speed) * (1 - Math.exp(-dt / 0.2))
            const easing =
                Math.abs(pt.x - ox) + Math.abs(pt.y - oy) + Math.abs(pt.over - oo) + Math.abs(pt.down - od) + Math.abs(pt.speed - os) > 1e-5

            // timeline: Loop throws the stack forever; Tap holds each sheet at rest
            // until a tap sends it round once. Sheets leave top first and, being
            // thrown less high, the lower ones land first.
            const adv01 = (dt * rate * 1000) / cycle
            if (loopMode) {
                loopClock = (loopClock + adv01) % end
                for (let j = 0; j < N; j++) {
                    const q = loopClock - j * stag
                    ph[j] = q < 0 ? q + end : q
                }
            } else {
                relaunched = pendingTap && rate > 0
                if (relaunched) {
                    for (let j = 0; j < N; j++) {
                        const q = ph[j]
                        const bj = Math.max(a + 0.01, b - LAND_SPREAD * j * stag)
                        const cj = Math.max(bj + 0.01, c - LAND_SPREAD * j * stag)
                        if (q < bj) continue // still rising or hanging: the tap only adds to it
                        const s = flight(q, a, bj, cj)
                        const hop = BOUNCE_UNITS * bnc * bounceAt((q - cj) * cycle, d0)
                        // falling: throw it back up from where it is; mid-bounce: from the
                        // bounce's height; at rest: go round again, top first
                        if (s > 0.001) ph[j] = a * invThrow(s)
                        else if (hop > 0.001) ph[j] = a * invThrow(Math.min(0.5, hop / Math.max(0.3, throwH)))
                        else ph[j] = -j * stag
                    }
                }
                for (let j = 0; j < N; j++) if (ph[j] < end) ph[j] = Math.min(end, ph[j] + adv01)
            }
            pendingTap = false
            let playing = loopMode && rate > 0
            for (let j = 0; j < N; j++) if (ph[j] < end) playing = true
            playingNow = playing

            // the stack turns as it breathes; in Tap mode it rests where a cycle ends
            const master = loopMode ? loopClock / end : Math.min(1, Math.max(0, ph[0] / end))
            const swT = -Math.cos(2 * Math.PI * (master - 0.55))
            const oldSw = yawSw
            yawSw += (swT - yawSw) * (1 - Math.exp(-dt / 0.12))

            // idle float: a slow bob and breath while nothing else is going on
            const floatK = (clampN(adv.float, 50, 0, 100) / 50) * (rate > 0 ? 1 : 0)
            idleClock += dt * Math.min(rate, 1.5)
            const oldBob = bob
            bob = floatK * 0.035 * Math.sin(idleClock * 1.35)

            // after a drag: the spin coasts to a stop, the tip eases back to level
            let spinning = false
            if (!grab.active) {
                if (Math.abs(grab.vYaw) > 0.5) {
                    grab.yaw = (grab.yaw + grab.vYaw * dt) % 360
                    grab.vYaw *= Math.exp(-dt / 0.7)
                    spinning = true
                } else grab.vYaw = 0
                if (Math.abs(grab.pitch) > 0.05) {
                    grab.pitch *= Math.exp(-dt / 0.35)
                    spinning = true
                } else grab.pitch = 0
            }

            const hv = clampN(adv.hover, 50, 0, 100) / 50
            const lift = HOVER_LIFT * pt.over * hv
            const spreadMul = clampN(P.spread, 50, 0, 100) / 50
            const gC = (Math.max(0, adv.compactGap) * 2) / 100
            const gP = Math.max(gC, (adv.peakGap * spreadMul * 2) / 100)
            const puff = pt.down * 0.05 * hv
            const af = (clampN(adv.anchor, 74, 0, 100) / 100) * (N - 1)
            // never throw the top sheet out of the frame: the room above the anchor,
            // in sheet half-widths, less the fanned stack and a sheet's own depth
            const unitPx = clampN(P.size, 180, 20, 2000) / 2
            const headroom =
                ((clampN(adv.stackY, 62, 0, 100) / 100) * cssH) / unitPx / Math.max(0.3, Math.cos(adv.pitch * D2R)) -
                1.3 - gP * af
            const throwFit = Math.max(0, Math.min(throwH, headroom))

            for (let j = 0; j < N; j++) {
                const bj = Math.max(a + 0.01, b - LAND_SPREAD * j * stag)
                const cj = Math.max(bj + 0.01, c - LAND_SPREAD * j * stag)
                const s = flight(ph[j], a, bj, cj)
                const fo = fanOut(ph[j], bj, cj)
                S[j] = fo + lift * (1 - fo)
                lifted[j] = throwFit * s + BOUNCE_UNITS * bnc * bounceAt((ph[j] - cj) * cycle, d0)
            }
            ys[0] = 0
            for (let j = 0; j < N - 1; j++) {
                const breath = 1 + floatK * 0.3 * Math.sin(idleClock * 1.35 - j * 0.35)
                ys[j + 1] = ys[j] - ((gC + (gP - gC) * S[j]) * breath + puff)
            }
            const a0 = Math.floor(af)
            const a1 = Math.min(N - 1, a0 + 1)
            const anchorY = ys[a0] + (ys[a1] - ys[a0]) * (af - a0)
            for (let j = 0; j < N; j++) ys[j] = ys[j] - anchorY + lifted[j] + bob
            // a tap that catches sheets mid-fall or mid-bounce restarts their curves;
            // whatever height that would jump is carried and eased out instead
            const kc = Math.exp(-dt / 0.18)
            let carrying = false
            for (let j = 0; j < N; j++) {
                carry[j] = relaunched && N === lastN ? prevY[j] - ys[j] : carry[j] * kc
                if (Math.abs(carry[j]) < 1e-5) carry[j] = 0
                else carrying = true
                ys[j] += carry[j]
            }
            relaunched = false
            // stack order: no sheet passes the one below it — a sheet landing on a
            // pile that is still bouncing rides up on it
            for (let j = N - 2; j >= 0; j--) ys[j] = Math.max(ys[j], ys[j + 1] + gC * MIN_GAP)

            // each sheet bends with its own velocity through an underdamped spring
            const riseSec = Math.max(0.15, (adv.riseMs / 1000))
            const vRef = Math.max(0.2, (2 * ((gP - gC) * Math.max(af, N - 1 - af) + throwFit)) / riseSec)
            const zeta = 0.85 - 0.6 * (clampN(adv.followThrough, 50, 0, 100) / 100)
            const om = 2 * Math.PI * FLEX_HZ
            let flexMoving = false
            const fresh = N !== lastN
            lastN = N
            for (let i = 0; i < N; i++) {
                if (fresh || dt <= 0) {
                    prevY[i] = ys[i]
                    if (fresh) vel[i] = 0
                }
                const vi = dt > 0 ? (ys[i] - prevY[i]) / dt : 0
                prevY[i] = ys[i]
                vel[i] += (vi - vel[i]) * (1 - Math.exp(-dt / 0.04))
                const target = Math.max(-1.6, Math.min(1.6, vel[i] / vRef))
                // two half steps keep the spring stable at 30 fps
                for (let k = 0; k < 2; k++) {
                    const h = dt / 2
                    flexV[i] += (om * om * (target - flex[i]) - 2 * zeta * om * flexV[i]) * h
                    flex[i] += flexV[i] * h
                }
                if (Math.abs(flexV[i]) > 1e-4 || Math.abs(target - flex[i]) > 1e-4) flexMoving = true
            }
            flutPh += dt * (1.5 * Math.min(rate, 1.5) + 6 * pt.speed * hv)

            return (
                playing ||
                grab.active ||
                spinning ||
                carrying ||
                easing ||
                flexMoving ||
                Math.abs(yawSw - oldSw) > 1e-5 ||
                (floatK > 0 && Math.abs(bob - oldBob) > 1e-6)
            )
        }

        // scratch matrices, row-major
        const R = new Float32Array(9)
        const Rs = new Float32Array(9)
        const A = new Float32Array(9)
        const B = new Float32Array(9)
        const M = new Float32Array(9)
        const mul = (x: Float32Array, y: Float32Array, o: Float32Array) => {
            for (let r = 0; r < 3; r++)
                for (let c = 0; c < 3; c++)
                    o[r * 3 + c] = x[r * 3] * y[c] + x[r * 3 + 1] * y[3 + c] + x[r * 3 + 2] * y[6 + c]
        }
        const rotX = (t: number, o: Float32Array) => {
            const c = Math.cos(t), s = Math.sin(t)
            o[0] = 1; o[1] = 0; o[2] = 0
            o[3] = 0; o[4] = c; o[5] = -s
            o[6] = 0; o[7] = s; o[8] = c
        }
        const rotY = (t: number, o: Float32Array) => {
            const c = Math.cos(t), s = Math.sin(t)
            o[0] = c; o[1] = 0; o[2] = s
            o[3] = 0; o[4] = 1; o[5] = 0
            o[6] = -s; o[7] = 0; o[8] = c
        }
        const rotZ = (t: number, o: Float32Array) => {
            const c = Math.cos(t), s = Math.sin(t)
            o[0] = c; o[1] = -s; o[2] = 0
            o[3] = s; o[4] = c; o[5] = 0
            o[6] = 0; o[7] = 0; o[8] = 1
        }
        const D2R = Math.PI / 180

        function draw() {
            const P = propsRef.current
            const adv: Advanced = { ...DEFAULT_ADVANCED, ...P.advanced }
            const N = Math.round(clampN(P.sheets, 16, 6, MAX_SHEETS))
            const bendMul = clampN(P.bend, 50, 0, 100) / 50
            const twistMul = clampN(P.twist, 50, 0, 100) / 50
            const sizePx = clampN(P.size, 180, 20, 2000)
            const hueSh = clampN(P.hueShift, 0, 0, 360) / 360
            // with pictures set, Copies: All puts one on every sheet, going round the list
            const copy = readyPics > 0 && P.copyTop !== false
            const specOf = (i: number) => (copy ? 0 : Math.min(15, Math.floor((i * 16) / N)))
            const hv = clampN(adv.hover, 50, 0, 100) / 50
            const po = pt.over * hv
            const cw = canvas!.width
            const ch = canvas!.height

            // view: Rx(pitch) · Ry(yaw), turned toward the pointer while it is over
            const idleYaw = 2 * Math.sin(idleClock * 0.6) * (clampN(adv.float, 50, 0, 100) / 50)
            rotX(Math.min(80, Math.max(0, adv.pitch + grab.pitch + pt.y * 6 * po)) * D2R, A)
            rotY((adv.yaw + grab.yaw - adv.yawSwing * yawSw + pt.x * 12 * po + idleYaw) * D2R, B)
            mul(A, B, R)

            const D = Math.max(3, adv.camDist)
            const F = (sizePx / 2) * dpr * D

            gl!.viewport(0, 0, cw, ch)
            gl!.clearColor(0, 0, 0, 0)
            gl!.clearDepth(1)
            gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT)
            gl!.enable(gl!.DEPTH_TEST)
            gl!.depthFunc(gl!.LEQUAL)
            gl!.depthMask(true)
            // opaque pass first: no blending, edges through alpha-to-coverage
            gl!.disable(gl!.BLEND)
            gl!.enable(gl!.SAMPLE_ALPHA_TO_COVERAGE)
            gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA)
            gl!.disable(gl!.CULL_FACE)
            gl!.useProgram(prog)
            gl!.bindVertexArray(vao)
            gl!.uniform1f(U.uOpaque, 1)
            gl!.activeTexture(gl!.TEXTURE0)
            gl!.bindTexture(gl!.TEXTURE_2D, slots[0] ? slots[0].tex : null)
            gl!.uniform1i(U.uImg, 0)
            gl!.uniform1f(U.uImgAspect, 1)
            gl!.uniform1f(U.uImgFit, P.imageFit === "cover" ? 1 : 0)
            gl!.uniform2f(U.uImgPos, clampN(P.imageX, 50, 0, 100) / 100, clampN(P.imageY, 50, 0, 100) / 100)

            gl!.uniform1f(U.uDist, D)
            gl!.uniform2f(U.uFocal, F / (cw / 2), F / (ch / 2))
            gl!.uniform2f(U.uOffset, (adv.stackX / 100) * 2 - 1, 1 - (adv.stackY / 100) * 2)
            gl!.uniform1f(U.uHueShift, hueSh)
            gl!.uniform1f(U.uIri, adv.iridescence / 100)
            gl!.uniform1f(U.uSheen, (adv.sheen / 100) * (1 + 0.8 * po))
            gl!.uniform1f(U.uRound, Math.min(0.9, Math.max(0.001, adv.roundness / 100)))
            gl!.uniform1f(U.uEdge, adv.edgeShade / 100)
            gl!.uniform2f(U.uLight, pt.x * 0.8 * po, -pt.y * 0.4 * po)
            gl!.uniform1f(U.uCrease, clampN(adv.creases, 50, 0, 100) / 50)
            gl!.uniform1f(U.uTex, clampN(adv.texture, 40, 0, 100) / 50)
            // grain cells of ~1.5 CSS px across a sheet 2 units wide
            gl!.uniform1f(U.uTexFreq, Math.max(8, sizePx / 3))
            gl!.uniform1f(U.uGlitter, clampN(adv.glitter, 35, 0, 100) / 50)

            const dome = ((adv.domeAmp * 2) / 100) * bendMul
            const sag = ((adv.sagAmp * 2) / 100) * bendMul
            const saddle = ((adv.saddleAmp * 2) / 100) * bendMul
            const wave = ((adv.waveAmp * 2) / 100) * bendMul
            const twistRad = TWIST_DEG_PER_UNIT * twistMul * D2R
            // the pointer winds the column further toward its side
            const twistHover = 8 * pt.x * po * D2R
            const sway = ((adv.sway * 2) / 100) * twistMul
            const tilt = adv.tilt * D2R
            const shadow = clampN(adv.shadow, 45, 0, 100) / 100
            const floatK = clampN(adv.float, 50, 0, 100) / 50

            // centre bend and corner lift per sheet, then capped against each
            // neighbour by the gap between them so no two fold through each other
            for (let i = 0; i < N; i++) {
                const f = flex[i]
                const domeW = Math.exp(-((i * 15) / Math.max(1, N - 1)) / 4)
                K[i] = dome * (domeW * (0.12 + 0.5 * S[i]) + Math.max(0, f)) - sag * Math.max(0, -f)
                Sd[i] = saddle * Math.min(1, Math.abs(f)) * (f < 0 ? 1 : 0.4)
            }
            for (let i = 1; i < N; i++) {
                const g = ys[i - 1] - ys[i]
                K[i] = clampTo(K[i], K[i - 1], 0.25 * g)
                Sd[i] = clampTo(Sd[i], Sd[i - 1], 0.12 * g)
            }
            for (let i = N - 2; i >= 0; i--) {
                const g = ys[i] - ys[i + 1]
                K[i] = clampTo(K[i], K[i + 1], 0.25 * g)
                Sd[i] = clampTo(Sd[i], Sd[i + 1], 0.12 * g)
            }

            /* Opaque sheets top → bottom, so the depth test throws away every
               pixel a higher sheet already covers before it is shaded (drawn
               bottom → top, a packed stack shaded each pixel up to 16 times and
               stuttered mid-throw). Then the frosted and glass sheets bottom →
               top, blended over whatever is beneath them. */
            let nOpaque = 0
            for (let i = 0; i < N; i++) if (SHEET_SPECS[specOf(i)].k === 0) order[nOpaque++] = i
            let n = nOpaque
            for (let i = N - 1; i >= 0; i--) if (SHEET_SPECS[specOf(i)].k !== 0) order[n++] = i

            for (let o = 0; o < N; o++) {
                if (o === nOpaque) {
                    gl!.disable(gl!.SAMPLE_ALPHA_TO_COVERAGE)
                    gl!.enable(gl!.BLEND)
                    gl!.uniform1f(U.uOpaque, 0)
                }
                const i = order[o]
                const si = specOf(i)
                const spec = SHEET_SPECS[si]
                const acc = accents[si]
                const s = S[i]
                const y = ys[i]
                const f = flex[i]

                // twisted column: turn and helix drift grow with height above the anchor
                const turn = (twistRad + twistHover) * y
                const hx = sway * (Math.sin(y * 1.1 + 0.4) - Math.sin(0.4))
                const hz = sway * 0.6 * (Math.cos(y * 1.1 + 0.4) - Math.cos(0.4))
                // tip off level smoothly up the column, so neighbours tip alike
                rotY(turn, A)
                rotX(tilt * s * Math.sin(y * 0.9 + 1.3), B)
                mul(A, B, M)
                rotZ(tilt * s * Math.cos(y * 0.7 + 2.1), A)
                mul(M, A, Rs)
                mul(R, Rs, M)
                gl!.uniformMatrix3fv(U.uM, true, M)
                gl!.uniform3f(
                    U.uT,
                    R[0] * hx + R[1] * y + R[2] * hz,
                    R[3] * hx + R[4] * y + R[5] * hz,
                    R[6] * hx + R[7] * y + R[8] * hz
                )

                // cloth: a resting dome on the top sheets, plus a dome or cup from motion
                gl!.uniform1f(U.uDome, K[i])
                gl!.uniform1f(U.uSag, 0)
                gl!.uniform1f(U.uSaddle, Sd[i])
                // every sheet shares the main S-fold, so the stack nests like folded cloth
                const fa = wave * (0.35 + 0.65 * s)
                const th = 0.5
                gl!.uniform4f(U.uFold, fa, Math.cos(th), Math.sin(th), 0.8)
                // …and gets a fold of its own only as deep as its gaps allow
                const gA = i > 0 ? ys[i - 1] - ys[i] : 1
                const gB = i < N - 1 ? ys[i] - ys[i + 1] : 1
                const room = Math.min(gA, gB, 1) * Math.min(1, bendMul)
                const th2 = th + 1.3 + (scatter(i, 3) - 0.5) * 1.5
                gl!.uniform4f(U.uFold2, 0.12 * room, Math.cos(th2), Math.sin(th2), scatter(i, 5) * 6.28)
                const flutA = wave * 0.35 * (Math.min(1, Math.abs(f)) + 0.15 * floatK + Math.min(1, pt.speed) * po)
                const th3 = th + 1.57
                gl!.uniform4f(U.uFlut, flutA, Math.cos(th3), Math.sin(th3), flutPh + i * 0.15)

                gl!.uniform3f(U.uAccent, acc[0], acc[1], acc[2])
                gl!.uniform1f(U.uAccentMix, spec.m * (adv.accentMix / 100))
                gl!.uniform1f(U.uKind, spec.k)
                gl!.uniform1f(
                    U.uAlpha,
                    spec.k === 2 ? adv.glassOpacity / 100 : spec.k === 1 ? adv.frostOpacity / 100 : 1
                )
                gl!.uniform1f(U.uHueBase, (spec.k === 0 && (i === 0 || copy) ? 0.22 : spec.hue + i * 0.11) + 0.08 * Math.sin(2 * Math.PI * ph[i]))
                // sheet i shows picture i of the list (wrapping); one upload goes on every sheet
                const sl = nPics > 0 && (i === 0 || copy) ? slots[i % nPics] : null
                if (sl && sl.ready) {
                    gl!.bindTexture(gl!.TEXTURE_2D, sl.tex)
                    gl!.uniform1f(U.uImgAspect, sl.aspect)
                    gl!.uniform1f(U.uUseImg, 1)
                } else {
                    gl!.uniform1f(U.uUseImg, 0)
                }
                gl!.uniform1f(U.uRib, spec.rib)
                const gapAbove = i > 0 ? ys[i - 1] - ys[i] : 99
                gl!.uniform1f(U.uOcc, shadow * Math.exp(-gapAbove / 0.22))
                gl!.uniform1f(U.uSeed, i * 0.137)
                // own depth slice, upper sheets nearer: an upper sheet always covers a
                // lower one, while each sheet still sorts its own folds
                gl!.depthRange(i / N, (i + 1) / N)
                gl!.drawElements(gl!.TRIANGLES, idx.length, gl!.UNSIGNED_SHORT, 0)
            }
        }

        /* Drop resolution while frames run long, win it back once they run fast again. */
        // ponytail: frame-time heuristic, not a GPU timer; EXT_disjoint_timer_query if it ever misjudges
        let postDrawMs = 16.7
        let slowFor = 0
        let fastFor = 0
        const adapt = (ms: number) => {
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

        let raf = 0
        let lastNow = 0
        let lastDraw = -1e9
        let frameMs = 16.7
        let justDrew = false
        let forceDraw = true
        let drawnProps: unknown = null
        const loop = (now: number) => {
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
            const moving = step(Math.min(ms / 1000, 0.1))
            const P = propsRef.current
            const sheetsNow = Math.round(clampN(P.sheets, 16, 6, MAX_SHEETS))
            if (!seenOnce || P.images !== seenImages || P.image !== seenImage || sheetsNow !== seenSheets) {
                seenOnce = true
                seenImages = P.images
                seenImage = P.image
                seenSheets = sheetsNow
                // one picture per sheet: pictures past the sheet count are not loaded
                syncImages(pictureSrcs(P, sheetsNow))
            }
            // 60 fps while the stack moves, 30 for the idle float alone, none once still
            const busy = playingNow || pt.over > 0.01 || pt.down > 0.01
            // resizing the canvas costs a frame: never mid-throw unless frames are
            // already badly slow
            if (!playingNow || postDrawMs > 40) applied = quality
            const resized = applySize()
            const changed = forceDraw || resized || P !== drawnProps
            const interval = changed || (moving && busy) ? 1000 / 60 : moving ? 1000 / 30 : Infinity
            if (now - lastDraw < interval - frameMs * 0.5) return
            lastDraw = now
            drawnProps = P
            forceDraw = false
            draw()
            justDrew = true
        }
        raf = requestAnimationFrame(loop)

        const record = (e: PointerEvent) => {
            pointer.x = e.clientX
            pointer.y = e.clientY
            pointer.moved = true
            pointer.active = true
        }
        const onLeave = () => {
            pointer.active = false
            pointer.down = false
        }
        const onDown = (e: PointerEvent) => {
            record(e)
            pointer.down = true
            swallowClick = false
            const on = clampN(propsRef.current.drag, 50, 0, 100) > 0
            if (on && (e.pointerType !== "mouse" || e.button === 0)) {
                grab.active = true
                grab.moved = false
                grab.x0 = grab.lx = e.clientX
                grab.y0 = grab.ly = e.clientY
                grab.lt = performance.now()
                grab.vYaw = 0
            }
        }
        const onDragMove = (e: PointerEvent) => {
            if (!grab.active) return
            if (!grab.moved) {
                if (Math.hypot(e.clientX - grab.x0, e.clientY - grab.y0) < DRAG_SLOP) return
                grab.moved = true
            }
            const k = DRAG_DEG_PER_PX * (clampN(propsRef.current.drag, 50, 0, 100) / 50)
            const now = performance.now()
            const dms = Math.max(1, now - grab.lt)
            const dx = e.clientX - grab.lx
            const dy = e.clientY - grab.ly
            // right turns the front of the stack right; down tips its top toward you
            grab.yaw = (grab.yaw + dx * k) % 360
            grab.pitch = Math.min(DRAG_PITCH_MAX, Math.max(-DRAG_PITCH_MAX, grab.pitch + dy * k * 0.5))
            grab.vYaw += ((dx * k * 1000) / dms - grab.vYaw) * 0.5
            grab.lx = e.clientX
            grab.ly = e.clientY
            grab.lt = now
            forceDraw = true
        }
        const endDrag = () => {
            if (!grab.active) return
            grab.active = false
            if (grab.moved) swallowClick = true
            // held still before letting go: no spin
            if (performance.now() - grab.lt > 80) grab.vYaw = 0
            grab.vYaw = Math.max(-720, Math.min(720, grab.vYaw))
            forceDraw = true
        }
        const onUp = (e: PointerEvent) => {
            pointer.down = false
            if (e.pointerType === "touch") pointer.active = false
            endDrag()
        }
        const onScroll = () => {
            rectDirty = true
        }
        const passive: AddEventListenerOptions = { passive: true }
        root.addEventListener("pointermove", record, passive)
        root.addEventListener("pointerenter", record, passive)
        root.addEventListener("pointerleave", onLeave, passive)
        root.addEventListener("pointerdown", onDown, passive)
        root.addEventListener("pointerup", onUp, passive)
        root.addEventListener("pointercancel", onLeave, passive)
        window.addEventListener("pointerup", onUp, passive)
        window.addEventListener("pointermove", onDragMove, passive)
        window.addEventListener("pointercancel", endDrag, passive)
        window.addEventListener("scroll", onScroll, { passive: true, capture: true })

        const ro =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver((entries) => {
                      const r = entries[entries.length - 1].contentRect
                      cssW = Math.max(1, r.width)
                      cssH = Math.max(1, r.height)
                      rectDirty = true
                      forceDraw = true
                  })
                : null
        ro?.observe(root)
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
        io?.observe(root)
        const onVisibility = () => {
            pageVisible = document.visibilityState !== "hidden"
            forceDraw = true
        }
        document.addEventListener("visibilitychange", onVisibility)

        return () => {
            cancelAnimationFrame(raf)
            tapRef.current = () => {}
            ro?.disconnect()
            io?.disconnect()
            root.removeEventListener("pointermove", record)
            root.removeEventListener("pointerenter", record)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            root.removeEventListener("pointerup", onUp)
            root.removeEventListener("pointercancel", onLeave)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointermove", onDragMove)
            window.removeEventListener("pointercancel", endDrag)
            window.removeEventListener("scroll", onScroll, { capture: true })
            document.removeEventListener("visibilitychange", onVisibility)
            disposed = true
            for (const sl of slots) gl.deleteTexture(sl.tex)
            gl.deleteBuffer(vbo)
            gl.deleteBuffer(ibo)
            gl.deleteVertexArray(vao)
            gl.deleteProgram(prog)
        }
    }, [])

    const adv: Advanced = { ...DEFAULT_ADVANCED, ...props.advanced }
    const tappable = play !== "loop"

    return (
        <div
            ref={rootRef}
            role={tappable ? "button" : undefined}
            tabIndex={tappable ? 0 : undefined}
            aria-label={tappable ? "Throw the stack" : undefined}
            onClick={() => tapRef.current()}
            onKeyDown={(e) => {
                if (tappable && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    tapRef.current()
                }
            }}
            style={{
                width: "100%",
                height: "100%",
                ...style,
                position: "relative",
                overflow: "hidden",
                isolation: "isolate",
                background,
                cursor: tappable ? "pointer" : drag > 0 ? "grab" : undefined,
                userSelect: "none",
                outline: "none",
                touchAction: "pan-y",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
            {adv.vignette > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${Math.min(1, adv.vignette / 100) * 0.85}) 100%)`,
                    }}
                />
            )}
            {adv.grain > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        backgroundImage: GRAIN_URL,
                        backgroundSize: "160px 160px",
                        opacity: Math.min(1, adv.grain / 100) * 0.5,
                        mixBlendMode: "overlay",
                    }}
                />
            )}
        </div>
    )
}

// Control order arranged in the builder.
