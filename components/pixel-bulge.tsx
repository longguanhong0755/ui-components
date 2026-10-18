"use client"

import type { CSSProperties } from "react"
import { useEffect, useRef } from "react"

/**
 * Knit Chart Word — a word knitted into a square grid, bulged by a lens that rests at the
 * centre and swings out and back so whole cells snap on and off as the letters swell and squash.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    wordWidth: 92,
    wordAspect: 20,
    wordY: 47,
    tracking: -2,
    lensWidth: 30,
    widen: 100,
    anchor: 18,
    sweep: 30,
    periodMs: 6000,
    threshold: 50,
    ragged: 12,
    samples: 3,
    lineWidth: 1,
    seamColor: "#B4B4B4",
    followMs: 250,
    hoverBoost: 15,
    pressPulse: 10,
    pressDecayMs: 400,
    grain: 0,
    vignette: 0,
    hover: 50,
}

const MASK_PX = 240
const FALLBACK_FONTS = `Impact, "Haettenschweiler", "Arial Narrow Bold", "Arial Black", sans-serif`

function cellHash(i: number, j: number) {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function setSpacing(c: CanvasRenderingContext2D, px: number) {
    if ("letterSpacing" in c) (c as any).letterSpacing = `${px}px`
}

function familyStack(fam: string) {
    if (!fam) return FALLBACK_FONTS
    const listed = fam.includes(",") || fam.includes('"') || fam.includes("'")
    return `${listed ? fam : `"${fam}"`}, ${FALLBACK_FONTS}`
}

export interface WordWhateverSetProps {
    background?: string
    lineColor?: string
    inkColor?: string
    text?: string
    font?: Record<string, unknown>
    scale?: number
    cells?: number
    bulge?: number
    speed?: number
    advanced?: {
        wordWidth?: number
        wordAspect?: number
        wordY?: number
        tracking?: number
        lensWidth?: number
        widen?: number
        anchor?: number
        sweep?: number
        periodMs?: number
        threshold?: number
        ragged?: number
        samples?: number
        lineWidth?: number
        seamColor?: string
        followMs?: number
        hoverBoost?: number
        pressPulse?: number
        pressDecayMs?: number
        grain?: number
        vignette?: number
        hover?: number
    }
    style?: CSSProperties
}

export default function WordWhateverSet(props: WordWhateverSetProps) {
    const {
        text = "COMPONENT",
        font = {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Anton","fontWeight":400,"lineHeight":"1.5em","letterSpacing":"0em"},
        scale = 100,
        cells = 123,
        bulge = 65,
        speed = 50,
        background = "#000000",
        inkColor = "#0800FF",
        lineColor = "#000000",
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const live = useRef<any>({})
    live.current = { text, font, scale, cells, bulge, speed, background, inkColor, lineColor, advanced: props.advanced }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const maskCanvas = document.createElement("canvas")
        const mctx = maskCanvas.getContext("2d", { willReadFrequently: true })
        if (!mctx) return

        let mask: { data: Uint8Array; w: number; h: number } | null = null
        let maskKey = "\u0000"
        const requested = new Set<string>()

        // Grain tile, built once
        const tile = document.createElement("canvas")
        tile.width = tile.height = 128
        const tctx = tile.getContext("2d")
        let grainPattern: CanvasPattern | null = null
        if (tctx) {
            const img = tctx.createImageData(128, 128)
            for (let i = 0; i < 128 * 128; i++) {
                const v = Math.random() * 255
                img.data[i * 4] = v
                img.data[i * 4 + 1] = v
                img.data[i * 4 + 2] = v
                img.data[i * 4 + 3] = 255
            }
            tctx.putImageData(img, 0, 0)
            grainPattern = ctx.createPattern(tile, "repeat")
        }

        let W = root.offsetWidth
        let H = root.offsetHeight
        const ro = new ResizeObserver(() => {
            W = root.offsetWidth
            H = root.offsetHeight
        })
        ro.observe(root)

        const reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        const ptr = { x: 0, y: 0, inside: false }
        let overE = 0
        let ptrU = 0.5
        let pulse = 0
        let phase = 0
        let last = -1
        let raf = 0

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
            pulse = 1
        }
        const onUp = () => {}
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const onFonts = () => {
            maskKey = "\u0000"
        }
        const fonts: any = (document as any).fonts
        fonts?.addEventListener?.("loadingdone", onFonts)

        const bake = (txt: string, fam: string, weight: any, fst: string, trackPct: number) => {
            const f = `${fst} ${weight} ${MASK_PX}px ${familyStack(fam)}`
            if (!requested.has(f) && fonts?.load) {
                requested.add(f)
                fonts.load(f, txt).then(onFonts).catch(() => {})
            }
            const track = (trackPct / 100) * MASK_PX
            mctx.font = f
            setSpacing(mctx, track)
            const m = mctx.measureText(txt)
            const l = m.actualBoundingBoxLeft || 0
            const r = m.actualBoundingBoxRight || m.width
            const a = m.actualBoundingBoxAscent || MASK_PX * 0.8
            const d = m.actualBoundingBoxDescent || 0
            const w = Math.max(1, Math.ceil(l + r) + 2)
            const h = Math.max(1, Math.ceil(a + d) + 2)
            maskCanvas.width = w
            maskCanvas.height = h
            mctx.font = f
            setSpacing(mctx, track)
            mctx.textBaseline = "alphabetic"
            mctx.fillStyle = "#ffffff"
            mctx.fillText(txt, l + 1, a + 1)
            const px = mctx.getImageData(0, 0, w, h).data
            const data = new Uint8Array(w * h)
            for (let i = 0; i < w * h; i++) data[i] = px[i * 4 + 3] > 127 ? 1 : 0
            return { data, w, h }
        }

        const N_CUM = 400
        const cum = new Float32Array(N_CUM + 1)
        let colU = new Float32Array(0)
        let colSc = new Float32Array(0)
        const seamCells: number[] = []

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(1 / 20, (now - last) / 1000)
            last = now
            if (W < 1 || H < 1) return

            const p = live.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }

            const dpr = Math.min(2, window.devicePixelRatio || 1)
            const cw = Math.round(W * dpr)
            const ch = Math.round(H * dpr)
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw
                canvas.height = ch
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

            // ── text mask ──
            const fv = p.font || {}
            const fam = fv.fontFamily || "Anton"
            const weight = fv.fontWeight || 400
            const fst = fv.fontStyle || "normal"
            const txt = String(p.text ?? "")
            const key = [txt, fam, weight, fst, adv.tracking].join("|")
            if (key !== maskKey) {
                maskKey = key
                mask = txt.trim() ? bake(txt, fam, weight, fst, adv.tracking) : null
            }

            // ── time ──
            const still = !!(reduce && reduce.matches)
            const hk = still ? 0 : Math.max(0, adv.hover) / 50
            const rate = Math.max(0, p.speed) / 50
            const periodS = Math.max(0.1, adv.periodMs / 1000)
            if (!still) phase = (phase + (dt * rate) / periodS) % 1

            // ── square stage centred in the frame ──
            const side = Math.min(W, H)
            const gx0 = (W - side) / 2
            const gy0 = (H - side) / 2

            // ── word box ──
            const sc = Math.max(0.05, p.scale / 100)
            const bw = ((side * adv.wordWidth) / 100) * sc
            const bh = (bw * adv.wordAspect) / 100
            const bx = (W - bw) / 2
            const by = gy0 + (side * adv.wordY) / 100 - bh / 2

            // ── lens: rests at the centre, swings out and back ──
            const sw = Math.sin(Math.PI * 2 * phase)
            const cAuto = still ? 0.5 : 0.5 + (adv.sweep / 100) * sw * sw * sw
            const kF = dt > 0 ? 1 - Math.exp(-dt / Math.max(0.01, adv.followMs / 1000)) : 0
            overE += ((ptr.inside ? 1 : 0) - overE) * kF
            if (ptr.inside && bw > 0) {
                const u = Math.max(-0.1, Math.min(1.1, (ptr.x - bx) / bw))
                ptrU += (u - ptrU) * kF
            } else {
                ptrU += (cAuto - ptrU) * kF
            }
            pulse = Math.max(0, pulse - dt / Math.max(0.05, adv.pressDecayMs / 1000))
            const wgt = Math.min(1, overE * hk)
            const c = cAuto + (ptrU - cAuto) * wgt
            const A = Math.max(
                0,
                p.bulge / 100 + (adv.hoverBoost / 100) * overE * hk + (adv.pressPulse / 100) * pulse * pulse * hk
            )
            const B = (Math.max(0, adv.widen) / 100) * Math.min(2, A / 0.4)
            const sig = Math.max(0.02, adv.lensWidth / 100)
            const anch = Math.max(0, Math.min(1, adv.anchor / 100))
            const g = (u: number) => {
                const z = (u - c) / sig
                return Math.exp(-z * z)
            }

            // ── draw grid ──
            ctx.fillStyle = p.background
            ctx.fillRect(0, 0, W, H)

            const n = Math.max(8, Math.min(400, Math.round(p.cells)))
            const cs = side / n
            const iMin = Math.floor(-gx0 / cs)
            const iMax = Math.ceil((W - gx0) / cs) - 1
            const jMin = Math.floor(-gy0 / cs)
            const jMax = Math.ceil((H - gy0) / cs) - 1
            const lw = Math.max(0, adv.lineWidth)

            if (lw > 0) {
                ctx.beginPath()
                for (let i = iMin; i <= iMax + 1; i++) {
                    const x = gx0 + i * cs
                    ctx.moveTo(x, 0)
                    ctx.lineTo(x, H)
                }
                for (let j = jMin; j <= jMax + 1; j++) {
                    const y = gy0 + j * cs
                    ctx.moveTo(0, y)
                    ctx.lineTo(W, y)
                }
                ctx.strokeStyle = p.lineColor
                ctx.lineWidth = lw
                ctx.stroke()
            }

            // ── rasterise warped word into cells ──
            seamCells.length = 0
            if (mask && bw > 1 && bh > 1) {
                cum[0] = 0
                for (let i = 0; i < N_CUM; i++) cum[i + 1] = cum[i] + (1 + B * g((i + 0.5) / N_CUM)) / N_CUM
                const total = cum[N_CUM]

                const S = Math.max(1, Math.min(5, Math.round(adv.samples)))
                const c0 = Math.max(iMin, Math.floor((bx - gx0) / cs))
                const c1 = Math.min(iMax, Math.floor((bx + bw - gx0) / cs))
                const ncol = Math.max(0, (c1 - c0 + 1) * S)
                if (colU.length < ncol) {
                    colU = new Float32Array(ncol)
                    colSc = new Float32Array(ncol)
                }
                let jw = 0
                for (let k = 0; k < ncol; k++) {
                    const x = gx0 + (c0 + (k + 0.5) / S) * cs
                    const s = (x - bx) / bw
                    if (s < 0 || s >= 1) {
                        colU[k] = -1
                        continue
                    }
                    const t = s * total
                    while (jw < N_CUM - 1 && cum[jw + 1] < t) jw++
                    const span = cum[jw + 1] - cum[jw]
                    const u = (jw + (span > 0 ? (t - cum[jw]) / span : 0)) / N_CUM
                    colU[k] = u
                    colSc[k] = 1 + A * g(u)
                }

                const scMax = 1 + A
                const yTop = by + bh * anch - bh * anch * scMax
                const yBot = by + bh * anch + bh * (1 - anch) * scMax
                const r0 = Math.max(jMin, Math.floor((yTop - gy0) / cs))
                const r1 = Math.min(jMax, Math.floor((yBot - gy0) / cs))
                const { data, w: mw, h: mh } = mask
                const thr = adv.threshold / 100
                const rag = adv.ragged / 100
                const SS = S * S

                for (let j = r0; j <= r1; j++) {
                    for (let i = c0; i <= c1; i++) {
                        let count = 0
                        for (let sy = 0; sy < S; sy++) {
                            const yn = (gy0 + (j + (sy + 0.5) / S) * cs - by) / bh
                            for (let sx = 0; sx < S; sx++) {
                                const k = (i - c0) * S + sx
                                const u = colU[k]
                                if (u < 0) continue
                                const v = anch + (yn - anch) / colSc[k]
                                if (v < 0 || v >= 1) continue
                                count += data[Math.floor(v * mh) * mw + Math.floor(u * mw)]
                            }
                        }
                        if (count === 0) continue
                        const th = thr + (cellHash(i, j) - 0.5) * rag
                        if (count / SS >= th) seamCells.push(i, j)
                    }
                }
            }

            if (seamCells.length) {
                if (lw > 0) {
                    ctx.beginPath()
                    for (let q = 0; q < seamCells.length; q += 2) {
                        ctx.rect(gx0 + seamCells[q] * cs, gy0 + seamCells[q + 1] * cs, cs, cs)
                    }
                    ctx.fillStyle = adv.seamColor
                    ctx.fill()
                }
                const inset = lw / 2
                const cell = Math.max(0.5, cs - lw)
                ctx.beginPath()
                for (let q = 0; q < seamCells.length; q += 2) {
                    ctx.rect(gx0 + seamCells[q] * cs + inset, gy0 + seamCells[q + 1] * cs + inset, cell, cell)
                }
                ctx.fillStyle = p.inkColor
                ctx.fill()
            }

            // ── overlays ──
            if (adv.grain > 0 && grainPattern) {
                ctx.save()
                ctx.globalAlpha = Math.min(1, adv.grain / 100) * 0.35
                const ox = Math.floor(Math.random() * 128)
                const oy = Math.floor(Math.random() * 128)
                ctx.translate(-ox, -oy)
                ctx.fillStyle = grainPattern
                ctx.fillRect(0, 0, W + 128, H + 128)
                ctx.restore()
            }
            if (adv.vignette > 0) {
                const R = Math.hypot(W, H) / 2
                const grad = ctx.createRadialGradient(W / 2, H / 2, R * 0.35, W / 2, H / 2, R)
                grad.addColorStop(0, "rgba(0,0,0,0)")
                grad.addColorStop(1, `rgba(0,0,0,${Math.min(1, adv.vignette / 100)})`)
                ctx.fillStyle = grad
                ctx.fillRect(0, 0, W, H)
            }
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
            fonts?.removeEventListener?.("loadingdone", onFonts)
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
                overflow: "hidden",
                background,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
