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
    motion,
    useAnimate,
    stagger as motionStagger,
    type Transition,
} from "framer-motion";

const radiusFromPercent = (w: number, h: number, pct: number) =>
    (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100);

const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

const TRANSPARENT_SPLIT = `0px 0px 0px rgba(255,0,80,0), 0px 0px 0px rgba(0,220,255,0)`;

const SECONDS_AT_SPEED_1 = 10;

const DEFAULT_TRANSITION: Transition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.3,
};

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

type ScanConfig = {
    color?: string;
    speed?: number;
};

type Colors = {
    fill?: string;
    textColor?: string;
    hoverFill?: string;
    hoverTextColor?: string;
};

const borderWidthOf = (b: any): number => {
    const num = (v: any) => {
        const n = parseFloat(String(v ?? ""));
        return Number.isFinite(n) && n > 0 ? n : 0;
    };
    return Math.max(
        num(b?.borderWidth),
        num(b?.borderTopWidth),
        num(b?.borderRightWidth),
        num(b?.borderBottomWidth),
        num(b?.borderLeftWidth)
    );
};

type Props = {
    label?: string;
    font?: Record<string, any>;
    showText?: boolean;
    padding?: string;
    rounded?: number;
    colors?: Colors;
    addIcon?: boolean;
    icon?: IconConfig;
    gap?: number;
    border?: any;
    glitchIntensity?: number;
    scan?: ScanConfig;
    link?: string;
    transition?: Transition;
    newTab?: boolean;
    style?: React.CSSProperties;
};

const SCAN_BAND = 65;
const SCAN_FROM = "-100%";
const SCAN_TO = `${(100 / SCAN_BAND) * 100}%`;

const IDLE_BRACKET = 8;
const HOVER_BRACKET = 65;

const armFor = (pct: number, w: number, h: number) =>
    ((pct / 100) * Math.min(w, h)) / 2;

const getCornerPaths = (w: number, h: number, r: number, arm: number) => {
    const clampedR = Math.min(r, w / 2, h / 2);
    const strokeOffset = 0.75;
    const R = Math.max(0.01, clampedR - strokeOffset);
    const R_orig = clampedR;

    const availH = Math.max(0, h / 2 - R_orig);
    const availW = Math.max(0, w / 2 - R_orig);
    const armH = Math.min(arm, availH);
    const armW = Math.min(arm, availW);

    const tl = `M ${strokeOffset} ${R_orig + armH} L ${strokeOffset} ${R_orig} A ${R} ${R} 0 0 1 ${R_orig} ${strokeOffset} L ${R_orig + armW} ${strokeOffset}`;

    const tr = `M ${w - R_orig - armW} ${strokeOffset} L ${w - R_orig} ${strokeOffset} A ${R} ${R} 0 0 1 ${w - strokeOffset} ${R_orig} L ${w - strokeOffset} ${R_orig + armH}`;

    const br = `M ${w - strokeOffset} ${h - R_orig - armH} L ${w - strokeOffset} ${h - R_orig} A ${R} ${R} 0 0 1 ${w - R_orig} ${h - strokeOffset} L ${w - R_orig - armW} ${h - strokeOffset}`;

    const bl = `M ${R_orig + armW} ${h - strokeOffset} L ${R_orig} ${h - strokeOffset} A ${R} ${R} 0 0 1 ${strokeOffset} ${h - R_orig} L ${strokeOffset} ${h - R_orig - armH}`;

    return { tl, tr, br, bl };
};

function __BaseImpl_ScanGridButton(props: Props) {
    const {
        label = "SCAN GRID",
        font = {
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: 40,
            lineHeight: "1.5em",
            letterSpacing: "0px",
            textAlign: "left",
        },
        showText = true,
        padding = "40px 64px",
        rounded = 0,
        colors = {
            fill: "#000000",
            hoverFill: "#000000",
            textColor: "#FFFFFF",
            hoverTextColor: "#FFFFFF",
        },
        addIcon = false,
        icon = {
            side: "left",
            size: 42,
            type: "symbol",
            color: "#FFFFFF",
            image: "",
            symbol: "\u2192",
            padding: 0,
            rounded: 0,
            hoverColor: "#FF8400",
        },
        gap = 12,
        border = {
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "rgba(255, 255, 255, 0.3)",
        },
        glitchIntensity = 0,
        scan = {
            color: "#FF5722",
            speed: 50,
        },
        link = "",
        transition = {
            type: "tween",
            stiffness: 800,
            damping: 60,
            mass: 1,
            ease: "easeInOut",
            duration: 0.3,
        },
        newTab = false,
        style,
    } = props;

    const fill = colors?.fill ?? "#000000";
    const textColor = colors?.textColor ?? "#FFFFFF";
    const hoverFill = colors?.hoverFill ?? "#000000";
    const hoverTextColor = colors?.hoverTextColor ?? "#FFFFFF";

    const { color: scanColor = "#FF8400", speed: speedPctProp } = scan;

    const speedPct = speedPctProp ?? 50;
    const speed = 5 * (Math.max(0, Math.min(100, Math.round(speedPct))) / 50);

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
    const iconRef = useRef<HTMLSpanElement>(null);
    const [dim, setDim] = useState({ w: 160, h: 48 });

    useLayoutEffect(() => {
        if (!scope.current) return;
        const updateDim = () => {
            if (scope.current) {
                const w = scope.current.clientWidth;
                const h = scope.current.clientHeight;
                if (w > 0 && h > 0) {
                    setDim({ w, h });
                }
            }
        };
        updateDim();
        const ro = new ResizeObserver(updateDim);
        ro.observe(scope.current);
        return () => ro.disconnect();
    }, [scope]);

    const scanLoopRef = useRef<{ stop: () => void } | null>(null);
    const hovered = useRef(false);

    const bw = borderWidthOf(border);
    const bracketRadius = Math.max(0, radiusPx - bw);

    const initialPaths = useMemo(
        () =>
            getCornerPaths(
                dim.w,
                dim.h,
                bracketRadius,
                armFor(IDLE_BRACKET, dim.w, dim.h)
            ),
        [dim.w, dim.h, bracketRadius]
    );

    const {
        type: iconKind = "symbol",
        symbol: iconSymbol = "\u2192",
        image,
        color: iconColor = "#FFFFFF",
        hoverColor: iconHoverColor = "#FF8400",
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

    const resetToIdle = useCallback(() => {
        if (!scope.current) return;
        scanLoopRef.current?.stop();
        scanLoopRef.current = null;
        animate(
            scope.current,
            { backgroundColor: fill, color: textColor },
            { duration: 0 }
        );
        if (iconRef.current)
            animate(iconRef.current, { color: iconColor }, { duration: 0 });

        const idlePaths = getCornerPaths(
            dim.w,
            dim.h,
            bracketRadius,
            armFor(IDLE_BRACKET, dim.w, dim.h)
        );
        const filter = `drop-shadow(0px 0px 0px ${scanColor})`;
        animate(".bracket-tl", { d: idlePaths.tl, filter }, { duration: 0 });
        animate(".bracket-tr", { d: idlePaths.tr, filter }, { duration: 0 });
        animate(".bracket-br", { d: idlePaths.br, filter }, { duration: 0 });
        animate(".bracket-bl", { d: idlePaths.bl, filter }, { duration: 0 });

        animate(".scanline", { y: SCAN_FROM, opacity: 0 }, { duration: 0 });
        if (showText)
            animate(
                ".char",
                { x: 0, textShadow: TRANSPARENT_SPLIT },
                { duration: 0 }
            );
    }, [
        animate,
        scope,
        fill,
        textColor,
        iconColor,
        scanColor,
        dim.w,
        dim.h,
        bracketRadius,
        showText,
        iconHoverColor,
    ]);

    const runHover = useCallback(() => {
        if (!scope.current) return;
        hovered.current = true;
        animate(
            scope.current,
            { backgroundColor: hoverFill, color: hoverTextColor } as any,
            transition as any
        );
        if (iconRef.current)
            animate(
                iconRef.current,
                { color: iconHoverColor } as any,
                transition as any
            );

        const hoverPaths = getCornerPaths(
            dim.w,
            dim.h,
            bracketRadius,
            armFor(HOVER_BRACKET, dim.w, dim.h)
        );
        const filter = `drop-shadow(0px 0px 4px ${scanColor})`;
        animate(".bracket-tl", { d: hoverPaths.tl, filter } as any, transition as any);
        animate(".bracket-tr", { d: hoverPaths.tr, filter } as any, transition as any);
        animate(".bracket-br", { d: hoverPaths.br, filter } as any, transition as any);
        animate(".bracket-bl", { d: hoverPaths.bl, filter } as any, transition as any);

        scanLoopRef.current?.stop();
        animate(".scanline", { opacity: 1 }, { duration: 0.15 });
        scanLoopRef.current = animate(
            ".scanline",
            { y: [SCAN_FROM, SCAN_TO] },
            {
                duration: SECONDS_AT_SPEED_1 / Math.max(1, speed),
                ease: "linear",
                repeat: Infinity,
            }
        );
        const g = glitchIntensity;
        if (showText)
            animate(
                ".char",
                {
                    x: [0, -g, g, -g, 0],
                    textShadow: [
                        TRANSPARENT_SPLIT,
                        `${g}px 0px 0px rgba(255,0,80,0.75), ${-g}px 0px 0px rgba(0,220,255,0.75)`,
                        `${-g}px 0px 0px rgba(255,0,80,0.75), ${g}px 0px 0px rgba(0,220,255,0.75)`,
                        `${g}px 0px 0px rgba(255,0,80,0.75), ${-g}px 0px 0px rgba(0,220,255,0.75)`,
                        TRANSPARENT_SPLIT,
                    ],
                },
                { duration: 0.32, ease: "easeOut", delay: motionStagger(0.03) }
            );
    }, [
        animate,
        scope,
        hoverFill,
        hoverTextColor,
        iconHoverColor,
        scanColor,
        glitchIntensity,
        speed,
        transition,
        dim.w,
        dim.h,
        bracketRadius,
        showText,
    ]);

    const runLeave = useCallback(() => {
        if (!scope.current) return;
        hovered.current = false;
        animate(
            scope.current,
            { backgroundColor: fill, color: textColor } as any,
            transition as any
        );
        if (iconRef.current)
            animate(
                iconRef.current,
                { color: iconColor } as any,
                transition as any
            );

        const idlePaths2 = getCornerPaths(
            dim.w,
            dim.h,
            bracketRadius,
            armFor(IDLE_BRACKET, dim.w, dim.h)
        );
        const filter = `drop-shadow(0px 0px 0px ${scanColor})`;
        animate(".bracket-tl", { d: idlePaths2.tl, filter } as any, transition as any);
        animate(".bracket-tr", { d: idlePaths2.tr, filter } as any, transition as any);
        animate(".bracket-br", { d: idlePaths2.br, filter } as any, transition as any);
        animate(".bracket-bl", { d: idlePaths2.bl, filter } as any, transition as any);

        const loop = scanLoopRef.current;
        const fade = animate(".scanline", { opacity: 0 }, { duration: 0.2 });
        fade.then(() => loop?.stop());
        if (showText)
            animate(
                ".char",
                { x: 0, textShadow: TRANSPARENT_SPLIT } as any,
                transition as any
            );
    }, [
        animate,
        scope,
        fill,
        textColor,
        iconColor,
        scanColor,
        transition,
        dim.w,
        dim.h,
        bracketRadius,
        showText,
    ]);

    useEffect(() => {
        if (hovered.current) runHover();
        else resetToIdle();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetToIdle, runHover]);

    useEffect(() => () => scanLoopRef.current?.stop(), []);

    const fontStyles = (font ?? {}) as React.CSSProperties;
    const chars = useMemo(() => (label ?? "").split(""), [label]);

    const isLink = typeof link === "string" && link.length > 0;
    const Tag = (isLink ? motion.a : motion.button) as any;
    const linkProps = isLink
        ? {
              href: link,
              target: newTab ? "_blank" : undefined,
              rel: newTab ? "noopener noreferrer" : undefined,
          }
        : { type: "button" };

    return (
        <Tag
            ref={scope}
            {...linkProps}
            aria-label={label}
            style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: hasIcon && showText ? gapPx : 0,
                flexDirection: iconSide === "right" ? "row-reverse" : "row",
                minWidth: 1,
                minHeight: 1,
                padding,
                ...(border ?? {}),
                borderRadius: radiusPx,
                background: fill,
                color: textColor,
                cursor: "pointer",
                overflow: "hidden",
                textDecoration: "none",
                WebkitTapHighlightColor: "transparent",
                ...fontStyles,
                ...style,
            }}
            onMouseEnter={runHover}
            onMouseLeave={runLeave}
        >
            <svg
                aria-hidden="true"
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    overflow: "visible",
                    zIndex: 2,
                }}
                viewBox={`0 0 ${dim.w} ${dim.h}`}
                preserveAspectRatio="none"
            >
                <motion.path
                    className="bracket-tl"
                    d={initialPaths.tl}
                    stroke={scanColor}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
                <motion.path
                    className="bracket-tr"
                    d={initialPaths.tr}
                    stroke={scanColor}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
                <motion.path
                    className="bracket-br"
                    d={initialPaths.br}
                    stroke={scanColor}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
                <motion.path
                    className="bracket-bl"
                    d={initialPaths.bl}
                    stroke={scanColor}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </svg>

            <div
                className="scanline"
                aria-hidden="true"
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: `${SCAN_BAND}%`,
                    opacity: 0,
                    pointerEvents: "none",
                    zIndex: 1,
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: `linear-gradient(180deg, transparent 0%, color-mix(in srgb, ${scanColor} 45%, transparent) 100%)`,
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        bottom: 0,
                        width: "100%",
                        height: 2,
                        background: scanColor,
                        boxShadow: `0px 0px 6px 0px ${scanColor}`,
                    }}
                />
            </div>

            {hasIcon &&
                (iconMode === "image" ? (
                    <img
                        src={iconSrc}
                        alt=""
                        aria-hidden
                        draggable={false}
                        style={{
                            position: "relative",
                            zIndex: 3,
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
                            position: "relative",
                            zIndex: 3,
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

            {showText && (
                <span
                    aria-hidden="true"
                    style={{
                        position: "relative",
                        zIndex: 3,
                        display: "inline-block",
                        whiteSpace: "pre-wrap",
                    }}
                >
                    {chars.map((char, i) => (
                        <motion.span
                            key={i}
                            className="char"
                            style={{ display: "inline-block" }}
                        >
                            {char === " " ? " " : char}
                        </motion.span>
                    ))}
                </span>
            )}
        </Tag>
    );
}

const __presetProps = {
  "showText": true,
  "label": "SCAN GRID",
  "font": {
    "fontFamily": "Inter",
    "variant": "Regular",
    "fontWeight": 500,
    "fontSize": 40,
    "lineHeight": "1.5em",
    "letterSpacing": "0px",
    "textAlign": "left"
  },
  "colors": {
    "fill": "#000000",
    "hoverFill": "#000000",
    "textColor": "#FFFFFF",
    "hoverTextColor": "#FFFFFF"
  },
  "addIcon": false,
  "icon": {
    "side": "left",
    "size": 42,
    "type": "symbol",
    "color": "#FFFFFF",
    "image": "",
    "symbol": "→",
    "padding": 0,
    "rounded": 0,
    "hoverColor": "#FF8400"
  },
  "gap": 12,
  "rounded": 0,
  "padding": "40px 64px",
  "border": {
    "borderWidth": 1,
    "borderStyle": "solid",
    "borderColor": "rgba(255, 255, 255, 0.3)"
  },
  "glitchIntensity": 0,
  "scan": {
    "color": "#FF5722",
    "speed": 50
  },
  "transition": {
    "type": "tween",
    "stiffness": 800,
    "damping": 60,
    "mass": 1,
    "ease": "easeInOut",
    "duration": 0.3
  },
  "link": "",
  "newTab": false
};

export default function ScanGridButton(props: Record<string, unknown>) {
  return <__BaseImpl_ScanGridButton {...(__presetProps as Record<string, unknown>)} {...props} />;
}
