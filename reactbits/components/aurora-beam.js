/* ReactBits Pro public preview module 68444 for aurora-beam.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/68444.13dbff5aa4381325.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  68444: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => S }));
    var n = a(95155),
      r = a(12115),
      l = a(30701),
      i = a(56388),
      u = a(90761),
      o = a(81712),
      s = a(3907),
      c = a(2253),
      p = a(90650);
    let m = `
varying vec2 vPlane;

void main() {
  vPlane = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,
      f = (e, t) => {
        let a = new c.Q1f();
        try {
          a.setStyle(e, c.Zr2);
        } catch {
          a.setStyle(t, c.Zr2);
        }
        return a;
      },
      d = (e, t) => {
        try {
          e.setStyle(t, c.Zr2);
        } catch {
          return;
        }
      },
      v = (e, t, a) => Math.min(a, Math.max(t, e)),
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
      x = () => window.devicePixelRatio || 1,
      y = ({
        speed: e,
        sheets: t,
        amplitude: a,
        frequency: l,
        thickness: i,
        tail: u,
        position: s,
        slant: p,
        spread: h,
        rays: x,
        rayScale: y,
        rayDrift: g,
        reactivity: b,
        gain: S,
        exposure: w,
        contrast: C,
        color: k,
        midColor: j,
        deepColor: R,
        hueDrift: T,
        grain: E,
        grainSize: G,
        grainRate: D,
        backgroundColor: M,
        opacity: P,
        cursorInteraction: H,
        cursorSway: B,
        paused: N,
        adaptiveQuality: A,
        targetFps: z,
        ceiling: I,
        readPointer: F,
      }) => {
        let q = (0, r.useRef)(null),
          L = (0, r.useRef)(0),
          O = (0, r.useRef)({ x: 0.5, y: 0.5 }),
          W = (0, r.useRef)({ frames: 0, span: 0, wins: 0, cap: 4 }),
          { gl: _, size: U } = (0, o.C)(),
          V = Math.round(v(t, 1, 16)),
          Q = (0, r.useMemo)(
            () => `
precision highp float;

varying vec2 vPlane;

uniform vec2 uCanvas;
uniform float uClock;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uThickness;
uniform float uTail;
uniform float uSeat;
uniform float uSlant;
uniform float uSpread;
uniform float uRays;
uniform float uRayScale;
uniform float uRayDrift;
uniform float uReact;
uniform float uGain;
uniform float uExposure;
uniform float uContrast;
uniform float uHueDrift;
uniform float uGrain;
uniform float uGrainSize;
uniform float uGrainRate;
uniform vec3 uTintA;
uniform vec3 uTintB;
uniform vec3 uTintC;
uniform vec3 uBackdrop;
uniform float uBackdropAlpha;
uniform float uOpacity;
uniform vec2 uSway;

float scatter(vec3 seed) {
  vec3 wobble = fract(seed * vec3(0.1031, 0.1030, 0.0973));
  wobble += dot(wobble, wobble.yxz + 33.33);
  return fract((wobble.x + wobble.y) * wobble.z);
}

float silver(vec2 cell, float tick) {
  float a = scatter(vec3(cell, tick));
  float b = scatter(vec3(cell.yx + 41.7, tick + 19.3));
  return a + b - 1.0;
}

vec3 softClip(vec3 x) {
  vec3 fall = exp(-2.0 * max(x, 0.0));
  return (1.0 - fall) / (1.0 + fall);
}

vec4 envelopes(float t) {
  vec4 rate = vec4(1.73, 2.41, 3.07, 0.87);
  vec4 skew = vec4(0.0, 1.15, 2.4, 0.6);
  vec4 broad = 0.5 + 0.5 * sin(t * rate + skew);
  vec4 fine = 0.5 + 0.5 * sin(t * rate * 2.7 + skew * 1.9);
  return mix(broad, broad * fine, 0.35);
}

float bandGain(float x, float t) {
  float tilt = exp(-x * 1.9) + 0.22 * exp(-abs(x - 0.62) * 6.0);
  float comb = 0.62 + 0.38 * sin(x * 18.0 - t * 4.0 + sin(x * 7.0));
  return clamp(tilt * comb, 0.0, 1.6);
}

float ripple(float x, float t) {
  return sin(x * 21.0 + t * 5.4) * 0.42 + sin(x * 34.0 - t * 3.1) * 0.24;
}

vec3 palette(float h) {
  float w = fract(h) * 3.0;
  vec3 warm = mix(uTintA, uTintB, smoothstep(0.0, 1.0, clamp(w, 0.0, 1.0)));
  vec3 cool = mix(warm, uTintC, smoothstep(0.0, 1.0, clamp(w - 1.0, 0.0, 1.0)));
  return mix(cool, uTintA, smoothstep(0.0, 1.0, clamp(w - 2.0, 0.0, 1.0)));
}

void main() {
  vec2 pixel = vPlane * uCanvas;
  vec2 field = (pixel - 0.5 * uCanvas) / max(uCanvas.y, 1.0);

  float clock = uClock * uSpeed;
  vec4 env = mix(vec4(1.0), envelopes(clock), clamp(uReact, 0.0, 1.0));

  float lateral = field.x + uSway.x * 0.35;
  float span = clamp(lateral * 0.5 + 0.5, 0.0, 1.0);
  float tone = bandGain(span, clock);

  vec3 glow = vec3(0.0);

  for (int i = 0; i < ${V}; i++) {
    float lane = (float(i) + 0.5) / float(${V});
    float turn = lane * 6.2831853;

    float march = lateral * uFrequency + clock * 0.6 + turn * 1.7;
    float ridge =
      sin(march) * 0.55 +
      sin(march * 0.53 + turn) * 0.3 +
      sin(march * 2.17 - clock * 0.9) * 0.15;
    ridge += ripple(lateral, clock) * env.z * 0.22;

    float lift = mix(0.65, 1.25, lane) * (0.7 + 0.6 * env.y);
    float spine =
      uSeat +
      uSway.y * 0.25 +
      uSlant * lateral +
      ridge * uAmplitude * lift +
      (lane - 0.5) * uSpread;

    float gap = field.y - spine;
    float girth = max(uThickness * mix(0.55, 1.35, lane) * (0.75 + 0.5 * env.x) * tone, 1e-4);

    float core = girth * girth / (gap * gap + girth * girth);
    float above = max(gap, 0.0);
    float below = max(-gap, 0.0);
    float veil = exp(-above / max(uTail, 1e-3)) * exp(-below / (girth * 2.5));

    float streak =
      1.0 - uRays +
      uRays * (0.5 + 0.5 * sin(lateral * uRayScale + turn * 3.1 + clock * uRayDrift));

    float sheet = (core * 0.85 + veil * 0.55) * streak;
    sheet *= 0.6 + 0.7 * env.w;

    float hue = lane + span * 0.28 + clock * uHueDrift * 0.05;
    glow += palette(hue) * sheet;
  }

  vec3 raw = glow * uGain / max(uExposure, 0.05);
  vec3 col = softClip(raw);
  col = pow(clamp(col, 0.0, 1.0), vec3(max(uContrast, 0.05)));

  float cover = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);

  vec2 cell = floor(pixel / max(uGrainSize, 1.0));
  float tick = floor(uClock * max(uGrainRate, 1.0));
  float speck = silver(cell, tick) + silver(cell * 0.5 + 7.0, tick) * 0.5;
  float response = cover * (1.0 - cover) * 4.0;
  float dust = 1.0 + speck * uGrain * response * 1.6;
  col = clamp(col * dust, 0.0, 1.0);
  cover = clamp(cover * dust, 0.0, 1.0);

  float rest = uBackdropAlpha * (1.0 - cover);
  gl_FragColor = vec4(col + uBackdrop * rest, cover + rest) * uOpacity;
}
`,
            [V],
          ),
          X = (0, r.useMemo)(
            () => ({
              uCanvas: { value: new c.I9Y(1, 1) },
              uClock: { value: 0 },
              uSpeed: { value: 1 },
              uAmplitude: { value: 0.12 },
              uFrequency: { value: 3.2 },
              uThickness: { value: 0.05 },
              uTail: { value: 0.22 },
              uSeat: { value: 0 },
              uSlant: { value: 0.1 },
              uSpread: { value: 0.16 },
              uRays: { value: 0.45 },
              uRayScale: { value: 26 },
              uRayDrift: { value: 0.8 },
              uReact: { value: 0.7 },
              uGain: { value: 1.5 },
              uExposure: { value: 2.4 },
              uContrast: { value: 1 },
              uHueDrift: { value: 1 },
              uGrain: { value: 0.05 },
              uGrainSize: { value: 1 },
              uGrainRate: { value: 24 },
              uTintA: { value: f("#34d399", "#34d399") },
              uTintB: { value: f("#22d3ee", "#22d3ee") },
              uTintC: { value: f("#a78bfa", "#a78bfa") },
              uBackdrop: { value: f("#0a0a0a", "#0a0a0a") },
              uBackdropAlpha: { value: 1 },
              uOpacity: { value: 1 },
              uSway: { value: new c.I9Y(0, 0) },
            }),
            [],
          );
        return (
          (0, r.useEffect)(() => {
            let e = q.current;
            e && ((e.fragmentShader = Q), (e.needsUpdate = !0));
          }, [Q]),
          (0, r.useEffect)(() => {
            let e = q.current;
            if (!e) return;
            (d(e.uniforms.uTintA.value, k),
              d(e.uniforms.uTintB.value, j),
              d(e.uniforms.uTintC.value, R));
            let t = "transparent" === M || "none" === M || "" === M;
            ((e.uniforms.uBackdropAlpha.value = +!t),
              t || d(e.uniforms.uBackdrop.value, M));
          }, [k, j, R, M]),
          (0, o.D)((t, n) => {
            let r = q.current;
            if (!r) return;
            let o = Math.min(n, 0.05);
            N || (L.current += o);
            let c = _.getPixelRatio(),
              m = r.uniforms;
            if (
              (m.uCanvas.value.set(U.width * c, U.height * c),
              (m.uClock.value = L.current),
              (m.uSpeed.value = e),
              (m.uAmplitude.value = a),
              (m.uFrequency.value = l),
              (m.uThickness.value = Math.max(i, 0.002)),
              (m.uTail.value = Math.max(u, 0.01)),
              (m.uSeat.value = s),
              (m.uSlant.value = p),
              (m.uSpread.value = h),
              (m.uRays.value = x),
              (m.uRayScale.value = y),
              (m.uRayDrift.value = g),
              (m.uReact.value = b),
              (m.uGain.value = S),
              (m.uExposure.value = w),
              (m.uContrast.value = C),
              (m.uHueDrift.value = T),
              (m.uGrain.value = E),
              (m.uGrainSize.value = Math.max(G, 1) * c),
              (m.uGrainRate.value = D),
              (m.uOpacity.value = P),
              H)
            ) {
              let e = F(),
                t = 1 - Math.exp(-(4 * o));
              ((O.current.x += (e.x - O.current.x) * t),
                (O.current.y += (e.y - O.current.y) * t),
                m.uSway.value.set(
                  (O.current.x - 0.5) * B,
                  (O.current.y - 0.5) * B,
                ));
            } else m.uSway.value.set(0, 0);
            if (!A) return;
            let f = W.current;
            if (((f.frames += 1), (f.span += n), f.span < 0.75)) return;
            let d = f.frames / f.span;
            ((f.frames = 0), (f.span = 0));
            let v = Math.min(I, f.cap);
            d < 0.85 * z && c > 0.6
              ? ((f.wins = 0),
                (f.cap = Math.max(0.6, 0.9 * c)),
                _.setPixelRatio(Math.max(0.6, 0.75 * c)))
              : d > 0.98 * z && c < v - 0.01
                ? ((f.wins += 1),
                  f.wins >= 3 &&
                    ((f.wins = 0), _.setPixelRatio(Math.min(v, 1.25 * c))))
                : (f.wins = 0);
          }),
          (0, n.jsxs)("mesh", {
            frustumCulled: !1,
            children: [
              (0, n.jsx)("planeGeometry", { args: [1, 1] }),
              (0, n.jsx)("shaderMaterial", {
                ref: q,
                vertexShader: m,
                fragmentShader: Q,
                uniforms: X,
                transparent: !0,
                depthTest: !1,
                depthWrite: !1,
                premultipliedAlpha: !0,
              }),
            ],
          })
        );
      },
      g = ({
        speed: e = 1,
        sheets: t = 5,
        amplitude: a = 0.12,
        frequency: l = 3.2,
        thickness: i = 0.05,
        tail: u = 0.22,
        position: o = 0,
        slant: c = 0.1,
        spread: m = 0.16,
        rays: f = 0.45,
        rayScale: d = 26,
        rayDrift: g = 0.8,
        reactivity: b = 0.7,
        gain: S = 1.5,
        exposure: w = 2.4,
        contrast: C = 1,
        color: k = "#34d399",
        midColor: j = "#22d3ee",
        deepColor: R = "#a78bfa",
        hueDrift: T = 1,
        grain: E = 0.05,
        grainSize: G = 1,
        grainRate: D = 24,
        backgroundColor: M = "#0a0a0a",
        opacity: P = 1,
        cursorInteraction: H = !0,
        cursorSway: B = 0.5,
        paused: N = !1,
        adaptiveQuality: A = !0,
        targetFps: z = 60,
        dpr: I = 1.75,
        className: F,
        children: q,
      }) => {
        let L = (0, r.useRef)(null),
          O = (0, r.useRef)({ x: 0.5, y: 0.5 }),
          [W, _] = (0, r.useState)(!0),
          U = Math.min(
            (0, r.useSyncExternalStore)(h, x, () => 1),
            Math.max(I, 0.5),
          ),
          V = (0, r.useCallback)(() => O.current, []);
        return (
          (0, r.useEffect)(() => {
            let e = L.current;
            if (!e || "undefined" == typeof IntersectionObserver) return;
            let t = new IntersectionObserver(([e]) => _(e.isIntersecting), {
              threshold: 0,
            });
            return (t.observe(e), () => t.disconnect());
          }, []),
          (0, r.useEffect)(() => {
            let e = L.current;
            if (!e || !H) return;
            let t = (t) => {
                let a = e.getBoundingClientRect();
                a.width &&
                  a.height &&
                  ((O.current.x = v((t.clientX - a.left) / a.width, 0, 1)),
                  (O.current.y = v(1 - (t.clientY - a.top) / a.height, 0, 1)));
              },
              a = () => {
                ((O.current.x = 0.5), (O.current.y = 0.5));
              };
            return (
              e.addEventListener("pointermove", t),
              e.addEventListener("pointerleave", a),
              () => {
                (e.removeEventListener("pointermove", t),
                  e.removeEventListener("pointerleave", a));
              }
            );
          }, [H]),
          (0, n.jsxs)("div", {
            ref: L,
            className: (0, p.cn)("relative overflow-hidden", F),
            children: [
              (0, n.jsx)("div", {
                className: "absolute inset-0",
                children: (0, n.jsx)(s.Hl, {
                  orthographic: !0,
                  dpr: U,
                  frameloop: W ? "always" : "demand",
                  gl: {
                    antialias: !1,
                    alpha: !0,
                    powerPreference: "high-performance",
                  },
                  children: (0, n.jsx)(y, {
                    speed: e,
                    sheets: t,
                    amplitude: a,
                    frequency: l,
                    thickness: i,
                    tail: u,
                    position: o,
                    slant: c,
                    spread: m,
                    rays: f,
                    rayScale: d,
                    rayDrift: g,
                    reactivity: b,
                    gain: S,
                    exposure: w,
                    contrast: C,
                    color: k,
                    midColor: j,
                    deepColor: R,
                    hueDrift: T,
                    grain: E,
                    grainSize: G,
                    grainRate: D,
                    backgroundColor: M,
                    opacity: P,
                    cursorInteraction: H,
                    cursorSway: B,
                    paused: N,
                    adaptiveQuality: A,
                    targetFps: z,
                    ceiling: U,
                    readPointer: V,
                  }),
                }),
              }),
              q
                ? (0, n.jsx)("div", {
                    className: "relative z-10 h-full w-full",
                    children: q,
                  })
                : null,
            ],
          })
        );
      },
      b = () => () => {},
      S = () => {
        let [e, t] = (0, u.I)(),
          { resolvedTheme: a } = (0, l.D)(),
          o =
            (0, r.useSyncExternalStore)(
              b,
              () => !0,
              () => !1,
            ) && "dark" === a,
          [s, c] = (0, r.useState)(1),
          [p, m] = (0, r.useState)(5),
          [f, d] = (0, r.useState)(0.12),
          [v, h] = (0, r.useState)(3.2),
          [x, y] = (0, r.useState)(0.05),
          [S, w] = (0, r.useState)(0.22),
          [C, k] = (0, r.useState)(0),
          [j, R] = (0, r.useState)(0.1),
          [T, E] = (0, r.useState)(0.16),
          [G, D] = (0, r.useState)(0.45),
          [M, P] = (0, r.useState)(26),
          [H, B] = (0, r.useState)(0.8),
          [N, A] = (0, r.useState)(0.7),
          [z, I] = (0, r.useState)(1.5),
          [F, q] = (0, r.useState)(2.4),
          [L, O] = (0, r.useState)(1),
          [W, _] = (0, r.useState)(1),
          [U, V] = (0, r.useState)(0.05),
          [Q, X] = (0, r.useState)(1),
          [Y, Z] = (0, r.useState)(!0),
          [$, J] = (0, r.useState)(0.5),
          [K, ee] = (0, r.useState)(!1),
          [et, ea] = (0, r.useState)("#34d399"),
          [en, er] = (0, r.useState)("#22d3ee"),
          [el, ei] = (0, r.useState)("#a78bfa"),
          [eu, eo] = (0, r.useState)(null),
          es = (0, r.useMemo)(
            () => (null !== eu ? eu : o ? "#0a0a0a" : "#ffffff"),
            [o, eu],
          );
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(i.Bg, {}),
            (0, n.jsxs)(i.VX, {
              children: [
                (0, n.jsxs)(i.Ec, {
                  children: [
                    (0, n.jsx)(i.Ch, {
                      onRefresh: t,
                      minHeight: 520,
                      children: (0, n.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, n.jsx)(
                          g,
                          {
                            className: "h-full w-full",
                            speed: s,
                            sheets: p,
                            amplitude: f,
                            frequency: v,
                            thickness: x,
                            tail: S,
                            position: C,
                            slant: j,
                            spread: T,
                            rays: G,
                            rayScale: M,
                            rayDrift: H,
                            reactivity: N,
                            gain: z,
                            exposure: F,
                            contrast: L,
                            color: et,
                            midColor: en,
                            deepColor: el,
                            hueDrift: W,
                            grain: U,
                            backgroundColor: es,
                            opacity: Q,
                            cursorInteraction: Y,
                            cursorSway: $,
                            paused: K,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(i.IH, {
                      children: [
                        (0, n.jsx)(i.yt, {
                          title: "Speed",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: s,
                          onChange: c,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Sheets",
                          min: 1,
                          max: 12,
                          step: 1,
                          value: p,
                          onChange: m,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Amplitude",
                          min: 0,
                          max: 0.5,
                          step: 0.01,
                          value: f,
                          onChange: d,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Frequency",
                          min: 0.5,
                          max: 12,
                          step: 0.1,
                          value: v,
                          onChange: h,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Thickness",
                          min: 0.005,
                          max: 0.2,
                          step: 0.005,
                          value: x,
                          onChange: y,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Tail",
                          min: 0.02,
                          max: 0.8,
                          step: 0.01,
                          value: S,
                          onChange: w,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Position",
                          min: -0.5,
                          max: 0.5,
                          step: 0.01,
                          value: C,
                          onChange: k,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Slant",
                          min: -0.6,
                          max: 0.6,
                          step: 0.01,
                          value: j,
                          onChange: R,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Spread",
                          min: 0,
                          max: 0.8,
                          step: 0.01,
                          value: T,
                          onChange: E,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Rays",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: G,
                          onChange: D,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Ray Scale",
                          min: 2,
                          max: 80,
                          step: 1,
                          value: M,
                          onChange: P,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Ray Drift",
                          min: -4,
                          max: 4,
                          step: 0.1,
                          value: H,
                          onChange: B,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Reactivity",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: N,
                          onChange: A,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Gain",
                          min: 0.1,
                          max: 5,
                          step: 0.05,
                          value: z,
                          onChange: I,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Exposure",
                          min: 0.2,
                          max: 10,
                          step: 0.1,
                          value: F,
                          onChange: q,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Contrast",
                          min: 0.4,
                          max: 3,
                          step: 0.05,
                          value: L,
                          onChange: O,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Hue Drift",
                          min: 0,
                          max: 4,
                          step: 0.05,
                          value: W,
                          onChange: _,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Grain",
                          min: 0,
                          max: 0.4,
                          step: 0.01,
                          value: U,
                          onChange: V,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Cursor Sway",
                          min: 0,
                          max: 1.5,
                          step: 0.05,
                          value: $,
                          onChange: J,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: Q,
                          onChange: X,
                        }),
                        (0, n.jsx)(i.W7, {
                          title: "Color",
                          value: et,
                          onChange: ea,
                        }),
                        (0, n.jsx)(i.W7, {
                          title: "Mid Color",
                          value: en,
                          onChange: er,
                        }),
                        (0, n.jsx)(i.W7, {
                          title: "Deep Color",
                          value: el,
                          onChange: ei,
                        }),
                        (0, n.jsx)(i.W7, {
                          title: "Background",
                          value: es,
                          onChange: eo,
                        }),
                        (0, n.jsx)(i.tl, {
                          title: "Cursor Interaction",
                          checked: Y,
                          onChange: Z,
                        }),
                        (0, n.jsx)(i.tl, {
                          title: "Paused",
                          checked: K,
                          onChange: ee,
                        }),
                      ],
                    }),
                    (0, n.jsx)(i.Ub, {
                      data: [
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description: "How fast the curtains travel.",
                        },
                        {
                          name: "sheets",
                          type: "number",
                          default: "5",
                          description:
                            "Number of stacked light sheets. The main cost knob.",
                        },
                        {
                          name: "amplitude",
                          type: "number",
                          default: "0.12",
                          description:
                            "Height of the travelling wave that shapes each sheet.",
                        },
                        {
                          name: "frequency",
                          type: "number",
                          default: "3.2",
                          description: "Spatial frequency of that wave.",
                        },
                        {
                          name: "thickness",
                          type: "number",
                          default: "0.05",
                          description:
                            "Half height of a sheet at full brightness.",
                        },
                        {
                          name: "tail",
                          type: "number",
                          default: "0.22",
                          description:
                            "Vertical softness of the upward streak.",
                        },
                        {
                          name: "position",
                          type: "number",
                          default: "0",
                          description:
                            "Vertical centre of the beam, -0.5 to 0.5.",
                        },
                        {
                          name: "slant",
                          type: "number",
                          default: "0.1",
                          description: "Diagonal lean applied across the beam.",
                        },
                        {
                          name: "spread",
                          type: "number",
                          default: "0.16",
                          description:
                            "Vertical separation between consecutive sheets.",
                        },
                        {
                          name: "rays",
                          type: "number",
                          default: "0.45",
                          description:
                            "Strength of the vertical striations, 0 to 1.",
                        },
                        {
                          name: "rayScale",
                          type: "number",
                          default: "26",
                          description: "Spatial frequency of the striations.",
                        },
                        {
                          name: "rayDrift",
                          type: "number",
                          default: "0.8",
                          description:
                            "How fast the striations drift sideways.",
                        },
                        {
                          name: "reactivity",
                          type: "number",
                          default: "0.7",
                          description:
                            "How strongly the envelope model modulates the beam, 0 to 1.",
                        },
                        {
                          name: "gain",
                          type: "number",
                          default: "1.5",
                          description:
                            "Overall brightness before tone mapping.",
                        },
                        {
                          name: "exposure",
                          type: "number",
                          default: "2.4",
                          description:
                            "Tone mapping headroom. Higher keeps more of the falloff.",
                        },
                        {
                          name: "contrast",
                          type: "number",
                          default: "1",
                          description:
                            "Tone response curve. Above 1 deepens the shadows.",
                        },
                        {
                          name: "color",
                          type: "string",
                          default: '"#34d399"',
                          description: "First palette colour.",
                        },
                        {
                          name: "midColor",
                          type: "string",
                          default: '"#22d3ee"',
                          description: "Second palette colour.",
                        },
                        {
                          name: "deepColor",
                          type: "string",
                          default: '"#a78bfa"',
                          description: "Third palette colour.",
                        },
                        {
                          name: "hueDrift",
                          type: "number",
                          default: "1",
                          description:
                            "How fast the palette travels through the sheets.",
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
                          default: "1",
                          description: "Grain cell size in CSS pixels.",
                        },
                        {
                          name: "grainRate",
                          type: "number",
                          default: "24",
                          description: "Grain refreshes per second.",
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
                          description: "Let the pointer sway the curtains.",
                        },
                        {
                          name: "cursorSway",
                          type: "number",
                          default: "0.5",
                          description:
                            "How far the pointer sways the curtains, 0 to 1.",
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
                          default: "1.75",
                          description: "Upper device pixel ratio bound.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "-",
                          description:
                            "Optional className applied to the root.",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "-",
                          description: "Content layered above the beam.",
                        },
                      ],
                    }),
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
