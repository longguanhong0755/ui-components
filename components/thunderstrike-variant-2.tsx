"use client";

import { useEffect, useRef } from "react";

type Rgb = { r: number; g: number; b: number };

/** Coerce tweak-panel / Framer Color values into a CSS color string. */
function colorToCss(input: unknown): string {
  if (input == null) return "";
  if (typeof input === "string") return input.trim();
  if (typeof input === "number") return "";
  if (typeof input === "object") {
    const o = input as Record<string, unknown>;
    // Channel objects first — never call Object.prototype.toString (→ "[object Object]").
    if ("__rgba" in o && o.__rgba && typeof o.__rgba === "object") {
      const c = o.__rgba as Record<string, number>;
      return `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
    }
    if ("r" in o && "g" in o && "b" in o) {
      return `rgb(${Math.round(Number(o.r))}, ${Math.round(Number(o.g))}, ${Math.round(Number(o.b))})`;
    }
    // Framer Color / shim helpers (own methods only).
    for (const key of ["toRgbString", "toHexString", "toValue"] as const) {
      const fn = o[key];
      if (typeof fn === "function") {
        try {
          const out = (fn as () => unknown).call(input);
          if (typeof out === "string" && out.trim() && !/^\[object /i.test(out)) {
            return out.trim();
          }
        } catch {
          /* ignore */
        }
      }
    }
    if (
      typeof o.toString === "function" &&
      o.toString !== Object.prototype.toString
    ) {
      try {
        const out = (o.toString as () => unknown).call(input);
        if (typeof out === "string" && out.trim() && !/^\[object /i.test(out)) {
          return out.trim();
        }
      } catch {
        /* ignore */
      }
    }
  }
  return String(input).trim();
}

/** Parse any common CSS / picker color into linear RGB in 0..1. Never returns NaN. */
function colorToRgb(input: unknown): Rgb {
  const fallback: Rgb = { r: 0, g: 0, b: 0 };
  const s = colorToCss(input);
  if (!s || /gradient\(/i.test(s) || /^oklch\(/i.test(s)) return fallback;

  let r = 0;
  let g = 0;
  let b = 0;

  // Hex: #rgb #rgba #rrggbb #rrggbbaa, or bare rrggbb
  const hexMatch = s.match(/^#?([0-9a-fA-F]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .slice(0, 3)
        .split("")
        .map((c) => c + c)
        .join("");
    } else if (hex.length === 8) {
      hex = hex.slice(0, 6);
    }
    if (hex.length !== 6) return fallback;
    r = parseInt(hex.slice(0, 2), 16) / 255;
    g = parseInt(hex.slice(2, 4), 16) / 255;
    b = parseInt(hex.slice(4, 6), 16) / 255;
  } else {
    let m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const parts = m[1].split(/[\s,/]+/).filter(Boolean).map((v) => parseFloat(v));
      if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return fallback;
      // Support both 0-255 and 0-1 channel forms.
      const scale = parts[0] > 1 || parts[1] > 1 || parts[2] > 1 ? 255 : 1;
      r = parts[0] / scale;
      g = parts[1] / scale;
      b = parts[2] / scale;
    } else {
      m = s.match(/hsla?\(([^)]+)\)/i);
      if (!m) return fallback;
      const parts = m[1].split(/[\s,/]+/).filter(Boolean).map((v) => parseFloat(v));
      if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return fallback;
      const h = (((parts[0] % 360) + 360) % 360) / 360;
      const sat = parts[1] > 1 ? parts[1] / 100 : parts[1];
      const li = parts[2] > 1 ? parts[2] / 100 : parts[2];
      const k = (n: number) => (n + h * 12) % 12;
      const f = (n: number) =>
        li -
        sat *
          Math.min(li, 1 - li) *
          Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      r = f(0);
      g = f(8);
      b = f(4);
    }
  }

  if ([r, g, b].some((n) => Number.isNaN(n))) return fallback;
  return {
    r: Math.min(1, Math.max(0, r)),
    g: Math.min(1, Math.max(0, g)),
    b: Math.min(1, Math.max(0, b)),
  };
}

/** RGB 0..1 → HSV (h in degrees). Used for the bolt hue uniform. */
function rgbToHsv(rgb: Rgb): { h: number; s: number; v: number } {
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h: h >= 0 ? h : h + 360, s, v };
}

interface LightningProps {
  lightningColor?: unknown;
  backgroundColor?: unknown;
  xOffset?: number;
  speed?: number;
  intensity?: number;
  size?: number;
  angle?: number;
}

function __BaseImpl_Lightning({
  lightningColor = "rgb(245, 114, 25)",
  backgroundColor = "rgb(0, 0, 0)",
  xOffset = 1,
  speed = 55,
  intensity = 23,
  size = 50,
  angle = -27,
}: LightningProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Live prop bag — updated every render so the WebGL loop never tears down
  // (and never restarts rAF) when the control panel tweaks values.
  const propsRef = useRef({
    lightningColor,
    backgroundColor,
    xOffset,
    speed,
    intensity,
    size,
    angle,
  });
  propsRef.current = {
    lightningColor,
    backgroundColor,
    xOffset,
    speed,
    intensity,
    size,
    angle,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      canvas.getContext("webgl", {
        preserveDrawingBuffer: true,
        premultipliedAlpha: false,
      }) || (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    let isDestroyed = false;
    let rafId = 0;

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const uniforms: Record<string, WebGLUniformLocation | null> = {
      iResolution: gl.getUniformLocation(program, "iResolution"),
      iTime: gl.getUniformLocation(program, "iTime"),
      uHue: gl.getUniformLocation(program, "uHue"),
      uBackgroundHsv: gl.getUniformLocation(program, "uBackgroundHsv"),
      uXOffset: gl.getUniformLocation(program, "uXOffset"),
      uSpeed: gl.getUniformLocation(program, "uSpeed"),
      uIntensity: gl.getUniformLocation(program, "uIntensity"),
      uSize: gl.getUniformLocation(program, "uSize"),
      uAngle: gl.getUniformLocation(program, "uAngle"),
    };

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const startTime = performance.now();

    const resizeCanvas = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth));
      const h = Math.max(1, Math.floor(canvas.clientHeight));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const render = () => {
      if (isDestroyed) return;
      resizeCanvas();
      gl.viewport(0, 0, canvas.width, canvas.height);

      const p = propsRef.current;
      if (uniforms.iResolution) {
        gl.uniform2f(uniforms.iResolution, canvas.width, canvas.height);
      }
      if (uniforms.iTime) {
        gl.uniform1f(uniforms.iTime, (performance.now() - startTime) / 1e3);
      }

      const bolt = rgbToHsv(colorToRgb(p.lightningColor));
      const bg = rgbToHsv(colorToRgb(p.backgroundColor));
      if (uniforms.uHue) gl.uniform1f(uniforms.uHue, Number.isFinite(bolt.h) ? bolt.h : 0);
      if (uniforms.uBackgroundHsv) {
        gl.uniform3f(
          uniforms.uBackgroundHsv,
          (Number.isFinite(bg.h) ? bg.h : 0) / 360,
          Number.isFinite(bg.s) ? bg.s : 0,
          Number.isFinite(bg.v) ? bg.v : 0,
        );
      }
      if (uniforms.uXOffset) gl.uniform1f(uniforms.uXOffset, -p.xOffset / 25);
      if (uniforms.uSpeed) gl.uniform1f(uniforms.uSpeed, p.speed / 50);
      if (uniforms.uIntensity) gl.uniform1f(uniforms.uIntensity, p.intensity / 50);
      if (uniforms.uSize) gl.uniform1f(uniforms.uSize, p.size * 0.03);
      if (uniforms.uAngle) gl.uniform1f(uniforms.uAngle, (p.angle * Math.PI) / 180);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!isDestroyed) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      isDestroyed = true;
      window.removeEventListener("resize", resizeCanvas);
      if (rafId) cancelAnimationFrame(rafId);
      if (vertexBuffer) gl.deleteBuffer(vertexBuffer);
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      if (program) gl.deleteProgram(program);
      const lose = (gl as WebGLRenderingContext & {
        getExtension(name: string): { loseContext?: () => void } | null;
      }).getExtension("WEBGL_lose_context");
      lose?.loseContext?.();
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", position: "relative" }}
      />
    </div>
  );
}

const vertexShaderSource = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uHue;
uniform vec3 uBackgroundHsv;  // x: hue (0-1), y: saturation (0-1), z: value (0-1)
uniform float uXOffset;
uniform float uSpeed;
uniform float uIntensity;
uniform float uSize;
uniform float uAngle;

#define OCTAVE_COUNT 10

vec3 hsv2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

float hash11(float p) {
    p = fract(p * .1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

mat2 rotate2d(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat2(c, -s, s, c);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float a = hash12(ip);
    float b = hash12(ip + vec2(1.0, 0.0));
    float c = hash12(ip + vec2(0.0, 1.0));
    float d = hash12(ip + vec2(1.0, 1.0));

    vec2 t = smoothstep(0.0, 1.0, fp);
    return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < OCTAVE_COUNT; ++i) {
        value += amplitude * noise(p);
        p *= rotate2d(0.45);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord / iResolution.xy;
    uv = 2.0 * uv - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    uv *= rotate2d(uAngle);

    uv.x += uXOffset;

    uv += 2.0 * fbm(uv * uSize + 0.8 * iTime * uSpeed) - 1.0;

    float dist = abs(uv.x);
    vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.8));
    vec3 bgColor = hsv2rgb(vec3(uBackgroundHsv.x, uBackgroundHsv.y, uBackgroundHsv.z));
    vec3 lightningEffect = baseColor * pow(mix(0.0, 0.07, hash11(iTime * uSpeed)) / dist, 1.0) * uIntensity;
    vec3 col = mix(bgColor, lightningEffect, clamp(lightningEffect.r, 0.0, 1.0));
    col = pow(col, vec3(1.0));
    fragColor = vec4(col, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

const __presetProps = {
  "lightningColor": "#00FF8A",
  "backgroundColor": "rgb(0, 0, 0)",
  "xOffset": -3,
  "speed": 16,
  "intensity": 37,
  "size": 1,
  "angle": 4
};

export default function Lightning(props: Record<string, unknown>) {
  return <__BaseImpl_Lightning {...(__presetProps as Record<string, unknown>)} {...props} />;
}
