"use client"

import { animate } from "motion/react"
import type { AnimationPlaybackControls, Transition } from "motion/react"
import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"
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

/* ------------------------------------------------------------------ *
 *  OnyxRiddle
 *
 *  A puzzle cube (2x2, 3x3 or 4x4; Grid) in satin black plastic hanging
 *  in a pale studio, seen from below. Every outer tile carries one letter
 *  of a word, so each side of the solved cube spells it; a red light to its right
 *  warms one side into ember, and red glows inside it wherever the
 *  layers part.
 *
 *  Built after a "TYPE" puzzle-cube still (736 x 736). Read off it and
 *  kept as the defaults:
 *    - the view: the cube turned 45 deg to the lens so the front and
 *      right faces read equally, looked up at from below so the bottom
 *      face shows; a long lens, so the cube barely keystones;
 *    - the pose: the top layer caught a fifth of a turn into a twist
 *      (Twist), parted from the bottom layer far enough to show the red
 *      mechanism inside;
 *    - the cubelets: tight, glossy edges that each carry a hairline glint;
 *      every face a button set in a frame: a flat dark frame, a narrow
 *      V-groove (the dark line), and the panel's rounded shoulder rising
 *      out of it (the light line) to a flat, paler satin top;
 *    - the type: a geometric sans set white in the panels, a cap height
 *      about half the face. The still prints the bottom face as a faint
 *      hairline; here every face takes the chosen weight (Advanced >
 *      Bottom Ink fades the underside back toward the still);
 *    - the light: a broad soft box overhead for the edge glints, a pale
 *      room for the dark grey of the front, a warm floor for the brown
 *      underside, and a big red source low behind the right that turns
 *      the right face from umber at the top to vermilion at the bottom.
 *
 *  What the still cannot show and this adds: it is a working puzzle.
 *  Between holds it snaps the top layer square, scrambles a few quarter
 *  turns, holds, and undoes them in reverse so the word re-forms, then
 *  eases back into the still's twist. Every turn is played on the
 *  Transition.
 *
 *  HOW IT IS MADE
 *    Plain three.js. Each cubelet is a rounded box; the panel recess,
 *    the letters and the red inner faces are drawn in its material from
 *    its own object-space position, so they turn with it. The studio is
 *    generated and pre-filtered once (and again when Glow changes); the
 *    only direct light is the red one inside the core, which sits in a
 *    three-armed mechanism like a real cube's. Only the cubelets that
 *    show are built (the hidden middle of a 3x3 or 4x4 is the core), and
 *    the whole cube is scaled by 2/Grid so every size fills the frame the
 *    way the 2x2 still does. Seams darken where a
 *    neighbour shades them, and the plastic's gloss wanders slightly, so
 *    no face reads as a perfect render.
 *
 *  Interaction
 *    Drag   spins the cube; let go and it springs back to the pose.
 *    Tap    twists the layer under the pointer; the cube undoes it on
 *           its next solve.
 *    Hover  the cube leans toward the pointer (Parallax), and the cubelet
 *           under it rises a touch off the rest.
 *
 *  Frames are paced: 60 fps while anything turns, 30 fps for the idle
 *  float, none at all once it has settled with Speed at 0.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 736
 * @framerIntrinsicHeight 736
 * ------------------------------------------------------------------ */

/* ----------------------------------------------------------- types */

export interface OnyxRiddleAdvanced {
    /** Vertical field of view, deg. */
    lens: number
    /** Camera turn around the cube, deg. */
    yaw: number
    /** Camera height, deg; negative looks up from below. */
    pitch: number
    /** Edge rounding, % of a cubelet. */
    round: number
    /** Seam between cubelets, % of a cubelet. */
    seam: number
    /** How far the twisted layer lifts off the rest, % of a cubelet. */
    part: number
    /** Panel size, % of a face. */
    panel: number
    /** Letter cap height, % of a face. */
    letter: number
    /** Surface roughness, %. */
    roughness: number
    /** Clear coat, %. */
    coat: number
    /** Strength of the red side light, %. */
    sideLight: number
    /** Strength of the glow inside, %. */
    inner: number
    /** Opacity of the letters on the bottom face, %. */
    ghost: number
    /** Exposure, %. */
    exposure: number
    /** Idle bob and sway, %. */
    float: number
    /** Quarter turns per scramble. */
    moves: number
    /** Seconds before the cube spins in. */
    delay: number
}

export interface OnyxRiddleColors {
    /** The plastic: the frame round each panel, the edges and the seams. */
    body: string
    /** The panel inset in every face. */
    panel: string
    /** Optional panel colour per side, front, right, bottom, top, back,
     *  left; the list repeats to cover all six. Empty uses Panel. */
    faces: string[]
    /** The red that lights the right side and glows inside. */
    glow: string
}

export interface OnyxRiddlePlacement {
    /** Moves the cube across the frame, % of its width; positive is right. */
    x: number
    /** Moves the cube down the frame, % of its height; positive is down. */
    y: number
    /** Turns the cube in the picture plane about its centre, deg; positive is clockwise. */
    angle: number
    /** Leans the cube about the frame's horizontal, deg; positive tips its top away. */
    tilt: number
}

export interface OnyxRiddleProps {
    /** One word per face, four letters each, laid out front, right,
     *  bottom, top, back, left; the list repeats to cover all six. */
    words?: string[]
    background?: string
    font?: CSSProperties
    textColor?: string
    /** Cubelets along each edge: "2", "3" or "4" (numbers are accepted too). */
    grid?: "2" | "3" | "4" | 2 | 3 | 4
    /** How far the top layer rests into a twist, deg. */
    twist?: number
    /** How big the cube draws in its frame, %. */
    scale?: number
    /** The cube's colours: plastic, panels, per-side panels, and the glow. */
    colors?: Partial<OnyxRiddleColors>
    /** Where the cube sits in its frame and how it is turned. */
    placement?: Partial<OnyxRiddlePlacement>
    drag?: boolean
    /** 0–10: how far the cube leans toward the pointer. */
    parallax?: number
    /** 0–10: pace of the scramble-and-solve loop and the idle float. */
    speed?: number
    /** Plays every layer turn, the pose twist and the entrance. */
    transition?: Transition
    advanced?: Partial<OnyxRiddleAdvanced>
    style?: CSSProperties
}

/* -------------------------------------------------------- defaults */

const DEFAULT_WORDS = ["TYPE"]
const DEFAULT_FONT: CSSProperties = { fontFamily: "Jost", fontWeight: 500, fontStyle: "normal" }
const DEFAULT_TRANSITION: Transition = { type: "spring", stiffness: 260, damping: 24, mass: 1 }

const DEFAULTS = {
    background: "#000000",
    textColor: "#F2EEE8",
    grid: "2",
    twist: -3,
    scale: 100,
    drag: true,
    parallax: 10,
    speed: 5,
}

/** Panel is the body lifted 2.5x in linear light: the paler satin floor
 *  the still shows inside each frame. */
const DEFAULT_COLORS: OnyxRiddleColors = { body: "#1C1A18", panel: "#302D2A", faces: [], glow: "#F2562F" }

const DEFAULT_PLACEMENT: OnyxRiddlePlacement = { x: 0, y: 0, angle: 0, tilt: 0 }

const DEFAULT_ADVANCED: OnyxRiddleAdvanced = {
    lens: 24,
    yaw: 45,
    pitch: -22,
    round: 4.5,
    seam: 2.5,
    part: 9,
    panel: 84,
    letter: 50,
    roughness: 34,
    coat: 55,
    sideLight: 100,
    inner: 100,
    ghost: 100,
    exposure: 100,
    float: 100,
    moves: 4,
    delay: 0.2,
}

/* ------------------------------------------------------- constants */

const DEG = Math.PI / 180
const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d)

/** Camera distance; the lens and FIT set the framing, this only sets how
 *  much the near corner swells. */
const CAM_DIST = 11
/** Zoom at Scale 100 that fills the frame as the still does: the cube
 *  about two thirds of the frame's width. */
const FIT = 1.08
/** Atlas: one column per face, one row per tile of that face (Grid^2).
 *  A cell is 512/Grid px, so a tile keeps its pixels per screen size as
 *  the tiles shrink. */
const ATLAS_SPAN = 512
const gridOf = (v: unknown) => (Number(v) === 3 ? 3 : Number(v) === 4 ? 4 : 2)
/** Faces in shader order: +X, +Y, +Z, -X, -Y, -Z. Each with the axis a
 *  reader's right and up run along, seen from outside; tiles are read
 *  along R, then down U. The bottom (-Y)
 *  reads with the front at its right, as the still's ghost letters do. */
const FACES: { axis: number; sign: number; R: number[]; U: number[] }[] = [
    { axis: 0, sign: 1, R: [0, 0, -1], U: [0, 1, 0] },
    { axis: 1, sign: 1, R: [1, 0, 0], U: [0, 0, -1] },
    { axis: 2, sign: 1, R: [1, 0, 0], U: [0, 1, 0] },
    { axis: 0, sign: -1, R: [0, 0, 1], U: [0, 1, 0] },
    { axis: 1, sign: -1, R: [0, 0, -1], U: [1, 0, 0] },
    { axis: 2, sign: -1, R: [-1, 0, 0], U: [0, 1, 0] },
]
/** Which face takes the n-th word: front, right, bottom, top, back, left. */
const WORD_ORDER = [2, 0, 4, 1, 5, 3]

function familyOf(f: CSSProperties) {
    const fam = String(f.fontFamily || DEFAULT_FONT.fontFamily)
    return /[\s"',]/.test(fam) && !/[",]/.test(fam) ? `"${fam}"` : fam
}

/** Deterministic PRNG, so a scramble is the same on every load. */
function mulberry(seed: number) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/* -------------------------------------------------------- geometry */

/** A unit box with rounded edges. A subdivided box whose vertices are
 *  bunched into the rounding band, then pushed onto the rounded surface
 *  with exact normals. */
function roundedCube(r: number) {
    const seg = 6
    const n = 2 * seg + 2
    const g = new THREE.BoxGeometry(1, 1, 1, n, n, n)
    const pos = g.attributes.position as THREE.BufferAttribute
    const nor = g.attributes.normal as THREE.BufferAttribute
    const a0 = 1 / n
    const inner = 0.5 - r
    const remap = (c: number) => {
        const a = Math.abs(c)
        const m = a <= a0 ? (a / a0) * inner : inner + ((a - a0) / (0.5 - a0)) * r
        return Math.sign(c) * m
    }
    const p = new THREE.Vector3()
    const q = new THREE.Vector3()
    const d = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
        p.set(remap(pos.getX(i)), remap(pos.getY(i)), remap(pos.getZ(i)))
        q.set(clamp(p.x, -inner, inner), clamp(p.y, -inner, inner), clamp(p.z, -inner, inner))
        d.subVectors(p, q)
        if (d.lengthSq() > 1e-12) {
            d.normalize()
            p.copy(q).addScaledVector(d, r)
            nor.setXYZ(i, d.x, d.y, d.z)
        }
        pos.setXYZ(i, p.x, p.y, p.z)
    }
    return g
}

/* -------------------------------------------------------- material */

const VERT_PARS = /* glsl */ `
varying vec3 vObjPos;
varying vec3 vObjN;
`

const FRAG_PARS = /* glsl */ `
uniform mat3 normalMatrix;
varying vec3 vObjPos;
varying vec3 vObjN;
uniform sampler2D uAtlas;
uniform vec3 uHome;
uniform vec3 uSlotP;
uniform vec3 uSlotN;
uniform vec3 uInk;
uniform vec3 uInner;
uniform vec3 uPanelCol[6];
uniform float uGhost;
uniform float uPanel;
uniform float uPanelR;
uniform float uLip;
uniform float uRough;
uniform float uRows;

void faceFrame(int f, out vec3 N, out vec3 R, out vec3 U) {
    if (f == 0) { N = vec3(1.0, 0.0, 0.0); R = vec3(0.0, 0.0, -1.0); U = vec3(0.0, 1.0, 0.0); }
    else if (f == 1) { N = vec3(0.0, 1.0, 0.0); R = vec3(1.0, 0.0, 0.0); U = vec3(0.0, 0.0, -1.0); }
    else if (f == 2) { N = vec3(0.0, 0.0, 1.0); R = vec3(1.0, 0.0, 0.0); U = vec3(0.0, 1.0, 0.0); }
    else if (f == 3) { N = vec3(-1.0, 0.0, 0.0); R = vec3(0.0, 0.0, 1.0); U = vec3(0.0, 1.0, 0.0); }
    else if (f == 4) { N = vec3(0.0, -1.0, 0.0); R = vec3(0.0, 0.0, -1.0); U = vec3(1.0, 0.0, 0.0); }
    else { N = vec3(0.0, 0.0, -1.0); R = vec3(-1.0, 0.0, 0.0); U = vec3(0.0, 1.0, 0.0); }
}

// signed distance to the panel's rounded square, and its gradient
vec3 sdPanel(vec2 p, float b, float r) {
    vec2 s = vec2(p.x < 0.0 ? -1.0 : 1.0, p.y < 0.0 ? -1.0 : 1.0);
    vec2 q = abs(p) - vec2(b - r);
    if (q.x > 0.0 && q.y > 0.0) {
        float l = length(q);
        return vec3(l - r, s * q / l);
    }
    if (q.x > q.y) return vec3(q.x - r, s.x, 0.0);
    return vec3(q.y - r, 0.0, s.y);
}

// smooth value noise, for the plastic's slightly uneven gloss
float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
        mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0)), f.x), f.y),
        f.z);
}

// A shoulder on direct light: below the reference's brightest tile it
// passes straight through, above it rolls off, so a face turned square
// into the close red lamp glows rather than clipping to white.
vec3 knee(vec3 x) {
    vec3 e = max(x - 0.45, 0.0);
    return min(x, 0.45) + e / (1.0 + e / 0.35);
}

float oInk;
float oPanel;
float oInnerF;
float oOcc;
float oDirOcc;
float oEdge;
vec3 oN;
`

/** Runs where three would apply vertex colour: works out which face this
 *  is, the recess, the letter and the inner red, and paints diffuse. */
const FRAG_SURFACE = /* glsl */ `
{
    vec3 an = abs(vObjN);
    int ax = an.x > an.y ? (an.x > an.z ? 0 : 2) : (an.y > an.z ? 1 : 2);
    float comp = ax == 0 ? vObjN.x : ax == 1 ? vObjN.y : vObjN.z;
    int f = ax + (comp < 0.0 ? 3 : 0);
    vec3 FN; vec3 FR; vec3 FU;
    faceFrame(f, FN, FR, FU);
    float flatK = smoothstep(0.985, 0.9995, max(an.x, max(an.y, an.z)));
    float slot = comp > 0.0 ? uSlotP[ax] : uSlotN[ax];
    float outer = slot > -0.5 ? 1.0 : 0.0;

    vec2 fp = vec2(dot(vObjPos, FR), dot(vObjPos, FU));
    vec3 sd = sdPanel(fp, uPanel, uPanelR);
    // The face is a button set in a frame, as in the still: flat frame,
    // a narrow V-groove round the panel (its far wall faces away from the
    // light: the dark line), then the panel's rounded shoulder rising out
    // of it (the light line) to a flat top. Heights are slopes on the
    // normal, h as a function of the signed distance d to the panel edge.
    // No feature is narrower than about a pixel, so the lines stay solid
    // rather than sparkling as the cube turns.
    float px = fwidth(sd.x);
    float gw = max(uLip * 0.45, px * 1.4);
    float sw = max(uLip, px * 2.6);
    float gD = uLip * 0.6;
    float gq = sd.x / gw;
    float ge = exp(-gq * gq);
    // groove: h = -gD exp(-(d/gw)^2)
    float dh = gD * 2.0 * gq / gw * ge;
    // shoulder: h rises by gD/2 over sw going in
    float ss = clamp(-sd.x / sw, 0.0, 1.0);
    dh -= 0.5 * gD * 6.0 * ss * (1.0 - ss) / sw;
    vec3 tilt = dh * (sd.y * FR + sd.z * FU);
    vec3 pn = normalize(FN - tilt);
    float k = flatK * outer;
    oN = normalize(mix(normalize(vObjN), pn, k));
    oPanel = k * (1.0 - smoothstep(-gw, gw, sd.x));
    // the bottom of the groove is shut in
    oOcc = 1.0 - 0.6 * k * ge * ge;
    // the cubelet's own rounded edges: glossier than the faces
    oEdge = (1.0 - flatK) * outer;

    oInk = 0.0;
    if (outer > 0.5) {
        vec2 uv = clamp(fp + 0.5, 0.0, 1.0);
        vec2 auv = vec2((float(f) + uv.x) / 6.0, (uRows - 1.0 - slot + uv.y) / uRows);
        float a = texture2D(uAtlas, auv).a;
        oInk = a * flatK * (f == 4 ? uGhost : 1.0);
    }

    // inner faces: red mechanism plastic, darkening the deeper into the
    // seam a point sits (nothing else here knows it is shut in). uHome is
    // the outward side on each axis that has one, 0 where neighbours sit
    // on both sides (the edges and centres of a 3x3 or 4x4).
    vec3 dv = mix(vec3(1.0), 0.5 - vObjPos * uHome, abs(uHome));
    if (ax == 0) dv.x = 1.0; else if (ax == 1) dv.y = 1.0; else dv.z = 1.0;
    float depth = min(dv.x, min(dv.y, dv.z));
    oInnerF = (1.0 - outer) * smoothstep(0.9, 0.99, max(an.x, max(an.y, an.z)));
    oOcc *= 1.0 - 0.97 * oInnerF * smoothstep(0.0, 0.08, depth);
    // lamps reach a shut-in face only partly (no shadow maps here); the
    // core's own glow keeps what is left
    oDirOcc = 1.0 - 0.75 * oInnerF * smoothstep(0.0, 0.08, depth);
    // rounded edges that turn toward a neighbour are shaded by it
    vec3 nn = normalize(vObjN);
    vec3 tw = mix(abs(nn), -nn * uHome, abs(uHome));
    float toward = max(max(tw.x, tw.y), tw.z);
    oOcc *= 1.0 - 0.85 * (1.0 - oInnerF) * smoothstep(0.05, 0.7, toward);

    vec3 col = mix(diffuseColor.rgb, uInner, oInnerF * smoothstep(0.06, 0.3, depth));
    // the panel floor is a softer, paler satin than the glossy frame, and
    // the moulding is never perfectly even
    col = mix(col, uPanelCol[f], oPanel);
    col *= 1.0 + (vnoise(vObjPos * 55.0 + uHome * 7.0) - 0.5) * 0.08;
    diffuseColor.rgb = mix(col, uInk, oInk);
}
`

const FRAG_ROUGH = /* glsl */ `
roughnessFactor = uRough - 0.08 + 0.26 * oPanel + (vnoise(vObjPos * 7.0 + uHome * 3.1) - 0.5) * 0.09;
roughnessFactor = mix(roughnessFactor, 0.55, oInk);
roughnessFactor = mix(roughnessFactor, 0.22, oInnerF);
// tight machined edges catch a hairline glint off the soft box
roughnessFactor = mix(roughnessFactor, 0.12, oEdge);
`

type CubeletUniforms = {
    uHome: { value: THREE.Vector3 }
    uSlotP: { value: THREE.Vector3 }
    uSlotN: { value: THREE.Vector3 }
}

function cubeletMaterial(shared: Record<string, THREE.IUniform>, own: CubeletUniforms) {
    const m = new THREE.MeshPhysicalMaterial({ roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.2 })
    m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, shared, own)
        sh.vertexShader = sh.vertexShader
            .replace("#include <common>", "#include <common>\n" + VERT_PARS)
            .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjPos = position;\nvObjN = normal;")
        sh.fragmentShader = sh.fragmentShader
            .replace("#include <common>", "#include <common>\n" + FRAG_PARS)
            .replace("#include <color_fragment>", "#include <color_fragment>\n" + FRAG_SURFACE)
            .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n" + FRAG_ROUGH)
            // printed ink sits on top of the coat, so it stays white under the red
            .replace(
                "#include <lights_physical_fragment>",
                "#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= 1.0 - 0.8 * oInk;\n#endif"
            )
            .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\nnormal = normalize(normalMatrix * oN);")
            .replace(
                "#include <clearcoat_normal_fragment_begin>",
                "#ifdef USE_CLEARCOAT\nvec3 clearcoatNormal = normal;\n#endif"
            )
            .replace(
                "#include <aomap_fragment>",
                `#include <aomap_fragment>
reflectedLight.indirectDiffuse *= oOcc;
reflectedLight.indirectSpecular *= oOcc;
reflectedLight.directDiffuse = knee(reflectedLight.directDiffuse * oDirOcc);
reflectedLight.directSpecular = knee(reflectedLight.directSpecular * oDirOcc);
#ifdef USE_CLEARCOAT
clearcoatSpecularIndirect *= oOcc;
#endif`
            )
    }
    return m
}

/* ---------------------------------------------------------- studio */

/** The room the cube hangs in, pre-filtered for reflections: pale walls,
 *  a soft box overhead, a warm floor, a dark flag low on the front left
 *  (the front faces' grey), and the big red source low behind the right. */
function buildStudio(renderer: THREE.WebGLRenderer, glow: THREE.Color, side: number) {
    const env = new THREE.Scene()
    const dome = new THREE.SphereGeometry(30, 48, 24)
    const pos = dome.attributes.position as THREE.BufferAttribute
    const cols = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) / 30
        // floor warm grey, a dim horizon band, the pale room above
        const floor = [0.95, 0.8, 0.72]
        const room = [0.82, 0.8, 0.77]
        const hz = 0.16
        const tF = clamp((-y - 0.05) / 0.3)
        const tR = clamp((y - 0.12) / 0.5)
        for (let c = 0; c < 3; c++) {
            const mid = lerp(hz, room[c], tR)
            cols[i * 3 + c] = lerp(mid, floor[c], tF) * (y > 0.5 ? 1 + (y - 0.5) * 1.2 : 1)
        }
    }
    dome.setAttribute("color", new THREE.BufferAttribute(cols, 3))
    const domeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })
    env.add(new THREE.Mesh(dome, domeMat))

    const made: THREE.Mesh[] = []
    const panel = (w: number, h: number, c: THREE.Color, x: number, y: number, z: number) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }))
        m.position.set(x, y, z)
        m.lookAt(0, 0, 0)
        env.add(m)
        made.push(m)
    }
    panel(9, 9, new THREE.Color(6, 5.9, 5.6), -3, 14, 4)
    panel(12, 9, new THREE.Color(0.05, 0.045, 0.04), -11, -4, 10)
    const red = glow.clone().multiplyScalar(2 * side)
    panel(14, 10, red, 8, 1.5, -15)
    panel(9, 7, red.clone().lerp(new THREE.Color(1, 0.55, 0.3).multiplyScalar(12 * side), 0.55), 6, -2.5, -16)

    const pmrem = new THREE.PMREMGenerator(renderer)
    const rt = pmrem.fromScene(env, 0.02)
    pmrem.dispose()
    dome.dispose()
    domeMat.dispose()
    made.forEach((m) => {
        m.geometry.dispose()
        ;(m.material as THREE.Material).dispose()
    })
    return rt
}

/* ------------------------------------------------------- the puzzle */

/** A quarter turn of one layer: the cubelets whose grid coordinate on
 *  `axis` equals `layer` (odd steps from -(Grid-1) to Grid-1). */
type Move = { axis: number; layer: number; turns: number; undo: boolean }

type Cubelet = {
    mesh: THREE.Mesh
    /** Grid cell, each component in steps of 2 from -(Grid-1) to Grid-1. */
    g: THREE.Vector3
    /** Orientation, always a whole number of quarter turns. */
    q: THREE.Quaternion
}

const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]
const comp = (v: THREE.Vector3, a: number) => (a === 0 ? v.x : a === 1 ? v.y : v.z)

/* ------------------------------------------------------- component */

export default function OnyxRiddle({
    words = ["TEXT"],
    background = DEFAULTS.background,
    font = {"variant":"Regular","fontSize":"16px","fontStyle":"normal","textAlign":"left","fontFamily":"Jost","fontWeight":500,"lineHeight":"1.5em","letterSpacing":"0em"},
    textColor = DEFAULTS.textColor,
    grid = DEFAULTS.grid,
    twist = DEFAULTS.twist,
    scale = DEFAULTS.scale,
    colors = {"body":"#1C1A18","glow":"#FF0900","faces":["#590000"],"panel":"#000000"},
    drag = DEFAULTS.drag,
    parallax = DEFAULTS.parallax,
    speed = DEFAULTS.speed,
    placement = {"x":0,"y":0,"tilt":0,"angle":0},
    transition = {"mass":1,"type":"spring","damping":24,"stiffness":260},
    advanced = {"yaw":45,"coat":55,"lens":24,"part":9,"seam":2.5,"float":100,"ghost":100,"inner":100,"moves":4,"panel":80,"pitch":-22,"round":11,"letter":50,"exposure":100,"roughness":34,"sideLight":100},
    style,
}: OnyxRiddleProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const adv: OnyxRiddleAdvanced = { ...DEFAULT_ADVANCED, ...advanced }
    const fnt: CSSProperties = { ...DEFAULT_FONT, ...font }
    const place: OnyxRiddlePlacement = { ...DEFAULT_PLACEMENT, ...placement }
    const cols: OnyxRiddleColors = { ...DEFAULT_COLORS, ...colors }
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Live prop mirror: the loop reads it, so a control change never rebuilds the GL context.
    const live = { words, font: fnt, textColor, grid, twist, scale, cols, drag, parallax, speed, place, transition, adv, isCanvas }
    const propsRef = useRef(live)
    propsRef.current = live
    const dirtyRef = useRef(true)
    dirtyRef.current = true

    useEffect(() => {
        const host = hostRef.current
        if (!host) return

        let renderer: THREE.WebGLRenderer
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
        } catch {
            return
        }
        renderer.setClearColor(0x000000, 0)
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        const canvas = renderer.domElement
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;opacity:0"
        host.appendChild(canvas)

        /* ---- the default face, fetched once if nobody has it */

        /* ---- scene */

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(DEFAULT_ADVANCED.lens, 1, 0.5, 60)
        const root = new THREE.Group()
        scene.add(root)

        // Rebuilt with the grid: a texture's size is fixed once uploaded.
        const atlasCv = document.createElement("canvas")
        let atlas = new THREE.CanvasTexture(atlasCv)
        let cell = ATLAS_SPAN / 2

        const shared: Record<string, THREE.IUniform> = {
            uAtlas: { value: atlas },
            uInk: { value: new THREE.Color() },
            uInner: { value: new THREE.Color() },
            uGhost: { value: 0.55 },
            uPanel: { value: 0.4 },
            uPanelR: { value: 0.1 },
            uLip: { value: 0.02 },
            uRough: { value: 0.34 },
            uRows: { value: 4 },
            uPanelCol: { value: Array.from({ length: 6 }, () => new THREE.Color()) },
        }

        let roundKey = -1
        let geo = roundedCube(DEFAULT_ADVANCED.round / 100)
        let N = 0
        let cubelets: Cubelet[] = []
        let meshes: THREE.Mesh[] = []
        // bumped on every rebuild, so a turn still playing on the old cube
        // does not land on the new one
        let gen = 0

        // the mechanism inside, seen only where the layers part
        const coreMat = new THREE.MeshPhysicalMaterial({ roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.9 })
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 24), coreMat)
        root.add(core)
        // three arms out to the centre caps, as in a real cube
        const armGeo = new THREE.CapsuleGeometry(0.15, 1.35, 8, 24)
        const arms: THREE.Mesh[] = []
        for (let a = 0; a < 3; a++) {
            const m = new THREE.Mesh(armGeo, coreMat)
            if (a === 0) m.rotation.z = Math.PI / 2
            if (a === 2) m.rotation.x = Math.PI / 2
            root.add(m)
            arms.push(m)
        }
        const innerLight = new THREE.PointLight(0xff3020, 3, 0, 2)
        root.add(innerLight)
        // The still's right face runs dark at its top-left to hot at its
        // lower-right across a single tile: a source that close falls off
        // over the cube, which a reflection of a distant one cannot do.
        // World-fixed, so the cube turns through it.
        const sideLamp = new THREE.PointLight(0xff4020, 1, 0, 2)
        sideLamp.position.set(1.5, -0.8, -2.4)
        scene.add(sideLamp)

        let envRT: THREE.WebGLRenderTarget | null = null
        let envKey = ""

        /* ---- size */

        let W = 1
        let H = 1
        let quality = 1
        const resize = () => {
            const r = host.getBoundingClientRect()
            W = Math.max(1, host.clientWidth || r.width)
            H = Math.max(1, host.clientHeight || r.height)
            const dpr = Math.min(window.devicePixelRatio || 1, 2) * quality
            renderer.setPixelRatio(dpr)
            renderer.setSize(W, H, false)
            camera.aspect = W / H
            needs = true
        }
        let needs = true
        const ro = new ResizeObserver(resize)
        ro.observe(host)
        resize()

        let visible = true
        const io =
            typeof IntersectionObserver === "function"
                ? new IntersectionObserver((es) => {
                      visible = es.some((e) => e.isIntersecting)
                      needs = true
                  })
                : null
        io?.observe(host)
        const reduce = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        /* ---- letters */

        let printVersion = 0
        const onFonts = () => {
            printVersion++
        }
        document.fonts?.addEventListener?.("loadingdone", onFonts)
        // The default face is fetched once if nobody has it. Its sheet lands
        // after the first bake, so re-ask for the face when it does.
        const refetch = () => {
            wantFont = ""
            printVersion++
        }
        let jost = document.getElementById("onyx-riddle-jost") as HTMLLinkElement | null
        if (familyOf(propsRef.current.font) === "Jost" && !jost) {
            jost = document.createElement("link")
            jost.id = "onyx-riddle-jost"
            jost.rel = "stylesheet"
            jost.href = "https://fonts.googleapis.com/css2?family=Jost:wght@100..900&display=swap"
            document.head.appendChild(jost)
        }
        jost?.addEventListener("load", refetch)
        let printKey = ""
        let lastBake = -1e9
        let wantFont = ""
        const bake = (now: number) => {
            const p = propsRef.current
            const f = p.font
            const list = (Array.isArray(p.words) && p.words.length ? p.words : DEFAULT_WORDS).map((w) => String(w ?? ""))
            const letter = clamp(num(p.adv.letter, DEFAULT_ADVANCED.letter), 10, 80) / 100
            const key = JSON.stringify([list, f.fontFamily, f.fontWeight, f.fontStyle, letter, printVersion, N])
            if (key === printKey || now - lastBake < 100) return false
            lastBake = now
            printKey = key
            // geometric fallbacks until (or instead of) the chosen face
            const fam = `${familyOf(f)}, "Avenir Next", Futura, "Century Gothic", "Helvetica Neue", Arial, sans-serif`
            const style = String(f.fontStyle || "normal")
            const weight = String(f.fontWeight || 500)
            const fontStr = `${style} ${weight} 100px ${fam}`
            if (fontStr !== wantFont) {
                wantFont = fontStr
                document.fonts?.load(fontStr).then(onFonts, () => {})
            }
            const ctx = atlasCv.getContext("2d")
            if (!ctx) return false
            ctx.clearRect(0, 0, atlasCv.width, atlasCv.height)
            ctx.fillStyle = "#fff"
            ctx.textAlign = "center"
            ctx.textBaseline = "alphabetic"
            ctx.font = `${style} ${weight} 100px ${fam}`
            const cap = ctx.measureText("H").actualBoundingBoxAscent || 70
            ctx.font = `${style} ${weight} ${((letter * cell * 100) / cap).toFixed(1)}px ${fam}`
            WORD_ORDER.forEach((face, i) => {
                // read along the rows; a word shorter than the face repeats to fill it
                const chars = Array.from(list[i % list.length])
                if (!chars.length) return
                for (let t = 0; t < N * N; t++) {
                    ctx.fillText(chars[t % chars.length], face * cell + cell / 2, t * cell + cell / 2 + (letter * cell) / 2)
                }
            })
            atlas.needsUpdate = true
            return true
        }

        /* ---- the puzzle state */

        const queue: Move[] = []
        const stack: Move[] = []
        let current: { move: Move; t: number } | null = null
        let phase: "hold" | "scramble" | "pause" | "solve" = "hold"
        let phaseT = 0
        let cycle = 0
        let pose = 0
        let poseGoal = 0
        let entered = 0
        let enterDone = false
        let anims: AnimationPlaybackControls[] = []
        let running = 0
        const play = (from: number, to: number, set: (v: number) => void, done: () => void, extra: object = {}) => {
            running++
            let finished = false
            const finish = () => {
                if (finished) return
                finished = true
                running--
                needs = true
                done()
            }
            const a = animate(from, to, {
                ...(propsRef.current.transition || DEFAULT_TRANSITION),
                ...extra,
                onUpdate: (v: number) => {
                    // no redraw request here: running > 0 already paces the
                    // loop at 60 fps, and this fires on every display tick
                    set(v)
                },
                onComplete: finish,
            } as Parameters<typeof animate>[2])
            anims.push(a)
            a.then?.(() => {
                anims = anims.filter((x) => x !== a)
            })
            return { stop: () => (a.stop(), finish()) }
        }

        const Q = new THREE.Quaternion()
        const V = new THREE.Vector3()
        const bakeMove = (m: Move) => {
            Q.setFromAxisAngle(AXES[m.axis], m.turns * 90 * DEG)
            cubelets.forEach((c) => {
                if (comp(c.g, m.axis) !== m.layer) return
                c.q.premultiply(Q).normalize()
                V.copy(c.g).applyQuaternion(Q)
                c.g.set(Math.round(V.x), Math.round(V.y), Math.round(V.z))
            })
        }
        const startNext = () => {
            if (current || !queue.length || Math.abs(pose) > 0.5) return
            const move = queue.shift() as Move
            const cur = { move, t: 0 }
            current = cur
            const born = gen
            play(
                0,
                1,
                (v) => (cur.t = v),
                () => {
                    if (born !== gen) return
                    bakeMove(move)
                    if (move.undo) stack.pop()
                    else stack.push(move)
                    current = null
                    startNext()
                },
                { restDelta: 0.002, restSpeed: 0.05 }
            )
        }
        const enqueueScramble = (n: number) => {
            const rnd = mulberry(cycle * 9973 + 17)
            let last = -1
            for (let i = 0; i < n; i++) {
                let axis = Math.floor(rnd() * 3)
                if (axis === last) axis = (axis + 1 + Math.floor(rnd() * 2)) % 3
                last = axis
                const layer = 2 * Math.floor(rnd() * N) - (N - 1)
                queue.push({ axis, layer, turns: rnd() < 0.5 ? -1 : 1, undo: false })
            }
            cycle++
        }
        const enqueueSolve = () => {
            for (let i = stack.length - 1; i >= 0; i--) {
                const m = stack[i]
                queue.push({ axis: m.axis, layer: m.layer, turns: -m.turns, undo: true })
            }
        }

        /** (Re)builds the cube for a grid size: the cubelets that show, each
         *  with its outward sides and which tile of each outer face it is,
         *  the atlas, and a fresh solved puzzle. */
        const build = (n: number) => {
            gen++
            cubelets.forEach((c) => {
                root.remove(c.mesh)
                ;(c.mesh.material as THREE.Material).dispose()
            })
            cubelets = []
            queue.length = 0
            stack.length = 0
            current = null
            phase = "hold"
            phaseT = 0
            N = n
            const m = n - 1
            for (let x = -m; x <= m; x += 2)
                for (let y = -m; y <= m; y += 2)
                    for (let z = -m; z <= m; z += 2) {
                        // the middle of a 3x3 or 4x4 never shows; the core fills it
                        if (Math.abs(x) < m && Math.abs(y) < m && Math.abs(z) < m) continue
                        const g = new THREE.Vector3(x, y, z)
                        const side = (v: number) => (Math.abs(v) === m ? Math.sign(v) : 0)
                        const slots = FACES.map((F) => {
                            if (comp(g, F.axis) !== F.sign * m) return -1
                            const gR = g.x * F.R[0] + g.y * F.R[1] + g.z * F.R[2]
                            const gU = g.x * F.U[0] + g.y * F.U[1] + g.z * F.U[2]
                            return ((m - gU) / 2) * n + (gR + m) / 2
                        })
                        const uni: CubeletUniforms = {
                            uHome: { value: new THREE.Vector3(side(x), side(y), side(z)) },
                            uSlotP: { value: new THREE.Vector3(slots[0], slots[1], slots[2]) },
                            uSlotN: { value: new THREE.Vector3(slots[3], slots[4], slots[5]) },
                        }
                        const mesh = new THREE.Mesh(geo, cubeletMaterial(shared, uni))
                        mesh.matrixAutoUpdate = false
                        root.add(mesh)
                        cubelets.push({ mesh, g, q: new THREE.Quaternion() })
                    }
            meshes = cubelets.map((c) => c.mesh)
            lifts = new Float32Array(cubelets.length)
            hoverIdx = -1
            // the mechanism keeps its size in the cube, not in the cubelet
            core.scale.setScalar(n / 2)
            arms.forEach((a) => a.scale.setScalar(n / 2))

            cell = Math.round(ATLAS_SPAN / n)
            atlasCv.width = cell * 6
            atlasCv.height = cell * n * n
            atlas.dispose()
            atlas = new THREE.CanvasTexture(atlasCv)
            atlas.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
            atlas.generateMipmaps = true
            atlas.minFilter = THREE.LinearMipmapLinearFilter
            shared.uAtlas.value = atlas
            shared.uRows.value = n * n
            printKey = ""
            needs = true
        }

        /* ---- input */

        const pt = { cx: 0, cy: 0, u: 0.5, v: 0.5, over: false, moved: false }
        const dragS = { on: false, id: -1, x0: 0, y0: 0, lx: 0, ly: 0, w: 1, h: 1, left: 0, top: 0, travel: 0, vy: 0, vp: 0, lt: 0 }
        // the cubelet under the pointer, and how far each one has risen
        let hoverIdx = -1
        let lifts = new Float32Array(8)
        let dragYaw = 0
        let dragPitch = 0
        let springBack: { stop: () => void } | null = null
        let springBackP: { stop: () => void } | null = null
        const onMove = (e: PointerEvent) => {
            pt.cx = e.clientX
            pt.cy = e.clientY
            pt.over = true
            pt.moved = true
            if (dragS.on && e.pointerId === dragS.id) {
                const dx = e.clientX - dragS.lx
                const dy = e.clientY - dragS.ly
                dragS.lx = e.clientX
                dragS.ly = e.clientY
                dragS.travel += Math.abs(dx) + Math.abs(dy)
                const ky = (dx / dragS.w) * 300
                const kp = (dy / dragS.h) * 200
                dragYaw += ky
                dragPitch = clamp(dragPitch + kp, -80, 80)
                const t = performance.now()
                const gap = Math.max(1, t - dragS.lt) / 1000
                dragS.lt = t
                dragS.vy = lerp(dragS.vy, ky / gap, 0.5)
                dragS.vp = lerp(dragS.vp, kp / gap, 0.5)
            }
            needs = true
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            if (!propsRef.current.drag) return
            // one rect read per gesture, so drag speed is in the box as displayed
            const r = host.getBoundingClientRect()
            Object.assign(dragS, { on: true, id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, w: Math.max(1, r.width), h: Math.max(1, r.height), left: r.left, top: r.top, travel: 0, vy: 0, vp: 0, lt: performance.now() })
            springBack?.stop()
            springBackP?.stop()
            try {
                host.setPointerCapture(e.pointerId)
            } catch {
                /* capture is a nicety */
            }
        }
        const ray = new THREE.Raycaster()
        const ndc = new THREE.Vector2()
        const M3 = new THREE.Matrix3()
        const camUp = new THREE.Vector3()
        const tap = (u: number, v: number) => {
            ndc.set(u * 2 - 1, 1 - v * 2)
            camera.updateMatrixWorld()
            root.updateMatrixWorld(true)
            ray.setFromCamera(ndc, camera)
            const hit = ray.intersectObjects(meshes, false)[0]
            if (!hit || !hit.face) return
            const c = cubelets.find((x) => x.mesh === hit.object)
            if (!c) return
            // the face that was hit, in the cube's own frame
            const n = hit.face.normal.clone().applyMatrix3(M3.setFromMatrix4(c.mesh.matrix)).normalize()
            const na = Math.abs(n.x) > Math.abs(n.y) ? (Math.abs(n.x) > Math.abs(n.z) ? 0 : 2) : Math.abs(n.y) > Math.abs(n.z) ? 1 : 2
            camUp.set(0, 1, 0).applyQuaternion(camera.quaternion)
            let best = -1
            let bestD = -1
            let bestS = 1
            for (let a = 0; a < 3; a++) {
                if (a === na) continue
                V.copy(AXES[a]).applyQuaternion(root.quaternion)
                const d = V.dot(camUp)
                if (Math.abs(d) > bestD) {
                    bestD = Math.abs(d)
                    best = a
                    bestS = d < 0 ? -1 : 1
                }
            }
            queue.push({ axis: best, layer: comp(c.g, best), turns: (u >= 0.5 ? 1 : -1) * bestS, undo: false })
            phase = "pause"
            phaseT = 0
            needs = true
        }
        const onUp = (e: PointerEvent) => {
            if (!dragS.on || e.pointerId !== dragS.id) return
            dragS.on = false
            try {
                host.releasePointerCapture(e.pointerId)
            } catch {
                /* already released */
            }
            if (dragS.travel < 6 && e.type === "pointerup") {
                tap((e.clientX - dragS.left) / dragS.w, (e.clientY - dragS.top) / dragS.h)
                return
            }
            // fling, then settle back into the pose (the nearest whole turn)
            const goal = Math.round((dragYaw + dragS.vy * 0.25) / 360) * 360
            const soft = { type: "spring", stiffness: 40, damping: 11, mass: 1 }
            springBack = play(dragYaw, goal, (v) => (dragYaw = v), () => {}, { ...soft, velocity: dragS.vy })
            springBackP = play(dragPitch, 0, (v) => (dragPitch = v), () => {}, { ...soft, velocity: dragS.vp })
        }
        const onLeave = (e: PointerEvent) => {
            pt.over = false
            hoverIdx = -1
            if (e.pointerType !== "mouse") onUp(e)
            needs = true
        }
        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerdown", onDown)
        host.addEventListener("pointerup", onUp)
        host.addEventListener("pointercancel", onUp)
        host.addEventListener("pointerleave", onLeave)

        /* ---- loop */

        const M = new THREE.Matrix4()
        const T = new THREE.Matrix4()
        const R = new THREE.Matrix4()
        const glowLin = new THREE.Color()
        const P = new THREE.Vector3()
        const qa = new THREE.Quaternion()
        const qb = new THREE.Quaternion()
        const camRight = new THREE.Vector3()
        const tmpC = new THREE.Color()
        let raf = 0
        let lastDraw = -1
        let gapEma = 16
        let lastQualityDrop = 0
        let clock = 0
        let leanY = 0
        let leanP = 0
        let announced = false
        let poseAnim: { stop: () => void } | null = null

        const enter = () => {
            const p = propsRef.current
            if (p.isCanvas || (reduce && reduce.matches)) {
                entered = 1
                enterDone = true
                return
            }
            const d = clamp(num(p.adv.delay, DEFAULT_ADVANCED.delay), 0, 10)
            play(0, 1, (v) => (entered = v), () => (enterDone = true), { delay: d })
        }

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            if (!visible && announced) return
            const p = propsRef.current
            const A = p.adv
            const still = !!(reduce && reduce.matches) || p.isCanvas

            if (dirtyRef.current) {
                dirtyRef.current = false
                needs = true
            }

            /* cube, letters, shape and studio, rebuilt only when what feeds them changes */
            const n = gridOf(p.grid)
            if (n !== N) build(n)
            if (bake(now)) needs = true
            const rd = clamp(num(A.round, DEFAULT_ADVANCED.round), 1, 30) / 100
            if (rd !== roundKey) {
                roundKey = rd
                geo.dispose()
                geo = roundedCube(rd)
                cubelets.forEach((c) => (c.mesh.geometry = geo))
            }
            const C = p.cols
            const glowC = tmpC.set(C.glow || DEFAULT_COLORS.glow)
            const side = clamp(num(A.sideLight, DEFAULT_ADVANCED.sideLight), 0, 300) / 100
            const ek = glowC.getHexString() + side
            if (ek !== envKey) {
                envKey = ek
                envRT?.dispose()
                envRT = buildStudio(renderer, glowC, side)
                scene.environment = envRT.texture
                needs = true
            }

            /* pointer: the rect is read once per frame, only when it moved */
            if (pt.moved) {
                pt.moved = false
                const r = host.getBoundingClientRect()
                pt.u = clamp((pt.cx - r.left) / Math.max(1, r.width), -0.2, 1.2)
                pt.v = clamp((pt.cy - r.top) / Math.max(1, r.height), -0.2, 1.2)
                hoverIdx = -1
                if (pt.over && !dragS.on && !still) {
                    // last frame's matrices are the ones on screen
                    ndc.set(pt.u * 2 - 1, 1 - pt.v * 2)
                    ray.setFromCamera(ndc, camera)
                    const hit = ray.intersectObjects(meshes, false)[0]
                    if (hit) hoverIdx = meshes.indexOf(hit.object as THREE.Mesh)
                }
            }

            const sp = still ? 0 : clamp(num(p.speed, DEFAULTS.speed), 0, 10) / 10
            const par = still ? 0 : clamp(num(p.parallax, DEFAULTS.parallax), 0, 10) / 10
            const ly = pt.over && !dragS.on ? (pt.u - 0.5) * 2 * par * 14 : 0
            const lp = pt.over && !dragS.on ? (pt.v - 0.5) * 2 * par * 9 : 0
            const leaning = Math.abs(ly - leanY) > 0.01 || Math.abs(lp - leanP) > 0.01
            let lifting = false
            for (let i = 0; i < lifts.length; i++) if (Math.abs((i === hoverIdx ? 1 : 0) - lifts[i]) > 0.003) lifting = true
            const busy = running > 0 || dragS.on || leaning || lifting || !!current || queue.length > 0
            const idle = sp > 0 || phase === "pause" || phase === "solve"
            const interval = busy ? 1000 / 60 - 2 : idle ? 1000 / 30 - 2 : Infinity
            if (!needs && now - lastDraw < interval) return
            const step = lastDraw < 0 ? 0 : Math.min(0.1, (now - lastDraw) / 1000)
            if (lastDraw >= 0 && busy) {
                gapEma += (now - lastDraw - gapEma) * 0.1
                if (gapEma > 26 && quality > 0.6 && now - lastQualityDrop > 1500) {
                    quality = Math.max(0.6, quality - 0.1)
                    lastQualityDrop = now
                    gapEma = 16
                    resize()
                }
            }
            lastDraw = now
            needs = false
            clock += step * (0.35 + sp)

            /* the loop: hold, scramble, pause, solve */
            if (!still && enterDone) {
                phaseT += step
                const quiet = !current && !queue.length
                const nScr = Math.round(clamp(num(A.moves, DEFAULT_ADVANCED.moves), 0, 12))
                if (phase === "hold" && sp > 0 && nScr > 0 && phaseT > lerp(7, 1.4, sp) && Math.abs(pose - poseGoal) < 0.5) {
                    enqueueScramble(nScr)
                    phase = "scramble"
                    phaseT = 0
                } else if (phase === "scramble" && quiet) {
                    phase = "pause"
                    phaseT = 0
                } else if (phase === "pause" && quiet && phaseT > lerp(2.4, 0.7, sp)) {
                    enqueueSolve()
                    phase = "solve"
                    phaseT = 0
                } else if (phase === "solve" && quiet && !stack.length) {
                    phase = "hold"
                    phaseT = 0
                }
            }
            const solved = phase === "hold" && !current && !queue.length && !stack.length
            const goal = enterDone && solved ? clamp(num(p.twist, DEFAULTS.twist), -45, 45) : 0
            if (goal !== poseGoal) {
                poseGoal = goal
                poseAnim?.stop()
                poseAnim = still ? null : play(pose, goal, (v) => (pose = v), () => startNext())
                if (still) pose = goal
            }
            if (!current && queue.length) {
                if (Math.abs(pose) <= 0.5) {
                    poseAnim?.stop()
                    pose = 0
                }
                startNext()
            }

            /* camera */
            const lens = clamp(num(A.lens, DEFAULT_ADVANCED.lens), 8, 70)
            const cy = clamp(num(A.yaw, DEFAULT_ADVANCED.yaw), -180, 180) * DEG
            const cp = clamp(num(A.pitch, DEFAULT_ADVANCED.pitch), -80, 80) * DEG
            camera.fov = lens
            camera.position.set(Math.sin(cy) * Math.cos(cp), Math.sin(cp), Math.cos(cy) * Math.cos(cp)).multiplyScalar(CAM_DIST)
            camera.lookAt(0, 0, 0)
            // Placement. Angle rolls the camera, so the picture turns about the
            // cube's centre and the studio light stays put; the offsets shift
            // the lens, so the cube moves without the view swinging round it.
            const pl = p.place
            camera.rotateZ(clamp(num(pl.angle, 0), -180, 180) * DEG)
            // the lens is fixed; Scale zooms, and a tall frame fits by width
            const sc = clamp(num(p.scale, DEFAULTS.scale), 10, 130) / 100
            camera.zoom = (FIT * sc * Math.min(1, W / H) * Math.tan((lens / 2) * DEG)) / Math.tan(12 * DEG)
            camera.setViewOffset(W, H, (-clamp(num(pl.x, 0), -50, 50) / 100) * W, (-clamp(num(pl.y, 0), -50, 50) / 100) * H, W, H)
            camera.updateMatrixWorld()

            /* the cube's own turn: entrance, drag, lean and float */
            const kl = 1 - Math.exp(-step * 5) // secondary motion: lean eases, it is not the spot under the cursor
            leanY += (ly - leanY) * kl
            leanP += (lp - leanP) * kl
            const fl = still ? 0 : clamp(num(A.float, DEFAULT_ADVANCED.float), 0, 300) / 100
            const bob = Math.sin(clock * 1.1) * 0.06 * fl
            const sway = Math.sin(clock * 0.55) * 3 * fl
            const e = entered
            const yaw = dragYaw + leanY + sway - (1 - e) * 140
            const pitch = dragPitch + leanP - clamp(num(pl.tilt, 0), -90, 90)
            camRight.setFromMatrixColumn(camera.matrixWorld, 0)
            qa.setFromAxisAngle(camRight, pitch * DEG)
            qb.setFromAxisAngle(AXES[1], yaw * DEG)
            root.quaternion.copy(qa).multiply(qb)
            root.position.set(0, bob - (1 - e) * 0.8, 0)
            // every grid fills the frame as the 2x2 still does
            root.scale.setScalar((Math.max(0.01, 0.8 + 0.2 * e) * 2) / N)
            canvas.style.opacity = String(clamp(e * 1.6))

            /* cubelets: twist, pose and parting */
            const seam = clamp(num(A.seam, DEFAULT_ADVANCED.seam), 0, 15) / 100
            const part = clamp(num(A.part, DEFAULT_ADVANCED.part), 0, 30) / 100
            const half = (1 + seam) / 2
            const cur = current as { move: Move; t: number } | null
            const mv = cur?.move
            const ang = cur ? cur.move.turns * 90 * cur.t : 0
            const openT = cur ? Math.sin(Math.PI * clamp(cur.t)) : 0
            const openP = clamp(Math.abs(pose) / Math.max(1, Math.abs(num(p.twist, DEFAULTS.twist)) || 20))
            cubelets.forEach((c, i) => {
                M.makeRotationFromQuaternion(c.q)
                M.setPosition(c.g.x * half, c.g.y * half, c.g.z * half)
                if (pose !== 0 && c.g.y === N - 1) {
                    T.makeTranslation(0, part * openP, 0).multiply(R.makeRotationY(pose * DEG))
                    M.premultiply(T)
                }
                if (mv && comp(c.g, mv.axis) === mv.layer) {
                    // an outer layer lifts off; a middle slice of a 3x3 stays put
                    P.copy(AXES[mv.axis]).multiplyScalar(Math.sign(mv.layer) * part * openT)
                    T.makeRotationAxis(AXES[mv.axis], ang * DEG).setPosition(P)
                    M.premultiply(T)
                }
                // the hovered cubelet rises along its own diagonal (~70 ms ease)
                lifts[i] += ((i === hoverIdx ? 1 : 0) - lifts[i]) * (1 - Math.exp(-step * 14))
                if (lifts[i] > 0.001) {
                    P.setFromMatrixPosition(M).normalize().multiplyScalar(0.06 * lifts[i])
                    M.elements[12] += P.x
                    M.elements[13] += P.y
                    M.elements[14] += P.z
                }
                c.mesh.matrix.copy(M)
                c.mesh.matrixWorldNeedsUpdate = true
            })

            /* materials */
            const bodyC = tmpC.set(C.body || DEFAULT_COLORS.body)
            cubelets.forEach((c) => (c.mesh.material as THREE.MeshPhysicalMaterial).color.copy(bodyC))
            // panels: one colour per side when Faces lists them (in the Words
            // order), Panel otherwise
            const faceList = (Array.isArray(C.faces) ? C.faces : []).filter((f) => typeof f === "string" && f)
            const panelCols = shared.uPanelCol.value as THREE.Color[]
            WORD_ORDER.forEach((face, i) => panelCols[face].set(faceList.length ? faceList[i % faceList.length] : C.panel || DEFAULT_COLORS.panel))
            ;(shared.uInk.value as THREE.Color).set(p.textColor || DEFAULTS.textColor)
            glowLin.set(C.glow || DEFAULT_COLORS.glow)
            ;(shared.uInner.value as THREE.Color).copy(glowLin).multiplyScalar(0.3)
            shared.uGhost.value = clamp(num(A.ghost, DEFAULT_ADVANCED.ghost), 0, 100) / 100
            const pan = clamp(num(A.panel, DEFAULT_ADVANCED.panel), 30, 96) / 100
            shared.uPanel.value = pan / 2
            // the still's panel corners: a fifth of the panel's half width
            shared.uPanelR.value = (pan / 2) * 0.2
            const rough = clamp(num(A.roughness, DEFAULT_ADVANCED.roughness), 2, 100) / 100
            shared.uRough.value = rough
            const coat = clamp(num(A.coat, DEFAULT_ADVANCED.coat), 0, 100) / 100
            cubelets.forEach((c) => ((c.mesh.material as THREE.MeshPhysicalMaterial).clearcoat = coat))
            coreMat.color.copy(glowLin).multiplyScalar(0.45)
            coreMat.emissive.copy(glowLin).multiplyScalar(0.05)
            const inner = clamp(num(A.inner, DEFAULT_ADVANCED.inner), 0, 300) / 100
            innerLight.color.copy(glowLin)
            sideLamp.color.copy(glowLin)
            sideLamp.intensity = 170 * side
            // the glow brightens as the layers part, as more of it escapes
            innerLight.intensity = 4 * inner * (0.55 + 0.45 * Math.max(openT, openP))
            renderer.toneMappingExposure = clamp(num(A.exposure, DEFAULT_ADVANCED.exposure), 20, 300) / 100

            renderer.render(scene, camera)

            if (!announced) {
                announced = true
                enter()
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            anims.forEach((a) => a.stop())
            anims = []
            document.fonts?.removeEventListener?.("loadingdone", onFonts)
            jost?.removeEventListener("load", refetch)
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerdown", onDown)
            host.removeEventListener("pointerup", onUp)
            host.removeEventListener("pointercancel", onUp)
            host.removeEventListener("pointerleave", onLeave)
            ro.disconnect()
            io?.disconnect()
            geo.dispose()
            cubelets.forEach((c) => (c.mesh.material as THREE.Material).dispose())
            core.geometry.dispose()
            armGeo.dispose()
            coreMat.dispose()
            atlas.dispose()
            envRT?.dispose()
            renderer.dispose()
            canvas.remove()
        }
    }, [])

    const label = (Array.isArray(words) && words.length ? words : DEFAULT_WORDS).join(" ")
    return (
        <div
            ref={hostRef}
            role="img"
            aria-label={`A puzzle cube spelling ${label}`}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                cursor: drag ? "grab" : "default",
                ...style,
            }}
        />
    )
}

/* -------------------------------------------------------- controls */
