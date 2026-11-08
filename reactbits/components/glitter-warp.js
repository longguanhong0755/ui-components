/* ReactBits Pro public preview module 1385 for glitter-warp.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/1385.4021de561fe3a59f.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  1385: (e, t, i) => {
    (i.r(t), i.d(t, { default: () => m }));
    var n = i(95155),
      r = i(12115),
      s = i(56388),
      a = i(48543),
      l = i(90761),
      o = i(12246),
      u = i(2253),
      d = i(90650);
    let c = ({
      width: e = "100%",
      height: t = "100%",
      speed: i = 1,
      color: s = "#ffffff",
      density: a = 15,
      brightness: l = 1,
      starSize: c = 0.1,
      focalDepth: m = 0.05,
      turbulence: f = 0,
      autoPlay: p = !0,
      className: h,
      children: v,
    }) => {
      let g = (0, r.useRef)(null),
        b = (0, r.useRef)(0),
        x = (0, r.useRef)(0),
        w = (0, r.useRef)(!p);
      (0, r.useEffect)(() => {
        let e;
        if (!g.current) return;
        let t = g.current,
          n = (e = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(s))
            ? {
                r: parseInt(e[1], 16) / 255,
                g: parseInt(e[2], 16) / 255,
                b: parseInt(e[3], 16) / 255,
              }
            : { r: 1, g: 1, b: 1 },
          r = t.getBoundingClientRect(),
          d = r.width,
          p = r.height,
          h = new o.WebGLRenderer({
            antialias: !0,
            alpha: !0,
            powerPreference: "high-performance",
          });
        h.setClearColor(0, 0);
        let v = Math.min(window.devicePixelRatio, 2);
        (h.setSize(d, p, !1),
          h.setPixelRatio(v),
          (h.domElement.style.width = "100%"),
          (h.domElement.style.height = "100%"),
          (h.domElement.style.display = "block"),
          t.appendChild(h.domElement));
        let y = new u.Z58(),
          C = new u.qUd(-1, 1, 1, -1, 0, 1),
          S = {
            iTime: { value: 0 },
            iResolution: { value: new u.Pq0(d * v, p * v, 1) },
            uColor: { value: new u.Pq0(n.r, n.g, n.b) },
            uDensity: { value: a },
            uBrightness: { value: l },
            uStarSize: { value: c },
            uFocalDepth: { value: m },
            uTurbulence: { value: f },
          },
          P = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
          j = `
      uniform float iTime;
      uniform vec3 iResolution;
      uniform vec3 uColor;
      uniform float uDensity;
      uniform float uBrightness;
      uniform float uStarSize;
      uniform float uFocalDepth;
      uniform float uTurbulence;

      void main() {
        vec2 screenPos = gl_FragCoord.xy;
        vec2 centerOffset = screenPos - (iResolution.xy * 0.5);
        vec2 normalizedCoords = centerOffset / iResolution.y;

        vec3 viewDirection = normalize(vec3(normalizedCoords, uFocalDepth));

        vec3 travelOffset = vec3(0.0, 0.0, iTime);
        vec3 spacePosition = (viewDirection * uDensity) + travelOffset;

        if (uTurbulence > 0.0) {
          spacePosition.x += sin(spacePosition.z * 0.5 + iTime) * uTurbulence;
          spacePosition.y += cos(spacePosition.z * 0.3 + iTime * 0.7) * uTurbulence;
        }

        vec3 gridCell = floor(spacePosition);
        vec3 cellOffset = fract(spacePosition);

        vec3 hashVector = vec3(2.154, -6.21, 0.42);
        vec3 starPosition = fract(cross(gridCell, hashVector));
        starPosition = (starPosition * 0.5) + 0.25;

        float distToStar = distance(cellOffset, starPosition);

        float intensityFalloff = uStarSize - distToStar;
        float starIntensity = max(0.0, intensityFalloff * 10.0 * uBrightness);

        starIntensity = starIntensity * starIntensity;

        if (starIntensity < 0.01) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
          return;
        }

        vec3 finalColor = uColor * starIntensity;

        gl_FragColor = vec4(finalColor, starIntensity);
      }
    `,
          T = new u.BKk({
            uniforms: S,
            vertexShader: P,
            fragmentShader: j,
            transparent: !0,
            blending: u.bCz,
            blendEquation: u.gO9,
            blendSrc: u.qad,
            blendDst: u.OuU,
            depthTest: !1,
            depthWrite: !1,
            premultipliedAlpha: !0,
          }),
          E = new u.bdM(2, 2),
          z = new u.eaF(E, T);
        (y.add(z), (x.current = performance.now()));
        let D = () => {
          if (((b.current = requestAnimationFrame(D)), !w.current)) {
            let e = (performance.now() - x.current) / 1e3;
            S.iTime.value = e * i;
          }
          h.render(y, C);
        };
        D();
        let R = () => {
          let e = t.getBoundingClientRect(),
            i = e.width,
            n = e.height;
          (h.setSize(i, n, !1), S.iResolution.value.set(i * v, n * v, 1));
        };
        return (
          window.addEventListener("resize", R),
          () => {
            (window.removeEventListener("resize", R),
              cancelAnimationFrame(b.current),
              y.remove(z),
              E.dispose(),
              T.dispose(),
              h.dispose(),
              h.domElement &&
                h.domElement.parentNode === t &&
                t.removeChild(h.domElement));
          }
        );
      }, [i, s, a, l, c, m, f, p]);
      let y = "number" == typeof e ? `${e}px` : e,
        C = "number" == typeof t ? `${t}px` : t;
      return (0, n.jsxs)("div", {
        className: (0, d.cn)("relative overflow-hidden", h),
        style: { width: y, height: C },
        children: [
          (0, n.jsx)("div", { ref: g, className: "absolute inset-0" }),
          v &&
            (0, n.jsx)("div", {
              className: "relative z-10 w-full h-full pointer-events-none",
              children: v,
            }),
        ],
      });
    };
    c.displayName = "GlitterWarp";
    let m = () => {
      let [e, t] = (0, l.I)(),
        [i, o] = (0, r.useState)(1),
        [u, d] = (0, r.useState)("#B19EEF"),
        [m, f] = (0, r.useState)(20),
        [p, h] = (0, r.useState)(1),
        [v, g] = (0, r.useState)(0.1),
        [b, x] = (0, r.useState)(0.05),
        [w, y] = (0, r.useState)(0),
        [C, S] = (0, r.useState)(!0);
      return (0, n.jsxs)("div", {
        children: [
          (0, n.jsx)(s.Bg, {}),
          (0, n.jsxs)(s.VX, {
            children: [
              (0, n.jsxs)(s.Ec, {
                children: [
                  (0, n.jsx)(s.Ch, {
                    onRefresh: t,
                    minHeight: 600,
                    children: (0, n.jsx)("div", {
                      className: "w-full h-full rounded-lg overflow-hidden",
                      children: (0, n.jsx)(
                        c,
                        {
                          width: "100%",
                          height: "100%",
                          speed: i,
                          color: u,
                          density: m,
                          brightness: p,
                          starSize: v,
                          focalDepth: b,
                          turbulence: w,
                          autoPlay: C,
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, n.jsxs)(s.IH, {
                    children: [
                      (0, n.jsx)(a.PreviewSwitch, {
                        title: "Auto Play",
                        checked: C,
                        onChange: S,
                      }),
                      (0, n.jsx)(a.PreviewSlider, {
                        title: "Speed",
                        value: i,
                        onChange: (e) => o(e),
                        min: 0,
                        max: 3,
                        step: 0.1,
                        valueUnit: "x",
                      }),
                      (0, n.jsx)(a.PreviewSlider, {
                        title: "Turbulence",
                        value: w,
                        onChange: (e) => y(e),
                        min: 0,
                        max: 2,
                        step: 0.1,
                      }),
                      (0, n.jsx)(a.PreviewSlider, {
                        title: "Density",
                        value: m,
                        onChange: (e) => f(e),
                        min: 5,
                        max: 30,
                        step: 0.5,
                      }),
                      (0, n.jsx)(a.PreviewSlider, {
                        title: "Star Size",
                        value: v,
                        onChange: (e) => g(e),
                        min: 0.05,
                        max: 0.3,
                        step: 0.01,
                      }),
                      (0, n.jsx)(a.PreviewSlider, {
                        title: "Focal Depth",
                        value: b,
                        onChange: (e) => x(e),
                        min: 0.01,
                        max: 0.2,
                        step: 0.01,
                      }),
                      (0, n.jsx)(a.PreviewColor, {
                        title: "Star Color",
                        value: u,
                        onChange: d,
                      }),
                      (0, n.jsx)(a.PreviewSlider, {
                        title: "Brightness",
                        value: p,
                        onChange: (e) => h(e),
                        min: 0.1,
                        max: 3,
                        step: 0.1,
                        valueUnit: "x",
                      }),
                    ],
                  }),
                  (0, n.jsx)(s.Ub, {
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
                        name: "color",
                        type: "string",
                        default: '"#ffffff"',
                        description: "Star color in hex format",
                      },
                      {
                        name: "density",
                        type: "number",
                        default: "15.0",
                        description:
                          "Density of stars (higher = more spread out)",
                      },
                      {
                        name: "brightness",
                        type: "number",
                        default: "1.0",
                        description: "Star brightness multiplier",
                      },
                      {
                        name: "starSize",
                        type: "number",
                        default: "0.1",
                        description: "Star size (higher = larger stars)",
                      },
                      {
                        name: "focalDepth",
                        type: "number",
                        default: "0.05",
                        description:
                          "Focal depth for perspective (lower = stronger 3D effect)",
                      },
                      {
                        name: "turbulence",
                        type: "number",
                        default: "0.0",
                        description:
                          "Turbulence intensity for wavey distortion",
                      },
                      {
                        name: "autoPlay",
                        type: "boolean",
                        default: "true",
                        description:
                          "Whether to automatically play the animation",
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
                        description:
                          "Content to render on top of the glitter effect",
                      },
                    ],
                  }),
                ],
              }),
              (0, n.jsx)(s.lT, { children: (0, n.jsx)(s.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
