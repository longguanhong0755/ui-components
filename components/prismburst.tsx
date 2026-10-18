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
    cycleMs: 2700,
    shardTravel: 300,
    burstPower: 120,
    travelJitter: 50,
    tangential: 25,
    depthSquash: 50,
    cameraDistance: 600,
    nearClip: 30,
    spinMin: 360,
    spinMax: 1080,
    cloudYaw: 90,
    fadeStartMs: 1200,
    fadeEndMs: 2600,
    fadeJitterMs: 350,
    shardShrink: 60,
    coreStartMs: 300,
    coreGrowMs: 2400,
    coreEase: 30,
    coreSpin: 20,
    coreTilt: 18,
    lineWidth: 150,
    lineOpacity: 60,
    glow: 20,
    blurSamples: 5,
    shutterMs: 45,
    fillShare: 40,
    fillOpacity: 22,
    seed: 10,
}

// ── moved controls (builder) ──
/**
 * Controls moved in the builder: into Advanced, out of it, or into groups of
 * their own. The code reads each one where it was first written, so the props
 * are put back in that shape before anything reads them.
 */
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{"hueShift":"colorControls","saturation":"colorControls","hueBase":"colorControls","hueSpread":"colorControls","hueCycle":"colorControls","lightness":"colorControls"},"out":{}}
/** The "Color Controls" group's defaults, for when Framer passes it unopened. */
const COLOR_CONTROLS_DEFAULTS = { hueShift: 136, saturation: 70, hueBase: 360, hueSpread: -17, hueCycle: 2, lightness: 40 }
const GROUP_FALLBACKS: Record<string, any> = { advanced: ADVANCED_DEFAULTS, colorControls: COLOR_CONTROLS_DEFAULTS }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

type Geo = {
    nv: number
    nf: number
    verts: Float32Array
    faces: Int32Array
    cen: Float32Array
    off: Float32Array
    ang: Float32Array
    cz: Float32Array
}

type Rnd = {
    axis: Float32Array
    spinF: Float32Array
    sign: Float32Array
    travR: Float32Array
    tang: Float32Array
    fadeJ: Float32Array
    fillR: Float32Array
}

const GEO_CACHE = new Map<number, Geo>()
const RND_CACHE = new Map<string, Rnd>()

function buildIcosphere(detail: number): Geo {
    const t = (1 + Math.sqrt(5)) / 2
    const raw = [
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ]
    const verts: number[][] = raw.map((v) => {
        const l = Math.hypot(v[0], v[1], v[2])
        return [v[0] / l, v[1] / l, v[2] / l]
    })
    let faces: number[][] = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ]
    for (let d = 0; d < detail; d++) {
        const mid = new Map<string, number>()
        const midpoint = (a: number, b: number) => {
            const key = a < b ? a + "_" + b : b + "_" + a
            const hit = mid.get(key)
            if (hit !== undefined) return hit
            const va = verts[a]
            const vb = verts[b]
            const m = [(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2]
            const l = Math.hypot(m[0], m[1], m[2]) || 1
            verts.push([m[0] / l, m[1] / l, m[2] / l])
            const idx = verts.length - 1
            mid.set(key, idx)
            return idx
        }
        const next: number[][] = []
        for (const f of faces) {
            const a = midpoint(f[0], f[1])
            const b = midpoint(f[1], f[2])
            const c = midpoint(f[2], f[0])
            next.push([f[0], a, c], [f[1], b, a], [f[2], c, b], [a, b, c])
        }
        faces = next
    }
    const nv = verts.length
    const nf = faces.length
    const V = new Float32Array(nv * 3)
    verts.forEach((v, i) => {
        V[i * 3] = v[0]
        V[i * 3 + 1] = v[1]
        V[i * 3 + 2] = v[2]
    })
    const F = new Int32Array(nf * 3)
    const cen = new Float32Array(nf * 3)
    const off = new Float32Array(nf * 9)
    const ang = new Float32Array(nf)
    const cz = new Float32Array(nf)
    faces.forEach((f, i) => {
        F[i * 3] = f[0]
        F[i * 3 + 1] = f[1]
        F[i * 3 + 2] = f[2]
        let x = 0, y = 0, z = 0
        for (let k = 0; k < 3; k++) {
            x += verts[f[k]][0]
            y += verts[f[k]][1]
            z += verts[f[k]][2]
        }
        x /= 3
        y /= 3
        z /= 3
        cen[i * 3] = x
        cen[i * 3 + 1] = y
        cen[i * 3 + 2] = z
        for (let k = 0; k < 3; k++) {
            off[i * 9 + k * 3] = verts[f[k]][0] - x
            off[i * 9 + k * 3 + 1] = verts[f[k]][1] - y
            off[i * 9 + k * 3 + 2] = verts[f[k]][2] - z
        }
        const l = Math.hypot(x, y, z) || 1
        ang[i] = (Math.atan2(y, x) * 180) / Math.PI
        cz[i] = z / l
    })
    return { nv, nf, verts: V, faces: F, cen, off, ang, cz }
}

function getGeo(detail: number): Geo {
    let g = GEO_CACHE.get(detail)
    if (!g) {
        g = buildIcosphere(detail)
        GEO_CACHE.set(detail, g)
    }
    return g
}

function mulberry32(a: number) {
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function getRnd(detail: number, seed: number, nf: number): Rnd {
    const key = detail + ":" + seed
    let r = RND_CACHE.get(key)
    if (r) return r
    const rand = mulberry32(seed * 7919 + detail * 104729 + 1)
    const unit = (out: Float32Array, i: number) => {
        const z = rand() * 2 - 1
        const p = rand() * Math.PI * 2
        const s = Math.sqrt(1 - z * z)
        out[i * 3] = s * Math.cos(p)
        out[i * 3 + 1] = s * Math.sin(p)
        out[i * 3 + 2] = z
    }
    r = {
        axis: new Float32Array(nf * 3),
        spinF: new Float32Array(nf),
        sign: new Float32Array(nf),
        travR: new Float32Array(nf),
        tang: new Float32Array(nf * 3),
        fadeJ: new Float32Array(nf),
        fillR: new Float32Array(nf),
    }
    for (let i = 0; i < nf; i++) {
        unit(r.axis, i)
        unit(r.tang, i)
        r.spinF[i] = rand()
        r.sign[i] = rand() < 0.5 ? -1 : 1
        r.travR[i] = rand() * 2 - 1
        r.fadeJ[i] = rand() * 2 - 1
        r.fillR[i] = rand()
    }
    RND_CACHE.set(key, r)
    return r
}

// Ry(yaw) then Rx(tilt)
function orientMatrix(yaw: number, tilt: number) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw)
    const cx = Math.cos(tilt), sx = Math.sin(tilt)
    return [cy, 0, sy, sx * sy, cx, -sx * cy, -cx * sy, sx, cx * cy]
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const clamp11 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v)
const DEG = Math.PI / 180

export interface PieceWireframeGeodesicProps {
    background?: string
    colorControls?: {
        hueShift?: number
        saturation?: number
        hueBase?: number
        hueSpread?: number
        hueCycle?: number
        lightness?: number
    }
    speed?: number
    size?: number
    detail?: number
    spread?: number
    spin?: number
    motionBlur?: number
    advanced?: {
        cycleMs?: number
        shardTravel?: number
        burstPower?: number
        travelJitter?: number
        tangential?: number
        depthSquash?: number
        cameraDistance?: number
        nearClip?: number
        spinMin?: number
        spinMax?: number
        cloudYaw?: number
        fadeStartMs?: number
        fadeEndMs?: number
        fadeJitterMs?: number
        shardShrink?: number
        coreStartMs?: number
        coreGrowMs?: number
        coreEase?: number
        coreSpin?: number
        coreTilt?: number
        lineWidth?: number
        lineOpacity?: number
        glow?: number
        blurSamples?: number
        shutterMs?: number
        fillShare?: number
        fillOpacity?: number
        seed?: number
    }
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function PieceWireframeGeodesic(props: PieceWireframeGeodesicProps) {
    props = withMovedControls(props)
    const {
        speed = 50,
        size = 200,
        detail = 2,
        spread = 100,
        spin = 50,
        motionBlur = 60,
        hueShift = 0,
        hueBase = 360,
        hueSpread = -180,
        hueCycle = 4,
        saturation = 70,
        lightness = 70,
        background = "#000000",
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef<any>(null)
    // Pointer position inside the component, -1..1 on each axis, 0,0 at rest.
    // A ref so the raf loop can read it without becoming a render dependency.
    const pointerRef = useRef({ x: 0, y: 0 })

    propsRef.current = {
        speed,
        size,
        detail,
        spread,
        spin,
        motionBlur,
        hueShift,
        hueBase,
        hueSpread,
        hueCycle,
        saturation,
        lightness,
        advanced: props.advanced,
    }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let W = 0
        let H = 0
        let dpr = 1
        const resize = () => {
            W = root.offsetWidth
            H = root.offsetHeight
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        const onPointerMove = (e: PointerEvent) => {
            if (W <= 0 || H <= 0) return
            pointerRef.current.x = clamp11((e.offsetX / W) * 2 - 1)
            pointerRef.current.y = clamp11((e.offsetY / H) * 2 - 1)
        }
        const onPointerLeave = () => {
            pointerRef.current.x = 0
            pointerRef.current.y = 0
        }
        root.addEventListener("pointermove", onPointerMove)
        root.addEventListener("pointerleave", onPointerLeave)
        root.addEventListener("pointercancel", onPointerLeave)

        const reduce =
            typeof window.matchMedia === "function"
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null
        const still = RenderTarget.current() === RenderTarget.thumbnail

        let clock = 0
        let last = -1
        let raf = 0
        // Eased toward pointerRef every frame; settles back to 0,0 once the
        // pointer leaves, so the tilt below is never a hard cut.
        let tiltX = 0
        let tiltY = 0

        // scratch for core projection
        let projX = new Float32Array(0)
        let projY = new Float32Array(0)
        let projOk = new Uint8Array(0)

        const draw = () => {
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalCompositeOperation = "source-over"
            ctx.clearRect(0, 0, W, H)
            if (W <= 0 || H <= 0) return

            const det = Math.max(1, Math.min(3, Math.round(p.detail)))
            const geo = getGeo(det)
            const rnd = getRnd(det, Math.round(adv.seed), geo.nf)

            const cycle = Math.max(500, adv.cycleMs)
            const idx = Math.floor(clock / cycle)
            const t = clock - idx * cycle
            const tau0 = idx * cycle

            const pxR = Math.max(1, p.size / 2)
            const camD = Math.max(1.5, adv.cameraDistance / 100)
            const near = Math.max(0.05, adv.nearClip / 100)
            const Fp = pxR * camD
            const cx = W / 2
            const cy = H / 2
            const lw = Math.max(0.2, adv.lineWidth / 100)
            const sat = p.saturation
            const light = p.lightness
            const baseA = adv.lineOpacity / 100
            const glowA = adv.glow / 100
            const tilt = adv.coreTilt * DEG

            ctx.globalCompositeOperation = "lighter"
            ctx.lineJoin = "round"
            ctx.lineCap = "round"

            // ── Shards: faces of the sphere that burst at the start of this cycle ──
            const fadeEnd = Math.min(adv.fadeEndMs, cycle - 20)
            // The pointer tilts the whole sphere toward it, like it's turning
            // to face the cursor — up to 35° of yaw and 25° of extra tilt.
            const M = orientMatrix(adv.coreSpin * DEG * (tau0 / 1000) + tiltX * 35 * DEG, tilt + tiltY * 25 * DEG)
            const hueOff0 = p.hueShift + p.hueCycle * 360 * idx
            const spreadMul = p.spread / 100
            const spinMul = p.spin / 50
            const blur = p.motionBlur
            const N = blur > 0 ? Math.max(1, Math.round(adv.blurSamples)) : 1
            const shutter = (adv.shutterMs * blur) / 60
            const power = Math.max(0.3, adv.burstPower / 100)
            const squash = adv.depthSquash / 100
            const tangMul = adv.tangential / 100
            const fillShare = adv.fillShare / 100
            const fillIn = clamp01(t / 300)
            const fillA = adv.fillOpacity / 100
            const yawRate = adv.cloudYaw * DEG
            const sx = [0, 0, 0]
            const sy = [0, 0, 0]

            if (t < fadeEnd) {
                for (let i = 0; i < geo.nf; i++) {
                    const fs = Math.min(fadeEnd - 50, adv.fadeStartMs + rnd.fadeJ[i] * adv.fadeJitterMs)
                    const u = clamp01((t - fs) / Math.max(1, fadeEnd - fs))
                    const a = 1 - u * u
                    if (a <= 0.002) continue
                    const shrink = Math.max(0, 1 - (adv.shardShrink / 100) * u)

                    const ox = geo.cen[i * 3], oy = geo.cen[i * 3 + 1], oz = geo.cen[i * 3 + 2]
                    const wx = M[0] * ox + M[1] * oy + M[2] * oz
                    const wy = M[3] * ox + M[4] * oy + M[5] * oz
                    const wz = M[6] * ox + M[7] * oy + M[8] * oz
                    let dx = wx, dy = wy, dz = wz * squash
                    const dl = Math.hypot(dx, dy, dz) || 1
                    dx = dx / dl + rnd.tang[i * 3] * tangMul
                    dy = dy / dl + rnd.tang[i * 3 + 1] * tangMul
                    dz = dz / dl + rnd.tang[i * 3 + 2] * tangMul
                    const trav = spreadMul * (adv.shardTravel / 100) * Math.max(0.05, 1 + rnd.travR[i] * (adv.travelJitter / 100))
                    const om = (adv.spinMin + rnd.spinF[i] * (adv.spinMax - adv.spinMin)) * DEG * spinMul * rnd.sign[i]
                    const ax = rnd.axis[i * 3], ay = rnd.axis[i * 3 + 1], az = rnd.axis[i * 3 + 2]

                    // world-space vertex offsets
                    const lo: number[] = []
                    for (let k = 0; k < 3; k++) {
                        const vx = geo.off[i * 9 + k * 3], vy = geo.off[i * 9 + k * 3 + 1], vz = geo.off[i * 9 + k * 3 + 2]
                        lo.push(
                            M[0] * vx + M[1] * vy + M[2] * vz,
                            M[3] * vx + M[4] * vy + M[5] * vz,
                            M[6] * vx + M[7] * vy + M[8] * vz
                        )
                    }

                    const hue = p.hueBase - geo.ang[i] + p.hueSpread * geo.cz[i] + hueOff0
                    const col = "hsla(" + hue.toFixed(1) + "," + sat + "%," + light + "%,"
                    const filled = rnd.fillR[i] < fillShare

                    for (let s = 0; s < N; s++) {
                        const ts = N > 1 ? Math.max(0, t - (shutter * s) / (N - 1)) : t
                        const sec = ts / 1000
                        const d = trav * Math.pow(sec, power)
                        const px = wx + dx * d
                        const py = wy + dy * d
                        const pz = wz + dz * d
                        const angle = om * sec
                        const co = Math.cos(angle), si = Math.sin(angle)
                        const yaw = yawRate * sec
                        const yc = Math.cos(yaw), ys = Math.sin(yaw)
                        let ok = true
                        let nearFade = 1
                        for (let k = 0; k < 3; k++) {
                            const vx = lo[k * 3], vy = lo[k * 3 + 1], vz = lo[k * 3 + 2]
                            const kd = ax * vx + ay * vy + az * vz
                            let rx = vx * co + (ay * vz - az * vy) * si + ax * kd * (1 - co)
                            let ry = vy * co + (az * vx - ax * vz) * si + ay * kd * (1 - co)
                            let rz = vz * co + (ax * vy - ay * vx) * si + az * kd * (1 - co)
                            rx = rx * shrink + px
                            ry = ry * shrink + py
                            rz = rz * shrink + pz
                            const fx = rx * yc + rz * ys
                            const fz = -rx * ys + rz * yc
                            const depth = camD - fz
                            if (depth < near) {
                                ok = false
                                break
                            }
                            nearFade = Math.min(nearFade, clamp01((depth - near) / 0.7))
                            sx[k] = cx + (fx * Fp) / depth
                            sy[k] = cy - (ry * Fp) / depth
                        }
                        if (!ok || nearFade <= 0) continue
                        const alpha = (a * nearFade) / N
                        ctx.beginPath()
                        ctx.moveTo(sx[0], sy[0])
                        ctx.lineTo(sx[1], sy[1])
                        ctx.lineTo(sx[2], sy[2])
                        ctx.closePath()
                        if (filled && fillIn > 0) {
                            ctx.fillStyle = col + (alpha * fillA * fillIn).toFixed(4) + ")"
                            ctx.fill()
                        }
                        if (s === 0 && glowA > 0) {
                            ctx.lineWidth = lw * 3
                            ctx.strokeStyle = col + (a * nearFade * baseA * glowA * 0.5).toFixed(4) + ")"
                            ctx.stroke()
                        }
                        ctx.lineWidth = lw
                        ctx.strokeStyle = col + (alpha * baseA).toFixed(4) + ")"
                        ctx.stroke()
                    }
                }
            }

            // ── Core: the new sphere growing from a point ──
            if (t >= adv.coreStartMs) {
                const grow = Math.max(1, Math.min(adv.coreGrowMs, cycle - adv.coreStartMs))
                const u = clamp01((t - adv.coreStartMs) / grow)
                const eased = 1 - (1 - u) * (1 - u)
                const s = u + (eased - u) * (adv.coreEase / 100)
                if (s > 0) {
                    const Mc = orientMatrix(adv.coreSpin * DEG * (clock / 1000) + tiltX * 35 * DEG, tilt + tiltY * 25 * DEG)
                    const hueOff = p.hueShift + p.hueCycle * 360 * (clock / cycle)
                    const dim = clamp01((s * pxR) / 6)
                    if (projX.length < geo.nv) {
                        projX = new Float32Array(geo.nv)
                        projY = new Float32Array(geo.nv)
                        projOk = new Uint8Array(geo.nv)
                    }
                    for (let v = 0; v < geo.nv; v++) {
                        const vx = geo.verts[v * 3] * s, vy = geo.verts[v * 3 + 1] * s, vz = geo.verts[v * 3 + 2] * s
                        const x = Mc[0] * vx + Mc[1] * vy + Mc[2] * vz
                        const y = Mc[3] * vx + Mc[4] * vy + Mc[5] * vz
                        const z = Mc[6] * vx + Mc[7] * vy + Mc[8] * vz
                        const depth = camD - z
                        projOk[v] = depth > near ? 1 : 0
                        projX[v] = cx + (x * Fp) / depth
                        projY[v] = cy - (y * Fp) / depth
                    }
                    for (let i = 0; i < geo.nf; i++) {
                        const a0 = geo.faces[i * 3], a1 = geo.faces[i * 3 + 1], a2 = geo.faces[i * 3 + 2]
                        if (!projOk[a0] || !projOk[a1] || !projOk[a2]) continue
                        const hue = p.hueBase - geo.ang[i] + p.hueSpread * geo.cz[i] + hueOff
                        const col = "hsla(" + hue.toFixed(1) + "," + sat + "%," + light + "%,"
                        ctx.beginPath()
                        ctx.moveTo(projX[a0], projY[a0])
                        ctx.lineTo(projX[a1], projY[a1])
                        ctx.lineTo(projX[a2], projY[a2])
                        ctx.closePath()
                        if (glowA > 0) {
                            ctx.lineWidth = lw * 3
                            ctx.strokeStyle = col + (baseA * glowA * 0.5 * dim).toFixed(4) + ")"
                            ctx.stroke()
                        }
                        ctx.lineWidth = lw
                        ctx.strokeStyle = col + (baseA * dim).toFixed(4) + ")"
                        ctx.stroke()
                    }
                }
            }
            ctx.globalCompositeOperation = "source-over"
        }

        const frame = (now: number) => {
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const p = propsRef.current
            const frozen = still || (reduce ? reduce.matches : false)
            if (frozen) clock = 0
            else clock += dt * 1000 * Math.max(0, p.speed / 50)
            const ease = Math.min(1, dt * 6)
            tiltX += (pointerRef.current.x - tiltX) * ease
            tiltY += (pointerRef.current.y - tiltY) * ease
            draw()
            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            root.removeEventListener("pointermove", onPointerMove)
            root.removeEventListener("pointerleave", onPointerLeave)
            root.removeEventListener("pointercancel", onPointerLeave)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                position: "relative",
                width: "100%",
                height: "100%",
                ...style,
                overflow: "hidden",
                background,
                isolation: "isolate",
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
