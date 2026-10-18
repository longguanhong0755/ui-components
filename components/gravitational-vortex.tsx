"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * GRAVITATIONAL VORTEX — an accretion disc of motion-blurred streaks falling
 * into a funnel throat.
 *
 * ~20k streaks, each a two-triangle quad stretched along the direction its
 * particle is actually travelling. Every particle's position, velocity,
 * projection, streak extent, depth attenuation and colour are computed in the
 * vertex shader; the CPU uploads two seed buffers once and then only advances
 * two wrapped scalars per frame.
 *
 * THE STREAMLINE IS THE SPIRAL. A particle's radius comes from one parameter
 * `u`, which slides from the rim (`u = 1`) to the throat (`u = 0`):
 *
 *     r(u)     = mix(R_IN, R_OUT, u)
 *     angle(u) = seed·τ + TWIST·log((R_OUT + 0.35)/(r(u) + 0.35)) + spin
 *
 * A logarithmic spiral: zero winding at the rim, several full turns by the time
 * it reaches the eye. Differentiate it and the angular rate is
 * `-TWIST·(dr/du)/(r + 0.35)`, about 9× faster at the throat than at the rim —
 * that ratio IS the swirl, and it falls out of the streamline rather than being
 * a second dial. `r` is linear in `u` for the same reason: an exponent above 1
 * stalls `dr/du` at the throat and, with it, the swirl, exactly where a
 * maelstrom's is fastest. The previous build wrote `angle = t·ω(r)`, which is
 * only valid for a particle whose radius never changes; for one that migrates
 * it makes the angle jump every time `r` does.
 *
 * THE STREAK IS REAL MOTION BLUR, AND IT HAS NO DIAL OF ITS OWN. `p1` is the
 * particle re-evaluated one exposure later with BOTH the radial slide and the
 * spin advanced, so the quad points along the true velocity and its length is
 * the true screen displacement over that exposure. Flip Direction and the
 * streak reverses its shape too — the leading end stays the bright one, because
 * the taper is keyed to the tangent (rule H).
 *
 * Because the length IS the displacement, Speed and the hover boost stretch the
 * streaks on their own, which is why `Streak > Length` is cut rather than
 * replaced: it only ever scaled the exposure, and the exposure is now frozen at
 * what its default produced. `Streak > Width` becomes the top-level `Dot Size`,
 * a percent of the shipped radius, which is also the floor on the streak — at
 * Speed 0 a particle is a square dot of exactly that size, instead of a
 * fixed-length dash from a magic constant that only looked right at one Width.
 *
 * NOTHING CROSSES THE NEAR PLANE. The funnel well saturates —
 * `z = Z_FLOOR·(1 - e^(-well/Z_FLOOR)) - 0.6` — so the throat can recede at
 * most `Z_FLOOR` below the rim however far Funnel is pushed, and any vertex
 * that still lands nearer than `NEAR_PLANE` is culled outright instead of being
 * divided by a clamped `w`. The old build divided by `max(w, 0.001)` and then
 * multiplied back by the real, NEGATIVE `w`, so quads straddling the camera
 * stretched across the whole frame — that was the hard white hairline through
 * the core, not geometry.
 *
 * TIME IS TWO WRAPPED SCALARS, NOT A CLOCK. `uPhase` (0..1) drives the inward
 * slide, `uSpin` (0..τ) the rotation; both are wrapped on the CPU, so neither
 * ever grows large enough to cost float32 precision inside `fract()`. Because
 * `uPhase` wraps at exactly 1 and every particle advances at the same rate, the
 * wrap is invisible — which is also why the old per-particle radial speed
 * jitter is gone. Particles at the same radius orbit at the same rate; that is
 * what a disc does, and any per-particle multiplier would pop at the wrap. The
 * seed still varies brightness.
 *
 * THE EYE IS PINNED TO THE FRAME CENTRE BY A LENS SHIFT. `uShift` is the eye's
 * own projected position under the current Tilt / Orbit / Distance / Funnel,
 * computed on the CPU by `eyeShift()` — the same transform chain as the vertex
 * shader, evaluated for the single point `(0, 0, zThroat)` — and subtracted in
 * screen space. It re-frames without touching the perspective: both ends of a
 * streak move together, so direction and length are unchanged.
 *
 * It fixes a real defect. The funnel sinks the throat AWAY from the camera
 * (z = +1.60 world at Funnel 32) and a pitched camera maps +z partly to -y
 * screen, so the eye sat at ndc y = -0.457 — a quarter of the frame below
 * centre — and slid further every time Funnel moved. Nothing compensated,
 * because the projection is centred on `pivot`, a point in the disc PLANE and
 * not on the throat. Set Funnel to 0 and the eye returned to +0.101, so the
 * funnel was 92% of the error; a hardcoded `vec2(-0.15, -0.2)` disc offset,
 * now gone, was the rest.
 *
 * The CURSOR TERM IS EXCLUDED FROM THE SHIFT ON PURPOSE. Include it and the
 * shift chases the throat the pointer just moved and cancels it exactly, which
 * would leave Cursor > Parallax mapping to nothing (rule F).
 *
 * FILLING THE FRAME IS DISTANCE'S JOB, AND ONLY DISTANCE'S. Perspective on a
 * tilted plane compresses the far half and magnifies the near half, so a disc
 * that is smaller than the frame cannot be centred into filling it — the empty
 * band just moves from the top to the bottom. Measured at Tilt 31: Distance 62
 * gives 0% empty on all four margins at 3% clipped, Distance 79 leaves 5% dead
 * at the top and 13% at the bottom however it is centred. Loosening the outer
 * fade is NOT the lever — from 0.62 to 1.0 it moved the bottom margin 16% to
 * 11% and nothing else, because the limit is scale, not the fade.
 *
 * ADDITIVE OVER A CSS BACKGROUND. The canvas clears transparent and the
 * fragment shader writes premultiplied, blending `ONE, ONE`. The background and
 * the (now frozen) vignette are the root's CSS, never a GL clear (rule 8b) —
 * the old build cleared to the background colour with `alpha:false`, so any
 * non-black background got added onto by every streak.
 *
 * NO INDEX BUFFER. The old one was `Uint16Array`, which cannot address past
 * vertex 65535 — i.e. past particle 16383 — so at the shipped default of 20000
 * the last 3617 quads indexed wrapped vertices and drew garbage. Six vertices
 * per quad and `drawArrays` removes the ceiling without needing
 * `OES_element_index_uint`.
 *
 * Rule 6 recipe: ONE GL context built in useEffect([]); every live input read
 * from a ref inside a raw rAF loop. Never calls loseContext().
 *
 * SPEED IS UNSIGNED AND `Direction` OWNS THE SIGN. A signed −100..100 Speed and
 * a Direction enum would be two controls arguing over one number; the enum is
 * the readable half, so Speed became 0–100. `Hover Speed` is on that SAME dial
 * — the rate while the pointer is over the component — so setting the two equal
 * is what "no hover effect" looks like and there is no boolean to enable it
 * (rule 11a). It eases with a dt-correct ~0.45s constant, so the ramp takes the
 * same wall-clock time at the canvas's 30fps as at the preview's 60.
 *
 * ── CHANGED KEYS ────────────────────────────────────────────────────────────
 * Regrouped per rule 8b. Old top-level keys are still read as fallbacks where
 * the SCALE is unchanged: `vortexTwist`→`vortex.twist`,
 * `funnelDepth`→`vortex.funnel`, `backgroundColor`→`background`,
 * `particleColor`→`baseColor`.
 *
 * CUT: `streak.length` / `streakLength` (exposure frozen at its default),
 * `cursor.parallax` (pointer parallax replaced by the hover speed boost, and
 * the `uCursor` uniform with it), `glow` (the vignette was fully transparent by
 * default, so freezing it changes nothing on screen). A live instance loses
 * those rows; nothing else about it changes.
 *
 * These cannot be migrated, because the stored number is the same either way
 * and only its meaning moved. A live instance resets to the new default:
 *   `count` (1000–40000 particles) → `density` (10–100)
 *   `cameraPitch` (0–100)          → `tiltX` (5–90°)
 *   `cameraYaw` (0–100)            → `tiltY` (−90–90°)
 *   `streak.width` (0–100)         → `dotSize` (25–400%, 100 = old 17)
 *   `speed` (−100–100)             → `speed` (0–100) + `direction`
 *   `distance` (30–250, pullback)  → `scale` (25–200%, RECIPROCAL of it)
 *
 * `camera.tilt` / `camera.orbit` are now the flat `Tilt X` / `Tilt Y` — the
 * same degrees and the same ranges, so only the key moved. `Tilt X` is pitch
 * about the screen's X axis (elevation above the disc plane, 90° = top-down)
 * and `Tilt Y` is yaw about its Y axis.
 *
 * `Scale` is NOT a retitled `Distance`. Pullback and size run in opposite
 * directions, so a straight rename would have given a dial where turning it up
 * made the vortex smaller (rule F). It is the reciprocal: `dist = 6.2 · 100 /
 * scale`, with 100 the size the scene ships at.
 *
 * `Camera > Tilt` is ELEVATION above the disc plane — 90° is a true top-down on
 * the eye, 55° the front-top three-quarter it defaults to, 5° almost in-plane.
 * It replaces an abstract 0–100 that ran the other way.
 *
 * CUT DIALS, frozen at the value they shipped with (rule 8b): the camera's
 * −0.25 rad roll, the field's inner and outer radius, the 45° field of view,
 * the exposure, the pointer parallax. The panel rows are gone; every one of
 * them still renders at exactly the number it defaulted to.
 */

/* ---------------------------------------------------------------- constants */

const TAU = Math.PI * 2
const MAX_PARTICLES = 40000
const MIN_PARTICLES = 2000
const CANVAS_FPS = 30
// A whole frame's worth of slack. Testing against the exact period quantizes to
// every THIRD frame at 60Hz — 21fps, not 30.
const FRAME_SLACK = 4
const DPR_CAP = 2

// Inward slide, u-units/sec, at Speed 50 — one rim-to-throat trip in ~10s.
const RADIAL_AT_50 = 0.1
// Rigid rotation, rad/sec, at Speed 50. The inner speed-up is not in here: it
// comes out of the spiral tightening, which is where it belongs.
const SPIN_AT_50 = 0.15
// How long the shutter is open, in seconds. Frozen at what `Streak > Length`
// 51 produced (1/90 + 0.51/12) now that the dial is cut — the streak's screen
// extent is still the particle's REAL displacement over this time, so it grows
// with Speed and with the hover boost on its own (rule P).
const EXPOSURE = 1 / 90 + 0.51 / 12
// Seconds for the hover speed-up to travel ~63% of the way to its target. A
// rate that snaps reads as a glitch, not an acceleration.
const HOVER_RAMP = 0.45

/* Cut dials, frozen (rule 8b). */
const R_IN = 0.15 // throat radius, world units
const R_OUT = 4.2 // rim radius
const Z_FLOOR = 2.5 // deepest the throat may sit below the rim
const NEAR_PLANE = 0.6
const FOV = 45 // vertical field of view, degrees
const ROLL = -0.25 // the camera's diagonal lean, radians
const FUNNEL_AT_100 = 4.5 // well strength at Funnel 100
const TWIST_AT_100 = 20.0 // winding at Twist 100: ~7 full turns rim-to-eye
// The dot's radius in world units at Dot Size 100 — which is exactly what the
// cut `Streak > Width` 17 produced, so the default look is unchanged. A world
// radius, not px: a px radius would mean a different dot at every Density and
// Distance (rule 8b).
const DOT_RADIUS_AT_100 = 0.0051
// Camera pullback at Scale 100, world units. Scale is the RECIPROCAL of this —
// see the header — so this is also the number that makes Scale 100 exactly fill
// a 3:2 frame at the default Tilt.
const DIST_AT_100 = 6.2
// Cut dial, frozen at the value it shipped with (rule 8b). It was fully
// transparent by default, so the vignette layer paints nothing; put a colour
// here and it comes back with no other change.
const GLOW = "rgba(0,0,0,0)"
// Spiral ARMS. Seeding the angle uniformly gives a smooth annulus that shears
// into concentric rings and reads as a record groove, not a whirlpool — the
// spiral in a maelstrom is a DENSITY structure, not a blur direction. Clustering
// the angular seed into a few bands makes those arms exist; the logarithmic
// winding then wraps them into the eye.
const ARMS = 5
const ARM_SPREAD = 0.85 // fraction of an arm's slot the band actually fills

/* ------------------------------------------------------------------ shaders */

// Six vertices per streak, no index buffer.
//   aSeed.x  — the particle's place in the queue, 0..1
//   aSeed.y  — its angular seed, 0..1
//   aSeed.z  — brightness / accent jitter, 0..1
//   aCorner  — x: -0.5..0.5 across the streak, y: 0..1 along it (1 = leading)
const VS_SOURCE = `
precision highp float;

attribute vec3 aSeed;
attribute vec2 aCorner;

uniform float uPhase;     // 0..1, wrapped on the CPU
uniform float uSpin;      // radians, wrapped on the CPU
uniform float uDu;        // signed u travelled during one exposure
uniform float uDSpin;     // signed radians travelled during the same exposure
uniform float uTwist;
uniform float uFunnel;
uniform float uHalfWidth;
uniform float uTilt;
uniform float uOrbit;
uniform float uDist;
uniform float uFocal;
uniform float uAspect;
uniform float uAccentMix;
uniform vec2  uShift;     // where the eye WOULD land; subtracted to re-centre it

varying float vAlpha;
varying vec2  vCorner;
varying float vAcc;

#define TAU 6.28318530718
#define R_IN ${R_IN}
#define R_OUT ${R_OUT}
#define Z_FLOOR ${Z_FLOOR}
#define NEAR_PLANE ${NEAR_PLANE}
#define ROLL ${ROLL}

// Linear in u on purpose. An exponent above 1 stalls dr/du at the throat, and
// since the angular rate is proportional to it, the swirl would DIE exactly
// where a maelstrom's swirl is fastest.
float radiusOf(float u){ return mix(float(R_IN), float(R_OUT), clamp(u, 0.0, 1.0)); }

// The winding accumulated from the rim in to u — a logarithmic spiral, zero at
// the rim and unbounded at the eye. Differentiating it gives the angular rate:
//
//     dtheta/du = -TWIST * (dr/du) / (r + K)
//
// which is ~9x faster at the throat than at the rim. That ratio is the swirl,
// and it falls out of the streamline rather than being a second dial.
float spiralOf(float u){
    return uTwist * log((float(R_OUT) + 0.35) / (radiusOf(u) + 0.35));
}

vec3 surf(float u, float seedV, float spin){
    float uc = fract(u);
    float r  = radiusOf(uc);
    float a  = seedV * TAU + spiralOf(uc) + spin;

    // The disc is centred on its own axis. It used to carry a hardcoded
    // vec2(-0.15, -0.2) here, which pushed the eye 0.03 of the frame left and
    // down for no stated reason; uShift owns the framing now.

    // Saturating funnel: however hard Funnel is pushed, the throat bottoms out
    // Z_FLOOR below the rim and can never reach the camera.
    // The well recedes FROM the camera: +z is farther, so the throat sinks
    // away instead of rearing up as a cone in front of the disc.
    float well = uFunnel / (r + 0.12);
    float z = float(Z_FLOOR) * (1.0 - exp(-well / float(Z_FLOOR))) - 0.6;

    return vec3(r * cos(a), r * sin(a), z);
}

mat3 rotX(float t){ float c = cos(t), s = sin(t); return mat3(1.0, 0.0, 0.0,  0.0, c, s,  0.0, -s, c); }
mat3 rotY(float t){ float c = cos(t), s = sin(t); return mat3(c, 0.0, -s,  0.0, 1.0, 0.0,  s, 0.0, c); }
mat3 rotZ(float t){ float c = cos(t), s = sin(t); return mat3(c, s, 0.0,  -s, c, 0.0,  0.0, 0.0, 1.0); }

void main(){
    vCorner = aCorner;
    vAcc = step(1.0 - uAccentMix, aSeed.z);

    // Every particle slides at the same rate, so the wrap of uPhase at 1 is
    // invisible. A per-particle multiplier here would pop at every wrap.
    float u0 = fract(aSeed.x - uPhase);

    vec3 p0 = surf(u0,        aSeed.y, uSpin);
    vec3 p1 = surf(u0 + uDu,  aSeed.y, uSpin + uDSpin);

    // uTilt arrives as ELEVATION above the disc plane: 90 deg is straight down
    // on the vortex, 0 deg is in its plane. rotX wants the complement.
    mat3 cam = rotX(1.5707963 - uTilt) * rotY(uOrbit) * rotZ(float(ROLL));
    vec3 pivot = vec3(0.0, 0.15, 0.0);
    vec3 e0 = cam * (p0 - pivot);
    vec3 e1 = cam * (p1 - pivot);

    float zd0 = e0.z + uDist;
    float zd1 = e1.z + uDist;

    // Cull rather than clamp. Dividing a behind-camera vertex by a floored w
    // and multiplying back by the real negative w is what stretched quads
    // across the frame.
    if (zd0 < float(NEAR_PLANE) || zd1 < float(NEAR_PLANE)) {
        vAlpha = 0.0;
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        return;
    }

    // Square units: y spans -1..1 over the viewport height, x the same scale,
    // so the streak's width is the same number of pixels on both axes.
    vec2 sp0 = e0.xy * uFocal / zd0;
    vec2 sp1 = e1.xy * uFocal / zd1;

    vec2 d = sp1 - sp0;
    float len = length(d);
    vec2 tg = len > 1e-6 ? d / len : vec2(1.0, 0.0);
    vec2 nm = vec2(-tg.y, tg.x);

    float W = uHalfWidth * uFocal / zd0;
    // A stopped particle is a SQUARE dot, not a fixed-length dash: the floor is
    // the dot's own width, so it tracks Dot Size instead of a magic screen-space
    // constant that only looked right at one setting.
    float L = max(len, 2.0 * W);

    vec2 sp = sp0 + tg * (aCorner.y * L) + nm * (aCorner.x * W);
    // Lens shift, not a camera move: uShift is where the eye of the vortex
    // lands under this Tilt/Orbit/Distance/Funnel, so subtracting it pins the
    // eye to the frame centre without touching the perspective. Both quad ends
    // move together, so the streak's direction and length are unchanged.
    vec2 ndc = vec2((sp.x - uShift.x) / uAspect, sp.y - uShift.y);

    gl_Position = vec4(ndc * zd0, 0.0, zd0);

    // Fade in at the rim, out at the throat — a particle is never born or
    // consumed at full brightness.
    // A wide fade at BOTH ends: the inner one clears a real void at the eye
    // instead of a grey smudge, the outer one dissolves the rim so the field
    // does not end as a hard disc floating in the frame.
    float edge = smoothstep(0.0, 0.20, u0) * (1.0 - smoothstep(0.62, 1.0, u0));
    // Depth attenuation. 1 at the pivot plane, dimmer beyond. The old build
    // computed this into a varying the fragment shader never read, which is why
    // the far half of the disc was as bright as the near half and the whole
    // thing looked like a flat swirl.
    float depthAtt = pow(clamp(uDist / zd0, 0.0, 1.0), 3.0);
    vAlpha = edge * mix(0.35, 1.0, aSeed.z) * mix(0.05, 1.0, depthAtt);
}
`

const FS_SOURCE = `
precision highp float;

uniform vec3 uBase;
uniform vec3 uAccent;

varying float vAlpha;
varying vec2  vCorner;
varying float vAcc;

void main(){
    // Gaussian across the width.
    float cd = abs(vCorner.x * 2.0);
    float glow = exp(-8.0 * cd * cd);
    // Keyed to the tangent, so reversing Speed reverses the streak's shape and
    // not merely its direction: the leading end is always the bright one.
    float taper = smoothstep(0.0, 0.25, vCorner.y);

    float a = vAlpha * glow * taper;
    if (a < 0.004) discard;

    vec3 col = mix(uBase, uAccent, vAcc);
    // Premultiplied — the context is premultipliedAlpha:true and blends ONE/ONE,
    // so the CSS background and vignette show through.
    gl_FragColor = vec4(col * a, a);
}
`

/* -------------------------------------------------------------- gl helpers */

function compileShader(
    gl: WebGLRenderingContext,
    type: number,
    src: string,
    label: string
): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn(`GravitationalVortex ${label}:`, gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
    const vs = compileShader(gl, gl.VERTEX_SHADER, VS_SOURCE, "vert")
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE, "frag")
    if (!vs || !fs) return null
    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn("GravitationalVortex link:", gl.getProgramInfoLog(prog))
        gl.deleteProgram(prog)
        return null
    }
    return prog
}

/**
 * Where the eye of the vortex projects, in the shader's square screen units —
 * the same maths as surf() + cam + the perspective divide, for the single point
 * `(0, 0, zThroat)`.
 *
 * The funnel sinks the throat AWAY from the camera (z = +1.60 world at Funnel
 * 32), and a pitched camera maps +z partly to -y screen, so the eye slid to
 * ndc y = -0.457 — a quarter of the frame below centre, moving every time
 * Funnel moved. Nothing compensated: the projection is centred on `pivot`,
 * which is a point in the disc PLANE, not on the throat.
 *
 */
function eyeShift(
    tiltRad: number,
    orbitRad: number,
    dist: number,
    funnel: number,
    focal: number
): [number, number] {
    const well = funnel / (R_IN + 0.12)
    const z = Z_FLOOR * (1 - Math.exp(-well / Z_FLOOR)) - 0.6

    // p - pivot, with pivot = vec3(0, 0.15, 0) as in the shader.
    const px = 0
    const py = -0.15

    // rotZ(ROLL)
    const cz = Math.cos(ROLL)
    const sz = Math.sin(ROLL)
    const x1 = cz * px - sz * py
    const y1 = sz * px + cz * py

    // rotY(orbit)
    const cy = Math.cos(orbitRad)
    const sy = Math.sin(orbitRad)
    const x2 = cy * x1 + sy * z
    const z2 = -sy * x1 + cy * z

    // rotX(90deg - tilt)
    const t = Math.PI / 2 - tiltRad
    const ct = Math.cos(t)
    const st = Math.sin(t)
    const ey = ct * y1 - st * z2
    const ez = st * y1 + ct * z2

    const zd = ez + dist
    if (!(zd >= NEAR_PLANE)) return [0, 0]
    return [(x2 * focal) / zd, (ey * focal) / zd]
}

// #rgb / #rrggbb / #rrggbbaa / rgb() / rgba(), to 0..1 RGB.
function parseColor(input?: string): [number, number, number] {
    if (!input) return [1, 1, 1]
    const s = input.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h.split("").map((c) => c + c).join("")
        const n = parseInt(h.slice(0, 6), 16)
        if (isNaN(n)) return [1, 1, 1]
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(",").map((x) => parseFloat(x))
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255]
    }
    return [1, 1, 1]
}

/* -------------------------------------------------------------------- props */

type VortexGroup = { twist: number; funnel: number }

const VORTEX_DEFAULTS: VortexGroup = { twist: 13, funnel: 32 }

export interface GravitationalVortexProps {
    background?: string
    baseColor?: string
    accentColor?: string
    accentMix?: number
    density?: number
    dotSize?: number
    speed?: number
    direction?: "inward" | "outward"
    hoverSpeed?: number
    scale?: number
    tiltX?: number
    tiltY?: number
    vortex?: Partial<VortexGroup>
    /* legacy top-level keys — same scale, still read (see the header) */
    backgroundColor?: string
    particleColor?: string
    vortexTwist?: number
    funnelDepth?: number
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ---------------------------------------------------------------- component */

function __BaseImpl_GravitationalVortex(props: GravitationalVortexProps) {
    const {
        background = "#000000",
        backgroundColor,
        baseColor = "#0FFF00",
        particleColor,
        accentColor = "#FFCD59",
        accentMix = 50,
        density = 16,
        dotSize = 400,
        speed = 16,
        direction = "inward",
        hoverSpeed = 100,
        scale = 79,
        tiltX = 35,
        tiltY = 0,
        vortex = { twist: 28, funnel: 54 },
        vortexTwist,
        funnelDepth,
        style,
    } = props

    // A group the caller never set arrives undefined, and one set before a
    // field existed arrives missing that field — spread-merge over a typed
    // literal rather than a ?? chain, where one missed key silently pins a
    // control forever. The legacy top-level key is the next fallback down.
    const vx: VortexGroup = {
        ...VORTEX_DEFAULTS,
        ...(vortexTwist !== undefined ? { twist: vortexTwist } : {}),
        ...(funnelDepth !== undefined ? { funnel: funnelDepth } : {}),
        ...(vortex ?? {}),
    }

    const bgCss = background ?? backgroundColor ?? "#000000"
    const baseCss = baseColor ?? particleColor ?? "#ffffff"

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const live = useRef({
        count: 0,
        speed,
        hoverSpeed,
        dir: 1,
        twist: vx.twist,
        funnel: vx.funnel,
        dotSize,
        tilt: tiltX,
        orbit: tiltY,
        distance: DIST_AT_100,
        accentMix,
        base: [1, 1, 1] as [number, number, number],
        accent: [1, 1, 1] as [number, number, number],
    })
    live.current = {
        count: Math.round(
            MIN_PARTICLES +
                (Math.min(100, Math.max(0, density)) / 100) *
                    (MAX_PARTICLES - MIN_PARTICLES)
        ),
        // Speed is unsigned now; Direction carries the sign, so the two cannot
        // fight over one number the way a signed dial plus an enum would.
        speed: Math.max(0, speed),
        hoverSpeed: Math.max(0, hoverSpeed),
        dir: direction === "outward" ? -1 : 1,
        twist: vx.twist,
        funnel: vx.funnel,
        dotSize,
        tilt: tiltX,
        orbit: tiltY,
        // Scale is the RECIPROCAL of the camera pullback it replaces: turning it
        // up has to make the vortex bigger, and pullback runs the other way. A
        // straight retitle of the old Distance would have been a dial that lies
        // (rule F). 100 is the size the scene ships at.
        distance: (DIST_AT_100 * 100) / Math.max(1, scale),
        accentMix,
        base: parseColor(baseCss),
        accent: parseColor(accentColor),
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
            depth: false,
            powerPreference: "high-performance",
        }) as WebGLRenderingContext | null
        if (!gl) return

        const program = createProgram(gl)
        if (!program) return
        gl.useProgram(program)

        const aSeedLoc = gl.getAttribLocation(program, "aSeed")
        const aCornerLoc = gl.getAttribLocation(program, "aCorner")
        const U = (n: string) => gl.getUniformLocation(program, n)
        const u = {
            phase: U("uPhase"),
            spin: U("uSpin"),
            du: U("uDu"),
            dspin: U("uDSpin"),
            twist: U("uTwist"),
            funnel: U("uFunnel"),
            halfWidth: U("uHalfWidth"),
            tilt: U("uTilt"),
            orbit: U("uOrbit"),
            dist: U("uDist"),
            focal: U("uFocal"),
            aspect: U("uAspect"),
            accentMix: U("uAccentMix"),
            shift: U("uShift"),
            base: U("uBase"),
            accent: U("uAccent"),
        }

        /* ---- seeds, built once ---- */
        // Six vertices per quad, no index buffer: a Uint16 index cannot reach
        // past particle 16383, which is well under the shipped particle count.
        const VERTS = 6
        const seeds = new Float32Array(MAX_PARTICLES * VERTS * 3)
        const corners = new Float32Array(MAX_PARTICLES * VERTS * 2)

        let s = 1337
        const rng = () => {
            s = (s * 16807) % 2147483647
            return (s - 1) / 2147483646
        }
        const QUAD = [
            [-0.5, 0.0], [0.5, 0.0], [-0.5, 1.0],
            [0.5, 0.0], [0.5, 1.0], [-0.5, 1.0],
        ]
        for (let i = 0; i < MAX_PARTICLES; i++) {
            const u0 = rng()
            const v0 = (Math.floor(rng() * ARMS) + (rng() - 0.5) * ARM_SPREAD) / ARMS
            const jit = rng()
            for (let k = 0; k < VERTS; k++) {
                const a = (i * VERTS + k) * 3
                seeds[a] = u0
                seeds[a + 1] = v0
                seeds[a + 2] = jit
                const c = (i * VERTS + k) * 2
                corners[c] = QUAD[k][0]
                corners[c + 1] = QUAD[k][1]
            }
        }

        const vboSeed = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, vboSeed)
        gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW)

        const vboCorner = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, vboCorner)
        gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW)

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE) // additive on premultiplied
        gl.clearColor(0, 0, 0, 0)

        const focal = 1 / Math.tan(((FOV * Math.PI) / 180) * 0.5)

        /* ---- hover ---- */
        // Hover is a rate, not a style, so it cannot go through declarative
        // hover styling: the boost has to reach the rAF loop. `hover.on` is the
        // state, `hover.k` the eased 0..1 that the loop actually blends with.
        const hover = { on: false, k: 0 }
        const onEnter = () => { hover.on = true }
        const onLeave = () => { hover.on = false }
        host.addEventListener("pointerenter", onEnter)
        host.addEventListener("pointerleave", onLeave)
        host.addEventListener("pointercancel", onLeave)

        /* ---- loop ---- */
        let raf = 0
        let lastDraw = 0
        // Wrapped on the CPU so neither ever grows large enough to cost float32
        // precision inside fract().
        let phase = 0
        let spin = 0

        const render = (now: number) => {
            raf = requestAnimationFrame(render)

            // There is no editor canvas outside Framer: the component always
            // runs at the full frame rate. The gate is kept so the timing maths
            // below is unchanged.
            const onCanvas = false
            // Gate on time since the last DRAW. The old build reset its marker
            // before the test, so dt was always one frame, always under the
            // threshold, and the component never painted on the canvas at all.
            if (onCanvas && lastDraw && now - lastDraw < 1000 / CANVAS_FPS - FRAME_SLACK) return
            const dt = lastDraw ? Math.min(0.05, (now - lastDraw) / 1000) : 1 / 60
            lastDraw = now

            const L = live.current

            // dt-correct ease, so the ramp takes the same wall-clock time at
            // 30fps as at 60 (rule P).
            hover.k += ((hover.on ? 1 : 0) - hover.k) * (1 - Math.exp(-dt / HOVER_RAMP))

            // 50 is the rate the scene shipped at. Hover Speed is on the SAME
            // 0-100 dial as Speed, so setting the two equal is what "no hover
            // effect" looks like — no second boolean to enable it (rule 11a).
            const dial = L.speed + (L.hoverSpeed - L.speed) * hover.k
            // Direction owns the sign. It reverses the inward slide and the
            // rotation TOGETHER, so the streaks reverse their shape with it and
            // the leading end stays the bright one (rule H).
            const rate = (dial / 50) * RADIAL_AT_50 * L.dir
            const spinRate = (dial / 50) * SPIN_AT_50 * L.dir
            phase += dt * rate
            phase -= Math.floor(phase)
            spin += dt * spinRate
            spin -= Math.floor(spin / TAU) * TAU

            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const cw = canvas.clientWidth || host.clientWidth || 0
            const ch = canvas.clientHeight || host.clientHeight || 0
            const w = Math.max(1, Math.floor(cw * dpr))
            const h = Math.max(1, Math.floor(ch * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            gl.viewport(0, 0, w, h)
            gl.clear(gl.COLOR_BUFFER_BIT)

            gl.useProgram(program)
            gl.bindBuffer(gl.ARRAY_BUFFER, vboSeed)
            gl.enableVertexAttribArray(aSeedLoc)
            gl.vertexAttribPointer(aSeedLoc, 3, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ARRAY_BUFFER, vboCorner)
            gl.enableVertexAttribArray(aCornerLoc)
            gl.vertexAttribPointer(aCornerLoc, 2, gl.FLOAT, false, 0, 0)

            gl.uniform1f(u.phase, phase)
            gl.uniform1f(u.spin, spin)
            // The exposure, expressed in the same two coordinates the particle
            // moves in — so the quad points along the TRUE velocity, radial
            // component included. The old build advanced only the orbital term,
            // which is why every streak was purely tangential and the inward
            // flow was invisible.
            gl.uniform1f(u.du, -rate * EXPOSURE)
            gl.uniform1f(u.dspin, spinRate * EXPOSURE)
            const funnel = (L.funnel / 100) * FUNNEL_AT_100
            const tiltRad = (L.tilt * Math.PI) / 180
            const orbitRad = (L.orbit * Math.PI) / 180
            const dist = Math.max(NEAR_PLANE + 1, L.distance)

            gl.uniform1f(u.twist, (L.twist / 100) * TWIST_AT_100)
            gl.uniform1f(u.funnel, funnel)
            gl.uniform1f(u.halfWidth, (L.dotSize / 100) * DOT_RADIUS_AT_100)
            gl.uniform1f(u.tilt, tiltRad)
            gl.uniform1f(u.orbit, orbitRad)
            gl.uniform1f(u.dist, dist)
            gl.uniform1f(u.focal, focal)
            gl.uniform1f(u.aspect, w / Math.max(1, h))
            gl.uniform1f(u.accentMix, L.accentMix / 100)
            // Re-framing, every frame, because Tilt / Orbit / Distance / Funnel
            // all move where the eye lands and any of them can change live.
            const sh = eyeShift(tiltRad, orbitRad, dist, funnel, focal)
            gl.uniform2f(u.shift, sh[0], sh[1])
            gl.uniform3fv(u.base, L.base)
            gl.uniform3fv(u.accent, L.accent)

            gl.drawArrays(gl.TRIANGLES, 0, L.count * VERTS)
        }
        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            host.removeEventListener("pointerenter", onEnter)
            host.removeEventListener("pointerleave", onLeave)
            host.removeEventListener("pointercancel", onLeave)
            gl.deleteBuffer(vboSeed)
            gl.deleteBuffer(vboCorner)
            gl.deleteProgram(program)
            // No loseContext(): getContext returns the same context per canvas,
            // so StrictMode's mount/cleanup/mount would reuse a force-lost one.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the style spread: the canvas is absolutely
                // positioned, so the root has no in-flow content and would
                // collapse to a dot under fit-content sizing.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                // Vignette in CSS, not a second GL pass. Its ALPHA is the
                // intensity — there is no second Glow dial.
                background: `radial-gradient(60% 50% at 50% 50%, ${GLOW} 0%, transparent 72%), ${bgCss}`,
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

const __presetProps = {
  "background": "#000000",
  "baseColor": "#04FF3F",
  "accentColor": "#FCFF00",
  "accentMix": 50,
  "density": 16,
  "dotSize": 400,
  "speed": 16,
  "direction": "inward",
  "hoverSpeed": 100,
  "scale": 79,
  "tiltX": 35,
  "tiltY": 0,
  "vortex": {
    "twist": 28,
    "funnel": 54
  }
};

export default function GravitationalVortex(props: Record<string, unknown>) {
  return <__BaseImpl_GravitationalVortex {...(__presetProps as Record<string, unknown>)} {...props} />;
}
