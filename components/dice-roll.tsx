"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const PERSPECTIVE = 0.15;

// Seconds for the idle sway to give way to a throw and to come back afterwards.
const IDLE_BLEND_S = 0.6;

// Opposite faces of a real die sum to 7. BoxGeometry lists its materials as
// +x, -x, +y, -y, +z, -z, which fixes the numbering below.
const FACE_VALUES = [1, 6, 2, 5, 3, 4];
const FACE_NORMALS: Array<[number, number, number]> = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

// Pip layout on a 3x3 grid, in units of the face half-size.
const PIP_LAYOUT: Record<number, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

type Transition = {
  type?: string;
  duration?: number;
  ease?: string | number[];
};

type Config = {
  count: number;
  bodyColor: string;
  numberColor: string;
  spread: number;
  turns: number;
  hop: number;
  transition: Transition;
  shadow: boolean;
  idleSpin: number;
  sizePercent: number;
};

const DEFAULTS: Config = {
  count: 2,
  bodyColor: "#F5F2EA",
  numberColor: "#151515",
  spread: 55,
  turns: 3,
  hop: 45,
  transition: {
    type: "tween",
    duration: 1.1,
    ease: "circOut",
  },
  shadow: true,
  idleSpin: 20,
  sizePercent: 90,
};

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

/** The transition's ease is sampled by hand from a bezier lookup. */
function makeEaseFn(transition?: Transition) {
  let pts: number[] = NAMED_EASES.circOut;
  const ease = transition?.ease;
  if (Array.isArray(ease) && ease.length === 4 && ease.every(Number.isFinite))
    pts = ease as number[];
  else if (typeof ease === "string" && NAMED_EASES[ease])
    pts = NAMED_EASES[ease];

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

function clamp(v: number, lo: number, hi: number, fallback: number): number {
  const n = typeof v === "number" && isFinite(v) ? v : fallback;
  return Math.max(lo, Math.min(hi, n));
}

/**
 * One face, drawn at a fixed 256px and downscaled by the GPU — the die is small
 * on screen, so this is sharper than it is expensive, and it is done once per
 * colour change rather than per frame.
 */
function faceTexture(
  value: number,
  body: string,
  numberColor: string
): THREE.Texture {
  const S = 256;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, S, S);

  // A hairline inset keeps neighbouring faces from bleeding into one another
  // at grazing angles.
  ctx.strokeStyle = "rgba(0,0,0,0.09)";
  ctx.lineWidth = S * 0.03;
  ctx.strokeRect(S * 0.015, S * 0.015, S * 0.97, S * 0.97);

  ctx.fillStyle = numberColor;
  const r = S * 0.082;
  const step = S * 0.245;
  for (const [gx, gy] of PIP_LAYOUT[value] || []) {
    ctx.beginPath();
    ctx.arc(S / 2 + gx * step, S / 2 + gy * step, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function shadowTexture(): THREE.Texture {
  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(0,0,0,0.42)");
  g.addColorStop(0.55, "rgba(0,0,0,0.16)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type Die = {
  mesh: THREE.Mesh;
  shadow: THREE.Mesh;
  from: THREE.Quaternion;
  to: THREE.Quaternion;
  axis: THREE.Vector3;
  // Each die is offset in time a little, so a handful land in a ripple.
  delay: number;
  value: number;
};

const UP = new THREE.Vector3(0, 1, 0);

class DiceScene {
  private container: HTMLElement;
  private cfg: Config;
  private ease: (t: number) => number;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000);
  private group = new THREE.Group();

  private dice: Die[] = [];
  private geometry = new THREE.BoxGeometry(1, 1, 1);
  private shadowGeometry = new THREE.PlaneGeometry(1.9, 1.9);
  private shadowMaterial: THREE.MeshBasicMaterial;
  private textures: THREE.Texture[] = [];
  private materials: THREE.MeshLambertMaterial[] = [];
  private ambient = new THREE.AmbientLight(0xffffff, 0.72);
  private key = new THREE.DirectionalLight(0xffffff, 0.85);

  // Roll clock, in seconds since the throw started.
  private t = 0;
  private rolling = false;
  // Sway clock, accumulated for as long as the scene lives, and how much of
  // the sway is currently being applied.
  private idlePhase = 0;
  private idleBlend = 1;

  private width = 0;
  private height = 0;
  private frameId = 0;
  private lastT = 0;
  private disposed = false;

  constructor(container: HTMLElement, cfg: Config) {
    this.container = container;
    this.cfg = cfg;
    this.ease = makeEaseFn(cfg.transition);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const el = this.renderer.domElement;
    el.style.position = "absolute";
    el.style.inset = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.cursor = "pointer";
    el.style.touchAction = "none";
    container.appendChild(el);

    this.shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture(),
      transparent: true,
      depthWrite: false,
    });

    this.key.position.set(0.4, 1, 0.7);
    this.camera.add(this.key);
    this.scene.add(this.ambient, this.camera, this.group);

    this.buildMaterials();
    this.buildDice();
    this.bindEvents();
  }

  private buildMaterials() {
    for (const t of this.textures) t.dispose();
    for (const m of this.materials) m.dispose();
    this.textures = [];
    this.materials = [];
    for (let f = 0; f < 6; f++) {
      const texture = faceTexture(
        FACE_VALUES[f],
        this.cfg.bodyColor,
        this.cfg.numberColor
      );
      this.textures.push(texture);
      this.materials.push(new THREE.MeshLambertMaterial({ map: texture }));
    }
    for (const d of this.dice) d.mesh.material = this.materials;
  }

  private buildDice() {
    this.clearDice();
    const count = clamp(this.cfg.count, 1, 5, 2);
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.materials);
      // Each die owns its shadow material: opacity is written per frame
      // per die, so a shared material would leave every shadow wearing
      // the last die's value.
      const shadow = new THREE.Mesh(
        this.shadowGeometry,
        this.shadowMaterial.clone()
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -0.75;
      shadow.visible = this.cfg.shadow;
      this.group.add(mesh, shadow);
      this.dice.push({
        mesh,
        shadow,
        from: new THREE.Quaternion(),
        to: new THREE.Quaternion(),
        axis: new THREE.Vector3(0, 1, 0),
        delay: i * 0.07,
        value: 1,
      });
    }
    this.layout();
    // A first silent roll so the set is showing numbers before any input.
    this.roll(true);
  }

  private clearDice() {
    for (const d of this.dice) {
      d.mesh.removeFromParent();
      d.shadow.removeFromParent();
    }
    this.dice = [];
  }

  /** Dice sit in a row on the X axis, centred on the frame. */
  private layout() {
    const spread = clamp(this.cfg.spread, 0, 200, 55) / 100;
    const gap = 1 + spread;
    const n = this.dice.length;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * gap;
      this.dice[i].mesh.position.x = x;
      this.dice[i].shadow.position.x = x;
    }
  }

  /**
   * A throw picks a value per die, then builds the orientation that puts that
   * face up — plus a random yaw so the same number does not always land in
   * the same attitude.
   */
  roll(instant = false) {
    for (const d of this.dice) {
      const face = Math.floor(Math.random() * 6);
      d.value = FACE_VALUES[face];
      const n = FACE_NORMALS[face];
      const normal = new THREE.Vector3(n[0], n[1], n[2]);

      const align = new THREE.Quaternion().setFromUnitVectors(normal, UP);
      const yaw = new THREE.Quaternion().setFromAxisAngle(
        UP,
        Math.floor(Math.random() * 4) * (Math.PI / 2)
      );
      d.from.copy(d.mesh.quaternion);
      d.to.copy(yaw.multiply(align));
      d.axis
        .set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
        .normalize();
      if (instant) d.mesh.quaternion.copy(d.to);
    }
    this.t = 0;
    this.rolling = !instant;
  }

  private unbind = () => {};

  private bindEvents() {
    const el = this.renderer.domElement;
    const onClick = () => {
      if (!this.rolling) this.roll();
    };
    el.addEventListener("click", onClick);
    this.unbind = () => el.removeEventListener("click", onClick);
  }

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
    this.renderer.setSize(width, height, false);
    this.updateCamera();
  }

  updateConfig(cfg: Config) {
    if (this.disposed) return;
    const prev = this.cfg;
    this.cfg = cfg;
    this.ease = makeEaseFn(cfg.transition);

    if (
      cfg.bodyColor !== prev.bodyColor ||
      cfg.numberColor !== prev.numberColor
    ) {
      this.buildMaterials();
    }
    if (clamp(cfg.count, 1, 5, 2) !== clamp(prev.count, 1, 5, 2)) {
      this.buildDice();
    } else {
      this.layout();
    }
    for (const d of this.dice) d.shadow.visible = cfg.shadow;
    this.updateCamera();
  }

  private updateCamera() {
    const w = Math.max(1, this.width);
    const h = Math.max(1, this.height);
    const aspect = w / h;
    const distance = 1 / PERSPECTIVE;
    const sizePct = clamp(this.cfg.sizePercent, 20, 200, 90);
    const spread = clamp(this.cfg.spread, 0, 200, 55) / 100;
    // The row's own width sets the frame, so adding a die pulls the camera
    // back instead of pushing the outer dice off screen.
    const rowWidth = this.dice.length * (1 + spread) + 1.4;
    const span = Math.max(3, rowWidth) * (100 / sizePct);
    const visibleHeight = aspect < 1 ? span / aspect : span / 1.6;

    this.camera.aspect = aspect;
    // The camera looks slightly down, so three faces of each die read at
    // once — a straight-on view flattens them into squares.
    this.camera.position.set(0, distance * 0.32, distance);
    this.camera.lookAt(0, -0.1, 0);
    this.camera.fov =
      2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI);
    this.camera.near = Math.max(0.1, distance - 20);
    this.camera.far = distance + 20;
    this.camera.updateProjectionMatrix();
  }

  private step() {
    if (this.disposed) return;
    const now = performance.now();
    let dt = (now - this.lastT) / 1000;
    this.lastT = now;
    if (!isFinite(dt) || dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;

    const duration = Math.max(0.15, this.cfg.transition?.duration ?? 1.1);
    const turns = clamp(this.cfg.turns, 1, 8, 3);
    const hop = clamp(this.cfg.hop, 0, 100, 45) / 100;

    if (this.rolling) {
      this.t += dt;
      let done = true;
      for (const d of this.dice) {
        const local = (this.t - d.delay) / duration;
        const p = Math.max(0, Math.min(1, local));
        if (p < 1) done = false;
        const e = this.ease(p);

        // Land on the exact face: the slerp gets there, and the extra
        // turns are wound down to zero by the time it does.
        d.mesh.quaternion.slerpQuaternions(d.from, d.to, e);
        const spin = new THREE.Quaternion().setFromAxisAngle(
          d.axis,
          turns * Math.PI * 2 * (1 - e)
        );
        d.mesh.quaternion.multiply(spin);

        // One arch, highest in the middle of the throw.
        const y = Math.sin(p * Math.PI) * hop * 1.6;
        d.mesh.position.y = y;
        d.shadow.scale.setScalar(1 + y * 0.55);
        (d.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0.12,
          1 - y * 0.8
        );
      }
      if (done) this.rolling = false;
    }

    // At rest the set drifts, so the element is never fully static. The
    // phase is accumulated every frame and the amplitude faded in and out,
    // rather than the sway being switched off during a throw and read back
    // off the wall clock after it: the sine travelled the whole length of
    // the throw while it was not being read, so the set snapped to wherever
    // that had got to the instant it landed. Accumulating leaves nothing to
    // jump to, and the fade keeps the sway out of the throw itself.
    this.idlePhase += dt;
    const idleTarget = this.rolling ? 0 : 1;
    this.idleBlend +=
      (idleTarget - this.idleBlend) * Math.min(1, dt / IDLE_BLEND_S);
    const idle = clamp(this.cfg.idleSpin, 0, 40, 20) * 0.02;
    this.group.rotation.y =
      Math.sin(this.idlePhase * 0.4) * idle * this.idleBlend;

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.unbind();
    this.clearDice();
    this.geometry.dispose();
    this.shadowGeometry.dispose();
    this.shadowMaterial.map?.dispose();
    this.shadowMaterial.dispose();
    for (const t of this.textures) t.dispose();
    for (const m of this.materials) m.dispose();
    this.renderer.dispose();
    const el = this.renderer.domElement;
    if (el.parentNode === this.container) this.container.removeChild(el);
  }
}

type DiceRollProps = Partial<Config> & { style?: React.CSSProperties };

function __BaseImpl_DiceRoll(props: DiceRollProps) {
  const {
    count = DEFAULTS.count,
    bodyColor = DEFAULTS.bodyColor,
    numberColor = DEFAULTS.numberColor,
    spread = DEFAULTS.spread,
    turns = DEFAULTS.turns,
    hop = DEFAULTS.hop,
    transition = DEFAULTS.transition,
    shadow = DEFAULTS.shadow,
    idleSpin = DEFAULTS.idleSpin,
    sizePercent = DEFAULTS.sizePercent,
    style,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<DiceScene | null>(null);

  const cfgRef = useRef<Config>(null as any);
  cfgRef.current = {
    count,
    bodyColor,
    numberColor,
    spread,
    turns,
    hop,
    transition,
    shadow,
    idleSpin,
    sizePercent,
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let scene: DiceScene;
    try {
      scene = new DiceScene(container, cfgRef.current);
    } catch {
      return;
    }
    sceneRef.current = scene;
    scene.setSize(container.clientWidth, container.clientHeight);
    scene.start();

    const ro = new ResizeObserver(() => {
      scene.setSize(container.clientWidth, container.clientHeight);
    });
    ro.observe(container);
    return () => {
      ro.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.updateConfig(cfgRef.current);
  }, [
    count,
    bodyColor,
    numberColor,
    spread,
    turns,
    hop,
    transition,
    shadow,
    idleSpin,
    sizePercent,
  ]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Rolling dice"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 200,
        minHeight: 160,
        overflow: "hidden",
        ...style,
      }}
    />
  );
}

const __presetProps = {
  "count": 2,
  "bodyColor": "#FFFFFF",
  "numberColor": "#000000",
  "sizePercent": 70,
  "spread": 50,
  "turns": 2,
  "hop": 35,
  "transition": {
    "type": "tween",
    "stiffness": 800,
    "damping": 60,
    "mass": 1,
    "ease": [
      0.44,
      0,
      0.56,
      1
    ],
    "delay": 0,
    "duration": 0.6
  },
  "idleSpin": 20,
  "shadow": true
};

export default function DiceRoll(props: Record<string, unknown>) {
  return <__BaseImpl_DiceRoll {...(__presetProps as Record<string, unknown>)} {...props} />;
}
