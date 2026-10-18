"use client";

import { useEffect, useRef } from "react";

const DAMPING = 0.82;
const MAX_CHROMA = 5;

interface MeshTextProps {
  text?: string;
  color?: string;
  background?: string;
  font?: {
    fontFamily?: string;
    variant?: string;
    fontWeight?: number;
    fontStyle?: string;
    fontSize?: number;
    lineHeight?: string;
    letterSpacing?: string;
    textAlign?: string;
  };
  snap?: number;
  gap?: number;
  chromaColors?: string[];
  tag?: "div" | "section" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
}

const VARIANT_WEIGHTS: Record<string, number> = {
  Thin: 100,
  Hairline: 100,
  ExtraLight: 200,
  UltraLight: 200,
  Light: 300,
  Regular: 400,
  Normal: 400,
  Book: 400,
  Medium: 500,
  SemiBold: 600,
  DemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  UltraBold: 800,
  Black: 900,
  Heavy: 900,
};

function variantToWeight(variant?: string): number {
  if (!variant) return 400;
  const base = variant
    .replace(/\s*Italic\s*/i, "")
    .trim()
    .replace(/\s+/g, "");
  return VARIANT_WEIGHTS[base] ?? 400;
}

function variantIsItalic(variant?: string): boolean {
  return !!variant && /italic/i.test(variant);
}

function __BaseImpl_MeshText({
  text = "SPRING TEXT",
  color = "#ffffff",
  background = "#000000",
  font = {
    fontFamily: "Inter",
    variant: "Bold",
    fontWeight: 400,
    fontSize: 120,
    lineHeight: "1em",
    letterSpacing: "0em",
    textAlign: "left",
  },
  snap = 10,
  gap = 20,
  chromaColors = ["#00FFB3", "#7B00FF", "#F9731A"],
  tag = "div",
}: MeshTextProps) {
  const Tag = tag as any;

  const colors: string[] = Array.isArray(chromaColors)
    ? chromaColors.filter(Boolean).slice(0, MAX_CHROMA)
    : ["#00FFB3", "#7B00FF", "#F9731A"];

  const makeCfg = () => ({
    springK: 0.001 * Math.pow(20, Math.max(0, Math.min(20, snap)) / 20),
    gap,
    colors,
  });
  const cfgRef = useRef(makeCfg());
  cfgRef.current = makeCfg();

  const typeface = font ?? {};
  const fontVariant: string = typeface?.variant ?? "Regular";
  const resolvedWeight: number =
    typeof typeface?.fontWeight === "number"
      ? typeface.fontWeight
      : variantToWeight(fontVariant);
  const resolvedStyle: string =
    typeof typeface?.fontStyle === "string"
      ? typeface.fontStyle
      : variantIsItalic(fontVariant)
        ? "italic"
        : "normal";
  const textAlign: string = typeface?.textAlign ?? "center";
  const fontStyleObj = Object.fromEntries(
    Object.entries(typeface).filter(
      ([k]) =>
        k !== "textAlign" &&
        k !== "variant" &&
        k !== "fontWeight" &&
        k !== "fontStyle"
    )
  );

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const wordRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const word = wordRef.current;
    if (!wrapper || !word) return;

    let center = { x: 0, y: 0 };
    let limitX = 0;
    let limitY = 0;
    const measure = () => {
      const prev = word.style.transform;
      word.style.transform = "";
      const r = word.getBoundingClientRect();
      const w = wrapper.getBoundingClientRect();
      word.style.transform = prev;
      center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      limitX = Math.max(0, (w.width - r.width) / 2);
      limitY = Math.max(0, (w.height - r.height) / 2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapper);
    ro.observe(word);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    let dispX = 0;
    let dispY = 0;
    let velX = 0;
    let velY = 0;

    const trailX = new Float32Array(MAX_CHROMA);
    const trailY = new Float32Array(MAX_CHROMA);

    const cursor = { x: -9999, y: -9999, inside: false };

    const onMove = (e: PointerEvent) => {
      cursor.inside = true;
      cursor.x = e.clientX;
      cursor.y = e.clientY;
    };
    const onLeave = () => {
      cursor.inside = false;
    };
    wrapper.addEventListener("pointermove", onMove);
    wrapper.addEventListener("pointerleave", onLeave);

    let rafId = 0;
    const tick = () => {
      const cfg = cfgRef.current;

      let targetX = 0;
      let targetY = 0;
      if (cursor.inside) {
        targetX = cursor.x - center.x;
        targetY = cursor.y - center.y;
      }

      targetX = Math.max(-limitX, Math.min(limitX, targetX));
      targetY = Math.max(-limitY, Math.min(limitY, targetY));

      velX += (targetX - dispX) * cfg.springK;
      velY += (targetY - dispY) * cfg.springK;

      velX *= DAMPING;
      velY *= DAMPING;

      dispX += velX;
      dispY += velY;

      const mag = Math.hypot(dispX, dispY);
      word.style.transform =
        mag < 0.1
          ? ""
          : `translate3d(${dispX.toFixed(2)}px, ${dispY.toFixed(2)}px, 0)`;

      const n = cfg.colors.length;
      if (n === 0 || cfg.gap === 0) {
        word.style.textShadow = "";
      } else {
        const speed = Math.hypot(velX, velY);
        const ramp = Math.min(1, speed / 2);
        const dirX = speed > 0.001 ? (velX / speed) * ramp : 0;
        const dirY = speed > 0.001 ? (velY / speed) * ramp : 0;
        const parts: string[] = [];
        for (let i = 0; i < n; i++) {
          const offX = -dirX * cfg.gap * (i + 1);
          const offY = -dirY * cfg.gap * (i + 1);
          trailX[i] += (offX - trailX[i]) * 0.25;
          trailY[i] += (offY - trailY[i]) * 0.25;
          parts.push(
            `${trailX[i].toFixed(2)}px ${trailY[i].toFixed(2)}px 0 ${cfg.colors[i]}`
          );
        }
        word.style.textShadow = parts.join(",");
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      wrapper.removeEventListener("pointermove", onMove);
      wrapper.removeEventListener("pointerleave", onLeave);
    };
  }, [text]);

  return (
    <Tag
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background,
        overflow: "hidden",
        userSelect: "none",
        textAlign: textAlign as any,
        color,
        cursor: "default",
        fontWeight: resolvedWeight,
        fontStyle: resolvedStyle,
        ...fontStyleObj,
      }}
    >
      <span
        ref={wordRef}
        style={{
          display: "inline-block",
          whiteSpace: "pre",
          willChange: "transform, text-shadow",
        }}
      >
        {text}
      </span>
    </Tag>
  );
}

const __presetProps = {
  "gap": 20,
  "tag": "div",
  "font": {
    "variant": "Bold",
    "fontSize": 120,
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 700,
    "lineHeight": "1em",
    "letterSpacing": "0em"
  },
  "snap": 10,
  "text": "SPRING TEXT",
  "color": "#ffffff",
  "background": "#000000",
  "chromaColors": [
    "#00FFB3",
    "#7B00FF",
    "#F9731A"
  ]
};

export default function MeshText(props: Record<string, unknown>) {
  return <__BaseImpl_MeshText {...(__presetProps as Record<string, unknown>)} {...props} />;
}
