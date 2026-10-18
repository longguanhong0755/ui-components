"use client"

/**
 * CinnabarTunnel — a tunnel of comet-shaped dashes streaming out of a red
 * ground. Under the pointer a soft lens swirls, swells and thickens the rings.
 *
 * Built after the Festival MV 2019 poster (Dijon, Atelier Tout va bien). The
 * ring geometry was measured off the poster itself (736 × 1029 scan), and the
 * Advanced defaults are those measurements:
 *   - rings sit on a geometric series, r(n) = 44.75 px · 1.111ⁿ  → Hole 6, Ring Step 11
 *   - every ring carries exactly 16 dashes, no jitter of any kind
 *   - each ring is turned a quarter slot (5.625°) from the one inside it → Spiral
 *   - a dash is a square head that tapers linearly over its whole slot to a
 *     hairline tip (~4 %), running almost into the next head → Taper Start 0, Dash Fill 98
 *   - head width grows with log radius: 2.2 px at the hole, 7.6 px at r = 322
 *     → Line Weight 12, Weight Curve 31
 *   - ground #ED343A, ink #FFC173
 * The spin turns the tunnel rigidly and head-first, so the tapered tails
 * trail behind their heads and every frame is the poster, turned and zoomed.
 */

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

/** Tuning constants behind the look. Out of the box these are the poster. */
const DEFAULT_ADVANCED = {
    // what it is
    seed: 7,
    dashJitter: 0,
    dashFill: 98,
    lengthJitter: 0,
    posJitter: 0,
    spiral: 5.625,
    rotJitter: 0,
    // how big
    centerX: 50,
    centerY: 50,
    hole: 6,
    ringStep: 11,
    lineWeight: 12,
    weightCurve: 31,
    taper: 4,
    taperStart: 0,
    hairline: 0,
    slant: 0,
    // how it looks
    grain: 0,
    vignette: 0,
    // how it moves
    periodMs: 2200,
    fadeIn: 60,
    spinDeg: 24,
    spinFalloff: 0,
    hover: 50,
    lensSwirl: 40,
    lensBulge: 30,
    lensSwell: 90,
    lensMs: 60,
    pull: 4,
    pullMs: 600,
    hoverBoost: 50,
    pressBoost: 100,
}

type Advanced = typeof DEFAULT_ADVANCED

const DEFAULTS = {
    background: "#020202",
    dashColor: "#BCA5FF",
    dashes: 16,
    scale: 100,
    reach: 5,
    strength: 5,
    speed: 50,
    twist: 50,
}

export interface CinnabarTunnelProps {
    background?: string
    /** Colour of the dashes. */
    dashColor?: string
    dashes?: number
    scale?: number
    /** Radius of the hover lens, 0–10. */
    reach?: number
    /** How hard the hover lens swirls, swells and thickens the rings, 0–10. */
    strength?: number
    /** Outward streaming rate, 0–100. Hand-rolled rAF: no Transition row. */
    speed?: number
    /** Spin strength, 0–100. */
    twist?: number
    advanced?: Partial<Advanced>
    style?: React.CSSProperties
}

interface Live {
    speed: number
    scale: number
    twist: number
    dashes: number
    dashColor: string
    background: string
    reach: number
    strength: number
    advanced?: Partial<Advanced>
}

interface State {
    /** Stream phase, in ring steps. */
    p: number
    over: number
    overT: number
    down: number
    downT: number
    /** Pointer as a 0–1 share of the frame. */
    u: number
    v: number
    /** Lens centre, eased toward the pointer, as a share of the frame. */
    lu: number
    lv: number
    offX: number
    offY: number
}

/** The hover lens in canvas pixels, amplitudes already scaled by hover. */
interface Lens {
    x: number
    y: number
    invR2: number
    swirl: number
    bulge: number
    swell: number
}

const TAU = Math.PI * 2

function clamp(v: number, a: number, b: number) {
    return v < a ? a : v > b ? b : v
}

function hash3(a: number, b: number, c: number) {
    let h =
        (Math.imul(a | 0, 0x9e3779b1) +
            Math.imul(b | 0, 0x85ebca77) +
            Math.imul(c | 0, 0xc2b2ae3d)) |
        0
    h ^= h >>> 15
    h = Math.imul(h, 0x2c1b3c6d)
    h ^= h >>> 12
    h = Math.imul(h, 0x297a2d39)
    h ^= h >>> 15
    return (h >>> 0) / 4294967296
}

function drawField(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    st: State,
    live: Live,
    adv: Advanced,
    lens: Lens | null
) {
    ctx.fillStyle = live.background
    ctx.fillRect(0, 0, w, h)

    const base = Math.min(w, h) * (Math.max(10, live.scale) / 100)
    const cx = (w * adv.centerX) / 100 + st.offX
    const cy = (h * adv.centerY) / 100 + st.offY
    const r0 = Math.max(2, (base * adv.hole) / 100)
    const ratio = 1 + Math.max(1, adv.ringStep) / 100
    const lnR = Math.log(ratio)
    const wRef = (base * adv.lineWeight) / 1000
    const curve = adv.weightCurve / 100
    const refR = Math.max(1, 0.68 * base)
    const far =
        Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) + wRef * 4
    const uMax = Math.log(Math.max(far, r0 * 1.01) / r0) / lnR
    const f = adv.spinFalloff / 100
    const twistRad = (live.twist / 50) * adv.spinDeg * (Math.PI / 180)
    const G = (u: number) =>
        f > 0.001 ? (1 - Math.pow(ratio, -f * u)) / (f * lnR) : u
    const fade = Math.max(0.001, adv.fadeIn / 100)
    const tip = clamp(adv.taper / 100, 0, 1)
    const ts = clamp(adv.taperStart / 100, 0, 0.95)
    const slant = adv.slant / 100
    const seed = adv.seed | 0
    const fill = adv.dashFill / 100
    const lj = adv.lengthJitter / 100
    const pj = clamp(adv.posJitter / 100, 0, 1)
    const spiralRad = (adv.spiral * Math.PI) / 180
    const rj = adv.rotJitter / 100
    const hair = Math.max(0, adv.hairline) / 100
    const p = st.p

    // Square head at s = 0, linear taper to the tip at s = 1 (the poster).
    const prof = (s: number) =>
        s <= ts ? 1 : 1 - (1 - tip) * ((s - ts) / (1 - ts))

    // Lens weight at a point: a Gaussian bump centred on the pointer.
    const lensK = (x: number, y: number) => {
        if (!lens) return 0
        const dx = x - lens.x
        const dy = y - lens.y
        return Math.exp(-(dx * dx + dy * dy) * lens.invR2)
    }
    // Swirl (counter-clockwise, with the spin) and bulge every vertex near
    // the pointer. Warping vertices rather than the canvas keeps the dashes
    // crisp; the bulge stays monotonic (no fold-over) for any bulge < 2.2.
    let wx = 0
    let wy = 0
    const warp = (x: number, y: number) => {
        wx = x
        wy = y
        if (!lens) return
        const dx = x - lens.x
        const dy = y - lens.y
        const k = Math.exp(-(dx * dx + dy * dy) * lens.invR2)
        if (k < 0.002) return
        const sc = 1 + lens.bulge * k
        const th = -lens.swirl * k
        const c = Math.cos(th)
        const s = Math.sin(th)
        wx = lens.x + (dx * c - dy * s) * sc
        wy = lens.y + (dx * s + dy * c) * sc
    }

    const nMin = Math.ceil(-p)
    const nMax = Math.floor(uMax - p)
    ctx.fillStyle = live.dashColor
    ctx.strokeStyle = live.dashColor

    for (let n = nMin; n <= nMax; n++) {
        const u = n + p
        if (u < 0) continue
        const r = r0 * Math.pow(ratio, u)
        // The poster's weight grows with log radius (linearly per ring), not
        // as a power of it: 2.2 px at the hole to 7.6 px at r = 322 fits
        // w = wRef·(1 + 0.31·ln(r/refR)) to within a tenth of a pixel.
        // The original's power law (curve 0.7) made the centre a solid knot.
        const wFull = Math.max(0.6, wRef * (1 + curve * Math.log(r / refR)))
        const a = Math.min(1, u / fade)
        const alpha = a * a * (3 - 2 * a)
        if (alpha <= 0.002) continue
        ctx.globalAlpha = alpha

        if (hair > 0) {
            ctx.lineWidth = Math.max(0.4, wFull * hair)
            ctx.beginPath()
            if (lens) {
                // The lens bends the hairline too, so trace it as a polygon.
                const segs = clamp(Math.ceil((TAU * r) / 6), 24, 720)
                for (let k = 0; k <= segs; k++) {
                    const ang = (k / segs) * TAU
                    warp(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r)
                    if (k === 0) ctx.moveTo(wx, wy)
                    else ctx.lineTo(wx, wy)
                }
            } else {
                ctx.arc(cx, cy, r, 0, TAU)
            }
            ctx.stroke()
        }

        const count = Math.max(
            3,
            Math.round(
                live.dashes + (hash3(n, seed, 1) - 0.5) * 2 * adv.dashJitter
            )
        )
        const slot = TAU / count
        // Spin is counter-clockwise so the square head leads and the taper
        // trails it. `G(u) - n` is the ring's spin history with the per-ring
        // part taken out: at Spin Falloff 0 it is just the stream phase, so
        // the tunnel turns rigidly and the spiral arms stay exactly the
        // poster's. The original spun by `G(u)` alone, which added the spin
        // to every ring's offset and sheared the arms into a starburst.
        const rot =
            n * spiralRad +
            (hash3(n, seed, 2) - 0.5) * rj * slot -
            twistRad * (G(u) - n)

        ctx.beginPath()
        for (let i = 0; i < count; i++) {
            const lenJ = 1 + (hash3(n, i + 11, seed + 3) - 0.5) * 2 * lj
            const len = slot * clamp(fill * lenJ, 0.05, 0.995)
            const off = hash3(n, i + 11, seed + 4) * (slot - len) * pj
            const a0 = rot + i * slot + off
            // A segment per ~6 px keeps the long tapered tails smooth.
            const segs = clamp(Math.ceil((len * r) / 6), 6, 48)
            for (let k = 0; k <= segs; k++) {
                const s = k / segs
                const am = a0 + len * s
                const swell = lens
                    ? 1 +
                      lens.swell *
                          lensK(cx + Math.cos(am) * r, cy + Math.sin(am) * r)
                    : 1
                const hw = (wFull * prof(s) * swell) / 2
                const ang = am + (slant * hw) / r
                const ro = r + hw
                warp(cx + Math.cos(ang) * ro, cy + Math.sin(ang) * ro)
                if (k === 0) ctx.moveTo(wx, wy)
                else ctx.lineTo(wx, wy)
            }
            for (let k = segs; k >= 0; k--) {
                const s = k / segs
                const am = a0 + len * s
                const swell = lens
                    ? 1 +
                      lens.swell *
                          lensK(cx + Math.cos(am) * r, cy + Math.sin(am) * r)
                    : 1
                const hw = (wFull * prof(s) * swell) / 2
                const ang = am - (slant * hw) / r
                const ri = Math.max(0, r - hw)
                warp(cx + Math.cos(ang) * ri, cy + Math.sin(ang) * ri)
                ctx.lineTo(wx, wy)
            }
            ctx.closePath()
        }
        ctx.fill()
    }
    ctx.globalAlpha = 1
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function CinnabarTunnel({
    background = DEFAULTS.background,
    dashColor = DEFAULTS.dashColor,
    dashes = DEFAULTS.dashes,
    scale = DEFAULTS.scale,
    reach = DEFAULTS.reach,
    strength = DEFAULTS.strength,
    speed = DEFAULTS.speed,
    twist = DEFAULTS.twist,
    advanced = {"hole":6,"pull":4,"seed":7,"grain":0,"hover":50,"slant":0,"taper":4,"fadeIn":60,"lensMs":60,"pullMs":600,"spiral":5.625,"centerX":50,"centerY":50,"spinDeg":24,"dashFill":98,"hairline":0,"periodMs":2200,"ringStep":11,"vignette":0,"lensBulge":30,"lensSwell":90,"lensSwirl":40,"posJitter":0,"rotJitter":0,"dashJitter":0,"hoverBoost":50,"lineWeight":12,"pressBoost":100,"taperStart":0,"spinFalloff":0,"weightCurve":31,"lengthJitter":0},
    style,
}: CinnabarTunnelProps) {
    const adv: Advanced = { ...DEFAULT_ADVANCED, ...advanced }

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const live: Live = {
        speed,
        scale,
        twist,
        dashes,
        dashColor,
        background,
        reach,
        strength,
        advanced,
    }
    const liveRef = useRef<Live>(live)
    liveRef.current = live
    const stRef = useRef<State>({
        p: 0,
        over: 0,
        overT: 0,
        down: 0,
        downT: 0,
        u: 0.5,
        v: 0.5,
        lu: 0.5,
        lv: 0.5,
        offX: 0,
        offY: 0,
    })

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
            w = Math.max(1, root.offsetWidth)
            h = Math.max(1, root.offsetHeight)
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.round(w * dpr)
            canvas.height = Math.round(h * dpr)
            canvas.style.width = w + "px"
            canvas.style.height = h + "px"
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const target = RenderTarget.current()
        const frozen =
            target === RenderTarget.export || target === RenderTarget.thumbnail
        const mq =
            typeof window.matchMedia === "function"
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null

        const st = stRef.current
        let raf = 0
        let last = -1
        // Eased stream rate, so hover / press boosts glide rather than jolt.
        let rateNow = -1

        const frame = (now: number) => {
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const lv = liveRef.current
            const a: Advanced = { ...DEFAULT_ADVANCED, ...lv.advanced }
            const still = frozen || (mq ? mq.matches : false)
            const hs = still ? 0 : Math.max(0, a.hover) / 50

            st.over += (st.overT - st.over) * (1 - Math.exp(-dt / 0.35))
            st.down += (st.downT - st.down) * (1 - Math.exp(-dt / 0.2))

            if (!still) {
                const period = Math.max(100, a.periodMs) / 1000
                const boost =
                    hs *
                    ((st.over * a.hoverBoost) / 100 +
                        (st.down * a.pressBoost) / 100)
                const rate =
                    (clamp(lv.speed, 0, 100) / 50 / period) * (1 + boost)
                // ~0.5 s glide on any change of speed (slider, hover, press).
                rateNow =
                    rateNow < 0
                        ? rate
                        : rateNow + (rate - rateNow) * (1 - Math.exp(-dt / 0.5))
                st.p += dt * rateNow
            }

            // Lens follows the pointer in ~Lens Follow ms; it appears where
            // the pointer enters rather than sliding in from where it left.
            if (st.over < 0.02) {
                st.lu = st.u
                st.lv = st.v
            } else {
                const kl = 1 - Math.exp(-dt / Math.max(0.001, a.lensMs / 1000))
                st.lu += (st.u - st.lu) * kl
                st.lv += (st.v - st.lv) * kl
            }

            // Lean the centre toward the pointer, held as a share of the frame
            // and turned into pixels only here.
            const pull = (a.pull / 100) * hs * st.over
            const tx = clamp(st.u - a.centerX / 100, -0.5, 0.5) * 2 * pull * w
            const ty = clamp(st.v - a.centerY / 100, -0.5, 0.5) * 2 * pull * w
            const kp = 1 - Math.exp(-dt / Math.max(0.05, a.pullMs / 1000))
            st.offX += (tx - st.offX) * kp
            st.offY += (ty - st.offY) * kp

            const amp = hs * st.over * (clamp(lv.strength, 0, 10) / 5)
            const R = (clamp(lv.reach, 0, 10) / 10) * 0.5 * Math.min(w, h)
            const lens: Lens | null =
                amp > 0.002 && R > 1
                    ? {
                          x: st.lu * w,
                          y: st.lv * h,
                          invR2: 1 / (R * R),
                          swirl: ((a.lensSwirl * Math.PI) / 180) * amp,
                          // Capped below the fold-over limit (≈2.2).
                          bulge: Math.min(2, (a.lensBulge / 100) * amp),
                          swell: (a.lensSwell / 100) * amp,
                      }
                    : null

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            drawField(ctx, w, h, st, lv, a, lens)

            if (!frozen) raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        const up = () => {
            st.downT = 0
        }
        window.addEventListener("pointerup", up)
        window.addEventListener("pointercancel", up)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("pointerup", up)
            window.removeEventListener("pointercancel", up)
        }
    }, [])

    const onMove = (e: React.PointerEvent) => {
        const root = rootRef.current
        const st = stRef.current
        if (root) {
            const r = root.getBoundingClientRect()
            if (r.width > 0 && r.height > 0) {
                st.u = (e.clientX - r.left) / r.width
                st.v = (e.clientY - r.top) / r.height
            }
        }
        st.overT = 1
    }
    const onLeave = (e: React.PointerEvent) => {
        stRef.current.overT = 0
        if (e.pointerType === "touch") stRef.current.downT = 0
    }
    const onDown = (e: React.PointerEvent) => {
        onMove(e)
        stRef.current.downT = 1
    }

    return (
        <div
            ref={rootRef}
            onPointerMove={onMove}
            onPointerEnter={onMove}
            onPointerLeave={onLeave}
            onPointerDown={onDown}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                isolation: "isolate",
                touchAction: "none",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "block",
                    width: "100%",
                    height: "100%",
                }}
            />
            {adv.vignette > 0 ? (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background:
                            "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.85) 100%)",
                        opacity: adv.vignette / 100,
                    }}
                />
            ) : null}
            {adv.grain > 0 ? <Grain amount={adv.grain} /> : null}
        </div>
    )
}

/** Film grain overlay; the noise tile is made on the client only. */
function Grain({ amount }: { amount: number }) {
    const [noise, setNoise] = React.useState("")
    useEffect(() => {
        try {
            const c = document.createElement("canvas")
            c.width = 128
            c.height = 128
            const g = c.getContext("2d")
            if (!g) return
            const img = g.createImageData(128, 128)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255
                img.data[i] = v
                img.data[i + 1] = v
                img.data[i + 2] = v
                img.data[i + 3] = 255
            }
            g.putImageData(img, 0, 0)
            setNoise(c.toDataURL())
        } catch (e) {}
    }, [])
    if (!noise) return null
    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                backgroundImage: `url(${noise})`,
                backgroundSize: "128px 128px",
                mixBlendMode: "overlay",
                opacity: (amount / 100) * 0.6,
            }}
        />
    )
}

const D = DEFAULT_ADVANCED
