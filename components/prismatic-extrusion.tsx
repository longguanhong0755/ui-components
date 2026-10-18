"use client"

import type { CSSProperties } from "react"
"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    cycleMs: 4017,
    midDepth: 48,
    depthX: 30,
    depthY: 23,
    posX: 50,
    posY: 50,
    tracking: 5,
    shear: 0,
    outlineColor: "#000000",
    outlineWidth: 1,
    sideStroke: 2,
    glintStart1: 0,
    glintStart2: 2700,
    glintMs: 800,
    glintWide: 22,
    glintNarrow: 13,
    glintGap: 14,
    glintAngle: 56,
    glintOpacity: 100,
    hoverDepth: 30,
    hoverLean: 35,
    grain: 0,
    vignette: 0,
    hover: 50,
}

const DEFAULT_FAMILY = `"Montserrat", "Arial Black", "Helvetica Neue", Arial, sans-serif`
const SOURCE_CYCLE = 4017
const KEY_T = [0, 817, 1400, 1917, 2467, 3033, 3833]
const KEY_EASE = [
    [0.333, 0, 0, 1],
    [1, 0, 0.667, 1],
    [0.333, 0, 0, 1],
    [0.484, 0, 0.488, 1],
    [0.333, 0, 0.407, 1],
    [1, 0, 0.667, 1],
]

function makeBezier(x1: number, y1: number, x2: number, y2: number) {
    const cx = 3 * x1
    const bx = 3 * (x2 - x1) - cx
    const ax = 1 - cx - bx
    const cy = 3 * y1
    const by = 3 * (y2 - y1) - cy
    const ay = 1 - cy - by
    const sx = (t: number) => ((ax * t + bx) * t + cx) * t
    const sy = (t: number) => ((ay * t + by) * t + cy) * t
    const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx
    return (x: number) => {
        if (x <= 0) return 0
        if (x >= 1) return 1
        let t = x
        for (let i = 0; i < 8; i++) {
            const e = sx(t) - x
            if (Math.abs(e) < 1e-6) return sy(t)
            const d = dx(t)
            if (Math.abs(d) < 1e-6) break
            t -= e / d
            if (t < 0 || t > 1) break
        }
        let lo = 0
        let hi = 1
        t = x
        for (let i = 0; i < 40; i++) {
            const v = sx(t)
            if (Math.abs(v - x) < 1e-6) break
            if (v < x) lo = t
            else hi = t
            t = (lo + hi) / 2
        }
        return sy(t)
    }
}

const EASES = KEY_EASE.map((e) => makeBezier(e[0], e[1], e[2], e[3]))

function mod(a: number, b: number) {
    return ((a % b) + b) % b
}

function depthAt(tau: number, cycle: number, mid: number) {
    const vals = [0, 1, 0, 1, mid, 1, 0]
    const s = cycle / SOURCE_CYCLE
    for (let k = 0; k < 6; k++) {
        const t0 = KEY_T[k] * s
        const t1 = KEY_T[k + 1] * s
        if (tau < t1) {
            const u = Math.max(0, (tau - t0) / Math.max(1e-6, t1 - t0))
            return vals[k] + (vals[k + 1] - vals[k]) * EASES[k](u)
        }
    }
    return 0
}

function familyString(f: any) {
    if (!f || typeof f !== "string" || !f.trim()) return DEFAULT_FAMILY
    if (f.includes(",") || f.includes('"') || f.includes("'")) return f
    return `"${f}", ${DEFAULT_FAMILY}`
}

export interface FunExtrusionProps {
    text?: string
    font?: Record<string, unknown>
    size?: number
    speed?: number
    stagger?: number
    depth?: number
    faceColor?: string
    sideColor?: string
    glintColor?: string
    background?: string
    advanced?: {
        cycleMs?: number
        midDepth?: number
        depthX?: number
        depthY?: number
        posX?: number
        posY?: number
        tracking?: number
        shear?: number
        outlineColor?: string
        outlineWidth?: number
        sideStroke?: number
        glintStart1?: number
        glintStart2?: number
        glintMs?: number
        glintWide?: number
        glintNarrow?: number
        glintGap?: number
        glintAngle?: number
        glintOpacity?: number
        hoverDepth?: number
        hoverLean?: number
        grain?: number
        vignette?: number
        hover?: number
    }
    style?: CSSProperties
}

/**
 * Fun Extrusion — a sheared word whose faces slide off a solid extrusion and back.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function FunExtrusion(props: FunExtrusionProps) {
    const {
        text = "TEXT",
        font = {"variant":"Extra Bold","fontSize":"16px","textAlign":"left","fontFamily":"Poppins","fontWeight":800,"lineHeight":"1.5em","letterSpacing":"0em"},
        size = 271,
        speed = 50,
        stagger = 83,
        depth = 35,
        faceColor = "#4E00FF",
        sideColor = "#FEFB4B",
        glintColor = "#4AFFDD",
        background = "#000000",
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(null)
    propsRef.current = {
        text,
        font,
        size,
        speed,
        stagger,
        depth,
        faceColor,
        sideColor,
        glintColor,
        background,
        advanced: props.advanced,
    }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let w = 0
        let h = 0
        let dpr = 1
        let fontsVer = 0
        let raf = 0
        let last = -1
        let time = 0
        let alive = true

        const ptr = { x: 0, y: 0, tx: 0, ty: 0, over: 0, overT: 0, down: 0, downT: 0, placed: false }

        // Font: load Montserrat Black for the default face
        const bump = () => {
            fontsVer++
        }
        const fonts: any = typeof document !== "undefined" ? (document as any).fonts : null
        if (fonts && fonts.addEventListener) fonts.addEventListener("loadingdone", bump)
        const loadFace = () => {
            if (fonts && fonts.load) fonts.load(`900 100px "Montserrat"`).then(bump).catch(() => {})
        }
        if (typeof document !== "undefined") {
            const id = "fun-extrusion-montserrat"
            let link = document.getElementById(id) as HTMLLinkElement | null
            if (!link) {
                link = document.createElement("link")
                link.id = id
                link.rel = "stylesheet"
                link.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&display=swap"
                link.onload = loadFace
                document.head.appendChild(link)
            } else {
                loadFace()
            }
        }

        const resize = () => {
            w = root.offsetWidth
            h = root.offsetHeight
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(w * dpr))
            canvas.height = Math.max(1, Math.round(h * dpr))
            canvas.style.width = w + "px"
            canvas.style.height = h + "px"
            if (!ptr.placed) {
                ptr.x = ptr.tx = w / 2
                ptr.y = ptr.ty = h / 2
                ptr.placed = true
            }
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        // Grain tile
        const noise = document.createElement("canvas")
        noise.width = 160
        noise.height = 160
        const nctx = noise.getContext("2d")
        if (nctx) {
            const img = nctx.createImageData(160, 160)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255
                img.data[i] = v
                img.data[i + 1] = v
                img.data[i + 2] = v
                img.data[i + 3] = 255
            }
            nctx.putImageData(img, 0, 0)
        }
        let noisePattern: CanvasPattern | null = null

        const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        // Pointer
        const onEnter = (e: PointerEvent) => {
            ptr.overT = 1
            ptr.tx = e.offsetX
            ptr.ty = e.offsetY
        }
        const onMove = (e: PointerEvent) => {
            ptr.overT = 1
            ptr.tx = e.offsetX
            ptr.ty = e.offsetY
        }
        const onLeave = () => {
            ptr.overT = 0
            ptr.downT = 0
            ptr.tx = w / 2
            ptr.ty = h / 2
        }
        const onDown = (e: PointerEvent) => {
            ptr.downT = 1
            ptr.tx = e.offsetX
            ptr.ty = e.offsetY
        }
        const onUp = () => {
            ptr.downT = 0
        }
        root.addEventListener("pointerenter", onEnter)
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        type Glyph = {
            key: string
            side: HTMLCanvasElement
            face: HTMLCanvasElement
            ox: number
            oy: number
            cw: number
            ch: number
        }
        const glyphs: (Glyph | null)[] = []

        const frame = (now: number) => {
            if (!alive) return
            raf = requestAnimationFrame(frame)
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const reduced = !!(mq && mq.matches)

            const cycle = Math.max(500, adv.cycleMs)
            if (!reduced) time += dt * 1000 * (Math.max(0, p.speed) / 50)

            // Pointer easing
            const kp = 1 - Math.exp(-dt * 8)
            ptr.x += (ptr.tx - ptr.x) * kp
            ptr.y += (ptr.ty - ptr.y) * kp
            ptr.over += (ptr.overT - ptr.over) * (1 - Math.exp(-dt * 6))
            ptr.down += (ptr.downT - ptr.down) * (1 - Math.exp(-dt * 12))

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = "source-over"
            ctx.fillStyle = p.background
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

            const chars = Array.from(String(p.text ?? ""))
            if (chars.length && w > 0 && h > 0) {
                const f = p.font || {}
                const family = familyString(f.fontFamily)
                const weight = f.fontWeight || 900
                const fstyle = f.fontStyle || "normal"
                const tan = Math.tan((adv.shear * Math.PI) / 180)
                const dScale = Math.max(0, p.depth) / 100

                // Fit the word in the frame
                const baseSize = Math.max(8, p.size)
                ctx.font = `${fstyle} ${weight} ${baseSize}px ${family}`
                let wBase = 0
                for (const c of chars) wBase += ctx.measureText(c).width
                wBase += (adv.tracking / 100) * baseSize * (chars.length - 1)
                wBase += (adv.depthX / 100) * baseSize * dScale
                const fit = Math.min(1, (w * 0.86) / Math.max(1, wBase), (h * 0.6) / baseSize)
                const fs = baseSize * fit
                const fontStr = `${fstyle} ${weight} ${fs}px ${family}`
                ctx.font = fontStr

                const capH = ctx.measureText("H").actualBoundingBoxAscent || fs * 0.7
                const track = (adv.tracking / 100) * fs
                const widths = chars.map((c) => ctx.measureText(c).width)
                let W = track * (chars.length - 1)
                for (const cw of widths) W += cw
                const cx = (w * adv.posX) / 100
                const cy = (h * adv.posY) / 100

                // Extrusion vector, leaning toward the pointer
                const hk = adv.hover / 50
                const pxn = Math.max(-1, Math.min(1, (ptr.x / Math.max(1, w)) * 2 - 1))
                const pyn = Math.max(-1, Math.min(1, (ptr.y / Math.max(1, h)) * 2 - 1))
                const lean = ptr.over * hk * (adv.hoverLean / 100)
                const vx = (adv.depthX / 100) * fs * dScale + pxn * lean * fs * 0.3
                const vy = -(adv.depthY / 100) * fs * dScale + pyn * lean * fs * 0.3
                const boost = (ptr.over * (adv.hoverDepth / 100) + ptr.down * 0.35) * hk

                // Glint sweeps (word level)
                const k = 1 / Math.tan((Math.max(10, Math.min(89, adv.glintAngle)) * Math.PI) / 180)
                const w1 = (adv.glintWide / 100) * fs
                const w2 = (adv.glintNarrow / 100) * fs
                const gap = (adv.glintGap / 100) * fs
                const slantReach = (capH + W * Math.abs(tan) * 0.5) * k
                const from = cx - W / 2 - slantReach - w1
                const to = cx + W / 2 + Math.max(0, vx) + slantReach + gap + w2
                const sweeps: number[] = []
                if (!reduced) {
                    const gms = Math.max(50, adv.glintMs)
                    for (const s of [adv.glintStart1, adv.glintStart2]) {
                        const u = mod(time - s, cycle) / gms
                        if (u >= 0 && u <= 1) {
                            const e = (1 - Math.cos(Math.PI * u)) / 2
                            sweeps.push(from + (to - from) * e)
                        }
                    }
                }
                const Hb = fs * 3

                // Letter origins
                const xs: number[] = []
                let acc = -W / 2
                for (let i = 0; i < chars.length; i++) {
                    xs.push(acc)
                    acc += widths[i] + track
                }

                const sideStroke = Math.max(0, adv.sideStroke) * fit
                const outlineW = Math.max(0, adv.outlineWidth)

                for (let i = chars.length - 1; i >= 0; i--) {
                    const c = chars[i]
                    if (c.trim() === "") continue
                    const key = [c, fontStr, dpr, tan, p.sideColor, sideStroke, outlineW, fontsVer].join("|")
                    let g = glyphs[i]
                    if (!g || g.key !== key) {
                        ctx.font = fontStr
                        const m = ctx.measureText(c)
                        const L = m.actualBoundingBoxLeft || 0
                        const R = m.actualBoundingBoxRight || m.width
                        const A = m.actualBoundingBoxAscent || capH
                        const Dd = m.actualBoundingBoxDescent || 0
                        const pad = 4 + sideStroke + outlineW
                        const yMin = -A + Math.min(-L * tan, R * tan)
                        const yMax = Dd + Math.max(-L * tan, R * tan)
                        const ox = pad + L
                        const oy = pad - yMin
                        const cw = L + R + 2 * pad
                        const ch = yMax - yMin + 2 * pad
                        const side = document.createElement("canvas")
                        side.width = Math.max(1, Math.ceil(cw * dpr))
                        side.height = Math.max(1, Math.ceil(ch * dpr))
                        const face = document.createElement("canvas")
                        face.width = side.width
                        face.height = side.height
                        const sctx = side.getContext("2d")
                        if (sctx) {
                            sctx.setTransform(dpr, dpr * tan, 0, dpr, ox * dpr, oy * dpr)
                            sctx.font = fontStr
                            sctx.fillStyle = p.sideColor
                            sctx.fillText(c, 0, 0)
                            if (sideStroke > 0) {
                                // Same colour as the fill, so the buried contour edges this
                                // traces (see the face outline below) never show here.
                                // Round joins keep sharp outer corners from spiking.
                                sctx.strokeStyle = p.sideColor
                                sctx.lineWidth = sideStroke
                                sctx.lineJoin = "round"
                                sctx.lineCap = "round"
                                sctx.strokeText(c, 0, 0)
                            }
                        }
                        g = { key, side, face, ox, oy, cw: side.width / dpr, ch: side.height / dpr }
                        glyphs[i] = g
                    }

                    const tau = mod(time - i * Math.max(0, p.stagger), cycle)
                    const D = reduced ? 1 : depthAt(tau, cycle, adv.midDepth / 100)
                    const De = Math.max(0, D + boost)
                    const X0 = cx + xs[i]
                    const Y0 = cy + capH / 2 + xs[i] * tan
                    const dxv = vx * De
                    const dyv = vy * De

                    // Solid extrusion: stamp the silhouette along the vector
                    const steps = Math.min(600, Math.ceil(Math.hypot(dxv, dyv) * dpr))
                    if (steps > 0) {
                        for (let s = 0; s <= steps; s++) {
                            const t = s / steps
                            ctx.drawImage(g.side, X0 - g.ox + dxv * t, Y0 - g.oy + dyv * t, g.cw, g.ch)
                        }
                    }

                    // Face with hairline outline and clipped glints
                    const fx = X0 + dxv - g.ox
                    const fy = Y0 + dyv - g.oy
                    const fctx = g.face.getContext("2d")
                    if (!fctx) continue
                    fctx.setTransform(1, 0, 0, 1, 0, 0)
                    fctx.globalCompositeOperation = "source-over"
                    fctx.globalAlpha = 1
                    fctx.clearRect(0, 0, g.face.width, g.face.height)
                    fctx.setTransform(dpr, dpr * tan, 0, dpr, g.ox * dpr, g.oy * dpr)
                    fctx.font = fontStr
                    if (outlineW > 0) {
                        // Stroke under the fill, at double width. Many fonts (every
                        // variable font: Montserrat, Inter, Raleway, Framer's Poppins…)
                        // build glyphs from overlapping contours — N's diagonal is its
                        // own shape lying across the stems. fillText unions them, but
                        // strokeText traces every contour, so the buried edges showed as
                        // triangles on the face. Filling on top hides everything inside
                        // the silhouette and leaves only the outer half of the stroke:
                        // an outline exactly outlineW wide, on any font or glyph.
                        fctx.strokeStyle = adv.outlineColor
                        fctx.lineWidth = outlineW * 2
                        fctx.lineJoin = "round"
                        fctx.strokeText(c, 0, 0)
                    }
                    fctx.fillStyle = p.faceColor
                    fctx.fillText(c, 0, 0)
                    if (sweeps.length) {
                        fctx.globalCompositeOperation = "source-atop"
                        fctx.globalAlpha = Math.max(0, Math.min(1, adv.glintOpacity / 100))
                        fctx.setTransform(dpr, 0, 0, dpr, -fx * dpr, -fy * dpr)
                        fctx.fillStyle = p.glintColor
                        for (const xc of sweeps) {
                            const bars: [number, number][] = [
                                [xc, xc + w1],
                                [xc - gap - w2, xc - gap],
                            ]
                            fctx.beginPath()
                            for (const [x0, x1] of bars) {
                                fctx.moveTo(x0 - Hb * k, cy - Hb)
                                fctx.lineTo(x1 - Hb * k, cy - Hb)
                                fctx.lineTo(x1 + Hb * k, cy + Hb)
                                fctx.lineTo(x0 + Hb * k, cy + Hb)
                                fctx.closePath()
                            }
                            fctx.fill()
                        }
                        fctx.globalCompositeOperation = "source-over"
                        fctx.globalAlpha = 1
                    }
                    ctx.drawImage(g.face, fx, fy, g.cw, g.ch)
                }
                glyphs.length = chars.length
            }

            // Vignette
            if (adv.vignette > 0) {
                const r0 = Math.min(w, h) * 0.3
                const r1 = Math.hypot(w, h) / 2
                const grad = ctx.createRadialGradient(w / 2, h / 2, r0, w / 2, h / 2, r1)
                grad.addColorStop(0, "rgba(0,0,0,0)")
                grad.addColorStop(1, `rgba(0,0,0,${Math.min(1, (adv.vignette / 100) * 0.85)})`)
                ctx.fillStyle = grad
                ctx.fillRect(0, 0, w, h)
            }
            // Grain
            if (adv.grain > 0) {
                if (!noisePattern) noisePattern = ctx.createPattern(noise, "repeat")
                if (noisePattern) {
                    ctx.save()
                    ctx.globalAlpha = Math.min(1, (adv.grain / 100) * 0.35)
                    ctx.globalCompositeOperation = "overlay"
                    const ox = Math.random() * 160
                    const oy = Math.random() * 160
                    ctx.translate(-ox, -oy)
                    ctx.fillStyle = noisePattern
                    ctx.fillRect(0, 0, w + 160, h + 160)
                    ctx.restore()
                }
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            alive = false
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointerenter", onEnter)
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            if (fonts && fonts.removeEventListener) fonts.removeEventListener("loadingdone", bump)
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
                style={{ position: "absolute", left: 0, top: 0, display: "block", pointerEvents: "none" }}
            />
        </div>
    )
}
