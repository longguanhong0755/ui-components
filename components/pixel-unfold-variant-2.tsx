"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

interface PixelRevealProps {
  imageSrc?: string;
  pixelSize?: number;
  duration?: number;
  startAlign?: "top" | "center" | "bottom";
  replay?: boolean;
  style?: React.CSSProperties;
}

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

function easeToFn(ease: string) {
  const b = NAMED_EASES[ease] || NAMED_EASES.easeOut;
  return cubicBezierEase(b[0], b[1], b[2], b[3]);
}

function __BaseImpl_PixelReveal({
  imageSrc = "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6eaa9f69-8a66-4e0a-91ec-200d13a56500/w=800",
  pixelSize = 32,
  duration = 3,
  startAlign = "center",
  replay = true,
  style,
}: PixelRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const tilesRef = useRef<{ x: number; y: number; order: number }[]>([]);
  const rafRef = useRef<number | null>(null);
  const buildSigRef = useRef("");
  const genRef = useRef(0);
  const lastVersionRef = useRef(-1);
  const [version, setVersion] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const [offScreen, setOffScreen] = useState(false);

  const totalDuration = typeof duration === "number" ? duration : 1.5;
  const easeFn = useMemo(() => easeToFn("easeOut"), []);

  const hasImage = !!imageSrc;

  const build = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const img = imgElRef.current;
    if (!container || !canvas || !img) return;
    if (!img.complete || !img.naturalWidth) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw <= 0 || ch <= 0) return;

    const sig = `${cw}x${ch}|${pixelSize}|${imageSrc}`;
    if (sig === buildSigRef.current && tilesRef.current.length) return;
    buildSigRef.current = sig;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";
    const dctx = canvas.getContext("2d");
    if (!dctx) return;
    dctx.setTransform(1, 0, 0, 1, 0, 0);
    dctx.clearRect(0, 0, canvas.width, canvas.height);

    const off = offscreenRef.current || document.createElement("canvas");
    offscreenRef.current = off;
    off.width = canvas.width;
    off.height = canvas.height;
    const octx = off.getContext("2d");
    if (!octx) return;

    const nW = img.naturalWidth;
    const nH = img.naturalHeight;
    const scale = Math.max(cw / nW, ch / nH);
    const dw = nW * scale;
    const dh = nH * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, off.width, off.height);
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(img, dx * dpr, dy * dpr, dw * dpr, dh * dpr);

    const numCols = Math.ceil(cw / pixelSize);
    const rows = Math.ceil(ch / pixelSize);
    const data = octx.getImageData(0, 0, off.width, off.height).data;
    const tiles: { x: number; y: number; order: number }[] = [];
    const ALPHA_TH = 3;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < numCols; col++) {
        const x = col * pixelSize;
        const y = row * pixelSize;
        const x0 = Math.floor(x * dpr);
        const y0 = Math.floor(y * dpr);
        const x1 = Math.min(off.width, Math.ceil((x + pixelSize) * dpr));
        const y1 = Math.min(off.height, Math.ceil((y + pixelSize) * dpr));
        let hasContent = false;
        for (let py = y0; py < y1 && !hasContent; py++) {
          let idx = (py * off.width + x0) * 4 + 3;
          for (let px = x0; px < x1; px++) {
            if (data[idx] > ALPHA_TH) {
              hasContent = true;
              break;
            }
            idx += 4;
          }
        }
        if (hasContent) tiles.push({ x, y, order: 0 });
      }
    }

    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    tiles.forEach((t, i) => (t.order = i));
    tilesRef.current = tiles;
    genRef.current += 1;
    setVersion((v) => v + 1);
  }, [pixelSize, imageSrc]);

  const revealedRef = useRef(false);
  const animatingRef = useRef(false);

  const animate = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const canvas = canvasRef.current;
    const off = offscreenRef.current;
    if (!canvas || !off) return;
    const dctx = canvas.getContext("2d");
    if (!dctx) return;
    const dpr = window.devicePixelRatio || 1;
    const tiles = tilesRef.current;
    if (!tiles.length) return;
    dctx.clearRect(0, 0, canvas.width, canvas.height);
    const slot = totalDuration / tiles.length;
    const committed = new Uint8Array(tiles.length);
    const start = performance.now();
    const gen = genRef.current;
    animatingRef.current = true;
    const step = (now: number) => {
      if (gen !== genRef.current) {
        rafRef.current = null;
        return;
      }
      const elapsed = (now - start) / 1000;
      let allDone = true;
      for (let i = 0; i < tiles.length; i++) {
        if (committed[i]) continue;
        const t = tiles[i];
        const p = slot > 0 ? (elapsed - t.order * slot) / slot : 1;
        if (p <= 0) {
          allDone = false;
          continue;
        }
        const dx = Math.round(t.x * dpr);
        const dy = Math.round(t.y * dpr);
        const dw = Math.round((t.x + pixelSize) * dpr) - dx;
        const dh = Math.round((t.y + pixelSize) * dpr) - dy;
        dctx.clearRect(dx, dy, dw, dh);
        if (p >= 1) {
          dctx.globalAlpha = 1;
          dctx.drawImage(off, dx, dy, dw, dh, dx, dy, dw, dh);
          committed[i] = 1;
        } else {
          allDone = false;
          dctx.globalAlpha = easeFn(p);
          dctx.drawImage(off, dx, dy, dw, dh, dx, dy, dw, dh);
        }
      }
      dctx.globalAlpha = 1;
      if (allDone) {
        dctx.clearRect(0, 0, canvas.width, canvas.height);
        dctx.drawImage(off, 0, 0);
        animatingRef.current = false;
        rafRef.current = null;
      } else {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, [totalDuration, easeFn, pixelSize]);

  const clearDisplay = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const canvas = canvasRef.current;
    const dctx = canvas?.getContext("2d");
    if (canvas && dctx) dctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const drawFull = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const canvas = canvasRef.current;
    const off = offscreenRef.current;
    const dctx = canvas?.getContext("2d");
    if (!canvas || !off || !dctx) return;
    dctx.clearRect(0, 0, canvas.width, canvas.height);
    dctx.globalAlpha = 1;
    dctx.drawImage(off, 0, 0);
  }, []);

  useEffect(() => {
    revealedRef.current = false;
    if (!imageSrc) {
      tilesRef.current = [];
      setVersion((v) => v + 1);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgElRef.current = img;
      build();
    };
    img.onerror = () => {
      imgElRef.current = null;
      tilesRef.current = [];
      setVersion((v) => v + 1);
    };
    img.src = imageSrc;
  }, [imageSrc, build]);

  useEffect(() => {
    const container = containerRef.current;
    if (!imageSrc || !container) return;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(build, 60);
    };
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onResize);
      ro.observe(container);
    } else {
      window.addEventListener("resize", onResize);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", onResize);
    };
  }, [imageSrc, build]);

  useEffect(() => {
    let raf: number | null = null;
    const check = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      const edge =
        startAlign === "top"
          ? rect.top
          : startAlign === "center"
            ? rect.top + rect.height / 2
            : rect.bottom;
      setIsInView(edge <= vh && rect.bottom >= 0);
      setOffScreen(rect.top > vh || rect.bottom < 0);
    };
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [startAlign]);

  useEffect(() => {
    if (!tilesRef.current.length) return;
    const rebuilt = version !== lastVersionRef.current;
    lastVersionRef.current = version;
    const interrupted = rebuilt && animatingRef.current;
    if (replay && offScreen) {
      if (revealedRef.current || animatingRef.current) {
        clearDisplay();
        animatingRef.current = false;
        revealedRef.current = false;
      }
    } else if (isInView && (!revealedRef.current || interrupted)) {
      revealedRef.current = true;
      animate();
    } else if (revealedRef.current && !animatingRef.current) {
      drawFull();
    }
  }, [version, isInView, offScreen, replay, animate, clearDisplay, drawFull]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      animatingRef.current = false;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          width: "100%",
          height: "100%",
        }}
      />
      {!hasImage && (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 4,
            color: "#999",
            fontFamily: "sans-serif",
            fontSize: 14,
            textAlign: "center",
            padding: 16,
          }}
        >
          <strong>Pixel Reveal</strong>
          <span>Add an image to see the pixel reveal effect</span>
        </div>
      )}
    </div>
  );
}

const __presetProps = {
  "image": {
    "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6eaa9f69-8a66-4e0a-91ec-200d13a56500/w=800"
  },
  "replay": true,
  "duration": 0.8,
  "pixelSize": 8,
  "startAlign": "top"
};

export default function PixelReveal(props: Record<string, unknown>) {
  return <__BaseImpl_PixelReveal {...(__presetProps as Record<string, unknown>)} {...props} />;
}
