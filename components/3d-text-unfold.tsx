"use client";

import { useEffect, useCallback, useMemo, useRef, type CSSProperties } from "react";
import { motion, useAnimate, stagger as motionStagger, type AnimationOptions } from "framer-motion";

const TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"] as const;
type Tag = (typeof TAGS)[number];

interface OrigamiUnfoldProps {
  text?: string;
  font?: CSSProperties;
  color?: string;
  tag?: Tag;
  startRotateY?: number;
  startRotateX?: number;
  startOpacity?: number;
  transformOrigin?: string;
  perspective?: number;
  stagger?: number;
  direction?: "left-to-right" | "right-to-left";
  transition?: AnimationOptions;
}

export default function OrigamiUnfold({
  text = "Origami Unfold",
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
  startRotateY = -90,
  startRotateX = 45,
  startOpacity = 0,
  transformOrigin = "left center",
  perspective = 1200,
  stagger = 0.03,
  direction = "left-to-right",
  transition = {
    type: "tween",
    ease: "easeOut",
    duration: 0.8,
  },
}: OrigamiUnfoldProps) {
  const [scope, animate] = useAnimate();

  const resetToHidden = useCallback(() => {
    if (!scope.current) return;
    animate(
      ".char",
      {
        rotateY: startRotateY,
        rotateX: startRotateX,
        opacity: startOpacity / 100,
      },
      { duration: 0 }
    );
  }, [animate, startRotateY, startRotateX, startOpacity, scope]);

  const runAppear = useCallback(() => {
    if (!scope.current) return;

    const animationConfig = {
      ...transition,
      delay: motionStagger(stagger, {
        from: direction === "right-to-left" ? "last" : "first",
      }),
    };

    animate(".char", { rotateY: 0, rotateX: 0, opacity: 1 }, animationConfig as any);
  }, [animate, transition, stagger, direction, scope]);

  useEffect(() => {
    resetToHidden();
    const t = setTimeout(runAppear, 50);
    return () => clearTimeout(t);
  }, [runAppear, resetToHidden]);

  const safeTag = (TAGS as readonly string[]).includes(tag) ? tag : "h1";
  const MotionTag = motion[safeTag] as any;
  const chars = useMemo(() => (text ?? "").split(""), [text]);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent:
          font.textAlign === "right"
            ? "flex-end"
            : font.textAlign === "center"
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
          ...font,
          color,
          perspective,
        }}
      >
        {chars.map((char, index) => (
          <motion.span
            key={index}
            className="char"
            aria-hidden="true"
            style={{
              display: "inline-block",
              transformOrigin,
              rotateY: startRotateY,
              rotateX: startRotateX,
              opacity: startOpacity / 100,
              willChange: "transform, opacity",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </MotionTag>
    </div>
  );
}
