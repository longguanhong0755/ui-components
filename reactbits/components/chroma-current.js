/* ReactBits Pro public preview module 81033 for chroma-current.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/81033.95d894a1d7e57978.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  81033: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => L }));
    var a = r(95155),
      n = r(12115),
      o = r(56388),
      l = r(86049),
      i = r(90761),
      s = r(2253),
      u = r(12246),
      c = r(90650);
    let d = ["streams", "waves", "vortex", "radial", "contours"],
      h = (e, t, r) => Math.min(r, Math.max(t, e)),
      m = (e, t) => (Number.isFinite(e) ? e : t),
      p = new s.Q1f(),
      f = (e) => {
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
      v = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      g = (e) =>
        e <= 0.0031308 ? 12.92 * e : 1.055 * Math.pow(e, 1 / 2.4) - 0.055,
      x = ([e, t, r]) => {
        let a = v(e),
          n = v(t),
          o = v(r),
          l = Math.cbrt(0.4122214708 * a + 0.5363325363 * n + 0.0514459929 * o),
          i = Math.cbrt(0.2119034982 * a + 0.6806995451 * n + 0.1073969566 * o),
          s = Math.cbrt(0.0883024619 * a + 0.2817188376 * n + 0.6299787005 * o);
        return [
          0.2104542553 * l + 0.793617785 * i - 0.0040720468 * s,
          1.9779984951 * l - 2.428592205 * i + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * i - 0.808675766 * s,
        ];
      },
      y = ([e, t, r]) => {
        let a = Math.pow(e + 0.3963377774 * t + 0.2158037573 * r, 3),
          n = Math.pow(e - 0.1055613458 * t - 0.0638541728 * r, 3),
          o = Math.pow(e - 0.0894841775 * t - 1.291485548 * r, 3);
        return [
          h(g(4.0767416621 * a - 3.3077115913 * n + 0.2309699292 * o), 0, 1),
          h(g(-1.2684380046 * a + 2.6097574011 * n - 0.3413193965 * o), 0, 1),
          h(g(-0.0041960863 * a - 0.7034186147 * n + 1.707614701 * o), 0, 1),
        ];
      },
      b = (() => {
        let e = Array.from({ length: 256 }, (e, t) => t),
          t = 1337;
        for (let r = 255; r > 0; r--) {
          let a = (t = (16807 * t) % 0x7fffffff) % (r + 1),
            n = e[r];
          ((e[r] = e[a]), (e[a] = n));
        }
        let r = new Uint8Array(512);
        for (let t = 0; t < 512; t++) r[t] = e[255 & t];
        return r;
      })(),
      w = (e) => e * e * e * (e * (6 * e - 15) + 10),
      F = (e, t, r, a) => {
        let n = 15 & e,
          o = n < 8 ? t : r,
          l = n < 4 ? r : 12 === n || 14 === n ? t : a;
        return ((1 & n) == 0 ? o : -o) + ((2 & n) == 0 ? l : -l);
      },
      M = (e, t, r) => {
        let a = Math.floor(e),
          n = Math.floor(t),
          o = Math.floor(r),
          l = 255 & a,
          i = 255 & n,
          s = 255 & o,
          u = e - a,
          c = t - n,
          d = r - o,
          h = w(u),
          m = w(c),
          p = w(d),
          f = b[l] + i,
          v = b[f] + s,
          g = b[f + 1] + s,
          x = b[l + 1] + i,
          y = b[x] + s,
          M = b[x + 1] + s,
          C = (e, t, r) => t + e * (r - t);
        return C(
          p,
          C(
            m,
            C(h, F(b[v], u, c, d), F(b[y], u - 1, c, d)),
            C(h, F(b[g], u, c - 1, d), F(b[M], u - 1, c - 1, d)),
          ),
          C(
            m,
            C(h, F(b[v + 1], u, c, d - 1), F(b[y + 1], u - 1, c, d - 1)),
            C(
              h,
              F(b[g + 1], u, c - 1, d - 1),
              F(b[M + 1], u - 1, c - 1, d - 1),
            ),
          ),
        );
      },
      C = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      S = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      k = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      j = `
uniform sampler2D uEnergy;
uniform sampler2D uFlow;
uniform vec2 uGrid;
uniform vec2 uOrigin;
uniform float uPitch;
uniform float uMaxRadius;
uniform float uBaseRadius;
uniform float uBase;
uniform float uGain;
uniform float uStretch;
uniform float uVariance;
uniform float uSquare;
uniform float uInk;
uniform float uFade;
uniform vec3 uBaseColor;
varying vec2 vUv;

float shape(vec2 q, float radius) {
  if (uSquare > 0.5) {
    vec2 d = abs(q) - vec2(radius * 0.86);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }
  return length(q) - radius;
}

void main() {
  vec2 frag = gl_FragCoord.xy - uOrigin;
  vec2 cell = floor(frag / uPitch);
  if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= uGrid.x || cell.y >= uGrid.y) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec2 local = frag - (cell + 0.5) * uPitch;
  vec2 uv = (cell + 0.5) / uGrid;
  vec4 energy = texture2D(uEnergy, uv);
  vec2 flow = texture2D(uFlow, uv).rg;
  float amount = max(energy.a, 0.0);
  float lit = (1.0 - exp(-amount * uGain)) * uFade;
  vec3 tint = energy.rgb / max(amount, 0.0001);
  float speed = length(flow) / max(amount, 0.0001);
  vec2 along = speed > 0.00001 ? flow / (speed * max(amount, 0.0001)) : vec2(1.0, 0.0);
  vec2 across = vec2(-along.y, along.x);
  float stretch = 1.0 + uStretch * clamp(speed * 6.0, 0.0, 1.6) * smoothstep(0.02, 0.3, lit);
  float halftone = mix(uBaseRadius, uMaxRadius, sqrt(lit));
  float panel = uMaxRadius * (0.72 + 0.28 * smoothstep(0.0, 0.45, lit));
  float radius = mix(panel, halftone, uVariance);
  vec2 q = vec2(dot(local, along) / stretch, dot(local, across));
  float d = shape(q, radius);
  float cover = 1.0 - smoothstep(-0.65, 0.65, d);
  float baseCover = (1.0 - smoothstep(-0.6, 0.6, shape(local, uBaseRadius))) * uBase * (1.0 - lit);
  if (uInk > 0.5) {
    float a = clamp(cover * lit * 2.3, 0.0, 1.0);
    vec3 color = tint * a;
    gl_FragColor = vec4(color + uBaseColor * baseCover * 0.5, a + baseCover * 0.5);
    return;
  }
  vec3 emission = tint * lit * cover * 1.6 + vec3(1.0) * max(lit - 0.82, 0.0) * cover * 0.8;
  gl_FragColor = vec4(emission + uBaseColor * baseCover, 1.0);
}
`,
      E = `
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
      B = `
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
      I = `
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec3 uBackground;
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
  vec4 scene = texture2D(uScene, vUv);
  float n = hash(gl_FragCoord.xy + fract(uTime * 13.0) * 911.0) - 0.5;
  if (uInk > 0.5) {
    float cover = clamp(scene.a, 0.0, 1.0);
    vec3 ink = scene.rgb / max(scene.a, 0.0001);
    vec3 color = mix(uBackground, ink, cover);
    color += n * uGrain * 0.05 * smoothstep(0.0, 0.05, cover);
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    return;
  }
  vec3 emission = scene.rgb + texture2D(uBloom, vUv).rgb * uBloomStrength;
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
      A = (0, n.forwardRef)(function (
        {
          colors: e = ["#5227FF", "#FF9FFC"],
          backgroundColor: t = "transparent",
          pattern: r = "streams",
          centerX: o = 0.5,
          centerY: l = 0.5,
          scale: i = 1,
          pitch: p = 8,
          dotSize: g = 0.62,
          variance: b = 0.35,
          shape: w = "circle",
          baseDots: F = 0.12,
          stretch: A = 0.2,
          streams: P = 4,
          spread: T = 0.5,
          speed: R = 0.6,
          direction: D = 0,
          turbulence: G = 0.6,
          trail: q = 0.6,
          intensity: L = 1,
          bloom: z = 0.6,
          grain: U = 0.2,
          interactive: Y = !0,
          stir: N = 1,
          plume: W = 1,
          intro: H = !0,
          paused: _ = !1,
          dpr: X = 2,
          children: V,
          className: O,
          style: K,
        },
        Q,
      ) {
        let Z = (0, n.useRef)(null),
          J = (0, n.useRef)(null),
          $ = (0, n.useRef)(null),
          ee = (0, n.useSyncExternalStore)(C, S, () => !1),
          et = {
            colors: e,
            backgroundColor: t,
            pattern: d.includes(r) ? r : "streams",
            centerX: o,
            centerY: l,
            scale: i,
            pitch: p,
            dotSize: g,
            variance: b,
            shape: "square" === w ? "square" : "circle",
            baseDots: F,
            stretch: A,
            streams: P,
            spread: T,
            speed: R,
            direction: D,
            turbulence: G,
            trail: q,
            intensity: L,
            bloom: z,
            grain: U,
            interactive: Y,
            stir: N,
            plume: W,
            intro: H,
            paused: _,
            dpr: X,
            reduced: ee,
          },
          er = (0, n.useRef)(et);
        ((0, n.useEffect)(() => {
          ((er.current = et), $.current?.sync());
        }),
          (0, n.useEffect)(() => {
            let e = Z.current,
              t = J.current;
            if (!e || !t) return;
            let r = (function (e, t, r) {
              let a,
                n = e.ownerDocument,
                o = n.defaultView ?? window,
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
              let i = new s.qUd(-1, 1, 1, -1, -1, 1),
                c = new s.bdM(2, 2),
                d = new s.Z58(),
                p = new s.eaF(c);
              ((p.frustumCulled = !1), d.add(p));
              let g = 1,
                b = 1,
                w = new Float32Array(4),
                F = new Float32Array(2),
                C = new s.GYF(w, 1, 1, s.GWd, s.RQf),
                S = new s.GYF(F, 1, 1, s.paN, s.RQf),
                A = new s.Pq0(0.04, 0.04, 0.04),
                P = new s.Pq0(0.1, 0.06, 0.3),
                T = new s.BKk({
                  uniforms: {
                    uEnergy: { value: C },
                    uFlow: { value: S },
                    uGrid: { value: new s.I9Y(1, 1) },
                    uOrigin: { value: new s.I9Y(0, 0) },
                    uPitch: { value: 20 },
                    uMaxRadius: { value: 7 },
                    uBaseRadius: { value: 1.2 },
                    uBase: { value: 0.12 },
                    uGain: { value: 0.7 },
                    uStretch: { value: 0.35 },
                    uVariance: { value: 0.35 },
                    uSquare: { value: 0 },
                    uInk: { value: 0 },
                    uFade: { value: 1 },
                    uBaseColor: { value: P },
                  },
                  vertexShader: k,
                  fragmentShader: j,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                R = () =>
                  new s.nWS(1, 1, {
                    type: s.ix0,
                    format: s.GWd,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    minFilter: s.k6q,
                    magFilter: s.k6q,
                    generateMipmaps: !1,
                  }),
                D = R(),
                G = Array.from({ length: 5 }, R),
                q = new s.BKk({
                  uniforms: {
                    uSource: { value: null },
                    uTexel: { value: new s.I9Y() },
                    uThreshold: { value: 0 },
                  },
                  vertexShader: k,
                  fragmentShader: E,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                L = new s.BKk({
                  uniforms: {
                    uSource: { value: null },
                    uTexel: { value: new s.I9Y() },
                  },
                  vertexShader: k,
                  fragmentShader: B,
                  blending: s.EZo,
                  transparent: !0,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                z = new s.BKk({
                  uniforms: {
                    uScene: { value: D.texture },
                    uBloom: { value: G[0].texture },
                    uBackground: { value: A },
                    uBloomStrength: { value: 0.6 },
                    uGrain: { value: 0.2 },
                    uTime: { value: 0 },
                    uInk: { value: 0 },
                  },
                  vertexShader: k,
                  fragmentShader: I,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                U = new Float32Array(16e3),
                Y = new Float32Array(16e3),
                N = new Float32Array(16e3),
                W = new Float32Array(16e3),
                H = new Float32Array(16e3),
                _ = new Float32Array(16e3),
                X = new Uint8Array(16e3),
                V = 0,
                O = 64,
                K = 32,
                Q = new Float32Array(2145),
                Z = new Float32Array((O + 1) * (K + 1)),
                J = new Float32Array((O + 1) * (K + 1)),
                $ = !1,
                ee = !1,
                et = new Float32Array(O * K),
                er = new Float32Array(O * K),
                ea = Array.from({ length: 33 }, () => [1, 1, 1]),
                en = [],
                eo = 0,
                el = 0,
                ei = 1,
                es = 1,
                eu = !1,
                ec = "",
                ed = "",
                eh = !1,
                em = [0.04, 0.04, 0.04],
                ep = -10,
                ef = 0,
                ev = 0,
                eg = 0,
                ex = 0,
                ey = 0,
                eb = -1,
                ew = 0,
                eF = 0,
                eM = !1,
                eC = !1,
                eS = !1,
                ek = 7,
                ej = null,
                eE = null,
                eB = () => ((ek = (16807 * ek) % 0x7fffffff) - 1) / 0x7ffffffe,
                eI = () => {
                  let t = r.current,
                    a = [
                      (em =
                        f(t.backgroundColor) ??
                        (() => {
                          let t = e.parentElement;
                          for (; t;) {
                            let e = o
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
                          let r = o
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
                  if (a === ed) return;
                  ((ed = a),
                    (eh =
                      0.2126 * em[0] + 0.7152 * em[1] + 0.0722 * em[2] > 0.55),
                    A.set(em[0], em[1], em[2]));
                  let n = x(f(t.colors[0]) ?? [0.32, 0.15, 1]),
                    l = x(f(t.colors[1]) ?? [1, 0.62, 0.99]),
                    i = (e) => Math.hypot(e[1], e[2]),
                    s = (e, t) => {
                      if (!eh) return e;
                      let r = e;
                      0.03 > i(e) && i(t) >= 0.03 && (r = t);
                      let a = i(r);
                      if (a < 0.03) return [0.3, 0, 0];
                      let n = Math.max(1, 0.15 / a);
                      return [h(r[0], 0.34, 0.52), r[1] * n, r[2] * n];
                    },
                    u = s(n, l),
                    c = s(l, n);
                  for (let e = 0; e < ea.length; e++) {
                    let t = e / (ea.length - 1),
                      r = y([
                        u[0] + (c[0] - u[0]) * t,
                        u[1] + (c[1] - u[1]) * t,
                        u[2] + (c[2] - u[2]) * t,
                      ]);
                    ea[e] = eh ? r : [v(r[0]), v(r[1]), v(r[2])];
                  }
                  let d = y([eh ? 0.82 : 0.32, 0.5 * u[1], 0.5 * u[2]]);
                  (eh
                    ? P.set(d[0], d[1], d[2])
                    : P.set(0.55 * v(d[0]), 0.55 * v(d[1]), 0.55 * v(d[2])),
                    (T.uniforms.uInk.value = +!!eh),
                    (z.uniforms.uInk.value = +!!eh));
                },
                eA = (e) => ea[Math.round(h(e, 0, 1) * (ea.length - 1))],
                eP = () => {
                  let t = r.current,
                    n = Math.round(e.clientWidth),
                    l = Math.round(e.clientHeight);
                  if (n < 2 || l < 2) return ((eu = !1), !1);
                  let i = Math.min(
                    o.devicePixelRatio || 1,
                    h(m(t.dpr, 2), 0.5, 3),
                  );
                  if (eu && n === eo && l === el && i === es) return !1;
                  ((eu = !0),
                    (ei = (eo = n) / (el = l)),
                    (es = i),
                    a.setPixelRatio(es),
                    a.setSize(eo, el, !1),
                    D.setSize(Math.round(eo * es), Math.round(el * es)));
                  let s = Math.round(eo * es),
                    u = Math.round(el * es);
                  for (let e of G)
                    ((s = Math.max(1, Math.round(s / 2))),
                      (u = Math.max(1, Math.round(u / 2))),
                      e.setSize(s, u));
                  return ((ec = ""), !0);
                },
                eT = () => {
                  let e = Math.max(
                      3,
                      Math.round(h(m(r.current.pitch, 8), 4, 48) * es),
                    ),
                    t = [eo, el, es, e].join("|");
                  if (t === ec) return;
                  ec = t;
                  let a = Math.round(eo * es),
                    n = Math.round(el * es);
                  for (let t of ((w = new Float32Array(
                    (g = Math.ceil(a / e) + 1) * (b = Math.ceil(n / e) + 1) * 4,
                  )),
                  (F = new Float32Array(g * b * 2)),
                  C.dispose(),
                  S.dispose(),
                  (C = new s.GYF(w, g, b, s.GWd, s.RQf)),
                  (S = new s.GYF(F, g, b, s.paN, s.RQf)),
                  [C, S]))
                    ((t.minFilter = s.hxR),
                      (t.magFilter = s.hxR),
                      (t.needsUpdate = !0));
                  let o = T.uniforms;
                  ((o.uEnergy.value = C),
                    (o.uFlow.value = S),
                    o.uGrid.value.set(g, b),
                    (o.uPitch.value = e),
                    o.uOrigin.value.set((a - g * e) / 2, (n - b * e) / 2),
                    (Q = new Float32Array(
                      ((O = 64) + 1) *
                        ((K = Math.max(
                          12,
                          Math.round(64 / Math.max(ei, 0.3)),
                        )) +
                          1),
                    )),
                    (Z = new Float32Array((O + 1) * (K + 1))),
                    (J = new Float32Array((O + 1) * (K + 1))),
                    (et = new Float32Array(O * K)),
                    (er = new Float32Array(O * K)));
                },
                eR = () => 0.25 * h(m(r.current.speed, 0.6), 0, 3),
                eD = () => {
                  let e = r.current,
                    t = eR(),
                    a = e.pattern,
                    n = (h(m(e.direction, 0), -360, 360) * Math.PI) / 180,
                    o = Math.cos(n),
                    l = Math.sin(n),
                    i = 0 > m(e.direction, 0) ? -1 : 1,
                    s = 0.3 * h(m(e.turbulence, 0.6), 0, 2),
                    u = h(m(e.scale, 1), 0.25, 4),
                    c = ei * Math.abs(l) + Math.abs(o),
                    d = h(m(e.centerX, 0.5), -1, 2) * ei,
                    p = 1 - h(m(e.centerY, 0.5), -1, 2),
                    f = Math.max(
                      Math.hypot(d, p),
                      Math.hypot(ei - d, p),
                      Math.hypot(d, 1 - p),
                      Math.hypot(ei - d, 1 - p),
                      0.2,
                    ),
                    v = 1.7 / u,
                    g = "vortex" === a ? 1.35 * u * i : 0,
                    x = 0.9 * u;
                  ee = $ = "radial" === a || "vortex" === a;
                  let y = 1.35 * ef * 0.6;
                  for (let e = 0; e <= K; e++) {
                    let t = e / K,
                      r = t - 0.5;
                    for (let n = 0; n <= O; n++) {
                      let i = (n / O) * ei,
                        u = i - ei / 2,
                        h = u * o + r * l,
                        m = -u * l + r * o,
                        b = "streams" === a,
                        w =
                          M(1.35 * h - (b ? y : 0), 1.35 * m * 1.2, ev) +
                          0.42 *
                            M(
                              1.35 * h * 2.2 + 7.3 - (b ? 1.3 * y : 0),
                              1.35 * m * 2.3 - 3.1,
                              1.6 * ev + 11.7,
                            ) +
                          0.16 *
                            M(
                              1.35 * h * 4.6 - 2.1 - (b ? 1.7 * y : 0),
                              1.35 * m * 4.4 + 5.7,
                              2.3 * ev + 3.3,
                            ),
                        F = e * (O + 1) + n;
                      if ("waves" === a) {
                        let e =
                            (h / x) * Math.PI * 2 +
                            3.5 * m +
                            1.2 * Math.sin(2.1 * ev),
                          t =
                            (m +
                              0.075 *
                                (Math.sin(e) +
                                  0.35 * Math.sin(2 * e + 1.3 + ev)) +
                              0.3 * s * w) /
                            c;
                        ((Q[F] = t), (J[F] = t + 0.5));
                      } else if ("vortex" === a || "radial" === a) {
                        let e = Math.hypot(i - d, t - p) / f,
                          r =
                            Math.atan2(t - p, i - d) / (2 * Math.PI) +
                            0.5 +
                            g * e +
                            0.035 * s * w;
                        ((Q[F] = r), (J[F] = r - Math.floor(r)));
                      } else if ("contours" === a) {
                        let e =
                          0.62 * M(i * v, t * v, 0.9 * ev) +
                          0.38 *
                            M(
                              i * v * 2.1 + 5.2,
                              t * v * 2.1 - 3.4,
                              1.4 * ev + 7.7,
                            ) +
                          0.12 * s * w;
                        ((Q[F] = e), (J[F] = e / 1.1 + 0.5));
                      } else {
                        let e = (m + s * w) / c;
                        ((Q[F] = e), (J[F] = e + 0.5));
                      }
                    }
                  }
                  let b =
                      "vortex" === a
                        ? t / Math.hypot(1 / (2 * Math.PI * 0.4 * f), g / f)
                        : "radial" === a
                          ? t * Math.PI * 0.8 * f
                          : "contours" === a
                            ? (t * i * 1.2) / v
                            : t * c,
                    w = ei / O,
                    F = 1 / K,
                    C = ex,
                    S = h(m(e.stir, 1), 0, 3),
                    k = en.filter((e) => C - e.born < 1.6);
                  for (let e = 0; e <= K; e++) {
                    let t = e * F;
                    for (let r = 0; r <= O; r++) {
                      let a = r * w,
                        n = 0;
                      for (let e of k) {
                        let r = 1 - (C - e.born) / 1.6,
                          o = a - e.x,
                          l = t - e.y,
                          i = Math.exp(-(o * o + l * l) / 0.02) * r * r;
                        n += (e.vx * l - e.vy * o) * i * S;
                      }
                      Z[e * (O + 1) + r] = n;
                    }
                  }
                  let j = 3 * t + 1e-4,
                    E = (e) => (ee ? e - Math.round(e) : e);
                  for (let e = 0; e < K; e++)
                    for (let t = 0; t < O; t++) {
                      let r = e * (O + 1) + t,
                        n = Q[r],
                        o = Q[r + 1],
                        l = Q[r + O + 1],
                        i = Q[r + O + 2],
                        s = (E(l - n) + E(i - o)) / (2 * F),
                        u = (E(o - n) + E(i - l)) / (2 * w),
                        c = n + (E(o - n) + E(l - n) + E(i - n)) / 4,
                        d =
                          0.62 +
                          0.76 *
                            (0.5 +
                              0.5 *
                                Math.sin(
                                  ("contours" === a
                                    ? c / 1.1 + 0.5
                                    : $
                                      ? c - Math.floor(c)
                                      : c + 0.5) *
                                    Math.PI *
                                    6 +
                                    0.9,
                                )),
                        h = s * b * d,
                        m = -u * b * d,
                        p = Math.hypot(h, m);
                      p > j && ((h *= j / p), (m *= j / p));
                      let f = Z[r],
                        v = Z[r + 1],
                        g = Z[r + O + 1],
                        x = Z[r + O + 2];
                      ((h += (g + x - f - v) / (2 * F)),
                        (m += -(v + x - f - g) / (2 * w)),
                        (et[e * O + t] = h),
                        (er[e * O + t] = m));
                    }
                  for (let e = en.length - 1; e >= 0; e--)
                    C - en[e].born > 1.6 && en.splice(e, 1);
                },
                eG = (e, t, r, a, n) => {
                  let o = h((t / ei) * a - 0.5, 0, a - 1.001),
                    l = h(r * n - 0.5, 0, n - 1.001),
                    i = Math.floor(o),
                    s = Math.floor(l),
                    u = o - i,
                    c = l - s,
                    d = e[s * a + i],
                    m = e[s * a + i + 1],
                    p = e[(s + 1) * a + i];
                  return (
                    d +
                    (m - d) * u +
                    (p - d) * c +
                    (d - m - p + e[(s + 1) * a + i + 1]) * u * c
                  );
                },
                eq = (e) => {
                  let t = 43758.5453123 * Math.sin(127.1 * e + 311.7);
                  return t - Math.floor(t);
                },
                eL = (e, t) => {
                  let a,
                    n,
                    o,
                    l,
                    i,
                    s,
                    u,
                    c,
                    d,
                    p,
                    f,
                    v,
                    g,
                    x = r.current,
                    y = h(Math.round(m(x.streams, 4)), 1, 16),
                    b =
                      ((a = h((e / ei) * O, 0, O - 0.001)),
                      (n = h(t * K, 0, K - 0.001)),
                      (o = Math.floor(a)),
                      (l = Math.floor(n)),
                      (i = a - o),
                      (s = n - l),
                      (c = J[l * (u = O + 1) + o]),
                      (p =
                        c +
                        (d = (e) => ($ ? e - Math.round(e) : e))(
                          J[l * u + o + 1] - c,
                        )),
                      (f = c + d(J[(l + 1) * u + o] - c)),
                      (v = c + d(J[(l + 1) * u + o + 1] - c)),
                      (g =
                        c +
                        (p - c) * i +
                        (f - c) * s +
                        (c - p - f + v) * i * s),
                      $ ? g - Math.floor(g) : g),
                    w = (0.3 * h(m(x.spread, 0.5), 0.05, 1.5)) / y,
                    F = 0,
                    M = 0;
                  for (let e = 0; e < y; e++) {
                    let t =
                        (e +
                          0.5 +
                          (eq(3.7 * e + 1.3) - 0.5) * ($ ? 0.3 : 0.55)) /
                        y,
                      r = w * (0.55 + 0.9 * eq(5.1 * e + 2.9)),
                      a = b - t;
                    $ && (a -= Math.round(a));
                    let n =
                      Math.exp(-(a * a) / (2 * r * r)) *
                      (0.55 + 0.45 * eq(2.3 * e + 0.7));
                    n > F && ((F = n), (M = e));
                  }
                  return { profile: F, index: M, count: y };
                },
                ez = (e, t) => {
                  let r = 0,
                    a = 0,
                    n = { profile: 0, index: 0, count: 1 };
                  for (
                    let e = 0;
                    e < 10 &&
                    ((n = eL(
                      (r = -0.18 + eB() * (ei + 0.36)),
                      (a = -0.18 + eB() * (1 + 0.36)),
                    )),
                    !(eB() < n.profile));
                    e++
                  );
                  ((U[e] = r),
                    (Y[e] = a),
                    (W[e] = 2.8 + 3.6 * eB()),
                    (N[e] = t ? eB() * W[e] : 0));
                  let o = eB();
                  H[e] = n.profile * (0.22 + 0.78 * o * o * o) * 1.6;
                  let l = $
                    ? 0.5 - 0.5 * Math.cos((n.index / n.count) * Math.PI * 2)
                    : n.count > 1
                      ? n.index / (n.count - 1)
                      : 0.5;
                  ((_[e] = h(l + (eB() - 0.5) * 0.1, 0, 1)), (X[e] = 0));
                },
                eU = () => {
                  let e = r.current,
                    t = h(Math.round(m(e.streams, 4)), 1, 16),
                    a = (g * b) / 6e3,
                    n = h(m(e.spread, 0.5), 0.05, 1.5);
                  return Math.round(
                    h(
                      3400 * a * Math.sqrt(t / 4) * (0.6 + 0.8 * n),
                      600,
                      14800,
                    ),
                  );
                },
                eY = (e) => {
                  V = eU();
                  for (let t = 0; t < V; t++) ez(t, e);
                },
                eN = (e, t, r) => {
                  let a = Math.round(110 * h(r, 0, 3)),
                    n = 0.55 + 0.45 * eB();
                  for (let r = 0; r < a && V < 16e3; r++) {
                    let r = V++,
                      a = 0.055 * Math.sqrt(eB()),
                      o = eB() * Math.PI * 2;
                    ((U[r] = e + Math.cos(o) * a),
                      (Y[r] = t + Math.sin(o) * a),
                      (N[r] = 0.25 * eB()),
                      (W[r] = 3.2 + 2.8 * eB()),
                      (H[r] = 0.32 + 0.32 * eB()),
                      (_[r] = h(n + (eB() - 0.5) * 0.18, 0, 1)),
                      (X[r] = 1));
                  }
                },
                eW = () => {
                  let e, t, n, o, l;
                  if (!eu) return;
                  let u = r.current;
                  (performance.now() - ep > 1e3 &&
                    ((ep = performance.now()), eI()),
                    eT(),
                    (e = r.current),
                    (t = T.uniforms.uPitch.value),
                    (n = h(m(e.dotSize, 0.62), 0.1, 1)),
                    ((o = T.uniforms).uMaxRadius.value = 0.5 * t * n),
                    (o.uBaseRadius.value = Math.max(
                      0.6 * es,
                      0.5 * t * n * 0.22,
                    )),
                    (o.uBase.value = h(m(e.baseDots, 0.12), 0, 1)),
                    (o.uStretch.value = h(m(e.stretch, 0.2), 0, 2)),
                    (o.uVariance.value = h(m(e.variance, 0.35), 0, 1)),
                    (o.uSquare.value = +("square" === e.shape)),
                    (l = 0.08 + 0.9 * h(m(e.trail, 0.6), 0, 1.5)),
                    (o.uGain.value =
                      (1.05 * h(m(e.intensity, 1), 0, 4)) / (60 * l)),
                    (o.uFade.value = ey),
                    (z.uniforms.uGrain.value = h(m(e.grain, 0.2), 0, 1)),
                    eh && (T.blending = s.XIg),
                    (p.material = T),
                    a.setRenderTarget(D),
                    a.setClearColor(0, 0),
                    a.clear(),
                    a.render(d, i));
                  let c = eh ? 0 : h(m(u.bloom, 0.6), 0, 3);
                  if (c > 0.001) {
                    let e = D;
                    for (let t of ((p.material = q), G))
                      ((q.uniforms.uThreshold.value = 0.25 * (e === D)),
                        (q.uniforms.uSource.value = e.texture),
                        q.uniforms.uTexel.value.set(1 / e.width, 1 / e.height),
                        a.setRenderTarget(t),
                        a.render(d, i),
                        (e = t));
                    p.material = L;
                    for (let e = G.length - 1; e > 0; e--)
                      ((L.uniforms.uSource.value = G[e].texture),
                        L.uniforms.uTexel.value.set(
                          1 / G[e].width,
                          1 / G[e].height,
                        ),
                        a.setRenderTarget(G[e - 1]),
                        a.render(d, i));
                  }
                  ((z.uniforms.uBloomStrength.value = c),
                    (z.uniforms.uTime.value = ex),
                    (p.material = z),
                    a.setRenderTarget(null),
                    a.render(d, i));
                },
                eH = (e) => {
                  let t = h(m(r.current.speed, 0.6), 0, 3);
                  ((ef += e * eR()),
                    (ev += e * t * 0.075),
                    (eg += e * t * 0.2),
                    eD(),
                    ((e, t) => {
                      let r = 0,
                        a = eU();
                      for (let n = 0; n < V; n++) {
                        N[n] += e * (X[n] ? 1 : t);
                        let o = eG(et, U[n], Y[n], O, K),
                          l = eG(er, U[n], Y[n], O, K);
                        ((U[n] += o * e), (Y[n] += l * e));
                        let i =
                          U[n] < -0.25 ||
                          U[n] > ei + 0.25 ||
                          Y[n] < -0.25 ||
                          Y[n] > 1.25;
                        if (N[n] >= W[n] || i) {
                          if (X[n] || r >= a) continue;
                          ez(n, !1);
                        }
                        (r !== n &&
                          ((U[r] = U[n]),
                          (Y[r] = Y[n]),
                          (N[r] = N[n]),
                          (W[r] = W[n]),
                          (H[r] = H[n]),
                          (_[r] = _[n]),
                          (X[r] = X[n])),
                          r++);
                      }
                      for (V = r; V < a;) ez(V++, !1);
                    })(e, Math.min(1, t / 0.3)),
                    ((e) => {
                      let t = Math.exp(
                        -e / (0.08 + 0.9 * h(m(r.current.trail, 0.6), 0, 1.5)),
                      );
                      for (let e = 0; e < w.length; e++) w[e] *= t;
                      for (let e = 0; e < F.length; e++) F[e] *= t;
                      let a = Math.round(eo * es),
                        n = Math.round(el * es),
                        o = T.uniforms.uPitch.value,
                        l = (a - g * o) / 2,
                        i = (n - b * o) / 2,
                        s = (e) => ((e / ei) * a - l) / o - 0.5,
                        u = (e) => (e * n - i) / o - 0.5,
                        c = 60 * e;
                      for (let e = 0; e < V; e++) {
                        let t = N[e],
                          r =
                            Math.min(1, t / 0.5) *
                            Math.min(1, (W[e] - t) / 0.7);
                        if (r <= 0) continue;
                        let a = H[e] * r * c;
                        if (a <= 1e-4) continue;
                        let n = s(U[e]),
                          o = u(Y[e]),
                          l = Math.floor(n),
                          i = Math.floor(o);
                        if (l < -1 || i < -1 || l >= g || i >= b) continue;
                        let d = n - l,
                          h = o - i,
                          m = eA(
                            _[e] + 0.22 * Math.sin(1.7 * U[e] + eg + 4 * _[e]),
                          ),
                          p = eG(et, U[e], Y[e], O, K),
                          f = eG(er, U[e], Y[e], O, K);
                        for (let e = 0; e < 4; e++) {
                          let t = l + (1 & e),
                            r = i + (e >> 1);
                          if (t < 0 || r < 0 || t >= g || r >= b) continue;
                          let n =
                              (1 & e ? d : 1 - d) * (e >> 1 ? h : 1 - h) * a,
                            o = r * g + t;
                          ((w[4 * o] += m[0] * n),
                            (w[4 * o + 1] += m[1] * n),
                            (w[4 * o + 2] += m[2] * n),
                            (w[4 * o + 3] += n),
                            (F[2 * o] += p * n),
                            (F[2 * o + 1] += f * n));
                        }
                      }
                      ((C.needsUpdate = !0), (S.needsUpdate = !0));
                    })(e));
                },
                e_ = () => {
                  eC || eS || !eM || ew || (ew = requestAnimationFrame(eX));
                },
                eX = (e) => {
                  if (((ew = 0), eC || eS)) return;
                  let t = r.current,
                    a =
                      eF && e - eF < 100
                        ? Math.min(Math.max((e - eF) / 1e3, 0), 0.05)
                        : 1 / 60;
                  eF = e;
                  let n = !t.reduced && !t.paused;
                  if (0 === V) {
                    eT();
                    var o = t.reduced || !t.intro ? 3 : 1.2;
                    (eT(), eD(), eY(!0));
                    let e = 1 / 30;
                    for (let t = 0; t < o; t += e) eH(e);
                    (t.reduced || !t.intro) && (ey = 1);
                  }
                  if (
                    (n && ((ex += a), eH(a)), t.intro && !t.reduced && ey < 1)
                  ) {
                    eb < 0 && (eb = e);
                    let t = h((e - eb) / 2200, 0, 1);
                    ey = t * t * (3 - 2 * t);
                  } else ey = 1;
                  (eW(),
                    n && !document.hidden
                      ? (ew = requestAnimationFrame(eX))
                      : (eF = 0));
                },
                eV = (t) => {
                  let r = e.getBoundingClientRect();
                  return r.width <= 0 || r.height <= 0
                    ? null
                    : {
                        x: ((t.clientX - r.left) / r.width) * ei,
                        y: 1 - (t.clientY - r.top) / r.height,
                      };
                },
                eO = (e) => {
                  let t = r.current;
                  if (!t.interactive || t.reduced || t.paused) return;
                  let a = eV(e);
                  if (!a) return;
                  let n = ex;
                  if (!ej || n - ej.t > 0.25) {
                    ej = { x: a.x, y: a.y, t: n };
                    return;
                  }
                  let o = a.x - ej.x,
                    l = a.y - ej.y,
                    i = Math.hypot(o, l);
                  if (i < 0.035) return;
                  let s =
                    (Math.min(i / Math.max(0.012, n - ej.t), 3) /
                      Math.max(i, 1e-4)) *
                    0.12;
                  (en.push({ x: a.x, y: a.y, vx: o * s, vy: l * s, born: n }),
                    en.length > 40 && en.shift(),
                    (ej = { x: a.x, y: a.y, t: n }));
                },
                eK = () => {
                  ((ej = null), (eE = null));
                },
                eQ = (e) => {
                  var t;
                  let a = r.current;
                  ((eE = null),
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
                        (eE = {
                          id: e.pointerId,
                          x: e.clientX,
                          y: e.clientY,
                          time: performance.now(),
                        })));
                },
                eZ = (e) => {
                  let t = eE;
                  if (((eE = null), !t || t.id !== e.pointerId)) return;
                  let a = r.current;
                  if (
                    !a.interactive ||
                    a.reduced ||
                    a.paused ||
                    Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 ||
                    performance.now() - t.time > 500
                  )
                    return;
                  let n = eV(e);
                  n && (eN(n.x, n.y, h(m(a.plume, 1), 0, 3)), e_());
                },
                eJ = () => {
                  ((eF = 0), e_());
                },
                e$ = (e) => {
                  (e.preventDefault(),
                    (eS = !0),
                    cancelAnimationFrame(ew),
                    (ew = 0));
                },
                e0 = () => {
                  ((eS = !1), (ec = ""), e_());
                },
                e1 = new ResizeObserver(() => {
                  eP() && (eT(), V > 0 && eY(!0), eW(), e_());
                }),
                e2 = new IntersectionObserver(
                  ([e]) => {
                    ((eM = e.isIntersecting), (eF = 0), e_());
                  },
                  { rootMargin: "120px" },
                );
              return (
                e.addEventListener("pointermove", eO),
                e.addEventListener("pointerdown", eQ),
                e.addEventListener("pointerup", eZ),
                e.addEventListener("pointerleave", eK),
                e.addEventListener("pointercancel", eK),
                document.addEventListener("visibilitychange", eJ),
                l.addEventListener("webglcontextlost", e$),
                l.addEventListener("webglcontextrestored", e0),
                e1.observe(e),
                e2.observe(e),
                eP(),
                eI(),
                {
                  sync: () => {
                    ((ep = -10),
                      eP() && (ec = ""),
                      (eF = 0),
                      V > 0 && Math.abs(V - eU()) > 0.25 * eU() && eY(!0),
                      !ew && eM && (eW(), e_()));
                  },
                  plume: (e, t, a) => {
                    let n = r.current;
                    n.reduced ||
                      (eN(
                        h(e ?? 0.5, 0, 1) * ei,
                        1 - h(t ?? 0.5, 0, 1),
                        h(m(a ?? n.plume, 1), 0, 3),
                      ),
                      e_());
                  },
                  replay: () => {
                    ((eb = -1),
                      (ey = 0),
                      (V = 0),
                      w.fill(0),
                      F.fill(0),
                      (eF = 0),
                      e_());
                  },
                  destroy: () => {
                    for (let t of ((eC = !0),
                    cancelAnimationFrame(ew),
                    e1.disconnect(),
                    e2.disconnect(),
                    e.removeEventListener("pointermove", eO),
                    e.removeEventListener("pointerdown", eQ),
                    e.removeEventListener("pointerup", eZ),
                    e.removeEventListener("pointerleave", eK),
                    e.removeEventListener("pointercancel", eK),
                    document.removeEventListener("visibilitychange", eJ),
                    l.removeEventListener("webglcontextlost", e$),
                    l.removeEventListener("webglcontextrestored", e0),
                    c.dispose(),
                    T.dispose(),
                    q.dispose(),
                    L.dispose(),
                    z.dispose(),
                    C.dispose(),
                    S.dispose(),
                    D.dispose(),
                    G))
                      t.dispose();
                    (a.dispose(), l.remove());
                  },
                }
              );
            })(e, t, er);
            return (
              ($.current = r),
              () => {
                (r?.destroy(), ($.current = null));
              }
            );
          }, []),
          (0, n.useImperativeHandle)(
            Q,
            () => ({
              plume: (e, t, r) => $.current?.plume(e, t, r),
              replay: () => $.current?.replay(),
            }),
            [],
          ));
        let ea = t.trim().toLowerCase();
        return (0, a.jsxs)("div", {
          ref: Z,
          className: (0, c.cn)(
            "relative isolate h-full min-h-[320px] w-full overflow-hidden",
            O,
          ),
          style: {
            backgroundColor: "transparent" === ea || "" === ea ? void 0 : t,
            touchAction: "pan-y",
            ...K,
          },
          children: [
            (0, a.jsx)("div", {
              ref: J,
              "aria-hidden": "true",
              style: { position: "absolute", inset: 0, pointerEvents: "none" },
            }),
            V
              ? (0, a.jsx)("div", {
                  style: { position: "relative", zIndex: 1, height: "100%" },
                  children: V,
                })
              : null,
          ],
        });
      });
    A.displayName = "ChromaCurrent";
    let P = {
        pattern: "streams",
        colors: ["#5227FF", "#FF9FFC"],
        centerX: 0.5,
        centerY: 0.5,
        scale: 1,
        pitch: 8,
        dotSize: 0.62,
        variance: 0.35,
        shape: "circle",
        baseDots: 0.12,
        stretch: 0.2,
        streams: 4,
        spread: 0.5,
        speed: 0.6,
        direction: 0,
        turbulence: 0.6,
        trail: 0.6,
        intensity: 1,
        bloom: 0.6,
      },
      T = {
        current: P,
        galaxy: {
          ...P,
          pattern: "vortex",
          colors: ["#FF9FFC", "#5227FF"],
          streams: 3,
          spread: 0.7,
          pitch: 7,
          turbulence: 0.35,
          trail: 0.9,
        },
        sunrise: {
          ...P,
          pattern: "radial",
          colors: ["#B19EEF", "#FF9FFC"],
          centerY: 1.15,
          streams: 11,
          stretch: 0.9,
          trail: 1.1,
        },
        contours: {
          ...P,
          pattern: "contours",
          colors: ["#7C5CFF", "#FF9FFC"],
          streams: 7,
          spread: 0.3,
          pitch: 7,
          turbulence: 0.3,
          scale: 1.2,
        },
        signal: {
          ...P,
          pattern: "waves",
          colors: ["#FFFFFF", "#B19EEF"],
          streams: 9,
          spread: 0.25,
          pitch: 5,
          turbulence: 0.1,
          baseDots: 0,
          bloom: 0.9,
        },
        panel: {
          ...P,
          shape: "square",
          streams: 3,
          spread: 1.4,
          pitch: 14,
          dotSize: 0.86,
          variance: 0,
          baseDots: 0.3,
          bloom: 0.35,
        },
        halftone: {
          ...P,
          pattern: "contours",
          colors: ["#5227FF", "#FF9FFC"],
          streams: 3,
          spread: 0.75,
          turbulence: 0.15,
          scale: 2.2,
          intensity: 1.15,
          pitch: 14,
          dotSize: 1,
          variance: 1,
          baseDots: 0,
          bloom: 0.2,
          speed: 0.4,
        },
        aurora: {
          ...P,
          colors: ["#7C5CFF", "#B19EEF"],
          direction: 90,
          streams: 6,
          spread: 0.45,
          turbulence: 1,
          speed: 0.45,
          trail: 1.2,
        },
      },
      R = [
        { label: "Current", value: "current" },
        { label: "Galaxy", value: "galaxy" },
        { label: "Sunrise", value: "sunrise" },
        { label: "Contours", value: "contours" },
        { label: "Signal", value: "signal" },
        { label: "Panel", value: "panel" },
        { label: "Halftone", value: "halftone" },
        { label: "Aurora", value: "aurora" },
      ],
      D = [
        { label: "Streams", value: "streams" },
        { label: "Waves", value: "waves" },
        { label: "Vortex", value: "vortex" },
        { label: "Radial", value: "radial" },
        { label: "Contours", value: "contours" },
      ],
      G = [
        { label: "Circle", value: "circle" },
        { label: "Square", value: "square" },
      ],
      q = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#5227FF", "#FF9FFC"]',
          description:
            "Two colours the currents are tinted between, blended in OKLab and drifting slowly along each stream. On light backgrounds they become matching inks.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Background of the component. Transparent reads the colour behind the component.",
        },
        {
          name: "pattern",
          type: '"streams" | "waves" | "vortex" | "radial" | "contours"',
          default: '"streams"',
          description:
            "Shape of the flow: meandering currents, clean sine waves, a spiral whirlpool, rays fanning out from a point, or the moving contour lines of a landscape.",
        },
        {
          name: "scale",
          type: "number",
          default: "1",
          description:
            "Size of the pattern: the wavelength of waves, the tightness of the spiral, or the size of contour shapes.",
        },
        {
          name: "centerX",
          type: "number",
          default: "0.5",
          description:
            "Horizontal centre of the vortex and radial patterns, as a fraction of the width. Values outside 0 to 1 place it off-frame.",
        },
        {
          name: "centerY",
          type: "number",
          default: "0.5",
          description:
            "Vertical centre of the vortex and radial patterns, as a fraction of the height from the top. 1.2 rises rays from below the frame.",
        },
        {
          name: "pitch",
          type: "number",
          default: "8",
          description: "Distance between dots in pixels.",
        },
        {
          name: "dotSize",
          type: "number",
          default: "0.62",
          description: "Size of a fully lit dot as a share of the pitch.",
        },
        {
          name: "variance",
          type: "number",
          default: "0.35",
          description:
            "How much a dot's size follows its brightness: 0 keeps every dot the same size like an LED panel, 1 gives a halftone.",
        },
        {
          name: "shape",
          type: '"circle" | "square"',
          default: '"circle"',
          description: "Shape of each dot.",
        },
        {
          name: "baseDots",
          type: "number",
          default: "0.12",
          description:
            "Faint unlit dots across the whole grid, so the matrix reads even where no current flows.",
        },
        {
          name: "stretch",
          type: "number",
          default: "0.2",
          description:
            "How much bright dots stretch along the direction of the flow, like a slight motion blur.",
        },
        {
          name: "streams",
          type: "number",
          default: "4",
          description:
            "Number of currents, waves, spiral arms, rays or contour levels, from 1 to 16.",
        },
        {
          name: "spread",
          type: "number",
          default: "0.5",
          description: "Width of each current.",
        },
        {
          name: "speed",
          type: "number",
          default: "0.6",
          description: "How fast the currents flow. 0 holds them still.",
        },
        {
          name: "direction",
          type: "number",
          default: "0",
          description:
            "Direction of the flow in degrees for streams and waves: 0 flows to the right, 90 rises. For vortex and contours, negative values reverse the spin.",
        },
        {
          name: "turbulence",
          type: "number",
          default: "0.6",
          description: "How much the currents meander and curl.",
        },
        {
          name: "trail",
          type: "number",
          default: "0.6",
          description:
            "How long the light lingers behind the moving particles. Higher values give smoother, longer streams.",
        },
        {
          name: "intensity",
          type: "number",
          default: "1",
          description: "Brightness of the currents.",
        },
        {
          name: "bloom",
          type: "number",
          default: "0.6",
          description:
            "Soft glow around the brightest dots on dark backgrounds.",
        },
        {
          name: "grain",
          type: "number",
          default: "0.2",
          description: "Fine film grain over the lit areas.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Moving the pointer stirs the currents like a hand through water; clicking or tapping releases a puff of dye.",
        },
        {
          name: "stir",
          type: "number",
          default: "1",
          description: "How strongly the pointer stirs the flow.",
        },
        {
          name: "plume",
          type: "number",
          default: "1",
          description: "Amount of dye a click releases. 0 turns it off.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "The currents fade in as they start flowing when the component first appears.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops the motion. Reduced-motion users get still currents.",
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
            "Content laid over the currents, such as a hero headline. Clicks on its links and buttons never release dye.",
        },
        {
          name: "ref",
          type: "{ plume, replay }",
          default: "—",
          description:
            "plume(x?, y?, strength?) releases dye at a point given in fractions of the size; replay() replays the intro.",
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
      L = () => {
        let [e, t] = (0, i.I)(),
          r = (0, l.Y)(),
          [s, u] = (0, n.useState)("current"),
          [c, d] = (0, n.useState)(T.current),
          h = (e) => (t) => d((r) => ({ ...r, [e]: t })),
          [m, p] = (0, n.useState)(null),
          f = m ?? ("dark" === r ? "#0A0A0A" : "#FFFFFF"),
          [v, g] = (0, n.useState)(0.2),
          [x, y] = (0, n.useState)(1),
          [b, w] = (0, n.useState)(1),
          [F, M] = (0, n.useState)(!0),
          [C, S] = (0, n.useState)(!0),
          [k, j] = (0, n.useState)(!1);
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(o.Bg, {}),
            (0, a.jsxs)(o.VX, {
              children: [
                (0, a.jsxs)(o.Ec, {
                  children: [
                    (0, a.jsx)(o.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, a.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, a.jsx)(
                          A,
                          {
                            ...c,
                            backgroundColor: f,
                            grain: v,
                            stir: x,
                            plume: b,
                            interactive: F,
                            intro: C,
                            paused: k,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, a.jsxs)(o.IH, {
                      children: [
                        (0, a.jsx)(o.bg, {
                          title: "Preset",
                          value: s,
                          options: R,
                          onChange: (e) => {
                            (u(e), d(T[e] ?? T.current), t());
                          },
                        }),
                        (0, a.jsx)(o.bg, {
                          title: "Pattern",
                          value: c.pattern,
                          options: D,
                          onChange: (e) => h("pattern")(e),
                        }),
                        (0, a.jsx)(o.bg, {
                          title: "Shape",
                          value: c.shape,
                          options: G,
                          onChange: (e) => h("shape")(e),
                        }),
                        (0, a.jsx)(o.W7, {
                          title: "Color A",
                          value: c.colors[0],
                          onChange: (e) =>
                            d((t) => ({ ...t, colors: [e, t.colors[1]] })),
                        }),
                        (0, a.jsx)(o.W7, {
                          title: "Color B",
                          value: c.colors[1],
                          onChange: (e) =>
                            d((t) => ({ ...t, colors: [t.colors[0], e] })),
                        }),
                        (0, a.jsx)(o.W7, {
                          title: "Background",
                          value: f,
                          onChange: p,
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Scale",
                          min: 0.4,
                          max: 3,
                          step: 0.01,
                          value: c.scale,
                          onChange: h("scale"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Center X",
                          min: -0.5,
                          max: 1.5,
                          step: 0.01,
                          value: c.centerX,
                          onChange: h("centerX"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Center Y",
                          min: -0.5,
                          max: 1.5,
                          step: 0.01,
                          value: c.centerY,
                          onChange: h("centerY"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Pitch",
                          min: 4,
                          max: 24,
                          step: 1,
                          value: c.pitch,
                          valueUnit: "px",
                          onChange: h("pitch"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Dot Size",
                          min: 0.2,
                          max: 1,
                          step: 0.01,
                          value: c.dotSize,
                          onChange: h("dotSize"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Variance",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.variance,
                          onChange: h("variance"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Base Dots",
                          min: 0,
                          max: 0.6,
                          step: 0.01,
                          value: c.baseDots,
                          onChange: h("baseDots"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Stretch",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: c.stretch,
                          onChange: h("stretch"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Streams",
                          min: 1,
                          max: 12,
                          step: 1,
                          value: c.streams,
                          onChange: h("streams"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Spread",
                          min: 0.1,
                          max: 1.4,
                          step: 0.01,
                          value: c.spread,
                          onChange: h("spread"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Speed",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.speed,
                          onChange: h("speed"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Direction",
                          min: -180,
                          max: 180,
                          step: 1,
                          value: c.direction,
                          valueUnit: "\xb0",
                          onChange: h("direction"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Turbulence",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.turbulence,
                          onChange: h("turbulence"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Trail",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: c.trail,
                          onChange: h("trail"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Intensity",
                          min: 0.2,
                          max: 3,
                          step: 0.01,
                          value: c.intensity,
                          onChange: h("intensity"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Bloom",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.bloom,
                          onChange: h("bloom"),
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Grain",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: v,
                          onChange: g,
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Stir",
                          min: 0,
                          max: 2.5,
                          step: 0.01,
                          value: x,
                          onChange: y,
                        }),
                        (0, a.jsx)(o.yt, {
                          title: "Plume",
                          min: 0,
                          max: 2.5,
                          step: 0.01,
                          value: b,
                          onChange: w,
                        }),
                        (0, a.jsx)(o.tl, {
                          title: "Interactive",
                          checked: F,
                          onChange: M,
                        }),
                        (0, a.jsx)(o.tl, {
                          title: "Intro",
                          checked: C,
                          onChange: S,
                        }),
                        (0, a.jsx)(o.tl, {
                          title: "Paused",
                          checked: k,
                          onChange: j,
                        }),
                      ],
                    }),
                    (0, a.jsx)(o.Ub, { data: q }),
                  ],
                }),
                (0, a.jsx)(o.lT, { children: (0, a.jsx)(o.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
