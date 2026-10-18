"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

type Props = {
    label?: boolean;
    labelText?: string;
    labelColor?: string;
    labelFont?: React.CSSProperties;
    headColor?: string;
    trailColor?: string;
    size?: number;
    trailLength?: number;
    trailThickness?: number;
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

// Follow lag, in seconds. Matches Advanced Cursor — small enough that the dot
// tracks the pointer without a visible trailing offset.
const FOLLOW_TAU = 0.01;
// Dot ⇄ ring morph rate, pinned to 10.
const SNAPPINESS = 10;
// Ring stroke and link underline weight.
const BORDER_WIDTH = 2;
// Ring diameter as a multiple of the dot size (12 → 40 at the old defaults).
const HOVER_SCALE = 3.3;

const DEFAULTS = {
    label: true,
    labelText: "HOVER ME",
    labelColor: "#FFFFFF",
    headColor: "#9FFFCB",
    trailColor: "#7AE582",
    size: 24,
    // 1 = a stub … 20 = a long comet tail (× 40ms, so 5 = 200ms)
    trailLength: 10,
    // 1 = hairline … 20 = as wide as the dot
    trailThickness: 12,
};

/** Re-alphas a hex, rgb() or rgba() color string. */
function withAlpha(input: string, alpha: number) {
    const a = Math.max(0, Math.min(1, alpha));
    if (typeof input !== "string") return `rgba(0,0,0,${a})`;
    const s = input.trim();

    const hex = s.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
        let h = hex[1];
        if (h.length === 3 || h.length === 4) {
            h = h
                .split("")
                .map((c) => c + c)
                .join("");
        }
        const n = parseInt(h.slice(0, 6), 16);
        if (!Number.isFinite(n)) return `rgba(0,0,0,${a})`;
        return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }

    const rgb = s.match(/^rgba?\(([^)]+)\)/i);
    if (rgb) {
        const parts = rgb[1].split(",").map((v) => parseFloat(v));
        if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
            return `rgba(${parts[0]},${parts[1]},${parts[2]},${a})`;
        }
    }
    return `rgba(0,0,0,${a})`;
}

const HIDE_SELECTOR =
    '[aria-label~="trail{hide}"],[data-framer-name~="trail{hide}"]';
const LINK_SELECTOR =
    '[aria-label~="trail{link}"],[data-framer-name~="trail{link}"]';
const RING_SELECTOR = 'a,button,[role="button"]';

function __BaseImpl_DotCursor(props: Props) {
    const {
        headColor = DEFAULTS.headColor,
        trailColor = DEFAULTS.trailColor,
        size = DEFAULTS.size,
        trailLength = DEFAULTS.trailLength,
        trailThickness = DEFAULTS.trailThickness,
        label = DEFAULTS.label,
        labelText = DEFAULTS.labelText,
        labelColor = DEFAULTS.labelColor,
        style,
    } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);

    // Live props for the rAF loop — mutated in place so tweaking a control
    // never tears down the canvas or resets the dot to the centre.
    const live = useRef({
        headColor,
        trailColor,
        size,
        trailLength,
        trailThickness,
    });
    live.current = {
        headColor,
        trailColor,
        size,
        trailLength,
        trailThickness,
    };
    const labelFont = { ...DEFAULT_LABEL_FONT, ...props.labelFont };

    useEffect(() => {
        const canvas = canvasRef.current;
        const host = frameRef.current;
        if (!canvas || !host) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let w = 1;
        let h = 1;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = Math.max(1, host.clientWidth);
            h = Math.max(1, host.clientHeight);
            canvas.width = Math.max(1, Math.floor(w * dpr));
            canvas.height = Math.max(1, Math.floor(h * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();

        // Screen pixels in, frame-local pixels out, plus whether the pointer is
        // over the frame at all. The pointer is tracked on the document rather
        // than on the frame — the frame passes events through — so the rect
        // does the hit test.
        const localize = (clientX: number, clientY: number) => {
            const rect = host.getBoundingClientRect();
            const sx = rect.width > 0 ? host.clientWidth / rect.width : 1;
            const sy = rect.height > 0 ? host.clientHeight / rect.height : 1;
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

        // The native cursor is only replaced while the pointer is over this
        // frame — hiding it document-wide would blank it over the whole page
        // for a component that only owns its own section.
        const previousCursor = document.documentElement.style.cursor;
        let cursorHidden = false;
        const hideNativeCursor = (hide: boolean) => {
            if (hide === cursorHidden) return;
            cursorHidden = hide;
            document.documentElement.style.cursor = hide
                ? "none"
                : previousCursor;
        };

        // Nothing is positioned until the pointer is actually seen — the dot
        // used to start at the centre of the screen and slide out from there.
        let ballX = 0;
        let ballY = 0;
        let targetX = 0;
        let targetY = 0;

        let radius = live.current.size / 2;
        let fillOpacity = 1;
        let strokeOpacity = 0;
        let lineOpacity = 0;
        let lineWidth = 0;
        let lineTargetWidth = 0;

        type Point = { x: number; y: number; age: number };
        let points: Point[] = [];

        // elementFromPoint is the expensive call in this loop, so only re-hit
        // test when the pointer actually moved.
        let hitDirty = true;
        let overHide = false;
        let overRing = false;
        let linkEl: Element | null = null;

        // Seeded on first sight rather than at frame centre, so the dot enters
        // from wherever the pointer does.
        let seeded = false;
        // False while the pointer is outside the FRAME. The dot hides, but the
        // trail is left to age out over its own lifetime rather than being
        // wiped — cutting it dead was the old behaviour.
        let inside = false;
        // The last viewport-space sample, kept alongside the local one because
        // elementFromPoint and getBoundingClientRect both speak client pixels.
        let hitX = 0;
        let hitY = 0;

        const seedAt = (x: number, y: number) => {
            seeded = true;
            targetX = x;
            targetY = y;
            ballX = x;
            ballY = y;
            // Nothing is shown until the pointer is first seen OVER THE FRAME,
            // so an untouched section has no cursor parked in it.
            canvas.style.opacity = "1";
            // A stale trail would otherwise be joined to the entry point by one
            // long chord across the frame.
            points = [];
        };

        // Walk the trail out to the exit point so a flick across the edge ends
        // at the border rather than wherever the last pointermove landed.
        const exitTo = (x: number, y: number) => {
            if (seeded && inside) {
                const gapX = x - ballX;
                const gapY = y - ballY;
                const gap = Math.hypot(gapX, gapY);
                if (gap > 1) {
                    // Spaced like the per-frame samples, so the taper over the
                    // final stretch matches the rest of the ribbon. Capped so a
                    // corner-to-corner flick cannot flood the buffer.
                    const steps = Math.min(32, Math.ceil(gap / 8));
                    for (let i = 1; i <= steps; i++) {
                        const t = i / steps;
                        points.push({
                            x: ballX + gapX * t,
                            y: ballY + gapY * t,
                            age: 0,
                        });
                    }
                }
                ballX = x;
                ballY = y;
                targetX = x;
                targetY = y;
            }
            inside = false;
            hitDirty = false;
            hideNativeCursor(false);
        };

        const onMove = (e: PointerEvent) => {
            const pt = localize(e.clientX, e.clientY);
            if (!pt.over) {
                if (inside) exitTo(pt.x, pt.y);
                return;
            }
            if (!seeded || !inside) seedAt(pt.x, pt.y);
            targetX = pt.x;
            targetY = pt.y;
            hitX = e.clientX;
            hitY = e.clientY;
            inside = true;
            hitDirty = true;
            hideNativeCursor(true);
        };
        // Leaving the window entirely never produces a pointermove outside the
        // frame, so the trail would be left hanging where it last was.
        const onWindowLeave = () => {
            if (inside) exitTo(targetX, targetY);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onWindowLeave);

        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(resize);
            ro.observe(host);
        }
        window.addEventListener("resize", resize);

        let raf = 0;
        let last = performance.now();

        const frame = (now: number) => {
            // Clamp dt so a backgrounded tab does not launch the dot.
            const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
            last = now;
            const p = live.current;

            ctx.clearRect(0, 0, w, h);

            // Before the pointer has ever been seen there is nothing to draw —
            // no dot parked anywhere, no trail.
            if (!seeded) {
                raf = requestAnimationFrame(frame);
                return;
            }

            // Exponential follow, same as Advanced Cursor — glued to the
            // pointer at any speed, with no standing lag proportional to
            // pointer velocity.
            const followEase = 1 - Math.exp(-dt / FOLLOW_TAU);
            ballX += (targetX - ballX) * followEase;
            ballY += (targetY - ballY) * followEase;

            if (hitDirty) {
                // Client pixels: the drawing coordinates are frame-local.
                const el = document.elementFromPoint(hitX, hitY);
                overHide = !!el?.closest(HIDE_SELECTOR);
                linkEl = el?.closest(LINK_SELECTOR) ?? null;
                overRing = !!el?.closest(RING_SELECTOR);
                hitDirty = false;
            }

            // A trail{hide} layer hides the whole cursor outright.
            if (overHide) {
                points = [];
                raf = requestAnimationFrame(frame);
                return;
            }

            const isLink = !!linkEl;
            // 1 → 40ms, 20 → 800ms of tail
            const trailMs = p.trailLength * 40;

            // Trail — sampled at the dot, aged out by wall time, drawn as ONE
            // tapered ribbon filled in a single pass so caps never composite
            // twice and bead the line.
            if (!isLink) {
                // Outside the window nothing new is laid down, but what is
                // already there keeps ageing — so the tail fades over its own
                // lifetime instead of blinking out the moment you leave.
                if (inside) points.push({ x: ballX, y: ballY, age: 0 });
                for (const pt of points) pt.age += dt * 1000;
                points = points.filter((pt) => pt.age < trailMs);

                const n = points.length;
                if (n > 1) {
                    const maxHalf = Math.max(
                        0.5,
                        ((p.trailThickness / 20) * p.size) / 2
                    );
                    // Offset each sample along its own normal; the width falls
                    // to zero at the oldest point, so the tail comes to a tip.
                    const lx: number[] = [];
                    const ly: number[] = [];
                    const rx: number[] = [];
                    const ry: number[] = [];
                    // Carried forward so a stationary run of samples (zero
                    // direction) reuses the last good normal instead of
                    // collapsing the ribbon.
                    let nx = 0;
                    let ny = 0;
                    for (let i = 0; i < n; i++) {
                        const prev = points[Math.max(0, i - 1)];
                        const next = points[Math.min(n - 1, i + 1)];
                        const dx = next.x - prev.x;
                        const dy = next.y - prev.y;
                        const len = Math.hypot(dx, dy);
                        if (len > 0.0001) {
                            nx = -dy / len;
                            ny = dx / len;
                        }
                        const t = Math.max(
                            0,
                            Math.min(1, 1 - points[i].age / trailMs)
                        );
                        const half = maxHalf * t;
                        lx.push(points[i].x + nx * half);
                        ly.push(points[i].y + ny * half);
                        rx.push(points[i].x - nx * half);
                        ry.push(points[i].y - ny * half);
                    }

                    ctx.beginPath();
                    ctx.moveTo(lx[0], ly[0]);
                    for (let i = 1; i < n; i++) ctx.lineTo(lx[i], ly[i]);
                    for (let i = n - 1; i >= 0; i--) ctx.lineTo(rx[i], ry[i]);
                    ctx.closePath();
                    ctx.fillStyle = p.trailColor;
                    ctx.fill();
                }
            } else {
                points = [];
            }

            // Snap onto a trail{link} layer and measure its underline. The
            // element's rect is in client pixels, so it is folded into the
            // frame's own space before anything is drawn from it.
            let link: { left: number; width: number; bottom: number } | null =
                null;
            if (linkEl) {
                const r = linkEl.getBoundingClientRect();
                const topLeft = localize(r.left, r.top);
                const bottomRight = localize(r.right, r.bottom);
                link = {
                    left: topLeft.x,
                    width: bottomRight.x - topLeft.x,
                    bottom: bottomRight.y,
                };
                ballX = link.left + link.width / 2;
                ballY = link.bottom;
                lineTargetWidth = link.width;
            } else {
                lineTargetWidth = 0;
            }

            // State morphs. Exponential smoothing so the rate is frame-rate
            // independent.
            const ease = 1 - Math.exp(-dt * (SNAPPINESS * 1.5));
            const targetRadius =
                overRing || isLink ? (p.size * HOVER_SCALE) / 2 : p.size / 2;
            radius += (targetRadius - radius) * ease;
            fillOpacity += ((overRing || isLink ? 0 : 1) - fillOpacity) * ease;
            strokeOpacity +=
                ((overRing && !isLink ? 1 : 0) - strokeOpacity) * ease;
            lineOpacity += ((isLink ? 1 : 0) - lineOpacity) * ease;
            lineWidth += (lineTargetWidth - lineWidth) * ease;

            // The dot itself belongs to the pointer, so it goes when the
            // pointer does — only the trail is left to finish fading.
            if (!inside) {
                raf = requestAnimationFrame(frame);
                return;
            }

            if (isLink && link && lineOpacity > 0.01) {
                const y = link.bottom + 1;
                const startX = link.left + (link.width - lineWidth) / 2;
                ctx.beginPath();
                ctx.moveTo(startX, y);
                ctx.lineTo(startX + lineWidth, y);
                ctx.strokeStyle = withAlpha(p.headColor, lineOpacity);
                ctx.lineWidth = BORDER_WIDTH;
                ctx.lineCap = "round";
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(ballX, ballY, Math.max(0.5, radius), 0, Math.PI * 2);
                if (strokeOpacity > 0.01) {
                    ctx.strokeStyle = withAlpha(p.headColor, strokeOpacity);
                    ctx.lineWidth = BORDER_WIDTH;
                    ctx.stroke();
                }
                if (fillOpacity > 0.01) {
                    ctx.fillStyle = withAlpha(p.headColor, fillOpacity);
                    ctx.fill();
                }
            }

            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            hideNativeCursor(false);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("resize", resize);
            ro?.disconnect();
            document.documentElement.removeEventListener(
                "pointerleave",
                onWindowLeave
            );
        };
    }, []);

    // Sits in the component's own frame, centred — the cue to hover.
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
            ref={frameRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                // The effect belongs to this frame, so it is clipped to it —
                // nothing spills over the rest of the page.
                overflow: "hidden",
                // A cursor effect must never swallow a click meant for whatever
                // sits under it; the pointer is tracked on the document.
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
  "headColor": "#9FFFCB",
  "trailColor": "#7AE582",
  "size": 24,
  "trailLength": 10,
  "trailThickness": 12,
  "label": true,
  "labelText": "HOVER ME",
  "labelColor": "#FFFFFF",
  "labelFont": {
    "variant": "SemiBold",
    "fontSize": "48px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 400,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  }
};

export default function DotCursor(props: Record<string, unknown>) {
  return <__BaseImpl_DotCursor {...(__presetProps as Record<string, unknown>)} {...props} />;
}
