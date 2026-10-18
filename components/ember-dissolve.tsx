"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ types --- */

interface FontProps {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    fontSize?: number | string
    lineHeight?: number | string
}

interface DissolveProps {
    edge?: number
    noise?: number
    scatter?: number
}

interface Props {
    type?: "text" | "image"
    text?: string
    font?: FontProps
    image?: string | { src?: string }
    fit?: "cover" | "contain"
    itemWidth?: number
    itemHeight?: number
    offsetX?: number
    offsetY?: number
    background?: string
    textColor?: string
    emberColor?: string
    density?: number
    dotSize?: number
    reach?: number
    restore?: boolean
    speed?: number
    dissolve?: DissolveProps
    style?: CSSProperties
}

/* -------------------------------------------------------------- constants --- */

/** Size floor, one number across the repo (rule 10). */
const MIN_W = 1200
const MIN_H = 800

/** Quality tier, not a design control — picked, not exposed (rule 10). */
const MAX_DPR = 2

/** Widest source raster, in CSS px. Caps the one getImageData per rebuild. */
const MAX_SRC = 1600

/** Ceiling on the particle budget, whatever Density asks for. */
const MAX_PARTICLES = 40000

/** Source alpha a grid cell must carry to earn a particle. */
const SEED_ALPHA = 90

/**
 * Reference world units per plate unit. The reference mesh was radius ~4 and
 * this plate is half-height 1, so every velocity and offset lifted from it is
 * multiplied by this to keep the same apparent motion.
 */
const SCENE = 0.25

/** Plate units back into reference units, for the wave sines only. */
const WAVE_SPACE = 1 / SCENE

/** Reference particleData.velocityFactor. */
const VEL_X = 2.5
const VEL_Y = 2.0

/** Reference particleData.particleSpeedFactor, at Speed 50. */
const SPEED_BASE = 0.02

/** Reference particleMaxOffsetArr = random * 5.5 + 1.5, at Scatter 100. */
const OFFSET_MIN = 1.5
const OFFSET_SPAN = 5.5

/** How fast an ember shrinks and fades with travel. Replaces the reference's
 *  perspective term, which a flat plate does not have. */
const SHRINK = 1.6

/** Base sprite diameter in CSS px at Dot Size 100. */
const DOT_BASE_PX = 15

/** Hover fade, per second. The cursor POSITION is never eased — the hole has
 *  to sit under the pointer, not trail it. */
const HOVER_RATE = 7

/** Idle cursor path on the Framer canvas, in plate units per second. */
const IDLE_RATE_X = 0.37
const IDLE_RATE_Y = 0.53

/** Noise ceiling. Ashima simplex tops out just under 1.1. */
const N_MAX = 1.12

/**
 * Wave was a dial and is now a constant at the value it shipped at (rule 11b):
 * the panel row went so Restore could have one, and the render path is
 * unchanged. It is the amplitude added to each of the eight drift sines.
 */
const WAVE_AMP = 0.75

/**
 * Burn-field resolution across the plate's width, for Restore off. 256 cells
 * over a 1200px plate is ~4.7px each, well under the ~34px the noise varies
 * over, so the grid never becomes the thing the eye sees at the rim.
 */
const BURN_W = 256

/** The picture's box at rest: the size floor, so a fresh instance is full-bleed. */
const DEFAULT_ITEM_W = 400
const DEFAULT_ITEM_H = 500

const DEFAULT_TEXT = "DISSOLVE"
const DEFAULT_FONT: FontProps = {
    fontFamily: "Inter",
    fontWeight: 800,
    fontSize: 190,
    lineHeight: "1em",
}
const DEFAULT_DISSOLVE: Required<DissolveProps> = {
    edge: 46,
    noise: 49,
    scatter: 73,
}

type Vec3 = [number, number, number]

/* -------------------------------------------------------------- utilities --- */

const clamp = (v: number, lo: number, hi: number) =>
    v < lo ? lo : v > hi ? hi : v

const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback

/**
 * ControlType.Color does not emit hex — it emits rgb(), rgba(), hsl() and
 * var(--token, …). Resolve through a probe span so every form lands, then read
 * the computed rgb()/rgba() back.
 */
const colorCache = new Map<string, [number, number, number, number]>()

function toRgba(
    input: string | undefined,
    host: HTMLElement | null,
    fallback: [number, number, number, number]
): [number, number, number, number] {
    if (!input) return fallback
    const key = String(input).trim()
    const hit = colorCache.get(key)
    if (hit) return hit
    if (typeof document === "undefined") return fallback

    const probe = document.createElement("span")
    probe.style.color = key
    probe.style.position = "absolute"
    probe.style.pointerEvents = "none"
    probe.style.visibility = "hidden"
    const parent = host || document.body || document.documentElement
    parent.appendChild(probe)
    const computed = getComputedStyle(probe).color || ""
    probe.remove()

    const match = computed.match(
        /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.%]+))?/i
    )
    let out = fallback
    if (match) {
        let a = 1
        if (match[4] !== undefined) {
            a = match[4].endsWith("%")
                ? parseFloat(match[4]) / 100
                : parseFloat(match[4])
            if (!Number.isFinite(a)) a = 1
        }
        out = [
            clamp(parseFloat(match[1]) / 255, 0, 1),
            clamp(parseFloat(match[2]) / 255, 0, 1),
            clamp(parseFloat(match[3]) / 255, 0, 1),
            clamp(a, 0, 1),
        ]
    }
    colorCache.set(key, out)
    return out
}

function resolveCss(input: string | undefined, host: HTMLElement | null) {
    const [r, g, b, a] = toRgba(input, host, [1, 1, 1, 1])
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
        b * 255
    )}, ${a})`
}

function parseFontSize(value: number | string | undefined): number {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
        const n = parseFloat(value)
        if (!Number.isNaN(n)) return value.includes("rem") ? n * 16 : n
    }
    return 190
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
    return fontSize * 1.05
}

/** Quote family names that are not generic keywords, for a canvas font string. */
function quoteFamily(family: string): string {
    return family
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) =>
            name.startsWith("'") || name.startsWith('"') || /^[a-z-]+$/i.test(name)
                ? name
                : `"${name.replace(/"/g, '\\"')}"`
        )
        .join(", ")
}

function splitLines(text: string | undefined): string[] {
    return (text || DEFAULT_TEXT)
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean)
}

const imageSrc = (image: Props["image"]): string =>
    typeof image === "string" ? image : image?.src || ""

/* ---------------------------------------------------------------- shaders --- */

/** Ashima 3D simplex, as the reference ships it (src/lib/noise/snoise.glsl). */
const NOISE_GLSL = `
vec4 permute(vec4 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0 / 7.0;
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
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`

/**
 * The dissolve field, shared by the plate and the particles so both agree on
 * where the rim is to the last bit.
 *
 * The falloff starts at RIM_FRAC of Reach, not at 0. A falloff that ramps from
 * the centre outwards puts g at 1 only at the single pixel under the pointer,
 * so the plate is never fully cleared anywhere and the effect reads as a soft
 * fade rather than as something being eaten. Holding g at 1 out to RIM_FRAC
 * makes Reach mean the hole's radius, and leaves the outer 45% as the annulus
 * where the noise decides — which is the ragged front the reference had.
 *
 * Written as 1.0 - smoothstep(lo, hi, d), never smoothstep(hi, lo, d): GLSL
 * leaves smoothstep undefined when edge0 >= edge1.
 */
const RIM_FRAC = 0.55

const DISSOLVE_GLSL = `
uniform float uFreq;
uniform float uEdge;
uniform vec2 uCursor;
uniform float uReach;
uniform float uHover;
uniform float uPersist;

float dissolveNoise(vec2 q){ return snoise(vec3(q * uFreq, 0.0)); }

// burn is the remembered maximum for this point, ignored while uPersist is 0.
// It arrives as a texture on the plate and as an attribute on the particles,
// but both come from the same array sampled the same way.
float progressAt(vec2 q, float burn){
    float d = distance(q, uCursor);
    float live = (1.0 - smoothstep(uReach * ${RIM_FRAC.toFixed(2)}, uReach, d)) * uHover;
    float g = mix(live, burn, uPersist);
    return mix(-(${N_MAX.toFixed(2)} + uEdge), ${N_MAX.toFixed(2)}, g);
}
`

const PLATE_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const PLATE_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform sampler2D uBurn;
uniform float uAspect;
uniform vec3 uEmber;
uniform float uEmberGain;
${NOISE_GLSL}
${DISSOLVE_GLSL}
void main(){
    vec4 src = texture2D(uTex, vUv);
    if (src.a < 0.004) discard;

    vec2 q = vec2((vUv.x - 0.5) * 2.0 * uAspect, (vUv.y - 0.5) * 2.0);
    float n = dissolveNoise(q);
    float p = progressAt(q, texture2D(uBurn, vUv).r);
    if (n < p) discard;

    // 1 at the cut, 0 at the far side of the band.
    float band = 1.0 - smoothstep(p, p + uEdge, n);

    // The reference painted the whole band flat in the edge colour. A single
    // ramp instead reads as a wash across the glyph, so the band is split: the
    // linear part tints, and a fourth power concentrates the emission into the
    // few pixels next to the cut, which is what makes it look lit rather than
    // coloured.
    // src is premultiplied (UNPACK_PREMULTIPLY_ALPHA_WEBGL), so the ember has
    // to be premultiplied by the same alpha before it can be mixed in.
    vec3 col = mix(src.rgb, uEmber * src.a, band * 0.85);
    col += uEmber * src.a * pow(band, 4.0) * uEmberGain * 2.0;
    gl_FragColor = vec4(col, src.a);
}
`

const PARTICLE_VERT = `
attribute vec2 aInit;
attribute vec2 aCurr;
attribute float aPhase;
attribute float aBurn;
uniform float uAspect;
uniform float uSize;
uniform float uTime;
varying float vAlpha;
varying float vAngle;
${NOISE_GLSL}
${DISSOLVE_GLSL}
void main(){
    float n = dissolveNoise(aInit);
    float p = progressAt(aInit, aBurn);

    // Visible only inside the same band the plate paints, softened at both
    // ends. The reference hard-discarded here; the soft ends are what stop an
    // ember popping out of existence as the rim slides off it.
    float soft = uEdge * 0.3;
    float a = smoothstep(p, p + soft, n) *
              (1.0 - smoothstep(p + uEdge - soft, p + uEdge, n));

    if (a <= 0.001) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        return;
    }

    float d = distance(aCurr, aInit);
    float fall = 1.0 / (1.0 + d * ${SHRINK.toFixed(2)});
    vAlpha = a * fall;
    vAngle = aPhase + uTime * 0.9;

    gl_Position = vec4(aCurr.x / uAspect, aCurr.y, 0.0, 1.0);
    gl_PointSize = max(1.0, uSize * fall);
}
`

const PARTICLE_FRAG = `
precision highp float;
uniform vec3 uEmber;
uniform float uEmberGain;
varying float vAlpha;
varying float vAngle;
void main(){
    vec2 c = gl_PointCoord - 0.5;
    c = mat2(cos(vAngle), sin(vAngle), -sin(vAngle), cos(vAngle)) * c;
    float r = length(c);
    if (r > 0.5) discard;

    // Core, four-point star and halo, in place of the reference's particle.png
    // plus an UnrealBloom pass. The star is why the per-particle rotation is
    // visible at all: a radially symmetric sprite would not show it.
    float core = smoothstep(0.34, 0.0, r);
    float star = pow(max(0.0, 1.0 - min(abs(c.x), abs(c.y)) * 14.0), 3.0)
               * smoothstep(0.5, 0.05, r);
    float halo = smoothstep(0.5, 0.0, r) * 0.3;

    float a = clamp(core + star * 0.6 + halo, 0.0, 1.0) * vAlpha;
    gl_FragColor = vec4(uEmber * a * uEmberGain, a);
}
`

function compile(gl: WebGLRenderingContext, kind: number, src: string) {
    const shader = gl.createShader(kind)
    if (!shader) return null
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("EmberDissolve shader:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

function link(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string) {
    const vs = compile(gl, gl.VERTEX_SHADER, vertSrc)
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc)
    if (!vs || !fs) return null
    const program = gl.createProgram()
    if (!program) return null
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("EmberDissolve link:", gl.getProgramInfoLog(program))
        return null
    }
    return program
}

/* -------------------------------------------------------------- component --- */

export default function EmberDissolve(props: Props) {
    const {
        background = "#000000",
        text,
        type = "image",
        style,
        fit = "cover",
        itemWidth = DEFAULT_ITEM_W,
        itemHeight = DEFAULT_ITEM_H,
        offsetX = 0,
        offsetY = 0,
        textColor = "#E8EEF7",
        emberColor = "#FF0000",
        density = 220,
        dotSize = 100,
        reach = 30,
        restore = true,
        speed = 50,
        dissolve = DEFAULT_DISSOLVE,
        image = "https://images.unsplash.com/photo-1741335661494-a2c26dfa7613?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDM5MXx8fGVufDB8fHx8fA%3D%3D",
        font = DEFAULT_FONT,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Re-pointed every render, so the loop reads current props without the
    // effect depending on them and tearing the context down (rule 6).
    const propsRef = useRef(props)
    propsRef.current = { ...props, background, type, fit, itemWidth, itemHeight, offsetX, offsetY, textColor, emberColor, density, dotSize, reach, restore, speed, dissolve, image, font }

    const dirtyRef = useRef(true)
    const imageRef = useRef<HTMLImageElement | null>(null)
    const pointerRef = useRef({ x: 0, y: 0, target: 0, amount: 0 })

    // Extracted primitives, never the font/dissolve objects: Framer hands back
    // a fresh object every render and this effect would fire every time.
    const fontKey = JSON.stringify(font || DEFAULT_FONT)
    const src = imageSrc(image)

    useEffect(() => {
        dirtyRef.current = true
    }, [
        type,
        text,
        fontKey,
        textColor,
        src,
        fit,
        itemWidth,
        itemHeight,
        offsetX,
        offsetY,
        density,
    ])

    // The picture is loaded outside the GL effect so a new src never rebuilds
    // the context — it only marks the source raster dirty.
    useEffect(() => {
        if (!src) {
            imageRef.current = null
            dirtyRef.current = true
            return
        }
        const img = new Image()
        img.crossOrigin = "anonymous"
        let live = true
        img.onload = () => {
            if (!live) return
            imageRef.current = img
            dirtyRef.current = true
        }
        img.onerror = () => {
            if (!live) return
            imageRef.current = null
            dirtyRef.current = true
        }
        img.src = src
        return () => {
            live = false
        }
    }, [src])

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return

        const context = canvas.getContext("webgl", {
            antialias: false,
            alpha: true,
            depth: false,
            premultipliedAlpha: true,
            preserveDrawingBuffer: false,
        })
        if (!context) {
            console.error("EmberDissolve: WebGL unavailable")
            return
        }
        // Narrowed to a const so the nested draw helpers keep the non-null type.
        const gl = context

        const plate = link(gl, PLATE_VERT, PLATE_FRAG)
        const points = link(gl, PARTICLE_VERT, PARTICLE_FRAG)
        if (!plate || !points) return

        /* ------------------------------------------------ uniform handles --- */
        // Locations are per-program: the same name in two programs is two
        // different handles and must never share a cache entry.
        const plateU = {
            tex: gl.getUniformLocation(plate, "uTex"),
            aspect: gl.getUniformLocation(plate, "uAspect"),
            ember: gl.getUniformLocation(plate, "uEmber"),
            gain: gl.getUniformLocation(plate, "uEmberGain"),
            freq: gl.getUniformLocation(plate, "uFreq"),
            edge: gl.getUniformLocation(plate, "uEdge"),
            cursor: gl.getUniformLocation(plate, "uCursor"),
            reach: gl.getUniformLocation(plate, "uReach"),
            hover: gl.getUniformLocation(plate, "uHover"),
            persist: gl.getUniformLocation(plate, "uPersist"),
            burn: gl.getUniformLocation(plate, "uBurn"),
        }
        const pointU = {
            aspect: gl.getUniformLocation(points, "uAspect"),
            size: gl.getUniformLocation(points, "uSize"),
            time: gl.getUniformLocation(points, "uTime"),
            ember: gl.getUniformLocation(points, "uEmber"),
            gain: gl.getUniformLocation(points, "uEmberGain"),
            freq: gl.getUniformLocation(points, "uFreq"),
            edge: gl.getUniformLocation(points, "uEdge"),
            cursor: gl.getUniformLocation(points, "uCursor"),
            reach: gl.getUniformLocation(points, "uReach"),
            hover: gl.getUniformLocation(points, "uHover"),
            persist: gl.getUniformLocation(points, "uPersist"),
        }
        for (const [name, handle] of [
            ...Object.entries(plateU),
            ...Object.entries(pointU),
        ]) {
            if (handle === null)
                console.warn("EmberDissolve: no uniform location for", name)
        }

        const aPlatePos = gl.getAttribLocation(plate, "aPos")
        const aInit = gl.getAttribLocation(points, "aInit")
        const aCurr = gl.getAttribLocation(points, "aCurr")
        const aPhase = gl.getAttribLocation(points, "aPhase")
        const aBurn = gl.getAttribLocation(points, "aBurn")

        /* ---------------------------------------------------- GL resources --- */
        const quad = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quad)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]),
            gl.STATIC_DRAW
        )

        const initBuf = gl.createBuffer()
        const currBuf = gl.createBuffer()
        const phaseBuf = gl.createBuffer()
        const burnBuf = gl.createBuffer()

        const texture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        // Set per upload, not once: the burn field is an ArrayBufferView and
        // must not be flipped or premultiplied, and these are global state.
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

        const burnTex = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, burnTex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        const pointRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as
            | Float32Array
            | number[]
        const maxPointSize = Math.max(1, Number(pointRange?.[1]) || 64)

        const srcCanvas = document.createElement("canvas")
        const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true })

        /* ------------------------------------------------- particle arrays --- */
        let count = 0
        let initArr = new Float32Array(0)
        let currArr = new Float32Array(0)
        let velArr = new Float32Array(0)
        let offRandArr = new Float32Array(0)
        let phaseArr = new Float32Array(0)
        let burnArr = new Float32Array(0)

        /* ------------------------------------------------------ burn field --- */
        // Row 0 is the BOTTOM of the plate (v = 0), because the burn texture is
        // uploaded unflipped, so a cell's row maps straight to the plate's uv.
        let burnW = BURN_W
        let burnH = BURN_W
        let burnField = new Uint8Array(0)
        let burnTexDirty = true
        let burnAttrDirty = true
        let burnAny = false
        let prevPersist = false

        // offsetWidth/offsetHeight, never getBoundingClientRect: the rect
        // carries the canvas zoom. Framer's width/height props are not numeric
        // in preview either.
        let cssW = root.offsetWidth || MIN_W
        let cssH = root.offsetHeight || MIN_H
        let aspect = cssW / cssH

        const resizeObserver = new ResizeObserver(() => {
            const w = root.offsetWidth || MIN_W
            const h = root.offsetHeight || MIN_H
            if (w === cssW && h === cssH) return
            cssW = w
            cssH = h
            aspect = cssW / cssH
            dirtyRef.current = true
        })
        resizeObserver.observe(root)

        /* --------------------------------------------------- source raster --- */
        // The picture's drawn box, clipped to the frame, in CSS px. Null for
        // text. Only the tainted-canvas seeding fallback reads it.
        let imageBox: { x0: number; y0: number; x1: number; y1: number } | null =
            null

        function drawSource() {
            if (!srcCtx) return
            const scale = Math.min(1, MAX_SRC / Math.max(cssW, cssH))
            const w = Math.max(1, Math.round(cssW * scale))
            const h = Math.max(1, Math.round(cssH * scale))
            srcCanvas.width = w
            srcCanvas.height = h
            srcCtx.setTransform(1, 0, 0, 1, 0, 0)
            srcCtx.clearRect(0, 0, w, h)
            srcCtx.scale(scale, scale)

            const p = propsRef.current
            const img = imageRef.current

            if (p.type === "image" && img && img.naturalWidth > 0) {
                // The picture's own Width x Height box, centred in the frame.
                const bw = clamp(
                    Math.round(num(p.itemWidth, DEFAULT_ITEM_W)),
                    1,
                    8000
                )
                const bh = clamp(
                    Math.round(num(p.itemHeight, DEFAULT_ITEM_H)),
                    1,
                    8000
                )
                const bx = (cssW - bw) * 0.5
                const by = (cssH - bh) * 0.5

                // The picture keeps its own proportions either way. Cover takes
                // the LARGER of the two scales, so both axes reach the box and
                // the long one is cropped; Contain takes the smaller, so the
                // whole picture fits and the short axis letterboxes.
                const cover = p.fit !== "contain"
                const sx = bw / img.naturalWidth
                const sy = bh / img.naturalHeight
                const fit = cover ? Math.max(sx, sy) : Math.min(sx, sy)
                const dw = img.naturalWidth * fit
                const dh = img.naturalHeight * fit

                // The crop pan, as background-position has it: (box - picture)
                // is the slack on that axis, negative under Cover, and the
                // offset picks where in it the picture sits — 0 centred, +100
                // flush right / bottom. Only the picture moves, so the plate,
                // the noise and the pointer mapping stay where they are.
                // Contain has no crop to pan and ignores both.
                const ox = cover ? clamp(num(p.offsetX, 0), -100, 100) / 100 : 0
                const oy = cover ? clamp(num(p.offsetY, 0), -100, 100) / 100 : 0
                const dx = bx + (bw - dw) * (0.5 + ox * 0.5)
                const dy = by + (bh - dh) * (0.5 + oy * 0.5)

                srcCtx.save()
                srcCtx.beginPath()
                srcCtx.rect(bx, by, bw, bh)
                srcCtx.clip()
                srcCtx.drawImage(img, dx, dy, dw, dh)
                srcCtx.restore()
                imageBox = {
                    x0: Math.max(0, bx, dx),
                    y0: Math.max(0, by, dy),
                    x1: Math.min(cssW, bx + bw, dx + dw),
                    y1: Math.min(cssH, by + bh, dy + dh),
                }
                return
            }
            imageBox = null

            const font = p.font || DEFAULT_FONT
            const fontSize = parseFontSize(font.fontSize)
            const lineHeight = parseLineHeight(font.lineHeight, fontSize)
            const family = quoteFamily(
                font.fontFamily || "Inter, Helvetica, Arial, sans-serif"
            )
            const shorthand = `${font.fontStyle || "normal"} ${
                font.fontWeight || 800
            } ${fontSize}px ${family}`

            const lines = splitLines(p.text)
            const blockHeight =
                fontSize + lineHeight * Math.max(0, lines.length - 1)

            srcCtx.font = shorthand
            srcCtx.textAlign = "center"
            srcCtx.textBaseline = "middle"
            srcCtx.fillStyle = resolveCss(p.textColor, rootRef.current)

            const top = cssH * 0.5 - blockHeight * 0.5 + fontSize * 0.5
            for (let i = 0; i < lines.length; i += 1)
                srcCtx.fillText(lines[i], cssW * 0.5, top + i * lineHeight)
        }

        function seedParticles() {
            if (!srcCtx) return
            const w = srcCanvas.width
            const h = srcCanvas.height
            const p = propsRef.current
            const density = clamp(Math.round(num(p.density, 220)), 8, 400)

            let pixels: Uint8ClampedArray | null = null
            try {
                pixels = srcCtx.getImageData(0, 0, w, h).data
            } catch {
                // A cross-origin picture taints the canvas. The plate still
                // renders; only the seeding needs the readback, so fall back to
                // a full-rect field rather than dropping the embers entirely.
                pixels = null
            }

            let step = w / density
            let cols = Math.max(1, Math.round(w / step))
            let rows = Math.max(1, Math.round(h / step))
            while (cols * rows > MAX_PARTICLES * 4) {
                step *= 1.25
                cols = Math.max(1, Math.round(w / step))
                rows = Math.max(1, Math.round(h / step))
            }

            const xs: number[] = []
            const ys: number[] = []
            for (let r = 0; r < rows && xs.length < MAX_PARTICLES; r += 1) {
                const py = Math.min(h - 1, Math.floor((r + 0.5) * step))
                for (let c = 0; c < cols && xs.length < MAX_PARTICLES; c += 1) {
                    const px = Math.min(w - 1, Math.floor((c + 0.5) * step))
                    if (pixels) {
                        const alpha = pixels[(py * w + px) * 4 + 3]
                        if (alpha < SEED_ALPHA) continue
                    } else if (imageBox) {
                        // No readback, so the alpha test is gone — but the
                        // picture's box is known, and embers seeded in a
                        // Contain bar or an offset gap would spray from
                        // nothing.
                        const cx = ((px + 0.5) / w) * cssW
                        const cy = ((py + 0.5) / h) * cssH
                        if (
                            cx < imageBox.x0 ||
                            cx >= imageBox.x1 ||
                            cy < imageBox.y0 ||
                            cy >= imageBox.y1
                        )
                            continue
                    }
                    xs.push(((px + 0.5) / w - 0.5) * 2 * aspect)
                    ys.push((0.5 - (py + 0.5) / h) * 2)
                }
            }

            count = xs.length
            initArr = new Float32Array(count * 2)
            currArr = new Float32Array(count * 2)
            velArr = new Float32Array(count * 2)
            offRandArr = new Float32Array(count)
            phaseArr = new Float32Array(count)
            burnArr = new Float32Array(count)

            for (let i = 0; i < count; i += 1) {
                const x = i * 2
                const y = x + 1
                initArr[x] = xs[i]
                initArr[y] = ys[i]
                currArr[x] = xs[i]
                currArr[y] = ys[i]
                // Reference initParticleAttributes, in reference units.
                velArr[x] = Math.random() * 0.5 + 0.5
                velArr[y] = Math.random() * 0.5 + 0.5
                // The raw draw, not the resolved offset: Scatter is read
                // every frame so the dial is live instead of needing a reseed.
                offRandArr[i] = Math.random()
                phaseArr[i] = Math.random() * Math.PI * 2
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, initBuf)
            gl.bufferData(gl.ARRAY_BUFFER, initArr, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, phaseBuf)
            gl.bufferData(gl.ARRAY_BUFFER, phaseArr, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, currBuf)
            gl.bufferData(gl.ARRAY_BUFFER, currArr, gl.DYNAMIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, burnBuf)
            gl.bufferData(gl.ARRAY_BUFFER, burnArr, gl.DYNAMIC_DRAW)
            burnAttrDirty = true
        }

        /** Bilinear, matching the texture's own LINEAR + CLAMP_TO_EDGE, so the
         *  particles and the plate see the same rim to the pixel. */
        function burnAt(x: number, y: number): number {
            const halfW = aspect
            const fx = ((x + halfW) / (2 * halfW)) * burnW - 0.5
            const fy = ((y + 1) * 0.5) * burnH - 0.5
            const c0 = clamp(Math.floor(fx), 0, burnW - 1)
            const r0 = clamp(Math.floor(fy), 0, burnH - 1)
            const c1 = clamp(c0 + 1, 0, burnW - 1)
            const r1 = clamp(r0 + 1, 0, burnH - 1)
            const tx = clamp(fx - c0, 0, 1)
            const ty = clamp(fy - r0, 0, 1)
            const a = burnField[r0 * burnW + c0]
            const b = burnField[r0 * burnW + c1]
            const c = burnField[r1 * burnW + c0]
            const d = burnField[r1 * burnW + c1]
            const top = a + (b - a) * tx
            const bot = c + (d - c) * tx
            return (top + (bot - top) * ty) / 255
        }

        /** Raises the field to the current falloff. Returns whether anything
         *  actually rose — a parked cursor stops uploading after one frame. */
        function stampBurn(
            cx: number,
            cy: number,
            reach: number,
            hover: number
        ): boolean {
            const halfW = aspect
            const rim = reach * RIM_FRAC
            const span = reach - rim
            const cellW = (2 * halfW) / burnW
            const cellH = 2 / burnH
            const c0 = clamp(Math.floor((cx - reach + halfW) / cellW), 0, burnW - 1)
            const c1 = clamp(Math.ceil((cx + reach + halfW) / cellW), 0, burnW - 1)
            const r0 = clamp(Math.floor((cy - reach + 1) / cellH), 0, burnH - 1)
            const r1 = clamp(Math.ceil((cy + reach + 1) / cellH), 0, burnH - 1)
            let changed = false
            for (let r = r0; r <= r1; r += 1) {
                const y = -1 + (r + 0.5) * cellH
                const dy = y - cy
                for (let c = c0; c <= c1; c += 1) {
                    const x = -halfW + (c + 0.5) * cellW
                    const dx = x - cx
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    const t = clamp((dist - rim) / span, 0, 1)
                    const v = (1 - t * t * (3 - 2 * t)) * hover * 255
                    const i = r * burnW + c
                    if (v > burnField[i]) {
                        burnField[i] = v
                        changed = true
                    }
                }
            }
            return changed
        }

        function clearBurn() {
            burnField.fill(0)
            burnAny = false
            burnTexDirty = true
            burnAttrDirty = true
        }

        function uploadBurnTex() {
            gl.bindTexture(gl.TEXTURE_2D, burnTex)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.LUMINANCE,
                burnW,
                burnH,
                0,
                gl.LUMINANCE,
                gl.UNSIGNED_BYTE,
                burnField
            )
        }

        function rebuild() {
            // A new raster or a new aspect invalidates the remembered burn.
            burnW = BURN_W
            burnH = clamp(Math.round(BURN_W / aspect), 32, BURN_W)
            burnField = new Uint8Array(burnW * burnH)
            clearBurn()
            drawSource()
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                srcCanvas
            )
            uploadBurnTex()
            burnTexDirty = false
            seedParticles()
        }

        /**
         * The reference's drift, verbatim in shape: base velocity scaled by the
         * velocity factor, four position-dependent sines per axis added on, the
         * whole thing scaled by the speed factor, and a reset to the rest
         * position the moment travel passes this particle's max offset. Only
         * two things changed — it is dt-corrected, and the wave sines are
         * evaluated in reference space so their spatial frequency survives the
         * move onto a 1-unit plate.
         */
        function stepParticles(
            dtScale: number,
            speedFactor: number,
            scatter: number
        ) {
            for (let i = 0; i < count; i += 1) {
                const x = i * 2
                const y = x + 1

                const posx = currArr[x] * WAVE_SPACE
                const posy = currArr[y] * WAVE_SPACE

                const xwave =
                    Math.sin(posy * 2) * (0.8 + WAVE_AMP) +
                    Math.sin(posy * 5) * (0.2 + WAVE_AMP) +
                    Math.sin(posy * 8) * (0.8 + WAVE_AMP) +
                    Math.sin(posy * 3) * (0.8 + WAVE_AMP)
                const ywave =
                    Math.sin(posx * 2) * (0.6 + WAVE_AMP) +
                    Math.sin(posx * 1) * (0.9 + WAVE_AMP) +
                    Math.sin(posx * 5) * (0.6 + WAVE_AMP) +
                    Math.sin(posx * 7) * (0.6 + WAVE_AMP)

                let vx = velArr[x] * VEL_X + xwave
                let vy = velArr[y] * VEL_Y + ywave
                vx *= speedFactor
                vy *= speedFactor

                currArr[x] += vx * SCENE * dtScale
                currArr[y] += vy * SCENE * dtScale

                const maxOff =
                    (offRandArr[i] * OFFSET_SPAN + OFFSET_MIN) * SCENE * scatter
                const dx = currArr[x] - initArr[x]
                const dy = currArr[y] - initArr[y]
                if (dx * dx + dy * dy > maxOff * maxOff) {
                    currArr[x] = initArr[x]
                    currArr[y] = initArr[y]
                }
            }
        }

        /* ---------------------------------------------------------- render --- */
        const reduceMotion =
            typeof window !== "undefined" &&
            typeof window.matchMedia === "function"
                ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
                : false

        const onCanvas = false

        let raf = 0
        let last = -1
        let time = 0
        let bufW = 0
        let bufH = 0

        const render = (now: number) => {
            raf = requestAnimationFrame(render)

            // The first rAF timestamp can precede the effect, so the first dt
            // is negative unless it is clamped.
            const dt = last < 0 ? 1 / 60 : clamp((now - last) / 1000, 0, 0.05)
            last = now
            time += dt

            const p = propsRef.current
            const host = rootRef.current
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const wantW = Math.max(1, Math.round(cssW * dpr))
            const wantH = Math.max(1, Math.round(cssH * dpr))
            if (wantW !== bufW || wantH !== bufH) {
                bufW = wantW
                bufH = wantH
                canvas.width = bufW
                canvas.height = bufH
                gl.viewport(0, 0, bufW, bufH)
            }

            if (dirtyRef.current) {
                dirtyRef.current = false
                rebuild()
            }

            /* ------------------------------------------------ live values --- */
            const d = p.dissolve || {}
            // Edge is a slice of a noise field spanning about +/-1.12, and the
            // rim annulus sweeps that whole span in ~50px, so the band's WIDTH
            // ON SCREEN is roughly edge/2.4 of the annulus. A 0.8 ceiling put
            // the visible rim at ~4px and the emissive front read as a clean
            // cut, so the dial runs to 2.0.
            const edge =
                (clamp(num(d.edge, DEFAULT_DISSOLVE.edge), 1, 100) / 100) * 2.0
            // Likewise the noise has to be finer than the annulus is wide or
            // the hole's boundary is a circle with a slow wobble, not a
            // dissolve. 35 puts the wavelength at about a third of the rim.
            const freq =
                1 + (clamp(num(d.noise, DEFAULT_DISSOLVE.noise), 1, 100) / 100) * 24
            const reach = (clamp(num(p.reach, 30), 1, 100) / 100) * 1.4
            const persist = p.restore === false
            const speedFactor =
                SPEED_BASE * (clamp(num(p.speed, 50), 0, 100) / 50)
            const size = clamp(
                (clamp(num(p.dotSize, 100), 10, 400) / 100) * DOT_BASE_PX * dpr,
                1,
                maxPointSize
            )
            const [er, eg, eb, ea] = toRgba(p.emberColor, host, [0.3, 0.61, 1, 1])
            const ember: Vec3 = [er, eg, eb]
            // Ember Color's ALPHA is the intensity — no second Glow dial.
            const gain = 0.4 + ea * 1.6

            /* --------------------------------------------------- the focus --- */
            const pointer = pointerRef.current
            pointer.amount +=
                (pointer.target - pointer.amount) * (1 - Math.exp(-HOVER_RATE * dt))

            let cursorX = pointer.x
            let cursorY = pointer.y
            let hover = pointer.amount
            if (onCanvas) {
                // No real pointer reaches the Framer canvas, so the hole walks
                // a slow Lissajous there and the component is not dead. A real
                // pointer takes it over by the same eased amount, so leaving
                // returns to the path instead of snapping onto it.
                //
                // With Restore off the idle cursor PARKS instead: a sweep that
                // never heals eats the whole plate and the canvas goes blank.
                // Parked, the burn settles into one hole whose rim keeps
                // emitting, which is what the mode actually looks like.
                const idleX = persist ? 0 : Math.cos(time * IDLE_RATE_X) * aspect * 0.5
                const idleY = persist ? 0 : Math.sin(time * IDLE_RATE_Y) * 0.45
                cursorX = idleX + (pointer.x - idleX) * pointer.amount
                cursorY = idleY + (pointer.y - idleY) * pointer.amount
                hover = 1
            }

            const scatter =
                clamp(num(d.scatter, DEFAULT_DISSOLVE.scatter), 0, 300) / 100

            /* ----------------------------------------------------- the burn --- */
            if (persist !== prevPersist) {
                // Switching modes starts the memory clean either way, so a
                // designer toggling back and forth is not fighting an old hole.
                prevPersist = persist
                clearBurn()
            }
            if (persist && hover > 0.002 && stampBurn(cursorX, cursorY, reach, hover)) {
                burnAny = true
                burnTexDirty = true
                burnAttrDirty = true
            }
            if (burnTexDirty) {
                uploadBurnTex()
                burnTexDirty = false
            }
            if (burnAttrDirty && count > 0) {
                for (let i = 0; i < count; i += 1)
                    burnArr[i] = burnAt(initArr[i * 2], initArr[i * 2 + 1])
                gl.bindBuffer(gl.ARRAY_BUFFER, burnBuf)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, burnArr)
                burnAttrDirty = false
            }

            // Nothing is inside the band while the plate is whole, so the O(n)
            // drift is pure waste until the pointer opens one — but a remembered
            // burn has a rim that keeps emitting after the pointer has gone.
            if (!reduceMotion && count > 0 && (hover > 0.002 || (persist && burnAny))) {
                stepParticles(dt * 60, speedFactor, scatter)
                gl.bindBuffer(gl.ARRAY_BUFFER, currBuf)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, currArr)
            }

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.enable(gl.BLEND)

            /* ----------------------------------------------------- 1. plate --- */
            gl.useProgram(plate)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
            if (aInit >= 0) gl.disableVertexAttribArray(aInit)
            if (aCurr >= 0) gl.disableVertexAttribArray(aCurr)
            if (aPhase >= 0) gl.disableVertexAttribArray(aPhase)
            if (aBurn >= 0) gl.disableVertexAttribArray(aBurn)
            gl.bindBuffer(gl.ARRAY_BUFFER, quad)
            gl.enableVertexAttribArray(aPlatePos)
            gl.vertexAttribPointer(aPlatePos, 2, gl.FLOAT, false, 0, 0)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.uniform1i(plateU.tex, 0)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, burnTex)
            gl.uniform1i(plateU.burn, 1)
            gl.uniform1f(plateU.persist, persist ? 1 : 0)
            gl.uniform1f(plateU.aspect, aspect)
            gl.uniform3f(plateU.ember, ember[0], ember[1], ember[2])
            gl.uniform1f(plateU.gain, gain)
            gl.uniform1f(plateU.freq, freq)
            gl.uniform1f(plateU.edge, edge)
            gl.uniform2f(plateU.cursor, cursorX, cursorY)
            gl.uniform1f(plateU.reach, reach)
            gl.uniform1f(plateU.hover, hover)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            /* ------------------------------------------------- 2. the embers --- */
            if (count > 0) {
                gl.useProgram(points)
                // Additive premultiplied: overlapping sprites bloom to a hot
                // core, which is what the reference got from UnrealBloom.
                gl.blendFunc(gl.ONE, gl.ONE)
                gl.disableVertexAttribArray(aPlatePos)

                gl.bindBuffer(gl.ARRAY_BUFFER, initBuf)
                gl.enableVertexAttribArray(aInit)
                gl.vertexAttribPointer(aInit, 2, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, currBuf)
                gl.enableVertexAttribArray(aCurr)
                gl.vertexAttribPointer(aCurr, 2, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, phaseBuf)
                gl.enableVertexAttribArray(aPhase)
                gl.vertexAttribPointer(aPhase, 1, gl.FLOAT, false, 0, 0)
                gl.bindBuffer(gl.ARRAY_BUFFER, burnBuf)
                gl.enableVertexAttribArray(aBurn)
                gl.vertexAttribPointer(aBurn, 1, gl.FLOAT, false, 0, 0)

                gl.uniform1f(pointU.persist, persist ? 1 : 0)
                gl.uniform1f(pointU.aspect, aspect)
                gl.uniform1f(pointU.size, size)
                gl.uniform1f(pointU.time, time)
                gl.uniform3f(pointU.ember, ember[0], ember[1], ember[2])
                gl.uniform1f(pointU.gain, gain)
                gl.uniform1f(pointU.freq, freq)
                gl.uniform1f(pointU.edge, edge)
                gl.uniform2f(pointU.cursor, cursorX, cursorY)
                gl.uniform1f(pointU.reach, reach)
                gl.uniform1f(pointU.hover, hover)
                gl.drawArrays(gl.POINTS, 0, count)
            }
        }

        /* --------------------------------------------------------- pointer --- */
        const onMove = (event: PointerEvent) => {
            const host = rootRef.current
            if (!host) return
            const rect = host.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            const u = (event.clientX - rect.left) / rect.width
            const v = (event.clientY - rect.top) / rect.height
            const pointer = pointerRef.current
            pointer.x = (u - 0.5) * 2 * aspect
            pointer.y = (0.5 - v) * 2
            pointer.target = 1
        }
        const onLeave = () => {
            pointerRef.current.target = 0
        }

        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        // A pointer that leaves through an overlay never fires the host's own
        // leave, so the window gets a say too.
        window.addEventListener("blur", onLeave)

        // Custom faces are not there on the first frame; redraw once they are.
        if (typeof document !== "undefined" && document.fonts?.ready) {
            document.fonts.ready.then(() => {
                dirtyRef.current = true
            })
        }

        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            resizeObserver.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("blur", onLeave)
            // Never loseContext(): getContext returns the same context per
            // canvas, so a StrictMode remount would reuse a force-lost one.
        }
    }, [])

    const label =
        type === "image" ? "" : splitLines(text).join(" ") || DEFAULT_TEXT

    return (
        <div
            ref={rootRef}
            role="img"
            aria-label={label}
            style={{
                minWidth: MIN_W,
                minHeight: MIN_H,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                isolation: "isolate",
                background,
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
                }}
            />
        </div>
    )
}
