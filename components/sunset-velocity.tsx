"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * Sunset drive — a still coupé in front of parallax wind-turbine layers that scroll endlessly.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    farSpeed: 2,
    midSpeed: 5,
    nearSpeed: 7,
    poleSpeed: 6,
    hedgeSpeed: 12,
    groundSpeed: 45,
    rotorSpeed: 60,
    farCount: 20,
    midCount: 8,
    nearSpacing: 500,
    nearHeight: 215,
    nearBlade: 135,
    sunSize: 130,
    sunX: 49,
    sunY: 33,
    sunGlow: 40,
    cloudOpacity: 85,
    cloudColor: "#6E2636",
    rimColor: "#F8C4B1",
    hazeColor: "#C9A8C0",
    hazeOpacity: 70,
    turbineNear: "#3A1820",
    turbineMid: "#4A1C27",
    turbineFar: "#7E3D5A",
    fieldColor: "#2E1A1E",
    roadColor: "#1B0B15",
    laneColor: "#EF6759",
    carRim: "#F8C4B1",
    wheelBlur: 60,
    seed: 7,
    grain: 0,
    vignette: 20,
    hover: 50,
}

const REF_W = 736
const REF_H = 414
const CX = REF_W / 2
const CY = REF_H / 2
const HORIZON = 268
const PX_PER_PCT = REF_W / 100
const TAU = Math.PI * 2

// ── colour helpers ──
const colorCache = new Map<string, number[]>()
function parseColor(c: string): number[] {
    const key = c || ""
    const hit = colorCache.get(key)
    if (hit) return hit
    let out = [0, 0, 0, 1]
    const s = key.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((x) => x + x)
                .join("")
        const n = parseInt(h.slice(0, 6), 16)
        const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
        if (!isNaN(n)) out = [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
    } else {
        const m = s.match(/rgba?\(([^)]+)\)/i)
        if (m) {
            const p = m[1]
                .split(/[\s,\/]+/)
                .filter(Boolean)
                .map(parseFloat)
            out = [p[0] || 0, p[1] || 0, p[2] || 0, p[3] === undefined || isNaN(p[3]) ? 1 : p[3]]
        }
    }
    if (colorCache.size > 256) colorCache.clear()
    colorCache.set(key, out)
    return out
}
function rgba(c: string, a: number) {
    const p = parseColor(c)
    return `rgba(${p[0] | 0},${p[1] | 0},${p[2] | 0},${Math.max(0, Math.min(1, p[3] * a))})`
}
function mix(a: string, b: string, t: number) {
    const p = parseColor(a)
    const q = parseColor(b)
    const r = p[0] + (q[0] - p[0]) * t
    const g = p[1] + (q[1] - p[1]) * t
    const bl = p[2] + (q[2] - p[2]) * t
    return `rgb(${r | 0},${g | 0},${bl | 0})`
}
function clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v))
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

// ── scene content (reference units: 736 × 414) ──
type Turb = { x: number; h: number; base: number; phase: number }
type Scene = {
    far: Turb[]
    mid: Turb[]
    nearPhase: number[]
    clouds: { x: number; y: number; w: number; h: number; a: number; tone: number }[]
    bushes: { x: number; w: number; h: number }[]
    speckles: { x: number; y: number; sz: number; c: number }[]
    tufts: { x: number; h: number; lean: number }[]
    streaks: { x: number; y: number; len: number }[]
}
const SPECKLE_COLORS = ["#3E2A2C", "#24141A", "#4A3032", "#503A36", "#CA424A"]

function genScene(seed: number, farN: number, midN: number): Scene {
    const rf = mulberry32(seed * 101 + 1)
    const far: Turb[] = []
    for (let i = 0; i < farN; i++)
        far.push({ x: ((i + rf() * 0.85) / farN) * 800, h: 26 + rf() * 26, base: 266.5 + rf() * 3, phase: rf() * TAU })
    const rm = mulberry32(seed * 103 + 2)
    const mid: Turb[] = []
    for (let i = 0; i < midN; i++)
        mid.push({ x: ((i + 0.15 + rm() * 0.7) / midN) * 900, h: 70 + rm() * 60, base: 271 + rm() * 5, phase: rm() * TAU })
    const rn = mulberry32(seed * 107 + 3)
    const nearPhase = [rn() * TAU, rn() * TAU]

    const rc = mulberry32(seed * 109 + 4)
    // x0, x1, y0, y1, count, h0, h1, tone (1 dark top band, 0 body, 2 pale low streak)
    const zones = [
        [-250, 1000, 0, 30, 10, 8, 20, 1],
        [-200, 340, 40, 118, 8, 6, 18, 0],
        [430, 1000, 50, 160, 10, 10, 30, 0],
        [200, 540, 122, 152, 3, 3, 6, 0],
        [-250, 1000, 160, 225, 7, 2.5, 6, 2],
    ]
    const clouds: Scene["clouds"] = []
    for (const z of zones)
        for (let i = 0; i < z[4]; i++)
            clouds.push({
                x: z[0] + rc() * (z[1] - z[0]),
                y: z[2] + rc() * (z[3] - z[2]),
                w: 110 + rc() * 300,
                h: z[5] + rc() * (z[6] - z[5]),
                a: 0.6 + rc() * 0.4,
                tone: z[7],
            })
    clouds.push({ x: 640, y: 108, w: 460, h: 72, a: 0.9, tone: 1 })
    clouds.push({ x: 120, y: 12, w: 520, h: 26, a: 0.9, tone: 1 })
    clouds.push({ x: 560, y: 16, w: 520, h: 30, a: 0.9, tone: 1 })

    const rb = mulberry32(seed * 113 + 5)
    const bushes: Scene["bushes"] = []
    for (let i = 0; i < 30; i++) bushes.push({ x: rb() * REF_W, w: 3 + rb() * 5, h: 2 + rb() * 2.5 })
    const speckles: Scene["speckles"] = []
    for (let i = 0; i < 150; i++) {
        const roll = rb()
        speckles.push({
            x: rb() * REF_W,
            y: 278 + rb() * 52,
            sz: 0.6 + rb() * 1.4,
            c: roll < 0.05 ? 4 : Math.floor(rb() * 4),
        })
    }
    const tufts: Scene["tufts"] = []
    for (let i = 0; i < 70; i++) tufts.push({ x: rb() * REF_W, h: 1.5 + rb() * 3, lean: (rb() - 0.5) * 2 })
    const streaks: Scene["streaks"] = []
    for (let i = 0; i < 40; i++) streaks.push({ x: rb() * REF_W, y: 338 + rb() * 72, len: 10 + rb() * 40 })
    return { far, mid, nearPhase, clouds, bushes, speckles, tufts, streaks }
}

function each(x0: number, off: number, P: number, L: number, R: number, m: number, fn: (x: number) => void) {
    if (!(P > 0)) return
    const b = (((x0 + off) % P) + P) % P
    let x = b + Math.ceil((L - m - b) / P) * P
    for (let g = 0; x <= R + m && g < 64; x += P, g++) fn(x)
}

function drawTurbine(
    ctx: CanvasRenderingContext2D,
    x: number,
    base: number,
    h: number,
    blade: number,
    ang: number,
    tw: number
) {
    const hy = base - h
    ctx.beginPath()
    ctx.moveTo(x - tw * 0.5, base)
    ctx.lineTo(x - tw * 0.3, hy)
    ctx.lineTo(x + tw * 0.3, hy)
    ctx.lineTo(x + tw * 0.5, base)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + tw * 0.5, hy, tw * 1.1, tw * 0.55, 0, 0, TAU)
    ctx.fill()
    const rw = Math.max(0.7, blade * 0.035)
    ctx.beginPath()
    for (let k = 0; k < 3; k++) {
        const a = ang + (k * TAU) / 3
        const dx = Math.sin(a)
        const dy = -Math.cos(a)
        const nx = Math.cos(a)
        const ny = Math.sin(a)
        ctx.moveTo(x + nx * rw * 0.45, hy + ny * rw * 0.45)
        ctx.lineTo(x + dx * blade * 0.2 + nx * rw, hy + dy * blade * 0.2 + ny * rw)
        ctx.lineTo(x + dx * blade, hy + dy * blade)
        ctx.lineTo(x + dx * blade * 0.25 - nx * rw * 0.35, hy + dy * blade * 0.25 - ny * rw * 0.35)
        ctx.lineTo(x - nx * rw * 0.45, hy - ny * rw * 0.45)
        ctx.closePath()
    }
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x, hy, Math.max(0.6, tw * 0.75), 0, TAU)
    ctx.fill()
}

function bakeSky(
    c: HTMLCanvasElement,
    cw: number,
    ch: number,
    dpr: number,
    s: number,
    W: number,
    H: number,
    p: any,
    adv: typeof ADVANCED_DEFAULTS,
    scene: Scene
) {
    c.width = cw
    c.height = ch
    const g = c.getContext("2d")
    if (!g) return
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, cw, ch)
    g.setTransform(dpr * s, 0, 0, dpr * s, dpr * (W / 2 - CX * s), dpr * (H / 2 - CY * s))
    const L = CX - W / (2 * s) - 4
    const R = CX + W / (2 * s) + 4
    const T = CY - H / (2 * s) - 4
    const top = p.skyTop || "#451922"
    const hor = p.skyHorizon || "#EF6759"

    const sky = g.createLinearGradient(0, 0, 0, HORIZON)
    sky.addColorStop(0, top)
    sky.addColorStop(0.12, mix(top, "#87313F", 0.7))
    sky.addColorStop(0.3, "#B8384A")
    sky.addColorStop(0.5, mix(hor, "#CA424A", 0.45))
    sky.addColorStop(0.7, mix(hor, "#D8505A", 0.4))
    sky.addColorStop(0.86, mix(hor, "#A04A6A", 0.7))
    sky.addColorStop(1, "#8A5A80")
    g.fillStyle = sky
    g.fillRect(L, T, R - L, HORIZON + 4 - T)

    const sx = (clamp(adv.sunX, 0, 100) / 100) * REF_W
    const sy = (clamp(adv.sunY, 0, 100) / 100) * REF_H
    const sr = Math.max(4, adv.sunSize / 2)

    const warm = g.createRadialGradient(sx, sy, 0, sx, sy, 300)
    warm.addColorStop(0, rgba(hor, 0.55))
    warm.addColorStop(1, rgba(hor, 0))
    g.fillStyle = warm
    g.fillRect(L, T, R - L, HORIZON + 4 - T)

    // cloud streaks
    const co = clamp(adv.cloudOpacity, 0, 100) / 100
    const cloudC = adv.cloudColor
    g.filter = `blur(${Math.max(1, 2.4 * s * dpr)}px)`
    for (const cl of scene.clouds) {
        const col = cl.tone === 1 ? mix(cloudC, "#3C1420", 0.55) : cl.tone === 2 ? mix(cloudC, hor, 0.55) : cloudC
        g.fillStyle = rgba(col, cl.a * co)
        g.beginPath()
        g.ellipse(cl.x, cl.y, cl.w / 2, Math.max(0.5, cl.h / 2), 0, 0, TAU)
        g.fill()
    }
    g.filter = `blur(${Math.max(0.5, 0.6 * s * dpr)}px)`
    for (const cl of scene.clouds) {
        if (cl.tone === 2) continue
        g.fillStyle = rgba(adv.rimColor, 0.45 * co)
        g.beginPath()
        g.ellipse(cl.x - cl.w * 0.05, cl.y + cl.h * 0.45, cl.w * 0.38, Math.max(0.4, cl.h * 0.07 + 0.4), 0, 0, TAU)
        g.fill()
    }
    // distant hills
    g.filter = `blur(${Math.max(0.5, 1.2 * s * dpr)}px)`
    g.fillStyle = rgba("#844E75", 0.6)
    g.beginPath()
    g.moveTo(L - 60, HORIZON + 2)
    g.lineTo(L - 60, 238)
    g.quadraticCurveTo(-30, 226, 20, 230)
    g.quadraticCurveTo(70, 234, 120, 222)
    g.quadraticCurveTo(170, 230, 205, 248)
    g.quadraticCurveTo(225, 260, 250, HORIZON + 2)
    g.closePath()
    g.fill()
    g.beginPath()
    g.moveTo(630, HORIZON + 2)
    g.quadraticCurveTo(680, 250, 725, 246)
    g.quadraticCurveTo(780, 248, R + 60, 254)
    g.lineTo(R + 60, HORIZON + 2)
    g.closePath()
    g.fill()
    g.filter = "none"

    // sun
    const glow = clamp(adv.sunGlow, 0, 100) / 100
    const sg = g.createRadialGradient(sx, sy, sr * 0.9, sx, sy, sr + 46)
    sg.addColorStop(0, rgba("#F8C4B1", glow * 0.9))
    sg.addColorStop(0.35, rgba(hor, glow))
    sg.addColorStop(1, rgba(hor, 0))
    g.fillStyle = sg
    g.beginPath()
    g.arc(sx, sy, sr + 46, 0, TAU)
    g.fill()
    const sun = p.sunColor || "#F4F7F6"
    const disc = g.createRadialGradient(sx, sy, 0, sx, sy, sr)
    disc.addColorStop(0, sun)
    disc.addColorStop(0.7, sun)
    disc.addColorStop(1, mix(sun, "#F8C4B1", 0.85))
    g.fillStyle = disc
    g.beginPath()
    g.arc(sx, sy, sr, 0, TAU)
    g.fill()
    // cloud bars cutting the disc: upper one from the right, lower ones from the left
    const k = sr / 65
    g.save()
    g.beginPath()
    g.arc(sx, sy, sr + 0.5, 0, TAU)
    g.clip()
    g.filter = `blur(${Math.max(0.4, 0.8 * s * dpr)}px)`
    g.fillStyle = rgba(mix(hor, "#CA424A", 0.45), 0.95)
    const bars = [
        [-32, 6, 0.75],
        [5, 4, -0.85],
        [16, 8, -0.75],
    ]
    for (const b of bars) {
        g.beginPath()
        g.ellipse(sx + b[2] * sr, sy + b[0] * k, sr * 1.0, Math.max(0.5, (b[1] * k) / 2), 0, 0, TAU)
        g.fill()
    }
    g.restore()
    g.filter = "none"
}

function drawWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, ang: number, blur: number, rimCol: string) {
    ctx.fillStyle = "#0C0507"
    ctx.beginPath()
    ctx.arc(cx, cy, 18.8, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = "rgba(70,48,60,0.7)"
    ctx.lineWidth = 0.9
    ctx.beginPath()
    ctx.arc(cx, cy, 15.5, 0, TAU)
    ctx.stroke()
    const rg = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 11.5)
    rg.addColorStop(0, "#D6DAE2")
    rg.addColorStop(1, "#7C8190")
    ctx.fillStyle = rg
    ctx.beginPath()
    ctx.arc(cx, cy, 11.5, 0, TAU)
    ctx.fill()
    const ghosts = blur > 0.02 ? 4 : 1
    ctx.fillStyle = "#3E4250"
    for (let j = 0; j < ghosts; j++) {
        ctx.globalAlpha = j === 0 ? 1 - blur * 0.55 : blur * 0.35
        const a0 = ang + j * 0.16 * blur
        for (let q = 0; q < 5; q++) {
            const a = a0 + (q * TAU) / 5
            ctx.beginPath()
            ctx.ellipse(cx + Math.cos(a) * 6.6, cy + Math.sin(a) * 6.6, 2.6, 1.6, a, 0, TAU)
            ctx.fill()
        }
    }
    ctx.globalAlpha = 1
    if (blur > 0.02) {
        ctx.fillStyle = `rgba(170,175,190,${0.22 * blur})`
        ctx.beginPath()
        ctx.arc(cx, cy, 11, 0, TAU)
        ctx.fill()
    }
    ctx.fillStyle = "#C0C4CC"
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, TAU)
    ctx.fill()
    ctx.fillStyle = "#5A5F6C"
    ctx.beginPath()
    ctx.arc(cx, cy, 1, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = "rgba(240,242,248,0.55)"
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.arc(cx, cy, 11.3, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = rgba(rimCol, 0.45)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, 18, -2.5, -0.6)
    ctx.stroke()
}

function topContour(ctx: CanvasRenderingContext2D) {
    ctx.moveTo(245, 318)
    ctx.quadraticCurveTo(249, 307, 262, 303)
    ctx.quadraticCurveTo(276, 299, 292, 300)
    ctx.quadraticCurveTo(316, 299, 340, 294)
    ctx.lineTo(344, 293)
    ctx.quadraticCurveTo(356, 280, 371, 274)
    ctx.quadraticCurveTo(394, 266, 418, 272)
    ctx.quadraticCurveTo(452, 281, 479, 298)
    ctx.quadraticCurveTo(494, 306, 498, 316)
}

function drawCar(
    ctx: CanvasRenderingContext2D,
    carColor: string,
    rimCol: string,
    glowCol: string,
    wheelAng: number,
    blur: number
) {
    // arch interiors
    ctx.fillStyle = "#120709"
    for (const wx of [293, 442]) {
        ctx.beginPath()
        ctx.arc(wx, 331, 24, Math.PI, 0)
        ctx.fill()
    }
    // body
    ctx.beginPath()
    ctx.moveTo(247, 337)
    ctx.lineTo(243, 333)
    ctx.quadraticCurveTo(240, 324, 245, 318)
    ctx.quadraticCurveTo(249, 307, 262, 303)
    ctx.quadraticCurveTo(276, 299, 292, 300)
    ctx.quadraticCurveTo(316, 299, 340, 294)
    ctx.lineTo(344, 293)
    ctx.quadraticCurveTo(356, 280, 371, 274)
    ctx.quadraticCurveTo(394, 266, 418, 272)
    ctx.quadraticCurveTo(452, 281, 479, 298)
    ctx.quadraticCurveTo(494, 306, 498, 316)
    ctx.lineTo(500, 326)
    ctx.quadraticCurveTo(500, 334, 494, 337)
    ctx.lineTo(467, 337)
    ctx.arc(442, 331, 25, 0, Math.PI, true)
    ctx.lineTo(417, 337)
    ctx.lineTo(318, 337)
    ctx.arc(293, 331, 25, 0, Math.PI, true)
    ctx.lineTo(268, 337)
    ctx.closePath()
    const bg = ctx.createLinearGradient(0, 268, 0, 338)
    bg.addColorStop(0, mix(carColor, "#B8C4E8", 0.3))
    bg.addColorStop(0.3, carColor)
    bg.addColorStop(0.65, mix(carColor, "#232C50", 0.45))
    bg.addColorStop(1, mix(carColor, "#15142A", 0.7))
    ctx.fillStyle = bg
    ctx.fill()
    const refl = ctx.createLinearGradient(0, 312, 0, 338)
    refl.addColorStop(0, rgba(glowCol, 0))
    refl.addColorStop(1, rgba(glowCol, 0.14))
    ctx.fillStyle = refl
    ctx.fill()

    // greenhouse
    ctx.beginPath()
    ctx.moveTo(349, 293)
    ctx.quadraticCurveTo(359, 283, 372, 277)
    ctx.quadraticCurveTo(394, 271, 416, 275)
    ctx.quadraticCurveTo(438, 282, 454, 293)
    ctx.closePath()
    const wg = ctx.createLinearGradient(0, 271, 0, 293)
    wg.addColorStop(0, "#3A1A2A")
    wg.addColorStop(1, "#140810")
    ctx.fillStyle = wg
    ctx.fill()
    ctx.strokeStyle = "rgba(184,188,200,0.45)"
    ctx.lineWidth = 0.6
    ctx.stroke()
    // driver
    ctx.fillStyle = "rgba(60,34,48,0.7)"
    ctx.beginPath()
    ctx.arc(393, 283, 4, 0, TAU)
    ctx.fill()
    ctx.fillRect(388, 287, 11, 6)
    // pillar
    ctx.strokeStyle = mix(carColor, "#232C50", 0.2)
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(411, 273)
    ctx.lineTo(408, 293)
    ctx.stroke()
    // door seams, handle
    ctx.strokeStyle = "rgba(10,8,20,0.35)"
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.moveTo(347, 295)
    ctx.lineTo(346, 334)
    ctx.moveTo(408, 294)
    ctx.lineTo(411, 334)
    ctx.moveTo(318, 336)
    ctx.lineTo(417, 336)
    ctx.stroke()
    ctx.fillStyle = "#A8ACB8"
    ctx.fillRect(394, 302, 7, 1.4)
    // side stripe with lettering
    ctx.fillStyle = "#F4F7F6"
    ctx.fillRect(318, 325.5, 96, 3.6)
    ctx.fillStyle = mix(carColor, "#1B1A33", 0.3)
    ctx.font = "bold 3.4px Helvetica, Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("PORSCHE", 366, 327.4)
    // lights
    const hl = ctx.createRadialGradient(254, 309, 0, 254, 309, 10)
    hl.addColorStop(0, "rgba(255,240,220,0.25)")
    hl.addColorStop(1, "rgba(255,240,220,0)")
    ctx.fillStyle = hl
    ctx.beginPath()
    ctx.arc(254, 309, 10, 0, TAU)
    ctx.fill()
    ctx.fillStyle = "#D8CCD0"
    ctx.beginPath()
    ctx.ellipse(254, 309, 3.2, 2.6, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = "#E8A050"
    ctx.fillRect(246, 321, 3, 2)
    ctx.fillStyle = "#C0303A"
    ctx.fillRect(496, 317, 3, 6)
    // bumpers
    ctx.strokeStyle = "#A8ACB8"
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(243, 328)
    ctx.lineTo(258, 328)
    ctx.moveTo(487, 328)
    ctx.lineTo(500, 328)
    ctx.stroke()
    // mirror
    ctx.fillStyle = carColor
    ctx.beginPath()
    ctx.ellipse(345, 289, 3, 1.8, 0, 0, TAU)
    ctx.fill()
    // sunset rim light on the top line
    ctx.beginPath()
    topContour(ctx)
    ctx.strokeStyle = rgba(rimCol, 0.2)
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = rgba(rimCol, 0.85)
    ctx.lineWidth = 1.1
    ctx.stroke()
    drawWheel(ctx, 293, 331, wheelAng, blur, rimCol)
    drawWheel(ctx, 442, 331, wheelAng + 1.1, blur, rimCol)
}

export interface AnimatedSideViewProps {
    background?: string
    skyTop?: string
    skyHorizon?: string
    sunColor?: string
    carColor?: string
    speed?: number
    turbines?: number
    scale?: number
    advanced?: {
        farSpeed?: number
        midSpeed?: number
        nearSpeed?: number
        poleSpeed?: number
        hedgeSpeed?: number
        groundSpeed?: number
        rotorSpeed?: number
        farCount?: number
        midCount?: number
        nearSpacing?: number
        nearHeight?: number
        nearBlade?: number
        sunSize?: number
        sunX?: number
        sunY?: number
        sunGlow?: number
        cloudOpacity?: number
        cloudColor?: string
        rimColor?: string
        hazeColor?: string
        hazeOpacity?: number
        turbineNear?: string
        turbineMid?: string
        turbineFar?: string
        fieldColor?: string
        roadColor?: string
        laneColor?: string
        carRim?: string
        wheelBlur?: number
        seed?: number
        grain?: number
        vignette?: number
        hover?: number
    }
    style?: CSSProperties
}

export default function AnimatedSideView(props: AnimatedSideViewProps) {
    const {
        speed = 50,
        turbines = 50,
        scale = 100,
        background = "#000000",
        skyTop = "#EB123F",
        skyHorizon = "#EF6759",
        sunColor = "#FFFFFF",
        carColor = "#FF0000",
        style,
    } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(props)
    propsRef.current = { ...props, speed, turbines, scale, background, skyTop, skyHorizon, sunColor, carColor }
    const pointer = useRef({ inside: false, nx: 0.5, down: false })

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const size = { w: root.offsetWidth, h: root.offsetHeight }
        const ro = new ResizeObserver(() => {
            size.w = root.offsetWidth
            size.h = root.offsetHeight
        })
        ro.observe(root)
        const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        const sky = document.createElement("canvas")
        let skyKey = ""
        let scene: Scene | null = null
        let sceneKey = ""
        const grainC = document.createElement("canvas")
        grainC.width = grainC.height = 128
        const gctx = grainC.getContext("2d")
        if (gctx) {
            const img = gctx.createImageData(128, 128)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255
                img.data[i] = img.data[i + 1] = img.data[i + 2] = v
                img.data[i + 3] = 255
            }
            gctx.putImageData(img, 0, 0)
        }
        const grainPat = ctx.createPattern(grainC, "repeat")

        const st = { tau: 0, over: 0, px: 0, boost: 0 }
        const onUp = () => {
            pointer.current.down = false
        }
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const W = size.w
            const H = size.h
            if (!W || !H) return
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            const cw = Math.max(1, Math.round(W * dpr))
            const ch = Math.max(1, Math.round(H * dpr))
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw
                canvas.height = ch
            }
            const reduce = !!(mq && mq.matches)
            const hoverK = reduce ? 0 : clamp(adv.hover, 0, 100) / 50
            const pt = pointer.current
            const ke = 1 - Math.exp(-dt * 5)
            st.over += ((pt.inside ? 1 : 0) - st.over) * ke
            st.px += ((pt.inside ? pt.nx * 2 - 1 : 0) - st.px) * ke * 0.8
            st.boost += ((pt.down ? 1 : 0) - st.boost) * (1 - Math.exp(-dt * 3))
            const sf = clamp(p.speed, 0, 100) / 50
            if (!reduce) st.tau += dt * sf * (1 + st.boost * 0.8 * hoverK)
            const tau = st.tau

            // Fit the 16:9 composition inside the frame; sky and road extend into any spare room.
            const s = Math.min(W / REF_W, H / REF_H) * (clamp(p.scale, 50, 150) / 100)
            const L = CX - W / (2 * s)
            const R = CX + W / (2 * s)
            const B = CY + H / (2 * s)

            const dens = clamp(p.turbines, 0, 100) / 50
            const farN = Math.round(Math.max(0, adv.farCount) * dens)
            const midN = Math.round(Math.max(0, adv.midCount) * dens)
            const sk = `${adv.seed}|${farN}|${midN}`
            if (!scene || sk !== sceneKey) {
                scene = genScene(adv.seed, farN, midN)
                sceneKey = sk
                skyKey = ""
            }
            const bk = [cw, ch, dpr, s, W, H, p.skyTop, p.skyHorizon, p.sunColor, adv.sunSize, adv.sunX, adv.sunY, adv.sunGlow, adv.cloudOpacity, adv.cloudColor, adv.rimColor, adv.seed].join("|")
            if (bk !== skyKey) {
                bakeSky(sky, cw, ch, dpr, s, W, H, p, adv, scene)
                skyKey = bk
            }

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = "source-over"
            ctx.fillStyle = p.background || "#000000"
            ctx.fillRect(0, 0, cw, ch)
            ctx.drawImage(sky, 0, 0)
            ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (W / 2 - CX * s), dpr * (H / 2 - CY * s))

            const shift = (depth: number) => -st.px * depth * hoverK
            const rot = (adv.rotorSpeed * Math.PI) / 180
            const rotor = (phase: number) => (reduce ? 0 : phase + rot * tau)

            // pointer: sun brightens under hover
            const sx = (clamp(adv.sunX, 0, 100) / 100) * REF_W
            const sy = (clamp(adv.sunY, 0, 100) / 100) * REF_H
            const sr = Math.max(4, adv.sunSize / 2)
            const hg = st.over * hoverK
            if (hg > 0.005) {
                const g = ctx.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr + 70)
                g.addColorStop(0, rgba("#F8C4B1", 0.3 * hg))
                g.addColorStop(1, rgba(p.skyHorizon, 0))
                ctx.fillStyle = g
                ctx.beginPath()
                ctx.arc(sx, sy, sr + 70, 0, TAU)
                ctx.fill()
            }

            // field
            const fg = ctx.createLinearGradient(0, HORIZON, 0, 331)
            fg.addColorStop(0, mix(adv.fieldColor, "#120810", 0.5))
            fg.addColorStop(0.5, adv.fieldColor)
            fg.addColorStop(1, mix(adv.fieldColor, "#4A3032", 0.45))
            ctx.fillStyle = fg
            ctx.fillRect(L - 2, HORIZON, R - L + 4, 331 - HORIZON)

            // far turbines
            const farOff = adv.farSpeed * PX_PER_PCT * tau + shift(3)
            ctx.fillStyle = rgba(adv.turbineFar, 0.75)
            for (const t of scene.far)
                each(t.x, farOff, 800, L, R, 40, (x) => drawTurbine(ctx, x, t.base, t.h, t.h * 0.5, rotor(t.phase), 1.1))

            // horizon haze
            const hz = clamp(adv.hazeOpacity, 0, 100) / 100
            const hg2 = ctx.createLinearGradient(0, 236, 0, 278)
            hg2.addColorStop(0, rgba("#844E75", 0))
            hg2.addColorStop(0.55, rgba("#844E75", 0.4 * hz))
            hg2.addColorStop(0.74, rgba(adv.hazeColor, 0.9 * hz))
            hg2.addColorStop(0.84, rgba(adv.hazeColor, 0.55 * hz))
            hg2.addColorStop(1, rgba("#844E75", 0))
            ctx.fillStyle = hg2
            ctx.fillRect(L - 2, 236, R - L + 4, 42)

            // horizon hedge and bales
            ctx.fillStyle = "rgba(28,13,19,0.6)"
            ctx.fillRect(L - 2, 270, R - L + 4, 2)
            const hedgeOff = adv.hedgeSpeed * PX_PER_PCT * tau + shift(8)
            ctx.fillStyle = "#24121A"
            for (const b of scene.bushes)
                each(b.x, hedgeOff, REF_W, L, R, 10, (x) => ctx.fillRect(x, 271 - b.h, b.w, b.h))

            // mid turbines
            const midOff = adv.midSpeed * PX_PER_PCT * tau + shift(6)
            ctx.fillStyle = adv.turbineMid
            for (const t of scene.mid)
                each(t.x, midOff, 900, L, R, 80, (x) => drawTurbine(ctx, x, t.base, t.h, t.h * 0.45, rotor(t.phase), 2.4))

            // field speckle (faster towards the road)
            const gv = adv.groundSpeed * PX_PER_PCT
            for (const sp of scene.speckles) {
                const f = 0.3 + 0.7 * ((sp.y - 278) / 52)
                const len = sp.sz + gv * f * sf * 0.012
                ctx.fillStyle = sp.c === 4 ? rgba(SPECKLE_COLORS[4], 0.4) : rgba(SPECKLE_COLORS[sp.c], 0.7)
                each(sp.x, gv * f * tau + shift(16) * f, REF_W, L, R, len + 4, (x) => ctx.fillRect(x, sp.y, len, sp.sz * 0.6))
            }

            // utility poles and wires
            const poleOff = adv.poleSpeed * PX_PER_PCT * tau + shift(10)
            ctx.strokeStyle = rgba(adv.turbineMid, 0.3)
            ctx.lineWidth = 0.5
            each(437, poleOff, 510, L, R, 520, (x) => {
                ctx.beginPath()
                for (const dx of [-12, 12]) {
                    ctx.moveTo(x + dx, 121)
                    ctx.quadraticCurveTo(x + 255 + dx, 157, x + 510 + dx, 121)
                }
                ctx.stroke()
            })
            ctx.fillStyle = adv.turbineMid
            each(437, poleOff, 510, L, R, 20, (x) => {
                ctx.fillRect(x - 1.4, 112, 2.8, 170)
                ctx.fillRect(x - 12, 119, 24, 2)
                ctx.fillRect(x - 9, 130, 18, 1.6)
            })

            // near turbines
            const sp = Math.max(100, adv.nearSpacing)
            const nearOff = adv.nearSpeed * PX_PER_PCT * tau + shift(14)
            const nb = Math.max(10, adv.nearBlade)
            const nh = Math.max(40, adv.nearHeight)
            for (let i = 0; i < 2; i++) {
                const ph = scene.nearPhase[i]
                const hh = nh + (i ? -8 : 0)
                each(372 + i * sp, nearOff, sp * 2, L, R, nb + 10, (x) => {
                    ctx.fillStyle = adv.turbineNear
                    drawTurbine(ctx, x, 278, hh, nb, rotor(ph), 4.5)
                    ctx.strokeStyle = rgba("#CA424A", 0.35)
                    ctx.lineWidth = 0.8
                    ctx.beginPath()
                    ctx.moveTo(x + 2.25, 278)
                    ctx.lineTo(x + 1.35, 278 - hh)
                    ctx.stroke()
                })
            }

            // road
            const rg = ctx.createLinearGradient(0, 331, 0, 414)
            rg.addColorStop(0, "#2E161B")
            rg.addColorStop(1, adv.roadColor)
            ctx.fillStyle = rg
            ctx.fillRect(L - 2, 331, R - L + 4, Math.max(414, B) - 331 + 4)
            const sheen = ctx.createLinearGradient(0, 336, 0, 354)
            sheen.addColorStop(0, rgba("#52222E", 0))
            sheen.addColorStop(0.5, rgba("#52222E", 0.5))
            sheen.addColorStop(1, rgba("#52222E", 0))
            ctx.fillStyle = sheen
            ctx.fillRect(L - 2, 336, R - L + 4, 18)
            ctx.fillStyle = rgba("#E8B0A8", 0.4)
            ctx.fillRect(L - 2, 332.5, R - L + 4, 1.2)
            ctx.fillStyle = rgba("#6A3038", 0.12)
            for (const st2 of scene.streaks)
                each(st2.x, gv * 1.3 * tau + shift(20), REF_W, L, R, st2.len, (x) => ctx.fillRect(x, st2.y, st2.len, 0.8))
            ctx.fillStyle = rgba("#CA424A", 0.5)
            each(0, gv * 1.15 * tau + shift(18), 62, L, R, 30, (x) => ctx.fillRect(x, 356.2, 26, 1.4))
            ctx.fillStyle = rgba(adv.laneColor, 0.7)
            ctx.fillRect(L - 2, 396, R - L + 4, 2.4)

            // roadside grass
            ctx.fillStyle = "rgba(20,9,16,0.7)"
            for (const tf of scene.tufts)
                each(tf.x, gv * 0.95 * tau + shift(17), REF_W, L, R, 6, (x) => {
                    ctx.beginPath()
                    ctx.moveTo(x - 0.8, 332)
                    ctx.lineTo(x + tf.lean, 332 - tf.h)
                    ctx.lineTo(x + 0.8, 332)
                    ctx.fill()
                })

            // car shadow
            ctx.save()
            ctx.translate(390, 368)
            ctx.scale(1, 28 / 172)
            const shg = ctx.createRadialGradient(0, 0, 0, 0, 0, 172)
            shg.addColorStop(0, "rgba(20,8,16,0.9)")
            shg.addColorStop(0.65, "rgba(20,8,16,0.7)")
            shg.addColorStop(1, "rgba(20,8,16,0)")
            ctx.fillStyle = shg
            ctx.beginPath()
            ctx.arc(0, 0, 172, 0, TAU)
            ctx.fill()
            ctx.restore()
            ctx.fillStyle = "rgba(20,8,16,0.9)"
            ctx.beginPath()
            ctx.ellipse(370, 349, 130, 6, 0, 0, TAU)
            ctx.fill()

            // car
            const wheelAng = reduce ? 0 : -(gv / 19) * tau
            const blur = (clamp(adv.wheelBlur, 0, 100) / 100) * Math.min(1, sf)
            drawCar(ctx, p.carColor || "#5A6E9A", adv.carRim, p.skyHorizon || "#EF6759", wheelAng, reduce ? 0 : blur)

            // overlays
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            const vig = clamp(adv.vignette, 0, 100) / 100
            if (vig > 0) {
                const diag = Math.hypot(cw, ch) / 2
                const vg = ctx.createRadialGradient(cw / 2, ch / 2, diag * 0.45, cw / 2, ch / 2, diag)
                vg.addColorStop(0, "rgba(0,0,0,0)")
                vg.addColorStop(1, `rgba(0,0,0,${0.75 * vig})`)
                ctx.fillStyle = vg
                ctx.fillRect(0, 0, cw, ch)
            }
            const gr = clamp(adv.grain, 0, 100) / 100
            if (gr > 0 && grainPat) {
                ctx.save()
                ctx.globalAlpha = gr * 0.5
                ctx.globalCompositeOperation = "overlay"
                ctx.translate(Math.floor(Math.random() * 128), Math.floor(Math.random() * 128))
                ctx.fillStyle = grainPat
                ctx.fillRect(-128, -128, cw + 256, ch + 256)
                ctx.restore()
            }
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const el = e.currentTarget
        const w = el.offsetWidth || 1
        pointer.current.inside = true
        pointer.current.nx = clamp(e.nativeEvent.offsetX / w, 0, 1)
    }

    return (
        <div
            ref={rootRef}
            onPointerEnter={onMove}
            onPointerMove={onMove}
            onPointerLeave={() => {
                pointer.current.inside = false
            }}
            onPointerDown={(e) => {
                onMove(e)
                pointer.current.down = true
            }}
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
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}
