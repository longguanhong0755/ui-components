/* ReactBits Pro public preview module 96310 for dappled-light.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/96310.0211e2ded269c1af.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  96310: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => H }));
    var n = a(95155),
      o = a(12115),
      l = a(56388),
      r = a(86049),
      s = a(90761),
      i = a(2253),
      u = a(12246),
      d = a(90650);
    let h = 2 * Math.PI,
      c = (e, t, a) => Math.min(a, Math.max(t, e)),
      f = (e) => {
        let t = c(e, 0, 1);
        return t * t * t * (t * (6 * t - 15) + 10);
      },
      p = (e) => {
        let t = (e + Math.PI) % h;
        return (t < 0 && (t += h), t - Math.PI);
      },
      m = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      v = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      g = new i.Q1f(),
      w = (e) => {
        let t = e.trim().toLowerCase();
        if (!t || "transparent" === t || "none" === t || "auto" === t)
          return null;
        try {
          g.setStyle(t, i.jf0);
        } catch {
          return null;
        }
        return [g.r, g.g, g.b];
      },
      x = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      y = {
        ficus: [
          {
            offset: 0,
            length: 0.95,
            segments: 6,
            curl: 0.16,
            droop: 0.05,
            depth: 0.12,
            spread: 0,
          },
          {
            offset: -0.44,
            length: 0.74,
            segments: 5,
            curl: -0.1,
            droop: 0.06,
            depth: 0.55,
            spread: -0.12,
          },
          {
            offset: 0.42,
            length: 0.66,
            segments: 5,
            curl: 0.2,
            droop: 0.04,
            depth: 0.95,
            spread: 0.1,
          },
          {
            offset: 0.88,
            length: 0.52,
            segments: 4,
            curl: -0.14,
            droop: 0.07,
            depth: 0.35,
            spread: 0.2,
          },
        ],
        olive: [
          {
            offset: 0.02,
            length: 1.15,
            segments: 10,
            curl: 0.1,
            droop: 0.035,
            depth: 0.18,
            spread: 0,
          },
          {
            offset: -0.36,
            length: 0.92,
            segments: 8,
            curl: -0.07,
            droop: 0.04,
            depth: 0.6,
            spread: -0.1,
          },
          {
            offset: 0.4,
            length: 0.86,
            segments: 8,
            curl: 0.14,
            droop: 0.03,
            depth: 1,
            spread: 0.12,
          },
        ],
        palm: [
          {
            offset: 0.04,
            length: 1.28,
            segments: 14,
            curl: 0.02,
            droop: 0.05,
            depth: 0.14,
            spread: 0,
          },
          {
            offset: -0.5,
            length: 1.05,
            segments: 12,
            curl: -0.02,
            droop: 0.06,
            depth: 0.6,
            spread: -0.08,
          },
          {
            offset: 0.56,
            length: 1,
            segments: 12,
            curl: 0.03,
            droop: 0.065,
            depth: 0.95,
            spread: 0.1,
          },
        ],
        fern: [
          {
            offset: 0,
            length: 1.1,
            segments: 18,
            curl: 0.22,
            droop: 0.06,
            depth: 0.15,
            spread: 0,
          },
          {
            offset: -0.42,
            length: 0.88,
            segments: 15,
            curl: 0.12,
            droop: 0.07,
            depth: 0.55,
            spread: -0.1,
          },
          {
            offset: 0.45,
            length: 0.82,
            segments: 14,
            curl: 0.3,
            droop: 0.06,
            depth: 0.95,
            spread: 0.12,
          },
          {
            offset: 0.9,
            length: 0.62,
            segments: 11,
            curl: 0.18,
            droop: 0.08,
            depth: 0.4,
            spread: 0.2,
          },
        ],
      },
      b = {
        "top-right": { x: 1, y: 1, angle: -2.42 },
        "top-left": { x: -1, y: 1, angle: -0.72 },
        right: { x: 1, y: 0.18, angle: Math.PI - 0.18 },
        left: { x: -1, y: 0.18, angle: 0.18 },
        "bottom-right": { x: 1, y: -1, angle: 2.42 },
        "bottom-left": { x: -1, y: -1, angle: 0.72 },
      },
      S = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      k = `
attribute vec4 iLeaf;
attribute vec4 iShape;
uniform vec2 uHalf;
varying vec2 vLocal;
varying vec4 vShape;
varying float vLength;
void main() {
  float r = iLeaf.w * 0.5;
  float halfWidth = r * iShape.x;
  vec2 extent = vec2(r, halfWidth) + iShape.y * 2.4 + 0.003;
  vec2 local = position.xy * extent;
  float c = cos(iLeaf.z);
  float s = sin(iLeaf.z);
  vec2 world = iLeaf.xy + vec2(c * local.x - s * local.y, s * local.x + c * local.y);
  gl_Position = vec4(world / uHalf, 0.0, 1.0);
  vLocal = local;
  vShape = iShape;
  vLength = iLeaf.w;
}
`,
      C = `
varying vec2 vLocal;
varying vec4 vShape;
varying float vLength;

float sdLeaf(vec2 p, float len, float ratio) {
  float r = len * 0.5;
  float w = max(r * ratio, 1e-4);
  float R = (r * r + w * w) / (2.0 * w);
  float d = R - w;
  vec2 q = abs(p);
  return max(length(vec2(q.x, q.y + d)) - R, q.x - r);
}

void main() {
  float sd = sdLeaf(vLocal, vLength, vShape.x);
  float occ = 1.0 - smoothstep(-vShape.y, vShape.y, sd);
  gl_FragColor = vec4(occ * vShape.z);
}
`,
      M = `
attribute vec4 iStem;
attribute vec4 iStemShape;
uniform vec2 uHalf;
varying vec2 vWorld;
varying vec4 vSegment;
varying vec4 vShape;
void main() {
  vec2 a = iStem.xy;
  vec2 b = iStem.zw;
  vec2 axis = b - a;
  float len = max(length(axis), 1e-5);
  vec2 dir = axis / len;
  vec2 perp = vec2(-dir.y, dir.x);
  float pad = iStemShape.x + iStemShape.y * 2.4 + 0.003;
  vec2 center = (a + b) * 0.5;
  vec2 world = center + dir * position.x * (len * 0.5 + pad) + perp * position.y * pad;
  gl_Position = vec4(world / uHalf, 0.0, 1.0);
  vWorld = world;
  vSegment = iStem;
  vShape = iStemShape;
}
`,
      W = `
varying vec2 vWorld;
varying vec4 vSegment;
varying vec4 vShape;
void main() {
  vec2 pa = vWorld - vSegment.xy;
  vec2 ba = vSegment.zw - vSegment.xy;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
  float sd = length(pa - ba * h) - vShape.x;
  float occ = 1.0 - smoothstep(-vShape.y, vShape.y, sd);
  gl_FragColor = vec4(occ * vShape.z);
}
`,
      L = `
uniform vec2 uHalf;
uniform vec4 uWindow;
uniform float uWindowAngle;
uniform float uWindowOn;

float windowMask(vec2 p, out float falloff) {
  falloff = 1.0;
  if (uWindowOn < 0.5) return 1.0;
  vec2 d = p - uWindow.xy;
  if (uWindowOn > 1.5) {
    vec2 e = d / vec2(uWindow.z * 1.35, uWindow.z);
    float r = length(e);
    falloff = mix(0.55, 1.0, 1.0 - smoothstep(0.0, 1.0, r));
    return 1.0 - smoothstep(0.35, 1.0, r);
  }
  float c = cos(uWindowAngle);
  float s = sin(uWindowAngle);
  vec2 r = vec2(c * d.x + s * d.y, -s * d.x + c * d.y);
  float size = uWindow.z;
  float soft = uWindow.w;
  float halfLen = size * 1.3;
  float persp = 1.0 + 0.3 * clamp(r.x / halfLen, -1.0, 1.0);
  float y = r.y / persp;
  float halfW = size * 0.5;
  float across = smoothstep(-halfW - soft, -halfW + soft, y) * (1.0 - smoothstep(halfW - soft, halfW + soft, y));
  float along = smoothstep(-halfLen - soft * 2.0, -halfLen + soft * 2.0, r.x) * (1.0 - smoothstep(halfLen - soft * 2.0, halfLen + soft * 2.0, r.x));
  float bar = size * 0.016;
  float mullion = 1.0 - (1.0 - smoothstep(bar, bar + soft * 0.8, abs(y))) * 0.94;
  float transom = 1.0 - (1.0 - smoothstep(bar, bar + soft * 0.8, abs(r.x + halfLen * 0.28))) * 0.9;
  falloff = mix(0.5, 1.0, 1.0 - smoothstep(-halfLen, halfLen, r.x)) * mix(0.8, 1.0, 1.0 - smoothstep(0.0, halfW, abs(y)));
  return across * along * mullion * transom;
}
`,
      j = `
uniform sampler2D uMask;
uniform vec3 uBackground;
uniform vec3 uShadowTint;
uniform float uSun;
uniform float uStrength;
uniform float uGrain;
uniform float uTime;
varying vec2 vUv;
${L}
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec2 p = (vUv * 2.0 - 1.0) * uHalf;
  float shade = texture2D(uMask, vUv).r;
  float falloff;
  float win = windowMask(p, falloff);
  float lit = win * (1.0 - shade);
  float amount = clamp((1.0 - lit) * uSun * uStrength, 0.0, 1.0);
  vec3 color = uBackground * (1.0 - amount * (1.0 - uShadowTint));
  float n = hash(gl_FragCoord.xy + fract(uTime * 17.0) * 911.0) - 0.5;
  float mask = smoothstep(0.0, 0.05, amount);
  color += n * uGrain * 0.09 * mask;
  color += (hash(gl_FragCoord.xy * 1.7) - 0.5) / 255.0 * mask;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`,
      F = `
uniform sampler2D uMask;
uniform vec3 uLightColor;
uniform vec3 uShadowColor;
uniform float uSun;
uniform float uIntensity;
varying vec2 vUv;
${L}
void main() {
  vec2 p = (vUv * 2.0 - 1.0) * uHalf;
  float shade = texture2D(uMask, vUv).r;
  float falloff;
  float win = windowMask(p, falloff);
  vec3 light = uLightColor * (1.0 - shade) + uShadowColor * shade * 0.08;
  vec3 emission = light * win * falloff * uSun * uIntensity;
  gl_FragColor = vec4(emission, 1.0);
}
`,
      T = `
uniform sampler2D uSource;
uniform vec2 uTexel;
varying vec2 vUv;
vec3 tap(vec2 d) { return texture2D(uSource, vUv + d * uTexel).rgb; }
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
  gl_FragColor = vec4(color, 1.0);
}
`,
      z = `
uniform sampler2D uSource;
uniform vec2 uTexel;
varying vec2 vUv;
vec3 tap(vec2 d) { return texture2D(uSource, vUv + d * uTexel).rgb; }
void main() {
  vec3 color = tap(vec2(0.0)) * 4.0
    + (tap(vec2(-1.0, 0.0)) + tap(vec2(1.0, 0.0)) + tap(vec2(0.0, -1.0)) + tap(vec2(0.0, 1.0))) * 2.0
    + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0));
  gl_FragColor = vec4(color / 16.0, 1.0);
}
`,
      A = `
uniform sampler2D uEmission;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform vec2 uResolution;
uniform float uBloomStrength;
uniform float uGrain;
uniform float uTime;
varying vec2 vUv;
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
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec2 c = vUv - 0.5;
  vec2 shift = c * 1.4 / uResolution.y;
  vec3 emission;
  emission.r = texture2D(uEmission, vUv + shift).r;
  emission.g = texture2D(uEmission, vUv).g;
  emission.b = texture2D(uEmission, vUv - shift).b;
  emission += texture2D(uBloom, vUv).rgb * uBloomStrength;
  vec3 light = neutral(max(emission, 0.0));
  light = pow(light, vec3(1.0 / 2.2));
  vec3 color = 1.0 - (1.0 - uBackground) * (1.0 - light);
  float l = max(light.r, max(light.g, light.b));
  float mask = smoothstep(0.0, 0.04, l);
  float n = hash(gl_FragCoord.xy + fract(uTime * 17.0) * 911.0) - 0.5;
  color += n * uGrain * 0.1 * mask;
  color += (hash(gl_FragCoord.xy * 1.7) - 0.5) / 255.0 * mask;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`,
      B = (0, o.forwardRef)(function (
        {
          plant: e = "ficus",
          placement: t = "top-right",
          scale: a = 1,
          density: l = 1,
          depth: r = 0.7,
          softness: s = 1,
          shadowStrength: g = 1,
          lightColor: L = "auto",
          shadowColor: B = "auto",
          backgroundColor: P = "transparent",
          window: E = "auto",
          windowAngle: I = 28,
          windowSize: U = 0.52,
          intensity: R = 0.9,
          bloom: D = 0.6,
          wind: H = 0.6,
          windSpeed: O = 1,
          clouds: _ = 0.25,
          breeze: q = !0,
          grain: N = 0.25,
          seed: G = 1,
          intro: V = !0,
          paused: K = !1,
          dpr: Y = 2,
          children: X,
          className: Z,
          style: $,
        },
        Q,
      ) {
        let J = (0, o.useRef)(null),
          ee = (0, o.useRef)(null),
          et = (0, o.useRef)(null),
          ea = {
            plant: e,
            placement: t,
            scale: a,
            density: l,
            depth: r,
            softness: s,
            shadowStrength: g,
            lightColor: L,
            shadowColor: B,
            backgroundColor: P,
            window: E,
            windowAngle: I,
            windowSize: U,
            intensity: R,
            bloom: D,
            wind: H,
            windSpeed: O,
            clouds: _,
            breeze: q,
            grain: N,
            seed: G,
            intro: V,
            paused: K,
            dpr: Y,
            reduced: (0, o.useSyncExternalStore)(m, v, () => !1),
          },
          en = (0, o.useRef)(ea);
        ((0, o.useEffect)(() => {
          ((en.current = ea), et.current?.sync());
        }),
          (0, o.useEffect)(() => {
            let e = J.current,
              t = ee.current;
            if (!e || !t) return;
            let a = ((e, t, a) => {
              let n,
                o = e.ownerDocument,
                l = o.defaultView ?? window,
                r = o.createElement("canvas");
              (r.setAttribute("aria-hidden", "true"),
                (r.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block"));
              try {
                n = new u.WebGLRenderer({
                  canvas: r,
                  alpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (t.appendChild(r), (n.autoClear = !1));
              let s = new i.qUd(-1, 1, 1, -1, -1, 1),
                d = new i.bdM(2, 2),
                m = new i.Z58(),
                v = new i.eaF(d);
              ((v.frustumCulled = !1), m.add(v));
              let g = new i.I9Y(1, 0.5),
                L = new i.CmU();
              ((L.index = d.index),
                L.setAttribute("position", d.getAttribute("position")));
              let B = new Float32Array(768),
                P = new Float32Array(768),
                E = new i.uWO(B, 4),
                I = new i.uWO(P, 4);
              (E.setUsage(i.Vnu),
                I.setUsage(i.Vnu),
                L.setAttribute("iLeaf", E),
                L.setAttribute("iShape", I),
                (L.instanceCount = 0));
              let U = new i.CmU();
              ((U.index = d.index),
                U.setAttribute("position", d.getAttribute("position")));
              let R = new Float32Array(384),
                D = new Float32Array(384),
                H = new i.uWO(R, 4),
                O = new i.uWO(D, 4);
              (H.setUsage(i.Vnu),
                O.setUsage(i.Vnu),
                U.setAttribute("iStem", H),
                U.setAttribute("iStemShape", O),
                (U.instanceCount = 0));
              let _ = {
                  transparent: !0,
                  blending: i.bCz,
                  blendEquation: i.$ei,
                  blendSrc: i.qad,
                  blendDst: i.qad,
                  depthTest: !1,
                  depthWrite: !1,
                },
                q = new i.BKk({
                  uniforms: { uHalf: { value: g } },
                  vertexShader: k,
                  fragmentShader: C,
                  ..._,
                }),
                N = new i.BKk({
                  uniforms: { uHalf: { value: g } },
                  vertexShader: M,
                  fragmentShader: W,
                  ..._,
                }),
                G = new i.Z58(),
                V = new i.eaF(L, q),
                K = new i.eaF(U, N);
              ((V.frustumCulled = !1),
                (K.frustumCulled = !1),
                G.add(K),
                G.add(V));
              let Y = {
                  uHalf: { value: g },
                  uWindow: { value: new i.IUQ(0, 0, 0.6, 0.03) },
                  uWindowAngle: { value: 0 },
                  uWindowOn: { value: 0 },
                },
                X = new i.Pq0(1, 1, 1),
                Z = new i.Pq0(0.8, 0.78, 0.88),
                $ = new i.Pq0(0.6, 0.5, 1.2),
                Q = new i.Pq0(0.2, 0.15, 0.45),
                J = (e) =>
                  new i.nWS(1, 1, {
                    type: e ? i.ix0 : i.OUM,
                    format: i.GWd,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    minFilter: i.k6q,
                    magFilter: i.k6q,
                    generateMipmaps: !1,
                  }),
                ee = J(!1),
                et = J(!0),
                ea = Array.from({ length: 5 }, () => J(!0)),
                en = new i.BKk({
                  uniforms: {
                    ...Y,
                    uMask: { value: ee.texture },
                    uBackground: { value: X },
                    uShadowTint: { value: Z },
                    uSun: { value: 1 },
                    uStrength: { value: 1 },
                    uGrain: { value: 0 },
                    uTime: { value: 0 },
                  },
                  vertexShader: S,
                  fragmentShader: j,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                eo = new i.BKk({
                  uniforms: {
                    ...Y,
                    uMask: { value: ee.texture },
                    uLightColor: { value: $ },
                    uShadowColor: { value: Q },
                    uSun: { value: 1 },
                    uIntensity: { value: 1 },
                  },
                  vertexShader: S,
                  fragmentShader: F,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                el = new i.BKk({
                  uniforms: {
                    uSource: { value: null },
                    uTexel: { value: new i.I9Y() },
                  },
                  vertexShader: S,
                  fragmentShader: T,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                er = new i.BKk({
                  uniforms: {
                    uSource: { value: null },
                    uTexel: { value: new i.I9Y() },
                  },
                  vertexShader: S,
                  fragmentShader: z,
                  blending: i.EZo,
                  transparent: !0,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                es = new i.BKk({
                  uniforms: {
                    uEmission: { value: et.texture },
                    uBloom: { value: ea[0].texture },
                    uBackground: { value: X },
                    uResolution: { value: new i.I9Y(1, 1) },
                    uBloomStrength: { value: 0.5 },
                    uGrain: { value: 0 },
                    uTime: { value: 0 },
                  },
                  vertexShader: S,
                  fragmentShader: A,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                ei = 0,
                eu = 0,
                ed = 1,
                eh = !1,
                ec = [],
                ef = "",
                ep = { x: 0, y: 0 },
                em = !0,
                ev = [1, 1, 1],
                eg = "",
                ew = -10,
                ex = 0,
                ey = 0,
                eb = 0,
                eS = { x: 0, y: 0 },
                ek = null,
                eC = -1,
                eM = !1,
                eW = 0,
                eL = 0,
                ej = !1,
                eF = !1,
                eT = !1,
                ez = () => performance.now() / 1e3,
                eA = () => {
                  let t = a.current,
                    o = Math.round(e.clientWidth),
                    r = Math.round(e.clientHeight);
                  if (o < 2 || r < 2) return ((eh = !1), !1);
                  let s = Math.min(
                    l.devicePixelRatio || 1,
                    Math.max(t.dpr, 0.5),
                  );
                  if (eh && o === ei && r === eu && s === ed) return !1;
                  ((eh = !0),
                    (ei = o),
                    (eu = r),
                    (ed = s),
                    n.setPixelRatio(ed),
                    n.setSize(ei, eu, !1),
                    ee.setSize(ei, eu),
                    et.setSize(ei, eu));
                  let i = ei,
                    u = eu;
                  for (let e of ea)
                    ((i = Math.max(1, Math.round(i / 2))),
                      (u = Math.max(1, Math.round(u / 2))),
                      e.setSize(i, u));
                  return (
                    g.set(ei / eu / 2, 0.5),
                    es.uniforms.uResolution.value.set(ei, eu),
                    (ef = ""),
                    !0
                  );
                },
                eB = () => {
                  ev =
                    w(a.current.backgroundColor) ??
                    (() => {
                      let t = e.parentElement;
                      for (; t;) {
                        let e = l
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
                      let a = l
                        .getComputedStyle(e)
                        .color.match(/rgba?\(([^)]+)\)/);
                      if (a) {
                        let e = a[1]
                          .split(",")
                          .map((e) => Number.parseFloat(e));
                        return e[0] + e[1] + e[2] > 382
                          ? [0.04, 0.04, 0.04]
                          : [1, 1, 1];
                      }
                      return [1, 1, 1];
                    })();
                },
                eP = () => {
                  let e = a.current,
                    t = [ev.join(","), e.lightColor, e.shadowColor].join("|");
                  if (t === eg) return;
                  ((eg = t),
                    (em =
                      0.2126 * ev[0] + 0.7152 * ev[1] + 0.0722 * ev[2] > 0.5),
                    X.set(ev[0], ev[1], ev[2]));
                  let n =
                      w(e.shadowColor) ??
                      (em ? [0.71, 0.69, 0.82] : [0.24, 0.18, 0.5]),
                    o =
                      w(e.lightColor) ??
                      (em ? [1, 0.96, 0.9] : [0.56, 0.49, 1]);
                  (Z.set(n[0], n[1], n[2]),
                    $.set(x(o[0]), x(o[1]), x(o[2])),
                    Q.set(x(n[0]), x(n[1]), x(n[2])));
                },
                eE = () => c(ei / eu / 1.5, 0.48, 1),
                eI = () => {
                  eF || eT || !ej || eW || (eW = requestAnimationFrame(eD));
                },
                eU = (e = 1) => {
                  if (a.current.reduced) return;
                  let t = c(e, 0, 3),
                    n = ez();
                  (ec.forEach((e, a) => {
                    ((e.kick = Math.min(
                      e.kick + t * (0.75 + 0.2 * Math.sin(2.3 * a)),
                      2.2,
                    )),
                      (e.kickAt = n + 0.05 + 0.09 * a + 0.08 * e.depth));
                  }),
                    (eb = Math.min(eb + 0.6 * t, 1.5)),
                    eI());
                },
                eR = (e, t) =>
                  0.55 * Math.sin(0.71 * e + t) +
                  0.3 * Math.sin(1.37 * e + 2.1 * t) +
                  0.15 * Math.sin(2.93 * e + 0.7 * t);
              function eD(e) {
                var t;
                let o, l, r, i, u, d;
                if (((eW = 0), eF || eT || (!eh && (eA(), !eh)))) return;
                let g = a.current,
                  w =
                    eL && e - eL < 100
                      ? Math.min(Math.max((e - eL) / 1e3, 0), 0.05)
                      : 1 / 60;
                eL = e;
                let x = ez(),
                  S = g.reduced;
                (eA(),
                  x - ew > 1.2 && ((ew = x), eB()),
                  eP(),
                  (() => {
                    var e, t, n, o, l;
                    let r,
                      s,
                      i,
                      u,
                      d,
                      f,
                      p,
                      m,
                      v,
                      g = a.current,
                      w = ei / eu,
                      x = [
                        g.plant,
                        g.placement,
                        g.scale,
                        g.density,
                        g.seed,
                        w.toFixed(3),
                      ].join("|");
                    if (x === ef) return;
                    ((ef = x),
                      (e = g.plant),
                      (t = g.placement),
                      (n = w),
                      (o = c(g.scale, 0.3, 2.5) * eE()),
                      (l = c(g.density, 0.2, 1.6)),
                      (s =
                        ((r =
                          (Math.floor(
                            Math.abs(
                              7919 * Math.round(g.seed) +
                                131 * e.length +
                                17 * t.length,
                            ),
                          ) %
                            0x7ffffffe) +
                          1),
                        () =>
                          ((r = (16807 * r) % 0x7fffffff) - 1) / 0x7ffffffe)),
                      (u = (i = b[t] ?? b["top-right"]).x < 0 ? -1 : 1),
                      (d = i.y < 0 ? -1 : 1),
                      (f = c(0.5 + 0.5 * l, 0.25, 1)),
                      (p = 0.82 + 0.18 * c(l, 0.3, 1.6)),
                      (m = i.x * (n / 2 + 0.05)),
                      (v = 1 === i.y || -1 === i.y ? 0.56 * i.y : i.y),
                      (ec = (y[e] ?? y.ficus).map((t, a) => {
                        let n = i.angle + Math.PI / 2,
                          l = t.spread * o,
                          r = {
                            base: [
                              m + Math.cos(n) * l * 0.6,
                              v +
                                Math.sin(n) *
                                  l *
                                  0.6 *
                                  (1 > Math.abs(i.y) ? 1 : 0.4),
                            ],
                            angle: i.angle + t.offset * u * d,
                            length: t.length * o * (0.92 + 0.16 * s()),
                            segments: t.segments,
                            curl: t.curl * u * d,
                            droop: t.droop,
                            depth: t.depth,
                            phase: s() * h + a,
                            thickness:
                              "palm" === e
                                ? 0.0036
                                : "fern" === e
                                  ? 0.0028
                                  : 0.0042,
                            leaves: [],
                            bend: 0,
                            velocity: 0,
                            kick: 0,
                            kickAt: 0,
                          },
                          g = t.segments;
                        for (let t = 1; t <= g; t++) {
                          let a = t / g;
                          for (let n of t === g ? [0] : [-1, 1])
                            if (!(0 !== n && s() > f))
                              if ("ficus" === e) {
                                if (
                                  0 !== n &&
                                  (t + +(n > 0)) % 2 == 0 &&
                                  0.35 > s()
                                )
                                  continue;
                                r.leaves.push({
                                  at: t,
                                  side: n,
                                  length:
                                    (0.13 + 0.08 * s()) *
                                    o *
                                    p *
                                    (0 === n ? 1.12 : 1),
                                  width: 0.4 + 0.14 * s(),
                                  tilt: 0 === n ? 0 : 0.62 + 0.45 * s(),
                                  droop: 0.22,
                                  flutter: s() * h,
                                  rate: 1.1 + 1.1 * s(),
                                  kind: 0,
                                });
                              } else if ("olive" === e)
                                r.leaves.push({
                                  at: t,
                                  side: n,
                                  length: (0.095 + 0.05 * s()) * o * p,
                                  width: 0.15 + 0.06 * s(),
                                  tilt: 0 === n ? 0 : 0.42 + 0.32 * s(),
                                  droop: 0.12,
                                  flutter: s() * h,
                                  rate: 1.6 + 1.4 * s(),
                                  kind: 0,
                                });
                              else if ("fern" === e) {
                                let e =
                                  Math.pow(
                                    Math.sin(Math.PI * c(0.9 * a + 0.08, 0, 1)),
                                    0.85,
                                  ) *
                                  (1 - 0.35 * a);
                                r.leaves.push({
                                  at: t,
                                  side: n,
                                  length:
                                    (0.03 + 0.11 * e) *
                                    o *
                                    p *
                                    (0.92 + 0.16 * s()),
                                  width: 0.3 + 0.08 * s(),
                                  tilt: 0 === n ? 0 : 1.05 + 0.12 * s(),
                                  droop: 0.18,
                                  flutter: s() * h,
                                  rate: 1.6 + 1.4 * s(),
                                  kind: 0,
                                });
                              } else {
                                let e = Math.pow(
                                  Math.sin(Math.PI * c(0.94 * a + 0.04, 0, 1)),
                                  0.7,
                                );
                                r.leaves.push({
                                  at: t,
                                  side: n,
                                  length:
                                    (0.06 + 0.2 * e) *
                                    o *
                                    p *
                                    (0.92 + 0.16 * s()),
                                  width: 0.11 + 0.04 * s(),
                                  tilt: 0 === n ? 0 : 0.92 + 0.18 * s(),
                                  droop: 0.38,
                                  flutter: s() * h,
                                  rate: 1.8 + 1.6 * s(),
                                  kind: 0,
                                });
                              }
                        }
                        return r;
                      })));
                    let S = 0;
                    for (let e of ((ep.x = 0), (ep.y = 0), ec)) {
                      let t = e.length;
                      ((ep.x +=
                        (e.base[0] + Math.cos(e.angle) * e.length * 0.55) * t),
                        (ep.y +=
                          (e.base[1] + Math.sin(e.angle) * e.length * 0.55) *
                          t),
                        (S += t));
                    }
                    S > 0 && ((ep.x /= S), (ep.y /= S));
                  })());
                let k = !g.paused && !S;
                k &&
                  ((ex += w),
                  (ey +=
                    w *
                    c(g.windSpeed, 0, 4) *
                    (1 + 0.8 * Math.min(Math.hypot(eS.x, eS.y), 1.5) + eb)));
                let C = Math.exp(-w / 1.3);
                ((eS.x *= C),
                  (eS.y *= C),
                  (eb *= Math.exp(-w / 1.6)) < 0.001 && (eb = 0),
                  eC < 0 && ((eC = x), (eM = S || !g.intro)));
                let M = 1;
                !eM && (M = f((x - eC) / 2.4)) >= 1 && (eM = !0);
                let W = S ? 0 : c(g.clouds, 0, 1),
                  j =
                    W > 0
                      ? f(
                          (Math.sin(0.037 * ex + 1.3) * Math.sin(0.023 * ex) -
                            0.25) /
                            0.45,
                        )
                      : 0,
                  F = M * (1 - 0.6 * W * j);
                (((e, t, n) => {
                  let o = a.current,
                    l = t ? 0 : c(o.wind, 0, 2),
                    r = c(o.softness, 0, 3),
                    s = c(o.depth, 0, 1.5),
                    i =
                      0.55 +
                      0.45 * Math.sin(0.21 * ey) * Math.sin(0.13 * ey + 1.1),
                    u = 0,
                    d = 0;
                  for (let a of ec) {
                    let f = -Math.sin(a.angle),
                      m = Math.cos(a.angle),
                      v = eS.x * f + eS.y * m,
                      g = l * eR(ey, a.phase) * i * 0.16 + 0.3 * v;
                    a.kick > 0 &&
                      ez() >= a.kickAt &&
                      !t &&
                      ((a.velocity +=
                        a.kick *
                        (a.angle > -Math.PI / 2 && a.angle < Math.PI / 2
                          ? 1
                          : -1) *
                        0.55),
                      (a.kick = 0));
                    let w = h / (1.5 + 0.9 * a.depth + 0.4 * a.length);
                    if (t) ((a.bend = 0), (a.velocity = 0));
                    else {
                      let t = Math.max(1, Math.ceil(120 * e)),
                        n = e / t;
                      for (let e = 0; e < t; e++)
                        ((a.velocity +=
                          (w * w * (g - a.bend) - 0.6 * w * a.velocity) * n),
                          (a.bend += a.velocity * n));
                    }
                    let x = a.depth * s,
                      y =
                        (0.0016 + 0.028 * x * x + 0.004 * x) *
                        (0.3 + 0.7 * r) *
                        n,
                      b = c(0.98 - 0.36 * x, 0.3, 1),
                      S = a.length / a.segments,
                      k = a.base[0],
                      C = a.base[1],
                      M = a.angle,
                      W = [[k, C, M]];
                    for (let e = 1; e <= a.segments; e++) {
                      let n = e / a.segments,
                        r = Math.pow(n, 1.4);
                      M += (a.curl / a.segments) * 2;
                      let s =
                          (M += p(-Math.PI / 2 - M) * a.droop * 0.5) +
                          a.bend * r * 0.9 +
                          (t
                            ? 0
                            : 0.012 * l * Math.sin(3.1 * ey + e + a.phase)),
                        i = k + Math.cos(s) * S,
                        u = C + Math.sin(s) * S;
                      (d < 96 &&
                        (R.set([k, C, i, u], 4 * d),
                        D.set(
                          [
                            a.thickness *
                              (1.25 - 0.8 * n) *
                              c(o.scale, 0.3, 2.5) *
                              eE(),
                            y,
                            b,
                            0,
                          ],
                          4 * d,
                        ),
                        d++),
                        (k = i),
                        (C = u),
                        W.push([k, C, s]));
                    }
                    for (let e of a.leaves) {
                      if (u >= 192) break;
                      let a = W[Math.min(e.at, W.length - 1)],
                        n = t
                          ? 0
                          : Math.sin(ey * e.rate + e.flutter) *
                            (0.05 + 0.22 * Math.abs(g) * 6) *
                            l,
                        o =
                          a[2] +
                          (0 === e.side
                            ? e.tilt + 0.6 * n
                            : e.side * (e.tilt + n));
                      o += p(-Math.PI / 2 - o) * e.droop * 0.35;
                      let r = 0.55 * e.length,
                        s = a[0] + Math.cos(o) * r,
                        i = a[1] + Math.sin(o) * r;
                      (B.set([s, i, o, e.length], 4 * u),
                        P.set([e.width, y, b, e.kind], 4 * u),
                        u++);
                    }
                  }
                  ((L.instanceCount = u),
                    (U.instanceCount = d),
                    (E.needsUpdate = !0),
                    (I.needsUpdate = !0),
                    (H.needsUpdate = !0),
                    (O.needsUpdate = !0));
                })(w, S, (1 + 1.6 * W * j) * (1 + 2.6 * (1 - M))),
                  (t = 1 + 0.8 * W * j + 1.5 * (1 - M)),
                  (r =
                    "on" === (l = (o = a.current).window) ||
                    ("auto" === l && !em)),
                  (Y.uWindowOn.value = r ? 1 : 2 * !em),
                  (i = b[o.placement] ?? b["top-right"]),
                  (d =
                    (ei / eu) * 0.5 -
                    0.35 *
                      (u = c(o.windowSize, 0.2, 2) * eE() * (r ? 1 : 1.25))),
                  Y.uWindow.value.set(
                    c(0.68 * ep.x, -Math.max(d, 0), Math.max(d, 0)),
                    c(0.62 * ep.y, -0.32, 0.32),
                    u,
                    (0.018 + 0.03 * c(o.softness, 0, 3)) * t,
                  ),
                  (Y.uWindowAngle.value =
                    (c(o.windowAngle, -90, 90) *
                      Math.PI *
                      i.x *
                      (i.y < 0 ? -1 : 1)) /
                    180),
                  ((e) => {
                    let t = a.current;
                    if (
                      (n.setRenderTarget(ee),
                      n.setClearColor(0, 0),
                      n.clear(),
                      n.render(G, s),
                      em)
                    ) {
                      ((en.uniforms.uSun.value = e),
                        (en.uniforms.uStrength.value = c(
                          t.shadowStrength,
                          0,
                          1.5,
                        )),
                        (en.uniforms.uGrain.value = c(t.grain, 0, 1)),
                        (en.uniforms.uTime.value = ex),
                        (v.material = en),
                        n.setRenderTarget(null),
                        n.render(m, s));
                      return;
                    }
                    ((eo.uniforms.uSun.value = e),
                      (eo.uniforms.uIntensity.value = c(t.intensity, 0, 4)),
                      (v.material = eo),
                      n.setRenderTarget(et),
                      n.render(m, s));
                    let o = c(t.bloom, 0, 2);
                    if (o > 0) {
                      v.material = el;
                      let e = et;
                      for (let t of ea)
                        ((el.uniforms.uSource.value = e.texture),
                          el.uniforms.uTexel.value.set(
                            1 / e.width,
                            1 / e.height,
                          ),
                          n.setRenderTarget(t),
                          n.render(m, s),
                          (e = t));
                      v.material = er;
                      for (let e = ea.length - 1; e > 0; e--) {
                        let t = ea[e];
                        ((er.uniforms.uSource.value = t.texture),
                          er.uniforms.uTexel.value.set(
                            1 / t.width,
                            1 / t.height,
                          ),
                          n.setRenderTarget(ea[e - 1]),
                          n.render(m, s));
                      }
                    }
                    ((es.uniforms.uBloomStrength.value = 0.6 * o),
                      (es.uniforms.uGrain.value = c(t.grain, 0, 1)),
                      (es.uniforms.uTime.value = ex),
                      (v.material = es),
                      n.setRenderTarget(null),
                      n.render(m, s));
                  })(F));
                let T =
                  Math.abs(eS.x) + Math.abs(eS.y) > 0.001 ||
                  eb > 0 ||
                  ec.some(
                    (e) =>
                      Math.abs(e.velocity) > 1e-4 ||
                      Math.abs(e.bend) > 1e-4 ||
                      e.kick > 0,
                  );
                (k || !eM || T) && eI();
              }
              let eH = (t) => {
                  let n = a.current;
                  if (!n.breeze || n.reduced) return;
                  let o = e.getBoundingClientRect(),
                    l = t.clientX - o.left,
                    r = t.clientY - o.top,
                    s = performance.now();
                  if (ek) {
                    let e = Math.max((s - ek.t) / 1e3, 1 / 240),
                      t = 1 / Math.max(eu, 1),
                      a = ((l - ek.x) * t) / e,
                      n = (-(r - ek.y) * t) / e,
                      o = 0.35 * c(e / 0.12, 0, 1);
                    ((eS.x += (c(a, -4, 4) - eS.x) * o),
                      (eS.y += (c(n, -4, 4) - eS.y) * o));
                    let i = Math.hypot(eS.x, eS.y);
                    i > 2 && ((eS.x *= 2 / i), (eS.y *= 2 / i));
                  }
                  ((ek = { x: l, y: r, t: s }), eI());
                },
                eO = () => {
                  ek = null;
                },
                e_ = (e) => {
                  if (!a.current.breeze || !e.isPrimary || e.button > 0) return;
                  let t = e.target;
                  (t instanceof Element &&
                    t.closest(
                      "a,button,input,textarea,select,label,[role=button]",
                    )) ||
                    eU(0.9);
                };
              (e.addEventListener("pointermove", eH),
                e.addEventListener("pointerleave", eO),
                e.addEventListener("pointerdown", e_));
              let eq = new ResizeObserver(() => {
                eA() && eI();
              });
              eq.observe(e);
              let eN =
                "undefined" == typeof IntersectionObserver
                  ? null
                  : new IntersectionObserver(
                      ([e]) => {
                        (ej = e.isIntersecting)
                          ? ((eL = 0), eI())
                          : (eW && cancelAnimationFrame(eW), (eW = 0));
                      },
                      { rootMargin: "80px" },
                    );
              eN ? eN.observe(e) : (ej = !0);
              let eG = (e) => {
                  (e.preventDefault(),
                    (eT = !0),
                    eW && cancelAnimationFrame(eW),
                    (eW = 0));
                },
                eV = () => {
                  ((eT = !1), (eg = ""), eI());
                };
              return (
                r.addEventListener("webglcontextlost", eG),
                r.addEventListener("webglcontextrestored", eV),
                eA(),
                eB(),
                eP(),
                eI(),
                {
                  sync: () => {
                    (eA(), eB(), eI());
                  },
                  gust: eU,
                  replay: () => {
                    ((eC = -1), (eM = !1), eI());
                  },
                  destroy: () => {
                    ((eF = !0),
                      eW && cancelAnimationFrame(eW),
                      eN?.disconnect(),
                      eq.disconnect(),
                      e.removeEventListener("pointermove", eH),
                      e.removeEventListener("pointerleave", eO),
                      e.removeEventListener("pointerdown", e_),
                      r.removeEventListener("webglcontextlost", eG),
                      r.removeEventListener("webglcontextrestored", eV),
                      ee.dispose(),
                      et.dispose(),
                      ea.forEach((e) => e.dispose()),
                      [q, N, en, eo, el, er, es].forEach((e) => e.dispose()),
                      L.dispose(),
                      U.dispose(),
                      d.dispose(),
                      n.dispose(),
                      n.getContext().isContextLost() || n.forceContextLoss(),
                      r.remove());
                  },
                }
              );
            })(e, t, en);
            return (
              (et.current = a),
              () => {
                (a?.destroy(), (et.current = null));
              }
            );
          }, []),
          (0, o.useImperativeHandle)(
            Q,
            () => ({
              gust: (e) => et.current?.gust(e),
              replay: () => et.current?.replay(),
            }),
            [],
          ));
        let eo = P.trim().toLowerCase();
        return (0, n.jsxs)("div", {
          ref: J,
          className: (0, d.cn)(
            "relative isolate h-full min-h-[320px] w-full overflow-hidden",
            Z,
          ),
          style: {
            backgroundColor: "transparent" === eo || "" === eo ? void 0 : P,
            ...$,
          },
          children: [
            (0, n.jsx)("div", {
              ref: ee,
              "aria-hidden": "true",
              style: { position: "absolute", inset: 0, zIndex: 0 },
            }),
            X
              ? (0, n.jsx)("div", {
                  style: { position: "relative", zIndex: 1, height: "100%" },
                  children: X,
                })
              : null,
          ],
        });
      });
    B.displayName = "DappledLight";
    let P = {
        ficus: {
          plant: "ficus",
          placement: "top-right",
          window: "auto",
          scale: 1,
          density: 1,
          depth: 0.7,
          softness: 1,
          shadowStrength: 1,
          wind: 0.6,
          clouds: 0.25,
          warm: !1,
        },
        olive: {
          plant: "olive",
          placement: "top-left",
          window: "auto",
          scale: 1.05,
          density: 1,
          depth: 0.7,
          softness: 1,
          shadowStrength: 1,
          wind: 0.7,
          clouds: 0.25,
          warm: !1,
        },
        palm: {
          plant: "palm",
          placement: "top-right",
          window: "auto",
          scale: 1.15,
          density: 1,
          depth: 0.7,
          softness: 1,
          shadowStrength: 1,
          wind: 0.6,
          clouds: 0.25,
          warm: !1,
        },
        fern: {
          plant: "fern",
          placement: "right",
          window: "auto",
          scale: 1,
          density: 1,
          depth: 0.7,
          softness: 1,
          shadowStrength: 1,
          wind: 0.6,
          clouds: 0.25,
          warm: !1,
        },
        golden: {
          plant: "palm",
          placement: "top-right",
          window: "on",
          scale: 1.2,
          density: 1,
          depth: 0.7,
          softness: 1.1,
          shadowStrength: 1,
          wind: 0.5,
          clouds: 0.15,
          warm: !0,
        },
        sunroom: {
          plant: "ficus",
          placement: "top-right",
          window: "on",
          scale: 1,
          density: 1,
          depth: 0.7,
          softness: 1,
          shadowStrength: 1,
          wind: 0.6,
          clouds: 0.25,
          warm: !1,
        },
        overcast: {
          plant: "olive",
          placement: "bottom-right",
          window: "auto",
          scale: 1.1,
          density: 1.1,
          depth: 0.9,
          softness: 2.4,
          shadowStrength: 0.7,
          wind: 0.8,
          clouds: 0.8,
          warm: !1,
        },
      },
      E = [
        { label: "Ficus", value: "ficus" },
        { label: "Olive", value: "olive" },
        { label: "Palm", value: "palm" },
        { label: "Fern", value: "fern" },
        { label: "Golden Hour", value: "golden" },
        { label: "Sunroom", value: "sunroom" },
        { label: "Overcast", value: "overcast" },
      ],
      I = [
        { label: "Ficus", value: "ficus" },
        { label: "Olive", value: "olive" },
        { label: "Palm", value: "palm" },
        { label: "Fern", value: "fern" },
      ],
      U = [
        { label: "Top Right", value: "top-right" },
        { label: "Top Left", value: "top-left" },
        { label: "Right", value: "right" },
        { label: "Left", value: "left" },
        { label: "Bottom Right", value: "bottom-right" },
        { label: "Bottom Left", value: "bottom-left" },
      ],
      R = [
        { label: "Auto", value: "auto" },
        { label: "On", value: "on" },
        { label: "Off", value: "off" },
      ],
      D = [
        {
          name: "plant",
          type: '"ficus" | "olive" | "palm" | "fern"',
          default: '"ficus"',
          description:
            "The plant casting the shadows. Each has its own branch structure, leaf shape and way of moving in the wind.",
        },
        {
          name: "placement",
          type: '"top-right" | "top-left" | "right" | "left" | "bottom-right" | "bottom-left"',
          default: '"top-right"',
          description:
            "Which edge the plant reaches in from. The rest of the frame stays clear for content.",
        },
        {
          name: "scale",
          type: "number",
          default: "1",
          description:
            "Size of the plant. It scales down automatically on narrow screens.",
        },
        {
          name: "density",
          type: "number",
          default: "1",
          description:
            "How many leaves each branch carries, and how large they are.",
        },
        {
          name: "depth",
          type: "number",
          default: "0.7",
          description:
            "How far apart the branches hang from the wall. Branches farther from the wall cast softer, lighter shadows.",
        },
        {
          name: "softness",
          type: "number",
          default: "1",
          description:
            "Overall softness of the shadows and the window light, like the size of the sun or a hazy sky.",
        },
        {
          name: "shadowStrength",
          type: "number",
          default: "1",
          description: "How dark the shadows are on light backgrounds.",
        },
        {
          name: "lightColor",
          type: "string",
          default: '"auto"',
          description:
            "Colour of the light on dark backgrounds. Auto uses a soft violet.",
        },
        {
          name: "shadowColor",
          type: "string",
          default: '"auto"',
          description:
            "Colour of the shadows on light backgrounds. Auto uses a cool lavender grey.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Background of the component. Light backgrounds get shadows on a sunlit wall; dark backgrounds get light falling into a dark room. Transparent reads the colour behind the component.",
        },
        {
          name: "window",
          type: '"auto" | "on" | "off"',
          default: '"auto"',
          description:
            "Frame the light as a window. Auto uses one on dark backgrounds only. Off on a dark background gives a soft pool of light instead.",
        },
        {
          name: "windowAngle",
          type: "number",
          default: "28",
          description: "Angle of the window light in degrees.",
        },
        {
          name: "windowSize",
          type: "number",
          default: "0.52",
          description:
            "Size of the window light, relative to the component height.",
        },
        {
          name: "intensity",
          type: "number",
          default: "0.9",
          description: "Brightness of the light on dark backgrounds.",
        },
        {
          name: "bloom",
          type: "number",
          default: "0.6",
          description: "Soft glow around the light on dark backgrounds.",
        },
        {
          name: "wind",
          type: "number",
          default: "0.6",
          description:
            "Strength of the breeze moving the plant. 0 holds it still.",
        },
        {
          name: "windSpeed",
          type: "number",
          default: "1",
          description: "Pace of the breeze.",
        },
        {
          name: "clouds",
          type: "number",
          default: "0.25",
          description:
            "How often a cloud passes and softens the light for a moment.",
        },
        {
          name: "breeze",
          type: "boolean",
          default: "true",
          description:
            "Moving the pointer stirs the plant in the direction of travel; clicking sends a gust through the branches.",
        },
        {
          name: "grain",
          type: "number",
          default: "0.25",
          description:
            "Film grain in the light and shadows. The plain background stays clean.",
        },
        {
          name: "seed",
          type: "number",
          default: "1",
          description: "Varies the arrangement of the leaves.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "Bring the light and shadows into focus when the component first appears.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops the breeze. Reduced-motion users get still shadows.",
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
            "Content laid over the light, such as a hero headline. Clicks on its links and buttons never send gusts.",
        },
        {
          name: "ref",
          type: "{ gust, replay }",
          default: "—",
          description:
            "gust(strength?) sends a gust through the plant; replay() replays the intro.",
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
      H = () => {
        let [e, t] = (0, s.I)(),
          a = (0, r.Y)(),
          [i, u] = (0, o.useState)("ficus"),
          [d, h] = (0, o.useState)(P.ficus),
          c = (e) => (t) => h((a) => ({ ...a, [e]: t })),
          [f, p] = (0, o.useState)(null),
          [m, v] = (0, o.useState)(null),
          [g, w] = (0, o.useState)(null),
          x = f ?? (d.warm ? "#FFB27A" : "#8F7DFF"),
          y = m ?? (d.warm ? "#C8B6A6" : "#B5B0D1"),
          b = g ?? ("dark" === a ? "#0A0A0A" : "#FFFFFF"),
          [S, k] = (0, o.useState)(28),
          [C, M] = (0, o.useState)(0.52),
          [W, L] = (0, o.useState)(0.9),
          [j, F] = (0, o.useState)(0.6),
          [T, z] = (0, o.useState)(1),
          [A, H] = (0, o.useState)(0.25),
          [O, _] = (0, o.useState)(1),
          [q, N] = (0, o.useState)(!0),
          [G, V] = (0, o.useState)(!0),
          [K, Y] = (0, o.useState)(!1);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(l.Bg, {}),
            (0, n.jsxs)(l.VX, {
              children: [
                (0, n.jsxs)(l.Ec, {
                  children: [
                    (0, n.jsx)(l.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, n.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, n.jsx)(
                          B,
                          {
                            plant: d.plant,
                            placement: d.placement,
                            scale: d.scale,
                            density: d.density,
                            depth: d.depth,
                            softness: d.softness,
                            shadowStrength: d.shadowStrength,
                            lightColor: x,
                            shadowColor: y,
                            backgroundColor: b,
                            window: d.window,
                            windowAngle: S,
                            windowSize: C,
                            intensity: W,
                            bloom: j,
                            wind: d.wind,
                            windSpeed: T,
                            clouds: d.clouds,
                            breeze: q,
                            grain: A,
                            seed: O,
                            intro: G,
                            paused: K,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(l.IH, {
                      children: [
                        (0, n.jsx)(l.bg, {
                          title: "Preset",
                          value: i,
                          options: E,
                          onChange: (e) => {
                            (u(e), h(P[e] ?? P.ficus), p(null), v(null));
                          },
                        }),
                        (0, n.jsx)(l.bg, {
                          title: "Plant",
                          value: d.plant,
                          options: I,
                          onChange: (e) => c("plant")(e),
                        }),
                        (0, n.jsx)(l.bg, {
                          title: "Placement",
                          value: d.placement,
                          options: U,
                          onChange: (e) => c("placement")(e),
                        }),
                        (0, n.jsx)(l.bg, {
                          title: "Window",
                          value: d.window,
                          options: R,
                          onChange: (e) => c("window")(e),
                        }),
                        (0, n.jsx)(l.W7, {
                          title: "Light Color",
                          value: x,
                          onChange: p,
                        }),
                        (0, n.jsx)(l.W7, {
                          title: "Shadow Color",
                          value: y,
                          onChange: v,
                        }),
                        (0, n.jsx)(l.W7, {
                          title: "Background",
                          value: b,
                          onChange: w,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Scale",
                          min: 0.4,
                          max: 2,
                          step: 0.01,
                          value: d.scale,
                          onChange: c("scale"),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Density",
                          min: 0.3,
                          max: 1.5,
                          step: 0.01,
                          value: d.density,
                          onChange: c("density"),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Depth",
                          min: 0,
                          max: 1.4,
                          step: 0.01,
                          value: d.depth,
                          onChange: c("depth"),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Softness",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: d.softness,
                          onChange: c("softness"),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Shadow Strength",
                          min: 0,
                          max: 1.4,
                          step: 0.01,
                          value: d.shadowStrength,
                          onChange: c("shadowStrength"),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Window Angle",
                          min: -60,
                          max: 60,
                          step: 1,
                          value: S,
                          valueUnit: "\xb0",
                          onChange: k,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Window Size",
                          min: 0.3,
                          max: 1.4,
                          step: 0.01,
                          value: C,
                          onChange: M,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Intensity",
                          min: 0.2,
                          max: 2.5,
                          step: 0.01,
                          value: W,
                          onChange: L,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Bloom",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: j,
                          onChange: F,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Wind",
                          min: 0,
                          max: 1.6,
                          step: 0.01,
                          value: d.wind,
                          onChange: c("wind"),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Wind Speed",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: T,
                          onChange: z,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Clouds",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.clouds,
                          onChange: c("clouds"),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Grain",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: A,
                          onChange: H,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Seed",
                          min: 1,
                          max: 20,
                          step: 1,
                          value: O,
                          onChange: _,
                        }),
                        (0, n.jsx)(l.tl, {
                          title: "Breeze",
                          checked: q,
                          onChange: N,
                        }),
                        (0, n.jsx)(l.tl, {
                          title: "Intro",
                          checked: G,
                          onChange: V,
                        }),
                        (0, n.jsx)(l.tl, {
                          title: "Paused",
                          checked: K,
                          onChange: Y,
                        }),
                      ],
                    }),
                    (0, n.jsx)(l.Ub, { data: D }),
                  ],
                }),
                (0, n.jsx)(l.lT, { children: (0, n.jsx)(l.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
