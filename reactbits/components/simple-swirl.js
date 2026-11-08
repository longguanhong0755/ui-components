/* ReactBits Pro public preview module 7860 for simple-swirl.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/7860.b04039a78ae176da.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  7860: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => P }));
    var r = a(95155),
      n = a(12115),
      l = a(56388),
      o = a(86049),
      i = a(90761),
      s = a(2253),
      u = a(12246),
      c = a(90650);
    let m = (e, t, a) => Math.min(a, Math.max(t, e)),
      d = (e, t) => (Number.isFinite(e) ? e : t),
      p = (e) => Math.atan2(Math.sin(e), Math.cos(e)),
      h = new s.Q1f(),
      f = (e) => {
        let t = (e ?? "").trim().toLowerCase();
        if (
          !t ||
          ["transparent", "none", "auto", "currentcolor", "inherit"].includes(
            t,
          ) ||
          t.startsWith("var(")
        )
          return null;
        let a = /^rgba?\(([^)]+)\)$/.exec(t);
        if (a) {
          let e = a[1]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .map((e) => Number.parseFloat(e));
          if (e.length > 3 && Number.isFinite(e[3]) && e[3] <= 0.05)
            return null;
        }
        h.setRGB(NaN, NaN, NaN);
        try {
          h.setStyle(t, s.jf0);
        } catch {
          return null;
        }
        return Number.isFinite(h.r) ? [h.r, h.g, h.b] : null;
      },
      v = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      g = ([e, t, a]) => {
        let r = v(e),
          n = v(t),
          l = v(a),
          o = Math.cbrt(0.4122214708 * r + 0.5363325363 * n + 0.0514459929 * l),
          i = Math.cbrt(0.2119034982 * r + 0.6806995451 * n + 0.1073969566 * l),
          s = Math.cbrt(0.0883024619 * r + 0.2817188376 * n + 0.6299787005 * l),
          u = 1.9779984951 * o - 2.428592205 * i + 0.4505937099 * s,
          c = 0.0259040371 * o + 0.7827717662 * i - 0.808675766 * s;
        return [
          0.2104542553 * o + 0.793617785 * i - 0.0040720468 * s,
          Math.hypot(u, c),
          Math.atan2(c, u),
        ];
      },
      x = (e, t, a) => {
        let r = t * Math.cos(a),
          n = t * Math.sin(a),
          l = Math.pow(e + 0.3963377774 * r + 0.2158037573 * n, 3),
          o = Math.pow(e - 0.1055613458 * r - 0.0638541728 * n, 3),
          i = Math.pow(e - 0.0894841775 * r - 1.291485548 * n, 3),
          s = 4.0767416621 * l - 3.3077115913 * o + 0.2309699292 * i,
          u = -1.2684380046 * l + 2.6097574011 * o - 0.3413193965 * i,
          c = -0.0041960863 * l - 0.7034186147 * o + 1.707614701 * i;
        return (
          s > -0.001 &&
          s < 1.001 &&
          u > -0.001 &&
          u < 1.001 &&
          c > -0.001 &&
          c < 1.001
        );
      },
      w = ([e, t, a]) => {
        if (x(e, t, a)) return [e, t, a];
        let r = 0,
          n = t;
        for (let t = 0; t < 18; t++) {
          let t = (r + n) / 2;
          x(e, t, a) ? (r = t) : (n = t);
        }
        return [e, r, a];
      },
      b = ([e, t, a], r, n, l) =>
        w([
          Math.min(
            e,
            ((e) => {
              let t = 0.5,
                a = -1;
              for (let r = 0.3; r <= 0.96; r += 0.02) {
                let [, n] = w([r, 0.4, e]);
                n > a && ((a = n), (t = r));
              }
              return t;
            })(a) + r,
            n,
          ),
          t > 0.03 ? Math.max(1.05 * t, l) : t,
          a,
        ]),
      y = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      C = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      S = `
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      M = `
precision highp float;
uniform vec2 uRes;
uniform float uUnit;
uniform float uSpin;
uniform float uTwist;
uniform float uSpan;
uniform float uLayers;
uniform float uEdge;
uniform float uSoft;
uniform float uWeight;
uniform float uGamma;
uniform vec2 uFade;
uniform float uSides;
uniform float uArm;
uniform float uCore;
uniform float uExposure;
uniform vec2 uGlow;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec2 uHeat;
uniform float uPack;
out vec4 fragColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

float ramp(float t, float c, float s) {
  float u = clamp(t, c, 1.0);
  return u - c - uSides / PI * (u * acos(u) - sqrt(max(1.0 - u * u, 0.0)) - c * PI / uSides + s) + max(t - 1.0, 0.0);
}

vec3 fromLch(vec3 lch) {
  vec3 lab = vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  lms = lms * lms * lms;
  return max(mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * lms, 0.0);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) * uUnit;
  float r = length(p);
  float sector = TAU / uSides;
  float cosN = cos(PI / uSides);
  float kFull = clamp(ceil((r - uEdge + uSoft) / uSpan), 0.0, uLayers);
  float kStart = clamp(floor((r * cosN - uEdge - uSoft) / uSpan) + 1.0, 0.0, kFull);
  float steps = kFull - kStart;
  float ext = kStart * uSpan;
  float angle = atan(p.y, p.x) + uSpin + (kStart + 1.0) * uTwist;
  float cover = 0.0;
  for (int i = 0; i < 320; i++) {
    if (float(i) >= steps) break;
    float f = mod(angle + 0.5 * sector, sector) - 0.5 * sector;
    cover += 1.0 - smoothstep(uEdge - uSoft, uEdge + uSoft, r * cos(f) - ext);
    ext += uSpan;
    angle += uTwist;
  }
  float inverse = 1.0 / max(r, 0.000001);
  float sinN = sin(PI / uSides);
  float low = ((kStart - 0.5) * uSpan + uEdge) * inverse;
  float high = ((kFull - 0.5) * uSpan + uEdge) * inverse;
  float mean = r / uSpan * (ramp(high, cosN, sinN) - ramp(low, cosN, sinN));
  float px = 1.06 - uWeight * (uLayers - kFull + mean);
  px = px * px * uGamma + smoothstep(uFade.x, uFade.y, r);
  float fill = 1.0 - px;
  float body = fill > 0.12 ? fill - 0.06 : max(fill, 0.0) * max(fill, 0.0) / 0.24;
  float arm = (cover - mean) / max(r * (1.0 - cosN) / uSpan, 1.5) * smoothstep(0.0, uCore, r);
  float light = pow(body, 1.7) * exp(uArm * arm);
  float g = r / max(uGlow.y, 0.0001);
  light += uGlow.x * exp(-3.0 * g * g) * (1.0 - smoothstep(0.4, 1.0, g));
  light *= uExposure;
  vec3 tint = fromLch(mix(uColorA, uColorB, smoothstep(uHeat.x, uHeat.y, light)));
  fragColor = vec4(tint * light, light) * uPack;
}
`,
      k = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
in vec2 vUv;
out vec4 fragColor;
vec4 tap(vec2 d) { return texture(uSource, vUv + d * uTexel); }
void main() {
  vec4 color = tap(vec2(0.0)) * 0.125
    + (tap(vec2(-2.0, 2.0)) + tap(vec2(2.0, 2.0)) + tap(vec2(-2.0, -2.0)) + tap(vec2(2.0, -2.0))) * 0.03125
    + (tap(vec2(0.0, 2.0)) + tap(vec2(-2.0, 0.0)) + tap(vec2(2.0, 0.0)) + tap(vec2(0.0, -2.0))) * 0.0625
    + (tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0)) + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0))) * 0.125;
  if (uThreshold > 0.0) {
    float peak = max(color.r, max(color.g, color.b));
    float knee = 0.5 * uThreshold;
    float soft = clamp(peak - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 0.00001);
    color *= max(soft, peak - uThreshold) / max(peak, 0.00001);
  }
  fragColor = color;
}
`,
      E = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;
vec4 tap(vec2 d) { return texture(uSource, vUv + d * uTexel); }
void main() {
  fragColor = (tap(vec2(0.0)) * 4.0
    + (tap(vec2(-1.0, 0.0)) + tap(vec2(1.0, 0.0)) + tap(vec2(0.0, -1.0)) + tap(vec2(0.0, 1.0))) * 2.0
    + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0))) / 16.0;
}
`,
      F = `
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uUnpack;
uniform float uInk;
uniform vec2 uInkCurve;
uniform float uOpacity;
in vec2 vUv;
out vec4 fragColor;

vec3 encode(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float interleaved(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
  vec4 scene = texture(uScene, vUv) * uUnpack;
  vec4 halo = texture(uBloom, vUv) * uUnpack * uBloomStrength;
  vec3 color;
  float alpha;
  if (uInk > 0.5) {
    float light = scene.a + halo.a;
    color = encode((scene.rgb + halo.rgb) / max(light, 0.0001));
    alpha = pow(1.0 - exp(-light * uInkCurve.x), uInkCurve.y);
  } else {
    vec3 mapped = encode(1.0 - exp(-(scene.rgb + halo.rgb)));
    alpha = max(mapped.r, max(mapped.g, mapped.b));
    color = mapped / max(alpha, 0.0001);
  }
  alpha *= uOpacity;
  float dither = alpha > 0.002 ? (interleaved(gl_FragCoord.xy) - 0.5) / 255.0 : 0.0;
  fragColor = vec4(clamp(color + dither, 0.0, 1.0), clamp(alpha + dither, 0.0, 1.0));
}
`,
      j = (0, n.forwardRef)(function (
        {
          width: e = "100%",
          height: t = "100%",
          className: a,
          style: l,
          children: o,
          speed: i = 1,
          direction: h = 1,
          zoom: v = 0.32,
          arms: x = 4,
          layers: j = 20,
          layerStep: I = 0.13,
          twist: T = 0.05,
          lineWeight: L = 1,
          gamma: N = 1,
          armContrast: A = 1,
          softness: P = 0.5,
          swirlColor: R = "#5227FF",
          glowColor: B = "auto",
          backgroundColor: U = "transparent",
          brightness: W = 1,
          bloom: D = 0.6,
          vignetteStart: G = 0,
          vignetteEnd: H = 0.47,
          glowStrength: q = 0.05,
          glowRadius: z = 0.05,
          opacity: O = 1,
          interactive: _,
          spinStrength: Y,
          friction: X = 1,
          windup: V = 1,
          intro: Z = !0,
          paused: Q = !1,
          dpr: $ = 2,
          cursorInteraction: J,
          cursorIntensity: K,
        },
        ee,
      ) {
        let et = (0, n.useRef)(null),
          ea = (0, n.useRef)(null),
          er = (0, n.useRef)(null),
          en = (0, n.useSyncExternalStore)(y, C, () => !1),
          el = _ ?? J ?? !0,
          eo = {
            speed: i,
            direction: h,
            zoom: v,
            arms: x,
            layers: j,
            layerStep: I,
            twist: T,
            lineWeight: L,
            gamma: N,
            armContrast: A,
            softness: P,
            swirlColor: R,
            glowColor: B,
            backgroundColor: U,
            brightness: W,
            bloom: D,
            vignetteStart: G,
            vignetteEnd: H,
            glowStrength: q,
            glowRadius: z,
            opacity: O,
            interactive: el,
            spinStrength: Y ?? K ?? 1,
            friction: X,
            windup: V,
            intro: Z,
            paused: Q,
            dpr: $,
            reduced: en,
          },
          ei = (0, n.useRef)(eo);
        ((0, n.useEffect)(() => {
          ((ei.current = eo), er.current?.sync());
        }),
          (0, n.useEffect)(() => {
            let e = et.current,
              t = ea.current;
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
                  alpha: !0,
                  premultipliedAlpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (t.appendChild(o), (r.autoClear = !1), r.setClearColor(0, 0));
              let i =
                  r.extensions.has("EXT_color_buffer_float") ||
                  r.extensions.has("EXT_color_buffer_half_float"),
                c = i ? 1 : 0.125,
                h = new s.qUd(-1, 1, 1, -1, -1, 1),
                v = new s.LoY();
              v.setAttribute(
                "position",
                new s.qtW([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
              );
              let x = new s.Z58(),
                y = new s.eaF(v);
              ((y.frustumCulled = !1), x.add(y));
              let C = (e, t, a = !1) => {
                  let r = new s.D$Q({
                    glslVersion: s.Wdf,
                    vertexShader: S,
                    fragmentShader: e,
                    uniforms: t,
                    blending: a ? s.bCz : s.XIg,
                    transparent: a,
                    depthTest: !1,
                    depthWrite: !1,
                  });
                  return (
                    a &&
                      ((r.blendEquation = s.gO9),
                      (r.blendSrc = s.qad),
                      (r.blendDst = s.qad),
                      (r.blendEquationAlpha = s.gO9),
                      (r.blendSrcAlpha = s.qad),
                      (r.blendDstAlpha = s.qad)),
                    r
                  );
                },
                j = {
                  uRes: { value: new s.I9Y(1, 1) },
                  uUnit: { value: 0.001 },
                  uSpin: { value: 0 },
                  uTwist: { value: 0.05 },
                  uSpan: { value: 0.0013 },
                  uLayers: { value: 154 },
                  uEdge: { value: 0.001 },
                  uSoft: { value: 0.006 },
                  uWeight: { value: 0.0037 },
                  uGamma: { value: 1 },
                  uFade: { value: new s.I9Y(0, 0.47) },
                  uSides: { value: 4 },
                  uArm: { value: 2 },
                  uCore: { value: 0.035 },
                  uExposure: { value: 1.9 },
                  uGlow: { value: new s.I9Y(0, 0.05) },
                  uColorA: { value: new s.Pq0() },
                  uColorB: { value: new s.Pq0() },
                  uHeat: { value: new s.I9Y(1, 5) },
                  uPack: { value: c },
                },
                I = C(M, j),
                T = () =>
                  new s.nWS(1, 1, {
                    type: i ? s.ix0 : s.OUM,
                    format: s.GWd,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    minFilter: s.k6q,
                    magFilter: s.k6q,
                    generateMipmaps: !1,
                  }),
                L = T(),
                N = Array.from({ length: 5 }, T),
                A = C(k, {
                  uSource: { value: null },
                  uTexel: { value: new s.I9Y() },
                  uThreshold: { value: 0 },
                }),
                P = C(
                  E,
                  { uSource: { value: null }, uTexel: { value: new s.I9Y() } },
                  !0,
                ),
                R = {
                  uScene: { value: L.texture },
                  uBloom: { value: N[0].texture },
                  uBloomStrength: { value: 0 },
                  uUnpack: { value: 1 / c },
                  uInk: { value: 0 },
                  uInkCurve: { value: new s.I9Y(1.1, 1.3) },
                  uOpacity: { value: 1 },
                },
                B = C(F, R),
                U = 0,
                W = 0,
                D = 1,
                G = 1,
                H = 1,
                q = !1,
                z = "",
                O = -10,
                _ = !1,
                Y = 0,
                X = 0,
                V = 0,
                Z = !1,
                Q = "",
                $ = 0,
                J = -1,
                K = 1,
                ee = 0,
                et = 0,
                ea = 0,
                er = !1,
                en = !1,
                el = !1,
                eo = null,
                ei = (e) =>
                  e.reduced || e.paused
                    ? 0
                    : 0.5 *
                      m(d(e.speed, 1), 0, 10) *
                      m(d(e.direction, 1), -4, 4),
                es = () => {
                  let t = a.current,
                    r =
                      f(t.backgroundColor) ??
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
                    n = [r.join(","), t.swirlColor, t.glowColor].join("|");
                  if (n === z) return;
                  ((z = n),
                    (_ = 0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2] > 0.55));
                  let o = g(f(t.swirlColor) ?? [0.32, 0.15, 1]),
                    i = f(t.glowColor),
                    s = i
                      ? g(i)
                      : (([e, t, a]) =>
                          w([Math.min(e + 0.24, 0.94), 0.41 * t, a + 0.28]))(o);
                  (_ &&
                    ((o = b(o, -0.04, 0.62, 0.12)),
                    (s = b(s, 0.04, 0.74, 0.75 * o[1]))),
                    o[1] < 0.02 && (o = [o[0], o[1], s[2]]),
                    s[1] < 0.02 && (s = [s[0], s[1], o[2]]),
                    j.uColorA.value.set(o[0], o[1], o[2]),
                    j.uColorB.value.set(s[0], s[1], o[2] + p(s[2] - o[2])),
                    (R.uInk.value = +!!_));
                },
                eu = () => {
                  let t = a.current,
                    n = Math.round(e.clientWidth),
                    o = Math.round(e.clientHeight);
                  if (n < 2 || o < 2) return ((q = !1), !1);
                  let i = Math.min(
                    l.devicePixelRatio || 1,
                    m(d(t.dpr, 2), 0.5, 3),
                  );
                  if (q && n === U && o === W && i === H) return !1;
                  ((q = !0),
                    (U = n),
                    (W = o),
                    (H = i),
                    r.setPixelRatio(H),
                    r.setSize(U, W, !1));
                  let s = Math.min(1, 1.5 / H);
                  ((D = Math.max(1, Math.round(U * H * s))),
                    (G = Math.max(1, Math.round(W * H * s))),
                    L.setSize(D, G),
                    j.uRes.value.set(D, G));
                  let u = D,
                    c = G;
                  for (let e of N)
                    ((u = Math.max(1, Math.round(u / 2))),
                      (c = Math.max(1, Math.round(c / 2))),
                      e.setSize(u, c));
                  return !0;
                },
                ec = () => {
                  let e, t, n, l, o, i, s, u, p, f, v, g;
                  if (!q) return;
                  performance.now() - O > 1e3 &&
                    ((O = performance.now()), es());
                  let w =
                    ((t = m(d((e = a.current).layers, 20), 0.01, 30)),
                    (i =
                      (o =
                        (l = Math.max(
                          1,
                          Math.ceil(
                            t / (n = m(d(e.layerStep, 0.13), 0.005, 10)) - 1e-6,
                          ),
                        )) > 300
                          ? t / 300
                          : n) / n),
                    (s = m(d(e.lineWeight, 1), 0, 10)),
                    (u =
                      m(d(e.zoom, 0.32), 0.02, 4) /
                      Math.max(1, Math.min(D, G))),
                    (p = m(d(e.vignetteStart, 0), 0, 4)),
                    (f = m(d(e.twist, 0.05), -1, 1)),
                    (v =
                      m(-(0.05 * $), -0.3, 0.3) *
                      m(d(e.windup, 1), 0, 3) *
                      Math.abs(f)),
                    (j.uUnit.value = u),
                    (j.uSpin.value = Y),
                    (j.uLayers.value = Math.min(l, 300)),
                    (j.uSpan.value = 0.01 * o),
                    (j.uEdge.value = 0.001 * s),
                    (j.uWeight.value = 0.0037 * s * i),
                    (j.uTwist.value = (f + v) * i),
                    (j.uSoft.value = Math.max(
                      0.014 * m(d(e.softness, 0.5), 0, 1),
                      0.75 * u,
                    )),
                    (j.uGamma.value = m(d(e.gamma, 1), 0, 10)),
                    j.uFade.value.set(
                      p,
                      Math.max(m(d(e.vignetteEnd, 0.47), 0, 6), p + 1e-4),
                    ),
                    (j.uSides.value = Math.round(m(d(e.arms, 4), 3, 8))),
                    (j.uArm.value =
                      m(d(e.armContrast, 1), 0, 4) * (_ ? 3 : 3.1)),
                    (j.uExposure.value = 1.9 * m(d(e.brightness, 1), 0, 4) * K),
                    j.uGlow.value.set(
                      2.6 *
                        (1 - Math.exp(-6 * m(d(e.glowStrength, 0.05), 0, 4))),
                      m(d(e.glowRadius, 0.05), 0, 2),
                    ),
                    (g = m(d(e.bloom, 0.6), 0, 3) * (_ ? 0.25 : 1)),
                    (R.uBloomStrength.value = g / 5),
                    (R.uOpacity.value = m(d(e.opacity, 1), 0, 1)),
                    g);
                  if (
                    ((y.material = I),
                    r.setRenderTarget(L),
                    r.render(x, h),
                    w > 0.001)
                  ) {
                    let e = L;
                    for (let t of ((y.material = A), N))
                      ((A.uniforms.uThreshold.value = e === L ? 0.9 * c : 0),
                        (A.uniforms.uSource.value = e.texture),
                        A.uniforms.uTexel.value.set(1 / e.width, 1 / e.height),
                        r.setRenderTarget(t),
                        r.render(x, h),
                        (e = t));
                    y.material = P;
                    for (let e = N.length - 1; e > 0; e--)
                      ((P.uniforms.uSource.value = N[e].texture),
                        P.uniforms.uTexel.value.set(
                          1 / N[e].width,
                          1 / N[e].height,
                        ),
                        r.setRenderTarget(N[e - 1]),
                        r.render(x, h));
                  }
                  ((y.material = B), r.setRenderTarget(null), r.render(x, h));
                },
                em = (e) => 9 * Math.max(m(d(e.spinStrength, 1), 0, 4), 0.35),
                ed = () => {
                  en || el || !er || et || (et = requestAnimationFrame(ep));
                },
                ep = (e) => {
                  if (((et = 0), en || el)) return;
                  let t = a.current,
                    r =
                      ea && e - ea < 100
                        ? Math.min(Math.max((e - ea) / 1e3, 0), 0.05)
                        : 1 / 60;
                  ea = e;
                  let l = !t.reduced && !t.paused,
                    o = ei(t),
                    i = !1;
                  if (l) {
                    t.intro && J < 0 && (J = e);
                    let a = J < 0 ? 7.2 : (e - J) / 1e3;
                    t.intro && a < 1.8
                      ? ((K = 1 - Math.pow(1 - m(a / 1.8, 0, 1), 3)), (i = !0))
                      : (K = 1);
                    let n =
                      t.intro && a < 5.4
                        ? (a / 0.75) * 1.6 * Math.exp(1 - a / 0.75)
                        : 0;
                    if (
                      ((ee = n * (Math.sign(o) || 1)), n > 5e-4 && (i = !0), Z)
                    ) {
                      let e = Y - V,
                        t = Math.exp(-24 * r),
                        a = X + 24 * e;
                      ((Y = V + (e + a * r) * t),
                        (X = (X - 24 * a * r) * t),
                        (i = !0));
                    } else {
                      let e = 0.85 * m(d(t.friction, 1), 0.05, 10);
                      (5e-4 > Math.abs((X = o + (X - o) * Math.exp(-e * r)) - o)
                        ? (X = o)
                        : (i = !0),
                        (Y += (X + ee) * r));
                    }
                    let l = (2 * Math.PI) / Math.round(m(d(t.arms, 4), 3, 8));
                    if (!Z && Math.abs(Y) > 64 * l) {
                      let e = Math.trunc(Y / l) * l;
                      Y -= e;
                    }
                    let s = Z ? X - o : X + ee - o;
                    Math.abs(($ += (s - $) * (1 - Math.exp(-r / 0.18)))) > 5e-4
                      ? (i = !0)
                      : ($ = 0);
                  } else ((K = 1), (ee = 0), (X = o), ($ = 0));
                  (ec(),
                    l && (Math.abs(o) > 0 || i) && !n.hidden
                      ? (et = requestAnimationFrame(ep))
                      : (ea = 0));
                },
                eh = (e) => {
                  let t = a.current,
                    r = ei(t),
                    n = Math.abs(X) > 0.05 ? Math.sign(X) : Math.sign(r) || 1,
                    l = em(t);
                  X = m(X + 2.4 * n * e, -l, l);
                },
                ef = (t) => {
                  let a = e.getBoundingClientRect(),
                    r = t.clientX - a.left - a.width / 2,
                    n = a.top + a.height / 2 - t.clientY;
                  return {
                    angle: Math.atan2(n, r),
                    reach:
                      Math.hypot(r, n) /
                      Math.max(1, Math.min(a.width, a.height)),
                  };
                },
                ev = () => {
                  let e = a.current;
                  return e.interactive && !e.reduced && !e.paused;
                },
                eg = (t) => {
                  if (!Z) return;
                  if (((Z = !1), t))
                    try {
                      e.hasPointerCapture(t.pointerId) &&
                        e.releasePointerCapture(t.pointerId);
                    } catch {}
                  e.style.cursor = Q;
                  let r = em(a.current);
                  ((X = m(X, -r, r)), ed());
                },
                ex = (e) => {
                  var t;
                  !e.isPrimary ||
                    ((t = e.target) &&
                      "function" == typeof t.closest &&
                      t.closest(
                        "a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]",
                      )) ||
                    !ev() ||
                    (("mouse" !== e.pointerType || 0 === e.button) &&
                      (eo = {
                        id: e.pointerId,
                        x: e.clientX,
                        y: e.clientY,
                        time: performance.now(),
                        angle: ef(e).angle,
                      }));
                },
                ew = (t) => {
                  let r,
                    n = eo;
                  if (!n || n.id !== t.pointerId) return;
                  let { angle: l, reach: o } = ef(t);
                  if (!Z) {
                    if (5 > Math.hypot(t.clientX - n.x, t.clientY - n.y))
                      return;
                    ((Z = !0), (V = Y), (n.angle = l));
                    try {
                      e.setPointerCapture(t.pointerId);
                    } catch {}
                    ((Q = e.style.cursor), (e.style.cursor = "grabbing"));
                  }
                  let i = a.current,
                    s = p(l - n.angle);
                  ((n.angle = l),
                    (V -=
                      s *
                      ((r = m((o - 0.02) / 0.12000000000000001, 0, 1)) *
                        r *
                        (3 - 2 * r)) *
                      m(d(i.spinStrength, 1), 0, 4)),
                    ed());
                },
                eb = (e) => {
                  let t = eo;
                  ((eo = null),
                    !t ||
                      t.id !== e.pointerId ||
                      (Z
                        ? eg(e)
                        : !(performance.now() - t.time > 600) &&
                          ev() &&
                          (eh(m(d(a.current.spinStrength, 1), 0, 4)), ed())));
                },
                ey = (e) => {
                  ((eo = null), eg(e));
                },
                eC = () => {
                  ((eo = null), eg());
                },
                eS = () => {
                  ((ea = 0), ed());
                },
                eM = (e) => {
                  (e.preventDefault(),
                    (el = !0),
                    cancelAnimationFrame(et),
                    (et = 0));
                },
                ek = () => {
                  ((el = !1), (z = ""), (ea = 0), ed());
                },
                eE = new ResizeObserver(() => {
                  eu() && (ec(), ed());
                }),
                eF = new IntersectionObserver(
                  ([e]) => {
                    ((er = e.isIntersecting), (ea = 0), ed());
                  },
                  { rootMargin: "120px" },
                );
              return (
                e.addEventListener("pointerdown", ex),
                e.addEventListener("pointermove", ew),
                e.addEventListener("pointerup", eb),
                e.addEventListener("pointercancel", ey),
                e.addEventListener("lostpointercapture", ey),
                l.addEventListener("blur", eC),
                n.addEventListener("visibilitychange", eS),
                o.addEventListener("webglcontextlost", eM),
                o.addEventListener("webglcontextrestored", ek),
                eE.observe(e),
                eF.observe(e),
                a.current.intro && !a.current.reduced && (K = 0),
                (X = ei(a.current)),
                eu(),
                es(),
                {
                  sync: () => {
                    ((O = -10), eu(), (ea = 0), !et && er && (ec(), ed()));
                  },
                  spin: (e) => {
                    let t = a.current;
                    t.reduced ||
                      t.paused ||
                      (eh(m(d(e ?? t.spinStrength, 1), 0, 4)), ed());
                  },
                  replay: () => {
                    a.current.reduced || ((J = -1), (K = 0), ed());
                  },
                  destroy: () => {
                    for (let t of ((en = !0),
                    cancelAnimationFrame(et),
                    eE.disconnect(),
                    eF.disconnect(),
                    e.removeEventListener("pointerdown", ex),
                    e.removeEventListener("pointermove", ew),
                    e.removeEventListener("pointerup", eb),
                    e.removeEventListener("pointercancel", ey),
                    e.removeEventListener("lostpointercapture", ey),
                    l.removeEventListener("blur", eC),
                    n.removeEventListener("visibilitychange", eS),
                    o.removeEventListener("webglcontextlost", eM),
                    o.removeEventListener("webglcontextrestored", ek),
                    Z && (e.style.cursor = Q),
                    x.remove(y),
                    v.dispose(),
                    I.dispose(),
                    A.dispose(),
                    P.dispose(),
                    B.dispose(),
                    L.dispose(),
                    N))
                      t.dispose();
                    (r.dispose(), o.remove());
                  },
                }
              );
            })(e, t, ei);
            return (
              (er.current = a),
              () => {
                (a?.destroy(), (er.current = null));
              }
            );
          }, []),
          (0, n.useImperativeHandle)(
            ee,
            () => ({
              spin: (e) => er.current?.spin(e),
              replay: () => er.current?.replay(),
            }),
            [],
          ));
        let es = U.trim().toLowerCase();
        return (0, r.jsxs)("div", {
          ref: et,
          className: (0, c.cn)("relative isolate overflow-hidden", a),
          style: {
            width: e,
            height: t,
            backgroundColor:
              "" === es || "transparent" === es || "auto" === es ? void 0 : U,
            touchAction: el ? "pan-y" : void 0,
            ...l,
          },
          children: [
            (0, r.jsx)("div", {
              ref: ea,
              "aria-hidden": "true",
              className: "pointer-events-none absolute inset-0",
            }),
            o
              ? (0, r.jsx)("div", {
                  className: "relative z-10 h-full w-full",
                  children: o,
                })
              : null,
          ],
        });
      });
    j.displayName = "SimpleSwirl";
    let I = {
        swirlColor: "#5227FF",
        glowColor: "#B19EEF",
        arms: 4,
        zoom: 0.32,
        layers: 20,
        layerStep: 0.13,
        twist: 0.05,
        armContrast: 1,
        softness: 0.5,
        brightness: 1,
        bloom: 0.6,
        glowStrength: 0.05,
        glowRadius: 0.05,
      },
      T = {
        original: I,
        orchid: {
          ...I,
          swirlColor: "#7C3AED",
          glowColor: "#FF9FFC",
          glowStrength: 0.12,
        },
        lagoon: {
          ...I,
          swirlColor: "#2563EB",
          glowColor: "#5EEAD4",
          twist: 0.06,
        },
        ember: {
          ...I,
          swirlColor: "#FF5A1F",
          glowColor: "#FFD08A",
          twist: 0.045,
        },
        mist: {
          ...I,
          swirlColor: "#6D28D9",
          glowColor: "#F0ABFC",
          armContrast: 0.55,
          softness: 1,
          bloom: 1.2,
        },
        trefoil: { ...I, glowColor: "#FF9FFC", arms: 3, twist: 0.055 },
        galaxy: { ...I, glowColor: "#FF9FFC", arms: 6, twist: 0.035 },
        whirlpool: {
          ...I,
          swirlColor: "#4F46E5",
          glowColor: "#A5B4FC",
          twist: 0.07,
          armContrast: 1.1,
        },
      },
      L = [
        { label: "Original", value: "original" },
        { label: "Orchid", value: "orchid" },
        { label: "Lagoon", value: "lagoon" },
        { label: "Ember", value: "ember" },
        { label: "Mist", value: "mist" },
        { label: "Trefoil", value: "trefoil" },
        { label: "Galaxy", value: "galaxy" },
        { label: "Whirlpool", value: "whirlpool" },
      ],
      N = [
        { label: "Clockwise", value: "1" },
        { label: "Counter-clockwise", value: "-1" },
      ],
      A = [
        {
          name: "swirlColor",
          type: "string",
          default: '"#5227FF"',
          description: "Main colour of the swirl and its arms.",
        },
        {
          name: "glowColor",
          type: "string",
          default: '"auto"',
          description:
            "Colour the brightest arms and the core heat toward. Auto derives a lighter tone from the swirl colour.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Fill behind the swirl. Transparent reads the page behind it. Light colours switch to an ink rendering.",
        },
        {
          name: "arms",
          type: "number",
          default: "4",
          description: "Number of spiral arms, from 3 to 8.",
        },
        {
          name: "speed",
          type: "number",
          default: "1",
          description: "Speed of the idle turn.",
        },
        {
          name: "direction",
          type: "number",
          default: "1",
          description:
            "Turn direction. 1 is clockwise, -1 is counter-clockwise.",
        },
        {
          name: "zoom",
          type: "number",
          default: "0.32",
          description: "Zoom into the swirl. Higher values make it smaller.",
        },
        {
          name: "layers",
          type: "number",
          default: "20",
          description: "How far the stacked layers reach, up to 30.",
        },
        {
          name: "layerStep",
          type: "number",
          default: "0.13",
          description:
            "Spacing between layers. Smaller steps give a denser swirl.",
        },
        {
          name: "twist",
          type: "number",
          default: "0.05",
          description:
            "Rotation added per layer, in radians. Higher values curl the arms more.",
        },
        {
          name: "lineWeight",
          type: "number",
          default: "1",
          description: "How much each layer adds to the density.",
        },
        {
          name: "gamma",
          type: "number",
          default: "1",
          description:
            "Contrast of the density. Higher values thin the swirl out.",
        },
        {
          name: "armContrast",
          type: "number",
          default: "1",
          description:
            "How strongly the arms stand out from the lanes between them.",
        },
        {
          name: "softness",
          type: "number",
          default: "0.5",
          description: "Softness of the arm edges.",
        },
        {
          name: "brightness",
          type: "number",
          default: "1",
          description: "Exposure of the light.",
        },
        {
          name: "bloom",
          type: "number",
          default: "0.6",
          description: "Soft glow around the brightest light.",
        },
        {
          name: "glowStrength",
          type: "number",
          default: "0.05",
          description: "Extra light at the centre.",
        },
        {
          name: "glowRadius",
          type: "number",
          default: "0.05",
          description: "Radius of the centre light.",
        },
        {
          name: "vignetteStart",
          type: "number",
          default: "0",
          description: "Distance where the outer fade begins.",
        },
        {
          name: "vignetteEnd",
          type: "number",
          default: "0.47",
          description: "Distance where the swirl has faded out.",
        },
        {
          name: "opacity",
          type: "number",
          default: "1",
          description: "Overall opacity of the effect.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Drag to spin the swirl. It keeps turning after release, then eases back to its idle speed. A click gives it a small push.",
        },
        {
          name: "spinStrength",
          type: "number",
          default: "1",
          description: "How strongly drags and clicks spin the swirl.",
        },
        {
          name: "friction",
          type: "number",
          default: "1",
          description: "How quickly a spin settles back to the idle speed.",
        },
        {
          name: "windup",
          type: "number",
          default: "1",
          description:
            "How far the arms wind and unwind while the swirl spins fast.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description: "Fades the light in while the swirl spins up.",
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
          type: "{ spin, replay }",
          default: "-",
          description:
            "spin(strength?) gives the swirl a push. replay() restarts the intro.",
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
      P = () => {
        let [e, t] = (0, i.I)(),
          a = (0, o.Y)(),
          [s, u] = (0, n.useState)("original"),
          [c, m] = (0, n.useState)(T.original),
          d = (e) => (t) => m((a) => ({ ...a, [e]: t })),
          [p, h] = (0, n.useState)(null),
          [f, v] = (0, n.useState)(1),
          [g, x] = (0, n.useState)(1),
          [w, b] = (0, n.useState)(1),
          [y, C] = (0, n.useState)(1),
          [S, M] = (0, n.useState)(0),
          [k, E] = (0, n.useState)(0.47),
          [F, I] = (0, n.useState)(1),
          [P, R] = (0, n.useState)(1),
          [B, U] = (0, n.useState)(1),
          [W, D] = (0, n.useState)(1),
          [G, H] = (0, n.useState)(!0),
          [q, z] = (0, n.useState)(!0),
          [O, _] = (0, n.useState)(!1),
          Y = p ?? ("dark" === a ? "#0a0a0a" : "#ffffff");
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
                          j,
                          {
                            ...c,
                            backgroundColor: Y,
                            speed: f,
                            direction: g,
                            lineWeight: w,
                            gamma: y,
                            vignetteStart: S,
                            vignetteEnd: k,
                            opacity: F,
                            spinStrength: P,
                            friction: B,
                            windup: W,
                            interactive: G,
                            intro: q,
                            paused: O,
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
                          options: L,
                          onChange: (e) => {
                            (u(e), m(T[e] ?? T.original));
                          },
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Swirl Color",
                          value: c.swirlColor,
                          onChange: d("swirlColor"),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Glow Color",
                          value: c.glowColor,
                          onChange: d("glowColor"),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Background",
                          value: Y,
                          onChange: h,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Arms",
                          min: 3,
                          max: 8,
                          step: 1,
                          value: c.arms,
                          onChange: d("arms"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Speed",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: f,
                          onChange: v,
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Direction",
                          value: String(g),
                          options: N,
                          onChange: (e) => x(Number(e)),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Zoom",
                          min: 0.12,
                          max: 1,
                          step: 0.01,
                          value: c.zoom,
                          onChange: d("zoom"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Layers",
                          min: 4,
                          max: 30,
                          step: 1,
                          value: c.layers,
                          onChange: d("layers"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Layer Step",
                          min: 0.05,
                          max: 0.5,
                          step: 0.01,
                          value: c.layerStep,
                          onChange: d("layerStep"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Twist",
                          min: 0,
                          max: 0.15,
                          step: 0.001,
                          value: c.twist,
                          onChange: d("twist"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Line Weight",
                          min: 0.3,
                          max: 2,
                          step: 0.05,
                          value: w,
                          onChange: b,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Gamma",
                          min: 0.5,
                          max: 2,
                          step: 0.05,
                          value: y,
                          onChange: C,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Arm Contrast",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.armContrast,
                          onChange: d("armContrast"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Softness",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.softness,
                          onChange: d("softness"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Brightness",
                          min: 0.2,
                          max: 2.5,
                          step: 0.01,
                          value: c.brightness,
                          onChange: d("brightness"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Bloom",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.bloom,
                          onChange: d("bloom"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Glow Strength",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.glowStrength,
                          onChange: d("glowStrength"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Glow Radius",
                          min: 0.01,
                          max: 0.2,
                          step: 0.005,
                          value: c.glowRadius,
                          onChange: d("glowRadius"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Vignette Start",
                          min: 0,
                          max: 0.4,
                          step: 0.01,
                          value: S,
                          onChange: M,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Vignette End",
                          min: 0.2,
                          max: 1.2,
                          step: 0.01,
                          value: k,
                          onChange: E,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: F,
                          onChange: I,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Spin Strength",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: P,
                          onChange: R,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Friction",
                          min: 0.2,
                          max: 4,
                          step: 0.01,
                          value: B,
                          onChange: U,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Windup",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: W,
                          onChange: D,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Interactive",
                          checked: G,
                          onChange: H,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Intro",
                          checked: q,
                          onChange: z,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Paused",
                          checked: O,
                          onChange: _,
                        }),
                      ],
                    }),
                    (0, r.jsx)(l.Ub, { data: A }),
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
