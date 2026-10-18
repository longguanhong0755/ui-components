"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/* ---------------------------------------------------------------- types --- */

type Style =
    | "wave"
    | "ember"
    | "mint"
    | "frost"
    | "sky"
    | "storm"
    | "coral"
    | "ice"
    | "magenta"

interface PointerGroup {
    hover?: number
    reach?: number
    sensitivity?: number
}

interface Props {
    background?: string
    orbStyle?: Style
    tint?: string
    core?: string
    highlight?: string
    speed?: number
    ripples?: number
    amplitude?: number
    pointer?: PointerGroup
    style?: CSSProperties
}

type Vec3 = [number, number, number]

/* ------------------------------------------------------------- constants --- */

const STYLE_INDEX: Record<Style, number> = {
    wave: 0,
    ember: 1,
    mint: 2,
    frost: 3,
    sky: 4,
    storm: 5,
    coral: 6,
    ice: 7,
    magenta: 8,
}

const SPEED_REFERENCE = 50

const MAX_DT = 0.05

const MAX_DPR = 1.5

const DEFAULT_POINTER: Required<PointerGroup> = {
    hover: 123,
    reach: 51,
    sensitivity: 177,
}

const SENS_BASE = 0.4

const SPIN_DAMP = 2.2

const MAX_SPIN = 12

const HOVER_RATE = 8

/* ------------------------------------------------------------- utilities --- */

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

function parseColor(input: string | undefined, fallback: Vec3): Vec3 {
    if (!input) return fallback
    const s = input.trim()

    if (s[0] === "#") {
        const hex = s.slice(1)
        const short = hex.length === 3 || hex.length === 4
        const long = hex.length === 6 || hex.length === 8
        if (!short && !long) return fallback
        const grab = (i: number) =>
            short
                ? parseInt(hex[i] + hex[i], 16)
                : parseInt(hex.slice(i * 2, i * 2 + 2), 16)
        const r = grab(0)
        const g = grab(1)
        const b = grab(2)
        if ([r, g, b].some(Number.isNaN)) return fallback
        return [r / 255, g / 255, b / 255]
    }

    const rgb = s.match(/rgba?\(([^)]+)\)/i)
    if (rgb) {
        const p = rgb[1].split(/[,/\s]+/).map((v) => parseFloat(v))
        if (p.length >= 3 && p.slice(0, 3).every((v) => !Number.isNaN(v))) {
            return [p[0] / 255, p[1] / 255, p[2] / 255]
        }
    }

    const hsl = s.match(/hsla?\(([^)]+)\)/i)
    if (hsl) {
        const p = hsl[1].split(/[,/\s]+/).map((v) => parseFloat(v))
        if (p.length >= 3 && p.slice(0, 3).every((v) => !Number.isNaN(v))) {
            const h = ((((p[0] % 360) + 360) % 360) / 360) * 6
            const sat = clamp(p[1] / 100, 0, 1)
            const li = clamp(p[2] / 100, 0, 1)
            const c = (1 - Math.abs(2 * li - 1)) * sat
            const x = c * (1 - Math.abs((h % 2) - 1))
            const m = li - c / 2
            const seg = Math.floor(h) % 6
            const t: Vec3 =
                seg === 0
                    ? [c, x, 0]
                    : seg === 1
                      ? [x, c, 0]
                      : seg === 2
                        ? [0, c, x]
                        : seg === 3
                          ? [0, x, c]
                          : seg === 4
                            ? [x, 0, c]
                            : [c, 0, x]
            return [t[0] + m, t[1] + m, t[2] + m]
        }
    }

    return fallback
}

/* --------------------------------------------------------------- shaders --- */

const VERT = `#version 300 es
precision highp float;
const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }
`

const FRAG = `#version 300 es
// highp is mandatory here: the march tests against 4e-4 and the speculars go to
// pow(x, 380). See the file header.
precision highp float;

uniform vec2 uSize;
uniform float uTime;
uniform float uStyle;
uniform float uSpeed;
uniform float uWaveFreq;
uniform float uAmplitude;
uniform vec3 uTint;
uniform vec3 uCore;
uniform vec3 uHighlight;
// xy: the pointer in the same uv space as the fragment. z: presence, 0..1.
uniform vec3 uPointer;
uniform float uHover;
uniform float uReach;
// xy: click position in uv space, same convention as uPointer. z: seconds
// since the last press — ages out through CLICK_LIFE below, no reset needed.
uniform vec3 uClick;
// The orb's own rotation. The ray is marched in its frame, not the world's.
uniform mat3 uRot;

// What Hover 100% is worth on each of the three things it moves. Constants, not
// dials: they are the SHAPE of the gesture, and splitting them into three
// sliders would be three dials for one decision (rule 11b).
const float HOVER_DEPTH = 1.6;    // extra ripple amplitude
const float HOVER_CLARITY = 0.55; // absorption removed, so the swell glows
const float HOVER_GLINT = 1.5;    // extra highlight on the crests

// A press launches a ring that expands outward from the click point and fades
// as it goes — the same three levers as Hover (deeper, clearer, brighter),
// driven by distance-from-ring instead of distance-from-pointer.
const float CLICK_DEPTH = 1.3;
const float CLICK_CLARITY = 0.6;
const float CLICK_GLINT = 1.8;
const float CLICK_SPEED = 1.4;  // ring radius growth, uv units per second
const float CLICK_WIDTH = 0.30; // ring thickness, uv units
const float CLICK_LIFE = 1.6;   // e-fold decay, seconds

out vec4 fragColor;

// Ray vs. bounding sphere - (near, far) hits, or (-1,-1) on a miss.
vec2 goSph(vec3 ro, vec3 rd, float rad) {
    float b = dot(ro, rd);
    float c = dot(ro, ro) - rad * rad;
    float h = b * b - c;
    if (h < 0.0) return vec2(-1.0);
    float hs = sqrt(h);
    return vec2(-b - hs, -b + hs);
}

// Per-style surface displacement. fr multiplies the ripple frequency, amp
// scales the depth - both 1.0 at default.
float goWaveDisp(vec3 p, float t, float fr, float amp, int style) {
    float disp = 0.0;
    if (style == 1) {                                   // Ember
        vec3 q = normalize(p) * 3.0;
        float uu = q.x * 0.90 + q.y * 0.45 + q.z * 0.25;
        uu = uu + 0.35 * sin(q.y * 1.5 + t * 0.50);
        uu = uu + 0.18 * sin(q.z * 2.1 - t * 0.55);
        float vv = q.z * 0.70 + q.x * 0.55 + q.y * 0.45;
        vv = vv + 0.30 * sin(q.x * 1.6 - t * 0.55);
        vv = vv + 0.16 * sin(q.y * 2.0 + t * 0.60);
        disp = 0.040 * sin(uu * 5.5 * fr) + 0.032 * sin(vv * 5.0 * fr);
    } else if (style == 2) {                            // Mint
        vec3 q = normalize(p) * 4.0;
        float uu = q.x * 0.85 + q.y * 0.50 + q.z * 0.20;
        uu = uu + 0.25 * sin(q.y * 1.1 + t * 0.28);
        uu = uu + 0.15 * sin(q.z * 1.9 - t * 0.30);
        float vv = q.z * 0.70 + q.x * 0.55 + q.y * 0.45;
        vv = vv + 0.22 * sin(q.x * 1.3 - t * 0.30);
        vv = vv + 0.13 * sin(q.y * 2.0 + t * 0.32);
        disp = 0.026 * sin(uu * 9.0 * fr) + 0.022 * sin(vv * 8.5 * fr);
    } else if (style == 3) {                            // Frost
        vec3 q = normalize(p) * 3.5;
        float uu = q.x * 0.85 + q.y * 0.50 + q.z * 0.20;
        uu = uu + 0.30 * sin(q.y * 1.2 + t * 0.20);
        uu = uu + 0.18 * sin(q.z * 2.1 - t * 0.25);
        uu = uu + 0.10 * sin(q.y * 3.5 + q.z * 2.8 + t * 0.18);
        float vv = q.z * 0.70 + q.x * 0.55 + q.y * 0.45;
        vv = vv + 0.28 * sin(q.x * 1.3 - t * 0.22);
        vv = vv + 0.16 * sin(q.y * 2.4 + t * 0.30);
        vv = vv + 0.09 * sin(q.x * 3.2 + q.z * 2.5 - t * 0.20);
        disp = 0.038 * sin(uu * 7.5 * fr) + 0.030 * sin(vv * 7.0 * fr);
    } else if (style == 4) {                            // Sky
        vec3 q = normalize(p) * 3.0;
        float uu = q.x * 0.85 + q.y * 0.50 + q.z * 0.20;
        uu = uu + 0.28 * sin(q.y * 1.0 + t * 0.18);
        uu = uu + 0.14 * sin(q.z * 1.6 - t * 0.22);
        float vv = q.z * 0.70 + q.x * 0.55 + q.y * 0.45;
        vv = vv + 0.25 * sin(q.x * 1.1 - t * 0.20);
        vv = vv + 0.12 * sin(q.y * 1.7 + t * 0.24);
        disp = 0.022 * sin(uu * 6.5 * fr) + 0.018 * sin(vv * 6.0 * fr);
    } else if (style == 5) {                            // Storm
        vec3 q = normalize(p) * 3.5;
        float uu = q.x * 0.85 + q.y * 0.50 + q.z * 0.20;
        uu = uu + 0.32 * sin(q.y * 1.6 + t * 0.50);
        uu = uu + 0.20 * sin(q.z * 2.3 - t * 0.60);
        float vv = q.z * 0.70 + q.x * 0.55 + q.y * 0.45;
        vv = vv + 0.28 * sin(q.x * 1.7 + t * 0.55);
        vv = vv + 0.18 * sin(q.y * 2.4 - t * 0.70);
        disp = 0.042 * sin(uu * 6.5 * fr)
             + 0.034 * sin(vv * 6.0 * fr)
             + 0.018 * sin((uu + vv) * 8.5 * fr + t * 0.4);
    } else if (style == 6) {                            // Coral
        vec3 q = normalize(p) * 3.3;
        float uu = q.x * 0.85 + q.y * 0.50 + q.z * 0.20;
        uu = uu + 0.32 * sin(q.y * 1.2 + t * 0.30);
        uu = uu + 0.18 * sin(q.z * 1.8 - t * 0.28);
        float vv = -q.x * 0.55 + q.z * 0.65 + q.y * 0.40;  // crossed band
        vv = vv + 0.28 * sin(q.x * 1.3 + t * 0.35);
        vv = vv + 0.16 * sin(q.y * 2.0 - t * 0.25);
        disp = 0.040 * sin(uu * 6.5 * fr) + 0.034 * sin(vv * 6.0 * fr);
    } else if (style == 7) {                            // Ice
        vec3 q = normalize(p) * 4.0;
        float uu = q.x * 0.85 + q.y * 0.50 + q.z * 0.20;
        uu = uu + 0.22 * sin(q.y * 1.4 + t * 0.22);
        uu = uu + 0.13 * sin(q.z * 2.3 - t * 0.18);
        float vv = q.z * 0.70 + q.x * 0.55 + q.y * 0.45;
        vv = vv + 0.20 * sin(q.x * 1.5 - t * 0.22);
        vv = vv + 0.12 * sin(q.y * 2.5 + t * 0.20);
        disp = 0.030 * sin(uu * 10.0 * fr) + 0.025 * sin(vv * 9.5 * fr);
    } else if (style == 8) {                            // Magenta
        vec3 q = normalize(p) * 4.0;
        float uu = q.x * 0.85 + q.y * 0.50 + q.z * 0.20;
        uu = uu + 0.25 * sin(q.y * 1.4 + t * 0.55);
        uu = uu + 0.14 * sin(q.z * 2.0 - t * 0.45);
        float vv = q.z * 0.70 + q.x * 0.55 + q.y * 0.45;
        vv = vv + 0.22 * sin(q.x * 1.5 - t * 0.50);
        vv = vv + 0.13 * sin(q.y * 2.2 + t * 0.45);
        disp = 0.030 * sin(uu * 9.5 * fr + t * 0.45) + 0.025 * sin(vv * 9.0 * fr - t * 0.40);
    } else {                                            // Wave (style 0)
        vec3 q = normalize(p) * 3.5;
        float uu = q.x * 0.85 + q.y * 0.50 + q.z * 0.20;
        uu = uu + 0.32 * sin(q.y * 1.0 + t * 0.30);
        uu = uu + 0.22 * sin(q.z * 1.3 - t * 0.35);
        uu = uu + 0.14 * sin(q.y * 1.9 + q.z * 1.6 + t * 0.25);
        float vv = q.z * 0.70 + q.x * 0.55 + q.y * 0.45;
        vv = vv + 0.30 * sin(q.x * 1.2 - t * 0.32);
        vv = vv + 0.20 * sin(q.y * 1.5 + t * 0.45);
        vv = vv + 0.14 * sin(q.z * 1.9 + q.x * 1.6 + t * 0.28);
        disp = 0.042 * sin(uu * 7.0 * fr) + 0.034 * sin(vv * 6.5 * fr);
    }
    return disp * amp;
}

float goMap(vec3 p, float t, float fr, float amp, int style) {
    return length(p) - 1.0 - goWaveDisp(p, t, fr, amp, style);
}

vec3 goNormal(vec3 p, float t, float e, float fr, float amp, int style) {
    vec2 k = vec2(1.0, -1.0);
    return normalize(
        k.xyy * goMap(p + k.xyy * e, t, fr, amp, style) +
        k.yyx * goMap(p + k.yyx * e, t, fr, amp, style) +
        k.yxy * goMap(p + k.yxy * e, t, fr, amp, style) +
        k.xxx * goMap(p + k.xxx * e, t, fr, amp, style)
    );
}

// Sum of a style's final-band amplitudes - sizes the bounding sphere so the
// displaced surface always fits inside it, at any amplitude.
float goAmpSum(int style) {
    if (style == 1) return 0.072;
    if (style == 2) return 0.048;
    if (style == 3) return 0.068;
    if (style == 4) return 0.040;
    if (style == 5) return 0.094;
    if (style == 6) return 0.074;
    if (style == 7) return 0.055;
    if (style == 8) return 0.055;
    return 0.076;
}

// Base Lipschitz divisor for safe sphere-tracing of each style.
float goLip(int style) {
    if (style == 1) return 2.5;
    if (style == 2) return 3.0;
    if (style == 3) return 2.8;
    if (style == 4) return 2.2;
    if (style == 5) return 3.0;
    if (style == 6) return 2.5;
    if (style == 7) return 3.5;
    if (style == 8) return 3.5;
    return 2.0;
}

vec3 goLight1(int style) {
    if (style == 1) return normalize(vec3(0.55, 0.80, 0.55));
    if (style == 2) return normalize(vec3(-0.45, 0.85, 0.55));
    if (style == 6) return normalize(vec3(-0.50, 0.85, 0.55));
    if (style == 7) return normalize(vec3(-0.50, 0.85, 0.55));
    if (style == 8) return normalize(vec3(-0.50, 0.85, 0.55));
    return normalize(vec3(-0.55, 0.85, 0.55));
}

vec3 goLight2(int style) {
    if (style == 1) return normalize(vec3(-0.40, 0.30, 0.80));
    if (style == 2) return normalize(vec3(0.50, 0.30, 0.75));
    if (style == 6) return normalize(vec3(0.50, 0.30, 0.75));
    if (style == 7) return normalize(vec3(0.45, 0.30, 0.80));
    if (style == 8) return normalize(vec3(0.45, 0.30, 0.80));
    return normalize(vec3(0.40, 0.30, 0.80));
}

void main() {
    vec2 size = uSize;
    // The source works in SwiftUI's top-left-origin position space, so the row
    // index is flipped out of GL's bottom-up gl_FragCoord before anything else.
    vec2 pos = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y);
    vec2 uv = (pos - 0.5 * size) / min(size.x, size.y);
    uv = uv * 2.0;

    int style = int(uStyle);
    float fr = uWaveFreq;
    float t = uTime * uSpeed;

    vec3 ro = vec3(0.0, 0.0, 3.0);
    vec3 rd = normalize(vec3(uv, -1.8));

    float ampSum = goAmpSum(style);

    // The orb's own screen radius: a ray from this camera is tangent to a
    // sphere of radius R at |uv| = 1.8R / sqrt(9 - R*R). Reach is a fraction of
    // THAT, so it keeps meaning the same thing when Depth changes the bound.
    float rDial = 1.0 + ampSum * uAmplitude + 0.04;
    float orbUv = 1.8 * rDial / sqrt(max(9.0 - rDial * rDial, 1e-4));

    // Pointer influence, measured in SCREEN space so the swell follows the
    // cursor instead of sticking to a point on a turning surface.
    float reach = max(uReach * orbUv, 1e-4);
    // A plain smoothstep falloff, NOT squared: squaring pulls the whole
    // response into the last few pixels under the cursor, where it reads as
    // noise in the ripples rather than as a swell.
    float w = uPointer.z * (1.0 - smoothstep(0.0, reach, length(uv - uPointer.xy)));

    // The click ring: a Gaussian band at radius CLICK_SPEED·age, fading with
    // age. Distance is measured in the same screen uv as the hover swell, so
    // both gestures compose through the same three levers below.
    float clickAge = max(uClick.z, 0.0);
    float ringR = clickAge * CLICK_SPEED;
    float ringDist = length(uv - uClick.xy) - ringR;
    float ring = exp(-(ringDist * ringDist) / (CLICK_WIDTH * CLICK_WIDTH))
               * exp(-clickAge / CLICK_LIFE);

    float amp = uAmplitude * (1.0 + HOVER_DEPTH * uHover * w + CLICK_DEPTH * ring);

    // Both of these follow the LOCAL amplitude, not the dial's: a deepened
    // ripple that pokes outside the bound is either clipped off or marched
    // into, and the Lipschitz divisor has to grow with it for the same reason.
    float boundRad = 1.0 + ampSum * amp + 0.04;
    float lip = goLip(style) * max(1.0, fr) * max(1.0, amp);

    // March in the ORB's frame. Rotating the ray in — and the lights with it —
    // means every dot product below is already correct and no normal has to be
    // rotated back out. It also keeps the lights fixed in the world, so the
    // highlights sweep across the orb as it turns.
    mat3 rInv = transpose(uRot);
    vec3 roO = rInv * ro;
    vec3 rdO = rInv * rd;

    vec2 hh = goSph(roO, rdO, boundRad);
    // Transparent, not black: the root's Background paints behind the orb.
    if (hh.x < 0.0) { fragColor = vec4(0.0); return; }

    float tHit = max(hh.x - 0.02, 0.0);
    float tMax = hh.y + 0.02;
    bool hit = false;
    vec3 pHit = vec3(0.0);
    for (int i = 0; i < 96; i++) {
        vec3 p = roO + rdO * tHit;
        float d = goMap(p, t, fr, amp, style) / lip;
        if (d < 0.0004) { hit = true; pHit = p; break; }
        tHit = tHit + d * 0.85;
        if (tHit > tMax) break;
    }
    if (!hit) { fragColor = vec4(0.0); return; }

    float chord = hh.y - hh.x;
    float graze = clamp(1.0 - chord / (2.5 * boundRad), 0.0, 1.0);
    float nEps = mix(0.0015, 0.0070, graze);
    vec3 n = goNormal(pHit, t, nEps, fr, amp, style);
    vec3 v = -rdO;
    float ndv = clamp(dot(n, v), 0.0, 1.0);

    vec3 L1 = rInv * goLight1(style);
    vec3 L2 = rInv * goLight2(style);
    vec3 baseTint = uTint * 2.0;
    // Core glow colour -> per-channel absorption: a bright channel is absorbed
    // little, so it survives to the deep valleys. Under the pointer the glass
    // absorbs LESS, so the swell lights up from inside rather than only
    // catching more highlight.
    vec3 absorption = 4.5 * (1.0 - uCore) * clamp(1.0 - HOVER_CLARITY * uHover * w - CLICK_CLARITY * ring, 0.0, 1.0);

    // March refracted into the body to the back surface for Beer-Lambert depth.
    vec3 rIn = refract(rdO, n, 1.0 / 1.45);
    float tBack = 0.01;
    vec3 pBack = pHit + rIn * tBack;
    for (int i = 0; i < 32; i++) {
        pBack = pHit + rIn * tBack;
        float d = goMap(pBack, t, fr, amp, style);
        if (d > -0.0008) break;
        tBack = tBack + (-d) / lip * 0.85;
        if (tBack > 3.5) break;
    }
    vec3 transmit = exp(-absorption * tBack);

    vec3 nBack = goNormal(pBack, t, nEps, fr, amp, style);
    float bDiff = (dot(nBack, L1) * 0.5 + 0.5) * 0.65
                + (dot(nBack, L2) * 0.5 + 0.5) * 0.40;
    vec3 interior = baseTint * (0.20 + bDiff) * transmit;

    float fres = pow(1.0 - ndv, 3.5);
    interior = interior + baseTint * fres * 0.55;

    float exp1 = mix(380.0, 90.0, graze);
    float exp2 = mix(240.0, 60.0, graze);
    vec3 H1 = normalize(L1 + v);
    vec3 H2 = normalize(L2 + v);
    float spec1 = pow(clamp(dot(n, H1), 0.0, 1.0), exp1);
    float spec2 = pow(clamp(dot(n, H2), 0.0, 1.0), exp2);
    float gloss = pow(clamp(dot(n, H1), 0.0, 1.0), 40.0) * 0.10;

    // The last of the three: the crests under the pointer catch more light,
    // which is where the speculars already live.
    vec3 hl = uHighlight * (1.0 + HOVER_GLINT * uHover * w + CLICK_GLINT * ring);
    vec3 col = interior;
    col = col + hl * spec1 * 6.5;
    col = col + hl * spec2 * 3.0;
    col = col + hl * gloss;

    col = col / (1.0 + col * 0.65);
    fragColor = vec4(col, 1.0);
}
`

/* ------------------------------------------------------------ component --- */

function __BaseImpl_LiquidOrb(props: Props) {
    const {
        background = "#000000",
        orbStyle = "mint",
        tint = "#00FEFF",
        core = "#FFFFFF",
        highlight = "#FFFFFF",
        speed = 50,
        ripples = 125,
        amplitude = 160,
        pointer,
        style,
    } = props

    const ptr: Required<PointerGroup> = { ...DEFAULT_POINTER, ...(pointer ?? {}) }

    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    /** Everything the loop reads. A ref, so a dial never rebuilds the context. */
    const liveRef = useRef({
        orbStyle,
        tint,
        core,
        highlight,
        speed,
        ripples,
        amplitude,
        ptr,
    })
    liveRef.current = {
        orbStyle,
        tint,
        core,
        highlight,
        speed,
        ripples,
        amplitude,
        ptr,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const gl = canvas.getContext("webgl2", {
            alpha: true,
            antialias: false,
            premultipliedAlpha: true,
        })
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)
            if (!sh) return null
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.error("LiquidOrb shader:", gl.getShaderInfoLog(sh))
                gl.deleteShader(sh)
                return null
            }
            return sh
        }

        const vs = compile(gl.VERTEX_SHADER, VERT)
        const fs = compile(gl.FRAGMENT_SHADER, FRAG)
        if (!vs || !fs) return

        const program = gl.createProgram()
        if (!program) return
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("LiquidOrb link:", gl.getProgramInfoLog(program))
            return
        }
        gl.useProgram(program)

        const U = {
            size: gl.getUniformLocation(program, "uSize"),
            time: gl.getUniformLocation(program, "uTime"),
            style: gl.getUniformLocation(program, "uStyle"),
            speed: gl.getUniformLocation(program, "uSpeed"),
            waveFreq: gl.getUniformLocation(program, "uWaveFreq"),
            amplitude: gl.getUniformLocation(program, "uAmplitude"),
            tint: gl.getUniformLocation(program, "uTint"),
            core: gl.getUniformLocation(program, "uCore"),
            highlight: gl.getUniformLocation(program, "uHighlight"),
            pointer: gl.getUniformLocation(program, "uPointer"),
            hover: gl.getUniformLocation(program, "uHover"),
            reach: gl.getUniformLocation(program, "uReach"),
            click: gl.getUniformLocation(program, "uClick"),
            rot: gl.getUniformLocation(program, "uRot"),
        }

        // A full-screen triangle from gl_VertexID: no buffers, no attributes.
        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)

        let bw = 1
        let bh = 1
        const resize = () => {
            // clientWidth / clientHeight, never the width/height props (not
            // numeric in the Framer preview) and never getBoundingClientRect
            // (carries the canvas zoom) — rule G.
            const w = canvas.clientWidth || 1
            const h = canvas.clientHeight || 1
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            bw = Math.max(1, Math.round(w * dpr))
            bh = Math.max(1, Math.round(h * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
            gl.viewport(0, 0, bw, bh)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        /* ------------------------------------------------------- gesture --- */

        /** Pointer as a fraction of the canvas box, plus its eased presence. */
        const ptrState = { fx: 0.5, fy: 0.5, presence: 0, target: 0 }
        /** Where the last press landed, and how long ago — drives the click ring. */
        const clickState = { fx: 0.5, fy: 0.5, start: 0 }
        /** The orb's own attitude, and the velocity a flick left behind. */
        const spin = { yaw: 0, pitch: 0, vYaw: 0, vPitch: 0 }
        let dragging = false
        let lastX = 0
        let lastY = 0
        let lastMove = performance.now()

        const radPerPx = () =>
            ((SENS_BASE * Math.max(0, liveRef.current.ptr.sensitivity)) / 100) *
            (Math.PI / 180)

        const onMove = (e: PointerEvent) => {
            // A RATIO off the canvas's own rect, so the Framer canvas zoom
            // cancels: it scales rect.left, clientX and rect.width alike. This
            // is the one place getBoundingClientRect is correct, because
            // nothing here wants a length (rule G).
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            const fx = (e.clientX - r.left) / r.width
            const fy = (e.clientY - r.top) / r.height
            ptrState.fx = fx
            ptrState.fy = fy
            const inside = fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1
            ptrState.target = inside || dragging ? 1 : 0

            if (!dragging) return
            const now = performance.now()
            const dt = Math.max((now - lastMove) / 1000, 1 / 240)
            lastMove = now
            const dx = e.clientX - lastX
            const dy = e.clientY - lastY
            lastX = e.clientX
            lastY = e.clientY
            const k = radPerPx()
            spin.yaw += dx * k
            spin.pitch += dy * k
            // Velocity from THIS move, not a running average: a flick should
            // launch at the speed of its last instant, not of the whole drag.
            spin.vYaw = clamp((dx * k) / dt, -MAX_SPIN, MAX_SPIN)
            spin.vPitch = clamp((dy * k) / dt, -MAX_SPIN, MAX_SPIN)
        }

        const onDown = (e: PointerEvent) => {
            dragging = true
            lastX = e.clientX
            lastY = e.clientY
            lastMove = performance.now()
            // A grab kills the coast; the orb should follow the hand at once.
            spin.vYaw = 0
            spin.vPitch = 0

            // Every press launches a ripple, whether it turns into a drag or
            // not — the same fraction-of-the-box conversion as the pointer
            // swell, so it lands under the actual click, not the drag origin.
            const r = canvas.getBoundingClientRect()
            if (r.width > 0 && r.height > 0) {
                clickState.fx = (e.clientX - r.left) / r.width
                clickState.fy = (e.clientY - r.top) / r.height
                clickState.start = performance.now()
            }
        }

        const onUp = () => {
            dragging = false
        }

        const onLeave = () => {
            if (!dragging) ptrState.target = 0
        }

        canvas.addEventListener("pointerdown", onDown)
        canvas.addEventListener("pointerleave", onLeave)
        // On WINDOW, not the canvas: a pointer that leaves mid-drag would
        // otherwise never release and never update (rule K).
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        /* ---------------------------------------------------------- loop --- */

        let raf = 0
        let last = performance.now()
        /** Seconds of shader time. Wrapped so float precision cannot decay. */
        let clock = 0

        const tick = (now: number) => {
            // Clamped at zero: the first rAF timestamp can predate `last`.
            const dt = clamp((now - last) / 1000, 0, MAX_DT)
            last = now

            const L = liveRef.current
            clock = (clock + dt * (L.speed / SPEED_REFERENCE)) % 100000

            // Presence eases in and out, so the swell never pops.
            ptrState.presence +=
                (ptrState.target - ptrState.presence) *
                (1 - Math.exp(-dt * HOVER_RATE))

            if (!dragging) {
                spin.yaw += spin.vYaw * dt
                spin.pitch += spin.vPitch * dt
                const decay = Math.exp(-dt * SPIN_DAMP)
                spin.vYaw *= decay
                spin.vPitch *= decay
            }

            // R = Ry(yaw) * Rx(pitch), column-major for uniformMatrix3fv.
            const cy = Math.cos(spin.yaw)
            const sy = Math.sin(spin.yaw)
            const cp = Math.cos(spin.pitch)
            const sp = Math.sin(spin.pitch)
            const rot = new Float32Array([
                cy, 0, -sy,
                sy * sp, cp, cy * sp,
                sy * cp, -sp, cy * cp,
            ])

            // The pointer, converted into the shader's uv space from the
            // fractions stored above — done here so a resize needs no listener.
            const minSide = Math.min(bw, bh)
            const puX = ((ptrState.fx - 0.5) * bw * 2) / minSide
            const puY = ((ptrState.fy - 0.5) * bh * 2) / minSide
            const cuX = ((clickState.fx - 0.5) * bw * 2) / minSide
            const cuY = ((clickState.fy - 0.5) * bh * 2) / minSide
            const clickAge = (now - clickState.start) / 1000

            const tintRgb = parseColor(L.tint, [0.176, 0.031, 0.702])
            const coreRgb = parseColor(L.core, [0.51, 0.243, 0.922])
            const hlRgb = parseColor(L.highlight, [1, 1, 1])

            gl.useProgram(program)
            gl.bindVertexArray(vao)
            gl.uniform2f(U.size, bw, bh)
            // Speed is folded into the clock above, so the shader's own speed
            // stays 1 — otherwise changing the dial would jump the phase.
            gl.uniform1f(U.time, clock)
            gl.uniform1f(U.speed, 1)
            gl.uniform1f(U.style, STYLE_INDEX[L.orbStyle] ?? 0)
            gl.uniform1f(U.waveFreq, clamp(L.ripples, 1, 400) / 100)
            gl.uniform1f(U.amplitude, Math.max(0, L.amplitude) / 100)
            gl.uniform3f(U.tint, tintRgb[0], tintRgb[1], tintRgb[2])
            gl.uniform3f(U.core, coreRgb[0], coreRgb[1], coreRgb[2])
            gl.uniform3f(U.highlight, hlRgb[0], hlRgb[1], hlRgb[2])
            gl.uniform3f(U.pointer, puX, puY, ptrState.presence)
            gl.uniform3f(U.click, cuX, cuY, clickAge)
            gl.uniform1f(U.hover, Math.max(0, L.ptr.hover) / 100)
            gl.uniform1f(U.reach, clamp(L.ptr.reach, 1, 200) / 100)
            gl.uniformMatrix3fv(U.rot, false, rot)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            raf = requestAnimationFrame(tick)
        }

        raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointerdown", onDown)
            canvas.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            // Never loseContext(): getContext hands back the same context per
            // canvas, so StrictMode's remount would reuse a force-lost one and
            // render black (rule 6).
        }
    }, [])

    return (
        <div
            style={{
                // Floor before the spread, so an explicit size on the instance
                // still wins and Fit Content cannot collapse the root to 0×0.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
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
                    touchAction: "none",
                    cursor: "grab",
                }}
            />
        </div>
    )
}

const __presetProps = {
  "background": "#000000",
  "orbStyle": "mint",
  "tint": "#00FEFF",
  "core": "#FFFFFF",
  "highlight": "#FFFFFF",
  "speed": 71,
  "ripples": 125,
  "amplitude": 104,
  "size": 88,
  "pointer": {
    "hover": 123,
    "reach": 92,
    "sensitivity": 177
  }
};

export default function LiquidOrb(props: Record<string, unknown>) {
  return <__BaseImpl_LiquidOrb {...(__presetProps as Record<string, unknown>)} {...props} />;
}
