"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
    useEffect,
    useRef,
    useState,
    useCallback,
    type CSSProperties,
} from "react";

type ImageValue = string | { src?: string; srcSet?: string; alt?: string };
interface CarouselItem {
    buttonImage?: ImageValue;
    image?: ImageValue;
    label?: string;
}
interface FontValue {
    fontFamily?: string;
    fontWeight?: number | string;
    fontSize?: number | string;
    fontStyle?: string;
    letterSpacing?: number | string;
    lineHeight?: number | string;
}
const srcOf = (v?: ImageValue): string =>
    typeof v === "string" ? v : v?.src || "";

interface KlarnaCarouselProps {
    items?: CarouselItem[];
    cardRadius?: number;
    imageWidth?: number;
    imageHeight?: number;
    buttonCount?: number;
    buttonSize?: number;
    buttonRadius?: number;
    curve?: number;
    gap?: number;
    labelShow?: boolean;
    labelX?: number;
    labelY?: number;
    labelColor?: string;
    labelFont?: FontValue;
    backgroundColor?: string;
    style?: CSSProperties;
}

const mkItem = ([src, label]: [string, string]): CarouselItem => ({
    image: { src },
    buttonImage: { src },
    label,
});

const DEFAULT_ITEMS: CarouselItem[] = (
    [
        [
            "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8fd4d2a3-a363-4658-d6ee-84790bc8f300/w=800",
            "Sophia Benett",
        ],
        [
            "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4d1fe81d-5289-4e08-b381-03e4e9efed00/w=800",
            "Isabella Foster",
        ],
        [
            "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6ab26fe4-5016-4c65-01e8-b3a71ea08200/w=800",
            "Grace Turner",
        ],
        [
            "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4b1ec233-9a09-4483-1adb-404a93094100/w=800",
            "Olivia Parker",
        ],
        [
            "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/20fd03c3-49d6-408c-3ac9-8c5a6ed2b500/w=800",
            "Lucas Turner",
        ],
        [
            "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800",
            "Emma Collins",
        ],
        [
            "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800",
            "Mia Carter",
        ],
        [
            "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9652cf81-4644-4471-1122-4e40ef6e2600/w=800",
            "Ella Morgan",
        ],
    ] as [string, string][]
).map(mkItem);

function modIdx(i: number, n: number) {
    return ((i % n) + n) % n;
}

function easeCubicInOut(p: number) {
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

function __BaseImpl_KlarnaCarousel(props: KlarnaCarouselProps) {
    const {
        items = DEFAULT_ITEMS,
        cardRadius = 0,
        imageWidth = 300,
        imageHeight = 300,
        buttonCount = 7,
        buttonSize = 40,
        buttonRadius = 20,
        curve = 5,
        gap = 26,
        labelShow = true,
        labelX = 0,
        labelY = 0,
        labelColor = "#ffffff",
        labelFont = {
            fontFamily: "Inter",
            fontWeight: 400,
            fontSize: 26,
            lineHeight: "1.3em",
            letterSpacing: "0em",
        },
        backgroundColor = "#0a0a0a",
    } = props;

    const list = items?.length ? items : DEFAULT_ITEMS;
    const M = list.length;

    const posRef = useRef(0);
    const [posDisplay, setPosDisplay] = useState(0);
    const rafRef = useRef<number | null>(null);
    const animRef = useRef({ startPos: 0, targetPos: 0, startTime: 0 });
    const [dir, setDir] = useState(1);

    const active = modIdx(Math.round(posDisplay), M);

    const half = Math.floor(Math.min(Math.max(1, buttonCount), M) / 2);
    const buffer = half + 1;

    const cardRadiusPx =
        (Math.max(0, Math.min(20, cardRadius)) / 20) *
        (Math.min(imageWidth, imageHeight) / 2);
    const buttonRadiusPx =
        (Math.max(0, Math.min(20, buttonRadius)) / 20) * (buttonSize / 2);
    const t = Math.max(0.0001, Math.min(10, curve) / 10);
    const step = buttonSize + gap;
    const dPsi = ((Math.PI * 2) / M) * t;
    const R = step / (2 * Math.sin(dPsi / 2));
    const baseTop = buttonSize * 0.9;
    const fadeInner = Math.max(0, half - 0.4);
    const fadeEnd = half + 0.6;
    const maxPsi = Math.min(Math.PI, fadeEnd * dPsi);
    const stripHeight =
        baseTop + R * (1 - Math.cos(maxPsi)) + buttonSize / 2 + 16;

    const select = useCallback(
        (itemIdx: number) => {
            const currentActive = modIdx(Math.round(posRef.current), M);
            if (itemIdx === currentActive) return;

            let delta = itemIdx - Math.round(posRef.current);
            delta = ((delta % M) + M) % M;
            if (delta > M / 2) delta -= M;
            setDir(Math.sign(delta));

            if (rafRef.current) cancelAnimationFrame(rafRef.current);

            animRef.current = {
                startPos: posRef.current,
                targetPos: posRef.current + delta,
                startTime: performance.now(),
            };

            const DURATION = 320;
            function tick(now: number) {
                const { startPos, targetPos, startTime } = animRef.current;
                const progress = Math.min(1, (now - startTime) / DURATION);
                posRef.current =
                    startPos + (targetPos - startPos) * easeCubicInOut(progress);
                setPosDisplay(posRef.current);
                if (progress < 1) {
                    rafRef.current = requestAnimationFrame(tick);
                } else {
                    posRef.current = targetPos;
                    setPosDisplay(targetPos);
                    rafRef.current = null;
                }
            }
            rafRef.current = requestAnimationFrame(tick);
        },
        [M]
    );

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const center = Math.round(posDisplay);
    const renderItems: number[] = [];
    const seen = new Set<number>();
    for (let s = -buffer; s <= buffer; s++) {
        const idx = modIdx(center + s, M);
        if (!seen.has(idx)) {
            seen.add(idx);
            renderItems.push(idx);
        }
    }

    function getVisualSlot(itemIdx: number): number {
        let slot = itemIdx - posDisplay;
        slot = slot % M;
        if (slot > M / 2) slot -= M;
        if (slot < -M / 2) slot += M;
        return slot;
    }

    function slotStyle(slot: number) {
        const angle = slot * dPsi;
        const x = R * Math.sin(angle);
        const y = R * (1 - Math.cos(angle));
        const deg = (angle * 180) / Math.PI;
        const absSlot = Math.abs(slot);
        const depth = Math.max(0, 1 - (0.55 * absSlot) / Math.max(1, half));
        const scale = 0.55 + 0.45 * depth;
        const opacity =
            absSlot <= fadeInner
                ? 1
                : absSlot >= fadeEnd
                  ? 0
                  : 1 - (absSlot - fadeInner) / (fadeEnd - fadeInner);
        const zIndex = Math.round(depth * 100) + (absSlot < 0.5 ? 100 : 0);
        return { x, y, deg, scale, opacity, zIndex };
    }

    const imgSweep = 260,
        imgDip = 150;
    const imageVariants = {
        enter: (d: number) => ({
            x: d * imgSweep,
            y: imgDip,
            opacity: 0,
            scale: 0.82,
            rotate: d * 8,
        }),
        center: { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 },
        exit: (d: number) => ({
            x: -d * imgSweep,
            y: imgDip,
            opacity: 0,
            scale: 0.82,
            rotate: -d * 8,
        }),
    };

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
                overflow: "hidden",
                boxSizing: "border-box",
                background: backgroundColor,
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: imageWidth,
                    height: imageHeight,
                    flex: "0 0 auto",
                    borderRadius: cardRadiusPx,
                    overflow: "hidden",
                    background: backgroundColor,
                }}
            >
                <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                    <motion.div
                        key={active}
                        custom={dir}
                        variants={imageVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: backgroundColor,
                        }}
                    >
                        {srcOf(list[active]?.image) && (
                            <img
                                src={srcOf(list[active]?.image)}
                                alt=""
                                draggable={false}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                }}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {labelShow && (
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={`label-${active}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            flex: "0 0 auto",
                            maxWidth: "100%",
                            textAlign: "center",
                            color: labelColor,
                            transform: `translate(${labelX}px, ${labelY}px)`,
                            fontFamily: labelFont?.fontFamily,
                            fontWeight: labelFont?.fontWeight as any,
                            fontSize: labelFont?.fontSize,
                            fontStyle: labelFont?.fontStyle,
                            letterSpacing: labelFont?.letterSpacing,
                            lineHeight: labelFont?.lineHeight,
                        }}
                    >
                        {list[active]?.label ?? ""}
                    </motion.div>
                </AnimatePresence>
            )}

            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: stripHeight,
                    overflow: "hidden",
                    flex: "0 0 auto",
                }}
            >
                {renderItems.map((itemIdx) => {
                    const slot = getVisualSlot(itemIdx);
                    const { x, y, deg, scale, opacity, zIndex } =
                        slotStyle(slot);
                    const isActive = itemIdx === active;
                    const item = list[itemIdx];

                    return (
                        <div
                            key={itemIdx}
                            style={{
                                position: "absolute",
                                left: "50%",
                                top: baseTop,
                                marginLeft: -buttonSize / 2,
                                marginTop: -buttonSize / 2,
                                width: buttonSize,
                                height: buttonSize,
                                transform: `translate(${x}px, ${y}px) rotate(${deg}deg) scale(${scale})`,
                                transformOrigin: "center",
                                opacity,
                                zIndex,
                                willChange: "transform, opacity",
                            }}
                        >
                            <div
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: buttonRadiusPx,
                                    overflow: "hidden",
                                    position: "relative",
                                    transform: `rotate(${-deg}deg)`,
                                    transformOrigin: "center",
                                    background: isActive
                                        ? "#ffffff"
                                        : "rgba(255,255,255,0.55)",
                                    backdropFilter: isActive
                                        ? undefined
                                        : "blur(6px)",
                                    WebkitBackdropFilter: isActive
                                        ? undefined
                                        : "blur(6px)",
                                    cursor: "pointer",
                                    WebkitTapHighlightColor: "transparent",
                                }}
                                onClick={() => select(itemIdx)}
                            >
                                {srcOf(item?.buttonImage) && (
                                    <img
                                        src={srcOf(item?.buttonImage)}
                                        alt=""
                                        draggable={false}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            display: "block",
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const __presetProps = {
  "gap": 26,
  "curve": 5,
  "items": [
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8fd4d2a3-a363-4658-d6ee-84790bc8f300/w=800"
      },
      "label": "Sophia Benett",
      "buttonImage": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8fd4d2a3-a363-4658-d6ee-84790bc8f300/w=800"
      }
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4d1fe81d-5289-4e08-b381-03e4e9efed00/w=800"
      },
      "label": "Isabella Foster",
      "buttonImage": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4d1fe81d-5289-4e08-b381-03e4e9efed00/w=800"
      }
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6ab26fe4-5016-4c65-01e8-b3a71ea08200/w=800"
      },
      "label": "Grace Turner",
      "buttonImage": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6ab26fe4-5016-4c65-01e8-b3a71ea08200/w=800"
      }
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4b1ec233-9a09-4483-1adb-404a93094100/w=800"
      },
      "label": "Olivia Parker",
      "buttonImage": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4b1ec233-9a09-4483-1adb-404a93094100/w=800"
      }
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/20fd03c3-49d6-408c-3ac9-8c5a6ed2b500/w=800"
      },
      "label": "Lucas Turner",
      "buttonImage": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/20fd03c3-49d6-408c-3ac9-8c5a6ed2b500/w=800"
      }
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800"
      },
      "label": "Emma Collins",
      "buttonImage": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800"
      }
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800"
      },
      "label": "Mia Carter",
      "buttonImage": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800"
      }
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9652cf81-4644-4471-1122-4e40ef6e2600/w=800"
      },
      "label": "Ella Morgan",
      "buttonImage": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9652cf81-4644-4471-1122-4e40ef6e2600/w=800"
      }
    }
  ],
  "labelX": 0,
  "labelY": 0,
  "labelFont": {
    "variant": "Regular",
    "fontSize": 26,
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 400,
    "lineHeight": "1.3em",
    "letterSpacing": "0em"
  },
  "labelShow": true,
  "buttonSize": 40,
  "cardRadius": 0,
  "imageWidth": 250,
  "labelColor": "#ffffff",
  "buttonCount": 7,
  "imageHeight": 250,
  "buttonRadius": 20,
  "backgroundColor": "rgba(255, 255, 255, 0)"
};

export default function KlarnaCarousel(props: Record<string, unknown>) {
  return <__BaseImpl_KlarnaCarousel {...(__presetProps as Record<string, unknown>)} {...props} />;
}
