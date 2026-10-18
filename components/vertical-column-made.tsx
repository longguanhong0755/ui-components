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
    innerRadius: 60,
    innerAmp: 0,
    innerGlyphs: 35,
    innerGap: 25,
    innerSize: 70,
    innerSpin: 100,
    innerPhase: 90,
    innerAlpha: 100,
    middleRadius: 20,
    middleAmp: 15,
    middleGlyphs: 80,
    middleGap: 24,
    middleSize: 100,
    middleSpin: 80,
    middlePhase: 0,
    middleAlpha: 100,
    outerRadius: 21,
    outerAmp: 15,
    outerGlyphs: 80,
    outerGap: 24,
    outerSize: 100,
    outerSpin: 65,
    outerPhase: 180,
    outerAlpha: 100,
    spinSpeed: 10,
    waveLength: 140,
    waveDrift: 26,
    harmonic: 12,
    harmonicDrift: 17,
    camDistance: 180,
    backAlpha: 50,
    backSize: 50,
    depthCurve: 90,
    ringTwist: 37,
    startTime: 0,
    innerGlyph: "0",
    grain: 0,
    vignette: 100,
}

type Atlas = {
    key: string
    cv: HTMLCanvasElement
    cell: number
    px: number
    map: Map<string, number>
}

const FALLBACK_FAMILY = '"Helvetica Neue", Helvetica, Arial, sans-serif'

function resolveColor(c: string, fallback: string): string {
    if (typeof c !== "string" || !c) return fallback
    const m = c.match(/^var\([^,]+,\s*(.+)\)$/)
    return m ? m[1].trim() : c
}

function buildAtlas(key: string, chars: string[], color: string, family: string, weight: number | string, px: number): Atlas {
    const cell = Math.max(4, Math.ceil(px * 1.5))
    const cv = document.createElement("canvas")
    cv.width = cell * Math.max(1, chars.length)
    cv.height = cell
    const c = cv.getContext("2d")!
    c.fillStyle = color
    c.font = `${weight} ${px}px ${family}`
    c.textAlign = "center"
    c.textBaseline = "middle"
    const map = new Map<string, number>()
    chars.forEach((ch, i) => {
        map.set(ch, i)
        c.fillText(ch, i * cell + cell / 2, cell / 2 + px * 0.04)
    })
    return { key, cv, cell, px, map }
}

function makeNoise(): HTMLCanvasElement {
    const n = document.createElement("canvas")
    n.width = 128
    n.height = 128
    const c = n.getContext("2d")!
    const img = c.createImageData(128, 128)
    for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255
        img.data[i] = v
        img.data[i + 1] = v
        img.data[i + 2] = v
        img.data[i + 3] = 255
    }
    c.putImageData(img, 0, 0)
    return n
}

export interface VerticalColumnMadeProps {
    speed?: number
    scale?: number
    text?: string
    font?: Record<string, unknown>
    baseColor?: string
    wave?: number
    background?: string
    dragSensitivity?: number
    advanced?: {
        innerRadius?: number
        innerAmp?: number
        innerGlyphs?: number
        innerGap?: number
        innerSize?: number
        innerSpin?: number
        innerPhase?: number
        innerAlpha?: number
        middleRadius?: number
        middleAmp?: number
        middleGlyphs?: number
        middleGap?: number
        middleSize?: number
        middleSpin?: number
        middlePhase?: number
        middleAlpha?: number
        outerRadius?: number
        outerAmp?: number
        outerGlyphs?: number
        outerGap?: number
        outerSize?: number
        outerSpin?: number
        outerPhase?: number
        outerAlpha?: number
        spinSpeed?: number
        waveLength?: number
        waveDrift?: number
        harmonic?: number
        harmonicDrift?: number
        camDistance?: number
        backAlpha?: number
        backSize?: number
        depthCurve?: number
        ringTwist?: number
        startTime?: number
        innerGlyph?: string
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * Kinetic type column — thousands of letters on spinning 3D rings whose radius profile breathes.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function VerticalColumnMade(props: VerticalColumnMadeProps) {
    const {
        speed = 100,
        scale = 200,
        text = "TYPOGRAPHY COMPONENT",
        font = {"variant":"Regular","fontSize":"9px","textAlign":"left","fontFamily":"Inter","fontWeight":600,"lineHeight":1,"letterSpacing":"0em"},
        baseColor = "#FFFFFF",
        wave = 80,
        background = "#000000",
        dragSensitivity = 100,
        style,
    } = props

    const wrapRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = { ...props, speed, scale, text, font, baseColor, wave, background, dragSensitivity }

    useEffect(() => {
        const wrap = wrapRef.current
        const canvas = canvasRef.current
        if (!wrap || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const size = { w: wrap.offsetWidth, h: wrap.offsetHeight }
        const ro = new ResizeObserver(() => {
            size.w = wrap.offsetWidth
            size.h = wrap.offsetHeight
        })
        ro.observe(wrap)

        let reduced = false
        const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        if (mq) reduced = mq.matches
        const onMq = (e: MediaQueryListEvent) => {
            reduced = e.matches
        }
        mq?.addEventListener?.("change", onMq)

        // Horizontal drag turns the rings; release keeps the spin going and it eases out.
        const drag = { active: false, lastX: 0, lastT: 0, angle: 0, vel: 0 }
        const dragGain = () => (Math.max(0, Number(propsRef.current.dragSensitivity) || 0) / 50) * 0.008
        const onDown = (e: PointerEvent) => {
            if (e.pointerType === "mouse" && e.button !== 0) return
            if (dragGain() <= 0) return
            drag.active = true
            drag.lastX = e.clientX
            drag.lastT = performance.now()
            drag.vel = 0
            wrap.style.cursor = "grabbing"
        }
        const onMove = (e: PointerEvent) => {
            if (!drag.active) return
            const now = performance.now()
            const da = (e.clientX - drag.lastX) * dragGain()
            const dts = Math.max(1, now - drag.lastT) / 1000
            drag.angle += da
            drag.vel = drag.vel * 0.5 + (da / dts) * 0.5
            drag.lastX = e.clientX
            drag.lastT = now
        }
        const onUp = () => {
            if (!drag.active) return
            drag.active = false
            if (performance.now() - drag.lastT > 80) drag.vel = 0
            wrap.style.cursor = ""
        }
        wrap.addEventListener("pointerdown", onDown)
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const target = RenderTarget.current()
        const isStatic = target === RenderTarget.thumbnail || target === RenderTarget.export

        let atlas: Atlas | null = null
        let noise: HTMLCanvasElement | null = null
        let noisePattern: CanvasPattern | null = null
        let raf = 0
        let last: number | null = null
        let clock = 0

        const loop = (now: number) => {
            raf = requestAnimationFrame(loop)
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }

            let dt = last == null ? 0 : (now - last) / 1000
            last = now
            if (dt > 0.05) dt = 0.05
            const frozen = reduced || isStatic
            const sp = Math.max(0, Number(p.speed) || 0) / 50
            if (!frozen) clock += dt * sp
            const t = frozen ? 3.32 : clock + adv.startTime / 1000
            if (!drag.active) {
                if (reduced) drag.vel = 0
                drag.angle += drag.vel * dt
                drag.vel *= Math.exp(-dt * 3)
                if (Math.abs(drag.vel) < 0.001) drag.vel = 0
            }

            const W = size.w
            const H = size.h
            if (W < 2 || H < 2) return
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            const cw = Math.round(W * dpr)
            const ch = Math.round(H * dpr)
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw
                canvas.height = ch
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = "source-over"
            ctx.fillStyle = resolveColor(p.background, "#0B0B0B")
            ctx.fillRect(0, 0, W, H)

            const sc = Math.max(10, Number(p.scale) || 100) / 100
            const u = Math.min(W, H * 0.5625) * sc
            const cx = W / 2
            const cy = H / 2
            const maxR = (Math.max(adv.innerRadius + adv.innerAmp, adv.middleRadius + adv.middleAmp, adv.outerRadius + adv.outerAmp) / 100) * u
            const D = Math.max((adv.camDistance / 100) * u, maxR * 1.3 + 1)

            const f = p.font || {}
            const family = (f.fontFamily ? f.fontFamily + ", " : "") + FALLBACK_FAMILY
            const weight = f.fontWeight || 600
            const fs = parseFloat(String(f.fontSize ?? 11)) || 11
            const glyphPx = Math.max(2, (fs * u) / 720)
            const color = resolveColor(p.baseColor, "#EDEDED")

            const chars = String(p.text ?? "").replace(/\s+/g, "").split("")
            if (chars.length === 0) chars.push("0")
            const innerCh = String(adv.innerGlyph || "O").charAt(0) || "O"
            const uniq = Array.from(new Set([...chars, innerCh]))
            const maxShellSize = Math.max(adv.innerSize, adv.middleSize, adv.outerSize, 10) / 100
            const atlasPx = Math.max(4, Math.round(glyphPx * 1.3 * maxShellSize * dpr))
            const key = uniq.join("") + "|" + color + "|" + family + "|" + weight + "|" + atlasPx
            if (!atlas || atlas.key !== key) atlas = buildAtlas(key, uniq, color, family, weight, atlasPx)
            const cellCss = atlas.cell / dpr
            const atlasCss = atlas.px / dpr

            const w = Math.max(0, Number(p.wave) || 0) / 60
            const k = (Math.PI * 2) / Math.max(0.1, adv.waveLength / 100)
            const om1 = (adv.waveDrift * Math.PI) / 180
            const om2 = (adv.harmonicDrift * Math.PI) / 180
            const h = Math.min(1, Math.max(0, adv.harmonic / 100))
            const spinBase = (adv.spinSpeed * Math.PI) / 180
            const twist = (adv.ringTwist * Math.PI) / 180
            const back = Math.min(1, Math.max(0, adv.backAlpha / 100))
            const bSize = Math.min(1, Math.max(0.05, adv.backSize / 100))
            const curve = Math.max(0.1, adv.depthCurve / 100)

            const shells = [
                { R: adv.outerRadius, A: adv.outerAmp, n: adv.outerGlyphs, gap: adv.outerGap, size: adv.outerSize, spin: adv.outerSpin, ph: adv.outerPhase, a: adv.outerAlpha, off: 0.66, inner: false },
                { R: adv.middleRadius, A: adv.middleAmp, n: adv.middleGlyphs, gap: adv.middleGap, size: adv.middleSize, spin: adv.middleSpin, ph: adv.middlePhase, a: adv.middleAlpha, off: 0.33, inner: false },
                { R: adv.innerRadius, A: adv.innerAmp, n: adv.innerGlyphs, gap: adv.innerGap, size: adv.innerSize, spin: adv.innerSpin, ph: adv.innerPhase, a: adv.innerAlpha, off: 0, inner: true },
            ]

            const margin = glyphPx * 2
            const reach = (H / 2) * ((D + maxR) / D) + margin

            for (let s = 0; s < shells.length; s++) {
                const sh = shells[s]
                const N = Math.max(3, Math.round(sh.n))
                const gapPx = (Math.max(4, sh.gap) / 720) * u
                const rows = Math.ceil(reach / gapPx) + 1
                const phi = (sh.ph * Math.PI) / 180
                const spin = spinBase * (sh.spin / 100) * t
                const shellA = Math.max(0, sh.a / 100)
                const shellSize = Math.max(0.1, sh.size / 100)
                for (let i = -rows; i <= rows; i++) {
                    const Y = (i + sh.off) * gapPx
                    const Yu = Y / u
                    const prof =
                        (1 - h) * Math.sin(k * Yu + om1 * t + phi) +
                        h * Math.sin(2.3 * k * Yu - om2 * t + 1.7 * phi)
                    const r = Math.max(0.005, (sh.R + sh.A * w * prof) / 100) * u
                    const chr = sh.inner ? innerCh : chars[(((i + s * 5) % chars.length) + chars.length) % chars.length]
                    const idx = atlas.map.get(chr) ?? 0
                    const sx0 = idx * atlas.cell
                    const theta0 = i * twist + s * 1.1 + spin + drag.angle
                    for (let j = 0; j < N; j++) {
                        const th = theta0 + (j / N) * Math.PI * 2
                        const sn = Math.sin(th)
                        const z = r * sn
                        const persp = D / (D + z)
                        const sy = cy + Y * persp
                        if (sy < -margin || sy > H + margin) continue
                        const sx = cx + r * Math.cos(th) * persp
                        const depth = (1 - sn) / 2
                        const alpha = shellA * (back + (1 - back) * Math.pow(depth, curve))
                        if (alpha <= 0.01) continue
                        const g = glyphPx * shellSize * persp * (bSize + (1 - bSize) * depth)
                        const dw = cellCss * (g / atlasCss)
                        ctx.globalAlpha = alpha > 1 ? 1 : alpha
                        ctx.drawImage(atlas.cv, sx0, 0, atlas.cell, atlas.cell, sx - dw / 2, sy - dw / 2, dw, dw)
                    }
                }
            }

            ctx.globalAlpha = 1
            if (adv.vignette > 0) {
                const diag = Math.hypot(W, H) / 2
                const grad = ctx.createRadialGradient(cx, cy, diag * 0.35, cx, cy, diag)
                grad.addColorStop(0, "rgba(0,0,0,0)")
                grad.addColorStop(1, `rgba(0,0,0,${Math.min(1, adv.vignette / 100)})`)
                ctx.fillStyle = grad
                ctx.fillRect(0, 0, W, H)
            }
            if (adv.grain > 0) {
                if (!noise) noise = makeNoise()
                if (!noisePattern) noisePattern = ctx.createPattern(noise, "repeat")
                if (noisePattern) {
                    const ox = frozen ? 0 : Math.floor(Math.random() * 128)
                    const oy = frozen ? 0 : Math.floor(Math.random() * 128)
                    ctx.save()
                    ctx.globalAlpha = Math.min(1, adv.grain / 100) * 0.35
                    ctx.globalCompositeOperation = "overlay"
                    ctx.translate(-ox, -oy)
                    ctx.fillStyle = noisePattern
                    ctx.fillRect(ox, oy, W, H)
                    ctx.restore()
                }
            }
        }
        raf = requestAnimationFrame(loop)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            mq?.removeEventListener?.("change", onMq)
            wrap.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    return (
        <div
            ref={wrapRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                ...style,
                background,
                overflow: "hidden",
                cursor: dragSensitivity > 0 ? "grab" : undefined,
                touchAction: dragSensitivity > 0 ? "pan-y" : undefined,
                userSelect: "none",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
