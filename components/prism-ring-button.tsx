"use client";

import * as React from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion, useAnimate, type Transition } from "framer-motion";

const radiusFromPercent = (w: number, h: number, pct: number) =>
  (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100);

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const RAINBOW = [
  "#ff2d55",
  "#ff9500",
  "#ffe600",
  "#34c759",
  "#32ade6",
  "#5856d6",
  "#af52de",
];

const DEG_PER_UNIT = 36;

const GLOW_BLUR_REST = 22;
const GLOW_BLUR_HOVER = 40;

const ARC = 360;

const MAX_STROKE_WIDTH = 30;

const BAND_MASK: React.CSSProperties = {
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

const DEFAULT_TRANSITION: Transition = {
  type: "tween",
  ease: [0.44, 0, 0.56, 1],
  duration: 0.4,
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
  font?: React.CSSProperties;
  showText?: boolean;
  padding?: string;
  rounded?: number;
  addIcon?: boolean;
  icon?: IconConfig;
  gap?: number;
  stroke?: {
    colors?: string[];
    strokeWidth?: number;
  };
  speed?: number;
  hoverScale?: number;
  link?: string;
  transition?: Transition;
  newTab?: boolean;
  style?: React.CSSProperties;
};

function __BaseImpl_PrismRingButton(props: Props) {
  const {
    label = "PRISM BUTTON",
    font = {
      fontFamily: "Inter",
      fontWeight: 500,
      fontSize: 40,
      lineHeight: "1.5em",
      letterSpacing: "0em",
      textAlign: "left",
    },
    showText = true,
    padding = "40px 64px 40px 64px",
    rounded = 32,
    colors = {
      fill: "#0D0D0D",
      hoverFill: "#000000B3",
      textColor: "#FFFFFF",
      hoverTextColor: "#EDE9FF",
    },
    addIcon = false,
    icon = {
      side: "left",
      size: 43,
      type: "symbol",
      color: "#FFFFFF",
      image: "",
      symbol: "\u2192",
      padding: 0,
      rounded: 0,
      hoverColor: "#EDE9FF",
    },
    gap = 12,
    stroke = { colors: RAINBOW, strokeWidth: 1 },
    speed: speedPct = 50,
    hoverScale = 103,
    link = "",
    transition = DEFAULT_TRANSITION,
    newTab = true,
    style,
  } = props;

  const speed = 10 * (Math.max(0, Math.min(100, Math.round(speedPct))) / 50);

  const fill = colors?.fill ?? "#0D0D0D";
  const textColor = colors?.textColor ?? "#FFFFFF";
  const hoverFill = colors?.hoverFill ?? "#171717";
  const hoverTextColor = colors?.hoverTextColor ?? "#EDE9FF";

  const strokeColors = stroke?.colors ?? RAINBOW;
  const strokeWidth = Math.max(
    0,
    Math.min(MAX_STROKE_WIDTH, stroke?.strokeWidth ?? 1)
  );

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
  const [side, setSide] = useState(0);

  const restRef = useRef<HTMLDivElement | null>(null);
  const fullRef = useRef<HTMLDivElement | null>(null);
  const glowSpinRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const pillRef = useRef<HTMLElement | null>(null);

  const hovered = useRef(false);
  const focused = useRef(false);
  const lit = useRef(false);

  const hoverScaleRef = useRef(1);
  hoverScaleRef.current = Math.max(50, Math.min(150, hoverScale)) / 100;

  const speedRef = useRef(0);
  useEffect(() => {
    speedRef.current = Math.max(0, speed) * DEG_PER_UNIT;
  }, [speed]);

  useEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const measure = () =>
      setSide(Math.ceil(Math.hypot(el.offsetWidth, el.offsetHeight) * 1.02));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let angle = 0;
    const tick = (t: number) => {
      if (!last) last = t;
      angle = (angle + (speedRef.current * (t - last)) / 1000) % 360;
      last = t;
      const tr = `rotate(${angle}deg)`;
      if (restRef.current) restRef.current.style.transform = tr;
      if (fullRef.current) fullRef.current.style.transform = tr;
      if (glowSpinRef.current) glowSpinRef.current.style.transform = tr;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const {
    type: iconKind = "symbol",
    symbol: iconSymbol = "\u2192",
    image,
    color: iconColor = "#FFFFFF",
    hoverColor: iconHoverColor = "#EDE9FF",
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

  const paint = useCallback(
    (want: boolean, instant: boolean) => {
      const t: any = instant ? { duration: 0 } : transition;
      if (pillRef.current)
        animate(
          pillRef.current as any,
          {
            scale: want ? hoverScaleRef.current : 1,
          } as any,
          t
        );
      if (glowRef.current)
        animate(
          glowRef.current,
          {
            filter: `blur(${want ? GLOW_BLUR_HOVER : GLOW_BLUR_REST}px)`,
          } as any,
          t
        );
      if (pillRef.current)
        animate(
          pillRef.current as any,
          { backgroundColor: want ? hoverFill : fill } as any,
          t
        );
      if (labelRef.current)
        animate(
          labelRef.current,
          { color: want ? hoverTextColor : textColor } as any,
          t
        );
      if (iconRef.current)
        animate(
          iconRef.current,
          { color: want ? iconHoverColor : iconColor } as any,
          t
        );
      if (restRef.current)
        animate(restRef.current, { opacity: want ? 0 : 1 } as any, t);
      if (fullRef.current)
        animate(fullRef.current, { opacity: want ? 1 : 0 } as any, t);
    },
    [
      animate,
      transition,
      fill,
      hoverFill,
      textColor,
      hoverTextColor,
      iconColor,
      iconHoverColor,
    ]
  );

  const sync = useCallback(() => {
    const want = hovered.current || focused.current;
    if (want === lit.current) return;
    lit.current = want;
    paint(want, false);
  }, [paint]);

  useEffect(() => {
    paint(lit.current, true);
  }, [paint, strokeColors, strokeWidth, hoverScale]);

  const onPointerEnter = useCallback(() => {
    hovered.current = true;
    sync();
  }, [sync]);

  const onPointerLeave = useCallback(() => {
    hovered.current = false;
    sync();
  }, [sync]);

  const onFocus = useCallback(
    (e: React.FocusEvent<HTMLElement>) => {
      let visible = true;
      try {
        visible = e.currentTarget.matches(":focus-visible");
      } catch {
        // :focus-visible unsupported — treat it as a real focus
      }
      if (!visible) return;
      focused.current = true;
      sync();
    },
    [sync]
  );

  const onBlur = useCallback(() => {
    focused.current = false;
    sync();
  }, [sync]);

  const stops = strokeColors && strokeColors.length ? strokeColors : RAINBOW;
  const n = stops.length;

  const fullConic = `conic-gradient(from 0deg, ${[...stops, stops[0]].join(", ")})`;
  const restStops =
    n === 1
      ? `${stops[0]} 0deg, ${stops[0]} ${ARC}deg`
      : stops
          .map((c, i) => `${c} ${((ARC * i) / (n - 1)).toFixed(2)}deg`)
          .join(", ");
  const restConic = `conic-gradient(from 0deg, ${restStops})`;

  const fontStyles = (font ?? {}) as React.CSSProperties;
  const isLink = typeof link === "string" && link.length > 0;
  const Root: any = isLink ? motion.a : motion.button;
  const rootProps = {
    "aria-label": showText ? undefined : label || undefined,
    ...(isLink
      ? {
          href: link,
          target: newTab ? "_blank" : undefined,
          rel: newTab ? "noopener noreferrer" : undefined,
        }
      : { type: "button" }),
  };

  const spin: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: side,
    height: side,
    marginTop: -side / 2,
    marginLeft: -side / 2,
  };

  const bloomRoom = Math.max(GLOW_BLUR_REST, GLOW_BLUR_HOVER);

  return (
    <div
      ref={scope}
      style={{
        position: "relative",
        display: "inline-flex",
        boxSizing: "border-box",
        padding: bloomRoom,
        ...style,
      }}
    >
      <div
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        style={{ display: "inline-flex", position: "relative" }}
      >
        <Root
          ref={pillRef}
          {...rootProps}
          onFocus={onFocus}
          onBlur={onBlur}
          style={{
            position: "relative",
            zIndex: 1,
            boxSizing: "border-box",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: hasIcon && showText ? gapPx : 0,
            flexDirection: iconSide === "right" ? "row-reverse" : "row",
            minWidth: 80,
            minHeight: 40,
            padding,
            borderRadius: radiusPx,
            border: "none",
            backgroundColor: fill,
            cursor: "pointer",
            textDecoration: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <div
            ref={glowRef}
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              pointerEvents: "none",
              filter: `blur(${GLOW_BLUR_REST}px)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                boxSizing: "border-box",
                padding: strokeWidth,
                borderRadius: radiusPx,
                ...BAND_MASK,
              }}
            >
              <div
                ref={glowSpinRef}
                style={{ ...spin, background: fullConic }}
              />
            </div>
          </div>

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              boxSizing: "border-box",
              padding: strokeWidth,
              borderRadius: radiusPx,
              zIndex: 1,
              pointerEvents: "none",
              ...BAND_MASK,
            }}
          >
            <div
              ref={restRef}
              style={{ ...spin, background: restConic, opacity: 1 }}
            />
            <div
              ref={fullRef}
              style={{ ...spin, background: fullConic, opacity: 0 }}
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
                  zIndex: 2,
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
                  zIndex: 2,
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
              ref={labelRef}
              style={{
                position: "relative",
                zIndex: 2,
                color: textColor,
                whiteSpace: "nowrap",
                ...fontStyles,
              }}
            >
              {label}
            </span>
          )}
        </Root>
      </div>
    </div>
  );
}

const __presetProps = {
  "showText": true,
  "label": "PRISM BUTTON",
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
    "fill": "#0D0D0D",
    "hoverFill": "#000000B3",
    "textColor": "#FFFFFF",
    "hoverTextColor": "#EDE9FF"
  },
  "addIcon": false,
  "icon": {
    "side": "left",
    "size": 43,
    "type": "symbol",
    "color": "#FFFFFF",
    "image": "",
    "symbol": "→",
    "padding": 0,
    "rounded": 0,
    "hoverColor": "#EDE9FF"
  },
  "gap": 12,
  "rounded": 32,
  "padding": "40px 64px 40px 64px",
  "stroke": {
    "colors": [
      "#ff2d55",
      "#ff9500",
      "#ffe600",
      "#34c759",
      "#32ade6",
      "#5856d6",
      "#af52de"
    ],
    "strokeWidth": 1
  },
  "speed": 50,
  "hoverScale": 103,
  "transition": {
    "type": "tween",
    "stiffness": 800,
    "damping": 60,
    "mass": 1,
    "ease": [
      0.44,
      0,
      0.56,
      1
    ],
    "delay": 0,
    "duration": 0.4
  },
  "link": "",
  "newTab": true
};

export default function PrismRingButton(props: Record<string, unknown>) {
  return <__BaseImpl_PrismRingButton {...(__presetProps as Record<string, unknown>)} {...props} />;
}
