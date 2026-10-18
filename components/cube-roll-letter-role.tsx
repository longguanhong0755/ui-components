"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAnimate, type Transition } from "framer-motion";

const TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"] as const;

type Props = {
  text?: string;
  font?: React.CSSProperties;
  color?: string;
  tag?: string;

  direction?: "down" | "up";
  stagger?: number;
  perspective?: number;
  sideOpacity?: number;

  transition?: Transition;
};

export default function CubeRoll({
  text = "Rotating",
  font = {
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 120,
    lineHeight: 1.1,
    letterSpacing: "0em",
    textAlign: "center",
  },
  color = "#FFFFFF",
  tag = "p",
  direction = "down",
  stagger = 0.1,
  perspective = 600,
  sideOpacity = 50,
  transition = {
    type: "tween",
    duration: 0.75,
    ease: "linear",
  },
}: Props) {
  const [scope, animate] = useAnimate();
  const depthRef = useRef<HTMLSpanElement>(null);

  // "Side Fade" should feel intuitive: higher value => more faded side faces.
  const side = 1 - Math.max(0, Math.min(1, sideOpacity / 100));
  const sign = direction === "up" ? -1 : 1;

  // Split into words (kept whole for wrapping), then characters.
  const words = useMemo(() => (text ?? "").split(/(\s+)/), [text]);

  // Half the char box on Z — the prism radius. Measured, not guessed.
  const measure = useCallback(() => {
    const root = scope.current as HTMLElement | null;
    const probe = depthRef.current;
    if (!root || !probe) return;
    root.style.setProperty("--d", `${probe.offsetHeight / 2}px`);
  }, [scope]);

  useEffect(() => {
    measure();
    if (typeof document !== "undefined" && (document as any).fonts?.ready) {
      (document as any).fonts.ready.then(measure).catch(() => {});
    }
  }, [measure, text, font]);

  useEffect(() => {
    const root = scope.current as HTMLElement | null;
    if (!root) return;

    const chars = Array.from(root.querySelectorAll<HTMLElement>(".char-3d"));
    const base: Transition = {
      duration: 0.75,
      ease: "linear",
      ...(transition ?? {}),
    };

    const baseDuration =
      typeof (base as any).duration === "number" ? (base as any).duration : 0.75;
    // Expand the animation loop across a full 360-degree rotation (4 quarters).
    // This ensures the start (0°) and end (360°) values match identically,
    // eliminating the abrupt opacity/transform jump on loop restart that caused the flicker.
    const fullDuration = baseDuration * 4;

    const baseDelay =
      typeof (base as any).delay === "number" ? (base as any).delay : 0;

    const running = chars.flatMap((char, i) => {
      const t: Transition = {
        ...base,
        duration: fullDuration,
        repeat: Infinity,
        repeatType: "loop",
        repeatDelay: 0,
        delay: baseDelay + i * stagger,
      };
      const face = (sel: string) =>
        char.querySelector<HTMLElement>(sel) as HTMLElement;

      return [
        animate(
          char,
          {
            rotateX: [0, -90 * sign, -180 * sign, -270 * sign, -360 * sign],
          },
          t
        ),
        // 5-point keyframes mapping a seamless full rotation cycle (0° -> 90° -> 180° -> 270° -> 360°)
        // Step 0 & 4 match perfectly (Front=1, Top=side, Bottom=side), preventing any flicker on loop restart.
        animate(face(".face-top"), { opacity: [side, 0, side, 1, side] }, t),
        animate(face(".face-front"), { opacity: [1, side, 0, side, 1] }, t),
        animate(face(".face-bottom"), { opacity: [side, 1, side, 0, side] }, t),
        animate(face(".face-back"), { opacity: [0, side, 1, side, 0] }, t),
      ];
    });

    return () => running.forEach((a) => a?.stop?.());
  }, [animate, scope, text, stagger, sign, side, JSON.stringify(transition ?? {})]);

  const fontStyles = (font ?? {}) as React.CSSProperties;
  const safeTag = (TAGS as readonly string[]).includes(tag) ? tag : "p";
  const Tag = safeTag as any;

  const faceBase: React.CSSProperties = {
    display: "block",
    fontStyle: "inherit",
    backfaceVisibility: "hidden",
    whiteSpace: "pre",
  };

  let charIndex = 0;

  return (
    <div
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
          color,
          perspective: `${perspective}px`,
          transformStyle: "preserve-3d",
          ...fontStyles,
        }}
      >
        {words.map((word, w) => {
          if (/^\s+$/.test(word)) {
            return (
              <span key={`s${w}`} aria-hidden="true">
                {" "}
              </span>
            );
          }
          return (
            <span
              key={`w${w}`}
              aria-hidden="true"
              style={{
                display: "inline-block",
                transformStyle: "preserve-3d",
              }}
            >
              {word.split("").map((ch, c) => {
                const isProbe = charIndex++ === 0;
                return (
                  <span
                    key={c}
                    className="char-3d"
                    ref={isProbe ? depthRef : undefined}
                    style={{
                      display: "inline-block",
                      position: "relative",
                      transformStyle: "preserve-3d",
                      willChange: "transform",
                    }}
                  >
                    <span
                      className="face-front"
                      style={{
                        ...faceBase,
                        position: "relative",
                        transform: "translateZ(var(--d, 0.5em))",
                        opacity: 1,
                      }}
                    >
                      {ch}
                    </span>
                    <span
                      className="face face-top"
                      style={{
                        ...faceBase,
                        position: "absolute",
                        inset: 0,
                        transform: `rotateX(${-90 * sign}deg) translateZ(var(--d, 0.5em))`,
                        opacity: side,
                      }}
                    >
                      {ch}
                    </span>
                    <span
                      className="face face-bottom"
                      style={{
                        ...faceBase,
                        position: "absolute",
                        inset: 0,
                        transform: `rotateX(${90 * sign}deg) translateZ(var(--d, 0.5em))`,
                        opacity: side,
                      }}
                    >
                      {ch}
                    </span>
                    <span
                      className="face face-back"
                      style={{
                        ...faceBase,
                        position: "absolute",
                        inset: 0,
                        transform: "rotateX(180deg) translateZ(var(--d, 0.5em))",
                        opacity: 0,
                      }}
                    >
                      {ch}
                    </span>
                  </span>
                );
              })}
            </span>
          );
        })}
      </Tag>
    </div>
  );
}
