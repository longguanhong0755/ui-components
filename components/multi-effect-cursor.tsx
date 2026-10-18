"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

type Props = {
    label: boolean;
    labelText: string;
    labelColor: string;
    labelFont?: React.CSSProperties;
    trailStyle: "constellation" | "ribbon" | "comet" | "bubbles";
    trailColor: string;
    particleSize: number;
    intensity: number;
    flow: number;
    trailLength: number;
    style?: React.CSSProperties;
};

const DEFAULT_LABEL_FONT: React.CSSProperties = {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "48px",
    lineHeight: "1.5em",
    letterSpacing: "0em",
    textAlign: "left",
} as React.CSSProperties;

const DEFAULTS: Props = {
    label: true,
    labelText: "HOVER AROUND",
    labelColor: "#FFFFFF",
    trailStyle: "constellation",
    trailColor: "#FA7319",
    particleSize: 6,
    intensity: 10,
    flow: 6,
    trailLength: 10,
};

const lifeSeconds = (v: number) => Math.max(1, Math.min(20, v)) * 0.15;
const TRAIL_EASE: number[] = [0.4, 0, 0.2, 1];

type RGB = { r: number; g: number; b: number };

function parseColor(color: string): RGB {
    const fallback: RGB = { r: 99, g: 102, b: 241 };
    if (typeof color !== "string" || !color) return fallback;
    const s = color.trim();

    if (s.startsWith("#")) {
        let hex = s.slice(1);
        if (hex.length === 3 || hex.length === 4) {
            hex = hex
                .slice(0, 3)
                .split("")
                .map((c) => c + c)
                .join("");
        }
        if (hex.length >= 6) {
            const n = parseInt(hex.slice(0, 6), 16);
            if (Number.isFinite(n)) {
                return {
                    r: (n >> 16) & 255,
                    g: (n >> 8) & 255,
                    b: n & 255,
                };
            }
        }
        return fallback;
    }

    const rgb = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (rgb) {
        return {
            r: Math.round(parseFloat(rgb[1])),
            g: Math.round(parseFloat(rgb[2])),
            b: Math.round(parseFloat(rgb[3])),
        };
    }

    const hsl = s.match(/hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?/i);
    if (hsl) {
        const h = parseFloat(hsl[1]) / 360;
        const sat = parseFloat(hsl[2]) / 100;
        const l = parseFloat(hsl[3]) / 100;
        if (sat === 0) {
            const v = Math.round(l * 255);
            return { r: v, g: v, b: v };
        }
        const hue2rgb = (p: number, q: number, t: number) => {
            let u = t;
            if (u < 0) u += 1;
            if (u > 1) u -= 1;
            if (u < 1 / 6) return p + (q - p) * 6 * u;
            if (u < 1 / 2) return q;
            if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
        const p = 2 * l - q;
        return {
            r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
            g: Math.round(hue2rgb(p, q, h) * 255),
            b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
        };
    }
    return fallback;
}

function makeEaseFn(pts: number[]) {
    const [x1, y1, x2, y2] = pts;
    if (x1 === y1 && x2 === y2) return (t: number) => t;

    const bez = (a: number, b: number, t: number) => {
        const u = 1 - t;
        return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
    };
    return (t: number) => {
        const x = Math.max(0, Math.min(1, t));
        let s = x;
        for (let i = 0; i < 8; i++) {
            const cx = bez(x1, x2, s) - x;
            const u = 1 - s;
            const dx =
                3 * u * u * x1 + 6 * u * s * (x2 - x1) + 3 * s * s * (1 - x2);
            if (Math.abs(dx) < 1e-6) break;
            s -= cx / dx;
            s = Math.max(0, Math.min(1, s));
        }
        return bez(y1, y2, s);
    };
}

const trailEase = makeEaseFn(TRAIL_EASE);

function decay(rate: number, dt: number) {
    return Math.pow(rate, dt * 60);
}

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    age: number;
    alpha: number;
};

type Spark = Particle & { rotation: number; twinkle: number };

type Bubble = Particle & {
    wobble: number;
    wobbleSpeed: number;
    baseAlpha: number;
};

type TrailPoint = { x: number; y: number; age: number };

const MAX_PARTICLES = 100;
const MAX_SPARKS = 120;
const MAX_BUBBLES = 80;

const SPAWN_HZ = 60;
const MIN_STEP = 4;
const VELOCITY_TAU = 0.05;
const MOVE_GRACE_MS = 100;
const HEAD_PREDICT = 0.012;
const HEAD_PREDICT_MAX = 14;

function __BaseImpl_CursorAnimations(props: Partial<Props>) {
    const {
        trailStyle = DEFAULTS.trailStyle,
        trailColor = DEFAULTS.trailColor,
        particleSize = DEFAULTS.particleSize,
        intensity = DEFAULTS.intensity,
        flow = DEFAULTS.flow,
        trailLength = DEFAULTS.trailLength,
        label = DEFAULTS.label,
        labelText = DEFAULTS.labelText,
        labelColor = DEFAULTS.labelColor,
        style,
    } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const live = useRef({
        trailStyle,
        rgb: parseColor(trailColor),
        particleSize,
        intensity,
        flow,
        life: lifeSeconds(trailLength),
    });
    live.current = {
        trailStyle,
        rgb: parseColor(trailColor),
        particleSize,
        intensity,
        flow,
        life: lifeSeconds(trailLength),
    };
    const labelFont = { ...DEFAULT_LABEL_FONT, ...props.labelFont };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let w = 1;
        let h = 1;
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = Math.max(1, canvas.clientWidth);
            h = Math.max(1, canvas.clientHeight);
            canvas.width = Math.max(1, Math.floor(w * dpr));
            canvas.height = Math.max(1, Math.floor(h * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener("resize", resize);
        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(resize);
            ro.observe(canvas);
        }

        const localize = (clientX: number, clientY: number) => {
            const rect = canvas.getBoundingClientRect();
            const sx = rect.width > 0 ? canvas.clientWidth / rect.width : 1;
            const sy = rect.height > 0 ? canvas.clientHeight / rect.height : 1;
            return {
                x: (clientX - rect.left) * sx,
                y: (clientY - rect.top) * sy,
                over:
                    clientX >= rect.left &&
                    clientX <= rect.right &&
                    clientY >= rect.top &&
                    clientY <= rect.bottom,
            };
        };

        const motionQuery = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );
        let reduced = motionQuery.matches;
        const onMotionChange = (e: MediaQueryListEvent) => {
            reduced = e.matches;
        };
        motionQuery.addEventListener("change", onMotionChange);

        let particles: Particle[] = [];
        let sparks: Spark[] = [];
        let bubbles: Bubble[] = [];
        let points: TrailPoint[] = [];

        let mouseX = w / 2;
        let mouseY = h / 2;
        let lastX = mouseX;
        let lastY = mouseY;
        let headX = mouseX;
        let headY = mouseY;
        let prevX = mouseX;
        let prevY = mouseY;
        let velX = 0;
        let velY = 0;
        let spawnAcc = 0;
        let lastMoveTime = 0;
        let seededPointer = false;
        let inside = false;
        let styleAtLastFrame = live.current.trailStyle;

        const onMove = (e: PointerEvent) => {
            const head = localize(e.clientX, e.clientY);
            if (!head.over) {
                inside = false;
                seededPointer = false;
                return;
            }
            inside = true;
            canvas.style.opacity = "1";

            const batch =
                typeof e.getCoalescedEvents === "function"
                    ? e.getCoalescedEvents()
                    : null;
            const samples = batch && batch.length ? batch : [e];
            for (const ev of samples) {
                const pt = localize(ev.clientX, ev.clientY);
                if (!pt.over) continue;
                const x = pt.x;
                const y = pt.y;
                if (!seededPointer) {
                    seededPointer = true;
                    lastX = x;
                    lastY = y;
                    mouseX = x;
                    mouseY = y;
                    continue;
                }
                if (
                    !reduced &&
                    live.current.trailStyle === "ribbon" &&
                    Math.hypot(x - lastX, y - lastY) >= MIN_STEP
                ) {
                    points.push({ x, y, age: 0 });
                    const max = Math.max(4, live.current.intensity * 9);
                    while (points.length > max) points.shift();
                    lastX = x;
                    lastY = y;
                }
                mouseX = x;
                mouseY = y;
            }
            lastMoveTime = performance.now();
        };

        const emit = (x: number, y: number, vx: number, vy: number) => {
            const p = live.current;
            const size = p.particleSize;
            const flowFactor = p.flow / 10;

            switch (p.trailStyle) {
                case "ribbon":
                    break;
                case "comet": {
                    const count = Math.max(1, Math.round(p.intensity * 0.3));
                    for (let i = 0; i < count; i++) {
                        const angle =
                            Math.atan2(vy, vx) +
                            Math.PI +
                            (Math.random() - 0.5) * 1.2;
                        const speed = (Math.random() * 2 + 0.5) * 60;
                        sparks.push({
                            x: x + (Math.random() - 0.5) * 6,
                            y: y + (Math.random() - 0.5) * 6,
                            vx: Math.cos(angle) * speed * flowFactor,
                            vy: Math.sin(angle) * speed * flowFactor,
                            size: size * (0.2 + Math.random() * 0.5),
                            age: 0,
                            alpha: 0.8 + Math.random() * 0.2,
                            rotation: Math.random() * Math.PI * 2,
                            twinkle: Math.random() * Math.PI * 2,
                        });
                    }
                    while (sparks.length > MAX_SPARKS) sparks.shift();
                    break;
                }
                case "bubbles": {
                    const count = Math.max(1, Math.round(p.intensity * 0.2));
                    for (let i = 0; i < count; i++) {
                        const alpha = 0.4 + Math.random() * 0.3;
                        bubbles.push({
                            x: x + (Math.random() - 0.5) * 20,
                            y: y + (Math.random() - 0.5) * 20,
                            vx: (Math.random() - 0.5) * 2 * 60 * flowFactor,
                            vy: (-Math.random() * 2 - 0.5) * 60 * flowFactor,
                            size: size * (0.6 + Math.random() * 1.2),
                            age: 0,
                            alpha,
                            baseAlpha: alpha,
                            wobble: Math.random() * Math.PI * 2,
                            wobbleSpeed: (0.03 + Math.random() * 0.04) * 60,
                        });
                    }
                    while (bubbles.length > MAX_BUBBLES) bubbles.shift();
                    break;
                }
                default: {
                    const count = Math.max(1, Math.round(p.intensity * 0.6));
                    for (let i = 0; i < count; i++) {
                        const angle =
                            (Math.PI * 2 * i) / count + Math.random() * 0.2;
                        const spread = size * 0.2 * Math.random();
                        particles.push({
                            x: x + Math.cos(angle) * spread,
                            y: y + Math.sin(angle) * spread,
                            vx:
                                vx * flowFactor * 0.1 +
                                (Math.random() - 0.5) * 8,
                            vy:
                                vy * flowFactor * 0.1 +
                                (Math.random() - 0.5) * 8,
                            size: size * (0.8 + Math.random() * 0.4),
                            age: 0,
                            alpha: 1,
                        });
                    }
                    while (particles.length > MAX_PARTICLES) particles.shift();
                }
            }
        };

        const rawSupported = "onpointerrawupdate" in window;
        const moveEvent = rawSupported ? "pointerrawupdate" : "pointermove";
        window.addEventListener(moveEvent, onMove as EventListener, {
            passive: true,
        });

        const rgba = (c: RGB, a: number) =>
            `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.max(0, Math.min(1, a))})`;

        const drawRibbon = (life: number, ease: (t: number) => number) => {
            const p = live.current;
            const c = p.rgb;
            const baseWidth = p.particleSize * 2;
            if (points.length < 2) return;

            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            for (let i = 1; i < points.length; i++) {
                const p0 = points[i - 1];
                const p1 = points[i];
                const f0 = 1 - ease(p0.age / life);
                const f1 = 1 - ease(p1.age / life);
                const width = baseWidth * (0.3 + f1 * 0.7);
                if (width < 0.5) continue;

                const gradient = ctx.createLinearGradient(
                    p0.x,
                    p0.y,
                    p1.x,
                    p1.y
                );
                gradient.addColorStop(0, rgba(c, f0 * 0.85));
                gradient.addColorStop(1, rgba(c, f1 * 0.85));
                ctx.strokeStyle = gradient;
                ctx.lineWidth = width;
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                if (i < points.length - 1) {
                    const p2 = points[i + 1];
                    ctx.quadraticCurveTo(
                        p1.x,
                        p1.y,
                        (p1.x + p2.x) / 2,
                        (p1.y + p2.y) / 2
                    );
                } else {
                    ctx.lineTo(p1.x, p1.y);
                }
                ctx.stroke();
            }

            const tip = points[points.length - 1];
            const glow = ctx.createRadialGradient(
                tip.x,
                tip.y,
                0,
                tip.x,
                tip.y,
                baseWidth * 1.5
            );
            glow.addColorStop(0, "rgba(255, 255, 255, 0.8)");
            glow.addColorStop(0.3, rgba(c, 0.6));
            glow.addColorStop(1, rgba(c, 0));
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, baseWidth * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = glow;
            ctx.fill();
        };

        const drawComet = (
            dt: number,
            life: number,
            ease: (t: number) => number
        ) => {
            const p = live.current;
            const c = p.rgb;

            for (const s of sparks) {
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                s.vx *= decay(0.98, dt);
                s.vy *= decay(0.98, dt);
                s.twinkle += 9 * dt;

                const t = s.age / life;
                const fade = 1 - ease(t);
                const twinkle = 0.7 + 0.3 * Math.sin(s.twinkle);
                const alpha = fade * twinkle;
                const size = s.size * (1 - t * 0.5);
                if (size < 0.5) continue;

                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.rotation + t * 2);

                const inner = ctx.createRadialGradient(
                    0,
                    0,
                    0,
                    0,
                    0,
                    size * 1.5
                );
                inner.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
                inner.addColorStop(0.3, rgba(c, alpha * 0.7));
                inner.addColorStop(1, rgba(c, 0));
                ctx.beginPath();
                ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
                ctx.fillStyle = inner;
                ctx.fill();

                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
                ctx.lineWidth = size * 0.3;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(-size * 1.2, 0);
                ctx.lineTo(size * 1.2, 0);
                ctx.moveTo(0, -size * 1.2);
                ctx.lineTo(0, size * 1.2);
                ctx.stroke();
                ctx.restore();
            }

            const head = p.particleSize * 1.2;
            const outer = ctx.createRadialGradient(
                headX,
                headY,
                0,
                headX,
                headY,
                head * 3
            );
            outer.addColorStop(0, rgba(c, 0.35));
            outer.addColorStop(0.5, rgba(c, 0.1));
            outer.addColorStop(1, rgba(c, 0));
            ctx.beginPath();
            ctx.arc(headX, headY, head * 3, 0, Math.PI * 2);
            ctx.fillStyle = outer;
            ctx.fill();

            const mid = ctx.createRadialGradient(
                headX,
                headY,
                0,
                headX,
                headY,
                head * 1.5
            );
            mid.addColorStop(0, "rgba(255, 255, 255, 0.9)");
            mid.addColorStop(0.5, rgba(c, 0.7));
            mid.addColorStop(1, rgba(c, 0));
            ctx.beginPath();
            ctx.arc(headX, headY, head * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = mid;
            ctx.fill();

            const core = ctx.createRadialGradient(
                headX,
                headY,
                0,
                headX,
                headY,
                head * 0.7
            );
            core.addColorStop(0, "rgba(255, 255, 255, 1)");
            core.addColorStop(0.6, "rgba(255, 255, 255, 0.8)");
            core.addColorStop(1, rgba(c, 0.5));
            ctx.beginPath();
            ctx.arc(headX, headY, head * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = core;
            ctx.fill();
        };

        const drawBubbles = (
            dt: number,
            life: number,
            ease: (t: number) => number
        ) => {
            const p = live.current;
            const c = p.rgb;

            for (const b of bubbles) {
                b.wobble += b.wobbleSpeed * dt;
                b.x += (b.vx + Math.sin(b.wobble) * 30) * dt;
                b.y += b.vy * dt;
                b.vy *= decay(0.995, dt);
                b.vx *= decay(0.98, dt);

                const t = b.age / life;
                b.alpha = b.baseAlpha * (1 - ease(t));
                if (b.alpha < 0.05) continue;
                const size = b.size * (1 + t * 0.3);

                ctx.beginPath();
                ctx.arc(b.x, b.y, size, 0, Math.PI * 2);
                ctx.strokeStyle = rgba(c, b.alpha * 0.6);
                ctx.lineWidth = 1.5;
                ctx.stroke();

                const body = ctx.createRadialGradient(
                    b.x - size * 0.3,
                    b.y - size * 0.3,
                    0,
                    b.x,
                    b.y,
                    size
                );
                body.addColorStop(0, `rgba(255, 255, 255, ${b.alpha * 0.3})`);
                body.addColorStop(0.5, rgba(c, b.alpha * 0.15));
                body.addColorStop(1, rgba(c, b.alpha * 0.05));
                ctx.beginPath();
                ctx.arc(b.x, b.y, size, 0, Math.PI * 2);
                ctx.fillStyle = body;
                ctx.fill();

                const hx = b.x - size * 0.35;
                const hy = b.y - size * 0.35;
                const hr = size * 0.35;
                const hi = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
                hi.addColorStop(0, `rgba(255, 255, 255, ${b.alpha * 0.7})`);
                hi.addColorStop(1, "rgba(255, 255, 255, 0)");
                ctx.beginPath();
                ctx.arc(hx, hy, hr, 0, Math.PI * 2);
                ctx.fillStyle = hi;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(
                    b.x + size * 0.25,
                    b.y + size * 0.3,
                    size * 0.15,
                    0,
                    Math.PI * 2
                );
                ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha * 0.4})`;
                ctx.fill();
            }

            const cursor = p.particleSize * 0.8;
            const glow = ctx.createRadialGradient(
                headX,
                headY,
                0,
                headX,
                headY,
                cursor * 2
            );
            glow.addColorStop(0, "rgba(255, 255, 255, 0.5)");
            glow.addColorStop(0.5, rgba(c, 0.3));
            glow.addColorStop(1, rgba(c, 0));
            ctx.beginPath();
            ctx.arc(headX, headY, cursor * 2, 0, Math.PI * 2);
            ctx.fillStyle = glow;
            ctx.fill();
        };

        const drawConstellation = (
            dt: number,
            life: number,
            ease: (t: number) => number
        ) => {
            const p = live.current;
            const c = p.rgb;

            for (const q of particles) {
                q.vx *= decay(0.96, dt);
                q.vy *= decay(0.96, dt);
                q.x += q.vx * dt;
                q.y += q.vy * dt;

                const t = q.age / life;
                q.alpha = 1 - ease(t);
                const size = q.size * (1 - t * 0.2);

                const gradient = ctx.createRadialGradient(
                    q.x,
                    q.y,
                    0,
                    q.x,
                    q.y,
                    Math.max(0.5, size)
                );
                gradient.addColorStop(0, rgba(c, q.alpha));
                gradient.addColorStop(0.7, rgba(c, q.alpha * 0.6));
                gradient.addColorStop(1, rgba(c, 0));
                ctx.beginPath();
                ctx.arc(q.x, q.y, Math.max(0.5, size), 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            const reach = p.particleSize * 5;
            const limit = Math.min(particles.length, 40);
            ctx.lineWidth = 1;
            for (let i = 0; i < limit; i++) {
                const a = particles[i];
                for (let j = i + 1; j < Math.min(i + 5, limit); j++) {
                    const b = particles[j];
                    const dist = Math.hypot(b.x - a.x, b.y - a.y);
                    if (dist >= reach) continue;
                    const alpha = (1 - dist / reach) * a.alpha * b.alpha * 0.5;
                    ctx.strokeStyle = rgba(c, alpha);
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }

            const cursor = p.particleSize * 1.5;
            const glow = ctx.createRadialGradient(
                headX,
                headY,
                0,
                headX,
                headY,
                cursor * 2.5
            );
            glow.addColorStop(0, rgba(c, 0.4));
            glow.addColorStop(1, rgba(c, 0));
            ctx.beginPath();
            ctx.arc(headX, headY, cursor * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = glow;
            ctx.fill();

            const core = ctx.createRadialGradient(
                headX,
                headY,
                0,
                headX,
                headY,
                cursor
            );
            core.addColorStop(0, "rgba(255, 255, 255, 0.9)");
            core.addColorStop(0.3, rgba(c, 1));
            core.addColorStop(1, rgba(c, 0.8));
            ctx.beginPath();
            ctx.arc(headX, headY, cursor, 0, Math.PI * 2);
            ctx.fillStyle = core;
            ctx.fill();
        };

        let raf = 0;
        let last = performance.now();

        const frame = (now: number) => {
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
            last = now;
            const p = live.current;
            const life = p.life;
            const ease = trailEase;

            ctx.clearRect(0, 0, w, h);

            if (p.trailStyle !== styleAtLastFrame) {
                particles = [];
                sparks = [];
                bubbles = [];
                points = [];
                styleAtLastFrame = p.trailStyle;
            }

            if (reduced) {
                raf = requestAnimationFrame(frame);
                return;
            }

            if (dt > 0) {
                const vEase = 1 - Math.exp(-dt / VELOCITY_TAU);
                velX += ((mouseX - prevX) / dt - velX) * vEase;
                velY += ((mouseY - prevY) / dt - velY) * vEase;
            }
            prevX = mouseX;
            prevY = mouseY;

            const clampPredict = (v: number) =>
                Math.max(
                    -HEAD_PREDICT_MAX,
                    Math.min(HEAD_PREDICT_MAX, v * HEAD_PREDICT)
                );
            headX = mouseX + clampPredict(velX);
            headY = mouseY + clampPredict(velY);
            if (!inside) {
                headX = -1e5;
                headY = -1e5;
            }

            spawnAcc += dt;
            const spawnStep = 1 / SPAWN_HZ;
            const moving = inside && now - lastMoveTime < MOVE_GRACE_MS;
            while (spawnAcc >= spawnStep) {
                spawnAcc -= spawnStep;
                if (seededPointer && moving) emit(mouseX, mouseY, velX, velY);
            }

            for (const q of particles) q.age += dt;
            for (const s of sparks) s.age += dt;
            for (const b of bubbles) b.age += dt;
            for (const pt of points) pt.age += dt;
            particles = particles.filter((q) => q.age < life);
            sparks = sparks.filter((s) => s.age < life);
            bubbles = bubbles.filter((b) => b.age < life * 1.5);
            points = points.filter((pt) => pt.age < life);

            switch (p.trailStyle) {
                case "ribbon":
                    drawRibbon(life, ease);
                    break;
                case "comet":
                    drawComet(dt, life, ease);
                    break;
                case "bubbles":
                    drawBubbles(dt, life * 1.5, ease);
                    break;
                default:
                    drawConstellation(dt, life, ease);
            }

            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
            ro?.disconnect();
            window.removeEventListener(moveEvent, onMove as EventListener);
            motionQuery.removeEventListener("change", onMotionChange);
        };
    }, []);

    const labelNode = label ? (
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
    ) : null;

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                pointerEvents: "none",
                ...style,
            }}
        >
            {labelNode}
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    opacity: 0,
                    pointerEvents: "none",
                }}
            />
        </div>
    );
}

const __presetProps = {
  "trailStyle": "constellation",
  "trailColor": "#FA7319",
  "particleSize": 6,
  "intensity": 10,
  "flow": 6,
  "trailLength": 10,
  "label": true,
  "labelText": "HOVER AROUND",
  "labelColor": "#FFFFFF",
  "labelFont": {
    "fontFamily": "Inter",
    "variant": "SemiBold",
    "fontWeight": 400,
    "fontSize": "48px",
    "lineHeight": "1.5em",
    "letterSpacing": "0em",
    "textAlign": "left"
  }
};

export default function CursorAnimations(props: Record<string, unknown>) {
  return <__BaseImpl_CursorAnimations {...(__presetProps as Record<string, unknown>)} {...props} />;
}
