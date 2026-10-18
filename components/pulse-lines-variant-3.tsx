"use client";

import { useEffect, useRef, useState, useId, type CSSProperties } from "react";

interface ColorsValue {
    paletteCount?: number;
    [key: string]: string | number | undefined;
}

interface WaveBgProps {
    shape?: "line" | "circle" | "square";
    cornerRadius?: number;
    type?: "vertical" | "horizontal";
    speed?: number;
    lineWidth?: number;
    gap?: number;
    scale?: number;
    backgroundColor?: string;
    style?: CSSProperties;
    colors?: ColorsValue;
    lineColor?: string;
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
    return `wave-bg-${cleanId}`;
};

function __BaseImpl_WaveBg({
    shape = "line",
    cornerRadius = 0,
    type = "vertical",
    speed = 99,
    lineWidth = 2,
    gap = 30,
    scale = 2.5,
    backgroundColor = "#000000",
    style,
    colors: colorsProp = {
        paletteCount: 1,
        color1: "#FFFFFF",
        color2: "#FFFFFF",
        color3: "#FFFFFF",
        color4: "#FFFFFF",
        color5: "#FFFFFF",
    },
    lineColor = "#222222",
}: WaveBgProps) {
    const instanceId = useInstanceId();
    const horizontal = type === "horizontal";

    const maxRadius = lineWidth / 2;
    const r =
        shape === "square" ? Math.max(0, Math.min(cornerRadius, maxRadius)) : 0;
    const strokeLinecap =
        shape === "circle" || (shape === "square" && r > 0) ? "round" : "butt";
    const dashWidth =
        shape === "line"
            ? 10 * scale
            : shape === "circle"
              ? 0.01
              : Math.max(0.01, lineWidth - 2 * r);

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

    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

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
    }, []);

    const styleContent = `
.${instanceId}-l {
	--dash-width: ${dashWidth};
	--gap-width: ${100 * scale};

	stroke-linecap: ${strokeLinecap};
	stroke-dasharray: var(--dash-width) var(--gap-width);
	stroke-dashoffset: var(--dash-width);
	will-change: stroke, stroke-dashoffset;
	animation: ${instanceId}-pulse 2s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate-reverse;
	animation-delay: var(--delay);
}

@keyframes ${instanceId}-pulse {
	0% { stroke-dashoffset: var(--dash-width); }
	50% { stroke: var(--pulse); }
	100% { stroke-dashoffset: calc(var(--gap-width) * -8px + 40px); }
}`;

    const span = horizontal ? dimensions.height : dimensions.width;
    const numLines =
        Math.max(1, Math.ceil(span / (gap + lineWidth))) +
        (Math.ceil(span / (gap + lineWidth)) % 2 === 1 ? 1 : 0);

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
            }}
        >
            <style>{styleContent}</style>
            <svg
                style={{
                    position: "absolute",
                    left: "0",
                    top: "0",
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                }}
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
                key={`dash-waves-${numLines}`}
            >
                {Array.from({ length: numLines }).map((_, i) => {
                    const pos = numLines > 1 ? (i / (numLines - 1)) * span : 0;
                    const delayFactor =
                        1 - Math.abs((i - numLines / 2) / numLines);
                    const t = numLines > 1 ? i / (numLines - 1) : 0;
                    const dash = paletteAt(palette, t);
                    const pulse = paletteAt(palette, (t + 0.5) % 1);
                    const coords = horizontal
                        ? { x1: 0, y1: pos, x2: dimensions.width, y2: pos }
                        : { x1: pos, y1: 0, x2: pos, y2: dimensions.height };
                    return (
                        <g
                            style={
                                {
                                    "--delay": `${(delayFactor * speed) / 50}s`,
                                    "--pulse": pulse,
                                } as CSSProperties
                            }
                            key={i}
                        >
                            <line
                                {...coords}
                                stroke={lineColor}
                                strokeWidth={lineWidth}
                            />
                            <line
                                {...coords}
                                stroke={dash}
                                strokeWidth={lineWidth}
                                className={`${instanceId}-l`}
                            />
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

const __presetProps = {
  "gap": 10,
  "type": "vertical",
  "scale": 3.5,
  "shape": "circle",
  "speed": 99,
  "colors": {
    "color1": "#FFFFFF",
    "color2": "#00FFD8",
    "color3": "#FFFFFF",
    "color4": "#FFFFFF",
    "color5": "#FFFFFF",
    "paletteCount": 2
  },
  "lineColor": "#000000",
  "lineWidth": 3,
  "cornerRadius": 0,
  "backgroundColor": "#000000"
};

export default function WaveBg(props: Record<string, unknown>) {
  return <__BaseImpl_WaveBg {...(__presetProps as Record<string, unknown>)} {...props} />;
}
