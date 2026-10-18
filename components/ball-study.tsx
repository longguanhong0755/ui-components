"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const MAX_DPR = 2
const FACE = '"Courier New", Courier, monospace'
const CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789=?#§¶△◊×÷%@&*/<>+-$¥£ΑΒΓΔΕΖΗΘΛΞΠΣΦΨΩαβγδεζηθλμξπστυφχψω«»‹›"
const TILT = 0.17
const RR = 0.3065 // sphere radius, as a fraction of the card's short edge
const FS = 0.0265 // glyph size, same measure
const CYOFF = 0.046 // and how far the ball sits below centre
const MAX_PARTS = 420

function num(v: unknown, fb: number): number {
    return typeof v === "number" && isFinite(v) ? v : fb
}

function clampN(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

function rng(seed: number): () => number {
    let s = seed >>> 0
    return function () {
        s ^= s << 13
        s >>>= 0
        s ^= s >> 17
        s ^= s << 5
        s >>>= 0
        return s / 4294967296
    }
}

function parseRGB(input: string | undefined, fb: [number, number, number]): [number, number, number] {
    if (!input) return fb
    const str = String(input).trim()
    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b]
        }
        return fb
    }
    const m = str.match(/[\d.]+/g)
    if (m && m.length >= 3) return [+m[0], +m[1], +m[2]]
    return fb
}

interface BallGroup {
    radius?: number
    idleSpin?: number
    hoverSpin?: number
}
const BALL_DEFAULTS: Required<BallGroup> = { radius: 87, idleSpin: 100, hoverSpin: 100 }

interface DebrisGroup {
    reach?: number
    gravity?: number
    regrow?: number
}
const DEBRIS_DEFAULTS: Required<DebrisGroup> = { reach: 100, gravity: 100, regrow: 100 }

interface Props {
    style?: React.CSSProperties
    width?: number
    height?: number
    background?: string
    baseColor?: string
    density?: number
    glyphSize?: number
    speed?: number
    hover?: number
    ball?: BallGroup
    debris?: DebrisGroup
}

export default function BallStudy(props: Props) {
    const {
        style,
        background = "#000000",
        baseColor = "#4AECFF",
        density = 3000,
        glyphSize = 53,
        speed = 50,
        hover = 100,
        ball,
        debris,
        width,
        height,
    } = props

    // A group the designer never opened arrives undefined; spread-merging over a
    // typed literal beats a hand-written ?? chain, where one missed key silently
    // pins a control forever.
    const ball_ = { ...BALL_DEFAULTS, ...(ball || {}) }
    const debris_ = { ...DEBRIS_DEFAULTS, ...(debris || {}) }

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sizeRef = useRef({ w: 0, h: 0 })
    sizeRef.current = { w: num(width, 0), h: num(height, 0) }

    const ptrRef = useRef({ on: 0, hit: null as { x: number; y: number } | null })

    // Every live input is read from a ref inside the loop. Putting any of them in
    // the effect deps would restart the loop on every colour tweak.
    const vRef = useRef<Record<string, number | string>>({})
    vRef.current = {
        base: baseColor,
        density: Math.round(clampN(num(density, 1900), 100, 6000)),
        glyphSize: clampN(num(glyphSize, 100), 20, 300) / 100,
        speed: clampN(num(speed, 50), 0, 100) / 50,
        hover: clampN(num(hover, 100), 0, 200) / 100,
        radius: clampN(num(ball_.radius, 100), 30, 200) / 100,
        idleSpin: clampN(num(ball_.idleSpin, 100), 0, 400) / 100,
        hoverSpin: clampN(num(ball_.hoverSpin, 100), 0, 400) / 100,
        reach: clampN(num(debris_.reach, 100), 20, 400) / 100,
        gravity: clampN(num(debris_.gravity, 100), 0, 400) / 100,
        regrow: clampN(num(debris_.regrow, 100), 10, 400) / 100,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) {
            console.error("BallStudy: 2D context unavailable")
            return
        }

        let count = 0
        let px = new Float32Array(0)
        let py = new Float32Array(0)
        let pz = new Float32Array(0)
        let pc: string[] = []
        let pback = new Float32Array(0) // clock time at which the glyph regrows
        let proj = new Float32Array(0) // x, y, scale, depth
        let order: number[] = []
        let builtFor = -1
        const R = rng(77712345)

        const build = (n: number) => {
            count = n
            px = new Float32Array(n)
            py = new Float32Array(n)
            pz = new Float32Array(n)
            pback = new Float32Array(n)
            proj = new Float32Array(n * 4)
            pc = new Array(n)
            order = new Array(n)
            for (let i = 0; i < n; i++) {
                // uniform on the sphere; a lattice would show its own spiral arms
                const y = 1 - 2 * R()
                const rad = Math.sqrt(Math.max(0, 1 - y * y))
                const th = R() * Math.PI * 2
                px[i] = Math.cos(th) * rad
                py[i] = y
                pz[i] = Math.sin(th) * rad
                pc[i] = CHARS.charAt(Math.floor(R() * CHARS.length))
                pback[i] = -1
            }
            builtFor = n
        }

        type Part = {
            x: number
            y: number
            vx: number
            vy: number
            rot: number
            vr: number
            size: number
            c: string
            t: number
            life: number
        }
        const parts: Part[] = []

        let raf = 0
        let last = performance.now()
        let clock = 0
        let spin = 0
        let vel = 0.17

        const render = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const v = vRef.current
            const sp = v.speed as number
            clock += dt * sp

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            const bw = Math.max(1, Math.round(cw * dpr))
            const bh = Math.max(1, Math.round(ch * dpr))
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
            }
            // setTransform is ABSOLUTE, so re-applying it per frame cannot compound the
            // way the source's per-resize ctx.scale(dpr, dpr) did.
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, cw, ch)

            const N = v.density as number
            if (N !== builtFor) build(N)

            const u = Math.min(cw, ch) // the source's card measure
            const onS = ptrRef.current.on * (v.hover as number)
            const target = 0.17 * (v.idleSpin as number) + onS * (0.62 * (v.hoverSpin as number) - 0.17 * (v.idleSpin as number))
            vel += (target - vel) * Math.min(1, (dt * sp) / 0.3)
            spin += vel * dt * sp

            const cx = cw / 2
            const cy = ch / 2 + u * CYOFF
            const Rad = u * RR * (v.radius as number)
            const fs = u * FS * (v.glyphSize as number)
            const cs = Math.cos(spin)
            const sn = Math.sin(spin)
            const ct = Math.cos(TILT)
            const st = Math.sin(TILT)

            let live = 0
            for (let i = 0; i < count; i++) {
                const x1 = px[i] * cs - pz[i] * sn
                const z1 = px[i] * sn + pz[i] * cs
                const y2 = py[i] * ct - z1 * st
                const z2 = py[i] * st + z1 * ct
                const d = (z2 + 1) * 0.5 // 0 = far side, 1 = nearest point
                proj[i * 4] = cx + x1 * Rad
                proj[i * 4 + 1] = cy + y2 * Rad
                proj[i * 4 + 2] = 0.1 + 0.9 * Math.pow(d, 1.8)
                proj[i * 4 + 3] = d
                if (pback[i] > clock) continue
                order[live++] = i
            }
            const vis = order.slice(0, live)
            vis.sort((a, b) => proj[a * 4 + 3] - proj[b * 4 + 3])

            const ink = parseRGB(v.base as string, [20, 19, 16])
            const rgb = ink[0] + "," + ink[1] + "," + ink[2]
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"

            let lastFont = ""
            for (let k = 0; k < vis.length; k++) {
                const j = vis[k]
                const dz = proj[j * 4 + 3]
                const sc = proj[j * 4 + 2]
                let a = 0.55 + 0.45 * Math.pow(dz, 1.1)
                if (pback[j] >= 0) {
                    // the pit heals: the glyph fades back in over the regrow window
                    const grow = Math.min(1, (clock - pback[j]) / (0.42 / (v.regrow as number)))
                    if (grow < 1) a *= grow
                }
                // depth-sorted, so quantising the size keeps ctx.font churn low
                const f = "bold " + Math.round(fs * sc * 4) / 4 + "px " + FACE
                if (f !== lastFont) {
                    ctx.font = f
                    lastFont = f
                }
                ctx.fillStyle = "rgba(" + rgb + "," + a.toFixed(3) + ")"
                ctx.fillText(pc[j], proj[j * 4], proj[j * 4 + 1])
            }

            // --- knocked-loose letters ---
            const hit = ptrRef.current.hit
            if (hit) {
                ptrRef.current.hit = null
                const hitR = u * 0.055 * (v.reach as number)
                const hit2 = hitR * hitR
                for (let i = 0; i < count; i++) {
                    if (pback[i] > clock) continue
                    if (proj[i * 4 + 3] < 0.72) continue // only the letters actually facing you
                    const dx = proj[i * 4] - hit.x
                    const dy = proj[i * 4 + 1] - hit.y
                    if (dx * dx + dy * dy > hit2) continue
                    const d = Math.sqrt(dx * dx + dy * dy) || 1
                    pback[i] = clock + 1.5 + R() * 0.26
                    parts.push({
                        x: proj[i * 4],
                        y: proj[i * 4 + 1],
                        vx: (dx / d) * u * (0.1 + R() * 0.16) + (R() - 0.5) * u * 0.05,
                        vy: (dy / d) * u * 0.08 - u * (0.04 + R() * 0.1),
                        rot: 0,
                        vr: (R() - 0.5) * 5.5,
                        size: fs * (0.85 + 0.15 * proj[i * 4 + 2]),
                        c: pc[i],
                        t: clock,
                        life: 2.1,
                    })
                }
                if (parts.length > MAX_PARTS) parts.splice(0, parts.length - MAX_PARTS)
            }

            const g = u * 0.8 * (v.gravity as number)
            for (let m = parts.length - 1; m >= 0; m--) {
                const q = parts[m]
                const age = clock - q.t
                if (age > q.life || q.y > ch + 40) {
                    parts.splice(m, 1)
                    continue
                }
                q.vy += g * dt * sp
                q.x += q.vx * dt * sp
                q.y += q.vy * dt * sp
                q.rot += q.vr * dt * sp
                const af = Math.max(0, 1 - age / q.life)
                ctx.save()
                ctx.translate(q.x, q.y)
                ctx.rotate(q.rot)
                ctx.font = "bold " + q.size.toFixed(2) + "px " + FACE
                ctx.fillStyle = "rgba(" + rgb + "," + (0.95 * Math.pow(af, 0.5)).toFixed(3) + ")"
                ctx.fillText(q.c, 0, 0)
                ctx.restore()
            }

            raf = requestAnimationFrame(render)
        }

        // The rect RATIO is zoom-invariant — offset and size scale together — so
        // this is safe on a zoomed Framer canvas where absolute px are not.
        const localPoint = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return null
            const cw = sizeRef.current.w || canvas.clientWidth || 1200
            const ch = sizeRef.current.h || canvas.clientHeight || 800
            return { x: ((e.clientX - r.left) / r.width) * cw, y: ((e.clientY - r.top) / r.height) * ch }
        }
        const onEnter = () => {
            ptrRef.current.on = 1
        }
        const onLeave = () => {
            ptrRef.current.on = 0
        }
        const onDown = (e: PointerEvent) => {
            if ((vRef.current.hover as number) <= 0) return
            ptrRef.current.hit = localPoint(e)
        }

        canvas.addEventListener("pointerenter", onEnter)
        canvas.addEventListener("pointermove", onEnter)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointerdown", onDown)
        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            canvas.removeEventListener("pointerenter", onEnter)
            canvas.removeEventListener("pointermove", onEnter)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointerdown", onDown)
        }
    }, [])

    return (
        <div
            style={{
                position: "relative",
                overflow: "hidden",
                background,
                minWidth: 1200,
                minHeight: 800,
                width: typeof width === "number" && width > 0 ? width : "100%",
                height: typeof height === "number" && height > 0 ? height : "100%",
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
