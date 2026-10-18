"use client";

import * as React from "react";
import { useEffect, useRef, useCallback, useMemo } from "react";
import {
  motion,
  useAnimate,
  stagger as motionStagger,
  type AnimationOptions,
} from "framer-motion";

const TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"] as const;

type ScrollConfig = { position: "top" | "bottom"; distance: number };

type Props = {
  text?: string;
  font?: React.CSSProperties;
  color?: string;
  tag?: (typeof TAGS)[number];

  waveFrequency?: number;
  waveAmplitude?: number;
  scaleBase?: number;
  scaleAmplitude?: number;
  startOpacity?: number;

  stagger?: number;
  transition?: AnimationOptions;
  appearTrigger?: "default" | "hover" | "scroll";
  scrollConfig?: ScrollConfig;
};

export default function RippleWave({
  text = "Ripple Wave",
  font = {
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 120,
    lineHeight: "1.5em",
    letterSpacing: "0em",
    textAlign: "left",
  },
  color = "#FFFFFF",
  tag = "h3",

  waveFrequency = 0.8,
  waveAmplitude = 60,
  scaleBase = 0.5,
  scaleAmplitude = 0.5,
  startOpacity = 0,

  stagger = 0.03,
  transition = { type: "spring", stiffness: 300, damping: 15, mass: 1 },
  appearTrigger = "default",
  scrollConfig = { position: "bottom", distance: 20 },
}: Props) {
  const [scope, animate] = useAnimate();
  const hoverFiredRef = useRef(false);

  const chars = useMemo(() => (text ?? "").split(""), [text]);
  const charsConfig = useMemo(() => {
    return chars.map((char, i) => {
      const startY = Math.sin(i * waveFrequency) * waveAmplitude;
      const startScale =
        scaleBase + Math.abs(Math.sin(i * waveFrequency)) * scaleAmplitude;
      return {
        char,
        startY,
        startScale,
      };
    });
  }, [chars, waveFrequency, waveAmplitude, scaleBase, scaleAmplitude]);

  const resetToHidden = useCallback(() => {
    if (!scope.current) return;
    animate(
      ".char",
      {
        y: "var(--start-y)",
        scale: "var(--start-scale)",
        opacity: startOpacity,
      },
      { duration: 0 }
    );
  }, [animate, startOpacity, scope]);

  const runAppear = useCallback(() => {
    if (!scope.current) return;
    const animationConfig = {
      ...transition,
      delay: motionStagger(stagger),
    };
    animate(".char", { y: 0, scale: 1, opacity: 1 }, animationConfig as any);
  }, [animate, transition, stagger, scope]);

  useEffect(() => {
    let rafId: number | null = null;
    resetToHidden();
    hoverFiredRef.current = false;

    if (appearTrigger === "default") {
      const t = setTimeout(runAppear, 50);
      return () => clearTimeout(t);
    }

    if (appearTrigger === "scroll") {
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
  }, [
    appearTrigger,
    scrollConfig?.position,
    scrollConfig?.distance,
    runAppear,
    resetToHidden,
    scope,
  ]);

  const fontStyles = (font ?? {}) as React.CSSProperties;
  const safeTag = (TAGS as readonly string[]).includes(tag) ? tag : "h1";
  const Tag = motion[safeTag as keyof typeof motion] as any;

  return (
    <div
      onMouseEnter={() => {
        if (appearTrigger === "hover" && !hoverFiredRef.current) {
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
        aria-label={text}
        style={{
          margin: 0,
          display: "inline-block",
          whiteSpace: "pre-wrap",
          ...fontStyles,
          color,
        }}
      >
        {charsConfig.map((item, index) => (
          <motion.span
            key={index}
            className="char"
            aria-hidden="true"
            style={
              {
                display: "inline-block",
                "--start-y": `${item.startY}px`,
                "--start-scale": item.startScale,
                y: `var(--start-y)`,
                scale: `var(--start-scale)`,
                opacity: startOpacity,
                willChange: "transform, opacity",
              } as any
            }
          >
            {item.char === " " ? "\u00A0" : item.char}
          </motion.span>
        ))}
      </Tag>
    </div>
  );
}
