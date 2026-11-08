/* ReactBits Pro public preview module 30804 for interference-ribbons.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/30804.e124a7367f699fcf.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  30804: (e, t, l) => {
    (l.r(t), l.d(t, { default: () => L }));
    var n = l(95155),
      a = l(12115),
      r = l(56388),
      o = l(86049),
      u = l(90761),
      i = l(2253),
      s = l(12246),
      c = l(90650);
    let d = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      v = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      m = (e, t, l) => Math.min(l, Math.max(t, e)),
      f = null,
      p = (e, t) => {
        if ((f || (f = document.createElement("canvas").getContext("2d")), !f))
          return t;
        ((f.fillStyle = "#010203"), (f.fillStyle = e));
        let l = String(f.fillStyle);
        if ("#010203" === l && "#010203" !== e.trim().toLowerCase()) return t;
        if (l.startsWith("#")) {
          let e = l.slice(1);
          return [
            parseInt(e.slice(0, 2), 16) / 255,
            parseInt(e.slice(2, 4), 16) / 255,
            parseInt(e.slice(4, 6), 16) / 255,
          ];
        }
        let n = l.match(/[\d.]+/g);
        return !n || n.length < 3
          ? t
          : [Number(n[0]) / 255, Number(n[1]) / 255, Number(n[2]) / 255];
      },
      h = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      x = ([e, t, l]) => {
        let n = h(e),
          a = h(t),
          r = h(l),
          o = Math.cbrt(0.4122214708 * n + 0.5363325363 * a + 0.0514459929 * r),
          u = Math.cbrt(0.2119034982 * n + 0.6806995451 * a + 0.1073969566 * r),
          i = Math.cbrt(0.0883024619 * n + 0.2817188376 * a + 0.6299787005 * r);
        return [
          0.2104542553 * o + 0.793617785 * u - 0.0040720468 * i,
          1.9779984951 * o - 2.428592205 * u + 0.4505937099 * i,
          0.0259040371 * o + 0.7827717662 * u - 0.808675766 * i,
        ];
      },
      g = `
in vec2 aWire;
in vec2 aSample;
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uTime;
uniform float uPulseTime;
uniform float uAngle;
uniform float uExtent;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uHalf;
uniform float uCurl;
uniform float uTwist;
uniform float uSpin;
uniform float uLineWidth;
uniform float uBack;
uniform float uStripes;
uniform float uFlow;
uniform float uEnergy;
uniform float uPulseSpeed;
uniform float uPulseStrength;
uniform float uInk;
uniform vec3 uLabDeep;
uniform vec3 uLabA;
uniform vec3 uLabB;
uniform vec4 uPulses[16];
out float vDist;
out float vHalfPx;
out vec3 vColor;
out float vGain;

vec3 labToLinear(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return max(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ), 0.0);
}

vec3 palette(float s) {
  s = fract(s) * 3.0;
  vec3 lab = s < 1.0 ? mix(uLabDeep, uLabA, smoothstep(0.0, 1.0, s))
    : s < 2.0 ? mix(uLabA, uLabB, smoothstep(0.0, 1.0, s - 1.0))
    : mix(uLabB, uLabDeep, smoothstep(0.0, 1.0, s - 2.0));
  return labToLinear(lab);
}

float spine(float x) {
  float t = uTime;
  return uAmplitude * (0.62 * sin(x * uFrequency + t * 0.33 + 0.4)
    + 0.26 * sin(x * uFrequency * 1.93 - t * 0.21 + 2.1)
    + 0.12 * sin(x * uFrequency * 3.07 + t * 0.47 + 4.2));
}

vec3 wire(float x, float u, float seed, out float facing) {
  float t = uTime;
  float halfWidth = uHalf * (1.0 + 0.22 * sin(x * 0.61 - t * 0.19 + 1.3));
  float theta = uTwist * x + uSpin;
  float wobble = 0.4 * (sin(x * 2.3 + seed * 6.2831853 + t * 0.7) * 0.6 + sin(x * 3.9 - seed * 11.3 - t * 0.5) * 0.4);
  float xi = u + wobble * 0.05;
  float zeta = uCurl * (u * u - 1.0 / 3.0) + wobble * 0.07;
  float c = cos(theta);
  float s = sin(theta);
  float y = spine(x) + halfWidth * (xi * c - zeta * s);
  float z = xi * s + zeta * c;
  facing = clamp(0.5 + 0.5 * z, 0.0, 1.0);
  return vec3(x, y, z);
}

vec2 toScreen(vec2 p) {
  float unit = 0.5 * uResolution.y;
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  return vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y) * unit + 0.5 * uResolution;
}

void main() {
  float u = aWire.x;
  float seed = aWire.y;
  float x = mix(-uExtent, uExtent, aSample.x);
  float delta = 2.0 * uExtent / 360.0;
  float f0;
  float f1;
  float f2;
  vec3 p0 = wire(x - delta, u, seed, f0);
  vec3 p1 = wire(x, u, seed, f1);
  vec3 p2 = wire(x + delta, u, seed, f2);
  vec2 s0 = toScreen(p0.xy);
  vec2 s1 = toScreen(p1.xy);
  vec2 s2 = toScreen(p2.xy);
  vec2 tangent = normalize(s2 - s0 + vec2(1e-6, 0.0));
  vec2 normal = vec2(-tangent.y, tangent.x);
  float halfPx = uLineWidth * uPixelRatio * mix(0.3, 1.0, f1 * f1 * f1) * 0.5;
  float reach = halfPx * 2.2 + 1.5;
  vec2 position2 = s1 + normal * aSample.y * reach;
  vDist = aSample.y * reach;
  vHalfPx = halfPx;
  float light = 0.0;
  for (int k = 0; k < 16; k++) {
    vec4 pulse = uPulses[k];
    if (pulse.w <= 0.0) continue;
    float age = uPulseTime - pulse.y;
    if (age < 0.0 || age > 4.0) continue;
    float travel = age * uPulseSpeed;
    float front = abs(x - pulse.x) - travel + 0.05 * sin(u * 7.0 + pulse.y * 3.7) + (seed - 0.5) * 0.025;
    bool wave = pulse.w > 1.5;
    float along = front > 0.0 ? exp(-front * front / 0.0025) : exp(front / (wave ? 0.32 : 0.13));
    along += wave ? 0.0 : 0.45 * exp(-front * front / 0.0012);
    along *= smoothstep(0.0, 0.12, travel);
    float gap = (u - pulse.z) * 13.0;
    float across = wave ? 1.0 : 1.25 * exp(-gap * gap);
    light += along * across * exp(-age * 1.1);
  }
  light = min(light * uPulseStrength, 1.4);
  float tone = u * uStripes * 0.5 + x * 0.09 - uFlow;
  vec3 base = palette(tone);
  float lit = clamp(light, 0.0, 1.0);
  vec3 glowTint = mix(base, vec3(1.0, 0.95, 1.0), lit * 0.45);
  vec3 inkTint = mix(base, labToLinear(uLabDeep), lit * 0.7);
  vColor = mix(glowTint, inkTint, uInk);
  vGain = mix(uBack, 1.0, pow(f1, 1.5)) * (1.0 + light * mix(0.9, 2.2, uInk)) * (1.0 + uEnergy * 0.18);
  gl_Position = vec4(position2 / uResolution * 2.0 - 1.0, 0.0, 1.0);
}
`,
      b = `
precision highp float;
uniform float uCore;
in float vDist;
in float vHalfPx;
in vec3 vColor;
in float vGain;
out vec4 fragColor;

void main() {
  float sigma = max(vHalfPx, 0.55);
  float d = vDist / sigma;
  float energy = exp(-d * d) * min(vHalfPx / 0.55, 1.0) * vGain * uCore;
  fragColor = vec4(vColor * energy, energy);
}
`,
      w = `
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      y = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 a = texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  vec4 b = texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  vec4 c = texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  vec4 d = texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = (a + b + c + d) * 0.125 + texture(uSource, vUv) * 0.5;
}
`,
      S = `
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 sum = texture(uSource, vUv) * 4.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, -1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, 1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = texture(uBase, vUv) + sum / 16.0;
}
`,
      C = `
precision highp float;
uniform sampler2D uLines;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform vec2 uResolution;
uniform float uGlow;
uniform float uExposure;
uniform float uMode;
uniform float uGrain;
in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  vec4 lines = texture(uLines, vUv);
  vec4 bloom = texture(uBloom, vUv);
  vec3 color;
  if (uMode < 0.5) {
    vec3 light = (lines.rgb + bloom.rgb * uGlow) * uExposure;
    vec3 exposed = 1.0 - exp(-light);
    float peak = max(exposed.r, max(exposed.g, exposed.b));
    exposed = mix(exposed, vec3(peak), smoothstep(0.75, 1.0, peak) * 0.35);
    vec2 q = vUv - 0.5;
    q.x *= uResolution.x / uResolution.y;
    exposed *= 1.0 - 0.18 * smoothstep(0.35, 1.1, length(q));
    color = uBackground + (1.0 - uBackground) * exposed;
  } else {
    float energy = lines.a + bloom.a * uGlow * 0.2;
    vec3 hue = (lines.rgb + bloom.rgb * uGlow * 0.2) / max(energy, 1e-4);
    float cover = clamp(1.0 - exp(-energy * uExposure * 1.4), 0.0, 0.94);
    color = mix(uBackground, clamp(hue * 0.8, 0.0, 1.0), cover);
  }
  float grain = hash(gl_FragCoord.xy + uGrain * 311.0) - 0.5;
  fragColor = vec4(encode(color) + grain * (1.2 / 255.0), 1.0);
}
`,
      k = (0, a.forwardRef)(function (
        {
          colors: e = ["#6B3CFF", "#D46BFF"],
          backgroundColor: t = "#0A0A0A",
          mode: l = "auto",
          wires: r = 64,
          lineWidth: o = 1.6,
          ribbonWidth: u = 0.24,
          amplitude: f = 0.6,
          waveLength: k = 1,
          angle: F = 42,
          twist: P = 1.6,
          curl: B = 0.25,
          depth: E = 0.65,
          stripes: M = 2.2,
          colorFlow: L = 0.04,
          glow: T = 0.45,
          intensity: W = 1,
          speed: j = 0.7,
          spin: A = 0.35,
          interactive: R = !0,
          hoverPulses: D = !0,
          clickPulse: U = !0,
          pulseSpeed: I = 1.1,
          pulseStrength: q = 1,
          hoverBoost: H = 1,
          paused: z = !1,
          quality: G = 1,
          className: N,
          style: _,
          children: Y,
        },
        X,
      ) {
        let O = (0, a.useRef)(null),
          V = (0, a.useRef)(null),
          K = (0, a.useSyncExternalStore)(d, v, () => !1),
          Z = (0, a.useRef)({
            colors: e,
            backgroundColor: t,
            mode: l,
            wires: r,
            lineWidth: o,
            ribbonWidth: u,
            amplitude: f,
            waveLength: k,
            angle: F,
            twist: P,
            curl: B,
            depth: E,
            stripes: M,
            colorFlow: L,
            glow: T,
            intensity: W,
            speed: j,
            spin: A,
            interactive: R,
            hoverPulses: D,
            clickPulse: U,
            pulseSpeed: I,
            pulseStrength: q,
            hoverBoost: H,
            paused: z,
            quality: G,
            reduced: K,
          });
        return (
          (0, a.useEffect)(() => {
            ((Z.current = {
              colors: e,
              backgroundColor: t,
              mode: l,
              wires: r,
              lineWidth: o,
              ribbonWidth: u,
              amplitude: f,
              waveLength: k,
              angle: F,
              twist: P,
              curl: B,
              depth: E,
              stripes: M,
              colorFlow: L,
              glow: T,
              intensity: W,
              speed: j,
              spin: A,
              interactive: R,
              hoverPulses: D,
              clickPulse: U,
              pulseSpeed: I,
              pulseStrength: q,
              hoverBoost: H,
              paused: z,
              quality: G,
              reduced: K,
            }),
              V.current?.sync());
          }),
          (0, a.useEffect)(() => {
            let e = O.current;
            if (!e) return;
            let t = ((e, t) => {
              let l,
                n = document.createElement("canvas");
              (n.setAttribute("aria-hidden", "true"),
                (n.style.position = "absolute"),
                (n.style.inset = "0"),
                (n.style.width = "100%"),
                (n.style.height = "100%"),
                (n.style.display = "block"),
                (n.style.pointerEvents = "none"),
                e.prepend(n));
              try {
                l = new s.WebGLRenderer({
                  canvas: n,
                  alpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return (n.remove(), null);
              }
              if (!l.capabilities.isWebGL2)
                return (l.dispose(), n.remove(), null);
              l.autoClear = !1;
              let a =
                  l.extensions.has("EXT_color_buffer_float") ||
                  l.extensions.has("EXT_color_buffer_half_float")
                    ? i.ix0
                    : i.OUM,
                r = new i.qUd(-1, 1, 1, -1, 0, 1),
                o = new i.bdM(2, 2),
                u = Array.from({ length: 16 }, () => new i.IUQ(0, -100, 0, 0)),
                c = new i.BKk({
                  glslVersion: i.Wdf,
                  uniforms: {
                    uResolution: { value: new i.I9Y(1, 1) },
                    uPixelRatio: { value: 1 },
                    uTime: { value: 0 },
                    uPulseTime: { value: 0 },
                    uAngle: { value: 0 },
                    uExtent: { value: 2 },
                    uAmplitude: { value: 0.6 },
                    uFrequency: { value: 1.55 },
                    uHalf: { value: 0.24 },
                    uCurl: { value: 0.25 },
                    uTwist: { value: 1.6 },
                    uSpin: { value: 0 },
                    uLineWidth: { value: 1.6 },
                    uBack: { value: 0.35 },
                    uStripes: { value: 2.2 },
                    uFlow: { value: 0 },
                    uEnergy: { value: 0 },
                    uPulseSpeed: { value: 1.1 },
                    uPulseStrength: { value: 1 },
                    uInk: { value: 0 },
                    uLabDeep: { value: new i.Pq0() },
                    uLabA: { value: new i.Pq0() },
                    uLabB: { value: new i.Pq0() },
                    uPulses: { value: u },
                    uCore: { value: 0.85 },
                  },
                  vertexShader: g,
                  fragmentShader: b,
                  depthTest: !1,
                  depthWrite: !1,
                  transparent: !0,
                  side: i.$EB,
                  blending: i.bCz,
                  blendEquation: i.gO9,
                  blendSrc: i.qad,
                  blendDst: i.qad,
                  blendSrcAlpha: i.qad,
                  blendDstAlpha: i.qad,
                }),
                d = (e, t) =>
                  new i.BKk({
                    glslVersion: i.Wdf,
                    uniforms: t,
                    vertexShader: w,
                    fragmentShader: e,
                    depthTest: !1,
                    depthWrite: !1,
                    blending: i.XIg,
                  }),
                v = d(y, {
                  uSource: { value: null },
                  uTexel: { value: new i.I9Y() },
                }),
                f = d(S, {
                  uSource: { value: null },
                  uBase: { value: null },
                  uTexel: { value: new i.I9Y() },
                }),
                k = d(C, {
                  uLines: { value: null },
                  uBloom: { value: null },
                  uBackground: { value: new i.Pq0() },
                  uResolution: { value: new i.I9Y(1, 1) },
                  uGlow: { value: 0.45 },
                  uExposure: { value: 1.6 },
                  uMode: { value: 0 },
                  uGrain: { value: 0 },
                }),
                F = 0,
                P = new i.eaF(new i.LoY(), c);
              P.frustumCulled = !1;
              let B = new i.Z58();
              B.add(P);
              let E = new i.eaF(o, k);
              E.frustumCulled = !1;
              let M = new i.Z58();
              M.add(E);
              let L = (e, t) =>
                  new i.nWS(Math.max(1, e), Math.max(1, t), {
                    type: a,
                    format: i.GWd,
                    minFilter: i.k6q,
                    magFilter: i.k6q,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    generateMipmaps: !1,
                  }),
                T = null,
                W = [],
                j = [],
                A = !1,
                R = 0,
                D = 0,
                U = !0,
                I = 6,
                q = 0,
                H = 0,
                z = 0,
                G = 0,
                N = !1,
                _ = 0,
                Y = 1,
                X = 1,
                O = 1,
                V = 0,
                K = { x: -1e9, y: -1e9 },
                Z = () => {
                  (T?.dispose(),
                    W.forEach((e) => e.dispose()),
                    j.forEach((e) => e.dispose()),
                    (T = null),
                    (W = []),
                    (j = []));
                },
                $ = (e, t) => {
                  ((E.material = e), l.setRenderTarget(t), l.render(M, r));
                },
                Q = () => {
                  let e = t.current,
                    l = (m(e.angle, -180, 180) * Math.PI) / 180,
                    n =
                      ((Y / Math.max(X, 1)) * Math.abs(Math.cos(l)) +
                        Math.abs(Math.sin(l))) *
                      1.08;
                  return {
                    angle: l,
                    extent: n,
                    frequency: 1.55 / m(e.waveLength, 0.2, 5),
                  };
                },
                J = () => {
                  let e;
                  if (!T || !W.length) return;
                  ((e = Math.round(m(t.current.wires, 4, 160))) !== F &&
                    ((F = e),
                    P.geometry.dispose(),
                    (P.geometry = ((e) => {
                      let t = new Float32Array(361 * e * 8),
                        l = new Uint32Array(360 * e * 6),
                        n = 0,
                        a = 0,
                        r = 1,
                        o = () => (r = (16807 * r) % 0x7fffffff) / 0x7fffffff;
                      for (let r = 0; r < e; r++) {
                        let u = ((r + 0.5) / e) * 2 - 1,
                          i = o(),
                          s = n / 4;
                        for (let e = 0; e <= 360; e++) {
                          let l = e / 360;
                          (t.set([u, i, l, -1, u, i, l, 1], n), (n += 8));
                        }
                        for (let e = 0; e < 360; e++) {
                          let t = s + 2 * e;
                          (l.set([t, t + 1, t + 2, t + 1, t + 3, t + 2], a),
                            (a += 6));
                        }
                      }
                      let u = new i.LoY(),
                        s = new i.eB$(t, 4);
                      return (
                        u.setAttribute("aWire", new i.eHs(s, 2, 0)),
                        u.setAttribute("aSample", new i.eHs(s, 2, 2)),
                        u.setAttribute("position", new i.eHs(s, 3, 0)),
                        u.setIndex(new i.THS(l, 1)),
                        u
                      );
                    })(e))),
                    (() => {
                      let e = t.current,
                        l = c.uniforms,
                        n = Y * O,
                        a = X * O,
                        { angle: r, extent: o, frequency: u } = Q(),
                        i = x(p(e.colors[0], [0.42, 0.24, 1])),
                        s = x(p(e.colors[1], [0.83, 0.42, 1]));
                      (l.uResolution.value.set(n, a),
                        (l.uPixelRatio.value = O),
                        (l.uTime.value = I),
                        (l.uPulseTime.value = q),
                        (l.uAngle.value = r),
                        (l.uExtent.value = o),
                        (l.uAmplitude.value = m(e.amplitude, 0, 1.5)),
                        (l.uFrequency.value = u),
                        (l.uHalf.value = m(e.ribbonWidth, 0.02, 0.8)),
                        (l.uCurl.value = m(e.curl, 0, 1.2)),
                        (l.uTwist.value = m(e.twist, 0, 8)),
                        (l.uSpin.value = H),
                        (l.uLineWidth.value = m(e.lineWidth, 0.4, 6)),
                        (l.uBack.value = 1 - m(e.depth, 0, 1)),
                        (l.uStripes.value = m(e.stripes, 0, 12)),
                        (l.uFlow.value = z),
                        (l.uEnergy.value = G),
                        (l.uPulseSpeed.value = m(e.pulseSpeed, 0.1, 5)),
                        (l.uPulseStrength.value = m(e.pulseStrength, 0, 3)));
                      let d = p(e.backgroundColor, [0.04, 0.04, 0.04]),
                        v = 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2],
                        f = "ink" === e.mode || ("auto" === e.mode && v > 0.5),
                        g = f ? 1.15 : 0.85;
                      ((l.uInk.value = +!!f),
                        l.uLabDeep.value.set(
                          i[0] * (f ? 0.6 : 0.42),
                          i[1] * g,
                          i[2] * g,
                        ),
                        l.uLabA.value.set(i[0], i[1], i[2]),
                        l.uLabB.value.set(s[0], s[1], s[2]));
                      let b = k.uniforms;
                      (b.uBackground.value.set(h(d[0]), h(d[1]), h(d[2])),
                        b.uResolution.value.set(n, a),
                        (b.uGlow.value = m(e.glow, 0, 3)),
                        (b.uExposure.value = 1.6 * m(e.intensity, 0, 4)),
                        (b.uMode.value = +!!f),
                        (b.uGrain.value = V));
                    })(),
                    l.setRenderTarget(T),
                    l.setClearColor(0, 0),
                    l.clear(),
                    l.render(B, r));
                  let n = T;
                  for (let e of W)
                    ((v.uniforms.uSource.value = n.texture),
                      v.uniforms.uTexel.value.set(1 / n.width, 1 / n.height),
                      $(v, e),
                      (n = e));
                  let a = W[W.length - 1];
                  for (let e = W.length - 2; e >= 0; e--)
                    ((f.uniforms.uSource.value = a.texture),
                      (f.uniforms.uBase.value = W[e].texture),
                      f.uniforms.uTexel.value.set(1 / a.width, 1 / a.height),
                      $(f, j[e]),
                      (a = j[e]));
                  ((k.uniforms.uLines.value = T.texture),
                    (k.uniforms.uBloom.value = a.texture),
                    $(k, null));
                },
                ee = (e) => {
                  if (((R = 0), A)) return;
                  let l = Math.min(0.05, Math.max(0, (e - D) / 1e3));
                  ((D = e),
                    ((e) => {
                      let l = t.current,
                        n =
                          N && l.interactive && !l.reduced
                            ? m(l.hoverBoost, 0, 2)
                            : 0;
                      if (
                        ((G += (n - G) * (1 - Math.exp(-e / 0.4))),
                        (q += e),
                        l.paused || l.reduced)
                      )
                        return;
                      let a = m(l.speed, -4, 4) * (1 + 0.35 * G);
                      ((I += e * a),
                        (H += e * a * m(l.spin, -4, 4)),
                        (z += e * a * m(l.colorFlow, -2, 2)),
                        (V = (V + 0.618034) % 1));
                    })(l),
                    J());
                  let n = t.current,
                    a = !n.paused && !n.reduced,
                    r = N && n.interactive && !n.reduced ? n.hoverBoost : 0,
                    o =
                      Math.abs(G - r) > 0.002 ||
                      u.some((e) => e.w > 0 && q - e.y < 4);
                  U &&
                    !document.hidden &&
                    (a || o) &&
                    (R = requestAnimationFrame(ee));
                },
                et = () => {
                  A ||
                    R ||
                    !U ||
                    ((D = performance.now()), (R = requestAnimationFrame(ee)));
                },
                el = () => {
                  let n = e.getBoundingClientRect();
                  ((Y = Math.max(1, n.width)),
                    (X = Math.max(1, n.height)),
                    (O =
                      Math.min(window.devicePixelRatio || 1, 2) *
                      m(t.current.quality, 0.25, 1)),
                    l.setPixelRatio(O),
                    l.setSize(Y, X, !1));
                  let a = Math.round(Y * O),
                    r = Math.round(X * O);
                  (Z(), (T = L(a, r)));
                  let o = m(Math.floor(Math.log2(Math.min(a, r) / 8)), 3, 7);
                  for (let e = 1; e <= o; e++)
                    (W.push(L(Math.max(1, a >> e), Math.max(1, r >> e))),
                      j.push(L(Math.max(1, a >> e), Math.max(1, r >> e))));
                  (J(), et());
                },
                en = (e, t, l) => {
                  (u[_].set(e, q, t, l), (_ = (_ + 1) % 16), et());
                },
                ea = (t, l) => {
                  let n = e.getBoundingClientRect(),
                    { angle: a } = Q(),
                    r = 0.5 * n.height,
                    o = (t - n.left - n.width / 2) / r,
                    u = -(l - n.top - n.height / 2) / r,
                    i = Math.cos(a),
                    s = Math.sin(a);
                  return { x: i * o + s * u, y: -s * o + i * u };
                },
                er = (e) => {
                  let l,
                    n,
                    a = t.current;
                  if (
                    "touch" === e.pointerType ||
                    !a.interactive ||
                    (N || ((N = !0), et()),
                    !a.hoverPulses ||
                      a.reduced ||
                      50 > Math.hypot(e.clientX - K.x, e.clientY - K.y))
                  )
                    return;
                  let { frequency: r } = Q(),
                    o = ea(e.clientX, e.clientY),
                    u =
                      m(a.ribbonWidth, 0.02, 0.8) *
                      (1 + 0.22 * Math.sin(0.61 * o.x - 0.19 * I + 1.3)),
                    i = m(a.twist, 0, 8) * o.x + H,
                    s =
                      o.y -
                      ((l = o.x),
                      (n = I),
                      m(a.amplitude, 0, 1.5) *
                        (0.62 * Math.sin(l * r + 0.33 * n + 0.4) +
                          0.26 * Math.sin(l * r * 1.93 - 0.21 * n + 2.1) +
                          0.12 * Math.sin(l * r * 3.07 + 0.47 * n + 4.2)));
                  if (
                    Math.abs(s) >
                    u * Math.max(Math.abs(Math.cos(i)), 0.12) + 0.03
                  )
                    return;
                  ((K.x = e.clientX), (K.y = e.clientY));
                  let c = m(s / (u * Math.cos(i) || 0.001), -1, 1);
                  en(o.x, c, 1);
                },
                eo = () => {
                  ((N = !1), (K.x = -1e9), et());
                },
                eu = (e) => {
                  let l = t.current;
                  0 === e.button &&
                    l.interactive &&
                    l.clickPulse &&
                    !l.reduced &&
                    en(ea(e.clientX, e.clientY).x, 0, 2);
                };
              (e.addEventListener("pointermove", er),
                e.addEventListener("pointerleave", eo),
                e.addEventListener("pointercancel", eo),
                e.addEventListener("pointerdown", eu));
              let ei = new ResizeObserver(el);
              ei.observe(e);
              let es = new IntersectionObserver(
                (e) => {
                  (U = e.some((e) => e.isIntersecting)) && et();
                },
                { rootMargin: "80px" },
              );
              es.observe(e);
              let ec = () => {
                document.hidden || et();
              };
              document.addEventListener("visibilitychange", ec);
              let ed = (e) => e.preventDefault();
              return (
                n.addEventListener("webglcontextlost", ed),
                el(),
                {
                  sync: () => {
                    (Math.abs(
                      Math.min(window.devicePixelRatio || 1, 2) *
                        m(t.current.quality, 0.25, 1) -
                        O,
                    ) > 0.001
                      ? el()
                      : J(),
                      et());
                  },
                  destroy: () => {
                    ((A = !0),
                      cancelAnimationFrame(R),
                      e.removeEventListener("pointermove", er),
                      e.removeEventListener("pointerleave", eo),
                      e.removeEventListener("pointercancel", eo),
                      e.removeEventListener("pointerdown", eu),
                      document.removeEventListener("visibilitychange", ec),
                      n.removeEventListener("webglcontextlost", ed),
                      ei.disconnect(),
                      es.disconnect(),
                      Z(),
                      P.geometry.dispose(),
                      o.dispose(),
                      [c, v, f, k].forEach((e) => e.dispose()),
                      l.dispose(),
                      l.forceContextLoss(),
                      n.remove());
                  },
                  pulse: (l) => {
                    if (t.current.reduced) return;
                    let n = e.getBoundingClientRect();
                    en(
                      ea(n.left + m(l, 0, 1) * n.width, n.top + n.height / 2).x,
                      0,
                      2,
                    );
                  },
                }
              );
            })(e, Z);
            return (
              (V.current = t),
              () => {
                (t?.destroy(), (V.current = null));
              }
            );
          }, []),
          (0, a.useImperativeHandle)(
            X,
            () => ({ pulse: (e = 0.5) => V.current?.pulse(e) }),
            [],
          ),
          (0, n.jsx)("div", {
            ref: O,
            className: (0, c.cn)(
              "relative isolate h-full min-h-[240px] w-full overflow-hidden",
              N,
            ),
            style: { backgroundColor: t, ..._ },
            children:
              Y &&
              (0, n.jsx)("div", {
                className: "relative z-10 h-full w-full",
                children: Y,
              }),
          })
        );
      });
    k.displayName = "InterferenceRibbons";
    let F = {
        dark: ["#6B3CFF", "#D46BFF"],
        light: ["#5B2BFF", "#D13DB8"],
        wires: 64,
        lineWidth: 1.6,
        ribbonWidth: 0.24,
        amplitude: 0.6,
        twist: 1.6,
        curl: 0.25,
        stripes: 2.2,
        glow: 0.45,
        speed: 0.7,
        spin: 0.35,
      },
      P = {
        aurora: F,
        nebula: {
          ...F,
          dark: ["#3F5BFF", "#E26BFF"],
          light: ["#2B45E0", "#C43DD0"],
          stripes: 3,
        },
        electric: {
          ...F,
          dark: ["#2F6BFF", "#8A4BFF"],
          light: ["#1F4FE0", "#6A2BE0"],
          glow: 0.6,
        },
        mono: {
          ...F,
          dark: ["#FFFFFF", "#D9D6E8"],
          light: ["#111111", "#555555"],
          stripes: 1.4,
          glow: 0.35,
        },
        ember: {
          ...F,
          dark: ["#FF6A3D", "#FFC46B"],
          light: ["#D9480F", "#E08A00"],
        },
        silk: {
          ...F,
          wires: 40,
          lineWidth: 2.2,
          ribbonWidth: 0.3,
          amplitude: 0.5,
          twist: 0.9,
          curl: 0.15,
          stripes: 1,
          glow: 0.6,
          speed: 0.5,
          spin: 0.2,
        },
        dense: {
          ...F,
          wires: 128,
          lineWidth: 1.1,
          ribbonWidth: 0.26,
          stripes: 3.2,
          glow: 0.55,
        },
      },
      B = [
        { label: "Aurora", value: "aurora" },
        { label: "Nebula", value: "nebula" },
        { label: "Electric", value: "electric" },
        { label: "Mono", value: "mono" },
        { label: "Ember", value: "ember" },
        { label: "Silk", value: "silk" },
        { label: "Dense", value: "dense" },
      ],
      E = [
        { label: "Auto", value: "auto" },
        { label: "Glow", value: "glow" },
        { label: "Ink", value: "ink" },
      ],
      M = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#6B3CFF", "#D46BFF"]',
          description:
            "Two colours the strands cycle through, blended in OKLab. A deep shade of the first colour is derived automatically, so neighbouring strands never read as one flat band.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"#0A0A0A"',
          description: "Colour behind the ribbon.",
        },
        {
          name: "mode",
          type: '"auto" | "glow" | "ink"',
          default: '"auto"',
          description:
            "glow adds light for dark backgrounds, ink draws coloured strands for light ones. auto picks from the background brightness.",
        },
        {
          name: "wires",
          type: "number",
          default: "64",
          description:
            "Number of strands across the ribbon, from 4 to 160. Where the ribbon turns edge-on they stack into bright knots.",
        },
        {
          name: "lineWidth",
          type: "number",
          default: "1.6",
          description:
            "Width of the strands facing the viewer, in pixels. Strands on the far side of a twist thin out.",
        },
        {
          name: "ribbonWidth",
          type: "number",
          default: "0.24",
          description: "Width of the ribbon as a fraction of the height.",
        },
        {
          name: "amplitude",
          type: "number",
          default: "0.6",
          description: "How far the ribbon swings from the centre line.",
        },
        {
          name: "waveLength",
          type: "number",
          default: "1",
          description:
            "Length of the ribbon's swings. Larger values give longer, lazier curves.",
        },
        {
          name: "angle",
          type: "number",
          default: "42",
          description:
            "Direction the ribbon runs across the frame, in degrees.",
        },
        {
          name: "twist",
          type: "number",
          default: "1.6",
          description: "How many times the ribbon turns over along its length.",
        },
        {
          name: "curl",
          type: "number",
          default: "0.25",
          description:
            "Curves the ribbon's cross-section, so the strands bunch and fan apart as it turns.",
        },
        {
          name: "depth",
          type: "number",
          default: "0.65",
          description:
            "How much strands on the far side of a turn fade and thin, from 0 (flat) to 1.",
        },
        {
          name: "stripes",
          type: "number",
          default: "2.2",
          description:
            "How many times the colours cycle across the ribbon. 0 gives a single colour.",
        },
        {
          name: "colorFlow",
          type: "number",
          default: "0.04",
          description:
            "Speed at which the colour stripes drift along the strands. Negative values drift the other way.",
        },
        {
          name: "glow",
          type: "number",
          default: "0.45",
          description:
            "Soft haze around the strands, from 0 (crisp lines only) to 3.",
        },
        {
          name: "intensity",
          type: "number",
          default: "1",
          description: "Overall exposure.",
        },
        {
          name: "speed",
          type: "number",
          default: "0.7",
          description:
            "How fast the ribbon drifts and reshapes. Negative values run it backwards.",
        },
        {
          name: "spin",
          type: "number",
          default: "0.35",
          description: "How fast the twists roll along the ribbon.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description: "Respond to the pointer.",
        },
        {
          name: "hoverPulses",
          type: "boolean",
          default: "true",
          description:
            "Sweeping the pointer across the ribbon sends light running along the strands it crosses, like fibre optics.",
        },
        {
          name: "clickPulse",
          type: "boolean",
          default: "true",
          description:
            "Clicking sends a bright pulse through every strand, spreading both ways from the pointer.",
        },
        {
          name: "pulseSpeed",
          type: "number",
          default: "1.1",
          description: "How fast pulses travel along the strands.",
        },
        {
          name: "pulseStrength",
          type: "number",
          default: "1",
          description: "Brightness of the pulses, from 0 to 3.",
        },
        {
          name: "hoverBoost",
          type: "number",
          default: "1",
          description:
            "How much the ribbon brightens and quickens while the pointer is over it, from 0 to 2.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Freeze the drift. Pulses still run. Reduced-motion users always get a still frame.",
        },
        {
          name: "quality",
          type: "number",
          default: "1",
          description:
            "Resolution scale from 0.25 to 1. Lower values are cheaper on large screens.",
        },
        {
          name: "ref",
          type: "{ pulse }",
          default: "—",
          description:
            "pulse(x) sends a pulse through every strand from a horizontal position between 0 and 1, for example when a form is submitted.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description: "Content placed over the background.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element. It fills its parent, with a 240px minimum height.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      L = () => {
        let [e, t] = (0, u.I)(),
          l = "dark" === (0, o.Y)(),
          [i, s] = (0, a.useState)("aurora"),
          [c, d] = (0, a.useState)(F),
          v = (e) => (t) => d((l) => ({ ...l, [e]: t })),
          [m, f] = (0, a.useState)(null),
          p = m ?? (l ? c.dark : c.light),
          h = (e) => (t) => {
            let l = [...p];
            ((l[e] = t), f(l));
          },
          [x, g] = (0, a.useState)(null),
          b = x ?? (l ? "#0A0A0A" : "#FFFFFF"),
          [w, y] = (0, a.useState)("auto"),
          [S, C] = (0, a.useState)(1),
          [L, T] = (0, a.useState)(42),
          [W, j] = (0, a.useState)(0.65),
          [A, R] = (0, a.useState)(0.04),
          [D, U] = (0, a.useState)(1),
          [I, q] = (0, a.useState)(1.1),
          [H, z] = (0, a.useState)(1),
          [G, N] = (0, a.useState)(1),
          [_, Y] = (0, a.useState)(!0),
          [X, O] = (0, a.useState)(!0),
          [V, K] = (0, a.useState)(!0),
          [Z, $] = (0, a.useState)(!1);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(r.Bg, {}),
            (0, n.jsxs)(r.VX, {
              children: [
                (0, n.jsxs)(r.Ec, {
                  children: [
                    (0, n.jsx)(r.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, n.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, n.jsx)(
                          k,
                          {
                            colors: p,
                            backgroundColor: b,
                            mode: w,
                            wires: c.wires,
                            lineWidth: c.lineWidth,
                            ribbonWidth: c.ribbonWidth,
                            amplitude: c.amplitude,
                            waveLength: S,
                            angle: L,
                            twist: c.twist,
                            curl: c.curl,
                            depth: W,
                            stripes: c.stripes,
                            colorFlow: A,
                            glow: c.glow,
                            intensity: D,
                            speed: c.speed,
                            spin: c.spin,
                            interactive: V,
                            hoverPulses: _,
                            clickPulse: X,
                            pulseSpeed: I,
                            pulseStrength: H,
                            hoverBoost: G,
                            paused: Z,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(r.IH, {
                      children: [
                        (0, n.jsx)(r.bg, {
                          title: "Preset",
                          value: i,
                          options: B,
                          onChange: (e) => {
                            (s(e), d(P[e] ?? F), f(null));
                          },
                        }),
                        (0, n.jsx)(r.bg, {
                          title: "Mode",
                          value: w,
                          options: E,
                          onChange: (e) => y(e),
                        }),
                        (0, n.jsx)(r.W7, {
                          title: "Color A",
                          value: p[0],
                          onChange: h(0),
                        }),
                        (0, n.jsx)(r.W7, {
                          title: "Color B",
                          value: p[1],
                          onChange: h(1),
                        }),
                        (0, n.jsx)(r.W7, {
                          title: "Background",
                          value: b,
                          onChange: g,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Wires",
                          min: 4,
                          max: 160,
                          step: 1,
                          value: c.wires,
                          onChange: v("wires"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Line Width",
                          min: 0.4,
                          max: 4,
                          step: 0.05,
                          value: c.lineWidth,
                          valueUnit: "px",
                          onChange: v("lineWidth"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Ribbon Width",
                          min: 0.05,
                          max: 0.6,
                          step: 0.01,
                          value: c.ribbonWidth,
                          onChange: v("ribbonWidth"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Amplitude",
                          min: 0,
                          max: 1.2,
                          step: 0.01,
                          value: c.amplitude,
                          onChange: v("amplitude"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Wave Length",
                          min: 0.4,
                          max: 3,
                          step: 0.05,
                          value: S,
                          onChange: C,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Angle",
                          min: -90,
                          max: 90,
                          step: 1,
                          value: L,
                          valueUnit: "\xb0",
                          onChange: T,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Twist",
                          min: 0,
                          max: 6,
                          step: 0.05,
                          value: c.twist,
                          onChange: v("twist"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Curl",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.curl,
                          onChange: v("curl"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Depth",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: W,
                          onChange: j,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Stripes",
                          min: 0,
                          max: 8,
                          step: 0.1,
                          value: c.stripes,
                          onChange: v("stripes"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Color Flow",
                          min: -0.3,
                          max: 0.3,
                          step: 0.01,
                          value: A,
                          onChange: R,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Glow",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: c.glow,
                          onChange: v("glow"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Intensity",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: D,
                          onChange: U,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Speed",
                          min: -2,
                          max: 2,
                          step: 0.05,
                          value: c.speed,
                          onChange: v("speed"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Spin",
                          min: -2,
                          max: 2,
                          step: 0.05,
                          value: c.spin,
                          onChange: v("spin"),
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Pulse Speed",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: I,
                          onChange: q,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Pulse Strength",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: H,
                          onChange: z,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Hover Boost",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: G,
                          onChange: N,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Hover Pulses",
                          checked: _,
                          onChange: Y,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Click Pulse",
                          checked: X,
                          onChange: O,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Interactive",
                          checked: V,
                          onChange: K,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Paused",
                          checked: Z,
                          onChange: $,
                        }),
                      ],
                    }),
                    (0, n.jsx)(r.Ub, { data: M }),
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
