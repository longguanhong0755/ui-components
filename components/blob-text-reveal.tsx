"use client";

import * as React from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

type FontStyle = React.CSSProperties & {
  fontFamily?: string;
  fontWeight?: number | string;
  fontSize?: number | string;
  letterSpacing?: number | string;
  lineHeight?: number | string;
  variant?: string;
};

type TransitionValue = {
  type?: string;
  duration?: number;
  delay?: number;
  ease?: string | number[];
  staggerChildren?: number;
};

type Props = {
  prefix?: string;
  texts?: string[];
  font?: FontStyle;
  color?: string;
  prefixColor?: string;
  wipeColor?: string;
  revealColor?: string;
  blobSize?: number;
  blobPosition?: number;
  blur?: number;
  transition?: TransitionValue;
  style?: React.CSSProperties;
};

type CharMetrics = {
  left: number;
  right: number;
  center: number;
};

type Layout = {
  chars: CharMetrics[];
  homeX: number;
  leftX: number;
  nodes: HTMLSpanElement[];
};

const HAS_SEGMENTER = typeof Intl !== "undefined" && "Segmenter" in Intl;

const START_Y = 18;

const splitIntoCharacters = (text: string): string[] => {
  if (HAS_SEGMENTER) {
    const segmenter = new (Intl as any).Segmenter("en", {
      granularity: "grapheme",
    });
    return Array.from(segmenter.segment(text), ({ segment }: any) => segment);
  }
  return Array.from(text);
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const DEFAULT_TEXTS = ["web", "Nextjs", "tailwindCSS", "Motion"];

const DEFAULT_FONT: FontStyle = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: "120px",
  fontWeight: 400,
  letterSpacing: "0em",
  lineHeight: "1.1em",
  variant: "Semibold",
  textAlign: "left",
};

const DEFAULT_TRANSITION: TransitionValue = {
  type: "tween",
  duration: 0.55,
  delay: 1.3,
  ease: "easeOut",
  staggerChildren: 0.06,
};

const WIPE_SPEED_PX_PER_SEC = 720;
const REVEAL_SPEED_PX_PER_SEC = 740;
const MIN_WIPE_DURATION = 0.35;
const MAX_WIPE_DURATION = 0.55;
const MIN_REVEAL_DURATION = 0.35;
const MAX_REVEAL_DURATION = 0.75;

const WIPE_STRETCH = 1.75;
const DEFORM_DURATION = 0.15;
const DEFORM_EASE = [0.215, 0.61, 0.355, 1] as const;

const CHAR_REVEAL_DURATION = 0.5;
const POST_PARK_SETTLE = 0.4;

const DEFAULT_WIPE_COLOR = "#CD293A";
const DEFAULT_REVEAL_COLOR = "#376CD3";
const BLOB_COLOR_DURATION = 0.28;
const BLOB_COLOR_EASE = [0.215, 0.61, 0.355, 1] as const;

const travelDuration = (
  distancePx: number,
  speedPxPerSec: number,
  minDuration: number,
  maxDuration: number
): number => {
  if (!Number.isFinite(distancePx) || distancePx <= 0) return minDuration;
  return Math.min(
    maxDuration,
    Math.max(minDuration, distancePx / speedPxPerSec)
  );
};

export default function TextRevealBlur({
  prefix = "BLOB",
  texts = DEFAULT_TEXTS,
  font = DEFAULT_FONT,
  color = "#ffffff",
  prefixColor = "#FFFFFF",
  wipeColor = DEFAULT_WIPE_COLOR,
  revealColor = DEFAULT_REVEAL_COLOR,
  blobSize = 12,
  blobPosition = 0,
  blur = 20,
  transition = DEFAULT_TRANSITION,
  style,
}: Props) {
  const safeBlobSize = Math.min(Math.max(blobSize, 4), 20);
  const safeBlobPosition = Math.min(Math.max(blobPosition, -12), 24);
  const blobMarginBottom = Math.round(safeBlobSize * 0.55) + safeBlobPosition;
  const safeTexts = useMemo(() => {
    const list = (texts ?? DEFAULT_TEXTS).filter((t) => t.length > 0);
    return list.length > 0 ? list : DEFAULT_TEXTS;
  }, [texts]);

  const [wordIndex, setWordIndex] = useState(0);

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const charsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const wordIndexRef = useRef(0);
  const blobSizeRef = useRef(safeBlobSize);
  blobSizeRef.current = safeBlobSize;
  const wipeColorRef = useRef(wipeColor);
  const revealColorRef = useRef(revealColor);
  wipeColorRef.current = wipeColor;
  revealColorRef.current = revealColor;

  const blobLeft = useMotionValue(0);
  const blobWidth = useMotionValue(safeBlobSize);
  const blobMarginLeft = useTransform(blobWidth, (w) => -w / 2);
  const blobColor = useMotionValue(revealColor);
  const [blobReady, setBlobReady] = useState(true);

  const currentWord = safeTexts[wordIndex] ?? safeTexts[0] ?? "";
  const characters = useMemo(
    () => splitIntoCharacters(currentWord),
    [currentWord]
  );

  useLayoutEffect(() => {
    charsRef.current.length = characters.length;
  }, [characters.length, currentWord]);

  const holdDuration = transition.delay ?? DEFAULT_TRANSITION.delay ?? 1.3;

  const getCharNodes = useCallback(() => {
    return charsRef.current.filter(
      (node): node is HTMLSpanElement => node != null
    );
  }, []);

  const measureLayout = useCallback((): Layout | null => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return null;

    const nodes = getCharNodes();
    if (nodes.length === 0) return null;

    const layoutWidth = wrapper.offsetWidth;
    if (layoutWidth < 1) return null;

    const size = blobSizeRef.current;
    const half = size / 2;
    const clearGap = Math.max(6, Math.round(size * 0.45));
    const parkInset = half + clearGap;

    let chars: CharMetrics[] = nodes.map((node) => {
      const left = node.offsetLeft;
      const width = node.offsetWidth;
      return {
        left,
        right: left + width,
        center: left + width / 2,
      };
    });

    const offsetsReady = chars.every((c) => c.right > c.left);

    if (!offsetsReady) {
      const wrapperRect = wrapper.getBoundingClientRect();
      if (wrapperRect.width < 1) return null;
      const zoom = layoutWidth / wrapperRect.width;
      if (!Number.isFinite(zoom) || zoom < 0.25 || zoom > 4) return null;

      chars = nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        const left = (rect.left - wrapperRect.left) * zoom;
        const width = rect.width * zoom;
        return {
          left,
          right: left + width,
          center: left + width / 2,
        };
      });
    }

    if (chars.some((c) => !Number.isFinite(c.center) || c.right <= c.left)) {
      return null;
    }

    const first = chars[0]!;
    const last = chars[chars.length - 1]!;

    const homeX = last.right + parkInset;
    const leftX = Math.max(half, first.left - parkInset);

    const maxX = layoutWidth + size + clearGap;
    const clampX = (value: number) =>
      Math.min(maxX, Math.max(-size * 0.25, value));

    return {
      chars,
      homeX: clampX(homeX),
      leftX: clampX(leftX),
      nodes,
    };
  }, [getCharNodes]);

  const measureLayoutRef = useRef(measureLayout);
  measureLayoutRef.current = measureLayout;

  const suppressAutoParkRef = useRef(false);

  const waitForLayout = useCallback(async () => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
      const layout = measureLayoutRef.current();
      if (layout && layout.nodes.length > 0) return layout;
    }
    return null;
  }, []);

  useLayoutEffect(() => {
    if (suppressAutoParkRef.current) {
      setBlobReady(true);
      return;
    }
    const layout = measureLayout();
    if (!layout) return;
    blobLeft.set(layout.homeX);
    setBlobReady(true);
  }, [measureLayout, blobLeft, currentWord, safeBlobSize]);

  const setCharsVisible = (nodes: HTMLSpanElement[]) => {
    nodes.forEach((node) => {
      node.style.opacity = "1";
      node.style.filter = "blur(0px)";
      node.style.transform = "translateY(0px)";
    });
  };

  const setCharsHidden = (nodes: HTMLSpanElement[]) => {
    nodes.forEach((node) => {
      node.style.opacity = "0";
      node.style.filter = `blur(${blur}px)`;
      node.style.transform = `translateY(${START_Y}px)`;
    });
  };

  useEffect(() => {
    if (safeTexts.length === 0) return;

    if (prefersReducedMotion()) {
      const layout = measureLayoutRef.current();
      if (layout) {
        blobLeft.set(layout.homeX);
        blobColor.set(revealColorRef.current);
        setBlobReady(true);
        setCharsVisible(layout.nodes);
      }
      return;
    }

    let cancelled = false;
    let activeAnim: { stop: () => void } | undefined;
    let deformAnim: { stop: () => void } | undefined;
    let charAnim: { stop: () => void } | undefined;
    let colorAnim: { stop: () => void } | undefined;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        holdTimer = setTimeout(resolve, ms);
      });

    const setBlobColorSmooth = (next: string, instant = false) => {
      colorAnim?.stop();
      if (instant) {
        blobColor.set(next);
        return;
      }
      colorAnim = animate(blobColor, next, {
        duration: BLOB_COLOR_DURATION,
        ease: BLOB_COLOR_EASE,
      });
    };

    const blobHalf = () => blobWidth.get() / 2;

    const resetBlobScale = () => {
      deformAnim?.stop();
      blobWidth.set(blobSizeRef.current);
    };

    const setBlobDeform = (mode: "wipe" | "rest") => {
      deformAnim?.stop();
      const size = blobSizeRef.current;
      const target = mode === "rest" ? size : size * WIPE_STRETCH;

      return new Promise<void>((resolve) => {
        deformAnim = animate(blobWidth, target, {
          duration: DEFORM_DURATION,
          ease: DEFORM_EASE,
          onComplete: () => resolve(),
        });
      });
    };

    const hideCharsWithBlob = (
      nodes: HTMLSpanElement[],
      chars: CharMetrics[],
      x: number
    ) => {
      const half = blobHalf();
      const leadEdge = x - half;
      nodes.forEach((node, i) => {
        const metrics = chars[i];
        if (!metrics) return;
        if (leadEdge <= metrics.right) {
          node.style.opacity = "0";
          node.style.filter = `blur(${blur}px)`;
          node.style.transform = `translateY(${START_Y}px)`;
        }
      });
    };

    const revealChar = (node: HTMLSpanElement) => {
      charAnim = animate(
        node,
        {
          opacity: [0, 1],
          y: [START_Y, 0],
          filter: [`blur(${blur}px)`, "blur(0px)"],
        } as any,
        {
          duration: CHAR_REVEAL_DURATION,
          ease: [0.215, 0.61, 0.355, 1],
        }
      );
    };

    const revealWithBlob = (
      nodes: HTMLSpanElement[],
      chars: CharMetrics[],
      fromX: number,
      homeX: number
    ) =>
      new Promise<void>((resolve) => {
        setCharsHidden(nodes);
        resetBlobScale();
        setBlobColorSmooth(revealColorRef.current);

        const revealed = new Set<number>();
        const distance = Math.abs(homeX - fromX);
        const blobDuration = travelDuration(
          distance,
          REVEAL_SPEED_PX_PER_SEC,
          MIN_REVEAL_DURATION,
          MAX_REVEAL_DURATION
        );

        activeAnim = animate(blobLeft, homeX, {
          duration: blobDuration,
          ease: "linear",
          onUpdate: (x) => {
            const half = blobHalf();
            const leadEdge = x + half;
            nodes.forEach((node, i) => {
              if (revealed.has(i)) return;
              const metrics = chars[i];
              if (!metrics) return;

              if (leadEdge >= metrics.left) {
                revealed.add(i);
                revealChar(node);
              }
            });
          },
          onComplete: () => {
            nodes.forEach((node, i) => {
              if (revealed.has(i)) return;
              revealed.add(i);
              revealChar(node);
            });

            holdTimer = setTimeout(() => {
              setCharsVisible(nodes);
              resolve();
            }, POST_PARK_SETTLE * 1000);
          },
        });
      });

    const runLoop = async () => {
      let layout = await waitForLayout();
      if (!layout || cancelled) return;

      resetBlobScale();
      setBlobColorSmooth(revealColorRef.current, true);
      blobLeft.set(layout.homeX);
      setBlobReady(true);
      setCharsVisible(layout.nodes);
      suppressAutoParkRef.current = true;

      while (!cancelled) {
        layout = await waitForLayout();
        if (!layout || cancelled) break;

        setBlobColorSmooth(revealColorRef.current);
        blobLeft.set(layout.homeX);
        await setBlobDeform("rest");
        setCharsVisible(layout.nodes);

        await wait(holdDuration * 1000);
        if (cancelled) break;

        setCharsVisible(layout.nodes);
        const wipeLayout = await waitForLayout();
        if (!wipeLayout || cancelled) break;

        setBlobColorSmooth(wipeColorRef.current);
        void setBlobDeform("wipe");

        const wipeDistance = Math.abs(wipeLayout.homeX - wipeLayout.leftX);
        const wipeDurationSec = travelDuration(
          wipeDistance,
          WIPE_SPEED_PX_PER_SEC,
          MIN_WIPE_DURATION,
          MAX_WIPE_DURATION
        );

        let shrinkStarted = false;
        await new Promise<void>((resolve) => {
          activeAnim = animate(blobLeft, wipeLayout.leftX, {
            duration: wipeDurationSec,
            ease: "linear",
            onUpdate: (x) => {
              hideCharsWithBlob(wipeLayout.nodes, wipeLayout.chars, x);

              if (!shrinkStarted && wipeDistance > 0) {
                const progress = Math.abs(wipeLayout.homeX - x) / wipeDistance;
                if (progress >= 0.82) {
                  shrinkStarted = true;
                  void setBlobDeform("rest");
                  setBlobColorSmooth(revealColorRef.current);
                }
              }
            },
            onComplete: () => {
              if (!shrinkStarted) {
                void setBlobDeform("rest");
                setBlobColorSmooth(revealColorRef.current);
              }
              resolve();
            },
          });
        });

        if (cancelled) break;

        const nextIndex = (wordIndexRef.current + 1) % safeTexts.length;
        wordIndexRef.current = nextIndex;
        setWordIndex(nextIndex);

        layout = await waitForLayout();
        if (!layout || cancelled) break;

        layout.nodes.forEach((node) => {
          node.style.transform = "translateY(0px)";
          node.style.opacity = "0";
          node.style.filter = `blur(${blur}px)`;
        });
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });
        const revealLayout = measureLayoutRef.current();
        if (!revealLayout || cancelled) break;

        blobLeft.set(revealLayout.leftX);
        setCharsHidden(revealLayout.nodes);

        await revealWithBlob(
          revealLayout.nodes,
          revealLayout.chars,
          revealLayout.leftX,
          revealLayout.homeX
        );

        if (cancelled) break;

        setCharsVisible(revealLayout.nodes);
        blobLeft.set(revealLayout.homeX);
        setBlobColorSmooth(revealColorRef.current);
      }
    };

    runLoop();

    return () => {
      cancelled = true;
      suppressAutoParkRef.current = false;
      clearTimeout(holdTimer);
      activeAnim?.stop();
      deformAnim?.stop();
      charAnim?.stop();
      colorAnim?.stop();
      resetBlobScale();
    };
  }, [
    safeTexts,
    holdDuration,
    blur,
    blobLeft,
    blobWidth,
    blobColor,
    waitForLayout,
  ]);

  useEffect(() => {
    animate(blobColor, revealColor, {
      duration: BLOB_COLOR_DURATION,
      ease: BLOB_COLOR_EASE,
    });
  }, [revealColor, blobColor]);

  useEffect(() => {
    const size = safeBlobSize;
    blobWidth.set(size);

    const layout = measureLayoutRef.current();
    if (!layout) return;
    const current = blobLeft.get();
    const nearHome = Math.abs(current - layout.homeX) < size * 2;
    const nearLeft = Math.abs(current - layout.leftX) < size * 2;
    if (nearHome) {
      blobLeft.set(layout.homeX);
    } else if (nearLeft) {
      blobLeft.set(layout.leftX);
    }
  }, [safeBlobSize, blobLeft, blobWidth]);

  const textAlign =
    (font.textAlign as React.CSSProperties["textAlign"]) ?? "left";
  const justifyContent =
    textAlign === "center"
      ? "center"
      : textAlign === "right" || textAlign === "end"
      ? "flex-end"
      : "flex-start";

  return (
    <div
      style={{
        ...font,
        width: "100%",
        height: "100%",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent,
        gap: "0.35em",
        textAlign,
        ...style,
      }}
    >
      {prefix ? (
        <span style={{ color: prefixColor, whiteSpace: "pre" }}>
          {prefix}
        </span>
      ) : null}

      <span
        ref={wrapperRef}
        style={{
          position: "relative",
          display: "inline-block",
          color,
          letterSpacing: font.letterSpacing ?? "0em",
          lineHeight: font.lineHeight ?? 1.1,
          verticalAlign: "baseline",
          paddingRight:
            Math.max(6, Math.round(safeBlobSize * 0.45)) + safeBlobSize,
        }}
      >
        <span
          aria-hidden="true"
          style={{ display: "inline-block", whiteSpace: "pre" }}
        >
          {characters.map((char, i) => (
            <span
              key={`${currentWord}-${i}`}
              ref={(node) => {
                charsRef.current[i] = node;
              }}
              className="char"
              style={{
                display: "inline-block",
                transformOrigin: "50% 50%",
                willChange: "transform, opacity, filter",
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </span>

        <span
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            borderWidth: 0,
          }}
        >
          {prefix ? `${prefix} ` : ""}
          {currentWord}
        </span>

        <motion.span
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "0.08em",
            left: 0,
            x: blobLeft,
            width: blobWidth,
            height: safeBlobSize,
            marginLeft: blobMarginLeft,
            marginBottom: blobMarginBottom,
            borderRadius: 9999,
            backgroundColor: blobColor,
            display: "block",
            pointerEvents: "none",
            opacity: blobReady ? 1 : 0,
            willChange: "transform, width, background-color",
          }}
        />
      </span>
    </div>
  );
}
