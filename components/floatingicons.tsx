"use client";

import {
    useEffect,
    useRef,
    useState,
    useMemo,
    startTransition,
    type CSSProperties,
    type ReactNode,
} from "react";

interface ImageValue {
    src: string;
    alt?: string;
}

interface Props {
    image?: ImageValue;
    loop?: boolean;
    minSpeed?: number;
    maxSpeed?: number;
    minShake?: number;
    maxShake?: number;
    amount?: number;
    minSize?: number;
    maxSize?: number;
    coverage?: number;
    mode?: "image" | "text";
    text?: string;
    direction?: "top" | "bottom";
    style?: CSSProperties;
}

interface Bubble {
    key: string;
    x: number;
    startOffset: number;
    size: number;
    px: number;
    wobble: { f: number; phase: number; w: number }[];
    shakeAmp: number;
    riseScale: number;
    emoji: string;
}

function splitEmoji(text: string): string[] {
    const t = text.trim();
    if (!t) return [];
    const Seg = (typeof Intl !== "undefined" && (Intl as any).Segmenter) || null;
    const parts = Seg
        ? Array.from(
              new Seg(undefined, { granularity: "grapheme" }).segment(t),
              (s: any) => s.segment
          )
        : Array.from(t);
    return parts.filter((c: string) => c.trim() !== "");
}

const MAX_START = 0.2;
const RISE = 0.65;
const CYCLE_SCALE = 0.25;

function __BaseImpl_BubbleUp(props: Props) {
    const {
        image = { src: "", alt: "" },
        loop = true,
        minSpeed = 20,
        maxSpeed = 23,
        minShake = 32,
        maxShake = 0,
        amount = 30,
        minSize = 4,
        maxSize = 54,
        coverage = 100,
        mode = "text",
        text = "❤️",
        direction = "bottom",
        style,
    } = props;
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 400, height: 600 });
    const [inView, setInView] = useState(true);

    const sizeRange = Math.max(0, maxSize - minSize);

    useEffect(() => {
        if (!containerRef.current) return;
        if (typeof window === "undefined") return;
        const handle = (entries: IntersectionObserverEntry[]) => {
            startTransition(() => setInView(entries[0].isIntersecting));
        };
        const observer = new window.IntersectionObserver(handle, {
            threshold: 0.01,
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const update = () => {
            const w = container.clientWidth || container.offsetWidth || 0;
            const h = container.clientHeight || container.offsetHeight || 0;
            if (w > 0 && h > 0) setDimensions({ width: w, height: h });
        };
        update();
        let observer: ResizeObserver | undefined;
        if (typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver(update);
            observer.observe(container);
        }
        window.addEventListener("resize", update);
        return () => {
            observer?.disconnect();
            window.removeEventListener("resize", update);
        };
    }, []);

    const [time, setTime] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const cycleIndex = Math.floor(time);
    const cyclePhase = time - cycleIndex;

    useEffect(() => {
        if (!hasStarted && inView) {
            startTransition(() => setHasStarted(true));
        }
    }, [inView, hasStarted]);

    useEffect(() => {
        if (!inView || !hasStarted) return;
        let frame = 0;
        let last = performance.now();
        let running = true;
        const animate = (now: number) => {
            if (!running) return;
            const dt = (now - last) / 1e3;
            last = now;
            startTransition(() =>
                setTime((t) => t + dt * (maxSpeed / 50) * CYCLE_SCALE)
            );
            frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => {
            running = false;
            cancelAnimationFrame(frame);
        };
    }, [maxSpeed, inView, hasStarted]);

    const regenKey = loop ? cycleIndex : 0;
    const emojis = useMemo(() => splitEmoji(text), [text]);
    useEffect(() => {
        const shakeLo = Math.min(minShake, maxShake);
        const shakeHi = Math.max(minShake, maxShake);
        const spdLo = Math.max(1, Math.min(minSpeed, maxSpeed));
        const spdHi = Math.max(1, Math.max(minSpeed, maxSpeed));
        const arr: Bubble[] = [];
        for (let i = 0; i < amount; i++) {
            const shakeVal = shakeLo + Math.random() * (shakeHi - shakeLo);
            const spdVal = spdLo + Math.random() * (spdHi - spdLo);
            arr.push({
                key: regenKey + "-" + i,
                x: Math.random(),
                startOffset: Math.random() * MAX_START,
                size: 0.7 + Math.random() * 0.6,
                px: minSize + Math.random() * sizeRange,
                shakeAmp: (shakeVal / 100) * 90,
                riseScale: spdVal / spdHi,
                wobble: [
                    {
                        f: 2 + Math.random() * 2,
                        phase: Math.random() * 2 * Math.PI,
                        w: 1,
                    },
                    {
                        f: 4 + Math.random() * 3,
                        phase: Math.random() * 2 * Math.PI,
                        w: 0.5,
                    },
                    {
                        f: 6 + Math.random() * 4,
                        phase: Math.random() * 2 * Math.PI,
                        w: 0.3,
                    },
                ],
                emoji: emojis.length
                    ? emojis[Math.floor(Math.random() * emojis.length)]
                    : text,
            });
        }
        setBubbles(arr);
    }, [
        regenKey,
        amount,
        minSize,
        maxSize,
        sizeRange,
        mode,
        image.src,
        text,
        emojis,
        minShake,
        maxShake,
        minSpeed,
        maxSpeed,
    ]);

    const bubbleNodes = useMemo<ReactNode[] | null>(() => {
        if (!hasStarted) return null;
        const travel = dimensions.height * (coverage / 100);
        if (!loop && cycleIndex >= 1) return [];

        const nodes: ReactNode[] = [];
        bubbles.forEach((b) => {
            const p = ((cyclePhase - b.startOffset) * b.riseScale) / RISE;
            if (p <= 0 || p >= 1) return;
            const zigzagAmplitude = b.shakeAmp * b.size;
            let wander = 0;
            let wsum = 0;
            for (const h of b.wobble) {
                wander += Math.sin(p * h.f * Math.PI + h.phase) * h.w;
                wsum += h.w;
            }
            const zigzag = (wander / wsum) * zigzagAmplitude;
            const left = b.x * (dimensions.width - b.px) + zigzag + b.px / 2;
            const top =
                direction === "top"
                    ? p * travel - b.px
                    : dimensions.height - p * travel;
            let scale = 1;
            if (p < 0.15) scale = p / 0.15;
            else if (p > 0.85) scale = (1 - p) / 0.15;
            let opacity = 1;
            if (p < 0.1) opacity = p / 0.1;
            else if (p > 0.6) opacity = (1 - p) / 0.4;
            if (cyclePhase > 0.85)
                opacity *= Math.max(0, (1 - cyclePhase) / 0.15);
            if (opacity <= 0 || scale <= 0) return;
            nodes.push(
                renderBubble(b, left, top, scale, opacity, mode, image, text)
            );
        });
        return nodes;
    }, [
        bubbles,
        cyclePhase,
        cycleIndex,
        image.src,
        image.alt,
        dimensions,
        mode,
        text,
        loop,
        coverage,
        direction,
        hasStarted,
    ]);

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background: "transparent",
            }}
        >
            {bubbleNodes}
        </div>
    );
}

function renderBubble(
    b: Bubble,
    left: number,
    top: number,
    scale: number,
    opacity: number,
    mode: "image" | "text",
    image: ImageValue,
    text: string
): ReactNode {
    const common: CSSProperties = {
        position: "absolute",
        left,
        top,
        width: b.px,
        height: b.px,
        transform: `scale(${scale})`,
        opacity,
        pointerEvents: "none",
        filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.08))",
        transition: "opacity 0.2s, transform 0.2s",
    };
    if (mode === "image") {
        return (
            <img
                key={b.key}
                src={image.src}
                alt={image.alt}
                style={{ ...common, borderRadius: "50%" }}
            />
        );
    }
    return (
        <span
            key={b.key}
            style={{
                ...common,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: b.px * 0.6,
            }}
        >
            {b.emoji || text || "A"}
        </span>
    );
}

const __presetProps = {
  "loop": true,
  "mode": "text",
  "text": "❤️",
  "image": {
    "alt": "",
    "src": ""
  },
  "amount": 30,
  "maxSize": 54,
  "minSize": 4,
  "coverage": 100,
  "maxShake": 0,
  "maxSpeed": 23,
  "minShake": 32,
  "minSpeed": 20,
  "direction": "bottom"
};

export default function BubbleUp(props: Record<string, unknown>) {
  return <__BaseImpl_BubbleUp {...(__presetProps as Record<string, unknown>)} {...props} />;
}
