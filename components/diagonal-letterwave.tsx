"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * Isometric "GRAD" poster type: a flat lavender letter and lifted white letters
 * that ripple like cloth along the word's diagonal, each casting a hard shadow.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    periodMs: 4000,
    phase: 0,
    ampPct: 9,
    baseLift: 20,
    ramp: 100,
    strips: 90,
    shadowBase: 3,
    shadowLift: 5,
    shade: 6,
    angle: 30,
    tracking: -3,
    offsetX: 0,
    offsetY: 0,
    hoverRadius: 20,
    hoverBoost: 200,
    grain: 0,
    vignette: 0,
    hover: 50,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"offsetX":"advanced","offsetY":"advanced","hoverRadius":"advanced","hoverBoost":"advanced"}}
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

export interface PennantSwellProps {
    text?: string
    font?: { fontFamily?: string; fontWeight?: number | string; fontStyle?: string }
    size?: number
    /** Rotates the whole word on screen, around the frame centre. */
    textAngle?: number
    speed?: number
    amplitude?: number
    waveLength?: number
    background?: string
    letterColor?: string
    shadowColor?: string
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
    style?: React.CSSProperties
}

const num = (v: any, d: number) => (typeof v === "number" && isFinite(v) ? v : d)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const smooth = (x: number) => x * x * (3 - 2 * x)

function parseColor(c: any): [number, number, number, number] {
    if (!c || typeof c !== "string") return [0, 0, 0, 1]
    const s = c.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((x) => x + x)
                .join("")
        const n = parseInt(h.slice(0, 6), 16) || 0
        const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
    }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
        return [p[0] || 0, p[1] || 0, p[2] || 0, p[3] ?? 1]
    }
    return [0, 0, 0, 1]
}

function familyOf(font: any) {
    const fallback = `"Inter", "Arial Black", "Helvetica Neue", Arial, sans-serif`
    const f =
        font && typeof font.fontFamily === "string" ? font.fontFamily.trim() : ""
    if (!f) return fallback
    if (f.includes(",") || f.includes('"') || f.includes("'"))
        return `${f}, ${fallback}`
    return `"${f}", ${fallback}`
}

export default function PennantSwell(props: PennantSwellProps) {
    props = withMovedControls(props)
    const {
        text = "TEXT",
        font = {"variant":"Black","fontSize":"16px","textAlign":"left","fontFamily":"Inter","fontWeight":900,"lineHeight":"1.5em","letterSpacing":"0em"},
        size = 325,
        textAngle = -30,
        speed = 100,
        amplitude = 100,
        waveLength = 60,
        background = "#000000",
        letterColor = "#FFFFFF",
        shadowColor = "#0800FF",
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    // Pointer as a 0–1 share of the frame, so it lands under the cursor at any zoom.
    const ptrRef = useRef({ u: 0, v: 0, inside: false, down: false })
    const propsRef = useRef<any>(null)
    propsRef.current = {
        text,
        font,
        size,
        textAngle,
        speed,
        amplitude,
        waveLength,
        background,
        letterColor,
        shadowColor,
        advanced: props.advanced,
    }

    const setPtr = (e: React.PointerEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect()
        const ptr = ptrRef.current
        ptr.u = (e.clientX - r.left) / Math.max(1, r.width)
        ptr.v = (e.clientY - r.top) / Math.max(1, r.height)
        ptr.inside = true
    }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const measure = document.createElement("canvas").getContext("2d")!

        let W = 1
        let H = 1
        let dpr = 1
        const resize = () => {
            W = Math.max(1, root.offsetWidth)
            H = Math.max(1, root.offsetHeight)
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        let fontEpoch = 0
        const bump = () => {
            fontEpoch++
        }
        const fonts: any = (document as any).fonts
        fonts?.addEventListener?.("loadingdone", bump)
        fonts?.ready?.then?.(bump)

        const noise = document.createElement("canvas")
        noise.width = noise.height = 128
        const nctx = noise.getContext("2d")!
        const nid = nctx.createImageData(128, 128)
        for (let i = 0; i < nid.data.length; i += 4) {
            const v = Math.random() * 255
            nid.data[i] = nid.data[i + 1] = nid.data[i + 2] = v
            nid.data[i + 3] = 255
        }
        nctx.putImageData(nid, 0, 0)
        let pattern: CanvasPattern | null = null

        const makeGlyph = (
            ch: string,
            devFont: string,
            fpx: number,
            u: number,
            aw: number,
            letterCol: string,
            shadowCol: string
        ) => {
            measure.font = devFont
            const m = measure.measureText(ch)
            const left = Math.ceil(Math.max(0, m.actualBoundingBoxLeft || 0))
            const right = Math.ceil(m.actualBoundingBoxRight || m.width)
            const asc = Math.ceil(m.actualBoundingBoxAscent || fpx * 0.8)
            const desc = Math.ceil(Math.max(0, m.actualBoundingBoxDescent || 0))
            const pad = Math.ceil(fpx * 0.02) + 2
            const cw = Math.max(4, left + right + pad * 2)
            const chh = Math.max(4, asc + desc + pad * 2)
            const ox = pad + left
            const by = pad + asc
            const mk = (col: string) => {
                const c = document.createElement("canvas")
                c.width = cw
                c.height = chh
                const g = c.getContext("2d")!
                g.font = devFont
                g.textBaseline = "alphabetic"
                g.fillStyle = col
                g.fillText(ch, ox, by)
                return c
            }
            return {
                u,
                aw,
                cw,
                ch: chh,
                ox,
                by,
                letter: mk(letterCol),
                shadow: mk(shadowCol),
                shade: mk("#000000"),
            }
        }

        let layout: any = null
        let layoutKey = ""

        const reduced =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        const onUp = () => {
            ptrRef.current.down = false
        }
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        let lifts = new Float32Array(0)
        let shades = new Float32Array(0)
        let raf = 0
        let last = -1
        let tt = 0
        let overE = 0
        let downE = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const ptr = ptrRef.current
            const px = ptr.u * W
            const py = ptr.v * H

            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 0.05)
            last = now
            const hs = Math.max(0, num(adv.hover, 50)) / 50
            const ke = 1 - Math.exp(-dt / 0.13)
            overE += ((ptr.inside ? 1 : 0) - overE) * ke
            downE += ((ptr.down ? 1 : 0) - downE) * ke
            const T = Math.max(0.2, num(adv.periodMs, 4000) / 1000)
            const speedF =
                (clamp(num(p.speed, 50), 0, 100) / 50) * (1 + downE * hs)
            if (!reduced) tt += dt * speedF

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = "source-over"
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = p.background || "#000000"
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            const S = Math.max(10, num(p.size, 200))
            const family = familyOf(p.font)
            const weight = (p.font && p.font.fontWeight) || 900
            const fstyle = (p.font && p.font.fontStyle) || "normal"
            const lifted = String(p.text ?? "")
            const trackPct = num(adv.tracking, -3)

            const key = [
                S,
                dpr,
                family,
                weight,
                fstyle,
                lifted,
                p.letterColor,
                p.shadowColor,
                trackPct,
                fontEpoch,
            ].join("|")
            if (key !== layoutKey) {
                layoutKey = key
                const fontCss = `${fstyle} ${weight} ${S}px ${family}`
                const devFont = `${fstyle} ${weight} ${S * dpr}px ${family}`
                measure.font = fontCss
                const capH = measure.measureText("H").actualBoundingBoxAscent || S * 0.72
                const track = (trackPct / 100) * S
                let u = 0
                const liftStart = u
                const glyphs: any[] = []
                for (const ch of Array.from(lifted)) {
                    measure.font = fontCss
                    const aw = measure.measureText(ch).width
                    if (ch.trim())
                        glyphs.push(
                            makeGlyph(
                                ch,
                                devFont,
                                S * dpr,
                                u,
                                aw,
                                p.letterColor || "#FFFFFF",
                                p.shadowColor || "#4A71B8"
                            )
                        )
                    u += aw + track
                }
                const wordW = Math.max(u - (lifted ? track : 0), 1)
                layout = {
                    fontCss,
                    capH,
                    glyphs,
                    wordW,
                    liftStart,
                    liftLen: Math.max(1, wordW - liftStart),
                }
            }
            const L = layout

            // Isometric plane (Advanced › Angle), then the on-screen Text Angle
            // rotation on top: (u, v) on the page → (a·u + c·v, b·u + d·v).
            const ang = (num(adv.angle, 30) * Math.PI) / 180
            const ca = Math.cos(ang)
            const sa = Math.sin(ang)
            const rot = (num(p.textAngle, 0) * Math.PI) / 180
            const cr = Math.cos(rot)
            const sr = Math.sin(rot)
            const ma = cr * ca - sr * sa
            const mb = sr * ca + cr * sa
            const mc = -cr * ca - sr * sa
            const md = -sr * ca + cr * sa
            const A =
                (clamp(num(p.amplitude, 50), 0, 100) / 50) *
                (num(adv.ampPct, 9) / 100) *
                S
            const sB = (num(adv.shadowBase, 3) / 100) * S
            const sL = (num(adv.shadowLift, 5) / 100) * S

            // centre the projected word on the stage
            const pts: number[][] = [
                [0, -L.capH - A],
                [L.wordW, -L.capH - A],
                [0, sB + sL],
                [L.wordW, sB + sL],
            ]
            let minX = Infinity
            let maxX = -Infinity
            let minY = Infinity
            let maxY = -Infinity
            for (const [u, v] of pts) {
                const x = ma * u + mc * v
                const y = mb * u + md * v
                minX = Math.min(minX, x)
                maxX = Math.max(maxX, x)
                minY = Math.min(minY, y)
                maxY = Math.max(maxY, y)
            }
            const Ox =
                W / 2 + (num(adv.offsetX, 0) / 100) * W - (minX + maxX) / 2
            const Oy =
                H / 2 + (num(adv.offsetY, 0) / 100) * H - (minY + maxY) / 2

            ctx.setTransform(dpr * ma, dpr * mb, dpr * mc, dpr * md, dpr * Ox, dpr * Oy)
            ctx.textBaseline = "alphabetic"

            // lifted, rippling letters
            const lam = Math.max(
                4,
                (clamp(num(p.waveLength, 25), 10, 60) / 100) * Math.max(L.liftLen, S)
            )
            const N = clamp(Math.round(num(adv.strips, 90)), 12, 400)
            if (lifts.length !== N) {
                lifts = new Float32Array(N)
                shades = new Float32Array(N)
            }
            const base = clamp(num(adv.baseLift, 20), 0, 100) / 100
            const ramp = Math.max(0.05, num(adv.ramp, 100) / 100)
            const shadeMax = Math.max(0, num(adv.shade, 6)) / 100
            const R = Math.max(1, (num(adv.hoverRadius, 20) / 100) * W)
            const boostAmt = (num(adv.hoverBoost, 60) / 100) * hs * overE
            const ph = (num(adv.phase, 0) * Math.PI) / 180
            const TWO_PI = Math.PI * 2
            const vMid = -L.capH * 0.5

            for (const g of L.glyphs) {
                const sw = g.cw / N
                const swCss = sw / dpr
                const dh = g.ch / dpr
                const dyBase = -g.by / dpr
                const dxBase = g.u - g.ox / dpr
                for (let i = 0; i < N; i++) {
                    const uMid = dxBase + (i + 0.5) * swCss
                    const local = clamp((uMid - g.u) / Math.max(1, g.aw), 0, 1)
                    const w = base + (1 - base) * smooth(Math.min(1, local / ramp))
                    const phi = TWO_PI * (uMid / lam - tt / T) + ph
                    let boost = 1
                    if (boostAmt > 0.001) {
                        const sx = Ox + ma * uMid + mc * vMid
                        const sy = Oy + mb * uMid + md * vMid
                        const d2 =
                            ((sx - px) * (sx - px) + (sy - py) * (sy - py)) /
                            (R * R)
                        boost += boostAmt * Math.exp(-d2)
                    }
                    lifts[i] = w * (0.5 + 0.5 * Math.sin(phi)) * boost
                    shades[i] = Math.max(0, Math.cos(phi)) * w * shadeMax
                }
                ctx.globalAlpha = 1
                for (let i = 0; i < N; i++) {
                    const lift = lifts[i]
                    ctx.drawImage(
                        g.shadow,
                        i * sw,
                        0,
                        sw,
                        g.ch,
                        dxBase + i * swCss,
                        dyBase - A * lift + sB + sL * lift,
                        swCss + 0.6,
                        dh
                    )
                }
                for (let i = 0; i < N; i++) {
                    ctx.drawImage(
                        g.letter,
                        i * sw,
                        0,
                        sw,
                        g.ch,
                        dxBase + i * swCss,
                        dyBase - A * lifts[i],
                        swCss + 0.6,
                        dh
                    )
                }
                for (let i = 0; i < N; i++) {
                    const a = shades[i]
                    if (a < 0.004) continue
                    ctx.globalAlpha = Math.min(1, a)
                    ctx.drawImage(
                        g.shade,
                        i * sw,
                        0,
                        sw,
                        g.ch,
                        dxBase + i * swCss,
                        dyBase - A * lifts[i],
                        swCss,
                        dh
                    )
                }
                ctx.globalAlpha = 1
            }

            // overlays
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            const grain = clamp(num(adv.grain, 0), 0, 100)
            if (grain > 0) {
                if (!pattern) pattern = ctx.createPattern(noise, "repeat")
                if (pattern) {
                    ctx.save()
                    ctx.globalAlpha = (grain / 100) * 0.22
                    ctx.translate(-Math.random() * 128, -Math.random() * 128)
                    ctx.fillStyle = pattern
                    ctx.fillRect(0, 0, canvas.width + 128, canvas.height + 128)
                    ctx.restore()
                }
            }
            const vig = clamp(num(adv.vignette, 0), 0, 100)
            if (vig > 0) {
                const cw = canvas.width
                const chh = canvas.height
                const diag = Math.hypot(cw, chh) / 2
                const grd = ctx.createRadialGradient(
                    cw / 2,
                    chh / 2,
                    diag * 0.35,
                    cw / 2,
                    chh / 2,
                    diag
                )
                grd.addColorStop(0, "rgba(0,0,0,0)")
                grd.addColorStop(1, `rgba(0,0,0,${(vig / 100) * 0.85})`)
                ctx.fillStyle = grd
                ctx.fillRect(0, 0, cw, chh)
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            fonts?.removeEventListener?.("loadingdone", bump)
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
            onPointerMove={setPtr}
            onPointerEnter={setPtr}
            onPointerLeave={() => {
                ptrRef.current.inside = false
            }}
            onPointerDown={(e) => {
                setPtr(e)
                ptrRef.current.down = true
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
