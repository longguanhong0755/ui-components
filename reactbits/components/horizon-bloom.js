/* ReactBits Pro public preview module 82734 for horizon-bloom.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/82734.d87e7cc471474dee.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  82734: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => E }));
    var a = r(95155),
      o = r(12115),
      n = r(56388),
      i = r(86049),
      l = r(90761),
      u = r(2253),
      s = r(12246),
      c = r(90650);
    let d = (e, t, r) => Math.min(r, Math.max(t, e)),
      h = (e, t) => (Number.isFinite(e) ? e : t),
      m = new u.Q1f(),
      p = (e) => {
        let t = e.trim().toLowerCase();
        if (!t || "transparent" === t || "none" === t || "auto" === t)
          return null;
        try {
          m.setStyle(t, u.jf0);
        } catch {
          return null;
        }
        return [m.r, m.g, m.b];
      },
      f = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      v = (e) =>
        e <= 0.0031308 ? 12.92 * e : 1.055 * Math.pow(e, 1 / 2.4) - 0.055,
      g = ([e, t, r]) => {
        let a = f(e),
          o = f(t),
          n = f(r),
          i = Math.cbrt(0.4122214708 * a + 0.5363325363 * o + 0.0514459929 * n),
          l = Math.cbrt(0.2119034982 * a + 0.6806995451 * o + 0.1073969566 * n),
          u = Math.cbrt(0.0883024619 * a + 0.2817188376 * o + 0.6299787005 * n);
        return [
          0.2104542553 * i + 0.793617785 * l - 0.0040720468 * u,
          1.9779984951 * i - 2.428592205 * l + 0.4505937099 * u,
          0.0259040371 * i + 0.7827717662 * l - 0.808675766 * u,
        ];
      },
      x = ([e, t, r]) => {
        let a = Math.pow(e + 0.3963377774 * t + 0.2158037573 * r, 3),
          o = Math.pow(e - 0.1055613458 * t - 0.0638541728 * r, 3),
          n = Math.pow(e - 0.0894841775 * t - 1.291485548 * r, 3);
        return [
          d(v(4.0767416621 * a - 3.3077115913 * o + 0.2309699292 * n), 0, 1),
          d(v(-1.2684380046 * a + 2.6097574011 * o - 0.3413193965 * n), 0, 1),
          d(v(-0.0041960863 * a - 0.7034186147 * o + 1.707614701 * n), 0, 1),
        ];
      },
      b = (e, t, r) => [
        e[0] + (t[0] - e[0]) * r,
        e[1] + (t[1] - e[1]) * r,
        e[2] + (t[2] - e[2]) * r,
      ],
      w = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      y = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      k = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      C = `
uniform vec2 uRes;
uniform float uTime;
uniform float uRoll;
uniform float uApex;
uniform float uRadius;
uniform float uSunArc;
uniform float uSpread;
uniform float uSunUp;
uniform float uAtmo;
uniform float uThick;
uniform float uRimGain;
uniform float uFlare;
uniform float uAirglow;
uniform float uClouds;
uniform float uStars;
uniform float uAuroraGain;
uniform vec4 uAuroras[8];
uniform float uInk;
uniform vec3 uRimColor;
uniform vec3 uInner;
uniform vec3 uMid;
uniform vec3 uOuter;
uniform vec3 uGlowColor;
uniform vec3 uSunColor;
uniform vec3 uStarColor;
varying vec2 vUv;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 starField(vec2 p) {
  vec3 c = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float scale = k == 0 ? 70.0 : 130.0;
    vec2 g = p * scale + float(k) * 17.3;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(id);
    vec2 offset = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
    float twinkle = 0.6 + 0.4 * sin(uTime * (1.0 + 3.0 * hash(id + 1.3)) + h * 50.0);
    float b = pow(h, 30.0) * twinkle;
    float d = length(f - offset * 0.7);
    c += uStarColor * b * exp(-d * d * 300.0) * (k == 0 ? 0.9 : 0.45);
  }
  return c;
}

void main() {
  vec2 frag = vUv * uRes;
  vec2 screen = (frag - 0.5 * uRes) / uRes.y;
  float cr = cos(uRoll);
  float sr = sin(uRoll);
  vec2 p = mat2(cr, -sr, sr, cr) * screen;
  float px = 1.0 / uRes.y;
  vec2 center = vec2(0.0, uApex - uRadius);
  vec2 q = p - center;
  float h = length(q) - uRadius;
  float arc = atan(q.x, q.y) * uRadius;
  float d = arc - uSunArc;
  float lit = exp(-d * d / (2.0 * uSpread * uSpread));
  float wide = exp(-d * d / (10.0 * uSpread * uSpread));
  float hot = exp(-d * d / (2.0 * 0.034 * 0.034));
  float halo = exp(-d * d / (2.0 * 0.17 * 0.17));
  float thick = uThick;
  float sunk = 1.0 - 0.8 * uInk;
  vec3 col = vec3(0.0);
  if (h > 0.0) {
    float rim = exp(-h / max(0.0012, px * 0.9));
    float inner = exp(-h / (0.007 * thick));
    float mid = exp(-h / (0.024 * thick));
    float outer = exp(-h / (0.07 * thick));
    col += lit * (rim * uRimColor * 2.2 * uRimGain + inner * uInner * 0.7 * uAtmo);
    col += wide * (mid * uMid * 0.2 + outer * uOuter * 0.055) * uAtmo;
    float layer = h - 0.042 * thick;
    float band = exp(-layer * layer / (0.00005 * thick * thick));
    if (uAirglow > 0.0 && band > 0.0001) {
      band *= 0.35 + 0.65 * fbm(vec2(arc * 9.0 - uTime * 0.04, uTime * 0.02));
      col += band * uGlowColor * 0.05 * (0.2 + 0.8 * wide) * uAirglow;
    }
    col += sunk * hot * uSunUp * (exp(-h / 0.003) * uSunColor * 4.0 + exp(-h / (0.016 * thick)) * uInner * 0.7);
    col += halo * uSunUp * (exp(-h / (0.045 * thick)) * uInner * 0.2 + exp(-h / (0.12 * thick)) * uMid * 0.06) * uAtmo;
    if (uStars > 0.0 && uInk < 0.5) col += starField(p) * smoothstep(0.04, 0.2, h) * (1.0 - 0.8 * wide) * uStars;
  } else {
    col += lit * exp(h / max(0.0008, px * 0.6)) * uRimColor * 1.1 * uRimGain;
    col += sunk * hot * uSunUp * exp(h / 0.005) * uMid * 0.3;
    if (uClouds > 0.0 && h > -0.12) {
      float tops = fbm(vec2(arc * 22.0 + uTime * 0.01, h * 160.0 + arc * 6.0));
      float catchLight = smoothstep(0.52, 0.78, tops) * exp(h / 0.018) * smoothstep(-0.12, -0.07, h) * lit;
      col += catchLight * mix(uMid, uInner, halo) * 0.14 * uClouds * uSunUp;
    }
  }
  vec2 sun = center + uRadius * vec2(sin(uSunArc / uRadius), cos(uSunArc / uRadius));
  float rs = length(p - sun);
  float crest = smoothstep(-0.0015, 0.0015, h);
  col += uSunUp * uSunUp * uFlare * sunk * (exp(-rs / 0.005) * uSunColor * 2.0 * crest + exp(-rs / 0.05) * uInner * 0.07);
  if (h > 0.0 && h < 0.42) {
    for (int i = 0; i < 8; i++) {
      vec4 aurora = uAuroras[i];
      if (aurora.z <= 0.0) continue;
      float age = aurora.y;
      float width = 0.09 + 0.12 * smoothstep(0.0, 2.5, age);
      float dc = arc - aurora.x;
      if (abs(dc) > width * 3.0) continue;
      float span = max(exp(-dc * dc / (2.0 * width * width)) - 0.0111, 0.0) / 0.9889;
      float envelope = smoothstep(0.0, 1.4, age) * (1.0 - smoothstep(2.6, 6.6, age)) * aurora.z;
      float drift = uTime * 0.03 + aurora.w;
      float fine = noise(vec2(arc * 140.0 + drift * 5.0, aurora.w + age * 0.15));
      float fold = noise(vec2(arc * 30.0 - drift * 2.0, aurora.w + 4.0));
      float rays = (0.2 + 0.8 * fine * fine) * (0.45 + 0.55 * fold);
      float reach = (0.04 + 0.08 * noise(vec2(arc * 46.0 + aurora.w * 3.0, drift * 0.5))) * (0.5 + 0.5 * smoothstep(0.0, 2.2, age));
      float base = 0.007 + 0.004 * fold;
      float lower = smoothstep(base * 0.4, base + 0.006, h);
      float y = max(h - base, 0.0);
      float body = exp(-y / reach) * (1.0 - smoothstep(0.12, 0.38, h));
      float glow = exp(-y / 0.02) * 0.2;
      vec3 tint = mix(uInner, uMid, smoothstep(0.0, 0.05, y));
      tint = mix(tint, uOuter, smoothstep(0.05, 0.16, y));
      col += span * lower * (body * rays + glow * (0.5 + 0.5 * fold)) * envelope * tint * 0.9 * uAuroraGain;
    }
  }
  if (uInk > 0.5) {
    float peak = max(col.r, max(col.g, col.b));
    float alpha = 1.0 - exp(-peak * 1.5);
    gl_FragColor = vec4(col / max(peak, 0.0001) * alpha, alpha);
  } else {
    gl_FragColor = vec4(col, 1.0);
  }
}
`,
      S = `
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;
vec3 tap(vec2 d) {
  vec3 c = texture2D(uSource, vUv + d * uTexel).rgb;
  float peak = max(c.r, max(c.g, c.b));
  return c * (max(peak - uThreshold, 0.0) / max(peak, 0.0001));
}
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
      F = `
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
      R = `
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform vec2 uResolution;
uniform float uBloomStrength;
uniform float uGrain;
uniform float uTime;
uniform float uInk;
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
  float n = hash(gl_FragCoord.xy + fract(uTime * 13.0) * 911.0) - 0.5;
  if (uInk > 0.5) {
    vec4 scene = texture2D(uScene, vUv);
    float cover = clamp(scene.a, 0.0, 1.0);
    vec3 ink = scene.rgb / max(scene.a, 0.0001);
    vec3 color = mix(uBackground, ink, cover);
    color += n * uGrain * 0.05 * smoothstep(0.0, 0.05, cover);
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    return;
  }
  vec2 c = vUv - 0.5;
  vec2 shift = c * 1.2 / uResolution.y;
  vec3 emission;
  emission.r = texture2D(uScene, vUv + shift).r;
  emission.g = texture2D(uScene, vUv).g;
  emission.b = texture2D(uScene, vUv - shift).b;
  emission += texture2D(uBloom, vUv).rgb * uBloomStrength;
  vec3 light = neutral(max(emission, 0.0));
  light = pow(light, vec3(1.0 / 2.2));
  vec3 color = 1.0 - (1.0 - uBackground) * (1.0 - light);
  float l = max(light.r, max(light.g, light.b));
  float mask = smoothstep(0.0, 0.04, l);
  color += n * uGrain * 0.1 * mask;
  color += (hash(gl_FragCoord.xy * 1.7) - 0.5) / 255.0 * mask;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`,
      M = (0, o.forwardRef)(function (
        {
          colors: e = ["#FF9FFC", "#5227FF"],
          backgroundColor: t = "transparent",
          horizon: r = 0.72,
          curvature: n = 1,
          tilt: i = 0,
          sunPosition: l = 0.15,
          sunrise: m = 1,
          spread: v = 0.4,
          atmosphere: M = 1,
          thickness: j = 1,
          rim: A = 1,
          flare: T = 1,
          airglow: I = 0.5,
          clouds: E = 0.5,
          stars: z = 0.5,
          aurora: P = 1,
          autoAurora: B = !1,
          speed: U = 0.5,
          drift: L = 0.5,
          parallax: G = 0.5,
          bloom: D = 0.5,
          grain: H = 0.25,
          interactive: N = !0,
          intro: W = !0,
          paused: _ = !1,
          dpr: O = 2,
          children: q,
          className: Y,
          style: X,
        },
        K,
      ) {
        let V = (0, o.useRef)(null),
          Q = (0, o.useRef)(null),
          Z = (0, o.useRef)(null),
          J = {
            colors: e,
            backgroundColor: t,
            horizon: r,
            curvature: n,
            tilt: i,
            sunPosition: l,
            sunrise: m,
            spread: v,
            atmosphere: M,
            thickness: j,
            rim: A,
            flare: T,
            airglow: I,
            clouds: E,
            stars: z,
            aurora: P,
            autoAurora: B,
            speed: U,
            drift: L,
            parallax: G,
            bloom: D,
            grain: H,
            interactive: N,
            intro: W,
            paused: _,
            dpr: O,
            reduced: (0, o.useSyncExternalStore)(w, y, () => !1),
          },
          $ = (0, o.useRef)(J);
        ((0, o.useEffect)(() => {
          (($.current = J), Z.current?.sync());
        }),
          (0, o.useEffect)(() => {
            let e = V.current,
              t = Q.current;
            if (!e || !t) return;
            let r = (function (e, t, r) {
              let a,
                o = e.ownerDocument,
                n = o.defaultView ?? window,
                i = o.createElement("canvas");
              (i.setAttribute("aria-hidden", "true"),
                (i.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block"));
              try {
                a = new s.WebGLRenderer({
                  canvas: i,
                  alpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (t.appendChild(i), (a.autoClear = !1));
              let l = new u.qUd(-1, 1, 1, -1, -1, 1),
                c = new u.bdM(2, 2),
                m = new u.Z58(),
                v = new u.eaF(c);
              ((v.frustumCulled = !1), m.add(v));
              let w = () => ({ value: new u.Pq0(1, 1, 1) }),
                y = Array.from({ length: 8 }, () => new u.IUQ(0, 0, 0, 0)),
                M = new u.BKk({
                  uniforms: {
                    uRes: { value: new u.I9Y(1, 1) },
                    uTime: { value: 0 },
                    uRoll: { value: 0 },
                    uApex: { value: -0.22 },
                    uRadius: { value: 2.4 },
                    uSunArc: { value: 0.2 },
                    uSpread: { value: 0.6 },
                    uSunUp: { value: 1 },
                    uAtmo: { value: 1 },
                    uThick: { value: 1 },
                    uRimGain: { value: 1 },
                    uFlare: { value: 1 },
                    uAirglow: { value: 0.5 },
                    uClouds: { value: 0.5 },
                    uStars: { value: 0.5 },
                    uAuroraGain: { value: 1 },
                    uAuroras: { value: y },
                    uInk: { value: 0 },
                    uRimColor: w(),
                    uInner: w(),
                    uMid: w(),
                    uOuter: w(),
                    uGlowColor: w(),
                    uSunColor: w(),
                    uStarColor: w(),
                  },
                  vertexShader: k,
                  fragmentShader: C,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                j = () =>
                  new u.nWS(1, 1, {
                    type: u.ix0,
                    format: u.GWd,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    minFilter: u.k6q,
                    magFilter: u.k6q,
                    generateMipmaps: !1,
                  }),
                A = j(),
                T = Array.from({ length: 5 }, j),
                I = new u.Pq0(0.04, 0.04, 0.04),
                E = new u.BKk({
                  uniforms: {
                    uSource: { value: null },
                    uTexel: { value: new u.I9Y() },
                    uThreshold: { value: 0 },
                  },
                  vertexShader: k,
                  fragmentShader: S,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                z = new u.BKk({
                  uniforms: {
                    uSource: { value: null },
                    uTexel: { value: new u.I9Y() },
                  },
                  vertexShader: k,
                  fragmentShader: F,
                  blending: u.EZo,
                  transparent: !0,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                P = new u.BKk({
                  uniforms: {
                    uScene: { value: A.texture },
                    uBloom: { value: T[0].texture },
                    uBackground: { value: I },
                    uResolution: { value: new u.I9Y(1, 1) },
                    uBloomStrength: { value: 0.5 },
                    uGrain: { value: 0.25 },
                    uTime: { value: 0 },
                    uInk: { value: 0 },
                  },
                  vertexShader: k,
                  fragmentShader: R,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                B = 0,
                U = 0,
                L = 1,
                G = !1,
                D = "",
                H = !1,
                N = [0.04, 0.04, 0.04],
                W = -10,
                _ = 0,
                O = 0,
                q = -1,
                Y = 1,
                X = 0,
                K = 0,
                V = 0,
                Q = 0,
                Z = 4,
                J = 11,
                $ = 0,
                ee = 0,
                et = !1,
                er = !1,
                ea = !1,
                eo = [],
                en = () => ((J = (16807 * J) % 0x7fffffff) - 1) / 0x7ffffffe,
                ei = (e, t) => {
                  let r = M.uniforms[e].value;
                  H
                    ? r.set(t[0], t[1], t[2])
                    : r.set(f(t[0]), f(t[1]), f(t[2]));
                },
                el = () => {
                  let t = r.current,
                    a = [
                      (N =
                        p(t.backgroundColor) ??
                        (() => {
                          let t = e.parentElement;
                          for (; t;) {
                            let e = n
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
                          let r = n
                            .getComputedStyle(e)
                            .color.match(/rgba?\(([^)]+)\)/);
                          if (r) {
                            let e = r[1]
                              .split(",")
                              .map((e) => Number.parseFloat(e));
                            return e[0] + e[1] + e[2] > 382
                              ? [0.04, 0.04, 0.04]
                              : [1, 1, 1];
                          }
                          return [0.04, 0.04, 0.04];
                        })()).join(","),
                      t.colors[0],
                      t.colors[1],
                    ].join("|");
                  if (a === D) return;
                  ((D = a),
                    (H = 0.2126 * N[0] + 0.7152 * N[1] + 0.0722 * N[2] > 0.55),
                    I.set(N[0], N[1], N[2]));
                  let o = g(p(t.colors[0]) ?? [1, 0.62, 0.99]),
                    i = g(p(t.colors[1]) ?? [0.32, 0.15, 1]),
                    l = (e, t) => {
                      let r = Math.hypot(e[1], e[2]);
                      if (r < 0.02) return [0.8 * t, 0, 0];
                      let a = Math.max(1, 0.15 / r);
                      return [t, e[1] * a, e[2] * a];
                    },
                    u = b(o, i, 0.55),
                    s = b(o, i, 0.35),
                    c = (e, t, r) => [Math.max(e[0], t), e[1] * r, e[2] * r];
                  (H
                    ? (ei("uRimColor", x(l(b(o, i, 0.7), 0.42))),
                      ei("uInner", x(l(o, 0.62))),
                      ei("uMid", x(l(u, 0.55))),
                      ei("uOuter", x(l(i, 0.5))),
                      ei("uGlowColor", x(l(s, 0.58))),
                      ei("uSunColor", x(l(b(o, i, 0.5), 0.48))),
                      ei("uStarColor", x(l(i, 0.5))))
                    : (ei("uRimColor", x(c(o, 0.96, 0.22))),
                      ei("uInner", x(o)),
                      ei("uMid", x(u)),
                      ei("uOuter", x(i)),
                      ei("uGlowColor", x(c(s, 0.78, 0.7))),
                      ei("uSunColor", x(c(o, 0.98, 0.12))),
                      ei("uStarColor", x(c(i, 0.93, 0.15)))),
                    (M.uniforms.uInk.value = +!!H),
                    (P.uniforms.uInk.value = +!!H));
                },
                eu = () => {
                  let t = r.current,
                    o = Math.round(e.clientWidth),
                    i = Math.round(e.clientHeight);
                  if (o < 2 || i < 2) return ((G = !1), !1);
                  let l = Math.min(
                    n.devicePixelRatio || 1,
                    d(h(t.dpr, 2), 0.5, 3),
                  );
                  if (G && o === B && i === U && l === L) return !1;
                  ((G = !0),
                    (B = o),
                    (U = i),
                    (L = l),
                    a.setPixelRatio(L),
                    a.setSize(B, U, !1));
                  let u = Math.round(B * L),
                    s = Math.round(U * L);
                  A.setSize(u, s);
                  let c = u,
                    m = s;
                  for (let e of T)
                    ((c = Math.max(1, Math.round(c / 2))),
                      (m = Math.max(1, Math.round(m / 2))),
                      e.setSize(c, m));
                  return (
                    M.uniforms.uRes.value.set(u, s),
                    P.uniforms.uResolution.value.set(u, s),
                    !0
                  );
                },
                es = () =>
                  (2.4 / d(h(r.current.curvature, 1), 0.08, 6)) *
                  d(B / Math.max(U, 1) / 1.6, 0.42, 1),
                ec = () => 0.5 - d(h(r.current.horizon, 0.72), 0.15, 1.1),
                ed = () => {
                  let e = r.current,
                    t = B / Math.max(U, 1),
                    a = d(h(e.sunPosition, 0.15), -1.2, 1.2) * t * 0.42,
                    o = es(),
                    n = e.reduced
                      ? 0
                      : 0.03 * d(h(e.drift, 0.5), 0, 2) * Math.sin(0.05 * _);
                  return Math.asin(d(a / o, -0.99, 0.99)) * o + n;
                },
                eh = () => {
                  if (!G) return;
                  let e = r.current;
                  (performance.now() - W > 1e3 &&
                    ((W = performance.now()), el()),
                    (() => {
                      let e = r.current,
                        t = M.uniforms,
                        a = (d(h(e.tilt, 0), -180, 180) * Math.PI) / 180;
                      ((t.uTime.value = _),
                        (t.uRoll.value = a + X),
                        (t.uApex.value = ec() + K),
                        (t.uRadius.value = es()),
                        (t.uSunArc.value = ed()));
                      let o = 0.08 + 1.1 * d(h(e.spread, 0.4), 0, 3);
                      ((t.uSpread.value =
                        0.05 + (o - 0.05) * (0.15 + 0.85 * Y)),
                        (t.uSunUp.value =
                          d(h(e.sunrise, 1), 0, 1.5) * (0.12 + 0.88 * Y)),
                        (t.uAtmo.value = d(h(e.atmosphere, 1), 0, 3)),
                        (t.uThick.value = d(h(e.thickness, 1), 0.3, 3)),
                        (t.uRimGain.value = d(h(e.rim, 1), 0, 3)),
                        (t.uFlare.value = d(h(e.flare, 1), 0, 3)),
                        (t.uAirglow.value = d(h(e.airglow, 0.5), 0, 2)),
                        (t.uClouds.value = d(h(e.clouds, 0.5), 0, 2)),
                        (t.uStars.value = d(h(e.stars, 0.5), 0, 2)),
                        (t.uAuroraGain.value = d(h(e.aurora, 1), 0, 3)));
                      for (let e = 0; e < 8; e++) {
                        let t = eo[e];
                        if (t) {
                          let r =
                            t.dying < 0 ? 1 : d(1 - (O - t.dying) / 0.7, 0, 1);
                          y[e].set(
                            t.arc,
                            O - t.born,
                            t.strength * r * r,
                            t.seed,
                          );
                        } else y[e].set(0, 0, 0, 0);
                      }
                      ((P.uniforms.uGrain.value = d(h(e.grain, 0.25), 0, 1)),
                        (P.uniforms.uTime.value = _));
                    })(),
                    H && (M.blending = u.XIg),
                    (v.material = M),
                    a.setRenderTarget(A),
                    a.setClearColor(0, 0),
                    a.clear(),
                    a.render(m, l));
                  let t = H ? 0 : d(h(e.bloom, 0.5), 0, 3);
                  if (t > 0.001) {
                    let e = A;
                    for (let t of ((v.material = E), T))
                      ((E.uniforms.uThreshold.value = 0.45 * (e === A)),
                        (E.uniforms.uSource.value = e.texture),
                        E.uniforms.uTexel.value.set(1 / e.width, 1 / e.height),
                        a.setRenderTarget(t),
                        a.render(m, l),
                        (e = t));
                    v.material = z;
                    for (let e = T.length - 1; e > 0; e--)
                      ((z.uniforms.uSource.value = T[e].texture),
                        z.uniforms.uTexel.value.set(
                          1 / T[e].width,
                          1 / T[e].height,
                        ),
                        a.setRenderTarget(T[e - 1]),
                        a.render(m, l));
                  }
                  ((P.uniforms.uBloomStrength.value = t),
                    (v.material = P),
                    a.setRenderTarget(null),
                    a.render(m, l));
                },
                em = (t, a) => {
                  let o = e.getBoundingClientRect();
                  if (o.width <= 0 || o.height <= 0) return null;
                  let n = r.current,
                    i = ((t - o.left) / o.width - 0.5) * (o.width / o.height),
                    l = 0.5 - (a - o.top) / o.height,
                    u = (d(h(n.tilt, 0), -180, 180) * Math.PI) / 180 + X,
                    s = Math.cos(u) * i - Math.sin(u) * l,
                    c = Math.sin(u) * i + Math.cos(u) * l,
                    m = es();
                  return Math.atan2(s, c - (ec() + K - m)) * m;
                },
                ep = (e, t) => {
                  let r = eo.filter((e) => e.dying < 0);
                  (r.length >= 5 && (r[0].dying = O),
                    eo.length >= 8 ||
                      eo.push({
                        arc: e,
                        born: O,
                        strength: t,
                        seed: 40 * en(),
                        dying: -1,
                      }));
                },
                ef = () => {
                  er || ea || !et || $ || ($ = requestAnimationFrame(ev));
                },
                ev = (e) => {
                  if ((($ = 0), er || ea)) return;
                  let t = r.current,
                    a =
                      ee && e - ee < 100
                        ? Math.min(Math.max((e - ee) / 1e3, 0), 0.05)
                        : 1 / 60;
                  ee = e;
                  let o = !t.reduced && !t.paused;
                  if (
                    (o && ((O += a), (_ += a * d(h(t.speed, 0.5), 0, 3))),
                    t.intro && !t.reduced)
                  ) {
                    q < 0 && (q = e);
                    let t = d((e - q) / 6500, 0, 1);
                    Y = t * t * (3 - 2 * t);
                  } else Y = 1;
                  let n = t.reduced ? 1 : 1 - Math.exp(-a / 0.55);
                  ((X += (V - X) * n), (K += (Q - K) * n));
                  for (let e = eo.length - 1; e >= 0; e--)
                    (O - eo[e].born > 6.7 ||
                      (eo[e].dying >= 0 && O - eo[e].dying > 0.7)) &&
                      eo.splice(e, 1);
                  if (
                    o &&
                    t.autoAurora &&
                    d(h(t.aurora, 1), 0, 3) > 0 &&
                    O >= Z
                  ) {
                    let e = 0.08 + 1.1 * d(h(t.spread, 0.4), 0, 3);
                    (ep(ed() + (en() - 0.5) * e * 2.4, 0.6 + 0.5 * en()),
                      (Z = O + 5 + 6 * en()));
                  }
                  eh();
                  let i = Math.abs(V - X) > 5e-5 || Math.abs(Q - K) > 5e-5;
                  (o || i || Y < 1) && !document.hidden
                    ? ($ = requestAnimationFrame(ev))
                    : (ee = 0);
                },
                eg = (t) => {
                  let a = r.current;
                  if (!a.interactive || a.reduced || "touch" === t.pointerType)
                    return;
                  let o = e.getBoundingClientRect();
                  if (o.width <= 0 || o.height <= 0) return;
                  let n = d(h(a.parallax, 0.5), 0, 2),
                    i = d((t.clientX - o.left) / o.width, 0, 1) - 0.5,
                    l = d((t.clientY - o.top) / o.height, 0, 1) - 0.5;
                  ((V = -(0.07 * i) * n), (Q = -(0.05 * l) * n), ef());
                },
                ex = () => {
                  ((V = 0), (Q = 0), ef());
                },
                eb = null,
                ew = (e) => {
                  var t;
                  eb = null;
                  let a = r.current;
                  a.interactive &&
                    !a.reduced &&
                    !a.paused &&
                    e.isPrimary &&
                    ("mouse" !== e.pointerType || 0 === e.button) &&
                    (((t = e.target) &&
                      "function" == typeof t.closest &&
                      t.closest(
                        "a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]",
                      )) ||
                      (eb = {
                        id: e.pointerId,
                        x: e.clientX,
                        y: e.clientY,
                        time: performance.now(),
                      }));
                },
                ey = (e) => {
                  let t = eb;
                  if (
                    ((eb = null),
                    !t ||
                      t.id !== e.pointerId ||
                      Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 ||
                      performance.now() - t.time > 500 ||
                      0 >= d(h(r.current.aurora, 1), 0, 3))
                  )
                    return;
                  let a = em(e.clientX, e.clientY);
                  null !== a && (ep(a, 1), ef());
                },
                ek = () => {
                  eb = null;
                },
                eC = () => {
                  ((ee = 0), ef());
                },
                eS = (e) => {
                  (e.preventDefault(),
                    (ea = !0),
                    cancelAnimationFrame($),
                    ($ = 0));
                },
                eF = () => {
                  ((ea = !1), (D = ""), ef());
                },
                eR = new ResizeObserver(() => {
                  eu() && (eh(), ef());
                }),
                eM = new IntersectionObserver(
                  ([e]) => {
                    ((et = e.isIntersecting), (ee = 0), ef());
                  },
                  { rootMargin: "120px" },
                );
              return (
                e.addEventListener("pointermove", eg),
                e.addEventListener("pointerleave", ex),
                e.addEventListener("pointerdown", ew),
                e.addEventListener("pointerup", ey),
                e.addEventListener("pointercancel", ek),
                document.addEventListener("visibilitychange", eC),
                i.addEventListener("webglcontextlost", eS),
                i.addEventListener("webglcontextrestored", eF),
                eR.observe(e),
                eM.observe(e),
                eu(),
                el(),
                {
                  sync: () => {
                    ((W = -10), eu(), (ee = 0), !$ && et && (eh(), ef()));
                  },
                  bloom: (t, a) => {
                    if (r.current.reduced) return;
                    let o = e.getBoundingClientRect(),
                      n = em(
                        o.left + d(t ?? 0.5, 0, 1) * o.width,
                        o.top + 0.5 * o.height,
                      );
                    null !== n && (ep(n, d(h(a ?? 1, 1), 0, 3)), ef());
                  },
                  replay: () => {
                    ((q = -1), (Y = 0), (ee = 0), ef());
                  },
                  destroy: () => {
                    for (let t of ((er = !0),
                    cancelAnimationFrame($),
                    eR.disconnect(),
                    eM.disconnect(),
                    e.removeEventListener("pointermove", eg),
                    e.removeEventListener("pointerleave", ex),
                    e.removeEventListener("pointerdown", ew),
                    e.removeEventListener("pointerup", ey),
                    e.removeEventListener("pointercancel", ek),
                    document.removeEventListener("visibilitychange", eC),
                    i.removeEventListener("webglcontextlost", eS),
                    i.removeEventListener("webglcontextrestored", eF),
                    c.dispose(),
                    M.dispose(),
                    E.dispose(),
                    z.dispose(),
                    P.dispose(),
                    A.dispose(),
                    T))
                      t.dispose();
                    (a.dispose(), i.remove());
                  },
                }
              );
            })(e, t, $);
            return (
              (Z.current = r),
              () => {
                (r?.destroy(), (Z.current = null));
              }
            );
          }, []),
          (0, o.useImperativeHandle)(
            K,
            () => ({
              bloom: (e, t) => Z.current?.bloom(e, t),
              replay: () => Z.current?.replay(),
            }),
            [],
          ));
        let ee = t.trim().toLowerCase();
        return (0, a.jsxs)("div", {
          ref: V,
          className: (0, c.cn)(
            "relative isolate h-full min-h-[320px] w-full overflow-hidden",
            Y,
          ),
          style: {
            backgroundColor: "transparent" === ee || "" === ee ? void 0 : t,
            touchAction: "pan-y",
            ...X,
          },
          children: [
            (0, a.jsx)("div", {
              ref: Q,
              "aria-hidden": "true",
              style: { position: "absolute", inset: 0, pointerEvents: "none" },
            }),
            q
              ? (0, a.jsx)("div", {
                  style: { position: "relative", zIndex: 1, height: "100%" },
                  children: q,
                })
              : null,
          ],
        });
      });
    M.displayName = "HorizonBloom";
    let j = {
        colors: ["#FF9FFC", "#5227FF"],
        horizon: 0.72,
        curvature: 1,
        tilt: 0,
        sunPosition: 0.15,
        sunrise: 1,
        spread: 0.4,
        atmosphere: 1,
        thickness: 1,
        rim: 1,
        flare: 1,
        airglow: 0.5,
        clouds: 0.5,
        stars: 0.5,
        aurora: 1,
        autoAurora: !1,
      },
      A = {
        dawn: j,
        eclipse: {
          ...j,
          horizon: 0.62,
          curvature: 4.5,
          sunPosition: 0,
          spread: 3,
          flare: 1.3,
          stars: 1,
        },
        crescent: {
          ...j,
          horizon: 0.7,
          curvature: 2.4,
          tilt: 24,
          sunPosition: -0.75,
          spread: 0.45,
          atmosphere: 1.4,
          flare: 1.2,
          stars: 1,
        },
        aurora: {
          ...j,
          colors: ["#B19EEF", "#5227FF"],
          sunrise: 0.2,
          spread: 0.3,
          airglow: 1.2,
          stars: 1.2,
          aurora: 1.4,
          autoAurora: !0,
        },
        overhead: {
          ...j,
          tilt: 180,
          horizon: 0.76,
          sunPosition: -0.25,
          spread: 0.55,
        },
        edge: {
          ...j,
          tilt: -90,
          horizon: 0.8,
          curvature: 0.7,
          sunPosition: 0.2,
          spread: 0.5,
          stars: 0.8,
        },
        twilight: {
          ...j,
          colors: ["#FF9FFC", "#7C5CFF"],
          horizon: 0.58,
          curvature: 0.35,
          sunPosition: -0.45,
          spread: 1.1,
          atmosphere: 1.7,
          thickness: 1.8,
          rim: 0.7,
          flare: 0.7,
          stars: 0.3,
        },
        halo: {
          ...j,
          sunrise: 0,
          spread: 1.4,
          atmosphere: 0.45,
          rim: 1.3,
          flare: 0,
          airglow: 0,
          clouds: 0,
          stars: 0,
        },
      },
      T = [
        { label: "Dawn", value: "dawn" },
        { label: "Eclipse", value: "eclipse" },
        { label: "Crescent", value: "crescent" },
        { label: "Aurora", value: "aurora" },
        { label: "Overhead", value: "overhead" },
        { label: "Edge", value: "edge" },
        { label: "Twilight", value: "twilight" },
        { label: "Halo", value: "halo" },
      ],
      I = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#FF9FFC", "#5227FF"]',
          description:
            "The warm colour of the light near the surface and the cool colour of the upper atmosphere, blended in OKLab. On light backgrounds they become matching inks.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Background of the component. Transparent reads the colour behind the component.",
        },
        {
          name: "horizon",
          type: "number",
          default: "0.72",
          description:
            "Height of the top of the planet, as a fraction of the frame from the top.",
        },
        {
          name: "curvature",
          type: "number",
          default: "1",
          description:
            "How curved the horizon is: low values give a vast, nearly flat horizon, high values a small planet seen whole.",
        },
        {
          name: "tilt",
          type: "number",
          default: "0",
          description:
            "Rotation of the view in degrees. 180 hangs the planet from the top, \xb190 puts its edge at a side.",
        },
        {
          name: "sunPosition",
          type: "number",
          default: "0.15",
          description:
            "Where along the horizon the sun rises, from -1 (left) to 1 (right).",
        },
        {
          name: "sunrise",
          type: "number",
          default: "1",
          description:
            "Brightness of the sun breaking over the edge. 0 leaves only the lit atmosphere.",
        },
        {
          name: "spread",
          type: "number",
          default: "0.4",
          description:
            "How far the sunlight spreads along the horizon. High values light the whole edge into a ring.",
        },
        {
          name: "atmosphere",
          type: "number",
          default: "1",
          description: "Brightness of the glowing atmosphere above the edge.",
        },
        {
          name: "thickness",
          type: "number",
          default: "1",
          description:
            "Height of the atmosphere. Low values give a crisp thin rim, high values a soft hazy glow.",
        },
        {
          name: "rim",
          type: "number",
          default: "1",
          description:
            "Brightness of the razor-thin line of light along the edge.",
        },
        {
          name: "flare",
          type: "number",
          default: "1",
          description: "Brightness of the sun's point of light and its glare.",
        },
        {
          name: "airglow",
          type: "number",
          default: "0.5",
          description:
            "A faint second band of light floating above the atmosphere, like the airglow seen from orbit.",
        },
        {
          name: "clouds",
          type: "number",
          default: "0.5",
          description:
            "Cloud tops catching the light just below the horizon near the sun.",
        },
        {
          name: "stars",
          type: "number",
          default: "0.5",
          description:
            "Brightness of the faint twinkling stars. Hidden on light backgrounds.",
        },
        {
          name: "aurora",
          type: "number",
          default: "1",
          description:
            "Strength of the aurora curtains that a click or tap raises from the horizon. 0 turns them off.",
        },
        {
          name: "autoAurora",
          type: "boolean",
          default: "false",
          description: "Raise an aurora on its own every few seconds.",
        },
        {
          name: "speed",
          type: "number",
          default: "0.5",
          description:
            "Speed of the slow motion: twinkling, airglow and drifting aurora rays.",
        },
        {
          name: "drift",
          type: "number",
          default: "0.5",
          description: "How much the sun slowly wanders along the horizon.",
        },
        {
          name: "parallax",
          type: "number",
          default: "0.5",
          description:
            "How much the view gently rolls and lifts toward the pointer, like a camera drifting in orbit.",
        },
        {
          name: "bloom",
          type: "number",
          default: "0.5",
          description:
            "Soft glow around the brightest light on dark backgrounds.",
        },
        {
          name: "grain",
          type: "number",
          default: "0.25",
          description: "Fine film grain over the lit areas.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Pointer parallax, and clicking or tapping to raise an aurora where you click.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "Play the sunrise when the component first appears: the light spreads along the edge as the sun breaks over it.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops the motion. Reduced-motion users get the risen sun, still.",
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
            "Content laid over the scene, such as a hero headline. Clicks on its links and buttons never raise an aurora.",
        },
        {
          name: "ref",
          type: "{ bloom, replay }",
          default: "—",
          description:
            "bloom(x?, strength?) raises an aurora above a horizontal position given as a fraction of the width; replay() replays the sunrise.",
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
      E = () => {
        let [e, t] = (0, l.I)(),
          r = (0, i.Y)(),
          [u, s] = (0, o.useState)("dawn"),
          [c, d] = (0, o.useState)(A.dawn),
          h = (e) => (t) => d((r) => ({ ...r, [e]: t })),
          [m, p] = (0, o.useState)(null),
          f = m ?? ("dark" === r ? "#0A0A0A" : "#FFFFFF"),
          [v, g] = (0, o.useState)(0.5),
          [x, b] = (0, o.useState)(0.5),
          [w, y] = (0, o.useState)(0.5),
          [k, C] = (0, o.useState)(0.5),
          [S, F] = (0, o.useState)(0.25),
          [R, j] = (0, o.useState)(!0),
          [E, z] = (0, o.useState)(!0),
          [P, B] = (0, o.useState)(!1);
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(n.Bg, {}),
            (0, a.jsxs)(n.VX, {
              children: [
                (0, a.jsxs)(n.Ec, {
                  children: [
                    (0, a.jsx)(n.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, a.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, a.jsx)(
                          M,
                          {
                            ...c,
                            backgroundColor: f,
                            speed: v,
                            drift: x,
                            parallax: w,
                            bloom: k,
                            grain: S,
                            interactive: R,
                            intro: E,
                            paused: P,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, a.jsxs)(n.IH, {
                      children: [
                        (0, a.jsx)(n.bg, {
                          title: "Preset",
                          value: u,
                          options: T,
                          onChange: (e) => {
                            (s(e), d(A[e] ?? A.dawn));
                          },
                        }),
                        (0, a.jsx)(n.W7, {
                          title: "Warm Color",
                          value: c.colors[0],
                          onChange: (e) =>
                            d((t) => ({ ...t, colors: [e, t.colors[1]] })),
                        }),
                        (0, a.jsx)(n.W7, {
                          title: "Cool Color",
                          value: c.colors[1],
                          onChange: (e) =>
                            d((t) => ({ ...t, colors: [t.colors[0], e] })),
                        }),
                        (0, a.jsx)(n.W7, {
                          title: "Background",
                          value: f,
                          onChange: p,
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Horizon",
                          min: 0.2,
                          max: 1,
                          step: 0.01,
                          value: c.horizon,
                          onChange: h("horizon"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Curvature",
                          min: 0.2,
                          max: 5,
                          step: 0.01,
                          value: c.curvature,
                          onChange: h("curvature"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Tilt",
                          min: -180,
                          max: 180,
                          step: 1,
                          value: c.tilt,
                          valueUnit: "\xb0",
                          onChange: h("tilt"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Sun Position",
                          min: -1,
                          max: 1,
                          step: 0.01,
                          value: c.sunPosition,
                          onChange: h("sunPosition"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Sunrise",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: c.sunrise,
                          onChange: h("sunrise"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Spread",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.spread,
                          onChange: h("spread"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Atmosphere",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.atmosphere,
                          onChange: h("atmosphere"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Thickness",
                          min: 0.3,
                          max: 3,
                          step: 0.01,
                          value: c.thickness,
                          onChange: h("thickness"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Rim",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.rim,
                          onChange: h("rim"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Flare",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.flare,
                          onChange: h("flare"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Airglow",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.airglow,
                          onChange: h("airglow"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Clouds",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.clouds,
                          onChange: h("clouds"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Stars",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.stars,
                          onChange: h("stars"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Aurora",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.aurora,
                          onChange: h("aurora"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Speed",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: v,
                          onChange: g,
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Drift",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: x,
                          onChange: b,
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Parallax",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: w,
                          onChange: y,
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Bloom",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: k,
                          onChange: C,
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Grain",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: S,
                          onChange: F,
                        }),
                        (0, a.jsx)(n.tl, {
                          title: "Auto Aurora",
                          checked: c.autoAurora,
                          onChange: h("autoAurora"),
                        }),
                        (0, a.jsx)(n.tl, {
                          title: "Interactive",
                          checked: R,
                          onChange: j,
                        }),
                        (0, a.jsx)(n.tl, {
                          title: "Intro",
                          checked: E,
                          onChange: z,
                        }),
                        (0, a.jsx)(n.tl, {
                          title: "Paused",
                          checked: P,
                          onChange: B,
                        }),
                      ],
                    }),
                    (0, a.jsx)(n.Ub, { data: I }),
                  ],
                }),
                (0, a.jsx)(n.lT, { children: (0, a.jsx)(n.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
