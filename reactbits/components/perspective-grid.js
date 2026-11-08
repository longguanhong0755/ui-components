/* ReactBits Pro public preview module 84800 for perspective-grid.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/84800.93846cb63fef9c08.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  84800: (e, t, i) => {
    (i.r(t), i.d(t, { default: () => v }));
    var a = i(95155),
      n = i(12115),
      r = i(56388),
      o = i(48543),
      l = i(90761),
      s = i(12246),
      d = i(2253),
      u = i(90650);
    let c = ({
      width: e = "100%",
      height: t = 400,
      speed: i = 0.5,
      color: r = "#FF9FFC",
      gridScale: o = 1,
      lineThickness: l = 1,
      antialiasQuality: c = 64,
      autoPlay: m = !0,
      opacity: v = 1,
      fadeSmoothness: p = 1,
      perspective: h = 0,
      gridLength: f = 10,
      curve: g = 0,
      bottomFade: x = "#0a0a0a",
      className: y,
      children: b,
    }) => {
      let C = (0, n.useRef)(null),
        w = (0, n.useRef)(0),
        S = (0, n.useRef)(0),
        P = (0, n.useRef)(!m);
      (0, n.useEffect)(() => {
        let e;
        if (!C.current) return;
        let t = C.current,
          a = (e = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(r))
            ? {
                r: parseInt(e[1], 16) / 255,
                g: parseInt(e[2], 16) / 255,
                b: parseInt(e[3], 16) / 255,
              }
            : { r: 0, g: 1, b: 1 },
          n = t.getBoundingClientRect(),
          u = n.width,
          m = n.height,
          x = new s.WebGLRenderer({
            antialias: !0,
            alpha: !0,
            powerPreference: "high-performance",
          });
        x.setClearColor(0, 0);
        let y = Math.min(window.devicePixelRatio, 2);
        (x.setSize(u, m, !1),
          x.setPixelRatio(y),
          (x.domElement.style.width = "100%"),
          (x.domElement.style.height = "100%"),
          (x.domElement.style.display = "block"),
          t.appendChild(x.domElement));
        let b = new d.Z58(),
          j = new d.qUd(-1, 1, 1, -1, 0, 1),
          F = {
            iTime: { value: 0 },
            iResolution: { value: new d.Pq0(u * y, m * y, 1) },
            uColor: { value: new d.Pq0(a.r, a.g, a.b) },
            uGridScale: { value: o },
            uLineThickness: { value: l },
            uAntialiasQuality: { value: c },
            uOpacity: { value: v },
            uFadeSmoothness: { value: p },
            uPerspective: { value: h },
            uGridLength: { value: f },
            uCurve: { value: g },
          },
          R = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
          k = `
      uniform float iTime;
      uniform vec3 iResolution;
      uniform vec3 uColor;
      uniform float uGridScale;
      uniform float uLineThickness;
      uniform float uAntialiasQuality;
      uniform float uOpacity;
      uniform float uFadeSmoothness;
      uniform float uPerspective;
      uniform float uGridLength;
      uniform float uCurve;

      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

        if (uv.y > 0.0) {
          fragColor = vec4(0.0);
          return;
        }

        uv.y = -uv.y;

        float perspectiveRad = radians(uPerspective);
        float cosP = cos(perspectiveRad);
        float sinP = sin(perspectiveRad);

        float uvYRotated = uv.y * cosP;
        float depthAdjust = uv.y * sinP;

        uvYRotated = max(uvYRotated, 0.001);

        float d = 1.0 / abs(uvYRotated);
        d = d * (1.0 + depthAdjust);

        d = min(d, uGridLength);

        vec2 pv = vec2(uv.x * d, d);

        if (uCurve > 0.0) {
          float curveAmount = uCurve * (1.0 - uvYRotated / 1.0);
          pv.x = pv.x + sign(pv.x) * pow(abs(pv.x), 1.0 + curveAmount * 0.3) * curveAmount * 0.2;
        }

        pv.y += iTime;
        pv *= uGridScale;

        vec2 grid = fract(pv);

        vec2 derivative = fwidth(pv);

        vec2 gridDist = min(grid, 1.0 - grid);

        vec2 aa = derivative * (1.0 + uLineThickness * 2.0);
        vec2 gridAA = smoothstep(aa, vec2(0.0), gridDist);

        float gridPattern = max(gridAA.x, gridAA.y);

        float fadeFactor = smoothstep(0.0, 0.4, uv.y) * smoothstep(uGridLength, 2.0, d);

        float alpha = gridPattern * fadeFactor * uOpacity;

        float cutoffMin = 0.15;
        float cutoffMax = 0.15 + (uFadeSmoothness);
        alpha = smoothstep(cutoffMin, cutoffMax, alpha);

        alpha = alpha * alpha;

        vec3 col = uColor * alpha;

        if (alpha < 0.05) {
          fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        } else {
          fragColor = vec4(col, alpha);
        }
      }

      void main() {
        vec4 color = vec4(0.0);
        mainImage(color, gl_FragCoord.xy);
        gl_FragColor = color;
      }
    `,
          A = new d.BKk({
            uniforms: F,
            vertexShader: R,
            fragmentShader: k,
            transparent: !0,
            blending: d.bCz,
            blendEquation: d.gO9,
            blendSrc: d.qad,
            blendDst: d.OuU,
            depthTest: !1,
            depthWrite: !1,
            premultipliedAlpha: !0,
          }),
          E = new d.bdM(2, 2),
          N = new d.eaF(E, A);
        (b.add(N), (S.current = performance.now()));
        let T = () => {
          if (((w.current = requestAnimationFrame(T)), !P.current)) {
            let e = (performance.now() - S.current) / 1e3;
            F.iTime.value = e * i;
          }
          x.render(b, j);
        };
        T();
        let G = () => {
          let e = t.getBoundingClientRect(),
            i = e.width,
            a = e.height;
          (x.setSize(i, a, !1), F.iResolution.value.set(i * y, a * y, 1));
        };
        return (
          window.addEventListener("resize", G),
          () => {
            (window.removeEventListener("resize", G),
              cancelAnimationFrame(w.current),
              b.remove(N),
              E.dispose(),
              A.dispose(),
              x.dispose(),
              x.domElement &&
                x.domElement.parentNode === t &&
                t.removeChild(x.domElement));
          }
        );
      }, [i, r, o, l, c, m, v, p, h, f, g]);
      let j = "number" == typeof e ? `${e}px` : e,
        F = "number" == typeof t ? `${t}px` : t;
      return (0, a.jsxs)("div", {
        className: (0, u.cn)("relative overflow-hidden", y),
        style: { width: j, height: F },
        children: [
          (0, a.jsx)("div", { ref: C, className: "absolute inset-0" }),
          x &&
            (0, a.jsx)("div", {
              className:
                "absolute bottom-0 left-0 right-0 h-[30%] pointer-events-none z-5",
              style: {
                background: `linear-gradient(to top, ${x}, transparent)`,
              },
            }),
          b &&
            (0, a.jsx)("div", {
              className: "relative z-10 w-full h-full pointer-events-none",
              children: b,
            }),
        ],
      });
    };
    c.displayName = "PerspectiveGrid";
    var m = i(30701);
    let v = () => {
      let [e, t] = (0, l.I)(),
        [i, s] = (0, n.useState)(0.5),
        [d, u] = (0, n.useState)("#FF9FFC"),
        [v, p] = (0, n.useState)(1),
        [h, f] = (0, n.useState)(1),
        [g, x] = (0, n.useState)(64),
        [y, b] = (0, n.useState)(!0),
        [C, w] = (0, n.useState)(1),
        [S, P] = (0, n.useState)(1),
        [j, F] = (0, n.useState)(0),
        [R, k] = (0, n.useState)(10),
        [A, E] = (0, n.useState)(0),
        { resolvedTheme: N } = (0, m.D)();
      return (0, a.jsxs)("div", {
        children: [
          (0, a.jsx)(r.Bg, {}),
          (0, a.jsxs)(r.VX, {
            children: [
              (0, a.jsxs)(r.Ec, {
                children: [
                  (0, a.jsx)(r.Ch, {
                    onRefresh: t,
                    minHeight: 600,
                    children: (0, a.jsx)("div", {
                      className:
                        "w-full h-full bg-transparent rounded-lg overflow-hidden",
                      children: (0, a.jsx)(
                        c,
                        {
                          width: "100%",
                          height: "100%",
                          speed: i,
                          color: d,
                          gridScale: v,
                          lineThickness: h,
                          antialiasQuality: g,
                          autoPlay: y,
                          opacity: C,
                          fadeSmoothness: S,
                          perspective: j,
                          gridLength: R,
                          curve: A,
                          bottomFade: "dark" === N ? "#0a0a0a" : "#ffffff",
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, a.jsxs)(r.IH, {
                    children: [
                      (0, a.jsx)(o.PreviewColor, {
                        title: "Grid Color",
                        value: d,
                        onChange: u,
                      }),
                      (0, a.jsx)(o.PreviewSlider, {
                        title: "Speed",
                        value: i,
                        onChange: (e) => s(e),
                        min: 0,
                        max: 3,
                        step: 0.1,
                        valueUnit: "x",
                      }),
                      (0, a.jsx)(o.PreviewSwitch, {
                        title: "Auto Play",
                        checked: y,
                        onChange: b,
                      }),
                      (0, a.jsx)(o.PreviewSlider, {
                        title: "Opacity",
                        value: C,
                        onChange: (e) => w(e),
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, a.jsx)(o.PreviewSlider, {
                        title: "Grid Scale",
                        value: v,
                        onChange: (e) => p(e),
                        min: 0.5,
                        max: 5,
                        step: 0.1,
                        valueUnit: "x",
                      }),
                      (0, a.jsx)(o.PreviewSlider, {
                        title: "Line Thickness",
                        value: h,
                        onChange: (e) => f(e),
                        min: 0.1,
                        max: 2,
                        step: 0.1,
                      }),
                      (0, a.jsx)(o.PreviewSlider, {
                        title: "Grid Length",
                        value: R,
                        onChange: (e) => k(e),
                        min: 2,
                        max: 15,
                        step: 0.5,
                      }),
                      (0, a.jsx)(o.PreviewSlider, {
                        title: "Antialias Quality",
                        value: g,
                        onChange: (e) => x(e),
                        min: 16,
                        max: 128,
                        step: 16,
                      }),
                      (0, a.jsx)(o.PreviewSlider, {
                        title: "Perspective",
                        value: j,
                        onChange: (e) => F(e),
                        min: -45,
                        max: 45,
                        step: 1,
                        valueUnit: "\xb0",
                      }),
                      (0, a.jsx)(o.PreviewSlider, {
                        title: "Curve",
                        value: A,
                        onChange: (e) => E(e),
                        min: 0,
                        max: 5,
                        step: 0.1,
                      }),
                      (0, a.jsx)(o.PreviewSlider, {
                        title: "Fade Smoothness",
                        value: S,
                        onChange: (e) => P(e),
                        min: 0.1,
                        max: 5,
                        step: 0.05,
                      }),
                    ],
                  }),
                  (0, a.jsx)(r.Ub, {
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
                        default: "400",
                        description:
                          "Height of the component in pixels or CSS value",
                      },
                      {
                        name: "speed",
                        type: "number",
                        default: "0.5",
                        description: "Animation speed multiplier",
                      },
                      {
                        name: "color",
                        type: "string",
                        default: '"#FF9FFC"',
                        description: "Grid color in hex format",
                      },
                      {
                        name: "gridScale",
                        type: "number",
                        default: "1.0",
                        description:
                          "Grid scale factor - higher values create smaller grid cells",
                      },
                      {
                        name: "lineThickness",
                        type: "number",
                        default: "1",
                        description:
                          "Line thickness (0.1 = very thin, 0.5 = medium, 2.0 = thick)",
                      },
                      {
                        name: "antialiasQuality",
                        type: "number",
                        default: "64.0",
                        description:
                          "Anti-aliasing quality - higher values = better quality",
                      },
                      {
                        name: "autoPlay",
                        type: "boolean",
                        default: "true",
                        description:
                          "Whether to automatically play the animation",
                      },
                      {
                        name: "opacity",
                        type: "number",
                        default: "1.0",
                        description: "Opacity of the grid (0-1)",
                      },
                      {
                        name: "fadeSmoothness",
                        type: "number",
                        default: "1",
                        description:
                          "Fade smoothness - controls how gradually the alpha transitions (higher = smoother blend)",
                      },
                      {
                        name: "perspective",
                        type: "number",
                        default: "0.0",
                        description:
                          "Perspective rotation angle in degrees (0 = flat, positive = tilted back)",
                      },
                      {
                        name: "gridLength",
                        type: "number",
                        default: "10.0",
                        description:
                          "How far into the distance the grid extends (higher = longer)",
                      },
                      {
                        name: "curve",
                        type: "number",
                        default: "0.0",
                        description:
                          "Curve intensity - bends the grid upward at edges (0 = flat, higher = more curved)",
                      },
                      {
                        name: "bottomFade",
                        type: "string",
                        default: '"#0a0a0a"',
                        description:
                          'Bottom fade color - adds a gradient fade at the bottom (e.g., "#000000" for black fade, empty/undefined for no fade)',
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
                        description: "Content to render on top of the grid",
                      },
                    ],
                  }),
                ],
              }),
              (0, a.jsx)(r.lT, { children: (0, a.jsx)(r.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
