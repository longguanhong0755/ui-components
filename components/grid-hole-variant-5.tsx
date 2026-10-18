"use client";

import * as React from "react";

const { useRef, useCallback, useMemo, useEffect } = React;

function toRGB(color: string): [number, number, number] {
    if (typeof color === "string") {
        if (color.startsWith("#")) {
            let hex = color.slice(1);
            if (hex.length === 3)
                hex = hex
                    .split("")
                    .map((c) => c + c)
                    .join("");
            const n = parseInt(hex.slice(0, 6), 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        }
        const m = color.match(/rgba?\(([^)]+)\)/);
        if (m) {
            const p = m[1].split(",").map((s) => parseFloat(s));
            return [p[0] || 0, p[1] || 0, p[2] || 0];
        }
    }
    return [255, 255, 255];
}

interface BlackHoleBGProps {
    speed?: number;
    strokeColor?: string;
    lineWidth?: number;
    lines?: number;
    discs?: number;
    particles?: boolean;
    particleColor?: string;
    particleCount?: number;
    glow?: boolean;
    glowColor?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}

function __BaseImpl_BlackHoleBG({
    speed = 50,
    strokeColor = "#FFFFFF",
    lineWidth = 1,
    lines = 80,
    discs = 80,
    particles = true,
    particleColor = "#FFFFFF",
    particleCount = 300,
    glow = true,
    glowColor = "#FFFFFF",
    style,
    children,
}: BlackHoleBGProps) {
    const particleRGBColor = useMemo(() => toRGB(particleColor), [particleColor]);

    const speedRef = useRef({ discInc: 0.001, vyScale: 1 });
    speedRef.current = {
        discInc: (speed / 100) * 0.002,
        vyScale: speed / 50,
    };

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameIdRef = useRef<number>(0);
    const stateRef = useRef<any>({
        discs: [],
        lines: [],
        particles: [],
        clip: {},
        startDisc: {},
        endDisc: {},
        rect: { width: 0, height: 0 },
        render: { width: 0, height: 0, dpi: 1 },
        particleArea: {},
        linesCanvas: null,
    });

    const linear = (p: number) => p;
    const easeInExpo = (p: number) => (p === 0 ? 0 : Math.pow(2, 10 * (p - 1)));

    const tweenValue = useCallback(
        (start: number, end: number, p: number, ease: "inExpo" | null = null) => {
            const delta = end - start;
            const easeFn = ease === "inExpo" ? easeInExpo : linear;
            return start + delta * easeFn(p);
        },
        []
    );

    const tweenDisc = useCallback(
        (disc: any) => {
            const { startDisc, endDisc } = stateRef.current;
            disc.x = tweenValue(startDisc.x, endDisc.x, disc.p);
            disc.y = tweenValue(startDisc.y, endDisc.y, disc.p, "inExpo");
            disc.w = tweenValue(startDisc.w, endDisc.w, disc.p);
            disc.h = tweenValue(startDisc.h, endDisc.h, disc.p);
        },
        [tweenValue]
    );

    const setSize = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        stateRef.current.rect = { width: rect.width, height: rect.height };
        stateRef.current.render = {
            width: rect.width,
            height: rect.height,
            dpi: window.devicePixelRatio || 1,
        };
        canvas.width = Math.max(
            1,
            stateRef.current.render.width * stateRef.current.render.dpi
        );
        canvas.height = Math.max(
            1,
            stateRef.current.render.height * stateRef.current.render.dpi
        );
    }, []);

    const setDiscs = useCallback(() => {
        const { width, height } = stateRef.current.rect;
        if (!width || !height) return;
        stateRef.current.discs = [];
        stateRef.current.startDisc = {
            x: width * 0.5,
            y: height * 0.45,
            w: width * 0.75,
            h: height * 0.7,
        };
        stateRef.current.endDisc = {
            x: width * 0.5,
            y: height * 0.95,
            w: 0,
            h: 0,
        };
        let prevBottom = height;
        stateRef.current.clip = {};
        for (let i = 0; i < discs; i++) {
            const p = i / discs;
            const disc = { p, x: 0, y: 0, w: 0, h: 0 };
            tweenDisc(disc);
            const bottom = disc.y + disc.h;
            if (bottom <= prevBottom) {
                stateRef.current.clip = { disc: { ...disc }, i };
            }
            prevBottom = bottom;
            stateRef.current.discs.push(disc);
        }
        const clipPath = new Path2D();
        const disc = stateRef.current.clip.disc;
        clipPath.ellipse(disc.x, disc.y, disc.w, disc.h, 0, 0, Math.PI * 2);
        clipPath.rect(disc.x - disc.w, 0, disc.w * 2, disc.y);
        stateRef.current.clip.path = clipPath;
    }, [discs, tweenDisc]);

    const setLines = useCallback(() => {
        const { width, height } = stateRef.current.rect;
        if (!width || !height) return;
        stateRef.current.lines = [];
        const linesAngle = (Math.PI * 2) / lines;
        for (let i = 0; i < lines; i++) {
            stateRef.current.lines.push([]);
        }
        stateRef.current.discs.forEach((disc: any) => {
            for (let i = 0; i < lines; i++) {
                const angle = i * linesAngle;
                const p = {
                    x: disc.x + Math.cos(angle) * disc.w,
                    y: disc.y + Math.sin(angle) * disc.h,
                };
                stateRef.current.lines[i].push(p);
            }
        });

        const dpi = stateRef.current.render.dpi || 1;
        const offCanvas = document.createElement("canvas");
        offCanvas.width = Math.max(1, Math.round(width * dpi));
        offCanvas.height = Math.max(1, Math.round(height * dpi));
        const ctx = offCanvas.getContext("2d");
        if (!ctx) return;
        const clipPath = stateRef.current.clip.path;

        ctx.lineWidth = 1;
        const enters = stateRef.current.lines.map((line: any) => {
            for (let j = 1; j < line.length; j++) {
                const p = line[j];
                if (
                    ctx.isPointInPath(clipPath, p.x, p.y) ||
                    ctx.isPointInStroke(clipPath, p.x, p.y)
                ) {
                    return j;
                }
            }
            return -1;
        });

        ctx.scale(dpi, dpi);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        const strokePolyline = (points: any[]) => {
            if (points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let j = 1; j < points.length; j++) {
                ctx.lineTo(points[j].x, points[j].y);
            }
            ctx.stroke();
        };

        stateRef.current.lines.forEach((line: any, i: number) => {
            const enter = enters[i];
            if (enter === -1) {
                strokePolyline(line);
                return;
            }
            strokePolyline(line.slice(0, enter + 1));
            ctx.save();
            ctx.clip(clipPath);
            strokePolyline(line.slice(enter));
            ctx.restore();
        });
        stateRef.current.linesCanvas = offCanvas;
    }, [lines, strokeColor, lineWidth]);

    const initParticle = useCallback(
        (start: boolean = false) => {
            const sx =
                stateRef.current.particleArea.sx +
                stateRef.current.particleArea.sw * Math.random();
            const ex =
                stateRef.current.particleArea.ex +
                stateRef.current.particleArea.ew * Math.random();
            const dx = ex - sx;
            const y = start
                ? stateRef.current.particleArea.h * Math.random()
                : stateRef.current.particleArea.h;
            const r = 0.5 + Math.random() * 4;
            const vy = 0.5 + Math.random();
            return {
                x: sx,
                sx,
                dx,
                y,
                vy,
                p: 0,
                r,
                c: `rgba(${particleRGBColor[0]}, ${particleRGBColor[1]}, ${particleRGBColor[2]}, ${Math.random()})`,
            };
        },
        [particleRGBColor]
    );

    const setParticles = useCallback(() => {
        const { width, height } = stateRef.current.rect;
        stateRef.current.particles = [];
        if (!particles || !width || !height || !stateRef.current.clip.disc)
            return;
        const disc = stateRef.current.clip.disc;
        stateRef.current.particleArea = {
            sw: disc.w * 0.5,
            ew: disc.w * 2,
            h: height * 0.85,
        };
        stateRef.current.particleArea.sx =
            (width - stateRef.current.particleArea.sw) / 2;
        stateRef.current.particleArea.ex =
            (width - stateRef.current.particleArea.ew) / 2;
        for (let i = 0; i < particleCount; i++) {
            stateRef.current.particles.push(initParticle(true));
        }
    }, [initParticle, particles, particleCount]);

    const drawDiscs = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            const outerDisc = stateRef.current.startDisc;
            ctx.beginPath();
            ctx.ellipse(
                outerDisc.x,
                outerDisc.y,
                outerDisc.w,
                outerDisc.h,
                0,
                0,
                Math.PI * 2
            );
            ctx.stroke();
            ctx.closePath();
            stateRef.current.discs.forEach((disc: any, i: number) => {
                if (i % 5 !== 0) return;
                if (disc.w < stateRef.current.clip.disc.w - 5) {
                    ctx.save();
                    ctx.clip(stateRef.current.clip.path);
                }
                ctx.beginPath();
                ctx.ellipse(disc.x, disc.y, disc.w, disc.h, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.closePath();
                if (disc.w < stateRef.current.clip.disc.w - 5) {
                    ctx.restore();
                }
            });
        },
        [strokeColor, lineWidth]
    );

    const drawLines = useCallback((ctx: CanvasRenderingContext2D) => {
        const off = stateRef.current.linesCanvas;
        if (!off) return;
        const { width, height } = stateRef.current.rect;
        ctx.drawImage(off, 0, 0, width, height);
    }, []);

    const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
        if (!stateRef.current.clip.path) return;
        ctx.save();
        ctx.clip(stateRef.current.clip.path);
        stateRef.current.particles.forEach((particle: any) => {
            ctx.fillStyle = particle.c;
            ctx.beginPath();
            ctx.arc(
                particle.x + particle.r / 2,
                particle.y + particle.r / 2,
                particle.r / 2,
                0,
                Math.PI * 2
            );
            ctx.closePath();
            ctx.fill();
        });
        ctx.restore();
    }, []);

    const moveDiscs = useCallback(() => {
        const inc = speedRef.current.discInc;
        stateRef.current.discs.forEach((disc: any) => {
            disc.p = (disc.p + inc) % 1;
            tweenDisc(disc);
        });
    }, [tweenDisc]);

    const moveParticles = useCallback(() => {
        const vyScale = speedRef.current.vyScale;
        stateRef.current.particles.forEach((particle: any, idx: number) => {
            particle.p = 1 - particle.y / stateRef.current.particleArea.h;
            particle.x = particle.sx + particle.dx * particle.p;
            particle.y -= particle.vy * vyScale;
            if (particle.y < 0) {
                stateRef.current.particles[idx] = initParticle();
            }
        });
    }, [initParticle]);

    const tick = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(stateRef.current.render.dpi, stateRef.current.render.dpi);
        if (stateRef.current.clip.path) {
            moveDiscs();
            moveParticles();
            drawDiscs(ctx);
            drawLines(ctx);
            drawParticles(ctx);
        }
        ctx.restore();
        animationFrameIdRef.current = requestAnimationFrame(tick);
    }, [moveDiscs, moveParticles, drawDiscs, drawLines, drawParticles]);

    const init = useCallback(() => {
        setSize();
        setDiscs();
        setLines();
        setParticles();
    }, [setSize, setDiscs, setLines, setParticles]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        init();
        tick();
        const ro = new ResizeObserver(() => {
            setSize();
            setDiscs();
            setLines();
            setParticles();
        });
        ro.observe(canvas);
        return () => {
            ro.disconnect();
            cancelAnimationFrame(animationFrameIdRef.current);
        };
    }, [init, tick, setSize, setDiscs, setLines, setParticles]);

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: "#000000",
                ...style,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "140%",
                    height: "140%",
                    transform: "translate3d(-50%, -50%, 0)",
                    background:
                        "radial-gradient(ellipse at 50% 55%, transparent 10%, #000000 50%)",
                    pointerEvents: "none",
                }}
            />
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "block",
                    width: "100%",
                    height: "100%",
                    opacity: 0.2,
                }}
            />
            {glow && (
                <div
                    style={{
                        position: "absolute",
                        zIndex: 5,
                        top: "50%",
                        left: "50%",
                        width: "100%",
                        height: "100%",
                        transform: "translate3d(-50%, -50%, 0)",
                        background: `radial-gradient(ellipse at 50% 75%, ${glowColor} 20%, transparent 75%)`,
                        mixBlendMode: "overlay",
                        pointerEvents: "none",
                    }}
                />
            )}
            <div
                style={{
                    position: "absolute",
                    zIndex: 7,
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background:
                        "repeating-linear-gradient(transparent, transparent 1px, #ffffff 1px, #ffffff 2px)",
                    mixBlendMode: "overlay",
                    pointerEvents: "none",
                }}
            />
            {children}
        </div>
    );
}

const __presetProps = {
  "speed": 86,
  "strokeColor": "#00FFFD",
  "lineWidth": 2,
  "lines": 200,
  "discs": 163,
  "particles": true,
  "particleColor": "#FFFFFF",
  "particleCount": 300,
  "glow": true,
  "glowColor": "#FFFFFF"
};

export default function BlackHoleBG(props: Record<string, unknown>) {
  return <__BaseImpl_BlackHoleBG {...(__presetProps as Record<string, unknown>)} {...props} />;
}
