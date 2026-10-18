"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    loopSec: 5,
    smallRise: 2,
    largeRise: 1,
    smallCutoff: 60,
    swayAmp: 12,
    swayCycles: 2,
    wobbleAmt: 3,
    wobbleCycles: 5,
    rimWidth: 100,
    rimFade: 25,
    aberration: 100,
    rimRed: "#D8345A",
    rimBlue: "#3060FF",
    rimCyan: "#38C8E8",
    rimYellow: "#B8D040",
    rimOrange: "#E89040",
    crescentLeft: 10,
    crescentRight: 7,
    crescentInset: 6,
    crescentSpan: 55,
    highlightPink: "#F4B8C8",
    highlightRed: "#E04060",
    highlightBlue: "#4A7CFF",
    highlightCyan: "#60D0FF",
    bodyTint: 25,
    bodyWarm: "#2A2129",
    bodyCool: "#272E4C",
    gap: 20,
    dither: 50,
    pushRadius: 15,
    pushAmount: 4,
    pressBoost: 100,
    pressMs: 600,
    pointerEase: 350,
    seed: 1,
    grain: 0,
    vignette: 0,
    hover: 50,
}

const REF_W = 600
const REF_H = 1200

// Reference layout in a 600×1200 frame: [x, y, diameter, cool left crescent]
const BUBBLES: [number, number, number, number][] = [
    [314, 398, 280, 1],
    [349, 568, 145, 1],
    [240, 94, 145, 0],
    [152, 141, 112, 0],
    [76, 270, 76, 0],
    [146, 264, 94, 0],
    [436, 64, 46, 0],
    [486, 105, 54, 0],
    [404, 182, 82, 0],
    [486, 188, 70, 0],
    [530, 198, 70, 0],
    [510, 322, 82, 0],
    [504, 516, 46, 0],
    [84, 439, 70, 0],
    [97, 572, 54, 0],
    [164, 612, 70, 0],
    [209, 636, 26, 0],
    [196, 709, 70, 0],
    [152, 892, 100, 0],
    [248, 974, 70, 0],
    [206, 1072, 70, 0],
    [283, 711, 54, 0],
    [285, 762, 60, 0],
    [375, 757, 50, 0],
    [362, 790, 50, 0],
    [453, 697, 36, 0],
    [449, 762, 54, 0],
    [496, 755, 36, 0],
    [446, 790, 60, 0],
    [476, 845, 60, 0],
    [281, 838, 54, 0],
    [418, 1012, 70, 0],
    [360, 1046, 50, 0],
    [357, 1128, 30, 0],
    [320, 1150, 36, 0],
]

const BAYER = [0, 0.5, 0.75, 0.25]
const WHITE: RGB = [1, 1, 1]

type RGB = [number, number, number]

const colorCache = new Map<string, RGB>()
function parseColor(input: any, fallback: RGB): RGB {
    if (typeof input !== "string") return fallback
    const hit = colorCache.get(input)
    if (hit) return hit
    let out: RGB = fallback
    const hex = input.match(/#([0-9a-f]{3,8})\b/i)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((ch) => ch + ch)
                .join("")
        out = [
            parseInt(h.slice(0, 2), 16) / 255,
            parseInt(h.slice(2, 4), 16) / 255,
            parseInt(h.slice(4, 6), 16) / 255,
        ]
    } else {
        const rgb = input.match(/rgba?\(([^)]+)\)/i)
        if (rgb) {
            const parts = rgb[1].split(/[ ,/]+/).filter(Boolean)
            out = [
                Math.min(1, parseFloat(parts[0]) / 255) || 0,
                Math.min(1, parseFloat(parts[1]) / 255) || 0,
                Math.min(1, parseFloat(parts[2]) / 255) || 0,
            ]
        }
    }
    colorCache.set(input, out)
    return out
}

const num = (v: any, d: number) =>
    typeof v === "number" && isFinite(v) ? v : d
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const fract = (x: number) => x - Math.floor(x)
const hash = (i: number, k: number, seed: number) =>
    fract(Math.sin(i * 12.9898 + k * 78.233 + seed * 3.7191) * 43758.5453)
const mix = (a: RGB, b: RGB, t: number): RGB => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
]

const NB = BUBBLES.length
// Draw order for Bubble Count: the two cool hero bubbles first, then a fixed
// scatter, so lowering the count thins the field evenly instead of top-down.
const ORDER = BUBBLES.map((_, i) => i).sort(
    (a, b) =>
        BUBBLES[b][3] - BUBBLES[a][3] ||
        fract(Math.sin(a * 91.7) * 43758.5) -
            fract(Math.sin(b * 91.7) * 43758.5)
)

interface Inst {
    cx: number
    cy: number
    R: number
    sx: number
    sy: number
    cool: boolean
    hueOff: number
}

export interface FieldAboutPixelProps {
    background?: string
    speed?: number
    scale?: number
    count?: number
    pixelSize?: number
    rimHue?: number
    advanced?: {
        loopSec?: number
        smallRise?: number
        largeRise?: number
        smallCutoff?: number
        swayAmp?: number
        swayCycles?: number
        wobbleAmt?: number
        wobbleCycles?: number
        rimWidth?: number
        rimFade?: number
        aberration?: number
        rimRed?: string
        rimBlue?: string
        rimCyan?: string
        rimYellow?: string
        rimOrange?: string
        crescentLeft?: number
        crescentRight?: number
        crescentInset?: number
        crescentSpan?: number
        highlightPink?: string
        highlightRed?: string
        highlightBlue?: string
        highlightCyan?: string
        bodyTint?: number
        bodyWarm?: string
        bodyCool?: string
        gap?: number
        dither?: number
        pushRadius?: number
        pushAmount?: number
        pressBoost?: number
        pressMs?: number
        pointerEase?: number
        seed?: number
        grain?: number
        vignette?: number
        hover?: number
    }
    style?: CSSProperties
}

/**
 * Pixel-art soap bubbles drifting upward in a seamless loop.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function FieldAboutPixel(props: FieldAboutPixelProps) {
    const {
        speed = 50,
        scale = 100,
        count = 35,
        pixelSize = 2,
        rimHue = 50,
        background = "#000000",
        style,
    } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = {
        ...props,
        speed,
        scale,
        count,
        pixelSize,
        rimHue,
        background,
    }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const grid = document.createElement("canvas")
        const gctx = grid.getContext("2d")
        if (!gctx) return

        // Grain tile, made once
        const noise = document.createElement("canvas")
        noise.width = noise.height = 128
        const nctx = noise.getContext("2d")
        if (nctx) {
            const nd = nctx.createImageData(128, 128)
            for (let i = 0; i < nd.data.length; i += 4) {
                const g = Math.random() * 255
                nd.data[i] = nd.data[i + 1] = nd.data[i + 2] = g
                nd.data[i + 3] = 255
            }
            nctx.putImageData(nd, 0, 0)
        }

        const size = { w: 0, h: 0, dpr: 1 }
        const resize = () => {
            size.w = root.offsetWidth
            size.h = root.offsetHeight
            size.dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(size.w * size.dpr))
            canvas.height = Math.max(1, Math.round(size.h * size.dpr))
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        let reduced = false
        const mq = window.matchMedia
            ? window.matchMedia("(prefers-reduced-motion: reduce)")
            : null
        const onMq = () => (reduced = !!mq?.matches)
        onMq()
        mq?.addEventListener?.("change", onMq)

        const ptr = {
            inside: false,
            down: false,
            downUntil: 0,
            tx: 0,
            ty: 0,
            mx: 0,
            my: 0,
            px: 0,
            py: 0,
            overM: 0,
            over: 0,
            boostM: 0,
            boost: 0,
        }
        const snap = (x: number, y: number) => {
            ptr.mx = ptr.px = x
            ptr.my = ptr.py = y
        }
        const onMove = (e: PointerEvent) => {
            ptr.tx = e.offsetX
            ptr.ty = e.offsetY
            if (!ptr.inside && ptr.over < 0.05) snap(ptr.tx, ptr.ty)
            ptr.inside = true
        }
        const onLeave = () => {
            ptr.inside = false
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            const adv = {
                ...ADVANCED_DEFAULTS,
                ...(propsRef.current.advanced ?? {}),
            }
            ptr.down = true
            ptr.downUntil = performance.now() + num(adv.pressMs, 600)
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

        let buf = new Float32Array(0)
        let img: ImageData | null = null
        let gw = 0
        let gh = 0
        let time = 0
        let last = -1
        let raf = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const W = size.w
            const H = size.h
            const dpr = size.dpr
            let dt = last < 0 ? 0 : (now - last) / 1000
            last = now
            dt = Math.min(dt, 1 / 20)
            if (W < 2 || H < 2) return

            const spd = clamp(num(p.speed, 50), 0, 100)
            if (!reduced) time += dt * (spd / 50)
            const T = Math.max(1, num(adv.loopSec, 20))
            const uu = (time % T) / T

            // Pointer easing (two-stage exponential: eased in and out)
            const hoverK = clamp(num(adv.hover, 50), 0, 100) / 50
            const easeS = Math.max(0.05, num(adv.pointerEase, 350) / 1000)
            const k = 1 - Math.exp((-dt * 7) / easeS)
            ptr.overM += ((ptr.inside ? 1 : 0) - ptr.overM) * k
            ptr.over += (ptr.overM - ptr.over) * k
            ptr.mx += (ptr.tx - ptr.mx) * k
            ptr.my += (ptr.ty - ptr.my) * k
            ptr.px += (ptr.mx - ptr.px) * k
            ptr.py += (ptr.my - ptr.py) * k
            const pressOn = ptr.down || now < ptr.downUntil
            const kb = 1 - Math.exp(-dt * 14)
            ptr.boostM += ((pressOn ? 1 : 0) - ptr.boostM) * kb
            ptr.boost += (ptr.boostM - ptr.boost) * kb

            // Grid
            const c = clamp(num(p.pixelSize, 3), 2, 40)
            const ngw = Math.max(1, Math.ceil(W / c))
            const ngh = Math.max(1, Math.ceil(H / c))
            if (ngw !== gw || ngh !== gh || !img) {
                gw = ngw
                gh = ngh
                grid.width = gw
                grid.height = gh
                img = gctx.createImageData(gw, gh)
                buf = new Float32Array(gw * gh * 3)
            }
            const bg = parseColor(p.background, [0, 0, 0])
            for (let i = 0; i < buf.length; i += 3) {
                buf[i] = bg[0]
                buf[i + 1] = bg[1]
                buf[i + 2] = bg[2]
            }

            // Layout: the reference column, tiled sideways (odd tiles mirrored)
            const sc = clamp(num(p.scale, 100), 50, 200) / 100
            const s = (H / REF_H) * sc
            const tw = REF_W * s
            const th = REF_H * s
            const ox0 = W / 2 - tw / 2
            const oy0 = H / 2 - th / 2
            const K = Math.ceil(W / 2 / tw) + 1
            const minWH = Math.min(W, H)
            const seed = num(adv.seed, 1)
            const smallCut = num(adv.smallCutoff, 60)
            const smallRise = Math.max(0, Math.round(num(adv.smallRise, 2)))
            const largeRise = Math.max(0, Math.round(num(adv.largeRise, 1)))
            const swayAmp = num(adv.swayAmp, 12)
            const swayN = Math.max(1, Math.round(num(adv.swayCycles, 2)))
            const wobN = Math.max(1, Math.round(num(adv.wobbleCycles, 5)))
            const wob = reduced
                ? 0
                : (num(adv.wobbleAmt, 3) / 100) *
                  (1 +
                      ptr.boost *
                          (num(adv.pressBoost, 100) / 100) *
                          hoverK)
            const pushR = (num(adv.pushRadius, 15) / 100) * minWH
            const pushA = (num(adv.pushAmount, 4) / 100) * minWH
            const pushK = ptr.over * hoverK
            const TAU = Math.PI * 2
            const bubbleN = clamp(Math.round(num(p.count, 35)), 1, NB * 2)

            const insts: Inst[] = []
            for (let kk = -K; kk <= K; kk++) {
                const mirror = Math.abs(kk) % 2 === 1
                const yOff = kk === 0 ? 0 : fract(kk * 0.618) * REF_H
                for (let n = 0; n < bubbleN; n++) {
                    // Past 35, extra bubbles reuse the layout mirrored, half
                    // a column lower and at 70% size, with their own phases
                    const i = n < NB ? ORDER[n] : ORDER[n - NB] + NB
                    const extra = i >= NB
                    const [bx1, by1, d1, cool] = BUBBLES[i % NB]
                    const bx0 = extra ? REF_W - bx1 : bx1
                    const by0 = extra ? by1 + REF_H / 2 : by1
                    const d = extra ? d1 * 0.7 : d1
                    const small = d < smallCut
                    const laps = small ? smallRise : largeRise
                    let yr = by0 + yOff - laps * REF_H * uu
                    yr = ((yr % REF_H) + REF_H) % REF_H
                    const phi = hash(i, 1, seed) * TAU + kk * 1.7
                    const sn = swayN + (i % 2)
                    const A = swayAmp * (small ? 1.4 : d > 120 ? 0.6 : 1)
                    const xr0 = mirror ? REF_W - bx0 : bx0
                    const xr =
                        xr0 + A * (Math.sin(TAU * sn * uu + phi) - Math.sin(phi))
                    const m = wobN + (i % 3)
                    const psi = hash(i, 2, seed) < 0.5 ? 0 : Math.PI
                    const sx = 1 + wob * Math.sin(TAU * m * uu + psi)
                    const sy = 1 / sx
                    const Rd = (d / 2) * s
                    const hueOff = (hash(i, 3, seed) - 0.5) * 40
                    for (let j = -2; j <= 2; j++) {
                        let bx = ox0 + kk * tw + xr * s
                        let by = oy0 + (yr + j * REF_H) * s
                        if (by + Rd * 1.2 < 0 || by - Rd * 1.2 > H) continue
                        if (bx + Rd * 1.2 + pushA < 0) continue
                        if (bx - Rd * 1.2 - pushA > W) continue
                        if (pushK > 0.001) {
                            const dx = bx - ptr.px
                            const dy = by - ptr.py
                            const dist = Math.sqrt(dx * dx + dy * dy)
                            const reach = pushR + Rd * 0.5
                            if (dist < reach && dist > 0.001) {
                                let f = 1 - dist / reach
                                f = f * f * (3 - 2 * f)
                                const amt = pushA * f * pushK
                                bx += (dx / dist) * amt
                                by += (dy / dist) * amt
                            }
                        }
                        insts.push({
                            cx: bx / c,
                            cy: by / c,
                            R: Rd / c,
                            sx,
                            sy,
                            cool: !!cool,
                            hueOff,
                        })
                    }
                }
            }

            // Colours
            const red = parseColor(adv.rimRed, [0.85, 0.2, 0.35])
            const blue = parseColor(adv.rimBlue, [0.19, 0.38, 1])
            const cyan = parseColor(adv.rimCyan, [0.22, 0.78, 0.91])
            const yellow = parseColor(adv.rimYellow, [0.72, 0.82, 0.25])
            const orange = parseColor(adv.rimOrange, [0.91, 0.56, 0.25])
            const stops: [number, RGB][] = [
                [0, red],
                [120, red],
                [170, blue],
                [220, cyan],
                [255, yellow],
                [282, orange],
                [315, blue],
            ]
            const hPink = parseColor(adv.highlightPink, [0.96, 0.72, 0.78])
            const hRed = parseColor(adv.highlightRed, [0.88, 0.25, 0.38])
            const hBlue = parseColor(adv.highlightBlue, [0.29, 0.49, 1])
            const hCyan = parseColor(adv.highlightCyan, [0.38, 0.82, 1])
            const coolMid = mix(hBlue, WHITE, 0.55)
            const warm = parseColor(adv.bodyWarm, [0.16, 0.13, 0.16])
            const coolB = parseColor(adv.bodyCool, [0.15, 0.18, 0.3])
            const bodyA = clamp(num(adv.bodyTint, 25), 0, 100) / 100
            const rimHalf = Math.max(0.2, num(adv.rimWidth, 100) / 100) / 2
            const fade = clamp(num(adv.rimFade, 25), 0, 100) / 100
            const ab = (num(adv.aberration, 100) / 100) * 0.5
            const ditherK = clamp(num(adv.dither, 50), 0, 100) / 50
            const ditherDeg = 20 * ditherK
            const drift = (num(p.rimHue, 50) / 50) * 360 * uu
            const inset = clamp(num(adv.crescentInset, 6), 0, 40) / 100
            const ri = 1 - inset
            const span = Math.max(0.1, num(adv.crescentSpan, 55) / 100)
            const offLBase = (num(adv.crescentLeft, 10) / 100) * 2
            const offRBase = (num(adv.crescentRight, 7) / 100) * 2

            const stopColor = (deg: number): RGB => {
                const a = ((deg % 360) + 360) % 360
                let best = stops[0][1]
                let bd = 999
                for (let q = 0; q < stops.length; q++) {
                    let dd = Math.abs(a - stops[q][0])
                    if (dd > 180) dd = 360 - dd
                    if (dd < bd) {
                        bd = dd
                        best = stops[q][1]
                    }
                }
                return best
            }
            const screen = (idx: number, r: number, g: number, b: number) => {
                buf[idx] = 1 - (1 - buf[idx]) * (1 - r)
                buf[idx + 1] = 1 - (1 - buf[idx + 1]) * (1 - g)
                buf[idx + 2] = 1 - (1 - buf[idx + 2]) * (1 - b)
            }
            const cov = (d: number) => {
                const v = rimHalf + 0.5 - Math.abs(d)
                return v < 0 ? 0 : v > 1 ? 1 : v
            }
            // Crescent colour by how deep into the band a cell sits
            const ramp = (lvl: number, mid: RGB, edge: RGB): RGB | null =>
                lvl > 0.72 ? WHITE : lvl > 0.38 ? mid : lvl > 0.04 ? edge : null

            // Pass 1: bodies
            if (bodyA > 0) {
                for (const b of insts) {
                    const rx = Math.max(0.5, b.R * b.sx)
                    const ry = Math.max(0.5, b.R * b.sy)
                    const x0 = Math.max(0, Math.floor(b.cx - rx - 1))
                    const x1 = Math.min(gw - 1, Math.ceil(b.cx + rx + 1))
                    const y0 = Math.max(0, Math.floor(b.cy - ry - 1))
                    const y1 = Math.min(gh - 1, Math.ceil(b.cy + ry + 1))
                    for (let gy = y0; gy <= y1; gy++) {
                        const v = (gy + 0.5 - b.cy) / ry
                        for (let gx = x0; gx <= x1; gx++) {
                            const u = (gx + 0.5 - b.cx) / rx
                            if (u * u + v * v >= 1) continue
                            const bay = BAYER[(gx & 1) | ((gy & 1) << 1)]
                            const t = u + (bay - 0.375) * 0.5 < 0 ? warm : coolB
                            const idx = (gy * gw + gx) * 3
                            buf[idx] += (t[0] - buf[idx]) * bodyA
                            buf[idx + 1] += (t[1] - buf[idx + 1]) * bodyA
                            buf[idx + 2] += (t[2] - buf[idx + 2]) * bodyA
                        }
                    }
                }
            }

            // Pass 2: rims, crescents, specular
            const reach = rimHalf + 0.5 + ab + 0.01
            for (const b of insts) {
                const R = Math.max(0.5, b.R)
                const rx = Math.max(0.5, R * b.sx)
                const ry = Math.max(0.5, R * b.sy)
                // Small bubbles keep at least a one-cell bar on each side
                const offL = Math.max(offLBase, 1.3 / R)
                const offR = Math.max(offRBase, 1.1 / R)
                const x0 = Math.max(0, Math.floor(b.cx - rx - reach - 1))
                const x1 = Math.min(gw - 1, Math.ceil(b.cx + rx + reach + 1))
                const y0 = Math.max(0, Math.floor(b.cy - ry - reach - 1))
                const y1 = Math.min(gh - 1, Math.ceil(b.cy + ry + reach + 1))
                const lMid = b.cool ? coolMid : hPink
                const lEdge = b.cool ? hBlue : hRed
                for (let gy = y0; gy <= y1; gy++) {
                    const py = gy + 0.5 - b.cy
                    const v = py / ry
                    const v2 = v * v
                    for (let gx = x0; gx <= x1; gx++) {
                        const px = gx + 0.5 - b.cx
                        const u = px / rx
                        const dn = Math.sqrt(u * u + v2)
                        const bay = BAYER[(gx & 1) | ((gy & 1) << 1)]
                        const idx = (gy * gw + gx) * 3
                        const dG = (dn - 1) * R
                        if (dG > -reach && dG < reach) {
                            const uR = (px - ab) / rx
                            const uB = (px + ab) / rx
                            const dR = (Math.sqrt(uR * uR + v2) - 1) * R
                            const dB = (Math.sqrt(uB * uB + v2) - 1) * R
                            const mR = cov(dR) > bay ? 1 : 0
                            const mG = cov(dG) > bay ? 1 : 0
                            const mB = cov(dB) > bay ? 1 : 0
                            if (mR || mG || mB) {
                                const th = (Math.atan2(v, u) * 180) / Math.PI
                                const cosT = dn > 0 ? u / dn : 0
                                const bright = fade + (1 - fade) * cosT * cosT
                                const col = stopColor(
                                    th -
                                        drift +
                                        b.hueOff +
                                        (bay - 0.375) * ditherDeg
                                )
                                screen(
                                    idx,
                                    col[0] * mR * bright,
                                    col[1] * mG * bright,
                                    col[2] * mB * bright
                                )
                            }
                        }
                        if (dn < ri && Math.abs(v) < span) {
                            const taper = 1 - (v2 / (span * span)) * 0.6
                            const jit = (bay - 0.375) * 0.3 * ditherK
                            // Left crescent
                            if (u < 0) {
                                const qx = u - offL
                                const q = Math.sqrt(qx * qx + v2)
                                if (q > ri) {
                                    const core =
                                        Math.min(ri - dn, q - ri) / (offL * 0.5)
                                    const col = ramp(
                                        Math.min(1, core) * taper + jit,
                                        lMid,
                                        lEdge
                                    )
                                    if (col) screen(idx, col[0], col[1], col[2])
                                }
                            }
                            // Right crescent
                            if (u > 0) {
                                const qx = u + offR
                                const q = Math.sqrt(qx * qx + v2)
                                if (q > ri) {
                                    const core =
                                        Math.min(ri - dn, q - ri) / (offR * 0.5)
                                    const col = ramp(
                                        Math.min(1, core) * taper + jit,
                                        hCyan,
                                        hBlue
                                    )
                                    if (col) screen(idx, col[0], col[1], col[2])
                                }
                            }
                        }
                    }
                }
                // Specular block, just above centre
                const spx = Math.floor(b.cx - 0.1 * rx)
                const spy = Math.floor(b.cy - 0.45 * ry)
                const sz = R > 12 ? 2 : 1
                for (let yy = spy; yy < spy + sz; yy++) {
                    for (let xx = spx; xx < spx + sz; xx++) {
                        if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue
                        const idx = (yy * gw + xx) * 3
                        buf[idx] = buf[idx + 1] = buf[idx + 2] = 1
                    }
                }
            }

            // Upload the grid and blow it up with hard edges
            const data = img!.data
            for (let i = 0, j = 0; i < buf.length; i += 3, j += 4) {
                data[j] = buf[i] * 255
                data[j + 1] = buf[i + 1] * 255
                data[j + 2] = buf[i + 2] * 255
                data[j + 3] = 255
            }
            gctx.putImageData(img!, 0, 0)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = "source-over"
            ctx.imageSmoothingEnabled = false
            ctx.clearRect(0, 0, W, H)
            ctx.drawImage(grid, 0, 0, gw * c, gh * c)

            // Dark gaps between cells (mosaic look)
            const gapPx = (c * clamp(num(adv.gap, 20), 0, 50)) / 100
            if (gapPx > 0.2) {
                ctx.fillStyle = `rgb(${Math.round(bg[0] * 255)},${Math.round(
                    bg[1] * 255
                )},${Math.round(bg[2] * 255)})`
                for (let x = 0; x <= gw; x++) ctx.fillRect(x * c, 0, gapPx, H)
                for (let y = 0; y <= gh; y++) ctx.fillRect(0, y * c, W, gapPx)
            }

            // Grain
            const grain = clamp(num(adv.grain, 0), 0, 100) / 100
            if (grain > 0) {
                const pat = ctx.createPattern(noise, "repeat")
                if (pat) {
                    ctx.save()
                    ctx.globalAlpha = grain * 0.5
                    ctx.globalCompositeOperation = "overlay"
                    const ox = Math.floor(Math.random() * 128)
                    const oy = Math.floor(Math.random() * 128)
                    ctx.translate(-ox, -oy)
                    ctx.fillStyle = pat
                    ctx.fillRect(0, 0, W + 128, H + 128)
                    ctx.restore()
                }
            }

            // Vignette
            const vig = clamp(num(adv.vignette, 0), 0, 100) / 100
            if (vig > 0) {
                const rOut = Math.sqrt(W * W + H * H) / 2
                const g = ctx.createRadialGradient(
                    W / 2,
                    H / 2,
                    rOut * 0.35,
                    W / 2,
                    H / 2,
                    rOut
                )
                g.addColorStop(0, "rgba(0,0,0,0)")
                g.addColorStop(1, `rgba(0,0,0,${vig})`)
                ctx.fillStyle = g
                ctx.fillRect(0, 0, W, H)
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            mq?.removeEventListener?.("change", onMq)
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
                minWidth: 1200,
                minHeight: 800,
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
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
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}
