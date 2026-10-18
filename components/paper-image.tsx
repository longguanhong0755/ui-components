"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import * as THREE from "three";

// One DEFAULTS drives both the destructure fallbacks and the control defaults.
// Panel numbers are whole; the shader's fractions are derived in settings().
const DEFAULTS = {
  cardWidth: 340,
  cardHeight: 440,
  mode: "Wave" as "Wave" | "Lift",
  hoverLift: 100,
  restLift: 60,
  depth: 40,
  sheen: 35,
};

interface PaperImageImage {
  src: string;
  alt?: string;
}

interface PaperImageProps {
  image?: PaperImageImage | string;
  style?: CSSProperties;
  cardWidth?: number;
  cardHeight?: number;
  mode?: "Wave" | "Lift";
  hoverLift?: number;
  restLift?: number;
  depth?: number;
  sheen?: number;
}

function clamp(n: any, min: number, max: number, fallback: number) {
  const v = typeof n === "number" ? n : parseFloat(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

// ControlType.ResponsiveImage hands back an object; a plain string still turns up
// on older files and on a pasted URL.
function imageURL(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.src || value.url || value.value || "";
}

// Panel units → shader units. The only place the mapping is written down.
function settings(p: any) {
  return {
    cardWidth: clamp(p?.cardWidth, 40, 800, DEFAULTS.cardWidth),
    cardHeight: clamp(p?.cardHeight, 40, 800, DEFAULTS.cardHeight),
    // 0 is a flat photo, 0.75 is the top of the range — half what the ceiling
    // used to be, so 100% now moves the sheet as far as 50% did. Hover and rest
    // share the scale, so the same percentage on both means the same movement.
    flutter: (clamp(p?.hoverLift, 0, 100, DEFAULTS.hoverLift) / 100) * 0.75,
    idle: (clamp(p?.restLift, 0, 100, DEFAULTS.restLift) / 100) * 0.75,
    // Half a plane-width of displacement at the top of the range.
    depth: (clamp(p?.depth, 0, 100, DEFAULTS.depth) / 100) * 0.5,
    sheen: clamp(p?.sheen, 0, 100, DEFAULTS.sheen) / 100,
    lift: (p?.mode ?? DEFAULTS.mode) === "Lift",
  };
}

/**
 * Paper Image — an image on a sheet of paper that ripples under the pointer and
 * settles into an idle sway when it leaves. Lift mode peels the bottom edge up
 * instead of rippling in place.
 *
 * The canvas is drawn at 1.8× the frame with overflow visible, so the image
 * keeps its true size and the flutter spills past the edge rather than clipping
 * against it. Nothing is drawn behind the sheet — the frame's fill shows through.
 */
function __BaseImpl_PaperImage(props: PaperImageProps) {
  const {
    image,
    style,
    cardWidth = DEFAULTS.cardWidth,
    cardHeight = DEFAULTS.cardHeight,
    mode = DEFAULTS.mode,
    hoverLift = DEFAULTS.hoverLift,
    restLift = DEFAULTS.restLift,
    depth = DEFAULTS.depth,
    sheen = DEFAULTS.sheen,
  } = props;
  const S = settings({ cardWidth, cardHeight, mode, hoverLift, restLift, depth, sheen });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live settings for the render loop, so editing a control never restarts it.
  const liveRef = useRef(S);
  liveRef.current = S;
  // Only whether the pointer is over the sheet is stored, not the wind it
  // implies. The loop reads the live setting every frame, so editing Hover or
  // Rest Lift retargets the wind immediately instead of waiting for the next
  // pointer event to sample it.
  const hoveringRef = useRef(false);
  const mouseXRef = useRef(0.5);

  const imgUrl = imageURL(image);

  useEffect(() => {
    if (!imgUrl) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Reduced motion pins the wind at zero — the sheet stays a flat photo and
    // hover never wakes it.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
    } catch {
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const FOV = 30;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100);

    const uniforms = {
      uTime: { value: 0 },
      uWind: { value: reduced ? 0 : liveRef.current.idle },
      uMouseX: { value: 0.5 },
      uPlaneSize: { value: new THREE.Vector2(0.75, 1) },
      uImageAspect: { value: 0.75 },
      uAmp: { value: liveRef.current.depth },
      uMode: { value: liveRef.current.lift ? 1 : 0 },
      uSheen: { value: liveRef.current.sheen },
      uTex: { value: null as THREE.Texture | null },
      uHasTex: { value: 0 },
    };

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 96, 96),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERT,
        fragmentShader: FRAG,
      }),
    );
    scene.add(mesh);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      imgUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        uniforms.uTex.value = tex;
        uniforms.uHasTex.value = 1;
        const img: any = tex.image;
        if (img?.width) uniforms.uImageAspect.value = img.width / img.height;
      },
      undefined,
      // A failed load leaves uHasTex at 0, so the plain grey sheet stays.
      () => console.warn("PaperImage: image failed to load:", imgUrl),
    );

    const halfTan = Math.tan((FOV * Math.PI) / 180 / 2);
    const OVERSCAN = 1.8;

    function onMove(e: PointerEvent) {
      const r = container!.getBoundingClientRect();
      mouseXRef.current = Math.min(
        1,
        Math.max(0, (e.clientX - r.left) / (r.width || 1)),
      );
      hoveringRef.current = true;
    }
    function onLeave() {
      hoveringRef.current = false;
    }
    if (!reduced) {
      container.addEventListener("pointermove", onMove);
      container.addEventListener("pointerleave", onLeave);
    }

    let w = 0;
    let h = 0;
    const start = performance.now();
    let raf = 0;
    function loop() {
      raf = requestAnimationFrame(loop);
      const L = liveRef.current;
      const cw = container!.clientWidth;
      const ch = container!.clientHeight;
      if (cw > 0 && ch > 0 && (cw !== w || ch !== h)) {
        w = cw;
        h = ch;
        renderer.setSize(w * OVERSCAN, h * OVERSCAN, false);
        camera.aspect = w / h;
        uniforms.uPlaneSize.value.set(w / h, 1);
        camera.updateProjectionMatrix();
      }
      if (w === 0) return;

      uniforms.uTime.value = (performance.now() - start) / 1000;
      uniforms.uAmp.value = L.depth;
      uniforms.uSheen.value = L.sheen;
      uniforms.uMode.value = L.lift ? 1 : 0;
      // Wind and pointer are eased, not set — a jump in either reads as a
      // snap in the cloth. The target is resolved from the live settings
      // each frame, so a panel edit shows up without waiting for hover.
      const wind = reduced ? 0 : hoveringRef.current ? L.flutter : L.idle;
      uniforms.uWind.value += (wind - uniforms.uWind.value) * 0.06;
      uniforms.uMouseX.value +=
        (mouseXRef.current - uniforms.uMouseX.value) * 0.1;

      // The sheet occupies 1/OVERSCAN of the oversized canvas, so its
      // on-screen size is exactly the frame and the rest is spill room.
      camera.position.z = OVERSCAN / (2 * halfTan);
      renderer.render(scene, camera);
    }

    // Offscreen frames cost the same as onscreen ones, so the loop parks
    // until the sheet is actually in view.
    let running = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (running) return;
          running = true;
          loop();
        } else {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.01 },
    );
    io.observe(container);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
      uniforms.uTex.value?.dispose();
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, [imgUrl]);

  return (
    <div
      style={{
        ...(style as CSSProperties),
        position: "relative",
        // The root fills whatever frame it's given and centres the
        // sheet; the panel sizes the sheet itself, below.
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // The flutter needs room outside the frame to spill into.
        overflow: "visible",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: S.cardWidth,
          height: S.cardHeight,
          flex: "0 0 auto",
          overflow: "visible",
        }}
      >
        {!imgUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#E7E7EA",
            }}
          />
        )}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: "-40%",
            left: "-40%",
            width: "180%",
            height: "180%",
            display: "block",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

const VERT = /* glsl */ `
uniform float uTime, uWind, uMouseX, uAmp, uMode;
uniform vec2 uPlaneSize;
varying vec2 vUv; varying vec3 vNormal, vViewPos;

float wave(vec2 uv, float t, float wind) {
    // Pinned at the top edge, loosest at the bottom — how a hung sheet moves.
    float mask = pow(max(0.0, 1.0 - uv.y), 1.1);
    float w = sin(uv.x * 6.0 + t * 3.0) * 0.5
            + sin(uv.x * 11.0 - t * 2.0 + uv.y * 4.0) * 0.25
            + sin((uv.x + uv.y) * 8.0 + t * 4.0) * 0.15;
    // An extra gust follows the pointer's column.
    w += sin(uv.x * 9.0 + t * 5.0) * 0.3 * smoothstep(0.35, 0.0, abs(uv.x - uMouseX));
    return w * mask * wind;
}
float disp(vec2 uv, float t, float wind) {
    float ripple = wave(uv, t, wind);
    if (uMode < 0.5) return uAmp * ripple;
    return uAmp * (ripple * 0.6 + pow(max(0.0, 1.0 - uv.y), 2.0) * wind * 3.0);
}
void main() {
    vUv = uv;
    // Normals come from sampling the displacement either side of the vertex, so
    // the lighting tracks the cloth without a normal map.
    float z = disp(uv, uTime, uWind), e = 0.002;
    float dzdx = (disp(uv + vec2(e,0), uTime, uWind) - disp(uv - vec2(e,0), uTime, uWind)) / (2.0*e) / uPlaneSize.x;
    float dzdy = (disp(uv + vec2(0,e), uTime, uWind) - disp(uv - vec2(0,e), uTime, uWind)) / (2.0*e) / uPlaneSize.y;
    vNormal = normalMatrix * normalize(vec3(-dzdx, -dzdy, 1.0));
    float yLift = uMode < 0.5 ? 0.0 : uAmp * pow(max(0.0, 1.0 - uv.y), 2.0) * uWind * 1.2;
    vec4 mv = modelViewMatrix * vec4(position.x * uPlaneSize.x, position.y + yLift, z, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex; uniform float uHasTex, uSheen, uImageAspect; uniform vec2 uPlaneSize;
varying vec2 vUv; varying vec3 vNormal, vViewPos;
void main() {
    // Cover fit: fill the frame, keep the ratio, crop the overflow.
    float ar = uPlaneSize.x; vec2 st = vUv;
    if (ar > uImageAspect) st.y = (vUv.y - 0.5) * (uImageAspect / ar) + 0.5;
    else st.x = (vUv.x - 0.5) * (ar / uImageAspect) + 0.5;
    vec3 base = uHasTex > 0.5 ? texture2D(uTex, st).rgb : vec3(0.85);
    vec3 N = gl_FrontFacing ? normalize(vNormal) : -normalize(vNormal);
    vec3 L = normalize(vec3(0.35, 0.55, 0.75)), V = normalize(-vViewPos);
    float diff = clamp(dot(N, L), 0.0, 1.0);
    float spec = pow(clamp(dot(N, normalize(L + V)), 0.0, 1.0), 26.0);
    // Shade and highlight are both normalised against a flat sheet, so anywhere
    // the paper is still comes out as the untouched photo.
    float shade = (0.68 + diff * 0.45) / (0.68 + L.z * 0.45);
    float flatSpec = pow(clamp(normalize(L + V).z, 0.0, 1.0), 26.0);
    gl_FragColor = vec4(base * shade + max(spec - flatSpec, 0.0) * uSheen, 1.0);
    #include <colorspace_fragment>
}
`;

PaperImage.displayName = "Paper Image";

const __presetProps = {
  "image": {
    "src": "https://plus.unsplash.com/premium_photo-1762486523117-a4fbce37f546?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDYzfHx8ZW58MHx8fHx8"
  },
  "cardWidth": 340,
  "cardHeight": 440,
  "mode": "Wave",
  "restLift": 60,
  "hoverLift": 100,
  "depth": 40,
  "sheen": 35
};

export default function PaperImage(props: Record<string, unknown>) {
  return <__BaseImpl_PaperImage {...(__presetProps as Record<string, unknown>)} {...props} />;
}
