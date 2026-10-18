"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

type HeadShadow = {
  blur: number;
  color: string;
};

type LabelFont = React.CSSProperties;

type Props = {
  snap?: boolean;
  gap?: number;
  blockSize?: number;
  rounded?: number;
  headColor?: string;
  enableHeadShadow?: boolean;
  headShadow?: HeadShadow;
  trailColor?: string;
  trail?: number;
  label?: boolean;
  labelText?: string;
  labelColor?: string;
  labelFont?: LabelFont;
  style?: React.CSSProperties;
};

const DEFAULT_HEAD_SHADOW: HeadShadow = {
  blur: 30,
  color: "rgba(244,63,94,0.8)",
};

const DEFAULT_LABEL_FONT: LabelFont = {
  fontFamily: "Inter",
  fontWeight: 400,
  fontSize: "48px",
  lineHeight: "1.5em",
  letterSpacing: "0em",
  textAlign: "left",
};

const DEFAULTS = {
  snap: false,
  gap: 2,
  blockSize: 30,
  rounded: 0,
  headColor: "#CFFFE2",
  enableHeadShadow: true,
  trailColor: "#A2D5C6",
  trail: 25,
  label: true,
  labelText: "HOVER AROUND",
  labelColor: "#FFFFFF",
};

const RETRACT_HZ = 60;

type Point = { x: number; y: number };

function __BaseImpl_AdvancedCursor(props: Props) {
  const {
    snap = DEFAULTS.snap,
    gap = DEFAULTS.gap,
    blockSize = DEFAULTS.blockSize,
    rounded = DEFAULTS.rounded,
    headColor = DEFAULTS.headColor,
    enableHeadShadow = DEFAULTS.enableHeadShadow,
    trailColor = DEFAULTS.trailColor,
    trail = DEFAULTS.trail,
    label = DEFAULTS.label,
    labelText = DEFAULTS.labelText,
    labelColor = DEFAULTS.labelColor,
    style,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const headShadow = { ...DEFAULT_HEAD_SHADOW, ...props.headShadow };
  const labelFont = { ...DEFAULT_LABEL_FONT, ...props.labelFont };

  const live = useRef({
    snap,
    gap,
    blockSize,
    rounded,
    headColor,
    enableHeadShadow,
    headShadow,
    trailColor,
    trail,
  });
  live.current = {
    snap,
    gap,
    blockSize,
    rounded,
    headColor,
    enableHeadShadow,
    headShadow,
    trailColor,
    trail,
  };

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
    window.addEventListener("resize", resize);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(host);
    }

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

    const previousCursor = document.documentElement.style.cursor;
    let cursorHidden = false;
    const hideNativeCursor = (hide: boolean) => {
      if (hide === cursorHidden) return;
      cursorHidden = hide;
      document.documentElement.style.cursor = hide ? "none" : previousCursor;
    };

    let seen = false;
    let targetX = 0;
    let targetY = 0;
    let headX = 0;
    let headY = 0;
    let points: Point[] = [];
    let retractAcc = 0;
    let lastMove = 0;

    let inside = false;

    const seedAt = (x: number, y: number) => {
      seen = true;
      targetX = x;
      targetY = y;
      headX = x;
      headY = y;
      canvas.style.opacity = "1";
      points = [];
    };

    const exitTo = (x: number, y: number) => {
      if (seen && inside) {
        const p = live.current;
        const pitch = Math.max(1, p.blockSize) + Math.max(0, p.gap);
        const gapX = x - headX;
        const gapY = y - headY;
        const gapDist = Math.hypot(gapX, gapY);
        if (gapDist > pitch) {
          const steps = Math.min(Math.max(1, p.trail), Math.ceil(gapDist / pitch));
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            points.unshift({
              x: headX + gapX * t,
              y: headY + gapY * t,
            });
          }
        }
        headX = x;
        headY = y;
        targetX = x;
        targetY = y;
      }
      inside = false;
      hideNativeCursor(false);
    };

    const onMove = (e: PointerEvent) => {
      const pt = localize(e.clientX, e.clientY);
      if (!pt.over) {
        if (inside) exitTo(pt.x, pt.y);
        return;
      }
      if (!seen || !inside) seedAt(pt.x, pt.y);
      targetX = pt.x;
      targetY = pt.y;
      inside = true;
      lastMove = performance.now();
      hideNativeCursor(true);
    };
    const onWindowLeave = () => {
      if (inside) exitTo(targetX, targetY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onWindowLeave);

    const drawRoundedRect = (x: number, y: number, size: number, r: number) => {
      const rr = Math.max(0, Math.min(r, size / 2));
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + size - rr, y);
      ctx.quadraticCurveTo(x + size, y, x + size, y + rr);
      ctx.lineTo(x + size, y + size - rr);
      ctx.quadraticCurveTo(x + size, y + size, x + size - rr, y + size);
      ctx.lineTo(x + rr, y + size);
      ctx.quadraticCurveTo(x, y + size, x, y + size - rr);
      ctx.lineTo(x, y + rr);
      ctx.quadraticCurveTo(x, y, x + rr, y);
      ctx.closePath();
      ctx.fill();
    };

    let raf = 0;
    let last = performance.now();
    let running = true;

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (!seen) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const p = live.current;

      const tau = 0.01;
      const followEase = 1 - Math.exp(-dt / tau);
      const snapEase = 1 - Math.exp(-dt / (tau * 0.5));

      headX += (targetX - headX) * followEase;
      headY += (targetY - headY) * followEase;

      const size = Math.max(1, p.blockSize);
      const pitch = size + Math.max(0, p.gap);
      const snapTo = (v: number) => Math.round(v / pitch) * pitch;
      const maxPoints = Math.max(1, p.trail);

      const headPoint = points[0];
      const travelled = headPoint
        ? Math.hypot(headX - headPoint.x, headY - headPoint.y)
        : Infinity;
      if (inside && travelled >= pitch) {
        points.unshift({ x: headX, y: headY });
        retractAcc = 0;
      } else if (!inside || now - lastMove > 100) {
        retractAcc += dt * RETRACT_HZ;
        while (retractAcc >= 1 && points.length > 0) {
          retractAcc -= 1;
          points.pop();
        }
      }
      if (points.length > maxPoints) points.length = maxPoints;

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = p.trailColor;
      for (let i = points.length - 1; i >= 1; i--) {
        const pt = points[i];
        if (p.snap) {
          pt.x += (snapTo(pt.x) - pt.x) * snapEase;
          pt.y += (snapTo(pt.y) - pt.y) * snapEase;
        }
        ctx.globalAlpha = 1 - i / points.length;
        drawRoundedRect(pt.x - size / 2, pt.y - size / 2, size, p.rounded);
      }

      if (!inside) {
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(frame);
        return;
      }

      let drawX = headX;
      let drawY = headY;
      if (p.snap) {
        drawX = snapTo(headX);
        drawY = snapTo(headY);
      }
      ctx.globalAlpha = 1;
      if (p.enableHeadShadow) {
        ctx.save();
        ctx.shadowColor = p.headShadow.color;
        ctx.shadowBlur = p.headShadow.blur;
      }
      ctx.fillStyle = p.headColor;
      drawRoundedRect(drawX - size / 2, drawY - size / 2, size, p.rounded);
      if (p.enableHeadShadow) ctx.restore();
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf || !running) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running) start();
      else stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      hideNativeCursor(false);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      ro?.disconnect();
      document.documentElement.removeEventListener("pointerleave", onWindowLeave);
      document.removeEventListener("visibilitychange", onVisibility);
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
  "headColor": "#CFFFE2",
  "trailColor": "#A2D5C6",
  "blockSize": 30,
  "gap": 2,
  "rounded": 0,
  "trail": 25,
  "snap": false,
  "enableHeadShadow": true,
  "headShadow": {
    "blur": 30,
    "color": "rgba(244,63,94,0.8)"
  },
  "label": true,
  "labelText": "HOVER AROUND",
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

export default function AdvancedCursor(props: Record<string, unknown>) {
  return <__BaseImpl_AdvancedCursor {...(__presetProps as Record<string, unknown>)} {...props} />;
}
