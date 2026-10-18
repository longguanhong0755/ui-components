"use client";

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";

function clamp(n: any, min: number, max: number, fallback: number) {
  const v = typeof n === "number" ? n : parseFloat(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function parseColor01(input: any, fallback: [number, number, number]) {
  if (!input) return fallback;
  const s = String(input).trim();
  const hex = s.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hex) {
    const h = hex[1];
    const f =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    return [
      parseInt(f.slice(0, 2), 16) / 255,
      parseInt(f.slice(2, 4), 16) / 255,
      parseInt(f.slice(4, 6), 16) / 255,
    ] as [number, number, number];
  }
  const rgb = s.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(",").map((p) => p.trim());
    if (parts.length >= 3) {
      const to01 = (v: string) =>
        v.endsWith("%")
          ? Math.min(1, Math.max(0, parseFloat(v) / 100))
          : Math.min(1, Math.max(0, parseFloat(v) / 255));
      const out = [to01(parts[0]), to01(parts[1]), to01(parts[2])];
      if (out.every(Number.isFinite)) return out as [number, number, number];
    }
  }
  return fallback;
}

function insetRadius(radius: any, by: number): string {
  const s = String(radius ?? "0px").trim();
  if (!s) return "0px";
  return s
    .split(/\s+/)
    .map((corner) => `max(0px, calc(${corner} - ${by}px))`)
    .join(" ");
}

function shadowCss(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((s) =>
      [
        s.inset ? "inset" : "",
        `${s.x ?? 0}px`,
        `${s.y ?? 0}px`,
        `${s.blur ?? 0}px`,
        `${s.spread ?? 0}px`,
        s.color ?? "rgba(0,0,0,0.3)",
      ]
        .filter(Boolean)
        .join(" ")
    )
    .join(", ");
}

const RENDER_SCALE = 2;
const DPR_LIMIT = 3;

const SHADOW = [
  {
    blur: 47,
    color: "rgba(0, 0, 0, 0.35)",
    diffusion: 0.5,
    focus: 0.5,
    inset: false,
    spread: -15,
    type: "box",
    x: 0,
    y: 55,
  },
] as const;

const SHADOW_CSS = shadowCss(SHADOW);

interface BorderProps {
  borderWidth?: number;
  borderStyle?: string;
  borderColor?: string;
  borderTopWidth?: number;
  borderLeftWidth?: number;
  borderRightWidth?: number;
  borderBottomWidth?: number;
}

interface TiltOptions {
  glow: string;
  amount: number;
  hoverScale: number;
}

export interface ShineCardProps {
  style?: CSSProperties;
  cardWidth?: number;
  cardHeight?: number;
  cardColor?: string;
  radius?: string;
  border?: BorderProps;
  density?: number;
  waveSpeed?: number;
  sparkle?: number;
  unlit?: string;
  highlight?: string;
  tilt?: boolean;
  tiltOptions?: Partial<TiltOptions>;
}

const DEFAULTS = {
  cardWidth: 600,
  cardHeight: 400,
  cardColor: "#FFA000",
  radius: "32px",
  border: {
    borderColor: "#FF8B00",
    borderStyle: "solid",
    borderWidth: 1,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  } as BorderProps,
  density: 100,
  waveSpeed: 44,
  sparkle: 100,
  unlit: "#000000",
  highlight: "#FFE100",
  tilt: true,
  tiltOptions: {
    amount: 18,
    hoverScale: 105,
    glow: "#FFC800",
  } as TiltOptions,
};

function settings(p: ShineCardProps) {
  const ti = { ...DEFAULTS.tiltOptions, ...(p?.tiltOptions || {}) };
  return {
    cardWidth: clamp(p?.cardWidth, 40, 800, DEFAULTS.cardWidth),
    cardHeight: clamp(p?.cardHeight, 40, 800, DEFAULTS.cardHeight),
    cardColor: p?.cardColor ?? DEFAULTS.cardColor,
    radius: p?.radius ?? DEFAULTS.radius,
    border: p?.border ?? DEFAULTS.border,
    shadow: SHADOW_CSS,
    waveSpeed: (clamp(p?.waveSpeed, 0, 100, DEFAULTS.waveSpeed) / 100) * 1.5,
    sparkle: (clamp(p?.sparkle, 0, 100, DEFAULTS.sparkle) / 100) * 8,
    density: clamp(p?.density, 6, 80, DEFAULTS.density),
    unlit: p?.unlit ?? DEFAULTS.unlit,
    highlight: p?.highlight ?? DEFAULTS.highlight,
    tilt: p?.tilt ?? DEFAULTS.tilt,
    tiltAmount: clamp(ti.amount, 0, 30, DEFAULTS.tiltOptions.amount),
    hoverScale:
      clamp(ti.hoverScale, 100, 120, DEFAULTS.tiltOptions.hoverScale) / 100,
    glow: ti.glow ?? DEFAULTS.tiltOptions.glow,
  };
}

function __BaseImpl_ShineCard(props: ShineCardProps) {
  const { style } = props;
  const S = settings(props);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const glowTopRef = useRef<HTMLDivElement | null>(null);
  const glowTopSoftRef = useRef<HTMLDivElement | null>(null);
  const glowBottomRef = useRef<HTMLDivElement | null>(null);
  const glowBottomSoftRef = useRef<HTMLDivElement | null>(null);

  const tiltRef = useRef({ tx: 0, ty: 0, x: 0, y: 0, scale: 1, target: 1 });
  const liveRef = useRef(S);
  liveRef.current = S;

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    let raf = 0;
    let settled = false;
    function frame() {
      const t = tiltRef.current;
      t.x += (t.tx - t.x) * 0.12;
      t.y += (t.ty - t.y) * 0.12;
      t.scale += (t.target - t.scale) * 0.12;

      card!.style.transform = `rotateX(${t.x}deg) rotateY(${t.y}deg) scale(${t.scale})`;

      const top = Math.min(1, Math.max(0, -t.x / 15));
      const bottom = Math.min(1, Math.max(0, t.x / 15));
      if (glowTopRef.current) glowTopRef.current.style.opacity = `${top}`;
      if (glowTopSoftRef.current)
        glowTopSoftRef.current.style.opacity = `${top * 0.1}`;
      if (glowBottomRef.current)
        glowBottomRef.current.style.opacity = `${bottom}`;
      if (glowBottomSoftRef.current)
        glowBottomSoftRef.current.style.opacity = `${bottom * 0.1}`;

      const still =
        Math.abs(t.tx - t.x) < 0.01 &&
        Math.abs(t.ty - t.y) < 0.01 &&
        Math.abs(t.target - t.scale) < 0.001;
      if (still && settled) {
        raf = 0;
        return;
      }
      settled = still;
      raf = requestAnimationFrame(frame);
    }
    function wake() {
      settled = false;
      if (!raf) raf = requestAnimationFrame(frame);
    }

    const root = rootRef.current!;
    function onMove(e: PointerEvent) {
      const L = liveRef.current;
      if (!L.tilt) return;
      const rect = root.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = Math.min(
        1,
        Math.max(-1, (e.clientX - cx) / (L.cardWidth / 2))
      );
      const ny = Math.min(
        1,
        Math.max(-1, (e.clientY - cy) / (L.cardHeight / 2))
      );
      const t = tiltRef.current;
      t.tx = -ny * L.tiltAmount * 0.67;
      t.ty = nx * L.tiltAmount;
      t.target = L.hoverScale;
      wake();
    }
    function onLeave() {
      const t = tiltRef.current;
      t.tx = 0;
      t.ty = 0;
      t.target = 1;
      wake();
    }
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    wake();

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const b = S.border || {};
  const borderStyle: CSSProperties = {
    borderStyle: b.borderStyle || "solid",
    borderColor: b.borderColor,
    borderTopWidth: `${b.borderTopWidth ?? b.borderWidth ?? 0}px`,
    borderRightWidth: `${b.borderRightWidth ?? b.borderWidth ?? 0}px`,
    borderBottomWidth: `${b.borderBottomWidth ?? b.borderWidth ?? 0}px`,
    borderLeftWidth: `${b.borderLeftWidth ?? b.borderWidth ?? 0}px`,
  };

  const glow = (
    ref: RefObject<HTMLDivElement | null>,
    color: string,
    from: "top" | "bottom",
    blend: "overlay" | "normal"
  ) => (
    <div
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        borderRadius: S.radius,
        background: `linear-gradient(to ${from === "top" ? "bottom" : "top"}, ${color} 0%, rgba(255,255,255,0) 80%)`,
        opacity: 0,
        mixBlendMode: blend,
      }}
    />
  );

  return (
    <div
      ref={rootRef}
      style={{
        ...(style as CSSProperties),
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: 1200,
      }}
    >
      <div
        ref={cardRef}
        style={{
          position: "relative",
          width: S.cardWidth,
          height: S.cardHeight,
          flex: "0 0 auto",
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: S.cardColor,
            borderRadius: S.radius,
            boxShadow: S.shadow,
            overflow: "hidden",
            ...borderStyle,
          }}
        >
          <div
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <div
              style={{
                position: "absolute",
                inset: 4,
                border: "1.5px solid rgb(255, 255, 255)",
                borderRadius: insetRadius(S.radius, 4),
                filter: "blur(1px)",
                opacity: 0.5,
                WebkitMaskImage:
                  "radial-gradient(34% 2% at 20% 0%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
                maskImage:
                  "radial-gradient(34% 2% at 20% 0%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 4,
                border: "1.5px solid rgb(255, 255, 255)",
                borderRadius: insetRadius(S.radius, 4),
                filter: "blur(1px)",
                opacity: 0.5,
                WebkitMaskImage:
                  "radial-gradient(4% 9% at 0.8% 11.6%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
                maskImage:
                  "radial-gradient(4% 9% at 0.8% 11.6%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: S.radius,
                boxShadow: "inset 0px 0px 2px 2.25px rgba(0, 0, 0, 0.72)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 1,
                borderRadius: insetRadius(S.radius, 1),
                boxShadow: "inset 0px 0px 7px 0.75px rgb(255, 255, 255)",
                opacity: 0.12,
                WebkitMaskImage:
                  "linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)",
                maskImage:
                  "linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                border: "0.75px solid rgb(255, 255, 255)",
                borderRadius: S.radius,
                opacity: 0.36,
                WebkitMaskImage:
                  "linear-gradient(276deg, rgba(0,0,0,0) 95%, rgba(0,0,0,1) 100%)",
                maskImage:
                  "linear-gradient(276deg, rgba(0,0,0,0) 95%, rgba(0,0,0,1) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                border: "2.75px solid rgb(255, 255, 255)",
                borderRadius: S.radius,
                filter: "blur(2px)",
                opacity: 0.15,
                WebkitMaskImage:
                  "linear-gradient(101deg, rgba(0,0,0,0) 67%, rgba(0,0,0,1) 100%)",
                maskImage:
                  "linear-gradient(101deg, rgba(0,0,0,0) 67%, rgba(0,0,0,1) 100%)",
              }}
            />
          </div>

          <div
            style={{
              position: "relative",
              flex: "1 1 0",
              minHeight: 0,
              WebkitMaskImage:
                "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)",
              maskImage:
                "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)",
            }}
          >
            <WaveyDots settings={S} />
          </div>
        </div>

        {S.tilt && (
          <>
            {glow(glowTopRef, S.glow, "top", "overlay")}
            {glow(glowTopSoftRef, S.glow, "top", "normal")}
            {glow(glowBottomRef, S.glow, "bottom", "overlay")}
            {glow(glowBottomSoftRef, S.glow, "bottom", "normal")}
          </>
        )}
      </div>
    </div>
  );
}

function WaveyDots({ settings: S }: { settings: ReturnType<typeof settings> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveRef = useRef(S);
  liveRef.current = S;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    function compile(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS))
        console.warn("ShineCard shader:", gl!.getShaderInfoLog(s));
      return s;
    }
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("ShineCard link:", gl.getProgramInfoLog(program));
      return;
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(program, n);
    const uni = {
      time: u("u_time"),
      res: u("u_res"),
      waveSpeed: u("u_waveSpeed"),
      sparkle: u("u_sparkle"),
      mouse: u("u_mouse"),
      density: u("u_density"),
      theme: u("u_theme"),
      dark: u("u_dark"),
    };

    const mouse = { x: -1, y: -1 };
    let needsResize = true;
    function resizeIfNeeded() {
      if (!needsResize) return;
      needsResize = false;
      const dpr = Math.min(
        (window.devicePixelRatio || 1) * RENDER_SCALE,
        DPR_LIMIT
      );
      const w = Math.max(1, Math.round(canvas!.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas!.clientHeight * dpr));
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w;
        canvas!.height = h;
        gl!.viewport(0, 0, w, h);
        gl!.uniform2f(uni.res, w, h);
      }
    }

    let inView = true;
    let hidden = document.hidden;
    const reducedQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reduced = !!reducedQuery?.matches;

    const io = new IntersectionObserver(
      ([e]) => (inView = e.isIntersecting),
      { threshold: 0.15 }
    );
    io.observe(container);
    const ro = new ResizeObserver(() => (needsResize = true));
    ro.observe(container);

    const onVisibility = () => (hidden = document.hidden);
    const onReduced = () => (reduced = !!reducedQuery?.matches);
    const onResize = () => (needsResize = true);
    document.addEventListener("visibilitychange", onVisibility);
    reducedQuery?.addEventListener?.("change", onReduced);
    window.addEventListener("resize", onResize);

    function onMove(e: MouseEvent) {
      const r = canvas!.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = 1 - (e.clientY - r.top) / r.height;
    }
    function onTouch(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      const r = canvas!.getBoundingClientRect();
      mouse.x = (t.clientX - r.left) / r.width;
      mouse.y = 1 - (t.clientY - r.top) / r.height;
    }
    const onOut = () => {
      mouse.x = -1;
      mouse.y = -1;
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onOut);
    canvas.addEventListener("touchstart", onTouch, { passive: true });
    canvas.addEventListener("touchmove", onTouch, { passive: true });
    canvas.addEventListener("touchend", onOut);

    const onLost = (e: Event) => e.preventDefault();
    const onRestored = () => (needsResize = true);
    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);

    function draw(nowMs: number) {
      const L = liveRef.current;
      resizeIfNeeded();
      gl!.uniform1f(uni.time, reduced ? 0 : nowMs * 0.001);
      gl!.uniform1f(uni.waveSpeed, L.waveSpeed);
      gl!.uniform1f(uni.sparkle, L.sparkle);
      gl!.uniform1f(uni.density, L.density);
      const theme = parseColor01(L.highlight, [1, 1, 1]);
      gl!.uniform3f(uni.theme, theme[0], theme[1], theme[2]);
      const dark = parseColor01(L.unlit, [0.08, 0.08, 0.08]);
      gl!.uniform3f(uni.dark, dark[0], dark[1], dark[2]);
      if (mouse.x >= 0)
        gl!.uniform2f(
          uni.mouse,
          mouse.x * canvas!.width,
          mouse.y * canvas!.height
        );
      else gl!.uniform2f(uni.mouse, -1, -1);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    let raf = 0;
    function tick(now: number) {
      if (inView && !hidden) draw(now);
      raf = requestAnimationFrame(tick);
    }
    draw(0);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reducedQuery?.removeEventListener?.("change", onReduced);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onOut);
      canvas.removeEventListener("touchstart", onTouch);
      canvas.removeEventListener("touchmove", onTouch);
      canvas.removeEventListener("touchend", onOut);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
        role="img"
        aria-label="Metallic dot field"
      />
    </div>
  );
}

const VERT = /* glsl */ `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform float u_waveSpeed;
uniform float u_sparkle;
uniform vec2 u_mouse;
uniform float u_density;
uniform vec3 u_theme;
uniform vec3 u_dark;

#define PI 3.14159265359
#define TAU 6.28318530718
#define SQRT3 1.7320508

float hash21(vec2 p) {
    p = fract(p * vec2(233.34, 851.73));
    p += dot(p, p + 23.45);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    float n = hash21(p);
    return vec2(n, hash21(p + n * 47.0));
}

vec4 hexTile(vec2 p, float scale) {
    p *= scale;
    vec2 s = vec2(1.0, SQRT3);
    vec2 halfS = s * 0.5;
    vec2 aBase = floor(p / s);
    vec2 aLocal = mod(p, s) - halfS;
    vec2 pOff = p - halfS;
    vec2 bBase = floor(pOff / s);
    vec2 bLocal = mod(pOff, s) - halfS;
    float dA = dot(aLocal, aLocal);
    float dB = dot(bLocal, bLocal);
    float pick = step(dA, dB);
    vec2 localCoord = mix(bLocal, aLocal, pick);
    vec2 cellId = mix(bBase + vec2(0.5), aBase, pick);
    return vec4(localCoord, cellId);
}

float waveField(vec2 cellPos, float t) {
    float w = 0.0;
    w += sin(dot(cellPos, vec2(0.7, 0.5)) * 3.5 - t * 2.8) * 0.35;
    w += sin(cellPos.x * 4.2 + t * 1.9) * 0.25;
    float r1 = length(cellPos - vec2(-0.3, 0.2));
    w += sin(r1 * 6.0 - t * 3.2) * 0.2 * smoothstep(1.2, 0.0, r1);
    w += sin(dot(cellPos, vec2(-0.4, 0.8)) * 2.8 - t * 1.5) * 0.2;
    float r2 = length(cellPos - vec2(0.4, -0.3));
    w += sin(r2 * 5.0 - t * 2.4) * 0.15 * smoothstep(1.0, 0.0, r2);
    return w;
}

float dotSpecular(float tiltAngle, float tiltDir, vec2 uv) {
    float ct = cos(tiltAngle);
    float st = sin(tiltAngle);
    float cd = cos(tiltDir);
    float sd = sin(tiltDir);
    vec3 N = vec3(st * cd, st * sd, ct);
    vec3 L = normalize(vec3(0.4, 0.6, 0.9));
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 R = reflect(-L, N);
    float spec = max(dot(R, V), 0.0);
    spec = pow(spec, 48.0);
    float sheen = pow(max(dot(R, V), 0.0), 8.0) * 0.15;
    return spec + sheen;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_res * 0.5) / min(u_res.x, u_res.y);
    float t = u_time * u_waveSpeed;

    float dotScale = max(6.0, u_density);
    vec4 hex = hexTile(uv, dotScale);
    vec2 localPos = hex.xy;
    vec2 cellId = hex.zw;

    vec2 rnd = hash22(cellId);
    float sizeVar = 0.85 + rnd.x * 0.3;
    float baseTilt = (rnd.y - 0.5) * 0.15;
    float reflVar = 0.7 + rnd.x * 0.3;
    float phaseOff = rnd.y * TAU;

    float discRadius = 0.42 * sizeVar;
    float dist = length(localPos);
    float disc = smoothstep(discRadius, discRadius - 0.06, dist);

    float bevel = smoothstep(discRadius, discRadius - 0.04, dist)
                - smoothstep(discRadius - 0.04, discRadius - 0.08, dist);

    vec2 worldPos = cellId / dotScale;

    float wave = waveField(worldPos, t);
    float shimmer = sin(t * 3.0 + phaseOff) * 0.04;
    float tiltAngle = wave * 0.85 + baseTilt + shimmer;

    float waveH = waveField(worldPos + vec2(0.01, 0.0), t);
    float waveV = waveField(worldPos + vec2(0.0, 0.01), t);
    float tiltDir = atan(waveV - wave, waveH - wave);

    float mouseSpec = 0.0;
    if (u_mouse.x >= 0.0) {
        vec2 mUV = (u_mouse - u_res * 0.5) / min(u_res.x, u_res.y);
        float mDist = length(uv - mUV);
        float mInfluence = exp(-mDist * mDist * 10.0);
        vec3 mLightDir = normalize(vec3(mUV.x - uv.x, mUV.y - uv.y, 0.5));
        float ct = cos(tiltAngle);
        float st2 = sin(tiltAngle);
        float cd = cos(tiltDir);
        float sd = sin(tiltDir);
        vec3 mN = vec3(st2 * cd, st2 * sd, ct);
        vec3 mR = reflect(-mLightDir, mN);
        float mS = pow(max(dot(mR, vec3(0.0, 0.0, 1.0)), 0.0), 32.0);
        mouseSpec = mS * mInfluence * 1.5;
    }

    float spec = dotSpecular(tiltAngle, tiltDir, uv);
    spec *= reflVar * u_sparkle;
    spec += mouseSpec * reflVar;

    vec3 darkDot = clamp(u_dark, 0.0, 1.0);
    vec3 hotGold = clamp(u_theme, 0.0, 1.0);
    vec3 amberFlash = mix(hotGold, vec3(1.0), 0.12);

    vec3 sheenBase = clamp(hotGold * 0.63 + 0.10, 0.0, 1.0);
    vec3 copperMid = mix(sheenBase, hotGold, 0.55);

    float facing = clamp(cos(tiltAngle) * 0.5 + 0.5, 0.0, 1.0);

    vec3 ambient = mix(darkDot, vec3(0.05), facing * 0.6);
    vec3 dotColor = ambient;

    float sheenAmount = pow(max(facing, 0.0), 3.0) * 0.2 * reflVar;
    dotColor += copperMid * sheenAmount;

    float flashLow = smoothstep(0.0, 0.3, spec);
    float flashHigh = smoothstep(0.3, 0.8, spec);
    float flashPeak = smoothstep(0.7, 1.0, spec);
    dotColor += copperMid * flashLow * 0.5;
    dotColor += amberFlash * flashHigh * 0.8;
    dotColor += hotGold * flashPeak * 1.2;
    dotColor += copperMid * bevel * facing * 0.3;

    vec3 col = dotColor * disc;

    vec2 uvSafe = uv + vec2(0.0001);
    float globalLight = 0.85 + 0.15 * dot(normalize(uvSafe), vec2(0.4, 0.6));
    col *= globalLight;

    float vig = 1.0 - smoothstep(0.4, 1.3, length(uv));
    col *= 0.6 + 0.4 * vig;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), disc);
}
`;

const __presetProps = {
  "cardWidth": 600,
  "cardHeight": 400,
  "cardColor": "#FFA000",
  "radius": "32px",
  "border": {
    "borderColor": "#FF8B00",
    "borderStyle": "solid",
    "borderWidth": 1,
    "borderTopWidth": 1,
    "borderLeftWidth": 1,
    "borderRightWidth": 1,
    "borderBottomWidth": 1
  },
  "density": 100,
  "waveSpeed": 44,
  "sparkle": 100,
  "unlit": "#000000",
  "highlight": "#FFE100",
  "tilt": true,
  "tiltOptions": {
    "glow": "#FFC800",
    "amount": 18,
    "hoverScale": 105
  }
};

export default function ShineCard(props: Record<string, unknown>) {
  return <__BaseImpl_ShineCard {...(__presetProps as Record<string, unknown>)} {...props} />;
}
