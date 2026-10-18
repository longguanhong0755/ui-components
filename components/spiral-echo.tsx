"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/**
 * Mantra Whorl — one word chanted round an endless logarithmic spiral, every
 * copy spinning out of the eye and growing until it leaves the frame.
 *
 * Built after "One Spiral Arm" (an "MXC" spiral supplied as code and a still):
 * alternating solid and outlined words on interleaved log-spiral arms that wind
 * outward counter-clockwise, text reading clockwise with letter tops facing out.
 * The geometry, the 2.56× growth per turn, 13 words a turn, two arms, the 4.2
 * word aspect, the 45/1000 boldness and the 5/1000 outline are transcribed from
 * it. The name is ours.
 *
 * WHERE IT DEVIATES, AND WHY
 *
 *   Swirl. The original slid every word straight out along its own ray, so the
 *   pattern rotated while the words did not, which read as a strobe rather than
 *   a vortex. Zooming a log spiral is the same as turning it, so Swirl hands
 *   some of that turn to the words: at 10 they ride the arm (the curve stands
 *   still and they spin out along it), at 0 they move as the original did.
 *   The turn is kept in its own accumulator so changing Swirl never jumps.
 *   Glide. The original stepped straight to its rate. Here the rate eases,
 *   so the spiral gathers speed on mount and any Speed edit or surge glides
 *   (RATE_EASE).
 *   Emergence. The original culled words below 1 px, so they popped into being
 *   at the eye. Here they fade up over EMERGE_FROM → EMERGE_TO.
 *   Grain. The original re-dealt it every display frame, which fizzes at 120 Hz.
 *   Here it is re-dealt at GRAIN_FPS so it reads as film.
 *   Letters on the curve. The original set each word on a circle at its own
 *   radius, but the arm grows ~7.5% word to word, so every join stepped by
 *   most of a cap height and rings read as a staircase. Here each letter takes
 *   its radius, size and lean (the spiral's pitch, atan(lnQ / 2π) ≈ 8.5°) from
 *   its own angle, so a ring reads as one unbroken line, as the reference does.
 *   Pointer. The original leaned the centre a few percent and sped up on press.
 *   Follow lets the eye of the spiral travel to the pointer on a critically
 *   damped spring, with depth parallax (PARALLAX_DEPTH) so the far rings go
 *   with it and the near ones barely move. It touches positions only, never
 *   the zoom's rate. Ink: outlined words near the pointer fill in,
 *   so hovering paints through the pattern. Press is now Surge: a fast attack
 *   and slow release, so a tap throws a whoosh of words outward instead of
 *   stepping the speed up and down. The page still scrolls under a finger;
 *   the original's `touch-action: none` trapped it.
 *   Cut. Start radius and angle only shift the phase of an endless zoom, centre
 *   X/Y is the frame's job, and vignette, fill/outline opacity, arc follow and
 *   minimum size were knobs on one right answer, so they are fixed here.
 *
 * Everything moves on a hand-rolled rAF clock, so there is no Transition row.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

const TAU = Math.PI * 2

/** Openness 5 grows an arm's radius this much per turn (the original's 256%);
 * every 5 steps either side doubles or halves the log of it. */
const TURN_RATIO = 2.56
/** Word width over cap height for a 3-letter word at Stretch 5 (the original's
 * 420%); every 5 steps doubles or halves it. */
const ASPECT = 4.2
/** Gap 1 leaves this share of each word's slot empty; 2 is the original's 88% fill. */
const GAP_UNIT = 0.06
/** Weight 1 strokes solid words this share of their cap height; 5 is the original's 45/1000. */
const WEIGHT_UNIT = 0.009
/** Outline 1 strokes outlined words this share of their radius; 5 is the original's 5/1000. */
const OUTLINE_UNIT = 0.001
/** The thinnest outline, in px, so far words stay visible (the original's 6/10). */
const STROKE_MIN = 0.6
/** Words fade up between these cap heights (px) as they leave the eye. */
const EMERGE_FROM = 0.5
const EMERGE_TO = 4

/** Speed 1 zooms this many arm turns a second. */
const SPEED_UNIT = 0.1
/** Seconds for the rate to settle after a change, so speed always glides. */
const RATE_EASE = 0.5
/** Surge rises over ATTACK and falls over RELEASE (s); Surge 1 adds this share of speed. */
const SURGE_ATTACK = 0.12
const SURGE_RELEASE = 0.9
const SURGE_UNIT = 0.4
/** Seconds for hover ink to ease in and out. */
const POINTER_EASE = 0.45
/** Ink 1 reaches this share of the short side. */
const INK_UNIT = 0.05
/** Seconds the eye's spring takes to settle on the pointer. */
const FOLLOW_TIME = 0.4
/** A ring this far out (share of the short side) follows the eye half as far:
 * the vanishing point travels, the near rings barely do, so it reads as
 * looking down a tunnel rather than sliding a picture. */
const PARALLAX_DEPTH = 0.35

/** Grain 1 lays the noise at this opacity, re-dealt GRAIN_FPS times a second. */
const GRAIN_UNIT = 0.007
const GRAIN_FPS = 24
const GRAIN_TILE = 160

const FALLBACK_FONTS = `"Archivo Black", "Arial Black", "Helvetica Neue", Arial, sans-serif`
const FONT_LINK_ID = "mantra-whorl-archivo-black"

export interface MantraWhorlSpiral {
    /** Interleaved arms. */
    arms: number
    /** Words on one full turn of an arm. */
    density: number
    /** 0–10: how fast an arm opens per turn. */
    openness: number
}

export interface MantraWhorlWords {
    /** 0–10: word width over cap height. */
    stretch: number
    /** 0–10: empty space between neighbouring words. */
    gap: number
    /** 0–10: extra weight on solid words. */
    weight: number
    /** 0–10: stroke of outlined words. */
    outline: number
}

export interface MantraWhorlPointer {
    /** 0–10: how far round the pointer outlined words fill in. */
    ink: number
    /** 0–10: how far the eye of the spiral follows the pointer (10 = right under it). */
    follow: number
    /** 0–10: how hard a tap or press throws the words outward. */
    surge: number
}

export interface MantraWhorlProps {
    text?: string
    background?: string
    grain?: number
    font?: CSSProperties
    textColor?: string
    spiral?: Partial<MantraWhorlSpiral>
    words?: Partial<MantraWhorlWords>
    pointer?: Partial<MantraWhorlPointer>
    speed?: number
    /** 0–10: share of the zoom's turn the words ride (10 = they spin out along the arm). */
    swirl?: number
    direction?: "out" | "in"
    style?: CSSProperties
}

const DEFAULT_FONT: CSSProperties = {
    fontFamily: "Archivo Black",
    fontWeight: 400,
    fontStyle: "normal",
}
const DEFAULT_SPIRAL: MantraWhorlSpiral = { arms: 2, density: 13, openness: 5 }
const DEFAULT_WORDS: MantraWhorlWords = { stretch: 5, gap: 2, weight: 5, outline: 5 }
const DEFAULT_POINTER: MantraWhorlPointer = { ink: 5, follow: 7, surge: 5 }
const DEFAULTS = {
    text: "TEXT",
    background: "#000000",
    grain: 10,
    textColor: "#00FFF0",
    speed: 3,
    swirl: 6,
    direction: "out",
}

function clamp(v: number, a: number, b: number): number {
    return v < a ? a : v > b ? b : v
}

function fontString(font: CSSProperties): string {
    let fam = String(font.fontFamily || DEFAULT_FONT.fontFamily)
    if (!/[",']/.test(fam)) fam = `"${fam}"`
    return `${font.fontStyle || "normal"} ${font.fontWeight || 400} 100px ${fam}, ${FALLBACK_FONTS}`
}

/** Critically damped spring toward `to`, settling in about `time` seconds
 * (Game Programming Gems 4, §1.10). Velocity stays continuous however the
 * target jumps, so a flicked pointer never kinks the motion. */
function glide(s: { x: number; v: number }, to: number, time: number, dt: number) {
    const omega = 2 / time
    const x = omega * dt
    const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
    const change = s.x - to
    const temp = (s.v + omega * change) * dt
    s.v = (s.v - omega * temp) * decay
    s.x = to + (change + temp) * decay
}

/** Letter spacing for the 100 px measuring size, from the Font control's value. */
function spacingAt100(ls: CSSProperties["letterSpacing"]): number {
    if (typeof ls === "number") return ls
    const v = parseFloat(ls || "")
    if (!isFinite(v)) return 0
    return /em$/.test(String(ls)) ? v * 100 : v
}

export default function MantraWhorl(props: MantraWhorlProps) {
    const { text = DEFAULTS.text, background = DEFAULTS.background, style } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        if (!document.getElementById(FONT_LINK_ID)) {
            const link = document.createElement("link")
            link.id = FONT_LINK_ID
            link.rel = "stylesheet"
            link.href = "https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap"
            document.head.appendChild(link)
        }

        let w = 1
        let h = 1
        let dpr = 1
        const resize = () => {
            w = Math.max(1, root.offsetWidth)
            h = Math.max(1, root.offsetHeight)
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(w * dpr))
            canvas.height = Math.max(1, Math.round(h * dpr))
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(root)

        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")

        // Glyph widths at 100 px, cached per font + text + spacing.
        let measureKey = ""
        let meas = { capH: 72, W: 250, xs: [125], chars: ["M"] }
        const measure = (fStr: string, txt: string, ls: number) => {
            const key = `${fStr}|${txt}|${ls}`
            if (key === measureKey) return meas
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.font = fStr
            const mM = ctx.measureText("M")
            const capH = mM.actualBoundingBoxAscent > 1 ? mM.actualBoundingBoxAscent : 72
            const chars = Array.from(txt.length ? txt : " ")
            const widths = chars.map((c) => ctx.measureText(c).width)
            const xs: number[] = []
            let acc = 0
            for (let j = 0; j < chars.length; j++) {
                xs.push(acc + widths[j] / 2)
                acc += widths[j] + (j < chars.length - 1 ? ls : 0)
            }
            meas = { capH, W: Math.max(1, acc), xs, chars }
            measureKey = key
            return meas
        }
        const onFonts = () => {
            measureKey = ""
        }
        const fontSet = document.fonts
        fontSet?.addEventListener?.("loadingdone", onFonts)
        fontSet?.ready?.then(onFonts).catch(() => {})
        fontSet?.load?.('400 100px "Archivo Black"').then(onFonts).catch(() => {})

        const noise = document.createElement("canvas")
        noise.width = GRAIN_TILE
        noise.height = GRAIN_TILE
        const nctx = noise.getContext("2d")
        if (nctx) {
            const img = nctx.createImageData(GRAIN_TILE, GRAIN_TILE)
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255
                img.data[i] = v
                img.data[i + 1] = v
                img.data[i + 2] = v
                img.data[i + 3] = 255
            }
            nctx.putImageData(img, 0, 0)
        }
        const noisePattern = ctx.createPattern(noise, "repeat")

        // Pointer, in the canvas's own CSS pixels even when Framer scales the frame.
        const ptr = { x: 0, y: 0, inside: false, down: false }
        const at = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            ptr.x = (e.clientX - r.left) * (w / (r.width || 1))
            ptr.y = (e.clientY - r.top) * (h / (r.height || 1))
        }
        const onMove = (e: PointerEvent) => {
            at(e)
            ptr.inside = true
        }
        const onLeave = () => {
            ptr.inside = false
        }
        const onDown = (e: PointerEvent) => {
            at(e)
            ptr.inside = true
            ptr.down = true
        }
        const onUp = () => {
            ptr.down = false
        }
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerenter", onMove)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointerdown", onDown)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        let phase = 0
        let twist = 0
        let rate = 0
        let last = -1
        let over = 0
        let surge = 0
        const eyeX = { x: 0, v: 0 }
        const eyeY = { x: 0, v: 0 }
        let grainClock = 0
        let grainX = 0
        let grainY = 0
        let raf = 0

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = last < 0 ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000))
            last = now
            const ease = (tau: number) => 1 - Math.exp(-dt / tau)

            const p = propsRef.current
            const spiral = { ...DEFAULT_SPIRAL, ...p.spiral }
            const words = { ...DEFAULT_WORDS, ...p.words }
            const pointer = { ...DEFAULT_POINTER, ...p.pointer }
            const still = !!reduce?.matches

            // Motion: every change of rate glides, so nothing ever lurches.
            over += ((ptr.inside ? 1 : 0) - over) * ease(POINTER_EASE)
            const surgeTo = ptr.down && !still ? 1 : 0
            surge += (surgeTo - surge) * ease(surgeTo > surge ? SURGE_ATTACK : SURGE_RELEASE)
            const dir = p.direction === "in" ? -1 : 1
            const speed = clamp(p.speed ?? DEFAULTS.speed, 0, 10)
            const target = speed * SPEED_UNIT * (1 + surge * pointer.surge * SURGE_UNIT) * dir
            rate = still ? 0 : rate + (target - rate) * ease(RATE_EASE)
            const dPhase = rate * dt
            phase += dPhase
            phase -= 2 * Math.floor(phase / 2) // wrap by 2 turns: keeps solid/outline parity
            twist = (twist + TAU * dPhase * (clamp(p.swirl ?? DEFAULTS.swirl, 0, 10) / 10)) % TAU

            // Follow: the eye rides a spring toward the pointer. It only moves
            // where things are drawn; the zoom's rate never sees it.
            const follow = still || !ptr.inside ? 0 : clamp(pointer.follow, 0, 10) / 10
            glide(eyeX, (ptr.x - w / 2) * follow, FOLLOW_TIME, dt)
            glide(eyeY, (ptr.y - h / 2) * follow, FOLLOW_TIME, dt)

            // Geometry
            const L = Math.min(w, h)
            const cx = w / 2
            const cy = h / 2
            const depth = PARALLAX_DEPTH * L
            // How far a point at radius rho follows the eye: all of it at the
            // eye, less and less outward.
            const shift = (rho: number) => 1 / (1 + rho / depth)

            const N = Math.max(4, Math.round(spiral.density))
            const M = Math.max(1, Math.round(spiral.arms))
            const lnQ = Math.log(TURN_RATIO) * Math.pow(2, (spiral.openness - 5) / 5)
            const slot = TAU / N
            // Log-spiral pitch: radius falls by e^(-k) per radian read clockwise,
            // and the curve leans atan(k) off a circle. Letters take both.
            const k = lnQ / TAU
            const pitch = Math.atan(k)
            const arc = Math.sqrt(1 + k * k)
            const txt = String(p.text ?? DEFAULTS.text)
            const len = Math.max(1, Array.from(txt).length)
            const aspect = Math.max(0.5, ASPECT * Math.pow(2, (words.stretch - 5) / 5) * (len / 3))
            // The angle one word covers. Letters scale with radius, so on a log
            // spiral every word covers the same angle and every gap is equal.
            const span = clamp(1 - words.gap * GAP_UNIT, 0.1, 1) * slot
            const capPerR = span / aspect
            const r0 = 0.25 * L

            const far = Math.hypot(w, h) / 2 + Math.hypot(eyeX.x, eyeY.x)
            const rMin = Math.max(0.5, EMERGE_FROM / capPerR)
            const rMax = far * 1.3 + 10

            const font = { ...DEFAULT_FONT, ...p.font }
            const fStr = fontString(font)
            const m = measure(fStr, txt, spacingAt100(font.letterSpacing))
            const col = p.textColor || DEFAULTS.textColor
            const inkR = pointer.ink * INK_UNIT * L * over

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1
            ctx.fillStyle = p.background || DEFAULTS.background
            ctx.fillRect(0, 0, w, h)

            ctx.font = fStr
            ctx.textAlign = "center"
            ctx.textBaseline = "alphabetic"
            ctx.fillStyle = col
            ctx.strokeStyle = col
            ctx.lineJoin = "round"
            const boldLocal = words.weight * WEIGHT_UNIT * m.capH

            // Radius depends on i only; each arm is a rotation of arm 0.
            const iStart = Math.ceil(N * (Math.log(rMin / r0) / lnQ - phase))
            const iEnd = Math.floor(N * (Math.log(rMax / r0) / lnQ - phase))

            for (let a = 0; a < M; a++) {
                const armRot = (TAU * a) / M
                for (let i = iStart; i <= iEnd; i++) {
                    const r = r0 * Math.exp((i / N + phase) * lnQ)
                    const cap0 = capPerR * r
                    if (cap0 < EMERGE_FROM) continue
                    const theta = -Math.PI / 2 - slot * i - armRot - twist
                    const sh = shift(r)
                    const wx = cx + eyeX.x * sh + r * Math.cos(theta)
                    const wy = cy + eyeY.x * sh + r * Math.sin(theta)
                    const reach = span * r * 1.2 + cap0
                    if (wx < -reach || wx > w + reach || wy < -reach || wy > h + reach) continue

                    // Ink: smoothstep falloff around the pointer, already eased by `over`.
                    let ink = 0
                    if (inkR > 0) {
                        const d = Math.hypot(wx - ptr.x, wy - ptr.y)
                        if (d < inkR) {
                            const k = 1 - d / inkR
                            ink = k * k * (3 - 2 * k)
                        }
                    }
                    const e = clamp((cap0 - EMERGE_FROM) / (EMERGE_TO - EMERGE_FROM), 0, 1)
                    const fade = e * e * (3 - 2 * e)
                    const solid = ((i % 2) + 2) % 2 === 0
                    if (solid) ctx.lineWidth = boldLocal

                    // Every letter sits on the spiral itself, not on its word's
                    // circle: its own radius, size and lean come from its own
                    // angle, so words join into one unbroken line round the arm.
                    for (let j = 0; j < m.chars.length; j++) {
                        const d = (m.xs[j] / m.W - 0.5) * span
                        const ang = theta + d
                        const rho = r * Math.exp(-k * d)
                        const cap = capPerR * rho
                        const kk = cap / m.capH
                        const kx = (span * rho * arc) / m.W
                        const rb = Math.max(0.1, rho - cap / 2)
                        const s = shift(rho)
                        if (!solid) {
                            const sw = Math.max(STROKE_MIN, words.outline * OUTLINE_UNIT * rho)
                            ctx.lineWidth = sw / (kk * Math.sqrt(Math.max(0.05, kx / kk)))
                        }
                        const phi = ang + Math.PI / 2 + pitch
                        const c = Math.cos(phi)
                        const sn = Math.sin(phi)
                        ctx.setTransform(
                            dpr * c * kx,
                            dpr * sn * kx,
                            -dpr * sn * kk,
                            dpr * c * kk,
                            dpr * (cx + eyeX.x * s + rb * Math.cos(ang)),
                            dpr * (cy + eyeY.x * s + rb * Math.sin(ang))
                        )
                        const ch = m.chars[j]
                        if (solid) {
                            ctx.globalAlpha = fade
                            ctx.fillText(ch, 0, 0)
                            if (boldLocal > 0) ctx.strokeText(ch, 0, 0)
                        } else {
                            if (ink > 0.01) {
                                ctx.globalAlpha = fade * ink
                                ctx.fillText(ch, 0, 0)
                            }
                            ctx.globalAlpha = fade
                            ctx.strokeText(ch, 0, 0)
                        }
                    }
                }
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1

            const grain = clamp(p.grain ?? DEFAULTS.grain, 0, 10) * GRAIN_UNIT
            if (grain > 0 && noisePattern) {
                grainClock += dt
                if (grainClock >= 1 / GRAIN_FPS) {
                    grainClock = 0
                    grainX = Math.floor(Math.random() * GRAIN_TILE)
                    grainY = Math.floor(Math.random() * GRAIN_TILE)
                }
                ctx.save()
                ctx.globalAlpha = grain
                ctx.globalCompositeOperation = "screen"
                ctx.translate(-grainX, -grainY)
                ctx.fillStyle = noisePattern
                ctx.fillRect(0, 0, w + GRAIN_TILE, h + GRAIN_TILE)
                ctx.restore()
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerenter", onMove)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            fontSet?.removeEventListener?.("loadingdone", onFonts)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            role="img"
            aria-label={text}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
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
