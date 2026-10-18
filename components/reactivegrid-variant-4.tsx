"use client";

import { useEffect, useRef, type CSSProperties } from "react";

type Shape =
    | "square"
    | "rounded"
    | "circle"
    | "triangle"
    | "diamond"
    | "hexagon"
    | "star";

interface ProximityHoverProps {
    shape?: Shape;
    fill?: "solid" | "stroke";
    strokeWidth?: number;
    particleColor?: string;
    backgroundColor?: string;
    maxSize?: number;
    minSize?: number;
    gap?: number;
    influence?: number;
    style?: CSSProperties;
}

const DEFAULTS = {
    shape: "rounded" as Shape,
    fill: "solid" as const,
    strokeWidth: 1.5,
    particleColor: "#FFFFFF",
    backgroundColor: "#000000",
    maxSize: 36,
    minSize: 12,
    gap: 4,
    influence: 300,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

function __BaseImpl_ProximityHover({
    shape = DEFAULTS.shape,
    fill = DEFAULTS.fill,
    strokeWidth = DEFAULTS.strokeWidth,
    particleColor = DEFAULTS.particleColor,
    backgroundColor = DEFAULTS.backgroundColor,
    maxSize = DEFAULTS.maxSize,
    minSize = DEFAULTS.minSize,
    gap = DEFAULTS.gap,
    influence = DEFAULTS.influence,
    style,
}: ProximityHoverProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const mouseRef = useRef<{ x: number; y: number } | null>(null);
    const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
    const propsRef = useRef({
        shape,
        fill,
        strokeWidth,
        particleColor,
        backgroundColor,
        maxSize,
        minSize,
        gap,
        influence,
    });
    const currentRef = useRef<Float32Array>(new Float32Array(0));

    useEffect(() => {
        propsRef.current = {
            shape,
            fill,
            strokeWidth,
            particleColor,
            backgroundColor,
            maxSize,
            minSize,
            gap,
            influence,
        };
    }, [
        shape,
        fill,
        strokeWidth,
        particleColor,
        backgroundColor,
        maxSize,
        minSize,
        gap,
        influence,
    ]);

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const syncSize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            const s = sizeRef.current;
            if (s.w === w && s.h === h && s.dpr === dpr) return;
            sizeRef.current = { w, h, dpr };
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const buildPath = (cx: number, cy: number, s: number, shp: Shape) => {
            const half = s / 2;
            ctx.beginPath();
            switch (shp) {
                case "circle":
                    ctx.arc(cx, cy, half, 0, Math.PI * 2);
                    break;
                case "rounded": {
                    const r = Math.min(half, s * 0.28);
                    const x = cx - half;
                    const y = cy - half;
                    ctx.moveTo(x + r, y);
                    ctx.arcTo(x + s, y, x + s, y + s, r);
                    ctx.arcTo(x + s, y + s, x, y + s, r);
                    ctx.arcTo(x, y + s, x, y, r);
                    ctx.arcTo(x, y, x + s, y, r);
                    ctx.closePath();
                    break;
                }
                case "triangle":
                    ctx.moveTo(cx, cy - half);
                    ctx.lineTo(cx + half, cy + half);
                    ctx.lineTo(cx - half, cy + half);
                    ctx.closePath();
                    break;
                case "diamond":
                    ctx.moveTo(cx, cy - half);
                    ctx.lineTo(cx + half, cy);
                    ctx.lineTo(cx, cy + half);
                    ctx.lineTo(cx - half, cy);
                    ctx.closePath();
                    break;
                case "hexagon":
                    for (let k = 0; k < 6; k++) {
                        const a = ((-90 + 60 * k) * Math.PI) / 180;
                        const px = cx + half * Math.cos(a);
                        const py = cy + half * Math.sin(a);
                        if (k === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    break;
                case "star": {
                    const inner = half * 0.5;
                    for (let k = 0; k < 10; k++) {
                        const rad = k % 2 === 0 ? half : inner;
                        const a = ((-90 + 36 * k) * Math.PI) / 180;
                        const px = cx + rad * Math.cos(a);
                        const py = cy + rad * Math.sin(a);
                        if (k === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    break;
                }
                default:
                    ctx.rect(cx - half, cy - half, s, s);
            }
        };

        const draw = () => {
            syncSize();
            const p = propsRef.current;
            const { w, h } = sizeRef.current;
            const mouse = mouseRef.current;
            const isStroke = p.fill === "stroke";

            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = p.backgroundColor;
            ctx.fillRect(0, 0, w, h);

            const cell = Math.max(1, p.maxSize + p.gap);
            const cols = Math.max(1, Math.floor(w / cell));
            const rows = Math.max(1, Math.floor(h / cell));
            const offX = (w - cols * cell) / 2 + cell / 2;
            const offY = (h - rows * cell) / 2 + cell / 2;
            const count = cols * rows;
            if (currentRef.current.length !== count) {
                currentRef.current = new Float32Array(count).fill(p.minSize);
            }
            const sizes = currentRef.current;

            ctx.fillStyle = p.particleColor;
            ctx.strokeStyle = p.particleColor;
            ctx.lineJoin = "round";
            ctx.lineWidth = Math.max(0.5, p.strokeWidth);

            const radius = Math.max(1, p.influence);
            for (let j = 0; j < rows; j++) {
                for (let i = 0; i < cols; i++) {
                    const idx = j * cols + i;
                    const cx = offX + i * cell;
                    const cy = offY + j * cell;
                    let infl = 0;
                    if (mouse) {
                        const dx = mouse.x - cx;
                        const dy = mouse.y - cy;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        infl = clamp(1 - dist / radius, 0, 1);
                    }
                    const target = lerp(p.minSize, p.maxSize, infl);
                    const cur = lerp(sizes[idx] || p.minSize, target, 0.2);
                    sizes[idx] = cur;
                    if (cur <= 0.2) continue;
                    buildPath(cx, cy, cur, p.shape);
                    if (isStroke) ctx.stroke();
                    else ctx.fill();
                }
            }
            rafRef.current = requestAnimationFrame(draw);
        };

        const onMove = (e: PointerEvent) => {
            const rect = container.getBoundingClientRect();
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        };
        const onLeave = () => {
            mouseRef.current = null;
        };

        syncSize();
        const ro = new ResizeObserver(syncSize);
        ro.observe(container);
        container.addEventListener("pointermove", onMove);
        container.addEventListener("pointerleave", onLeave);
        rafRef.current = requestAnimationFrame(draw);

        return () => {
            ro.disconnect();
            container.removeEventListener("pointermove", onMove);
            container.removeEventListener("pointerleave", onLeave);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                backgroundColor,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    );
}

const __presetProps = {
  "gap": 0,
  "fill": "solid",
  "shape": "square",
  "maxSize": 50,
  "minSize": 0,
  "influence": 52,
  "strokeWidth": 1,
  "particleColor": "#FDFF00",
  "backgroundColor": "#000000"
};

export default function ProximityHover(props: Record<string, unknown>) {
  return <__BaseImpl_ProximityHover {...(__presetProps as Record<string, unknown>)} {...props} />;
}
