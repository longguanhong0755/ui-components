"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

// --- upstream constants, verbatim ---------------------------------------
const VELOCITY_SCALE_FACTOR = 8 // velocity solved at 1/8 the display resolution
const NUM_JACOBI_STEPS = 3
const PRESSURE_CALC_ALPHA = -1
const PRESSURE_CALC_BETA = 0.25
const NUM_RENDER_STEPS = 3 // particle substeps per frame, so trails stay smooth
const MAX_VELOCITY = 30 // px per step
const PARTICLE_LIFETIME = 1000 // steps before a particle respawns
const MAX_NUM_PARTICLES = 100000
const TOUCH_FORCE_SCALE = 2

const MAX_DPR = 1.5 // quality tier, not a design control (rule 10)

// --- the ambient stir (see header) --------------------------------------
// Force per step at Flow 50, and the drag that bounds it. Terminal speed is
// FLOW_FORCE / FLOW_DRAG = 4 px/step, a seventh of the speed limit, so the
// ambient field reads as a drift and a pointer drag still dominates it.
const FLOW_FORCE = 0.08
const FLOW_DRAG = 0.02
// Both stir rates are integer multiples of TAU/FLOW_LOOP, so wrapping the clock
// here is exact and the noise domain stays bounded forever.
const FLOW_LOOP = 60

const MAX_DT_STEPS = 3 // clamp after a tab switch, so nothing jumps
const MAX_SEGMENTS_PER_FRAME = 8 // a fast drag emits more moves than frames

// ------------------------------------------------------------------ shaders

// Full-screen triangle. v_uv runs 0..1 across the viewport.
const VERT_SRC = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FRAG_HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 v_uv;
`

// Advect the velocity field through itself. u_dimensions is the display size in
// CSS px, which is the space velocity is measured in.
const ADVECT_SRC =
    FRAG_HEAD +
    `
uniform sampler2D u_state;
uniform sampler2D u_velocity;
uniform vec2 u_dimensions;
uniform float u_dt;
out vec2 out_state;
void main() {
    out_state = texture(u_state, v_uv - texture(u_velocity, v_uv).xy * u_dt / u_dimensions).xy;
}`

// Curl-noise forcing plus drag. Not upstream — see the header.
const STIR_SRC =
    FRAG_HEAD +
    `
uniform sampler2D u_velocity;
uniform vec2 u_aspect;
uniform float u_scale;
uniform float u_time;
uniform float u_amp;
uniform float u_drag;
out vec2 out_velocity;

float h21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vn2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x),
               mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 3; i++) {
        s += a * vn2(p);
        p = p * 2.03 + 17.1;
        a *= 0.5;
    }
    return s;
}

// Two counter-orbiting layers, so the field churns in place instead of
// reading as one pattern scrolling past. The offsets ORBIT rather than
// accumulate: a linear drift would push the hash's dot product past 1e6 after
// a few hours and quantize the noise. Both rates are integer multiples of
// TAU/LOOP, so u_time can be wrapped at LOOP with no seam at all.
float psi(vec2 p) {
    float w = 6.28318530718 / 60.0;
    vec2 d1 = 0.9 * vec2(cos(3.0 * w * u_time), sin(3.0 * w * u_time));
    vec2 d2 = 1.4 * vec2(cos(2.1 - 2.0 * w * u_time), sin(2.1 - 2.0 * w * u_time));
    return fbm(p + d1) - fbm(p * 1.31 + d2);
}

void main() {
    vec2 p = v_uv * u_aspect * u_scale;
    float e = 0.05;
    // curl of a scalar field is divergence-free by construction
    vec2 force = vec2(psi(p + vec2(0.0, e)) - psi(p - vec2(0.0, e)),
                      psi(p - vec2(e, 0.0)) - psi(p + vec2(e, 0.0))) / (2.0 * e);
    vec2 velocity = texture(u_velocity, v_uv).xy;
    velocity += force * u_amp;
    velocity *= max(0.0, 1.0 - u_drag);
    float velocityMag = length(velocity);
    out_velocity = velocity * (min(velocityMag, ${MAX_VELOCITY.toFixed(1)}) / max(velocityMag, 1e-6));
}`

const DIVERGENCE_SRC =
    FRAG_HEAD +
    `
uniform sampler2D u_vectorField;
uniform vec2 u_pxSize;
out float out_divergence;
void main() {
    float n = texture(u_vectorField, v_uv + vec2(0.0, u_pxSize.y)).y;
    float s = texture(u_vectorField, v_uv - vec2(0.0, u_pxSize.y)).y;
    float e = texture(u_vectorField, v_uv + vec2(u_pxSize.x, 0.0)).x;
    float w = texture(u_vectorField, v_uv - vec2(u_pxSize.x, 0.0)).x;
    out_divergence = 0.5 * (e - w + n - s);
}`

const JACOBI_SRC =
    FRAG_HEAD +
    `
uniform float u_alpha;
uniform float u_beta;
uniform vec2 u_pxSize;
uniform sampler2D u_previousState;
uniform sampler2D u_divergence;
out float out_jacobi;
void main() {
    float n = texture(u_previousState, v_uv + vec2(0.0, u_pxSize.y)).x;
    float s = texture(u_previousState, v_uv - vec2(0.0, u_pxSize.y)).x;
    float e = texture(u_previousState, v_uv + vec2(u_pxSize.x, 0.0)).x;
    float w = texture(u_previousState, v_uv - vec2(u_pxSize.x, 0.0)).x;
    float d = texture(u_divergence, v_uv).x;
    out_jacobi = (n + s + e + w + u_alpha * d) * u_beta;
}`

const GRADIENT_SUB_SRC =
    FRAG_HEAD +
    `
uniform vec2 u_pxSize;
uniform sampler2D u_scalarField;
uniform sampler2D u_vectorField;
out vec2 out_result;
void main() {
    float n = texture(u_scalarField, v_uv + vec2(0.0, u_pxSize.y)).r;
    float s = texture(u_scalarField, v_uv - vec2(0.0, u_pxSize.y)).r;
    float e = texture(u_scalarField, v_uv + vec2(u_pxSize.x, 0.0)).r;
    float w = texture(u_scalarField, v_uv - vec2(u_pxSize.x, 0.0)).r;
    out_result = texture(u_vectorField, v_uv).xy - 0.5 * vec2(e - w, n - s);
}`

// Upstream paints this along a capsule primitive with a local uv; the same
// quadratic falloff is written here as a distance to the segment, which also
// gives the round end caps for free.
const TOUCH_SRC =
    FRAG_HEAD +
    `
uniform sampler2D u_velocity;
uniform vec2 u_dimensions;
uniform vec2 u_p1;
uniform vec2 u_p2;
uniform float u_radius;
uniform vec2 u_vector;
uniform float u_force;
out vec2 out_velocity;
void main() {
    vec2 p = v_uv * u_dimensions;
    vec2 ab = u_p2 - u_p1;
    float t = clamp(dot(p - u_p1, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    float radius = length(p - (u_p1 + ab * t)) / u_radius;
    float falloff = max(0.0, 1.0 - radius * radius);
    vec2 velocity = texture(u_velocity, v_uv).xy + falloff * u_vector * u_force;
    float velocityMag = length(velocity);
    out_velocity = velocity * (min(velocityMag, ${MAX_VELOCITY.toFixed(1)}) / max(velocityMag, 1e-6));
}`

const AGE_SRC =
    FRAG_HEAD +
    `
uniform sampler2D u_ages;
uniform float u_dt;
out float out_age;
void main() {
    float age = texture(u_ages, v_uv).x + u_dt;
    out_age = step(age, ${PARTICLE_LIFETIME.toFixed(1)}) * age;
}`

const ADVECT_PARTICLES_SRC =
    FRAG_HEAD +
    `
uniform vec2 u_dimensions;
uniform sampler2D u_positions;
uniform sampler2D u_velocity;
uniform sampler2D u_ages;
uniform sampler2D u_initialPositions;
uniform float u_step;
out vec4 out_position;
void main() {
    // Small displacements are banked separately until they accumulate, so a
    // sub-pixel offset on a large absolute position is not lost to float16.
    vec4 positionData = texture(u_positions, v_uv);
    vec2 absolute = positionData.rg;
    vec2 displacement = positionData.ba;
    vec2 position = absolute + displacement;

    // Forward integrate via RK2.
    vec2 pxSize = 1.0 / u_dimensions;
    vec2 velocity1 = texture(u_velocity, position * pxSize).xy;
    vec2 halfStep = position + velocity1 * 0.5 * u_step;
    vec2 velocity2 = texture(u_velocity, halfStep * pxSize).xy;
    displacement += velocity2 * u_step;

    float shouldMerge = step(20.0, dot(displacement, displacement));
    absolute = mod(absolute + shouldMerge * displacement + u_dimensions, u_dimensions);
    displacement *= (1.0 - shouldMerge);

    float shouldReset = step(texture(u_ages, v_uv).x, 1.0);
    out_position = mix(vec4(absolute, displacement), texture(u_initialPositions, v_uv), shouldReset);
}`

const POINTS_VERT_SRC = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D u_positions;
uniform vec2 u_dimensions;
uniform ivec2 u_texSize;
uniform float u_pointSize;
out vec2 v_uv;
out vec2 v_uv_position;
void main() {
    int i = gl_VertexID;
    ivec2 texel = ivec2(i % u_texSize.x, i / u_texSize.x);
    vec4 positionData = texelFetch(u_positions, texel, 0);
    // mod() is what upstream's wrapX/wrapY redraws achieve, at a point size of 1
    vec2 position = mod(positionData.rg + positionData.ba, u_dimensions);
    v_uv = position / u_dimensions;
    v_uv_position = (vec2(texel) + 0.5) / vec2(u_texSize);
    gl_Position = vec4(v_uv * 2.0 - 1.0, 0.0, 1.0);
    gl_PointSize = u_pointSize;
}`

const POINTS_FRAG_SRC = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 v_uv;
in vec2 v_uv_position;
uniform sampler2D u_ages;
uniform sampler2D u_velocity;
out float out_state;
void main() {
    float ageFraction = texture(u_ages, v_uv_position).x / ${PARTICLE_LIFETIME.toFixed(1)};
    // Fade the first 10% and the last 10%. Upstream's second term reads
    // "- 90.0", which needs an age fraction of 9 and so never fires.
    float opacity = mix(0.0, 1.0, min(ageFraction * 10.0, 1.0))
                  * mix(1.0, 0.0, clamp(ageFraction * 10.0 - 9.0, 0.0, 1.0));
    vec2 velocity = texture(u_velocity, v_uv).xy;
    // Show the fastest regions with darker color.
    float multiplier = clamp(dot(velocity, velocity) * 0.05 + 0.7, 0.0, 1.0);
    out_state = opacity * multiplier;
}`

const FADE_SRC =
    FRAG_HEAD +
    `
uniform sampler2D u_image;
uniform float u_increment;
out float out_color;
void main() {
    out_color = max(texture(u_image, v_uv).x + u_increment, 0.0);
}`

const COMPOSITE_SRC =
    FRAG_HEAD +
    `
uniform sampler2D u_trailState;
uniform vec3 u_background;
uniform vec3 u_particle;
out vec4 out_color;
void main() {
    out_color = vec4(mix(u_background, u_particle, clamp(texture(u_trailState, v_uv).x, 0.0, 1.0)), 1.0);
}`

// ------------------------------------------------------------------ helpers

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

// Color prop accepts hex, rgb() or a var() fallback — parse all of them.
function parseColor(str: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!str) return fb
    const s = str.trim()
    if (s[0] === "#") {
        let hex = s.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255]
        }
        return fb
    }
    const m = s.match(/[\d.]+/g)
    if (m && m.length >= 3) {
        return [
            Math.min(255, parseFloat(m[0])) / 255,
            Math.min(255, parseFloat(m[1])) / 255,
            Math.min(255, parseFloat(m[2])) / 255,
        ]
    }
    return fb
}

type Prog = { program: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("InkCurrent shader:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function link(
    gl: WebGL2RenderingContext,
    vertSrc: string,
    fragSrc: string,
    names: string[]
): Prog | null {
    const vs = compile(gl, gl.VERTEX_SHADER, vertSrc)
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc)
    if (!vs || !fs) return null
    const program = gl.createProgram()
    if (!program) return null
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.bindAttribLocation(program, 0, "a_pos")
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("InkCurrent link:", gl.getProgramInfoLog(program))
        return null
    }
    // Uniform locations are per program — never share a cache between them.
    const u: Record<string, WebGLUniformLocation | null> = {}
    for (const n of names) u[n] = gl.getUniformLocation(program, n)
    return { program, u }
}

type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number }

function makeTarget(
    gl: WebGL2RenderingContext,
    w: number,
    h: number,
    internal: number,
    format: number,
    type: number,
    filter: number,
    wrap: number,
    data: ArrayBufferView | null
): Target | null {
    const tex = gl.createTexture()
    const fbo = gl.createFramebuffer()
    if (!tex || !fbo) return null
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.error("InkCurrent: incomplete framebuffer")
        return null
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return { tex, fbo, w, h }
}

// ------------------------------------------------------------------ props

interface FlowGroup {
    strength?: number
    scale?: number
}

interface InkCurrentProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    density?: number
    speed?: number
    trail?: number
    hover?: number
    reach?: number
    flow?: FlowGroup
    width?: number
    height?: number
}

const D_FLOW: Required<FlowGroup> = { strength: 50, scale: 5 }

export default function InkCurrent(props: InkCurrentProps) {
    const {
        style,
        background = "#000000",
        baseColor = "#00FFE2",
        density = 111,
        speed = 74,
        trail = 100,
        hover = 138,
        reach = 112,
        flow,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined (rule 11).
    const F = { ...D_FLOW, ...(flow ?? {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Every live input is read from a ref inside the loop, so nothing here
    // rebuilds the GL context (rule 6).
    const vRef = useRef({
        background: [0.98, 0.922, 0.843] as [number, number, number],
        particle: [0, 0, 0.2] as [number, number, number],
        density: 0.1,
        speed: 1,
        trail: 15,
        force: TOUCH_FORCE_SCALE,
        radius: 15,
        flowAmp: 1,
        flowScale: 5,
    })
    vRef.current = {
        background: parseColor(background, [0.98, 0.922, 0.843]),
        particle: parseColor(baseColor, [0, 0, 0.2]),
        // Density 100 is upstream's 0.1 particles per px.
        density: Math.max(1, num(density, 100)) / 1000,
        speed: Math.max(0, num(speed, 50)) / 50,
        trail: Math.max(1, num(trail, 15)),
        force: (TOUCH_FORCE_SCALE * Math.max(0, num(hover, 100))) / 100,
        radius: Math.max(1, num(reach, 30)) / 2,
        flowAmp: Math.max(0, num(F.strength, 50)) / 50,
        flowScale: Math.max(1, num(F.scale, 5)),
    }

    // Pointer segments queued between frames, in sim px with y up.
    const segmentsRef = useRef<{ x1: number; y1: number; x2: number; y2: number }[]>([])
    const lastPointRef = useRef<{ id: number; x: number; y: number } | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            alpha: false,
            depth: false,
            stencil: false,
        })
        if (!gl) {
            console.error("InkCurrent: WebGL2 unavailable")
            return
        }

        // Float render targets. 32F for positions and ages where available: an
        // age near 1000 has half-float granularity 0.5, so a slow Speed
        // increment would round to zero and the particle would never respawn.
        const has32 = !!gl.getExtension("EXT_color_buffer_float")
        const has16 = has32 || !!gl.getExtension("EXT_color_buffer_half_float")
        if (!has16) {
            console.error("InkCurrent: no float color buffer support")
            return
        }
        const RGBA_STORE = has32 ? gl.RGBA32F : gl.RGBA16F
        const R_STORE = has32 ? gl.R32F : gl.R16F

        const progs = {
            advect: link(gl, VERT_SRC, ADVECT_SRC, ["u_state", "u_velocity", "u_dimensions", "u_dt"]),
            stir: link(gl, VERT_SRC, STIR_SRC, [
                "u_velocity", "u_aspect", "u_scale", "u_time", "u_amp", "u_drag",
            ]),
            divergence: link(gl, VERT_SRC, DIVERGENCE_SRC, ["u_vectorField", "u_pxSize"]),
            jacobi: link(gl, VERT_SRC, JACOBI_SRC, [
                "u_alpha", "u_beta", "u_pxSize", "u_previousState", "u_divergence",
            ]),
            gradientSub: link(gl, VERT_SRC, GRADIENT_SUB_SRC, [
                "u_pxSize", "u_scalarField", "u_vectorField",
            ]),
            touch: link(gl, VERT_SRC, TOUCH_SRC, [
                "u_velocity", "u_dimensions", "u_p1", "u_p2", "u_radius", "u_vector", "u_force",
            ]),
            age: link(gl, VERT_SRC, AGE_SRC, ["u_ages", "u_dt"]),
            advectParticles: link(gl, VERT_SRC, ADVECT_PARTICLES_SRC, [
                "u_dimensions", "u_positions", "u_velocity", "u_ages", "u_initialPositions", "u_step",
            ]),
            points: link(gl, POINTS_VERT_SRC, POINTS_FRAG_SRC, [
                "u_positions", "u_dimensions", "u_texSize", "u_pointSize", "u_ages", "u_velocity",
            ]),
            fade: link(gl, VERT_SRC, FADE_SRC, ["u_image", "u_increment"]),
            composite: link(gl, VERT_SRC, COMPOSITE_SRC, [
                "u_trailState", "u_background", "u_particle",
            ]),
        }
        for (const key of Object.keys(progs)) {
            if (!progs[key as keyof typeof progs]) return
        }
        const P = progs as { [K in keyof typeof progs]: Prog }

        // Sampler units, set once.
        const bindUnits = (p: Prog, pairs: [string, number][]) => {
            gl.useProgram(p.program)
            for (const [n, unit] of pairs) gl.uniform1i(p.u[n], unit)
        }
        bindUnits(P.advect, [["u_state", 0], ["u_velocity", 1]])
        bindUnits(P.stir, [["u_velocity", 0]])
        bindUnits(P.divergence, [["u_vectorField", 0]])
        bindUnits(P.jacobi, [["u_previousState", 0], ["u_divergence", 1]])
        bindUnits(P.gradientSub, [["u_scalarField", 0], ["u_vectorField", 1]])
        bindUnits(P.touch, [["u_velocity", 0]])
        bindUnits(P.age, [["u_ages", 0]])
        bindUnits(P.advectParticles, [
            ["u_positions", 0], ["u_velocity", 1], ["u_ages", 2], ["u_initialPositions", 3],
        ])
        bindUnits(P.points, [["u_positions", 0], ["u_ages", 1], ["u_velocity", 2]])
        bindUnits(P.fade, [["u_image", 0]])
        bindUnits(P.composite, [["u_trailState", 0]])

        // Constant Jacobi coefficients.
        gl.useProgram(P.jacobi.program)
        gl.uniform1f(P.jacobi.u.u_alpha, PRESSURE_CALC_ALPHA)
        gl.uniform1f(P.jacobi.u.u_beta, PRESSURE_CALC_BETA)

        const quadVao = gl.createVertexArray()
        gl.bindVertexArray(quadVao)
        const quadBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        // The point draw reads gl_VertexID and needs no attributes at all.
        const emptyVao = gl.createVertexArray()
        gl.bindVertexArray(null)

        gl.disable(gl.BLEND)
        gl.disable(gl.DEPTH_TEST)
        gl.disable(gl.CULL_FACE)

        // ------------------------------------------------------ state
        type PingPong = { a: Target; b: Target }
        let velocity: PingPong | null = null
        let pressure: PingPong | null = null
        let position: PingPong | null = null
        let age: PingPong | null = null
        let trailBuf: PingPong | null = null
        let divergence: Target | null = null
        let initialPosition: Target | null = null

        let simW = 0 // display size in CSS px, the space the sim works in
        let simH = 0
        let bufW = 0 // trail + canvas size in device px
        let bufH = 0
        let velW = 0
        let velH = 0
        let texW = 0
        let texH = 0
        let numParticles = 0
        let particleDensity = 0
        let ok = false

        const owned: (Target | null)[] = []
        const disposeTargets = () => {
            for (const t of owned) {
                if (!t) continue
                gl.deleteTexture(t.tex)
                gl.deleteFramebuffer(t.fbo)
            }
            owned.length = 0
            velocity = pressure = position = age = trailBuf = null
            divergence = initialPosition = null
        }

        const track = (t: Target | null): Target | null => {
            owned.push(t)
            return t
        }

        const pair = (
            w: number, h: number, internal: number, format: number,
            type: number, filter: number, wrap: number,
            data: ArrayBufferView | null
        ): PingPong | null => {
            const a = track(makeTarget(gl, w, h, internal, format, type, filter, wrap, data))
            const b = track(makeTarget(gl, w, h, internal, format, type, filter, wrap, data))
            return a && b ? { a, b } : null
        }

        const clearTarget = (t: Target) => {
            gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo)
            gl.viewport(0, 0, t.w, t.h)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
        }

        const rebuild = (w: number, h: number, bw: number, bh: number, densityValue: number) => {
            disposeTargets()
            simW = w
            simH = h
            bufW = bw
            bufH = bh
            particleDensity = densityValue
            velW = Math.ceil(w / VELOCITY_SCALE_FACTOR)
            velH = Math.ceil(h / VELOCITY_SCALE_FACTOR)

            velocity = pair(velW, velH, gl.RG16F, gl.RG, gl.HALF_FLOAT, gl.LINEAR, gl.REPEAT, null)
            divergence = track(
                makeTarget(gl, velW, velH, R_STORE, gl.RED, gl.FLOAT, gl.NEAREST, gl.REPEAT, null)
            )
            pressure = pair(velW, velH, R_STORE, gl.RED, gl.FLOAT, gl.NEAREST, gl.REPEAT, null)
            trailBuf = pair(bw, bh, gl.R16F, gl.RED, gl.HALF_FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, null)

            // Every texel is a live particle: the grid is filled to its corner
            // so there are no dead slots parked at the origin.
            const want = Math.min(Math.ceil(w * h * densityValue), MAX_NUM_PARTICLES)
            texW = Math.max(1, Math.ceil(Math.sqrt(want)))
            texH = Math.max(1, Math.ceil(want / texW))
            numParticles = texW * texH

            const positions = new Float32Array(numParticles * 4)
            const ages = new Float32Array(numParticles)
            for (let i = 0; i < numParticles; i++) {
                positions[4 * i] = Math.random() * w
                positions[4 * i + 1] = Math.random() * h
                ages[i] = Math.round(Math.random() * PARTICLE_LIFETIME)
            }
            position = pair(texW, texH, RGBA_STORE, gl.RGBA, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, positions)
            initialPosition = track(
                makeTarget(gl, texW, texH, RGBA_STORE, gl.RGBA, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, positions)
            )
            age = pair(texW, texH, R_STORE, gl.RED, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, ages)

            ok = !!(velocity && divergence && pressure && trailBuf && position && initialPosition && age)
            if (!ok) return

            clearTarget(velocity!.a)
            clearTarget(velocity!.b)
            clearTarget(pressure!.a)
            clearTarget(pressure!.b)
            clearTarget(trailBuf!.a)
            clearTarget(trailBuf!.b)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)

            const pxSize: [number, number] = [1 / velW, 1 / velH]
            gl.useProgram(P.divergence.program)
            gl.uniform2fv(P.divergence.u.u_pxSize, pxSize)
            gl.useProgram(P.jacobi.program)
            gl.uniform2fv(P.jacobi.u.u_pxSize, pxSize)
            gl.useProgram(P.gradientSub.program)
            gl.uniform2fv(P.gradientSub.u.u_pxSize, pxSize)
        }

        const bindTex = (unit: number, tex: WebGLTexture) => {
            gl.activeTexture(gl.TEXTURE0 + unit)
            gl.bindTexture(gl.TEXTURE_2D, tex)
        }

        const drawTo = (t: Target | null) => {
            if (t) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo)
                gl.viewport(0, 0, t.w, t.h)
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null)
                gl.viewport(0, 0, bufW, bufH)
            }
            gl.bindVertexArray(quadVao)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        const swap = (pp: PingPong) => {
            const t = pp.a
            pp.a = pp.b
            pp.b = t
        }

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            raf = requestAnimationFrame(render)
            const v = vRef.current

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            // width/height props are not necessarily numeric, so the live box
            // is measured off the element (rule G — never getBoundingClientRect).
            const cw = Math.max(1, Math.round(canvas.clientWidth || num(width, 1200)))
            const ch = Math.max(1, Math.round(canvas.clientHeight || num(height, 800)))
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
            if (cw !== simW || ch !== simH || bw !== bufW || bh !== bufH || v.density !== particleDensity) {
                rebuild(cw, ch, bw, bh, v.density)
                segmentsRef.current.length = 0
                lastPointRef.current = null
            }
            if (!ok || !velocity || !pressure || !position || !age || !trailBuf || !divergence || !initialPosition) {
                return
            }

            const elapsed = (now - last) / 1000
            last = now
            // Upstream advances one step per frame; this is that step, made
            // frame-rate independent, with Speed riding on it.
            const dt = Math.min(MAX_DT_STEPS, Math.max(0, elapsed * 60)) * v.speed
            clock = (clock + elapsed) % FLOW_LOOP

            // 1. Advect the velocity field through itself.
            gl.useProgram(P.advect.program)
            gl.uniform2f(P.advect.u.u_dimensions, simW, simH)
            gl.uniform1f(P.advect.u.u_dt, dt)
            bindTex(0, velocity.a.tex)
            bindTex(1, velocity.a.tex)
            drawTo(velocity.b)
            swap(velocity)

            // 2. Ambient stir. Skipped entirely at Flow 0, which is upstream.
            if (v.flowAmp > 0 && dt > 0) {
                gl.useProgram(P.stir.program)
                gl.uniform2f(P.stir.u.u_aspect, simW / simH, 1)
                gl.uniform1f(P.stir.u.u_scale, v.flowScale)
                gl.uniform1f(P.stir.u.u_time, clock)
                gl.uniform1f(P.stir.u.u_amp, FLOW_FORCE * v.flowAmp * dt)
                gl.uniform1f(P.stir.u.u_drag, Math.min(1, FLOW_DRAG * dt))
                bindTex(0, velocity.a.tex)
                drawTo(velocity.b)
                swap(velocity)
            }

            // 3. Pointer force, one pass per queued segment.
            const segs = segmentsRef.current
            if (segs.length > 0) {
                gl.useProgram(P.touch.program)
                gl.uniform2f(P.touch.u.u_dimensions, simW, simH)
                gl.uniform1f(P.touch.u.u_radius, v.radius)
                gl.uniform1f(P.touch.u.u_force, v.force)
                const start = Math.max(0, segs.length - MAX_SEGMENTS_PER_FRAME)
                for (let i = start; i < segs.length; i++) {
                    const s = segs[i]
                    gl.uniform2f(P.touch.u.u_p1, s.x1, s.y1)
                    gl.uniform2f(P.touch.u.u_p2, s.x2, s.y2)
                    gl.uniform2f(P.touch.u.u_vector, s.x2 - s.x1, s.y2 - s.y1)
                    bindTex(0, velocity.a.tex)
                    drawTo(velocity.b)
                    swap(velocity)
                }
                segs.length = 0
            }

            // 4. Divergence of the advected field.
            gl.useProgram(P.divergence.program)
            bindTex(0, velocity.a.tex)
            drawTo(divergence)

            // 5. Pressure, by Jacobi iteration.
            gl.useProgram(P.jacobi.program)
            bindTex(1, divergence.tex)
            for (let i = 0; i < NUM_JACOBI_STEPS; i++) {
                bindTex(0, pressure.a.tex)
                drawTo(pressure.b)
                swap(pressure)
            }

            // 6. Subtract the pressure gradient — the field is now divergence-free.
            gl.useProgram(P.gradientSub.program)
            bindTex(0, pressure.a.tex)
            bindTex(1, velocity.a.tex)
            drawTo(velocity.b)
            swap(velocity)

            // 7. Age the particles.
            gl.useProgram(P.age.program)
            gl.uniform1f(P.age.u.u_dt, dt)
            bindTex(0, age.a.tex)
            drawTo(age.b)
            swap(age)

            // 8. Fade the existing trails.
            gl.useProgram(P.fade.program)
            gl.uniform1f(P.fade.u.u_increment, -dt / v.trail)
            bindTex(0, trailBuf.a.tex)
            drawTo(trailBuf.b)
            swap(trailBuf)

            // 9. Advect and draw the particles, in substeps, into the trail buffer.
            const pointSize = Math.max(1, dpr)
            for (let i = 0; i < NUM_RENDER_STEPS; i++) {
                gl.useProgram(P.advectParticles.program)
                gl.uniform2f(P.advectParticles.u.u_dimensions, simW, simH)
                gl.uniform1f(P.advectParticles.u.u_step, dt / NUM_RENDER_STEPS)
                bindTex(0, position.a.tex)
                bindTex(1, velocity.a.tex)
                bindTex(2, age.a.tex)
                bindTex(3, initialPosition.tex)
                drawTo(position.b)
                swap(position)

                gl.useProgram(P.points.program)
                gl.uniform2f(P.points.u.u_dimensions, simW, simH)
                gl.uniform2i(P.points.u.u_texSize, texW, texH)
                gl.uniform1f(P.points.u.u_pointSize, pointSize)
                bindTex(0, position.a.tex)
                bindTex(1, age.a.tex)
                bindTex(2, velocity.a.tex)
                gl.bindFramebuffer(gl.FRAMEBUFFER, trailBuf.a.fbo)
                gl.viewport(0, 0, trailBuf.a.w, trailBuf.a.h)
                gl.bindVertexArray(emptyVao)
                gl.drawArrays(gl.POINTS, 0, numParticles)
            }

            // 10. Composite the trails to the screen.
            gl.useProgram(P.composite.program)
            gl.uniform3fv(P.composite.u.u_background, v.background)
            gl.uniform3fv(P.composite.u.u_particle, v.particle)
            bindTex(0, trailBuf.a.tex)
            drawTo(null)
        }

        raf = requestAnimationFrame(render)

        // ------------------------------------------------------ pointer
        // offsetX/offsetY are in the target's own CSS px, so they survive any
        // page zoom that getBoundingClientRect() would carry in.
        const onPointerMove = (e: PointerEvent) => {
            const x = e.offsetX
            const y = e.offsetY
            const prev = lastPointRef.current
            lastPointRef.current = { id: e.pointerId, x, y }
            if (!prev || prev.id !== e.pointerId) return
            if (prev.x === x && prev.y === y) return
            // Texture space has y up, so the y delta flips sign on its own -
            // which is upstream's explicit -(current.y - last.y).
            segmentsRef.current.push({
                x1: prev.x, y1: simH - prev.y,
                x2: x, y2: simH - y,
            })
        }
        const onPointerStop = () => {
            lastPointRef.current = null
        }
        canvas.addEventListener("pointermove", onPointerMove)
        // Releases go on window, or a pointer that leaves mid-drag never releases.
        window.addEventListener("pointerup", onPointerStop)
        window.addEventListener("pointercancel", onPointerStop)
        canvas.addEventListener("pointerleave", onPointerStop)

        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointermove", onPointerMove)
            canvas.removeEventListener("pointerleave", onPointerStop)
            window.removeEventListener("pointerup", onPointerStop)
            window.removeEventListener("pointercancel", onPointerStop)
            disposeTargets()
            for (const key of Object.keys(P)) gl.deleteProgram(P[key as keyof typeof P].program)
            gl.deleteBuffer(quadBuf)
            gl.deleteVertexArray(quadVao)
            gl.deleteVertexArray(emptyVao)
            // No loseContext(): getContext hands back the same context per
            // canvas, so a StrictMode remount would reuse a force-lost one.
        }
    }, [])

    return (
        <div
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                minWidth: 1200,
                minHeight: 800,
                width: typeof width === "number" && width > 0 ? width : "100%",
                height: typeof height === "number" && height > 0 ? height : "100%",
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
                }}
            />
        </div>
    )
}
