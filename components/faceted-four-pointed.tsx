"use client"

import type { CSSProperties } from "react"
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

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    spinRate: 144,
    startAngle: 359,
    reverse: false,
    axisTilt: -27,
    sideArm: 87,
    depth: 30,
    waistAlong: 28,
    waistAcross: 30,
    perspective: 36,
    offsetX: 0,
    offsetY: 0,
    lightElevation: 32,
    ambient: 0,
    thresholdDot: 15,
    thresholdEq: 30,
    thresholdOne: 45,
    edgeSlash: true,
    subsamples: 2,
    minCoverage: 25,
    edgeFade: 20,
    fontScale: 115,
    fontWeight: 700,
    glyphOpacity: 100,
    grain: 0,
    vignette: 0,
}

const RAMP = [".", "=", "1", "0"]
const FONT_STACK =
    '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, "Courier New", monospace'

// Ring order: top tip, TR waist, right tip, BR waist, bottom tip, BL waist, left tip, TL waist
// then front centre (8) and back centre (9). Local coords: u = along the long axis (up),
// v = across (right), z = toward the viewer.
const TRIS: number[][] = (() => {
    const t: number[][] = []
    for (let i = 0; i < 8; i++) {
        const a = i
        const b = (i + 1) % 8
        t.push([8, a, b])
        t.push([9, a, b])
    }
    return t
})()

export interface FacetedFourPointedProps {
    background?: string
    color?: string
    speed?: number
    size?: number
    cellSize?: number
    lightAngle?: number
    dragSensitivity?: number
    advanced?: {
        spinRate?: number
        startAngle?: number
        reverse?: boolean
        axisTilt?: number
        sideArm?: number
        depth?: number
        waistAlong?: number
        waistAcross?: number
        perspective?: number
        offsetX?: number
        offsetY?: number
        lightElevation?: number
        ambient?: number
        thresholdDot?: number
        thresholdEq?: number
        thresholdOne?: number
        edgeSlash?: boolean
        subsamples?: number
        minCoverage?: number
        edgeFade?: number
        fontScale?: number
        fontWeight?: number
        glyphOpacity?: number
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
export default function FacetedFourPointed(props: FacetedFourPointedProps) {
    const {
        speed = 61,
        size = 516,
        cellSize = 13,
        color = "#15FFCA",
        background = "#000000",
        lightAngle = 359,
        dragSensitivity = 100,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

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
            canvas.style.width = w + "px"
            canvas.style.height = h + "px"
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const mq =
            typeof window.matchMedia === "function"
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null

        // grain tile
        const noise = document.createElement("canvas")
        noise.width = 160
        noise.height = 160
        const nctx = noise.getContext("2d")
        if (nctx) {
            const img = nctx.createImageData(160, 160)
            for (let i = 0; i < img.data.length; i += 4) {
                const g = Math.random() * 255
                img.data[i] = g
                img.data[i + 1] = g
                img.data[i + 2] = g
                img.data[i + 3] = 255
            }
            nctx.putImageData(img, 0, 0)
        }
        const noisePattern = ctx.createPattern(noise, "repeat")

        let depthBuf = new Float32Array(0)
        let triBuf = new Int8Array(0)

        const lu = new Float32Array(10)
        const lv = new Float32Array(10)
        const lz = new Float32Array(10)
        const ru = new Float32Array(10)
        const rv = new Float32Array(10)
        const rz = new Float32Array(10)
        const sx = new Float32Array(10)
        const sy = new Float32Array(10)
        const triClass = new Int8Array(TRIS.length)

        let angle = 0
        let last = -1
        let raf = 0

        // drag to turn the star about its long axis, with a fling on release
        let dragging = false
        let dragId = -1
        let lastX = 0
        let lastY = 0
        let lastT = 0
        let fling = 0
        const dragGain = () => Math.max(0, propsRef.current.dragSensitivity ?? 50) / 100

        const onDown = (e: PointerEvent) => {
            if (dragging || dragGain() <= 0) return
            dragging = true
            dragId = e.pointerId
            lastX = e.clientX
            lastY = e.clientY
            lastT = performance.now()
            fling = 0
        }
        const onMove = (e: PointerEvent) => {
            if (!dragging || e.pointerId !== dragId) return
            const adv = { ...ADVANCED_DEFAULTS, ...(propsRef.current.advanced ?? {}) }
            const tilt = (adv.axisTilt * Math.PI) / 180
            // pointer travel across the long axis turns the front face with the pointer
            const across =
                (e.clientX - lastX) * Math.cos(tilt) + (e.clientY - lastY) * Math.sin(tilt)
            const delta = -across * dragGain()
            angle += delta
            const now = performance.now()
            const dts = Math.max(1 / 240, (now - lastT) / 1000)
            fling = fling * 0.5 + (delta / dts) * 0.5
            lastX = e.clientX
            lastY = e.clientY
            lastT = now
        }
        const onUp = (e: PointerEvent) => {
            if (!dragging || e.pointerId !== dragId) return
            dragging = false
            dragId = -1
            if (performance.now() - lastT > 80) fling = 0
        }
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const draw = () => {
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, w, h)
            if (w < 2 || h < 2) return

            const minSide = Math.min(w, h)
            const cell = Math.max(4, p.cellSize ?? 16)
            const L = Math.max(4, (p.size ?? 650) / 2)
            const S = (L * adv.sideArm) / 100
            const d = (L * adv.depth) / 100
            const wu = (L * adv.waistAlong) / 100
            const wv = (S * adv.waistAcross) / 100

            // local star
            const U = [L, wu, 0, -wu, -L, -wu, 0, wu, 0, 0]
            const V = [0, wv, S, wv, 0, -wv, -S, -wv, 0, 0]
            const Z = [0, 0, 0, 0, 0, 0, 0, 0, d, -d]
            for (let i = 0; i < 10; i++) {
                lu[i] = U[i]
                lv[i] = V[i]
                lz[i] = Z[i]
            }

            const th = ((adv.startAngle + angle) * Math.PI) / 180
            const c = Math.cos(th)
            const s = Math.sin(th)
            const tilt = (adv.axisTilt * Math.PI) / 180
            const ax = Math.sin(tilt)
            const ay = -Math.cos(tilt)
            const vx = Math.cos(tilt)
            const vy = Math.sin(tilt)
            const cx = w / 2 + (adv.offsetX / 100) * minSide
            const cy = h / 2 + (adv.offsetY / 100) * minSide
            const f = adv.perspective > 0 ? L / (adv.perspective / 100) : 0

            for (let i = 0; i < 10; i++) {
                ru[i] = lu[i]
                rv[i] = lv[i] * c - lz[i] * s
                rz[i] = lv[i] * s + lz[i] * c
                let px = cx + ru[i] * ax + rv[i] * vx
                let py = cy + ru[i] * ay + rv[i] * vy
                if (f > 0) {
                    const k = f / Math.max(1e-3, f - rz[i])
                    px = cx + (px - cx) * k
                    py = cy + (py - cy) * k
                }
                sx[i] = px
                sy[i] = py
            }

            // light (screen coords: x right, y down, z toward viewer)
            const la = ((p.lightAngle ?? 0) * Math.PI) / 180
            const le = (adv.lightElevation * Math.PI) / 180
            const lx = Math.sin(la) * Math.cos(le)
            const ly = -Math.cos(la) * Math.cos(le)
            const lzz = Math.sin(le)
            const amb = adv.ambient / 100
            const t1 = adv.thresholdDot / 100
            const t2 = adv.thresholdEq / 100
            const t3 = adv.thresholdOne / 100

            for (let t = 0; t < TRIS.length; t++) {
                const [a, b, e] = TRIS[t]
                const e1u = ru[b] - ru[a]
                const e1v = rv[b] - rv[a]
                const e1z = rz[b] - rz[a]
                const e2u = ru[e] - ru[a]
                const e2v = rv[e] - rv[a]
                const e2z = rz[e] - rz[a]
                let nu = e1v * e2z - e1z * e2v
                let nv = e1z * e2u - e1u * e2z
                let nz = e1u * e2v - e1v * e2u
                const gu = ru[a] + ru[b] + ru[e]
                const gv = rv[a] + rv[b] + rv[e]
                const gz = rz[a] + rz[b] + rz[e]
                if (nu * gu + nv * gv + nz * gz < 0) {
                    nu = -nu
                    nv = -nv
                    nz = -nz
                }
                const len = Math.hypot(nu, nv, nz) || 1
                nu /= len
                nv /= len
                nz /= len
                const nsx = nu * ax + nv * vx
                const nsy = nu * ay + nv * vy
                const dot = nsx * lx + nsy * ly + nz * lzz
                const br = amb + (1 - amb) * Math.max(0, dot)
                triClass[t] = br >= t3 ? 3 : br >= t2 ? 2 : br >= t1 ? 1 : 0
            }

            // rasterise into sub-sample buffers
            const ss = Math.max(1, Math.min(4, Math.round(adv.subsamples)))
            const cols = Math.max(1, Math.floor(w / cell))
            const rows = Math.max(1, Math.floor(h / cell))
            const ox = (w - cols * cell) / 2
            const oy = (h - rows * cell) / 2
            const sw = cols * ss
            const sh = rows * ss
            const n = sw * sh
            if (depthBuf.length !== n) {
                depthBuf = new Float32Array(n)
                triBuf = new Int8Array(n)
            }
            depthBuf.fill(-1e9)
            triBuf.fill(-1)

            const toS = ss / cell
            for (let t = 0; t < TRIS.length; t++) {
                const [a, b, e] = TRIS[t]
                const x0 = (sx[a] - ox) * toS - 0.5
                const y0 = (sy[a] - oy) * toS - 0.5
                const x1 = (sx[b] - ox) * toS - 0.5
                const y1 = (sy[b] - oy) * toS - 0.5
                const x2 = (sx[e] - ox) * toS - 0.5
                const y2 = (sy[e] - oy) * toS - 0.5
                const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
                if (Math.abs(area) < 1e-6) continue
                const imin = Math.max(0, Math.ceil(Math.min(x0, x1, x2)))
                const imax = Math.min(sw - 1, Math.floor(Math.max(x0, x1, x2)))
                const jmin = Math.max(0, Math.ceil(Math.min(y0, y1, y2)))
                const jmax = Math.min(sh - 1, Math.floor(Math.max(y0, y1, y2)))
                const z0 = rz[a]
                const z1 = rz[b]
                const z2 = rz[e]
                for (let j = jmin; j <= jmax; j++) {
                    for (let i = imin; i <= imax; i++) {
                        const w0 = ((x1 - i) * (y2 - j) - (x2 - i) * (y1 - j)) / area
                        const w1 = ((i - x0) * (y2 - y0) - (x2 - x0) * (j - y0)) / area
                        const w2 = 1 - w0 - w1
                        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue
                        const z = w0 * z0 + w1 * z1 + w2 * z2
                        const idx = j * sw + i
                        if (z > depthBuf[idx]) {
                            depthBuf[idx] = z
                            triBuf[idx] = t
                        }
                    }
                }
            }

            // glyphs
            const fontPx = Math.max(4, (cell * adv.fontScale) / 100)
            ctx.font = `${adv.fontWeight} ${fontPx}px ${FONT_STACK}`
            ctx.textAlign = "center"
            ctx.textBaseline = "alphabetic"
            ctx.fillStyle = p.color ?? "#FAFAFA"
            const baseOff = fontPx * 0.36
            const total = ss * ss
            const minCov = adv.minCoverage / 100
            const fade = adv.edgeFade / 100
            const gOp = adv.glyphOpacity / 100

            for (let r = 0; r < rows; r++) {
                for (let q = 0; q < cols; q++) {
                    let cnt = 0
                    let sum = 0
                    let mn = 9
                    let mx = -1
                    for (let j = 0; j < ss; j++) {
                        const row = (r * ss + j) * sw + q * ss
                        for (let i = 0; i < ss; i++) {
                            const t = triBuf[row + i]
                            if (t < 0) continue
                            const k = triClass[t]
                            cnt++
                            sum += k
                            if (k < mn) mn = k
                            if (k > mx) mx = k
                        }
                    }
                    if (cnt === 0) continue
                    const cov = cnt / total
                    if (cov + 1e-6 < minCov) continue
                    const ch =
                        adv.edgeSlash && mx - mn >= 1
                            ? "/"
                            : RAMP[Math.max(0, Math.min(3, Math.round(sum / cnt)))]
                    ctx.globalAlpha = Math.max(0, Math.min(1, (1 - fade * (1 - cov)) * gOp))
                    ctx.fillText(ch, ox + (q + 0.5) * cell, oy + (r + 0.5) * cell + baseOff)
                }
            }
            ctx.globalAlpha = 1

            // grain
            if (adv.grain > 0 && noisePattern) {
                const rx = Math.floor(Math.random() * 160)
                const ry = Math.floor(Math.random() * 160)
                ctx.save()
                ctx.globalAlpha = (adv.grain / 100) * 0.35
                ctx.translate(-rx, -ry)
                ctx.fillStyle = noisePattern
                ctx.fillRect(rx, ry, w, h)
                ctx.restore()
            }
            // vignette
            if (adv.vignette > 0) {
                const rOuter = Math.hypot(w, h) / 2
                const g = ctx.createRadialGradient(w / 2, h / 2, rOuter * 0.35, w / 2, h / 2, rOuter)
                g.addColorStop(0, "rgba(0,0,0,0)")
                g.addColorStop(1, `rgba(0,0,0,${Math.min(1, adv.vignette / 100)})`)
                ctx.fillStyle = g
                ctx.fillRect(0, 0, w, h)
            }
        }

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(1 / 20, (now - last) / 1000)
            last = now
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const sp = Math.max(0, p.speed ?? 50) / 50
            const isStatic =
                (mq && mq.matches) || RenderTarget.current() === RenderTarget.thumbnail
            if (!isStatic && !dragging) {
                angle += (adv.reverse ? -1 : 1) * adv.spinRate * sp * dt
                if (fling !== 0) {
                    angle += fling * dt
                    fling *= Math.exp(-3 * dt)
                    if (Math.abs(fling) < 1) fling = 0
                }
            }
            draw()
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onMove)
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
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background,
                touchAction: dragSensitivity > 0 ? "none" : undefined,
                cursor: dragSensitivity > 0 ? "grab" : undefined,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, display: "block" }}
            />
        </div>
    )
}
