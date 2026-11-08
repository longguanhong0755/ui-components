/* ReactBits Pro public preview module 29136 for ai-blob.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/29136.91aa5504f5deaa94.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  29136: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => A }));
    var o = n(95155),
      l = n(12115),
      i = n(56388),
      a = n(90761),
      r = n(2253),
      s = n(12246),
      u = n(90650);
    let c = {
        idle: { speed: 1, color: 1, react: 0.4, listen: 0, think: 0 },
        listening: { speed: 1.2, color: 1.3, react: 0.8, listen: 1, think: 0 },
        thinking: { speed: 2.2, color: 4, react: 0.3, listen: 0.2, think: 1 },
        speaking: { speed: 1.5, color: 1.8, react: 1, listen: 0.3, think: 0 },
      },
      d = ["#ff006e", "#8338ec", "#3a86ff", "#06ffa5"],
      m = (e, t, n) => Math.min(n, Math.max(t, e)),
      h = (e, t) => (Number.isFinite(e) ? e : t),
      v = new r.Q1f(),
      p = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      f = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      g = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      b = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`,
      y = `
precision highp float;

uniform float uTime;
uniform float uColorTime;
uniform vec2 uResolution;
uniform float uGlowIntensity;
uniform float uNoiseScale;
uniform float uInnerScale;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform float uRimWidth;
uniform float uRimIntensity;
uniform float uCoreIntensity;
uniform float uGlints;
uniform float uHalo;
uniform float uWobble;
uniform float uLevel;
uniform float uReact;
uniform float uListen;
uniform float uThink;
uniform vec2 uLook;
uniform float uJiggle;
uniform float uTapAngle;
uniform float uTapAge;
uniform float uInk;
uniform float uFade;
uniform float uGrow;

#define PI_TWO 6.28318530718

float rng(vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float perlin(vec2 p) {
  vec2 ip = floor(p);
  vec2 u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  float res = mix(
    mix(rng(ip), rng(ip + vec2(1.0, 0.0)), u.x),
    mix(rng(ip + vec2(0.0, 1.0)), rng(ip + vec2(1.0, 1.0)), u.x),
    u.y
  );
  return res * res;
}

float fractal(vec2 p) {
  return (perlin(p) * 0.5 + perlin(p * 2.0) * 0.25) / 0.75;
}

float brightness(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

mat3 rotateX(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
}

mat3 rotateY(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}

mat3 rotateZ(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);
}

vec3 blendHue(vec3 a, vec3 b, float k) {
  float turn = b.z - a.z;
  turn -= PI_TWO * floor((turn + 3.14159265) / PI_TWO);
  float lightness = mix(a.x, b.x, k);
  float chroma = mix(a.y, b.y, k);
  float hue = a.z + turn * k;
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * vec3(lightness, chroma * cos(hue), chroma * sin(hue));
  lms = lms * lms * lms;
  vec3 linear = mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * lms;
  return pow(clamp(linear, 0.0, 1.0), vec3(1.0 / 2.2));
}

vec3 ramp(float t) {
  float g = fract(t) * 4.0;
  if (g < 1.0) return blendHue(uColor1, uColor2, smoothstep(0.0, 1.0, g));
  if (g < 2.0) return blendHue(uColor2, uColor3, smoothstep(0.0, 1.0, g - 1.0));
  if (g < 3.0) return blendHue(uColor3, uColor4, smoothstep(0.0, 1.0, g - 2.0));
  return blendHue(uColor4, uColor1, smoothstep(0.0, 1.0, g - 3.0));
}

void main() {
  float minRes = min(uResolution.x, uResolution.y);
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / minRes * 1.5;
  float t = uTime;

  float bearing = atan(uv.y, uv.x);
  float squish = uJiggle * exp(-uTapAge * 3.0) * sin(uTapAge * 13.0) * 0.07 * cos(2.0 * (bearing - uTapAngle));
  float sway = uWobble * 0.035 * (sin(3.0 * bearing + t * 0.9) * sin(t * 0.6) + 0.6 * sin(2.0 * bearing - t * 0.7 + 1.3));
  uv /= max(uGrow * (1.0 + uLevel * uReact * 0.06 + squish + sway), 0.05);

  float l = dot(uv, uv);
  if (l > 2.5) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float sm = smoothstep(1.04, 0.96, l);
  float z = sqrt(max(0.0, 1.0 - min(l, 1.0)));
  vec3 noisePos = normalize(vec3(uv.x, uv.y, z));

  float angleX = sin(t * 0.23) * 1.5 + cos(t * 0.37) * 0.6 + uLook.y * 0.6;
  float angleY = sin(t * 0.19) * 1.3 + cos(t * 0.41) * 0.7 - uLook.x * 0.6;
  float angleZ = sin(t * 0.31) * 1.1 + cos(t * 0.29) * 0.5;
  noisePos = rotateX(angleX) * noisePos;
  noisePos = rotateY(angleY) * noisePos;
  noisePos = rotateZ(angleZ) * noisePos;

  float d = sm * l * l * l * 2.0;
  vec3 norm = normalize(vec3(uv.x, uv.y, 0.7 - d));

  float nx = fractal(noisePos.xy * 2.0 * uNoiseScale / 3.0 + t * 0.4 + 25.69);
  float ny = fractal(noisePos.xy * 2.0 * uNoiseScale / 3.0 + t * 0.4 + 86.31);
  float n = fractal(noisePos.xy * uNoiseScale + 2.0 * vec2(nx, ny));
  vec3 col = vec3(n * 0.5 + 0.25);
  vec3 gradientColor = ramp(atan(noisePos.y, noisePos.x) / PI_TWO + uColorTime * 0.1);

  col *= gradientColor;
  col *= 2.0 * uGlowIntensity * 1.25 * (1.0 + uListen * 0.35 + uLevel * uReact * 0.6);
  vec3 cd = abs(col);
  vec3 c = col * d * uRimIntensity;

  vec3 lightDir = normalize(vec3(uLook.x * 0.35, uLook.y * 0.35, -1.0));
  float lightDot = max(0.0, dot(norm, lightDir));
  float glint = lightDot * lightDot * lightDot * lightDot * lightDot * 3.0 * uGlints;
  c += (c * 0.5 + vec3(1.0) - brightness(c)) * glint;

  float inner = 1.0 - 0.02 * max(uRimWidth, 0.05);
  float outline = max((1.0 - smoothstep(1.0, inner, l) - pow(max(0.0, length(uv) - 1.0), 0.2)) * 2.0, 0.0);
  col = c + col * outline * outline * outline * outline * uRimIntensity;

  float f = fractal(noisePos.xy * 2.0 + t) + 0.1;
  vec2 innerUV = uv * (f + 0.1) * 0.5 / max(uInnerScale, 0.05);
  float innerL = dot(innerUV, innerUV);
  vec3 ins = normalize(cd + 0.0001) + 0.1;
  float ind = 0.2 + pow(smoothstep(0.0, 1.5, sqrt(innerL)) * 48.0, 0.25);
  ind *= ind * ind * ind;
  ind = 1.0 / ind;
  ins *= ind;
  float pulse = uCoreIntensity * (1.0 + uLevel * uReact * 0.9 + uThink * 0.3 * sin(t * 3.5) + uJiggle * exp(-uTapAge * 2.0) * 0.9);
  vec3 coreGlow = ins * ins * smoothstep(0.05, 1.0, ind);
  vec3 core = (1.0 - exp(-coreGlow * 3.0)) * sm * uGlowIntensity * 1.15 * pulse;
  vec3 shade = abs(norm) * (1.0 - d) * sm * 0.25;

  float edgeDist = length(uv);
  float edgeFalloff = smoothstep(1.0, 0.95, edgeDist);
  float spread = max(uHalo, 0.05);
  float halo = exp(-max(edgeDist - 1.0, 0.0) * (14.0 / spread)) * smoothstep(0.96, 1.0, edgeDist) * uGlowIntensity * min(spread, 1.5) * (1.0 + uLevel * uReact + uListen * 0.4);
  vec3 vivid = gradientColor / max(max(gradientColor.r, max(gradientColor.g, gradientColor.b)), 0.0001);

  if (uInk > 0.5) {
    float inside = smoothstep(1.012, 0.988, edgeDist);
    float line = clamp(outline * outline * outline * outline * uRimIntensity * 0.9, 0.0, 1.0);
    float band = clamp(pow(d * (n * 0.9 + 0.2) * 0.55, 1.7) * uRimIntensity * 1.3, 0.0, 1.0);
    float rimA = clamp(line + band, 0.0, 1.0) * inside;
    float coreA = clamp(pow(brightness(core), 2.2) * 1.8, 0.0, 0.85);
    float haloA = clamp(halo * 0.28, 0.0, 1.0) * (1.0 - inside * 0.6);
    vec3 coreInk = mix(vivid, vec3(1.0), 0.18) * 0.9;
    float weight = max(rimA + coreA + haloA, 0.0001);
    vec3 paint = (vivid * 0.82 * rimA + coreInk * coreA + vivid * haloA) / weight;
    float cover = 1.0 - (1.0 - rimA) * (1.0 - coreA) * (1.0 - haloA);
    gl_FragColor = vec4(paint, clamp(cover, 0.0, 1.0) * uFade);
    return;
  }

  col += core + shade;
  float alpha = clamp(sm * pow(brightness(col), 2.5) * 2.0, 0.0, 1.0) * edgeFalloff;
  col = pow(max(col, 0.0), vec3(0.95));
  float glowA = clamp(halo * 0.35, 0.0, 1.0) * (1.0 - alpha);
  float total = alpha + glowA;
  vec3 mixed = (col * alpha + vivid * 1.1 * glowA) / max(total, 0.0001);
  gl_FragColor = vec4(mixed, clamp(total, 0.0, 1.0) * uFade);
}
`,
      x = (0, l.forwardRef)(function (
        {
          size: e = 400,
          animationSpeed: t = 1,
          glowIntensity: n = 0.8,
          noiseScale: i = 3,
          innerScale: a = 1,
          resolution: x = 1,
          colors: w = d,
          state: C = "idle",
          volume: I,
          getVolume: F,
          autoVolume: S = !0,
          reactivity: k = 1,
          rimWidth: A = 1,
          rimIntensity: j = 1,
          coreIntensity: T = 1,
          glints: M = 1,
          halo: R = 1,
          colorSpeed: L = 1,
          wobble: E = 0,
          hoverTilt: P = 1,
          interactive: W = !0,
          blend: D = "auto",
          intro: G = !0,
          paused: N = !1,
          className: z,
          style: H,
        },
        B,
      ) {
        let q = (0, l.useRef)(null),
          V = (0, l.useRef)(null),
          _ = (0, l.useRef)(null),
          X = {
            size: e,
            animationSpeed: t,
            glowIntensity: n,
            noiseScale: i,
            innerScale: a,
            resolution: x,
            colors: w,
            state: C,
            volume: I,
            getVolume: F,
            autoVolume: S,
            reactivity: k,
            rimWidth: A,
            rimIntensity: j,
            coreIntensity: T,
            glints: M,
            halo: R,
            colorSpeed: L,
            wobble: E,
            hoverTilt: P,
            interactive: W,
            blend: D,
            intro: G,
            paused: N,
            reduced: (0, l.useSyncExternalStore)(f, g, () => !1),
          },
          Y = (0, l.useRef)(X);
        return (
          (0, l.useEffect)(() => {
            ((Y.current = X), _.current?.sync());
          }),
          (0, l.useEffect)(() => {
            let e = q.current,
              t = V.current;
            if (!e || !t) return;
            let n = (function (e, t, n) {
              let o,
                l = e.ownerDocument,
                i = l.defaultView ?? window;
              try {
                o = new s.WebGLRenderer({
                  antialias: !0,
                  alpha: !0,
                  powerPreference: "high-performance",
                  premultipliedAlpha: !1,
                  stencil: !1,
                  depth: !1,
                });
              } catch {
                return null;
              }
              o.setClearColor(0, 0);
              let a = o.domElement;
              (a.setAttribute("aria-hidden", "true"),
                (a.style.cssText =
                  "position:absolute;inset:0;width:100%;height:100%;display:block;background:transparent"),
                t.appendChild(a));
              let u = {
                  uTime: { value: 0 },
                  uColorTime: { value: 0 },
                  uResolution: { value: new r.I9Y(1, 1) },
                  uGlowIntensity: { value: 0.8 },
                  uNoiseScale: { value: 3 },
                  uInnerScale: { value: 1 },
                  uColor1: { value: new r.Pq0() },
                  uColor2: { value: new r.Pq0() },
                  uColor3: { value: new r.Pq0() },
                  uColor4: { value: new r.Pq0() },
                  uRimWidth: { value: 1 },
                  uRimIntensity: { value: 1 },
                  uCoreIntensity: { value: 1 },
                  uGlints: { value: 1 },
                  uHalo: { value: 1 },
                  uWobble: { value: 0 },
                  uLevel: { value: 0 },
                  uReact: { value: 0.4 },
                  uListen: { value: 0 },
                  uThink: { value: 0 },
                  uLook: { value: new r.I9Y() },
                  uJiggle: { value: 0 },
                  uTapAngle: { value: 0 },
                  uTapAge: { value: 10 },
                  uInk: { value: 0 },
                  uFade: { value: 1 },
                  uGrow: { value: 1 },
                },
                f = new r.BKk({
                  uniforms: u,
                  vertexShader: b,
                  fragmentShader: y,
                  transparent: !1,
                  blending: r.XIg,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                g = new r.bdM(2, 2),
                x = new r.eaF(g, f);
              x.frustumCulled = !1;
              let w = new r.Z58();
              w.add(x);
              let C = new r.qUd(-1, 1, 1, -1, 0, 1),
                I = 0,
                F = 0,
                S = 1,
                k = !1,
                A = "",
                j = -10,
                T = 0,
                M = 0,
                R = 0,
                L = 0,
                E = 0,
                P = 0,
                W = 0,
                D = 0,
                G = 0,
                N = 10,
                z = -1,
                H = 1,
                B = 0,
                q = 1,
                V = 0,
                _ = 0,
                X = !1,
                Y = !1,
                O = !1,
                U = null,
                J = { ...c.idle },
                Z = () => {
                  let t = n.current,
                    l = Math.round(e.clientWidth),
                    a = Math.round(e.clientHeight);
                  if (l < 2 || a < 2) return ((k = !1), !1);
                  let r =
                    Math.min(i.devicePixelRatio || 1, 2) *
                    m(h(t.resolution, 1), 0.25, 2);
                  return (
                    (!k || l !== I || a !== F || r !== S) &&
                    ((k = !0),
                    (I = l),
                    (F = a),
                    (S = r),
                    o.setPixelRatio(S),
                    o.setSize(I, F, !1),
                    u.uResolution.value.set(I * S, F * S),
                    !0)
                  );
                },
                K = () => {
                  if (!k) return;
                  let t = n.current;
                  if (performance.now() - j > 1e3) {
                    let t;
                    ((j = performance.now()),
                      (t = n.current),
                      (u.uInk.value =
                        "ink" === t.blend
                          ? 1
                          : "glow" === t.blend
                            ? 0
                            : +!!(() => {
                                let t = e.parentElement;
                                for (; t;) {
                                  let e = i
                                    .getComputedStyle(t)
                                    .backgroundColor.match(/rgba?\(([^)]+)\)/);
                                  if (e) {
                                    let t = e[1]
                                      .split(",")
                                      .map((e) => Number.parseFloat(e));
                                    if (t.length < 4 || t[3] > 0.05)
                                      return (
                                        0.2126 * t[0] +
                                          0.7152 * t[1] +
                                          0.0722 * t[2] >
                                        140
                                      );
                                  }
                                  t = t.parentElement;
                                }
                                return !i.matchMedia(
                                  "(prefers-color-scheme: dark)",
                                ).matches;
                              })()));
                  }
                  ((() => {
                    let e = n.current,
                      t = e.colors.length ? e.colors : d,
                      o = t.join("|");
                    if (o === A) return;
                    A = o;
                    let l = (e) =>
                      ((e, t) => {
                        try {
                          v.setStyle((e ?? t).trim() || t, r.jf0);
                        } catch {
                          v.setStyle(t, r.jf0);
                        }
                        let n = p(v.r),
                          o = p(v.g),
                          l = p(v.b),
                          i = Math.cbrt(
                            0.4122214708 * n +
                              0.5363325363 * o +
                              0.0514459929 * l,
                          ),
                          a = Math.cbrt(
                            0.2119034982 * n +
                              0.6806995451 * o +
                              0.1073969566 * l,
                          ),
                          s = Math.cbrt(
                            0.0883024619 * n +
                              0.2817188376 * o +
                              0.6299787005 * l,
                          ),
                          u =
                            1.9779984951 * i -
                            2.428592205 * a +
                            0.4505937099 * s,
                          c =
                            0.0259040371 * i +
                            0.7827717662 * a -
                            0.808675766 * s;
                        return new r.Pq0(
                          0.2104542553 * i + 0.793617785 * a - 0.0040720468 * s,
                          Math.hypot(u, c),
                          Math.atan2(c, u),
                        );
                      })(t[e] ?? t[e % t.length], d[e]);
                    (u.uColor1.value.copy(l(0)),
                      u.uColor2.value.copy(l(1)),
                      u.uColor3.value.copy(l(2)),
                      u.uColor4.value.copy(l(3)));
                  })(),
                    (u.uTime.value = T),
                    (u.uColorTime.value = M),
                    (u.uGlowIntensity.value = m(h(t.glowIntensity, 0.8), 0, 3)),
                    (u.uNoiseScale.value = m(h(t.noiseScale, 3), 0.1, 20)),
                    (u.uInnerScale.value = m(h(t.innerScale, 1), 0.05, 5)),
                    (u.uRimWidth.value = m(h(t.rimWidth, 1), 0.05, 6)),
                    (u.uRimIntensity.value = m(h(t.rimIntensity, 1), 0, 3)),
                    (u.uCoreIntensity.value = m(h(t.coreIntensity, 1), 0, 3)),
                    (u.uGlints.value = m(h(t.glints, 1), 0, 3)),
                    (u.uHalo.value = m(h(t.halo, 1), 0, 3)),
                    (u.uWobble.value = t.reduced ? 0 : m(h(t.wobble, 0), 0, 3)),
                    (u.uLevel.value = R),
                    (u.uReact.value = m(h(t.reactivity, 1), 0, 3) * J.react),
                    (u.uListen.value = J.listen),
                    (u.uThink.value = J.think),
                    u.uLook.value.set(L, E),
                    (u.uJiggle.value = D),
                    (u.uTapAngle.value = G),
                    (u.uTapAge.value = N),
                    (u.uFade.value = q),
                    (u.uGrow.value = H),
                    o.render(w, C));
                },
                Q = () => {
                  Y || O || !X || V || (V = requestAnimationFrame($));
                },
                $ = (e) => {
                  if (((V = 0), Y || O)) return;
                  let t = n.current,
                    o =
                      _ && e - _ < 100
                        ? Math.min(Math.max((e - _) / 1e3, 0), 0.05)
                        : 1 / 60;
                  _ = e;
                  let i = !t.reduced && !t.paused,
                    a = c[t.state] ?? c.idle,
                    r = t.reduced ? 1 : 1 - Math.exp(-o / 0.35);
                  if (
                    ((J.speed += (a.speed - J.speed) * r),
                    (J.color += (a.color - J.color) * r),
                    (J.react += (a.react - J.react) * r),
                    (J.listen += (a.listen - J.listen) * r),
                    (J.think += (a.think - J.think) * r),
                    i)
                  ) {
                    let e = m(h(t.animationSpeed, 1), 0, 5);
                    ((T += o * e * J.speed),
                      (M += o * e * m(h(t.colorSpeed, 1), 0, 5) * J.color),
                      (N += o) > 6 && (D = 0));
                  }
                  let s = i
                    ? ((e, t) => {
                        if (e.getVolume)
                          try {
                            return m(h(e.getVolume(), 0), 0, 1);
                          } catch {
                            return 0;
                          }
                        if (void 0 !== e.volume) return m(h(e.volume, 0), 0, 1);
                        if (
                          e.autoVolume &&
                          ("listening" === e.state || "speaking" === e.state)
                        ) {
                          var n, o;
                          let l;
                          return (
                            (n = t / 1e3),
                            (o = e.state),
                            Math.pow(
                              0.5 +
                                0.5 * Math.sin(9 * n + 2 * Math.sin(2.3 * n)),
                              3,
                            ) *
                              ((l = m(
                                (0.5 +
                                  0.35 * Math.sin(0.9 * n) +
                                  0.25 * Math.sin(2.1 * n + 1) -
                                  0.2) /
                                  0.45,
                                0,
                                1,
                              )) *
                                l *
                                (3 - 2 * l)) *
                              (0.7 + 0.3 * Math.sin(13.7 * n)) *
                              ("speaking" === o ? 1 : 0.6)
                          );
                        }
                        return 0;
                      })(t, e)
                    : 0;
                  R += (s - R) * (1 - Math.exp(-o / (s > R ? 0.05 : 0.22)));
                  let u = t.reduced ? 1 : 1 - Math.exp(-o / 0.35);
                  ((L += (P - L) * u),
                    (E += (W - E) * u),
                    t.intro && !t.reduced
                      ? (z < 0 && (z = e),
                        (q = m((e - z) / 450, 0, 1)),
                        (B += (-70 * (H - 1) - 9 * B) * o),
                        (H += B * o))
                      : ((q = 1), (H = 1), (B = 0)),
                    K());
                  let d =
                    Math.abs(P - L) + Math.abs(W - E) > 5e-4 ||
                    R > 5e-4 ||
                    Math.abs(H - 1) + Math.abs(B) > 5e-4 ||
                    q < 1;
                  (i || d) && !l.hidden
                    ? (V = requestAnimationFrame($))
                    : (_ = 0);
                },
                ee = (e, t) => {
                  ((D = Math.min(D * Math.exp(-(3 * N)) + t, 2.2)),
                    (N = 0),
                    (G = e));
                },
                et = (e) => {
                  e.isPrimary &&
                    ("mouse" !== e.pointerType || 0 === e.button) &&
                    (U = {
                      id: e.pointerId,
                      x: e.clientX,
                      y: e.clientY,
                      time: performance.now(),
                    });
                },
                en = (t) => {
                  let o = U;
                  if (
                    ((U = null),
                    !o ||
                      o.id !== t.pointerId ||
                      Math.hypot(t.clientX - o.x, t.clientY - o.y) > 10 ||
                      performance.now() - o.time > 600)
                  )
                    return;
                  let l = n.current;
                  if (!l.interactive || l.reduced || l.paused) return;
                  let i = e.getBoundingClientRect();
                  i.width <= 0 ||
                    i.height <= 0 ||
                    (ee(
                      Math.atan2(
                        i.top + i.height / 2 - t.clientY,
                        t.clientX - i.left - i.width / 2,
                      ),
                      1,
                    ),
                    Q());
                },
                eo = (t) => {
                  if ("touch" === t.pointerType) return;
                  let o = n.current,
                    l = e.getBoundingClientRect();
                  if (l.width <= 0 || l.height <= 0) return;
                  let i = m(h(o.hoverTilt, 1), 0, 3);
                  ((P =
                    m(((t.clientX - l.left) / l.width - 0.5) * 2, -1, 1) * i),
                    (W =
                      m((0.5 - (t.clientY - l.top) / l.height) * 2, -1, 1) * i),
                    Q());
                },
                el = (e) => {
                  "touch" !== e.pointerType && ((P = 0), (W = 0), Q());
                },
                ei = () => {
                  U = null;
                },
                ea = () => {
                  ((_ = 0), Q());
                },
                er = (e) => {
                  (e.preventDefault(),
                    (O = !0),
                    cancelAnimationFrame(V),
                    (V = 0));
                },
                es = () => {
                  ((O = !1), (A = ""), Q());
                },
                eu = new ResizeObserver(() => {
                  Z() && (K(), Q());
                }),
                ec = new IntersectionObserver(
                  ([e]) => {
                    ((X = e.isIntersecting), (_ = 0), Q());
                  },
                  { rootMargin: "120px" },
                );
              return (
                e.addEventListener("pointerdown", et),
                e.addEventListener("pointerup", en),
                e.addEventListener("pointermove", eo),
                e.addEventListener("pointerleave", el),
                e.addEventListener("pointercancel", ei),
                l.addEventListener("visibilitychange", ea),
                a.addEventListener("webglcontextlost", er),
                a.addEventListener("webglcontextrestored", es),
                eu.observe(e),
                ec.observe(e),
                n.current.intro && !n.current.reduced && ((H = 0.7), (q = 0)),
                (T = 2 * !!n.current.reduced),
                Z(),
                {
                  sync: () => {
                    ((j = -10), Z(), (_ = 0), !V && X && (K(), Q()));
                  },
                  tap: (e, t) => {
                    n.current.reduced ||
                      (ee(
                        void 0 === e
                          ? Math.random() * Math.PI * 2
                          : (h(e, 0) * Math.PI) / 180,
                        m(h(t ?? 1, 1), 0, 2),
                      ),
                      Q());
                  },
                  destroy: () => {
                    ((Y = !0),
                      cancelAnimationFrame(V),
                      eu.disconnect(),
                      ec.disconnect(),
                      e.removeEventListener("pointerdown", et),
                      e.removeEventListener("pointerup", en),
                      e.removeEventListener("pointermove", eo),
                      e.removeEventListener("pointerleave", el),
                      e.removeEventListener("pointercancel", ei),
                      l.removeEventListener("visibilitychange", ea),
                      a.removeEventListener("webglcontextlost", er),
                      a.removeEventListener("webglcontextrestored", es),
                      w.remove(x),
                      g.dispose(),
                      f.dispose(),
                      o.dispose(),
                      a.remove());
                  },
                }
              );
            })(e, t, Y);
            return (
              (_.current = n),
              () => {
                (n?.destroy(), (_.current = null));
              }
            );
          }, []),
          (0, l.useImperativeHandle)(
            B,
            () => ({ tap: (e, t) => _.current?.tap(e, t) }),
            [],
          ),
          (0, o.jsx)("div", {
            ref: q,
            className: (0, u.cn)("relative", z),
            style: { width: e, height: e, touchAction: "manipulation", ...H },
            children: (0, o.jsx)("div", {
              ref: V,
              "aria-hidden": "true",
              className: "pointer-events-none absolute inset-0 select-none",
            }),
          })
        );
      });
    x.displayName = "AIBlob";
    let w = {
        colors: ["#ff006e", "#8338ec", "#3a86ff", "#06ffa5"],
        glowIntensity: 0.8,
        noiseScale: 3,
        innerScale: 1,
        rimWidth: 1,
        rimIntensity: 1,
        coreIntensity: 1,
        glints: 1,
        halo: 1,
        wobble: 0,
      },
      C = {
        iridescent: w,
        aurora: {
          ...w,
          colors: ["#5227FF", "#B19EEF", "#FF9FFC", "#7C5CFF"],
          glowIntensity: 0.95,
          halo: 1.3,
        },
        siri: {
          ...w,
          colors: ["#FF2D95", "#A259FF", "#2E9BFF", "#00E5FF"],
          glowIntensity: 1,
          rimWidth: 1.6,
          coreIntensity: 1.3,
          wobble: 0.6,
        },
        ocean: {
          ...w,
          colors: ["#00C2FF", "#0066FF", "#00FFC6", "#7DF9FF"],
          noiseScale: 2.4,
          halo: 1.4,
        },
        sunset: {
          ...w,
          colors: ["#FF5F6D", "#FFC371", "#FF9A8B", "#FF6A88"],
          glowIntensity: 0.9,
          glints: 1.4,
        },
        emerald: {
          ...w,
          colors: ["#00F5A0", "#00D9F5", "#7CFF6B", "#2AF598"],
          innerScale: 1.4,
          coreIntensity: 1.4,
        },
        halo: {
          ...w,
          colors: ["#B19EEF", "#FF9FFC", "#7C5CFF", "#C8F1FF"],
          rimWidth: 0.5,
          rimIntensity: 1.4,
          coreIntensity: 0.3,
          halo: 2.2,
          glints: 0.5,
        },
        mono: {
          ...w,
          colors: ["#FFFFFF", "#B8C4D6", "#E8ECF2", "#9AA8BC"],
          glowIntensity: 0.9,
          rimWidth: 1.4,
          glints: 1.6,
          coreIntensity: 0.8,
        },
      },
      I = [
        { label: "Iridescent", value: "iridescent" },
        { label: "Aurora", value: "aurora" },
        { label: "Siri", value: "siri" },
        { label: "Ocean", value: "ocean" },
        { label: "Sunset", value: "sunset" },
        { label: "Emerald", value: "emerald" },
        { label: "Halo", value: "halo" },
        { label: "Mono", value: "mono" },
      ],
      F = [
        { label: "Idle", value: "idle" },
        { label: "Listening", value: "listening" },
        { label: "Thinking", value: "thinking" },
        { label: "Speaking", value: "speaking" },
      ],
      S = [
        { label: "Auto", value: "auto" },
        { label: "Glow", value: "glow" },
        { label: "Ink", value: "ink" },
      ],
      k = [
        {
          name: "size",
          type: "number",
          default: "400",
          description: "Width and height of the orb in pixels.",
        },
        {
          name: "colors",
          type: "string[]",
          default: '["#ff006e", "#8338ec", "#3a86ff", "#06ffa5"]',
          description: "Two to four colours that flow around the rim.",
        },
        {
          name: "state",
          type: '"idle" | "listening" | "thinking" | "speaking"',
          default: '"idle"',
          description:
            "What the assistant is doing. Listening brightens the rim and halo, thinking spins the colours and pulses the core, speaking swells with the voice.",
        },
        {
          name: "volume",
          type: "number",
          default: "—",
          description:
            "Audio level from 0 to 1 that drives the swell and the core.",
        },
        {
          name: "getVolume",
          type: "() => number",
          default: "—",
          description:
            "Called every frame to read a live audio level (0 to 1), for example the RMS of a Web Audio analyser.",
        },
        {
          name: "autoVolume",
          type: "boolean",
          default: "true",
          description:
            "Simulates a voice while listening or speaking when no volume is given.",
        },
        {
          name: "reactivity",
          type: "number",
          default: "1",
          description: "How strongly the volume swells and brightens the orb.",
        },
        {
          name: "animationSpeed",
          type: "number",
          default: "1",
          description: "Speed of the inner motion.",
        },
        {
          name: "colorSpeed",
          type: "number",
          default: "1",
          description: "Speed at which the colours travel around the rim.",
        },
        {
          name: "glowIntensity",
          type: "number",
          default: "0.8",
          description: "Overall brightness of the orb.",
        },
        {
          name: "noiseScale",
          type: "number",
          default: "3",
          description: "Detail of the shimmer along the rim.",
        },
        {
          name: "innerScale",
          type: "number",
          default: "1",
          description: "Size of the glowing core.",
        },
        {
          name: "coreIntensity",
          type: "number",
          default: "1",
          description: "Brightness of the glowing core.",
        },
        {
          name: "rimWidth",
          type: "number",
          default: "1",
          description: "Thickness of the bright outline.",
        },
        {
          name: "rimIntensity",
          type: "number",
          default: "1",
          description: "Brightness of the coloured rim.",
        },
        {
          name: "glints",
          type: "number",
          default: "1",
          description: "Strength of the white highlights on the glass.",
        },
        {
          name: "halo",
          type: "number",
          default: "1",
          description: "Size of the soft glow around the orb.",
        },
        {
          name: "wobble",
          type: "number",
          default: "0",
          description: "Lets the outline sway like a soft bubble.",
        },
        {
          name: "hoverTilt",
          type: "number",
          default: "1",
          description: "How far the orb turns toward the pointer.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description: "Tap the orb to make it squish and flare.",
        },
        {
          name: "blend",
          type: '"auto" | "glow" | "ink"',
          default: '"auto"',
          description:
            "Glow suits dark pages, ink draws clean colour on light pages. Auto picks from the background behind the orb.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description: "Pops the orb in with a soft spring.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Stops the motion. Reduced-motion users get a still orb.",
        },
        {
          name: "resolution",
          type: "number",
          default: "1",
          description:
            "Render resolution multiplier, lower for slower devices.",
        },
        {
          name: "ref",
          type: "{ tap }",
          default: "—",
          description:
            "tap(angle?, strength?) squishes the orb from an angle in degrees.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description: "Classes for the root element.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      A = () => {
        let [e, t] = (0, a.I)(),
          [n, r] = (0, l.useState)("iridescent"),
          [s, u] = (0, l.useState)(C.iridescent),
          c = (e) => (t) => u((n) => ({ ...n, [e]: t })),
          d = (e) => (t) =>
            u((n) => {
              let o = [...n.colors];
              return ((o[e] = t), { ...n, colors: o });
            }),
          [m, h] = (0, l.useState)("idle"),
          [v, p] = (0, l.useState)(400),
          [f, g] = (0, l.useState)(1),
          [b, y] = (0, l.useState)(1),
          [w, A] = (0, l.useState)(1),
          [j, T] = (0, l.useState)(1),
          [M, R] = (0, l.useState)(1),
          [L, E] = (0, l.useState)("auto"),
          [P, W] = (0, l.useState)(!0),
          [D, G] = (0, l.useState)(!0),
          [N, z] = (0, l.useState)(!0),
          [H, B] = (0, l.useState)(!1),
          [q, V] = (0, l.useState)(!1),
          _ = (0, l.useRef)(null);
        (0, l.useEffect)(() => {
          if (!q) return;
          let e = !1;
          return (
            navigator.mediaDevices
              .getUserMedia({ audio: !0 })
              .then((t) => {
                if (e) return void t.getTracks().forEach((e) => e.stop());
                let n = new AudioContext(),
                  o = n.createAnalyser();
                ((o.fftSize = 1024),
                  n.createMediaStreamSource(t).connect(o),
                  (_.current = {
                    stream: t,
                    context: n,
                    analyser: o,
                    data: new Float32Array(o.fftSize),
                  }));
              })
              .catch(() => V(!1)),
            () => {
              e = !0;
              let t = _.current;
              ((_.current = null),
                t?.stream.getTracks().forEach((e) => e.stop()),
                t?.context.close());
            }
          );
        }, [q]);
        let X = (0, l.useCallback)(() => {
          let e = _.current;
          if (!e) return 0;
          e.analyser.getFloatTimeDomainData(e.data);
          let t = 0;
          for (let n = 0; n < e.data.length; n++) t += e.data[n] * e.data[n];
          return Math.min(1, 7 * Math.sqrt(t / e.data.length));
        }, []);
        return (0, o.jsxs)("div", {
          children: [
            (0, o.jsx)(i.Bg, {}),
            (0, o.jsxs)(i.VX, {
              children: [
                (0, o.jsxs)(i.Ec, {
                  children: [
                    (0, o.jsx)(i.Ch, {
                      onRefresh: t,
                      children: (0, o.jsx)(
                        x,
                        {
                          ...s,
                          size: v,
                          state: q ? "listening" : m,
                          getVolume: q ? X : void 0,
                          autoVolume: P,
                          reactivity: w,
                          animationSpeed: f,
                          colorSpeed: b,
                          hoverTilt: j,
                          resolution: M,
                          blend: L,
                          interactive: D,
                          intro: N,
                          paused: H,
                        },
                        e,
                      ),
                    }),
                    (0, o.jsxs)(i.IH, {
                      children: [
                        (0, o.jsx)(i.bg, {
                          title: "Preset",
                          value: n,
                          options: I,
                          onChange: (e) => {
                            (r(e), u(C[e] ?? C.iridescent));
                          },
                        }),
                        (0, o.jsx)(i.bg, {
                          title: "State",
                          value: m,
                          options: F,
                          onChange: (e) => h(e),
                        }),
                        (0, o.jsx)(i.tl, {
                          title: "Microphone",
                          checked: q,
                          onChange: V,
                        }),
                        (0, o.jsx)(i.bg, {
                          title: "Blend",
                          value: L,
                          options: S,
                          onChange: (e) => E(e),
                        }),
                        (0, o.jsx)(i.W7, {
                          title: "Color 1",
                          value: s.colors[0],
                          onChange: d(0),
                        }),
                        (0, o.jsx)(i.W7, {
                          title: "Color 2",
                          value: s.colors[1],
                          onChange: d(1),
                        }),
                        (0, o.jsx)(i.W7, {
                          title: "Color 3",
                          value: s.colors[2],
                          onChange: d(2),
                        }),
                        (0, o.jsx)(i.W7, {
                          title: "Color 4",
                          value: s.colors[3],
                          onChange: d(3),
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Size",
                          min: 160,
                          max: 600,
                          step: 10,
                          value: v,
                          valueUnit: "px",
                          onChange: p,
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Glow",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: s.glowIntensity,
                          onChange: c("glowIntensity"),
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Rim Width",
                          min: 0.2,
                          max: 4,
                          step: 0.05,
                          value: s.rimWidth,
                          onChange: c("rimWidth"),
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Rim Intensity",
                          min: 0,
                          max: 2.5,
                          step: 0.01,
                          value: s.rimIntensity,
                          onChange: c("rimIntensity"),
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Core Size",
                          min: 0.2,
                          max: 3,
                          step: 0.01,
                          value: s.innerScale,
                          onChange: c("innerScale"),
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Core Intensity",
                          min: 0,
                          max: 2.5,
                          step: 0.01,
                          value: s.coreIntensity,
                          onChange: c("coreIntensity"),
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Glints",
                          min: 0,
                          max: 2.5,
                          step: 0.01,
                          value: s.glints,
                          onChange: c("glints"),
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Halo",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: s.halo,
                          onChange: c("halo"),
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Noise Scale",
                          min: 1,
                          max: 8,
                          step: 0.1,
                          value: s.noiseScale,
                          onChange: c("noiseScale"),
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Wobble",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: s.wobble,
                          onChange: c("wobble"),
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Speed",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: f,
                          onChange: g,
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Color Speed",
                          min: 0,
                          max: 4,
                          step: 0.01,
                          value: b,
                          onChange: y,
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Reactivity",
                          min: 0,
                          max: 3,
                          step: 0.01,
                          value: w,
                          onChange: A,
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Hover Tilt",
                          min: 0,
                          max: 2,
                          step: 0.01,
                          value: j,
                          onChange: T,
                        }),
                        (0, o.jsx)(i.yt, {
                          title: "Resolution",
                          min: 0.25,
                          max: 1,
                          step: 0.05,
                          value: M,
                          onChange: R,
                        }),
                        (0, o.jsx)(i.tl, {
                          title: "Auto Volume",
                          checked: P,
                          onChange: W,
                        }),
                        (0, o.jsx)(i.tl, {
                          title: "Interactive",
                          checked: D,
                          onChange: G,
                        }),
                        (0, o.jsx)(i.tl, {
                          title: "Intro",
                          checked: N,
                          onChange: z,
                        }),
                        (0, o.jsx)(i.tl, {
                          title: "Paused",
                          checked: H,
                          onChange: B,
                        }),
                      ],
                    }),
                    (0, o.jsx)(i.Ub, { data: k }),
                  ],
                }),
                (0, o.jsx)(i.lT, { children: (0, o.jsx)(i.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
