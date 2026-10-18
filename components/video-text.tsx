"use client";

import * as React from "react";
import { useId, useLayoutEffect, useRef, useState } from "react";

type FontStyle = React.CSSProperties & {
  fontFamily?: string;
  fontWeight?: number | string;
  fontStyle?: string;
  fontSize?: number | string;
  letterSpacing?: number | string;
  lineHeight?: number | string;
  textAlign?: React.CSSProperties["textAlign"];
};

type Preload = "auto" | "metadata" | "none";
type VideoSource = "upload" | "url";

type Props = {
  text?: string;
  videoSource?: VideoSource;
  src?: string;
  srcUrl?: string;
  font?: FontStyle;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: Preload;
  style?: React.CSSProperties;
};

type Size = {
  width: number;
  height: number;
};

const DEFAULT_FONT: FontStyle = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: "120px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  lineHeight: "1em",
  textAlign: "center",
};

const mapTextAnchor = (
  textAlign: FontStyle["textAlign"]
): "start" | "middle" | "end" => {
  if (textAlign === "right" || textAlign === "end") return "end";
  if (textAlign === "left" || textAlign === "start") return "start";
  return "middle";
};

const mapTextX = (textAlign: FontStyle["textAlign"], width: number): number => {
  if (textAlign === "right" || textAlign === "end") return width;
  if (textAlign === "left" || textAlign === "start") return 0;
  return width / 2;
};

const toCssFontSize = (fontSize: FontStyle["fontSize"]): string => {
  if (typeof fontSize === "number") return `${fontSize}px`;
  if (typeof fontSize === "string" && fontSize.length > 0) return fontSize;
  return "120px";
};

const sanitizeClipId = (reactId: string): string =>
  `video-text-clip-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

export default function VideoText({
  text = "VIDEO TEXT",
  videoSource = "url",
  src = "",
  srcUrl = "https://cdn.magicui.design/ocean-small.webm",
  font = DEFAULT_FONT,
  autoPlay = true,
  muted = true,
  loop = true,
  preload = "auto",
  style,
}: Props) {
  const content = text || "VIDEO";
  const videoSrc =
    videoSource === "url" ? srcUrl?.trim() || "" : src?.trim() || "";

  const containerRef = useRef<HTMLDivElement>(null);
  const clipTextRef = useRef<SVGTextElement>(null);
  const textAlignRef = useRef(font.textAlign);
  textAlignRef.current = font.textAlign;

  const reactId = useId();
  const clipId = sanitizeClipId(reactId);

  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [fontsReady, setFontsReady] = useState(0);

  const textAnchor = mapTextAnchor(font.textAlign);
  const fontSize = toCssFontSize(font.fontSize);

  const syncClipGeometry = (width: number, height: number) => {
    const nextWidth = Math.max(0, Math.floor(width));
    const nextHeight = Math.max(0, Math.floor(height));

    const textEl = clipTextRef.current;
    if (textEl) {
      textEl.setAttribute(
        "x",
        String(mapTextX(textAlignRef.current, nextWidth))
      );
      textEl.setAttribute("y", String(nextHeight / 2));
    }

    setSize((prev) => {
      if (prev.width === nextWidth && prev.height === nextHeight) {
        return prev;
      }
      return { width: nextWidth, height: nextHeight };
    });
  };

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    syncClipGeometry(node.clientWidth, node.clientHeight);

    const observer = new ResizeObserver(() => {
      syncClipGeometry(node.clientWidth, node.clientHeight);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;

    let cancelled = false;

    const bump = () => {
      if (!cancelled) setFontsReady((value) => value + 1);
    };

    document.fonts.ready.then(bump).catch(() => {});

    if (font.fontFamily) {
      const weight = font.fontWeight ?? 700;
      const fontStyleValue = font.fontStyle ?? "normal";
      document.fonts
        .load(`${fontStyleValue} ${weight} ${fontSize} ${font.fontFamily}`)
        .then(bump)
        .catch(() => {});
    }

    document.fonts.addEventListener?.("loadingdone", bump);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener?.("loadingdone", bump);
    };
  }, [content, font.fontFamily, font.fontWeight, font.fontStyle, fontSize]);

  const hasSize = size.width > 0 && size.height > 0;
  const textX = mapTextX(font.textAlign, size.width);
  const textY = size.height / 2;
  const clipUrl = hasSize ? `url(#${clipId})` : undefined;

  const textStyle: React.CSSProperties = {
    fontFamily: font.fontFamily,
    fontWeight: font.fontWeight,
    fontStyle: font.fontStyle,
    fontSize,
    letterSpacing: font.letterSpacing,
    fontFeatureSettings: (font as React.CSSProperties).fontFeatureSettings,
    fontVariationSettings: (font as React.CSSProperties).fontVariationSettings,
    textTransform: (font as React.CSSProperties).textTransform,
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "clip",
        clipPath: "inset(0)",
        contain: "paint",
        isolation: "isolate",
        ...style,
      }}
    >
      <svg
        width={0}
        height={0}
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <text
              key={fontsReady}
              ref={clipTextRef}
              x={textX}
              y={textY}
              textAnchor={textAnchor}
              dominantBaseline="central"
              style={textStyle}
            >
              {content}
            </text>
          </clipPath>
        </defs>
      </svg>

      {videoSrc && hasSize ? (
        <video
          key={videoSrc}
          src={videoSrc}
          style={
            {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              maxWidth: "none",
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
              pointerEvents: "none",
              clipPath: clipUrl,
              WebkitClipPath: clipUrl,
            } as React.CSSProperties
          }
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          preload={preload}
          playsInline
        />
      ) : null}

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
        {content}
      </span>
    </div>
  );
}
