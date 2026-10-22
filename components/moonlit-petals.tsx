"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    seed: 7,
    flowers: 11000,
    flowerSize: 6,
    clumpSize: 11,
    twigs: 30,
    crownReach: 100,
    branchColor: "#3E3539",
    highlight: 100,
    dofBlur: 3,
    petalColor: "#EDE6EA",
    petalSize: 100,
    fallSpeed: 100,
    nearShare: 16,
    drift: -5,
    wobble: 100,
    swayAmp: 8,
    swayPeriod: 3000,
    bokehFirst: 2330,
    bokehEvery: 6000,
    bokehSize: 8,
    bokehOpacity: 85,
    haloSize: 100,
    hazeColor: "#2F2A2C",
    hazeOpacity: 40,
    grain: 6,
    vignette: 35,
    hover: 50,
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

type Pt = { x: number; y: number }
type Flower = { x: number; y: number; r: number; L: number; rot: number }
type Group = { pts: Pt[]; flowers: Flower[]; anchor: Pt; tip: Pt; back: boolean; blur: boolean }
type Geo = { branches: { pts: Pt[]; w: number }[]; groups: Group[]; core: Flower[]; coreBlur: Flower[] }

const TAU = Math.PI * 2
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const clamp01 = (v: number) => clamp(v, 0, 1)
const smooth = (a: number, b: number, x: number) => {
    const t = clamp01((x - a) / (b - a || 1))
    return t * t * (3 - 2 * t)
}
const num = (v: any, d: number) => (typeof v === "number" && isFinite(v) ? v : d)

function mulberry32(seed: number) {
    let a = (seed | 0) + 0x6d2b79f5
    return () => {
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
function hash2(i: number, j: number, s: number) {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 982451653)) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function vnoise(x: number, y: number, s: number) {
    const i = Math.floor(x)
    const j = Math.floor(y)
    const fx = x - i
    const fy = y - j
    const u = fx * fx * (3 - 2 * fx)
    const v = fy * fy * (3 - 2 * fy)
    const a = hash2(i, j, s)
    const b = hash2(i + 1, j, s)
    const c = hash2(i, j + 1, s)
    const d = hash2(i + 1, j + 1, s)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function parseColor(c: any, fb: number[]): number[] {
    if (typeof c !== "string") return fb
    const s = c.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((ch) => ch + ch)
                .join("")
        if (h.length >= 6) {
            const v = parseInt(h.slice(0, 6), 16)
            if (!isNaN(v)) return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
        }
        return fb
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2])) return [p[0], p[1], p[2]]
    }
    return fb
}
const rgbStr = (c: number[], a = 1) =>
    `rgba(${Math.round(clamp(c[0], 0, 255))},${Math.round(clamp(c[1], 0, 255))},${Math.round(clamp(c[2], 0, 255))},${a})`
const mix = (a: number[], b: number[], k: number) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]

function quad(a: Pt, c: Pt, b: Pt, t: number): Pt {
    const m = 1 - t
    return { x: m * m * a.x + 2 * m * t * c.x + t * t * b.x, y: m * m * a.y + 2 * m * t * c.y + t * t * b.y }
}
function quadAngle(a: Pt, c: Pt, b: Pt, t: number) {
    const dx = 2 * (1 - t) * (c.x - a.x) + 2 * t * (b.x - c.x)
    const dy = 2 * (1 - t) * (c.y - a.y) + 2 * t * (b.y - c.y)
    return Math.atan2(dy, dx)
}

// Reference space is 736×414. Limbs: start, control, end, width.
const LIMBS = [
    [-20, 10, 200, -30, 430, 60, 5],
    [-20, 60, 230, 40, 470, 185, 6],
    [60, -20, 250, 20, 370, 140, 4],
    [-20, 130, 190, 140, 425, 285, 5],
    [-20, 205, 150, 235, 335, 385, 5],
    [-15, 280, 90, 320, 210, 430, 4],
    [-20, 350, 60, 380, 120, 440, 3],
]
// Ragged right edge of the crown: [y, x]
const EDGE = [
    [-20, 390],
    [0, 395],
    [40, 420],
    [110, 440],
    [185, 475],
    [230, 455],
    [270, 430],
    [330, 400],
    [390, 352],
    [414, 320],
    [440, 300],
]
function edgeX(y: number) {
    if (y <= EDGE[0][0]) return EDGE[0][1]
    for (let i = 0; i < EDGE.length - 1; i++) {
        const [y0, x0] = EDGE[i]
        const [y1, x1] = EDGE[i + 1]
        if (y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0)
    }
    return EDGE[EDGE.length - 1][1]
}
const isBlur = (x: number, y: number) => (x < 160 && y > 255) || (x < 35 && y > 140)

// bottom: the frame's bottom edge in reference units (414 at Scale 100, more when
// scaled down) so the tree always reaches the bottom instead of ending mid-frame.
function buildTree(seed: number, total: number, fs: number, clumpSize: number, sprays: number, reach: number, bottom = 414): Geo {
    const rng = mulberry32(seed)
    const R = reach / 100
    const ex = (y: number) => edgeX(y) * R
    const branches: Geo["branches"] = []
    const clipLine = (pts: Pt[]) => {
        const out: Pt[] = []
        for (const p of pts) {
            if (p.x > ex(p.y) + 25 || p.y > bottom + 16) break
            out.push(p)
        }
        return out
    }
    const grow = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
        const pts: Pt[] = [{ x, y }]
        const steps = 5
        const seg = len / steps
        for (let s = 0; s < steps; s++) {
            a += (Math.PI / 2 - a) * 0.1 + (rng() - 0.5) * 0.35
            x += Math.cos(a) * seg
            y += Math.sin(a) * seg
            pts.push({ x, y })
        }
        const c = clipLine(pts)
        if (c.length > 1) branches.push({ pts: c, w })
        if (depth > 0) {
            for (let k = 0; k < 2; k++) {
                const idx = 1 + Math.floor(rng() * (c.length - 1))
                if (idx >= c.length) continue
                const p = c[idx]
                grow(p.x, p.y, a + (k === 0 ? -0.55 : 0.55) + (rng() - 0.5) * 0.3, len * 0.62, w * 0.62, depth - 1)
            }
        }
    }
    // extra low limbs from the left edge to fill a taller frame
    const limbs = LIMBS.slice()
    for (let y0 = 425; y0 < bottom; y0 += 75) limbs.push([-20, y0, 60, y0 + 30, 140, y0 + 90, 3])
    limbs.forEach((Ld) => {
        const [x0, y0, cx, cy, x2, y2, w] = Ld
        const A = { x: x0, y: y0 }
        const C = { x: cx * R, y: cy }
        const B = { x: x2 * R, y: y2 }
        const pts: Pt[] = []
        for (let i = 0; i <= 24; i++) pts.push(quad(A, C, B, i / 24))
        const c = clipLine(pts)
        if (c.length > 1) branches.push({ pts: c, w })
        for (let j = 0; j < 7; j++) {
            const t = 0.15 + (0.8 * (j + rng())) / 7
            const q = quad(A, C, B, t)
            grow(q.x, q.y, quadAngle(A, C, B, t) + (j % 2 ? 0.5 : -0.4), 45 + rng() * 55, w * 0.4, 2)
        }
    })

    const density = (x: number, y: number) => {
        const e = ex(y)
        if (x > e) return 0
        let d = 1
        const cv = ((x - 235 * R) / (80 * R)) ** 2 + ((y - 200) / 68) ** 2
        if (cv < 1) d *= 0.05 + 0.6 * cv * cv
        if (y > 235 && x > 165 * R) d *= 0.12
        if (y > bottom - 29) d *= 0.5
        d *= clamp(0.35 + 1.1 * vnoise(x / 38, y / 38, seed), 0, 1.2)
        return clamp01(d)
    }
    const light = (fx: number, fy: number, cx: number, cy: number, r: number) => {
        const e = ex(fy)
        let L = 0.28 + 0.55 * (fx / (470 * R)) - 0.35 * Math.min(1.1, Math.max(0, (fy - 170) / 240))
        L += (0.25 * (fx - cx - (fy - cy))) / (2 * r + 1)
        L += 0.15 * smooth(e - 70, e, fx)
        L += (rng() - 0.5) * 0.2
        if (isBlur(fx, fy)) L -= 0.08
        return clamp01(L)
    }

    const core: Flower[] = []
    const coreBlur: Flower[] = []
    const groups: Group[] = []
    const lobeMap = new Map<number, Group>()
    const K = Math.max(20, Math.round((total / 13) * (bottom / 414)))
    let made = 0
    const xMax = ex(185) + 20
    for (let tries = 0; tries < K * 30 && made < K; tries++) {
        const x = -12 + rng() * xMax
        const y = -12 + rng() * (bottom + 26)
        if (rng() >= density(x, y)) continue
        made++
        const r = clumpSize * (0.6 + 0.6 * rng())
        const n = Math.max(3, Math.round(13 * (r / clumpSize) ** 2))
        let lobe: Group | null = null
        if (x > ex(y) - 55 && y > 15 && y < 250) {
            const key = Math.floor(y / 40)
            lobe = lobeMap.get(key) || null
            if (!lobe) {
                const yc = key * 40 + 20
                lobe = { pts: [], flowers: [], anchor: { x: ex(yc) - 120, y: yc }, tip: { x: ex(yc), y: yc }, back: false, blur: false }
                lobeMap.set(key, lobe)
                groups.push(lobe)
            }
        }
        for (let k = 0; k < n; k++) {
            const a = rng() * TAU
            const dd = Math.sqrt(rng()) * r
            const fx = x + Math.cos(a) * dd
            const fy = y + Math.sin(a) * dd * 0.85
            if (fx > ex(fy) + 6 || fy < -12 || fy > bottom + 12 || fx < -12) continue
            const f: Flower = { x: fx, y: fy, r: fs * 0.5 * (0.65 + rng() * 0.65), L: light(fx, fy, x, y, r), rot: rng() * TAU }
            if (lobe) lobe.flowers.push(f)
            else if (isBlur(fx, fy)) coreBlur.push(f)
            else core.push(f)
        }
    }

    // hanging sprays in the lower right of the crown
    for (let i = 0; i < sprays; i++) {
        const xr = 195 + 265 * ((i + rng()) / Math.max(1, sprays))
        let x = xr * R
        let y = 135 + 0.18 * (xr - 195) + rng() * 45
        const len = (60 + rng() * 130) * (xr < 330 ? 1 : 0.7)
        let a = Math.PI / 2 + (rng() - 0.5) * 0.5
        const pts: Pt[] = [{ x, y }]
        const flowers: Flower[] = []
        let dist = 0
        let nextF = 12 + rng() * 8
        const steps = Math.ceil(len / 6)
        for (let s = 0; s < steps; s++) {
            a += (Math.PI / 2 - a) * 0.1 + (rng() - 0.5) * 0.15
            x += Math.cos(a) * 6
            y += Math.sin(a) * 6
            if (y > bottom - 16) break
            pts.push({ x, y })
            dist += 6
            if (dist >= nextF) {
                nextF = dist + 10 + rng() * 7
                const last = s >= steps - 2
                const fr = last ? 7 + rng() * 3 : 4 + rng() * 4
                const ox = x + (rng() - 0.5) * 8
                const oy = y
                if (ox > ex(oy) + 28) continue
                const n = Math.round(fr * fr * 0.18) + 3
                for (let k = 0; k < n; k++) {
                    const aa = rng() * TAU
                    const dd = Math.sqrt(rng()) * fr
                    const fx = ox + Math.cos(aa) * dd
                    const fy = oy + Math.sin(aa) * dd * 0.85
                    flowers.push({
                        x: fx,
                        y: fy,
                        r: fs * 0.5 * (0.65 + rng() * 0.65),
                        L: clamp01(light(fx, fy, ox, oy, fr) + 0.1),
                        rot: rng() * TAU,
                    })
                }
            }
        }
        if (flowers.length) groups.push({ pts, flowers, anchor: pts[0], tip: pts[pts.length - 1], back: rng() < 0.3, blur: false })
    }
    return { branches, groups, core, coreBlur }
}

// Smooth hover warp: the crown image is resampled through a bilinear-filtered
// grid of spring offsets, so neighbouring blossoms always move together.
const WARP_VS = `attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
    gl_Position = vec4(aPos, 0.0, 1.0);
}`
const WARP_FS = `precision highp float;
uniform sampler2D uImg;
uniform sampler2D uDisp;
uniform vec2 uGs;
uniform vec2 uCap;
varying vec2 vUv;
void main() {
    vec2 e = texture2D(uDisp, vUv * uGs).rg * 255.0;
    vec2 d = (e - 128.0) / 127.0 * uCap;
    gl_FragColor = texture2D(uImg, vUv - d);
}`
function createWarp(gl: WebGLRenderingContext) {
    const sh = (type: number, src: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader")
        return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, WARP_VS))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, WARP_FS))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link")
    const loc = (n: string) => {
        const l = gl.getUniformLocation(prog, n)
        if (!l) throw new Error("uniform " + n)
        return l
    }
    const U = { img: loc("uImg"), disp: loc("uDisp"), gs: loc("uGs"), cap: loc("uCap") }
    const aPos = gl.getAttribLocation(prog, "aPos")
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    const mkTex = () => {
        const t = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        return t
    }
    const tCore = mkTex()
    const tBlur = mkTex()
    const tDisp = mkTex()
    return {
        upload(core: HTMLCanvasElement, blur: HTMLCanvasElement) {
            gl.bindTexture(gl.TEXTURE_2D, tCore)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, core)
            gl.bindTexture(gl.TEXTURE_2D, tBlur)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, blur)
        },
        setDisp(data: Uint8Array, cols: number, rows: number) {
            gl.bindTexture(gl.TEXTURE_2D, tDisp)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
        },
        render(core: boolean, w: number, h: number, gx: number, gy: number, cx: number, cy: number) {
            const c = gl.canvas as HTMLCanvasElement
            if (c.width !== w) c.width = w
            if (c.height !== h) c.height = h
            gl.viewport(0, 0, w, h)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.useProgram(prog)
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.enableVertexAttribArray(aPos)
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, core ? tCore : tBlur)
            gl.uniform1i(U.img, 0)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, tDisp)
            gl.uniform1i(U.disp, 1)
            gl.activeTexture(gl.TEXTURE0)
            gl.uniform2f(U.gs, gx, gy)
            gl.uniform2f(U.cap, cx, cy)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        },
    }
}

const mk = (w: number, h: number) => {
    const c = document.createElement("canvas")
    c.width = Math.max(1, Math.ceil(w))
    c.height = Math.max(1, Math.ceil(h))
    return c
}

function bakeScene(Wd: number, Hd: number, geo: Geo, P: any, adv: any) {
    const u = (Hd / 414) * (num(P.scale, 100) / 100)
    const stretch = clamp(Wd / Hd / 1.778, 0.8, 1.25)
    const sx = u * stretch
    const sy = u
    const blossom = parseColor(P.blossomColor, [221, 183, 203])
    const white = [255, 255, 255]
    const hl = num(adv.highlight, 100) / 100
    const pal: string[] = []
    const dark: string[] = []
    const lite: string[] = []
    const eye: string[] = []
    const stam: string[] = []
    const eyeBase = mix(blossom, [190, 50, 105], 0.5)
    for (let i = 0; i <= 64; i++) {
        const L = i / 64
        const b = Math.min(1.3, 0.32 + 0.98 * Math.pow(L, 1.1) * hl)
        const c = b <= 1 ? [blossom[0] * b, blossom[1] * b, blossom[2] * b] : mix(blossom, white, Math.min(0.3, b - 1))
        pal.push(rgbStr(c))
        // petal edges and notches, the lit sheen, the deep pink eye and the stamens
        dark.push(rgbStr(mix(c, [20, 10, 18], 0.45)))
        lite.push(rgbStr(mix(c, white, 0.28)))
        const b0 = Math.min(1, b)
        eye.push(rgbStr([eyeBase[0] * b0, eyeBase[1] * b0, eyeBase[2] * b0]))
        const sb = Math.min(1, 0.35 + b * 0.75)
        stam.push(rgbStr([255 * sb, 240 * sb, 215 * sb]))
    }
    const peak = rgbStr(mix(blossom, white, 0.35))
    const branch = typeof adv.branchColor === "string" ? adv.branchColor : "#3E3539"

    // res: pixels per device px of the target canvas; detail is only drawn where it can show
    const drawFlowers = (g: CanvasRenderingContext2D, fl: Flower[], res = 1) => {
        const list = fl.slice().sort((a, b) => a.L - b.L)
        for (const f of list) {
            const X = f.x * sx
            const Y = f.y * sy
            const R = f.r * u
            const ci = Math.round(f.L * 64)
            if (R * res < 3) {
                g.fillStyle = pal[ci]
                g.beginPath()
                for (let k = 0; k < 5; k++) {
                    const a = f.rot + k * 1.2566
                    const px = X + Math.cos(a) * R * 0.45
                    const py = Y + Math.sin(a) * R * 0.45
                    g.moveTo(px + R * 0.5, py)
                    g.arc(px, py, R * 0.5, 0, TAU)
                }
                g.fill()
            } else {
                // five notched petals, foreshortened as each flower faces its own way
                const sq = 0.62 + 0.38 * Math.abs(Math.cos(f.rot * 2.3))
                const tilt = f.rot * 0.7
                g.save()
                g.translate(X, Y)
                g.rotate(tilt)
                g.scale(1, sq)
                g.rotate(f.rot - tilt)
                g.fillStyle = pal[ci]
                g.beginPath()
                for (let k = 0; k < 5; k++) {
                    const a = k * 1.2566
                    const cx = Math.cos(a) * R * 0.5
                    const cy = Math.sin(a) * R * 0.5
                    g.moveTo(cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5)
                    g.ellipse(cx, cy, R * 0.5, R * 0.34, a, 0, TAU)
                }
                g.fill()
                g.strokeStyle = dark[ci]
                g.lineWidth = Math.max(0.5 / res, R * 0.07)
                g.globalAlpha = 0.55
                g.stroke()
                // lit sheen on each petal
                g.globalAlpha = 0.45 * f.L
                g.fillStyle = lite[ci]
                g.beginPath()
                for (let k = 0; k < 5; k++) {
                    const a = k * 1.2566
                    const cx = Math.cos(a) * R * 0.6
                    const cy = Math.sin(a) * R * 0.6
                    g.moveTo(cx + Math.cos(a) * R * 0.26, cy + Math.sin(a) * R * 0.26)
                    g.ellipse(cx, cy, R * 0.26, R * 0.16, a, 0, TAU)
                }
                g.fill()
                // notches at the petal tips
                g.globalAlpha = 0.8
                g.fillStyle = dark[ci]
                g.beginPath()
                for (let k = 0; k < 5; k++) {
                    const a = k * 1.2566
                    const nx = Math.cos(a) * R * 0.98
                    const ny = Math.sin(a) * R * 0.98
                    g.moveTo(nx + R * 0.09, ny)
                    g.arc(nx, ny, R * 0.09, 0, TAU)
                }
                g.fill()
                // deep pink eye
                g.globalAlpha = 1
                g.fillStyle = eye[ci]
                g.beginPath()
                g.arc(0, 0, R * 0.26, 0, TAU)
                g.fill()
                // stamens on the larger flowers
                if (R * res >= 5) {
                    g.strokeStyle = stam[ci]
                    g.fillStyle = stam[ci]
                    g.lineWidth = Math.max(0.4 / res, R * 0.04)
                    g.globalAlpha = 0.7
                    g.beginPath()
                    for (let k = 0; k < 7; k++) {
                        const a = 0.4 + k * 0.8976
                        g.moveTo(0, 0)
                        g.lineTo(Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42)
                    }
                    g.stroke()
                    g.globalAlpha = 0.9
                    g.beginPath()
                    for (let k = 0; k < 7; k++) {
                        const a = 0.4 + k * 0.8976
                        const dx = Math.cos(a) * R * 0.44
                        const dy = Math.sin(a) * R * 0.44
                        g.moveTo(dx + R * 0.06, dy)
                        g.arc(dx, dy, R * 0.06, 0, TAU)
                    }
                    g.fill()
                }
                g.globalAlpha = 1
                g.restore()
            }
            if (f.L > 0.78) {
                g.globalAlpha = 0.35 * smooth(0.78, 1, f.L)
                g.fillStyle = peak
                g.beginPath()
                g.arc(X + R * 0.2, Y - R * 0.2, R * 0.4, 0, TAU)
                g.fill()
                g.globalAlpha = 1
            }
        }
    }
    const strokeLine = (g: CanvasRenderingContext2D, pts: Pt[], w0: number, taper: number) => {
        g.strokeStyle = branch
        g.lineCap = "round"
        for (let i = 0; i < pts.length - 1; i++) {
            g.lineWidth = Math.max(0.6, w0 * (1 - (i / pts.length) * taper))
            g.beginPath()
            g.moveTo(pts[i].x * sx, pts[i].y * sy)
            g.lineTo(pts[i + 1].x * sx, pts[i + 1].y * sy)
            g.stroke()
        }
    }

    // core (static mass) with the branch network behind it
    const core = mk(Wd, Hd)
    const cg = core.getContext("2d")!
    for (const l of geo.branches) strokeLine(cg, l.pts, l.w * u * 0.5, 0.6)
    drawFlowers(cg, geo.core)

    const fb = 1 / clamp(1 + num(adv.dofBlur, 3) * u * 0.5, 1, 12)
    const coreBlur = mk(Wd * fb, Hd * fb)
    const bg2 = coreBlur.getContext("2d")!
    bg2.setTransform(fb, 0, 0, fb, 0, 0)
    drawFlowers(bg2, geo.coreBlur, fb)

    // hover field: a coarse grid of springs; the crown is warped smoothly through it
    const ts = Math.max(24, Math.round(Math.min(Wd, Hd) / 20))
    const cols = Math.ceil(Wd / ts)
    const rows = Math.ceil(Hd / ts)
    const n = cols * rows
    const fseed = num(adv.seed, 7) + 31
    const ph = new Float32Array(n)
    // spatially coherent phases, so the flutter rolls through the crown like a breeze
    for (let i = 0; i < n; i++) ph[i] = TAU * 2 * vnoise((i % cols) * 0.35, Math.floor(i / cols) * 0.35, fseed)
    const field = {
        ts,
        cols,
        rows,
        n,
        ph,
        disp: new Uint8Array(n * 4),
        ox: new Float32Array(n),
        oy: new Float32Array(n),
        vx: new Float32Array(n),
        vy: new Float32Array(n),
        active: false,
    }

    // sprites: hanging sprays and edge lobes that sway
    const srng = mulberry32(num(adv.seed, 7) + 3)
    const sprites: any[] = []
    for (const gr of geo.groups) {
        if (gr.flowers.length === 0) continue
        let x0 = Infinity,
            y0 = Infinity,
            x1 = -Infinity,
            y1 = -Infinity
        for (const p of gr.pts) {
            x0 = Math.min(x0, p.x * sx)
            y0 = Math.min(y0, p.y * sy)
            x1 = Math.max(x1, p.x * sx)
            y1 = Math.max(y1, p.y * sy)
        }
        for (const f of gr.flowers) {
            const R = f.r * u
            x0 = Math.min(x0, f.x * sx - R)
            y0 = Math.min(y0, f.y * sy - R)
            x1 = Math.max(x1, f.x * sx + R)
            y1 = Math.max(y1, f.y * sy + R)
        }
        x0 -= 4
        y0 -= 4
        x1 += 4
        y1 += 4
        const res = gr.blur ? fb : 1
        const c = mk((x1 - x0) * res, (y1 - y0) * res)
        const g = c.getContext("2d")!
        g.setTransform(res, 0, 0, res, -x0 * res, -y0 * res)
        if (gr.pts.length > 1) strokeLine(g, gr.pts, 0.9 * u * 0.5, 0.4)
        drawFlowers(g, gr.flowers, res)
        const ax = gr.anchor.x * sx
        const ay = gr.anchor.y * sy
        const tx = gr.tip.x * sx
        const ty = gr.tip.y * sy
        sprites.push({
            c,
            bx: x0,
            by: y0,
            bw: x1 - x0,
            bh: y1 - y0,
            ax,
            ay,
            tx,
            ty,
            len: Math.hypot(tx - ax, ty - ay),
            back: gr.back,
            pf: 0.7 + srng() * 0.6,
            ph: srng() * TAU,
            ph2: srng() * TAU,
            g: 0,
            gv: 0,
            th: 0,
        })
    }

    // glow: highlights at 1/4, halo by repeated halving
    const hq = 0.25
    const hCan = mk(Wd * hq, Hd * hq)
    const hg = hCan.getContext("2d")!
    hg.setTransform(hq, 0, 0, hq, 0, 0)
    hg.fillStyle = peak
    const allF: Flower[] = geo.core.concat(geo.coreBlur)
    for (const gr of geo.groups) for (const f of gr.flowers) allF.push(f)
    for (const f of allF) {
        if (f.L < 0.78) continue
        hg.globalAlpha = 0.7 * ((f.L - 0.78) / 0.22)
        hg.beginPath()
        hg.arc(f.x * sx, f.y * sy, f.r * u * 1.4, 0, TAU)
        hg.fill()
    }
    const target = Math.max(4, 10 * u * (num(adv.haloSize, 100) / 100))
    let div = 4
    let halo = hCan
    while (div * 2 <= target && halo.width > 4) {
        const n = mk(halo.width / 2, halo.height / 2)
        const ng = n.getContext("2d")!
        ng.imageSmoothingQuality = "high"
        ng.drawImage(halo, 0, 0, n.width, n.height)
        halo = n
        div *= 2
    }

    // backdrop at half resolution
    const bg = mk(Wd / 2, Hd / 2)
    const b = bg.getContext("2d")!
    b.setTransform(0.5, 0, 0, 0.5, 0, 0)
    b.fillStyle = typeof P.background === "string" ? P.background : "#000000"
    b.fillRect(0, 0, Wd, Hd)
    const fade = b.createLinearGradient(0, Hd * 0.7, 0, Hd)
    fade.addColorStop(0, "rgba(0,0,0,0)")
    fade.addColorStop(1, "rgba(0,0,0,0.35)")
    b.fillStyle = fade
    b.fillRect(0, 0, Wd, Hd)
    const haze = parseColor(adv.hazeColor, [47, 42, 44])
    const hzx = 410 * sx
    const hzy = 150 * sy
    const hzr = 250 * u
    const hz = b.createRadialGradient(hzx, hzy, 0, hzx, hzy, hzr)
    hz.addColorStop(0, rgbStr(haze, num(adv.hazeOpacity, 40) / 100))
    hz.addColorStop(1, rgbStr(haze, 0))
    b.fillStyle = hz
    b.fillRect(0, 0, Wd, Hd)

    return { core, coreBlur, sprites, halo, bloom: hCan, bg, field }
}

export interface NightSceneBacklitProps {
    background?: string
    blossomColor?: string
    speed?: number
    petals?: number
    wind?: number
    scale?: number
    direction?: "left" | "right"
    glow?: number
    hover?: number
    advanced?: {
        seed?: number
        flowers?: number
        flowerSize?: number
        clumpSize?: number
        twigs?: number
        crownReach?: number
        branchColor?: string
        highlight?: number
        dofBlur?: number
        petalColor?: string
        petalSize?: number
        fallSpeed?: number
        nearShare?: number
        drift?: number
        wobble?: number
        swayAmp?: number
        swayPeriod?: number
        bokehFirst?: number
        bokehEvery?: number
        bokehSize?: number
        bokehOpacity?: number
        haloSize?: number
        hazeColor?: string
        hazeOpacity?: number
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
export default function NightSceneBacklit(props: NightSceneBacklitProps) {
    props = withMovedControls(props)
    const {
        speed = 100,
        petals = 140,
        wind = 30,
        scale = 100,
        blossomColor = "#CFA0FF",
        glow = 50,
        background = "#000000",
        direction = "left",
        style,
    } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(props)
    propsRef.current = { ...props, speed, petals, wind, scale, blossomColor, glow, background, direction }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let Wd = 0
        let Hd = 0
        let dpr = 1
        const resize = () => {
            dpr = Math.min(2, window.devicePixelRatio || 1)
            Wd = Math.max(1, Math.round(root.offsetWidth * dpr))
            Hd = Math.max(1, Math.round(root.offsetHeight * dpr))
            if (canvas.width !== Wd) canvas.width = Wd
            if (canvas.height !== Hd) canvas.height = Hd
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        const reduced = !!(mq && mq.matches)

        const ptr = { x: 0, y: 0, inside: false, down: false, over: 0, press: 0 }
        const onMove = (e: PointerEvent) => {
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            ptr.inside = true
        }
        const onLeave = () => {
            ptr.inside = false
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            ptr.down = true
        }
        const onUp = () => {
            ptr.down = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const noise = mk(256, 256)
        {
            const ng = noise.getContext("2d")!
            const id = ng.createImageData(256, 256)
            const nr = mulberry32(99)
            for (let i = 0; i < id.data.length; i += 4) {
                const v = nr() < 0.5 ? 0 : 255
                id.data[i] = id.data[i + 1] = id.data[i + 2] = v
                id.data[i + 3] = Math.floor(nr() * 60)
            }
            ng.putImageData(id, 0, 0)
        }
        const grainPat = ctx.createPattern(noise, "repeat")

        // offscreen WebGL canvas for the smooth hover warp; plain drawing if unavailable
        const glc = document.createElement("canvas")
        let warp: ReturnType<typeof createWarp> | null = null
        try {
            const gl = glc.getContext("webgl", {
                alpha: true,
                premultipliedAlpha: true,
                preserveDrawingBuffer: true,
                antialias: false,
                depth: false,
            }) as WebGLRenderingContext | null
            if (gl) warp = createWarp(gl)
        } catch (e) {
            warp = null
        }
        let warpScene: any = null

        let geo: Geo | null = null
        let geoKey = ""
        let scene: any = null
        let sceneKey = ""
        let parts: any[] = []
        let partKey = ""
        let liveRng = mulberry32(1)
        let ev: any = null
        let evKey = ""

        const spawnX = (r: () => number) => (r() < 0.22 ? 0.2 + 0.42 * r() : 0.5 + 0.5 * ((r() + r()) / 2))
        // pointer velocity in device px/s, eased
        const pv = { x: 0, y: 0 }
        let lastPx = -1
        let lastPy = -1

        let last = -1
        let t = 0
        let raf = 0
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 0.05)
            last = now
            if (Wd < 2 || Hd < 2) return
            const P = propsRef.current
            const adv: any = { ...ADVANCED_DEFAULTS, ...(P.advanced ?? {}) }
            const spd = reduced ? 0 : Math.max(0, num(P.speed, 50)) / 50
            const dts = dt * spd
            t += dts
            const seed = num(adv.seed, 7)

            const bottom = Math.round(414 * Math.max(1, 100 / Math.max(10, num(P.scale, 100))))
            const gk = [seed, adv.flowers, adv.flowerSize, adv.clumpSize, adv.twigs, adv.crownReach, bottom].join("|")
            if (!geo || gk !== geoKey) {
                geo = buildTree(
                    seed,
                    clamp(num(adv.flowers, 11000), 500, 30000),
                    Math.max(2, num(adv.flowerSize, 6)),
                    Math.max(4, num(adv.clumpSize, 11)),
                    clamp(Math.round(num(adv.twigs, 30)), 0, 60),
                    clamp(num(adv.crownReach, 100), 40, 160),
                    bottom
                )
                geoKey = gk
                sceneKey = ""
            }
            const sk = [
                Wd,
                Hd,
                P.scale,
                P.blossomColor,
                P.background,
                adv.branchColor,
                adv.highlight,
                adv.dofBlur,
                adv.haloSize,
                adv.hazeColor,
                adv.hazeOpacity,
                seed,
                gk,
            ].join("|")
            if (!scene || sk !== sceneKey) {
                scene = bakeScene(Wd, Hd, geo, P, adv)
                sceneKey = sk
            }
            const count = clamp(Math.round(num(P.petals, 140)), 0, 600)
            const pk = [count, seed, adv.nearShare].join("|")
            if (pk !== partKey) {
                const r = mulberry32(seed + 5)
                liveRng = mulberry32(seed + 17)
                const s = clamp(num(adv.nearShare, 16) / 100, 0.01, 0.9)
                const k = Math.log(0.7) / Math.log(1 - s)
                parts = []
                for (let i = 0; i < count; i++) {
                    const z = Math.pow(r(), k)
                    parts.push({
                        x: spawnX(r),
                        y: -0.04 + r() * 1.08,
                        z,
                        ph: r() * TAU,
                        wob: TAU / (1 + r()),
                        spin: r() * TAU,
                        spinV: 1.5 + r() * 2.5,
                        rot: r() * TAU,
                        ci: Math.floor(r() * 8),
                        a: clamp(0.45 + 0.55 * z + (r() - 0.5) * 0.2, 0.3, 1),
                        ox: 0,
                        oy: 0,
                    })
                }
                parts.sort((a, b) => a.z - b.z)
                partKey = pk
            }
            const ek = [seed, adv.bokehFirst, adv.bokehEvery].join("|")
            if (!ev || ek !== evKey) {
                const r = mulberry32(seed + 23)
                const first = num(adv.bokehFirst, 2330) / 1000
                const every = Math.max(0.5, num(adv.bokehEvery, 6000) / 1000)
                ev = {
                    r,
                    every,
                    list: [
                        { t0: 0.39, x: 0.81, s: 0.22 },
                        { t0: first, x: 0.3, s: 1 },
                    ],
                    nextT: first + every * (0.7 + 0.6 * r()),
                }
                evKey = ek
            }
            while (ev.nextT < t + 1) {
                ev.list.push({ t0: ev.nextT, x: 0.2 + 0.65 * ev.r(), s: 0.45 + 0.55 * ev.r() })
                ev.nextT += ev.every * (0.7 + 0.6 * ev.r())
            }
            if (ev.list.length > 6) ev.list = ev.list.filter((e: any) => t - e.t0 < 2)

            ptr.over += ((ptr.inside ? 1 : 0) - ptr.over) * (1 - Math.exp(-dt * 4))
            ptr.press += ((ptr.down ? 1 : 0) - ptr.press) * (1 - Math.exp(-dt * 6))
            const h = Math.max(0, num(adv.hover, 50)) / 50
            const pAmt = ptr.over * h
            // the canvas is mirrored for a tree on the right, so the pointer is mirrored with it
            const flip = P.direction === "right"
            const pxd = flip ? Wd - ptr.x * dpr : ptr.x * dpr
            const pyd = ptr.y * dpr
            let rvx = 0
            let rvy = 0
            if (ptr.inside && lastPx >= 0 && dt > 0) {
                rvx = clamp((pxd - lastPx) / dt, -4 * Wd, 4 * Wd)
                rvy = clamp((pyd - lastPy) / dt, -4 * Wd, 4 * Wd)
            }
            lastPx = ptr.inside ? pxd : -1
            lastPy = ptr.inside ? pyd : -1
            const kV = 1 - Math.exp(-dt * 12)
            pv.x += (rvx - pv.x) * kV
            pv.y += (rvy - pv.y) * kV

            const blossom = parseColor(P.blossomColor, [221, 183, 203])
            const gA = Math.max(0, num(P.glow, 60)) / 60
            const windMul = Math.max(0, num(P.wind, 30)) / 30

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalCompositeOperation = "source-over"
            ctx.globalAlpha = 1
            ctx.drawImage(scene.bg, 0, 0, Wd, Hd)

            const drawAdd = (img: HTMLCanvasElement, a: number) => {
                ctx.globalCompositeOperation = "lighter"
                while (a > 0.001) {
                    ctx.globalAlpha = Math.min(1, a)
                    ctx.drawImage(img, 0, 0, Wd, Hd)
                    a -= 1
                }
                ctx.globalAlpha = 1
                ctx.globalCompositeOperation = "source-over"
            }
            drawAdd(scene.halo, 0.5 * gA)

            const swayA = (num(adv.swayAmp, 8) / 1000) * Wd * windMul
            const period = Math.max(0.3, num(adv.swayPeriod, 3000) / 1000)
            const Rg = 0.26 * Wd
            for (const s of scene.sprites) {
                const reach = clamp(s.tx / (0.55 * Wd), 0.15, 1.3)
                const thA = (swayA * reach) / Math.max(s.len, 8)
                const om = TAU / (period * s.pf)
                const base = (thA * (Math.sin(om * t + s.ph) + 0.35 * Math.sin(2.27 * om * t + s.ph2))) / 1.35
                let gt = 0
                let kick = 0
                if (pAmt > 0.001) {
                    const dx = s.tx - pxd
                    const dy = s.ty - pyd
                    const d = Math.hypot(dx, dy)
                    if (d < Rg) {
                        const f = (1 - d / Rg) ** 2
                        const vx = s.tx - s.ax
                        const vy = s.ty - s.ay
                        const vl = Math.hypot(vx, vy) || 1
                        const dir = ((-vy / vl) * dx + (vx / vl) * dy) / (d || 1)
                        gt = dir * f * 0.15 * pAmt * (1 + ptr.press)
                        // a pointer brushing across the spray swings it the same way
                        kick = (((-vy / vl) * pv.x + (vx / vl) * pv.y) / Math.max(s.len, 8)) * f * 2 * pAmt
                    }
                }
                // underdamped spring: the spray swings past and settles
                s.gv += ((gt - s.g) * 40 - s.gv * 4.5 + kick) * dt
                s.g = clamp(s.g + s.gv * dt, -0.35, 0.35)
                s.th = base + s.g
            }

            // crown tiles: pushed from the pointer, dragged by its motion, flutter, spring back
            const F = scene.field
            const Rf = 0.2 * Wd
            const pushF = 0.012 * Wd * pAmt * (1 + ptr.press)
            const flut = 0.002 * Wd * pAmt
            const capF = 0.03 * Wd
            const tsec = now / 1000
            let act = false
            for (let i = 0; i < F.n; i++) {
                let tx = 0
                let ty = 0
                let kx = 0
                let ky = 0
                if (pAmt > 0.001) {
                    const dx = ((i % F.cols) + 0.5) * F.ts - pxd
                    const dy = (Math.floor(i / F.cols) + 0.5) * F.ts - pyd
                    const d = Math.hypot(dx, dy)
                    if (d < Rf) {
                        const f = (1 - d / Rf) ** 2
                        const ph = F.ph[i]
                        tx = (dx / (d || 1)) * f * pushF + Math.sin(tsec * 11 + ph) * f * flut
                        ty = (dy / (d || 1)) * f * pushF + Math.cos(tsec * 9 + ph * 1.7) * f * flut
                        kx = pv.x * f * 1.2 * pAmt
                        ky = pv.y * f * 1.2 * pAmt
                    }
                }
                F.vx[i] += (60 * (tx - F.ox[i]) - 5.5 * F.vx[i] + kx) * dt
                F.vy[i] += (60 * (ty - F.oy[i]) - 5.5 * F.vy[i] + ky) * dt
                F.ox[i] = clamp(F.ox[i] + F.vx[i] * dt, -capF, capF)
                F.oy[i] = clamp(F.oy[i] + F.vy[i] * dt, -capF, capF)
                if (Math.abs(F.ox[i]) + Math.abs(F.oy[i]) > 0.05 || Math.abs(F.vx[i]) + Math.abs(F.vy[i]) > 0.5) act = true
            }
            F.active = act
            if (warp && warpScene !== scene) {
                warp.upload(scene.core, scene.coreBlur)
                warpScene = scene
            }
            if (act && warp) {
                const D = F.disp
                for (let i = 0; i < F.n; i++) {
                    D[i * 4] = 128 + Math.round(clamp(F.ox[i] / capF, -1, 1) * 127)
                    D[i * 4 + 1] = 128 + Math.round(clamp(F.oy[i] / capF, -1, 1) * 127)
                    D[i * 4 + 2] = 0
                    D[i * 4 + 3] = 255
                }
                warp.setDisp(D, F.cols, F.rows)
            }
            const drawField = (img: HTMLCanvasElement, isCore: boolean) => {
                if (!F.active || !warp) {
                    ctx.drawImage(img, 0, 0, Wd, Hd)
                    return
                }
                warp.render(isCore, Wd, Hd, Wd / (F.cols * F.ts), Hd / (F.rows * F.ts), capF / Wd, capF / Hd)
                ctx.drawImage(glc, 0, 0, Wd, Hd)
            }
            const drawSprites = (back: boolean) => {
                for (const s of scene.sprites) {
                    if (s.back !== back) continue
                    const c = Math.cos(s.th)
                    const sn = Math.sin(s.th)
                    ctx.setTransform(c, sn, -sn, c, s.ax, s.ay)
                    ctx.drawImage(s.c, s.bx - s.ax, s.by - s.ay, s.bw, s.bh)
                }
                ctx.setTransform(1, 0, 0, 1, 0, 0)
            }
            drawField(scene.coreBlur, false)
            drawSprites(true)
            drawField(scene.core, true)
            drawSprites(false)
            drawAdd(scene.bloom, 0.14 * gA)

            // petals
            const pc = parseColor(adv.petalColor, [237, 230, 234])
            const cols: string[] = []
            for (let i = 0; i < 8; i++) cols.push(rgbStr(mix(pc, blossom, (i / 7) * 0.6)))
            const uP = (Hd / 414) * (num(P.scale, 100) / 100) * (num(adv.petalSize, 100) / 100)
            const fall = num(adv.fallSpeed, 100) / 100
            const drift = num(adv.drift, -5) / 1000
            const wobK = windMul * (num(adv.wobble, 100) / 100)
            const Rp = 0.14 * Wd
            const push = 0.05 * Wd * pAmt * (1 + ptr.press)
            const kE = 1 - Math.exp(-dt * 5)
            for (const p of parts) {
                p.y += (0.03 + 0.14 * p.z) * fall * dts
                p.x += drift * (0.5 + p.z) * windMul * dts
                p.spin += p.spinV * dts
                if (p.y > 1.05) {
                    p.y = -0.04 - liveRng() * 0.04
                    p.x = spawnX(liveRng)
                }
                if (p.x < -0.06) p.x += 1.12
                else if (p.x > 1.06) p.x -= 1.12
                const wx = Math.sin(p.wob * t + p.ph) * (0.006 + 0.012 * p.z) * Wd * wobK
                const bx = p.x * Wd + wx
                const by = p.y * Hd
                let tx = 0
                let ty = 0
                if (push > 0.01) {
                    const dx = bx - pxd
                    const dy = by - pyd
                    const d = Math.hypot(dx, dy)
                    if (d < Rp) {
                        const f = (1 - d / Rp) ** 2 * (0.5 + p.z)
                        tx = (dx / (d || 1)) * f * push
                        ty = (dy / (d || 1)) * f * push
                    }
                }
                p.ox += (tx - p.ox) * kE
                p.oy += (ty - p.oy) * kE
                const X = bx + p.ox
                const Y = by + p.oy
                const r = (0.6 + 2.6 * Math.pow(p.z, 1.5)) * uP
                const face = Math.abs(Math.cos(p.spin))
                const ang = p.rot + 0.5 * Math.sin(p.wob * t + p.ph)
                const al = p.a * (0.55 + 0.45 * face)
                ctx.fillStyle = cols[p.ci]
                if (p.z > 0.7) {
                    ctx.globalAlpha = al * 0.18
                    ctx.beginPath()
                    ctx.ellipse(X, Y, r * 1.8, Math.max(0.6 * r, 1.4 * r * face), ang, 0, TAU)
                    ctx.fill()
                }
                ctx.globalAlpha = al
                ctx.beginPath()
                ctx.ellipse(X, Y, r, Math.max(0.35 * r, 0.8 * r * face), ang, 0, TAU)
                ctx.fill()
            }
            ctx.globalAlpha = 1

            // near-lens bokeh petals
            if (!reduced) {
                const bop = num(adv.bokehOpacity, 85) / 100
                const pink = mix(blossom, [255, 255, 255], 0.35)
                ctx.globalCompositeOperation = "lighter"
                for (const e of ev.list) {
                    const age = t - e.t0
                    const life = 0.2 + 0.1 * e.s
                    if (age < 0 || age > life) continue
                    const a = Math.pow(Math.sin(Math.PI * (age / life)), 0.8) * bop
                    const r = (num(adv.bokehSize, 8) / 100) * Wd * 0.5 * e.s
                    const x = e.x * Wd - 0.47 * Wd * age
                    const y = -r + 2.2 * Hd * age
                    ctx.setTransform(1.15, 0, 0, 0.9, x, y)
                    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
                    gr.addColorStop(0, `rgba(255,250,252,${a})`)
                    gr.addColorStop(0.45, `rgba(255,244,250,${a * 0.85})`)
                    gr.addColorStop(0.75, rgbStr(pink, a * 0.35))
                    gr.addColorStop(1, rgbStr(pink, 0))
                    ctx.fillStyle = gr
                    ctx.beginPath()
                    ctx.arc(0, 0, r, 0, TAU)
                    ctx.fill()
                }
                ctx.setTransform(1, 0, 0, 1, 0, 0)
                ctx.globalCompositeOperation = "source-over"
            }

            if (pAmt > 0.002) {
                const lr = 0.16 * Wd
                const gr = ctx.createRadialGradient(pxd, pyd, 0, pxd, pyd, lr)
                gr.addColorStop(0, rgbStr(blossom, 0.1 * pAmt * (1 + 0.6 * ptr.press)))
                gr.addColorStop(1, rgbStr(blossom, 0))
                ctx.globalCompositeOperation = "lighter"
                ctx.fillStyle = gr
                ctx.fillRect(pxd - lr, pyd - lr, lr * 2, lr * 2)
                ctx.globalCompositeOperation = "source-over"
            }

            const vig = clamp(num(adv.vignette, 35), 0, 100) / 100
            if (vig > 0) {
                const diag = Math.hypot(Wd, Hd) / 2
                const vg = ctx.createRadialGradient(Wd / 2, Hd / 2, diag * 0.35, Wd / 2, Hd / 2, diag)
                vg.addColorStop(0, "rgba(0,0,0,0)")
                vg.addColorStop(1, `rgba(0,0,0,${vig * 0.7})`)
                ctx.fillStyle = vg
                ctx.fillRect(0, 0, Wd, Hd)
            }
            const gr = clamp(num(adv.grain, 6), 0, 100)
            if (gr > 0 && grainPat) {
                const tick = Math.floor(now / 42)
                const ox = (tick * 73) % 256
                const oy = (tick * 151) % 256
                ctx.globalAlpha = Math.min(1, gr / 40)
                ctx.setTransform(1, 0, 0, 1, -ox, -oy)
                ctx.fillStyle = grainPat
                ctx.fillRect(0, 0, Wd + 256, Hd + 256)
                ctx.setTransform(1, 0, 0, 1, 0, 0)
                ctx.globalAlpha = 1
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
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
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    transform: direction === "right" ? "scaleX(-1)" : "none",
                }}
            />
        </div>
    )
}

// Control order arranged in the builder.
