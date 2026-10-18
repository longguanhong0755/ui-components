"use client";

import { useEffect, useRef, type CSSProperties } from "react";

interface Rgba {
    r: number;
    g: number;
    b: number;
    a: number;
}

function parseColorToRgba(input: string): Rgba {
    if (!input) return { r: 0, g: 0, b: 0, a: 1 };
    const str = input.trim();
    const rgbaMatch = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
    );
    if (rgbaMatch) {
        const r = Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255;
        const g = Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255;
        const b = Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255;
        const a =
            rgbaMatch[4] !== undefined
                ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])))
                : 1;
        return { r, g, b, a };
    }
    const hex = str.replace(/^#/, "");
    if (hex.length === 8) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: parseInt(hex.slice(6, 8), 16) / 255,
        };
    }
    if (hex.length === 6) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: 1,
        };
    }
    if (hex.length === 4) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: parseInt(hex[3] + hex[3], 16) / 255,
        };
    }
    if (hex.length === 3) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: 1,
        };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
}

function rgbaToCanvasColor(rgba: Rgba): string {
    const r = Math.round(rgba.r * 255);
    const g = Math.round(rgba.g * 255);
    const b = Math.round(rgba.b * 255);
    if (rgba.a === 1) return `rgb(${r}, ${g}, ${b})`;
    return `rgba(${r}, ${g}, ${b}, ${rgba.a})`;
}

const DEFAULTS = {
    background: "#000000",
    particleColor: "#FFFFFF",
    particleDensity: 4,
    minSize: 1.5,
    maxSize: 1,
    speed: 10,
    particleSpeed: 1,
    movement: 6,
    angle: 180,
};

// UI 1..10 → internal 0.5..12 (flicker rate)
function mapFlickerUiToInternal(ui: number): number {
    const clamped = Math.max(1, Math.min(10, ui));
    const t = (clamped - 1) / 9;
    return 0.5 + t * 11.5;
}

// UI 1..10 → internal 5..60 (density)
function mapDensityUiToInternal(ui: number): number {
    const clamped = Math.max(1, Math.min(10, ui));
    const t = (clamped - 1) / 9;
    return 5 + t * 55;
}

// Angle (deg) → unit drift vector.
// 0° = up, 90° = right, 180° = down, 270° = left — clockwise from top.
function angleToDrift(angleDeg: number): { vx: number; vy: number } {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { vx: Math.cos(rad), vy: Math.sin(rad) };
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    opacityVel: number;
}

interface SparklesProps {
    background?: string;
    particleColor?: string;
    particleDensity?: number;
    minSize?: number;
    maxSize?: number;
    speed?: number;
    particleSpeed?: number;
    movement?: number;
    angle?: number;
    style?: CSSProperties;
}

function __BaseImpl_Sparkles({
    background = DEFAULTS.background,
    particleColor = DEFAULTS.particleColor,
    particleDensity = DEFAULTS.particleDensity,
    minSize = DEFAULTS.minSize,
    maxSize = DEFAULTS.maxSize,
    speed = DEFAULTS.speed,
    particleSpeed = DEFAULTS.particleSpeed,
    movement = DEFAULTS.movement,
    angle = DEFAULTS.angle,
    style,
}: SparklesProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationRef = useRef<number | null>(null);

    const initParticles = (width: number, height: number) => {
        const particles: Particle[] = [];
        const area = width * height;
        const mappedDensity = mapDensityUiToInternal(particleDensity);
        const count = Math.floor((area / 1e4) * mappedDensity);
        const velocityMultiplier = (particleSpeed / 10) * 0.5; // 0-10 → 0-0.5
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * velocityMultiplier,
                vy: (Math.random() - 0.5) * velocityMultiplier,
                size: minSize + Math.random() * (maxSize - minSize),
                opacity: Math.random(),
                opacityVel: (Math.random() - 0.5) * 0.04,
            });
        }
        particlesRef.current = particles;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const width = container.clientWidth || container.offsetWidth || 1;
            const height =
                container.clientHeight || container.offsetHeight || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            initParticles(width, height);
        };
        resize();

        const mappedSpeed = mapFlickerUiToInternal(speed);

        // Movement 0..10 → 0..1 px/frame drift magnitude
        const driftMag = movement * 0.1;
        const { vx: driftDirX, vy: driftDirY } = angleToDrift(angle);
        const driftVx = driftDirX * driftMag;
        const driftVy = driftDirY * driftMag;

        const backgroundRgba = parseColorToRgba(background);
        const backgroundColor = rgbaToCanvasColor(backgroundRgba);
        const particleColorRgba = parseColorToRgba(particleColor);
        const particleColorBase = rgbaToCanvasColor({
            ...particleColorRgba,
            a: 1,
        });

        const drawParticles = (width: number, height: number) => {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = particleColorBase;
            for (const particle of particlesRef.current) {
                ctx.globalAlpha = particleColorRgba.a * particle.opacity;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        };

        const animate = () => {
            const dpr = window.devicePixelRatio || 1;
            const width = canvas.width / dpr;
            const height = canvas.height / dpr;

            for (const particle of particlesRef.current) {
                particle.x += particle.vx + driftVx;
                particle.y += particle.vy + driftVy;
                // Wrap around edges
                if (particle.x < 0) particle.x = width;
                if (particle.x > width) particle.x = 0;
                if (particle.y < 0) particle.y = height;
                if (particle.y > height) particle.y = 0;
                // Flicker
                particle.opacity += particle.opacityVel * mappedSpeed * 0.5;
                if (particle.opacity <= 0.1 || particle.opacity >= 1) {
                    particle.opacityVel *= -1;
                }
                particle.opacity = Math.max(0.1, Math.min(1, particle.opacity));
            }

            drawParticles(width, height);

            animationRef.current = requestAnimationFrame(animate);
        };
        animate();

        window.addEventListener("resize", resize);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            window.removeEventListener("resize", resize);
        };
    }, [
        background,
        particleColor,
        particleDensity,
        minSize,
        maxSize,
        speed,
        particleSpeed,
        movement,
        angle,
    ]);

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    );
}

Sparkles.displayName = "Sparkles";

const __presetProps = {
  "angle": 116,
  "speed": 10,
  "maxSize": 4.5,
  "minSize": 0.5,
  "movement": 6,
  "background": "#000000",
  "particleColor": "#FFCE00",
  "particleSpeed": 10,
  "particleDensity": 10
};

export default function Sparkles(props: Record<string, unknown>) {
  return <__BaseImpl_Sparkles {...(__presetProps as Record<string, unknown>)} {...props} />;
}
