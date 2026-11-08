/* ReactBits Pro public preview module 42008 for glyph-orb.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/42008.77ed8cf9f9ee2af1.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  42008: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => R }));
    var r = a(95155),
      n = a(12115),
      l = a(56388),
      i = a(86049),
      o = a(90761),
      u = a(2253),
      s = a(12246),
      c = a(90650);
    let d =
        " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
      m =
        'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      h = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      p = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      v = (e, t, a) => Math.min(a, Math.max(t, e)),
      f = null,
      g = (e, t) => {
        if ((f || (f = document.createElement("canvas").getContext("2d")), !f))
          return t;
        ((f.fillStyle = "#010203"), (f.fillStyle = e));
        let a = String(f.fillStyle);
        if ("#010203" === a && "#010203" !== e.trim().toLowerCase()) return t;
        if (a.startsWith("#")) {
          let e = a.slice(1);
          return [
            parseInt(e.slice(0, 2), 16) / 255,
            parseInt(e.slice(2, 4), 16) / 255,
            parseInt(e.slice(4, 6), 16) / 255,
          ];
        }
        let r = a.match(/[\d.]+/g);
        return !r || r.length < 3
          ? t
          : [Number(r[0]) / 255, Number(r[1]) / 255, Number(r[2]) / 255];
      },
      x = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      b = ([e, t, a]) => {
        let r = x(e),
          n = x(t),
          l = x(a),
          i = Math.cbrt(0.4122214708 * r + 0.5363325363 * n + 0.0514459929 * l),
          o = Math.cbrt(0.2119034982 * r + 0.6806995451 * n + 0.1073969566 * l),
          u = Math.cbrt(0.0883024619 * r + 0.2817188376 * n + 0.6299787005 * l);
        return [
          0.2104542553 * i + 0.793617785 * o - 0.0040720468 * u,
          1.9779984951 * i - 2.428592205 * o + 0.4505937099 * u,
          0.0259040371 * i + 0.7827717662 * o - 0.808675766 * u,
        ];
      },
      y = (e) => {
        let t = Math.hypot(e[0], e[1], e[2], e[3]) || 1;
        return [e[0] / t, e[1] / t, e[2] / t, e[3] / t];
      },
      w = (e, t) => {
        let a = Math.hypot(e[0], e[1], e[2]);
        if (a < 1e-9 || 1e-9 > Math.abs(t)) return [1, 0, 0, 0];
        let r = Math.sin(t / 2) / a;
        return [Math.cos(t / 2), e[0] * r, e[1] * r, e[2] * r];
      },
      C = (e) => {
        let [t, a, r, n] = e;
        return [
          [1 - 2 * (r * r + n * n), 2 * (a * r - t * n), 2 * (a * n + t * r)],
          [2 * (a * r + t * n), 1 - 2 * (a * a + n * n), 2 * (r * n - t * a)],
          [2 * (a * n - t * r), 2 * (r * n + t * a), 1 - 2 * (a * a + r * r)],
        ];
      },
      S = (e, t) =>
        e.map((e) =>
          [0, 1, 2].map(
            (a) => e[0] * t[0][a] + e[1] * t[1][a] + e[2] * t[2][a],
          ),
        ),
      k = `
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      M = `
precision highp float;
uniform vec2 uCell;
uniform vec2 uCenter;
uniform float uRadius;
uniform mat3 uOrient;
uniform vec3 uLight;
uniform float uTime;
uniform float uBands;
uniform float uTurbulence;
uniform float uRim;
uniform float uAmbient;
uniform float uAtmosphere;
uniform vec4 uStorms[6];
uniform vec4 uStormShape[6];
out vec4 fragColor;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z
  );
}

vec3 rotateAbout(vec3 v, vec3 axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}

float bands(vec3 q) {
  float shear = 0.9 * sin(uTime * 0.021) * (1.0 - 1.4 * q.y * q.y);
  float c = cos(shear);
  float s = sin(shear);
  vec3 r = vec3(c * q.x + s * q.z, q.y, -s * q.x + c * q.z);
  vec3 w = r * 2.1 + vec3(0.0, 0.0, uTime * 0.03);
  float warp = (noise3(w) - 0.5) * 1.6 + (noise3(w * 2.3 + 7.1) - 0.5) * 0.8;
  float lat = asin(clamp(r.y + warp * 0.05 * uTurbulence, -1.0, 1.0));
  float broad = 0.5 + 0.5 * sin(lat * uBands + warp * uTurbulence * 2.4);
  float fine = 0.5 + 0.5 * sin(lat * uBands * 2.6 + 1.7 + warp * uTurbulence * 1.6);
  float grain = noise3(r * 9.0 + vec3(uTime * 0.05, 0.0, 0.0));
  return clamp(0.58 * broad + 0.27 * fine + 0.15 * grain, 0.0, 1.0);
}

float surface(vec3 q, out float mark) {
  mark = 0.0;
  vec3 twisted = q;
  float presence = 0.0;
  for (int k = 0; k < 6; k++) {
    vec4 storm = uStorms[k];
    if (storm.w < 0.0) continue;
    float age = uTime - storm.w;
    if (age < 0.0 || age > 12.0) continue;
    vec4 shape = uStormShape[k];
    float d = acos(clamp(dot(q, storm.xyz), -1.0, 1.0)) / shape.y;
    float falloff = exp(-d * d);
    twisted = rotateAbout(twisted, storm.xyz, shape.x * falloff * (1.2 + 0.45 * age));
    float vis = smoothstep(0.0, 1.2, age) * (1.0 - smoothstep(12.0 * 0.5, 12.0, age));
    presence = max(presence, vis * smoothstep(3.2, 1.6, d));
    mark += vis * min(abs(shape.x), 1.5) * exp(-d * d * 1.6);
  }
  float base = bands(q);
  if (presence <= 0.001) return base;
  return mix(base, bands(twisted), clamp(presence, 0.0, 1.0));
}

void main() {
  vec2 center = gl_FragCoord.xy * uCell;
  vec2 d = (center - uCenter) / uRadius;
  float r2 = dot(d, d);
  vec2 lightFlat = normalize(uLight.xy + vec2(1e-4));
  float behind = smoothstep(-0.2, 0.7, -uLight.z);
  float value = 0.0;
  float tone = 0.0;
  if (r2 < 1.0) {
    vec3 n = vec3(d, sqrt(1.0 - r2));
    vec3 q = transpose(uOrient) * n;
    float mark;
    float albedo = surface(q, mark);
    float lit = smoothstep(-0.1, 0.85, dot(n, uLight));
    float toward = dot(normalize(d + vec2(1e-5)), lightFlat);
    float scatter = pow(1.0 - n.z, 4.0) * smoothstep(-0.35, 1.0, toward) * (0.35 + 0.65 * behind);
    value = mix(0.3, 1.0, albedo) * (uAmbient + (1.0 - uAmbient) * lit) + uRim * scatter;
    tone = value + (albedo - 0.5) * 0.14 + mark * 0.16;
  } else {
    float edge = sqrt(r2) - 1.0;
    float toward = dot(normalize(d), lightFlat);
    float side = smoothstep(-0.4, 1.0, toward) * (0.45 + 0.55 * behind);
    value = uAtmosphere * 0.5 * exp(-edge * 18.0) * side;
    tone = value;
  }
  fragColor = vec4(value, tone, 0.0, 1.0);
}
`,
      F = `
precision highp float;
uniform sampler2D uField;
uniform sampler2D uAtlas;
uniform vec2 uAtlasGrid;
uniform float uCount;
uniform vec2 uCell;
uniform float uGamma;
uniform float uDither;
uniform vec3 uLabNight;
uniform vec3 uLabLit;
out vec4 fragColor;

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

float glyphCoverage(float index, vec2 g) {
  vec2 f = fract(g) - 0.5;
  vec2 span = vec2(uCell.x / uCell.y, 1.0) * 0.86;
  vec2 texel = vec2(0.5 + f.x * span.x, 0.5 - f.y * span.y);
  float inside = step(0.01, texel.x) * step(texel.x, 0.99) * step(0.01, texel.y) * step(texel.y, 0.99);
  vec2 slot = vec2(mod(index, uAtlasGrid.x), floor(index / uAtlasGrid.x));
  vec2 uv = (slot + texel) / uAtlasGrid;
  vec2 scale = span / uAtlasGrid;
  return textureGrad(uAtlas, uv, dFdx(g) * scale, dFdy(g) * scale).r * inside;
}

vec3 palette(float t) {
  vec3 deep = vec3(uLabNight.x * 0.5, uLabNight.yz * 0.9);
  vec3 white = vec3(min(uLabLit.x * 1.06 + 0.04, 0.99), uLabLit.yz * 0.3);
  vec3 lab = t < 0.4 ? mix(deep, uLabNight, smoothstep(0.0, 0.4, t))
    : t < 0.82 ? mix(uLabNight, uLabLit, smoothstep(0.4, 0.82, t))
    : mix(uLabLit, white, smoothstep(0.82, 1.0, t));
  return labToLinear(lab);
}

void main() {
  vec2 g = gl_FragCoord.xy / uCell;
  vec2 cellId = floor(g);
  vec4 field = texelFetch(uField, ivec2(cellId), 0);
  float dither = fract(sin(dot(cellId, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  float value = clamp(field.r + dither * uDither * step(0.02, field.r), 0.0, 1.0);
  float level = pow(value, uGamma);
  float index = floor(level * (uCount - 1.0) + 0.5);
  float energy = 0.0;
  vec3 color = vec3(0.0);
  if (index >= 1.0) {
    float cover = glyphCoverage(index, g);
    color = palette(clamp(field.g, 0.0, 1.0));
    energy = cover * (0.2 + 0.95 * level) * mix(1.0, 0.75, smoothstep(0.7, 1.0, level));
  }
  fragColor = vec4(color * energy, energy);
}
`,
      L = `
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
      A = `
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
      z = `
precision highp float;
uniform sampler2D uLines;
uniform sampler2D uBloom;
uniform vec3 uBackground;
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
    color = uBackground + (1.0 - uBackground) * exposed;
  } else {
    float energy = lines.a + bloom.a * uGlow * 0.2;
    vec3 hue = (lines.rgb + bloom.rgb * uGlow * 0.2) / max(energy, 1e-4);
    float cover = clamp(1.0 - exp(-energy * uExposure * 1.4), 0.0, 0.95);
    color = mix(uBackground, clamp(hue * 0.85, 0.0, 1.0), cover);
  }
  float grain = hash(gl_FragCoord.xy + uGrain * 311.0) - 0.5;
  fragColor = vec4(encode(color) + grain * (1.2 / 255.0), 1.0);
}
`,
      j = (0, n.forwardRef)(function (
        {
          colors: e = ["#6D3DFF", "#FF9BE1"],
          backgroundColor: t = "#0A0A0A",
          mode: a = "auto",
          charset: l = d,
          fontFamily: i = m,
          glyphSize: o = 10,
          spacing: f = 1.1,
          size: j = 1,
          centerX: T = 0.5,
          centerY: E = 0.5,
          tilt: B = -24,
          spin: I = 1,
          bands: q = 9,
          turbulence: U = 1,
          lightAngle: G = -45,
          lightHeight: R = 0.4,
          hoverLight: N = !0,
          rim: P = 0.7,
          atmosphere: D = 0.6,
          contrast: H = 0.4,
          glow: Y = 0.12,
          intensity: _ = 1,
          interactive: W = !0,
          draggable: X = !0,
          momentum: O = 0.5,
          clickStorm: $ = !0,
          stormStrength: V = 1,
          paused: Q = !1,
          quality: J = 1,
          className: Z,
          style: K,
          children: ee,
        },
        et,
      ) {
        let ea = (0, n.useRef)(null),
          er = (0, n.useRef)(null),
          en = (0, n.useSyncExternalStore)(h, p, () => !1),
          el = (0, n.useRef)({
            colors: e,
            backgroundColor: t,
            mode: a,
            charset: l,
            fontFamily: i,
            glyphSize: o,
            spacing: f,
            size: j,
            centerX: T,
            centerY: E,
            tilt: B,
            spin: I,
            bands: q,
            turbulence: U,
            lightAngle: G,
            lightHeight: R,
            hoverLight: N,
            rim: P,
            atmosphere: D,
            contrast: H,
            glow: Y,
            intensity: _,
            interactive: W,
            draggable: X,
            momentum: O,
            clickStorm: $,
            stormStrength: V,
            paused: Q,
            quality: J,
            reduced: en,
          });
        return (
          (0, n.useEffect)(() => {
            ((el.current = {
              colors: e,
              backgroundColor: t,
              mode: a,
              charset: l,
              fontFamily: i,
              glyphSize: o,
              spacing: f,
              size: j,
              centerX: T,
              centerY: E,
              tilt: B,
              spin: I,
              bands: q,
              turbulence: U,
              lightAngle: G,
              lightHeight: R,
              hoverLight: N,
              rim: P,
              atmosphere: D,
              contrast: H,
              glow: Y,
              intensity: _,
              interactive: W,
              draggable: X,
              momentum: O,
              clickStorm: $,
              stormStrength: V,
              paused: Q,
              quality: J,
              reduced: en,
            }),
              er.current?.sync());
          }),
          (0, n.useEffect)(() => {
            let e = ea.current;
            if (!e) return;
            let t = ((e, t) => {
              let a,
                r = document.createElement("canvas");
              (r.setAttribute("aria-hidden", "true"),
                (r.style.position = "absolute"),
                (r.style.inset = "0"),
                (r.style.width = "100%"),
                (r.style.height = "100%"),
                (r.style.display = "block"),
                (r.style.pointerEvents = "none"),
                e.prepend(r));
              try {
                a = new s.WebGLRenderer({
                  canvas: r,
                  alpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return (r.remove(), null);
              }
              if (!a.capabilities.isWebGL2)
                return (a.dispose(), r.remove(), null);
              a.autoClear = !1;
              let n =
                  a.extensions.has("EXT_color_buffer_float") ||
                  a.extensions.has("EXT_color_buffer_half_float")
                    ? u.ix0
                    : u.OUM,
                l = new u.qUd(-1, 1, 1, -1, 0, 1),
                i = new u.bdM(2, 2),
                o = Array.from({ length: 6 }, () => new u.IUQ(0, 0, 1, -1)),
                c = Array.from({ length: 6 }, () => new u.IUQ(1, 0.25, 0, 0)),
                h = new u.dwI(),
                p = (e, t) =>
                  new u.BKk({
                    glslVersion: u.Wdf,
                    uniforms: t,
                    vertexShader: k,
                    fragmentShader: e,
                    depthTest: !1,
                    depthWrite: !1,
                    blending: u.XIg,
                  }),
                f = p(M, {
                  uCell: { value: new u.I9Y(7, 11) },
                  uCenter: { value: new u.I9Y() },
                  uRadius: { value: 100 },
                  uOrient: { value: h },
                  uLight: { value: new u.Pq0(-0.5, 0.5, 0.2) },
                  uTime: { value: 0 },
                  uBands: { value: 9 },
                  uTurbulence: { value: 1 },
                  uRim: { value: 0.7 },
                  uAmbient: { value: 0.09 },
                  uAtmosphere: { value: 0.6 },
                  uStorms: { value: o },
                  uStormShape: { value: c },
                }),
                j = p(F, {
                  uField: { value: null },
                  uAtlas: { value: null },
                  uAtlasGrid: { value: new u.I9Y(16, 1) },
                  uCount: { value: 2 },
                  uCell: { value: new u.I9Y(7, 11) },
                  uGamma: { value: 1 },
                  uDither: { value: 0.05 },
                  uLabNight: { value: new u.Pq0() },
                  uLabLit: { value: new u.Pq0() },
                }),
                T = p(L, {
                  uSource: { value: null },
                  uTexel: { value: new u.I9Y() },
                }),
                E = p(A, {
                  uSource: { value: null },
                  uBase: { value: null },
                  uTexel: { value: new u.I9Y() },
                }),
                B = p(z, {
                  uLines: { value: null },
                  uBloom: { value: null },
                  uBackground: { value: new u.Pq0() },
                  uGlow: { value: 0.3 },
                  uExposure: { value: 1.2 },
                  uMode: { value: 0 },
                  uGrain: { value: 0 },
                }),
                I = new u.eaF(i, B);
              I.frustumCulled = !1;
              let q = new u.Z58();
              q.add(I);
              let U = (e, t) =>
                  new u.nWS(Math.max(1, e), Math.max(1, t), {
                    type: n,
                    format: u.GWd,
                    minFilter: u.k6q,
                    magFilter: u.k6q,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    generateMipmaps: !1,
                  }),
                G = null,
                R = [],
                N = [],
                P = null,
                D = "",
                H = null,
                Y = "",
                _ = new u.Pq0(-0.5, 0.5, 0.2).normalize(),
                W = new u.Pq0(),
                X = !1,
                O = !1,
                $ = 0,
                V = 0,
                Q = !0,
                J = 40,
                Z = 0.4,
                K = [1, 0, 0, 0],
                ee = [0, 0, 0],
                et = 1,
                ea = 1,
                er = 1,
                en = 0,
                el = 0,
                ei = C([1, 0, 0, 0]),
                eo = {
                  x: 0,
                  y: 0,
                  time: 0,
                  down: !1,
                  dragging: !1,
                  startX: 0,
                  startY: 0,
                  id: -1,
                  inside: !1,
                },
                eu = () => {
                  (G?.dispose(),
                    R.forEach((e) => e.dispose()),
                    N.forEach((e) => e.dispose()),
                    (G = null),
                    (R = []),
                    (N = []));
                },
                es = (e, t) => {
                  ((I.material = e), a.setRenderTarget(t), a.render(q, l));
                },
                ec = () => {
                  let e = t.current,
                    a = et * er,
                    r = ea * er;
                  return {
                    cx: v(e.centerX, -1, 2) * a,
                    cy: (1 - v(e.centerY, -1, 2)) * r,
                    radius: Math.max(
                      8,
                      0.36 * v(e.size, 0.1, 4) * Math.min(a, r),
                    ),
                  };
                };
              function ed() {
                return (
                  v(t.current.glyphSize, 5, 40) *
                  v(Math.min(et, ea) / 520, 0.72, 1) *
                  er
                );
              }
              let em = () => {
                  let e = t.current,
                    a = ed();
                  return [0.62 * a * v(e.spacing, 0.6, 2.5), 1.04 * a];
                },
                eh = (e) => {
                  let a = t.current,
                    r = ec();
                  if (
                    eo.inside &&
                    !eo.dragging &&
                    a.interactive &&
                    a.hoverLight &&
                    !a.reduced
                  ) {
                    let e = (eo.x - r.cx) / r.radius,
                      t = (eo.y - r.cy) / r.radius,
                      n = Math.hypot(e, t);
                    if (n > 0.3) {
                      let r = -0.55 + 2.2 * v(a.lightHeight, 0, 1);
                      W.set(e / n, t / n, r).normalize();
                    }
                  } else {
                    let e, a, r;
                    eo.dragging ||
                      ((a =
                        (v((e = t.current).lightAngle, -180, 180) * Math.PI) /
                        180),
                      (r = v(e.lightHeight, 0, 1)),
                      W.set(
                        Math.sin(a),
                        Math.cos(a),
                        -0.55 + 2.2 * r,
                      ).normalize());
                  }
                  if (!X || a.reduced || e <= 0) {
                    (_.copy(W), (X = !0));
                    return;
                  }
                  _.lerp(W, 1 - Math.exp(-e / 0.55)).normalize();
                },
                ep = () => {
                  if (!G || !R.length) return;
                  ((() => {
                    let e = t.current,
                      a = String(e.charset ?? "") || d,
                      r = String(e.fontFamily ?? "") || m,
                      n = 4 * Math.round(v(1.3 * ed(), 16, 96) / 4),
                      l = `${a}|${r}|${n}`;
                    if (l !== Y || !H) {
                      let e, t, i, o, s, c, d, m, h;
                      ((Y = l),
                        H?.texture.dispose(),
                        (e = Array.from(new Set(Array.from(a))).slice(0, 180))
                          .length < 2 && e.push(".", "#"),
                        ((t = document.createElement("canvas")).width = n),
                        (t.height = n),
                        (i = t.getContext("2d", { willReadFrequently: !0 })),
                        (o = `500 ${Math.round(0.8 * n)}px ${r}`),
                        (c = Math.ceil(
                          (s = e
                            .map((e) => ({
                              character: e,
                              ink: ((e) => {
                                if (!i) return 0;
                                ((i.fillStyle = "#000000"),
                                  i.fillRect(0, 0, n, n),
                                  (i.fillStyle = "#ffffff"),
                                  (i.textAlign = "center"),
                                  (i.textBaseline = "middle"),
                                  (i.font = o),
                                  i.fillText(e, n / 2, n / 2));
                                let t = i.getImageData(0, 0, n, n).data,
                                  a = 0;
                                for (let e = 0; e < t.length; e += 4) a += t[e];
                                return a;
                              })(e),
                            }))
                            .sort((e, t) => e.ink - t.ink)
                            .map((e) => e.character)).length / 16,
                        )),
                        ((d = document.createElement("canvas")).width = 16 * n),
                        (d.height = c * n),
                        (m = d.getContext("2d")) &&
                          ((m.fillStyle = "#000000"),
                          m.fillRect(0, 0, d.width, d.height),
                          (m.fillStyle = "#ffffff"),
                          (m.textAlign = "center"),
                          (m.textBaseline = "middle"),
                          (m.font = o),
                          s.forEach((e, t) => {
                            let a = (t % 16) * n + n / 2,
                              r = Math.floor(t / 16) * n + n / 2 + 0.04 * n;
                            m.fillText(e, a, r);
                          })),
                        ((h = new u.GOR(d)).minFilter = u.$_I),
                        (h.magFilter = u.k6q),
                        (h.generateMipmaps = !0),
                        (h.colorSpace = u.jf0),
                        (h.flipY = !1),
                        (h.anisotropy = 4),
                        (h.needsUpdate = !0),
                        (H = { texture: h, count: s.length, rows: c }),
                        (j.uniforms.uAtlas.value = H.texture),
                        j.uniforms.uAtlasGrid.value.set(16, H.rows),
                        (j.uniforms.uCount.value = H.count));
                    }
                  })(),
                    (() => {
                      let [e, t] = em(),
                        a = Math.ceil((et * er) / e),
                        r = Math.ceil((ea * er) / t),
                        l = `${a}|${r}`;
                      (l === D && P) ||
                        ((D = l),
                        P?.dispose(),
                        (P = new u.nWS(a, r, {
                          type: n,
                          format: u.GWd,
                          minFilter: u.hxR,
                          magFilter: u.hxR,
                          depthBuffer: !1,
                          stencilBuffer: !1,
                          generateMipmaps: !1,
                        })));
                    })(),
                    (() => {
                      let e,
                        a,
                        r,
                        n = t.current,
                        l = ec(),
                        i = g(n.backgroundColor, [0.04, 0.04, 0.04]),
                        o = 0.2126 * i[0] + 0.7152 * i[1] + 0.0722 * i[2],
                        u = "ink" === n.mode || ("auto" === n.mode && o > 0.5),
                        s = b(g(n.colors[0], [0.45, 0.28, 1])),
                        c = b(g(n.colors[1], [1, 0.75, 0.93]));
                      (X || eh(0),
                        (e = (v(t.current.tilt, -90, 90) * Math.PI) / 180),
                        (a = [
                          [Math.cos(Z), 0, Math.sin(Z)],
                          [0, 1, 0],
                          [-Math.sin(Z), 0, Math.cos(Z)],
                        ]),
                        (r = [
                          [Math.cos(e), -Math.sin(e), 0],
                          [Math.sin(e), Math.cos(e), 0],
                          [0, 0, 1],
                        ]));
                      let d = (ei = S(
                        C(K),
                        S(
                          r,
                          S(
                            [
                              [1, 0, 0],
                              [0, 0.9758974493306055, 0.21822962308086932],
                              [0, -0.21822962308086932, 0.9758974493306055],
                            ],
                            a,
                          ),
                        ),
                      ));
                      h.set(
                        d[0][0],
                        d[0][1],
                        d[0][2],
                        d[1][0],
                        d[1][1],
                        d[1][2],
                        d[2][0],
                        d[2][1],
                        d[2][2],
                      );
                      let [m, p] = em(),
                        y = f.uniforms;
                      (y.uCell.value.set(m, p),
                        y.uCenter.value.set(l.cx, l.cy),
                        (y.uRadius.value = l.radius),
                        y.uLight.value.copy(_),
                        (y.uTime.value = J),
                        (y.uBands.value = v(n.bands, 1, 30)),
                        (y.uTurbulence.value = v(n.turbulence, 0, 3)),
                        (y.uRim.value = v(n.rim, 0, 2)),
                        (y.uAtmosphere.value = v(n.atmosphere, 0, 2)));
                      let w = j.uniforms;
                      ((w.uField.value = P ? P.texture : null),
                        w.uCell.value.set(m, p),
                        (w.uGamma.value = 0.6 + 1.2 * v(n.contrast, 0, 1)),
                        (w.uDither.value =
                          0.14 / Math.sqrt(Math.max((H?.count ?? 10) / 10, 1))),
                        w.uLabNight.value.set(s[0], s[1], s[2]),
                        w.uLabLit.value.set(c[0], c[1], c[2]));
                      let k = B.uniforms;
                      (k.uBackground.value.set(x(i[0]), x(i[1]), x(i[2])),
                        (k.uGlow.value = v(n.glow, 0, 3)),
                        (k.uExposure.value =
                          (u ? 4 : 1.2) * v(n.intensity, 0, 4)),
                        (k.uMode.value = +!!u),
                        (k.uGrain.value = en));
                    })(),
                    P && es(f, P),
                    es(j, G));
                  let e = G;
                  for (let t of R)
                    ((T.uniforms.uSource.value = e.texture),
                      T.uniforms.uTexel.value.set(1 / e.width, 1 / e.height),
                      es(T, t),
                      (e = t));
                  let a = R[R.length - 1];
                  for (let e = R.length - 2; e >= 0; e--)
                    ((E.uniforms.uSource.value = a.texture),
                      (E.uniforms.uBase.value = R[e].texture),
                      E.uniforms.uTexel.value.set(1 / a.width, 1 / a.height),
                      es(E, N[e]),
                      (a = N[e]));
                  ((B.uniforms.uLines.value = G.texture),
                    (B.uniforms.uBloom.value = a.texture),
                    es(B, null));
                },
                ev = (e, t) => {
                  let a = ec(),
                    r = (e - a.cx) / a.radius,
                    n = (t - a.cy) / a.radius,
                    l = r * r + n * n;
                  if (l >= 1) {
                    let e = Math.sqrt(l);
                    return [r / e, n / e, 0];
                  }
                  return [r, n, Math.sqrt(1 - l)];
                },
                ef = (e) => {
                  let t;
                  K = y(
                    ((t = K),
                    [
                      e[0] * t[0] - e[1] * t[1] - e[2] * t[2] - e[3] * t[3],
                      e[0] * t[1] + e[1] * t[0] + e[2] * t[3] - e[3] * t[2],
                      e[0] * t[2] - e[1] * t[3] + e[2] * t[0] + e[3] * t[1],
                      e[0] * t[3] + e[1] * t[2] - e[2] * t[1] + e[3] * t[0],
                    ]),
                  );
                },
                eg = (e) => {
                  if ((($ = 0), O)) return;
                  let a = Math.min(0.05, Math.max(0, (e - V) / 1e3));
                  ((V = e),
                    ((e) => {
                      let a = t.current;
                      if ((eh(e), !a.paused && !a.reduced)) {
                        if (
                          ((J += e),
                          eo.dragging || (Z += e * v(a.spin, -4, 4) * 0.12),
                          !eo.dragging)
                        ) {
                          let t = Math.exp(
                              -e / (0.35 + 3.2 * v(a.momentum, 0, 1)),
                            ),
                            r = Math.hypot(
                              (ee = [ee[0] * t, ee[1] * t, ee[2] * t])[0],
                              ee[1],
                              ee[2],
                            );
                          if ((r > 1e-5 && ef(w(ee, r * e)), r < 0.35)) {
                            let t = 1 - Math.exp(-e / 3.2),
                              a = K[0] < 0 ? [-1, 0, 0, 0] : [1, 0, 0, 0];
                            K = y([
                              K[0] + (a[0] - K[0]) * t,
                              K[1] * (1 - t),
                              K[2] * (1 - t),
                              K[3] * (1 - t),
                            ]);
                          }
                        }
                        en = (en + 0.618034) % 1;
                      }
                    })(a),
                    ep());
                  let r = t.current,
                    n = !r.paused && !r.reduced,
                    l = _.distanceToSquared(W) > 1e-6;
                  Q &&
                    !document.hidden &&
                    (n || l) &&
                    ($ = requestAnimationFrame(eg));
                };
              function ex() {
                O ||
                  $ ||
                  !Q ||
                  ((V = performance.now()), ($ = requestAnimationFrame(eg)));
              }
              let eb = () => {
                  let r = e.getBoundingClientRect();
                  ((et = Math.max(1, r.width)),
                    (ea = Math.max(1, r.height)),
                    (er =
                      Math.min(window.devicePixelRatio || 1, 2) *
                      v(t.current.quality, 0.25, 1)),
                    a.setPixelRatio(er),
                    a.setSize(et, ea, !1));
                  let n = Math.round(et * er),
                    l = Math.round(ea * er);
                  (eu(), (G = U(n, l)));
                  let i = v(Math.floor(Math.log2(Math.min(n, l) / 8)), 3, 7);
                  for (let e = 1; e <= i; e++)
                    (R.push(U(n >> e, l >> e)), N.push(U(n >> e, l >> e)));
                  (ep(), ex());
                },
                ey = (t) => {
                  let a = e.getBoundingClientRect();
                  return [
                    (t.clientX - a.left) * er,
                    (a.height - (t.clientY - a.top)) * er,
                  ];
                },
                ew = (e, t) => {
                  let a = ec();
                  return Math.hypot(e - a.cx, t - a.cy) < a.radius;
                },
                eC = (e) => {
                  let a,
                    r = t.current;
                  if (r.reduced || r.paused) return;
                  let n = [
                    (a = ei)[0][0] * e[0] + a[1][0] * e[1] + a[2][0] * e[2],
                    a[0][1] * e[0] + a[1][1] * e[1] + a[2][1] * e[2],
                    a[0][2] * e[0] + a[1][2] * e[1] + a[2][2] * e[2],
                  ];
                  (o[(el = (el + 1) % 6)].set(n[0], n[1], n[2], J),
                    c[el].set(
                      v(r.stormStrength, 0, 3) * (0.5 > Math.random() ? -1 : 1),
                      0.22 + 0.08 * Math.random(),
                      0,
                      0,
                    ),
                    ex());
                },
                eS = (a) => {
                  let r = t.current;
                  if (!r.interactive) return;
                  let [n, l] = ey(a),
                    i = performance.now();
                  if (
                    eo.down &&
                    eo.id === a.pointerId &&
                    r.draggable &&
                    "touch" !== a.pointerType
                  ) {
                    if (
                      !eo.dragging &&
                      Math.hypot(n - eo.startX, l - eo.startY) > 6 * er
                    ) {
                      eo.dragging = !0;
                      try {
                        e.setPointerCapture(a.pointerId);
                      } catch {}
                    }
                    if (eo.dragging) {
                      let e = ev(eo.x, eo.y),
                        t = ev(n, l),
                        a = [
                          e[1] * t[2] - e[2] * t[1],
                          e[2] * t[0] - e[0] * t[2],
                          e[0] * t[1] - e[1] * t[0],
                        ],
                        r = Math.acos(
                          v(e[0] * t[0] + e[1] * t[1] + e[2] * t[2], -1, 1),
                        );
                      ef(w(a, r));
                      let o = v((i - eo.time) / 1e3, 1 / 240, 0.1),
                        u = Math.hypot(a[0], a[1], a[2]) || 1,
                        s = r / o;
                      ee = [
                        ee[0] + ((a[0] / u) * s - ee[0]) * 0.5,
                        ee[1] + ((a[1] / u) * s - ee[1]) * 0.5,
                        ee[2] + ((a[2] / u) * s - ee[2]) * 0.5,
                      ];
                    }
                  }
                  ((e.style.cursor =
                    r.draggable && (eo.dragging || ew(n, l))
                      ? eo.dragging
                        ? "grabbing"
                        : "grab"
                      : ""),
                    (eo.x = n),
                    (eo.y = l),
                    (eo.time = i),
                    "touch" !== a.pointerType && (eo.inside = !0),
                    ex());
                },
                ek = (e) => {
                  let a = t.current;
                  if (0 !== e.button || !a.interactive) return;
                  let [r, n] = ey(e);
                  ((eo.down = !0),
                    (eo.dragging = !1),
                    (eo.startX = r),
                    (eo.startY = n),
                    (eo.x = r),
                    (eo.y = n),
                    (eo.time = performance.now()),
                    (eo.id = e.pointerId),
                    a.draggable &&
                      "touch" !== e.pointerType &&
                      ew(r, n) &&
                      (ee = [0.3 * ee[0], 0.3 * ee[1], 0.3 * ee[2]]));
                },
                eM = (a) => {
                  if (!eo.down || eo.id !== a.pointerId) return;
                  let r = t.current,
                    n = eo.dragging;
                  ((eo.down = !1), (eo.dragging = !1));
                  try {
                    e.releasePointerCapture(a.pointerId);
                  } catch {}
                  let [l, i] = ey(a);
                  !n &&
                    r.interactive &&
                    r.clickStorm &&
                    ew(l, i) &&
                    eC(ev(l, i));
                },
                eF = (e) => {
                  eo.id === e.pointerId && ((eo.down = !1), (eo.dragging = !1));
                },
                eL = () => {
                  ((eo.inside = !1),
                    eo.dragging || (e.style.cursor = ""),
                    ex());
                };
              (e.addEventListener("pointermove", eS),
                e.addEventListener("pointerdown", ek),
                e.addEventListener("pointerup", eM),
                e.addEventListener("pointercancel", eF),
                e.addEventListener("pointerleave", eL));
              let eA = new ResizeObserver(eb);
              eA.observe(e);
              let ez = new IntersectionObserver(
                (e) => {
                  (Q = e.some((e) => e.isIntersecting)) && ex();
                },
                { rootMargin: "80px" },
              );
              ez.observe(e);
              let ej = () => {
                document.hidden || ex();
              };
              document.addEventListener("visibilitychange", ej);
              let eT = (e) => e.preventDefault();
              return (
                r.addEventListener("webglcontextlost", eT),
                eb(),
                {
                  sync: () => {
                    (Math.abs(
                      Math.min(window.devicePixelRatio || 1, 2) *
                        v(t.current.quality, 0.25, 1) -
                        er,
                    ) > 0.001
                      ? eb()
                      : ep(),
                      ex());
                  },
                  destroy: () => {
                    ((O = !0),
                      cancelAnimationFrame($),
                      e.removeEventListener("pointermove", eS),
                      e.removeEventListener("pointerdown", ek),
                      e.removeEventListener("pointerup", eM),
                      e.removeEventListener("pointercancel", eF),
                      e.removeEventListener("pointerleave", eL),
                      (e.style.cursor = ""),
                      document.removeEventListener("visibilitychange", ej),
                      r.removeEventListener("webglcontextlost", eT),
                      eA.disconnect(),
                      ez.disconnect(),
                      eu(),
                      P?.dispose(),
                      H?.texture.dispose(),
                      i.dispose(),
                      [f, j, T, E, B].forEach((e) => e.dispose()),
                      a.dispose(),
                      a.forceContextLoss(),
                      r.remove());
                  },
                  storm: (e, t) => {
                    let a = ec();
                    eC(
                      ev(
                        a.cx + (v(e, 0, 1) - 0.5) * 2 * a.radius,
                        a.cy - (v(t, 0, 1) - 0.5) * 2 * a.radius,
                      ),
                    );
                  },
                }
              );
            })(e, el);
            return (
              (er.current = t),
              () => {
                (t?.destroy(), (er.current = null));
              }
            );
          }, []),
          (0, n.useImperativeHandle)(
            et,
            () => ({ storm: (e = 0.5, t = 0.5) => er.current?.storm(e, t) }),
            [],
          ),
          (0, r.jsx)("div", {
            ref: ea,
            className: (0, c.cn)(
              "relative isolate h-full min-h-[240px] w-full overflow-hidden",
              Z,
            ),
            style: { backgroundColor: t, ...K },
            children:
              ee &&
              (0, r.jsx)("div", {
                className: "relative z-10 h-full w-full",
                children: ee,
              }),
          })
        );
      });
    j.displayName = "GlyphOrb";
    let T = {
        dense:
          " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
        minimal: " .:-=+*#%@",
        blocks: " ░▒▓█",
        dots: " .\xb7:•●",
      },
      E = [
        { label: "Dense", value: "dense" },
        { label: "Minimal", value: "minimal" },
        { label: "Blocks", value: "blocks" },
        { label: "Dots", value: "dots" },
      ],
      B = {
        dark: ["#6D3DFF", "#FF9BE1"],
        light: ["#C9BEFF", "#3A1FB8"],
        charset: "dense",
        glyphSize: 10,
        size: 1,
        centerY: 0.5,
        tilt: -24,
        bands: 9,
        turbulence: 1,
        lightAngle: -45,
        lightHeight: 0.4,
        rim: 0.7,
      },
      I = {
        aurora: B,
        eclipse: { ...B, lightAngle: -90, lightHeight: 0.1, rim: 1.1 },
        horizon: {
          ...B,
          size: 3.3,
          centerY: 1.62,
          tilt: -6,
          lightAngle: 0,
          lightHeight: 0.12,
        },
        jupiter: {
          ...B,
          dark: ["#B8431F", "#FFE3C2"],
          light: ["#F2C3A8", "#8A2E0F"],
          bands: 12,
          turbulence: 1.4,
        },
        neptune: {
          ...B,
          dark: ["#2A4BFF", "#A8ECFF"],
          light: ["#B8C6FF", "#1E3AB8"],
          bands: 7,
          turbulence: 0.7,
        },
        pixel: { ...B, charset: "blocks", glyphSize: 9 },
        mono: {
          ...B,
          dark: ["#5A5A5A", "#FFFFFF"],
          light: ["#C4C4C4", "#1A1A1A"],
          bands: 5,
          turbulence: 1.6,
        },
      },
      q = [
        { label: "Aurora", value: "aurora" },
        { label: "Eclipse", value: "eclipse" },
        { label: "Horizon", value: "horizon" },
        { label: "Jupiter", value: "jupiter" },
        { label: "Neptune", value: "neptune" },
        { label: "Pixel", value: "pixel" },
        { label: "Mono", value: "mono" },
      ],
      U = [
        { label: "Auto", value: "auto" },
        { label: "Glow", value: "glow" },
        { label: "Ink", value: "ink" },
      ],
      G = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#6D3DFF", "#FF9BE1"]',
          description:
            "Colour of the planet's shadowed bands and colour of its sunlit clouds, blended in OKLab. The brightest limb burns toward white.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"#0A0A0A"',
          description: "Colour of the space around the planet.",
        },
        {
          name: "mode",
          type: '"auto" | "glow" | "ink"',
          default: '"auto"',
          description:
            "glow adds light for dark backgrounds, ink prints coloured characters for light ones. auto picks from the background brightness.",
        },
        {
          name: "charset",
          type: "string",
          default: "dense ASCII ramp",
          description:
            "Characters the planet is drawn with. They are sorted by how much ink each one uses, so any string works as a brightness ramp.",
        },
        {
          name: "fontFamily",
          type: "string",
          default: "system monospace",
          description:
            "Font used to draw the characters. Use a font that is already loaded on the page.",
        },
        {
          name: "glyphSize",
          type: "number",
          default: "10",
          description:
            "Height of the characters in pixels. Smaller characters give a finer, more photographic planet.",
        },
        {
          name: "spacing",
          type: "number",
          default: "1.1",
          description:
            "Horizontal gap between character columns, from 0.6 (packed) to 2.5 (airy).",
        },
        {
          name: "size",
          type: "number",
          default: "1",
          description:
            "Size of the planet relative to the frame. Large values with a low centerY make a horizon.",
        },
        {
          name: "centerX",
          type: "number",
          default: "0.5",
          description:
            "Horizontal position of the planet, from 0 (left) to 1 (right). Values outside that range move it off-frame.",
        },
        {
          name: "centerY",
          type: "number",
          default: "0.5",
          description:
            "Vertical position of the planet, from 0 (top) to 1 (bottom). Values above 1 let it rise from below the frame.",
        },
        {
          name: "tilt",
          type: "number",
          default: "-24",
          description: "Lean of the planet's axis in degrees.",
        },
        {
          name: "spin",
          type: "number",
          default: "1",
          description:
            "Rotation speed. Negative values turn the planet the other way.",
        },
        {
          name: "bands",
          type: "number",
          default: "9",
          description: "Number of cloud bands from pole to pole.",
        },
        {
          name: "turbulence",
          type: "number",
          default: "1",
          description:
            "How much the bands swirl and break into eddies, from 0 (clean stripes) to 3.",
        },
        {
          name: "lightAngle",
          type: "number",
          default: "-45",
          description:
            "Direction the sunlight comes from, in degrees around the planet. 0 lights it from above.",
        },
        {
          name: "lightHeight",
          type: "number",
          default: "0.4",
          description:
            "How far in front of the planet the sun sits, from 0 (behind it, a thin crescent) to 1 (in front, fully lit).",
        },
        {
          name: "hoverLight",
          type: "boolean",
          default: "true",
          description:
            "The sun follows the pointer around the planet, so the lit side turns to face it, then drifts back when the pointer leaves.",
        },
        {
          name: "rim",
          type: "number",
          default: "0.7",
          description:
            "Brightness of the sunlit rim where light scatters through the planet's edge, from 0 to 2.",
        },
        {
          name: "atmosphere",
          type: "number",
          default: "0.6",
          description: "Faint haze just beyond the lit limb, from 0 to 2.",
        },
        {
          name: "contrast",
          type: "number",
          default: "0.4",
          description:
            "How quickly the characters get denser with brightness, from 0 (soft) to 1 (punchy).",
        },
        {
          name: "glow",
          type: "number",
          default: "0.12",
          description:
            "Soft bloom around the brightest characters, from 0 to 3.",
        },
        {
          name: "intensity",
          type: "number",
          default: "1",
          description: "Overall exposure.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description: "Respond to the pointer.",
        },
        {
          name: "draggable",
          type: "boolean",
          default: "true",
          description:
            "Grab the planet and spin it in any direction. It keeps its momentum, then settles back to its natural axis.",
        },
        {
          name: "momentum",
          type: "number",
          default: "0.5",
          description:
            "How long a spin keeps going before it slows, from 0 to 1.",
        },
        {
          name: "clickStorm",
          type: "boolean",
          default: "true",
          description:
            "Clicking the planet seeds a storm: the clouds there curl into a spinning vortex that drifts with the rotation and slowly dissolves.",
        },
        {
          name: "stormStrength",
          type: "number",
          default: "1",
          description: "How tightly a storm winds, from 0 to 3.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Freeze the planet. Reduced-motion users always get a still frame.",
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
          type: "{ storm }",
          default: "—",
          description:
            "storm(x, y) seeds a storm at a point on the planet's disc, given as fractions from 0 to 1.",
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
      R = () => {
        let [e, t] = (0, o.I)(),
          a = "dark" === (0, i.Y)(),
          [u, s] = (0, n.useState)("aurora"),
          [c, d] = (0, n.useState)(B),
          m = (e) => (t) => d((a) => ({ ...a, [e]: t })),
          [h, p] = (0, n.useState)(null),
          v = h ?? (a ? c.dark : c.light),
          f = (e) => (t) => {
            let a = [...v];
            ((a[e] = t), p(a));
          },
          [g, x] = (0, n.useState)(null),
          b = g ?? (a ? "#0A0A0A" : "#FFFFFF"),
          [y, w] = (0, n.useState)("auto"),
          [C, S] = (0, n.useState)(1.1),
          [k, M] = (0, n.useState)(0.5),
          [F, L] = (0, n.useState)(1),
          [A, z] = (0, n.useState)(0.6),
          [R, N] = (0, n.useState)(0.4),
          [P, D] = (0, n.useState)(0.12),
          [H, Y] = (0, n.useState)(1),
          [_, W] = (0, n.useState)(0.5),
          [X, O] = (0, n.useState)(1),
          [$, V] = (0, n.useState)(!0),
          [Q, J] = (0, n.useState)(!0),
          [Z, K] = (0, n.useState)(!0),
          [ee, et] = (0, n.useState)(!0),
          [ea, er] = (0, n.useState)(!1);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(l.Bg, {}),
            (0, r.jsxs)(l.VX, {
              children: [
                (0, r.jsxs)(l.Ec, {
                  children: [
                    (0, r.jsx)(l.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          j,
                          {
                            colors: v,
                            backgroundColor: b,
                            mode: y,
                            charset: T[c.charset] ?? T.dense,
                            glyphSize: c.glyphSize,
                            spacing: C,
                            size: c.size,
                            centerX: k,
                            centerY: c.centerY,
                            tilt: c.tilt,
                            spin: F,
                            bands: c.bands,
                            turbulence: c.turbulence,
                            lightAngle: c.lightAngle,
                            lightHeight: c.lightHeight,
                            hoverLight: $,
                            rim: c.rim,
                            atmosphere: A,
                            contrast: R,
                            glow: P,
                            intensity: H,
                            interactive: ee,
                            draggable: Q,
                            momentum: _,
                            clickStorm: Z,
                            stormStrength: X,
                            paused: ea,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(l.IH, {
                      children: [
                        (0, r.jsx)(l.bg, {
                          title: "Preset",
                          value: u,
                          options: q,
                          onChange: (e) => {
                            (s(e), d(I[e] ?? B), p(null));
                          },
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Mode",
                          value: y,
                          options: U,
                          onChange: (e) => w(e),
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Charset",
                          value: c.charset,
                          options: E,
                          onChange: m("charset"),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Shadow",
                          value: v[0],
                          onChange: f(0),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Sunlit",
                          value: v[1],
                          onChange: f(1),
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Background",
                          value: b,
                          onChange: x,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Glyph Size",
                          min: 6,
                          max: 24,
                          step: 1,
                          value: c.glyphSize,
                          valueUnit: "px",
                          onChange: m("glyphSize"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Spacing",
                          min: 0.6,
                          max: 2.5,
                          step: 0.05,
                          value: C,
                          onChange: S,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Size",
                          min: 0.3,
                          max: 4,
                          step: 0.01,
                          value: c.size,
                          onChange: m("size"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Center X",
                          min: -0.2,
                          max: 1.2,
                          step: 0.01,
                          value: k,
                          onChange: M,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Center Y",
                          min: -0.2,
                          max: 2,
                          step: 0.01,
                          value: c.centerY,
                          onChange: m("centerY"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Tilt",
                          min: -90,
                          max: 90,
                          step: 1,
                          value: c.tilt,
                          valueUnit: "\xb0",
                          onChange: m("tilt"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Spin",
                          min: -4,
                          max: 4,
                          step: 0.05,
                          value: F,
                          onChange: L,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Bands",
                          min: 1,
                          max: 24,
                          step: 0.5,
                          value: c.bands,
                          onChange: m("bands"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Turbulence",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: c.turbulence,
                          onChange: m("turbulence"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Light Angle",
                          min: -180,
                          max: 180,
                          step: 1,
                          value: c.lightAngle,
                          valueUnit: "\xb0",
                          onChange: m("lightAngle"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Light Height",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.lightHeight,
                          onChange: m("lightHeight"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Rim",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: c.rim,
                          onChange: m("rim"),
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Atmosphere",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: A,
                          onChange: z,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Contrast",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: R,
                          onChange: N,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Glow",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: P,
                          onChange: D,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Intensity",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: H,
                          onChange: Y,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Momentum",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: _,
                          onChange: W,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Storm Strength",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: X,
                          onChange: O,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Hover Light",
                          checked: $,
                          onChange: V,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Draggable",
                          checked: Q,
                          onChange: J,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Click Storm",
                          checked: Z,
                          onChange: K,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Interactive",
                          checked: ee,
                          onChange: et,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Paused",
                          checked: ea,
                          onChange: er,
                        }),
                      ],
                    }),
                    (0, r.jsx)(l.Ub, { data: G }),
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
