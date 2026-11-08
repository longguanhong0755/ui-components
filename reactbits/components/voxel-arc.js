/* ReactBits Pro public preview module 99159 for voxel-arc.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/99159.5448d9389605668d.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  99159: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => E }));
    var a = r(95155),
      o = r(12115),
      l = r(56388),
      n = r(86049),
      i = r(90761),
      u = r(2253),
      s = r(12246),
      c = r(90650);
    let p = 1 / 120,
      v = (e, t, r) => Math.min(r, Math.max(t, e)),
      d = (e, t) => (Number.isFinite(e) ? e : t),
      m = new u.Q1f(),
      f = (e) => {
        let t = e.trim().toLowerCase();
        if (!t || "transparent" === t || "none" === t || "auto" === t)
          return null;
        try {
          m.setStyle(t, u.jf0);
        } catch {
          return null;
        }
        return [m.r, m.g, m.b];
      },
      h = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      g = (e) =>
        e <= 0.0031308 ? 12.92 * e : 1.055 * Math.pow(e, 1 / 2.4) - 0.055,
      x = ([e, t, r]) => {
        let a = h(e),
          o = h(t),
          l = h(r),
          n = Math.cbrt(0.4122214708 * a + 0.5363325363 * o + 0.0514459929 * l),
          i = Math.cbrt(0.2119034982 * a + 0.6806995451 * o + 0.1073969566 * l),
          u = Math.cbrt(0.0883024619 * a + 0.2817188376 * o + 0.6299787005 * l);
        return [
          0.2104542553 * n + 0.793617785 * i - 0.0040720468 * u,
          1.9779984951 * n - 2.428592205 * i + 0.4505937099 * u,
          0.0259040371 * n + 0.7827717662 * i - 0.808675766 * u,
        ];
      },
      y = ([e, t, r]) => {
        let a = Math.pow(e + 0.3963377774 * t + 0.2158037573 * r, 3),
          o = Math.pow(e - 0.1055613458 * t - 0.0638541728 * r, 3),
          l = Math.pow(e - 0.0894841775 * t - 1.291485548 * r, 3);
        return [
          v(g(4.0767416621 * a - 3.3077115913 * o + 0.2309699292 * l), 0, 1),
          v(g(-1.2684380046 * a + 2.6097574011 * o - 0.3413193965 * l), 0, 1),
          v(g(-0.0041960863 * a - 0.7034186147 * o + 1.707614701 * l), 0, 1),
        ];
      },
      b = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      w = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      C = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      z = `
attribute vec3 iVoxel;
uniform float uTime;
uniform float uAmp;
uniform float uWaveScale;
uniform float uTurb;
uniform float uCurveX;
uniform float uCurveZ;
uniform float uCell;
uniform float uFill;
uniform float uTilt;
uniform float uFocusDepth;
uniform float uAperture;
uniform float uFocalPx;
uniform vec2 uViewport;
uniform float uNear;
uniform float uFar;
uniform float uSpread;
uniform float uIntro;
uniform float uGlow;
uniform float uBright;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uInk;
uniform sampler2D uRipple;
uniform vec4 uRippleRect;
uniform vec2 uRippleTexel;
uniform float uRippleOn;
varying vec2 vQuad;
varying vec2 vHalf;
varying float vSigma;
varying vec3 vColor;
varying float vAlpha;

const float TAU = 6.28318530718;

vec3 component(vec2 p, vec2 dir, float wavelength, float amp, float rate, float phase) {
  float k = TAU / wavelength;
  vec2 d = normalize(dir);
  float theta = k * dot(d, p) + rate * uTime + phase;
  return vec3(amp * sin(theta), amp * k * cos(theta) * d);
}

vec3 surface(vec2 p) {
  float L = uWaveScale;
  vec3 h = component(p, vec2(0.14, 1.0), 3.3 * L, 0.55, 1.0, 0.0);
  h += component(p, vec2(-0.48, 1.0), 2.15 * L, 0.32, 1.22, 1.9);
  h += component(p, vec2(0.82, 0.62), 1.45 * L, 0.2, 1.5, 4.2);
  h += component(p, vec2(-0.86, 0.42), 0.95 * L, 0.13 * (0.35 + uTurb), 1.95, 2.6);
  h += component(p, vec2(0.33, -0.9), 0.64 * L, 0.09 * uTurb, 2.6, 5.3);
  h += component(p, vec2(-0.2, 0.95), 0.41 * L, 0.05 * uTurb, 3.4, 0.7);
  return h * uAmp;
}

float rippleTap(vec2 st) {
  return texture2D(uRipple, (st + 0.5) * uRippleTexel).r;
}

float rippleSample(vec2 uv) {
  vec2 st = uv / uRippleTexel - 0.5;
  vec2 i = floor(st);
  vec2 f = st - i;
  float a = rippleTap(i);
  float b = rippleTap(i + vec2(1.0, 0.0));
  float c = rippleTap(i + vec2(0.0, 1.0));
  float d = rippleTap(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 ripple(vec2 p) {
  if (uRippleOn < 0.5) return vec3(0.0);
  vec2 span = uRippleRect.zw - uRippleRect.xy;
  vec2 uv = (p - uRippleRect.xy) / span;
  if (uv.x <= 0.01 || uv.y <= 0.01 || uv.x >= 0.99 || uv.y >= 0.99) return vec3(0.0);
  float h0 = rippleSample(uv);
  float hx = rippleSample(uv + vec2(uRippleTexel.x, 0.0));
  float hz = rippleSample(uv + vec2(0.0, uRippleTexel.y));
  vec2 cell = span * uRippleTexel;
  return vec3(h0, (hx - h0) / cell.x, (hz - h0) / cell.y);
}

void main() {
  vec2 p = iVoxel.xy;
  vec3 w = surface(p);
  vec3 r = ripple(p);
  float h = w.x + r.x;
  vec2 g = w.yz + r.yz;
  float drop = p.x * p.x * uCurveX + p.y * p.y * uCurveZ;
  vec3 world = vec3(p.x, h - drop, -p.y);
  vec4 viewPos = modelViewMatrix * vec4(world, 1.0);
  float depth = max(-viewPos.z, 0.05);
  vec4 clip = projectionMatrix * viewPos;

  vec3 normal = normalize(vec3(-g.x + 2.0 * p.x * uCurveX, 1.0, g.y - 2.0 * p.y * uCurveZ));
  vec3 toCamera = normalize(cameraPosition - world);
  float facing = clamp(dot(normal, toCamera), 0.06, 1.0);
  float size = uCell * uFill * uFocalPx / depth;
  vec2 core = vec2(size, size * mix(1.0, facing, uTilt));
  float coc = uAperture * uFocalPx * abs(1.0 / depth - 1.0 / uFocusDepth);
  float sigma = max(coc * 0.42, 0.42);
  vec2 extent = core * 0.5 + 2.6 * sigma + 0.5;
  vec2 corner = position.xy * extent;
  gl_Position = clip + vec4(corner / uViewport * 2.0 * clip.w, 0.0, 0.0);
  vQuad = corner;
  vHalf = core * 0.5;
  vSigma = sigma;

  float t = clamp((p.y - uNear) / max(uFar - uNear, 0.001), 0.0, 1.0);
  float side = abs(p.x) / max(p.y * uSpread, 0.001);
  float edge = (1.0 - smoothstep(0.94, 1.0, t)) * (1.0 - smoothstep(0.72, 1.0, side));
  float crest = smoothstep(-0.25, 1.05, h / max(uAmp * 0.62, 0.001));
  float lateral = 1.0 - 0.6 * side * side;
  float limb = exp(-(1.0 - t) * 6.5) * lateral;
  float depthLight = mix(0.45, 1.0, smoothstep(0.0, 0.55, t));
  float front = uIntro * 1.3 - (1.0 - t);
  float reveal = smoothstep(0.0, 0.22, front);
  float sweep = exp(-front * front / 0.004) * step(uIntro, 0.999) * 0.9;
  float energy = (0.018 + 0.9 * pow(crest, 2.4)) * depthLight * lateral + uGlow * limb * (0.25 + 0.95 * crest);
  float light = (energy * reveal + sweep * (0.4 + crest)) * edge * uBright;
  float tone = smoothstep(0.1, 0.95, light);
  vec3 tint = mix(uColorA, uColorB, tone);
  if (uInk > 0.5) {
    vColor = mix(uColorB, uColorA, smoothstep(0.05, 0.7, energy));
    vAlpha = clamp((0.28 + energy * 2.0) * uBright, 0.0, 1.0) * edge * max(reveal, sweep) * (0.55 + 0.45 * depthLight);
  } else {
    vColor = tint * light + vec3(1.0) * max(light - 0.9, 0.0) * 0.45;
    vAlpha = 1.0;
  }
}
`,
      S = `
uniform float uRound;
uniform float uInk;
varying vec2 vQuad;
varying vec2 vHalf;
varying float vSigma;
varying vec3 vColor;
varying float vAlpha;

float erfApprox(float x) {
  float x2 = x * x;
  float t = 1.0 - exp(-x2 * (1.27323954 + 0.147 * x2) / (1.0 + 0.147 * x2));
  return sign(x) * sqrt(max(t, 0.0));
}

float blurred(float x, float halfSize, float sigma) {
  float k = 0.70710678 / sigma;
  return 0.5 * (erfApprox((x + halfSize) * k) - erfApprox((x - halfSize) * k));
}

void main() {
  float soft = blurred(vQuad.x, vHalf.x, vSigma) * blurred(vQuad.y, vHalf.y, vSigma);
  float radius = uRound * min(vHalf.x, vHalf.y);
  vec2 q = abs(vQuad) - vHalf + radius;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  float sharp = 1.0 - smoothstep(-0.6, 0.6, d);
  float k = max(smoothstep(0.55, 1.4, vSigma), 1.0 - smoothstep(1.6, 3.2, min(vHalf.x, vHalf.y) * 2.0));
  float coverage = mix(sharp, soft, k);
  if (coverage < 0.002) discard;
  if (uInk > 0.5) {
    float a = coverage * vAlpha;
    gl_FragColor = vec4(vColor * a, a);
  } else {
    gl_FragColor = vec4(vColor * coverage, 1.0);
  }
}
`,
      k = `
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
      F = `
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
      T = `
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform vec3 uHazeColor;
uniform vec3 uArc;
uniform float uHaze;
uniform float uBloomStrength;
uniform float uGrain;
uniform float uTime;
uniform float uInk;
uniform float uIntro;
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
  float dx = vUv.x - 0.5;
  float arc = uArc.x - uArc.y * dx * dx;
  float offset = vUv.y - arc;
  float spread = 1.0 - clamp(dx * dx * uArc.z, 0.0, 0.85);
  float profile = offset > 0.0
    ? exp(-offset / 0.045) + exp(-offset / 0.15) * 0.2
    : 1.2 * exp(offset / 0.03);
  float haze = profile * spread * uHaze * uIntro;
  vec4 scene = texture2D(uScene, vUv);
  float n = hash(gl_FragCoord.xy + fract(uTime * 13.0) * 911.0) - 0.5;
  if (uInk > 0.5) {
    float cover = clamp(scene.a, 0.0, 1.0);
    vec3 ink = scene.rgb / max(scene.a, 0.0001);
    vec3 color = mix(uBackground, ink, cover * 0.94);
    color = mix(color, uHazeColor, clamp(haze * 0.16, 0.0, 0.4));
    float mask = smoothstep(0.0, 0.05, cover + haze * 0.2);
    color += n * uGrain * 0.06 * mask;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    return;
  }
  vec3 emission = scene.rgb + texture2D(uBloom, vUv).rgb * uBloomStrength + uHazeColor * haze;
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
      M = (0, o.forwardRef)(function (
        {
          color: e = "#5227FF",
          accentColor: t = "#B19EEF",
          backgroundColor: r = "transparent",
          density: l = 1,
          voxelSize: n = 0.55,
          roundness: i = 0.2,
          tilt: m = 1,
          horizon: g = 0.56,
          curvature: M = 0.5,
          waveHeight: j = 1,
          waveLength: A = 1,
          speed: R = 0.5,
          turbulence: H = 0.4,
          brightness: E = 1,
          glow: L = 1,
          haze: I = 0.7,
          bloom: B = 0.5,
          focus: P = 0.25,
          aperture: q = 0.35,
          grain: D = 0.25,
          interactive: U = !0,
          ripples: N = 1,
          intro: W = !0,
          paused: G = !1,
          dpr: V = 2,
          children: _,
          className: O,
          style: Z,
        },
        Q,
      ) {
        let X = (0, o.useRef)(null),
          Y = (0, o.useRef)(null),
          K = (0, o.useRef)(null),
          J = {
            color: e,
            accentColor: t,
            backgroundColor: r,
            density: l,
            voxelSize: n,
            roundness: i,
            tilt: m,
            horizon: g,
            curvature: M,
            waveHeight: j,
            waveLength: A,
            speed: R,
            turbulence: H,
            brightness: E,
            glow: L,
            haze: I,
            bloom: B,
            focus: P,
            aperture: q,
            grain: D,
            interactive: U,
            ripples: N,
            intro: W,
            paused: G,
            dpr: V,
            reduced: (0, o.useSyncExternalStore)(b, w, () => !1),
          },
          $ = (0, o.useRef)(J);
        ((0, o.useEffect)(() => {
          (($.current = J), K.current?.sync());
        }),
          (0, o.useEffect)(() => {
            let e = X.current,
              t = Y.current;
            if (!e || !t) return;
            let r = (function (e, t, r) {
              let a,
                o = e.ownerDocument,
                l = o.defaultView ?? window,
                n = o.createElement("canvas");
              (n.setAttribute("aria-hidden", "true"),
                (n.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block"));
              try {
                a = new s.WebGLRenderer({
                  canvas: n,
                  alpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (t.appendChild(n), (a.autoClear = !1));
              let i = new u.ubm(26, 1, 0.1, 200);
              i.position.set(0, 3, 0);
              let c = new u.qUd(-1, 1, 1, -1, -1, 1),
                m = new u.bdM(2, 2),
                g = new u.Z58(),
                b = new u.eaF(m);
              ((b.frustumCulled = !1), g.add(b));
              let w = new u.CmU();
              ((w.index = m.index),
                w.setAttribute("position", m.getAttribute("position")));
              let M = new Float32Array(3),
                j = new u.uWO(M, 3);
              (w.setAttribute("iVoxel", j), (w.instanceCount = 0));
              let A = new Float32Array(24576),
                R = new Float32Array(24576),
                H = new Float32Array(24576),
                E = new u.GYF(A, 192, 128, u.VT0, u.RQf);
              ((E.minFilter = u.hxR),
                (E.magFilter = u.hxR),
                (E.needsUpdate = !0));
              let L = new u.Pq0(0.2, 0.1, 1),
                I = new u.Pq0(0.6, 0.5, 1),
                B = new u.Pq0(0.04, 0.04, 0.04),
                P = new u.Pq0(0.3, 0.2, 0.9),
                q = new u.IUQ(-8, 5, 8, 18),
                D = new u.BKk({
                  uniforms: {
                    uTime: { value: 0 },
                    uAmp: { value: 0.18 },
                    uWaveScale: { value: 1 },
                    uTurb: { value: 0.4 },
                    uCurveX: { value: 0.006 },
                    uCurveZ: { value: 0.0015 },
                    uCell: { value: 0.06 },
                    uFill: { value: 0.55 },
                    uTilt: { value: 0.6 },
                    uFocusDepth: { value: 8 },
                    uAperture: { value: 0.1 },
                    uFocalPx: { value: 1e3 },
                    uViewport: { value: new u.I9Y(1, 1) },
                    uNear: { value: 5 },
                    uFar: { value: 18 },
                    uSpread: { value: 0.5 },
                    uIntro: { value: 1 },
                    uGlow: { value: 1 },
                    uBright: { value: 1 },
                    uColorA: { value: L },
                    uColorB: { value: I },
                    uInk: { value: 0 },
                    uRound: { value: 0.2 },
                    uRipple: { value: E },
                    uRippleRect: { value: q },
                    uRippleTexel: {
                      value: new u.I9Y(0.005208333333333333, 0.0078125),
                    },
                    uRippleOn: { value: 0 },
                  },
                  vertexShader: z,
                  fragmentShader: S,
                  transparent: !0,
                  blending: u.EZo,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                U = new u.eaF(w, D);
              U.frustumCulled = !1;
              let N = new u.Z58();
              N.add(U);
              let W = () =>
                  new u.nWS(1, 1, {
                    type: u.ix0,
                    format: u.GWd,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    minFilter: u.k6q,
                    magFilter: u.k6q,
                    generateMipmaps: !1,
                  }),
                G = W(),
                V = Array.from({ length: 5 }, W),
                _ = new u.BKk({
                  uniforms: {
                    uSource: { value: null },
                    uTexel: { value: new u.I9Y() },
                    uThreshold: { value: 0 },
                  },
                  vertexShader: C,
                  fragmentShader: k,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                O = new u.BKk({
                  uniforms: {
                    uSource: { value: null },
                    uTexel: { value: new u.I9Y() },
                  },
                  vertexShader: C,
                  fragmentShader: F,
                  blending: u.EZo,
                  transparent: !0,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                Z = new u.BKk({
                  uniforms: {
                    uScene: { value: G.texture },
                    uBloom: { value: V[0].texture },
                    uBackground: { value: B },
                    uHazeColor: { value: P },
                    uArc: { value: new u.Pq0(0.44, 0.1, 1) },
                    uHaze: { value: 0.8 },
                    uBloomStrength: { value: 0.6 },
                    uGrain: { value: 0.25 },
                    uTime: { value: 0 },
                    uInk: { value: 0 },
                    uIntro: { value: 1 },
                  },
                  vertexShader: C,
                  fragmentShader: T,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                Q = 0,
                X = 0,
                Y = 1,
                K = !1,
                J = "",
                $ = "",
                ee = !1,
                et = [0.04, 0.04, 0.04],
                er = -10,
                ea = 0,
                eo = -1,
                el = !1,
                en = !1,
                ei = 0,
                eu = 0,
                es = 5,
                ec = 0.5,
                ep = 0,
                ev = 0,
                ed = !1,
                em = !1,
                ef = !1,
                eh = null,
                eg = [],
                ex = () => {
                  let t = r.current,
                    a = [
                      (et =
                        f(t.backgroundColor) ??
                        (() => {
                          let t = e.parentElement;
                          for (; t;) {
                            let e = l
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
                          let r = l
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
                      t.color,
                      t.accentColor,
                    ].join("|");
                  if (a === $) return;
                  (($ = a),
                    (ee =
                      0.2126 * et[0] + 0.7152 * et[1] + 0.0722 * et[2] > 0.55),
                    B.set(et[0], et[1], et[2]));
                  let o = x(f(t.color) ?? [0.32, 0.15, 1]),
                    n = x(f(t.accentColor) ?? [0.69, 0.62, 0.94]),
                    i = (e) => Math.hypot(e[1], e[2]),
                    u = (e, t, r) => {
                      if (!ee) return e;
                      let a = e;
                      0.03 > i(e) && i(t) >= 0.03 && (a = t);
                      let o = i(a);
                      if (o < 0.03) return [0.3, 0, 0];
                      let l = Math.max(1, 0.14 / o);
                      return [v(a[0], 0.32, r), a[1] * l, a[2] * l];
                    },
                    s = y(u(o, n, 0.5)),
                    c = y(u(n, o, 0.6));
                  (ee
                    ? (L.set(s[0], s[1], s[2]),
                      I.set(c[0], c[1], c[2]),
                      P.set(c[0], c[1], c[2]))
                    : (L.set(h(s[0]), h(s[1]), h(s[2])),
                      I.set(h(c[0]), h(c[1]), h(c[2])),
                      P.set(
                        (0.55 * L.x + 0.45 * I.x) * 0.16,
                        (0.55 * L.y + 0.45 * I.y) * 0.16,
                        (0.55 * L.z + 0.45 * I.z) * 0.16,
                      )),
                    (D.uniforms.uInk.value = +!!ee),
                    (Z.uniforms.uInk.value = +!!ee));
                },
                ey = () => {
                  let t = r.current,
                    o = Math.round(e.clientWidth),
                    n = Math.round(e.clientHeight);
                  if (o < 2 || n < 2) return ((K = !1), !1);
                  let i = Math.min(
                    l.devicePixelRatio || 1,
                    v(d(t.dpr, 2), 0.5, 3),
                  );
                  if (K && o === Q && n === X && i === Y) return !1;
                  ((K = !0),
                    (Q = o),
                    (X = n),
                    (Y = i),
                    a.setPixelRatio(Y),
                    a.setSize(Q, X, !1),
                    G.setSize(Math.round(Q * Y), Math.round(X * Y)));
                  let u = Math.round(Q * Y),
                    s = Math.round(X * Y);
                  for (let e of V)
                    ((u = Math.max(1, Math.round(u / 2))),
                      (s = Math.max(1, Math.round(s / 2))),
                      e.setSize(u, s));
                  return ((J = ""), !0);
                },
                eb = (t, r) => {
                  let a = e.getBoundingClientRect();
                  if (a.width <= 0 || a.height <= 0) return null;
                  let o = ((t - a.left) / a.width) * 2 - 1,
                    l = -(((r - a.top) / a.height) * 2 - 1),
                    n = new u.Pq0(o, l, 0.5)
                      .unproject(i)
                      .sub(i.position)
                      .normalize();
                  if (n.y >= -1e-4) return null;
                  let s = -i.position.y / n.y,
                    c = i.position.x + n.x * s,
                    p = -(i.position.z + n.z * s);
                  return p < es || p > 18 ? null : { x: c, z: p };
                },
                ew = (e, t, r, a) => {
                  let o = ((e - q.x) / (q.z - q.x)) * 192,
                    l = ((t - q.y) / (q.w - q.y)) * 128,
                    n = Math.max(1, a),
                    i = Math.ceil(2.5 * n),
                    u = Math.round(o),
                    s = Math.round(l);
                  for (let e = s - i; e <= s + i; e++)
                    if (!(e < 1) && !(e >= 127))
                      for (let t = u - i; t <= u + i; t++) {
                        if (t < 1 || t >= 191) continue;
                        let a =
                          -r *
                          Math.exp(
                            -(
                              ((t - o) * (t - o) + (e - l) * (e - l)) /
                              (n * n)
                            ),
                          );
                        ((A[192 * e + t] += a), (R[192 * e + t] += 0.6 * a));
                      }
                  ((en = !0), (ei = 0), (D.uniforms.uRippleOn.value = 1));
                },
                eC = () => {
                  let e = 0;
                  for (let t = 1; t < 127; t++) {
                    let r = 192 * t;
                    for (let t = 1; t < 191; t++) {
                      let a = r + t,
                        o =
                          A[a - 1] +
                          A[a + 1] +
                          A[a - 192] +
                          A[a + 192] -
                          4 * A[a],
                        l = (2 * A[a] - R[a] + 0.1 * o) * 0.9962;
                      H[a] = l;
                      let n = l < 0 ? -l : l;
                      n > e && (e = n);
                    }
                  }
                  let t = R;
                  return ((R = A), (A = H), (H = t), e);
                },
                ez = () => {
                  em || ef || !ed || ep || (ep = requestAnimationFrame(ek));
                },
                eS = () => {
                  let e, t;
                  if (!K) return;
                  let o = r.current;
                  (performance.now() - er > 1e3 &&
                    ((er = performance.now()), ex()),
                    (() => {
                      let e = r.current,
                        t = Q / X,
                        a = [
                          Q,
                          X,
                          Y,
                          e.horizon,
                          e.curvature,
                          e.density,
                          e.voxelSize,
                          e.focus,
                          e.aperture,
                        ].join("|");
                      if (a === J) return;
                      J = a;
                      let o = u.cj9.degToRad(13),
                        l = Math.tan(o),
                        n = l * t,
                        s = v(d(e.curvature, 0.5), 0, 1.5),
                        c = 0.034 * s * Math.pow(1.8 / v(t, 1.05, 3), 2),
                        p = 0.0012 * s,
                        m = v(d(e.horizon, 0.56), 0.12, 0.92),
                        f = v(
                          Math.atan((3 + 324 * p) / 18) +
                            Math.atan((1 - 2 * m) * l),
                          0.02,
                          1.2,
                        );
                      ((i.aspect = t),
                        (i.fov = 26),
                        i.rotation.set(-f, 0, 0),
                        i.updateProjectionMatrix(),
                        i.updateMatrixWorld(!0));
                      let h = f + o;
                      ((es = v(
                        (es =
                          h < Math.PI / 2 - 0.02
                            ? (3 / Math.tan(h)) * 0.86
                            : 0.5),
                        0.4,
                        16,
                      )),
                        (ec = 1.12 * n));
                      let g = (X * Y * 0.5) / l,
                        x = (e) => e * Math.cos(f) + 3 * Math.sin(f),
                        y = (e) => x(e) * ec,
                        b = (0.5 * X) / l / x(es),
                        C =
                          v(0.0165 * X, 6, 13) / v(d(e.density, 1), 0.3, 3) / b,
                        z = (e) => {
                          let t = 0;
                          for (let r = es; r <= 18; r += e)
                            t += 2 * Math.floor(y(r) / e) + 1;
                          return t;
                        },
                        S = z(C);
                      (S > 11e4 &&
                        ((C *= 1.02 * Math.sqrt(S / 11e4)), (S = z(C))),
                        M.length < 3 * S &&
                          ((M = new Float32Array(3 * Math.ceil(1.1 * S))),
                          (j = new u.uWO(M, 3)),
                          w.setAttribute("iVoxel", j)));
                      let k = 0,
                        F = 0;
                      for (let e = es; e <= 18 && k < S; e += C, F++) {
                        let t = Math.floor(y(e) / C);
                        for (let r = -t; r <= t && k < S; r++)
                          ((M[3 * k] = r * C),
                            (M[3 * k + 1] = e),
                            (M[3 * k + 2] = (7919 * F + 104729 * r) % 997),
                            k++);
                      }
                      ((j.needsUpdate = !0), (w.instanceCount = k));
                      let T = v(d(e.voxelSize, 0.55), 0.1, 1),
                        A = v(d(e.focus, 0.25), 0, 1),
                        R = D.uniforms;
                      ((R.uCell.value = C),
                        (R.uFill.value = T),
                        (R.uCurveX.value = c),
                        (R.uCurveZ.value = p),
                        (R.uFocalPx.value = g),
                        R.uViewport.value.set(Q * Y, X * Y),
                        (R.uNear.value = es),
                        (R.uFar.value = 18),
                        (R.uSpread.value = ec),
                        (R.uFocusDepth.value = x(es + (18 - es) * A)),
                        (R.uAperture.value =
                          0.16 * v(d(e.aperture, 0.35), 0, 2)));
                      let H = y(18);
                      q.set(-H, es, H, 18);
                      let E = (e, t) => {
                          let r = new u.Pq0(
                            e,
                            -(e * e * c + t * t * p),
                            -t,
                          ).project(i);
                          return { x: 0.5 * r.x + 0.5, y: 0.5 * r.y + 0.5 };
                        },
                        L = E(0, 18),
                        I = E(0.8 * H, 18),
                        B = I.x - 0.5,
                        P = 0 !== B ? (L.y - I.y) / (B * B) : 0;
                      Z.uniforms.uArc.value.set(L.y, Math.max(0, P), 1.4);
                    })(),
                    (e = r.current),
                    ((t = D.uniforms).uAmp.value =
                      0.17 * v(d(e.waveHeight, 1), 0, 3)),
                    (t.uWaveScale.value = v(d(e.waveLength, 1), 0.25, 4)),
                    (t.uTurb.value = v(d(e.turbulence, 0.4), 0, 1.5)),
                    (t.uTilt.value = v(d(e.tilt, 1), 0, 1)),
                    (t.uRound.value = v(d(e.roundness, 0.2), 0, 1)),
                    (t.uGlow.value = v(d(e.glow, 1), 0, 3)),
                    (t.uBright.value = v(d(e.brightness, 1), 0, 3)),
                    (Z.uniforms.uHaze.value = v(d(e.haze, 0.7), 0, 3)),
                    (Z.uniforms.uBloomStrength.value = v(
                      d(e.bloom, 0.5),
                      0,
                      3,
                    )),
                    (Z.uniforms.uGrain.value = v(d(e.grain, 0.25), 0, 1)),
                    (D.blending = ee ? u.bCz : u.EZo),
                    ee &&
                      ((D.blendEquation = u.gO9),
                      (D.blendSrc = u.qad),
                      (D.blendDst = u.qad),
                      (D.blendEquationAlpha = u.gO9),
                      (D.blendSrcAlpha = u.qad),
                      (D.blendDstAlpha = u.qad)),
                    a.setRenderTarget(G),
                    a.setClearColor(0, 0),
                    a.clear(),
                    a.render(N, i));
                  let l = ee ? 0 : v(d(o.bloom, 0.5), 0, 3);
                  if (l > 0.001) {
                    let e = G;
                    for (let t of ((b.material = _), V))
                      ((_.uniforms.uThreshold.value = 0.32 * (e === G)),
                        (_.uniforms.uSource.value = e.texture),
                        _.uniforms.uTexel.value.set(1 / e.width, 1 / e.height),
                        a.setRenderTarget(t),
                        a.render(g, c),
                        (e = t));
                    b.material = O;
                    for (let e = V.length - 1; e > 0; e--)
                      ((O.uniforms.uSource.value = V[e].texture),
                        O.uniforms.uTexel.value.set(
                          1 / V[e].width,
                          1 / V[e].height,
                        ),
                        a.setRenderTarget(V[e - 1]),
                        a.render(g, c));
                  }
                  ((Z.uniforms.uBloomStrength.value = l),
                    (Z.uniforms.uTime.value = ea),
                    (b.material = Z),
                    a.setRenderTarget(null),
                    a.render(g, c));
                },
                ek = (e) => {
                  if (((ep = 0), em || ef)) return;
                  let t = r.current,
                    a =
                      ev && e - ev < 100
                        ? Math.min(Math.max((e - ev) / 1e3, 0), 0.05)
                        : 1 / 60;
                  ev = e;
                  let o = !t.reduced && !t.paused;
                  if (
                    (o && (ea += a * v(d(t.speed, 0.5), 0, 4)),
                    (D.uniforms.uTime.value = ea),
                    !t.intro || t.reduced || el)
                  )
                    ((el = !0),
                      (D.uniforms.uIntro.value = 1),
                      (Z.uniforms.uIntro.value = 1));
                  else {
                    eo < 0 && (eo = e);
                    let t = v((e - eo) / 2600, 0, 1);
                    ((D.uniforms.uIntro.value = t),
                      (Z.uniforms.uIntro.value = v(1.25 * t, 0, 1)),
                      t >= 1 && (el = !0));
                  }
                  for (let e of eg.splice(0)) ew(e.x, e.z, e.amount, e.radius);
                  if (en && o) {
                    eu += a;
                    let e = 1,
                      t = 0;
                    for (; eu >= p && t < 4;) ((e = eC()), (eu -= p), t++);
                    (t >= 4 && (eu = 0),
                      t > 0 && ((E.image.data = A), (E.needsUpdate = !0)),
                      e < 4e-4
                        ? (ei += a) > 0.6 &&
                          ((en = !1),
                          A.fill(0),
                          R.fill(0),
                          H.fill(0),
                          (E.image.data = A),
                          (E.needsUpdate = !0),
                          (D.uniforms.uRippleOn.value = 0))
                        : (ei = 0));
                  }
                  (eS(),
                    ((o && v(d(t.speed, 0.5), 0, 4) > 0) || (en && o) || !el) &&
                    !document.hidden
                      ? (ep = requestAnimationFrame(ek))
                      : (ev = 0));
                },
                eF = (e) => {
                  let t = r.current;
                  if (!t.interactive || t.reduced || t.paused) return;
                  let a = eb(e.clientX, e.clientY),
                    o = performance.now();
                  if (!a) {
                    eh = null;
                    return;
                  }
                  let l = v(d(t.ripples, 1), 0, 3);
                  if (eh && l > 0) {
                    let e = a.x - eh.x,
                      t = a.z - eh.z,
                      r = Math.hypot(e, t),
                      n =
                        v(
                          (r / Math.max(0.008, (o - eh.t) / 1e3)) * 0.009,
                          0,
                          0.07,
                        ) * l;
                    if (n > 5e-4) {
                      let a = Math.min(
                        12,
                        Math.max(1, Math.ceil(r / (2 * ((q.z - q.x) / 192)))),
                      );
                      for (let r = 1; r <= a; r++)
                        eg.push({
                          x: eh.x + (e * r) / a,
                          z: eh.z + (t * r) / a,
                          amount: n / Math.sqrt(a),
                          radius: 2.2,
                        });
                      ez();
                    }
                  }
                  eh = { x: a.x, z: a.z, t: o };
                },
                eT = () => {
                  eh = null;
                },
                eM = (e) => {
                  var t;
                  let a = r.current;
                  if (
                    !a.interactive ||
                    a.reduced ||
                    a.paused ||
                    !e.isPrimary ||
                    ("mouse" === e.pointerType && 0 !== e.button) ||
                    ((t = e.target) &&
                      "function" == typeof t.closest &&
                      t.closest(
                        "a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]",
                      ))
                  )
                    return;
                  let o = eb(e.clientX, e.clientY);
                  if (!o) return;
                  let l = v(d(a.ripples, 1), 0, 3);
                  l <= 0 ||
                    (eg.push({ x: o.x, z: o.z, amount: 0.42 * l, radius: 3.6 }),
                    ez());
                },
                ej = () => {
                  ((ev = 0), ez());
                },
                eA = (e) => {
                  (e.preventDefault(),
                    (ef = !0),
                    cancelAnimationFrame(ep),
                    (ep = 0));
                },
                eR = () => {
                  ((ef = !1), (J = ""), (E.needsUpdate = !0), ez());
                },
                eH = new ResizeObserver(() => {
                  ey() && (eS(), ez());
                }),
                eE = new IntersectionObserver(
                  ([e]) => {
                    ((ed = e.isIntersecting), (ev = 0), ez());
                  },
                  { rootMargin: "120px" },
                );
              return (
                e.addEventListener("pointermove", eF),
                e.addEventListener("pointerdown", eM),
                e.addEventListener("pointerleave", eT),
                e.addEventListener("pointercancel", eT),
                document.addEventListener("visibilitychange", ej),
                n.addEventListener("webglcontextlost", eA),
                n.addEventListener("webglcontextrestored", eR),
                eH.observe(e),
                eE.observe(e),
                ey(),
                ex(),
                {
                  sync: () => {
                    ((er = -10),
                      ey() && (J = ""),
                      (ev = 0),
                      !ep && ed && (eS(), ez()));
                  },
                  ripple: (t, a, o) => {
                    if (r.current.reduced) return;
                    let l = e.getBoundingClientRect(),
                      n = eb(
                        l.left + v(t ?? 0.5, 0, 1) * l.width,
                        l.top + v(a ?? 0.8, 0, 1) * l.height,
                      );
                    n &&
                      (eg.push({
                        x: n.x,
                        z: n.z,
                        amount: 0.42 * v(d(o ?? 1, 1), 0, 3),
                        radius: 3.6,
                      }),
                      ez());
                  },
                  replay: () => {
                    ((eo = -1), (el = !1), (ev = 0), ez());
                  },
                  destroy: () => {
                    for (let t of ((em = !0),
                    cancelAnimationFrame(ep),
                    eH.disconnect(),
                    eE.disconnect(),
                    e.removeEventListener("pointermove", eF),
                    e.removeEventListener("pointerdown", eM),
                    e.removeEventListener("pointerleave", eT),
                    e.removeEventListener("pointercancel", eT),
                    document.removeEventListener("visibilitychange", ej),
                    n.removeEventListener("webglcontextlost", eA),
                    n.removeEventListener("webglcontextrestored", eR),
                    w.dispose(),
                    m.dispose(),
                    D.dispose(),
                    _.dispose(),
                    O.dispose(),
                    Z.dispose(),
                    E.dispose(),
                    G.dispose(),
                    V))
                      t.dispose();
                    (a.dispose(), n.remove());
                  },
                }
              );
            })(e, t, $);
            return (
              (K.current = r),
              () => {
                (r?.destroy(), (K.current = null));
              }
            );
          }, []),
          (0, o.useImperativeHandle)(
            Q,
            () => ({
              ripple: (e, t, r) => K.current?.ripple(e, t, r),
              replay: () => K.current?.replay(),
            }),
            [],
          ));
        let ee = r.trim().toLowerCase();
        return (0, a.jsxs)("div", {
          ref: X,
          className: (0, c.cn)(
            "relative isolate h-full min-h-[320px] w-full overflow-hidden",
            O,
          ),
          style: {
            backgroundColor: "transparent" === ee || "" === ee ? void 0 : r,
            touchAction: "pan-y",
            ...Z,
          },
          children: [
            (0, a.jsx)("div", {
              ref: Y,
              "aria-hidden": "true",
              style: { position: "absolute", inset: 0, pointerEvents: "none" },
            }),
            _
              ? (0, a.jsx)("div", {
                  style: { position: "relative", zIndex: 1, height: "100%" },
                  children: _,
                })
              : null,
          ],
        });
      });
    M.displayName = "VoxelArc";
    let j = {
        color: "#5227FF",
        accentColor: "#B19EEF",
        density: 1,
        voxelSize: 0.55,
        roundness: 0.2,
        tilt: 1,
        horizon: 0.56,
        curvature: 0.5,
        waveHeight: 1,
        waveLength: 1,
        speed: 0.5,
        turbulence: 0.4,
        brightness: 1,
        glow: 1,
        haze: 0.7,
        bloom: 0.5,
        focus: 0.25,
        aperture: 0.35,
      },
      A = {
        horizon: j,
        dusk: {
          ...j,
          color: "#7C5CFF",
          accentColor: "#FF9FFC",
          glow: 1.2,
          haze: 0.9,
        },
        calm: {
          ...j,
          waveHeight: 0.45,
          waveLength: 1.4,
          speed: 0.25,
          turbulence: 0.1,
          haze: 1,
          aperture: 0.5,
        },
        storm: {
          ...j,
          waveHeight: 1.8,
          waveLength: 0.8,
          speed: 1,
          turbulence: 1,
          glow: 0.8,
          brightness: 1.15,
        },
        dots: {
          ...j,
          roundness: 1,
          voxelSize: 0.46,
          density: 1.25,
          brightness: 1.35,
          glow: 1.2,
        },
        grid: {
          ...j,
          roundness: 0,
          voxelSize: 0.72,
          density: 0.85,
          aperture: 0.08,
          haze: 0.3,
          bloom: 0.2,
          waveHeight: 0.7,
        },
        planet: {
          ...j,
          curvature: 1.4,
          horizon: 0.42,
          glow: 1.6,
          waveHeight: 0.7,
          haze: 1.1,
        },
      },
      R = [
        { label: "Horizon", value: "horizon" },
        { label: "Dusk", value: "dusk" },
        { label: "Calm", value: "calm" },
        { label: "Storm", value: "storm" },
        { label: "Dots", value: "dots" },
        { label: "Grid", value: "grid" },
        { label: "Planet", value: "planet" },
      ],
      H = [
        {
          name: "color",
          type: "string",
          default: '"#5227FF"',
          description:
            "Colour of the voxel field in the troughs and the distance.",
        },
        {
          name: "accentColor",
          type: "string",
          default: '"#B19EEF"',
          description:
            "Colour the crests and the horizon light up in. Both colours become matching inks on light backgrounds.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"transparent"',
          description:
            "Background of the component. Transparent reads the colour behind the component.",
        },
        {
          name: "density",
          type: "number",
          default: "1",
          description:
            "How many voxels make up the field. Higher values give finer pixels.",
        },
        {
          name: "voxelSize",
          type: "number",
          default: "0.55",
          description: "Size of each voxel as a share of the grid spacing.",
        },
        {
          name: "roundness",
          type: "number",
          default: "0.2",
          description:
            "Corner rounding, from 0 (square pixels) to 1 (round dots).",
        },
        {
          name: "tilt",
          type: "number",
          default: "1",
          description:
            "How flat the voxels lie on the surface. 1 lies them on the waves in perspective; 0 turns them to face the viewer.",
        },
        {
          name: "horizon",
          type: "number",
          default: "0.56",
          description:
            "Height of the horizon as a fraction of the frame, from the top.",
        },
        {
          name: "curvature",
          type: "number",
          default: "0.5",
          description:
            "How much the horizon curves away at the sides, from 0 (flat) to 1.5 (a planet's limb).",
        },
        {
          name: "waveHeight",
          type: "number",
          default: "1",
          description:
            "Height of the rolling waves. 0 gives a still, flat field.",
        },
        {
          name: "waveLength",
          type: "number",
          default: "1",
          description:
            "Length of the waves. Lower values give a choppier surface.",
        },
        {
          name: "speed",
          type: "number",
          default: "0.5",
          description: "How fast the waves roll in. 0 holds the field still.",
        },
        {
          name: "turbulence",
          type: "number",
          default: "0.4",
          description: "Amount of smaller, crossing waves riding on the swell.",
        },
        {
          name: "brightness",
          type: "number",
          default: "1",
          description: "Overall brightness of the voxels.",
        },
        {
          name: "glow",
          type: "number",
          default: "1",
          description:
            "Light along the horizon, so the far edge of the field reads as a glowing arc.",
        },
        {
          name: "haze",
          type: "number",
          default: "0.7",
          description:
            "Soft atmosphere hugging the horizon. 0 keeps the sky the page colour.",
        },
        {
          name: "bloom",
          type: "number",
          default: "0.5",
          description:
            "Soft glow around the brightest voxels on dark backgrounds.",
        },
        {
          name: "focus",
          type: "number",
          default: "0.25",
          description:
            "Distance that is in sharp focus, from 0 (the nearest voxels) to 1 (the horizon).",
        },
        {
          name: "aperture",
          type: "number",
          default: "0.35",
          description:
            "Depth of field. Higher values soften voxels away from the focus into haze.",
        },
        {
          name: "grain",
          type: "number",
          default: "0.25",
          description: "Fine film grain over the lit areas.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Moving the pointer over the field leaves a wake; clicking or tapping drops a ripple into it.",
        },
        {
          name: "ripples",
          type: "number",
          default: "1",
          description: "Strength of the wake and the ripples.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "Light comes up from the horizon toward the viewer when the field first appears.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops the motion. Reduced-motion users get a still field.",
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
            "Content laid over the field, such as a hero headline. Clicks on its links and buttons never drop ripples.",
        },
        {
          name: "ref",
          type: "{ ripple, replay }",
          default: "—",
          description:
            "ripple(x?, y?, strength?) drops a ripple at a point given in fractions of the size; replay() replays the intro.",
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
      E = () => {
        let [e, t] = (0, i.I)(),
          r = (0, n.Y)(),
          [u, s] = (0, o.useState)("horizon"),
          [c, p] = (0, o.useState)(A.horizon),
          v = (e) => (t) => p((r) => ({ ...r, [e]: t })),
          [d, m] = (0, o.useState)(null),
          f = d ?? ("dark" === r ? "#0A0A0A" : "#FFFFFF"),
          [h, g] = (0, o.useState)(0.25),
          [x, y] = (0, o.useState)(1),
          [b, w] = (0, o.useState)(!0),
          [C, z] = (0, o.useState)(!0),
          [S, k] = (0, o.useState)(!1);
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(l.Bg, {}),
            (0, a.jsxs)(l.VX, {
              children: [
                (0, a.jsxs)(l.Ec, {
                  children: [
                    (0, a.jsx)(l.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, a.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, a.jsx)(
                          M,
                          {
                            ...c,
                            backgroundColor: f,
                            grain: h,
                            ripples: x,
                            interactive: b,
                            intro: C,
                            paused: S,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, a.jsxs)(l.IH, {
                      children: [
                        (0, a.jsx)(l.bg, {
                          title: "Preset",
                          value: u,
                          options: R,
                          onChange: (e) => {
                            (s(e), p(A[e] ?? A.horizon));
                          },
                        }),
                        (0, a.jsx)(l.W7, {
                          title: "Color",
                          value: c.color,
                          onChange: v("color"),
                        }),
                        (0, a.jsx)(l.W7, {
                          title: "Accent",
                          value: c.accentColor,
                          onChange: v("accentColor"),
                        }),
                        (0, a.jsx)(l.W7, {
                          title: "Background",
                          value: f,
                          onChange: m,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Density",
                          min: 0.4,
                          max: 2,
                          step: 0.01,
                          value: c.density,
                          onChange: v("density"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Voxel Size",
                          min: 0.15,
                          max: 1,
                          step: 0.01,
                          value: c.voxelSize,
                          onChange: v("voxelSize"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Roundness",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.roundness,
                          onChange: v("roundness"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Tilt",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.tilt,
                          onChange: v("tilt"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Horizon",
                          min: 0.2,
                          max: 0.85,
                          step: 0.01,
                          value: c.horizon,
                          onChange: v("horizon"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Curvature",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: c.curvature,
                          onChange: v("curvature"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Wave Height",
                          min: 0,
                          max: 2.5,
                          step: 0.01,
                          value: c.waveHeight,
                          onChange: v("waveHeight"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Wave Length",
                          min: 0.4,
                          max: 3,
                          step: 0.01,
                          value: c.waveLength,
                          onChange: v("waveLength"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Speed",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.speed,
                          onChange: v("speed"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Turbulence",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: c.turbulence,
                          onChange: v("turbulence"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Brightness",
                          min: 0.2,
                          max: 2.5,
                          step: 0.01,
                          value: c.brightness,
                          onChange: v("brightness"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Glow",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: c.glow,
                          onChange: v("glow"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Haze",
                          min: 0,
                          max: 2.5,
                          step: 0.01,
                          value: c.haze,
                          onChange: v("haze"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Bloom",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: c.bloom,
                          onChange: v("bloom"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Focus",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.focus,
                          onChange: v("focus"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Aperture",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: c.aperture,
                          onChange: v("aperture"),
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Grain",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: h,
                          onChange: g,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Ripples",
                          min: 0,
                          max: 2.5,
                          step: 0.01,
                          value: x,
                          onChange: y,
                        }),
                        (0, a.jsx)(l.tl, {
                          title: "Interactive",
                          checked: b,
                          onChange: w,
                        }),
                        (0, a.jsx)(l.tl, {
                          title: "Intro",
                          checked: C,
                          onChange: z,
                        }),
                        (0, a.jsx)(l.tl, {
                          title: "Paused",
                          checked: S,
                          onChange: k,
                        }),
                      ],
                    }),
                    (0, a.jsx)(l.Ub, { data: H }),
                  ],
                }),
                (0, a.jsx)(l.lT, { children: (0, a.jsx)(l.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
