"use client";

import { useEffect, useRef, type CSSProperties } from "react";

const DEFAULTS = {
    colors: ["#FFFFFF", "#FF6F00", "#FFF200", "#0DFF00"],
    colorShift: 1,
    opacity: 50,
    thickness: 2,
    trails: 60,
    trailLength: 30,
    label: true,
    labelText: "HOVER ME",
    labelColor: "#FFFFFF",
    labelFont: {
        fontFamily: "Inter",
        fontWeight: 400,
        fontSize: 48,
        lineHeight: "1.5em",
        letterSpacing: "0em",
        textAlign: "left" as const,
    },
};

const MAX_COLORS = 5;

const DAMPENING = 0.1;
const TENSION = 0.95;

const FRICTION = 0.5;

const REFERENCE_TRAILS = 20;

const MAX_STROKE_L = 0.7;

class TrailNode {
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
}

interface LineConfig {
    spring: number;
    friction: number;
    dampening: number;
    tension: number;
    size: number;
    target: { x: number; y: number };
}

class Line {
    spring: number;
    friction: number;
    nodes: TrailNode[] = [];
    private cfg: LineConfig;

    constructor(cfg: LineConfig) {
        this.cfg = cfg;
        this.spring = cfg.spring + 0.1 * Math.random() - 0.02;
        this.friction = cfg.friction + 0.01 * Math.random() - 0.002;
        for (let i = 0; i < cfg.size; i++) {
            const node = new TrailNode();
            node.x = cfg.target.x;
            node.y = cfg.target.y;
            this.nodes.push(node);
        }
    }

    update() {
        let spring = this.spring;
        const { target, dampening, tension } = this.cfg;
        let node = this.nodes[0];

        node.vx += (target.x - node.x) * spring;
        node.vy += (target.y - node.y) * spring;

        for (let i = 0, len = this.nodes.length; i < len; i++) {
            node = this.nodes[i];
            if (i > 0) {
                const prev = this.nodes[i - 1];
                node.vx += (prev.x - node.x) * spring;
                node.vy += (prev.y - node.y) * spring;
                node.vx += prev.vx * dampening;
                node.vy += prev.vy * dampening;
            }
            node.vx *= this.friction;
            node.vy *= this.friction;
            node.x += node.vx;
            node.y += node.vy;
            spring *= tension;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        let a: TrailNode, b: TrailNode;
        let x = this.nodes[0].x;
        let y = this.nodes[0].y;

        ctx.beginPath();
        ctx.moveTo(x, y);

        for (let i = 1, len = this.nodes.length - 2; i < len; i++) {
            a = this.nodes[i];
            b = this.nodes[i + 1];
            x = 0.5 * (a.x + b.x);
            y = 0.5 * (a.y + b.y);
            ctx.quadraticCurveTo(a.x, a.y, x, y);
        }

        a = this.nodes[this.nodes.length - 2];
        b = this.nodes[this.nodes.length - 1];
        ctx.quadraticCurveTo(a.x, a.y, b.x, b.y);
        ctx.stroke();
        ctx.closePath();
    }
}

function parseColor(color: string): [number, number, number, number] {
    const value = (color ?? "").trim();

    if (value.startsWith("#")) {
        let hex = value.slice(1);
        if (hex.length === 3)
            hex = hex
                .split("")
                .map((c) => c + c)
                .join("");
        if (hex.length >= 6) {
            return [
                parseInt(hex.slice(0, 2), 16) / 255,
                parseInt(hex.slice(2, 4), 16) / 255,
                parseInt(hex.slice(4, 6), 16) / 255,
                hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
            ];
        }
        return [1, 1, 1, 1];
    }

    const m = value.match(/rgba?\(([^)]+)\)/i);
    if (m) {
        const p = m[1].split(",").map((s) => parseFloat(s));
        return [
            (p[0] || 0) / 255,
            (p[1] || 0) / 255,
            (p[2] || 0) / 255,
            p[3] === undefined ? 1 : p[3],
        ];
    }
    return [1, 1, 1, 1];
}

const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const toGamma = (c: number) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

function srgbToOklab(r: number, g: number, b: number) {
    const lr = toLinear(r);
    const lg = toLinear(g);
    const lb = toLinear(b);
    const l = Math.cbrt(
        0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
    );
    const m = Math.cbrt(
        0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
    );
    const s = Math.cbrt(
        0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
    );
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ] as const;
}

function oklabToSrgb(L: number, A: number, B: number) {
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    return [
        toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ] as const;
}

const inGamut = (rgb: readonly number[]) =>
    rgb.every((c) => c >= -0.001 && c <= 1.001);

function strokeFor(color: string, maxL: number, alpha: number): string {
    const [r, g, b] = parseColor(color);
    const [L, A, B] = srgbToOklab(r, g, b);
    if (L <= maxL) {
        const rgb = [r, g, b].map((c) => Math.round(c * 255));
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
    }

    const C = Math.hypot(A, B);
    const hue = Math.atan2(B, A);
    const cos = Math.cos(hue);
    const sin = Math.sin(hue);

    let fitted = C;
    if (!inGamut(oklabToSrgb(maxL, cos * C, sin * C))) {
        let lo = 0;
        let hi = C;
        for (let i = 0; i < 16; i++) {
            const mid = (lo + hi) / 2;
            if (inGamut(oklabToSrgb(maxL, cos * mid, sin * mid))) lo = mid;
            else hi = mid;
        }
        fitted = lo;
    }

    const rgb = oklabToSrgb(maxL, cos * fitted, sin * fitted).map((c) =>
        Math.round(Math.min(1, Math.max(0, c)) * 255)
    );
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export interface LineCursorProps {
    colors: string[];
    colorShift: number;
    opacity: number;
    thickness: number;
    trails: number;
    trailLength: number;
    label: boolean;
    labelText: string;
    labelColor: string;
    labelFont: CSSProperties;
    style?: CSSProperties;
}

export default function LineCursor(props: Partial<LineCursorProps>) {
    const {
        colors = DEFAULTS.colors,
        colorShift = DEFAULTS.colorShift,
        opacity = DEFAULTS.opacity,
        thickness = DEFAULTS.thickness,
        trails = DEFAULTS.trails,
        trailLength = DEFAULTS.trailLength,
        label = DEFAULTS.label,
        labelText = DEFAULTS.labelText,
        labelColor = DEFAULTS.labelColor,
        labelFont = DEFAULTS.labelFont,
        style,
    } = props;

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const frameRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const frame = frameRef.current;
        if (!canvas || !frame) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const count = Math.max(1, Math.round(trails));

        const picked = (colors ?? []).filter(Boolean).slice(0, MAX_COLORS);
        const palette = picked.length ? picked : DEFAULTS.colors;

        const weight = Math.min(100, Math.max(0, opacity)) / 100;
        const fade = Math.min(1, REFERENCE_TRAILS / count);
        const strokes = palette.map((entry) =>
            strokeFor(entry, MAX_STROKE_L, weight * parseColor(entry)[3] * fade)
        );

        let running = true;
        let rafId = 0;
        let started = false;

        const target = { x: 0, y: 0 };

        let bornAt = 0;
        const holdMs = Math.max(0.1, colorShift) * 1000;

        const lineCfg: LineConfig = {
            spring: 0.4,
            friction: FRICTION,
            dampening: DAMPENING,
            tension: TENSION,
            size: Math.max(2, Math.round(trailLength)),
            target,
        };
        let lines: Line[] = [];

        function buildLines() {
            lines = [];
            for (let i = 0; i < count; i++) {
                lines.push(
                    new Line({ ...lineCfg, spring: 0.4 + (i / count) * 0.025 })
                );
            }
        }

        function resize() {
            if (!canvas || !frame) return;
            canvas.width = Math.max(1, Math.round(frame.clientWidth));
            canvas.height = Math.max(1, Math.round(frame.clientHeight));
        }

        function updatePosition(e: MouseEvent | TouchEvent) {
            let clientX: number, clientY: number;
            if ("touches" in e && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = (e as MouseEvent).clientX;
                clientY = (e as MouseEvent).clientY;
            }
            const rect = frame!.getBoundingClientRect();
            const sx = rect.width > 0 ? frame!.clientWidth / rect.width : 1;
            const sy = rect.height > 0 ? frame!.clientHeight / rect.height : 1;
            target.x = (clientX - rect.left) * sx;
            target.y = (clientY - rect.top) * sy;
            if (e.cancelable) e.preventDefault();
        }

        function onFirstMove(e: MouseEvent | TouchEvent) {
            moveTarget.removeEventListener(
                "mousemove",
                onFirstMove as EventListener
            );
            moveTarget.removeEventListener(
                "touchstart",
                onFirstMove as EventListener
            );
            moveTarget.addEventListener(
                "mousemove",
                updatePosition as EventListener
            );
            moveTarget.addEventListener(
                "touchmove",
                updatePosition as EventListener,
                { passive: false }
            );
            updatePosition(e);
            buildLines();
            started = true;
            loop();
        }

        function loop() {
            if (!running || !ctx || !canvas) return;
            ctx.globalCompositeOperation = "source-over";
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "lighter";
            if (bornAt === 0) bornAt = performance.now();
            const held = Math.floor((performance.now() - bornAt) / holdMs);
            ctx.strokeStyle = strokes[held % strokes.length];
            ctx.lineWidth = Math.max(0.1, thickness);

            for (let i = 0; i < count; i++) {
                const line = lines[i];
                if (!line) continue;
                line.update();
                line.draw(ctx);
            }
            rafId = window.requestAnimationFrame(loop);
        }

        function handleFocus() {
            if (!running) {
                running = true;
                if (started) loop();
            }
        }
        function handleBlur() {
            running = false;
        }

        const moveTarget: EventTarget = document;
        moveTarget.addEventListener("mousemove", onFirstMove as EventListener);
        moveTarget.addEventListener(
            "touchstart",
            onFirstMove as EventListener,
            {
                passive: true,
            }
        );

        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(resize);
            ro.observe(frame);
        }
        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);

        resize();

        return () => {
            running = false;
            window.cancelAnimationFrame(rafId);
            moveTarget.removeEventListener(
                "mousemove",
                onFirstMove as EventListener
            );
            moveTarget.removeEventListener(
                "touchstart",
                onFirstMove as EventListener
            );
            moveTarget.removeEventListener(
                "mousemove",
                updatePosition as EventListener
            );
            moveTarget.removeEventListener(
                "touchmove",
                updatePosition as EventListener
            );
            ro?.disconnect();
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
        };
    }, [
        JSON.stringify(colors),
        colorShift,
        opacity,
        thickness,
        trails,
        trailLength,
    ]);

    return (
        <div
            ref={frameRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                pointerEvents: "none",
                ...style,
            }}
        >
            {label && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        whiteSpace: "pre",
                        pointerEvents: "none",
                        userSelect: "none",
                        ...labelFont,
                        color: labelColor,
                    }}
                >
                    {labelText}
                </div>
            )}
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    pointerEvents: "none",
                }}
            />
        </div>
    );
}

LineCursor.displayName = "Line Cursor";
