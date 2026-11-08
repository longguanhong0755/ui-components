/* ReactBits Pro public preview module 76728 for glyph-ember.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/76728.54db572a744377fd.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  76728: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => U }));
    var l = a(95155),
      o = a(12115),
      r = a(56388),
      n = a(86049),
      u = a(90761),
      i = a(2253),
      s = a(12246),
      c = a(90650);
    let f = 1 / 60,
      d =
        " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
      m =
        'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      v = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      p = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      h = (e, t, a) => Math.min(a, Math.max(t, e)),
      g = null,
      x = (e, t) => {
        if ((g || (g = document.createElement("canvas").getContext("2d")), !g))
          return t;
        ((g.fillStyle = "#010203"), (g.fillStyle = e));
        let a = String(g.fillStyle);
        if ("#010203" === a && "#010203" !== e.trim().toLowerCase()) return t;
        if (a.startsWith("#")) {
          let e = a.slice(1);
          return [
            parseInt(e.slice(0, 2), 16) / 255,
            parseInt(e.slice(2, 4), 16) / 255,
            parseInt(e.slice(4, 6), 16) / 255,
          ];
        }
        let l = a.match(/[\d.]+/g);
        return !l || l.length < 3
          ? t
          : [Number(l[0]) / 255, Number(l[1]) / 255, Number(l[2]) / 255];
      },
      b = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      y = ([e, t, a]) => {
        let l = b(e),
          o = b(t),
          r = b(a),
          n = Math.cbrt(0.4122214708 * l + 0.5363325363 * o + 0.0514459929 * r),
          u = Math.cbrt(0.2119034982 * l + 0.6806995451 * o + 0.1073969566 * r),
          i = Math.cbrt(0.0883024619 * l + 0.2817188376 * o + 0.6299787005 * r);
        return [
          0.2104542553 * n + 0.793617785 * u - 0.0040720468 * i,
          1.9779984951 * n - 2.428592205 * u + 0.4505937099 * i,
          0.0259040371 * n + 0.7827717662 * u - 0.808675766 * i,
        ];
      },
      k = `
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
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

float fbm(vec2 p) {
  return 0.66 * noise(p) + 0.34 * noise(p * 2.07 + 13.1);
}
`,
      S = `
precision highp float;
uniform sampler2D uState;
uniform vec2 uGrid;
uniform float uTime;
uniform float uDt;
uniform float uRise;
uniform float uWind;
uniform float uTurb;
uniform float uCool;
uniform float uFuel;
uniform float uSmokeRate;
uniform vec4 uSnuff;
uniform vec4 uStokes[4];
${k}
out vec4 fragColor;

vec2 curl(vec2 p, float t) {
  float e = 0.5;
  vec2 drift = vec2(0.0, -t * 0.55);
  float n = fbm(p + drift + vec2(0.0, e));
  float s = fbm(p + drift - vec2(0.0, e));
  float r = fbm(p + drift + vec2(e, 0.0));
  float l = fbm(p + drift - vec2(e, 0.0));
  return vec2(n - s, l - r) / (2.0 * e);
}

float stokeAt(float x) {
  float total = 0.0;
  for (int k = 0; k < 4; k++) {
    vec4 s = uStokes[k];
    if (s.z <= 0.0) continue;
    float age = uTime - s.y;
    if (age < 0.0 || age > 4.0) continue;
    float g = (x - s.x) / s.w;
    total += s.z * exp(-g * g) * smoothstep(0.0, 0.12, age) * exp(-age / 0.9);
  }
  return total;
}

void main() {
  vec2 p = gl_FragCoord.xy;
  vec4 here = texture(uState, p / uGrid);
  float stoke = stokeAt(p.x);
  float warm = clamp(here.r, 0.0, 1.2);
  float lift = min(stoke, 1.5);
  vec2 swirl = curl(p * 0.075, uTime) * uTurb * (0.35 + 0.65 * warm) * (1.0 + 0.7 * lift);
  float gust = 0.75 + 0.5 * noise(vec2(uTime * 0.18, p.y * 0.015));
  vec2 velocity = vec2(uWind * gust, uRise * (0.55 + 0.6 * warm) * (1.0 + 1.1 * lift)) + swirl;
  vec4 previous = texture(uState, (p - velocity * uDt) / uGrid);
  float heat = previous.r;
  float smoke = previous.g;
  float patches = fbm(vec2(p.x * 0.075, p.y * 0.075 - uTime * uRise * 0.075));
  float cool = uCool * mix(0.4, 2.3, smoothstep(0.32, 0.78, patches)) / (1.0 + 0.45 * lift);
  float cooled = heat * (1.0 - exp(-cool * uDt));
  heat -= cooled;
  smoke += cooled * uSmokeRate;
  float d = length(p - uSnuff.xy) / max(uSnuff.z, 1.0);
  float douse = uSnuff.w * exp(-d * d);
  float doused = heat * (1.0 - exp(-douse * 9.0 * uDt));
  heat -= doused;
  smoke += doused * 0.85;
  smoke = min(smoke * exp(-uDt * 0.55), 1.0);
  if (p.y < 2.0) {
    float bed = 0.52 + 0.62 * fbm(vec2(p.x * 0.05 + uTime * 0.22, uTime * 0.4));
    float grain = hash(vec2(p.x, floor(uTime * 30.0)));
    heat = min(uFuel * bed * (0.82 + 0.36 * grain) * (1.0 + 0.25 * stoke), 1.0);
    smoke = 0.0;
  }
  fragColor = vec4(heat, smoke, 0.0, 1.0);
}
`,
      w = `
in vec4 aSpark;
uniform vec2 uGrid;
uniform float uTime;
uniform float uRise;
uniform float uWind;
uniform float uAmount;
uniform vec4 uStokes[4];
${k}
out float vBright;

void main() {
  float kind = aSpark.x;
  float lag = aSpark.y * 0.07;
  float s1 = aSpark.z;
  float s2 = aSpark.w;
  vec2 position = vec2(-10.0);
  float bright = 0.0;
  if (kind < 0.5) {
    float period = 1.8 + 1.8 * s1;
    float phase = (uTime + s2 * 17.0 * period) / period;
    float cycle = floor(phase);
    float age = fract(phase) * period - lag;
    float alive = step(hash(vec2(s1 * 91.0, cycle)), uAmount * 0.8);
    float x0 = hash(vec2(cycle * 1.7, s2 * 53.0)) * uGrid.x;
    float lift = uRise * (1.1 + 0.9 * s2) * 1.5;
    float y = 1.5 + lift * (1.0 - exp(-max(age, 0.0) / 1.5));
    float x = x0 + uWind * age * 1.1 + sin(age * (2.0 + 3.0 * s2) + s1 * 6.2831853) * (0.6 + age);
    bright = alive * step(0.0, age) * (1.0 - age / period) * smoothstep(0.0, 0.08, age);
    position = vec2(x, y);
  } else {
    vec4 stoke = uStokes[int(kind) - 1];
    float age = uTime - stoke.y - lag;
    if (stoke.z > 0.0 && age > 0.0 && age < 2.6) {
      float angle = (s1 - 0.5) * 1.4;
      float lift = uRise * (1.4 + 1.9 * s2) * (0.7 + 0.3 * stoke.z) * 1.2;
      float travel = lift * (1.0 - exp(-age / 1.2));
      position = vec2(stoke.x + (s2 - 0.5) * stoke.w * 0.9 + sin(angle) * travel + uWind * age, 1.5 + cos(angle) * travel);
      bright = (1.0 - age / 2.6) * smoothstep(0.0, 0.05, age) * min(stoke.z, 1.5);
    }
  }
  vBright = bright * (1.0 - aSpark.y * 0.45);
  gl_PointSize = 1.0;
  gl_Position = vec4((floor(position) + 0.5) / uGrid * 2.0 - 1.0, 0.0, 1.0);
}
`,
      C = `
precision highp float;
in float vBright;
out vec4 fragColor;

void main() {
  fragColor = vec4(vBright, 0.0, 0.0, 1.0);
}
`,
      F = `
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      T = `
precision highp float;
uniform sampler2D uState;
uniform sampler2D uSparks;
uniform sampler2D uAtlas;
uniform vec2 uAtlasGrid;
uniform vec2 uCell;
uniform float uCount;
uniform float uSparkGlyph;
uniform float uTime;
uniform float uFlicker;
uniform float uInk;
uniform vec3 uLabBody;
uniform vec3 uLabCore;
in vec2 vUv;
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

float hash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

vec3 flame(float t) {
  vec3 deep = vec3(uLabBody.x * 0.38, uLabBody.yz * 0.8);
  vec3 white = mix(vec3(0.97, uLabCore.yz * 0.22), vec3(uLabCore.x * 0.75, uLabCore.yz * 1.1), uInk);
  vec3 lab = t < 0.45 ? mix(deep, uLabBody, smoothstep(0.0, 0.45, t))
    : t < 0.86 ? mix(uLabBody, uLabCore, smoothstep(0.45, 0.86, t))
    : mix(uLabCore, white, smoothstep(0.86, 1.0, t));
  return labToLinear(lab);
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

void main() {
  vec2 g = gl_FragCoord.xy / uCell;
  ivec2 cell = ivec2(floor(g));
  vec4 state = texelFetch(uState, cell, 0);
  float spark = texelFetch(uSparks, cell, 0).r;
  float heat = max(state.r, 0.0);
  float smoke = max(state.g, 0.0) * (1.0 - smoothstep(0.04, 0.2, heat));
  float beat = floor(uTime * (3.0 + 21.0 * uFlicker));
  float jitter = (hash(vec3(vec2(cell), beat)) - 0.5) * (0.06 + 0.3 * uFlicker);
  float level = clamp(heat + jitter * step(0.04, heat), 0.0, 1.0);
  float haze = clamp(smoke * 0.6, 0.0, 0.42);
  vec3 color = vec3(0.0);
  float energy = 0.0;
  if (spark > 0.12) {
    float sparkIndex = uSparkGlyph + clamp(floor(spark * 3.0), 0.0, 2.0);
    float cover = glyphCoverage(sparkIndex, g);
    color = mix(labToLinear(vec3(min(uLabCore.x + 0.12, 0.98), uLabCore.yz * 0.6)), flame(0.7), uInk);
    energy = cover * min(spark, 1.4) * 1.25;
  } else if (level > 0.05) {
    float index = floor(pow(level, 0.85) * (uCount - 1.0) + 0.5);
    float cover = glyphCoverage(max(index, 1.0), g);
    color = flame(level);
    energy = cover * smoothstep(0.05, 0.12, level) * (0.1 + 1.1 * pow(level, 1.8));
  } else if (haze > 0.05) {
    float index = floor(haze * (uCount - 1.0) + 0.5);
    float cover = glyphCoverage(max(index, 1.0), g);
    color = labToLinear(vec3(mix(0.62, 0.45, uInk), uLabBody.yz * 0.16));
    energy = cover * haze * 0.6;
  }
  fragColor = vec4(color * energy, energy);
}
`,
      A = `
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
      B = `
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
      j = `
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
      L = (0, o.forwardRef)(function (
        {
          colors: e = ["#7B3DFF", "#FF7AD9"],
          backgroundColor: t = "#0A0A0A",
          mode: a = "auto",
          charset: r = d,
          fontFamily: n = m,
          glyphSize: u = 11,
          spacing: g = 1,
          height: k = 0.45,
          fuel: L = 1,
          turbulence: M = 0.6,
          wind: E = 0.15,
          flicker: z = 0.5,
          sparks: R = 0.5,
          smoke: G = 0.35,
          pulse: I = 0,
          speed: D = 1,
          glow: U = 0.35,
          intensity: W = 1,
          interactive: P = !0,
          snuff: q = !0,
          snuffRadius: H = 70,
          snuffStrength: _ = 0.8,
          clickStoke: N = !0,
          stokeStrength: Y = 1,
          paused: O = !1,
          quality: X = 1,
          className: $,
          style: Q,
          children: V,
        },
        Z,
      ) {
        let K = (0, o.useRef)(null),
          J = (0, o.useRef)(null),
          ee = (0, o.useSyncExternalStore)(v, p, () => !1),
          et = (0, o.useRef)({
            colors: e,
            backgroundColor: t,
            mode: a,
            charset: r,
            fontFamily: n,
            glyphSize: u,
            spacing: g,
            height: k,
            fuel: L,
            turbulence: M,
            wind: E,
            flicker: z,
            sparks: R,
            smoke: G,
            pulse: I,
            speed: D,
            glow: U,
            intensity: W,
            interactive: P,
            snuff: q,
            snuffRadius: H,
            snuffStrength: _,
            clickStoke: N,
            stokeStrength: Y,
            paused: O,
            quality: X,
            reduced: ee,
          });
        return (
          (0, o.useEffect)(() => {
            ((et.current = {
              colors: e,
              backgroundColor: t,
              mode: a,
              charset: r,
              fontFamily: n,
              glyphSize: u,
              spacing: g,
              height: k,
              fuel: L,
              turbulence: M,
              wind: E,
              flicker: z,
              sparks: R,
              smoke: G,
              pulse: I,
              speed: D,
              glow: U,
              intensity: W,
              interactive: P,
              snuff: q,
              snuffRadius: H,
              snuffStrength: _,
              clickStoke: N,
              stokeStrength: Y,
              paused: O,
              quality: X,
              reduced: ee,
            }),
              J.current?.sync());
          }),
          (0, o.useEffect)(() => {
            let e = K.current;
            if (!e) return;
            let t = ((e, t) => {
              let a,
                l = document.createElement("canvas");
              (l.setAttribute("aria-hidden", "true"),
                (l.style.position = "absolute"),
                (l.style.inset = "0"),
                (l.style.width = "100%"),
                (l.style.height = "100%"),
                (l.style.display = "block"),
                (l.style.pointerEvents = "none"),
                e.prepend(l));
              try {
                a = new s.WebGLRenderer({
                  canvas: l,
                  alpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return (l.remove(), null);
              }
              if (!a.capabilities.isWebGL2)
                return (a.dispose(), l.remove(), null);
              a.autoClear = !1;
              let o =
                  a.extensions.has("EXT_color_buffer_float") ||
                  a.extensions.has("EXT_color_buffer_half_float")
                    ? i.ix0
                    : i.OUM,
                r = new i.qUd(-1, 1, 1, -1, 0, 1),
                n = new i.bdM(2, 2),
                u = Array.from({ length: 4 }, () => new i.IUQ(0, -100, 0, 1)),
                c = {
                  x: 0,
                  y: 0,
                  vx: 0,
                  vy: 0,
                  goalX: 0,
                  goalY: 0,
                  amount: 0,
                  inside: !1,
                  placed: !1,
                },
                v = (e, t) =>
                  new i.BKk({
                    glslVersion: i.Wdf,
                    uniforms: t,
                    vertexShader: F,
                    fragmentShader: e,
                    depthTest: !1,
                    depthWrite: !1,
                    blending: i.XIg,
                  }),
                p = v(S, {
                  uState: { value: null },
                  uGrid: { value: new i.I9Y(1, 1) },
                  uTime: { value: 0 },
                  uDt: { value: f },
                  uRise: { value: 20 },
                  uWind: { value: 0 },
                  uTurb: { value: 10 },
                  uCool: { value: 1 },
                  uFuel: { value: 1 },
                  uSmokeRate: { value: 0.3 },
                  uSnuff: { value: new i.IUQ(-100, -100, 10, 0) },
                  uStokes: { value: u },
                }),
                g = new i.BKk({
                  glslVersion: i.Wdf,
                  uniforms: {
                    uGrid: { value: new i.I9Y(1, 1) },
                    uTime: { value: 0 },
                    uRise: { value: 20 },
                    uWind: { value: 0 },
                    uAmount: { value: 0.5 },
                    uStokes: { value: u },
                  },
                  vertexShader: w,
                  fragmentShader: C,
                  depthTest: !1,
                  depthWrite: !1,
                  transparent: !0,
                  blending: i.bCz,
                  blendEquation: i.gO9,
                  blendSrc: i.qad,
                  blendDst: i.qad,
                  blendSrcAlpha: i.qad,
                  blendDstAlpha: i.qad,
                }),
                k = v(T, {
                  uState: { value: null },
                  uSparks: { value: null },
                  uAtlas: { value: null },
                  uAtlasGrid: { value: new i.I9Y(16, 1) },
                  uCell: { value: new i.I9Y(8, 12) },
                  uCount: { value: 2 },
                  uSparkGlyph: { value: 2 },
                  uTime: { value: 0 },
                  uFlicker: { value: 0.5 },
                  uInk: { value: 0 },
                  uLabBody: { value: new i.Pq0() },
                  uLabCore: { value: new i.Pq0() },
                }),
                L = v(A, {
                  uSource: { value: null },
                  uTexel: { value: new i.I9Y() },
                }),
                M = v(B, {
                  uSource: { value: null },
                  uBase: { value: null },
                  uTexel: { value: new i.I9Y() },
                }),
                E = v(j, {
                  uLines: { value: null },
                  uBloom: { value: null },
                  uBackground: { value: new i.Pq0() },
                  uGlow: { value: 0.35 },
                  uExposure: { value: 1.3 },
                  uMode: { value: 0 },
                  uGrain: { value: 0 },
                }),
                z = new i.eaF(n, E);
              z.frustumCulled = !1;
              let R = new i.Z58();
              R.add(z);
              let G = new i.ONl(
                (() => {
                  let e,
                    t =
                      ((e = 131),
                      () => (e = (16807 * e) % 0x7fffffff) / 0x7fffffff),
                    a = [],
                    l = (e, l) => {
                      for (let o = 0; o < l; o++) {
                        let l = t(),
                          o = t();
                        a.push(e, 0, l, o, e, 1, l, o);
                      }
                    };
                  l(0, 72);
                  for (let e = 1; e <= 4; e++) l(e, 42);
                  let o = new Float32Array(a),
                    r = new i.LoY();
                  return (
                    r.setAttribute("aSpark", new i.THS(o, 4)),
                    r.setAttribute(
                      "position",
                      new i.THS(new Float32Array((o.length / 4) * 3), 3),
                    ),
                    r
                  );
                })(),
                g,
              );
              G.frustumCulled = !1;
              let I = new i.Z58();
              I.add(G);
              let D = (e, t, a) =>
                  new i.nWS(Math.max(1, e), Math.max(1, t), {
                    type: o,
                    format: i.GWd,
                    minFilter: a,
                    magFilter: a,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    generateMipmaps: !1,
                  }),
                U = null,
                W = [],
                P = [],
                q = null,
                H = "",
                _ = null,
                N = "",
                Y = !1,
                O = 0,
                X = 0,
                $ = !0,
                Q = 30,
                V = 0,
                Z = 1,
                K = 1,
                J = 1,
                ee = 0,
                et = 0,
                ea = () => {
                  (U?.dispose(),
                    W.forEach((e) => e.dispose()),
                    P.forEach((e) => e.dispose()),
                    (U = null),
                    (W = []),
                    (P = []));
                },
                el = () => {
                  (q?.targets.forEach((e) => e.dispose()),
                    q?.sparks.dispose(),
                    (q = null));
                },
                eo = (e, t) => {
                  ((z.material = e), a.setRenderTarget(t), a.render(R, r));
                },
                er = () => {
                  let e = t.current,
                    a = String(e.charset ?? "") || d,
                    l = String(e.fontFamily ?? "") || m,
                    o = Math.round(h(h(e.glyphSize, 5, 48) * J * 1.25, 12, 96)),
                    r = `${a}|${l}|${o}`;
                  if (r !== N || !_) {
                    let e, t, n, u, s, c, f, d, m, v;
                    ((N = r),
                      _?.texture.dispose(),
                      (e = Array.from(new Set(Array.from(a))).slice(0, 180))
                        .length < 2 && e.push(".", "#"),
                      ((t = document.createElement("canvas")).width = o),
                      (t.height = o),
                      (n = t.getContext("2d", { willReadFrequently: !0 })),
                      (u = `500 ${Math.round(0.8 * o)}px ${l}`),
                      (f = Math.ceil(
                        (c = [
                          ...(s = e
                            .map((e) => ({
                              character: e,
                              ink: ((e) => {
                                if (!n) return 0;
                                ((n.fillStyle = "#000000"),
                                  n.fillRect(0, 0, o, o),
                                  (n.fillStyle = "#ffffff"),
                                  (n.textAlign = "center"),
                                  (n.textBaseline = "middle"),
                                  (n.font = u),
                                  n.fillText(e, o / 2, o / 2));
                                let t = n.getImageData(0, 0, o, o).data,
                                  a = 0;
                                for (let e = 0; e < t.length; e += 4) a += t[e];
                                return a;
                              })(e),
                            }))
                            .sort((e, t) => e.ink - t.ink)).map(
                            (e) => e.character,
                          ),
                          ...Array.from("\xb7+*"),
                        ]).length / 16,
                      )),
                      ((d = document.createElement("canvas")).width = 16 * o),
                      (d.height = f * o),
                      (m = d.getContext("2d")) &&
                        ((m.fillStyle = "#000000"),
                        m.fillRect(0, 0, d.width, d.height),
                        (m.fillStyle = "#ffffff"),
                        (m.textAlign = "center"),
                        (m.textBaseline = "middle"),
                        (m.font = u),
                        c.forEach((e, t) => {
                          let a = (t % 16) * o + o / 2,
                            l = Math.floor(t / 16) * o + o / 2 + 0.04 * o;
                          m.fillText(e, a, l);
                        })),
                      ((v = new i.GOR(d)).minFilter = i.$_I),
                      (v.magFilter = i.k6q),
                      (v.generateMipmaps = !0),
                      (v.colorSpace = i.jf0),
                      (v.flipY = !1),
                      (v.anisotropy = 4),
                      (v.needsUpdate = !0),
                      (_ = { texture: v, count: s.length, rows: f }),
                      (k.uniforms.uAtlas.value = _.texture),
                      k.uniforms.uAtlasGrid.value.set(16, _.rows),
                      (k.uniforms.uCount.value = _.count),
                      (k.uniforms.uSparkGlyph.value = _.count));
                  }
                },
                en = () => {
                  let e = t.current,
                    a = q ? q.rows : 1,
                    l = h(e.height, 0.1, 1.2) * a,
                    o = (l / 1.15) * h(e.speed, 0, 4);
                  return {
                    rise: o,
                    cool: (2.6 * o) / Math.max(l, 1),
                    wind: h(e.wind, -1, 1) * o * 0.55,
                    turbulence: h(e.turbulence, 0, 2) * o * 0.9,
                  };
                },
                eu = (e) => {
                  if (!q) return;
                  let a = t.current,
                    l = en(),
                    o = p.uniforms,
                    r =
                      1 +
                      0.35 *
                        h(a.pulse, 0, 1) *
                        Math.sin(0.9 * Q) *
                        Math.sin(0.37 * Q + 1.3);
                  (o.uGrid.value.set(q.cols, q.rows),
                    (o.uTime.value = Q),
                    (o.uDt.value = e),
                    (o.uRise.value = l.rise),
                    (o.uWind.value = l.wind),
                    (o.uTurb.value = l.turbulence),
                    (o.uCool.value = l.cool),
                    (o.uFuel.value = h(a.fuel, 0, 2) * r),
                    (o.uSmokeRate.value = 0.22 * h(a.smoke, 0, 1)),
                    o.uSnuff.value.set(
                      c.x,
                      c.y,
                      h(a.snuffRadius, 10, 400) / q.cellH,
                      c.amount * h(a.snuffStrength, 0, 1),
                    ),
                    (o.uState.value = q.targets[q.index].texture),
                    eo(p, q.targets[1 - q.index]),
                    (q.index = 1 - q.index));
                },
                ei = () => {
                  let e = t.current,
                    l = h(e.glyphSize, 5, 48) * J,
                    o = 1.02 * l,
                    r = 0.62 * l * h(e.spacing, 0.6, 3),
                    n = Math.ceil((Z * J) / r),
                    u = Math.ceil((K * J) / o),
                    s = [n, u, r.toFixed(3), o.toFixed(3)].join("|");
                  if (s === H && q) return;
                  ((H = s), el());
                  let c = [0, 1].map(() => D(n, u, i.k6q));
                  for (let e of c)
                    (a.setRenderTarget(e), a.setClearColor(0, 0), a.clear());
                  q = {
                    cols: n,
                    rows: u,
                    cellW: r,
                    cellH: o,
                    targets: c,
                    sparks: D(n, u, i.hxR),
                    index: 0,
                  };
                  for (let e = 0; e < 3; e += f) ((Q += f), eu(f));
                },
                es = () => {
                  if (!U || !W.length) return;
                  (er(),
                    ei(),
                    (() => {
                      if (!q) return;
                      let e = t.current,
                        l = en(),
                        o = g.uniforms;
                      (o.uGrid.value.set(q.cols, q.rows),
                        (o.uTime.value = Q),
                        (o.uRise.value = l.rise),
                        (o.uWind.value = l.wind),
                        (o.uAmount.value = e.reduced ? 0 : h(e.sparks, 0, 1)),
                        a.setRenderTarget(q.sparks),
                        a.setClearColor(0, 0),
                        a.clear(),
                        a.render(I, r));
                    })(),
                    (() => {
                      let e = t.current;
                      if (!q) return;
                      let a = x(e.backgroundColor, [0.04, 0.04, 0.04]),
                        l = 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2],
                        o = "ink" === e.mode || ("auto" === e.mode && l > 0.5),
                        r = y(x(e.colors[0], [0.48, 0.24, 1])),
                        n = y(x(e.colors[1], [1, 0.5, 0.85])),
                        u = k.uniforms;
                      ((u.uState.value = q.targets[q.index].texture),
                        (u.uSparks.value = q.sparks.texture),
                        u.uCell.value.set(q.cellW, q.cellH),
                        (u.uTime.value = Q),
                        (u.uFlicker.value = e.reduced ? 0 : h(e.flicker, 0, 1)),
                        (u.uInk.value = +!!o),
                        u.uLabBody.value.set(r[0], r[1], r[2]),
                        u.uLabCore.value.set(n[0], n[1], n[2]));
                      let i = E.uniforms;
                      (i.uBackground.value.set(b(a[0]), b(a[1]), b(a[2])),
                        (i.uGlow.value = h(e.glow, 0, 3)),
                        (i.uExposure.value =
                          (o ? 5 : 1.05) * h(e.intensity, 0, 4)),
                        (i.uMode.value = +!!o),
                        (i.uGrain.value = ee));
                    })(),
                    eo(k, U));
                  let e = U;
                  for (let t of W)
                    ((L.uniforms.uSource.value = e.texture),
                      L.uniforms.uTexel.value.set(1 / e.width, 1 / e.height),
                      eo(L, t),
                      (e = t));
                  let l = W[W.length - 1];
                  for (let e = W.length - 2; e >= 0; e--)
                    ((M.uniforms.uSource.value = l.texture),
                      (M.uniforms.uBase.value = W[e].texture),
                      M.uniforms.uTexel.value.set(1 / l.width, 1 / l.height),
                      eo(M, P[e]),
                      (l = P[e]));
                  ((E.uniforms.uLines.value = U.texture),
                    (E.uniforms.uBloom.value = l.texture),
                    eo(E, null));
                },
                ec = (e) => {
                  if (((O = 0), Y)) return;
                  let a = Math.min(0.05, Math.max(0, (e - X) / 1e3));
                  X = e;
                  let l = t.current,
                    o =
                      c.inside && l.interactive && l.snuff && !l.reduced
                        ? 1
                        : 0;
                  if (
                    ((c.amount += (o - c.amount) * (1 - Math.exp(-a / 0.3))),
                    (c.vx += (100 * (c.goalX - c.x) - 20 * c.vx) * a),
                    (c.vy += (100 * (c.goalY - c.y) - 20 * c.vy) * a),
                    (c.x += c.vx * a),
                    (c.y += c.vy * a),
                    !l.paused && !l.reduced)
                  ) {
                    for (er(), ei(), V = Math.min(V + a, 4 * f); V >= f;)
                      ((V -= f), (Q += f), eu(f));
                    ee = (ee + 0.618034) % 1;
                  }
                  es();
                  let r = t.current,
                    n = !r.paused && !r.reduced;
                  $ && !document.hidden && n && (O = requestAnimationFrame(ec));
                };
              function ef() {
                Y ||
                  O ||
                  !$ ||
                  ((X = performance.now()), (O = requestAnimationFrame(ec)));
              }
              let ed = () => {
                  let l = e.getBoundingClientRect();
                  ((Z = Math.max(1, l.width)),
                    (K = Math.max(1, l.height)),
                    (J =
                      Math.min(window.devicePixelRatio || 1, 2) *
                      h(t.current.quality, 0.25, 1)),
                    a.setPixelRatio(J),
                    a.setSize(Z, K, !1));
                  let o = Math.round(Z * J),
                    r = Math.round(K * J);
                  (ea(), (U = D(o, r, i.k6q)));
                  let n = h(Math.floor(Math.log2(Math.min(o, r) / 8)), 3, 7);
                  for (let e = 1; e <= n; e++)
                    (W.push(D(o >> e, r >> e, i.k6q)),
                      P.push(D(o >> e, r >> e, i.k6q)));
                  (es(), ef());
                },
                em = (t) => {
                  let a = e.getBoundingClientRect(),
                    l = q ? q.cellW : 1,
                    o = q ? q.cellH : 1;
                  return [
                    ((t.clientX - a.left) * J) / l,
                    ((a.height - (t.clientY - a.top)) * J) / o,
                  ];
                },
                ev = (e) => {
                  if ("touch" === e.pointerType || !t.current.interactive)
                    return;
                  let [a, l] = em(e);
                  ((c.goalX = a),
                    (c.goalY = l),
                    c.placed || ((c.x = a), (c.y = l), (c.placed = !0)),
                    c.inside || ((c.inside = !0), ef()));
                },
                ep = () => {
                  ((c.inside = !1), (c.placed = !1), ef());
                },
                eh = (e) => {
                  let a = t.current;
                  a.reduced ||
                    a.paused ||
                    !q ||
                    (u[(et = (et + 1) % 4)].set(
                      e,
                      Q,
                      h(a.stokeStrength, 0, 3),
                      0.085 * q.cols,
                    ),
                    ef());
                },
                eg = (e) => {
                  let a = t.current;
                  if (0 !== e.button || !a.interactive || !a.clickStoke) return;
                  let [l] = em(e);
                  eh(l);
                };
              (e.addEventListener("pointermove", ev),
                e.addEventListener("pointerleave", ep),
                e.addEventListener("pointercancel", ep),
                e.addEventListener("pointerdown", eg));
              let ex = new ResizeObserver(ed);
              ex.observe(e);
              let eb = new IntersectionObserver(
                (e) => {
                  ($ = e.some((e) => e.isIntersecting)) && ef();
                },
                { rootMargin: "80px" },
              );
              eb.observe(e);
              let ey = () => {
                document.hidden || ef();
              };
              document.addEventListener("visibilitychange", ey);
              let ek = (e) => e.preventDefault();
              return (
                l.addEventListener("webglcontextlost", ek),
                ed(),
                {
                  sync: () => {
                    (Math.abs(
                      Math.min(window.devicePixelRatio || 1, 2) *
                        h(t.current.quality, 0.25, 1) -
                        J,
                    ) > 0.001
                      ? ed()
                      : es(),
                      ef());
                  },
                  destroy: () => {
                    ((Y = !0),
                      cancelAnimationFrame(O),
                      e.removeEventListener("pointermove", ev),
                      e.removeEventListener("pointerleave", ep),
                      e.removeEventListener("pointercancel", ep),
                      e.removeEventListener("pointerdown", eg),
                      document.removeEventListener("visibilitychange", ey),
                      l.removeEventListener("webglcontextlost", ek),
                      ex.disconnect(),
                      eb.disconnect(),
                      ea(),
                      el(),
                      _?.texture.dispose(),
                      G.geometry.dispose(),
                      n.dispose(),
                      [p, g, k, L, M, E].forEach((e) => e.dispose()),
                      a.dispose(),
                      a.forceContextLoss(),
                      l.remove());
                  },
                  stoke: (e) => eh(h(e, 0, 1) * (q ? q.cols : 0)),
                }
              );
            })(e, et);
            return (
              (J.current = t),
              () => {
                (t?.destroy(), (J.current = null));
              }
            );
          }, []),
          (0, o.useImperativeHandle)(
            Z,
            () => ({ stoke: (e = 0.5) => J.current?.stoke(e) }),
            [],
          ),
          (0, l.jsx)("div", {
            ref: K,
            className: (0, c.cn)(
              "relative isolate h-full min-h-[240px] w-full overflow-hidden",
              $,
            ),
            style: { backgroundColor: t, ...Q },
            children:
              V &&
              (0, l.jsx)("div", {
                className: "relative z-10 h-full w-full",
                children: V,
              }),
          })
        );
      });
    L.displayName = "GlyphEmber";
    let M = {
        dense:
          " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
        minimal: " .:-=+*#%@",
        blocks: " ░▒▓█",
        binary: " 01",
        hex: " 0123456789ABCDEF",
      },
      E = [
        { label: "Dense", value: "dense" },
        { label: "Minimal", value: "minimal" },
        { label: "Blocks", value: "blocks" },
        { label: "Binary", value: "binary" },
        { label: "Hex", value: "hex" },
      ],
      z = {
        dark: ["#7B3DFF", "#FF7AD9"],
        light: ["#5B2BFF", "#D13DB8"],
        charset: "dense",
        glyphSize: 11,
        height: 0.45,
        fuel: 1,
        turbulence: 0.6,
        wind: 0.15,
        sparks: 0.5,
      },
      R = {
        spirit: z,
        ember: {
          ...z,
          dark: ["#D1261C", "#FFB347"],
          light: ["#C2410C", "#E08A00"],
        },
        plasma: {
          ...z,
          dark: ["#2E5BFF", "#7FF6FF"],
          light: ["#1D4ED8", "#0891B2"],
        },
        pixel: {
          ...z,
          dark: ["#D1261C", "#FFB347"],
          light: ["#C2410C", "#E08A00"],
          charset: "blocks",
          glyphSize: 12,
        },
        hearth: {
          ...z,
          height: 0.3,
          fuel: 0.8,
          turbulence: 0.3,
          wind: 0,
          sparks: 0.15,
        },
        inferno: { ...z, height: 0.8, fuel: 1.2, turbulence: 1, sparks: 0.9 },
        mono: {
          ...z,
          dark: ["#5A5A5A", "#F2F2F2"],
          light: ["#1A1A1A", "#555555"],
        },
      },
      G = [
        { label: "Spirit", value: "spirit" },
        { label: "Ember", value: "ember" },
        { label: "Plasma", value: "plasma" },
        { label: "Pixel", value: "pixel" },
        { label: "Hearth", value: "hearth" },
        { label: "Inferno", value: "inferno" },
        { label: "Mono", value: "mono" },
      ],
      I = [
        { label: "Auto", value: "auto" },
        { label: "Glow", value: "glow" },
        { label: "Ink", value: "ink" },
      ],
      D = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#7B3DFF", "#FF7AD9"]',
          description:
            "Colour of the flame body and colour of its hot core, blended in OKLab. The tips fade to a deep shade of the first and the bed burns white-hot.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"#0A0A0A"',
          description: "Colour behind the fire.",
        },
        {
          name: "mode",
          type: '"auto" | "glow" | "ink"',
          default: '"auto"',
          description:
            "glow adds light for dark backgrounds, ink prints coloured glyphs for light ones. auto picks from the background brightness.",
        },
        {
          name: "charset",
          type: "string",
          default: "dense ASCII ramp",
          description:
            "Characters the fire is drawn with. They are sorted by how much ink each one uses, so any string works as a density ramp: letters, blocks, digits or your own.",
        },
        {
          name: "fontFamily",
          type: "string",
          default: "system monospace",
          description:
            "Font used to draw the glyphs. Use a font that is already loaded on the page.",
        },
        {
          name: "glyphSize",
          type: "number",
          default: "11",
          description:
            "Height of the glyphs in pixels. Smaller glyphs give a finer, denser fire.",
        },
        {
          name: "spacing",
          type: "number",
          default: "1",
          description:
            "Horizontal gap between glyph columns, from 0.6 (packed) to 3 (sparse).",
        },
        {
          name: "height",
          type: "number",
          default: "0.45",
          description:
            "How high the flames reach, as a fraction of the height.",
        },
        {
          name: "fuel",
          type: "number",
          default: "1",
          description: "Heat of the bed feeding the fire, from 0 to 2.",
        },
        {
          name: "turbulence",
          type: "number",
          default: "0.6",
          description:
            "How much the rising heat swirls and licks, from 0 (straight) to 2.",
        },
        {
          name: "wind",
          type: "number",
          default: "0.15",
          description:
            "Sideways draft from -1 (left) to 1 (right), with slow natural gusts.",
        },
        {
          name: "flicker",
          type: "number",
          default: "0.5",
          description:
            "How fast individual glyphs shimmer between neighbouring characters, from 0 to 1.",
        },
        {
          name: "sparks",
          type: "number",
          default: "0.5",
          description: "How many sparks drift up from the bed, from 0 to 1.",
        },
        {
          name: "smoke",
          type: "number",
          default: "0.35",
          description:
            "How much faint smoke the flame tips leave behind as they cool, from 0 to 1.",
        },
        {
          name: "pulse",
          type: "number",
          default: "0",
          description:
            "Slow breathing of the fire's heat, from 0 (steady) to 1.",
        },
        {
          name: "speed",
          type: "number",
          default: "1",
          description: "Overall animation speed.",
        },
        {
          name: "glow",
          type: "number",
          default: "0.35",
          description: "Soft bloom around the hottest glyphs, from 0 to 3.",
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
          name: "snuff",
          type: "boolean",
          default: "true",
          description:
            "The pointer snuffs the flames it touches. They die down around it and turn into grey smoke that curls upward, then the fire recovers when the pointer moves on.",
        },
        {
          name: "snuffRadius",
          type: "number",
          default: "70",
          description:
            "Radius of the snuffed zone around the pointer, in pixels.",
        },
        {
          name: "snuffStrength",
          type: "number",
          default: "0.8",
          description:
            "How strongly the pointer smothers the flames, from 0 to 1.",
        },
        {
          name: "clickStoke",
          type: "boolean",
          default: "true",
          description:
            "Clicking stokes the fire like a bellows: the flames there leap up and a burst of sparks flies upward.",
        },
        {
          name: "stokeStrength",
          type: "number",
          default: "1",
          description: "Strength of a stoke, from 0 to 3.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Freeze the fire. Reduced-motion users always get a still frame.",
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
          type: "{ stoke }",
          default: "—",
          description:
            "stoke(x) stokes the fire at a horizontal position between 0 and 1, for example when a form is submitted.",
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
      U = () => {
        let [e, t] = (0, u.I)(),
          a = "dark" === (0, n.Y)(),
          [i, s] = (0, o.useState)("spirit"),
          [c, f] = (0, o.useState)(z),
          d = (e) => (t) => f((a) => ({ ...a, [e]: t })),
          [m, v] = (0, o.useState)(null),
          p = m ?? (a ? c.dark : c.light),
          h = (e) => (t) => {
            let a = [...p];
            ((a[e] = t), v(a));
          },
          [g, x] = (0, o.useState)(null),
          b = g ?? (a ? "#0A0A0A" : "#FFFFFF"),
          [y, k] = (0, o.useState)("auto"),
          [S, w] = (0, o.useState)(1),
          [C, F] = (0, o.useState)(0.5),
          [T, A] = (0, o.useState)(0.35),
          [B, j] = (0, o.useState)(0),
          [U, W] = (0, o.useState)(1),
          [P, q] = (0, o.useState)(0.35),
          [H, _] = (0, o.useState)(1),
          [N, Y] = (0, o.useState)(70),
          [O, X] = (0, o.useState)(0.8),
          [$, Q] = (0, o.useState)(1),
          [V, Z] = (0, o.useState)(!0),
          [K, J] = (0, o.useState)(!0),
          [ee, et] = (0, o.useState)(!0),
          [ea, el] = (0, o.useState)(!1);
        return (0, l.jsxs)("div", {
          children: [
            (0, l.jsx)(r.Bg, {}),
            (0, l.jsxs)(r.VX, {
              children: [
                (0, l.jsxs)(r.Ec, {
                  children: [
                    (0, l.jsx)(r.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, l.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, l.jsx)(
                          L,
                          {
                            colors: p,
                            backgroundColor: b,
                            mode: y,
                            charset: M[c.charset] ?? M.dense,
                            glyphSize: c.glyphSize,
                            spacing: S,
                            height: c.height,
                            fuel: c.fuel,
                            turbulence: c.turbulence,
                            wind: c.wind,
                            flicker: C,
                            sparks: c.sparks,
                            smoke: T,
                            pulse: B,
                            speed: U,
                            glow: P,
                            intensity: H,
                            interactive: ee,
                            snuff: V,
                            snuffRadius: N,
                            snuffStrength: O,
                            clickStoke: K,
                            stokeStrength: $,
                            paused: ea,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, l.jsxs)(r.IH, {
                      children: [
                        (0, l.jsx)(r.bg, {
                          title: "Preset",
                          value: i,
                          options: G,
                          onChange: (e) => {
                            (s(e), f(R[e] ?? z), v(null));
                          },
                        }),
                        (0, l.jsx)(r.bg, {
                          title: "Mode",
                          value: y,
                          options: I,
                          onChange: (e) => k(e),
                        }),
                        (0, l.jsx)(r.bg, {
                          title: "Charset",
                          value: c.charset,
                          options: E,
                          onChange: d("charset"),
                        }),
                        (0, l.jsx)(r.W7, {
                          title: "Body",
                          value: p[0],
                          onChange: h(0),
                        }),
                        (0, l.jsx)(r.W7, {
                          title: "Core",
                          value: p[1],
                          onChange: h(1),
                        }),
                        (0, l.jsx)(r.W7, {
                          title: "Background",
                          value: b,
                          onChange: x,
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Glyph Size",
                          min: 6,
                          max: 32,
                          step: 1,
                          value: c.glyphSize,
                          valueUnit: "px",
                          onChange: d("glyphSize"),
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Spacing",
                          min: 0.6,
                          max: 3,
                          step: 0.05,
                          value: S,
                          onChange: w,
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Height",
                          min: 0.1,
                          max: 1.1,
                          step: 0.01,
                          value: c.height,
                          onChange: d("height"),
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Fuel",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: c.fuel,
                          onChange: d("fuel"),
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Turbulence",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: c.turbulence,
                          onChange: d("turbulence"),
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Wind",
                          min: -1,
                          max: 1,
                          step: 0.01,
                          value: c.wind,
                          onChange: d("wind"),
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Flicker",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: C,
                          onChange: F,
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Sparks",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.sparks,
                          onChange: d("sparks"),
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Smoke",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: T,
                          onChange: A,
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Pulse",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: B,
                          onChange: j,
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Speed",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: U,
                          onChange: W,
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Glow",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: P,
                          onChange: q,
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Intensity",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: H,
                          onChange: _,
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Snuff Radius",
                          min: 20,
                          max: 300,
                          step: 5,
                          value: N,
                          valueUnit: "px",
                          onChange: Y,
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Snuff Strength",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: O,
                          onChange: X,
                        }),
                        (0, l.jsx)(r.yt, {
                          title: "Stoke Strength",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: $,
                          onChange: Q,
                        }),
                        (0, l.jsx)(r.tl, {
                          title: "Snuff",
                          checked: V,
                          onChange: Z,
                        }),
                        (0, l.jsx)(r.tl, {
                          title: "Click Stoke",
                          checked: K,
                          onChange: J,
                        }),
                        (0, l.jsx)(r.tl, {
                          title: "Interactive",
                          checked: ee,
                          onChange: et,
                        }),
                        (0, l.jsx)(r.tl, {
                          title: "Paused",
                          checked: ea,
                          onChange: el,
                        }),
                      ],
                    }),
                    (0, l.jsx)(r.Ub, { data: D }),
                  ],
                }),
                (0, l.jsx)(r.lT, { children: (0, l.jsx)(r.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
