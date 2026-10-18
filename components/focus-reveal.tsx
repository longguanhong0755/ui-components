"use client";

// Focus Reveal (motion/react)
// Props set in the preview:
//   text: "FOCUS REVEAL"
//   blur: 20
//   staggerFrom: "start"
//
// Typography: prefer `className` (Tailwind). Inline `font` / `color` are
// optional overrides only — defaults must not fight utility classes.

import {
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ElementType,
} from "react";

type FontStyle = CSSProperties;

type TransitionValue = {
  type?: string;
  duration?: number;
  delay?: number;
  ease?: string | number[];
  staggerChildren?: number;
};

type StaggerFrom = "start" | "center" | "end" | "random";

type FocusRevealProps = {
  text?: string;
  /** Optional inline font overrides. Prefer Tailwind via `className`. */
  font?: FontStyle;
  /** Optional inline color. Prefer Tailwind via `className` (e.g. text-white). */
  color?: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  blur?: number;
  staggerFrom?: StaggerFrom;
  transition?: TransitionValue;
  onComplete?: () => void;
};

const START_SCALE = 1.45;
/** Cap blur animation (perf + project motion rules) */
const MAX_BLUR = 20;
/** ease-out-cubic */
const EASE_OUT = [0.215, 0.61, 0.355, 1] as const;

const DEFAULT_TRANSITION: TransitionValue = {
  type: "tween",
  duration: 0.3,
  delay: 0,
  ease: "easeOut",
  staggerChildren: 0.035,
};

const MOTION_TAGS = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  span: motion.span,
} as const satisfies Record<string, ElementType>;

const resolveEase = (
  ease: TransitionValue["ease"],
): Transition["ease"] => {
  if (Array.isArray(ease)) return ease as [number, number, number, number];
  if (ease === "linear") return "linear";
  if (ease === "easeIn") return [0.55, 0.085, 0.68, 0.53];
  if (ease === "easeInOut") return [0.645, 0.045, 0.355, 1];
  return EASE_OUT;
};

const buildStaggerDelays = (
  count: number,
  each: number,
  from: StaggerFrom,
  baseDelay: number,
): number[] => {
  if (count === 0) return [];

  if (from === "random") {
    const order = Array.from({ length: count }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order.map((rank) => baseDelay + rank * each);
  }

  if (from === "end") {
    return Array.from(
      { length: count },
      (_, i) => baseDelay + (count - 1 - i) * each,
    );
  }

  if (from === "center") {
    const mid = (count - 1) / 2;
    return Array.from(
      { length: count },
      (_, i) => baseDelay + Math.abs(i - mid) * each,
    );
  }

  return Array.from({ length: count }, (_, i) => baseDelay + i * each);
};

const FocusReveal = ({
  text = "Spotlight Reveal",
  font,
  color,
  className = "",
  as: Tag = "h1",
  blur = 20,
  staggerFrom = "start",
  transition = DEFAULT_TRANSITION,
  onComplete,
}: FocusRevealProps) => {
  const reduceMotion = useReducedMotion();
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const duration = transition.duration ?? DEFAULT_TRANSITION.duration!;
  const baseDelay = transition.delay ?? DEFAULT_TRANSITION.delay!;
  const staggerEach =
    transition.staggerChildren ?? DEFAULT_TRANSITION.staggerChildren!;
  const ease = transition.ease ?? DEFAULT_TRANSITION.ease;

  const chars = useMemo(() => text.split(""), [text]);
  const lastIndex = chars.length - 1;
  const safeBlur = Math.min(Math.max(blur, 0), MAX_BLUR);

  // null → boolean from useReducedMotion should not restart the stagger
  const skipMotion = reduceMotion === true;

  const delays = useMemo(
    () =>
      buildStaggerDelays(
        chars.length,
        skipMotion ? 0 : staggerEach,
        staggerFrom,
        baseDelay,
      ),
    [chars.length, skipMotion, staggerFrom, baseDelay, staggerEach],
  );

  /** Split into words so we wrap between words, not mid-character */
  const words = useMemo(() => {
    const parts: { chars: string[]; startIndex: number }[] = [];
    let startIndex = 0;
    const tokens = text.split(/(\s+)/);

    for (const token of tokens) {
      if (token.length === 0) continue;
      const tokenChars = token.split("");
      parts.push({ chars: tokenChars, startIndex });
      startIndex += tokenChars.length;
    }
    return parts;
  }, [text]);

  useEffect(() => {
    completedRef.current = false;
  }, [text, blur, staggerFrom, duration, baseDelay, staggerEach]);

  useEffect(() => {
    if (!skipMotion || !onCompleteRef.current || completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current();
  }, [skipMotion]);

  const handleCharComplete = (index: number) => {
    if (index !== lastIndex || completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current?.();
  };

  // Stable tag component — never call motion.create() during render
  const MotionTag = MOTION_TAGS[Tag];

  const rootStyle: CSSProperties = {
    margin: 0,
    display: "block",
    width: "100%",
    ...(color ? { color } : null),
    ...(font ?? null),
  };

  const hidden = skipMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        scale: START_SCALE,
        filter: `blur(${safeBlur}px)`,
      };
  const visible = skipMotion
    ? { opacity: 1 }
    : {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
      };

  return (
    <MotionTag aria-label={text} className={className} style={rootStyle}>
      {words.map((word, wordIndex) => {
        const isWhitespace = word.chars.every((c) => /\s/.test(c));

        return (
          <span
            key={`word-${wordIndex}`}
            className={
              isWhitespace ? undefined : "inline-block whitespace-nowrap"
            }
            aria-hidden="true"
          >
            {word.chars.map((char, charOffset) => {
              const index = word.startIndex + charOffset;

              return (
                <motion.span
                  key={`${char}-${index}`}
                  className="inline-block will-change-[transform,opacity,filter]"
                  initial={hidden}
                  animate={visible}
                  transition={{
                    type: "tween",
                    duration: skipMotion ? 0.15 : duration,
                    delay: delays[index] ?? 0,
                    ease: resolveEase(ease),
                  }}
                  onAnimationComplete={() => handleCharComplete(index)}
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              );
            })}
          </span>
        );
      })}
    </MotionTag>
  );
};

FocusReveal.displayName = "Focus Reveal";

export default FocusReveal;
export type { FocusRevealProps, StaggerFrom };
