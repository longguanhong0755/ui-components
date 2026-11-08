/* ReactBits Pro public preview module 85577 for shader-waves.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/85577.8f057c8f1cc3278b.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  85577: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => m }));
    var r = n(95155),
      a = n(12115),
      i = n(56388),
      o = n(48543),
      l = n(90761),
      s = n(12246),
      d = n(2253),
      c = n(90650);
    let u = ({
      width: e = "100%",
      height: t = "100%",
      speed: n = 1,
      color1: i = "#00ff88",
      color2: o = "#0088ff",
      frequency: l = 1,
      intensity: u = 1,
      complexity: f = 1,
      opacity: m = 1,
      transparent: p = !0,
      backgroundColor: v = "#000000",
      className: h,
      children: g,
    }) => {
      let x = (0, a.useRef)(null),
        w = (0, a.useRef)(0),
        y = (0, a.useRef)(0);
      (0, a.useEffect)(() => {
        if (!x.current) return;
        let e = x.current,
          t = (e) => {
            let t = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);
            return t
              ? {
                  r: parseInt(t[1], 16) / 255,
                  g: parseInt(t[2], 16) / 255,
                  b: parseInt(t[3], 16) / 255,
                }
              : { r: 0, g: 1, b: 1 };
          },
          r = t(i),
          a = t(o),
          c = t(v),
          h = e.getBoundingClientRect(),
          g = h.width,
          C = h.height,
          b = new s.WebGLRenderer({
            antialias: !0,
            alpha: !0,
            powerPreference: "high-performance",
            stencil: !1,
            depth: !1,
          });
        b.setClearColor(0, 0);
        let S = Math.min(window.devicePixelRatio, 2);
        (b.setSize(g, C, !1),
          b.setPixelRatio(S),
          (b.domElement.style.width = "100%"),
          (b.domElement.style.height = "100%"),
          (b.domElement.style.display = "block"),
          e.appendChild(b.domElement));
        let j = new d.Z58(),
          k = new d.qUd(-1, 1, 1, -1, 0, 1),
          N = {
            iTime: { value: 0 },
            iResolution: { value: new d.Pq0(g * S, C * S, 1) },
            uColor1: { value: new d.Pq0(r.r, r.g, r.b) },
            uColor2: { value: new d.Pq0(a.r, a.g, a.b) },
            uBackgroundColor: { value: new d.Pq0(c.r, c.g, c.b) },
            uTransparent: { value: +!!p },
            uFrequency: { value: l },
            uIntensity: { value: u },
            uComplexity: { value: f },
            uOpacity: { value: m },
          },
          P = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
          O = `
      uniform float iTime;
      uniform vec3 iResolution;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uBackgroundColor;
      uniform float uTransparent;
      uniform float uFrequency;
      uniform float uIntensity;
      uniform float uComplexity;
      uniform float uOpacity;

      vec3 hash3D(vec3 value) {
        vec3 scaled = value * 34.0 + 1.0;
        return mod(scaled * value, 289.0);
      }

      float generateNoise(vec2 coord) {
        const vec4 skewConstants = vec4(
          0.211324865405187,
          0.366025403784439,
          -0.577350269189626,
          0.024390243902439
        );

        vec2 skewedCoord = coord + dot(coord, skewConstants.yy);
        vec2 cellOrigin = floor(skewedCoord);
        vec2 offset0 = coord - cellOrigin + dot(cellOrigin, skewConstants.xx);

        vec2 cornerOffset = (offset0.x > offset0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);

        vec4 offsets = offset0.xyxy + skewConstants.xxzz;
        offsets.xy -= cornerOffset;

        cellOrigin = mod(cellOrigin, 289.0);

        vec3 gradientIdx = hash3D(
          hash3D(cellOrigin.y + vec3(0.0, cornerOffset.y, 1.0)) +
          cellOrigin.x + vec3(0.0, cornerOffset.x, 1.0)
        );

        vec3 weights = max(
          0.5 - vec3(
            dot(offset0, offset0),
            dot(offsets.xy, offsets.xy),
            dot(offsets.zw, offsets.zw)
          ),
          0.0
        );
        weights = weights * weights;
        weights = weights * weights;

        vec3 gradX = 2.0 * fract(gradientIdx * skewConstants.www) - 1.0;
        vec3 gradY = abs(gradX) - 0.5;
        vec3 roundedX = floor(gradX + 0.5);
        vec3 finalGradX = gradX - roundedX;

        weights *= 1.79284291400159 - 0.85373472095314 * (finalGradX * finalGradX + gradY * gradY);

        vec3 gradients;
        gradients.x = finalGradX.x * offset0.x + gradY.x * offset0.y;
        gradients.yz = finalGradX.yz * offsets.xz + gradY.yz * offsets.yw;

        return 130.0 * dot(weights, gradients);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;

        vec2 scaledUV = uv * uFrequency;
        float t = iTime;

        float innerNoise = generateNoise(scaledUV + t * 0.25);

        float middleNoise = generateNoise(scaledUV + innerNoise * 0.1 * uComplexity);

        float s1 = generateNoise(scaledUV + t * 0.5 + middleNoise);

        float s2 = generateNoise(scaledUV + s1);

        s1 *= uIntensity;
        s2 *= uIntensity;

        float sharpS1 = sign(s1) * pow(abs(s1), 0.8);
        float sharpS2 = sign(s2) * pow(abs(s2), 0.8);

        vec3 mixedColor = mix(uColor1, uColor2, (sharpS2 + 1.0) * 0.5);
        mixedColor = mix(mixedColor, uColor1, (sharpS1 + 1.0) * 0.3);

        mixedColor = pow(mixedColor, vec3(0.9));

        float alpha = (abs(sharpS1) + abs(sharpS2)) * 0.5 * uOpacity;
        alpha = pow(alpha, 0.85);
        alpha = clamp(alpha, 0.0, 1.0);

        if (uTransparent > 0.5) {
          if (alpha < 0.05) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
            return;
          }
          gl_FragColor = vec4(mixedColor * alpha, alpha);
        } else {
          vec3 finalColor = mix(uBackgroundColor, mixedColor, alpha);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      }
    `,
          E = new d.BKk({
            uniforms: N,
            vertexShader: P,
            fragmentShader: O,
            transparent: !0,
            blending: d.bCz,
            blendEquation: d.gO9,
            blendSrc: d.qad,
            blendDst: d.OuU,
            depthTest: !1,
            depthWrite: !1,
            premultipliedAlpha: !0,
          }),
          I = new d.bdM(2, 2),
          q = new d.eaF(I, E);
        (j.add(q), (y.current = performance.now()));
        let z = () => {
          w.current = requestAnimationFrame(z);
          let e = (performance.now() - y.current) / 1e3;
          ((N.iTime.value = e * n), b.render(j, k));
        };
        z();
        let R = () => {
          let t = e.getBoundingClientRect(),
            n = t.width,
            r = t.height;
          (b.setSize(n, r, !1), N.iResolution.value.set(n * S, r * S, 1));
        };
        return (
          window.addEventListener("resize", R),
          () => {
            (window.removeEventListener("resize", R),
              cancelAnimationFrame(w.current),
              j.remove(q),
              I.dispose(),
              E.dispose(),
              b.dispose(),
              b.domElement &&
                b.domElement.parentNode === e &&
                e.removeChild(b.domElement));
          }
        );
      }, [n, i, o, l, u, f, m, p, v]);
      let C = "number" == typeof e ? `${e}px` : e,
        b = "number" == typeof t ? `${t}px` : t;
      return (0, r.jsxs)("div", {
        className: (0, c.cn)("relative overflow-hidden", h),
        style: { width: C, height: b },
        children: [
          (0, r.jsx)("div", { ref: x, className: "absolute inset-0" }),
          g &&
            (0, r.jsx)("div", {
              className: "relative z-10 w-full h-full pointer-events-none",
              children: g,
            }),
        ],
      });
    };
    u.displayName = "ShaderWaves";
    var f = n(30701);
    let m = () => {
      let [e, t] = (0, l.I)(),
        { resolvedTheme: n } = (0, f.D)(),
        [s, d] = (0, a.useState)(0.2),
        [c, m] = (0, a.useState)("#5227FF"),
        [p, v] = (0, a.useState)({ light: null, dark: null }),
        [h, g] = (0, a.useState)(0.5),
        [x, w] = (0, a.useState)(3),
        [y, C] = (0, a.useState)(0.5),
        [b, S] = (0, a.useState)(1),
        [j, k] = (0, a.useState)(!0),
        N = (0, a.useMemo)(() => ("light" === n ? "#ffffff" : "#0A0A0A"), [n]),
        P = "light" === n ? "light" : "dark",
        O = p[P] ?? N;
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
                    children: (0, r.jsx)("div", {
                      className: "w-full h-full rounded-lg overflow-hidden",
                      children: (0, r.jsx)(
                        u,
                        {
                          width: "100%",
                          height: "100%",
                          speed: s,
                          color1: c,
                          color2: O,
                          frequency: h,
                          intensity: x,
                          complexity: y,
                          opacity: b,
                          transparent: j,
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, r.jsxs)(i.IH, {
                    children: [
                      (0, r.jsx)(o.PreviewColor, {
                        title: "Color 1",
                        value: c,
                        onChange: m,
                      }),
                      (0, r.jsx)(o.PreviewColor, {
                        title: "Color 2",
                        value: O,
                        onChange: (e) => {
                          v((t) => ({ ...t, [P]: e }));
                        },
                      }),
                      (0, r.jsx)(o.PreviewSwitch, {
                        title: "Transparent",
                        checked: j,
                        onChange: k,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Speed",
                        value: s,
                        onChange: (e) => d(e),
                        min: 0,
                        max: 3,
                        step: 0.1,
                        valueUnit: "x",
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Frequency",
                        value: h,
                        onChange: (e) => g(e),
                        min: 0.5,
                        max: 3,
                        step: 0.1,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Intensity",
                        value: x,
                        onChange: (e) => w(e),
                        min: 0.1,
                        max: 3,
                        step: 0.1,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Complexity",
                        value: y,
                        onChange: (e) => C(e),
                        min: 0,
                        max: 2,
                        step: 0.1,
                      }),
                      (0, r.jsx)(o.PreviewSlider, {
                        title: "Opacity",
                        value: b,
                        onChange: (e) => S(e),
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                    ],
                  }),
                  (0, r.jsx)(i.Ub, {
                    data: [
                      {
                        name: "width",
                        type: "number | string",
                        default: '"100%"',
                        description:
                          "Width of the component in pixels or CSS value",
                      },
                      {
                        name: "height",
                        type: "number | string",
                        default: '"100%"',
                        description:
                          "Height of the component in pixels or CSS value",
                      },
                      {
                        name: "speed",
                        type: "number",
                        default: "1.0",
                        description: "Animation speed multiplier",
                      },
                      {
                        name: "color1",
                        type: "string",
                        default: '"#00ff88"',
                        description: "Primary wave color in hex format",
                      },
                      {
                        name: "color2",
                        type: "string",
                        default: '"#0088ff"',
                        description: "Secondary wave color in hex format",
                      },
                      {
                        name: "frequency",
                        type: "number",
                        default: "1.0",
                        description:
                          "Wave frequency/scale (higher = more waves)",
                      },
                      {
                        name: "intensity",
                        type: "number",
                        default: "1.0",
                        description: "Wave intensity/amplitude",
                      },
                      {
                        name: "complexity",
                        type: "number",
                        default: "1.0",
                        description:
                          "Complexity of wave patterns (layers of noise)",
                      },
                      {
                        name: "opacity",
                        type: "number",
                        default: "1.0",
                        description: "Opacity of the waves (0-1)",
                      },
                      {
                        name: "transparent",
                        type: "boolean",
                        default: "true",
                        description:
                          "Whether the background should be transparent",
                      },
                      {
                        name: "backgroundColor",
                        type: "string",
                        default: '"#000000"',
                        description:
                          "Background color when transparent is false",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description: "Additional CSS classes",
                      },
                      {
                        name: "children",
                        type: "React.ReactNode",
                        default: "undefined",
                        description: "Content to render on top of the waves",
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
