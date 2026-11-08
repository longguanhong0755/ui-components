/* ReactBits Pro public preview module 5450 for glowing-wave.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/5450.93211fa547cb8009.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  5450: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => w }));
    var l = a(95155),
      n = a(12115),
      r = a(30701),
      i = a(56388),
      u = a(90761),
      o = a(81712),
      s = a(3907),
      c = a(2253),
      p = a(90650);
    let d = `
varying vec2 vPlane;

void main() {
  vPlane = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,
      f = `
precision highp float;

varying vec2 vPlane;

uniform vec2 uCanvas;
uniform float uClock;
uniform float uSwell;
uniform float uSwellFreq;
uniform float uRipple;
uniform float uRippleFreq;
uniform float uChop;
uniform float uChopScale;
uniform float uWaterline;
uniform float uEdgeSoft;
uniform float uDepth;
uniform float uGlow;
uniform float uGlowWidth;
uniform float uHalo;
uniform float uHaloWidth;
uniform float uRichness;
uniform float uColorFreq;
uniform float uSaturation;
uniform float uSpread;
uniform float uSwirl;
uniform float uSwirlScale;
uniform float uGrain;
uniform float uGrainSize;
uniform vec3 uInk;
uniform vec3 uHot;
uniform vec3 uBackdrop;
uniform float uBackdropAlpha;
uniform float uOpacity;
uniform float uLift;
uniform float uReach;
uniform float uPointerX;

float spark(vec2 seed) {
  return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 toHsv(vec3 tone) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 a = mix(vec4(tone.bg, K.wz), vec4(tone.gb, K.xy), step(tone.b, tone.g));
  vec4 b = mix(vec4(a.xyw, tone.r), vec4(tone.r, a.yzx), step(a.x, tone.r));
  float span = b.x - min(b.w, b.y);
  return vec3(abs(b.z + (b.w - b.y) / (6.0 * span + 1e-10)),
              span / (b.x + 1e-10), b.x);
}

vec3 toRgb(vec3 hsv) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 wedge = abs(fract(hsv.xxx + K.xyz) * 6.0 - K.www);
  return hsv.z * mix(K.xxx, clamp(wedge - K.xxx, 0.0, 1.0), hsv.y);
}

float drape(vec2 seed) {
  vec2 cell = floor(seed);
  vec2 slice = fract(seed);
  vec2 ease = slice * slice * (3.0 - 2.0 * slice);
  float a = spark(cell);
  float b = spark(cell + vec2(1.0, 0.0));
  float c = spark(cell + vec2(0.0, 1.0));
  float d = spark(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, ease.x), mix(c, d, ease.x), ease.y);
}

void main() {
  float aspect = uCanvas.x / max(uCanvas.y, 1.0);
  vec2 p = vPlane - 0.5;
  p.x *= aspect;

  float t = uClock;

  float crest = sin(p.x * uSwellFreq + t) * uSwell;
  crest += sin(p.x * uRippleFreq - t * 0.7) * uRipple;
  crest += (drape(p * uChopScale + t * 0.5) - 0.5) * 2.0 * uChop;
  crest += uWaterline;

  float span = max(uReach, 0.001);
  crest += exp(-pow((p.x - uPointerX) / span, 2.0)) * uLift;

  float rift = p.y - crest;

  float soft = max(uEdgeSoft, 0.0005);
  float body = smoothstep(soft, -soft, rift);
  vec3 base = mix(uInk, uHot, smoothstep(-max(uDepth, 0.001), 0.0, rift));

  float bend = (drape(p * uSwirlScale + t * 0.2) - 0.5) * 2.0 * uSwirl;
  float band = rift * uColorFreq + t * 0.5 + bend;
  float sweep = sin(band);
  float lift = 0.5 + 0.5 * sin(band * 0.5 + t * 0.3);

  vec3 hsv = toHsv(uHot);
  hsv.x = fract(hsv.x + sweep * uSpread);
  hsv.y = clamp(hsv.y * uSaturation, 0.0, 1.0);
  hsv.z = clamp(hsv.z * (0.6 + 0.55 * lift), 0.0, 1.0);
  vec3 rich = toRgb(hsv);
  vec3 skin = mix(base, rich, clamp(uRichness, 0.0, 1.0));

  float edge = abs(rift);
  float rim = (1.0 - smoothstep(0.0, max(uGlowWidth, 0.0005), edge)) * uGlow;
  float mist = (1.0 - smoothstep(0.0, max(uHaloWidth, 0.0005), edge)) * uGlow *
               uHalo;

  float cover = clamp(body + rim + mist, 0.0, 1.0);
  vec3 lit = skin * body + rich * (rim + mist);

  vec2 cell = floor(vPlane * uCanvas / max(uGrainSize, 1.0));
  float speck = spark(cell + floor(uClock * 24.0)) - 0.5;
  lit += speck * uGrain * cover;
  lit = max(lit, vec3(0.0));

  float rest = uBackdropAlpha * (1.0 - cover);
  gl_FragColor = vec4(lit + uBackdrop * rest, cover + rest) * uOpacity;
}
`,
      h = (e) => {
        let t = window.matchMedia("(min-resolution: 2dppx)");
        return (
          t.addEventListener("change", e),
          window.addEventListener("resize", e),
          () => {
            (t.removeEventListener("change", e),
              window.removeEventListener("resize", e));
          }
        );
      },
      m = () => window.devicePixelRatio || 1,
      v = ({
        speed: e,
        swell: t,
        swellFrequency: a,
        ripple: r,
        rippleFrequency: i,
        chop: u,
        chopScale: s,
        waterline: p,
        edgeSoftness: h,
        depth: m,
        glow: v,
        glowWidth: x,
        halo: g,
        haloWidth: w,
        richness: y,
        colorFrequency: S,
        saturation: b,
        spread: C,
        swirl: j,
        swirlScale: k,
        grain: R,
        grainSize: F,
        color: H,
        hotColor: W,
        backgroundColor: q,
        opacity: P,
        cursorInteraction: E,
        cursorLift: G,
        cursorReach: z,
        paused: I,
        adaptiveQuality: L,
        targetFps: M,
        readPointer: N,
      }) => {
        let B = (0, n.useRef)(null),
          D = (0, n.useRef)(0),
          K = (0, n.useRef)({ x: 0, lift: 0 }),
          O = (0, n.useRef)({ frames: 0, span: 0, wins: 0 }),
          { gl: T, size: X } = (0, o.C)(),
          _ = (0, n.useMemo)(
            () => ({
              uCanvas: { value: new c.I9Y(1, 1) },
              uClock: { value: 0 },
              uSwell: { value: 0.15 },
              uSwellFreq: { value: 3 },
              uRipple: { value: 0.08 },
              uRippleFreq: { value: 6 },
              uChop: { value: 0.04 },
              uChopScale: { value: 2 },
              uWaterline: { value: 0 },
              uEdgeSoft: { value: 0.1 },
              uDepth: { value: 0.6 },
              uGlow: { value: 0.6 },
              uGlowWidth: { value: 0.05 },
              uHalo: { value: 0.35 },
              uHaloWidth: { value: 0.2 },
              uRichness: { value: 0.35 },
              uColorFreq: { value: 2 },
              uSaturation: { value: 0.9 },
              uSpread: { value: 0.04 },
              uSwirl: { value: 1 },
              uSwirlScale: { value: 1.5 },
              uGrain: { value: 0.05 },
              uGrainSize: { value: 2 },
              uInk: { value: new c.Q1f("#0d2666") },
              uHot: { value: new c.Q1f("#ff6633") },
              uBackdrop: { value: new c.Q1f("#0a0a0a") },
              uBackdropAlpha: { value: 1 },
              uOpacity: { value: 1 },
              uLift: { value: 0 },
              uReach: { value: 0.25 },
              uPointerX: { value: 0 },
            }),
            [],
          );
        return (
          (0, n.useEffect)(() => {
            let e = B.current;
            if (!e) return;
            (e.uniforms.uInk.value.set(H), e.uniforms.uHot.value.set(W));
            let t = "transparent" === q || "none" === q || "" === q;
            ((e.uniforms.uBackdropAlpha.value = +!t),
              t || e.uniforms.uBackdrop.value.set(q));
          }, [H, W, q]),
          (0, o.D)((l, n) => {
            let o = B.current;
            if (!o) return;
            let c = Math.min(n, 0.05);
            I || (D.current += c * e);
            let d = T.getPixelRatio(),
              f = o.uniforms;
            (f.uCanvas.value.set(X.width * d, X.height * d),
              (f.uClock.value = D.current),
              (f.uSwell.value = t),
              (f.uSwellFreq.value = a),
              (f.uRipple.value = r),
              (f.uRippleFreq.value = i),
              (f.uChop.value = u),
              (f.uChopScale.value = s),
              (f.uWaterline.value = p),
              (f.uEdgeSoft.value = h),
              (f.uDepth.value = m),
              (f.uGlow.value = v),
              (f.uGlowWidth.value = x),
              (f.uHalo.value = g),
              (f.uHaloWidth.value = w),
              (f.uRichness.value = y),
              (f.uColorFreq.value = S),
              (f.uSaturation.value = b),
              (f.uSpread.value = C),
              (f.uSwirl.value = j),
              (f.uSwirlScale.value = k),
              (f.uGrain.value = R),
              (f.uGrainSize.value = Math.max(F, 1) * d),
              (f.uOpacity.value = P),
              (f.uReach.value = z));
            let H = N(),
              W = E && H.active ? G : 0,
              q = 1 - Math.exp(-(7 * c));
            if (
              ((K.current.x += (H.x - K.current.x) * q),
              (K.current.lift += (W - K.current.lift) * q),
              (f.uPointerX.value = K.current.x),
              (f.uLift.value = K.current.lift),
              !L)
            )
              return;
            let _ = O.current;
            if (((_.frames += 1), (_.span += n), _.span < 0.75)) return;
            let A = _.frames / _.span;
            ((_.frames = 0), (_.span = 0));
            let Q = Math.min(window.devicePixelRatio || 1, 2);
            A < 0.85 * M && d > 0.75
              ? ((_.wins = 0), T.setPixelRatio(Math.max(0.75, 0.75 * d)))
              : A > 0.98 * M && d < Q
                ? ((_.wins += 1),
                  _.wins >= 3 &&
                    ((_.wins = 0), T.setPixelRatio(Math.min(Q, 1.25 * d))))
                : (_.wins = 0);
          }),
          (0, l.jsxs)("mesh", {
            frustumCulled: !1,
            children: [
              (0, l.jsx)("planeGeometry", { args: [1, 1] }),
              (0, l.jsx)("shaderMaterial", {
                ref: B,
                vertexShader: d,
                fragmentShader: f,
                uniforms: _,
                transparent: !0,
                depthTest: !1,
                depthWrite: !1,
                premultipliedAlpha: !0,
              }),
            ],
          })
        );
      },
      x = ({
        speed: e = 1,
        swell: t = 0.15,
        swellFrequency: a = 3,
        ripple: r = 0.08,
        rippleFrequency: i = 6,
        chop: u = 0.04,
        chopScale: o = 2,
        waterline: c = 0,
        edgeSoftness: d = 0.1,
        depth: f = 0.6,
        glow: x = 0.6,
        glowWidth: g = 0.05,
        halo: w = 0.35,
        haloWidth: y = 0.2,
        richness: S = 0.35,
        colorFrequency: b = 2,
        saturation: C = 0.9,
        spread: j = 0.04,
        swirl: k = 1,
        swirlScale: R = 1.5,
        grain: F = 0.05,
        grainSize: H = 2,
        color: W = "#0f172a",
        hotColor: q = "#c7d2fe",
        backgroundColor: P = "#0a0a0a",
        opacity: E = 1,
        cursorInteraction: G = !0,
        cursorLift: z = 0.12,
        cursorReach: I = 0.25,
        paused: L = !1,
        adaptiveQuality: M = !0,
        targetFps: N = 60,
        dpr: B = 2,
        className: D,
        children: K,
      }) => {
        let O = (0, n.useRef)(null),
          T = (0, n.useRef)({ x: 0, active: !1 }),
          [X, _] = (0, n.useState)(!0),
          A = Math.min(
            (0, n.useSyncExternalStore)(h, m, () => 1),
            Math.max(B, 0.5),
          ),
          Q = (0, n.useCallback)(() => T.current, []);
        return (
          (0, n.useEffect)(() => {
            let e = O.current;
            if (!e || "undefined" == typeof IntersectionObserver) return;
            let t = new IntersectionObserver(([e]) => _(e.isIntersecting), {
              threshold: 0,
            });
            return (t.observe(e), () => t.disconnect());
          }, []),
          (0, n.useEffect)(() => {
            let e = O.current;
            if (!e || !G) return;
            let t = (t) => {
                let a = e.getBoundingClientRect();
                if (!a.width || !a.height) return;
                let l = a.width / a.height;
                ((T.current.x =
                  (Math.min(1, Math.max(0, (t.clientX - a.left) / a.width)) -
                    0.5) *
                  l),
                  (T.current.active = !0));
              },
              a = () => {
                T.current.active = !1;
              };
            return (
              e.addEventListener("pointermove", t),
              e.addEventListener("pointerleave", a),
              () => {
                (e.removeEventListener("pointermove", t),
                  e.removeEventListener("pointerleave", a));
              }
            );
          }, [G]),
          (0, l.jsxs)("div", {
            ref: O,
            className: (0, p.cn)("relative overflow-hidden", D),
            children: [
              (0, l.jsx)("div", {
                className: "absolute inset-0",
                children: (0, l.jsx)(s.Hl, {
                  orthographic: !0,
                  dpr: A,
                  frameloop: X ? "always" : "demand",
                  gl: {
                    antialias: !1,
                    alpha: !0,
                    powerPreference: "high-performance",
                  },
                  children: (0, l.jsx)(v, {
                    speed: e,
                    swell: t,
                    swellFrequency: a,
                    ripple: r,
                    rippleFrequency: i,
                    chop: u,
                    chopScale: o,
                    waterline: c,
                    edgeSoftness: d,
                    depth: f,
                    glow: x,
                    glowWidth: g,
                    halo: w,
                    haloWidth: y,
                    richness: S,
                    colorFrequency: b,
                    saturation: C,
                    spread: j,
                    swirl: k,
                    swirlScale: R,
                    grain: F,
                    grainSize: H,
                    color: W,
                    hotColor: q,
                    backgroundColor: P,
                    opacity: E,
                    cursorInteraction: G,
                    cursorLift: z,
                    cursorReach: I,
                    paused: L,
                    adaptiveQuality: M,
                    targetFps: N,
                    readPointer: Q,
                  }),
                }),
              }),
              K
                ? (0, l.jsx)("div", {
                    className: "relative z-10 h-full w-full",
                    children: K,
                  })
                : null,
            ],
          })
        );
      },
      g = () => () => {},
      w = () => {
        let [e, t] = (0, u.I)(),
          { resolvedTheme: a } = (0, r.D)(),
          o =
            (0, n.useSyncExternalStore)(
              g,
              () => !0,
              () => !1,
            ) && "dark" === a,
          [s, c] = (0, n.useState)(1),
          [p, d] = (0, n.useState)(0.15),
          [f, h] = (0, n.useState)(3),
          [m, v] = (0, n.useState)(0.08),
          [w, y] = (0, n.useState)(6),
          [S, b] = (0, n.useState)(0.04),
          [C, j] = (0, n.useState)(2),
          [k, R] = (0, n.useState)(0),
          [F, H] = (0, n.useState)(0.1),
          [W, q] = (0, n.useState)(0.6),
          [P, E] = (0, n.useState)(0.6),
          [G, z] = (0, n.useState)(0.05),
          [I, L] = (0, n.useState)(0.35),
          [M, N] = (0, n.useState)(0.2),
          [B, D] = (0, n.useState)(0.35),
          [K, O] = (0, n.useState)(2),
          [T, X] = (0, n.useState)(0.9),
          [_, A] = (0, n.useState)(0.04),
          [Q, U] = (0, n.useState)(1),
          [V, Y] = (0, n.useState)(1.5),
          [J, Z] = (0, n.useState)(0.05),
          [$, ee] = (0, n.useState)(2),
          [et, ea] = (0, n.useState)(1),
          [el, en] = (0, n.useState)(!0),
          [er, ei] = (0, n.useState)(0.12),
          [eu, eo] = (0, n.useState)(0.25),
          [es, ec] = (0, n.useState)(!1),
          [ep, ed] = (0, n.useState)(null),
          [ef, eh] = (0, n.useState)(null),
          [em, ev] = (0, n.useState)(null),
          ex = (0, n.useMemo)(
            () => (null !== ep ? ep : o ? "#0a0a0a" : "#ffffff"),
            [o, ep],
          ),
          eg = (0, n.useMemo)(
            () => (null !== ef ? ef : o ? "#0f172a" : "#e2e8f0"),
            [o, ef],
          ),
          ew = (0, n.useMemo)(
            () => (null !== em ? em : o ? "#c7d2fe" : "#475569"),
            [o, em],
          );
        return (0, l.jsxs)("div", {
          children: [
            (0, l.jsx)(i.Bg, {}),
            (0, l.jsxs)(i.VX, {
              children: [
                (0, l.jsxs)(i.Ec, {
                  children: [
                    (0, l.jsx)(i.Ch, {
                      onRefresh: t,
                      children: (0, l.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, l.jsx)(
                          x,
                          {
                            className: "h-full w-full",
                            speed: s,
                            swell: p,
                            swellFrequency: f,
                            ripple: m,
                            rippleFrequency: w,
                            chop: S,
                            chopScale: C,
                            waterline: k,
                            edgeSoftness: F,
                            depth: W,
                            glow: P,
                            glowWidth: G,
                            halo: I,
                            haloWidth: M,
                            richness: B,
                            colorFrequency: K,
                            saturation: T,
                            spread: _,
                            swirl: Q,
                            swirlScale: V,
                            grain: J,
                            grainSize: $,
                            color: eg,
                            hotColor: ew,
                            backgroundColor: ex,
                            opacity: et,
                            cursorInteraction: el,
                            cursorLift: er,
                            cursorReach: eu,
                            paused: es,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, l.jsxs)(i.IH, {
                      children: [
                        (0, l.jsx)(i.yt, {
                          title: "Speed",
                          min: 0,
                          max: 4,
                          step: 0.05,
                          value: s,
                          onChange: c,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Swell",
                          min: 0,
                          max: 0.5,
                          step: 0.005,
                          value: p,
                          onChange: d,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Swell Frequency",
                          min: 0.5,
                          max: 12,
                          step: 0.1,
                          value: f,
                          onChange: h,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Ripple",
                          min: 0,
                          max: 0.3,
                          step: 0.005,
                          value: m,
                          onChange: v,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Ripple Frequency",
                          min: 0.5,
                          max: 24,
                          step: 0.1,
                          value: w,
                          onChange: y,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Chop",
                          min: 0,
                          max: 0.2,
                          step: 0.005,
                          value: S,
                          onChange: b,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Chop Scale",
                          min: 0.5,
                          max: 8,
                          step: 0.1,
                          value: C,
                          onChange: j,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Waterline",
                          min: -0.4,
                          max: 0.4,
                          step: 0.01,
                          value: k,
                          onChange: R,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Edge Softness",
                          min: 0.005,
                          max: 0.4,
                          step: 0.005,
                          value: F,
                          onChange: H,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Depth",
                          min: 0.05,
                          max: 2,
                          step: 0.05,
                          value: W,
                          onChange: q,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Glow",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: P,
                          onChange: E,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Glow Width",
                          min: 0.005,
                          max: 0.3,
                          step: 0.005,
                          value: G,
                          onChange: z,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Halo",
                          min: 0,
                          max: 1.5,
                          step: 0.05,
                          value: I,
                          onChange: L,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Halo Width",
                          min: 0.02,
                          max: 1,
                          step: 0.01,
                          value: M,
                          onChange: N,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Richness",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: B,
                          onChange: D,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Color Frequency",
                          min: 0,
                          max: 20,
                          step: 0.1,
                          value: K,
                          onChange: O,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Saturation",
                          min: 0.2,
                          max: 4,
                          step: 0.05,
                          value: T,
                          onChange: X,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Spread",
                          min: 0,
                          max: 0.5,
                          step: 0.005,
                          value: _,
                          onChange: A,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Swirl",
                          min: 0,
                          max: 6,
                          step: 0.05,
                          value: Q,
                          onChange: U,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Swirl Scale",
                          min: 0.2,
                          max: 6,
                          step: 0.1,
                          value: V,
                          onChange: Y,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Grain",
                          min: 0,
                          max: 0.3,
                          step: 0.005,
                          value: J,
                          onChange: Z,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Grain Size",
                          min: 1,
                          max: 6,
                          step: 1,
                          value: $,
                          onChange: ee,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: et,
                          onChange: ea,
                        }),
                        (0, l.jsx)(i.W7, {
                          title: "Color",
                          value: eg,
                          onChange: eh,
                        }),
                        (0, l.jsx)(i.W7, {
                          title: "Hot Color",
                          value: ew,
                          onChange: ev,
                        }),
                        (0, l.jsx)(i.W7, {
                          title: "Background",
                          value: ex,
                          onChange: ed,
                        }),
                        (0, l.jsx)(i.tl, {
                          title: "Cursor Interaction",
                          checked: el,
                          onChange: en,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Cursor Lift",
                          min: -0.3,
                          max: 0.3,
                          step: 0.01,
                          value: er,
                          onChange: ei,
                        }),
                        (0, l.jsx)(i.yt, {
                          title: "Cursor Reach",
                          min: 0.05,
                          max: 1,
                          step: 0.01,
                          value: eu,
                          onChange: eo,
                        }),
                        (0, l.jsx)(i.tl, {
                          title: "Paused",
                          checked: es,
                          onChange: ec,
                        }),
                      ],
                    }),
                    (0, l.jsx)(i.Ub, {
                      data: [
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description: "Travel speed of the wave.",
                        },
                        {
                          name: "swell",
                          type: "number",
                          default: "0.15",
                          description: "Height of the primary swell.",
                        },
                        {
                          name: "swellFrequency",
                          type: "number",
                          default: "3",
                          description: "Frequency of the primary swell.",
                        },
                        {
                          name: "ripple",
                          type: "number",
                          default: "0.08",
                          description: "Height of the secondary ripple.",
                        },
                        {
                          name: "rippleFrequency",
                          type: "number",
                          default: "6",
                          description: "Frequency of the secondary ripple.",
                        },
                        {
                          name: "chop",
                          type: "number",
                          default: "0.04",
                          description:
                            "Height of the noise riding on the crest.",
                        },
                        {
                          name: "chopScale",
                          type: "number",
                          default: "2",
                          description:
                            "Scale of the noise riding on the crest.",
                        },
                        {
                          name: "waterline",
                          type: "number",
                          default: "0",
                          description:
                            "Vertical placement of the wave, 0 is centred.",
                        },
                        {
                          name: "edgeSoftness",
                          type: "number",
                          default: "0.1",
                          description: "Softness of the fill edge.",
                        },
                        {
                          name: "depth",
                          type: "number",
                          default: "0.6",
                          description:
                            "How far the fill gradient reaches below the crest.",
                        },
                        {
                          name: "glow",
                          type: "number",
                          default: "0.6",
                          description: "Brightness of the crest line.",
                        },
                        {
                          name: "glowWidth",
                          type: "number",
                          default: "0.05",
                          description: "Width of the crest line.",
                        },
                        {
                          name: "halo",
                          type: "number",
                          default: "0.35",
                          description:
                            "Brightness of the surrounding halo relative to the crest.",
                        },
                        {
                          name: "haloWidth",
                          type: "number",
                          default: "0.2",
                          description: "Width of the surrounding halo.",
                        },
                        {
                          name: "richness",
                          type: "number",
                          default: "0.35",
                          description:
                            "How far the iridescence overrides the plain gradient, 0 to 1.",
                        },
                        {
                          name: "colorFrequency",
                          type: "number",
                          default: "2",
                          description:
                            "Number of colour bands through the fill.",
                        },
                        {
                          name: "saturation",
                          type: "number",
                          default: "0.9",
                          description: "Vividness of the colour bands.",
                        },
                        {
                          name: "spread",
                          type: "number",
                          default: "0.04",
                          description:
                            "How far the hue travels away from hotColor, 0 to 0.5.",
                        },
                        {
                          name: "swirl",
                          type: "number",
                          default: "1",
                          description:
                            "Strength of the noise that bends the colour bands.",
                        },
                        {
                          name: "swirlScale",
                          type: "number",
                          default: "1.5",
                          description:
                            "Scale of the noise that bends the colour bands.",
                        },
                        {
                          name: "grain",
                          type: "number",
                          default: "0.05",
                          description: "Film grain strength, 0 to 1.",
                        },
                        {
                          name: "grainSize",
                          type: "number",
                          default: "2",
                          description: "Grain cell size in CSS pixels.",
                        },
                        {
                          name: "color",
                          type: "string",
                          default: '"#0f172a"',
                          description: "Deep colour under the wave.",
                        },
                        {
                          name: "hotColor",
                          type: "string",
                          default: '"#c7d2fe"',
                          description: "Colour of the crest and its glow.",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"#0a0a0a"',
                          description:
                            'Panel backdrop, or "transparent" to show the page through.',
                        },
                        {
                          name: "opacity",
                          type: "number",
                          default: "1",
                          description: "Master alpha.",
                        },
                        {
                          name: "cursorInteraction",
                          type: "boolean",
                          default: "true",
                          description: "Let the pointer raise the crest.",
                        },
                        {
                          name: "cursorLift",
                          type: "number",
                          default: "0.12",
                          description: "How high the pointer lifts the crest.",
                        },
                        {
                          name: "cursorReach",
                          type: "number",
                          default: "0.25",
                          description: "How wide the pointer lifts the crest.",
                        },
                        {
                          name: "paused",
                          type: "boolean",
                          default: "false",
                          description: "Freeze the animation.",
                        },
                        {
                          name: "adaptiveQuality",
                          type: "boolean",
                          default: "true",
                          description:
                            "Scale back resolution when the frame budget slips.",
                        },
                        {
                          name: "targetFps",
                          type: "number",
                          default: "60",
                          description:
                            "Frame rate the quality meter aims to hold.",
                        },
                        {
                          name: "dpr",
                          type: "number",
                          default: "2",
                          description: "Upper device pixel ratio bound.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "undefined",
                          description: "Extra classes for the panel.",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "undefined",
                          description: "Content layered above the panel.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, l.jsx)(i.lT, { children: (0, l.jsx)(i.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
