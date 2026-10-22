"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

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

/*
 * TypeQuarry
 *
 * A wall of heavy block letters: the word lies on the tops of deep blocks
 * whose walls drop straight down, seen from a high oblique camera and printed
 * in 1-bit by error diffusion. Tap the wall and the blocks around the tap
 * tumble end over end and drop back into their slots, rippling outward.
 *
 * Refined from the user's PieceDenseIsometric and matched to their reference
 * poster, measured off the image: rows rise at 18.5°, the letters' down axis
 * runs at 36°, walls drop vertically ~1.1 cap heights, each row sits 1.6 caps
 * further down the letter plane and 0.6 caps lower, shifted five letters
 * along "FUNC TION ". Tones: near-white tops, walls facing the letters'
 * bottom ~40%, left walls near black, a black ground; the print is
 * Floyd–Steinberg at 1.5 px.
 *
 * Deviations from the earlier version, and why:
 *  - The blocks are real geometry (walls extruded from each glyph's
 *    marching-squares contour, z-buffered) drawn in WebGL. The earlier
 *    canvas build stacked up to 240 sprite copies per tumbling block on a
 *    CPU-backed canvas and re-dithered every frame, which is where the lag
 *    came from. Now the GPU draws tones and one Floyd–Steinberg pass prints
 *    them, only on frames where something moved.
 *  - Walls are shaded by their own normal, so curved walls (C, O, U) grade
 *    the way the reference does instead of carrying one flat tone.
 *  - The letter plane is foreshortened as an orthographic camera would see it
 *    (lengths follow from Row Angle and Slant), which is what makes the
 *    blocks read as the reference's tall slabs rather than flat stickers.
 *  - It no longer tumbles on its own: Play defaults to Tap. Auto keeps the
 *    earlier timed cascade.
 */

const DEFAULT_ADVANCED = {
    capHeight: 16,
    boldness: 15,
    rowSpacing: 161,
    rowRise: -62,
    letterGap: 0,
    rowShift: 5,
    rowAngle: 18,
    slant: 54,
    depth: 110,
    extrudeAngle: 90,
    faceTone: 97,
    litTone: 40,
    shadeTone: 3,
    lightAngle: 90,
    lightWidth: 0,
    flipMs: 550,
    flipDeg: 360,
    lift: 12,
    jitter: 50,
    endRest: 450,
    easeX1: 48,
    easeY1: 20,
    easeX2: 40,
    easeY2: 98,
    flash: 35,
    offsetX: 0,
    offsetY: 0,
    hoverRadius: 22,
    hoverLift: 3,
    hover: 50,
    grain: 0,
    vignette: 0,
}

type Advanced = typeof DEFAULT_ADVANCED

// The reference runs the word as two halves with a space after each.
const DEFAULT_TEXT = "FUNC TION "

// The reference is a 1-bit print scaled up by 1.5, which is where its uneven
// dot pairs and the moiré on the walls come from.
const DEFAULT_DITHER = 1.5

interface FontValue {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    letterSpacing?: string | number
}

export interface TypeQuarryProps {
    text?: string
    background?: string
    font?: FontValue
    baseColor?: string
    scale?: number
    ditherSize?: number
    stagger?: number
    rest?: number
    reach?: number
    trigger?: "tap" | "auto"
    speed?: number
    advanced?: Partial<Advanced>
    style?: React.CSSProperties
}

const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const mod = (a: number, n: number) => ((a % n) + n) % n

function parseColor(c: unknown, fb: number[]): number[] {
    if (typeof c !== "string") return fb
    const rgb = c.match(/rgba?\(([^)]+)\)/i)
    if (rgb) {
        const p = rgb[1]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .map((x) => parseFloat(x))
        if (p.length >= 3 && p.slice(0, 3).every((x) => isFinite(x))) {
            let a = 255
            if (p.length > 3 && isFinite(p[3]))
                a = Math.round(clamp(p[3] > 1 ? p[3] / 100 : p[3], 0, 1) * 255)
            return [p[0], p[1], p[2], a]
        }
    }
    const hex = c.match(/#([0-9a-f]{3,8})\b/i)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((x) => x + x)
                .join("")
        if (h.length === 6) h += "ff"
        if (h.length === 8) {
            const n = parseInt(h, 16)
            if (isFinite(n)) return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
        }
    }
    return fb
}

/** RGBA as one little-endian pixel for a Uint32 view of ImageData. */
const pack = (c: number[]) =>
    (((c[3] & 255) << 24) | ((c[2] & 255) << 16) | ((c[1] & 255) << 8) | (c[0] & 255)) >>> 0

function rnd(i: number) {
    let t = (Math.imul(i, 2654435761) + 0x6d2b79f5) >>> 0
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function makeEase(x1: number, y1: number, x2: number, y2: number) {
    const bz = (t: number, a: number, b: number) => {
        const u = 1 - t
        return 3 * a * u * u * t + 3 * b * u * t * t + t * t * t
    }
    return (x: number) => {
        if (x <= 0) return 0
        if (x >= 1) return 1
        let lo = 0
        let hi = 1
        for (let i = 0; i < 22; i++) {
            const m = (lo + hi) / 2
            if (bz(m, x1, x2) < x) lo = m
            else hi = m
        }
        return bz((lo + hi) / 2, y1, y2)
    }
}

// Framer's default family (Inter) is treated as "not chosen": the reference is a
// black-weight grotesk, so the heavy stack leads unless the user picks a family.
const DEFAULT_FAMILIES = ["", "inter", "inter variable", "inter display"]

function fontOf(font: FontValue | undefined, px: number) {
    const f = font || {}
    const famRaw = f.fontFamily ? String(f.fontFamily).replace(/"/g, "") : ""
    const fam = famRaw && !DEFAULT_FAMILIES.includes(famRaw.toLowerCase()) ? `"${famRaw}", ` : ""
    const wNum = typeof f.fontWeight === "number" ? f.fontWeight : parseInt(String(f.fontWeight))
    const w = isFinite(wNum) && wNum >= 600 ? wNum : 900
    const st = f.fontStyle === "italic" ? "italic " : ""
    return `${st}${w} ${px}px ${fam}"Arial Black", "Helvetica Neue", Arial, sans-serif`
}

function spacingPx(v: unknown, px: number) {
    if (v == null) return 0
    if (typeof v === "number") return v
    const n = parseFloat(String(v))
    if (!isFinite(n)) return 0
    return String(v).includes("em") ? n * px : n
}

// Block vertex: local x, local y (glyph px, y down from the baseline), z as a
// 0–1 share of the depth; outward normal; 1 on the two caps, 0 on walls.
const STRIDE = 7

const VS = `
precision highp float;
attribute vec3 aP;
attribute vec3 aN;
attribute float aF;
uniform vec3 uOrg;
uniform vec2 uRes, uC, uU, uV, uE, uRot, uMaskOff, uMaskSize, uLdir;
uniform vec3 uView, uTones;
uniform float uDepthK, uD, uLift, uPy, uFlash;
varying vec2 vUV;
varying float vF, vT, vTop;
void main() {
    float c = uRot.x, s = uRot.y;
    float y = aP.y - uPy, z = (aP.z - 0.5) * uD;
    vec3 P = vec3(uOrg.x + aP.x, uOrg.y + uPy + y * c + z * s, uOrg.z + uD * 0.5 - y * s + z * c + uLift);
    vec3 N = vec3(aN.x, aN.y * c + aN.z * s, -aN.y * s + aN.z * c);
    vec2 q = uC + P.x * uU + P.y * uV + P.z * uE;
    gl_Position = vec4(q.x / uRes.x * 2.0 - 1.0, 1.0 - q.y / uRes.y * 2.0, -dot(P, uView) * uDepthK, 1.0);
    float t = uTones.z + (uTones.y - uTones.z) * max(0.0, dot(N.xy, uLdir)) + (uTones.x - uTones.z) * max(0.0, N.z);
    vT = t + (1.0 - t) * uFlash;
    vUV = (aP.xy + uMaskOff) / uMaskSize;
    vF = aF;
    vTop = (1.0 - aP.z) * uD;
}`

const FS = `
precision highp float;
uniform sampler2D uMask;
uniform vec2 uRes;
uniform vec3 uTones;
uniform float uVig, uGrain, uSeed, uRim;
varying vec2 vUV;
varying float vF, vT, vTop;
void main() {
    if (vF > 0.5 && texture2D(uMask, vUV).a < 0.5) discard;
    float l = vT;
    if (vF < 0.5 && vTop < uRim) l = max(l, uTones.y + (uTones.x - uTones.y) * 0.5);
    if (uVig > 0.0) {
        vec2 n = gl_FragCoord.xy / uRes * 2.0 - 1.0;
        float r = clamp((length(n) / 1.41421 - 0.35) / 0.65, 0.0, 1.0);
        l *= 1.0 - uVig * r * r * (3.0 - 2.0 * r);
    }
    if (uGrain > 0.0) l += (fract(sin(dot(gl_FragCoord.xy + uSeed, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * uGrain;
    gl_FragColor = vec4(clamp(l, 0.0, 1.0), 0.0, 0.0, 1.0);
}`

type Mesh = {
    buf: WebGLBuffer
    count: number
    tex: WebGLTexture
    w: number
    h: number
    padX: number
    baseY: number
    adv: number
}
type Glyph = { ch: string; x: number; y: number; z: number; cx: number; cy: number; id: number; r: number }

/** Wall triangles along the 0.5 contour of a coverage grid (marching squares). */
function buildWalls(g: Float32Array, w: number, h: number, ox: number, oy: number): Float32Array {
    // Normals come from a softened copy so curved walls shade smoothly.
    const b = new Float32Array(g)
    const tmp = new Float32Array(w * h)
    for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                let s = 0
                for (let k = -1; k <= 1; k++) s += b[y * w + clamp(x + k, 0, w - 1)]
                tmp[y * w + x] = s / 3
            }
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                let s = 0
                for (let k = -1; k <= 1; k++) s += tmp[clamp(y + k, 0, h - 1) * w + x]
                b[y * w + x] = s / 3
            }
    }
    const at = (x: number, y: number) => {
        x = clamp(x, 0, w - 1.001)
        y = clamp(y, 0, h - 1.001)
        const i = Math.floor(x)
        const j = Math.floor(y)
        const fx = x - i
        const fy = y - j
        const p = j * w + i
        return (
            (b[p] * (1 - fx) + b[p + 1] * fx) * (1 - fy) + (b[p + w] * (1 - fx) + b[p + w + 1] * fx) * fy
        )
    }
    const out: number[] = []
    const emit = (x0: number, y0: number, x1: number, y1: number) => {
        const n = [0, 0, 0, 0]
        const pts = [x0, y0, x1, y1]
        for (let k = 0; k < 2; k++) {
            const x = pts[k * 2]
            const y = pts[k * 2 + 1]
            let nx = at(x - 1, y) - at(x + 1, y)
            let ny = at(x, y - 1) - at(x, y + 1)
            let l = Math.hypot(nx, ny)
            if (l < 1e-6) {
                nx = y1 - y0
                ny = x0 - x1
                l = Math.hypot(nx, ny) || 1
            }
            n[k * 2] = nx / l
            n[k * 2 + 1] = ny / l
        }
        const v = (k: number, z: number) =>
            out.push(pts[k * 2] - ox, pts[k * 2 + 1] - oy, z, n[k * 2], n[k * 2 + 1], 0, 0)
        v(0, 0), v(1, 0), v(1, 1), v(0, 0), v(1, 1), v(0, 1)
    }
    for (let j = 0; j < h - 1; j++)
        for (let i = 0; i < w - 1; i++) {
            const a = g[j * w + i]
            const bb = g[j * w + i + 1]
            const c = g[(j + 1) * w + i + 1]
            const d = g[(j + 1) * w + i]
            const idx = (+(a > 0.5) << 3) | (+(bb > 0.5) << 2) | (+(c > 0.5) << 1) | +(d > 0.5)
            if (idx === 0 || idx === 15) continue
            // Texel centres sit at +0.5; crossings interpolate along each cell edge.
            const T = () => [i + 0.5 + (0.5 - a) / (bb - a), j + 0.5]
            const R = () => [i + 1.5, j + 0.5 + (0.5 - bb) / (c - bb)]
            const B = () => [i + 0.5 + (0.5 - d) / (c - d), j + 1.5]
            const L = () => [i + 0.5, j + 0.5 + (0.5 - a) / (d - a)]
            const seg = (p: number[], q: number[]) => emit(p[0], p[1], q[0], q[1])
            switch (idx) {
                case 1: case 14: seg(L(), B()); break
                case 2: case 13: seg(B(), R()); break
                case 3: case 12: seg(L(), R()); break
                case 4: case 11: seg(T(), R()); break
                case 6: case 9: seg(T(), B()); break
                case 7: case 8: seg(T(), L()); break
                case 5: seg(T(), R()); seg(L(), B()); break
                case 10: seg(T(), L()); seg(B(), R()); break
            }
        }
    return new Float32Array(out)
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function TypeQuarry(props: TypeQuarryProps) {
    props = withMovedControls(props)
    const { background = "#000000", style } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props
    const wakeRef = useRef<(dirty: boolean) => void>(() => {})

    // Pointer kept in client px; turned into a 0–1 share of the frame against
    // the box as displayed, once per frame (see Pointer in CLAUDE.md).
    const ptr = useRef({
        cx: 0,
        cy: 0,
        moved: false,
        u: 0,
        v: 0,
        over: 0,
        target: 0,
        kick: null as null | { cx: number; cy: number },
    })

    useEffect(() => {
        wakeRef.current(true)
    })

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        // The GPU draws tones off screen; the 1-bit print is made on the CPU
        // (see `dither`) and shown in the visible canvas.
        const out = canvas.getContext("2d")
        const glCanvas = document.createElement("canvas")
        const gl = glCanvas.getContext("webgl", {
            alpha: false,
            antialias: false,
            depth: true,
            powerPreference: "low-power",
        })
        if (!gl || !out) return
        const meas = document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D

        let cssW = root.offsetWidth
        let cssH = root.offsetHeight
        const ro = new ResizeObserver((es) => {
            const r = es[0].contentRect
            cssW = r.width
            cssH = r.height
            wake(true)
        })
        ro.observe(root)

        let fontsVer = 0
        const fontsBump = () => {
            fontsVer++
            wake(true)
        }
        const fonts = document.fonts
        fonts?.addEventListener?.("loadingdone", fontsBump)
        fonts?.ready?.then?.(fontsBump)

        const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)")
        let reduced = !!mq?.matches
        const onMq = () => {
            reduced = !!mq?.matches
            wake(true)
        }
        mq?.addEventListener?.("change", onMq)

        // ---- GL resources (rebuilt after a context loss) -------------------
        let prog: WebGLProgram | null = null
        const U: Record<string, WebGLUniformLocation | null> = {}
        let aP = 0
        let aN = 0
        let aF = 0
        const meshes = new Map<string, Mesh>()

        const initGL = () => {
            const sh = (type: number, src: string) => {
                const s = gl.createShader(type) as WebGLShader
                gl.shaderSource(s, src)
                gl.compileShader(s)
                return s
            }
            prog = gl.createProgram() as WebGLProgram
            gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
            gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
            gl.linkProgram(prog)
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                prog = null
                return
            }
            gl.useProgram(prog)
            for (const n of [
                "uRes", "uC", "uU", "uV", "uE", "uOrg", "uRot", "uMaskOff", "uMaskSize", "uLdir",
                "uView", "uTones", "uDepthK", "uD", "uLift", "uPy", "uFlash", "uMask",
                "uVig", "uGrain", "uSeed", "uRim",
            ])
                U[n] = gl.getUniformLocation(prog, n)
            aP = gl.getAttribLocation(prog, "aP")
            aN = gl.getAttribLocation(prog, "aN")
            aF = gl.getAttribLocation(prog, "aF")
            gl.enableVertexAttribArray(aP)
            gl.enableVertexAttribArray(aN)
            gl.enableVertexAttribArray(aF)
            gl.uniform1i(U.uMask, 0)
            gl.activeTexture(gl.TEXTURE0)
            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LEQUAL)
            meshes.clear()
            flatKey = ""
        }

        const onLost = (e: Event) => {
            e.preventDefault()
            prog = null
        }
        const onRestored = () => {
            initGL()
            wake(true)
        }
        glCanvas.addEventListener("webglcontextlost", onLost)
        glCanvas.addEventListener("webglcontextrestored", onRestored)

        // ---- Glyphs ----------------------------------------------------------
        let flatKey = ""
        let fontPx = 100
        let fontStr = fontOf(undefined, 100)
        let strokePx = 0
        let capPx = 10

        const getMesh = (ch: string): Mesh => {
            let m = meshes.get(ch)
            if (m) return m
            meas.font = fontStr
            const mt = meas.measureText(ch)
            const pad = 3 + Math.ceil(strokePx / 2)
            const L = Math.ceil(Math.max(0, mt.actualBoundingBoxLeft || 0))
            const R = Math.ceil(mt.actualBoundingBoxRight || mt.width)
            const A = Math.ceil(mt.actualBoundingBoxAscent || fontPx * 0.75)
            const Dd = Math.ceil(Math.max(0, mt.actualBoundingBoxDescent || 0))
            const w = Math.max(2, L + R + pad * 2)
            const h = Math.max(2, A + Dd + pad * 2)
            const c = document.createElement("canvas")
            c.width = w
            c.height = h
            const x = c.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D
            x.font = fontStr
            x.fillStyle = "#fff"
            x.fillText(ch, pad + L, pad + A)
            if (strokePx > 0.2) {
                x.strokeStyle = "#fff"
                x.lineWidth = strokePx
                x.lineJoin = "miter"
                x.strokeText(ch, pad + L, pad + A)
            }
            const px = x.getImageData(0, 0, w, h).data
            const cov = new Float32Array(w * h)
            for (let i = 0; i < w * h; i++) cov[i] = px[i * 4 + 3] / 255
            const walls = buildWalls(cov, w, h, pad + L, pad + A)
            // Two caps over the mask's box; the fragment shader cuts them to the glyph.
            const x0 = -(pad + L)
            const y0 = -(pad + A)
            const x1 = x0 + w
            const y1 = y0 + h
            const cap = (z: number, nz: number) => [
                x0, y0, z, 0, 0, nz, 1, x1, y0, z, 0, 0, nz, 1, x1, y1, z, 0, 0, nz, 1,
                x0, y0, z, 0, 0, nz, 1, x1, y1, z, 0, 0, nz, 1, x0, y1, z, 0, 0, nz, 1,
            ]
            const data = new Float32Array(walls.length + 84)
            data.set(walls)
            data.set(cap(1, 1), walls.length)
            data.set(cap(0, -1), walls.length + 42)
            const buf = gl.createBuffer() as WebGLBuffer
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
            const tex = gl.createTexture() as WebGLTexture
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, gl.ALPHA, gl.UNSIGNED_BYTE, c)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            m = { buf, count: data.length / STRIDE, tex, w, h, padX: pad + L, baseY: pad + A, adv: mt.width + strokePx }
            meshes.set(ch, m)
            return m
        }
        const dropMeshes = () => {
            meshes.forEach((m) => {
                gl.deleteBuffer(m.buf)
                gl.deleteTexture(m.tex)
            })
            meshes.clear()
        }

        // ---- Frame state -----------------------------------------------------
        let W = 1
        let H = 1
        let img: ImageData | null = null
        let img32 = new Uint32Array(0)
        let lum = new Uint8Array(0)
        let errA = new Float32Array(0)
        let errB = new Float32Array(0)

        // Floyd–Steinberg, raster order: the reference's print. Its sparse
        // dotted rows on the tops and the worming on the walls are this
        // diffusion; an ordered matrix gives a regular grid instead. Runs only
        // on frames that changed, so a still wall costs nothing.
        const dither = (ink: number, bg: number) => {
            let cur = errA
            let nxt = errB
            cur.fill(0)
            for (let y = 0; y < H; y++) {
                nxt.fill(0)
                const s = (H - 1 - y) * W * 4 // GL rows run bottom-up
                const o = y * W
                for (let x = 0; x < W; x++) {
                    const v = lum[s + x * 4] * (1 / 255) + cur[x + 1]
                    const q = v > 0.5 ? 1 : 0
                    img32[o + x] = q ? ink : bg
                    const e = v - q
                    cur[x + 2] += e * 0.4375
                    nxt[x] += e * 0.1875
                    nxt[x + 1] += e * 0.3125
                    nxt[x + 2] += e * 0.0625
                }
                const t = cur
                cur = nxt
                nxt = t
            }
        }
        let layoutKey = ""
        let glyphs: Glyph[] = []
        let progress = new Float32Array(0)
        let lifts = new Float32Array(0)
        let delays = new Float32Array(0)
        let maxDelay = 0
        let rowStepScr = 1
        let depthK = 0.001
        const G = { ux: 1, uy: 0, vx: 0, vy: 1, ex: 0, ey: -1, D: 10, view: [0, 0, 1] }
        let clock = 0
        let kickClock = 0
        const kicks = new Map<number, number>()
        let easeKey = ""
        let ease = makeEase(0.48, 0.2, 0.4, 0.98)
        let last = -1
        let raf = 0
        let dirty = true
        let seed = 0

        const wake = (d: boolean) => {
            if (d) dirty = true
            if (!raf) raf = requestAnimationFrame(frame)
        }
        wakeRef.current = wake

        const frame = (now: number) => {
            raf = 0
            let dt = last < 0 ? 0 : (now - last) / 1000
            last = now
            dt = clamp(dt, 0, 0.05)
            if (!prog) {
                last = -1
                return
            }

            const p = propsRef.current
            const adv: Advanced = { ...DEFAULT_ADVANCED, ...(p.advanced ?? {}) }
            const sc = clamp(num(p.scale, 100), 10, 400)
            const cell = clamp(num(p.ditherSize, DEFAULT_DITHER), 1, 8)
            const auto = p.trigger === "auto"

            let w = Math.max(1, Math.ceil(cssW / cell))
            let h = Math.max(1, Math.ceil(cssH / cell))
            const shrink = Math.sqrt(Math.max(1, (w * h) / 2400000))
            const px = cell * shrink
            w = Math.ceil(w / shrink)
            h = Math.ceil(h / shrink)
            if (canvas.width !== w || canvas.height !== h || !img) {
                canvas.width = glCanvas.width = w
                canvas.height = glCanvas.height = h
                img = out.createImageData(w, h)
                img32 = new Uint32Array(img.data.buffer)
                lum = new Uint8Array(w * h * 4)
                errA = new Float32Array(w + 2)
                errB = new Float32Array(w + 2)
                dirty = true
            }
            // One dither pixel is exactly `cell` CSS px; the root crops the spill.
            const cw = `${w * px}px`
            if (canvas.style.width !== cw) {
                canvas.style.width = cw
                canvas.style.height = `${h * px}px`
            }
            W = w
            H = h

            const rate = reduced ? 0 : Math.max(0, num(p.speed, 50)) / 50
            clock += dt * 1000 * rate
            kickClock += dt * 1000 * rate

            const m = Math.min(W, H)
            capPx = Math.max(6, (((m * adv.capHeight) / 100) * sc) / 100)
            const sPx = (capPx * Math.max(0, adv.boldness)) / 100

            const fk = `${fontOf(p.font, 100)}|${capPx.toFixed(2)}|${sPx.toFixed(2)}|${fontsVer}`
            if (fk !== flatKey) {
                flatKey = fk
                dropMeshes()
                layoutKey = ""
                meas.font = fontOf(p.font, 100)
                const asc = meas.measureText("H").actualBoundingBoxAscent || 72
                strokePx = sPx
                fontPx = (Math.max(2, capPx - strokePx) * 100) / asc
                fontStr = fontOf(p.font, fontPx)
            }

            // Projection. Row Angle and Slant set where the letter's right and
            // down axes point; their lengths are what an orthographic camera
            // gives those two directions over a vertical drop, so the plane
            // foreshortens like the reference instead of lying flat.
            const rad = Math.PI / 180
            const al = adv.rowAngle * rad
            const be = (90 - adv.slant) * rad
            const kU = Math.cos(al) * Math.sin(al)
            const kV = Math.cos(be) * Math.sin(be)
            const vLen = kU > 0 && kV > 0 ? Math.sqrt(kU / kV) : 1
            const e2 = Math.cos(2 * al) + vLen * vLen * Math.cos(2 * be)
            const eLen = e2 > 0.05 ? Math.sqrt(e2) : 1
            G.ux = Math.cos(al)
            G.uy = -Math.sin(al)
            G.vx = Math.cos(be) * vLen
            G.vy = Math.sin(be) * vLen
            // extrudeAngle is the direction walls hang; +Z (up) is its opposite.
            G.ex = -Math.cos(adv.extrudeAngle * rad) * eLen
            G.ey = -Math.sin(adv.extrudeAngle * rad) * eLen
            G.D = (capPx * Math.max(0, adv.depth)) / 100
            {
                let x = G.vx * G.ey - G.ex * G.vy
                let y = G.ex * G.uy - G.ux * G.ey
                let z = G.ux * G.vy - G.vx * G.uy
                const l = Math.hypot(x, y, z) || 1
                const sgn = z < 0 ? -1 : 1
                x = (x / l) * sgn
                y = (y / l) * sgn
                z = (z / l) * sgn
                G.view = [x, y, z]
            }
            const Cx = W / 2 + (W * adv.offsetX) / 100
            const Cy = H / 2 + (H * adv.offsetY) / 100
            const toScr = (X: number, Y: number, Z: number) => [
                Cx + X * G.ux + Y * G.vx + Z * G.ex,
                Cy + X * G.uy + Y * G.vy + Z * G.ey,
            ]

            const chars = Array.from(String(p.text ?? DEFAULT_TEXT))
            const lsPx = spacingPx(p.font?.letterSpacing, fontPx)
            const liftMax = (m * adv.lift) / 100

            const lk = `${flatKey}|${W}|${H}|${chars.join("")}|${adv.rowSpacing}|${adv.rowRise}|${adv.letterGap}|${adv.rowShift}|${adv.rowAngle}|${adv.slant}|${adv.depth}|${adv.extrudeAngle}|${adv.offsetX}|${adv.offsetY}|${lsPx}|${liftMax}`
            if (lk !== layoutKey) {
                layoutKey = lk
                glyphs = []
                kicks.clear()
                const n = chars.length
                // Rows step along the letters' down axis and, in the
                // reference, also drop a little as they come forward.
                const slide = (capPx * adv.rowSpacing) / 100
                const rise = (capPx * adv.rowRise) / 100
                const rdx = slide * G.vx + rise * G.ex
                const rdy = slide * G.vy + rise * G.ey
                // Row pitch across the rows, on screen.
                rowStepScr = Math.max(4, Math.abs(rdx * G.uy - rdy * G.ux))
                const det = G.ux * G.vy - G.vx * G.uy
                if (n > 0 && chars.some((c) => c.trim()) && Math.abs(det) > 1e-4) {
                    const gap = (capPx * adv.letterGap) / 100 + lsPx
                    const margin = capPx * 3 + G.D
                    const reachR = (capPx + G.D) * 1.6 + liftMax
                    const shift = Math.round(adv.rowShift)
                    const rows = Math.ceil((Math.hypot(W, H) / 2 + margin * 2) / rowStepScr) + 1
                    const rc = Math.round(((W / 2 - Cx) * -G.uy + (H / 2 - Cy) * G.ux) / ((rdx * -G.uy + rdy * G.ux) || 1))
                    let ext = 1
                    let id = 0
                    for (let r = rc - rows; r <= rc + rows; r++) {
                        const Y = r * slide
                        const Z = r * rise
                        const ox = Cx + r * rdx
                        const oy = Cy + r * rdy
                        // Stretch of this row (along the letters' right axis) that can reach the frame.
                        let x0 = Infinity
                        let x1 = -Infinity
                        for (const sx of [0, W])
                            for (const sy of [0, H]) {
                                const X = ((sx - ox) * G.vy - (sy - oy) * G.vx) / det
                                x0 = Math.min(x0, X)
                                x1 = Math.max(x1, X)
                            }
                        const place = (ci: number, X: number) => {
                            const ch = chars[mod(ci, n)]
                            if (!ch.trim()) return
                            const a = getMesh(ch).adv
                            const [cx, cy] = toScr(X + a / 2, Y - capPx / 2, Z + G.D)
                            if (cx < -reachR || cx > W + reachR || cy < -reachR || cy > H + reachR) return
                            id++
                            glyphs.push({ ch, x: X, y: Y, z: Z, cx, cy, id, r: rnd(id * 7 + 3) })
                            ext = Math.max(ext, Math.abs(X * G.view[0] + Y * G.view[1] + Z * G.view[2]))
                        }
                        const start = r * shift
                        let s = 0
                        let ci = start
                        while (s < x1 + margin) {
                            const a = getMesh(chars[mod(ci, n)]).adv
                            if (s + a > x0 - margin) place(ci, s)
                            s += Math.max(0.5, a + gap)
                            ci++
                        }
                        s = 0
                        ci = start - 1
                        while (s > x0 - margin) {
                            s -= Math.max(0.5, getMesh(chars[mod(ci, n)]).adv + gap)
                            if (s < x1 + margin) place(ci, s)
                            ci--
                        }
                    }
                    // Group by letter so each mesh is bound once per frame.
                    glyphs.sort((a, b) => (a.ch < b.ch ? -1 : a.ch > b.ch ? 1 : 0))
                    depthK = 1 / (ext + 4 * (G.D + liftMax + capPx))
                }
                progress = new Float32Array(glyphs.length)
                lifts = new Float32Array(glyphs.length)
                delays = new Float32Array(glyphs.length)
                dirty = true
            }

            // ---- Timing --------------------------------------------------------
            const flipMs = Math.max(50, adv.flipMs)
            const stg = Math.max(0, num(p.stagger, 150))
            const ek = `${adv.easeX1}|${adv.easeY1}|${adv.easeX2}|${adv.easeY2}`
            if (ek !== easeKey) {
                easeKey = ek
                ease = makeEase(clamp(adv.easeX1 / 100, 0, 1), adv.easeY1 / 100, clamp(adv.easeX2 / 100, 0, 1), adv.easeY2 / 100)
            }

            let tc = -1
            let restMs = 0
            if (auto) {
                restMs = Math.max(0, num(p.rest, 1330))
                maxDelay = 0
                for (let i = 0; i < glyphs.length; i++) {
                    const g = glyphs[i]
                    const d = Math.max(0, (clamp(g.cy, 0, H) / Math.max(1, rowStepScr)) * stg + (g.r - 0.5) * 2 * adv.jitter)
                    delays[i] = d
                    if (d > maxDelay) maxDelay = d
                }
                tc = clock % Math.max(1, restMs + maxDelay + flipMs + Math.max(0, adv.endRest))
            }

            // Pointer, as a share of the frame as displayed.
            const P = ptr.current
            if (P.moved || P.kick) {
                const r = root.getBoundingClientRect()
                const rw = r.width || 1
                const rh = r.height || 1
                P.u = (P.cx - r.left) / rw
                P.v = (P.cy - r.top) / rh
                P.moved = false
                dirty = true
                if (P.kick && rate > 0) {
                    const kx = ((P.kick.cx - r.left) / rw) * (cssW / px)
                    const ky = ((P.kick.cy - r.top) / rh) * (cssH / px)
                    const R = Math.max(1, (m * clamp(num(p.reach, 45), 0, 200)) / 100)
                    for (const g of glyphs) {
                        const d = Math.hypot(g.cx - kx, g.cy - ky)
                        if (d < R && !kicks.has(g.id))
                            kicks.set(
                                g.id,
                                kickClock + Math.max(0, (d / Math.max(1, rowStepScr)) * stg + (g.r - 0.5) * 2 * adv.jitter)
                            )
                    }
                }
                P.kick = null
            }
            const overPrev = P.over
            P.over += (P.target - P.over) * (1 - Math.exp(-dt * 14))
            if (Math.abs(P.target - P.over) < 0.002) P.over = P.target
            const hoverAmt = reduced ? 0 : Math.max(0, adv.hover) / 50
            const hovering = hoverAmt > 0 && P.over > 0.001
            if (P.over !== overPrev && hoverAmt > 0) dirty = true

            const pX = P.u * (cssW / px)
            const pY = P.v * (cssH / px)
            const hoverR = Math.max(1, (m * adv.hoverRadius) / 100)
            const hoverLiftPx = (m * adv.hoverLift) / 100
            let active = 0
            let pending = kicks.size > 0
            for (let i = 0; i < glyphs.length; i++) {
                const g = glyphs[i]
                let pr = -1
                const ks = kicks.get(g.id)
                if (ks !== undefined) {
                    const kp = (kickClock - ks) / flipMs
                    if (kp >= 1) kicks.delete(g.id)
                    else if (kp > 0) pr = kp
                }
                if (pr < 0 && auto) {
                    const pc = (tc - restMs - delays[i]) / flipMs
                    if (pc > 0 && pc < 1) pr = pc
                }
                if (pr > 0) active++
                progress[i] = pr
                let hl = 0
                if (hovering) {
                    const fo = Math.max(0, 1 - Math.hypot(g.cx - pX, g.cy - pY) / hoverR)
                    hl = hoverLiftPx * hoverAmt * P.over * fo * fo
                }
                lifts[i] = hl
            }
            if (pending && kicks.size === 0) dirty = true

            const grain = Math.max(0, adv.grain)
            const animating = active > 0 || grain > 0
            if (animating) dirty = true

            if (dirty) {
                dirty = false
                gl.viewport(0, 0, W, H)
                gl.clearColor(0, 0, 0, 1)
                gl.clearDepth(1)
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
                gl.useProgram(prog)
                gl.uniform2f(U.uRes, W, H)
                gl.uniform2f(U.uC, Cx, Cy)
                gl.uniform2f(U.uU, G.ux, G.uy)
                gl.uniform2f(U.uV, G.vx, G.vy)
                gl.uniform2f(U.uE, G.ex, G.ey)
                gl.uniform3f(U.uView, G.view[0], G.view[1], G.view[2])
                gl.uniform1f(U.uDepthK, depthK)
                gl.uniform1f(U.uD, G.D)
                gl.uniform1f(U.uPy, -capPx / 2)
                gl.uniform2f(U.uLdir, Math.cos(adv.lightAngle * rad), Math.sin(adv.lightAngle * rad))
                gl.uniform3f(
                    U.uTones,
                    clamp(adv.faceTone / 100, 0, 1),
                    clamp(adv.litTone / 100, 0, 1),
                    clamp(adv.shadeTone / 100, 0, 1)
                )
                gl.uniform1f(U.uRim, Math.max(0, adv.lightWidth) / px)
                gl.uniform1f(U.uVig, clamp(adv.vignette / 100, 0, 1))
                gl.uniform1f(U.uGrain, (grain / 100) * 0.6)
                seed = (seed + 17.31) % 1000
                gl.uniform1f(U.uSeed, seed)

                const flipRad = adv.flipDeg * rad
                const flashAmt = clamp(adv.flash / 100, 0, 1)
                let bound = ""
                for (let i = 0; i < glyphs.length; i++) {
                    const g = glyphs[i]
                    const mesh = getMesh(g.ch)
                    if (g.ch !== bound) {
                        bound = g.ch
                        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf)
                        gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, STRIDE * 4, 0)
                        gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, STRIDE * 4, 12)
                        gl.vertexAttribPointer(aF, 1, gl.FLOAT, false, STRIDE * 4, 24)
                        gl.bindTexture(gl.TEXTURE_2D, mesh.tex)
                        gl.uniform2f(U.uMaskOff, mesh.padX, mesh.baseY)
                        gl.uniform2f(U.uMaskSize, mesh.w, mesh.h)
                    }
                    const pr = progress[i]
                    let c = 1
                    let s = 0
                    let lift = lifts[i]
                    let fl = 0
                    if (pr > 0) {
                        const e = ease(pr)
                        c = Math.cos(flipRad * e)
                        s = Math.sin(flipRad * e)
                        lift += liftMax * Math.sin(Math.PI * clamp(e, 0, 1))
                        fl = flashAmt * Math.abs(s)
                    }
                    gl.uniform3f(U.uOrg, g.x, g.y, g.z)
                    gl.uniform2f(U.uRot, c, s)
                    gl.uniform1f(U.uLift, lift)
                    gl.uniform1f(U.uFlash, fl)
                    gl.drawArrays(gl.TRIANGLES, 0, mesh.count)
                }
                gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, lum)
                dither(
                    pack(parseColor(p.baseColor ?? "#EEEEEE", [238, 238, 238, 255])),
                    pack(parseColor(p.background ?? "#000000", [0, 0, 0, 255]))
                )
                out.putImageData(img as ImageData, 0, 0)
            }

            const easing = hoverAmt > 0 && P.over !== P.target
            if (animating || easing || kicks.size > 0 || (auto && rate > 0)) raf = requestAnimationFrame(frame)
            else last = -1
        }

        initGL()
        wake(true)

        return () => {
            cancelAnimationFrame(raf)
            raf = -1 // never re-armed after unmount
            wakeRef.current = () => {}
            ro.disconnect()
            fonts?.removeEventListener?.("loadingdone", fontsBump)
            mq?.removeEventListener?.("change", onMq)
            glCanvas.removeEventListener("webglcontextlost", onLost)
            glCanvas.removeEventListener("webglcontextrestored", onRestored)
            dropMeshes()
        }
    }, [])

    const onMove = (e: React.PointerEvent) => {
        const P = ptr.current
        P.cx = e.clientX
        P.cy = e.clientY
        P.moved = true
        P.target = e.pointerType === "touch" && e.buttons === 0 ? 0 : 1
        wakeRef.current(false)
    }
    const onLeave = () => {
        ptr.current.target = 0
        wakeRef.current(false)
    }
    const onDown = (e: React.PointerEvent) => {
        const P = ptr.current
        P.cx = e.clientX
        P.cy = e.clientY
        P.moved = true
        P.target = 1
        P.kick = { cx: e.clientX, cy: e.clientY }
        wakeRef.current(false)
    }
    const onUp = (e: React.PointerEvent) => {
        if (e.pointerType === "touch") onLeave()
    }

    return (
        <div
            ref={rootRef}
            onPointerMove={onMove}
            onPointerEnter={onMove}
            onPointerLeave={onLeave}
            onPointerDown={onDown}
            onPointerUp={onUp}
            onPointerCancel={onLeave}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                ...style,
                overflow: "hidden",
                background,
                cursor: "pointer",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    display: "block",
                    imageRendering: "pixelated",
                }}
            />
        </div>
    )
}

// Control order arranged in the builder.
