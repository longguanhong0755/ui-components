/* ReactBits Pro public preview module 5307 for spectral-clouds.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/5307.06effaf86bd124b1.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  5307: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => b }));
    var r = a(95155),
      l = a(12115),
      n = a(30701),
      o = a(56388),
      s = a(90761),
      u = a(81712),
      i = a(3907),
      c = a(2253),
      f = a(90650);
    let m = `
varying vec2 vPlane;

void main() {
  vPlane = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,
      d = (e, t) => {
        let a = new c.Q1f();
        try {
          a.setStyle(e, c.Zr2);
        } catch {
          a.setStyle(t, c.Zr2);
        }
        return a;
      },
      p = (e, t) => {
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
        steps: t,
        octaves: a,
        focal: n,
        swirl: o,
        swirlFalloff: s,
        waveAmp: i,
        waveFreq: f,
        waveLapse: h,
        waveSpeed: x,
        thickness: y,
        softness: g,
        passthrough: w,
        sky: b,
        reach: S,
        density: C,
        spectrum: j,
        colorWave: k,
        colorSpeed: W,
        colorTwist: F,
        color: P,
        highlightColor: M,
        bloom: H,
        bloomPower: B,
        grain: R,
        grainRate: E,
        vignette: T,
        backgroundColor: q,
        opacity: L,
        cursorInteraction: A,
        cursorSteer: I,
        paused: N,
        adaptiveQuality: G,
        targetFps: z,
        maxFps: D,
        ceiling: O,
        readPointer: V,
      }) => {
        let U = (0, l.useRef)(null),
          _ = (0, l.useRef)(0),
          Q = (0, l.useRef)({ x: 0, y: 0 }),
          X = (0, l.useRef)({ frames: 0, span: 0, wins: 0, cap: 4 }),
          { gl: Y, size: Z, invalidate: $ } = (0, u.C)(),
          J = Math.round(v(t, 16, 90)),
          K = Math.round(v(a, 1, 6)),
          ee = (0, l.useMemo)(
            () => `
precision highp float;

varying vec2 vPlane;

uniform vec2 uCanvas;
uniform float uClock;
uniform float uFocal;
uniform float uSwirl;
uniform float uSwirlFall;
uniform float uWaveAmp;
uniform float uWaveFreq;
uniform float uWaveLapse;
uniform float uWaveSpeed;
uniform float uThickness;
uniform float uSoftness;
uniform float uPass;
uniform float uSky;
uniform float uReach;
uniform float uDensity;
uniform float uSpectrum;
uniform float uColorWave;
uniform float uColorSpeed;
uniform float uColorTwist;
uniform vec3 uTint;
uniform vec3 uHighlight;
uniform float uBloom;
uniform float uBloomPower;
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

float softClip(float x) {
  float fall = exp(-2.0 * max(x, 0.0));
  return (1.0 - fall) / (1.0 + fall);
}

void main() {
  vec2 pixel = vPlane * uCanvas;
  vec2 field = (pixel - 0.5 * uCanvas) / max(uCanvas.y, 1.0);

  float t = uClock;

  vec3 dir = normalize(vec3(field + uSteer, -uFocal));

  vec3 flow = vec3(uWaveSpeed) * t;
  float spin = sin(t * uSwirl * 0.4) * 2.6;
  float lapse = max(uWaveLapse, 1.01);
  float unlapse = 1.0 / lapse;
  float soft = max(uSoftness, 0.0004);
  float bandWidth = max(uThickness, 0.001);

  float sway = sin(t * uColorSpeed * 0.5) * 1.4;

  float travel = 0.0;
  float density = 0.0;
  float wave = 0.0;
  float quad = 0.0;

  for (int i = 0; i < ${J}; i++) {
    vec3 probe = travel * dir;

    float pull = exp(-length(probe.xy) * uSwirlFall);
    if (pull > 0.004) {
      float turn = spin * pull;
      float cs = cos(turn);
      float sn = sin(turn);
      probe.xy = mix(probe.xy, mat2(cs, sn, -sn, cs) * probe.xy, pull);
    }

    float freq = max(uWaveFreq, 0.05);
    float unfreq = 1.0 / freq;
    for (int j = 0; j < ${K}; j++) {
      probe += (uWaveAmp * unfreq) * sin(probe * freq - flow).yzx;
      freq *= lapse;
      unfreq *= unlapse;
    }

    float slab = bandWidth - abs(probe.y);
    float stride = soft + max(slab, -slab * uPass) * 0.25;
    float lift = exp(slab * uSky) / stride;

    float phase =
      uColorWave * slab +
      dot(probe, vec3(1.0, -0.5, 0.7)) * uColorTwist +
      sway;

    density += lift;
    wave += cos(phase) * lift;
    quad += sin(phase) * lift;

    travel += stride;
    if (travel > uReach) break;
  }

  vec3 energy =
    0.5 * density +
    0.5 * (wave * vec3(1.0, 0.0707372, -0.9709582) +
           quad * vec3(0.0, 0.9974950, 0.2392493));

  vec3 lit = energy * (soft / ${J}.0) * uDensity * vec3(1.5, 0.42, 2.05);
  vec3 hot = vec3(
    softClip(lit.r * lit.r),
    softClip(lit.g * lit.g),
    softClip(lit.b * lit.b)
  );

  float mass = max(max(hot.r, hot.g), hot.b);
  vec3 hue = hot / max(mass, 1e-4);
  vec3 tone = mix(vec3(1.0), hue, clamp(uSpectrum, 0.0, 1.0)) * uTint;
  tone += uHighlight * uBloom * pow(mass, max(uBloomPower, 0.1));

  vec3 rgb = tone * mass;
  float rest = uBackdropAlpha * (1.0 - mass);
  rgb += uBackdrop * rest;
  float alpha = mass + rest;

  float vig = smoothstep(1.4, 0.25, length(field));
  float shade = (1.0 - uVignette) + uVignette * vig;
  rgb *= shade;
  alpha *= shade;

  float tick = floor(uClock * max(uGrainRate, 1.0));
  float speck = shuffle(pixel + tick * 17.0) - 0.5;
  rgb += speck * uGrain * (0.25 + 0.75 * alpha);
  rgb = clamp(rgb, vec3(0.0), vec3(alpha));

  gl_FragColor = vec4(rgb, alpha) * uOpacity;
}
`,
            [J, K],
          ),
          et = (0, l.useMemo)(
            () => ({
              uCanvas: { value: new c.I9Y(1, 1) },
              uClock: { value: 0 },
              uFocal: { value: 1 },
              uSwirl: { value: 0.6 },
              uSwirlFall: { value: 5 },
              uWaveAmp: { value: 0.5 },
              uWaveFreq: { value: 4 },
              uWaveLapse: { value: 1.6 },
              uWaveSpeed: { value: 0.3 },
              uThickness: { value: 0.25 },
              uSoftness: { value: 0.008 },
              uPass: { value: 0.15 },
              uSky: { value: 7 },
              uReach: { value: 3.2 },
              uDensity: { value: 1.2 },
              uSpectrum: { value: 0.85 },
              uColorWave: { value: 12 },
              uColorSpeed: { value: 0.3 },
              uColorTwist: { value: 1 },
              uTint: { value: d("#e9d5ff", "#e9d5ff") },
              uHighlight: { value: d("#f5d0fe", "#f5d0fe") },
              uBloom: { value: 0.35 },
              uBloomPower: { value: 3 },
              uGrain: { value: 0.035 },
              uGrainRate: { value: 24 },
              uVignette: { value: 0.25 },
              uBackdrop: { value: d("#0a0a0a", "#0a0a0a") },
              uBackdropAlpha: { value: 1 },
              uOpacity: { value: 1 },
              uSteer: { value: new c.I9Y(0, 0) },
            }),
            [],
          );
        return (
          (0, l.useEffect)(() => {
            let e = 1e3 / v(N ? 8 : D, 1, 240),
              t = 0,
              a = 0,
              r = (l) => {
                ((t = requestAnimationFrame(r)), l - a < e || ((a = l), $()));
              };
            return (
              (t = requestAnimationFrame(r)),
              () => cancelAnimationFrame(t)
            );
          }, [$, D, N]),
          (0, l.useEffect)(() => {
            let e = U.current;
            e && ((e.fragmentShader = ee), (e.needsUpdate = !0));
          }, [ee]),
          (0, l.useEffect)(() => {
            let e = U.current;
            if (!e) return;
            (p(e.uniforms.uTint.value, P), p(e.uniforms.uHighlight.value, M));
            let t = "transparent" === q || "none" === q || "" === q;
            ((e.uniforms.uBackdropAlpha.value = +!t),
              t || p(e.uniforms.uBackdrop.value, q));
          }, [P, M, q]),
          (0, u.D)((t, a) => {
            let r = U.current;
            if (!r) return;
            let l = Math.min(a, 0.05);
            N || (_.current += l * e);
            let u = Y.getPixelRatio(),
              c = r.uniforms;
            (c.uCanvas.value.set(Z.width * u, Z.height * u),
              (c.uClock.value = _.current),
              (c.uFocal.value = Math.max(n, 0.2)),
              (c.uSwirl.value = o),
              (c.uSwirlFall.value = Math.max(s, 0.1)),
              (c.uWaveAmp.value = i),
              (c.uWaveFreq.value = f),
              (c.uWaveLapse.value = h),
              (c.uWaveSpeed.value = x),
              (c.uThickness.value = y),
              (c.uSoftness.value = g),
              (c.uPass.value = w),
              (c.uSky.value = b),
              (c.uReach.value = Math.max(S, 0.3)),
              (c.uDensity.value = C),
              (c.uSpectrum.value = j),
              (c.uColorWave.value = k),
              (c.uColorSpeed.value = W),
              (c.uColorTwist.value = F),
              (c.uBloom.value = H),
              (c.uBloomPower.value = B),
              (c.uGrain.value = R),
              (c.uGrainRate.value = E),
              (c.uVignette.value = T),
              (c.uOpacity.value = L));
            let m = V(),
              d = 1 - Math.exp(-(3 * l)),
              p = A && m.inside ? I : 0,
              v = (2 * m.x - 1) * p,
              P = (2 * m.y - 1) * p;
            if (
              ((Q.current.x += (v - Q.current.x) * d),
              (Q.current.y += (P - Q.current.y) * d),
              c.uSteer.value.set(Q.current.x, Q.current.y),
              !G)
            )
              return;
            let M = X.current;
            if (((M.frames += 1), (M.span += a), M.span < 0.75)) return;
            let q = M.frames / M.span;
            ((M.frames = 0), (M.span = 0));
            let $ = Math.min(z, D),
              J = Math.min(O, M.cap);
            q < 0.85 * $ && u > 0.6
              ? ((M.wins = 0),
                (M.cap = Math.max(0.6, 0.9 * u)),
                Y.setPixelRatio(Math.max(0.6, 0.75 * u)))
              : q > 0.94 * $ && u < J - 0.01
                ? ((M.wins += 1),
                  M.wins >= 3 &&
                    ((M.wins = 0), Y.setPixelRatio(Math.min(J, 1.25 * u))))
                : (M.wins = 0);
          }),
          (0, r.jsxs)("mesh", {
            frustumCulled: !1,
            children: [
              (0, r.jsx)("planeGeometry", { args: [1, 1] }),
              (0, r.jsx)("shaderMaterial", {
                ref: U,
                vertexShader: m,
                fragmentShader: ee,
                uniforms: et,
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
        steps: t = 40,
        octaves: a = 4,
        focal: n = 1,
        swirl: o = 0.6,
        swirlFalloff: s = 5,
        waveAmp: u = 0.5,
        waveFreq: c = 4,
        waveLapse: m = 1.6,
        waveSpeed: d = 0.3,
        thickness: p = 0.25,
        softness: g = 0.008,
        passthrough: w = 0.15,
        sky: b = 7,
        reach: S = 3.2,
        density: C = 1.2,
        spectrum: j = 0.85,
        colorWave: k = 12,
        colorSpeed: W = 0.3,
        colorTwist: F = 1,
        color: P = "#e9d5ff",
        highlightColor: M = "#f5d0fe",
        bloom: H = 0.35,
        bloomPower: B = 3,
        grain: R = 0.035,
        grainRate: E = 24,
        vignette: T = 0.25,
        backgroundColor: q = "#0a0a0a",
        opacity: L = 1,
        cursorInteraction: A = !0,
        cursorSteer: I = 0.12,
        paused: N = !1,
        adaptiveQuality: G = !0,
        targetFps: z = 60,
        maxFps: D = 40,
        dpr: O = 1.1,
        className: V,
        children: U,
      }) => {
        let _ = (0, l.useRef)(null),
          Q = (0, l.useRef)({ x: 0.5, y: 0.5, inside: !1 }),
          [X, Y] = (0, l.useState)(!0),
          Z = Math.min(
            (0, l.useSyncExternalStore)(h, x, () => 1),
            Math.max(O, 0.5),
          ),
          $ = (0, l.useCallback)(() => Q.current, []);
        return (
          (0, l.useEffect)(() => {
            let e = _.current;
            if (!e || "undefined" == typeof IntersectionObserver) return;
            let t = new IntersectionObserver(([e]) => Y(e.isIntersecting), {
              threshold: 0,
            });
            return (t.observe(e), () => t.disconnect());
          }, []),
          (0, l.useEffect)(() => {
            let e = _.current;
            if (!e || !A) return;
            let t = (t) => {
                let a = e.getBoundingClientRect();
                a.width &&
                  a.height &&
                  ((Q.current.x = v((t.clientX - a.left) / a.width, 0, 1)),
                  (Q.current.y = v(1 - (t.clientY - a.top) / a.height, 0, 1)),
                  (Q.current.inside = !0));
              },
              a = () => {
                Q.current.inside = !1;
              };
            return (
              e.addEventListener("pointermove", t),
              e.addEventListener("pointerleave", a),
              () => {
                (e.removeEventListener("pointermove", t),
                  e.removeEventListener("pointerleave", a));
              }
            );
          }, [A]),
          (0, r.jsxs)("div", {
            ref: _,
            className: (0, f.cn)("relative overflow-hidden", V),
            children: [
              (0, r.jsx)("div", {
                className: "absolute inset-0",
                children: (0, r.jsx)(i.Hl, {
                  orthographic: !0,
                  dpr: Z,
                  frameloop: X ? "demand" : "never",
                  gl: {
                    antialias: !1,
                    alpha: !0,
                    powerPreference: "high-performance",
                  },
                  children: (0, r.jsx)(y, {
                    speed: e,
                    steps: t,
                    octaves: a,
                    focal: n,
                    swirl: o,
                    swirlFalloff: s,
                    waveAmp: u,
                    waveFreq: c,
                    waveLapse: m,
                    waveSpeed: d,
                    thickness: p,
                    softness: g,
                    passthrough: w,
                    sky: b,
                    reach: S,
                    density: C,
                    spectrum: j,
                    colorWave: k,
                    colorSpeed: W,
                    colorTwist: F,
                    color: P,
                    highlightColor: M,
                    bloom: H,
                    bloomPower: B,
                    grain: R,
                    grainRate: E,
                    vignette: T,
                    backgroundColor: q,
                    opacity: L,
                    cursorInteraction: A,
                    cursorSteer: I,
                    paused: N,
                    adaptiveQuality: G,
                    targetFps: z,
                    maxFps: D,
                    ceiling: Z,
                    readPointer: $,
                  }),
                }),
              }),
              U
                ? (0, r.jsx)("div", {
                    className: "relative z-10 h-full w-full",
                    children: U,
                  })
                : null,
            ],
          })
        );
      },
      w = () => () => {},
      b = () => {
        let [e, t] = (0, s.I)(),
          { resolvedTheme: a } = (0, n.D)(),
          u =
            (0, l.useSyncExternalStore)(
              w,
              () => !0,
              () => !1,
            ) && "dark" === a,
          [i, c] = (0, l.useState)(1),
          [f, m] = (0, l.useState)(40),
          [d, p] = (0, l.useState)(4),
          [v, h] = (0, l.useState)(1),
          [x, y] = (0, l.useState)(0.6),
          [b, S] = (0, l.useState)(5),
          [C, j] = (0, l.useState)(0.5),
          [k, W] = (0, l.useState)(4),
          [F, P] = (0, l.useState)(1.6),
          [M, H] = (0, l.useState)(0.3),
          [B, R] = (0, l.useState)(0.25),
          [E, T] = (0, l.useState)(0.008),
          [q, L] = (0, l.useState)(0.15),
          [A, I] = (0, l.useState)(7),
          [N, G] = (0, l.useState)(3.2),
          [z, D] = (0, l.useState)(0.85),
          [O, V] = (0, l.useState)(12),
          [U, _] = (0, l.useState)(0.3),
          [Q, X] = (0, l.useState)(1),
          [Y, Z] = (0, l.useState)(0.35),
          [$, J] = (0, l.useState)(3),
          [K, ee] = (0, l.useState)(0.035),
          [et, ea] = (0, l.useState)(0.25),
          [er, el] = (0, l.useState)(1),
          [en, eo] = (0, l.useState)(0.12),
          [es, eu] = (0, l.useState)(!0),
          [ei, ec] = (0, l.useState)(!1),
          [ef, em] = (0, l.useState)(null),
          [ed, ep] = (0, l.useState)(null),
          [ev, eh] = (0, l.useState)(null),
          [ex, ey] = (0, l.useState)(null),
          eg = (0, l.useMemo)(
            () => (null !== ef ? ef : u ? 1.2 : 0.8),
            [u, ef],
          ),
          ew = (0, l.useMemo)(
            () => (null !== ed ? ed : u ? "#e9d5ff" : "#7c3aed"),
            [u, ed],
          ),
          eb = (0, l.useMemo)(
            () => (null !== ev ? ev : u ? "#f5d0fe" : "#e879f9"),
            [u, ev],
          ),
          eS = (0, l.useMemo)(
            () => (null !== ex ? ex : u ? "#0a0a0a" : "#ffffff"),
            [u, ex],
          );
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(o.Bg, {}),
            (0, r.jsxs)(o.VX, {
              children: [
                (0, r.jsxs)(o.Ec, {
                  children: [
                    (0, r.jsx)(o.Ch, {
                      onRefresh: t,
                      minHeight: 520,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          g,
                          {
                            className: "h-full w-full",
                            speed: i,
                            steps: f,
                            octaves: d,
                            focal: v,
                            swirl: x,
                            swirlFalloff: b,
                            waveAmp: C,
                            waveFreq: k,
                            waveLapse: F,
                            waveSpeed: M,
                            thickness: B,
                            softness: E,
                            passthrough: q,
                            sky: A,
                            reach: N,
                            density: eg,
                            spectrum: z,
                            colorWave: O,
                            colorSpeed: U,
                            colorTwist: Q,
                            bloom: Y,
                            bloomPower: $,
                            grain: K,
                            vignette: et,
                            opacity: er,
                            cursorSteer: en,
                            color: ew,
                            highlightColor: eb,
                            backgroundColor: eS,
                            cursorInteraction: es,
                            paused: ei,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(o.IH, {
                      children: [
                        (0, r.jsx)(o.W7, {
                          title: "Cloud",
                          value: ew,
                          onChange: ep,
                        }),
                        (0, r.jsx)(o.W7, {
                          title: "Highlight",
                          value: eb,
                          onChange: eh,
                        }),
                        (0, r.jsx)(o.W7, {
                          title: "Background",
                          value: eS,
                          onChange: ey,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Speed",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: i,
                          onChange: c,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Steps",
                          min: 16,
                          max: 90,
                          step: 1,
                          value: f,
                          onChange: m,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Octaves",
                          min: 1,
                          max: 6,
                          step: 1,
                          value: d,
                          onChange: p,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Focal",
                          min: 0.3,
                          max: 2.5,
                          step: 0.05,
                          value: v,
                          onChange: h,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Swirl",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: x,
                          onChange: y,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Swirl falloff",
                          min: 1,
                          max: 14,
                          step: 0.5,
                          value: b,
                          onChange: S,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Wave amp",
                          min: 0,
                          max: 1.2,
                          step: 0.02,
                          value: C,
                          onChange: j,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Wave freq",
                          min: 1,
                          max: 10,
                          step: 0.25,
                          value: k,
                          onChange: W,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Wave lapse",
                          min: 1.1,
                          max: 2.6,
                          step: 0.05,
                          value: F,
                          onChange: P,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Wave speed",
                          min: 0,
                          max: 1.5,
                          step: 0.05,
                          value: M,
                          onChange: H,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Thickness",
                          min: 0.05,
                          max: 0.7,
                          step: 0.01,
                          value: B,
                          onChange: R,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Softness",
                          min: 0.002,
                          max: 0.03,
                          step: 0.001,
                          value: E,
                          onChange: T,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Passthrough",
                          min: 0,
                          max: 0.6,
                          step: 0.01,
                          value: q,
                          onChange: L,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Sky",
                          min: 2,
                          max: 14,
                          step: 0.25,
                          value: A,
                          onChange: I,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Reach",
                          min: 0.5,
                          max: 8,
                          step: 0.1,
                          value: N,
                          onChange: G,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Density",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: eg,
                          onChange: em,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Spectrum",
                          min: 0,
                          max: 1,
                          step: 0.02,
                          value: z,
                          onChange: D,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Color wave",
                          min: 0,
                          max: 30,
                          step: 0.5,
                          value: O,
                          onChange: V,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Color speed",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: U,
                          onChange: _,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Color twist",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: Q,
                          onChange: X,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Bloom",
                          min: 0,
                          max: 1.5,
                          step: 0.02,
                          value: Y,
                          onChange: Z,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Bloom power",
                          min: 0.5,
                          max: 10,
                          step: 0.25,
                          value: $,
                          onChange: J,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Grain",
                          min: 0,
                          max: 0.2,
                          step: 0.005,
                          value: K,
                          onChange: ee,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Vignette",
                          min: 0,
                          max: 1,
                          step: 0.02,
                          value: et,
                          onChange: ea,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.02,
                          value: er,
                          onChange: el,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Cursor steer",
                          min: 0,
                          max: 0.5,
                          step: 0.01,
                          value: en,
                          onChange: eo,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Cursor Interaction",
                          checked: es,
                          onChange: eu,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Paused",
                          checked: ei,
                          onChange: ec,
                        }),
                      ],
                    }),
                    (0, r.jsx)(o.Ub, {
                      data: [
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description: "How fast the cloud bank churns.",
                        },
                        {
                          name: "steps",
                          type: "number",
                          default: "40",
                          description:
                            "Volume samples per ray, higher is smoother and slower.",
                        },
                        {
                          name: "octaves",
                          type: "number",
                          default: "4",
                          description:
                            "Layers of turbulence folded into the volume, 1 to 6.",
                        },
                        {
                          name: "focal",
                          type: "number",
                          default: "1",
                          description:
                            "Field of view, lower is more telephoto.",
                        },
                        {
                          name: "swirl",
                          type: "number",
                          default: "0.6",
                          description:
                            "How fast the core winds and unwinds the cloud.",
                        },
                        {
                          name: "swirlFalloff",
                          type: "number",
                          default: "5",
                          description:
                            "How quickly the twist fades away from the core.",
                        },
                        {
                          name: "waveAmp",
                          type: "number",
                          default: "0.5",
                          description: "Depth of the turbulence folds.",
                        },
                        {
                          name: "waveFreq",
                          type: "number",
                          default: "4",
                          description:
                            "Size of the largest fold, higher is finer.",
                        },
                        {
                          name: "waveLapse",
                          type: "number",
                          default: "1.6",
                          description:
                            "How much finer each successive fold gets.",
                        },
                        {
                          name: "waveSpeed",
                          type: "number",
                          default: "0.3",
                          description: "How fast the folds travel.",
                        },
                        {
                          name: "thickness",
                          type: "number",
                          default: "0.25",
                          description: "Half height of the cloud slab.",
                        },
                        {
                          name: "softness",
                          type: "number",
                          default: "0.008",
                          description:
                            "Smallest step a ray may take, lower is sharper and slower.",
                        },
                        {
                          name: "passthrough",
                          type: "number",
                          default: "0.15",
                          description:
                            "How far rays coast once they leave the slab.",
                        },
                        {
                          name: "sky",
                          type: "number",
                          default: "7",
                          description:
                            "How sharply brightness falls off toward the edges of the slab.",
                        },
                        {
                          name: "reach",
                          type: "number",
                          default: "3.2",
                          description:
                            "How far a ray travels before it is abandoned.",
                        },
                        {
                          name: "density",
                          type: "number",
                          default: "1.2",
                          description: "Overall opacity of the cloud.",
                        },
                        {
                          name: "spectrum",
                          type: "number",
                          default: "0.85",
                          description:
                            "How much of the spectral rainbow shows through, 0 to 1.",
                        },
                        {
                          name: "colorWave",
                          type: "number",
                          default: "12",
                          description:
                            "How tightly the spectrum bands wrap the slab.",
                        },
                        {
                          name: "colorSpeed",
                          type: "number",
                          default: "0.3",
                          description:
                            "How fast the spectrum sways back and forth.",
                        },
                        {
                          name: "colorTwist",
                          type: "number",
                          default: "1",
                          description: "How much depth skews the spectrum.",
                        },
                        {
                          name: "bloom",
                          type: "number",
                          default: "0.35",
                          description: "Strength of the hot core.",
                        },
                        {
                          name: "bloomPower",
                          type: "number",
                          default: "3",
                          description:
                            "How tightly the hot core clings to the densest cloud.",
                        },
                        {
                          name: "grain",
                          type: "number",
                          default: "0.035",
                          description: "Film grain strength, 0 to 1.",
                        },
                        {
                          name: "vignette",
                          type: "number",
                          default: "0.25",
                          description: "Corner darkening, 0 to 1.",
                        },
                        {
                          name: "opacity",
                          type: "number",
                          default: "1",
                          description: "Master alpha.",
                        },
                        {
                          name: "cursorSteer",
                          type: "number",
                          default: "0.12",
                          description: "How far the pointer leans the view.",
                        },
                        {
                          name: "color",
                          type: "string",
                          default: '"#e9d5ff"',
                          description: "Colour the whole cloud is tinted with.",
                        },
                        {
                          name: "highlightColor",
                          type: "string",
                          default: '"#f5d0fe"',
                          description: "Colour of the hot core.",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"#0a0a0a"',
                          description:
                            'Backdrop colour, or "transparent" to show the page through.',
                        },
                        {
                          name: "grainRate",
                          type: "number",
                          default: "24",
                          description: "Grain refreshes per second.",
                        },
                        {
                          name: "cursorInteraction",
                          type: "boolean",
                          default: "true",
                          description: "Let the pointer lean the view.",
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
                          name: "maxFps",
                          type: "number",
                          default: "40",
                          description:
                            "Upper bound on rendered frames per second.",
                        },
                        {
                          name: "dpr",
                          type: "number",
                          default: "1.1",
                          description: "Upper device pixel ratio bound.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "-",
                          description: "Extra classes for the wrapper.",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "-",
                          description: "Content layered above the clouds.",
                        },
                      ],
                    }),
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
