"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"

/* ------------------------------------------------------------------ *
 *  NebulaDrift
 *  A port of haxiomic's GPU-Fluid-Experiments, kept faithful to the
 *  original rather than merely inspired by it.
 *
 *  WHAT IS TAKEN VERBATIM
 *    The solver and every shader that makes the picture, transcribed from
 *    Source/shaders/glsl and Source/Main.hx:
 *
 *      advect                 semi-Lagrangian, tracing back through the
 *                             velocity field and hand-bilerping the
 *                             result -- which is why every texture here
 *                             is NEAREST and nothing needs a filtering
 *                             extension to be correct
 *      mouse force            v *= 0.999, then the pointer's own velocity
 *                             blended in along the segment it travelled
 *      divergence / pressure  Jacobi, alpha = -dx^2, rBeta = .25, with
 *      / gradient subtract    Neumann pressure and free-slip velocity
 *                             boundaries done by mirrored sampling
 *      mouse dye              a per-channel decay -- .9797 red, .9494
 *                             green, .9696 blue -- and a stroke painted
 *                             along the same segment, then advected by
 *                             the fluid like anything else
 *      particle step          v += (flow - v) * drag; p += dt * v
 *      particle colour        mix(slow, fast, clamp(speed * 4)) plus a
 *                             glint of speed cubed
 *
 *    There is deliberately NO vorticity confinement, NO ambient noise
 *    field and NO trail buffer. The original has none of them, and each
 *    one would change what the picture is.
 *
 *  WHY IT LOOKS THE WAY IT DOES
 *    Nothing draws the velocity field, and nothing remembers the last
 *    frame. Three hundred thousand particles are drawn as single pixels,
 *    additively, and cleared away every frame; what you see is where the
 *    crowd is *now*. The filaments are density -- particles squeezed onto
 *    the same streamline -- and the colour is each particle's own speed.
 *    The soft glow through it is the dye, a separate field the pointer
 *    paints into and the fluid then carries around.
 *
 *    Everything is in clip space, [-1,1] on both axes, exactly as the
 *    original stores it. "Sim space" is that with x stretched by the
 *    aspect ratio, so a circle stays round; the grid is a fraction of the
 *    frame (Detail) and the cell size is fixed at 32.
 *
 *  WHAT IS OURS, AND WHY
 *    - Idle Stir. The original is dead still until you press and drag --
 *      fine for a demo you arrived at to play with, useless as a section
 *      of a landing page. So a synthetic pointer draws a stroke every
 *      couple of seconds through the same force and dye shaders the real
 *      one uses: not different physics, just an input. Turn it off for
 *      the original's own behaviour, and a real pointer always wins.
 *    - Hover, not click and drag. The original pushes the fluid only
 *      while the mouse button is held. Nobody holds a button down on a
 *      landing page, so the pointer here pushes whenever it is over the
 *      frame and moving: the shaders are untouched, isMouseDown is
 *      simply fed "the pointer is here and moving" in place of "the
 *      button is down". A pointer standing still paints nothing anyway
 *      -- the force goes as its velocity -- and after HOVER_HOLD of that
 *      the stir takes the frame back rather than leaving it frozen
 *      under a resting cursor.
 *    - Decay per second, not per frame. The original's .9797 and .999 are
 *      applied once a frame, so its dye fades two and a half times faster
 *      on a 144Hz panel than the author tuned it on. Here they are raised
 *      to the power of dt*60, which is exactly the original at 60fps and
 *      the same picture everywhere else.
 *    - Point size scales with device pixel ratio. The original's 1.0 is
 *      one hardware pixel on a display that had one pixel per point; on a
 *      retina screen that same 1.0 covers a quarter of the area and the
 *      crowd goes thin. Size 1 here means one device-independent pixel.
 *    - Property controls, and a palette in place of the hardcoded
 *      constants -- defaulting to exactly those constants.
 *
 *  NO TRANSITION CONTROL
 *    Nothing here is a framer-motion animation, so there is no curve to
 *    hand a Transition to. The motion is the solver's.
 * ------------------------------------------------------------------ */

/* ----------------------------------------------------------- defaults */

/** The original's particle palette, transcribed from ColorParticleMotion:
 *      slow  vec3(40.4, 0.0, 35.0) / 300.0
 *      fast  vec3(0.2, 47.8, 100.0) / 100.0
 *      glint vec3(63.1, 92.5, 100.0) / 100.0   (at a tenth strength) */
const DEFAULT_COLORS = {
    slow: "#22001D",
    fast: "#017AFF",
    glint: "#A1ECFF",
}

const DEFAULT_PARTICLES = {
    count: 7,
    size: 1,
    inertia: 0,
}

const DEFAULT_DYE = {
    show: true,
    fade: 5,
}

const DEFAULTS = {
    colors: DEFAULT_COLORS,
    background: "#000000",
    particles: DEFAULT_PARTICLES,
    dye: DEFAULT_DYE,
    strength: 5,
    stir: true,
    iterations: 18,
    detail: 5,
}

/* Fixed choices, deliberately not exposed as controls. */

/** `cellScale` in Main.hx: the grid's cell size in simulation units. It
 *  sets the scale of everything the solver does -- how far advection
 *  travels, the pressure solve's alpha, and how a pointer velocity
 *  becomes a fluid velocity -- so it is the one number in here that is
 *  not a taste. */
const CELL_SIZE = 32
/** Per-frame-at-60fps decay of the dye, per channel. Green goes fastest,
 *  which is why an old stroke drifts from cyan towards magenta as it
 *  fades. That drift is the look, not something to even out. */
const DYE_DECAY: [number, number, number] = [0.9797, 0.9494, 0.9696]
/** Per-frame-at-60fps decay of the velocity field. */
const VELOCITY_DECAY = 0.999
/** The glint's share of the particle colour: `x*x*x * .1`. */
const GLINT_SCALE = 0.1
/** The dye is painted in the same two colours as the particles, brighter.
 *  The original's dye constants are its particle constants times these,
 *  to within a percent on red and blue -- so one palette drives both, the
 *  way it does in the original. The bright end lands well above 1: the
 *  dye field is float, and only the screen clamps it. */
const DYE_HIGH_SCALE = 3.34
const DYE_LOW_SCALE = 0.6
/** Particle texture side at Count 0 and Count 10: 128^2 = 16,384 through
 *  1024^2 = 1,048,576, the original's UltraLow and UltraHigh. */
const PARTICLE_EXP_MIN = 7
const PARTICLE_EXP_MAX = 10
/** Grid resolution as a fraction of the frame at Detail 0 and Detail 10:
 *  the original's 1/6 through 1/2. Interpolated as the divisor rather
 *  than the fraction, which is what puts the original's Medium -- a
 *  quarter -- at the middle of the slider instead of a third. */
const FLUID_DIVISOR_MAX = 6
const FLUID_DIVISOR_MIN = 2
const GRID_MAX = 1024
const DPR_CAP = 2
/** Idle Stir: a stroke lasts this long, then the frame waits, then it
 *  draws another one from somewhere else. Fast enough that the dye lights
 *  up -- its colour goes as the pointer's speed squared -- and spaced far
 *  enough apart that the fluid gets to carry the last one around before
 *  the next arrives. */
const STIR_STROKE = 0.55
const STIR_PAUSE_MIN = 0.9
const STIR_PAUSE_MAX = 2.2
/** How long after its last move a pointer still counts as hovering, in
 *  ms. Long enough to bridge the gaps between moves on a slow drift
 *  across the frame, short enough that a cursor parked on the section
 *  hands it back to the stir. */
const HOVER_HOLD = 400
/** The clock the frame loop runs on: requestAnimationFrame hands it a
 *  performance.now() timestamp, so the pointer's has to come from the
 *  same one for the two to be comparable. */
const nowMs = () =>
    typeof performance !== "undefined" ? performance.now() : Date.now()
/** Fixed timestep for the frames run before the first painted one, how
 *  many of those there are, and how many the held frame gets instead.
 *  The original opens on a still, empty field because you arrived at it
 *  to drag it; a component is scrolled past, so it opens a couple of
 *  strokes in and already moving. Only when the stir is on -- switch it
 *  off and the frame starts exactly as the original's does, waiting. */
const STEP = 1 / 60
const WARMUP = 240
const STILL_WARMUP = 260

/* -------------------------------------------------------------- types */

export interface NebulaDriftColors {
    /** A particle that is barely moving. The original's dark plum */
    slow?: string
    /** A particle at full speed, and the bright end of the dye */
    fast?: string
    /** Added on top of the fastest particles only, at a tenth strength */
    glint?: string
}

export interface NebulaDriftParticles {
    /** 0-10 how many, mapped to a square texture: 16k at 0, a million at
     *  10, which are the original's own extremes */
    count?: number
    /** Point size in device-independent pixels. The original draws 1 */
    size?: number
    /** 0-10 how long a particle takes to pick up the flow it is in. 0 is
     *  the original: no inertia at all, every particle simply is the
     *  velocity field where it stands. Higher slides the crowd behind the
     *  fluid and smears the filaments */
    inertia?: number
}

export interface NebulaDriftDye {
    /** The glow the pointer paints. Off leaves only the particles --
     *  the original's `D` key */
    show?: boolean
    /** 0-10 how fast it burns off, 5 being the original's rate. The three
     *  channels keep the original's ratio, so a fading stroke still
     *  drifts from cyan towards magenta */
    fade?: number
}

export interface NebulaDriftProps {
    colors?: NebulaDriftColors
    background?: string
    particles?: NebulaDriftParticles
    dye?: NebulaDriftDye
    /** 0-10 how hard the pointer shoves as it passes over the frame, 5
     *  being the original's force. The pointer pushes on hover; the
     *  original pushed only while the mouse button was held */
    strength?: number
    /** Draw a stroke now and then with a synthetic pointer, so the frame
     *  is alive before anyone touches it. Off is the original, which sits
     *  perfectly still until a pointer moves over it. A real pointer
     *  always takes over */
    stir?: boolean
    /** Jacobi sweeps of the pressure solve. The original's own control,
     *  with its own range and its own default */
    iterations?: number
    /** 0-10 grid resolution as a fraction of the frame, from the
     *  original's 1/6 to its 1/2. The only control that costs frame rate
     *  on the solver's side; Count is the one that costs it on the
     *  drawing side */
    detail?: number
    style?: CSSProperties
}

/* ------------------------------------------------------------- shaders *
 *  Everything in this section is the original's GLSL, transcribed. The
 *  only edits are the hardcoded colours becoming uniforms, the decays
 *  arriving as a rate rather than a constant, and `isMouseDown` becoming
 *  a float because a bool uniform is one more thing to get wrong.       */

/** Source/shaders/glsl/fluid/texel-space.vert */
const FLUID_VERT = `
attribute vec2 vertexPosition;

uniform float aspectRatio;

varying vec2 texelCoord;

/* Simulation position: clip space where the aspect ratio is maintained
   and the height is fixed at 1 */
varying vec2 p;

void main() {
    texelCoord = vertexPosition;
    vec2 clipSpace = 2.0 * texelCoord - 1.0;
    p = vec2(clipSpace.x * aspectRatio, clipSpace.y);
    gl_Position = vec4(clipSpace, 0.0, 1.0);
}
`

/** Source/shaders/glsl/no-transform.vert */
const PLANE_VERT = `
attribute vec2 vertexPosition;
varying vec2 texelCoord;

void main() {
    texelCoord = vertexPosition;
    gl_Position = vec4(vertexPosition * 2.0 - vec2(1.0, 1.0), 0.0, 1.0);
}
`

/** Source/shaders/glsl/fluid/fluid-base.frag */
const FLUID_BASE = `
#define PRESSURE_BOUNDARY
#define VELOCITY_BOUNDARY

uniform vec2 invresolution;
uniform float aspectRatio;

varying vec2 texelCoord;
varying vec2 p;

vec2 clipToSimSpace(vec2 clipSpace){
    return vec2(clipSpace.x * aspectRatio, clipSpace.y);
}

vec2 simToTexelSpace(vec2 simSpace){
    return vec2(simSpace.x / aspectRatio + 1.0, simSpace.y + 1.0) * .5;
}

// sampling pressure texture factoring in boundary conditions
float samplePressue(sampler2D pressure, vec2 coord){
    vec2 cellOffset = vec2(0.0, 0.0);

    // pure Neumann boundary conditions: 0 pressure gradient across the
    // boundary, dP/dx = 0
    #ifdef PRESSURE_BOUNDARY
    if(coord.x < 0.0)      cellOffset.x = 1.0;
    else if(coord.x > 1.0) cellOffset.x = -1.0;
    if(coord.y < 0.0)      cellOffset.y = 1.0;
    else if(coord.y > 1.0) cellOffset.y = -1.0;
    #endif

    return texture2D(pressure, coord + cellOffset * invresolution).x;
}

// sampling velocity texture factoring in boundary conditions
vec2 sampleVelocity(sampler2D velocity, vec2 coord){
    vec2 cellOffset = vec2(0.0, 0.0);
    vec2 multiplier = vec2(1.0, 1.0);

    // free-slip boundary: the average flow across the boundary is
    // restricted to 0
    #ifdef VELOCITY_BOUNDARY
    if(coord.x < 0.0){
        cellOffset.x = 1.0;
        multiplier.x = -1.0;
    }else if(coord.x > 1.0){
        cellOffset.x = -1.0;
        multiplier.x = -1.0;
    }
    if(coord.y < 0.0){
        cellOffset.y = 1.0;
        multiplier.y = -1.0;
    }else if(coord.y > 1.0){
        cellOffset.y = -1.0;
        multiplier.y = -1.0;
    }
    #endif

    return multiplier * texture2D(velocity, coord + cellOffset * invresolution).xy;
}
`

/** Source/shaders/glsl/geom.glsl */
const GEOM = `
float distanceToSegment(vec2 a, vec2 b, vec2 p, out float fp){
    vec2 d = p - a;
    vec2 x = b - a;

    fp = 0.0; // fractional projection, 0 - 1 in the length of vec2(b - a)
    float lx = length(x);

    if(lx <= 0.0001) return length(d);

    float projection = dot(d, x / lx);

    fp = projection / lx;

    if(projection < 0.0)            return length(d);
    else if(projection > length(x)) return length(p - b);
    return sqrt(abs(dot(d, d) - projection * projection));
}
`

/** Source/shaders/glsl/fluid/advect.frag */
const ADVECT =
    FLUID_BASE +
    `
uniform sampler2D velocity;
uniform sampler2D target;
uniform float dt;
uniform float rdx; // reciprocal of grid scale

void main(void){
    vec2 tracedPos = p - dt * rdx * texture2D(velocity, texelCoord).xy;

    // Bilinear interpolation of the target field at tracedPos, by hand --
    // which is what lets every texture in here stay NEAREST.
    tracedPos = simToTexelSpace(tracedPos) / invresolution;

    vec4 st;
    st.xy = floor(tracedPos - .5) + .5;
    st.zw = st.xy + 1.;

    vec2 t = tracedPos - st.xy;

    st *= invresolution.xyxy;

    vec4 tex11 = texture2D(target, st.xy);
    vec4 tex21 = texture2D(target, st.zy);
    vec4 tex12 = texture2D(target, st.xw);
    vec4 tex22 = texture2D(target, st.zw);

    gl_FragColor = mix(mix(tex11, tex21, t.x), mix(tex12, tex22, t.x), t.y);
}
`

/** Source/shaders/glsl/fluid/velocity-divergence.frag */
const DIVERGENCE =
    FLUID_BASE +
    `
uniform sampler2D velocity;
uniform float halfrdx;

void main(void){
    vec2 L = sampleVelocity(velocity, texelCoord - vec2(invresolution.x, 0));
    vec2 R = sampleVelocity(velocity, texelCoord + vec2(invresolution.x, 0));
    vec2 B = sampleVelocity(velocity, texelCoord - vec2(0, invresolution.y));
    vec2 T = sampleVelocity(velocity, texelCoord + vec2(0, invresolution.y));

    gl_FragColor = vec4(halfrdx * ((R.x - L.x) + (T.y - B.y)), 0, 0, 1);
}
`

/** Source/shaders/glsl/fluid/pressure-solve.frag */
const PRESSURE_SOLVE =
    FLUID_BASE +
    `
uniform sampler2D pressure;
uniform sampler2D divergence;
uniform float alpha; // -(dx)^2

void main(void){
    float L = samplePressue(pressure, texelCoord - vec2(invresolution.x, 0));
    float R = samplePressue(pressure, texelCoord + vec2(invresolution.x, 0));
    float B = samplePressue(pressure, texelCoord - vec2(0, invresolution.y));
    float T = samplePressue(pressure, texelCoord + vec2(0, invresolution.y));

    float bC = texture2D(divergence, texelCoord).x;

    gl_FragColor = vec4((L + R + B + T + alpha * bC) * .25, 0, 0, 1);
}
`

/** Source/shaders/glsl/fluid/pressure-gradient-subtract.frag */
const PRESSURE_GRADIENT =
    FLUID_BASE +
    `
uniform sampler2D pressure;
uniform sampler2D velocity;
uniform float halfrdx;

void main(void){
    float L = samplePressue(pressure, texelCoord - vec2(invresolution.x, 0));
    float R = samplePressue(pressure, texelCoord + vec2(invresolution.x, 0));
    float B = samplePressue(pressure, texelCoord - vec2(0, invresolution.y));
    float T = samplePressue(pressure, texelCoord + vec2(0, invresolution.y));

    vec2 v = texture2D(velocity, texelCoord).xy;

    gl_FragColor = vec4(v - halfrdx * vec2(R - L, T - B), 0, 1);
}
`

/** MouseForce, from Main.hx. `uDecay` is the original's 0.999 raised to
 *  dt*60, and `uStrength` scales the target velocity -- 1 is the
 *  original. */
const MOUSE_FORCE =
    FLUID_BASE +
    GEOM +
    `
uniform sampler2D velocity;
uniform float dt;
uniform float dx;
uniform float uDecay;
uniform float uStrength;

uniform float isMouseDown;
uniform vec2 mouseClipSpace;
uniform vec2 lastMouseClipSpace;

void main(){
    vec2 v = texture2D(velocity, texelCoord).xy;

    v.xy *= uDecay;

    if(isMouseDown > 0.5){
        vec2 mouse = clipToSimSpace(mouseClipSpace);
        vec2 lastMouse = clipToSimSpace(lastMouseClipSpace);
        vec2 mouseVelocity = -(lastMouse - mouse) / dt;

        // tapered distance to the segment the pointer travelled
        float fp;
        float l = distanceToSegment(mouse, lastMouse, p, fp);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(fp, 0.0, 1.0) * taperFactor;

        float R = 0.015;
        float m = exp(-l / R); // drag coefficient
        m *= projectedFraction * projectedFraction;

        vec2 targetVelocity = mouseVelocity * dx * uStrength;
        v += (targetVelocity - v) * m;
    }

    gl_FragColor = vec4(v, 0, 1.);
}
`

/** MouseDye, from Main.hx. The three decays arrive as a vec3 so they can
 *  be raised to dt*60 on the way in, and the two colour constants become
 *  the palette. */
const MOUSE_DYE =
    FLUID_BASE +
    GEOM +
    `
uniform sampler2D dye;
uniform float dt;
uniform float dx;
uniform vec3 uDecay;
uniform vec3 uLow;
uniform vec3 uHigh;
uniform vec3 uGlint;

uniform float isMouseDown;
uniform vec2 mouseClipSpace;
uniform vec2 lastMouseClipSpace;

void main(){
    vec4 color = texture2D(dye, texelCoord);

    color.rgb *= uDecay;

    if(isMouseDown > 0.5){
        vec2 mouse = clipToSimSpace(mouseClipSpace);
        vec2 lastMouse = clipToSimSpace(lastMouseClipSpace);
        vec2 mouseVelocity = -(lastMouse - mouse) / dt;

        float fp;
        float l = distanceToSegment(mouse, lastMouse, p, fp);
        float taperFactor = 0.6;
        float projectedFraction = 1.0 - clamp(fp, 0.0, 1.0) * taperFactor;

        float R = 0.025;
        float m = exp(-l / R);

        float speed = length(mouseVelocity);
        float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0., 1.);
        color.rgb += m * (mix(uLow, uHigh, x) + uGlint * pow(x, 9.));
    }

    gl_FragColor = vec4(color.rgb, 1.0);
}
`

/** GPUParticles.InitialConditions: one particle per texel, laid out
 *  across the whole frame, at rest.
 *
 *  The original lays them on a perfectly regular lattice, and the one
 *  thing it does not survive is standing still. A lattice of a thousand
 *  points across nine hundred pixels beats against the pixel grid, and
 *  until the flow has scrambled it the frame is covered in moire rings --
 *  which the demo gets away with because you arrive at it and immediately
 *  drag, and a scrambled crowd never goes back. A component is looked at
 *  before it is touched, so each particle is placed anywhere within its
 *  own cell instead of exactly at the corner. The coverage is identical,
 *  the interference is gone, and after any stirring at all the two are
 *  the same picture. */
const PARTICLE_INIT = `
varying vec2 texelCoord;

uniform float cellSize;

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main(){
    vec2 jitter = vec2(hash21(texelCoord), hash21(texelCoord + 7.31)) * cellSize;
    vec2 ip = vec2((texelCoord.x), (texelCoord.y)) * 2.0 - 1.0 + jitter * 2.0;
    vec2 iv = vec2(0, 0);
    gl_FragColor = vec4(ip, iv);
}
`

/** GPUParticles.StepParticles. At dragCoefficient 1 -- the original's
 *  setting -- a particle simply takes the velocity of the field it is
 *  standing in. Below 1 it lags, and the value is corrected for frame
 *  rate on the way in so that lag is a time and not a number of frames. */
const PARTICLE_STEP = `
varying vec2 texelCoord;

uniform float dt;
uniform sampler2D particleData;
uniform float dragCoefficient;
uniform vec2 flowScale;
uniform sampler2D flowVelocityField;

void main(){
    vec2 p = texture2D(particleData, texelCoord).xy;
    vec2 v = texture2D(particleData, texelCoord).zw;

    // (converts clip-space p to texel coordinates)
    vec2 vf = texture2D(flowVelocityField, (p + 1.) * .5).xy * flowScale;
    v += (vf - v) * dragCoefficient;

    p += dt * v;
    gl_FragColor = vec4(p, v);
}
`

/** ColorParticleMotion, from Main.hx: the whole of the particle colour.
 *  A point is one pixel, positioned straight out of the data texture --
 *  the CPU never learns where any particle is. */
const PARTICLE_VERT = `
precision highp float;
precision highp sampler2D;

uniform sampler2D particleData;
uniform float uPointSize;
uniform vec3 uSlow;
uniform vec3 uFast;
uniform vec3 uGlint;

attribute vec2 particleUV;
varying vec4 color;

void main(){
    vec2 p = texture2D(particleData, particleUV).xy;
    vec2 v = texture2D(particleData, particleUV).zw;
    gl_PointSize = uPointSize;
    gl_Position = vec4(p, 0.0, 1.0);
    float speed = length(v);
    float x = clamp(speed * 4.0, 0., 1.);
    color.rgb = (mix(uSlow, uFast, x) + uGlint * x * x * x * ${GLINT_SCALE.toFixed(2)});
    color.a = 1.0;
}
`

const PARTICLE_FRAG = `
varying vec4 color;

void main(){
    gl_FragColor = vec4(color);
}
`

/** Source/shaders/glsl/quad-texture.frag, absolute value and all. */
const QUAD_TEXTURE = `
uniform sampler2D texture;
varying vec2 texelCoord;

void main(void){
    gl_FragColor = abs(texture2D(texture, texelCoord));
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

/** Count -> the side of the particle texture, so the texture that is
 *  allocated and the vertex count drawn out of it cannot drift apart.
 *  Doubling every three points of the slider, which puts the original's
 *  four counts -- 128 through 1024 a side -- across the range. Quantised
 *  to sixteens, because a new side means a new texture and a new address
 *  buffer and the slider should not reallocate several megabytes at every
 *  step of a drag. The original only ever uses exact powers of two
 *  because its presets are named; nothing here needs one. */
function particleSide(count: number): number {
    const t = Math.min(10, Math.max(0, count)) / 10
    const exp = PARTICLE_EXP_MIN + t * (PARTICLE_EXP_MAX - PARTICLE_EXP_MIN)
    return Math.max(16, Math.round(Math.pow(2, exp) / 16) * 16)
}

/** Detail -> the grid's size as a fraction of the frame. */
function fluidScale(detail: number): number {
    const t = Math.min(10, Math.max(0, detail)) / 10
    return 1 / (FLUID_DIVISOR_MAX - t * (FLUID_DIVISOR_MAX - FLUID_DIVISOR_MIN))
}

/** A per-frame-at-60fps decay, as this frame's actual decay. */
function decayFor(perFrame: number, dt: number, scale: number): number {
    return Math.pow(perFrame, scale * dt * 60)
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

/** A colour format this driver will render to. */
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
    vert: string,
    frag: string,
    prelude: string,
    attrib: string
): GLProgram | null {
    const vs = compile(gl, gl.VERTEX_SHADER, vert)
    const fs = compile(gl, gl.FRAGMENT_SHADER, prelude + frag)
    if (!vs || !fs) return null

    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    // Every program takes its one attribute at slot 0, whether that is a
    // corner of the quad or a particle's address.
    gl.bindAttribLocation(prog, 0, attrib)
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.deleteProgram(prog)
        return null
    }

    // Enumerated rather than listed: the passes share their uniform
    // blocks and each keeps only the subset it actually compiled with.
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
    fmt: Fmt,
    linear?: boolean
): FBO | null {
    const tex = gl.createTexture()
    const fbo = gl.createFramebuffer()
    if (!tex || !fbo) return null

    const filter = linear && fmt.linear ? gl.LINEAR : gl.NEAREST
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
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.deleteTexture(tex)
        gl.deleteFramebuffer(fbo)
        return null
    }

    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return { tex, fbo, w, h }
}

/** Best float format this driver will render to. The original asks for
 *  gl.FLOAT and nothing else; full float comes first here for the same
 *  reason -- particle positions are stored as fractions of the frame, and
 *  half float quantises them to about a thousandth of it. `linear`
 *  records whether it can also be filtered: only the dye needs that, and
 *  only where it is stretched over the frame at the end of the pass. */
function pickFormat(gl: WebGLRenderingContext, gl2: boolean): Fmt | null {
    const tries: Fmt[] = []
    if (gl2) {
        const cbf = gl.getExtension("EXT_color_buffer_float")
        const cbh = gl.getExtension("EXT_color_buffer_half_float")
        const fl = gl.getExtension("OES_texture_float_linear")
        if (cbf && fl)
            tries.push({ internal: RGBA32F, type: gl.FLOAT, linear: true })
        if (cbf) tries.push({ internal: RGBA32F, type: gl.FLOAT, linear: false })
        if (cbf || cbh)
            tries.push({ internal: RGBA16F, type: HALF_FLOAT, linear: true })
    } else {
        const f = gl.getExtension("OES_texture_float")
        const fl = gl.getExtension("OES_texture_float_linear")
        const hf = gl.getExtension("OES_texture_half_float") as {
            HALF_FLOAT_OES: number
        } | null
        const hfl = gl.getExtension("OES_texture_half_float_linear")
        if (f && fl)
            tries.push({ internal: gl.RGBA, type: gl.FLOAT, linear: true })
        if (f) tries.push({ internal: gl.RGBA, type: gl.FLOAT, linear: false })
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

export default function NebulaDrift({
    colors,
    background = DEFAULTS.background,
    particles,
    dye,
    strength = DEFAULTS.strength,
    stir = DEFAULTS.stir,
    iterations = DEFAULTS.iterations,
    detail = DEFAULTS.detail,
    style,
}: NebulaDriftProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [failed, setFailed] = useState(false)

    // Grouped controls arrive as partial objects, so each is merged over
    // the same constant the panel's defaultValue points at.
    const cfg = {
        colors: { ...DEFAULT_COLORS, ...colors },
        background,
        particles: { ...DEFAULT_PARTICLES, ...particles },
        dye: { ...DEFAULT_DYE, ...dye },
        strength,
        stir,
        iterations,
        detail,
    }

    // Live prop mirror. The solver reads from here, so tweaking a control
    // never tears down the GL context or resets the fluid.
    const propsRef = useRef(cfg)
    propsRef.current = cfg

    /** The clip-space pointer, and where it was at the end of the last
     *  frame. The original keeps exactly this pair and hands both to the
     *  force and dye shaders, which paint along the segment between them
     *  -- which is why a fast pass leaves a stroke and not a row of
     *  dots. */
    const pointerRef = useRef({
        x: 0,
        y: 0,
        lastX: 0,
        lastY: 0,
        /** The pointer is over the frame. This is what feeds the
         *  original's isMouseDown: hovering stands in for the button. */
        over: false,
        /** performance.now() of the last move, on the same clock rAF
         *  hands the loop, so the loop can tell a pointer crossing the
         *  frame from one someone has parked on it. */
        moveAt: 0,
        known: false,
    })

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        let disposed = false
        let raf = 0
        let gl: WebGLRenderingContext | null = null
        let fmt: Fmt | null = null

        let progs: Record<string, GLProgram> = {}
        let quad: WebGLBuffer | null = null
        let particleUVs: WebGLBuffer | null = null

        let velocity: Pair | null = null
        let pressure: Pair | null = null
        let dyeRT: Pair | null = null
        let particleData: Pair | null = null
        let divergence: FBO | null = null

        let gridW = 0
        let gridH = 0
        let aspect = 1
        let partSide = 0
        let partCount = 0
        let maxPoint = 1
        let dpr = 1

        let onScreen = true
        let pageVisible = true
        let reduceMotion = false
        let warmed = false
        /** Whether the pointer, rather than the stir, drove the last
         *  frame. The handover between them needs a re-seat in both
         *  directions -- see the loop. */
        let ptrDrove = false

        let elapsed = 0
        let lastNow = 0

        /** The synthetic pointer: where the current stroke runs from and
         *  to, when it started, and when the next one is due. */
        const stroke = {
            fromX: 0,
            fromY: 0,
            toX: 0,
            toY: 0,
            start: 0,
            end: 0,
            next: 0,
            live: false,
        }

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
        function u3f(p: GLProgram, n: string, v: [number, number, number]) {
            const l = p.uni[n]
            if (l) gl!.uniform3f(l, v[0], v[1], v[2])
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

        /** The two uniforms every fluid pass shares. */
        function fluidUniforms(p: GLProgram) {
            u2f(p, "invresolution", 1 / gridW, 1 / gridH)
            u1f(p, "aspectRatio", aspect)
        }

        /** The pointer, real or synthetic, as the two shaders want it. */
        function mouseUniforms(p: GLProgram, down: boolean) {
            const ptr = pointerRef.current
            u1f(p, "isMouseDown", down ? 1 : 0)
            u2f(p, "mouseClipSpace", ptr.x, ptr.y)
            u2f(p, "lastMouseClipSpace", ptr.lastX, ptr.lastY)
        }

        function bindQuad() {
            gl!.bindBuffer(gl!.ARRAY_BUFFER, quad)
            gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0)
        }

        function bindParticleUVs() {
            gl!.bindBuffer(gl!.ARRAY_BUFFER, particleUVs)
            gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0)
        }

        function target(t: FBO | null) {
            if (t) {
                gl!.bindFramebuffer(gl!.FRAMEBUFFER, t.fbo)
                gl!.viewport(0, 0, t.w, t.h)
            } else {
                gl!.bindFramebuffer(gl!.FRAMEBUFFER, null)
                gl!.viewport(0, 0, canvas.width, canvas.height)
            }
        }

        /** The original draws every full-frame pass as a four-vertex strip
         *  over the unit square, and its vertex shaders read that 0-1
         *  position directly. */
        function blit(t: FBO | null) {
            target(t)
            gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
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

        function dropPair(p: Pair | null) {
            if (!p) return
            dropFBO(p.read)
            dropFBO(p.write)
        }

        function dropFluid() {
            dropPair(velocity)
            dropPair(pressure)
            dropPair(dyeRT)
            dropFBO(divergence)
            velocity = pressure = dyeRT = null
            divergence = null
            gridW = gridH = 0
        }

        function dropParticles() {
            dropPair(particleData)
            particleData = null
            if (gl && particleUVs) gl.deleteBuffer(particleUVs)
            particleUVs = null
            partSide = partCount = 0
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
            // targets; the shaders stay GLSL ES 1.00 -- the original's own
            // dialect -- so one set serves both, which is why the context
            // is narrowed to the 1.0 type.
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

            // Particles are positioned by a texture read in the vertex
            // shader. Hardware that cannot do that cannot draw this, and
            // there is no cheaper way to place a million points.
            const vtf = gl.getParameter(
                gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS
            ) as number
            if (!vtf || vtf < 1) return false

            fmt = pickFormat(gl, gl2)
            if (!fmt) return false

            const range = gl.getParameter(
                gl.ALIASED_POINT_SIZE_RANGE
            ) as Float32Array | null
            maxPoint = range && range.length > 1 ? range[1] : 1

            const hp = gl.getShaderPrecisionFormat(
                gl.FRAGMENT_SHADER,
                gl.HIGH_FLOAT
            )
            // The pressure solve accumulates over a couple of dozen sweeps
            // and the advection traces sub-texel positions; at mediump
            // both of them step visibly.
            const prelude =
                "precision " +
                (hp && hp.precision > 0 ? "highp" : "mediump") +
                " float;\n"

            const fluidPasses: Record<string, string> = {
                advect: ADVECT,
                divergence: DIVERGENCE,
                pressureSolve: PRESSURE_SOLVE,
                pressureGradient: PRESSURE_GRADIENT,
                mouseForce: MOUSE_FORCE,
                mouseDye: MOUSE_DYE,
            }
            progs = {}
            for (const key in fluidPasses) {
                const p = makeProgram(
                    gl,
                    FLUID_VERT,
                    fluidPasses[key],
                    prelude,
                    "vertexPosition"
                )
                if (!p) return false
                progs[key] = p
            }

            // The particle passes and the final dye draw need no
            // simulation position, so they take the plain quad vertex
            // shader the original uses for the same three things.
            const planePasses: Record<string, string> = {
                particleInit: PARTICLE_INIT,
                particleStep: PARTICLE_STEP,
                screenTexture: QUAD_TEXTURE,
            }
            for (const key in planePasses) {
                const p = makeProgram(
                    gl,
                    PLANE_VERT,
                    planePasses[key],
                    prelude,
                    "vertexPosition"
                )
                if (!p) return false
                progs[key] = p
            }

            const pt = makeProgram(
                gl,
                PARTICLE_VERT,
                PARTICLE_FRAG,
                prelude,
                "particleUV"
            )
            if (!pt) return false
            progs.particleRender = pt

            quad = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, quad)
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
                gl.STATIC_DRAW
            )
            gl.enableVertexAttribArray(0)
            gl.disable(gl.DEPTH_TEST)
            gl.disable(gl.BLEND)
            gl.disable(gl.DITHER)
            return true
        }

        /** (Re)allocate the fluid's four fields. */
        function buildFluid(w: number, h: number) {
            if (!gl || !fmt) return
            dropFluid()
            gridW = w
            gridH = h
            aspect = w / h

            const mk = () => makeFBO(gl!, w, h, fmt!)
            const va = mk()
            const vb = mk()
            const pa = mk()
            const pb = mk()
            // The dye is the one field ever stretched over the frame
            // rather than read texel by texel, so it is the one that wants
            // filtering -- exactly as in the original, which asks for
            // LINEAR here and NEAREST everywhere else.
            const da = makeFBO(gl, w, h, fmt, true)
            const db = makeFBO(gl, w, h, fmt, true)
            divergence = mk()
            if (!va || !vb || !pa || !pb || !da || !db || !divergence) {
                setFailed(true)
                return
            }
            velocity = { read: va, write: vb }
            pressure = { read: pa, write: pb }
            dyeRT = { read: da, write: db }
            warmed = false
        }

        /** (Re)allocate the crowd, and lay it out on a regular grid across
         *  the frame the way the original's reset does. */
        function buildParticles(side: number) {
            if (!gl || !fmt) return
            dropParticles()
            partSide = side
            partCount = side * side

            // Positions are read back exactly, never interpolated.
            const pa = makeFBO(gl, side, side, fmt)
            const pb = makeFBO(gl, side, side, fmt)
            if (!pa || !pb) {
                setFailed(true)
                return
            }
            particleData = { read: pa, write: pb }

            // One vertex per particle, carrying nothing but that
            // particle's address in the data texture.
            const uvs = new Float32Array(partCount * 2)
            for (let i = 0; i < side; i++) {
                for (let j = 0; j < side; j++) {
                    const k = (i * side + j) * 2
                    uvs[k] = i / side
                    uvs[k + 1] = j / side
                }
            }
            particleUVs = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, particleUVs)
            gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW)

            bindQuad()
            use(progs.particleInit)
            u1f(progs.particleInit, "cellSize", 1 / side)
            blit(particleData.write)
            swap(particleData)
            warmed = false
        }

        /* --------------------------------------------------------- stir */

        /** Move the synthetic pointer along its stroke, or start the next
         *  one. It writes the same two clip-space points a real pointer
         *  writes, so nothing downstream can tell the difference. */
        function stirPointer(): boolean {
            const ptr = pointerRef.current
            if (!stroke.live && elapsed >= stroke.next) {
                // Somewhere in the middle two thirds of the frame, headed
                // somewhere else in it: a stroke that starts at an edge
                // spends half its length pushing the wall.
                const r = () => Math.random() * 1.2 - 0.6
                stroke.fromX = r()
                stroke.fromY = r()
                stroke.toX = r()
                stroke.toY = r()
                stroke.start = elapsed
                stroke.end = elapsed + STIR_STROKE
                stroke.live = true
                // The stroke begins where it begins; without this its
                // first frame reads as a jump from wherever the pointer
                // last was and drags a line across the whole frame. That
                // frame is also not drawn: a segment of zero length has
                // no direction, so all it could do is damp the fluid
                // where the stroke is about to start.
                ptr.x = stroke.fromX
                ptr.y = stroke.fromY
                ptr.lastX = ptr.x
                ptr.lastY = ptr.y
                return false
            }
            if (!stroke.live) return false

            const t = (elapsed - stroke.start) / (stroke.end - stroke.start)
            if (t >= 1) {
                stroke.live = false
                stroke.next =
                    elapsed +
                    STIR_PAUSE_MIN +
                    Math.random() * (STIR_PAUSE_MAX - STIR_PAUSE_MIN)
                return false
            }
            // Eased, so the stroke accelerates into the middle and eases
            // out again. The dye's brightness goes as the square of the
            // pointer's speed, so a stroke drawn at a constant rate paints
            // a flat band; this one has a bright core, which is what a
            // flick of the wrist looks like in the original.
            const e = t * t * (3 - 2 * t)
            ptr.x = stroke.fromX + (stroke.toX - stroke.fromX) * e
            ptr.y = stroke.fromY + (stroke.toY - stroke.fromY) * e
            return true
        }

        /* --------------------------------------------------------- step */

        /** GPUFluid.step, in its order: advect, forces, divergence,
         *  pressure, gradient subtract, dye, advect dye. */
        function stepFluid(dt: number, down: boolean) {
            if (!gl || !velocity || !pressure || !dyeRT || !divergence) return
            const p = propsRef.current
            bindQuad()

            const rdx = 1 / CELL_SIZE
            const halfrdx = 0.5 * rdx

            // advect velocity through itself
            const ad = progs.advect
            use(ad)
            fluidUniforms(ad)
            u1f(ad, "dt", dt)
            u1f(ad, "rdx", rdx)
            bindTex(ad, "target", velocity.read.tex, 0)
            bindTex(ad, "velocity", velocity.read.tex, 1)
            blit(velocity.write)
            swap(velocity)

            const mf = progs.mouseForce
            use(mf)
            fluidUniforms(mf)
            u1f(mf, "dt", dt)
            u1f(mf, "dx", CELL_SIZE)
            u1f(mf, "uDecay", decayFor(VELOCITY_DECAY, dt, 1))
            // 5 is the original's force, so the middle of the slider is
            // the reference and either side of it is a multiple.
            u1f(mf, "uStrength", p.strength / 5)
            mouseUniforms(mf, down)
            bindTex(mf, "velocity", velocity.read.tex, 0)
            blit(velocity.write)
            swap(velocity)

            const dv = progs.divergence
            use(dv)
            fluidUniforms(dv)
            u1f(dv, "halfrdx", halfrdx)
            bindTex(dv, "velocity", velocity.read.tex, 0)
            blit(divergence)

            // Pressure is not cleared between steps: last step's answer is
            // this step's first guess. The original does the same.
            const ps = progs.pressureSolve
            use(ps)
            fluidUniforms(ps)
            u1f(ps, "alpha", -CELL_SIZE * CELL_SIZE)
            bindTex(ps, "divergence", divergence.tex, 1)
            const iters = Math.max(1, Math.round(p.iterations))
            for (let i = 0; i < iters; i++) {
                bindTex(ps, "pressure", pressure.read.tex, 0)
                blit(pressure.write)
                swap(pressure)
            }

            const pg = progs.pressureGradient
            use(pg)
            fluidUniforms(pg)
            u1f(pg, "halfrdx", halfrdx)
            bindTex(pg, "pressure", pressure.read.tex, 0)
            bindTex(pg, "velocity", velocity.read.tex, 1)
            blit(velocity.write)
            swap(velocity)

            // the dye: painted, then carried
            const low = toRGB(p.colors.slow)
            const high = toRGB(p.colors.fast)
            const glint = toRGB(p.colors.glint)
            const k = p.dye.fade / 5
            const md = progs.mouseDye
            use(md)
            fluidUniforms(md)
            u1f(md, "dt", dt)
            u1f(md, "dx", CELL_SIZE)
            u3f(md, "uDecay", [
                decayFor(DYE_DECAY[0], dt, k),
                decayFor(DYE_DECAY[1], dt, k),
                decayFor(DYE_DECAY[2], dt, k),
            ])
            u3f(md, "uLow", [
                low[0] * DYE_LOW_SCALE,
                low[1] * DYE_LOW_SCALE,
                low[2] * DYE_LOW_SCALE,
            ])
            u3f(md, "uHigh", [
                high[0] * DYE_HIGH_SCALE,
                high[1] * DYE_HIGH_SCALE,
                high[2] * DYE_HIGH_SCALE,
            ])
            u3f(md, "uGlint", glint)
            mouseUniforms(md, down)
            bindTex(md, "dye", dyeRT.read.tex, 0)
            blit(dyeRT.write)
            swap(dyeRT)

            use(ad)
            fluidUniforms(ad)
            u1f(ad, "dt", dt)
            u1f(ad, "rdx", rdx)
            bindTex(ad, "target", dyeRT.read.tex, 0)
            bindTex(ad, "velocity", velocity.read.tex, 1)
            blit(dyeRT.write)
            swap(dyeRT)
        }

        function stepParticles(dt: number) {
            if (!gl || !particleData || !velocity) return
            const p = propsRef.current
            bindQuad()

            const sp = progs.particleStep
            use(sp)
            u1f(sp, "dt", dt)
            // The original's dragCoefficient is 1, applied once per frame,
            // which at 1 means "take the flow's velocity" and is the same
            // on any panel. Anything below 1 is a per-frame lag, so it is
            // turned into a time constant here instead.
            const inertia = p.particles.inertia
            u1f(
                sp,
                "dragCoefficient",
                inertia <= 0 ? 1 : 1 - Math.exp(-dt / (inertia * 0.05))
            )
            // sim-space velocity -> clip space, as simToClipSpace does
            u2f(sp, "flowScale", 1 / (CELL_SIZE * aspect), 1 / CELL_SIZE)
            bindTex(sp, "particleData", particleData.read.tex, 0)
            bindTex(sp, "flowVelocityField", velocity.read.tex, 1)
            blit(particleData.write)
            swap(particleData)
        }

        /* ------------------------------------------------------- render */

        function render() {
            if (!gl || !particleData || !dyeRT) return
            const p = propsRef.current

            const bg = toRGB(p.background)
            target(null)
            gl.clearColor(bg[0], bg[1], bg[2], 1)
            gl.clear(gl.COLOR_BUFFER_BIT)

            // The original's blend, verbatim: with every fragment written
            // at alpha 1 this is a plain add, and it is the only reason
            // any of this reads as light rather than as dots.
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.SRC_ALPHA, gl.SRC_ALPHA)
            gl.blendEquation(gl.FUNC_ADD)

            const pr = progs.particleRender
            use(pr)
            u1f(
                pr,
                "uPointSize",
                Math.min(maxPoint, Math.max(1, p.particles.size * dpr))
            )
            u3f(pr, "uSlow", toRGB(p.colors.slow))
            u3f(pr, "uFast", toRGB(p.colors.fast))
            u3f(pr, "uGlint", toRGB(p.colors.glint))
            bindTex(pr, "particleData", particleData.read.tex, 0)
            bindParticleUVs()
            target(null)
            gl.drawArrays(gl.POINTS, 0, partCount)

            if (p.dye.show) {
                const st = progs.screenTexture
                use(st)
                bindTex(st, "texture", dyeRT.read.tex, 0)
                bindQuad()
                target(null)
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
            }

            gl.disable(gl.BLEND)
        }

        /* ------------------------------------------------------- resize */

        function resize() {
            if (!gl) return
            dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            const cw = Math.max(1, Math.round(host.clientWidth * dpr))
            const ch = Math.max(1, Math.round(host.clientHeight * dpr))
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw
                canvas.height = ch
            }

            const p = propsRef.current
            // The grid is a fraction of the frame in CSS pixels, not
            // device ones: the original ran a window's worth of pixels
            // through it, and a retina display should not quietly cost
            // four times the solve.
            const s = fluidScale(p.detail)
            const w = Math.max(
                8,
                Math.min(GRID_MAX, Math.round(host.clientWidth * s))
            )
            const h = Math.max(
                8,
                Math.min(GRID_MAX, Math.round(host.clientHeight * s))
            )
            // Rebuilding empties the fluid, so it is worth doing only when
            // the grid is meaningfully wrong: a resize drag that reset the
            // flow every frame is a thing anybody can see.
            if (
                Math.abs(w - gridW) / Math.max(1, gridW) > 0.04 ||
                Math.abs(h - gridH) / Math.max(1, gridH) > 0.04
            ) {
                buildFluid(w, h)
            }

            const side = particleSide(p.particles.count)
            if (side !== partSide) buildParticles(side)
        }

        /* --------------------------------------------------------- loop */

        function loop(now: number) {
            if (disposed) return
            raf = requestAnimationFrame(loop)
            if (!onScreen || !pageVisible) {
                lastNow = now
                return
            }
            // The original steps on the real frame time and clamps
            // nothing; a tab that spent a minute in the background would
            // otherwise advect the whole field off the edge in one step,
            // so the gap is capped at a few frames' worth.
            const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.05) : 0
            lastNow = now
            resize()

            const ptr = pointerRef.current
            const p = propsRef.current

            // A frame's worth of stirring, run before anyone sees it: a
            // held frame is worth nothing empty, and a running one should
            // not open on two seconds of nothing happening.
            if (!warmed && velocity && particleData) {
                const n = reduceMotion ? STILL_WARMUP : WARMUP
                if (p.stir) {
                    for (let i = 0; i < n; i++) {
                        elapsed += STEP
                        const down = stirPointer()
                        stepFluid(STEP, down)
                        stepParticles(STEP)
                        ptr.lastX = ptr.x
                        ptr.lastY = ptr.y
                    }
                }
                warmed = true
            }

            // Reduced motion gets the warmup above and nothing else: the
            // frame is composed, then held.
            if (!reduceMotion && dt > 0) {
                elapsed += dt
                // A real pointer outranks the synthetic one: while
                // someone is moving over the frame the stir keeps out of
                // the way rather than fighting them for the fluid. A
                // cursor left resting is not interaction -- the force
                // goes as pointer velocity, so it paints nothing, and
                // holding the frame for it would lock the stir out of a
                // picture that has gone still.
                const hovering =
                    ptr.over && ptr.known && now - ptr.moveAt < HOVER_HOLD
                if (hovering) {
                    if (!ptrDrove) {
                        // Taking the fluid back: the previous point is
                        // wherever the stir's stroke had got to, so it is
                        // re-seated onto the pointer. Without this the
                        // first frame of a hover paints a line from the
                        // synthetic stroke to the cursor, right across
                        // the frame.
                        ptr.lastX = ptr.x
                        ptr.lastY = ptr.y
                    }
                    // A stroke caught in flight is abandoned rather than
                    // resumed when the pointer leaves again: picking it
                    // up mid-stroke has the same problem in reverse.
                    if (stroke.live) {
                        stroke.live = false
                        stroke.next = elapsed + STIR_PAUSE_MIN
                    }
                }
                ptrDrove = hovering
                const down = hovering || (p.stir ? stirPointer() : false)
                stepFluid(dt, down)
                stepParticles(dt)
                // The original updates this at the end of every frame, so
                // the next one's segment starts where this one ended.
                ptr.lastX = ptr.x
                ptr.lastY = ptr.y
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
            // rebuild, so the new mode gets the frame it wants: stirred
            // and held, or empty and running
            gridW = gridH = 0
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
            gridW = gridH = 0
            partSide = 0
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
                dropFluid()
                dropParticles()
                if (quad) gl.deleteBuffer(quad)
                for (const k in progs) gl.deleteProgram(progs[k].prog)
                const lose = gl.getExtension("WEBGL_lose_context")
                if (lose) lose.loseContext()
            }
        }
    }, [])

    /* ------------------------------------------------------ interaction */

    /** Window coordinates -> clip space, exactly as the original's
     *  windowToClipSpace pair does: x across, y up from the bottom. */
    const track = (e: ReactPointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        const p = pointerRef.current
        p.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        p.y = ((rect.height - (e.clientY - rect.top)) / rect.height) * 2 - 1
        if (!p.known) {
            p.lastX = p.x
            p.lastY = p.y
        }
        p.known = true
    }

    /** Arriving. `track` re-seats the previous point whenever `known` is
     *  false, so the first segment after the pointer appears is a real
     *  one and not a line drawn from wherever the pointer last was --
     *  the far edge of the frame, or the stir's synthetic stroke. */
    const onPointerEnter = (e: ReactPointerEvent<HTMLDivElement>) => {
        track(e)
        const p = pointerRef.current
        p.over = true
        p.moveAt = nowMs()
    }

    const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        track(e)
        const p = pointerRef.current
        p.over = true
        p.moveAt = nowMs()
    }

    /** Leaving -- or a touch the browser has taken over for a scroll.
     *  `known` is dropped with it, so the next arrival starts clean. */
    const onPointerLeave = () => {
        const p = pointerRef.current
        p.over = false
        p.known = false
    }

    // No WebGL, or no float render targets: the palette laid out the way
    // the picture runs through it, slow at the edges and fast in the
    // middle.
    const fallback: CSSProperties = failed
        ? {
              background:
                  "radial-gradient(120% 100% at 50% 50%, " +
                  cfg.colors.glint +
                  ", " +
                  cfg.colors.fast +
                  ", " +
                  cfg.colors.slow +
                  ", " +
                  cfg.background +
                  ")",
          }
        : {}

    return (
        <div
            ref={hostRef}
            onPointerEnter={onPointerEnter}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onPointerCancel={onPointerLeave}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: cfg.background,
                // No `touchAction: "none"` and no crosshair: both belonged
                // to the drag. There is no gesture left to protect from
                // the scroller, and a section of a landing page that
                // swallows a swipe is a bug; touch still paints, since a
                // swipe fires enter and move on its way past before the
                // browser claims it and sends pointercancel.
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
