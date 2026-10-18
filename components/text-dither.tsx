"use client"

import * as React from "react"
import { useEffect, useId, useMemo, useRef } from "react"
import { animate, motionValue } from "motion/react"

/**
 * framer-motion's `animate()` option bag. `AnimationOptions` is not exported by
 * the copy of framer-motion that ships inside Framer, and its `Transition` type
 * is not assignable to what `animate(value, …)` accepts, so the shape is
 * spelled out here — a type alias, not an interface, or it loses the implicit
 * index signature the intersection needs.
 */
type Motion = {
    type?: "spring" | "tween" | "keyframes" | "inertia"
    duration?: number
    ease?: [number, number, number, number]
    delay?: number
    stiffness?: number
    damping?: number
    mass?: number
    bounce?: number
    restSpeed?: number
    restDelta?: number
}

/**
 * Dither Text — text rasterised to a texture, then pushed through a WebGL2
 * chain: an angled sine warp, a separable gaussian whose radius ramps toward
 * the top and bottom edges, and an 8x8 ordered Bayer dither on alpha. Crisp
 * through the middle band, dissolving into dot noise at the extremes.
 *
 * The treatment is HOVER-GATED. At rest the type is clean and the wave, blur
 * and dither passes are all skipped outright — the source texture blits
 * straight to the screen. Pointer entry eases one progress value 0 -> 1 and
 * every effect term scales by it, so the type dissolves in and reassembles on
 * leave. Gating only the Bayer pass would have left blurred, wobbling text as
 * the resting state, which is not a resting state.
 *
 * On the Framer CANVAS that progress is held at 1. A designer tuning Dither or
 * Wave has to see what the dials do, and the canvas is not a place where hover
 * is a reliable gesture (rule 5).
 *
 * PANEL KEY CHANGES (clean break, rule 11c — a live instance resets these):
 *   dither.threshold -> dither.levels     Was an alpha STEP percent whose
 *                                         reciprocal the shader used, so the
 *                                         top third of the dial saturated on
 *                                         one value. Now the integer level
 *                                         count itself. 65 mapped to 2.
 *   dither.mix       -> dither.strength   "Mix" reads as a share between two
 *                                         colours (rule 11a's Accent Mix); it
 *                                         is the effect's strength.
 *   blur.radius      -> dither.blur       The Blur group is gone. Blur is not
 *                                         a separate effect — it is what the
 *                                         Bayer pass quantises, and every
 *                                         change it makes arrives through the
 *                                         dither. One dial, in that group.
 *   blur.progressive -> frozen constant   See BLUR_PROGRESSIVE.
 *
 * Written for this repo (CLAUDE.md rules 6, 10, 11). The effect family comes
 * from a Framer marketplace component by THE DESIGN FUTURIST
 * (https://thedesignfuturist.zip); none of its code is here — the pass chain,
 * the GLSL and the control mapping below are ours.
 *
 * Architecture (rule 6): GL context built once in useEffect, every live input
 * read from a ref inside the loop, no loseContext() in cleanup, raw rAF so the
 * Framer canvas ticks too.
 *
 * Pass chain, per frame:
 *   source  full  text bitmap blitted centred, premultiplied. Only re-run when
 *                 the text / font / colour / stroke key changes.
 *   wave    full  4-tap supersampled sine displacement.
 *   blur    half  H, V, H, V — two composed iterations at sigma/sqrt(2) each,
 *                 at half resolution so a 90px sigma stays clear of tap
 *                 ghosting. Blur output is soft; its resolution is not visible.
 *   dither  full  mixes the untouched sharp field against the blurred one by
 *                 the same ramp, so the core stays genuinely crisp, then
 *                 quantises alpha through the Bayer matrix.
 *
 * The wave clock wraps at exactly 1.0 cycle on the CPU. Both sine terms
 * advance at integer multiples of it, so the wrap is seamless and the uniform
 * never grows past float32's millisecond resolution.
 *
 * Known trade-off: the blur taps span 2.5 sigma over 16 samples. With the edge
 * ramp frozen at BLUR_PROGRESSIVE the combined sigma tops out at Blur 80, and
 * the taps land roughly 10 CSS px apart there — a smear at that setting, where
 * the sampling is not visible; below ~120 combined sigma it is exact.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

interface FontProps {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    fontSize?: number | string
    lineHeight?: number | string
}

interface WaveProps {
    frequency: number
    amount: number
    angle: number
    distortion: number
    speed: number
}

/**
 * The Dither group. `blur` lives here rather than in a group of its own: the
 * blurred field is only ever seen through the Bayer pass, so a designer moving
 * that dial is tuning the dither, not a second effect.
 *
 * `levels` is the integer number of alpha steps the Bayer matrix quantises to —
 * 1 is pure 1-bit, higher is smoother. It is the shader's own uLevels, so the
 * dial cannot saturate the way the old reciprocal Threshold did.
 * `strength` is how far the quantised alpha is blended in over the smooth one.
 */
interface DitherProps {
    levels: number
    strength: number
    blur: number
}

interface Props {
    text: string
    font: FontProps
    textColor: string
    background: string
    stroke: number
    dither: Partial<DitherProps>
    wave: Partial<WaveProps>
    transition?: Motion
    style?: React.CSSProperties
}

/** Resolved and clamped. The renderer only ever sees this shape. */
interface Resolved {
    text: string
    font: FontProps
    textColor: string
    stroke: number
    dither: DitherProps
    wave: WaveProps
}

const DEFAULT_TEXT = "HELLO\nWORLD"
const DEFAULT_FONT: FontProps = {
    fontFamily: "Cooper Black",
    fontWeight: 900,
    fontSize: 120,
    lineHeight: "0.78em",
}
const DEFAULT_DITHER: DitherProps = { levels: 2, strength: 100, blur: 24 }
const DEFAULT_WAVE: WaveProps = {
    frequency: 9,
    amount: 31,
    angle: 22,
    distortion: 20,
    speed: 50,
}
/** Widest useful level count. Past this the quantisation is not visible. */
const MAX_LEVELS = 32
const MAX_BLUR = 80

/** Size floor, one number across the repo (rule 10). */
const MIN_W = 1200
const MIN_H = 800

/** Cut controls, frozen at the value the component ships with (rule 11b). */
const MAX_DPR = 1.5
/**
 * Was the Blur group's `Progressive` dial — the extra sigma the gaussian picks
 * up toward the top and bottom edges. Frozen at its shipped default: it and
 * Radius were two sigmas on one gaussian, and the panel now carries a single
 * Blur dial inside Dither (rule 11b — redundant twins collapse to one). The
 * render path is unchanged; nothing looks different at the defaults.
 */
const BLUR_PROGRESSIVE = 100
/**
 * The ramp is anchored to the TEXT, not to the viewport: both bounds are
 * fractions of the text block's half-height. Anchored to the field instead, a
 * taller component would silently weaken the effect, since the glyphs would
 * never leave the sharp band — the control would still move but mean less.
 */
const FOCUS_CORE = 0.35
const FOCUS_EDGE = 1.35
/**
 * Share of the ramped blur the horizontal pass takes. Below 1 the melt drags
 * vertically instead of blooming as an even glow.
 */
const RAMP_ANISO_X = 0.35
/** Largest frame delta folded into the clocks, seconds. */
const MAX_FRAME_S = 0.1
/**
 * The hover ease. The source ramped linearly over 0.45s in / 0.7s out and put a
 * smoothstep on top; the Transition control owns that curve now (rule 2), so
 * the smoothstep is gone — double-easing a spring would flatten its overshoot.
 *
 * Out is still slower than in: a dissolve that reassembles at the speed it fell
 * apart reads as a toggle rather than as settling. One Transition cannot carry
 * two durations, so leaving scales whatever the control says by this ratio.
 */
const DEFAULT_TRANSITION: Motion = {
    type: "tween",
    duration: 0.45,
    // easeInOut, as the cubic-bezier the tuple type needs — the smoothstep the
    // source applied on top of its linear ramp, expressed as the curve itself.
    ease: [0.42, 0, 0.58, 1],
}
const HOVER_OUT_RATIO = 0.7 / 0.45
/** Padding around the rasterised glyphs, on top of the stroke width. */
const TEXT_PAD = 12
/** Ceiling on the text bitmap, so a huge font size cannot blow up the upload. */
const MAX_TEXT_PX = 4096
const FALLBACK_FILL = "#000"

/* Control-to-shader mapping. Every one of these drives a visible behaviour. */
/** Blur 0-80 -> base gaussian sigma, CSS px. */
const BLUR_TO_SIGMA = 0.25
/** Blur 0-80 -> how much blur bleeds into the sharp core, capped at 0.85. */
const BLUR_TO_CORE = 0.85 / MAX_BLUR
/** Frozen Progressive -> extra sigma at the top and bottom edges, CSS px. */
const PROGRESSIVE_TO_SIGMA = 0.45
const RAMP_SIGMA = BLUR_PROGRESSIVE * PROGRESSIVE_TO_SIGMA
/** Frequency 0-20 -> sine cycles across the field. */
const FREQ_BASE = 1
const FREQ_SCALE = 0.4
/** Amount 0-100 -> displacement in UV units. */
const AMOUNT_TO_UV = 0.0006
/** Speed 0-100 -> wave cycles per second. 50 lands on 0.25 (rule 11a). */
const SPEED_TO_CYCLES = 0.005

const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v))

// ---------------------------------------------------------------------------
// Text rasterisation
// ---------------------------------------------------------------------------

/**
 * Framer's Color control can hand back a CSS variable token, so the colour has
 * to be resolved against the live document. Cached — resolving means a DOM
 * insert plus a forced style read, which must never happen per frame.
 */
let colorEpoch = 0
const colorCache = new Map<string, string>()

function bumpColorEpoch() {
    colorEpoch += 1
    colorCache.clear()
}

function resolveColor(color: string, host: HTMLElement | null): string {
    if (typeof document === "undefined") return color
    const key = `${colorEpoch}|${color}`
    const hit = colorCache.get(key)
    if (hit !== undefined) return hit
    const probe = document.createElement("span")
    probe.style.color = color
    probe.style.position = "absolute"
    probe.style.pointerEvents = "none"
    probe.style.visibility = "hidden"
    ;(host || document.body || document.documentElement).appendChild(probe)
    const resolved = getComputedStyle(probe).color || color
    probe.remove()
    colorCache.set(key, resolved)
    return resolved
}

function splitLines(text: string): string[] {
    return (text || DEFAULT_TEXT)
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean)
}

const ariaLabel = (text: string) => splitLines(text).join(" ")

/** Quote family names that are not generic keywords, for a canvas font string. */
function quoteFamily(family: string): string {
    return family
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) =>
            name.startsWith("'") ||
            name.startsWith('"') ||
            /^[a-z-]+$/i.test(name)
                ? name
                : `"${name.replace(/"/g, '\\"')}"`
        )
        .join(", ")
}

function parseFontSize(value: number | string | undefined): number {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
        const n = parseFloat(value)
        if (!isNaN(n)) return value.includes("rem") ? n * 16 : n
    }
    return 120
}

/** Line height in px. A bare number <= 4 is an em multiple, as CSS has it. */
function parseLineHeight(
    value: number | string | undefined,
    fontSize: number
): number {
    if (typeof value === "number" && Number.isFinite(value))
        return value <= 4 ? value * fontSize : value
    if (typeof value === "string") {
        const n = Number.parseFloat(value)
        if (Number.isFinite(n)) {
            if (value.endsWith("%")) return (n / 100) * fontSize
            if (value.endsWith("em")) return n * fontSize
            return n
        }
    }
    return fontSize * 0.78
}

interface FontSpec {
    family: string
    weight: number | string
    style: string
    fontSize: number
    lineHeight: number
}

function fontSpec(font: FontProps): FontSpec {
    const fontSize = parseFontSize(font?.fontSize)
    return {
        family: quoteFamily(
            font?.fontFamily ||
                "Cooper Black, Arial Rounded MT Bold, Arial Black, sans-serif"
        ),
        weight: font?.fontWeight || 900,
        style: font?.fontStyle || "normal",
        fontSize,
        lineHeight: parseLineHeight(font?.lineHeight, fontSize),
    }
}

function fontShorthand(font: FontProps): string {
    const { style, weight, fontSize, family } = fontSpec(font)
    return `${style} ${weight} ${fontSize}px ${family}`
}

/** One shared scratch context, only ever used to measure. */
let measureCanvas: HTMLCanvasElement | null = null
let measureCtx: CanvasRenderingContext2D | null = null

function getMeasureCtx(): CanvasRenderingContext2D | null {
    if (typeof document === "undefined") return null
    if (!measureCanvas) measureCanvas = document.createElement("canvas")
    if (!measureCtx) measureCtx = measureCanvas.getContext("2d")
    return measureCtx
}

interface TextBitmap {
    canvas: HTMLCanvasElement
    width: number
    height: number
}

/** Rasterise the text, stroke under fill, centred with padding for the blur. */
function buildTextBitmap(p: Resolved, host: HTMLElement | null): TextBitmap {
    const lines = splitLines(p.text)
    const { family, weight, style, fontSize, lineHeight } = fontSpec(p.font)
    const shorthand = `${style} ${weight} ${fontSize}px ${family}`

    let widest = 0
    const measure = getMeasureCtx()
    if (measure) {
        measure.font = shorthand
        for (const line of lines)
            widest = Math.max(widest, measure.measureText(line).width)
    }
    if (widest === 0)
        widest = lines.reduce(
            (max, line) => Math.max(max, line.length * fontSize * 0.6),
            0
        )

    const blockHeight = fontSize + lineHeight * Math.max(0, lines.length - 1)
    const pad = p.stroke + TEXT_PAD
    const width = clamp(Math.ceil(widest + pad * 2), 1, MAX_TEXT_PX)
    const height = clamp(Math.ceil(blockHeight + pad * 2), 1, MAX_TEXT_PX)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return { canvas, width, height }

    ctx.clearRect(0, 0, width, height)
    ctx.font = shorthand
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.lineJoin = "round"

    const color = resolveColor(p.textColor, host)
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.lineWidth = p.stroke

    const top = height * 0.5 - blockHeight * 0.5 + fontSize * 0.5
    for (let i = 0; i < lines.length; i += 1) {
        const y = top + i * lineHeight
        if (p.stroke > 0) ctx.strokeText(lines[i], width * 0.5, y)
        ctx.fillText(lines[i], width * 0.5, y)
    }
    return { canvas, width, height }
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const VERTEX = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}`

/** Blit the text bitmap 1:1 into the centre of the field, premultiplied. */
const SOURCE = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uText;
uniform vec2 uFieldSize;
uniform vec2 uTextSize;
out vec4 fragColor;
void main() {
    vec2 local = (vUv - 0.5) * uFieldSize / uTextSize + 0.5;
    if (local.x < 0.0 || local.x > 1.0 || local.y < 0.0 || local.y > 1.0) {
        fragColor = vec4(0.0);
        return;
    }
    vec4 texel = texture(uText, vec2(local.x, 1.0 - local.y));
    fragColor = vec4(texel.rgb * texel.a, texel.a);
}`

/**
 * Sine displacement along a rotated axis. Two terms: a primary at uFrequency,
 * and a secondary at 1.7x carrying a lateral phase drift so the crests do not
 * read as one clean wave. Both advance at integer multiples of uTime, which is
 * what lets the CPU wrap the clock at 1.0 with no seam.
 *
 * Distortion drives the shaping exponent BELOW 1, flattening crests toward a
 * square wave rather than sharpening them into spikes.
 */
const WAVE = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTexture;
uniform vec2 uFieldSize;
uniform float uTime;
uniform float uFrequency;
uniform float uAmount;
uniform float uAngle;
uniform float uDistortion;
out vec4 fragColor;
const float TAU = 6.28318530718;

vec2 warp(vec2 uv) {
    float aspect = uFieldSize.x / uFieldSize.y;
    vec2 p = uv - 0.5;
    p.x *= aspect;
    vec2 dir = vec2(cos(uAngle), sin(uAngle));
    vec2 nrm = vec2(-dir.y, dir.x);
    float along = dot(p, dir);
    float across = dot(p, nrm);
    float primary = sin((along * uFrequency + uTime) * TAU);
    float secondary = sin((along * uFrequency * 1.7 + across * 2.4 + uTime * 2.0) * TAU);
    float s = (primary + secondary * 0.3) / 1.3;
    float shaped = sign(s) * pow(abs(s), mix(1.0, 0.35, uDistortion));
    p += nrm * shaped * uAmount;
    p.x /= aspect;
    return p + 0.5;
}

void main() {
    if (uAmount <= 0.0 || uFrequency <= 0.0) {
        fragColor = texture(uTexture, vUv);
        return;
    }
    vec2 dx = dFdx(vUv) * 0.5;
    vec2 dy = dFdy(vUv) * 0.5;
    vec4 sum = texture(uTexture, warp(vUv + dx + dy))
             + texture(uTexture, warp(vUv - dx + dy))
             + texture(uTexture, warp(vUv + dx - dy))
             + texture(uTexture, warp(vUv - dx - dy));
    fragColor = sum * 0.25;
}`

/**
 * Separable gaussian with a per-pixel sigma: uBase everywhere, plus uRamp
 * scaled by a quadratic ease on the distance out of the sharp band. Offsets
 * arrive already converted from CSS px to UV, so the pass can read a full-res
 * texture into a half-res target without changing the blur's real width.
 */
const BLUR = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTexture;
uniform vec2 uDirUv;
uniform float uBase;
uniform float uRamp;
uniform float uFocus;
uniform float uFalloff;
uniform float uRampScale;
out vec4 fragColor;
const int TAPS = 16;

float rampAt(float y) {
    float d = abs(y - 0.5);
    float t = clamp((d - uFocus) / max(1e-4, uFalloff - uFocus), 0.0, 1.0);
    return t * t;
}

void main() {
    // Two H/V iterations compose, so each one carries sigma / sqrt(2).
    float sigma = (uBase + uRamp * uRampScale * rampAt(vUv.y)) * 0.70710678;
    if (sigma < 0.4) {
        fragColor = texture(uTexture, vUv);
        return;
    }
    float stride = sigma * 2.5 / float(TAPS);
    float inv = -0.5 / (sigma * sigma);
    vec4 sum = texture(uTexture, vUv);
    float total = 1.0;
    for (int i = 1; i <= TAPS; i++) {
        float offset = float(i) * stride;
        float w = exp(offset * offset * inv);
        vec2 step = uDirUv * offset;
        sum += texture(uTexture, vUv + step) * w;
        sum += texture(uTexture, vUv - step) * w;
        total += 2.0 * w;
    }
    fragColor = sum / total;
}`

/**
 * Composite the sharp field against the blurred one by the same ramp, then
 * quantise alpha through an 8x8 ordered Bayer matrix.
 *
 * The matrix index is built by interleaving the bits of (x ^ y) and y, most
 * significant first — no lookup table, so nothing for the GLSL ES 3.00 loop
 * unroller to fight over.
 *
 * The dither grid steps in CSS pixels, not device pixels, so the dot pattern
 * is the same physical size on a retina display as on a 1x one.
 *
 * Quantisation is stochastic rounding against that matrix, over an INTEGER
 * number of levels — which is why the Levels control is the integer count
 * itself. With a fractional level count 1.0 is not representable, the top step
 * overshoots, and clamping it back biases solid glyphs dim — by 16% at some
 * settings and 0% at others, so sweeping the dial makes the type pulse.
 * Integer levels keep 0 and 1 exact and the expected value equal to the input
 * alpha everywhere between.
 */
const DITHER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSharp;
uniform sampler2D uSoft;
uniform float uDpr;
uniform float uFocus;
uniform float uFalloff;
uniform float uCoreMix;
uniform float uLevels;
uniform float uMix;
out vec4 fragColor;

int bayerIndex(ivec2 cell) {
    int x = cell.x & 7;
    int y = cell.y & 7;
    int a = x ^ y;
    return ((a & 4) >> 2) | ((y & 4) >> 1)
         | ((a & 2) << 1) | ((y & 2) << 2)
         | ((a & 1) << 4) | ((y & 1) << 5);
}

void main() {
    float d = abs(vUv.y - 0.5);
    float t = clamp((d - uFocus) / max(1e-4, uFalloff - uFocus), 0.0, 1.0);
    float ramp = mix(uCoreMix, 1.0, t * t);

    vec4 color = mix(texture(uSharp, vUv), texture(uSoft, vUv), ramp);
    if (color.a <= 0.0) {
        fragColor = vec4(0.0);
        return;
    }

    vec3 pure = color.rgb / color.a;
    ivec2 cell = ivec2(floor(gl_FragCoord.xy / max(1.0, uDpr)));
    float noise = (float(bayerIndex(cell)) + 0.5) / 64.0;

    float scaled = color.a * uLevels;
    float base = floor(scaled);
    float quantized = (base + step(noise, scaled - base)) / uLevels;

    float alpha = clamp(mix(color.a, quantized, uMix), 0.0, 1.0);
    fragColor = vec4(pure * alpha, alpha);
}`

const FRAGMENTS = {
    source: SOURCE,
    wave: WAVE,
    blur: BLUR,
    dither: DITHER,
} as const

type ProgramName = keyof typeof FRAGMENTS

// ---------------------------------------------------------------------------
// WebGL
// ---------------------------------------------------------------------------

interface Target {
    texture: WebGLTexture
    framebuffer: WebGLFramebuffer
    width: number
    height: number
}

function compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string
): WebGLShader {
    const shader = gl.createShader(type)
    if (!shader) throw Error("Could not create shader")
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader) || "Shader compile failed"
        gl.deleteShader(shader)
        throw Error(log)
    }
    return shader
}

function linkProgram(
    gl: WebGL2RenderingContext,
    fragment: string
): WebGLProgram {
    const program = gl.createProgram()
    if (!program) throw Error("Could not create program")
    let vs: WebGLShader | null = null
    let fs: WebGLShader | null = null
    try {
        vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX)
        fs = compileShader(gl, gl.FRAGMENT_SHADER, fragment)
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
            throw Error(gl.getProgramInfoLog(program) || "Program link failed")
        gl.detachShader(program, vs)
        gl.detachShader(program, fs)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
        return program
    } catch (error) {
        if (vs) gl.deleteShader(vs)
        if (fs) gl.deleteShader(fs)
        gl.deleteProgram(program)
        throw error
    }
}

function createTarget(
    gl: WebGL2RenderingContext,
    width: number,
    height: number
): Target {
    const texture = gl.createTexture()
    if (!texture) throw Error("Could not create texture")
    try {
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        )
        const framebuffer = gl.createFramebuffer()
        if (!framebuffer) throw Error("Could not create framebuffer")
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            texture,
            0
        )
        return { texture, framebuffer, width, height }
    } catch (error) {
        gl.deleteTexture(texture)
        throw error
    }
}

function deleteTarget(gl: WebGL2RenderingContext, target: Target) {
    gl.deleteTexture(target.texture)
    gl.deleteFramebuffer(target.framebuffer)
}

interface Renderer {
    /** `easedHover` is the settled 0..1 the Transition control produced. */
    render(nowMs: number, props: Resolved, easedHover: number): void
    /** True while the ease is in flight or the wave is live — drives the loop. */
    needsFrame(): boolean
    invalidateSource(): void
    destroy(): void
}

function createRenderer(canvas: HTMLCanvasElement): Renderer {
    const gl = canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
    })
    if (!gl) throw Error("WebGL2 is not available")

    const programs = {} as Record<ProgramName, WebGLProgram>
    try {
        for (const name of Object.keys(FRAGMENTS) as ProgramName[])
            programs[name] = linkProgram(gl, FRAGMENTS[name])
    } catch (error) {
        for (const program of Object.values(programs)) gl.deleteProgram(program)
        throw error
    }

    /**
     * A typo'd uniform name fails silently and the effect simply never appears,
     * so every location is collected up front and the harness asserts that none
     * came back null (rule 11d).
     */
    const locate = (program: WebGLProgram, ...names: string[]) =>
        Object.fromEntries(
            names.map((name) => [name, gl.getUniformLocation(program, name)])
        ) as Record<string, WebGLUniformLocation | null>

    const uniforms = {
        source: locate(programs.source, "uText", "uFieldSize", "uTextSize"),
        wave: locate(
            programs.wave,
            "uTexture",
            "uFieldSize",
            "uTime",
            "uFrequency",
            "uAmount",
            "uAngle",
            "uDistortion"
        ),
        blur: locate(
            programs.blur,
            "uTexture",
            "uDirUv",
            "uBase",
            "uRamp",
            "uFocus",
            "uFalloff",
            "uRampScale"
        ),
        dither: locate(
            programs.dither,
            "uSharp",
            "uSoft",
            "uDpr",
            "uFocus",
            "uFalloff",
            "uCoreMix",
            "uLevels",
            "uMix"
        ),
    }

    const textTexture = gl.createTexture()
    const vao = gl.createVertexArray()
    const quad = gl.createBuffer()
    const releaseCore = () => {
        if (textTexture) gl.deleteTexture(textTexture)
        if (quad) gl.deleteBuffer(quad)
        if (vao) gl.deleteVertexArray(vao)
        for (const program of Object.values(programs)) gl.deleteProgram(program)
    }
    if (!textTexture || !vao || !quad) {
        releaseCore()
        throw Error("Could not create WebGL resources")
    }

    try {
        gl.bindVertexArray(vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, quad)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
        )
        for (const program of Object.values(programs)) {
            const location = gl.getAttribLocation(program, "aPosition")
            gl.useProgram(program)
            gl.enableVertexAttribArray(location)
            gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
        }
        gl.bindTexture(gl.TEXTURE_2D, textTexture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    } catch (error) {
        releaseCore()
        throw error
    }
    gl.disable(gl.BLEND)
    gl.disable(gl.DEPTH_TEST)

    let cssW = 0
    let cssH = 0
    let dpr = 1
    let full: Target[] = []
    let half: Target[] = []
    let textW = 1
    let textH = 1
    let sourceKey = ""
    let sourceDirty = true
    let destroyed = false
    /** Wave phase in cycles, wrapped to [0, 1). */
    let cycles = 0
    let lastMs = 0
    /** Explicit, because a first timestamp of exactly 0 is a legal one. */
    let hasLast = false
    /** Hover ease, 0 at rest and 1 fully dithered. */
    let hover = 0
    let wantsFrame = false

    const releaseTargets = () => {
        for (const target of full) deleteTarget(gl, target)
        for (const target of half) deleteTarget(gl, target)
        full = []
        half = []
    }

    /**
     * One dt for both clocks. It has to be shared: the hover ease must keep
     * running when Speed is 0, and the wave clock must not double-count.
     */
    const step = (nowMs: number) => {
        if (!hasLast) {
            lastMs = nowMs
            hasLast = true
            return 0
        }
        const dt = clamp((nowMs - lastMs) / 1000, 0, MAX_FRAME_S)
        lastMs = nowMs
        return dt
    }

    /** clientWidth is transform-independent; getBoundingClientRect is not (rule G). */
    const resize = () => {
        const ratio = Math.min(window.devicePixelRatio || 1, MAX_DPR)
        const w = canvas.clientWidth || canvas.offsetWidth || 1
        const h = canvas.clientHeight || canvas.offsetHeight || 1
        if (w === cssW && h === cssH && ratio === dpr && full.length) return

        cssW = w
        cssH = h
        dpr = ratio

        const fullW = Math.max(1, Math.floor(w * ratio))
        const fullH = Math.max(1, Math.floor(h * ratio))
        const halfW = Math.max(1, Math.floor(fullW * 0.5))
        const halfH = Math.max(1, Math.floor(fullH * 0.5))
        canvas.width = fullW
        canvas.height = fullH

        releaseTargets()
        const made: Target[] = []
        try {
            made.push(createTarget(gl, fullW, fullH))
            made.push(createTarget(gl, fullW, fullH))
            made.push(createTarget(gl, halfW, halfH))
            made.push(createTarget(gl, halfW, halfH))
        } catch (error) {
            for (const target of made) deleteTarget(gl, target)
            throw error
        }
        full = made.slice(0, 2)
        half = made.slice(2)
        sourceDirty = true
    }

    /**
     * The colour probe has to land somewhere that participates in the cascade.
     * A <canvas> element's children are fallback content and are never
     * rendered, so the probe goes in the root next to the canvas.
     */
    const host = () => canvas.parentElement || document.body

    const syncSource = (p: Resolved) => {
        const color = resolveColor(p.textColor, host())
        const key = JSON.stringify([p.text, p.font, color, p.stroke])
        if (key === sourceKey) return
        sourceKey = key
        const bitmap = buildTextBitmap(p, host())
        textW = bitmap.width
        textH = bitmap.height
        gl.bindTexture(gl.TEXTURE_2D, textTexture)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            bitmap.canvas
        )
        sourceDirty = true
    }

    const bind = (
        location: WebGLUniformLocation | null,
        texture: WebGLTexture,
        unit: number
    ) => {
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.uniform1i(location, unit)
    }

    const pass = (
        program: WebGLProgram,
        target: Target | null,
        setup: () => void
    ) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null)
        gl.viewport(
            0,
            0,
            target ? target.width : canvas.width,
            target ? target.height : canvas.height
        )
        gl.useProgram(program)
        gl.bindVertexArray(vao)
        setup()
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    return {
        render(nowMs: number, p: Resolved, easedHover: number) {
            if (destroyed) return
            const dt = step(nowMs)
            const ease = clamp(easedHover, 0, 1)
            const moved = ease !== hover
            hover = ease

            /**
             * Every effect term is scaled by the ease, so at rest the wave and
             * blur passes are skipped entirely and the source blits straight
             * through — a clean resting frame, and a cheap one.
             */
            const waveAmount = p.wave.amount * ease
            const waveLive =
                p.wave.speed > 0 && waveAmount > 0 && p.wave.frequency > 0
            if (waveLive)
                cycles = (cycles + dt * p.wave.speed * SPEED_TO_CYCLES) % 1
            const time = cycles
            // Keep drawing while the Transition is still writing new values.
            wantsFrame = moved || waveLive

            resize()
            syncSource(p)
            if (full.length < 2 || half.length < 2) return

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)

            if (sourceDirty) {
                pass(programs.source, full[0], () => {
                    bind(uniforms.source.uText, textTexture, 0)
                    gl.uniform2f(uniforms.source.uFieldSize, cssW, cssH)
                    gl.uniform2f(uniforms.source.uTextSize, textW, textH)
                })
                sourceDirty = false
            }

            let sharp = full[0].texture
            if (waveAmount > 0 && p.wave.frequency > 0) {
                pass(programs.wave, full[1], () => {
                    bind(uniforms.wave.uTexture, full[0].texture, 0)
                    gl.uniform2f(uniforms.wave.uFieldSize, cssW, cssH)
                    gl.uniform1f(uniforms.wave.uTime, time)
                    gl.uniform1f(
                        uniforms.wave.uFrequency,
                        FREQ_BASE + p.wave.frequency * FREQ_SCALE
                    )
                    gl.uniform1f(uniforms.wave.uAmount, waveAmount * AMOUNT_TO_UV)
                    gl.uniform1f(
                        uniforms.wave.uAngle,
                        (p.wave.angle / 360) * Math.PI * 2
                    )
                    gl.uniform1f(
                        uniforms.wave.uDistortion,
                        p.wave.distortion / 100
                    )
                })
                sharp = full[1].texture
            }

            const base = p.dither.blur * BLUR_TO_SIGMA * ease
            const ramp = RAMP_SIGMA * ease
            const coreMix =
                clamp(p.dither.blur * BLUR_TO_CORE, 0, 0.85) * ease

            /** Ramp bounds in UV, derived from the text block, not the field. */
            const halfText = clamp(textH * 0.5 / Math.max(1, cssH), 0.04, 0.5)
            const focusUv = halfText * FOCUS_CORE
            const falloffUv = Math.min(0.5, halfText * FOCUS_EDGE)

            let soft = sharp
            if (base + ramp >= 0.5) {
                const horizontal: [number, number] = [1 / Math.max(1, cssW), 0]
                const vertical: [number, number] = [0, 1 / Math.max(1, cssH)]
                /** H, V, H, V — two composed iterations at half resolution. */
                const chain: Array<
                    [Target, WebGLTexture, [number, number], number]
                > = [
                    [half[0], sharp, horizontal, RAMP_ANISO_X],
                    [half[1], half[0].texture, vertical, 1],
                    [half[0], half[1].texture, horizontal, RAMP_ANISO_X],
                    [half[1], half[0].texture, vertical, 1],
                ]
                for (const [target, input, dir, rampScale] of chain) {
                    pass(programs.blur, target, () => {
                        bind(uniforms.blur.uTexture, input, 0)
                        gl.uniform2f(uniforms.blur.uDirUv, dir[0], dir[1])
                        gl.uniform1f(uniforms.blur.uBase, base)
                        gl.uniform1f(uniforms.blur.uRamp, ramp)
                        gl.uniform1f(uniforms.blur.uFocus, focusUv)
                        gl.uniform1f(uniforms.blur.uFalloff, falloffUv)
                        gl.uniform1f(uniforms.blur.uRampScale, rampScale)
                    })
                }
                soft = half[1].texture
            }

            pass(programs.dither, null, () => {
                bind(uniforms.dither.uSharp, sharp, 0)
                bind(uniforms.dither.uSoft, soft, 1)
                gl.uniform1f(uniforms.dither.uDpr, dpr)
                gl.uniform1f(uniforms.dither.uFocus, focusUv)
                gl.uniform1f(uniforms.dither.uFalloff, falloffUv)
                gl.uniform1f(uniforms.dither.uCoreMix, coreMix)
                gl.uniform1f(uniforms.dither.uLevels, p.dither.levels)
                gl.uniform1f(
                    uniforms.dither.uMix,
                    (p.dither.strength / 100) * ease
                )
            })
        },
        needsFrame() {
            return wantsFrame
        },
        invalidateSource() {
            sourceKey = ""
            sourceDirty = true
        },
        destroy() {
            destroyed = true
            releaseTargets()
            releaseCore()
        },
    }
}

// ---------------------------------------------------------------------------
// Static fallback
// ---------------------------------------------------------------------------

interface StaticProps extends Resolved {
    background: string
    style?: React.CSSProperties
}

/**
 * SVG stand-in for the static renderer — export, thumbnails, SSR — where there
 * is no GL context to build. A dot pattern masked by the glyphs approximates
 * the dither; a blurred copy behind a vertical fade approximates the ramp.
 */
function StaticText(props: StaticProps) {
    const id = useId().replace(/[^a-zA-Z0-9_-]/g, "")
    const label = ariaLabel(props.text)
    const lines = splitLines(props.text)
    const { family, weight, style, fontSize, lineHeight } = fontSpec(props.font)

    const blockHeight = fontSize + lineHeight * Math.max(0, lines.length - 1)
    const top = MIN_H * 0.5 - blockHeight * 0.5 + fontSize * 0.5
    const centerX = MIN_W * 0.5

    const softBlur = clamp(
        props.dither.blur * 0.16 + BLUR_PROGRESSIVE * 0.05,
        2,
        16
    )
    /** Fewer levels is a coarser quantisation, so the dots get bigger. */
    const dotPitch = clamp(6.4 - 100 / props.dither.levels * 0.02, 4, 6.4)
    const dotRadius = clamp(0.7 + props.dither.strength * 0.006, 0.7, 1.3)
    const fade = clamp(60 + BLUR_PROGRESSIVE * 0.5, 60, 200)

    const glyphs = (widen = 1, color = props.textColor) =>
        lines.map((line, i) => (
            <text
                key={`${line}-${i}`}
                x={centerX}
                y={top + i * lineHeight}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily={family}
                fontWeight={weight}
                fontStyle={style}
                fontSize={fontSize}
                stroke={color}
                strokeWidth={props.stroke * widen}
                strokeLinejoin="round"
                fill={color}
            >
                {line}
            </text>
        ))

    return (
        <div
            aria-label={label}
            style={{
                minWidth: MIN_W,
                minHeight: MIN_H,
                background: props.background,
                ...props.style,
                position: "relative",
                overflow: "hidden",
            }}
        >
            <svg
                role="img"
                aria-label={label}
                viewBox={`0 0 ${MIN_W} ${MIN_H}`}
                preserveAspectRatio="xMidYMid meet"
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            >
                <defs>
                    <pattern
                        id={`${id}-dots`}
                        width={dotPitch}
                        height={dotPitch}
                        patternUnits="userSpaceOnUse"
                    >
                        <circle
                            cx={dotPitch * 0.5}
                            cy={dotPitch * 0.5}
                            r={dotRadius}
                            fill={props.textColor}
                        />
                    </pattern>
                    <filter
                        id={`${id}-soft`}
                        x="-30%"
                        y="-60%"
                        width="160%"
                        height="220%"
                        colorInterpolationFilters="sRGB"
                    >
                        <feGaussianBlur stdDeviation={softBlur} />
                    </filter>
                    <linearGradient
                        id={`${id}-ramp`}
                        x1="0"
                        y1={top - blockHeight * 0.5 - fade}
                        x2="0"
                        y2={top + blockHeight * 0.5 + fade}
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop offset="0" stopColor="white" stopOpacity=".85" />
                        <stop offset=".45" stopColor="white" stopOpacity="0" />
                        <stop offset=".55" stopColor="white" stopOpacity="0" />
                        <stop offset="1" stopColor="white" stopOpacity=".85" />
                    </linearGradient>
                    <mask id={`${id}-ramp-mask`}>
                        <rect
                            width="100%"
                            height="100%"
                            fill={`url(#${id}-ramp)`}
                        />
                    </mask>
                    <mask id={`${id}-glyph-mask`}>
                        <rect width="100%" height="100%" fill="black" />
                        <g>{glyphs(1, "white")}</g>
                    </mask>
                    <mask id={`${id}-soft-mask`}>
                        <rect width="100%" height="100%" fill="black" />
                        <g filter={`url(#${id}-soft)`}>
                            {glyphs(1.15, "white")}
                        </g>
                    </mask>
                </defs>
                <g
                    filter={`url(#${id}-soft)`}
                    mask={`url(#${id}-ramp-mask)`}
                    opacity=".7"
                >
                    {glyphs(1.15)}
                </g>
                <rect
                    width="100%"
                    height="100%"
                    fill={`url(#${id}-dots)`}
                    mask={`url(#${id}-soft-mask)`}
                    opacity=".5"
                />
                <g>{glyphs()}</g>
                <rect
                    width="100%"
                    height="100%"
                    fill={`url(#${id}-dots)`}
                    mask={`url(#${id}-glyph-mask)`}
                    opacity=".95"
                />
            </svg>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DitherText(props: Partial<Props>) {
    const {
        text = "HELLO\nWORLD",
        font = {"variant":"Bold","fontSize":120,"textAlign":"left","fontFamily":"Inter","fontWeight":700,"lineHeight":"1em","letterSpacing":"0em"},
        textColor = "#FFFFFF",
        background = "#000000",
        stroke = 4,
        dither,
        wave,
        style,
    } = props

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rendererRef = useRef<Renderer | null>(null)
    const drawRef = useRef<() => void>(() => {})
    /** Hover target, 0 or 1. A ref, so entering never re-renders the tree. */
    const hoverRef = useRef(0)
    /** The eased 0..1 the Transition control produces; the loop reads .get(). */
    const hoverMV = useRef(motionValue(0)).current
    const hoverAnim = useRef<{ stop: () => void } | null>(null)
    const transitionRef = useRef(props.transition ?? DEFAULT_TRANSITION)
    transitionRef.current = props.transition ?? DEFAULT_TRANSITION

    const isStatic = false
    const isCanvas = false
    const useStaticFallback = isStatic && !isCanvas

    /**
     * A group the designer never opened arrives undefined, so each is spread
     * over a typed defaults literal rather than a hand-written ?? chain, where
     * one missed key silently pins a control forever (rule 11).
     */
    const resolved = useMemo<Resolved>(() => {
        const w = { ...DEFAULT_WAVE, ...wave }
        const d = { ...DEFAULT_DITHER, ...dither }
        return {
            text,
            font,
            textColor,
            stroke: clamp(stroke, 0, 20),
            dither: {
                // Integer, or 1.0 stops being a representable alpha level.
                levels: Math.round(clamp(d.levels, 1, MAX_LEVELS)),
                strength: clamp(d.strength, 0, 100),
                blur: clamp(d.blur, 0, MAX_BLUR),
            },
            wave: {
                frequency: clamp(w.frequency, 0, 20),
                amount: clamp(w.amount, 0, 100),
                angle: clamp(w.angle, 0, 360),
                distortion: clamp(w.distortion, 0, 100),
                speed: clamp(w.speed, 0, 100),
            },
        }
    }, [text, font, textColor, stroke, dither, wave])

    const propsRef = useRef(resolved)
    propsRef.current = resolved

    /**
     * Framer hands back a fresh group object every render, so the effects below
     * depend on primitive keys — never on the objects themselves (rule G).
     */
    const fontKey = useMemo(() => JSON.stringify(font), [font])
    const waveKey = JSON.stringify(resolved.wave)
    const ditherKey = JSON.stringify(resolved.dither)

    useEffect(() => {
        if (useStaticFallback) return
        const canvas = canvasRef.current
        if (!canvas) return

        let frame = 0
        let disposed = false
        let queued = false
        let pageVisible = document.visibilityState !== "hidden"
        let inView = true

        try {
            rendererRef.current?.destroy()
            rendererRef.current = createRenderer(canvas)
        } catch {
            // No WebGL2. Paint the fallback fill rather than leave a void.
            const ctx = canvas.getContext("2d")
            if (ctx) {
                ctx.fillStyle = FALLBACK_FILL
                ctx.fillRect(0, 0, canvas.width, canvas.height)
            }
            return
        }

        /**
         * The canvas holds the effect fully on: hover is not a gesture a
         * designer can rely on there, and every Dither / Blur / Wave dial
         * would otherwise map to nothing while being tuned (rule 5, rule F).
         */
        const target = () => (isCanvas ? 1 : hoverMV.get())
        /** The loop must also run while the ease settles, even at Speed 0. */
        const animating = () => rendererRef.current?.needsFrame() ?? false
        const stop = () => {
            if (!queued) return
            cancelAnimationFrame(frame)
            queued = false
        }
        const schedule = () => {
            if (disposed || queued || !pageVisible || !inView || !animating())
                return
            queued = true
            frame = requestAnimationFrame(tick)
        }
        const tick = (now: number) => {
            queued = false
            if (disposed || !pageVisible || !inView) return
            rendererRef.current?.render(now, propsRef.current, target())
            schedule()
        }
        const draw = () => {
            if (disposed || !pageVisible || !inView) return
            rendererRef.current?.render(
                performance.now(),
                propsRef.current,
                target()
            )
            schedule()
        }

        const onVisibility = () => {
            pageVisible = document.visibilityState !== "hidden"
            if (pageVisible) draw()
            else stop()
        }
        /** A theme flip can change what the colour token resolves to. */
        const onTheme = () => {
            bumpColorEpoch()
            rendererRef.current?.invalidateSource()
            draw()
        }

        const scheme =
            typeof window.matchMedia === "function"
                ? window.matchMedia("(prefers-color-scheme: dark)")
                : null
        scheme?.addEventListener?.("change", onTheme)

        let themeObserver: MutationObserver | null = null
        if (typeof MutationObserver !== "undefined") {
            themeObserver = new MutationObserver(onTheme)
            themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ["class", "style", "data-theme"],
            })
        }

        let sizeObserver: ResizeObserver | null = null
        if (typeof ResizeObserver !== "undefined") {
            sizeObserver = new ResizeObserver(() => draw())
            sizeObserver.observe(canvas)
        }

        /** IntersectionObserver is suspended on the Framer canvas (rule 5). */
        let viewObserver: IntersectionObserver | null = null
        if (!isCanvas && typeof IntersectionObserver !== "undefined") {
            viewObserver = new IntersectionObserver((entries) => {
                inView = entries[0]?.isIntersecting ?? true
                if (inView) draw()
                else stop()
            })
            viewObserver.observe(canvas)
        }

        document.addEventListener("visibilitychange", onVisibility)
        drawRef.current = draw
        draw()

        return () => {
            disposed = true
            document.removeEventListener("visibilitychange", onVisibility)
            scheme?.removeEventListener?.("change", onTheme)
            viewObserver?.disconnect()
            sizeObserver?.disconnect()
            themeObserver?.disconnect()
            drawRef.current = () => {}
            stop()
            rendererRef.current?.destroy()
            rendererRef.current = null
        }
    }, [useStaticFallback, isCanvas])

    /** Redraw once whenever a visual prop changes. Primitive deps only. */
    useEffect(() => {
        if (useStaticFallback) return
        drawRef.current()
    }, [
        useStaticFallback,
        text,
        fontKey,
        textColor,
        stroke,
        waveKey,
        ditherKey,
    ])

    /** First paint can land before the webfont does. */
    useEffect(() => {
        if (useStaticFallback) return
        const fonts = document.fonts
        if (!fonts) return
        let cancelled = false
        const redraw = () => {
            if (cancelled) return
            rendererRef.current?.invalidateSource()
            drawRef.current()
        }
        fonts.load(fontShorthand(propsRef.current.font)).then(redraw, redraw)
        fonts.ready.then(redraw, redraw)
        return () => {
            cancelled = true
        }
    }, [useStaticFallback, fontKey])

    if (useStaticFallback)
        return <StaticText {...resolved} background={background} style={style} />

    /**
     * The root carries the listeners and nothing here transforms, so the hit
     * region is fixed and hover cannot chase itself (rule C). pointercancel is
     * bound too: on touch, entry fires on touch-down and a cancelled gesture
     * would otherwise leave the effect stuck on.
     */
    const gateHover = (to: number) => {
        if (hoverRef.current === to) return
        hoverRef.current = to
        hoverAnim.current?.stop()
        const t = transitionRef.current
        // Leaving is the slower half, as the source had it.
        const opts: Motion =
            to === 1
                ? t
                : {
                      ...t,
                      ...(typeof t.duration === "number"
                          ? { duration: t.duration * HOVER_OUT_RATIO }
                          : {}),
                      ...(typeof t.stiffness === "number"
                          ? {
                                stiffness:
                                    t.stiffness /
                                    (HOVER_OUT_RATIO * HOVER_OUT_RATIO),
                            }
                          : {}),
                  }
        hoverAnim.current = animate(hoverMV, to, {
            ...opts,
            // The loop only schedules itself while something is moving, so the
            // tween has to kick it awake on every value it writes.
            onUpdate: () => drawRef.current(),
        })
        drawRef.current()
    }
    const onEnter = () => gateHover(1)
    const onLeave = () => gateHover(0)

    return (
        <div
            onPointerEnter={onEnter}
            onPointerLeave={onLeave}
            onPointerCancel={onLeave}
            style={{
                minWidth: MIN_W,
                minHeight: MIN_H,
                background,
                ...style,
                position: "relative",
                overflow: "hidden",
            }}
        >
            <canvas
                ref={canvasRef}
                role="img"
                aria-label={ariaLabel(text)}
                style={{
                    display: "block",
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                }}
            />
        </div>
    )
}
