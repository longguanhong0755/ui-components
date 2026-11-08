/* ReactBits Pro public preview module 12837 for rising-particles.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/12837.bf4b63104eedf038.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  12837: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => S }));
    var n = a(95155),
      r = a(12115),
      l = a(30701),
      i = a(56388),
      u = a(90761),
      o = a(81712),
      s = a(3907),
      f = a(2253),
      d = a(90650);
    let m = `
varying vec2 vPlane;

void main() {
  vPlane = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,
      c = (e, t) => {
        let a = new f.Q1f();
        try {
          a.setStyle(e, f.Zr2);
        } catch {
          a.setStyle(t, f.Zr2);
        }
        return a;
      },
      p = (e, t) => {
        try {
          e.setStyle(t, f.Zr2);
        } catch {
          return;
        }
      },
      h = (e, t, a) => Math.min(a, Math.max(t, e)),
      v = (e) => {
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
        count: t,
        minSize: a,
        maxSize: l,
        spread: i,
        sway: u,
        swayRate: s,
        depth: d,
        coreSize: v,
        coreSoftness: x,
        glow: y,
        glowFalloff: g,
        fade: w,
        gain: S,
        bloom: b,
        color: C,
        farColor: j,
        grain: k,
        grainRate: R,
        vignette: M,
        backgroundColor: P,
        opacity: z,
        cursorInteraction: F,
        cursorPush: G,
        cursorRadius: B,
        paused: E,
        adaptiveQuality: N,
        targetFps: D,
        ceiling: I,
        readPointer: H,
      }) => {
        let L = (0, r.useRef)(null),
          O = (0, r.useRef)(0),
          A = (0, r.useRef)({ x: 0, y: 0, push: 0 }),
          V = (0, r.useRef)({ frames: 0, span: 0, wins: 0, cap: 4 }),
          { gl: T, size: _ } = (0, o.C)(),
          U = Math.round(h(t, 4, 260)),
          W = (0, r.useMemo)(
            () => `
precision highp float;

varying vec2 vPlane;

uniform vec2 uCanvas;
uniform float uClock;
uniform float uSpeed;
uniform float uMinSize;
uniform float uMaxSize;
uniform float uSpread;
uniform float uSway;
uniform float uSwayRate;
uniform float uDepth;
uniform float uCoreSize;
uniform float uCoreSoft;
uniform float uGlow;
uniform float uFalloff;
uniform float uFade;
uniform float uGain;
uniform float uBloom;
uniform float uGrain;
uniform float uGrainRate;
uniform float uVignette;
uniform vec3 uNear;
uniform vec3 uFar;
uniform vec3 uBackdrop;
uniform float uBackdropAlpha;
uniform float uOpacity;
uniform vec2 uPointer;
uniform float uPush;
uniform float uReach;

float spark(vec2 seed) {
  vec3 drift = fract(vec3(seed.xyx) * vec3(0.1031, 0.1030, 0.0973));
  drift += dot(drift, drift.yzx + 33.33);
  return fract((drift.x + drift.y) * drift.z);
}

float shuffle(float n) {
  n = fract(n * 0.1031);
  n *= n + 33.33;
  n *= n + n;
  return fract(n);
}

float softClip(float x) {
  float fall = exp(-2.0 * max(x, 0.0));
  return (1.0 - fall) / (1.0 + fall);
}

void main() {
  vec2 pixel = vPlane * uCanvas;
  vec2 field = (pixel * 2.0 - uCanvas) / max(uCanvas.y, 1.0);

  float t = uClock;
  float reach = max(uReach, 0.02);

  vec3 tally = vec3(0.0);
  float weight = 0.0;

  for (int i = 0; i < ${U}; i++) {
    float k = (float(i) + 0.5) / ${U}.0;

    float seedA = shuffle(k * 97.13 + 3.17);
    float seedB = shuffle(k * 148.77 + 19.41);
    float seedC = shuffle(k * 211.29 + 57.83);
    float seedD = shuffle(k * 263.51 + 91.07);

    float plane = mix(1.0 - uDepth, 1.0, seedA);

    float climb = fract(seedC + t * uSpeed * 0.125 * (0.4 + plane * 0.8));
    float y = climb * 2.0 - 1.0;

    float lane = (shuffle(k * 331.7 + 7.9) * 2.0 - 1.0) * uSpread * 2.0;

    float wobble =
      sin(y * (1.2 + seedD * 1.6) + t * uSwayRate + seedB * 6.2832) * 0.62 +
      sin(y * (2.7 + seedC * 2.0) - t * uSwayRate * 0.63 + seedC * 6.2832) *
        0.38;

    vec2 seat = vec2(lane + wobble * uSway * (0.4 + seedD * 0.8), y);

    vec2 away = seat - uPointer;
    float grip = exp(-dot(away, away) / (reach * reach));
    seat += away / max(length(away), 0.06) * grip * uPush;

    float scale = mix(uMinSize, uMaxSize, seedB) * plane;
    float radius = max(scale * 0.5, 1e-4);

    float d = length(field - seat);

    float rim = radius * max(uCoreSize, 0.02);
    float core = 1.0 - smoothstep(rim * (1.0 - uCoreSoft), rim, d);

    float halo = pow(radius / max(d, 1e-3), uFalloff) * uGlow;

    float edge = max(uFade, 1e-3);
    float alive = smoothstep(-1.0, -1.0 + edge, y) * smoothstep(1.0, 1.0 - edge, y);

    float lit = (core + halo) * alive * (0.35 + plane * 0.65);
    tally += mix(uFar, uNear, seedA) * lit;
    weight += lit;
  }

  float mass = softClip(weight * uGain);
  vec3 tint = tally / max(weight, 1e-4);
  tint = mix(tint, vec3(1.0), uBloom * smoothstep(0.35, 1.0, mass));

  float vig = smoothstep(1.35, 0.25, length(field));
  float shade = (1.0 - uVignette) + uVignette * vig;
  mass *= shade;

  float tick = floor(uClock * max(uGrainRate, 1.0));
  float speck = spark(pixel + tick * 17.0) - 0.5;
  mass = clamp(mass * (1.0 + speck * uGrain * mass * (1.0 - mass) * 8.0), 0.0, 1.0);

  vec3 col = tint * mass;
  float rest = uBackdropAlpha * (1.0 - mass);
  gl_FragColor = vec4(col + uBackdrop * rest, mass + rest) * uOpacity;
}
`,
            [U],
          ),
          q = (0, r.useMemo)(
            () => ({
              uCanvas: { value: new f.I9Y(1, 1) },
              uClock: { value: 0 },
              uSpeed: { value: 1 },
              uMinSize: { value: 0.02 },
              uMaxSize: { value: 0.06 },
              uSpread: { value: 1 },
              uSway: { value: 0.05 },
              uSwayRate: { value: 0.6 },
              uDepth: { value: 0.65 },
              uCoreSize: { value: 0.35 },
              uCoreSoft: { value: 0.85 },
              uGlow: { value: 1 },
              uFalloff: { value: 2 },
              uFade: { value: 0.35 },
              uGain: { value: 0.9 },
              uBloom: { value: 0.35 },
              uGrain: { value: 0.04 },
              uGrainRate: { value: 24 },
              uVignette: { value: 0.25 },
              uNear: { value: c("#b34dff", "#b34dff") },
              uFar: { value: c("#5b2bd9", "#5b2bd9") },
              uBackdrop: { value: c("#0a0a0a", "#0a0a0a") },
              uBackdropAlpha: { value: 1 },
              uOpacity: { value: 1 },
              uPointer: { value: new f.I9Y(0, 0) },
              uPush: { value: 0 },
              uReach: { value: 0.35 },
            }),
            [],
          );
        return (
          (0, r.useEffect)(() => {
            let e = L.current;
            e && ((e.fragmentShader = W), (e.needsUpdate = !0));
          }, [W]),
          (0, r.useEffect)(() => {
            let e = L.current;
            if (!e) return;
            (p(e.uniforms.uNear.value, C), p(e.uniforms.uFar.value, j));
            let t = "transparent" === P || "none" === P || "" === P;
            ((e.uniforms.uBackdropAlpha.value = +!t),
              t || p(e.uniforms.uBackdrop.value, P));
          }, [C, j, P]),
          (0, o.D)((t, n) => {
            let r = L.current;
            if (!r) return;
            let o = Math.min(n, 0.05);
            E || (O.current += o);
            let f = T.getPixelRatio(),
              m = r.uniforms;
            (m.uCanvas.value.set(_.width * f, _.height * f),
              (m.uClock.value = O.current),
              (m.uSpeed.value = e),
              (m.uMinSize.value = a),
              (m.uMaxSize.value = Math.max(l, a)),
              (m.uSpread.value = i),
              (m.uSway.value = u),
              (m.uSwayRate.value = s),
              (m.uDepth.value = h(d, 0, 0.95)),
              (m.uCoreSize.value = v),
              (m.uCoreSoft.value = h(x, 0.02, 0.99)),
              (m.uGlow.value = y),
              (m.uFalloff.value = g),
              (m.uFade.value = w),
              (m.uGain.value = S),
              (m.uBloom.value = h(b, 0, 1)),
              (m.uGrain.value = k),
              (m.uGrainRate.value = R),
              (m.uVignette.value = M),
              (m.uOpacity.value = z),
              (m.uReach.value = B));
            let c = _.height || 1,
              p = (_.width || 1) / c,
              C = H(),
              j = 1 - Math.exp(-(6 * o)),
              P = F ? (2 * C.x - 1) * p : 0,
              U = F ? 2 * C.y - 1 : 0,
              W = F && C.inside ? Math.max(G, 0) : 0;
            if (
              ((A.current.x += (P - A.current.x) * j),
              (A.current.y += (U - A.current.y) * j),
              (A.current.push += (W - A.current.push) * j),
              m.uPointer.value.set(A.current.x, A.current.y),
              (m.uPush.value = A.current.push),
              !N)
            )
              return;
            let q = V.current;
            if (((q.frames += 1), (q.span += n), q.span < 0.75)) return;
            let Q = q.frames / q.span;
            ((q.frames = 0), (q.span = 0));
            let X = Math.min(I, q.cap);
            Q < 0.85 * D && f > 0.6
              ? ((q.wins = 0),
                (q.cap = Math.max(0.6, 0.9 * f)),
                T.setPixelRatio(Math.max(0.6, 0.75 * f)))
              : Q > 0.98 * D && f < X - 0.01
                ? ((q.wins += 1),
                  q.wins >= 3 &&
                    ((q.wins = 0), T.setPixelRatio(Math.min(X, 1.25 * f))))
                : (q.wins = 0);
          }),
          (0, n.jsxs)("mesh", {
            frustumCulled: !1,
            children: [
              (0, n.jsx)("planeGeometry", { args: [1, 1] }),
              (0, n.jsx)("shaderMaterial", {
                ref: L,
                vertexShader: m,
                fragmentShader: W,
                uniforms: q,
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
        count: t = 100,
        minSize: a = 0.02,
        maxSize: l = 0.06,
        spread: i = 1,
        sway: u = 0.05,
        swayRate: o = 0.6,
        depth: f = 0.65,
        coreSize: m = 0.35,
        coreSoftness: c = 0.85,
        glow: p = 1,
        glowFalloff: g = 2,
        fade: w = 0.35,
        gain: S = 0.9,
        bloom: b = 0.35,
        color: C = "#b34dff",
        farColor: j = "#5b2bd9",
        grain: k = 0.04,
        grainRate: R = 24,
        vignette: M = 0.25,
        backgroundColor: P = "#0a0a0a",
        opacity: z = 1,
        cursorInteraction: F = !0,
        cursorPush: G = 0.12,
        cursorRadius: B = 0.35,
        paused: E = !1,
        adaptiveQuality: N = !0,
        targetFps: D = 60,
        dpr: I = 1.75,
        className: H,
        children: L,
      }) => {
        let O = (0, r.useRef)(null),
          A = (0, r.useRef)({ x: 0.5, y: 0.5, inside: !1 }),
          [V, T] = (0, r.useState)(!0),
          _ = Math.min(
            (0, r.useSyncExternalStore)(v, x, () => 1),
            Math.max(I, 0.5),
          ),
          U = (0, r.useCallback)(() => A.current, []);
        return (
          (0, r.useEffect)(() => {
            let e = O.current;
            if (!e || "undefined" == typeof IntersectionObserver) return;
            let t = new IntersectionObserver(([e]) => T(e.isIntersecting), {
              threshold: 0,
            });
            return (t.observe(e), () => t.disconnect());
          }, []),
          (0, r.useEffect)(() => {
            let e = O.current;
            if (!e || !F) return;
            let t = (t) => {
                let a = e.getBoundingClientRect();
                a.width &&
                  a.height &&
                  ((A.current.x = h((t.clientX - a.left) / a.width, 0, 1)),
                  (A.current.y = h(1 - (t.clientY - a.top) / a.height, 0, 1)),
                  (A.current.inside = !0));
              },
              a = () => {
                A.current.inside = !1;
              };
            return (
              e.addEventListener("pointermove", t),
              e.addEventListener("pointerleave", a),
              () => {
                (e.removeEventListener("pointermove", t),
                  e.removeEventListener("pointerleave", a));
              }
            );
          }, [F]),
          (0, n.jsxs)("div", {
            ref: O,
            className: (0, d.cn)("relative overflow-hidden", H),
            children: [
              (0, n.jsx)("div", {
                className: "absolute inset-0",
                children: (0, n.jsx)(s.Hl, {
                  orthographic: !0,
                  dpr: _,
                  frameloop: V ? "always" : "demand",
                  gl: {
                    antialias: !1,
                    alpha: !0,
                    powerPreference: "high-performance",
                  },
                  children: (0, n.jsx)(y, {
                    speed: e,
                    count: t,
                    minSize: a,
                    maxSize: l,
                    spread: i,
                    sway: u,
                    swayRate: o,
                    depth: f,
                    coreSize: m,
                    coreSoftness: c,
                    glow: p,
                    glowFalloff: g,
                    fade: w,
                    gain: S,
                    bloom: b,
                    color: C,
                    farColor: j,
                    grain: k,
                    grainRate: R,
                    vignette: M,
                    backgroundColor: P,
                    opacity: z,
                    cursorInteraction: F,
                    cursorPush: G,
                    cursorRadius: B,
                    paused: E,
                    adaptiveQuality: N,
                    targetFps: D,
                    ceiling: _,
                    readPointer: U,
                  }),
                }),
              }),
              L
                ? (0, n.jsx)("div", {
                    className: "relative z-10 h-full w-full",
                    children: L,
                  })
                : null,
            ],
          })
        );
      },
      w = () => () => {},
      S = () => {
        let [e, t] = (0, u.I)(),
          { resolvedTheme: a } = (0, l.D)(),
          o =
            (0, r.useSyncExternalStore)(
              w,
              () => !0,
              () => !1,
            ) && "dark" === a,
          [s, f] = (0, r.useState)(1),
          [d, m] = (0, r.useState)(100),
          [c, p] = (0, r.useState)(0.02),
          [h, v] = (0, r.useState)(0.06),
          [x, y] = (0, r.useState)(1),
          [S, b] = (0, r.useState)(0.05),
          [C, j] = (0, r.useState)(0.6),
          [k, R] = (0, r.useState)(0.65),
          [M, P] = (0, r.useState)(0.35),
          [z, F] = (0, r.useState)(0.85),
          [G, B] = (0, r.useState)(1),
          [E, N] = (0, r.useState)(2),
          [D, I] = (0, r.useState)(0.35),
          [H, L] = (0, r.useState)(0.9),
          [O, A] = (0, r.useState)(0.04),
          [V, T] = (0, r.useState)(0.25),
          [_, U] = (0, r.useState)(1),
          [W, q] = (0, r.useState)(!0),
          [Q, X] = (0, r.useState)(0.12),
          [Y, Z] = (0, r.useState)(0.35),
          [$, J] = (0, r.useState)(!1),
          [K, ee] = (0, r.useState)(null),
          [et, ea] = (0, r.useState)(null),
          [en, er] = (0, r.useState)(null),
          [el, ei] = (0, r.useState)(null),
          eu = (0, r.useMemo)(() => (null !== K ? K : 0.35 * !!o), [o, K]),
          eo = (0, r.useMemo)(
            () => (null !== et ? et : o ? "#b34dff" : "#7c3aed"),
            [o, et],
          ),
          es = (0, r.useMemo)(
            () => (null !== en ? en : o ? "#5b2bd9" : "#a78bfa"),
            [o, en],
          ),
          ef = (0, r.useMemo)(
            () => (null !== el ? el : o ? "#0a0a0a" : "#ffffff"),
            [o, el],
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
                            count: d,
                            minSize: c,
                            maxSize: h,
                            spread: x,
                            sway: S,
                            swayRate: C,
                            depth: k,
                            coreSize: M,
                            coreSoftness: z,
                            glow: G,
                            glowFalloff: E,
                            fade: D,
                            gain: H,
                            bloom: eu,
                            color: eo,
                            farColor: es,
                            grain: O,
                            vignette: V,
                            backgroundColor: ef,
                            opacity: _,
                            cursorInteraction: W,
                            cursorPush: Q,
                            cursorRadius: Y,
                            paused: $,
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
                          max: 4,
                          step: 0.05,
                          value: s,
                          onChange: f,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Count",
                          min: 10,
                          max: 220,
                          step: 5,
                          value: d,
                          onChange: m,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Min Size",
                          min: 0.004,
                          max: 0.12,
                          step: 0.002,
                          value: c,
                          onChange: p,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Max Size",
                          min: 0.01,
                          max: 0.2,
                          step: 0.002,
                          value: h,
                          onChange: v,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Spread",
                          min: 0.2,
                          max: 2,
                          step: 0.05,
                          value: x,
                          onChange: y,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Sway",
                          min: 0,
                          max: 0.4,
                          step: 0.005,
                          value: S,
                          onChange: b,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Sway Rate",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: C,
                          onChange: j,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Depth",
                          min: 0,
                          max: 0.95,
                          step: 0.05,
                          value: k,
                          onChange: R,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Core Size",
                          min: 0.05,
                          max: 1,
                          step: 0.05,
                          value: M,
                          onChange: P,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Core Softness",
                          min: 0.05,
                          max: 0.99,
                          step: 0.02,
                          value: z,
                          onChange: F,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Glow",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: G,
                          onChange: B,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Glow Falloff",
                          min: 1,
                          max: 5,
                          step: 0.1,
                          value: E,
                          onChange: N,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Fade",
                          min: 0.02,
                          max: 1,
                          step: 0.02,
                          value: D,
                          onChange: I,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Gain",
                          min: 0.05,
                          max: 2,
                          step: 0.05,
                          value: H,
                          onChange: L,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Bloom",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: eu,
                          onChange: ee,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Grain",
                          min: 0,
                          max: 0.3,
                          step: 0.005,
                          value: O,
                          onChange: A,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Vignette",
                          min: 0,
                          max: 1,
                          step: 0.02,
                          value: V,
                          onChange: T,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Cursor Push",
                          min: 0,
                          max: 0.6,
                          step: 0.01,
                          value: Q,
                          onChange: X,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Cursor Radius",
                          min: 0.05,
                          max: 1.2,
                          step: 0.05,
                          value: Y,
                          onChange: Z,
                        }),
                        (0, n.jsx)(i.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: _,
                          onChange: U,
                        }),
                        (0, n.jsx)(i.W7, {
                          title: "Near Color",
                          value: eo,
                          onChange: ea,
                        }),
                        (0, n.jsx)(i.W7, {
                          title: "Far Color",
                          value: es,
                          onChange: er,
                        }),
                        (0, n.jsx)(i.W7, {
                          title: "Background",
                          value: ef,
                          onChange: ei,
                        }),
                        (0, n.jsx)(i.tl, {
                          title: "Cursor Interaction",
                          checked: W,
                          onChange: q,
                        }),
                        (0, n.jsx)(i.tl, {
                          title: "Paused",
                          checked: $,
                          onChange: J,
                        }),
                      ],
                    }),
                    (0, n.jsx)(i.Ub, {
                      data: [
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description: "How fast the motes climb.",
                        },
                        {
                          name: "count",
                          type: "number",
                          default: "100",
                          description: "How many motes are in the air.",
                        },
                        {
                          name: "minSize",
                          type: "number",
                          default: "0.02",
                          description:
                            "Diameter of the smallest mote, in screen heights.",
                        },
                        {
                          name: "maxSize",
                          type: "number",
                          default: "0.06",
                          description:
                            "Diameter of the largest mote, in screen heights.",
                        },
                        {
                          name: "spread",
                          type: "number",
                          default: "1",
                          description:
                            "Horizontal reach of the field, 1 fills a square viewport.",
                        },
                        {
                          name: "sway",
                          type: "number",
                          default: "0.05",
                          description:
                            "How far a mote drifts sideways as it rises.",
                        },
                        {
                          name: "swayRate",
                          type: "number",
                          default: "0.6",
                          description: "How quickly that drift oscillates.",
                        },
                        {
                          name: "depth",
                          type: "number",
                          default: "0.65",
                          description:
                            "Difference in speed and scale between the nearest and farthest motes.",
                        },
                        {
                          name: "coreSize",
                          type: "number",
                          default: "0.35",
                          description:
                            "Radius of the solid centre, as a fraction of the mote.",
                        },
                        {
                          name: "coreSoftness",
                          type: "number",
                          default: "0.85",
                          description: "Edge softness of that centre.",
                        },
                        {
                          name: "glow",
                          type: "number",
                          default: "1",
                          description:
                            "Brightness of the halo around each mote.",
                        },
                        {
                          name: "glowFalloff",
                          type: "number",
                          default: "2",
                          description:
                            "How steeply the halo falls off, higher is tighter.",
                        },
                        {
                          name: "fade",
                          type: "number",
                          default: "0.35",
                          description:
                            "How far into the top and bottom edges a mote fades.",
                        },
                        {
                          name: "gain",
                          type: "number",
                          default: "0.9",
                          description:
                            "Overall brightness before the highlight rolloff.",
                        },
                        {
                          name: "bloom",
                          type: "number",
                          default: "0.35",
                          description:
                            "How much the brightest cores wash out toward white.",
                        },
                        {
                          name: "color",
                          type: "string",
                          default: '"#b34dff"',
                          description: "Colour of the nearest motes.",
                        },
                        {
                          name: "farColor",
                          type: "string",
                          default: '"#5b2bd9"',
                          description: "Colour of the farthest motes.",
                        },
                        {
                          name: "grain",
                          type: "number",
                          default: "0.04",
                          description: "Film grain strength, 0 to 1.",
                        },
                        {
                          name: "grainRate",
                          type: "number",
                          default: "24",
                          description: "Grain refreshes per second.",
                        },
                        {
                          name: "vignette",
                          type: "number",
                          default: "0.25",
                          description: "Corner darkening, 0 to 1.",
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
                          description:
                            "Let the pointer push motes out of the way.",
                        },
                        {
                          name: "cursorPush",
                          type: "number",
                          default: "0.12",
                          description: "How far motes are pushed.",
                        },
                        {
                          name: "cursorRadius",
                          type: "number",
                          default: "0.35",
                          description: "Reach of that push.",
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
                          description:
                            "Content layered above the particle field.",
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
