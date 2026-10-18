"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    cycleMs: 4930,
    craterAt: 82,
    hourglassAt: 56,
    pinchAt: 48,
    easing: 59,
    baseRadius: 102,
    height: 90,
    flankCurve: 144,
    // 0, not the original's 160: the crater flare read as a bowl on top of the cone.
    flare: 0,
    lift: 24,
    waist: 51,
    pinch: 47,
    repeats: 8,
    wordGap: 1,
    elevation: 28,
    distance: 300,
    focal: 150,
    aim: 50,
    offsetY: -10,
    spin: 0,
    backDim: 17,
    opacity: 100,
    tilt: 14,
    hover: 50,
    grain: 0,
    vignette: 0,
    // Added with the flip and the pointer breath:
    blowAt: 45,
    flipMs: 2800,
    blow: 414,
    ripple: 0,
    rippleWaves: 2,
    inhale: 60,
    wake: 84,
}

type Advanced = typeof ADVANCED_DEFAULTS

const DEFAULTS = {
    text: "COMPONENT",
    color: "#7864FF",
    background: "#000000",
    speed: 10,
    scale: 100,
    rings: 10,
    depth: 100,
    reach: 4.5,
    press: true,
    turn: 10,
    lag: 0,
}

const DEFAULT_FONT = {
    fontFamily: "Inter",
    variant: "Regular",
    fontWeight: 400,
    fontSize: 24,
    lineHeight: "1.5em",
    letterSpacing: "0em",
    textAlign: "left" as const,
}

const DEFAULT_FAMILY = '"Helvetica Neue", Helvetica, Arial, sans-serif'
const LOCAL_FONT = 64
const TAU = Math.PI * 2
const REST = [0, 0, 0, 0]

/** Turn 10 turns every ring one full revolution per breath. */
const TURN_UNIT = 0.1
/** Lag 10 has the tip ring trail the base by this many breaths. */
const LAG_UNIT = 0.04
/** Share of a flip spent cascading: the tip ring leaves first, the base ring this much later. */
const STAGGER = 0.5
/** Every ring swings this far out (share of the base radius) on its way past the others, so
 *  the tip arcs round the outside instead of dropping down the axis. */
const ARC_OUT = 0.6
/** …and rises this far (share of the height) at the top of its arc: up, over, down. */
const ARC_LIFT = 0.5
/** Blow is scaled by this so it throws about as far as it did before the cascade. */
const BLOW_MEAN = 1.1
/** Per-letter spread in the throw, so the flip breaks the rings instead of scaling them. */
const BLOW_SCATTER = 0.3
/** Holding a breath slows the cycle by this share, so the inhale reads as a held moment. */
const HOLD_SLOW = 0.8
/** Pointer follow rate (1/s): fast enough to feel attached, slow enough to stay smooth. */
const POINTER_RATE = 8
/** Reach 10 is a breath this share of the frame's short side across. */
const REACH_UNIT = 0.35
/** Above this push the letters fold over each other instead of parting. */
const WAKE_MAX = 0.6
/** Letters under the pointer grow by this share. */
const HOVER_SWELL = 0.5
/** Letters fade out between these camera depths instead of popping at the near plane. */
const NEAR_CUT = 0.15
const NEAR_FADE = 0.6
/** …and between these sizes (in LOCAL_FONT multiples) as they fly past the lens. */
const SIZE_FADE = 4
const SIZE_CUT = 8
/** The resting base ring is kept inside this share of the frame's width. */
const FIT = 0.92

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
const smooth = (a: number, b: number, x: number) => {
    const t = clamp((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)
}
/** Smootherstep on 0–1: zero speed and zero acceleration at both ends. */
const smoother = (x: number) => {
    const t = clamp(x, 0, 1)
    return t * t * t * (t * (t * 6 - 15) + 10)
}

interface Glyph {
    z: number
    a: number
    b: number
    c: number
    d: number
    e: number
    f: number
    alpha: number
    ch: string
}

export interface ZephyrBellProps {
    /** The word repeated around every ring. */
    text?: string
    font?: CSSProperties
    color?: string
    background?: string
    /** 0–100: breathing tempo; 50 is one breath per Cycle. */
    speed?: number
    /** %: drawn size of the whole form, letters included. */
    scale?: number
    rings?: number
    /** 0–100: how far the surface lifts, waists and pinches on each breath. */
    depth?: number
    /** 0–10: radius of the breath the pointer blows through the letters. */
    reach?: number
    /** Hold to inhale (the cone draws into a column); tap or let go to flip it. */
    press?: boolean
    /** 0–10: how far each ring turns per breath. */
    turn?: number
    /** 0–10: how far each ring trails the one below it, twisting the cone. */
    lag?: number
    advanced?: Partial<Advanced>
    style?: CSSProperties
}

/**
 * Zephyr Bell — the word laid flat on a breathing 3D cone of rings. Every
 * ring turns, each a little behind the one below, so the cone twists and
 * pulls. Once a breath it flips: ring by ring from the tip, each swings up,
 * out round the others and down, while the base rings climb to the top,
 * then the same cone closes again.
 *
 * Built on the user's WordExhaleSet, to the "e x h a l e" kinetic-type brief.
 * Its names and tuned values are kept, except: Flare defaults to 0 (no bowl),
 * the rest profile rises linearly so the top closes to a point instead of a
 * flat cap, and letters scale with Scale instead of keeping their size.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
function __BaseImpl_ZephyrBell(props: ZephyrBellProps) {
    const { background = DEFAULTS.background, press = DEFAULTS.press, style } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props
    const pointer = useRef({
        x: 0.5,
        y: 0.5,
        over: 0,
        down: 0,
        tx: 0.5,
        ty: 0.5,
        tover: 0,
        tdown: 0,
        /** A tap waiting to start a flip: how full the breath was, 0–1; -1 for none. */
        tapReq: -1,
    })

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

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
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        const noise = document.createElement("canvas")
        noise.width = 128
        noise.height = 128
        const nctx = noise.getContext("2d")
        if (nctx) {
            const img = nctx.createImageData(128, 128)
            for (let i = 0; i < img.data.length; i += 4) {
                const g = Math.random() * 255
                img.data[i] = g
                img.data[i + 1] = g
                img.data[i + 2] = g
                img.data[i + 3] = 255
            }
            nctx.putImageData(img, 0, 0)
        }
        const grainPattern = ctx.createPattern(noise, "repeat")

        const reduce =
            typeof window.matchMedia === "function"
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null

        const release = () => {
            const pt = pointer.current
            const p = propsRef.current
            const adv = { ...ADVANCED_DEFAULTS, ...p.advanced }
            if (pt.tdown && (p.press ?? DEFAULTS.press) && adv.blow > 0 && adv.hover > 0 && !(reduce && reduce.matches)) {
                pt.tapReq = pt.down
            }
            pt.tdown = 0
        }
        window.addEventListener("pointerup", release)
        window.addEventListener("pointercancel", release)

        let phase = 0
        /** Unwrapped breath count: drives the turn and the ripple without jumps. */
        let breaths = 0
        let spinAng = 0
        /** Flip in progress, 0–1 over Flip Time; -1 when none is playing. */
        let flipT = -1
        let flipAmp = 1
        /** Flips completed. Each one swaps the rings end for end; the rings sit
         *  symmetrically in v, so the settled cone is identical either way. */
        let flipsDone = 0
        let last = -1
        let raf = 0
        const pr = [0, 0]
        const p0 = [0, 0, 0]
        const p1 = [0, 0, 0]
        const p2 = [0, 0, 0]
        // Glyphs are pooled so the frame loop allocates nothing per letter.
        const pool: Glyph[] = []
        const items: Glyph[] = []

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(1 / 20, (now - last) / 1000)
            last = now

            const p = propsRef.current
            const adv: Advanced = { ...ADVANCED_DEFAULTS, ...p.advanced }
            const pSpeed = clamp(p.speed ?? DEFAULTS.speed, 0, 100)
            const pScale = Math.max(10, p.scale ?? DEFAULTS.scale) / 100
            const pRings = clamp(Math.round(p.rings ?? DEFAULTS.rings), 2, 40)
            const pDepth = clamp(p.depth ?? DEFAULTS.depth, 0, 100)
            const pReach = clamp(p.reach ?? DEFAULTS.reach, 0, 10)
            const pPress = p.press ?? DEFAULTS.press
            const pTurn = clamp(p.turn ?? DEFAULTS.turn, 0, 10)
            const pLag = clamp(p.lag ?? DEFAULTS.lag, 0, 10)
            const pColor = p.color ?? DEFAULTS.color
            const pBg = p.background ?? DEFAULTS.background
            const pFont: CSSProperties = p.font ?? DEFAULT_FONT
            const word = String(p.text ?? DEFAULTS.text).trim() || DEFAULTS.text
            const still = !!(reduce && reduce.matches)

            // pointer easing
            const h = clamp(adv.hover, 0, 100) / 50
            const pt = pointer.current
            const kp = 1 - Math.exp(-dt * POINTER_RATE)
            pt.x += (pt.tx - pt.x) * kp
            pt.y += (pt.ty - pt.y) * kp
            pt.over += (pt.tover - pt.over) * kp
            pt.down += (pt.tdown - pt.down) * (1 - Math.exp(-dt * 4))
            const hold = pPress ? clamp(pt.down * h, 0, 1) : 0

            // clock — a held breath slows it
            const rate = (pSpeed / 50) * (1 - HOLD_SLOW * hold)
            const period = Math.max(200, adv.cycleMs) / 1000
            const prevPhase = phase
            if (!still) {
                const step = (dt * rate) / period
                phase = (phase + step) % 1
                breaths += step
                spinAng += (dt * rate * adv.spin * Math.PI) / 180
            }

            // Flip: started when the cycle passes Blow At, or by a tap, and played
            // over Flip Time in seconds — the old flip was a share of the breath,
            // so at a slow Speed it crawled for five seconds.
            const at = clamp(adv.blowAt / 100, 0, 1)
            const crossed =
                phase === prevPhase
                    ? false
                    : phase > prevPhase
                      ? prevPhase < at && at <= phase
                      : prevPhase < at || at <= phase
            if (flipT < 0) {
                if (pt.tapReq >= 0) {
                    flipT = 0
                    flipAmp = 0.6 + 0.4 * pt.tapReq
                } else if (crossed && adv.blow > 0) {
                    flipT = 0
                    flipAmp = 1
                }
            }
            pt.tapReq = -1
            if (flipT >= 0) {
                flipT += dt / Math.max(0.2, adv.flipMs / 1000)
                if (flipT >= 1) {
                    flipsDone++
                    flipT = -1
                }
            }
            const odd = flipsDone % 2 === 1
            const B = (Math.max(0, adv.blow) / 100) * flipAmp * BLOW_MEAN

            // Profile keyframes [flare, lift, waist, pinch], played in the order
            // their At values put them — the original forced crater → hourglass →
            // pinch, so out-of-order values were clamped into 2% slots and snapped.
            const kD = pDepth / 50
            const Fl = (adv.flare / 100) * kD
            const L = (adv.lift / 100) * kD
            const Wst = clamp((adv.waist / 100) * kD, 0, 0.9)
            const Pn = clamp((adv.pinch / 100) * kD, 0, 0.97)
            const ev = [
                { t: adv.craterAt / 100, k: [Fl, L, 0, 0] },
                { t: adv.hourglassAt / 100, k: [Fl * 0.3, L * 1.2, Wst, 0] },
                { t: adv.pinchAt / 100, k: [0, L * 0.6, Wst * 0.4, Pn] },
            ].sort((m, n) => m.t - n.t)
            const t1 = clamp(ev[0].t, 0.02, 0.94)
            const t2 = clamp(ev[1].t, t1 + 0.02, 0.96)
            const t3 = clamp(ev[2].t, t2 + 0.02, 0.98)
            const T = [0, t1, t2, t3, 1]
            const K = [REST, ev[0].k, ev[1].k, ev[2].k, REST]
            let s = 0
            while (s < 3 && phase >= T[s + 1]) s++
            const dS = T[s + 1] - T[s]
            const u0 = clamp((phase - T[s]) / dS, 0, 1)
            const u = u0 + (u0 * u0 * (3 - 2 * u0) - u0) * clamp(adv.easing / 100, 0, 1)
            // Hermite with time-scaled tangents (the loop wraps: rest at 0 and 1),
            // so the morph keeps one speed through a key however uneven the gaps.
            const tan = (i: number, ch: number) => {
                const a = i === 0 || i === 4 ? K[3][ch] : K[i - 1][ch]
                const b = i === 0 || i === 4 ? K[1][ch] : K[i + 1][ch]
                const ta = i === 0 ? t3 - 1 : i === 4 ? t3 : T[i - 1]
                const tb = i === 0 ? t1 : i === 4 ? 1 + t1 : T[i + 1]
                return (b - a) / (tb - ta)
            }
            const u2 = u * u
            const u3 = u2 * u
            const key = (ch: number) =>
                (2 * u3 - 3 * u2 + 1) * K[s][ch] +
                (u3 - 2 * u2 + u) * dS * tan(s, ch) +
                (3 * u2 - 2 * u3) * K[s + 1][ch] +
                (u3 - u2) * dS * tan(s + 1, ch)
            const kf = Math.max(0, key(0))
            const kl = key(1)
            const kw = clamp(key(2), 0, 0.9)
            const kpn = clamp(key(3), 0, 0.97)

            const Rb = adv.baseRadius / 100
            const Hh = adv.height / 100
            const pexp = Math.max(0.2, adv.flankCurve / 100)
            const squeeze = 1 - clamp(adv.inhale / 100, 0, 0.95) * hold
            const prof = (vIn: number, out: number[]) => {
                const v = clamp(vIn, 0, 1)
                const r0 = Rb * Math.pow(1 - v, pexp)
                // The original's dome, Hh·(1−(1−v)²), flattened the top into a cap;
                // a straight rise closes it to a point.
                const y0 = Hh * v
                const sF = smooth(0.35, 1, v)
                const bump = Math.exp(-((v - 0.5) * (v - 0.5)) / (2 * 0.12 * 0.12))
                out[0] = (r0 * (1 - kpn * smooth(0.45, 1, v)) * (1 - kw * bump) + kf * sF * sF) * squeeze
                out[1] = y0 + kl * smooth(0.3, 1, v)
            }

            // camera — fitted to the width too, so a square or portrait frame never crops the cone
            const S = Math.min(W, H)
            const deg = Math.PI / 180
            const el = (adv.elevation - (pt.y - 0.5) * adv.tilt * 0.6 * h * pt.over) * deg
            const yaw = spinAng + (pt.x - 0.5) * adv.tilt * deg * h * pt.over
            const ce = Math.cos(el)
            const se = Math.sin(el)
            const cy = Math.cos(yaw)
            const sy = Math.sin(yaw)
            const D = Math.max(0.5, adv.distance / 100)
            const fl0 = (adv.focal / 100) * S
            const restSpan = ((2 * Rb * fl0) / D) * 1.08
            const fl = fl0 * Math.min(1, (W * FIT) / Math.max(1, restSpan)) * pScale
            const aimY = Hh * (adv.aim / 100)
            const offY = (adv.offsetY / 100) * S
            const proj = (x: number, y: number, z: number, out: number[]) => {
                const cx = x * cy - z * sy
                const cz = x * sy + z * cy
                const qy = y - aimY
                const yc = qy * ce - cz * se
                const zc = D - (qy * se + cz * ce)
                const zz = Math.max(zc, 0.05)
                out[0] = W / 2 + (fl * cx) / zz
                out[1] = H / 2 + offY - (fl * yc) / zz
                out[2] = zc
            }

            // turn with lag: each ring plays the same eased turn, later the higher it sits
            const rev = TAU * pTurn * TURN_UNIT
            const lagSpan = pLag * LAG_UNIT
            const rot = (b: number) => {
                const k = Math.floor(b)
                return rev * (k + smoother(b - k))
            }

            // ripple and pointer breath
            const A = (Math.max(0, adv.ripple) / 100) * Rb
            const waveT = TAU * breaths * adv.rippleWaves
            const R = Math.max(1, (pReach / 10) * REACH_UNIT * S)
            const wakeOn = pReach > 0 && pt.over > 0.001 && h > 0
            const wakeK = Math.min(WAKE_MAX, (Math.max(0, adv.wake) / 100) * WAKE_MAX * h) * pt.over
            const swellK = HOVER_SWELL * Math.min(1, h) * pt.over
            const px = pt.x * W
            const py = pt.y * H

            // glyphs — world-sized, so they scale with the form
            const fontSizeRaw = parseFloat(String(pFont.fontSize ?? 24))
            const fontPx = isFinite(fontSizeRaw) && fontSizeRaw > 0 ? fontSizeRaw : 24
            const g = (fontPx * 2.3) / (1.5 * 900)
            const chars = Array.from(word)
            const gap = clamp(Math.round(adv.wordGap), 0, 6)
            const per = chars.length + gap
            const slots = Math.max(per, clamp(Math.round(adv.repeats), 1, 40) * per)
            const dTh = TAU / slots
            const baseAlpha = clamp(adv.opacity / 100, 0, 1)
            const backDim = clamp(adv.backDim / 100, 0, 1)

            items.length = 0
            for (let i = 0; i < pRings; i++) {
                // Half-step offsets make the ring set symmetric under v → 1 − v (the flip).
                const vi = (i + 0.5) / pRings
                const vb = odd ? 1 - vi : vi
                // The cascade: the ring at the tip leaves first, the base ring last,
                // each over its own eased flight, so no two cross mid-height together.
                const fi = flipT >= 0 ? smoother((flipT - STAGGER * (1 - vb)) / (1 - STAGGER)) : 0
                const out = Math.sin(Math.PI * fi)
                const v = vb + (1 - 2 * vb) * fi
                prof(v, pr)
                const r = pr[0]
                const y = pr[1]
                prof(v + 0.01, p1)
                prof(v - 0.01, p2)
                let dr = p1[0] - p2[0]
                let dy = p1[1] - p2[1]
                const len = Math.hypot(dr, dy) || 1
                dr /= len
                dy /= len
                // Two crossed sines climbing the surface stand in for the brief's
                // noise; the outward profile normal is (dy, -dr).
                const n = 0.6 * Math.sin(TAU * 1.5 * v - waveT) + 0.4 * Math.sin(TAU * 2.7 * v + 1.31 * waveT + 1.7)
                const rn = r + A * n * dy + Rb * ARC_OUT * out
                const yy = y - A * n * dr + Hh * ARC_LIFT * out
                const ringAng = rot(breaths - lagSpan * v)
                const grow = B * out
                for (let j = 0; j < slots; j++) {
                    const c = j % per
                    if (c >= chars.length) continue
                    const slot = Math.PI / 2 - j * dTh
                    const th = slot + ringAng
                    const ct = Math.cos(th)
                    const st = Math.sin(th)
                    const rr = rn * (1 + grow * (1 + BLOW_SCATTER * Math.sin(3 * slot + 1.3 * i)))
                    const X = rr * ct
                    const Z = rr * st
                    proj(X, yy, Z, p0)
                    if (p0[2] < NEAR_CUT) continue
                    proj(X + st * g, yy, Z - ct * g, p1)
                    proj(X + dr * ct * g, yy + dy * g, Z + dr * st * g, p2)
                    const sx = p0[0]
                    const sY = p0[1]
                    let a = (p1[0] - sx) / LOCAL_FONT
                    let b = (p1[1] - sY) / LOCAL_FONT
                    let cc = -(p2[0] - sx) / LOCAL_FONT
                    let d = -(p2[1] - sY) / LOCAL_FONT
                    // Letters part around the pointer and swell, falling off to nothing at Reach.
                    let e = sx
                    let f = sY
                    if (wakeOn) {
                        const ox = sx - px
                        const oy = sY - py
                        const q2 = (ox * ox + oy * oy) / (R * R)
                        if (q2 < 1) {
                            const dist = Math.sqrt(ox * ox + oy * oy) || 1
                            const w = (1 - q2) * (1 - q2)
                            const push = wakeK * R * w
                            e += (ox / dist) * push
                            f += (oy / dist) * push
                            const sw = 1 + swellK * w
                            a *= sw
                            b *= sw
                            cc *= sw
                            d *= sw
                        }
                    }
                    const ext = Math.abs(a) + Math.abs(b) + Math.abs(cc) + Math.abs(d)
                    if (ext > SIZE_CUT) continue
                    // Cull only once a letter is wholly off the frame, so none is clipped mid-glyph.
                    const m = ext * LOCAL_FONT
                    if (e < -m || e > W + m || f < -m || f > H + m) continue
                    const det = a * d - b * cc
                    const alpha =
                        baseAlpha *
                        (det < 0 ? 1 - backDim : 1) *
                        smooth(NEAR_CUT, NEAR_FADE, p0[2]) *
                        (1 - smooth(SIZE_FADE, SIZE_CUT, ext))
                    if (alpha <= 0.002) continue
                    const k = items.length
                    if (k === pool.length) pool.push({ z: 0, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, alpha: 0, ch: "" })
                    const it = pool[k]
                    it.z = p0[2]
                    it.a = a
                    it.b = b
                    it.c = cc
                    it.d = d
                    it.e = e
                    it.f = f
                    it.alpha = alpha
                    it.ch = chars[c]
                    items.push(it)
                }
            }
            items.sort((m, n) => n.z - m.z)

            // draw
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1
            ctx.fillStyle = pBg
            ctx.fillRect(0, 0, W, H)

            const family = pFont.fontFamily || DEFAULT_FAMILY
            const weight = pFont.fontWeight || 400
            const fstyle = pFont.fontStyle || "normal"
            ctx.font = `${fstyle} ${weight} ${LOCAL_FONT}px ${family}`
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillStyle = pColor
            for (let k = 0; k < items.length; k++) {
                const it = items[k]
                ctx.globalAlpha = it.alpha
                ctx.setTransform(it.a * dpr, it.b * dpr, it.c * dpr, it.d * dpr, it.e * dpr, it.f * dpr)
                ctx.fillText(it.ch, 0, 0)
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1
            const vig = clamp(adv.vignette / 100, 0, 1)
            if (vig > 0) {
                const grad = ctx.createRadialGradient(W / 2, H / 2, S * 0.25, W / 2, H / 2, Math.hypot(W, H) / 2)
                grad.addColorStop(0, "rgba(0,0,0,0)")
                grad.addColorStop(1, `rgba(0,0,0,${vig})`)
                ctx.fillStyle = grad
                ctx.fillRect(0, 0, W, H)
            }
            const grain = clamp(adv.grain / 100, 0, 1)
            if (grain > 0 && grainPattern) {
                ctx.save()
                ctx.translate(-Math.random() * 128, -Math.random() * 128)
                ctx.globalAlpha = grain * 0.22
                ctx.fillStyle = grainPattern
                ctx.fillRect(0, 0, W + 256, H + 256)
                ctx.restore()
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("pointerup", release)
            window.removeEventListener("pointercancel", release)
        }
    }, [])

    const onMove = (e: React.PointerEvent) => {
        const root = rootRef.current
        if (!root) return
        const rect = root.getBoundingClientRect()
        const pt = pointer.current
        pt.tx = (e.clientX - rect.left) / Math.max(1, rect.width)
        pt.ty = (e.clientY - rect.top) / Math.max(1, rect.height)
        pt.tover = 1
    }

    return (
        <div
            ref={rootRef}
            onPointerMove={onMove}
            onPointerEnter={onMove}
            onPointerLeave={() => {
                pointer.current.tover = 0
            }}
            onPointerDown={(e) => {
                onMove(e)
                pointer.current.tdown = 1
            }}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                touchAction: "pan-y",
                userSelect: "none",
                cursor: press ? "pointer" : undefined,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}

const __presetProps = {
  "text": "COMPONENT",
  "background": "#000000",
  "font": {
    "variant": "Regular",
    "fontSize": 24,
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 400,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  },
  "color": "#7864FF",
  "rings": 7,
  "depth": 42,
  "scale": 92,
  "reach": 4.5,
  "press": true,
  "speed": 10,
  "turn": 10,
  "lag": 2.7,
  "advanced": {
    "aim": 50,
    "blow": 414,
    "lift": 24,
    "spin": 0,
    "tilt": 14,
    "wake": 84,
    "flare": 0,
    "focal": 150,
    "grain": 0,
    "hover": 50,
    "pinch": 47,
    "waist": 51,
    "blowAt": 45,
    "easing": 59,
    "flipMs": 2800,
    "height": 90,
    "inhale": 60,
    "ripple": 0,
    "backDim": 17,
    "cycleMs": 4930,
    "offsetY": -10,
    "opacity": 100,
    "pinchAt": 48,
    "repeats": 8,
    "wordGap": 1,
    "craterAt": 82,
    "distance": 300,
    "vignette": 0,
    "elevation": 28,
    "baseRadius": 102,
    "flankCurve": 144,
    "hourglassAt": 56,
    "rippleWaves": 2
  }
};

export default function ZephyrBell(props: Record<string, unknown>) {
  return <__BaseImpl_ZephyrBell {...(__presetProps as Record<string, unknown>)} {...props} />;
}
