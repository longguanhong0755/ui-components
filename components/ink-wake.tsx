"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"

/* ------------------------------------------------------------------ *
 *  InkWake
 *  A ribbon of ink drawn past a solid body, shedding a vortex street.
 *
 *  WHAT IS ACTUALLY BEING SOLVED
 *    Incompressible Navier-Stokes on a grid, in five stages per step:
 *
 *      advect     semi-Lagrangian: walk back up the velocity field and
 *                 read what used to be there. Unconditionally stable
 *      vorticity  confinement force, feeding spin back into the cores
 *                 that the grid's own interpolation keeps stealing
 *      divergence how much the field is compressing, per cell
 *      pressure   Jacobi sweeps of the Poisson equation
 *      project    subtract the pressure gradient, leaving the field
 *                 divergence-free -- this is what makes it a fluid and
 *                 not a smoke shader
 *
 *    There is NO viscous diffusion term. Solving one would smear the
 *    shear layer flat before it could roll up, and the advection's own
 *    interpolation error already supplies more damping than the picture
 *    needs. That omission is why a street forms here at all.
 *
 *  THE STREET IS NOT ANIMATED
 *    Nothing in here alternates anything. A steady stream, a blunt body
 *    and no viscosity is an absolutely unstable arrangement: the wake
 *    cannot stay symmetric, so it picks a side, then the other, forever.
 *    All the component does is seed a whisper of noise at startup, since
 *    a perfectly symmetric field has nothing to amplify.
 *
 *  TWO GRIDS
 *    Velocity is solved coarse -- the pressure loop runs two dozen times
 *    a step and is essentially the whole cost of the frame. The ink it
 *    carries is advected on a grid twice as fine and read back bilinear,
 *    so the visible edges stay crisp while the physics stays cheap.
 *
 *  THE STREAM RUNS ANY OF FOUR WAYS
 *    Direction is not a rotation of the picture: the solver is written in
 *    terms of the edge the stream enters by, the edge it leaves by and
 *    the two it runs between, so turning it is a matter of naming
 *    different edges. The bands lie across the stream whichever way it
 *    goes, and a change restarts the flow rather than spending several
 *    seconds turning the whole field around in place.
 *
 *  THE BODY IS THE POINTER'S TOO
 *    Press on it and it follows the pointer, handing the solver its own
 *    velocity so it shoves the ink ahead of it and trails a wake, the way
 *    a spoon through a cup does. Pressing anywhere else stirs the fluid
 *    instead. Position X and Y say where it starts; a drag takes it from
 *    there, and touching either control again takes it back.
 *
 *  NO TRANSITION CONTROL
 *    Nothing here is a framer-motion animation, so there is no curve to
 *    hand a Transition to. The motion is the solver's, and it is steered
 *    by Speed and Swirl instead.
 * ------------------------------------------------------------------ */

/* ----------------------------------------------------------- defaults */

const DEFAULT_OBSTACLE = {
    show: true,
    size: 5,
    x: 26,
    y: 50,
}

const DEFAULT_INK = {
    bands: 7,
    softness: 3.5,
    fade: 1.5,
    contrast: 6,
}

const DEFAULTS = {
    colors: ["#132A63", "#2F6BE0", "#5BD6F2", "#F3EFE2"],
    background: "#000000",
    obstacle: DEFAULT_OBSTACLE,
    ink: DEFAULT_INK,
    drag: true,
    strength: 10,
    direction: "down",
    speed: 6,
    swirl: 7.2,
    detail: 10,
}

/** User colour stops. Stop 0 of the ramp is the Background, so thin ink
 *  fades into the empty field instead of into a second dark colour. */
const MAX_STOPS = 6
const RAMP_STOPS = MAX_STOPS + 1

/* Fixed choices, deliberately not exposed as controls. */

/** Jacobi sweeps per step, and essentially the whole cost of a frame.
 *  Too few and the body leaks; past a couple of dozen the solve is close
 *  enough that more sweeps buy a picture nobody can tell apart. */
const PRESSURE_ITERS = 24
/** Fixed timestep, so the street's period is the same on a 60Hz panel
 *  and a 144Hz one. */
const STEP = 1 / 60
const MAX_SUBSTEPS = 3
/** Band at the inlet edge where the free stream is re-imposed, in domain
 *  units (1 = the frame's height). */
const INLET = 0.05
/** Ink grid resolution, as a multiple of the velocity grid. */
const INK_SCALE = 2
/** Startup asymmetry, as a fraction of the inflow speed. */
const SEED_NOISE = 0.03
/** Pointer splat radius, domain units. Sized against the default body so
 *  a drag reads as pushing the flow rather than denting one cell. */
const POINTER_RADIUS = 0.07
/** Steps run once at build time when the reader asked for less motion,
 *  so they get a formed wake held still rather than an empty frame. A
 *  second of flow: the pair of starting vortices is sitting behind the
 *  body and the stripes have bent around it, which is a picture. Running
 *  on to the shedding would cost the reader a longer stall on load for a
 *  frame they will never see move. */
const STILL_WARMUP = 60
const DPR_CAP = 2

/* -------------------------------------------------------------- types */

export interface InkWakeObstacle {
    /** Off leaves the stream nothing to get around: bands and a pointer */
    show?: boolean
    /** 0-10 body size, mapped to a radius in frame heights */
    size?: number
    /** Where the body starts, % of the frame's width. A pointer drag moves
     *  it from there; editing this takes it back */
    x?: number
    /** Where the body starts, % of the frame's height, from the top */
    y?: number
}

export interface InkWakeInk {
    /** Stripes of ink released across the inlet */
    bands?: number
    /** 0-10 stripe edge, hard to sine */
    softness?: number
    /** 0-10 how fast ink thins out downstream */
    fade?: number
    /** 0-10 density contrast, 5 = neutral (exponential) */
    contrast?: number
}

export interface InkWakeProps {
    /** Ink ramp, thin -> dense. Background is the empty field beneath it */
    colors?: string[]
    background?: string
    obstacle?: InkWakeObstacle
    ink?: InkWakeInk
    /** Pointer interaction: stirring the ink anywhere in the frame, and
     *  dragging the body itself by pressing on it */
    drag?: boolean
    /** 0-10 push and paint strength. The body is dragged at the pointer's
     *  own speed whatever this says -- it only scales the stirring */
    strength?: number
    /** Which way the stream runs. Every boundary follows it: the ink
     *  enters by that edge, leaves by the opposite one, and the bands lie
     *  across it. The body does not follow it -- Position X and Y are
     *  where you put it, so a stream turned on its side usually wants the
     *  body moved to suit */
    direction?: "right" | "left" | "up" | "down"
    /** 0-10 free stream speed */
    speed?: number
    /** 0-10 vorticity confinement. This is the dial that decides whether
     *  there is a wake at all: at 0 the grid's own diffusion smears the
     *  shear layer flat and the body just carries a steady bubble, and
     *  turning it up is what holds the cores together long enough to
     *  shed. Effectively a Reynolds number */
    swirl?: number
    /** 0-10 grid resolution. The only control that costs frame rate */
    detail?: number
    style?: CSSProperties
}

/* ------------------------------------------------------------- shaders */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

/* Shared by every pass. Unused uniforms are dropped by the compiler and
 * the location map simply comes back without them, so one block can serve
 * all ten programs. */
const COMMON = `
varying vec2 vUv;

uniform vec2  uTexel;      // one velocity cell, in uv
uniform float uAspect;     // frame width, in frame heights
uniform vec2  uObsPos;     // domain units: x measured in heights
uniform float uObsSize;
uniform float uObsOn;      // 0 takes the body out of the frame entirely
uniform vec2  uFlow;       // unit vector the stream runs along, axis-aligned

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

/* --- the frame, described relative to the stream rather than the screen -
 * Every boundary in the solver is one of four things: the edge the stream
 * enters by, the edge it leaves by, and the two it runs between. Naming
 * them that way is what lets the same code run the flow in any of the four
 * directions -- otherwise each one needs its own inlet, its own outlet,
 * its own pair of walls, and four chances to get one of them wrong.
 * uFlow is axis-aligned and unit, so all of this is exact.              */

// Domain coordinates: x in frame heights, y in [0,1]. Cells are square,
// so a distance means the same thing on either axis.
vec2 domainOf(vec2 uv) { return vec2(uv.x * uAspect, uv.y); }

// How far downstream of the inlet edge a point is. Negative outside it,
// which is how a sample off the edge knows it is upstream.
float fromInlet(vec2 uv) {
    return dot(domainOf(uv), uFlow) + dot(max(-uFlow, 0.0), vec2(uAspect, 1.0));
}

// The frame's length along the stream, and the axis and width across it.
float alongSpan()  { return dot(vec2(uAspect, 1.0), abs(uFlow)); }
vec2  acrossAxis() { return vec2(abs(uFlow.y), abs(uFlow.x)); }
float acrossSpan() { return dot(vec2(uAspect, 1.0), acrossAxis()); }
float across(vec2 uv) { return dot(domainOf(uv), acrossAxis()); }

// Domain coordinates, not uv: x is scaled by the aspect so the body stays
// round whatever the frame does, and so the grid's cells stay square.
// Switched off, every cell simply reads as far outside the body, which
// costs one comparison and needs no second code path anywhere else.
float sdObstacle(vec2 uv) {
    if (uObsOn < 0.5) return 1e3;
    return length(vec2(uv.x * uAspect, uv.y) - uObsPos) - uObsSize;
}

bool solid(vec2 uv) { return sdObstacle(uv) < 0.0; }

// How much of this cell the body occupies, smoothed across a cell either
// side of the surface. The smoothing is not cosmetic: a hard in/out test
// stops flow THROUGH the body but lets it slip freely ALONG the body, and
// a surface the flow can slip along makes no vorticity, so the picture
// settles into steady potential flow and no wake ever forms. Dragging the
// cells that straddle the surface is what puts the boundary layer there,
// and the boundary layer is what rolls up.
//
// The grid's cells are square, so one cell is uTexel.y in domain units on
// both axes -- which is the unit sdObstacle answers in.
float solidMask(vec2 uv) {
    return smoothstep(uTexel.y * 1.5, -uTexel.y * 1.5, sdObstacle(uv));
}
`

/** Free stream, plus the noise the instability grows from. */
const SEED_VEL =
    COMMON +
    `
uniform float uInflow;
uniform float uSeed;
void main() {
    vec2 v = uInflow * uFlow;
    v += (vec2(hash21(vUv * 137.0 + uSeed), hash21(vUv * 311.0 - uSeed)) - 0.5)
         * uInflow * ${SEED_NOISE.toFixed(3)};
    v *= 1.0 - solidMask(vUv);
    gl_FragColor = vec4(v, 0.0, 1.0);
}
`

/** The frame opens on clean stripes, which the wake then tears up. */
const SEED_INK =
    COMMON +
    `
uniform float uBands;
uniform float uSoft;
void main() {
    // bands lie across the stream, so Bands means the same count of
    // stripes on the way past whichever way the stream is pointing
    float s = sin((across(vUv) / acrossSpan()) * uBands * 6.28318530718);
    gl_FragColor = vec4(smoothstep(-uSoft, uSoft, s), 0.0, 0.0, 1.0);
}
`

const ADVECT =
    COMMON +
    `
uniform sampler2D uSrc;
uniform sampler2D uVel;
uniform float uDt;
void main() {
    vec2 v = texture2D(uVel, vUv).xy;
    gl_FragColor = texture2D(uSrc, vUv - uDt * v * uTexel);
}
`

const CURL =
    COMMON +
    `
uniform sampler2D uVel;
void main() {
    float l = texture2D(uVel, vUv - vec2(uTexel.x, 0.0)).y;
    float r = texture2D(uVel, vUv + vec2(uTexel.x, 0.0)).y;
    float b = texture2D(uVel, vUv - vec2(0.0, uTexel.y)).x;
    float t = texture2D(uVel, vUv + vec2(0.0, uTexel.y)).x;
    gl_FragColor = vec4(0.5 * ((r - l) - (t - b)), 0.0, 0.0, 1.0);
}
`

/* Everything added to the velocity field rather than solved for: the
 * confinement force, the pointer, the inlet and the walls. */
const FORCES =
    COMMON +
    `
uniform sampler2D uVel;
uniform sampler2D uCurl;
uniform float uDt;
uniform float uSwirl;
uniform float uInflow;
uniform vec2  uPointer;
uniform vec2  uPointerVel;
uniform vec2  uObsVel;

void main() {
    vec2 v = texture2D(uVel, vUv).xy;

    if (uSwirl > 0.0) {
        float l = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
        float r = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
        float b = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
        float t = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
        float c = texture2D(uCurl, vUv).x;
        // |curl| climbs toward a vortex core, so its gradient points at
        // one. Pushing along the perpendicular of that gradient hands the
        // core back the spin interpolation keeps rounding off.
        vec2 n = vec2(abs(r) - abs(l), abs(t) - abs(b)) * 0.5;
        n /= length(n) + 1e-5;
        v += uSwirl * c * vec2(n.y, -n.x) * uDt;
    }

    vec2 d = vec2((vUv.x - uPointer.x) * uAspect, vUv.y - uPointer.y);
    float g = exp(-dot(d, d) / ${(POINTER_RADIUS * POINTER_RADIUS).toFixed(6)});
    v += uPointerVel * g * uDt;

    vec2 stream = uInflow * uFlow;
    float down = fromInlet(vUv);
    float span = alongSpan();

    // The free stream is re-imposed in a band at the inlet. Between that
    // band and the sponge below, nothing is touched: the whole run the
    // wake is read in is left to the solver, so the street has to come
    // out of the flow rather than out of a forcing term.
    v = mix(v, stream, smoothstep(${INLET.toFixed(3)}, 0.0, down) * 0.85);

    // Sponge at the outlet: the last stretch of the run is eased back
    // toward the free stream, so vortices dissolve before they reach the
    // boundary rather than piling into it and shoving the whole street
    // off-centre. It is the cheap stand-in for a domain that keeps going.
    // A fifth of the run, so it takes the same share of the picture
    // whether the stream crosses the frame or climbs it.
    v = mix(v, stream, smoothstep(span * 0.2, 0.0, span - down) * 0.06);

    // Free-slip on the two edges the stream runs between: nothing crosses
    // them, nothing drags on them.
    vec2 ax = acrossAxis();
    float a = across(vUv);
    float wall = smoothstep(1.5 * uTexel.y, 0.0, min(a, acrossSpan() - a));
    v -= ax * dot(v, ax) * wall;

    // The body hands the fluid its own velocity rather than a flat zero.
    // At rest that is the same no-slip condition as before; dragged, it
    // is what makes the body shove what is ahead of it and trail a wake,
    // instead of punching a moving hole the flow slides through.
    v = mix(v, uObsVel, solidMask(vUv));
    gl_FragColor = vec4(v, 0.0, 1.0);
}
`

/* The body needs no mask texture: its cells were zeroed in the pass above,
 * so a neighbour lookup inside it already reads as a wall nothing flows
 * through. */
const DIVERGENCE =
    COMMON +
    `
uniform sampler2D uVel;
uniform float uInflow;
vec2 vAt(vec2 uv) {
    // upstream of the inlet, whichever edge that is
    if (fromInlet(uv) < 0.0) return uInflow * uFlow;
    return texture2D(uVel, clamp(uv, 0.0, 1.0)).xy;
}
void main() {
    float l = vAt(vUv - vec2(uTexel.x, 0.0)).x;
    float r = vAt(vUv + vec2(uTexel.x, 0.0)).x;
    float b = vAt(vUv - vec2(0.0, uTexel.y)).y;
    float t = vAt(vUv + vec2(0.0, uTexel.y)).y;
    float div = 0.5 * ((r - l) + (t - b));
    if (solid(vUv)) div = 0.0;
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`

/* Boundary rules for the Poisson solve, shared by the two passes that read
 * pressure. Everything is Neumann -- a neighbour outside the fluid hands
 * back the cell that asked, so no gradient crosses it -- except the outlet
 * edge, held at zero so the wake has somewhere to leave. */
const PRESSURE_BC = `
uniform sampler2D uPressure;
float pAt(vec2 uv, float c) {
    if (fromInlet(uv) > alongSpan()) return 0.0;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return c;
    if (solid(uv)) return c;
    return texture2D(uPressure, uv).x;
}
`

const JACOBI =
    COMMON +
    PRESSURE_BC +
    `
uniform sampler2D uDiv;
void main() {
    float c = texture2D(uPressure, vUv).x;
    float l = pAt(vUv - vec2(uTexel.x, 0.0), c);
    float r = pAt(vUv + vec2(uTexel.x, 0.0), c);
    float b = pAt(vUv - vec2(0.0, uTexel.y), c);
    float t = pAt(vUv + vec2(0.0, uTexel.y), c);
    float div = texture2D(uDiv, vUv).x;
    gl_FragColor = vec4((l + r + b + t - div) * 0.25, 0.0, 0.0, 1.0);
}
`

const PROJECT =
    COMMON +
    PRESSURE_BC +
    `
uniform sampler2D uVel;
uniform vec2 uObsVel;
void main() {
    vec2 v = texture2D(uVel, vUv).xy;
    float c = texture2D(uPressure, vUv).x;
    float l = pAt(vUv - vec2(uTexel.x, 0.0), c);
    float r = pAt(vUv + vec2(uTexel.x, 0.0), c);
    float b = pAt(vUv - vec2(0.0, uTexel.y), c);
    float t = pAt(vUv + vec2(0.0, uTexel.y), c);
    v -= 0.5 * vec2(r - l, t - b);
    v = mix(v, uObsVel, solidMask(vUv));
    gl_FragColor = vec4(v, 0.0, 1.0);
}
`

/* Ink rides the coarse velocity field on its own finer grid. uTexel is
 * still the velocity cell: the field is measured in cells per second, so
 * the backtrack is the same distance in uv whichever grid reads it. */
const INK =
    COMMON +
    `
uniform sampler2D uSrc;
uniform sampler2D uVel;
uniform float uDt;
uniform float uFade;
uniform float uBands;
uniform float uSoft;
uniform vec2  uPointer;
uniform float uPointerInk;

void main() {
    vec2 v = texture2D(uVel, vUv).xy;
    float d = texture2D(uSrc, vUv - uDt * v * uTexel).x * uFade;

    float band = smoothstep(
        -uSoft, uSoft,
        sin((across(vUv) / acrossSpan()) * uBands * 6.28318530718)
    );
    d = mix(d, band, smoothstep(${INLET.toFixed(3)}, 0.0, fromInlet(vUv)));

    vec2 q = vec2((vUv.x - uPointer.x) * uAspect, vUv.y - uPointer.y);
    d += uPointerInk * exp(-dot(q, q) / ${(POINTER_RADIUS * POINTER_RADIUS).toFixed(6)});

    gl_FragColor = vec4(clamp(d, 0.0, 1.0), 0.0, 0.0, 1.0);
}
`

const RENDER =
    COMMON +
    `
#define RAMP_STOPS ${RAMP_STOPS}
uniform sampler2D uInk;
uniform vec3  uColors[RAMP_STOPS];
uniform int   uCount;
uniform float uContrast;
uniform float uPx;      // one screen pixel, in domain units
uniform float uTime;

vec3 ramp(float t) {
    float span = float(uCount - 1);
    if (span < 0.5) return uColors[0];
    float u = min(clamp(t, 0.0, 1.0) * span, span - 1e-4);
    float i = floor(u);
    float f = u - i;
    // quintic: the second derivative is continuous too, so stop boundaries
    // do not read as creases across a smooth density gradient
    f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    vec3 a = uColors[0], b = uColors[0];
    for (int k = 0; k < RAMP_STOPS; k++) {
        if (float(k) == i)       a = uColors[k];
        if (float(k) == i + 1.0) b = uColors[k];
    }
    return mix(a, b, f);
}

void main() {
    float d = texture2D(uInk, vUv).x;
    // Pivot the contrast about the middle: the stripes arrive at 0 and 1
    // and everything the wake made of them lives in between, so that is
    // the band which has to open up.
    vec3 col = ramp(clamp((d - 0.5) * uContrast + 0.5, 0.0, 1.0));

    // The body is a hole in the ink, lit only at its edge, so the
    // silhouette reads against a pale palette as well as a dark one.
    float sd = sdObstacle(vUv);
    float aa = uPx * 1.5;
    col = mix(col, uColors[0], smoothstep(aa, -aa, sd));
    col = mix(col, ramp(1.0), (1.0 - smoothstep(0.0, aa * 3.0, abs(sd))) * 0.4);

    col += (hash21(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5) * 0.012;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

/* ------------------------------------------------------------- helpers */

let parseCtx: CanvasRenderingContext2D | null | undefined

/** CSS colour string -> normalised rgb triple. */
function toRGB(css: string): [number, number, number] {
    if (!css) return [0, 0, 0]
    const s = css.trim()

    const hex = /^#([0-9a-f]{3,8})$/i.exec(s)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4) {
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        }
        const n = parseInt(h.slice(0, 6), 16)
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }

    const fn = /^rgba?\(([^)]+)\)$/i.exec(s)
    if (fn) {
        const parts = fn[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3)
        const v = parts.map((x) =>
            x.indexOf("%") >= 0 ? parseFloat(x) * 2.55 : parseFloat(x)
        )
        return [(v[0] || 0) / 255, (v[1] || 0) / 255, (v[2] || 0) / 255]
    }

    // named colours, hsl(), oklch() ... let the browser resolve it
    if (typeof document !== "undefined") {
        if (parseCtx === undefined) {
            parseCtx = document.createElement("canvas").getContext("2d")
        }
        if (parseCtx) {
            parseCtx.fillStyle = "#000000"
            parseCtx.fillStyle = s
            const out = parseCtx.fillStyle
            if (typeof out === "string" && out.charAt(0) === "#" && out !== s) {
                return toRGB(out)
            }
        }
    }
    return [0, 0, 0]
}

/** Which way the stream runs, as a unit vector in uv, where y counts up
 *  from the bottom of the frame the way the shaders read it. Axis-aligned
 *  by construction: the solver's boundary maths is exact only for the
 *  four square directions, which is also the only four a stream in a
 *  rectangle has any use for. */
function flowVector(dir: string): [number, number] {
    if (dir === "left") return [-1, 0]
    if (dir === "up") return [0, 1]
    if (dir === "down") return [0, -1]
    return [1, 0]
}

/** Size control -> body radius, in domain units (1 = the frame's height).
 *  One function, so the circle the solver carves and the circle the
 *  pointer has to hit to grab it cannot drift apart. */
function bodyRadius(size: number): number {
    return 0.02 + size * 0.014
}

type GLProgram = {
    prog: WebGLProgram
    uni: Record<string, WebGLUniformLocation | null>
}

type FBO = {
    tex: WebGLTexture
    fbo: WebGLFramebuffer
    w: number
    h: number
}

type Pair = { read: FBO; write: FBO }

/** A colour format this driver will both render to and filter. */
type Fmt = { internal: number; type: number; linear: boolean }

const RGBA16F = 0x881a
const RGBA32F = 0x8814
const HALF_FLOAT = 0x140b

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
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function makeProgram(
    gl: WebGLRenderingContext,
    frag: string,
    prelude: string
): GLProgram | null {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, prelude + frag)
    if (!vs || !fs) return null

    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.bindAttribLocation(prog, 0, "aPos")
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.deleteProgram(prog)
        return null
    }

    // Enumerated rather than listed: ten programs share one uniform block
    // and each keeps only the subset it actually compiled with.
    const uni: Record<string, WebGLUniformLocation | null> = {}
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number
    for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(prog, i)
        if (!info) continue
        const loc = gl.getUniformLocation(prog, info.name)
        uni[info.name] = loc
        uni[info.name.replace(/\[0\]$/, "")] = loc
    }
    return { prog, uni }
}

function makeFBO(
    gl: WebGLRenderingContext,
    w: number,
    h: number,
    fmt: Fmt
): FBO | null {
    const tex = gl.createTexture()
    const fbo = gl.createFramebuffer()
    if (!tex || !fbo) return null

    const filter = fmt.linear ? gl.LINEAR : gl.NEAREST
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        fmt.internal,
        w,
        h,
        0,
        gl.RGBA,
        fmt.type,
        null
    )

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0
    )
    if (
        gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE
    ) {
        gl.deleteTexture(tex)
        gl.deleteFramebuffer(fbo)
        return null
    }

    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return { tex, fbo, w, h }
}

/** Best format this driver will render AND filter. Full float first, for
 *  the pressure solve's sake; half float wherever that is not offered;
 *  unfiltered as a last resort -- the sim still runs, the ink just loses
 *  its bilinear edges. */
function pickFormat(gl: WebGLRenderingContext, gl2: boolean): Fmt | null {
    const tries: Fmt[] = []
    if (gl2) {
        const cbf = gl.getExtension("EXT_color_buffer_float")
        const cbh = gl.getExtension("EXT_color_buffer_half_float")
        const fl = gl.getExtension("OES_texture_float_linear")
        if (cbf && fl)
            tries.push({ internal: RGBA32F, type: gl.FLOAT, linear: true })
        if (cbf || cbh)
            tries.push({ internal: RGBA16F, type: HALF_FLOAT, linear: true })
        if (cbf) tries.push({ internal: RGBA32F, type: gl.FLOAT, linear: false })
    } else {
        const f = gl.getExtension("OES_texture_float")
        const fl = gl.getExtension("OES_texture_float_linear")
        const hf = gl.getExtension("OES_texture_half_float") as {
            HALF_FLOAT_OES: number
        } | null
        const hfl = gl.getExtension("OES_texture_half_float_linear")
        if (f && fl)
            tries.push({ internal: gl.RGBA, type: gl.FLOAT, linear: true })
        if (hf && hfl)
            tries.push({
                internal: gl.RGBA,
                type: hf.HALF_FLOAT_OES,
                linear: true,
            })
        if (hf)
            tries.push({
                internal: gl.RGBA,
                type: hf.HALF_FLOAT_OES,
                linear: false,
            })
        if (f) tries.push({ internal: gl.RGBA, type: gl.FLOAT, linear: false })
    }

    for (const fmt of tries) {
        const probe = makeFBO(gl, 4, 4, fmt)
        if (probe) {
            gl.deleteTexture(probe.tex)
            gl.deleteFramebuffer(probe.fbo)
            return fmt
        }
    }
    return null
}

/* ----------------------------------------------------------- component */

export default function InkWake({
    colors = DEFAULTS.colors,
    background = DEFAULTS.background,
    obstacle,
    ink,
    drag = DEFAULTS.drag,
    strength = DEFAULTS.strength,
    direction = DEFAULTS.direction as InkWakeProps["direction"],
    speed = DEFAULTS.speed,
    swirl = DEFAULTS.swirl,
    detail = DEFAULTS.detail,
    style,
}: InkWakeProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [failed, setFailed] = useState(false)

    // Grouped controls arrive as partial objects, so each is merged over
    // the same constant the panel's defaultValue points at.
    const cfg = {
        colors,
        background,
        obstacle: { ...DEFAULT_OBSTACLE, ...obstacle },
        ink: { ...DEFAULT_INK, ...ink },
        drag,
        strength,
        direction,
        speed,
        swirl,
        detail,
    }

    // Live prop mirror. The solver reads from here, so tweaking a control
    // never tears down the GL context or restarts the wake.
    const propsRef = useRef(cfg)
    propsRef.current = cfg

    // Written by the pointer handlers, drained by the next step.
    const pointerRef = useRef({ x: -1, y: -1, dx: 0, dy: 0, live: false })

    // Where the body actually is, in the same units the two controls use.
    // A drag owns it from then on, because a property control is a one-way
    // street -- the component cannot write a new X back into the panel. So
    // the props seed it and keep the right to take it back: touch either
    // control and the body returns to where the panel says it is.
    // mx/my carry the distance it moved this frame, in domain units.
    const bodyRef = useRef({
        x: cfg.obstacle.x,
        y: cfg.obstacle.y,
        mx: 0,
        my: 0,
        held: false,
        from: { x: cfg.obstacle.x, y: cfg.obstacle.y },
    })
    if (
        bodyRef.current.from.x !== cfg.obstacle.x ||
        bodyRef.current.from.y !== cfg.obstacle.y
    ) {
        bodyRef.current.x = cfg.obstacle.x
        bodyRef.current.y = cfg.obstacle.y
        bodyRef.current.from = { x: cfg.obstacle.x, y: cfg.obstacle.y }
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        let disposed = false
        let raf = 0
        let gl: WebGLRenderingContext | null = null
        let fmt: Fmt | null = null

        let progs: Record<string, GLProgram> = {}
        let buffer: WebGLBuffer | null = null

        let vel: Pair | null = null
        let dye: Pair | null = null
        let pressure: Pair | null = null
        let divergence: FBO | null = null
        let curl: FBO | null = null

        let gridW = 0
        let gridH = 0
        let aspect = 1
        let builtDir = ""

        let onScreen = true
        let pageVisible = true
        let reduceMotion = false

        let elapsed = 0
        let acc = 0
        let lastNow = 0

        const colorBuf = new Float32Array(RAMP_STOPS * 3)

        /* ------------------------------------------------ gl scaffolding */

        function use(p: GLProgram) {
            gl!.useProgram(p.prog)
        }
        function u1f(p: GLProgram, n: string, v: number) {
            const l = p.uni[n]
            if (l) gl!.uniform1f(l, v)
        }
        function u2f(p: GLProgram, n: string, a: number, b: number) {
            const l = p.uni[n]
            if (l) gl!.uniform2f(l, a, b)
        }
        function bindTex(
            p: GLProgram,
            n: string,
            t: WebGLTexture,
            unit: number
        ) {
            const l = p.uni[n]
            if (!l) return
            gl!.activeTexture(gl!.TEXTURE0 + unit)
            gl!.bindTexture(gl!.TEXTURE_2D, t)
            gl!.uniform1i(l, unit)
        }

        /** Uniforms every pass shares: the grid it reads, and the body the
         *  flow has to get around. */
        function common(p: GLProgram) {
            const o = propsRef.current.obstacle
            const b = bodyRef.current
            u2f(p, "uTexel", 1 / gridW, 1 / gridH)
            u1f(p, "uAspect", aspect)
            // the panel reads top-down, uv counts up from the bottom
            u2f(p, "uObsPos", (b.x / 100) * aspect, 1 - b.y / 100)
            u1f(p, "uObsSize", bodyRadius(o.size))
            u1f(p, "uObsOn", o.show ? 1 : 0)
            const f = flowVector(propsRef.current.direction)
            u2f(p, "uFlow", f[0], f[1])
        }

        function blit(target: FBO | null) {
            if (target) {
                gl!.bindFramebuffer(gl!.FRAMEBUFFER, target.fbo)
                gl!.viewport(0, 0, target.w, target.h)
            } else {
                gl!.bindFramebuffer(gl!.FRAMEBUFFER, null)
                gl!.viewport(0, 0, canvas.width, canvas.height)
            }
            gl!.drawArrays(gl!.TRIANGLES, 0, 3)
        }

        function swap(p: Pair) {
            const t = p.read
            p.read = p.write
            p.write = t
        }

        function dropFBO(f: FBO | null) {
            if (!f || !gl) return
            gl.deleteTexture(f.tex)
            gl.deleteFramebuffer(f.fbo)
        }

        function dropGrids() {
            for (const p of [vel, dye, pressure]) {
                if (p) {
                    dropFBO(p.read)
                    dropFBO(p.write)
                }
            }
            dropFBO(divergence)
            dropFBO(curl)
            vel = dye = pressure = null
            divergence = curl = null
        }

        /* -------------------------------------------------------- setup */

        function init(): boolean {
            const opts = {
                alpha: false,
                antialias: false,
                depth: false,
                stencil: false,
                preserveDrawingBuffer: false,
                powerPreference: "high-performance" as const,
            }
            // WebGL2 is asked for first purely for its float render
            // targets; the shaders stay GLSL ES 1.00 so one set serves
            // both, which is why the context is narrowed to the 1.0 type.
            let gl2 = true
            let ctx = canvas.getContext(
                "webgl2",
                opts
            ) as unknown as WebGLRenderingContext | null
            if (!ctx) {
                gl2 = false
                ctx =
                    (canvas.getContext(
                        "webgl",
                        opts
                    ) as WebGLRenderingContext | null) ||
                    (canvas.getContext(
                        "experimental-webgl"
                    ) as WebGLRenderingContext | null)
            }
            if (!ctx) return false
            gl = ctx

            fmt = pickFormat(gl, gl2)
            if (!fmt) return false

            const hp = gl.getShaderPrecisionFormat(
                gl.FRAGMENT_SHADER,
                gl.HIGH_FLOAT
            )
            // The pressure solve accumulates over two dozen sweeps; at
            // mediump the wake visibly steps.
            const prelude =
                "precision " +
                (hp && hp.precision > 0 ? "highp" : "mediump") +
                " float;\n"

            const sources: Record<string, string> = {
                seedVel: SEED_VEL,
                seedInk: SEED_INK,
                advect: ADVECT,
                curl: CURL,
                forces: FORCES,
                divergence: DIVERGENCE,
                jacobi: JACOBI,
                project: PROJECT,
                ink: INK,
                render: RENDER,
            }
            progs = {}
            for (const key in sources) {
                const p = makeProgram(gl, sources[key], prelude)
                if (!p) return false
                progs[key] = p
            }

            buffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([-1, -1, 3, -1, -1, 3]),
                gl.STATIC_DRAW
            )
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
            gl.disable(gl.BLEND)
            gl.disable(gl.DEPTH_TEST)
            return true
        }

        /** (Re)allocate both grids and start the flow off. */
        function build(w: number, h: number) {
            if (!gl || !fmt) return
            dropGrids()
            gridW = w
            gridH = h
            aspect = w / h
            builtDir = propsRef.current.direction

            const mk = (gw: number, gh: number) => makeFBO(gl!, gw, gh, fmt!)
            const iw = Math.min(1024, w * INK_SCALE)
            const ih = Math.min(576, h * INK_SCALE)
            const va = mk(w, h)
            const vb = mk(w, h)
            const ia = mk(iw, ih)
            const ib = mk(iw, ih)
            const pa = mk(w, h)
            const pb = mk(w, h)
            divergence = mk(w, h)
            curl = mk(w, h)
            if (!va || !vb || !ia || !ib || !pa || !pb || !divergence || !curl) {
                setFailed(true)
                return
            }
            vel = { read: va, write: vb }
            dye = { read: ia, write: ib }
            pressure = { read: pa, write: pb }

            const p = propsRef.current
            const inflow = p.speed * 0.06 * gridH

            use(progs.seedVel)
            common(progs.seedVel)
            u1f(progs.seedVel, "uInflow", inflow)
            u1f(progs.seedVel, "uSeed", Math.random() * 100)
            blit(vel.read)

            use(progs.seedInk)
            common(progs.seedInk)
            u1f(progs.seedInk, "uBands", p.ink.bands)
            u1f(progs.seedInk, "uSoft", 0.02 + p.ink.softness * 0.09)
            blit(dye.read)

            // A still frame is worth nothing empty, so when motion is not
            // wanted the wake is developed once here and then held.
            if (reduceMotion) {
                for (let i = 0; i < STILL_WARMUP; i++) step(STEP)
            }
        }

        /* --------------------------------------------------------- step */

        function step(dt: number) {
            if (!gl || !vel || !dye || !pressure || !divergence || !curl) return
            const p = propsRef.current
            // Speed is a domain rate -- frame heights per second -- so
            // changing Detail re-solves the same flow, not a faster one.
            const inflow = p.speed * 0.06 * gridH
            const ptr = pointerRef.current
            const body = bodyRef.current
            const gain = p.drag && ptr.live ? p.strength * 0.6 : 0
            const moved = Math.sqrt(ptr.dx * ptr.dx + ptr.dy * ptr.dy)
            // The body moved this far this frame; the solver wants a rate,
            // in the cells per second the rest of the field is measured in.
            const obsVX = (body.mx * gridH) / dt
            const obsVY = (body.my * gridH) / dt

            // advect velocity through itself
            use(progs.advect)
            common(progs.advect)
            u1f(progs.advect, "uDt", dt)
            bindTex(progs.advect, "uSrc", vel.read.tex, 0)
            bindTex(progs.advect, "uVel", vel.read.tex, 1)
            blit(vel.write)
            swap(vel)

            if (p.swirl > 0) {
                use(progs.curl)
                common(progs.curl)
                bindTex(progs.curl, "uVel", vel.read.tex, 0)
                blit(curl)
            }

            use(progs.forces)
            common(progs.forces)
            u1f(progs.forces, "uDt", dt)
            u1f(progs.forces, "uSwirl", p.swirl * 0.8)
            u1f(progs.forces, "uInflow", inflow)
            u2f(progs.forces, "uPointer", ptr.x, ptr.y)
            // The splat is one frame's worth of travel; dividing by dt
            // undoes the shader's own multiply, so a flick lands the same
            // push however long that frame happened to be.
            u2f(
                progs.forces,
                "uPointerVel",
                (ptr.dx * gridH * gain) / dt,
                (ptr.dy * gridH * gain) / dt
            )
            u2f(progs.forces, "uObsVel", obsVX, obsVY)
            bindTex(progs.forces, "uVel", vel.read.tex, 0)
            bindTex(progs.forces, "uCurl", curl.tex, 1)
            blit(vel.write)
            swap(vel)

            use(progs.divergence)
            common(progs.divergence)
            u1f(progs.divergence, "uInflow", inflow)
            bindTex(progs.divergence, "uVel", vel.read.tex, 0)
            blit(divergence)

            // Pressure is not cleared between steps: last step's answer is
            // this step's first guess, and the wake moves slowly enough
            // that the sweeps start most of the way home.
            use(progs.jacobi)
            common(progs.jacobi)
            bindTex(progs.jacobi, "uDiv", divergence.tex, 1)
            for (let i = 0; i < PRESSURE_ITERS; i++) {
                bindTex(progs.jacobi, "uPressure", pressure.read.tex, 0)
                blit(pressure.write)
                swap(pressure)
            }

            use(progs.project)
            common(progs.project)
            u2f(progs.project, "uObsVel", obsVX, obsVY)
            bindTex(progs.project, "uPressure", pressure.read.tex, 0)
            bindTex(progs.project, "uVel", vel.read.tex, 1)
            blit(vel.write)
            swap(vel)

            use(progs.ink)
            common(progs.ink)
            u1f(progs.ink, "uDt", dt)
            u1f(progs.ink, "uFade", Math.exp(-p.ink.fade * 0.05 * dt))
            u1f(progs.ink, "uBands", p.ink.bands)
            u1f(progs.ink, "uSoft", 0.02 + p.ink.softness * 0.09)
            u2f(progs.ink, "uPointer", ptr.x, ptr.y)
            u1f(
                progs.ink,
                "uPointerInk",
                gain > 0 ? Math.min(1, moved * 20) * 0.5 : 0
            )
            bindTex(progs.ink, "uSrc", dye.read.tex, 0)
            bindTex(progs.ink, "uVel", vel.read.tex, 1)
            blit(dye.write)
            swap(dye)

            // one frame's travel, pointer and body alike, spent
            ptr.dx = 0
            ptr.dy = 0
            body.mx = 0
            body.my = 0
        }

        /* ------------------------------------------------------- render */

        function render() {
            if (!gl || !dye) return
            const p = propsRef.current

            const list = (
                p.colors && p.colors.length ? p.colors : DEFAULTS.colors
            ).slice(0, MAX_STOPS)
            // Background is stop 0, so thin ink fades into the empty field
            // rather than into a second dark colour chosen for it.
            const bg = toRGB(p.background)
            colorBuf.fill(0)
            colorBuf[0] = bg[0]
            colorBuf[1] = bg[1]
            colorBuf[2] = bg[2]
            for (let i = 0; i < list.length; i++) {
                const c = toRGB(list[i])
                colorBuf[(i + 1) * 3] = c[0]
                colorBuf[(i + 1) * 3 + 1] = c[1]
                colorBuf[(i + 1) * 3 + 2] = c[2]
            }

            const r = progs.render
            use(r)
            common(r)
            bindTex(r, "uInk", dye.read.tex, 0)
            const cols = r.uni["uColors"]
            if (cols) gl.uniform3fv(cols, colorBuf)
            const count = r.uni["uCount"]
            if (count) gl.uniform1i(count, list.length + 1)
            u1f(r, "uContrast", Math.pow(2, (p.ink.contrast - 5) / 2.5))
            u1f(r, "uPx", 1 / Math.max(1, canvas.height))
            u1f(r, "uTime", elapsed)
            blit(null)
        }

        /* ------------------------------------------------------- resize */

        function resize() {
            if (!gl) return
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const cw = Math.max(1, Math.round(host.clientWidth * dpr))
            const ch = Math.max(1, Math.round(host.clientHeight * dpr))
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw
                canvas.height = ch
            }

            const p = propsRef.current
            const base = Math.round(96 + p.detail * 16)
            const w = Math.max(16, Math.min(1024, Math.round((base * cw) / ch)))
            // Rebuilding wipes the wake, so it is worth doing only when the
            // grid is meaningfully wrong. A few percent of aspect error is
            // a few percent of stretch, which nobody can see; a resize drag
            // that restarted the flow every frame is a thing anybody can.
            const off =
                gridH !== base ||
                Math.abs(w - gridW) / Math.max(1, gridW) > 0.04
            // A new direction is worth the wipe: turning the whole field
            // around in place would spend several seconds as a mess that
            // is neither the old flow nor the new one.
            if (off || p.direction !== builtDir) build(w, base)
        }

        /* --------------------------------------------------------- loop */

        function loop(now: number) {
            if (disposed) return
            raf = requestAnimationFrame(loop)
            if (!onScreen || !pageVisible) {
                lastNow = now
                return
            }
            const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.25) : 0
            lastNow = now
            resize()

            if (!reduceMotion) {
                // the clock drives the dither too, so it is held as well:
                // a still frame that fizzes is not a still frame
                elapsed += dt
                acc += dt
                let n = 0
                while (acc >= STEP && n < MAX_SUBSTEPS) {
                    step(STEP)
                    acc -= STEP
                    n++
                }
                // a tab that fell behind catches up by dropping time, not
                // by spending a minute of frames replaying it
                if (acc > STEP * MAX_SUBSTEPS) acc = 0
            }
            render()
        }

        /* ---------------------------------------------------- listeners */

        if (!init()) {
            setFailed(true)
            return
        }

        const ro =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => resize())
                : null
        if (ro) ro.observe(host)

        const io =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(
                      (entries) => {
                          onScreen = entries.some((e) => e.isIntersecting)
                      },
                      { rootMargin: "128px" }
                  )
                : null
        if (io) io.observe(host)

        const onVisibility = () => {
            pageVisible = document.visibilityState !== "hidden"
        }
        document.addEventListener("visibilitychange", onVisibility)

        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        reduceMotion = mq.matches
        const onMQ = (e: MediaQueryListEvent) => {
            reduceMotion = e.matches
            // rebuild, so the new mode gets the frame it wants: developed
            // and held, or empty and running
            gridW = 0
            gridH = 0
            resize()
        }
        if (mq.addEventListener) mq.addEventListener("change", onMQ)
        else mq.addListener(onMQ)

        const onLost = (e: Event) => {
            e.preventDefault()
            cancelAnimationFrame(raf)
        }
        const onRestored = () => {
            if (disposed) return
            lastNow = 0
            gridW = 0
            gridH = 0
            if (init()) {
                resize()
                raf = requestAnimationFrame(loop)
            } else setFailed(true)
        }
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        resize()
        raf = requestAnimationFrame(loop)

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            if (ro) ro.disconnect()
            if (io) io.disconnect()
            document.removeEventListener("visibilitychange", onVisibility)
            if (mq.removeEventListener) mq.removeEventListener("change", onMQ)
            else mq.removeListener(onMQ)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            if (gl) {
                dropGrids()
                if (buffer) gl.deleteBuffer(buffer)
                for (const k in progs) gl.deleteProgram(progs[k].prog)
                const lose = gl.getExtension("WEBGL_lose_context")
                if (lose) lose.loseContext()
            }
        }
    }, [])

    /* ------------------------------------------------------ interaction */

    /** Is the pointer on the body? Domain units, where x is measured in
     *  frame heights just as the shader measures it. The margin is a grab
     *  handle: a small body is otherwise a target you have to aim at. */
    const overBody = (
        e: ReactPointerEvent<HTMLDivElement>,
        rect: DOMRect
    ): boolean => {
        if (!cfg.obstacle.show) return false
        const b = bodyRef.current
        const aspect = rect.width / rect.height
        const px = (e.clientX - rect.left) / rect.height
        const py = 1 - (e.clientY - rect.top) / rect.height
        const dx = px - (b.x / 100) * aspect
        const dy = py - (1 - b.y / 100)
        return (
            Math.sqrt(dx * dx + dy * dy) <
            bodyRadius(cfg.obstacle.size) + 0.02
        )
    }

    const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!cfg.drag) return
        const rect = e.currentTarget.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        if (overBody(e, rect)) {
            bodyRef.current.held = true
            // capture, so a drag that outruns the frame keeps the body
            // rather than dropping it at the edge
            try {
                e.currentTarget.setPointerCapture(e.pointerId)
            } catch {}
        }
        onPointer(e)
    }

    const onPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!cfg.drag) {
            // nothing here answers the pointer, so it should not be
            // advertising a grab it will not honour
            e.currentTarget.style.cursor = ""
            return
        }
        const rect = e.currentTarget.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        const aspect = rect.width / rect.height
        const x = (e.clientX - rect.left) / rect.width
        // uv counts up from the bottom; the page does not
        const y = 1 - (e.clientY - rect.top) / rect.height
        const p = pointerRef.current
        const b = bodyRef.current
        const dx = p.live ? x - p.x : 0
        const dy = p.live ? y - p.y : 0
        p.x = x
        p.y = y
        p.live = true

        e.currentTarget.style.cursor = b.held
            ? "grabbing"
            : overBody(e, rect)
              ? "grab"
              : ""

        if (b.held) {
            // The body follows the pointer exactly. Kept off the frame's
            // edges: sat in the inlet band it would spend every step
            // fighting the free stream being written back in.
            const nx = Math.min(94, Math.max(6, b.x + dx * 100))
            const ny = Math.min(96, Math.max(4, b.y - dy * 100))
            // What the solver is handed is the distance the body really
            // moved, not the distance the pointer asked for -- pinned
            // against a limit it should stop pushing, not go on shoving
            // the fluid from a standstill.
            b.mx += ((nx - b.x) / 100) * aspect
            b.my -= (ny - b.y) / 100
            b.x = nx
            b.y = ny
            // a held body swallows the stroke: dragging it is not also
            // meant to smear ink across half the frame
            return
        }

        p.dx += dx
        p.dy += dy
    }

    const onRelease = (e: ReactPointerEvent<HTMLDivElement>) => {
        const b = bodyRef.current
        if (!b.held) return
        b.held = false
        b.mx = 0
        b.my = 0
        try {
            e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {}
    }

    const onLeave = (e: ReactPointerEvent<HTMLDivElement>) => {
        const p = pointerRef.current
        p.live = false
        p.dx = 0
        p.dy = 0
        // a pointer that left with nothing held down is not still dragging,
        // whatever the capture thinks
        if (e.buttons === 0) onRelease(e)
    }

    // No WebGL at all: the palette laid out the way the flow would have
    // been -- dense ink entering at the left, thinning downstream.
    const fallback: CSSProperties = failed
        ? {
              background:
                  "linear-gradient(90deg, " +
                  cfg.colors.slice().reverse().join(", ") +
                  ", " +
                  cfg.background +
                  ")",
          }
        : {}

    return (
        <div
            ref={hostRef}
            onPointerMove={onPointer}
            onPointerDown={onPointerDown}
            onPointerUp={onRelease}
            onPointerCancel={onRelease}
            onPointerLeave={onLeave}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: cfg.background,
                touchAction: "none",
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
                    ...fallback,
                }}
            />
        </div>
    )
}
