"use client";

import { useRef, useEffect, type CSSProperties } from "react";

const DEFAULT_IMAGE =
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/17fccb3f-a5f6-441c-d10e-a6e3c8fa7800/w=800";

type Mode = "onImage" | "followCursor";
type Fit = "cover" | "contain";

const DEFAULTS = {
    mode: "followCursor" as Mode,
    restX: 50,
    restY: 50,
    fit: "cover" as Fit,
    focusY: 37,
    veilColor: "#000000",
    size: 400,
    visibility: 20,
    rounded: 37,
    transition: {
        type: "tween",
        stiffness: 800,
        damping: 60,
        mass: 1,
        duration: 0.4,
        ease: "easeInOut",
    } as any,
};

const FOLLOW = 40;

const NAMED_EASES: Record<string, [number, number, number, number]> = {
    linear: [0, 0, 1, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
};

function cubicBezierEase(x1: number, y1: number, x2: number, y2: number) {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
    const dX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
    return (p: number) => {
        let t = p;
        for (let i = 0; i < 8; i++) {
            const x = sampleX(t) - p;
            const d = dX(t);
            if (Math.abs(x) < 1e-4 || Math.abs(d) < 1e-6) break;
            t -= x / d;
        }
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        return sampleY(t);
    };
}

function makeEase(ease: any) {
    if (Array.isArray(ease) && ease.length === 4)
        return cubicBezierEase(ease[0], ease[1], ease[2], ease[3]);
    const b =
        (typeof ease === "string" && NAMED_EASES[ease]) || NAMED_EASES.easeOut;
    return cubicBezierEase(b[0], b[1], b[2], b[3]);
}

const durationOf = (transition: any, fallback: number) =>
    typeof transition?.duration === "number" ? transition.duration : fallback;

interface ResponsiveImage {
    src: string;
    srcSet?: string;
    alt?: string;
}

interface SpotlightRevealProps {
    image?: ResponsiveImage | string;
    mode?: Mode;
    restX?: number;
    restY?: number;
    fit?: Fit;
    focusY?: number;
    veilColor?: string;
    size?: number;
    visibility?: number;
    rounded?: number;
    transition?: any;
    style?: CSSProperties;
}

const clampFocus = (value: number) =>
    Math.min(100, Math.max(0, typeof value === "number" ? value : 50));

function resolveImageSrc(image: unknown): string | undefined {
    if (!image) return undefined;
    if (typeof image === "string") return image.trim() || undefined;
    return (image as ResponsiveImage).src || undefined;
}

function maskFor(x: string, y: string, size: number): string {
    return `radial-gradient(circle ${size}px at ${x} ${y}, transparent 0px, rgba(0,0,0,1) ${size}px)`;
}

function __BaseImpl_SpotlightReveal(props: SpotlightRevealProps) {
    const {
        image = {
            src: DEFAULT_IMAGE,
        },
        mode = DEFAULTS.mode,
        restX = DEFAULTS.restX,
        restY = DEFAULTS.restY,
        fit = DEFAULTS.fit,
        focusY = DEFAULTS.focusY,
        veilColor = DEFAULTS.veilColor,
        size = DEFAULTS.size,
        visibility = DEFAULTS.visibility,
        rounded = DEFAULTS.rounded,
        transition = DEFAULTS.transition,
        style,
    } = props;

    const rootRef = useRef<HTMLDivElement | null>(null);
    const veilRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const rootEl = rootRef.current;
        const veilEl = veilRef.current;
        if (!rootEl || !veilEl) return;
        const root: HTMLDivElement = rootEl;
        const veil: HTMLDivElement = veilEl;

        function restingPoint() {
            return {
                x: (root.clientWidth * restX) / 100,
                y: (root.clientHeight * restY) / 100,
            };
        }

        function toLocal(event: PointerEvent) {
            const bounds = root.getBoundingClientRect();
            const sx = bounds.width > 0 ? root.clientWidth / bounds.width : 1;
            const sy = bounds.height > 0 ? root.clientHeight / bounds.height : 1;
            return {
                x: (event.clientX - bounds.left) * sx,
                y: (event.clientY - bounds.top) * sy,
            };
        }

        const ease = makeEase(transition?.ease);
        const durMs = Math.max(0.001, durationOf(transition, 0.4)) * 1000;

        const current = restingPoint();
        const target = { ...current };
        let presence = mode === "onImage" ? 1 : 0;
        let animFrom = presence;
        let animTo = presence;
        let animStart = 0;
        let hovering = false;
        let raf = 0;
        let last = 0;
        let alive = true;

        function onMove(event: PointerEvent) {
            const { x, y } = toLocal(event);
            if (!hovering && presence < 0.01) {
                current.x = x;
                current.y = y;
            }
            hovering = true;
            target.x = x;
            target.y = y;
        }
        function onLeave(event: PointerEvent) {
            hovering = false;
            if (mode === "onImage") {
                const rest = restingPoint();
                target.x = rest.x;
                target.y = rest.y;
            } else {
                const { x, y } = toLocal(event);
                current.x = x;
                current.y = y;
                target.x = x;
                target.y = y;
            }
        }

        function frame(time: number) {
            if (!alive) return;
            const dt = last ? Math.min((time - last) / 1000, 0.05) : 1 / 60;
            last = time;
            const follow = 1 - Math.pow(1 - FOLLOW / 100, dt * 60);
            current.x += (target.x - current.x) * follow;
            current.y += (target.y - current.y) * follow;

            const want = mode === "onImage" || hovering ? 1 : 0;
            if (want !== animTo) {
                animFrom = presence;
                animTo = want;
                animStart = time;
            }
            const p = Math.min(1, (time - animStart) / durMs);
            presence = animFrom + (animTo - animFrom) * ease(p);

            const radius = size * presence;
            if (radius < 0.5) {
                veil.style.maskImage = "none";
                veil.style.webkitMaskImage = "none";
            } else {
                const mask = maskFor(`${current.x}px`, `${current.y}px`, radius);
                veil.style.maskImage = mask;
                veil.style.webkitMaskImage = mask;
            }
            raf = requestAnimationFrame(frame);
        }

        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(() => {
                if (hovering) return;
                const rest = restingPoint();
                target.x = rest.x;
                target.y = rest.y;
            });
            ro.observe(root);
        }

        root.addEventListener("pointermove", onMove);
        root.addEventListener("pointerleave", onLeave);
        raf = requestAnimationFrame(frame);

        return () => {
            alive = false;
            cancelAnimationFrame(raf);
            ro?.disconnect();
            root.removeEventListener("pointermove", onMove);
            root.removeEventListener("pointerleave", onLeave);
        };
    }, [size, mode, restX, restY, JSON.stringify(transition)]);

    const restingMask =
        mode === "onImage" ? maskFor(`${restX}%`, `${restY}%`, size) : "none";
    const src = resolveImageSrc(image) || DEFAULT_IMAGE;

    return (
        <div
            ref={rootRef}
            style={{
                ...style,
                position: "relative",
                overflow: "visible",
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
            }}
        >
            {src ? (
                <img
                    src={src}
                    srcSet={typeof image === "object" ? image?.srcSet : undefined}
                    alt={typeof image === "object" ? (image?.alt ?? "") : ""}
                    draggable={false}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: fit,
                        objectPosition:
                            fit === "cover"
                                ? `center ${clampFocus(focusY)}%`
                                : "center",
                        borderRadius: rounded,
                        userSelect: "none",
                    }}
                />
            ) : null}
            <div
                ref={veilRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    background: veilColor,
                    opacity: 1 - visibility / 100,
                    borderRadius: rounded,
                    pointerEvents: "none",
                    maskImage: restingMask,
                    WebkitMaskImage: restingMask,
                }}
            />
        </div>
    );
}

const __presetProps = {
  "fit": "contain",
  "mode": "followCursor",
  "size": 59,
  "image": {
    "src": "https://images.unsplash.com/photo-1676276383599-478e31770aac?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  "restX": 50,
  "restY": 50,
  "focusY": 37,
  "rounded": 0,
  "veilColor": "#000000",
  "transition": {
    "ease": [
      0.6,
      0.04,
      0.98,
      0.335
    ],
    "mass": 1,
    "type": "tween",
    "delay": 0,
    "damping": 60,
    "duration": 0.4,
    "stiffness": 800
  },
  "visibility": 5
};

export default function SpotlightReveal(props: Record<string, unknown>) {
  return <__BaseImpl_SpotlightReveal {...(__presetProps as Record<string, unknown>)} {...props} />;
}
