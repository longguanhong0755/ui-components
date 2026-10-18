"use client";

import * as React from "react";
import { useEffect, useRef, useCallback, useMemo } from "react";
import { motion, useAnimate, stagger, type Transition } from "framer-motion";

const TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"] as const;

type Tag = (typeof TAGS)[number];

type FontStyle = {
  fontFamily?: string;
  fontWeight?: number | string;
  fontSize?: number | string;
  lineHeight?: number | string;
  letterSpacing?: number | string;
  textAlign?: React.CSSProperties["textAlign"];
};

type StaggeredLettersProps = {
  text?: string;
  font?: FontStyle;
  color?: string;
  tag?: Tag;
  y?: number;
  startOpacity?: number;
  transition?: Transition;
  staggerMs?: number;
};

function __BaseImpl_StaggeredLetters({
  text = "Staggered Letters",
  font = {
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 120,
    lineHeight: 1.1,
    letterSpacing: 0,
    textAlign: "left",
  },
  color = "#FFFFFF",
  tag = "h3",
  y = 50,
  startOpacity = 1,
  transition = { type: "spring", stiffness: 200, damping: 15, mass: 1 },
  staggerMs = 30,
}: StaggeredLettersProps) {
  const [scope, animate] = useAnimate();
  const hasFiredRef = useRef(false);

  const normalizedOpacity = (startOpacity ?? 0) / 100;

  const resetToHidden = useCallback(() => {
    if (!scope.current) return;
    animate(".char", { y, opacity: normalizedOpacity }, { duration: 0 });
  }, [animate, y, normalizedOpacity, scope]);

  const runAppear = useCallback(() => {
    if (!scope.current) return;

    const staggerSeconds = Math.max(0, Math.round(staggerMs ?? 0)) / 1000;

    const animationConfig = {
      ...transition,
      delay: stagger(staggerSeconds),
    };

    animate(".char", { y: 0, opacity: 1 }, animationConfig as any);
  }, [animate, transition, staggerMs, scope]);

  useEffect(() => {
    resetToHidden();
    hasFiredRef.current = false;

    const t = setTimeout(runAppear, 50);
    return () => clearTimeout(t);
  }, [runAppear, resetToHidden]);

  const fontStyles = (font ?? {}) as React.CSSProperties;

  const safeTag = (TAGS as readonly string[]).includes(tag) ? tag : "h3";
  const MotionTag = motion[safeTag as keyof typeof motion] as any;

  const chars = useMemo(() => (text ?? "").split(""), [text]);

  return (
    <MotionTag
      ref={scope}
      style={{
        margin: 0,
        display: "block",
        width: "100%",
        whiteSpace: "pre-wrap",
        textAlign: fontStyles.textAlign ?? "left",
        color,
        ...fontStyles,
        overflow: "visible",
      }}
    >
      {chars.map((char, index) => (
        <motion.span
          key={index}
          className="char"
          style={{
            display: "inline-block",
            opacity: normalizedOpacity,
            y: y,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </MotionTag>
  );
}

const __presetProps = {
  "y": -41,
  "tag": "h3",
  "font": {
    "variant": "Regular",
    "fontSize": "75px",
    "textAlign": "center",
    "fontFamily": "Inter",
    "fontWeight": 700,
    "lineHeight": 1.1,
    "letterSpacing": 0
  },
  "text": "STAGGER TEXT RISE",
  "color": "#FE5E00",
  "staggerMs": 50,
  "transition": {
    "mass": 1,
    "type": "tween",
    "damping": 15,
    "stiffness": 200
  },
  "startOpacity": 6
};

export default function StaggeredLetters(props: Record<string, unknown>) {
  return <__BaseImpl_StaggeredLetters {...(__presetProps as Record<string, unknown>)} {...props} />;
}
