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

type Props = {
  text?: string;
  font?: React.CSSProperties;
  color?: string;
  tag?: string;

  startRotation?: number;
  startOpacity?: number;
  transformOrigin?: string;

  stagger?: number;
  transition?: AnimationOptions;
  appearTrigger?: "default" | "hover" | "scroll";
  scrollConfig?: { position: "top" | "bottom"; distance: number };
};

export default function DominoFall({
  text = "Domino Fall",
  font = {
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 120,
    lineHeight: "1.5em",
    letterSpacing: "0em",
    textAlign: "left",
  },
  color = "#FFFFFF",
  tag = "h1",
  startRotation = -90,
  startOpacity = 0,
  transformOrigin = "bottom left",
  stagger = 0.06,
  transition = { type: "spring", stiffness: 300, damping: 20, mass: 1 },
  appearTrigger = "default",
  scrollConfig = { position: "bottom", distance: 20 },
}: Props) {
  const [scope, animate] = useAnimate();
  const hoverFiredRef = useRef(false);

  const resetToHidden = useCallback(() => {
    if (!scope.current) return;
    animate(
      ".char",
      { rotateZ: startRotation, opacity: startOpacity },
      { duration: 0 }
    );
  }, [animate, startRotation, startOpacity, scope]);

  const runAppear = useCallback(() => {
    if (!scope.current) return;
    const animationConfig = {
      ...transition,
      delay: motionStagger(stagger),
    };
    animate(".char", { rotateZ: 0, opacity: 1 }, animationConfig as any);
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
  const Tag = (motion as any)[safeTag];
  const chars = useMemo(() => (text ?? "").split(""), [text]);

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
          color,
          ...fontStyles,
        }}
      >
        {chars.map((char, index) => (
          <motion.span
            key={index}
            className="char"
            aria-hidden="true"
            style={{
              display: "inline-block",
              transformOrigin: transformOrigin,
              rotateZ: startRotation,
              opacity: startOpacity,
              willChange: "transform, opacity",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </Tag>
    </div>
  );
}
