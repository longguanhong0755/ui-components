"use client"

import * as React from "react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

type RevealType = "blocks" | "lines"
type Direction = "left" | "right" | "center"
type TriggerLine = "top" | "center" | "bottom"
type Align = "left" | "center" | "right"

const HTML_TAG = "p"
/** Blocks: how much of the sweep is covered at once, in lines. */
const BAND_LINES = 5
const COVER = 42
const STAGGER = 7
const VIEWPORT: TriggerLine = "center"

/** The only place the retired `revealType`/`direction` values are understood. */
const normalizeReveal = (v: unknown): RevealType =>
    v === "lines" ? "lines" : "blocks"
const normalizeDirection = (v: unknown): Direction =>
    v === "right" || v === "rtl"
        ? "right"
        : v === "center"
          ? "center"
          : "left"

/** Framer's Font control value: CSS plus its own `variant` key. */
type FontValue = React.CSSProperties & { variant?: string }

interface HighlightItem {
    text: string
    block?: boolean
    rounded?: number
    textColor?: string
    color?: string
}

interface Props {
    text: string
    font?: FontValue
    align: Align
    textColor: string
    blockColor: string
    revealType: RevealType
    direction: Direction
    rounded: number
    speed: number
    highlight?: HighlightItem[]
    style?: React.CSSProperties
}

/** Resting plate colour of a highlight, mirroring the item control's default. */
const HIGHLIGHT_BLOCK_COLOR = "#5C6FFF"

/** One line's own cover->uncover span, in timeline units. Reference constant. */
const PER_LINE_SPAN = 0.85
/** Reference base duration of the viewport-triggered reveal, before Speed. */
const BASE_DURATION_MS = 2200
const SPEED_DIVISOR = 25
const FRONT_SOFT = 0.45
const BLOCK_BLEED_X = 0.02
const BLOCK_TOP_LIFT = 0.05
const BLOCK_HEIGHT = 1.1
const LINE_PAD_X = 2
const LINE_TOP_LIFT = 0.08
const LINE_HEIGHT = 1.18
const CANVAS_HOLD_MS = 1400

const MIN_WIDTH = 240
const MIN_HEIGHT = 80

const DEFAULT_TEXT =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation."

const DEFAULT_FONT: FontValue = {
    fontSize: "32px",
    variant: "Light",
    letterSpacing: "-0.03em",
    lineHeight: "1.3em",
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Smootherstep — the source's `smoothstep`, which was the quintic one. */
const smootherstep = (t: number): number => {
    const x = clamp01(t)
    return x * x * x * (x * (x * 6 - 15) + 10)
}

const easeOutCubic = (t: number): number => {
    const x = clamp01(t)
    return 1 - Math.pow(1 - x, 3)
}

/** Sub-pixel precision, kept: integer rounding makes the shrink shake. */
const px = (n: number): number =>
    Number.isFinite(n) ? Math.round(n * 1e3) / 1e3 : 0

/** Percent of the MAXIMUM radius — half the short side — so 100 is a pill. */
const radiusPx = (w: number, h: number, pct: number): number =>
    (Math.max(0, Math.min(100, pct)) / 100) * (Math.min(w, h) / 2)

interface WordToken {
    text: string
    /** Hard line breaks that follow this word. */
    breaks: number
}

/** Words plus explicit breaks. The source's `split(" ")` glued "\n" to a word. */
function parseWords(text: string): WordToken[] {
    const out: WordToken[] = []
    const lines = String(text ?? "").split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(/\s+/)
        for (const part of parts) if (part) out.push({ text: part, breaks: 0 })
        if (i < lines.length - 1 && out.length > 0) out[out.length - 1].breaks += 1
    }
    return out
}

interface WordRect {
    x: number
    y: number
    w: number
    /** Top of the visible glyph box, independent of the chosen line-height. */
    yText: number
    /** Height of the visible glyph box (the font size). */
    hText: number
    line: number
}

interface LineRect {
    line: number
    minX: number
    maxX: number
    yText: number
    hText: number
}

interface Measurement {
    rects: WordRect[]
    lines: LineRect[]
    lineCount: number
    /** Guards the measure -> setState -> measure loop. */
    sig: string
}

interface LiveParams {
    revealType: RevealType
    direction: Direction
    bandLines: number
    cover: number
    stagger: number
    speed: number
    viewport: TriggerLine
}

const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect

function __BaseImpl_BlockTextReveal(props: Partial<Props>) {
    const {
        text = "Create meaningful digital experiences where every line unfolds with purpose, clarity, and a touch of motion.",
        font = {"variant":"Bold","fontSize":"60px","textAlign":"left","fontFamily":"Inter","fontWeight":700,"lineHeight":"1.3em","letterSpacing":"-0.03em"},
        align = "left",
        textColor = "#FFFFFF",
        blockColor = "#FFF5F5",
        revealType: revealTypeProp = "lines",
        direction: directionProp = "left",
        rounded = 0,
        speed = 50,
        highlight = [{"text":"Create\n","block":true,"color":"#5C6FFF","rounded":32,"textColor":"#FFFFFF"},{"text":"purpose,","block":true,"color":"#FFFFFF","rounded":32,"textColor":"#000000"},{"text":"New highlight","block":true,"color":"#5C6FFF","rounded":32,"textColor":"#FFFFFF"}],
        style,
    } = props

    const revealType = normalizeReveal(revealTypeProp)
    const direction = normalizeDirection(directionProp)

    const bandLines = BAND_LINES
    const cover = COVER
    const stagger = STAGGER
    const viewport = VIEWPORT

    const isStatic = false
    const isLines = revealType === "lines"
    /** Center needs TWO panels per line: one scaleX can only pin one edge. */
    const splitLines = isLines && direction === "center"

    const hostRef = useRef<HTMLDivElement | null>(null)
    const textRef = useRef<HTMLElement | null>(null)
    const wordElsRef = useRef<(HTMLElement | null)[]>([])
    const strutElsRef = useRef<(HTMLElement | null)[]>([])
    const blockElsRef = useRef<(HTMLElement | null)[]>([])
    const lineBlockElsRef = useRef<(HTMLElement | null)[]>([])
    /** Second half-panel, Center only. */
    const lineBlockBElsRef = useRef<(HTMLElement | null)[]>([])
    const highlightElsRef = useRef<(HTMLElement | null)[]>([])

    const [measurement, setMeasurement] = useState<Measurement | null>(null)

    // Live inputs read inside the animation loop live in refs, never in effect
    // deps — otherwise a colour edit would tear down and restart the drive.
    const measureRef = useRef<Measurement | null>(null)
    measureRef.current = measurement

    const paramsRef = useRef<LiveParams>({
        revealType,
        direction,
        bandLines,
        cover,
        stagger,
        speed,
        viewport,
    })
    paramsRef.current = {
        revealType,
        direction,
        bandLines,
        cover,
        stagger,
        speed,
        viewport,
    }

    // First paint of the static renderer is the FINISHED state, so a thumbnail
    // or export that never receives a frame is still readable text.
    const progressRef = useRef(isStatic ? 1 : 0)

    const words = useMemo(() => parseWords(text), [text])

    // Serialize props that would otherwise change identity every render.
    const fontKey = JSON.stringify(font ?? {})
    const highlightKey = JSON.stringify(highlight ?? [])

    const highlightItems = useMemo<HighlightItem[]>(() => {
        const raw = (highlight ?? []) as HighlightItem[]
        return raw.filter(
            (item) => item && typeof item.text === "string" && item.text.trim()
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [highlightKey])

    /** Word index -> highlight item. Exact token match, as the source had it. */
    const highlightMap = useMemo(() => {
        const map = new Map<number, HighlightItem>()
        if (highlightItems.length === 0 || words.length === 0) return map
        const hay = words.map((w) => w.text)
        for (const item of highlightItems) {
            const tokens = item.text.trim().split(/\s+/).filter(Boolean)
            if (tokens.length === 0) continue
            for (let i = 0; i <= hay.length - tokens.length; i++) {
                let ok = true
                for (let j = 0; j < tokens.length; j++) {
                    if (hay[i + j] !== tokens[j]) {
                        ok = false
                        break
                    }
                }
                if (ok) for (let j = 0; j < tokens.length; j++) map.set(i + j, item)
            }
        }
        return map
    }, [highlightItems, words])

    // Element ref arrays follow the word list, not the render count.
    const wordsKeyRef = useRef<WordToken[] | null>(null)
    if (wordsKeyRef.current !== words) {
        wordsKeyRef.current = words
        wordElsRef.current = []
        strutElsRef.current = []
        blockElsRef.current = []
        highlightElsRef.current = []
        lineBlockElsRef.current = []
        lineBlockBElsRef.current = []
    }

    // ---------------------------------------------------------------------
    // Measurement
    // ---------------------------------------------------------------------

    const measure = () => {
        const host = textRef.current
        if (!host || typeof window === "undefined") return
        const els = wordElsRef.current
        if (els.length === 0) return

        for (let i = 0; i < highlightElsRef.current.length; i++) {
            const el = highlightElsRef.current[i]
            const item = highlightMap.get(i)
            if (!el || !item) continue
            el.style.borderRadius = `${px(
                radiusPx(el.offsetWidth, el.offsetHeight, item.rounded ?? 0)
            )}px`
        }

        const baseCS = window.getComputedStyle(host)
        const rects: WordRect[] = []
        let lineIdx = -1
        let lineBaseline = Number.NaN

        for (let i = 0; i < els.length; i++) {
            const el = els[i]
            if (!el) continue
            const strut = strutElsRef.current[i]
            const baseline = el.offsetTop + (strut ? strut.offsetTop : 0)
            if (!Number.isFinite(lineBaseline) || baseline - lineBaseline > 0.5) {
                lineIdx += 1
                lineBaseline = baseline
            }

            const cs = highlightMap.has(i) ? window.getComputedStyle(el) : baseCS
            const fontSizePx = parseFloat(cs.fontSize)
            const lineHeightPx = parseFloat(cs.lineHeight)
            const safeFont =
                Number.isFinite(fontSizePx) && fontSizePx > 0
                    ? fontSizePx
                    : el.offsetHeight
            const safeLine =
                Number.isFinite(lineHeightPx) && lineHeightPx > 0
                    ? lineHeightPx
                    : el.offsetHeight

            rects.push({
                x: el.offsetLeft,
                y: el.offsetTop,
                w: el.offsetWidth,
                yText: el.offsetTop + Math.max(0, (safeLine - safeFont) / 2),
                hText: safeFont,
                line: Math.max(0, lineIdx),
            })
        }

        if (rects.length === 0) return

        const lineCount = Math.max(1, lineIdx + 1)
        const lines: LineRect[] = []
        for (let li = 0; li < lineCount; li++) {
            let minX = Number.POSITIVE_INFINITY
            let maxX = Number.NEGATIVE_INFINITY
            let top = Number.POSITIVE_INFINITY
            let bottom = Number.NEGATIVE_INFINITY
            let has = false
            for (const r of rects) {
                if (r.line !== li) continue
                has = true
                minX = Math.min(minX, r.x)
                maxX = Math.max(maxX, r.x + r.w)
                top = Math.min(top, r.yText)
                bottom = Math.max(bottom, r.yText + r.hText)
            }
            if (!has || !Number.isFinite(minX) || !Number.isFinite(maxX)) continue
            lines.push({
                line: li,
                minX,
                maxX,
                yText: top,
                hText: Math.max(1, bottom - top),
            })
        }

        const sig = rects
            .map(
                (r) =>
                    `${Math.round(r.x)},${Math.round(r.yText)},${Math.round(
                        r.w
                    )},${Math.round(r.hText)},${r.line}`
            )
            .join("|")
        if (measureRef.current?.sig === sig) return
        setMeasurement({ rects, lines, lineCount, sig })
    }

    const measureFnRef = useRef(measure)
    measureFnRef.current = measure

    useIsomorphicLayoutEffect(() => {
        measureFnRef.current()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [words, align, fontKey, highlightKey, revealType])

    // Rewrap on resize. The source measured once, so every block stayed at its
    // pre-resize x.
    useEffect(() => {
        const el = textRef.current
        if (!el || typeof ResizeObserver === "undefined") return
        let raf = 0
        const observer = new ResizeObserver(() => {
            if (raf) cancelAnimationFrame(raf)
            raf = requestAnimationFrame(() => {
                raf = 0
                measureFnRef.current()
            })
        })
        observer.observe(el)
        return () => {
            observer.disconnect()
            if (raf) cancelAnimationFrame(raf)
        }
    }, [])

    // A webfont that lands after the first measure moves every word.
    useEffect(() => {
        const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } })
            .fonts
        if (!fonts?.ready) return
        let alive = true
        fonts.ready.then(() => {
            if (alive) measureFnRef.current()
        })
        return () => {
            alive = false
        }
    }, [fontKey])

    // ---------------------------------------------------------------------
    // Imperative apply — no state, no re-render, one style write per element
    // ---------------------------------------------------------------------

    const applyProgress = (p: number) => {
        const m = measureRef.current
        const cfg = paramsRef.current
        if (!m) return
        const { rects, lines, lineCount } = m

        if (cfg.revealType === "lines") {
            const delayStep = PER_LINE_SPAN * (Math.max(0, cfg.stagger) / 100)
            const timeline = PER_LINE_SPAN + delayStep * Math.max(0, lineCount - 1)
            const enterEnd = Math.min(0.98, Math.max(0.02, cfg.cover / 100))
            const exitDuration = Math.max(1e-5, 1 - enterEnd)
            const split = cfg.direction === "center"
            const leadFromRight = split || cfg.direction === "right"

            const paint = (
                el: HTMLElement | null,
                origin: string,
                hide: boolean,
                sx: number
            ) => {
                if (!el) return
                if (hide) {
                    el.style.visibility = "hidden"
                    return
                }
                el.style.visibility = "visible"
                el.style.transformOrigin = origin
                el.style.transform = `scaleX(${px(sx)})`
            }

            for (const lr of lines) {
                const a = lineBlockElsRef.current[lr.line]
                const b = lineBlockBElsRef.current[lr.line]
                if (!a) continue
                const local = clamp01(
                    (p * timeline - lr.line * delayStep) /
                        Math.max(1e-4, PER_LINE_SPAN)
                )
                const boxWidth = lr.maxX - lr.minX + LINE_PAD_X * 2
                const panelWidth = split ? boxWidth / 2 : boxWidth
                const entering = local < enterEnd
                const sx = entering
                    ? easeOutCubic(local / Math.max(1e-5, enterEnd))
                    : Math.max(
                          0,
                          1 - easeOutCubic((local - enterEnd) / exitDuration)
                      )
                const hide = panelWidth * sx <= 1
                paint(
                    a,
                    entering === leadFromRight ? "100% 50%" : "0% 50%",
                    hide,
                    sx
                )
                paint(b, entering ? "0% 50%" : "100% 50%", hide, sx)
            }

            for (let i = 0; i < rects.length; i++) {
                const el = wordElsRef.current[i]
                if (!el) continue
                const local = clamp01(
                    (p * timeline - rects[i].line * delayStep) /
                        Math.max(1e-4, PER_LINE_SPAN)
                )
                el.style.opacity = local >= enterEnd ? "1" : "0"
            }
            return
        }

        // Blocks: ONE soft front sweeping a per-word coordinate.
        const band = Math.max(1, Math.min(Math.round(cfg.bandLines), lineCount))
        const soft = Math.max(0.35, band * FRONT_SOFT)
        const front = p * (lineCount + band + soft)
        const dir = cfg.direction

        for (let i = 0; i < rects.length; i++) {
            const r = rects[i]
            const range = lines[r.line]
            let u = 0
            if (range) {
                const span = Math.max(1, range.maxX - range.minX)
                const fx = clamp01((r.x + r.w / 2 - range.minX) / span)
                u =
                    dir === "right"
                        ? 1 - fx
                        : dir === "center"
                          ? Math.abs(fx - 0.5) * 2
                          : fx
            }
            const pos = r.line + u
            const lead = smootherstep((front - pos) / soft)
            const trail = smootherstep((front - band - pos) / soft)

            const blockEl = blockElsRef.current[i]
            if (blockEl) {
                const v = Math.max(0, lead - trail)
                blockEl.style.opacity = String(px(v))
                blockEl.style.transform = `scaleY(${px(0.94 + 0.06 * v)})`
            }

            const el = wordElsRef.current[i]
            if (el) el.style.opacity = String(px(trail))
        }
    }

    const applyRef = useRef(applyProgress)
    applyRef.current = applyProgress

    const setProgress = (p: number) => {
        progressRef.current = p
        applyRef.current(p)
    }
    const setProgressRef = useRef(setProgress)
    setProgressRef.current = setProgress

    // opacity/transform are animated imperatively — not in the style prop, or
    // React would clobber the live value on every render. This re-applies the
    // LIVE progress after every render, before paint.
    useIsomorphicLayoutEffect(() => {
        applyRef.current(progressRef.current)
    })

    /** Duration of one full reveal, in ms. Derived, so Speed is a rate. */
    const durationMs = (): number => {
        const cfg = paramsRef.current
        const factor = Math.max(0.1, cfg.speed / SPEED_DIVISOR)
        const base = BASE_DURATION_MS / factor
        if (cfg.revealType !== "lines") return base
        const lineCount = measureRef.current?.lineCount ?? 1
        const delayStep = PER_LINE_SPAN * (Math.max(0, cfg.stagger) / 100)
        const timeline = PER_LINE_SPAN + delayStep * Math.max(0, lineCount - 1)
        return base * (timeline / PER_LINE_SPAN)
    }
    const durationRef = useRef(durationMs)
    durationRef.current = durationMs

    const lineCount = measurement?.lineCount ?? 1

    // ---------------------------------------------------------------------
    // Drive A — viewport-triggered timer (Blocks, Lines)
    // ---------------------------------------------------------------------
    useEffect(() => {
        if (isStatic) return
        if (typeof window === "undefined") return

        let raf = 0
        let armed = true
        setProgressRef.current(0)

        const play = () => {
            const duration = Math.max(1, durationRef.current())
            const t0 = performance.now()
            const tick = (now: number) => {
                const t = clamp01((now - t0) / duration)
                setProgressRef.current(t)
                if (t < 1) raf = requestAnimationFrame(tick)
                else raf = 0
            }
            raf = requestAnimationFrame(tick)
        }

        const check = () => {
            if (!armed) return
            const el = hostRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            const vh = window.innerHeight || 0
            const triggerY =
                viewport === "top" ? 0 : viewport === "bottom" ? vh : vh / 2
            if (rect.top <= triggerY) {
                armed = false
                window.removeEventListener("scroll", check)
                window.removeEventListener("resize", check)
                play()
            }
        }

        check()
        window.addEventListener("scroll", check, { passive: true })
        window.addEventListener("resize", check)
        return () => {
            armed = false
            window.removeEventListener("scroll", check)
            window.removeEventListener("resize", check)
            if (raf) cancelAnimationFrame(raf)
        }
    }, [isStatic, revealType, viewport, speed, stagger, lineCount])

    // ---------------------------------------------------------------------
    // Render — structure once. Everything animated is written imperatively.
    // ---------------------------------------------------------------------

    const Tag = HTML_TAG as unknown as React.ElementType

    return (
        <div
            ref={hostRef}
            style={{
                minWidth: MIN_WIDTH,
                minHeight: MIN_HEIGHT,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "visible",
                cursor: "default",
                ...style,
            }}
        >
            <Tag
                ref={textRef as React.Ref<HTMLElement>}
                style={{
                    margin: 0,
                    width: "100%",
                    color: textColor,
                    textAlign: align,
                    position: "relative",
                    ...font,
                }}
            >
                {isLines && measurement && (
                    <span
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                            zIndex: 2,
                            overflow: "hidden",
                        }}
                    >
                        {measurement.lines.map((lr) => (
                            <span
                                key={`line-${lr.line}`}
                                style={{
                                    position: "absolute",
                                    left: px(lr.minX - LINE_PAD_X),
                                    top: px(lr.yText - lr.hText * LINE_TOP_LIFT),
                                    width: px(
                                        lr.maxX - lr.minX + LINE_PAD_X * 2
                                    ),
                                    height: px(lr.hText * LINE_HEIGHT),
                                }}
                            >
                                <span
                                    ref={(el) => {
                                        lineBlockElsRef.current[lr.line] = el
                                    }}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        bottom: 0,
                                        left: 0,
                                        width: splitLines
                                            ? "calc(50% + 0.5px)"
                                            : "100%",
                                        background: blockColor,
                                        borderRadius: 0,
                                        transition: "none",
                                        willChange: "transform",
                                        backfaceVisibility: "hidden",
                                    }}
                                />
                                {splitLines && (
                                    <span
                                        ref={(el) => {
                                            lineBlockBElsRef.current[lr.line] =
                                                el
                                        }}
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            bottom: 0,
                                            left: "50%",
                                            right: 0,
                                            background: blockColor,
                                            borderRadius: 0,
                                            transition: "none",
                                            willChange: "transform",
                                            backfaceVisibility: "hidden",
                                        }}
                                    />
                                )}
                            </span>
                        ))}
                    </span>
                )}

                {!isLines && measurement && (
                    <span
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                            zIndex: 2,
                        }}
                    >
                        {measurement.rects.map((r, i) => {
                            const w = r.w * (1 + BLOCK_BLEED_X)
                            const h = r.hText * BLOCK_HEIGHT
                            return (
                                <span
                                    key={`block-${i}`}
                                    ref={(el) => {
                                        blockElsRef.current[i] = el
                                    }}
                                    style={{
                                        position: "absolute",
                                        left: px(r.x - r.w * (BLOCK_BLEED_X / 2)),
                                        top: px(
                                            r.yText - r.hText * BLOCK_TOP_LIFT
                                        ),
                                        width: px(w),
                                        height: px(h),
                                        background: blockColor,
                                        borderRadius: px(radiusPx(w, h, rounded)),
                                        transformOrigin: "50% 50%",
                                        transition: "none",
                                        willChange: "opacity, transform",
                                    }}
                                />
                            )
                        })}
                    </span>
                )}

                {words.map((word, i) => {
                    const item = highlightMap.get(i)
                    const breaks: React.ReactNode[] = []
                    for (let b = 0; b < word.breaks; b++)
                        breaks.push(<br key={`br-${i}-${b}`} />)
                    return (
                        <React.Fragment key={`word-${i}`}>
                            <span
                                ref={(el) => {
                                    wordElsRef.current[i] = el
                                }}
                                style={{
                                    display: "inline-block",
                                    marginRight: "0.25em",
                                    verticalAlign: "baseline",
                                    lineHeight: "inherit",
                                    position: "relative",
                                    zIndex: item ? 4 : 1,
                                    color: item?.textColor ?? textColor,
                                    transition: "none",
                                }}
                            >
                                <span
                                    ref={(el) => {
                                        strutElsRef.current[i] = el
                                    }}
                                    aria-hidden="true"
                                    style={{
                                        display: "inline-block",
                                        width: 0,
                                        height: 0,
                                    }}
                                />
                                {item && (item.block ?? true) && (
                                    <span
                                        aria-hidden="true"
                                        ref={(el) => {
                                            highlightElsRef.current[i] = el
                                        }}
                                        style={{
                                            position: "absolute",
                                            left: "-0.16em",
                                            right: "-0.16em",
                                            top: "-0.06em",
                                            bottom: "-0.06em",
                                            background:
                                                item.color ??
                                                HIGHLIGHT_BLOCK_COLOR,
                                            zIndex: -1,
                                            pointerEvents: "none",
                                        }}
                                    />
                                )}
                                {word.text}
                            </span>
                            {breaks}
                        </React.Fragment>
                    )
                })}
            </Tag>
        </div>
    )
}

BlockTextReveal.displayName = "Block Text Reveal"

const __presetProps = {
  "text": "Create meaningful digital experiences where every line unfolds with purpose, clarity, and a touch of motion.",
  "font": {
    "variant": "Bold",
    "fontSize": "60px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 700,
    "lineHeight": "1.3em",
    "letterSpacing": "-0.03em"
  },
  "align": "left",
  "textColor": "#696969",
  "blockColor": "#696969",
  "revealType": "lines",
  "direction": "left",
  "rounded": 0,
  "speed": 50,
  "highlight": [
    {
      "text": "Create\n",
      "block": true,
      "color": "#5C6FFF",
      "rounded": 32,
      "textColor": "#FFFFFF"
    },
    {
      "text": "purpose,",
      "block": true,
      "color": "#FFFFFF",
      "rounded": 32,
      "textColor": "#000000"
    }
  ]
};

export default function BlockTextReveal(props: Record<string, unknown>) {
  return <__BaseImpl_BlockTextReveal {...(__presetProps as Record<string, unknown>)} {...props} />;
}
