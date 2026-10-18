"use client";

import { useEffect, useRef } from "react";

const MAX_PARTICLES = 1400;

const STIFFNESS = 120;
const DAMPING = 18;
const SEPARATION = 0.35;
const COLLISION_BOUNCE = 2.5;
const MAX_SPEED = 2600;
const STRIDE = 8192;
const BIAS = 1024;
const RADIUS_SCALE = 0.42;
const FLY_PHASE_SHARE = 0.75;
const STAGGER_SHARE = 0.5;
const POP_START_SHARE = 0.75;
const POP_SPACING = 1.1;

interface EmojiParticleFont {
  fontFamily?: string;
  variant?: string;
  fontWeight?: number;
  fontSize?: number;
  lineHeight?: string;
  letterSpacing?: number;
  textAlign?: string;
  fontStyle?: string;
}

interface EmojiParticleTransition {
  type?: "tween" | "spring";
  stiffness?: number;
  damping?: number;
  mass?: number;
  duration?: number;
  ease?: "easeOut" | "easeInOut" | "easeIn" | "circOut" | "linear";
}

interface EmojiParticleRepelOptions {
  strength?: number;
  size?: number;
}

interface Particle {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  emoji: string;
  size: number;
  radius: number;
  mode: "fly" | "pop";
  delayMs: number;
  live: boolean;
}

export interface EmojiParticleProps {
  text?: string;
  font?: EmojiParticleFont;
  emojis?: string[];
  minSize?: number;
  maxSize?: number;
  density?: number;
  popShare?: number;
  transition?: EmojiParticleTransition;
  repel?: boolean;
  repelOptions?: EmojiParticleRepelOptions;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
}

const DEFAULTS = {
  text: "HELLO",
  font: {
    fontFamily: "Inter",
    variant: "Regular",
    fontWeight: 800,
    fontSize: 220,
    lineHeight: "1.5em",
    letterSpacing: 0,
    textAlign: "left",
  } as EmojiParticleFont,
  emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🩷", "🖤"],
  minSize: 16,
  maxSize: 30,
  density: 20,
  popShare: 40,
  transition: {
    type: "tween",
    stiffness: 800,
    damping: 60,
    mass: 1,
    duration: 1,
    ease: "easeOut",
  } as EmojiParticleTransition,
  repel: true,
  repelOptions: { strength: 60, size: 90 } as EmojiParticleRepelOptions,
};

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function num(v: unknown, fallback: number): number {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : parseFloat(v as string);
  return Number.isFinite(n) ? n : fallback;
}

const EASE: Record<string, (t: number) => number> = {
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
  easeIn: (t) => t * t,
  circOut: (t) => Math.sqrt(1 - (t - 1) * (t - 1)),
  linear: (t) => t,
};

function getTransitionParams(tr?: EmojiParticleTransition) {
  if (!tr) return { easeFn: EASE.easeOut, durMs: 800 };
  if (tr.type === "spring") {
    const k = tr.stiffness ?? 100;
    const d = tr.damping ?? 15;
    const m = tr.mass ?? 1;
    const durMs = Math.min(
      3000,
      Math.max(300, (d / (2 * Math.sqrt(k * m))) * 2000)
    );
    return { easeFn: EASE.easeOut, durMs };
  }
  return {
    easeFn: EASE[tr.ease || "easeOut"] || EASE.easeOut,
    durMs: (tr.duration ?? 0.8) * 1000,
  };
}

function spawnFor(
  homeX: number,
  homeY: number,
  size: number,
  W: number,
  H: number
): [number, number] {
  const angle = Math.random() * Math.PI * 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const tx =
    dx > 0
      ? (W - homeX) / dx
      : dx < 0
        ? -homeX / dx
        : Number.POSITIVE_INFINITY;
  const ty =
    dy > 0
      ? (H - homeY) / dy
      : dy < 0
        ? -homeY / dy
        : Number.POSITIVE_INFINITY;
  const exit = Math.min(tx, ty);
  const out = exit + size * 1.5 + Math.random() * Math.max(W, H) * 0.25;
  return [homeX + dx * out, homeY + dy * out];
}

function mkParticle(
  homeX: number,
  homeY: number,
  emoji: string,
  size: number,
  mode: "fly" | "pop",
  startX: number,
  startY: number,
  delayMs: number
): Particle {
  const flying = mode === "fly";
  const x = flying ? startX : homeX;
  const y = flying ? startY : homeY;
  return {
    homeX,
    homeY,
    x,
    y,
    startX: x,
    startY: y,
    vx: 0,
    vy: 0,
    emoji,
    size,
    radius: size * RADIUS_SCALE,
    mode,
    delayMs,
    live: false,
  };
}

export default function EmojiParticle({
  text = DEFAULTS.text,
  font,
  emojis = DEFAULTS.emojis,
  minSize = DEFAULTS.minSize,
  maxSize = DEFAULTS.maxSize,
  density = DEFAULTS.density,
  popShare = DEFAULTS.popShare,
  transition = DEFAULTS.transition,
  repel = DEFAULTS.repel,
  repelOptions = DEFAULTS.repelOptions,
  width = 600,
  height = 600,
  style,
}: EmojiParticleProps) {
  const list = (emojis || []).filter((e) => e && String(e).trim());
  const {
    fontFamily = "sans-serif",
    fontWeight = 700,
    fontSize = 200,
    letterSpacing = 0,
    fontStyle = "normal",
  } = font || {};

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<{
    particles: Particle[];
    cell: number;
    grid: Map<number, number> | null;
    next: Int32Array | null;
  }>({ particles: [], cell: 16, grid: null, next: null });
  const dimsRef = useRef({ W: 0, H: 0 });

  const startedAtRef = useRef<number | null>(null);
  const animRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const pointerRef = useRef({ x: -9999, y: -9999, inside: false });

  const physicsRef = useRef<{
    transition?: EmojiParticleTransition;
    repel?: boolean;
    repelOptions?: EmojiParticleRepelOptions;
  }>({});
  physicsRef.current = { transition, repel, repelOptions };

  const samplingRef = useRef<any>({});
  samplingRef.current = {
    text,
    fontFamily,
    fontWeight,
    fontSize,
    letterSpacing,
    fontStyle,
    list,
    density,
    minSize,
    maxSize,
    popShare,
    transition,
  };

  const initParticles = () => {
    const s = samplingRef.current;
    const { W, H } = dimsRef.current;
    if (!W || !H) return;
    const txt = (s.text ?? "").toString();
    const glyphs = s.list && s.list.length ? s.list : DEFAULTS.emojis;

    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const oc = off.getContext("2d", { willReadFrequently: true });
    if (!oc) return;
    let size = Math.max(4, num(s.fontSize, 200));
    const weight = s.fontWeight || 700;
    const fam = s.fontFamily || "sans-serif";
    const fStyle = s.fontStyle || "normal";
    const ls = num(s.letterSpacing, 0);
    const setFont = (px: number) => {
      oc.font = `${fStyle} ${weight} ${px}px ${fam}`;
      try {
        (oc as any).letterSpacing = `${ls}px`;
      } catch (_) {}
    };
    oc.textAlign = "center";
    oc.textBaseline = "middle";
    setFont(size);
    if (txt) {
      const w = oc.measureText(txt).width;
      const maxW = W * 0.9;
      if (w > maxW) {
        size = Math.max(4, Math.floor(size * (maxW / w)));
        setFont(size);
      }
      if (size > H * 0.8) {
        size = Math.floor(H * 0.8);
        setFont(size);
      }
    }
    oc.clearRect(0, 0, W, H);
    oc.fillStyle = "#fff";
    if (txt) oc.fillText(txt, W / 2, H / 2);

    let px: Uint8ClampedArray;
    try {
      px = oc.getImageData(0, 0, W, H).data;
    } catch (_) {
      return;
    }

    const dens = Math.max(1, Math.min(50, s.density || 20));
    const gap = Math.max(6, Math.round(320 / dens));
    const sample = (step: number): [number, number][] => {
      const out: [number, number][] = [];
      for (let y = 0; y < H; y += step)
        for (let x = 0; x < W; x += step) {
          const iy = y | 0;
          const ix = x | 0;
          const i = (iy * W + ix) * 4;
          if (px[i + 3] >= 40) out.push([ix, iy]);
        }
      return out;
    };

    const pop = Math.min(100, Math.max(0, s.popShare)) / 100;

    let flyPts: [number, number][] = [];
    let popPts: [number, number][] = [];
    if (pop >= 1) {
      popPts = sample(gap * POP_SPACING);
    } else if (pop <= 0) {
      flyPts = sample(gap);
    } else {
      flyPts = sample(gap / Math.sqrt(1 - pop));
      const all = sample(gap * POP_SPACING);
      shuffle(all);
      popPts = all.slice(0, Math.round(all.length * pop));
    }
    shuffle(flyPts);
    shuffle(popPts);
    const total = flyPts.length + popPts.length;
    if (total > MAX_PARTICLES) {
      const keep = MAX_PARTICLES / total;
      flyPts.length = Math.floor(flyPts.length * keep);
      popPts.length = Math.floor(popPts.length * keep);
    }

    const lo = Math.max(4, Math.min(s.minSize, s.maxSize));
    const hi = Math.max(4, Math.max(s.minSize, s.maxSize));
    const { durMs } = getTransitionParams(s.transition);

    const flyPhase = durMs * FLY_PHASE_SHARE;
    const flyStagger = flyPhase * STAGGER_SHARE;
    const popStart = flyPts.length ? flyPhase * POP_START_SHARE : 0;
    const popWindow = durMs - popStart;

    const mk = (pt: [number, number], mode: "fly" | "pop"): Particle => {
      const [hx, hy] = pt;
      const emoji = glyphs[Math.floor(Math.random() * glyphs.length)];
      const size = Math.round(lo + Math.random() * (hi - lo));
      const [sx, sy] = spawnFor(hx, hy, size, W, H);
      const delayMs =
        mode === "fly"
          ? Math.random() * flyStagger
          : popStart + Math.random() * popWindow;
      return mkParticle(hx, hy, emoji, size, mode, sx, sy, delayMs);
    };
    const particles = [
      ...flyPts.map((pt) => mk(pt, "fly")),
      ...popPts.map((pt) => mk(pt, "pop")),
    ];
    particles.sort((a, b) => a.size - b.size);

    let maxRadius = 8;
    for (const p of particles) if (p.radius > maxRadius) maxRadius = p.radius;
    sceneRef.current = {
      particles,
      cell: Math.max(8, maxRadius * 2),
      grid: new Map(),
      next: new Int32Array(particles.length),
    };
    if (startedAtRef.current != null) startedAtRef.current = performance.now();
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      const W = Math.round(r.width);
      const H = Math.round(r.height);
      if (!W || !H) return;
      if (W === dimsRef.current.W && H === dimsRef.current.H) return;
      dimsRef.current = { W, H };
      initParticles();
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    initParticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    text,
    fontFamily,
    fontWeight,
    fontSize,
    letterSpacing,
    fontStyle,
    JSON.stringify(list),
    density,
    minSize,
    maxSize,
    popShare,
    JSON.stringify(transition),
  ]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (ents) => {
        if (ents[0]?.isIntersecting) {
          if (startedAtRef.current == null)
            startedAtRef.current = performance.now();
        } else {
          startedAtRef.current = null;
          for (const p of sceneRef.current.particles) {
            p.x = p.startX;
            p.y = p.startY;
            p.vx = 0;
            p.vy = 0;
            p.live = false;
          }
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const draw = (now: number) => {
      animRef.current = requestAnimationFrame(draw);
      const { W, H } = dimsRef.current;
      if (!W || !H) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const needW = Math.round(W * dpr);
      const needH = Math.round(H * dpr);
      if (canvas.width !== needW || canvas.height !== needH) {
        canvas.width = needW;
        canvas.height = needH;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const scene = sceneRef.current;
      const particles = scene.particles;
      const n = particles.length;
      if (!n) return;

      const last = lastFrameRef.current;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      lastFrameRef.current = now;

      const {
        transition: tr,
        repel: rep,
        repelOptions: repOpts,
      } = physicsRef.current;
      const { easeFn, durMs } = getTransitionParams(tr);
      const flightMs = durMs * FLY_PHASE_SHARE * (1 - STAGGER_SHARE);
      const startedAt = startedAtRef.current;
      const elapsed = startedAt == null ? -1 : now - startedAt;

      const repelSize = rep ? (repOpts?.size ?? 0) : 0;
      const repelAmp = rep
        ? repelSize * ((repOpts?.strength ?? 0) / 100) * 1.5
        : 0;
      const repelling =
        repelAmp > 0 && repelSize > 0 && pointerRef.current.inside;
      const pointer = pointerRef.current;

      for (let i = 0; i < n; i++) {
        const p = particles[i];
        if (elapsed < 0) {
          p.live = false;
          continue;
        }
        const own = elapsed - p.delayMs;
        if (own < 0) {
          p.live = p.mode === "fly";
          continue;
        }
        p.live = true;

        let tx: number;
        let ty: number;
        if (p.mode === "fly") {
          const t = easeFn(own < flightMs ? own / flightMs : 1);
          tx = p.startX + (p.homeX - p.startX) * t;
          ty = p.startY + (p.homeY - p.startY) * t;
        } else {
          tx = p.homeX;
          ty = p.homeY;
        }

        if (repelling) {
          const dx = tx - pointer.x;
          const dy = ty - pointer.y;
          const sq = dx * dx + dy * dy;
          if (sq < repelSize * repelSize) {
            const d = Math.sqrt(sq);
            const s = 1 - d / repelSize;
            const f = s * s * (3 - 2 * s) * repelAmp;
            if (d > 0.001) {
              tx += (dx / d) * f;
              ty += (dy / d) * f;
            } else {
              const a = p.homeX * 12.9898 + p.homeY * 78.233;
              tx += Math.cos(a) * f;
              ty += Math.sin(a) * f;
            }
          }
        }

        p.vx += ((tx - p.x) * STIFFNESS - p.vx * DAMPING) * dt;
        p.vy += ((ty - p.y) * STIFFNESS - p.vy * DAMPING) * dt;
      }

      const cell = scene.cell;
      const grid = scene.grid!;
      const next = scene.next!;
      grid.clear();
      const margin = cell * 2;
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        if (
          !p.live ||
          p.x < -margin ||
          p.y < -margin ||
          p.x > W + margin ||
          p.y > H + margin
        ) {
          next[i] = -1;
          continue;
        }
        const key =
          (((p.x / cell) | 0) + BIAS) * STRIDE + (((p.y / cell) | 0) + BIAS);
        const head = grid.get(key);
        next[i] = head === undefined ? -1 : head;
        grid.set(key, i);
      }

      for (let i = 0; i < n; i++) {
        const a = particles[i];
        if (!a.live) continue;
        const cx = ((a.x / cell) | 0) + BIAS;
        const cy = ((a.y / cell) | 0) + BIAS;
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            let j = grid.get((cx + ox) * STRIDE + (cy + oy));
            while (j !== undefined && j !== -1) {
              if (j <= i) {
                j = next[j];
                continue;
              }
              const b = particles[j];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const min = a.radius + b.radius;
              const sq = dx * dx + dy * dy;
              if (sq < min * min && sq > 0) {
                const d = Math.sqrt(sq);
                const nx = dx / d;
                const ny = dy / d;
                const overlap = (min - d) * SEPARATION;
                a.x -= nx * overlap;
                a.y -= ny * overlap;
                b.x += nx * overlap;
                b.y += ny * overlap;
                a.vx -= nx * overlap * COLLISION_BOUNCE;
                a.vy -= ny * overlap * COLLISION_BOUNCE;
                b.vx += nx * overlap * COLLISION_BOUNCE;
                b.vy += ny * overlap * COLLISION_BOUNCE;
              }
              j = next[j];
            }
          }
        }
      }

      let lastPx = -1;
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        if (!p.live) continue;
        const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (sp > MAX_SPEED) {
          p.vx = (p.vx / sp) * MAX_SPEED;
          p.vy = (p.vy / sp) * MAX_SPEED;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.size !== lastPx) {
          ctx.font = `${p.size}px sans-serif`;
          lastPx = p.size;
        }
        ctx.fillText(p.emoji, p.x, p.y);
      }
    };

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      lastFrameRef.current = 0;
    };
  }, []);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const sx = rect.width > 0 ? el.clientWidth / rect.width : 1;
    const sy = rect.height > 0 ? el.clientHeight / rect.height : 1;
    pointerRef.current = {
      x: (event.clientX - rect.left) * sx,
      y: (event.clientY - rect.top) * sy,
      inside: true,
    };
  };
  const onPointerLeave = () => {
    pointerRef.current = { x: -9999, y: -9999, inside: false };
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
