/* ReactBits Pro public preview module 65757 for square-matrix.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/88138.755693408e5a1563.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  65757: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => A }));
    var r = a(95155),
      n = a(12115),
      l = a(56388),
      i = a(86049),
      o = a(90761),
      s = a(12246),
      u = a(2253),
      c = a(90650);
    let d = {
        ripple: 0,
        diagonal: 1,
        horizontal: 2,
        vertical: 3,
        spiral: 4,
        checker: 5,
        noise: 6,
        scan: 7,
      },
      p = [0, 45, 0, 90, 0, 0, 0, 0],
      h = ["#FF00FF", "#9A2BFF"],
      f = (e, t, a) => Math.min(a, Math.max(t, e)),
      m = (e, t) => (void 0 !== e && Number.isFinite(e) ? e : t),
      v = (e, t, a) => {
        let r = f((a - e) / (t - e), 0, 1);
        return r * r * (3 - 2 * r);
      },
      g = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      x = (e, t, a) => {
        let r = t * Math.cos(a),
          n = t * Math.sin(a),
          l = Math.pow(e + 0.3963377774 * r + 0.2158037573 * n, 3),
          i = Math.pow(e - 0.1055613458 * r - 0.0638541728 * n, 3),
          o = Math.pow(e - 0.0894841775 * r - 1.291485548 * n, 3);
        return [
          4.0767416621 * l - 3.3077115913 * i + 0.2309699292 * o,
          -1.2684380046 * l + 2.6097574011 * i - 0.3413193965 * o,
          -0.0041960863 * l - 0.7034186147 * i + 1.707614701 * o,
        ];
      },
      y = (e) => e.every((e) => e >= -5e-4 && e <= 1.0005),
      w = (e, t, a) => {
        if (y(x(e, t, a))) return t;
        let r = 0,
          n = t;
        for (let t = 0; t < 16; t++) {
          let t = (r + n) / 2;
          y(x(e, t, a)) ? (r = t) : (n = t);
        }
        return r;
      },
      b = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      F = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      C = `
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      k = `
precision highp float;
precision highp sampler2D;
uniform sampler2D uPress;
uniform vec2 uHalf;
uniform float uTime;
uniform float uPattern;
uniform float uFreq;
uniform vec2 uDir;
uniform vec2 uOrigin;
uniform float uSpan;
uniform float uRows;
uniform float uBase;
uniform float uPeak;
uniform float uContrast;
uniform float uSharp;
uniform float uAmplitude;
uniform float uSize;
uniform float uIntro;
uniform float uReach;
uniform float uRingSpeed;
uniform float uRingWidth;
uniform vec4 uRipples[8];
out vec4 fragColor;

const float TAU = 6.28318530718;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 slope(vec2 cell) {
  float a = hash(cell) * TAU;
  return vec2(cos(a), sin(a));
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(slope(i), f);
  float b = dot(slope(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(slope(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(slope(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.4;
}

float wave(vec2 id, vec2 center, vec2 d) {
  if (uPattern < 0.5) return sin(length(d) * uFreq - uTime);
  if (uPattern < 1.5) return sin(dot(d, uDir) * 1.41421356 * uFreq * 0.7 - uTime);
  if (uPattern < 3.5) return sin(dot(d, uDir) * uFreq - uTime);
  if (uPattern < 4.5) return sin((atan(d.y, d.x + 0.00001) * 2.0 + length(d) * 0.8) * uFreq - uTime);
  if (uPattern < 5.5) return sin(mod(id.x + id.y, 2.0) * 3.14159265 + length(d) * uFreq * 0.4 - uTime);
  if (uPattern < 6.5) {
    vec2 p = d * uFreq / TAU * 1.6;
    float t = uTime / TAU;
    float n = noise(p + vec2(0.34, -0.21) * t) * 0.72 + noise(p * 2.07 + vec2(-0.29, 0.38) * t + 11.7) * 0.28;
    return 2.0 * smoothstep(-0.4, 0.4, n) - 1.0;
  }
  float width = 1.3 / uFreq;
  float trail = 9.0 / uFreq;
  float margin = 4.0 * width;
  float period = 2.0 * uSpan + margin + trail + 2.0;
  float front = -uSpan - margin + mod(uTime * 5.0, period);
  float x = front - dot(center, uDir);
  float lead = exp(-x * x / (width * width)) * smoothstep(-margin, -0.75 * margin, x);
  float tail = exp(-x / (0.42 * trail)) * (1.0 - smoothstep(0.45 * trail, trail, x));
  return 2.0 * (x < 0.0 ? lead : tail) - 1.0;
}

void main() {
  vec2 texel = floor(gl_FragCoord.xy);
  vec2 id = texel - uHalf;
  vec2 center = id + 0.5;
  vec2 d = center - uOrigin;
  float lit = 0.5 + 0.5 * clamp(wave(id, center, d), -1.0, 1.0);
  float eased = lit * lit * (3.0 - 2.0 * lit);
  float energy = uBase + uPeak * mix(1.0, pow(eased, uSharp), uContrast);
  float size = uSize * (1.0 - uAmplitude * (1.0 - eased));
  float push = 0.0;
  for (int i = 0; i < 8; i++) {
    vec4 r = uRipples[i];
    if (r.w <= 0.0) continue;
    float dist = length(center - r.xy);
    float x = (dist - r.z * uRingSpeed) / uRingWidth;
    float y = x + 1.9;
    float ring = exp(-x * x) - 0.55 * exp(-y * y);
    float life = smoothstep(0.0, 0.05, r.z) * exp(-r.z / 1.6) * (1.0 - smoothstep(1.9, 2.8, r.z));
    push += ring * life * r.w / (1.0 + dist / uRows);
  }
  float press = clamp(texelFetch(uPress, ivec2(texel), 0).r, 0.0, 1.2);
  energy += clamp(push, 0.0, 1.5) * max(uPeak, 0.6) * 0.8 + press * 1.7;
  size *= (1.0 + 0.2 * clamp(push, -1.0, 1.0)) * (1.0 - 0.18 * min(press, 1.0));
  float delay = 1.10 * clamp(length(d) / uReach, 0.0, 1.0) + 0.12 * hash(id + 17.0);
  float k = clamp((uIntro - delay) / 0.70, 0.0, 1.0);
  float appear = 1.0 - (1.0 - k) * (1.0 - k) * (1.0 - k);
  energy *= appear;
  size *= appear;
  fragColor = vec4(clamp(energy * 0.2, 0.0, 1.0), clamp(size, 0.0, 0.5), clamp(press, 0.0, 1.0), eased);
}
`,
      S = `
precision highp float;
precision highp sampler2D;
uniform sampler2D uCells;
uniform vec2 uGrid;
uniform float uKnee;
out vec4 fragColor;

void main() {
  ivec2 at = ivec2(floor(gl_FragCoord.xy));
  ivec2 top = ivec2(uGrid) - 1;
  float sum = 0.0;
  float total = 0.0;
  for (int j = -3; j <= 3; j++) {
    for (int i = -3; i <= 3; i++) {
      float r = length(vec2(float(i), float(j)));
      float w = exp(-r * r / 4.5) * (1.0 - smoothstep(2.0, 3.5, r));
      float energy = texelFetch(uCells, clamp(at + ivec2(i, j), ivec2(0), top), 0).r * 5.0;
      sum += w * max(energy - uKnee, 0.0);
      total += w;
    }
  }
  fragColor = vec4(clamp(sum / total * 0.25, 0.0, 1.0), 0.0, 0.0, 1.0);
}
`,
      M = `
precision highp float;
precision highp sampler2D;
uniform sampler2D uCells;
uniform sampler2D uBloom;
uniform vec2 uGrid;
uniform vec2 uHalf;
uniform vec2 uRes;
uniform float uPitch;
uniform float uRound;
uniform float uGlow;
uniform float uHaloReach;
uniform float uBloomGain;
uniform float uPanel;
uniform float uDrift;
uniform float uInk;
uniform float uOpacity;
uniform vec3 uLchA;
uniform vec3 uLchB;
uniform float uHueDelta;
uniform vec2 uOrigin;
uniform float uReach;
out vec4 fragColor;

vec3 lchToLinear(vec3 lch) {
  vec3 lab = vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  lms = lms * lms * lms;
  return clamp(mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * lms, 0.0, 1.0);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float roundBox(vec2 p, float h, float r) {
  vec2 q = abs(p) - vec2(h - r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uPitch;
  vec2 base = floor(p);
  float t = smoothstep(0.42, 1.1, length(p - uOrigin) / uReach);
  vec3 tint = lchToLinear(vec3(mix(uLchA.xy, uLchB.xy, t), uLchA.z + uHueDelta * t));
  float lens = 0.0;
  float halo = 0.0;
  float inkCover = 0.0;
  float inkTone = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      vec2 texel = id + uHalf;
      if (texel.x < 0.0 || texel.y < 0.0 || texel.x > uGrid.x - 1.0 || texel.y > uGrid.y - 1.0) continue;
      vec4 cell = texelFetch(uCells, ivec2(texel), 0);
      float energy = cell.r * 5.0;
      float h = cell.g;
      vec2 local = p - id - 0.5 + uDrift * (cell.a * 2.0 - 1.0) * vec2(0.7071);
      if (uInk < 0.5) {
        float sd = roundBox(local, h, uRound * h);
        float c = clamp(0.5 - sd * uPitch, 0.0, 1.0) * step(0.0005, h);
        float rho = length(local) / max(h, 0.0001);
        float shape = 0.42 + 0.58 * exp(-rho * rho * 1.6) + 0.55 * exp(-rho * rho * 4.0);
        lens += c * (uPanel + energy * shape);
        float gap = max(sd, 0.0);
        halo += energy * exp(-gap / uHaloReach) * (1.0 - smoothstep(0.0, 0.8, gap)) * (1.0 - c);
      } else {
        float tone = 1.0 - exp(-energy * 1.1);
        float hi = h * (0.3 + 0.7 * sqrt(tone));
        float sd = roundBox(local, hi, uRound * hi);
        float c = clamp(0.5 - sd * uPitch, 0.0, 1.0) * step(0.0005, hi);
        if (c > inkCover) {
          inkCover = c;
          inkTone = tone;
        }
      }
    }
  }
  float dither = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  if (uInk < 0.5) {
    float bloom = texture(uBloom, (p + uHalf) / uGrid).r * 4.0 * uBloomGain;
    float energy = lens + halo * uGlow * 0.22 + bloom;
    float tone = 1.0 - exp(-energy * 1.05);
    float white = smoothstep(1.6, 4.6, energy) * 0.85;
    vec3 hue = tint / max(max(tint.r, tint.g), max(tint.b, 0.0001));
    vec3 shown = encode(tone * mix(hue, vec3(1.0), white));
    float peak = max(max(shown.r, shown.g), shown.b);
    shown += dither * step(0.004, peak);
    float alpha = clamp(max(max(shown.r, shown.g), shown.b), 0.0, 1.0);
    fragColor = vec4(clamp(shown / max(alpha, 0.0001), 0.0, 1.0), alpha * uOpacity);
    return;
  }
  vec3 deep = encode(tint * (1.0 - 0.25 * smoothstep(0.8, 1.0, inkTone)));
  float alpha = inkCover * clamp(0.16 + 0.84 * inkTone, 0.0, 1.0);
  fragColor = vec4(clamp(deep + dither * step(0.004, alpha), 0.0, 1.0), alpha * uOpacity);
}
`,
      R = (0, n.forwardRef)(function (
        {
          colors: e,
          backgroundColor: t = "transparent",
          pattern: a,
          gridSize: l = 10,
          cellSize: i,
          gap: o = 0.26,
          roundness: x,
          glow: y,
          speed: R = 1,
          waveScale: j,
          amplitude: P = 0.18,
          contrast: B,
          angle: T = 0,
          originX: z = 0.5,
          originY: A = 0.5,
          wake: E,
          rippleStrength: I = 1,
          interactive: L,
          intro: D = !0,
          paused: H = !1,
          dpr: q = 2,
          opacity: G = 1,
          width: Y = "100%",
          height: O = "100%",
          children: W,
          className: X,
          style: N,
          waveFrequency: U,
          waveAmplitude: _,
          cornerRadius: V,
          edgeSoftness: K,
          cellGap: Q,
          peakBrightness: Z,
          baseBrightness: $,
          centerDrift: J = 0,
          preset: ee,
          color: et,
          cursorInteraction: ea,
          cursorIntensity: er,
        },
        en,
      ) {
        let el = (0, n.useRef)(null),
          ei = (0, n.useRef)(null),
          eo = (0, n.useRef)(null),
          es = (0, n.useSyncExternalStore)(b, F, () => !1),
          eu = {
            colors: e ?? (et ? [et, et] : h),
            backgroundColor: t,
            pattern:
              (void 0 === a ? void 0 : d[a]) ?? f(Math.floor(m(ee, 0)), 0, 5),
            gridSize: l,
            cellSize: i,
            size:
              void 0 !== _
                ? f(1.9 * _, 0.05, 0.5)
                : 0.5 * (1 - f(m(o, 0.26), 0, 0.95)) +
                  0.5 * f(m(Q, 0), 0, 1) * f(m(o, 0.26), 0, 0.95),
            roundness: x ?? V ?? 0.35,
            glow: y ?? K ?? 0.7,
            speed: R,
            frequency: void 0 !== j ? 1 / Math.max(j, 0.05) : (U ?? 1),
            amplitude: P,
            contrast: B ?? 1,
            base: $ ?? 0,
            peak: Z ?? 2,
            angle: T,
            originX: z,
            originY: A,
            drift: J,
            wake: E ?? er ?? 1,
            rippleStrength: I,
            interactive: L ?? ea ?? !0,
            intro: D,
            paused: H,
            dpr: q,
            opacity: G,
            reduced: es,
          },
          ec = (0, n.useRef)(eu);
        ((0, n.useEffect)(() => {
          ((ec.current = eu), eo.current?.sync());
        }),
          (0, n.useEffect)(() => {
            let e = el.current,
              t = ei.current;
            if (!e || !t) return;
            let a = (function (e, t, a) {
              let r,
                n = e.ownerDocument,
                l = n.defaultView ?? window,
                i = n.createElement("canvas");
              (i.setAttribute("aria-hidden", "true"),
                (i.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block"));
              try {
                r = new s.WebGLRenderer({
                  canvas: i,
                  alpha: !0,
                  premultipliedAlpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (r.setClearColor(0, 0), t.appendChild(i));
              let o =
                  r.extensions.has("EXT_color_buffer_float") ||
                  r.extensions.has("EXT_color_buffer_half_float"),
                c = new u.qUd(-1, 1, 1, -1, -1, 1),
                d = new u.LoY();
              d.setAttribute(
                "position",
                new u.qtW([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
              );
              let h = new u.Z58(),
                x = new u.eaF(d);
              ((x.frustumCulled = !1), h.add(x));
              let y = 1,
                b = 1,
                F = 0,
                R = 0,
                j = new Float32Array(1),
                P = new Float32Array(1),
                B = new Float32Array(1),
                T = new Uint32Array(1),
                z = new Set(),
                A = () => {
                  let e = new u.GYF(j, y, b, u.VT0, u.RQf);
                  return (
                    (e.minFilter = u.hxR),
                    (e.magFilter = u.hxR),
                    (e.generateMipmaps = !1),
                    (e.needsUpdate = !0),
                    e
                  );
                },
                E = A(),
                I = new u.nWS(1, 1, {
                  type: o ? u.ix0 : u.OUM,
                  format: u.GWd,
                  depthBuffer: !1,
                  stencilBuffer: !1,
                  minFilter: u.hxR,
                  magFilter: u.hxR,
                  generateMipmaps: !1,
                }),
                L = new u.nWS(1, 1, {
                  type: o ? u.ix0 : u.OUM,
                  format: u.GWd,
                  depthBuffer: !1,
                  stencilBuffer: !1,
                  minFilter: u.k6q,
                  magFilter: u.k6q,
                  generateMipmaps: !1,
                }),
                D = Array.from({ length: 8 }, () => new u.IUQ()),
                H = {
                  uPress: { value: E },
                  uHalf: { value: new u.I9Y() },
                  uTime: { value: 0 },
                  uPattern: { value: 0 },
                  uFreq: { value: 1 },
                  uDir: { value: new u.I9Y(1, 0) },
                  uOrigin: { value: new u.I9Y() },
                  uSpan: { value: 10 },
                  uRows: { value: 20 },
                  uBase: { value: 0 },
                  uPeak: { value: 2 },
                  uContrast: { value: 0.97 },
                  uSharp: { value: 1.6 },
                  uAmplitude: { value: 0.18 },
                  uSize: { value: 0.37 },
                  uIntro: { value: 100 },
                  uReach: { value: 10 },
                  uRingSpeed: { value: 12 },
                  uRingWidth: { value: 1.25 },
                  uRipples: { value: D },
                },
                q = {
                  uCells: { value: I.texture },
                  uBloom: { value: L.texture },
                  uGrid: { value: new u.I9Y(1, 1) },
                  uHalf: { value: new u.I9Y() },
                  uRes: { value: new u.I9Y(1, 1) },
                  uPitch: { value: 38 },
                  uRound: { value: 0.35 },
                  uGlow: { value: 0.7 },
                  uHaloReach: { value: 0.13 },
                  uBloomGain: { value: 0.22 },
                  uPanel: { value: 0.028 },
                  uDrift: { value: 0 },
                  uInk: { value: 0 },
                  uOpacity: { value: 1 },
                  uLchA: { value: new u.Pq0() },
                  uLchB: { value: new u.Pq0() },
                  uHueDelta: { value: 0 },
                  uOrigin: { value: new u.I9Y() },
                  uReach: { value: 10 },
                },
                G = {
                  uCells: { value: I.texture },
                  uGrid: { value: new u.I9Y(1, 1) },
                  uKnee: { value: 1.1 },
                },
                Y = (e, t) =>
                  new u.D$Q({
                    glslVersion: u.Wdf,
                    vertexShader: C,
                    fragmentShader: e,
                    uniforms: t,
                    blending: u.XIg,
                    transparent: !1,
                    depthTest: !1,
                    depthWrite: !1,
                  }),
                O = Y(k, H),
                W = Y(S, G),
                X = Y(M, q),
                N = n.createElement("canvas");
              ((N.width = 1), (N.height = 1));
              let U = N.getContext("2d", { willReadFrequently: !0 }),
                _ = new Map(),
                V = (e) => {
                  let t = e.trim().toLowerCase();
                  if (!t || "transparent" === t || "none" === t || "auto" === t)
                    return null;
                  if (_.has(t)) return _.get(t) ?? null;
                  if (!U) return null;
                  (_.size > 96 && _.clear(), (U.fillStyle = "#010203"));
                  let a = U.fillStyle;
                  U.fillStyle = t;
                  let r = null;
                  if (U.fillStyle !== a || "#010203" === t) {
                    (U.clearRect(0, 0, 1, 1), U.fillRect(0, 0, 1, 1));
                    let e = U.getImageData(0, 0, 1, 1).data;
                    r =
                      e[3] < 13
                        ? null
                        : [e[0] / 255, e[1] / 255, e[2] / 255, e[3] / 255];
                  }
                  return (_.set(t, r), r);
                },
                K = 0,
                Q = 0,
                Z = 1,
                $ = !1,
                J = 38,
                ee = "",
                et = !1,
                ea = -1 / 0,
                er = 0,
                en = 0,
                el = 1,
                ei = !1,
                eo = -1,
                es = 0,
                eu = 0,
                ec = !1,
                ed = !1,
                ep = !1,
                eh = null,
                ef = null,
                em = !1,
                ev = null,
                eg = [],
                ex = (e, t) => {
                  let [a, r, n] = (([e, t, a]) => {
                    let r = g(e),
                      n = g(t),
                      l = g(a),
                      i = Math.cbrt(
                        0.4122214708 * r + 0.5363325363 * n + 0.0514459929 * l,
                      ),
                      o = Math.cbrt(
                        0.2119034982 * r + 0.6806995451 * n + 0.1073969566 * l,
                      ),
                      s = Math.cbrt(
                        0.0883024619 * r + 0.2817188376 * n + 0.6299787005 * l,
                      ),
                      u = 1.9779984951 * i - 2.428592205 * o + 0.4505937099 * s,
                      c = 0.0259040371 * i + 0.7827717662 * o - 0.808675766 * s;
                    return [
                      0.2104542553 * i + 0.793617785 * o - 0.0040720468 * s,
                      Math.hypot(u, c),
                      Math.atan2(c, u),
                    ];
                  })(e);
                  if (!t) return [a, w(a, r, n), n];
                  let l = Math.min(a, 0.64) - 0.03;
                  return [l, w(l, 1.2 * r, n), n];
                },
                ey = () => {
                  let t = a.current,
                    n = Math.round(e.clientWidth),
                    i = Math.round(e.clientHeight);
                  if (n < 2 || i < 2) return (($ = !1), !1);
                  let o = Math.min(
                    l.devicePixelRatio || 1,
                    f(m(t.dpr, 2), 0.5, 3),
                  );
                  return (
                    (!$ || n !== K || i !== Q || o !== Z) &&
                    (($ = !0),
                    (K = n),
                    (Q = i),
                    (Z = o),
                    r.setPixelRatio(Z),
                    r.setSize(K, Q, !1),
                    !0)
                  );
                },
                ew = () => {
                  let t, n, o, s, u;
                  if (!$) return;
                  let d = a.current;
                  (performance.now() - ea > 1e3 &&
                    ((ea = performance.now()),
                    (() => {
                      let t = a.current,
                        r = V(t.backgroundColor),
                        n = r
                          ? [r[0], r[1], r[2]]
                          : (() => {
                              let t = e.parentElement;
                              for (; t;) {
                                let e = V(
                                  l.getComputedStyle(t).backgroundColor,
                                );
                                if (e) return [e[0], e[1], e[2]];
                                t = t.parentElement;
                              }
                              let a = V(l.getComputedStyle(e).color);
                              return a
                                ? a[0] + a[1] + a[2] > 1.5
                                  ? [0.04, 0.04, 0.04]
                                  : [1, 1, 1]
                                : l.matchMedia("(prefers-color-scheme: dark)")
                                      .matches
                                  ? [0.04, 0.04, 0.04]
                                  : [1, 1, 1];
                            })(),
                        i = [n.join(","), t.colors[0], t.colors[1]].join("|");
                      if (i === ee) return;
                      ((ee = i),
                        (et =
                          0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2] >
                          0.55));
                      let o = V(t.colors[0]),
                        s = V(t.colors[1]),
                        u = ex(o ? [o[0], o[1], o[2]] : [1, 0, 1], et),
                        c = ex(s ? [s[0], s[1], s[2]] : [1, 0, 1], et);
                      (u[1] < 0.03 && (u[2] = c[2]),
                        c[1] < 0.03 && (c[2] = u[2]));
                      let d = c[2] - u[2];
                      (q.uLchA.value.set(u[0], u[1], u[2]),
                        q.uLchB.value.set(c[0], c[1], c[2]),
                        (q.uHueDelta.value = Math.atan2(
                          Math.sin(d),
                          Math.cos(d),
                        )),
                        (q.uInk.value = +!!et));
                    })()),
                    (n = f(m((t = a.current).gridSize, 10), 1, 120)),
                    (J = f(m(t.cellSize, Q / (2 * n)), 4, 600)),
                    (o = Math.ceil(K / (2 * J)) + 3),
                    (s = Math.ceil(Q / (2 * J)) + 3),
                    (o !== F || s !== R) &&
                      ((F = o),
                      (R = s),
                      (j = new Float32Array((y = 2 * F) * (b = 2 * R))),
                      (P = new Float32Array(y * b)),
                      (B = new Float32Array(y * b)),
                      (T = new Uint32Array(y * b)),
                      z.clear(),
                      E.dispose(),
                      (E = A()),
                      (H.uPress.value = E),
                      I.setSize(y, b),
                      L.setSize(y, b)));
                  let v = i.width / K,
                    g = f(Math.round(m(d.pattern, 0)), 0, 7),
                    w = ((p[g] + m(d.angle, 0)) * Math.PI) / 180,
                    C = Math.cos(w),
                    k = Math.sin(w),
                    S = {
                      x:
                        ((f(m((u = a.current).originX, 0.5), -0.5, 1.5) - 0.5) *
                          K) /
                        J,
                      y: ((0.5 - f(m(u.originY, 0.5), -0.5, 1.5)) * Q) / J,
                    },
                    M = K / (2 * J),
                    Y = Q / (2 * J),
                    N = Math.max(
                      Math.hypot(M - S.x, Y - S.y),
                      Math.hypot(M + S.x, Y - S.y),
                      Math.hypot(M - S.x, Y + S.y),
                      Math.hypot(M + S.x, Y + S.y),
                    ),
                    U = Q / J,
                    _ = f(m(d.glow, 0.7), 0, 2);
                  (H.uHalf.value.set(F, R),
                    (H.uTime.value = er),
                    (H.uPattern.value = g),
                    (H.uFreq.value = f(m(d.frequency, 1), 0.05, 10)),
                    H.uDir.value.set(C, k),
                    H.uOrigin.value.set(S.x, S.y),
                    (H.uSpan.value = Math.abs(C) * M + Math.abs(k) * Y),
                    (H.uRows.value = U),
                    (H.uBase.value = f(m(d.base, 0), 0, 5)),
                    (H.uPeak.value = f(m(d.peak, 2), 0, 5)),
                    (H.uContrast.value = f(m(d.contrast, 1), 0, 1)),
                    (H.uSharp.value = 7 === g ? 1 : 6 === g ? 1.3 : 1.6),
                    (H.uAmplitude.value = f(m(d.amplitude, 0.18), 0, 1)),
                    (H.uSize.value = f(m(d.size, 0.37), 0.02, 0.5)),
                    (H.uIntro.value = ei ? (eo < 0 ? 0 : en - eo) : 100),
                    (H.uReach.value = Math.max(N, 0.01)),
                    (H.uRingSpeed.value = 0.6 * U),
                    (H.uRingWidth.value = Math.max(1.25, 0.045 * U)));
                  for (let e = 0; e < 8; e++) {
                    let t = eg[e];
                    t
                      ? D[e].set(t.x, t.y, en - t.born, t.strength)
                      : D[e].set(0, 0, 0, 0);
                  }
                  (q.uGrid.value.set(y, b),
                    q.uHalf.value.set(F, R),
                    q.uRes.value.set(i.width, i.height),
                    (q.uPitch.value = J * v),
                    (q.uRound.value = f(m(d.roundness, 0.35), 0, 1)),
                    (q.uGlow.value = _),
                    (q.uHaloReach.value = 0.05 + 0.12 * _),
                    (q.uBloomGain.value = et ? 0 : 0.1 * _),
                    (q.uDrift.value = f(m(d.drift, 0), -0.5, 0.5)),
                    (q.uOpacity.value = f(m(d.opacity, 1), 0, 1)),
                    q.uOrigin.value.set(S.x, S.y),
                    (q.uReach.value = Math.max(N, 0.01)),
                    (x.material = O),
                    r.setRenderTarget(I),
                    r.render(h, c),
                    !et &&
                      _ > 0.001 &&
                      (G.uGrid.value.set(y, b),
                      (x.material = W),
                      r.setRenderTarget(L),
                      r.render(h, c)),
                    (x.material = X),
                    r.setRenderTarget(null),
                    r.render(h, c));
                },
                eb = () => {
                  ed || ep || !ec || es || (es = requestAnimationFrame(eF));
                },
                eF = (e) => {
                  if (((es = 0), ed || ep)) return;
                  let t = a.current,
                    r =
                      eu && e - eu < 100
                        ? Math.min(Math.max((e - eu) / 1e3, 0), 0.05)
                        : 1 / 60;
                  eu = e;
                  let l = !t.reduced && !t.paused;
                  (l && (er += 0.8 * r * f(m(t.speed, 1), 0, 10)),
                    (en += r),
                    (el += 1),
                    ei && (eo < 0 && (eo = en), en - eo > 2 && (ei = !1)),
                    (() => {
                      let e = a.current,
                        t = eh;
                      if (!t || !e.interactive || e.reduced) {
                        ef = null;
                        return;
                      }
                      let r = ef ?? t;
                      ef = { x: t.x, y: t.y };
                      let n = Math.min(
                          1,
                          (em ? 1 : 0.75) * f(m(e.wake, 1), 0, 2),
                        ),
                        l = t.x - r.x,
                        i = t.y - r.y,
                        o = l * l + i * i;
                      if (n <= 0 || (!em && o < 1e-6)) return;
                      let s = o > 3600 ? t.x : r.x,
                        u = o > 3600 ? t.y : r.y,
                        c = t.x - s,
                        d = t.y - u,
                        p = c * c + d * d,
                        h = Math.max(
                          -F,
                          Math.floor(Math.min(s, t.x) - 0.95 - 0.5),
                        ),
                        g = Math.min(
                          F - 1,
                          Math.ceil(Math.max(s, t.x) + 0.95 - 0.5),
                        ),
                        x = Math.max(
                          -R,
                          Math.floor(Math.min(u, t.y) - 0.95 - 0.5),
                        ),
                        w = Math.min(
                          R - 1,
                          Math.ceil(Math.max(u, t.y) + 0.95 - 0.5),
                        );
                      for (let e = x; e <= w; e++)
                        for (let t = h; t <= g; t++) {
                          let a = t + 0.5,
                            r = e + 0.5,
                            l =
                              p > 0
                                ? f(((a - s) * c + (r - u) * d) / p, 0, 1)
                                : 0,
                            i = Math.hypot(a - s - c * l, r - u - d * l);
                          if (i >= 0.95) continue;
                          let o = (e + R) * y + (t + F),
                            h = (1 - v(0.3, 0.95, i)) * n;
                          (h > B[o] && (B[o] = h), (T[o] = el), z.add(o));
                        }
                    })());
                  let i = ((e) => {
                    if (!z.size) return !1;
                    let t = 4.7 / (0.38 + 0.3 * f(m(a.current.wake, 1), 0, 2)),
                      r = Math.exp(-e / 0.06),
                      n = !1;
                    for (let a of z) {
                      let l = B[a],
                        i = l > j[a] ? 34 : t,
                        o = j[a] - l,
                        s = P[a] + i * o,
                        u = Math.exp(-i * e),
                        c = l + (o + s * e) * u,
                        d = (s - i * (o + s * e)) * u,
                        p = T[a] === el;
                      if (
                        ((B[a] = p ? l : l * r),
                        !p &&
                          B[a] < 0.001 &&
                          5e-4 > Math.abs(c) &&
                          0.005 > Math.abs(d))
                      ) {
                        ((j[a] = 0), (P[a] = 0), (B[a] = 0), z.delete(a));
                        continue;
                      }
                      ((j[a] = c),
                        (P[a] = d),
                        (!p || Math.abs(c - l) > 5e-4 || Math.abs(d) > 0.005) &&
                          (n = !0));
                    }
                    return ((E.needsUpdate = !0), n);
                  })(r);
                  for (let e = eg.length - 1; e >= 0; e--)
                    en - eg[e].born > 2.8 && eg.splice(e, 1);
                  (ew(),
                    (l || i || eg.length > 0 || ei) && !n.hidden
                      ? (es = requestAnimationFrame(eF))
                      : (eu = 0));
                },
                eC = (e, t, a) => {
                  let r = f(Math.floor(e), -F, F - 1),
                    n = f(Math.floor(t), -R, R - 1);
                  a > 0 &&
                    (eg.push({ x: r + 0.5, y: n + 0.5, born: en, strength: a }),
                    eg.length > 8 && eg.shift());
                  let l = (n + R) * y + (r + F);
                  (l >= 0 &&
                    l < B.length &&
                    ((B[l] = Math.max(B[l], 1)), z.add(l)),
                    eb());
                },
                ek = (t, a) => {
                  let r = e.getBoundingClientRect();
                  if (r.width <= 0 || r.height <= 0 || K <= 0) return null;
                  let n = J * (r.width / K);
                  return {
                    x: (t - r.left - r.width / 2) / n,
                    y: (r.top + r.height / 2 - a) / n,
                  };
                },
                eS = (e) => {
                  var t;
                  let r = a.current;
                  if (
                    !r.interactive ||
                    r.reduced ||
                    !e.isPrimary ||
                    ((t = e.target) &&
                      "function" == typeof t.closest &&
                      t.closest(
                        "a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]",
                      )) ||
                    ("mouse" === e.pointerType && 0 !== e.button)
                  )
                    return;
                  let n = ek(e.clientX, e.clientY);
                  n &&
                    ((em = !0),
                    (eh = n),
                    (ev = {
                      id: e.pointerId,
                      x: e.clientX,
                      y: e.clientY,
                      time: performance.now(),
                    }),
                    "mouse" === e.pointerType &&
                      eC(n.x, n.y, f(m(r.rippleStrength, 1), 0, 2)),
                    eb());
                },
                eM = (e) => {
                  let t = a.current;
                  if (
                    !t.interactive ||
                    t.reduced ||
                    ("touch" === e.pointerType && !em)
                  )
                    return;
                  let r = ek(e.clientX, e.clientY);
                  r && ((eh = r), eb());
                },
                eR = (e) => {
                  let t = ev;
                  ((ev = null),
                    (em = !1),
                    "mouse" !== e.pointerType && (eh = null));
                  let r = a.current;
                  if (
                    t &&
                    t.id === e.pointerId &&
                    "mouse" !== e.pointerType &&
                    r.interactive &&
                    !r.reduced &&
                    10 >= Math.hypot(e.clientX - t.x, e.clientY - t.y) &&
                    performance.now() - t.time <= 600
                  ) {
                    let t = ek(e.clientX, e.clientY);
                    t && eC(t.x, t.y, f(m(r.rippleStrength, 1), 0, 2));
                  }
                  eb();
                },
                ej = () => {
                  ((eh = null), (em = !1), eb());
                },
                eP = () => {
                  ((ev = null), (eh = null), (em = !1), eb());
                },
                eB = () => {
                  ((eu = 0), eb());
                },
                eT = (e) => {
                  (e.preventDefault(),
                    (ep = !0),
                    cancelAnimationFrame(es),
                    (es = 0));
                },
                ez = () => {
                  ((ep = !1), (ee = ""), (E.needsUpdate = !0), eb());
                },
                eA = new ResizeObserver(() => {
                  ey() && (ew(), eb());
                }),
                eE = new IntersectionObserver(
                  ([e]) => {
                    ((ec = e.isIntersecting), (eu = 0), eb());
                  },
                  { rootMargin: "120px" },
                );
              return (
                e.addEventListener("pointerdown", eS),
                e.addEventListener("pointermove", eM),
                e.addEventListener("pointerup", eR),
                e.addEventListener("pointerleave", ej),
                e.addEventListener("pointercancel", eP),
                n.addEventListener("visibilitychange", eB),
                i.addEventListener("webglcontextlost", eT),
                i.addEventListener("webglcontextrestored", ez),
                eA.observe(e),
                eE.observe(e),
                (ei = a.current.intro && !a.current.reduced),
                (er = 1.2 * !!a.current.reduced),
                ey(),
                {
                  sync: () => {
                    ((ea = -1 / 0),
                      ey(),
                      (eu = 0),
                      a.current.reduced && ((ei = !1), (er = 1.2)),
                      !es && ec && (ew(), eb()));
                  },
                  ripple: (e, t, r) => {
                    let n = a.current;
                    if (n.reduced || !$) return;
                    let l = f(m(e, m(n.originX, 0.5)), 0, 1),
                      i = f(m(t, m(n.originY, 0.5)), 0, 1);
                    eC(
                      ((l - 0.5) * K) / J,
                      ((0.5 - i) * Q) / J,
                      f(m(r, m(n.rippleStrength, 1)), 0, 2),
                    );
                  },
                  replay: () => {
                    a.current.reduced || ((ei = !0), (eo = -1), (eu = 0), eb());
                  },
                  destroy: () => {
                    ((ed = !0),
                      cancelAnimationFrame(es),
                      eA.disconnect(),
                      eE.disconnect(),
                      e.removeEventListener("pointerdown", eS),
                      e.removeEventListener("pointermove", eM),
                      e.removeEventListener("pointerup", eR),
                      e.removeEventListener("pointerleave", ej),
                      e.removeEventListener("pointercancel", eP),
                      n.removeEventListener("visibilitychange", eB),
                      i.removeEventListener("webglcontextlost", eT),
                      i.removeEventListener("webglcontextrestored", ez),
                      h.remove(x),
                      d.dispose(),
                      O.dispose(),
                      W.dispose(),
                      X.dispose(),
                      E.dispose(),
                      I.dispose(),
                      L.dispose(),
                      r.dispose(),
                      i.remove());
                  },
                }
              );
            })(e, t, ec);
            return (
              (eo.current = a),
              () => {
                (a?.destroy(), (eo.current = null));
              }
            );
          }, []),
          (0, n.useImperativeHandle)(
            en,
            () => ({
              ripple: (e, t, a) => eo.current?.ripple(e, t, a),
              replay: () => eo.current?.replay(),
            }),
            [],
          ));
        let ed = t.trim().toLowerCase();
        return (0, r.jsxs)("div", {
          ref: el,
          className: (0, c.cn)("relative isolate overflow-hidden", X),
          style: {
            width: Y,
            height: O,
            backgroundColor:
              "" === ed ||
              "transparent" === ed ||
              "auto" === ed ||
              "none" === ed
                ? void 0
                : t,
            touchAction: "pan-y",
            ...N,
          },
          children: [
            (0, r.jsx)("div", {
              ref: ei,
              "aria-hidden": "true",
              style: { position: "absolute", inset: 0, pointerEvents: "none" },
            }),
            W
              ? (0, r.jsx)("div", {
                  className: "relative z-10 h-full w-full",
                  children: W,
                })
              : null,
          ],
        });
      });
    R.displayName = "SquareMatrix";
    let j = {
        colors: ["#FF00FF", "#9A2BFF"],
        pattern: "ripple",
        gridSize: 10,
        gap: 0.26,
        roundness: 0.35,
        glow: 0.7,
        speed: 1,
        waveScale: 1,
        amplitude: 0.18,
        contrast: 1,
        peakBrightness: 2,
        baseBrightness: 0,
        angle: 0,
        originX: 0.5,
        originY: 0.5,
      },
      P = {
        classic: j,
        neon: {
          ...j,
          colors: ["#00FFD5", "#0094FF"],
          pattern: "diagonal",
          speed: 1.1,
          waveScale: 1.4,
        },
        ember: {
          ...j,
          colors: ["#FF7A1A", "#FF1F5A"],
          speed: 0.8,
          waveScale: 1.2,
          originY: 1,
        },
        vortex: {
          ...j,
          colors: ["#B13BFF", "#FF3DCB"],
          pattern: "spiral",
          gridSize: 12,
        },
        checker: {
          ...j,
          colors: ["#5227FF", "#FF00FF"],
          pattern: "checker",
          gridSize: 12,
        },
        plasma: {
          ...j,
          colors: ["#FF00FF", "#5227FF"],
          pattern: "noise",
          speed: 0.7,
          waveScale: 1.3,
          contrast: 0.9,
        },
        scanner: {
          ...j,
          colors: ["#39FF88", "#00D1FF"],
          pattern: "scan",
          gridSize: 14,
        },
        halftone: {
          ...j,
          colors: ["#FF4FD8", "#8B5CF6"],
          gridSize: 22,
          gap: 0.1,
          roundness: 1,
          glow: 0.1,
          waveScale: 1.6,
          amplitude: 0.9,
          contrast: 0.85,
          originX: 0.15,
          originY: 0.85,
        },
      },
      B = [
        { label: "Classic", value: "classic" },
        { label: "Neon", value: "neon" },
        { label: "Ember", value: "ember" },
        { label: "Vortex", value: "vortex" },
        { label: "Checker", value: "checker" },
        { label: "Plasma", value: "plasma" },
        { label: "Scanner", value: "scanner" },
        { label: "Halftone", value: "halftone" },
      ],
      T = [
        { label: "Ripple", value: "ripple" },
        { label: "Diagonal", value: "diagonal" },
        { label: "Horizontal", value: "horizontal" },
        { label: "Vertical", value: "vertical" },
        { label: "Spiral", value: "spiral" },
        { label: "Checker", value: "checker" },
        { label: "Noise", value: "noise" },
        { label: "Scan", value: "scan" },
      ],
      z = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#FF00FF", "#9A2BFF"]',
          description:
            "The two colours the grid blends between, from the origin outward. The hottest cores burn towards white. On light backgrounds they become matching inks.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Background of the component. Transparent shows the page behind it and picks the light or dark look from it.",
        },
        {
          name: "pattern",
          type: '"ripple" | "diagonal" | "horizontal" | "vertical" | "spiral" | "checker" | "noise" | "scan"',
          default: '"ripple"',
          description:
            "How the wave travels: rings from the origin, straight bands, a spiral, a checkerboard, slow organic patches, or a single sweep with a soft trail.",
        },
        {
          name: "gridSize",
          type: "number",
          default: "10",
          description: "Grid density. The frame is twice this many cells tall.",
        },
        {
          name: "cellSize",
          type: "number",
          default: "undefined",
          description:
            "Fixed distance between cells in pixels. Overrides gridSize when set.",
        },
        {
          name: "gap",
          type: "number",
          default: "0.26",
          description:
            "Space between the lights, as a share of the cell, from 0 to 0.95.",
        },
        {
          name: "roundness",
          type: "number",
          default: "0.35",
          description:
            "Corner rounding of each light, from 0 (square) to 1 (round).",
        },
        {
          name: "glow",
          type: "number",
          default: "0.7",
          description:
            "Halo and bloom around the lit cells, from 0 to 2. Bright crests bleed light into their neighbours.",
        },
        {
          name: "speed",
          type: "number",
          default: "1",
          description: "Speed of the wave. 0 holds it still.",
        },
        {
          name: "waveScale",
          type: "number",
          default: "1",
          description:
            "Size of the waves. Larger values make wider rings and bands.",
        },
        {
          name: "amplitude",
          type: "number",
          default: "0.18",
          description:
            "How much the lights swell on the crests and settle in the troughs, from 0 to 1.",
        },
        {
          name: "contrast",
          type: "number",
          default: "1",
          description:
            "How dark the troughs get, from 0 (every cell lit) to 1 (only the unlit panel shows).",
        },
        {
          name: "peakBrightness",
          type: "number",
          default: "2",
          description:
            "Brightness of the crests. Higher values push the hottest cores towards white.",
        },
        {
          name: "baseBrightness",
          type: "number",
          default: "0",
          description: "Extra light on every cell, troughs included.",
        },
        {
          name: "angle",
          type: "number",
          default: "0",
          description:
            "Turns the diagonal, horizontal, vertical and scan patterns, in degrees.",
        },
        {
          name: "originX",
          type: "number",
          default: "0.5",
          description:
            "Where the waves start, as a share of the width. The intro cascades out from here too.",
        },
        {
          name: "originY",
          type: "number",
          default: "0.5",
          description: "Where the waves start, as a share of the height.",
        },
        {
          name: "wake",
          type: "number",
          default: "1",
          description:
            "How deeply the pointer presses the cells it passes and how long they take to spring back, from 0 to 2.",
        },
        {
          name: "rippleStrength",
          type: "number",
          default: "1",
          description: "Strength of the ripple a click sends out, from 0 to 2.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Cells under the pointer sink and flare like pressed keys, then spring back. A click sends a ripple from that cell. Clicks stack.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "The cells cascade in from the origin when the component appears.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Holds the wave still. The pointer still presses cells. Reduced-motion users get a still grid.",
        },
        {
          name: "dpr",
          type: "number",
          default: "2",
          description: "Maximum device pixel ratio for the canvas.",
        },
        {
          name: "opacity",
          type: "number",
          default: "1",
          description: "Overall opacity of the grid, from 0 to 1.",
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
          default: "undefined",
          description:
            "Content laid over the grid. Clicks on its links and buttons never send a ripple.",
        },
        {
          name: "ref",
          type: "{ ripple, replay }",
          default: "undefined",
          description:
            "ripple(x?, y?, strength?) sends a ripple from a point given as shares of the frame. replay() plays the intro again.",
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
      A = () => {
        let [e, t] = (0, o.I)(),
          a = (0, i.Y)(),
          [s, u] = (0, n.useState)("classic"),
          [c, d] = (0, n.useState)(P.classic),
          p = (e) => (t) => d((a) => ({ ...a, [e]: t })),
          [h, f] = (0, n.useState)(null),
          m = h ?? ("dark" === a ? "#0a0a0a" : "#ffffff"),
          [v, g] = (0, n.useState)(1),
          [x, y] = (0, n.useState)(1),
          [w, b] = (0, n.useState)(!0),
          [F, C] = (0, n.useState)(!0),
          [k, S] = (0, n.useState)(!1);
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
                          R,
                          {
                            ...c,
                            backgroundColor: m,
                            wake: v,
                            rippleStrength: x,
                            interactive: w,
                            intro: F,
                            paused: k,
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
                          options: B,
                          onChange: (e) => {
                            (u(e), d(P[e] ?? P.classic));
                          },
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Pattern",
                          value: c.pattern,
                          options: T,
                          onChange: (e) => p("pattern")(e),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Start Color",
                          value: c.colors[0],
                          onChange: (e) =>
                            d((t) => ({ ...t, colors: [e, t.colors[1]] })),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "End Color",
                          value: c.colors[1],
                          onChange: (e) =>
                            d((t) => ({ ...t, colors: [t.colors[0], e] })),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Background",
                          value: m,
                          onChange: f,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Grid Size",
                          min: 3,
                          max: 40,
                          step: 1,
                          value: c.gridSize,
                          onChange: p("gridSize"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Gap",
                          min: 0,
                          max: 0.9,
                          step: 0.01,
                          value: c.gap,
                          onChange: p("gap"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Roundness",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.roundness,
                          onChange: p("roundness"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Glow",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.glow,
                          onChange: p("glow"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Speed",
                          min: 0,
                          max: 4,
                          step: 0.01,
                          value: c.speed,
                          onChange: p("speed"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Wave Scale",
                          min: 0.3,
                          max: 4,
                          step: 0.01,
                          value: c.waveScale,
                          onChange: p("waveScale"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Amplitude",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.amplitude,
                          onChange: p("amplitude"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Contrast",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.contrast,
                          onChange: p("contrast"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Peak Brightness",
                          min: 0,
                          max: 4,
                          step: 0.01,
                          value: c.peakBrightness,
                          onChange: p("peakBrightness"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Base Brightness",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.baseBrightness,
                          onChange: p("baseBrightness"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Angle",
                          min: -180,
                          max: 180,
                          step: 1,
                          value: c.angle,
                          valueUnit: "\xb0",
                          onChange: p("angle"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Origin X",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.originX,
                          onChange: p("originX"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Origin Y",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.originY,
                          onChange: p("originY"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Wake",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: v,
                          onChange: g,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Ripple",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: x,
                          onChange: y,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Interactive",
                          checked: w,
                          onChange: b,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Intro",
                          checked: F,
                          onChange: C,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Paused",
                          checked: k,
                          onChange: S,
                        }),
                      ],
                    }),
                    (0, r.jsx)(l.Ub, { data: z }),
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
