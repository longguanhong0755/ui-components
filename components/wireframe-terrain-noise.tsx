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
    centerX: 50,
    centerY: 50,
    tilt: 80,
    lineWeight: 100,
    lineOpacity: 100,
    levelOffset: 100,
    noiseScale: 390,
    octaves: 1,
    lacunarity: 400,
    gain: 0,
    noiseMorph: 6,
    ampScale: 87,
    gridRes: 200,
    seed: 999,
    loopMs: 5430,
    occlude: true,
    spin: 50,
    damping: 50,
    grain: 0,
    vignette: 0,
}

// Radial lift of the highest contour, as a fraction of the sphere radius (at Relief 100%).
const BASE_RELIEF = 0.06

function makePerm(seed: number) {
    const a: number[] = []
    for (let i = 0; i < 256; i++) a.push(i)
    let s = (seed * 2654435761) >>> 0 || 1
    const rnd = () => {
        s ^= s << 13
        s >>>= 0
        s ^= s >>> 17
        s ^= s << 5
        s >>>= 0
        return s / 4294967296
    }
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1))
        const t = a[i]
        a[i] = a[j]
        a[j] = t
    }
    const p = new Uint8Array(512)
    for (let i = 0; i < 512; i++) p[i] = a[i & 255]
    return p
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (t: number, a: number, b: number) => a + t * (b - a)
function grad(hash: number, x: number, y: number, z: number) {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
}

// 3D Perlin noise, periodic in z with integer period pz (so time can loop seamlessly).
function pnoise(p: Uint8Array, xIn: number, yIn: number, zIn: number, pz: number) {
    const xf = Math.floor(xIn)
    const yf = Math.floor(yIn)
    const zf = Math.floor(zIn)
    const X = xf & 255
    const Y = yf & 255
    const Z0 = ((zf % pz) + pz) % pz
    const Z1 = (Z0 + 1) % pz
    const x = xIn - xf
    const y = yIn - yf
    const z = zIn - zf
    const u = fade(x)
    const v = fade(y)
    const w = fade(z)
    const A = p[X] + Y
    const B = p[X + 1] + Y
    const pA = p[A]
    const pAB = p[A + 1]
    const pB = p[B]
    const pBB = p[B + 1]
    return lerp(
        w,
        lerp(
            v,
            lerp(u, grad(p[pA + Z0], x, y, z), grad(p[pB + Z0], x - 1, y, z)),
            lerp(u, grad(p[pAB + Z0], x, y - 1, z), grad(p[pBB + Z0], x - 1, y - 1, z))
        ),
        lerp(
            v,
            lerp(u, grad(p[pA + Z1], x, y, z - 1), grad(p[pB + Z1], x - 1, y, z - 1)),
            lerp(u, grad(p[pAB + Z1], x, y - 1, z - 1), grad(p[pBB + Z1], x - 1, y - 1, z - 1))
        )
    )
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export interface WireframeTerrainNoiseProps {
    speed?: number
    size?: number
    levels?: number
    detail?: number
    drag?: number
    lineColor?: string
    background?: string
    advanced?: {
        centerX?: number
        centerY?: number
        tilt?: number
        lineWeight?: number
        lineOpacity?: number
        levelOffset?: number
        noiseScale?: number
        octaves?: number
        lacunarity?: number
        gain?: number
        noiseMorph?: number
        ampScale?: number
        gridRes?: number
        seed?: number
        loopMs?: number
        occlude?: boolean
        spin?: number
        damping?: number
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
export default function WireframeTerrainNoise(props: WireframeTerrainNoiseProps) {
    const {
        speed = 21,
        size = 560,
        levels = 22,
        detail = 30,
        drag = 50,
        lineColor = "#FFD800",
        background = "#000000",
        style,
    } = props

    const wrapRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const live = useRef<any>(null)
    live.current = {
        speed,
        size,
        levels,
        detail,
        drag,
        lineColor,
        background,
        advanced: props.advanced,
    }

    useEffect(() => {
        const wrap = wrapRef.current
        const canvas = canvasRef.current
        if (!wrap || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let W = 0
        let H = 0
        let dpr = 1
        const resize = () => {
            W = wrap.offsetWidth
            H = wrap.offsetHeight
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
            lastSig = ""
        }
        const ro = new ResizeObserver(resize)
        ro.observe(wrap)

        const target = RenderTarget.current()
        const frozen = target === RenderTarget.export || target === RenderTarget.thumbnail
        const mq =
            typeof window !== "undefined" && window.matchMedia
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null

        let perm: Uint8Array = makePerm(ADVANCED_DEFAULTS.seed)
        let permSeed = ADVANCED_DEFAULTS.seed
        // Height per lat/long vertex and the vertex position on the (relief-lifted) sphere.
        let field = new Float32Array(0)
        let vx = new Float32Array(0)
        let vy = new Float32Array(0)
        let vz = new Float32Array(0)
        let lastField = ""
        const ex = new Float32Array(4)
        const ey = new Float32Array(4)
        const ez = new Float32Array(4)
        let grainPattern: CanvasPattern | null = null

        let phase = 0
        let last = -1
        let raf = 0
        let lastSig = ""

        // Rotation: yaw about the vertical axis, pitch toward the viewer; velocities in rad/s.
        let yaw = 0
        let pitch = (ADVANCED_DEFAULTS.tilt * Math.PI) / 180
        let pitchInit = ADVANCED_DEFAULTS.tilt
        let vYaw = 0
        let vPitch = 0
        let dragging = false
        let lastX = 0
        let lastY = 0
        let lastT = 0

        const onDown = (e: PointerEvent) => {
            const L = live.current
            if (!(L.drag > 0)) return
            dragging = true
            lastX = e.clientX
            lastY = e.clientY
            lastT = performance.now()
            vYaw = 0
            vPitch = 0
            wrap.style.cursor = "grabbing"
        }
        const onMove = (e: PointerEvent) => {
            if (!dragging) return
            const L = live.current
            const sens = (Math.max(0, L.drag) / 50) * 0.006
            const now = performance.now()
            const dts = Math.max(1, now - lastT) / 1000
            const dYaw = (e.clientX - lastX) * sens
            const dPitch = (e.clientY - lastY) * sens
            yaw += dYaw
            pitch = clamp(pitch + dPitch, -1.45, 1.45)
            vYaw = vYaw * 0.4 + (dYaw / dts) * 0.6
            vPitch = vPitch * 0.4 + (dPitch / dts) * 0.6
            lastX = e.clientX
            lastY = e.clientY
            lastT = now
        }
        const onUp = () => {
            if (!dragging) return
            dragging = false
            // A pause before letting go means no throw.
            if (performance.now() - lastT > 80) {
                vYaw = 0
                vPitch = 0
            }
            wrap.style.cursor = live.current.drag > 0 ? "grab" : ""
        }
        wrap.addEventListener("pointerdown", onDown)
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const draw = (L: any, adv: any) => {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = "source-over"
            ctx.clearRect(0, 0, W, H)
            ctx.fillStyle = L.background
            ctx.fillRect(0, 0, W, H)

            const seed = Math.round(adv.seed)
            if (seed !== permSeed) {
                perm = makePerm(seed)
                permSeed = seed
            }
            // Heightfield on a lat/long grid over the unit sphere. Two noise fields cross-fade
            // round a circle, so the terrain morphs and loops seamlessly with phase.
            const NL = clamp(Math.round(adv.gridRes / 2), 16, 100)
            const NO = NL * 2
            const stride = NO + 1
            const freq = (adv.noiseScale / 100) * Math.pow(2, (L.detail - 50) / 50)
            const oct = clamp(Math.round(adv.octaves), 1, 6)
            const lac = Math.max(1.1, adv.lacunarity / 100)
            const gain = clamp(adv.gain / 100, 0, 1)
            const morph = Math.max(1, Math.round(adv.noiseMorph))
            const relief = BASE_RELIEF * (adv.ampScale / 100)
            const fieldSig = [phase, seed, NL, freq, oct, lac, gain, morph, relief].join(",")
            if (fieldSig !== lastField) {
                lastField = fieldSig
                const count = (NL + 1) * stride
                if (field.length !== count) {
                    field = new Float32Array(count)
                    vx = new Float32Array(count)
                    vy = new Float32Array(count)
                    vz = new Float32Array(count)
                }
                let norm = 0
                let aa = 1
                for (let o = 0; o < oct; o++) {
                    norm += aa
                    aa *= gain
                }
                const th = phase * Math.PI * 2
                const ca = Math.cos(th) * (morph > 0 ? 1 : 1)
                const sa = Math.sin(th)
                const fbm = (x: number, y: number, z: number, o0: number) => {
                    let sum = 0
                    let a = 1
                    let f = freq
                    for (let o = 0; o < oct; o++) {
                        sum +=
                            a *
                            pnoise(perm, x * f + o0 + o * 17.1, y * f + 11.7 + o * 9.3, z * f + 5.1 + o * 3.7, 256)
                        a *= gain
                        f *= lac
                    }
                    return sum / norm
                }
                // Morph cycles: each full loop walks `morph` laps round the cross-fade circle.
                const cm = Math.cos(th * morph)
                const sm = Math.sin(th * morph)
                for (let j = 0; j <= NL; j++) {
                    const lat = -Math.PI / 2 + (Math.PI * j) / NL
                    const cl = Math.cos(lat)
                    const sl = Math.sin(lat)
                    for (let i = 0; i <= NO; i++) {
                        const idx = j * stride + i
                        if (i === NO) {
                            const k0 = j * stride
                            field[idx] = field[k0]
                            vx[idx] = vx[k0]
                            vy[idx] = vy[k0]
                            vz[idx] = vz[k0]
                            continue
                        }
                        const lon = (Math.PI * 2 * i) / NO
                        const x = cl * Math.cos(lon)
                        const y = sl
                        const z = cl * Math.sin(lon)
                        const h = clamp(1.4 * (cm * fbm(x, y, z, 37.3) + sm * fbm(x, y, z, 91.9)), -1, 1)
                        const r = 1 + relief * h
                        field[idx] = h
                        vx[idx] = x * r
                        vy[idx] = y * r
                        vz[idx] = z * r
                    }
                }
                void ca
                void sa
            }

            const cx = (W * adv.centerX) / 100
            const cy = (H * adv.centerY) / 100
            const R = Math.max(1, L.size) / 2
            const syw = Math.sin(yaw)
            const cyw = Math.cos(yaw)
            const sp = Math.sin(pitch)
            const cp = Math.cos(pitch)
            const K = clamp(Math.round(L.levels), 2, 120)
            const spacing = 2 / K
            const off = adv.levelOffset / 100
            const showBack = adv.occlude === false
            const front = new Path2D()
            const back = new Path2D()

            // Point between two vertices → rotated, projected screen point in ex/ey/ez[n].
            const put = (n: number, a: number, b: number, t: number) => {
                const x = vx[a] + (vx[b] - vx[a]) * t
                const y = vy[a] + (vy[b] - vy[a]) * t
                const z = vz[a] + (vz[b] - vz[a]) * t
                const x1 = x * cyw + z * syw
                const z1 = -x * syw + z * cyw
                const y2 = y * cp - z1 * sp
                const z2 = y * sp + z1 * cp
                ex[n] = cx + x1 * R
                ey[n] = cy - y2 * R
                ez[n] = z2
            }
            const seg = (p: number, q: number) => {
                const isFront = ez[p] > 0 && ez[q] > 0
                if (!isFront && !showBack) return
                const path = isFront ? front : back
                path.moveTo(ex[p], ey[p])
                path.lineTo(ex[q], ey[q])
            }

            for (let j = 0; j < NL; j++) {
                for (let i = 0; i < NO; i++) {
                    const i0 = j * stride + i
                    const i1 = i0 + 1
                    const i2 = i0 + stride + 1
                    const i3 = i0 + stride
                    const a0 = field[i0]
                    const a1 = field[i1]
                    const a2 = field[i2]
                    const a3 = field[i3]
                    const lo = Math.min(a0, a1, a2, a3)
                    const hi = Math.max(a0, a1, a2, a3)
                    let k0 = Math.ceil((lo + 1) / spacing - off)
                    let k1 = Math.floor((hi + 1) / spacing - off)
                    if (k0 < 0) k0 = 0
                    if (k1 > K - 1) k1 = K - 1
                    for (let k = k0; k <= k1; k++) {
                        const lv = -1 + (k + off) * spacing
                        const b0 = a0 >= lv
                        const b1 = a1 >= lv
                        const b2 = a2 >= lv
                        const b3 = a3 >= lv
                        let n = 0
                        if (b0 !== b1) put(n++, i0, i1, (lv - a0) / (a1 - a0))
                        if (b1 !== b2) put(n++, i1, i2, (lv - a1) / (a2 - a1))
                        if (b2 !== b3) put(n++, i2, i3, (lv - a2) / (a3 - a2))
                        if (b3 !== b0) put(n++, i3, i0, (lv - a3) / (a0 - a3))
                        if (n === 2) seg(0, 1)
                        else if (n === 4) {
                            // Saddle: the centre decides which corners the lines cut off.
                            if ((a0 + a1 + a2 + a3) / 4 >= lv === b0) {
                                seg(0, 1)
                                seg(2, 3)
                            } else {
                                seg(3, 0)
                                seg(1, 2)
                            }
                        }
                    }
                }
            }

            ctx.lineWidth = Math.max(0.1, adv.lineWeight / 100)
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
            ctx.strokeStyle = L.lineColor
            const op = clamp(adv.lineOpacity / 100, 0, 1)
            if (showBack) {
                ctx.globalAlpha = op * 0.25
                ctx.stroke(back)
            }
            ctx.globalAlpha = op
            ctx.stroke(front)
            ctx.globalAlpha = 1

            if (adv.vignette > 0) {
                const g = ctx.createRadialGradient(
                    W / 2,
                    H / 2,
                    Math.min(W, H) * 0.3,
                    W / 2,
                    H / 2,
                    Math.max(W, H) * 0.75
                )
                g.addColorStop(0, "rgba(0,0,0,0)")
                g.addColorStop(1, `rgba(0,0,0,${clamp(adv.vignette / 100, 0, 1)})`)
                ctx.fillStyle = g
                ctx.fillRect(0, 0, W, H)
            }

            if (adv.grain > 0) {
                if (!grainPattern) {
                    const gc = document.createElement("canvas")
                    gc.width = 160
                    gc.height = 160
                    const gx = gc.getContext("2d")
                    if (gx) {
                        const img = gx.createImageData(160, 160)
                        for (let q = 0; q < img.data.length; q += 4) {
                            const val = Math.floor(Math.random() * 256)
                            img.data[q] = val
                            img.data[q + 1] = val
                            img.data[q + 2] = val
                            img.data[q + 3] = 255
                        }
                        gx.putImageData(img, 0, 0)
                        grainPattern = ctx.createPattern(gc, "repeat")
                    }
                }
                if (grainPattern) {
                    const ox = Math.floor(Math.random() * 160)
                    const oy = Math.floor(Math.random() * 160)
                    ctx.save()
                    ctx.globalAlpha = clamp(adv.grain / 100, 0, 1) * 0.25
                    ctx.translate(-ox, -oy)
                    ctx.fillStyle = grainPattern
                    ctx.fillRect(0, 0, W + 160, H + 160)
                    ctx.restore()
                }
            }
        }

        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            const dt = last < 0 ? 0 : Math.min(1 / 20, (now - last) / 1000)
            last = now
            const L = live.current
            const adv = { ...ADVANCED_DEFAULTS, ...(L.advanced ?? {}) }
            const still = frozen || (mq ? mq.matches : false)
            const rate = Math.max(0, L.speed) / 50

            if (adv.tilt !== pitchInit) {
                pitchInit = adv.tilt
                pitch = clamp((adv.tilt * Math.PI) / 180, -1.45, 1.45)
            }
            if (!dragging) {
                // Throw inertia; Damping: higher settles faster.
                yaw += vYaw * dt
                pitch = clamp(pitch + vPitch * dt, -1.45, 1.45)
                const decay = Math.exp(-dt * (0.5 + Math.max(0, adv.damping) / 8))
                vYaw *= decay
                vPitch *= decay
                if (Math.abs(vYaw) < 1e-4) vYaw = 0
                if (Math.abs(vPitch) < 1e-4) vPitch = 0
                if (!still) yaw += ((adv.spin * Math.PI) / 180) * rate * dt
            }

            if (still) {
                phase = 0
                const sig = JSON.stringify([L, W, H, dpr, yaw, pitch])
                if (sig === lastSig) return
                lastSig = sig
            } else {
                lastSig = ""
                phase = (phase + (dt * rate * 1000) / Math.max(100, adv.loopMs)) % 1
            }
            if (W < 1 || H < 1) return
            draw(L, adv)
        }

        resize()
        raf = requestAnimationFrame(tick)
        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
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
                overflow: "hidden",
                background,
                cursor: drag > 0 ? "grab" : undefined,
                touchAction: drag > 0 ? "none" : undefined,
                userSelect: "none",
                ...style,
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
