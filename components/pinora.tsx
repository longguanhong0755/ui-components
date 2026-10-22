"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef, useState } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    hover: 100,
    grain: 0,
    vignette: 0,
    seed: 7,
    spinMin: 40,
    spinMax: 160,
    driftRate: 29,
    depthRange: 100,
    scaleJitter: 18,
    fov: 35,
    voidX: 65,
    voidY: 28,
    voidW: 16,
    voidH: 24,
    edgeMargin: 12,
    metalColor: "#E4DCDD",
    specColor: "#FFD8DA",
    gloss: 60,
    specular: 55,
    shadow: 28,
    rimLight: 25,
    lightX: -55,
    lightY: 70,
    glow: 4,
    glowOpacity: 40,
    hoverRadius: 16,
    hoverSpin: 226,
    hoverPush: 86,
    pressSpin: 150,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
const GROUP_FALLBACKS: Record<string, any> = { advanced: ADVANCED_DEFAULTS }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

const MAX_PINS = 150
const MAX_COLORS = 8
const INST = 16
const RADIAL = 32
const DEG = Math.PI / 180

type RGB = [number, number, number]

function parseColor(input: any, fallback: RGB): RGB {
    if (typeof input !== "string") return fallback
    let s = input.trim()
    const v = s.match(/var\([^,]+,\s*(.+)\)\s*$/)
    if (v) s = v[1].trim()
    const hex = s.match(/^#([0-9a-f]{3,8})$/i)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        const n = parseInt(h.slice(0, 6), 16)
        if (isNaN(n)) return fallback
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }
    const rgb = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
    if (rgb) return [+rgb[1] / 255, +rgb[2] / 255, +rgb[3] / 255]
    return fallback
}

function cssRgba(input: any, alpha: number, fallback: RGB) {
    const c = parseColor(input, fallback)
    return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${alpha})`
}

function mulberry32(a: number) {
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function smoothstep(e0: number, e1: number, x: number) {
    const d = e1 - e0
    const t = Math.min(1, Math.max(0, d === 0 ? 0 : (x - e0) / d))
    return t * t * (3 - 2 * t)
}

// Pin profile: [radius, distance from the cap top, ambient occlusion], in units of pin length.
const PLASTIC_PROFILE: number[][] = [
    [0, 0, 1],
    [0.13, 0, 1],
    [0.152, 0.006, 1],
    [0.162, 0.02, 1],
    [0.164, 0.04, 1],
    [0.16, 0.06, 0.95],
    [0.148, 0.072, 0.85],
    [0.12, 0.078, 0.7],
    [0.085, 0.085, 0.55],
    [0.072, 0.1, 0.55],
    [0.078, 0.13, 0.8],
    [0.092, 0.15, 0.95],
    [0.088, 0.25, 1],
    [0.082, 0.33, 1],
    [0.088, 0.42, 0.95],
    [0.098, 0.46, 0.75],
    [0.12, 0.475, 0.8],
    [0.132, 0.485, 0.95],
    [0.135, 0.5, 1],
    [0.13, 0.515, 0.9],
    [0.11, 0.525, 0.75],
    [0.03, 0.528, 0.6],
]
const METAL_PROFILE: number[][] = [
    [0.013, 0.528, 0.7],
    [0.012, 0.85, 1],
    [0.006, 0.92, 1],
    [0, 0.96, 1],
]
const PIN_CENTER = 0.36

function buildPinGeometry(): Float32Array {
    const pts = [...PLASTIC_PROFILE, ...METAL_PROFILE]
    const metalStart = PLASTIC_PROFILE.length - 1
    const segs = pts.length - 1
    // segment normals in the (radial, y) plane; model y = center - s
    const segN: number[][] = []
    for (let k = 0; k < segs; k++) {
        const dr = pts[k + 1][0] - pts[k][0]
        const dy = -(pts[k + 1][1] - pts[k][1])
        const l = Math.hypot(dr, dy) || 1
        segN.push([-dy / l, dr / l])
    }
    const blend = (a: number[], b: number[]) => {
        if (a[0] * b[0] + a[1] * b[1] < 0.7) return null
        const x = a[0] + b[0]
        const y = a[1] + b[1]
        const l = Math.hypot(x, y) || 1
        return [x / l, y / l]
    }
    const out: number[] = []
    for (let k = 0; k < segs; k++) {
        const p0 = pts[k]
        const p1 = pts[k + 1]
        if (p0[0] === 0 && p1[0] === 0) continue
        const n = segN[k]
        const n0 = (k > 0 && blend(segN[k - 1], n)) || n
        const n1 = (k < segs - 1 && blend(n, segN[k + 1])) || n
        const mat = k >= metalStart ? 1 : 0
        const y0 = PIN_CENTER - p0[1]
        const y1 = PIN_CENTER - p1[1]
        for (let j = 0; j < RADIAL; j++) {
            const a0 = (j / RADIAL) * Math.PI * 2
            const a1 = ((j + 1) / RADIAL) * Math.PI * 2
            const v = (r: number, y: number, nn: number[], a: number, ao: number) => {
                const c = Math.cos(a)
                const s = Math.sin(a)
                out.push(r * c, y, r * s, nn[0] * c, nn[1], nn[0] * s, mat, ao)
            }
            v(p0[0], y0, n0, a0, p0[2])
            v(p1[0], y1, n1, a0, p1[2])
            v(p1[0], y1, n1, a1, p1[2])
            v(p0[0], y0, n0, a0, p0[2])
            v(p1[0], y1, n1, a1, p1[2])
            v(p0[0], y0, n0, a1, p0[2])
        }
    }
    return new Float32Array(out)
}

const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in float aMat;
layout(location=7) in float aAo;
layout(location=3) in vec3 iR0;
layout(location=4) in vec3 iR1;
layout(location=5) in vec3 iR2;
layout(location=6) in vec4 iT;
layout(location=8) in vec3 iC;
uniform mat4 uProj;
uniform float uCamZ;
out vec3 vN;
out vec3 vW;
out float vMat;
out float vAo;
out vec3 vCol;
void main() {
    vCol = iC;
    mat3 R = mat3(iR0, iR1, iR2);
    vec3 p = R * (aPos * iT.w) + iT.xyz;
    vN = R * aNor;
    vW = p;
    vMat = aMat;
    vAo = aAo;
    gl_Position = uProj * vec4(p - vec3(0.0, 0.0, uCamZ), 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
in vec3 vN;
in vec3 vW;
in float vMat;
in float vAo;
in vec3 vCol;
uniform vec3 uCam;
uniform vec3 uMetal;
uniform vec3 uSpecColor;
uniform vec3 uLight;
uniform float uGloss;
uniform float uSpec;
uniform float uShadow;
uniform float uRim;
out vec4 o;
void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(uCam - vW);
    vec3 L = normalize(uLight);
    vec3 H = normalize(L + V);
    float ndl = max(dot(N, L), 0.0);
    float ndv = max(dot(N, V), 0.0);
    float hemi = 0.5 + 0.5 * N.y;
    float fill = max(dot(N, normalize(vec3(0.7, -0.2, 0.6))), 0.0);
    float nh = max(dot(N, H), 0.0);
    float spec = pow(nh, max(uGloss, 1.0));
    float fres = pow(1.0 - ndv, 3.0);
    vec3 plastic = vCol * (uShadow + (1.0 - uShadow) * (0.32 * hemi + 0.78 * ndl + 0.18 * fill)) * vAo;
    plastic += uSpecColor * spec * uSpec;
    plastic += mix(vCol, vec3(1.0), 0.35) * fres * uRim;
    vec3 R = reflect(-V, N);
    float sky = smoothstep(-0.3, 0.7, R.y);
    vec3 env = mix(vCol * 0.55, vec3(1.0), sky);
    vec3 metal = uMetal * (0.25 + 0.55 * env + 0.35 * ndl) * vAo + vec3(1.0) * pow(nh, max(uGloss * 2.0, 1.0)) * 1.2;
    vec3 col = mix(plastic, metal, step(0.5, vMat));
    o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const s = gl.createShader(type)
    if (!s) throw new Error("shader alloc failed")
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s)
        gl.deleteShader(s)
        throw new Error("shader compile: " + log)
    }
    return s
}

function createProgram(gl: WebGL2RenderingContext, vs: string, fs: string) {
    const p = gl.createProgram()
    if (!p) throw new Error("program alloc failed")
    const v = compile(gl, gl.VERTEX_SHADER, vs)
    const f = compile(gl, gl.FRAGMENT_SHADER, fs)
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("program link: " + gl.getProgramInfoLog(p))
    gl.deleteShader(v)
    gl.deleteShader(f)
    return p
}

type Pin = {
    u: number
    v: number
    zl: number
    s: number
    axis: number[]
    q0: number[]
    rt: number
    dir: number
    angle: number
    f: number
    px: number
    py: number
}

function makePins(count: number, seed: number, aspect: number, adv: any): Pin[] {
    const rnd = mulberry32(seed * 9973 + count * 31 + 1)
    const m = adv.edgeMargin / 100
    const span = 1 + 2 * m
    const vx = adv.voidX / 100
    const vy = adv.voidY / 100
    const vw = Math.max(0.001, adv.voidW / 100)
    const vh = Math.max(0.001, adv.voidH / 100)
    const inVoid = (u: number, v: number) => ((u - vx) / vw) ** 2 + ((v - vy) / vh) ** 2 < 1
    const need = count * 1.25
    const cols = Math.max(1, Math.round(Math.sqrt((need * aspect) / 1)))
    const rows = Math.max(1, Math.ceil(need / cols))
    const cells: number[][] = []
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            cells.push([-m + ((c + rnd()) / cols) * span, -m + ((r + rnd()) / rows) * span])
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1))
        const t = cells[i]
        cells[i] = cells[j]
        cells[j] = t
    }
    const spots = cells.filter((c) => !inVoid(c[0], c[1])).slice(0, count)
    let tries = 0
    while (spots.length < count && tries < 5000) {
        tries++
        const u = -m + rnd() * span
        const v = -m + rnd() * span
        if (!inVoid(u, v)) spots.push([u, v])
    }
    const layers = [-0.55, 0, 0.4]
    return spots.map(([u, v]) => {
        const zl = layers[Math.floor(rnd() * 3) % 3] + (rnd() - 0.5) * 0.3
        const s = 1 + (rnd() * 2 - 1)
        const az = rnd() * 2 - 1
        const ap = rnd() * Math.PI * 2
        const ar = Math.sqrt(1 - az * az)
        const u1 = rnd()
        const u2 = rnd()
        const u3 = rnd()
        const q0 = [
            Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2),
            Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2),
            Math.sqrt(u1) * Math.sin(2 * Math.PI * u3),
            Math.sqrt(u1) * Math.cos(2 * Math.PI * u3),
        ]
        return {
            u,
            v,
            zl,
            s,
            axis: [ar * Math.cos(ap), ar * Math.sin(ap), az],
            q0,
            rt: rnd(),
            dir: rnd() < 0.5 ? -1 : 1,
            angle: 0,
            f: 0,
            px: 0,
            py: 0,
        }
    })
}

export interface FieldAboutGlossyProps {
    background?: string
    multicolor?: boolean
    color?: string
    colors?: string[]
    speed?: number
    size?: number
    count?: number
    drift?: number
    hover?: number
    advanced?: {
        grain?: number
        vignette?: number
        seed?: number
        spinMin?: number
        spinMax?: number
        driftRate?: number
        depthRange?: number
        scaleJitter?: number
        fov?: number
        voidX?: number
        voidY?: number
        voidW?: number
        voidH?: number
        edgeMargin?: number
        metalColor?: string
        specColor?: string
        gloss?: number
        specular?: number
        shadow?: number
        rimLight?: number
        lightX?: number
        lightY?: number
        glow?: number
        glowOpacity?: number
        hoverRadius?: number
        hoverSpin?: number
        hoverPush?: number
        pressSpin?: number
    }
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function FieldAboutGlossy(props: FieldAboutGlossyProps) {
    props = withMovedControls(props)
    const {
        background = "#000000",
        color = "#D9333F",
        multicolor = true,
        colors = ["#D9333F","#F2B33D","#2F6FDB","#2BA36B","#F2F0EA"],
        speed = 50,
        size = 160,
        count = 111,
        drift = 142,
        style,
    } = props
    const adv = { ...ADVANCED_DEFAULTS, ...(props.advanced ?? {}) }

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props
    const pointer = useRef({ x: 0.5, y: 0.5, over: false, down: false })
    const [grainUrl, setGrainUrl] = useState("")

    useEffect(() => {
        const c = document.createElement("canvas")
        c.width = 160
        c.height = 160
        const ctx = c.getContext("2d")
        if (!ctx) return
        const img = ctx.createImageData(160, 160)
        for (let i = 0; i < img.data.length; i += 4) {
            const n = Math.random() * 255
            img.data[i] = n
            img.data[i + 1] = n
            img.data[i + 2] = n
            img.data[i + 3] = 255
        }
        ctx.putImageData(img, 0, 0)
        setGrainUrl(c.toDataURL())
    }, [])

    useEffect(() => {
        const up = () => {
            pointer.current.down = false
        }
        window.addEventListener("pointerup", up)
        window.addEventListener("pointercancel", up)
        return () => {
            window.removeEventListener("pointerup", up)
            window.removeEventListener("pointercancel", up)
        }
    }, [])

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: true })
        if (!gl) return

        const prog = createProgram(gl, VERT, FRAG)
        const uni = (name: string) => {
            const l = gl.getUniformLocation(prog, name)
            if (l === null) throw new Error("missing uniform " + name)
            return l
        }
        const U = {
            proj: uni("uProj"),
            camZ: uni("uCamZ"),
            cam: uni("uCam"),
            metal: uni("uMetal"),
            specColor: uni("uSpecColor"),
            light: uni("uLight"),
            gloss: uni("uGloss"),
            spec: uni("uSpec"),
            shadow: uni("uShadow"),
            rim: uni("uRim"),
        }

        const geo = buildPinGeometry()
        const vertCount = geo.length / 8
        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        const vbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.bufferData(gl.ARRAY_BUFFER, geo, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0)
        gl.enableVertexAttribArray(1)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12)
        gl.enableVertexAttribArray(2)
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 24)
        gl.enableVertexAttribArray(7)
        gl.vertexAttribPointer(7, 1, gl.FLOAT, false, 32, 28)

        const inst = new Float32Array(MAX_PINS * INST)
        const palette = new Float32Array(MAX_COLORS * 3)
        const ibo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, ibo)
        gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW)
        const instAttr = (loc: number, sizeN: number, off: number) => {
            gl.enableVertexAttribArray(loc)
            gl.vertexAttribPointer(loc, sizeN, gl.FLOAT, false, INST * 4, off)
            gl.vertexAttribDivisor(loc, 1)
        }
        instAttr(3, 3, 0)
        instAttr(4, 3, 12)
        instAttr(5, 3, 24)
        instAttr(6, 4, 36)
        instAttr(8, 3, 52)
        gl.bindVertexArray(null)
        gl.enable(gl.DEPTH_TEST)
        gl.disable(gl.CULL_FACE)

        const sizeRef = { w: root.offsetWidth, h: root.offsetHeight }
        const ro = new ResizeObserver(() => {
            sizeRef.w = root.offsetWidth
            sizeRef.h = root.offsetHeight
        })
        ro.observe(root)

        const reduced =
            typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        let pins: Pin[] = []
        let pinKey = ""
        let offU = 0
        let offV = 0
        let press = 0
        let spx = 0.5
        let spy = 0.5
        let sOver = 0
        let last = 0
        let raf = 0
        const proj = new Float32Array(16)

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const p = propsRef.current
            const a = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const dt = last === 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const W = sizeRef.w
            const H = sizeRef.h
            if (!W || !H) return
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const cw = Math.max(1, Math.round(W * dpr))
            const ch = Math.max(1, Math.round(H * dpr))
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw
                canvas.height = ch
            }
            const aspect = W / H

            const n = Math.max(1, Math.min(MAX_PINS, Math.round(p.count ?? 64)))
            const key = [n, a.seed, Math.round(aspect * 4), a.voidX, a.voidY, a.voidW, a.voidH, a.edgeMargin, a.scaleJitter].join("|")
            if (key !== pinKey) {
                pinKey = key
                pins = makePins(n, a.seed, aspect, a)
                const jit = a.scaleJitter / 100
                for (const pin of pins) pin.s = 1 + (pin.s - 1) * jit
            }

            const timeScale = reduced ? 0 : Math.max(0, Math.min(100, p.speed ?? 50)) / 50
            const hoverAmt = reduced ? 0 : Math.max(0, a.hover) / 50
            const da = (p.drift ?? 142) * DEG
            const rate = a.driftRate / 1200
            offU += Math.cos(da) * rate * dt * timeScale
            offV += Math.sin(da) * rate * aspect * dt * timeScale

            const m = a.edgeMargin / 100
            const span = 1 + 2 * m
            const wrap = (x: number) => ((((x + m) % span) + span) % span) - m

            const pt = pointer.current
            // Smoothed pointer: position glides, presence fades in and out, so nothing reacts to raw events.
            if (pt.over && sOver < 0.01) {
                spx = pt.x
                spy = pt.y
            } else {
                const kPos = 1 - Math.exp(-dt / 0.09)
                spx += (pt.x - spx) * kPos
                spy += (pt.y - spy) * kPos
            }
            sOver += ((pt.over ? 1 : 0) - sOver) * (1 - Math.exp(-dt / (pt.over ? 0.25 : 0.4)))
            press += ((pt.down ? 1 : 0) - press) * (1 - Math.exp(-dt / 0.18))
            const kHover = 1 - Math.exp(-dt / 0.22)
            const kPush = 1 - Math.exp(-dt / 0.18)
            const R = Math.max(0.01, a.hoverRadius / 100)
            // Gaussian push field: zero at the pointer, peaks near 0.42 R, fades past R. Continuous everywhere.
            const pushK = ((a.hoverPush / W) * hoverAmt * sOver) / (R * 0.254)
            const pushS = 1 / (R * R * 0.35)

            const fovR = Math.max(10, Math.min(90, a.fov)) * DEG
            const camZ = 1 / Math.tan(fovR / 2)
            const depth = a.depthRange / 100
            const lenWorld = ((p.size ?? 160) * 2) / H

            // Palette: one colour for every pin, or the Colors list dealt out across the field.
            const list: any[] =
                p.multicolor && Array.isArray(p.colors) && p.colors.length > 0
                    ? p.colors.slice(0, MAX_COLORS)
                    : [p.color]
            const nCol = list.length
            for (let c = 0; c < nCol; c++) {
                const rgb = parseColor(list[c], [0.85, 0.2, 0.25])
                palette[c * 3] = rgb[0]
                palette[c * 3 + 1] = rgb[1]
                palette[c * 3 + 2] = rgb[2]
            }

            for (let i = 0; i < pins.length; i++) {
                const pin = pins[i]
                let u = wrap(pin.u + offU)
                let v = wrap(pin.v + offV)
                const dx = u - spx
                const dy = (v - spy) / aspect
                const dist = Math.hypot(dx, dy)
                const target = smoothstep(R, 0, dist) * hoverAmt * sOver
                pin.f += (target - pin.f) * kHover
                const amt = pushK * Math.exp(-dist * dist * pushS)
                pin.px += (dx * amt - pin.px) * kPush
                pin.py += (dy * amt * aspect - pin.py) * kPush
                u += pin.px
                v += pin.py
                const spin = (a.spinMin + (a.spinMax - a.spinMin) * pin.rt) * DEG * pin.dir
                pin.angle +=
                    spin * dt * timeScale * (1 + (pin.f * a.hoverSpin) / 100 + (press * pin.f * a.pressSpin) / 100)

                const h = pin.angle / 2
                const sh = Math.sin(h)
                const ax = pin.axis[0] * sh
                const ay = pin.axis[1] * sh
                const az = pin.axis[2] * sh
                const aw = Math.cos(h)
                const [bx, by, bz, bw] = pin.q0
                const qw = aw * bw - ax * bx - ay * by - az * bz
                const qx = aw * bx + ax * bw + ay * bz - az * by
                const qy = aw * by - ax * bz + ay * bw + az * bx
                const qz = aw * bz + ax * by - ay * bx + az * bw

                const z = pin.zl * depth
                const k = (camZ - z) / camZ
                const o = i * INST
                inst[o] = 1 - 2 * (qy * qy + qz * qz)
                inst[o + 1] = 2 * (qx * qy + qz * qw)
                inst[o + 2] = 2 * (qx * qz - qy * qw)
                inst[o + 3] = 2 * (qx * qy - qz * qw)
                inst[o + 4] = 1 - 2 * (qx * qx + qz * qz)
                inst[o + 5] = 2 * (qy * qz + qx * qw)
                inst[o + 6] = 2 * (qx * qz + qy * qw)
                inst[o + 7] = 2 * (qy * qz - qx * qw)
                inst[o + 8] = 1 - 2 * (qx * qx + qy * qy)
                inst[o + 9] = (u * 2 - 1) * aspect * k
                inst[o + 10] = (1 - 2 * v) * k
                inst[o + 11] = z
                inst[o + 12] = lenWorld * pin.s
                const ci = (i % nCol) * 3
                inst[o + 13] = palette[ci]
                inst[o + 14] = palette[ci + 1]
                inst[o + 15] = palette[ci + 2]
            }

            const near = 0.1
            const far = 50
            const f = 1 / Math.tan(fovR / 2)
            const nf = 1 / (near - far)
            proj.fill(0)
            proj[0] = f / aspect
            proj[5] = f
            proj[10] = (far + near) * nf
            proj[11] = -1
            proj[14] = 2 * far * near * nf

            gl.viewport(0, 0, cw, ch)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.useProgram(prog)
            gl.uniformMatrix4fv(U.proj, false, proj)
            gl.uniform1f(U.camZ, camZ)
            gl.uniform3f(U.cam, 0, 0, camZ)
            const met = parseColor(a.metalColor, [0.89, 0.86, 0.87])
            gl.uniform3f(U.metal, met[0], met[1], met[2])
            const sc = parseColor(a.specColor, [1, 0.85, 0.85])
            gl.uniform3f(U.specColor, sc[0], sc[1], sc[2])
            gl.uniform3f(U.light, a.lightX / 100, a.lightY / 100, 0.6)
            gl.uniform1f(U.gloss, Math.max(1, a.gloss))
            gl.uniform1f(U.spec, a.specular / 100)
            gl.uniform1f(U.shadow, a.shadow / 100)
            gl.uniform1f(U.rim, a.rimLight / 100)
            gl.bindBuffer(gl.ARRAY_BUFFER, ibo)
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst.subarray(0, pins.length * INST))
            gl.bindVertexArray(vao)
            gl.drawArraysInstanced(gl.TRIANGLES, 0, vertCount, pins.length)
            gl.bindVertexArray(null)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            gl.deleteBuffer(vbo)
            gl.deleteBuffer(ibo)
            gl.deleteVertexArray(vao)
            gl.deleteProgram(prog)
        }
    }, [])

    const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const root = rootRef.current
        if (!root || !root.offsetWidth || !root.offsetHeight) return
        pointer.current.x = e.nativeEvent.offsetX / root.offsetWidth
        pointer.current.y = e.nativeEvent.offsetY / root.offsetHeight
        pointer.current.over = true
    }

    const glowFilter =
        adv.glow > 0 && adv.glowOpacity > 0
            ? `drop-shadow(0 0 ${adv.glow}px ${cssRgba(
                  multicolor && Array.isArray(colors) && colors.length > 0 ? colors[0] : color,
                  adv.glowOpacity / 100,
                  [0.85, 0.2, 0.25]
              )})`
            : "none"

    return (
        <div
            ref={rootRef}
            onPointerEnter={onMove}
            onPointerMove={onMove}
            onPointerLeave={() => {
                pointer.current.over = false
            }}
            onPointerDown={(e) => {
                onMove(e)
                pointer.current.down = true
            }}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                ...style,
                overflow: "hidden",
                isolation: "isolate",
                background,
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
                    filter: glowFilter,
                }}
            />
            {adv.vignette > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.85) 100%)",
                        opacity: adv.vignette / 100,
                    }}
                />
            )}
            {adv.grain > 0 && grainUrl && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        backgroundImage: `url(${grainUrl})`,
                        backgroundRepeat: "repeat",
                        mixBlendMode: "overlay",
                        opacity: (adv.grain / 100) * 0.6,
                    }}
                />
            )}
        </div>
    )
}

// Control order arranged in the builder.
