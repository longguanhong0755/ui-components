"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * CRYSTAL CALDERA — glowing balls rain onto a wireframe caldera, bounce,
 * shrink with every hit and spread ripples in their own colour across the
 * surface. Balls that collect in the central pool for five seconds blow out
 * radially and send a rainbow flash racing from the centre to the rim.
 *
 * Ported from wally0932's "Crystal Balls — ripples" (OpenProcessing 2969125,
 * three.js r128 + OrbitControls + UnrealBloomPass). What it DOES is the
 * reference's, line for line: the terrain, the per-frame physics, the ripple
 * rings, the grid glow, the pool fuse, the rainbow wave, the slow auto-orbit
 * and drag-to-orbit with the same damping.
 *
 * THE MACHINERY IS REBUILT (rule 10: no `three`):
 *
 *   - The terrain height is evaluated in the VERTEX SHADER from a `surfT`
 *     uniform, so the "breathing" costs nothing; the reference rewrote every
 *     grid vertex on the CPU each frame. The CPU keeps the same domeY() for
 *     the physics and the pointer ray.
 *   - All 73 grid lines are one gl.LINES draw. Each line's live colour × glow
 *     sits in a uniform array indexed per vertex.
 *   - Ripples are one 72-point loop template; centre, radius, colour and
 *     opacity are uniforms, height again from the vertex shader. Rings fade
 *     out over the rim with the grid (the reference let them droop off the
 *     edge into empty space).
 *   - The balls share one 48×48 sphere (three's SphereGeometry winding, so the
 *     back faces cull the same way) and are drawn back to front around the
 *     grid, as three's transparent sort did.
 *   - The bloom is UnrealBloomPass r128 rebuilt pass for pass: luminance high
 *     pass (0.6, smooth 0.01) at half res, five mips blurred separably with
 *     kernels 3/5/7/9/11 (sigma = radius, texSize = the output level), the
 *     composite with factors [1 .8 .6 .4 .2] lerped by radius 0.6 into a
 *     half-res target, then added over the scene. Strength 1.1. Sizes follow
 *     the device-px buffer, as the reference's composer did.
 *   - Physics runs on a fixed 60 Hz step, because every constant in it is per
 *     frame (gravity 0.5/frame, ripple 5.5/frame); a 120 Hz display would
 *     otherwise run the whole scene at double speed. The reference's
 *     Date.now() throttles read the simulated clock instead.
 *
 * BACKGROUND. The scene buffer clears transparent: grid and ripples add
 * light with alpha untouched, balls blend premultiplied. The high pass puts
 * Background back under the scene before measuring luminance, so the bloom
 * threshold sees the same pixels the reference's opaque buffer did. The final
 * pass composites Background under the scene too and writes rgb <= alpha:
 * alpha-0 light is an invalid premultiplied pixel, and WebKit drops it (the
 * caldera vanished there while Chrome showed it). The root keeps the CSS
 * background for first paint and for a transparent Background.
 *
 * POINTER — added on request; the reference only orbits.
 *
 *   - Drag orbits (the reference's OrbitControls rotate: 2π per host height,
 *     damping 0.05, auto-rotate pauses while held). Wheel zoom and right-drag
 *     pan are NOT ported — inside a page they would steal scroll; `Distance`
 *     replaces the zoom. Touch keeps vertical page scroll (pan-y), so touch
 *     orbits horizontally only.
 *   - Hover: the pointer ray is marched onto the terrain. Every TRAIL_STEP
 *     world units of travel it drops a ripple whose colour walks the balls'
 *     palette, and lights the grid under it — the pointer paints ripples.
 *   - Balls inside Reach of the pointer get batted away and up (Push), with
 *     a landing flash; a per-ball cooldown stops it firing every frame.
 *   - Click (no drag) drops a new ball from the sky straight above the point,
 *     past the Balls limit, up to MAX_BALLS.
 *
 * WHAT WAS CUT (rule 8b, frozen as constants): bloom strength / radius /
 * threshold, the pool radius and fuse, ball size range, spawn area and
 * interval, restitution and friction, the crest ring's brightness — none of
 * them was a control in the reference either. The reference's lights and fog
 * are dropped outright: every material was a ShaderMaterial or fog:false, so
 * neither ever reached a pixel.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

/* ---------------------------------------------------------------- constants */

const TAU = Math.PI * 2
const STEP = 1 / 60 // reference physics are per frame at 60 fps
const STEP_MS = 1000 / 60
const MAX_STEPS = 4 // catch-up cap after a stall
const MAX_DPR = 2
const RADIUS = 500 // caldera radius, world units
const TARGET_Y = 285 // orbit target height
const FOV_TAN = Math.tan((60 * Math.PI) / 360) // 60° vertical
const REF_ASPECT = 1.2 // narrower than this widens the fov to keep the width
const NEAR = 1
const FAR = 5000
const POOL_R = 120 // "pooled" = visible ball within this of the centre
const POOL_FUSE = 5 // seconds pooled before the blowout
const MAX_BALLS = 100
const RIPPLE_SEG = 72
const SEGMENTS = 48 // radial lines, and points per circle
const CREST_OPACITY = 0.5
const GRID_OPACITY = 0.18
const BALL_LIGHT = [200, 1400, 800]
// Bloom (UnrealBloomPass(res, 1.1, 0.6, 0.6)).
const BLOOM_STRENGTH = 1.1
const BLOOM_RADIUS = 0.6
const BLOOM_THRESHOLD = 0.6
const BLOOM_SMOOTH = 0.01
const MIPS = 5
const KERNELS = [3, 5, 7, 9, 11]
const BLOOM_FACTORS = [1, 0.8, 0.6, 0.4, 0.2]
// Pointer.
const TRAIL_STEP = 60 // world units of pointer travel per trail ripple
const TRAIL_HUE = 0.07 // palette step per trail ripple
const TRAIL_GLOW_RANGE = 140
const KICK_COOLDOWN = 400 // ms between kicks on one ball
const CLICK_SLOP = 6 // px of movement that still counts as a click

/* ------------------------------------------------------------------- colour */

type RGBA = [number, number, number, number]

function parseColor(input: string | undefined, fallback: RGBA): RGBA {
    if (!input) return fallback
    let s = input.trim()
    const v = s.match(/^var\(\s*--[^,)]+,\s*(.+)\)$/i)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        const n = parseInt(h.slice(0, 6), 16)
        if (!Number.isFinite(n)) return fallback
        const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a]
    }
    const rgb = s.match(/^rgba?\(([^)]+)\)/i)
    if (rgb) {
        const p = rgb[1].split(/[,\s/]+/).filter(Boolean)
        const ch = (i: number) => {
            const x = parseFloat(p[i])
            return Number.isFinite(x) ? x / 255 : 0
        }
        let a = 1
        if (p.length > 3) {
            const x = parseFloat(p[3])
            a = Number.isFinite(x) ? (p[3].endsWith("%") ? x / 100 : x) : 1
        }
        return [ch(0), ch(1), ch(2), a]
    }
    const hsl = s.match(/^hsla?\(([^)]+)\)/i)
    if (hsl) {
        const p = hsl[1].split(/[,\s/]+/).filter(Boolean).map((x) => parseFloat(x))
        const h = ((((p[0] || 0) % 360) + 360) % 360) / 360
        const sat = (p[1] || 0) / 100
        const l = (p[2] || 0) / 100
        const c = (1 - Math.abs(2 * l - 1)) * sat
        const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
        const m = l - c / 2
        const k = Math.floor(h * 6) % 6
        const t = [
            [c, x, 0],
            [x, c, 0],
            [0, c, x],
            [0, x, c],
            [x, 0, c],
            [c, 0, x],
        ][k]
        const a = p.length > 3 && Number.isFinite(p[3]) ? p[3] : 1
        return [t[0] + m, t[1] + m, t[2] + m, a]
    }
    return fallback
}

// The balls' cosine palette (Matthias Hurrle style), clamped per channel.
function paletteColor(k: number): [number, number, number] {
    const a = [0.75, 0.5, 0.5], b = [0.5, 0.5, 0.75], c = [1, 1.8, 1], d = [0.2, 0.4, 0.8]
    const ch = (i: number) => Math.min(1, Math.max(0, a[i] + b[i] * Math.cos(TAU * (c[i] * k + d[i]))))
    return [ch(0), ch(1), ch(2)]
}

/* ------------------------------------------------------------------ terrain */

// "Caldera singing bowl": sunken pool, crest ring at 45% radius, low rim.
// Axisymmetric, so landing ripples line up with the grid's contour rings.
function domeY(x: number, z: number, t: number) {
    const d = Math.sqrt(x * x + z * z) / RADIUS
    const crest = 150 * Math.exp(-((d - 0.45) * (d - 0.45)) / (2 * 0.16 * 0.16))
    const bowl = -90 * Math.exp(-(d * d) / (2 * 0.3 * 0.3))
    const fall = -120 * d * d
    const env = 6.75 * d * d * (1 - d)
    const tide = 8 * env * Math.cos(3 * Math.PI * d)
    const breath = 8 * Math.exp(-(d * d) / (2 * 0.3 * 0.3)) * Math.sin(0.18 * t)
    return 300 + crest + bowl + fall + tide + breath
}

const DOME_GLSL = `
float domeY(vec2 p) {
    float d = length(p) / ${RADIUS.toFixed(1)};
    float crest = 150.0 * exp(-((d - 0.45) * (d - 0.45)) / (2.0 * 0.16 * 0.16));
    float bowl = -90.0 * exp(-(d * d) / (2.0 * 0.3 * 0.3));
    float fall = -120.0 * d * d;
    float env = 6.75 * d * d * (1.0 - d);
    float tide = 8.0 * env * cos(3.0 * 3.14159265 * d);
    float breath = 8.0 * exp(-(d * d) / (2.0 * 0.3 * 0.3)) * sin(0.18 * uSurfT);
    return 300.0 + crest + bowl + fall + tide + breath;
}`

/* ------------------------------------------------------------------ shaders */

const GRID_VS = `#version 300 es
precision highp float;
in vec4 aP;     // x, z, alpha, rad
in float aLine;
uniform mat4 uVP;
uniform float uSurfT;
uniform vec4 uLine[${SEGMENTS + 25}];
out float vAlpha;
out float vRad;
out vec3 vBase;
${DOME_GLSL}
void main() {
    vAlpha = aP.z;
    vRad = aP.w;
    vBase = uLine[int(aLine + 0.5)].rgb;
    gl_Position = uVP * vec4(aP.x, domeY(aP.xy), aP.y, 1.0);
}`

const GRID_FS = `#version 300 es
precision highp float;
uniform float uRainbow;
uniform float uWave;
in float vAlpha;
in float vRad;
in vec3 vBase;
out vec4 o;
vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 0.6666667, 0.3333333)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
void main() {
    // Rainbow from the centre out (radius = hue); the leading edge is brightest.
    float filled = 1.0 - smoothstep(uWave - 0.04, uWave + 0.04, vRad);
    float edge = smoothstep(0.14, 0.0, abs(vRad - uWave));
    vec3 rainbow = hsv2rgb(vec3(fract(vRad * 0.92), 0.95, 1.0));
    float rb = uRainbow * (filled * 0.5 + edge * 1.6);
    o = vec4((vBase + rainbow * rb) * vAlpha, 0.0);
}`

const RIPPLE_VS = `#version 300 es
precision highp float;
in float aA; // angle
uniform mat4 uVP;
uniform float uSurfT;
uniform vec3 uRing; // cx, cz, r
out float vFade;
${DOME_GLSL}
void main() {
    vec2 p = uRing.xy + vec2(cos(aA), sin(aA)) * uRing.z;
    // The grid's own rim fade: past the edge the terrain drops away and a
    // ring would droop into empty space below the caldera.
    vFade = clamp(1.0 - (length(p) - ${(RADIUS - 50).toFixed(1)}) / 100.0, 0.0, 1.0);
    gl_Position = uVP * vec4(p.x, domeY(p) + 2.5, p.y, 1.0);
}`

const RIPPLE_FS = `#version 300 es
precision highp float;
uniform vec4 uCol; // rgb, opacity
in float vFade;
out vec4 o;
void main() { o = vec4(uCol.rgb * uCol.a * vFade, 0.0); }`

const BALL_VS = `#version 300 es
precision highp float;
in vec3 aP; // unit sphere; position == normal
uniform mat4 uVP;
uniform vec3 uCenter;
uniform vec3 uBall; // base radius, scale, pulse
out vec3 vN;
out vec3 vW;
void main() {
    // Object-space beat (normal * sin * 5% r), then the shrink scale.
    vec3 local = aP * uBall.x + aP * uBall.z;
    vW = uCenter + local * uBall.y;
    vN = aP;
    gl_Position = uVP * vec4(vW, 1.0);
}`

const BALL_FS = `#version 300 es
precision highp float;
uniform float uK, uOpacity, uGlow;
uniform vec3 uLight, uCam;
in vec3 vN;
in vec3 vW;
out vec4 o;
#define TAU 6.2831853
vec3 palette(float k) {
    vec3 a = vec3(.75, .5, .5), b = vec3(.5, .5, .75), c = vec3(1.0, 1.8, 1.0), d = vec3(.2, .4, .8);
    return a + b * cos(TAU * (c * k + d));
}
void main() {
    vec3 n = normalize(vN);
    vec3 l = normalize(uLight - vW);
    vec3 v = normalize(uCam - vW);
    vec3 pal = palette(uK);
    float diff = clamp(dot(n, l), 0.0, 1.0);
    float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.0);
    float spec = pow(max(0.0, dot(reflect(-l, n), v)), 40.0);
    vec3 col = pal * (0.28 + diff * 0.9);
    col += fres * pal * 0.9;
    col += spec * vec3(1.0);
    col += uGlow * pal;
    // A fixed-point target clamps the colour before it blends.
    float a = clamp(uOpacity, 0.0, 1.0);
    o = vec4(min(col, vec3(1.0)) * a, a);
}`

const QUAD_VS = `#version 300 es
in vec2 aQ;
out vec2 vUv;
void main() { vUv = aQ * 0.5 + 0.5; gl_Position = vec4(aQ, 0.0, 1.0); }`

const HIGH_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec3 uBg;
in vec2 vUv;
out vec4 o;
void main() {
    vec4 s = texture(uTex, vUv);
    // The reference buffer was opaque: put the background back under.
    vec3 c = min(s.rgb + uBg * (1.0 - s.a), vec3(1.0));
    float v = dot(c, vec3(0.299, 0.587, 0.114));
    float a = smoothstep(${BLOOM_THRESHOLD.toFixed(3)}, ${(BLOOM_THRESHOLD + BLOOM_SMOOTH).toFixed(3)}, v);
    o = vec4(c * a, 1.0);
}`

const BLUR_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uInvSize;
uniform vec2 uDir;
uniform int uRadius;
in vec2 vUv;
out vec4 o;
float pdf(float x, float s) { return 0.39894 * exp(-0.5 * x * x / (s * s)) / s; }
void main() {
    float sg = float(uRadius);
    float wsum = pdf(0.0, sg);
    vec3 sum = texture(uTex, vUv).rgb * wsum;
    for (int i = 1; i < 11; i++) {
        if (i >= uRadius) break;
        float x = float(i);
        float w = pdf(x, sg);
        vec2 off = uDir * uInvSize * x;
        sum += (texture(uTex, vUv + off).rgb + texture(uTex, vUv - off).rgb) * w;
        wsum += 2.0 * w;
    }
    o = vec4(sum / wsum, 1.0);
}`

const COMP_FS = `#version 300 es
precision highp float;
uniform sampler2D uB0, uB1, uB2, uB3, uB4;
uniform float uF[5];
in vec2 vUv;
out vec4 o;
void main() {
    vec3 c = uF[0] * texture(uB0, vUv).rgb + uF[1] * texture(uB1, vUv).rgb
           + uF[2] * texture(uB2, vUv).rgb + uF[3] * texture(uB3, vUv).rgb
           + uF[4] * texture(uB4, vUv).rgb;
    o = vec4(c, 1.0);
}`

const FINAL_FS = `#version 300 es
precision highp float;
uniform sampler2D uScene, uBloom;
uniform vec4 uBg; // straight rgb, alpha
in vec2 vUv;
out vec4 o;
void main() {
    vec4 s = texture(uScene, vUv);
    vec3 b = texture(uBloom, vUv).rgb;
    // The scene buffer holds additive light with alpha 0 (grid, ripples,
    // bloom). That is not a valid premultiplied pixel: Chrome shows it as
    // added light, WebKit drops it and the whole caldera vanishes. So put
    // Background under here and emit a valid pixel (rgb <= alpha). With an
    // opaque Background this is exactly the reference's opaque buffer.
    vec3 c = s.rgb + uBg.rgb * uBg.a * (1.0 - s.a) + b;
    float a = s.a + uBg.a * (1.0 - s.a);
    a = clamp(max(a, max(c.r, max(c.g, c.b))), 0.0, 1.0);
    o = vec4(min(c, vec3(a)), a);
}`

/* --------------------------------------------------------------------- maths */

function mul4(a: Float32Array, b: Float32Array, out: Float32Array) {
    for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++) {
            let s = 0
            for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]
            out[c * 4 + r] = s
        }
}

/* ------------------------------------------------------------------- types */

interface Cursor {
    reach?: number
    push?: number
}

interface Props {
    background?: string
    baseColor?: string
    accentColor?: string
    balls?: number
    speed?: number
    distance?: number
    rippleSpread?: number
    cursor?: Cursor
    style?: React.CSSProperties
}

const CURSOR_DEFAULTS: Required<Cursor> = { reach: 20, push: 100 }

interface Ball {
    k: number
    color: [number, number, number]
    x: number; y: number; z: number
    vx: number; vy: number; vz: number
    baseR: number
    scaleF: number
    radius: number
    time: number
    phase: number
    opacity: number
    fade: 0 | 1 | 2 // in, visible, out
    fadeTime: number
    glow: number
    lastBounce: number
    lastShrink: number
    lastKick: number
}

interface Ripple {
    cx: number; cz: number
    color: [number, number, number]
    r: number
    maxR: number
    opacity: number
}

/* ---------------------------------------------------------------- component */

export default function CrystalCaldera(props: Props) {
    const {
        background = "#000000",
        baseColor = "#64ffda",
        accentColor = "#FF0000",
        balls = 100,
        speed = 50,
        distance = 1000,
        rippleSpread = 300,
        cursor = {"push":100,"reach":6},
        style,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const live = useRef({ background, baseColor, accentColor, balls, speed, distance, rippleSpread, cursor: CURSOR_DEFAULTS })
    // A group never opened arrives undefined — spread-merge over the defaults.
    live.current = {
        background,
        baseColor,
        accentColor,
        balls,
        speed,
        distance,
        rippleSpread,
        cursor: {
            defaultValue: {"reach":20,"push":100}, ...CURSOR_DEFAULTS, ...(cursor ?? {}) },
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            depth: false,
            alpha: true,
            premultipliedAlpha: true,
        }) as WebGL2RenderingContext | null
        if (!gl) return

        /* ---- programs */
        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)!
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
                console.error("CrystalCaldera shader:", gl.getShaderInfoLog(sh))
            return sh
        }
        const programs: WebGLProgram[] = []
        const program = (vs: string, fs: string) => {
            const p = gl.createProgram()!
            const a = compile(gl.VERTEX_SHADER, vs), b = compile(gl.FRAGMENT_SHADER, fs)
            gl.attachShader(p, a)
            gl.attachShader(p, b)
            gl.linkProgram(p)
            if (!gl.getProgramParameter(p, gl.LINK_STATUS))
                console.error("CrystalCaldera link:", gl.getProgramInfoLog(p))
            gl.deleteShader(a)
            gl.deleteShader(b)
            programs.push(p)
            // Uniform locations are per program: look them up on this one.
            const cache = new Map<string, WebGLUniformLocation | null>()
            const u = (name: string) => {
                if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name))
                return cache.get(name)!
            }
            return { p, u }
        }
        const grid = program(GRID_VS, GRID_FS)
        const ripple = program(RIPPLE_VS, RIPPLE_FS)
        const ball = program(BALL_VS, BALL_FS)
        const high = program(QUAD_VS, HIGH_FS)
        const blur = program(QUAD_VS, BLUR_FS)
        const comp = program(QUAD_VS, COMP_FS)
        const fin = program(QUAD_VS, FINAL_FS)

        /* ---- grid geometry: 48 radial lines + 25 contour circles */
        const radialPts: Float32Array[] = [] // xz per line, for the glow test
        const circleR: number[] = []
        const crestLine: boolean[] = []
        const verts: number[] = []
        const fade = (r: number) => {
            const fs = RADIUS - 50
            return r > fs ? Math.max(0, 1 - (r - fs) / 100) : 1
        }
        const pushStrip = (pts: number[][], line: number) => {
            for (let i = 0; i + 1 < pts.length; i++)
                for (const q of [pts[i], pts[i + 1]]) verts.push(q[0], q[1], q[2], q[3], line)
        }
        for (let i = 0; i < SEGMENTS; i++) {
            const ang = (i / SEGMENTS) * TAU
            const pts: number[][] = []
            const xz: number[] = []
            for (let r = 0; r <= RADIUS + 100; r += 5) {
                const x = Math.cos(ang) * r, z = Math.sin(ang) * r
                pts.push([x, z, fade(r), r / RADIUS])
                xz.push(x, z)
            }
            radialPts.push(new Float32Array(xz))
            crestLine.push(false)
            pushStrip(pts, i)
        }
        // Same float accumulation as the reference, so the ring set matches.
        for (let r = 0; r <= RADIUS; r += RADIUS / 24) {
            const line = SEGMENTS + circleR.length
            const pts: number[][] = []
            for (let i = 0; i <= SEGMENTS; i++) {
                const ang = (i / SEGMENTS) * TAU
                pts.push([Math.cos(ang) * r, Math.sin(ang) * r, fade(r), r / RADIUS])
            }
            circleR.push(r)
            // Only the ring on the crest (d ≈ 0.45) is bright.
            crestLine.push(Math.abs(r - 0.45 * RADIUS) <= RADIUS / 48)
            pushStrip(pts, line)
        }
        const LINES = crestLine.length
        const gridCount = verts.length / 5
        const gridVao = gl.createVertexArray()!
        gl.bindVertexArray(gridVao)
        const gridBuf = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)
        {
            const aP = gl.getAttribLocation(grid.p, "aP")
            const aL = gl.getAttribLocation(grid.p, "aLine")
            gl.enableVertexAttribArray(aP)
            gl.vertexAttribPointer(aP, 4, gl.FLOAT, false, 20, 0)
            gl.enableVertexAttribArray(aL)
            gl.vertexAttribPointer(aL, 1, gl.FLOAT, false, 20, 16)
        }

        /* ---- ripple loop template */
        const ripVao = gl.createVertexArray()!
        gl.bindVertexArray(ripVao)
        const ripBuf = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, ripBuf)
        {
            const a = new Float32Array(RIPPLE_SEG)
            for (let i = 0; i < RIPPLE_SEG; i++) a[i] = (i / RIPPLE_SEG) * TAU
            gl.bufferData(gl.ARRAY_BUFFER, a, gl.STATIC_DRAW)
            const aA = gl.getAttribLocation(ripple.p, "aA")
            gl.enableVertexAttribArray(aA)
            gl.vertexAttribPointer(aA, 1, gl.FLOAT, false, 0, 0)
        }

        /* ---- sphere (three's SphereGeometry(1, 48, 48) layout and winding) */
        const sphVao = gl.createVertexArray()!
        gl.bindVertexArray(sphVao)
        const sphBuf = gl.createBuffer()!
        const sphIdx = gl.createBuffer()!
        let sphCount = 0
        {
            const WS = 48, HS = 48
            const pos: number[] = []
            const idx: number[] = []
            const g: number[][] = []
            let n = 0
            for (let iy = 0; iy <= HS; iy++) {
                const row: number[] = []
                const v = iy / HS
                for (let ix = 0; ix <= WS; ix++) {
                    const u = ix / WS
                    pos.push(
                        -Math.cos(u * TAU) * Math.sin(v * Math.PI),
                        Math.cos(v * Math.PI),
                        Math.sin(u * TAU) * Math.sin(v * Math.PI)
                    )
                    row.push(n++)
                }
                g.push(row)
            }
            for (let iy = 0; iy < HS; iy++)
                for (let ix = 0; ix < WS; ix++) {
                    const a = g[iy][ix + 1], b = g[iy][ix], c = g[iy + 1][ix], d = g[iy + 1][ix + 1]
                    if (iy !== 0) idx.push(a, b, d)
                    if (iy !== HS - 1) idx.push(b, c, d)
                }
            gl.bindBuffer(gl.ARRAY_BUFFER, sphBuf)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphIdx)
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW)
            sphCount = idx.length
            const aP = gl.getAttribLocation(ball.p, "aP")
            gl.enableVertexAttribArray(aP)
            gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0)
        }

        /* ---- full-screen triangle for the post passes */
        const quadVao = gl.createVertexArray()!
        gl.bindVertexArray(quadVao)
        const quadBuf = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        for (const pr of [high, blur, comp, fin]) {
            const a = gl.getAttribLocation(pr.p, "aQ")
            if (a >= 0) {
                gl.enableVertexAttribArray(a)
                gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
            }
        }
        gl.bindVertexArray(null)

        /* ---- render targets */
        interface Target { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number; depth?: WebGLRenderbuffer }
        const makeTarget = (w: number, h: number, withDepth: boolean): Target => {
            const tex = gl.createTexture()!
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            const fb = gl.createFramebuffer()!
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
            let depth: WebGLRenderbuffer | undefined
            if (withDepth) {
                depth = gl.createRenderbuffer()!
                gl.bindRenderbuffer(gl.RENDERBUFFER, depth)
                gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h)
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth)
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            return { fb, tex, w, h, depth }
        }
        const freeTarget = (t: Target) => {
            gl.deleteFramebuffer(t.fb)
            gl.deleteTexture(t.tex)
            if (t.depth) gl.deleteRenderbuffer(t.depth)
        }
        let sceneT: Target | null = null
        let brightT: Target | null = null
        const horT: Target[] = []
        const verT: Target[] = []
        const buildTargets = (bw: number, bh: number) => {
            for (const t of [sceneT, brightT, ...horT, ...verT]) if (t) freeTarget(t)
            horT.length = 0
            verT.length = 0
            sceneT = makeTarget(bw, bh, true)
            let rx = Math.max(1, Math.round(bw / 2)), ry = Math.max(1, Math.round(bh / 2))
            brightT = makeTarget(rx, ry, false)
            for (let i = 0; i < MIPS; i++) {
                horT.push(makeTarget(rx, ry, false))
                verT.push(makeTarget(rx, ry, false))
                rx = Math.max(1, Math.round(rx / 2))
                ry = Math.max(1, Math.round(ry / 2))
            }
        }

        /* ---- size */
        let W = 1, H = 1, BW = 0, BH = 0
        const resize = () => {
            W = Math.max(1, host.clientWidth)
            H = Math.max(1, host.clientHeight)
            const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
            const bw = Math.max(1, Math.round(W * dpr)), bh = Math.max(1, Math.round(H * dpr))
            if (bw !== BW || bh !== BH) {
                BW = bw
                BH = bh
                canvas.width = bw
                canvas.height = bh
                buildTargets(bw, bh)
            }
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(host)

        /* ---- camera (OrbitControls: spherical about the target, damped) */
        const off0 = [1000, 1000 - TARGET_Y, 1000]
        const orbit = {
            theta: Math.atan2(off0[0], off0[2]),
            phi: Math.acos(off0[1] / Math.hypot(off0[0], off0[1], off0[2])),
            dTheta: 0,
            dPhi: 0,
        }
        const eye = [0, 0, 0]
        const basis = { s: [1, 0, 0], u: [0, 1, 0], f: [0, 0, -1] }
        let tanV = FOV_TAN, aspect = 1
        const view = new Float32Array(16)
        const proj = new Float32Array(16)
        const vp = new Float32Array(16)
        const updateCamera = (dist: number) => {
            const sp = Math.sin(orbit.phi)
            eye[0] = dist * sp * Math.sin(orbit.theta)
            eye[1] = TARGET_Y + dist * Math.cos(orbit.phi)
            eye[2] = dist * sp * Math.cos(orbit.theta)
            let fx = -eye[0], fy = TARGET_Y - eye[1], fz = -eye[2]
            const fl = Math.hypot(fx, fy, fz) || 1
            fx /= fl; fy /= fl; fz /= fl
            // s = f × up(0,1,0)
            let sx = -fz, sz = fx
            const sl = Math.hypot(sx, sz) || 1
            sx /= sl; sz /= sl
            const sy = 0
            // u = s × f
            const ux = sy * fz - sz * fy, uy = sz * fx - sx * fz, uz = sx * fy - sy * fx
            basis.s = [sx, sy, sz]
            basis.u = [ux, uy, uz]
            basis.f = [fx, fy, fz]
            view.set([
                sx, ux, -fx, 0,
                sy, uy, -fy, 0,
                sz, uz, -fz, 0,
                -(sx * eye[0] + sy * eye[1] + sz * eye[2]),
                -(ux * eye[0] + uy * eye[1] + uz * eye[2]),
                fx * eye[0] + fy * eye[1] + fz * eye[2],
                1,
            ])
            aspect = W / H
            tanV = FOV_TAN * Math.max(1, REF_ASPECT / aspect)
            proj.fill(0)
            proj[0] = 1 / (tanV * aspect)
            proj[5] = 1 / tanV
            proj[10] = (FAR + NEAR) / (NEAR - FAR)
            proj[11] = -1
            proj[14] = (2 * FAR * NEAR) / (NEAR - FAR)
            mul4(proj, view, vp)
        }

        /* ---- state */
        const lineCol = new Float32Array(LINES * 3)
        const lineGlow = new Float32Array(LINES)
        const lineUni = new Float32Array(LINES * 4)
        let baseRGB = parseColor(live.current.baseColor, [0.39, 1, 0.85, 1])
        let accRGB = parseColor(live.current.accentColor, [0.65, 1, 0.94, 1])
        const restCol = (i: number) => (crestLine[i] ? accRGB : baseRGB)
        for (let i = 0; i < LINES; i++) {
            const c = restCol(i)
            lineCol.set([c[0], c[1], c[2]], i * 3)
        }
        let balls: Ball[] = []
        let ripples: Ripple[] = []
        let simMs = 0
        let surfT = 0
        let nextBall = 0
        let poolCharge = 0
        let rainbowAmt = 0
        let rainbowWave = 0
        let trailK = Math.random()

        const glowNearbyGrid = (x: number, z: number, range: number, col: [number, number, number]) => {
            for (let i = 0; i < SEGMENTS; i++) {
                const pts = radialPts[i]
                let minD = Infinity
                for (let j = 0; j < pts.length; j += 2) {
                    const dx = pts[j] - x, dz = pts[j + 1] - z
                    const d = Math.sqrt(dx * dx + dz * dz)
                    if (d < minD) minD = d
                }
                if (minD < range) {
                    lineGlow[i] = Math.pow(1 - minD / range, 2) * 3
                    for (let c = 0; c < 3; c++) lineCol[i * 3 + c] += (col[c] - lineCol[i * 3 + c]) * 0.6
                }
            }
            const br = Math.sqrt(x * x + z * z)
            for (let k = 0; k < circleR.length; k++) {
                const i = SEGMENTS + k
                const d = Math.abs(br - circleR[k])
                if (d < range * 0.5) {
                    lineGlow[i] = Math.pow(1 - d / (range * 0.5), 2) * 3
                    for (let c = 0; c < 3; c++) lineCol[i * 3 + c] += (col[c] - lineCol[i * 3 + c]) * 0.6
                }
            }
        }

        const addRipple = (cx: number, cz: number, color: [number, number, number], startR: number) => {
            ripples.push({ cx, cz, color, r: Math.max(4, startR), maxR: live.current.rippleSpread, opacity: 0.95 })
        }
        // Three concentric rings make one ripple front.
        const spawnRipple = (x: number, z: number, color: [number, number, number]) => {
            addRipple(x, z, color, 6)
            addRipple(x, z, color, 34)
            addRipple(x, z, color, 64)
        }

        const makeBall = (x: number, y: number, z: number, r: number): Ball => {
            const k = Math.random()
            return {
                k,
                color: paletteColor(k),
                x, y, z,
                vx: 0, vy: 0, vz: 0,
                baseR: r,
                scaleF: 1,
                radius: r,
                time: 0,
                phase: Math.random() * TAU,
                opacity: 0,
                fade: 0,
                fadeTime: 0,
                glow: 0,
                lastBounce: -1e9,
                lastShrink: -1e9,
                lastKick: -1e9,
            }
        }
        const rand = (a: number, b: number) => a + Math.random() * (b - a)

        // Reference Ball.update(), one 60 Hz frame. Returns false when gone.
        const updateBall = (b: Ball) => {
            b.time += 0.016
            if (b.fade === 0) {
                b.fadeTime += 0.05
                b.opacity = b.fadeTime
                if (b.fadeTime >= 1) {
                    b.fadeTime = 1
                    b.fade = 1
                }
            } else if (b.fade === 2) {
                b.fadeTime -= 0.05
                b.opacity = b.fadeTime
                if (b.fadeTime <= 0) return false
            }
            if (b.glow > 0) b.glow -= 0.1

            b.vy -= 0.5
            const sxz = Math.sqrt(b.vx * b.vx + b.vz * b.vz)
            if (sxz > 0 && sxz < 0.8) {
                const f = 0.8 / sxz
                b.vx *= f
                b.vz *= f
            }
            b.x += b.vx
            b.y += b.vy
            b.z += b.vz

            const x = b.x, z = b.z
            const dist = Math.sqrt(x * x + z * z)
            const py = domeY(x, z, surfT)
            if (b.y - b.radius < py) {
                b.y = py + b.radius + 0.1
                // Numerical surface normal (the centre singularity falls back to +Y).
                const e = 0.5
                const gx = (domeY(x + e, z, surfT) - domeY(x - e, z, surfT)) / (2 * e)
                const gz = (domeY(x, z + e, surfT) - domeY(x, z - e, surfT)) / (2 * e)
                let nx = -gx, ny = 1, nz = -gz
                if (!isFinite(nx) || !isFinite(nz)) (nx = 0), (ny = 1), (nz = 0)
                const nl = Math.hypot(nx, ny, nz)
                nx /= nl; ny /= nl; nz /= nl

                // Shrinks on every (throttled) contact; too small = fade out.
                if (simMs - b.lastShrink > 300) {
                    b.lastShrink = simMs
                    b.scaleF *= 0.94
                    b.radius = b.baseR * b.scaleF
                    if (b.radius < 3.5 && b.fade !== 2) b.fade = 2
                }

                if (Math.abs(b.vy) > 0.5) {
                    const dot = (b.vx * nx + b.vy * ny + b.vz * nz) * 1.85
                    b.vx -= nx * dot
                    b.vy -= ny * dot
                    b.vz -= nz * dot
                    const sp = Math.hypot(b.vx, b.vy, b.vz)
                    if (sp < 0.8) {
                        const f = sp > 0 ? 0.8 / sp : 0
                        b.vx *= f; b.vy *= f; b.vz *= f
                    } else {
                        b.vx *= 0.9; b.vy *= 0.9; b.vz *= 0.9
                    }
                    if (simMs - b.lastBounce > 100) {
                        b.glow = 2
                        spawnRipple(x, z, b.color)
                        glowNearbyGrid(b.x, b.z, 200, b.color)
                        b.lastBounce = simMs
                    }
                } else {
                    if (sxz < 0.5) {
                        const a = Math.random() * TAU
                        b.vx += Math.cos(a) * 0.5
                        b.vz += Math.sin(a) * 0.5
                    }
                    // Rolls round the bowl: tangent to the contour.
                    let tx = z, tz = -x
                    const tl = Math.hypot(tx, tz) || 1
                    tx /= tl; tz /= tl
                    const sp = Math.hypot(b.vx, b.vy, b.vz)
                    b.vx = tx * sp * 0.95
                    b.vy = 0
                    b.vz = tz * sp * 0.95
                }
            }
            const total = Math.hypot(b.vx, b.vy, b.vz)
            if (total < 0.3 && Math.abs(b.y - (py + b.radius)) < 1) {
                const a = Math.random() * TAU
                b.vx = Math.cos(a) * 0.8
                b.vz = Math.sin(a) * 0.8
                b.vy = 1
            }
            if ((dist > RADIUS + 100 || b.y < -1000) && b.fade !== 2) b.fade = 2
            return true
        }

        const pooled = () =>
            balls.filter((b) => b.fade === 1 && Math.sqrt(b.x * b.x + b.z * b.z) < POOL_R)

        const explodePool = () => {
            const p = pooled()
            poolCharge = 0
            if (p.length < 2) return
            for (const b of p) {
                let dx = b.x, dz = b.z
                if (Math.hypot(dx, dz) < 1) {
                    const a = Math.random() * TAU
                    dx = Math.cos(a)
                    dz = Math.sin(a)
                }
                const l = Math.hypot(dx, dz)
                const out = rand(17, 27)
                b.vx = (dx / l) * out
                b.vy = rand(16, 24)
                b.vz = (dz / l) * out
                b.glow = 3
                b.lastBounce = simMs // hush the landing ripple right after
            }
            for (const b of p.slice(0, 4)) spawnRipple(0, 0, b.color)
            spawnRipple(0, 0, [1, 1, 1])
            rainbowAmt = 1.6
            rainbowWave = 0
        }

        /* ---- pointer */
        const ptr = { x: 0, y: 0, in: false }
        const drag = { on: false, x: 0, y: 0, sx: 0, sy: 0, moved: 0 }
        const hit = { ok: false, x: 0, z: 0 }
        const trail = { ok: false, x: 0, z: 0, acc: 0 }
        const local = (e: PointerEvent) => {
            // Local CSS px, corrected for the canvas zoom the rect carries.
            const r = host.getBoundingClientRect()
            const kx = r.width > 0 ? host.offsetWidth / r.width : 1
            const ky = r.height > 0 ? host.offsetHeight / r.height : 1
            return [(e.clientX - r.left) * kx, (e.clientY - r.top) * ky]
        }
        const onHover = (e: PointerEvent) => {
            const [x, y] = local(e)
            ptr.x = x
            ptr.y = y
            ptr.in = true
        }
        const onLeave = () => {
            if (!drag.on) ptr.in = false
            trail.ok = false
        }
        const onDown = (e: PointerEvent) => {
            if (e.button !== 0) return
            const [x, y] = local(e)
            ptr.x = x
            ptr.y = y
            ptr.in = true
            drag.on = true
            drag.x = drag.sx = x
            drag.y = drag.sy = y
            drag.moved = 0
            host.style.cursor = "grabbing"
        }
        const onDragMove = (e: PointerEvent) => {
            if (!drag.on) return
            const [x, y] = local(e)
            const dx = x - drag.x, dy = y - drag.y
            drag.x = x
            drag.y = y
            drag.moved = Math.max(drag.moved, Math.hypot(x - drag.sx, y - drag.sy))
            // OrbitControls rotateLeft / rotateUp: 2π per host height.
            orbit.dTheta -= (TAU * dx) / H
            orbit.dPhi -= (TAU * dy) / H
            ptr.x = x
            ptr.y = y
        }
        const onUp = () => {
            if (!drag.on) return
            drag.on = false
            host.style.cursor = "grab"
            // A click, not a drag: drop a ball straight above the point.
            if (drag.moved < CLICK_SLOP && hit.ok && balls.length < MAX_BALLS) {
                balls.push(makeBall(hit.x, 820, hit.z, rand(12, 38)))
            }
            trail.ok = false
        }
        host.addEventListener("pointermove", onHover)
        host.addEventListener("pointerdown", onDown)
        host.addEventListener("pointerleave", onLeave)
        window.addEventListener("pointermove", onDragMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        // March the pointer ray onto the terrain.
        const pick = () => {
            hit.ok = false
            if (!ptr.in) return
            const nx = (ptr.x / W) * 2 - 1, ny = 1 - (ptr.y / H) * 2
            const { s, u, f } = basis
            let dx = f[0] + s[0] * nx * tanV * aspect + u[0] * ny * tanV
            let dy = f[1] + s[1] * nx * tanV * aspect + u[1] * ny * tanV
            let dz = f[2] + s[2] * nx * tanV * aspect + u[2] * ny * tanV
            const dl = Math.hypot(dx, dy, dz)
            dx /= dl; dy /= dl; dz /= dl
            const above = (t: number) => eye[1] + dy * t - domeY(eye[0] + dx * t, eye[2] + dz * t, surfT)
            let prev = 0
            for (let t = 8; t < FAR; t += 8) {
                if (above(t) <= 0) {
                    let lo = prev, hi = t
                    for (let i = 0; i < 14; i++) {
                        const m = (lo + hi) / 2
                        if (above(m) > 0) lo = m
                        else hi = m
                    }
                    const x = eye[0] + dx * hi, z = eye[2] + dz * hi
                    if (Math.hypot(x, z) <= RADIUS) {
                        hit.ok = true
                        hit.x = x
                        hit.z = z
                    }
                    return
                }
                prev = t
            }
        }

        const pointerStep = () => {
            if (!hit.ok || drag.on) {
                trail.ok = false
                return
            }
            // Trail: one ripple per TRAIL_STEP of travel, walking the palette.
            if (!trail.ok) {
                trail.ok = true
                trail.x = hit.x
                trail.z = hit.z
                trail.acc = 0
            } else {
                trail.acc += Math.hypot(hit.x - trail.x, hit.z - trail.z)
                trail.x = hit.x
                trail.z = hit.z
                if (trail.acc >= TRAIL_STEP) {
                    trail.acc = 0
                    trailK = (trailK + TRAIL_HUE) % 1
                    const c = paletteColor(trailK)
                    addRipple(hit.x, hit.z, c, 6)
                    glowNearbyGrid(hit.x, hit.z, TRAIL_GLOW_RANGE, c)
                }
            }
            // Kick: balls inside Reach are batted away and up.
            const { reach, push } = live.current.cursor
            const R = (Math.max(0, reach) / 100) * RADIUS
            const P = Math.max(0, push) / 100
            if (R <= 0 || P <= 0) return
            for (const b of balls) {
                if (b.fade === 2 || simMs - b.lastKick < KICK_COOLDOWN) continue
                const dx = b.x - hit.x, dz = b.z - hit.z
                const d = Math.hypot(dx, dz)
                if (d >= R + b.radius) continue
                const fall = 1 - Math.min(1, d / (R + b.radius))
                let ux = dx, uz = dz
                if (d < 1) {
                    const a = Math.random() * TAU
                    ux = Math.cos(a)
                    uz = Math.sin(a)
                }
                const ul = Math.hypot(ux, uz)
                const out = (4 + 10 * fall) * P
                b.vx += (ux / ul) * out
                b.vz += (uz / ul) * out
                b.vy = Math.max(b.vy, (6 + 6 * fall) * P)
                b.glow = 2
                b.lastKick = simMs
                b.lastBounce = simMs
                spawnRipple(b.x, b.z, b.color)
            }
        }

        const step = () => {
            const L = live.current
            simMs += STEP_MS
            surfT += 0.016
            // Spawn from the sky over the middle.
            if (balls.length < Math.max(1, Math.round(L.balls)) && simMs > nextBall) {
                balls.push(makeBall(rand(-220, 220), 820, rand(-220, 220), rand(12, 38)))
                nextBall = simMs + rand(60, 320)
            }
            balls = balls.filter(updateBall)
            // Balls sitting in the pool charge the fuse; then they blow out.
            if (pooled().length >= 2) poolCharge += 0.016
            else poolCharge = Math.max(0, poolCharge - 0.032)
            if (poolCharge >= POOL_FUSE) explodePool()

            for (const r of ripples) {
                r.r += 5.5
                const life = 1 - r.r / r.maxR
                r.opacity = life > 0 ? life * life * 0.95 : -1
            }
            ripples = ripples.filter((r) => r.opacity >= 0)

            // OrbitControls.update(): auto-rotate feeds the same damped delta.
            if (!drag.on) orbit.dTheta -= ((TAU / 60 / 60) * L.speed) / 50
            orbit.theta += orbit.dTheta * 0.05
            orbit.phi += orbit.dPhi * 0.05
            orbit.phi = Math.max(1e-6, Math.min(Math.PI - 1e-6, orbit.phi))
            orbit.dTheta *= 0.95
            orbit.dPhi *= 0.95
            updateCamera(Math.max(1, L.distance))
            pick()
            pointerStep()

            // platform.update(): rainbow advance, glow decay back to rest.
            if (rainbowAmt > 0) {
                rainbowWave += 0.028
                rainbowAmt -= 0.02
            }
            for (let i = 0; i < LINES; i++) {
                const c = restCol(i)
                if (lineGlow[i] > 0.001) {
                    lineGlow[i] *= 0.95
                    for (let k = 0; k < 3; k++) lineCol[i * 3 + k] += (c[k] - lineCol[i * 3 + k]) * 0.04
                } else {
                    // At rest the line IS the control colour, so an edit lands at once.
                    lineGlow[i] = 0
                    lineCol.set([c[0], c[1], c[2]], i * 3)
                }
            }
        }

        /* ---- draw */
        const drawBall = (b: Ball) => {
            gl.uniform3f(ball.u("uCenter"), b.x, b.y, b.z)
            gl.uniform3f(ball.u("uBall"), b.baseR, b.scaleF, Math.sin(b.time * 1.8 + b.phase) * b.baseR * 0.05)
            gl.uniform1f(ball.u("uK"), b.k)
            gl.uniform1f(ball.u("uOpacity"), b.opacity)
            gl.uniform1f(ball.u("uGlow"), Math.max(0, b.glow))
            gl.drawElements(gl.TRIANGLES, sphCount, gl.UNSIGNED_SHORT, 0)
        }
        const post = (t: Target) => {
            gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb)
            gl.viewport(0, 0, t.w, t.h)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        const bindTex = (unit: number, tex: WebGLTexture) => {
            gl.activeTexture(gl.TEXTURE0 + unit)
            gl.bindTexture(gl.TEXTURE_2D, tex)
        }

        const render = () => {
            const S = sceneT!, B = brightT!
            const L = live.current
            baseRGB = parseColor(L.baseColor, [0.39, 1, 0.85, 1])
            accRGB = parseColor(L.accentColor, [0.65, 1, 0.94, 1])
            const bg = parseColor(L.background, [0.04, 0.1, 0.18, 1])

            gl.bindFramebuffer(gl.FRAMEBUFFER, S.fb)
            gl.viewport(0, 0, S.w, S.h)
            gl.clearColor(0, 0, 0, 0)
            gl.depthMask(true)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LEQUAL)
            gl.enable(gl.BLEND)

            // three's transparent sort: back to front by view depth. The grid
            // and ripples sit at the origin, so balls behind it go first.
            const depthOf = (x: number, y: number, z: number) =>
                (x - eye[0]) * basis.f[0] + (y - eye[1]) * basis.f[1] + (z - eye[2]) * basis.f[2]
            const originD = depthOf(0, 0, 0)
            const sorted = balls
                .map((b) => ({ b, d: depthOf(b.x, b.y, b.z) }))
                .sort((a, c) => c.d - a.d)
            const behind = sorted.filter((e) => e.d > originD)
            const front = sorted.filter((e) => e.d <= originD)

            const ballPass = (list: { b: Ball }[]) => {
                if (!list.length) return
                gl.useProgram(ball.p)
                gl.bindVertexArray(sphVao)
                gl.enable(gl.CULL_FACE)
                gl.cullFace(gl.BACK)
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
                gl.uniformMatrix4fv(ball.u("uVP"), false, vp)
                gl.uniform3f(ball.u("uLight"), BALL_LIGHT[0], BALL_LIGHT[1], BALL_LIGHT[2])
                gl.uniform3f(ball.u("uCam"), eye[0], eye[1], eye[2])
                for (const e of list) drawBall(e.b)
                gl.disable(gl.CULL_FACE)
            }
            ballPass(behind)

            // Grid: light adds, alpha untouched.
            gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE)
            gl.useProgram(grid.p)
            gl.bindVertexArray(gridVao)
            for (let i = 0; i < LINES; i++) {
                const k = (crestLine[i] ? CREST_OPACITY : GRID_OPACITY) + lineGlow[i]
                lineUni[i * 4] = lineCol[i * 3] * k
                lineUni[i * 4 + 1] = lineCol[i * 3 + 1] * k
                lineUni[i * 4 + 2] = lineCol[i * 3 + 2] * k
            }
            gl.uniformMatrix4fv(grid.u("uVP"), false, vp)
            gl.uniform1f(grid.u("uSurfT"), surfT)
            gl.uniform4fv(grid.u("uLine[0]"), lineUni)
            gl.uniform1f(grid.u("uRainbow"), Math.max(0, rainbowAmt))
            gl.uniform1f(grid.u("uWave"), rainbowWave)
            gl.drawArrays(gl.LINES, 0, gridCount)

            if (ripples.length) {
                gl.useProgram(ripple.p)
                gl.bindVertexArray(ripVao)
                gl.uniformMatrix4fv(ripple.u("uVP"), false, vp)
                gl.uniform1f(ripple.u("uSurfT"), surfT)
                for (const r of ripples) {
                    gl.uniform3f(ripple.u("uRing"), r.cx, r.cz, r.r)
                    gl.uniform4f(ripple.u("uCol"), r.color[0], r.color[1], r.color[2], r.opacity)
                    gl.drawArrays(gl.LINE_LOOP, 0, RIPPLE_SEG)
                }
            }

            ballPass(front)

            /* bloom */
            gl.disable(gl.DEPTH_TEST)
            gl.disable(gl.BLEND)
            gl.bindVertexArray(quadVao)

            gl.useProgram(high.p)
            bindTex(0, S.tex)
            gl.uniform1i(high.u("uTex"), 0)
            gl.uniform3f(high.u("uBg"), bg[0], bg[1], bg[2])
            post(B)

            gl.useProgram(blur.p)
            gl.uniform1i(blur.u("uTex"), 0)
            let input = B
            for (let i = 0; i < MIPS; i++) {
                const h = horT[i], v = verT[i]
                gl.uniform2f(blur.u("uInvSize"), 1 / h.w, 1 / h.h)
                gl.uniform1i(blur.u("uRadius"), KERNELS[i])
                bindTex(0, input.tex)
                gl.uniform2f(blur.u("uDir"), 1, 0)
                post(h)
                bindTex(0, h.tex)
                gl.uniform2f(blur.u("uDir"), 0, 1)
                post(v)
                input = v
            }

            gl.useProgram(comp.p)
            for (let i = 0; i < MIPS; i++) {
                bindTex(i, verT[i].tex)
                gl.uniform1i(comp.u(`uB${i}`), i)
            }
            gl.uniform1fv(
                comp.u("uF[0]"),
                BLOOM_FACTORS.map((f) => BLOOM_STRENGTH * (f + (1.2 - 2 * f) * BLOOM_RADIUS))
            )
            post(horT[0])

            gl.useProgram(fin.p)
            bindTex(0, S.tex)
            bindTex(1, horT[0].tex)
            gl.uniform1i(fin.u("uScene"), 0)
            gl.uniform1i(fin.u("uBloom"), 1)
            gl.uniform4f(fin.u("uBg"), bg[0], bg[1], bg[2], bg[3])
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            gl.viewport(0, 0, BW, BH)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
            gl.bindVertexArray(null)
        }

        /* ---- loop */
        let raf = 0
        let last = -1
        let acc = 0
        updateCamera(Math.max(1, live.current.distance))
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            // The first timestamp can predate the effect: start dt at 0.
            const dt = last < 0 ? 0 : Math.min(0.25, Math.max(0, (now - last) / 1000))
            last = now
            acc += dt
            let n = 0
            while (acc >= STEP && n < MAX_STEPS) {
                step()
                acc -= STEP
                n++
            }
            if (n === MAX_STEPS) acc = 0
            render()
        }
        raf = requestAnimationFrame(frame)

        return () => {
            // No loseContext(): StrictMode's remount would get the dead context.
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointermove", onHover)
            host.removeEventListener("pointerdown", onDown)
            host.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("pointermove", onDragMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            for (const t of [sceneT, brightT, ...horT, ...verT]) if (t) freeTarget(t)
            for (const b of [gridBuf, ripBuf, sphBuf, sphIdx, quadBuf]) gl.deleteBuffer(b)
            for (const v of [gridVao, ripVao, sphVao, quadVao]) gl.deleteVertexArray(v)
            for (const p of programs) gl.deleteProgram(p)
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                overflow: "hidden",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                cursor: "grab",
                // Horizontal drags orbit; vertical touch still scrolls the page.
                touchAction: "pan-y",
                ...style,
                background,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
