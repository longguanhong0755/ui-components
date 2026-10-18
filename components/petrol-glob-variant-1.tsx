"use client"

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
 *  PetrolGlob
 *
 *  Built after a reference animation supplied as ten stills, plus a
 *  written brief: a single glob of molten, oil-slick glass hanging in a
 *  black void, its rim burning orange and electric blue, its body
 *  breathing between a calm bubble and a crumpled, folded lump. Our
 *  component is PetrolGlob.
 *
 *  WHAT THE TEN FRAMES ACTUALLY DO
 *
 *    It breathes in storms.  Frames 5-6 are a near-perfect sphere; 1-4
 *                  and 10 are soft lumps; 7-9 are crumpled hard, with
 *                  sharp folds like cellophane. That is one envelope
 *                  running calm -> storm -> calm, and it drives the
 *                  amplitude of the deformation AND how fine and sharp
 *                  it gets — the brief's "amplitude and frequency must
 *                  be dynamically animated".
 *    The colour is a wheel, fixed to the view.  Side by side with a
 *                  full-size still, the original's colour is not a
 *                  pattern on the surface: it is a rainbow running round
 *                  the rim — gold on the right, a little green top right,
 *                  a wide blue band over the top left, magenta-white down
 *                  the left, red-orange all along the bottom — and it
 *                  stays put while the glob tumbles. So the hue is the
 *                  angle of the view-space normal walked once through the
 *                  Colors list (paletteAt), whose ten default stops are
 *                  that rim read off the still; the surface only nudges
 *                  it, so the bands bend over every lump and drift as it
 *                  churns. Any list of colours wraps the same way.
 *    The bands are marbled.  Inside them run smeared, brushed streaks,
 *                  and here and there a soft island of a far colour — the
 *                  cyan spot in the gold, the blue dent up top. A stretched
 *                  noise draws the streaks and an unwarped low one throws
 *                  up the islands; both are read in the glob's own space,
 *                  so the texture rides the surface.
 *    The middle is dark, not empty.  The colour is a thick band over the
 *                  outer half of the radius fading into a dark core, and
 *                  through that core the far side shows dim and smeared —
 *                  maroon into olive, a whisper of the opposite band.
 *    It is wet.  Over the film sits a clear coat (added on request after
 *                  the first port): Schlick Fresnel at lacquer's 0.04
 *                  driving a broad sheen from three big soft lights, which
 *                  gathers on the flanks in the band's own colour pushed
 *                  toward white — white-gold over gold, as in the still —
 *                  plus a hot strip and a glint. The face stays clear.
 *                  Held in view space, so the lights stay put and the
 *                  highlights slide and bend over the moving surface.
 *    The edges fringe.  A thin red-outside, blue-inside split along every
 *                  silhouette, the way light through real glass does,
 *                  done as a radial channel offset in the output pass.
 *    The glow is red.  The halo bleeding into the black is redder than
 *                  the rim it comes from. Two things do that here: the
 *                  rim carries a red term at the very silhouette, and the
 *                  tone curve's toe crushes the weak green and blue of a
 *                  faint orange bloom tail faster than its red — so the
 *                  glow reddens as it fades, while the hottest yellow on
 *                  the body burns through to white.
 *
 *  WHERE WE DEVIATE FROM THE BRIEF, AND WHY
 *
 *    Frequency is cross-faded, not scaled. Multiplying the noise domain
 *                  by a moving frequency makes the whole pattern zoom
 *                  in and out of the centre of the noise space. Here the
 *                  low lumps and the fine folds are two fixed-frequency
 *                  layers and the envelope moves their AMPLITUDES — the
 *                  fold layer by the envelope squared — so the surface
 *                  gets finer as it gets wilder without anything
 *                  sliding.
 *    A cube-sphere, not an IcosahedronGeometry. three's icosahedron is
 *                  non-indexed, so every vertex is shaded six times, and
 *                  this vertex shader evaluates ten noises. A
 *                  normalised BoxGeometry (with the equal-angle warp) is
 *                  indexed: about a sixth of the vertex work for the
 *                  same density.
 *    Normals are rebuilt in the vertex shader. Displacing along the
 *                  normal leaves the old sphere normals behind, and the
 *                  folds would be lit as if the glob were still round.
 *                  The normal comes from the noise's analytic gradient
 *                  (snoiseGrad), chained through the warp — exact, and a
 *                  third of the work of the finite difference it replaced.
 *                  The folds catch the light because they really face it.
 *    The pixel shader has no noise in it. The skin's texture fields are
 *                  far smoother than the mesh, so they are evaluated per
 *                  vertex and interpolated. On a mesh this dense every
 *                  pixel is shaded several times over (2x2 quads on 1-2px
 *                  triangles), so per-pixel noise was most of the frame —
 *                  measured with GPU timer queries, moving it cut High from
 *                  20 ms to 14, and FXAA in place of MSAA took it to 7.
 *    UnrealBloomPass's knobs, not its filtering. The brief asked for
 *                  UnrealBloomPass, and it was first transcribed verbatim
 *                  from three/examples/jsm/postprocessing/
 *                  UnrealBloomPass.js (r170). On this subject it rendered
 *                  the glow as blocks: its hard high pass flickers a thin
 *                  hot rim on and off, its single-tap downsample turns
 *                  that into isolated texels, and its composite stretches
 *                  the 1/32 mip to full size with one bilinear tap. The
 *                  chain is now the filtered-mip bloom (soft knee, 13-tap
 *                  downsamples with a Karis average, tent upsamples); its
 *                  five mips, bloomFactors [1.0, 0.8, 0.6, 0.4, 0.2] and
 *                  lerpBloomFactor are kept, so Strength, Radius and
 *                  Threshold mean what they did. See PREFILTER_FRAG.
 *    Fold crests are rounded. The fold is 1 - |noise|, whose kink cannot
 *                  be followed by a triangle grid it crosses diagonally;
 *                  it drew a zipper along every crease. A soft abs rounds
 *                  the crest over about two triangles. See displace().
 *    The tone map is per channel, not ACES. Rendered against the frames,
 *                  three's ACES turned every saturated rim pastel and the
 *                  blue band violet. A per-channel 1 - exp(-c) with a
 *                  toe keeps the blue blue and lets orange burn through
 *                  yellow to white, which is what the stills do. See
 *                  OUTPUT_FRAG.
 *    No HDRI. An environment map is a fetch; a view-fixed studio is what
 *                  the frames show anyway (see above).
 *    It arrives and runs smoothly. The canvas fades up on its first
 *                  painted frame rather than popping in after the shader
 *                  compile. The hover is springs, not lerps: the lean and
 *                  a stroke's energy start from rest and settle without
 *                  overshoot, and the warp — which moves the whole noise
 *                  domain — follows an even slower copy of the energy, so
 *                  touching the glob swells it instead of making it lurch.
 *                  The pointer is read from the event's own offset, never
 *                  getBoundingClientRect, which forces a layout per move;
 *                  and if a device cannot hold ~48fps the pixel ratio
 *                  steps down a quarter at a time (never below 1, never
 *                  back up) so resolution gives way before frame rate.
 *    Its clock is integrated. The storm cycle and the flow of the noise
 *                  both advance by dt * rate, so dragging Speed or
 *                  Rhythm while it plays changes the pace without the
 *                  shape jumping.
 *
 *  NO TRANSITION CONTROL. Everything that moves is a rAF loop driving
 *  shader uniforms; there is no framer-motion animation for a
 *  ControlType.Transition to drive. Shape and Response carry their own
 *  abstract scales instead.
 *
 *  Requires `three`. In Framer that resolves on its own; in Next.js add
 *  it to package.json. The `framer` import supplies the property
 *  controls only — under plain Next.js, alias it to a stub exporting a
 *  no-op `addPropertyControls`, a `ControlType` object and a
 *  `RenderTarget` with `current: () => "preview"`.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 720
 * @framerIntrinsicHeight 900
 * ------------------------------------------------------------------ */

/* ----------------------------------------------------------- defaults */

const DEFAULT_SHAPE = {
    /** 5 -> base noise frequency 0.62 on the unit sphere. */
    detail: 5,
    /** 5 -> lumps of 0.24 radius at the height of a storm. */
    morph: 5,
    /** 5 -> folds of 0.09 radius, crest exponent 4. */
    folds: 5,
    /** 5 -> one calm -> storm -> calm breath every 9 s. */
    rhythm: 5,
}

const DEFAULT_LIGHT = {
    key: "#FFA21A",
    fill: "#1A6EFF",
    rim: "#FF2A0A",
}

const DEFAULT_FINISH = {
    /** 0-10 strength of the oil-slick tint; 5 lets it carry most of the
     *  colour, as in the original. */
    film: 5,
    /** 0-10 strength of the clear coat — the softbox reflections and the
     *  glint that make it read as a wet, lacquered thing. */
    gloss: 5,
    /** 0-10 how far the dark core reaches out toward the rim. */
    edge: 5,
    /** 0-10 how much of the dark interior shows through. */
    depth: 5,
}

const DEFAULT_GLOW = {
    /** 5 -> BLOOM_STRENGTH. */
    strength: 5,
    /** 5 -> BLOOM_RADIUS — the original's halo hugs the rim. */
    radius: 5,
    /** 5 -> BLOOM_THRESHOLD — high, as the brief asks, so only
     *  the rim and the lit fold walls bloom and the dark body stays dark. */
    threshold: 5,
}

const DEFAULT_RESPONSE = {
    /** 0-10 how far it leans toward the cursor. */
    tilt: 4,
    /** 0-10 how much moving the cursor over it whips up a storm. */
    stir: 5,
    /** 0-10 how quickly the lean chases the cursor. */
    follow: 5,
}

/** The rim's colours, counter-clockwise from the right, spread evenly
 *  round it. Read off the original: orange-gold on the right, gold into a
 *  short green over the top right, azure and a wide blue across the top
 *  left, violet-magenta down the left, then red into orange all along
 *  the bottom. Ten stops so the even spacing lands where the original
 *  puts each hue. */
const DEFAULT_COLORS = [
    "#FF8A1F",
    "#FFC21A",
    "#3CEB7A",
    "#1EA0FF",
    "#2238FF",
    "#B02BFF",
    "#FF2438",
    "#FF3418",
    "#FF5512",
    "#FF7418",
]

const DEFAULTS = {
    background: "#000000",
    size: 7,
    speed: 5,
    spin: 4,
    quality: "high",
}

/* -------------------------------------------------------------- types */

export interface PetrolGlobShape {
    /** 0-10 how many lumps and folds fit round the glob */
    detail?: number
    /** 0-10 how far the lumps push out at the height of a storm */
    morph?: number
    /** 0-10 how deep and how sharp the creases get */
    folds?: number
    /** 0-10 how often it breathes from calm to storm; 10 is fastest */
    rhythm?: number
}

export interface PetrolGlobLight {
    /** The warm studio light: how brightly the right side burns, and the
     *  hot reflected strip down it */
    key?: string
    /** The electric line along the bottom silhouette */
    fill?: string
    /** The silhouette colour, and so the colour of the halo */
    rim?: string
}

export interface PetrolGlobFinish {
    /** 0-10 how much the rainbow film, rather than the studio, sets the colour */
    film?: number
    /** 0-10 strength of the glossy clear coat and its reflections */
    gloss?: number
    /** 0-10 how far the dark core reaches out toward the rim */
    edge?: number
    /** 0-10 how much of the dark interior shows through the face */
    depth?: number
}

export interface PetrolGlobGlow {
    /** 0-10 how much bloom is added back */
    strength?: number
    /** 0-10 how wide the bloom spreads */
    radius?: number
    /** 0-10 how bright a thing must be before it blooms */
    threshold?: number
}

export interface PetrolGlobResponse {
    /** 0-10 how far it leans toward the cursor */
    tilt?: number
    /** 0-10 how much a moving cursor stirs it into a storm */
    stir?: number
    /** 0-10 how quickly the lean chases the cursor */
    follow?: number
}

export interface PetrolGlobProps {
    /** The void. A translucent value lets the page through: the glob is
     *  emissive, so it is laid over the page like light, not paint. */
    background?: string
    /** 0-10 how much of the frame's short side the glob fills */
    size?: number
    /** The rim's colours, counter-clockwise from the right, spread evenly
     *  round it; each holds a band and blends into the next. Up to 12. */
    colors?: string[]
    shape?: PetrolGlobShape
    light?: PetrolGlobLight
    finish?: PetrolGlobFinish
    glow?: PetrolGlobGlow
    response?: PetrolGlobResponse
    /** 0-10 how fast the surface churns */
    speed?: number
    /** 0-10 how fast it tumbles */
    spin?: number
    /** Mesh density and render scale; drop it with several on a page */
    quality?: "low" | "medium" | "high"
    style?: CSSProperties
}

/* ---------------------------------------------------------- constants */

/** Vertical field of view. A long lens: the reference is a small
 *  object framed tight, and a wide one would bulge the near side. */
const FOV = 30

/** Cube-sphere segments per face edge, by quality. 128 is 99k
 *  vertices — enough that a fold is several triangles wide. Past it the
 *  cost is all vertex noise and the picture does not change. */
const SEGMENTS = { low: 64, medium: 80, high: 96 }
const DPR_CAP = { low: 1, medium: 1.5, high: 2 }

/** The deformation is never fully still: frame 6, the calmest, still
 *  wobbles a little. This share of the peak lump survives at rest. */
const CALM_FLOOR = 0.18

/** Spin rates at Spin 5, rad/s about y and x. The frames show the glob
 *  tumbling, not turning on a spit, so both axes move. */
const SPIN_Y = 0.24
const SPIN_X = 0.1

/** Exposure into the output pass's per-channel curve. */
const TONE_EXPOSURE = 1.1

/** Most colours the rim takes; the shader's palette array is this long. */
const MAX_COLORS = 12

/** Radial colour split in the output pass, as a share of the distance
 *  from the centre of the frame. The original's edges carry a thin blue
 *  fringe inside and red outside, the way light through real glass does;
 *  at this size it is two or three pixels at the glob's rim and nothing at
 *  its middle. The look, not a knob. */
const CHROMA = 0.003

/** How fast stirred energy bleeds away, per second. */
const STIR_DECAY = 1.4
/** Natural frequency of the spring that eases a stroke's energy into the
 *  surface, rad/s: about half a second to arrive, starting from rest. */
const STIR_EASE = 4.5
/** How fast the warp — the shape of the churn — follows the energy, per
 *  second. Slow on purpose; see calmEnergy. */
const WARP_EASE = 0.9

/** Adaptive resolution: wait this long, then look this often. */
const ADAPT_AFTER = 3
const ADAPT_EVERY = 2

/** The single frame drawn on the Framer canvas and for a visitor who
 *  has asked for less movement: mid-storm, so the canvas shows lumps
 *  and a fold or two rather than a plain ball. */
const FROZEN_FLOW = 7.3
const FROZEN_ENERGY = 0.62

/* Glow. N_MIPS and BLOOM_FACTORS are UnrealBloomPass's (three/examples/
 * jsm/postprocessing/UnrealBloomPass.js, r170); the filtering around them
 * is not — see PREFILTER_FRAG. */
const N_MIPS = 5
const BLOOM_FACTORS = [1.0, 0.8, 0.6, 0.4, 0.2]
/** Values at 5 on Glow's three controls. */
const BLOOM_THRESHOLD = 1.0
const BLOOM_STRENGTH = 1.15
const BLOOM_RADIUS = 0.35
/** Width of the soft knee under the threshold: the ramp that lets a
 *  pixel fade into the glow instead of switching on. */
const BLOOM_KNEE = 0.5

/* ------------------------------------------------------------ helpers */

/** Abstract 0-10 to a physical number, with 5 landing exactly on the
 *  designed value and the ends opening it up either way. */
function dial(v: number | undefined, lo: number, mid: number, hi: number) {
    const t = Math.max(
        0,
        Math.min(10, typeof v === "number" && isFinite(v) ? v : 5)
    )
    return t <= 5 ? lo + (t / 5) * (mid - lo) : mid + ((t - 5) / 5) * (hi - mid)
}

/** Framer hands grouped controls back as whole objects, and an object
 *  saved before a field existed comes back without it — so merge rather
 *  than trust, and drop undefined so a partial group cannot punch a hole
 *  in the defaults. */
function merge<T extends object>(base: T, over?: Partial<T>): T {
    const out = { ...base }
    if (!over) return out
    for (const key of Object.keys(over) as (keyof T)[]) {
        const value = over[key]
        if (value !== undefined) out[key] = value as T[keyof T]
    }
    return out
}

/** THREE.Color reads hex and rgba() but drops the alpha, and the alpha
 *  is what lets the page show through. */
function alphaOf(input?: string) {
    const m = String(input ?? "").match(
        /^\s*rgba\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([\d.]+)\s*\)\s*$/i
    )
    if (!m) return 1
    const a = parseFloat(m[1])
    return isFinite(a) ? Math.max(0, Math.min(1, a)) : 1
}

function colorOf(input: string | undefined, fallback: string, out: THREE.Color) {
    // The alpha is read separately by alphaOf; handing it to setStyle
    // only earns a console warning per change.
    const css = String(input ?? "")
        .trim()
        .replace(/^rgba\(\s*([^,]+),\s*([^,]+),\s*([^,]+),[^)]*\)$/i, "rgb($1, $2, $3)")
    try {
        out.setStyle(css || fallback)
    } catch {
        out.setStyle(fallback)
    }
    return out
}

const isStatic = () => {
    try {
        return RenderTarget.current() === RenderTarget.canvas
    } catch {
        return false
    }
}

interface Params {
    background: string
    size: number
    colors: string[]
    shape: Required<PetrolGlobShape>
    light: Required<PetrolGlobLight>
    finish: Required<PetrolGlobFinish>
    glow: Required<PetrolGlobGlow>
    response: Required<PetrolGlobResponse>
    speed: number
    spin: number
    quality: "low" | "medium" | "high"
}

function makeParams(p: PetrolGlobProps): Params {
    const quality =
        p.quality === "low" || p.quality === "medium" || p.quality === "high"
            ? p.quality
            : DEFAULTS.quality
    return {
        background: p.background ?? DEFAULTS.background,
        size: p.size ?? DEFAULTS.size,
        // Rows the user has cleared are skipped; an emptied list falls
        // back to the default wheel rather than rendering nothing.
        colors: (() => {
            const list = (Array.isArray(p.colors) ? p.colors : [])
                .filter((c) => typeof c === "string" && c.trim().length > 0)
                .slice(0, MAX_COLORS)
            return list.length ? list : DEFAULT_COLORS
        })(),
        shape: merge(DEFAULT_SHAPE, p.shape),
        light: merge(DEFAULT_LIGHT, p.light),
        finish: merge(DEFAULT_FINISH, p.finish),
        glow: merge(DEFAULT_GLOW, p.glow),
        response: merge(DEFAULT_RESPONSE, p.response),
        speed: p.speed ?? DEFAULTS.speed,
        spin: p.spin ?? DEFAULTS.spin,
        quality,
    }
}

/** How far the camera stands so the glob's rest radius fills the asked
 *  share of the frame's SHORT side — it keeps its size when the frame
 *  goes from portrait to landscape. 5 is the reference's 0.58. */
function cameraDistance(size: number, aspect: number) {
    const fill = dial(size, 0.22, 0.58, 0.95)
    const halfFov = Math.tan((FOV * Math.PI) / 360)
    return 1 / Math.max(0.02, fill * halfFov * Math.min(1, aspect))
}

/* ---------------------------------------------------------- geometry --
 * A cube-sphere: six BoxGeometry faces pushed onto the unit sphere with
 * the equal-angle warp (tan of the face coordinate) so the cells come out
 * nearly even instead of bunching at the cube's corners. Indexed, which
 * is the point — see the header. Normals are not stored: the vertex
 * shader rebuilds them from the displaced surface.
 */
function cubeSphere(segments: number): THREE.BufferGeometry {
    const geo = new THREE.BoxGeometry(2, 2, 2, segments, segments, segments)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const v = new THREE.Vector3()
    const q = Math.PI / 4
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i)
        v.set(Math.tan(v.x * q), Math.tan(v.y * q), Math.tan(v.z * q))
        v.normalize()
        pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.deleteAttribute("normal")
    geo.deleteAttribute("uv")
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.6)
    return geo
}

/* -------------------------------------------------------------- noise --
 * 3D simplex noise, Ashima Arts / Stefan Gustavson (webgl-noise, MIT),
 * as the brief asks. Shared by both stages.
 */
const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`

/* ------------------------------------------------------- glob shaders */

const GLOB_VERT = /* glsl */ `
// Rounding of the fold crest, in noise units; see main().
#define CREST_K 0.09

uniform float uFlow;    // integrated churn clock
uniform float uFreq;    // base frequency (Detail)
uniform float uLump;    // low-frequency amplitude, envelope applied
uniform float uFold;    // fold amplitude, envelope applied
uniform float uSharp;   // crest exponent of the folds
uniform float uWarp;    // domain-warp strength, slow envelope applied

varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec3 vSurf;
varying float vFold;
// broad film thickness, brushed streaks, islands — see GLOB_VERT
varying vec3 vTex;

${SIMPLEX}

// The same simplex noise, returning its analytic gradient as well. The
// value is 105 * sum(t^4 * (g.x)) with t = max(0.5 - |x|^2, 0), so the
// gradient is 105 * sum(t^4 * g - 8 * t^3 * (g.x) * x). Costs little more
// than the plain noise, and replaces the two extra displacement passes
// the normal used to need.
float snoiseGrad(vec3 v, out vec3 grad) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    vec4 m2 = m * m;
    vec4 m4 = m2 * m2;
    vec4 pdotx = vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3));
    vec4 t3 = m2 * m * pdotx;
    grad = -8.0 * (t3.x * x0 + t3.y * x1 + t3.z * x2 + t3.w * x3)
        + m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3;
    grad *= 105.0;
    return 105.0 * dot(m4, pdotx);
}

void main() {
    vec3 p = normalize(position);
    vec3 q = p * uFreq;

    // One warp field feeds both layers, so the folds ride the lumps
    // instead of ignoring them.
    vec3 G0;
    vec3 G1;
    vec3 G2;
    vec3 w = vec3(
        snoiseGrad(q * 0.8 + vec3(uFlow * 0.31, 0.0, 0.0), G0),
        snoiseGrad(q * 0.8 + vec3(17.3, uFlow * 0.27, 0.0), G1),
        snoiseGrad(q * 0.8 + vec3(0.0, 41.9, -uFlow * 0.29), G2)
    );

    vec3 L;
    float lump = snoiseGrad(q + w * uWarp + vec3(0.0, uFlow * 0.22, 0.0), L);

    // 1 - |n| is a crest wherever the noise crosses zero: a long, sharp
    // ridge — the crumpled-cellophane fold of frames 7-9. A SOFT abs,
    // sqrt(n^2 + k^2) - k: abs() has a true kink on the crest, which a
    // triangle grid crossing it diagonally drew as a zipper of sawteeth.
    vec3 R;
    float rn = snoiseGrad(q * 1.35 + w * uWarp + vec3(uFlow * 0.18, 0.0, 9.1), R);
    float sq = sqrt(rn * rn + CREST_K * CREST_K);
    float ridge = max(1.0 - (sq - CREST_K), 1e-5);
    float fold = pow(ridge, uSharp);

    float d = uLump * lump + uFold * (fold - 0.3);

    /* The normal, analytically. Each layer is f(a*q + W*w(q)), so its
     * gradient in q is a*grad(f) + W * 0.8 * sum_k(grad(f)_k * grad(w_k)).
     * The surface is p * (1 + d(p)) over the unit sphere, whose normal is
     * p - tangential(grad_p d) / (1 + d). Exact, where the old finite
     * difference was a three-times-the-work estimate that faceted at the
     * size of its step. */
    vec3 gLump = L + uWarp * 0.8 * (L.x * G0 + L.y * G1 + L.z * G2);
    vec3 gRn = 1.35 * R + uWarp * 0.8 * (R.x * G0 + R.y * G1 + R.z * G2);
    float dFold = uSharp * pow(ridge, uSharp - 1.0) * (-rn / sq);
    vec3 g = uFreq * (uLump * gLump + uFold * dFold * gRn);
    vec3 gt = g - dot(g, p) * p;
    vec3 n = normalize(p - gt / (1.0 + d));

    /* The skin's texture fields, read in the glob's own space so the
     * texture rides the surface as it tumbles and churns. A broad warped
     * field bends the colour bands; a stretched one draws the smeared,
     * brushed streaks running through them; a lightly warped low one
     * throws up soft islands of a far colour — the cyan spot in the gold,
     * the blue dent in the top of the original. Evaluated here rather
     * than per pixel: the finest of them has a wavelength of about a
     * sixth of the radius, dozens of vertices wide, and on a dense mesh
     * the GPU shades each pixel several times over (2x2 quads on 1-2px
     * triangles), so five noises a pixel was most of the frame. */
    vec3 sp = p * 0.75;
    vec2 wv = vec2(
        snoise(sp + vec3(uFlow * 0.08, 0.0, 0.0)),
        snoise(sp + vec3(5.2, uFlow * 0.07, 1.3))
    );
    vTex = vec3(
        snoise(sp * 1.1 + vec3(wv * 0.9, wv.x * 0.6) + vec3(0.0, 0.0, uFlow * 0.04)),
        snoise(p * vec3(2.0, 6.5, 2.0) + vec3(wv * 1.5, wv.x * 1.5)
            + vec3(0.0, uFlow * 0.05, 0.0)),
        snoise(p * 1.1 + vec3(wv * 0.5, 0.0) + vec3(13.1, -uFlow * 0.05, 4.7))
    );

    vec3 P0 = p * (1.0 + d);
    vec4 mv = modelViewMatrix * vec4(P0, 1.0);
    vNormalV = normalize(normalMatrix * n);
    vViewPos = mv.xyz;
    vSurf = p;
    vFold = fold;
    gl_Position = projectionMatrix * mv;
}
`

const GLOB_FRAG = /* glsl */ `
#define MAX_COLORS ${MAX_COLORS}

uniform vec3 uKey;
uniform vec3 uFill;
uniform vec3 uRim;
uniform vec3 uPalette[MAX_COLORS];
uniform float uCount;
uniform float uFilm;
uniform float uGloss;
uniform float uEdge;
uniform float uDepth;
uniform float uFlow;
uniform float uEnergy;

varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec3 vSurf;
varying float vFold;
// broad film thickness, brushed streaks, islands — see GLOB_VERT
varying vec3 vTex;

// One lobe of the studio: a soft light on the view-space normal.
float lobe(vec3 n, vec3 dir, float power) {
    return pow(max(dot(n, normalize(dir)), 0.0), power);
}

// The matcap, in view space so it does not turn with the glob: warm on
// the right, blue along the bottom, cyan on the left, orange on top. It
// sets how brightly each side of the band burns; the Colors set its hue.
vec3 studio(vec3 n) {
    vec3 pale = mix(uFill, vec3(0.1, 0.95, 1.0), 0.45);
    vec3 top = mix(uKey, uRim, 0.3);
    vec3 c = vec3(0.0);
    c += uKey * lobe(n, vec3(0.92, -0.08, 0.38), 2.2) * 1.4;
    c += uKey * lobe(n, vec3(1.0, -0.05, 0.12), 9.0) * 1.0;
    c += uFill * lobe(n, vec3(-0.22, -0.96, 0.18), 2.6) * 2.6;
    c += pale * lobe(n, vec3(-0.96, 0.18, 0.22), 3.2) * 1.4;
    c += top * lobe(n, vec3(0.08, 0.98, 0.18), 3.6) * 1.3;
    return c;
}

// The Colors list, walked once round the rim (t in turns, 0 = the right,
// counter-clockwise). Each stop holds a plateau and hands over to the
// next on a smoothstep, so the bands read as zones with soft edges — the
// original's look — rather than an even smear. The loop picks the two
// stops by comparison because a uniform array is only safely indexed by
// a constant.
vec3 paletteAt(float t) {
    float p = fract(t) * uCount;
    float i = floor(p);
    float f = p - i;
    f = f * f * (3.0 - 2.0 * f);
    float j = mod(i + 1.0, uCount);
    vec3 a = uPalette[0];
    vec3 b = uPalette[0];
    for (int k = 0; k < MAX_COLORS; k++) {
        float fk = float(k);
        if (fk == i) a = uPalette[k];
        if (fk == j) b = uPalette[k];
    }
    return mix(a, b, f);
}

// A studio softbox seen in the reflection: a rounded rectangle around
// the direction c, size in radians-ish along its two axes.
float softbox(vec3 r, vec3 c, vec3 up, vec2 size, float soft) {
    vec3 ax = normalize(cross(up, c));
    vec3 ay = cross(c, ax);
    vec2 q = vec2(dot(r, ax), dot(r, ay));
    float d = length(max(abs(q) - size, 0.0));
    return (1.0 - smoothstep(0.0, soft, d)) * smoothstep(0.0, 0.25, dot(r, c));
}

void main() {
    vec3 n = normalize(vNormalV);
    vec3 v = normalize(-vViewPos);
    float ndv = clamp(dot(n, v), 0.0, 1.0);
    float graze = 1.0 - ndv;

    // The ring. In the original the colour covers roughly the outer half
    // of the radius and fades softly into a dark core — a smoothstep on
    // the grazing angle, wide enough that the inner edge never cuts hard
    // across a lump. Edge moves that boundary in and out.
    float edgeLo = mix(-0.12, 0.28, uEdge);
    float fres = smoothstep(edgeLo, edgeLo + 0.58, graze) * (0.6 + 0.4 * graze);

    /* ---- the surface: film thickness, streaks, islands ----
     * Computed per vertex (see GLOB_VERT) and interpolated: every one of
     * these fields is far smoother than the mesh, so the pixels get the
     * same values for none of the noise. */
    float broad = vTex.x;
    float streak = vTex.y;
    float isl = vTex.z;
    float island = smoothstep(0.38, 0.85, isl);

    /* ---- the colour ----
     * A wheel fixed to the view: the hue is the angle of the view-space
     * normal round the rim, walked once through Colors, and the surface
     * only nudges it. Small nudges on purpose — at a fifth of a turn each
     * lump became its own rainbow and the zones turned to mush. */
    vec2 rimDir = normalize(n.xy + vec2(1e-5, 0.0));
    float ang = fract(atan(rimDir.y, rimDir.x) / 6.28318);
    float phase = ang + broad * 0.06 + streak * 0.04
        + island * 0.22 + graze * 0.02 + vFold * uEnergy * 0.06;
    vec3 film = paletteAt(phase);

    vec3 lit = studio(n);
    float litI = dot(lit, vec3(0.3333));
    // Studio colour and film are NOT mixed as colours — warm studio under
    // a blue band makes pink. Where the film leads, the studio sets only
    // how bright the band burns; the streaks and marbling shade it.
    float grain = 0.82 + 0.18 * streak;
    vec3 skin = mix(lit, film * (1.15 + 0.35 * litI) * grain, uFilm);
    vec3 col = skin * (0.01 + 0.99 * fres);

    // The crisp neon line along the silhouette, every side in its own
    // colour, a hair inside the red.
    col += mix(lit, film * litI, uFilm * 0.6) * pow(graze, 7.0) * 1.1;

    // The red at the very silhouette, what the bloom turns into the
    // tight halo of the original. The bright pass reads the brightest
    // channel, so red blooms at a sane value; driven hot on a sub-pixel
    // sliver it flickered between pixels and blocked up the glow. Kept
    // out of the ring itself: red over a blue band turns it pink.
    float rimSide = 0.45 + 0.55 * smoothstep(-0.7, 0.7, n.x + 0.4 * n.y);
    col += uRim * pow(graze, 9.0) * rimSide * 3.2;

    // The electric line along the bottom silhouette, in the fill colour.
    col += uFill * lobe(n, vec3(0.25, -0.95, 0.1), 3.0) * pow(graze, 10.0) * 2.6;

    // The far side seen through the face. The original's middle is not
    // flat dark: the back of the glob shows through it, dim and smeared —
    // maroon, olive — so the core takes the colour from the opposite side
    // of the wheel, marbled and pulled toward the rim's red.
    vec3 back = paletteAt(phase + 0.5);
    float murk = 0.5 + 0.5 * broad;
    vec3 core = mix(uRim * 0.5, vec3(0.34, 0.3, 0.05), murk);
    core = mix(core, back * 0.5, 0.25) * (0.55 + 0.45 * (0.5 + 0.5 * streak));
    col += core * (1.0 - fres) * uDepth * 0.1;

    /* ---- gloss ----
     * A wet clear coat over everything. Schlick Fresnel at a lacquer's
     * 0.04 drives a broad sheen from three big soft lights — the white
     * wash that runs down the flanks of the original, pink over the
     * magenta, white-gold over the gold — so the band goes milky where
     * it turns from the eye, the way a wet surface does. Over the face a
     * dim soft window and one highlight say "glass" without the crisp
     * panes of a marble. Held in view space, so the lights stay put and
     * every highlight slides and bends over the moving surface. */
    vec3 r = reflect(-v, n);
    float F = 0.04 + 0.96 * pow(graze, 5.0);
    vec3 up = vec3(0.0, 1.0, 0.0);
    float d1 = max(dot(r, normalize(vec3(-0.78, 0.5, 0.38))), 0.0);
    float d2 = max(dot(r, normalize(vec3(0.85, 0.05, 0.5))), 0.0);
    float d3 = max(dot(r, normalize(vec3(0.35, 0.85, 0.4))), 0.0);
    float sheen = pow(d1, 5.0) * 1.5 + pow(d2, 7.0) * 1.0 + pow(d3, 9.0) * 0.7;
    // Only where the surface turns away: the face stays dark, as the
    // original's does, and the wash gathers on the flanks.
    float flank = smoothstep(0.25, 0.85, graze);
    // a tall hot strip down the warm side
    float strip = softbox(r, normalize(vec3(0.96, 0.08, -0.12)), up, vec2(0.03, 0.4), 0.16);
    float spec = pow(max(dot(r, normalize(vec3(-0.66, 0.6, 0.45))), 0.0), 60.0);
    float glint = pow(max(dot(r, normalize(vec3(-0.62, 0.62, -0.1))), 0.0), 900.0);
    float room = 0.012 + 0.02 * smoothstep(-0.3, 0.6, r.y);

    vec3 white = vec3(1.0, 0.95, 0.96);
    // The sheen takes the band's own colour toward white rather than
    // laying grey over it — white-gold over gold, pink-white over magenta.
    vec3 wash = mix(film, white, 0.45);
    vec3 refl = wash * sheen * flank * F * 2.2
        + mix(uKey, vec3(1.0), 0.4) * strip * 0.7 * mix(0.3, 1.0, F)
        + white * spec * 0.22 * flank
        + white * glint * 1.2
        + room * 0.5 * film * flank;
    col += refl * uGloss;

    // A storm runs hotter: more of it crosses the bloom threshold.
    col *= 1.0 + uEnergy * 0.25;

    gl_FragColor = vec4(col, 1.0);
}
`

/* --------------------------------------------------------- post passes */

const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/* The glow chain. Built first as a transcription of UnrealBloomPass,
 * which on this subject came out blocky: a hard high pass (smoothWidth
 * 0.01) flickers a sub-pixel hot rim on and off, a single-tap downsample
 * turns that into isolated blocks, and the composite stretches the 1/32
 * mip straight to full size with one bilinear tap, which draws them as
 * squares. Rebuilt on the filtered-mip design instead (Jimenez, "Next
 * Generation Post Processing in Call of Duty: Advanced Warfare", 2014):
 * a soft-knee bright pass, 13-tap downsamples with a Karis average on the
 * first, and a 9-tap tent upsample chain. UnrealBloomPass's knobs survive
 * unchanged — threshold, strength, and radius through its bloomFactors
 * [1.0, 0.8, 0.6, 0.4, 0.2] and lerpBloomFactor — so the panel means what
 * it meant; only the filtering is new. */

/** Soft-knee bright pass fused with the first 13-tap downsample. The
 *  threshold reads the brightest CHANNEL, not luminance: luminance gives
 *  red a fifth of a vote, so a red rim never bloomed without being driven
 *  to absurd values, which is what made it a sub-pixel firefly. The Karis
 *  average (each 2x2 group weighted by 1 / (1 + luma)) then stops any one
 *  hot pixel from dominating its block. */
const PREFILTER_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uKnee;
varying vec2 vUv;

vec3 tap(float x, float y) {
    return min(texture2D(tDiffuse, vUv + vec2(x, y) * uTexel).rgb, vec3(32.0));
}
float karis(vec3 c) {
    return 1.0 / (1.0 + dot(c, vec3(0.2126, 0.7152, 0.0722)));
}

void main() {
    vec3 a = tap(-2.0, -2.0), b = tap(0.0, -2.0), c = tap(2.0, -2.0);
    vec3 d = tap(-2.0,  0.0), e = tap(0.0,  0.0), f = tap(2.0,  0.0);
    vec3 g = tap(-2.0,  2.0), h = tap(0.0,  2.0), i = tap(2.0,  2.0);
    vec3 j = tap(-1.0, -1.0), k = tap(1.0, -1.0);
    vec3 l = tap(-1.0,  1.0), m = tap(1.0,  1.0);

    vec3 g0 = (a + b + d + e) * 0.25;
    vec3 g1 = (b + c + e + f) * 0.25;
    vec3 g2 = (d + e + g + h) * 0.25;
    vec3 g3 = (e + f + h + i) * 0.25;
    vec3 g4 = (j + k + l + m) * 0.25;
    float w0 = 0.125 * karis(g0);
    float w1 = 0.125 * karis(g1);
    float w2 = 0.125 * karis(g2);
    float w3 = 0.125 * karis(g3);
    float w4 = 0.5 * karis(g4);
    vec3 col = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4)
        / (w0 + w1 + w2 + w3 + w4);

    float br = max(col.r, max(col.g, col.b));
    float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 1e-4);
    float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
    gl_FragColor = vec4(col * contrib, 1.0);
}
`

/** 13-tap downsample: four overlapping 2x2 boxes and a centre box, so
 *  nothing between taps is skipped and a thin line cannot alias. */
const DOWN_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
varying vec2 vUv;

vec3 tap(float x, float y) {
    return texture2D(tDiffuse, vUv + vec2(x, y) * uTexel).rgb;
}

void main() {
    vec3 a = tap(-2.0, -2.0), b = tap(0.0, -2.0), c = tap(2.0, -2.0);
    vec3 d = tap(-2.0,  0.0), e = tap(0.0,  0.0), f = tap(2.0,  0.0);
    vec3 g = tap(-2.0,  2.0), h = tap(0.0,  2.0), i = tap(2.0,  2.0);
    vec3 j = tap(-1.0, -1.0), k = tap(1.0, -1.0);
    vec3 l = tap(-1.0,  1.0), m = tap(1.0,  1.0);
    vec3 sum = e * 0.125;
    sum += (a + c + g + i) * 0.03125;
    sum += (b + d + f + h) * 0.0625;
    sum += (j + k + l + m) * 0.125;
    gl_FragColor = vec4(sum, 1.0);
}
`

/** One step up the chain: the level below, tent-filtered up to this size,
 *  plus this level's own glow at its lerpBloomFactor weight. */
const UP_FRAG = /* glsl */ `
uniform sampler2D tLow;
uniform sampler2D tCur;
uniform vec2 uLowTexel;
uniform float uLowWeight;
uniform float uCurWeight;
varying vec2 vUv;

vec3 tapLow(float x, float y) {
    return texture2D(tLow, vUv + vec2(x, y) * uLowTexel).rgb;
}

void main() {
    vec3 up = tapLow(-1.0, -1.0) + tapLow(0.0, -1.0) * 2.0 + tapLow(1.0, -1.0);
    up += tapLow(-1.0, 0.0) * 2.0 + tapLow(0.0, 0.0) * 4.0 + tapLow(1.0, 0.0) * 2.0;
    up += tapLow(-1.0, 1.0) + tapLow(0.0, 1.0) * 2.0 + tapLow(1.0, 1.0);
    up *= 0.0625;
    gl_FragColor = vec4(up * uLowWeight + texture2D(tCur, vUv).rgb * uCurWeight, 1.0);
}
`

/** The source's additive blend over the scene, plus what EffectComposer's
 *  OutputPass would do (tone map, sRGB), plus the Background. The glob is
 *  light, so it is laid over the ground the way light is: its brightest
 *  channel is its coverage, and a translucent ground lets the page
 *  through everywhere the glob is dark.
 *
 *  The tone map is per channel, 1 - exp(-c * exposure), rather than
 *  three's ACES. ACES desaturates by design and skews a bright blue to
 *  violet; the frames do neither. A per-channel curve does what they do
 *  instead: an orange rim saturates its red first and burns through
 *  yellow to white, while a blue one stays blue. */
const OUTPUT_FRAG = /* glsl */ `
uniform sampler2D tBase;
uniform float uChroma;

uniform sampler2D tBloom;
uniform vec2 uBloomTexel;
uniform float uBloomStrength;
uniform vec3 uBg;
uniform float uBgAlpha;
uniform float uExposure;
varying vec2 vUv;

void main() {
    // The bloom is half resolution; a last tent takes it up to full size
    // without a single bilinear stretch showing its texels.
    vec3 bl = texture2D(tBloom, vUv + vec2(-1.0, -1.0) * uBloomTexel).rgb
        + texture2D(tBloom, vUv + vec2(0.0, -1.0) * uBloomTexel).rgb * 2.0
        + texture2D(tBloom, vUv + vec2(1.0, -1.0) * uBloomTexel).rgb
        + texture2D(tBloom, vUv + vec2(-1.0, 0.0) * uBloomTexel).rgb * 2.0
        + texture2D(tBloom, vUv).rgb * 4.0
        + texture2D(tBloom, vUv + vec2(1.0, 0.0) * uBloomTexel).rgb * 2.0
        + texture2D(tBloom, vUv + vec2(-1.0, 1.0) * uBloomTexel).rgb
        + texture2D(tBloom, vUv + vec2(0.0, 1.0) * uBloomTexel).rgb * 2.0
        + texture2D(tBloom, vUv + vec2(1.0, 1.0) * uBloomTexel).rgb;
    // Radial colour split: red sampled a little toward the centre and blue
    // a little away, so every edge carries red outside and blue inside —
    // the glass fringe along the original's rim.
    vec2 dc = vUv - 0.5;
    vec3 base = vec3(
        texture2D(tBase, 0.5 + dc * (1.0 - uChroma)).r,
        texture2D(tBase, vUv).g,
        texture2D(tBase, 0.5 + dc * (1.0 + uChroma)).b
    );
    vec3 c = base + bl * 0.0625 * uBloomStrength;
    // A toe, c^2 / (c + k): linear above a few hundredths, crushed below.
    // Without it the faint tail of the bloom lifts the whole void to grey
    // once sRGB has stretched the shadows; the frames' black is black.
    c = c * c / (c + 0.035);
    vec3 lin = 1.0 - exp(-c * uExposure);
    // sRGB by hand: this pass writes into a texture for FXAA, and three's
    // colorspace chunk leaves a render target linear.
    vec3 disp = mix(lin * 12.92, 1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055,
        step(0.0031308, lin));

    // Ordered noise, or the halo bands on an 8-bit display.
    float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    vec3 lightCol = max(disp + dither / 255.0, 0.0);

    float a = clamp(max(lightCol.r, max(lightCol.g, lightCol.b)), 0.0, 1.0);
    float under = uBgAlpha * (1.0 - a);
    gl_FragColor = vec4(lightCol + uBg * under, a + under);
}
`

/** FXAA, the compact form of Timothy Lottes' algorithm (as in
 *  mattdesl/glsl-fxaa), over the finished frame. It is what smooths the
 *  outline. MSAA was tried first and cost a third of the frame: on a mesh
 *  this dense, nearly every pixel straddles a triangle edge and gets
 *  shaded once per triangle. MSAA also never touched the thin bright rim
 *  lines, which are shading, not geometry; FXAA works on the picture, so
 *  it smooths both, after the tone curve where it can judge contrast as
 *  the eye does. Premultiplied, so all four channels are filtered. */
const FXAA_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
varying vec2 vUv;

#define FXAA_REDUCE_MIN (1.0 / 128.0)
#define FXAA_REDUCE_MUL (1.0 / 8.0)
#define FXAA_SPAN_MAX 8.0

float luma(vec4 c) { return dot(c.rgb, vec3(0.299, 0.587, 0.114)); }

void main() {
    vec4 nw = texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * uTexel);
    vec4 ne = texture2D(tDiffuse, vUv + vec2(1.0, -1.0) * uTexel);
    vec4 sw = texture2D(tDiffuse, vUv + vec2(-1.0, 1.0) * uTexel);
    vec4 se = texture2D(tDiffuse, vUv + vec2(1.0, 1.0) * uTexel);
    vec4 m = texture2D(tDiffuse, vUv);
    float lNW = luma(nw);
    float lNE = luma(ne);
    float lSW = luma(sw);
    float lSE = luma(se);
    float lM = luma(m);
    float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
    float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));

    vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
    float reduce = max((lNW + lNE + lSW + lSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
    float rcpMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
    dir = clamp(dir * rcpMin, vec2(-FXAA_SPAN_MAX), vec2(FXAA_SPAN_MAX)) * uTexel;

    vec4 a = 0.5 * (texture2D(tDiffuse, vUv + dir * (1.0 / 3.0 - 0.5))
        + texture2D(tDiffuse, vUv + dir * (2.0 / 3.0 - 0.5)));
    vec4 b = a * 0.5 + 0.25 * (texture2D(tDiffuse, vUv + dir * -0.5)
        + texture2D(tDiffuse, vUv + dir * 0.5));
    float lB = luma(b);
    gl_FragColor = (lB < lMin || lB > lMax) ? a : b;
}
`

/* ---------------------------------------------------------- component */

const makeRT = (w: number, h: number, depth: boolean, samples = 0) =>
    new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: depth,
        stencilBuffer: false,
        generateMipmaps: false,
        samples,
    })

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 720
 * @framerIntrinsicHeight 900
 */
function __BaseImpl_PetrolGlob(props: PetrolGlobProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const paramsRef = useRef<Params>(makeParams(props))
    paramsRef.current = makeParams(props)
    const apiRef = useRef<{ invalidate: () => void } | null>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        let renderer: THREE.WebGLRenderer
        try {
            renderer = new THREE.WebGLRenderer({
                antialias: false,
                alpha: true,
                premultipliedAlpha: true,
                powerPreference: "high-performance",
            })
        } catch (err) {
            console.error("[petrol-glob] could not create a WebGL context:", err)
            return
        }

        const p0 = paramsRef.current
        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, DPR_CAP[p0.quality])
        )
        renderer.setClearColor(0x000000, 0)
        // Tone mapped by hand in the output pass; see OUTPUT_FRAG.
        renderer.toneMapping = THREE.NoToneMapping
        renderer.autoClear = false

        const canvas = renderer.domElement
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.display = "block"
        // Faded up on the first painted frame, so the glob arrives rather
        // than popping in when the shaders finish compiling.
        canvas.style.opacity = "0"
        canvas.style.transition = "opacity 900ms cubic-bezier(0.2, 0.7, 0.2, 1)"
        let shown = false
        const reveal = () => {
            if (shown) return
            shown = true
            requestAnimationFrame(() => {
                canvas.style.opacity = "1"
            })
        }
        container.appendChild(canvas)

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100)
        camera.position.set(0, 0, 5)

        /* -------------------------------------------------------- glob */

        const globUniforms = {
            uFlow: { value: 0 },
            uFreq: { value: 0.62 },
            uLump: { value: 0.05 },
            uFold: { value: 0 },
            uSharp: { value: 4 },
            uWarp: { value: 0.5 },
            uKey: { value: new THREE.Color(DEFAULT_LIGHT.key) },
            uFill: { value: new THREE.Color(DEFAULT_LIGHT.fill) },
            uRim: { value: new THREE.Color(DEFAULT_LIGHT.rim) },
            uPalette: {
                value: Array.from(
                    { length: MAX_COLORS },
                    () => new THREE.Color(0, 0, 0)
                ),
            },
            uCount: { value: 1 },
            uFilm: { value: 0.95 },
            uGloss: { value: 1 },
            uEdge: { value: 0.5 },
            uDepth: { value: 0.5 },
            uEnergy: { value: 0 },
        }
        const globMat = new THREE.ShaderMaterial({
            uniforms: globUniforms,
            vertexShader: GLOB_VERT,
            fragmentShader: GLOB_FRAG,
            // Written to a linear half-float buffer; the output pass tone
            // maps once, after the bloom, the way OutputPass would.
            toneMapped: false,
        })

        let builtSegments = SEGMENTS[p0.quality]
        const glob = new THREE.Mesh(cubeSphere(builtSegments), globMat)
        // The glob's tilt toward the cursor sits on a parent, so the
        // tumble underneath it keeps accumulating undisturbed.
        const lean = new THREE.Group()
        lean.add(glob)
        scene.add(lean)

        /* ----------------------------------------------- bloom (Unreal) */

        const quadScene = new THREE.Scene()
        const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
        const quadGeo = new THREE.PlaneGeometry(2, 2)
        const quad = new THREE.Mesh(quadGeo)
        quad.frustumCulled = false
        quadScene.add(quad)

        const passMat = (
            fragmentShader: string,
            uniforms: Record<string, THREE.IUniform>,
            defines?: Record<string, number>
        ) =>
            new THREE.ShaderMaterial({
                uniforms,
                ...(defines ? { defines } : {}),
                vertexShader: QUAD_VERT,
                fragmentShader,
                depthTest: false,
                depthWrite: false,
                blending: THREE.NoBlending,
                toneMapped: false,
            })

        const prefilterMat = passMat(PREFILTER_FRAG, {
            tDiffuse: { value: null },
            uTexel: { value: new THREE.Vector2() },
            uThreshold: { value: BLOOM_THRESHOLD },
            uKnee: { value: BLOOM_KNEE },
        })
        const downMat = passMat(DOWN_FRAG, {
            tDiffuse: { value: null },
            uTexel: { value: new THREE.Vector2() },
        })
        const upMat = passMat(UP_FRAG, {
            tLow: { value: null },
            tCur: { value: null },
            uLowTexel: { value: new THREE.Vector2() },
            uLowWeight: { value: 1 },
            uCurWeight: { value: 1 },
        })

        /** UnrealBloomPass's per-mip weights, through its lerpBloomFactor
         *  (mix(factor, 1.2 - factor, radius)): Radius 0 leans on the
         *  tight mips, 1 spreads toward the wide ones. */
        let bloomRadius = BLOOM_RADIUS
        const mipWeight = (i: number) => {
            const factor = BLOOM_FACTORS[i]
            return factor + (1.2 - factor - factor) * bloomRadius
        }

        const outputMat = new THREE.ShaderMaterial({
            uniforms: {
                tBase: { value: null },
                tBloom: { value: null },
                uBloomTexel: { value: new THREE.Vector2(0.001, 0.001) },
                uChroma: { value: CHROMA },
                uBloomStrength: { value: BLOOM_STRENGTH },
                uBg: { value: new THREE.Vector3(0, 0, 0) },
                uBgAlpha: { value: 1 },
                uExposure: { value: TONE_EXPOSURE },
            },
            vertexShader: QUAD_VERT,
            fragmentShader: OUTPUT_FRAG,
            depthTest: false,
            depthWrite: false,
            blending: THREE.NoBlending,
        })

        const fxaaMat = passMat(FXAA_FRAG, {
            tDiffuse: { value: null },
            uTexel: { value: new THREE.Vector2() },
        })

        const blit = (
            mat: THREE.Material,
            target: THREE.WebGLRenderTarget | null
        ) => {
            quad.material = mat
            renderer.setRenderTarget(target)
            renderer.clear(true, false, false)
            renderer.render(quadScene, quadCam)
        }

        /* ------------------------------------------------------ sizing */

        const rtScene = makeRT(1, 1, true)
        // The finished, tone-mapped frame, for FXAA to read. 8-bit is all a
        // display-referred picture needs.
        const rtOut = new THREE.WebGLRenderTarget(1, 1, {
            type: THREE.UnsignedByteType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            depthBuffer: false,
            stencilBuffer: false,
            generateMipmaps: false,
        })
        // down[i] is mip i of the bright pass, half size at 0 and halving;
        // up[i] is everything from mip i downward, gathered back up.
        const down: { rt: THREE.WebGLRenderTarget; w: number; h: number }[] = []
        const up: THREE.WebGLRenderTarget[] = []
        for (let i = 0; i < N_MIPS; i++) {
            down.push({ rt: makeRT(1, 1, false), w: 1, h: 1 })
            if (i < N_MIPS - 1) up.push(makeRT(1, 1, false))
        }

        let sizeW = 0
        let sizeH = 0
        let aspect = 1
        let dirty = true

        const resize = () => {
            const w = Math.max(1, container.clientWidth)
            const h = Math.max(1, container.clientHeight)
            if (w === sizeW && h === sizeH) return
            sizeW = w
            sizeH = h
            aspect = w / h

            renderer.setSize(w, h, false)
            camera.aspect = aspect
            camera.updateProjectionMatrix()

            const dpr = renderer.getPixelRatio()
            const pw = Math.max(1, Math.round(w * dpr))
            const ph = Math.max(1, Math.round(h * dpr))
            rtScene.setSize(pw, ph)
            rtOut.setSize(pw, ph)
            fxaaMat.uniforms.uTexel.value.set(1 / pw, 1 / ph)

            // Mip 0 at half size, then halving, as UnrealBloomPass sizes it.
            let resx = Math.max(1, Math.round(pw / 2))
            let resy = Math.max(1, Math.round(ph / 2))
            for (let i = 0; i < N_MIPS; i++) {
                down[i].rt.setSize(resx, resy)
                down[i].w = resx
                down[i].h = resy
                if (i < N_MIPS - 1) up[i].setSize(resx, resy)
                resx = Math.max(1, Math.round(resx / 2))
                resy = Math.max(1, Math.round(resy / 2))
            }
            outputMat.uniforms.uBloomTexel.value.set(
                1 / down[0].w,
                1 / down[0].h
            )
            dirty = true
        }
        resize()

        const ro = new ResizeObserver(resize)
        ro.observe(container)

        let onScreen = true
        const io = new IntersectionObserver(
            (entries) => {
                onScreen = entries.some((e) => e.isIntersecting)
            },
            { rootMargin: "200px" }
        )
        io.observe(container)

        let pageVisible = !document.hidden
        const onVis = () => {
            pageVisible = !document.hidden
        }
        document.addEventListener("visibilitychange", onVis)

        /* ----------------------------------------------------- pointer */

        // Held in normalised device coordinates of OUR box, not the
        // window's: the glob leans toward the cursor and a stroke across
        // it stirs it up, whatever size the frame is.
        const pointer = new THREE.Vector2(0, 0)
        const lastPointer = new THREE.Vector2(0, 0)
        let hasLast = false
        let over = false
        let stirred = 0
        /** What the glob actually shows of `stirred`. A stroke adds energy
         *  in steps, one per pointer event; eased, the swell is a swell. */
        let stirShown = 0
        let stirVel = 0
        /** The energy the surface's SHAPE follows — slower again than what
         *  it shows, because a change in the warp moves the whole noise
         *  domain and reads as a lurch if it is quick. */
        let calmEnergy = 0
        /** Lean velocity, for the spring below. */
        const leanVel = { x: 0, y: 0 }

        // The canvas fills the box, so the event's own offset against it is
        // the position — no getBoundingClientRect, which forces a layout on
        // every move of the mouse.
        const onPointerMove = (e: PointerEvent) => {
            if (sizeW < 1 || sizeH < 1) return
            const local = e.target === canvas
            const ox = local ? e.offsetX : e.clientX - container.getBoundingClientRect().left
            const oy = local ? e.offsetY : e.clientY - container.getBoundingClientRect().top
            pointer.set((ox / sizeW) * 2 - 1, -((oy / sizeH) * 2 - 1))
            if (hasLast) {
                const travel = pointer.distanceTo(lastPointer)
                const k = dial(paramsRef.current.response.stir, 0, 0.55, 1.6)
                stirred = Math.min(1, stirred + travel * k)
            }
            lastPointer.copy(pointer)
            hasLast = true
            over = true
        }
        const onPointerLeave = () => {
            over = false
            hasLast = false
        }

        container.addEventListener("pointermove", onPointerMove)
        container.addEventListener("pointerenter", onPointerMove)
        container.addEventListener("pointerleave", onPointerLeave)
        container.addEventListener("pointercancel", onPointerLeave)

        /* ------------------------------------------------------ params */

        const parsed = { key: "", fill: "", rim: "", bg: "", colors: "" }
        const bgColor = new THREE.Color()
        const bgSRGB = { r: 0, g: 0, b: 0 }
        let lastQuality = p0.quality

        const applyParams = () => {
            const q = paramsRef.current

            if (parsed.key !== q.light.key) {
                parsed.key = q.light.key
                colorOf(q.light.key, DEFAULT_LIGHT.key, globUniforms.uKey.value)
            }
            if (parsed.fill !== q.light.fill) {
                parsed.fill = q.light.fill
                colorOf(q.light.fill, DEFAULT_LIGHT.fill, globUniforms.uFill.value)
            }
            if (parsed.rim !== q.light.rim) {
                parsed.rim = q.light.rim
                colorOf(q.light.rim, DEFAULT_LIGHT.rim, globUniforms.uRim.value)
            }
            const colorsKey = q.colors.join("|")
            if (parsed.colors !== colorsKey) {
                parsed.colors = colorsKey
                const pal = globUniforms.uPalette.value
                q.colors.forEach((css, k) => colorOf(css, "#FFFFFF", pal[k]))
                globUniforms.uCount.value = q.colors.length
            }
            if (parsed.bg !== q.background) {
                parsed.bg = q.background
                colorOf(q.background, DEFAULTS.background, bgColor)
                // Mixed after tone mapping and sRGB, so it is handed over
                // in display space: the ground is exactly the swatch.
                bgColor.getRGB(bgSRGB, THREE.SRGBColorSpace)
                outputMat.uniforms.uBg.value.set(bgSRGB.r, bgSRGB.g, bgSRGB.b)
                outputMat.uniforms.uBgAlpha.value = alphaOf(q.background)
            }

            if (lastQuality !== q.quality) {
                lastQuality = q.quality
                renderer.setPixelRatio(
                    Math.min(window.devicePixelRatio || 1, DPR_CAP[q.quality])
                )
                // resize() early-outs on an unchanged size, and the size
                // has not changed — only what it is multiplied by.
                sizeW = 0
                sizeH = 0
                resize()
            }
            const segments = SEGMENTS[q.quality]
            if (segments !== builtSegments) {
                builtSegments = segments
                glob.geometry.dispose()
                glob.geometry = cubeSphere(segments)
            }

            globUniforms.uFreq.value = dial(q.shape.detail, 0.3, 0.62, 1.5)
            globUniforms.uFilm.value = dial(q.finish.film, 0, 0.95, 1)
            globUniforms.uGloss.value = dial(q.finish.gloss, 0, 1, 2.2)
            globUniforms.uEdge.value = dial(q.finish.edge, 0, 0.5, 1)
            globUniforms.uDepth.value = dial(q.finish.depth, 0, 1, 3)

            // UnrealBloomPass's three knobs, 5 on each being our look.
            prefilterMat.uniforms.uThreshold.value = dial(
                q.glow.threshold,
                0.2,
                BLOOM_THRESHOLD,
                3
            )
            outputMat.uniforms.uBloomStrength.value = dial(
                q.glow.strength,
                0,
                BLOOM_STRENGTH,
                3
            )
            bloomRadius = dial(q.glow.radius, 0, BLOOM_RADIUS, 1)
        }

        /* ------------------------------------------------------- state */

        let flow = 0
        let breath = 0
        let spinY = 0.6
        let spinX = 0.35
        const leanTarget = new THREE.Euler()

        /** Calm -> storm -> calm, 0-1. A smoothstep'd cosine lingers at
         *  both ends — the frames hold the round and the crumpled state
         *  longer than the lumps between — and a slower second wave
         *  keeps one storm from being exactly the last one. */
        const envelope = (phase: number) => {
            let e = 0.5 - 0.5 * Math.cos(phase)
            e = e * e * (3 - 2 * e)
            e *= 0.82 + 0.18 * Math.sin(phase * 0.37 + 1.3)
            return e
        }

        const pose = (energy: number, calm = energy) => {
            const q = paramsRef.current
            const peakLump = dial(q.shape.morph, 0, 0.24, 0.45)
            const peakFold = dial(q.shape.folds, 0, 0.09, 0.22)
            globUniforms.uLump.value =
                peakLump * (CALM_FLOOR + (1 - CALM_FLOOR) * energy)
            globUniforms.uFold.value = peakFold * energy * energy
            globUniforms.uSharp.value = dial(q.shape.folds, 1, 4, 8)
            globUniforms.uWarp.value = 0.2 + 0.35 * calm
            globUniforms.uFlow.value = flow
            globUniforms.uEnergy.value = energy
        }

        const renderFrame = () => {
            // 1. the glob, into a linear buffer that holds values past 1
            camera.position.z = cameraDistance(paramsRef.current.size, aspect)
            renderer.setRenderTarget(rtScene)
            renderer.clear(true, true, false)
            renderer.render(scene, camera)

            // 2. bright pass, filtered straight into mip 0
            prefilterMat.uniforms.tDiffuse.value = rtScene.texture
            prefilterMat.uniforms.uTexel.value.set(
                1 / rtScene.width,
                1 / rtScene.height
            )
            blit(prefilterMat, down[0].rt)

            // 3. down the chain
            for (let i = 1; i < N_MIPS; i++) {
                const src = down[i - 1]
                downMat.uniforms.tDiffuse.value = src.rt.texture
                downMat.uniforms.uTexel.value.set(1 / src.w, 1 / src.h)
                blit(downMat, down[i].rt)
            }

            // 4. and back up it: each level is the one below, tent-filtered
            //    up, plus its own glow at its bloomFactor weight
            for (let i = N_MIPS - 2; i >= 0; i--) {
                const deepest = i === N_MIPS - 2
                const low = down[i + 1]
                upMat.uniforms.tLow.value = deepest
                    ? low.rt.texture
                    : up[i + 1].texture
                upMat.uniforms.uLowTexel.value.set(1 / low.w, 1 / low.h)
                upMat.uniforms.uLowWeight.value = deepest ? mipWeight(i + 1) : 1
                upMat.uniforms.tCur.value = down[i].rt.texture
                upMat.uniforms.uCurWeight.value = mipWeight(i)
                blit(upMat, up[i])
            }

            // 5. add it over the glob, tone map, lay over the ground
            outputMat.uniforms.tBase.value = rtScene.texture
            outputMat.uniforms.tBloom.value = up[0].texture
            blit(outputMat, rtOut)

            // 6. FXAA, out to the canvas
            fxaaMat.uniforms.tDiffuse.value = rtOut.texture
            blit(fxaaMat, null)
        }

        /* -------------------------------------------------------- loop */

        let prefersReduced = false
        try {
            prefersReduced = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches
        } catch {}

        const onCanvas = isStatic()
        const clock = new THREE.Clock()
        let last = 0
        let frameAvg = 1 / 60
        let lastAdapt = 0

        const loop = () => {
            // On the Framer canvas, and for a visitor whose system asks
            // for less movement, the glob is a picture: painted once,
            // repainted only when a control changes it. There is no
            // control for the second half of that — a visitor who has
            // asked the OS for less movement has already answered.
            if (onCanvas || prefersReduced) {
                if (!dirty) return
                dirty = false
                applyParams()
                flow = FROZEN_FLOW
                glob.rotation.set(0.35, 0.6, 0)
                lean.rotation.set(0, 0, 0)
                pose(FROZEN_ENERGY)
                renderFrame()
                canvas.style.transition = "none"
                canvas.style.opacity = "1"
                return
            }

            const t = clock.getElapsedTime()
            const dt = Math.min(0.1, t - last)
            last = t
            if (!onScreen || !pageVisible) return

            applyParams()
            const q = paramsRef.current

            // Stirred energy bleeds off at a fixed rate per SECOND, so a
            // 120Hz screen calms down exactly as fast as a 60Hz one.
            stirred *= Math.exp(-STIR_DECAY * dt)
            // Critically damped, not a plain lerp: a lerp leaves at full
            // speed the instant the cursor moves, which reads as a jolt.
            // A spring starts from rest and arrives without overshoot.
            {
                const w = STIR_EASE
                stirVel += (w * w * (stirred - stirShown) - 2 * w * stirVel) * dt
                stirShown += stirVel * dt
                stirShown = Math.max(0, stirShown)
            }

            const speedMul = dial(q.speed, 0, 1, 2.8)
            const period = dial(q.shape.rhythm, 22, 9, 3.5)
            breath += ((dt * Math.PI * 2) / period) * Math.max(0.15, speedMul)
            const energy = Math.min(1, envelope(breath) + stirShown)
            calmEnergy += (energy - calmEnergy) * (1 - Math.exp(-WARP_EASE * dt))

            // A storm churns faster than a calm, so the clock itself
            // speeds up with the energy.
            flow += dt * speedMul * (0.55 + 1.45 * energy)

            const spinMul = dial(q.spin, 0, 1, 3.2)
            spinY += dt * SPIN_Y * spinMul
            spinX += dt * SPIN_X * spinMul
            glob.rotation.set(spinX, spinY, 0)

            const tilt = dial(q.response.tilt, 0, 0.32, 0.9)
            if (over) leanTarget.set(-pointer.y * tilt, pointer.x * tilt, 0)
            else leanTarget.set(0, 0, 0)
            // The lean is a critically damped spring too, so the glob eases
            // into following the cursor and eases out when it leaves.
            const k = dial(q.response.follow, 0.6, 3.5, 12) * 1.6
            leanVel.x += (k * k * (leanTarget.x - lean.rotation.x) - 2 * k * leanVel.x) * dt
            leanVel.y += (k * k * (leanTarget.y - lean.rotation.y) - 2 * k * leanVel.y) * dt
            lean.rotation.x += leanVel.x * dt
            lean.rotation.y += leanVel.y * dt

            pose(energy, calmEnergy)
            renderFrame()
            reveal()

            // Resolution gives way before the frame rate does. A steady
            // frame slower than ~48fps steps the pixel ratio down a
            // quarter at a time, never below 1 and never back up — a
            // judder from oscillating is worse than a softer edge. The
            // first seconds are skipped: shader compile is not the load.
            frameAvg += (dt - frameAvg) * 0.05
            if (t > ADAPT_AFTER && t - lastAdapt > ADAPT_EVERY) {
                lastAdapt = t
                const ratio = renderer.getPixelRatio()
                if (frameAvg > 1 / 48 && ratio > 1) {
                    renderer.setPixelRatio(Math.max(1, ratio - 0.25))
                    sizeW = 0
                    sizeH = 0
                    resize()
                }
            }
        }

        renderer.setAnimationLoop(loop)

        apiRef.current = {
            invalidate: () => {
                dirty = true
            },
        }

        return () => {
            renderer.setAnimationLoop(null)
            apiRef.current = null

            ro.disconnect()
            io.disconnect()
            document.removeEventListener("visibilitychange", onVis)
            container.removeEventListener("pointermove", onPointerMove)
            container.removeEventListener("pointerenter", onPointerMove)
            container.removeEventListener("pointerleave", onPointerLeave)
            container.removeEventListener("pointercancel", onPointerLeave)

            glob.geometry.dispose()
            globMat.dispose()
            quadGeo.dispose()
            prefilterMat.dispose()
            downMat.dispose()
            upMat.dispose()
            outputMat.dispose()
            fxaaMat.dispose()
            rtScene.dispose()
            rtOut.dispose()
            for (const d of down) d.rt.dispose()
            for (const rt of up) rt.dispose()

            // dispose() frees GL resources but leaves the context alive
            // until the canvas is collected. This effect re-runs on every
            // StrictMode double mount and every hot update, so without an
            // explicit release they pile up into the browser's limit.
            renderer.dispose()
            renderer.forceContextLoss()
            canvas.remove()
        }
        // Mounted once. Everything the loop needs is read through
        // paramsRef, so a moving slider never tears down the context.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Deliberately without a dependency list: on the canvas this is what
    // turns a control being dragged into a repainted frame. In preview
    // the loop is already running and it costs a flag.
    useEffect(() => {
        apiRef.current?.invalidate()
    })

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                // The ground is composited in the output pass; painting it
                // here as well would double a translucent one.
                background: "transparent",
                touchAction: "pan-y",
                ...props.style,
            }}
        />
    )
}

/* ----------------------------------------------------------- controls */

const __presetProps = {
  "background": "#000000",
  "light": {
    "key": "#FFA21A",
    "rim": "#FF2A0A",
    "fill": "#1A6EFF"
  },
  "colors": [
    "#FF7A00",
    "#FFBC00",
    "#00FF80",
    "#00FF98",
    "#0019FF",
    "#00E7FF",
    "#FF2438",
    "#AA1B07",
    "#FF5512",
    "#FF7418"
  ],
  "size": 7,
  "speed": 5,
  "spin": 10,
  "shape": {
    "folds": 5,
    "morph": 5,
    "detail": 5,
    "rhythm": 5
  },
  "finish": {
    "edge": 5,
    "film": 5,
    "depth": 5,
    "gloss": 5
  },
  "glow": {
    "radius": 4.7,
    "strength": 6.4,
    "threshold": 6.6
  },
  "response": {
    "stir": 5,
    "tilt": 4,
    "follow": 5
  },
  "quality": "high"
};

export default function PetrolGlob(props: Record<string, unknown>) {
  return <__BaseImpl_PetrolGlob {...(__presetProps as Record<string, unknown>)} {...props} />;
}
