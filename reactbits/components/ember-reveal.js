/* ReactBits Pro public preview module 23159 for ember-reveal.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/23159.93c43c929e2c999b.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  23159: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => E }));
    var o = a(95155),
      r = a(12115),
      n = a(56388),
      i = a(86049),
      u = a(90761),
      l = a(12246),
      s = a(2253),
      c = a(90650);
    let m = [
        {
          src: "/demo-media/effect-ember-poppy.webp",
          alt: "Coral-orange poppy with detailed petals against deep wine",
        },
        {
          src: "/demo-media/effect-ember-dahlia.webp",
          alt: "Burgundy dahlia with pink-lit petal edges against dark plum",
        },
        {
          src: "/demo-media/effect-ember-iris.webp",
          alt: "Violet iris petals with a golden throat against deep wine",
        },
      ],
      d = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      v = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      h = (e, t, a) => Math.min(a, Math.max(t, e)),
      f = null,
      p = (e, t) => {
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
        let o = a.match(/[\d.]+/g);
        return !o || o.length < 3
          ? t
          : [Number(o[0]) / 255, Number(o[1]) / 255, Number(o[2]) / 255];
      },
      g = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      x = `
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float gradientNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash2(i), f);
  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.55;
  mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    sum += amp * gradientNoise(p);
    p = turn * p * 2.03 + 11.7;
    amp *= 0.5;
  }
  return sum;
}

float fbm3(vec2 p) {
  float sum = 0.0;
  float amp = 0.6;
  mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    sum += amp * gradientNoise(p);
    p = turn * p * 2.07 + 5.3;
    amp *= 0.5;
  }
  return sum;
}

vec4 bicubic(sampler2D map, vec2 uv, vec2 size) {
  vec2 st = uv * size - 0.5;
  vec2 i = floor(st);
  vec2 f = st - i;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1;
  vec2 g1 = w2 + w3;
  vec2 h0 = (w1 / g0 - 1.0 + i + 0.5) / size;
  vec2 h1 = (w3 / g1 + 1.0 + i + 0.5) / size;
  return g0.y * (g0.x * texture2D(map, vec2(h0.x, h0.y)) + g1.x * texture2D(map, vec2(h1.x, h0.y))) +
    g1.y * (g0.x * texture2D(map, vec2(h0.x, h1.y)) + g1.x * texture2D(map, vec2(h1.x, h1.y)));
}
`,
      b = `
uniform sampler2D uPrevious;
uniform vec2 uAspect;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uPocket;
uniform float uPocketOn;
uniform float uHeal;
uniform vec2 uOrigin;
uniform float uRadius;
uniform float uBurning;
uniform float uClear;
uniform float uFade;
uniform float uLobes;
uniform float uSeed;
varying vec2 vUv;
${x}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  return length(p - a - ab * t);
}

void main() {
  vec4 previous = texture2D(uPrevious, vUv);
  vec2 p = (vUv - 0.5) * uAspect;
  float reach = segment(p, (uFrom - 0.5) * uAspect, (uTo - 0.5) * uAspect);
  float stamp = uPocketOn * (1.0 - smoothstep(0.0, uPocket, reach));
  stamp = stamp * stamp * (3.0 - 2.0 * stamp);
  float pocket = max(previous.r * uHeal, stamp);
  vec2 away = p - (uOrigin - 0.5) * uAspect;
  float lobes = fbm(away * 2.2 + uSeed) * uLobes;
  float front = uBurning * (1.0 - smoothstep(uRadius - 0.16, uRadius + 0.16, length(away) * (1.0 + lobes)));
  float burn = uClear > 0.5 ? 0.0 : max(previous.g, front);
  float before = max(previous.r, previous.g);
  float heat = max(pocket, burn);
  float activity = max(previous.b * uFade, clamp((heat - before) * 24.0, 0.0, 1.0));
  if (uClear > 0.5) activity = 0.0;
  gl_FragColor = vec4(pocket, burn, activity, 1.0);
}
`,
      w = `
uniform sampler2D uSmoke;
uniform sampler2D uField;
uniform vec2 uAspect;
uniform vec2 uTexel;
uniform float uDt;
uniform float uTime;
uniform float uDecay;
uniform float uClear;
varying vec2 vUv;
${x}

void main() {
  vec2 p = vUv * uAspect * 2.6;
  float t = uTime * 0.12;
  float e = 0.02;
  float up = gradientNoise(p + vec2(0.0, e) + t);
  float down = gradientNoise(p - vec2(0.0, e) + t);
  float right = gradientNoise(p + vec2(e, 0.0) - t);
  float left = gradientNoise(p - vec2(e, 0.0) - t);
  vec2 curl = vec2(up - down, left - right) / (2.0 * e);
  vec2 velocity = (vec2(0.0, 0.11) + curl * 0.028) / uAspect;
  vec2 back = vUv - velocity * uDt;
  float centre = texture2D(uSmoke, back).r;
  float spread = (texture2D(uSmoke, back + vec2(uTexel.x, 0.0)).r + texture2D(uSmoke, back - vec2(uTexel.x, 0.0)).r + texture2D(uSmoke, back + vec2(0.0, uTexel.y)).r + texture2D(uSmoke, back - vec2(0.0, uTexel.y)).r) * 0.25;
  float smoke = mix(centre, spread, 0.35) * uDecay;
  smoke += texture2D(uField, vUv).b * uDt * 2.4;
  if (uClear > 0.5) smoke = 0.0;
  gl_FragColor = vec4(min(smoke, 1.2), 0.0, 0.0, 1.0);
}
`,
      y = `
uniform sampler2D uField;
uniform sampler2D uSmokeMap;
uniform vec2 uFieldSize;
uniform sampler2D uImageA;
uniform sampler2D uImageB;
uniform vec2 uSizeA;
uniform vec2 uSizeB;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uEmber;
uniform vec3 uChar;
uniform float uGlow;
uniform float uEdge;
uniform float uRough;
uniform float uDetail;
uniform float uScorch;
uniform float uSmoke;
uniform float uShimmer;
uniform float uSeed;
uniform float uPixelRatio;
varying vec2 vUv;
${x}

vec2 cover(vec2 uv, vec2 size) {
  float view = uResolution.x / uResolution.y;
  float image = size.x / max(size.y, 1.0);
  vec2 scale = view > image ? vec2(1.0, image / view) : vec2(view / image, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

vec3 emberRamp(float t) {
  vec3 deep = uEmber * vec3(0.55, 0.22, 0.12);
  vec3 hot = mix(uEmber, vec3(1.0, 0.93, 0.78), 0.75);
  return mix(mix(deep, uEmber, smoothstep(0.0, 0.45, t)), hot, smoothstep(0.45, 1.0, t));
}

void main() {
  vec2 pixel = vUv * uResolution;
  float unit = min(uResolution.x, uResolution.y);
  vec2 q = pixel / unit * uDetail + uSeed;
  vec4 field = bicubic(uField, vUv, uFieldSize);
  float heat = clamp(max(field.r, field.g), 0.0, 1.0);
  float touched = smoothstep(0.0005, 0.04, heat);
  float w = max(0.3, uEdge) * uPixelRatio * clamp(unit / uPixelRatio / 520.0, 0.6, 1.6);
  float shape = 0.0;
  vec2 warp = vec2(0.0);
  if (heat > 0.0004) {
    warp = vec2(fbm3(q * 0.6 + 3.1), fbm3(q * 0.6 - 5.3));
    shape = fbm3(q + warp * 1.1);
  }
  float v = heat + uRough * shape * touched - 0.5;
  float slope = max(fwidth(v), 1e-5);
  float d = v / slope;
  float jag = gradientNoise(q * 8.0 + warp * 2.0) * 0.65 + gradientNoise(q * 19.0 + warp) * 0.35;
  d += jag * (2.0 + 5.0 * uRough) * w * (1.0 - smoothstep(20.0 * w, 60.0 * w, abs(d)));
  float shimmerZone = exp(-abs(d + 6.0 * w) / (12.0 * w)) * touched;
  vec2 wobble = vec2(gradientNoise(q * 2.4 + vec2(0.0, -uTime * 1.8)), gradientNoise(q * 2.4 + vec2(7.3, -uTime * 2.1)));
  vec2 bend = wobble * uShimmer * shimmerZone * 2.2 * uPixelRatio / uResolution;
  vec3 a = texture2D(uImageA, cover(vUv + bend, uSizeA)).rgb;
  vec3 b = texture2D(uImageB, cover(vUv + bend * 0.3, uSizeB)).rgb;
  float toast = pow(smoothstep(-0.22, 0.0, v), 2.0) * (1.0 - smoothstep(0.0, 0.02, v)) * touched;
  toast = max(toast, (1.0 - smoothstep(0.0, 16.0 * w, max(-d, 0.0))) * step(d, 0.5) * touched * 0.8);
  float luma = dot(a, vec3(0.299, 0.587, 0.114));
  vec3 browned = vec3(luma) * vec3(1.0, 0.68, 0.4) * 0.8 + vec3(0.05, 0.025, 0.0);
  vec3 paper = mix(a, browned, toast * uScorch * 0.9);
  paper *= 1.0 - toast * uScorch * 0.4;
  float mottle = 0.55 + 0.9 * (0.5 + 0.5 * gradientNoise(q * 12.0 + warp * 4.0));
  float charZone = smoothstep(-10.0 * w, -2.2 * w, d);
  paper = mix(paper, uChar * mottle, charZone * 0.96);
  float cut = smoothstep(-0.6 * uPixelRatio, 0.6 * uPixelRatio, d);
  float soot = max(exp(-max(d, 0.0) / (5.0 * w)), 1.0 - smoothstep(0.0, 0.14, v)) * touched;
  vec3 hole = b * (1.0 - soot * 0.55);
  vec3 color = mix(paper, hole, cut);
  float crawl = gradientNoise(q * 1.4 + vec2(uTime * 0.7, -uTime * 1.1)) + 0.5 * gradientNoise(q * 3.7 - vec2(uTime * 1.9, 0.0));
  float flicker = smoothstep(-0.6, 0.7, crawl);
  float burning = 0.12 + 1.25 * flicker * flicker;
  float thick = 0.7 + 0.7 * smoothstep(-0.4, 0.6, gradientNoise(q * 3.3 - vec2(uTime * 0.5, 0.0)));
  float line = exp(-pow((d + 1.4 * w) / (1.5 * w * thick), 2.0)) * burning;
  float core = exp(-pow((d + 1.1 * w) / (0.7 * w * thick), 2.0)) * burning;
  float embers = smoothstep(0.55, 0.85, gradientNoise(q * 18.0 + warp * 3.0 + vec2(0.0, uTime * 0.4))) * charZone * (1.0 - cut) * smoothstep(-8.0 * w, -3.5 * w, d);
  float halo = exp(-abs(d + 1.5 * w) / (11.0 * w));
  vec3 hot = mix(uEmber, vec3(1.0, 0.9, 0.66), 0.8);
  vec3 deep = uEmber * vec3(0.75, 0.32, 0.16);
  vec3 emit = uEmber * line * 1.1 + hot * core * 0.95 + deep * halo * (0.25 + 0.5 * flicker) + mix(uEmber, hot, 0.4) * embers * (0.35 + 0.65 * flicker);
  emit *= uGlow * touched;
  color = 1.0 - (1.0 - color) * (1.0 - clamp(emit, 0.0, 1.0));
  float smoke = texture2D(uSmokeMap, vUv).r;
  float haze = (1.0 - exp(-smoke * 1.6)) * uSmoke;
  vec3 smokeTone = mix(uChar, vec3(0.56, 0.54, 0.52), 0.7);
  color = mix(color, smokeTone, clamp(haze * 0.55, 0.0, 0.6));
  gl_FragColor = vec4(color, 1.0);
}
`,
      k = `
uniform sampler2D uField;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uPocketAt;
uniform float uPocketReach;
uniform vec2 uOrigin;
uniform float uRadius;
uniform float uBurning;
uniform vec2 uAspect;
uniform float uAmount;
uniform float uScale;
attribute float aSeed;
varying float vAlpha;
varying float vHeat;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  float period = 0.55 + hash(aSeed * 3.1) * 0.6;
  float phase = hash(aSeed * 7.7);
  float clock = uTime / period + phase;
  float cycle = floor(clock);
  float age = fract(clock);
  float seed = aSeed * 13.1 + cycle * 1.618;
  vec2 spawn = vec2(-1.0);
  float best = 0.0;
  bool pocketSide = hash(seed + 2.0) < 0.5 || uBurning < 0.5;
  for (int k = 0; k < 6; k++) {
    float fk = float(k);
    float angle = hash(seed + fk * 3.7) * 6.2831853;
    vec2 candidate;
    if (pocketSide) {
      float r = uPocketReach * (0.4 + 0.8 * hash(seed + 4.0 + fk));
      candidate = uPocketAt + vec2(cos(angle), sin(angle)) * r / uAspect;
    } else {
      float r = uRadius * (0.62 + 0.76 * hash(seed + 4.0 + fk));
      candidate = uOrigin + vec2(cos(angle), sin(angle)) * r / uAspect;
    }
    vec4 probe = texture2D(uField, candidate);
    float edge = 1.0 - smoothstep(0.08, 0.2, abs(max(probe.r, probe.g) - 0.5));
    float score = probe.b * edge * step(0.0, candidate.x) * step(candidate.x, 1.0) * step(0.0, candidate.y) * step(candidate.y, 1.0);
    if (score > best) {
      best = score;
      spawn = candidate;
    }
  }
  float live = smoothstep(0.25, 0.7, best);
  float keep = step(hash(seed + 9.0), uAmount);
  vec2 velocity = vec2((hash(seed + 5.0) - 0.5) * 0.16, 0.08 + hash(seed + 6.0) * 0.2);
  vec2 drift = vec2(sin(age * 9.0 + seed) * 0.012, 0.0);
  vec2 at = spawn + (velocity * age - vec2(0.0, 0.1) * age * age + drift) * vec2(1.0 / uAspect.x, 1.0);
  vAlpha = live * keep * smoothstep(0.0, 0.08, age) * (1.0 - smoothstep(0.35, 1.0, age));
  vHeat = 1.0 - age;
  gl_Position = vec4(at * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = vAlpha > 0.0 ? (2.0 + 2.6 * hash(seed + 8.0)) * uScale * (1.0 - age * 0.55) : 0.0;
}
`,
      S = `
uniform vec3 uEmber;
varying float vAlpha;
varying float vHeat;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float falloff = exp(-dot(c, c) * 18.0);
  vec3 hot = mix(uEmber, vec3(1.0, 0.86, 0.52), vHeat * 0.55);
  gl_FragColor = vec4(hot * 1.2, falloff * vAlpha);
}
`,
      C = (0, r.forwardRef)(function (
        {
          images: e,
          aspectRatio: t = 4 / 3,
          radius: a = 16,
          emberColor: n = "#FF7A1F",
          charColor: i = "#1C120C",
          glow: u = 1,
          edge: f = 1,
          roughness: x = 0.5,
          detail: C = 5,
          scorch: F = 0.7,
          smoke: A = 0.4,
          sparks: R = 0.5,
          shimmer: D = 0.6,
          burnDuration: E = 1.8,
          pocketSize: T = 90,
          heal: M = 0.3,
          follow: P = 0.12,
          hover: I = !0,
          clickToBurn: j = !0,
          autoplay: z = !1,
          interval: B = 3.5,
          idleDelay: N = 2.5,
          onChange: U,
          className: q,
          style: L,
        },
        H,
      ) {
        let W,
          Y = (0, r.useRef)(null),
          O = (0, r.useRef)(null),
          _ = (0, r.useSyncExternalStore)(d, v, () => !1),
          [G, Z] = (0, r.useState)(0),
          [$, K] = (0, r.useState)(!1),
          V =
            1 ===
            (W = (e && e.length ? e : m).map((e, t) =>
              "string" == typeof e
                ? { src: e, alt: `Image ${t + 1}` }
                : { src: e.src, alt: e.alt ?? `Image ${t + 1}` },
            )).length
              ? [W[0], W[0]]
              : W,
          X = V.map((e) => e.src).join("|"),
          J = (0, r.useRef)({
            sources: V,
            emberColor: n,
            charColor: i,
            glow: u,
            edge: f,
            roughness: x,
            detail: C,
            scorch: F,
            smoke: A,
            sparks: R,
            shimmer: D,
            burnDuration: E,
            pocketSize: T,
            heal: M,
            follow: P,
            hover: I,
            clickToBurn: j,
            autoplay: z,
            interval: B,
            idleDelay: N,
            reduced: _,
            onChange: U,
          });
        ((0, r.useEffect)(() => {
          ((J.current = {
            sources: V,
            emberColor: n,
            charColor: i,
            glow: u,
            edge: f,
            roughness: x,
            detail: C,
            scorch: F,
            smoke: A,
            sparks: R,
            shimmer: D,
            burnDuration: E,
            pocketSize: T,
            heal: M,
            follow: P,
            hover: I,
            clickToBurn: j,
            autoplay: z,
            interval: B,
            idleDelay: N,
            reduced: _,
            onChange: U,
          }),
            O.current?.sync());
        }),
          (0, r.useEffect)(() => {
            let e = Y.current;
            if (!e) return;
            let t = ((e, t, a) => {
              let o,
                r = document.createElement("canvas");
              (r.setAttribute("aria-hidden", "true"),
                (r.style.position = "absolute"),
                (r.style.inset = "0"),
                (r.style.width = "100%"),
                (r.style.height = "100%"),
                (r.style.display = "block"),
                (r.style.pointerEvents = "none"),
                (r.style.opacity = "0"),
                (r.style.transition = "opacity 240ms ease"),
                e.appendChild(r));
              try {
                o = new l.WebGLRenderer({
                  canvas: r,
                  alpha: !1,
                  antialias: !1,
                  powerPreference: "high-performance",
                });
              } catch {
                return (r.remove(), null);
              }
              o.autoClear = !0;
              let n = new s.qUd(-1, 1, 1, -1, 0, 1),
                i = new s.bdM(2, 2),
                u = {
                  type: s.ix0,
                  format: s.GWd,
                  minFilter: s.k6q,
                  magFilter: s.k6q,
                  depthBuffer: !1,
                  stencilBuffer: !1,
                },
                c = [new s.nWS(4, 4, u), new s.nWS(4, 4, u)],
                m = [new s.nWS(4, 4, u), new s.nWS(4, 4, u)],
                d = new s.BKk({
                  uniforms: {
                    uPrevious: { value: null },
                    uAspect: { value: new s.I9Y(1, 1) },
                    uFrom: { value: new s.I9Y(0.5, 0.5) },
                    uTo: { value: new s.I9Y(0.5, 0.5) },
                    uPocket: { value: 0.1 },
                    uPocketOn: { value: 0 },
                    uHeal: { value: 1 },
                    uOrigin: { value: new s.I9Y(0.5, 0.5) },
                    uRadius: { value: 0 },
                    uBurning: { value: 0 },
                    uClear: { value: 0 },
                    uFade: { value: 1 },
                    uLobes: { value: 0.3 },
                    uSeed: { value: 40 * Math.random() },
                  },
                  vertexShader: g,
                  fragmentShader: b,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                v = new s.BKk({
                  uniforms: {
                    uSmoke: { value: null },
                    uField: { value: null },
                    uAspect: { value: new s.I9Y(1, 1) },
                    uTexel: { value: new s.I9Y(0.01, 0.01) },
                    uDt: { value: 0.016 },
                    uTime: { value: 0 },
                    uDecay: { value: 0.98 },
                    uClear: { value: 0 },
                  },
                  vertexShader: g,
                  fragmentShader: w,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                f = new s.BKk({
                  uniforms: {
                    uField: { value: null },
                    uSmokeMap: { value: null },
                    uFieldSize: { value: new s.I9Y(1, 1) },
                    uImageA: { value: null },
                    uImageB: { value: null },
                    uSizeA: { value: new s.I9Y(1, 1) },
                    uSizeB: { value: new s.I9Y(1, 1) },
                    uResolution: { value: new s.I9Y(1, 1) },
                    uTime: { value: 0 },
                    uEmber: { value: new s.Pq0(1, 0.42, 0.1) },
                    uChar: { value: new s.Pq0(0.1, 0.06, 0.04) },
                    uGlow: { value: 1 },
                    uEdge: { value: 1 },
                    uRough: { value: 0.35 },
                    uDetail: { value: 5 },
                    uScorch: { value: 0.7 },
                    uSmoke: { value: 0.5 },
                    uShimmer: { value: 0.6 },
                    uSeed: { value: 40 * Math.random() },
                    uPixelRatio: { value: 1 },
                  },
                  vertexShader: g,
                  fragmentShader: y,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                x = new Float32Array(220);
              for (let e = 0; e < 220; e++) x[e] = e + 1;
              let C = new s.LoY();
              (C.setAttribute("position", new s.THS(new Float32Array(660), 3)),
                C.setAttribute("aSeed", new s.THS(x, 1)));
              let F = new s.BKk({
                  uniforms: {
                    uField: { value: null },
                    uResolution: { value: new s.I9Y(1, 1) },
                    uTime: { value: 0 },
                    uPocketAt: { value: new s.I9Y(-1, -1) },
                    uPocketReach: { value: 0.1 },
                    uOrigin: { value: new s.I9Y(0.5, 0.5) },
                    uRadius: { value: 0 },
                    uBurning: { value: 0 },
                    uAspect: { value: new s.I9Y(1, 1) },
                    uAmount: { value: 0.5 },
                    uScale: { value: 1 },
                    uEmber: { value: new s.Pq0(1, 0.42, 0.1) },
                  },
                  vertexShader: k,
                  fragmentShader: S,
                  transparent: !0,
                  blending: s.EZo,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                A = new s.Z58();
              A.add(new s.eaF(i, d));
              let R = new s.Z58();
              R.add(new s.eaF(i, v));
              let D = new s.Z58(),
                E = new s.eaF(i, f);
              E.frustumCulled = !1;
              let T = new s.ONl(C, F);
              ((T.frustumCulled = !1), (T.renderOrder = 1), D.add(E, T));
              let M = new s.Tap();
              M.setCrossOrigin("anonymous");
              let P = new Map(),
                I = !1,
                j = 0,
                z = 0,
                B = 0,
                N = !0,
                U = 1,
                q = 1,
                L = 1,
                H = 0,
                W = !1,
                Y = !1,
                O = { x: 0.5, y: 0.5 },
                _ = { x: 0.5, y: 0.5 },
                G = { x: 0, y: 0 },
                Z = { x: 0.5, y: 0.5 },
                $ = !1,
                K = 0,
                V = 0,
                X = !1,
                J = 0,
                Q = 0,
                ee = 1,
                et = { x: 0.5, y: 0.5 },
                ea = !1,
                eo = -1e9,
                er = performance.now() + 1600,
                en = { active: !1, time: 0, seed: 10 * Math.random() },
                ei = (e) => {
                  var r;
                  let n,
                    i,
                    u =
                      ((r = (n = t.current.sources)[
                        (H + e + 4 * n.length) % n.length
                      ].src),
                      (i = P.get(r)) ||
                        (P.set(r, "loading"),
                        M.load(
                          r,
                          (e) => {
                            I
                              ? e.dispose()
                              : ((e.colorSpace = s.jf0),
                                (e.generateMipmaps = !0),
                                (e.minFilter = s.$_I),
                                (e.anisotropy = Math.min(
                                  4,
                                  o.capabilities.getMaxAnisotropy(),
                                )),
                                P.set(r, e),
                                eh());
                          },
                          void 0,
                          () => {
                            (P.set(r, "failed"),
                              t.current.sources.every(
                                (e) => "failed" === P.get(e.src),
                              ) && a.onFail());
                          },
                        ),
                        "loading"));
                  return u instanceof s.gPd ? u : null;
                },
                eu = (e) => {
                  let t = e.image;
                  return { x: t?.width || 1, y: t?.height || 1 };
                },
                el = () => {
                  let t = e.getBoundingClientRect();
                  ((U = Math.max(1, t.width)),
                    (q = Math.max(1, t.height)),
                    (L = Math.min(window.devicePixelRatio || 1, 2)),
                    o.setPixelRatio(L),
                    o.setSize(U, q, !1));
                  let a = Math.min(1, 640 / Math.max(U, q)),
                    r = Math.max(8, Math.round(U * a)),
                    n = Math.max(8, Math.round(q * a));
                  (c.forEach((e) => e.dispose()),
                    m.forEach((e) => e.dispose()),
                    (c = [new s.nWS(r, n, u), new s.nWS(r, n, u)]));
                  let i = Math.max(8, Math.round(r / 2)),
                    l = Math.max(8, Math.round(n / 2));
                  ((m = [new s.nWS(i, l, u), new s.nWS(i, l, u)]),
                    [...c, ...m].forEach((e) => {
                      (o.setRenderTarget(e), o.clear());
                    }),
                    f.uniforms.uFieldSize.value.set(r, n),
                    v.uniforms.uTexel.value.set(1 / i, 1 / l),
                    o.setRenderTarget(null));
                  let h = U / q,
                    p = h >= 1 ? new s.I9Y(h, 1) : new s.I9Y(1, 1 / h);
                  (d.uniforms.uAspect.value.copy(p),
                    v.uniforms.uAspect.value.copy(p),
                    F.uniforms.uAspect.value.copy(p),
                    f.uniforms.uResolution.value.set(U * L, q * L),
                    F.uniforms.uResolution.value.set(U * L, q * L),
                    (F.uniforms.uScale.value = L),
                    (f.uniforms.uPixelRatio.value = L),
                    eh());
                },
                es = null,
                ec = (e = 0.5, o = 0.5) => {
                  let r = t.current;
                  if (W) {
                    if (X) {
                      es = { x: e, y: o };
                      return;
                    }
                    if (r.reduced) {
                      ((H = (H + 1) % r.sources.length),
                        a.onIndex(H),
                        r.onChange?.(H),
                        eh());
                      return;
                    }
                    ((et.x = h(e, 0, 1)),
                      (et.y = h(o, 0, 1)),
                      (X = !0),
                      (Q = 0),
                      (J = 0),
                      (ee =
                        ((e) => {
                          let t = d.uniforms.uAspect.value,
                            a = 0;
                          for (let o of [
                            { x: 0, y: 0 },
                            { x: 1, y: 0 },
                            { x: 0, y: 1 },
                            { x: 1, y: 1 },
                          ])
                            a = Math.max(
                              a,
                              Math.hypot((o.x - e.x) * t.x, (o.y - e.y) * t.y),
                            );
                          return a;
                        })(et) +
                        0.25 +
                        0.4 * r.roughness),
                      eh());
                  }
                },
                em = 0,
                ed = (e) => {
                  if (((j = 0), I)) return;
                  let i = Math.min(0.05, Math.max(0, (e - z) / 1e3));
                  if (
                    ((z = e),
                    ((e, o) => {
                      let r = t.current;
                      B += e;
                      let n = o - eo > 1e3 * r.idleDelay;
                      en.active = r.autoplay && !r.reduced && !$ && n && N;
                      let i = $ ? O : null;
                      if (en.active) {
                        en.time += e;
                        let t = 0.32 * en.time + en.seed;
                        ((i = {
                          x: 0.5 + 0.3 * Math.sin(1.3 * t) * Math.cos(0.41 * t),
                          y: 0.5 + 0.26 * Math.sin(0.9 * t + 1.1),
                        }),
                          !X &&
                            o >= er &&
                            W &&
                            (ec(i.x, i.y),
                            (er =
                              o + 1e3 * r.interval + 1e3 * r.burnDuration)));
                      }
                      let u = !!i && r.hover && !r.reduced && r.pocketSize > 0;
                      if (
                        ((K += (!!u - K) * (1 - Math.exp(-e / 0.12))),
                        (Z.x = _.x),
                        (Z.y = _.y),
                        i)
                      ) {
                        let t = 2 / Math.max(0.01, r.follow),
                          a = Math.max(1, Math.ceil(e / (1 / 240))),
                          o = e / a;
                        for (let e = 0; e < a; e++)
                          ((G.x += (t * t * (i.x - _.x) - 2 * t * G.x) * o),
                            (G.y += (t * t * (i.y - _.y) - 2 * t * G.y) * o),
                            (_.x += G.x * o),
                            (_.y += G.y * o));
                        K < 0.02 &&
                          ((_.x = i.x),
                          (_.y = i.y),
                          (Z.x = i.x),
                          (Z.y = i.y),
                          (G.x = 0),
                          (G.y = 0));
                      }
                      if (
                        ((V = Math.max(
                          K,
                          V * Math.exp(-e / Math.max(0.05, r.heal)),
                        )),
                        (X || K > 0.01) && (em = o + 2600),
                        X)
                      ) {
                        Q += e;
                        let o = ee / Math.max(0.3, r.burnDuration);
                        (J += o * e * Math.min(1, 0.25 + Q / 0.35)) >= ee &&
                          (() => {
                            let e = t.current;
                            if (
                              ((X = !1),
                              (J = 0),
                              (ea = !0),
                              (H = (H + 1) % e.sources.length),
                              a.onIndex(H),
                              e.onChange?.(H),
                              es)
                            ) {
                              let e = es;
                              ((es = null),
                                window.setTimeout(() => {
                                  I || ec(e.x, e.y);
                                }, 60));
                            }
                          })();
                      }
                    })(i, e),
                    ((e) => {
                      let i = t.current,
                        u = ei(0),
                        l = ei(1);
                      if ((ei(2), !u || !l)) return;
                      W || ((W = !0), a.onIndex(H));
                      let s = Math.min(U, q),
                        [g, x, b] = p(i.emberColor, [1, 0.42, 0.1]),
                        [w, y, k] = p(i.charColor, [0.1, 0.06, 0.04]),
                        S = d.uniforms;
                      ((S.uPrevious.value = c[0].texture),
                        S.uFrom.value.set(Z.x, 1 - Z.y),
                        S.uTo.value.set(_.x, 1 - _.y),
                        (S.uPocket.value =
                          (h(i.pocketSize, 0, 400) / s) * 1.35),
                        (S.uPocketOn.value = K),
                        (S.uHeal.value = Math.exp(-e / Math.max(0.05, i.heal))),
                        S.uOrigin.value.set(et.x, 1 - et.y),
                        (S.uRadius.value = J),
                        (S.uBurning.value = +!!X),
                        (S.uClear.value = +!!ea),
                        (S.uFade.value = Math.exp(-e / 0.45)),
                        o.setRenderTarget(c[1]),
                        o.render(A, n),
                        o.setRenderTarget(null),
                        (c = [c[1], c[0]]));
                      let C = v.uniforms;
                      ((C.uSmoke.value = m[0].texture),
                        (C.uField.value = c[0].texture),
                        (C.uDt.value = e),
                        (C.uTime.value = B),
                        (C.uDecay.value = Math.exp(-e / 1.1)),
                        (C.uClear.value = i.smoke > 0 && !i.reduced ? 0 : 1),
                        o.setRenderTarget(m[1]),
                        o.render(R, n),
                        o.setRenderTarget(null),
                        (m = [m[1], m[0]]),
                        (ea = !1));
                      let E = f.uniforms;
                      ((E.uField.value = c[0].texture),
                        (E.uSmokeMap.value = m[0].texture),
                        (E.uImageA.value = u),
                        (E.uImageB.value = l));
                      let M = eu(u),
                        P = eu(l);
                      (E.uSizeA.value.set(M.x, M.y),
                        E.uSizeB.value.set(P.x, P.y),
                        (E.uTime.value = B),
                        E.uEmber.value.set(g, x, b),
                        E.uChar.value.set(w, y, k),
                        (E.uGlow.value = h(i.glow, 0, 3)),
                        (E.uEdge.value = h(i.edge, 0.2, 4)),
                        (E.uRough.value = 1.1 * h(i.roughness, 0, 1)),
                        (S.uLobes.value = 0.55 * h(i.roughness, 0, 1)),
                        (E.uDetail.value = h(i.detail, 0.5, 20)),
                        (E.uScorch.value = h(i.scorch, 0, 1)),
                        (E.uSmoke.value = i.reduced ? 0 : h(i.smoke, 0, 1)),
                        (E.uShimmer.value = i.reduced
                          ? 0
                          : h(i.shimmer, 0, 1)));
                      let I = F.uniforms;
                      return (
                        (I.uField.value = c[0].texture),
                        (I.uTime.value = B),
                        I.uPocketAt.value.set(_.x, 1 - _.y),
                        (I.uPocketReach.value =
                          (h(i.pocketSize, 0, 400) / s) * 1),
                        I.uOrigin.value.set(et.x, 1 - et.y),
                        (I.uRadius.value = J),
                        (I.uBurning.value = +!!X),
                        (I.uAmount.value = i.reduced ? 0 : h(i.sparks, 0, 1)),
                        I.uEmber.value.set(g, x, b),
                        (T.visible = I.uAmount.value > 0),
                        o.render(D, n),
                        Y || ((Y = !0), (r.style.opacity = "1"))
                      );
                    })(i || 1 / 60),
                    N &&
                      (X ||
                        K > 0.001 ||
                        V > 0.002 ||
                        en.active ||
                        $ ||
                        !W ||
                        performance.now() < em))
                  ) {
                    j = requestAnimationFrame(ed);
                    return;
                  }
                  let u = t.current;
                  if (u.autoplay && !u.reduced && N) {
                    let t = Math.max(eo + 1e3 * u.idleDelay, er) - e;
                    (window.clearTimeout(ev),
                      (ev = window.setTimeout(
                        eh,
                        Math.max(30, Math.min(t, 2e3)),
                      )));
                  }
                },
                ev = 0,
                eh = () => {
                  I ||
                    j ||
                    !N ||
                    ((z = performance.now()), (j = requestAnimationFrame(ed)));
                },
                ef = (t) => {
                  let a = e.getBoundingClientRect();
                  return {
                    x: h((t.clientX - a.left) / Math.max(1, a.width), 0, 1),
                    y: h((t.clientY - a.top) / Math.max(1, a.height), 0, 1),
                  };
                },
                ep = (e) => {
                  if ("touch" === e.pointerType) return;
                  let t = ef(e);
                  ((O.x = t.x),
                    (O.y = t.y),
                    $ || ((_.x = t.x), (_.y = t.y)),
                    ($ = !0),
                    (eo = performance.now()),
                    eh());
                },
                eg = () => {
                  (($ = !1), (eo = performance.now()), eh());
                },
                ex = (e) => {
                  if (0 !== e.button) return;
                  let a = t.current;
                  if (
                    ((eo = performance.now()),
                    (er = performance.now() + 1e3 * a.interval),
                    !a.clickToBurn)
                  )
                    return;
                  let o = ef(e);
                  ec(o.x, o.y);
                },
                eb = (e) => {
                  ("Enter" === e.key || " " === e.key) &&
                    (e.preventDefault(),
                    (eo = performance.now()),
                    t.current.clickToBurn && ec(0.5, 0.5));
                };
              (e.addEventListener("pointermove", ep),
                e.addEventListener("pointerleave", eg),
                e.addEventListener("pointerdown", ex),
                e.addEventListener("keydown", eb));
              let ew = new ResizeObserver(el);
              ew.observe(e);
              let ey = new IntersectionObserver(
                (e) => {
                  (N = e.some((e) => e.isIntersecting)) && eh();
                },
                { rootMargin: "100px" },
              );
              ey.observe(e);
              let ek = (e) => {
                (e.preventDefault(), a.onFail());
              };
              return (
                r.addEventListener("webglcontextlost", ek),
                el(),
                {
                  sync: () => {
                    let e = t.current;
                    (H >= e.sources.length && (H = 0), eh());
                  },
                  destroy: () => {
                    ((I = !0),
                      cancelAnimationFrame(j),
                      window.clearTimeout(ev),
                      e.removeEventListener("pointermove", ep),
                      e.removeEventListener("pointerleave", eg),
                      e.removeEventListener("pointerdown", ex),
                      e.removeEventListener("keydown", eb),
                      r.removeEventListener("webglcontextlost", ek),
                      ew.disconnect(),
                      ey.disconnect(),
                      c.forEach((e) => e.dispose()),
                      m.forEach((e) => e.dispose()),
                      v.dispose(),
                      P.forEach((e) => {
                        e instanceof s.gPd && e.dispose();
                      }),
                      i.dispose(),
                      C.dispose(),
                      d.dispose(),
                      f.dispose(),
                      F.dispose(),
                      o.dispose(),
                      o.forceContextLoss(),
                      r.remove());
                  },
                  ignite: (e, t) => {
                    ((eo = performance.now()), ec(e ?? 0.5, t ?? 0.5));
                  },
                  reset: () => {
                    ((X = !1), (J = 0), (ea = !0), (H = 0), a.onIndex(0), eh());
                  },
                }
              );
            })(e, J, { onIndex: Z, onFail: () => K(!0) });
            return (
              (O.current = t),
              t || queueMicrotask(() => K(!0)),
              () => {
                (t?.destroy(), (O.current = null));
              }
            );
          }, [X]),
          (0, r.useImperativeHandle)(
            H,
            () => ({
              ignite: (e, t) => O.current?.ignite(e, t),
              next: () => {
                O.current
                  ? O.current.ignite(0.5, 0.5)
                  : Z((e) => (e + 1) % V.length);
              },
              reset: () => {
                (O.current?.reset(), Z(0));
              },
            }),
            [V.length],
          ));
        let Q = V[G % V.length],
          ee = V[(G + 1) % V.length];
        return (0, o.jsx)("div", {
          ref: Y,
          role: "button",
          tabIndex: 0,
          "aria-label": `${Q.alt}. Press to burn through to ${ee.alt}.`,
          className: (0, c.cn)(
            "relative isolate w-full cursor-crosshair touch-manipulation select-none overflow-hidden outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
            q,
          ),
          style: {
            aspectRatio: t > 0 ? String(t) : void 0,
            height: t > 0 ? void 0 : "100%",
            borderRadius: a,
            background: "#0a0a0a",
            ...L,
          },
          onClick: () => {
            $ && Z((e) => (e + 1) % V.length);
          },
          children: (0, o.jsx)("img", {
            src: Q.src,
            alt: "",
            "aria-hidden": "true",
            draggable: !1,
            style: {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              pointerEvents: "none",
            },
          }),
        });
      });
    C.displayName = "EmberReveal";
    let F = {
        colors: ["#FF7A1F", "#1C120C"],
        glow: 1,
        edge: 1,
        roughness: 0.5,
        detail: 5,
        scorch: 0.7,
        smoke: 0.4,
        sparks: 0.5,
        shimmer: 0.6,
        burnDuration: 1.8,
        pocketSize: 90,
      },
      A = {
        ember: F,
        inferno: {
          ...F,
          colors: ["#FF5A14", "#140A06"],
          glow: 1.5,
          edge: 1.4,
          roughness: 0.75,
          detail: 4,
          scorch: 1,
          smoke: 0.8,
          sparks: 1,
          shimmer: 1,
          burnDuration: 2.6,
          pocketSize: 120,
        },
        candle: {
          ...F,
          colors: ["#FFB347", "#2A1A10"],
          glow: 0.85,
          edge: 0.8,
          roughness: 0.3,
          detail: 6,
          scorch: 0.45,
          smoke: 0.2,
          sparks: 0.2,
          shimmer: 0.35,
          burnDuration: 2.2,
          pocketSize: 70,
        },
        arcane: {
          ...F,
          colors: ["#8F6BFF", "#0E0A1C"],
          glow: 1.3,
          roughness: 0.6,
          scorch: 0.4,
          smoke: 0.3,
          sparks: 0.7,
        },
        clean: {
          ...F,
          colors: ["#FFFFFF", "#0A0A0A"],
          glow: 0.6,
          edge: 0.6,
          roughness: 0.35,
          detail: 7,
          scorch: 0,
          smoke: 0,
          sparks: 0,
          shimmer: 0,
          burnDuration: 1.4,
        },
      },
      R = [
        { label: "Ember", value: "ember" },
        { label: "Inferno", value: "inferno" },
        { label: "Candle", value: "candle" },
        { label: "Arcane", value: "arcane" },
        { label: "Clean", value: "clean" },
      ],
      D = [
        {
          name: "images",
          type: "(string | { src: string; alt?: string })[]",
          default: "3 botanical photos",
          description:
            "Photos to burn through, in order. Each burn reveals the next one and the list loops.",
        },
        {
          name: "aspectRatio",
          type: "number",
          default: "4 / 3",
          description:
            "Width divided by height. 0 fills the parent's height instead. Photos are cropped to cover.",
        },
        {
          name: "radius",
          type: "number",
          default: "16",
          description: "Corner radius in pixels.",
        },
        {
          name: "emberColor",
          type: "string",
          default: '"#FF7A1F"',
          description:
            "Colour of the burning edge. Its hot core, deep glow and sparks are derived from it.",
        },
        {
          name: "charColor",
          type: "string",
          default: '"#1C120C"',
          description:
            "Colour of the charred band behind the flame and of the smoke.",
        },
        {
          name: "glow",
          type: "number",
          default: "1",
          description:
            "Brightness of the burning edge, from 0 (a cold char line) to 3.",
        },
        {
          name: "edge",
          type: "number",
          default: "1",
          description: "Width of the flame, char and scorch bands.",
        },
        {
          name: "roughness",
          type: "number",
          default: "0.5",
          description:
            "How ragged the burn is, from 0 (smooth curves) to 1 (deep fingers and stray holes).",
        },
        {
          name: "detail",
          type: "number",
          default: "5",
          description:
            "Scale of the raggedness. Higher values make smaller, busier lobes.",
        },
        {
          name: "scorch",
          type: "number",
          default: "0.7",
          description:
            "How much the photo browns ahead of the flame, from 0 to 1.",
        },
        {
          name: "smoke",
          type: "number",
          default: "0.4",
          description: "Smoke rising from the burning edge, from 0 to 1.",
        },
        {
          name: "sparks",
          type: "number",
          default: "0.5",
          description:
            "Sparks thrown off the edge while it burns, from 0 to 1.",
        },
        {
          name: "shimmer",
          type: "number",
          default: "0.6",
          description:
            "Heat haze that ripples the photo just above the flame, from 0 to 1.",
        },
        {
          name: "burnDuration",
          type: "number",
          default: "1.8",
          description: "Seconds a click takes to burn through the whole photo.",
        },
        {
          name: "pocketSize",
          type: "number",
          default: "90",
          description:
            "Radius in pixels of the hole the pointer burns while hovering. 0 turns it off.",
        },
        {
          name: "heal",
          type: "number",
          default: "0.3",
          description:
            "Seconds the hover hole takes to close behind the pointer. Longer values leave a trail.",
        },
        {
          name: "follow",
          type: "number",
          default: "0.12",
          description:
            "Seconds the hover hole takes to catch up with the pointer.",
        },
        {
          name: "hover",
          type: "boolean",
          default: "true",
          description:
            "Burn a hole that follows the pointer to peek at the next photo.",
        },
        {
          name: "clickToBurn",
          type: "boolean",
          default: "true",
          description:
            "Clicking, or pressing Enter, burns through to the next photo from that point.",
        },
        {
          name: "autoplay",
          type: "boolean",
          default: "false",
          description:
            "While nobody is interacting, a burning hole wanders on its own and burns through to the next photo every few seconds.",
        },
        {
          name: "interval",
          type: "number",
          default: "3.5",
          description: "Seconds between autoplay burns.",
        },
        {
          name: "idleDelay",
          type: "number",
          default: "2.5",
          description:
            "Seconds after the pointer leaves before autoplay resumes.",
        },
        {
          name: "onChange",
          type: "(index: number) => void",
          default: "—",
          description:
            "Called with the index of the photo that is now on top, after each burn.",
        },
        {
          name: "ref",
          type: "{ ignite, next, reset }",
          default: "—",
          description:
            "ignite(x, y) starts a burn from a point given as fractions of the width and height. next() burns from the centre. reset() jumps back to the first photo.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element, which fills its parent's width.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      E = () => {
        let [e, t] = (0, u.I)(),
          a = (0, i.Y)(),
          [l, s] = (0, r.useState)("ember"),
          [c, m] = (0, r.useState)(F),
          d = (e) => (t) => m((a) => ({ ...a, [e]: t })),
          v = (e) => (t) =>
            m((a) => {
              let o = [...a.colors];
              return ((o[e] = t), { ...a, colors: o });
            }),
          [h, f] = (0, r.useState)(0.3),
          [p, g] = (0, r.useState)(0.12),
          [x, b] = (0, r.useState)(!0),
          [w, y] = (0, r.useState)(!0),
          [k, S] = (0, r.useState)(!0),
          [E, T] = (0, r.useState)(3.5),
          [M, P] = (0, r.useState)(2.5);
        return (0, o.jsxs)("div", {
          children: [
            (0, o.jsx)(n.Bg, {}),
            (0, o.jsxs)(n.VX, {
              children: [
                (0, o.jsxs)(n.Ec, {
                  children: [
                    (0, o.jsx)(n.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, o.jsx)("div", {
                        className: `flex h-full w-full items-center justify-center p-6 ${"dark" === a ? "bg-[#0A0A0A]" : "bg-white"}`,
                        children: (0, o.jsx)("div", {
                          className: "w-full max-w-[720px]",
                          children: (0, o.jsx)(
                            C,
                            {
                              aspectRatio: 1.5,
                              emberColor: c.colors[0],
                              charColor: c.colors[1],
                              glow: c.glow,
                              edge: c.edge,
                              roughness: c.roughness,
                              detail: c.detail,
                              scorch: c.scorch,
                              smoke: c.smoke,
                              sparks: c.sparks,
                              shimmer: c.shimmer,
                              burnDuration: c.burnDuration,
                              pocketSize: c.pocketSize,
                              heal: h,
                              follow: p,
                              hover: x,
                              clickToBurn: w,
                              autoplay: k,
                              interval: E,
                              idleDelay: M,
                            },
                            e,
                          ),
                        }),
                      }),
                    }),
                    (0, o.jsxs)(n.IH, {
                      children: [
                        (0, o.jsx)(n.bg, {
                          title: "Preset",
                          value: l,
                          options: R,
                          onChange: (e) => {
                            (s(e), m(A[e] ?? F));
                          },
                        }),
                        (0, o.jsx)(n.W7, {
                          title: "Ember",
                          value: c.colors[0],
                          onChange: v(0),
                        }),
                        (0, o.jsx)(n.W7, {
                          title: "Char",
                          value: c.colors[1],
                          onChange: v(1),
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Glow",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: c.glow,
                          onChange: d("glow"),
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Edge",
                          min: 0.3,
                          max: 3,
                          step: 0.05,
                          value: c.edge,
                          onChange: d("edge"),
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Roughness",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: c.roughness,
                          onChange: d("roughness"),
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Detail",
                          min: 1,
                          max: 14,
                          step: 0.5,
                          value: c.detail,
                          onChange: d("detail"),
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Scorch",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: c.scorch,
                          onChange: d("scorch"),
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Smoke",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: c.smoke,
                          onChange: d("smoke"),
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Sparks",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: c.sparks,
                          onChange: d("sparks"),
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Shimmer",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: c.shimmer,
                          onChange: d("shimmer"),
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Burn Duration",
                          min: 0.6,
                          max: 5,
                          step: 0.1,
                          value: c.burnDuration,
                          valueUnit: "s",
                          onChange: d("burnDuration"),
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Pocket Size",
                          min: 0,
                          max: 220,
                          step: 2,
                          value: c.pocketSize,
                          valueUnit: "px",
                          onChange: d("pocketSize"),
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Heal",
                          min: 0.05,
                          max: 3,
                          step: 0.05,
                          value: h,
                          valueUnit: "s",
                          onChange: f,
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Follow",
                          min: 0.02,
                          max: 0.5,
                          step: 0.01,
                          value: p,
                          valueUnit: "s",
                          onChange: g,
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Interval",
                          min: 1,
                          max: 10,
                          step: 0.5,
                          value: E,
                          valueUnit: "s",
                          onChange: T,
                        }),
                        (0, o.jsx)(n.yt, {
                          title: "Idle Delay",
                          min: 0,
                          max: 8,
                          step: 0.25,
                          value: M,
                          valueUnit: "s",
                          onChange: P,
                        }),
                        (0, o.jsx)(n.tl, {
                          title: "Hover",
                          checked: x,
                          onChange: b,
                        }),
                        (0, o.jsx)(n.tl, {
                          title: "Click To Burn",
                          checked: w,
                          onChange: y,
                        }),
                        (0, o.jsx)(n.tl, {
                          title: "Autoplay",
                          checked: k,
                          onChange: S,
                        }),
                      ],
                    }),
                    (0, o.jsx)(n.Ub, { data: D }),
                  ],
                }),
                (0, o.jsx)(n.lT, { children: (0, o.jsx)(n.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
