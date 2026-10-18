"use client";

import { useRef, useEffect, type CSSProperties } from "react";

type Fit = "cover" | "contain";

interface RimOptions {
    color: string;
    width: number;
}

interface MagnifyingCursorProps {
    image?: { src: string; alt?: string } | string;
    fit?: Fit;
    focusY?: number;
    zoom?: number;
    lensSize?: number;
    rim?: boolean;
    rimOptions?: RimOptions;
    style?: CSSProperties;
}

const DEFAULT_IMAGE =
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/b14ae2a2-1116-4a7f-0a18-1d74c4a46f00/w=800";

const DEFAULTS = {
    image: { src: DEFAULT_IMAGE } as { src: string; alt?: string },
    fit: "cover" as Fit,
    focusY: 0,
    zoom: 6,
    lensSize: 80,
    rim: false,
    rimOptions: { color: "#0A0A0C", width: 6 } as RimOptions,
};

const clampFocus = (value: number) =>
    Math.min(100, Math.max(0, typeof value === "number" ? value : 50));

function resolveImageSrc(image: unknown): string | undefined {
    if (!image) return undefined;
    if (typeof image === "string") return image.trim() || undefined;
    return (image as { src?: string }).src || undefined;
}

function __BaseImpl_MagnifyingCursor({
    image = DEFAULTS.image,
    fit = DEFAULTS.fit,
    focusY = DEFAULTS.focusY,
    zoom = DEFAULTS.zoom,
    lensSize = DEFAULTS.lensSize,
    rim = DEFAULTS.rim,
    rimOptions = DEFAULTS.rimOptions,
    style,
}: MagnifyingCursorProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const lens = useRef({ x: 0, y: 0 });

    const src = resolveImageSrc(image) || DEFAULT_IMAGE;
    const rimColor = rimOptions?.color ?? DEFAULTS.rimOptions.color;
    const rimWidth = rim ? (rimOptions?.width ?? 0) : 0;

    useEffect(() => {
        const canvasEl = canvasRef.current;
        if (!canvasEl) return;
        const context = canvasEl.getContext("2d");
        if (!context) return;
        const canvas: HTMLCanvasElement = canvasEl;
        const ctx: CanvasRenderingContext2D = context;

        let alive = true;
        let raf = 0;
        let dpr = 1;
        let cssW = canvas.clientWidth || 600;
        let cssH = canvas.clientHeight || 600;
        let placed = { dx: 0, dy: 0, dw: 0, dh: 0 };
        let img: HTMLImageElement | null = null;
        let hovering = false;

        function layout() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            cssW = canvas.clientWidth || cssW;
            cssH = canvas.clientHeight || cssH;
            canvas.width = Math.round(cssW * dpr);
            canvas.height = Math.round(cssH * dpr);

            const cw = canvas.width;
            const ch = canvas.height;
            if (!img) {
                placed = { dx: 0, dy: 0, dw: cw, dh: ch };
                return;
            }
            const iw = img.naturalWidth || img.width;
            const ih = img.naturalHeight || img.height;
            const scale =
                fit === "contain"
                    ? Math.min(cw / iw, ch / ih)
                    : Math.max(cw / iw, ch / ih);
            const dw = iw * scale;
            const dh = ih * scale;
            const dx = (cw - dw) / 2;
            const f = fit === "cover" ? clampFocus(focusY) / 100 : 0.5;
            placed = { dx, dy: (ch - dh) * f, dw, dh };
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!img) return;
            ctx.drawImage(img, placed.dx, placed.dy, placed.dw, placed.dh);
            if (!hovering) return;

            const lx = lens.current.x * dpr;
            const ly = lens.current.y * dpr;
            const r = lensSize * dpr;
            const z = Math.max(1, zoom);

            ctx.save();
            ctx.beginPath();
            ctx.arc(lx, ly, r, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(
                img,
                lx - (lx - placed.dx) * z,
                ly - (ly - placed.dy) * z,
                placed.dw * z,
                placed.dh * z
            );
            ctx.restore();

            if (!rim || rimWidth <= 0) return;
            const stroke = rimWidth * dpr;
            ctx.beginPath();
            ctx.arc(lx, ly, r, 0, Math.PI * 2);
            ctx.lineWidth = stroke;
            ctx.strokeStyle = rimColor;
            ctx.stroke();
        }

        function loop() {
            if (!alive) return;
            draw();
            raf = requestAnimationFrame(loop);
        }

        function onImage(x: number, y: number) {
            if (!img) return false;
            return (
                x >= placed.dx / dpr &&
                x <= (placed.dx + placed.dw) / dpr &&
                y >= placed.dy / dpr &&
                y <= (placed.dy + placed.dh) / dpr
            );
        }

        function onMove(event: PointerEvent) {
            const rect = canvas.getBoundingClientRect();
            const sx = rect.width > 0 ? cssW / rect.width : 1;
            const sy = rect.height > 0 ? cssH / rect.height : 1;
            const x = (event.clientX - rect.left) * sx;
            const y = (event.clientY - rect.top) * sy;
            lens.current.x = x;
            lens.current.y = y;
            hovering = onImage(x, y);
            canvas.style.cursor = hovering ? "none" : "default";
        }
        function onLeave() {
            hovering = false;
            canvas.style.cursor = "default";
        }

        const loading = new Image();
        loading.crossOrigin = "anonymous";
        loading.onload = () => {
            if (!alive) return;
            img = loading;
            layout();
        };
        if (src) loading.src = src;

        const ro = new ResizeObserver(() => {
            layout();
        });
        ro.observe(canvas);

        layout();

        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerleave", onLeave);
        raf = requestAnimationFrame(loop);

        return () => {
            alive = false;
            cancelAnimationFrame(raf);
            ro.disconnect();
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerleave", onLeave);
        };
    }, [src, fit, focusY, zoom, lensSize, rim, rimColor, rimWidth]);

    return (
        <canvas
            ref={canvasRef}
            aria-label={
                typeof image === "object" ? (image?.alt ?? "Image") : "Image"
            }
            style={{
                ...style,
                display: "block",
                width: "100%",
                height: "100%",
                cursor: "default",
            }}
        />
    );
}

const __presetProps = {
  "image": {
    "src": "https://images.unsplash.com/photo-1725957776398-f3d41086c636?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  "fit": "contain",
  "focusY": 15,
  "zoom": 3,
  "lensSize": 98,
  "rim": true,
  "rimOptions": {
    "color": "#04040421",
    "width": 6
  }
};

export default function MagnifyingCursor(props: Record<string, unknown>) {
  return <__BaseImpl_MagnifyingCursor {...(__presetProps as Record<string, unknown>)} {...props} />;
}
