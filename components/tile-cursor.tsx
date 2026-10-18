"use client";

import { useEffect, useRef } from "react";

type Transition = {
  type?: string;
  duration?: number;
  ease?: string | number[];
};

type Props = {
  label?: boolean;
  labelText?: string;
  labelColor?: string;
  labelFont?: React.CSSProperties;
  text?: string;
  font?: React.CSSProperties;
  textColor?: string;
  gridSize?: number;
  rounded?: number;
  trailLength?: number;
  colorMode?: "single" | "multi";
  color?: string;
  colors?: string[];
  transition?: Transition;
  exitScale?: number;
  style?: React.CSSProperties;
};

const DEFAULT_TRANSITION: Transition = {
  type: "tween",
  duration: 0.8,
  ease: "ease",
};

const DEFAULT_LABEL_FONT: React.CSSProperties = {
  fontSize: "48px",
  fontWeight: 400,
  lineHeight: "1.5em",
  letterSpacing: "0em",
  textAlign: "left",
} as React.CSSProperties;

const DEFAULTS = {
  label: false,
  labelText: "HOVER ME",
  labelColor: "#FFFFFF",
  text: "STUDIO",
  textColor: "#FFFFFF",
  gridSize: 44,
  rounded: 34,
  trailLength: 50,
  colorMode: "multi" as const,
  color: "#FA7319",
  exitScale: 50,
};

const HOLD = 30;

const DEFAULT_COLORS = ["#FFDD9C", "#F9B637", "#FB6C00", "#E73F1E"];

const DEFAULT_FONT: React.CSSProperties = {
  fontFamily: "Inter",
  fontSize: "40px",
  fontWeight: 400,
  textAlign: "center",
  lineHeight: "1em",
  letterSpacing: "0em",
} as React.CSSProperties;

const NAMED_EASES: Record<string, number[]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  circIn: [0.55, 0, 1, 0.45],
  circOut: [0, 0.55, 0.45, 1],
  circInOut: [0.85, 0, 0.15, 1],
  backIn: [0.36, 0, 0.66, -0.56],
  backOut: [0.34, 1.56, 0.64, 1],
  backInOut: [0.68, -0.6, 0.32, 1.6],
  anticipate: [0.36, 0, 0.66, -0.56],
};

function makeEaseFn(transition?: Transition) {
  let pts: number[] = NAMED_EASES.easeInOut;
  const ease = transition?.ease;
  if (Array.isArray(ease) && ease.length === 4 && ease.every(Number.isFinite)) {
    pts = ease as number[];
  } else if (typeof ease === "string" && NAMED_EASES[ease]) {
    pts = NAMED_EASES[ease];
  }
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
      const dx = 3 * u * u * x1 + 6 * u * s * (x2 - x1) + 3 * s * s * (1 - x2);
      if (Math.abs(dx) < 1e-6) break;
      s -= cx / dx;
      s = Math.max(0, Math.min(1, s));
    }
    return bez(y1, y2, s);
  };
}

type Tile = {
  node: HTMLDivElement;
  age: number;
};

function __BaseImpl_GridCursor(props: Props) {
  const {
    text = DEFAULTS.text,
    textColor = DEFAULTS.textColor,
    gridSize = DEFAULTS.gridSize,
    rounded = DEFAULTS.rounded,
    trailLength = DEFAULTS.trailLength,
    colorMode = DEFAULTS.colorMode,
    color = DEFAULTS.color,
    exitScale = DEFAULTS.exitScale,
    label = DEFAULTS.label,
    labelText = DEFAULTS.labelText,
    labelColor = DEFAULTS.labelColor,
    style,
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const font = { ...DEFAULT_FONT, ...props.font };
  const transition = { ...DEFAULT_TRANSITION, ...props.transition };
  const colors =
    Array.isArray(props.colors) && props.colors.length
      ? props.colors
      : DEFAULT_COLORS;

  const live = useRef({
    text,
    textColor,
    gridSize,
    rounded,
    trailLength,
    colorMode,
    color,
    colors,
    font,
    exitScale,
    duration: transition.duration,
    ease: makeEaseFn(transition),
  });
  live.current = {
    text,
    textColor,
    gridSize,
    rounded,
    trailLength,
    colorMode,
    color,
    colors,
    font,
    exitScale,
    duration: transition.duration,
    ease: makeEaseFn(transition),
  };

  const labelFont = { ...DEFAULT_LABEL_FONT, ...props.labelFont };

  useEffect(() => {
    const host = hostRef.current;
    const frameEl = frameRef.current;
    if (!host || !frameEl) return;

    const tag = document.createElement("style");
    tag.textContent = `*, a, button, [role="button"] { cursor: none !important; }`;
    let cursorHidden = false;
    const hideNativeCursor = (hide: boolean) => {
      if (hide === cursorHidden) return;
      cursorHidden = hide;
      if (hide) document.head.appendChild(tag);
      else tag.remove();
    };

    let tiles: Tile[] = [];
    let index = 0;
    let lastCol = NaN;
    let lastRow = NaN;

    const spawn = (col: number, row: number) => {
      const p = live.current;
      const chars = p.text ? Array.from(p.text) : [];
      const cell = Math.max(1, p.gridSize);

      const char = chars.length ? chars[index % chars.length] : "";
      const fill =
        p.colorMode === "multi" && p.colors.length
          ? p.colors[index % p.colors.length]
          : p.color;
      index++;

      const node = document.createElement("div");
      node.textContent = char === "\n" ? "" : char;
      Object.assign(node.style, p.font as any, {
        position: "absolute",
        left: `${col * cell}px`,
        top: `${row * cell}px`,
        width: `${cell}px`,
        height: `${cell}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: fill,
        borderRadius: `${(Math.max(0, Math.min(100, p.rounded)) / 100) * (cell / 2)}px`,
        color: p.textColor,
        lineHeight: "1em",
        whiteSpace: "pre",
        userSelect: "none",
        pointerEvents: "none",
        willChange: "opacity, transform",
      });
      host.appendChild(node);
      tiles.push({ node, age: 0 });

      const max = Math.max(1, p.trailLength);
      while (tiles.length > max) {
        const old = tiles.shift();
        old?.node.remove();
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = frameEl.getBoundingClientRect();
      const over =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      hideNativeCursor(over);
      if (!over) {
        lastCol = NaN;
        lastRow = NaN;
        return;
      }
      host.style.opacity = "1";

      const p = live.current;
      const cell = Math.max(1, p.gridSize);
      const sx = rect.width > 0 ? frameEl.clientWidth / rect.width : 1;
      const sy = rect.height > 0 ? frameEl.clientHeight / rect.height : 1;
      const x = (e.clientX - rect.left) * sx;
      const y = (e.clientY - rect.top) * sy;

      const col = Math.floor(x / cell);
      const row = Math.floor(y / cell);
      if (col === lastCol && row === lastRow) return;
      lastCol = col;
      lastRow = row;
      spawn(col, row);
    };
    const onWindowLeave = () => hideNativeCursor(false);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onWindowLeave);

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const p = live.current;
      const life = Math.max(0.1, p.duration ?? 0.8);
      const holdT = life * (HOLD / 100);
      const fade = Math.max(0.001, life - holdT);

      const survivors: Tile[] = [];
      for (const tile of tiles) {
        tile.age += dt;
        if (tile.age >= life) {
          tile.node.remove();
          continue;
        }
        const progress = tile.age <= holdT ? 0 : (tile.age - holdT) / fade;
        const eased = p.ease(progress);
        const s = tile.node.style;
        s.opacity = String(1 - eased);
        if (p.exitScale !== 100) {
          s.transform = `scale(${1 - eased * (1 - p.exitScale / 100)})`;
        }
        survivors.push(tile);
      }
      tiles = survivors;

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      hideNativeCursor(false);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onWindowLeave);
      for (const tile of tiles) tile.node.remove();
      tiles = [];
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
        ref={hostRef}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

const __presetProps = {
  "text": "STUDIO",
  "font": {
    "fontFamily": "Inter",
    "variant": "Semibold",
    "fontWeight": 400,
    "fontSize": "40px",
    "lineHeight": "1em",
    "letterSpacing": "0em",
    "textAlign": "center"
  },
  "textColor": "#FFFFFF",
  "colorMode": "multi",
  "color": "#FA7319",
  "colors": [
    "#FFDD9C",
    "#F9B637",
    "#FB6C00",
    "#E73F1E"
  ],
  "gridSize": 44,
  "rounded": 34,
  "trailLength": 50,
  "exitScale": 50,
  "transition": {
    "type": "tween",
    "stiffness": 800,
    "damping": 60,
    "mass": 1,
    "duration": 0.8,
    "ease": "ease"
  },
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

export default function GridCursor(props: Record<string, unknown>) {
  return <__BaseImpl_GridCursor {...(__presetProps as Record<string, unknown>)} {...props} />;
}
