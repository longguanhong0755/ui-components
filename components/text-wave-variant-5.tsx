"use client";

import { useEffect, useRef, useState, useId, type CSSProperties } from "react";

interface FontValue {
    fontFamily?: string;
    fontWeight?: number;
    fontSize?: number | string;
    lineHeight?: number | string;
    letterSpacing?: number | string;
    textAlign?: string;
    [key: string]: unknown;
}

interface ColorsValue {
    paletteCount?: number;
    [key: string]: string | number | undefined;
}

interface CharacterBgProps {
    speed?: number;
    reverse?: boolean;
    gap?: number;
    backgroundColor?: string;
    style?: CSSProperties;
    font?: FontValue;
    gridText?: string;
    colors?: ColorsValue;
}

interface Rgb {
    r: number;
    g: number;
    b: number;
}

function parseColor(input?: string): Rgb {
    if (!input) return { r: 255, g: 255, b: 255 };
    const s = input.trim();
    if (s[0] === "#") {
        let h = s.slice(1);
        if (h.length === 3)
            h = h
                .split("")
                .map((c) => c + c)
                .join("");
        const n = parseInt(h.slice(0, 6), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
        const p = m[1].split(",").map((v) => parseFloat(v));
        return { r: p[0] || 0, g: p[1] || 0, b: p[2] || 0 };
    }
    return { r: 255, g: 255, b: 255 };
}

function paletteAt(colors: string[], p: number): string {
    if (colors.length === 0) return "rgb(255, 255, 255)";
    if (colors.length === 1) return colors[0];
    const scaled = Math.max(0, Math.min(1, p)) * (colors.length - 1);
    const i = Math.floor(scaled);
    const f = scaled - i;
    const a = parseColor(colors[i]);
    const b = parseColor(colors[Math.min(i + 1, colors.length - 1)]);
    return `rgb(${Math.round(a.r + (b.r - a.r) * f)}, ${Math.round(
        a.g + (b.g - a.g) * f
    )}, ${Math.round(a.b + (b.b - a.b) * f)})`;
}

const useInstanceId = () => {
    const id = useId();
    const cleanId = id.replace(/:/g, "");
    return `character-bg-${cleanId}`;
};

function useInView(ref: React.RefObject<HTMLElement>) {
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setInView(entry.isIntersecting),
            { threshold: 0 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref]);
    return inView;
}

function __BaseImpl_CharacterBg({
    speed = 61,
    reverse = true,
    gap = 10,
    backgroundColor = "#000000",
    style,
    font = {
        fontFamily: "Inter",
        fontWeight: 400,
        fontSize: 14,
        lineHeight: 1,
        letterSpacing: 0,
        textAlign: "left",
    },
    gridText = "Text Wave",
    colors: colorsProp = {
        paletteCount: 1,
        color1: "#FFFFFF",
        color2: "#FFFFFF",
        color3: "#FFFFFF",
        color4: "#FFFFFF",
        color5: "#FFFFFF",
    },
}: CharacterBgProps) {
    const instanceId = useInstanceId();

    const palette: string[] = (() => {
        const entries: string[] = [];
        if (colorsProp) {
            const count = Math.max(1, Math.min(5, colorsProp.paletteCount || 1));
            for (let i = 1; i <= count; i++) {
                const v = colorsProp[`color${i}`];
                if (typeof v === "string" && v.trim().length > 0)
                    entries.push(v.trim());
            }
        }
        return entries.length ? entries : ["#FFFFFF"];
    })();

    const parsedFontSize = parseFloat(String(font?.fontSize));
    const tileSize =
        Math.max(isNaN(parsedFontSize) ? 14 : parsedFontSize, 10) + (gap || 0);

    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(containerRef);

    const cols =
        Math.max(1, Math.ceil(dimensions.width / tileSize)) +
        (Math.ceil(dimensions.width / tileSize) % 2 === 1 ? 1 : 0);
    const rows = Math.max(1, Math.ceil(dimensions.height / tileSize));
    const n = cols * rows;

    useEffect(() => {
        if (!containerRef.current) return;
        const element = containerRef.current;
        setDimensions({
            width: element.offsetWidth,
            height: element.offsetHeight,
        });
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const el = entry.target as HTMLElement;
                setDimensions({
                    width: el.offsetWidth,
                    height: el.offsetHeight,
                });
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [tileSize]);

    useEffect(() => {
        if (!isInView) return;
        let animationFrame: number;
        let time = 0;
        let lastFrameTime = 0;
        const frameInterval = 1e3 / 30;
        const updateTime = (timestamp: number) => {
            if (!lastFrameTime || timestamp - lastFrameTime >= frameInterval) {
                const direction = reverse ? -1 : 1;
                time = (time + 10 * direction) % 864e5;
                if (mainRef.current) {
                    mainRef.current.style.setProperty("--t", String(time));
                    mainRef.current.style.setProperty(
                        "--speed-factor",
                        String(speed / 25)
                    );
                }
                lastFrameTime = timestamp;
            }
            animationFrame = requestAnimationFrame(updateTime);
        };
        animationFrame = requestAnimationFrame(updateTime);
        return () => cancelAnimationFrame(animationFrame);
    }, [speed, reverse, isInView]);

    const styleContent = `
@property --t {
  syntax: "<integer>";
  initial-value: 0;
  inherits: true
}

@property --speed-factor {
  syntax: "<number>";
  initial-value: 1;
  inherits: true
}

div.${instanceId}-c {
  position: relative;
  width: fit-content;
  height: fit-content;
  margin: 0 auto;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

div.${instanceId}-l {
  position: absolute;
  --offset-x: calc(var(--x) - 0.5);
  --abs-x: calc(max(var(--offset-x), -1 * var(--offset-x)));
  --offset-y: calc(var(--y) - 0.5);
  --abs-y: calc(max(var(--offset-y), -1 * var(--offset-y)));
  will-change: transform, opacity;

  --l: calc(
      sin(var(--abs-x) / cos(sin(var(--abs-y) * 2 + 60) * 2.5) * 3 - (var(--t) * var(--speed-factor)) / 350)
    );
	color: var(--base-color);
	opacity: max(var(--l), 0.05);

  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  width: ${tileSize}px;
  height: ${tileSize}px;
}`;

    return (
        <div
            ref={containerRef}
            style={{
                overflow: "hidden",
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 0,
                minHeight: 0,
                backgroundColor,
                ...style,
                ...(font as CSSProperties),
            }}
        >
            <style>{styleContent}</style>
            <div
                ref={mainRef}
                className={`${instanceId}-c`}
                style={
                    {
                        "--t": 0,
                        width: `${cols * tileSize}px`,
                        height: `${rows * tileSize}px`,
                        pointerEvents: "none",
                    } as CSSProperties
                }
            >
                {Array.from({ length: n }).map((_, i) => {
                    const x = (i % cols) * tileSize;
                    const y = Math.floor(i / cols) * tileSize;
                    const xRatio = ((i + 1) % cols) / (cols + 1);
                    const yRatio = (rows - Math.floor(i / cols)) / rows;
                    const col = i % cols;
                    const t = cols > 1 ? col / (cols - 1) : 0;
                    const baseColor = paletteAt(palette, t);
                    const textContent =
                        gridText.split("")[i % Math.max(1, gridText.length)];
                    return (
                        <div
                            className={`${instanceId}-l`}
                            style={
                                {
                                    "--x": xRatio,
                                    "--y": yRatio,
                                    "--base-color": baseColor,
                                    left: x,
                                    top: y,
                                } as CSSProperties
                            }
                            key={i}
                        >
                            {textContent}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const __presetProps = {
  "gridText": "0123456789",
  "font": {
    "variant": "Regular",
    "fontSize": 14,
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 400,
    "lineHeight": 1,
    "letterSpacing": 0
  },
  "colors": {
    "color1": "#FFFFFF",
    "color2": "#FFFFFF",
    "color3": "#FFFFFF",
    "color4": "#FFFFFF",
    "color5": "#FFFFFF",
    "paletteCount": 1
  },
  "backgroundColor": "#000000",
  "speed": 20,
  "gap": 1,
  "reverse": false
};

export default function CharacterBg(props: Record<string, unknown>) {
  return <__BaseImpl_CharacterBg {...(__presetProps as Record<string, unknown>)} {...props} />;
}
