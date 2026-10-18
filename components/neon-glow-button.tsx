"use client";

import * as React from "react";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    useAnimate,
    useReducedMotion,
    type AnimationPlaybackControls,
    type Transition,
} from "framer-motion";

const radiusFromPercent = (w: number, h: number, pct: number) =>
    (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100);

type BandWidths = { top: number; right: number; bottom: number; left: number };

const MAX_BAND_WIDTH = 30;

const num = (v: any) => {
    const parsed = parseFloat(String(v ?? ""));
    return Number.isFinite(parsed) && parsed > 0
        ? Math.min(parsed, MAX_BAND_WIDTH)
        : 0;
};

const bandWidthsOf = (b: any): BandWidths => {
    const fused = num(b?.borderWidth);
    return {
        top: b?.borderTopWidth !== undefined ? num(b.borderTopWidth) : fused,
        right:
            b?.borderRightWidth !== undefined ? num(b.borderRightWidth) : fused,
        bottom:
            b?.borderBottomWidth !== undefined
                ? num(b.borderBottomWidth)
                : fused,
        left: b?.borderLeftWidth !== undefined ? num(b.borderLeftWidth) : fused,
    };
};

const borderColorOf = (b: any): string => b?.borderColor ?? "transparent";

const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

const DEFAULT_TRANSITION: Transition = {
    type: "tween",
    ease: "easeInOut",
    duration: 2,
};

const FOCUS_DURATION_SCALE = 2;

type RGBA = { r: number; g: number; b: number; a: number };

function parseColor(input: string | undefined, fallback: RGBA): RGBA {
    if (!input) return fallback;
    let c = String(input).trim();

    const token = c.match(/^var\([^,]+,\s*(.+)\)$/i);
    if (token) c = token[1].trim();

    if (c[0] === "#") {
        let h = c.slice(1);
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((ch) => ch + ch)
                .join("");
        if (h.length !== 6 && h.length !== 8) return fallback;
        const n = parseInt(h, 16);
        if (Number.isNaN(n)) return fallback;
        return h.length === 6
            ? { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
            : {
                  r: (n >>> 24) & 255,
                  g: (n >>> 16) & 255,
                  b: (n >>> 8) & 255,
                  a: (n & 255) / 255,
              };
    }

    const fn = c.match(/rgba?\(([^)]+)\)/i);
    if (fn) {
        const p = fn[1]
            .split(/[,\s/]+/)
            .filter(Boolean)
            .map(Number);
        if (p.length >= 3 && p.slice(0, 3).every((v) => !Number.isNaN(v)))
            return {
                r: p[0],
                g: p[1],
                b: p[2],
                a: p.length > 3 && !Number.isNaN(p[3]) ? p[3] : 1,
            };
    }
    return fallback;
}

const css = (c: RGBA, a = c.a) =>
    `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${a})`;

function shade(c: RGBA, t: number): RGBA {
    const target = t >= 0 ? 255 : 0;
    const k = Math.abs(t);
    return {
        r: c.r + (target - c.r) * k,
        g: c.g + (target - c.g) * k,
        b: c.b + (target - c.b) * k,
        a: c.a,
    };
}

type Ring = {
    inset: number;
    blur: number;
    cover: number;
    base: number;
    hover: number;
    focus: number;
    gradient: string;
};

const OUTSIDE_MASK: React.CSSProperties = {
    maskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
    maskClip: "border-box, content-box",
    maskComposite: "exclude",
    WebkitMaskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
    WebkitMaskClip: "border-box, content-box",
    WebkitMaskComposite: "xor",
} as React.CSSProperties;

export type IconConfig = {
    type?: "symbol" | "image";
    symbol?: string;
    image?: string | { src?: string; srcSet?: string; alt?: string };
    color?: string;
    hoverColor?: string;
    size?: number;
    padding?: number;
    rounded?: number;
    side?: "left" | "right";
};

type Colors = {
    fill?: string;
    textColor?: string;
    hoverFill?: string;
    hoverTextColor?: string;
};

type Props = {
    colors?: Colors;
    label?: string;
    font?: Record<string, any>;
    showText?: boolean;
    padding?: string;
    rounded?: number;
    fill?: string;
    textColor?: string;
    addIcon?: boolean;
    icon?: IconConfig;
    gap?: number;
    border?: any;
    glow?: {
        color?: string;
        size?: number;
        blur?: number;
    };
    link?: string;
    transition?: Transition;
    newTab?: boolean;
    style?: React.CSSProperties;
};

function __BaseImpl_NeonGlowButton(props: Props) {
    const {
        label = "RADIANT GLOW",
        font = {
            fontFamily: "Inter",
            variant: "Regular",
            fontWeight: 500,
            fontSize: 40,
            lineHeight: "1.5em",
            letterSpacing: "0em",
            textAlign: "left",
        },
        showText = true,
        padding = "40px 64px 40px 64px",
        rounded = 100,
        fill: fillProp,
        textColor: textColorProp,
        colors = {
            fill: "#000000",
            hoverFill: "#000000",
            textColor: "#FFFFFF",
            hoverTextColor: "#00FFEE",
        },
        addIcon = false,
        icon = {
            side: "left",
            size: 24,
            type: "symbol",
            color: "#FFFFFF",
            image: "",
            symbol: "\u2192",
            padding: 0,
            rounded: 0,
            hoverColor: "#E8D9FF",
        },
        gap = 12,
        border = {
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "#00FFEE",
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 1,
        },
        glow = { blur: 4, size: 5, color: "#00FFEE" },
        link = "",
        transition = DEFAULT_TRANSITION,
        newTab = false,
        style,
    } = props;

    const fill = colors?.fill ?? fillProp ?? "#010201";
    const textColor = colors?.textColor ?? textColorProp ?? "#FFFFFF";
    const hoverFill = colors?.hoverFill ?? "#120A1F";
    const hoverTextColor = colors?.hoverTextColor ?? "#E8D9FF";

    const {
        color: glowColor = "#7A2FD6",
        size: glowSize = 5,
        blur: glowBlur = 4,
    } = glow;

    const [scope, animate] = useAnimate();

    const [radiusBox, setRadiusBox] = useState({ w: 0, h: 0 });
    useIsoLayoutEffect(() => {
        const el = scope.current as HTMLElement | null;
        if (!el) return;
        const read = () =>
            setRadiusBox((prev) =>
                prev.w === el.offsetWidth && prev.h === el.offsetHeight
                    ? prev
                    : { w: el.offsetWidth, h: el.offsetHeight }
            );
        read();
        const ro = new ResizeObserver(read);
        ro.observe(el);
        return () => ro.disconnect();
    }, [scope]);
    const radiusPx = radiusFromPercent(radiusBox.w, radiusBox.h, rounded);
    const pillRef = useRef<HTMLElement | null>(null);
    const labelRef = useRef<HTMLSpanElement | null>(null);
    const iconRef = useRef<HTMLSpanElement | null>(null);
    const ringRefs = useRef<Array<HTMLSpanElement | null>>([]);
    const runningRef = useRef<AnimationPlaybackControls[]>([]);

    const hovered = useRef(false);
    const focused = useRef(false);
    const reducedMotion = useReducedMotion();

    const fontStyles = (font ?? {}) as React.CSSProperties;

    const g1 = parseColor(glowColor, { r: 122, g: 47, b: 214, a: 1 });
    const g2 = shade(g1, 0.35);

    const spread = Math.max(0, Math.floor(glowSize));
    const blurUnit = Math.max(0, Math.floor(glowBlur));

    const rings: Ring[] = useMemo(() => {
        const g1Fade = css(g1, 0);
        const g2Fade = css(g2, 0);
        const g1Full = css(g1, 1);
        const g2Full = css(g2, 1);

        const mid: Ring = {
            inset: Math.round(spread * 0.72),
            blur: blurUnit,
            cover: 1.9,
            base: 82,
            hover: -98,
            focus: 442,
            gradient: `conic-gradient(${g1Fade}, ${css(g1, 0.75)}, ${g1Fade} 10%, ${g2Fade} 50%, ${css(g2, 0.75)}, ${g2Fade} 60%)`,
        };
        return [
            {
                inset: spread,
                blur: blurUnit,
                cover: 3.2,
                base: 60,
                hover: -120,
                focus: 420,
                gradient: `conic-gradient(${g1Fade}, ${g1Full} 5%, ${g1Fade} 38%, ${g2Fade} 50%, ${g2Full} 60%, ${g2Fade} 87%)`,
            },
            mid,
            mid,
            mid,
            {
                inset: Math.round(spread * 0.43),
                blur: Math.max(0, blurUnit - 1),
                cover: 1.9,
                base: 83,
                hover: -97,
                focus: 443,
                gradient: `conic-gradient(${g1Fade} 0%, ${g1Full}, ${g1Fade} 8%, ${g2Fade} 50%, ${g2Full}, ${g2Fade} 58%)`,
            },
            {
                inset: Math.round(spread * 0.21),
                blur: Math.max(0, Math.round(blurUnit * 0.17)),
                cover: 1.9,
                base: 70,
                hover: -110,
                focus: 430,
                gradient: `conic-gradient(${g1Fade}, ${g1Full} 5%, ${g1Fade} 14%, ${g2Fade} 50%, ${g2Full} 60%, ${g2Fade} 64%)`,
            },
        ];
    }, [g1, g2, spread, blurUnit]);

    const [box, setBox] = useState({ w: 0, h: 0 });
    useEffect(() => {
        const el = scope.current as HTMLElement | null;
        if (!el) return;
        const measure = () => setBox({ w: el.offsetWidth, h: el.offsetHeight });
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [scope]);

    const longest = Math.max(box.w, box.h, 1);

    const {
        type: iconKind = "symbol",
        symbol: iconSymbol = "\u2192",
        image,
        color: iconColor = "#FFFFFF",
        hoverColor: iconHoverColor = "#E8D9FF",
        side: iconSide = "left",
        size: iconSize = 24,
        padding: iconPaddingProp = 0,
        rounded: iconRounded = 0,
    } = icon;
    const iconSrc =
        typeof image === "string" ? image : image && image.src ? image.src : "";
    const iconMode = iconKind === "image" && iconSrc ? "image" : "symbol";
    const iconPx = Math.max(1, Math.round(iconSize));
    const iconPadPx = Math.max(0, Math.round(iconPaddingProp));
    const iconRadius = radiusFromPercent(iconPx, iconPx, iconRounded);
    const gapPx = Math.max(0, Math.round(gap));
    const hasIcon = addIcon;

    const band = bandWidthsOf(border);
    const borderPaint = borderColorOf(border);
    const borderStyleName =
        typeof border?.borderStyle === "string" ? border.borderStyle : "solid";

    const syncRings = useCallback(
        (instant: boolean) => {
            runningRef.current.forEach((c) => c.stop());
            runningRef.current = [];

            const isFocus = focused.current;
            const isHover = hovered.current;
            const base = transition as any;
            const t: Transition =
                instant || reducedMotion
                    ? { duration: 0 }
                    : isFocus && typeof base?.duration === "number"
                      ? {
                            ...base,
                            duration: base.duration * FOCUS_DURATION_SCALE,
                        }
                      : transition;

            rings.forEach((ring, i) => {
                const el = ringRefs.current[i];
                if (!el) return;
                const angle = isFocus
                    ? ring.focus
                    : isHover
                      ? ring.hover
                      : ring.base;
                runningRef.current.push(
                    animate(el, { rotate: angle } as any, t as any)
                );
            });
        },
        [animate, rings, transition, reducedMotion]
    );

    const paintColors = useCallback(
        (lit: boolean, instant: boolean) => {
            const t: any =
                instant || reducedMotion ? { duration: 0 } : transition;
            if (pillRef.current)
                animate(
                    pillRef.current as any,
                    { backgroundColor: lit ? hoverFill : fill } as any,
                    t
                );
            if (labelRef.current)
                animate(
                    labelRef.current,
                    { color: lit ? hoverTextColor : textColor } as any,
                    t
                );
            if (iconRef.current)
                animate(
                    iconRef.current,
                    { color: lit ? iconHoverColor : iconColor } as any,
                    t
                );
        },
        [
            animate,
            transition,
            reducedMotion,
            fill,
            hoverFill,
            textColor,
            hoverTextColor,
            iconColor,
            iconHoverColor,
        ]
    );

    useEffect(() => {
        paintColors(hovered.current || focused.current, true);
    }, [paintColors]);

    useEffect(() => {
        if (hovered.current || focused.current) return;
        syncRings(true);
    }, [syncRings]);

    useEffect(() => () => runningRef.current.forEach((c) => c.stop()), []);

    const scaleTo = (s: number) => {
        if (scope.current) animate(scope.current, { scale: s }, { duration: 0.12 });
    };

    const onEnter = () => {
        hovered.current = true;
        syncRings(false);
        paintColors(true, false);
    };
    const onLeave = () => {
        hovered.current = false;
        syncRings(false);
        paintColors(focused.current, false);
        scaleTo(1);
    };

    const onFocus = (e: React.FocusEvent<HTMLElement>) => {
        let visible = true;
        try {
            visible = e.currentTarget.matches(":focus-visible");
        } catch {
            // :focus-visible unsupported — treat it as a real focus
        }
        if (!visible) return;
        focused.current = true;
        syncRings(false);
        paintColors(true, false);
    };
    const onBlur = () => {
        focused.current = false;
        syncRings(false);
        paintColors(hovered.current, false);
    };

    const isLink = typeof link === "string" && link.length > 0;
    const Tag: any = isLink ? "a" : "button";
    const tagProps = {
        "aria-label": showText ? undefined : label || undefined,
        ...(isLink
            ? {
                  href: link,
                  target: newTab ? "_blank" : undefined,
                  rel: newTab ? "noopener noreferrer" : undefined,
              }
            : { type: "button" }),
    };

    return (
        <div
            ref={scope}
            style={{
                minWidth: 80,
                minHeight: 40,
                position: "relative",
                display: "inline-flex",
                boxSizing: "border-box",
                ...style,
            }}
        >
            <div
                aria-hidden
                style={{
                    position: "absolute",
                    top: -spread,
                    right: -spread,
                    bottom: -spread,
                    left: -spread,
                    boxSizing: "border-box",
                    padding: spread,
                    borderRadius: radiusPx + spread,
                    pointerEvents: "none",
                    zIndex: 0,
                    ...OUTSIDE_MASK,
                }}
            >
                {rings.map((ring, i) => {
                    const cover = Math.ceil(longest * ring.cover);
                    const off = spread - ring.inset;
                    return (
                        <span
                            key={i}
                            style={{
                                position: "absolute",
                                top: off,
                                right: off,
                                bottom: off,
                                left: off,
                                borderRadius: radiusPx + ring.inset,
                                overflow: "hidden",
                                filter: `blur(${ring.blur}px)`,
                                pointerEvents: "none",
                            }}
                        >
                            <span
                                ref={(el) => {
                                    ringRefs.current[i] = el;
                                }}
                                style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    display: "block",
                                    width: cover,
                                    height: cover,
                                    marginTop: -cover / 2,
                                    marginLeft: -cover / 2,
                                    background: ring.gradient,
                                }}
                            />
                        </span>
                    );
                })}
            </div>

            <Tag
                {...tagProps}
                ref={pillRef}
                onPointerEnter={onEnter}
                onPointerLeave={onLeave}
                onPointerDown={() => scaleTo(0.97)}
                onPointerUp={() => scaleTo(1)}
                onFocus={onFocus}
                onBlur={onBlur}
                style={{
                    position: "relative",
                    zIndex: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: hasIcon && showText ? gapPx : 0,
                    flexDirection: iconSide === "right" ? "row-reverse" : "row",
                    width: "100%",
                    padding,
                    borderStyle: borderStyleName,
                    borderColor: borderPaint,
                    borderTopWidth: band.top,
                    borderRightWidth: band.right,
                    borderBottomWidth: band.bottom,
                    borderLeftWidth: band.left,
                    outline: "none",
                    borderRadius: radiusPx,
                    backgroundColor: fill,
                    cursor: "pointer",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    boxSizing: "border-box",
                    WebkitTapHighlightColor: "transparent",
                    ...fontStyles,
                    color: textColor,
                }}
            >
                {hasIcon &&
                    (iconMode === "image" ? (
                        <img
                            src={iconSrc}
                            alt=""
                            aria-hidden
                            draggable={false}
                            style={{
                                width: iconPx,
                                height: iconPx,
                                margin: iconPadPx,
                                objectFit: iconRadius > 0 ? "cover" : "contain",
                                borderRadius: Math.min(iconRadius, iconPx / 2),
                                display: "block",
                                flex: "none",
                                pointerEvents: "none",
                            }}
                        />
                    ) : (
                        <span
                            ref={iconRef}
                            aria-hidden
                            style={{
                                fontSize: iconPx,
                                margin: iconPadPx,
                                lineHeight: 1,
                                color: iconColor,
                                flex: "none",
                                pointerEvents: "none",
                            }}
                        >
                            {iconSymbol}
                        </span>
                    ))}
                {showText && <span ref={labelRef}>{label}</span>}
            </Tag>
        </div>
    );
}

const __presetProps = {
  "showText": true,
  "label": "RADIANT GLOW",
  "font": {
    "fontFamily": "Inter",
    "variant": "Regular",
    "fontWeight": 500,
    "fontSize": 40,
    "lineHeight": "1.5em",
    "letterSpacing": "0em",
    "textAlign": "left"
  },
  "colors": {
    "fill": "#000000",
    "hoverFill": "#000000",
    "textColor": "#FFFFFF",
    "hoverTextColor": "#00FFEE"
  },
  "addIcon": false,
  "icon": {
    "side": "left",
    "size": 24,
    "type": "symbol",
    "color": "#FFFFFF",
    "image": "",
    "symbol": "→",
    "padding": 0,
    "rounded": 0,
    "hoverColor": "#E8D9FF"
  },
  "gap": 12,
  "rounded": 100,
  "padding": "40px 64px 40px 64px",
  "border": {
    "borderWidth": 1,
    "borderStyle": "solid",
    "borderColor": "#00FFEE",
    "borderTopWidth": 1,
    "borderLeftWidth": 1,
    "borderRightWidth": 1,
    "borderBottomWidth": 1
  },
  "glow": {
    "blur": 4,
    "size": 5,
    "color": "#00FFEE"
  },
  "transition": {
    "type": "tween",
    "stiffness": 800,
    "damping": 60,
    "mass": 1,
    "ease": "easeInOut",
    "duration": 2
  },
  "link": "",
  "newTab": false
};

export default function NeonGlowButton(props: Record<string, unknown>) {
  return <__BaseImpl_NeonGlowButton {...(__presetProps as Record<string, unknown>)} {...props} />;
}
