"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
const RenderTarget = {
    current: () => "preview",
    canvas: "canvas",
    export: "export",
    thumbnail: "thumbnail",
    preview: "preview",
}

// ── Transition helpers ───────────────────────────────────────────────────────
// Drive the formation animation from a Framer Transition value: its `duration`
// sets how long particles take to assemble into the text, its `ease` sets the
// curve they follow on the way in.

type TransitionValue = {
    type?: "tween" | "spring"
    duration?: number
    ease?: string | number[]
    [key: string]: unknown
}

// Evaluate a CSS cubic-bezier [x1,y1,x2,y2] as an (x in 0..1) => eased fn.
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
    const cx = 3 * x1
    const bx = 3 * (x2 - x1) - cx
    const ax = 1 - cx - bx
    const cy = 3 * y1
    const by = 3 * (y2 - y1) - cy
    const ay = 1 - cy - by
    const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
    const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
    return (x: number): number => {
        if (x <= 0) return 0
        if (x >= 1) return 1
        let lo = 0
        let hi = 1
        let t = x
        for (let i = 0; i < 12; i++) {
            const mid = (lo + hi) / 2
            const sx = sampleX(mid)
            if (Math.abs(sx - x) < 1e-6) {
                t = mid
                break
            }
            if (sx < x) lo = mid
            else hi = mid
            t = mid
        }
        return sampleY(t)
    }
}

function resolveEasingFn(
    trans: TransitionValue | undefined
): (t: number) => number {
    const linear = (t: number) => t
    if (!trans || trans.type === "spring") return linear
    const ease = trans.ease
    if (
        Array.isArray(ease) &&
        ease.length === 4 &&
        ease.every((v) => typeof v === "number")
    ) {
        const [x1, y1, x2, y2] = ease as [number, number, number, number]
        return cubicBezier(x1, y1, x2, y2)
    }
    if (typeof ease === "string") {
        switch (ease) {
            case "easeIn":
            case "circIn":
                return (t) => t * t
            case "easeOut":
            case "circOut":
                return (t) => 1 - (1 - t) * (1 - t)
            case "easeInOut":
            case "circInOut":
                return (t) =>
                    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
            case "linear":
            default:
                return linear
        }
    }
    return linear
}

function resolveDuration(trans: TransitionValue | undefined): number {
    if (!trans || trans.type === "spring") return 1
    const d = trans.duration
    return typeof d === "number" && d > 0 ? d : 1
}

/**
 * ParticleText — text rendered as a dense field of colored particles that
 * get displaced by the cursor like a black hole carving a void out of a
 * star field: particles whose origins fall within the cursor's radius are
 * pushed outward to sit on the ring at the radius edge; particles outside
 * the radius rest at their origins. A stationary cursor = a stationary void.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 600
 */
export default function ParticleText(props: Props) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        text,
        colors,
        mode,
        replay,
        position,
        particleSize,
        particleCount,
        mouseEnabled,
        mouseRadius,
        mouseForce,
        fontSize,
        autoFit,
        transition,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const rafRef = useRef<number | null>(null)
    const pointerRef = useRef({ x: -99999, y: -99999, active: false })
    // Animated formation value 0→1 (0 = at spawn / invisible, 1 = fully formed).
    // Rate-based (not timeline-based) so appear and dissolve can be interrupted
    // mid-way and continue from the CURRENT partial state — the fix for the
    // whole-text snap that happened when reversing restarted the timeline.
    const formValRef = useRef(0)
    const lastFrameRef = useRef<number | null>(null)
    // hidden = draw nothing (particles absent); reverse = ease toward 0 to
    // dissolve out. Driven by the mode triggers below.
    const hiddenRef = useRef(false)
    const reverseRef = useRef(false)
    // Freeze ONLY on true static renders (export / thumbnail). The Framer
    // canvas and Preview run the live rAF loop so particles form and respond
    // to control changes while editing. Gating on useIsStaticRenderer() (true
    // on canvas) is what previously froze it to a single warm-up frame.
    const renderTarget = RenderTarget.current()
    const isStatic =
        renderTarget === RenderTarget.export ||
        renderTarget === RenderTarget.thumbnail

    const colorsKey = Array.isArray(colors) ? colors.join("|") : ""
    // Stable dependency key for the Transition object (new identity each render).
    const transitionKey = JSON.stringify(transition ?? {})

    const mcEnabled = !!mouseEnabled
    const mcRadius = typeof mouseRadius === "number" ? mouseRadius : 150
    const mcForce = typeof mouseForce === "number" ? mouseForce : 6

    useEffect(() => {
        const container = containerRef.current
        const canvas = canvasRef.current
        if (!container || !canvas) return
        const ctx = canvas.getContext("2d", { alpha: true })
        if (!ctx) return

        const palette =
            Array.isArray(colors) && colors.length > 0
                ? colors
                : ["#40ffaa", "#40aaff", "#ff40aa", "#aa40ff"]

        let count = 0
        let ox: Float32Array = new Float32Array(0)
        let oy: Float32Array = new Float32Array(0)
        // Spawn positions (random) — kept so formation can interpolate spawn→origin.
        let sx: Float32Array = new Float32Array(0)
        let sy: Float32Array = new Float32Array(0)
        let px: Float32Array = new Float32Array(0)
        let py: Float32Array = new Float32Array(0)
        // Cursor repulsion offset from home (SVGParticles model).
        let repX: Float32Array = new Float32Array(0)
        let repY: Float32Array = new Float32Array(0)
        let cIdx: Uint8Array = new Uint8Array(0)

        // Mouse-speed + smoothed-position state for the repulsion engine.
        let prevMx = -99999
        let prevMy = -99999
        let mouseSpeed = 0
        let smoothX = -99999
        let smoothY = -99999

        let cssW = 0
        let cssH = 0
        let dpr = 1

        const sampleText = () => {
            const W = cssW
            const H = cssH
            if (W <= 0 || H <= 0) return

            const off = document.createElement("canvas")
            off.width = Math.max(1, Math.floor(W * dpr))
            off.height = Math.max(1, Math.floor(H * dpr))
            const offCtx = off.getContext("2d", { willReadFrequently: true })
            if (!offCtx) return
            offCtx.scale(dpr, dpr)

            const fontFamily =
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

            const maxW = W * 0.92
            const maxH = H * 0.92
            let effectiveSize = Math.max(8, fontSize)
            if (autoFit) {
                effectiveSize = fitFontSize(
                    offCtx,
                    text || "",
                    fontFamily,
                    maxW,
                    maxH,
                    Math.max(8, fontSize)
                )
            }

            // Width/height guard — always shrink so the text can never spill
            // past the canvas edges (where it'd be clipped and sampled cut).
            // Runs whether or not Auto Fit is on, so a large Font Size just
            // scales down to fit instead of losing its outer letters.
            offCtx.font = `700 ${effectiveSize}px ${fontFamily}`
            const gm = offCtx.measureText(text || "")
            const gW = gm.width || 1
            const gH =
                (gm.actualBoundingBoxAscent || effectiveSize * 0.8) +
                (gm.actualBoundingBoxDescent || effectiveSize * 0.2)
            const fitScale = Math.min(1, maxW / gW, maxH / gH)
            if (fitScale < 1)
                effectiveSize = Math.max(8, effectiveSize * fitScale)

            offCtx.clearRect(0, 0, W, H)
            offCtx.fillStyle = "#fff"
            offCtx.font = `700 ${effectiveSize}px ${fontFamily}`
            offCtx.textAlign = "center"
            offCtx.textBaseline = "middle"
            offCtx.fillText(text || "", W / 2, H / 2)

            const img = offCtx.getImageData(
                0,
                0,
                Math.floor(W * dpr),
                Math.floor(H * dpr)
            )
            const data = img.data

            // Particle Count (1–50): higher = denser. Same sampling-gap formula
            // as SVGParticles — gap = 150 / count, independent of particle size.
            const pCount = Math.max(1, Math.min(50, particleCount))
            const stride = Math.max(2, Math.round(150 / pCount))

            let candidates = 0
            for (let y = 0; y < H; y += stride) {
                for (let x = 0; x < W; x += stride) {
                    const ix = Math.floor(x * dpr)
                    const iy = Math.floor(y * dpr)
                    const idx = (iy * img.width + ix) * 4 + 3
                    if (data[idx] > 128) candidates++
                }
            }

            const downsample =
                candidates > 30000 ? Math.ceil(candidates / 30000) : 1
            const allocCount = Math.min(candidates, 30000)

            const newOx = new Float32Array(allocCount)
            const newOy = new Float32Array(allocCount)
            const newSx = new Float32Array(allocCount)
            const newSy = new Float32Array(allocCount)
            const newPx = new Float32Array(allocCount)
            const newPy = new Float32Array(allocCount)
            const newC = new Uint8Array(allocCount)

            let i = 0
            let seen = 0
            for (let y = 0; y < H && i < allocCount; y += stride) {
                for (let x = 0; x < W && i < allocCount; x += stride) {
                    const ix = Math.floor(x * dpr)
                    const iy = Math.floor(y * dpr)
                    const idx = (iy * img.width + ix) * 4 + 3
                    if (data[idx] > 128) {
                        if (seen % downsample === 0) {
                            newOx[i] = x
                            newOy[i] = y
                            // Spawn OUTSIDE the canvas — a random point on a ring
                            // beyond the edges — so particles fly in from outside
                            // and dissolve back out the same way.
                            const ang = Math.random() * Math.PI * 2
                            const rad =
                                Math.max(W, H) * (0.6 + Math.random() * 0.5)
                            const rx = W / 2 + Math.cos(ang) * rad
                            const ry = H / 2 + Math.sin(ang) * rad
                            newSx[i] = rx
                            newSy[i] = ry
                            newPx[i] = rx
                            newPy[i] = ry
                            newC[i] = Math.floor(Math.random() * palette.length)
                            i++
                        }
                        seen++
                    }
                }
            }

            count = i
            ox = newOx
            oy = newOy
            sx = newSx
            sy = newSy
            px = newPx
            py = newPy
            repX = new Float32Array(allocCount)
            repY = new Float32Array(allocCount)
            cIdx = newC
            // Re-sampling = a fresh layout, so replay the formation from spawn.
            formValRef.current = 0
            lastFrameRef.current = null
        }

        const fitFontSize = (
            measureCtx: CanvasRenderingContext2D,
            label: string,
            family: string,
            maxW: number,
            maxH: number,
            cap: number
        ) => {
            if (!label) return cap
            let lo = 8
            let hi = cap
            let best = lo
            for (let iter = 0; iter < 12; iter++) {
                const mid = (lo + hi) / 2
                measureCtx.font = `700 ${mid}px ${family}`
                const m = measureCtx.measureText(label)
                const w = m.width
                const h =
                    (m.actualBoundingBoxAscent || mid * 0.8) +
                    (m.actualBoundingBoxDescent || mid * 0.2)
                if (w <= maxW && h <= maxH) {
                    best = mid
                    lo = mid
                } else {
                    hi = mid
                }
            }
            return Math.max(8, Math.floor(best))
        }

        const resize = () => {
            // Measure the real element box. Bail while it's still 0 — the
            // ResizeObserver fires again once layout settles, so we never lock
            // in a wrong fallback size (which put the text at the wrong scale in
            // the top-left corner). Canvas CSS stays 100%/100% (see JSX); only
            // the backing buffer is sized here, exactly like SVGParticles.
            const rect = container.getBoundingClientRect()
            const w = Math.floor(rect.width)
            const h = Math.floor(rect.height)
            if (w <= 0 || h <= 0) return
            dpr = Math.max(
                1,
                Math.min(
                    2,
                    typeof window !== "undefined"
                        ? window.devicePixelRatio || 1
                        : 1
                )
            )
            cssW = w
            cssH = h
            canvas.width = Math.floor(cssW * dpr)
            canvas.height = Math.floor(cssH * dpr)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            sampleText()
        }

        resize()

        // Mode setup — both modes start hidden and wait for their trigger.
        //  • onHover: form in on pointerenter, dissolve out on leave.
        //  • onEnter: form when the component scrolls into view at Position;
        //    Replay re-forms on every re-entry, otherwise it plays once.
        reverseRef.current = false
        hiddenRef.current = true
        formValRef.current = 0

        // Just flip direction — the value keeps easing from where it is, so an
        // interrupted appear dissolves only the particles that had arrived.
        const formIn = () => {
            reverseRef.current = false
            hiddenRef.current = false
        }
        const formOut = () => {
            reverseRef.current = true
        }

        // onEnter fallback: re-check the anchor against the viewport after each
        // resize + a few settle ticks (assigned in the onEnter branch below).
        // The IntersectionObserver can miss its first callback in the code-preview
        // harness (0-size mount / odd root), which left the canvas blank — these
        // retries guarantee it forms once the element is actually on screen,
        // exactly like PixelateImage always ends up showing its image.
        let tryEnter: (() => void) | null = null
        const enterTimers: ReturnType<typeof setTimeout>[] = []

        // On static targets (export/thumbnail/code preview) there is no rAF
        // loop, so resize() alone leaves the freshly-cleared canvas blank.
        // Redraw the settled frame after each resize so the preview shows the
        // formed text once layout stabilizes.
        const ro = new ResizeObserver(() => {
            resize()
            if (isStatic) staticDraw()
            tryEnter?.()
        })
        ro.observe(container)

        const onMove = (e: PointerEvent) => {
            if (!mcEnabled) return
            const rect = canvas.getBoundingClientRect()
            // Normalize screen px → intrinsic canvas space so any CSS scale
            // (e.g. Framer editor zoom) doesn't shrink the effective radius.
            const scaleX = rect.width > 0 ? cssW / rect.width : 1
            const scaleY = rect.height > 0 ? cssH / rect.height : 1
            const mx = (e.clientX - rect.left) * scaleX
            const my = (e.clientY - rect.top) * scaleY
            // Cursor speed drives the repulsion impulse (SVGParticles model).
            if (prevMx > -9000) {
                const ddx = mx - prevMx
                const ddy = my - prevMy
                mouseSpeed = Math.sqrt(ddx * ddx + ddy * ddy)
            }
            prevMx = mx
            prevMy = my
            pointerRef.current.x = mx
            pointerRef.current.y = my
            pointerRef.current.active = true
        }
        const onLeave = () => {
            pointerRef.current.x = -99999
            pointerRef.current.y = -99999
            pointerRef.current.active = false
            prevMx = -99999
            prevMy = -99999
        }
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("pointercancel", onLeave)

        // ── Mode triggers ────────────────────────────────────────────────────
        let io: IntersectionObserver | null = null
        let sentinel: HTMLDivElement | null = null
        if (mode === "onHover") {
            // Particles appear while hovering the container, dissolve on leave.
            container.addEventListener("pointerenter", formIn)
            container.addEventListener("pointerleave", formOut)
        } else {
            // onEnter: fire when the CHOSEN part of the element scrolls into
            // view — Top edge / Middle / Bottom edge. A fraction-of-element
            // threshold can't express this (and breaks for elements taller than
            // the viewport). Instead drop a 1px sentinel at that anchor line and
            // observe when it becomes visible — exact regardless of size.
            sentinel = document.createElement("div")
            sentinel.style.position = "absolute"
            sentinel.style.left = "0"
            sentinel.style.width = "1px"
            sentinel.style.height = "1px"
            sentinel.style.pointerEvents = "none"
            if (position === "middle") sentinel.style.top = "50%"
            else if (position === "below") sentinel.style.bottom = "0"
            else sentinel.style.top = "0"
            container.appendChild(sentinel)

            let entered = false
            const enter = () => {
                if (entered) return
                entered = true
                formIn()
                if (!replay) io?.disconnect()
            }
            // Direct viewport check for the chosen anchor — used as the resize
            // fallback when the IntersectionObserver's first callback is missed.
            tryEnter = () => {
                if (entered || typeof window === "undefined") return
                const r = container.getBoundingClientRect()
                if (r.width === 0 && r.height === 0) return
                const vh = window.innerHeight || 0
                const vw = window.innerWidth || 0
                const y =
                    position === "middle"
                        ? r.top + r.height / 2
                        : position === "below"
                          ? r.bottom
                          : r.top
                const onScreen =
                    r.right >= 0 && r.left <= vw && r.bottom >= 0 && y <= vh
                if (onScreen) enter()
            }
            io = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        enter()
                    } else if (replay) {
                        // Anchor left view: reset to spawn + re-arm so re-entry
                        // plays the appear fresh from 0, not an instant snap.
                        entered = false
                        hiddenRef.current = true
                        reverseRef.current = false
                        formValRef.current = 0
                    }
                },
                { threshold: 0 }
            )
            io.observe(sentinel)
            // Form immediately if the anchor is already on screen at mount, then
            // retry across a few settle ticks in case layout arrives late.
            tryEnter()
            enterTimers.push(
                setTimeout(() => tryEnter?.(), 60),
                setTimeout(() => tryEnter?.(), 250),
                setTimeout(() => tryEnter?.(), 600)
            )
        }

        const buckets: number[][] = palette.map(() => [])

        // Formation timeline derived from the Transition control.
        const easeFn = resolveEasingFn(transition)
        const formMs = Math.max(0, resolveDuration(transition) * 1000)

        const drawFrame = () => {
            // Canvas stays transparent so whatever sits behind shows through.
            ctx.clearRect(0, 0, cssW, cssH)

            const pr = pointerRef.current
            // Rendered square size, scaled like SVGParticles (~size/4) so the
            // 1–100 range stays sane instead of drawing 100px blocks.
            const drawSize = Math.max(1, particleSize / 4)
            const half = drawSize / 2

            // Ease the formation value toward its target at a rate set by the
            // Transition duration. Because it advances from the CURRENT value,
            // flipping direction mid-way (hover leave, replay exit) dissolves
            // from where it is rather than snapping to the fully-formed text.
            const now =
                typeof performance !== "undefined" ? performance.now() : 0
            const last = lastFrameRef.current ?? now
            // Clamp dt so a backgrounded tab doesn't jump the whole animation.
            const dt = Math.min(64, Math.max(0, now - last))
            lastFrameRef.current = now
            const reverse = reverseRef.current
            const target = reverse ? 0 : 1
            let v = formValRef.current
            if (isStatic || formMs <= 0) {
                v = target
            } else {
                const stepv = dt / formMs
                if (v < target) v = Math.min(target, v + stepv)
                else if (v > target) v = Math.max(target, v - stepv)
            }
            formValRef.current = v
            // Fully dissolved → hide for good.
            if (reverse && v <= 0) hiddenRef.current = true
            // Particles absent — nothing to draw (canvas already cleared).
            if (hiddenRef.current) return
            const forming = v < 1
            // factor 0 = at spawn (outside, invisible), 1 = at text origin
            // (opaque). Drives both position and opacity of the moving field.
            const factor = easeFn(v)

            // Cursor repulsion (SVGParticles "outside" mode). Capture cursor
            // speed before decay, then smooth the cursor position so fast moves
            // carve a continuous channel instead of stamping discrete rings.
            const hitSpeed = mouseSpeed
            mouseSpeed *= 0.88
            const active = !forming && mcEnabled && pr.active
            if (active) {
                const lerpFactor = Math.max(0.08, 0.3 - hitSpeed * 0.006)
                if (smoothX < -9000) {
                    smoothX = pr.x
                    smoothY = pr.y
                } else {
                    smoothX += (pr.x - smoothX) * lerpFactor
                    smoothY += (pr.y - smoothY) * lerpFactor
                }
            } else {
                smoothX = -99999
                smoothY = -99999
            }
            const mx = smoothX
            const my = smoothY
            const repCutoff = Math.max(1, mcRadius)
            const repCutoffSq = repCutoff * repCutoff
            const rF = mcForce

            for (let b = 0; b < buckets.length; b++) buckets[b].length = 0

            for (let i = 0; i < count; i++) {
                const oxi = ox[i]
                const oyi = oy[i]

                if (forming) {
                    // Assemble (or dissolve): interpolate spawn (outside) ↔ text
                    // origin. Opacity rides `factor` (see globalAlpha below).
                    // Cursor is ignored while moving.
                    px[i] = sx[i] + (oxi - sx[i]) * factor
                    py[i] = sy[i] + (oyi - sy[i]) * factor
                    buckets[cIdx[i]].push(i)
                    continue
                }

                // Settled: base position is the text home; the cursor adds a
                // repulsion offset (repX/repY) that eases back to zero when the
                // cursor is away. Identical math to SVGParticles "outside" mode.
                let inZone = false
                if (active) {
                    const dx = oxi - mx
                    const dy = oyi - my
                    const distSq = dx * dx + dy * dy
                    if (distSq > 0 && distSq < repCutoffSq) {
                        const dist = Math.sqrt(distSq)
                        const nx = dx / dist
                        const ny = dy / dist
                        const falloff = 1 - dist / repCutoff
                        const push = falloff * hitSpeed * rF * 0.05
                        repX[i] += nx * push
                        repY[i] += ny * push
                        const targetRepX = nx * (repCutoff - dist)
                        const targetRepY = ny * (repCutoff - dist)
                        repX[i] += (targetRepX - repX[i]) * 0.06
                        repY[i] += (targetRepY - repY[i]) * 0.06
                        inZone = true
                    }
                }
                if (!inZone) {
                    repX[i] *= 0.97
                    repY[i] *= 0.97
                }

                px[i] = oxi + repX[i]
                py[i] = oyi + repY[i]

                buckets[cIdx[i]].push(i)
            }

            // Fade the whole field with the formation: 0→1 opacity on the way
            // in, 1→0 on the way out. Settled particles draw fully opaque.
            ctx.globalAlpha = forming ? Math.min(1, Math.max(0, factor)) : 1
            for (let b = 0; b < buckets.length; b++) {
                const bucket = buckets[b]
                if (bucket.length === 0) continue
                ctx.fillStyle = palette[b]
                for (let k = 0; k < bucket.length; k++) {
                    const i = bucket[k]
                    ctx.fillRect(px[i] - half, py[i] - half, drawSize, drawSize)
                }
            }
            ctx.globalAlpha = 1
        }

        // Snap particles to their text origins and paint one settled frame.
        // Used for static targets and re-run on resize (see ResizeObserver).
        const staticDraw = () => {
            // Static targets always show the settled text, regardless of mode.
            hiddenRef.current = false
            reverseRef.current = false
            for (let i = 0; i < count; i++) {
                px[i] = ox[i]
                py[i] = oy[i]
            }
            drawFrame()
        }

        const removeTriggers = () => {
            container.removeEventListener("pointerenter", formIn)
            container.removeEventListener("pointerleave", formOut)
            io?.disconnect()
            sentinel?.remove()
            enterTimers.forEach(clearTimeout)
        }

        if (isStatic) {
            staticDraw()
            return () => {
                canvas.removeEventListener("pointermove", onMove)
                canvas.removeEventListener("pointerleave", onLeave)
                canvas.removeEventListener("pointercancel", onLeave)
                removeTriggers()
                ro.disconnect()
            }
        }

        const loop = () => {
            drawFrame()
            rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)

        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("pointercancel", onLeave)
            removeTriggers()
            ro.disconnect()
        }
    }, [
        mode,
        replay,
        position,
        text,
        colorsKey,
        particleSize,
        particleCount,
        mcEnabled,
        mcRadius,
        mcForce,
        fontSize,
        autoFit,
        transitionKey,
        isStatic,
    ])

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                // Floor the size so the component doesn't collapse when the
                // preview harness passes no width/height (left the code preview
                // blank). Framer's fixed frame overrides these on the canvas.
                minWidth: 800,
                minHeight: 300,
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
                }}
            />
        </div>
    )
}

type Props = {
    text: string
    colors: string[]
    mode: "onEnter" | "onHover"
    replay: boolean
    position: "above" | "middle" | "below"
    particleSize: number
    particleCount: number
    mouseEnabled: boolean
    mouseRadius: number
    mouseForce: number
    fontSize: number
    autoFit: boolean
    transition: TransitionValue
    style?: React.CSSProperties
}

const COMPONENT_DEFAULTS = {
    text: "PIXEL DRIFT",
    colors: ["#FFFFFF", "#1995FA", "#FFFFFF"],
    mode: "onEnter",
    replay: true,
    position: "above",
    particleSize: 12,
    particleCount: 50,
    mouseEnabled: true,
    mouseRadius: 50,
    mouseForce: 30,
    fontSize: 80,
    autoFit: false,
    transition: { type: "tween", duration: 0, ease: "linear" },
}
