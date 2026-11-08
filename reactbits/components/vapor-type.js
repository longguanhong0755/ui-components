/* ReactBits Pro public preview module 25131 for vapor-type.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/25131.0e237c05af72fe0b.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  25131: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => W }));
    var r = a(95155),
      n = a(12115),
      o = a(56388),
      l = a(86049),
      i = a(90761),
      s = a(2253),
      u = a(12246),
      d = a(90650);
    let c = ["Imagine", "Create", "Inspire"],
      p = ["left", "right", "center", "top", "scatter"],
      f = (e, t, a) => Math.min(a, Math.max(t, e)),
      m = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      v = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      h = {
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
      },
      g = { display: "grid" },
      x = `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      w = `
precision highp float;

uniform sampler2D uPrevious;
uniform vec2 uResolution;
uniform vec2 uCanvas;
uniform float uFollow;
uniform float uDrain;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uAmount;
uniform vec2 uWind;

float segmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 e = b - a;
  float t = clamp(dot(p - a, e) / max(dot(e, e), 1e-4), 0.0, 1.0);
  return length(p - a - e * t);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = (uv - 0.5) * uCanvas;
  vec4 previous = texture2D(uPrevious, uv);
  float d = segmentDistance(p, uFrom, uTo) / uRadius;
  float paint = exp(-d * d * 2.0) * uAmount;
  float target = max(previous.a - uDrain, paint);
  float strength = previous.r + (target - previous.r) * uFollow;
  vec2 wind = mix(previous.gb, uWind, clamp(paint * 3.0, 0.0, 1.0));
  gl_FragColor = vec4(max(strength, 0.0), wind, max(target, 0.0));
}
`,
      b = `
uniform vec2 uCanvas;
uniform vec4 uBounds;
uniform vec2 uOrigin;
uniform float uSweep;
uniform float uStagger;
uniform float uPhase;
uniform float uMode;
uniform float uGrain;
uniform float uDpr;
uniform float uEm;
uniform float uBreath;
uniform sampler2D uField;

const float TRAVEL = 0.75;

float hash12(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float orderAt(vec2 p) {
  vec2 size = max(uBounds.zw - uBounds.xy, vec2(1.0));
  vec2 q = clamp((p - uBounds.xy) / size, 0.0, 1.0);
  float o;
  if (uSweep < 0.5) {
    o = q.x;
  } else if (uSweep < 1.5) {
    o = 1.0 - q.x;
  } else if (uSweep < 2.5) {
    o = abs(q.x - 0.5) * 2.0;
  } else if (uSweep < 3.5) {
    o = 1.0 - q.y;
  } else if (uSweep < 4.5) {
    o = noise(p / (uEm * 0.5) + 3.7);
  } else {
    o = clamp(length(p - uOrigin) / max(length(size), 1.0) * 1.5, 0.0, 1.0);
  }
  return clamp(mix(o, noise(p / (uEm * 0.35) + 11.0), 0.2), 0.0, 1.0);
}

float frontAt(vec2 p) {
  if (abs(uMode - 1.0) < 0.5) return 0.0;
  float t = clamp(uPhase * (1.0 + uStagger) - orderAt(p) * uStagger, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  return uMode < 0.5 ? 1.0 - t : t;
}

float releaseAt(vec2 p) {
  float g = noise(p / uGrain) * 0.6 + hash12(floor(p * uDpr) + 0.5) * 0.4;
  return 0.02 + 0.98 * clamp((g - 0.5) * 1.4 + 0.5, 0.0, 1.0);
}

vec4 fieldAt(vec2 p) {
  return texture2D(uField, p / uCanvas + 0.5);
}

float blowAt(float strength) {
  return clamp(strength * uBreath - 0.03, 0.0, 0.6);
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
`,
      y = `
varying vec2 vUv;
varying vec2 vWorld;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xy;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`,
      S = `
precision highp float;
${b}
uniform sampler2D uText;
uniform vec3 uColor;
varying vec2 vUv;
varying vec2 vWorld;

void main() {
  float ink = texture2D(uText, vUv).a;
  if (ink < 0.004) discard;
  float lift = max(frontAt(vWorld), blowAt(fieldAt(vWorld).r));
  if (lift >= releaseAt(vWorld) * (1.0 - TRAVEL)) discard;
  gl_FragColor = vec4(toSrgb(uColor), ink);
}
`,
      C = `
${b}
attribute vec4 aSeed;
uniform float uTime;
uniform float uSpread;
uniform float uRise;
uniform float uTurbulence;
uniform float uDiffusion;
uniform float uSize;
varying float vAlpha;
varying float vTint;

vec2 flow(vec2 p, float t) {
  p += 0.45 * sin(p.yx * vec2(1.3, 1.7) + vec2(t * 0.21, -t * 0.17));
  vec2 v = vec2(0.0);
  vec2 k = normalize(vec2(1.0, 0.6));
  v += vec2(k.y, -k.x) * cos(dot(k, p) * 1.1 + t * 0.55 + 1.3);
  k = normalize(vec2(-0.7, 1.1));
  v += vec2(k.y, -k.x) * cos(dot(k, p) * 1.9 - t * 0.47 + 4.1) * 0.55;
  k = normalize(vec2(1.3, -0.4));
  v += vec2(k.y, -k.x) * cos(dot(k, p) * 3.3 + t * 0.71 + 2.2) * 0.3;
  return v;
}

void main() {
  vec2 home = position.xy;
  vec4 field = fieldAt(home);
  float front = frontAt(home);
  float blow = blowAt(field.r);
  float s = clamp((max(front, blow) - releaseAt(home) * (1.0 - TRAVEL)) / TRAVEL, 0.0, 1.0);
  if (s <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    vTint = 0.0;
    return;
  }
  float blown = smoothstep(-0.04, 0.04, blow - front);
  float eased = uMode < 0.5 ? s * s : 1.0 - (1.0 - s) * (1.0 - s);
  eased = mix(eased, s, blown);
  float angle = aSeed.x * 6.2831853;
  vec2 jitter = vec2(cos(angle), sin(angle) * 0.7);
  vec2 drift = mix(vec2(0.0, uRise), field.gb * 2.2 + vec2(0.0, uRise * 0.3), blown);
  float reach = uSpread * eased * (0.3 + 0.7 * sqrt(aSeed.y));
  float stride = reach / 6.0;
  vec2 p = home;
  for (int i = 0; i < 6; i++) {
    vec2 f = flow(p / uEm * 0.9 + aSeed.z * 0.06, uTime);
    vec2 direction = drift + f * uTurbulence + jitter * uDiffusion * (0.2 + s);
    p += direction / max(length(direction), 0.35) * stride;
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
  gl_PointSize = max(uSize * uDpr * mix(1.0, 1.25, s), 1.0);
  vAlpha = (1.0 - smoothstep(mix(0.45, 0.7, blown), 1.0, s)) * (0.5 + 0.5 * aSeed.w);
  vTint = smoothstep(0.0, 0.5, s);
}
`,
      M = `
precision highp float;
uniform vec3 uColor;
uniform vec3 uVaporColor;
varying float vAlpha;
varying float vTint;

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  float d = length(gl_PointCoord - 0.5);
  float soft = 1.0 - smoothstep(0.3, 0.5, d);
  vec3 color = mix(uColor, uVaporColor, vTint);
  gl_FragColor = vec4(toSrgb(color), vAlpha * soft);
}
`,
      k = (e, t) =>
        "uppercase" === t
          ? e.toUpperCase()
          : "lowercase" === t
            ? e.toLowerCase()
            : "capitalize" === t
              ? e.replace(/(^|\s)(\S)/gu, (e, t, a) => `${t}${a.toUpperCase()}`)
              : e,
      j = (e, t) =>
        new s.nWS(e, t, {
          type: s.ix0,
          format: s.GWd,
          minFilter: s.k6q,
          magFilter: s.k6q,
          depthBuffer: !1,
          stencilBuffer: !1,
          generateMipmaps: !1,
        }),
      F = (e) => {
        (e.texture.dispose(), e.geometry.dispose());
      },
      A = (0, n.forwardRef)(function (
        {
          words: e = c,
          as: t = "span",
          align: a = "center",
          color: o = "currentColor",
          vaporColor: l = "#B19EEF",
          density: i = 1,
          particleSize: b = 1.2,
          spread: A = 1.2,
          rise: E = 1,
          turbulence: T = 0.8,
          diffusion: R = 0.35,
          grain: z = 1,
          sweep: B = "left",
          stagger: D = 0.8,
          condense: P = 1.8,
          hold: W = 2.4,
          dissolve: I = 2,
          overlap: q = 0.6,
          loop: L = !0,
          startOnView: O = !0,
          interactive: H = !0,
          breath: U = 1,
          breathRadius: Y = 0.8,
          recovery: N = 1.2,
          clickAdvance: V = !0,
          pauseOnHover: $ = !0,
          area: _ = "parent",
          paused: X = !1,
          dpr: G = 2,
          onWordChange: K,
          className: Q,
          style: Z,
        },
        J,
      ) {
        let ee = (0, n.useRef)(null),
          et = (0, n.useRef)(null),
          ea = (0, n.useRef)(null),
          er = (0, n.useSyncExternalStore)(m, v, () => !1),
          [en, eo] = (0, n.useState)(!1),
          el = er || en,
          ei = (0, n.useMemo)(() => {
            let t = e.map((e) => e.trim()).filter(Boolean);
            return t.length ? t : c;
          }, [e]),
          es = {
            words: ei,
            align: a,
            color: o,
            vaporColor: l,
            density: i,
            particleSize: b,
            spread: A,
            rise: E,
            turbulence: T,
            diffusion: R,
            grain: z,
            sweep: B,
            stagger: D,
            condense: P,
            hold: W,
            dissolve: I,
            overlap: q,
            loop: L,
            startOnView: O,
            interactive: H,
            breath: U,
            breathRadius: Y,
            recovery: N,
            clickAdvance: V,
            pauseOnHover: $,
            area: _,
            paused: X,
            dpr: G,
            onWordChange: K,
          },
          eu = (0, n.useRef)(es);
        ((0, n.useEffect)(() => {
          ((eu.current = es), ea.current?.sync());
        }),
          (0, n.useEffect)(() => {
            if (el) return;
            let e = ee.current,
              t = et.current;
            if (!e || !t) return;
            let a = ((e, t, a) => {
              let r,
                n = e.ownerDocument,
                o = n.createElement("canvas");
              o.style.cssText =
                "position:absolute;left:0;top:0;display:block;pointer-events:none";
              try {
                r = new u.WebGLRenderer({
                  canvas: o,
                  alpha: !0,
                  antialias: !1,
                  premultipliedAlpha: !0,
                  powerPreference: "high-performance",
                });
              } catch {
                return null;
              }
              (t.appendChild(o), r.setPixelRatio(1), r.setClearColor(0, 0));
              let l = {
                  uCanvas: { value: new s.I9Y(1, 1) },
                  uStagger: { value: 1 },
                  uGrain: { value: 2 },
                  uDpr: { value: 1 },
                  uEm: { value: 16 },
                  uBreath: { value: 1 },
                  uField: { value: null },
                  uColor: { value: new s.Q1f(1, 1, 1) },
                },
                i = {
                  uTime: { value: 0 },
                  uSpread: { value: 40 },
                  uRise: { value: 1 },
                  uTurbulence: { value: 1 },
                  uDiffusion: { value: 0.35 },
                  uSize: { value: 1.2 },
                  uVaporColor: { value: new s.Q1f(1, 1, 1) },
                },
                d = {
                  uPrevious: { value: null },
                  uResolution: { value: new s.I9Y(1, 1) },
                  uCanvas: l.uCanvas,
                  uFollow: { value: 1 },
                  uDrain: { value: 0 },
                  uFrom: { value: new s.I9Y() },
                  uTo: { value: new s.I9Y() },
                  uRadius: { value: 40 },
                  uAmount: { value: 0 },
                  uWind: { value: new s.I9Y() },
                },
                c = new s.BKk({
                  uniforms: d,
                  vertexShader: x,
                  fragmentShader: w,
                  depthTest: !1,
                  depthWrite: !1,
                }),
                m = new s.Z58(),
                v = new s.qUd(-1, 1, 1, -1, -10, 10),
                h = new s.bdM(1, 1),
                g = new s.LoY(),
                b = () => {
                  let e = {
                      uBounds: { value: new s.IUQ(0, 0, 1, 1) },
                      uOrigin: { value: new s.I9Y() },
                      uSweep: { value: 0 },
                      uPhase: { value: 0 },
                      uMode: { value: 1 },
                      uText: { value: null },
                    },
                    t = new s.BKk({
                      uniforms: { ...l, ...e },
                      vertexShader: y,
                      fragmentShader: S,
                      transparent: !0,
                      depthTest: !1,
                      depthWrite: !1,
                    }),
                    a = new s.BKk({
                      uniforms: { ...l, ...i, ...e },
                      vertexShader: C,
                      fragmentShader: M,
                      transparent: !0,
                      depthTest: !1,
                      depthWrite: !1,
                    }),
                    r = new s.eaF(h, t);
                  ((r.frustumCulled = !1), (r.visible = !1));
                  let n = new s.ONl(g, a);
                  return (
                    (n.frustumCulled = !1),
                    (n.renderOrder = 1),
                    (n.visible = !1),
                    m.add(r, n),
                    {
                      own: e,
                      text: r,
                      points: n,
                      textMaterial: t,
                      particleMaterial: a,
                      word: -1,
                      mode: 1,
                      elapsed: 0,
                      radial: !1,
                    }
                  );
                },
                A = [b(), b()],
                E = new s.Z58(),
                T = new s.eaF(new s.bdM(2, 2), c);
              ((T.frustumCulled = !1), E.add(T));
              let R = n.createElement("canvas");
              ((R.width = 1), (R.height = 1));
              let z = R.getContext("2d", { willReadFrequently: !0 }),
                B =
                  "undefined" != typeof Intl && "Segmenter" in Intl
                    ? new Intl.Segmenter(void 0, { granularity: "grapheme" })
                    : null,
                D = [],
                P = 0,
                W = [],
                I = "",
                q = "",
                L = 0,
                O = 0,
                H = 1,
                U = 16,
                Y = 0,
                N = !1,
                V = 0,
                $ = !1,
                _ = !1,
                X = !1,
                G = !1,
                K = 0,
                Q = 0,
                Z = 0,
                J = 0,
                ee = -1 / 0,
                et = !1,
                ea = -1,
                er = null,
                en = {
                  x: 0,
                  y: 0,
                  fromX: 0,
                  fromY: 0,
                  vx: 0,
                  vy: 0,
                  at: 0,
                  fresh: !0,
                  moved: !1,
                  over: !1,
                },
                eo = (e, t, a) => {
                  if (!z) return;
                  (z.clearRect(0, 0, 1, 1),
                    (z.fillStyle = t),
                    (z.fillStyle = e),
                    z.fillRect(0, 0, 1, 1));
                  let [r, n, o] = z.getImageData(0, 0, 1, 1).data;
                  a.setRGB(r / 255, n / 255, o / 255, s.er$);
                },
                el = () => {
                  let t = a.current,
                    r =
                      "currentColor" === t.color
                        ? getComputedStyle(e).color
                        : t.color,
                    n = "currentColor" === t.vaporColor ? r : t.vaporColor,
                    o = `${r}|${n}`;
                  return (
                    o !== q &&
                    ((q = o),
                    eo(r, "#ffffff", l.uColor.value),
                    eo(n, r, i.uVaporColor.value),
                    !0)
                  );
                },
                ei = (e, t) => {
                  let a = W[t];
                  if (((e.word = t), !a)) {
                    ((e.text.visible = !1), (e.points.visible = !1));
                    return;
                  }
                  ((e.own.uText.value = a.texture),
                    e.own.uBounds.value.set(...a.bounds),
                    e.text.position.set(a.center[0], a.center[1], 0),
                    e.text.scale.set(a.size[0], a.size[1], 1),
                    (e.text.visible = !0),
                    (e.points.geometry = a.geometry),
                    (e.points.visible = !0));
                },
                es = (e) => {
                  ((e.word = -1),
                    (e.text.visible = !1),
                    (e.points.visible = !1),
                    (e.points.geometry = g),
                    (e.own.uText.value = null));
                },
                eu = () => {
                  if (X) return !1;
                  let i = a.current,
                    u = t.getBoundingClientRect();
                  if (u.width < 1 || u.height < 1) return !1;
                  let c = getComputedStyle(e),
                    p = Math.min(
                      window.devicePixelRatio || 1,
                      Math.max(i.dpr, 0.5),
                    ),
                    m = Array.from(e.querySelectorAll("[data-vapor-word]")),
                    h = [
                      Math.round(4 * u.width),
                      Math.round(4 * u.height),
                      p,
                      Y,
                      c.fontStyle,
                      c.fontVariantCaps,
                      c.fontWeight,
                      c.fontSize,
                      c.fontFamily,
                      c.letterSpacing,
                      c.textTransform,
                      c.direction,
                      i.density,
                      i.align,
                      m.map((e) => e.textContent ?? "").join("\0"),
                    ].join("|");
                  if (h === I) return !1;
                  ((I = h), (H = p), (U = Number.parseFloat(c.fontSize) || 16));
                  let g = Math.max(2, 2 * Math.ceil((u.width * H) / 2)),
                    x = Math.max(2, 2 * Math.ceil((u.height * H) / 2));
                  ((L = g / H),
                    (O = x / H),
                    r.setSize(g, x, !1),
                    (o.style.width = `${L}px`),
                    (o.style.height = `${O}px`),
                    (v.left = -L / 2),
                    (v.right = L / 2),
                    (v.top = O / 2),
                    (v.bottom = -O / 2),
                    v.updateProjectionMatrix(),
                    l.uCanvas.value.set(L, O),
                    (l.uDpr.value = H),
                    (l.uEm.value = U));
                  let w = Math.max(8, Math.ceil(L / 6)),
                    b = Math.max(8, Math.ceil(O / 6));
                  for (let e of (D.forEach((e) => e.dispose()),
                  (D = [j(w, b), j(w, b)]),
                  d.uResolution.value.set(w, b),
                  D))
                    (r.setRenderTarget(e), r.clear());
                  (r.setRenderTarget(null),
                    (P = 0),
                    (l.uField.value = D[0].texture));
                  let y = [
                      c.fontStyle,
                      "small-caps" === c.fontVariantCaps ? "small-caps" : "",
                      c.fontWeight,
                      `${U}px`,
                      c.fontFamily,
                    ]
                      .filter(Boolean)
                      .join(" "),
                    S = Number.parseFloat(c.letterSpacing) || 0,
                    C = "rtl" === c.direction ? "rtl" : "ltr",
                    M = n.createRange();
                  return (
                    W.forEach(F),
                    (W = []),
                    m.forEach((e, t) => {
                      let r = ((e, t, r, o, l, i, u, d) => {
                        let c,
                          p = e.firstChild;
                        if (!p || p.nodeType !== Node.TEXT_NODE) return null;
                        let m = p.data,
                          v = B
                            ? Array.from(B.segment(m), (e) => e.segment)
                            : Array.from(m),
                          h = [],
                          g = 0;
                        for (let e of v) {
                          (d.setStart(p, g),
                            d.setEnd(p, g + e.length),
                            (g += e.length));
                          let t = d.getBoundingClientRect();
                          if (t.width <= 0 || t.height <= 0) continue;
                          let a = h[h.length - 1];
                          a && t.top < a.bottom - 0.5 * t.height
                            ? ((a.text += e),
                              (a.left = Math.min(a.left, t.left)),
                              (a.right = Math.max(a.right, t.right)),
                              (a.top = Math.min(a.top, t.top)),
                              (a.bottom = Math.max(a.bottom, t.bottom)))
                            : h.push({
                                top: t.top,
                                bottom: t.bottom,
                                left: t.left,
                                right: t.right,
                                text: e,
                              });
                        }
                        if (!h.length) return null;
                        let x = 0.3 * U,
                          w = Math.min(...h.map((e) => e.left)) - r.left - x,
                          b = Math.min(...h.map((e) => e.top)) - r.top - x,
                          y = Math.max(...h.map((e) => e.right)) - r.left + x,
                          S = Math.max(...h.map((e) => e.bottom)) - r.top + x,
                          C = Math.floor(w * H) / H,
                          M = Math.floor(b * H) / H,
                          j = Math.max(1, Math.ceil((y - C) * H)),
                          F = Math.max(1, Math.ceil((S - M) * H)),
                          A = n.createElement("canvas");
                        ((A.width = j), (A.height = F));
                        let E = A.getContext("2d", { willReadFrequently: !0 });
                        if (!E) return null;
                        for (let e of (E.setTransform(
                          H,
                          0,
                          0,
                          H,
                          -C * H,
                          -M * H,
                        ),
                        (E.font = o),
                        (E.fillStyle = "#ffffff"),
                        (E.textAlign = "left"),
                        (E.textBaseline = "alphabetic"),
                        (E.direction = u),
                        (E.letterSpacing = `${l}px`),
                        h)) {
                          let t = k(e.text.replace(/\s+$/u, ""), i);
                          if (!t) continue;
                          let a = E.measureText(t),
                            n = a.fontBoundingBoxAscent || 0.8 * U,
                            o = a.fontBoundingBoxDescent || 0.2 * U,
                            l = e.top + ((e.bottom - e.top) * n) / (n + o);
                          E.fillText(t, e.left - r.left, l - r.top);
                        }
                        let T = E.getImageData(0, 0, j, F).data,
                          R = 1 / Math.sqrt(f(a.current.density, 0.1, 4)),
                          z =
                            ((c = Math.imul(t + 1, 0x9e3779b1) >>> 0 || 1),
                            () => (
                              (c ^= c << 13),
                              (c ^= c >>> 17),
                              (c ^= c << 5),
                              (c >>>= 0) / 0x100000000
                            )),
                          D = [],
                          P = j / H,
                          W = F / H,
                          I = 1 / 0,
                          q = 1 / 0,
                          Y = -1 / 0,
                          N = -1 / 0;
                        for (let e = R / 2; e < W; e += R)
                          for (let t = R / 2; t < P; t += R) {
                            let a = t + (z() - 0.5) * R,
                              r = e + (z() - 0.5) * R,
                              n = Math.min(
                                j - 1,
                                Math.max(0, Math.floor(a * H)),
                              );
                            if (
                              T[
                                (Math.min(
                                  F - 1,
                                  Math.max(0, Math.floor(r * H)),
                                ) *
                                  j +
                                  n) *
                                  4 +
                                  3
                              ] < 96
                            )
                              continue;
                            let o = C + a - L / 2,
                              l = O / 2 - (M + r);
                            (D.push(o, l, 0),
                              (I = Math.min(I, o)),
                              (Y = Math.max(Y, o)),
                              (q = Math.min(q, l)),
                              (N = Math.max(N, l)));
                          }
                        let V = D.length / 3,
                          $ = new Float32Array(4 * V);
                        for (let e = 0; e < $.length; e++) $[e] = z();
                        let _ = new s.LoY();
                        (_.setAttribute("position", new s.qtW(D, 3)),
                          _.setAttribute("aSeed", new s.THS($, 4)));
                        let X = new s.GOR(A);
                        return (
                          (X.minFilter = s.k6q),
                          (X.magFilter = s.k6q),
                          (X.generateMipmaps = !1),
                          (X.colorSpace = s.jf0),
                          {
                            texture: X,
                            geometry: _,
                            center: [C + P / 2 - L / 2, O / 2 - (M + W / 2)],
                            size: [P, W],
                            bounds: V ? [I, q, Y, N] : [0, 0, 1, 1],
                          }
                        );
                      })(e, t, u, y, S, c.textTransform, C, M);
                      r && W.push(r);
                    }),
                    A.forEach((e, t) => {
                      e.word < 0 ||
                        (e.word < W.length
                          ? ei(e, e.word)
                          : t === V
                            ? ei(e, 0)
                            : es(e));
                    }),
                    !0
                  );
                },
                ed = () => {
                  G ||
                    X ||
                    !_ ||
                    !$ ||
                    K ||
                    (Q && (window.clearTimeout(Q), (Q = 0)),
                    (K = requestAnimationFrame(ep)));
                },
                ec = () => {
                  if ($ || !N || (!_ && a.current.startOnView)) return;
                  (($ = !0), (V = 0), es(A[1]));
                  let e = A[0];
                  (ei(e, 0),
                    (e.mode = +!!a.current.paused),
                    (e.elapsed = 0),
                    (e.radial = !1),
                    a.current.onWordChange?.(0));
                };
              function ep(e) {
                if (((K = 0), G || X || !W.length)) return;
                let t = a.current,
                  n = Z ? Math.max(0, (e - Z) / 1e3) : 0;
                Z = e;
                let o = Math.min(n, 0.1),
                  s = W.length,
                  u = !t.paused,
                  c = [
                    Math.max(t.condense, 0.05),
                    Math.max(t.hold, 0),
                    Math.max(t.dissolve, 0.05),
                  ],
                  h = c[2] * (1 - f(t.overlap, 0, 1)),
                  g = A[V],
                  x = t.pauseOnHover && t.interactive && en.over,
                  w = !t.loop && g.word >= s - 1 && !et && ea < 0;
                if (u) {
                  J += o;
                  let e = A[1 - V];
                  if (
                    (e.word >= 0 &&
                      ((e.elapsed += o), e.elapsed >= c[2] && es(e)),
                    1 === g.mode)
                  ) {
                    x || (g.elapsed += n);
                    let e = null !== er && t.clickAdvance && t.interactive;
                    ((e || et || ea >= 0 || (!w && g.elapsed >= c[1])) &&
                      ((g.mode = 2),
                      (g.elapsed = 0),
                      (g.radial = e),
                      er && e && g.own.uOrigin.value.set(er.x, er.y)),
                      (et = !1));
                  } else
                    0 === g.mode
                      ? ((g.elapsed += o),
                        g.elapsed >= c[0] &&
                          ((g.mode = 1), (g.elapsed = 0), (g.radial = !1)))
                      : (g.elapsed += o);
                  if (2 === g.mode && g.elapsed >= h) {
                    let e = ea >= 0 ? ea % s : (g.word + 1) % s;
                    ea = -1;
                    let a = A[1 - V];
                    (ei(a, e),
                      (a.mode = 0),
                      (a.elapsed = 0),
                      (a.radial = !1),
                      (V = 1 - V),
                      (g = a),
                      t.onWordChange?.(e));
                  }
                }
                er = null;
                let b = Math.max(t.recovery, 0.05),
                  y =
                    en.moved &&
                    u &&
                    t.interactive &&
                    t.breath > 0 &&
                    (() => {
                      let e = W[A[V].word];
                      if (!e) return !1;
                      let t = Math.max(a.current.breathRadius, 0.05) * U * 1.5,
                        [r, n, o, l] = e.bounds;
                      for (let e = 0; e <= 6; e++) {
                        let a = e / 6,
                          i = en.fromX + (en.x - en.fromX) * a,
                          s = en.fromY + (en.y - en.fromY) * a;
                        if (
                          Math.max(r - i, 0, i - o) +
                            Math.max(n - s, 0, s - l) <
                          t
                        )
                          return !0;
                      }
                      return !1;
                    })(),
                  S = e - ee < (b + 1) * 1e3;
                if ((y || S) && 2 === D.length) {
                  let a = Math.hypot(en.vx, en.vy),
                    n = y ? f(a / 1600, 0, 1) : 0,
                    i = a > 1 ? Math.min(a / 1200, 1) / a : 0;
                  ((d.uPrevious.value = D[P].texture),
                    (d.uFollow.value = 1 - Math.exp(-o / 0.14)),
                    (d.uDrain.value = o / b),
                    d.uFrom.value.set(en.fromX, en.fromY),
                    d.uTo.value.set(en.x, en.y),
                    (d.uRadius.value = Math.max(t.breathRadius, 0.05) * U),
                    (d.uAmount.value = n),
                    d.uWind.value.set(en.vx * i, en.vy * i),
                    r.setRenderTarget(D[1 - P]),
                    r.render(E, v),
                    r.setRenderTarget(null),
                    (P = 1 - P),
                    (l.uField.value = D[P].texture),
                    y && n > 0.02 && (ee = e));
                }
                ((en.fromX = en.x), (en.fromY = en.y), (en.moved = !1));
                let C = Math.max(0, p.indexOf(t.sweep));
                for (let e of A)
                  ((e.own.uMode.value = e.mode),
                    (e.own.uPhase.value =
                      1 === e.mode ? 0 : Math.min(e.elapsed / c[e.mode], 1)),
                    (e.own.uSweep.value = e.radial ? 5 : C));
                if (
                  ((l.uStagger.value = f(t.stagger, 0, 4)),
                  (l.uGrain.value = Math.max(t.grain, 0.05) * U * 0.035),
                  (l.uBreath.value = t.interactive ? f(t.breath, 0, 3) : 0),
                  (i.uTime.value = J),
                  (i.uSpread.value = Math.max(t.spread, 0) * U),
                  (i.uRise.value = f(t.rise, -3, 3)),
                  (i.uTurbulence.value = f(t.turbulence, 0, 4)),
                  (i.uDiffusion.value = f(t.diffusion, 0, 4)),
                  (i.uSize.value = f(t.particleSize, 0.25, 8)),
                  r.render(m, v),
                  u &&
                    (1 !== g.mode ||
                      A[1 - V].word >= 0 ||
                      e - ee < (b + 1) * 1e3 ||
                      et ||
                      ea >= 0))
                )
                  ed();
                else if (u && 1 === g.mode && !w && !x && _) {
                  let e = Math.max(c[1] - g.elapsed, 0);
                  Q = window.setTimeout(
                    () => {
                      ((Q = 0), ed());
                    },
                    1e3 * e + 16,
                  );
                }
              }
              let ef = (e) => {
                  let t = o.getBoundingClientRect();
                  return {
                    x: e.clientX - t.left - L / 2,
                    y: t.top + O / 2 - e.clientY,
                  };
                },
                em = (t) => {
                  let a = e.getBoundingClientRect();
                  return (
                    t.clientX >= a.left &&
                    t.clientX <= a.right &&
                    t.clientY >= a.top &&
                    t.clientY <= a.bottom
                  );
                },
                ev = (e) => {
                  if ("touch" === e.pointerType) return;
                  let t = em(e);
                  (en.over && !t && (Z = 0), (en.over = t));
                  let a = ef(e),
                    r = e.timeStamp;
                  if (en.fresh) {
                    ((en.fresh = !1),
                      (en.x = a.x),
                      (en.y = a.y),
                      (en.fromX = a.x),
                      (en.fromY = a.y),
                      (en.vx = 0),
                      (en.vy = 0),
                      (en.at = r));
                    return;
                  }
                  let n = Math.max((r - en.at) / 1e3, 0.002),
                    o = Math.min(1, n / 0.03);
                  ((en.vx += ((a.x - en.x) / n - en.vx) * o),
                    (en.vy += ((a.y - en.y) / n - en.vy) * o),
                    (en.x = a.x),
                    (en.y = a.y),
                    (en.at = r),
                    (en.moved = !0),
                    ed());
                },
                eh = () => {
                  (en.over && (Z = 0),
                    (en.fresh = !0),
                    (en.over = !1),
                    (en.vx = 0),
                    (en.vy = 0),
                    ed());
                },
                eg = (e) => {
                  let t = a.current;
                  !t.clickAdvance ||
                    !t.interactive ||
                    e.button > 0 ||
                    (em(e) && ((er = ef(e)), ed()));
                },
                ex = [],
                ew = null,
                eb = () => {
                  for (let [e, t, a] of ex) e.removeEventListener(t, a);
                  ex = [];
                },
                ey = () => {
                  let t = a.current.area;
                  if (t === ew) return;
                  (eb(), (ew = t));
                  let r =
                      "window" === t
                        ? n
                        : "self" === t
                          ? e
                          : (e.parentElement ?? e),
                    o = "window" === t ? n.documentElement : r;
                  for (let [e, t, a] of (ex = [
                    [r, "pointermove", ev],
                    [r, "pointerdown", eg],
                    [o, "pointerleave", eh],
                    [r, "pointercancel", eh],
                  ]))
                    e.addEventListener(t, a, { passive: !0 });
                },
                eS = () => {
                  ((N = !0), (Y += 1), eu(), ec(), ed());
                },
                eC = new ResizeObserver(() => {
                  eu() && ed();
                });
              eC.observe(e);
              let eM = new MutationObserver(() => {
                el() && ed();
              });
              eM.observe(n.documentElement, {
                attributes: !0,
                attributeFilter: ["class", "style", "data-theme"],
              });
              let ek =
                  "undefined" == typeof IntersectionObserver
                    ? null
                    : new IntersectionObserver(
                        ([e]) => {
                          (_ = e.isIntersecting)
                            ? (ec(), (Z = 0), ed())
                            : K && (cancelAnimationFrame(K), (K = 0));
                        },
                        { rootMargin: "60px" },
                      ),
                ej = (e) => {
                  (e.preventDefault(),
                    (X = !0),
                    K && cancelAnimationFrame(K),
                    (K = 0));
                },
                eF = () => {
                  ((X = !1), (I = ""), (q = ""), el(), eu(), ed());
                };
              (o.addEventListener("webglcontextlost", ej),
                o.addEventListener("webglcontextrestored", eF),
                el(),
                ey(),
                eu());
              let eA = n.fonts;
              return (
                eA
                  ? (eA.addEventListener("loadingdone", eS),
                    eA.ready.then(() => {
                      G || eS();
                    }))
                  : (N = !0),
                ek ? ek.observe(e) : ((_ = !0), ec()),
                {
                  sync: () => {
                    (ey(), el(), eu(), ec(), ed());
                  },
                  next: () => {
                    ((et = !0), ed());
                  },
                  replay: () => {
                    ((ea = 0), ed());
                  },
                  destroy: () => {
                    for (let e of ((G = !0),
                    K && cancelAnimationFrame(K),
                    Q && window.clearTimeout(Q),
                    ek?.disconnect(),
                    eC.disconnect(),
                    eM.disconnect(),
                    eb(),
                    eA?.removeEventListener("loadingdone", eS),
                    o.removeEventListener("webglcontextlost", ej),
                    o.removeEventListener("webglcontextrestored", eF),
                    W.forEach(F),
                    (W = []),
                    D.forEach((e) => e.dispose()),
                    h.dispose(),
                    g.dispose(),
                    T.geometry.dispose(),
                    A))
                      (e.textMaterial.dispose(), e.particleMaterial.dispose());
                    (c.dispose(),
                      r.dispose(),
                      r.getContext().isContextLost() || r.forceContextLoss(),
                      o.remove());
                  },
                }
              );
            })(e, t, eu);
            if (!a) {
              let e = requestAnimationFrame(() => eo(!0));
              return () => cancelAnimationFrame(e);
            }
            return (
              (ea.current = a),
              () => {
                (a.destroy(), (ea.current = null));
              }
            );
          }, [el]),
          (0, n.useImperativeHandle)(
            J,
            () => ({
              next: () => ea.current?.next(),
              replay: () => ea.current?.replay(),
            }),
            [],
          ));
        let ed = Math.max(A, 0) + 0.35;
        return (0, r.jsxs)(t, {
          ref: ee,
          className: (0, d.cn)("relative inline-block", Q),
          style: Z,
          children: [
            (0, r.jsx)("span", { style: h, children: ei.join(", ") }),
            (0, r.jsx)("span", {
              "aria-hidden": "true",
              style: g,
              children: ei.map((e, t) =>
                (0, r.jsx)(
                  "span",
                  {
                    "data-vapor-word": "",
                    style: {
                      gridArea: "1 / 1",
                      justifySelf: a,
                      alignSelf: "center",
                      textAlign: a,
                      color: el && 0 === t ? void 0 : "transparent",
                      visibility: el && t > 0 ? "hidden" : void 0,
                    },
                    children: e,
                  },
                  `${t}:${e}`,
                ),
              ),
            }),
            el
              ? null
              : (0, r.jsx)("span", {
                  ref: et,
                  "aria-hidden": "true",
                  style: {
                    position: "absolute",
                    inset: `${-ed}em`,
                    display: "block",
                    pointerEvents: "none",
                  },
                }),
          ],
        });
      }),
      E = {
        mist: {
          vapor: { dark: "#B19EEF", light: "#5227FF" },
          sweep: "left",
          spread: 1.2,
          rise: 1,
          turbulence: 0.8,
          diffusion: 0.35,
          stagger: 0.8,
          particleSize: 1.2,
        },
        steam: {
          vapor: { dark: "#E8E3FF", light: "#6B5BA8" },
          sweep: "top",
          spread: 1.7,
          rise: 2,
          turbulence: 1.2,
          diffusion: 0.25,
          stagger: 0.6,
          particleSize: 1.1,
        },
        dust: {
          vapor: { dark: "#A3A3A3", light: "#737373" },
          sweep: "scatter",
          spread: 1.5,
          rise: 0,
          turbulence: 0.3,
          diffusion: 1.4,
          stagger: 0.4,
          particleSize: 1,
        },
        bloom: {
          vapor: { dark: "#FF9FFC", light: "#D6249F" },
          sweep: "center",
          spread: 1.3,
          rise: 0.8,
          turbulence: 1,
          diffusion: 0.45,
          stagger: 0.9,
          particleSize: 1.3,
        },
        frost: {
          vapor: { dark: "#9FD8FF", light: "#2B7FC4" },
          sweep: "right",
          spread: 1.1,
          rise: -0.5,
          turbulence: 0.5,
          diffusion: 0.5,
          stagger: 0.8,
          particleSize: 1.1,
        },
        ink: {
          vapor: { dark: "currentColor", light: "currentColor" },
          sweep: "left",
          spread: 1,
          rise: 0.6,
          turbulence: 0.6,
          diffusion: 0.2,
          stagger: 0.8,
          particleSize: 1.2,
        },
      },
      T = [
        { label: "Mist", value: "mist" },
        { label: "Steam", value: "steam" },
        { label: "Dust", value: "dust" },
        { label: "Bloom", value: "bloom" },
        { label: "Frost", value: "frost" },
        { label: "Ink", value: "ink" },
      ],
      R = [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
        { label: "Center", value: "center" },
        { label: "Top", value: "top" },
        { label: "Scatter", value: "scatter" },
      ],
      z = [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
      ],
      B = [
        { label: "Parent", value: "parent" },
        { label: "Self", value: "self" },
        { label: "Window", value: "window" },
      ],
      D = [
        { label: "Semibold", value: "600" },
        { label: "Bold", value: "700" },
        { label: "Black", value: "800" },
      ],
      P = [
        {
          name: "words",
          type: "string[]",
          default: '["Imagine", "Create", "Inspire"]',
          description:
            "Words or short phrases to cycle through. Each one condenses in place of the last.",
        },
        {
          name: "as",
          type: '"span" | "div" | "p" | "h1" | … | "h6"',
          default: '"span"',
          description:
            "Element to render. The component inherits font, size and weight from its parent and reserves room for the longest word.",
        },
        {
          name: "align",
          type: '"start" | "center" | "end"',
          default: '"center"',
          description:
            "How shorter words sit inside the space reserved for the longest one.",
        },
        {
          name: "color",
          type: "string",
          default: '"currentColor"',
          description:
            "Colour of the lettering. Defaults to the surrounding text colour.",
        },
        {
          name: "vaporColor",
          type: "string",
          default: '"#B19EEF"',
          description:
            'Colour the particles fade to as they drift away from the letters. Pass "currentColor" for monochrome vapour.',
        },
        {
          name: "density",
          type: "number",
          default: "1",
          description:
            "Particles per square pixel of lettering. Higher values give finer, denser vapour.",
        },
        {
          name: "particleSize",
          type: "number",
          default: "1.2",
          description: "Size of each particle in CSS pixels.",
        },
        {
          name: "spread",
          type: "number",
          default: "1.2",
          description:
            "How far the vapour travels before it fades, in multiples of the font size.",
        },
        {
          name: "rise",
          type: "number",
          default: "1",
          description:
            "Upward drift of the vapour. Negative values let it sink like cold air.",
        },
        {
          name: "turbulence",
          type: "number",
          default: "0.8",
          description:
            "How strongly the air currents curl the vapour into wisps.",
        },
        {
          name: "diffusion",
          type: "number",
          default: "0.35",
          description:
            "How much individual particles scatter away from the wisps. Higher values read as dust.",
        },
        {
          name: "grain",
          type: "number",
          default: "1",
          description:
            "Size of the clumps the letters break into as they evaporate.",
        },
        {
          name: "sweep",
          type: '"left" | "right" | "center" | "top" | "scatter"',
          default: '"left"',
          description:
            "Where the evaporation starts and the next word lands first. Scatter breaks the word up in patches.",
        },
        {
          name: "stagger",
          type: "number",
          default: "0.8",
          description:
            "How spread out the sweep is. 0 transforms the whole word at once.",
        },
        {
          name: "condense",
          type: "number",
          default: "1.8",
          description: "Seconds a word takes to condense out of the vapour.",
        },
        {
          name: "hold",
          type: "number",
          default: "2.4",
          description: "Seconds each word stays fully formed.",
        },
        {
          name: "dissolve",
          type: "number",
          default: "2",
          description: "Seconds a word takes to evaporate.",
        },
        {
          name: "overlap",
          type: "number",
          default: "0.6",
          description:
            "How early the next word starts condensing, as a fraction of the dissolve. 0 waits for the vapour to clear.",
        },
        {
          name: "loop",
          type: "boolean",
          default: "true",
          description: "Keep cycling. When false the last word stays in place.",
        },
        {
          name: "startOnView",
          type: "boolean",
          default: "true",
          description:
            "Wait until the text scrolls into view before the first word condenses.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Let the pointer blow the letters into vapour as it passes. Touch scrolling is ignored.",
        },
        {
          name: "breath",
          type: "number",
          default: "1",
          description:
            "How strongly the pointer evaporates the letters. Faster movement blows harder.",
        },
        {
          name: "breathRadius",
          type: "number",
          default: "0.8",
          description: "Reach of the pointer, in multiples of the font size.",
        },
        {
          name: "recovery",
          type: "number",
          default: "1.2",
          description: "Seconds blown letters take to settle back into place.",
        },
        {
          name: "clickAdvance",
          type: "boolean",
          default: "true",
          description:
            "Clicking the text evaporates the word outward from the click and brings in the next one.",
        },
        {
          name: "pauseOnHover",
          type: "boolean",
          default: "true",
          description:
            "Keep the current word in place while the pointer rests on it, so it can be played with.",
        },
        {
          name: "area",
          type: '"parent" | "self" | "window"',
          default: '"parent"',
          description:
            "Where the pointer is followed: over the parent element, only over the text, or anywhere.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Freezes the animation. Reduced-motion users always see the first word as plain text.",
        },
        {
          name: "dpr",
          type: "number",
          default: "2",
          description: "Maximum device pixel ratio for the canvas.",
        },
        {
          name: "onWordChange",
          type: "(index: number) => void",
          default: "—",
          description:
            "Called when a word starts condensing, with its index in words.",
        },
        {
          name: "ref",
          type: "{ next, replay }",
          default: "—",
          description:
            "Imperative controls: evaporate the current word now, or return to the first word.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element, for example font size and weight.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      W = () => {
        let [e, t] = (0, i.I)(),
          a = (0, l.Y)(),
          [s, u] = (0, n.useState)(null),
          [d, c] = (0, n.useState)(null),
          p = s ?? ("dark" === a ? "#FFFFFF" : "#0A0A0A"),
          [f, m] = (0, n.useState)("mist"),
          [v, h] = (0, n.useState)(E.mist),
          g = (e) => (t) => h((a) => ({ ...a, [e]: t })),
          x = d ?? v.vapor[a],
          [w, b] = (0, n.useState)("Imagine, Create, Inspire"),
          [y, S] = (0, n.useState)(112),
          [C, M] = (0, n.useState)("700"),
          [k, j] = (0, n.useState)("center"),
          [F, W] = (0, n.useState)("parent"),
          [I, q] = (0, n.useState)(1),
          [L, O] = (0, n.useState)(1),
          [H, U] = (0, n.useState)(1.8),
          [Y, N] = (0, n.useState)(2.4),
          [V, $] = (0, n.useState)(2),
          [_, X] = (0, n.useState)(0.6),
          [G, K] = (0, n.useState)(1),
          [Q, Z] = (0, n.useState)(0.8),
          [J, ee] = (0, n.useState)(1.2),
          [et, ea] = (0, n.useState)(!0),
          [er, en] = (0, n.useState)(!0),
          [eo, el] = (0, n.useState)(!0),
          [ei, es] = (0, n.useState)(!0),
          [eu, ed] = (0, n.useState)(!0),
          [ec, ep] = (0, n.useState)(!1),
          [ef, em] = (0, n.useState)(!1),
          ev = w
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(o.Bg, {}),
            (0, r.jsxs)(o.VX, {
              children: [
                (0, r.jsxs)(o.Ec, {
                  children: [
                    (0, r.jsx)(o.Ch, {
                      onRefresh: t,
                      minHeight: 500,
                      enableResponsive: !0,
                      children: (0, r.jsx)("div", {
                        className:
                          "flex h-full w-full items-center justify-center overflow-hidden px-6 py-16 text-center sm:px-10",
                        children: (0, r.jsx)(
                          A,
                          {
                            as: "h2",
                            words: ev,
                            align: k,
                            color: p,
                            vaporColor: x,
                            density: I,
                            particleSize: v.particleSize,
                            spread: v.spread,
                            rise: v.rise,
                            turbulence: v.turbulence,
                            diffusion: v.diffusion,
                            grain: L,
                            sweep: v.sweep,
                            stagger: v.stagger,
                            condense: H,
                            hold: Y,
                            dissolve: V,
                            overlap: _,
                            loop: et,
                            startOnView: er,
                            interactive: eo,
                            breath: G,
                            breathRadius: Q,
                            recovery: J,
                            clickAdvance: ei,
                            pauseOnHover: eu,
                            area: F,
                            paused: ef,
                            style: {
                              fontSize: `min(${y}px, 14vw)`,
                              fontWeight: Number(C),
                              letterSpacing: "-0.035em",
                              lineHeight: 1.05,
                              textTransform: ec ? "uppercase" : void 0,
                            },
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(o.IH, {
                      children: [
                        (0, r.jsx)(o.bg, {
                          title: "Preset",
                          value: f,
                          options: T,
                          onChange: (e) => {
                            (m(e), h(E[e] ?? E.mist), c(null));
                          },
                        }),
                        (0, r.jsx)(o.UD, {
                          title: "Words",
                          value: w,
                          onChange: b,
                        }),
                        (0, r.jsx)(o.W7, {
                          title: "Color",
                          value: p,
                          onChange: u,
                        }),
                        (0, r.jsx)(o.W7, {
                          title: "Vapor",
                          value: "currentColor" === x ? p : x,
                          onChange: c,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Font Size",
                          min: 32,
                          max: 180,
                          step: 1,
                          value: y,
                          valueUnit: "px",
                          onChange: S,
                        }),
                        (0, r.jsx)(o.bg, {
                          title: "Weight",
                          value: C,
                          options: D,
                          onChange: M,
                        }),
                        (0, r.jsx)(o.bg, {
                          title: "Sweep",
                          value: v.sweep,
                          options: R,
                          onChange: (e) => g("sweep")(e),
                        }),
                        (0, r.jsx)(o.bg, {
                          title: "Align",
                          value: k,
                          options: z,
                          onChange: (e) => j(e),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Density",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: I,
                          onChange: q,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Particle Size",
                          min: 0.5,
                          max: 3,
                          step: 0.05,
                          value: v.particleSize,
                          valueUnit: "px",
                          onChange: g("particleSize"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Spread",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: v.spread,
                          onChange: g("spread"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Rise",
                          min: -2,
                          max: 3,
                          step: 0.05,
                          value: v.rise,
                          onChange: g("rise"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Turbulence",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: v.turbulence,
                          onChange: g("turbulence"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Diffusion",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: v.diffusion,
                          onChange: g("diffusion"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Grain",
                          min: 0.2,
                          max: 4,
                          step: 0.05,
                          value: L,
                          onChange: O,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Stagger",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: v.stagger,
                          onChange: g("stagger"),
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Condense",
                          min: 0.3,
                          max: 5,
                          step: 0.1,
                          value: H,
                          valueUnit: "s",
                          onChange: U,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Hold",
                          min: 0,
                          max: 8,
                          step: 0.1,
                          value: Y,
                          valueUnit: "s",
                          onChange: N,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Dissolve",
                          min: 0.3,
                          max: 5,
                          step: 0.1,
                          value: V,
                          valueUnit: "s",
                          onChange: $,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Overlap",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: _,
                          onChange: X,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Breath",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: G,
                          onChange: K,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Breath Radius",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: Q,
                          onChange: Z,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Recovery",
                          min: 0.2,
                          max: 5,
                          step: 0.1,
                          value: J,
                          valueUnit: "s",
                          onChange: ee,
                        }),
                        (0, r.jsx)(o.bg, {
                          title: "Area",
                          value: F,
                          options: B,
                          onChange: (e) => W(e),
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Loop",
                          checked: et,
                          onChange: ea,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Start On View",
                          checked: er,
                          onChange: en,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Interactive",
                          checked: eo,
                          onChange: el,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Click Advance",
                          checked: ei,
                          onChange: es,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Pause On Hover",
                          checked: eu,
                          onChange: ed,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Uppercase",
                          checked: ec,
                          onChange: ep,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Paused",
                          checked: ef,
                          onChange: em,
                        }),
                      ],
                    }),
                    (0, r.jsx)(o.Ub, { data: P }),
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
