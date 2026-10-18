"use client";

import * as React from "react";
import { useEffect, useMemo, useRef } from "react";
import { useMotionValue, animate } from "framer-motion";

type Direction = "clockwise" | "anticlockwise";
type Stack = "firstOnTop" | "lastOnTop";
type Fit = "cover" | "contain";

interface Ring {
  radiusX: number;
  radiusY: number;
  tilt: boolean;
  repeat: number;
}

interface ImageItem {
  image?: { src?: string; srcSet?: string; alt?: string } | string;
  focusY?: number;
}

interface Transition {
  type?: string;
  stiffness?: number;
  damping?: number;
  mass?: number;
  ease?: string;
  duration?: number;
}

interface CircleImageProps {
  images?: ImageItem[];
  ring?: Ring;
  fit?: Fit;
  cardWidth?: number;
  cardHeight?: number;
  rounded?: number;
  transition?: Transition;
  direction?: Direction;
  stack?: Stack;
  drag?: boolean;
  style?: React.CSSProperties;
}

const DEFAULT_IMAGES: ImageItem[] = [
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/859c75ea-953e-489e-be61-91a03a35d700/w=800",
    },
    focusY: 40,
  },
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/7d4d2641-d6a8-4fef-e85c-b12ed100d500/w=800",
    },
    focusY: 0,
  },
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/bd541261-75be-469c-7dc0-dae0ce81c400/w=800",
    },
    focusY: 0,
  },
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8e0d22a8-ac82-4893-90d8-3403f80ec600/w=800",
    },
    focusY: 0,
  },
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/f8b3688c-11d0-425c-0b6f-66f133322c00/w=800",
    },
    focusY: 50,
  },
];

const DEFAULT_RING: Ring = { radiusX: 200, radiusY: 200, tilt: true, repeat: 6 };

const DEFAULT_TRANSITION: Transition = {
  type: "tween",
  stiffness: 800,
  damping: 60,
  mass: 1,
  ease: "linear",
  duration: 25,
};

const DEFAULT_FOCUS_Y = 50;

const TILT_ON = 1;

const roundedRadius = (rounded: number, width: number, height: number) => {
  const step = Math.min(20, Math.max(0, rounded)) / 20;
  if (step <= 0) return 0;
  return `${(width / 2) * step}px / ${(height / 2) * step}px`;
};

function resolveImageSrc(item: unknown): string | undefined {
  const image = (item as ImageItem)?.image;
  if (!image) return undefined;
  if (typeof image === "string") return image.trim() || undefined;
  return image.src || undefined;
}

function resolveSrcSet(item: unknown): string | undefined {
  const image = (item as ImageItem)?.image;
  if (!image || typeof image === "string") return undefined;
  return image.srcSet || undefined;
}

function focusOf(item: unknown): number {
  const value = (item as ImageItem)?.focusY;
  const n = typeof value === "number" ? value : DEFAULT_FOCUS_Y;
  return Math.min(100, Math.max(0, n));
}

function __BaseImpl_CircleImage({
  images = DEFAULT_IMAGES,
  ring = DEFAULT_RING,
  fit = "cover",
  cardWidth = 200,
  cardHeight = 200,
  rounded = 20,
  transition = DEFAULT_TRANSITION,
  direction = "anticlockwise",
  stack = "lastOnTop",
  drag = true,
  style,
}: CircleImageProps) {
  const radiusX = ring?.radiusX ?? DEFAULT_RING.radiusX;
  const radiusY = ring?.radiusY ?? DEFAULT_RING.radiusY;
  const tilt = ring?.tilt ?? DEFAULT_RING.tilt;
  const repeat = ring?.repeat ?? DEFAULT_RING.repeat;

  const cardRadius = roundedRadius(rounded, cardWidth, cardHeight);

  const reach = tilt ? Math.hypot(cardWidth, cardHeight) : 0;
  const spanX = reach || cardWidth;
  const spanY = reach || cardHeight;
  const boxWidth = radiusX * 2 + spanX;
  const boxHeight = radiusY * 2 + spanY;

  const imagesKey = JSON.stringify(images?.length ? images : DEFAULT_IMAGES);
  const cards = useMemo(() => {
    const list = (JSON.parse(imagesKey) as unknown[]).filter((image) =>
      resolveImageSrc(image)
    );
    if (list.length === 0) return [];
    const times = Math.max(1, Math.round(repeat));
    const out: unknown[] = [];
    for (let r = 0; r < times; r++) out.push(...list);
    return out;
  }, [imagesKey, repeat]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const angle = useMotionValue(0);
  const animationRef = useRef<any>(null);

  const draggingRef = useRef(false);
  const dragStartAngleRef = useRef(0);
  const dragStartPointerRef = useRef(0);
  const velocityRef = useRef(0);
  const lastTimeRef = useRef(0);

  const liveRef = useRef({ direction, transition, drag });
  liveRef.current = { direction, transition, drag };

  const geometry = useMemo(
    () => ({
      rx: radiusX,
      ry: radiusY,
      tangent: tilt ? TILT_ON : 0,
    }),
    [radiusX, radiusY, tilt]
  );

  const pointerAngle = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.atan2(
      clientY - (rect.top + rect.height / 2),
      clientX - (rect.left + rect.width / 2)
    );
  };

  const spin = () => {
    const live = liveRef.current;
    if (draggingRef.current) return;

    animationRef.current?.stop();
    const sign = live.direction === "anticlockwise" ? -1 : 1;
    animationRef.current = animate(
      angle,
      angle.get() + Math.PI * 2 * sign,
      { ...live.transition, repeat: Infinity } as any
    );
  };

  const onDragStart = (clientX: number, clientY: number) => {
    if (!liveRef.current.drag) return;
    draggingRef.current = true;
    animationRef.current?.stop();
    dragStartAngleRef.current = angle.get();
    dragStartPointerRef.current = pointerAngle(clientX, clientY);
    velocityRef.current = 0;
    lastTimeRef.current = performance.now();
  };

  const onDragMove = (clientX: number, clientY: number) => {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dt = now - lastTimeRef.current;
    lastTimeRef.current = now;

    const swept = pointerAngle(clientX, clientY) - dragStartPointerRef.current;
    const target = dragStartAngleRef.current + swept;
    if (dt > 0) velocityRef.current = (target - angle.get()) / dt;
    angle.set(target);
  };

  const onDragEnd = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    if (liveRef.current.drag && Math.abs(velocityRef.current) > 0.03) {
      animationRef.current = animate(angle, angle.get(), {
        type: "inertia",
        velocity: velocityRef.current * 1000,
        power: 0.8,
        timeConstant: 700,
        restDelta: 0.01,
        onComplete: spin,
      } as any);
    } else {
      spin();
    }
  };

  useEffect(() => {
    spin();
    return () => animationRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, JSON.stringify(transition), cards.length]);

  useEffect(() => {
    const onMove = (event: MouseEvent) =>
      draggingRef.current && onDragMove(event.clientX, event.clientY);
    const onTouch = (event: TouchEvent) => {
      if (draggingRef.current && event.touches.length)
        onDragMove(event.touches[0].clientX, event.touches[0].clientY);
    };
    window.addEventListener("mouseup", onDragEnd);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchend", onDragEnd);
    window.addEventListener("touchmove", onTouch, { passive: false });
    return () => {
      window.removeEventListener("mouseup", onDragEnd);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchend", onDragEnd);
      window.removeEventListener("touchmove", onTouch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const place = (current: number) => {
      const count = cards.length;
      for (let i = 0; i < count; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;

        const at = current + (i * Math.PI * 2) / count;
        const x = Math.cos(at) * geometry.rx;
        const y = Math.sin(at) * geometry.ry;
        const facing = (at * 180) / Math.PI + 90;

        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${
          facing * geometry.tangent
        }deg)`;
      }
    };

    place(angle.get());
    const unsubscribe = angle.on
      ? angle.on("change", place)
      : (angle as any).onChange(place);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry, cards.length]);

  return (
    <div
      ref={containerRef}
      style={{
        ...style,
        width: style?.width ?? boxWidth,
        height: style?.height ?? boxHeight,
        boxSizing: "border-box",
        position: "relative",
        overflow: "visible",
        cursor: drag ? "grab" : "default",
        userSelect: "none",
      }}
      onMouseDown={(e) => {
        if (e.button === 0) onDragStart(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        if (e.touches.length)
          onDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1,
          height: 1,
        }}
      >
        {cards.map((image, index) => {
          const src = resolveImageSrc(image);
          const layer = stack === "firstOnTop" ? cards.length - index : index;

          return (
            <div
              key={`${index}-${src}`}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: cardWidth,
                height: cardHeight,
                zIndex: layer,
                willChange: "transform",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: cardRadius,
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                {src ? (
                  <img
                    src={src}
                    srcSet={resolveSrcSet(image)}
                    alt=""
                    draggable={false}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: fit,
                      objectPosition:
                        fit === "cover" ? `center ${focusOf(image)}%` : "center",
                      display: "block",
                      pointerEvents: "none",
                    }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const __presetProps = {
  "images": [
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/859c75ea-953e-489e-be61-91a03a35d700/w=800"
      },
      "focusY": 40
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/7d4d2641-d6a8-4fef-e85c-b12ed100d500/w=800"
      },
      "focusY": 0
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/bd541261-75be-469c-7dc0-dae0ce81c400/w=800"
      },
      "focusY": 0
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8e0d22a8-ac82-4893-90d8-3403f80ec600/w=800"
      },
      "focusY": 0
    },
    {
      "image": {
        "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/f8b3688c-11d0-425c-0b6f-66f133322c00/w=800"
      },
      "focusY": 50
    }
  ],
  "fit": "cover",
  "cardWidth": 82,
  "cardHeight": 82,
  "rounded": 7,
  "ring": {
    "tilt": false,
    "repeat": 2,
    "radiusX": 218,
    "radiusY": 20
  },
  "direction": "clockwise",
  "stack": "firstOnTop",
  "transition": {
    "ease": "linear",
    "mass": 1,
    "type": "tween",
    "damping": 60,
    "duration": 25,
    "stiffness": 800
  },
  "drag": true
};

export default function CircleImage(props: Record<string, unknown>) {
  return <__BaseImpl_CircleImage {...(__presetProps as Record<string, unknown>)} {...props} />;
}
