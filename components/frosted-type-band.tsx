"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * FROSTED TYPE BAND — a wordmark ring made of frosted glass, for Framer.
 *
 * A cylinder of glass with type printed on it, turning slowly, that you can
 * flick. Whatever the designer stacks UNDER it in Framer shows through the
 * band, blurred. That last part is the whole component: TypeBandCarousel next
 * door already wraps a strip of text around a ring, but it paints its own
 * opaque Background and nothing on the page behind it ever gets through.
 *
 * WEBGL CANNOT SAMPLE THE PAGE, SO THE GLASS IS NOT IN THE SHADER. Two layers:
 *
 *   1. a DOM plate carrying backdrop-filter: blur() plus a tint fill, and
 *   2. a transparent GL canvas ON TOP of it drawing only the type, the rims
 *      and the grain.
 *
 * backdrop-filter samples everything painted below the element, so the plate
 * frosts the real page. The catch is that the plate is flat and the band is
 * not — which is fine, because A CYLINDER'S SILHOUETTE DOES NOT CHANGE AS IT
 * SPINS. The ring is a surface of revolution about the spin axis, so rotating
 * it maps it onto itself and the projected outline is constant. The plate is
 * therefore clipped, once per framing change, to an outline generated from THE
 * SAME projection function the vertex shader uses (project() below), and the
 * frost can never drift out from under the type.
 *
 * The clip is TWO traced outlines, not one — the ring is open at both ends, so
 * past a certain tilt the near and far walls separate and you look straight
 * through the gap between them. See silhouetteOutlines().
 *
 * NOTHING IN THE STACK MAY BE TRANSFORMED. A transformed ancestor becomes the
 * backdrop root for a descendant's backdrop-filter and the page behind stops
 * showing through — the glass goes blank. So there is no CSS 3D here at all:
 * no perspective, no preserve-3d, no filter/contain/mix-blend-mode on the
 * root. All of the 3D lives in the vertex shader.
 *
 * THE FAR HALF READS AS BEING BEHIND THE GLASS. It cannot actually be behind
 * the plate — it is drawn in the canvas above it — so it is sampled from a
 * coarser mip and dimmed, which is what the near wall would do to it anyway.
 *
 * THE STRIP IS THE GEOMETRY, as in TypeBandCarousel: items are measured and
 * drawn into one offscreen canvas at supersampled size, that canvas becomes a
 * REPEAT-wrapped texture, and the ring's radius is derived from the strip so
 * adding an item makes the band LONGER rather than shrinking the type. WebGL2
 * repeats a non-power-of-two texture and Gap is then exact; the POT path is
 * the WebGL1 fallback and there the slack goes into the GAPS, never into the
 * glyphs.
 *
 * Rule 6 recipe: ONE GL context built in useEffect([]); every live input read
 * from a ref inside a raw rAF loop (raw rAF ticks on the Framer canvas).
 * Never calls loseContext(). The atlas rebuilds off a REF FLAG inside the
 * loop, never from state — setState with the same canvas node bails out of the
 * re-render and the texture is silently never re-uploaded.
 */

/* ---------------------------------------------------------------- constants */

const SEGMENTS = 192 // ring facets; the silhouette is smooth past ~150
const FOV = 50 // vertical field of view, degrees
const DPR_CAP = 2
// Atlas pixels per world unit, at supersample 1. Frozen: it is the bridge
// between a font size in px and the ring's size in the scene, and exposing it
// would be a second Size dial fighting Font (rule 8b).
const PX_PER_WORLD = 220
const ATLAS_MAX = 4096
const ATLAS_MIN = 512
const TEXEL_TARGET = 420
const SUPERSAMPLE_MAX = 6
// The far wall, seen through the near one. Frozen — a dial here duplicates
// Text Color's alpha. BACK_BIAS is the mip bias that stands in for the blur
// the plate would have applied if the far wall could be drawn beneath it.
const BACK_DIM = 0.3
const BACK_BIAS = 2.2
// Glass edge highlights. Frozen (rule 8b: a decoration gets a control only if
// the component is visibly wrong without it — these are what make the band
// read as a solid body rather than floating type, so they ship, as constants).
const RIM_EDGE = 0.055 // top/bottom rim thickness, fraction of band height
const RIM_ALPHA = 0.62 // top/bottom rim strength
const SIDE_ALPHA = 0.42 // Fresnel brightening toward the left/right silhouette
const SPIN_AT_50 = 0.16 // rad/sec, the rate the band shipped at
// Peak refraction shift at Refraction 100, as a fraction of the band's
// on-screen height — so the bend scales with the shot instead of being a px
// count that means something different at every Distance.
const REFRACT_AT_100 = 0.30
// Camera distance per unit of band height, at Distance = 100%.
const DIST_PER_BAND = 1.4

interface ItemProp {
    text?: string
    image?: string
}

const DEFAULT_ITEMS: ItemProp[] = [
    { text: "DESIGN" },
    { text: "MOTION" },
    { text: "SYSTEMS" },
    { text: "BRAND" },
]

/* ------------------------------------------------------------------ shaders */

// All of the 3D is here: ring position, yaw, pitch, projection, the near/far
// shade and the edge fade. The CPU only hands over two angles and a radius.
const VERT = `
precision highp float;

attribute vec2 aRing;   // (u around the ring 0..1, v down the band 0..1)

uniform float uRadius;
uniform float uHeight;
uniform float uRepeats; // how many times the strip tiles around the ring
uniform float uYaw;
uniform float uPitch;
uniform float uDist;
uniform float uFocal;   // in NDC units: 1 / tan(fov / 2)
uniform float uAspect;

varying vec2  vUv;
varying vec2  vSurf;    // (theta parameter 0..1, v) — grain rides the surface
varying vec3  vN;       // surface normal, view space — drives every glass mark
varying float vCos;     // cos(theta): +1 dead ahead, 0 at the silhouette
varying float vFront;
varying float vNdcX;

void main() {
    float th = aRing.x * 6.2831853 + uYaw;
    vec3 p = vec3(uRadius * sin(th), (0.5 - aRing.y) * uHeight, uRadius * cos(th));

    // Pitch about X: positive looks DOWN on the ring, so the near arc has to
    // fall and the far arc has to rise. The other sign convention silently
    // inverts the band — near text above far text, which looks almost right
    // until you notice the ring is inside out.
    float c = cos(uPitch);
    float s = sin(uPitch);
    vec3 q = vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);

    float depth = uDist - q.z;
    // On or behind the lens: park it off-clip rather than divide by ~0.
    if (depth < 0.05) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        vUv = vec2(0.0);
        vSurf = vec2(0.0);
        vN = vec3(0.0, 0.0, 1.0);
        vCos = 0.0;
        vFront = 0.0;
        vNdcX = 2.0;
        return;
    }

    float ndcX = (q.x * uFocal / depth) / uAspect;
    float ndcY = q.y * uFocal / depth;
    gl_Position = vec4(ndcX, ndcY, 0.0, 1.0);

    // uv.x is NOT the yawed angle: the texture is glued to the ring, so it
    // uses the un-rotated parameter and the whole surface carries it around.
    vUv = vec2(aRing.x * uRepeats, aRing.y);
    vSurf = aRing;

    // The wall's own normal, carried into view space by the same pitch.
    vec3 n = vec3(sin(th), 0.0, cos(th));
    vN = vec3(n.x, n.y * c - n.z * s, n.y * s + n.z * c);
    vCos = cos(th);
    // 1 on the near side, 0 on the far side, over a fixed band around the
    // silhouette. NOT smoothstep(-uRadius, uRadius, cos(th)): cos is in
    // [-1, 1] and uRadius is in world units, so a ring three items wide
    // compresses the whole term into [0.44, 0.56] and the far wall stops
    // reading as the far wall at all.
    vFront = smoothstep(-0.18, 0.18, vCos);
    vNdcX = ndcX;
}
`

const FRAG = `
precision highp float;

uniform sampler2D uAtlas;
uniform float uBackDim;
uniform float uBackBias;
uniform float uFade;    // half-width of the edge fade, in NDC
uniform float uGrain;   // 0..1
uniform float uRimEdge;
uniform float uRimAlpha;
uniform float uSideAlpha;
uniform vec3  uInk;     // text colour, also the grain colour

varying vec2  vUv;
varying vec2  vSurf;
varying vec3  vN;
varying float vCos;
varying float vFront;
varying float vNdcX;

// Two half-vectors, view space, both constant: a tight highlight left of
// centre and a broad sheen to the right. On a vertical cylinder the normal
// only turns about Y, so each lobe lands as a VERTICAL band of light — which
// is the single strongest cue that the surface is curved and polished. A
// point light would need a position and would move with nothing.
//
// BOTH LIE IN THE XZ PLANE, and the normal is flattened into it before the
// dot. The wall's normal has a y component pinned at about -sin(pitch) and
// nothing can change it, so a half-vector with any y of its own can never be
// reached: at 90 the tight lobe peaked at 3e-4 and the highlight simply did
// not exist. Flattened, the lobe reaches 1 exactly where it should.
const vec3 H_TIGHT = vec3(-0.4200, 0.0, 0.9075);
const vec3 H_BROAD = vec3(0.6000, 0.0, 0.8000);

// One hash, fed a bounded argument. vSurf is 0..1 on both axes, so the dot
// stays in the low thousands and never reaches the range where fract(sin(x))
// quantizes into visible bands.
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    // Two taps, not one: the far wall is sampled from a coarser mip so it
    // reads as seen THROUGH the near wall, which is where the plate's blur
    // would have put it if the far wall could be drawn underneath the plate.
    vec4 near = texture2D(uAtlas, vUv);
    vec4 far  = texture2D(uAtlas, vUv, uBackBias);
    vec4 t = mix(far, near, vFront);

    // The atlas is already drawn in Text Color, so there is nothing to tint —
    // only to dim. It is uploaded PREMULTIPLIED, which is the only way the
    // mip chain filters correctly: with straight alpha the transparent texels
    // are (0,0,0,0) and every filtered glyph edge bleeds toward black, which
    // is invisible for dark ink and a dark fringe around light ink.
    vec4 type = t * mix(uBackDim, 1.0, vFront);

    // Edge fade. uFade is floored on the CPU so the two smoothsteps can never
    // be handed edge0 == edge1, which is undefined in GLSL.
    float fade = smoothstep(-1.0, -1.0 + uFade, vNdcX)
               * (1.0 - smoothstep(1.0 - uFade, 1.0, vNdcX));

    // COMPOSITE IN PREMULTIPLIED ALPHA, bottom to top: the glass sheen, then
    // the grain that lives in the glass, then the type printed on it. Each step
    // is one "src over dst" — src_premultiplied + dst * (1 - src_alpha) — which
    // is exact, unlike mixing an rgb toward white and patching the alpha
    // afterwards (that lightens the type as a side effect of the rim).
    //
    // Every glass mark is scaled by vFront so the far pass, which rasterizes
    // the same pixels, contributes none of it and nothing is laid down twice.

    // Top and bottom rims. A bright line right at the cut, and a soft dark one
    // just inside it: an edge of glass is not a white stroke, it is a bright
    // catch with the body going dark behind it, and without the dark half the
    // band reads as a decal with a border.
    float dEdge = min(vSurf.y, 1.0 - vSurf.y);
    float rim = (1.0 - smoothstep(0.0, uRimEdge * 0.45, dEdge)) * uRimAlpha;
    float rimDark = (1.0 - smoothstep(uRimEdge * 0.5, uRimEdge * 1.9, dEdge))
                  * (1.0 - rim) * 0.16;
    // Fresnel. Glass goes to a mirror at grazing incidence, and on a cylinder
    // that is the left and right silhouette — the one place the eye checks to
    // decide whether it is looking at glass or at paint. cos(theta) IS
    // dot(N, view) here, so no extra term is needed for it.
    float fres = pow(1.0 - abs(vCos), 4.0) * uSideAlpha;
    // Specular, two lobes, in the plane the normal actually turns in.
    vec3 N = normalize(vN);
    vec3 Nf = normalize(vec3(N.x, 0.0, N.z));
    // The exponents are the difference between a highlight and a veil. Broad
    // lobes look harmless at their peak and then lay their TAILS across the
    // whole band: at 26 and 6 the two together held 0.18 of white over the
    // centre, which is 0.18 the page behind can never come through, and no
    // amount of lowering Tint gets it back.
    float spec = pow(max(dot(Nf, H_TIGHT), 0.0), 40.0) * 0.58
               + pow(max(dot(Nf, H_BROAD), 0.0), 14.0) * 0.20;
    // A little more light along the top of the band than the bottom.
    float top = smoothstep(0.6, 0.0, vSurf.y) * 0.05;
    // Dispersion. Glass splits what it bends, and at the two silhouettes it
    // bends hardest — cool on one side, warm on the other. A single white
    // Fresnel edge is the tell that a surface is plastic.
    vec3 edgeTint = mix(vec3(0.78, 0.89, 1.08), vec3(1.09, 0.94, 0.82),
                        0.5 + 0.5 * Nf.x);

    float aFres = clamp(fres * vFront, 0.0, 1.0);
    float aLite = clamp((rim + spec + top) * vFront, 0.0, 1.0);
    float aDark = clamp(rimDark * vFront, 0.0, 1.0);

    // Grain, in surface space so it rides the band instead of crawling across
    // it while the band turns.
    float n = hash(vSurf * vec2(1900.0, 520.0));
    float grain = clamp(uGrain * smoothstep(0.55, 1.0, n) * vFront, 0.0, 1.0);

    vec4 acc = vec4(uInk, 1.0) * aDark;
    acc = vec4(edgeTint, 1.0) * aFres + acc * (1.0 - aFres);
    acc = vec4(1.0, 1.0, 1.0, 1.0) * aLite + acc * (1.0 - aLite);
    acc = vec4(uInk, 1.0) * grain + acc * (1.0 - grain);
    acc = type + acc * (1.0 - type.a);

    acc *= fade;
    gl_FragColor = acc;
}
`

/* ------------------------------------------------------------------ helpers */

function compile(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("FrostedTypeBand shader:", gl.getShaderInfoLog(sh))
    }
    return sh
}

// The cap is passed in, not read from ATLAS_MAX: with supersampling the strip
// can sit just under the device limit, and rounding up to the next power of two
// would sail past it — which is a black texture on some drivers.
function nextPot(n: number, cap: number = ATLAS_MAX): number {
    let p = ATLAS_MIN
    while (p < n && p * 2 <= cap) p *= 2
    return p
}

// ControlType.Font hands back a CSS-shaped object. fontSize may arrive as a
// number or as "64px", so both are parsed; everything else has a sane default
// because a Font control the designer never opened arrives undefined.
interface FontLike {
    fontFamily?: string
    fontSize?: string | number
    fontWeight?: string | number
    fontStyle?: string
    letterSpacing?: string | number
}
function fontPx(f: FontLike | undefined): number {
    const raw = f?.fontSize
    const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""))
    return Number.isFinite(n) && n > 0 ? n : 64
}
function fontShorthand(f: FontLike | undefined, px: number): string {
    const style = f?.fontStyle ?? "normal"
    const weight = f?.fontWeight ?? 700
    const family = f?.fontFamily ?? "Inter, system-ui, sans-serif"
    return `${style} ${weight} ${px}px ${family}`
}

/* ------------------------------------------------------- silhouette geometry */

export interface Framing {
    radius: number
    bandH: number
    pitch: number // radians
    dist: number
    focal: number
    aspect: number
}

/**
 * The vertex shader's transform, in JS. Exported so a probe can assert the two
 * agree — if this drifts from VERT, the frost stops sitting under the type and
 * nothing about the render says so.
 * Returns NDC, or null when the point is on or behind the lens.
 */
export function project(
    th: number,
    v: number,
    f: Framing
): { x: number; y: number } | null {
    const px = f.radius * Math.sin(th)
    const py = (0.5 - v) * f.bandH
    const pz = f.radius * Math.cos(th)
    const c = Math.cos(f.pitch)
    const s = Math.sin(f.pitch)
    const qy = py * c - pz * s
    const qz = py * s + pz * c
    const depth = f.dist - qz
    if (depth < 0.05) return null
    return {
        x: (px * f.focal) / depth / f.aspect,
        y: (qy * f.focal) / depth,
    }
}

/**
 * The band's outline, traced exactly.
 *
 * The projection folds the cylinder onto itself along its silhouette
 * generators, so the image of the whole surface is NOT the image of one
 * rectangle in (theta, v), and tracing that rectangle's boundary would draw a
 * self-crossing outline. Split the surface at the silhouette and each patch is
 * fold-free — and the image of a fold-free patch IS the image of its parameter
 * rectangle's boundary: trace the top rim, drop to the bottom rim, trace back.
 *
 * Exact, so it beats the obvious alternative of a per-column min/max envelope,
 * which is only ever an outer bound: at a close camera a uniform column bin
 * spills 8.8% of the band's area past its own edge, right where the outline
 * turns fastest.
 *
 * WHERE THE SPLIT IS. Facing is dot(n, camera - q) > 0 with n the rotated
 * surface normal. Expanded, every term in the band coordinate cancels:
 *
 *     dot = -radius + dist * cos(pitch) * cos(theta)
 *
 * so the silhouette sits at cos(theta) = radius / (dist * cos(pitch)) at EVERY
 * height on the band, and the split is a clean line in parameter space rather
 * than a curve that would have to be solved per row.
 *
 * WHEN THERE IS NO SOLUTION the camera is looking into the ring and every face
 * is turned away — no silhouette generator exists, the band is one closed
 * ribbon, and the same trace over the full turn draws it with the ring's
 * opening left unfilled. That framing is reachable (about a dozen items at 45
 * degrees of tilt), so it is not a guard, it is a case.
 *
 * Exported for the probe.
 */
export function silhouetteOutlines(f: Framing): { x: number; y: number }[][] {
    const STEPS = 256
    const cosT = f.radius / Math.max(1e-6, f.dist * Math.cos(f.pitch))
    // Ranges of theta, each covering one fold-free patch.
    const ranges: [number, number][] = []
    if (cosT < 1) {
        const th = Math.acos(Math.max(-1, cosT))
        ranges.push([-th, th], [th, Math.PI * 2 - th])
    } else {
        ranges.push([0, Math.PI * 2])
    }
    // COSINE SPACING, not uniform. The outline turns fastest at the ends of a
    // patch, and the widest point of the band is not at the silhouette itself
    // but a fraction of a degree past it — the x extremum sits at
    // cos(theta) = radius * cos(pitch) / (dist - y * sin(pitch)), which is
    // inside the FAR patch, a fifth of a degree from its start. Sampled
    // uniformly at 256 steps the first sample lands nearly a degree beyond it,
    // the chord cuts the corner, and the band renders a few px outside its own
    // frost at the extreme left and right columns. Cosine spacing puts the
    // first step 0.009 degrees in and costs nothing in the middle.
    const at = (t0: number, t1: number, i: number) =>
        t0 + (t1 - t0) * ((1 - Math.cos((Math.PI * i) / STEPS)) / 2)
    const loops: { x: number; y: number }[][] = []
    for (const [t0, t1] of ranges) {
        const pts: { x: number; y: number }[] = []
        let bad = false
        // The rim at v = 0, forward; then the rim at v = 1, back. The two ends
        // need no points of their own: a straight segment in the world stays a
        // straight segment on screen under perspective, so the polygon edge
        // joining them is already exact.
        for (let i = 0; i <= STEPS; i++) {
            const p = project(at(t0, t1, i), 0, f)
            if (!p) { bad = true; break }
            pts.push(p)
        }
        for (let i = STEPS; i >= 0 && !bad; i--) {
            const p = project(at(t0, t1, i), 1, f)
            if (!p) { bad = true; break }
            pts.push(p)
        }
        if (bad || pts.length < 4) continue
        // Both patches must be wound the same way or the nonzero fill rule
        // subtracts one from the other where they overlap and punches a hole
        // through the middle of the band.
        let area = 0
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            area += (pts[j].x - pts[i].x) * (pts[j].y + pts[i].y)
        }
        if (area < 0) pts.reverse()
        loops.push(pts)
    }
    return loops
}

/**
 * The outlines as a CSS clip-path value.
 *
 * path() and not polygon(): polygon() is one closed ring, and the band is two
 * of them the moment the tilt opens a see-through gap between the near and far
 * walls. path() takes px, not percentages, so the caller passes the element's
 * measured size and the loop rebuilds this when that size changes.
 */
export function silhouettePath(f: Framing, w: number, h: number): string {
    const loops = silhouetteOutlines(f)
    if (!loops.length) return ""
    const subs = loops.map((pts) => {
        const d = pts.map(
            (p, i) =>
                `${i ? "L" : "M"}${(((p.x + 1) / 2) * w).toFixed(2)} ${(
                    ((1 - p.y) / 2) *
                    h
                ).toFixed(2)}`
        )
        return d.join(" ") + " Z"
    })
    return `path("${subs.join(" ")}")`
}

/* ------------------------------------------------------ the glass itself */

export interface Profile {
    nx: Float32Array // the wall's normal, x component, per screen column
    top: Float32Array // the band's top edge in px, +Infinity outside it
    bot: Float32Array
}

/**
 * What the glass looks like, column by column.
 *
 * Everything the plate needs is a function of screen x alone, because the wall
 * is a vertical cylinder: its normal turns about the axis and never about
 * anything else. That is what makes a flat DOM plate able to carry a curved
 * glass surface at all — one profile, computed per framing, drives both the
 * refraction map and the thickness gradient.
 *
 * x is monotone in theta across the near wall (the turning point sits just
 * past the silhouette, outside this range), so the sweep can fill columns as
 * it goes instead of sorting.
 */
export function bandProfile(f: Framing, w: number, h: number): Profile {
    const nx = new Float32Array(w)
    const hit = new Uint8Array(w)
    const top = new Float32Array(w).fill(Infinity)
    const bot = new Float32Array(w).fill(-Infinity)
    // The outline runs FIRST: the fringe pass at the bottom needs to know which
    // columns the band actually covers.
    for (const loop of silhouetteOutlines(f)) {
        for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
            const ax = ((loop[j].x + 1) / 2) * w
            const ay = ((1 - loop[j].y) / 2) * h
            const bx = ((loop[i].x + 1) / 2) * w
            const by = ((1 - loop[i].y) / 2) * h
            const lo = Math.max(0, Math.ceil(Math.min(ax, bx)))
            const hi = Math.min(w - 1, Math.floor(Math.max(ax, bx)))
            for (let c = lo; c <= hi; c++) {
                const t = bx === ax ? 0 : (c - ax) / (bx - ax)
                const y = ay + (by - ay) * t
                if (y < top[c]) top[c] = y
                if (y > bot[c]) bot[c] = y
            }
        }
    }
    const cosT = f.radius / Math.max(1e-6, f.dist * Math.cos(f.pitch))
    const half = cosT < 1 ? Math.acos(cosT) : Math.PI / 2
    const N = 2048
    let prevX = -1
    let prevN = 0
    for (let i = 0; i <= N; i++) {
        const th = -half + (2 * half * i) / N
        const p = project(th, 0.5, f)
        if (!p) continue
        const x = ((p.x + 1) / 2) * w
        const n = Math.sin(th)
        const c0 = Math.max(0, Math.ceil(prevX < 0 ? x : prevX))
        const c1 = Math.min(w - 1, Math.floor(x))
        for (let c = c0; c <= c1; c++) {
            const t = prevX < 0 || x === prevX ? 1 : (c - prevX) / (x - prevX)
            nx[c] = prevN + (n - prevN) * t
            hit[c] = 1
        }
        prevX = x
        prevN = n
    }
    // THE SWEEP IS NARROWER THAN THE BAND, and the difference is the vertical
    // line down each side of the frost.
    //
    // The sweep runs the silhouette range at v = 0.5, but the band's widest
    // column is not there: it sits at v = 0 or v = 1 and a fraction of a degree
    // PAST the silhouette, at cos(theta) = radius * cos(pitch) /
    // (dist - y * sin(pitch)) — the same extremum silhouetteOutlines() traces
    // with cosine spacing. So the outline always reaches columns the sweep
    // never writes, and it reaches more of them the further the band is tilted:
    // 9 px a side at 9 degrees, 21 at 20, 36 at 30, 79 at 45.
    //
    // Left at the array's zero those columns refract by NOTHING while the
    // column next to them refracts at 0.86 of the peak — a ~40 px displacement
    // step in one pixel, straight down both edges of the band, which is exactly
    // the line the glass drew there. Hold the terminal normal across the
    // fringe instead: the wall is edge-on for the whole of it, so the profile
    // is flat there anyway and the step disappears rather than moving.
    let first = -1
    let last = -1
    for (let c = 0; c < w; c++) {
        if (!hit[c]) continue
        if (first < 0) first = c
        last = c
    }
    if (first >= 0) {
        for (let c = 0; c < first; c++) if (top[c] < Infinity) nx[c] = nx[first]
        for (let c = last + 1; c < w; c++) if (top[c] < Infinity) nx[c] = nx[last]
    }
    return { nx, top, bot }
}

// The displacement map is generated at most this wide and stretched by feImage.
// The field is smooth, so the resolution buys nothing past this, and toDataURL
// on a full-size buffer would stutter through a live resize.
const MAP_MAX_W = 512
// How far into the band the rim's bevel refraction reaches, as a fraction of
// the band's on-screen height.
const RIM_BEVEL = 0.13

/**
 * The refraction map, as a data URL for feImage.
 *
 * REAL refraction, not a fog: a blur alone is frosted plastic, and the thing
 * that says "glass" is that the page behind BENDS. The wall is a lens, so the
 * ray turns by an amount set by the surface normal — which on this geometry is
 * horizontal and grows to its maximum at the left and right silhouette, giving
 * the sideways sweep you get looking through a glass rod.
 *
 * Encoded as feDisplacementMap wants it: channel 0.5 is no shift, and the
 * displacement it applies is scale * (C - 0.5), so the caller passes twice the
 * peak shift as `scale` and this fills the channel from 0 to 1.
 *
 * A POSITIVE dx samples the backdrop from further RIGHT, which moves the image
 * LEFT — so dx tracks the normal directly, and both edges pull their content
 * toward the middle the way a convex surface does.
 */
export function refractionMap(
    prof: Profile,
    w: number,
    h: number,
    bandH: number
): { url: string; mw: number; mh: number } {
    const div = Math.max(1, Math.ceil(w / MAP_MAX_W))
    const mw = Math.max(2, Math.round(w / div))
    const mh = Math.max(2, Math.round(h / div))
    const canvas = document.createElement("canvas")
    canvas.width = mw
    canvas.height = mh
    const g = canvas.getContext("2d")
    if (!g) return { url: "", mw, mh }
    const img = g.createImageData(mw, mh)
    const bevel = Math.max(1, bandH * RIM_BEVEL)
    for (let my = 0; my < mh; my++) {
        const y = ((my + 0.5) / mh) * h
        for (let mx = 0; mx < mw; mx++) {
            const x = Math.min(w - 1, Math.floor(((mx + 0.5) / mw) * w))
            const dx = prof.nx[x]
            let dy = 0
            const t = prof.top[x]
            const b = prof.bot[x]
            if (t < Infinity) {
                // The band is a cut edge, and a cut edge of glass magnifies
                // what is right behind it. Without this the top and bottom
                // read as a decal's border rather than the end of a solid.
                const dTop = y - t
                const dBot = b - y
                if (dTop >= 0 && dTop < bevel) dy += 1 - dTop / bevel
                if (dBot >= 0 && dBot < bevel) dy -= 1 - dBot / bevel
            }
            const i = (my * mw + mx) * 4
            img.data[i] = Math.round(127.5 + 127.5 * Math.max(-1, Math.min(1, dx)))
            img.data[i + 1] = Math.round(127.5 + 127.5 * Math.max(-1, Math.min(1, dy)))
            img.data[i + 2] = 0
            img.data[i + 3] = 255
        }
    }
    g.putImageData(img, 0, 0)
    return { url: canvas.toDataURL(), mw, mh }
}

/**
 * The tint, as a horizontal gradient.
 *
 * A cylinder wall is thin dead ahead and effectively endless at the
 * silhouette, where the line of sight runs along it — so a single flat tint
 * paints a body of uniform thickness, which is a slab and not a tube. Alpha
 * follows |normal.x| cubed, clamped short of opaque so the far wall never
 * disappears behind its own glass.
 */
export function tintGradient(prof: Profile, w: number, tint: string): string {
    const [r, g, b, a] = parseRgba(tint)
    const STOPS = 33
    const parts: string[] = []
    for (let i = 0; i < STOPS; i++) {
        const pct = i / (STOPS - 1)
        const col = Math.min(w - 1, Math.round(pct * (w - 1)))
        const n = Math.abs(prof.nx[col])
        const al = Math.min(0.97, a * (1 + 2.2 * n * n * n))
        parts.push(`rgba(${r},${g},${b},${al.toFixed(3)}) ${(pct * 100).toFixed(1)}%`)
    }
    return `linear-gradient(to right, ${parts.join(", ")})`
}

// "#rgb" / "#rrggbb" / "#rrggbbaa" / "rgb()" / "rgba()" -> 0..255 rgb + 0..1 a.
function parseRgba(c: string | undefined): [number, number, number, number] {
    const s = String(c ?? "").trim()
    const m = s.match(/^#([0-9a-f]{3,8})$/i)
    if (m) {
        let hx = m[1]
        if (hx.length === 3 || hx.length === 4) {
            hx = hx
                .split("")
                .map((ch) => ch + ch)
                .join("")
        }
        const n = parseInt(hx.slice(0, 6), 16)
        const al = hx.length >= 8 ? parseInt(hx.slice(6, 8), 16) / 255 : 1
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255, al]
    }
    const rr = s.match(/rgba?\(([^)]+)\)/i)
    if (rr) {
        const p = rr[1].split(",").map((v) => parseFloat(v))
        return [p[0] || 0, p[1] || 0, p[2] || 0, p.length > 3 ? p[3] : 1]
    }
    return [246, 246, 250, 0.5]
}

// "#rrggbb" / "#rgb" / "rgb()" / "rgba()" -> 0..1 rgb. Alpha is ignored: the
// shader premultiplies with the atlas's own alpha.
function parseRgb(c: string | undefined): [number, number, number] {
    const s = String(c ?? "").trim()
    const m = s.match(/^#([0-9a-f]{3,8})$/i)
    if (m) {
        let h = m[1]
        if (h.length === 3 || h.length === 4) {
            h = h
                .split("")
                .map((ch) => ch + ch)
                .join("")
        }
        const n = parseInt(h.slice(0, 6), 16)
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }
    const r = s.match(/rgba?\(([^)]+)\)/i)
    if (r) {
        const p = r[1].split(",").map((v) => parseFloat(v))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }
    return [0.06, 0.06, 0.08]
}

/* --------------------------------------------------------------------- props */

interface GlassGroup {
    blur: number
    refraction: number
    tint: string
    grain: number
}
interface CursorGroup {
    damping: number
    hover: number
}

export interface FrostedTypeBandProps {
    items?: ItemProp[]
    font?: FontLike
    textColor?: string
    speed?: number
    distance?: number
    tilt?: number
    gap?: number
    fade?: number
    glass?: Partial<GlassGroup>
    cursor?: Partial<CursorGroup>
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ----------------------------------------------------------------- component */

export default function FrostedTypeBand(props: FrostedTypeBandProps) {
    const {
        items = [{ text: "DESIGN" }, { text: "MOTION" }, { text: "SYSTEMS" }, { text: "BRAND" }],
        font = {
            variant: "Bold",
            fontSize: "16px",
            textAlign: "left",
            fontFamily: "Inter",
            fontWeight: 700,
            lineHeight: "1.5em",
            letterSpacing: "0em",
        } as FontLike,
        textColor = "#FEFF00",
        speed = 100,
        distance = 810,
        tilt = 0,
        gap = 83,
        fade = 49,
        glass = { blur: 100, refraction: 50, tint: "rgba(250,250,255,0.26)", grain: 0 },
        cursor = { hover: 200, damping: 100 },
        style,
    } = props

    // A group the designer never opened arrives undefined, so every field
    // carries its own fallback (rule 8b) — the control defaults alone are not
    // enough.
    const {
        blur = 100,
        refraction = 50,
        tint = "rgba(250,250,255,0.26)",
        grain = 0,
    } = glass
    const { damping = 100, hover = 200 } = cursor

    const hostRef = useRef<HTMLDivElement>(null)
    const plateRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const feImageRef = useRef<SVGFEImageElement>(null)
    const feDispRef = useRef<SVGFEDisplacementMapElement>(null)
    // One filter id per instance, or two of these on a page share a map and
    // the second one refracts through the first one's geometry. useId's colons
    // are not valid inside url(#...), so they come out.
    const filterId = `ftb${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`

    const sizePx = fontPx(font)
    // Everything the atlas depends on, flattened into one string. Comparing this
    // in the loop is what triggers a rebuild — a useEffect dep on `font` or
    // `items` would see a fresh object every render and rebuild every frame.
    const atlasKey = JSON.stringify([
        items.map((i) => [i?.text ?? "", i?.image ?? ""]),
        fontShorthand(font, sizePx),
        font?.letterSpacing ?? "",
        textColor,
        gap,
    ])

    const live = useRef({
        items,
        font,
        sizePx,
        textColor,
        gap,
        speed,
        distance,
        tilt,
        fade,
        grain,
        blur,
        refraction,
        tint,
        damping,
        hover,
        atlasKey,
    })
    live.current = {
        items,
        font,
        sizePx,
        textColor,
        gap,
        speed,
        distance,
        tilt,
        fade,
        grain,
        blur,
        refraction,
        tint,
        damping,
        hover,
        atlasKey,
    }

    // Drag state. `vel` is yaw radians per second, carried out of the gesture
    // as inertia; `hoverAmt` eases so entering the band does not snap the spin.
    const drag = useRef({
        down: 0,
        lastX: 0,
        vel: 0,
        manual: 0,
        over: 0,
        hoverAmt: 0,
    })

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        const plate = plateRef.current
        const feImage = feImageRef.current
        const feDisp = feDispRef.current
        if (!host || !canvas || !plate || !feImage || !feDisp) return

        const opts: WebGLContextAttributes = {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
            depth: false,
        }
        // WebGL2 first, for one reason only: it can REPEAT a non-power-of-two
        // texture, which is what lets the atlas be its natural width and `Gap`
        // mean the number it says.
        let isGL2 = true
        let gl = canvas.getContext("webgl2", opts) as WebGLRenderingContext | null
        if (!gl) {
            isGL2 = false
            gl = canvas.getContext("webgl", opts) as WebGLRenderingContext | null
        }
        if (!gl) return

        /* ---- program ---- */
        const vs = compile(gl, gl.VERTEX_SHADER, VERT)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()
        if (!vs || !fs || !prog) return
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.warn("FrostedTypeBand link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const aRing = gl.getAttribLocation(prog, "aRing")
        const U = (n: string) => gl.getUniformLocation(prog, n)
        const u = {
            radius: U("uRadius"),
            height: U("uHeight"),
            repeats: U("uRepeats"),
            yaw: U("uYaw"),
            pitch: U("uPitch"),
            dist: U("uDist"),
            focal: U("uFocal"),
            aspect: U("uAspect"),
            atlas: U("uAtlas"),
            backDim: U("uBackDim"),
            backBias: U("uBackBias"),
            fade: U("uFade"),
            grain: U("uGrain"),
            rimEdge: U("uRimEdge"),
            rimAlpha: U("uRimAlpha"),
            sideAlpha: U("uSideAlpha"),
            ink: U("uInk"),
        }

        /* ---- ring strip. Built once: the ring's SIZE is a uniform, so a
               content change never touches this buffer. ---- */
        const verts = new Float32Array((SEGMENTS + 1) * 4)
        for (let i = 0; i <= SEGMENTS; i++) {
            const t = i / SEGMENTS
            verts[i * 4] = t
            verts[i * 4 + 1] = 0
            verts[i * 4 + 2] = t
            verts[i * 4 + 3] = 1
        }
        const ringBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, ringBuf)
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(aRing)
        gl.vertexAttribPointer(aRing, 2, gl.FLOAT, false, 0, 0)
        const vertCount = (SEGMENTS + 1) * 2

        /* ---- atlas ---- */
        const tex = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 0, 0])
        )
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        const strip = document.createElement("canvas")
        const sctx = strip.getContext("2d")
        const imgCache = new Map<string, HTMLImageElement>()
        let imgTick = 0 // bumped when a picture finishes loading -> rebuild
        let builtKey = ""
        let builtTick = -1
        let atlasW = 1
        let atlasH = 1
        let atlasScale = 1
        let ready = false

        // One long strip, so the whole supersample budget is bounded by the
        // widest texture the device will take, not by a guess.
        const maxTexW = Math.max(
            ATLAS_MIN,
            Math.min(8192, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number)
        )
        const anisoExt = gl.getExtension("EXT_texture_filter_anisotropic") as {
            TEXTURE_MAX_ANISOTROPY_EXT: number
            MAX_TEXTURE_MAX_ANISOTROPY_EXT: number
        } | null
        const aniso = anisoExt
            ? {
                  pname: anisoExt.TEXTURE_MAX_ANISOTROPY_EXT,
                  max: Math.min(
                      8,
                      gl.getParameter(
                          anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT
                      ) as number
                  ),
              }
            : null

        const getImage = (src: string): HTMLImageElement | null => {
            const hit = imgCache.get(src)
            if (hit) return hit.complete && hit.naturalWidth > 0 ? hit : null
            const im = new Image()
            im.crossOrigin = "anonymous"
            im.onload = () => {
                imgTick++
            }
            im.src = src
            imgCache.set(src, im)
            return null
        }

        const buildAtlas = () => {
            if (!sctx) return
            const L = live.current
            const list =
                Array.isArray(L.items) && L.items.length ? L.items : DEFAULT_ITEMS

            // Supersample. `rawH` is the band height in world-reference pixels
            // and never changes; `k` only buys texels. It is measured once at
            // scale 1 so the width budget can be checked before anything is
            // drawn — a strip that overflows MAX_TEXTURE_SIZE fails silently as
            // a black texture on some drivers and as a squeezed one on others.
            const rawH = Math.max(8, Math.round(L.sizePx * 1.7))
            sctx.font = fontShorthand(L.font, L.sizePx)
            let rawSum = 0
            for (const it of list) {
                const src = it?.image
                let w = 0
                if (src) {
                    const im = getImage(src)
                    w = im ? (im.naturalWidth / im.naturalHeight) * rawH * 0.62 : 0
                }
                if (!w) w = Math.max(1, sctx.measureText(it?.text ?? "").width)
                rawSum += w
            }
            const rawW = Math.max(1, rawSum + L.gap * list.length)
            const k = Math.max(
                1,
                Math.min(SUPERSAMPLE_MAX, TEXEL_TARGET / rawH, maxTexW / rawW)
            )

            const px = L.sizePx * k
            const h = Math.max(8, Math.round(rawH * k))
            const gapPx = L.gap * k

            sctx.font = fontShorthand(L.font, px)
            const spacing = L.font?.letterSpacing
            // Chrome only; harmless where unsupported, and the layout below
            // measures with the same context so the two can never disagree.
            const anyCtx = sctx as unknown as { letterSpacing?: string }
            if (spacing != null) {
                anyCtx.letterSpacing =
                    typeof spacing === "number" ? `${spacing}px` : String(spacing)
            }

            // Measure first: a cell is a picture's aspect * band height, or the
            // text's own advance width.
            const widths: number[] = []
            let sum = 0
            for (const it of list) {
                const src = it?.image
                let w = 0
                if (src) {
                    const im = getImage(src)
                    w = im ? (im.naturalWidth / im.naturalHeight) * h * 0.62 : 0
                }
                if (!w) w = Math.max(1, sctx.measureText(it?.text ?? "").width)
                widths.push(w)
                sum += w
            }
            const n = widths.length
            const wanted = sum + gapPx * n
            // NPOT where the platform can REPEAT it, so the gap is exactly the
            // gap. On WebGL1 the atlas has to be a power of two and the slack
            // lands in the gaps instead.
            const W = isGL2
                ? Math.min(maxTexW, Math.max(ATLAS_MIN, Math.ceil(wanted)))
                : nextPot(Math.ceil(wanted), maxTexW)
            // Slack goes into the GAPS, never into the glyphs. If the content
            // genuinely overflows the largest atlas the gaps close first and
            // only then does the strip compress — visible, but not silent.
            const slack = W - sum
            const perGap = slack / n
            const squeeze = perGap < 0 ? W / Math.max(1, sum) : 1

            strip.width = W
            strip.height = h
            sctx.clearRect(0, 0, W, h)
            sctx.font = fontShorthand(L.font, px)
            if (spacing != null) {
                anyCtx.letterSpacing =
                    typeof spacing === "number" ? `${spacing}px` : String(spacing)
            }
            sctx.fillStyle = L.textColor
            sctx.textBaseline = "middle"
            sctx.textAlign = "left"

            let x = Math.max(0, perGap) * 0.5
            for (let i = 0; i < n; i++) {
                const it = list[i]
                const w = widths[i] * squeeze
                const src = it?.image
                const im = src ? getImage(src) : null
                if (im) {
                    const ih = h * 0.62
                    sctx.drawImage(im, x, (h - ih) * 0.5, w, ih)
                } else {
                    sctx.save()
                    if (squeeze !== 1) {
                        sctx.translate(x, 0)
                        sctx.scale(squeeze, 1)
                        sctx.fillText(it?.text ?? "", 0, h * 0.5)
                    } else {
                        sctx.fillText(it?.text ?? "", x, h * 0.5)
                    }
                    sctx.restore()
                }
                x += w + Math.max(0, perGap)
            }

            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, strip)
            // Mipmaps are not optional here: the far wall is sampled with an
            // explicit LOD bias to stand in for the plate's blur, and without a
            // mip chain that bias does nothing at all. They also fix the far
            // arc's shimmer; anisotropy fixes the grazing angles near the
            // silhouette, where a trilinear sample smears the glyph into a
            // smudge. Both are safe: the WebGL1 path pads the atlas to a power
            // of two, and WebGL2 allows NPOT mipmaps.
            gl.generateMipmap(gl.TEXTURE_2D)
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_MIN_FILTER,
                gl.LINEAR_MIPMAP_LINEAR
            )
            if (aniso) {
                gl.texParameterf(gl.TEXTURE_2D, aniso.pname, aniso.max)
            }
            atlasW = W
            atlasH = h
            atlasScale = k
            ready = true
            builtKey = L.atlasKey
            builtTick = imgTick
        }

        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        // Premultiplied source: the fragment shader already multiplies by alpha.
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        gl.enable(gl.CULL_FACE)

        /* ---- sizing: measure the ELEMENT, not the width/height props. Those
               are not numeric in the Framer preview (only on the canvas). ---- */
        let cssW = 0
        let cssH = 0
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            cssW = canvas.clientWidth || host.clientWidth || 0
            cssH = canvas.clientHeight || host.clientHeight || 0
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            gl.viewport(0, 0, w, h)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        /* ---- pointer: drag to scrub, release to coast ---- */
        const onDown = (e: PointerEvent) => {
            const d = drag.current
            d.down = 1
            d.lastX = e.clientX
            d.vel = 0
            host.style.cursor = "grabbing"
            // Capture, so a drag that wanders off the component keeps arriving
            // here. A second `pointermove` listener on window would double-count
            // every event that also hits the host.
            try {
                host.setPointerCapture(e.pointerId)
            } catch {
                /* no capture on this platform: the drag simply ends at the edge */
            }
        }
        const onMove = (e: PointerEvent) => {
            const d = drag.current
            d.over = 1
            if (!d.down) return
            const w = host.offsetWidth || 1
            // One full component width of drag = half a turn. offsetWidth, not
            // getBoundingClientRect: the rect carries the Framer canvas zoom and
            // the ring would scrub at the wrong rate on a zoomed canvas.
            const dx = (e.clientX - d.lastX) / w
            d.lastX = e.clientX
            d.manual += dx * Math.PI
            d.vel = dx * Math.PI * 12
        }
        const onUp = () => {
            drag.current.down = 0
            host.style.cursor = "grab"
        }
        const onLeave = () => {
            drag.current.over = 0
            drag.current.down = 0
            host.style.cursor = "grab"
        }
        host.addEventListener("pointerdown", onDown)
        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerleave", onLeave)
        host.addEventListener("pointercancel", onUp)
        // On window, not host: a flick that releases outside must still let go.
        window.addEventListener("pointerup", onUp)

        /* ---- loop ---- */
        let raf = 0
        let last = performance.now()
        let yaw = 0
        // The clip polygon is rebuilt only when the FRAMING changes, never per
        // frame: it is rotation-invariant, and writing a 200-point path string
        // into style every frame would relayout the plate 60x a second.
        let clipKey = ""

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min((now - last) / 1000, 0.05)
            last = now

            if (cssW <= 0 || cssH <= 0) {
                resize()
                if (cssW <= 0 || cssH <= 0) return
            }

            const L = live.current
            if (L.atlasKey !== builtKey || imgTick !== builtTick) buildAtlas()
            if (!ready) return

            const d = drag.current
            // Hover eases in so the slow-down reads as the band noticing the
            // pointer, not as a jump cut.
            const target = d.over ? 1 : 0
            d.hoverAmt += (target - d.hoverAmt) * Math.min(1, dt * 6)

            // Damping: higher settles faster (rule 8b). Frame-rate independent.
            const keep = Math.exp(-dt * (0.5 + (L.damping / 100) * 7))
            if (!d.down) {
                yaw += d.vel * dt
                d.vel *= keep
            } else {
                yaw += d.manual
            }
            d.manual = 0

            // Autonomous spin, scaled down by however much the pointer is over
            // the band. Hover 0 = no slow-down, 200 = it can stop and reverse.
            const slow = 1 - (L.hover / 100) * d.hoverAmt
            yaw += (L.speed / 50) * SPIN_AT_50 * slow * dt
            // Keep the accumulator bounded: unbounded it eventually costs
            // float32 precision inside the shader's sin/cos.
            yaw = yaw % (Math.PI * 2)

            /* ---- ring size derived from the strip, not fixed ---- */
            // Divided by the supersample too, so raising the texel density
            // never changes a single world coordinate — k buys sharpness, not
            // a bigger ring.
            const perWorld = PX_PER_WORLD * atlasScale
            const bandH = atlasH / perWorld
            const tileW = atlasW / perWorld
            // At least enough repeats that the ring is never narrower than it is
            // tall — a two-item strip would otherwise wrap into a squat drum.
            const repeats = Math.max(
                1,
                Math.ceil((Math.PI * 2 * bandH * 1.2) / Math.max(0.001, tileW))
            )
            const radius = (repeats * tileW) / (Math.PI * 2)

            const aspect = Math.max(0.05, cssW / Math.max(1, cssH))
            const focal = 1 / Math.tan(((FOV / 2) * Math.PI) / 180)
            const pitch = (L.tilt * Math.PI) / 180

            // Distance is measured against the BAND HEIGHT — which comes from
            // Font — not against the radius. Against the radius it would rescale
            // the shot every time an item was added and the type would quietly
            // shrink; against the band height, adding items makes the band
            // longer and leaves the type the size Font asked for.
            //
            // The floor is NOT `radius * 1.15`. That only guarantees the camera
            // is outside the ring, and at sixteen items the ring is wide enough
            // that the near arc then projects past the top and bottom of the
            // frame while the far arc shrinks under the alpha floor — the band
            // renders literally nothing. The floor has to be the distance at
            // which the near arc still FITS.
            const dist = Math.max(
                bandH * (L.distance / 100) * DIST_PER_BAND,
                radius + (bandH * focal) / 0.9
            )

            /* ---- the glass plate's outline ---- */
            // The path is in px, so the element's SIZE is part of the key too —
            // a proportional resize leaves the aspect (and therefore every
            // other term) untouched and would otherwise never rebuild.
            //
            // The plate's clip, tint, blur and refraction map are ALL written
            // from here and none of them is declared in the style prop. They
            // are derived from measurements React cannot see, and a prop change
            // re-running the render would otherwise clobber them with a flat
            // value (rule J). That is why the tint, blur and refraction dials
            // are part of this key: they feed the same write.
            const key = `${radius.toFixed(4)}|${bandH.toFixed(4)}|${pitch.toFixed(
                5
            )}|${dist.toFixed(4)}|${aspect.toFixed(4)}|${cssW}x${cssH}|${
                L.tint
            }|${L.blur}|${L.refraction}`
            if (key !== clipKey) {
                clipKey = key
                const framing = { radius, bandH, pitch, dist, focal, aspect }
                const path = silhouettePath(framing, cssW, cssH)
                const ps = plate.style as CSSStyleDeclaration & {
                    webkitClipPath?: string
                    webkitBackdropFilter?: string
                }
                ps.clipPath = path
                ps.webkitClipPath = path

                const prof = bandProfile(framing, cssW, cssH)
                ps.background = tintGradient(prof, cssW, L.tint)

                const mid = Math.min(cssW - 1, Math.round(cssW / 2))
                const bandPx = Math.max(
                    2,
                    (prof.bot[mid] === -Infinity ? cssH : prof.bot[mid]) -
                        (prof.top[mid] === Infinity ? 0 : prof.top[mid])
                )
                const peak = (L.refraction / 100) * bandPx * REFRACT_AT_100
                const parts: string[] = []
                if (peak > 0.5) {
                    const map = refractionMap(prof, cssW, cssH, bandPx)
                    if (map.url) {
                        feImage.setAttribute("href", map.url)
                        feImage.setAttribute("x", "0")
                        feImage.setAttribute("y", "0")
                        feImage.setAttribute("width", String(cssW))
                        feImage.setAttribute("height", String(cssH))
                        // feDisplacementMap shifts by scale * (channel - 0.5),
                        // and the map fills the channel edge to edge, so the
                        // scale is twice the peak shift.
                        feDisp.setAttribute("scale", (peak * 2).toFixed(2))
                        parts.push(`url(#${filterId})`)
                    }
                }
                if (L.blur > 0) parts.push(`blur(${Math.round(L.blur)}px)`)
                // Written only once there is a map to point at: a url() naming
                // an feImage with no href yet resolves to nothing and the
                // backdrop drops out entirely, which reads as a hole.
                const bf = parts.length ? parts.join(" ") : "none"
                ps.backdropFilter = bf
                ps.webkitBackdropFilter = bf
            }

            gl.useProgram(prog)
            gl.uniform1f(u.radius, radius)
            gl.uniform1f(u.height, bandH)
            gl.uniform1f(u.repeats, repeats)
            gl.uniform1f(u.yaw, yaw)
            gl.uniform1f(u.pitch, pitch)
            gl.uniform1f(u.dist, dist)
            gl.uniform1f(u.focal, focal)
            gl.uniform1f(u.aspect, aspect)
            gl.uniform1f(u.backDim, BACK_DIM)
            gl.uniform1f(u.backBias, BACK_BIAS)
            // Floored: smoothstep with edge0 == edge1 is undefined in GLSL.
            gl.uniform1f(u.fade, Math.max(0.002, (L.fade / 100) * 2))
            gl.uniform1f(u.grain, (L.grain / 100) * 0.5)
            gl.uniform1f(u.rimEdge, RIM_EDGE)
            gl.uniform1f(u.rimAlpha, RIM_ALPHA)
            gl.uniform1f(u.sideAlpha, SIDE_ALPHA)
            const ink = parseRgb(L.textColor)
            gl.uniform3f(u.ink, ink[0], ink[1], ink[2])
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.uniform1i(u.atlas, 0)

            gl.bindBuffer(gl.ARRAY_BUFFER, ringBuf)
            gl.enableVertexAttribArray(aRing)
            gl.vertexAttribPointer(aRing, 2, gl.FLOAT, false, 0, 0)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            // Far half first, then near half.
            gl.cullFace(gl.FRONT)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertCount)
            gl.cullFace(gl.BACK)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertCount)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointerdown", onDown)
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerleave", onLeave)
            host.removeEventListener("pointercancel", onUp)
            window.removeEventListener("pointerup", onUp)
            gl.deleteTexture(tex)
            gl.deleteBuffer(ringBuf)
            gl.deleteProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            // No loseContext(): getContext() hands back the SAME force-lost
            // context on the next StrictMode mount and renders black.
        }
    }, [])

    // The same ramp the shader applies to the type, so the frost and the type
    // stop at the same place. uFade spans `fade` percent of the element width;
    // in NDC that is (fade/100) * 2 out of a full width of 2.
    const fadePct = Math.max(0, Math.min(49, Math.round(fade)))
    const fadeMask =
        fadePct > 0
            ? `linear-gradient(to right, transparent 0%, #000 ${fadePct}%, #000 ${
                  100 - fadePct
              }%, transparent 100%)`
            : undefined

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the style spread: both children are absolutely
                // positioned, so the root has no in-flow content and collapses
                // to a dot under Framer's Fit Content sizing.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                // Deliberately NO background, NO isolation, NO filter, NO
                // transform and NO contain anywhere in this subtree: any of
                // them turns an ancestor into the backdrop root and the plate
                // stops seeing the page underneath.
                cursor: "grab",
                touchAction: "pan-y",
                userSelect: "none",
                ...style,
            }}
        >
            <svg
                width="0"
                height="0"
                aria-hidden
                style={{ position: "absolute", pointerEvents: "none" }}
            >
                <filter
                    id={filterId}
                    x="0%"
                    y="0%"
                    width="100%"
                    height="100%"
                    colorInterpolationFilters="sRGB"
                    filterUnits="objectBoundingBox"
                    primitiveUnits="userSpaceOnUse"
                >
                    <feImage ref={feImageRef} result="map" preserveAspectRatio="none" />
                    <feDisplacementMap
                        ref={feDispRef}
                        in="SourceGraphic"
                        in2="map"
                        scale="0"
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>
            </svg>
            <div
                ref={plateRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    maskImage: fadeMask,
                    WebkitMaskImage: fadeMask,
                    pointerEvents: "none",
                    // background, backdropFilter and clipPath are ALL written
                    // imperatively from the loop and deliberately absent here:
                    // each is derived from a measurement React cannot see, and
                    // declaring one would clobber it on the next prop change
                    // (rule J).
                }}
            />
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}
