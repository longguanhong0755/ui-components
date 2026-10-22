"use client"

import * as React from "react"

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
const GROUP_FALLBACKS: Record<string, any> = {  }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

/**
 * TypeWeir — rows of type pouring over a weir. Far back the rows come down a
 * slope, bunch into a crowd of standing letters on the shelf, curl over the
 * lip and fall away from the camera in a long, lit sheet.
 *
 * Refined from the user's BentSheetTiled and matched to a "WATERFALL" poster.
 * Every control of that code is kept (same keys, ranges, units). What changed:
 *
 * - Each row is an upright card whose base rides a path (slope → shelf → crest
 *   → fall) instead of text printed on one bent surface. On the fall the cards
 *   tile into a flat sheet; over the crest they tip back only part-way (Lean),
 *   so on the shelf they still stand up and overlap, and identical rows line
 *   up behind each other into the poster's ridged "teeth".
 * - The rig is the poster's camera, solved from its vanishing points: a 53°
 *   lens, the fall leaning 24° away and the sheet turned 22° about its own
 *   fall (right side nearer). That turn is what slopes the rows down to the
 *   right, widens the right word and sweeps the back of the sheet right.
 * - The path is built in the vertex shader from a static grid, so a frame is
 *   uniforms + one instanced draw — the old version rebuilt ~15k vertices in
 *   JS every frame and ran an 8-tap extrusion search on every pixel.
 * - Extrusion is real: each card is drawn as a stack of layers behind its
 *   face, shaded Side Light → Side Dark.
 * - Pointer: hovering swells the sheet and lifts the letters under the cursor
 *   off it (pressing doubles it); with Drag on, grab the fall to pull it up or
 *   down and flick to throw it — it eases back to Speed on release.
 */

// ---------------------------------------------------------------------------
// Types

interface FontValue {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    fontSize?: number | string
    letterSpacing?: number | string
}

const DEFAULT_ADVANCED = {
    // Framing
    lipHeight: 27,
    sheetWidth: 68,
    offsetX: -7,
    rows: 20,
    words: 2,
    capHeight: 64,
    // Camera and shape
    fov: 53,
    tilt: 24,
    turn: 22,
    taper: 0,
    crestRadius: 12,
    crestTurn: 80,
    shelfLength: 110,
    riseRadius: 60,
    riseTurn: 25,
    crestShift: 40,
    crestTaper: 60,
    lean: 80,
    rowTiltTop: -3,
    rowTiltBottom: 3,
    // Finish
    depth: 6,
    sideTop: "#9C9E9E",
    sideBottom: "#606161",
    crestShade: 80,
    rightDim: 0,
    light: 140,
    lightSize: 160,
    lightX: 7,
    lightY: 17,
    grain: 10,
    vignette: 15,
    // Motion
    rowMs: 500,
    wavePeriod: 6000,
    sway: 12,
    ripple: 8,
    hover: 50,
    bulge: 30,
    bulgeRadius: 12,
    hoverIn: 400,
    hoverOut: 800,
}

type Advanced = typeof DEFAULT_ADVANCED

export interface TypeWeirProps {
    /** The word repeated along every row. */
    text?: string
    background?: string
    font?: FontValue
    /** Front face of the letters; side faces are shaded from it. */
    color?: string
    /** How far the top of the sheet curls back over the crest. 0 is flat. */
    curl?: number
    /** Row size, %. Smaller packs more rows and words onto the sheet. */
    scale?: number
    /** Grab the sheet and pull the fall up or down; flick to throw it. */
    drag?: boolean
    /** 0–100, how fast the rows fall. 50 is one row per Row Time. */
    speed?: number
    /** How big the scene draws in its frame, %. Below 100 shows more of it. */
    frameScale?: number
    advanced?: Partial<Advanced>
    style?: React.CSSProperties
}

// ---------------------------------------------------------------------------
// Constants

const DEG = Math.PI / 180
/** Distance of the lip from the camera; everything else is relative to it. */
const D0 = 4
/** The poster is 4:5. 100% Scale fits that box inside the frame. */
const BOX_ASPECT = 0.8
/** Columns per card: enough for the hover lens and the sway to bend smoothly. */
const NU = 24
/** Layers behind each face when Depth > 0 — enough that sides read solid. */
const EXTRUDE_LAYERS = 6
/** How much the letters under the pointer rise, per unit of swell. */
const EXTRUDE_LIFT = 6
/** Fall continues this many frame-heights below the lip so zooming out never shows its end. */
const FALL_SPAN = 8
/** And the far slope runs this far back past the rise, into the dark. */
const BACK_SPAN = 4
const MAX_CARDS = 900
/** Behind the crest, brightness falls by 1/e every this many frame-heights. */
const BACK_FADE = 2.5
/** Share of Depth the letters keep on the fall, where the poster shows no side walls. */
const FALL_DEPTH = 0.25
/** Diagonal of the poster's light pool (brighter top-right, darker bottom-left). */
const LIGHT_SKEW = 0.17
/** Device-pixel budget for the canvas; adaptive quality scales it down from here. */
const MAX_PIXELS = 2.4e6

// ---------------------------------------------------------------------------
// Helpers

function parseColor(value: unknown, fallback: [number, number, number]): [number, number, number] {
    if (typeof value !== "string") return fallback
    let s = value.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        if (h.length >= 6) {
            const n = parseInt(h.slice(0, 6), 16)
            if (!isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        }
        return fallback
    }
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (m) {
        const p = m[1]
            .split(/[\s,\/]+/)
            .filter(Boolean)
            .map(parseFloat)
        if (p.length >= 3 && p.slice(0, 3).every((n) => isFinite(n))) return [p[0] / 255, p[1] / 255, p[2] / 255]
    }
    return fallback
}

function fontParts(font: FontValue | undefined) {
    const fam =
        font && typeof font.fontFamily === "string" && font.fontFamily.trim() ? font.fontFamily.trim() : "Montserrat"
    const head = /[,"']/.test(fam) ? fam : `"${fam}"`
    const weight = font && font.fontWeight != null ? String(font.fontWeight) : "700"
    const style = font && font.fontStyle === "italic" ? "italic" : "normal"
    return {
        fam,
        families: `${head}, "Montserrat", "Arial Black", "Helvetica Neue", Arial, sans-serif`,
        weight,
        style,
    }
}

function letterSpacingEm(font: FontValue | undefined): number {
    const ls = font ? font.letterSpacing : undefined
    const size = (font && parseFloat(String(font.fontSize))) || 32
    if (typeof ls === "number") return ls / size
    if (typeof ls === "string") {
        const n = parseFloat(ls)
        if (!isFinite(n)) return 0
        const t = ls.trim()
        if (t.endsWith("em")) return n
        if (t.endsWith("%")) return n / 100
        return n / size
    }
    return -0.01
}

/** One word per atlas width, one row per atlas height; REPEAT tiles it across a card. */
function buildAtlas(text: string, font: FontValue | undefined, capFrac: number): HTMLCanvasElement {
    const word = text && text.trim() ? text : "WATERFALL"
    const { families, weight, style } = fontParts(font)
    const em = letterSpacingEm(font)
    const c = document.createElement("canvas")
    const ctx = c.getContext("2d") as CanvasRenderingContext2D & { letterSpacing?: string }
    const setFont = (size: number) => {
        ctx.font = `${style} ${weight} ${size}px ${families}`
        if ("letterSpacing" in ctx) ctx.letterSpacing = `${em * size}px`
    }
    const F0 = 200
    setFont(F0)
    const m = ctx.measureText(word)
    const w0 = Math.max(1, m.width)
    const asc = m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent : F0 * 0.72
    const W = 2048
    const k = W / w0
    const H = Math.max(16, Math.round((asc / Math.max(0.3, capFrac)) * k))
    c.width = W
    c.height = H
    setFont(F0 * k)
    ctx.fillStyle = "#ffffff"
    ctx.textBaseline = "alphabetic"
    ctx.textAlign = "left"
    const base = H / 2 + (asc * k) / 2
    for (const ox of [-W, 0, W]) ctx.fillText(word, ox, base)
    return c
}

function ensureFontLink(fam: string) {
    if (!/montserrat/i.test(fam)) return
    if (document.getElementById("okit-montserrat")) return
    const link = document.createElement("link")
    link.id = "okit-montserrat"
    link.rel = "stylesheet"
    link.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&display=swap"
    document.head.appendChild(link)
}

// ---------------------------------------------------------------------------
// Shaders

const GLSL_COMMON = `
float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
float vig(vec2 res, float amount) {
    vec2 q = gl_FragCoord.xy / res - 0.5;
    float r = length(q) * 1.41421356;
    return 1.0 - amount * r * r;
}
`

const BG_VS = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`

const BG_FS = `#version 300 es
precision highp float;
uniform vec3 uBg;
uniform vec2 uRes;
uniform float uGrain;
uniform float uVignette;
uniform float uTime;
out vec4 outColor;
${GLSL_COMMON}
void main() {
    float n = (hash(gl_FragCoord.xy + floor(uTime * 24.0) * 37.0) - 0.5) * uGrain;
    vec3 col = uBg * vig(uRes, uVignette) + n;
    outColor = vec4(max(col, 0.0), 1.0);
}
`

// One instance per (card, layer). A card's base rides the path at uS0 + card * uPitch;
// the card itself always stands along uUp, so it never turns as it travels.
const CARD_VS = `#version 300 es
precision highp float;
in vec2 aUV;
uniform float uS0;
uniform float uPitch;
uniform int uLayers;
uniform vec3 uP0;
uniform vec3 uD1;
uniform vec3 uUp;
uniform vec3 uN;
uniform float uWidth;
uniform vec3 uCrest;   // radius, turn, shelf length
uniform vec2 uRise;    // radius, turn
uniform float uLvis;
uniform vec2 uEnds;    // first and last base position on the path
uniform float uH0;
uniform float uTaper;
uniform float uCrestTaper;
uniform float uCrestDrift;
uniform float uSway;
uniform float uRipple;
uniform vec2 uRowTilt; // tan at the lip, tan at the bottom edge
uniform float uDepth;
uniform float uLean;
uniform float uTanH;
uniform vec2 uFit;     // poster-box NDC -> clip
uniform vec3 uPtr;     // pointer in isotropic box units (x, y), lens amplitude
uniform float uInv2s;
uniform float uGlow;
uniform float uCrestShade;
uniform float uRightDim;
uniform vec4 uLight;   // gain, x, y, size (box NDC)
out vec2 vUV;
out float vLum;
flat out float vLayer;

const float PI = 3.14159265;
const float ASPECT = ${BOX_ASPECT.toFixed(3)};

// (up, back, tangent angle) of the path at arc length s. s >= 0 is the fall
// below the lip; s < 0 runs back over the crest, along the shelf, round the
// rise and up the far slope. Angle 0 is straight up, 90° is straight back.
vec3 profile(float s) {
    if (s >= 0.0) return vec3(-s, 0.0, 0.0);
    float l = -s;
    float R1 = uCrest.x;
    float T1 = uCrest.y;
    float L1 = R1 * T1;
    if (l <= L1) {
        float th = l / R1;
        return vec3(R1 * sin(th), R1 * (1.0 - cos(th)), th);
    }
    vec2 p = vec2(R1 * sin(T1), R1 * (1.0 - cos(T1)));
    l -= L1;
    if (l <= uCrest.z) return vec3(p + vec2(cos(T1), sin(T1)) * l, T1);
    p += vec2(cos(T1), sin(T1)) * uCrest.z;
    l -= uCrest.z;
    float R2 = uRise.x;
    float T2 = uRise.y;
    if (l <= R2 * T2) {
        float ph = l / R2;
        return vec3(p + R2 * vec2(sin(T1) - sin(T1 - ph), cos(T1 - ph) - cos(T1)), T1 - ph);
    }
    p += R2 * vec2(sin(T1) - sin(T1 - T2), cos(T1 - T2) - cos(T1));
    l -= R2 * T2;
    float a2 = T1 - T2;
    return vec3(p + vec2(cos(a2), sin(a2)) * l, a2);
}

vec2 toBox(vec3 P, out float w) {
    w = max(0.02, -P.z);
    return vec2(P.x / (w * uTanH * ASPECT), P.y / (w * uTanH));
}

void main() {
    int per = uLayers + 1;
    int card = gl_InstanceID / per;
    int layer = gl_InstanceID - card * per;
    float back = uLayers > 0 ? 1.0 - float(layer) / float(uLayers) : 0.0;

    float sb = uS0 + float(card) * uPitch;
    vec3 pr = profile(sb);
    float u = aUV.x;

    float m;
    float shift;
    float tl;
    if (sb >= 0.0) {
        float f = sb / uLvis;
        m = max(0.3, 1.0 - uTaper * f);
        shift = uRipple * sin(sb / uH0 * PI * 1.6) * min(1.0, sb / (0.2 * uH0));
        tl = mix(uRowTilt.x, uRowTilt.y, min(1.0, f));
    } else {
        float l = -sb;
        m = max(0.2, 1.0 - uCrestTaper * min(1.0, l / (0.6 * uH0)));
        shift = uCrestDrift * smoothstep(0.0, 0.6 * uH0, l) + uSway * min(1.0, l / (0.15 * uH0));
        tl = uRowTilt.x;
    }
    float xr = (u - 0.5) * uWidth * m;
    // Over the crest a card tips back by Lean × the path's own turn, so the
    // rows foreshorten there yet still stand up out of the shelf.
    float lb = max(0.0, -sb);
    float arc = max(uCrest.x * uCrest.y, 1e-3);
    float beta = uLean * pr.z;
    vec3 up = uUp * cos(beta) - uN * sin(beta);
    vec3 nrm = uN * cos(beta) + uUp * sin(beta);
    vec3 face = uP0 + uUp * pr.x - uN * pr.y + up * (uPitch * (1.0 - aUV.y)) - uUp * (xr * tl) + uD1 * (shift + xr);

    float w;
    vec2 nd = toBox(face, w);
    vec2 q = vec2(nd.x * ASPECT, nd.y);
    vec2 dq = q - uPtr.xy;
    float g = exp(-dot(dq, dq) * uInv2s);

    if (back > 0.0) {
        // The fall reads flat in the poster; the letters thicken as they go over the crest.
        float dep = uDepth * mix(${FALL_DEPTH.toFixed(2)}, 1.0, smoothstep(0.0, arc, lb));
        nd = toBox(face - nrm * (dep * back * (1.0 + ${EXTRUDE_LIFT.toFixed(1)} * uPtr.z * g)), w);
        q = vec2(nd.x * ASPECT, nd.y);
        dq = q - uPtr.xy;
    }
    q = uPtr.xy + dq * (1.0 + uPtr.z * g);
    vec2 clip = vec2(q.x / ASPECT, q.y) * uFit;

    // Rows dim to Crest Shade as they go over the crest, then keep fading the
    // further back they stand, so the far slope sinks into the dark.
    float lum = mix(1.0, uCrestShade, smoothstep(0.0, arc, lb)) * exp(-max(0.0, lb - arc) / (${BACK_FADE.toFixed(2)} * uH0));
    lum *= 1.0 - uRightDim * smoothstep(0.62, 1.0, u);
    vec2 dl = toBox(face, w) - uLight.yz;
    lum *= uLight.x * exp(-(dot(dl, dl) / (uLight.w * uLight.w) + ${LIGHT_SKEW.toFixed(2)} * dl.x * dl.y));
    lum *= 1.0 + 0.25 * uGlow * g;
    // Cards enter and leave the path over one row, so neither end ever pops.
    lum *= clamp((sb - uEnds.x) / uPitch, 0.0, 1.0) * clamp((uEnds.y - sb) / uPitch, 0.0, 1.0);

    vUV = aUV;
    vLum = lum;
    vLayer = back;
    gl_Position = vec4(clip * w, 0.0, w);
}
`

const CARD_FS = `#version 300 es
precision highp float;
in vec2 vUV;
in float vLum;
flat in float vLayer;
uniform sampler2D uTex;
uniform float uWords;
uniform vec3 uColor;
uniform vec3 uSideA;
uniform vec3 uSideB;
uniform vec2 uRes;
uniform float uGrain;
uniform float uVignette;
uniform float uTime;
out vec4 outColor;
${GLSL_COMMON}
void main() {
    float a = texture(uTex, vec2(vUV.x * uWords, vUV.y)).a;
    float fw = max(fwidth(vUV.x), 1e-5);
    a *= clamp(min(vUV.x, 1.0 - vUV.x) / fw, 0.0, 1.0);
    if (a < 0.004) discard;
    vec3 col = vLayer > 0.0 ? mix(uSideA, uSideB, vLayer) * min(uColor / 0.875, vec3(1.15)) : uColor;
    col *= vLum;
    float n = (hash(gl_FragCoord.xy + floor(uTime * 24.0) * 37.0) - 0.5) * uGrain;
    col = col * vig(uRes, uVignette) + n;
    outColor = vec4(max(col, 0.0) * a, a);
}
`

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)
    if (!sh) throw new Error("shader alloc failed")
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh)
        gl.deleteShader(sh)
        throw new Error("shader compile failed: " + log)
    }
    return sh
}

function createProgram(gl: WebGL2RenderingContext, vs: string, fs: string, attribs: string[] = []) {
    const p = gl.createProgram()
    if (!p) throw new Error("program alloc failed")
    const a = compile(gl, gl.VERTEX_SHADER, vs)
    const b = compile(gl, gl.FRAGMENT_SHADER, fs)
    gl.attachShader(p, a)
    gl.attachShader(p, b)
    attribs.forEach((name, i) => gl.bindAttribLocation(p, i, name))
    gl.linkProgram(p)
    gl.deleteShader(a)
    gl.deleteShader(b)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("program link failed: " + gl.getProgramInfoLog(p))
    return p
}

function uniforms(gl: WebGL2RenderingContext, p: WebGLProgram, names: string[]) {
    const out: Record<string, WebGLUniformLocation | null> = {}
    for (const n of names) out[n] = gl.getUniformLocation(p, n)
    return out
}

// ---------------------------------------------------------------------------
// Component

interface Live {
    text: string
    font: FontValue | undefined
    color: [number, number, number]
    background: [number, number, number]
    sideA: [number, number, number]
    sideB: [number, number, number]
    speed: number
    scale: number
    curl: number
    drag: boolean
    frameScale: number
    adv: Advanced
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function TypeWeir(props: TypeWeirProps) {
    props = withMovedControls(props)
    const {
    text = "TEXT COMPONENT",
    background = "#000000",
    font = {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Montserrat","fontWeight":700,"lineHeight":"1.5em","letterSpacing":"-0.01em"},
    color = "#00FFE8",
    curl = 78,
    scale = 137,
    drag = true,
    speed = 50,
    frameScale = 100,
    advanced = {"fov":53,"lean":80,"rows":6,"sway":12,"tilt":24,"turn":22,"bulge":30,"depth":6,"grain":10,"light":140,"rowMs":500,"taper":0,"words":2,"lightX":7,"lightY":17,"ripple":8,"hoverIn":400,"offsetX":-12,"sideTop":"#9C9E9E","hoverOut":800,"rightDim":0,"riseTurn":25,"vignette":15,"capHeight":72,"crestTurn":80,"lightSize":160,"lipHeight":50,"crestShade":80,"crestShift":40,"crestTaper":60,"riseRadius":60,"rowTiltTop":-3,"sheetWidth":94,"sideBottom":"#606161","wavePeriod":6000,"bulgeRadius":12,"crestRadius":12,"shelfLength":110,"rowTiltBottom":3},
    style,
} = props
    const rootRef = React.useRef<HTMLDivElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const adv = { ...DEFAULT_ADVANCED, ...advanced }
    const live: Live = {
        text,
        font,
        color: parseColor(color, [0.875, 0.878, 0.882]),
        background: parseColor(background, [0, 0, 0]),
        sideA: parseColor(adv.sideTop, [0.612, 0.62, 0.62]),
        sideB: parseColor(adv.sideBottom, [0.376, 0.38, 0.38]),
        speed,
        scale,
        curl,
        drag,
        frameScale,
        adv,
    }
    const liveRef = React.useRef(live)
    liveRef.current = live
    // Any prop change redraws, even while the sheet is at rest.
    const wakeRef = React.useRef<() => void>(() => {})
    React.useEffect(() => wakeRef.current())

    React.useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            alpha: false,
            premultipliedAlpha: false,
            powerPreference: "low-power",
        })
        if (!gl) return

        const bgProg = createProgram(gl, BG_VS, BG_FS)
        const bgU = uniforms(gl, bgProg, ["uBg", "uRes", "uGrain", "uVignette", "uTime"])
        const cardProg = createProgram(gl, CARD_VS, CARD_FS, ["aUV"])
        const U = uniforms(gl, cardProg, [
            "uS0", "uPitch", "uLayers", "uP0", "uD1", "uUp", "uN", "uWidth", "uCrest", "uRise", "uLvis", "uEnds", "uH0",
            "uTaper", "uCrestTaper", "uCrestDrift", "uSway", "uRipple", "uRowTilt", "uDepth", "uLean", "uTanH", "uFit",
            "uPtr", "uInv2s", "uGlow", "uCrestShade", "uRightDim", "uLight",
            "uTex", "uWords", "uColor", "uSideA", "uSideB", "uRes", "uGrain", "uVignette", "uTime",
        ])

        const bgVao = gl.createVertexArray()

        // One card: a strip NU columns wide, top (v = 0) and base (v = 1).
        const strip = new Float32Array((NU + 1) * 4)
        for (let i = 0; i <= NU; i++) {
            strip.set([i / NU, 0, i / NU, 1], i * 4)
        }
        const cardVao = gl.createVertexArray()
        gl.bindVertexArray(cardVao)
        const vbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.bufferData(gl.ARRAY_BUFFER, strip, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0)
        gl.bindVertexArray(null)

        const tex = gl.createTexture()
        const aniso = gl.getExtension("EXT_texture_filter_anisotropic")
        let atlasKey = ""
        let loadKey = ""
        let fontGen = 0
        const fonts = document.fonts
        const onFonts = () => {
            fontGen++
            wake()
        }
        if (fonts && fonts.addEventListener) fonts.addEventListener("loadingdone", onFonts)

        const uploadAtlas = (c: HTMLCanvasElement) => {
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            if (aniso) {
                const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1
                gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max))
            }
            gl.generateMipmap(gl.TEXTURE_2D)
        }

        // Size: layout size from ResizeObserver only; device pixels capped, then
        // scaled by `quality`, which drops when frames run long.
        let rw = 1
        let rh = 1
        let cw = 1
        let ch = 1
        let quality = 1
        const applySize = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            const budget = Math.min(1, Math.sqrt(MAX_PIXELS / Math.max(1, rw * rh * dpr * dpr)))
            const k = dpr * budget * quality
            cw = Math.max(1, Math.round(rw * k))
            ch = Math.max(1, Math.round(rh * k))
            if (canvas.width !== cw) canvas.width = cw
            if (canvas.height !== ch) canvas.height = ch
        }
        const ro = new ResizeObserver((entries) => {
            const r = entries[0].contentRect
            rw = Math.max(1, r.width)
            rh = Math.max(1, r.height)
            applySize()
            wake()
        })
        ro.observe(root)

        let visible = true
        const io = new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting
            if (visible) wake()
        })
        io.observe(root)

        // Pointer: handlers only record; the rect is read once per frame, and only
        // when the pointer or the page moved. State is a 0–1 share of the frame.
        const ptr = { cx: 0, cy: 0, u: 0.5, v: 0.5, over: false, down: false, moved: false }
        let shown = 1 // displayed px per layout px
        let dragging = false
        let release = false
        let dragLastY = 0
        let dragPx = 0
        const onMove = (e: PointerEvent) => {
            ptr.cx = e.clientX
            ptr.cy = e.clientY
            ptr.over = true
            ptr.moved = true
            if (dragging) {
                dragPx += e.clientY - dragLastY
                dragLastY = e.clientY
            }
            wake()
        }
        const onLeave = () => {
            if (!dragging) ptr.over = false
            wake()
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            ptr.down = true
            if (liveRef.current.drag) {
                dragging = true
                dragLastY = e.clientY
                try {
                    root.setPointerCapture(e.pointerId)
                } catch {}
            }
        }
        const onUp = (e: PointerEvent) => {
            ptr.down = false
            if (dragging) release = true
            dragging = false
            if (e.pointerType !== "mouse") ptr.over = false
            wake()
        }
        const onScroll = () => {
            ptr.moved = true
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        root.addEventListener("pointerup", onUp)
        root.addEventListener("pointercancel", onUp)
        window.addEventListener("scroll", onScroll, { passive: true, capture: true })

        const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        let raf = 0
        let last = -1
        let lastDraw = -1
        let dirty = true
        let flow = 0
        let waveT = 0
        let clock = 0
        let hv = 0
        let pv = 0
        let extra = 0 // rows/s left over from a flick, decays back to the set speed
        let dragVel = 0
        let slowMs = 0
        let fastMs = 0

        function wake() {
            dirty = true
        }
        wakeRef.current = wake

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            if (last < 0) last = now
            // Pace to ~60 fps on high-refresh screens.
            if (lastDraw >= 0 && now - lastDraw < 15) return
            const dt = Math.min(1 / 20, (now - last) / 1000)
            last = now

            const L = liveRef.current
            const a = L.adv
            const reduced = !!(mq && mq.matches)
            const spd = Math.max(0, L.speed || 0) / 50
            const rowsPerSec = reduced ? 0 : (spd * 1000) / Math.max(50, a.rowMs)

            // Pointer → share of the frame, measured against the box as displayed.
            if (ptr.moved) {
                const r = root.getBoundingClientRect()
                if (r.width > 0 && r.height > 0) {
                    ptr.u = (ptr.cx - r.left) / r.width
                    ptr.v = (ptr.cy - r.top) / r.height
                    shown = r.height / rh
                }
                ptr.moved = false
            }

            // Frame → poster box: one path for the cards, the pointer and the drag.
            const boxH = Math.min(rh, rw / BOX_ASPECT) * (Math.max(10, L.frameScale || 100) / 100)
            const boxW = boxH * BOX_ASPECT
            const fitX = boxW / rw
            const fitY = boxH / rh

            const scl = Math.max(10, L.scale || 100) / 100
            const tanH = Math.tan((Math.max(10, Math.min(90, a.fov)) * DEG) / 2)
            const H0 = 2 * tanH * D0
            const phi = a.tilt * DEG
            const sinP = Math.sin(phi)
            const cosP = Math.cos(phi)
            const Y0 = (1 - (2 * a.lipHeight) / 100) * tanH * D0
            const Lvis = (Y0 + tanH * D0) / Math.max(0.2, cosP - tanH * sinP)
            const pitch = (Lvis / Math.max(4, a.rows)) * scl
            const rowPx = (boxH * pitch) / H0 // layout px per row at the lip

            // Drag: the sheet follows the finger; on release it keeps the flick and
            // eases back to the set speed.
            let moving = false
            if (dragging) {
                const rows = dragPx / Math.max(1e-3, shown) / Math.max(1, rowPx)
                dragPx = 0
                flow += rows
                dragVel += (rows / Math.max(dt, 1e-3) - dragVel) * (1 - Math.exp(-dt / 0.05))
                moving = true
            } else {
                if (release) {
                    extra = Math.max(-60, Math.min(60, dragVel - rowsPerSec))
                    dragVel = 0
                    release = false
                }
                flow += (rowsPerSec + extra) * dt
                extra *= Math.exp(-dt / 0.8)
                if (Math.abs(extra) < 0.01) extra = 0
                moving = rowsPerSec > 0 || extra !== 0
            }
            flow -= Math.floor(flow)
            if (!reduced) {
                waveT += dt * spd
                if (spd > 0) clock += dt
            }

            const hoverK = Math.max(0, a.hover) / 50
            const tIn = Math.max(1, a.hoverIn) / 3000
            const tOut = Math.max(1, a.hoverOut) / 3000
            const ht = ptr.over ? 1 : 0
            hv += (ht - hv) * (1 - Math.exp(-dt / (ht > hv ? tIn : tOut)))
            const pt = ptr.down && ptr.over ? 1 : 0
            pv += (pt - pv) * (1 - Math.exp(-dt / (pt > pv ? tIn : tOut)))
            const easing = Math.abs(ht - hv) > 1e-3 || Math.abs(pt - pv) > 1e-3
            if (!easing) {
                hv = ht
                pv = pt
            }

            // Settled and nothing changed: draw nothing at all.
            if (!visible || (!moving && !easing && !dirty)) return
            dirty = false

            // Adaptive resolution from the interval between consecutive draws.
            if (lastDraw >= 0 && (moving || easing)) {
                const iv = now - lastDraw
                if (iv > 24) {
                    slowMs += iv
                    fastMs = 0
                } else if (iv < 18) {
                    fastMs += iv
                    slowMs = 0
                }
                if (slowMs > 600 && quality > 0.6) {
                    quality = Math.max(0.6, quality * 0.85)
                    slowMs = 0
                    applySize()
                } else if (fastMs > 4000 && quality < 1) {
                    quality = Math.min(1, quality / 0.85)
                    fastMs = 0
                    applySize()
                }
            }
            lastDraw = now

            // Text atlas — rebuilt only when what it shows changes.
            const fp = fontParts(L.font)
            const base = `${fp.families}|${fp.weight}|${fp.style}|${letterSpacingEm(L.font)}`
            if (base !== loadKey) {
                loadKey = base
                ensureFontLink(fp.fam)
                if (fonts && fonts.load) fonts.load(`${fp.style} ${fp.weight} 100px ${fp.families}`).then(onFonts, () => {})
            }
            const key = `${L.text}|${base}|${a.capHeight}|${fontGen}`
            if (key !== atlasKey) {
                atlasKey = key
                uploadAtlas(buildAtlas(String(L.text ?? ""), L.font, a.capHeight / 100))
            }

            // Rig: the lip sits at lipHeight in the poster box, D0 from the camera.
            const psi = a.turn * DEG
            const sinY = Math.sin(psi)
            const cosY = Math.cos(psi)
            const curlK = Math.max(0, L.curl || 0) / 60
            const R1 = Math.max(1e-4, H0 * (a.crestRadius / 100) * curlK)
            const T1 = Math.min(170, a.crestTurn * curlK) * DEG
            const T2 = Math.min(T1, a.riseTurn * curlK * DEG)
            const R2 = Math.max(1e-4, H0 * (a.riseRadius / 100))
            const Ls = H0 * (a.shelfLength / 100)
            const sinW = Math.sin((2 * Math.PI * waveT * 1000) / Math.max(100, a.wavePeriod))
            const backLen = R1 * T1 + Ls + R2 * T2 + BACK_SPAN * H0
            const sFar = -backLen
            const sNear = Lvis + FALL_SPAN * H0
            const j0 = Math.floor(sFar / pitch)
            const cards = Math.min(MAX_CARDS, Math.ceil((sNear - j0 * pitch) / pitch) + 1)
            const layers = a.depth > 0 ? EXTRUDE_LAYERS : 0

            // Pointer in isotropic box units.
            const mx = ((ptr.u * 2 - 1) / fitX) * BOX_ASPECT
            const my = (1 - ptr.v * 2) / fitY
            const amp = (a.bulge / 100) * hoverK * hv * (1 + pv)
            const sig = Math.max(0.01, (a.bulgeRadius / 100) * 2)

            const grain = (Math.max(0, a.grain) / 100) * 0.12
            const vign = (Math.max(0, a.vignette) / 100) * 0.3

            gl.viewport(0, 0, cw, ch)
            gl.disable(gl.BLEND)
            gl.useProgram(bgProg)
            gl.bindVertexArray(bgVao)
            gl.uniform3fv(bgU.uBg, L.background)
            gl.uniform2f(bgU.uRes, cw, ch)
            gl.uniform1f(bgU.uGrain, grain)
            gl.uniform1f(bgU.uVignette, vign)
            gl.uniform1f(bgU.uTime, clock)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
            gl.useProgram(cardProg)
            gl.bindVertexArray(cardVao)
            gl.uniform1f(U.uS0, (j0 + flow) * pitch)
            gl.uniform1f(U.uPitch, pitch)
            gl.uniform1i(U.uLayers, layers)
            gl.uniform3f(U.uP0, (a.offsetX / 100) * H0, Y0, -D0)
            // Fall leans away by tilt; the sheet is turned by `turn` about its own fall.
            gl.uniform3f(U.uD1, cosY, -sinY * sinP, sinY * cosP)
            gl.uniform3f(U.uUp, 0, cosP, sinP)
            gl.uniform3f(U.uN, -sinY, -cosY * sinP, cosY * cosP)
            gl.uniform1f(U.uWidth, (a.sheetWidth / 100) * H0)
            gl.uniform3f(U.uCrest, R1, T1, Ls)
            gl.uniform2f(U.uRise, R2, T2)
            gl.uniform1f(U.uLvis, Lvis)
            gl.uniform2f(U.uEnds, (j0 + 1) * pitch, (j0 + cards - 2) * pitch)
            gl.uniform1f(U.uH0, H0)
            gl.uniform1f(U.uTaper, a.taper / 100)
            gl.uniform1f(U.uCrestTaper, a.crestTaper / 100)
            gl.uniform1f(U.uCrestDrift, (a.crestShift / 100) * 0.4 * H0)
            gl.uniform1f(U.uSway, (a.sway / 1000) * H0 * sinW)
            gl.uniform1f(U.uRipple, (a.ripple / 1000) * H0 * sinW)
            gl.uniform2f(U.uRowTilt, Math.tan(a.rowTiltTop * DEG), Math.tan(a.rowTiltBottom * DEG))
            gl.uniform1f(U.uLean, Math.max(0, Math.min(1, a.lean / 100)))
            gl.uniform1f(U.uDepth, (Math.max(0, a.depth) / 1000) * H0)
            gl.uniform1f(U.uTanH, tanH)
            gl.uniform2f(U.uFit, fitX, fitY)
            gl.uniform3f(U.uPtr, mx, my, amp)
            gl.uniform1f(U.uInv2s, 1 / (2 * sig * sig))
            gl.uniform1f(U.uGlow, hoverK * hv)
            gl.uniform1f(U.uCrestShade, Math.max(0, Math.min(1, a.crestShade / 100)))
            gl.uniform1f(U.uRightDim, Math.max(0, Math.min(1, a.rightDim / 100)))
            gl.uniform4f(U.uLight, a.light / 100, a.lightX / 100, a.lightY / 100, Math.max(0.05, a.lightSize / 100))
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.uniform1i(U.uTex, 0)
            gl.uniform1f(U.uWords, Math.max(1, Math.round(Math.max(1, a.words) / scl)))
            gl.uniform3fv(U.uColor, L.color)
            gl.uniform3fv(U.uSideA, L.sideA)
            gl.uniform3fv(U.uSideB, L.sideB)
            gl.uniform2f(U.uRes, cw, ch)
            gl.uniform1f(U.uGrain, grain)
            gl.uniform1f(U.uVignette, vign)
            gl.uniform1f(U.uTime, clock)
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (NU + 1) * 2, cards * (layers + 1))
            gl.bindVertexArray(null)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            wakeRef.current = () => {}
            ro.disconnect()
            io.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            root.removeEventListener("pointerup", onUp)
            root.removeEventListener("pointercancel", onUp)
            window.removeEventListener("scroll", onScroll, { capture: true })
            if (fonts && fonts.removeEventListener) fonts.removeEventListener("loadingdone", onFonts)
            gl.deleteTexture(tex)
            gl.deleteBuffer(vbo)
            gl.deleteVertexArray(cardVao)
            gl.deleteVertexArray(bgVao)
            gl.deleteProgram(cardProg)
            gl.deleteProgram(bgProg)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                overflow: "hidden",
                width: "100%",
                height: "100%",
                background,
                touchAction: drag ? "none" : "auto",
                cursor: drag ? "grab" : undefined,
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
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}

// Control order arranged in the builder.
