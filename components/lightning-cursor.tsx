"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

type Props = {
    label?: boolean;
    labelText?: string;
    labelColor?: string;
    labelFont?: React.CSSProperties;
    color?: string;
    thickness?: number;
    glowIntensity?: number;
    trailLength?: number;
    intensity?: number;
    style?: React.CSSProperties;
};

const DEFAULT_LABEL_FONT: React.CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontWeight: 400,
    fontSize: "48px",
    lineHeight: "1.5em",
    letterSpacing: "0em",
    textAlign: "left",
};

const DEFAULTS = {
    label: true,
    labelText: "HOVER ME",
    labelColor: "#FFFFFF",
    color: "#FCCA46",
    thickness: 1,
    glowIntensity: 0,
    trailLength: 10,
    intensity: 100,
};

const CRACKLE = 20;
const FADE_SPEED = 15;
const MAX_SPREAD = 40;

const SEG_PX = 5;
const MAX_SUB = 64;
const MIN_STEP = 8;
const SMOOTHNESS = 0.7;
const GLYPH_THICKNESS = 2;
const BRANCH_CHANCE = 0.02;
const BRANCH_MIN_DIST = 15;

type Branch = { t: number; angle: number; length: number };
type Bolt = { offsets: number[]; branches: Branch[] };
type Point = { x: number; y: number };

const GLYPH: Point[] = [
    { x: 0, y: 0 },
    { x: 0, y: 18 },
    { x: 5, y: 14 },
    { x: 9, y: 23 },
    { x: 12, y: 21 },
    { x: 8, y: 12 },
    { x: 15, y: 12 },
    { x: 0, y: 0 },
];

function makeBolt(): Bolt {
    const offsets: number[] = [];
    const branches: Branch[] = [];
    for (let i = 0; i < MAX_SUB; i++) {
        offsets.push(Math.random() - 0.5);
        if (Math.random() < BRANCH_CHANCE) {
            branches.push({
                t: i / MAX_SUB,
                angle: (Math.random() - 0.5) * (Math.PI / 1.5),
                length: 5 + Math.random() * 15,
            });
        }
    }
    return { offsets, branches };
}

function __BaseImpl_ElectricCursor(props: Props) {
    const {
        color = DEFAULTS.color,
        thickness = DEFAULTS.thickness,
        glowIntensity = DEFAULTS.glowIntensity,
        trailLength = DEFAULTS.trailLength,
        intensity = DEFAULTS.intensity,
        label = DEFAULTS.label,
        labelText = DEFAULTS.labelText,
        labelColor = DEFAULTS.labelColor,
        style,
    } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const live = useRef({
        color,
        thickness,
        glowIntensity,
        trailLength,
        intensity,
    });
    live.current = {
        color,
        thickness,
        glowIntensity,
        trailLength,
        intensity,
    };

    const labelFont = { ...DEFAULT_LABEL_FONT, ...props.labelFont };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const tag = document.createElement("style");
        tag.textContent = `*, a, button, [role="button"] { cursor: none !important; }`;
        let cursorHidden = false;
        const hideNativeCursor = (hide: boolean) => {
            if (hide === cursorHidden) return;
            cursorHidden = hide;
            if (hide) document.head.appendChild(tag);
            else tag.remove();
        };

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

        let mouseX = -9999;
        let mouseY = -9999;
        let seen = false;
        let inside = false;
        let lastMove = 0;
        let trail: Point[] = [];
        let bolts: Bolt[] = [];
        let glyphBolts: Bolt[] = [];
        let jitterAcc = 0;
        let fadeAcc = 0;

        const pushPoint = (x: number, y: number) => {
            const head = trail[0];
            if (!head || Math.hypot(x - head.x, y - head.y) >= MIN_STEP) {
                trail.unshift({ x, y });
            }
        };

        const onMove = (e: PointerEvent) => {
            const head = localize(e.clientX, e.clientY);
            hideNativeCursor(head.over);
            if (!head.over) {
                inside = false;
                return;
            }
            if (!inside) trail = [{ x: head.x, y: head.y }];

            const batch =
                typeof e.getCoalescedEvents === "function"
                    ? e.getCoalescedEvents()
                    : null;
            if (batch && batch.length) {
                for (const ev of batch) {
                    const pt = localize(ev.clientX, ev.clientY);
                    if (!pt.over) continue;
                    mouseX = pt.x;
                    mouseY = pt.y;
                    pushPoint(mouseX, mouseY);
                }
            } else {
                mouseX = head.x;
                mouseY = head.y;
                pushPoint(mouseX, mouseY);
            }
            seen = true;
            inside = true;
            lastMove = performance.now();
            canvas.style.opacity = "1";
        };
        const onWindowLeave = () => {
            inside = false;
            hideNativeCursor(false);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onWindowLeave);

        const rescramble = () => {
            const need = Math.max(2, live.current.trailLength);
            bolts = Array.from({ length: need }, makeBolt);
            glyphBolts = Array.from({ length: GLYPH.length - 1 }, makeBolt);
        };
        rescramble();

        const strokeBolt = (
            a: Point,
            b: Point,
            bolt: Bolt,
            width: number,
            spread: number,
            smooth: number,
            prev?: Point,
            next?: Point
        ) => {
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 1 || width < 0.1) return;
            const sub = Math.max(3, Math.min(MAX_SUB, Math.ceil(dist / SEG_PX)));
            const amp = Math.min(dist * 0.3, spread);
            const p0 = prev ?? a;
            const p3 = next ?? b;

            const cx: number[] = [];
            const cy: number[] = [];
            for (let i = 0; i <= sub; i++) {
                const t = i / sub;
                const t2 = t * t;
                const t3 = t2 * t;
                const crx =
                    0.5 *
                    (2 * a.x +
                        (-p0.x + b.x) * t +
                        (2 * p0.x - 5 * a.x + 4 * b.x - p3.x) * t2 +
                        (-p0.x + 3 * a.x - 3 * b.x + p3.x) * t3);
                const cry =
                    0.5 *
                    (2 * a.y +
                        (-p0.y + b.y) * t +
                        (2 * p0.y - 5 * a.y + 4 * b.y - p3.y) * t2 +
                        (-p0.y + 3 * a.y - 3 * b.y + p3.y) * t3);
                cx.push(a.x + dx * t + (crx - (a.x + dx * t)) * smooth);
                cy.push(a.y + dy * t + (cry - (a.y + dy * t)) * smooth);
            }

            const normalAt = (i: number): [number, number] => {
                const lo = Math.max(0, i - 1);
                const hi = Math.min(sub, i + 1);
                const tx = cx[hi] - cx[lo];
                const ty = cy[hi] - cy[lo];
                const len = Math.hypot(tx, ty);
                if (len < 0.0001) return [-dy / dist, dx / dist];
                return [-ty / len, tx / len];
            };

            ctx.beginPath();
            ctx.moveTo(cx[0], cy[0]);
            for (let i = 1; i < sub; i++) {
                const [nx, ny] = normalAt(i);
                const o = bolt.offsets[i] * amp;
                ctx.lineTo(cx[i] + nx * o, cy[i] + ny * o);
            }
            ctx.lineTo(cx[sub], cy[sub]);
            ctx.lineWidth = width;
            ctx.stroke();

            if (dist < BRANCH_MIN_DIST) return;
            const branchWidth = Math.max(1, width * 0.5);
            const alpha = ctx.globalAlpha;
            ctx.globalAlpha = alpha * 0.8;
            for (const br of bolt.branches) {
                const i = Math.min(sub, Math.floor(br.t * sub));
                const [nx, ny] = normalAt(i);
                const o = bolt.offsets[i] * amp;
                const sx = cx[i] + nx * o;
                const sy = cy[i] + ny * o;
                const ex = sx + Math.cos(br.angle) * br.length;
                const ey = sy + Math.sin(br.angle) * br.length;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo((sx + ex) / 2, (sy + ey) / 2);
                ctx.lineTo(ex, ey);
                ctx.lineWidth = branchWidth;
                ctx.stroke();
            }
            ctx.globalAlpha = alpha;
        };

        let raf = 0;
        let last = performance.now();

        const frame = (now: number) => {
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
            last = now;
            const p = live.current;
            const maxLen = Math.max(2, p.trailLength);

            jitterAcc += dt;
            const jitterStep = 1 / (CRACKLE * 2);
            if (jitterAcc >= jitterStep) {
                jitterAcc = 0;
                rescramble();
            }

            ctx.clearRect(0, 0, w, h);
            if (!seen) {
                raf = requestAnimationFrame(frame);
                return;
            }

            if (!trail.length) {
                if (!inside) {
                    raf = requestAnimationFrame(frame);
                    return;
                }
                trail = [{ x: mouseX, y: mouseY }];
            } else if (!inside || now - lastMove > 50) {
                fadeAcc += dt * FADE_SPEED * 6;
                while (fadeAcc >= 1 && trail.length > 1) {
                    fadeAcc -= 1;
                    trail.pop();
                }
            } else {
                fadeAcc = 0;
            }
            if (trail.length > maxLen) trail.length = maxLen;

            const spread =
                (Math.max(0, Math.min(100, p.intensity)) / 100) * MAX_SPREAD;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.shadowColor = p.color;

            const drawBolt = (
                a: Point,
                b: Point,
                bolt: Bolt,
                width: number,
                sp: number,
                glow: number,
                smooth: number,
                prev?: Point,
                next?: Point
            ) => {
                ctx.shadowBlur = glow * 0.6;
                ctx.strokeStyle = p.color;
                strokeBolt(a, b, bolt, width * 2.5, sp, smooth, prev, next);
                ctx.strokeStyle = "#FFFFFF";
                strokeBolt(a, b, bolt, width, sp, smooth, prev, next);
                ctx.shadowBlur = glow * 0.3;
                strokeBolt(a, b, bolt, width, sp, smooth, prev, next);
            };

            const head = trail[0];
            for (let i = 0; i < trail.length - 1; i++) {
                const fade = 1 - i / Math.max(1, trail.length - 1);
                if (fade <= 0.02) continue;
                ctx.globalAlpha = fade;
                drawBolt(
                    trail[i],
                    trail[i + 1],
                    bolts[i] ?? bolts[0],
                    p.thickness * fade,
                    spread,
                    p.glowIntensity * fade,
                    SMOOTHNESS,
                    trail[i - 1],
                    trail[i + 2]
                );
            }

            if (!inside) {
                ctx.globalAlpha = 1;
                ctx.shadowBlur = 0;
                raf = requestAnimationFrame(frame);
                return;
            }

            ctx.globalAlpha = 1;
            for (let i = 0; i < GLYPH.length - 1; i++) {
                drawBolt(
                    { x: head.x + GLYPH[i].x, y: head.y + GLYPH[i].y },
                    {
                        x: head.x + GLYPH[i + 1].x,
                        y: head.y + GLYPH[i + 1].y,
                    },
                    glyphBolts[i] ?? glyphBolts[0],
                    GLYPH_THICKNESS,
                    spread * 0.3,
                    p.glowIntensity,
                    0
                );
            }

            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            hideNativeCursor(false);
            window.removeEventListener("resize", resize);
            ro?.disconnect();
            window.removeEventListener("pointermove", onMove);
            document.documentElement.removeEventListener(
                "pointerleave",
                onWindowLeave
            );
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
  "color": "#FCCA46",
  "thickness": 1,
  "glowIntensity": 0,
  "trailLength": 10,
  "intensity": 100,
  "label": true,
  "labelText": "HOVER ME",
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

export default function ElectricCursor(props: Record<string, unknown>) {
  return <__BaseImpl_ElectricCursor {...(__presetProps as Record<string, unknown>)} {...props} />;
}
