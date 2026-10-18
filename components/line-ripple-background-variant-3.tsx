"use client";

import { useEffect, useRef } from "react";

function createNoise2D(seed = 0.5) {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const G22 = (3 - Math.sqrt(3)) / 3;
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  const seededRandom = (index: number) => {
    const x = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 255; i > 0; i--) {
    const n = Math.floor((i + 1) * seededRandom(i));
    const q = p[i];
    p[i] = p[n];
    p[n] = q;
  }

  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod12[i] = perm[i] % 12;
  }
  const grad2 = new Float64Array([
    1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 1,
    0, -1,
  ]);
  const fastFloor = (x: number) => Math.floor(x) | 0;

  return function noise2D(x: number, y: number) {
    const s = (x + y) * F2;
    const i = fastFloor(x + s);
    const j = fastFloor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    let i1: number, j1: number;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + G22;
    const y2 = y0 - 1 + G22;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = permMod12[ii + perm[jj]];
    const gi1 = permMod12[ii + i1 + perm[jj + j1]];
    const gi2 = permMod12[ii + 1 + perm[jj + 1]];
    let n0 = 0,
      n1 = 0,
      n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * (grad2[gi0 * 2] * x0 + grad2[gi0 * 2 + 1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (grad2[gi1 * 2] * x1 + grad2[gi1 * 2 + 1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (grad2[gi2 * 2] * x2 + grad2[gi2 * 2 + 1] * y2);
    }
    return 70 * (n0 + n1 + n2);
  };
}

interface Point {
  x: number;
  y: number;
  angle: number;
  cursor: { x: number; y: number; vx: number; vy: number };
}

interface InteractiveBackgroundProps {
  strokeColor?: string;
  backgroundColor?: string;
  count?: number;
  movement?: number;
  hover?: boolean;
  force?: number;
  resolution?: number;
}

const BASE_ANGLE = 0;
const CURL = 3;
const SEED = 0.5;

function __BaseImpl_InteractiveBackground({
  strokeColor = "#FFFFFF",
  backgroundColor = "#000000",
  count = 57,
  movement = 24,
  hover = true,
  force = 4,
  resolution = 10,
}: InteractiveBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mouseRef = useRef({
    x: -10,
    y: 0,
    lx: 0,
    ly: 0,
    sx: 0,
    sy: 0,
    v: 0,
    vs: 0,
    a: 0,
    set: false,
  });
  const pathRef = useRef<SVGPathElement | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const noiseRef = useRef<((x: number, y: number) => number) | null>(null);
  const rafRef = useRef<number | null>(null);
  const boundingRef = useRef<{ width: number; height: number } | null>(null);
  const timeRef = useRef(0);
  const zoomProbeRef = useRef<HTMLDivElement>(null);
  const lastSizeRef = useRef({ width: 0, height: 0, zoom: 1 });
  const isVisibleRef = useRef(true);

  const cfgRef = useRef({
    strokeColor,
    count,
    movement,
    hover,
    force,
    resolution,
  });
  cfgRef.current = {
    strokeColor,
    count,
    movement,
    hover,
    force,
    resolution,
  };

  const setSize = () => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return;
    const width = container.clientWidth || container.offsetWidth || 1;
    const height = container.clientHeight || container.offsetHeight || 1;
    boundingRef.current = { width, height };
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
  };

  const setLines = () => {
    const svg = svgRef.current;
    if (!svg || !boundingRef.current) return;
    const { width, height } = boundingRef.current;
    const { strokeColor, count } = cfgRef.current;

    const c = Math.max(1, Math.min(100, count));
    const gap = 90 - ((c - 1) / 99) * 82;
    const cols = Math.ceil((width + gap) / gap);
    const rows = Math.ceil((height + gap) / gap);
    const xStart = (width - gap * (cols - 1)) / 2;
    const yStart = (height - gap * (rows - 1)) / 2;

    const points: Point[] = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        points.push({
          x: xStart + gap * i,
          y: yStart + gap * j,
          angle: 0,
          cursor: { x: 0, y: 0, vx: 0, vy: 0 },
        });
      }
    }
    pointsRef.current = points;

    if (!pathRef.current) {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      svg.appendChild(path);
      pathRef.current = path;
    }
    const path = pathRef.current;
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", strokeColor);
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("stroke-linecap", "round");
  };

  const updateMousePosition = (x: number, y: number) => {
    const container = containerRef.current;
    if (!boundingRef.current || !container) return;
    const mouse = mouseRef.current;
    const rect = container.getBoundingClientRect();
    mouse.x = x - rect.left;
    mouse.y = y - rect.top + window.scrollY;
    if (!mouse.set) {
      mouse.sx = mouse.x;
      mouse.sy = mouse.y;
      mouse.lx = mouse.x;
      mouse.ly = mouse.y;
      mouse.set = true;
    }
    container.style.setProperty("--x", `${mouse.sx}px`);
    container.style.setProperty("--y", `${mouse.sy}px`);
  };

  const movePoints = (time: number) => {
    timeRef.current = time;
    const points = pointsRef.current;
    const mouse = mouseRef.current;
    const noiseFn = noiseRef.current;
    if (!noiseFn) return;
    const { movement, hover, force } = cfgRef.current;

    const curl = CURL;
    const base = BASE_ANGLE;
    const drift = time * movement * 8e-6;
    const dirX = Math.cos(base) * drift;
    const dirY = Math.sin(base) * drift;

    points.forEach((p) => {
      const n = noiseFn(p.x * 0.004 - dirX, p.y * 0.004 - dirY);
      const target = base + n * Math.PI * curl;

      const dx = p.x - mouse.sx;
      const dy = p.y - mouse.sy;
      const d = Math.hypot(dx, dy);
      const l = Math.max(175, mouse.vs);
      let bend = 0;
      if (hover && d < l) {
        const s = 1 - d / l;
        const influence = (force / 10) * 0.02;
        const tangent = Math.atan2(dy, dx) + Math.PI / 2;
        bend = (tangent - target) * s * (0.4 + mouse.vs * influence);

        const f = Math.cos(d * 0.001) * s;
        const push = (force / 10) * 7e-4;
        p.cursor.vx +=
          Math.cos(Math.atan2(dy, dx)) * f * l * mouse.vs * push;
        p.cursor.vy +=
          Math.sin(Math.atan2(dy, dx)) * f * l * mouse.vs * push;
      }

      let diff = target + bend - p.angle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      p.angle += diff * 0.12;

      p.cursor.vx += (0 - p.cursor.x) * 0.01;
      p.cursor.vy += (0 - p.cursor.y) * 0.01;
      p.cursor.vx *= 0.95;
      p.cursor.vy *= 0.95;
      p.cursor.x += p.cursor.vx;
      p.cursor.y += p.cursor.vy;
      p.cursor.x = Math.min(50, Math.max(-50, p.cursor.x));
      p.cursor.y = Math.min(50, Math.max(-50, p.cursor.y));
    });
  };

  const drawLines = () => {
    const points = pointsRef.current;
    const path = pathRef.current;
    if (!path) return;
    const { resolution } = cfgRef.current;
    const half = (6 + (resolution / 10) * 20) / 2;
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-width", "1.5");

    let d = "";
    for (const p of points) {
      const cx = p.x + p.cursor.x;
      const cy = p.y + p.cursor.y;
      const ux = Math.cos(p.angle) * half;
      const uy = Math.sin(p.angle) * half;
      d += `M ${(cx - ux).toFixed(1)} ${(cy - uy).toFixed(1)} L ${(
        cx + ux
      ).toFixed(1)} ${(cy + uy).toFixed(1)} `;
    }
    path.setAttribute("d", d);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svgRef.current) return;
    noiseRef.current = createNoise2D(SEED);
    setSize();
    setLines();

    const onResize = () => {
      setSize();
      setLines();
    };
    const onMouseMove = (e: MouseEvent) =>
      updateMousePosition(e.pageX, e.pageY);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) updateMousePosition(touch.clientX, touch.clientY);
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    container.addEventListener("touchmove", onTouchMove, { passive: false });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("touchmove", onTouchMove);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!containerRef.current || !zoomProbeRef.current) return;
    let rafId = 0;
    const EPSILON = 1;
    const checkSize = () => {
      const container = containerRef.current;
      const probe = zoomProbeRef.current;
      if (!container || !probe) return;
      const width = container.clientWidth || container.offsetWidth || 1;
      const height = container.clientHeight || container.offsetHeight || 1;
      const zoom = probe.getBoundingClientRect().width / 20;
      const last = lastSizeRef.current;
      const changed =
        Math.abs(width - last.width) > EPSILON ||
        Math.abs(height - last.height) > EPSILON ||
        Math.abs(zoom - last.zoom) > 0.01;
      if (changed) {
        lastSizeRef.current = { width, height, zoom };
        setSize();
        setLines();
      }
      rafId = requestAnimationFrame(checkSize);
    };
    rafId = requestAnimationFrame(checkSize);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokeColor, count, resolution]);

  useEffect(() => {
    setLines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokeColor, count]);

  useEffect(() => {
    const tick = (time: number) => {
      if (!isVisibleRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const mouse = mouseRef.current;
      mouse.sx += (mouse.x - mouse.sx) * 0.1;
      mouse.sy += (mouse.y - mouse.sy) * 0.1;
      const dx = mouse.x - mouse.lx;
      const dy = mouse.y - mouse.ly;
      const d = Math.hypot(dx, dy);
      mouse.v = d;
      mouse.vs += (d - mouse.vs) * 0.1;
      mouse.vs = Math.min(100, mouse.vs);
      mouse.lx = mouse.x;
      mouse.ly = mouse.y;
      mouse.a = Math.atan2(dy, dx);

      if (containerRef.current) {
        containerRef.current.style.setProperty("--x", `${mouse.sx}px`);
        containerRef.current.style.setProperty("--y", `${mouse.sy}px`);
      }
      movePoints(time);
      drawLines();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: backgroundColor || "transparent",
        position: "relative",
        margin: 0,
        padding: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        ["--x" as any]: "-0.5rem",
        ["--y" as any]: "50%",
      }}
    >
      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
        xmlns="http://www.w3.org/2000/svg"
      />
      <div
        ref={zoomProbeRef}
        style={{
          position: "absolute",
          width: 20,
          height: 20,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

const __presetProps = {
  "count": 92,
  "force": 10,
  "hover": true,
  "movement": 50,
  "resolution": 3,
  "strokeColor": "#FFDB94",
  "backgroundColor": "#1E0038"
};

export default function InteractiveBackground(props: Record<string, unknown>) {
  return <__BaseImpl_InteractiveBackground {...(__presetProps as Record<string, unknown>)} {...props} />;
}
