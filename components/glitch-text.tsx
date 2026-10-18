"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

interface ShakeValue {
  enabled: boolean;
  intensity: number;
  x: number;
  y: number;
}

interface SliceValue {
  enabled: boolean;
  intensity: number;
  minHeight: number;
  maxHeight: number;
}

interface FontValue {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  letterSpacing?: number | string;
  lineHeight?: number | string;
}

interface TransitionValue {
  duration?: number;
  delay?: number;
  ease?: any;
}

interface GlitchEffectProps {
  mode?: "text" | "image";
  text?: string;
  font?: FontValue;
  color?: string;
  imageSrc?: string;
  imageAlt?: string;
  playMode?: "hover" | "enter";
  startAlign?: "top" | "center" | "bottom";
  replay?: boolean;
  transition?: TransitionValue;
  infinite?: boolean;
  repeat?: number;
  shake?: ShakeValue;
  slice?: SliceValue;
}

function easeToCss(ease: any): string {
  if (Array.isArray(ease) && ease.length === 4)
    return `cubic-bezier(${ease.join(",")})`;
  switch (ease) {
    case "linear":
      return "linear";
    case "easeIn":
      return "cubic-bezier(0.42, 0, 1, 1)";
    case "easeOut":
      return "cubic-bezier(0, 0, 0.58, 1)";
    case "easeInOut":
      return "cubic-bezier(0.42, 0, 0.58, 1)";
    default:
      return "linear";
  }
}

function buildSliceKeyframes(
  minHeight: number,
  maxHeight: number,
  hueRotate: boolean
): string {
  const steps = 8;
  let frames = "";
  for (let i = 0; i <= steps; i++) {
    const pct = (i / steps) * 100;
    const offset = (Math.random() * 2 - 1) * 10;
    const height = minHeight + Math.random() * (maxHeight - minHeight);
    const hue = hueRotate ? Math.floor(Math.random() * 360) : 0;
    frames += `${pct}% { clip-path: inset(${Math.max(
      0,
      Math.min(100 - height, 50 + offset)
    )}% 0 ${Math.max(0, height)}% 0); filter: hue-rotate(${hue}deg); }\n`;
  }
  return frames;
}

export default function GlitchEffect({
  mode = "text",
  text = "GLITCH TEXT",
  font = {
    fontFamily: "Inter",
    fontSize: 64,
    fontWeight: 700,
    letterSpacing: 0,
    lineHeight: 1,
  },
  color = "#FFFFFF",
  imageSrc,
  imageAlt = "glitch",
  playMode = "enter",
  startAlign = "center",
  replay = true,
  transition = { duration: 2, ease: "easeInOut", delay: 0 },
  infinite = true,
  repeat = 1,
  shake = { enabled: true, intensity: 10, x: 10, y: 10 },
  slice = { enabled: true, intensity: 50, minHeight: 25, maxHeight: 75 },
}: GlitchEffectProps) {
  const haveContent = mode === "text" ? true : !!imageSrc;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationName = useMemo(
    () => `glitch-anim-${Math.random().toString(36).slice(2)}`,
    []
  );

  const timing = useMemo(
    () => ({
      duration:
        (typeof transition?.duration === "number" ? transition.duration : 2) *
        1000,
      delay:
        (typeof transition?.delay === "number" ? transition.delay : 0) * 1000,
      easing: easeToCss(transition?.ease),
      iterations: infinite ? Infinity : repeat,
    }),
    [transition, infinite, repeat]
  );

  const keyframes = useMemo(() => {
    if (!slice.enabled) return "";
    return buildSliceKeyframes(slice.minHeight, slice.maxHeight, true);
  }, [slice.enabled, slice.minHeight, slice.maxHeight, animationName]);

  const startGlitch = () => setIsPlaying(true);
  const stopGlitch = () => setIsPlaying(false);

  useEffect(() => {
    if (playMode !== "hover") return;
    const el = wrapperRef.current;
    if (!el) return;
    const onEnter = () => startGlitch();
    const onLeave = () => stopGlitch();
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [playMode]);

  useEffect(() => {
    if (playMode !== "enter") return;
    const el = wrapperRef.current;
    if (!el) return;
    stopGlitch();
    let entered = false;
    const threshold =
      startAlign === "top" ? 0 : startAlign === "center" ? 0.5 : 1;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!entered) {
            entered = true;
            startGlitch();
            if (!replay) io.disconnect();
          }
        } else if (replay) {
          entered = false;
          stopGlitch();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [playMode, startAlign, replay]);

  const mainStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const shakeStyle: CSSProperties =
    isPlaying && shake.enabled
      ? {
          animation: `${animationName}-shake ${Math.max(
            50,
            1000 / Math.max(1, shake.intensity)
          )}ms linear infinite`,
        }
      : {};

  const sliceStyle: CSSProperties =
    isPlaying && slice.enabled
      ? {
          animation: `${animationName}-slice ${Math.max(
            50,
            1000 / Math.max(1, slice.intensity)
          )}ms steps(1) infinite`,
        }
      : {};

  const content =
    mode === "image" ? (
      <img
        src={imageSrc}
        alt={imageAlt}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          display: "block",
        }}
      />
    ) : (
      <span
        style={{
          color,
          fontFamily: font?.fontFamily,
          fontSize: font?.fontSize ?? 64,
          fontWeight: font?.fontWeight ?? 700,
          letterSpacing: font?.letterSpacing,
          lineHeight: font?.lineHeight ?? 1,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
    );

  if (!haveContent) {
    return (
      <div style={{ width: "100%", height: "100%" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            color: "#888",
            fontFamily: "sans-serif",
            textAlign: "center",
            padding: 16,
          }}
        >
          <strong>Glitch Effect</strong>
          <span style={{ fontSize: 13 }}>
            Add an image to see the glitch effect.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} id="glitch-effect-wrapper" style={mainStyle}>
      <style>{`
        @keyframes ${animationName}-shake {
          0% { transform: translate(0, 0); }
          20% { transform: translate(${shake.x / 10}px, ${-shake.y / 10}px); }
          40% { transform: translate(${-shake.x / 10}px, ${shake.y / 10}px); }
          60% { transform: translate(${shake.x / 15}px, ${shake.y / 15}px); }
          80% { transform: translate(${-shake.x / 15}px, ${-shake.y / 15}px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes ${animationName}-slice {
          ${keyframes}
        }
      `}</style>
      <div
        id="glitch-effect-content"
        ref={contentRef}
        style={{
          ...mainStyle,
          width: "fit-content",
          transitionDuration: `${timing.duration}ms`,
          transitionDelay: `${timing.delay}ms`,
          transitionTimingFunction: timing.easing,
          ...shakeStyle,
          ...sliceStyle,
        }}
      >
        {content}
      </div>
    </div>
  );
}
