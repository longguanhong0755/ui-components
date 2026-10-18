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

type Direction = "up" | "down" | "left" | "right";

const getOffset = (
  dir: Direction,
  percent: number
): { x: string; y: string } => {
  const clamped = Math.max(0, Math.min(100, percent));
  const fillRatio = clamped / 100;
  const emptyRatio = 1 - fillRatio;

  if (dir === "up") {
    if (clamped === 0) return { x: "0%", y: "calc(100% + 20px)" };
    return { x: "0%", y: `${emptyRatio * 100}%` };
  }
  if (dir === "down") {
    if (clamped === 0) return { x: "0%", y: "calc(-100% - 20px)" };
    return { x: "0%", y: `-${emptyRatio * 100}%` };
  }
  if (dir === "left") {
    if (clamped === 0) return { x: "calc(100% + 20px)", y: "0%" };
    return { x: `${emptyRatio * 100}%`, y: "0%" };
  }
  if (clamped === 0) return { x: "calc(-100% - 20px)", y: "0%" };
  return { x: `-${emptyRatio * 100}%`, y: "0%" };
};

const wavePath = (period: number, amp: number, invert = false): string => {
  const count = Math.round(400 / period);
  const q = period / 4;
  const a = invert ? amp : -amp;
  let d = "M 0 15";
  for (let i = 0; i < count; i++) {
    const x0 = i * period;
    d += ` C ${x0 + q} ${15 + a}, ${x0 + period - q} ${15 - a}, ${
      x0 + period
    } 15`;
  }
  return `${d} V 40 H 0 Z`;
};

const BACK_PATH = wavePath(200, 9, true);
const FRONT_PATH = wavePath(100, 10);

const DEFAULT_TRANSITION: Transition = {
  type: "tween",
  ease: [0.25, 1, 0.5, 1],
  duration: 0.45,
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

type WaterConfig = {
  color?: string;
  textColor?: string;
  direction?: Direction;
  defaultFill?: number;
  waveSpeed?: number;
};

type Colors = {
  fill?: string;
  textColor?: string;
  hoverFill?: string;
  hoverTextColor?: string;
};

type Props = {
  label?: string;
  font?: React.CSSProperties;
  showText?: boolean;
  padding?: string;
  rounded?: number;
  fill?: string;
  textColor?: string;
  colors?: Colors;
  addIcon?: boolean;
  icon?: IconConfig;
  gap?: number;
  border?: React.CSSProperties;
  water?: WaterConfig;
  direction?: Direction;
  waveSpeed?: number;
  defaultFill?: number;
  link?: string;
  transition?: Transition;
  newTab?: boolean;
  style?: React.CSSProperties;
};

function __BaseImpl_SlideFillButton(props: Props) {
  const {
    label = "WATER FILL",
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
    fill: fillProp,
    textColor: textColorProp,
    colors = { fill: "#D9DADB", textColor: "#000000" },
    addIcon = false,
    icon = {
      side: "left",
      size: 45,
      type: "symbol",
      color: "#000000",
      image: "",
      symbol: "\u2192",
      padding: 0,
      rounded: 0,
      hoverColor: "#FFFFFF",
    },
    gap = 12,
    border = {
      borderWidth: 2,
      borderStyle: "solid",
      borderColor: "#2A9DF400",
    },
    water = {
      color: "#0E87CC",
      direction: "up",
      textColor: "#FFFFFF",
      waveSpeed: 50,
      defaultFill: 0,
    },
    direction: directionLegacy,
    waveSpeed: waveSpeedLegacy,
    defaultFill: defaultFillLegacy,
    link = "",
    transition = DEFAULT_TRANSITION,
    newTab = false,
    style,
  } = props;

  const fill = colors?.fill ?? fillProp ?? "#D9DADB";
  const textColor = colors?.textColor ?? textColorProp ?? "#000000";
  const {
    color: waterColor = colors?.hoverFill ?? "#0E87CC",
    textColor: waterTextColor = colors?.hoverTextColor ?? "#FFFFFF",
    direction = directionLegacy ?? "up",
    defaultFill = defaultFillLegacy ?? 0,
    waveSpeed: waveSpeedPctProp,
  } = water;

  const waveSpeedPct = waveSpeedPctProp ?? waveSpeedLegacy ?? 50;
  const waveSpeed =
    5 * (Math.max(0, Math.min(200, Math.round(waveSpeedPct))) / 50);

  const {
    type: iconKind = "symbol",
    symbol: iconSymbol = "\u2192",
    image,
    color: iconColor = "#000000",
    hoverColor: iconHoverColor = "#FFFFFF",
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
  const waterRef = useRef<HTMLDivElement | null>(null);
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const backRef = useRef<SVGSVGElement | null>(null);
  const frontRef = useRef<SVGSVGElement | null>(null);

  const hovered = useRef(false);
  const focused = useRef(false);
  const filled = useRef(false);

  const [box, setBox] = useState({ w: 0, h: 0 });

  const loopsRef = useRef<any[]>([]);

  const restOffset = getOffset(direction, defaultFill);
  const fullOffset = getOffset(direction, 100);

  useEffect(() => {
    const el = scope.current as HTMLElement | null;
    if (!el) return;
    const read = () =>
      setBox((prev) =>
        prev.w === el.clientWidth && prev.h === el.clientHeight
          ? prev
          : { w: el.clientWidth, h: el.clientHeight }
      );
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scope]);

  useEffect(() => {
    const rate = Math.max(0, Math.min(20, Math.round(waveSpeed)));
    if (rate === 0) {
      loopsRef.current = [];
      return;
    }
    const base = 15 / rate;
    const specs: Array<[SVGSVGElement | null, number, string[]]> = [
      [backRef.current, base * 1.35, ["0%", "-50%"]],
      [frontRef.current, base, ["-50%", "0%"]],
    ];
    const controls = specs
      .map(([el, duration, keys]) =>
        el
          ? animate(
              el,
              { x: keys },
              { duration, repeat: Infinity, ease: "linear" }
            )
          : null
      )
      .filter(Boolean);
    loopsRef.current = controls;
    return () => {
      controls.forEach((c: any) => c?.stop());
      loopsRef.current = [];
    };
  }, [animate, waveSpeed]);

  const resetToEmpty = useCallback(() => {
    filled.current = false;
    if (!waterRef.current) return;
    animate(
      waterRef.current,
      { x: restOffset.x, y: restOffset.y },
      { duration: 0 }
    );
    const submerged = defaultFill >= 60;
    if (labelRef.current)
      animate(
        labelRef.current,
        { color: submerged ? waterTextColor : textColor },
        { duration: 0 }
      );
    if (iconRef.current)
      animate(
        iconRef.current,
        { color: submerged ? iconHoverColor : iconColor },
        { duration: 0 }
      );
  }, [
    animate,
    restOffset.x,
    restOffset.y,
    textColor,
    waterTextColor,
    iconColor,
    iconHoverColor,
    defaultFill,
  ]);

  const runFill = useCallback(() => {
    if (waterRef.current) {
      animate(
        waterRef.current,
        { x: fullOffset.x, y: fullOffset.y },
        transition as any
      );
    }
    if (labelRef.current) {
      animate(labelRef.current, { color: waterTextColor }, transition as any);
    }
    if (iconRef.current) {
      animate(iconRef.current, { color: iconHoverColor }, transition as any);
    }
  }, [
    animate,
    transition,
    fullOffset.x,
    fullOffset.y,
    waterTextColor,
    iconHoverColor,
  ]);

  const runDrain = useCallback(() => {
    if (waterRef.current) {
      animate(
        waterRef.current,
        { x: restOffset.x, y: restOffset.y },
        transition as any
      );
    }
    const submerged = defaultFill >= 60;
    if (labelRef.current) {
      animate(
        labelRef.current,
        { color: submerged ? waterTextColor : textColor },
        transition as any
      );
    }
    if (iconRef.current) {
      animate(
        iconRef.current,
        { color: submerged ? iconHoverColor : iconColor },
        transition as any
      );
    }
  }, [
    animate,
    transition,
    restOffset.x,
    restOffset.y,
    textColor,
    waterTextColor,
    iconColor,
    iconHoverColor,
    defaultFill,
  ]);

  useEffect(() => {
    if (hovered.current || focused.current) runFill();
    else resetToEmpty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToEmpty, runFill]);

  const sync = useCallback(() => {
    const want = hovered.current || focused.current;
    if (want === filled.current) return;
    filled.current = want;
    want ? runFill() : runDrain();
  }, [runFill, runDrain]);

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
        // :focus-visible unsupported — fallback
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
      : { type: "button" as const }),
  };

  const CREST = 16;
  const AHEAD = 15;
  const crestFrame: React.CSSProperties =
    direction === "up"
      ? { top: -AHEAD, left: 0, right: 0, height: CREST }
      : direction === "down"
      ? {
          bottom: -AHEAD,
          left: 0,
          right: 0,
          height: CREST,
          transform: "rotate(180deg)",
        }
      : direction === "left"
      ? {
          top: 0,
          left: 0,
          width: box.h,
          height: CREST,
          transformOrigin: "0 0",
          transform: `translate(${-AHEAD}px, ${box.h}px) rotate(-90deg)`,
        }
      : {
          top: 0,
          left: 0,
          width: box.h,
          height: CREST,
          transformOrigin: "0 0",
          transform: `translate(${box.w + AHEAD}px, 0px) rotate(90deg)`,
        };

  const layerStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "200%",
    height: "100%",
  };

  return (
    <Root
      ref={scope}
      {...rootProps}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        position: "relative",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: hasIcon && showText ? gapPx : 0,
        flexDirection: iconSide === "right" ? "row-reverse" : "row",
        minWidth: 80,
        minHeight: 40,
        padding,
        borderRadius: radiusPx,
        border: `${border.borderWidth}px ${border.borderStyle} ${border.borderColor}`,
        background: fill,
        cursor: "pointer",
        textDecoration: "none",
        WebkitTapHighlightColor: "transparent",
        ...fontStyles,
        ...style,
      }}
    >
      <motion.div
        ref={waterRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: waterColor,
          pointerEvents: "none",
          zIndex: 1,
          x: restOffset.x,
          y: restOffset.y,
        }}
      >
        <div
          style={{
            position: "absolute",
            pointerEvents: "none",
            overflow: "visible",
            ...crestFrame,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: "50% 100%",
            }}
          >
            <motion.svg
              ref={backRef}
              viewBox="0 0 400 30"
              preserveAspectRatio="none"
              style={{ ...layerStyle, opacity: 0.45 }}
            >
              <path d={BACK_PATH} fill={waterColor} />
            </motion.svg>

            <motion.svg
              ref={frontRef}
              viewBox="0 0 400 30"
              preserveAspectRatio="none"
              style={layerStyle}
            >
              <path d={FRONT_PATH} fill={waterColor} />
            </motion.svg>

            <div
              style={{
                position: "absolute",
                top: "calc(100% - 2px)",
                left: 0,
                right: 0,
                height: 26,
                background: waterColor,
              }}
            />
          </div>
        </div>
      </motion.div>

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
        <motion.span
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
        </motion.span>
      )}
    </Root>
  );
}

const __presetProps = {
  "showText": true,
  "label": "WATER FILL",
  "font": {
    "fontFamily": "Inter",
    "variant": "Medium",
    "fontWeight": 500,
    "fontSize": 40,
    "lineHeight": "1.5em",
    "letterSpacing": "0em",
    "textAlign": "left"
  },
  "colors": {
    "fill": "#D9DADB",
    "textColor": "#000000"
  },
  "addIcon": false,
  "icon": {
    "side": "left",
    "size": 45,
    "type": "symbol",
    "color": "#000000",
    "image": "",
    "symbol": "→",
    "padding": 0,
    "rounded": 0,
    "hoverColor": "#FFFFFF"
  },
  "gap": 12,
  "rounded": 32,
  "padding": "40px 64px 40px 64px",
  "border": {
    "borderWidth": 2,
    "borderStyle": "solid",
    "borderColor": "#2A9DF400"
  },
  "water": {
    "color": "#0E87CC",
    "direction": "up",
    "textColor": "#FFFFFF",
    "waveSpeed": 50,
    "defaultFill": 0
  },
  "transition": {
    "type": "tween",
    "stiffness": 800,
    "damping": 60,
    "mass": 1,
    "ease": [
      0.25,
      1,
      0.5,
      1
    ],
    "delay": 0,
    "duration": 1
  },
  "link": "",
  "newTab": false
};

export default function SlideFillButton(props: Record<string, unknown>) {
  return <__BaseImpl_SlideFillButton {...(__presetProps as Record<string, unknown>)} {...props} />;
}
