"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

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

/**
 * GimbalMarquee — rings of repeated text share one hinge, fan open into a
 * globe, tumble, and fold back into a single ring. Refined from the user's
 * `PieceMadeRings`: every original control is kept; the timeline now flows
 * without parking, and the globe can be grabbed, thrown and magnified.
 */

/** Tuning values. Every field is the constant the look is built on. */
const DEFAULT_ADVANCED = {
    repeats: 14,
    letterScale: 82,
    perspective: 35,
    tilt: 25,
    baseTurn: 57,
    preTurn: 18,
    spread: 100,
    cycleMs: 5430,
    // Phases now overlap so something is always mid-move; the original
    // (130/270, 530/1470, 3850/4800, 5150) had a 140 ms snap and three holds.
    preStartMs: 0,
    preEndMs: 900,
    openStartMs: 250,
    openEndMs: 1750,
    closeStartMs: 3350,
    closeEndMs: 4750,
    returnEndMs: 5430,
    tumbleTurns: 1,
    tumbleAxis: 30,
    tumbleEase: 100,
    phase: 0,
    drift: 6, // was 0: a slow slide keeps the letters alive through the holds
    backOpacity: 40,
    edgeShade: 45,
    stillMs: 1600,
    hoverTilt: 16,
    pressBoost: 60,
    hover: 50,
    lensReach: 45,
    lensSwell: 50,
    lensPush: 8,
    dragSpin: 100,
    glide: 1.2,
    settle: 2.5,
    grain: 0,
    vignette: 0,
}

export interface GimbalMarqueeFont {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
}

export interface GimbalMarqueeProps {
    text?: string
    background?: string
    font?: GimbalMarqueeFont
    color?: string
    rings?: number
    size?: number
    /** Grab the globe to spin it; it glides on and settles home. */
    drag?: boolean
    /** Letters swell toward the pointer, 0–10. */
    lens?: number
    speed?: number
    advanced?: Partial<typeof DEFAULT_ADVANCED>
    style?: CSSProperties
}

type M3 = number[]
type Damped = { x: number; v: number }

/** Glyphs are set at one fixed size and scaled by transform, so resizing never re-rasterises at a new px size. */
const FONT_PX = 100
/** Floats per glyph in the frame buffer: z, x, y, a, b, c, d, alpha, char. */
const STRIDE = 9

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const range = (t: number, a: number, b: number) =>
    b <= a ? (t >= b ? 1 : 0) : clamp01((t - a) / (b - a))
/** Quintic smootherstep: zero speed and zero acceleration at both ends, so ramps never kick. */
const smoother = (u: number) => u * u * u * (u * (u * 6 - 15) + 10)
const rad = (d: number) => (d * Math.PI) / 180

/** Critically damped follow (Unity's SmoothDamp). Speed stays continuous even when the target jumps. */
function follow(s: Damped, target: number, smoothTime: number, dt: number) {
    const o = 2 / Math.max(1e-4, smoothTime)
    const x = o * dt
    const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
    const ch = s.x - target
    const tmp = (s.v + o * ch) * dt
    s.v = (s.v - o * tmp) * e
    s.x = target + (ch + tmp) * e
}

function rotAxis(x: number, y: number, z: number, a: number): M3 {
    const c = Math.cos(a)
    const s = Math.sin(a)
    const t = 1 - c
    return [
        t * x * x + c, t * x * y - s * z, t * x * z + s * y,
        t * x * y + s * z, t * y * y + c, t * y * z - s * x,
        t * x * z - s * y, t * y * z + s * x, t * z * z + c,
    ]
}

function mul(A: M3, B: M3): M3 {
    const r = new Array(9)
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            r[i * 3 + j] =
                A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]
    return r
}

function apply(M: M3, x: number, y: number, z: number): [number, number, number] {
    return [
        M[0] * x + M[1] * y + M[2] * z,
        M[3] * x + M[4] * y + M[5] * z,
        M[6] * x + M[7] * y + M[8] * z,
    ]
}

/** q ← rot(a) ⊗ q, for a world-space rotation vector a (radians). q is [w, x, y, z]. */
function spin(q: number[], ax: number, ay: number, az: number) {
    const ang = Math.sqrt(ax * ax + ay * ay + az * az)
    if (ang < 1e-9) return
    const s = Math.sin(ang / 2) / ang
    const bw = Math.cos(ang / 2)
    const bx = ax * s
    const by = ay * s
    const bz = az * s
    const [w, x, y, z] = q
    q[0] = bw * w - bx * x - by * y - bz * z
    q[1] = bw * x + bx * w + by * z - bz * y
    q[2] = bw * y - bx * z + by * w + bz * x
    q[3] = bw * z + bx * y - by * x + bz * w
    const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1
    for (let i = 0; i < 4; i++) q[i] /= n
}

/** Rotation vector (axis × angle) of q, shortest way home. */
function logQ(q: number[]): [number, number, number] {
    const sg = q[0] < 0 ? -1 : 1
    const w = Math.min(1, q[0] * sg)
    const s = Math.sqrt(1 - w * w)
    const k = s < 1e-6 ? 2 : (2 * Math.acos(w)) / s
    return [q[1] * sg * k, q[2] * sg * k, q[3] * sg * k]
}

function quatMat(q: number[]): M3 {
    const [w, x, y, z] = q
    return [
        1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
        2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
        2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
    ]
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function GimbalMarquee({
    text = "ABCDE",
    background = "#000000",
    font = {"variant":"Regular","fontSize":"16px","textAlign":"left","fontFamily":"Inter","fontWeight":400,"lineHeight":"1.5em","letterSpacing":"0em"},
    color = "#5FFFE7",
    rings = 6,
    size = 477,
    drag = true,
    lens = 3.3,
    speed = 50,
    advanced = {"tilt":25,"drift":6,"glide":1.2,"grain":0,"hover":50,"phase":0,"settle":2.5,"spread":100,"cycleMs":5430,"preTurn":18,"repeats":14,"stillMs":1600,"baseTurn":57,"dragSpin":100,"lensPush":8,"preEndMs":900,"vignette":0,"edgeShade":45,"hoverTilt":16,"lensReach":45,"lensSwell":50,"openEndMs":1750,"closeEndMs":4750,"preStartMs":0,"pressBoost":60,"tumbleAxis":30,"tumbleEase":100,"backOpacity":40,"letterScale":82,"openStartMs":250,"perspective":35,"returnEndMs":5430,"tumbleTurns":1,"closeStartMs":3350},
    style,
}: GimbalMarqueeProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const live = { text, font, size, rings, speed, color, drag, lens, advanced }
    const propsRef = useRef(live)
    propsRef.current = live

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
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        // pointer (raw, in CSS px of the canvas)
        const ptr = { x: 0, y: 0, over: false, down: false }
        const grab = { on: false, id: -1, lx: 0, ly: 0, dx: 0, dy: 0 }
        const onMove = (e: PointerEvent) => {
            if (grab.on && e.pointerId === grab.id) {
                grab.dx += e.offsetX - grab.lx
                grab.dy += e.offsetY - grab.ly
                grab.lx = e.offsetX
                grab.ly = e.offsetY
            }
            ptr.x = e.offsetX
            ptr.y = e.offsetY
            ptr.over = true
        }
        const onLeave = () => {
            ptr.over = false
        }
        const onDown = (e: PointerEvent) => {
            onMove(e)
            ptr.down = true
            if (!propsRef.current.drag) return
            grab.on = true
            grab.id = e.pointerId
            grab.lx = e.offsetX
            grab.ly = e.offsetY
            grab.dx = grab.dy = 0
            try {
                canvas.setPointerCapture(e.pointerId)
            } catch {}
        }
        const onUp = (e: PointerEvent) => {
            ptr.down = false
            if (e.pointerId === grab.id) grab.on = false
        }
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerenter", onMove)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        // reduced motion / static targets
        const mq =
            typeof window.matchMedia === "function"
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null
        const target = RenderTarget.current()
        const staticTarget =
            target === RenderTarget.thumbnail || target === RenderTarget.export

        // text measurement cache (em units)
        let mKey = ""
        let chars: string[] = []
        let mWidths: number[] = []
        let centres: number[] = []
        let mTotal = 1
        const measure = (str: string, fontBase: string) => {
            const key = str + "|" + fontBase
            if (key === mKey) return
            chars = Array.from(str)
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.font = fontBase.replace("{px}", `${FONT_PX}px`)
            mWidths = chars.map((c) => ctx.measureText(c).width / FONT_PX)
            mTotal = Math.max(0.01, mWidths.reduce((a, b) => a + b, 0))
            centres = []
            let acc = 0
            for (const mw of mWidths) {
                centres.push(acc + mw / 2)
                acc += mw
            }
            mKey = key
        }
        const remeasure = () => {
            mKey = ""
        }
        const fonts = document.fonts
        fonts?.ready.then(remeasure)
        fonts?.addEventListener("loadingdone", remeasure)

        // grain tile
        const grainTile = document.createElement("canvas")
        grainTile.width = 160
        grainTile.height = 160
        const gctx = grainTile.getContext("2d")
        if (gctx) {
            const img = gctx.createImageData(160, 160)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255
                img.data[i] = v
                img.data[i + 1] = v
                img.data[i + 2] = v
                img.data[i + 3] = 255
            }
            gctx.putImageData(img, 0, 0)
        }

        // Glyph buffer, reused every frame: no per-frame objects, so no GC hitches.
        let G = new Float64Array(0)
        let ord = new Uint32Array(0)
        let lastN = -1

        // Smoothed pointer state. Each is second-order, so it eases in *and* out.
        const lensOn: Damped = { x: 0, v: 0 }
        const tiltOn: Damped = { x: 0, v: 0 }
        const press: Damped = { x: 0, v: 0 }
        const lensX: Damped = { x: 0, v: 0 }
        const lensY: Damped = { x: 0, v: 0 }
        const tiltX: Damped = { x: 0, v: 0 }
        const tiltY: Damped = { x: 0, v: 0 }
        const home: Damped = { x: 0, v: 0 }
        // Drag spin: orientation q and angular velocity om (rad/s, world axes).
        const q = [1, 0, 0, 0]
        const om = [0, 0, 0]

        let clock = 0
        let last = -1
        let raf = 0
        let cursor = ""

        const loop = (now: number) => {
            raf = requestAnimationFrame(loop)
            const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000)
            last = now
            const p = propsRef.current
            const adv = { ...DEFAULT_ADVANCED, ...p.advanced }
            const hk = Math.max(0, adv.hover) / 50

            if (!p.drag) grab.on = false
            const cur = !p.drag ? "" : grab.on ? "grabbing" : "grab"
            if (cur !== cursor) canvas.style.cursor = cursor = cur

            // pointer easing
            const nx = w > 0 ? (ptr.x / w - 0.5) * 2 : 0
            const ny = h > 0 ? (ptr.y / h - 0.5) * 2 : 0
            // Re-entering from another side: start the followers where the
            // pointer is, rather than sweeping in from where it left.
            if (ptr.over && lensOn.x < 0.01) {
                lensX.x = ptr.x
                lensY.x = ptr.y
                lensX.v = lensY.v = 0
            }
            if (ptr.over && tiltOn.x < 0.01) {
                tiltX.x = nx
                tiltY.x = ny
                tiltX.v = tiltY.v = 0
            }
            follow(lensOn, ptr.over ? 1 : 0, 0.3, dt)
            follow(tiltOn, ptr.over && !grab.on ? 1 : 0, 0.4, dt)
            follow(press, ptr.down ? 1 : 0, 0.35, dt)
            follow(lensX, ptr.x, 0.12, dt)
            follow(lensY, ptr.y, 0.12, dt)
            follow(tiltX, nx, 0.35, dt)
            follow(tiltY, ny, 0.35, dt)

            const cycle = Math.max(500, adv.cycleMs)
            const rate =
                (Math.max(0, p.speed) / 50) *
                (1 + (adv.pressBoost / 100) * press.x * hk)
            clock += dt * 1000 * rate
            const frozen = staticTarget || (mq ? mq.matches : false)
            const t = frozen ? adv.stillMs % cycle : clock % cycle

            // timeline — every ramp is quintic, and ends are clamped to the
            // loop so the seam is always continuous.
            const closeEnd = Math.min(adv.closeEndMs, cycle)
            let pre = smoother(range(t, adv.preStartMs, adv.preEndMs))
            if (t > closeEnd)
                pre *= 1 - smoother(range(t, closeEnd, Math.min(adv.returnEndMs, cycle)))
            const fan =
                smoother(range(t, adv.openStartMs, adv.openEndMs)) *
                (1 - smoother(range(t, adv.closeStartMs, closeEnd)))
            // Tumble: the original eased each half, which parked the globe dead
            // still mid-turn and at both ends. Now a steady glide runs the whole
            // loop and Tumble Ease sets how much of the turn bunches into the
            // open window; the glide never drops below 20 % and meets the seam
            // at the same speed on both sides.
            const wMix = 0.8 * clamp01(adv.tumbleEase / 100)
            const turn =
                (1 - wMix) * (t / cycle) +
                wMix * smoother(range(t, adv.openStartMs, closeEnd))
            const psi = rad(360 * Math.round(adv.tumbleTurns)) * turn

            const R = Math.max(10, p.size / 2)

            // drag spin
            if (grab.on) {
                // Follow the hand exactly: a drag across the globe is half a turn.
                const spinK = (Math.PI / (2 * R)) * (adv.dragSpin / 100)
                const ax = grab.dy * spinK
                const ay = -grab.dx * spinK
                grab.dx = grab.dy = 0
                spin(q, ax, ay, 0)
                if (dt > 0) {
                    // Throw velocity, smoothed so one uneven event can't fling it.
                    const k = 1 - Math.exp(-dt * 20)
                    om[0] += (ax / dt - om[0]) * k
                    om[1] += (ay / dt - om[1]) * k
                    om[2] -= om[2] * k
                }
                home.x = home.v = 0
            } else {
                const fk = Math.exp(-dt / Math.max(0.05, adv.glide))
                om[0] *= fk
                om[1] *= fk
                om[2] *= fk
                // Pull home eases in from zero, so letting go never kinks the path.
                follow(home, adv.settle > 0 ? 1 / adv.settle : 0, 0.5, dt)
                const r = logQ(q)
                spin(
                    q,
                    (om[0] - r[0] * home.x) * dt,
                    (om[1] - r[1] * home.x) * dt,
                    (om[2] - r[2] * home.x) * dt
                )
            }

            // orientation
            const ka = rad(adv.tumbleAxis)
            const Mt = rotAxis(Math.sin(ka), 0, Math.cos(ka), psi)
            const Mr = rotAxis(0, 0, 1, rad(adv.tilt))
            const tk = adv.hoverTilt * hk * tiltOn.x
            const yaw = rad(tiltX.x * tk)
            const pitch = rad(-tiltY.x * tk)
            const M = mul(
                rotAxis(0, 1, 0, yaw),
                mul(rotAxis(1, 0, 0, pitch), mul(quatMat(q), mul(Mr, Mt)))
            )

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            const f0: GimbalMarqueeFont = p.font || {}
            const family =
                f0.fontFamily || "'Helvetica Neue', Helvetica, Arial, sans-serif"
            const weight = f0.fontWeight || 400
            const fstyle = f0.fontStyle || "normal"
            const fontBase = `${fstyle} ${weight} {px} ${family}`

            const fl = R * Math.max(1.2, adv.perspective / 10)
            const cx = w / 2
            const cy = h / 2

            measure(String(p.text ?? ""), fontBase)
            if (chars.length) {
                const reps = Math.max(1, Math.round(adv.repeats))
                const em = (2 * Math.PI * R) / (reps * mTotal)
                const gs = (adv.letterScale / 100) * (em / FONT_PX)
                const N = Math.max(1, Math.round(p.rings))
                const step = fan * (adv.spread / 100) * (Math.PI / N)
                const alpha0 = rad(adv.baseTurn + adv.preTurn * pre)
                const sOff = rad(adv.phase) + (frozen ? 0 : rad(adv.drift) * (clock / 1000))
                const back = clamp01(adv.backOpacity / 100)
                const edge = clamp01(adv.edgeShade / 100)
                const hW = apply(M, 0, 1, 0)

                const lensAmt = (Math.max(0, p.lens) / 5) * hk * lensOn.x
                const reach = Math.max(1, (R * adv.lensReach) / 100)
                const invReach = 1 / (reach * reach)
                const swell = adv.lensSwell / 100
                const push = adv.lensPush / 100

                const cap = N * reps * chars.length
                if (G.length < cap * STRIDE) {
                    G = new Float64Array(cap * STRIDE)
                    ord = new Uint32Array(cap)
                    lastN = -1
                }

                let n = 0
                for (let i = 0; i < N; i++) {
                    const a = alpha0 + i * step
                    const ca = Math.cos(a)
                    const sa = Math.sin(a)
                    const uW = apply(M, ca, 0, sa)
                    const upW = apply(M, -sa, 0, ca)
                    for (let r = 0; r < reps; r++) {
                        for (let c = 0; c < chars.length; c++) {
                            if (chars[c] === " ") continue
                            const s = ((r * mTotal + centres[c]) * em) / R + sOff
                            const cs = Math.cos(s)
                            const sn = Math.sin(s)
                            const ox = cs * uW[0] + sn * hW[0]
                            const oy = cs * uW[1] + sn * hW[1]
                            const oz = cs * uW[2] + sn * hW[2]
                            // tangent T = up × o
                            const tx = upW[1] * oz - upW[2] * oy
                            const ty = upW[2] * ox - upW[0] * oz
                            let z = R * oz
                            let k = fl / Math.max(fl * 0.2, fl + z)
                            let x = cx + R * ox * k
                            let y = cy + R * oy * k
                            const facing = -oz
                            let al =
                                facing >= 0
                                    ? 1 - edge + edge * Math.sqrt(facing)
                                    : back * (0.55 + 0.45 * Math.sqrt(-facing))
                            let kg = k * gs
                            // Lens: near-side letters under the pointer lift off
                            // the sphere, grow and brighten, fading out toward
                            // the rim so nothing pops at the edge.
                            if (lensAmt > 0.001 && facing > 0) {
                                const dx = x - lensX.x
                                const dy = y - lensY.x
                                const f =
                                    Math.exp(-(dx * dx + dy * dy) * invReach) *
                                    lensAmt *
                                    Math.min(1, facing * 3)
                                if (f > 0.001) {
                                    const rr = R * (1 + f * push)
                                    z = rr * oz
                                    k = fl / Math.max(fl * 0.2, fl + z)
                                    x = cx + rr * ox * k
                                    y = cy + rr * oy * k
                                    kg = k * gs * (1 + f * swell)
                                    al += (1 - al) * Math.min(1, f)
                                }
                            }
                            const o = n * STRIDE
                            G[o] = z
                            G[o + 1] = x
                            G[o + 2] = y
                            G[o + 3] = tx * kg
                            G[o + 4] = ty * kg
                            G[o + 5] = -upW[0] * kg
                            G[o + 6] = -upW[1] * kg
                            G[o + 7] = al
                            G[o + 8] = c
                            n++
                        }
                    }
                }
                // Last frame's order is nearly right, so keep it and re-sort.
                if (n !== lastN) {
                    for (let i = 0; i < n; i++) ord[i] = i
                    lastN = n
                }
                ord.subarray(0, n).sort((i, j) => G[j * STRIDE] - G[i * STRIDE])

                ctx.font = fontBase.replace("{px}", `${FONT_PX}px`)
                ctx.textAlign = "center"
                ctx.textBaseline = "alphabetic"
                ctx.fillStyle = p.color
                const baseOff = 0.36 * FONT_PX
                for (let g = 0; g < n; g++) {
                    const o = ord[g] * STRIDE
                    ctx.globalAlpha = G[o + 7]
                    ctx.setTransform(
                        dpr * G[o + 3],
                        dpr * G[o + 4],
                        dpr * G[o + 5],
                        dpr * G[o + 6],
                        dpr * G[o + 1],
                        dpr * G[o + 2]
                    )
                    ctx.fillText(chars[G[o + 8]], 0, baseOff)
                }
                ctx.globalAlpha = 1
            }

            // overlays
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            if (adv.vignette > 0) {
                const diag = Math.sqrt(w * w + h * h) / 2
                const gr = ctx.createRadialGradient(cx, cy, diag * 0.35, cx, cy, diag)
                gr.addColorStop(0, "rgba(0,0,0,0)")
                gr.addColorStop(1, `rgba(0,0,0,${clamp01(adv.vignette / 100) * 0.9})`)
                ctx.fillStyle = gr
                ctx.fillRect(0, 0, w, h)
            }
            if (adv.grain > 0) {
                ctx.globalAlpha = clamp01(adv.grain / 100) * 0.3
                const ox = -Math.floor(Math.random() * 160)
                const oy = -Math.floor(Math.random() * 160)
                for (let x = ox; x < w; x += 160)
                    for (let y = oy; y < h; y += 160) ctx.drawImage(grainTile, x, y)
                ctx.globalAlpha = 1
            }
        }
        raf = requestAnimationFrame(loop)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            fonts?.removeEventListener("loadingdone", remeasure)
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerenter", onMove)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                background,
                overflow: "hidden",
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
                    // Sideways drags spin the globe; vertical swipes still scroll the page on touch.
                    touchAction: drag ? "pan-y" : "auto",
                }}
            />
        </div>
    )
}
