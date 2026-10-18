"use client"

import type { CSSProperties } from "react"
import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * Planet-like Sphere — an ASCII gas giant. A shaded, banded 3D sphere is sampled
 * onto a fixed monospace grid; each cell's brightness picks a glyph from a
 * density ramp. The planet turns, its bands shear, and the light follows the pointer.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    period: 24,
    tilt: 20,
    poleTip: 14,
    offsetX: 0,
    offsetY: 0,
    cellAspect: 145,
    glyphScale: 112,
    fontWeight: 800,
    bandFill: 78,
    bandWarp: 40,
    streakScale: 140,
    streakCut: 15,
    streakFloor: 40,
    detail: 35,
    seed: 7,
    lightX: 20,
    lightY: 20,
    ambient: 35,
    contrast: 170,
    emptyCut: 5,
    shadowCut: 34,
    atDensity: 22,
    shear: 3,
    shimmer: 20,
    rimFade: 20,
    lightFollow: 45,
    pressBoost: 100,
    grain: 0,
    vignette: 0,
    hover: 50,
}

const RAMP = [" ", ".", ":", "-", "=", "+", "*", "%", "#", "@"]
const FONT_STACK = '"IBM Plex Mono", "SF Mono", Menlo, Consolas, "Courier New", monospace'

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smooth = (a: number, b: number, x: number) => {
    const t = clamp01((x - a) / (b - a))
    return t * t * (3 - 2 * t)
}

function hash3(a: number, b: number, c: number) {
    let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1274126177)) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
}

function makeNoise(seed: number) {
    let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1
    const rnd = () => {
        s = (s + 0x6d2b79f5) >>> 0
        let r = Math.imul(s ^ (s >>> 15), 1 | s)
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
    const base: number[] = []
    for (let i = 0; i < 256; i++) base.push(i)
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1))
        const tmp = base[i]
        base[i] = base[j]
        base[j] = tmp
    }
    const p = new Uint16Array(512)
    for (let i = 0; i < 512; i++) p[i] = base[i & 255]
    const v = new Float32Array(256)
    for (let i = 0; i < 256; i++) v[i] = rnd()
    return (x: number, y: number, z: number) => {
        const xi = Math.floor(x)
        const yi = Math.floor(y)
        const zi = Math.floor(z)
        const xf = x - xi
        const yf = y - yi
        const zf = z - zi
        const X = xi & 255
        const Y = yi & 255
        const Z = zi & 255
        const u = xf * xf * (3 - 2 * xf)
        const w = yf * yf * (3 - 2 * yf)
        const q = zf * zf * (3 - 2 * zf)
        const A = p[X] + Y
        const AA = p[A] + Z
        const AB = p[A + 1] + Z
        const B = p[X + 1] + Y
        const BA = p[B] + Z
        const BB = p[B + 1] + Z
        const x00 = v[p[AA]] + (v[p[BA]] - v[p[AA]]) * u
        const x10 = v[p[AB]] + (v[p[BB]] - v[p[AB]]) * u
        const x01 = v[p[AA + 1]] + (v[p[BA + 1]] - v[p[AA + 1]]) * u
        const x11 = v[p[AB + 1]] + (v[p[BB + 1]] - v[p[AB + 1]]) * u
        const y0 = x00 + (x10 - x00) * w
        const y1 = x01 + (x11 - x01) * w
        return y0 + (y1 - y0) * q
    }
}

export interface PlanetLikeSphereProps {
    speed?: number
    size?: number
    columns?: number
    bands?: number
    primary?: string
    accent?: string
    background?: string
    advanced?: {
        period?: number
        tilt?: number
        poleTip?: number
        offsetX?: number
        offsetY?: number
        cellAspect?: number
        glyphScale?: number
        fontWeight?: number
        bandFill?: number
        bandWarp?: number
        streakScale?: number
        streakCut?: number
        streakFloor?: number
        detail?: number
        seed?: number
        lightX?: number
        lightY?: number
        ambient?: number
        contrast?: number
        emptyCut?: number
        shadowCut?: number
        atDensity?: number
        shear?: number
        shimmer?: number
        rimFade?: number
        lightFollow?: number
        pressBoost?: number
        grain?: number
        vignette?: number
        hover?: number
    }
    style?: CSSProperties
}

export default function PlanetLikeSphere(props: PlanetLikeSphereProps) {
    const {
        speed = 50,
        size = 500,
        columns = 50,
        bands = 8,
        primary = "#004AFF",
        accent = "#5AE069",
        background = "#000000",
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
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        // ── pointer ──
        let px = 0
        let py = 0
        let overT = 0
        let down = false
        const onMove = (e: PointerEvent) => {
            px = e.offsetX
            py = e.offsetY
            overT = 1
        }
        const onLeave = () => {
            overT = 0
        }
        const onDown = (e: PointerEvent) => {
            px = e.offsetX
            py = e.offsetY
            overT = 1
            down = true
        }
        const onUp = () => {
            down = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const mq =
            typeof window !== "undefined" && window.matchMedia
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null

        // ── noise (per seed) ──
        let noiseSeed = NaN
        let n3 = makeNoise(7)

        // ── cell geometry (rebuilt when layout changes) ──
        let geoKey = ""
        let N = 0
        let gx = new Int32Array(0)
        let gy = new Int32Array(0)
        let gi = new Int32Array(0)
        let gj = new Int32Array(0)
        let gu = new Float32Array(0)
        let gv = new Float32Array(0)
        let gz = new Float32Array(0)
        let gLat = new Float32Array(0)
        let gLon = new Float32Array(0)
        let gHash = new Float32Array(0)
        let cw = 1
        let ch = 1

        // ── glyph atlas (10 glyphs × 2 colours) ──
        let atlasKey = ""
        const atlas = document.createElement("canvas")

        const buildAtlas = (fontPx: number, weight: number, c0: string, c1: string) => {
            atlas.width = cw * RAMP.length
            atlas.height = ch * 2
            const a = atlas.getContext("2d")
            if (!a) return
            a.clearRect(0, 0, atlas.width, atlas.height)
            a.font = `${weight} ${fontPx}px ${FONT_STACK}`
            a.textAlign = "center"
            a.textBaseline = "middle"
            const cols = [c0, c1]
            for (let row = 0; row < 2; row++) {
                a.fillStyle = cols[row]
                a.strokeStyle = cols[row]
                a.lineWidth = Math.max(0.5, fontPx * 0.045)
                for (let k = 1; k < RAMP.length; k++) {
                    a.save()
                    a.beginPath()
                    a.rect(k * cw, row * ch, cw, ch)
                    a.clip()
                    const gx0 = k * cw + cw / 2
                    const gy0 = row * ch + ch / 2 + fontPx * 0.04
                    a.fillText(RAMP[k], gx0, gy0)
                    // Heavier, blocky strokes like a bitmap terminal font.
                    a.strokeText(RAMP[k], gx0, gy0)
                    a.restore()
                }
            }
            // Crisp bitmap edges: hard alpha threshold.
            try {
                const img = a.getImageData(0, 0, atlas.width, atlas.height)
                const d = img.data
                for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 70 ? 255 : 0
                a.putImageData(img, 0, 0)
            } catch (e) {
                /* keep antialiased glyphs */
            }
        }

        // ── grain tile ──
        const grainTile = document.createElement("canvas")
        grainTile.width = 128
        grainTile.height = 128
        {
            const g = grainTile.getContext("2d")
            if (g) {
                const img = g.createImageData(128, 128)
                for (let i = 0; i < img.data.length; i += 4) {
                    const c = Math.random() * 255
                    img.data[i] = c
                    img.data[i + 1] = c
                    img.data[i + 2] = c
                    img.data[i + 3] = 255
                }
                g.putImageData(img, 0, 0)
            }
        }
        const grainPattern = ctx.createPattern(grainTile, "repeat")

        let raf = 0
        let last = -1
        let t = 0
        let shimmerClock = 0
        let overV = 0
        let pressV = 1
        let spu = 0
        let spv = 0

        const loop = (now: number) => {
            raf = requestAnimationFrame(loop)
            const dt = last < 0 ? 0 : Math.min(1 / 20, (now - last) / 1000)
            last = now

            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const reduce = !!(mq && mq.matches)
            const hoverK = Math.max(0, (adv.hover ?? 50) / 50) * (reduce ? 0.25 : 1)
            const rate = reduce ? 0 : Math.max(0, (p.speed ?? 50) / 50)

            // Pointer easing: presence ~0.4 s, press ~0.6 s.
            overV += (overT - overV) * (1 - Math.exp(-dt / 0.13))
            const pressTarget = down && overT > 0 ? 1 + (adv.pressBoost / 100) * hoverK : 1
            pressV += (pressTarget - pressV) * (1 - Math.exp(-dt / 0.2))

            const period = Math.max(1, adv.period)
            t += dt * rate * pressV
            if (t >= period) t -= period * Math.floor(t / period)
            if (rate > 0) shimmerClock += dt

            if (adv.seed !== noiseSeed) {
                noiseSeed = adv.seed
                n3 = makeNoise(adv.seed)
            }

            const diam = Math.max(10, p.size ?? 704)
            const cols = Math.max(4, p.columns ?? 86)
            const R = diam / 2
            const cellW = diam / cols
            const cellH = cellW * (adv.cellAspect / 100)
            const cx = w / 2 + (adv.offsetX / 100) * w
            const cy = h / 2 + (adv.offsetY / 100) * h

            const key = [w, h, dpr, diam, cols, adv.cellAspect, adv.tilt, adv.poleTip, adv.offsetX, adv.offsetY].join("|")
            if (key !== geoKey) {
                geoKey = key
                cw = Math.max(1, Math.round(cellW * dpr))
                ch = Math.max(1, Math.round(cellH * dpr))
                const ni = Math.ceil(R / cellW) + 1
                const nj = Math.ceil(R / cellH) + 1
                const cap = (2 * ni + 1) * (2 * nj + 1)
                gx = new Int32Array(cap)
                gy = new Int32Array(cap)
                gi = new Int32Array(cap)
                gj = new Int32Array(cap)
                gu = new Float32Array(cap)
                gv = new Float32Array(cap)
                gz = new Float32Array(cap)
                gLat = new Float32Array(cap)
                gLon = new Float32Array(cap)
                gHash = new Float32Array(cap)
                const th = (adv.tilt * Math.PI) / 180
                const ph = (adv.poleTip * Math.PI) / 180
                const ct = Math.cos(th)
                const st = Math.sin(th)
                const cp = Math.cos(ph)
                const sp = Math.sin(ph)
                N = 0
                for (let j = -nj; j <= nj; j++) {
                    for (let i = -ni; i <= ni; i++) {
                        const x = cx + i * cellW
                        const y = cy + j * cellH
                        const u = (x - cx) / R
                        const v = (y - cy) / R
                        const r2 = u * u + v * v
                        if (r2 > 1) continue
                        const z = Math.sqrt(1 - r2)
                        // Tilt the band axis in the screen plane (bands rise to the right).
                        const u1 = u * ct - v * st
                        const v1 = v * ct + u * st
                        const Y = -v1
                        // Tip the north pole toward the viewer so bands curve.
                        const y2 = Y * cp + z * sp
                        const z2 = z * cp - Y * sp
                        gx[N] = Math.round((x - cellW / 2) * dpr)
                        gy[N] = Math.round((y - cellH / 2) * dpr)
                        gi[N] = i
                        gj[N] = j
                        gu[N] = u
                        gv[N] = v
                        gz[N] = z
                        gLat[N] = y2
                        gLon[N] = Math.atan2(u1, z2)
                        gHash[N] = hash3(i, j, 991)
                        N++
                    }
                }
                atlasKey = ""
            }

            const c0 = p.primary ?? "#2FE3F0"
            const c1 = p.accent ?? "#E05AC4"
            const fontPx = Math.max(1, cellH * dpr * (adv.glyphScale / 100))
            const aKey = [cw, ch, fontPx, adv.fontWeight, c0, c1].join("|")
            if (aKey !== atlasKey) {
                atlasKey = aKey
                buildAtlas(fontPx, adv.fontWeight, c0, c1)
            }

            // Light: front, slightly upper-left; eases toward the pointer.
            const pu = Math.max(-1.2, Math.min(1.2, (px - cx) / R))
            const pv = Math.max(-1.2, Math.min(1.2, (py - cy) / R))
            const kp = 1 - Math.exp(-dt / 0.13)
            spu += (pu - spu) * kp
            spv += (pv - spv) * kp
            const follow = (adv.lightFollow / 100) * hoverK * overV
            const blx = adv.lightX / 100
            const bly = adv.lightY / 100
            let lx = blx + (spu - blx) * follow
            let ly = bly + (spv - bly) * follow
            const lm = lx * lx + ly * ly
            if (lm > 0.95) {
                const s = Math.sqrt(0.95 / lm)
                lx *= s
                ly *= s
            }
            const lz = Math.sqrt(Math.max(0.05, 1 - lx * lx - ly * ly))

            const nb = Math.max(1, p.bands ?? 9)
            const rot = (t / period) * Math.PI * 2
            const shearPhase = (t / (period / 4)) * Math.PI * 2
            const shearA = (adv.shear / 100) * Math.PI * 2
            const fill = Math.max(0.05, Math.min(0.95, adv.bandFill / 100))
            const warp = adv.bandWarp / 100
            const S = Math.max(0.1, adv.streakScale / 100)
            const cut = adv.streakCut / 100
            const sFloor = clamp01(adv.streakFloor / 100)
            const det = adv.detail / 100
            const amb = adv.ambient / 100
            const con = adv.contrast / 100
            const empty = adv.emptyCut / 100
            const shadow = adv.shadowCut / 100
            const atThr = 1 - 0.0075 * adv.atDensity
            const shim = reduce ? 0 : (adv.shimmer / 100) * (2 / 9)
            const tick = Math.floor(shimmerClock * 10)
            const rimA = adv.rimFade / 100

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = "source-over"
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.imageSmoothingEnabled = false

            for (let k = 0; k < N; k++) {
                const y2 = gLat[k]
                const lon = gLon[k] - rot + shearA * Math.sin(shearPhase + y2 * nb * 1.3)
                const cs = Math.cos(lon)
                const sn = Math.sin(lon)

                // Ragged band edges.
                const wn =
                    (n3(cs * 2.2, sn * 2.2, y2 * 5 + 11) * 0.65 +
                        n3(cs * 4.4, sn * 4.4, y2 * 10 + 23) * 0.35) -
                    0.5
                const phase = (y2 + wn * warp * 0.25) * Math.PI * nb
                const c = 0.5 + 0.5 * Math.cos(phase)
                const stripe = clamp01((c - (1 - fill)) / fill)
                if (stripe <= 0) continue

                // Lens / comet streaks along each band: modulate density, never gate it out.
                let f = 0
                let amp = 0.5
                let fr = S
                for (let o = 0; o < 3; o++) {
                    f += n3(cs * fr, sn * fr, (y2 * nb * 0.7 + 3) * (fr / S)) * amp
                    amp *= 0.5
                    fr *= 2
                }
                f = f / 0.875
                const fs = (f - 0.5) * 2.2 + 0.5
                const streak = sFloor + (1 - sFloor) * smooth(cut, cut + 0.55, fs)
                let band = Math.pow(stripe, 0.5) * streak
                if (band < 0.01) continue

                const dn = n3(cs * 14, sn * 14, y2 * 40 + 5)
                band *= 1 - det + det * 2 * dn

                const u = gu[k]
                const v = gv[k]
                const z = gz[k]
                const lam = Math.max(0, lx * u + ly * v + lz * z)
                const rimK = 1 - rimA * (1 - smooth(0, 0.45, z))
                let b = band * (amb + (1 - amb) * lam) * con * rimK
                if (shim > 0) b += (hash3(gi[k], gj[k], tick) - 0.5) * shim
                if (b < empty) continue

                let idx = 1 + Math.floor(((b - empty) / Math.max(0.01, 1 - empty)) * 8)
                if (idx > 8) idx = 8
                if (band > 0.2 && n3(cs * 24, sn * 24, y2 * 55 + 7) > atThr) idx = 9

                const isAccent = idx === 9 || (idx <= 4 && lam + (gHash[k] - 0.5) * 0.12 < shadow)
                ctx.drawImage(atlas, idx * cw, isAccent ? ch : 0, cw, ch, gx[k], gy[k], cw, ch)
            }

            // Overlays.
            const W = canvas.width
            const H = canvas.height
            if (adv.vignette > 0) {
                const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.55)
                g.addColorStop(0, "rgba(0,0,0,0)")
                g.addColorStop(1, `rgba(0,0,0,${Math.min(1, adv.vignette / 100)})`)
                ctx.fillStyle = g
                ctx.fillRect(0, 0, W, H)
            }
            if (adv.grain > 0 && grainPattern) {
                const ox = Math.floor(Math.random() * 128)
                const oy = Math.floor(Math.random() * 128)
                ctx.save()
                ctx.globalAlpha = Math.min(1, adv.grain / 100) * 0.22
                ctx.translate(ox, oy)
                ctx.fillStyle = grainPattern
                ctx.fillRect(-ox, -oy, W, H)
                ctx.restore()
            }
        }
        raf = requestAnimationFrame(loop)

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
                minWidth: 1200,
                minHeight: 800,
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                touchAction: "none",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
