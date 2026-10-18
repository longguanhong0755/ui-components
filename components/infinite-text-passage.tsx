"use client";

import { useEffect, useRef, useMemo } from "react";
import { useAnimate, type Transition } from "framer-motion";

const TAGS = ["h1", "h2", "h3", "p", "div"] as const;

interface ZoomTextTunnelProps {
  texts?: string[];
  font?: React.CSSProperties;
  color?: string;
  tag?: (typeof TAGS)[number];
  maxScale?: number;
  hold?: number;
  transition?: Transition;
  style?: React.CSSProperties;
}

export default function ZoomTextTunnel(props: ZoomTextTunnelProps) {
  const {
    texts = ["EXPLORE", "CREATE", "INNOVATE", "FUTURE"],
    font = {
      fontFamily: "Inter",
      fontWeight: 400,
      fontSize: 120,
      lineHeight: "1em",
      letterSpacing: "-0.02em",
      textAlign: "center",
    },
    color = "#FFFFFF",
    tag = "h2",
    maxScale = 35,
    hold = 600,
    transition = {
      type: "tween",
      stiffness: 800,
      damping: 60,
      mass: 1,
      duration: 1.2,
      ease: [0.7, 0, 0.25, 1],
    },
    style,
  } = props;

  const [scope, animate] = useAnimate();
  const slot0Ref = useRef<HTMLSpanElement>(null);
  const slot1Ref = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef = useRef<any[]>([]);

  const safeTexts = useMemo(() => {
    const cleaned = Array.isArray(texts)
      ? texts.filter((t) => typeof t === "string" && t.length > 0)
      : [];
    return cleaned.length > 0 ? cleaned : ["ZOOM"];
  }, [texts]);

  const clampedMaxScale = useMemo(() => {
    const n = Number(maxScale);
    return Number.isFinite(n) ? Math.max(1, n) : 35;
  }, [maxScale]);

  const holdMs = useMemo(() => {
    const n = Number(hold);
    return Number.isFinite(n) ? Math.max(0, n) : 600;
  }, [hold]);

  const longest = useMemo(
    () => safeTexts.reduce((a, b) => (b.length > a.length ? b : a), safeTexts[0]),
    [safeTexts]
  );

  useEffect(() => {
    const slots = [slot0Ref.current, slot1Ref.current];
    const sel = [".slot-0", ".slot-1"];

    if (safeTexts.length <= 1) {
      if (slots[0]) slots[0].textContent = safeTexts[0];
      animate(sel[0], { scale: 1, opacity: 1 }, { duration: 0 });
      animate(sel[1], { scale: 0.05, opacity: 0 }, { duration: 0 });
      return;
    }

    let cancelled = false;
    let active = 0;
    let idx = 0;

    if (slots[0]) slots[0].textContent = safeTexts[0];
    animate(sel[0], { scale: 1, opacity: 1 }, { duration: 0 });
    animate(sel[1], { scale: 0.05, opacity: 0 }, { duration: 0 });

    const wait = (ms: number) =>
      new Promise<void>((res) => {
        timeoutRef.current = setTimeout(res, ms);
      });
    const settle = (c: any) => (c && c.finished ? c.finished : Promise.resolve());

    const run = async () => {
      while (!cancelled) {
        await wait(holdMs);
        if (cancelled) return;

        const inc = 1 - active;
        const nextIdx = (idx + 1) % safeTexts.length;
        if (slots[inc]) slots[inc].textContent = safeTexts[nextIdx];

        await settle(animate(sel[inc], { scale: 0.05, opacity: 0 }, { duration: 0 }));
        if (cancelled) return;

        const enter = animate(sel[inc], { scale: 1, opacity: 1 }, transition);
        const exit = animate(sel[active], { scale: clampedMaxScale, opacity: 0 }, transition);
        controlsRef.current = [enter, exit];

        await settle(exit);
        if (cancelled) return;

        await settle(animate(sel[active], { scale: 0.05, opacity: 0 }, { duration: 0 }));
        active = inc;
        idx = nextIdx;
      }
    };
    run();

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      controlsRef.current.forEach((c) => c && c.stop && c.stop());
    };
  }, [safeTexts, transition, clampedMaxScale, holdMs, animate]);

  const fontStyles = font;
  const safeTag = (TAGS as readonly string[]).includes(tag) ? tag : "h2";
  const Tag = safeTag as any;

  const srOnly: React.CSSProperties = {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: 0,
  };

  const slotStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "pre",
    color,
    transformOrigin: "center center",
    willChange: "transform, opacity",
    ...fontStyles,
  };

  return (
    <div
      ref={scope}
      aria-label={safeTexts.join(", ")}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        minWidth: 1,
        minHeight: 1,
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      <Tag style={srOnly}>{safeTexts.join(", ")}</Tag>

      <span
        aria-hidden="true"
        style={{
          visibility: "hidden",
          whiteSpace: "pre",
          color,
          ...fontStyles,
        }}
      >
        {longest}
      </span>

      <span ref={slot0Ref} className="slot-0" aria-hidden="true" style={slotStyle} />
      <span ref={slot1Ref} className="slot-1" aria-hidden="true" style={slotStyle} />
    </div>
  );
}
