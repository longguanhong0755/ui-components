/* ReactBits Pro public preview module 35528 for rubber-fluid.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/35528.c25a4467af9554c1.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  35528: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => M }));
    var r = a(95155),
      n = a(12115),
      o = a(56388),
      l = a(86049),
      s = a(90761),
      i = a(2253),
      u = a(12246),
      c = a(90650);
    let h = (e, t, a) => Math.min(a, Math.max(t, e)),
      d = (e, t) => (Number.isFinite(e) ? e : t),
      f = (e) => (e * Math.PI) / 180,
      p = (e, t, a) => {
        let r = h((a - e) / (t - e), 0, 1);
        return r * r * (3 - 2 * r);
      },
      m = new i.Q1f(),
      v = (e) => {
        let t = e.trim().toLowerCase();
        if (!t || "transparent" === t || "none" === t || "auto" === t)
          return null;
        let a = /^rgba?\(([^)]+)\)$/i.exec(t);
        if (a) {
          let e = a[1]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .map((e) => Number.parseFloat(e));
          return e.length > 3 && Number.isFinite(e[3]) && e[3] < 0.05
            ? null
            : [(e[0] ?? 0) / 255, (e[1] ?? 0) / 255, (e[2] ?? 0) / 255];
        }
        try {
          m.setStyle(t, i.jf0);
        } catch {
          return null;
        }
        return [m.r, m.g, m.b];
      },
      g = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      x = ([e, t, a]) => {
        let r = g(e),
          n = g(t),
          o = g(a),
          l = Math.cbrt(0.4122214708 * r + 0.5363325363 * n + 0.0514459929 * o),
          s = Math.cbrt(0.2119034982 * r + 0.6806995451 * n + 0.1073969566 * o),
          i = Math.cbrt(0.0883024619 * r + 0.2817188376 * n + 0.6299787005 * o);
        return [
          0.2104542553 * l + 0.793617785 * s - 0.0040720468 * i,
          1.9779984951 * l - 2.428592205 * s + 0.4505937099 * i,
          0.0259040371 * l + 0.7827717662 * s - 0.808675766 * i,
        ];
      },
      w = ([e, t, a]) => [e, Math.hypot(t, a), Math.atan2(a, t)],
      y = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      b = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      C = `
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      P = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uZoom;
uniform float uCount;
uniform vec4 uSteps[20];
uniform vec2 uDrift;
uniform vec3 uPhase;
uniform float uGlow;
uniform float uCompress;
uniform float uPre;
uniform float uPreOff;
uniform float uThresh;
uniform float uGamma;
uniform float uNorm;
uniform float uDepth;
uniform float uGloss;
uniform float uSheen;
uniform float uRough;
uniform vec3 uLight;
uniform vec3 uRim;
uniform vec3 uLchA;
uniform vec3 uLchB;
uniform float uInk;
uniform vec3 uPage;
uniform float uPageL;
uniform float uAlpha;
uniform vec4 uWaves[8];
uniform vec3 uWave;
uniform float uStretch;
out vec4 fragColor;

vec3 fromLch(vec3 lch) {
  vec3 lab = vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  lms = lms * lms * lms;
  return max(mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * lms, 0.0);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

float ring(float tau) {
  return smoothstep(0.0, 0.16, tau) * exp(-tau * uWave.z) * sin(uWave.y * tau);
}

float fold(vec2 st, out vec2 grad) {
  vec2 p = st * uZoom;
  vec2 jx = vec2(uZoom, 0.0);
  vec2 jy = vec2(0.0, uZoom);
  float sumC = 0.0;
  float sumS = 0.0;
  vec2 gradC = vec2(0.0);
  vec2 gradS = vec2(0.0);
  for (int i = 0; i < 20; i++) {
    if (float(i) >= uCount) break;
    vec4 k = uSteps[i];
    vec2 q = (p.yx + uTime) * k.x;
    vec2 sq = sin(q);
    vec2 slope = cos(q) / (1.0 + sq * sq) * k.x * k.y;
    p += atan(sq) * k.y;
    vec2 nx = jx + slope.x * jy;
    jy += slope.y * jx;
    jx = nx;
    float x = p.x + p.y;
    vec2 gx = jx + jy;
    float sx = sin(x);
    float cx = cos(x);
    sumC += cx;
    sumS += sx;
    gradC -= sx * gx;
    gradS += cx * gx;
    p = vec2(k.z * p.x + k.w * p.y, k.z * p.y - k.w * p.x);
    nx = k.z * jx + k.w * jy;
    jy = k.z * jy - k.w * jx;
    jx = nx;
    p += uDrift;
  }
  vec2 base = st * uZoom;
  float r = length(base);
  vec2 gradR = r > 0.0001 ? base * uZoom / r : vec2(0.0);
  vec3 cp = cos(uPhase);
  vec3 sp = sin(uPhase);
  vec3 acc = uGlow * r + cp * sumC - sp * sumS;
  vec3 accX = uGlow * gradR.x + cp * gradC.x - sp * gradS.x;
  vec3 accY = uGlow * gradR.y + cp * gradC.y - sp * gradS.y;
  vec3 a = tanh(acc * acc * uCompress);
  vec3 da = (1.0 - a * a) * 2.0 * acc * uCompress;
  vec3 u = a * uPre - uPreOff;
  vec3 au = max(abs(u), 0.00001);
  vec3 b = au * au * au * au * au;
  vec3 chain = 5.0 * b / au * sign(u) * uPre * da;
  float col = (b.x + b.y + b.z) / 3.0;
  vec2 gradCol = vec2(dot(chain, accX), dot(chain, accY)) / 3.0;
  float lifted = col * uPre - uThresh;
  if (lifted <= 0.0) {
    grad = vec2(0.0);
    return 0.0;
  }
  float v = pow(lifted, 5.0) * uNorm;
  float shaped = 0.734017 * pow(v / 0.734017, uGamma);
  grad = 5.0 * v / lifted * uPre * gradCol * uGamma * shaped / max(v, 0.000001);
  return shaped;
}

void main() {
  vec2 st = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float lift = 0.0;
  vec2 tilt = vec2(0.0);
  vec2 push = vec2(0.0);
  for (int i = 0; i < 8; i++) {
    vec4 wave = uWaves[i];
    if (wave.w <= 0.0) continue;
    vec2 d = st - wave.xy;
    float r = length(d);
    float tau = wave.z - r / uWave.x;
    if (tau <= 0.0) continue;
    float s = ring(tau);
    float ds = (ring(tau + 0.004) - ring(max(tau - 0.004, 0.0))) / 0.008;
    float spread = inversesqrt(1.0 + r * 5.0);
    float dspread = -2.5 * spread * spread * spread;
    vec2 dir = d / max(r, 0.0001);
    float w = wave.w * s * spread;
    lift += w;
    push += dir * w;
    tilt += dir * wave.w * (s * dspread - ds * spread / uWave.x);
  }
  lift = 0.3 * tanh(lift / 0.3);
  tilt /= max(1.0, length(tilt) / 3.0);

  vec2 grad;
  float v = fold(st - push * uStretch, grad);
  grad += tilt;
  float height = v + lift * 0.55;

  vec2 g = grad * uDepth;
  g /= 1.0 + length(g) / 0.9;
  vec3 n = normalize(vec3(-g, 1.0));
  vec3 dx = dFdx(n);
  vec3 dy = dFdy(n);
  float variance = 0.5 * (dot(dx, dx) + dot(dy, dy));
  float a2 = clamp(uRough * uRough + min(4.0 * variance, 0.7), 0.0004, 1.0);

  float diffuse = clamp((dot(n, uLight) + 0.5) / 1.5, 0.0, 1.0);
  float level = clamp((uLight.z + 0.5) / 1.5, 0.0, 1.0);
  float lit = diffuse - level;
  float crest = clamp(height / 0.734017, 0.0, 1.25);
  float glow = pow(crest, 0.55);

  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  float keySpec = exp((dot(r, uLight) - 1.0) / (0.004 + a2 * 0.45));
  float rimSpec = exp((dot(r, uRim) - 1.0) / (0.01 + a2 * 0.6));
  float spec = (uGloss * keySpec * 0.9 + uSheen * rimSpec * 0.35) * smoothstep(0.1, 0.8, crest) / (1.0 + 40.0 * variance);
  vec3 sheenTint = mix(vec3(1.0), fromLch(vec3(0.86, min(uLchB.y, 0.12), uLchB.z)), 0.55);

  float tone = clamp(0.15 + glow * 0.7 + lit * 1.2, 0.0, 1.0);
  vec3 lch = mix(uLchA, uLchB, tone);
  float alpha;
  vec3 color;
  if (uInk > 0.5) {
    float rimL = clamp(uLchA.x * 0.7, 0.24, 0.4);
    float rimC = min(uLchA.y, 0.16);
    float fall = clamp(height / 0.275, 0.0, 1.0);
    float swell = clamp((height - 0.275) / 0.459017, 0.0, 1.0);
    float relief = clamp(1.0 + lit * 0.9, 0.7, 1.2);
    float dark = 1.0 - (1.0 - pow(smoothstep(0.14, 1.0, fall), 1.15)) * (1.0 - clamp(-lit * 0.8, 0.0, 0.3));
    vec3 shadow = vec3(mix(uPageL, rimL * relief, dark), rimC * sqrt(dark), uLchA.z);
    vec3 body = vec3(
      mix(rimL, uLchB.x, pow(swell, 0.75)) * relief,
      mix(rimC, uLchB.y, swell),
      mix(uLchA.z, uLchB.z, smoothstep(0.0, 1.0, swell))
    );
    vec3 ink = height < 0.275 ? shadow : body;
    vec3 light = fromLch(ink) + sheenTint * spec * 0.8;
    light = mix(light, 0.72 + 0.28 * (1.0 - exp(-(light - 0.72) / 0.28)), step(0.72, light));
    vec3 target = encode(light);
    vec3 deficit = (uPage - target) / max(uPage, vec3(0.0001));
    alpha = clamp(max(max(deficit.r, deficit.g), deficit.b), 0.0, 1.0);
    color = alpha > 0.0001 ? uPage - (uPage - target) / alpha : uPage;
  } else {
    float shade = glow * clamp(1.0 + lit, 0.45, 1.15);
    lch.x *= shade * 0.82;
    lch.y *= mix(1.2, 1.0, clamp(shade, 0.0, 1.0));
    vec3 light = fromLch(lch) + sheenTint * spec;
    light = mix(light, 0.72 + 0.28 * (1.0 - exp(-(light - 0.72) / 0.28)), step(0.72, light));
    color = encode(light);
    alpha = smoothstep(0.01, 0.36, height);
  }
  color += (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  alpha = clamp(alpha * uAlpha + (ign(gl_FragCoord.xy + 17.0) - 0.5) / 255.0, 0.0, 1.0);
  fragColor = vec4(clamp(color, 0.0, 1.0), alpha);
}
`,
      j = (0, n.forwardRef)(function (
        {
          colors: e,
          backgroundColor: t = "transparent",
          speed: a = 1,
          scale: o = 1,
          foldDepth: l = 1,
          gloss: s = 0.2,
          sheen: m = 0.12,
          roughness: g = 0.4,
          lightAngle: j = 135,
          contrast: L = 5,
          waveStrength: S,
          interactive: k,
          intro: F = !0,
          paused: M = !1,
          dpr: R = 2,
          opacity: D = 1,
          iterations: E = 10,
          rotationRate: A = 2,
          warpPower: I = 1.5,
          seedFactor: T = 1,
          width: N = "100%",
          height: B = "100%",
          className: z,
          style: W,
          children: q,
          zoom: G = 7.5,
          iterationStep: O = 0.77,
          drift: H = 3,
          channelOffset1: Y = 3,
          channelOffset2: Z = 3,
          channelOffset3: X = 2,
          compression: _ = 0.001,
          threshold: U = 0.3,
          preBrightness: V = 2.1,
          preOffset: Q = 0.9,
          glowIntensity: $ = 0.8,
          tintR: J,
          tintG: K,
          tintB: ee,
          cursorInteraction: et,
          cursorIntensity: ea,
        },
        er,
      ) {
        let en = (0, n.useRef)(null),
          eo = (0, n.useRef)(null),
          el = (0, n.useRef)(null),
          es = {
            colors: e ?? null,
            tint:
              void 0 !== J || void 0 !== K || void 0 !== ee
                ? [J ?? 1, K ?? 0.07, ee ?? 1]
                : null,
            backgroundColor: t,
            speed: a,
            scale: o,
            zoom: G,
            foldDepth: l,
            gloss: s,
            sheen: m,
            roughness: g,
            lightAngle: j,
            contrast: L,
            waveStrength: S ?? ea ?? 1,
            interactive: k ?? et ?? !0,
            intro: F,
            paused: M,
            dpr: R,
            opacity: D,
            iterations: E,
            iterationStep: O,
            seedFactor: T,
            warpPower: I,
            drift: H,
            rotationRate: A,
            channelOffset1: Y,
            channelOffset2: Z,
            channelOffset3: X,
            compression: _,
            threshold: U,
            preBrightness: V,
            preOffset: Q,
            glowIntensity: $,
            reduced: (0, n.useSyncExternalStore)(y, b, () => !1),
          },
          ei = (0, n.useRef)(es);
        ((0, n.useEffect)(() => {
          ((ei.current = es), el.current?.sync());
        }),
          (0, n.useEffect)(() => {
            let e = en.current,
              t = eo.current;
            if (!e || !t) return;
            let a = (function (e, t, a) {
              let r,
                n = e.ownerDocument,
                o = n.defaultView ?? window,
                l = n.createElement("canvas");
              (l.setAttribute("aria-hidden", "true"),
                (l.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block"));
              try {
                r = new u.WebGLRenderer({
                  canvas: l,
                  alpha: !0,
                  premultipliedAlpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (r.setClearColor(0, 0), t.appendChild(l));
              let s = Array.from({ length: 20 }, () => new i.IUQ()),
                c = Array.from({ length: 8 }, () => new i.IUQ()),
                m = {
                  uRes: { value: new i.I9Y(1, 1) },
                  uTime: { value: 0 },
                  uZoom: { value: 7.5 },
                  uCount: { value: 10 },
                  uSteps: { value: s },
                  uDrift: { value: new i.I9Y(3, 3) },
                  uPhase: { value: new i.Pq0(3, 3, 2) },
                  uGlow: { value: 0.8 },
                  uCompress: { value: 0.001 },
                  uPre: { value: 2.1 },
                  uPreOff: { value: 0.9 },
                  uThresh: { value: 0.3 },
                  uGamma: { value: 1 },
                  uNorm: { value: 1 },
                  uDepth: { value: 0.1 },
                  uGloss: { value: 0.6 },
                  uSheen: { value: 0.5 },
                  uRough: { value: 0.35 },
                  uLight: { value: new i.Pq0(0, 0, 1) },
                  uRim: { value: new i.Pq0(0, 0, 1) },
                  uLchA: { value: new i.Pq0() },
                  uLchB: { value: new i.Pq0() },
                  uInk: { value: 0 },
                  uPage: { value: new i.Pq0(1, 1, 1) },
                  uPageL: { value: 1 },
                  uAlpha: { value: 1 },
                  uWaves: { value: c },
                  uWave: { value: new i.Pq0(0.55, 2 * Math.PI, 1.4) },
                  uStretch: { value: 0.25 },
                },
                g = new i.D$Q({
                  glslVersion: i.Wdf,
                  vertexShader: C,
                  fragmentShader: P,
                  uniforms: m,
                  blending: i.XIg,
                  transparent: !1,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                y = new i.LoY();
              y.setAttribute(
                "position",
                new i.qtW([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
              );
              let b = new i.eaF(y, g);
              b.frustumCulled = !1;
              let j = new i.Z58();
              j.add(b);
              let L = new i.qUd(-1, 1, 1, -1, -1, 1),
                S = 0,
                k = 0,
                F = !1,
                M = "",
                R = "",
                D = -1 / 0,
                E = 0,
                A = 0,
                I = 0,
                T = 0,
                N = 0,
                B = 1,
                z = 0,
                W = 1,
                q = 0,
                G = !1,
                O = 0,
                H = 0,
                Y = !1,
                Z = !1,
                X = !1,
                _ = null,
                U = [],
                V = () => {
                  let t = a.current,
                    n = Math.round(e.clientWidth),
                    l = Math.round(e.clientHeight);
                  if (n < 2 || l < 2) return ((F = !1), !1);
                  let s = Math.min(
                    o.devicePixelRatio || 1,
                    h(d(t.dpr, 2), 0.5, 3),
                  );
                  if (F && n === S && l === k && r.getPixelRatio() === s)
                    return !1;
                  ((F = !0),
                    (S = n),
                    (k = l),
                    r.setPixelRatio(s),
                    r.setSize(S, k, !1));
                  let u = r.getDrawingBufferSize(new i.I9Y());
                  return (m.uRes.value.copy(u), !0);
                },
                Q = () => {
                  if (!F) return;
                  let t = a.current;
                  (performance.now() - D > 1e3 &&
                    ((D = performance.now()),
                    (() => {
                      let t,
                        r,
                        n = a.current,
                        l =
                          v(n.backgroundColor) ??
                          (() => {
                            let t = e.parentElement;
                            for (; t;) {
                              let e = o
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
                            return o.matchMedia("(prefers-color-scheme: dark)")
                              .matches
                              ? [0.04, 0.04, 0.04]
                              : [1, 1, 1];
                          })(),
                        s =
                          0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2] > 0.55,
                        i = [
                          l.join(","),
                          n.colors?.join(",") ?? "",
                          n.tint?.join(",") ?? "",
                        ].join("|");
                      if (i === M) return;
                      ((M = i),
                        n.colors
                          ? ((t = x(v(n.colors[0]) ?? [0.62, 0.06, 0.85])),
                            (r = x(v(n.colors[1]) ?? [1, 0.07, 1])))
                          : n.tint
                            ? (t = [
                                0.6 *
                                  (r = x([
                                    h(n.tint[0], 0, 1),
                                    h(n.tint[1], 0, 1),
                                    h(n.tint[2], 0, 1),
                                  ]))[0],
                                r[1],
                                r[2],
                              ])
                            : ((t = x(v("#9D0FD9") ?? [0.62, 0.06, 0.85])),
                              (r = x(v("#FF12FF") ?? [1, 0.07, 1]))));
                      let u = w(t),
                        c = w(r);
                      (u[1] < 0.02 && (u[2] = c[2]),
                        c[1] < 0.02 && (c[2] = u[2]));
                      let d = c[2] - u[2];
                      if (
                        ((d -= Math.round(d / (2 * Math.PI)) * Math.PI * 2),
                        (c[2] = u[2] + d),
                        s)
                      )
                        for (let e of [u, c])
                          ((e[0] = h(0.86 * e[0], 0.28, 0.7)),
                            (e[1] = Math.min(1.12 * e[1], 0.32)));
                      (m.uLchA.value.set(u[0], u[1], u[2]),
                        m.uLchB.value.set(c[0], c[1], c[2]),
                        (m.uInk.value = +!!s),
                        m.uPage.value.set(l[0], l[1], l[2]),
                        (m.uPageL.value = x(l)[0]));
                    })()),
                    (() => {
                      let e = a.current,
                        t = h(d(e.iterations, 10), 1, 20),
                        r = d(e.iterationStep, 0.77),
                        n = d(e.seedFactor, 1),
                        o = h(d(e.warpPower, 1.5), 0, 6),
                        l = d(e.rotationRate, 2),
                        i = [t, r, n, o, l].join("|");
                      if (i !== R) {
                        R = i;
                        for (let e = 0; e < 20; e++) {
                          let t = (e + 0.3) * r,
                            a = Math.cos(0.05 * t) * Math.tanh(t) * n,
                            i = a - Math.floor(a),
                            u = Math.min(1 / Math.pow(i + 0.001, o), 40);
                          s[e].set(i, u, Math.cos(t * l), Math.sin(t * l));
                        }
                        m.uCount.value = h(Math.ceil(t - 0.3), 1, 20);
                      }
                    })());
                  let n = h(d(t.scale, 1), 0.2, 5),
                    l = h(d(t.zoom, 7.5), 0.5, 40),
                    i = f(d(t.lightAngle, 135)),
                    u = f(58),
                    g = f(28),
                    y = 1 - 0.08 * (1 - B);
                  ((m.uTime.value = E),
                    (m.uZoom.value = (l / n) * y),
                    m.uDrift.value.setScalar(d(t.drift, 3)),
                    m.uPhase.value.set(
                      d(t.channelOffset1, 3),
                      d(t.channelOffset2, 3),
                      d(t.channelOffset3, 2),
                    ),
                    (m.uGlow.value = h(d(t.glowIntensity, 0.8), 0, 5)),
                    (m.uCompress.value = h(d(t.compression, 0.001), 1e-5, 1)),
                    (m.uPre.value = h(d(t.preBrightness, 2.1), 0.1, 10)),
                    (m.uPreOff.value = h(d(t.preOffset, 0.9), -5, 5)),
                    (m.uThresh.value = h(d(t.threshold, 0.3), -2, 2)));
                  let b =
                      Math.pow(Math.max(Math.abs(m.uPreOff.value), 1e-4), 5) *
                        m.uPre.value -
                      m.uThresh.value,
                    C = b > 1e-4 ? Math.pow(b, 5) : 0;
                  ((m.uNorm.value =
                    C > 0 ? h(0.7340172379846278 / C, 0.001, 1e3) : 1),
                    (m.uGamma.value = h(d(t.contrast, 5), 1, 20) / 5),
                    (m.uDepth.value =
                      0.1 *
                      h(d(t.foldDepth, 1), 0, 4) *
                      Math.max(B, 0) *
                      (1 - 0.06 * I)),
                    (m.uGloss.value = h(d(t.gloss, 0.2), 0, 3) * (1 + 0.2 * I)),
                    (m.uSheen.value =
                      h(d(t.sheen, 0.12), 0, 3) * (1 + 0.15 * I)),
                    (m.uRough.value =
                      h(d(t.roughness, 0.4), 0.02, 1) * (1 - 0.35 * I)),
                    m.uLight.value.set(
                      Math.cos(i) * Math.cos(u),
                      Math.sin(i) * Math.cos(u),
                      Math.sin(u),
                    ),
                    m.uRim.value.set(
                      -Math.cos(i) * Math.cos(g),
                      -Math.sin(i) * Math.cos(g),
                      Math.sin(g),
                    ),
                    (m.uAlpha.value = h(d(t.opacity, 1), 0, 1) * W));
                  for (let e = 0; e < 8; e++) {
                    let t = U[e];
                    if (t) {
                      let a = A - t.born,
                        r = 1 - p(3.15, 4.5, a);
                      c[e].set(t.x, t.y, a, 0.1 * t.strength * r);
                    } else c[e].set(0, 0, 0, 0);
                  }
                  r.render(j, L);
                },
                $ = () => {
                  Z || X || !Y || O || (O = requestAnimationFrame(J));
                },
                J = (e) => {
                  if (((O = 0), Z || X)) return;
                  let t = a.current,
                    r =
                      H && e - H < 100
                        ? Math.min(Math.max((e - H) / 1e3, 0), 0.05)
                        : 1 / 60;
                  H = e;
                  let o = !t.reduced && !t.paused;
                  (o && (E += r * h(d(t.speed, 1), 0, 5) * 0.25), (A += r));
                  for (let e = U.length - 1; e >= 0; e--)
                    A - U[e].born >= 4.5 && U.splice(e, 1);
                  if (
                    (t.reduced
                      ? ((I = N), (T = 0))
                      : ((T += (-49 * (I - N) - 14 * T) * r), (I += T * r)),
                    G)
                  ) {
                    let e = h((q += r) / 1.3, 0, 1);
                    ((W = 1 - Math.pow(1 - e, 3)),
                      (z += (-27.040000000000003 * (B - 1) - 6.24 * z) * r),
                      (B += z * r),
                      e >= 1 &&
                        5e-4 > Math.abs(B - 1) &&
                        5e-4 > Math.abs(z) &&
                        ((G = !1), (B = 1), (z = 0), (W = 1)));
                  }
                  Q();
                  let l =
                    Math.abs(I - N) + Math.abs(T) > 5e-4 || U.length > 0 || G;
                  (o || l) && !n.hidden
                    ? (O = requestAnimationFrame(J))
                    : (H = 0);
                },
                K = (e, t, a) => {
                  a <= 0 ||
                    (U.length >= 8 && U.shift(),
                    U.push({ x: e, y: t, born: A, strength: a }),
                    (H = 0),
                    $());
                },
                ee = (t, r) => {
                  let n,
                    o = a.current;
                  if (!o.interactive || o.reduced || o.paused) return;
                  let l =
                    (n = e.getBoundingClientRect()).width <= 0 || n.height <= 0
                      ? null
                      : {
                          x:
                            ((t - n.left) / n.width - 0.5) *
                            (n.width / n.height),
                          y: 0.5 - (r - n.top) / n.height,
                        };
                  l && K(l.x, l.y, h(d(o.waveStrength, 1), 0, 3));
                },
                et = (e) => {
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
                      if (0 !== e.button) return;
                      ee(e.clientX, e.clientY);
                      return;
                    }
                    _ = {
                      id: e.pointerId,
                      x: e.clientX,
                      y: e.clientY,
                      time: performance.now(),
                    };
                  }
                },
                ea = (e) => {
                  let t = _;
                  ((_ = null),
                    !t ||
                      t.id !== e.pointerId ||
                      Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 ||
                      performance.now() - t.time > 600 ||
                      ee(e.clientX, e.clientY));
                },
                er = (e) => {
                  if ("touch" === e.pointerType) return;
                  let t = +!!a.current.interactive;
                  t !== N && ((N = t), $());
                },
                en = (e) => {
                  "touch" !== e.pointerType && ((N = 0), $());
                },
                eo = () => {
                  _ = null;
                },
                el = () => {
                  ((H = 0), $());
                },
                es = (e) => {
                  (e.preventDefault(),
                    (X = !0),
                    cancelAnimationFrame(O),
                    (O = 0));
                },
                ei = () => {
                  ((X = !1), (M = ""), (R = ""), $());
                },
                eu = new ResizeObserver(() => {
                  V() && (Q(), $());
                }),
                ec = new IntersectionObserver(
                  ([e]) => {
                    ((Y = e.isIntersecting), (H = 0), $());
                  },
                  { rootMargin: "120px" },
                ),
                eh = () => {
                  ((G = !0), (q = 0), (B = 0), (z = 0), (W = 0));
                };
              return (
                e.addEventListener("pointerdown", et),
                e.addEventListener("pointerup", ea),
                e.addEventListener("pointermove", er),
                e.addEventListener("pointerleave", en),
                e.addEventListener("pointercancel", eo),
                n.addEventListener("visibilitychange", el),
                l.addEventListener("webglcontextlost", es),
                l.addEventListener("webglcontextrestored", ei),
                eu.observe(e),
                ec.observe(e),
                a.current.intro && !a.current.reduced && eh(),
                (E = 4),
                V(),
                {
                  sync: () => {
                    ((D = -1 / 0), V(), (H = 0), !O && Y && (Q(), $()));
                  },
                  poke: (e, t, r) => {
                    let n = a.current;
                    if (n.reduced) return;
                    let o = S / Math.max(k, 1);
                    K(
                      (h(d(e ?? 0.5, 0.5), 0, 1) - 0.5) * o,
                      0.5 - h(d(t ?? 0.5, 0.5), 0, 1),
                      h(d(r ?? n.waveStrength, 1), 0, 3),
                    );
                  },
                  replay: () => {
                    a.current.reduced || (eh(), (H = 0), $());
                  },
                  destroy: () => {
                    ((Z = !0),
                      cancelAnimationFrame(O),
                      eu.disconnect(),
                      ec.disconnect(),
                      e.removeEventListener("pointerdown", et),
                      e.removeEventListener("pointerup", ea),
                      e.removeEventListener("pointermove", er),
                      e.removeEventListener("pointerleave", en),
                      e.removeEventListener("pointercancel", eo),
                      n.removeEventListener("visibilitychange", el),
                      l.removeEventListener("webglcontextlost", es),
                      l.removeEventListener("webglcontextrestored", ei),
                      j.remove(b),
                      y.dispose(),
                      g.dispose(),
                      r.dispose(),
                      l.remove());
                  },
                }
              );
            })(e, t, ei);
            return (
              (el.current = a),
              () => {
                (a?.destroy(), (el.current = null));
              }
            );
          }, []),
          (0, n.useImperativeHandle)(
            er,
            () => ({
              poke: (e, t, a) => el.current?.poke(e, t, a),
              replay: () => el.current?.replay(),
            }),
            [],
          ));
        let eu = t.trim().toLowerCase();
        return (0, r.jsxs)("div", {
          ref: en,
          className: (0, c.cn)("relative isolate overflow-hidden", z),
          style: {
            width: N,
            height: B,
            backgroundColor:
              "" === eu || "transparent" === eu || "auto" === eu ? void 0 : t,
            ...W,
          },
          children: [
            (0, r.jsx)("div", {
              ref: eo,
              "aria-hidden": "true",
              className: "pointer-events-none absolute inset-0",
            }),
            q
              ? (0, r.jsx)("div", {
                  className: "relative z-10 h-full w-full",
                  children: q,
                })
              : null,
          ],
        });
      });
    j.displayName = "RubberFluid";
    let L = {
        colors: ["#9D0FD9", "#FF12FF"],
        scale: 1,
        foldDepth: 1,
        gloss: 0.2,
        sheen: 0.12,
        roughness: 0.4,
        lightAngle: 135,
        contrast: 5,
        iterations: 10,
        rotationRate: 2,
        warpPower: 1.5,
        seedFactor: 1,
      },
      S = {
        classic: L,
        latex: {
          ...L,
          colors: ["#5227FF", "#FF9FFC"],
          foldDepth: 1.5,
          gloss: 0.6,
          sheen: 0.5,
          roughness: 0.35,
        },
        candy: {
          ...L,
          colors: ["#FF1F7A", "#FF9AD5"],
          foldDepth: 1.4,
          gloss: 0.8,
          sheen: 0.5,
          roughness: 0.22,
          contrast: 4,
          iterations: 8,
          warpPower: 1.2,
        },
        chrome: {
          ...L,
          colors: ["#17171C", "#D9DCE6"],
          foldDepth: 1.8,
          gloss: 1.2,
          sheen: 0.9,
          roughness: 0.16,
          lightAngle: 120,
          seedFactor: 0.7,
        },
        ocean: {
          ...L,
          colors: ["#0A3BFF", "#55E0FF"],
          foldDepth: 1.2,
          gloss: 0.5,
          sheen: 0.3,
          roughness: 0.3,
          lightAngle: 100,
          rotationRate: 2.6,
          warpPower: 1.1,
        },
        ember: {
          ...L,
          colors: ["#B3122E", "#FF7A27"],
          foldDepth: 1.2,
          gloss: 0.4,
          sheen: 0.4,
          roughness: 0.38,
          lightAngle: 200,
          contrast: 6,
          iterations: 9,
        },
        jade: {
          ...L,
          colors: ["#04745F", "#7DF2C6"],
          scale: 1.2,
          foldDepth: 1.3,
          gloss: 0.5,
          sheen: 0.3,
          roughness: 0.3,
          seedFactor: 0.6,
        },
        noir: {
          ...L,
          colors: ["#1B1033", "#8B5CF6"],
          foldDepth: 1.2,
          gloss: 0.35,
          sheen: 0.25,
          roughness: 0.3,
          contrast: 6,
        },
      },
      k = [
        { label: "Classic", value: "classic" },
        { label: "Latex", value: "latex" },
        { label: "Candy", value: "candy" },
        { label: "Chrome", value: "chrome" },
        { label: "Ocean", value: "ocean" },
        { label: "Ember", value: "ember" },
        { label: "Jade", value: "jade" },
        { label: "Noir", value: "noir" },
      ],
      F = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#9D0FD9", "#FF12FF"]',
          description:
            "The two colours of the folds, blended in OKLCh. The first tints their edges and shadowed sides, the second their glowing crests. On light backgrounds they become deeper, matching tones.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Colour behind the rubber. The valleys sink into it. Transparent shows the page behind and reads its colour to pick a light or dark rendering.",
        },
        {
          name: "speed",
          type: "number",
          default: "1",
          description: "Speed of the slow drift of the folds.",
        },
        {
          name: "scale",
          type: "number",
          default: "1",
          description: "Size of the folds. Larger values give broader folds.",
        },
        {
          name: "foldDepth",
          type: "number",
          default: "1",
          description:
            "Relief of the folds under the studio light. Zero gives a flat glow.",
        },
        {
          name: "gloss",
          type: "number",
          default: "0.2",
          description: "Strength of the reflection of the studio light.",
        },
        {
          name: "sheen",
          type: "number",
          default: "0.12",
          description:
            "Strength of the soft rim light on the far sides of the folds.",
        },
        {
          name: "roughness",
          type: "number",
          default: "0.4",
          description:
            "Blur of the highlights. Low values give crisp latex, high values soft satin.",
        },
        {
          name: "lightAngle",
          type: "number",
          default: "135",
          description:
            "Direction of the studio light in degrees (0 is right, 90 is up).",
        },
        {
          name: "contrast",
          type: "number",
          default: "5",
          description:
            "How sharply the folds rise from the background. Higher values leave more of the frame in shadow.",
        },
        {
          name: "waveStrength",
          type: "number",
          default: "1",
          description:
            "Strength of the wave a click or tap sends through the rubber, from 0 to 3.",
        },
        {
          name: "iterations",
          type: "number",
          default: "10",
          description:
            "Layers of folding. Fewer layers give broad, calm folds. More add fine creases.",
        },
        {
          name: "rotationRate",
          type: "number",
          default: "2",
          description:
            "How much each layer of folds turns, which sets the swirl.",
        },
        {
          name: "warpPower",
          type: "number",
          default: "1.5",
          description:
            "How far the rubber is stretched. Low values give soft, wide flows.",
        },
        {
          name: "seedFactor",
          type: "number",
          default: "1",
          description:
            "Varies the pattern of folds. Values from 0.3 to 1.5 work best.",
        },
        {
          name: "opacity",
          type: "number",
          default: "1",
          description: "Overall opacity of the rubber.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Click or tap to send a wave through the rubber. Waves stack. Hovering tightens the surface slightly, so the sheen sharpens.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "The folds spring up and settle when the component appears.",
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
          description: "Width of the root element.",
        },
        {
          name: "height",
          type: "string | number",
          default: '"100%"',
          description: "Height of the root element.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "undefined",
          description:
            "Content laid over the rubber. Clicks on its links and buttons never send waves.",
        },
        {
          name: "ref",
          type: "{ poke, replay }",
          default: "undefined",
          description:
            "poke(x?, y?, strength?) sends a wave from a point (0 to 1 across the component), replay() plays the intro again.",
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
      M = () => {
        let [e, t] = (0, s.I)(),
          a = (0, l.Y)(),
          [i, u] = (0, n.useState)("classic"),
          [c, h] = (0, n.useState)(S.classic),
          d = (e) => (t) => h((a) => ({ ...a, [e]: t })),
          [f, p] = (0, n.useState)(null),
          m = f ?? ("dark" === a ? "#0a0a0a" : "#ffffff"),
          [v, g] = (0, n.useState)(1),
          [x, w] = (0, n.useState)(1),
          [y, b] = (0, n.useState)(1),
          [C, P] = (0, n.useState)(!0),
          [L, M] = (0, n.useState)(!0),
          [R, D] = (0, n.useState)(!1);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(o.Bg, {}),
            (0, r.jsxs)(o.VX, {
              children: [
                (0, r.jsxs)(o.Ec, {
                  children: [
                    (0, r.jsx)(o.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          j,
                          {
                            ...c,
                            backgroundColor: m,
                            speed: v,
                            waveStrength: x,
                            opacity: y,
                            interactive: C,
                            intro: L,
                            paused: R,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(o.IH, {
                      children: [
                        (0, r.jsx)(o.bg, {
                          title: "Preset",
                          value: i,
                          options: k,
                          onChange: (e) => {
                            (u(e), h(S[e] ?? S.classic));
                          },
                        }),
                        (0, r.jsx)(o.W7, {
                          title: "First Color",
                          value: c.colors[0],
                          onChange: (e) =>
                            h((t) => ({ ...t, colors: [e, t.colors[1]] })),
                        }),
                        (0, r.jsx)(o.W7, {
                          title: "Second Color",
                          value: c.colors[1],
                          onChange: (e) =>
                            h((t) => ({ ...t, colors: [t.colors[0], e] })),
                        }),
                        (0, r.jsx)(o.W7, {
                          title: "Background",
                          value: m,
                          onChange: p,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Speed",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: v,
                          onChange: g,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Scale",
                          min: 0.8,
                          max: 2.5,
                          step: 0.01,
                          value: c.scale,
                          onChange: d("scale"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Fold Depth",
                          min: 0,
                          max: 2.5,
                          step: 0.01,
                          value: c.foldDepth,
                          onChange: d("foldDepth"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Gloss",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.gloss,
                          onChange: d("gloss"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Sheen",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.sheen,
                          onChange: d("sheen"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Roughness",
                          min: 0.05,
                          max: 0.8,
                          step: 0.01,
                          value: c.roughness,
                          onChange: d("roughness"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Light Angle",
                          min: 0,
                          max: 360,
                          step: 1,
                          value: c.lightAngle,
                          valueUnit: "\xb0",
                          onChange: d("lightAngle"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Contrast",
                          min: 2,
                          max: 12,
                          step: 0.1,
                          value: c.contrast,
                          onChange: d("contrast"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Iterations",
                          min: 4,
                          max: 14,
                          step: 1,
                          value: c.iterations,
                          onChange: d("iterations"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Rotation Rate",
                          min: 0.5,
                          max: 4,
                          step: 0.01,
                          value: c.rotationRate,
                          onChange: d("rotationRate"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Warp Power",
                          min: 0.6,
                          max: 2.4,
                          step: 0.01,
                          value: c.warpPower,
                          onChange: d("warpPower"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Seed Factor",
                          min: 0.3,
                          max: 1.5,
                          step: 0.01,
                          value: c.seedFactor,
                          onChange: d("seedFactor"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Wave Strength",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: x,
                          onChange: w,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: y,
                          onChange: b,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Interactive",
                          checked: C,
                          onChange: P,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Intro",
                          checked: L,
                          onChange: M,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Paused",
                          checked: R,
                          onChange: D,
                        }),
                      ],
                    }),
                    (0, r.jsx)(o.Ub, { data: F }),
                  ],
                }),
                (0, r.jsx)(o.lT, { children: (0, r.jsx)(o.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
