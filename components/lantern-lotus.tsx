"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react"
import type { MotionValue, Transition, ValueAnimationTransition } from "motion/react"
import * as THREE from "three"

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

/**
 * Lantern Lotus — a lotus cast in pink resin, lit from inside, floating alone
 * in the dark.
 *
 * Built after a single still (736 × 697): a translucent pink lotus on pure
 * black, glowing as if a warm lamp were hidden among its inner petals. There
 * was no source to transcribe, so the numbers below were MEASURED off that
 * still — its bounding box, where the light burns hottest, and colour samples
 * across the petals. The name is ours.
 *
 * WHAT THE STILL SAYS, AND WHAT IS MATCHED
 *
 *   Framing. The flower spans 262 × 250 px of the 736 × 697 frame, centred to
 *       within a few pixels: 38% of the frame's short side (FIT_SHARE).
 *   Form. Four whorls round a seed dome. The outermost hang below level and
 *       open toward the viewer; the next spread wide with their tips lifting;
 *       the third stand at ~50° with sharp tips; the innermost cup the dome.
 *       Every petal is boat-shaped (cupped across, curved along) and ends in
 *       a pointed nib that flicks outward. LAYERS holds the four whorls.
 *   Camera. Seen from ~38° above: the dome shows over the front inner petals,
 *       the front outer petal falls toward the bottom edge (Elevation).
 *   The lamp. The brightest pixels (253, 252, 232) sit right of the dome,
 *       a little below its top — a source among the inner petals, not behind
 *       the flower. It is placed there (Lamp X/Y/Z) and lights everything by
 *       inverse square, so the far left of the flower is the dimmest.
 *   Resin. Light through a petal is tinted by how much resin it crossed
 *       (Beer–Lambert): thin sheets read pale pink (246, 174, 196), the
 *       thicker tips and bases deep rose, and the lower petals, lit through
 *       from above by a warm lamp, go peach (226, 152, 103). Petal edges pipe
 *       light and draw as brighter lines.
 *   Sheen. The left petals, far from the lamp, are lavender-grey
 *       (112, 103, 124): a cool, thin-film reflection on the coating, strongest
 *       at grazing angles (Sheen colour, Iridescence).
 *   Glow. The hot spot blooms to white and a faint warm haze surrounds the
 *       flower — a two-level bloom over an HDR render, then a filmic curve.
 *
 * WHERE IT DEVIATES, AND WHY
 *
 *   The still does not move. Here the lotus unfurls from a bud on entrance
 *   (the Transition), then breathes: each petal sways on its own slow phase,
 *   the lamp flickers a few percent, the flower floats and turns a little,
 *   and faint motes drift past. It leans toward the pointer and its lamp
 *   swells while the pointer is over it. Spin and Float at 0, with the
 *   pointer away, hold the still's pose.
 *
 * The Transition plays the entrance — the bud opening — on a framer-motion
 * value the renderer reads every frame. The breathing runs on a hand-rolled
 * clock; Speed drives that.
 *
 * The `framer` import supplies the property controls only — under plain Next.js,
 * alias it to a stub exporting a no-op `addPropertyControls`, a `ControlType`
 * object, and a `RenderTarget` with `current: () => "preview"`.
 */

/* --------------------------------------------------------------- constants --
 * World units are the flower's radius.
 */

const TAU = Math.PI * 2
const DEG = Math.PI / 180

/** Flower width as a share of the frame's short side: 262 / 697 in the still. */
const FIT_SHARE = 0.38
/** The flower's width in world units, outer tips included. */
const FLOWER_WIDTH = 2.05
/** Vertical field of view. Narrow, like a photograph taken from a step back. */
const FOV = 28
/** The point the camera looks at: the middle of the flower's outline, which
 * sits below the dome because the outer petals hang. */
const TARGET_Y = -0.08

/** Lamp: Glow 5 is LAMP_REF, inverse-square with LAMP_FALLOFF. FILL is the
 * share of it scattered through the resin, which reaches further
 * (FILL_FALLOFF) and has lost some of the lamp's colour on the way — the
 * direct light is golden, the scattered glow pink. */
const LAMP_REF = 3
const LAMP_FALLOFF = 12
const FILL = 0.3
const FILL_FALLOFF = 5
/** The cool key that the sheen and highlights reflect, upper left and front. */
const KEY_DIR = new THREE.Vector3(-0.85, 0.45, 0.3).normalize()

/** Bloom: what passes the bright filter, and how much of each level returns. */
const BLOOM_THRESHOLD = 0.9
const BLOOM_NEAR = 0.5
const BLOOM_WIDE = 0.85

/** Petal grid: along × across. Dense along, for the curl at the tip. */
const PETAL_U = 40
const PETAL_V = 14
/** The seed dome: beads packed by golden angle on a cap. */
const POD_CENTER_Y = 0.22
const POD_R = 0.21
const POD_BEADS = 46
const RECEPTACLE_Y = -0.2
const RECEPTACLE_R = 0.2
const POD_CAP = 80 * DEG

/** Motion scales. Spin 1 is about 2°/s; Float 1 a 1.2% bob; Tilt 1 2°. */
const SPIN_UNIT = 0.035
const FLOAT_BOB = 0.012
const FLOAT_SWAY = 0.006
const TILT_UNIT = 0.035
/** Pointer smoothing: rad/s at Smoothing 0 and 10. */
const SMOOTH_FAST = 12
const SMOOTH_SLOW = 1.2
/** While hovered, per step of Hover Glow: lamp gain and extra opening. */
const HOVER_GLOW = 0.07
const HOVER_OPEN = 0.008

/** The entrance: the bud starts smaller and a quarter turn round. */
const ENTRY_SCALE = 0.82
const ENTRY_TURN = 0.6

const MOTE_BOX = { x: 3.6, y: 3, z: 2.5 }

/** Most device pixels drawn per frame; past it the pixel ratio drops. */
const TARGET_PIXELS = 2_400_000

/* -------------------------------------------------------------------- types */

export interface LanternLotusColors {
    petal?: string
    light?: string
    sheen?: string
}

export interface LanternLotusPointer {
    follow?: boolean
    tilt?: number
    hoverGlow?: number
    smoothing?: number
}

type Advanced = typeof DEFAULT_ADVANCED

export interface LanternLotusProps {
    background: string
    /** Petals in each of the outer whorls; the inner ones carry fewer. */
    petals: number
    /** Whorls round the dome, counted from the inside. */
    layers: number
    /** Flower width against the frame; 100 is the still's framing. */
    flowerSize: number
    colors: LanternLotusColors
    /** Brightness of the lamp inside the flower. 0 leaves only the sheen. */
    glow: number
    /** Open from a bud on entrance, or arrive already open. */
    unfurl: boolean
    pointer: LanternLotusPointer
    /** Clock for the breathing, flicker, float and motes. */
    speed: number
    /** Slow turn about the stem. Negative turns the other way. */
    spin: number
    /** How much it bobs and sways. */
    float: number
    /** Plays the entrance: the bud unfurling into the open flower. */
    transition: Transition
    advanced: Partial<Advanced>
    style?: CSSProperties
}

const DEFAULT_COLORS: Required<LanternLotusColors> = {
    petal: "#FF9AAA",
    light: "#FFD08A",
    sheen: "#8C9CFF",
}

const DEFAULT_POINTER: Required<LanternLotusPointer> = {
    follow: true,
    tilt: 5,
    hoverGlow: 5,
    smoothing: 6,
}

const DEFAULT_ADVANCED = {
    seed: 3,
    cup: 100,
    tipCurl: 100,
    elevation: 38,
    lampX: 38,
    lampY: 20,
    lampZ: 10,
    absorption: 100,
    iridescence: 100,
    exposure: 100,
    bloom: 100,
    bloomRadius: 100,
    motes: 24,
    grain: 4,
    breath: 2.5,
    flicker: 25,
}

const DEFAULT_TRANSITION: Transition = { type: "spring", duration: 3.4, bounce: 0.12 }

const DEFAULTS: LanternLotusProps = {
    background: "#000000",
    petals: 14,
    layers: 4,
    flowerSize: 194,
    colors: DEFAULT_COLORS,
    glow: 5,
    unfurl: true,
    pointer: DEFAULT_POINTER,
    speed: 5,
    spin: 1,
    float: 4,
    transition: {
        defaultValue: {"ease":[0.44,0,0.56,1],"type":"tween","delay":0,"duration":3.4},"type":"spring","stiffness":800,"damping":60,"mass":1,"duration":3.4,"bounce":0.12},
    advanced: DEFAULT_ADVANCED,
}

type Config = {
    petals: number
    layers: number
    flowerSize: number
    colors: Required<LanternLotusColors>
    glow: number
    unfurl: boolean
    pointer: Required<LanternLotusPointer>
    speed: number
    spin: number
    float: number
    advanced: Advanced
}

/* ------------------------------------------------------------------ helpers */

function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo))
}

function smooth01(x: number) {
    const t = clamp(x, 0, 1)
    return t * t * (3 - 2 * t)
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

/** A panel colour in linear light. three's Color parses hex, rgb() and hsl()
 * and converts from sRGB itself; anything else keeps the fallback. */
function linearColor(input: string | undefined, fallback: string): THREE.Color {
    const c = new THREE.Color(fallback)
    if (typeof input === "string" && /^(#|rgb|hsl)/i.test(input.trim())) c.setStyle(input.trim())
    return c
}

/* ------------------------------------------------------------------ the form --
 * The four whorls, outermost first. Angles are from vertical. Each petal's
 * spine leaves its base at `tilt` and turns `bend` radians upward over its
 * length, so outer petals spread and curl up while inner ones stand. In the
 * bud every petal starts at `bud` and curls inward to close over the dome.
 */

type LayerSpec = {
    share: number
    tilt: number
    bend: number
    length: number
    width: number
    cup: number
    r0: number
    h0: number
    bud: number
    curl: number
}

const LAYERS: LayerSpec[] = [
    { share: 1, tilt: 108, bend: 0.6, length: 0.95, width: 0.28, cup: 0.55, r0: 0.12, h0: -0.3, bud: 34, curl: 0.5 },
    { share: 1, tilt: 55, bend: 0.7, length: 0.9, width: 0.26, cup: 0.65, r0: 0.12, h0: -0.2, bud: 26, curl: 0.8 },
    { share: 0.875, tilt: 28, bend: 0.4, length: 0.8, width: 0.22, cup: 0.75, r0: 0.17, h0: -0.12, bud: 17, curl: 1 },
    { share: 0.625, tilt: 30, bend: 0.3, length: 0.36, width: 0.17, cup: 0.8, r0: 0.22, h0: -0.04, bud: 9, curl: 0.6 },
]

/** Every vertex carries its petal's whole description; the vertex shader
 * shapes the petal from it, so opening and breathing cost nothing on the CPU. */
function buildPetals(count: number, layers: number, seed: number): THREE.BufferGeometry {
    const rng = mulberry32(seed * 7919 + 13)
    const first = LAYERS.length - clamp(Math.round(layers), 1, LAYERS.length)
    const uv: number[] = []
    const shape: number[] = []
    const bend: number[] = []
    const meta: number[] = []
    const index: number[] = []
    let base = 0
    for (let li = first; li < LAYERS.length; li++) {
        const L = LAYERS[li]
        const n = Math.max(3, Math.round(clamp(count, 3, 16) * L.share))
        const step = TAU / n
        const offset = li * 0.5 * step + (rng() - 0.5) * 0.3 * step
        for (let j = 0; j < n; j++) {
            const phi = offset + j * step + (rng() - 0.5) * 0.14 * step
            const tilt = (L.tilt + (rng() - 0.5) * 8) * DEG
            const len = L.length * (1 + (rng() - 0.5) * 0.12)
            const wid = L.width * (1 + (rng() - 0.5) * 0.12)
            // Shingled: every other petal sits a touch outside its neighbours,
            // so overlapping edges pass in front instead of through each other.
            const stagger = j % 2 ? 0.022 : 0
            const s = rng()
            for (let i = 0; i <= PETAL_U; i++) {
                for (let k = 0; k <= PETAL_V; k++) {
                    uv.push(i / PETAL_U, (k / PETAL_V) * 2 - 1)
                    shape.push(phi, tilt, len, wid)
                    bend.push(L.cup, L.bend, L.r0 + stagger, L.h0 - stagger)
                    meta.push(s, li, L.bud * DEG, L.curl)
                }
            }
            const row = PETAL_V + 1
            for (let i = 0; i < PETAL_U; i++) {
                for (let k = 0; k < PETAL_V; k++) {
                    const a = base + i * row + k
                    index.push(a, a + row, a + 1, a + 1, a + row, a + row + 1)
                }
            }
            base += (PETAL_U + 1) * row
        }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(base * 3), 3))
    g.setAttribute("aUv", new THREE.Float32BufferAttribute(uv, 2))
    g.setAttribute("aShape", new THREE.Float32BufferAttribute(shape, 4))
    g.setAttribute("aBend", new THREE.Float32BufferAttribute(bend, 4))
    g.setAttribute("aMeta", new THREE.Float32BufferAttribute(meta, 4))
    g.setIndex(index)
    return g
}

/** The seed dome: a core with beads packed over its cap, each bead shaded
 * darker where it faces into the dome. */
function buildPod(seed: number): THREE.BufferGeometry {
    const rng = mulberry32(seed * 104729 + 7)
    const sphere = new THREE.SphereGeometry(1, 14, 10)
    const sp = sphere.attributes.position.array
    const sn = sphere.attributes.normal.array
    const si = sphere.index ? sphere.index.array : []
    const pos: number[] = []
    const nor: number[] = []
    const ao: number[] = []
    const seeds: number[] = []
    const index: number[] = []
    const add = (cx: number, cy: number, cz: number, r: number, dir: THREE.Vector3 | null, s: number) => {
        const start = pos.length / 3
        for (let i = 0; i < sp.length; i += 3) {
            pos.push(cx + sp[i] * r, cy + sp[i + 1] * r, cz + sp[i + 2] * r)
            nor.push(sn[i], sn[i + 1], sn[i + 2])
            const facing = dir ? sn[i] * dir.x + sn[i + 1] * dir.y + sn[i + 2] * dir.z : 0
            ao.push(dir ? 0.3 + 0.7 * (facing * 0.5 + 0.5) : 0.5)
            seeds.push(s)
        }
        for (let i = 0; i < si.length; i++) index.push(start + si[i])
    }
    add(0, POD_CENTER_Y, 0, POD_R * 0.9, null, 0.5)
    // The receptacle under the whorls, so no gap between the outer petals'
    // bases shows the dark through the flower.
    add(0, RECEPTACLE_Y, 0, RECEPTACLE_R, null, 0.5)
    const golden = Math.PI * (3 - Math.sqrt(5))
    const cosMax = Math.cos(POD_CAP)
    for (let i = 0; i < POD_BEADS; i++) {
        const ct = 1 - ((i + 0.5) / POD_BEADS) * (1 - cosMax)
        const st = Math.sqrt(1 - ct * ct)
        const psi = i * golden
        const dir = new THREE.Vector3(st * Math.cos(psi), ct, st * Math.sin(psi))
        const theta = Math.acos(ct)
        const r = POD_R * (0.3 - 0.1 * (theta / POD_CAP)) * (0.9 + 0.2 * rng())
        add(dir.x * POD_R, POD_CENTER_Y + dir.y * POD_R, dir.z * POD_R, r, dir, rng())
    }
    sphere.dispose()
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3))
    g.setAttribute("aAo", new THREE.Float32BufferAttribute(ao, 1))
    g.setAttribute("aBead", new THREE.Float32BufferAttribute(seeds, 1))
    g.setIndex(index)
    return g
}

function buildMotes(count: number, seed: number): THREE.BufferGeometry {
    const rng = mulberry32(seed * 31337 + 5)
    const n = Math.max(0, Math.round(count))
    const data = new Float32Array(n * 4)
    for (let i = 0; i < n; i++) {
        data[i * 4] = (rng() * 2 - 1) * MOTE_BOX.x
        data[i * 4 + 1] = (rng() * 2 - 1) * MOTE_BOX.y
        data[i * 4 + 2] = (rng() * 2 - 1) * MOTE_BOX.z
        data[i * 4 + 3] = rng()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3))
    g.setAttribute("aMote", new THREE.Float32BufferAttribute(data, 4))
    return g
}

/* ------------------------------------------------------------------ shaders */

/** Brightest the scene pass may store, and the most one pixel may hand the
 * bloom. The bloom's blur is separable, so whatever one pixel feeds it comes
 * out as a hard-edged rectangle — a single NaN, or a pixel thousands of times
 * too bright, was the red box that appeared over the flower. GPUs differ on
 * what a zero-length normalize or an out-of-range decode gives, so every
 * stage that feeds the next is held finite and in range. */
const SCENE_MAX = 64
const FIREFLY = 12

const GUARDS = /* glsl */ `
vec3 finite(vec3 c) {
    return (any(isnan(c)) || any(isinf(c))) ? vec3(0.0) : c;
}
vec3 safeNormalize(vec3 v, vec3 fallback) {
    float l2 = dot(v, v);
    return l2 > 1e-12 ? v * inversesqrt(l2) : fallback;
}
// Undoes the scene pass's c / (1 + max c). The floor is that encoding of
// SCENE_MAX, so nothing decodes brighter than the scene could have stored.
vec3 decode(vec3 c) {
    return c / max(1.0 - max(c.r, max(c.g, c.b)), ${(1 / (1 + SCENE_MAX)).toFixed(5)});
}
`

const PETAL_VERTEX = /* glsl */ `
attribute vec2 aUv;
attribute vec4 aShape;  // azimuth, open tilt, length, half width
attribute vec4 aBend;   // cup, bend, base radius, base height
attribute vec4 aMeta;   // seed, whorl, bud tilt, tip curl
uniform float uOpen;
uniform float uTime;
uniform float uBreath;
uniform float uCup;
uniform float uCurl;
varying vec3 vPos;
varying vec3 vNormal;
varying vec2 vUv;
varying float vLayer;
varying float vSeed;
varying float vAo;

const float PI = 3.14159265359;
// How far a closed bud's petals curl inward over their length.
const float BUD_BEND = 1.05;

vec3 petal(float u, float v) {
    float open = clamp(uOpen, 0.0, 1.25);
    float o1 = min(open, 1.0);
    float L = aShape.z;
    // Each petal breathes on its own phase; the outer ones, freer, more.
    float breath = uBreath * sin(uTime * 0.83 + aMeta.x * 6.2832) * (1.2 - 0.15 * aMeta.y);
    float a0 = mix(aMeta.z, aShape.y, open) + breath;
    float k = mix(BUD_BEND, aBend.y, o1) / L;
    k = max(k, 0.001);
    float a = a0 - k * u * L;
    // The spine, integrated in closed form: it turns at a constant rate.
    float r = aBend.z * mix(0.55, 1.0, o1) + (cos(a) - cos(a0)) / k;
    float h = aBend.w + (sin(a0) - sin(a)) / k;
    float phi = aShape.x;
    vec3 R = vec3(cos(phi), 0.0, sin(phi));
    vec3 T = vec3(-sin(phi), 0.0, cos(phi));
    vec3 inward = -R * cos(a) + vec3(0.0, sin(a), 0.0);
    // Narrow base, broad ovate body, then a pointed nib: (1 - u)^0.5 keeps
    // the shoulders full almost to the end. 1.93 makes the widest 1.
    float w = aShape.w * 1.93 * pow(u, 0.45) * pow(1.0 - u, 0.5);
    float cup = aBend.x * uCup * mix(1.5, 1.0, o1);
    float tip = smoothstep(0.72, 1.0, u);
    float lift = cup * w * v * v - aMeta.w * uCurl * tip * tip * L * 0.14;
    // No hand-made petal is symmetric.
    lift += (aMeta.x - 0.5) * 0.06 * v * w * u;
    return R * r + vec3(0.0, h, 0.0) + T * (v * w) + inward * lift;
}

void main() {
    float u = aUv.x;
    float v = aUv.y;
    vec3 P = petal(u, v);
    float uc = clamp(u, 0.03, 0.97);
    float vc = clamp(v, -0.97, 0.97);
    vec3 du = petal(uc + 0.004, vc) - petal(uc - 0.004, vc);
    vec3 dv = petal(uc, vc + 0.03) - petal(uc, vc - 0.03);
    vec3 N = normalize(cross(du, dv));
    vec4 wp = modelMatrix * vec4(P, 1.0);
    vPos = wp.xyz;
    vNormal = normalize(mat3(modelMatrix) * N);
    vUv = aUv;
    vLayer = aMeta.y;
    vSeed = aMeta.x;
    // Deep in the flower, between the bases, little light gets out.
    vAo = mix(0.42, 1.0, smoothstep(0.0, 0.38, u));
    gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const POD_VERTEX = /* glsl */ `
attribute float aAo;
attribute float aBead;
uniform float uOpen;
varying vec3 vPos;
varying vec3 vNormal;
varying vec2 vUv;
varying float vLayer;
varying float vSeed;
varying float vAo;

void main() {
    // The dome rises and swells as the bud opens.
    float g = mix(0.7, 1.0, clamp(uOpen, 0.0, 1.0));
    vec3 P = position * g;
    vec4 wp = modelMatrix * vec4(P, 1.0);
    vPos = wp.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vUv = vec2(0.55, 0.0);
    vLayer = 4.0;
    vSeed = aBead;
    vAo = aAo;
    gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const SKIN_FRAGMENT = /* glsl */ `
uniform vec3 uLampPos;
uniform vec3 uLampColor;
uniform float uLamp;
uniform vec3 uPetal;
uniform vec3 uSheen;
uniform vec3 uKeyDir;
uniform float uAbsorb;
uniform float uIri;
varying vec3 vPos;
varying vec3 vNormal;
varying vec2 vUv;
varying float vLayer;
varying float vSeed;
varying float vAo;

${GUARDS}
const float TAU = 6.28318530718;
const float LAMP_FALLOFF = ${LAMP_FALLOFF.toFixed(3)};
const float FILL = ${FILL.toFixed(3)};
const float FILL_FALLOFF = ${FILL_FALLOFF.toFixed(3)};

void main() {
    // A fold in a half-open bud can interpolate a normal to nothing.
    vec3 N = safeNormalize(vNormal, normalize(cameraPosition - vPos));
    vec3 V = normalize(cameraPosition - vPos);
    // A thin sheet: shade whichever face is toward the eye. Chosen by the
    // triangle's own facing, which is steady; the sign of the interpolated
    // normal against the view wobbles pixel to pixel along a silhouette and
    // made the outlines crawl.
    if (!gl_FrontFacing) N = -N;
    float facing = abs(dot(N, V));
    float NoV = max(facing, 0.001);
    vec3 Lv = uLampPos - vPos;
    float d2 = dot(Lv, Lv);
    float d = sqrt(d2);
    vec3 L = Lv / max(d, 1e-4);
    float NoL = dot(N, L);
    vec3 lamp = uLampColor * (uLamp / (1.0 + d2 * LAMP_FALLOFF));

    float u = vUv.x;
    float av = abs(vUv.y);
    float pod = step(3.5, vLayer);
    float petal = 1.0 - pod;
    // Resin thickness: heavier at the base and in the nib, with faint veins.
    float tipT = smoothstep(0.8, 1.0, u) * petal;
    // The light-piped outline is never drawn thinner than ~3 pixels: on a
    // small or edge-on petal a sub-pixel line sparkles as it moves. Widened,
    // it dims to keep the same total light.
    float rimW = max(0.13, 3.0 * fwidth(av));
    float rim = smoothstep(0.97 - rimW, 0.97, av) * (0.13 / rimW) * petal * (1.0 - 0.5 * tipT);
    float vein = 0.5 + 0.5 * cos(vUv.y * 30.0 + sin(u * 4.0 + vSeed * 9.0) * 0.6);
    // Veins fade out once they are finer than a couple of pixels — on a small
    // or edge-on petal they would otherwise shimmer as it moves.
    vein = mix(vein, 0.5, smoothstep(0.6, 1.6, fwidth(vUv.y) * 30.0));
    float thick = 0.8 + 1.1 * tipT + 0.6 * pow(1.0 - u, 3.0) + 0.06 * vein * petal;
    thick = mix(thick, 1.15, pod);

    // Beer–Lambert: light that crossed more resin is deeper rose. Seen edge
    // on, the path through the sheet is longer.
    float path = thick * uAbsorb / max(NoV, 0.45);
    // Resin right by the lamp is lit through its near skin only, so it
    // burns pale gold instead of rose: the still's hot spot.
    path *= 0.15 + 0.85 * smoothstep(0.08, 0.6, d);
    vec3 deep = pow(uPetal, vec3(path));
    vec3 shallow = pow(uPetal, vec3(path * 0.45));
    float back = clamp(-NoL * 0.75 + 0.25, 0.0, 1.0);
    float front = clamp(NoL * 0.7 + 0.3, 0.0, 1.0);
    float through = pow(clamp(dot(V, -L), 0.0, 1.0), 8.0);
    vec3 col = lamp * (deep * (back * 0.8 + through * 1.8) + shallow * front * 0.35);
    // Light scattered through the resin: no direction left in it, so every
    // petal glows from within rather than shading like a solid.
    vec3 fill = mix(uLampColor, vec3(1.0), 0.35) * (uLamp * FILL / (1.0 + d2 * FILL_FALLOFF));
    col += fill * mix(deep, shallow, 0.4);
    // Rounded edges pipe light along the outline.
    col += (lamp + fill) * pow(uPetal, vec3(0.5)) * rim * 0.8;
    col *= vAo;

    // Thin-film sheen on the coating: cool, iridescent, strongest at grazing.
    vec3 R = reflect(-V, N);
    // Capped short of grazing: left to reach 1 at the silhouette it paints a
    // one-pixel line that no amount of multisampling smooths.
    float F = 0.04 + 0.96 * pow(1.0 - max(NoV, 0.22), 5.0);
    vec3 film = 0.5 + 0.5 * cos(TAU * (NoV * 1.7 + vSeed * 0.15 + vec3(0.0, 0.33, 0.67)));
    float sky = 0.3 + 0.7 * clamp(dot(R, uKeyDir) * 0.5 + 0.5, 0.0, 1.0);
    // Where the lamp shines through, its light swamps the reflection; the
    // sheen shows on the petals it barely reaches, as in the still.
    float swamp = 1.0 / (1.0 + 2.5 * dot(lamp, vec3(0.333)));
    col += uSheen * mix(vec3(1.0), film, 0.55) * (0.15 + 1.5 * F) * sky * uIri * mix(1.0, 0.6, pod) * swamp;

    // Gloss: the key, and the lamp itself on the inner faces.
    vec3 H = safeNormalize(uKeyDir + V, N);
    col += mix(vec3(1.0), uSheen, 0.35) * pow(max(dot(N, H), 0.0), 80.0) * 0.5;
    // L + V is zero exactly where the lamp sits straight behind the petal —
    // the transmission case this material is built around.
    vec3 Hl = safeNormalize(L + V, N);
    col += lamp * pow(max(dot(N, Hl), 0.0), 60.0) * 0.3;

    // Stored compressed, c / (1 + max c), and expanded after the multisample
    // resolve. Resolved raw, an edge pixel half lamp-lit petal (5.0) and half
    // black averages to 2.5 — still white after the filmic curve — so bright
    // outlines would get no antialiasing and crawl as the petals move.
    col = clamp(finite(col), 0.0, ${SCENE_MAX.toFixed(1)});
    gl_FragColor = vec4(col / (1.0 + max(col.r, max(col.g, col.b))), 1.0);
}
`

const MOTE_VERTEX = /* glsl */ `
attribute vec4 aMote;
uniform float uTime;
uniform float uPx;
varying float vA;

void main() {
    vec3 p = aMote.xyz;
    float s = aMote.w;
    p.y = mod(p.y + uTime * 0.05 * (0.4 + s) + ${MOTE_BOX.y.toFixed(1)}, ${(MOTE_BOX.y * 2).toFixed(1)}) - ${MOTE_BOX.y.toFixed(1)};
    p.x += sin(uTime * 0.3 + s * 20.0) * 0.08;
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPx * (1.0 + 1.5 * s) * 14.0 / max(-mv.z, 0.1);
    float edge = smoothstep(${MOTE_BOX.y.toFixed(1)}, ${(MOTE_BOX.y * 0.8).toFixed(1)}, abs(p.y));
    vA = (0.25 + 0.75 * fract(s * 7.0)) * edge * (0.55 + 0.45 * sin(uTime * (0.6 + s) + s * 40.0));
}
`

const MOTE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vA;

void main() {
    float r = length(gl_PointCoord - 0.5);
    // Premultiplied, for the screen blend: a mote brightens what is behind
    // it but can never push the scene's stored value past 1.
    float a = vA * smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(uColor * a, a);
}
`

const QUAD_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const BRIGHT_FRAGMENT = /* glsl */ `
uniform sampler2D tMap;
uniform float uThreshold;
varying vec2 vUv;
${GUARDS}
void main() {
    vec3 c = finite(decode(texture2D(tMap, vUv).rgb));
    float l = max(c.r, max(c.g, c.b));
    // No single pixel feeds the bloom more than FIREFLY.
    c *= min(1.0, ${FIREFLY.toFixed(1)} / max(l, 1e-4));
    l = min(l, ${FIREFLY.toFixed(1)});
    // Soft knee: brightness eases into the bloom instead of switching on.
    float k = clamp((l - uThreshold * 0.5) / uThreshold, 0.0, 1.0);
    gl_FragColor = vec4(c * k * k, 1.0);
}
`

const BLUR_FRAGMENT = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
    vec3 c = texture2D(tMap, vUv).rgb * 0.2270270270;
    c += texture2D(tMap, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
    c += texture2D(tMap, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
    c += texture2D(tMap, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
    c += texture2D(tMap, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(c, 1.0);
}
`

const COMPOSITE_FRAGMENT = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tNear;
uniform sampler2D tWide;
uniform float uNear;
uniform float uWide;
uniform float uExposure;
uniform float uGrain;
varying vec2 vUv;
${GUARDS}

vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
// Arithmetic hash: sin() of large pixel coordinates loses precision on some
// GPUs and draws visible patterns.
float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
}

void main() {
    vec4 s = texture2D(tScene, vUv);
    vec3 c = decode(s.rgb) + texture2D(tNear, vUv).rgb * uNear + texture2D(tWide, vUv).rgb * uWide;
    c = aces(finite(c) * uExposure);
    c = pow(c, vec3(1.0 / 2.2));
    // Film grain, heavier in the light as it is on film. Fixed, not redrawn
    // every frame: re-rolled at 60 fps it fizzes over the flower.
    c += (hash(gl_FragCoord.xy) - 0.5) * uGrain * (0.25 + c);
    c = max(c, 0.0);
    // Premultiplied over the frame's own Background.
    float a = clamp(max(s.a, max(c.r, max(c.g, c.b))), 0.0, 1.0);
    gl_FragColor = vec4(min(c, vec3(a)), a);
}
`

/* -------------------------------------------------------------------- scene */

class LotusScene {
    private host: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60)
    private pose = new THREE.Group()
    private turn = new THREE.Group()
    private petals: THREE.Mesh
    private pod: THREE.Mesh
    private motes: THREE.Points
    private petalMat: THREE.ShaderMaterial
    private podMat: THREE.ShaderMaterial
    private moteMat: THREE.ShaderMaterial
    private skin: Record<string, THREE.IUniform>
    private petalKey = ""
    private podKey = ""
    private moteKey = ""

    private quadScene = new THREE.Scene()
    private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    private quad: THREE.Mesh
    private bright: THREE.ShaderMaterial
    private blur: THREE.ShaderMaterial
    private composite: THREE.ShaderMaterial
    private rtScene: THREE.WebGLRenderTarget
    private rtA1: THREE.WebGLRenderTarget
    private rtA2: THREE.WebGLRenderTarget
    private rtB1: THREE.WebGLRenderTarget
    private rtB2: THREE.WebGLRenderTarget

    private width = 1
    private height = 1
    private dpr = 1
    private raf = 0
    private last = -1
    private t = 0
    private spinA = 0
    private visible = true
    private sized = false
    private drawn = false
    private reduced = false
    private disposed = false
    private io: IntersectionObserver | null = null
    private mq: MediaQueryList | null = null
    private ptr = { x: 0, y: 0, inside: false }
    private px = 0
    private py = 0
    private hover = 0
    private lampLocal = new THREE.Vector3()

    /** The entrance's progress, 0 → 1, read every frame. */
    entry: () => number = () => 1
    /** Set by the host when it renders still, to repaint after a context loss. */
    onRedraw: (() => void) | null = null

    constructor(host: HTMLElement, mount: HTMLElement, cfg: Config) {
        this.host = host
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, premultipliedAlpha: true })
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
        this.dpr = Math.min(window.devicePixelRatio || 1, 2)
        this.renderer.setPixelRatio(this.dpr)
        this.renderer.setClearColor(0x000000, 0)
        const canvas = this.renderer.domElement
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block"
        // three rebuilds its resources when a lost context comes back; a still
        // render (the Framer canvas) also needs painting again, or it stays blank.
        canvas.addEventListener("webglcontextrestored", this.onRestored)
        mount.appendChild(canvas)

        // Half float keeps the lamp's light above 1.0 until the bloom has
        // seen it; without the extension it clips, and still reads.
        const ext = this.renderer.extensions
        // Only the full extension: the scene target is multisampled, and a
        // multisampled half-float buffer needs EXT_color_buffer_float. With
        // just the half-float one it can come up incomplete on some GPUs.
        const floatOk = ext.has("EXT_color_buffer_float")
        const type = floatOk ? THREE.HalfFloatType : THREE.UnsignedByteType
        const opts = { type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }
        // Multisampled: the petal outlines are the whole silhouette.
        this.rtScene = new THREE.WebGLRenderTarget(1, 1, { ...opts, depthBuffer: true, samples: 4 })
        this.rtA1 = new THREE.WebGLRenderTarget(1, 1, opts)
        this.rtA2 = new THREE.WebGLRenderTarget(1, 1, opts)
        this.rtB1 = new THREE.WebGLRenderTarget(1, 1, opts)
        this.rtB2 = new THREE.WebGLRenderTarget(1, 1, opts)

        this.skin = {
            uLampPos: { value: new THREE.Vector3() },
            uLampColor: { value: new THREE.Color() },
            uLamp: { value: 0 },
            uPetal: { value: new THREE.Color() },
            uSheen: { value: new THREE.Color() },
            uKeyDir: { value: KEY_DIR.clone() },
            uAbsorb: { value: 1 },
            uIri: { value: 1 },
            uOpen: { value: 0 },
            uTime: { value: 0 },
            uBreath: { value: 0 },
            uCup: { value: 1 },
            uCurl: { value: 1 },
        }
        // Both materials hold the same uniform objects, so one write lights both.
        this.petalMat = new THREE.ShaderMaterial({
            vertexShader: PETAL_VERTEX,
            fragmentShader: SKIN_FRAGMENT,
            uniforms: { ...this.skin },
            side: THREE.DoubleSide,
        })
        this.podMat = new THREE.ShaderMaterial({
            vertexShader: POD_VERTEX,
            fragmentShader: SKIN_FRAGMENT,
            uniforms: { ...this.skin },
        })
        this.moteMat = new THREE.ShaderMaterial({
            vertexShader: MOTE_VERTEX,
            fragmentShader: MOTE_FRAGMENT,
            uniforms: { uTime: this.skin.uTime, uPx: { value: this.dpr }, uColor: { value: new THREE.Color() } },
            transparent: true,
            depthWrite: false,
            // Screen, not add: the scene buffer holds c / (1 + c), which must
            // stay under 1. Added on top of a bright petal it went over, and
            // decoded to a pixel hundreds of times too bright.
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.OneFactor,
            blendDst: THREE.OneMinusSrcColorFactor,
        })

        this.petals = new THREE.Mesh(new THREE.BufferGeometry(), this.petalMat)
        this.pod = new THREE.Mesh(new THREE.BufferGeometry(), this.podMat)
        this.motes = new THREE.Points(new THREE.BufferGeometry(), this.moteMat)
        // Shaped in the shader: the CPU never knows where the vertices are.
        this.petals.frustumCulled = false
        this.motes.frustumCulled = false
        this.turn.add(this.petals, this.pod)
        this.pose.add(this.turn)
        this.scene.add(this.pose, this.motes)

        this.bright = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: BRIGHT_FRAGMENT,
            uniforms: { tMap: { value: null }, uThreshold: { value: BLOOM_THRESHOLD } },
            depthTest: false,
        })
        this.blur = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: BLUR_FRAGMENT,
            uniforms: { tMap: { value: null }, uDir: { value: new THREE.Vector2() } },
            depthTest: false,
        })
        this.composite = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: COMPOSITE_FRAGMENT,
            uniforms: {
                tScene: { value: this.rtScene.texture },
                tNear: { value: this.rtA1.texture },
                tWide: { value: this.rtB2.texture },
                uNear: { value: BLOOM_NEAR },
                uWide: { value: BLOOM_WIDE },
                uExposure: { value: 1 },
                uGrain: { value: 0 },
            },
            depthTest: false,
        })
        this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bright)
        this.quad.frustumCulled = false
        this.quadScene.add(this.quad)

        this.updateConfig(cfg)

        this.mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        this.reduced = !!this.mq?.matches
        this.mq?.addEventListener?.("change", this.onMq)
        window.addEventListener("pointermove", this.onPointer, { passive: true })
        document.addEventListener("pointerleave", this.onLeave)
        this.io = new IntersectionObserver((entries) => {
            for (const e of entries) this.visible = e.isIntersecting
        })
        this.io.observe(host)
    }

    private onMq = (e: MediaQueryListEvent) => (this.reduced = e.matches)

    private onRestored = () => this.onRedraw?.()

    /** Tracked anywhere in the window, as a share of the frame from its centre. */
    private onPointer = (e: PointerEvent) => {
        const r = this.host.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) return
        this.ptr.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1.5, 1.5)
        this.ptr.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1.5, 1.5)
        this.ptr.inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
    }

    private onLeave = () => {
        this.ptr.x = 0
        this.ptr.y = 0
        this.ptr.inside = false
    }

    updateConfig(cfg: Config) {
        this.cfg = cfg
        const a = cfg.advanced
        const seed = Math.round(a.seed)
        const pk = `${Math.round(cfg.petals)}|${Math.round(cfg.layers)}|${seed}`
        if (pk !== this.petalKey) {
            this.petals.geometry.dispose()
            this.petals.geometry = buildPetals(cfg.petals, cfg.layers, seed)
            this.petalKey = pk
        }
        if (`${seed}` !== this.podKey) {
            this.pod.geometry.dispose()
            this.pod.geometry = buildPod(seed)
            this.podKey = `${seed}`
        }
        const mk = `${Math.round(a.motes)}|${seed}`
        if (mk !== this.moteKey) {
            this.motes.geometry.dispose()
            this.motes.geometry = buildMotes(clamp(a.motes, 0, 400), seed)
            this.moteKey = mk
        }
        ;(this.skin.uPetal.value as THREE.Color).copy(linearColor(cfg.colors.petal, DEFAULT_COLORS.petal))
        ;(this.skin.uLampColor.value as THREE.Color).copy(linearColor(cfg.colors.light, DEFAULT_COLORS.light))
        ;(this.skin.uSheen.value as THREE.Color).copy(linearColor(cfg.colors.sheen, DEFAULT_COLORS.sheen))
        ;(this.moteMat.uniforms.uColor.value as THREE.Color).copy(this.skin.uLampColor.value).multiplyScalar(0.35)
        this.lampLocal.set(a.lampX / 100, a.lampY / 100, a.lampZ / 100)
    }

    setSize(w: number, h: number) {
        const width = Math.max(1, Math.round(w))
        const height = Math.max(1, Math.round(h))
        // Resizing a canvas clears it, even to the size it already has, and
        // the observer fires for changes that leave it the same — a blank
        // frame each time. Only a real change goes through.
        if (this.sized && width === this.width && height === this.height) return
        this.sized = true
        this.width = width
        this.height = height
        // A large frame on a dense screen is drawn at fewer pixels rather than
        // dropping frames, which shows as stutter.
        this.dpr = clamp(Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(TARGET_PIXELS / (width * height))), 0.5, 2)
        this.renderer.setPixelRatio(this.dpr)
        this.moteMat.uniforms.uPx.value = this.dpr
        this.renderer.setSize(this.width, this.height, false)
        const W = Math.round(this.width * this.dpr)
        const H = Math.round(this.height * this.dpr)
        this.rtScene.setSize(W, H)
        this.rtA1.setSize(Math.max(1, W >> 1), Math.max(1, H >> 1))
        this.rtA2.setSize(Math.max(1, W >> 1), Math.max(1, H >> 1))
        this.rtB1.setSize(Math.max(1, W >> 3), Math.max(1, H >> 3))
        this.rtB2.setSize(Math.max(1, W >> 3), Math.max(1, H >> 3))
        // Repaint now rather than on the next frame, so the cleared canvas is
        // never shown.
        // Stepped by zero first, so the camera has the new aspect.
        if (this.drawn) {
            this.step(0)
            this.draw()
        }
    }

    start() {
        const frame = (now: number) => {
            if (this.disposed) return
            this.raf = requestAnimationFrame(frame)
            const dt = this.last < 0 ? 0 : Math.min(0.05, (now - this.last) / 1000)
            this.last = now
            if (!this.visible) return
            this.step(dt)
            this.draw()
        }
        this.raf = requestAnimationFrame(frame)
    }

    renderStatic() {
        if (this.disposed) return
        this.step(0)
        this.draw()
    }

    private step(dt: number) {
        const c = this.cfg
        const a = c.advanced
        const p = c.pointer
        const still = this.reduced
        this.t += dt * (still ? 0 : Math.max(0, c.speed) / 5)
        this.spinA += dt * (still ? 0 : c.spin * SPIN_UNIT)

        const follow = p.follow && !still
        const k = 1 - Math.exp(-dt * (SMOOTH_FAST + (SMOOTH_SLOW - SMOOTH_FAST) * (clamp(p.smoothing, 0, 10) / 10)))
        this.px += ((follow ? this.ptr.x : 0) - this.px) * k
        this.py += ((follow ? this.ptr.y : 0) - this.py) * k
        this.hover += ((follow && this.ptr.inside ? 1 : 0) - this.hover) * (1 - Math.exp(-dt * 3))

        const e = this.entry()
        const t = this.t
        const fl = Math.max(0, c.float)
        const tilt = Math.max(0, p.tilt) * TILT_UNIT
        // Leans toward the pointer: its top toward the side the pointer is on,
        // its face toward the viewer when the pointer drops below it.
        this.pose.rotation.set(
            this.py * tilt * 0.7 + fl * FLOAT_SWAY * Math.sin(t * 0.37 + 1),
            0,
            -this.px * tilt + fl * FLOAT_SWAY * Math.sin(t * 0.29)
        )
        this.pose.position.y = fl * FLOAT_BOB * Math.sin(t * 0.55)
        this.pose.scale.setScalar(ENTRY_SCALE + (1 - ENTRY_SCALE) * Math.min(1, e))
        this.turn.rotation.y = this.spinA + (1 - Math.min(1, e)) * ENTRY_TURN
        this.pose.updateMatrixWorld(true)

        const hoverGlow = Math.max(0, p.hoverGlow) * this.hover
        const open = (c.unfurl ? e : 1) + 0.012 * Math.sin(t * 0.6) + hoverGlow * HOVER_OPEN
        const fk = clamp(a.flicker, 0, 100) / 100
        // A slow waver, all under ~1 Hz. Faster terms (there were 2–4 Hz ones)
        // read as the picture stuttering, not as a lamp breathing.
        const flicker = 1 + fk * 0.12 * (0.6 * Math.sin(t * 1.9) + 0.4 * Math.sin(t * 4.3 + 1.3))
        const lit = c.unfurl ? smooth01(e * 1.2) : smooth01(e * 3)
        const s = this.skin
        s.uOpen.value = open
        s.uTime.value = t
        s.uBreath.value = still ? 0 : clamp(a.breath, 0, 15) * DEG
        s.uCup.value = clamp(a.cup, 0, 300) / 100
        s.uCurl.value = clamp(a.tipCurl, 0, 300) / 100
        s.uAbsorb.value = clamp(a.absorption, 0, 400) / 100
        s.uIri.value = clamp(a.iridescence, 0, 200) / 100
        s.uLamp.value = LAMP_REF * (Math.max(0, c.glow) / 5) * lit * flicker * (1 + hoverGlow * HOVER_GLOW)
        ;(s.uLampPos.value as THREE.Vector3).copy(this.lampLocal).applyMatrix4(this.pose.matrixWorld)

        // Framing: the flower's width is FIT_SHARE of the short side at 100%.
        const aspect = this.width / this.height
        const share = FIT_SHARE * (clamp(c.flowerSize, 10, 400) / 100)
        const visibleH = (FLOWER_WIDTH * this.height) / (share * Math.min(this.width, this.height))
        const dist = visibleH / (2 * Math.tan((FOV * DEG) / 2))
        const el = clamp(a.elevation, -10, 89) * DEG
        this.camera.aspect = aspect
        this.camera.near = Math.max(0.05, dist - 6)
        this.camera.far = dist + 8
        this.camera.position.set(0, TARGET_Y + dist * Math.sin(el), dist * Math.cos(el))
        this.camera.lookAt(0, TARGET_Y, 0)
        this.camera.updateProjectionMatrix()

        const cu = this.composite.uniforms
        cu.uExposure.value = clamp(a.exposure, 0, 400) / 100
        cu.uNear.value = BLOOM_NEAR * (clamp(a.bloom, 0, 400) / 100)
        cu.uWide.value = BLOOM_WIDE * (clamp(a.bloom, 0, 400) / 100) * Math.min(1, e * 2)
        cu.uGrain.value = (clamp(a.grain, 0, 100) / 100) * 0.5
        this.motes.visible = a.motes > 0
    }

    private pass(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
        this.quad.material = mat
        this.renderer.setRenderTarget(target)
        this.renderer.render(this.quadScene, this.quadCam)
    }

    private blurPass(src: THREE.WebGLRenderTarget, dst: THREE.WebGLRenderTarget, dx: number, dy: number) {
        const radius = clamp(this.cfg.advanced.bloomRadius, 0, 400) / 100
        this.blur.uniforms.tMap.value = src.texture
        ;(this.blur.uniforms.uDir.value as THREE.Vector2).set((dx * radius) / src.width, (dy * radius) / src.height)
        this.pass(this.blur, dst)
    }

    private draw() {
        this.drawn = true
        const r = this.renderer
        r.setRenderTarget(this.rtScene)
        r.setClearColor(0x000000, 0)
        r.clear()
        r.render(this.scene, this.camera)

        this.bright.uniforms.tMap.value = this.rtScene.texture
        this.pass(this.bright, this.rtA1)
        this.blurPass(this.rtA1, this.rtA2, 1, 0)
        this.blurPass(this.rtA2, this.rtA1, 0, 1)
        // The wide level: down to an eighth and blurred twice — the haze.
        this.blurPass(this.rtA1, this.rtB1, 1, 0)
        this.blurPass(this.rtB1, this.rtB2, 0, 1)
        this.blurPass(this.rtB2, this.rtB1, 1, 0)
        this.blurPass(this.rtB1, this.rtB2, 0, 1)
        this.pass(this.composite, null)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.raf)
        this.io?.disconnect()
        this.mq?.removeEventListener?.("change", this.onMq)
        window.removeEventListener("pointermove", this.onPointer)
        this.renderer.domElement.removeEventListener("webglcontextrestored", this.onRestored)
        document.removeEventListener("pointerleave", this.onLeave)
        for (const g of [this.petals.geometry, this.pod.geometry, this.motes.geometry, this.quad.geometry]) g.dispose()
        for (const m of [this.petalMat, this.podMat, this.moteMat, this.bright, this.blur, this.composite]) m.dispose()
        for (const t of [this.rtScene, this.rtA1, this.rtA2, this.rtB1, this.rtB2]) t.dispose()
        this.renderer.dispose()
        // Hand the context back now. Left to the garbage collector, a few
        // remounts (Framer re-mounts on some edits) pass the browser's limit
        // and it starts dropping the oldest live context — a lotus going blank.
        this.renderer.forceContextLoss()
        this.renderer.domElement.remove()
    }
}

/** Drawn once rather than animated: the editing canvas, and the thumbnails
 * and exports Framer renders from it — each would otherwise run a live loop
 * on its own WebGL context. */
function isStatic(): boolean {
    try {
        const t = RenderTarget.current()
        return t === RenderTarget.canvas || t === RenderTarget.thumbnail || t === RenderTarget.export
    } catch {
        return false
    }
}

/* ---------------------------------------------------------------- component */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 760
 */
export default function LanternLotus(props: Partial<LanternLotusProps>) {
    const {
        background = DEFAULTS.background,
        petals = DEFAULTS.petals,
        layers = DEFAULTS.layers,
        flowerSize = DEFAULTS.flowerSize,
        colors = DEFAULTS.colors,
        glow = DEFAULTS.glow,
        unfurl = DEFAULTS.unfurl,
        pointer = DEFAULTS.pointer,
        speed = DEFAULTS.speed,
        spin = DEFAULTS.spin,
        float = DEFAULTS.float,
        transition = {"ease":[0.44,0,0.56,1],"type":"tween","delay":0,"duration":3.4},
        advanced = DEFAULTS.advanced,
        style,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const mountRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<LotusScene | null>(null)
    // 0 on the server and on first paint alike, so nothing mismatches.
    const entry: MotionValue<number> = useMotionValue(0)
    // The bud is visible from the start of the unfurl; it starts at 0.002,
    // not 0, so the browser composites the canvas before the entrance runs.
    const fade = useTransform(entry, [0, 0.12], [0.002, 1])
    const inView = useInView(hostRef, { once: true, amount: 0.2 })
    const [ready, setReady] = useState(false)

    // Rebuilt per render and read by the scene, so a slider drag lands on the
    // next frame without the renderer ever being torn down.
    const cfg: Config = {
        petals,
        layers,
        flowerSize,
        colors: { ...DEFAULT_COLORS, ...colors },
        glow,
        unfurl,
        pointer: { ...DEFAULT_POINTER, ...pointer },
        speed,
        spin,
        float,
        advanced: { ...DEFAULT_ADVANCED, ...advanced },
    }
    const cfgRef = useRef<Config>(cfg)
    cfgRef.current = cfg
    const cfgKey = JSON.stringify(cfg)
    const transitionKey = JSON.stringify(transition ?? null)

    /* ---- the entrance: declared before the renderer so a static paint sees 1 */

    useEffect(() => {
        const reduced =
            typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        if (isStatic() || reduced) {
            entry.set(1)
            sceneRef.current?.renderStatic()
            return
        }
        if (!inView || !ready) {
            entry.set(0)
            return
        }
        // Replays whenever the curve changes, so it can be judged by editing it.
        entry.set(0)
        const controls = animate(entry, 1, transition as ValueAnimationTransition<number>)
        return () => controls.stop()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView, ready, transitionKey])

    /* ---- the renderer, built once ---- */

    useEffect(() => {
        const host = hostRef.current
        const mount = mountRef.current
        if (!host || !mount) return
        let scene: LotusScene
        try {
            scene = new LotusScene(host, mount, cfgRef.current)
        } catch {
            // No WebGL — an empty ground rather than a thrown render.
            return
        }
        sceneRef.current = scene
        scene.entry = () => entry.get()
        scene.setSize(host.clientWidth, host.clientHeight)
        const still = isStatic()
        if (still) scene.onRedraw = () => scene.renderStatic()
        if (still) scene.renderStatic()
        else scene.start()
        setReady(true)

        const ro = new ResizeObserver(() => {
            scene.setSize(host.clientWidth, host.clientHeight)
            if (still) scene.renderStatic()
        })
        ro.observe(host)
        return () => {
            ro.disconnect()
            scene.dispose()
            sceneRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const scene = sceneRef.current
        if (!scene) return
        scene.updateConfig(cfgRef.current)
        if (isStatic()) scene.renderStatic()
    }, [cfgKey])

    return (
        <div
            ref={hostRef}
            role="img"
            aria-label="A glowing pink lotus"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                backgroundColor: background,
                userSelect: "none",
                ...style,
            }}
        >
            <motion.div ref={mountRef} style={{ position: "absolute", inset: 0, opacity: fade }} />
        </div>
    )
}

LanternLotus.displayName = "Lantern Lotus"
LanternLotus.defaultProps = { ...DEFAULTS }

/* ---------------------------------------------------------------- controls -- */
