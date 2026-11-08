/* ReactBits Pro public preview module 42236 for swirl-blend.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/42236.8bcafa2ec0e47b78.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  42236: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => q }));
    var r = a(95155),
      n = a(12115),
      l = a(56388),
      o = a(86049),
      i = a(90761),
      s = a(2253),
      u = a(12246),
      c = a(90650);
    let d = ["#8A1F8F", "#FF4A9E"],
      p = [2, 3, 0],
      h = Math.PI / 2,
      m = (e, t, a) => Math.min(a, Math.max(t, e)),
      v = (e, t) => (Number.isFinite(e) ? e : t),
      f = (e, t, a) => {
        let r = m((a - e) / (t - e), 0, 1);
        return r * r * (3 - 2 * r);
      },
      x = (e) => e - 2 * Math.PI * Math.floor((e + Math.PI) / (2 * Math.PI)),
      y = new s.Q1f(),
      g = (e) => {
        let t = e.trim().toLowerCase();
        if (!t || "transparent" === t || "none" === t || "auto" === t)
          return null;
        let a = /^rgba?\(([^)]+)\)$/i.exec(t);
        if (a) {
          let e = a[1]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .map((e) => Number.parseFloat(e));
          return e.length > 3 && e[3] <= 0.05
            ? null
            : [
                m((e[0] ?? 0) / 255, 0, 1),
                m((e[1] ?? 0) / 255, 0, 1),
                m((e[2] ?? 0) / 255, 0, 1),
              ];
        }
        try {
          y.setStyle(t, s.jf0);
        } catch {
          return null;
        }
        return [y.r, y.g, y.b];
      },
      b = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      w = ([e, t, a]) => {
        let r = b(e),
          n = b(t),
          l = b(a),
          o = Math.cbrt(0.4122214708 * r + 0.5363325363 * n + 0.0514459929 * l),
          i = Math.cbrt(0.2119034982 * r + 0.6806995451 * n + 0.1073969566 * l),
          s = Math.cbrt(0.0883024619 * r + 0.2817188376 * n + 0.6299787005 * l);
        return [
          0.2104542553 * o + 0.793617785 * i - 0.0040720468 * s,
          1.9779984951 * o - 2.428592205 * i + 0.4505937099 * s,
          0.0259040371 * o + 0.7827717662 * i - 0.808675766 * s,
        ];
      },
      M = ([e, t, a]) => {
        let r = Math.pow(e + 0.3963377774 * t + 0.2158037573 * a, 3),
          n = Math.pow(e - 0.1055613458 * t - 0.0638541728 * a, 3),
          l = Math.pow(e - 0.0894841775 * t - 1.291485548 * a, 3);
        return [
          4.0767416621 * r - 3.3077115913 * n + 0.2309699292 * l,
          -1.2684380046 * r + 2.6097574011 * n - 0.3413193965 * l,
          -0.0041960863 * r - 0.7034186147 * n + 1.707614701 * l,
        ];
      },
      C = (e) => e.every((e) => e >= -5e-4 && e <= 1.0005),
      S = ([e, t, a]) => [e, Math.hypot(t, a), Math.atan2(a, t)],
      F = ([e, t, a]) => [e, t * Math.cos(a), t * Math.sin(a)],
      j = ([e, t, a]) => {
        let r = m(e, 0, 1),
          n = Math.max(t, 0);
        if (C(M(F([r, n, a])))) return [r, n, a];
        let l = 0,
          o = n;
        for (let e = 0; e < 18; e++) {
          let e = (l + o) / 2;
          C(M(F([r, e, a]))) ? (l = e) : (o = e);
        }
        return [r, l, a];
      },
      k = (e, t) => {
        let [a, r, n] = F(e),
          [l, o, i] = F(t);
        return Math.hypot(a - l, r - o, n - i);
      },
      A = ([e, t, a]) =>
        `#${[e, t, a]
          .map((e) =>
            Math.round(255 * m(e, 0, 1))
              .toString(16)
              .padStart(2, "0"),
          )
          .join("")}`,
      P = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      E = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      I = `
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      z = `
precision highp float;
uniform vec2 uRes;
uniform float uScale;
uniform vec2 uMetric;
uniform float uTime;
uniform float uDetail;
uniform float uFreq;
uniform float uCosAmp;
uniform float uSinAmp;
uniform float uModRate;
uniform float uModDepth;
uniform float uBand;
uniform float uPhase;
uniform float uLinger;
uniform vec3 uKeys[4];
uniform float uSheen;
uniform float uRelief;
uniform float uGrain;
uniform float uSeed;
uniform float uReveal;
uniform vec3 uPage;
uniform int uDropCount;
uniform vec4 uDrops[8];
uniform vec4 uAnchors[8];
uniform vec4 uInks[8];
out vec4 fragColor;

const float TAU = 6.28318530718;
const float PI = 3.14159265359;
const float HALF_PI = 1.57079632679;

vec2 warp(vec2 st) {
  float t = uTime;
  float drift = uModRate * t;
  for (int i = 0; i < 10; i++) {
    float k = clamp(uDetail - float(i), 0.0, 1.0);
    if (k <= 0.0) break;
    st += cos(st.yx * uFreq + vec2(t, HALF_PI)) * (uCosAmp * k);
    st += sin(st.yx + t + vec2(HALF_PI, sin(drift + st.x * uModDepth))) * (uSinAmp * k);
  }
  return st;
}

vec2 warpSlope(vec2 st, out vec2 slope) {
  float t = uTime;
  float drift = uModRate * t;
  vec2 jx = vec2(1.0, 0.0);
  vec2 jy = vec2(0.0, 1.0);
  for (int i = 0; i < 10; i++) {
    float k = clamp(uDetail - float(i), 0.0, 1.0);
    if (k <= 0.0) break;
    vec2 a = st.yx * uFreq + vec2(t, HALF_PI);
    float ca = uCosAmp * k;
    vec2 da = -sin(a) * (ca * uFreq);
    jx += vec2(da.x * jx.y, da.y * jx.x);
    jy += vec2(da.x * jy.y, da.y * jy.x);
    st += cos(a) * ca;
    float c = drift + st.x * uModDepth;
    vec2 b = st.yx + t + vec2(HALF_PI, sin(c));
    float sa = uSinAmp * k;
    vec2 db = cos(b) * sa * vec2(1.0, 1.0 + cos(c) * uModDepth);
    jx += vec2(db.x * jx.y, db.y * jx.x);
    jy += vec2(db.x * jy.y, db.y * jy.x);
    st += sin(b) * sa;
  }
  slope = vec2(jx.x, jy.x);
  return st;
}

float near(float hue, float target) {
  return target + mod(hue - target + PI, TAU) - PI;
}

vec3 palette(float s) {
  float x = fract(s) * 4.0;
  int i = min(int(x), 3);
  float f = x - float(i);
  vec3 p1 = uKeys[i];
  vec3 p0 = uKeys[(i + 3) % 4];
  vec3 p2 = uKeys[(i + 1) % 4];
  vec3 p3 = uKeys[(i + 2) % 4];
  p0.z = near(p0.z, p1.z);
  p2.z = near(p2.z, p1.z);
  p3.z = near(p3.z, p2.z);
  vec3 c1 = 0.5 * (p2 - p0);
  vec3 c2 = p0 - 2.5 * p1 + 2.0 * p2 - 0.5 * p3;
  vec3 c3 = 0.5 * (p3 - p0) + 1.5 * (p1 - p2);
  vec3 lch = p1 + f * (c1 + f * (c2 + f * c3));
  return vec3(lch.x, max(lch.y, 0.0), lch.z);
}

vec3 labToLinear(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 fitGamut(vec3 lab) {
  float lightness = clamp(lab.x, 0.0, 1.0);
  vec3 rgb = labToLinear(vec3(lightness, lab.yz));
  float grey = lightness * lightness * lightness;
  vec3 d = rgb - grey;
  vec3 room = mix(grey / max(-d, vec3(1e-6)), (1.0 - grey) / max(d, vec3(1e-6)), step(0.0, d));
  float t = clamp(min(room.x, min(room.y, room.z)), 0.0, 1.0);
  return grey + d * t;
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float interleaved(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 st = gl_FragCoord.xy / uRes * uScale;
  vec2 slope = vec2(0.0);
  vec2 w;
  if (uSheen > 0.0) w = warpSlope(st, slope);
  else w = warp(st);
  float p = w.x * uBand + uPhase;
  vec3 lch = palette(p - uLinger * sin(2.0 * TAU * (p - 0.25)) / (2.0 * TAU));

  if (uDropCount > 0) {
    for (int i = 0; i < 8; i++) {
      if (i >= uDropCount) break;
      vec4 drop = uDrops[i];
      vec4 anchor = uAnchors[i];
      vec4 ink = uInks[i];
      float r = length(((st - anchor.xy) * ink.w + (w - drop.xy) * anchor.w) * uMetric) / drop.z;
      float a = length((st - anchor.xy) * uMetric) / anchor.z;
      float body = 1.0 - smoothstep(0.35, 1.45, r);
      float keep = 1.0 - smoothstep(0.55, 1.0, a);
      float amount = clamp(drop.w * body * keep, 0.0, 1.0);
      float turn = mod(ink.z - lch.z + PI, TAU) - PI;
      lch = vec3(mix(lch.x, ink.x, amount * 0.9), mix(lch.y, ink.y, amount), lch.z + turn * amount);
    }
  }

  if (uSheen > 0.0) {
    vec3 n = normalize(vec3(-slope / uMetric * (uBand * uRelief * sin(TAU * (p - 0.25))), 1.0));
    vec3 light = normalize(vec3(-0.55, 0.6, 0.58));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float base = pow(halfway.z, 24.0);
    float spec = max(pow(max(dot(n, halfway), 0.0), 24.0) - base, 0.0) / (1.0 - base);
    float shade = dot(n, light) - light.z;
    lch.x += uSheen * (spec * 0.22 * (1.12 - lch.x) + shade * 0.1);
    lch.y *= 1.0 - uSheen * spec * 0.25;
  }

  vec3 lab = vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
  vec3 color = encode(fitGamut(lab));
  color = mix(uPage, color, smoothstep(uReveal, uReveal + 0.3, 0.5 + 0.5 * cos(TAU * (p - 0.55))));
  color += (interleaved(gl_FragCoord.xy) - 0.5) / 255.0;
  if (uGrain > 0.0) color += (hash(gl_FragCoord.xy + uSeed) - 0.5) * uGrain * 0.08;
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`,
      D = (0, n.forwardRef)(function (
        {
          colors: e,
          backgroundColor: t = "transparent",
          speed: a = 0.4,
          scale: l = 7,
          warp: o = 1,
          detail: i,
          sheen: y = 0.4,
          contrast: b = 1,
          saturation: M = 1,
          grain: C = 0,
          dropSize: F = 1,
          interactive: D,
          intro: L = !0,
          paused: R = !1,
          dpr: T = 2,
          width: B = "100%",
          height: q = "100%",
          className: N,
          style: U,
          children: H,
          iterations: _,
          cosFrequency: W = 3,
          cosAmplitude: G = 0.25,
          sinAmplitude: Y = 0.35,
          modulationRate: X = 0.1,
          modulationDepth: K = 2,
          paletteBaseR: Q,
          paletteBaseG: O,
          paletteBaseB: V,
          paletteAmpR: $,
          paletteAmpG: Z,
          paletteAmpB: J,
          palettePhaseR: ee,
          palettePhaseG: et,
          palettePhaseB: ea,
          outputScale: er = 10,
          opacity: en = 1,
          cursorInteraction: el,
          cursorIntensity: eo = 1,
        },
        ei,
      ) {
        var es, eu, ec;
        let ed,
          ep,
          eh,
          em,
          ev,
          ef,
          ex = (0, n.useRef)(null),
          ey = (0, n.useRef)(null),
          eg = (0, n.useRef)(null),
          eb = (0, n.useSyncExternalStore)(P, E, () => !1),
          ew = [Q, O, V, $, Z, J, ee, et, ea].some((e) => void 0 !== e),
          eM = {
            colors:
              e ??
              (ew
                ? ((es = [Q ?? 0.75, O ?? 0.1, V ?? 0.55]),
                  (eu = [$ ?? 0.3, Z ?? 0.35, J ?? 0.1]),
                  (ec = [ee ?? 0.3, et ?? 0.15, ea ?? 0.2]),
                  (ep = (ed = Array.from({ length: 24 }, (e, t) =>
                    [0, 1, 2].map((e) =>
                      m(
                        es[e] +
                          eu[e] * Math.cos(2 * Math.PI * (t / 24 + ec[e])),
                        0,
                        1,
                      ),
                    ),
                  )).map((e) => S(w(e)))),
                  (eh = (e) => e[1] + 0.25 * e[0]),
                  (em = 0),
                  ep.forEach((e, t) => {
                    eh(e) > eh(ep[em]) && (em = t);
                  }),
                  (ev = (em + 12) % 24),
                  (ef = -1),
                  ep.forEach((e, t) => {
                    let a = k(e, ep[em]) * eh(e);
                    a > ef && ((ef = a), (ev = t));
                  }),
                  [A(ed[ev]), A(ed[em])])
                : d),
            backgroundColor: t,
            speed: a,
            scale: l,
            warp: o,
            detail: i ?? _ ?? 5,
            sheen: y,
            contrast: b,
            saturation: M,
            grain: C,
            dropSize: F,
            interactive: D ?? el ?? !0,
            intro: L,
            paused: R,
            dpr: T,
            frequency: W,
            cosAmplitude: G,
            sinAmplitude: Y,
            modulationRate: X,
            modulationDepth: K,
            outputScale: er,
            agitation: eo,
            reduced: eb,
          },
          eC = (0, n.useRef)(eM);
        ((0, n.useEffect)(() => {
          ((eC.current = eM), eg.current?.sync());
        }),
          (0, n.useEffect)(() => {
            let e = ex.current,
              t = ey.current;
            if (!e || !t) return;
            let a = (function (e, t, a) {
              let r,
                n = e.ownerDocument,
                l = n.defaultView ?? window,
                o = n.createElement("canvas");
              (o.setAttribute("aria-hidden", "true"),
                (o.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block"));
              try {
                r = new u.WebGLRenderer({
                  canvas: o,
                  alpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              t.appendChild(o);
              let i = Array.from({ length: 4 }, () => new s.Pq0()),
                c = Array.from({ length: 8 }, () => new s.IUQ()),
                d = Array.from({ length: 8 }, () => new s.IUQ()),
                y = Array.from({ length: 8 }, () => new s.IUQ()),
                b = new s.I9Y(),
                M = {
                  uRes: { value: new s.I9Y(1, 1) },
                  uScale: { value: 7 },
                  uMetric: { value: new s.I9Y(1, 1) },
                  uTime: { value: 0 },
                  uDetail: { value: 5 },
                  uFreq: { value: 3 },
                  uCosAmp: { value: 0.25 },
                  uSinAmp: { value: 0.35 },
                  uModRate: { value: 0.1 },
                  uModDepth: { value: 2 },
                  uBand: { value: 0.1 },
                  uPhase: { value: -0.1 },
                  uLinger: { value: 0.3 },
                  uKeys: { value: i },
                  uSheen: { value: 0.4 },
                  uRelief: { value: 3 },
                  uGrain: { value: 0 },
                  uSeed: { value: 0 },
                  uReveal: { value: -0.3 },
                  uPage: { value: new s.Pq0() },
                  uDropCount: { value: 0 },
                  uDrops: { value: c },
                  uAnchors: { value: d },
                  uInks: { value: y },
                },
                C = new s.D$Q({
                  glslVersion: s.Wdf,
                  vertexShader: I,
                  fragmentShader: z,
                  uniforms: M,
                  blending: s.XIg,
                  transparent: !1,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                F = new s.LoY();
              F.setAttribute(
                "position",
                new s.qtW([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
              );
              let A = new s.eaF(F, C);
              A.frustumCulled = !1;
              let P = new s.Z58();
              P.add(A);
              let E = new s.qUd(-1, 1, 1, -1, -1, 1),
                D = 0,
                L = 0,
                R = 1,
                T = !1,
                B = "",
                q = !1,
                N = [
                  [0.2, 0, 0],
                  [0.5, 0, 0],
                  [0.65, 0, 0],
                  [0.8, 0, 0],
                ],
                U = -10,
                H = 2.4 * !!a.current.reduced,
                _ = 0,
                W = a.current.intro && !a.current.reduced ? 0 : -1,
                G = 0,
                Y = 0,
                X = 0,
                K = 0,
                Q = 0.025,
                O = 0,
                V = 0,
                $ = !1,
                Z = !1,
                J = !1,
                ee = null,
                et = null,
                ea = [],
                er = [0, 0],
                en = () => {
                  let t = a.current,
                    r =
                      g(t.backgroundColor) ??
                      (() => {
                        let t = e.parentElement;
                        for (; t;) {
                          let e = l
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
                        return l.matchMedia("(prefers-color-scheme: dark)")
                          .matches
                          ? [0.04, 0.04, 0.04]
                          : [1, 1, 1];
                      })(),
                    n = m(v(t.contrast, 1), 0, 2),
                    o = m(v(t.saturation, 1), 0, 2),
                    s = [r.join(","), t.colors[0], t.colors[1], n, o].join("|");
                  if (s !== B) {
                    var u, c;
                    let e, a, l, d, p, h, v, f, y, b, C;
                    ((B = s),
                      (q =
                        0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2] > 0.55),
                      M.uPage.value.set(r[0], r[1], r[2]),
                      (u = t.colors),
                      (c = q),
                      (e = S(w(g(u[0]) ?? [0.54, 0.12, 0.56]))),
                      (a = S(w(g(u[1]) ?? [1, 0.29, 0.62]))),
                      (l = w(r)[0]),
                      (d = e[1] < 0.02 ? a[2] : e[2]),
                      (h = x((p = a[1] < 0.02 ? d : a[2]) - d)),
                      (v = Math.max(e[1], a[1])),
                      (f = [
                        e[0] + (a[0] - e[0]) * 0.75,
                        1.3 * v,
                        d + 0.85 * h,
                      ]),
                      (y = c
                        ? [
                            m(l - 0.05, 0.6, 0.88),
                            Math.min(0.35 * v, 0.07),
                            d + 0.15 * h,
                          ]
                        : [l + (e[0] - l) * 0.2, 0.5 * v, d + 0.15 * h]),
                      (C =
                        (b = [[e[0], e[1], d], y, f, [a[0], a[1], p]].map((e) =>
                          j(e),
                        )).reduce((e, t) => e + t[0], 0) / b.length),
                      (N = b.map(([e, t, a]) =>
                        j([C + (e - C) * n, t * o, x(a)]),
                      )).forEach((e, t) => i[t].set(e[0], e[1], e[2])));
                  }
                },
                el = () => {
                  let t = a.current,
                    n = Math.round(e.clientWidth),
                    o = Math.round(e.clientHeight);
                  if (n < 2 || o < 2) return ((T = !1), !1);
                  let i = Math.min(
                    l.devicePixelRatio || 1,
                    m(v(t.dpr, 2), 0.5, 3),
                  );
                  return (
                    (!T || n !== D || o !== L || i !== R) &&
                    ((T = !0),
                    (D = n),
                    (L = o),
                    (R = i),
                    r.setPixelRatio(R),
                    r.setSize(D, L, !1),
                    !0)
                  );
                },
                eo = (e, t) => {
                  let a = M.uTime.value,
                    r = M.uModRate.value * a,
                    n = e,
                    l = t;
                  for (let e = 0; e < 10; e++) {
                    let t = m(M.uDetail.value - e, 0, 1);
                    if (t <= 0) break;
                    let o = M.uCosAmp.value * t,
                      i = n + Math.cos(l * M.uFreq.value + a) * o,
                      s = l + Math.cos(n * M.uFreq.value + h) * o;
                    ((n = i), (l = s));
                    let u = M.uSinAmp.value * t,
                      c = n + Math.sin(l + a + h) * u,
                      d =
                        l +
                        Math.sin(n + a + Math.sin(r + n * M.uModDepth.value)) *
                          u;
                    ((n = c), (l = d));
                  }
                  ((er[0] = n), (er[1] = l));
                },
                ei = (e) => {
                  eo(e.px, e.py);
                  let t = er[0],
                    a = er[1];
                  eo(e.px + 0.01, e.py);
                  let r = (er[0] - t) / 0.01,
                    n = (er[1] - a) / 0.01;
                  eo(e.px, e.py + 0.01);
                  let l = (er[0] - t) / 0.01,
                    o = (er[1] - a) / 0.01,
                    i = r * o - l * n,
                    s = e.wx - t,
                    u = e.wy - a;
                  if (0.02 > Math.abs(i) || Math.hypot(s, u) > 0.5) return;
                  e.stretch +=
                    (m(Math.sqrt(Math.abs(i)), 0.4, 2.5) - e.stretch) * 0.25;
                  let c = (o * s - l * u) / i,
                    d = (r * u - n * s) / i,
                    p = Math.hypot(c, d);
                  (p > Q && ((c *= Q / p), (d *= Q / p)),
                    (e.px += c),
                    (e.py += d));
                },
                es = () => {
                  let e = a.current,
                    t = W < 0 ? 1 : m((_ - W) / 2.6, 0, 1),
                    n =
                      m(v(e.warp, 1), 0, 3) *
                      (0.75 + 0.25 * (1 - Math.pow(1 - t, 3)));
                  (r.getDrawingBufferSize(b),
                    M.uRes.value.copy(b),
                    (M.uScale.value = m(v(e.scale, 7), 0.5, 40)),
                    M.uMetric.value
                      .set(D, L)
                      .divideScalar(Math.sqrt(Math.max(D * L, 1))),
                    (M.uTime.value = H),
                    (M.uDetail.value = m(v(e.detail, 5), 1, 10)),
                    (M.uFreq.value = m(v(e.frequency, 3), 0.1, 12)),
                    (M.uCosAmp.value = m(v(e.cosAmplitude, 0.25), 0, 2) * n),
                    (M.uSinAmp.value = m(v(e.sinAmplitude, 0.35), 0, 2) * n),
                    (M.uModRate.value = m(v(e.modulationRate, 0.1), 0, 4)),
                    (M.uModDepth.value = m(v(e.modulationDepth, 2), 0, 8)),
                    (M.uBand.value = 1 / m(v(e.outputScale, 10), 1, 80)),
                    (M.uSheen.value = m(v(e.sheen, 0.4), 0, 2)),
                    (M.uGrain.value = m(v(e.grain, 0), 0, 1)),
                    (M.uSeed.value = (61.7 * _) % 997),
                    (M.uReveal.value =
                      1 - 1.3 * Math.sin(m(t / 0.7, 0, 1) * h)));
                  let l = 0;
                  for (let e of ea) {
                    ei(e);
                    let t = _ - e.born,
                      a = 1 - Math.exp(-t / 0.35),
                      r = e.size * (0.35 + 0.65 * a) * (1 + 0.14 * t),
                      n =
                        0.95 * (1 - Math.exp(-t / 0.08)) * (1 - f(1.2, 6.5, t));
                    c[l].set(e.wx, e.wy, Math.max(r, 0.001), n);
                    let o = 0.85 * (1 - Math.exp(-t / 1.4));
                    (d[l].set(
                      e.px,
                      e.py,
                      Math.max(2.8 * r, 0.6),
                      o / e.stretch,
                    ),
                      y[l].set(e.ink[0], e.ink[1], e.ink[2], 1 - o),
                      l++);
                  }
                  for (let e = l; e < 8; e++) c[e].set(0, 0, 1, 0);
                  M.uDropCount.value = l;
                },
                eu = () => {
                  T &&
                    (performance.now() - U > 1e3 &&
                      ((U = performance.now()), en()),
                    es(),
                    r.render(P, E));
                },
                ec = () => {
                  Z || J || !$ || O || (O = requestAnimationFrame(ed));
                },
                ed = (e) => {
                  if (((O = 0), Z || J)) return;
                  let t = a.current,
                    r =
                      V && e - V < 100
                        ? Math.min(Math.max((e - V) / 1e3, 0), 0.05)
                        : 1 / 60;
                  ((V = e), (_ += r), (Q = 1.5 * r));
                  let l = !t.reduced && !t.paused;
                  ((G *= Math.exp(-r / 0.8)) < 5e-4 && (G = 0),
                    (X += (30.25 * (G - Y) - 11 * X) * r),
                    (Y += X * r));
                  let o = 0 === G && 5e-4 > Math.abs(Y) && 5e-4 > Math.abs(X);
                  (o && ((Y = 0), (X = 0)),
                    l &&
                      (H +=
                        r *
                        m(v(t.speed, 0.4), 0, 5) *
                        (1 + 1.2 * Math.max(Y, 0))));
                  for (let e = ea.length - 1; e >= 0; e--)
                    _ - ea[e].born > 6.5 && ea.splice(e, 1);
                  (W >= 0 && (t.reduced || _ - W > 2.6) && (W = -1), eu());
                  let i = !o || W >= 0 || ea.length > 0;
                  (l || i) && !n.hidden
                    ? (O = requestAnimationFrame(ed))
                    : (V = 0);
                },
                ep = (e, t) => {
                  let r,
                    n = a.current;
                  if (!T || n.reduced || n.paused) return;
                  (en(), es());
                  let l = Math.sqrt(D * L) / m(v(a.current.scale, 7), 0.5, 40),
                    o = (e / D) * M.uScale.value,
                    i = (1 - t / L) * M.uScale.value;
                  eo(o, i);
                  let s = ((e) => {
                      var t;
                      let a,
                        r,
                        n,
                        l,
                        o,
                        i,
                        s,
                        u,
                        c,
                        d,
                        h,
                        m,
                        v =
                          ((t = N),
                          (r = Math.min(
                            Math.floor((a = (e - Math.floor(e)) * 4)),
                            3,
                          )),
                          (n = a - r),
                          (l = t[r]),
                          (o = t[(r + 3) % 4]),
                          (i = t[(r + 1) % 4]),
                          (s = t[(r + 2) % 4]),
                          (c = (u = l[2]) + x(o[2] - u)),
                          (h = (d = u + x(i[2] - u)) + x(s[2] - d)),
                          [
                            (m = (e, t, a, r) =>
                              t +
                              n *
                                (0.5 * (a - e) +
                                  n *
                                    (e -
                                      2.5 * t +
                                      2 * a -
                                      0.5 * r +
                                      n * (0.5 * (r - e) + 1.5 * (t - a)))))(
                              o[0],
                              l[0],
                              i[0],
                              s[0],
                            ),
                            Math.max(m(o[1], l[1], i[1], s[1]), 0),
                            m(c, u, d, h),
                          ]);
                      for (let e = 0; e < 3; e++) {
                        let e = N[p[K % 3]];
                        if ((K++, k(e, v) > 0.1)) return e;
                      }
                      return N[p[K++ % 3]];
                    })(
                      (r = er[0] * M.uBand.value + -0.1) -
                        (0.3 * Math.sin(4 * Math.PI * (r - 0.25))) /
                          (4 * Math.PI),
                    ),
                    u =
                      (0.15 * m(v(n.dropSize, 1), 0.1, 3) * Math.min(D, L)) / l;
                  (ea.length >= 8 && ea.shift(),
                    ea.push({
                      wx: er[0],
                      wy: er[1],
                      px: o,
                      py: i,
                      born: _,
                      size: u,
                      stretch: 1,
                      ink: s,
                    }),
                    ec());
                },
                eh = (t) => {
                  if (!a.current.interactive) return;
                  let r = e.getBoundingClientRect();
                  r.width <= 0 ||
                    r.height <= 0 ||
                    ep(
                      ((t.clientX - r.left) / r.width) * D,
                      ((t.clientY - r.top) / r.height) * L,
                    );
                },
                em = (e) => {
                  var t;
                  if (!(
                    !e.isPrimary ||
                    ((t = e.target) &&
                      "function" == typeof t.closest &&
                      t.closest(
                        "a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]",
                      ))
                  )) {
                    if ("mouse" === e.pointerType) {
                      0 === e.button && eh(e);
                      return;
                    }
                    ee = {
                      id: e.pointerId,
                      x: e.clientX,
                      y: e.clientY,
                      time: performance.now(),
                    };
                  }
                },
                ev = (e) => {
                  let t = ee;
                  ((ee = null),
                    !t ||
                      t.id !== e.pointerId ||
                      Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 ||
                      performance.now() - t.time > 600 ||
                      eh(e));
                },
                ef = (t) => {
                  let r = a.current;
                  if (!r.interactive || r.reduced || r.paused) {
                    et = null;
                    return;
                  }
                  let n = e.getBoundingClientRect();
                  if (n.width <= 0 || n.height <= 0) return;
                  let l = performance.now();
                  if (et && l - et.time < 150) {
                    let e =
                      Math.hypot(t.clientX - et.x, t.clientY - et.y) /
                      Math.max(Math.min(n.width, n.height), 1);
                    ((G = Math.min(
                      G + 1.4 * e * m(v(r.agitation, 1), 0, 3),
                      1.6,
                    )),
                      ec());
                  }
                  et = { x: t.clientX, y: t.clientY, time: l };
                },
                ex = () => {
                  et = null;
                },
                ey = () => {
                  ((ee = null), (et = null));
                },
                eg = () => {
                  ((V = 0), ec());
                },
                eb = (e) => {
                  (e.preventDefault(),
                    (J = !0),
                    cancelAnimationFrame(O),
                    (O = 0));
                },
                ew = () => {
                  ((J = !1), (B = ""), ec());
                },
                eM = new ResizeObserver(() => {
                  el() && (eu(), ec());
                }),
                eC = new IntersectionObserver(
                  ([e]) => {
                    (($ = e.isIntersecting), (V = 0), ec());
                  },
                  { rootMargin: "120px" },
                );
              return (
                e.addEventListener("pointerdown", em),
                e.addEventListener("pointerup", ev),
                e.addEventListener("pointermove", ef),
                e.addEventListener("pointerleave", ex),
                e.addEventListener("pointercancel", ey),
                n.addEventListener("visibilitychange", eg),
                o.addEventListener("webglcontextlost", eb),
                o.addEventListener("webglcontextrestored", ew),
                eM.observe(e),
                eC.observe(e),
                el(),
                en(),
                {
                  sync: () => {
                    ((U = -10), el(), (V = 0), !O && $ && (eu(), ec()));
                  },
                  drop: (e, t) => {
                    T &&
                      ep(
                        m(v(e ?? 0.15 + 0.7 * Math.random(), 0.5), 0, 1) * D,
                        m(v(t ?? 0.15 + 0.7 * Math.random(), 0.5), 0, 1) * L,
                      );
                  },
                  replay: () => {
                    a.current.reduced || ((W = _), (V = 0), ec());
                  },
                  destroy: () => {
                    ((Z = !0),
                      cancelAnimationFrame(O),
                      eM.disconnect(),
                      eC.disconnect(),
                      e.removeEventListener("pointerdown", em),
                      e.removeEventListener("pointerup", ev),
                      e.removeEventListener("pointermove", ef),
                      e.removeEventListener("pointerleave", ex),
                      e.removeEventListener("pointercancel", ey),
                      n.removeEventListener("visibilitychange", eg),
                      o.removeEventListener("webglcontextlost", eb),
                      o.removeEventListener("webglcontextrestored", ew),
                      P.remove(A),
                      F.dispose(),
                      C.dispose(),
                      r.dispose(),
                      o.remove());
                  },
                }
              );
            })(e, t, eC);
            return (
              (eg.current = a),
              () => {
                (a?.destroy(), (eg.current = null));
              }
            );
          }, []),
          (0, n.useImperativeHandle)(
            ei,
            () => ({
              drop: (e, t) => eg.current?.drop(e, t),
              replay: () => eg.current?.replay(),
            }),
            [],
          ));
        let eS = !["", "transparent", "auto", "none"].includes(
          t.trim().toLowerCase(),
        );
        return (0, r.jsxs)("div", {
          ref: ex,
          className: (0, c.cn)("relative isolate overflow-hidden", N),
          style: {
            width: B,
            height: q,
            backgroundColor: eS ? t : void 0,
            touchAction: "pan-y",
            ...U,
          },
          children: [
            (0, r.jsx)("div", {
              ref: ey,
              "aria-hidden": "true",
              className: "pointer-events-none absolute inset-0",
              style: en < 1 ? { opacity: m(v(en, 1), 0, 1) } : void 0,
            }),
            H
              ? (0, r.jsx)("div", {
                  className: "relative z-10 h-full w-full",
                  children: H,
                })
              : null,
          ],
        });
      });
    D.displayName = "SwirlBlend";
    let L = {
        colors: ["#8A1F8F", "#FF4A9E"],
        speed: 0.4,
        scale: 7,
        warp: 1,
        detail: 5,
        sheen: 0.4,
        contrast: 1,
        saturation: 1,
      },
      R = {
        classic: L,
        orchid: {
          ...L,
          colors: ["#5227FF", "#FF9FFC"],
          speed: 0.3,
          sheen: 0.5,
        },
        lagoon: {
          ...L,
          colors: ["#2563EB", "#2DD4BF"],
          speed: 0.3,
          scale: 6,
          sheen: 0.6,
        },
        sunset: { ...L, colors: ["#FF3D7F", "#FF7A27"], contrast: 1.05 },
        aurora: {
          ...L,
          colors: ["#22C55E", "#8B5CF6"],
          speed: 0.3,
          scale: 6.5,
        },
        marble: {
          ...L,
          colors: ["#4338CA", "#38BDF8"],
          speed: 0.25,
          scale: 9,
          warp: 1.1,
          detail: 8,
          sheen: 0.7,
          contrast: 1.1,
        },
        dusk: {
          ...L,
          colors: ["#8B5CF6", "#FF7A27"],
          speed: 0.25,
          scale: 5,
          detail: 4.5,
        },
        ember: {
          ...L,
          colors: ["#F43F5E", "#FBBF24"],
          detail: 6,
          contrast: 1.1,
        },
      },
      T = [
        { label: "Classic", value: "classic" },
        { label: "Orchid", value: "orchid" },
        { label: "Lagoon", value: "lagoon" },
        { label: "Sunset", value: "sunset" },
        { label: "Aurora", value: "aurora" },
        { label: "Marble", value: "marble" },
        { label: "Dusk", value: "dusk" },
        { label: "Ember", value: "ember" },
      ],
      B = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#8A1F8F", "#FF4A9E"]',
          description:
            "The two colours the fluid blends between. A vivid bridge tone and a quiet valley tone are derived from them.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Page colour the valleys settle toward. Transparent reads the colour behind the component. Light colours switch to a light palette.",
        },
        {
          name: "speed",
          type: "number",
          default: "0.4",
          description: "Speed of the swirl.",
        },
        {
          name: "scale",
          type: "number",
          default: "7",
          description:
            "Size of the pattern. Higher values give smaller, denser curls.",
        },
        {
          name: "warp",
          type: "number",
          default: "1",
          description: "How strongly the bands curl.",
        },
        {
          name: "detail",
          type: "number",
          default: "5",
          description:
            "Warp passes, from 1 to 10. More passes fold the bands into finer curls.",
        },
        {
          name: "sheen",
          type: "number",
          default: "0.4",
          description:
            "Silk shading, with soft highlights where the bands fold.",
        },
        {
          name: "contrast",
          type: "number",
          default: "1",
          description:
            "Spread between the quiet valleys and the bright crests.",
        },
        {
          name: "saturation",
          type: "number",
          default: "1",
          description: "Colour intensity.",
        },
        {
          name: "grain",
          type: "number",
          default: "0",
          description: "Film grain over the colour.",
        },
        {
          name: "dropSize",
          type: "number",
          default: "1",
          description: "Size of the ink drop a click releases.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Click to drop ink of the next palette colour into the swirl. Moving the pointer stirs it faster for a moment.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "Inks the colour in band by band when the swirl appears.",
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
          name: "ref",
          type: "{ drop, replay }",
          default: "-",
          description:
            "drop(x?, y?) releases ink at a point given from 0 to 1. replay() restarts the intro.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "-",
          description: "Content layered above the swirl.",
        },
        {
          name: "className",
          type: "string",
          default: "-",
          description: "Classes for the root element.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "-",
          description: "Inline styles for the root element.",
        },
      ],
      q = () => {
        let [e, t] = (0, i.I)(),
          a = (0, o.Y)(),
          [s, u] = (0, n.useState)("classic"),
          [c, d] = (0, n.useState)(R.classic),
          p = (e) => (t) => d((a) => ({ ...a, [e]: t })),
          [h, m] = (0, n.useState)(null),
          [v, f] = (0, n.useState)(0),
          [x, y] = (0, n.useState)(1),
          [g, b] = (0, n.useState)(!0),
          [w, M] = (0, n.useState)(!0),
          [C, S] = (0, n.useState)(!1),
          F = h ?? ("dark" === a ? "#0a0a0a" : "#ffffff");
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(l.Bg, {}),
            (0, r.jsxs)(l.VX, {
              children: [
                (0, r.jsxs)(l.Ec, {
                  children: [
                    (0, r.jsx)(l.Ch, {
                      onRefresh: t,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          D,
                          {
                            ...c,
                            backgroundColor: F,
                            grain: v,
                            dropSize: x,
                            interactive: g,
                            intro: w,
                            paused: C,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(l.IH, {
                      children: [
                        (0, r.jsx)(l.bg, {
                          title: "Preset",
                          value: s,
                          options: T,
                          onChange: (e) => {
                            (u(e), d(R[e] ?? R.classic));
                          },
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Color A",
                          value: c.colors[0],
                          onChange: (e) =>
                            d((t) => ({ ...t, colors: [e, t.colors[1]] })),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Color B",
                          value: c.colors[1],
                          onChange: (e) =>
                            d((t) => ({ ...t, colors: [t.colors[0], e] })),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Background",
                          value: F,
                          onChange: m,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Speed",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: c.speed,
                          onChange: p("speed"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Scale",
                          min: 2,
                          max: 16,
                          step: 0.1,
                          value: c.scale,
                          onChange: p("scale"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Warp",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.warp,
                          onChange: p("warp"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Detail",
                          min: 1,
                          max: 10,
                          step: 0.1,
                          value: c.detail,
                          onChange: p("detail"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Sheen",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: c.sheen,
                          onChange: p("sheen"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Contrast",
                          min: 0.4,
                          max: 1.6,
                          step: 0.01,
                          value: c.contrast,
                          onChange: p("contrast"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Saturation",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: c.saturation,
                          onChange: p("saturation"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Grain",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: v,
                          onChange: f,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Drop Size",
                          min: 0.3,
                          max: 2.5,
                          step: 0.01,
                          value: x,
                          onChange: y,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Interactive",
                          checked: g,
                          onChange: b,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Intro",
                          checked: w,
                          onChange: M,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Paused",
                          checked: C,
                          onChange: S,
                        }),
                      ],
                    }),
                    (0, r.jsx)(l.Ub, { data: B }),
                  ],
                }),
                (0, r.jsx)(l.lT, { children: (0, r.jsx)(l.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
