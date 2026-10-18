"use client"

import type { CSSProperties } from "react"
import * as React from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    spinSeconds: 24,
    driftDeg: 6,
    driftCycles: 2,
    lineWidth: 3,
    dotSize: 80,
    dotSpacing: 7,
    dotOpacity: 88,
    lineOpacity: 100,
    gridRes: 160,
    baseSlope: 90,
    lowAmp: 105,
    lowWidth: 48,
    lowLat: 44,
    lowLon: 63,
    highAmp: 105,
    highWidth: 50,
    highLat: -40,
    highLon: -55,
    tlAmp: 110,
    lrAmp: 100,
    farAmp: 35,
    swirl: 0,
    axisTilt: 10,
    offsetY: 0,
    tiltDeg: 15,
    hudInset: 24,
    squareHud: true,
    labelOpacity: 100,
    tempSwing: 3,
    latSwing: 2,
    grain: 0,
    vignette: 0,
    hover: 50,
}

const DEG = Math.PI / 180
const TAU = Math.PI * 2
const LAT0 = -90 * DEG
const LAT_SPAN = 180 * DEG
const MONO = `"Space Mono", "DM Mono", "Roboto Mono", "DejaVu Sans Mono", "Liberation Mono", Menlo, Consolas, monospace`
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap"
const LON_BASE = 106 + 50 / 60 + 2.8 / 3600
const LAT_BASE = -(78 + 27 / 60 + 52.1 / 3600)
const TEMP_C = -89.2
const TEMP_F = -127.2
/** Pixel values are given for the reference's 720 px square, which fills 90% of the short side (800 px tall → 720). */
const REF_SIDE = 800
const HUD_SIDE = 720

function num(v: any, d: number) {
    const n = typeof v === "number" ? v : parseFloat(v)
    return Number.isFinite(n) ? n : d
}

function pad2(n: number) {
    return n < 10 ? "0" + n : "" + n
}

function dms(v: number) {
    const a = Math.abs(v)
    let d = Math.floor(a)
    const mf = (a - d) * 60
    let m = Math.floor(mf)
    let s = Math.round((mf - m) * 600) / 10
    if (s >= 60) {
        s -= 60
        m++
    }
    if (m >= 60) {
        m -= 60
        d++
    }
    const ss = s.toFixed(1)
    return `${d}º${pad2(m)}'${s < 10 ? "0" + ss : ss}"`
}

function fontFrom(f: any, k: number) {
    const o = f || {}
    const px = Math.max(4, num(o.fontSize, 22)) * k
    const family = o.fontFamily ? `${o.fontFamily}, ${MONO}` : MONO
    const weight = o.fontWeight || 400
    const st = o.fontStyle || "normal"
    let ls = o.letterSpacing
    if (typeof ls === "number") ls = `${ls * k}px`
    if (typeof ls !== "string" || !ls) ls = "0px"
    return { css: `${st} ${weight} ${px}px ${family}`, px, ls }
}

/** Seven pressure systems: lat, lon, amplitude, width (σ), drift phase. */
function centresFor(adv: any, A: number, D: number) {
    const list = [
        [adv.lowLat, adv.lowLon, -adv.lowAmp / 100, adv.lowWidth / 100, 0],
        [40, -50, -adv.tlAmp / 100, 0.44, 1.7],
        [adv.highLat, adv.highLon, adv.highAmp / 100, adv.highWidth / 100, 3.1],
        [-28, 54, adv.lrAmp / 100, 0.44, 4.4],
        [12, 175, -adv.farAmp / 100, 0.55, 2.2],
        [-25, 125, (adv.farAmp / 100) * 0.7, 0.45, 5.3],
        [40, -130, (adv.farAmp / 100) * 0.6, 0.45, 0.9],
    ]
    const out = new Float64Array(list.length * 5)
    for (let k = 0; k < list.length; k++) {
        const [la, lo, amp, wd, ph] = list[k]
        const lat = (la + A * (Math.sin(D + ph) - Math.sin(ph))) * DEG
        const lon = (lo + A * (Math.cos(D + ph) - Math.cos(ph))) * DEG
        const cl = Math.cos(lat)
        out[k * 5] = cl * Math.sin(lon)
        out[k * 5 + 1] = Math.sin(lat)
        out[k * 5 + 2] = cl * Math.cos(lon)
        out[k * 5 + 3] = amp
        const s = Math.max(0.05, wd)
        out[k * 5 + 4] = 1 / (s * s)
    }
    return out
}

/** Marching squares on a lat/lon grid of the sphere (pole to pole), chained into polylines of unit vectors. */
function createContourer() {
    let NX = 0
    let NY = 0
    let vals = new Float32Array(0)
    let nb1 = new Int32Array(0)
    let nb2 = new Int32Array(0)
    let seen = new Uint8Array(0)
    let touched = new Int32Array(0)

    function ensure(nx: number, ny: number) {
        if (nx === NX && ny === NY) return
        NX = nx
        NY = ny
        vals = new Float32Array(nx * ny)
        const E = 2 * nx * ny
        nb1 = new Int32Array(E).fill(-1)
        nb2 = new Int32Array(E).fill(-1)
        seen = new Uint8Array(E)
        touched = new Int32Array(E)
    }

    return function build(
        nx: number,
        ny: number,
        levelCount: number,
        centres: Float64Array,
        base: number,
        swirl: number,
        swirlPhase: number
    ) {
        ensure(nx, ny)
        const dLat = LAT_SPAN / (ny - 1)
        const dLon = TAU / nx
        const nc = centres.length / 5
        let lo = Infinity
        let hi = -Infinity
        for (let j = 0; j < ny; j++) {
            const lat = LAT0 + j * dLat
            const cl = Math.max(0, Math.cos(lat))
            const y = Math.sin(lat)
            for (let i = 0; i < nx; i++) {
                const lon = i * dLon
                const x = cl * Math.sin(lon)
                const z = cl * Math.cos(lon)
                let v = base * y
                for (let c = 0; c < nc; c++) {
                    const o = c * 5
                    const dot = x * centres[o] + y * centres[o + 1] + z * centres[o + 2]
                    v += centres[o + 3] * Math.exp(-(1 - dot) * centres[o + 4])
                }
                if (swirl) v += swirl * cl * Math.sin(2 * lon + 3 * lat + swirlPhase)
                vals[j * nx + i] = v
                if (v < lo) lo = v
                if (v > hi) hi = v
            }
        }
        // poles are single points: give each pole row one value so no contour crosses it sideways
        for (const j of [0, ny - 1]) {
            let s = 0
            for (let i = 0; i < nx; i++) s += vals[j * nx + i]
            const m = s / nx
            for (let i = 0; i < nx; i++) vals[j * nx + i] = m
        }

        const HN = nx * ny
        const polys: Float32Array[] = []
        const closed: boolean[] = []
        let tc = 0
        const link = (a: number, b: number) => {
            if (nb1[a] < 0) {
                nb1[a] = b
                touched[tc++] = a
            } else nb2[a] = b
            if (nb1[b] < 0) {
                nb1[b] = a
                touched[tc++] = b
            } else nb2[b] = a
        }

        for (let L = 0; L < levelCount; L++) {
            const lev = lo + ((hi - lo) * (L + 0.5)) / levelCount
            tc = 0
            for (let j = 0; j < ny - 1; j++) {
                for (let i = 0; i < nx; i++) {
                    const i1 = (i + 1) % nx
                    const a = vals[j * nx + i]
                    const b = vals[j * nx + i1]
                    const c = vals[(j + 1) * nx + i1]
                    const d = vals[(j + 1) * nx + i]
                    const code =
                        (a > lev ? 1 : 0) | (b > lev ? 2 : 0) | (c > lev ? 4 : 0) | (d > lev ? 8 : 0)
                    if (code === 0 || code === 15) continue
                    const e0 = j * nx + i
                    const e1 = HN + j * nx + i1
                    const e2 = (j + 1) * nx + i
                    const e3 = HN + j * nx + i
                    switch (code) {
                        case 1:
                        case 14:
                            link(e3, e0)
                            break
                        case 2:
                        case 13:
                            link(e0, e1)
                            break
                        case 3:
                        case 12:
                            link(e3, e1)
                            break
                        case 4:
                        case 11:
                            link(e1, e2)
                            break
                        case 6:
                        case 9:
                            link(e0, e2)
                            break
                        case 7:
                        case 8:
                            link(e3, e2)
                            break
                        case 5: {
                            const mid = (a + b + c + d) / 4 > lev
                            if (mid) {
                                link(e0, e1)
                                link(e2, e3)
                            } else {
                                link(e3, e0)
                                link(e1, e2)
                            }
                            break
                        }
                        case 10: {
                            const mid = (a + b + c + d) / 4 > lev
                            if (mid) {
                                link(e3, e0)
                                link(e1, e2)
                            } else {
                                link(e0, e1)
                                link(e2, e3)
                            }
                            break
                        }
                    }
                }
            }

            const pushPoint = (e: number, out: number[]) => {
                let lat: number
                let lon: number
                if (e < HN) {
                    const j = (e / nx) | 0
                    const i = e - j * nx
                    const v0 = vals[j * nx + i]
                    const v1 = vals[j * nx + ((i + 1) % nx)]
                    const t = v1 === v0 ? 0.5 : (lev - v0) / (v1 - v0)
                    lon = (i + t) * dLon
                    lat = LAT0 + j * dLat
                } else {
                    const k = e - HN
                    const j = (k / nx) | 0
                    const i = k - j * nx
                    const v0 = vals[j * nx + i]
                    const v1 = vals[(j + 1) * nx + i]
                    const t = v1 === v0 ? 0.5 : (lev - v0) / (v1 - v0)
                    lon = i * dLon
                    lat = LAT0 + (j + t) * dLat
                }
                const cl = Math.cos(lat)
                out.push(cl * Math.sin(lon), Math.sin(lat), cl * Math.cos(lon))
            }

            const walk = (start: number, isClosed: boolean) => {
                const pts: number[] = []
                let prev = -1
                let cur = start
                for (;;) {
                    seen[cur] = 1
                    pushPoint(cur, pts)
                    const n1 = nb1[cur]
                    const n2 = nb2[cur]
                    const next = n1 !== prev ? n1 : n2
                    if (next < 0 || seen[next]) break
                    prev = cur
                    cur = next
                }
                if (pts.length >= 9) {
                    polys.push(new Float32Array(pts))
                    closed.push(isClosed)
                }
            }

            for (let k = 0; k < tc; k++) {
                const e = touched[k]
                if (!seen[e] && nb2[e] < 0) walk(e, false)
            }
            for (let k = 0; k < tc; k++) {
                const e = touched[k]
                if (!seen[e]) walk(e, true)
            }
            for (let k = 0; k < tc; k++) {
                const e = touched[k]
                nb1[e] = -1
                nb2[e] = -1
                seen[e] = 0
            }
        }
        return { polys, closed }
    }
}

export interface WireframeGlobeMadeProps {
    speed?: number
    size?: number
    lineColor?: string
    lines?: number
    weather?: number
    background?: string
    advanced?: {
        spinSeconds?: number
        driftDeg?: number
        driftCycles?: number
        lineWidth?: number
        dotSize?: number
        dotSpacing?: number
        dotOpacity?: number
        lineOpacity?: number
        gridRes?: number
        baseSlope?: number
        lowAmp?: number
        lowWidth?: number
        lowLat?: number
        lowLon?: number
        highAmp?: number
        highWidth?: number
        highLat?: number
        highLon?: number
        tlAmp?: number
        lrAmp?: number
        farAmp?: number
        swirl?: number
        axisTilt?: number
        offsetY?: number
        tiltDeg?: number
        hudInset?: number
        squareHud?: boolean
        labelOpacity?: number
        tempSwing?: number
        latSwing?: number
        grain?: number
        vignette?: number
        hover?: number
    }
    style?: CSSProperties
}

/**
 * Wireframe weather globe: isobar contours on a turning sphere, near side solid, far side dotted.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function WireframeGlobeMade(props: WireframeGlobeMadeProps) {
    const {
        speed = 50,
        size = 450,
        lineColor = "#7891FF",
        lines = 30,
        weather = 100,
        background = "#000000",
        style,
    } = props
    const rootRef = React.useRef<HTMLDivElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const propsRef = React.useRef(props)
    propsRef.current = props
    const pointer = React.useRef({ x: 0, y: 0, over: false, down: false, lastX: 0, dragDx: 0 })

    React.useEffect(() => {
        if (typeof document === "undefined") return
        if (!document.getElementById("wgm-space-mono")) {
            const link = document.createElement("link")
            link.id = "wgm-space-mono"
            link.rel = "stylesheet"
            link.href = FONT_HREF
            document.head.appendChild(link)
        }
        const fonts: any = (document as any).fonts
        if (fonts && fonts.load) fonts.load(`22px "Space Mono"`).catch(() => {})
    }, [])

    React.useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const reduced =
            typeof window !== "undefined" && window.matchMedia
                ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
                : false

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

        // grain tile
        const grainTile = document.createElement("canvas")
        grainTile.width = 128
        grainTile.height = 128
        const gctx = grainTile.getContext("2d")
        let grainPattern: CanvasPattern | null = null
        if (gctx) {
            const img = gctx.createImageData(128, 128)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255
                img.data[i] = v
                img.data[i + 1] = v
                img.data[i + 2] = v
                img.data[i + 3] = 255
            }
            gctx.putImageData(img, 0, 0)
            grainPattern = ctx.createPattern(grainTile, "repeat")
        }

        const build = createContourer()
        let polys: Float32Array[] = []
        let closedArr: boolean[] = []
        let builtKey = ""
        let builtD = NaN
        let lastBuild = -1e9

        let SX = new Float32Array(256)
        let SY = new Float32Array(256)
        let SZ = new Float32Array(256)
        let dotBuf = new Float32Array(8192)

        let raf = 0
        let last = -1
        let phase = 0
        let spinOffset = 0
        let spinVel = 0
        let yaw = 0
        let pitch = 0

        const onUp = () => {
            pointer.current.down = false
        }
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const tick = (now: number) => {
            raf = requestAnimationFrame(tick)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            if (!w || !h) return

            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const sp = Math.max(0, num(p.speed, 50))
            const weatherK = Math.max(0, num(p.weather, 50)) / 50
            const levels = Math.max(2, Math.round(num(p.lines, 14)))
            const color = p.lineColor || "#FFFFFF"
            const hoverK = reduced ? 0 : Math.max(0, num(adv.hover, 50)) / 50

            if (!reduced) phase = (phase + (dt * (sp / 50)) / Math.max(1, num(adv.spinSeconds, 24))) % 1

            const side = Math.min(w, h)
            const k = side / REF_SIDE

            // pointer: tilt toward it, drag spins
            const pt = pointer.current
            let tYaw = 0
            let tPitch = 0
            if (pt.over && hoverK > 0) {
                const px = Math.max(-1, Math.min(1, (pt.x - w / 2) / (w / 2)))
                const py = Math.max(-1, Math.min(1, (pt.y - h / 2) / (h / 2)))
                tYaw = px * adv.tiltDeg * DEG * hoverK
                tPitch = -py * adv.tiltDeg * DEG * hoverK
            }
            const ease = 1 - Math.exp(-dt / 0.4)
            yaw += (tYaw - yaw) * ease
            pitch += (tPitch - pitch) * ease

            const R = (Math.max(20, num(p.size, 590)) / 2) * k
            if (pt.dragDx !== 0) {
                const d = (pt.dragDx / R) * hoverK
                spinOffset += d
                if (dt > 0) spinVel = spinVel * 0.5 + (d / dt) * 0.5
                pt.dragDx = 0
            } else if (!pt.down) {
                spinOffset += spinVel * dt
                spinVel *= Math.exp(-dt / 0.4)
            } else {
                spinVel *= Math.exp(-dt / 0.1)
            }

            // pressure field drift
            const cycles = Math.max(1, Math.round(num(adv.driftCycles, 2)))
            const D = TAU * phase * cycles
            const A = adv.driftDeg * weatherK
            const centres = centresFor(adv, A, D)
            const swirl = (adv.swirl / 100) * 0.6
            const swirlPhase = 0.6 * Math.sin(D) * weatherK
            const nx = Math.max(40, Math.round(num(adv.gridRes, 160) / 2) * 2)
            const ny = nx / 2 + 1
            const key = [
                nx, levels, weatherK, adv.baseSlope, adv.lowAmp, adv.lowWidth, adv.lowLat, adv.lowLon,
                adv.highAmp, adv.highWidth, adv.highLat, adv.highLon, adv.tlAmp, adv.lrAmp, adv.farAmp,
                adv.swirl, adv.driftDeg, cycles,
            ].join("|")
            if (key !== builtKey || (Math.abs(D - builtD) > 1e-5 && now - lastBuild > 33)) {
                const res = build(nx, ny, levels, centres, adv.baseSlope / 100, swirl, swirlPhase)
                polys = res.polys
                closedArr = res.closed
                builtKey = key
                builtD = D
                lastBuild = now
            }

            const cx = w / 2
            const cy = h / 2 + (adv.offsetY / 100) * HUD_SIDE * k
            const theta = TAU * phase + spinOffset + yaw
            const tilt = pitch + adv.axisTilt * DEG
            const cT = Math.cos(theta)
            const sT = Math.sin(theta)
            const cP = Math.cos(tilt)
            const sP = Math.sin(tilt)

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = "source-over"
            ctx.fillStyle = p.background || "#000000"
            ctx.fillRect(0, 0, w, h)

            const lw = Math.max(0.5, adv.lineWidth * k)
            const spacing = Math.max(2, adv.dotSpacing * k)
            const dotR = Math.max(0.3, (lw * adv.dotSize) / 200)
            let dotCount = 0
            const pushDot = (x: number, y: number) => {
                if (dotCount * 2 + 2 > dotBuf.length) {
                    const nb = new Float32Array(dotBuf.length * 2)
                    nb.set(dotBuf)
                    dotBuf = nb
                }
                dotBuf[dotCount * 2] = x
                dotBuf[dotCount * 2 + 1] = y
                dotCount++
            }
            let carry = spacing * 0.5
            const dotRun = (ax: number, ay: number, bx: number, by: number) => {
                const L = Math.hypot(bx - ax, by - ay)
                if (L <= 0) return
                while (carry <= L) {
                    const t = carry / L
                    pushDot(ax + (bx - ax) * t, ay + (by - ay) * t)
                    carry += spacing
                }
                carry -= L
            }

            ctx.beginPath()
            for (let q = 0; q < polys.length; q++) {
                const pts = polys[q]
                const n = pts.length / 3
                if (n > SX.length) {
                    SX = new Float32Array(n * 2)
                    SY = new Float32Array(n * 2)
                    SZ = new Float32Array(n * 2)
                }
                for (let i = 0; i < n; i++) {
                    const x = pts[i * 3]
                    const y = pts[i * 3 + 1]
                    const z = pts[i * 3 + 2]
                    const x1 = x * cT + z * sT
                    const z1 = -x * sT + z * cT
                    const y2 = y * cP - z1 * sP
                    const z2 = y * sP + z1 * cP
                    SX[i] = cx + R * x1
                    SY[i] = cy - R * y2
                    SZ[i] = z2
                }
                carry = spacing * 0.5
                let pen = false
                const segs = closedArr[q] ? n : n - 1
                for (let s = 0; s < segs; s++) {
                    const a = s
                    const b = (s + 1) % n
                    const za = SZ[a]
                    const zb = SZ[b]
                    if (za >= 0 && zb >= 0) {
                        if (!pen) {
                            ctx.moveTo(SX[a], SY[a])
                            pen = true
                        }
                        ctx.lineTo(SX[b], SY[b])
                    } else if (za < 0 && zb < 0) {
                        pen = false
                        dotRun(SX[a], SY[a], SX[b], SY[b])
                    } else {
                        const t = za / (za - zb)
                        const mx = SX[a] + (SX[b] - SX[a]) * t
                        const my = SY[a] + (SY[b] - SY[a]) * t
                        if (za >= 0) {
                            if (!pen) ctx.moveTo(SX[a], SY[a])
                            ctx.lineTo(mx, my)
                            pen = false
                            dotRun(mx, my, SX[b], SY[b])
                        } else {
                            dotRun(SX[a], SY[a], mx, my)
                            ctx.moveTo(mx, my)
                            ctx.lineTo(SX[b], SY[b])
                            pen = true
                        }
                    }
                }
            }
            ctx.strokeStyle = color
            ctx.lineWidth = lw
            ctx.lineJoin = "round"
            ctx.lineCap = "round"
            ctx.globalAlpha = Math.max(0, Math.min(1, adv.lineOpacity / 100))
            ctx.stroke()

            ctx.beginPath()
            for (let i = 0; i < dotCount; i++) {
                const x = dotBuf[i * 2]
                const y = dotBuf[i * 2 + 1]
                ctx.moveTo(x + dotR, y)
                ctx.arc(x, y, dotR, 0, TAU)
            }
            ctx.fillStyle = color
            ctx.globalAlpha = Math.max(0, Math.min(1, adv.dotOpacity / 100))
            ctx.fill()

            // vignette
            const vig = Math.max(0, adv.vignette) / 100
            if (vig > 0) {
                const g = ctx.createRadialGradient(w / 2, h / 2, side * 0.3, w / 2, h / 2, Math.hypot(w, h) / 2)
                g.addColorStop(0, "rgba(0,0,0,0)")
                g.addColorStop(1, `rgba(0,0,0,${Math.min(1, vig)})`)
                ctx.globalAlpha = 1
                ctx.fillStyle = g
                ctx.fillRect(0, 0, w, h)
            }
            // grain
            const gr = Math.max(0, adv.grain) / 100
            if (gr > 0 && grainPattern) {
                ctx.globalAlpha = Math.min(1, gr * 0.35)
                ctx.globalCompositeOperation = "overlay"
                ctx.fillStyle = grainPattern
                ctx.fillRect(0, 0, w, h)
                ctx.globalCompositeOperation = "source-over"
            }
            ctx.globalAlpha = 1
        }
        raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    const local = (e: React.PointerEvent) => {
        const el = rootRef.current
        if (!el) return { x: 0, y: 0 }
        const r = el.getBoundingClientRect()
        const sx = r.width ? el.offsetWidth / r.width : 1
        const sy = r.height ? el.offsetHeight / r.height : 1
        return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }
    }

    return (
        <div
            ref={rootRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                ...style,
                position: "relative",
                overflow: "hidden",
                background,
                touchAction: "pan-y",
            }}
            onPointerEnter={(e) => {
                const l = local(e)
                pointer.current.over = true
                pointer.current.x = l.x
                pointer.current.y = l.y
            }}
            onPointerLeave={() => {
                pointer.current.over = false
            }}
            onPointerDown={(e) => {
                const l = local(e)
                pointer.current.down = true
                pointer.current.lastX = l.x
            }}
            onPointerMove={(e) => {
                const l = local(e)
                const pt = pointer.current
                pt.over = true
                pt.x = l.x
                pt.y = l.y
                if (pt.down) {
                    pt.dragDx += l.x - pt.lastX
                    pt.lastX = l.x
                }
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}

const n = (title: string, defaultValue: number, min: number, max: number, unit?: string) => ({
    type: ControlType.Number,
    title,
    defaultValue,
    min,
    max,
    step: 1,
    ...(unit ? { unit } : {}),
})
