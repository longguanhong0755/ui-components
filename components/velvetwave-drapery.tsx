"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

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

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"wavelength":"advanced","pinch":"advanced","hover":"advanced"}}
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
 * SableFurl — a black cloth rolled into a fat, travelling tube of folds,
 * skinned with rows of repeating type.
 *
 * Refined from the user's `SingleBlackSheet` code component and matched to the
 * M1 CONTACT FESTIVAL poster frame: one phrase per row, wrapped round the
 * cloth from edge to edge; rows stacked along a meandering spine that swells
 * into round lobes and narrows into necks, and glides along without the type
 * moving on the cloth.
 */

/** Tuning values behind the look. Every default is the constant the component would otherwise hardcode. */
const DEFAULT_ADVANCED = {
    wavelength: 280,
    pinch: 100,
    cross: 0,
    crossFreq: 170,
    wrap: 100,
    wrapTurn: -15,
    phase: 300,
    waveMs: 8000,
    scrollMs: 0,
    sway: 2,
    yaw: 28,
    tilt: 30,
    roll: 48,
    fov: 35,
    distance: 25,
    sheetLength: 1800,
    sheetWidth: 135,
    offsetX: -5,
    offsetY: 5,
    rowsPerWave: 28,
    leading: 90,
    rowShift: 0,
    ambient: 50,
    falloff: 170,
    gain: 115,
    backShade: 80,
    depthFade: 10,
    lightX: -18,
    lightY: 16,
    hoverTilt: 6,
    hoverLift: 15,
    pressBoost: 80,
    easeMs: 400,
    grain: 0,
    vignette: 0,
    hover: 50,
}
type Advanced = typeof DEFAULT_ADVANCED

const DEFAULT_TEXT = "M1 CONTACT FESTIVAL "
const DEFAULT_FONT: FontValue = { variant: "Medium", letterSpacing: "-0.01em" }

const ROWS_IN_TEX = 4
// Fine along the fold (the necks turn tightly), coarse across it.
const SEG_S = 1000
const SEG_R = 48
const TAU = Math.PI * 2
const DEG = Math.PI / 180
/** Heading swing at Amplitude 100, and the crest/neck asymmetry at Pinch 100. */
const MAX_TURN = 110 * DEG
const MAX_PINCH = 0.6
/** Samples of one fold period in the profile table. */
const PROF_N = 256

/**
 * The cloth's cross-section is a sine-generated curve: its heading turns as
 * θ = turn · sin(u + pinch · sin u) along the arc. Above 90° of turn it rolls
 * over into the poster's round lobes and narrow necks, and because it is
 * built from heading rather than height it never pinches to a cusp.
 *
 * Fills `out` with one period of the curve's offset from its mean line —
 * (x − drift·s, z) at PROF_N even steps of u — and returns drift, the
 * distance the curve advances per unit of arc. Subtracting the mean makes the
 * table periodic, so moving the phase glides the shape rigidly along the
 * sheet instead of bobbing it.
 */
function buildProfile(turn: number, pinch: number, k: number, out: Float32Array): number {
    const SUB = 4
    const n = PROF_N * SUB
    const du = TAU / n
    const cx = new Float64Array(n + 1)
    const cz = new Float64Array(n + 1)
    const heading = (uu: number) => turn * Math.sin(uu + pinch * Math.sin(uu))
    let px = Math.cos(heading(0)),
        pz = Math.sin(heading(0))
    for (let i = 1; i <= n; i++) {
        const h = heading(i * du)
        const qx = Math.cos(h),
            qz = Math.sin(h)
        cx[i] = cx[i - 1] + ((px + qx) / 2) * du
        cz[i] = cz[i - 1] + ((pz + qz) / 2) * du
        px = qx
        pz = qz
    }
    const drift = cx[n] / TAU
    const zMean = cz.reduce((acc, v, i) => (i < n ? acc + v : acc), 0) / n
    let xMean = 0
    for (let i = 0; i < n; i++) xMean += cx[i] - drift * i * du
    xMean /= n
    for (let j = 0; j < PROF_N; j++) {
        const i = j * SUB
        out[j * 2] = (cx[i] - drift * i * du - xMean) / k
        out[j * 2 + 1] = (cz[i] - zMean) / k
    }
    return drift
}

const VERT = `#version 300 es
precision highp float;
in vec2 aUV;
uniform mat4 uProj;
uniform mat3 uRot;
uniform float uScale;
uniform float uDist;
uniform vec2 uOffset;
uniform float uLen;
uniform float uWid;
uniform float uK;
uniform float uTurn;
uniform float uPinch;
uniform float uDrift;
uniform vec4 uProf[${PROF_N / 2}];
uniform float uPhase;
uniform float uB;
uniform float uK2;
uniform float uPhase2;
uniform float uCurl;
uniform float uWrapTurn;
out vec2 vST;
out vec3 vN;
out vec3 vPos;
out float vDepth;
vec2 prof(int i) {
    vec4 v = uProf[i / 2];
    return (i % 2 == 0) ? v.xy : v.zw;
}
vec3 surf(float s, float r) {
    float u = uK * s + uPhase;
    float f = fract(u / ${TAU}) * ${PROF_N}.0;
    int i0 = min(int(f), ${PROF_N - 1});
    vec2 g = mix(prof(i0), prof((i0 + 1) % ${PROF_N}), f - float(i0));
    float th = uTurn * sin(u + uPinch * sin(u));
    vec3 N = vec3(-sin(th), 0.0, cos(th));
    vec3 A = vec3(uDrift * s + g.x, 0.0, g.y);
    // Across its width the cloth rolls, so each row of type is an arc of
    // curvature uCurl through the spine, leaving it uWrapTurn round from flat.
    // Measured from the spine, so Wrap 0 is a flat sheet tilted by the turn.
    float kap = abs(uCurl) < 1e-4 ? 1e-4 : uCurl;
    float al = r * kap + uWrapTurn;
    vec3 p = A + ((sin(al) - sin(uWrapTurn)) * vec3(0.0, 1.0, 0.0) + (cos(al) - cos(uWrapTurn)) * N) / kap;
    float ph2 = uK2 * r + uPhase2;
    return p + N * (uB * sin(ph2));
}
void main() {
    // s is arc length along the fold, so rows of type stay evenly spaced
    // however tightly the cloth turns.
    float s = (aUV.x - 0.5) * uLen;
    float r = (aUV.y - 0.5) * uWid;
    vec3 p = surf(s, r);
    // Normal by central differences: the rolled meander has no tidy closed form.
    float es = 0.002 * uLen, er = 0.002 * uWid;
    vec3 n = cross(surf(s + es, r) - surf(s - es, r), surf(s, r + er) - surf(s, r - er));
    vec3 vp = uRot * (p * uScale) + vec3(0.0, 0.0, -uDist);
    vST = vec2(s, r);
    vN = uRot * n;
    vPos = vp;
    vDepth = -vp.z - uDist;
    vec4 clip = uProj * vec4(vp, 1.0);
    clip.xy += uOffset * clip.w;
    gl_Position = clip;
}`

const FRAG = `#version 300 es
precision highp float;
in vec2 vST;
in vec3 vN;
in vec3 vPos;
in float vDepth;
uniform sampler2D uTex;
uniform vec2 uTexScale;
uniform float uWid;
uniform float uScroll;
uniform vec3 uLight;
uniform float uAmb;
uniform float uGamma;
uniform float uGain;
uniform float uBack;
uniform float uFade;
uniform float uFadeRange;
uniform vec3 uBg;
uniform vec3 uInk;
out vec4 outColor;
void main() {
    vec3 n = normalize(vN + vec3(0.0, 0.0, 1e-5));
    vec3 V = normalize(-vPos);
    float k = 1.0;
    if (dot(n, V) < 0.0) { n = -n; k = uBack; }
    float d = max(dot(n, normalize(uLight)), 0.0);
    float shade = uAmb + (1.0 - uAmb) * pow(d, max(uGamma, 0.05));
    shade *= k;
    shade *= 1.0 - uFade * clamp(vDepth / max(uFadeRange, 1e-3), 0.0, 1.0);
    shade = clamp(shade * uGain, 0.0, 1.0);
    // Measured from the sheet's edge, so a row always starts on a whole phrase.
    vec2 uv = vec2((0.5 * uWid - vST.y) * uTexScale.x + uScroll, -vST.x * uTexScale.y);
    float a = texture(uTex, uv).a;
    outColor = vec4(mix(uBg, uInk * shade, a), 1.0);
}`

/** Framer's `ControlType.Font` value. */
interface FontValue {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    variant?: string
    letterSpacing?: string | number
    fontSize?: string | number
    lineHeight?: string | number
}

export interface SableFurlProps {
    /** The phrase repeated across the sheet. */
    text?: string
    background?: string
    font?: FontValue
    textColor?: string
    /** How deep the folds are, 0–100. */
    amplitude?: number
    /** Size of the sheet and its type in the frame, %. */
    scale?: number
    /** 50 is the designed rate, 0 stops. */
    speed?: number
    advanced?: Partial<Advanced>
    style?: React.CSSProperties
}

type RGB = [number, number, number]
const colorCache = new Map<string, RGB>()
let colorCtx: CanvasRenderingContext2D | null = null

function parseColor(input: unknown, fallback: RGB): RGB {
    if (typeof input !== "string" || !input) return fallback
    const hit = colorCache.get(input)
    if (hit) return hit
    let s = input.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    let out: RGB = fallback
    const fromHex = (str: string): RGB | null => {
        const m = str.match(/^#([0-9a-f]{3,8})$/i)
        if (!m) return null
        let h = m[1]
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        return [
            parseInt(h.slice(0, 2), 16) / 255,
            parseInt(h.slice(2, 4), 16) / 255,
            parseInt(h.slice(4, 6), 16) / 255,
        ]
    }
    const fromRgb = (str: string): RGB | null => {
        const m = str.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i)
        return m ? [+m[1] / 255, +m[2] / 255, +m[3] / 255] : null
    }
    const direct = fromHex(s) || fromRgb(s)
    if (direct) out = direct
    else if (typeof document !== "undefined") {
        if (!colorCtx) colorCtx = document.createElement("canvas").getContext("2d")
        if (colorCtx) {
            colorCtx.fillStyle = "#000000"
            colorCtx.fillStyle = s
            const r = String(colorCtx.fillStyle)
            out = fromHex(r) || fromRgb(r) || fallback
        }
    }
    colorCache.set(input, out)
    return out
}

interface FontParts {
    weight: number
    style: string
    family: string
    lsEm: number
}

function fontParts(font: FontValue | undefined): FontParts {
    const f = font || {}
    const v = String(f.variant || "")
    let weight = 500
    if (f.fontWeight) weight = Number(f.fontWeight) || 500
    else if (/thin/i.test(v)) weight = 100
    else if (/extra ?light/i.test(v)) weight = 200
    else if (/light/i.test(v)) weight = 300
    else if (/semi ?bold/i.test(v)) weight = 600
    else if (/extra ?bold/i.test(v)) weight = 800
    else if (/black/i.test(v)) weight = 900
    else if (/bold/i.test(v)) weight = 700
    else if (/medium/i.test(v)) weight = 500
    else if (/regular/i.test(v)) weight = 400
    const style = f.fontStyle || (/italic/i.test(v) ? "italic" : "normal")
    const fallbacks = `"Helvetica Neue", Helvetica, Arial, sans-serif`
    const family = f.fontFamily ? `${f.fontFamily}, ${fallbacks}` : fallbacks
    let lsEm = 0
    const ls = f.letterSpacing
    if (typeof ls === "number") lsEm = ls / 16
    else if (typeof ls === "string") {
        const n = parseFloat(ls)
        if (!isNaN(n)) {
            if (/em/.test(ls)) lsEm = n
            else {
                const fs = parseFloat(String(f.fontSize ?? 16)) || 16
                lsEm = n / fs
            }
        }
    }
    return { weight, style, family, lsEm }
}

/** Draws ROWS_IN_TEX rows of the phrase, one phrase wide; returns phrase width / row height. */
function buildTextTexture(
    gl: WebGL2RenderingContext,
    tex: WebGLTexture,
    phrase: string,
    parts: FontParts,
    leading: number,
    rowShift: number,
    aniso: EXT_texture_filter_anisotropic | null
): number {
    const c = document.createElement("canvas")
    const ctx = c.getContext("2d")
    if (!ctx) return 10
    let px = 128
    const setFont = () => {
        ctx.font = `${parts.style} ${parts.weight} ${px}px ${parts.family}`
        try {
            ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${parts.lsEm * px}px`
        } catch (e) {}
    }
    setFont()
    const gapEm = 0.32
    let w = (phrase ? ctx.measureText(phrase).width : px) + gapEm * px
    if (w > 4096) {
        px = Math.max(16, Math.floor((px * 4096) / w))
        setFont()
        w = (phrase ? ctx.measureText(phrase).width : px) + gapEm * px
    }
    const W = Math.max(8, Math.min(4096, Math.ceil(w)))
    const rowH = Math.max(4, Math.round(px * leading))
    c.width = W
    c.height = rowH * ROWS_IN_TEX
    setFont()
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.fillStyle = "#ffffff"
    ctx.textBaseline = "alphabetic"
    const base = (rowH + 0.72 * px) / 2
    // Half the gap each side, so a phrase that spans the sheet sits off both edges equally.
    const lead = (gapEm * px) / 2
    if (phrase) {
        for (let i = 0; i < ROWS_IN_TEX; i++) {
            const off = lead - ((i * rowShift) % 1) * W
            const y = i * rowH + base
            ctx.fillText(phrase, off, y)
            ctx.fillText(phrase, off + W, y)
            ctx.fillText(phrase, off - W, y)
        }
    }
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    if (aniso) {
        const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1
        gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max))
    }
    return W / rowH
}

function mul3(a: number[], b: number[]): number[] {
    const o = new Array(9).fill(0)
    for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
            o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]
    return o
}
const rotX = (t: number) => {
    const c = Math.cos(t),
        s = Math.sin(t)
    return [1, 0, 0, 0, c, -s, 0, s, c]
}
const rotY = (t: number) => {
    const c = Math.cos(t),
        s = Math.sin(t)
    return [c, 0, s, 0, 1, 0, -s, 0, c]
}
const rotZ = (t: number) => {
    const c = Math.cos(t),
        s = Math.sin(t)
    return [c, -s, 0, s, c, 0, 0, 0, 1]
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)
    if (!sh) throw new Error("shader")
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "compile")
    return sh
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 1200
 */
export default function SableFurl(props: SableFurlProps) {
    props = withMovedControls(props)
    const {
    text = "TEXT COMPONENT",
    background = "#000000",
    font = {"variant":"Medium","fontSize":"16px","textAlign":"left","fontFamily":"Inter","fontWeight":400,"lineHeight":"1em","letterSpacing":"-0.01em"},
    textColor = "#867DFF",
    amplitude = 48,
    scale = 80,
    speed = 50,
    advanced = {"fov":35,"yaw":28,"gain":115,"roll":48,"sway":2,"tilt":30,"wrap":6,"cross":0,"grain":0,"phase":300,"easeMs":2000,"lightX":-18,"lightY":16,"waveMs":18700,"ambient":50,"falloff":170,"leading":90,"offsetX":0,"offsetY":0,"distance":25,"rowShift":0,"scrollMs":0,"vignette":0,"wrapTurn":-15,"backShade":80,"crossFreq":123,"depthFade":10,"hoverLift":15,"hoverTilt":6,"pressBoost":80,"sheetWidth":135,"rowsPerWave":28,"sheetLength":1800},
    style,
} = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const grainRef = useRef<HTMLDivElement>(null)
    const propsRef = useRef<SableFurlProps>({})
    propsRef.current = { text, font, textColor, background, speed, amplitude, scale, advanced }

    const adv: Advanced = { ...DEFAULT_ADVANCED, ...advanced }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: false,
            premultipliedAlpha: false,
        })
        if (!gl) return

        const prog = gl.createProgram()
        if (!prog) throw new Error("program")
        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link")
        gl.useProgram(prog)

        const U = (name: string) => gl.getUniformLocation(prog, name)
        const u = {
            proj: U("uProj"),
            rot: U("uRot"),
            scale: U("uScale"),
            dist: U("uDist"),
            offset: U("uOffset"),
            len: U("uLen"),
            wid: U("uWid"),
            k: U("uK"),
            turn: U("uTurn"),
            pinch: U("uPinch"),
            drift: U("uDrift"),
            prof: U("uProf"),
            curl: U("uCurl"),
            wrapTurn: U("uWrapTurn"),
            phase: U("uPhase"),
            b: U("uB"),
            k2: U("uK2"),
            phase2: U("uPhase2"),
            tex: U("uTex"),
            texScale: U("uTexScale"),
            scroll: U("uScroll"),
            light: U("uLight"),
            amb: U("uAmb"),
            gamma: U("uGamma"),
            gain: U("uGain"),
            back: U("uBack"),
            fade: U("uFade"),
            fadeRange: U("uFadeRange"),
            bg: U("uBg"),
            ink: U("uInk"),
        }

        // Grid mesh in (0..1)² parameter space
        const verts = new Float32Array((SEG_S + 1) * (SEG_R + 1) * 2)
        let vi = 0
        for (let j = 0; j <= SEG_R; j++)
            for (let i = 0; i <= SEG_S; i++) {
                verts[vi++] = i / SEG_S
                verts[vi++] = j / SEG_R
            }
        const idx = new Uint32Array(SEG_S * SEG_R * 6)
        let ii = 0
        for (let j = 0; j < SEG_R; j++)
            for (let i = 0; i < SEG_S; i++) {
                const a = j * (SEG_S + 1) + i
                const b = a + 1
                const c = a + SEG_S + 1
                const d = c + 1
                idx[ii++] = a
                idx[ii++] = b
                idx[ii++] = c
                idx[ii++] = b
                idx[ii++] = d
                idx[ii++] = c
            }
        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        const vbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
        const loc = gl.getAttribLocation(prog, "aUV")
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
        const ibo = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW)

        const tex = gl.createTexture()
        if (!tex) throw new Error("texture")
        const aniso = gl.getExtension("EXT_texture_filter_anisotropic")
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.uniform1i(u.tex, 0)

        gl.enable(gl.DEPTH_TEST)
        gl.disable(gl.CULL_FACE)

        // Fonts
        let fontVersion = 0
        const fontsAsked = new Set<string>()
        let alive = true
        const fontsApi = document.fonts
        if (fontsApi?.ready)
            fontsApi.ready.then(() => {
                if (alive) fontVersion++
            })

        const prof = new Float32Array(PROF_N * 2)
        let profTurn = -1,
            profPinch = -1,
            profK = -1,
            drift = 1

        let texKey = ""
        let texAspect = 10

        // Size
        let W = 0,
            H = 0
        const resize = () => {
            const w = root.offsetWidth
            const h = root.offsetHeight
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            W = Math.max(1, Math.round(w * dpr))
            H = Math.max(1, Math.round(h * dpr))
            if (canvas.width !== W) canvas.width = W
            if (canvas.height !== H) canvas.height = H
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        // Pointer — measured against the box as displayed, so canvas zoom and
        // scaled previews still put the response under the cursor.
        const target = { x: 0, y: 0, over: 0, down: 0 }
        const eased = { x: 0, y: 0, over: 0, down: 0 }
        const onMove = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            const w = r.width || 1
            const h = r.height || 1
            target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / w) * 2 - 1))
            target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / h) * 2 - 1))
            target.over = 1
        }
        const onLeave = () => {
            target.over = 0
            target.x = 0
            target.y = 0
            target.down = 0
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            target.down = 1
        }
        const onUp = (e: PointerEvent) => {
            target.down = 0
            if (e.pointerType === "touch") onLeave()
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        // Grain tile
        const grainEl = grainRef.current
        if (grainEl) {
            const g = document.createElement("canvas")
            g.width = g.height = 160
            const gc = g.getContext("2d")
            if (gc) {
                const id = gc.createImageData(160, 160)
                for (let i = 0; i < id.data.length; i += 4) {
                    const v = Math.random() * 255
                    id.data[i] = id.data[i + 1] = id.data[i + 2] = v
                    id.data[i + 3] = 110
                }
                gc.putImageData(id, 0, 0)
                grainEl.style.backgroundImage = `url(${g.toDataURL()})`
            }
        }

        const rt = RenderTarget.current()
        const frozen = rt === RenderTarget.thumbnail || rt === (RenderTarget as { export?: string }).export
        const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        let t = 0
        let last = -1
        let raf = 0
        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const a: Advanced = { ...DEFAULT_ADVANCED, ...p.advanced }
            const still = frozen || !!mq?.matches

            // Pointer easing
            const hk = still ? 0 : Math.max(0, a.hover) / 50
            const tau = Math.max(0.05, a.easeMs / 1000)
            const ek = 1 - Math.exp((-dt * 4) / tau)
            eased.x += (target.x - eased.x) * ek
            eased.y += (target.y - eased.y) * ek
            eased.over += (target.over - eased.over) * ek
            eased.down += (target.down - eased.down) * ek

            const speedMul = Math.max(0, p.speed ?? 50) / 50
            if (!still) t += dt * speedMul * (1 + (a.pressBoost / 100) * eased.down * hk)

            // Texture
            const parts = fontParts(p.font)
            const phrase = String(p.text ?? "").replace(/\s+$/, "")
            const key = [phrase, parts.family, parts.weight, parts.style, parts.lsEm, a.leading, a.rowShift, fontVersion].join("|")
            if (key !== texKey) {
                texKey = key
                const fontStr = `${parts.style} ${parts.weight} 128px ${parts.family}`
                if (fontsApi?.load && !fontsAsked.has(fontStr)) {
                    fontsAsked.add(fontStr)
                    fontsApi
                        .load(fontStr)
                        .then(() => {
                            if (alive) fontVersion++
                        })
                        .catch(() => {})
                }
                texAspect = buildTextTexture(
                    gl,
                    tex,
                    phrase,
                    parts,
                    Math.max(0.5, a.leading / 100),
                    Math.max(0, a.rowShift) / 100,
                    aniso
                )
            }

            if (W < 2 || H < 2) return

            const amp = Math.max(0, p.amplitude ?? 68)
            const waveSec = Math.max(0.1, a.waveMs / 1000)
            const cyc = (t / waveSec) % 1
            const lambda = Math.max(0.1, a.wavelength / 100)
            const k = TAU / lambda
            // Amplitude is how far the cloth's heading swings: 100 rolls it to
            // MAX_TURN, about as far as the lobes go before running into each other.
            const turn = Math.min(MAX_TURN * 1.2, (amp / 100) * MAX_TURN * (1 + (a.hoverLift / 100) * eased.over * hk))
            const pinch = (Math.max(0, a.pinch) / 100) * MAX_PINCH
            if (turn !== profTurn || pinch !== profPinch || k !== profK) {
                profTurn = turn
                profPinch = pinch
                profK = k
                drift = buildProfile(turn, pinch, k, prof)
            }
            const B = ((a.cross / 100) * turn) / k

            const yaw = (a.yaw + a.sway * Math.sin(TAU * cyc) + eased.x * a.hoverTilt * hk) * DEG
            const tilt = (a.tilt + eased.y * a.hoverTilt * hk) * DEG
            const rot = mul3(rotZ(a.roll * DEG), mul3(rotX(-tilt), rotY(yaw)))

            const aspect = W / H
            const fov = Math.max(5, Math.min(120, a.fov)) * DEG
            let f = 1 / Math.tan(fov / 2)
            if (aspect < 1) f *= aspect
            const near = 0.05,
                far = 200
            const proj = new Float32Array([
                f / aspect, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (far + near) / (near - far), -1,
                0, 0, (2 * far * near) / (near - far), 0,
            ])

            const sc = Math.max(0.05, (p.scale ?? 100) / 100)
            const wid = Math.max(0.2, a.sheetWidth / 100)
            const pitch = lambda / Math.max(1, a.rowsPerWave)
            // Fit a whole number of phrases across the sheet so every row
            // starts and ends on the phrase (the poster's rows run edge to edge).
            const reps = Math.max(1, Math.round(wid / (pitch * texAspect)))
            const scroll = a.scrollMs > 0 ? (t / (a.scrollMs / 1000)) % 1 : 0

            const bg = parseColor(p.background, [0, 0, 0])
            const ink = parseColor(p.textColor, [1, 1, 1])
            const lx = a.lightX * DEG,
                ly = a.lightY * DEG

            gl.viewport(0, 0, W, H)
            gl.clearColor(bg[0], bg[1], bg[2], 1)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.useProgram(prog)
            gl.bindVertexArray(vao)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)

            gl.uniformMatrix4fv(u.proj, false, proj)
            gl.uniformMatrix3fv(u.rot, true, new Float32Array(rot))
            gl.uniform1f(u.scale, sc)
            gl.uniform1f(u.dist, Math.max(0.5, a.distance / 10))
            gl.uniform2f(u.offset, (a.offsetX / 100) * 2, (-a.offsetY / 100) * 2)
            gl.uniform1f(u.len, Math.max(0.5, a.sheetLength / 100))
            gl.uniform1f(u.wid, wid)
            gl.uniform1f(u.k, k)
            gl.uniform1f(u.turn, turn)
            gl.uniform1f(u.pinch, pinch)
            gl.uniform1f(u.drift, drift)
            gl.uniform4fv(u.prof, prof)
            gl.uniform1f(u.curl, (a.wrap * DEG) / wid)
            gl.uniform1f(u.wrapTurn, a.wrapTurn * DEG)
            gl.uniform1f(u.phase, a.phase * DEG - TAU * cyc)
            gl.uniform1f(u.b, B)
            gl.uniform1f(u.k2, (k * a.crossFreq) / 100)
            gl.uniform1f(u.phase2, TAU * cyc)
            gl.uniform2f(u.texScale, reps / wid, 1 / Math.max(1e-4, pitch * ROWS_IN_TEX))
            gl.uniform1f(u.scroll, scroll)
            gl.uniform3f(u.light, Math.sin(lx) * Math.cos(ly), Math.sin(ly), Math.cos(lx) * Math.cos(ly))
            gl.uniform1f(u.amb, Math.max(0, Math.min(1, a.ambient / 100)))
            gl.uniform1f(u.gamma, a.falloff / 100)
            gl.uniform1f(u.gain, a.gain / 100)
            gl.uniform1f(u.back, a.backShade / 100)
            gl.uniform1f(u.fade, Math.max(0, Math.min(1, a.depthFade / 100)))
            gl.uniform1f(u.fadeRange, 4 * sc)
            gl.uniform3f(u.bg, bg[0], bg[1], bg[2])
            gl.uniform3f(u.ink, ink[0], ink[1], ink[2])

            gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0)

            if (grainEl && a.grain > 0 && !still) {
                grainEl.style.backgroundPosition = `${Math.floor(Math.random() * 160)}px ${Math.floor(Math.random() * 160)}px`
            }
        }
        raf = requestAnimationFrame(tick)

        return () => {
            alive = false
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            gl.deleteTexture(tex)
            gl.deleteBuffer(vbo)
            gl.deleteBuffer(ibo)
            gl.deleteVertexArray(vao)
            gl.deleteProgram(prog)
        }
    }, [])

    const grainOpacity = Math.max(0, Math.min(1, adv.grain / 100))
    const vig = Math.max(0, Math.min(1, adv.vignette / 100))

    return (
        <div
            ref={rootRef}
            style={{
                width: "100%",
                height: "100%",
                ...style,
                position: "relative",
                overflow: "hidden",
                background,
                touchAction: "none",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
            <div
                ref={grainRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    backgroundRepeat: "repeat",
                    opacity: grainOpacity,
                    display: grainOpacity > 0 ? "block" : "none",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0,${vig}) 100%)`,
                    display: vig > 0 ? "block" : "none",
                }}
            />
        </div>
    )
}

// Control order arranged in the builder.
