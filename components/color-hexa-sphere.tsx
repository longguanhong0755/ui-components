"use client"

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
    spinDps: 75,
    startAngle: 0,
    tiltX: 20,
    tiltZ: -12,
    cameraDistance: 40,
    centerX: 50,
    centerY: 51,
    minTile: 18,
    maxTile: 84,
    sizeBias: 130,
    pulseMs: 1160,
    pulseJitter: 25,
    lullMs: 1160,
    lullAt: 1090,
    lullDepth: 55,
    lullSpin: 30,
    thickness: 2,
    edgeShade: 45,
    backBrightness: 30,
    backScale: 55,
    outlineThreshold: 40,
    outlineFraction: 30,
    outlineScale: 94,
    outlineWidth: 2,
    outlineOpacity: 55,
    weightMagenta: 30,
    weightRed: 18,
    weightCyan: 14,
    weightMint: 8,
    weightLime: 12,
    weightOrange: 12,
    weightGold: 6,
    seed: 7,
}

type Colors = {
    magenta?: string
    red?: string
    cyan?: string
    mint?: string
    lime?: string
    orange?: string
    gold?: string
}

type Props = {
    speed?: number
    pulse?: number
    density?: number
    sphereSize?: number
    dragSensitivity?: number
    hoverBoost?: number
    background?: string
    colors?: Colors
    advanced?: Partial<typeof ADVANCED_DEFAULTS>
    style?: React.CSSProperties
}

const DEFAULT_COLORS = ["#E01EF0", "#FF1A1A", "#3FE6F0", "#3FE8B0", "#D8F020", "#F5A623", "#F0D028"]

type Geo = {
    cells: number
    center: Float64Array
    corners: Float64Array
    off: Int32Array
    count: Int32Array
    totalCorners: number
}

/** Goldberg polyhedron: dual of a frequency-n geodesic icosphere. 10n²+2 cells. */
function buildGeo(n: number): Geo {
    const t = (1 + Math.sqrt(5)) / 2
    const base = [
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ]
    const faces = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ]
    const verts: number[] = []
    const keys = new Map<string, number>()
    const addV = (x: number, y: number, z: number) => {
        const l = Math.hypot(x, y, z) || 1
        x /= l
        y /= l
        z /= l
        const key = `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`
        const hit = keys.get(key)
        if (hit !== undefined) return hit
        const id = verts.length / 3
        verts.push(x, y, z)
        keys.set(key, id)
        return id
    }
    const tris: number[] = []
    for (const [ia, ib, ic] of faces) {
        const A = base[ia], B = base[ib], C = base[ic]
        const g: number[][] = []
        for (let i = 0; i <= n; i++) {
            g[i] = []
            for (let j = 0; j <= n - i; j++) {
                const u = i / n, v = j / n
                g[i][j] = addV(
                    A[0] + (B[0] - A[0]) * u + (C[0] - A[0]) * v,
                    A[1] + (B[1] - A[1]) * u + (C[1] - A[1]) * v,
                    A[2] + (B[2] - A[2]) * u + (C[2] - A[2]) * v
                )
            }
        }
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n - i; j++) {
                tris.push(g[i][j], g[i + 1][j], g[i][j + 1])
                if (j < n - 1 - i) tris.push(g[i + 1][j], g[i + 1][j + 1], g[i][j + 1])
            }
        }
    }
    const vCount = verts.length / 3
    const adj: number[][] = Array.from({ length: vCount }, () => [])
    const cent: number[] = []
    for (let k = 0; k < tris.length; k += 3) {
        const a = tris[k], b = tris[k + 1], c = tris[k + 2]
        let x = verts[a * 3] + verts[b * 3] + verts[c * 3]
        let y = verts[a * 3 + 1] + verts[b * 3 + 1] + verts[c * 3 + 1]
        let z = verts[a * 3 + 2] + verts[b * 3 + 2] + verts[c * 3 + 2]
        const l = Math.hypot(x, y, z) || 1
        x /= l
        y /= l
        z /= l
        const id = cent.length / 3
        cent.push(x, y, z)
        adj[a].push(id)
        adj[b].push(id)
        adj[c].push(id)
    }
    const off = new Int32Array(vCount)
    const count = new Int32Array(vCount)
    let total = 0
    for (let v = 0; v < vCount; v++) {
        off[v] = total
        count[v] = adj[v].length
        total += adj[v].length
    }
    const corners = new Float64Array(total * 3)
    for (let v = 0; v < vCount; v++) {
        const nx = verts[v * 3], ny = verts[v * 3 + 1], nz = verts[v * 3 + 2]
        const ax = Math.abs(nx) < 0.9 ? 1 : 0, ay = ax ? 0 : 1
        const d = ax * nx + ay * ny
        let ux = ax - nx * d, uy = ay - ny * d, uz = -nz * d
        const ul = Math.hypot(ux, uy, uz) || 1
        ux /= ul
        uy /= ul
        uz /= ul
        const vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux
        const list = adj[v]
            .map((c) => {
                const dx = cent[c * 3] - nx, dy = cent[c * 3 + 1] - ny, dz = cent[c * 3 + 2] - nz
                return { c, a: Math.atan2(dx * vx + dy * vy + dz * vz, dx * ux + dy * uy + dz * uz) }
            })
            .sort((p, q) => p.a - q.a)
        list.forEach((e, j) => {
            const o = (off[v] + j) * 3
            corners[o] = cent[e.c * 3]
            corners[o + 1] = cent[e.c * 3 + 1]
            corners[o + 2] = cent[e.c * 3 + 2]
        })
    }
    return { cells: vCount, center: new Float64Array(verts), corners, off, count, totalCorners: total }
}

function hash(a: number, b: number, c: number) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1)
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
}

const colorCache = new Map<string, [number, number, number]>()
function parseColor(input: string | undefined, fallback: string): [number, number, number] {
    let s = (input || fallback).trim()
    const cached = colorCache.get(s)
    if (cached) return cached
    const key = s
    const varMatch = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (varMatch) s = varMatch[1].trim()
    let out: [number, number, number] | null = null
    if (s[0] === "#") {
        let hex = s.slice(1)
        if (hex.length === 3 || hex.length === 4) hex = hex.split("").map((ch) => ch + ch).join("")
        if (hex.length >= 6) {
            out = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
        }
    } else {
        const m = s.match(/rgba?\(([^)]+)\)/)
        if (m) {
            const parts = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat)
            if (parts.length >= 3) out = [parts[0], parts[1], parts[2]]
        }
    }
    if (!out || out.some((x) => !isFinite(x))) out = key === fallback ? [255, 255, 255] : parseColor(fallback, fallback)
    colorCache.set(key, out)
    return out
}

const rgb = (c: [number, number, number], f: number, a = 1) =>
    `rgba(${Math.round(c[0] * f)},${Math.round(c[1] * f)},${Math.round(c[2] * f)},${a})`

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function GetDescriptionYourself(props: Props) {
    const {
        speed = 50,
        pulse = 50,
        density = 7,
        sphereSize = 62,
        dragSensitivity = 50,
        hoverBoost = 50,
        background = "#000000",
        colors = {},
        style,
    } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = { ...props, speed, pulse, density, sphereSize, dragSensitivity, hoverBoost, background, colors }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let w = 0, h = 0, dpr = 1
        const resize = () => {
            w = root.offsetWidth
            h = root.offsetHeight
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(w * dpr))
            canvas.height = Math.max(1, Math.round(h * dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        const isThumb = RenderTarget.current() === RenderTarget.thumbnail
        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null

        let geo: Geo | null = null
        let geoN = -1
        let rc = new Float64Array(0)
        let rk = new Float64Array(0)
        const clock = { t: 0, pulse: 0, spin: 0 }

        let dragging = false
        let lastX = 0
        let lastY = 0
        let dragYaw = 0
        let dragTiltX = 0
        let hovering = false

        const onPointerDown = (e: PointerEvent) => {
            dragging = true
            lastX = e.clientX
            lastY = e.clientY
            canvas.style.cursor = "grabbing"
        }
        const onPointerMove = (e: PointerEvent) => {
            if (!dragging) return
            const dx = e.clientX - lastX
            const dy = e.clientY - lastY
            lastX = e.clientX
            lastY = e.clientY
            const sens = Math.max(0, propsRef.current.dragSensitivity ?? 50) / 50
            dragYaw += dx * 0.3 * sens
            dragTiltX = Math.max(-90, Math.min(90, dragTiltX + dy * 0.2 * sens))
        }
        const onPointerUp = () => {
            dragging = false
            canvas.style.cursor = "grab"
        }
        const onPointerEnter = () => {
            hovering = true
        }
        const onPointerLeave = () => {
            hovering = false
        }
        canvas.style.cursor = "grab"
        root.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)
        window.addEventListener("pointercancel", onPointerUp)
        root.addEventListener("pointerenter", onPointerEnter)
        root.addEventListener("pointerleave", onPointerLeave)

        const render = (pulseClock: number, spin: number) => {
            if (w <= 0 || h <= 0) return
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            const n = Math.max(1, Math.min(12, Math.round(p.density ?? 7)))
            if (n !== geoN || !geo) {
                geo = buildGeo(n)
                geoN = n
                rc = new Float64Array(geo.cells * 3)
                rk = new Float64Array(geo.totalCorners * 3)
            }
            const g = geo

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, w, h)

            const R = (Math.min(w, h) * Math.max(5, p.sphereSize ?? 72)) / 200
            const D = Math.max(1.2, adv.cameraDistance / 10)
            const Rd = (R * Math.sqrt(D * D - 1)) / D
            const cx = (w * adv.centerX) / 100
            const cy = (h * adv.centerY) / 100
            const seed = Math.round(adv.seed)

            // Rotation: spin about Y, then tilt about X, then Z.
            const a = ((adv.startAngle + spin + dragYaw) * Math.PI) / 180
            const ca = Math.cos(a), sa = Math.sin(a)
            const tx = ((adv.tiltX + dragTiltX) * Math.PI) / 180, tz = (adv.tiltZ * Math.PI) / 180
            const cxr = Math.cos(tx), sxr = Math.sin(tx), czr = Math.cos(tz), szr = Math.sin(tz)
            const rot = (src: Float64Array, dst: Float64Array, len: number) => {
                for (let i = 0; i < len; i++) {
                    const x = src[i * 3], y = src[i * 3 + 1], z = src[i * 3 + 2]
                    const x1 = x * ca + z * sa
                    const z1 = -x * sa + z * ca
                    const y2 = y * cxr - z1 * sxr
                    const z2 = y * sxr + z1 * cxr
                    dst[i * 3] = x1 * czr - y2 * szr
                    dst[i * 3 + 1] = x1 * szr + y2 * czr
                    dst[i * 3 + 2] = z2
                }
            }
            rot(g.center, rc, g.cells)
            rot(g.corners, rk, g.totalCorners)

            // Palette
            const c = p.colors ?? {}
            const pal = [
                parseColor(c.magenta, DEFAULT_COLORS[0]),
                parseColor(c.red, DEFAULT_COLORS[1]),
                parseColor(c.cyan, DEFAULT_COLORS[2]),
                parseColor(c.mint, DEFAULT_COLORS[3]),
                parseColor(c.lime, DEFAULT_COLORS[4]),
                parseColor(c.orange, DEFAULT_COLORS[5]),
                parseColor(c.gold, DEFAULT_COLORS[6]),
            ]
            const weights = [
                adv.weightMagenta, adv.weightRed, adv.weightCyan, adv.weightMint,
                adv.weightLime, adv.weightOrange, adv.weightGold,
            ].map((x) => Math.max(0, x))
            const wSum = weights.reduce((s, x) => s + x, 0) || 1
            const bright = pal.map((col) => rgb(col, 1))
            const dark = pal.map((col) => rgb(col, adv.edgeShade / 100))
            const back = pal.map((col) => rgb(col, adv.backBrightness / 100))
            const outlineCols = [2, 3, 4].map((k) => rgb(pal[k], 1, adv.outlineOpacity / 100))
            const pick = (r: number) => {
                let acc = 0
                for (let k = 0; k < 7; k++) {
                    acc += weights[k] / wSum
                    if (r < acc) return k
                }
                return 6
            }

            // Tile size pulse
            const amp = Math.max(0, p.pulse ?? 50) / 50
            const mn = adv.minTile / 100, mx = adv.maxTile / 100
            const mid = (mn + mx) / 2, half = ((mx - mn) / 2) * amp
            const basePeriod = Math.max(0.05, adv.pulseMs / 1000)
            const bias = Math.max(0.1, adv.sizeBias / 100)
            const invD = 1 / D

            const items: { i: number; z: number; front: boolean; s: number; col: number; cyc: number }[] = []
            for (let i = 0; i < g.cells; i++) {
                const z = rc[i * 3 + 2]
                const phase = hash(i, 1, seed) * Math.PI * 2
                const jit = (hash(i, 2, seed) * 2 - 1) * (adv.pulseJitter / 100)
                const theta = (Math.PI * 2 * pulseClock) / (basePeriod * (1 + jit)) + phase
                const s01 = Math.pow(0.5 + 0.5 * Math.sin(theta), bias)
                const s = Math.min(0.97, Math.max(0.03, mid + half * (2 * s01 - 1)))
                // Colour swaps when the tile is at its smallest.
                const cyc = Math.floor((theta + Math.PI / 2) / (Math.PI * 2))
                items.push({ i, z, front: z > invD, s, col: pick(hash(i, cyc, seed + 11)), cyc })
            }
            items.sort((p1, p2) => p1.z - p2.z)

            const path = (ci: number, s: number, lift: number) => {
                const off = g.off[ci], m = g.count[ci]
                const X = rc[ci * 3], Y = rc[ci * 3 + 1], Z = rc[ci * 3 + 2]
                ctx.beginPath()
                for (let j = 0; j < m; j++) {
                    const o = (off + j) * 3
                    const px = (X + s * (rk[o] - X)) * lift
                    const py = (Y + s * (rk[o + 1] - Y)) * lift
                    const pz = (Z + s * (rk[o + 2] - Z)) * lift
                    const k = D / (D - pz)
                    const sx = cx + px * Rd * k, sy = cy - py * Rd * k
                    if (j === 0) ctx.moveTo(sx, sy)
                    else ctx.lineTo(sx, sy)
                }
                ctx.closePath()
            }
            const projX = (ci: number, j: number, s: number, out: number[]) => {
                const o = (g.off[ci] + j) * 3
                const X = rc[ci * 3], Y = rc[ci * 3 + 1], Z = rc[ci * 3 + 2]
                const px = X + s * (rk[o] - X), py = Y + s * (rk[o + 1] - Y), pz = Z + s * (rk[o + 2] - Z)
                const k = D / (D - pz)
                out[0] = cx + px * Rd * k
                out[1] = cy - py * Rd * k
            }

            const lift = 1 + adv.thickness / 100
            const oScale = adv.outlineScale / 100
            const oThr = adv.outlineThreshold / 100
            const oFrac = adv.outlineFraction / 100
            const bScale = adv.backScale / 100
            ctx.lineJoin = "round"
            ctx.lineCap = "round"
            ctx.lineWidth = Math.max(0.5, (adv.outlineWidth * R) / 280)
            const pa = [0, 0], pb = [0, 0]

            for (const it of items) {
                if (!it.front) {
                    // Far hemisphere seen through the gaps: smaller, dim tiles.
                    path(it.i, it.s * bScale, 1)
                    ctx.fillStyle = back[it.col]
                    ctx.fill()
                    continue
                }
                // Tile thickness: a darker copy lifted off the surface peeks out on the outer side.
                if (lift > 1) {
                    path(it.i, it.s, lift)
                    ctx.fillStyle = dark[it.col]
                    ctx.fill()
                }
                // Broken cell outlines where the tile has shrunk.
                if (it.s < oThr && oFrac > 0) {
                    const m = g.count[it.i]
                    ctx.strokeStyle = outlineCols[Math.floor(hash(it.i, it.cyc, seed + 5) * 3) % 3]
                    ctx.beginPath()
                    for (let e = 0; e < m; e++) {
                        if (hash(it.i * 8 + e, it.cyc, seed + 3) >= oFrac) continue
                        projX(it.i, e, oScale, pa)
                        projX(it.i, (e + 1) % m, oScale, pb)
                        ctx.moveTo(pa[0], pa[1])
                        ctx.lineTo(pb[0], pb[1])
                    }
                    ctx.stroke()
                }
                path(it.i, it.s, 1)
                ctx.fillStyle = bright[it.col]
                ctx.fill()
            }
        }

        let raf = 0
        let last = -1
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            if (isThumb || (mq && mq.matches)) {
                render(0.8, 0.8 * adv.spinDps)
                return
            }
            const hoverAdd = hovering ? Math.max(0, p.hoverBoost ?? 50) / 50 : 0
            const sp = Math.max(0, p.speed ?? 50) / 50 + hoverAdd
            const wl = 0.5 + 0.5 * Math.cos((2 * Math.PI * (clock.t * 1000 - adv.lullAt)) / Math.max(50, adv.lullMs))
            clock.t += dt * sp
            clock.pulse += dt * sp * (1 - (adv.lullDepth / 100) * wl)
            clock.spin += dt * sp * adv.spinDps * (1 - (adv.lullSpin / 100) * wl)
            render(clock.pulse, clock.spin)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", onPointerUp)
            window.removeEventListener("pointercancel", onPointerUp)
            root.removeEventListener("pointerenter", onPointerEnter)
            root.removeEventListener("pointerleave", onPointerLeave)
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
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
