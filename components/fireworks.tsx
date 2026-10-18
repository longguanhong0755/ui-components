"use client"

import { useEffect, useRef } from "react"

/**
 * "Fireworks" — top-down / perspective firework show as a Canvas 2D point system.
 *
 * Raw requestAnimationFrame, all live inputs read from a ref so prop changes never
 * rebuild the loop, backing store sized from clientWidth so it fills in preview too,
 * 'lighter' blend for glow, and motion trails via a low-alpha background rect
 * instead of clearing.
 *
 * World is 3D: x = right, z = depth (into scene), y = height above ground. A camera
 * pitch (Tilt) rotates the field around the x-axis — 0deg = flat aerial rings,
 * ~60deg = perspective from above — then a perspective divide makes near bursts big
 * and far bursts small. Each firework rises as one bright point to its apex, then
 * bursts into a sphere of sparks under gravity + drag; sparks fade over their life.
 *
 * Panel changes from the first version:
 * - added Colors (palette). Each burst takes one swatch; clearing the array falls
 *   back to the original random-hue show rather than going black.
 * - cut Saturation — it only ever tuned the random-hue generator the palette now
 *   replaces. Frozen at its 90% default for the fallback (RAINBOW_SAT).
 * - cut Gravity — a secondary droop dial that also cancels out of the rocket rise
 *   (vy = sqrt(2*g*apex) keeps the apex fixed at every g). Frozen at 55% (GRAVITY).
 */

function parseColor(c: any) {
    if (!c) return { r: 0, g: 0, b: 0 }
    if (c[0] === "#") {
        let h = c.slice(1)
        if (h.length === 3)
            h = h
                .split("")
                .map((x: string) => x + x)
                .join("")
        const n = parseInt(h.slice(0, 6), 16)
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
    }
    const m = c.match(/[\d.]+/g)
    if (m) return { r: +m[0], g: +m[1], b: +m[2] }
    return { r: 0, g: 0, b: 0 }
}

// h,s,l in 0..1 -> {r,g,b} 0..255
function hslToRgb(h: number, s: number, l: number) {
    if (s === 0) {
        const v = Math.round(l * 255)
        return { r: v, g: v, b: v }
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const hue = (t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
    }
    return {
        r: Math.round(hue(h + 1 / 3) * 255),
        g: Math.round(hue(h) * 255),
        b: Math.round(hue(h - 1 / 3) * 255),
    }
}

// World extents / camera. Ground x,z live in ~[-FIELD, FIELD]; bursts pop between
// APEX_LO..APEX_HI in height. CAM_DIST keeps the perspective divide well clear of 0.
const FIELD = 1.5
const APEX_LO = 0.7
const APEX_HI = 1.6
const CAM_DIST = 3.4
const G0 = 2.2 // base gravity accel (world units / s^2)
const CAP = 9000 // spark pool capacity (ring buffer)

/** Palette cap. */
const MAX_COLORS = 8
const DEFAULT_COLORS = [
    "#FFD166",
    "#FF4D6D",
    "#4CC9F0",
    "#B15CFF",
    "#FF0000",
    "#007FFF",
    "#C1FF00",
]

// Frozen defaults of the two cut controls. Render path is unchanged: these are
// exactly the values Gravity=55 / Saturation=90 fed in.
const GRAVITY = 0.55 * G0
const RAINBOW_SAT = 0.9 * 0.9 + 0.1

interface Props {
    width?: number
    height?: number
    /** palette; each burst takes one swatch uniformly. Empty = random hues. */
    colors?: string[]
    background?: string
    /** 1..100 -> ~0.2..4 bursts per second of scene time */
    rate?: number
    sparks?: number
    /** % — burst spread AND point size; one "bigger firework" dial */
    size?: number
    /** 0..100 — smear length of the fade pass */
    trail?: number
    /** % time scale. Scales the spawn accumulator too, so the live spark
     *  population stays steady instead of piling up in slow motion. */
    speed?: number
    /** ° camera pitch. 0 = flat aerial rings, ~60 = perspective from above. */
    tilt?: number
    style?: React.CSSProperties
}

export default function Fireworks(props: Props) {
    const {
        width = 1200,
        height = 800,
        colors = DEFAULT_COLORS,
        background = "#05060a",
        rate = 100,
        sparks = 290,
        size = 94,
        trail = 77,
        speed = 73,
        tilt = 45,
        style,
    } = props

    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const live = useRef<any>({}).current
    Object.assign(live, {
        width,
        height,
        colors,
        background,
        rate,
        sparks,
        size,
        trail,
        speed,
        tilt,
    })

    useEffect(() => {
        const canvas = canvasRef.current as HTMLCanvasElement
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        let raf = 0

        // Spark pool as parallel typed arrays, written round-robin. Capacity is large
        // enough that the write cursor only ever laps already-dead slots.
        const P = {
            x: new Float32Array(CAP),
            y: new Float32Array(CAP),
            z: new Float32Array(CAP),
            vx: new Float32Array(CAP),
            vy: new Float32Array(CAP),
            vz: new Float32Array(CAP),
            life: new Float32Array(CAP),
            max: new Float32Array(CAP),
            r: new Float32Array(CAP),
            g: new Float32Array(CAP),
            b: new Float32Array(CAP),
        }
        let cursor = 0

        // Rockets: few concurrent, plain objects are fine.
        let rockets: any[] = []
        let acc = 0 // burst-timer accumulator (seconds)
        let last = 0

        // One swatch per burst. A cleared palette keeps the original random-hue
        // show — an empty array must never mean an invisible component.
        const pickColor = () => {
            const list = live.colors
            if (Array.isArray(list) && list.length > 0) {
                const i = Math.min(
                    list.length - 1,
                    (Math.random() * list.length) | 0
                )
                return parseColor(list[i])
            }
            return hslToRgb(Math.random(), RAINBOW_SAT, 0.6)
        }

        const spawnRocket = () => {
            const apex = APEX_LO + Math.random() * (APEX_HI - APEX_LO)
            const col = pickColor()
            rockets.push({
                x: (Math.random() * 2 - 1) * FIELD,
                z: (Math.random() * 2 - 1) * FIELD,
                y: 0,
                vy: Math.sqrt(2 * GRAVITY * apex), // decelerates to ~0 at the apex, then bursts
                r: col.r,
                g: col.g,
                b: col.b,
            })
        }

        const burst = (rk: any) => {
            const n = Math.max(20, live.sparks | 0)
            const spread = 0.9 * (live.size / 100)
            for (let i = 0; i < n; i++) {
                // random direction on the unit sphere
                const u = Math.random() * 2 - 1
                const th = Math.random() * Math.PI * 2
                const rr = Math.sqrt(1 - u * u)
                const spd = spread * (0.45 + Math.random() * 0.55)
                const c = cursor
                cursor = (cursor + 1) % CAP
                P.x[c] = rk.x
                P.y[c] = rk.y
                P.z[c] = rk.z
                P.vx[c] = rr * Math.cos(th) * spd
                P.vy[c] = u * spd
                P.vz[c] = rr * Math.sin(th) * spd
                const life = 1.1 + Math.random() * 0.9
                P.life[c] = life
                P.max[c] = life
                P.r[c] = rk.r
                P.g[c] = rk.g
                P.b[c] = rk.b
            }
        }

        const sizeCanvas = () => {
            const W = Math.max(
                1,
                Math.round(canvas.clientWidth || live.width || 1)
            )
            const H = Math.max(
                1,
                Math.round(canvas.clientHeight || live.height || 1)
            )
            const bw = Math.floor(W * dpr)
            const bh = Math.floor(H * dpr)
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw
                canvas.height = bh
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
                ctx.fillStyle = live.background
                ctx.fillRect(0, 0, W, H) // fresh ground on resize (no trail smear from old size)
            }
            return { W, H }
        }

        const render = (now: number) => {
            const { W, H } = sizeCanvas()
            if (!last) last = now
            let dt = (now - last) / 1000
            last = now
            if (dt > 0.05) dt = 0.05 // clamp big gaps (tab switch) so nothing teleports
            dt *= Math.max(0, live.speed) / 100
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

            // trail fade: draw a low-alpha background over the previous frame
            const bg = parseColor(live.background)
            const fade = 0.5 - (live.trail / 100) * 0.47 // higher trail -> lower alpha -> longer smear
            ctx.globalCompositeOperation = "source-over"
            ctx.globalAlpha = 1
            ctx.fillStyle = `rgba(${bg.r},${bg.g},${bg.b},${fade})`
            ctx.fillRect(0, 0, W, H)

            // camera pitch: forward f=(0,-sinA,cosA), up u=(0,cosA,sinA), right=(1,0,0)
            const a = (live.tilt * Math.PI) / 180
            const cosA = Math.cos(a)
            const sinA = Math.sin(a)
            const focal = Math.min(W, H) * 0.9
            const cx = W / 2
            const cy = H / 2

            const project = (x: number, y: number, z: number) => {
                const depth = -y * sinA + z * cosA + CAM_DIST // distance into screen from camera
                if (depth <= 0.05) return null
                const vUp = y * cosA + z * sinA
                const persp = focal / depth
                return {
                    sx: cx + x * persp,
                    sy: cy - vUp * persp,
                    dscale: CAM_DIST / depth, // 1 at reference depth, >1 near, <1 far
                }
            }

            // spawn timer — Rate 1..100 maps to ~0.2..4 bursts/sec
            acc += dt
            const interval = 1 / (0.2 + (live.rate / 100) * 3.8)
            let guard = 0
            while (acc >= interval && guard < 8) {
                acc -= interval
                if (rockets.length < 40) spawnRocket()
                guard++
            }

            ctx.globalCompositeOperation = "lighter"

            // rockets: rise, leave a streak (via trail fade), burst at apex
            const sizeF = live.size / 100
            for (let i = rockets.length - 1; i >= 0; i--) {
                const rk = rockets[i]
                rk.vy -= GRAVITY * dt
                rk.y += rk.vy * dt
                if (rk.vy <= 0 || rk.y <= 0) {
                    burst(rk)
                    rockets.splice(i, 1)
                    continue
                }
                const p = project(rk.x, rk.y, rk.z)
                if (p) {
                    const s = Math.max(
                        1,
                        Math.min(6, Math.round(2.4 * sizeF * p.dscale))
                    )
                    ctx.globalAlpha = 1
                    ctx.fillStyle = `rgb(${rk.r | 0},${rk.g | 0},${rk.b | 0})`
                    ctx.fillRect((p.sx - s / 2) | 0, (p.sy - s / 2) | 0, s, s)
                }
            }

            // sparks
            const drag = Math.pow(0.5, dt) // ~half speed lost per second
            for (let c = 0; c < CAP; c++) {
                let lf = P.life[c]
                if (lf <= 0) continue
                lf -= dt
                if (lf <= 0) {
                    P.life[c] = 0
                    continue
                }
                P.life[c] = lf
                P.vy[c] -= GRAVITY * dt
                P.vx[c] *= drag
                P.vy[c] *= drag
                P.vz[c] *= drag
                const x = (P.x[c] += P.vx[c] * dt)
                const y = (P.y[c] += P.vy[c] * dt)
                const z = (P.z[c] += P.vz[c] * dt)
                const p = project(x, y, z)
                if (!p) continue
                const bright = lf / P.max[c]
                ctx.globalAlpha = bright * bright // ease out — fast falloff reads as a spark dying
                const s = Math.max(
                    1,
                    Math.min(5, Math.round((0.8 + sizeF) * p.dscale))
                )
                ctx.fillStyle = `rgb(${P.r[c] | 0},${P.g[c] | 0},${P.b[c] | 0})`
                ctx.fillRect((p.sx - s / 2) | 0, (p.sy - s / 2) | 0, s, s)
            }

            ctx.globalAlpha = 1
            raf = requestAnimationFrame(render)
        }

        raf = requestAnimationFrame(render)
        return () => cancelAnimationFrame(raf)
    }, [])

    return (
        <div
            style={{
                minWidth: 1200,
                minHeight: 800,
                position: "relative",
                overflow: "hidden",
                background,
                width: typeof width === "number" ? width : "100%",
                height: typeof height === "number" ? height : "100%",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ display: "block", width: "100%", height: "100%" }}
            />
        </div>
    )
}
