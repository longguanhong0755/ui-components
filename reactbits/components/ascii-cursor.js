/* ReactBits Pro public preview module 55113 for ascii-cursor.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/55113.0e240f04aaf8bc27.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  55113: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => g }));
    var a = r(95155),
      n = r(12115),
      o = r(30701),
      i = r(56388),
      l = r(90761),
      u = r(81712),
      s = r(3907),
      c = r(90822),
      d = r(40859),
      m = r(44771),
      f = r(2253);
    let h = (0, c.b)(
        {
          uTime: 0,
          uMouse: new f.I9Y(0, 0),
          uPreviousState: null,
          uResolution: new f.I9Y(0, 0),
          uDecay: 0.02,
          uSpeed: 0,
          uRadius: 0.05,
        },
        `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
        `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform sampler2D uPreviousState;
    uniform vec2 uResolution;
    uniform float uDecay;
    uniform float uSpeed;
    uniform float uRadius;

    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;

      float prev = texture2D(uPreviousState, uv).r;

      float aspect = uResolution.x / uResolution.y;
      vec2 aspectCorrection = vec2(aspect, 1.0);
      vec2 mouseUV = uMouse;

      float dist = length((uv - mouseUV) * aspectCorrection);

      float radius = uRadius;

      float brush = smoothstep(radius, 0.0, dist);

      float speedFactor = smoothstep(0.0, 0.1, uSpeed);
      brush *= speedFactor;

      float value = max(prev, brush);

      value -= uDecay;

      gl_FragColor = vec4(vec3(max(0.0, value)), 1.0);
    }
  `,
      ),
      v = (0, c.b)(
        {
          uSimulationState: null,
          uFontTexture: null,
          uResolution: new f.I9Y(0, 0),
          uColor: new f.Q1f(0, 1, 0),
          uBackgroundColor: new f.Q1f(0, 0, 0),
          uCharCount: 10,
          uGridSize: 10,
          uEnableFade: !0,
          uOpacity: 1,
        },
        `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
        `
    uniform sampler2D uSimulationState;
    uniform sampler2D uFontTexture;
    uniform vec2 uResolution;
    uniform vec3 uColor;
    uniform vec3 uBackgroundColor;
    uniform float uCharCount;
    uniform float uGridSize;
    uniform bool uEnableFade;
    uniform float uOpacity;

    varying vec2 vUv;

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      vec2 uv = vUv;

      vec2 gridDims = uResolution / uGridSize;
      vec2 cellUV = floor(uv * gridDims) / gridDims;

      float signal = texture2D(uSimulationState, cellUV + (0.5 / gridDims)).r;

      if (signal < 0.01) discard;

      float rnd = random(cellUV);

      float charIndex = floor(rnd * uCharCount);

      vec2 localUV = fract(uv * gridDims);

      vec2 atlasUV = vec2((localUV.x + charIndex) / uCharCount, localUV.y);

      float charMask = texture2D(uFontTexture, atlasUV).a;

      if (random(cellUV + 10.0) > 0.7) {
        charMask = 0.0;
      }

      float opacity = uEnableFade ? signal : 1.0;

      vec3 finalColor = mix(uBackgroundColor, uColor, charMask);

      gl_FragColor = vec4(finalColor, opacity * uOpacity);
    }
  `,
      );
    (0, u.e)({ AsciiSimulationMaterial: h, AsciiDisplayMaterial: v });
    let p = ({
        simulationScene: e,
        characters: t,
        size: r,
        color: o,
        backgroundColor: i,
        enableFade: l,
        spread: s,
        persistence: c,
        opacity: h,
        enableBloom: v,
        bloomStrength: p,
        bloomRadius: x,
        enableChromaticAberration: g,
        chromaticAberrationOffset: b,
      }) => {
        let { size: C, viewport: y, gl: S } = (0, u.C)(),
          j = (0, n.useRef)(new f.I9Y(0, 0)),
          w = (0, n.useRef)(new f.I9Y(0, 0)),
          R = (0, n.useRef)(0),
          F = (0, n.useMemo)(
            () =>
              ((e, t = 64) => {
                let r = document.createElement("canvas"),
                  a = r.getContext("2d");
                if (!a) return new f.gPd();
                let n = e.length;
                ((r.width = n * t),
                  (r.height = t),
                  (a.font = `bold ${t}px monospace`),
                  (a.fillStyle = "white"),
                  (a.textAlign = "center"),
                  (a.textBaseline = "middle"));
                for (let r = 0; r < n; r++) {
                  let n = e[r],
                    o = r * t + t / 2,
                    i = t / 2;
                  a.fillText(n, o, i);
                }
                let o = new f.GOR(r);
                return (
                  (o.minFilter = f.hxR),
                  (o.magFilter = f.hxR),
                  (o.needsUpdate = !0),
                  o
                );
              })(t),
            [t],
          );
        (0, n.useEffect)(() => {
          let e = (e) => {
            let t = S.domElement;
            if (t) {
              let r = t.getBoundingClientRect(),
                a = (e.clientX - r.left) / r.width,
                n = 1 - (e.clientY - r.top) / r.height;
              j.current.set(a, n);
            }
          };
          return (
            window.addEventListener("mousemove", e),
            () => window.removeEventListener("mousemove", e)
          );
        }, [S.domElement]);
        let k = (0, d.j)({ minFilter: f.hxR, magFilter: f.hxR }),
          U = (0, d.j)({ minFilter: f.hxR, magFilter: f.hxR }),
          D = (0, n.useRef)(null),
          E = (0, n.useRef)(null),
          M = (0, n.useRef)(0);
        return (
          (0, u.D)((a) => {
            let { gl: n, clock: u } = a,
              d = M.current % 2 == 0 ? k : U,
              m = M.current % 2 == 0 ? U : k;
            if (D.current) {
              ((D.current.uTime = u.elapsedTime),
                (D.current.uMouse = j.current),
                (D.current.uPreviousState = m.texture),
                (D.current.uResolution = new f.I9Y(C.width, C.height)),
                (D.current.uRadius = 0.01 * s),
                (D.current.uDecay = (1 / Math.max(0.1, c)) * 0.02));
              let e = j.current,
                t = w.current,
                r = e.distanceTo(t);
              ((R.current = f.cj9.lerp(R.current, r, 0.1)),
                (D.current.uSpeed = R.current),
                w.current.copy(e));
            }
            (n.setRenderTarget(d),
              n.render(e, a.camera),
              n.setRenderTarget(null),
              E.current &&
                ((E.current.uSimulationState = d.texture),
                (E.current.uFontTexture = F),
                (E.current.uResolution = new f.I9Y(C.width, C.height)),
                (E.current.uColor = new f.Q1f(o)),
                (E.current.uBackgroundColor = new f.Q1f(i)),
                (E.current.uCharCount = t.length),
                (E.current.uGridSize = r),
                (E.current.uEnableFade = l),
                (E.current.uOpacity = h)),
              M.current++);
          }),
          (0, a.jsxs)(a.Fragment, {
            children: [
              (0, u.o)(
                (0, a.jsxs)("mesh", {
                  children: [
                    (0, a.jsx)("planeGeometry", { args: [y.width, y.height] }),
                    (0, a.jsx)("asciiSimulationMaterial", { ref: D }),
                  ],
                }),
                e,
              ),
              (0, a.jsxs)("mesh", {
                children: [
                  (0, a.jsx)("planeGeometry", { args: [y.width, y.height] }),
                  (0, a.jsx)("asciiDisplayMaterial", {
                    ref: E,
                    transparent: !0,
                  }),
                ],
              }),
              (v || g) &&
                (0, a.jsxs)(m.s0, {
                  children: [
                    v
                      ? (0, a.jsx)(m.mK, {
                          luminanceThreshold: 0,
                          mipmapBlur: !0,
                          intensity: p,
                          radius: x,
                        })
                      : (0, a.jsx)(a.Fragment, {}),
                    g
                      ? (0, a.jsx)(m.E8, {
                          offset: new f.I9Y(b, b),
                          radialModulation: !1,
                          modulationOffset: 0,
                        })
                      : (0, a.jsx)(a.Fragment, {}),
                  ],
                }),
            ],
          })
        );
      },
      x = ({
        characters: e = "✶✤↣⌧✷＄☺☉ϟ▵\uD83D\uDF4F*.;.",
        size: t = 40,
        color: r = "#00ff00",
        backgroundColor: o = "#000000",
        enableFade: i = !1,
        spread: l = 20,
        persistence: u = 2,
        opacity: c = 1,
        enableBloom: d = !1,
        bloomStrength: m = 2,
        bloomRadius: h = 0.4,
        enableChromaticAberration: v = !1,
        chromaticAberrationOffset: x = 0.005,
        className: g,
      }) => {
        let b = (0, n.useMemo)(() => new f.Z58(), []);
        return (0, a.jsx)("div", {
          className: `ascii-cursor-container absolute inset-0 overflow-hidden pointer-events-none z-50 ${g || ""}`,
          children: (0, a.jsx)(s.Hl, {
            orthographic: !0,
            camera: { zoom: 1, position: [0, 0, 1], near: 0.1, far: 1e3 },
            gl: { alpha: !0, antialias: !1 },
            style: { width: "100%", height: "100%" },
            children: (0, a.jsx)(p, {
              simulationScene: b,
              characters: e,
              size: t,
              color: r,
              backgroundColor: o,
              enableFade: i,
              spread: l,
              persistence: u,
              opacity: c,
              enableBloom: d,
              bloomStrength: m,
              bloomRadius: h,
              enableChromaticAberration: v,
              chromaticAberrationOffset: x,
            }),
          }),
        });
      },
      g = () => {
        let [e, t] = (0, l.I)(),
          { resolvedTheme: r } = (0, o.D)(),
          [u, s] = (0, n.useState)(40),
          [c, d] = (0, n.useState)("#00ff00"),
          [m, f] = (0, n.useState)(null),
          h = (0, n.useMemo)(
            () => (null !== m ? m : "dark" === r ? "#ffffff" : "#000000"),
            [r, m],
          ),
          [v, p] = (0, n.useState)("✶✷$☺✦☉∗ϟ▵.;."),
          [g, b] = (0, n.useState)(!1),
          [C, y] = (0, n.useState)(20),
          [S, j] = (0, n.useState)(2),
          [w, R] = (0, n.useState)(1),
          [F, k] = (0, n.useState)(!1),
          [U, D] = (0, n.useState)(2),
          [E, M] = (0, n.useState)(0.4),
          [T, B] = (0, n.useState)(!1),
          [O, I] = (0, n.useState)(0.005);
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(i.Bg, {}),
            (0, a.jsxs)(i.VX, {
              children: [
                (0, a.jsxs)(i.Ec, {
                  children: [
                    (0, a.jsxs)(i.Ch, {
                      onRefresh: t,
                      children: [
                        (0, a.jsx)("div", {
                          className:
                            "absolute inset-0 flex items-center justify-center text-4xl font-medium tracking-tighter text-gray-200 select-none pointer-events-none",
                          children: "MOVE CURSOR",
                        }),
                        (0, a.jsx)(
                          x,
                          {
                            size: u,
                            color: c,
                            backgroundColor: h,
                            characters: v,
                            enableFade: g,
                            spread: C,
                            persistence: S,
                            opacity: w,
                            enableBloom: F,
                            bloomStrength: U,
                            bloomRadius: E,
                            enableChromaticAberration: T,
                            chromaticAberrationOffset: O,
                          },
                          e,
                        ),
                      ],
                    }),
                    (0, a.jsxs)(i.IH, {
                      children: [
                        (0, a.jsx)(i.yt, {
                          title: "Grid Size",
                          value: u,
                          min: 10,
                          max: 100,
                          step: 1,
                          onChange: s,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Spread",
                          value: C,
                          min: 1,
                          max: 20,
                          step: 1,
                          onChange: y,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Persistence",
                          value: S,
                          min: 0.1,
                          max: 5,
                          step: 0.1,
                          onChange: j,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Opacity",
                          value: w,
                          min: 0,
                          max: 1,
                          step: 0.1,
                          onChange: R,
                        }),
                        (0, a.jsx)(i.tl, {
                          title: "Fade Out",
                          checked: g,
                          onChange: b,
                        }),
                        (0, a.jsx)(i.UD, {
                          title: "Characters",
                          value: v,
                          onChange: p,
                        }),
                        (0, a.jsx)(i.W7, {
                          title: "Color",
                          value: c,
                          onChange: d,
                        }),
                        (0, a.jsx)(i.W7, {
                          title: "Background Color",
                          value: h,
                          onChange: f,
                        }),
                        (0, a.jsx)(i.tl, {
                          title: "Bloom",
                          checked: F,
                          onChange: k,
                        }),
                        F &&
                          (0, a.jsxs)(a.Fragment, {
                            children: [
                              (0, a.jsx)(i.yt, {
                                title: "Bloom Strength",
                                value: U,
                                min: 0,
                                max: 10,
                                step: 0.1,
                                onChange: D,
                              }),
                              (0, a.jsx)(i.yt, {
                                title: "Bloom Radius",
                                value: E,
                                min: 0,
                                max: 1,
                                step: 0.01,
                                onChange: M,
                              }),
                            ],
                          }),
                        (0, a.jsx)(i.tl, {
                          title: "Chromatic Aberration",
                          checked: T,
                          onChange: B,
                        }),
                        T &&
                          (0, a.jsx)(i.yt, {
                            title: "Aberration Offset",
                            value: O,
                            min: 0,
                            max: 0.05,
                            step: 0.001,
                            onChange: I,
                          }),
                      ],
                    }),
                    (0, a.jsx)(i.Ub, {
                      data: [
                        {
                          name: "size",
                          type: "number",
                          default: "20",
                          description: "Size of the grid cells in pixels",
                        },
                        {
                          name: "color",
                          type: "string",
                          default: '"#00ff00"',
                          description: "Color of the characters",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"#000000"',
                          description: "Background color of the active cells",
                        },
                        {
                          name: "enableFade",
                          type: "boolean",
                          default: "true",
                          description:
                            "Whether to fade out the characters or keep them solid",
                        },
                        {
                          name: "spread",
                          type: "number",
                          default: "5",
                          description:
                            "Spread of the cursor trail (brush size)",
                        },
                        {
                          name: "persistence",
                          type: "number",
                          default: "1",
                          description: "Duration of the trail persistence",
                        },
                        {
                          name: "opacity",
                          type: "number",
                          default: "1",
                          description: "Overall opacity of the cursor effect",
                        },
                        {
                          name: "enableBloom",
                          type: "boolean",
                          default: "false",
                          description: "Enable bloom effect",
                        },
                        {
                          name: "bloomStrength",
                          type: "number",
                          default: "2",
                          description: "Strength of the bloom effect",
                        },
                        {
                          name: "bloomRadius",
                          type: "number",
                          default: "0.4",
                          description: "Radius of the bloom effect",
                        },
                        {
                          name: "enableChromaticAberration",
                          type: "boolean",
                          default: "false",
                          description: "Enable chromatic aberration effect",
                        },
                        {
                          name: "chromaticAberrationOffset",
                          type: "number",
                          default: "0.005",
                          description:
                            "Offset of the chromatic aberration effect",
                        },
                        {
                          name: "characters",
                          type: "string",
                          default: '" .:-+*=%@#"',
                          description:
                            "String of characters to use for the cursor trail",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the container",
                        },
                      ],
                    }),
                  ],
                }),
                (0, a.jsx)(i.lT, { children: (0, a.jsx)(i.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
