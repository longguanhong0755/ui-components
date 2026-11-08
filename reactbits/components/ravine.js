/* ReactBits Pro public preview module 63018 for ravine.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/63018.261cbf7e2ec03259.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  63018: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => j }));
    var r = a(95155),
      n = a(12115),
      l = a(30701),
      i = a(56388),
      u = a(90761),
      s = a(81712),
      o = a(3907),
      f = a(50969),
      d = a(2253),
      c = a(90650);
    let m = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,
      v = `
precision highp float;

#define MAX_STEPS 256
#define HIT_EPSILON 0.001

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform int uSteps;
uniform float uStepScale;
uniform float uScale;
uniform float uHeight;
uniform float uSpread;
uniform float uWallCurve;
uniform float uFade;
uniform float uCameraHeight;
uniform float uTilt;
uniform float uRoll;
uniform float uFov;
uniform vec3 uNear;
uniform vec3 uFar;
uniform float uBrightness;
uniform float uContrast;
uniform float uGrain;

const mat2 OCTAVE_TWIST = mat2(0.8, 0.6, -0.6, 0.8);


mat2 rotate(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float ripple(vec2 p) {
  return sin(1.5 * p.x) * sin(1.5 * p.y);
}


void octave(inout vec2 p, inout float sum, float amplitude, float zoom) {
  sum += amplitude * (0.5 + 0.5 * ripple(p));
  p = OCTAVE_TWIST * p * zoom;
}

float terrainNoise(vec2 p) {
  float sum = 0.0;
  octave(p, sum, 0.5, 2.02);
  octave(p, sum, 0.25, 2.03);
  octave(p, sum, 0.125, 2.01);
  octave(p, sum, 0.0625, 2.04);
  sum += 0.015625 * (0.5 + 0.5 * ripple(p));
  return sum / 0.96875;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}


float canyon(vec3 p) {
  vec3 q = p + vec3(0.0, 0.0, uTime);
  float relief = terrainNoise(q.xz * uScale) * uHeight;
  float wall = pow(abs(q.x) * uSpread, uWallCurve) * 0.0000125;
  return max(q.y - relief * wall, 0.0);
}

float scene(vec3 p) {
  return canyon(p);
}

void main() {
  vec2 frag = vUv * uResolution;
  vec2 uv = (frag - 0.5 * uResolution) / uResolution.y;

  vec3 origin = vec3(uv + vec2(0.0, uCameraHeight), -1.0);
  vec3 dir = normalize(vec3(uv * uFov, 1.0));
  dir.zy = rotate(uTilt) * dir.zy;
  dir.xy = rotate(uRoll) * dir.xy;

  vec3 p = origin;
  int taken = 0;
  for (int i = 0; i < MAX_STEPS; i++) {
    if (i >= uSteps) break;
    taken = i;
    float jitter = (hash(p.xz) - 0.5) * uGrain;
    float d = scene(p + vec3(jitter));
    if (d < HIT_EPSILON) break;
    p += dir * d * uStepScale;
  }




  float tone = float(taken) / float(MAX_STEPS);
  tone = (tone - 0.5) * uContrast + 0.5;
  tone = clamp(tone * uBrightness, 0.0, 1.0);
  if (uFade > 0.0) {


    float travelled = distance(origin, p) / uFade;
    tone *= exp(-travelled * travelled);
  }

  gl_FragColor = vec4(mix(uNear, uFar, tone), 1.0);
}
`,
      p = (e, t, a) => Math.min(a, Math.max(t, e)),
      h = (e, t) => {
        let a = new d.Q1f();
        try {
          a.setStyle(e, d.Zr2);
        } catch {
          a.setStyle(t, d.Zr2);
        }
        return a;
      },
      g = (e, t) => {
        try {
          e.setStyle(t, d.Zr2);
        } catch {}
      },
      x = (e) => {
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
      S = () => window.devicePixelRatio || 1,
      y = ({
        speed: e,
        steps: t,
        stepScale: a,
        scale: l,
        height: i,
        spread: u,
        wallCurve: o,
        fade: f,
        cameraHeight: c,
        tilt: x,
        roll: S,
        fov: y,
        nearColor: C,
        farColor: b,
        brightness: j,
        contrast: w,
        grain: T,
        paused: E,
      }) => {
        let N = (0, n.useRef)(null),
          M = (0, n.useRef)(0),
          { gl: F, size: H, invalidate: P } = (0, s.C)(),
          R = (0, n.useMemo)(
            () => ({
              uResolution: { value: new d.I9Y(1, 1) },
              uTime: { value: 0 },
              uSteps: { value: 128 },
              uStepScale: { value: 0.5 },
              uScale: { value: 0.25 },
              uHeight: { value: 1 },
              uSpread: { value: 34 },
              uWallCurve: { value: 2.5 },
              uFade: { value: 35 },
              uCameraHeight: { value: 6 },
              uTilt: { value: 0.05 },
              uRoll: { value: 0.075 },
              uFov: { value: 1 },
              uNear: { value: h("#000000", "#000000") },
              uFar: { value: h("#ffffff", "#ffffff") },
              uBrightness: { value: 0.8 },
              uContrast: { value: 1 },
              uGrain: { value: 0.005 },
            }),
            [],
          );
        return (
          (0, n.useEffect)(() => {
            let e = N.current;
            e &&
              (g(e.uniforms.uNear.value, C), g(e.uniforms.uFar.value, b), P());
          }, [C, b, P]),
          (0, n.useEffect)(() => {
            P();
          }, [t, a, l, i, u, o, f, c, x, S, y, j, w, T, P]),
          (0, s.D)((r, n) => {
            let s = N.current;
            if (!s) return;
            E || (M.current += Math.min(n, 0.05) * e * 2.5);
            let d = F.getPixelRatio(),
              m = s.uniforms;
            (m.uResolution.value.set(H.width * d, H.height * d),
              (m.uTime.value = M.current),
              (m.uSteps.value = Math.round(p(t, 32, 256))),
              (m.uStepScale.value = p(a, 0.1, 1)),
              (m.uScale.value = Math.max(l, 0.01)),
              (m.uHeight.value = i),
              (m.uSpread.value = Math.max(u, 0)),
              (m.uWallCurve.value = Math.max(o, 0.5)),
              (m.uFade.value = Math.max(f, 0)),
              (m.uCameraHeight.value = c),
              (m.uTilt.value = x),
              (m.uRoll.value = S),
              (m.uFov.value = Math.max(y, 0.1)),
              (m.uBrightness.value = Math.max(j, 0)),
              (m.uContrast.value = Math.max(w, 0)),
              (m.uGrain.value = Math.max(T, 0)));
          }),
          (0, r.jsxs)("mesh", {
            frustumCulled: !1,
            children: [
              (0, r.jsx)("planeGeometry", { args: [1, 1] }),
              (0, r.jsx)("shaderMaterial", {
                ref: N,
                vertexShader: m,
                fragmentShader: v,
                uniforms: R,
                depthTest: !1,
                depthWrite: !1,
              }),
            ],
          })
        );
      },
      C = ({
        speed: e = 1,
        steps: t = 128,
        stepScale: a = 0.5,
        scale: l = 0.25,
        height: i = 1,
        spread: u = 34,
        wallCurve: s = 2.5,
        fade: d = 35,
        cameraHeight: m = 6,
        tilt: v = 0.05,
        roll: p = 0.075,
        fov: h = 1,
        nearColor: g = "#000000",
        farColor: C = "#ffffff",
        brightness: b = 0.8,
        contrast: j = 1,
        grain: w = 0.005,
        paused: T = !1,
        dpr: E = 1,
        className: N,
        children: M,
      }) => {
        let F = (0, n.useRef)(null),
          [H, P] = (0, n.useState)(!0),
          R = (0, f.I)(),
          k = Math.min(
            (0, n.useSyncExternalStore)(x, S, () => 1),
            Math.max(E, 0.5),
          );
        (0, n.useEffect)(() => {
          let e = F.current;
          if (!e || "undefined" == typeof IntersectionObserver) return;
          let t = new IntersectionObserver(([e]) => P(e.isIntersecting), {
            threshold: 0,
          });
          return (t.observe(e), () => t.disconnect());
        }, []);
        let I = T || !!R;
        return (0, r.jsxs)("div", {
          ref: F,
          className: (0, c.cn)("relative overflow-hidden", N),
          children: [
            (0, r.jsx)("div", {
              className: "absolute inset-0",
              children: (0, r.jsx)(o.Hl, {
                orthographic: !0,
                dpr: k,
                frameloop: H && !I ? "always" : "demand",
                gl: {
                  antialias: !1,
                  alpha: !1,
                  powerPreference: "high-performance",
                },
                children: (0, r.jsx)(y, {
                  speed: e,
                  steps: t,
                  stepScale: a,
                  scale: l,
                  height: i,
                  spread: u,
                  wallCurve: s,
                  fade: d,
                  cameraHeight: m,
                  tilt: v,
                  roll: p,
                  fov: h,
                  nearColor: g,
                  farColor: C,
                  brightness: b,
                  contrast: j,
                  grain: w,
                  paused: I,
                }),
              }),
            }),
            M
              ? (0, r.jsx)("div", {
                  className: "relative z-10 h-full w-full",
                  children: M,
                })
              : null,
          ],
        });
      },
      b = () => () => {},
      j = () => {
        let [e, t] = (0, u.I)(),
          { resolvedTheme: a } = (0, l.D)(),
          s =
            (0, n.useSyncExternalStore)(
              b,
              () => !0,
              () => !1,
            ) && "dark" === a,
          [o, f] = (0, n.useState)(1),
          [d, c] = (0, n.useState)(128),
          [m, v] = (0, n.useState)(0.5),
          [p, h] = (0, n.useState)(0.25),
          [g, x] = (0, n.useState)(1),
          [S, y] = (0, n.useState)(34),
          [j, w] = (0, n.useState)(2.5),
          [T, E] = (0, n.useState)(35),
          [N, M] = (0, n.useState)(6),
          [F, H] = (0, n.useState)(0.05),
          [P, R] = (0, n.useState)(0.075),
          [k, I] = (0, n.useState)(1),
          [z, _] = (0, n.useState)(null),
          [W, G] = (0, n.useState)(null),
          [U, B] = (0, n.useState)(0.8),
          [O, L] = (0, n.useState)(1),
          [q, A] = (0, n.useState)(0.005),
          [D, V] = (0, n.useState)(!1),
          X = z ?? (s ? "#000000" : "#ffffff"),
          Z = W ?? (s ? "#ffffff" : "#000000");
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(i.Bg, {}),
            (0, r.jsxs)(i.VX, {
              children: [
                (0, r.jsxs)(i.Ec, {
                  children: [
                    (0, r.jsx)(i.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          C,
                          {
                            className: "h-full w-full",
                            speed: o,
                            steps: d,
                            stepScale: m,
                            scale: p,
                            height: g,
                            spread: S,
                            wallCurve: j,
                            fade: T,
                            cameraHeight: N,
                            tilt: F,
                            roll: P,
                            fov: k,
                            nearColor: X,
                            farColor: Z,
                            brightness: U,
                            contrast: O,
                            grain: q,
                            paused: D,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(i.IH, {
                      children: [
                        (0, r.jsx)(i.yt, {
                          title: "Speed",
                          min: 0,
                          max: 4,
                          step: 0.05,
                          value: o,
                          onChange: f,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Steps",
                          min: 32,
                          max: 256,
                          step: 1,
                          value: d,
                          onChange: c,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Step Scale",
                          min: 0.1,
                          max: 1,
                          step: 0.01,
                          value: m,
                          onChange: v,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Scale",
                          min: 0.05,
                          max: 1,
                          step: 0.01,
                          value: p,
                          onChange: h,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Height",
                          min: 0,
                          max: 4,
                          step: 0.05,
                          value: g,
                          onChange: x,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Spread",
                          min: 0,
                          max: 80,
                          step: 1,
                          value: S,
                          onChange: y,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Wall Curve",
                          min: 1,
                          max: 4,
                          step: 0.05,
                          value: j,
                          onChange: w,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Fade",
                          min: 0,
                          max: 200,
                          step: 1,
                          value: T,
                          onChange: E,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Camera Height",
                          min: 1,
                          max: 14,
                          step: 0.1,
                          value: N,
                          onChange: M,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Tilt",
                          min: -0.3,
                          max: 0.3,
                          step: 0.005,
                          value: F,
                          onChange: H,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Roll",
                          min: -0.5,
                          max: 0.5,
                          step: 0.005,
                          value: P,
                          onChange: R,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "FOV",
                          min: 0.4,
                          max: 2,
                          step: 0.05,
                          value: k,
                          onChange: I,
                        }),
                        (0, r.jsx)(i.W7, {
                          title: "Near Color",
                          value: X,
                          onChange: _,
                        }),
                        (0, r.jsx)(i.W7, {
                          title: "Far Color",
                          value: Z,
                          onChange: G,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Brightness",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: U,
                          onChange: B,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Contrast",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: O,
                          onChange: L,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Grain",
                          min: 0,
                          max: 0.05,
                          step: 0.001,
                          value: q,
                          onChange: A,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Paused",
                          checked: D,
                          onChange: V,
                        }),
                      ],
                    }),
                    (0, r.jsx)(i.Ub, {
                      data: [
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description: "Travel speed along the canyon floor.",
                        },
                        {
                          name: "steps",
                          type: "number",
                          default: "128",
                          description:
                            "Ray-march steps per pixel, 32 to 256. More steps resolve farther detail at GPU cost.",
                        },
                        {
                          name: "stepScale",
                          type: "number",
                          default: "0.5",
                          description:
                            "Fraction of the safe distance each step advances; lower is finer and darker.",
                        },
                        {
                          name: "scale",
                          type: "number",
                          default: "0.25",
                          description: "Frequency of the terrain noise.",
                        },
                        {
                          name: "height",
                          type: "number",
                          default: "1",
                          description:
                            "Height multiplier of the terrain ridges.",
                        },
                        {
                          name: "spread",
                          type: "number",
                          default: "34",
                          description:
                            "How quickly the walls rise away from the centre line.",
                        },
                        {
                          name: "wallCurve",
                          type: "number",
                          default: "2.5",
                          description:
                            "Curve of the wall rise; higher keeps the floor flatter for longer.",
                        },
                        {
                          name: "fade",
                          type: "number",
                          default: "35",
                          description:
                            "Distance at which the canyon fades into the near colour. 0 disables.",
                        },
                        {
                          name: "cameraHeight",
                          type: "number",
                          default: "6",
                          description: "Camera height above the floor.",
                        },
                        {
                          name: "tilt",
                          type: "number",
                          default: "0.05",
                          description:
                            "Camera pitch in radians; positive looks down.",
                        },
                        {
                          name: "roll",
                          type: "number",
                          default: "0.075",
                          description: "Camera roll in radians.",
                        },
                        {
                          name: "fov",
                          type: "number",
                          default: "1",
                          description: "Field of view multiplier.",
                        },
                        {
                          name: "nearColor",
                          type: "string",
                          default: '"#000000"',
                          description: "Colour of near surfaces.",
                        },
                        {
                          name: "farColor",
                          type: "string",
                          default: '"#ffffff"',
                          description:
                            "Colour the tone ramps towards at grazing angles and far walls.",
                        },
                        {
                          name: "brightness",
                          type: "number",
                          default: "0.8",
                          description: "Tone brightness multiplier.",
                        },
                        {
                          name: "contrast",
                          type: "number",
                          default: "1",
                          description: "Tone contrast around the mid grey.",
                        },
                        {
                          name: "grain",
                          type: "number",
                          default: "0.005",
                          description:
                            "Micro-jitter on the march; adds a fine grain.",
                        },
                        {
                          name: "paused",
                          type: "boolean",
                          default: "false",
                          description: "Freeze the animation.",
                        },
                        {
                          name: "dpr",
                          type: "number",
                          default: "1",
                          description: "Upper device pixel ratio bound.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "—",
                          description: "Extra classes for the root element.",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "—",
                          description: "Content layered above the effect.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, r.jsx)(i.lT, { children: (0, r.jsx)(i.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
