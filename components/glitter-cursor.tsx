"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const VERTEX_SHADER = `
precision highp float;
precision highp int;

attribute vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec4 mouse;
attribute float random;

uniform vec2 resolution;
uniform float pixelRatio;
uniform float timestamp;

uniform float size;
uniform float minSize;
uniform float speed;
uniform float spread;
uniform float maxSpread;
uniform float maxZ;
uniform float maxDiff;
uniform float diffPow;

varying float vProgress;
varying float vRandom;
varying float vDiff;
varying float vSpreadLength;
varying float vPositionZ;

float cubicOut(float t) {
  float f = t - 1.0;
  return f * f * f + 1.0;
}

const float PI = 3.1415926;
const float PI2 = PI * 2.;

void main () {
  float progress = clamp((timestamp - mouse.z) * speed, 0., 1.);
  progress *= step(0., mouse.x);

  float startX = mouse.x - resolution.x / 2.;
  float startY = mouse.y - resolution.y / 2.;
  vec3 startPosition = vec3(startX, startY, random);

  float diff = clamp(mouse.w / maxDiff, 0., 1.);
  diff = pow(diff, diffPow);

  vec3 cPosition = position * 2. - 1.;

  float radian = cPosition.x * PI2 - PI;
  vec2 xySpread = vec2(cos(radian), sin(radian)) * spread * mix(1., maxSpread, diff) * cPosition.y;

  vec3 endPosition = startPosition;
  endPosition.xy += xySpread;
  endPosition.z += cPosition.z * maxZ * (pixelRatio > 1. ? 1.2 : 1.);

  float positionProgress = cubicOut(progress * random);
  vec3 currentPosition = mix(startPosition, endPosition, positionProgress);

  vProgress = progress;
  vRandom = random;
  vDiff = diff;
  vSpreadLength = cPosition.y;
  vPositionZ = position.z;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(currentPosition, 1.);
  gl_PointSize = max(currentPosition.z * size * diff * pixelRatio, minSize * (pixelRatio > 1. ? 1.3 : 1.));
}
`;

const FRAGMENT_SHADER = `
precision highp float;
precision highp int;

uniform float fadeSpeed;
uniform float shortRangeFadeSpeed;
uniform float minFlashingSpeed;
uniform float twinkle;
uniform float blur;
uniform vec3 starColor;

varying float vProgress;
varying float vRandom;
varying float vDiff;
varying float vSpreadLength;
varying float vPositionZ;

highp float random(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

float quadraticIn(float t) {
  return t * t;
}

#ifndef HALF_PI
#define HALF_PI 1.5707963267948966
#endif

float sineOut(float t) {
  return sin(t * HALF_PI);
}

void main(){
    vec2 p = gl_PointCoord * 2. - 1.;
    float len = length(p);

  float flicker = random(vec2(vProgress * mix(minFlashingSpeed, 1., vRandom)));
  flicker = mix(0.3, 2., flicker);
  float cRandom = mix(1., flicker, twinkle);

  float cBlur = blur * mix(1., 0.3, vPositionZ);
    float shape = smoothstep(1. - cBlur, 1. + cBlur, (1. - cBlur) / len);
  shape *= mix(0.5, 1., vRandom);

  if (shape == 0.) discard;

  float darkness = mix(0.1, 1., vPositionZ);

  float alphaProgress = vProgress * fadeSpeed * mix(2.5, 1., pow(vDiff, 0.6));
  alphaProgress *= mix(shortRangeFadeSpeed, 1., sineOut(vSpreadLength) * quadraticIn(vDiff));
  float alpha = 1. - min(alphaProgress, 1.);
  alpha *= cRandom * vDiff;

    gl_FragColor = vec4(starColor * darkness * cRandom, shape * alpha);
}
`;

type StarCursorProps = {
  label?: boolean;
  labelText?: string;
  labelColor?: string;
  labelFont?: React.CSSProperties;
  starColor?: string;
  density?: number;
  particleSize?: number;
  flashingSpeed?: number;
  spreadRadius?: number;
  style?: React.CSSProperties;
};

const DEFAULT_LABEL_FONT: React.CSSProperties = {
  fontSize: "48px",
  fontWeight: 600,
};

const DEFAULTS = {
  label: true,
  labelText: "HOVER AROUND",
  labelColor: "#FFFFFF",
  starColor: "#AA8558",
  density: 20,
  particleSize: 40,
  flashingSpeed: 100,
  spreadRadius: 35,
};

const MIN_SIZE = 5 / 10;
const BLUR = 10 / 10;
const SPEED = 2 / 2000;
const FADE_SPEED = 14 / 10;
const SHORT_RANGE_FADE = 10 / 10;
const FLASHING_RATE = 10 / 100;
const MAX_SPREAD = 10 / 5;
const DEPTH = 100;
const MOTION_SENSITIVITY = 250;
const MOTION_CURVE = 24 / 100;
const HIDE_ON_MOBILE = true;

const RING_FRAMES = 400;
const MOBILE_QUERY = "(max-width: 768px)";

type RGB = { r: number; g: number; b: number };

function parseColor(input: string): RGB {
  const fallback: RGB = { r: 170 / 255, g: 133 / 255, b: 88 / 255 };
  if (typeof input !== "string" || !input) return fallback;
  const s = input.trim();

  const rgb = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgb) {
    return {
      r: parseFloat(rgb[1]) / 255,
      g: parseFloat(rgb[2]) / 255,
      b: parseFloat(rgb[3]) / 255,
    };
  }

  if (s.startsWith("#")) {
    let hex = s.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .slice(0, 3)
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const n = parseInt(hex.slice(0, 6), 16);
    if (Number.isFinite(n)) {
      return {
        r: ((n >> 16) & 255) / 255,
        g: ((n >> 8) & 255) / 255,
        b: (n & 255) / 255,
      };
    }
  }
  return fallback;
}

function __BaseImpl_StarCursor(props: StarCursorProps) {
  const {
    starColor = DEFAULTS.starColor,
    density = DEFAULTS.density,
    particleSize = DEFAULTS.particleSize,
    flashingSpeed = DEFAULTS.flashingSpeed,
    spreadRadius = DEFAULTS.spreadRadius,
    label = DEFAULTS.label,
    labelText = DEFAULTS.labelText,
    labelColor = DEFAULTS.labelColor,
    style,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const perFrame = Math.max(1, density) * 4;

  const live = useRef({
    starColor,
    particleSize,
    flashingSpeed,
    spreadRadius,
  });
  live.current = {
    starColor,
    particleSize,
    flashingSpeed,
    spreadRadius,
  };
  const labelFont = { ...DEFAULT_LABEL_FONT, ...props.labelFont };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mobile = window.matchMedia(MOBILE_QUERY);
    let disabled = HIDE_ON_MOBILE && mobile.matches;

    let width = Math.max(1, canvas.clientWidth);
    let height = Math.max(1, canvas.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      Math.atan(height / 2 / 5000) * (180 / Math.PI) * 2,
      width / height,
      0.1,
      10000
    );
    camera.position.z = 5000;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0, 0);
    renderer.setSize(width, height, false);

    const count = perFrame * RING_FRAMES;
    const positions = new Float32Array(count * 3);
    const mouseData = new Float32Array(count * 4);
    const randoms = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = Math.random();
      positions[i * 3 + 1] = Math.random();
      positions[i * 3 + 2] = Math.random();
      mouseData[i * 4] = -1;
      mouseData[i * 4 + 1] = -1;
      randoms[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mouseAttr = new THREE.BufferAttribute(mouseData, 4);
    mouseAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("mouse", mouseAttr);
    geometry.setAttribute("random", new THREE.BufferAttribute(randoms, 1));

    const c = parseColor(live.current.starColor);
    const uniforms = {
      resolution: { value: new THREE.Vector2(width, height) },
      pixelRatio: { value: pixelRatio },
      timestamp: { value: 0 },
      starColor: { value: new THREE.Vector3(c.r, c.g, c.b) },
      size: { value: 0 },
      minSize: { value: 0 },
      speed: { value: 0 },
      fadeSpeed: { value: 0 },
      shortRangeFadeSpeed: { value: 0 },
      minFlashingSpeed: { value: 0 },
      twinkle: { value: 0 },
      spread: { value: 0 },
      maxSpread: { value: 0 },
      maxZ: { value: 0 },
      blur: { value: 0 },
      maxDiff: { value: 0 },
      diffPow: { value: 0 },
    };

    const material = new THREE.RawShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Points(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    let writeIndex = 0;
    let targetX = -1;
    let targetY = -1;
    let prevX: number | null = null;
    let prevY: number | null = null;
    let moved = false;

    const previousCursor = document.documentElement.style.cursor;
    let cursorHidden = false;
    const hideNativeCursor = (hide: boolean) => {
      if (hide === cursorHidden) return;
      cursorHidden = hide;
      document.documentElement.style.cursor = hide ? "none" : previousCursor;
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const over =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      hideNativeCursor(over);
      if (!over) {
        prevX = null;
        prevY = null;
        return;
      }
      const sx = rect.width > 0 ? width / rect.width : 1;
      const sy = rect.height > 0 ? height / rect.height : 1;
      targetX = (e.clientX - rect.left) * sx;
      targetY = height - (e.clientY - rect.top) * sy;
      moved = true;
      canvas.style.opacity = "1";
    };
    const onWindowLeave = () => hideNativeCursor(false);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onWindowLeave);

    const emit = (now: number) => {
      const startX = prevX ?? targetX;
      const startY = prevY ?? targetY;
      const dx = targetX - startX;
      const dy = targetY - startY;

      if (writeIndex + perFrame > count) writeIndex = 0;
      const base = writeIndex;

      for (let i = 0; i < perFrame; i++) {
        const t = i / perFrame;
        const ci = (base + i) * 4;
        mouseData[ci] = startX + dx * t;
        mouseData[ci + 1] = startY + dy * t;
        mouseData[ci + 2] = now;
        mouseData[ci + 3] = Math.hypot(dx, dy);
      }

      const attr = mouseAttr as any;
      if (typeof attr.clearUpdateRanges === "function") {
        attr.clearUpdateRanges();
        attr.addUpdateRange(base * 4, perFrame * 4);
      } else if (attr.updateRange) {
        attr.updateRange.offset = base * 4;
        attr.updateRange.count = perFrame * 4;
      }
      mouseAttr.needsUpdate = true;

      writeIndex += perFrame;
      prevX = targetX;
      prevY = targetY;
    };

    const resize = () => {
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      camera.aspect = width / height;
      camera.fov = Math.atan(height / 2 / 5000) * (180 / Math.PI) * 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      uniforms.resolution.value.set(width, height);
    };
    window.addEventListener("resize", resize);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(canvas);
    }

    const onMobileChange = (e: MediaQueryListEvent) => {
      disabled = HIDE_ON_MOBILE && e.matches;
    };
    mobile.addEventListener("change", onMobileChange);

    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (disabled) return;
      const p = live.current;

      if (moved) {
        moved = false;
        emit(now);
      }

      const col = parseColor(p.starColor);
      uniforms.starColor.value.set(col.r, col.g, col.b);
      uniforms.timestamp.value = now;
      uniforms.size.value = p.particleSize / 100;
      uniforms.minSize.value = MIN_SIZE;
      uniforms.speed.value = SPEED;
      uniforms.fadeSpeed.value = FADE_SPEED;
      uniforms.shortRangeFadeSpeed.value = SHORT_RANGE_FADE;
      uniforms.minFlashingSpeed.value = FLASHING_RATE;
      uniforms.twinkle.value = Math.max(0, Math.min(100, p.flashingSpeed)) / 100;
      uniforms.blur.value = BLUR;
      uniforms.spread.value = p.spreadRadius;
      uniforms.maxSpread.value = MAX_SPREAD;
      uniforms.maxZ.value = DEPTH;
      uniforms.maxDiff.value = MOTION_SENSITIVITY;
      uniforms.diffPow.value = MOTION_CURVE;

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      hideNativeCursor(false);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onWindowLeave);
      window.removeEventListener("resize", resize);
      ro?.disconnect();
      mobile.removeEventListener("change", onMobileChange);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [perFrame]);

  const labelNode = label ? (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        whiteSpace: "pre",
        pointerEvents: "none",
        userSelect: "none",
        ...labelFont,
        color: labelColor,
      }}
    >
      {labelText}
    </div>
  ) : null;

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
      {labelNode}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

const __presetProps = {
  "starColor": "#AA8558",
  "density": 20,
  "particleSize": 40,
  "spreadRadius": 35,
  "flashingSpeed": 100,
  "label": true,
  "labelText": "Hover Around",
  "labelColor": "#FFFFFF",
  "labelFont": {
    "fontFamily": "Inter",
    "variant": "SemiBold",
    "fontWeight": 400,
    "fontSize": "48px",
    "lineHeight": "1.5em",
    "letterSpacing": "0em",
    "textAlign": "left"
  }
};

export default function StarCursor(props: Record<string, unknown>) {
  return <__BaseImpl_StarCursor {...(__presetProps as Record<string, unknown>)} {...props} />;
}
