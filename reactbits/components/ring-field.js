/* ReactBits Pro public preview module 9181 for ring-field.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/9181.d9c45eaa7bf60ee2.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  9181: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => L }));
    var n = a(95155),
      l = a(12115),
      i = a(56388),
      o = a(86049),
      r = a(90761),
      u = a(2253),
      s = a(12246),
      c = a(90650);
    let d = 2 * Math.PI,
      f = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      m = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      v = (e, t, a) => Math.min(a, Math.max(t, Number.isFinite(e) ? e : t)),
      p = null,
      h = new Map(),
      x = (e, t, a) => {
        let n = h.get(t);
        if (n) return n;
        if ((p || (p = e.createElement("canvas").getContext("2d")), !p))
          return a;
        ((p.fillStyle = "#010203"), (p.fillStyle = t));
        let l = String(p.fillStyle),
          i = a;
        if ("#010203" === l && "#010203" !== t.trim().toLowerCase()) i = a;
        else if (l.startsWith("#")) {
          let e = l.slice(1);
          i = [
            parseInt(e.slice(0, 2), 16) / 255,
            parseInt(e.slice(2, 4), 16) / 255,
            parseInt(e.slice(4, 6), 16) / 255,
          ];
        } else {
          let e = l.match(/[\d.]+/g);
          e &&
            e.length >= 3 &&
            (i = [Number(e[0]) / 255, Number(e[1]) / 255, Number(e[2]) / 255]);
        }
        return (h.size > 48 && h.clear(), h.set(t, i), i);
      },
      g = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      b = ([e, t, a]) => {
        let n = g(e),
          l = g(t),
          i = g(a),
          o = Math.cbrt(0.4122214708 * n + 0.5363325363 * l + 0.0514459929 * i),
          r = Math.cbrt(0.2119034982 * n + 0.6806995451 * l + 0.1073969566 * i),
          u = Math.cbrt(0.0883024619 * n + 0.2817188376 * l + 0.6299787005 * i);
        return [
          0.2104542553 * o + 0.793617785 * r - 0.0040720468 * u,
          1.9779984951 * o - 2.428592205 * r + 0.4505937099 * u,
          0.0259040371 * o + 0.7827717662 * r - 0.808675766 * u,
        ];
      },
      w = ([e, t, a]) => {
        let n = (e + 0.3963377774 * t + 0.2158037573 * a) ** 3,
          l = (e - 0.1055613458 * t - 0.0638541728 * a) ** 3,
          i = (e - 0.0894841775 * t - 1.291485548 * a) ** 3;
        return [
          4.0767416621 * n - 3.3077115913 * l + 0.2309699292 * i,
          -1.2684380046 * n + 2.6097574011 * l - 0.3413193965 * i,
          -0.0041960863 * n - 0.7034186147 * l + 1.707614701 * i,
        ];
      },
      y = ([e, t, a]) => {
        let n = v(0.8 * e, 0.3, 0.55),
          l = 0,
          i = 1.15;
        for (let e = 0; e < 16; e++) {
          let e = (l + i) / 2,
            o = w([n, t * e, a * e]);
          Math.min(o[0], o[1], o[2]) >= -0.001 &&
          1.001 >= Math.max(o[0], o[1], o[2])
            ? (l = e)
            : (i = e);
        }
        return [n, t * l, a * l];
      },
      S = `
in vec4 aSeed;
in vec4 aTrait;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uUnit;
uniform float uDistance;
uniform float uIncline;
uniform float uAspect;
uniform int uRings;
uniform float uFlow;
uniform float uInner;
uniform float uOuter;
uniform float uThickness;
uniform float uFolds;
uniform float uFold;
uniform float uDust;
uniform float uMorph;
uniform float uLobes;
uniform float uTurbulence;
uniform float uShape;
uniform float uTwist;
uniform float uRotation;
uniform float uFadeIn;
uniform float uFadeOut;
uniform float uPixelRatio;
uniform float uMaxPoint;
uniform float uSize;
uniform float uSizeVariance;
uniform float uSparkle;
uniform float uPrism;
uniform float uTwinkle;
uniform float uTime;
uniform float uGain;
uniform float uInk;
uniform vec3 uLabA;
uniform vec3 uLabB;
uniform vec3 uInkA;
uniform vec3 uInkB;
uniform vec4 uKickA[32];
uniform vec4 uKickB[32];
uniform float uKickTime;
out vec3 vColor;
out float vGain;
out float vSigma;
out float vSpan;

vec3 lattice(vec3 cell) {
  uvec3 v = uvec3(ivec3(cell)) * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return vec3(v >> 8u) * (2.0 / 16777215.0) - 1.0;
}

float corner(vec3 cell, vec3 f, vec3 o) {
  return dot(lattice(cell + o), f - o);
}

float noise(vec3 p) {
  vec3 cell = floor(p);
  vec3 f = p - cell;
  vec3 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float x00 = mix(corner(cell, f, vec3(0.0, 0.0, 0.0)), corner(cell, f, vec3(1.0, 0.0, 0.0)), w.x);
  float x10 = mix(corner(cell, f, vec3(0.0, 1.0, 0.0)), corner(cell, f, vec3(1.0, 1.0, 0.0)), w.x);
  float x01 = mix(corner(cell, f, vec3(0.0, 0.0, 1.0)), corner(cell, f, vec3(1.0, 0.0, 1.0)), w.x);
  float x11 = mix(corner(cell, f, vec3(0.0, 1.0, 1.0)), corner(cell, f, vec3(1.0, 1.0, 1.0)), w.x);
  return 1.8 * mix(mix(x00, x10, w.y), mix(x01, x11, w.y), w.z);
}

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

void main() {
  int slotIndex = gl_VertexID % uRings;
  float rings = float(uRings);
  float slot = float(slotIndex);
  float travel = slot + uFlow;
  float generation = floor(travel / rings);
  float u = clamp((travel - generation * rings) / rings, 0.0, 1.0);
  float id = slot - generation * rings;
  float base = mix(uInner, uOuter, u);
  float spacing = (uOuter - uInner) / rings;
  float dust = step(aSeed.z, uDust);

  float lobes = uLobes;
  float local = aSeed.x - uTwist * id / max(lobes, 1.0);
  float wander = 1.7 * noise(vec3(id * 0.27, uShape * 0.55, 4.3));
  float swell = 0.8 + 0.3 * noise(vec3(id * 0.21, uShape * 0.42, 9.1));
  float lobe = cos(lobes * local + wander) * swell * (lobes > 0.5 ? 1.0 : 0.4);
  vec2 around = vec2(cos(local), sin(local));
  float broad = noise(vec3(around * (0.6 + 0.24 * lobes), id * 0.17 + uShape));
  float fine = noise(vec3(around * (2.4 + 0.7 * lobes), id * 0.33 + uShape * 1.9 + 17.0));
  float shape = 0.62 * lobe + 0.38 * broad + uTurbulence * 0.42 * fine;
  float centre = base * (1.0 + uMorph * (0.55 + 0.9 * u) * shape);

  float wave = 0.5 + 0.5 * sin(uFolds * local + 6.2831853 * fract(id * 0.618034) + uShape * 0.8 + 1.6 * noise(vec3(around * 0.85, id * 0.29 + uShape * 0.35 + 51.0)));
  float open = smoothstep(0.66, 0.97, wave);
  float phi = 1.5707963 * (1.0 - uFold * open);
  float width = uThickness * spacing * (0.8 + 0.4 * u);
  float across = aSeed.y * width;
  float radial = mix(across * max(cos(phi), 0.07), aTrait.z * spacing * 0.7, dust);
  float lift = mix(across * sin(phi), aTrait.w * width * 0.8, dust);
  float radius = max(centre + radial, 0.0);
  float theta = aSeed.x + uRotation;
  vec3 plane = vec3(radius * cos(theta) * uAspect, radius * sin(theta), lift);

  float ci = cos(uIncline);
  float si = sin(uIncline);
  vec3 q = vec3(plane.x, plane.y * ci + plane.z * si, -plane.y * si + plane.z * ci);
  float depth = uDistance - q.z;
  float clip = smoothstep(0.4, 1.4, depth);
  depth = max(depth, 0.4);
  float near = uDistance / depth;
  vec2 screen = uCenter + uUnit * near * q.xy;

  float scatter = 0.6 + 0.8 * fract(aSeed.w * 7.31);
  float delay = 0.75 + 0.5 * fract(aSeed.w * 3.17);
  float swirl = (fract(aSeed.w * 11.7) - 0.5) * 0.9;
  float cs = cos(swirl);
  float sn = sin(swirl);
  vec2 offset = vec2(0.0);
  for (int i = 0; i < 32; i++) {
    vec4 a = uKickA[i];
    if (a.w < 0.0) continue;
    vec4 b = uKickB[i];
    vec2 d = screen - a.xy;
    float dist = length(d);
    vec2 away = dist > 1e-3 ? d / dist : vec2(0.0);
    float strength = length(b.xy);
    float tau = a.w;
    float fall = exp(-dist * dist / (a.z * a.z));
    vec2 push = b.xy + away * strength * 0.45;
    if (b.z > 0.5) {
      tau = a.w - dist / b.w;
      fall = exp(-dist / a.z);
      push = away * strength;
    }
    if (tau <= 0.0 || fall < 0.003) continue;
    float t = tau / (uKickTime * delay);
    float response = t * exp(1.0 - t);
    offset += vec2(cs * push.x - sn * push.y, sn * push.x + cs * push.y) * fall * response;
  }
  offset *= scatter * (1.0 + 0.8 * dust);
  offset /= 1.0 + length(offset) / (uUnit * 0.18);
  screen += offset;
  float stirred = clamp(length(offset) / (uUnit * 0.05), 0.0, 1.0);

  float fadeOut = 1.0 - smoothstep(1.0 - uFadeOut, 1.0, u);
  float fade = smoothstep(0.0, uFadeIn, u) * fadeOut * fadeOut;
  float rim = smoothstep(0.72, 0.97, aSeed.y) * (1.0 - dust);
  float prism = step(1.0 - uPrism, aTrait.x);
  float glint = step(1.0 - uPrism - uSparkle * 0.3, aTrait.x) * (1.0 - prism);
  float beat = 0.5 + 0.5 * sin(uTime * (0.45 + 1.3 * fract(aSeed.w * 5.3)) + aSeed.w * 6.2831853);
  float twinkle = 1.0 - uTwinkle * (0.45 + 0.35 * glint + 0.3 * dust) * beat;
  float character = noise(vec3(id * 0.61, 2.7, uShape * 0.15));
  float clump = 1.0 + 0.3 * noise(vec3(around * 1.4, id * 0.43 + uShape * 0.6 + 31.0));

  float tone = clamp(0.2 + 0.55 * rim + (1.0 - u) * 0.35 - 0.3 * dust + (aTrait.y - 0.5) * 0.3, 0.0, 1.0);
  vec3 lab = mix(uLabA, uLabB, tone);
  float hue = aSeed.w * 6.2831853;
  vec3 speck = vec3(0.74, 0.13 * cos(hue), 0.13 * sin(hue));
  lab = mix(lab, speck, prism);
  vec3 bright = labToLinear(mix(lab, vec3(0.97, lab.yz * 0.18), glint * 0.8 + rim * 0.08));
  vec3 inked = labToLinear(mix(mix(uInkA, uInkB, tone), vec3(0.52, speck.yz), prism)) * (1.0 - 0.4 * glint);
  vColor = mix(bright, inked, uInk);

  float sizeMix = mix(1.0, 0.5 + 1.25 * aTrait.y * aTrait.y, uSizeVariance) * (1.0 - 0.25 * dust);
  float px = uSize * uPixelRatio * sizeMix * mix(1.0, near, 0.6) * (1.0 + 0.3 * glint + 0.2 * prism);
  float wanted = px / 2.3548;
  float sigma = clamp(wanted, 0.55, max((uMaxPoint - 1.5) / 5.0, 0.55));
  float shrink = min(1.0, (wanted * wanted) / (sigma * sigma));
  float body = mix(0.85 + 0.45 * rim, 0.38, dust);
  float gain = uGain * fade * twinkle * shrink * body * (1.0 + 1.6 * glint + 0.8 * prism) * mix(1.0, near, 0.5) * clip;
  gain *= (1.0 + 0.2 * character) * clump * (1.0 + 0.5 * stirred);

  vGain = gain;
  vSigma = sigma;
  vSpan = 5.0 * sigma + 1.5;
  gl_PointSize = vSpan;
  gl_Position = gain > 1e-5 ? vec4(screen / uResolution * 2.0 - 1.0, 0.0, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}
`,
      k = `
precision highp float;
in vec3 vColor;
in float vGain;
in float vSigma;
in float vSpan;
out vec4 fragColor;

void main() {
  vec2 d = (gl_PointCoord - 0.5) * vSpan;
  float r2 = dot(d, d) / (vSigma * vSigma);
  float e = max(exp(-0.5 * r2) - 0.0439369, 0.0) * (vGain / 0.9560631);
  fragColor = vec4(vColor * e, e);
}
`,
      C = `
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      F = `
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
      M = `
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
uniform float uKeep;
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
  fragColor = texture(uBase, vUv) + sum * (uKeep / 16.0);
}
`,
      T = `
precision highp float;
uniform sampler2D uLines;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform float uGlow;
uniform float uExposure;
uniform float uMode;
uniform float uGrain;
uniform float uSeed;
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
  float speck = hash(gl_FragCoord.xy + uSeed * 311.0) - 0.5;
  vec3 color;
  float lit;
  if (uMode < 0.5) {
    vec3 light = (lines.rgb + bloom.rgb * uGlow) * uExposure;
    vec3 exposed = 1.0 - exp(-light);
    float peak = max(exposed.r, max(exposed.g, exposed.b));
    exposed = mix(exposed, vec3(peak), smoothstep(0.75, 1.0, peak) * 0.35);
    color = uBackground + (1.0 - uBackground) * exposed;
    lit = peak;
  } else {
    float energy = lines.a + bloom.a * uGlow * 0.25;
    vec3 hue = (lines.rgb + bloom.rgb * uGlow * 0.25) / max(energy, 1e-4);
    float density = 1.05 * (1.0 - exp(-energy * uExposure));
    vec3 absorb = -log(clamp(hue, 0.03, 1.0));
    color = uBackground * exp(-absorb * density);
    lit = min(density, 1.0);
  }
  float dither = hash(gl_FragCoord.xy * 1.37 + uSeed * 97.0) + hash(gl_FragCoord.xy * 0.71 + uSeed * 41.0 + 13.0) - 1.0;
  vec3 encoded = encode(color) + speck * uGrain * (2.0 / 255.0 + 0.07 * lit) + dither / 255.0;
  fragColor = vec4(encoded, 1.0);
}
`,
      I = (0, l.forwardRef)(function (
        {
          colors: e = ["#2f6fe0", "#b8f3ff"],
          backgroundColor: t = "#0a0a0a",
          mode: a = "auto",
          rings: i = 6,
          particles: o = 46e3,
          thickness: r = 0.34,
          folds: p = 3,
          fold: h = 0.9,
          dust: w = 0.14,
          innerRadius: I = 0.42,
          outerRadius: j = 1.3,
          flow: z = "outward",
          flowSpeed: R = 0.05,
          morph: E = 0.13,
          lobes: P = 3,
          turbulence: B = 0.45,
          morphSpeed: L = 0.1,
          twist: A = 0.4,
          rotation: U = 0.01,
          aspect: q = 1,
          tilt: D = 0,
          centerX: G = 0,
          centerY: N = 0,
          scale: O = 1,
          particleSize: _ = 1.3,
          sizeVariance: H = 0.5,
          sparkle: V = 0.05,
          prism: K = 0.04,
          twinkle: W = 0.3,
          fade: Y = 0.22,
          glow: X = 0.4,
          intensity: Q = 1,
          grain: Z = 0.3,
          interactive: $ = !0,
          push: J = 1,
          pulse: ee = 1,
          paused: et = !1,
          quality: ea = 1,
          className: en,
          style: el,
          children: ei,
        },
        eo,
      ) {
        let er = (0, l.useRef)(null),
          eu = (0, l.useRef)(null),
          es = (0, l.useSyncExternalStore)(f, m, () => !1),
          ec = (0, l.useRef)({
            colors: e,
            backgroundColor: t,
            mode: a,
            rings: i,
            particles: o,
            thickness: r,
            folds: p,
            fold: h,
            dust: w,
            innerRadius: I,
            outerRadius: j,
            flow: z,
            flowSpeed: R,
            morph: E,
            lobes: P,
            turbulence: B,
            morphSpeed: L,
            twist: A,
            rotation: U,
            aspect: q,
            tilt: D,
            centerX: G,
            centerY: N,
            scale: O,
            particleSize: _,
            sizeVariance: H,
            sparkle: V,
            prism: K,
            twinkle: W,
            fade: Y,
            glow: X,
            intensity: Q,
            grain: Z,
            interactive: $,
            push: J,
            pulse: ee,
            paused: et,
            quality: ea,
            reduced: es,
          });
        return (
          (0, l.useEffect)(() => {
            ((ec.current = {
              colors: e,
              backgroundColor: t,
              mode: a,
              rings: i,
              particles: o,
              thickness: r,
              folds: p,
              fold: h,
              dust: w,
              innerRadius: I,
              outerRadius: j,
              flow: z,
              flowSpeed: R,
              morph: E,
              lobes: P,
              turbulence: B,
              morphSpeed: L,
              twist: A,
              rotation: U,
              aspect: q,
              tilt: D,
              centerX: G,
              centerY: N,
              scale: O,
              particleSize: _,
              sizeVariance: H,
              sparkle: V,
              prism: K,
              twinkle: W,
              fade: Y,
              glow: X,
              intensity: Q,
              grain: Z,
              interactive: $,
              push: J,
              pulse: ee,
              paused: et,
              quality: ea,
              reduced: es,
            }),
              eu.current?.sync());
          }),
          (0, l.useEffect)(() => {
            let e = er.current;
            if (!e) return;
            let t = ((e, t) => {
              let a,
                n = e.ownerDocument,
                l = n.defaultView ?? window,
                i = n.createElement("canvas");
              (i.setAttribute("aria-hidden", "true"),
                (i.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none"),
                e.prepend(i));
              try {
                a = new s.WebGLRenderer({
                  canvas: i,
                  alpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return (i.remove(), null);
              }
              if (!a.capabilities.isWebGL2)
                return (a.dispose(), i.remove(), null);
              a.autoClear = !1;
              let o =
                  a.extensions.has("EXT_color_buffer_float") ||
                  a.extensions.has("EXT_color_buffer_half_float")
                    ? u.ix0
                    : u.OUM,
                r = a.getContext(),
                c = r.getParameter(r.ALIASED_POINT_SIZE_RANGE),
                f = c && c.length > 1 ? Math.max(8, c[1]) : 64,
                m = new u.qUd(-1, 1, 1, -1, 0, 1),
                p = new u.bdM(2, 2),
                h = Array.from({ length: 32 }, () => new u.IUQ(0, 0, 1, -1)),
                w = Array.from({ length: 32 }, () => new u.IUQ()),
                I = [],
                j = new u.BKk({
                  glslVersion: u.Wdf,
                  uniforms: {
                    uResolution: { value: new u.I9Y(1, 1) },
                    uCenter: { value: new u.I9Y() },
                    uUnit: { value: 1 },
                    uDistance: { value: 3.6 },
                    uIncline: { value: 0 },
                    uAspect: { value: 1 },
                    uRings: { value: 7 },
                    uFlow: { value: 0 },
                    uInner: { value: 0.14 },
                    uOuter: { value: 1.05 },
                    uThickness: { value: 0.34 },
                    uFolds: { value: 3 },
                    uFold: { value: 0.9 },
                    uDust: { value: 0.14 },
                    uMorph: { value: 0.11 },
                    uLobes: { value: 3 },
                    uTurbulence: { value: 0.35 },
                    uShape: { value: 0 },
                    uTwist: { value: 0.35 },
                    uRotation: { value: 0 },
                    uFadeIn: { value: 0.2 },
                    uFadeOut: { value: 0.3 },
                    uPixelRatio: { value: 1 },
                    uMaxPoint: { value: 64 },
                    uSize: { value: 1.5 },
                    uSizeVariance: { value: 0.5 },
                    uSparkle: { value: 0.05 },
                    uPrism: { value: 0.04 },
                    uTwinkle: { value: 0.3 },
                    uTime: { value: 0 },
                    uGain: { value: 1 },
                    uInk: { value: 0 },
                    uLabA: { value: new u.Pq0() },
                    uLabB: { value: new u.Pq0() },
                    uInkA: { value: new u.Pq0() },
                    uInkB: { value: new u.Pq0() },
                    uKickA: { value: h },
                    uKickB: { value: w },
                    uKickTime: { value: 0.32 },
                  },
                  vertexShader: S,
                  fragmentShader: k,
                  depthTest: !1,
                  depthWrite: !1,
                  transparent: !0,
                  blending: u.bCz,
                  blendEquation: u.gO9,
                  blendSrc: u.qad,
                  blendDst: u.qad,
                  blendSrcAlpha: u.qad,
                  blendDstAlpha: u.qad,
                }),
                z = (e, t) =>
                  new u.BKk({
                    glslVersion: u.Wdf,
                    uniforms: t,
                    vertexShader: C,
                    fragmentShader: e,
                    depthTest: !1,
                    depthWrite: !1,
                    blending: u.XIg,
                  }),
                R = z(F, {
                  uSource: { value: null },
                  uTexel: { value: new u.I9Y() },
                }),
                E = z(M, {
                  uSource: { value: null },
                  uBase: { value: null },
                  uTexel: { value: new u.I9Y() },
                  uKeep: { value: 0.62 },
                }),
                P = z(T, {
                  uLines: { value: null },
                  uBloom: { value: null },
                  uBackground: { value: new u.Pq0() },
                  uGlow: { value: 0.45 },
                  uExposure: { value: 1 },
                  uMode: { value: 0 },
                  uGrain: { value: 0.3 },
                  uSeed: { value: 0 },
                }),
                B = new u.ONl(new u.LoY(), j);
              B.frustumCulled = !1;
              let L = new u.Z58();
              L.add(B);
              let A = new u.eaF(p, P);
              A.frustumCulled = !1;
              let U = new u.Z58();
              U.add(A);
              let q = 0,
                D = (e, t) =>
                  new u.nWS(Math.max(1, e), Math.max(1, t), {
                    type: o,
                    format: u.GWd,
                    minFilter: u.k6q,
                    magFilter: u.k6q,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    generateMipmaps: !1,
                  }),
                G = null,
                N = [],
                O = [],
                _ = !1,
                H = !1,
                V = 0,
                K = 0,
                W = !0,
                Y = 1,
                X = 1,
                Q = 1,
                Z = 1,
                $ = 1,
                J = 0,
                ee = 0,
                et = 0.37,
                ea = 6.2,
                en = 0,
                el = null,
                ei = () => {
                  (G?.dispose(),
                    N.forEach((e) => e.dispose()),
                    O.forEach((e) => e.dispose()),
                    (G = null),
                    (N = []),
                    (O = []));
                },
                eo = (e, t) => {
                  ((A.material = e), a.setRenderTarget(t), a.render(U, m));
                },
                er = () => {
                  let e = t.current,
                    a = Q,
                    n = Z;
                  return {
                    unit:
                      0.5 *
                      Math.min(Math.max(a, n), 1.6 * Math.min(a, n)) *
                      v(e.scale, 0.2, 4),
                    cx: (0.5 + 0.5 * v(e.centerX, -1.5, 1.5)) * a,
                    cy: (0.5 - 0.5 * v(e.centerY, -1.5, 1.5)) * n,
                    incline: (v(e.tilt, 0, 80) * Math.PI) / 180,
                    aspect: v(e.aspect, 0.25, 4),
                  };
                },
                eu = (t, a) => {
                  let n = e.getBoundingClientRect();
                  if (n.width <= 0 || n.height <= 0) return null;
                  let l = (t - n.left) * (Y / n.width),
                    i = (a - n.top) * (X / n.height);
                  return { x: (Q / Y) * l, y: (Z / X) * (X - i) };
                },
                es = () => {
                  let e;
                  if (!G || !N.length || H) return;
                  ((e = Math.round(v(t.current.particles, 2e3, 2e5))) !== q &&
                    ((q = e),
                    B.geometry.dispose(),
                    (B.geometry = ((e) => {
                      let t,
                        a =
                          ((t = 29),
                          () => (t = (16807 * t) % 0x7fffffff) / 0x7fffffff),
                        n = () =>
                          Math.sqrt(-2 * Math.log(Math.max(a(), 1e-9))) *
                          Math.cos(d * a()),
                        l = new Float32Array(8 * e);
                      for (let t = 0; t < e; t++) {
                        let e =
                          0.3 > a()
                            ? 1 - 0.16 * a() * a()
                            : 1 - 2 * Math.pow(a(), 0.85);
                        l.set(
                          [
                            a() * d,
                            e,
                            a(),
                            a(),
                            a(),
                            a(),
                            v(n(), -3, 3),
                            v(n(), -3, 3),
                          ],
                          8 * t,
                        );
                      }
                      let i = new u.LoY(),
                        o = new u.eB$(l, 8);
                      return (
                        i.setAttribute("aSeed", new u.eHs(o, 4, 0)),
                        i.setAttribute("aTrait", new u.eHs(o, 4, 4)),
                        i.setAttribute("position", new u.eHs(o, 3, 0)),
                        i
                      );
                    })(e))),
                    (() => {
                      let e,
                        a,
                        l,
                        i = t.current,
                        o = j.uniforms,
                        r = er(),
                        { inner: u, outer: s } =
                          ((a = v((e = t.current).innerRadius, 0, 3)),
                          (l = Math.max(v(e.outerRadius, 0.05, 4), a + 0.05)),
                          { inner: a, outer: l }),
                        c = x(n, i.backgroundColor, [0.04, 0.04, 0.04]),
                        d = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2],
                        m = "ink" === i.mode || ("auto" === i.mode && d > 0.5),
                        p = b(x(n, i.colors[0], [0.17, 0.78, 1])),
                        S = b(x(n, i.colors[1], [0.61, 0.96, 0.89])),
                        k = Math.round(v(i.rings, 2, 24)),
                        C = v(i.fade, 0, 1);
                      if (
                        (o.uResolution.value.set(Q, Z),
                        o.uCenter.value.set(r.cx, r.cy),
                        (o.uUnit.value = r.unit),
                        (o.uIncline.value = r.incline),
                        (o.uAspect.value = r.aspect),
                        (o.uRings.value = k),
                        (o.uFlow.value = et),
                        (o.uInner.value = u),
                        (o.uOuter.value = s),
                        (o.uThickness.value = v(i.thickness, 0, 2)),
                        (o.uFolds.value = Math.round(v(i.folds, 0, 12))),
                        (o.uFold.value = v(i.fold, 0, 1)),
                        (o.uDust.value = v(i.dust, 0, 1)),
                        (o.uMorph.value = v(i.morph, 0, 0.6)),
                        (o.uLobes.value = Math.round(v(i.lobes, 0, 12))),
                        (o.uTurbulence.value = v(i.turbulence, 0, 2)),
                        (o.uShape.value = ea),
                        (o.uTwist.value = v(i.twist, -Math.PI, Math.PI)),
                        (o.uRotation.value = en),
                        (o.uFadeIn.value = Math.max(0.04, C)),
                        (o.uFadeOut.value = Math.max(0.04, C)),
                        (o.uPixelRatio.value = $),
                        (o.uMaxPoint.value = f),
                        (o.uSize.value = v(i.particleSize, 0.3, 8)),
                        (o.uSizeVariance.value = v(i.sizeVariance, 0, 1)),
                        (o.uSparkle.value = v(i.sparkle, 0, 1)),
                        (o.uPrism.value = v(i.prism, 0, 0.5)),
                        (o.uTwinkle.value = i.reduced ? 0 : v(i.twinkle, 0, 1)),
                        (o.uTime.value = ee),
                        (o.uInk.value = +!!m),
                        o.uLabA.value.set(p[0], p[1], p[2]),
                        o.uLabB.value.set(S[0], S[1], S[2]),
                        m)
                      ) {
                        let e = y(p),
                          t = y(S);
                        (o.uInkA.value.set(e[0], e[1], e[2]),
                          o.uInkB.value.set(t[0], t[1], t[2]));
                      }
                      let F = Math.pow(r.unit / $ / 360, 2),
                        M = v(F, 0.25, 1) * v(i.quality, 0.25, 1);
                      (B.geometry.setDrawRange(0, Math.round(q * M)),
                        (o.uGain.value =
                          0.6 * Math.sqrt(26e3 / q) * v(F / M, 0.5, 4)));
                      for (let e = 0; e < 32; e++) {
                        let t = I[e];
                        if (!t) {
                          h[e].w = -1;
                          continue;
                        }
                        (h[e].set(t.x, t.y, t.reach, t.age),
                          w[e].set(t.vx, t.vy, t.kind, t.speed));
                      }
                      let T = P.uniforms;
                      (T.uBackground.value.set(g(c[0]), g(c[1]), g(c[2])),
                        (T.uGlow.value = v(i.glow, 0, 3) * (m ? 0.5 : 1)),
                        (T.uExposure.value =
                          (m ? 2.2 : 1) * v(i.intensity, 0, 4)),
                        (T.uMode.value = +!!m),
                        (T.uGrain.value = v(i.grain, 0, 1)),
                        (T.uSeed.value = J));
                    })(),
                    a.setRenderTarget(G),
                    a.setClearColor(0, 0),
                    a.clear(),
                    a.render(L, m));
                  let l = G;
                  for (let e of N)
                    ((R.uniforms.uSource.value = l.texture),
                      R.uniforms.uTexel.value.set(1 / l.width, 1 / l.height),
                      eo(R, e),
                      (l = e));
                  let i = N[N.length - 1];
                  for (let e = N.length - 2; e >= 0; e--)
                    ((E.uniforms.uSource.value = i.texture),
                      (E.uniforms.uBase.value = N[e].texture),
                      E.uniforms.uTexel.value.set(1 / i.width, 1 / i.height),
                      eo(E, O[e]),
                      (i = O[e]));
                  ((P.uniforms.uLines.value = G.texture),
                    (P.uniforms.uBloom.value = i.texture),
                    eo(P, null));
                },
                ec = (e) => {
                  if (((V = 0), _ || H)) return;
                  let a = Math.min(0.05, Math.max(0, (e - K) / 1e3));
                  ((K = e),
                    ((e) => {
                      let a = t.current;
                      if (a.paused || a.reduced) return;
                      ee += e;
                      let n = "inward" === a.flow ? -1 : 1;
                      ((et += e * n * v(a.flowSpeed, 0, 2)),
                        (ea += e * v(a.morphSpeed, 0, 2)),
                        (en = (en + e * v(a.rotation, -3, 3)) % d));
                      for (let t = I.length - 1; t >= 0; t--)
                        ((I[t].age += e),
                          I[t].age > I[t].life && I.splice(t, 1));
                      J = (J + 0.618034) % 1;
                    })(a),
                    es());
                  let i = t.current;
                  !W ||
                    n.hidden ||
                    i.paused ||
                    i.reduced ||
                    (V = l.requestAnimationFrame(ec));
                };
              function ed() {
                _ ||
                  H ||
                  V ||
                  !W ||
                  ((K = l.performance.now()),
                  (V = l.requestAnimationFrame(ec)));
              }
              let ef = () => {
                  let n = e.getBoundingClientRect();
                  ((Y = Math.max(1, e.clientWidth || n.width)),
                    (X = Math.max(1, e.clientHeight || n.height)),
                    ($ =
                      Math.min(l.devicePixelRatio || 1, 2) *
                      v(t.current.quality, 0.25, 1)),
                    a.setPixelRatio($),
                    a.setSize(Y, X, !1));
                  let i = Math.max(1, Math.floor(Y * $)),
                    o = Math.max(1, Math.floor(X * $));
                  ((Q = i), (Z = o), ei(), (G = D(i, o)));
                  let r = v(Math.floor(Math.log2(Math.min(i, o) / 8)), 3, 7);
                  for (let e = 1; e <= r; e++)
                    (N.push(D(Math.max(1, i >> e), Math.max(1, o >> e))),
                      O.push(D(Math.max(1, i >> e), Math.max(1, o >> e))));
                  (es(), ed());
                },
                em = (e) => {
                  let t = I.filter((t) => t.kind === e.kind),
                    a = 1 === e.kind ? 4 : 28;
                  (t.length >= a && I.splice(I.indexOf(t[0]), 1),
                    I.push(e),
                    ed());
                },
                ev = (e, a, n) => {
                  let l = t.current;
                  if (l.reduced || l.paused || n <= 0) return;
                  let i = er().unit;
                  em({
                    x: e,
                    y: a,
                    vx: 0.11 * i * n,
                    vy: 0,
                    reach: 0.9 * i,
                    age: 0,
                    kind: 1,
                    speed: 1.25 * i,
                    life: 3.6,
                  });
                },
                ep = (e) => {
                  let a = t.current;
                  if (!a.interactive || a.reduced || a.paused) {
                    el = null;
                    return;
                  }
                  let n = eu(e.clientX, e.clientY);
                  if (!n) return;
                  let i = l.performance.now() / 1e3,
                    o = el;
                  if (!o) {
                    el = { x: n.x, y: n.y, t: i };
                    return;
                  }
                  let r = n.x - o.x,
                    u = n.y - o.y,
                    s = er().unit;
                  if (Math.hypot(r, u) < 0.012 * s && i - o.t < 0.05) return;
                  el = { x: n.x, y: n.y, t: i };
                  let c = v(a.push, 0, 3);
                  if (c <= 0) return;
                  let d = 0.1 * s * c,
                    f = 1.5 * r * c,
                    m = 1.5 * u * c,
                    p = Math.hypot(f, m);
                  p < 0.5 ||
                    (p > d && ((f *= d / p), (m *= d / p)),
                    em({
                      x: n.x,
                      y: n.y,
                      vx: f,
                      vy: m,
                      reach: 0.2 * s,
                      age: 0,
                      kind: 0,
                      speed: 0,
                      life: 2.6,
                    }));
                },
                eh = () => {
                  el = null;
                },
                ex = (e) => {
                  let a = t.current;
                  if (0 !== e.button || !a.interactive) return;
                  let n = eu(e.clientX, e.clientY);
                  n && ev(n.x, n.y, v(a.pulse, 0, 3));
                };
              (e.addEventListener("pointermove", ep),
                e.addEventListener("pointerleave", eh),
                e.addEventListener("pointercancel", eh),
                e.addEventListener("pointerdown", ex));
              let eg = new ResizeObserver(ef);
              eg.observe(e);
              let eb = new IntersectionObserver(
                (e) => {
                  (W = e.some((e) => e.isIntersecting)) && ed();
                },
                { rootMargin: "80px" },
              );
              eb.observe(e);
              let ew = () => {
                n.hidden || ed();
              };
              n.addEventListener("visibilitychange", ew);
              let ey = (e) => {
                  (e.preventDefault(),
                    (H = !0),
                    V && l.cancelAnimationFrame(V),
                    (V = 0));
                },
                eS = () => {
                  ((H = !1), es(), ed());
                };
              return (
                i.addEventListener("webglcontextlost", ey),
                i.addEventListener("webglcontextrestored", eS),
                ef(),
                {
                  sync: () => {
                    let e =
                      Math.min(l.devicePixelRatio || 1, 2) *
                      v(t.current.quality, 0.25, 1);
                    (t.current.interactive || (el = null),
                      Math.abs(e - $) > 0.001 ? ef() : es(),
                      ed());
                  },
                  destroy: () => {
                    ((_ = !0),
                      V && l.cancelAnimationFrame(V),
                      (V = 0),
                      e.removeEventListener("pointermove", ep),
                      e.removeEventListener("pointerleave", eh),
                      e.removeEventListener("pointercancel", eh),
                      e.removeEventListener("pointerdown", ex),
                      n.removeEventListener("visibilitychange", ew),
                      i.removeEventListener("webglcontextlost", ey),
                      i.removeEventListener("webglcontextrestored", eS),
                      eg.disconnect(),
                      eb.disconnect(),
                      ei(),
                      B.geometry.dispose(),
                      p.dispose(),
                      [j, R, E, P].forEach((e) => e.dispose()),
                      a.dispose(),
                      a.forceContextLoss(),
                      i.remove());
                  },
                  pulse: () => {
                    let e = er();
                    ev(e.cx, e.cy, v(t.current.pulse, 0, 3) || 1);
                  },
                }
              );
            })(e, ec);
            return (
              (eu.current = t),
              () => {
                (t?.destroy(), (eu.current = null));
              }
            );
          }, []),
          (0, l.useImperativeHandle)(
            eo,
            () => ({ pulse: () => eu.current?.pulse() }),
            [],
          ),
          (0, n.jsx)("div", {
            ref: er,
            className: (0, c.cn)(
              "relative isolate h-full min-h-[240px] w-full overflow-hidden",
              en,
            ),
            style: { backgroundColor: t, ...el },
            children:
              ei &&
              (0, n.jsx)("div", {
                className: "relative z-10 h-full w-full",
                children: ei,
              }),
          })
        );
      });
    I.displayName = "RingField";
    let j = {
        dark: ["#2F6FE0", "#B8F3FF"],
        light: ["#1E4FB8", "#0E86A6"],
        rings: 6,
        thickness: 0.34,
        folds: 3,
        fold: 0.9,
        dust: 0.14,
        morph: 0.13,
        lobes: 3,
        twist: 0.4,
        rotation: 0.01,
        flow: "outward",
        tilt: 0,
        aspect: 1,
        scale: 1,
      },
      z = {
        tide: j,
        violet: {
          ...j,
          dark: ["#5227FF", "#FF9FFC"],
          light: ["#5227FF", "#C33DB8"],
        },
        sunset: {
          ...j,
          dark: ["#FF7A27", "#FFD27A"],
          light: ["#E8590C", "#B7791F"],
        },
        contour: {
          ...j,
          dark: ["#8C96A3", "#FFFFFF"],
          light: ["#5A6470", "#1A1A1A"],
          rings: 9,
          thickness: 0.22,
          fold: 0.5,
          dust: 0.06,
          morph: 0.18,
          lobes: 5,
        },
        vortex: {
          ...j,
          dark: ["#4F7BFF", "#B8F1FF"],
          light: ["#2546C9", "#0E8FB0"],
          flow: "inward",
          folds: 5,
          twist: 1.1,
          rotation: 0.08,
          lobes: 4,
        },
        orbit: {
          ...j,
          dark: ["#8FB8FF", "#F2F7FF"],
          light: ["#2C5BD6", "#5C6B85"],
          rings: 8,
          tilt: 62,
          aspect: 1,
          scale: 1.3,
        },
      },
      R = [
        { label: "Tide", value: "tide" },
        { label: "Violet", value: "violet" },
        { label: "Sunset", value: "sunset" },
        { label: "Contour", value: "contour" },
        { label: "Vortex", value: "vortex" },
        { label: "Orbit", value: "orbit" },
      ],
      E = [
        { label: "Auto", value: "auto" },
        { label: "Glow", value: "glow" },
        { label: "Ink", value: "ink" },
      ],
      P = [
        { label: "Outward", value: "outward" },
        { label: "Inward", value: "inward" },
      ],
      B = [
        {
          name: "colors",
          type: "[string, string]",
          default: '["#2f6fe0", "#b8f3ff"]',
          description:
            "Colour of the outer rings and colour of the inner rings, blended in OKLab as rings travel. A few particles burn toward white as sparkles.",
        },
        {
          name: "backgroundColor",
          type: "string",
          default: '"#0a0a0a"',
          description: "Colour behind the rings.",
        },
        {
          name: "mode",
          type: '"auto" | "glow" | "ink"',
          default: '"auto"',
          description:
            "glow adds light for dark backgrounds, ink lays down tinted dust for light ones. auto picks from the background brightness.",
        },
        {
          name: "rings",
          type: "number",
          default: "6",
          description: "Number of rings in the field at once, from 2 to 24.",
        },
        {
          name: "particles",
          type: "number",
          default: "46000",
          description:
            "Total number of particles shared by all rings, from 2,000 to 200,000. Small frames and lower quality draw a share of them at matching brightness.",
        },
        {
          name: "thickness",
          type: "number",
          default: "0.34",
          description:
            "Half-width of each ribbon as a fraction of the gap between rings. Ribbons show this width where they twist open.",
        },
        {
          name: "folds",
          type: "number",
          default: "3",
          description:
            "How many times each ribbon twists open around its ring. Between the open sections it turns edge-on into a thin bright thread.",
        },
        {
          name: "fold",
          type: "number",
          default: "0.9",
          description:
            "How far the open sections twist toward you, from 0 (always a thin thread) to 1 (fully open, translucent bands).",
        },
        {
          name: "dust",
          type: "number",
          default: "0.14",
          description:
            "Share of particles that drift loose between the rings as a faint haze, from 0 to 1.",
        },
        {
          name: "innerRadius",
          type: "number",
          default: "0.42",
          description:
            "Radius where rings appear, as a fraction of half the shorter side. Everything inside stays dark.",
        },
        {
          name: "outerRadius",
          type: "number",
          default: "1.3",
          description:
            "Radius where rings dissolve, as a fraction of half the shorter side.",
        },
        {
          name: "flow",
          type: '"outward" | "inward"',
          default: '"outward"',
          description:
            "Direction the rings travel. Rings fade in at one edge and fade out at the other.",
        },
        {
          name: "flowSpeed",
          type: "number",
          default: "0.05",
          description: "Travel speed in rings per second.",
        },
        {
          name: "morph",
          type: "number",
          default: "0.13",
          description:
            "How far each ring bends away from a circle, as a fraction of its radius.",
        },
        {
          name: "lobes",
          type: "number",
          default: "3",
          description: "Number of broad lobes around each ring, from 0 to 12.",
        },
        {
          name: "turbulence",
          type: "number",
          default: "0.45",
          description: "Amount of finer ripple on top of the lobes.",
        },
        {
          name: "morphSpeed",
          type: "number",
          default: "0.1",
          description: "How quickly the ring shapes change.",
        },
        {
          name: "twist",
          type: "number",
          default: "0.4",
          description:
            "How far each ring's lobes turn relative to the ring inside it, so the lobes line up along a spiral. Negative values wind the other way.",
        },
        {
          name: "rotation",
          type: "number",
          default: "0.01",
          description:
            "Idle spin of the whole field in radians per second. Negative values turn clockwise.",
        },
        {
          name: "aspect",
          type: "number",
          default: "1",
          description:
            "Horizontal stretch of the rings. Values above 1 give wide ellipses.",
        },
        {
          name: "tilt",
          type: "number",
          default: "0",
          description:
            "Tilts the ring plane away from the viewer in degrees, from 0 (face-on) to 80, with perspective.",
        },
        {
          name: "centerX",
          type: "number",
          default: "0",
          description:
            "Horizontal offset of the centre, from -1 (left edge) to 1 (right edge).",
        },
        {
          name: "centerY",
          type: "number",
          default: "0",
          description:
            "Vertical offset of the centre, from -1 (top edge) to 1 (bottom edge).",
        },
        {
          name: "scale",
          type: "number",
          default: "1",
          description: "Size of the whole field.",
        },
        {
          name: "particleSize",
          type: "number",
          default: "1.3",
          description:
            "Particle size in CSS pixels. It stays the same on every screen density.",
        },
        {
          name: "sizeVariance",
          type: "number",
          default: "0.5",
          description: "How much particle sizes vary, from 0 (all equal) to 1.",
        },
        {
          name: "sparkle",
          type: "number",
          default: "0.05",
          description:
            "How many particles burn near-white as sparkles, from 0 to 1.",
        },
        {
          name: "prism",
          type: "number",
          default: "0.04",
          description:
            "Share of particles tinted with a random hue, like specks of colour in the dust, from 0 to 0.5.",
        },
        {
          name: "twinkle",
          type: "number",
          default: "0.3",
          description: "How much particles slowly shimmer, from 0 to 1.",
        },
        {
          name: "fade",
          type: "number",
          default: "0.22",
          description:
            "Length of the fade at the inner and outer edges, as a fraction of the field.",
        },
        {
          name: "glow",
          type: "number",
          default: "0.4",
          description: "Soft bloom around the dust, from 0 to 3.",
        },
        {
          name: "intensity",
          type: "number",
          default: "1",
          description: "Overall exposure.",
        },
        {
          name: "grain",
          type: "number",
          default: "0.3",
          description: "Fine film grain over the lit dust, from 0 to 1.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description: "Respond to the pointer.",
        },
        {
          name: "push",
          type: "number",
          default: "1",
          description:
            "Moving the pointer through the field throws nearby particles along your path. They scatter, then drift back into their rings. 0 turns it off.",
        },
        {
          name: "pulse",
          type: "number",
          default: "1",
          description:
            "Clicking sends a shockwave out from the pointer that pushes particles aside as it passes, then lets them settle. Each click fires its own wave. 0 turns it off.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Freeze the field. Reduced-motion users always get a still frame.",
        },
        {
          name: "quality",
          type: "number",
          default: "1",
          description:
            "Resolution and particle scale from 0.25 to 1. Lower values are cheaper on large screens.",
        },
        {
          name: "ref",
          type: "{ pulse }",
          default: "—",
          description:
            "pulse() sends one shockwave from the centre, for example when a form is submitted.",
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
        let [e, t] = (0, r.I)(),
          a = "dark" === (0, o.Y)(),
          [u, s] = (0, l.useState)("tide"),
          [c, d] = (0, l.useState)(j),
          f = (e) => (t) => d((a) => ({ ...a, [e]: t })),
          [m, v] = (0, l.useState)(null),
          p = m ?? (a ? c.dark : c.light),
          h = (e) => (t) => {
            let a = [...p];
            ((a[e] = t), v(a));
          },
          [x, g] = (0, l.useState)(null),
          b = x ?? (a ? "#0A0A0A" : "#FFFFFF"),
          [w, y] = (0, l.useState)("auto"),
          [S, k] = (0, l.useState)(46e3),
          [C, F] = (0, l.useState)(0.42),
          [M, T] = (0, l.useState)(1.3),
          [L, A] = (0, l.useState)(0.05),
          [U, q] = (0, l.useState)(0.45),
          [D, G] = (0, l.useState)(0.1),
          [N, O] = (0, l.useState)(0),
          [_, H] = (0, l.useState)(0),
          [V, K] = (0, l.useState)(1.3),
          [W, Y] = (0, l.useState)(0.5),
          [X, Q] = (0, l.useState)(0.05),
          [Z, $] = (0, l.useState)(0.04),
          [J, ee] = (0, l.useState)(0.3),
          [et, ea] = (0, l.useState)(0.22),
          [en, el] = (0, l.useState)(0.4),
          [ei, eo] = (0, l.useState)(1),
          [er, eu] = (0, l.useState)(0.3),
          [es, ec] = (0, l.useState)(1),
          [ed, ef] = (0, l.useState)(1),
          [em, ev] = (0, l.useState)(1),
          [ep, eh] = (0, l.useState)(!0),
          [ex, eg] = (0, l.useState)(!1);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(i.Bg, {}),
            (0, n.jsxs)(i.VX, {
              children: [
                (0, n.jsxs)(i.Ec, {
                  children: [
                    (0, n.jsx)(i.Ch, {
                      onRefresh: t,
                      minHeight: 600,
                      enableResponsive: !0,
                      children: (0, n.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, n.jsx)(
                          I,
                          {
                            colors: p,
                            backgroundColor: b,
                            mode: w,
                            rings: c.rings,
                            particles: S,
                            thickness: c.thickness,
                            folds: c.folds,
                            fold: c.fold,
                            dust: c.dust,
                            innerRadius: C,
                            outerRadius: M,
                            flow: c.flow,
                            flowSpeed: L,
                            morph: c.morph,
                            lobes: c.lobes,
                            turbulence: U,
                            morphSpeed: D,
                            twist: c.twist,
                            rotation: c.rotation,
                            aspect: c.aspect,
                            tilt: c.tilt,
                            centerX: N,
                            centerY: _,
                            scale: c.scale,
                            particleSize: V,
                            sizeVariance: W,
                            sparkle: X,
                            prism: Z,
                            twinkle: J,
                            fade: et,
                            glow: en,
                            intensity: ei,
                            grain: er,
                            interactive: ep,
                            push: es,
                            pulse: ed,
                            paused: ex,
                            quality: em,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(i.IH, {
                      children: [
                        (0, n.jsx)(i.bg, {
                          title: "Preset",
                          value: u,
                          options: R,
                          onChange: (e) => {
                            (s(e), d(z[e] ?? j), v(null));
                          },
                        }),
                        (0, n.jsx)(i.bg, {
                          title: "Mode",
                          value: w,
                          options: E,
                          onChange: (e) => y(e),
                        }),
                        (0, n.jsx)(i.bg, {
                          title: "Flow",
                          value: c.flow,
                          options: P,
                          onChange: (e) => f("flow")(e),
                        }),
                        (0, n.jsx)(i.W7, {
                          title: "Base Color",
                          value: p[0],
                          onChange: h(0),
                        }),
                        (0, n.jsx)(i.W7, {
                          title: "Highlight Color",
                          value: p[1],
                          onChange: h(1),
                        }),
                        (0, n.jsx)(i.W7, {
                          title: "Background",
                          value: b,
                          onChange: g,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Rings",
                          min: 2,
                          max: 24,
                          step: 1,
                          value: c.rings,
                          onChange: f("rings"),
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Particles",
                          min: 2e3,
                          max: 12e4,
                          step: 1e3,
                          value: S,
                          onChange: k,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Thickness",
                          min: 0.02,
                          max: 1,
                          step: 0.01,
                          value: c.thickness,
                          onChange: f("thickness"),
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Folds",
                          min: 0,
                          max: 12,
                          step: 1,
                          value: c.folds,
                          onChange: f("folds"),
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Fold",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.fold,
                          onChange: f("fold"),
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Dust",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: c.dust,
                          onChange: f("dust"),
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Inner Radius",
                          min: 0,
                          max: 0.8,
                          step: 0.01,
                          value: C,
                          onChange: F,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Outer Radius",
                          min: 0.3,
                          max: 2,
                          step: 0.01,
                          value: M,
                          onChange: T,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Flow Speed",
                          min: 0,
                          max: 0.5,
                          step: 0.005,
                          value: L,
                          onChange: A,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Morph",
                          min: 0,
                          max: 0.5,
                          step: 0.01,
                          value: c.morph,
                          onChange: f("morph"),
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Lobes",
                          min: 0,
                          max: 12,
                          step: 1,
                          value: c.lobes,
                          onChange: f("lobes"),
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Turbulence",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: U,
                          onChange: q,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Morph Speed",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: D,
                          onChange: G,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Twist",
                          min: -3,
                          max: 3,
                          step: 0.01,
                          value: c.twist,
                          onChange: f("twist"),
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Rotation",
                          min: -0.5,
                          max: 0.5,
                          step: 0.005,
                          value: c.rotation,
                          onChange: f("rotation"),
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Aspect",
                          min: 0.4,
                          max: 2.5,
                          step: 0.01,
                          value: c.aspect,
                          onChange: f("aspect"),
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Tilt",
                          min: 0,
                          max: 80,
                          step: 1,
                          value: c.tilt,
                          valueUnit: "\xb0",
                          onChange: f("tilt"),
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Center X",
                          min: -1,
                          max: 1,
                          step: 0.01,
                          value: N,
                          onChange: O,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Center Y",
                          min: -1,
                          max: 1,
                          step: 0.01,
                          value: _,
                          onChange: H,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Scale",
                          min: 0.3,
                          max: 2.5,
                          step: 0.01,
                          value: c.scale,
                          onChange: f("scale"),
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Particle Size",
                          min: 0.5,
                          max: 4,
                          step: 0.05,
                          value: V,
                          valueUnit: "px",
                          onChange: K,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Size Variance",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: W,
                          onChange: Y,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Sparkle",
                          min: 0,
                          max: 0.5,
                          step: 0.01,
                          value: X,
                          onChange: Q,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Prism",
                          min: 0,
                          max: 0.5,
                          step: 0.01,
                          value: Z,
                          onChange: $,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Twinkle",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: J,
                          onChange: ee,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Fade",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: et,
                          onChange: ea,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Glow",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: en,
                          onChange: el,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Intensity",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: ei,
                          onChange: eo,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Grain",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: er,
                          onChange: eu,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Push",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: es,
                          onChange: ec,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Pulse",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: ed,
                          onChange: ef,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Quality",
                          min: 0.25,
                          max: 1,
                          step: 0.05,
                          value: em,
                          onChange: ev,
                        }),
                        (0, n.jsx)(i.tl, {
                          title: "Interactive",
                          checked: ep,
                          onChange: eh,
                        }),
                        (0, n.jsx)(i.tl, {
                          title: "Paused",
                          checked: ex,
                          onChange: eg,
                        }),
                      ],
                    }),
                    (0, n.jsx)(i.Ub, { data: B }),
                  ],
                }),
                (0, n.jsx)(i.lT, { children: (0, n.jsx)(i.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
