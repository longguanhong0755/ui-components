"use client"

import type { CSSProperties } from "react"
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

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    poleSpread: 31,
    rollAmp: 64,
    tiltAmp: 14,
    yawAmp: 16,
    cycleMs: 10500,
    startValue: 9,
    linearShare: 18,
    curvePower: 7,
    holdMs: 2700,
    scatterMs: 150,
    digitLon: 176,
    digitLat: 108,
    digitFill: 90,
    lineWidth: 1,
    lineMin: 1,
    lineMax: 6,
    haloDeg: 0,
    haloRings: 7,
    haloSpokes: 5,
    discDeg: 7,
    ringDeg: 4,
    bandLon: 111,
    bandWidth: 23,
    roughness: 117,
    outerHoles: 30,
    holeScale: 30,
    drift: 20,
    labelChance: 4,
    labelSize: 60,
    labelMin: 16,
    labelColor: "#B7B7B7",
    labelOpacity: 80,
    backdropBottom: "#C4C4C4",
    backdropSplit: 55,
    seed: 7,
    grain: 48,
    vignette: 100,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{"color":"colors","lineColor":"colors","background":"colors"},"out":{}}
/** The "Colors" group's defaults, for when Framer passes it unopened. */
const COLORS_DEFAULTS = { color: "#FCFCFC", lineColor: "#047EEE", background: "#FF0000" }
const GROUP_FALLBACKS: Record<string, any> = { advanced: ADVANCED_DEFAULTS, colors: COLORS_DEFAULTS }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_dpr;
uniform mat3 u_rot;
uniform float u_yaw;
uniform float u_poleY;
uniform vec2 u_cells;
uniform vec3 u_cellCol;
uniform vec3 u_lineCol;
uniform vec3 u_digitCol;
uniform vec3 u_bgTop;
uniform vec3 u_bgBot;
uniform float u_bgSplit;
uniform vec3 u_lineW;
uniform vec4 u_pole;
uniform float u_ringRad;
uniform vec4 u_hole;
uniform float u_outerThr;
uniform vec2 u_noise;
uniform float u_seed;
uniform sampler2D u_maskA;
uniform sampler2D u_maskB;
uniform float u_mix;
uniform vec2 u_span;
uniform sampler2D u_atlas;
uniform vec4 u_label;
uniform vec3 u_labelCol;
uniform vec3 u_fx;
out vec4 outColor;

const float PI = 3.14159265;
const float TAU = 6.2831853;

float h21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
float h31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = h31(i);
    float b = h31(i + vec3(1.0, 0.0, 0.0));
    float c = h31(i + vec3(0.0, 1.0, 0.0));
    float d = h31(i + vec3(1.0, 1.0, 0.0));
    float e = h31(i + vec3(0.0, 0.0, 1.0));
    float g = h31(i + vec3(1.0, 0.0, 1.0));
    float h = h31(i + vec3(0.0, 1.0, 1.0));
    float k = h31(i + vec3(1.0, 1.0, 1.0));
    return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z);
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_res) / u_res.y;

    // Inverse stereographic: the screen is the view from a pinhole on the shell's inside.
    vec2 X = p / max(u_poleY, 0.001);
    float r2 = dot(X, X);
    float dd = 1.0 + r2;
    vec3 P = vec3(2.0 * X.x / dd, 2.0 * X.y / dd, (r2 - 1.0) / dd);
    vec3 Q = u_rot * P;

    float lat = asin(clamp(Q.y, -1.0, 1.0));
    float lonA = atan(Q.x, -Q.z);
    float lonB = atan(-Q.x, Q.z);
    float stepLon = TAU / u_cells.x;
    float stepLat = PI / u_cells.y;
    float colat = 0.5 * PI - abs(lat);

    vec2 c = vec2(lonA / stepLon, lat / stepLat);
    vec2 fwc = vec2(min(fwidth(lonA), fwidth(lonB)) / stepLon, fwidth(lat) / stepLat);
    fwc = max(fwc, vec2(1e-5));
    float fwLat = max(fwidth(lat), 1e-6);

    // Grid lines (finer rings and spokes in the pole halo)
    float inHalo = step(colat, u_pole.x);
    vec2 sub = mix(vec2(1.0), vec2(u_pole.y, u_pole.z), inHalo);
    vec2 g = c * sub;
    vec2 fw = fwc * sub;
    vec2 cellPx = 1.0 / fw;
    vec2 distPx = (0.5 - abs(fract(g) - 0.5)) * cellPx;
    vec2 w = clamp(u_lineW.x * cellPx, vec2(u_lineW.y * u_dpr), vec2(u_lineW.z * u_dpr));
    vec2 cov = 1.0 - smoothstep(w * 0.5 - 0.5, w * 0.5 + 0.5, distPx);
    float line = max(cov.x, cov.y);
    float avg = clamp(w.x * fw.x + w.y * fw.y, 0.0, 1.0);
    line = mix(line, avg, smoothstep(0.2, 0.5, max(fw.x, fw.y)));

    // Coarse cell
    vec2 id = floor(c);
    float cLon = (id.x + 0.5) * stepLon;
    float cLat = (id.y + 0.5) * stepLat;
    float cColat = 0.5 * PI - abs(cLat);

    // Counter digits: held between the poles (yaw removed), sampled per cell
    float dLon = mod(cLon + u_yaw + PI, TAU) - PI;
    vec2 muv = vec2(dLon / u_span.x + 0.5, 0.5 - cLat / u_span.y);
    float inWin = step(0.0, muv.x) * step(muv.x, 1.0) * step(0.0, muv.y) * step(muv.y, 1.0);
    float mA = texture(u_maskA, muv).r;
    float mB = texture(u_maskB, muv).r;
    float hs = h21(id + u_seed * 7.13);
    float m = hs < u_mix ? mB : mA;
    float digit = step(0.5, m) * inWin * step(u_pole.x, cColat);

    // Holes: whole cells switched off, riding on the sphere
    vec3 cdir = vec3(cos(cLat) * sin(cLon), sin(cLat), -cos(cLat) * cos(cLon));
    float n1 = vnoise(cdir * u_noise.x + vec3(u_seed, 0.0, u_noise.y));
    float n2 = vnoise(cdir * u_noise.x * 1.7 + vec3(3.7, u_noise.y, u_seed * 1.3));
    float al = abs(dLon);
    float bandD = abs(al - u_hole.y) / max(u_hole.z, 0.001);
    float score = u_hole.x - bandD + (n1 - 0.5) * u_hole.w;
    float hole = step(0.0, score) * step(0.001, u_hole.x);
    hole = max(hole, step(u_hole.y, al) * step(u_outerThr, n2));
    hole *= step(u_pole.x, cColat) * (1.0 - digit);

    // Cell index labels
    float hasL = step(h21(id + vec2(17.3, u_seed)), u_label.x) * (1.0 - inHalo);
    float num = floor(10.0 + h21(id + vec2(3.1, 9.7 + u_seed)) * 100.0);
    float nd = num >= 100.0 ? 3.0 : 2.0;
    vec2 cpx = 1.0 / fwc;
    vec2 lp = (fract(c) - 0.5) * cpx;
    float gh = max(u_label.y * min(cpx.x, cpx.y) * 0.5, 0.001);
    float gw = gh * 0.62;
    float lx = (lp.x + nd * gw * 0.5) / gw;
    float ly = lp.y / gh + 0.5;
    float kk = clamp(floor(lx), 0.0, nd - 1.0);
    float ex = nd - 1.0 - kk;
    float div = ex > 1.5 ? 100.0 : (ex > 0.5 ? 10.0 : 1.0);
    float dgt = mod(floor((num + 0.5) / div), 10.0);
    float inside = step(0.0, lx) * step(lx, nd) * step(0.0, ly) * step(ly, 1.0);
    vec2 auv = vec2((dgt + fract(lx)) / 10.0, 1.0 - ly);
    float glyph = texture(u_atlas, auv).r;
    float lvis = smoothstep(u_label.w * u_dpr * 0.7, u_label.w * u_dpr, min(cpx.x, cpx.y));
    float lab = glyph * inside * hasL * lvis * u_label.z;

    // Backdrop seen through the holes
    float sy = 1.0 - frag.y / u_res.y;
    float bt = clamp((sy - u_bgSplit) / max(1.0 - u_bgSplit, 0.001), 0.0, 1.0);
    vec3 bg = mix(u_bgTop, u_bgBot, bt * bt * (3.0 - 2.0 * bt));

    vec3 col = mix(u_cellCol, u_lineCol, line);
    col = mix(col, u_labelCol, lab * (1.0 - line));
    col = mix(col, u_digitCol, digit);
    col = mix(col, bg, hole);

    // Pole eye: black disc, thin white ring, white dot
    float disc = 1.0 - smoothstep(u_pole.w - fwLat, u_pole.w + fwLat, colat);
    float ringD = abs(colat - u_ringRad) / fwLat;
    float ring = 1.0 - smoothstep(0.75 * u_dpr - 0.5, 0.75 * u_dpr + 0.5, ringD);
    float dotR = u_ringRad * 0.18;
    float dotC = 1.0 - smoothstep(dotR - fwLat, dotR + fwLat, colat);
    vec3 pc = mix(u_cellCol, u_lineCol, max(ring, dotC));
    col = mix(col, pc, disc);

    // Vignette and grain
    vec2 uv = frag / u_res;
    float asp = u_res.x / u_res.y;
    float vd = length((uv - 0.5) * vec2(asp, 1.0)) / length(vec2(0.5 * asp, 0.5));
    col *= 1.0 - u_fx.y * smoothstep(0.35, 1.0, vd) * 0.85;
    float gn = h21(frag + fract(u_fx.z * 0.618) * 913.0) - 0.5;
    col += gn * u_fx.x * 0.28;

    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

const UNIFORMS = [
    "u_res", "u_dpr", "u_rot", "u_yaw", "u_poleY", "u_cells", "u_cellCol", "u_lineCol", "u_digitCol",
    "u_bgTop", "u_bgBot", "u_bgSplit", "u_lineW", "u_pole", "u_ringRad", "u_hole", "u_outerThr",
    "u_noise", "u_seed", "u_maskA", "u_maskB", "u_mix", "u_span", "u_atlas", "u_label",
    "u_labelCol", "u_fx",
]

const MASK_W = 512
const MASK_H = 376
const DEG = Math.PI / 180

// Orientation keyframes read from the reference (seconds of a 6.3 s cycle).
// Poles start stacked vertically, roll to side by side by 1.64 s, swing back
// through 45° at 2.39 s, stand vertical again from 3.15 s with a slow wobble.
const KEY_T = [0, 0.76, 1.13, 1.64, 2.39, 2.85, 3.15, 4.6, 6.3]
const KEY_ROLL = [0, 25, 45, 88, 45, 15, 0, -4, 0]
const KEY_PITCH = [0, 8, 6, 0, -8, -4, 0, 2, 0]

function track(keys: number[], t: number) {
    const n = KEY_T.length
    let i = 0
    while (i < n - 2 && t > KEY_T[i + 1]) i++
    const t0 = KEY_T[i]
    const t1 = KEY_T[i + 1]
    const u = clamp((t - t0) / Math.max(1e-6, t1 - t0), 0, 1)
    const p0 = i === 0 ? keys[n - 2] : keys[i - 1]
    const p1 = keys[i]
    const p2 = keys[i + 1]
    const p3 = i + 2 > n - 1 ? keys[1] : keys[i + 2]
    const u2 = u * u
    const u3 = u2 * u
    return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
}

const colorCache = new Map<string, number[]>()
let probe: CanvasRenderingContext2D | null = null
function rgb(c: string | undefined, fallback: string): number[] {
    const key = c || fallback
    const hit = colorCache.get(key)
    if (hit) return hit
    let s = key
    const v = /^var\([^,]+,\s*(.+)\)\s*$/.exec(s)
    if (v) s = v[1]
    if (!probe) {
        const cv = document.createElement("canvas")
        cv.width = cv.height = 1
        probe = cv.getContext("2d", { willReadFrequently: true })
    }
    let out = [1, 1, 1]
    if (probe) {
        probe.clearRect(0, 0, 1, 1)
        probe.fillStyle = fallback
        probe.fillStyle = s
        probe.fillRect(0, 0, 1, 1)
        const d = probe.getImageData(0, 0, 1, 1).data
        out = [d[0] / 255, d[1] / 255, d[2] / 255]
    }
    colorCache.set(key, out)
    return out
}

function clamp(v: number, a: number, b: number) {
    return Math.min(b, Math.max(a, v))
}

function fontCss(font: any, size: number) {
    const family = font?.fontFamily || `"Inter", Helvetica, Arial, sans-serif`
    const weight = font?.fontWeight || 700
    const style = font?.fontStyle || "normal"
    return `${style} ${weight} ${size}px ${family}`
}

function fontKeyOf(font: any) {
    return `${font?.fontFamily}|${font?.fontWeight}|${font?.fontStyle}`
}

// Column-major mat3 for Q = Ry(yaw) · Rx(pitch) · Rz(roll) · P
function rotation(roll: number, pitch: number, yaw: number) {
    const cr = Math.cos(roll), sr = Math.sin(roll)
    const cp = Math.cos(pitch), sp = Math.sin(pitch)
    const cy = Math.cos(yaw), sy = Math.sin(yaw)
    const Rz = [cr, -sr, 0, sr, cr, 0, 0, 0, 1]
    const Rx = [1, 0, 0, 0, cp, -sp, 0, sp, cp]
    const Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy]
    const mul = (a: number[], b: number[]) => {
        const o = new Array(9).fill(0)
        for (let r = 0; r < 3; r++)
            for (let c = 0; c < 3; c++)
                for (let k = 0; k < 3; k++) o[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c]
        return o
    }
    const M = mul(Ry, mul(Rx, Rz))
    return new Float32Array([M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]])
}

export interface ItsInitialLoaderProps {
    cellColor?: string
    progress?: number
    colors?: {
        color?: string
        lineColor?: string
        background?: string
    }
    cells?: number
    font?: Record<string, unknown>
    text?: string
    duration?: number
    autoPlay?: boolean
    loop?: boolean
    speed?: number
    scale?: number
    holes?: number
    onComplete?: () => void
    advanced?: {
        poleSpread?: number
        rollAmp?: number
        tiltAmp?: number
        yawAmp?: number
        cycleMs?: number
        startValue?: number
        linearShare?: number
        curvePower?: number
        holdMs?: number
        scatterMs?: number
        digitLon?: number
        digitLat?: number
        digitFill?: number
        lineWidth?: number
        lineMin?: number
        lineMax?: number
        haloDeg?: number
        haloRings?: number
        haloSpokes?: number
        discDeg?: number
        ringDeg?: number
        bandLon?: number
        bandWidth?: number
        roughness?: number
        outerHoles?: number
        holeScale?: number
        drift?: number
        labelChance?: number
        labelSize?: number
        labelMin?: number
        labelColor?: string
        labelOpacity?: number
        backdropBottom?: string
        backdropSplit?: number
        seed?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function ItsInitialLoader(props: ItsInitialLoaderProps) {
    props = withMovedControls(props)
    const {
        autoPlay = true,
        progress = 9,
        duration = 4000,
        loop = true,
        speed = 36,
        scale = 85,
        cells = 96,
        holes = 0,
        text = "",
        font = {"variant":"Bold","fontSize":120,"textAlign":"left","fontFamily":"Inter","fontWeight":400,"lineHeight":"1em","letterSpacing":"0em"},
        color = "#FCFCFC",
        cellColor = "#000000",
        lineColor = "#FCFCFC",
        background = "#FF0000",
        onComplete,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const target = RenderTarget.current()
    const isStatic =
        target === RenderTarget.thumbnail || target === (RenderTarget as any).export
    const propsRef = useRef<any>(null)
    propsRef.current = {
        autoPlay, progress, duration, loop, speed, scale, cells, holes, text, font,
        color, cellColor, lineColor, background, onComplete, isStatic,
        advanced: props.advanced,
    }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        })
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)!
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                const log = gl.getShaderInfoLog(sh)
                gl.deleteShader(sh)
                throw new Error(`Shader compile failed: ${log}`)
            }
            return sh
        }
        const vs = compile(gl.VERTEX_SHADER, VERT)
        const fs = compile(gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()!
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            throw new Error(`Program link failed: ${gl.getProgramInfoLog(prog)}`)
        }
        gl.useProgram(prog)

        const U: Record<string, WebGLUniformLocation> = {}
        for (const n of UNIFORMS) {
            const loc = gl.getUniformLocation(prog, n)
            if (!loc) throw new Error(`Missing uniform ${n}`)
            U[n] = loc
        }

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const aPos = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        const makeTex = () => {
            const t = gl.createTexture()!
            gl.bindTexture(gl.TEXTURE_2D, t)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
            return t
        }
        const upload = (tex: WebGLTexture, src: HTMLCanvasElement) => {
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
        }
        let texA = makeTex()
        let texB = makeTex()
        const atlasTex = makeTex()

        // Label glyph atlas: digits 0–9 in 64×96 slots
        const atlas = document.createElement("canvas")
        atlas.width = 640
        atlas.height = 96
        const actx = atlas.getContext("2d")
        if (actx) {
            actx.fillStyle = "#000"
            actx.fillRect(0, 0, 640, 96)
            actx.fillStyle = "#fff"
            actx.font = `500 70px Helvetica, Arial, sans-serif`
            actx.textAlign = "center"
            actx.textBaseline = "middle"
            for (let i = 0; i < 10; i++) actx.fillText(String(i), i * 64 + 32, 50)
            upload(atlasTex, atlas)
        }

        const mask = document.createElement("canvas")
        mask.width = MASK_W
        mask.height = MASK_H
        const mctx = mask.getContext("2d")
        const drawUpload = (tex: WebGLTexture, label: string, f: any, fill: number) => {
            if (!mctx) return
            mctx.fillStyle = "#000"
            mctx.fillRect(0, 0, MASK_W, MASK_H)
            if (label) {
                let size = MASK_H
                mctx.font = fontCss(f, size)
                let m = mctx.measureText(label)
                const gh0 = (m.actualBoundingBoxAscent || size * 0.72) + (m.actualBoundingBoxDescent || 0)
                const gw0 = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width)
                const k = Math.min((MASK_H * fill) / Math.max(1, gh0), (MASK_W * 0.96) / Math.max(1, gw0))
                size = Math.max(4, size * k)
                mctx.font = fontCss(f, size)
                m = mctx.measureText(label)
                const asc = m.actualBoundingBoxAscent || size * 0.72
                const desc = m.actualBoundingBoxDescent || 0
                const left = m.actualBoundingBoxLeft || m.width / 2
                const right = m.actualBoundingBoxRight || m.width / 2
                mctx.fillStyle = "#fff"
                mctx.textAlign = "center"
                mctx.textBaseline = "alphabetic"
                mctx.fillText(label, MASK_W / 2 - (right - left) / 2, MASK_H / 2 + (asc - desc) / 2)
            }
            upload(tex, mask)
        }

        let dpr = Math.min(window.devicePixelRatio || 1, 2)
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            const w = Math.max(1, Math.round(root.offsetWidth * dpr))
            const h = Math.max(1, Math.round(root.offsetHeight * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        let reduced = !!mq?.matches
        const onMq = () => { reduced = !!mq?.matches }
        mq?.addEventListener?.("change", onMq)

        const st = {
            elapsed: 0,
            done: false,
            hold: 0,
            phase: 0,
            strA: null as string | null,
            strB: null as string | null,
            fontKey: "",
            fontDirty: false,
            mix: 1,
            frame: 0,
        }
        const fonts: any = (document as any).fonts
        const onFonts = () => { st.fontDirty = true }
        fonts?.addEventListener?.("loadingdone", onFonts)
        fonts?.ready?.then?.(onFonts)

        let raf = 0
        let last = -1
        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const P = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(P.advanced ?? {}) }
            const still = P.isStatic || reduced
            const start = clamp(Math.round(adv.startValue), 0, 100)

            // Counter: slow linear tick, then a steep power ramp to 100
            let value = start
            if (P.isStatic) {
                value = 100
            } else if (P.autoPlay) {
                if (!st.done) {
                    st.elapsed += dt
                    const x = Math.min(1, (st.elapsed * 1000) / Math.max(100, P.duration))
                    const lin = clamp(adv.linearShare / 100, 0, 1)
                    const pr = lin * x + (1 - lin) * Math.pow(x, Math.max(1, adv.curvePower))
                    value = Math.round(start + (100 - start) * pr)
                    if (x >= 1) {
                        st.done = true
                        st.hold = 0
                        P.onComplete?.()
                    }
                } else {
                    value = 100
                    st.hold += dt
                    if (P.loop && st.hold * 1000 >= adv.holdMs) {
                        st.done = false
                        st.elapsed = 0
                        value = start
                    }
                }
            } else {
                value = clamp(Math.round(P.progress), 0, 100)
                st.done = false
                st.elapsed = 0
            }

            const custom = typeof P.text === "string" ? P.text.trim() : ""
            const label = custom || String(value).padStart(2, "0")
            const fill = clamp(adv.digitFill / 100, 0.1, 1)
            const fk = fontKeyOf(P.font)
            const fontChanged = fk !== st.fontKey || st.fontDirty
            if (st.strB === null) {
                drawUpload(texA, label, P.font, fill)
                drawUpload(texB, label, P.font, fill)
                st.strA = label
                st.strB = label
                st.mix = 1
            } else if (label !== st.strB) {
                const t = texA
                texA = texB
                texB = t
                st.strA = st.strB
                st.strB = label
                drawUpload(texB, label, P.font, fill)
                if (fontChanged) drawUpload(texA, st.strA ?? "", P.font, fill)
                st.mix = still || adv.scatterMs <= 0 ? 1 : 0
            } else if (fontChanged) {
                drawUpload(texA, st.strA ?? "", P.font, fill)
                drawUpload(texB, st.strB, P.font, fill)
            }
            st.fontDirty = false
            if (fk !== st.fontKey) {
                st.fontKey = fk
                fonts?.load?.(fontCss(P.font, 64))?.then?.(onFonts)?.catch?.(() => {})
            }
            st.mix = Math.min(1, st.mix + (dt * 1000) / Math.max(1, adv.scatterMs))

            // Sphere orientation: keyframed roll/pitch of the pole pair, steady spin about the pole axis
            if (!still) st.phase += dt * (P.speed / 50)
            const cycle = Math.max(0.5, adv.cycleMs / 1000)
            const ct = ((st.phase % cycle) + cycle) % cycle
            const kt = ct * (KEY_T[KEY_T.length - 1] / cycle)
            const roll = -track(KEY_ROLL, kt) * (adv.rollAmp / 88) * DEG
            const pitch = track(KEY_PITCH, kt) * (adv.tiltAmp / 8) * DEG
            const yaw = (st.phase * adv.yawAmp * DEG) % (Math.PI * 2)

            const lonCells = Math.max(8, Math.round(P.cells))
            const latCells = Math.max(4, Math.round(P.cells * 0.625))
            const holesF = clamp(P.holes / 100, 0, 1)

            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.useProgram(prog)
            gl.uniform2f(U.u_res, canvas.width, canvas.height)
            gl.uniform1f(U.u_dpr, dpr)
            gl.uniformMatrix3fv(U.u_rot, false, rotation(roll, pitch, yaw))
            gl.uniform1f(U.u_yaw, yaw)
            gl.uniform1f(U.u_poleY, (adv.poleSpread / 100) * (P.scale / 100))
            gl.uniform2f(U.u_cells, lonCells, latCells)
            gl.uniform3fv(U.u_cellCol, rgb(P.cellColor, "#080808"))
            gl.uniform3fv(U.u_lineCol, rgb(P.lineColor, "#FCFCFC"))
            gl.uniform3fv(U.u_digitCol, rgb(P.color, "#FCFCFC"))
            gl.uniform3fv(U.u_bgTop, rgb(P.background, "#FDFDFD"))
            gl.uniform3fv(U.u_bgBot, rgb(adv.backdropBottom, "#C4C4C4"))
            gl.uniform1f(U.u_bgSplit, clamp(adv.backdropSplit / 100, 0, 0.99))
            gl.uniform3f(U.u_lineW, adv.lineWidth / 100, adv.lineMin, Math.max(adv.lineMin, adv.lineMax))
            gl.uniform4f(U.u_pole, adv.haloDeg * DEG, Math.max(1, adv.haloSpokes), Math.max(1, adv.haloRings), adv.discDeg * DEG)
            gl.uniform1f(U.u_ringRad, adv.ringDeg * DEG)
            gl.uniform4f(U.u_hole, holesF * 2.2, adv.bandLon * DEG, (adv.bandWidth * DEG) / 2, (adv.roughness / 100) * 2)
            gl.uniform1f(U.u_outerThr, holesF * adv.outerHoles > 0 ? 1 - holesF * (adv.outerHoles / 100) * 1.6 : 2)
            gl.uniform2f(U.u_noise, adv.holeScale / 10, st.phase * (adv.drift / 100) * 0.5)
            gl.uniform1f(U.u_seed, adv.seed)
            gl.uniform1f(U.u_mix, st.mix)
            gl.uniform2f(U.u_span, Math.max(1, adv.digitLon) * DEG, Math.max(1, adv.digitLat) * DEG)
            gl.uniform4f(U.u_label, adv.labelChance / 100, adv.labelSize / 100, adv.labelOpacity / 100, adv.labelMin)
            gl.uniform3fv(U.u_labelCol, rgb(adv.labelColor, "#B7B7B7"))
            gl.uniform3f(U.u_fx, adv.grain / 100, adv.vignette / 100, st.frame++)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, texA)
            gl.uniform1i(U.u_maskA, 0)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, texB)
            gl.uniform1i(U.u_maskB, 1)
            gl.activeTexture(gl.TEXTURE2)
            gl.bindTexture(gl.TEXTURE_2D, atlasTex)
            gl.uniform1i(U.u_atlas, 2)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            mq?.removeEventListener?.("change", onMq)
            fonts?.removeEventListener?.("loadingdone", onFonts)
            gl.deleteTexture(texA)
            gl.deleteTexture(texB)
            gl.deleteTexture(atlasTex)
            gl.deleteBuffer(buf)
            gl.deleteProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                ...style,
                overflow: "hidden",
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
