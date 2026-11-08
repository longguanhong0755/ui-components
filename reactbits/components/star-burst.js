/* ReactBits Pro public preview module 11869 for star-burst.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/11869.d7de96233691e35c.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  11869: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => d }));
    var r = n(95155),
      a = n(12115),
      i = n(56388),
      u = n(90761),
      s = n(2253),
      o = n(12246),
      l = n(90650);
    let f = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,
      m = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uSpeed;
  uniform float uDensity;
  uniform float uStarCount;
  uniform vec3 uColor;
  uniform float uCenterX;
  uniform float uCenterY;
  uniform float uStarSize;
  uniform float uBrightness;
  uniform float uOpacity;
  uniform float uFlowerIntensity;
  uniform float uTwinkleSpeed;
  uniform float uWobbleAmount;
  uniform float uInnerLayerIntensity;
  uniform float uOuterLayerIntensity;
  uniform float uFadeHeight;

  varying vec2 vUv;

  const float PI = 3.14159265359;

  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float stars(vec2 uv, float radialOffset, float amount, float intensity) {
    float t = uTime * uSpeed;
    float rad = atan(uv.y, uv.x);
    float r = log(length(uv) + radialOffset) * amount - t;

    vec2 g = vec2(rad / PI * 0.5 + 0.5, r);
    g *= vec2(uStarCount, 1.0);

    vec2 s = vec2(1.0, 1.0);
    vec2 id = floor(g / s + 0.5);
    vec2 o = sign(g - s * id);

    float min_d = 100.0;
    for (int i = 0; i < 2; ++i) {
        for (int j = 0; j < 2; ++j) {
            vec2 nid = id + o * vec2(float(i), float(j));
            vec2 nh = hash22(nid) * 100.0;
            vec2 n = g - s * nid;

            float t2 = t * uTwinkleSpeed;
            vec2 np = vec2(cos(nh.x + t2), sin(nh.y + t2)) * uWobbleAmount;

            vec2 diff = n - np;
            diff.x *= (200.0 / uStarCount);

            float dt = dot(diff, diff);
            if (dt < min_d) {
                min_d = dt;
            }
        }
    }

    float d = sqrt(min_d);
    return (uStarSize * 0.05) / d * intensity;
  }

  float curve_mask(vec2 uv) {
    float x = uv.x;
    float y = 0.05 * x * x + 0.05;
    return smoothstep(-0.1, 0.1, abs(uv.y) - y);
  }

  float flower(vec2 uv) {
    float fade_out = smoothstep(1.5, 0.0, length(uv));
    float flower = smoothstep(1.2, 0.0, abs(sin(atan(uv.y * 4.0, uv.x) * 3.0)) * 0.7);
    return flower * fade_out * uFlowerIntensity;
  }

  void main() {
    vec2 uv = (vUv * uResolution - 0.5 * uResolution) / uResolution.y;
    vec2 centeredUv = vUv * 2.0 - 1.0;
    centeredUv.x *= uResolution.x / uResolution.y;

    vec2 centerOffset = vec2((uCenterX - 0.5) * 2.0, (uCenterY - 0.5) * 2.0);
    centerOffset.x *= uResolution.x / uResolution.y;

    vec2 pos = centeredUv - centerOffset;
    pos.y += 1.0;

    float s = stars(pos, 1.0, 20.0 * uDensity, uInnerLayerIntensity) * 0.5;
    float l = stars(pos, 5.0, 30.0 * uDensity, uOuterLayerIntensity) * 0.5;

    float f = flower(pos);
    float m = curve_mask(pos);

    float brightness = s + l + f;

    brightness *= m;

    float gradient = smoothstep(uFadeHeight, 0.0, abs(pos.y));
    brightness *= gradient;

    brightness *= uBrightness;

    float alpha = clamp(brightness, 0.0, 1.0) * uOpacity;

    gl_FragColor = vec4(uColor, alpha);
  }
`,
      c = ({
        speed: e = 1,
        density: t = 0.5,
        starCount: n = 100,
        color: i = "#e3b3ea",
        centerX: u = 0.5,
        centerY: c = 0.5,
        starSize: d = 0.3,
        brightness: v = 1,
        opacity: p = 1,
        flowerIntensity: y = 0.5,
        twinkleSpeed: h = 0.2,
        wobbleAmount: g = 1,
        innerLayerIntensity: x = 1,
        outerLayerIntensity: b = 1.5,
        fadeHeight: C = 2.5,
        className: S,
      }) => {
        let w = (0, a.useRef)(null),
          j = (0, a.useRef)(null),
          I = (0, a.useRef)(null),
          R = (0, a.useRef)(null);
        return (
          (0, a.useEffect)(() => {
            if (!w.current) return;
            let r = w.current,
              a = r.clientWidth,
              l = r.clientHeight,
              S = new s.Z58(),
              k = new s.qUd(-1, 1, 1, -1, 0, 1),
              O = new o.WebGLRenderer({
                antialias: !0,
                alpha: !0,
                powerPreference: "high-performance",
              });
            (O.setClearColor(0, 0),
              O.setSize(a, l),
              O.setPixelRatio(Math.min(window.devicePixelRatio, 2)),
              r.appendChild(O.domElement),
              (j.current = O));
            let z = new s.BKk({
              uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new s.I9Y(a, l) },
                uSpeed: { value: e },
                uDensity: { value: t },
                uStarCount: { value: n },
                uColor: { value: new s.Q1f(i) },
                uCenterX: { value: u },
                uCenterY: { value: c },
                uStarSize: { value: d },
                uBrightness: { value: v },
                uOpacity: { value: p },
                uFlowerIntensity: { value: y },
                uTwinkleSpeed: { value: h },
                uWobbleAmount: { value: g },
                uInnerLayerIntensity: { value: x },
                uOuterLayerIntensity: { value: b },
                uFadeHeight: { value: C },
              },
              vertexShader: f,
              fragmentShader: m,
              transparent: !0,
              blending: s.NTi,
              depthWrite: !1,
            });
            I.current = z;
            let T = new s.bdM(2, 2),
              H = new s.eaF(T, z);
            S.add(H);
            let L = new s.zD7(),
              F = () => {
                let e = L.getElapsedTime();
                ((z.uniforms.uTime.value = e),
                  O.render(S, k),
                  (R.current = requestAnimationFrame(F)));
              };
            F();
            let P = new ResizeObserver(() => {
              let e = r.clientWidth,
                t = r.clientHeight;
              (O.setSize(e, t), z.uniforms.uResolution.value.set(e, t));
            });
            return (
              P.observe(r),
              () => {
                (R.current && cancelAnimationFrame(R.current),
                  P.disconnect(),
                  O.dispose(),
                  T.dispose(),
                  z.dispose(),
                  r.contains(O.domElement) && r.removeChild(O.domElement));
              }
            );
          }, []),
          (0, a.useEffect)(() => {
            I.current &&
              ((I.current.uniforms.uSpeed.value = e),
              (I.current.uniforms.uDensity.value = t),
              (I.current.uniforms.uStarCount.value = n),
              I.current.uniforms.uColor.value.set(i),
              (I.current.uniforms.uCenterX.value = u),
              (I.current.uniforms.uCenterY.value = c),
              (I.current.uniforms.uStarSize.value = d),
              (I.current.uniforms.uBrightness.value = v),
              (I.current.uniforms.uOpacity.value = p),
              (I.current.uniforms.uFlowerIntensity.value = y),
              (I.current.uniforms.uTwinkleSpeed.value = h),
              (I.current.uniforms.uWobbleAmount.value = g),
              (I.current.uniforms.uInnerLayerIntensity.value = x),
              (I.current.uniforms.uOuterLayerIntensity.value = b),
              (I.current.uniforms.uFadeHeight.value = C));
          }, [e, t, n, i, u, c, d, v, p, y, h, g, x, b, C]),
          (0, r.jsx)("div", {
            ref: w,
            className: (0, l.cn)(
              "relative w-full h-full overflow-hidden bg-transparent",
              S,
            ),
            style: { minHeight: "inherit" },
          })
        );
      },
      d = () => {
        let [e, t] = (0, u.I)(),
          [n, s] = (0, a.useState)(1),
          [o, l] = (0, a.useState)(0.5),
          [f, m] = (0, a.useState)(100),
          [d, v] = (0, a.useState)("#e3b3ea"),
          [p, y] = (0, a.useState)(0.3),
          [h, g] = (0, a.useState)(0.2),
          [x, b] = (0, a.useState)(1),
          [C, S] = (0, a.useState)(1),
          [w, j] = (0, a.useState)(1.5),
          [I, R] = (0, a.useState)(0.5),
          [k, O] = (0, a.useState)(0.5),
          [z, T] = (0, a.useState)(1),
          [H, L] = (0, a.useState)(1),
          [F, P] = (0, a.useState)(0.5),
          [_, E] = (0, a.useState)(2.5);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(i.Bg, {}),
            (0, r.jsxs)(i.VX, {
              children: [
                (0, r.jsxs)(i.Ec, {
                  children: [
                    (0, r.jsx)(i.Ch, {
                      onRefresh: t,
                      minHeight: 600,
                      children: (0, r.jsx)(
                        c,
                        {
                          speed: n,
                          density: o,
                          starCount: f,
                          color: d,
                          centerX: I,
                          centerY: k,
                          starSize: p,
                          brightness: z,
                          opacity: H,
                          flowerIntensity: F,
                          twinkleSpeed: h,
                          wobbleAmount: x,
                          innerLayerIntensity: C,
                          outerLayerIntensity: w,
                          fadeHeight: _,
                        },
                        e,
                      ),
                    }),
                    (0, r.jsxs)(i.IH, {
                      children: [
                        (0, r.jsx)(i.yt, {
                          title: "Speed",
                          min: 0,
                          max: 5,
                          step: 0.1,
                          value: n,
                          onChange: s,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Density",
                          min: 0.1,
                          max: 3,
                          step: 0.1,
                          value: o,
                          onChange: l,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Star Count",
                          min: 10,
                          max: 400,
                          step: 10,
                          value: f,
                          onChange: m,
                        }),
                        (0, r.jsx)(i.W7, {
                          title: "Color",
                          value: d,
                          onChange: v,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Star Size",
                          min: 0.1,
                          max: 3,
                          step: 0.1,
                          value: p,
                          onChange: y,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Twinkle Speed",
                          min: 0,
                          max: 2,
                          step: 0.1,
                          value: h,
                          onChange: g,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Wobble Amount",
                          min: 0,
                          max: 2,
                          step: 0.1,
                          value: x,
                          onChange: b,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Inner Layer",
                          min: 0,
                          max: 3,
                          step: 0.1,
                          value: C,
                          onChange: S,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Outer Layer",
                          min: 0,
                          max: 3,
                          step: 0.1,
                          value: w,
                          onChange: j,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Center X",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: I,
                          onChange: R,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Center Y",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: k,
                          onChange: O,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Brightness",
                          min: 0,
                          max: 3,
                          step: 0.1,
                          value: z,
                          onChange: T,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: H,
                          onChange: L,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Flower Intensity",
                          min: 0,
                          max: 3,
                          step: 0.1,
                          value: F,
                          onChange: P,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Fade Height",
                          min: 0.5,
                          max: 5,
                          step: 0.1,
                          value: _,
                          onChange: E,
                        }),
                      ],
                    }),
                    (0, r.jsx)(i.Ub, {
                      data: [
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description: "Animation speed multiplier.",
                        },
                        {
                          name: "density",
                          type: "number",
                          default: "0.5",
                          description: "Radial density of the stars.",
                        },
                        {
                          name: "starCount",
                          type: "number",
                          default: "100",
                          description: "Number of angular spokes/stars.",
                        },
                        {
                          name: "color",
                          type: "string",
                          default: '"#e3b3ea"',
                          description: "Star color (hex format).",
                        },
                        {
                          name: "centerX",
                          type: "number",
                          default: "0.5",
                          description: "Horizontal focal point (0-1).",
                        },
                        {
                          name: "centerY",
                          type: "number",
                          default: "0.5",
                          description: "Vertical focal point (0-1).",
                        },
                        {
                          name: "starSize",
                          type: "number",
                          default: "0.3",
                          description: "Star glow size multiplier.",
                        },
                        {
                          name: "brightness",
                          type: "number",
                          default: "1",
                          description: "Overall brightness multiplier.",
                        },
                        {
                          name: "opacity",
                          type: "number",
                          default: "1",
                          description: "Overall opacity (0-1).",
                        },
                        {
                          name: "flowerIntensity",
                          type: "number",
                          default: "0.5",
                          description:
                            "Intensity of the center flower/bloom effect.",
                        },
                        {
                          name: "twinkleSpeed",
                          type: "number",
                          default: "0.2",
                          description: "Speed of star twinkling animation.",
                        },
                        {
                          name: "wobbleAmount",
                          type: "number",
                          default: "1",
                          description: "Amount of star wobble/movement.",
                        },
                        {
                          name: "innerLayerIntensity",
                          type: "number",
                          default: "1",
                          description: "Intensity of the inner star layer.",
                        },
                        {
                          name: "outerLayerIntensity",
                          type: "number",
                          default: "1.5",
                          description: "Intensity of the outer star layer.",
                        },
                        {
                          name: "fadeHeight",
                          type: "number",
                          default: "2.5",
                          description: "Height of the vertical fade gradient.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description: "Additional CSS classes.",
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
