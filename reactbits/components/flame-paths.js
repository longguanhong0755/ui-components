/* ReactBits Pro public preview module 54352 for flame-paths.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/54352.ea67e88f18b6b524.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  54352: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => E }));
    var a = r(95155),
      l = r(12115),
      n = r(56388),
      o = r(86049),
      i = r(90761),
      u = r(12246),
      s = r(2253),
      c = r(90650);
    let m = ["#6600FF", "#FF0000"],
      f = (e, t, r) => Math.min(r, Math.max(t, e)),
      v = (e, t) => (Number.isFinite(e) ? e : t),
      h = (e, t, r) => {
        let a = f((r - e) / (t - e), 0, 1);
        return a * a * (3 - 2 * a);
      },
      d = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      p = ([e, t, r]) => {
        let a = d(e),
          l = d(t),
          n = d(r),
          o = Math.cbrt(0.4122214708 * a + 0.5363325363 * l + 0.0514459929 * n),
          i = Math.cbrt(0.2119034982 * a + 0.6806995451 * l + 0.1073969566 * n),
          u = Math.cbrt(0.0883024619 * a + 0.2817188376 * l + 0.6299787005 * n),
          s = 1.9779984951 * o - 2.428592205 * i + 0.4505937099 * u,
          c = 0.0259040371 * o + 0.7827717662 * i - 0.808675766 * u;
        return [
          0.2104542553 * o + 0.793617785 * i - 0.0040720468 * u,
          Math.hypot(s, c),
          Math.atan2(c, s),
        ];
      },
      g = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      x = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      y = `
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      b = `
precision highp float;
uniform vec2 uRes;
uniform float uPhase;
uniform float uFlickTime;
uniform float uCenter;
uniform float uAmp;
uniform float uFreq;
uniform float uInner;
uniform float uPull;
uniform float uPowA;
uniform float uPowB;
uniform float uDir;
uniform float uMirror;
uniform float uScroll;
uniform float uSway;
uniform float uLean;
uniform float uLength;
uniform float uFlicker;
uniform float uBright;
uniform float uCore;
uniform float uDepth;
uniform float uToe;
uniform float uLegacy;
uniform vec3 uGain;
uniform vec3 uHeat;
uniform vec3 uLchA;
uniform vec3 uLchB;
uniform float uFade;
uniform vec4 uFlares[6];
in vec2 vUv;
out vec4 fragColor;

const float TAU = 6.28318530718;
const float PI = 3.14159265359;

vec2 gradient(vec2 cell) {
  float angle = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453) * TAU;
  return vec2(cos(angle), sin(angle));
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(gradient(i), f);
  float b = dot(gradient(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(gradient(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(gradient(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.4;
}

vec3 fromLab(vec3 lab) {
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  lms = lms * lms * lms;
  return mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * lms;
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = vUv;
  if (uMirror > 0.5) uv.y = 1.0 - uv.y;
  vec2 st = vec2(uv.x * aspect, uv.y);
  vec2 nrm = uv;
  float span = 1.0;
  if (uDir > 0.5 && uDir < 1.5) {
    st.x = aspect - st.x;
    nrm.x = 1.0 - nrm.x;
  } else if (uDir > 1.5 && uDir < 2.5) {
    st = vec2(st.y, aspect - st.x);
    nrm = vec2(nrm.y, 1.0 - nrm.x);
    span = aspect;
  } else if (uDir > 2.5) {
    st = vec2(1.0 - st.y, st.x);
    nrm = vec2(1.0 - nrm.y, nrm.x);
    span = aspect;
  }

  float dist = 1.0 - nrm.x;
  float shift = uLean * dist * dist;
  nrm.y += shift;
  st.y += shift * span;

  st.y -= uCenter;
  float t = uPhase;
  float wave = nrm.x * uFreq * TAU;
  float sway = sin(wave + t) + uFlicker * 0.32 * sin(wave * 1.618 - t * 1.37 + 2.1);
  st.y *= uSway * sway + uAmp;
  float phaseX = st.y * uInner;
  float guard = 1.0 - smoothstep(0.9, 2.4, fwidth(phaseX));
  st.y = st.x + sin(sin(phaseX)) * guard;
  st.x -= abs(sin(nrm.y * PI)) * uPull;
  st.x -= t * uScroll;

  float cA = cos(st.x + st.y);
  float cB = cos(st.x - st.y);
  float fire = sqrt(pow(abs(cA), max(uPowA, 1.0)) * pow(abs(cB), max(uPowB, 1.0)));

  float flick = uFlicker * noise(vec2(phaseX * 0.16 + 3.7, uFlickTime));

  float surge = 0.0;
  for (int i = 0; i < 6; i++) {
    vec4 f = uFlares[i];
    if (f.z <= 0.0) continue;
    float age = f.y - dist * 0.42;
    float envelope = smoothstep(0.0, 0.18, age) * exp(-max(age, 0.0) * 1.15) * (1.0 - smoothstep(2.2, 3.0, age));
    float lateral = uDir < 1.5 ? vUv.y - f.w : vUv.x - f.x;
    surge += f.z * envelope * (0.5 + 0.5 * exp(-lateral * lateral * 9.0));
  }
  surge = 1.8 * (1.0 - exp(-surge / 1.8));

  float len = max(uLength * (1.0 + 0.28 * flick) * (1.0 + 0.6 * surge), 0.001);
  float reach = clamp(1.0 - dist / len, 0.0, 1.0);
  float energy = (1.0 + 0.45 * surge) * (1.0 + 0.12 * flick);
  float heat = fire * reach;

  vec3 light;
  if (uLegacy > 0.5) {
    light = vec3(uGain.x * fire, uGain.y * pow(fire, uHeat.y), uGain.z * pow(fire, uHeat.z) * clamp(nrm.y, 0.0, 1.0)) * reach * 0.77;
  } else {
    vec3 lch = mix(uLchA, uLchB, clamp(1.0 - nrm.y, 0.0, 1.0));
    float deep = (1.0 - smoothstep(0.0, 0.45, heat)) * uDepth;
    float lightness = lch.x * (1.0 - 0.18 * deep);
    float chroma = lch.y * (1.0 + 0.25 * deep);
    float hue = lch.z - 0.22 * deep;
    vec3 tint = encode(fromLab(vec3(lightness, chroma * cos(hue), chroma * sin(hue))));
    float gain = 0.85 / pow(max(lch.x, 0.35), 2.0);
    light = tint * gain * vec3(fire, fire, pow(fire, 1.5)) * reach;
  }
  float hot = heat * (1.0 + 0.25 * surge);
  light += 0.75 * light * smoothstep(0.35, 1.0, hot);
  float root = min(reach * (1.0 + 0.25 * surge), 1.15);
  float spot = fire * fire * fire * fire * root * root * root * root * root * root;
  light += uCore * 0.7 * spot;
  light *= uBright * energy * uFade;
  light = light * light / (light + uToe);
  fragColor = vec4(light, 1.0);
}
`,
      w = `
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
    float knee = 0.45;
    float soft = clamp(peak - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 0.00001);
    color *= max(soft, peak - uThreshold) / max(peak, 0.00001);
  }
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
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform vec3 uBackground;
uniform float uSolid;
uniform float uInk;
uniform float uOpacity;
in vec2 vUv;
out vec4 fragColor;

vec3 decode(vec3 c) {
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
  return mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * lms;
}

vec3 shoulder(vec3 x) {
  vec3 over = max(x - 0.55, 0.0);
  return min(x, vec3(0.55)) + 0.45 * (1.0 - exp(-over / 0.45));
}

float dither(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))) - 0.5;
}

void main() {
  vec3 e = max(texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uBloomStrength, 0.0);
  float peak = max(e.r, max(e.g, e.b));
  vec3 color;
  float alpha;
  if (uInk > 0.5) {
    vec3 lab = toLab(decode(clamp(e / max(peak, 0.0001), 0.0, 1.0)));
    float chroma = length(lab.yz);
    vec2 ab = lab.yz * mix(1.0, 1.12, smoothstep(0.02, 0.08, chroma));
    float warm = smoothstep(0.4, 1.0, cos(atan(lab.z, lab.y) - 1.75));
    color = encode(fromLab(vec3(clamp(lab.x * 0.8, 0.3, 0.58 + 0.14 * warm), ab)));
    alpha = 1.0 - exp(-pow(peak, 1.6) * 2.0);
  } else {
    vec3 c = shoulder(e);
    alpha = max(c.r, max(c.g, c.b));
    color = c / max(alpha, 0.0001);
  }
  float grain = dither(gl_FragCoord.xy) / 255.0;
  if (uSolid > 0.5) {
    fragColor = vec4(clamp(color * alpha + uBackground * (1.0 - alpha) + grain, 0.0, 1.0), clamp(uOpacity, 0.0, 1.0));
  } else {
    fragColor = vec4(clamp(color + grain, 0.0, 1.0), clamp((alpha + grain) * uOpacity, 0.0, 1.0));
  }
}
`,
      F = (0, l.forwardRef)(function (
        {
          width: e = "100%",
          height: t = "100%",
          className: r,
          style: n,
          children: o,
          colors: i,
          backgroundColor: d = "#000000",
          origin: F,
          speed: k = 0.4,
          length: P = 1,
          brightness: L = 1,
          glow: M = 1,
          core: j = 1,
          flicker: E = 0.5,
          centerShift: A = 1,
          waveAmplitude: T = 10,
          waveFrequency: B = 0.6,
          innerFrequency: I = 2.5,
          horizontalPull: q = 1,
          plusPower: D = 30,
          minusPower: R = 10,
          opacity: U = 1,
          interactive: z,
          gustStrength: H = 1,
          flareStrength: W = 1,
          intro: N = !0,
          paused: O = !1,
          dpr: G = 2,
          direction: X,
          redGain: _,
          greenGain: Y,
          blueGain: V,
          greenPower: Q,
          bluePower: Z,
          cursorInteraction: K,
          cursorIntensity: $,
        },
        J,
      ) {
        let ee = (0, l.useRef)(null),
          et = (0, l.useRef)(null),
          er = (0, l.useRef)(null),
          ea = (0, l.useSyncExternalStore)(g, x, () => !1),
          el =
            void 0 !== _ ||
            void 0 !== Y ||
            void 0 !== V ||
            void 0 !== Q ||
            void 0 !== Z,
          en = {
            colors: i ?? (el ? null : m),
            gains: [_ ?? 2, Y ?? 0, V ?? 5, Q ?? 1, Z ?? 1.5],
            backgroundColor: d,
            layout: "bottom" === F ? 4 : "top" === F || void 0 === X ? 2 : X,
            speed: k,
            length: P,
            brightness: L,
            glow: M,
            core: j,
            flicker: E,
            centerShift: A,
            waveAmplitude: T,
            waveFrequency: B,
            innerFrequency: I,
            horizontalPull: q,
            plusPower: D,
            minusPower: R,
            opacity: U,
            interactive: z ?? K ?? !0,
            gustStrength: H * ($ ?? 1),
            flareStrength: W,
            intro: N,
            paused: O,
            dpr: G,
            reduced: ea,
          },
          eo = (0, l.useRef)(en);
        return (
          (0, l.useEffect)(() => {
            ((eo.current = en), er.current?.sync());
          }),
          (0, l.useEffect)(() => {
            let e = ee.current,
              t = et.current;
            if (!e || !t) return;
            let r = (function (e, t, r) {
              let a,
                l,
                n = e.ownerDocument,
                o = n.defaultView ?? window,
                i = n.createElement("canvas");
              (i.setAttribute("aria-hidden", "true"),
                (i.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block"));
              try {
                a = new u.WebGLRenderer({
                  canvas: i,
                  alpha: !0,
                  premultipliedAlpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (t.appendChild(i), (a.autoClear = !1), a.setClearColor(0, 0));
              let c =
                  ((l = null),
                  (e) => {
                    let t = e.trim().toLowerCase();
                    if (
                      !t ||
                      "transparent" === t ||
                      "none" === t ||
                      "auto" === t ||
                      !(l ??= n
                        .createElement("canvas")
                        .getContext("2d", { willReadFrequently: !0 })) ||
                      ((l.fillStyle = "#010203"),
                      (l.fillStyle = t),
                      "#010203" === l.fillStyle &&
                        "#010203" !== t &&
                        "rgb(1, 2, 3)" !== t)
                    )
                      return null;
                    (l.clearRect(0, 0, 1, 1), l.fillRect(0, 0, 1, 1));
                    let [r, a, o, i] = l.getImageData(0, 0, 1, 1).data;
                    return i < 13 ? null : [r / 255, a / 255, o / 255];
                  }),
                m =
                  a.extensions.has("EXT_color_buffer_float") ||
                  a.extensions.has("EXT_color_buffer_half_float")
                    ? s.ix0
                    : s.OUM,
                d = new s.qUd(-1, 1, 1, -1, -1, 1),
                g = new s.LoY();
              g.setAttribute(
                "position",
                new s.qtW([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
              );
              let x = new s.Z58(),
                F = new s.eaF(g);
              ((F.frustumCulled = !1), x.add(F));
              let k = (e, t, r = !1) =>
                  new s.D$Q({
                    glslVersion: s.Wdf,
                    vertexShader: y,
                    fragmentShader: e,
                    uniforms: t,
                    blending: r ? s.EZo : s.XIg,
                    transparent: r,
                    depthTest: !1,
                    depthWrite: !1,
                  }),
                P = Array.from({ length: 6 }, () => new s.IUQ(0, 0, 0, 0)),
                L = {
                  uRes: { value: new s.I9Y(1, 1) },
                  uPhase: { value: 0 },
                  uFlickTime: { value: 0 },
                  uCenter: { value: 1 },
                  uAmp: { value: 10 },
                  uFreq: { value: 0.6 },
                  uInner: { value: 2.5 },
                  uPull: { value: 1 },
                  uPowA: { value: 30 },
                  uPowB: { value: 10 },
                  uDir: { value: 2 },
                  uMirror: { value: 0 },
                  uScroll: { value: 1 },
                  uSway: { value: 1 },
                  uLean: { value: 0 },
                  uLength: { value: 1 },
                  uFlicker: { value: 0.5 },
                  uBright: { value: 1 },
                  uCore: { value: 1 },
                  uDepth: { value: 0.8 },
                  uToe: { value: 0.1 },
                  uLegacy: { value: 0 },
                  uGain: { value: new s.Pq0(2, 0, 5) },
                  uHeat: { value: new s.Pq0(1, 1, 1.5) },
                  uLchA: { value: new s.Pq0() },
                  uLchB: { value: new s.Pq0() },
                  uFade: { value: 1 },
                  uFlares: { value: P },
                },
                M = k(b, L),
                j = () =>
                  new s.nWS(1, 1, {
                    type: m,
                    format: s.GWd,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    minFilter: s.k6q,
                    magFilter: s.k6q,
                    generateMipmaps: !1,
                  }),
                E = j(),
                A = Array.from({ length: 5 }, j),
                T = new s.Pq0(0, 0, 0),
                B = k(w, {
                  uSource: { value: null },
                  uTexel: { value: new s.I9Y() },
                  uThreshold: { value: 0 },
                }),
                I = k(
                  C,
                  { uSource: { value: null }, uTexel: { value: new s.I9Y() } },
                  !0,
                ),
                q = {
                  uScene: { value: E.texture },
                  uBloom: { value: A[0].texture },
                  uBloomStrength: { value: 0 },
                  uBackground: { value: T },
                  uSolid: { value: 1 },
                  uInk: { value: 0 },
                  uOpacity: { value: 1 },
                },
                D = k(S, q),
                R = 0,
                U = 0,
                z = 1,
                H = !1,
                W = "",
                N = !1,
                O = -10,
                G = 0,
                X = 0,
                _ = 0,
                Y = 0,
                V = !1,
                Q = 0,
                Z = 0,
                K = 0,
                $ = 0,
                J = 0,
                ee = 0,
                et = 0,
                er = 0,
                ea = !1,
                el = !1,
                en = !1,
                eo = null,
                ei = null,
                eu = [],
                es = () => {
                  let t = r.current,
                    a = c(t.backgroundColor),
                    l =
                      a ??
                      (() => {
                        let t = e.parentElement;
                        for (; t;) {
                          let e = c(o.getComputedStyle(t).backgroundColor);
                          if (e) return e;
                          t = t.parentElement;
                        }
                        return o.matchMedia("(prefers-color-scheme: dark)")
                          .matches
                          ? [0.04, 0.04, 0.04]
                          : [1, 1, 1];
                      })(),
                    n = [
                      l.join(","),
                      +!!a,
                      t.colors?.join(",") ?? "legacy",
                      t.gains.join(","),
                    ].join("|");
                  if (n !== W)
                    if (
                      ((W = n),
                      (N =
                        0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2] >
                        140 / 255),
                      T.set(l[0], l[1], l[2]),
                      (q.uSolid.value = +!!a),
                      (q.uInk.value = +!!N),
                      t.colors)
                    ) {
                      let e = p(c(t.colors[0]) ?? [0.4, 0, 1]),
                        r = p(c(t.colors[1]) ?? [1, 0, 0]);
                      (e[1] < 0.02 && (e[2] = r[2]),
                        r[1] < 0.02 && (r[2] = e[2]));
                      let a = r[2] - e[2];
                      ((a = Math.atan2(Math.sin(a), Math.cos(a))),
                        L.uLchA.value.set(e[0], e[1], e[2]),
                        L.uLchB.value.set(r[0], r[1], e[2] + a),
                        (L.uLegacy.value = 0));
                    } else {
                      let [e, r, a, l, n] = t.gains;
                      (L.uGain.value.set(e, r, a),
                        L.uHeat.value.set(1, l, n),
                        (L.uLegacy.value = 1));
                    }
                },
                ec = () => {
                  let t = r.current,
                    l = Math.round(e.clientWidth),
                    n = Math.round(e.clientHeight);
                  if (l < 2 || n < 2) return ((H = !1), !1);
                  let i = Math.min(
                    o.devicePixelRatio || 1,
                    f(v(t.dpr, 2), 0.5, 3),
                  );
                  if (H && l === R && n === U && i === z) return !1;
                  ((H = !0),
                    (R = l),
                    (U = n),
                    (z = i),
                    a.setPixelRatio(z),
                    a.setSize(R, U, !1));
                  let u = Math.max(1, Math.round(R * z)),
                    s = Math.max(1, Math.round(U * z));
                  (E.setSize(u, s), L.uRes.value.set(u, s));
                  let c = u,
                    m = s;
                  for (let e of A)
                    ((c = Math.max(1, Math.round(c / 2))),
                      (m = Math.max(1, Math.round(m / 2))),
                      e.setSize(c, m));
                  return !0;
                },
                em = () => {
                  let e = r.current.layout;
                  return 4 === e
                    ? { dir: 2, mirror: 1, scroll: -1 }
                    : {
                        dir: f(Math.round(v(e, 2)), 0, 3),
                        mirror: 0,
                        scroll: 1,
                      };
                },
                ef = () => {
                  if (!H) return;
                  let e = r.current;
                  (performance.now() - O > 1e3 &&
                    ((O = performance.now()), es()),
                    (() => {
                      let e = r.current,
                        t = V ? 1 - Math.pow(1 - f(Y / 2.4, 0, 1), 3) : 1,
                        a = V ? h(0, 0.6, Y) : 1,
                        { dir: l, mirror: n, scroll: o } = em();
                      ((L.uPhase.value = G),
                        (L.uFlickTime.value = X),
                        (L.uCenter.value = f(v(e.centerShift, 1), -5, 10)),
                        (L.uAmp.value = f(v(e.waveAmplitude, 10), 0, 60)),
                        (L.uFreq.value = f(v(e.waveFrequency, 0.6), 0, 10)),
                        (L.uInner.value = f(v(e.innerFrequency, 2.5), 0, 20)),
                        (L.uPull.value = f(v(e.horizontalPull, 1), -5, 5)),
                        (L.uPowA.value = f(v(e.plusPower, 30), 1, 120)),
                        (L.uPowB.value = f(v(e.minusPower, 10), 1, 120)),
                        (L.uDir.value = l),
                        (L.uMirror.value = n),
                        (L.uScroll.value = o),
                        (L.uSway.value = 1 + 0.9 * Q),
                        (L.uLean.value =
                          0.1 * f($, -1.5, 1.5) * (l < 2 || 3 === l ? 1 : -1)),
                        (L.uLength.value =
                          f(v(e.length, 1), 0.05, 4) * t * (1 + 0.35 * Q)),
                        (L.uFlicker.value =
                          f(v(e.flicker, 0.5), 0, 2) * (1 + 1.6 * Q)),
                        (L.uBright.value =
                          f(v(e.brightness, 1), 0, 4) * (1 + 0.12 * Q)),
                        (L.uCore.value = f(v(e.core, 1), 0, 4) * !N),
                        (L.uToe.value = N ? 0.04 : 0.12),
                        (L.uFade.value = a));
                      for (let e = 0; e < 6; e++) {
                        let t = eu[e];
                        t
                          ? P[e].set(t.x, _ - t.born, t.strength, t.y)
                          : P[e].set(0, 0, 0, 0);
                      }
                      q.uOpacity.value = f(v(e.opacity, 1), 0, 1);
                    })(),
                    (F.material = M),
                    a.setRenderTarget(E),
                    a.render(x, d));
                  let t = f(v(e.glow, 1), 0, 3) * (N ? 0.45 : 1);
                  if (t > 0.001) {
                    let e = E;
                    for (let t of ((F.material = B), A))
                      ((B.uniforms.uThreshold.value = 0.45 * (e === E)),
                        (B.uniforms.uSource.value = e.texture),
                        B.uniforms.uTexel.value.set(1 / e.width, 1 / e.height),
                        a.setRenderTarget(t),
                        a.render(x, d),
                        (e = t));
                    F.material = I;
                    for (let e = A.length - 1; e > 0; e--)
                      ((I.uniforms.uSource.value = A[e].texture),
                        I.uniforms.uTexel.value.set(
                          1 / A[e].width,
                          1 / A[e].height,
                        ),
                        a.setRenderTarget(A[e - 1]),
                        a.render(x, d));
                  }
                  ((q.uBloomStrength.value = (1.4 * t) / 5),
                    (F.material = D),
                    a.setRenderTarget(null),
                    a.clear(),
                    a.render(x, d));
                },
                ev = (e, t, r) => {
                  if (!(r <= 0)) {
                    if (eu.length >= 6) {
                      let e = 0;
                      for (let t = 1; t < eu.length; t++)
                        eu[t].born < eu[e].born && (e = t);
                      eu.splice(e, 1);
                    }
                    eu.push({
                      x: f(e, 0, 1),
                      y: f(t, 0, 1),
                      born: _,
                      strength: r,
                    });
                  }
                },
                eh = () => {
                  el || en || !ea || et || (et = requestAnimationFrame(ed));
                },
                ed = (e) => {
                  if (((et = 0), el || en)) return;
                  let t = r.current,
                    a =
                      er && e - er < 100
                        ? Math.min(Math.max((e - er) / 1e3, 0), 0.05)
                        : 1 / 60;
                  er = e;
                  let l = !t.reduced && !t.paused;
                  (t.reduced || (_ += a),
                    (K *= Math.exp(-a / 0.75)),
                    (ee *= Math.exp(-a / 0.6)),
                    t.reduced
                      ? ((Q = 0), (Z = 0), ($ = 0), (J = 0))
                      : ((Z += ((K - Q) * 36 - 12 * Z) * a),
                        (Q = Math.max(Q + Z * a, 0)),
                        (J += ((ee - $) * 20 - 9 * J) * a),
                        ($ += J * a)),
                    V && (Y += a) >= 2.4 && (V = !1));
                  for (let e = eu.length - 1; e >= 0; e--)
                    _ - eu[e].born > 3.6 && eu.splice(e, 1);
                  if (l) {
                    let e = f(v(t.speed, 0.4), 0, 5),
                      r = V ? h(0, 2.4, Y) : 1;
                    ((G +=
                      a *
                      e *
                      r *
                      (1 +
                        0.9 * Q +
                        0.35 *
                          (() => {
                            let e = 0;
                            for (let t of eu) {
                              let r = _ - t.born;
                              e +=
                                t.strength *
                                h(0, 0.18, r) *
                                Math.exp(-(1.15 * Math.max(r, 0)));
                            }
                            return e;
                          })())),
                      (X += a * (0.25 + 0.9 * e) * (1 + 2.2 * Q)));
                  }
                  ef();
                  let o =
                    Q > 5e-4 ||
                    Math.abs(Z) > 5e-4 ||
                    K > 5e-4 ||
                    Math.abs($) > 5e-4 ||
                    Math.abs(J) > 5e-4 ||
                    Math.abs(ee) > 5e-4 ||
                    eu.length > 0 ||
                    V;
                  (l || o) && !n.hidden
                    ? (et = requestAnimationFrame(ed))
                    : (er = 0);
                },
                ep = () => {
                  let e = r.current;
                  e.intro && !e.reduced
                    ? ((V = !0), (Y = 0), (G = -0.26))
                    : ((V = !1), (Y = 2.4), e.reduced, (G = 0));
                },
                eg = () => {
                  let e = r.current;
                  return e.interactive && !e.reduced && !e.paused;
                },
                ex = (t) => {
                  if (!eg()) {
                    eo = null;
                    return;
                  }
                  let a = e.getBoundingClientRect();
                  if (a.width <= 0 || a.height <= 0) return;
                  let l = (t.clientX - a.left) / a.width,
                    n = (t.clientY - a.top) / a.height,
                    o = eo;
                  if (
                    ((eo = { id: t.pointerId, x: l, y: n, time: t.timeStamp }),
                    !o || o.id !== t.pointerId)
                  )
                    return;
                  let i = (t.timeStamp - o.time) / 1e3;
                  if (i <= 0 || i > 0.25) return;
                  let u = f(v(r.current.gustStrength, 1), 0, 3),
                    s = ((l - o.x) * a.width) / a.height,
                    c = n - o.y;
                  K = Math.min(K + 1.2 * Math.hypot(s, c) * u, 1.6);
                  let { dir: m } = em();
                  ((ee = f(ee + 1.6 * (m < 2 ? -c : s) * u, -1.2, 1.2)), eh());
                },
                ey = () => {
                  eo = null;
                },
                eb = (e) => {
                  var t;
                  !e.isPrimary ||
                    ((t = e.target) &&
                      "function" == typeof t.closest &&
                      t.closest(
                        "a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]",
                      )) ||
                    (("mouse" !== e.pointerType || 0 === e.button) &&
                      (ei = {
                        id: e.pointerId,
                        x: e.clientX,
                        y: e.clientY,
                        time: performance.now(),
                      }));
                },
                ew = (t) => {
                  let a = ei;
                  if (
                    ((ei = null),
                    !a ||
                      a.id !== t.pointerId ||
                      Math.hypot(t.clientX - a.x, t.clientY - a.y) > 10 ||
                      performance.now() - a.time > 600 ||
                      !eg())
                  )
                    return;
                  let l = e.getBoundingClientRect();
                  l.width <= 0 ||
                    l.height <= 0 ||
                    (ev(
                      (t.clientX - l.left) / l.width,
                      1 - (t.clientY - l.top) / l.height,
                      f(v(r.current.flareStrength, 1), 0, 3),
                    ),
                    eh());
                },
                eC = () => {
                  ((ei = null), (eo = null));
                },
                eS = () => {
                  ((er = 0), eh());
                },
                eF = (e) => {
                  (e.preventDefault(),
                    (en = !0),
                    cancelAnimationFrame(et),
                    (et = 0));
                },
                ek = () => {
                  ((en = !1), (W = ""), (er = 0), ef(), eh());
                },
                eP = new ResizeObserver(() => {
                  ec() && (ef(), eh());
                }),
                eL = new IntersectionObserver(
                  ([e]) => {
                    ((ea = e.isIntersecting), (er = 0), eh());
                  },
                  { rootMargin: "120px" },
                );
              return (
                e.addEventListener("pointermove", ex),
                e.addEventListener("pointerleave", ey),
                e.addEventListener("pointerdown", eb),
                e.addEventListener("pointerup", ew),
                e.addEventListener("pointercancel", eC),
                n.addEventListener("visibilitychange", eS),
                i.addEventListener("webglcontextlost", eF),
                i.addEventListener("webglcontextrestored", ek),
                eP.observe(e),
                eL.observe(e),
                ep(),
                ec(),
                es(),
                ef(),
                {
                  sync: () => {
                    ((O = -10), ec(), (er = 0), et || (ef(), eh()));
                  },
                  flare: (e, t) => {
                    let a = r.current;
                    a.reduced ||
                      a.paused ||
                      (ev(
                        void 0 === t ? 0.5 : v(t, 0.5),
                        0.5,
                        f(v(e ?? a.flareStrength, 1), 0, 3),
                      ),
                      eh());
                  },
                  replay: () => {
                    r.current.reduced || (ep(), (er = 0), eh());
                  },
                  destroy: () => {
                    for (let t of ((el = !0),
                    cancelAnimationFrame(et),
                    eP.disconnect(),
                    eL.disconnect(),
                    e.removeEventListener("pointermove", ex),
                    e.removeEventListener("pointerleave", ey),
                    e.removeEventListener("pointerdown", eb),
                    e.removeEventListener("pointerup", ew),
                    e.removeEventListener("pointercancel", eC),
                    n.removeEventListener("visibilitychange", eS),
                    i.removeEventListener("webglcontextlost", eF),
                    i.removeEventListener("webglcontextrestored", ek),
                    x.remove(F),
                    g.dispose(),
                    M.dispose(),
                    B.dispose(),
                    I.dispose(),
                    D.dispose(),
                    E.dispose(),
                    A))
                      t.dispose();
                    (a.dispose(), i.remove());
                  },
                }
              );
            })(e, t, eo);
            return (
              (er.current = r),
              () => {
                (r?.destroy(), (er.current = null));
              }
            );
          }, []),
          (0, l.useImperativeHandle)(
            J,
            () => ({
              flare: (e, t) => er.current?.flare(e, t),
              replay: () => er.current?.replay(),
            }),
            [],
          ),
          (0, a.jsxs)("div", {
            ref: ee,
            className: (0, c.cn)("relative isolate overflow-hidden", r),
            style: { width: e, height: t, touchAction: "pan-y", ...n },
            children: [
              (0, a.jsx)("div", {
                ref: et,
                "aria-hidden": "true",
                style: {
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                },
              }),
              o
                ? (0, a.jsx)("div", { className: "relative z-1", children: o })
                : null,
            ],
          })
        );
      });
    F.displayName = "FlamePaths";
    let k = {
        colors: ["#6600FF", "#FF0000"],
        origin: "top",
        speed: 0.4,
        length: 1,
        brightness: 1,
        glow: 1,
        core: 1,
        flicker: 0.5,
        centerShift: 1,
        waveAmplitude: 10,
        waveFrequency: 0.6,
        innerFrequency: 2.5,
        horizontalPull: 1,
        plusPower: 30,
        minusPower: 10,
      },
      P = {
        classic: k,
        aurora: {
          ...k,
          colors: ["#5227FF", "#FF5FD8"],
          speed: 0.3,
          length: 1.1,
          brightness: 0.85,
          glow: 1.3,
          core: 0.5,
          centerShift: -0.6,
        },
        ember: {
          ...k,
          colors: ["#FF2D00", "#FFB020"],
          origin: "bottom",
          speed: 0.45,
          length: 0.95,
          core: 1.1,
          flicker: 0.7,
        },
        candle: {
          ...k,
          colors: ["#FF5A1F", "#FFC46B"],
          origin: "bottom",
          speed: 0.3,
          length: 0.85,
          flicker: 0.9,
          waveAmplitude: 6,
          waveFrequency: 1.1,
        },
        frost: {
          ...k,
          colors: ["#1D4ED8", "#22D3EE"],
          speed: 0.3,
          core: 0.8,
          plusPower: 44,
          minusPower: 14,
        },
        wisp: {
          ...k,
          colors: ["#00B8D9", "#E91E8C"],
          speed: 0.35,
          length: 1.05,
          brightness: 0.85,
          waveFrequency: 1.5,
        },
        absinthe: { ...k, colors: ["#00A884", "#A3E635"], waveAmplitude: 14 },
        inferno: {
          ...k,
          colors: ["#B3001B", "#FF7A27"],
          origin: "bottom",
          speed: 0.5,
          length: 1.25,
          flicker: 0.9,
          waveAmplitude: 12,
        },
      },
      L = [
        { label: "Classic", value: "classic" },
        { label: "Aurora", value: "aurora" },
        { label: "Ember", value: "ember" },
        { label: "Candle", value: "candle" },
        { label: "Frost", value: "frost" },
        { label: "Wisp", value: "wisp" },
        { label: "Absinthe", value: "absinthe" },
        { label: "Inferno", value: "inferno" },
      ],
      M = [
        { label: "Top", value: "top" },
        { label: "Bottom", value: "bottom" },
      ],
      j = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#6600FF", "#FF0000"]',
          description:
            "Flame colours from the left of the row to the right, blended in OKLCh.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"#000000"',
          description:
            "Canvas background. Light colours switch to ink flames. Use transparent to sit on the page; light pages are detected automatically.",
        },
        {
          name: "origin",
          type: '"top" | "bottom"',
          default: '"top"',
          description:
            "Where the flames are rooted: hanging from the top edge or rising from the bottom.",
        },
        {
          name: "speed",
          type: "number",
          default: "0.4",
          description: "Speed of the flame motion.",
        },
        {
          name: "length",
          type: "number",
          default: "1",
          description: "How far the flames reach from their root.",
        },
        {
          name: "brightness",
          type: "number",
          default: "1",
          description: "Overall light output.",
        },
        {
          name: "glow",
          type: "number",
          default: "1",
          description: "Soft bloom around the brightest parts of the flames.",
        },
        {
          name: "core",
          type: "number",
          default: "1",
          description:
            "Strength of the white-hot core at the hottest point of each flame.",
        },
        {
          name: "flicker",
          type: "number",
          default: "0.5",
          description: "How much each tongue breathes and sways on its own.",
        },
        {
          name: "centerShift",
          type: "number",
          default: "1",
          description:
            "Moves the calm centre of the row. Other values sweep the flames into arcs.",
        },
        {
          name: "waveAmplitude",
          type: "number",
          default: "10",
          description:
            "Density of the tongues. Higher values give more, thinner flames.",
        },
        {
          name: "waveFrequency",
          type: "number",
          default: "0.6",
          description:
            "Waviness along each flame. High values give S-shaped tongues.",
        },
        {
          name: "innerFrequency",
          type: "number",
          default: "2.5",
          description:
            "Frequency of the inner wave that splits the row into tongues.",
        },
        {
          name: "horizontalPull",
          type: "number",
          default: "1",
          description:
            "Pulls the middle of the row out of step with the edges.",
        },
        {
          name: "plusPower",
          type: "number",
          default: "30",
          description: "Sharpness of the flames along their length.",
        },
        {
          name: "minusPower",
          type: "number",
          default: "10",
          description: "Sharpness of the flames across their width.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Moving the pointer fans the flames like a gust. Clicking makes them flare up; flare-ups stack.",
        },
        {
          name: "gustStrength",
          type: "number",
          default: "1",
          description: "How strongly pointer movement fans the flames.",
        },
        {
          name: "flareStrength",
          type: "number",
          default: "1",
          description: "Strength of each click flare-up.",
        },
        {
          name: "opacity",
          type: "number",
          default: "1",
          description: "Opacity of the whole canvas.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "Grows the flames in from their root when the component appears.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops the motion. Reduced-motion users always get a still frame.",
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
          name: "children",
          type: "ReactNode",
          default: "-",
          description: "Content rendered above the flames.",
        },
        {
          name: "ref",
          type: "{ flare, replay }",
          default: "-",
          description:
            "flare(strength?, x?) fires a flare-up from code. replay() restarts the intro.",
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
          description: "Inline styles for the root.",
        },
      ],
      E = () => {
        let [e, t] = (0, i.I)(),
          r = (0, o.Y)(),
          [u, s] = (0, l.useState)("classic"),
          [c, m] = (0, l.useState)(P.classic),
          f = (e) => (t) => m((r) => ({ ...r, [e]: t })),
          [v, h] = (0, l.useState)(null),
          [d, p] = (0, l.useState)(1),
          [g, x] = (0, l.useState)(1),
          [y, b] = (0, l.useState)(1),
          [w, C] = (0, l.useState)(!0),
          [S, k] = (0, l.useState)(!0),
          [E, A] = (0, l.useState)(!1),
          T = v ?? ("dark" === r ? "#0a0a0a" : "#ffffff");
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(n.Bg, {}),
            (0, a.jsxs)(n.VX, {
              children: [
                (0, a.jsxs)(n.Ec, {
                  children: [
                    (0, a.jsx)(n.Ch, {
                      onRefresh: t,
                      children: (0, a.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, a.jsx)(
                          F,
                          {
                            ...c,
                            backgroundColor: T,
                            gustStrength: d,
                            flareStrength: g,
                            opacity: y,
                            interactive: w,
                            intro: S,
                            paused: E,
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
                          options: L,
                          onChange: (e) => {
                            (s(e), m(P[e] ?? P.classic));
                          },
                        }),
                        (0, a.jsx)(n.bg, {
                          title: "Origin",
                          value: c.origin,
                          options: M,
                          onChange: (e) => f("origin")(e),
                        }),
                        (0, a.jsx)(n.W7, {
                          title: "Left Color",
                          value: c.colors[0],
                          onChange: (e) => f("colors")([e, c.colors[1]]),
                        }),
                        (0, a.jsx)(n.W7, {
                          title: "Right Color",
                          value: c.colors[1],
                          onChange: (e) => f("colors")([c.colors[0], e]),
                        }),
                        (0, a.jsx)(n.W7, {
                          title: "Background",
                          value: T,
                          onChange: h,
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Speed",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: c.speed,
                          onChange: f("speed"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Length",
                          min: 0.3,
                          max: 2,
                          step: 0.01,
                          value: c.length,
                          onChange: f("length"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Brightness",
                          min: 0.2,
                          max: 2.5,
                          step: 0.01,
                          value: c.brightness,
                          onChange: f("brightness"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Glow",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.glow,
                          onChange: f("glow"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Core",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.core,
                          onChange: f("core"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Flicker",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.flicker,
                          onChange: f("flicker"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Wave Amplitude",
                          min: 2,
                          max: 30,
                          step: 0.5,
                          value: c.waveAmplitude,
                          onChange: f("waveAmplitude"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Wave Frequency",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: c.waveFrequency,
                          onChange: f("waveFrequency"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Inner Frequency",
                          min: 0.5,
                          max: 8,
                          step: 0.1,
                          value: c.innerFrequency,
                          onChange: f("innerFrequency"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Center Shift",
                          min: -2,
                          max: 5,
                          step: 0.05,
                          value: c.centerShift,
                          onChange: f("centerShift"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Horizontal Pull",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: c.horizontalPull,
                          onChange: f("horizontalPull"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Plus Power",
                          min: 2,
                          max: 80,
                          step: 1,
                          value: c.plusPower,
                          onChange: f("plusPower"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Minus Power",
                          min: 1,
                          max: 60,
                          step: 1,
                          value: c.minusPower,
                          onChange: f("minusPower"),
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Gust",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: d,
                          onChange: p,
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Flare",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: g,
                          onChange: x,
                        }),
                        (0, a.jsx)(n.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: y,
                          onChange: b,
                        }),
                        (0, a.jsx)(n.tl, {
                          title: "Interactive",
                          checked: w,
                          onChange: C,
                        }),
                        (0, a.jsx)(n.tl, {
                          title: "Intro",
                          checked: S,
                          onChange: k,
                        }),
                        (0, a.jsx)(n.tl, {
                          title: "Paused",
                          checked: E,
                          onChange: A,
                        }),
                      ],
                    }),
                    (0, a.jsx)(n.Ub, { data: j }),
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
