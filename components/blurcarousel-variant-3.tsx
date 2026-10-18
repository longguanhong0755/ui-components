import {
    useState,
    useEffect,
    useCallback,
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
} from "react"
const useIsStaticRenderer = () => false

interface Slide {
    image?: { src?: string; srcSet?: string; alt?: string }
    title?: string
}

type Movement = "horizontal" | "vertical"

interface BlurCarouselProps {
    slides?: Slide[]
    movement?: Movement
    cardWidth?: number
    cardHeight?: number
    radius?: number
    tilt?: number
    blurAmount?: number
    arrowColor?: string
    arrowInactiveColor?: string
    arrowSize?: number
    autoplay?: boolean
    transition?: any
    showTitle?: boolean
    titleFont?: CSSProperties
    titleColor?: string
    titlePosition?: {
        position?: TitleCorner
        paddingLeft?: number
        paddingRight?: number
        paddingTop?: number
        paddingBottom?: number
    }
    style?: CSSProperties
}

type TitleCorner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight"

const DEFAULT_SLIDES: Slide[] = [
    {
        image: {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/316d1761-fd79-4ca9-b8d4-f2bb20521a00/w=800",
        },
        title: "For Sitting\nMetal\nMinimal",
    },
    {
        image: {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/aeaa0756-9647-4f6c-d900-204bd25e4a00/w=800",
        },
        title: "For Living\nConcrete\nForm",
    },
    {
        image: {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/34ce1842-4b7a-4d52-0302-38582c341700/w=800",
        },
        title: "For Working\nSteel\nClean",
    },
    {
        image: {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6d2ad64a-102d-4eab-0efe-31479e34b500/w=800",
        },
        title: "For Resting\nLinen\nQuiet",
    },
]

// Fixed internals (no longer exposed as controls).
const PERSPECTIVE = 1100
const PRESS_SCALE = 0.965
const PRESS_SHIFT = 6
const BLUR_WIDTH = 42
const OVERLAY_DARKEN = 0.35

// Derive a CSS transition (duration + easing) from a Framer Transition value.
function cssTransition(t: any): { dur: number; ease: string } {
    const dur = t && typeof t.duration === "number" ? t.duration : 0.55
    let ease = "cubic-bezier(0.2, 0.8, 0.2, 1)"
    const e = t?.ease
    if (Array.isArray(e) && e.length === 4) {
        ease = `cubic-bezier(${e[0]}, ${e[1]}, ${e[2]}, ${e[3]})`
    } else if (typeof e === "string") {
        const map: Record<string, string> = {
            linear: "linear",
            easeIn: "ease-in",
            easeOut: "ease-out",
            easeInOut: "ease-in-out",
        }
        ease = map[e] || "ease"
    }
    return { dur, ease }
}

/**
 * Blur Carousel
 *
 * Hover an arrow and a soft blur creeps in from that side. Press an arrow and
 * the image does a 3D pressed-tilt toward it; release to advance while the tilt
 * springs back — the frame itself never moves. Movement can run horizontally
 * (left/right arrows) or vertically (top/bottom arrows).
 * Recreated after Vaun Blu's Framer original.
 *
 * @framerIntrinsicWidth 480
 * @framerIntrinsicHeight 500
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
function __BaseImpl_BlurCarousel(props: BlurCarouselProps) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        slides = DEFAULT_SLIDES,
        movement = "horizontal",
        cardWidth = 480,
        cardHeight = 500,
        radius = 8,
        tilt = 9,
        blurAmount = 14,
        arrowColor = "#ffffff",
        arrowInactiveColor = "rgba(255,255,255,0.6)",
        arrowSize = 26,
        autoplay = false,
        transition,
        showTitle = true,
        titleFont,
        titleColor = "#ffffff",
        titlePosition,
        style,
    } = props

    const tp = titlePosition || {}
    const corner: TitleCorner = tp.position || "topLeft"
    const isTop = corner === "topLeft" || corner === "topRight"
    const isRight = corner === "topRight" || corner === "bottomRight"
    const padLeft = tp.paddingLeft ?? 26
    const padRight = tp.paddingRight ?? 26
    const padTop = tp.paddingTop ?? 24
    const padBottom = tp.paddingBottom ?? 24

    const isStatic = useIsStaticRenderer()
    const list = slides && slides.length ? slides : DEFAULT_SLIDES
    const n = list.length
    const vertical = movement === "vertical"

    // Loop is always on.
    const loop = true
    const [index, setIndex] = useState(0)
    const [pressDir, setPressDir] = useState(0) // -1 prev, 0 none, 1 next
    const [hoverSide, setHoverSide] = useState(0)

    useEffect(() => {
        setIndex((i) => Math.max(0, Math.min(n - 1, i)))
    }, [n])

    const go = useCallback(
        (dir: number) => {
            setIndex((i) => {
                if (loop) return (((i + dir) % n) + n) % n
                return Math.max(0, Math.min(n - 1, i + dir))
            })
        },
        [n]
    )

    // Autoplay — the transition's Delay drives the time each slide holds.
    const delay =
        transition && typeof transition.delay === "number"
            ? transition.delay
            : 4
    useEffect(() => {
        if (isStatic || !autoplay || n < 2) return
        const ms = Math.max(0.3, delay) * 1000
        const id = window.setInterval(() => go(1), ms)
        return () => window.clearInterval(id)
    }, [isStatic, autoplay, delay, n, go])

    // Capture the pointer so press/release stay bound to the arrow even as the
    // whole frame tilts out from under the cursor — otherwise at high tilt the
    // release misses and the slide never advances. Clicks are off in autoplay.
    const onArrowDown = (dir: number) => (e: ReactPointerEvent) => {
        if (isStatic || autoplay) return
        e.preventDefault()
        e.currentTarget.setPointerCapture?.(e.pointerId)
        setHoverSide(dir)
        setPressDir(dir)
    }
    const onArrowUp = (dir: number) => (e: ReactPointerEvent) => {
        if (isStatic || autoplay) return
        e.currentTarget.releasePointerCapture?.(e.pointerId)
        go(dir)
        setPressDir(0)
    }
    const onArrowCancel = () => setPressDir(0)
    const onArrowEnter = (dir: number) => () => {
        if (!isStatic && !autoplay) setHoverSide(dir)
    }
    const onArrowLeave = () => {
        // Don't reset pressDir here — the tilt moves the arrow off the cursor,
        // which would fire leave and cancel the press before release.
        if (!isStatic) setHoverSide(0)
    }

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const next = vertical ? "ArrowDown" : "ArrowRight"
            const prev = vertical ? "ArrowUp" : "ArrowLeft"
            if (e.key === next) {
                e.preventDefault()
                go(1)
            } else if (e.key === prev) {
                e.preventDefault()
                go(-1)
            }
        },
        [go, vertical]
    )

    const { dur, ease } = cssTransition(transition)
    const tiltTransition = `transform ${dur}s ${ease}`
    const fadeTransition = `opacity ${dur}s ease`

    // Rounded scale 0–20: boxy at 0, fully rounded (pill on the short axis) at 20.
    const radiusPx =
        (Math.max(0, Math.min(20, radius)) / 20) *
        (Math.min(cardWidth, cardHeight) / 2)

    const rootStyle: CSSProperties = {
        ...(style || {}),
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 200,
        minHeight: 220,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Perspective lives on the parent so the whole frame can tilt as one.
        perspective: `${PERSPECTIVE}px`,
        outline: "none",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
    }

    // The whole container tilts/presses toward the arrow, not just the image.
    const frameStyle: CSSProperties = {
        position: "relative",
        width: cardWidth,
        height: cardHeight,
        borderRadius: radiusPx,
        // clip-path keeps the rounded clip during the 3D tilt; plain
        // overflow:hidden + border-radius drops it mid-transform (corners flash
        // boxy on each new image before settling).
        clipPath: `inset(0 round ${radiusPx}px)`,
        overflow: "hidden",
        background: "#0c0c0c",
        transformStyle: "preserve-3d",
        transformOrigin: "center center",
        transform: vertical
            ? `translateY(${pressDir * PRESS_SHIFT}px) rotateX(${-pressDir * tilt}deg) scale(${pressDir !== 0 ? PRESS_SCALE : 1})`
            : `translateX(${pressDir * PRESS_SHIFT}px) rotateY(${pressDir * tilt}deg) scale(${pressDir !== 0 ? PRESS_SCALE : 1})`,
        transition: tiltTransition,
    }

    const titleStyle = (i: number): CSSProperties => ({
        position: "absolute",
        left: padLeft,
        right: padRight,
        [isTop ? "top" : "bottom"]: isTop ? padTop : padBottom,
        textAlign: isRight ? "right" : "left",
        color: titleColor,
        fontSize: 30,
        fontWeight: 700,
        lineHeight: "1.12em",
        letterSpacing: "-0.01em",
        whiteSpace: "pre-line",
        textShadow: "0 2px 14px rgba(0,0,0,0.35)",
        opacity: i === index ? 1 : 0,
        transition: fadeTransition,
        pointerEvents: "none",
        zIndex: 4,
        ...(titleFont || {}),
    })

    const arrowWrap = (dir: number): CSSProperties => {
        // dir -1 = previous (left / top), dir 1 = next (right / bottom).
        const base: CSSProperties = {
            position: "absolute",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: arrowSize + 18,
            height: arrowSize + 18,
            zIndex: 5,
            cursor: "pointer",
            color: hoverSide === dir ? arrowColor : arrowInactiveColor,
            transition: "color 0.25s ease, transform 0.2s ease",
            touchAction: "none",
        }
        if (vertical) {
            return {
                ...base,
                left: "50%",
                [dir < 0 ? "top" : "bottom"]: 14,
                transform: "translateX(-50%)",
            }
        }
        return {
            ...base,
            top: "50%",
            [dir < 0 ? "left" : "right"]: 14,
            transform: "translateY(-50%)",
        }
    }

    const blurOverlay = (dir: number): CSSProperties => {
        const common: CSSProperties = {
            position: "absolute",
            backdropFilter: `blur(${blurAmount}px)`,
            WebkitBackdropFilter: `blur(${blurAmount}px)`,
            opacity: hoverSide === dir ? 1 : 0,
            transition: "opacity 0.4s ease",
            pointerEvents: "none",
            zIndex: 3,
        }
        if (vertical) {
            const grad =
                dir < 0
                    ? "linear-gradient(to bottom, #000 0%, transparent 100%)"
                    : "linear-gradient(to top, #000 0%, transparent 100%)"
            return {
                ...common,
                left: 0,
                right: 0,
                [dir < 0 ? "top" : "bottom"]: 0,
                height: `${BLUR_WIDTH}%`,
                maskImage: grad,
                WebkitMaskImage: grad,
            }
        }
        const grad =
            dir < 0
                ? "linear-gradient(to right, #000 0%, transparent 100%)"
                : "linear-gradient(to left, #000 0%, transparent 100%)"
        return {
            ...common,
            top: 0,
            bottom: 0,
            [dir < 0 ? "left" : "right"]: 0,
            width: `${BLUR_WIDTH}%`,
            maskImage: grad,
            WebkitMaskImage: grad,
        }
    }

    return (
        <div
            style={rootStyle}
            tabIndex={0}
            role="group"
            aria-roledescription="carousel"
            onKeyDown={isStatic ? undefined : onKeyDown}
        >
            <div style={frameStyle}>
                {/* Image crossfade stack */}
                {list.map((s, i) => (
                    <img
                        key={i}
                        src={s.image?.src || ""}
                        alt={s.image?.alt || s.title || ""}
                        draggable={false}
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            opacity: i === index ? 1 : 0,
                            transition: fadeTransition,
                        }}
                    />
                ))}

                {/* Top gradient for legibility */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: `linear-gradient(180deg, rgba(0,0,0,${OVERLAY_DARKEN}) 0%, rgba(0,0,0,0) 42%)`,
                        pointerEvents: "none",
                    }}
                />

                {/* Title crossfade stack */}
                {showTitle &&
                    list.map((s, i) => (
                        <div key={i} style={titleStyle(i)}>
                            {s.title}
                        </div>
                    ))}

                {/* Edge blur overlays (creep in on arrow hover) */}
                <div style={blurOverlay(-1)} />
                <div style={blurOverlay(1)} />

                {/* Arrows — left/right for horizontal, up/down for vertical */}
                <div
                    role="button"
                    aria-label="Previous slide"
                    style={arrowWrap(-1)}
                    onPointerDown={onArrowDown(-1)}
                    onPointerUp={onArrowUp(-1)}
                    onPointerCancel={onArrowCancel}
                    onPointerEnter={onArrowEnter(-1)}
                    onPointerLeave={onArrowLeave}
                >
                    <svg
                        width={arrowSize}
                        height={arrowSize}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <polyline
                            points={
                                vertical ? "6 15 12 9 18 15" : "15 18 9 12 15 6"
                            }
                        />
                    </svg>
                </div>
                <div
                    role="button"
                    aria-label="Next slide"
                    style={arrowWrap(1)}
                    onPointerDown={onArrowDown(1)}
                    onPointerUp={onArrowUp(1)}
                    onPointerCancel={onArrowCancel}
                    onPointerEnter={onArrowEnter(1)}
                    onPointerLeave={onArrowLeave}
                >
                    <svg
                        width={arrowSize}
                        height={arrowSize}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <polyline
                            points={
                                vertical ? "6 9 12 15 18 9" : "9 18 15 12 9 6"
                            }
                        />
                    </svg>
                </div>
            </div>
        </div>
    )
}

const COMPONENT_DEFAULTS = {
    slides: DEFAULT_SLIDES,
    movement: "vertical",
    cardWidth: 500,
    cardHeight: 500,
    radius: 0,
    tilt: 45,
    blurAmount: 40,
    arrowInactiveColor: "#FFFFFF",
    arrowColor: "#ffffff",
    arrowSize: 40,
    autoplay: false,
    transition: {
        type: "tween",
        duration: 0.2,
        delay: 4,
        ease: "linear",
    },
    showTitle: false,
    titleFont: {
        variant: "Bold",
        fontSize: "30px",
        letterSpacing: "-0.01em",
        lineHeight: "1.12em",
    },
    titleColor: "#ffffff",
    titlePosition: {
        position: "topLeft",
        paddingLeft: 26,
        paddingRight: 26,
        paddingTop: 24,
        paddingBottom: 24,
    },
}

const __presetProps = {
  "slides": [
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/316d1761-fd79-4ca9-b8d4-f2bb20521a00/w=800"
      },
      "title": "For Sitting\nMetal\nMinimal"
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/aeaa0756-9647-4f6c-d900-204bd25e4a00/w=800"
      },
      "title": "For Living\nConcrete\nForm"
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/34ce1842-4b7a-4d52-0302-38582c341700/w=800"
      },
      "title": "For Working\nSteel\nClean"
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6d2ad64a-102d-4eab-0efe-31479e34b500/w=800"
      },
      "title": "For Resting\nLinen\nQuiet"
    }
  ],
  "movement": "horizontal",
  "cardWidth": 512,
  "cardHeight": 312,
  "radius": 0,
  "tilt": 45,
  "blurAmount": 40,
  "arrowInactiveColor": "#FFFFFF",
  "arrowColor": "#ffffff",
  "arrowSize": 30,
  "autoplay": false,
  "transition": {
    "ease": "linear",
    "mass": 1,
    "type": "tween",
    "delay": 4,
    "damping": 60,
    "duration": 0.2,
    "stiffness": 800
  },
  "showTitle": true,
  "titleFont": {
    "variant": "Bold",
    "fontSize": "30px",
    "textAlign": "justify",
    "fontFamily": "Inter",
    "fontWeight": 400,
    "lineHeight": "1.12em",
    "letterSpacing": "-0.01em"
  },
  "titleColor": "#ffffff",
  "titlePosition": {
    "position": "topLeft",
    "paddingTop": 24,
    "paddingLeft": 26,
    "paddingRight": 26,
    "paddingBottom": 24
  }
};

export default function BlurCarousel(props: Record<string, unknown>) {
  return <__BaseImpl_BlurCarousel {...(__presetProps as Record<string, unknown>)} {...props} />;
}
