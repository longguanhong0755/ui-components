"use client"

/**
 * Hairline — a one-pixel rule drawn across the middle of the sheet like a measuring scale, with
 * the percentage riding its leading tip and tick marks every ten percent that ink in as they are
 * passed. The count slides from the start of the rule to its end, so it leads at 0% and trails
 * the tip at 100% without ever leaving the scale.
 * Reveal: the scale fades and the sheet parts along the rule — top half up, bottom half down.
 * Usage: pin over the page (Position Fixed, 100% × 100%). Loops on the canvas; in preview/live it
 * plays once, waits for the real page load, reveals, then fades out.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type MutableRefObject } from "react"

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

// ── editorial-kit v1 ──
// Shared by every preloaders/editorial/ component. Canonical copy:
// preloaders/editorial/kit/editorial-kit.v1.ts — edit there, then run
// preloaders/editorial/checks/inject-kit.mjs; kit-sync.mjs enforces it.
//
// Same timeline as preloaders/kit (preloader-kit v1), for DOM scenes instead of a canvas:
//   CANVAS  loops a simulated load (surges and stalls), reveal, a hold, then again.
//   PREVIEW plays once, gated by the real page load, then hides the overlay and calls onComplete.
// A scene is { revealS, reset?, frame(f) }. frame() writes styles straight to nodes the
// component rendered once — nothing re-renders per frame. Raw rAF, not useAnimate: the whole
// scene is a pure function of load progress, which a tween cannot follow, and raw rAF ticks on
// the Framer canvas. At reveal = 1 a scene must leave every pixel of the root transparent, so
// what shows is the live page under the overlay.

type EdPhase = "loading" | "reveal" | "page"
interface EdFrame {
    /** Seconds since this run started. */
    t: number
    dt: number
    /** Load progress 0..1 — simulated on the canvas, held back by the real load in preview. */
    progress: number
    /** Reveal 0..1, 0 until the load completes. */
    reveal: number
    phase: EdPhase
    /** Root size in CSS px (offsetWidth / offsetHeight, so canvas zoom never leaks in). */
    w: number
    h: number
}
interface EdScene {
    revealS: number
    reset?(): void
    frame(f: EdFrame): void
}
interface EdOptions {
    /** Minimum seconds the load phase plays, even when the page is already loaded. */
    minTime: number
    onComplete?: () => void
}
interface FramerFont {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    fontSize?: number | string
    lineHeight?: number | string
    letterSpacing?: number | string
}

const ED_HOLD_S = 1.8
const ED_FADE_S = 0.35
const ED_SERIF = '"Instrument Serif", "Times New Roman", Times, serif'
const ED_SANS = '"Inter", "Helvetica Neue", Arial, sans-serif'

function edRand(seed: number): () => number {
    let a = seed >>> 0
    return function () {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Simulated load: seeded asset chunks landing at uneven times; exactly 1 at loadS. */
function edLoadCurve(seed: number, loadS: number): (t: number) => number {
    const r = edRand(seed)
    const k = Math.min(1, loadS / 4.4)
    const chunks: { size: number; start: number; len: number }[] = []
    let total = 0
    for (let i = 0; i < 7; i++) {
        const size = 0.4 + r() * 1.2
        chunks.push({ size, start: r() * 0.78 * loadS, len: (0.25 + r() * 0.9) * k })
        total += size
    }
    chunks.push({ size: total * 0.12, start: loadS - 0.45 * k, len: 0.45 * k })
    total *= 1.12
    return (t) => {
        if (t >= loadS) return 1
        let p = 0
        for (const c of chunks) {
            const x = Math.min(1, Math.max(0, (t - c.start) / Math.max(1e-3, c.len)))
            p += c.size * x * x * (3 - 2 * x)
        }
        return Math.min(0.999, p / total)
    }
}

/** Real document load, 0..1. Images and fonts pull it up; the window load event finishes it. */
function edRealLoad(): number {
    if (typeof document === "undefined") return 1
    if (document.readyState === "complete") return 1
    const imgs = document.images
    let done = 0
    for (let i = 0; i < imgs.length; i++) if (imgs[i].complete) done++
    const frac = imgs.length ? done / imgs.length : 1
    const fonts = document.fonts && document.fonts.status === "loaded" ? 1 : 0
    return Math.min(0.95, 0.15 + 0.6 * frac + 0.2 * fonts)
}

const edClamp = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)
/** 0..1 across the window [a, b] of x. */
const edSeg = (x: number, a: number, b: number): number => edClamp((x - a) / Math.max(1e-6, b - a))
const edLerp = (a: number, b: number, t: number): number => a + (b - a) * t
const edOutExpo = (x: number): number => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x))
const edOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3)
const edInCubic = (x: number): number => x * x * x
const edInOutCubic = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const edInOutQuart = (x: number): number => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2)
const edPad = (n: number, digits: number): string => String(Math.round(n)).padStart(digits, "0")

/** Framer Font control → inline style. Size is never taken from it: every scene sizes its type off the root. */
function edFont(font: FramerFont | undefined, fallbackFamily: string): CSSProperties {
    const f = font || {}
    return {
        fontFamily: f.fontFamily || fallbackFamily,
        fontWeight: f.fontWeight ?? 400,
        fontStyle: f.fontStyle || "normal",
        letterSpacing: f.letterSpacing ?? "-0.02em",
        lineHeight: f.lineHeight ?? 1,
    }
}

/** Root style every editorial loader shares: the 1200×800 floor BEFORE the instance's own style. */
function edRootStyle(style: CSSProperties | undefined): CSSProperties {
    return {
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 1200,
        minHeight: 800,
        overflow: "hidden",
        // Type is sized in container units (cqw / cqh / cqmin) so it scales with the overlay.
        containerType: "size",
        isolation: "isolate",
        ...style,
    }
}

const useEdLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * Runs one scene for the component's lifetime. The scene and options are read from refs
 * every frame, so the effect never re-runs on a prop change. The first frame is drawn in a
 * layout effect, before the browser paints, so there is never a frame of unstyled structure.
 */
function useEditorialLoader(
    rootRef: MutableRefObject<HTMLDivElement | null>,
    sceneRef: MutableRefObject<EdScene>,
    optsRef: MutableRefObject<EdOptions>
) {
    useEdLayoutEffect(() => {
        const root = rootRef.current
        if (!root) return
        const onCanvas = RenderTarget.current() === RenderTarget.canvas
        const reduced =
            typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        let w = root.offsetWidth
        let h = root.offsetHeight
        let t = 0
        let progress = 0
        let revealAt = -1
        let finished = false
        let loadS = 1
        let curve = edLoadCurve(7, 1)

        const draw = (dt: number) => {
            const revealS = reduced ? 0.4 : sceneRef.current.revealS
            const reveal = revealAt < 0 ? 0 : edClamp((t - revealAt) / revealS)
            const phase: EdPhase = revealAt < 0 ? "loading" : reveal < 1 ? "reveal" : "page"
            try {
                sceneRef.current.frame({ t, dt, progress, reveal, phase, w, h })
            } catch (e) {
                console.error(e)
            }
        }
        const restart = () => {
            loadS = reduced ? 0.6 : Math.max(0.5, optsRef.current.minTime)
            curve = edLoadCurve(7, loadS)
            t = 0
            progress = 0
            revealAt = -1
            const s = sceneRef.current
            s.reset && s.reset()
        }
        restart()
        draw(0)

        const ro = new ResizeObserver(() => {
            w = root.offsetWidth
            h = root.offsetHeight
            if (!finished) draw(0)
        })
        ro.observe(root)

        let raf = 0
        let last = -1
        const tick = (now: number) => {
            const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000)
            last = now
            t += dt
            const revealS = reduced ? 0.4 : sceneRef.current.revealS
            if (revealAt < 0) {
                // The real load only ever holds the simulated curve back, never pushes it on.
                const target = onCanvas ? curve(t) : Math.min(curve(t), edRealLoad())
                progress = target >= 1 ? 1 : Math.min(target, progress + dt * 1.5)
                if (progress >= 1 && t >= loadS) revealAt = t
            }
            draw(dt)
            if (revealAt >= 0 && t - revealAt >= revealS) {
                if (onCanvas) {
                    if (t - revealAt >= revealS + ED_HOLD_S) {
                        restart()
                        draw(0)
                    }
                } else {
                    finished = true
                    root.style.transition = `opacity ${ED_FADE_S}s ease`
                    root.style.opacity = "0"
                    root.style.pointerEvents = "none"
                    window.setTimeout(() => {
                        root.style.visibility = "hidden"
                    }, ED_FADE_S * 1000)
                    optsRef.current.onComplete && optsRef.current.onComplete()
                    return
                }
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
        }
    }, [])
}
// ── /editorial-kit ──

const REVEAL_S = 1.3
const PAPER = "#EEEAE3"
const INK = "#151412"
/** Rule inset from each side, cqw. */
const INSET = 6
const TICKS = 11

interface Props {
    minTime?: number
    font?: FramerFont
    background?: string
    textColor?: string
    onComplete?: () => void
    style?: CSSProperties
}

export default function Hairline(props: Props) {
    const { minTime = 4, font, background = "#000000", textColor = "#FFFFFF", style } = props
    const rootRef = useRef<HTMLDivElement>(null)
    const topRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const scaleRef = useRef<HTMLDivElement>(null)
    const ruleRef = useRef<HTMLDivElement>(null)
    const countRef = useRef<HTMLDivElement>(null)
    const numRef = useRef<HTMLSpanElement>(null)
    const tickRefs = useRef<(HTMLDivElement | null)[]>([])

    const optsRef = useRef<EdOptions>({ minTime })
    optsRef.current = { minTime, onComplete: props.onComplete }
    const sceneRef = useRef<EdScene>({ revealS: REVEAL_S, frame() {} })
    sceneRef.current = {
        revealS: REVEAL_S,
        frame({ t, progress, reveal }) {
            const scale = scaleRef.current
            if (scale) scale.style.opacity = String(edOutCubic(edSeg(t, 0.05, 0.7)) * (1 - edSeg(reveal, 0, 0.18)))
            const rule = ruleRef.current
            if (rule) rule.style.transform = `scaleX(${progress})`
            const count = countRef.current
            if (count) count.style.transform = `translateX(calc(${progress * (100 - 2 * INSET)}cqw - ${progress * 100}%))`
            const num = numRef.current
            const digits = String(Math.round(progress * 100))
            if (num && num.textContent !== digits) num.textContent = digits
            for (let k = 0; k < TICKS; k++) {
                const tick = tickRefs.current[k]
                if (tick) tick.style.opacity = String(0.25 + 0.75 * edSeg(progress, k / (TICKS - 1) - 0.02, k / (TICKS - 1)))
            }
            const part = edInOutQuart(edSeg(reveal, 0.1, 1))
            const top = topRef.current
            if (top) top.style.transform = `translateY(${-100 * part}%)`
            const bottom = bottomRef.current
            if (bottom) bottom.style.transform = `translateY(${100 * part}%)`
        },
    }
    useEditorialLoader(rootRef, sceneRef, optsRef)

    const type = edFont(font, ED_SERIF)
    const small: CSSProperties = { fontFamily: type.fontFamily, fontSize: "max(10px, 1.3cqh)", letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums" }
    const line: CSSProperties = { position: "absolute", left: `${INSET}cqw`, right: `${INSET}cqw`, top: "50%", height: 1, background: textColor }
    return (
        <div ref={rootRef} style={edRootStyle(style)}>
            {/* The halves overlap by 1px so no seam of page shows along the rule while closed. */}
            <div ref={topRef} style={{ position: "absolute", left: 0, right: 0, top: 0, height: "calc(50% + 1px)", background }} />
            <div ref={bottomRef} style={{ position: "absolute", left: 0, right: 0, top: "50%", bottom: 0, background }} />
            <div ref={scaleRef} aria-hidden="true" style={{ position: "absolute", inset: 0, color: textColor, opacity: 0 }}>
                <div style={{ ...line, opacity: 0.18 }} />
                <div ref={ruleRef} style={{ ...line, transformOrigin: "0 50%", transform: "scaleX(0)" }} />
                {Array.from({ length: TICKS }, (_, k) => (
                    <div
                        key={k}
                        ref={(el) => {
                            tickRefs.current[k] = el
                        }}
                        style={{
                            position: "absolute",
                            top: "calc(50% + 0.9cqh)",
                            left: `${INSET + (k * (100 - 2 * INSET)) / (TICKS - 1)}cqw`,
                            transform: "translateX(-50%)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            opacity: 0.25,
                            ...small,
                        }}
                    >
                        <div style={{ width: 1, height: k % 5 === 0 ? "1.8cqh" : "0.9cqh", background: textColor }} />
                        <div style={{ marginTop: "0.9cqh" }}>{k * 10}</div>
                    </div>
                ))}
                <div
                    ref={countRef}
                    style={{
                        position: "absolute",
                        left: `${INSET}cqw`,
                        bottom: "calc(50% + 1.8cqh)",
                        display: "flex",
                        alignItems: "flex-start",
                        whiteSpace: "nowrap",
                        ...type,
                        fontSize: "14cqh",
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    <span ref={numRef} />
                    <span style={{ fontSize: "0.3em", fontStyle: "italic", marginTop: "0.2em", marginLeft: "0.08em" }}>%</span>
                </div>
            </div>
        </div>
    )
}
