"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";

type FontStyle = React.CSSProperties & {
  fontFamily?: string;
  fontWeight?: number | string;
  fontSize?: number | string;
  letterSpacing?: number | string;
  lineHeight?: number | string;
};

type TransitionValue = {
  type?: string;
  stiffness?: number;
  damping?: number;
  mass?: number;
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
  cursorColor?: string;
  cursorBorderColor?: string;
  cursorWidth?: number;
  cursorHeight?: number;
  deletingSpeed?: number;
  transition?: TransitionValue;
  style?: React.CSSProperties;
};

const DEFAULT_TEXTS = ["TYPE SEQUENCE"];

const DEFAULT_FONT: FontStyle = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontWeight: 400,
  fontSize: "120px",
  letterSpacing: "-0.04em",
  lineHeight: "1.15em",
  textAlign: "left",
};

const DEFAULT_TRANSITION: TransitionValue = {
  type: "tween",
  stiffness: 800,
  damping: 60,
  mass: 1,
  duration: 0.055,
  delay: 1.8,
  ease: "linear",
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

type Phase = "typing" | "holding" | "deleting";

function __BaseImpl_TypewriterText(props: Props) {
  const {
    prefix = "",
    texts = DEFAULT_TEXTS,
    font = DEFAULT_FONT,
    color = "#FFFFFF",
    prefixColor = "#FFFFFF",
    cursorColor = "#1A1A1A",
    cursorBorderColor = "#404040",
    cursorWidth = 12,
    cursorHeight = 40,
    deletingSpeed = 32,
    transition = DEFAULT_TRANSITION,
    style,
  } = props;

  const typingSpeed = Math.max(
    20,
    Math.round(
      (transition.duration ?? DEFAULT_TRANSITION.duration ?? 0.055) * 1000
    )
  );
  const holdDuration = transition.delay ?? DEFAULT_TRANSITION.delay ?? 1.8;

  const safeTexts = useMemo(() => {
    const list = (texts ?? DEFAULT_TEXTS)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    return list.length > 0 ? list : DEFAULT_TEXTS;
  }, [texts]);

  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [cursorOn, setCursorOn] = useState(true);

  const currentText = safeTexts[textIndex] ?? safeTexts[0] ?? "";
  const displayed = currentText.slice(0, charIndex);

  useEffect(() => {
    setTextIndex(0);
    setCharIndex(0);
    setPhase("typing");
    setCursorOn(true);
  }, [safeTexts]);

  useEffect(() => {
    if (phase !== "holding") {
      setCursorOn(true);
      return;
    }

    const id = window.setInterval(() => {
      setCursorOn((prev) => !prev);
    }, 530);

    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setCharIndex(currentText.length);
      setPhase("holding");
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    const holdMs = holdDuration * 1000;

    if (phase === "typing") {
      if (charIndex < currentText.length) {
        timer = setTimeout(() => {
          setCharIndex((i) => i + 1);
        }, typingSpeed);
      } else {
        timer = setTimeout(() => setPhase("holding"), 0);
      }
    } else if (phase === "holding") {
      timer = setTimeout(() => {
        setPhase("deleting");
      }, holdMs);
    } else if (phase === "deleting") {
      if (charIndex > 0) {
        timer = setTimeout(() => {
          setCharIndex((i) => i - 1);
        }, deletingSpeed);
      } else {
        timer = setTimeout(() => {
          setTextIndex((i) => (i + 1) % safeTexts.length);
          setPhase("typing");
        }, 0);
      }
    }

    return () => clearTimeout(timer);
  }, [
    phase,
    charIndex,
    currentText,
    typingSpeed,
    deletingSpeed,
    holdDuration,
    safeTexts.length,
  ]);

  const textAlign =
    (font.textAlign as React.CSSProperties["textAlign"]) ?? "left";

  return (
    <div
      role="text"
      aria-label={`${prefix.replace(/\n/g, " ")}${currentText}`}
      style={{
        ...font,
        width: "100%",
        height: "100%",
        color,
        textAlign,
        whiteSpace: "pre-wrap",
        ...style,
      }}
    >
      {prefix ? (
        <span style={{ color: prefixColor }}>{prefix}</span>
      ) : null}

      <span aria-hidden="true" style={{ color }}>
        {displayed}
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            boxSizing: "border-box",
            width: cursorWidth,
            height: cursorHeight,
            marginLeft: "0.08em",
            verticalAlign: "-0.08em",
            backgroundColor: cursorColor,
            border: `1.5px solid ${cursorBorderColor}`,
            borderRadius: 2,
            opacity: cursorOn ? 1 : 0,
            willChange: "opacity",
          }}
        />
      </span>

      <span
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {prefix.replace(/\n/g, " ")}
        {displayed}
      </span>
    </div>
  );
}

const __presetProps = {
  "font": {
    "variant": "Bold",
    "fontSize": "75px",
    "textAlign": "center",
    "fontFamily": "Inter",
    "fontWeight": 700,
    "lineHeight": "1.15em",
    "letterSpacing": "-0.04em"
  },
  "color": "#FFFFFF",
  "texts": [
    "TYPE SEQUENCE"
  ],
  "prefix": "",
  "transition": {
    "ease": "linear",
    "mass": 1,
    "type": "tween",
    "delay": 1.8,
    "damping": 60,
    "duration": 0.055,
    "stiffness": 800
  },
  "cursorColor": "#FF8D00",
  "cursorWidth": 8,
  "prefixColor": "#FFFFFF",
  "cursorHeight": 46,
  "deletingSpeed": 32,
  "cursorBorderColor": "#404040"
};

export default function TypewriterText(props: Record<string, unknown>) {
  return <__BaseImpl_TypewriterText {...(__presetProps as Record<string, unknown>)} {...props} />;
}
