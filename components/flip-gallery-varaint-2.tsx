"use client";

import { motion } from "framer-motion";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";

interface ImageItem {
  image?: { src?: string; alt?: string } | string;
  focusY?: number;
}

interface TiltOptions {
  effect: "attract" | "repel";
  tiltLimit: number;
  scale: number;
}

interface ImageFlipProps {
  images: ImageItem[];
  fit: "cover" | "contain";
  rounded: number;
  transition: any;
  tilt: boolean;
  tiltOptions: TiltOptions;
  style?: CSSProperties;
}

const DEFAULT_ITEMS: ImageItem[] = [
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/12e8b0be-f114-4134-1ab7-53116bfc2800/w=800",
    },
    focusY: 50,
  },
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/08f4d1ae-43ca-4879-80f4-c1e7969eef00/w=800",
    },
    focusY: 50,
  },
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/75367195-8fa6-4ff1-d0ce-68df4694a700/w=800",
    },
    focusY: 50,
  },
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/f0b7559d-35e2-4feb-ae16-7ca802b21f00/w=800",
    },
    focusY: 50,
  },
];

const DEFAULTS = {
  fit: "cover" as const,
  focusY: 50,
  rounded: 16,
  transition: {
    type: "tween",
    stiffness: 800,
    damping: 60,
    mass: 1,
    duration: 0.6,
    ease: "easeInOut",
  },
  tilt: true,
  tiltOptions: {
    effect: "repel" as const,
    tiltLimit: 15,
    scale: 123,
  },
};

const HALF_TURN = 180;
const PERSPECTIVE = 900;

const srcOf = (image: any): string =>
  typeof image === "string" ? image : (image?.src ?? "");

const focusOf = (item: ImageItem | undefined) =>
  Math.min(
    100,
    Math.max(
      0,
      typeof item?.focusY === "number" ? item.focusY : DEFAULTS.focusY
    )
  );

function __BaseImpl_ImageFlip(props: Partial<ImageFlipProps>) {
  const {
    images,
    fit = DEFAULTS.fit,
    rounded = DEFAULTS.rounded,
    transition = DEFAULTS.transition,
    tilt = DEFAULTS.tilt,
    tiltOptions = DEFAULTS.tiltOptions,
    style,
  } = props;

  const items = useMemo(() => {
    const list = (images ?? []).filter((item) => srcOf(item?.image));
    return list.length ? list : DEFAULT_ITEMS;
  }, [images]);
  const urls = useMemo(() => items.map((item) => srcOf(item.image)), [items]);

  const tiltRef = useRef<HTMLDivElement | null>(null);

  const effect = tiltOptions?.effect ?? DEFAULTS.tiltOptions.effect;
  const tiltLimit = tiltOptions?.tiltLimit ?? DEFAULTS.tiltOptions.tiltLimit;
  const scale = (tiltOptions?.scale ?? DEFAULTS.tiltOptions.scale) / 100;

  const [angle, setAngle] = useState(0);
  const [index, setIndex] = useState(0);
  const [faces, setFaces] = useState({ a: 0, b: 0 });

  const facing = (deg: number) =>
    Math.abs(Math.round(deg / HALF_TURN)) % 2 === 0 ? "a" : "b";

  const flip = (dir: 1 | -1) => {
    const n = urls.length;
    if (n < 2) return;

    const next = (index + dir + n) % n;

    const nextAngle = angle + dir * HALF_TURN;
    const incoming = facing(nextAngle);
    setFaces((f) => ({ ...f, [incoming]: next }));
    setIndex(next);
    setAngle(nextAngle);
  };

  const focusKey = JSON.stringify(items.map(focusOf));
  const lastFocusRef = useRef<number[] | null>(null);

  useEffect(() => {
    const next: number[] = JSON.parse(focusKey);
    const last = lastFocusRef.current;
    lastFocusRef.current = next;
    if (!last) return;
    const moved = next.findIndex((f, i) => i < last.length && last[i] !== f);
    if (moved < 0) return;
    setFaces((f) => ({ ...f, [facing(angle)]: moved }));
    setIndex(moved);
  }, [focusKey, angle]);

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeft = e.clientX - rect.left < rect.width / 2;
    flip(isLeft ? -1 : 1);
  };

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!tilt || !el) return;
    const { width, height, top, left } = el.getBoundingClientRect();
    const mult = effect === "repel" ? -1 : 1;
    const tiltX =
      ((e.clientY - top) / height - 0.5) * (tiltLimit * 2) * mult;
    const tiltY =
      ((e.clientX - left) / width - 0.5) * -(tiltLimit * 2) * mult;
    el.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(${scale}, ${scale}, ${scale})`;
  };

  const onLeave = () => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  };

  const faceStyle = (slot: number): CSSProperties => ({
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: fit,
    objectPosition:
      fit === "cover"
        ? `center ${focusOf(items[slot % items.length])}%`
        : "center",
    borderRadius: rounded,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    userSelect: "none",
    pointerEvents: "none",
  });

  return (
    <div
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: `${PERSPECTIVE}px`,
        cursor: urls.length > 1 ? "pointer" : "default",
      }}
    >
      <div
        ref={tiltRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={onClick}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.2s ease-out",
          willChange: "transform",
        }}
      >
        <motion.div
          animate={{ rotateY: angle }}
          transition={transition}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
          }}
        >
          <img
            src={urls[faces.a % urls.length]}
            alt=""
            draggable={false}
            style={faceStyle(faces.a)}
          />
          <img
            src={urls[faces.b % urls.length]}
            alt=""
            draggable={false}
            style={{
              ...faceStyle(faces.b),
              transform: "rotateY(180deg)",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

ImageFlip.defaultProps = {
  images: DEFAULT_ITEMS,
  fit: DEFAULTS.fit,
  rounded: DEFAULTS.rounded,
  transition: DEFAULTS.transition,
  tilt: DEFAULTS.tilt,
  tiltOptions: DEFAULTS.tiltOptions,
};

const __presetProps = {
  "images": [
    {
      "image": {
        "src": "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?q=80&w=2076&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      },
      "focusY": 100
    },
    {
      "image": {
        "src": "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      },
      "focusY": 50
    },
    {
      "image": {
        "src": "https://images.unsplash.com/photo-1539477857993-860599c2e840?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      },
      "focusY": 50
    },
    {
      "image": {
        "src": "https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      },
      "focusY": 50
    }
  ],
  "fit": "cover",
  "rounded": 22,
  "transition": {
    "ease": "easeInOut",
    "mass": 1,
    "type": "tween",
    "damping": 60,
    "duration": 0.6,
    "stiffness": 800
  },
  "tilt": false,
  "tiltOptions": {
    "scale": 123,
    "effect": "repel",
    "tiltLimit": 15
  }
};

export default function ImageFlip(props: Record<string, unknown>) {
  return <__BaseImpl_ImageFlip {...(__presetProps as Record<string, unknown>)} {...props} />;
}
