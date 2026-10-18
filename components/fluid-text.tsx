"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";

type Props = {
  text?: string;
  font?: React.CSSProperties;
  color?: string;
  paletteColors?: string[];
  splatRadius?: number;
  splatForce?: number;
  curl?: number;
  densityDissipation?: number;
  style?: React.CSSProperties;
};

const DEFAULT_FONT: React.CSSProperties = {
  fontFamily: "Inter",
  fontWeight: 700,
  fontSize: "120px",
  lineHeight: "1.5em",
  letterSpacing: "0em",
  textAlign: "center",
} as React.CSSProperties;

const DEFAULT_PALETTE = ["#A855F7", "#EC4899", "#3B82F6", "#AFFF00", "#00FFF5"];

const ALIGNMENTS: Record<string, "left" | "center" | "right"> = {
  left: "left",
  center: "center",
  right: "right",
  justify: "left",
};

const DEFAULTS = {
  text: "FLUID TEXT",
  color: "#FFFFFF",
  splatRadius: 7,
  splatForce: 10,
  curl: 50,
  densityDissipation: 5,
};

const SHADING = true;
const COLOR_SPEED = 0.125;
const VELOCITY_DISSIPATION = 2;
const PRESSURE = 1 / 20;
const SIM_RESOLUTION = 128;
const DYE_RESOLUTION = 1440;
const PRESSURE_ITERATIONS = 20;
const MAX_COLORS = 5;

type RGB = { r: number; g: number; b: number };

function parseColor(input: string, multiplier: number): RGB {
  const black = { r: 0, g: 0, b: 0 };
  if (typeof input !== "string" || !input) return black;
  const str = input.trim();

  const rgb = str.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgb) {
    return {
      r: (parseFloat(rgb[1]) / 255) * multiplier,
      g: (parseFloat(rgb[2]) / 255) * multiplier,
      b: (parseFloat(rgb[3]) / 255) * multiplier,
    };
  }

  let val = str.replace("#", "");
  if (val.length === 3 || val.length === 4) {
    val = val
      .slice(0, 3)
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const n = parseInt(val.slice(0, 6), 16);
  if (!Number.isFinite(n)) return black;
  return {
    r: (((n >> 16) & 255) / 255) * multiplier,
    g: (((n >> 8) & 255) / 255) * multiplier,
    b: ((n & 255) / 255) * multiplier,
  };
}

function parseRGBA(color: string): [number, number, number, number] {
  const s = String(color || "").trim();
  const m = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)[\s,]*([\d.]*)/i);
  if (m) {
    const a = m[4] === "" || m[4] === undefined ? 1 : parseFloat(m[4]);
    return [
      parseFloat(m[1]) / 255,
      parseFloat(m[2]) / 255,
      parseFloat(m[3]) / 255,
      Number.isFinite(a) ? a : 1,
    ];
  }
  const c = parseColor(s, 1);
  return [c.r, c.g, c.b, 1];
}

function toPx(value: any, relativeTo: number, fallback: number) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value !== "string") return fallback;
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return fallback;
  if (value.includes("em")) return n * relativeTo;
  if (value.includes("%")) return (n / 100) * relativeTo;
  return n;
}

const WEIGHT_NAMES: Record<string, number> = {
  thin: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

function fontWeightOf(font: any) {
  const explicit = parseFloat(font?.fontWeight);
  if (Number.isFinite(explicit)) return explicit;
  const v = String(font?.variant || "Regular").toLowerCase();
  const digits = v.match(/\d{3}/);
  if (digits) return parseInt(digits[0], 10);
  for (const name of Object.keys(WEIGHT_NAMES)) if (v.includes(name)) return WEIGHT_NAMES[name];
  return 400;
}

function fontItalicOf(font: any) {
  const v = String(font?.variant || "").toLowerCase();
  return (
    String(font?.fontStyle || "").toLowerCase() === "italic" ||
    v.includes("italic") ||
    v.includes("oblique")
  );
}

function setCanvasFont(ctx: CanvasRenderingContext2D, font: any, sizePx: number) {
  const family = String(font?.fontFamily || "").trim();
  const stack = family
    ? /[",']/.test(family) || family.includes(",")
      ? family
      : `${family}, sans-serif`
    : "sans-serif";
  const weight = fontWeightOf(font);
  const style = fontItalicOf(font) ? "italic " : "";
  ctx.font = `${style}${weight} ${sizePx}px ${stack}`;
  if (!ctx.font.includes(`${sizePx}px`)) ctx.font = `${style}${weight} ${sizePx}px sans-serif`;
}

const BASE_VERTEX_SHADER = `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`;

const COPY_SHADER = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        gl_FragColor = texture2D(uTexture, vUv);
    }
`;

const CLEAR_SHADER = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;

    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
`;

const DISPLAY_SHADER = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform sampler2D uMask;
    uniform vec2 texelSize;
    uniform vec4 uBase;

    void main () {
        float mask = texture2D(uMask, vUv).a;
        if (mask <= 0.0) discard;

        vec3 c = texture2D(uTexture, vUv).rgb;
        #ifdef SHADING
            vec3 lc = texture2D(uTexture, vL).rgb;
            vec3 rc = texture2D(uTexture, vR).rgb;
            vec3 tc = texture2D(uTexture, vT).rgb;
            vec3 bc = texture2D(uTexture, vB).rgb;

            float dx = length(rc) - length(lc);
            float dy = length(tc) - length(bc);

            vec3 n = normalize(vec3(dx, dy, length(texelSize)));
            vec3 l = vec3(0.0, 0.0, 1.0);

            float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
            c *= diffuse;
        #endif

        float d = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
        vec3 color = uBase.rgb * uBase.a * (1.0 - d) + c;
        float m = max(color.r, max(color.g, color.b));
        if (m > 1.0) color /= m;
        gl_FragColor = vec4(color, mask * max(uBase.a, d));
    }
`;

const SPLAT_SHADER = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;

    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
`;

const ADVECTION_SHADER = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;
        vec2 iuv = floor(st);
        vec2 fuv = fract(st);

        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
        #ifdef MANUAL_FILTERING
            vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
            vec4 result = bilerp(uSource, coord, dyeTexelSize);
        #else
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            vec4 result = texture2D(uSource, coord);
        #endif
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
    }
`;

const DIVERGENCE_SHADER = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;

        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }

        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`;

const CURL_SHADER = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
`;

const VORTICITY_SHADER = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;

    void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;

        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;

        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity += force * dt;
        velocity = min(max(velocity, -1000.0), 1000.0);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`;

const PRESSURE_SHADER = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`;

const GRADIENT_SUBTRACT_SHADER = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`;

function __BaseImpl_FluidText(props: Props) {
  const {
    text = DEFAULTS.text,
    color = DEFAULTS.color,
    splatRadius = DEFAULTS.splatRadius,
    splatForce = DEFAULTS.splatForce,
    curl = DEFAULTS.curl,
    densityDissipation = DEFAULTS.densityDissipation,
    style,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [glEpoch, setGlEpoch] = useState(0);

  const font = { ...DEFAULT_FONT, ...(props.font || {}) };
  const align =
    ALIGNMENTS[String((font as any).textAlign || "").toLowerCase()] ?? "center";
  const paletteColors =
    Array.isArray(props.paletteColors) && props.paletteColors.length
      ? props.paletteColors.slice(0, MAX_COLORS)
      : DEFAULT_PALETTE;

  const live = useRef<any>(null);
  live.current = {
    text,
    font,
    align,
    color,
    paletteColors,
    densityDissipation: densityDissipation * 0.5,
    curl,
    splatRadius: splatRadius / 20,
    splatForce: splatForce * 1000,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onLost = (e: Event) => e.preventDefault();
    const onRestored = () => setGlEpoch((n) => n + 1);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const params: WebGLContextAttributes = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: false,
    };
    let isWebGL2 = true;
    let gl = canvas.getContext("webgl2", params) as
      | WebGL2RenderingContext
      | WebGLRenderingContext
      | null;
    if (!gl) {
      isWebGL2 = false;
      gl = (canvas.getContext("webgl", params) ||
        canvas.getContext("experimental-webgl", params)) as WebGLRenderingContext | null;
    }
    if (!gl) return;
    const g = gl as any;

    if (g.isContextLost()) {
      g.getExtension("WEBGL_lose_context")?.restoreContext();
      return;
    }

    let halfFloat: any;
    let supportLinearFiltering: any;
    if (isWebGL2) {
      g.getExtension("EXT_color_buffer_float");
      supportLinearFiltering = g.getExtension("OES_texture_float_linear");
    } else {
      halfFloat = g.getExtension("OES_texture_half_float");
      supportLinearFiltering = g.getExtension("OES_texture_half_float_linear");
    }
    g.clearColor(0, 0, 0, 0);
    const halfFloatTexType = isWebGL2 ? g.HALF_FLOAT : halfFloat && halfFloat.HALF_FLOAT_OES;

    const supportRenderTextureFormat = (
      internalFormat: number,
      format: number,
      type: number
    ) => {
      const texture = g.createTexture();
      g.bindTexture(g.TEXTURE_2D, texture);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
      g.texImage2D(g.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
      const fbo = g.createFramebuffer();
      g.bindFramebuffer(g.FRAMEBUFFER, fbo);
      g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, texture, 0);
      const ok = g.checkFramebufferStatus(g.FRAMEBUFFER) === g.FRAMEBUFFER_COMPLETE;
      g.deleteFramebuffer(fbo);
      g.deleteTexture(texture);
      return ok;
    };

    const getSupportedFormat = (
      internalFormat: number,
      format: number,
      type: number
    ): { internalFormat: number; format: number } | null => {
      if (!supportRenderTextureFormat(internalFormat, format, type)) {
        switch (internalFormat) {
          case g.R16F:
            return getSupportedFormat(g.RG16F, g.RG, type);
          case g.RG16F:
            return getSupportedFormat(g.RGBA16F, g.RGBA, type);
          default:
            return null;
        }
      }
      return { internalFormat, format };
    };

    const formatRGBA = isWebGL2
      ? getSupportedFormat(g.RGBA16F, g.RGBA, halfFloatTexType)
      : getSupportedFormat(g.RGBA, g.RGBA, halfFloatTexType);
    const formatRG = isWebGL2
      ? getSupportedFormat(g.RG16F, g.RG, halfFloatTexType)
      : getSupportedFormat(g.RGBA, g.RGBA, halfFloatTexType);
    const formatR = isWebGL2
      ? getSupportedFormat(g.R16F, g.RED, halfFloatTexType)
      : getSupportedFormat(g.RGBA, g.RGBA, halfFloatTexType);
    if (!formatRGBA || !formatRG || !formatR) return;

    const effectiveDyeRes = () =>
      supportLinearFiltering ? DYE_RESOLUTION : Math.min(DYE_RESOLUTION, 256);
    const effectiveShading = () => (supportLinearFiltering ? SHADING : false);

    const hashCode = (s: string) => {
      let hash = 0;
      for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    };

    const compileShader = (type: number, source: string, keywords?: string[]) => {
      const withDefines = keywords
        ? keywords.map((k) => `#define ${k}\n`).join("") + source
        : source;
      const shader = g.createShader(type);
      g.shaderSource(shader, withDefines);
      g.compileShader(shader);
      if (!g.getShaderParameter(shader, g.COMPILE_STATUS)) {
        console.warn("Fluid Text shader:", g.getShaderInfoLog(shader));
      }
      return shader;
    };

    const createProgram = (vs: any, fs: any) => {
      const program = g.createProgram();
      g.attachShader(program, vs);
      g.attachShader(program, fs);
      g.linkProgram(program);
      if (!g.getProgramParameter(program, g.LINK_STATUS)) {
        console.warn("Fluid Text link:", g.getProgramInfoLog(program));
      }
      return program;
    };

    const getUniforms = (program: any) => {
      const uniforms: Record<string, WebGLUniformLocation> = {};
      const count = g.getProgramParameter(program, g.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i++) {
        const name = g.getActiveUniform(program, i).name;
        uniforms[name] = g.getUniformLocation(program, name);
      }
      return uniforms;
    };

    class Program {
      program: any;
      uniforms: Record<string, WebGLUniformLocation>;
      constructor(vs: any, fs: any) {
        this.program = createProgram(vs, fs);
        this.uniforms = getUniforms(this.program);
      }
      bind() {
        g.useProgram(this.program);
      }
    }

    class Material {
      programs: Record<number, any> = {};
      activeProgram: any = null;
      uniforms: Record<string, WebGLUniformLocation> = {};
      constructor(private vertexShader: any, private fragmentShaderSource: string) {}
      setKeywords(keywords: string[]) {
        let hash = 0;
        for (const k of keywords) hash += hashCode(k);
        let program = this.programs[hash];
        if (program == null) {
          const fs = compileShader(g.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
          program = createProgram(this.vertexShader, fs);
          this.programs[hash] = program;
        }
        if (program === this.activeProgram) return;
        this.uniforms = getUniforms(program);
        this.activeProgram = program;
      }
      bind() {
        g.useProgram(this.activeProgram);
      }
    }

    const baseVertexShader = compileShader(g.VERTEX_SHADER, BASE_VERTEX_SHADER);
    const copyProgram = new Program(baseVertexShader, compileShader(g.FRAGMENT_SHADER, COPY_SHADER));
    const clearProgram = new Program(baseVertexShader, compileShader(g.FRAGMENT_SHADER, CLEAR_SHADER));
    const splatProgram = new Program(baseVertexShader, compileShader(g.FRAGMENT_SHADER, SPLAT_SHADER));
    const advectionProgram = new Program(
      baseVertexShader,
      compileShader(
        g.FRAGMENT_SHADER,
        ADVECTION_SHADER,
        supportLinearFiltering ? undefined : ["MANUAL_FILTERING"]
      )
    );
    const divergenceProgram = new Program(
      baseVertexShader,
      compileShader(g.FRAGMENT_SHADER, DIVERGENCE_SHADER)
    );
    const curlProgram = new Program(baseVertexShader, compileShader(g.FRAGMENT_SHADER, CURL_SHADER));
    const vorticityProgram = new Program(
      baseVertexShader,
      compileShader(g.FRAGMENT_SHADER, VORTICITY_SHADER)
    );
    const pressureProgram = new Program(
      baseVertexShader,
      compileShader(g.FRAGMENT_SHADER, PRESSURE_SHADER)
    );
    const gradientSubtractProgram = new Program(
      baseVertexShader,
      compileShader(g.FRAGMENT_SHADER, GRADIENT_SUBTRACT_SHADER)
    );
    const displayMaterial = new Material(baseVertexShader, DISPLAY_SHADER);

    const quadBuffer = g.createBuffer();
    const quadIndices = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, quadBuffer);
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), g.STATIC_DRAW);
    g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, quadIndices);
    g.bufferData(g.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), g.STATIC_DRAW);
    g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
    g.enableVertexAttribArray(0);

    const blit = (target: any, clear = false) => {
      if (target == null) {
        g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight);
        g.bindFramebuffer(g.FRAMEBUFFER, null);
      } else {
        g.viewport(0, 0, target.width, target.height);
        g.bindFramebuffer(g.FRAMEBUFFER, target.fbo);
      }
      if (clear) {
        g.clearColor(0, 0, 0, target == null ? 0 : 1);
        g.clear(g.COLOR_BUFFER_BIT);
      }
      g.drawElements(g.TRIANGLES, 6, g.UNSIGNED_SHORT, 0);
    };

    const createFBO = (
      w: number,
      h: number,
      internalFormat: number,
      format: number,
      type: number,
      param: number
    ) => {
      g.activeTexture(g.TEXTURE0);
      const texture = g.createTexture();
      g.bindTexture(g.TEXTURE_2D, texture);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, param);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, param);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
      g.texImage2D(g.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
      const fbo = g.createFramebuffer();
      g.bindFramebuffer(g.FRAMEBUFFER, fbo);
      g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, texture, 0);
      g.viewport(0, 0, w, h);
      g.clear(g.COLOR_BUFFER_BIT);
      return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX: 1 / w,
        texelSizeY: 1 / h,
        attach(id: number) {
          g.activeTexture(g.TEXTURE0 + id);
          g.bindTexture(g.TEXTURE_2D, texture);
          return id;
        },
      };
    };

    const destroyFBO = (target: any) => {
      if (!target) return;
      g.deleteFramebuffer(target.fbo);
      g.deleteTexture(target.texture);
    };
    const destroyDoubleFBO = (target: any) => {
      if (!target) return;
      destroyFBO(target.read);
      destroyFBO(target.write);
    };

    const createDoubleFBO = (
      w: number,
      h: number,
      internalFormat: number,
      format: number,
      type: number,
      param: number
    ) => {
      let fbo1 = createFBO(w, h, internalFormat, format, type, param);
      let fbo2 = createFBO(w, h, internalFormat, format, type, param);
      return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read() {
          return fbo1;
        },
        set read(v) {
          fbo1 = v;
        },
        get write() {
          return fbo2;
        },
        set write(v) {
          fbo2 = v;
        },
        swap() {
          const t = fbo1;
          fbo1 = fbo2;
          fbo2 = t;
        },
      };
    };

    const resizeFBO = (
      target: any,
      w: number,
      h: number,
      internalFormat: number,
      format: number,
      type: number,
      param: number
    ) => {
      const next = createFBO(w, h, internalFormat, format, type, param);
      copyProgram.bind();
      g.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
      blit(next);
      destroyFBO(target);
      return next;
    };

    const resizeDoubleFBO = (
      target: any,
      w: number,
      h: number,
      internalFormat: number,
      format: number,
      type: number,
      param: number
    ) => {
      if (target.width === w && target.height === h) return target;
      target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
      destroyFBO(target.write);
      target.write = createFBO(w, h, internalFormat, format, type, param);
      target.width = w;
      target.height = h;
      target.texelSizeX = 1 / w;
      target.texelSizeY = 1 / h;
      return target;
    };

    const getResolution = (resolution: number) => {
      let aspectRatio = g.drawingBufferWidth / g.drawingBufferHeight;
      if (aspectRatio < 1) aspectRatio = 1 / aspectRatio;
      const min = Math.round(resolution);
      const max = Math.round(resolution * aspectRatio);
      return g.drawingBufferWidth > g.drawingBufferHeight
        ? { width: max, height: min }
        : { width: min, height: max };
    };

    let dye: any;
    let velocity: any;
    let divergence: any;
    let curlFBO: any;
    let pressureFBO: any;

    const initFramebuffers = () => {
      const simRes = getResolution(SIM_RESOLUTION);
      const dyeRes = getResolution(effectiveDyeRes());
      const texType = halfFloatTexType;
      const filtering = supportLinearFiltering ? g.LINEAR : g.NEAREST;
      g.disable(g.BLEND);

      dye = dye
        ? resizeDoubleFBO(
            dye,
            dyeRes.width,
            dyeRes.height,
            formatRGBA.internalFormat,
            formatRGBA.format,
            texType,
            filtering
          )
        : createDoubleFBO(
            dyeRes.width,
            dyeRes.height,
            formatRGBA.internalFormat,
            formatRGBA.format,
            texType,
            filtering
          );
      velocity = velocity
        ? resizeDoubleFBO(
            velocity,
            simRes.width,
            simRes.height,
            formatRG.internalFormat,
            formatRG.format,
            texType,
            filtering
          )
        : createDoubleFBO(
            simRes.width,
            simRes.height,
            formatRG.internalFormat,
            formatRG.format,
            texType,
            filtering
          );

      if (divergence && divergence.width === simRes.width && divergence.height === simRes.height) {
        return;
      }

      destroyFBO(divergence);
      destroyFBO(curlFBO);
      destroyDoubleFBO(pressureFBO);
      divergence = createFBO(
        simRes.width,
        simRes.height,
        formatR.internalFormat,
        formatR.format,
        texType,
        g.NEAREST
      );
      curlFBO = createFBO(
        simRes.width,
        simRes.height,
        formatR.internalFormat,
        formatR.format,
        texType,
        g.NEAREST
      );
      pressureFBO = createDoubleFBO(
        simRes.width,
        simRes.height,
        formatR.internalFormat,
        formatR.format,
        texType,
        g.NEAREST
      );
    };

    const updateKeywords = () => {
      displayMaterial.setKeywords(effectiveShading() ? ["SHADING"] : []);
    };
    updateKeywords();
    initFramebuffers();

    const MASK_UNIT = 8;
    const maskCanvas = document.createElement("canvas");
    const maskTexture = g.createTexture();
    g.activeTexture(g.TEXTURE0 + MASK_UNIT);
    g.bindTexture(g.TEXTURE_2D, maskTexture);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);

    const paintMask = (p: any, dpr: number) => {
      const w = Math.max(1, canvas.width);
      const h = Math.max(1, canvas.height);
      maskCanvas.width = w;
      maskCanvas.height = h;
      const ctx = maskCanvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      const f = p.font;
      const fontSize = toPx(f.fontSize, 100, 160);
      setCanvasFont(ctx, f, fontSize * dpr);
      try {
        (ctx as any).letterSpacing = `${toPx(f.letterSpacing, fontSize, 0) * dpr}px`;
      } catch {}
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "middle";
      ctx.textAlign = p.align as CanvasTextAlign;
      const pad = 8 * dpr;
      const x = p.align === "left" ? pad : p.align === "right" ? w - pad : w / 2;

      const lines = String(p.text ?? "").split("\n");
      const lineHeight = toPx(f.lineHeight, fontSize, fontSize) * dpr || fontSize * dpr;
      const startY = h / 2 - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, i) => ctx.fillText(line, x, startY + i * lineHeight));

      g.activeTexture(g.TEXTURE0 + MASK_UNIT);
      g.bindTexture(g.TEXTURE_2D, maskTexture);
      g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, true);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, maskCanvas);
      g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false);
    };

    let maskKey = "";
    const syncMask = (dpr: number) => {
      const p = live.current;
      const key = [canvas.width, canvas.height, dpr, p.text, p.align, JSON.stringify(p.font)].join(
        "|"
      );
      if (key === maskKey) return;
      maskKey = key;
      paintMask(p, dpr);
    };
    (document as any).fonts?.ready?.then(() => {
      maskKey = "";
    });

    const tint = () => 0.5;

    let colorPhase = Math.random();

    const paletteAt = (phase: number): RGB => {
      const p = live.current;
      const list = p.paletteColors.length ? p.paletteColors : DEFAULT_PALETTE;
      const t = tint();
      if (list.length === 1) return parseColor(list[0], t);
      const scaled = phase * list.length;
      const i = Math.floor(scaled) % list.length;
      const a = parseColor(list[i], t);
      const b = parseColor(list[(i + 1) % list.length], t);
      const f = scaled - Math.floor(scaled);
      return {
        r: a.r + (b.r - a.r) * f,
        g: a.g + (b.g - a.g) * f,
        b: a.b + (b.b - a.b) * f,
      };
    };

    const pointer = {
      texcoordX: 0,
      texcoordY: 0,
      prevTexcoordX: 0,
      prevTexcoordY: 0,
      deltaX: 0,
      deltaY: 0,
      moved: false,
      color: paletteAt(colorPhase),
      clientX: 0,
      clientY: 0,
    };

    const correctRadius = (radius: number) => {
      const aspectRatio = canvas.width / canvas.height;
      return aspectRatio > 1 ? radius * aspectRatio : radius;
    };

    const splat = (x: number, y: number, dx: number, dy: number, c: RGB) => {
      g.disable(g.BLEND);
      splatProgram.bind();
      g.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
      g.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
      g.uniform2f(splatProgram.uniforms.point, x, y);
      g.uniform3f(splatProgram.uniforms.color, dx, dy, 0);
      g.uniform1f(splatProgram.uniforms.radius, correctRadius(live.current.splatRadius / 100));
      blit(velocity.write);
      velocity.swap();

      g.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
      g.uniform3f(splatProgram.uniforms.color, c.r, c.g, c.b);
      blit(dye.write);
      dye.swap();
    };

    const splatPointer = () => {
      splat(
        pointer.texcoordX,
        pointer.texcoordY,
        pointer.deltaX * live.current.splatForce,
        pointer.deltaY * live.current.splatForce,
        pointer.color
      );
    };

    const clickSplat = () => {
      const c = paletteAt(colorPhase);
      splat(pointer.texcoordX, pointer.texcoordY, 10 * (Math.random() - 0.5), 30 * (Math.random() - 0.5), {
        r: c.r * 10,
        g: c.g * 10,
        b: c.b * 10,
      });
    };

    const isInsideHoverZone = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    };

    let inside = false;

    const scaleByPixelRatio = (input: number) => Math.floor(input * (window.devicePixelRatio || 1));

    const texcoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.width > 0 ? (clientX - rect.left) / rect.width : 0,
        y: rect.height > 0 ? 1 - (clientY - rect.top) / rect.height : 0,
      };
    };

    const correctDeltaX = (delta: number) => {
      const aspectRatio = canvas.width / canvas.height;
      return aspectRatio < 1 ? delta * aspectRatio : delta;
    };
    const correctDeltaY = (delta: number) => {
      const aspectRatio = canvas.width / canvas.height;
      return aspectRatio > 1 ? delta / aspectRatio : delta;
    };

    const leave = () => {
      if (!inside) return;
      inside = false;
      pointer.moved = false;
    };

    const enter = (tc: { x: number; y: number }) => {
      inside = true;
      pointer.prevTexcoordX = tc.x;
      pointer.prevTexcoordY = tc.y;
      pointer.deltaX = 0;
      pointer.deltaY = 0;
      pointer.moved = false;
      pointer.color = paletteAt(colorPhase);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isInsideHoverZone(e.clientX, e.clientY)) {
        leave();
        return;
      }
      const tc = texcoords(e.clientX, e.clientY);
      pointer.clientX = e.clientX;
      pointer.clientY = e.clientY;
      if (!inside) {
        enter(tc);
        pointer.texcoordX = tc.x;
        pointer.texcoordY = tc.y;
        return;
      }
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.texcoordX = tc.x;
      pointer.texcoordY = tc.y;
      pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
      pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
      pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!isInsideHoverZone(e.clientX, e.clientY)) {
        leave();
        return;
      }
      const tc = texcoords(e.clientX, e.clientY);
      pointer.clientX = e.clientX;
      pointer.clientY = e.clientY;
      pointer.texcoordX = tc.x;
      pointer.texcoordY = tc.y;
      enter(tc);
      clickSplat();
    };

    const onWindowLeave = () => leave();
    const onScroll = () => {
      if (inside && !isInsideHoverZone(pointer.clientX, pointer.clientY)) leave();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerleave", onWindowLeave);
    window.addEventListener("blur", onWindowLeave);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });

    const applyInputs = () => {
      if (!pointer.moved) return;
      pointer.moved = false;
      if (inside) splatPointer();
    };

    const step = (dt: number) => {
      const p = live.current;
      g.disable(g.BLEND);

      curlProgram.bind();
      g.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      g.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
      blit(curlFBO);

      vorticityProgram.bind();
      g.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      g.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
      g.uniform1i(vorticityProgram.uniforms.uCurl, curlFBO.attach(1));
      g.uniform1f(vorticityProgram.uniforms.curl, p.curl);
      g.uniform1f(vorticityProgram.uniforms.dt, dt);
      blit(velocity.write);
      velocity.swap();

      divergenceProgram.bind();
      g.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      g.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
      blit(divergence);

      clearProgram.bind();
      g.uniform1i(clearProgram.uniforms.uTexture, pressureFBO.read.attach(0));
      g.uniform1f(clearProgram.uniforms.value, PRESSURE);
      blit(pressureFBO.write);
      pressureFBO.swap();

      pressureProgram.bind();
      g.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      g.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
      for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
        g.uniform1i(pressureProgram.uniforms.uPressure, pressureFBO.read.attach(1));
        blit(pressureFBO.write);
        pressureFBO.swap();
      }

      gradientSubtractProgram.bind();
      g.uniform2f(gradientSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      g.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressureFBO.read.attach(0));
      g.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
      blit(velocity.write);
      velocity.swap();

      advectionProgram.bind();
      g.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      if (!supportLinearFiltering) {
        g.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
      }
      const velocityId = velocity.read.attach(0);
      g.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
      g.uniform1i(advectionProgram.uniforms.uSource, velocityId);
      g.uniform1f(advectionProgram.uniforms.dt, dt);
      g.uniform1f(advectionProgram.uniforms.dissipation, VELOCITY_DISSIPATION);
      blit(velocity.write);
      velocity.swap();

      if (!supportLinearFiltering) {
        g.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
      }
      g.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
      g.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
      g.uniform1f(advectionProgram.uniforms.dissipation, p.densityDissipation);
      blit(dye.write);
      dye.swap();
    };

    const render = () => {
      g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
      g.enable(g.BLEND);
      displayMaterial.bind();
      if (effectiveShading()) {
        g.uniform2f(
          displayMaterial.uniforms.texelSize,
          1 / g.drawingBufferWidth,
          1 / g.drawingBufferHeight
        );
      }
      g.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
      g.activeTexture(g.TEXTURE0 + MASK_UNIT);
      g.bindTexture(g.TEXTURE_2D, maskTexture);
      g.uniform1i(displayMaterial.uniforms.uMask, MASK_UNIT);
      const base = parseRGBA(live.current.color);
      g.uniform4f(displayMaterial.uniforms.uBase, base[0], base[1], base[2], base[3]);
      blit(null, true);
    };

    let lastUpdateTime = performance.now();
    let lastSimRes = SIM_RESOLUTION;
    let lastDyeRes = effectiveDyeRes();
    let lastShading = effectiveShading();
    let needsResize = true;
    let raf = 0;

    const frame = () => {
      if (g.isContextLost()) {
        raf = 0;
        return;
      }
      const now = performance.now();
      const dt = Math.min((now - lastUpdateTime) / 1000, 0.016666);
      lastUpdateTime = now;

      let rebuild = false;
      if (needsResize) {
        needsResize = false;
        const w = scaleByPixelRatio(canvas.clientWidth);
        const h = scaleByPixelRatio(canvas.clientHeight);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          rebuild = true;
        }
      }
      if (rebuild || SIM_RESOLUTION !== lastSimRes || effectiveDyeRes() !== lastDyeRes) {
        lastSimRes = SIM_RESOLUTION;
        lastDyeRes = effectiveDyeRes();
        initFramebuffers();
      }
      const shadingNow = effectiveShading();
      if (shadingNow !== lastShading) {
        lastShading = shadingNow;
        updateKeywords();
      }

      syncMask(window.devicePixelRatio || 1);

      colorPhase = (colorPhase + dt * COLOR_SPEED) % 1;
      pointer.color = paletteAt(colorPhase);

      applyInputs();
      step(dt);
      render();
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf) return;
      lastUpdateTime = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const ro = new ResizeObserver(() => {
      needsResize = true;
    });
    ro.observe(canvas);

    let onScreen = true;
    const sync = () => {
      if (onScreen && !document.hidden) start();
      else stop();
    };
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true;
        sync();
      },
      { threshold: 0 }
    );
    io.observe(canvas);
    const onVisibility = sync;
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerleave", onWindowLeave);
      window.removeEventListener("blur", onWindowLeave);
      window.removeEventListener("scroll", onScroll, { capture: true } as any);
      destroyDoubleFBO(dye);
      destroyDoubleFBO(velocity);
      destroyDoubleFBO(pressureFBO);
      destroyFBO(divergence);
      destroyFBO(curlFBO);
      g.deleteTexture(maskTexture);
      g.deleteBuffer(quadBuffer);
      g.deleteBuffer(quadIndices);
    };
  }, [glEpoch]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

const __presetProps = {
  "text": "FLUID TEXT",
  "font": {
    "fontFamily": "Inter",
    "variant": "Bold",
    "fontWeight": 700,
    "fontSize": "120px",
    "lineHeight": "1.5em",
    "letterSpacing": "0em",
    "textAlign": "center"
  },
  "color": "#FFFFFF",
  "paletteColors": [
    "#A855F7",
    "#EC4899",
    "#3B82F6",
    "#AFFF00",
    "#00FFF5"
  ],
  "splatRadius": 7,
  "splatForce": 10,
  "curl": 50,
  "densityDissipation": 5
};

export default function FluidText(props: Record<string, unknown>) {
  return <__BaseImpl_FluidText {...(__presetProps as Record<string, unknown>)} {...props} />;
}
