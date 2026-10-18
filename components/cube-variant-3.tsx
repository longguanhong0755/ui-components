"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import {
  animate,
  type AnimationPlaybackControls,
  type Transition,
} from "framer-motion";

type Shell = {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  count: number;
};

function latticeCoord(i: number, n: number): number {
  return n <= 1 ? 0 : -1 + (2 * i) / (n - 1);
}

function snapCoord(c: number, n: number): number {
  if (n <= 1) return 0;
  const i = Math.round(((c + 1) / 2) * (n - 1));
  return latticeCoord(Math.max(0, Math.min(n - 1, i)), n);
}

function buildShell(cubeGrid: number, dotsPerFace: number): Shell {
  const totalPoints = Math.max(2, (cubeGrid - 1) * Math.max(1, dotsPerFace) + 1);

  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  for (let i = 0; i < totalPoints; i++) {
    for (let j = 0; j < totalPoints; j++) {
      for (let k = 0; k < totalPoints; k++) {
        const onShell =
          i === 0 ||
          i === totalPoints - 1 ||
          j === 0 ||
          j === totalPoints - 1 ||
          k === 0 ||
          k === totalPoints - 1;
        if (!onShell) continue;
        xs.push(latticeCoord(i, totalPoints));
        ys.push(latticeCoord(j, totalPoints));
        zs.push(latticeCoord(k, totalPoints));
      }
    }
  }
  return {
    x: Float32Array.from(xs),
    y: Float32Array.from(ys),
    z: Float32Array.from(zs),
    count: xs.length,
  };
}

function bandOf(c: number, cubeGrid: number): number {
  const norm = (c + 1) / 2;
  const band = Math.floor(norm * cubeGrid);
  return Math.max(0, Math.min(cubeGrid - 1, band));
}

type Vec3 = { x: number; y: number; z: number };

function rotateAxis(
  x: number,
  y: number,
  z: number,
  axis: number,
  c: number,
  s: number,
  out: Vec3
) {
  if (axis === 0) {
    out.x = x;
    out.y = y * c - z * s;
    out.z = y * s + z * c;
  } else if (axis === 1) {
    out.x = x * c + z * s;
    out.y = y;
    out.z = -x * s + z * c;
  } else {
    out.x = x * c - y * s;
    out.y = x * s + y * c;
    out.z = z;
  }
}

type Move = { axis: number; layer: number; dir: number };

type Config = {
  color: string;
  cubeGrid: number;
  dotsPerFace: number;
  dotSize: number;
  rotation: { x: number; y: number; z: number };
  transition: Transition;
  sizePercent: number;
  dragSensitivity: number;
};

const HALF_DIAG = Math.sqrt(3);

function clampSpin(v: number | undefined): number {
  if (typeof v !== "number" || !isFinite(v)) return 0;
  return Math.max(-12, Math.min(12, v));
}

class RubikCubeScene {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private width = 1;
  private height = 1;

  private cfg: Config;
  private shell: Shell;

  private px!: Float32Array;
  private py!: Float32Array;
  private pz!: Float32Array;

  private depth!: Float32Array;
  private order!: Int32Array;
  private pxp!: Float32Array;
  private pyp!: Float32Array;

  private turn: Move | null = null;
  private turnTarget = 0;
  private turnProgress = 0;
  private turnControls: AnimationPlaybackControls | null = null;
  private turnMembers: number[] = [];
  private memberFlag!: Uint8Array;
  private lastMove: Move | null = null;

  private ax = 0.5;
  private ay = 0.6;
  private az = 0;

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private frameId = 0;
  private lastT = 0;
  private disposed = false;

  private tmp: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(container: HTMLElement, cfg: Config) {
    this.container = container;
    this.cfg = cfg;

    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.inset = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.cursor = "grab";
    this.canvas.style.touchAction = "none";
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;

    this.shell = buildShell(this.clampGrid(cfg.cubeGrid), this.clampDots(cfg.dotsPerFace));
    this.adoptShell();
    this.bindEvents();
  }

  private clampGrid(n: number): number {
    return Math.max(2, Math.min(8, Math.round(n)));
  }

  private clampDots(n: number): number {
    return Math.max(1, Math.min(8, Math.round(n)));
  }

  private totalPoints(): number {
    const grid = this.clampGrid(this.cfg.cubeGrid);
    const dots = this.clampDots(this.cfg.dotsPerFace);
    return Math.max(2, (grid - 1) * dots + 1);
  }

  private adoptShell() {
    this.px = Float32Array.from(this.shell.x);
    this.py = Float32Array.from(this.shell.y);
    this.pz = Float32Array.from(this.shell.z);
    this.depth = new Float32Array(this.shell.count);
    this.order = new Int32Array(this.shell.count);
    this.pxp = new Float32Array(this.shell.count);
    this.pyp = new Float32Array(this.shell.count);
    this.memberFlag = new Uint8Array(this.shell.count);
    for (let i = 0; i < this.shell.count; i++) this.order[i] = i;
    this.turnControls?.stop();
    this.turnControls = null;
    this.turn = null;
    this.turnMembers = [];
    this.turnProgress = 0;
  }

  private bindEvents() {
    const onPointerDown = (e: PointerEvent) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.canvas.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;

      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      const sens = (this.cfg.dragSensitivity || 1) * 0.008;
      this.ay += dx * sens;
      this.ax += dy * sens;
    };

    const onPointerUp = () => {
      this.isDragging = false;
      this.canvas.style.cursor = "grab";
    };

    const onPointerLeave = () => {
      this.isDragging = false;
      this.canvas.style.cursor = "grab";
    };

    this.canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    this.canvas.addEventListener("pointerleave", onPointerLeave);

    this.disposeEvents = () => {
      this.canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      this.canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }

  private disposeEvents = () => {};

  start() {
    this.lastT = performance.now();
    const loop = () => {
      this.frameId = requestAnimationFrame(loop);
      this.step();
    };
    loop();
  }

  setSize(width: number, height: number) {
    if (this.disposed || width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(width * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(height * this.dpr));
  }

  updateConfig(cfg: Config) {
    if (this.disposed) return;
    const newGrid = this.clampGrid(cfg.cubeGrid);
    const oldGrid = this.clampGrid(this.cfg.cubeGrid);
    const newDots = this.clampDots(cfg.dotsPerFace);
    const oldDots = this.clampDots(this.cfg.dotsPerFace);

    this.cfg = cfg;
    if (newGrid !== oldGrid || newDots !== oldDots) {
      this.shell = buildShell(newGrid, newDots);
      this.adoptShell();
    }
  }

  private pickMove() {
    const grid = this.clampGrid(this.cfg.cubeGrid);
    let m: Move;
    let tries = 0;
    do {
      m = {
        axis: Math.floor(Math.random() * 3),
        layer: Math.floor(Math.random() * grid),
        dir: Math.random() < 0.5 ? 1 : -1,
      };
      tries++;
    } while (
      tries < 8 &&
      this.lastMove &&
      m.axis === this.lastMove.axis &&
      m.layer === this.lastMove.layer &&
      m.dir === -this.lastMove.dir
    );

    const axisArr = m.axis === 0 ? this.px : m.axis === 1 ? this.py : this.pz;
    const members: number[] = [];
    this.memberFlag.fill(0);
    for (let i = 0; i < this.shell.count; i++) {
      if (bandOf(axisArr[i], grid) === m.layer) {
        members.push(i);
        this.memberFlag[i] = 1;
      }
    }

    this.turn = m;
    this.turnMembers = members;
    this.turnProgress = 0;
    this.turnTarget = (m.dir * Math.PI) / 2;
    this.lastMove = m;

    this.turnControls = animate(0, 1, {
      ...(this.cfg.transition as any),
      onUpdate: (v: number) => {
        this.turnProgress = v;
      },
      onComplete: () => {
        this.commitTurn();
        this.turnControls = null;
      },
    });
  }

  private commitTurn() {
    const m = this.turn;
    if (!m) return;
    const n = this.totalPoints();
    const c = Math.cos(this.turnTarget);
    const s = Math.sin(this.turnTarget);
    const out = this.tmp;
    for (let idx = 0; idx < this.turnMembers.length; idx++) {
      const i = this.turnMembers[idx];
      rotateAxis(this.px[i], this.py[i], this.pz[i], m.axis, c, s, out);
      this.px[i] = snapCoord(out.x, n);
      this.py[i] = snapCoord(out.y, n);
      this.pz[i] = snapCoord(out.z, n);
    }
    this.memberFlag.fill(0);
    this.turn = null;
    this.turnMembers = [];
  }

  private step() {
    if (this.disposed) return;
    const now = performance.now();
    let dt = (now - this.lastT) / 1000;
    this.lastT = now;
    if (!isFinite(dt) || dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;

    if (!this.isDragging) {
      const rot = this.cfg.rotation;
      const k = 0.06;
      this.ax += clampSpin(rot?.x) * k * dt;
      this.ay += clampSpin(rot?.y) * k * dt;
      this.az += clampSpin(rot?.z) * k * dt;
    }

    if (!this.turn && !this.turnControls) {
      this.pickMove();
    }

    this.render();
  }

  private render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const sizePct = Math.max(20, Math.min(200, Math.round(this.cfg.sizePercent)));
    const scale = Math.min(w, h) * 0.26 * (sizePct / 100);

    const cax = Math.cos(this.ax);
    const sax = Math.sin(this.ax);
    const cay = Math.cos(this.ay);
    const say = Math.sin(this.ay);
    const caz = Math.cos(this.az);
    const saz = Math.sin(this.az);

    const turn = this.turn;
    const angle = this.turnTarget * this.turnProgress;
    const cs = turn ? Math.cos(angle) : 1;
    const sn = turn ? Math.sin(angle) : 0;
    const turnAxis = turn ? turn.axis : 0;
    const memberFlag = this.memberFlag;

    const count = this.shell.count;
    const tmp = this.tmp;

    for (let i = 0; i < count; i++) {
      let x = this.px[i];
      let y = this.py[i];
      let z = this.pz[i];

      if (turn && memberFlag[i]) {
        rotateAxis(x, y, z, turnAxis, cs, sn, tmp);
        x = tmp.x;
        y = tmp.y;
        z = tmp.z;
      }

      const y1 = y * cax - z * sax;
      const z1 = y * sax + z * cax;
      const x2 = x * cay + z1 * say;
      const z2 = -x * say + z1 * cay;
      const x3 = x2 * caz - y1 * saz;
      const y3 = x2 * saz + y1 * caz;

      this.depth[i] = z2;
      const persp = 1 + z2 * 0.16;
      this.pxp[i] = cx + x3 * scale * persp;
      this.pyp[i] = cy - y3 * scale * persp;
    }

    const order = this.order;
    order.sort((a, b) => this.depth[a] - this.depth[b]);

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = this.cfg.color || "#ffffff";
    const dot = Math.max(1, Math.min(6, Math.round(this.cfg.dotSize)));

    for (let o = 0; o < count; o++) {
      const i = order[o];
      const t = (this.depth[i] + HALF_DIAG) / (2 * HALF_DIAG);
      const tc = t < 0 ? 0 : t > 1 ? 1 : t;
      ctx.globalAlpha = 0.22 + 0.78 * tc;
      const r = Math.max(0.4, dot * (0.5 + 0.7 * tc));
      ctx.beginPath();
      ctx.arc(this.pxp[i], this.pyp[i], r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.turnControls?.stop();
    this.turnControls = null;
    this.disposeEvents();
    if (this.canvas.parentNode === this.container) {
      this.container.removeChild(this.canvas);
    }
  }
}

type RubikParticlesProps = {
  color?: string;
  cubeGrid?: number;
  dotsPerFace?: number;
  dotSize?: number;
  rotation?: { x: number; y: number; z: number };
  transition?: Transition;
  sizePercent?: number;
  dragSensitivity?: number;
  style?: React.CSSProperties;
};

function __BaseImpl_RubikParticles({
  color = "#ffffff",
  cubeGrid = 3,
  dotsPerFace = 4,
  dotSize = 2,
  rotation = { x: 2, y: 5, z: 0 },
  transition = { type: "spring", stiffness: 200, damping: 20, mass: 1 },
  sizePercent = 100,
  dragSensitivity = 1,
  style,
}: RubikParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RubikCubeScene | null>(null);

  const cfg: Config = {
    color,
    cubeGrid,
    dotsPerFace,
    dotSize,
    rotation,
    transition,
    sizePercent,
    dragSensitivity,
  };
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let scene: RubikCubeScene | null = null;

    const resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width <= 0 || rect.height <= 0) return;

      if (!scene && !cancelled) {
        scene = new RubikCubeScene(container, cfgRef.current);
        sceneRef.current = scene;
        scene.setSize(rect.width, rect.height);
        scene.start();
      } else if (scene) {
        scene.setSize(rect.width, rect.height);
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.updateConfig(cfgRef.current);
  }, [
    color,
    cubeGrid,
    dotsPerFace,
    dotSize,
    rotation?.x,
    rotation?.y,
    rotation?.z,
    transition,
    sizePercent,
    dragSensitivity,
  ]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Particle Rubik's cube"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 200,
        minHeight: 200,
        overflow: "hidden",
        ...style,
      }}
    />
  );
}

const __presetProps = {
  "fill": "dots",
  "color": "#0092FF",
  "dotSize": 4,
  "cubeGrid": 4,
  "rotation": {
    "x": 12,
    "y": 12,
    "z": 12
  },
  "transition": {
    "mass": 1,
    "type": "spring",
    "damping": 20,
    "stiffness": 200
  },
  "dotsPerFace": 2,
  "sizePercent": 35,
  "solidColors": [
    "#B71234",
    "#FF5800",
    "#FFFFFF",
    "#FFD500",
    "#009B48",
    "#0046AD"
  ],
  "solidColorMode": "default",
  "dragSensitivity": 3
};

export default function RubikParticles(props: Record<string, unknown>) {
  return <__BaseImpl_RubikParticles {...(__presetProps as Record<string, unknown>)} {...props} />;
}
