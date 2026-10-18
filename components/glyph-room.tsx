"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    columns: 15,
    rows: 11,
    cycleMs: 2470,
    blobRadius: 21,
    blobU: 0,
    blobV: 0,
    swing: 25,
    swingPhase: 114,
    drift: 200,
    wrapU: 125,
    minSize: 12,
    maxSize: 100,
    glyphFill: 86,
    dimSmall: 50,
    wallWidth: 214,
    wallHeight: 286,
    tilt: 22,
    offsetY: 0,
    wallOpacity: 100,
    floorOpacity: 85,
    hoverRadius: 16,
    hoverBoost: 70,
    rippleMs: 1100,
    rippleWidth: 30,
    grain: 0,
    vignette: 0,
    hover: 50,
}

const DESIGN = 480

function clamp(v: number, a: number, b: number) {
    return v < a ? a : v > b ? b : v
}

function num(v: any, fallback: number) {
    return typeof v === "number" && isFinite(v) ? v : fallback
}

export interface RecreateReferenceExactlyProps {
    background?: string
    color?: string
    text?: string
    font?: Record<string, unknown>
    speed?: number
    scale?: number
    advanced?: {
        columns?: number
        rows?: number
        cycleMs?: number
        blobRadius?: number
        blobU?: number
        blobV?: number
        swing?: number
        swingPhase?: number
        drift?: number
        wrapU?: number
        minSize?: number
        maxSize?: number
        glyphFill?: number
        dimSmall?: number
        wallWidth?: number
        wallHeight?: number
        tilt?: number
        offsetY?: number
        wallOpacity?: number
        floorOpacity?: number
        hoverRadius?: number
        hoverBoost?: number
        rippleMs?: number
        rippleWidth?: number
        grain?: number
        vignette?: number
        hover?: number
    }
    style?: CSSProperties
}

/**
 * Letter grid on the inside corner of a cube (two walls and a floor). Each
 * letter swells and shrinks with a soft blob that drifts across every face
 * and loops.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function RecreateReferenceExactly(props: RecreateReferenceExactlyProps) {
    const {
        text = "COMPONENT",
        font = {"variant":"Bold","fontSize":24,"textAlign":"left","fontFamily":"Inter","fontWeight":400,"lineHeight":"1.5em","letterSpacing":"0em"},
        color = "#FFFFFF",
        background = "#000000",
        speed = 100,
        scale = 72,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(null)
    propsRef.current = {
        text,
        font,
        color,
        background,
        speed,
        scale,
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
        const resize = () => {
            w = root.offsetWidth
            h = root.offsetHeight
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(w * dpr))
            canvas.height = Math.max(1, Math.round(h * dpr))
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        // Grain tile, made once
        const tile = document.createElement("canvas")
        tile.width = 128
        tile.height = 128
        const tctx = tile.getContext("2d")
        let grainPattern: CanvasPattern | null = null
        if (tctx) {
            const img = tctx.createImageData(128, 128)
            for (let i = 0; i < img.data.length; i += 4) {
                const g = Math.random() * 255
                img.data[i] = g
                img.data[i + 1] = g
                img.data[i + 2] = g
                img.data[i + 3] = 255
            }
            tctx.putImageData(img, 0, 0)
            grainPattern = ctx.createPattern(tile, "repeat")
        }

        // Pointer state (CSS px) and design-space mapping of the last frame
        const pointer = { x: 0, y: 0, sx: 0, sy: 0, inside: false, over: 0 }
        const ripples: { x: number; y: number; t: number }[] = []
        let mapK = 1
        let mapOx = 0
        let mapOy = 0
        let elapsed = 0

        const toDesign = (cx: number, cy: number) => ({
            x: (cx * dpr - mapOx) / mapK,
            y: (cy * dpr - mapOy) / mapK,
        })

        const onMove = (e: PointerEvent) => {
            pointer.x = e.offsetX
            pointer.y = e.offsetY
            if (!pointer.inside && pointer.over < 0.02) {
                pointer.sx = pointer.x
                pointer.sy = pointer.y
            }
            pointer.inside = true
        }
        const onLeave = () => {
            pointer.inside = false
        }
        const onDown = (e: PointerEvent) => {
            pointer.x = e.offsetX
            pointer.y = e.offsetY
            pointer.inside = true
            const d = toDesign(e.offsetX, e.offsetY)
            ripples.push({ x: d.x, y: d.y, t: elapsed })
            if (ripples.length > 4) ripples.shift()
        }
        const onUp = () => {}
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        let raf = 0
        let last = -1
        let clock = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(1 / 20, (now - last) / 1000)
            last = now
            elapsed += dt

            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const spd = clamp(num(p.speed, 50), 0, 100) / 50
            clock += dt * spd

            const cw = canvas.width
            const ch = canvas.height

            // Pointer easing
            const hs = clamp(num(adv.hover, 50), 0, 100) / 50
            const ease = 1 - Math.exp(-dt * 6)
            pointer.over += ((pointer.inside ? 1 : 0) - pointer.over) * ease
            const follow = 1 - Math.exp(-dt * 10)
            pointer.sx += (pointer.x - pointer.sx) * follow
            pointer.sy += (pointer.y - pointer.sy) * follow

            // Background
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = "source-over"
            ctx.fillStyle = p.background || "#000000"
            ctx.fillRect(0, 0, cw, ch)

            const k =
                (Math.min(w, h) / DESIGN) *
                (clamp(num(p.scale, 100), 10, 300) / 100) *
                dpr
            const ox = (w * dpr) / 2 - (DESIGN / 2) * k
            const oy = (h * dpr) / 2 - (DESIGN / 2) * k
            mapK = k
            mapOx = ox
            mapOy = oy

            const pd = toDesign(pointer.sx, pointer.sy)

            // Geometry (design px, 480 box)
            const W = num(adv.wallWidth, 214)
            const H = num(adv.wallHeight, 286)
            const T = (W * num(adv.tilt, 22)) / 100
            const extent = H + 2 * T
            const Kx = DESIGN / 2
            const Ky = DESIGN / 2 + num(adv.offsetY, 0) - extent / 2
            const depth = W * Math.SQRT2
            const wallA = clamp(num(adv.wallOpacity, 100), 0, 100) / 100
            const floorA = clamp(num(adv.floorOpacity, 85), 0, 100) / 100

            const faces = [
                {
                    o: [Kx, Ky + H],
                    u: [W, T],
                    v: [-W, T],
                    wu: depth,
                    wv: depth,
                    a: floorA,
                },
                {
                    o: [Kx - W, Ky + T],
                    u: [W, -T],
                    v: [0, H],
                    wu: depth,
                    wv: H,
                    a: wallA,
                },
                {
                    o: [Kx, Ky],
                    u: [W, T],
                    v: [0, H],
                    wu: depth,
                    wv: H,
                    a: wallA,
                },
            ]

            // Field: a soft blob that swings in u and scrolls down in v, wrapping
            const cycle = Math.max(100, num(adv.cycleMs, 2470)) / 1000
            const phase = ((clock / cycle) % 1 + 1) % 1
            const ang = 2 * Math.PI * (phase + num(adv.swingPhase, 0) / 360)
            const uc =
                num(adv.blobU, 5) / 100 +
                (num(adv.swing, 25) / 100) * Math.cos(ang)
            let vc = num(adv.blobV, 45) / 100 + (num(adv.drift, 100) / 100) * phase
            vc = vc - Math.floor(vc)
            const wrapU = Math.max(1, num(adv.wrapU, 125) / 100)
            const sig = Math.max(0.02, num(adv.blobRadius, 21) / 100)
            const inv2s = 1 / (2 * sig * sig)
            const field = (u: number, v: number) => {
                let best = 0
                for (let i = -1; i <= 1; i++) {
                    const du = u - (uc + i * wrapU)
                    for (let j = -1; j <= 1; j++) {
                        const dv = v - (vc + j)
                        const f = Math.exp(-(du * du + dv * dv) * inv2s)
                        if (f > best) best = f
                    }
                }
                return best
            }

            // Pointer swell and press ripples (design px)
            const hR = Math.max(1, (num(adv.hoverRadius, 16) / 100) * DESIGN)
            const hInv = 1 / (2 * hR * hR)
            const hAmp = (hs * pointer.over * num(adv.hoverBoost, 70)) / 100
            const rDur = Math.max(100, num(adv.rippleMs, 1100)) / 1000
            const rW = Math.max(1, num(adv.rippleWidth, 30))
            for (let i = ripples.length - 1; i >= 0; i--) {
                if (elapsed - ripples[i].t > rDur) ripples.splice(i, 1)
            }

            const chars = Array.from(String(p.text || "SPACE"))
            const cols = Math.max(1, Math.round(num(adv.columns, 15)))
            const rows = Math.max(1, Math.round(num(adv.rows, 11)))
            const minS = num(adv.minSize, 12) / 100
            const maxS = num(adv.maxSize, 100) / 100
            const dim = clamp(num(adv.dimSmall, 50), 0, 100) / 100
            const fill = num(adv.glyphFill, 86) / 100

            const f = p.font || {}
            const fam = f.fontFamily
                ? `${f.fontFamily}, "Helvetica Neue", Arial, sans-serif`
                : `Inter, "Helvetica Neue", Arial, sans-serif`
            const weight = f.fontWeight ?? 700
            const fstyle = f.fontStyle || "normal"

            ctx.fillStyle = p.color || "#FFFFFF"
            ctx.textAlign = "center"
            ctx.textBaseline = "alphabetic"

            for (const face of faces) {
                if (face.a <= 0) continue
                const cellW = face.wu / cols
                const cellH = face.wv / rows
                const F = Math.max(1, Math.min(cellW / 0.7, cellH / 0.78) * fill)
                ctx.font = `${fstyle} ${weight} ${F}px ${fam}`
                const ax = (k * face.u[0]) / face.wu
                const ay = (k * face.u[1]) / face.wu
                const bx = (k * face.v[0]) / face.wv
                const by = (k * face.v[1]) / face.wv
                const baseY = F * 0.36

                for (let r = 0; r < rows; r++) {
                    const v = (r + 0.5) / rows
                    for (let c = 0; c < cols; c++) {
                        const u = (c + 0.5) / cols
                        const px = face.o[0] + u * face.u[0] + v * face.v[0]
                        const py = face.o[1] + u * face.u[1] + v * face.v[1]

                        let e = field(u, v)
                        if (hAmp > 0.001) {
                            const dx = px - pd.x
                            const dy = py - pd.y
                            e += hAmp * Math.exp(-(dx * dx + dy * dy) * hInv)
                        }
                        if (hs > 0) {
                            for (const rp of ripples) {
                                const prog = (elapsed - rp.t) / rDur
                                const rad = prog * DESIGN * 0.7
                                const dx = px - rp.x
                                const dy = py - rp.y
                                const d = Math.sqrt(dx * dx + dy * dy) - rad
                                e +=
                                    0.9 *
                                    hs *
                                    (1 - prog) *
                                    Math.exp(-(d * d) / (2 * rW * rW))
                            }
                        }
                        e = clamp(e, 0, 1)

                        const s = minS + (maxS - minS) * e
                        if (s <= 0.001) continue
                        ctx.globalAlpha = face.a * (dim + (1 - dim) * e)
                        ctx.setTransform(
                            ax * s,
                            ay * s,
                            bx * s,
                            by * s,
                            ox + k * px,
                            oy + k * py
                        )
                        ctx.fillText(chars[c % chars.length], 0, baseY)
                    }
                }
            }

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalAlpha = 1

            // Grain
            const grain = clamp(num(adv.grain, 0), 0, 100) / 100
            if (grain > 0 && grainPattern) {
                const rx = Math.floor(Math.random() * 128)
                const ry = Math.floor(Math.random() * 128)
                ctx.globalAlpha = grain * 0.45
                ctx.globalCompositeOperation = "overlay"
                ctx.setTransform(1, 0, 0, 1, rx, ry)
                ctx.fillStyle = grainPattern
                ctx.fillRect(-rx, -ry, cw, ch)
                ctx.globalCompositeOperation = "source-over"
                ctx.globalAlpha = grain * 0.12
                ctx.fillRect(-rx, -ry, cw, ch)
                ctx.setTransform(1, 0, 0, 1, 0, 0)
                ctx.globalAlpha = 1
            }

            // Vignette
            const vig = clamp(num(adv.vignette, 0), 0, 100) / 100
            if (vig > 0) {
                const diag = Math.sqrt(cw * cw + ch * ch) / 2
                const g = ctx.createRadialGradient(
                    cw / 2,
                    ch / 2,
                    diag * 0.3,
                    cw / 2,
                    ch / 2,
                    diag
                )
                g.addColorStop(0, "rgba(0,0,0,0)")
                g.addColorStop(1, `rgba(0,0,0,${vig})`)
                ctx.fillStyle = g
                ctx.fillRect(0, 0, cw, ch)
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
                }}
            />
        </div>
    )
}
