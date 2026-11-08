/* ReactBits Pro public preview module 83573 for pigment-trail.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/83573.676a120d8038e994.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  83573: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => P }));
    var n = a(95155),
      l = a(12115),
      o = a(56388),
      i = a(86049),
      r = a(90761),
      s = a(2253),
      u = a(12246),
      d = a(90650);
    let c = 2 * Math.PI,
      h = 32 / 35,
      m = 1 / 240,
      p = { low: 0.5, medium: 1, high: 2 },
      f = (e, t, a) => Math.min(a, Math.max(t, e)),
      v = (e) => {
        let t = f(e, 0, 1);
        return t * t * (3 - 2 * t);
      },
      g = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      b = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      y = new Map(),
      x = (e) => {
        let t = e.trim(),
          a = y.get(t);
        if (a) return a;
        let n = [0, 0, 0, 0],
          l = t.replace("#", "");
        if (/^[0-9a-f]{3}$/i.test(l) || /^[0-9a-f]{6}$/i.test(l)) {
          let e = 3 === l.length ? l.replace(/./g, (e) => e + e) : l;
          n = [
            Number.parseInt(e.slice(0, 2), 16) / 255,
            Number.parseInt(e.slice(2, 4), 16) / 255,
            Number.parseInt(e.slice(4, 6), 16) / 255,
            1,
          ];
        } else if ("undefined" != typeof document) {
          let e = document.createElement("canvas");
          ((e.width = 1), (e.height = 1));
          let a = e.getContext("2d", { willReadFrequently: !0 });
          if (a) {
            ((a.fillStyle = "rgba(0, 0, 0, 0)"),
              (a.fillStyle = t),
              a.fillRect(0, 0, 1, 1));
            let e = a.getImageData(0, 0, 1, 1).data,
              l = e[3] / 255;
            l > 0 && (n = [e[0] / 255 / l, e[1] / 255 / l, e[2] / 255 / l, l]);
          }
        }
        return (y.set(t, n), n);
      },
      w = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      k = (e) => {
        let [t, a, n] = x(e);
        return new s.Pq0(
          -Math.log(Math.max(w(t), 0.012)),
          -Math.log(Math.max(w(a), 0.012)),
          -Math.log(Math.max(w(n), 0.012)),
        );
      },
      C = (e) => {
        let [t, a, n] = x(e),
          l = w(t),
          o = w(a),
          i = w(n),
          r = Math.cbrt(0.4122214708 * l + 0.5363325363 * o + 0.0514459929 * i),
          u = Math.cbrt(0.2119034982 * l + 0.6806995451 * o + 0.1073969566 * i),
          d = Math.cbrt(0.0883024619 * l + 0.2817188376 * o + 0.6299787005 * i);
        return new s.Pq0(
          0.2104542553 * r + 0.793617785 * u - 0.0040720468 * d,
          1.9779984951 * r - 2.428592205 * u + 0.4505937099 * d,
          0.0259040371 * r + 0.7827717662 * u - 0.808675766 * d,
        );
      },
      M = ([e, t, a]) => 0.2126 * e + 0.7152 * t + 0.0722 * a,
      F = `
attribute vec4 aSpot;
attribute vec4 aInk;
attribute vec4 aFling;
uniform vec2 uView;
uniform float uTime;
uniform float uBloom;
uniform float uBleed;
varying vec2 vOffset;
varying vec3 vReach;
varying vec4 vInk;

void main() {
  float age = uTime - aSpot.z;
  float life = aInk.z;
  if (age < 0.0 || age > life || aInk.y <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float flight = 1.0 - pow(1.0 - clamp(age / max(aFling.w, 0.001), 0.0, 1.0), 3.0);
  float open = 1.0 - pow(1.0 - clamp(age / max(uBloom, 0.01), 0.0, 1.0), 3.0);
  float fading = smoothstep(life * 0.45, life, age);
  float core = aSpot.w * 1.75 * mix(aFling.z, 1.0, open) * mix(1.0, 0.72, fading);
  float halo = core * (0.9 + uBleed * 0.62 * (1.0 - exp(-age / (0.25 + uBloom * 0.4))));
  float fade = 1.0 - fading;
  float wet = 1.0 - smoothstep(uBloom * 0.4, uBloom + 1.1, age);
  float extent = max(core * 1.6, halo);
  vec2 offset = position.xy * extent;
  vec2 point = aSpot.xy - aFling.xy * (1.0 - flight) + offset;
  gl_Position = vec4(point.x / uView.x * 2.0 - 1.0, 1.0 - point.y / uView.y * 2.0, 0.0, 1.0);
  vOffset = offset;
  vReach = vec3(core, halo, aInk.x);
  vInk = vec4(aInk.y * fade, wet, aInk.w, aInk.y * fade * fade * fade);
}
`,
      S = `
precision highp float;
varying vec2 vOffset;
varying vec3 vReach;
varying vec4 vInk;

void main() {
  float d2 = dot(vOffset, vOffset);
  if (vInk.z > 0.0) {
    float angle = atan(vOffset.y, vOffset.x);
    float phase = vInk.z * 97.0;
    float wobble = 1.0 + 0.1 * (0.55 * sin(2.0 * angle + phase) + 0.3 * sin(3.0 * angle + phase * 1.7) + 0.15 * sin(5.0 * angle + phase * 2.3));
    d2 /= wobble * wobble;
  }
  float q = d2 / (vReach.x * vReach.x);
  float body = max(1.0 - q, 0.0);
  body = body * body * body + 0.002 * max(1.0 - sqrt(q) / 1.6, 0.0);
  float spread = max(1.0 - d2 / (vReach.y * vReach.y), 0.0);
  spread = spread * spread * spread;
  float weight = vInk.x;
  gl_FragColor = vec4(
    body * weight * (1.0 - vReach.z),
    body * weight * vReach.z,
    spread * vInk.w,
    body * weight * vInk.y
  );
}
`,
      E = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      A = `
precision highp float;
uniform sampler2D uField;
uniform vec3 uAbsA;
uniform vec3 uAbsB;
uniform vec3 uLabA;
uniform vec3 uLabB;
uniform float uMode;
uniform float uStrength;
uniform float uEdge;
uniform float uRough;
uniform float uGrain;
uniform float uBleed;
uniform float uRim;
uniform float uDpr;
uniform float uSeed;
varying vec2 vUv;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec3 labToLinear(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.291485548 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  );
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec4 field = texture2D(uField, vUv);
  float core = field.r + field.g;
  vec2 css = gl_FragCoord.xy / uDpr + uSeed;
  float lobes = noise(css * 0.018) * 0.6 + noise(css * 0.045 + 7.3) * 0.4;
  float fine = noise(css * 0.16 + 3.1);
  float threshold = 1.0 + uRough * smoothstep(1.1, 2.6, core) * ((lobes - 0.5) * 1.1 + (fine - 0.5) * 0.3);
  float slope = max(length(vec2(dFdx(core), dFdy(core))), 1e-4);
  float inside = (core - threshold) / slope / uDpr;
  float cover = smoothstep(-0.6, 0.6, inside);
  float rim = exp(-max(inside, 0.0) / uRim) * cover;
  float spread = field.b;
  float veil = noise(css * 0.09 + 11.0) * 0.55 + noise(css * 0.3 + 5.0) * 0.45;
  float level = 0.22 * (1.0 + (veil - 0.5) * 1.3);
  float haloSlope = max(length(vec2(dFdx(spread), dFdy(spread))), 1e-4);
  float haloInside = (spread - level) / haloSlope / uDpr;
  float halo = smoothstep(-1.2, 1.2, haloInside) * uBleed * (1.0 - cover);
  float ratio = clamp(field.g / max(core, 1e-5), 0.0, 1.0);
  float wet = clamp(field.a / max(core, 1e-5), 0.0, 1.0);
  float grain = noise(css * 0.55) * 0.6 + noise(css * 1.3 + 9.0) * 0.4;
  float flocc = noise(css * 0.06 + 21.0);
  float texture = 1.0 + uGrain * ((grain - 0.5) * 0.7 + (flocc - 0.5) * 0.45);
  float depth = 0.62 * (1.0 + 0.28 * wet) * (0.86 + 0.28 * smoothstep(4.5, 9.0, core));
  float density = cover * (depth + uEdge * (1.0 - wet * 0.7) * rim * 1.25) + halo * 0.24;
  density *= texture * uStrength;
  float dither = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  if (uMode < 0.5) {
    vec3 transmit = exp(-density * mix(uAbsA, uAbsB, ratio));
    gl_FragColor = vec4(toSrgb(transmit) + dither, 1.0);
  } else {
    vec3 lab = mix(uLabA, uLabB, ratio);
    lab.x *= 1.0 - 0.08 * wet * cover;
    lab.x *= 1.0 - 0.18 * uEdge * (1.0 - wet * 0.7) * rim;
    lab.x *= mix(1.0, texture, 0.35);
    float alpha = cover * 0.94 * clamp(uStrength, 0.0, 1.0);
    gl_FragColor = vec4((toSrgb(labToLinear(lab)) + dither) * alpha, alpha);
  }
}
`,
      B = (0, l.forwardRef)(function (
        {
          colors: e = ["#5227FF", "#FF9FFC"],
          backgroundColor: t = "transparent",
          mode: a = "auto",
          size: o = 14,
          bloom: i = 0.9,
          bleed: r = 0.5,
          edge: y = 0.6,
          roughness: w = 0.3,
          grain: B = 0.35,
          intensity: I = 1,
          fade: L = 3.5,
          follow: j = 0.06,
          colorCycle: R = 700,
          splash: q = !0,
          autoplay: z = !0,
          autoplaySpeed: P = 1,
          idleDelay: T = 1.5,
          interactive: D = !0,
          paused: U = !1,
          quality: W = "medium",
          dpr: N = 2,
          className: O,
          style: G,
          children: _,
        },
        H,
      ) {
        let V = (0, l.useRef)(null),
          X = (0, l.useRef)(null),
          Y = (0, l.useRef)(null),
          $ = {
            colors: e,
            backgroundColor: t,
            mode: a,
            size: o,
            bloom: i,
            bleed: r,
            edge: y,
            roughness: w,
            grain: B,
            intensity: I,
            fade: L,
            follow: j,
            colorCycle: R,
            splash: q,
            autoplay: z,
            autoplaySpeed: P,
            idleDelay: T,
            interactive: D,
            paused: U,
            quality: W,
            dpr: N,
            reduced: (0, l.useSyncExternalStore)(g, b, () => !1),
          },
          K = (0, l.useRef)($);
        ((0, l.useEffect)(() => {
          ((K.current = $), Y.current?.sync());
        }),
          (0, l.useEffect)(() => {
            let e = V.current,
              t = X.current;
            if (!e || !t) return;
            let a = ((e, t, a) => {
              let n,
                l = e.ownerDocument,
                o = l.defaultView ?? window,
                i = l.createElement("canvas");
              i.style.cssText =
                "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
              try {
                n = new u.WebGLRenderer({
                  canvas: i,
                  alpha: !0,
                  antialias: !1,
                  depth: !1,
                  stencil: !1,
                  premultipliedAlpha: !0,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              if (!n.capabilities.isWebGL2) return (n.dispose(), null);
              (t.appendChild(i), (n.autoClear = !1));
              let r = new s.qUd(-1, 1, 1, -1, 0, 1),
                d = new Float32Array(16384),
                g = new Float32Array(16384),
                b = new Float32Array(16384),
                y = new s.uWO(d, 4),
                w = new s.uWO(g, 4),
                B = new s.uWO(b, 4);
              [y, w, B].forEach((e) => e.setUsage(s.Vnu));
              let I = new s.bdM(2, 2),
                L = new s.CmU();
              ((L.index = I.index),
                L.setAttribute("position", I.getAttribute("position")),
                L.setAttribute("aSpot", y),
                L.setAttribute("aInk", w),
                L.setAttribute("aFling", B),
                (L.instanceCount = 0));
              let j = new s.BKk({
                  uniforms: {
                    uView: { value: new s.I9Y(1, 1) },
                    uTime: { value: 0 },
                    uBloom: { value: 0.9 },
                    uBleed: { value: 0.5 },
                  },
                  vertexShader: F,
                  fragmentShader: S,
                  side: s.$EB,
                  depthTest: !1,
                  depthWrite: !1,
                  transparent: !0,
                  blending: s.bCz,
                  blendEquation: s.gO9,
                  blendSrc: s.qad,
                  blendDst: s.qad,
                  blendEquationAlpha: s.gO9,
                  blendSrcAlpha: s.qad,
                  blendDstAlpha: s.qad,
                }),
                R = new s.eaF(L, j);
              R.frustumCulled = !1;
              let q = new s.Z58();
              q.add(R);
              let z = new s.BKk({
                  uniforms: {
                    uField: { value: null },
                    uAbsA: { value: new s.Pq0() },
                    uAbsB: { value: new s.Pq0() },
                    uLabA: { value: new s.Pq0() },
                    uLabB: { value: new s.Pq0() },
                    uMode: { value: 0 },
                    uStrength: { value: 1 },
                    uEdge: { value: 0.6 },
                    uRough: { value: 0.3 },
                    uGrain: { value: 0.35 },
                    uBleed: { value: 0.5 },
                    uRim: { value: 2.5 },
                    uDpr: { value: 1 },
                    uSeed: { value: 500 * Math.random() },
                  },
                  vertexShader: E,
                  fragmentShader: A,
                  depthTest: !1,
                  depthWrite: !1,
                  blending: s.XIg,
                }),
                P = new s.bdM(2, 2),
                T = new s.eaF(P, z);
              T.frustumCulled = !1;
              let D = new s.Z58();
              D.add(T);
              let U = null,
                W = 0,
                N = 0,
                O = 1,
                G = "",
                _ = 0,
                H = 0,
                V = !1,
                X = !1,
                Y = !1,
                $ = 0,
                K = 0,
                Z = 0,
                Q = 4096,
                J = -1,
                ee = -1 / 0,
                et = 0,
                ea = 30 * Math.random(),
                en = 0,
                el = null,
                eo = 0,
                ei = {
                  x: 0,
                  y: 0,
                  vx: 0,
                  vy: 0,
                  carry: 0,
                  ready: !1,
                  pooled: !0,
                  still: 0,
                },
                er = { x: 0, y: 0, inside: !1, seen: !1, leftAt: 0, fresh: !0 },
                es = { x: 0, y: 0, t: 0, active: !1, moved: !1 },
                eu = () => {
                  (U?.dispose(), (U = null));
                },
                ed = () => {
                  let t = a.current,
                    l = e.getBoundingClientRect(),
                    i = Math.min(o.devicePixelRatio || 1, Math.max(t.dpr, 0.5)),
                    r = Math.max(1, Math.round(l.width)),
                    u = Math.max(1, Math.round(l.height)),
                    d = Math.min(p[t.quality] ?? p.medium, i),
                    c = `${r}x${u}@${i}:${d}`;
                  return (
                    c !== G &&
                    ((G = c),
                    (W = r),
                    (N = u),
                    (O = i),
                    n.setPixelRatio(O),
                    n.setSize(W, N, !1),
                    eu(),
                    (U = new s.nWS(
                      Math.max(1, Math.round(W * d)),
                      Math.max(1, Math.round(N * d)),
                      {
                        type: s.ix0,
                        format: s.GWd,
                        minFilter: s.k6q,
                        magFilter: s.k6q,
                        wrapS: s.ghU,
                        wrapT: s.ghU,
                        depthBuffer: !1,
                        stencilBuffer: !1,
                        generateMipmaps: !1,
                      },
                    )),
                    !0)
                  );
                },
                ec = (e) => {
                  let t = a.current.colorCycle;
                  return t > 0 ? 0.5 - 0.5 * Math.cos((e / t) * c) : 0;
                },
                eh = (e) => f(a.current.fade, 0.3, 30) * e,
                em = (
                  e,
                  t,
                  a,
                  n,
                  l,
                  o,
                  i = 0,
                  r = 0,
                  s = 0.6,
                  u = 0,
                  c = 0,
                  h = 0,
                ) => {
                  let m = K;
                  ((K = (K + 1) % 4096),
                    (Z = Math.min(Z + 1, 4096)),
                    (d[4 * m] = e),
                    (d[4 * m + 1] = t),
                    (d[4 * m + 2] = $ + i),
                    (d[4 * m + 3] = a),
                    (g[4 * m] = l),
                    (g[4 * m + 1] = n),
                    (g[4 * m + 2] = o),
                    (g[4 * m + 3] = r),
                    (b[4 * m] = u),
                    (b[4 * m + 1] = c),
                    (b[4 * m + 2] = s),
                    (b[4 * m + 3] = h),
                    (Q = Math.min(Q, m)),
                    (J = Math.max(J, m)),
                    (ee = Math.max(ee, $ + i + o)));
                },
                ep = (e, t) => {
                  let n = f(a.current.size, 2, 80),
                    l = ec(et),
                    o = 1.9 * n,
                    i = eh(1.3);
                  em(e, t, o, 3.27, l, i, 0, 0.05 + 0.95 * Math.random(), 0.3);
                  let r = 5 + Math.floor(5 * Math.random());
                  for (let a = 0; a < r; a++) {
                    let a = Math.random() * c,
                      n = o * (1.35 + 1.9 * Math.pow(Math.random(), 0.7)),
                      r = Math.cos(a) * n,
                      s = Math.sin(a) * n;
                    em(
                      e + r,
                      t + s,
                      o * (0.1 + 0.2 * Math.random()),
                      3.27,
                      f(l + (Math.random() - 0.5) * 0.25, 0, 1),
                      i * (0.85 + 0.3 * Math.random()),
                      0,
                      0.05 + 0.95 * Math.random(),
                      0.45,
                      0.85 * r,
                      0.85 * s,
                      0.1 + 0.08 * Math.random(),
                    );
                  }
                  eg();
                },
                ef = (e, t) => {
                  ((ei.x = e),
                    (ei.y = t),
                    (ei.vx = 0),
                    (ei.vy = 0),
                    (ei.carry = 0),
                    (ei.ready = !0),
                    (ei.pooled = !0),
                    (ei.still = 0));
                },
                ev = (e, t, n, l) => {
                  let o = a.current,
                    i = f(o.size, 2, 80),
                    r = 2 / f(o.follow, 0.005, 0.5),
                    s = n,
                    u = 0;
                  for (; s > 1e-6;) {
                    let a = Math.min(m, s);
                    s -= a;
                    let n = ei.x,
                      o = ei.y;
                    ((ei.vx += (r * r * (e - ei.x) - 2 * r * ei.vx) * a),
                      (ei.vy += (r * r * (t - ei.y) - 2 * r * ei.vy) * a),
                      (ei.x += ei.vx * a),
                      (ei.y += ei.vy * a));
                    let d = ei.x - n,
                      c = ei.y - o,
                      p = Math.hypot(d, c),
                      g = Math.hypot(ei.vx, ei.vy);
                    if (
                      (g < 18 ? (ei.still += a) : (ei.still = 0),
                      g > 60 && (ei.pooled = !1),
                      p < 1e-4 || l <= 0)
                    )
                      continue;
                    let b = i * (1 - 0.38 * v(g / 2200)),
                      y = f(0.32 * b, 1.6, 12),
                      x = (4 * y) / (1.75 * h * b),
                      w = 0,
                      k = Math.max(y - ei.carry, 0);
                    for (; w + k <= p && u < 160;) {
                      let e = (w += k) / p;
                      (em(
                        n + d * e,
                        o + c * e,
                        b,
                        x * l,
                        ec(et + w),
                        eh(0.96 + 0.08 * Math.random()),
                      ),
                        u++,
                        (k = y));
                    }
                    ((ei.carry = p - w + (y - k)), (et += p));
                  }
                  !ei.pooled &&
                    ei.still > 0.12 &&
                    l > 0.5 &&
                    ((ei.pooled = !0),
                    em(
                      ei.x,
                      ei.y,
                      0.95 * i,
                      3.27 * l,
                      ec(et),
                      eh(1.05),
                      0,
                      0.05 + 0.95 * Math.random(),
                    ));
                },
                eg = () => {
                  X || Y || !V || _ || (_ = o.requestAnimationFrame(eb));
                };
              function eb(t) {
                if (((_ = 0), X || Y)) return;
                let l = a.current,
                  s = H ? f((t - H) / 1e3, 0, 1 / 15) : 1 / 60;
                if (
                  ((H = t),
                  "auto" === l.mode && t - eo > 1200 && ((eo = t), (el = null)),
                  !l.paused)
                ) {
                  $ += s;
                  let e = er.inside ? 0 : (t - er.leftAt) / 1e3,
                    a =
                      l.autoplay &&
                      !l.reduced &&
                      (!er.seen ||
                        (!er.inside && e > Math.max(l.idleDelay, 0)));
                  if (er.inside)
                    ((en = 0),
                      ei.ready || ef(er.x, er.y),
                      ev(er.x, er.y, s, 1));
                  else if (a || en > 0) {
                    let e,
                      t = en <= 0;
                    ((en = f(en + (a ? s / 0.9 : -s / 0.3), 0, 1)),
                      (ea +=
                        s *
                        f(l.autoplaySpeed, 0, 5) *
                        Math.max(1, 560 / Math.max(Math.min(W, N), 1))));
                    let n = {
                      x:
                        W *
                        (0.5 +
                          0.3 * Math.sin(0.47 * (e = ea)) +
                          0.07 * Math.sin(1.31 * e + 0.6)),
                      y:
                        N *
                        (0.5 +
                          0.24 * Math.sin(0.83 * e + 0.9) +
                          0.06 * Math.cos(1.73 * e + 0.2)),
                    };
                    ((t || !ei.ready) && ef(n.x, n.y), ev(n.x, n.y, s, v(en)));
                  } else ei.ready = !1;
                }
                (() => {
                  let t,
                    l = a.current;
                  if (!U) return;
                  J < Q ||
                    ([y, w, B].forEach((e) => {
                      (e.clearUpdateRanges(),
                        e.addUpdateRange(4 * Q, (J - Q + 1) * 4),
                        (e.needsUpdate = !0));
                    }),
                    (L.instanceCount = Z),
                    (Q = 4096),
                    (J = -1));
                  let s =
                    "gouache" === (t = a.current.mode) ||
                    ("watercolor" !== t &&
                      (null === el &&
                        (el =
                          0.45 >
                          (() => {
                            let t = x(a.current.backgroundColor);
                            if (t[3] > 0.5) return M(t);
                            let n = e.parentElement;
                            for (; n;) {
                              let e = x(o.getComputedStyle(n).backgroundColor);
                              if (e[3] > 0.5) return M(e);
                              n = n.parentElement;
                            }
                            return +!o.matchMedia(
                              "(prefers-color-scheme: dark)",
                            ).matches;
                          })()),
                      el));
                  i.style.mixBlendMode = s ? "normal" : "multiply";
                  let u = j.uniforms;
                  (u.uView.value.set(W, N),
                    (u.uTime.value = $),
                    (u.uBloom.value = f(l.bloom, 0.05, 5)),
                    (u.uBleed.value = f(l.bleed, 0, 1)),
                    n.setRenderTarget(U),
                    n.setClearColor(0, 0),
                    n.clear(),
                    Z > 0 && n.render(q, r));
                  let [d, c] = l.colors,
                    h = d ?? "#5227FF",
                    m = c ?? h,
                    p = z.uniforms;
                  ((p.uField.value = U.texture),
                    p.uAbsA.value.copy(k(h)),
                    p.uAbsB.value.copy(k(m)),
                    p.uLabA.value.copy(C(h)),
                    p.uLabB.value.copy(C(m)),
                    (p.uMode.value = +!!s),
                    (p.uStrength.value = f(l.intensity, 0, 3)),
                    (p.uEdge.value = f(l.edge, 0, 1)),
                    (p.uRough.value = f(l.roughness, 0, 1)),
                    (p.uGrain.value = f(l.grain, 0, 1)),
                    (p.uBleed.value = f(l.bleed, 0, 1)),
                    (p.uRim.value = Math.max(1.4, 0.2 * f(l.size, 2, 80))),
                    (p.uDpr.value = O),
                    n.setRenderTarget(null),
                    s ? n.setClearColor(0, 0) : n.setClearColor(0xffffff, 1),
                    n.clear(),
                    n.render(D, r));
                })();
                let u = l.autoplay && !l.reduced && !er.inside,
                  d =
                    er.inside && (Math.hypot(ei.vx, ei.vy) > 0.5 || !ei.pooled),
                  c = $ < ee + 0.1;
                !l.paused && (u || d || c) && eg();
              }
              let ey = (t, n) => {
                  let l = a.current;
                  if (!l.interactive || l.paused) return;
                  let o = e.getBoundingClientRect(),
                    i = t - o.left,
                    r = n - o.top;
                  if (!(i >= 0 && r >= 0 && i <= o.width && r <= o.height)) {
                    er.inside &&
                      ((er.inside = !1),
                      (er.fresh = !0),
                      (er.leftAt = performance.now()),
                      (ei.ready = !1),
                      eg());
                    return;
                  }
                  let s =
                    Math.hypot(i - er.x, r - er.y) >
                    Math.max(240, 0.35 * Math.min(o.width, o.height));
                  ((!er.inside || er.fresh || s) &&
                    ((er.inside = !0),
                    (er.seen = !0),
                    (er.fresh = !1),
                    ef(i, r)),
                    (er.x = i),
                    (er.y = r),
                    eg());
                },
                ex = () => {
                  er.inside &&
                    ((er.inside = !1),
                    (er.fresh = !0),
                    (er.leftAt = performance.now()),
                    (ei.ready = !1),
                    eg());
                },
                ew = (e) => {
                  "touch" !== e.pointerType && ey(e.clientX, e.clientY);
                },
                ek = (t) => {
                  let n = a.current;
                  if (
                    !n.interactive ||
                    !n.splash ||
                    n.paused ||
                    t.button > 0 ||
                    "touch" === t.pointerType
                  )
                    return;
                  let l = e.getBoundingClientRect(),
                    o = t.clientX - l.left,
                    i = t.clientY - l.top;
                  o < 0 || i < 0 || o > l.width || i > l.height || ep(o, i);
                },
                eC = (e) => {
                  let t = e.touches[0];
                  t &&
                    ((es.x = t.clientX),
                    (es.y = t.clientY),
                    (es.t = performance.now()),
                    (es.active = !0),
                    (es.moved = !1),
                    (er.fresh = !0),
                    ey(t.clientX, t.clientY));
                },
                eM = (e) => {
                  let t = e.touches[0];
                  if (t) {
                    if (es.active && !es.moved) {
                      if (10 > Math.hypot(t.clientX - es.x, t.clientY - es.y))
                        return;
                      es.moved = !0;
                    }
                    ey(t.clientX, t.clientY);
                  }
                },
                eF = () => {
                  let t = a.current,
                    n =
                      es.active && !es.moved && performance.now() - es.t < 350;
                  if (
                    ((es.active = !1),
                    n && t.interactive && t.splash && !t.paused)
                  ) {
                    let t = e.getBoundingClientRect(),
                      a = es.x - t.left,
                      n = es.y - t.top;
                    a >= 0 &&
                      n >= 0 &&
                      a <= t.width &&
                      n <= t.height &&
                      ep(a, n);
                  }
                  ex();
                };
              (o.addEventListener("pointermove", ew, { passive: !0 }),
                o.addEventListener("pointerdown", ek, { passive: !0 }),
                o.addEventListener("touchstart", eC, { passive: !0 }),
                o.addEventListener("touchmove", eM, { passive: !0 }),
                o.addEventListener("touchend", eF, { passive: !0 }),
                o.addEventListener("touchcancel", ex, { passive: !0 }),
                o.addEventListener("blur", ex),
                l.documentElement.addEventListener("mouseleave", ex));
              let eS = () => {
                  ((el = null), eg());
                },
                eE = new MutationObserver(eS);
              (eE.observe(l.documentElement, {
                attributes: !0,
                attributeFilter: ["class", "style", "data-theme"],
              }),
                l.body &&
                  eE.observe(l.body, {
                    attributes: !0,
                    attributeFilter: ["class", "style", "data-theme"],
                  }));
              let eA = o.matchMedia("(prefers-color-scheme: dark)");
              eA.addEventListener("change", eS);
              let eB = new ResizeObserver(() => {
                ed() && ((el = null), (H = 0), eg());
              });
              eB.observe(e);
              let eI =
                "undefined" == typeof IntersectionObserver
                  ? null
                  : new IntersectionObserver(
                      ([e]) => {
                        (V = e.isIntersecting)
                          ? ((H = 0), eg())
                          : _ && (o.cancelAnimationFrame(_), (_ = 0));
                      },
                      { rootMargin: "80px" },
                    );
              eI ? eI.observe(e) : (V = !0);
              let eL = (e) => {
                  (e.preventDefault(),
                    (Y = !0),
                    _ && o.cancelAnimationFrame(_),
                    (_ = 0));
                },
                ej = () => {
                  ((Y = !1),
                    (G = ""),
                    ed(),
                    (Q = 0),
                    (J = 4095),
                    (H = 0),
                    eg());
                };
              return (
                i.addEventListener("webglcontextlost", eL),
                i.addEventListener("webglcontextrestored", ej),
                ed(),
                n.compile(q, r),
                n.compile(D, r),
                eg(),
                {
                  sync: () => {
                    ((el = null), ed() && (H = 0), eg());
                  },
                  splash: (e, t) => {
                    Number.isFinite(e) && Number.isFinite(t) && ep(e, t);
                  },
                  clear: () => {
                    (g.fill(0),
                      d.fill(0),
                      b.fill(0),
                      (K = 0),
                      (Z = 0),
                      (Q = 0),
                      (J = 4095),
                      (ee = -1 / 0),
                      eg());
                  },
                  destroy: () => {
                    ((X = !0),
                      _ && o.cancelAnimationFrame(_),
                      eI?.disconnect(),
                      eB.disconnect(),
                      eE.disconnect(),
                      eA.removeEventListener("change", eS),
                      o.removeEventListener("pointermove", ew),
                      o.removeEventListener("pointerdown", ek),
                      o.removeEventListener("touchstart", eC),
                      o.removeEventListener("touchmove", eM),
                      o.removeEventListener("touchend", eF),
                      o.removeEventListener("touchcancel", ex),
                      o.removeEventListener("blur", ex),
                      l.documentElement.removeEventListener("mouseleave", ex),
                      i.removeEventListener("webglcontextlost", eL),
                      i.removeEventListener("webglcontextrestored", ej),
                      eu(),
                      L.dispose(),
                      I.dispose(),
                      P.dispose(),
                      j.dispose(),
                      z.dispose(),
                      n.dispose(),
                      n.getContext().isContextLost() || n.forceContextLoss(),
                      i.remove());
                  },
                }
              );
            })(e, t, K);
            return (
              (Y.current = a),
              () => {
                (a?.destroy(), (Y.current = null));
              }
            );
          }, []),
          (0, l.useImperativeHandle)(
            H,
            () => ({
              splash: (e, t) => Y.current?.splash(e, t),
              clear: () => Y.current?.clear(),
            }),
            [],
          ));
        let Z = t.trim().toLowerCase();
        return (0, n.jsxs)("div", {
          ref: V,
          className: (0, d.cn)(
            "relative h-full min-h-[320px] w-full overflow-hidden",
            O,
          ),
          style: {
            backgroundColor: "transparent" === Z || "" === Z ? void 0 : t,
            ...G,
          },
          children: [
            (0, n.jsx)("div", {
              ref: X,
              "aria-hidden": "true",
              style: { position: "absolute", inset: 0, pointerEvents: "none" },
            }),
            _
              ? (0, n.jsx)("div", {
                  style: { position: "relative", zIndex: 1, height: "100%" },
                  children: _,
                })
              : null,
          ],
        });
      });
    B.displayName = "PigmentTrail";
    let I = {
        dark: ["#5227FF", "#FF9FFC"],
        light: ["#5227FF", "#E0409A"],
        size: 14,
        bloom: 0.9,
        bleed: 0.5,
        edge: 0.6,
        roughness: 0.3,
        grain: 0.35,
        fade: 3.5,
        follow: 0.06,
        colorCycle: 700,
      },
      L = {
        inkBleed: I,
        fineLine: {
          ...I,
          size: 6,
          bloom: 0.6,
          bleed: 0.35,
          edge: 0.7,
          roughness: 0.2,
          fade: 3,
          follow: 0.05,
          colorCycle: 500,
        },
        wetWash: {
          ...I,
          size: 22,
          bloom: 1.4,
          bleed: 0.9,
          edge: 0.45,
          roughness: 0.45,
          grain: 0.3,
          fade: 4.5,
          colorCycle: 900,
        },
        marker: {
          ...I,
          size: 11,
          bloom: 0.3,
          bleed: 0,
          edge: 0.25,
          roughness: 0,
          grain: 0.1,
          fade: 3,
        },
        sumi: {
          ...I,
          dark: ["#F4F4F5", "#A1A1AA"],
          light: ["#18181B", "#52525B"],
          size: 12,
          bleed: 0.6,
          edge: 0.8,
          roughness: 0.45,
          grain: 0.5,
          colorCycle: 900,
        },
        coral: {
          ...I,
          dark: ["#FF9FFC", "#FF7A27"],
          light: ["#E0409A", "#FF7A27"],
        },
      },
      j = [
        { label: "Ink Bleed", value: "inkBleed" },
        { label: "Fine Line", value: "fineLine" },
        { label: "Wet Wash", value: "wetWash" },
        { label: "Marker", value: "marker" },
        { label: "Sumi", value: "sumi" },
        { label: "Coral", value: "coral" },
      ],
      R = [
        { label: "Auto", value: "auto" },
        { label: "Watercolor", value: "watercolor" },
        { label: "Gouache", value: "gouache" },
      ],
      q = [
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
      ],
      z = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#5227FF", "#FF9FFC"]',
          description:
            "The two inks. The brush drifts from one to the other as it travels, and where they overlap they mix like real pigment.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Background of the component. Leave it transparent to paint over your own page.",
        },
        {
          name: "mode",
          type: '"auto" | "watercolor" | "gouache"',
          default: '"auto"',
          description:
            "Watercolor is transparent ink that multiplies into light pages, with a soft bleed around every stroke. Gouache is opaque paint for dark pages. Auto picks one from the background behind the component and follows theme changes.",
        },
        {
          name: "size",
          type: "number",
          default: "14",
          description:
            "Brush radius in pixels. Fast strokes come out thinner, like a real brush.",
        },
        {
          name: "bloom",
          type: "number",
          default: "0.9",
          description:
            "Seconds each drop of ink takes to open up after it lands, so the stroke swells gently behind the brush.",
        },
        {
          name: "bleed",
          type: "number",
          default: "0.5",
          description:
            "How far a soft halo of ink creeps into the paper around each stroke while it sits. Shown on light pages only.",
        },
        {
          name: "edge",
          type: "number",
          default: "0.6",
          description:
            "Darkening that gathers along the edges as the ink dries.",
        },
        {
          name: "roughness",
          type: "number",
          default: "0.3",
          description:
            "How organic the edges are, from perfectly smooth to softly irregular.",
        },
        {
          name: "grain",
          type: "number",
          default: "0.35",
          description: "Paper texture in the ink.",
        },
        {
          name: "intensity",
          type: "number",
          default: "1",
          description: "Ink strength.",
        },
        {
          name: "fade",
          type: "number",
          default: "3.5",
          description:
            "Seconds each part of the stroke lasts. The oldest ink evaporates first, so the trail thins and retracts toward the brush.",
        },
        {
          name: "follow",
          type: "number",
          default: "0.06",
          description:
            "Seconds the brush trails behind the pointer. A little lag turns shaky movement into smooth curves.",
        },
        {
          name: "colorCycle",
          type: "number",
          default: "700",
          description:
            "Distance in pixels the brush travels to go from the first ink to the second and back. 0 paints with the first ink only.",
        },
        {
          name: "splash",
          type: "boolean",
          default: "true",
          description:
            "Clicking or tapping splashes a drop of ink: droplets fly out, land and bloom.",
        },
        {
          name: "autoplay",
          type: "boolean",
          default: "true",
          description:
            "Until the pointer arrives, and again after it leaves, an invisible hand keeps painting.",
        },
        {
          name: "autoplaySpeed",
          type: "number",
          default: "1",
          description: "Speed of that invisible hand.",
        },
        {
          name: "idleDelay",
          type: "number",
          default: "1.5",
          description:
            "Seconds after the pointer leaves before the invisible hand picks up the brush again.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Let the pointer and touch paint. The component listens on the window, so content laid over it still paints.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Freezes the ink. Reduced-motion users never get the invisible hand.",
        },
        {
          name: "quality",
          type: '"low" | "medium" | "high"',
          default: '"medium"',
          description:
            "Resolution the ink is shaped at. High draws the finest edges on high-density screens.",
        },
        {
          name: "dpr",
          type: "number",
          default: "2",
          description: "Maximum device pixel ratio for the canvas.",
        },
        {
          name: "ref",
          type: "{ splash, clear }",
          default: "—",
          description:
            "Imperative controls: splash ink at a point (in pixels from the top-left corner), or wipe the paper clean.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description: "Content rendered above the ink, such as a hero.",
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
      P = () => {
        let [e, t] = (0, r.I)(),
          a = (0, i.Y)(),
          [s, u] = (0, l.useState)("inkBleed"),
          [d, c] = (0, l.useState)(I),
          h = (e) => (t) => c((a) => ({ ...a, [e]: t })),
          [m, p] = (0, l.useState)(null),
          f = m ?? ("dark" === a ? d.dark : d.light),
          [v, g] = (0, l.useState)(null),
          b = v ?? ("dark" === a ? "#0A0A0A" : "#FFFFFF"),
          [y, x] = (0, l.useState)("auto"),
          [w, k] = (0, l.useState)("medium"),
          [C, M] = (0, l.useState)(1),
          [F, S] = (0, l.useState)(1),
          [E, A] = (0, l.useState)(1.5),
          [P, T] = (0, l.useState)(!0),
          [D, U] = (0, l.useState)(!0),
          [W, N] = (0, l.useState)(!0),
          [O, G] = (0, l.useState)(!1);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(o.Bg, {}),
            (0, n.jsxs)(o.VX, {
              children: [
                (0, n.jsxs)(o.Ec, {
                  children: [
                    (0, n.jsx)(o.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, n.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, n.jsx)(
                          B,
                          {
                            colors: f,
                            backgroundColor: b,
                            mode: y,
                            size: d.size,
                            bloom: d.bloom,
                            bleed: d.bleed,
                            edge: d.edge,
                            roughness: d.roughness,
                            grain: d.grain,
                            intensity: C,
                            fade: d.fade,
                            follow: d.follow,
                            colorCycle: d.colorCycle,
                            splash: P,
                            autoplay: D,
                            autoplaySpeed: F,
                            idleDelay: E,
                            interactive: W,
                            paused: O,
                            quality: w,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(o.IH, {
                      children: [
                        (0, n.jsx)(o.bg, {
                          title: "Preset",
                          value: s,
                          options: j,
                          onChange: (e) => {
                            (u(e), c(L[e] ?? I), p(null));
                          },
                        }),
                        (0, n.jsx)(o.W7, {
                          title: "Ink A",
                          value: f[0],
                          onChange: (e) => p([e, f[1]]),
                        }),
                        (0, n.jsx)(o.W7, {
                          title: "Ink B",
                          value: f[1],
                          onChange: (e) => p([f[0], e]),
                        }),
                        (0, n.jsx)(o.W7, {
                          title: "Background",
                          value: b,
                          onChange: g,
                        }),
                        (0, n.jsx)(o.bg, {
                          title: "Mode",
                          value: y,
                          options: R,
                          onChange: (e) => x(e),
                        }),
                        (0, n.jsx)(o.bg, {
                          title: "Quality",
                          value: w,
                          options: q,
                          onChange: (e) => k(e),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Size",
                          min: 3,
                          max: 48,
                          step: 1,
                          value: d.size,
                          valueUnit: "px",
                          onChange: h("size"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Bloom",
                          min: 0.05,
                          max: 3,
                          step: 0.05,
                          value: d.bloom,
                          valueUnit: "s",
                          onChange: h("bloom"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Bleed",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.bleed,
                          onChange: h("bleed"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Edge",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.edge,
                          onChange: h("edge"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Roughness",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.roughness,
                          onChange: h("roughness"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Grain",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: d.grain,
                          onChange: h("grain"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Intensity",
                          min: 0.2,
                          max: 2,
                          step: 0.05,
                          value: C,
                          onChange: M,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Fade",
                          min: 0.5,
                          max: 12,
                          step: 0.1,
                          value: d.fade,
                          valueUnit: "s",
                          onChange: h("fade"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Follow",
                          min: 0.01,
                          max: 0.3,
                          step: 0.005,
                          value: d.follow,
                          valueUnit: "s",
                          onChange: h("follow"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Color Cycle",
                          min: 0,
                          max: 3e3,
                          step: 10,
                          value: d.colorCycle,
                          valueUnit: "px",
                          onChange: h("colorCycle"),
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Autoplay Speed",
                          min: 0.1,
                          max: 3,
                          step: 0.05,
                          value: F,
                          onChange: S,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Idle Delay",
                          min: 0,
                          max: 6,
                          step: 0.25,
                          value: E,
                          valueUnit: "s",
                          onChange: A,
                        }),
                        (0, n.jsx)(o.tl, {
                          title: "Splash",
                          checked: P,
                          onChange: T,
                        }),
                        (0, n.jsx)(o.tl, {
                          title: "Autoplay",
                          checked: D,
                          onChange: U,
                        }),
                        (0, n.jsx)(o.tl, {
                          title: "Interactive",
                          checked: W,
                          onChange: N,
                        }),
                        (0, n.jsx)(o.tl, {
                          title: "Paused",
                          checked: O,
                          onChange: G,
                        }),
                      ],
                    }),
                    (0, n.jsx)(o.Ub, { data: z }),
                  ],
                }),
                (0, n.jsx)(o.lT, { children: (0, n.jsx)(o.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
