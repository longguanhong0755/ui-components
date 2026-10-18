"use client";

import { useRef, useEffect, type CSSProperties } from "react";

interface MagneticGridProps {
    background?: string;
    image?: { src: string; srcSet?: string; alt?: string } | string;
    dots?: number;
    gap?: number;
    intensity?: number;
    radius?: number;
    style?: CSSProperties;
}

type Fit = { fit: number; dx: number; dy: number };

class Cell {
    x: number;
    y: number;
    reveal = 0;
    treveal = 0;
    lastHit = 0;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    update(
        mx: number,
        my: number,
        hit: boolean,
        radius: number,
        falloff: number,
        now: number
    ) {
        if (hit) {
            this.lastHit = now;
            const dist = Math.hypot(mx - this.x, my - this.y);
            const n = Math.max(0, Math.min(1, 1 - dist / radius));
            const shaped = Math.pow(n, falloff);
            this.treveal = shaped * shaped * (3 - 2 * shaped);
        } else if (now - this.lastHit > 50) {
            this.treveal = 0;
        }
    }

    draw(
        ctx: CanvasRenderingContext2D,
        img: HTMLImageElement | null,
        dotSize: number,
        fullSize: number,
        f: Fit | null,
        color: string
    ) {
        this.reveal += (this.treveal - this.reveal) * 0.15;

        const d = dotSize + (fullSize - dotSize) * this.reveal;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        ctx.arc(0, 0, d / 2, 0, 2 * Math.PI);
        if (img && img.complete && img.naturalWidth > 0 && f) {
            ctx.clip();
            const sw = d / f.fit;
            const sx = (this.x - d / 2 - f.dx) / f.fit;
            const sy = (this.y - d / 2 - f.dy) / f.fit;
            ctx.drawImage(img, sx, sy, sw, sw, -d / 2, -d / 2, d, d);
        } else {
            ctx.fillStyle = color;
            ctx.fill();
        }
        ctx.restore();
    }
}

function imgSrc(image: MagneticGridProps["image"]): string {
    return typeof image === "string" ? image : image?.src || "";
}

const DEFAULT_IMAGE =
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6eaa9f69-8a66-4e0a-91ec-200d13a56500/w=800";

function __BaseImpl_MagneticGrid({
    background = "#000000",
    image = { src: DEFAULT_IMAGE },
    dots = 12,
    gap = 12,
    intensity = 10,
    radius = 150,
    style,
}: MagneticGridProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -99999, y: -99999, active: false });

    const src = imgSrc(image);

    useEffect(() => {
        const host = hostRef.current;
        const canvas = canvasRef.current;
        if (!host || !canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const cols = Math.max(1, Math.floor(dots));
        const R = Math.max(1, radius);
        const I = Math.max(1, Math.min(10, intensity));
        const falloff = Math.pow(2, (0.5 - ((I - 1) * 5) / 9) / 1.5);

        let img: HTMLImageElement | null = null;
        if (src) {
            img = new Image();
            img.crossOrigin = "anonymous";
            img.src = src;
        }

        let W = 1;
        let H = 1;
        let pitch = 20;
        let dotSize = 20;
        let fullSize = 20;
        let fitInfo: Fit | null = null;
        let bleed = 0;
        let cells: Cell[] = [];

        const computeFit = () => {
            if (!img || !img.complete || !img.naturalWidth) {
                fitInfo = null;
                return;
            }
            const nW = img.naturalWidth;
            const nH = img.naturalHeight;
            const fit = Math.max(W / nW, H / nH);
            fitInfo = {
                fit,
                dx: (W - nW * fit) / 2,
                dy: (H - nH * fit) / 2,
            };
        };

        const build = (mw?: number, mh?: number) => {
            const r = host.getBoundingClientRect();
            W = Math.max(1, Math.floor(mw ?? r.width));
            H = Math.max(1, Math.floor(mh ?? r.height));

            pitch = W / cols;
            dotSize = Math.max(1, pitch - Math.max(0, gap));
            fullSize = pitch * Math.SQRT2;
            const rowN = Math.max(1, Math.ceil(H / pitch));

            bleed = Math.ceil(fullSize / 2 + 4);

            const dpr = window.devicePixelRatio || 1;
            const cw = W + bleed * 2;
            const ch = H + bleed * 2;
            canvas.width = Math.floor(cw * dpr);
            canvas.height = Math.floor(ch * dpr);
            canvas.style.width = cw + "px";
            canvas.style.height = ch + "px";
            canvas.style.left = -bleed + "px";
            canvas.style.top = -bleed + "px";
            ctx.setTransform(dpr, 0, 0, dpr, bleed * dpr, bleed * dpr);

            const gridH = rowN * pitch;
            const oy = (H - gridH) / 2 + pitch / 2;

            cells = [];
            for (let c = 0; c < cols; c++) {
                for (let rIdx = 0; rIdx < rowN; rIdx++) {
                    cells.push(
                        new Cell(c * pitch + pitch / 2, oy + rIdx * pitch)
                    );
                }
            }
            computeFit();
        };

        const drawFrame = (now: number) => {
            const m = mouseRef.current;
            ctx.clearRect(-bleed, -bleed, W + bleed * 2, H + bleed * 2);
            for (const cell of cells) {
                cell.update(m.x, m.y, m.active, R, falloff, now);
                cell.draw(ctx, img, dotSize, fullSize, fitInfo, "#FFFFFF");
            }
        };

        build();

        const ro =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver((entries) => {
                      const cr = entries[0]?.contentRect;
                      build(cr?.width, cr?.height);
                  })
                : null;
        ro?.observe(host);

        if (img && !img.complete) {
            img.onload = () => {
                computeFit();
            };
        }

        const setMouse = (clientX: number, clientY: number) => {
            const r = host.getBoundingClientRect();
            mouseRef.current.x = clientX - r.left;
            mouseRef.current.y = clientY - r.top;
            mouseRef.current.active = true;
        };
        const onMove = (e: MouseEvent) => setMouse(e.clientX, e.clientY);
        const onLeave = () => {
            mouseRef.current.active = false;
            mouseRef.current.x = -99999;
            mouseRef.current.y = -99999;
        };
        const onTouch = (e: TouchEvent) => {
            const t = e.touches[0];
            if (t) setMouse(t.clientX, t.clientY);
        };

        host.addEventListener("mousemove", onMove);
        host.addEventListener("mouseleave", onLeave);
        host.addEventListener("touchmove", onTouch, { passive: true });
        host.addEventListener("touchend", onLeave);

        let raf = 0;
        const loop = (now: number) => {
            drawFrame(now);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            ro?.disconnect();
            host.removeEventListener("mousemove", onMove);
            host.removeEventListener("mouseleave", onLeave);
            host.removeEventListener("touchmove", onTouch);
            host.removeEventListener("touchend", onLeave);
        };
    }, [src, dots, gap, intensity, radius]);

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "visible",
                background,
                ...(style || {}),
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    pointerEvents: "none",
                }}
            />
        </div>
    );
}

const __presetProps = {
  "gap": 3,
  "dots": 108,
  "image": {
    "src": "https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  "radius": 249,
  "intensity": 2,
  "background": "#000000"
};

export default function MagneticGrid(props: Record<string, unknown>) {
  return <__BaseImpl_MagneticGrid {...(__presetProps as Record<string, unknown>)} {...props} />;
}
