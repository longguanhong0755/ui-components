/* ReactBits Pro public preview module 30188 for specter-orb.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/30188.a042a9434680e792.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  30188: (e, a, t) => {
    (t.r(a), t.d(a, { default: () => w }));
    var n = t(95155),
      l = t(12115),
      r = t(30701),
      o = t(56388),
      u = t(90761),
      i = t(81712),
      s = t(3907),
      c = t(2253),
      m = t(90650);
    let f = `
varying vec2 vPlane;

void main() {
  vPlane = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
      h = `
precision highp float;

varying vec2 vPlane;
uniform vec2 uCanvas;
uniform float uClock;
uniform float uCore;
uniform float uSwell;
uniform float uGrain;
uniform float uFlow;
uniform int uBands;
uniform float uDecay;
uniform float uClimb;
uniform float uNorm;
uniform int uSteps;
uniform float uStride;
uniform float uZoom;
uniform float uMaskRadius;
uniform float uMaskFeather;
uniform vec3 uInkA;
uniform vec3 uInkB;
uniform vec3 uInkC;
uniform float uRim;
uniform float uRimShape;
uniform vec3 uSheenA;
uniform vec3 uSheenB;
uniform float uSheen;
uniform float uSheenTight;
uniform float uHaze;
uniform float uHazeTight;
uniform float uGamma;
uniform float uGain;
uniform float uOpacity;
uniform vec3 uBackdrop;
uniform float uBackdropAlpha;
uniform vec2 uSwing;

const float SKIN = 0.002;

float spark(vec3 cell) {
  cell = fract(cell * 0.3183099 + vec3(0.71, 0.113, 0.419));
  cell *= 17.0;
  return fract(cell.x * cell.y * cell.z * (cell.x + cell.y + cell.z));
}

float wisp(vec3 spot) {
  vec3 anchor = floor(spot);
  vec3 lean = fract(spot);
  lean = lean * lean * (3.0 - 2.0 * lean);
  float n000 = spark(anchor + vec3(0.0, 0.0, 0.0));
  float n100 = spark(anchor + vec3(1.0, 0.0, 0.0));
  float n010 = spark(anchor + vec3(0.0, 1.0, 0.0));
  float n110 = spark(anchor + vec3(1.0, 1.0, 0.0));
  float n001 = spark(anchor + vec3(0.0, 0.0, 1.0));
  float n101 = spark(anchor + vec3(1.0, 0.0, 1.0));
  float n011 = spark(anchor + vec3(0.0, 1.0, 1.0));
  float n111 = spark(anchor + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, lean.x), mix(n010, n110, lean.x), lean.y),
    mix(mix(n001, n101, lean.x), mix(n011, n111, lean.x), lean.y),
    lean.z
  );
}

float shell(vec3 spot) {
  vec3 probe = spot * uGrain + vec3(0.0, 0.0, uClock * uFlow);
  float sum = 0.0;
  float amp = 1.0;
  for (int i = 0; i < 5; i++) {
    if (i >= uBands) break;
    sum += wisp(probe) * amp;
    probe *= uClimb;
    amp *= uDecay;
  }
  return sum * uNorm;
}

float field(vec3 spot) {
  return length(spot) - uCore - shell(spot) * uSwell;
}

vec3 slope(vec3 spot) {
  vec2 nudge = vec2(0.0025, 0.0);
  float here = field(spot);
  return normalize(
    here - vec3(
      field(spot - nudge.xyy),
      field(spot - nudge.yxy),
      field(spot - nudge.yyx)
    )
  );
}

float rimTerm(vec3 normal, vec3 ray, vec3 axis) {
  float lean = sqrt(max(dot(normal, axis), 0.0)) * 1.5 - dot(normal, -ray);
  return pow(max(lean, 0.0), uRimShape);
}

float gloss(vec3 toLight, vec3 toEye, vec3 normal, float tight) {
  vec3 between = normalize(toLight + toEye);
  return pow(max(dot(normal, between), 0.0), tight);
}

void main() {
  vec2 plane = (vPlane * 2.0 - 1.0) * vec2(uCanvas.x / max(uCanvas.y, 1.0), 1.0) / max(uZoom, 0.05);

  float span = length(plane);
  float disc = 1.0 - smoothstep(uMaskRadius - uMaskFeather, uMaskRadius, span);

  vec3 lit = vec3(0.0);

  if (disc > 0.0) {
    vec3 eye = vec3(0.0, 0.0, -1.0);
    vec3 ray = normalize(vec3(plane, 1.0));

    float hull = uCore + uSwell;
    float toward = dot(eye, ray);
    float gap = dot(eye, eye) - hull * hull;
    float root = toward * toward - gap;

    if (root < 0.0) {
      vec3 grazed = eye + ray * max(-toward, 0.0);
      float nearest = max(field(grazed), 0.0);
      vec3 wash = max(dot(plane, vec2(0.707)), 0.0) * uInkA
        + max(dot(plane, vec2(-0.707)), 0.0) * uInkB
        + uInkC;
      lit = pow(max(1.0 - nearest, 0.0), uHazeTight) * wash * uHaze;
    } else {
      float reach = sqrt(root);
      float travel = max(-toward - reach, 0.0);
      float limit = -toward + reach;
      float nearest = 1.0e9;
      bool struck = false;
      vec3 landed = eye + ray * travel;

      for (int i = 0; i < 96; i++) {
        if (i >= uSteps) break;
        vec3 at = eye + ray * travel;
        float march = field(at);
        nearest = min(nearest, march);
        if (march < SKIN) {
          struck = true;
          landed = at;
          break;
        }
        travel += max(march * uStride, SKIN);
        if (travel > limit) break;
      }

      if (!struck) {
        vec3 wash = max(dot(plane, vec2(0.707)), 0.0) * uInkA
          + max(dot(plane, vec2(-0.707)), 0.0) * uInkB
          + uInkC;
        lit = pow(max(1.0 - max(nearest, 0.0), 0.0), uHazeTight) * wash * uHaze;
      } else {
        vec3 normal = slope(landed);
        vec3 toEye = normalize(eye - landed);

        vec3 axis = normalize(vec3(0.707 + uSwing.x, 0.707 + uSwing.y, 0.0));
        lit += uInkA * rimTerm(normal, ray, axis) * uRim;
        lit += uInkB * rimTerm(normal, ray, -axis) * uRim;
        lit += uInkC * rimTerm(normal, ray, vec3(0.0, 0.0, -1.0)) * uRim * 0.667;

        vec3 keyDir = normalize(vec3(0.6 + uSwing.x, 0.8 + uSwing.y, -0.5));
        vec3 fillDir = normalize(vec3(-0.6 + uSwing.x, -0.8 + uSwing.y, 0.0));
        lit += uSheenA * gloss(keyDir, toEye, normal, uSheenTight) * uSheen;
        lit += uSheenB * gloss(fillDir, toEye, normal, uSheenTight * 1.33) * uSheen * 0.75;
      }
    }

    lit = pow(max(lit, 0.0), vec3(uGamma));
  }

  lit *= uGain * disc;

  float cover = clamp(max(lit.r, max(lit.g, lit.b)), 0.0, 1.0);
  float rest = uBackdropAlpha * (1.0 - cover);
  gl_FragColor = vec4(lit + uBackdrop * rest, cover + rest) * uOpacity;
}
`,
      d = (e, a, t) => Math.min(Math.max(e, a), t),
      p = () => () => {},
      v = () => window.devicePixelRatio || 1,
      g = (e) => {
        let a = e.trim().toLowerCase();
        return "transparent" === a || "none" === a || "" === a;
      },
      x = ({
        awake: e,
        ceiling: a,
        readSwing: t,
        radius: r,
        turbulence: o,
        noiseScale: u,
        flowSpeed: s,
        octaves: m,
        roughness: p,
        lacunarity: v,
        steps: x,
        stride: y,
        zoom: S,
        maskRadius: w,
        maskFeather: b,
        colorA: C,
        colorB: k,
        colorC: j,
        rimStrength: M,
        rimPower: B,
        specularColorA: I,
        specularColorB: R,
        specularStrength: z,
        specularSharpness: A,
        glowStrength: F,
        glowFalloff: T,
        gamma: N,
        brightness: P,
        opacity: E,
        backgroundColor: G,
        cursorInteraction: H,
        cursorLight: D,
        adaptiveQuality: L,
        targetFps: O,
        paused: Q,
      }) => {
        let { gl: W, invalidate: Y, setDpr: X } = (0, i.C)(),
          _ = (0, l.useRef)(null),
          K = (0, l.useRef)(0),
          Z = (0, l.useRef)({
            scale: a,
            frames: 0,
            span: 0,
            wins: 0,
            roof: 1 / 0,
          }),
          [q, U] = (0, l.useState)(!1),
          V = (0, l.useMemo)(() => {
            let e = d(Math.round(m), 1, 5),
              a = d(p, 0.05, 0.95),
              t = Math.max(v, 1.1),
              n = 1,
              l = 0;
            for (let t = 0; t < e; t++) ((l += n), (n *= a));
            return { bands: e, decay: a, climb: t, norm: 1 / l };
          }, [m, p, v]);
        ((0, l.useEffect)(() => {
          let e = window.matchMedia("(prefers-reduced-motion: reduce)"),
            a = () => U(e.matches);
          return (
            a(),
            e.addEventListener("change", a),
            () => e.removeEventListener("change", a)
          );
        }, []),
          (0, l.useEffect)(() => {
            let e = Z.current;
            ((e.scale = a), (e.roof = 1 / 0), (e.wins = 0), X(a));
          }, [a, X]));
        let J = (0, l.useMemo)(
          () => ({
            uBands: { value: 3 },
            uDecay: { value: 0.5 },
            uClimb: { value: 2 },
            uNorm: { value: 1 },
            uCanvas: { value: new c.I9Y(1, 1) },
            uClock: { value: 0 },
            uCore: { value: 0.35 },
            uSwell: { value: 0.3 },
            uGrain: { value: 1 },
            uFlow: { value: 0.3 },
            uSteps: { value: 32 },
            uStride: { value: 1 },
            uZoom: { value: 1 },
            uMaskRadius: { value: 1 },
            uMaskFeather: { value: 0.02 },
            uInkA: { value: new c.Q1f("#4da6ff") },
            uInkB: { value: new c.Q1f("#9959ff") },
            uInkC: { value: new c.Q1f("#6680ff") },
            uRim: { value: 0.75 },
            uRimShape: { value: 3 },
            uSheenA: { value: new c.Q1f("#669fff") },
            uSheenB: { value: new c.Q1f("#998fff") },
            uSheen: { value: 1 },
            uSheenTight: { value: 12 },
            uHaze: { value: 1 },
            uHazeTight: { value: 32 },
            uGamma: { value: 1.25 },
            uGain: { value: 1 },
            uOpacity: { value: 1 },
            uBackdrop: { value: new c.Q1f("#0a0a0a") },
            uBackdropAlpha: { value: 1 },
            uSwing: { value: new c.I9Y(0, 0) },
          }),
          [],
        );
        return (
          (0, i.D)((n, l) => {
            let i = _.current;
            if (!i || !e) return;
            let m = Math.min(l, 0.05);
            Q || q || (K.current += m);
            let f = i.uniforms,
              h = W.getDrawingBufferSize(new c.I9Y());
            ((f.uBands.value = V.bands),
              (f.uDecay.value = V.decay),
              (f.uClimb.value = V.climb),
              (f.uNorm.value = V.norm),
              f.uCanvas.value.set(Math.max(h.x, 1), Math.max(h.y, 1)),
              (f.uClock.value = K.current),
              (f.uCore.value = Math.max(r, 0.02)),
              (f.uSwell.value = Math.max(o, 0)),
              (f.uGrain.value = Math.max(u, 0.05)),
              (f.uFlow.value = s),
              (f.uSteps.value = d(Math.round(x), 4, 96)),
              (f.uStride.value = d(y, 0.25, 1.5)),
              (f.uZoom.value = Math.max(S, 0.1)),
              (f.uMaskRadius.value = Math.max(w, 0.05)),
              (f.uMaskFeather.value = d(b, 0.001, 1)),
              f.uInkA.value.set(C),
              f.uInkB.value.set(k),
              f.uInkC.value.set(j),
              (f.uRim.value = Math.max(M, 0)),
              (f.uRimShape.value = Math.max(B, 0.2)),
              f.uSheenA.value.set(I),
              f.uSheenB.value.set(R),
              (f.uSheen.value = Math.max(z, 0)),
              (f.uSheenTight.value = Math.max(A, 1)),
              (f.uHaze.value = Math.max(F, 0)),
              (f.uHazeTight.value = Math.max(T, 1)),
              (f.uGamma.value = d(N, 0.2, 4)),
              (f.uGain.value = Math.max(P, 0)),
              (f.uOpacity.value = d(E, 0, 1)),
              g(G)
                ? (f.uBackdropAlpha.value = 0)
                : ((f.uBackdropAlpha.value = 1), f.uBackdrop.value.set(G)));
            let p = t();
            ((p.x += (p.toX - p.x) * Math.min(4 * m, 1)),
              (p.y += (p.toY - p.y) * Math.min(4 * m, 1)),
              H
                ? f.uSwing.value.set(p.x * D, p.y * D)
                : f.uSwing.value.set(0, 0));
            let v = Z.current;
            if (((v.frames += 1), (v.span += l), v.span >= 0.75)) {
              let e = v.frames / v.span;
              if (((v.frames = 0), (v.span = 0), L && K.current > 0.5))
                if (e < 0.85 * O && v.scale > 0.5)
                  ((v.roof = v.scale),
                    (v.scale = Math.max(0.5, 0.75 * v.scale)),
                    (v.wins = 0),
                    X(v.scale));
                else if (e >= 0.95 * O && v.scale < a) {
                  v.wins += 1;
                  let e = Math.min(a, 1.25 * v.scale);
                  v.wins >= 3 &&
                    e < 0.98 * v.roof &&
                    ((v.scale = e), (v.wins = 0), X(e));
                } else v.wins = 0;
            }
            Y();
          }),
          (0, n.jsxs)("mesh", {
            frustumCulled: !1,
            children: [
              (0, n.jsx)("planeGeometry", { args: [2, 2] }),
              (0, n.jsx)("shaderMaterial", {
                ref: _,
                uniforms: J,
                vertexShader: f,
                fragmentShader: h,
                transparent: !0,
                premultipliedAlpha: !0,
                depthTest: !1,
                depthWrite: !1,
              }),
            ],
          })
        );
      },
      y = ({
        width: e = "100%",
        height: a = "100%",
        className: t,
        children: r,
        radius: o = 0.35,
        turbulence: u = 0.3,
        noiseScale: i = 1,
        flowSpeed: c = 0.3,
        octaves: f = 3,
        roughness: h = 0.5,
        lacunarity: y = 2,
        steps: S = 32,
        stride: w = 1,
        zoom: b = 1,
        maskRadius: C = 1,
        maskFeather: k = 0.02,
        colorA: j = "#4da6ff",
        colorB: M = "#9959ff",
        colorC: B = "#6680ff",
        rimStrength: I = 0.75,
        rimPower: R = 3,
        specularColorA: z = "#669fff",
        specularColorB: A = "#998fff",
        specularStrength: F = 1,
        specularSharpness: T = 12,
        glowStrength: N = 1,
        glowFalloff: P = 32,
        gamma: E = 1.25,
        brightness: G = 1,
        opacity: H = 1,
        backgroundColor: D = "#0a0a0a",
        cursorInteraction: L = !0,
        cursorLight: O = 0.35,
        adaptiveQuality: Q = !0,
        targetFps: W = 60,
        dpr: Y = 2,
        paused: X = !1,
      }) => {
        let _ = (0, l.useRef)(null),
          K = (0, l.useRef)({ x: 0, y: 0, toX: 0, toY: 0 }),
          [Z, q] = (0, l.useState)(!1),
          U = (0, l.useSyncExternalStore)(p, v, () => 1);
        (0, l.useEffect)(() => {
          let e = _.current;
          if (!e) return;
          let a = new IntersectionObserver(([e]) => q(e.isIntersecting), {
            rootMargin: "120px",
          });
          return (a.observe(e), () => a.disconnect());
        }, []);
        let V = (0, l.useCallback)(() => K.current, []),
          J = (0, l.useCallback)((e) => {
            let a = _.current;
            if (!a) return;
            let t = a.getBoundingClientRect();
            t.width &&
              t.height &&
              ((K.current.toX = (e.clientX - t.left) / t.width - 0.5),
              (K.current.toY = 0.5 - (e.clientY - t.top) / t.height));
          }, []),
          $ = (0, l.useCallback)(() => {
            ((K.current.toX = 0), (K.current.toY = 0));
          }, []),
          ee = (0, l.useMemo)(() => d(Math.min(U, Y), 0.5, 2), [U, Y]);
        return (0, n.jsxs)("div", {
          ref: _,
          className: (0, m.cn)("relative overflow-hidden", t),
          style: { width: e, height: a, backgroundColor: g(D) ? void 0 : D },
          onPointerMove: L ? J : void 0,
          onPointerLeave: L ? $ : void 0,
          children: [
            (0, n.jsx)(s.Hl, {
              className: "absolute inset-0",
              dpr: ee,
              frameloop: Z ? "always" : "demand",
              gl: {
                antialias: !1,
                alpha: !0,
                powerPreference: "high-performance",
              },
              orthographic: !0,
              children: (0, n.jsx)(x, {
                awake: Z,
                ceiling: ee,
                readSwing: V,
                radius: o,
                turbulence: u,
                noiseScale: i,
                flowSpeed: c,
                octaves: f,
                roughness: h,
                lacunarity: y,
                steps: S,
                stride: w,
                zoom: b,
                maskRadius: C,
                maskFeather: k,
                colorA: j,
                colorB: M,
                colorC: B,
                rimStrength: I,
                rimPower: R,
                specularColorA: z,
                specularColorB: A,
                specularStrength: F,
                specularSharpness: T,
                glowStrength: N,
                glowFalloff: P,
                gamma: E,
                brightness: G,
                opacity: H,
                backgroundColor: D,
                cursorInteraction: L,
                cursorLight: O,
                adaptiveQuality: Q,
                targetFps: W,
                paused: X,
              }),
            }),
            r
              ? (0, n.jsx)("div", {
                  className: "relative z-10 h-full w-full",
                  children: r,
                })
              : null,
          ],
        });
      },
      S = () => () => {},
      w = () => {
        let [e, a] = (0, u.I)(),
          { resolvedTheme: t } = (0, r.D)(),
          i = (0, l.useSyncExternalStore)(
            S,
            () => !0,
            () => !1,
          ),
          [s, c] = (0, l.useState)(null),
          m = (0, l.useMemo)(
            () => (null !== s ? s : i && "dark" === t ? "#0a0a0a" : "#ffffff"),
            [i, t, s],
          ),
          [f, h] = (0, l.useState)(0.35),
          [d, p] = (0, l.useState)(0.3),
          [v, g] = (0, l.useState)(1),
          [x, w] = (0, l.useState)(0.3),
          [b, C] = (0, l.useState)(3),
          [k, j] = (0, l.useState)(0.5),
          [M, B] = (0, l.useState)(32),
          [I, R] = (0, l.useState)(1),
          [z, A] = (0, l.useState)(1),
          [F, T] = (0, l.useState)(1),
          [N, P] = (0, l.useState)(0.02),
          [E, G] = (0, l.useState)("#4da6ff"),
          [H, D] = (0, l.useState)("#9959ff"),
          [L, O] = (0, l.useState)("#6680ff"),
          [Q, W] = (0, l.useState)(0.75),
          [Y, X] = (0, l.useState)(3),
          [_, K] = (0, l.useState)("#669fff"),
          [Z, q] = (0, l.useState)("#998fff"),
          [U, V] = (0, l.useState)(1),
          [J, $] = (0, l.useState)(12),
          [ee, ea] = (0, l.useState)(1),
          [et, en] = (0, l.useState)(32),
          [el, er] = (0, l.useState)(1.25),
          [eo, eu] = (0, l.useState)(1),
          [ei, es] = (0, l.useState)(1),
          [ec, em] = (0, l.useState)(!0),
          [ef, eh] = (0, l.useState)(0.35),
          [ed, ep] = (0, l.useState)(!0),
          [ev, eg] = (0, l.useState)(!1);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(o.Bg, {}),
            (0, n.jsxs)(o.VX, {
              children: [
                (0, n.jsxs)(o.Ec, {
                  children: [
                    (0, n.jsx)(o.Ch, {
                      onRefresh: a,
                      children: (0, n.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, n.jsx)(
                          y,
                          {
                            radius: f,
                            turbulence: d,
                            noiseScale: v,
                            flowSpeed: x,
                            octaves: b,
                            roughness: k,
                            steps: M,
                            stride: I,
                            zoom: z,
                            maskRadius: F,
                            maskFeather: N,
                            colorA: E,
                            colorB: H,
                            colorC: L,
                            rimStrength: Q,
                            rimPower: Y,
                            specularColorA: _,
                            specularColorB: Z,
                            specularStrength: U,
                            specularSharpness: J,
                            glowStrength: ee,
                            glowFalloff: et,
                            gamma: el,
                            brightness: eo,
                            opacity: ei,
                            backgroundColor: m,
                            cursorInteraction: ec,
                            cursorLight: ef,
                            adaptiveQuality: ed,
                            paused: ev,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(o.IH, {
                      children: [
                        (0, n.jsx)(o.yt, {
                          title: "Radius",
                          min: 0.1,
                          max: 0.6,
                          step: 0.01,
                          value: f,
                          onChange: h,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Turbulence",
                          min: 0,
                          max: 0.6,
                          step: 0.01,
                          value: d,
                          onChange: p,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Noise Scale",
                          min: 0.2,
                          max: 4,
                          step: 0.05,
                          value: v,
                          onChange: g,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Flow Speed",
                          min: -1.5,
                          max: 1.5,
                          step: 0.05,
                          value: x,
                          onChange: w,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Octaves",
                          min: 1,
                          max: 5,
                          step: 1,
                          value: b,
                          onChange: C,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Roughness",
                          min: 0.1,
                          max: 0.9,
                          step: 0.05,
                          value: k,
                          onChange: j,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Steps",
                          min: 8,
                          max: 64,
                          step: 1,
                          value: M,
                          onChange: B,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Stride",
                          min: 0.4,
                          max: 1.4,
                          step: 0.05,
                          value: I,
                          onChange: R,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Zoom",
                          min: 0.4,
                          max: 2.5,
                          step: 0.05,
                          value: z,
                          onChange: A,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Mask Radius",
                          min: 0.3,
                          max: 1.6,
                          step: 0.02,
                          value: F,
                          onChange: T,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Mask Feather",
                          min: 0.005,
                          max: 0.5,
                          step: 0.005,
                          value: N,
                          onChange: P,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Rim Strength",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: Q,
                          onChange: W,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Rim Power",
                          min: 0.5,
                          max: 8,
                          step: 0.1,
                          value: Y,
                          onChange: X,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Specular Strength",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: U,
                          onChange: V,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Specular Sharpness",
                          min: 2,
                          max: 48,
                          step: 1,
                          value: J,
                          onChange: $,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Glow Strength",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: ee,
                          onChange: ea,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Glow Falloff",
                          min: 4,
                          max: 80,
                          step: 1,
                          value: et,
                          onChange: en,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Gamma",
                          min: 0.4,
                          max: 2.5,
                          step: 0.05,
                          value: el,
                          onChange: er,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Brightness",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: eo,
                          onChange: eu,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: ei,
                          onChange: es,
                        }),
                        (0, n.jsx)(o.yt, {
                          title: "Cursor Light",
                          min: 0,
                          max: 1,
                          step: 0.02,
                          value: ef,
                          onChange: eh,
                        }),
                        (0, n.jsx)(o.W7, {
                          title: "Key Color",
                          value: E,
                          onChange: G,
                        }),
                        (0, n.jsx)(o.W7, {
                          title: "Fill Color",
                          value: H,
                          onChange: D,
                        }),
                        (0, n.jsx)(o.W7, {
                          title: "Ambient Color",
                          value: L,
                          onChange: O,
                        }),
                        (0, n.jsx)(o.W7, {
                          title: "Specular A",
                          value: _,
                          onChange: K,
                        }),
                        (0, n.jsx)(o.W7, {
                          title: "Specular B",
                          value: Z,
                          onChange: q,
                        }),
                        (0, n.jsx)(o.W7, {
                          title: "Background",
                          value: m,
                          onChange: c,
                        }),
                        (0, n.jsx)(o.tl, {
                          title: "Cursor Interaction",
                          checked: ec,
                          onChange: em,
                        }),
                        (0, n.jsx)(o.tl, {
                          title: "Adaptive Quality",
                          checked: ed,
                          onChange: ep,
                        }),
                        (0, n.jsx)(o.tl, {
                          title: "Paused",
                          checked: ev,
                          onChange: eg,
                        }),
                      ],
                    }),
                    (0, n.jsx)(o.Ub, {
                      data: [
                        {
                          name: "width",
                          type: "string | number",
                          default: '"100%"',
                          description: "Width of the container.",
                        },
                        {
                          name: "height",
                          type: "string | number",
                          default: '"100%"',
                          description: "Height of the container.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "-",
                          description: "Extra classes for the container.",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "-",
                          description: "Content stacked above the orb.",
                        },
                        {
                          name: "radius",
                          type: "number",
                          default: "0.35",
                          description:
                            "Radius of the smooth core before displacement.",
                        },
                        {
                          name: "turbulence",
                          type: "number",
                          default: "0.3",
                          description:
                            "How far the noise pushes the surface outward.",
                        },
                        {
                          name: "noiseScale",
                          type: "number",
                          default: "1",
                          description: "Frequency of the displacement field.",
                        },
                        {
                          name: "flowSpeed",
                          type: "number",
                          default: "0.3",
                          description:
                            "Speed the field drifts through the orb.",
                        },
                        {
                          name: "octaves",
                          type: "number",
                          default: "3",
                          description:
                            "Octaves baked into the displacement field.",
                        },
                        {
                          name: "roughness",
                          type: "number",
                          default: "0.5",
                          description: "Amplitude falloff between octaves.",
                        },
                        {
                          name: "lacunarity",
                          type: "number",
                          default: "2",
                          description: "Frequency gain between octaves.",
                        },
                        {
                          name: "steps",
                          type: "number",
                          default: "32",
                          description: "Maximum ray march iterations.",
                        },
                        {
                          name: "stride",
                          type: "number",
                          default: "1",
                          description:
                            "Fraction of each distance estimate to advance. Lower is safer, higher is faster.",
                        },
                        {
                          name: "zoom",
                          type: "number",
                          default: "1",
                          description: "Scales the orb inside the frame.",
                        },
                        {
                          name: "maskRadius",
                          type: "number",
                          default: "1",
                          description: "Radius of the circular cutout.",
                        },
                        {
                          name: "maskFeather",
                          type: "number",
                          default: "0.02",
                          description: "Softness of the circular cutout.",
                        },
                        {
                          name: "colorA",
                          type: "string",
                          default: '"#4da6ff"',
                          description: "Key light color.",
                        },
                        {
                          name: "colorB",
                          type: "string",
                          default: '"#9959ff"',
                          description: "Fill light color.",
                        },
                        {
                          name: "colorC",
                          type: "string",
                          default: '"#6680ff"',
                          description: "Ambient wrap color.",
                        },
                        {
                          name: "rimStrength",
                          type: "number",
                          default: "0.75",
                          description:
                            "Strength of the two opposing rim lights.",
                        },
                        {
                          name: "rimPower",
                          type: "number",
                          default: "3",
                          description: "Tightness of the rim falloff.",
                        },
                        {
                          name: "specularColorA",
                          type: "string",
                          default: '"#669fff"',
                          description: "Color of the primary highlight.",
                        },
                        {
                          name: "specularColorB",
                          type: "string",
                          default: '"#998fff"',
                          description: "Color of the secondary highlight.",
                        },
                        {
                          name: "specularStrength",
                          type: "number",
                          default: "1",
                          description: "Strength of both highlights.",
                        },
                        {
                          name: "specularSharpness",
                          type: "number",
                          default: "12",
                          description: "Tightness of the highlights.",
                        },
                        {
                          name: "glowStrength",
                          type: "number",
                          default: "1",
                          description:
                            "Strength of the halo around the silhouette.",
                        },
                        {
                          name: "glowFalloff",
                          type: "number",
                          default: "32",
                          description: "Tightness of the halo falloff.",
                        },
                        {
                          name: "gamma",
                          type: "number",
                          default: "1.25",
                          description: "Contrast curve applied at the end.",
                        },
                        {
                          name: "brightness",
                          type: "number",
                          default: "1",
                          description: "Overall gain.",
                        },
                        {
                          name: "opacity",
                          type: "number",
                          default: "1",
                          description: "Master alpha of the canvas.",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"#0a0a0a"',
                          description:
                            'Fill behind the orb. Accepts "transparent".',
                        },
                        {
                          name: "cursorInteraction",
                          type: "boolean",
                          default: "true",
                          description: "Let the pointer swing the lighting.",
                        },
                        {
                          name: "cursorLight",
                          type: "number",
                          default: "0.35",
                          description:
                            "How far the pointer swings the lighting.",
                        },
                        {
                          name: "adaptiveQuality",
                          type: "boolean",
                          default: "true",
                          description:
                            "Drop resolution when the frame rate falls short.",
                        },
                        {
                          name: "targetFps",
                          type: "number",
                          default: "60",
                          description: "Frame rate the adaptive pass aims for.",
                        },
                        {
                          name: "dpr",
                          type: "number",
                          default: "2",
                          description: "Upper bound on device pixel ratio.",
                        },
                        {
                          name: "paused",
                          type: "boolean",
                          default: "false",
                          description: "Hold the animation still.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, n.jsx)(o.lT, { children: (0, n.jsx)(o.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
