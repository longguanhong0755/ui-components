/* ReactBits Pro public preview module 56864 for photon-knot.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/56864.91e9db2fbf318d4b.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  56864: (e, t, o) => {
    (o.r(t), o.d(t, { default: () => I }));
    var a = o(95155),
      n = o(12115),
      r = o(56388),
      l = o(86049),
      i = o(90761),
      s = o(2253),
      u = o(12246),
      c = o(90650);
    let d = {
        trefoil: [2, 3],
        cinquefoil: [2, 5],
        septafoil: [2, 7],
        star: [3, 5],
        tangle: [3, 4],
        halo: [1, 0],
      },
      h = Object.keys(d),
      f = (e, t, o) => Math.min(o, Math.max(t, e)),
      v = (e, t) => (Number.isFinite(e) ? e : t),
      p = new s.Q1f(),
      m = (e) => {
        let t = e.trim().toLowerCase();
        if (!t || "transparent" === t || "none" === t || "auto" === t)
          return null;
        try {
          p.setStyle(t, s.jf0);
        } catch {
          return null;
        }
        return [p.r, p.g, p.b];
      },
      g = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      b = ([e, t, o]) => {
        let a = g(e),
          n = g(t),
          r = g(o),
          l = Math.cbrt(0.4122214708 * a + 0.5363325363 * n + 0.0514459929 * r),
          i = Math.cbrt(0.2119034982 * a + 0.6806995451 * n + 0.1073969566 * r),
          s = Math.cbrt(0.0883024619 * a + 0.2817188376 * n + 0.6299787005 * r);
        return [
          0.2104542553 * l + 0.793617785 * i - 0.0040720468 * s,
          1.9779984951 * l - 2.428592205 * i + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * i - 0.808675766 * s,
        ];
      },
      x = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      w = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      y = `
precision highp float;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uP;
uniform float uQ;
uniform float uLoop;
uniform float uWidth;
uniform float uTwists;
uniform float uPhase;
uniform float uTime;
uniform float uMotion;
uniform float uReveal;
uniform vec4 uWaves[6];
in vec3 position;
out vec3 vNormal;
out vec3 vTangent;
out vec3 vWorld;
out vec2 vUv;
out float vDepth;
out float vShown;

const float TAU = 6.28318530718;
const float PI = 3.14159265359;

vec3 knot(float t) {
  float rho = 1.0 + uLoop * cos(uQ * t);
  return vec3(rho * cos(uP * t), rho * sin(uP * t), uLoop * sin(uQ * t));
}

vec3 knotTangent(float t) {
  float cq = cos(uQ * t);
  float sq = sin(uQ * t);
  float cp = cos(uP * t);
  float sp = sin(uP * t);
  float rho = 1.0 + uLoop * cq;
  float drho = -uLoop * uQ * sq;
  return vec3(drho * cp - rho * uP * sp, drho * sp + rho * uP * cp, uLoop * uQ * cq);
}

float twistAt(float u) {
  float angle = PI * uTwists * u + uPhase + 0.5 * uMotion * sin(u * TAU * 2.0 + uTime * 0.15);
  for (int i = 0; i < 6; i++) {
    vec4 wave = uWaves[i];
    if (wave.z <= 0.0) continue;
    float travel = wave.y * 0.09;
    float ahead = fract(u - wave.x - travel + 0.5) - 0.5;
    float behind = fract(u - wave.x + travel + 0.5) - 0.5;
    float envelope = wave.z * smoothstep(0.0, 0.35, wave.y) * exp(-wave.y / 2.4);
    angle += PI * envelope * (exp(-ahead * ahead / 0.004) + exp(-behind * behind / 0.004));
  }
  return angle;
}

void main() {
  float u = position.x;
  float v = position.y;
  float t = u * TAU;
  vec3 center = knot(t);
  vec3 tangent = normalize(knotTangent(t));
  vec3 ring = vec3(cos(uP * t) * cos(uQ * t), sin(uP * t) * cos(uQ * t), sin(uQ * t));
  ring = normalize(ring - dot(ring, tangent) * tangent);
  vec3 side = cross(tangent, ring);
  float angle = twistAt(u);
  vec3 across = cos(angle) * ring + sin(angle) * side;
  float closing = smoothstep(0.88, 1.0, uReveal);
  float head = mix(smoothstep(uReveal, uReveal - 0.06, u), 1.0, closing);
  float tail = mix(smoothstep(0.0, 0.06, u), 1.0, closing);
  float drawn = uReveal >= 0.9999 ? 1.0 : head * tail;
  float breath = 1.0 - 0.2 * uMotion + 0.2 * uMotion * sin(u * TAU * 3.0 + uTime * 0.13);
  vec3 point = center + across * v * uWidth * breath * drawn;
  vec4 world = modelMatrix * vec4(point, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * cross(tangent, across));
  vTangent = normalize(mat3(modelMatrix) * tangent);
  vUv = vec2(u, v);
  vShown = uReveal >= 0.9999 ? 1.0 : step(u, uReveal + 0.08 * closing);
  vec4 view = modelViewMatrix * vec4(point, 1.0);
  vDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`,
      k = `
precision highp float;
uniform vec3 cameraPosition;
uniform vec3 uLabA;
uniform vec3 uLabMid;
uniform vec3 uLabB;
uniform vec3 uLightDir;
uniform float uGlow;
uniform float uEdge;
uniform float uFold;
uniform float uSheen;
uniform float uThreads;
uniform float uDepth;
uniform float uFocus;
uniform float uFlow;
in vec3 vNormal;
in vec3 vTangent;
in vec3 vWorld;
in vec2 vUv;
in float vDepth;
in float vShown;
out vec4 fragColor;

const float TAU = 6.28318530718;

vec3 fromLab(vec3 lab) {
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  lms = lms * lms * lms;
  return max(mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * lms, 0.0);
}

void main() {
  if (vShown < 0.5) discard;
  vec3 view = normalize(cameraPosition - vWorld);
  vec3 normal = normalize(vNormal);
  float facing = abs(dot(normal, view));
  float offset = vDepth - uFocus;
  float blur = clamp(abs(offset) * 0.35, 0.0, 1.0);
  float back = smoothstep(-0.4, 0.9, offset);
  float thick = min(1.0 / max(facing, 0.012), mix(uFold, 3.0, blur));
  float across = abs(vUv.y);
  float pixel = fwidth(vUv.y);
  float edgeWidth = max(mix(1.4 * pixel, 0.22, blur), 0.0001);
  float rim = exp(-pow((1.0 - across) / edgeWidth, 2.0)) * min(1.0, 2.0 * pixel / edgeWidth + 0.15);
  float body = 1.0 - smoothstep(1.0 - max(edgeWidth * 2.0, 0.03), 1.0, across);
  float along = 0.5 + 0.5 * cos(vUv.x * TAU * 2.0 + uFlow);
  vec3 lab = along < 0.5 ? mix(uLabA, uLabMid, along * 2.0) : mix(uLabMid, uLabB, along * 2.0 - 1.0);
  vec3 tint = fromLab(lab);
  float weave = uThreads * (1.0 - blur) * (1.0 - smoothstep(0.02, 0.05, pixel));
  float threads = mix(1.0, 0.65 + 0.35 * pow(0.5 + 0.5 * cos(vUv.y * 64.0), 4.0), weave);
  vec3 halfway = normalize(uLightDir + view);
  float slope = dot(normalize(vTangent), halfway);
  float sheen = pow(max(1.0 - slope * slope, 0.0), 320.0) * uSheen * body * (0.4 + 0.6 * across);
  vec3 bright = fromLab(vec3(max(lab.x, 0.86), lab.yz * 0.75));
  float layer = body * threads * (0.22 + 0.78 * across * across);
  vec3 color = tint * (layer * thick * uGlow + rim * uEdge * min(thick, 3.0)) + bright * sheen;
  color *= 1.0 - back * uDepth;
  fragColor = vec4(color, 1.0);
}
`,
      M = `
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      C = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
in vec2 vUv;
out vec4 fragColor;
vec3 tap(vec2 d) { return texture(uSource, vUv + d * uTexel).rgb; }
void main() {
  vec3 a = tap(vec2(-2.0, 2.0));
  vec3 b = tap(vec2(0.0, 2.0));
  vec3 c = tap(vec2(2.0, 2.0));
  vec3 d = tap(vec2(-2.0, 0.0));
  vec3 e = tap(vec2(0.0, 0.0));
  vec3 f = tap(vec2(2.0, 0.0));
  vec3 g = tap(vec2(-2.0, -2.0));
  vec3 h = tap(vec2(0.0, -2.0));
  vec3 i = tap(vec2(2.0, -2.0));
  vec3 j = tap(vec2(-1.0, 1.0));
  vec3 k = tap(vec2(1.0, 1.0));
  vec3 l = tap(vec2(-1.0, -1.0));
  vec3 m = tap(vec2(1.0, -1.0));
  vec3 color = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  if (uThreshold > 0.0) {
    float peak = max(color.r, max(color.g, color.b));
    float knee = 0.6;
    float soft = clamp(peak - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 0.00001);
    color *= max(soft, peak - uThreshold) / max(peak, 0.00001);
  }
  fragColor = vec4(color, 1.0);
}
`,
      S = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;
vec3 tap(vec2 d) { return texture(uSource, vUv + d * uTexel).rgb; }
void main() {
  vec3 color = tap(vec2(0.0)) * 4.0
    + (tap(vec2(-1.0, 0.0)) + tap(vec2(1.0, 0.0)) + tap(vec2(0.0, -1.0)) + tap(vec2(0.0, 1.0))) * 2.0
    + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0));
  fragColor = vec4(color / 16.0, 1.0);
}
`,
      T = `
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform float uBloomStrength;
uniform float uGrain;
uniform float uTime;
uniform float uInk;
in vec2 vUv;
out vec4 fragColor;

vec3 neutral(vec3 color) {
  const float start = 0.76;
  const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < start) return color;
  const float d = 1.0 - start;
  float next = 1.0 - d * d / (peak + d - start);
  color *= next / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - next) + 1.0);
  return mix(color, vec3(next), g);
}

vec3 encode(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec3 emission = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uBloomStrength;
  float n = hash(gl_FragCoord.xy + fract(uTime * 13.0) * 911.0) - 0.5;
  float dither = (hash(gl_FragCoord.xy * 1.7 + 0.5) - 0.5) / 255.0;
  if (uInk > 0.5) {
    float peak = max(emission.r, max(emission.g, emission.b));
    vec3 hue = emission / max(peak, 0.0001);
    float cover = 1.0 - exp(-peak * 1.6);
    vec3 color = mix(uBackground, encode(hue * 0.62), cover);
    color += (n * uGrain * 0.06 + dither) * smoothstep(0.0, 0.05, cover);
    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    return;
  }
  vec3 light = encode(neutral(max(emission, 0.0)));
  vec3 color = 1.0 - (1.0 - uBackground) * (1.0 - light);
  float mask = smoothstep(0.0, 0.04, max(light.r, max(light.g, light.b)));
  color += (n * uGrain * 0.1 + dither) * mask;
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`,
      j = (0, n.forwardRef)(function (
        {
          colors: e = ["#5227FF", "#FF9FFC"],
          backgroundColor: t = "transparent",
          shape: o = "trefoil",
          size: r = 0.72,
          offsetX: l = 0,
          offsetY: i = 0,
          ribbonWidth: p = 0.34,
          loop: g = 0.42,
          twists: j = 4,
          flowSpeed: F = 0.5,
          rotationSpeed: L = 0.5,
          tilt: P = 32,
          glow: W = 1,
          edges: E = 1,
          folds: I = 1,
          sheen: z = 1,
          threads: R = 0,
          depth: U = 0.6,
          parallax: q = 0.5,
          interactive: B = !0,
          draggable: D = !0,
          flip: A = 1,
          bloom: Y = 0.6,
          grain: X = 0.25,
          intro: N = !0,
          paused: H = !1,
          dpr: Q = 2,
          children: G,
          className: _,
          style: O,
        },
        V,
      ) {
        let $ = (0, n.useRef)(null),
          Z = (0, n.useRef)(null),
          K = (0, n.useRef)(null),
          J = {
            colors: e,
            backgroundColor: t,
            shape: o,
            size: r,
            offsetX: l,
            offsetY: i,
            ribbonWidth: p,
            loop: g,
            twists: j,
            flowSpeed: F,
            rotationSpeed: L,
            tilt: P,
            glow: W,
            edges: E,
            folds: I,
            sheen: z,
            threads: R,
            depth: U,
            parallax: q,
            interactive: B,
            draggable: D,
            flip: A,
            bloom: Y,
            grain: X,
            intro: N,
            paused: H,
            dpr: Q,
            reduced: (0, n.useSyncExternalStore)(x, w, () => !1),
          },
          ee = (0, n.useRef)(J);
        ((0, n.useEffect)(() => {
          ((ee.current = J), K.current?.sync());
        }),
          (0, n.useEffect)(() => {
            let e = $.current,
              t = Z.current;
            if (!e || !t) return;
            let o = (function (e, t, o) {
              let a,
                n = e.ownerDocument,
                r = n.defaultView ?? window,
                l = n.createElement("canvas");
              (l.setAttribute("aria-hidden", "true"),
                (l.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block"));
              try {
                a = new u.WebGLRenderer({
                  canvas: l,
                  alpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (t.appendChild(l), (a.autoClear = !1));
              let i =
                  a.extensions.has("EXT_color_buffer_float") ||
                  a.extensions.has("EXT_color_buffer_half_float")
                    ? s.ix0
                    : s.OUM,
                c = new s.qUd(-1, 1, 1, -1, -1, 1),
                p = new s.LoY();
              p.setAttribute(
                "position",
                new s.qtW([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
              );
              let g = new s.Z58(),
                x = new s.eaF(p);
              ((x.frustumCulled = !1), g.add(x));
              let w = Array.from({ length: 6 }, () => new s.IUQ(0, 0, 0, 0)),
                j = {
                  uP: { value: 2 },
                  uQ: { value: 3 },
                  uLoop: { value: 0.42 },
                  uWidth: { value: 0.34 },
                  uTwists: { value: 4 },
                  uPhase: { value: 0 },
                  uTime: { value: 0 },
                  uMotion: { value: 1 },
                  uReveal: { value: 1 },
                  uWaves: { value: w },
                  uLabA: { value: new s.Pq0() },
                  uLabMid: { value: new s.Pq0() },
                  uLabB: { value: new s.Pq0() },
                  uLightDir: { value: new s.Pq0(-0.5, 0.7, 0.9).normalize() },
                  uGlow: { value: 0.07 },
                  uEdge: { value: 1.1 },
                  uFold: { value: 14 },
                  uSheen: { value: 0.15 },
                  uThreads: { value: 0 },
                  uDepth: { value: 0.6 },
                  uFocus: { value: 6 },
                  uFlow: { value: 0 },
                },
                F = new s.D$Q({
                  glslVersion: s.Wdf,
                  vertexShader: y,
                  fragmentShader: k,
                  uniforms: j,
                  blending: s.bCz,
                  blendEquation: s.gO9,
                  blendSrc: s.qad,
                  blendDst: s.qad,
                  transparent: !0,
                  depthTest: !1,
                  depthWrite: !1,
                  side: s.$EB,
                }),
                L = new s.LoY(),
                P = new s.eaF(L, F);
              P.frustumCulled = !1;
              let W = new s.Z58();
              W.add(P);
              let E = new s.ubm(30, 1, 0.05, 100),
                I = (e) =>
                  new s.nWS(1, 1, {
                    type: i,
                    format: s.GWd,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    minFilter: s.k6q,
                    magFilter: s.k6q,
                    generateMipmaps: !1,
                    samples: e,
                  }),
                z = I(4),
                R = Array.from({ length: 6 }, () => I(0)),
                U = new s.Pq0(0.04, 0.04, 0.04),
                q = (e, t, o = !1) =>
                  new s.D$Q({
                    glslVersion: s.Wdf,
                    vertexShader: M,
                    fragmentShader: e,
                    uniforms: t,
                    blending: o ? s.EZo : s.XIg,
                    transparent: o,
                    depthTest: !1,
                    depthWrite: !1,
                  }),
                B = q(C, {
                  uSource: { value: null },
                  uTexel: { value: new s.I9Y() },
                  uThreshold: { value: 0 },
                }),
                D = q(
                  S,
                  { uSource: { value: null }, uTexel: { value: new s.I9Y() } },
                  !0,
                ),
                A = q(T, {
                  uScene: { value: z.texture },
                  uBloom: { value: R[0].texture },
                  uBackground: { value: U },
                  uBloomStrength: { value: 0.1 },
                  uGrain: { value: 0.25 },
                  uTime: { value: 0 },
                  uInk: { value: 0 },
                }),
                Y = 0,
                X = 0,
                N = 1,
                H = 1,
                Q = 0,
                G = 0,
                _ = 1e3 / 60,
                O = !1,
                V = "",
                $ = "",
                Z = !1,
                K = -10,
                J = 0,
                ee = 0,
                et = 0,
                eo = 0.4,
                ea = 0,
                en = 0,
                er = 0,
                el = 0,
                ei = 0,
                es = 0,
                eu = 0,
                ec = 0,
                ed = -0.5,
                eh = 0.7,
                ef = null,
                ev = 0.7,
                ep = -1,
                em = 1,
                eg = 0,
                eb = 0,
                ex = !1,
                ew = !1,
                ey = !1,
                ek = null,
                eM = [],
                eC = new s.Pq0(),
                eS = () => {
                  let t = o.current,
                    a =
                      m(t.backgroundColor) ??
                      (() => {
                        let t = e.parentElement;
                        for (; t;) {
                          let e = r
                            .getComputedStyle(t)
                            .backgroundColor.match(/rgba?\(([^)]+)\)/);
                          if (e) {
                            let t = e[1]
                              .split(",")
                              .map((e) => Number.parseFloat(e));
                            if (t.length < 4 || t[3] > 0.05)
                              return [t[0] / 255, t[1] / 255, t[2] / 255];
                          }
                          t = t.parentElement;
                        }
                        let o = r
                          .getComputedStyle(e)
                          .color.match(/rgba?\(([^)]+)\)/);
                        if (o) {
                          let e = o[1]
                            .split(",")
                            .map((e) => Number.parseFloat(e));
                          return e[0] + e[1] + e[2] > 382
                            ? [0.04, 0.04, 0.04]
                            : [1, 1, 1];
                        }
                        return [0.04, 0.04, 0.04];
                      })(),
                    n = [a.join(","), t.colors[0], t.colors[1]].join("|");
                  if (n === $) return;
                  (($ = n),
                    (Z = 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2] > 0.55),
                    U.set(a[0], a[1], a[2]));
                  let l = b(m(t.colors[0]) ?? [0.32, 0.15, 1]),
                    i = b(m(t.colors[1]) ?? [1, 0.62, 0.99]);
                  (j.uLabA.value.set(l[0], l[1], l[2]),
                    j.uLabB.value.set(i[0], i[1], i[2]),
                    j.uLabMid.value.set(
                      (l[0] + i[0]) / 2,
                      (l[1] + i[1]) / 2,
                      (l[2] + i[2]) / 2,
                    ),
                    (A.uniforms.uInk.value = +!!Z));
                },
                eT = () => {
                  let e = o.current;
                  return d[h.includes(e.shape) ? e.shape : "trefoil"];
                },
                ej = () => {
                  let e = Math.max(1, Math.round(Y * N * H)),
                    t = Math.max(1, Math.round(X * N * H));
                  z.setSize(e, t);
                  let o = e,
                    a = t;
                  for (let e of R)
                    ((o = Math.max(1, Math.round(o / 2))),
                      (a = Math.max(1, Math.round(a / 2))),
                      e.setSize(o, a));
                },
                eF = () => {
                  let t = o.current,
                    n = Math.round(e.clientWidth),
                    l = Math.round(e.clientHeight);
                  if (n < 2 || l < 2) return ((O = !1), !1);
                  let i = Math.min(
                    r.devicePixelRatio || 1,
                    f(v(t.dpr, 2), 0.5, 3),
                  );
                  return (
                    (!O || n !== Y || l !== X || i !== N) &&
                    ((O = !0),
                    (Y = n),
                    (X = l),
                    (N = i),
                    a.setPixelRatio(N),
                    a.setSize(Y, X, !1),
                    ej(),
                    !0)
                  );
                },
                eL = () => {
                  let e = o.current,
                    t = f(v(e.loop, 0.42), 0, 0.7),
                    a = f(v(e.ribbonWidth, 0.34), 0.02, 0.8),
                    n = 1 + t + a,
                    r = Y / Math.max(X, 1),
                    l = Math.tan((30 * Math.PI) / 360),
                    i = n / (f(v(e.size, 0.72), 0.2, 3) * Math.min(1, r) * l);
                  ((E.aspect = r),
                    E.position.set(0, 0, i),
                    (E.near = Math.max(0.05, i - 3 * n)),
                    (E.far = i + 3 * n),
                    E.updateProjectionMatrix(),
                    P.position.set(
                      2 * f(v(e.offsetX, 0), -1, 1) * i * l * r,
                      -(2 * f(v(e.offsetY, 0), -1, 1)) * i * l,
                      0,
                    ));
                  let s = (f(v(e.tilt, 32), -90, 90) * Math.PI) / 180,
                    u = e.reduced || e.paused ? 0 : 1;
                  return (
                    P.rotation.set(
                      -s + ea + es + 0.08 * u * Math.sin(0.1 * J),
                      en + ei + 0.15 * u * Math.sin(0.07 * J),
                      eo,
                      "XYZ",
                    ),
                    P.updateMatrixWorld(),
                    E.updateMatrixWorld(),
                    (j.uFocus.value = i),
                    { loop: t, ribbonWidth: a }
                  );
                },
                eP = () => {
                  if (!O) return;
                  let e = o.current;
                  (performance.now() - K > 1e3 &&
                    ((K = performance.now()), eS()),
                    (() => {
                      let [e, t] = eT(),
                        o = `${e}:${t}`;
                      if (o === V) return;
                      V = o;
                      let a = 700 * e + 160 * t + 200,
                        n = new Float32Array((a + 1) * 75),
                        r = 0;
                      for (let e = 0; e <= a; e++)
                        for (let t = 0; t <= 24; t++)
                          ((n[r++] = e / a),
                            (n[r++] = (t / 24) * 2 - 1),
                            (n[r++] = 0));
                      let l = new Uint32Array(24 * a * 6);
                      r = 0;
                      for (let e = 0; e < a; e++)
                        for (let t = 0; t < 24; t++) {
                          let o = 25 * e + t,
                            a = o + 24 + 1;
                          ((l[r++] = o),
                            (l[r++] = a),
                            (l[r++] = o + 1),
                            (l[r++] = o + 1),
                            (l[r++] = a),
                            (l[r++] = a + 1));
                        }
                      let i = new s.LoY();
                      (i.setAttribute("position", new s.THS(n, 3)),
                        i.setIndex(new s.THS(l, 1)),
                        L.dispose(),
                        (L = i),
                        (P.geometry = i));
                    })(),
                    (() => {
                      let e = o.current,
                        [t, a] = eT(),
                        { loop: n, ribbonWidth: r } = eL();
                      ((j.uP.value = t),
                        (j.uQ.value = a),
                        (j.uLoop.value = n),
                        (j.uWidth.value = r),
                        (j.uTwists.value = f(
                          Math.round(v(e.twists, 4)),
                          0,
                          12,
                        )),
                        (j.uPhase.value = ee),
                        (j.uTime.value = J),
                        (j.uMotion.value = +!e.reduced),
                        (j.uReveal.value = em),
                        (j.uFlow.value = et),
                        (j.uGlow.value = 0.07 * f(v(e.glow, 1), 0, 4)),
                        (j.uEdge.value = 1.1 * f(v(e.edges, 1), 0, 4)),
                        (j.uFold.value = 3 + 11 * f(v(e.folds, 1), 0, 3)),
                        (j.uSheen.value = 0.15 * f(v(e.sheen, 1), 0, 4)),
                        (j.uThreads.value = f(v(e.threads, 0), 0, 1)),
                        (j.uDepth.value = f(v(e.depth, 0.6), 0, 1)),
                        j.uLightDir.value.set(ed, eh, 0.9).normalize());
                      for (let e = 0; e < 6; e++) {
                        let t = eM[e];
                        t
                          ? w[e].set(t.at, J - t.born, t.strength, 0)
                          : w[e].set(0, 0, 0, 0);
                      }
                      ((A.uniforms.uGrain.value = f(v(e.grain, 0.25), 0, 1)),
                        (A.uniforms.uTime.value = J));
                    })(),
                    a.setRenderTarget(z),
                    a.setClearColor(0, 1),
                    a.clear(),
                    a.render(W, E));
                  let t = f(v(e.bloom, 0.6), 0, 3) * (Z ? 0.5 : 1);
                  if (t > 0.001) {
                    let e = z;
                    for (let t of ((x.material = B), R))
                      ((B.uniforms.uThreshold.value = 0.9 * (e === z)),
                        (B.uniforms.uSource.value = e.texture),
                        B.uniforms.uTexel.value.set(1 / e.width, 1 / e.height),
                        a.setRenderTarget(t),
                        a.render(g, c),
                        (e = t));
                    x.material = D;
                    for (let e = R.length - 1; e > 0; e--)
                      ((D.uniforms.uSource.value = R[e].texture),
                        D.uniforms.uTexel.value.set(
                          1 / R[e].width,
                          1 / R[e].height,
                        ),
                        a.setRenderTarget(R[e - 1]),
                        a.render(g, c));
                  }
                  ((A.uniforms.uBloomStrength.value = t / R.length),
                    (x.material = A),
                    a.setRenderTarget(null),
                    a.render(g, c));
                },
                eW = (e, t) => {
                  if (eM.length >= 6) {
                    let e = 0;
                    for (let t = 1; t < eM.length; t++)
                      eM[t].born < eM[e].born && (e = t);
                    if (J - eM[e].born < 1.2) return;
                    eM.splice(e, 1);
                  }
                  eM.push({ at: e, born: J, strength: t });
                },
                eE = () => {
                  ew || ey || !ex || eg || (eg = requestAnimationFrame(eI));
                },
                eI = (e) => {
                  var t;
                  if (((eg = 0), ew || ey)) return;
                  let a = o.current;
                  eb &&
                    e - eb < 100 &&
                    ((t = e - eb),
                    (_ += (t - _) * 0.08) > 24
                      ? (Q++, (G = 0))
                      : _ < 13
                        ? (G++, (Q = 0))
                        : ((Q = 0), (G = 0)),
                    Q > 45 && H > 0.6
                      ? ((H = Math.max(0.6, 0.8 * H)),
                        (Q = 0),
                        (_ = 1e3 / 60),
                        ej())
                      : G > 240 &&
                        H < 1 &&
                        ((H = Math.min(1, 1.15 * H)), (G = 0), ej()));
                  let r =
                    eb && e - eb < 100
                      ? Math.min(Math.max((e - eb) / 1e3, 0), 0.05)
                      : 1 / 60;
                  eb = e;
                  let l = !a.reduced && !a.paused;
                  if (l) {
                    J += r;
                    let e = f(v(a.flowSpeed, 0.5), 0, 3);
                    ((ee += r * e * 0.4),
                      (et += r * e * 0.36),
                      (eo += r * f(v(a.rotationSpeed, 0.5), -3, 3) * 0.09),
                      ek ||
                        ((er += (-2.2 * ea - 2 * er) * r),
                        (el += (-2.2 * en - 2 * el) * r),
                        (ea += er * r),
                        (en += el * r)));
                  }
                  if (a.intro && !a.reduced) {
                    ep < 0 && (ep = e);
                    let t = f((e - ep) / 1e3 / 2.6, 0, 1);
                    em =
                      t >= 1
                        ? 1
                        : t < 0.5
                          ? 4 * t * t * t
                          : 1 - Math.pow(-2 * t + 2, 3) / 2;
                  } else em = 1;
                  let i = a.reduced ? 1 : 1 - Math.exp(-r / 0.5);
                  ((ei += (eu - ei) * i), (es += (ec - es) * i));
                  let s = ef ?? -0.5 + 0.3 * Math.sin(0.09 * J),
                    u = null === ef ? 0.7 : ev,
                    c = a.reduced ? 1 : 1 - Math.exp(-(2.5 * r));
                  ((ed += (s - ed) * c), (eh += (u - eh) * c));
                  for (let e = eM.length - 1; e >= 0; e--)
                    J - eM[e].born > 9 && eM.splice(e, 1);
                  eP();
                  let d =
                    Math.abs(eu - ei) > 1e-4 ||
                    Math.abs(ec - es) > 1e-4 ||
                    Math.abs(s - ed) + Math.abs(u - eh) > 5e-4 ||
                    Math.abs(ea) + Math.abs(en) + Math.abs(er) + Math.abs(el) >
                      5e-4;
                  (l || d || em < 1 || null !== ek) && !n.hidden
                    ? (eg = requestAnimationFrame(eI))
                    : (eb = 0);
                },
                ez = (e) => {
                  var t;
                  let a = o.current;
                  !e.isPrimary ||
                    ((t = e.target) &&
                      "function" == typeof t.closest &&
                      t.closest(
                        "a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]",
                      )) ||
                    ("mouse" === e.pointerType && 0 !== e.button) ||
                    ((a.draggable || a.interactive) &&
                      ((ek = {
                        id: e.pointerId,
                        x: e.clientX,
                        y: e.clientY,
                        lastX: e.clientX,
                        lastY: e.clientY,
                        time: performance.now(),
                        moved: !1,
                      }),
                      (er = 0),
                      (el = 0),
                      eE()));
                },
                eR = (t) => {
                  let a = o.current;
                  if (ek && t.pointerId === ek.id) {
                    let o = t.clientX - ek.lastX,
                      n = t.clientY - ek.lastY;
                    if (
                      !ek.moved &&
                      Math.hypot(t.clientX - ek.x, t.clientY - ek.y) > 6 &&
                      ((ek.moved = !0), a.draggable)
                    )
                      try {
                        e.setPointerCapture(t.pointerId);
                      } catch {
                        ek.moved = !0;
                      }
                    if (ek.moved && a.draggable) {
                      let t = performance.now(),
                        r = Math.max(e.clientHeight, 1),
                        l = (o / r) * Math.PI * 1.2,
                        i = (n / r) * Math.PI * 1.2;
                      ((en += l), (ea = f(ea + i, -1.4, 1.4)));
                      let s = Math.max((t - ek.time) / 1e3, 0.008);
                      ((el = a.reduced ? 0 : f(l / s, -8, 8)),
                        (er = a.reduced ? 0 : f(i / s, -8, 8)),
                        (ek.time = t));
                    }
                    ((ek.lastX = t.clientX), (ek.lastY = t.clientY), eE());
                    return;
                  }
                  if ("touch" === t.pointerType) return;
                  let n = e.getBoundingClientRect();
                  if (n.width <= 0 || n.height <= 0) return;
                  let r = (t.clientX - n.left) / n.width - 0.5,
                    l = (t.clientY - n.top) / n.height - 0.5,
                    i = f(v(a.parallax, 0.5), 0, 2);
                  ((eu = 0.44 * r * i),
                    (ec = 0.32 * l * i),
                    a.interactive && ((ef = 2.2 * r), (ev = -(2.2 * l))),
                    eE());
                },
                eU = (t) => {
                  let a = ek;
                  if (!a || t.pointerId !== a.id) return;
                  ((ek = null),
                    e.hasPointerCapture(t.pointerId) &&
                      e.releasePointerCapture(t.pointerId),
                    Math.abs(performance.now() - a.time) > 120 &&
                      ((er *= 0.2), (el *= 0.2)));
                  let n = o.current;
                  if (!a.moved && n.interactive && !n.reduced && !n.paused) {
                    let o = ((t, o) => {
                      let a = e.getBoundingClientRect();
                      if (a.width <= 0 || a.height <= 0) return null;
                      let n = ((t - a.left) / a.width) * 2 - 1,
                        r = 1 - ((o - a.top) / a.height) * 2,
                        [l, i] = eT(),
                        { loop: s } = eL(),
                        u = a.width / a.height,
                        c = 1 / 0,
                        d = 0;
                      for (let e = 0; e < 720; e++) {
                        let t = (e / 720) * Math.PI * 2,
                          o = 1 + s * Math.cos(i * t);
                        (eC.set(
                          o * Math.cos(l * t),
                          o * Math.sin(l * t),
                          s * Math.sin(i * t),
                        ),
                          eC.applyMatrix4(P.matrixWorld).project(E));
                        let a =
                          Math.hypot((eC.x - n) * u, eC.y - r) + 0.02 * eC.z;
                        a < c && ((c = a), (d = e / 720));
                      }
                      return d;
                    })(t.clientX, t.clientY);
                    null !== o && eW(o, f(v(n.flip, 1), 0, 2));
                  }
                  eE();
                },
                eq = (e) => {
                  (ek && e.pointerId === ek.id && (ek = null), eE());
                },
                eB = (e) => {
                  "touch" !== e.pointerType &&
                    ((eu = 0), (ec = 0), (ef = null), eE());
                },
                eD = () => {
                  ((eb = 0), eE());
                },
                eA = (e) => {
                  (e.preventDefault(),
                    (ey = !0),
                    cancelAnimationFrame(eg),
                    (eg = 0));
                },
                eY = () => {
                  ((ey = !1), ($ = ""), (V = ""), eE());
                },
                eX = new ResizeObserver(() => {
                  eF() && (eP(), eE());
                }),
                eN = new IntersectionObserver(
                  ([e]) => {
                    ((ex = e.isIntersecting), (eb = 0), eE());
                  },
                  { rootMargin: "120px" },
                );
              return (
                e.addEventListener("pointerdown", ez),
                e.addEventListener("pointermove", eR),
                e.addEventListener("pointerup", eU),
                e.addEventListener("pointercancel", eq),
                e.addEventListener("pointerleave", eB),
                n.addEventListener("visibilitychange", eD),
                l.addEventListener("webglcontextlost", eA),
                l.addEventListener("webglcontextrestored", eY),
                eX.observe(e),
                eN.observe(e),
                o.current.intro && !o.current.reduced && (em = 0),
                eF(),
                eS(),
                {
                  sync: () => {
                    ((K = -10), eF(), (eb = 0), !eg && ex && (eP(), eE()));
                  },
                  flip: (e, t) => {
                    let a = o.current;
                    a.reduced ||
                      (eW(
                        void 0 === e ? Math.random() : ((e % 1) + 1) % 1,
                        f(v(t ?? a.flip, 1), 0, 2),
                      ),
                      eE());
                  },
                  spin: (e) => {
                    o.current.reduced || ((el = f(v(e ?? 4, 4), -8, 8)), eE());
                  },
                  replay: () => {
                    o.current.reduced || ((ep = -1), (em = 0), (eb = 0), eE());
                  },
                  destroy: () => {
                    for (let t of ((ew = !0),
                    cancelAnimationFrame(eg),
                    eX.disconnect(),
                    eN.disconnect(),
                    e.removeEventListener("pointerdown", ez),
                    e.removeEventListener("pointermove", eR),
                    e.removeEventListener("pointerup", eU),
                    e.removeEventListener("pointercancel", eq),
                    e.removeEventListener("pointerleave", eB),
                    n.removeEventListener("visibilitychange", eD),
                    l.removeEventListener("webglcontextlost", eA),
                    l.removeEventListener("webglcontextrestored", eY),
                    L.dispose(),
                    F.dispose(),
                    p.dispose(),
                    B.dispose(),
                    D.dispose(),
                    A.dispose(),
                    z.dispose(),
                    R))
                      t.dispose();
                    (a.dispose(), l.remove());
                  },
                }
              );
            })(e, t, ee);
            return (
              (K.current = o),
              () => {
                (o?.destroy(), (K.current = null));
              }
            );
          }, []),
          (0, n.useImperativeHandle)(
            V,
            () => ({
              flip: (e, t) => K.current?.flip(e, t),
              spin: (e) => K.current?.spin(e),
              replay: () => K.current?.replay(),
            }),
            [],
          ));
        let et = t.trim().toLowerCase();
        return (0, a.jsxs)("div", {
          ref: $,
          className: (0, c.cn)(
            "relative isolate h-full min-h-[320px] w-full overflow-hidden",
            _,
          ),
          style: {
            backgroundColor: "transparent" === et || "" === et ? void 0 : t,
            touchAction: "pan-y",
            cursor: D ? "grab" : void 0,
            ...O,
          },
          children: [
            (0, a.jsx)("div", {
              ref: Z,
              "aria-hidden": "true",
              style: { position: "absolute", inset: 0, pointerEvents: "none" },
            }),
            G
              ? (0, a.jsx)("div", {
                  style: { position: "relative", zIndex: 1, height: "100%" },
                  children: G,
                })
              : null,
          ],
        });
      });
    j.displayName = "PhotonKnot";
    let F = {
        shape: "trefoil",
        size: 0.72,
        offsetX: 0,
        offsetY: 0,
        ribbonWidth: 0.34,
        loop: 0.42,
        twists: 4,
        tilt: 32,
        glow: 1,
        edges: 1,
        folds: 1,
        sheen: 1,
        threads: 0,
        depth: 0.6,
      },
      L = {
        trefoil: F,
        halo: {
          ...F,
          shape: "halo",
          size: 0.8,
          ribbonWidth: 0.42,
          loop: 0.15,
          twists: 1,
          tilt: 58,
        },
        cinquefoil: {
          ...F,
          shape: "cinquefoil",
          ribbonWidth: 0.24,
          loop: 0.38,
        },
        macro: {
          ...F,
          size: 1.9,
          offsetX: 0.2,
          offsetY: 0.1,
          ribbonWidth: 0.45,
          tilt: 62,
          depth: 0.75,
        },
        organza: {
          ...F,
          ribbonWidth: 0.5,
          twists: 6,
          glow: 1.5,
          edges: 0.7,
          sheen: 1.6,
          threads: 1,
        },
        star: {
          ...F,
          shape: "star",
          ribbonWidth: 0.16,
          loop: 0.5,
          twists: 6,
          edges: 1.2,
        },
        tangle: {
          ...F,
          shape: "tangle",
          ribbonWidth: 0.22,
          loop: 0.45,
          tilt: 20,
        },
        cord: { ...F, ribbonWidth: 0.16, twists: 10, folds: 1.6, edges: 1.2 },
      },
      P = [
        { label: "Trefoil", value: "trefoil" },
        { label: "Halo", value: "halo" },
        { label: "Cinquefoil", value: "cinquefoil" },
        { label: "Macro", value: "macro" },
        { label: "Organza", value: "organza" },
        { label: "Star", value: "star" },
        { label: "Tangle", value: "tangle" },
        { label: "Cord", value: "cord" },
      ],
      W = [
        { label: "Trefoil", value: "trefoil" },
        { label: "Cinquefoil", value: "cinquefoil" },
        { label: "Septafoil", value: "septafoil" },
        { label: "Star", value: "star" },
        { label: "Tangle", value: "tangle" },
        { label: "Halo", value: "halo" },
      ],
      E = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#5227FF", "#FF9FFC"]',
          description:
            "The two colours the ribbon blends between along its length. On light backgrounds they become matching inks.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Background of the component. Transparent reads the colour behind the component.",
        },
        {
          name: "shape",
          type: '"trefoil" | "cinquefoil" | "septafoil" | "star" | "tangle" | "halo"',
          default: '"trefoil"',
          description:
            "The knot the ribbon is tied into. Halo is a plain ring that frames a headline.",
        },
        {
          name: "size",
          type: "number",
          default: "0.72",
          description:
            "Size of the knot as a share of the frame. Values above 1 crop it for a close-up.",
        },
        {
          name: "offsetX",
          type: "number",
          default: "0",
          description:
            "Moves the knot sideways, as a share of the frame width.",
        },
        {
          name: "offsetY",
          type: "number",
          default: "0",
          description:
            "Moves the knot down (positive) or up (negative), as a share of the frame height.",
        },
        {
          name: "ribbonWidth",
          type: "number",
          default: "0.34",
          description: "Width of the ribbon relative to the knot.",
        },
        {
          name: "loop",
          type: "number",
          default: "0.42",
          description: "How far the knot loops out from its centre ring.",
        },
        {
          name: "twists",
          type: "number",
          default: "4",
          description:
            "Half-turns of twist along the ribbon. One half-turn on the halo makes a M\xf6bius band.",
        },
        {
          name: "flowSpeed",
          type: "number",
          default: "0.5",
          description:
            "How fast the twist and the colours drift along the ribbon.",
        },
        {
          name: "rotationSpeed",
          type: "number",
          default: "0.5",
          description:
            "Speed of the slow turn. Negative values turn the other way.",
        },
        {
          name: "tilt",
          type: "number",
          default: "32",
          description:
            "How far the knot leans back from the viewer, in degrees.",
        },
        {
          name: "glow",
          type: "number",
          default: "1",
          description: "Brightness of the translucent body of the ribbon.",
        },
        {
          name: "edges",
          type: "number",
          default: "1",
          description: "Brightness of the fine lines along the ribbon's edges.",
        },
        {
          name: "folds",
          type: "number",
          default: "1",
          description:
            "How brightly light gathers where the ribbon turns edge-on.",
        },
        {
          name: "sheen",
          type: "number",
          default: "1",
          description:
            "Strength of the silky highlight. The pointer moves its light.",
        },
        {
          name: "threads",
          type: "number",
          default: "0",
          description: "Weaves fine threads into the ribbon, like organza.",
        },
        {
          name: "depth",
          type: "number",
          default: "0.6",
          description: "How much the far side of the knot dims and softens.",
        },
        {
          name: "parallax",
          type: "number",
          default: "0.5",
          description:
            "How much the knot leans toward the pointer as it moves.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "The pointer moves the light across the ribbon, and a click flips the ribbon at the nearest point.",
        },
        {
          name: "draggable",
          type: "boolean",
          default: "true",
          description:
            "Drag to turn the knot. It keeps the speed of your throw, then settles back.",
        },
        {
          name: "flip",
          type: "number",
          default: "1",
          description:
            "Strength of the twist a click sends along the ribbon, from 0 to 2.",
        },
        {
          name: "bloom",
          type: "number",
          default: "0.6",
          description: "Soft glow around the brightest folds and edges.",
        },
        {
          name: "grain",
          type: "number",
          default: "0.25",
          description: "Fine film grain over the lit areas.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "The ribbon draws itself along the knot and closes it when the component appears.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops the motion. Dragging still turns the knot. Reduced-motion users get a still knot.",
        },
        {
          name: "dpr",
          type: "number",
          default: "2",
          description: "Maximum device pixel ratio for the canvas.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description:
            "Content laid over the scene. Clicks on its links and buttons never flip the ribbon.",
        },
        {
          name: "ref",
          type: "{ flip, spin, replay }",
          default: "—",
          description:
            "flip(position?, strength?) sends a twist from a point along the ribbon (0 to 1), spin(velocity?) throws the knot, replay() ties the knot again.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element. It fills its parent, with a 320px minimum height.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      I = () => {
        let [e, t] = (0, i.I)(),
          o = (0, l.Y)(),
          [s, u] = (0, n.useState)("trefoil"),
          [c, d] = (0, n.useState)(L.trefoil),
          h = (e) => (t) => d((o) => ({ ...o, [e]: t })),
          [f, v] = (0, n.useState)(["#5227FF", "#FF9FFC"]),
          [p, m] = (0, n.useState)(null),
          g = p ?? ("dark" === o ? "#0A0A0A" : "#FFFFFF"),
          [b, x] = (0, n.useState)(0.5),
          [w, y] = (0, n.useState)(0.5),
          [k, M] = (0, n.useState)(0.5),
          [C, S] = (0, n.useState)(1),
          [T, F] = (0, n.useState)(0.6),
          [I, z] = (0, n.useState)(0.25),
          [R, U] = (0, n.useState)(!0),
          [q, B] = (0, n.useState)(!0),
          [D, A] = (0, n.useState)(!0),
          [Y, X] = (0, n.useState)(!1);
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(r.Bg, {}),
            (0, a.jsxs)(r.VX, {
              children: [
                (0, a.jsxs)(r.Ec, {
                  children: [
                    (0, a.jsx)(r.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, a.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, a.jsx)(
                          j,
                          {
                            ...c,
                            colors: f,
                            backgroundColor: g,
                            flowSpeed: b,
                            rotationSpeed: w,
                            parallax: k,
                            flip: C,
                            bloom: T,
                            grain: I,
                            interactive: R,
                            draggable: q,
                            intro: D,
                            paused: Y,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, a.jsxs)(r.IH, {
                      children: [
                        (0, a.jsx)(r.bg, {
                          title: "Preset",
                          value: s,
                          options: P,
                          onChange: (e) => {
                            (u(e), d(L[e] ?? L.trefoil));
                          },
                        }),
                        (0, a.jsx)(r.bg, {
                          title: "Shape",
                          value: c.shape,
                          options: W,
                          onChange: (e) => h("shape")(e),
                        }),
                        (0, a.jsx)(r.W7, {
                          title: "Start Color",
                          value: f[0],
                          onChange: (e) => v((t) => [e, t[1]]),
                        }),
                        (0, a.jsx)(r.W7, {
                          title: "End Color",
                          value: f[1],
                          onChange: (e) => v((t) => [t[0], e]),
                        }),
                        (0, a.jsx)(r.W7, {
                          title: "Background",
                          value: g,
                          onChange: m,
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Size",
                          min: 0.3,
                          max: 2.4,
                          step: 0.01,
                          value: c.size,
                          onChange: h("size"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Offset X",
                          min: -0.5,
                          max: 0.5,
                          step: 0.01,
                          value: c.offsetX,
                          onChange: h("offsetX"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Offset Y",
                          min: -0.5,
                          max: 0.5,
                          step: 0.01,
                          value: c.offsetY,
                          onChange: h("offsetY"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Ribbon Width",
                          min: 0.05,
                          max: 0.7,
                          step: 0.01,
                          value: c.ribbonWidth,
                          onChange: h("ribbonWidth"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Loop",
                          min: 0,
                          max: 0.65,
                          step: 0.01,
                          value: c.loop,
                          onChange: h("loop"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Twists",
                          min: 0,
                          max: 12,
                          step: 1,
                          value: c.twists,
                          onChange: h("twists"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Flow Speed",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: b,
                          onChange: x,
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Rotation",
                          min: -2,
                          max: 2,
                          step: 0.01,
                          value: w,
                          onChange: y,
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Tilt",
                          min: -80,
                          max: 80,
                          step: 1,
                          value: c.tilt,
                          valueUnit: "\xb0",
                          onChange: h("tilt"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Glow",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.glow,
                          onChange: h("glow"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Edges",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.edges,
                          onChange: h("edges"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Folds",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.folds,
                          onChange: h("folds"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Sheen",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.sheen,
                          onChange: h("sheen"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Threads",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.threads,
                          onChange: h("threads"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Depth",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.depth,
                          onChange: h("depth"),
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Parallax",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: k,
                          onChange: M,
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Flip",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: C,
                          onChange: S,
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Bloom",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: T,
                          onChange: F,
                        }),
                        (0, a.jsx)(r.yt, {
                          title: "Grain",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: I,
                          onChange: z,
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Interactive",
                          checked: R,
                          onChange: U,
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Draggable",
                          checked: q,
                          onChange: B,
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Intro",
                          checked: D,
                          onChange: A,
                        }),
                        (0, a.jsx)(r.tl, {
                          title: "Paused",
                          checked: Y,
                          onChange: X,
                        }),
                      ],
                    }),
                    (0, a.jsx)(r.Ub, { data: E }),
                  ],
                }),
                (0, a.jsx)(r.lT, { children: (0, a.jsx)(r.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
