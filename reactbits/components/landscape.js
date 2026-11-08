/* ReactBits Pro public preview module 39396 for landscape.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/39396.6e517d31f921a301.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  39396: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => b }));
    var i = a(95155),
      n = a(12115),
      r = a(30701),
      l = a(56388),
      u = a(90761),
      o = a(81712),
      s = a(3907),
      d = a(2253),
      c = a(90650);
    let f = `
varying vec2 vPlane;

void main() {
  vPlane = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,
      m = (e, t) => {
        let a = new d.Q1f();
        try {
          a.setStyle(e, d.Zr2);
        } catch {
          a.setStyle(t, d.Zr2);
        }
        return a;
      },
      p = (e, t) => {
        try {
          e.setStyle(t, d.Zr2);
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
      g = () => window.devicePixelRatio || 1,
      x = ({
        speed: e,
        altitude: t,
        focal: a,
        pitch: r,
        elevation: l,
        scale: u,
        detail: s,
        steps: c,
        samples: v,
        distance: g,
        fogStart: x,
        rampDistance: y,
        color: C,
        midColor: b,
        farColor: S,
        rimColor: w,
        rimPower: R,
        rimStrength: j,
        ringColor: k,
        ringSpacing: M,
        ringSpeed: P,
        ringWidth: G,
        ringStrength: E,
        gain: F,
        grain: D,
        grainRate: z,
        vignette: N,
        backgroundColor: W,
        opacity: I,
        cursorInteraction: B,
        cursorSteer: H,
        paused: A,
        adaptiveQuality: L,
        targetFps: O,
        ceiling: q,
        readPointer: T,
      }) => {
        let V = (0, n.useRef)(null),
          _ = (0, n.useRef)(0),
          U = (0, n.useRef)({ x: 0, y: 0 }),
          X = (0, n.useRef)({ frames: 0, span: 0, wins: 0, cap: 4 }),
          { gl: Z, size: $ } = (0, o.C)(),
          Q = Math.round(h(c, 24, 200)),
          Y = Math.round(h(v, 1, 4)),
          J = (0, n.useMemo)(
            () => `
precision highp float;

varying vec2 vPlane;

uniform vec2 uCanvas;
uniform float uClock;
uniform float uSpeed;
uniform float uAltitude;
uniform float uFocal;
uniform float uPitch;
uniform float uElevation;
uniform float uScale;
uniform float uDetail;
uniform float uDistance;
uniform float uFogStart;
uniform float uRamp;
uniform vec3 uNearC;
uniform vec3 uMidC;
uniform vec3 uFarC;
uniform vec3 uRim;
uniform float uRimPower;
uniform float uRimGain;
uniform vec3 uRingC;
uniform float uRingSpacing;
uniform float uRingSpeed;
uniform float uRingWidth;
uniform float uRingGain;
uniform float uGain;
uniform float uGrain;
uniform float uGrainRate;
uniform float uVignette;
uniform vec3 uBackdrop;
uniform float uBackdropAlpha;
uniform float uOpacity;
uniform vec2 uSteer;

float shuffle(vec2 seed) {
  vec3 drift = fract(vec3(seed.xyx) * vec3(0.1031, 0.1030, 0.0973));
  drift += dot(drift, drift.yzx + 33.33);
  return fract((drift.x + drift.y) * drift.z);
}

float swell(vec2 p) {
  vec2 base = floor(p);
  vec2 slide = fract(p);
  slide = slide * slide * (3.0 - 2.0 * slide);
  float a = shuffle(base);
  float b = shuffle(base + vec2(1.0, 0.0));
  float c = shuffle(base + vec2(0.0, 1.0));
  float d = shuffle(base + vec2(1.0, 1.0));
  return mix(mix(a, b, slide.x), mix(c, d, slide.x), slide.y);
}

float terrain(vec2 p) {
  mat2 twist = mat2(0.86, 0.51, -0.51, 0.86);
  vec2 q = p * uScale;
  float lift = swell(q) * 1.0;
  q = twist * q * 2.64;
  lift += swell(q) * 0.32 * uDetail;
  q = twist * q * 2.31;
  lift += swell(q) * 0.08 * uDetail;
  return lift * uElevation;
}

float softClip(float x) {
  float fall = exp(-2.0 * max(x, 0.0));
  return (1.0 - fall) / (1.0 + fall);
}

vec4 trace(vec2 field) {
  float t = uClock;

  vec3 eye = vec3(uSteer.x * 6.0, uAltitude, t * uSpeed * 3.0);

  vec3 dir = normalize(vec3(field, uFocal));

  float tilt = uPitch + uSteer.y * 0.25;
  float ct = cos(tilt);
  float st = sin(tilt);
  dir.yz = mat2(ct, -st, st, ct) * dir.yz;

  float yaw = uSteer.x * 0.35;
  float cy = cos(yaw);
  float sy = sin(yaw);
  dir.xz = mat2(cy, -sy, sy, cy) * dir.xz;

  float travelled = 0.4;
  float back = travelled;
  float landed = -1.0;
  float stride = 0.08;

  for (int i = 0; i < ${Q}; i++) {
    vec3 probe = eye + dir * travelled;
    float gap = probe.y - terrain(probe.xz);
    if (gap < 0.0) {
      landed = travelled;
      break;
    }
    back = travelled;
    travelled += max(gap * 0.55, stride);
    stride *= 1.035;
    if (travelled > uDistance) break;
  }

  if (landed <= 0.0) return vec4(0.0);

  float low = back;
  float high = landed;
  for (int j = 0; j < 6; j++) {
    float mid = 0.5 * (low + high);
    vec3 probe = eye + dir * mid;
    if (probe.y - terrain(probe.xz) < 0.0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  float depth = high;
  vec3 spot = eye + dir * depth;

  float nudge = 0.0025 * max(depth, 1.0);
  float slopeX =
    terrain(spot.xz + vec2(nudge, 0.0)) - terrain(spot.xz - vec2(nudge, 0.0));
  float slopeZ =
    terrain(spot.xz + vec2(0.0, nudge)) - terrain(spot.xz - vec2(0.0, nudge));
  vec3 normal = normalize(vec3(-slopeX, 2.0 * nudge, -slopeZ));

  float ramp = clamp(depth / max(uRamp, 0.001), 0.0, 1.0);
  vec3 base = ramp < 0.5
    ? mix(uNearC, uMidC, smoothstep(0.0, 1.0, ramp * 2.0))
    : mix(uMidC, uFarC, smoothstep(0.0, 1.0, (ramp - 0.5) * 2.0));

  float facing = clamp(dot(normal, -dir), 0.0, 1.0);
  base += uRim * pow(1.0 - facing, uRimPower) * uRimGain;

  float wave = sin(depth * uRingSpacing - t * uRingSpeed);
  float ring = smoothstep(1.0 - max(uRingWidth, 0.001), 1.0, wave);
  base += uRingC * ring * uRingGain;

  base = vec3(
    softClip(base.r * uGain),
    softClip(base.g * uGain),
    softClip(base.b * uGain)
  );

  float haze = smoothstep(uFogStart, uDistance, depth);
  float solid = 1.0 - haze;

  return vec4(base * solid, solid);
}

void main() {
  vec2 pixel = vPlane * uCanvas;
  vec2 field = (pixel - 0.5 * uCanvas) / max(uCanvas.y, 1.0);
  float texel = 1.0 / max(uCanvas.y, 1.0);

  vec4 acc = vec4(0.0);
${(Y <= 1
  ? [[0, 0]]
  : 2 === Y
    ? [
        [-0.25, 0.25],
        [0.25, -0.25],
      ]
    : 3 === Y
      ? [
          [0, -0.3],
          [-0.28, 0.18],
          [0.28, 0.18],
        ]
      : [
          [-0.375, -0.125],
          [-0.125, 0.375],
          [0.125, -0.375],
          [0.375, 0.125],
        ]
)
  .map(
    ([e, t]) =>
      `  acc += trace(field + vec2(${e.toFixed(3)}, ${t.toFixed(3)}) * texel);`,
  )
  .join("\n")}
  acc /= ${Y}.0;

  float rest = uBackdropAlpha * (1.0 - acc.a);
  vec3 rgb = acc.rgb + uBackdrop * rest;
  float alpha = acc.a + rest;

  float vig = smoothstep(1.4, 0.25, length(field));
  float shade = (1.0 - uVignette) + uVignette * vig;
  rgb *= shade;
  alpha *= shade;

  float tick = floor(uClock * max(uGrainRate, 1.0));
  float speck = shuffle(pixel + tick * 17.0) - 0.5;
  float sparkle = shuffle(pixel * 1.37 + tick * 5.11) - 0.5;
  rgb += speck * uGrain * (0.25 + 0.75 * alpha);
  rgb += sparkle * 0.0035;
  rgb = clamp(rgb, vec3(0.0), vec3(alpha));

  gl_FragColor = vec4(rgb, alpha) * uOpacity;
}
`,
            [Q, Y],
          ),
          K = (0, n.useMemo)(
            () => ({
              uCanvas: { value: new d.I9Y(1, 1) },
              uClock: { value: 0 },
              uSpeed: { value: 1 },
              uAltitude: { value: 5.5 },
              uFocal: { value: 1.2 },
              uPitch: { value: 0 },
              uElevation: { value: 3.2 },
              uScale: { value: 0.15 },
              uDetail: { value: 1 },
              uDistance: { value: 42 },
              uFogStart: { value: 22 },
              uRamp: { value: 35 },
              uNearC: { value: m("#2e1065", "#2e1065") },
              uMidC: { value: m("#0a0a0a", "#0a0a0a") },
              uFarC: { value: m("#d946ef", "#d946ef") },
              uRim: { value: m("#f0abfc", "#f0abfc") },
              uRimPower: { value: 4 },
              uRimGain: { value: 1.2 },
              uRingC: { value: m("#a855f7", "#a855f7") },
              uRingSpacing: { value: 0.5 },
              uRingSpeed: { value: 2.5 },
              uRingWidth: { value: 0.04 },
              uRingGain: { value: 0.4 },
              uGain: { value: 1 },
              uGrain: { value: 0.05 },
              uGrainRate: { value: 24 },
              uVignette: { value: 0.2 },
              uBackdrop: { value: m("#0a0a0a", "#0a0a0a") },
              uBackdropAlpha: { value: 1 },
              uOpacity: { value: 1 },
              uSteer: { value: new d.I9Y(0, 0) },
            }),
            [],
          );
        return (
          (0, n.useEffect)(() => {
            let e = V.current;
            e && ((e.fragmentShader = J), (e.needsUpdate = !0));
          }, [J]),
          (0, n.useEffect)(() => {
            let e = V.current;
            if (!e) return;
            (p(e.uniforms.uNearC.value, C),
              p(e.uniforms.uMidC.value, b),
              p(e.uniforms.uFarC.value, S),
              p(e.uniforms.uRim.value, w),
              p(e.uniforms.uRingC.value, k));
            let t = "transparent" === W || "none" === W || "" === W;
            ((e.uniforms.uBackdropAlpha.value = +!t),
              t || p(e.uniforms.uBackdrop.value, W));
          }, [C, b, S, w, k, W]),
          (0, o.D)((i, n) => {
            let o = V.current;
            if (!o) return;
            let d = Math.min(n, 0.05);
            A || (_.current += d);
            let c = Z.getPixelRatio(),
              f = o.uniforms;
            (f.uCanvas.value.set($.width * c, $.height * c),
              (f.uClock.value = _.current),
              (f.uSpeed.value = e),
              (f.uAltitude.value = t),
              (f.uFocal.value = Math.max(a, 0.2)),
              (f.uPitch.value = r),
              (f.uElevation.value = l),
              (f.uScale.value = u),
              (f.uDetail.value = s),
              (f.uDistance.value = Math.max(g, 4)),
              (f.uFogStart.value = Math.min(x, g - 1)),
              (f.uRamp.value = y),
              (f.uRimPower.value = R),
              (f.uRimGain.value = j),
              (f.uRingSpacing.value = M),
              (f.uRingSpeed.value = P),
              (f.uRingWidth.value = G),
              (f.uRingGain.value = E),
              (f.uGain.value = F),
              (f.uGrain.value = D),
              (f.uGrainRate.value = z),
              (f.uVignette.value = N),
              (f.uOpacity.value = I));
            let m = T(),
              p = 1 - Math.exp(-(3 * d)),
              h = B && m.inside ? H : 0,
              v = (2 * m.x - 1) * h,
              C = (2 * m.y - 1) * h;
            if (
              ((U.current.x += (v - U.current.x) * p),
              (U.current.y += (C - U.current.y) * p),
              f.uSteer.value.set(U.current.x, U.current.y),
              !L)
            )
              return;
            let b = X.current;
            if (((b.frames += 1), (b.span += n), b.span < 0.75)) return;
            let S = b.frames / b.span;
            ((b.frames = 0), (b.span = 0));
            let w = Math.min(q, b.cap);
            S < 0.85 * O && c > 0.6
              ? ((b.wins = 0),
                (b.cap = Math.max(0.6, 0.9 * c)),
                Z.setPixelRatio(Math.max(0.6, 0.75 * c)))
              : S > 0.98 * O && c < w - 0.01
                ? ((b.wins += 1),
                  b.wins >= 3 &&
                    ((b.wins = 0), Z.setPixelRatio(Math.min(w, 1.25 * c))))
                : (b.wins = 0);
          }),
          (0, i.jsxs)("mesh", {
            frustumCulled: !1,
            children: [
              (0, i.jsx)("planeGeometry", { args: [1, 1] }),
              (0, i.jsx)("shaderMaterial", {
                ref: V,
                vertexShader: f,
                fragmentShader: J,
                uniforms: K,
                transparent: !0,
                depthTest: !1,
                depthWrite: !1,
                premultipliedAlpha: !0,
              }),
            ],
          })
        );
      },
      y = ({
        speed: e = 1,
        altitude: t = 5.5,
        focal: a = 1.2,
        pitch: r = 0,
        elevation: l = 3.2,
        scale: u = 0.15,
        detail: o = 1,
        steps: d = 80,
        samples: f = 2,
        distance: m = 42,
        fogStart: p = 22,
        rampDistance: y = 35,
        color: C = "#2e1065",
        midColor: b = "#0a0a0a",
        farColor: S = "#d946ef",
        rimColor: w = "#f0abfc",
        rimPower: R = 4,
        rimStrength: j = 1.2,
        ringColor: k = "#a855f7",
        ringSpacing: M = 0.5,
        ringSpeed: P = 2.5,
        ringWidth: G = 0.04,
        ringStrength: E = 0.4,
        gain: F = 1,
        grain: D = 0.05,
        grainRate: z = 24,
        vignette: N = 0.2,
        backgroundColor: W = "#0a0a0a",
        opacity: I = 1,
        cursorInteraction: B = !0,
        cursorSteer: H = 0.5,
        paused: A = !1,
        adaptiveQuality: L = !0,
        targetFps: O = 60,
        dpr: q = 1.75,
        className: T,
        children: V,
      }) => {
        let _ = (0, n.useRef)(null),
          U = (0, n.useRef)({ x: 0.5, y: 0.5, inside: !1 }),
          [X, Z] = (0, n.useState)(!0),
          $ = Math.min(
            (0, n.useSyncExternalStore)(v, g, () => 1),
            Math.max(q, 0.5),
          ),
          Q = (0, n.useCallback)(() => U.current, []);
        return (
          (0, n.useEffect)(() => {
            let e = _.current;
            if (!e || "undefined" == typeof IntersectionObserver) return;
            let t = new IntersectionObserver(([e]) => Z(e.isIntersecting), {
              threshold: 0,
            });
            return (t.observe(e), () => t.disconnect());
          }, []),
          (0, n.useEffect)(() => {
            let e = _.current;
            if (!e || !B) return;
            let t = (t) => {
                let a = e.getBoundingClientRect();
                a.width &&
                  a.height &&
                  ((U.current.x = h((t.clientX - a.left) / a.width, 0, 1)),
                  (U.current.y = h(1 - (t.clientY - a.top) / a.height, 0, 1)),
                  (U.current.inside = !0));
              },
              a = () => {
                U.current.inside = !1;
              };
            return (
              e.addEventListener("pointermove", t),
              e.addEventListener("pointerleave", a),
              () => {
                (e.removeEventListener("pointermove", t),
                  e.removeEventListener("pointerleave", a));
              }
            );
          }, [B]),
          (0, i.jsxs)("div", {
            ref: _,
            className: (0, c.cn)("relative overflow-hidden", T),
            children: [
              (0, i.jsx)("div", {
                className: "absolute inset-0",
                children: (0, i.jsx)(s.Hl, {
                  orthographic: !0,
                  dpr: $,
                  frameloop: X ? "always" : "demand",
                  gl: {
                    antialias: !1,
                    alpha: !0,
                    powerPreference: "high-performance",
                  },
                  children: (0, i.jsx)(x, {
                    speed: e,
                    altitude: t,
                    focal: a,
                    pitch: r,
                    elevation: l,
                    scale: u,
                    detail: o,
                    steps: d,
                    samples: f,
                    distance: m,
                    fogStart: p,
                    rampDistance: y,
                    color: C,
                    midColor: b,
                    farColor: S,
                    rimColor: w,
                    rimPower: R,
                    rimStrength: j,
                    ringColor: k,
                    ringSpacing: M,
                    ringSpeed: P,
                    ringWidth: G,
                    ringStrength: E,
                    gain: F,
                    grain: D,
                    grainRate: z,
                    vignette: N,
                    backgroundColor: W,
                    opacity: I,
                    cursorInteraction: B,
                    cursorSteer: H,
                    paused: A,
                    adaptiveQuality: L,
                    targetFps: O,
                    ceiling: $,
                    readPointer: Q,
                  }),
                }),
              }),
              V
                ? (0, i.jsx)("div", {
                    className: "relative z-10 h-full w-full",
                    children: V,
                  })
                : null,
            ],
          })
        );
      },
      C = () => () => {},
      b = () => {
        let [e, t] = (0, u.I)(),
          { resolvedTheme: a } = (0, r.D)(),
          o =
            (0, n.useSyncExternalStore)(
              C,
              () => !0,
              () => !1,
            ) && "dark" === a,
          [s, d] = (0, n.useState)(1),
          [c, f] = (0, n.useState)(5.5),
          [m, p] = (0, n.useState)(1.2),
          [h, v] = (0, n.useState)(0),
          [g, x] = (0, n.useState)(3.2),
          [b, S] = (0, n.useState)(0.15),
          [w, R] = (0, n.useState)(1),
          [j, k] = (0, n.useState)(80),
          [M, P] = (0, n.useState)(2),
          [G, E] = (0, n.useState)(42),
          [F, D] = (0, n.useState)(22),
          [z, N] = (0, n.useState)(35),
          [W, I] = (0, n.useState)(4),
          [B, H] = (0, n.useState)(1.2),
          [A, L] = (0, n.useState)(0.5),
          [O, q] = (0, n.useState)(2.5),
          [T, V] = (0, n.useState)(0.04),
          [_, U] = (0, n.useState)(0.4),
          [X, Z] = (0, n.useState)(1),
          [$, Q] = (0, n.useState)(0.05),
          [Y, J] = (0, n.useState)(0.2),
          [K, ee] = (0, n.useState)(1),
          [et, ea] = (0, n.useState)(!0),
          [ei, en] = (0, n.useState)(0.5),
          [er, el] = (0, n.useState)(!1),
          [eu, eo] = (0, n.useState)(null),
          [es, ed] = (0, n.useState)(null),
          [ec, ef] = (0, n.useState)(null),
          [em, ep] = (0, n.useState)(null),
          [eh, ev] = (0, n.useState)(null),
          [eg, ex] = (0, n.useState)(null),
          ey = (0, n.useMemo)(
            () => (null !== eu ? eu : o ? "#2e1065" : "#b0a0e8"),
            [o, eu],
          ),
          eC = (0, n.useMemo)(
            () => (null !== es ? es : o ? "#0a0a0a" : "#eeeaf6"),
            [o, es],
          ),
          eb = (0, n.useMemo)(
            () => (null !== ec ? ec : o ? "#d946ef" : "#f0a8d4"),
            [o, ec],
          ),
          eS = (0, n.useMemo)(
            () => (null !== em ? em : o ? "#f0abfc" : "#d9b8f0"),
            [o, em],
          ),
          ew = (0, n.useMemo)(
            () => (null !== eh ? eh : o ? "#a855f7" : "#c9a8f0"),
            [o, eh],
          ),
          eR = (0, n.useMemo)(
            () => (null !== eg ? eg : o ? "#0a0a0a" : "#ffffff"),
            [o, eg],
          );
        return (0, i.jsxs)("div", {
          children: [
            (0, i.jsx)(l.Bg, {}),
            (0, i.jsxs)(l.VX, {
              children: [
                (0, i.jsxs)(l.Ec, {
                  children: [
                    (0, i.jsx)(l.Ch, {
                      onRefresh: t,
                      minHeight: 520,
                      children: (0, i.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, i.jsx)(
                          y,
                          {
                            className: "h-full w-full",
                            speed: s,
                            altitude: c,
                            focal: m,
                            pitch: h,
                            elevation: g,
                            scale: b,
                            detail: w,
                            steps: j,
                            samples: M,
                            distance: G,
                            fogStart: F,
                            rampDistance: z,
                            color: ey,
                            midColor: eC,
                            farColor: eb,
                            rimColor: eS,
                            rimPower: W,
                            rimStrength: B,
                            ringColor: ew,
                            ringSpacing: A,
                            ringSpeed: O,
                            ringWidth: T,
                            ringStrength: _,
                            gain: X,
                            grain: $,
                            vignette: Y,
                            backgroundColor: eR,
                            opacity: K,
                            cursorInteraction: et,
                            cursorSteer: ei,
                            paused: er,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, i.jsxs)(l.IH, {
                      children: [
                        (0, i.jsx)(l.yt, {
                          title: "Speed",
                          min: 0,
                          max: 4,
                          step: 0.05,
                          value: s,
                          onChange: d,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Altitude",
                          min: 0.5,
                          max: 12,
                          step: 0.1,
                          value: c,
                          onChange: f,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Focal",
                          min: 0.4,
                          max: 3,
                          step: 0.05,
                          value: m,
                          onChange: p,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Pitch",
                          min: -0.6,
                          max: 0.6,
                          step: 0.01,
                          value: h,
                          onChange: v,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Elevation",
                          min: 0,
                          max: 8,
                          step: 0.1,
                          value: g,
                          onChange: x,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Scale",
                          min: 0.03,
                          max: 0.5,
                          step: 0.005,
                          value: b,
                          onChange: S,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Detail",
                          min: 0,
                          max: 2.5,
                          step: 0.05,
                          value: w,
                          onChange: R,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Steps",
                          min: 32,
                          max: 180,
                          step: 4,
                          value: j,
                          onChange: k,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Samples",
                          min: 1,
                          max: 4,
                          step: 1,
                          value: M,
                          onChange: P,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Distance",
                          min: 12,
                          max: 90,
                          step: 1,
                          value: G,
                          onChange: E,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Fog Start",
                          min: 2,
                          max: 80,
                          step: 1,
                          value: F,
                          onChange: D,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Ramp Distance",
                          min: 5,
                          max: 90,
                          step: 1,
                          value: z,
                          onChange: N,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Rim Power",
                          min: 1,
                          max: 12,
                          step: 0.2,
                          value: W,
                          onChange: I,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Rim Strength",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: B,
                          onChange: H,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Ring Spacing",
                          min: 0,
                          max: 2,
                          step: 0.02,
                          value: A,
                          onChange: L,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Ring Speed",
                          min: 0,
                          max: 8,
                          step: 0.1,
                          value: O,
                          onChange: q,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Ring Width",
                          min: 0.005,
                          max: 0.4,
                          step: 0.005,
                          value: T,
                          onChange: V,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Ring Strength",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: _,
                          onChange: U,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Gain",
                          min: 0.1,
                          max: 3,
                          step: 0.05,
                          value: X,
                          onChange: Z,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Grain",
                          min: 0,
                          max: 0.3,
                          step: 0.005,
                          value: $,
                          onChange: Q,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Vignette",
                          min: 0,
                          max: 1,
                          step: 0.02,
                          value: Y,
                          onChange: J,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Cursor Steer",
                          min: 0,
                          max: 1.5,
                          step: 0.05,
                          value: ei,
                          onChange: en,
                        }),
                        (0, i.jsx)(l.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: K,
                          onChange: ee,
                        }),
                        (0, i.jsx)(l.W7, {
                          title: "Near Color",
                          value: ey,
                          onChange: eo,
                        }),
                        (0, i.jsx)(l.W7, {
                          title: "Mid Color",
                          value: eC,
                          onChange: ed,
                        }),
                        (0, i.jsx)(l.W7, {
                          title: "Far Color",
                          value: eb,
                          onChange: ef,
                        }),
                        (0, i.jsx)(l.W7, {
                          title: "Rim Color",
                          value: eS,
                          onChange: ep,
                        }),
                        (0, i.jsx)(l.W7, {
                          title: "Ring Color",
                          value: ew,
                          onChange: ev,
                        }),
                        (0, i.jsx)(l.W7, {
                          title: "Sky",
                          value: eR,
                          onChange: ex,
                        }),
                        (0, i.jsx)(l.tl, {
                          title: "Cursor Interaction",
                          checked: et,
                          onChange: ea,
                        }),
                        (0, i.jsx)(l.tl, {
                          title: "Paused",
                          checked: er,
                          onChange: el,
                        }),
                      ],
                    }),
                    (0, i.jsx)(l.Ub, {
                      data: [
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description: "How fast the camera flies forward.",
                        },
                        {
                          name: "altitude",
                          type: "number",
                          default: "5.5",
                          description: "Camera height above sea level.",
                        },
                        {
                          name: "focal",
                          type: "number",
                          default: "1.2",
                          description:
                            "Field of view, lower is more telephoto.",
                        },
                        {
                          name: "pitch",
                          type: "number",
                          default: "0",
                          description:
                            "Downward tilt of the camera, in radians.",
                        },
                        {
                          name: "elevation",
                          type: "number",
                          default: "3.2",
                          description: "Height of the terrain.",
                        },
                        {
                          name: "scale",
                          type: "number",
                          default: "0.15",
                          description:
                            "Size of the landforms, lower is broader.",
                        },
                        {
                          name: "detail",
                          type: "number",
                          default: "1",
                          description:
                            "How much fine detail rides on top of the landforms.",
                        },
                        {
                          name: "steps",
                          type: "number",
                          default: "80",
                          description:
                            "Ray marching steps, higher is cleaner and slower.",
                        },
                        {
                          name: "samples",
                          type: "number",
                          default: "2",
                          description:
                            "Samples per pixel used to smooth the silhouette, 1 to 4.",
                        },
                        {
                          name: "distance",
                          type: "number",
                          default: "42",
                          description: "How far the camera can see.",
                        },
                        {
                          name: "fogStart",
                          type: "number",
                          default: "22",
                          description:
                            "Distance at which the terrain starts dissolving into the sky.",
                        },
                        {
                          name: "rampDistance",
                          type: "number",
                          default: "35",
                          description:
                            "Distance over which the depth gradient completes.",
                        },
                        {
                          name: "color",
                          type: "string",
                          default: '"#2e1065"',
                          description: "Colour of the nearest ground.",
                        },
                        {
                          name: "midColor",
                          type: "string",
                          default: '"#0a0a0a"',
                          description: "Colour of the middle distance.",
                        },
                        {
                          name: "farColor",
                          type: "string",
                          default: '"#d946ef"',
                          description: "Colour of the far ground.",
                        },
                        {
                          name: "rimColor",
                          type: "string",
                          default: '"#f0abfc"',
                          description:
                            "Colour of the light catching the ridges.",
                        },
                        {
                          name: "rimPower",
                          type: "number",
                          default: "4",
                          description:
                            "How tightly the rim clings to the crests.",
                        },
                        {
                          name: "rimStrength",
                          type: "number",
                          default: "1.2",
                          description: "Brightness of the rim.",
                        },
                        {
                          name: "ringColor",
                          type: "string",
                          default: '"#a855f7"',
                          description:
                            "Colour of the scanner rings sweeping outward.",
                        },
                        {
                          name: "ringSpacing",
                          type: "number",
                          default: "0.5",
                          description: "How close together the rings are.",
                        },
                        {
                          name: "ringSpeed",
                          type: "number",
                          default: "2.5",
                          description: "How fast the rings travel.",
                        },
                        {
                          name: "ringWidth",
                          type: "number",
                          default: "0.04",
                          description: "Thickness of each ring.",
                        },
                        {
                          name: "ringStrength",
                          type: "number",
                          default: "0.4",
                          description: "Brightness of the rings.",
                        },
                        {
                          name: "gain",
                          type: "number",
                          default: "1",
                          description:
                            "Overall brightness before the highlight rolloff.",
                        },
                        {
                          name: "grain",
                          type: "number",
                          default: "0.05",
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
                          default: "0.2",
                          description: "Corner darkening, 0 to 1.",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"#0a0a0a"',
                          description:
                            'Sky colour, or "transparent" to show the page through.',
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
                          description: "Let the pointer steer the camera.",
                        },
                        {
                          name: "cursorSteer",
                          type: "number",
                          default: "0.5",
                          description:
                            "How far the pointer swings the heading.",
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
                          description: "Content layered above the terrain.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, i.jsx)(l.lT, { children: (0, i.jsx)(l.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
