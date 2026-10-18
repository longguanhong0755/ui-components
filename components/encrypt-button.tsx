"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const DEFAULTS = {
  label: "Hover Me",
  font: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: 24,
    lineHeight: "1.2em",
    letterSpacing: "0em",
    textAlign: "left" as const,
  },
  fill: "#FFFFFF",
  textColor: "#000000",
  hoverTextColor: "#000000",
  paddingX: 48,
  paddingY: 24,
  rounded: 16,
  scrambleOptions: {
    speed: 60,
    cycles: 4,
    chars: "!@#$%^&*():{};|,.<>/?",
  },
  sweep: true,
  sweepOptions: {
    color: "#818CF8",
    speed: 7,
    count: 2,
    width: 8,
  },
  border: false,
  borderOptions: { color: "#737373", width: 1 },
  transition: {
    type: "tween",
    stiffness: 800,
    damping: 60,
    mass: 1,
    duration: 0.3,
    ease: "easeInOut",
  },
};

const MIN_STEP_MS = 16;

const SWEEP_SECONDS_SLOW = 2;
const SWEEP_SECONDS_FAST = 0.15;
const TRAIL_SHORT = 6;
const TRAIL_LONG = 50;
const FACE_AT = 50;
const FACE_EDGE = 1.5;
const BAND_SCALE = 1.25;
const FLIP_SHARE = 0.001;

/** A 1–10 slider onto the values its ends stand for. */
const mapSlider = (value: number, atOne: number, atTen: number) => {
  const t = (Math.min(10, Math.max(1, value)) - 1) / 9;
  return atOne + (atTen - atOne) * t;
};

interface ScrambleOptions {
  speed: number;
  cycles: number;
  chars: string;
}

interface SweepOptions {
  color: string;
  speed: number;
  count: number;
  width: number;
}

interface BorderOptions {
  color: string;
  width: number;
}

interface EncryptButtonProps {
  label?: string;
  font?: CSSProperties;
  fill?: string;
  textColor?: string;
  hoverTextColor?: string;
  paddingX?: number;
  paddingY?: number;
  rounded?: number;
  scrambleOptions?: ScrambleOptions;
  sweep?: boolean;
  sweepOptions?: SweepOptions;
  border?: boolean;
  borderOptions?: BorderOptions;
  transition?: any;
  style?: CSSProperties;
}

/**
 * Encrypt Button
 *
 * Hover it and the label is overwritten with junk, then decrypted back into
 * itself a letter at a time, left to right, while a band of light sweeps up
 * behind the glass.
 *
 * The label is measured, not guessed: the real text is laid out underneath and
 * the scramble is painted over it. A proportional font's junk characters are not
 * the width of the letters they stand in for, so a button sized to the scramble
 * would twitch on every shuffle.
 */
function __BaseImpl_EncryptButton(props: EncryptButtonProps) {
  const {
    label = DEFAULTS.label,
    font = DEFAULTS.font,
    fill = DEFAULTS.fill,
    textColor = DEFAULTS.textColor,
    hoverTextColor = DEFAULTS.hoverTextColor,
    paddingX = DEFAULTS.paddingX,
    paddingY = DEFAULTS.paddingY,
    rounded = DEFAULTS.rounded,
    scrambleOptions = DEFAULTS.scrambleOptions,
    sweep = DEFAULTS.sweep,
    sweepOptions = DEFAULTS.sweepOptions,
    border = DEFAULTS.border,
    borderOptions = DEFAULTS.borderOptions,
    transition = DEFAULTS.transition,
    style,
  } = props;

  const [text, setText] = useState(label);
  const [hover, setHover] = useState(false);
  const rafRef = useRef<number | null>(null);

  const configRef = useRef<any>(null);
  configRef.current = { label, scrambleOptions };

  const borderColor = borderOptions?.color ?? DEFAULTS.borderOptions.color;
  const borderWidth = border ? (borderOptions?.width ?? 0) : 0;
  const sweepColor = sweepOptions?.color ?? DEFAULTS.sweepOptions.color;
  const sweepSeconds = mapSlider(
    sweepOptions?.speed ?? DEFAULTS.sweepOptions.speed,
    SWEEP_SECONDS_SLOW,
    SWEEP_SECONDS_FAST
  );
  const sweepCount = Math.max(
    1,
    Math.round(sweepOptions?.count ?? DEFAULTS.sweepOptions.count)
  );
  const trail = mapSlider(
    sweepOptions?.width ?? DEFAULTS.sweepOptions.width,
    TRAIL_SHORT,
    TRAIL_LONG
  );

  const yKeyframes: string[] = ["-100%"];
  const yTimes: number[] = [0];
  const flipKeyframes: number[] = [];
  const flipTimes: number[] = [];
  for (let i = 0; i < sweepCount; i++) {
    const downward = i % 2 === 0;
    const start = i / sweepCount;
    const end = (i + 1) / sweepCount;
    yKeyframes.push(downward ? "100%" : "-100%");
    yTimes.push(end);
    const facing = downward ? BAND_SCALE : -BAND_SCALE;
    flipKeyframes.push(facing, facing);
    flipTimes.push(
      start,
      i === sweepCount - 1 ? end : end - FLIP_SHARE / sweepCount
    );
  }

  const stopScramble = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setText(configRef.current.label);
  };

  const startScramble = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const { label: target, scrambleOptions: opts } = configRef.current;
    const chars = opts?.chars?.length
      ? opts.chars
      : DEFAULTS.scrambleOptions.chars;
    const cycles = Math.max(
      1,
      opts?.cycles ?? DEFAULTS.scrambleOptions.cycles
    );
    const speed = Math.max(1, opts?.speed ?? DEFAULTS.scrambleOptions.speed);
    const stepMs = Math.max(MIN_STEP_MS, 1000 / speed);
    const letters = [...target];
    const total = letters.length * cycles;

    let step = 0;
    let last = 0;
    const tick = (now: number) => {
      if (!last) last = now;
      if (now - last >= stepMs) {
        last = now;
        const scrambled = letters
          .map((char, index) => {
            if (step / cycles > index) return char;
            if (!char.trim()) return char;
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("");
        setText(scrambled);
        step++;
        if (step >= total) {
          rafRef.current = null;
          setText(target);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (rafRef.current == null) setText(label);
  }, [label]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <motion.div
      aria-label={label}
      initial={false}
      onHoverStart={() => {
        setHover(true);
        startScramble();
      }}
      onHoverEnd={() => {
        setHover(false);
        stopScramble();
      }}
      style={{
        ...style,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        width: "fit-content",
        padding: `${paddingY}px ${paddingX}px`,
        borderRadius: rounded,
        background: fill,
        border:
          borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : "none",
        cursor: "pointer",
        overflow: "hidden",
        textDecoration: "none",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      {sweep && hover ? (
        <motion.span
          aria-hidden
          initial={{ y: "-100%", scaleY: BAND_SCALE }}
          animate={{ y: yKeyframes, scaleY: flipKeyframes }}
          transition={{
            y: {
              duration: sweepSeconds * sweepCount,
              ease: "linear",
              times: yTimes,
            },
            scaleY: {
              duration: sweepSeconds * sweepCount,
              ease: "linear",
              times: flipTimes,
            },
          }}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            scaleX: BAND_SCALE,
            background: `linear-gradient(to bottom, transparent ${FACE_AT - trail}%, ${sweepColor} ${FACE_AT}%, transparent ${FACE_AT + FACE_EDGE}%)`,
            pointerEvents: "none",
          }}
        />
      ) : null}

      <motion.span
        initial={false}
        animate={{ color: hover ? hoverTextColor : textColor }}
        transition={transition}
        style={{
          position: "relative",
          zIndex: 1,
          display: "inline-flex",
          alignItems: "center",
          ...font,
        }}
      >
        <span style={{ position: "relative", display: "inline-block" }}>
          <span style={{ visibility: "hidden" }}>{label}</span>
          <span
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {text}
          </span>
        </span>
      </motion.span>
    </motion.div>
  );
}

EncryptButton.displayName = "Encrypt Button";

const __presetProps = {
  "fill": "#FFFFFF",
  "font": {
    "variant": "Bold",
    "fontSize": 24,
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 700,
    "lineHeight": "1.2em",
    "letterSpacing": "0em"
  },
  "label": "Hover Me",
  "sweep": true,
  "border": false,
  "rounded": 16,
  "paddingX": 48,
  "paddingY": 24,
  "textColor": "#000000",
  "transition": {
    "ease": "easeInOut",
    "mass": 1,
    "type": "tween",
    "damping": 60,
    "duration": 0.3,
    "stiffness": 800
  },
  "sweepOptions": {
    "color": "#818CF8",
    "count": 2,
    "speed": 7,
    "width": 8
  },
  "borderOptions": {
    "color": "#737373",
    "width": 1
  },
  "hoverTextColor": "#000000",
  "scrambleOptions": {
    "chars": "!@#$%^&*():{};|,.<>/?",
    "speed": 60,
    "cycles": 4
  }
};

export default function EncryptButton(props: Record<string, unknown>) {
  return <__BaseImpl_EncryptButton {...(__presetProps as Record<string, unknown>)} {...props} />;
}
