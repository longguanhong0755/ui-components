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

type RGB = [number, number, number]

const TAU = Math.PI * 2
const RIM_VERTS = 420
const GLOW_SEGS = 28
const BIN_ALPHA = [0.6, 1]

function parseColor(input: unknown, fb: RGB): RGB {
    if (typeof input !== "string") return fb
    const rgb = input.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i)
    if (rgb) return [+rgb[1], +rgb[2], +rgb[3]]
    const hex = input.match(/#([0-9a-f]{3,8})\b/i)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .slice(0, 3)
                .map((c) => c + c)
                .join("")
        else h = h.slice(0, 6)
        if (h.length !== 6) return fb
        const v = parseInt(h, 16)
        return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
    }
    return fb
}

function mix(a: RGB, b: RGB, t: number): RGB {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function css(c: RGB): string {
    return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
}

function rgbaStr(c: RGB, a: number): string {
    return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`
}

function clamp(v: number, lo: number, hi: number) {
    return v < lo ? lo : v > hi ? hi : v
}

function smoothstep(a: number, b: number, x: number) {
    const t = clamp((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)
}

function mulberry32(seed: number) {
    let a = seed
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function hash2(a: number, b: number) {
    let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
}

interface Field {
    n: number
    ax: Float32Array
    ay: Float32Array
    amp: Float32Array
    w1: Float32Array
    w2: Float32Array
    p1: Float32Array
    p2: Float32Array
    wt: Float32Array
    pt: Float32Array
    size: Float32Array
    rise: Float32Array
    life: Float32Array
    ph: Float32Array
    bins: Int32Array[]
}

// Points inside the unit disc (y down): a dense carpet over the lower half,
// a packed band hugging the lower rim, sparse pale specks in the upper centre.
function buildField(n: number, seed: number): Field {
    const rnd = mulberry32(seed)
    const ax = new Float32Array(n)
    const ay = new Float32Array(n)
    const amp = new Float32Array(n)
    const w1 = new Float32Array(n)
    const w2 = new Float32Array(n)
    const p1 = new Float32Array(n)
    const p2 = new Float32Array(n)
    const wt = new Float32Array(n)
    const pt = new Float32Array(n)
    const size = new Float32Array(n)
    const rise = new Float32Array(n)
    const life = new Float32Array(n)
    const ph = new Float32Array(n)
    const lists: number[][] = Array.from({ length: 10 }, () => [])
    let k = 0
    let guard = 0
    while (k < n && guard < n * 80) {
        guard++
        let x: number
        let y: number
        let r: number
        let tone: number
        if (rnd() < 0.3) {
            // Rim band: packed against the lower and side rim
            const th = rnd() * TAU
            r = 0.86 + Math.sqrt(rnd()) * 0.115
            x = Math.cos(th) * r
            y = Math.sin(th) * r
            if (rnd() > smoothstep(-0.55, 0.35, y)) continue
            const q = rnd()
            tone = q < 0.45 ? 3 : q < 0.8 ? 2 : 0
        } else {
            x = rnd() * 2 - 1
            y = rnd() * 2 - 1
            r = Math.hypot(x, y)
            if (r > 0.975) continue
            const bottom = Math.pow(smoothstep(-0.2, 0.9, y), 1.2)
            const edge = smoothstep(0.62, 0.97, r) * smoothstep(-0.75, 0.25, y)
            const w = Math.max(bottom, edge * 0.85)
            if (rnd() > 0.015 + 0.985 * w) continue
            if (w < 0.12) tone = 4
            else {
                const q = rnd()
                tone = q < 0.3 ? 0 : q < 0.5 ? 1 : q < 0.8 ? 2 : 3
            }
        }
        ax[k] = x
        ay[k] = y
        amp[k] = 0.002 + rnd() * 0.006
        w1[k] = 0.8 + rnd() * 2.4
        w2[k] = 0.8 + rnd() * 2.4
        p1[k] = rnd() * TAU
        p2[k] = rnd() * TAU
        wt[k] = 2 + rnd() * 6
        pt[k] = rnd() * TAU
        size[k] = tone === 4 ? 1.8 : rnd() < 0.22 ? 2.1 : 1.3
        // Upward drift: each point climbs `rise` (disc units) over `life` seconds,
        // centred on its anchor so the bottom-heavy carpet keeps its shape.
        rise[k] = 0.16 + rnd() * 0.26
        life[k] = 2.5 + rnd() * 3.5
        ph[k] = rnd()
        const aIdx = tone === 4 ? 1 : rnd() < 0.5 ? 0 : 1
        lists[tone * 2 + aIdx].push(k)
        k++
    }
    return {
        n: k,
        ax,
        ay,
        amp,
        w1,
        w2,
        p1,
        p2,
        wt,
        pt,
        size,
        rise,
        life,
        ph,
        bins: lists.map((l) => Int32Array.from(l)),
    }
}

interface Strand {
    m: number[]
    a: number[]
    w: number[]
    p: number[]
    tm: number[]
    tw: number[]
    tp: number[]
}

// Each strand is a sum of integer-frequency sines around the circle (so it
// closes seamlessly) with fast-moving phases; tufts are a low-frequency,
// outward-only term used by the glow.
function buildStrands(count: number, seed: number): Strand[] {
    const rnd = mulberry32(seed)
    const bands: [number, number, number, number, number][] = [
        [6, 12, 0.35, 0.6, 1.6],
        [18, 34, 0.3, 1.5, 3.5],
        [40, 70, 0.22, 3, 7],
        [80, 130, 0.13, 6, 12],
    ]
    const out: Strand[] = []
    for (let s = 0; s < count; s++) {
        const st: Strand = { m: [], a: [], w: [], p: [], tm: [], tw: [], tp: [] }
        for (const [mLo, mHi, a, wLo, wHi] of bands) {
            st.m.push(Math.round(mLo + rnd() * (mHi - mLo)))
            st.a.push(a)
            st.w.push((wLo + rnd() * (wHi - wLo)) * (rnd() < 0.5 ? -1 : 1))
            st.p.push(rnd() * TAU)
        }
        for (let j = 0; j < 3; j++) {
            st.tm.push(4 + Math.floor(rnd() * 6))
            st.tw.push((0.4 + rnd() * 0.8) * (rnd() < 0.5 ? -1 : 1))
            st.tp.push(rnd() * TAU)
        }
        out.push(st)
    }
    return out
}

interface Arc {
    th: number
    len: number
    curl: number
    life: number
    dur: number
    drift: number
}

interface Props {
    speed?: number
    particleSpeed?: number
    ringSize?: number
    density?: number
    crackle?: number
    rimColor?: string
    baseColor?: string
    background?: string
    hoverEnabled?: boolean
    hoverIntensity?: number
    hoverTransition?: { type?: string; duration?: number; ease?: string }
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
function __BaseImpl_GetDescriptionFrames(props: Props) {
    const {
        speed = 100,
        particleSpeed = 50,
        ringSize = 68,
        density = 5000,
        crackle = 100,
        rimColor = "#DB53C3",
        baseColor = "#7255C6",
        background = "#000000",
        hoverEnabled = true,
        hoverIntensity = 100,
        hoverTransition = {"ease":"easeOut","mass":1,"type":"tween","damping":60,"duration":0.4,"stiffness":800},
        style,
    } = props

    const wrapRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef({
        speed,
        particleSpeed,
        ringSize,
        density,
        crackle,
        rimColor,
        baseColor,
        background,
        hoverEnabled,
        hoverIntensity,
        hoverTransition,
    })
    propsRef.current = {
        speed,
        particleSpeed,
        ringSize,
        density,
        crackle,
        rimColor,
        baseColor,
        background,
        hoverEnabled,
        hoverIntensity,
        hoverTransition,
    }
    const redrawRef = useRef<() => void>(() => {})

    useEffect(() => {
        const wrap = wrapRef.current
        const canvas = canvasRef.current
        if (!wrap || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const target = RenderTarget.current()
        const reduced =
            typeof window !== "undefined" &&
            !!window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const still = reduced || target === RenderTarget.export || target === RenderTarget.thumbnail

        const cosT = new Float32Array(RIM_VERTS)
        const sinT = new Float32Array(RIM_VERTS)
        for (let i = 0; i < RIM_VERTS; i++) {
            cosT[i] = Math.cos((i / RIM_VERTS) * TAU)
            sinT[i] = Math.sin((i / RIM_VERTS) * TAU)
        }
        const core = new Float32Array(RIM_VERTS * 2)
        const glow = new Float32Array(RIM_VERTS * 2)

        let W = 0
        let H = 0
        let dpr = 1
        let field: Field | null = null
        let fieldN = -1
        let strands: Strand[] | null = null
        let strandCount = -1
        let t = 0
        let pTime = 0
        let last = 0
        let raf = 0
        const arcs: Arc[] = []
        let nextArc = 0.3
        const rnd = mulberry32(7)
        const hover = { target: false, value: 0 }

        const updateArcs = (d: number) => {
            nextArc -= d
            if (nextArc <= 0 && arcs.length < 3) {
                arcs.push({
                    th: -Math.PI / 2 + (rnd() - 0.5) * 1.5,
                    len: (0.05 + rnd() * 0.07) * (rnd() < 0.5 ? -1 : 1),
                    curl: 0.02 + rnd() * 0.04,
                    life: 0,
                    dur: 0.2 + rnd() * 0.2,
                    drift: (rnd() - 0.5) * 0.3,
                })
                nextArc = 0.15 + rnd() * 0.6
            }
            for (let i = arcs.length - 1; i >= 0; i--) {
                const a = arcs[i]
                a.life += d
                a.th += a.drift * d
                if (a.life >= a.dur) arcs.splice(i, 1)
            }
        }

        const render = (arcsOn: boolean) => {
            if (W < 2 || H < 2) return
            const p = propsRef.current
            // Density 5000 ≈ 15k points: the reference's lower half is a solid carpet.
            const n = Math.round(clamp(p.density, 1000, 10000) * 3)
            if (!field || fieldN !== n) {
                field = buildField(n, 1337)
                fieldN = n
            }
            const c = clamp(p.crackle, 0, 100) / 100
            const hoverAmpBoost = p.hoverEnabled ? hover.value * (clamp(p.hoverIntensity, 0, 100) / 100) : 0
            const cAmp = clamp(c + hoverAmpBoost, 0, 1)
            const sc = 2 + Math.round(c * 4)
            if (!strands || strandCount !== sc) {
                strands = buildStrands(sc, 99)
                strandCount = sc
            }

            const bg = parseColor(p.background, [0, 0, 0])
            const rim = parseColor(p.rimColor, [219, 83, 195])
            const base = parseColor(p.baseColor, [114, 85, 198])
            const rimCore = css(mix(rim, [255, 255, 255], 0.72))
            const rimMid = css(mix(rim, [0, 0, 0], 0.15))
            const rimDeep = css(mix(rim, [0, 0, 0], 0.45))
            const rimCss = css(rim)
            const tones = [
                css(mix(base, [120, 100, 240], 0.3)),
                css(mix(base, [167, 105, 214], 0.5)),
                css(mix(base, [60, 80, 225], 0.65)),
                css(mix(base, [80, 190, 255], 0.65)),
                css(mix(base, [225, 215, 245], 0.7)),
            ]
            const haze = mix(base, [0, 0, 0], 0.6)
            const edgeBlue = mix(base, [51, 63, 147], 0.6)
            const arcCore = css(mix(base, [90, 210, 255], 0.7))
            const arcGlow = css(mix(base, [51, 63, 147], 0.5))

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalCompositeOperation = "source-over"
            ctx.globalAlpha = 1
            ctx.fillStyle = css(bg)
            ctx.fillRect(0, 0, W, H)

            // Ring Size scales the whole ring: radius, rim widths, glow and particles.
            const m = Math.min(W, H) * (clamp(p.ringSize, 20, 150) / 100)
            const cx = W / 2
            const cy = H / 2
            const R = m * 0.47
            const s = m / 1150

            // Interior haze: pooled low in the disc, upper half stays black.
            ctx.save()
            ctx.beginPath()
            ctx.arc(cx, cy, R, 0, TAU)
            ctx.clip()
            const hy = cy + R * 0.9
            const g = ctx.createRadialGradient(cx, hy, 0, cx, hy, R * 1.05)
            g.addColorStop(0, rgbaStr(haze, 0.5))
            g.addColorStop(0.6, rgbaStr(haze, 0.22))
            g.addColorStop(1, rgbaStr(haze, 0))
            ctx.fillStyle = g
            ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
            // Blue inner band along the lower/side rim (offset centre fades it at the top)
            const eg = ctx.createRadialGradient(cx, cy - R * 0.2, 0, cx, cy - R * 0.2, R * 1.2)
            eg.addColorStop(0, rgbaStr(edgeBlue, 0))
            eg.addColorStop(0.62, rgbaStr(edgeBlue, 0))
            eg.addColorStop(0.85, rgbaStr(edgeBlue, 0.22))
            eg.addColorStop(1, rgbaStr(edgeBlue, 0.5))
            ctx.fillStyle = eg
            ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
            ctx.restore()

            ctx.globalCompositeOperation = "lighter"

            // Particle field
            const f = field
            const ps = Math.max(1, s * 1.1)
            for (let b = 0; b < 10; b++) {
                const list = f.bins[b]
                if (!list.length) continue
                ctx.fillStyle = tones[b >> 1]
                ctx.globalAlpha = BIN_ALPHA[b & 1]
                for (let j = 0; j < list.length; j++) {
                    const i = list[j]
                    if (Math.sin(pTime * f.wt[i] + f.pt[i]) < -0.75) continue
                    const a = f.amp[i]
                    let u = pTime / f.life[i] + f.ph[i]
                    u -= Math.floor(u)
                    const env = Math.sin(Math.PI * u)
                    if (env < 0.08) continue
                    const px = f.ax[i] + a * Math.sin(pTime * f.w1[i] + f.p1[i])
                    const py = f.ay[i] + f.rise[i] * (0.5 - u) + a * Math.cos(pTime * f.w2[i] + f.p2[i])
                    if (px * px + py * py > 0.95) continue
                    const x = cx + px * R
                    const y = cy + py * R
                    const z = f.size[i] * ps * (0.35 + 0.95 * env)
                    ctx.fillRect(x - z / 2, y - z / 2, z, z)
                }
            }

            // Broad halo outside, inner halo and a solid hot band under the strands
            ctx.lineCap = "butt"
            ctx.lineJoin = "round"
            ctx.globalAlpha = 0.18
            ctx.strokeStyle = rimDeep
            ctx.lineWidth = m * 0.07
            ctx.beginPath()
            ctx.arc(cx, cy, R + m * 0.01, 0, TAU)
            ctx.stroke()
            ctx.globalAlpha = 0.12
            ctx.strokeStyle = rimCss
            ctx.lineWidth = m * 0.03
            ctx.beginPath()
            ctx.arc(cx, cy, R - m * 0.018, 0, TAU)
            ctx.stroke()
            ctx.globalAlpha = 0.55
            ctx.strokeStyle = rimCss
            ctx.lineWidth = m * 0.011
            ctx.beginPath()
            ctx.arc(cx, cy, R, 0, TAU)
            ctx.stroke()

            // Plasma strands
            const A = m * 0.0075 * (0.3 + 1.4 * cAmp)
            const T = m * 0.03 * (0.4 + 1.2 * cAmp)
            const jit = A * 0.3
            const frame = Math.floor(t * 24)
            const segLen = RIM_VERTS / GLOW_SEGS
            const gk = Math.min(1, 2.4 / strands.length)
            const passes: [number, number, string][] = [
                [m * 0.07, 0.07, rimDeep],
                [m * 0.04, 0.16, rimDeep],
                [m * 0.022, 0.28, rimMid],
                [m * 0.011, 0.38, rimCss],
            ]

            for (let k = 0; k < strands.length; k++) {
                const st = strands[k]
                for (let i = 0; i < RIM_VERTS; i++) {
                    const th = (i / RIM_VERTS) * TAU
                    let v = 0
                    for (let j = 0; j < st.m.length; j++) v += st.a[j] * Math.sin(st.m[j] * th + st.w[j] * t + st.p[j])
                    let tf = 0
                    for (let j = 0; j < st.tm.length; j++) tf += Math.sin(st.tm[j] * th + st.tw[j] * t + st.tp[j])
                    tf = Math.max(0, tf / 3)
                    tf *= tf
                    const rc = R + A * v + jit * (hash2(i + k * 1013, frame) - 0.5)
                    const rg = rc + T * tf
                    core[i * 2] = cx + cosT[i] * rc
                    core[i * 2 + 1] = cy + sinT[i] * rc
                    glow[i * 2] = cx + cosT[i] * rg
                    glow[i * 2 + 1] = cy + sinT[i] * rg
                }

                for (const [lw, al, col] of passes) {
                    ctx.lineWidth = Math.max(1, lw)
                    ctx.strokeStyle = col
                    for (let gI = 0; gI < GLOW_SEGS; gI++) {
                        const i0 = Math.round(gI * segLen)
                        const i1 = Math.round((gI + 1) * segLen)
                        const mid = ((i0 + i1) / 2 / RIM_VERTS) * TAU
                        const top = Math.max(0, -Math.sin(mid))
                        ctx.globalAlpha = al * gk * (1 - 0.35 * Math.pow(top, 1.5))
                        ctx.beginPath()
                        ctx.moveTo(glow[i0 * 2], glow[i0 * 2 + 1])
                        for (let i = i0 + 1; i <= i1; i++) {
                            const w = i % RIM_VERTS
                            ctx.lineTo(glow[w * 2], glow[w * 2 + 1])
                        }
                        ctx.stroke()
                    }
                }

                ctx.beginPath()
                ctx.moveTo(core[0], core[1])
                for (let i = 1; i < RIM_VERTS; i++) ctx.lineTo(core[i * 2], core[i * 2 + 1])
                ctx.closePath()
                ctx.globalAlpha = 0.45
                ctx.strokeStyle = rimCss
                ctx.lineWidth = Math.max(1.6, 3.5 * s)
                ctx.stroke()
                ctx.globalAlpha = 0.85
                ctx.strokeStyle = rimCore
                ctx.lineWidth = Math.max(1, 1.4 * s)
                ctx.stroke()
            }

            // Brief blue curls just inside the top rim
            if (arcsOn) {
                const ar = R * 0.955
                for (const a of arcs) {
                    const env = Math.sin((Math.PI * a.life) / a.dur)
                    if (env <= 0) continue
                    const t2 = a.th + a.len
                    const tm = a.th + a.len / 2
                    const rm = R * (0.955 - a.curl)
                    ctx.beginPath()
                    ctx.moveTo(cx + Math.cos(a.th) * ar, cy + Math.sin(a.th) * ar)
                    ctx.quadraticCurveTo(cx + Math.cos(tm) * rm, cy + Math.sin(tm) * rm, cx + Math.cos(t2) * ar, cy + Math.sin(t2) * ar)
                    ctx.globalAlpha = 0.35 * env
                    ctx.strokeStyle = arcGlow
                    ctx.lineWidth = Math.max(2, 4 * s)
                    ctx.stroke()
                    ctx.globalAlpha = 0.9 * env
                    ctx.strokeStyle = arcCore
                    ctx.lineWidth = Math.max(1, 1.1 * s)
                    ctx.stroke()
                }
            }

            ctx.globalCompositeOperation = "source-over"
            ctx.globalAlpha = 1
        }

        const resize = () => {
            W = wrap.offsetWidth
            H = wrap.offsetHeight
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
            render(!still)
        }

        const ro = new ResizeObserver(resize)
        ro.observe(wrap)
        resize()

        redrawRef.current = () => {
            if (still) render(false)
        }

        const onPointerEnter = () => {
            hover.target = true
        }
        const onPointerLeave = () => {
            hover.target = false
        }
        wrap.addEventListener("pointerenter", onPointerEnter)
        wrap.addEventListener("pointerleave", onPointerLeave)

        if (!still) {
            const tick = (now: number) => {
                raf = requestAnimationFrame(tick)
                const dt = last ? Math.min((now - last) / 1000, 0.05) : 0
                last = now
                const p = propsRef.current
                if (p.hoverEnabled) {
                    const dur = Math.max(0.05, p.hoverTransition?.duration ?? 0.4)
                    hover.value += ((p.hoverEnabled && hover.target ? 1 : 0) - hover.value) * Math.min(1, dt / dur)
                } else {
                    hover.value = 0
                }
                const boost = 1 + hover.value * (clamp(p.hoverIntensity, 0, 100) / 100)
                const d = dt * (Math.max(0, p.speed) / 50) * boost
                t += d
                pTime += dt * (Math.max(0, p.particleSpeed) / 50) * boost
                updateArcs(d)
                render(true)
            }
            raf = requestAnimationFrame(tick)
        }

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            wrap.removeEventListener("pointerenter", onPointerEnter)
            wrap.removeEventListener("pointerleave", onPointerLeave)
            redrawRef.current = () => {}
        }
    }, [])

    useEffect(() => {
        redrawRef.current()
    }, [speed, particleSpeed, ringSize, density, crackle, rimColor, baseColor, background, hoverEnabled, hoverIntensity, hoverTransition])

    return (
        <div
            ref={wrapRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                ...style,
                position: "relative",
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
                }}
            />
        </div>
    )
}

const __presetProps = {
  "background": "#000000",
  "rimColor": "#00FF6B",
  "baseColor": "#00FF30",
  "speed": 100,
  "particleSpeed": 50,
  "ringSize": 56,
  "density": 5000,
  "crackle": 100,
  "hoverEnabled": true,
  "hoverIntensity": 200,
  "hoverTransition": {
    "ease": "easeOut",
    "mass": 1,
    "type": "tween",
    "damping": 60,
    "duration": 0.4,
    "stiffness": 800
  }
};

export default function GetDescriptionFrames(props: Record<string, unknown>) {
  return <__BaseImpl_GetDescriptionFrames {...(__presetProps as Record<string, unknown>)} {...props} />;
}
