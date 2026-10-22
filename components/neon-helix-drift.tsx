"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    halfTurnMs: 6200,
    radius: 224,
    halfPitch: 900,
    rungsPerHalf: 40,
    glyphSize: 12,
    charShare: 100,
    outlineShare: 20,
    axisX: 50,
    axisY: 50,
    axisAngle: -24,
    axisBend: 0,
    depthTilt: 45,
    cameraDistance: 1800,
    focusDepth: 50,
    focusBand: 15,
    blurPx: 6,
    cyanColor: "#FFD800",
    warmColor: "#FF7000",
    coolStop: 40,
    warmStop: 78,
    glyphOpacity: 95,
    farOpacity: 45,
    hotGlow: 70,
    hotGlowStart: 88,
    nodeShare: 4,
    nodeSize: 34,
    strandWidth: 3,
    strandColor: "#00FF96",
    haloColor: "#00FF57",
    haloWidth: 16,
    haloOpacity: 40,
    hazeColor: "#1E3F6A",
    haze: 22,
    dustCount: 60,
    seed: 7,
    lightRadius: 170,
    parallax: 10,
    hover: 50,
    grain: 0,
    vignette: 0,
}

type RGBA = [number, number, number, number]

const CELL = 80
const G = 16
const LEVELS = [0, 1.5, 3, 5, 7.5, 10]
const NL = LEVELS.length
const CHARS = ["2", "5", "7", "0", "8", "3", "Z", "S", "F", "L"]
const NT = 2 + CHARS.length
const NC = 10
const GAP = 0.12
const STEEL: RGBA = [142, 172, 176, 1]

function parseColor(input: unknown): RGBA {
    if (typeof input !== "string") return [0, 0, 0, 1]
    let s = input.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((x) => x + x)
                .join("")
        const n = parseInt(h.slice(0, 6), 16)
        if (isNaN(n)) return [0, 0, 0, 1]
        const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1]
            .split(/[\s,\/]+/)
            .filter(Boolean)
            .map((x) => parseFloat(x))
        return [p[0] || 0, p[1] || 0, p[2] || 0, p.length > 3 && !isNaN(p[3]) ? p[3] : 1]
    }
    return [0, 0, 0, 1]
}

function mix(a: RGBA, b: RGBA, t: number): RGBA {
    const k = Math.max(0, Math.min(1, t))
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, 1]
}

function rgba(c: RGBA, a: number) {
    return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

function ramp(t: number, far: RGBA, cyan: RGBA, warm: RGBA, hot: RGBA, cs: number, ws: number): RGBA {
    if (t <= cs) return mix(far, cyan, t / Math.max(1e-4, cs))
    if (t <= ws) return mix(cyan, warm, (t - cs) / Math.max(1e-4, ws - cs))
    return mix(warm, hot, (t - ws) / Math.max(1e-4, 1 - ws))
}

function hash3(a: number, b: number, c: number) {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h ^= h >>> 16
    h = Math.imul(h, 2246822519)
    h ^= h >>> 13
    return (h >>> 0) / 4294967296
}

function vnoise(x: number, seed: number) {
    const i = Math.floor(x)
    const f = x - i
    const u = f * f * (3 - 2 * f)
    return hash3(i, 11, seed) * (1 - u) + hash3(i + 1, 11, seed) * u
}

function drawGlyphShape(g: CanvasRenderingContext2D, type: number, x: number, y: number) {
    if (type === 0) {
        const w = 14
        const r = 2
        const x0 = x - w / 2
        const y0 = y - w / 2
        g.beginPath()
        g.moveTo(x0 + r, y0)
        g.arcTo(x0 + w, y0, x0 + w, y0 + w, r)
        g.arcTo(x0 + w, y0 + w, x0, y0 + w, r)
        g.arcTo(x0, y0 + w, x0, y0, r)
        g.arcTo(x0, y0, x0 + w, y0, r)
        g.closePath()
        g.fill()
    } else if (type === 1) {
        g.lineWidth = 2.2
        g.strokeRect(x - 6.5, y - 6.5, 13, 13)
    } else {
        g.fillText(CHARS[type - 2], x, y + 1)
    }
}

function buildWhite(): HTMLCanvasElement {
    const c = document.createElement("canvas")
    c.width = NT * NL * CELL
    c.height = CELL
    const g = c.getContext("2d")!
    g.fillStyle = "#ffffff"
    g.strokeStyle = "#ffffff"
    g.font = `700 ${G + 3}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
    g.textAlign = "center"
    g.textBaseline = "middle"
    for (let t = 0; t < NT; t++) {
        for (let l = 0; l < NL; l++) {
            const cx = (t * NL + l) * CELL + CELL / 2
            const cy = CELL / 2
            if (LEVELS[l] === 0) {
                drawGlyphShape(g, t, cx, cy)
            } else {
                g.save()
                g.shadowColor = "#ffffff"
                g.shadowBlur = LEVELS[l] * 2
                g.shadowOffsetX = 10000
                drawGlyphShape(g, t, cx - 10000, cy)
                g.restore()
            }
        }
    }
    return c
}

function buildAtlas(white: HTMLCanvasElement, colors: string[]): HTMLCanvasElement {
    const c = document.createElement("canvas")
    c.width = white.width
    c.height = CELL * colors.length
    const g = c.getContext("2d")!
    for (let r = 0; r < colors.length; r++) {
        g.globalCompositeOperation = "source-over"
        g.drawImage(white, 0, r * CELL)
        g.globalCompositeOperation = "source-atop"
        g.fillStyle = colors[r]
        g.fillRect(0, r * CELL, c.width, CELL)
    }
    g.globalCompositeOperation = "source-over"
    return c
}

function buildGlow(hot: RGBA): HTMLCanvasElement {
    const c = document.createElement("canvas")
    c.width = c.height = 64
    const g = c.getContext("2d")!
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    gr.addColorStop(0, rgba(hot, 1))
    gr.addColorStop(0.35, rgba(hot, 0.4))
    gr.addColorStop(1, rgba(hot, 0))
    g.fillStyle = gr
    g.fillRect(0, 0, 64, 64)
    return c
}

function buildNode(hot: RGBA): HTMLCanvasElement {
    const c = document.createElement("canvas")
    c.width = c.height = 128
    const g = c.getContext("2d")!
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    gr.addColorStop(0, "rgba(255,226,204,1)")
    gr.addColorStop(0.14, rgba(hot, 1))
    gr.addColorStop(0.3, rgba(hot, 0.55))
    gr.addColorStop(0.6, rgba(hot, 0.15))
    gr.addColorStop(1, rgba(hot, 0))
    g.fillStyle = gr
    g.fillRect(0, 0, 128, 128)
    return c
}

function buildGrain(): HTMLCanvasElement {
    const c = document.createElement("canvas")
    c.width = c.height = 128
    const g = c.getContext("2d")!
    const img = g.createImageData(128, 128)
    for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255
        img.data[i] = v
        img.data[i + 1] = v
        img.data[i + 2] = v
        img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
    return c
}

type Props = {
    speed?: number
    scale?: number
    density?: number
    hotColor?: string
    coolColor?: string
    focusBlur?: number
    background?: string
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function DoubleHelixMade(props: Props) {
    const {
        speed = 100,
        scale = 79,
        density = 30,
        hotColor = "#FF2600",
        coolColor = "#00FF25",
        focusBlur = 41,
        background = "#000000",
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props
    const valsRef = useRef({ speed, scale, density, hotColor, coolColor, focusBlur, background })
    valsRef.current = { speed, scale, density, hotColor, coolColor, focusBlur, background }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let W = 0
        let H = 0
        let dpr = 1
        const resize = () => {
            W = root.offsetWidth
            H = root.offsetHeight
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const white = buildWhite()
        let atlas: HTMLCanvasElement | null = null
        let glow: HTMLCanvasElement | null = null
        let node: HTMLCanvasElement | null = null
        let atlasKey = ""
        const grainCanvas = buildGrain()
        const grainPattern = ctx.createPattern(grainCanvas, "repeat")

        const pointer = { x: 0, y: 0, over: 0, overT: 0, down: 0, downT: 0 }
        const onMove = (e: PointerEvent) => {
            pointer.x = e.offsetX
            pointer.y = e.offsetY
            pointer.overT = 1
        }
        const onLeave = () => {
            pointer.overT = 0
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            pointer.downT = 1
        }
        const onUp = () => {
            pointer.downT = 0
        }
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        let sX = new Float32Array(0)
        let sY = new Float32Array(0)
        let sT = new Float32Array(0)
        let sS = new Float32Array(0)
        let sP = new Float32Array(0)

        let phi = 0
        let time = 0
        let last = -1
        let raf = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            let dt = last < 0 ? 0 : (now - last) / 1000
            last = now
            if (dt > 0.05) dt = 0.05
            if (dt < 0) dt = 0
            if (W < 2 || H < 2) return

            const v = valsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(propsRef.current.advanced ?? {}) }
            const reduce = !!(mq && mq.matches)
            const hk = reduce ? 0 : Math.max(0, adv.hover) / 50

            pointer.over += (pointer.overT - pointer.over) * (1 - Math.exp(-dt * 4))
            pointer.down += (pointer.downT - pointer.down) * (1 - Math.exp(-dt * 6))

            if (!reduce) {
                const spinMul = 1 + pointer.down * hk * 1.5
                phi += ((dt * Math.PI) / Math.max(0.2, adv.halfTurnMs / 1000)) * (Math.max(0, v.speed) / 50) * spinMul
                if (phi > Math.PI * 2) phi -= Math.PI * 2
                time += dt
            }

            // colour ramp atlas
            const far = parseColor(v.coolColor)
            const cyan = parseColor(adv.cyanColor)
            const warm = parseColor(adv.warmColor)
            const hot = parseColor(v.hotColor)
            const cs = Math.max(0.02, Math.min(0.97, adv.coolStop / 100))
            const ws = Math.max(cs + 0.01, Math.min(0.99, adv.warmStop / 100))
            const key = [v.coolColor, adv.cyanColor, adv.warmColor, v.hotColor, cs, ws].join("|")
            if (key !== atlasKey || !atlas || !glow || !node) {
                const cols: string[] = []
                for (let r = 0; r < NC; r++) cols.push(rgba(ramp(r / (NC - 1), far, cyan, warm, hot, cs, ws), 1))
                atlas = buildAtlas(white, cols)
                glow = buildGlow(hot)
                node = buildNode(hot)
                atlasKey = key
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalCompositeOperation = "source-over"
            ctx.globalAlpha = 1
            ctx.clearRect(0, 0, W, H)
            ctx.fillStyle = v.background
            ctx.fillRect(0, 0, W, H)

            // geometry
            const u800 = H / 800
            const f = u800 * (Math.max(10, v.scale) / 100)
            const R = Math.max(4, adv.radius * f)
            const half = Math.max(20, adv.halfPitch * f)
            const pitch = half * 2
            const spacing = half / Math.max(2, adv.rungsPerHalf)
            const n = Math.max(2, Math.round(v.density))
            const cx = (W * adv.axisX) / 100
            const cy = (H * adv.axisY) / 100
            const a0 = (adv.axisAngle * Math.PI) / 180
            const diag = Math.hypot(W, H)
            const kappa = (adv.axisBend * Math.PI) / 180 / Math.max(1, diag)
            const tilt = adv.depthTilt / 100
            const F = Math.max(100, adv.cameraDistance * u800)
            const vx = W / 2
            const vy = H / 2
            const focusZ = (R * adv.focusDepth) / 100
            const band = adv.focusBand / 100
            const blurK = (Math.max(0, v.focusBlur) / 50) * adv.blurPx * u800
            const gBase = adv.glyphSize * f
            const Smax = diag * 0.8

            const pk = pointer.over * hk
            const pnx = (pointer.x / W - 0.5) * 2
            const pny = (pointer.y / H - 0.5) * 2
            const parX = (pnx * adv.parallax * u800 * pk) / R
            const parY = (pny * adv.parallax * u800 * pk) / R
            const lightR2 = Math.pow(Math.max(1, adv.lightRadius * u800), 2)
            const lightK = pk * 0.45

            let ax = 0
            let ay = 0
            let nx = 0
            let ny = 0
            const axisAt = (s: number) => {
                const a = a0 + kappa * s
                if (Math.abs(kappa) < 1e-7) {
                    ax = cx + Math.cos(a0) * s
                    ay = cy - Math.sin(a0) * s
                } else {
                    ax = cx + (Math.sin(a) - Math.sin(a0)) / kappa
                    ay = cy + (Math.cos(a) - Math.cos(a0)) / kappa
                }
                nx = Math.sin(a)
                ny = Math.cos(a)
            }
            const sigmaAt = (z: number) => blurK * Math.max(0, Math.abs(z - focusZ) / R - band)

            ctx.globalCompositeOperation = "lighter"

            // dust
            const dustN = Math.max(0, Math.round(adv.dustCount))
            for (let d = 0; d < dustN; d++) {
                const hx = hash3(d, 1, adv.seed + 90)
                const hy = hash3(d, 2, adv.seed + 90)
                const hs = hash3(d, 3, adv.seed + 90)
                const hb = hash3(d, 4, adv.seed + 90)
                const zd = (hash3(d, 5, adv.seed + 90) - 0.5) * 2 * R
                const x = hx * W + Math.sin(time * 0.07 + hs * 6.28) * 4 * u800 + parX * zd
                const y = hy * H + Math.cos(time * 0.05 + hb * 6.28) * 3 * u800 + parY * zd
                const r = (0.6 + hs * 0.9) * u800
                const col = hb > 0.5 ? cyan : STEEL
                const tw = 0.75 + 0.25 * Math.sin(time * 0.8 + hs * 20)
                const a = (0.3 + 0.3 * hash3(d, 6, adv.seed + 90)) * tw
                if (hb > 0.45) {
                    ctx.fillStyle = rgba(col, a * 0.35)
                    ctx.beginPath()
                    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2)
                    ctx.fill()
                }
                ctx.fillStyle = rgba(col, a * 0.7)
                ctx.beginPath()
                ctx.arc(x, y, r, 0, Math.PI * 2)
                ctx.fill()
            }

            // haze: one path of rungs, filling each bulge silhouette
            const i0 = Math.ceil(-Smax / spacing)
            const i1 = Math.floor(Smax / spacing)
            if (adv.haze > 0) {
                const hazeC = parseColor(adv.hazeColor)
                const hs = spacing / 3
                ctx.beginPath()
                for (let i = i0 * 3; i <= i1 * 3; i++) {
                    const s = i * hs
                    axisAt(s)
                    const za = -s * tilt
                    const th = (2 * Math.PI * s) / pitch + phi
                    const c = Math.cos(th)
                    const sn = Math.sin(th)
                    const z0 = za + R * sn
                    const z1 = za - R * sn
                    const p0 = F / Math.max(1, F - z0)
                    const p1 = F / Math.max(1, F - z1)
                    const x0 = vx + (ax + R * c * nx - vx) * p0 + parX * z0
                    const y0 = vy + (ay + R * c * ny - vy) * p0 + parY * z0
                    const x1 = vx + (ax - R * c * nx - vx) * p1 + parX * z1
                    const y1 = vy + (ay - R * c * ny - vy) * p1 + parY * z1
                    if (Math.max(x0, x1) < -R || Math.min(x0, x1) > W + R || Math.max(y0, y1) < -R || Math.min(y0, y1) > H + R) continue
                    ctx.moveTo(x0, y0)
                    ctx.lineTo(x1, y1)
                }
                ctx.lineCap = "butt"
                ctx.strokeStyle = rgba(hazeC, (adv.haze / 100) * 0.3)
                ctx.lineWidth = hs * 2.6 + 8 * f
                ctx.stroke()
                ctx.strokeStyle = rgba(hazeC, (adv.haze / 100) * 0.5)
                ctx.lineWidth = hs * 1.4
                ctx.stroke()
            }

            // strands: saturated blue tubes with a soft halo, widening out of focus
            const step = Math.max(3, half / 64)
            const ns = Math.floor((2 * Smax) / step) + 1
            if (sX.length < ns) {
                sX = new Float32Array(ns)
                sY = new Float32Array(ns)
                sT = new Float32Array(ns)
                sS = new Float32Array(ns)
                sP = new Float32Array(ns)
            }
            const haloC = parseColor(adv.haloColor)
            const strandC = parseColor(adv.strandColor)
            const whiteC: RGBA = [255, 255, 255, 1]
            const CH = 5
            ctx.lineJoin = "round"
            ctx.lineCap = "round"
            for (let k = 0; k < 2; k++) {
                for (let q = 0; q < ns; q++) {
                    const s = -Smax + q * step
                    axisAt(s)
                    const za = -s * tilt
                    const th = (2 * Math.PI * s) / pitch + phi + k * Math.PI
                    const c = Math.cos(th)
                    const sn = Math.sin(th)
                    const z = za + R * sn
                    const p = F / Math.max(1, F - z)
                    sX[q] = vx + (ax + R * c * nx - vx) * p + parX * z
                    sY[q] = vy + (ay + R * c * ny - vy) * p + parY * z
                    sT[q] = (sn + 1) / 2
                    sS[q] = sigmaAt(z)
                    sP[q] = p
                }
                for (let q0 = 0; q0 < ns - 1; q0 += CH) {
                    const q1 = Math.min(ns - 1, q0 + CH)
                    const mid = (q0 + q1) >> 1
                    if (sX[mid] < -80 || sX[mid] > W + 80 || sY[mid] < -80 || sY[mid] > H + 80) continue
                    const t = sT[mid]
                    const sg = sS[mid]
                    const p = sP[mid]
                    ctx.beginPath()
                    ctx.moveTo(sX[q0], sY[q0])
                    for (let q = q0 + 1; q <= q1; q++) ctx.lineTo(sX[q], sY[q])
                    if (adv.haloOpacity > 0 && adv.haloWidth > 0) {
                        ctx.lineWidth = (adv.haloWidth * f + sg * 4) * p
                        ctx.strokeStyle = rgba(haloC, ((adv.haloOpacity / 100) * (0.55 + 0.45 * t)) / (1 + sg * 0.12))
                        ctx.stroke()
                    }
                    ctx.lineWidth = (adv.strandWidth * f + sg * 2.2) * p
                    ctx.strokeStyle = rgba(mix(strandC, whiteC, 0.2 * Math.max(0, (t - 0.5) * 2)), (0.4 + 0.6 * t) / (1 + sg * 0.35))
                    ctx.stroke()
                }
            }

            // glyph rungs: separate bars of glyphs, strand to strand
            const op = adv.glyphOpacity / 100
            const farOp = adv.farOpacity / 100
            const charP = adv.charShare / 100
            const outP = adv.outlineShare / 100
            const hs = Math.max(0.5, Math.min(0.99, adv.hotGlowStart / 100))
            const hotA = adv.hotGlow / 100
            const nodeP = adv.nodeShare / 100
            const seed = adv.seed
            const at = atlas!
            const gl = glow!
            const nd = node!
            const lastLevel = LEVELS[NL - 1]

            for (let i = i0; i <= i1; i++) {
                const s = i * spacing
                axisAt(s)
                const za = -s * tilt
                const th = (2 * Math.PI * s) / pitch + phi
                const c = Math.cos(th)
                const sn = Math.sin(th)
                const ex = R * c * nx
                const ey = R * c * ny
                const ez = R * sn
                const pa = F / Math.max(1, F - (za + ez))
                const pb = F / Math.max(1, F - (za - ez))
                const xa = vx + (ax + ex - vx) * pa
                const ya = vy + (ay + ey - vy) * pa
                const xb = vx + (ax - ex - vx) * pb
                const yb = vy + (ay - ey - vy) * pb
                const m = 60 * u800
                if (Math.max(xa, xb) < -m || Math.min(xa, xb) > W + m || Math.max(ya, yb) < -m || Math.min(ya, yb) > H + m) continue

                // warmth fixed to the rung (turns with the helix), strongest at the helix centre
                const centre = Math.exp(-Math.pow(s / (1.5 * half), 2))
                const wr = 0.55 * vnoise(i / 5 + 0.37, seed) + 0.45 * centre

                for (let j = 0; j < n; j++) {
                    if (hash3(i, j, seed + 1) < GAP) continue
                    const u = 0.05 + (0.9 * j) / (n - 1)
                    const w = 1 - 2 * u
                    const z = za + ez * w
                    const p = F / Math.max(1, F - z)
                    const X = vx + (ax + ex * w - vx) * p + parX * z
                    const Y = vy + (ay + ey * w - vy) * p + parY * z
                    if (X < -m || X > W + m || Y < -m || Y > H + m) continue
                    const front = (sn * w + 1) / 2

                    const dx = X - pointer.x
                    const dy = Y - pointer.y
                    const lit = lightK > 0 ? lightK * Math.exp(-(dx * dx + dy * dy) / lightR2) : 0

                    const hj = hash3(i, j, seed + 2)
                    let cv = 0.12 + wr * 0.85 + (hj - 0.5) * 0.45 + lit * 0.3
                    if (wr > 0.55 && hash3(i, j, seed + 5) > 0.9) cv = 0.92 + 0.08 * hj
                    cv = Math.max(0, Math.min(1, cv))
                    const row = Math.round(cv * (NC - 1))

                    const ht = hash3(i, j, seed + 3)
                    const type = ht < charP ? 2 + Math.floor((ht / Math.max(1e-4, charP)) * CHARS.length) % CHARS.length : ht < charP + outP ? 1 : 0

                    const sg = sigmaAt(z)
                    const size = gBase * p
                    const k = size / G
                    const sa = Math.min(lastLevel, sg / Math.max(0.05, k))
                    let lv = 0
                    let best = 1e9
                    for (let l = 0; l < NL; l++) {
                        const d = Math.abs(LEVELS[l] - sa)
                        if (d < best) {
                            best = d
                            lv = l
                        }
                    }

                    ctx.globalAlpha = Math.max(0, Math.min(1, op * (farOp + (1 - farOp) * front) * (1 + lit * 1.5)))
                    const dw = CELL * k
                    ctx.drawImage(at, (type * NL + lv) * CELL, row * CELL, CELL, CELL, X - dw / 2, Y - dw / 2, dw, dw)

                    if (cv > hs && hotA > 0) {
                        const gs = size * (3.2 + sg * 0.15)
                        ctx.globalAlpha = Math.min(1, (hotA * (cv - hs)) / (1 - hs)) * (0.5 + 0.5 * front)
                        ctx.drawImage(gl, X - gs / 2, Y - gs / 2, gs, gs)
                    }
                }

                // hot nodes riding on the strands
                for (let e = 0; e < 2; e++) {
                    if (hash3(i, 70 + e, seed) >= nodeP) continue
                    const w = e === 0 ? 1 : -1
                    const z = za + ez * w
                    const p = F / Math.max(1, F - z)
                    const X = vx + (ax + ex * w - vx) * p + parX * z
                    const Y = vy + (ay + ey * w - vy) * p + parY * z
                    const sg = sigmaAt(z)
                    const ns2 = adv.nodeSize * f * p * (1 + sg * 0.08)
                    ctx.globalAlpha = 0.95 / (1 + sg * 0.15)
                    ctx.drawImage(nd, X - ns2 / 2, Y - ns2 / 2, ns2, ns2)
                }
            }
            ctx.globalAlpha = 1

            // grain
            if (adv.grain > 0 && grainPattern) {
                ctx.save()
                ctx.globalCompositeOperation = "lighter"
                ctx.globalAlpha = (adv.grain / 100) * 0.12
                ctx.translate(Math.random() * 128, Math.random() * 128)
                ctx.fillStyle = grainPattern
                ctx.fillRect(-128, -128, W + 256, H + 256)
                ctx.restore()
            }

            // vignette
            if (adv.vignette > 0) {
                ctx.globalCompositeOperation = "source-over"
                const vg = ctx.createRadialGradient(W / 2, H / 2, diag * 0.18, W / 2, H / 2, diag * 0.55)
                vg.addColorStop(0, "rgba(0,0,0,0)")
                vg.addColorStop(1, `rgba(0,0,0,${(adv.vignette / 100).toFixed(3)})`)
                ctx.fillStyle = vg
                ctx.fillRect(0, 0, W, H)
            }
            ctx.globalCompositeOperation = "source-over"
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointermove", onMove)
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
                overflow: "hidden",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                ...style,
                background,
                isolation: "isolate",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
