"use client";

import * as React from "react";
import { useEffect, useId, useRef } from "react";

type Shadow = {
    color: string;
    blur: number;
};

type Props = {
    label?: boolean;
    labelText?: string;
    labelColor?: string;
    labelFont?: React.CSSProperties;
    blobType?: "circle" | "square";
    fillColor?: string;
    count?: number;
    size?: number;
    tailSize?: number;
    leadSpeed?: number;
    trailLag?: number;
    useFilter?: boolean;
    showShadow?: boolean;
    shadow?: Shadow;
    style?: React.CSSProperties;
};

const GOO_BLUR = 15;
const SHADOW_OFFSET = 0;
const EXIT_OVERSHOOT = 400;
const EXIT_MARGIN = 8;

const DEFAULT_SHADOW: Shadow = {
    color: "rgba(0, 0, 0, 0.2)",
    blur: 50,
};

const DEFAULT_LABEL_FONT: React.CSSProperties = {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "48px",
    lineHeight: "1.5em",
    letterSpacing: "0em",
    textAlign: "left",
};

const DEFAULTS = {
    label: false,
    labelText: "HOVER ME",
    labelColor: "#FFFFFF",
    blobType: "square" as const,
    fillColor: "#F5F5F5",
    count: 3,
    size: 60,
    tailSize: 40,
    leadSpeed: 10,
    trailLag: 10,
    useFilter: true,
    showShadow: true,
};

type Blob = {
    node: HTMLDivElement;
    x: number;
    y: number;
};

function ramp(head: number, tail: number, i: number, count: number) {
    if (count <= 1) return head;
    return head + (tail - head) * (i / (count - 1));
}

function __BaseImpl_CircleCursor(props: Props) {
    const {
        blobType = DEFAULTS.blobType,
        fillColor = DEFAULTS.fillColor,
        count = DEFAULTS.count,
        size = DEFAULTS.size,
        tailSize = DEFAULTS.tailSize,
        leadSpeed = DEFAULTS.leadSpeed,
        trailLag = DEFAULTS.trailLag,
        useFilter = DEFAULTS.useFilter,
        showShadow = DEFAULTS.showShadow,
        label = DEFAULTS.label,
        labelText = DEFAULTS.labelText,
        labelColor = DEFAULTS.labelColor,
        style,
    } = props;

    const hostRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const poolRef = useRef<Blob[]>([]);
    const cursorRef = useRef({ x: -9999, y: -9999 });

    const shadow = { ...DEFAULT_SHADOW, ...props.shadow };

    const filterId = `circle-cursor-goo-${useId().replace(/:/g, "")}`;

    const live = useRef({ count, leadSpeed, trailLag, size, tailSize });
    live.current = { count, leadSpeed, trailLag, size, tailSize };

    const labelFont = { ...DEFAULT_LABEL_FONT, ...props.labelFont };

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const pool = poolRef.current;
        const n = Math.max(1, count);

        while (pool.length > n) pool.pop()?.node.remove();
        while (pool.length < n) {
            const node = document.createElement("div");
            node.style.position = "absolute";
            node.style.left = "0px";
            node.style.top = "0px";
            node.style.willChange = "transform";
            host.appendChild(node);
            const ahead = pool[pool.length - 1];
            pool.push({
                node,
                x: ahead ? ahead.x : cursorRef.current.x,
                y: ahead ? ahead.y : cursorRef.current.y,
            });
        }

        return () => {
            for (const b of pool) b.node.remove();
            poolRef.current = [];
        };
    }, [count]);

    useEffect(() => {
        const pool = poolRef.current;
        const radius = blobType === "circle" ? "50%" : "0";
        pool.forEach((b, i) => {
            const w = ramp(size, tailSize, i, pool.length);
            const s2 = b.node.style;
            s2.width = `${w}px`;
            s2.height = `${w}px`;
            s2.marginLeft = `${-w / 2}px`;
            s2.marginTop = `${-w / 2}px`;
            s2.backgroundColor = fillColor;
            s2.borderRadius = radius;
            s2.boxShadow = showShadow
                ? `${SHADOW_OFFSET}px ${SHADOW_OFFSET}px ${shadow.blur}px ${shadow.color}`
                : "none";
        });
    }, [
        count,
        blobType,
        fillColor,
        size,
        tailSize,
        showShadow,
        shadow.color,
        shadow.blur,
    ]);

    useEffect(() => {
        const frameEl = frameRef.current;
        if (!frameEl) return;

        const localize = (clientX: number, clientY: number) => {
            const rect = frameEl.getBoundingClientRect();
            const sx = rect.width > 0 ? frameEl.clientWidth / rect.width : 1;
            const sy = rect.height > 0 ? frameEl.clientHeight / rect.height : 1;
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

        const previousCursor = document.documentElement.style.cursor;
        let cursorHidden = false;
        const hideNativeCursor = (hide: boolean) => {
            if (hide === cursorHidden) return;
            cursorHidden = hide;
            document.documentElement.style.cursor = hide
                ? "none"
                : previousCursor;
        };

        let seeded = false;
        let inside = false;

        const seedAt = (x: number, y: number) => {
            seeded = true;
            cursorRef.current.x = x;
            cursorRef.current.y = y;
            const root = rootRef.current;
            if (root) root.style.opacity = "1";
            for (const b of poolRef.current) {
                b.x = x;
                b.y = y;
            }
        };

        let stepX = 0;
        let stepY = 0;

        const exitTo = (x: number, y: number) => {
            if (seeded && inside) {
                let dx = x - cursorRef.current.x + stepX;
                let dy = y - cursorRef.current.y + stepY;
                const len = Math.hypot(dx, dy);
                if (len < 0.001) {
                    dx = x - frameEl.clientWidth / 2;
                    dy = y - frameEl.clientHeight / 2;
                }
                const n = Math.hypot(dx, dy) || 1;
                cursorRef.current.x = x + (dx / n) * EXIT_OVERSHOOT;
                cursorRef.current.y = y + (dy / n) * EXIT_OVERSHOOT;
            }
            inside = false;
            hideNativeCursor(false);
            const headNode = poolRef.current[0]?.node;
            if (headNode) headNode.style.opacity = "0";
        };

        const onMove = (e: PointerEvent) => {
            const pt = localize(e.clientX, e.clientY);
            if (!pt.over) {
                if (inside) exitTo(pt.x, pt.y);
                return;
            }
            if (!seeded || !inside) {
                seedAt(pt.x, pt.y);
                stepX = 0;
                stepY = 0;
                const headNode = poolRef.current[0]?.node;
                if (headNode) headNode.style.opacity = "1";
            }
            stepX = pt.x - cursorRef.current.x;
            stepY = pt.y - cursorRef.current.y;
            cursorRef.current.x = pt.x;
            cursorRef.current.y = pt.y;
            inside = true;
            hideNativeCursor(true);
        };
        const onWindowLeave = () => {
            if (inside) exitTo(cursorRef.current.x, cursorRef.current.y);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onWindowLeave);

        let raf = 0;
        let last = performance.now();

        const frame = (now: number) => {
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
            last = now;
            const p = live.current;
            const pool = poolRef.current;
            const cursor = cursorRef.current;

            const edge = Math.max(p.size, p.tailSize) / 2 + EXIT_MARGIN;
            const gone =
                !inside &&
                pool.every(
                    (b) =>
                        b.x < -edge ||
                        b.x > frameEl.clientWidth + edge ||
                        b.y < -edge ||
                        b.y > frameEl.clientHeight + edge
                );
            const visible = seeded && !gone;
            const hostEl = hostRef.current;
            const want = visible ? "1" : "0";
            if (hostEl && hostEl.style.opacity !== want) {
                hostEl.style.opacity = want;
            }
            if (!visible) {
                raf = requestAnimationFrame(frame);
                return;
            }

            const lead = Math.max(0.02, 0.8 / Math.max(1, p.leadSpeed));
            const lag = Math.max(lead * 1.5, p.trailLag / 10);

            for (let i = 0; i < pool.length; i++) {
                const b = pool[i];
                const duration = ramp(lead, lag, i, pool.length);
                const a = 1 - Math.exp(-dt / (duration / 3));
                b.x += (cursor.x - b.x) * a;
                b.y += (cursor.y - b.y) * a;
                b.node.style.transform = `translate(${b.x}px, ${b.y}px)`;
            }

            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            hideNativeCursor(false);
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
            {labelNode}
            <div
                ref={rootRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    overflow: "hidden",
                    opacity: 0,
                    pointerEvents: "none",
                }}
            >
                {useFilter && (
                    <svg
                        aria-hidden
                        style={{ position: "absolute", width: 0, height: 0 }}
                    >
                        <filter id={filterId}>
                            <feGaussianBlur
                                in="SourceGraphic"
                                stdDeviation={GOO_BLUR}
                                result="blur"
                            />
                            <feColorMatrix
                                in="blur"
                                values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 35 -10"
                            />
                        </filter>
                    </svg>
                )}
                <div
                    ref={hostRef}
                    style={{
                        position: "absolute",
                        inset: 0,
                        filter: useFilter ? `url(#${filterId})` : undefined,
                    }}
                />
            </div>
        </div>
    );
}

const __presetProps = {
  "size": 25,
  "count": 6,
  "label": true,
  "shadow": {
    "blur": 50,
    "color": "rgba(0, 0, 0, 0.2)"
  },
  "blobType": "circle",
  "tailSize": 50,
  "trailLag": 10,
  "fillColor": "#54FF5C",
  "labelFont": {
    "variant": "SemiBold",
    "fontSize": "48px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 400,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  },
  "labelText": "HOVER ME",
  "leadSpeed": 10,
  "useFilter": false,
  "labelColor": "#FFFFFF",
  "showShadow": true
};

export default function CircleCursor(props: Record<string, unknown>) {
  return <__BaseImpl_CircleCursor {...(__presetProps as Record<string, unknown>)} {...props} />;
}
