"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { motion, useAnimate, type Transition } from "framer-motion";

const TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"] as const;

interface AuroraTextFont {
  fontFamily?: string;
  fontWeight?: number | string;
  fontSize?: number | string;
  lineHeight?: string | number;
  letterSpacing?: string | number;
  textAlign?: "left" | "right" | "center" | "justify";
}

interface AuroraTextScrollConfig {
  position: "top" | "bottom";
  distance: number;
}

interface AuroraTextProps {
  text?: string;
  font?: AuroraTextFont;
  tag?: (typeof TAGS)[number];
  colors?: string[];
  angle?: number;
  speed?: number;
  direction?: "left" | "right" | "alternate" | "top-to-bottom" | "bottom-to-top";
  transition?: Transition;
  scrollConfig?: AuroraTextScrollConfig;
}

const DEFAULT_FONT: AuroraTextFont = {
  fontFamily: "Inter",
  fontWeight: 700,
  fontSize: 120,
  lineHeight: "1.5em",
  letterSpacing: "0em",
  textAlign: "left",
};

const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 250,
  damping: 20,
  mass: 1,
};

const DEFAULT_SCROLL_CONFIG: AuroraTextScrollConfig = {
  position: "bottom",
  distance: 20,
};

const SPREAD = 200;
const START_OPACITY = 0;
const APPEAR_TRIGGER: "default" | "hover" | "scroll" = "default";

export default function AuroraText(props: AuroraTextProps) {
  const {
    text = "Aurora Text",
    font = DEFAULT_FONT,
    tag = "h1",
    colors = ["#FF0080", "#7928CA", "#0070F3", "#38BDF8"],
    angle = 135,
    speed = 5,
    direction = "alternate",
    transition = DEFAULT_TRANSITION,
    scrollConfig = DEFAULT_SCROLL_CONFIG,
  } = props;

  const [scope, animate] = useAnimate();
  const hoverFiredRef = useRef(false);

  const resetToHidden = useCallback(() => {
    if (!scope.current) return;
    animate(scope.current, { opacity: START_OPACITY / 100 }, { duration: 0 });
  }, [animate, scope]);

  const runAppear = useCallback(() => {
    if (!scope.current) return;
    animate(scope.current, { opacity: 1 }, transition as any);
  }, [animate, transition, scope]);

  useEffect(() => {
    let rafId: number | null = null;
    resetToHidden();
    hoverFiredRef.current = false;

    if (APPEAR_TRIGGER === "default") {
      const t = setTimeout(runAppear, 50);
      return () => clearTimeout(t);
    }

    if (APPEAR_TRIGGER === "scroll") {
      const el = scope.current;
      if (!el) return;
      const scrollPos = scrollConfig?.position ?? "bottom";
      const scrollDist = Math.max(0, Math.min(100, scrollConfig?.distance ?? 20));

      const check = () => {
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const rect = el.getBoundingClientRect();
        if (scrollPos === "top") return rect.top <= vh * (scrollDist / 100);
        return rect.bottom <= vh * (1 - scrollDist / 100);
      };

      if (check()) {
        runAppear();
        return;
      }

      let ticking = false;
      const onScroll = () => {
        if (!ticking) {
          rafId = window.requestAnimationFrame(() => {
            if (check()) {
              runAppear();
              window.removeEventListener("scroll", onScroll, true);
              window.removeEventListener("resize", onScroll);
            }
            ticking = false;
          });
          ticking = true;
        }
      };
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", onScroll);

      return () => {
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", onScroll);
        if (rafId) window.cancelAnimationFrame(rafId);
      };
    }
  }, [scrollConfig?.position, scrollConfig?.distance, runAppear, resetToHidden, scope]);

  const isVertical = direction === "top-to-bottom" || direction === "bottom-to-top";

  const gradient = useMemo(() => {
    const list = (colors ?? []).filter(Boolean);
    if (list.length === 0) return "linear-gradient(135deg, #FF0080, #FF0080)";

    let stops = list;
    if (isVertical) {
      stops = [...list, ...list.slice().reverse()];
    } else {
      stops = list.length === 1 ? [list[0], list[0]] : [...list, list[0]];
    }

    const effectiveAngle =
      direction === "top-to-bottom" ? 180 : direction === "bottom-to-top" ? 0 : angle;

    return `linear-gradient(${effectiveAngle}deg, ${stops.join(", ")})`;
  }, [colors, angle, direction, isVertical]);

  useEffect(() => {
    if (!scope.current) return;

    let bgFrames: string[];
    if (direction === "left") {
      bgFrames = ["0% 50%", `-${SPREAD}% 50%`];
    } else if (direction === "right") {
      bgFrames = ["0% 50%", `${SPREAD}% 50%`];
    } else if (direction === "top-to-bottom") {
      bgFrames = ["50% 0%", `50% -${SPREAD}%`];
    } else if (direction === "bottom-to-top") {
      bgFrames = ["50% 0%", `50% ${SPREAD}%`];
    } else {
      bgFrames = ["0% 50%", `${SPREAD / 2}% 50%`];
    }

    const repType = direction === "alternate" ? "mirror" : "loop";

    const controls = animate(
      scope.current,
      { backgroundPosition: bgFrames },
      {
        duration: 20 / speed,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: repType,
      } as any
    );
    return () => controls.stop();
  }, [animate, scope, speed, gradient, direction]);

  const fontStyles = (font ?? {}) as React.CSSProperties;
  const safeTag = (TAGS as readonly string[]).includes(tag) ? tag : "h1";
  const Tag = motion[safeTag] as any;

  return (
    <div
      onMouseEnter={() => {
        if (APPEAR_TRIGGER === "hover" && !hoverFiredRef.current) {
          hoverFiredRef.current = true;
          runAppear();
        }
      }}
      style={{
        width: "100%",
        display: "flex",
        justifyContent:
          fontStyles.textAlign === "right"
            ? "flex-end"
            : fontStyles.textAlign === "center"
              ? "center"
              : "flex-start",
        overflow: "visible",
      }}
    >
      <Tag
        ref={scope}
        style={{
          margin: 0,
          display: "inline-block",
          whiteSpace: "pre-wrap",
          ...fontStyles,
          backgroundImage: gradient,
          backgroundSize: isVertical ? `auto ${SPREAD}%` : `${SPREAD}% auto`,
          backgroundPosition: isVertical ? "50% 0%" : "0% 50%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          opacity: START_OPACITY / 100,
          willChange: "background-position, opacity",
        }}
      >
        {text}
      </Tag>
    </div>
  );
}
