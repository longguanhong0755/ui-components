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
    cycleMs: 3100,
    centerX: 50,
    centerY: 50,
    sphereRadius: 20,
    shellThickness: 20,
    lumpiness: 0,
    rimBrightness: 55,
    faceBrightness: 22,
    backBrightness: 14,
    dotSize: 3,
    brightDotShare: 3,
    brightDotSize: 4,
    clusterCount: 36,
    clusterSize: 14,
    flicker: 60,
    flickerRate: 12,
    autoRotate: 6,
    pointDrift: 20,
    dropCount: 6,
    splashCount: 5,
    dropRate: 12,
    approachShare: 18,
    splashReach: 20,
    nearDepth: 30,
    farDepth: 150,
    spreadMin: 30,
    spreadMax: 260,
    streakWidth: 3,
    farBrightness: 70,
    trailMs: 100,
    maxTrail: 50,
    gapStart: 35,
    gapEnd: 85,
    fadeIn: 6,
    fadeOut: 12,
    softEdge: 2,
    seed: 7,
    grain: 0,
    vignette: 0,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"dotSize":"advanced"}}
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

const TAU = Math.PI * 2
const GREYS = [42, 76, 113, 165, 203, 249].map((v) => v / 249)

function mulberry32(a: number) {
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function parseColor(c: any) {
    const fallback = { r: 249, g: 249, b: 249 }
    if (typeof c !== "string") return fallback
    let s = c.trim()
    const v = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (v) s = v[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((ch) => ch + ch)
                .join("")
        const n = parseInt(h.slice(0, 6), 16)
        if (!isNaN(n)) return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
    }
    const m = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
    if (m) return { r: +m[1], g: +m[2], b: +m[3] }
    return fallback
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smooth = (x: number) => {
    const t = clamp01(x)
    return t * t * (3 - 2 * t)
}
const smoothstep = (a: number, b: number, x: number) => smooth((x - a) / (b - a))
const fract = (x: number) => x - Math.floor(x)
// cheap positional hash, used to pick a different random point and a
// different random moment every cycle (rule: no two drops land the same way)
const hash = (n: number) => {
    const x = Math.sin(n * 12.9898) * 43758.5453123
    return x - Math.floor(x)
}

function buildStreaks(n: number, seed: number, rhoMin: number, rhoMax: number) {
    const rnd = mulberry32(seed * 7919 + 13)
    const cos = new Float32Array(n)
    const sin = new Float32Array(n)
    const rho = new Float32Array(n)
    const p0 = new Float32Array(n)
    const laps = new Uint8Array(n)
    const lo = Math.min(rhoMin, rhoMax)
    const hi = Math.max(rhoMin, rhoMax)
    for (let i = 0; i < n; i++) {
        const a = rnd() * TAU
        cos[i] = Math.cos(a)
        sin[i] = Math.sin(a)
        rho[i] = lo + (hi - lo) * Math.pow(rnd(), 1.2)
        p0[i] = rnd()
        laps[i] = rnd() < 0.35 ? 2 : 1
    }
    return { n, cos, sin, rho, p0, laps }
}

function buildSphere(
    m: number,
    seed: number,
    shell: number,
    lump: number,
    brightShare: number,
    clusterCount: number,
    clusterSize: number
) {
    const rnd = mulberry32(seed * 104729 + 71)
    const xs: number[] = []
    const ys: number[] = []
    const zs: number[] = []
    const us: number[] = []
    const ku: number[] = []
    const bs: number[] = []
    const sz: number[] = []
    const ar: number[] = []
    for (let i = 0; i < m; i++) {
        const z = rnd() * 2 - 1
        const a = rnd() * TAU
        const rr = Math.sqrt(1 - z * z)
        const x = Math.cos(a) * rr
        const y = Math.sin(a) * rr
        let R =
            1 +
            (rnd() - 0.5) * shell +
            lump *
                (0.5 * Math.sin(3 * x + 2 * y + 1) +
                    0.35 * Math.sin(4 * y - 3 * z + 2) +
                    0.25 * Math.sin(5 * z + 2 * x))
        // loose dust scattered past the shell
        if (rnd() < 0.08) R += rnd() * 0.3
        xs.push(x * R)
        ys.push(y * R)
        zs.push(z * R)
        us.push(rnd())
        ku.push(rnd())
        bs.push(rnd() < brightShare ? 1 : 0)
        sz.push(0.75 + rnd() * 0.5)
        ar.push(0.5 + rnd() * 1.5)
    }
    // small rings / flower clumps of bright dots on the front face
    const ringR = clusterSize / 2 / 150
    for (let c = 0; c < clusterCount; c++) {
        let z = -1
        for (let tries = 0; tries < 20; tries++) {
            z = rnd() * 2 - 1
            if (z < -0.3) break
        }
        const a = rnd() * TAU
        const rr = Math.sqrt(Math.max(0, 1 - z * z))
        const x = Math.cos(a) * rr * 0.92
        const y = Math.sin(a) * rr * 0.92
        const count = 3 + Math.floor(rnd() * 4)
        const u = rnd()
        const k = rnd()
        const rot = rnd() * TAU
        const rad = ringR * (0.6 + rnd() * 0.8)
        for (let j = 0; j < count; j++) {
            const ang = rot + (j / count) * TAU + (rnd() - 0.5) * 0.4
            xs.push(x + Math.cos(ang) * rad)
            ys.push(y + Math.sin(ang) * rad)
            zs.push(z)
            us.push(u)
            ku.push(k)
            bs.push(1)
            sz.push(0.6 + rnd() * 0.25)
            ar.push(1)
        }
    }
    const n = xs.length
    return {
        n,
        x: Float32Array.from(xs),
        y: Float32Array.from(ys),
        z: Float32Array.from(zs),
        u: Float32Array.from(us),
        ku: Float32Array.from(ku),
        b: Uint8Array.from(bs),
        sz: Float32Array.from(sz),
        ar: Float32Array.from(ar),
        px: new Float32Array(n),
        py: new Float32Array(n),
        ps: new Float32Array(n),
        lv: new Int8Array(n),
        wv: new Float32Array(n),
        fc: new Float32Array(n),
    }
}

export interface ParticleFieldDrawnProps {
    background?: string
    speed?: number
    scale?: number
    dotSize?: number
    density?: number
    sphereDensity?: number
    streakLength?: number
    enableDrag?: boolean
    dragSensitivity?: number
    enableHover?: boolean
    hoverIntensity?: number
    color?: string
    advanced?: {
        cycleMs?: number
        centerX?: number
        centerY?: number
        sphereRadius?: number
        shellThickness?: number
        lumpiness?: number
        rimBrightness?: number
        faceBrightness?: number
        backBrightness?: number
        brightDotShare?: number
        brightDotSize?: number
        clusterCount?: number
        clusterSize?: number
        flicker?: number
        flickerRate?: number
        autoRotate?: number
        pointDrift?: number
        dropCount?: number
        splashCount?: number
        dropRate?: number
        approachShare?: number
        splashReach?: number
        nearDepth?: number
        farDepth?: number
        spreadMin?: number
        spreadMax?: number
        streakWidth?: number
        farBrightness?: number
        trailMs?: number
        maxTrail?: number
        gapStart?: number
        gapEnd?: number
        fadeIn?: number
        fadeOut?: number
        softEdge?: number
        seed?: number
        grain?: number
        vignette?: number
    }
    style?: CSSProperties
}

/**
 * Particle Field — a twinkling sphere shell of points with streaks
 * converging inward along radial rays in perspective.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function ParticleFieldDrawn(props: ParticleFieldDrawnProps) {
    props = withMovedControls(props)
    const {
        speed = 100,
        scale = 93,
        density = 200,
        sphereDensity = 6000,
        streakLength = 50,
        color = "#00FF7B",
        background = "#000000",
        enableDrag = true,
        dragSensitivity = 50,
        enableHover = true,
        hoverIntensity = 11,
        advanced = {"seed":7,"grain":0,"fadeIn":6,"gapEnd":85,"centerX":50,"centerY":50,"cycleMs":3100,"fadeOut":12,"flicker":60,"trailMs":100,"farDepth":150,"gapStart":35,"maxTrail":50,"softEdge":2,"vignette":0,"lumpiness":0,"nearDepth":30,"spreadMax":260,"spreadMin":30,"clusterSize":14,"flickerRate":12,"splashReach":20,"streakWidth":3,"clusterCount":36,"sphereRadius":20,"brightDotSize":4,"farBrightness":70,"rimBrightness":55,"backBrightness":14,"brightDotShare":3,"faceBrightness":22,"shellThickness":20},
        style,
    } = props

    const wrapRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const liveRef = useRef<any>(null)
    liveRef.current = {
        speed,
        scale,
        density,
        sphereDensity,
        streakLength,
        color,
        background,
        enableDrag,
        dragSensitivity,
        enableHover,
        hoverIntensity,
        advanced,
    }

    useEffect(() => {
        const canvas = canvasRef.current
        const wrap = wrapRef.current
        if (!canvas || !wrap) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let w = 0,
            h = 0,
            dpr = 1
        const resize = () => {
            w = wrap.offsetWidth
            h = wrap.offsetHeight
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(w * dpr))
            canvas.height = Math.max(1, Math.round(h * dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(wrap)
        resize()

        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        const isThumb = RenderTarget.current() === RenderTarget.thumbnail

        let streaks: ReturnType<typeof buildStreaks> | null = null
        let streakKey = ""
        let sphere: ReturnType<typeof buildSphere> | null = null
        let sphereKey = ""
        let grainPattern: CanvasPattern | null = null

        const getGrain = () => {
            if (grainPattern) return grainPattern
            const g = document.createElement("canvas")
            g.width = g.height = 128
            const gc = g.getContext("2d")
            if (!gc) return null
            const img = gc.createImageData(128, 128)
            const rnd = mulberry32(99)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.floor(rnd() * 255)
                img.data[i] = img.data[i + 1] = img.data[i + 2] = v
                img.data[i + 3] = Math.floor(rnd() * 255)
            }
            gc.putImageData(img, 0, 0)
            grainPattern = ctx.createPattern(g, "repeat")
            return grainPattern
        }

        // t is not wrapped: streaks loop on the cycle, the twinkle never lines up
        let t = 0
        let last = -1
        let raf = 0

        // drag-to-rotate and hover state — plain closure vars, same pattern as t/last
        let rotY = 0
        let rotX = 0
        let velY = 0
        let velX = 0
        let dragging = false
        let lastX = 0
        let lastY = 0
        let lastMoveTime = 0
        let hoverTarget = 0
        let hoverAmt = 0

        const onPointerDown = (e: PointerEvent) => {
            if (!liveRef.current.enableDrag) return
            dragging = true
            velX = 0
            velY = 0
            lastX = e.clientX
            lastY = e.clientY
            lastMoveTime = performance.now()
        }
        const onPointerMove = (e: PointerEvent) => {
            if (!dragging) return
            const now2 = performance.now()
            const dtp = Math.max(1, now2 - lastMoveTime)
            const sens = (Math.max(0, liveRef.current.dragSensitivity) / 50) * 0.006
            const dRotY = (e.clientX - lastX) * sens
            const dRotX = (e.clientY - lastY) * sens
            rotY += dRotY
            rotX = Math.max(-1.3, Math.min(1.3, rotX + dRotX))
            velY = (dRotY / dtp) * 16
            velX = (dRotX / dtp) * 16
            lastX = e.clientX
            lastY = e.clientY
            lastMoveTime = now2
        }
        const onPointerUp = () => {
            dragging = false
        }
        const onPointerEnter = () => {
            if (liveRef.current.enableHover) hoverTarget = 1
        }
        const onPointerLeave = () => {
            hoverTarget = 0
        }
        wrap.addEventListener("pointerdown", onPointerDown)
        wrap.addEventListener("pointerenter", onPointerEnter)
        wrap.addEventListener("pointerleave", onPointerLeave)
        // moves and releases bound on window so a drag that leaves the
        // component (or ends outside it) still tracks and still stops
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)
        window.addEventListener("pointercancel", onPointerUp)

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(1 / 20, Math.max(0, (now - last) / 1000))
            last = now

            const L = liveRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(L.advanced ?? {}) }
            const reduced = isThumb || !!(mq && mq.matches)
            const C = Math.max(0.1, adv.cycleMs / 1000)
            // hover smoothly "energizes" the whole loop rather than snapping it
            hoverAmt += (hoverTarget - hoverAmt) * Math.min(1, dt * 5)
            const hoverMul = 1 + (Math.max(0, Math.min(100, L.hoverIntensity)) / 100) * 0.6 * hoverAmt
            if (reduced) t = 0
            else t += dt * (Math.max(0, L.speed) / 50) * hoverMul
            // coast and settle under friction once the drag releases
            if (!dragging) {
                rotY += velY * dt
                rotX = Math.max(-1.3, Math.min(1.3, rotX + velX * dt))
                const damp = Math.pow(0.02, dt)
                velY *= damp
                velX *= damp
                if (Math.abs(velY) < 0.0001) velY = 0
                if (Math.abs(velX) < 0.0001) velX = 0
                // a slow background spin keeps the globe turning on its own
                // between drags, instead of sitting dead still until touched
                if (!reduced) rotY += adv.autoRotate * (Math.PI / 180) * dt
            }

            // rebuild data when structural values change
            const nS = Math.max(0, Math.round(L.density))
            const sk = `${nS}|${adv.seed}|${adv.spreadMin}|${adv.spreadMax}`
            if (sk !== streakKey || !streaks) {
                streaks = buildStreaks(nS, adv.seed, adv.spreadMin / 100, adv.spreadMax / 100)
                streakKey = sk
            }
            const nP = Math.max(0, Math.round(L.sphereDensity))
            const pk = `${nP}|${adv.seed}|${adv.shellThickness}|${adv.lumpiness}|${adv.brightDotShare}|${adv.clusterCount}|${adv.clusterSize}`
            if (pk !== sphereKey || !sphere) {
                sphere = buildSphere(
                    nP,
                    adv.seed,
                    adv.shellThickness / 100,
                    adv.lumpiness / 100,
                    adv.brightDotShare / 100,
                    Math.max(0, Math.round(adv.clusterCount)),
                    adv.clusterSize
                )
                sphereKey = pk
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalCompositeOperation = "source-over"
            ctx.globalAlpha = 1
            ctx.fillStyle = L.background || "#000000"
            ctx.fillRect(0, 0, w, h)
            if (w < 2 || h < 2) return

            const col = parseColor(L.color)
            const greys = GREYS.map(
                (g) => `rgb(${Math.round(col.r * g)},${Math.round(col.g * g)},${Math.round(col.b * g)})`
            )

            const cx = (w * adv.centerX) / 100
            const cy = (h * adv.centerY) / 100
            const r = ((Math.min(w, h) * adv.sphereRadius) / 100) * (Math.max(1, L.scale) / 100)
            const ks = r / 150
            // current drag/inertia orientation, applied to every sphere-surface
            // point (shell, impact points and splashes) right before projecting
            const cosY = Math.cos(rotY),
                sinY = Math.sin(rotY)
            const cosX = Math.cos(rotX),
                sinX = Math.sin(rotX)

            // ── streaks ──
            const zN = Math.max(0.05, adv.nearDepth / 100)
            const zF = Math.max(zN + 0.05, adv.farDepth / 100)
            const trail = (adv.trailMs / 1000) * (Math.max(0, L.streakLength) / 50)
            const maxTrail = (adv.maxTrail / 100) * r
            const halfDiag = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) + 20
            const fb = adv.farBrightness / 100
            const fi = Math.max(0.001, adv.fadeIn / 100)
            const fo = Math.max(0.001, adv.fadeOut / 100)
            const g0 = adv.gapStart / 100
            const g1 = Math.max(g0 + 0.01, adv.gapEnd / 100)
            const soft = adv.softEdge * ks
            ctx.lineCap = "round"
            const S = streaks
            for (let i = 0; i < S.n; i++) {
                const k = S.laps[i]
                const p = fract(S.p0[i] + (t * k) / C)
                const z = zN + (zF - zN) * p
                const hd = (r * S.rho[i]) / z
                if (hd > halfDiag) continue
                const a = smooth(p / fi) * smooth((1 - p) / fo) * smoothstep(g0, g1, hd / r)
                if (a < 0.01) continue
                const pt = Math.max(0, p - (trail * k) / C)
                const zt = zN + (zF - zN) * pt
                let td = (r * S.rho[i]) / zt
                if (td - hd > maxTrail) td = hd + maxTrail
                if (td - hd < 0.6) td = hd + 0.6
                const near = clamp01((zF - z) / (zF - zN))
                const lum = fb + (1 - fb) * near
                const cr = Math.round(col.r * lum)
                const cg = Math.round(col.g * lum)
                const cb = Math.round(col.b * lum)
                const ca = S.cos[i],
                    sa = S.sin[i]
                const hx = cx + ca * hd,
                    hy = cy + sa * hd
                const tx = cx + ca * td,
                    ty = cy + sa * td
                const lw = Math.max(0.8, adv.streakWidth * ks * Math.pow(0.6 / z, 1.25))
                const grad = ctx.createLinearGradient(tx, ty, hx, hy)
                grad.addColorStop(0, `rgba(${cr},${cg},${cb},0)`)
                grad.addColorStop(0.3, `rgba(${cr},${cg},${cb},${(a * 0.4).toFixed(3)})`)
                grad.addColorStop(0.6, `rgba(${cr},${cg},${cb},${(a * 0.9).toFixed(3)})`)
                grad.addColorStop(1, `rgba(${cr},${cg},${cb},${a.toFixed(3)})`)
                ctx.strokeStyle = grad
                ctx.beginPath()
                ctx.moveTo(tx, ty)
                ctx.lineTo(hx, hy)
                if (soft > 0 && lw > 2.5) {
                    ctx.globalAlpha = 0.22
                    ctx.lineWidth = lw + 2 * soft
                    ctx.stroke()
                }
                ctx.globalAlpha = 1
                ctx.lineWidth = lw
                ctx.stroke()
            }

            // ── sphere shell ──
            const P = sphere
            const D = 4
            const rimB = adv.rimBrightness / 100
            const faceB = adv.faceBrightness / 100
            const backB = adv.backBrightness / 100
            const fl = reduced ? 0 : clamp01(adv.flicker / 100)
            const dotBase = adv.dotSize * ks
            // continuous, per-point randomized drift — each point breathes at
            // its own frequency/phase (from its own baked random values), so
            // the shell is always moving and the motion never looks the same
            // point to point, instead of sitting static between twinkles
            const wobAmp = reduced ? 0 : clamp01(adv.pointDrift / 100) * 0.06
            for (let i = 0; i < P.n; i++) {
                const wob = wobAmp === 0 ? 1 : 1 + wobAmp * Math.sin((t * (1.1 + P.ku[i] * 2.2) + P.u[i]) * TAU)
                const px0 = P.x[i] * wob
                const py0 = P.y[i] * wob
                const pz0 = P.z[i] * wob
                const x1 = px0 * cosY + pz0 * sinY
                const z1 = -px0 * sinY + pz0 * cosY
                const y1 = py0
                const y2 = y1 * cosX - z1 * sinX
                const z = y1 * sinX + z1 * cosX
                const sc = D / (D + z)
                P.px[i] = cx + x1 * r * sc
                P.py[i] = cy + y2 * r * sc
                const f = z < 0 ? Math.min(1, -z) : 0
                P.fc[i] = f
                // dim face, bright limb: the shell reads as a ragged ring
                const limbF = 1 - f
                const limbB = 1 - Math.min(1, Math.max(0, z))
                const base =
                    z < 0
                        ? faceB + (rimB - faceB) * limbF * limbF
                        : backB + (rimB - backB) * Math.pow(limbB, 4)
                P.lv[i] = base < 0.07 ? -1 : Math.min(5, Math.floor(base * 6))
                P.ps[i] = Math.max(1, dotBase * (0.6 + 0.4 * f) * P.sz[i])
            }
            for (let lvl = 0; lvl < 6; lvl++) {
                ctx.fillStyle = greys[lvl]
                for (let i = 0; i < P.n; i++) {
                    if (P.lv[i] !== lvl) continue
                    const s = P.ps[i]
                    const ax = Math.max(1, s * P.ar[i])
                    const ay = Math.max(1, s / P.ar[i])
                    ctx.fillRect(P.px[i] - ax / 2, P.py[i] - ay / 2, ax, ay)
                }
            }
            // ── water drops: a bead approaches a fresh random spot on the
            // globe each cycle; the instant it touches the surface it bursts
            // into a small scatter of droplets that skid outward across the
            // surface and decelerate under drag, fading as they settle — a
            // splash on contact, not a bead that just slides or glows.
            const N_DROPS = Math.max(0, Math.round(adv.dropCount))
            const N_SPLASH = Math.max(1, Math.round(adv.splashCount))
            const dHz = Math.max(0, adv.dropRate) / 10
            const dropLife = Math.max(0.5, 2 / Math.max(0.1, dHz * 0.6 + 0.25))
            const approachFrac = clamp01(adv.approachShare / 100)
            const bRad = 0.5 * adv.brightDotSize * ks
            for (let d = 0; d < N_DROPS; d++) {
                const phase = t / dropLife + d * 0.3137
                const cycleIdx = Math.floor(phase)
                const localT = fract(phase)
                const seedBase = d * 101.7 + cycleIdx * 57.13 + adv.seed * 9.1
                // impact point: a fresh random spot on the front-facing globe
                const az = hash(seedBase + 1.1) * TAU
                const z0 = -0.1 - hash(seedBase + 2.2) * 0.75
                const rr0 = Math.sqrt(Math.max(0, 1 - z0 * z0))
                const p0x = Math.cos(az) * rr0
                const p0y = Math.sin(az) * rr0
                const p0z = z0
                const p0x1 = p0x * cosY + p0z * sinY
                const p0z1 = -p0x * sinY + p0z * cosY
                const p0y2 = p0y * cosX - p0z1 * sinX
                const p0z2 = p0y * sinX + p0z1 * cosX
                const sc0 = D / (D + p0z2)
                const ipx = cx + p0x1 * r * sc0
                const ipy = cy + p0y2 * r * sc0
                const f0 = p0z2 < 0 ? Math.min(1, -p0z2) : 0
                if (f0 <= 0) continue

                if (localT < approachFrac) {
                    // closing in on the surface, brightening toward impact
                    const ap = localT / approachFrac
                    const Lb = (0.72 + 0.28 * f0) * (1 - fl + fl * smooth(ap))
                    if (Lb < 0.07) continue
                    const lvl = Math.min(5, Math.floor(Lb * 6))
                    const rad = Math.max(0.6, bRad * (0.4 + 0.6 * smooth(ap)) * (0.75 + 0.25 * f0))
                    ctx.fillStyle = greys[lvl]
                    ctx.beginPath()
                    ctx.arc(ipx, ipy, rad, 0, TAU)
                    ctx.fill()
                    continue
                }

                // splash: droplets skid outward from the impact point along
                // the sphere's surface, decelerating (drag) as they go —
                // fast right after contact, slowing and fading as they settle
                const sp = (localT - approachFrac) / (1 - approachFrac)
                const decel = 1 - (1 - sp) * (1 - sp)
                const fade = sp < 0.6 ? 1 : smooth(1 - (sp - 0.6) / 0.4)
                for (let j = 0; j < N_SPLASH; j++) {
                    const sj = seedBase + j * 7.77
                    const dirAngle = hash(sj + 5.5) * TAU
                    const reach = (adv.splashReach / 100) * (0.55 + hash(sj + 6.6) * 0.9)
                    // orthonormal tangent basis at the impact point, so each
                    // droplet's outward direction stays exactly on the sphere
                    let ax0 = -p0y,
                        ay0 = p0x,
                        az0 = 0
                    const alen = Math.hypot(ax0, ay0, az0) || 1
                    ax0 /= alen
                    ay0 /= alen
                    let bx0 = p0y * az0 - p0z * ay0,
                        by0 = p0z * ax0 - p0x * az0,
                        bz0 = p0x * ay0 - p0y * ax0
                    const blen = Math.hypot(bx0, by0, bz0) || 1
                    bx0 /= blen
                    by0 /= blen
                    bz0 /= blen
                    const ca = Math.cos(dirAngle),
                        sa = Math.sin(dirAngle)
                    const tx = ax0 * ca + bx0 * sa
                    const ty = ay0 * ca + by0 * sa
                    const tz = az0 * ca + bz0 * sa
                    const theta = reach * decel
                    const ct = Math.cos(theta),
                        st = Math.sin(theta)
                    const sx = p0x * ct + tx * st
                    const sy = p0y * ct + ty * st
                    const sz = p0z * ct + tz * st
                    const sx1 = sx * cosY + sz * sinY
                    const sz1 = -sx * sinY + sz * cosY
                    const sy2 = sy * cosX - sz1 * sinX
                    const sz2 = sy * sinX + sz1 * cosX
                    const sc = D / (D + sz2)
                    const px = cx + sx1 * r * sc
                    const py = cy + sy2 * r * sc
                    const f = sz2 < 0 ? Math.min(1, -sz2) : 0
                    if (f <= 0 || fade <= 0.02) continue
                    const Lb = (0.72 + 0.28 * f) * (1 - fl + fl * fade)
                    if (Lb < 0.07) continue
                    const lvl = Math.min(5, Math.floor(Lb * 6))
                    const rad = Math.max(0.5, bRad * 0.55 * (0.75 + 0.25 * f) * fade)
                    ctx.fillStyle = greys[lvl]
                    ctx.beginPath()
                    ctx.arc(px, py, rad, 0, TAU)
                    ctx.fill()
                }
            }

            // ── overlays ──
            if (adv.vignette > 0) {
                const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) / 2)
                vg.addColorStop(0, "rgba(0,0,0,0)")
                vg.addColorStop(1, `rgba(0,0,0,${clamp01(adv.vignette / 100)})`)
                ctx.fillStyle = vg
                ctx.fillRect(0, 0, w, h)
            }
            if (adv.grain > 0) {
                const pat = getGrain()
                if (pat) {
                    const ox = Math.floor(Math.random() * 128)
                    const oy = Math.floor(Math.random() * 128)
                    ctx.save()
                    ctx.globalAlpha = clamp01(adv.grain / 100) * 0.5
                    ctx.translate(ox, oy)
                    ctx.fillStyle = pat
                    ctx.fillRect(-ox, -oy, w, h)
                    ctx.restore()
                }
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            wrap.removeEventListener("pointerdown", onPointerDown)
            wrap.removeEventListener("pointerenter", onPointerEnter)
            wrap.removeEventListener("pointerleave", onPointerLeave)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", onPointerUp)
            window.removeEventListener("pointercancel", onPointerUp)
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
                cursor: enableDrag ? "grab" : "default",
                touchAction: "none",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}
