"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

type Border = {
  borderWidth?: number;
  borderStyle?: string;
  borderColor?: string;
};

type Padding =
  | number
  | string
  | {
      padding?: number;
      paddingTop?: number;
      paddingRight?: number;
      paddingBottom?: number;
      paddingLeft?: number;
    };

type Props = {
  label?: boolean;
  labelText?: string;
  labelColor?: string;
  labelFont?: React.CSSProperties;
  textArray?: string[];
  textColor?: string;
  font?: React.CSSProperties;
  fill?: string;
  border?: Border;
  padding?: Padding;
  textDuration?: number;
  trailFade?: number;
  showDots?: boolean;
  dotColor?: string;
  dotSize?: number;
  style?: React.CSSProperties;
};

const DEFAULT_FONT: React.CSSProperties = {
  fontFamily: "Inter",
  fontWeight: 400,
  fontSize: "24px",
  lineHeight: "1.2em",
  letterSpacing: "0em",
  textAlign: "left",
};

const DEFAULT_BORDER: Border = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#FF8512",
};

const DEFAULT_LABEL_FONT: React.CSSProperties = {
  fontFamily: "Inter",
  fontWeight: 400,
  fontSize: "48px",
  lineHeight: "1.5em",
  letterSpacing: "0em",
  textAlign: "left",
};

const DEFAULT_TEXTS = [
  "Software design",
  "Craft",
  "Interaction design",
  "Quality",
  "System Thinking",
  "What an honor ;)",
];

const DEFAULTS = {
  label: false,
  labelText: "HOVER ME",
  labelColor: "#FFFFFF",
  textColor: "#222222",
  fill: "#F5E7C6",
  padding: "12px",
  // Seconds each phrase holds before the next one
  textDuration: 3,
  // 1 = a copy lingers … 20 = it is gone almost at once
  trailFade: 14,
  showDots: true,
  dotColor: "#FA8112",
  dotSize: 8,
};

// Text Change is already in seconds; only clamped to the control's range.
const holdSeconds = (v: number) => Math.max(0.5, Math.min(5, v));

/** Trail Fade reads 1 = slow, 20 = fast, so it maps to a shrinking duration. */
const fadeSeconds = (v: number) => {
  const t = (Math.max(1, Math.min(20, v)) - 1) / 19;
  return 3 + (0.15 - 3) * t;
};

// The trail's fade curve, fixed now that the Transition control is gone. Only
// the duration is adjustable, via Trail Fade.
const TRAIL_EASE: number[] = [0.4, 0, 0.2, 1];

// A trail copy is laid down at most this often, and never more than MAX_TRAIL
// live at once — the two bounds the original lacked entirely.
const SPAWN_HZ = 60;
const MAX_TRAIL = 80;
const MIN_STEP = 4;

/** Cubic-bezier sampler — there is no motion runtime to lean on here. */
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
      const dx = 3 * u * u * x1 + 6 * u * s * (x2 - x1) + 3 * s * s * (1 - x2);
      if (Math.abs(dx) < 1e-6) break;
      s -= cx / dx;
      s = Math.max(0, Math.min(1, s));
    }
    return bez(y1, y2, s);
  };
}

const trailEase = makeEaseFn(TRAIL_EASE);

function paddingToCss(padding: Padding | undefined): string {
  if (typeof padding === "number") return `${padding}px`;
  if (typeof padding === "string") {
    const n = parseFloat(padding);
    return Number.isFinite(n) ? `${n}px` : "12px";
  }
  if (padding && typeof padding === "object") {
    if (typeof padding.padding === "number") return `${padding.padding}px`;
    const t = padding.paddingTop ?? 12;
    const r = padding.paddingRight ?? t;
    const b = padding.paddingBottom ?? t;
    const l = padding.paddingLeft ?? r;
    return `${t}px ${r}px ${b}px ${l}px`;
  }
  return "12px";
}

function borderToCss(border: Border | undefined): string {
  const b = { ...DEFAULT_BORDER, ...border };
  return `${b.borderWidth ?? 1}px ${b.borderStyle ?? "solid"} ${
    b.borderColor ?? "#000000"
  }`;
}

type Chip = {
  node: HTMLDivElement;
  label: HTMLDivElement;
  x: number;
  y: number;
  age: number;
  active: boolean;
};

const DOT_CORNERS = [
  { top: "0px", left: "0px", tx: "-50%", ty: "-50%" },
  { top: "0px", right: "0px", tx: "50%", ty: "-50%" },
  { bottom: "0px", left: "0px", tx: "-50%", ty: "50%" },
  { bottom: "0px", right: "0px", tx: "50%", ty: "50%" },
];

function __BaseImpl_TextCursor(props: Props) {
  const {
    textArray = DEFAULT_TEXTS,
    textColor = DEFAULTS.textColor,
    fill = DEFAULTS.fill,
    textDuration = DEFAULTS.textDuration,
    trailFade = DEFAULTS.trailFade,
    showDots = DEFAULTS.showDots,
    dotColor = DEFAULTS.dotColor,
    dotSize = DEFAULTS.dotSize,
    label = DEFAULTS.label,
    labelText = DEFAULTS.labelText,
    labelColor = DEFAULTS.labelColor,
    style,
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const font = { ...DEFAULT_FONT, ...props.font };
  // The list used to be one comma-separated string; older callers may still
  // hand one back, so both shapes are accepted.
  const raw: string[] = Array.isArray(textArray)
    ? textArray
    : typeof textArray === "string"
      ? (textArray as string).split(",")
      : DEFAULT_TEXTS;
  const phrases = raw.map((t) => (t ?? "").trim()).filter(Boolean);

  // Live props for the rAF loop — mutated in place so a prop tweak never
  // restarts the loop or clears the trail.
  const live = useRef({
    phrases,
    hold: holdSeconds(textDuration),
    life: fadeSeconds(trailFade),
  });
  live.current = {
    phrases,
    hold: holdSeconds(textDuration),
    life: fadeSeconds(trailFade),
  };

  const looks = useRef({
    font,
    textColor,
    fill,
    border: borderToCss(props.border),
    padding: paddingToCss(props.padding),
    showDots,
    dotColor,
    dotSize,
  });
  looks.current = {
    font,
    textColor,
    fill,
    border: borderToCss(props.border),
    padding: paddingToCss(props.padding),
    showDots,
    dotColor,
    dotSize,
  };
  const labelFont = { ...DEFAULT_LABEL_FONT, ...props.labelFont };

  useEffect(() => {
    const host = hostRef.current;
    const frameEl = frameRef.current;
    if (!host || !frameEl) return;

    // The native cursor is only replaced while the pointer is over this
    // frame — hiding it document-wide would blank it over the whole page
    // for a component that only owns its own section.
    const previousCursor = document.documentElement.style.cursor;
    let cursorHidden = false;
    const hideNativeCursor = (hide: boolean) => {
      if (hide === cursorHidden) return;
      cursorHidden = hide;
      document.documentElement.style.cursor = hide ? "none" : previousCursor;
    };

    const applyLook = (chip: Chip) => {
      const l = looks.current;
      const s = chip.node.style;
      Object.assign(s, l.font as any);
      // Absolute, not fixed: the chips live in the component's own frame
      // and are positioned in its space.
      s.position = "absolute";
      s.left = "0px";
      s.top = "0px";
      s.display = "flex";
      s.alignItems = "center";
      s.justifyContent = "center";
      s.width = "fit-content";
      s.height = "fit-content";
      s.whiteSpace = "nowrap";
      s.pointerEvents = "none";
      s.userSelect = "none";
      s.willChange = "transform, opacity";
      s.border = l.border;
      s.padding = l.padding;
      s.backgroundColor = l.fill;
      s.color = l.textColor;

      const dots = Array.from(
        chip.node.querySelectorAll("[data-dot]")
      ) as HTMLElement[];
      dots.forEach((dot, i) => {
        const c = DOT_CORNERS[i];
        dot.style.display = l.showDots ? "block" : "none";
        dot.style.width = `${l.dotSize}px`;
        dot.style.height = `${l.dotSize}px`;
        dot.style.backgroundColor = l.dotColor;
        dot.style.transform = `translate(${c.tx}, ${c.ty})`;
      });
    };

    const createChip = (): Chip => {
      const node = document.createElement("div");
      for (const c of DOT_CORNERS) {
        const dot = document.createElement("div");
        dot.setAttribute("data-dot", "");
        dot.style.position = "absolute";
        if (c.top) dot.style.top = c.top;
        if (c.bottom) dot.style.bottom = c.bottom;
        if (c.left) dot.style.left = c.left;
        if (c.right) dot.style.right = c.right;
        node.appendChild(dot);
      }
      const label = document.createElement("div");
      node.appendChild(label);
      host.appendChild(node);
      const chip: Chip = {
        node,
        label,
        x: 0,
        y: 0,
        age: 0,
        active: false,
      };
      applyLook(chip);
      return chip;
    };

    const head = createChip();
    head.node.style.zIndex = "1";
    head.node.style.opacity = "0";
    // Recycled rather than created and destroyed per movement.
    const pool: Chip[] = [];

    let mouseX = -9999;
    let mouseY = -9999;
    let lastX = mouseX;
    let lastY = mouseY;
    let seen = false;
    // False while the pointer is outside the frame — the head chip belongs
    // to the pointer, so it goes with it while the trail ages out.
    let inside = false;
    let spawnAcc = 0;
    let clock = 0;
    let phraseIndex = -1;

    const onMove = (e: PointerEvent) => {
      // Tracked on the document so movement is picked up even before it
      // enters the frame; the rect does the hit test.
      const rect = frameEl.getBoundingClientRect();
      const over =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      hideNativeCursor(over);
      if (!over) {
        inside = false;
        return;
      }
      const sx = rect.width > 0 ? frameEl.clientWidth / rect.width : 1;
      const sy = rect.height > 0 ? frameEl.clientHeight / rect.height : 1;
      mouseX = (e.clientX - rect.left) * sx;
      mouseY = (e.clientY - rect.top) * sy;
      // A chip is never dragged in from where the pointer left the frame.
      if (!inside) {
        lastX = mouseX;
        lastY = mouseY;
      }
      seen = true;
      inside = true;
      host.style.opacity = "1";
    };
    const onWindowLeave = () => {
      inside = false;
      hideNativeCursor(false);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onWindowLeave);

    const spawn = (text: string) => {
      let chip = pool.find((c) => !c.active);
      if (!chip) {
        if (pool.length >= MAX_TRAIL) return;
        chip = createChip();
        pool.push(chip);
      }
      applyLook(chip);
      chip.label.textContent = text;
      chip.x = mouseX;
      chip.y = mouseY;
      chip.age = 0;
      chip.active = true;
      chip.node.style.zIndex = "0";
    };

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      // Clamp dt so a backgrounded tab does not expire the whole trail in
      // one frame.
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const p = live.current;
      const life = p.life;

      if (!seen || !inside) {
        // The head belongs to the pointer, so it goes when the pointer
        // leaves the frame; the trail below keeps ageing out.
        head.node.style.opacity = "0";
        if (!seen) {
          raf = requestAnimationFrame(frame);
          return;
        }
      }

      // Phrase rotation off the same clock — no interval, no state.
      clock += dt;
      const dwell = p.hold;
      const list = p.phrases.length ? p.phrases : ["Add text"];
      const idx = Math.floor(clock / dwell) % list.length;
      if (idx !== phraseIndex) {
        phraseIndex = idx;
        head.label.textContent = list[idx];
        applyLook(head);
      }

      if (inside) {
        head.node.style.opacity = "1";
        head.node.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
      }

      const moved = Math.hypot(mouseX - lastX, mouseY - lastY);
      spawnAcc += dt;
      const step = 1 / SPAWN_HZ;
      while (spawnAcc >= step) {
        spawnAcc -= step;
        // Nothing new is laid down while the pointer is away; what is
        // already there keeps ageing.
        if (inside && moved >= MIN_STEP) {
          spawn(list[idx]);
          lastX = mouseX;
          lastY = mouseY;
        }
      }

      for (const chip of pool) {
        if (!chip.active) continue;
        chip.age += dt;
        if (chip.age >= life) {
          chip.active = false;
          chip.node.style.opacity = "0";
          continue;
        }
        const eased = trailEase(chip.age / life);
        // Every copy fades to nothing as it shrinks, rather than popping
        // out of existence at full strength.
        chip.node.style.opacity = String(1 - eased);
        chip.node.style.transform = `translate(${chip.x}px, ${chip.y}px) scale(${1 - eased * 0.5})`;
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
      head.node.remove();
      for (const chip of pool) chip.node.remove();
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
        // The effect belongs to this frame, so it is clipped to it.
        overflow: "hidden",
        // A cursor effect must never swallow a click meant for whatever
        // sits under it; the pointer is tracked on the document.
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
          // Hidden until the pointer is first seen over the frame.
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

const __presetProps = {
  "textArray": [
    "text button",
    "cursor",
    "component",
    "animation"
  ],
  "font": {
    "fontFamily": "Inter",
    "variant": "Medium",
    "fontWeight": 400,
    "fontSize": "24px",
    "lineHeight": "1.2em",
    "letterSpacing": "0em",
    "textAlign": "left"
  },
  "textColor": "#222222",
  "fill": "#F5E7C6",
  "border": {
    "borderWidth": 1,
    "borderStyle": "solid",
    "borderColor": "#FF8512"
  },
  "padding": "12px",
  "textDuration": 3,
  "trailFade": 14,
  "showDots": true,
  "dotColor": "#FA8112",
  "dotSize": 8,
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

export default function TextCursor(props: Record<string, unknown>) {
  return <__BaseImpl_TextCursor {...(__presetProps as Record<string, unknown>)} {...props} />;
}
