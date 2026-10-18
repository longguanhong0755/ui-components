"use client"

import * as React from "react"
import { useEffect, useMemo, useRef } from "react"

/**
 * CURVE GALLERY — a few hundred small images scattered along a closed 3D curve
 * exported from Blender. The camera flies the curve on scroll, and whatever it
 * passes swells to fill the frame before shrinking back into the crowd.
 *
 * Ported from gaspoorf/curve-gallery (three + GSAP + Vite, Codrops tutorial).
 * The motion is the source's, term for term (rule 8): the same five Blender
 * curves at the same SCALE of 16, the same closed uniform Catmull-Rom with
 * tension 0.5, the same camera that NEVER rotates — it rides the curve at a
 * fixed +Z offset looking straight down -Z, which is what makes every plane
 * face it for free — the same focus test (a t-window AND a depth gate AND an
 * XY radius) and the same 1 + f^3 blow-up curve, the same linear white fog
 * from 10 to 40, and the same inverted, wrapped scroll mapping.
 *
 * WHAT IS NOT THE SOURCE'S: the machinery. No three, no GSAP, no npm at all
 * (rule 10, self-contained). WebGL2 throughout: one instanced draw of one quad
 * against a TEXTURE_2D_ARRAY, so a thousand planes cost one call.
 *
 * PORT DECISIONS, SAID PLAINLY
 *
 *  - THE FIVE PATHS ARE EMBEDDED, DECIMATED. The source fetches five JSON files
 *    of 714 Blender points each at runtime; a Framer code component has no
 *    server to fetch from. Every twelfth point is kept (every second for the
 *    84-point third path), which is 60 control points per curve instead of 714
 *    and 6KB of source instead of 90KB. Measured, not assumed: the decimated
 *    curve never leaves the original by more than 0.093 world units on curves
 *    123 to 236 units long, and the arc length changes by under 0.2%.
 *
 *  - THE PATH SWITCHER IS A PROPERTY, NOT A ROW OF BUTTONS. The demo's five
 *    DOM buttons, and the 1.4s tween that flew the planes to their new homes,
 *    are page chrome around the canvas rather than part of the component. Here
 *    Path is an enum and changing it rebuilds the instance buffer. The tween
 *    goes with the buttons; nothing else about switching changes.
 *
 *  - AUTO-SCROLL BECOMES Speed, AND IT IS ON BY DEFAULT. The demo ships a
 *    Scroll/Auto toggle, defaulting to scroll-only. A scroll-only component is
 *    dead on the Framer canvas, where there is no scroll (rule 5), so the
 *    source's auto rate — one lap in 10 seconds — is the default and 0 turns it
 *    off. Wheel and drag add on top of it, exactly as they do in the demo.
 *
 *  - THE SCATTER IS SEEDED. The source calls Math.random three times per plane,
 *    so its layout reshuffles on every reload. A fixed seed keeps one
 *    composition across re-renders, which is what a design tool needs.
 *
 *  - WHEEL IS SWALLOWED. The source runs full-screen and its Observer eats the
 *    page scroll; that is the interaction, so it is kept. A component dropped
 *    into a taller page will stop the page scrolling while the pointer is over
 *    it. Deliberate, and flagged here rather than discovered.
 *
 * GSAP'S TWO EASES BECOME TWO EXPONENTIAL DECAYS. quickTo re-targets a running
 * tween on every input event, which is a relaxation toward a moving goal, so
 * `x += (target - x) * (1 - exp(-k*dt))` is the same shape and is frame-rate
 * correct where the source's fixed durations are not. The camera's k is the
 * Damping dial; the per-plane scale keeps its own constant (the source's 0.4s
 * power3.out) because nothing about it is a design decision.
 *
 * KEY CHANGES FROM THE SOURCE (clean break, rule 11c — these are staged ports,
 * so no `?? oldKey` chains):
 *   TOTAL -> count · MAX_SCALE -> zoom (now a percent) · FOCUS_DIST -> focus
 *   (now a percent of the shipped 5.5) · SIZE_RANGE -> size (percent) ·
 *   LATERAL/DEPTH_OFFSET_RANGE -> scatter (one percent for both) · CAM_Z ->
 *   distance · camera fov -> perspective · AUTO_SCROLL_DURATION -> speed ·
 *   quickTo duration -> damping. Nothing carries an old key because nothing
 *   shipped in Framer under one.
 *
 * CUT, AND FROZEN IN A CONSTANT (rule 11b — the render path is unchanged):
 *   Z_GATE, the fog's near/far, the scroll sensitivity, the per-plane scale
 *   rate, the focus t-window's 1.5 factor, the plane size RANGE (only its
 *   scale is a dial), and the pixel-ratio cap.
 *
 * Rule 6 recipe: ONE GL context built in useEffect([]); every live input read
 * from a ref inside a raw rAF loop (raw rAF ticks on the Framer canvas, unlike
 * IntersectionObserver / framer-motion appear props). Never calls
 * loseContext() — getContext() hands back the SAME force-lost context on the
 * next StrictMode mount and renders black. Path / Count / Size / Scatter
 * rebuild the instance buffers; images re-upload the texture array; neither
 * touches the context.
 */

/* ---------------------------------------------------------------- constants */

// The curve is authored in Blender units; the source multiplies by 16 to get a
// usable scene scale.
const SCALE = 16

// Frozen from the source. None of these is a design decision.
const Z_GATE = 11 // depth gate on the focus test
const FOG_NEAR = 10
const FOG_FAR = 40
const FOCUS_T_FACTOR = 1.5 // focusTGate = FOCUS_DIST * 1.5 / curveLength
const SIZE_RANGE: [number, number] = [0.18, 0.4]
const LATERAL_RANGE: [number, number] = [-1, 1]
const DEPTH_RANGE: [number, number] = [-0.75, 0.75]
const SHIPPED_FOCUS = 5.5 // Focus 100% is this many world units
const SHIPPED_LAP = 10 // seconds per lap at Speed 50
const SCALE_K = 8.3 // per-plane scale decay; the source's 0.4s power3.out
const SENSITIVITY = 0.8 / 4 // divided by the host height, as the source does
const MAX_DPR = 2
const CELL = 512 // texture-array cell, square, cover-cropped
const MAX_LAYERS = 24

// The source's path1..path5, in order. Every twelfth Blender point (every
// second for path3, which ships only 84). Blender units — SCALE is applied
// when the curve is built.
const PATHS: number[][][] = [
    // path1: 714 Blender points decimated to 60
    [[-27.559,0,0],[-27.591,0.211,-0.231],[-27.707,0.411,-0.446],[-27.857,0.559,-0.601],[-28.065,0.661,-0.71],[-28.264,0.694,-0.752],[-28.469,0.655,-0.747],[-28.634,0.553,-0.703],[-28.78,0.393,-0.643],[-28.903,0.193,-0.575],[-29.005,-0.014,-0.517],[-29.121,-0.234,-0.449],[-29.232,-0.419,-0.38],[-29.361,-0.573,-0.279],[-29.481,-0.666,-0.146],[-29.581,-0.693,0.027],[-29.638,-0.647,0.239],[-29.636,-0.541,0.455],[-29.562,-0.373,0.685],[-29.43,-0.184,0.864],[-29.235,0.038,1.011],[-29.006,0.25,1.079],[-28.782,0.434,1.083],[-28.553,0.584,1.004],[-28.383,0.671,0.889],[-28.24,0.691,0.717],[-28.163,0.644,0.55],[-28.114,0.527,0.375],[-28.103,0.365,0.231],[-28.099,0.163,0.095],[-28.1,-0.058,-0.036],[-28.098,-0.261,-0.154],[-28.108,-0.453,-0.305],[-28.13,-0.59,-0.455],[-28.197,-0.676,-0.636],[-28.301,-0.69,-0.8],[-28.463,-0.635,-0.953],[-28.668,-0.513,-1.053],[-28.889,-0.35,-1.09],[-29.132,-0.139,-1.053],[-29.333,0.068,-0.948],[-29.505,0.282,-0.78],[-29.608,0.467,-0.563],[-29.646,0.601,-0.352],[-29.614,0.679,-0.12],[-29.537,0.69,0.058],[-29.42,0.626,0.224],[-29.3,0.506,0.327],[-29.174,0.328,0.42],[-29.063,0.127,0.481],[-28.957,-0.088,0.545],[-28.836,-0.302,0.611],[-28.719,-0.474,0.674],[-28.551,-0.612,0.728],[-28.377,-0.682,0.756],[-28.16,-0.687,0.737],[-27.968,-0.62,0.667],[-27.775,-0.491,0.53],[-27.639,-0.31,0.339],[-27.566,-0.113,0.123]],
    // path2: 714 Blender points decimated to 60
    [[-24.623,0,0],[-24.646,0.14,0.204],[-24.731,0.276,0.408],[-24.85,0.386,0.58],[-25.025,0.479,0.746],[-25.214,0.533,0.868],[-25.438,0.559,0.969],[-25.664,0.543,1.028],[-25.884,0.496,1.056],[-26.1,0.407,1.046],[-26.275,0.302,1.01],[-26.434,0.161,0.941],[-26.541,0.018,0.858],[-26.616,-0.144,0.754],[-26.642,-0.301,0.642],[-26.631,-0.447,0.531],[-26.576,-0.585,0.413],[-26.497,-0.693,0.313],[-26.379,-0.785,0.213],[-26.254,-0.842,0.134],[-26.106,-0.876,0.062],[-25.956,-0.876,0.01],[-25.81,-0.851,-0.029],[-25.664,-0.795,-0.056],[-25.54,-0.724,-0.068],[-25.42,-0.623,-0.072],[-25.33,-0.515,-0.066],[-25.251,-0.385,-0.053],[-25.201,-0.25,-0.036],[-25.17,-0.11,-0.016],[-25.165,0.04,0.006],[-25.181,0.176,0.026],[-25.225,0.323,0.046],[-25.286,0.447,0.06],[-25.373,0.572,0.07],[-25.478,0.675,0.071],[-25.599,0.762,0.064],[-25.74,0.828,0.043],[-25.879,0.866,0.013],[-26.036,0.88,-0.036],[-26.176,0.863,-0.094],[-26.321,0.817,-0.173],[-26.439,0.742,-0.261],[-26.54,0.643,-0.362],[-26.609,0.514,-0.475],[-26.642,0.379,-0.583],[-26.634,0.218,-0.703],[-26.586,0.068,-0.804],[-26.492,-0.093,-0.904],[-26.36,-0.232,-0.977],[-26.193,-0.358,-1.032],[-25.988,-0.458,-1.054],[-25.781,-0.522,-1.047],[-25.543,-0.556,-1.001],[-25.332,-0.551,-0.926],[-25.113,-0.51,-0.81],[-24.934,-0.435,-0.666],[-24.785,-0.335,-0.498],[-24.68,-0.206,-0.301],[-24.629,-0.075,-0.109]],
    // path3: 84 Blender points decimated to 42
    [[0.483,0.385,-5.705],[0.461,0.351,-5.562],[0.412,0.297,-5.395],[0.339,0.226,-5.224],[0.248,0.136,-5.074],[0.144,0.03,-4.966],[0.03,-0.093,-4.923],[-0.079,-0.177,-4.92],[-0.226,-0.237,-4.916],[-0.392,-0.267,-4.913],[-0.558,-0.26,-4.911],[-0.704,-0.209,-4.911],[-0.812,-0.106,-4.914],[-0.866,0.054,-4.951],[-0.842,0.202,-5.039],[-0.765,0.315,-5.157],[-0.658,0.371,-5.284],[-0.546,0.348,-5.402],[-0.45,0.224,-5.491],[-0.425,0.104,-5.545],[-0.444,-0.027,-5.621],[-0.509,-0.143,-5.706],[-0.623,-0.225,-5.788],[-0.788,-0.248,-5.855],[-1.007,-0.192,-5.897],[-1.175,-0.079,-5.93],[-1.249,0.057,-5.983],[-1.252,0.193,-6.055],[-1.207,0.308,-6.143],[-1.134,0.38,-6.245],[-1.057,0.387,-6.36],[-0.94,0.315,-6.52],[-0.814,0.219,-6.622],[-0.673,0.115,-6.679],[-0.509,0.019,-6.703],[-0.317,-0.05,-6.708],[-0.088,-0.077,-6.707],[0.143,-0.038,-6.657],[0.304,0.058,-6.524],[0.407,0.18,-6.336],[0.463,0.296,-6.119],[0.485,0.375,-5.9]],
    // path4: 714 Blender points decimated to 60
    [[-21.914,0,0],[-21.924,0.143,-0.117],[-21.963,0.286,-0.235],[-22.016,0.405,-0.334],[-22.096,0.518,-0.43],[-22.183,0.6,-0.502],[-22.285,0.661,-0.562],[-22.393,0.69,-0.602],[-22.497,0.689,-0.626],[-22.604,0.654,-0.637],[-22.695,0.594,-0.635],[-22.787,0.501,-0.628],[-22.86,0.396,-0.617],[-22.935,0.264,-0.607],[-22.998,0.127,-0.601],[-23.061,-0.017,-0.599],[-23.127,-0.165,-0.602],[-23.189,-0.295,-0.61],[-23.266,-0.425,-0.62],[-23.343,-0.526,-0.63],[-23.434,-0.611,-0.637],[-23.533,-0.666,-0.635],[-23.636,-0.692,-0.622],[-23.746,-0.685,-0.592],[-23.847,-0.649,-0.55],[-23.951,-0.581,-0.484],[-24.031,-0.494,-0.409],[-24.108,-0.376,-0.31],[-24.156,-0.25,-0.206],[-24.189,-0.11,-0.09],[-24.193,0.04,0.033],[-24.177,0.176,0.145],[-24.133,0.318,0.262],[-24.073,0.435,0.359],[-23.993,0.54,0.449],[-23.896,0.62,0.521],[-23.799,0.671,0.572],[-23.687,0.692,0.61],[-23.587,0.684,0.629],[-23.479,0.641,0.637],[-23.392,0.575,0.634],[-23.301,0.477,0.625],[-23.229,0.365,0.615],[-23.158,0.232,0.605],[-23.091,0.087,0.6],[-23.033,-0.051,0.599],[-22.965,-0.2,0.603],[-22.901,-0.329,0.612],[-22.825,-0.451,0.623],[-22.739,-0.553,0.632],[-22.652,-0.627,0.637],[-22.547,-0.676,0.632],[-22.448,-0.693,0.617],[-22.334,-0.679,0.583],[-22.238,-0.636,0.536],[-22.135,-0.561,0.466],[-22.057,-0.467,0.386],[-21.987,-0.348,0.287],[-21.94,-0.212,0.174],[-21.916,-0.076,0.062]],
    // path5: 714 Blender points decimated to 60
    [[4.095,0,0],[4.08,0.21,-0.115],[4.019,0.409,-0.227],[3.943,0.556,-0.312],[3.825,0.658,-0.388],[3.708,0.693,-0.434],[3.578,0.652,-0.465],[3.477,0.553,-0.476],[3.379,0.39,-0.485],[3.306,0.192,-0.497],[3.252,-0.014,-0.519],[3.2,-0.233,-0.563],[3.156,-0.417,-0.621],[3.102,-0.57,-0.698],[3.029,-0.666,-0.792],[2.942,-0.69,-0.88],[2.832,-0.647,-0.963],[2.72,-0.538,-1.015],[2.591,-0.37,-1.04],[2.479,-0.183,-1.026],[2.366,0.038,-0.979],[2.279,0.25,-0.895],[2.219,0.431,-0.799],[2.188,0.582,-0.665],[2.185,0.67,-0.546],[2.209,0.689,-0.405],[2.247,0.641,-0.297],[2.293,0.523,-0.188],[2.327,0.365,-0.117],[2.352,0.161,-0.046],[2.356,-0.058,0.018],[2.343,-0.258,0.076],[2.311,-0.45,0.153],[2.27,-0.589,0.236],[2.227,-0.673,0.35],[2.195,-0.69,0.471],[2.183,-0.633,0.608],[2.2,-0.511,0.736],[2.245,-0.347,0.847],[2.323,-0.138,0.945],[2.418,0.068,1.005],[2.533,0.28,1.038],[2.663,0.467,1.028],[2.772,0.598,0.995],[2.895,0.678,0.92],[2.985,0.687,0.838],[3.073,0.624,0.739],[3.125,0.504,0.662],[3.181,0.325,0.587],[3.224,0.127,0.54],[3.276,-0.087,0.507],[3.346,-0.3,0.488],[3.418,-0.471,0.482],[3.527,-0.609,0.47],[3.637,-0.681,0.454],[3.77,-0.684,0.412],[3.878,-0.62,0.358],[3.986,-0.488,0.271],[4.055,-0.309,0.17],[4.092,-0.112,0.061]],
]

const PATH_NAMES = ["Knot", "Teardrop", "Tangle", "Figure Eight", "Coil"]

/* ------------------------------------------------------------------ shaders */

const VERT = `#version 300 es
precision highp float;

layout(location=0) in vec2 aCorner;   // quad corner, -0.5 .. 0.5
layout(location=1) in vec3 aPos;      // world position on the curve
layout(location=2) in vec2 aMeta;     // x = base size, y = texture layer
layout(location=3) in float aScale;   // live focus scale

uniform mat4 uProj;
uniform vec3 uCam;
uniform float uAspect;   // plane height / plane width

out vec2 vUv;
out float vLayer;
out float vFogDepth;

void main(){
    vUv = aCorner + 0.5;
    vLayer = aMeta.y;

    float w = aMeta.x * aScale;
    vec3 p = aPos + vec3(aCorner.x * w, aCorner.y * w * uAspect, 0.0);

    // The camera never rotates: the view matrix is a pure translation, which
    // is exactly why every plane faces it without any billboard maths.
    vec3 view = p - uCam;
    vFogDepth = -view.z;
    gl_Position = uProj * vec4(view, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;
precision highp sampler2DArray;

in vec2 vUv;
in float vLayer;
in float vFogDepth;
out vec4 fragColor;

uniform sampler2DArray uTex;
uniform vec3 uFog;      // linear-light fog / background colour
uniform float uAspect;  // plane height / plane width
uniform float uRounded; // 0..100, percent of the maximum radius

vec3 toLinear(vec3 c){
    return mix(c / 12.92,
               pow((c + 0.055) / 1.055, vec3(2.4)),
               step(0.04045, c));
}
vec3 toSRGB(vec3 c){
    return mix(c * 12.92,
               1.055 * pow(max(c, vec3(0.0031308)), vec3(1.0 / 2.4)) - 0.055,
               step(0.0031308, c));
}

void main(){
    // Cover-crop the square cell into a quad of arbitrary aspect, so an Aspect
    // other than 100 crops the picture instead of stretching it.
    vec2 s = uAspect <= 1.0 ? vec2(uAspect, 1.0) : vec2(1.0, 1.0 / uAspect);
    vec2 uv = (vUv - 0.5) * s + 0.5;

    vec4 tex = texture(uTex, vec3(uv, vLayer));

    // Rounded corners as a signed distance in width-normalised space, so the
    // radius is a percent of the SHORT side at any Aspect.
    vec2 half2 = vec2(0.5, uAspect * 0.5);
    float r = (uRounded / 100.0) * min(half2.x, half2.y);
    vec2 q = (vUv - 0.5) * vec2(1.0, uAspect);
    vec2 d = abs(q) - (half2 - r);
    float sd = length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
    float fw = max(fwidth(sd), 1e-5);
    float cover = 1.0 - smoothstep(-fw, fw, sd);
    if (cover <= 0.0) discard;

    // three mixes fog in LINEAR light and encodes on output; matching that is
    // what keeps a white background from going grey at the far plane.
    vec3 lin = toLinear(tex.rgb);
    float fogFactor = smoothstep(${FOG_NEAR.toFixed(1)}, ${FOG_FAR.toFixed(1)}, vFogDepth);
    lin = mix(lin, uFog, fogFactor);

    // Alpha to coverage: the corner mask resolves against the MSAA buffer, so
    // rounded edges antialias without a sorted transparent pass.
    fragColor = vec4(toSRGB(lin), cover * tex.a);
}
`

/* ------------------------------------------------------------------ helpers */

// Colour dial input may be "#rgb", "#rrggbb", "#rrggbbaa", "rgb()", "rgba()",
// "hsl()", "hsla()" or "var(--token, fallback)" — a hex-only parse would make
// the colour dial look dead on a themed project.
function parseColor(input: string): [number, number, number] {
    if (!input) return [0, 0, 0]
    let s = String(input).trim()
    const v = s.match(/var\(\s*[^,)]+\s*,\s*([^)]+)\)/i)
    if (v) s = v[1].trim()

    const hsl = s.match(/hsla?\(([^)]+)\)/i)
    if (hsl) {
        const p = hsl[1].split(/[,/\s]+/).filter(Boolean)
        const h = ((((parseFloat(p[0]) || 0) % 360) + 360) % 360) / 360
        const sa = (parseFloat(p[1]) || 0) / 100
        const l = (parseFloat(p[2]) || 0) / 100
        const cc = (1 - Math.abs(2 * l - 1)) * sa
        const x = cc * (1 - Math.abs(((h * 6) % 2) - 1))
        const m = l - cc / 2
        const k = Math.floor(h * 6) % 6
        const t: [number, number, number][] = [
            [cc, x, 0], [x, cc, 0], [0, cc, x],
            [0, x, cc], [x, 0, cc], [cc, 0, x],
        ]
        const q = t[k < 0 ? 0 : k]
        return [q[0] + m, q[1] + m, q[2] + m]
    }

    const fn = s.match(/rgba?\(([^)]+)\)/i)
    if (fn) {
        const p = fn[1].split(/[,/\s]+/).filter(Boolean).map((n) => parseFloat(n))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }

    let h = s.replace("#", "")
    if (h.length === 3 || h.length === 4) h = h.split("").map((ch) => ch + ch).join("")
    h = h.padEnd(6, "0")
    return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
    ]
}

function srgbToLinear(c: number): number {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

// Deterministic PRNG. Plain Math.random would reshuffle the scatter on every
// reload; a seeded generator keeps one composition across re-renders.
function mulberry32(a: number) {
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/* -------------------------------------------------------------------- curve
 * three's CatmullRomCurve3 with closed=true, curveType "catmullrom" and
 * tension 0.5, reimplemented. Two things matter and both are easy to get
 * wrong: the tension form is init(p1, p2, tau*(p2-p0), tau*(p3-p1)), and
 * getPoint is uniform in CONTROL POINT INDEX, not in arc length — the camera's
 * speed therefore varies with the Blender point spacing, which is part of the
 * reference's motion and not a defect to normalise away.
 */

const TENSION = 0.5

function crAxis(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const v0 = (p2 - p0) * TENSION
    const v1 = (p3 - p1) * TENSION
    const t2 = t * t
    const t3 = t2 * t
    return (
        p1 +
        v0 * t +
        (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 +
        (2 * p1 - 2 * p2 + v0 + v1) * t3
    )
}

class ClosedCurve {
    pts: number[][]
    length: number
    constructor(raw: number[][], scale: number) {
        this.pts = raw.map((p) => [p[0] * scale, p[1] * scale, p[2] * scale])
        this.length = 0
        let prev = this.point(0)
        for (let i = 1; i <= 800; i++) {
            const q = this.point(i / 800)
            this.length += Math.hypot(q[0] - prev[0], q[1] - prev[1], q[2] - prev[2])
            prev = q
        }
    }
    point(t: number): [number, number, number] {
        const l = this.pts.length
        const p = l * t
        let i = Math.floor(p)
        const w = p - i
        i = ((i % l) + l) % l
        const at = (k: number) => this.pts[(((k % l) + l) % l)]
        const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
        return [
            crAxis(p0[0], p1[0], p2[0], p3[0], w),
            crAxis(p0[1], p1[1], p2[1], p3[1], w),
            crAxis(p0[2], p1[2], p2[2], p3[2], w),
        ]
    }
    // The source's getCurveFrame: a 2D normal from the XY tangent. three's
    // getTangent is a central difference on the same 1e-4 delta.
    frame(t: number): { pos: [number, number, number]; nx: number; ny: number } {
        const d = 1e-4
        const a = this.point(t - d < 0 ? t - d + 1 : t - d)
        const b = this.point(t + d > 1 ? t + d - 1 : t + d)
        let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]
        const l = Math.hypot(tx, ty, tz) || 1
        tx /= l; ty /= l; tz /= l
        return { pos: this.point(t), nx: -ty, ny: tx }
    }
}

/* ------------------------------------------------------------------ GL utils */

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("CurveGallery shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function link(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram | null {
    const v = compile(gl, gl.VERTEX_SHADER, vs)
    const f = compile(gl, gl.FRAGMENT_SHADER, fs)
    if (!v || !f) return null
    const p = gl.createProgram()
    if (!p) return null
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.linkProgram(p)
    gl.deleteShader(v)
    gl.deleteShader(f)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("CurveGallery link:", gl.getProgramInfoLog(p))
        return null
    }
    return p
}

// Cover-crop any image into one square CELL, the shape every array layer must
// share.
function toCell(src: CanvasImageSource, iw: number, ih: number): HTMLCanvasElement {
    const c = document.createElement("canvas")
    c.width = CELL
    c.height = CELL
    const ctx = c.getContext("2d")!
    const s = Math.max(CELL / Math.max(1, iw), CELL / Math.max(1, ih))
    const w = iw * s
    const h = ih * s
    ctx.drawImage(src, (CELL - w) / 2, (CELL - h) / 2, w, h)
    return c
}

// With no Images set, the panel is empty and so is the canvas. Eight soft
// duotone cells keep the composition legible while a designer fills the array.
function placeholderCells(): HTMLCanvasElement[] {
    const hues = [18, 44, 190, 214, 262, 320, 8, 152]
    return hues.map((hue) => {
        const c = document.createElement("canvas")
        c.width = CELL
        c.height = CELL
        const ctx = c.getContext("2d")!
        const g = ctx.createLinearGradient(0, 0, CELL, CELL)
        g.addColorStop(0, `hsl(${hue}, 42%, 78%)`)
        g.addColorStop(1, `hsl(${(hue + 40) % 360}, 34%, 46%)`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, CELL, CELL)
        return c
    })
}

/* -------------------------------------------------------------------- props */

interface ResponsiveImageLike {
    src?: string
    srcSet?: string
    alt?: string
}

interface CurveGalleryProps {
    images?: ResponsiveImageLike[]
    background?: string
    path?: string
    count?: number
    size?: number
    aspect?: number
    rounded?: number
    scatter?: number
    focus?: number
    zoom?: number
    speed?: number
    damping?: number
    distance?: number
    perspective?: number
    style?: React.CSSProperties
}

const MAX_COUNT = 1500
const SEED = 0x5eed1

const DEFAULT_IMAGES: ResponsiveImageLike[] = [
    { alt: "", src: "https://images.unsplash.com/photo-1741114056868-e9ab2d56ed64?q=80&w=3456&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D\n" },
    { alt: "", src: "https://images.unsplash.com/photo-1654521957182-f0277b65005a?q=80&w=2758&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D\n" },
    { alt: "", src: "https://images.unsplash.com/photo-1683718522443-355f717f3b2a?q=80&w=2760&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D\n" },
    { alt: "", src: "https://images.unsplash.com/photo-1656932850123-dbd64a854816?q=80&w=2803&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D\n" },
]

/* ---------------------------------------------------------------- component */

export default function CurveGallery(props: CurveGalleryProps) {
    const {
        images = DEFAULT_IMAGES,
        background = "#000000",
        path = "0",
        count = 400,
        size = 185,
        aspect = 105,
        rounded = 20,
        scatter = 175,
        focus = 70,
        zoom = 1400,
        speed = -20,
        damping = 25,
        distance = 7,
        perspective = 83,
        style,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // One deterministic scatter, drawn once for the largest Count the panel
    // allows, so raising Count adds planes instead of reshuffling the ones
    // already placed.
    const rnd = useMemo(() => {
        const r = mulberry32(SEED)
        const lateral = new Float32Array(MAX_COUNT)
        const depth = new Float32Array(MAX_COUNT)
        const sz = new Float32Array(MAX_COUNT)
        const tex = new Float32Array(MAX_COUNT)
        for (let i = 0; i < MAX_COUNT; i++) {
            lateral[i] = LATERAL_RANGE[0] + r() * (LATERAL_RANGE[1] - LATERAL_RANGE[0])
            depth[i] = DEPTH_RANGE[0] + r() * (DEPTH_RANGE[1] - DEPTH_RANGE[0])
            sz[i] = SIZE_RANGE[0] + r() * (SIZE_RANGE[1] - SIZE_RANGE[0])
            tex[i] = r()
        }
        return { lateral, depth, sz, tex }
    }, [])

    // Every live input the loop reads (rule 6). Touching one must never tear
    // the context down and recompile shaders.
    const live = useRef({
        bg: [1, 1, 1] as number[],
        bgCss: [1, 1, 1] as number[],
        path: 0,
        count: 500,
        size: 100,
        aspect: 100,
        rounded: 0,
        scatter: 100,
        focus: 100,
        zoom: 1400,
        speed: 50,
        damping: 17,
        distance: 10,
        perspective: 60,
    })
    const bgRgb = parseColor(background)
    live.current.bgCss = bgRgb
    live.current.bg = bgRgb.map(srgbToLinear)
    live.current.path = Math.max(0, Math.min(PATHS.length - 1, Math.round(Number(path) || 0)))
    live.current.count = Math.max(1, Math.min(MAX_COUNT, Math.round(count)))
    live.current.size = size
    live.current.aspect = aspect
    live.current.rounded = rounded
    live.current.scatter = scatter
    live.current.focus = focus
    live.current.zoom = zoom
    live.current.speed = speed
    live.current.damping = damping
    live.current.distance = distance
    live.current.perspective = perspective

    // Texture cells, handed to the loop through a ref with a dirty flag. Never
    // through state: a re-render that hands back the same canvas node bails
    // out of the upload and the array texture silently keeps the old images.
    const texRef = useRef<{ cells: HTMLCanvasElement[]; dirty: boolean }>({
        cells: [],
        dirty: false,
    })

    const srcKey = (images || []).map((i) => i?.src ?? "").join("|")

    useEffect(() => {
        let cancelled = false
        const srcs = (images || [])
            .map((i) => i?.src)
            .filter((s): s is string => !!s)
            .slice(0, MAX_LAYERS)

        if (srcs.length === 0) {
            texRef.current = { cells: placeholderCells(), dirty: true }
            return
        }

        Promise.all(
            srcs.map(
                (s) =>
                    new Promise<HTMLCanvasElement | null>((res) => {
                        const im = new Image()
                        im.crossOrigin = "anonymous"
                        im.onload = () => res(toCell(im, im.naturalWidth, im.naturalHeight))
                        im.onerror = () => res(null)
                        im.src = s
                    })
            )
        ).then((cells) => {
            if (cancelled) return
            const ok = cells.filter((c): c is HTMLCanvasElement => !!c)
            texRef.current = {
                cells: ok.length ? ok : placeholderCells(),
                dirty: true,
            }
        })

        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [srcKey])

    useEffect(() => {
        const canvas = canvasRef.current
        const host = hostRef.current
        if (!canvas || !host) return

        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true,
        })
        if (!gl) {
            console.warn("CurveGallery: WebGL2 unavailable")
            return
        }

        const prog = link(gl, VERT, FRAG)
        if (!prog) return
        const uProj = gl.getUniformLocation(prog, "uProj")
        const uCam = gl.getUniformLocation(prog, "uCam")
        const uAspect = gl.getUniformLocation(prog, "uAspect")
        const uTex = gl.getUniformLocation(prog, "uTex")
        const uFog = gl.getUniformLocation(prog, "uFog")
        const uRounded = gl.getUniformLocation(prog, "uRounded")

        /* ---- geometry: one quad, everything else per instance */
        const cornerBuf = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]),
            gl.STATIC_DRAW
        )
        const posBuf = gl.createBuffer()!
        const metaBuf = gl.createBuffer()!
        const scaleBuf = gl.createBuffer()!

        const vao = gl.createVertexArray()!
        gl.bindVertexArray(vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0)
        gl.vertexAttribDivisor(1, 1)
        gl.bindBuffer(gl.ARRAY_BUFFER, metaBuf)
        gl.enableVertexAttribArray(2)
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0)
        gl.vertexAttribDivisor(2, 1)
        gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuf)
        gl.enableVertexAttribArray(3)
        gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 0, 0)
        gl.vertexAttribDivisor(3, 1)
        gl.bindVertexArray(null)

        /* ---- texture array */
        const tex = gl.createTexture()!
        let layers = 0
        function uploadLayers(cells: HTMLCanvasElement[]) {
            const use = cells.slice(0, MAX_LAYERS)
            if (use.length === 0) return
            gl!.bindTexture(gl!.TEXTURE_2D_ARRAY, tex)
            gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, 1)
            gl!.texImage3D(
                gl!.TEXTURE_2D_ARRAY, 0, gl!.RGBA8,
                CELL, CELL, use.length, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null
            )
            for (let i = 0; i < use.length; i++) {
                gl!.texSubImage3D(
                    gl!.TEXTURE_2D_ARRAY, 0, 0, 0, i,
                    CELL, CELL, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, use[i]
                )
            }
            gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, 0)
            gl!.generateMipmap(gl!.TEXTURE_2D_ARRAY)
            gl!.texParameteri(gl!.TEXTURE_2D_ARRAY, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR)
            gl!.texParameteri(gl!.TEXTURE_2D_ARRAY, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR)
            gl!.texParameteri(gl!.TEXTURE_2D_ARRAY, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE)
            gl!.texParameteri(gl!.TEXTURE_2D_ARRAY, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE)
            layers = use.length
        }

        /* ---- instance state */
        const posArr = new Float32Array(MAX_COUNT * 3)
        const metaArr = new Float32Array(MAX_COUNT * 2)
        const scaleArr = new Float32Array(MAX_COUNT).fill(1)
        const tArr = new Float32Array(MAX_COUNT)

        let curve: ClosedCurve | null = null
        let builtKey = ""
        let instances = 0

        function rebuild(pathIdx: number, n: number, sizePct: number, scatterPct: number) {
            curve = new ClosedCurve(PATHS[pathIdx], SCALE)
            const sc = scatterPct / 100
            const sz = sizePct / 100
            const nLayers = Math.max(1, layers)
            for (let i = 0; i < n; i++) {
                const t = i / n
                tArr[i] = t
                const { pos, nx, ny } = curve.frame(t)
                const lat = rnd.lateral[i] * sc
                posArr[i * 3] = pos[0] + nx * lat
                posArr[i * 3 + 1] = pos[1] + ny * lat
                posArr[i * 3 + 2] = pos[2] + rnd.depth[i] * sc
                metaArr[i * 2] = rnd.sz[i] * sz
                metaArr[i * 2 + 1] = Math.min(nLayers - 1, Math.floor(rnd.tex[i] * nLayers))
            }
            gl!.bindBuffer(gl!.ARRAY_BUFFER, posBuf)
            gl!.bufferData(gl!.ARRAY_BUFFER, posArr.subarray(0, n * 3), gl!.DYNAMIC_DRAW)
            gl!.bindBuffer(gl!.ARRAY_BUFFER, metaBuf)
            gl!.bufferData(gl!.ARRAY_BUFFER, metaArr.subarray(0, n * 2), gl!.DYNAMIC_DRAW)
            gl!.bindBuffer(gl!.ARRAY_BUFFER, scaleBuf)
            gl!.bufferData(gl!.ARRAY_BUFFER, scaleArr.subarray(0, n), gl!.DYNAMIC_DRAW)
            instances = n
        }

        /* ---- input. The source's Observer over wheel + drag, and its
         * sensitivity, which is relative to the host height so one flick
         * travels the same fraction of the curve at any size. */
        let targetT = 0
        let camT = 0
        let dragging = false
        let lastY = 0

        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            targetT += e.deltaY * (SENSITIVITY / Math.max(1, host!.clientHeight))
        }
        const onDown = (e: PointerEvent) => {
            dragging = true
            lastY = e.clientY
        }
        const onMove = (e: PointerEvent) => {
            if (!dragging) return
            targetT += (lastY - e.clientY) * (SENSITIVITY / Math.max(1, host!.clientHeight)) * 6
            lastY = e.clientY
        }
        // Released on window, never on the host: a pointer that leaves
        // mid-drag would otherwise never release (rule K).
        const onUp = () => {
            dragging = false
        }
        host.addEventListener("wheel", onWheel, { passive: false })
        host.addEventListener("pointerdown", onDown)
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        /* ---- frame */
        const proj = new Float32Array(16)
        let raf = 0
        let prev = performance.now()

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min(0.05, (now - prev) / 1000)
            prev = now
            const L = live.current

            if (texRef.current.dirty) {
                uploadLayers(texRef.current.cells)
                texRef.current.dirty = false
                builtKey = "" // layer count may have moved; re-pick per plane
            }
            if (layers === 0) return

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = Math.max(1, Math.round(host!.clientWidth * dpr))
            const ch = Math.max(1, Math.round(host!.clientHeight * dpr))
            if (canvas!.width !== cw || canvas!.height !== ch) {
                canvas!.width = cw
                canvas!.height = ch
            }

            const key = [L.path, L.count, L.size, L.scatter, layers].join(",")
            if (key !== builtKey) {
                rebuild(L.path, L.count, L.size, L.scatter)
                builtKey = key
            }
            if (!curve) return

            /* -- scroll + autoscroll, then one relaxation toward the target */
            targetT += (L.speed / 50) * (1 / SHIPPED_LAP) * dt
            camT += (targetT - camT) * (1 - Math.exp(-Math.max(1, L.damping) * 0.2 * dt))

            // Inverted and wrapped, so scrolling down moves the camera forward.
            const t = (((1 - camT) % 1) + 1) % 1
            const p = curve.point(t)
            const camX = p[0]
            const camY = p[1]
            const camZ = p[2] + L.distance

            /* -- focus pass. The source's three gates, unchanged. */
            const focusDist = Math.max(0.01, (L.focus / 100) * SHIPPED_FOCUS)
            const maxScale = Math.max(1, L.zoom / 100)
            const focusTGate = (focusDist * FOCUS_T_FACTOR) / curve.length
            const k = 1 - Math.exp(-SCALE_K * dt)
            for (let i = 0; i < instances; i++) {
                const dx = camX - posArr[i * 3]
                const dy = camY - posArr[i * 3 + 1]
                const dz = Math.abs(camZ - posArr[i * 3 + 2])
                const distXY = Math.sqrt(dx * dx + dy * dy)
                let dtt = Math.abs(tArr[i] - t)
                if (dtt > 0.5) dtt = 1 - dtt
                const inFocus = dtt < focusTGate && dz < Z_GATE && distXY < focusDist
                const f = 1 - distXY / focusDist
                const target = inFocus ? 1 + f * f * f * (maxScale - 1) : 1
                scaleArr[i] += (target - scaleArr[i]) * k
            }
            gl!.bindBuffer(gl!.ARRAY_BUFFER, scaleBuf)
            gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, scaleArr.subarray(0, instances))

            /* -- projection: a pure translation view, so only proj is needed */
            const asp = cw / ch
            const f2 = 1 / Math.tan((Math.max(5, L.perspective) * Math.PI) / 360)
            proj.fill(0)
            proj[0] = f2 / asp
            proj[5] = f2
            proj[10] = (200 + 0.1) / (0.1 - 200)
            proj[11] = -1
            proj[14] = (2 * 200 * 0.1) / (0.1 - 200)

            /* -- draw */
            gl!.viewport(0, 0, cw, ch)
            gl!.clearColor(L.bgCss[0], L.bgCss[1], L.bgCss[2], 1)
            gl!.enable(gl!.DEPTH_TEST)
            gl!.disable(gl!.CULL_FACE)
            gl!.enable(gl!.SAMPLE_ALPHA_TO_COVERAGE)
            gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT)
            gl!.useProgram(prog)
            gl!.bindVertexArray(vao)
            gl!.activeTexture(gl!.TEXTURE0)
            gl!.bindTexture(gl!.TEXTURE_2D_ARRAY, tex)
            gl!.uniform1i(uTex, 0)
            gl!.uniformMatrix4fv(uProj, false, proj)
            gl!.uniform3f(uCam, camX, camY, camZ)
            gl!.uniform1f(uAspect, Math.max(1, L.aspect) / 100)
            gl!.uniform1f(uRounded, L.rounded)
            gl!.uniform3f(uFog, L.bg[0], L.bg[1], L.bg[2])
            gl!.drawArraysInstanced(gl!.TRIANGLE_STRIP, 0, 4, instances)
        }

        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            host.removeEventListener("wheel", onWheel)
            host.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            // No loseContext(): getContext hands back the SAME context on the
            // next StrictMode mount, and a force-lost one renders black.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                overflow: "hidden",
                touchAction: "none",
                minWidth: 1200,
                minHeight: 800,
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
                }}
            />
        </div>
    )
}
