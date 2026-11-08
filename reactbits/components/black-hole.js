/* ReactBits Pro public preview module 30792 for black-hole.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/30792.926c30b9ce998297.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  30792: (e, t, o) => {
    (o.r(t), o.d(t, { default: () => R }));
    var r = o(95155),
      a = o(12115),
      n = o(56388),
      l = o(86049),
      i = o(90761),
      u = o(2253),
      s = o(12246),
      c = o(90650);
    let d = (e, t, o) => Math.min(o, Math.max(t, e)),
      m = (e, t) => (Number.isFinite(e) ? e : t),
      p = new u.Q1f(),
      v = (e) => {
        let t = e.trim().toLowerCase();
        if (!t || "transparent" === t || "none" === t || "auto" === t)
          return null;
        let o = /^rgba?\(([^)]+)\)$/.exec(t);
        if (o) {
          let e = o[1]
              .split(/[\s,/]+/)
              .filter(Boolean)
              .map((e) => Number.parseFloat(e)),
            t = e.length > 3 && Number.isFinite(e[3]) ? d(e[3], 0, 1) : 1;
          return [(e[0] ?? 0) / 255, (e[1] ?? 0) / 255, (e[2] ?? 0) / 255, t];
        }
        try {
          p.setStyle(t, u.jf0);
        } catch {
          return null;
        }
        return [p.r, p.g, p.b, 1];
      },
      f = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      h = (e, t, o) => {
        let r = f(e),
          a = f(t),
          n = f(o),
          l = Math.cbrt(0.4122214708 * r + 0.5363325363 * a + 0.0514459929 * n),
          i = Math.cbrt(0.2119034982 * r + 0.6806995451 * a + 0.1073969566 * n),
          u = Math.cbrt(0.0883024619 * r + 0.2817188376 * a + 0.6299787005 * n);
        return [
          0.2104542553 * l + 0.793617785 * i - 0.0040720468 * u,
          1.9779984951 * l - 2.428592205 * i + 0.4505937099 * u,
          0.0259040371 * l + 0.7827717662 * i - 0.808675766 * u,
        ];
      },
      g = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      b = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      x = `
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      y = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uZoom;
uniform float uCount;
uniform float uOrbSize;
uniform float uGlow;
uniform float uContrast;
uniform float uSplits;
uniform float uWarp;
uniform float uDistFade;
uniform vec3 uColorShift;
uniform float uColorRate;
uniform float uFade;
in vec2 vUv;
out vec4 fragColor;

const float TAU = 6.2831853;
const float PI = 3.14159265;

vec2 mirror(vec2 p, float seg) {
  float a = atan(p.y, p.x);
  a = ((a / PI) + 1.0) * 0.5;
  a = mod(a, 1.0 / seg) * seg;
  a = -abs(2.0 * a - 1.0) + 1.0;
  float r = length(p);
  a *= r;
  return vec2(a, r);
}

void main() {
  vec2 st = 2.0 * vUv - 1.0;
  st.x *= uRes.x / uRes.y;
  st *= uZoom;

  float dist = length(st);

  vec2 warpSt = uWarp > 0.5 ? st * mirror(st, uSplits) : st;
  float soft = max(length(fwidth(warpSt)) * 1.25, 0.0004);
  float swing = fwidth(PI / max(dist, 0.0001)) / uCount;

  vec3 acc = vec3(0.0);

  for (float i = 0.0; i < 30.0; i++) {
    if (i >= uCount) break;
    float t = uTime - i * PI / uCount * cos(uTime / max(i, 0.0001));
    float lens = sin(i / uCount * PI / dist + uTime);
    vec2 orb = vec2(cos(t), sin(t)) / (abs(lens) < 0.0001 ? 0.0001 : lens);
    vec3 hue = cos(uColorShift * TAU / PI + PI * (uTime / (i + 1.0) * uColorRate)) * uGlow + uGlow;
    vec2 gap = warpSt - orb * uOrbSize;
    float calm = 1.0 - smoothstep(0.9, 2.2, swing * i);
    acc += dist * uDistFade * inversesqrt(dot(gap, gap) + soft * soft) * hue * calm;
  }

  acc = pow(max(acc * uFade, 0.0), vec3(uContrast));
  fragColor = vec4(min(acc, vec3(1024.0)), 1.0);
}
`,
      w = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uFirst;
in vec2 vUv;
out vec4 fragColor;
vec3 tap(vec2 d) {
  vec3 c = texture(uSource, vUv + d * uTexel).rgb;
  if (uFirst > 0.5) c = clamp(c - 1.0, 0.0, 8.0);
  return c;
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
  fragColor = vec4(color, 1.0);
}
`,
      C = `
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
      S = `
precision highp float;
uniform sampler2D uField;
uniform sampler2D uBloom;
uniform vec2 uRes;
uniform float uBloomStrength;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uLine;
uniform float uRing;
uniform float uTint;
uniform vec3 uLabA;
uniform vec3 uLabB;
uniform vec3 uCool;
uniform float uInk;
uniform vec3 uInkLab;
uniform vec3 uBg;
uniform float uSolid;
uniform float uAlpha;
uniform float uFrame;
in vec2 vUv;
out vec4 fragColor;

vec3 decode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 toLab(vec3 c) {
  vec3 lms = mat3(0.4122214708, 0.2119034982, 0.0883024619, 0.5363325363, 0.6806995451, 0.2817188376, 0.0514459929, 0.1073969566, 0.6299787005) * c;
  lms = pow(max(lms, 0.0), vec3(1.0 / 3.0));
  return mat3(0.2104542553, 1.9779984951, 0.0259040371, 0.793617785, -2.428592205, 0.7827717662, -0.0040720468, 0.4505937099, -0.808675766) * lms;
}

vec3 fromLab(vec3 lab) {
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  lms = lms * lms * lms;
  return max(mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * lms, 0.0);
}

vec3 knee(vec3 x) {
  vec3 u = max(x - 0.68, 0.0) / 0.32;
  return mix(x, 0.68 + 0.32 * (1.0 - pow(1.0 + u * 0.25, vec3(-4.0))), step(0.68, x));
}

float pearl(float e) {
  float sheen = clamp((log(max(e, 0.000001)) - 0.18232) / 4.19970, 0.0, 1.0);
  return 1.0 - 0.11 * (1.0 - pow(sheen, 0.7)) * smoothstep(0.8, 1.6, e);
}

float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
  vec3 field = texture(uField, vUv).rgb;
  vec3 glow = texture(uBloom, vUv).rgb;
  vec2 offset = gl_FragCoord.xy - uCenter;
  float r = length(offset);
  float edge = r - uRadius;
  vec2 probe = (uCenter + offset / max(r, 0.0001) * uRadius * 1.22) / uRes;
  float near = dot(texture(uBloom, probe).rgb, vec3(0.3333)) * 0.25;
  float line = exp(-edge * edge / (uLine * uLine)) + 0.25 * exp(-abs(edge) / (uLine * 6.0));
  float halo = 1.0 - exp(-line * uRing * (0.14 + 0.9 * clamp(near, 0.0, 1.5)));
  vec3 base = knee(field) * pearl(dot(field, vec3(0.3333)));
  vec3 lift = 1.0 - exp(-glow * uBloomStrength);
  vec3 tone = 1.0 - (1.0 - base) * (1.0 - lift);
  float y = dot(tone, vec3(0.3333));
  float dither = (ign(gl_FragCoord.xy + uFrame * 5.588238) - 0.5) / 255.0;

  if (uInk > 0.5) {
    vec3 lab = toLab(decode(tone / max(max(tone.r, max(tone.g, tone.b)), 0.0001)));
    float chroma = length(lab.yz);
    vec2 hue = uTint < 0.5 && chroma > 0.03 ? lab.yz / chroma * clamp(chroma * 1.2, 0.07, 0.16) : uInkLab.yz;
    float cover = max(clamp(pow(y, 1.1) * 1.03 * clamp(y * 6.0, 0.0, 1.0), 0.0, 1.0), halo);
    vec3 ink = encode(fromLab(vec3(uInkLab.x + 0.4 * pow(1.0 - clamp(max(y, halo), 0.0, 1.0), 0.6), hue)));
    if (uSolid > 0.5) {
      fragColor = vec4(mix(uBg, ink, cover) + dither, uAlpha);
    } else {
      fragColor = vec4(ink, clamp(cover * uAlpha + dither, 0.0, 1.0));
    }
    return;
  }

  float shade = clamp(y / 0.12, 0.0, 1.0) * (1.0 - clamp((y - 0.3) / 0.45, 0.0, 1.0));
  vec3 color;
  if (uTint > 0.5) {
    color = encode(fromLab(mix(uLabB, uLabA, smoothstep(0.45, 0.99, y)))) * y;
  } else {
    color = tone * mix(vec3(1.0), uCool, shade);
  }

  float cover = max(clamp(y * 6.0, 0.0, 1.0), halo);
  color = 1.0 - (1.0 - color) * (1.0 - halo);
  if (uSolid > 0.5) {
    fragColor = vec4(mix(uBg, color, cover) + dither, uAlpha);
  } else {
    fragColor = vec4(color, clamp(cover * uAlpha + dither, 0.0, 1.0));
  }
}
`,
      F = (0, a.forwardRef)(function (
        {
          width: e = "100%",
          height: t = "100%",
          className: o,
          style: n,
          children: l,
          speed: i = 1,
          zoom: p = 1.8,
          particleCount: f = 13,
          orbSize: F = 0.75,
          glow: I = 0.08,
          contrast: k = 3,
          mirrorSplits: j = 2,
          warpEnabled: L = !0,
          distanceFade: R = 0.35,
          colorShiftR: E = -6,
          colorShiftG: M = -6,
          colorShiftB: T = -6,
          colorSpeed: B = 0.2,
          colors: P,
          backgroundColor: z = "#000000",
          opacity: A = 1,
          bloom: N = 1,
          ringIntensity: U = 1,
          cursorInteraction: G = !0,
          cursorIntensity: W = 1,
          intro: q = !0,
          paused: D = !1,
          dpr: _ = 2,
        },
        H,
      ) {
        let O = (0, a.useRef)(null),
          Y = (0, a.useRef)(null),
          X = (0, a.useRef)(null),
          Z = {
            speed: i,
            zoom: p,
            particleCount: f,
            orbSize: F,
            glow: I,
            contrast: k,
            mirrorSplits: j,
            warpEnabled: L,
            distanceFade: R,
            colorShiftR: E,
            colorShiftG: M,
            colorShiftB: T,
            colorSpeed: B,
            colors: P ?? null,
            backgroundColor: z,
            opacity: A,
            bloom: N,
            ringIntensity: U,
            cursorInteraction: G,
            cursorIntensity: W,
            intro: q,
            paused: D,
            dpr: _,
            reduced: (0, a.useSyncExternalStore)(g, b, () => !1),
          },
          V = (0, a.useRef)(Z);
        return (
          (0, a.useEffect)(() => {
            ((V.current = Z), X.current?.sync());
          }),
          (0, a.useEffect)(() => {
            let e = O.current,
              t = Y.current;
            if (!e || !t) return;
            let o = (function (e, t, o) {
              let r,
                a = e.ownerDocument,
                n = a.defaultView ?? window,
                l = a.createElement("canvas");
              (l.setAttribute("aria-hidden", "true"),
                (l.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block"));
              try {
                r = new s.WebGLRenderer({
                  canvas: l,
                  alpha: !0,
                  premultipliedAlpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (t.appendChild(l), (r.autoClear = !1), r.setClearColor(0, 0));
              let i =
                  r.extensions.has("EXT_color_buffer_float") ||
                  r.extensions.has("EXT_color_buffer_half_float")
                    ? u.ix0
                    : u.OUM,
                c = new u.qUd(-1, 1, 1, -1, -1, 1),
                p = new u.LoY();
              p.setAttribute(
                "position",
                new u.qtW([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
              );
              let f = new u.Z58(),
                g = new u.eaF(p);
              ((g.frustumCulled = !1), f.add(g));
              let b = (e, t, o = !1) =>
                  new u.D$Q({
                    glslVersion: u.Wdf,
                    vertexShader: x,
                    fragmentShader: e,
                    uniforms: t,
                    blending: o ? u.EZo : u.XIg,
                    transparent: o,
                    depthTest: !1,
                    depthWrite: !1,
                  }),
                F = {
                  uRes: { value: new u.I9Y(1, 1) },
                  uTime: { value: 0 },
                  uZoom: { value: 1.8 },
                  uCount: { value: 13 },
                  uOrbSize: { value: 0.75 },
                  uGlow: { value: 0.08 },
                  uContrast: { value: 3 },
                  uSplits: { value: 2 },
                  uWarp: { value: 1 },
                  uDistFade: { value: 0.35 },
                  uColorShift: { value: new u.Pq0(-6, -6, -6) },
                  uColorRate: { value: 0.2 },
                  uFade: { value: 1 },
                },
                I = b(y, F),
                k = () =>
                  new u.nWS(1, 1, {
                    type: i,
                    format: u.GWd,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    minFilter: u.k6q,
                    magFilter: u.k6q,
                    generateMipmaps: !1,
                  }),
                j = k(),
                L = Array.from({ length: 6 }, k),
                R = b(w, {
                  uSource: { value: null },
                  uTexel: { value: new u.I9Y() },
                  uFirst: { value: 0 },
                }),
                E = b(
                  C,
                  { uSource: { value: null }, uTexel: { value: new u.I9Y() } },
                  !0,
                ),
                M = {
                  uField: { value: j.texture },
                  uBloom: { value: L[1].texture },
                  uRes: { value: new u.I9Y(1, 1) },
                  uBloomStrength: { value: 0.1 },
                  uCenter: { value: new u.I9Y() },
                  uRadius: { value: 100 },
                  uLine: { value: 1 },
                  uRing: { value: 1 },
                  uTint: { value: 0 },
                  uLabA: { value: new u.Pq0(1, 0, 0) },
                  uLabB: { value: new u.Pq0(0.5, 0, 0) },
                  uCool: { value: new u.Pq0(0.86, 0.89, 1) },
                  uInk: { value: 0 },
                  uInkLab: { value: new u.Pq0(0.24, 0.035, -0.13) },
                  uBg: { value: new u.Pq0(0, 0, 0) },
                  uSolid: { value: 1 },
                  uAlpha: { value: 1 },
                  uFrame: { value: 0 },
                },
                T = b(S, M),
                B = 0,
                P = 0,
                z = 1,
                A = !1,
                N = "",
                U = -10,
                G = 0,
                W = 0,
                q = 0,
                D = !1,
                _ = 0,
                H = 0,
                O = -1,
                Y = 1,
                X = 0,
                Z = 0,
                V = !1,
                Q = !1,
                $ = !1,
                K = null,
                J = () => {
                  let t = o.current,
                    r = v(t.backgroundColor),
                    a = !!r && r[3] > 0.05,
                    l =
                      a && r
                        ? [r[0], r[1], r[2]]
                        : (() => {
                            let t = e.parentElement;
                            for (; t;) {
                              let e = n
                                .getComputedStyle(t)
                                .backgroundColor.match(/rgba?\(([^)]+)\)/);
                              if (e) {
                                let t = e[1]
                                  .split(/[\s,/]+/)
                                  .filter(Boolean)
                                  .map((e) => Number.parseFloat(e));
                                if (t.length < 4 || t[3] > 0.05)
                                  return [t[0] / 255, t[1] / 255, t[2] / 255];
                              }
                              t = t.parentElement;
                            }
                            return n.matchMedia("(prefers-color-scheme: dark)")
                              .matches
                              ? [0, 0, 0]
                              : [1, 1, 1];
                          })(),
                    i = [l.join(","), a, t.colors?.join(",") ?? ""].join("|");
                  if (i === N) return;
                  ((N = i),
                    (M.uSolid.value = +!!a),
                    M.uBg.value.set(l[0], l[1], l[2]),
                    (M.uInk.value = +(
                      0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2] >
                      0.55
                    )));
                  let u = t.colors ? v(t.colors[0]) : null,
                    s = t.colors ? v(t.colors[1]) : null;
                  if ((M.uInkLab.value.set(0.24, 0.035, -0.13), u && s)) {
                    let e = h(u[0], u[1], u[2]),
                      t = h(s[0], s[1], s[2]);
                    (M.uLabA.value.set(e[0], e[1], e[2]),
                      M.uLabB.value.set(t[0], t[1], t[2]),
                      (M.uTint.value = 1));
                    let o =
                        Math.hypot(e[1], e[2]) > Math.hypot(t[1], t[2]) ? e : t,
                      r = Math.hypot(o[1], o[2]);
                    if (r > 0.02) {
                      let e = d(1.1 * r, 0.07, 0.16) / r;
                      M.uInkLab.value.set(0.28, o[1] * e, o[2] * e);
                    }
                  } else M.uTint.value = 0;
                },
                ee = () => {
                  let t = o.current,
                    a = Math.round(e.clientWidth),
                    l = Math.round(e.clientHeight);
                  if (a < 2 || l < 2) return ((A = !1), !1);
                  let i = Math.min(
                    n.devicePixelRatio || 1,
                    d(m(t.dpr, 2), 0.5, 3),
                  );
                  if (A && a === B && l === P && i === z) return !1;
                  ((A = !0),
                    (B = a),
                    (P = l),
                    (z = i),
                    r.setPixelRatio(z),
                    r.setSize(B, P, !1));
                  let u = Math.max(1, Math.round(B * z)),
                    s = Math.max(1, Math.round(P * z));
                  (j.setSize(u, s),
                    F.uRes.value.set(u, s),
                    M.uRes.value.set(u, s));
                  let c = u,
                    p = s;
                  for (let e of L)
                    ((c = Math.max(1, Math.round(c / 2))),
                      (p = Math.max(1, Math.round(p / 2))),
                      e.setSize(c, p));
                  return !0;
                },
                et = () => {
                  if (!A) return;
                  let e = o.current;
                  performance.now() - U > 1e3 && ((U = performance.now()), J());
                  let t = 1 - Math.pow(1 - Y, 3),
                    a = (1 - t) * (1 - t),
                    n = d(m(e.zoom, 1.8), 0.2, 10),
                    l =
                      d(m(e.orbSize, 0.75), 0.01, 5) *
                      (1 + 0.8 * a) *
                      (1 - 0.5 * d(_, -0.6, 1.4));
                  ((F.uTime.value = 0.5 * G - 2.2 * a),
                    (F.uZoom.value = n),
                    (F.uCount.value = d(
                      Math.round(m(e.particleCount, 13)),
                      1,
                      30,
                    )),
                    (F.uOrbSize.value = l),
                    (F.uGlow.value = Math.max(m(e.glow, 0.08), 0)),
                    (F.uContrast.value = d(m(e.contrast, 3), 0.1, 12)),
                    (F.uSplits.value = d(m(e.mirrorSplits, 2), 1, 16)),
                    (F.uWarp.value = +!!e.warpEnabled),
                    (F.uDistFade.value = Math.max(m(e.distanceFade, 0.35), 0)),
                    F.uColorShift.value.set(
                      m(e.colorShiftR, -6),
                      m(e.colorShiftG, -6),
                      m(e.colorShiftB, -6),
                    ),
                    (F.uColorRate.value = m(e.colorSpeed, 0.2)),
                    (F.uFade.value = t));
                  let i = j.height,
                    u = e.warpEnabled ? 0.96 * Math.pow(l, 0.64) : 0.9 * l;
                  (M.uCenter.value.set(j.width / 2, i / 2),
                    (M.uRadius.value = (u * i) / (2 * n)),
                    (M.uLine.value = 1.25 * z),
                    (M.uRing.value = d(m(e.ringIntensity, 1), 0, 4) * t),
                    (M.uAlpha.value = d(m(e.opacity, 1), 0, 1)),
                    (M.uFrame.value = W % 64));
                  let s =
                    d(m(e.bloom, 1), 0, 4) * (M.uInk.value > 0.5 ? 0.6 : 1);
                  M.uBloomStrength.value = 0.06 * s;
                  let p = z >= 1.5 ? 2 : 1,
                    v = p + 4;
                  ((M.uBloom.value = L[p].texture),
                    (g.material = I),
                    r.setRenderTarget(j),
                    r.render(f, c));
                  let h = j;
                  g.material = R;
                  for (let e = 0; e < v; e++) {
                    let t = L[e];
                    ((R.uniforms.uFirst.value = +(h === j)),
                      (R.uniforms.uSource.value = h.texture),
                      R.uniforms.uTexel.value.set(1 / h.width, 1 / h.height),
                      r.setRenderTarget(t),
                      r.render(f, c),
                      (h = t));
                  }
                  g.material = E;
                  for (let e = v - 1; e > p; e--)
                    ((E.uniforms.uSource.value = L[e].texture),
                      E.uniforms.uTexel.value.set(
                        1 / L[e].width,
                        1 / L[e].height,
                      ),
                      r.setRenderTarget(L[e - 1]),
                      r.render(f, c));
                  ((g.material = T),
                    r.setRenderTarget(null),
                    r.clear(),
                    r.render(f, c),
                    W++);
                },
                eo = () => {
                  Q || $ || !V || X || (X = requestAnimationFrame(er));
                },
                er = (e) => {
                  if (((X = 0), Q || $)) return;
                  let t = o.current,
                    r =
                      Z && e - Z < 100
                        ? Math.min(Math.max((e - Z) / 1e3, 0), 0.05)
                        : 1 / 60;
                  Z = e;
                  let n = t.cursorInteraction && !t.reduced && D ? 1 : 0;
                  ((q += (n - q) * (1 - Math.exp(-r / 0.6))),
                    5e-4 > Math.abs(n - q) && (q = n));
                  let l = !t.reduced && !t.paused;
                  if (l) {
                    let e = 1 + 0.5 * d(m(t.cursorIntensity, 1), 0, 3) * q;
                    G += r * d(m(t.speed, 1), 0, 10) * e;
                  }
                  t.intro && !t.reduced
                    ? (O < 0 && (O = e), (Y = d((e - O) / 1e3 / 2.6, 0, 1)))
                    : (Y = 1);
                  let i = r;
                  for (; i > 0;) {
                    let e = Math.min(i, 1 / 120);
                    ((H += (-56 * _ - 6.3 * H) * e), (_ += H * e), (i -= e));
                  }
                  (Math.abs(_) + Math.abs(H) < 4e-4 && ((_ = 0), (H = 0)),
                    et());
                  let u = q !== n || 0 !== _ || Y < 1;
                  (l || u) && !a.hidden
                    ? (X = requestAnimationFrame(er))
                    : (Z = 0);
                },
                ea = (e) => {
                  H = Math.min(H + 6.5 * e, 14);
                },
                en = (e) => {
                  var t;
                  !e.isPrimary ||
                    ((t = e.target) &&
                      "function" == typeof t.closest &&
                      t.closest(
                        "a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]",
                      )) ||
                    (("mouse" !== e.pointerType || 0 === e.button) &&
                      (K = {
                        id: e.pointerId,
                        x: e.clientX,
                        y: e.clientY,
                        time: performance.now(),
                      }));
                },
                el = (e) => {
                  let t = K;
                  if (
                    ((K = null),
                    !t ||
                      t.id !== e.pointerId ||
                      Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 ||
                      performance.now() - t.time > 600)
                  )
                    return;
                  let r = o.current;
                  !r.cursorInteraction ||
                    r.reduced ||
                    r.paused ||
                    (ea(d(m(r.cursorIntensity, 1), 0, 3)), eo());
                },
                ei = (e) => {
                  "touch" === e.pointerType || D || ((D = !0), eo());
                },
                eu = (e) => {
                  "touch" !== e.pointerType && ((D = !1), eo());
                },
                es = () => {
                  K = null;
                },
                ec = () => {
                  ((Z = 0), eo());
                },
                ed = (e) => {
                  (e.preventDefault(),
                    ($ = !0),
                    cancelAnimationFrame(X),
                    (X = 0));
                },
                em = () => {
                  (($ = !1), (N = ""), eo());
                },
                ep = new ResizeObserver(() => {
                  ee() && (et(), eo());
                }),
                ev = new IntersectionObserver(
                  ([e]) => {
                    ((V = e.isIntersecting), (Z = 0), eo());
                  },
                  { rootMargin: "120px" },
                );
              return (
                e.addEventListener("pointerdown", en),
                e.addEventListener("pointerup", el),
                e.addEventListener("pointermove", ei),
                e.addEventListener("pointerleave", eu),
                e.addEventListener("pointercancel", es),
                a.addEventListener("visibilitychange", ec),
                l.addEventListener("webglcontextlost", ed),
                l.addEventListener("webglcontextrestored", em),
                ep.observe(e),
                ev.observe(e),
                o.current.intro && !o.current.reduced && (Y = 0),
                (G = 3 * !!o.current.reduced),
                ee(),
                J(),
                {
                  sync: () => {
                    ((U = -10), ee(), (Z = 0), !X && V && (et(), eo()));
                  },
                  gulp: (e) => {
                    let t = o.current;
                    t.reduced ||
                      (ea(d(m(e ?? t.cursorIntensity, 1), 0, 3)), eo());
                  },
                  replay: () => {
                    o.current.reduced || ((O = -1), (Y = 0), (Z = 0), eo());
                  },
                  destroy: () => {
                    for (let t of ((Q = !0),
                    cancelAnimationFrame(X),
                    ep.disconnect(),
                    ev.disconnect(),
                    e.removeEventListener("pointerdown", en),
                    e.removeEventListener("pointerup", el),
                    e.removeEventListener("pointermove", ei),
                    e.removeEventListener("pointerleave", eu),
                    e.removeEventListener("pointercancel", es),
                    a.removeEventListener("visibilitychange", ec),
                    l.removeEventListener("webglcontextlost", ed),
                    l.removeEventListener("webglcontextrestored", em),
                    p.dispose(),
                    I.dispose(),
                    R.dispose(),
                    E.dispose(),
                    T.dispose(),
                    j.dispose(),
                    L))
                      t.dispose();
                    (r.dispose(), l.remove());
                  },
                }
              );
            })(e, t, V);
            return (
              (X.current = o),
              () => {
                (o?.destroy(), (X.current = null));
              }
            );
          }, []),
          (0, a.useImperativeHandle)(
            H,
            () => ({
              gulp: (e) => X.current?.gulp(e),
              replay: () => X.current?.replay(),
            }),
            [],
          ),
          (0, r.jsxs)("div", {
            ref: O,
            className: (0, c.cn)("relative overflow-hidden", o),
            style: { width: e, height: t, ...n },
            children: [
              (0, r.jsx)("div", {
                ref: Y,
                "aria-hidden": "true",
                className: "absolute inset-0",
              }),
              l &&
                (0, r.jsx)("div", { className: "relative z-10", children: l }),
            ],
          })
        );
      });
    F.displayName = "BlackHole";
    let I = {
        speed: 1,
        zoom: 1.8,
        particleCount: 13,
        orbSize: 0.75,
        glow: 0.08,
        contrast: 3,
        mirrorSplits: 2,
        warpEnabled: !0,
        distanceFade: 0.35,
        colorShiftR: -6,
        colorShiftG: -6,
        colorShiftB: -6,
        colorSpeed: 0.2,
        bloom: 1,
        ringIntensity: 1,
        tint: !1,
        colors: ["#FFFFFF", "#5227FF"],
      },
      k = {
        classic: I,
        halo: {
          ...I,
          zoom: 2.4,
          orbSize: 0.6,
          glow: 0.09,
          contrast: 4,
          bloom: 1.3,
          ringIntensity: 1.6,
        },
        kaleido: { ...I, zoom: 2, particleCount: 16, mirrorSplits: 4 },
        orbit: {
          ...I,
          zoom: 1.3,
          particleCount: 9,
          contrast: 3.2,
          distanceFade: 0.28,
          warpEnabled: !1,
          bloom: 1.4,
        },
        aurora: {
          ...I,
          colorShiftR: -5.5,
          colorShiftG: -5.8,
          colorShiftB: -6,
          colorSpeed: 0.25,
        },
        violet: { ...I, bloom: 1.2, tint: !0, colors: ["#FFFFFF", "#5227FF"] },
        ember: {
          ...I,
          contrast: 3.5,
          bloom: 1.2,
          tint: !0,
          colors: ["#FFE7C2", "#FF7A27"],
        },
        frost: {
          ...I,
          particleCount: 18,
          glow: 0.07,
          tint: !0,
          colors: ["#F0F7FF", "#3F8CFF"],
        },
      },
      j = [
        { label: "Classic", value: "classic" },
        { label: "Halo", value: "halo" },
        { label: "Kaleido", value: "kaleido" },
        { label: "Orbit", value: "orbit" },
        { label: "Aurora", value: "aurora" },
        { label: "Violet", value: "violet" },
        { label: "Ember", value: "ember" },
        { label: "Frost", value: "frost" },
      ],
      L = [
        {
          name: "width",
          type: "string | number",
          default: '"100%"',
          description: "Width of the component.",
        },
        {
          name: "height",
          type: "string | number",
          default: '"100%"',
          description: "Height of the component.",
        },
        {
          name: "speed",
          type: "number",
          default: "1",
          description: "Speed of the orbiting light.",
        },
        {
          name: "zoom",
          type: "number",
          default: "1.8",
          description:
            "Field of view. Higher values show more of the field and a smaller hole.",
        },
        {
          name: "particleCount",
          type: "number",
          default: "13",
          description: "Number of orbiting particles, from 1 to 30.",
        },
        {
          name: "orbSize",
          type: "number",
          default: "0.75",
          description: "Radius of the particle orbits.",
        },
        {
          name: "glow",
          type: "number",
          default: "0.08",
          description: "Brightness of each particle.",
        },
        {
          name: "contrast",
          type: "number",
          default: "3",
          description:
            "Curve applied to the light. Higher values give tighter, brighter bands.",
        },
        {
          name: "mirrorSplits",
          type: "number",
          default: "2",
          description: "Number of mirrored segments in the warp.",
        },
        {
          name: "warpEnabled",
          type: "boolean",
          default: "true",
          description: "Bends the light into the mirrored lensing warp.",
        },
        {
          name: "distanceFade",
          type: "number",
          default: "0.35",
          description: "How quickly the light gathers away from the centre.",
        },
        {
          name: "colorShiftR",
          type: "number",
          default: "-6",
          description: "Phase of the red channel in the colour cycle.",
        },
        {
          name: "colorShiftG",
          type: "number",
          default: "-6",
          description: "Phase of the green channel in the colour cycle.",
        },
        {
          name: "colorShiftB",
          type: "number",
          default: "-6",
          description: "Phase of the blue channel in the colour cycle.",
        },
        {
          name: "colorSpeed",
          type: "number",
          default: "0.2",
          description: "Speed of the colour cycle.",
        },
        {
          name: "colors",
          type: "[string, string]",
          default: "undefined",
          description:
            "Tints the light from the brightest core to the faint edges. Replaces the colour cycle when set.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"#000000"',
          description:
            "Background colour. Use transparent to show the page behind. Light backgrounds switch to an ink rendering.",
        },
        {
          name: "opacity",
          type: "number",
          default: "1",
          description: "Overall opacity, from 0 to 1.",
        },
        {
          name: "bloom",
          type: "number",
          default: "1",
          description: "Soft glow around the brightest light, from 0 to 4.",
        },
        {
          name: "ringIntensity",
          type: "number",
          default: "1",
          description:
            "Brightness of the thin photon ring at the sphere's edge. It glows brightest where the light passes behind.",
        },
        {
          name: "cursorInteraction",
          type: "boolean",
          default: "true",
          description:
            "Hovering quickens the orbits. A click makes the hole gulp: the orbits contract and spring back.",
        },
        {
          name: "cursorIntensity",
          type: "number",
          default: "1",
          description: "Strength of the hover and the gulp, from 0 to 3.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description: "Fades the light in and spins the orbits into place.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops the motion. Reduced-motion users get a still frame.",
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
          default: "undefined",
          description: "Content rendered above the effect.",
        },
        {
          name: "ref",
          type: "{ gulp, replay }",
          default: "undefined",
          description:
            "gulp(strength?) triggers a gulp from code. replay() plays the intro again.",
        },
        {
          name: "className",
          type: "string",
          default: "undefined",
          description: "Classes for the root element.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "undefined",
          description: "Inline styles for the root element.",
        },
      ],
      R = () => {
        let [e, t] = (0, i.I)(),
          o = (0, l.Y)(),
          [u, s] = (0, a.useState)("classic"),
          [c, d] = (0, a.useState)(k.classic),
          m = (e) => (t) => d((o) => ({ ...o, [e]: t })),
          [p, v] = (0, a.useState)(null),
          f = p ?? ("dark" === o ? "#0A0A0A" : "#FFFFFF"),
          [h, g] = (0, a.useState)(1),
          [b, x] = (0, a.useState)(!0),
          [y, w] = (0, a.useState)(1),
          [C, S] = (0, a.useState)(!0),
          [I, R] = (0, a.useState)(!1),
          { tint: E, colors: M, ...T } = c;
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(n.Bg, {}),
            (0, r.jsxs)(n.VX, {
              children: [
                (0, r.jsxs)(n.Ec, {
                  children: [
                    (0, r.jsx)(n.Ch, {
                      onRefresh: t,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          F,
                          {
                            ...T,
                            colors: E ? M : void 0,
                            backgroundColor: f,
                            opacity: h,
                            cursorInteraction: b,
                            cursorIntensity: y,
                            intro: C,
                            paused: I,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(n.IH, {
                      children: [
                        (0, r.jsx)(n.bg, {
                          title: "Preset",
                          value: u,
                          options: j,
                          onChange: (e) => {
                            (s(e), d(k[e] ?? k.classic));
                          },
                        }),
                        (0, r.jsx)(n.W7, {
                          title: "Background",
                          value: f,
                          onChange: v,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Tint",
                          checked: E,
                          onChange: m("tint"),
                        }),
                        (0, r.jsx)(n.W7, {
                          title: "Core Color",
                          value: M[0],
                          onChange: (e) =>
                            d((t) => ({
                              ...t,
                              tint: !0,
                              colors: [e, t.colors[1]],
                            })),
                        }),
                        (0, r.jsx)(n.W7, {
                          title: "Edge Color",
                          value: M[1],
                          onChange: (e) =>
                            d((t) => ({
                              ...t,
                              tint: !0,
                              colors: [t.colors[0], e],
                            })),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Speed",
                          min: 0.1,
                          max: 3,
                          step: 0.1,
                          value: c.speed,
                          onChange: m("speed"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Zoom",
                          min: 0.5,
                          max: 5,
                          step: 0.1,
                          value: c.zoom,
                          onChange: m("zoom"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Particles",
                          min: 1,
                          max: 30,
                          step: 1,
                          value: c.particleCount,
                          onChange: m("particleCount"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Orb Size",
                          min: 0.1,
                          max: 2,
                          step: 0.05,
                          value: c.orbSize,
                          onChange: m("orbSize"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Glow",
                          min: 0.01,
                          max: 0.5,
                          step: 0.01,
                          value: c.glow,
                          onChange: m("glow"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Contrast",
                          min: 0.5,
                          max: 10,
                          step: 0.5,
                          value: c.contrast,
                          onChange: m("contrast"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Distance Fade",
                          min: 0.05,
                          max: 1,
                          step: 0.05,
                          value: c.distanceFade,
                          onChange: m("distanceFade"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Mirror Splits",
                          min: 1,
                          max: 8,
                          step: 1,
                          value: c.mirrorSplits,
                          onChange: m("mirrorSplits"),
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Warp",
                          checked: c.warpEnabled,
                          onChange: m("warpEnabled"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Color Shift R",
                          min: -10,
                          max: 10,
                          step: 0.1,
                          value: c.colorShiftR,
                          onChange: m("colorShiftR"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Color Shift G",
                          min: -10,
                          max: 10,
                          step: 0.1,
                          value: c.colorShiftG,
                          onChange: m("colorShiftG"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Color Shift B",
                          min: -10,
                          max: 10,
                          step: 0.1,
                          value: c.colorShiftB,
                          onChange: m("colorShiftB"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Color Speed",
                          min: 0.01,
                          max: 2,
                          step: 0.01,
                          value: c.colorSpeed,
                          onChange: m("colorSpeed"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Bloom",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: c.bloom,
                          onChange: m("bloom"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Photon Ring",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: c.ringIntensity,
                          onChange: m("ringIntensity"),
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: h,
                          onChange: g,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Cursor Interaction",
                          checked: b,
                          onChange: x,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Cursor Intensity",
                          min: 0,
                          max: 3,
                          step: 0.1,
                          value: y,
                          onChange: w,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Intro",
                          checked: C,
                          onChange: S,
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Paused",
                          checked: I,
                          onChange: R,
                        }),
                      ],
                    }),
                    (0, r.jsx)(n.Ub, { data: L }),
                  ],
                }),
                (0, r.jsx)(n.lT, { children: (0, r.jsx)(n.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
