"use client";

import * as React from "react";
import { useEffect, useRef, useCallback, useMemo } from "react";
import { motion, useAnimate, type AnimationOptions } from "framer-motion";

const TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"] as const;

type Tag = (typeof TAGS)[number];

type FontStyle = React.CSSProperties;

type ScrollConfig = { position: "top" | "bottom"; distance: number };

type Props = {
  text: string;
  font?: FontStyle;
  color: string;
  tag: Tag;
  style?: React.CSSProperties;

  startY: number;
  startScale: number;
  startOpacity: number;
  rotationRange: number;

  stagger: number;
  transition: AnimationOptions;
  appearTrigger: "default" | "hover" | "scroll";
  scrollConfig: ScrollConfig;
};

const defaultFont: FontStyle = {
  fontFamily: "Inter",
  fontWeight: 700,
  fontSize: 120,
  lineHeight: "1.5em",
  letterSpacing: "0em",
  textAlign: "left",
};

function __BaseImpl_PopcornPop({
  text = "Popcorn Pop",
  font = defaultFont,
  color = "#FFFFFF",
  tag = "h1",
  style,

  startY = 30,
  startScale = 0,
  startOpacity = 0,
  rotationRange = 20,

  stagger = 0.04,
  transition = { type: "spring", stiffness: 350, damping: 14, mass: 1 },
  appearTrigger = "default",
  scrollConfig = { position: "bottom", distance: 20 },
}: Props) {
  const [scope, animate] = useAnimate();
  const hoverFiredRef = useRef(false);

  const chars = useMemo(() => (text ?? "").split(""), [text]);
  const charsConfig = useMemo(() => {
    const indices = chars.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    return chars.map((char, index) => {
      const randomRotation = (Math.random() * 2 - 1) * rotationRange;
      return {
        char,
        randomRotation,
        staggerOrder: indices[index],
      };
    });
  }, [chars, rotationRange]);

  const resetToHidden = useCallback(() => {
    if (!scope.current) return;
    animate(
      ".char",
      {
        y: startY,
        scale: startScale,
        opacity: startOpacity,
        rotate: "var(--start-rot)",
      },
      { duration: 0 }
    );
  }, [animate, startY, startScale, startOpacity, scope]);

  const runAppear = useCallback(() => {
    if (!scope.current) return;

    const animationConfig = {
      ...transition,
      delay: (i: number) => charsConfig[i].staggerOrder * stagger,
    };

    animate(
      ".char",
      { y: 0, scale: 1, opacity: 1, rotate: 0 },
      animationConfig as any
    );
  }, [animate, transition, stagger, charsConfig, scope]);

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
  const MotionTag = motion[safeTag as Tag] as any;

  return (
    <div
      onMouseEnter={() => {
        if (appearTrigger === "hover" && !hoverFiredRef.current) {
          hoverFiredRef.current = true;
          runAppear();
        }
      }}
      style={{
        ...style,
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
      <MotionTag
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
                "--start-rot": `${item.randomRotation}deg`,
                rotate: `var(--start-rot)`,
                y: startY,
                scale: startScale,
                opacity: startOpacity,
                willChange: "transform, opacity",
              } as any
            }
          >
            {item.char === " " ? "\u00A0" : item.char}
          </motion.span>
        ))}
      </MotionTag>
    </div>
  );
}

const __presetProps = {
  "tag": "h1",
  "font": {
    "variant": "Semibold",
    "fontSize": "92px",
    "textAlign": "center",
    "fontFamily": "Inter",
    "fontWeight": 600,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  },
  "text": "Popcorn Pop",
  "color": "#17FF23",
  "transition": {
    "mass": 1.6,
    "type": "spring",
    "damping": 4,
    "stiffness": 120
  },
  "scrollConfig": {
    "distance": 20,
    "position": "bottom"
  },
  "rotationRange": 0
};

export default function PopcornPop(props: Record<string, unknown>) {
  return <__BaseImpl_PopcornPop {...(__presetProps as Record<string, unknown>)} {...props} />;
}
