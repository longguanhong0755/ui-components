/* ReactBits Pro public preview module 1606 for halftone-vortex.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/1606.bd764f0c9aacd7f8.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  1606: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => I }));
    var n = a(95155),
      l = a(12115),
      r = a(56388),
      o = a(86049),
      i = a(90761),
      s = a(12246),
      u = a(2253),
      d = a(90650);
    let p = 2 * Math.PI,
      c = [0.04, 0.04, 0.04],
      f = [1, 1, 1],
      h = [0.322, 0.153, 1, 1],
      m = [1, 0.624, 0.988, 1],
      v = (e, t, a) => Math.min(a, Math.max(t, e)),
      g = (e, t) => (Number.isFinite(e) ? e : t),
      y = (e, t, a) => {
        let n = v((a - e) / (t - e), 0, 1);
        return n * n * (3 - 2 * n);
      },
      x = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      b = ([e, t, a]) => {
        let n = x(e),
          l = x(t),
          r = x(a),
          o = Math.cbrt(0.4122214708 * n + 0.5363325363 * l + 0.0514459929 * r),
          i = Math.cbrt(0.2119034982 * n + 0.6806995451 * l + 0.1073969566 * r),
          s = Math.cbrt(0.0883024619 * n + 0.2817188376 * l + 0.6299787005 * r),
          u = 1.9779984951 * o - 2.428592205 * i + 0.4505937099 * s,
          d = 0.0259040371 * o + 0.7827717662 * i - 0.808675766 * s;
        return [
          0.2104542553 * o + 0.793617785 * i - 0.0040720468 * s,
          Math.hypot(u, d),
          Math.atan2(d, u),
        ];
      },
      w = (e, t, a) => {
        let n = t * Math.cos(a),
          l = t * Math.sin(a),
          r = Math.pow(e + 0.3963377774 * n + 0.2158037573 * l, 3),
          o = Math.pow(e - 0.1055613458 * n - 0.0638541728 * l, 3),
          i = Math.pow(e - 0.0894841775 * n - 1.291485548 * l, 3);
        return [
          4.0767416621 * r - 3.3077115913 * o + 0.2309699292 * i,
          -1.2684380046 * r + 2.6097574011 * o - 0.3413193965 * i,
          -0.0041960863 * r - 0.7034186147 * o + 1.707614701 * i,
        ].every((e) => e >= -5e-4 && e <= 1.0005);
      },
      S = ([e, t, a]) => {
        let n = Math.min(e, 0.24 + 0.44 * y(0.03, 0.12, t));
        return (([e, t, a]) => {
          if (w(e, t, a)) return [e, t, a];
          let n = 0,
            l = t;
          for (let t = 0; t < 18; t++) {
            let t = (n + l) / 2;
            w(e, t, a) ? (n = t) : (l = t);
          }
          return [e, n, a];
        })([n, t * (1 + (e - n) * 2.4), a]);
      },
      C = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      P = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      W = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      M = `
precision highp float;

uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uTime;
uniform float uZoom;
uniform float uDensity;
uniform float uGridScale;
uniform float uSpiral;
uniform float uRadialWave;
uniform float uAngularWave;
uniform float uPatternDepth;
uniform float uFieldOffset;
uniform float uCutoff;
uniform float uMono;
uniform float uSoft;
uniform float uShift;
uniform float uSwell;
uniform float uPulseWidth;
uniform float uReach;
uniform float uDepth;
uniform float uGlow;
uniform float uLight;
uniform vec3 uInkA;
uniform vec3 uInkB;
uniform vec3 uPage;
uniform vec3 uPaper;
uniform float uPaperAlpha;
uniform float uAlpha;
uniform vec4 uPulses[8];

varying vec2 vUv;

const float TWO_PI = 6.2831853;

float dots(vec2 p, float ang) {
  float invLen = 1.0 / sqrt(ang * ang + (1.0 - ang) * (1.0 - ang));
  float ru = (p.x * ang - p.y * (1.0 - ang)) * invLen;
  float rv = (p.x * (1.0 - ang) + p.y * ang) * invLen;
  ru = fract(ru * uDensity) - 0.5;
  rv = fract(rv * uDensity) - 0.5;
  return 1.7 - sqrt(ru * ru + rv * rv) * 4.0;
}

float cover(float value) {
  float edge = max(fwidth(value), 0.0001) * (1.0 + uSoft);
  return clamp(0.5 - value / edge, 0.0, 1.0);
}

float swell(float dist, float ang) {
  float total = 0.0;
  for (int i = 0; i < 8; i++) {
    vec4 pulse = uPulses[i];
    if (pulse.z <= 0.0) continue;
    float x = (dist - pulse.x) / uPulseWidth;
    float radial = exp(-x * x * (x < 0.0 ? 2.5 : 0.7));
    float arc = exp((cos((ang - pulse.y) * TWO_PI) - 1.0) * pulse.w);
    total += pulse.z * radial * arc;
  }
  return 1.0 - exp(-total);
}

vec3 encode(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 shade(vec3 lch) {
  vec3 lab = vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  vec3 lin = mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * (lms * lms * lms);
  float grey = lch.x * lch.x * lch.x;
  vec3 drift = lin - grey;
  vec3 room = mix(grey / max(-drift, 0.000001), (1.0 - grey) / max(drift, 0.000001), step(0.0, drift));
  lin = grey + drift * clamp(min(room.x, min(room.y, room.z)), 0.0, 1.0);
  return encode(clamp(lin, 0.0, 1.0));
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 st = (vUv - uCenter) * vec2(aspect, 1.0) * uZoom;
  float t = uTime;
  float dist = length(st);
  float ang = (dist > 0.000001 ? atan(st.x, st.y) : 0.0) / TWO_PI + sin(dist + t) * uSpiral;
  float surge = swell(dist, ang);
  float lift = uShift - uSwell * surge;
  float near = dist / uReach;
  vec2 grid = st * uGridScale * (1.0 + uDepth * 0.9 * exp(-near * 3.0));

  float rWaveR = sin(dist * TWO_PI + t * 4.0) * uRadialWave;
  float aWaveR = sin(ang * TWO_PI * 11.0 + t * 4.0) * uAngularWave;
  float patR = sin(ang * TWO_PI * 6.0 + t) * uPatternDepth;
  float bodyR = dist - rWaveR + patR + uFieldOffset + lift;
  float fieldR = bodyR - aWaveR;
  vec3 ink = vec3(cover(fieldR + dots(grid, 0.12) - uCutoff));

  if (uMono < 0.5) {
    float rWaveG = sin(dist * TWO_PI * 1.5 + t * 5.0) * uRadialWave;
    float aWaveG = sin(ang * TWO_PI * 13.0 + t * 5.0) * uAngularWave;
    float patG = sin(ang * TWO_PI * 4.0 - t) * uPatternDepth;
    float fieldG = dist - rWaveG - aWaveG - patG + uFieldOffset + lift;
    ink.g = cover(fieldG + dots(grid, 0.34) - uCutoff);

    float rWaveB = sin(dist * TWO_PI + t * 8.0) * uRadialWave;
    float aWaveB = sin(ang * TWO_PI * 12.0 + t * 6.0) * uAngularWave;
    float patB = sin(ang * TWO_PI * 5.0) * uPatternDepth;
    float fieldB = dist - rWaveB - aWaveB - patB + uFieldOffset + lift;
    ink.b = cover(fieldB + dots(grid, 0.69) - uCutoff);
  }

  float edge = bodyR - uCutoff + 0.1;
  float rest = edge - lift;
  float hole = clamp((1.7 - uCutoff + fieldR) * 0.25, 0.0, 1.0);
  float density = clamp(1.0 - 3.14159 * hole * hole, 0.0, 1.0);
  float depthLight = 1.0 - uDepth * mix(0.6, 0.35, uLight) * exp(-near * near * 14.0);
  vec3 lch = mix(uInkA, uInkB, smoothstep(-1.9, -0.55, rest) * smoothstep(0.0, 0.3, near + 0.15));
  float lit = lch.x * depthLight * (1.0 + (1.0 - uLight) * (0.12 * density - 0.05)) * (1.0 + surge * mix(0.16, -0.1, uLight));
  float lightness = lit < 0.8 ? lit : 0.8 + 0.16 * (1.0 - exp(-(lit - 0.8) / 0.16));
  float chroma = lch.y * (1.0 - 0.5 * smoothstep(0.84, 0.96, lightness)) * (1.0 + 0.3 * (1.0 - depthLight));
  float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float dither = (noise - 0.5) / 255.0;
  vec3 paint = clamp(shade(vec3(lightness, chroma, lch.z)) + dither, 0.0, 1.0);
  vec3 aura = clamp(shade(vec3(lightness * 0.86, chroma * 1.3, lch.z)) + dither, 0.0, 1.0);

  float inside = 1.0 - smoothstep(-0.3, 0.7, edge);
  float band = smoothstep(-0.3, 0.7, edge) * exp(-max(edge - 0.7, 0.0) / 0.45) * (1.0 - smoothstep(0.7, 2.6, edge));
  float glow = clamp((uGlow * (0.08 * inside + 0.2 * band) * depthLight * depthLight + 0.1 * surge * (1.0 - inside)) * mix(1.0, 0.45, uLight), 0.0, 1.0);

  vec3 under = mix(uPage, uPaper, uPaperAlpha);
  vec3 lifted = mix(under, aura, glow);
  vec3 seen = mix(lifted, paint, ink);
  float top = max(ink.r, max(ink.g, ink.b));
  float alpha = uPaperAlpha + (1.0 - uPaperAlpha) * (1.0 - (1.0 - top) * (1.0 - glow));
  vec3 color = alpha > 0.0001 ? (seen - uPage * (1.0 - alpha)) / alpha : paint;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), alpha * uAlpha);
}
`,
      k = (0, l.forwardRef)(function (
        {
          width: e = "100%",
          height: t = "100%",
          className: a,
          style: r,
          children: o,
          colors: i,
          color: x = "transparent",
          backgroundColor: w,
          speed: k = 0.4,
          zoom: F = 2.5,
          dotDensity: R = 2e-4,
          gridScale: j = 150,
          spiralStrength: D = 0.2,
          radialWave: I = 0.1,
          angularWave: E = 0.4,
          patternDepth: L = 0.75,
          fieldOffset: O = -0.6,
          threshold: T = 0.5,
          monochrome: A = !0,
          depth: z = 0.6,
          glow: B = 0.5,
          softness: G = 0,
          offsetX: _ = 0,
          offsetY: H = 0,
          opacity: N = 1,
          interactive: X = !0,
          hoverSpeed: Y = 1.6,
          pulseStrength: q = 1,
          dampening: U = 0.301,
          intro: Z = !0,
          paused: V = !1,
          dpr: K = 2,
        },
        Q,
      ) {
        let J = (0, l.useRef)(null),
          $ = (0, l.useRef)(null),
          ee = (0, l.useRef)(null),
          et = {
            colors: i,
            color: x,
            backgroundColor: w,
            speed: k,
            zoom: F,
            dotDensity: R,
            gridScale: j,
            spiralStrength: D,
            radialWave: I,
            angularWave: E,
            patternDepth: L,
            fieldOffset: O,
            threshold: T,
            monochrome: A,
            depth: z,
            glow: B,
            softness: G,
            offsetX: _,
            offsetY: H,
            opacity: N,
            interactive: X,
            hoverSpeed: Y,
            pulseStrength: q,
            dampening: U,
            intro: Z,
            paused: V,
            dpr: K,
            reduced: (0, l.useSyncExternalStore)(C, P, () => !1),
          },
          ea = (0, l.useRef)(et);
        return (
          (0, l.useEffect)(() => {
            ((ea.current = et), ee.current?.sync());
          }),
          (0, l.useEffect)(() => {
            let e = J.current,
              t = $.current;
            if (!e || !t) return;
            let a = (function (e, t, a) {
              let n,
                l = e.ownerDocument,
                r = l.defaultView ?? window,
                o = l.createElement("canvas");
              (o.setAttribute("aria-hidden", "true"),
                (o.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block"));
              try {
                n = new s.WebGLRenderer({
                  canvas: o,
                  alpha: !0,
                  premultipliedAlpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (n.setClearColor(0, 0), t.appendChild(o));
              let i = l.createElement("canvas");
              ((i.width = 1), (i.height = 1));
              let d = i.getContext("2d", { willReadFrequently: !0 }),
                x = Array.from({ length: 8 }, () => new u.IUQ()),
                w = {
                  uRes: { value: new u.I9Y(1, 1) },
                  uCenter: { value: new u.I9Y(0.5, 0.5) },
                  uTime: { value: 0 },
                  uZoom: { value: 2.5 },
                  uDensity: { value: 0.15 },
                  uGridScale: { value: 150 },
                  uSpiral: { value: 0.2 },
                  uRadialWave: { value: 0.1 },
                  uAngularWave: { value: 0.4 },
                  uPatternDepth: { value: 0.75 },
                  uFieldOffset: { value: -0.6 },
                  uCutoff: { value: 0.5 },
                  uMono: { value: 1 },
                  uSoft: { value: 0 },
                  uShift: { value: 0 },
                  uSwell: { value: 1.2 },
                  uPulseWidth: { value: 0.2 },
                  uReach: { value: 2.2 },
                  uDepth: { value: 0.6 },
                  uGlow: { value: 0.5 },
                  uLight: { value: 0 },
                  uInkA: { value: new u.Pq0() },
                  uInkB: { value: new u.Pq0() },
                  uPage: { value: new u.Pq0() },
                  uPaper: { value: new u.Pq0() },
                  uPaperAlpha: { value: 0 },
                  uAlpha: { value: 1 },
                  uPulses: { value: x },
                },
                C = new u.BKk({
                  vertexShader: W,
                  fragmentShader: M,
                  uniforms: w,
                  transparent: !1,
                  blending: u.XIg,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                P = new u.bdM(2, 2),
                k = new u.eaF(P, C);
              k.frustumCulled = !1;
              let F = new u.Z58();
              F.add(k);
              let R = new u.qUd(-1, 1, 1, -1, 0, 1),
                j = 0,
                D = 0,
                I = !1,
                E = "",
                L = -1 / 0,
                O = 2.2 * !!a.current.reduced,
                T = 0,
                A = 0,
                z = 0,
                B = 0,
                G = -1,
                _ = 1,
                H = 1,
                N = 0,
                X = 0,
                Y = !1,
                q = !1,
                U = !1,
                Z = null,
                V = [],
                K = (e) => {
                  let t = (e ?? "").trim(),
                    a = t.toLowerCase();
                  if (
                    !d ||
                    !t ||
                    "transparent" === a ||
                    "none" === a ||
                    "auto" === a
                  )
                    return null;
                  d.fillStyle = "#010203";
                  let n = d.fillStyle;
                  if (((d.fillStyle = t), d.fillStyle === n && "#010203" !== a))
                    return null;
                  (d.clearRect(0, 0, 1, 1), d.fillRect(0, 0, 1, 1));
                  let l = d.getImageData(0, 0, 1, 1).data;
                  return 0 === l[3]
                    ? null
                    : [l[0] / 255, l[1] / 255, l[2] / 255, l[3] / 255];
                },
                Q = () => {
                  let t = a.current,
                    l = Math.round(e.clientWidth),
                    o = Math.round(e.clientHeight);
                  if (l < 2 || o < 2) return ((I = !1), !1);
                  let i = Math.min(
                    r.devicePixelRatio || 1,
                    v(g(t.dpr, 2), 0.5, 3),
                  );
                  return (
                    (!I || l !== j || o !== D || n.getPixelRatio() !== i) &&
                    ((I = !0),
                    (j = l),
                    (D = o),
                    n.setPixelRatio(i),
                    n.setSize(j, D, !1),
                    w.uRes.value.set(j, D),
                    !0)
                  );
                },
                J = () => {
                  let e = a.current;
                  return {
                    x: 0.5 + 0.5 * v(g(e.offsetX, 0), -1, 1),
                    y: 0.5 - 0.5 * v(g(e.offsetY, 0), -1, 1),
                  };
                },
                $ = () => {
                  if (!I) return;
                  let t = a.current,
                    l = performance.now();
                  l - L > 1e3 &&
                    ((L = l),
                    (() => {
                      let t = a.current,
                        n = K(t.color),
                        l =
                          n && n[3] > 0.999
                            ? c
                            : (() => {
                                let t = e.parentElement;
                                for (; t;) {
                                  let e = K(
                                    r.getComputedStyle(t).backgroundColor,
                                  );
                                  if (e && e[3] > 0.05)
                                    return [e[0], e[1], e[2]];
                                  t = t.parentElement;
                                }
                                let a = K(r.getComputedStyle(e).color);
                                return a
                                  ? a[0] + a[1] + a[2] > 1.5
                                    ? c
                                    : f
                                  : r.matchMedia("(prefers-color-scheme: dark)")
                                        .matches
                                    ? c
                                    : f;
                              })(),
                        o = t.colors ? null : K(t.backgroundColor),
                        i =
                          (t.colors ? K(t.colors[0]) : o) ?? K("#5227FF") ?? h,
                        s =
                          (t.colors ? K(t.colors[1] ?? t.colors[0]) : o) ??
                          K("#FF9FFC") ??
                          m,
                        u = [n, l, i, s]
                          .map((e) => (e ? e.join(",") : "-"))
                          .join("|");
                      if (u === E) return;
                      E = u;
                      let d = n && n[3] > 0.5 ? [n[0], n[1], n[2]] : l,
                        p =
                          0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2] > 0.55,
                        v = b([i[0], i[1], i[2]]),
                        g = b([s[0], s[1], s[2]]);
                      (p && ((v = S(v)), (g = S(g))),
                        v[1] < 0.02 && (v[2] = g[2]),
                        g[1] < 0.02 && (g[2] = v[2]));
                      let y = Math.atan2(
                        Math.sin(g[2] - v[2]),
                        Math.cos(g[2] - v[2]),
                      );
                      (w.uInkA.value.set(v[0], v[1], v[2]),
                        w.uInkB.value.set(g[0], g[1], v[2] + y),
                        w.uPage.value.set(l[0], l[1], l[2]),
                        n
                          ? w.uPaper.value.set(n[0], n[1], n[2])
                          : w.uPaper.value.set(l[0], l[1], l[2]),
                        (w.uPaperAlpha.value = n ? n[3] : 0),
                        (w.uLight.value = +!!p));
                    })());
                  let o = v(g(t.zoom, 2.5), 0.1, 60),
                    i = v(g(t.threshold, 0.5), -3, 4),
                    s = v(g(t.fieldOffset, -0.6), -6, 6),
                    u = v(g(t.radialWave, 0.1), 0, 4),
                    d = v(g(t.angularWave, 0.4), 0, 4),
                    p = v(g(t.patternDepth, 0.75), 0, 4),
                    C = J();
                  (w.uCenter.value.set(C.x, C.y),
                    (w.uTime.value = O),
                    (w.uZoom.value = o),
                    (w.uDensity.value =
                      v(g(t.dotDensity, 2e-4), 5e-6, 0.02) * D),
                    (w.uGridScale.value = v(g(t.gridScale, 150), 0.1, 5e3)),
                    (w.uSpiral.value = v(g(t.spiralStrength, 0.2), -3, 3)),
                    (w.uRadialWave.value = u),
                    (w.uAngularWave.value = d),
                    (w.uPatternDepth.value = p),
                    (w.uFieldOffset.value = s),
                    (w.uCutoff.value = i),
                    (w.uMono.value = +!!t.monochrome),
                    (w.uDepth.value = v(g(t.depth, 0.6), 0, 1)),
                    (w.uGlow.value = v(g(t.glow, 0.5), 0, 2)),
                    (w.uSoft.value = 12 * v(g(t.softness, 0), 0, 1)),
                    (w.uShift.value =
                      (1 - _) * Math.max(i - s + u + d + p + 1.13, 0) * 0.82),
                    (w.uReach.value = Math.max(i - s + 1.13, 0.3)),
                    (w.uPulseWidth.value = 0.08 * o),
                    (w.uAlpha.value = v(g(t.opacity, 1), 0, 1)));
                  for (let e = 0; e < 8; e++) {
                    let t = V[e];
                    if (!t) {
                      x[e].set(0, 0, 0, 0);
                      continue;
                    }
                    let a = Math.max(T - t.born, 0),
                      n = v(a / t.travel, 0, 1),
                      l =
                        t.strength *
                        (1 - Math.exp(-a / 0.05)) *
                        (1 - y(0.72, 1, n));
                    x[e].set(
                      t.radius * (1 - Math.pow(n, 1.5)),
                      t.angle - 0.16 * n,
                      l,
                      9 * (1 - n) * (1 - n),
                    );
                  }
                  n.render(F, R);
                },
                ee = () => {
                  q || U || !Y || N || (N = requestAnimationFrame(et));
                },
                et = (e) => {
                  if (((N = 0), q || U)) return;
                  let t = a.current,
                    n =
                      X && e - X < 100
                        ? Math.min(Math.max((e - X) / 1e3, 0), 0.05)
                        : 1 / 60;
                  ((X = e), (T += n));
                  let r = !t.reduced && !t.paused,
                    o = !1;
                  if (G >= 0)
                    if (t.reduced) ((G = -1), (_ = 1), (H = 1));
                    else {
                      let e = T - G,
                        t = v(e / 1.8, 0, 1),
                        a = v(e / 2.6, 0, 1);
                      ((_ = 1 - Math.pow(1 - t, 1.6)),
                        (H = 1 - Math.pow(1 - a, 3)),
                        (o = t < 1 || a < 1) || (G = -1));
                    }
                  let i = r && t.interactive ? B : 0,
                    s = 2.5 / v(g(t.dampening, 0.301), 0.05, 3),
                    u = Math.exp(-s * n),
                    d = A - i,
                    p = (z + s * d) * n;
                  if (((z = (z - s * p) * u), (A = i + (d + p) * u), r)) {
                    let e = 1 + (v(g(t.hoverSpeed, 1.6), 0, 6) - 1) * A;
                    O += n * v(g(t.speed, 0.4), 0, 5) * e * H;
                  }
                  for (let e = V.length - 1; e >= 0; e--)
                    T - V[e].born >= V[e].travel && V.splice(e, 1);
                  $();
                  let c = Math.abs(A - i) > 5e-4 || Math.abs(z) > 5e-4;
                  (r || c || o || V.length > 0) && !l.hidden
                    ? (N = requestAnimationFrame(et))
                    : (X = 0);
                },
                ea = (e, t, n) => {
                  if (!I) return;
                  let l = a.current,
                    r = v(g(l.zoom, 2.5), 0.1, 60),
                    o = J(),
                    i = (e - o.x) * (j / D) * r,
                    s = (1 - t - o.y) * r,
                    u = Math.hypot(i, s),
                    d =
                      (u > 1e-6 ? Math.atan2(i, s) : 0) / p +
                      Math.sin(u + O) * v(g(l.spiralStrength, 0.2), -3, 3);
                  (V.length >= 8 && V.shift(),
                    V.push({
                      radius: u,
                      angle: d,
                      born: T,
                      travel: v(0.55 + (u / r) * 1.1, 0.6, 2.6),
                      strength: n,
                    }),
                    ee());
                },
                en = (t) => {
                  let n = a.current;
                  if (!n.interactive || n.reduced || n.paused) return;
                  let l = e.getBoundingClientRect();
                  l.width <= 0 ||
                    l.height <= 0 ||
                    ea(
                      (t.clientX - l.left) / l.width,
                      (t.clientY - l.top) / l.height,
                      v(g(n.pulseStrength, 1), 0, 3),
                    );
                },
                el = (e) => {
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
                      0 === e.button && en(e);
                      return;
                    }
                    Z = {
                      id: e.pointerId,
                      x: e.clientX,
                      y: e.clientY,
                      time: performance.now(),
                    };
                  }
                },
                er = (e) => {
                  let t = Z;
                  ((Z = null),
                    !t ||
                      t.id !== e.pointerId ||
                      Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10 ||
                      performance.now() - t.time > 600 ||
                      en(e));
                },
                eo = (e) => {
                  "touch" !== e.pointerType && 1 !== B && ((B = 1), ee());
                },
                ei = (e) => {
                  "touch" !== e.pointerType && ((B = 0), ee());
                },
                es = () => {
                  Z = null;
                },
                eu = () => {
                  ((X = 0), ee());
                },
                ed = (e) => {
                  (e.preventDefault(),
                    (U = !0),
                    cancelAnimationFrame(N),
                    (N = 0));
                },
                ep = () => {
                  ((U = !1), (E = ""), (L = -1 / 0), $(), ee());
                },
                ec = new ResizeObserver(() => {
                  Q() && ($(), ee());
                }),
                ef = new IntersectionObserver(
                  ([e]) => {
                    ((Y = e.isIntersecting), (X = 0), ee());
                  },
                  { rootMargin: "120px" },
                );
              return (
                e.addEventListener("pointerdown", el),
                e.addEventListener("pointerup", er),
                e.addEventListener("pointermove", eo),
                e.addEventListener("pointerleave", ei),
                e.addEventListener("pointercancel", es),
                l.addEventListener("visibilitychange", eu),
                o.addEventListener("webglcontextlost", ed),
                o.addEventListener("webglcontextrestored", ep),
                ec.observe(e),
                ef.observe(e),
                a.current.intro &&
                  !a.current.reduced &&
                  ((G = 0), (_ = 0), (H = 0)),
                Q(),
                {
                  sync: () => {
                    ((L = -1 / 0), Q(), (X = 0), !N && Y && ($(), ee()));
                  },
                  pulse: (e, t, n) => {
                    let l = a.current;
                    if (l.reduced || l.paused || !I) return;
                    let r = J(),
                      o = Math.random() * p,
                      i = j / D;
                    ea(
                      void 0 === e
                        ? r.x + (0.42 * Math.sin(o)) / i
                        : v(g(e, 0.5), 0, 1),
                      void 0 === t
                        ? 1 - r.y - 0.42 * Math.cos(o)
                        : v(g(t, 0.5), 0, 1),
                      v(g(n ?? l.pulseStrength, 1), 0, 3),
                    );
                  },
                  replay: () => {
                    a.current.reduced ||
                      ((G = T), (_ = 0), (H = 0), (X = 0), ee());
                  },
                  destroy: () => {
                    ((q = !0),
                      cancelAnimationFrame(N),
                      ec.disconnect(),
                      ef.disconnect(),
                      e.removeEventListener("pointerdown", el),
                      e.removeEventListener("pointerup", er),
                      e.removeEventListener("pointermove", eo),
                      e.removeEventListener("pointerleave", ei),
                      e.removeEventListener("pointercancel", es),
                      l.removeEventListener("visibilitychange", eu),
                      o.removeEventListener("webglcontextlost", ed),
                      o.removeEventListener("webglcontextrestored", ep),
                      F.remove(k),
                      P.dispose(),
                      C.dispose(),
                      n.dispose(),
                      o.remove());
                  },
                }
              );
            })(e, t, ea);
            return (
              (ee.current = a),
              () => {
                (a?.destroy(), (ee.current = null));
              }
            );
          }, []),
          (0, l.useImperativeHandle)(
            Q,
            () => ({
              pulse: (e, t, a) => ee.current?.pulse(e, t, a),
              replay: () => ee.current?.replay(),
            }),
            [],
          ),
          (0, n.jsxs)("div", {
            ref: J,
            className: (0, d.cn)("relative overflow-hidden", a),
            style: { width: e, height: t, ...r },
            children: [
              (0, n.jsx)("div", {
                ref: $,
                "aria-hidden": "true",
                className: "pointer-events-none absolute inset-0",
              }),
              o
                ? (0, n.jsx)("div", { className: "relative z-1", children: o })
                : null,
            ],
          })
        );
      });
    k.displayName = "HalftoneVortex";
    let F = {
        colors: ["#5227FF", "#FF9FFC"],
        speed: 0.4,
        zoom: 2.5,
        dotDensity: 2e-4,
        threshold: 0.5,
        spiralStrength: 0.2,
        radialWave: 0.1,
        angularWave: 0.4,
        patternDepth: 0.75,
        fieldOffset: -0.6,
        depth: 0.6,
        glow: 0.5,
        offsetX: 0,
        offsetY: 0,
      },
      R = {
        classic: F,
        riptide: {
          ...F,
          speed: 0.45,
          zoom: 2.8,
          spiralStrength: 0.55,
          angularWave: 0.25,
          patternDepth: 1,
        },
        ember: { ...F, colors: ["#8B5CF6", "#FF7A27"], glow: 0.6 },
        lagoon: {
          ...F,
          colors: ["#5227FF", "#22D3EE"],
          speed: 0.35,
          glow: 0.6,
        },
        ultraviolet: {
          ...F,
          colors: ["#5227FF", "#8B5CF6"],
          dotDensity: 24e-5,
          spiralStrength: 0.3,
          depth: 0.75,
          glow: 0.7,
        },
        orchid: {
          ...F,
          colors: ["#B19EEF", "#FF9FFC"],
          speed: 0.3,
          zoom: 2.2,
          radialWave: 0.06,
          angularWave: 0.2,
          patternDepth: 0.6,
          depth: 0.5,
          glow: 0.7,
        },
        horizon: {
          ...F,
          speed: 0.25,
          zoom: 2,
          angularWave: 0.3,
          glow: 0.4,
          offsetX: 0.6,
        },
        silk: {
          ...F,
          speed: 0.3,
          dotDensity: 34e-5,
          radialWave: 0.05,
          glow: 0.6,
        },
      },
      j = [
        { label: "Classic", value: "classic" },
        { label: "Riptide", value: "riptide" },
        { label: "Ember", value: "ember" },
        { label: "Lagoon", value: "lagoon" },
        { label: "Ultraviolet", value: "ultraviolet" },
        { label: "Orchid", value: "orchid" },
        { label: "Horizon", value: "horizon" },
        { label: "Silk", value: "silk" },
      ],
      D = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#5227FF", "#FF9FFC"]',
          description: "Ink colours from the eye to the rim, blended in OKLCh.",
        },
        {
          name: "color",
          type: "string",
          default: '"transparent"',
          description:
            "Colour around the dots. Transparent shows the page. On light colours the ink turns deeper.",
        },
        {
          name: "speed",
          type: "number",
          default: "0.4",
          description: "Spin speed of the vortex.",
        },
        {
          name: "zoom",
          type: "number",
          default: "2.5",
          description: "Scale of the field. Higher values zoom out.",
        },
        {
          name: "dotDensity",
          type: "number",
          default: "0.0002",
          description:
            "Density of the halftone grid. Higher values give smaller dots.",
        },
        {
          name: "gridScale",
          type: "number",
          default: "150",
          description: "Second multiplier on the halftone grid.",
        },
        {
          name: "threshold",
          type: "number",
          default: "0.5",
          description: "Ink cutoff. Higher values print more ink.",
        },
        {
          name: "spiralStrength",
          type: "number",
          default: "0.2",
          description: "How strongly the arms twist.",
        },
        {
          name: "radialWave",
          type: "number",
          default: "0.1",
          description: "Ripples travelling toward the eye.",
        },
        {
          name: "angularWave",
          type: "number",
          default: "0.4",
          description: "Fine ripples around the arms.",
        },
        {
          name: "patternDepth",
          type: "number",
          default: "0.75",
          description: "Depth of the main spiral arms.",
        },
        {
          name: "fieldOffset",
          type: "number",
          default: "-0.6",
          description: "Size of the vortex. Lower values make it larger.",
        },
        {
          name: "depth",
          type: "number",
          default: "0.6",
          description: "Dots shrink and darken toward the eye.",
        },
        {
          name: "glow",
          type: "number",
          default: "0.5",
          description: "Soft light around the brightest arms.",
        },
        {
          name: "softness",
          type: "number",
          default: "0",
          description: "Softens the dot edges.",
        },
        {
          name: "monochrome",
          type: "boolean",
          default: "true",
          description: "One ink. Off prints three offset colour plates.",
        },
        {
          name: "offsetX",
          type: "number",
          default: "0",
          description: "Horizontal position of the eye, from -1 to 1.",
        },
        {
          name: "offsetY",
          type: "number",
          default: "0",
          description: "Vertical position of the eye, from -1 to 1.",
        },
        {
          name: "opacity",
          type: "number",
          default: "1",
          description: "Overall opacity.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Click to send a pulse down the vortex. Pulses stack. Hover quickens the spin.",
        },
        {
          name: "hoverSpeed",
          type: "number",
          default: "1.6",
          description: "Spin multiplier while the pointer is over the vortex.",
        },
        {
          name: "pulseStrength",
          type: "number",
          default: "1",
          description: "How far a click pulse swells the dots.",
        },
        {
          name: "dampening",
          type: "number",
          default: "0.301",
          description: "Smoothing time of the hover speed change, in seconds.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "The vortex develops from the eye and spins up from still.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops the motion. Reduced motion users get a still frame.",
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
          name: "ref",
          type: "{ pulse, replay }",
          default: "-",
          description:
            "pulse(x?, y?, strength?) sends a pulse from a point in 0 to 1 coordinates. replay() restarts the intro.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "-",
          description: "Content rendered above the effect.",
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
      I = () => {
        let [e, t] = (0, i.I)(),
          a = (0, o.Y)(),
          [s, u] = (0, l.useState)("classic"),
          [d, p] = (0, l.useState)(F),
          [c, f] = (0, l.useState)(null),
          [h, m] = (0, l.useState)(0),
          [v, g] = (0, l.useState)(!0),
          [y, x] = (0, l.useState)(1),
          [b, w] = (0, l.useState)(1.6),
          [S, C] = (0, l.useState)(1),
          [P, W] = (0, l.useState)(!0),
          [M, I] = (0, l.useState)(!0),
          [E, L] = (0, l.useState)(!1),
          O = c ?? ("dark" === a ? "#0a0a0a" : "#ffffff"),
          T = (e) => (t) => p((a) => ({ ...a, [e]: t }));
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(r.Bg, {}),
            (0, n.jsxs)(r.VX, {
              children: [
                (0, n.jsxs)(r.Ec, {
                  children: [
                    (0, n.jsx)(r.Ch, {
                      onRefresh: t,
                      children: (0, n.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, n.jsx)(
                          k,
                          {
                            ...d,
                            color: O,
                            softness: h,
                            monochrome: v,
                            opacity: y,
                            hoverSpeed: b,
                            pulseStrength: S,
                            interactive: P,
                            intro: M,
                            paused: E,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(r.IH, {
                      children: [
                        (0, n.jsx)(r.bg, {
                          title: "Preset",
                          value: s,
                          options: j,
                          onChange: (e) => {
                            (u(e), p(R[e] ?? F));
                          },
                        }),
                        (0, n.jsx)(r.W7, {
                          title: "Eye Color",
                          value: d.colors[0],
                          onChange: (e) => T("colors")([e, d.colors[1]]),
                        }),
                        (0, n.jsx)(r.W7, {
                          title: "Rim Color",
                          value: d.colors[1],
                          onChange: (e) => T("colors")([d.colors[0], e]),
                        }),
                        (0, n.jsx)(r.W7, {
                          title: "Background",
                          value: O,
                          onChange: f,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Speed",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: d.speed,
                          onChange: T("speed"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Zoom",
                          min: 1,
                          max: 6,
                          step: 0.05,
                          value: d.zoom,
                          onChange: T("zoom"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Dot Density",
                          min: 8e-5,
                          max: 6e-4,
                          step: 1e-5,
                          value: d.dotDensity,
                          onChange: T("dotDensity"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Threshold",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.threshold,
                          onChange: T("threshold"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Spiral",
                          min: -1,
                          max: 1,
                          step: 0.01,
                          value: d.spiralStrength,
                          onChange: T("spiralStrength"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Radial Wave",
                          min: 0,
                          max: 0.6,
                          step: 0.01,
                          value: d.radialWave,
                          onChange: T("radialWave"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Angular Wave",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: d.angularWave,
                          onChange: T("angularWave"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Pattern Depth",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: d.patternDepth,
                          onChange: T("patternDepth"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Field Offset",
                          min: -2,
                          max: 1,
                          step: 0.01,
                          value: d.fieldOffset,
                          onChange: T("fieldOffset"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Depth",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.depth,
                          onChange: T("depth"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Glow",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: d.glow,
                          onChange: T("glow"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Softness",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: h,
                          onChange: m,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Offset X",
                          min: -1,
                          max: 1,
                          step: 0.01,
                          value: d.offsetX,
                          onChange: T("offsetX"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Offset Y",
                          min: -1,
                          max: 1,
                          step: 0.01,
                          value: d.offsetY,
                          onChange: T("offsetY"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: y,
                          onChange: x,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Hover Speed",
                          min: 1,
                          max: 3,
                          step: 0.01,
                          value: b,
                          onChange: w,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Pulse Strength",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: S,
                          onChange: C,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Monochrome",
                          checked: v,
                          onChange: g,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Interactive",
                          checked: P,
                          onChange: W,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Intro",
                          checked: M,
                          onChange: I,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Paused",
                          checked: E,
                          onChange: L,
                        }),
                      ],
                    }),
                    (0, n.jsx)(r.Ub, { data: D }),
                  ],
                }),
                (0, n.jsx)(r.lT, { children: (0, n.jsx)(r.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
