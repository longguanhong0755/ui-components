/* ReactBits Pro public preview module 2833 for custom-cursor.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/2833.cd824f3478d93ae3.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  2833: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => v }));
    var i = n(95155),
      r = n(12115),
      s = n(30701),
      a = n(56388),
      o = n(90761),
      l = n(75272),
      d = n(17192),
      c = n(30595),
      u = n(32923),
      m = n(39551),
      f = n(47962),
      h = n(90650);
    let g = ({
        circleSize: e = 40,
        dotSize: t = 6,
        circleColor: n = "rgb(0, 0, 0)",
        dotColor: s = "rgb(0, 0, 0)",
        circleStiffness: a = 150,
        circleDamping: o = 20,
        dotStiffness: g = 300,
        dotDamping: p = 30,
        circleBorderWidth: v = 2,
        className: x,
        circleClassName: b,
        dotClassName: w,
        showOnTouch: y = !1,
        zIndex: S = 9999,
        elastic: C = !1,
        targets: j = [],
        images: E = [],
        imageScale: N = 0.9,
        imageAnimationDuration: z = 0.6,
        imageClassName: L,
        targetPadding: M = 0,
        mixBlendMode: P,
        children: k,
      }) => {
        let [D, T] = (0, r.useState)(!1),
          [I, B] = (0, r.useState)(!1),
          [R, G] = (0, r.useState)(new Set()),
          [A, V] = (0, r.useState)(new Map()),
          [U, W] = (0, r.useState)(null),
          $ = (0, l.d)(window.innerWidth / 2),
          H = (0, l.d)(window.innerHeight / 2),
          O = (0, l.d)(e),
          q = (0, l.d)(e),
          F = (0, l.d)(e / 2),
          X = (0, l.d)(window.innerWidth / 2),
          _ = (0, l.d)(window.innerHeight / 2),
          Q = { stiffness: 350, damping: 30, mass: 0.5 },
          Y = (0, d.z)(O, Q),
          J = (0, d.z)(q, Q),
          Z = (0, d.z)(F, Q),
          K = (0, d.z)(X, Q),
          ee = (0, d.z)(_, Q),
          et = (0, d.z)($, { stiffness: a, damping: o, mass: 0.5 }),
          en = (0, d.z)(H, { stiffness: a, damping: o, mass: 0.5 }),
          ei = (0, d.z)($, { stiffness: g, damping: p, mass: 0.2 }),
          er = (0, d.z)(H, { stiffness: g, damping: p, mass: 0.2 }),
          es = (0, c.V)($),
          ea = (0, c.V)(H),
          eo = (0, u.G)(es, [-1e3, 0, 1e3], [0.85, 1, 1.15]),
          el = (0, u.G)(ea, [-1e3, 0, 1e3], [0.85, 1, 1.15]),
          ed = (0, r.useMemo)(() => {
            if (null === U) return null;
            let e = A.get(U),
              t = document.querySelector(j[U]);
            return e && t
              ? {
                  rect: e,
                  borderRadiusValue:
                    parseFloat(window.getComputedStyle(t).borderRadius) || 16,
                  element: t,
                }
              : null;
          }, [U, A, j]),
          ec = (0, r.useMemo)(() => {
            if (!ed) return !1;
            let { rect: e, borderRadiusValue: t } = ed;
            return 1 > Math.abs(e.width - e.height) && t >= e.width / 2 - 1;
          }, [ed]);
        (0, r.useEffect)(() => {
          if (null !== U && ed) {
            let { rect: e, borderRadiusValue: t } = ed,
              n = e.width + 2 * M,
              i = e.height + 2 * M;
            (O.set(n),
              q.set(i),
              ec ? F.set(n / 2) : F.set(t + M),
              X.set(e.left + e.width / 2),
              _.set(e.top + e.height / 2));
          } else if (null === U) {
            (O.set(e), q.set(e), F.set(e / 2));
            let t = et.on("change", (e) => X.set(e)),
              n = en.on("change", (e) => _.set(e));
            return () => {
              (t(), n());
            };
          }
        }, [U, ed, e, O, q, F, X, _, et, en, M, ec]);
        let eu = (0, r.useCallback)(() => {
          let e = new Map();
          (j.forEach((t, n) => {
            let i = document.querySelector(t);
            i && e.set(n, i.getBoundingClientRect());
          }),
            V(e));
        }, [j]);
        return ((0, r.useEffect)(() => {
          j &&
            j.length > 0 &&
            requestAnimationFrame(() => {
              eu();
            });
        }, [j, eu]),
        (0, r.useEffect)(() => {
          let e;
          if (!j || 0 === j.length) return;
          let t = [],
            n = () => {
              (t.forEach((e) => e()),
                (t.length = 0),
                j.forEach((e, n) => {
                  let i = document.querySelector(e);
                  if (i) {
                    let e = () => {
                        (G((e) => new Set(e).add(n)), eu(), W(n));
                      },
                      r = () => {
                        (G((e) => {
                          let t = new Set(e);
                          return (t.delete(n), t);
                        }),
                          W(null));
                      };
                    (i.addEventListener("mouseenter", e),
                      i.addEventListener("mouseleave", r),
                      t.push(() => {
                        (i.removeEventListener("mouseenter", e),
                          i.removeEventListener("mouseleave", r));
                      }));
                  }
                }));
            };
          n();
          let i = new MutationObserver(() => {
            (clearTimeout(e),
              (e = setTimeout(() => {
                (n(), eu());
              }, 200)));
          });
          return (
            i.observe(document.body, { childList: !0, subtree: !0 }),
            window.addEventListener("scroll", eu, !0),
            window.addEventListener("resize", eu),
            () => {
              (i.disconnect(),
                clearTimeout(e),
                t.forEach((e) => e()),
                window.removeEventListener("scroll", eu, !0),
                window.removeEventListener("resize", eu));
            }
          );
        }, [j, eu]),
        (0, r.useEffect)(() => {
          B(
            "ontouchstart" in window ||
              navigator.maxTouchPoints > 0 ||
              (void 0 !== navigator.msMaxTouchPoints &&
                navigator.msMaxTouchPoints > 0),
          );
          let e = (e) => {
              ($.set(e.clientX), H.set(e.clientY), D || T(!0));
            },
            t = () => {
              T(!0);
            },
            n = () => {
              T(!1);
            };
          return (
            (!I || y) &&
              (window.addEventListener("mousemove", e),
              document.addEventListener("mouseenter", t),
              document.addEventListener("mouseleave", n)),
            () => {
              (window.removeEventListener("mousemove", e),
                document.removeEventListener("mouseenter", t),
                document.removeEventListener("mouseleave", n));
            }
          );
        }, [$, H, D, I, y]),
        I && !y)
          ? null
          : (0, i.jsxs)("div", {
              className: (0, h.cn)("pointer-events-none fixed inset-0", x),
              style: { zIndex: S },
              children: [
                (0, i.jsx)(m.P.div, {
                  className: (0, h.cn)(
                    "absolute flex items-center justify-center",
                    b,
                  ),
                  style: {
                    width: Y,
                    height: J,
                    borderRadius: Z,
                    left: K,
                    top: ee,
                    x: "-50%",
                    y: "-50%",
                    border: `${v}px solid ${n}`,
                    opacity: +!!D,
                    scaleX: C && null === U ? eo : 1,
                    scaleY: C && null === U ? el : 1,
                    mixBlendMode: P,
                    willChange: "transform, width, height, border-radius",
                  },
                  children: k,
                }),
                (0, i.jsx)(m.P.div, {
                  className: (0, h.cn)("absolute rounded-full", w),
                  animate:
                    null !== U
                      ? { opacity: 0, scale: 0 }
                      : { opacity: +!!D, scale: 1 },
                  transition: { duration: 0.15 },
                  style: {
                    width: t,
                    height: t,
                    left: ei,
                    top: er,
                    x: "-50%",
                    y: "-50%",
                    backgroundColor: s,
                    mixBlendMode: P,
                    willChange: "transform, opacity",
                  },
                }),
                j.map((e, t) => {
                  let n = R.has(t),
                    r = E?.[t],
                    s = A.get(t);
                  if (!n || !s || !r) return null;
                  let a = document.querySelector(e),
                    o =
                      parseFloat(
                        a ? window.getComputedStyle(a).borderRadius : "0px",
                      ) || 0,
                    l =
                      1 > Math.abs(s.width - s.height) && o >= s.width / 2 - 1,
                    d = s.width + 2 * M,
                    c = l ? d / 2 : o + M,
                    u = l ? (s.width / 2) * N : o * N;
                  return (0, i.jsx)(
                    f.N,
                    {
                      children:
                        n &&
                        (0, i.jsx)(m.P.div, {
                          initial: { scale: 0, opacity: 0 },
                          animate: { scale: N, opacity: 1 },
                          exit: { scale: 0, opacity: 0 },
                          transition: { duration: z, ease: [0.16, 1, 0.3, 1] },
                          style: {
                            position: "fixed",
                            left: s.left + s.width / 2,
                            top: s.top + s.height / 2,
                            width: s.width,
                            height: s.height,
                            x: "-50%",
                            y: "-50%",
                            pointerEvents: "none",
                            willChange: "transform, opacity",
                            borderRadius: `${c}px`,
                          },
                          children: (0, i.jsx)("div", {
                            className: (0, h.cn)(
                              "w-full h-full bg-center bg-cover",
                              L,
                            ),
                            style: {
                              backgroundImage: `url(${r})`,
                              borderRadius: `${u}px`,
                            },
                          }),
                        }),
                    },
                    `${e}-${t}`,
                  );
                }),
              ],
            });
      },
      p = "/demo-media/abstract-rose-petal.webp",
      v = () => {
        let [e, t] = (0, o.I)(),
          { resolvedTheme: n } = (0, s.D)();
        (0, r.useEffect)(() => {
          new Image().src = p;
        }, []);
        let [l, d] = (0, r.useState)(40),
          [c, u] = (0, r.useState)(6),
          [m, f] = (0, r.useState)(150),
          [h, v] = (0, r.useState)(20),
          [x, b] = (0, r.useState)(300),
          [w, y] = (0, r.useState)(30),
          [S, C] = (0, r.useState)(2),
          [j, E] = (0, r.useState)(!1),
          [N, z] = (0, r.useState)(!1),
          [L, M] = (0, r.useState)(0),
          [P, k] = (0, r.useState)("normal"),
          [D, T] = (0, r.useState)(!1);
        return (0, i.jsxs)("div", {
          children: [
            (0, i.jsx)(a.Bg, {}),
            (0, i.jsxs)(a.VX, {
              children: [
                (0, i.jsxs)(a.Ec, {
                  children: [
                    (0, i.jsx)(a.Ch, {
                      minHeight: 600,
                      onRefresh: t,
                      children: (0, i.jsxs)("div", {
                        className:
                          "flex items-center justify-center gap-8 min-h-[400px] flex-wrap",
                        children: [
                          (0, i.jsx)("div", {
                            id: "demo-rectangle-with-image",
                            className:
                              "w-48 h-48 border-2 rounded-xl flex items-center justify-center text-sm text-muted-foreground",
                            children: "With Image",
                          }),
                          (0, i.jsx)("div", {
                            id: "demo-rectangle-no-image",
                            className:
                              "w-48 h-48 border-2 rounded-xl flex items-center justify-center text-sm text-muted-foreground",
                            children: "No Image",
                          }),
                          (0, i.jsx)("div", {
                            id: "demo-circle-no-image",
                            className:
                              "w-32 h-32 border-2 rounded-full flex items-center justify-center text-sm text-muted-foreground",
                            children: "Circle",
                          }),
                        ],
                      }),
                    }),
                    (0, i.jsxs)(a.IH, {
                      children: [
                        (0, i.jsx)(a.yt, {
                          title: "Circle Size",
                          value: l,
                          onChange: (e) => {
                            (d(e), t());
                          },
                          min: 20,
                          max: 100,
                          step: 5,
                          valueUnit: "px",
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Dot Size",
                          value: c,
                          onChange: (e) => {
                            (u(e), t());
                          },
                          min: 2,
                          max: 20,
                          step: 1,
                          valueUnit: "px",
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Circle Border Width",
                          value: S,
                          onChange: (e) => {
                            (C(e), t());
                          },
                          min: 1,
                          max: 8,
                          step: 1,
                          valueUnit: "px",
                        }),
                        (0, i.jsx)(a.bg, {
                          title: "Mix Blend Mode",
                          value: P,
                          options: [
                            { label: "Normal", value: "normal" },
                            { label: "Difference", value: "difference" },
                            { label: "Exclusion", value: "exclusion" },
                          ],
                          onChange: (e) => {
                            (k(e), t());
                          },
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Circle Stiffness",
                          value: m,
                          onChange: (e) => {
                            (f(e), t());
                          },
                          min: 50,
                          max: 500,
                          step: 10,
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Circle Damping",
                          value: h,
                          onChange: (e) => {
                            (v(e), t());
                          },
                          min: 5,
                          max: 50,
                          step: 1,
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Dot Stiffness",
                          value: x,
                          onChange: (e) => {
                            (b(e), t());
                          },
                          min: 50,
                          max: 500,
                          step: 10,
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Dot Damping",
                          value: w,
                          onChange: (e) => {
                            (y(e), t());
                          },
                          min: 5,
                          max: 50,
                          step: 1,
                        }),
                        (0, i.jsx)(a.yt, {
                          title: "Target Padding",
                          value: L,
                          onChange: (e) => {
                            (M(e), t());
                          },
                          min: 0,
                          max: 50,
                          step: 2,
                          valueUnit: "px",
                        }),
                        (0, i.jsx)(a.tl, {
                          title: "Elastic Stretch",
                          checked: N,
                          onChange: (e) => {
                            (z(e), t());
                          },
                        }),
                        (0, i.jsx)(a.tl, {
                          title: "Show on Touch Devices",
                          checked: j,
                          onChange: (e) => {
                            (E(e), t());
                          },
                        }),
                        (0, i.jsx)(a.tl, {
                          title: "Show Custom Content",
                          checked: D,
                          onChange: (e) => {
                            (T(e), t());
                          },
                        }),
                      ],
                    }),
                    (0, i.jsx)(a.Ub, {
                      data: [
                        {
                          name: "circleSize",
                          type: "number",
                          default: "40",
                          description: "Size of the outer circle in pixels",
                        },
                        {
                          name: "dotSize",
                          type: "number",
                          default: "6",
                          description: "Size of the inner dot in pixels",
                        },
                        {
                          name: "circleColor",
                          type: "string",
                          default: '"rgb(0, 0, 0)"',
                          description:
                            "Color of the outer circle (any valid CSS color)",
                        },
                        {
                          name: "dotColor",
                          type: "string",
                          default: '"rgb(0, 0, 0)"',
                          description:
                            "Color of the inner dot (any valid CSS color)",
                        },
                        {
                          name: "circleStiffness",
                          type: "number",
                          default: "150",
                          description:
                            "Spring stiffness for the outer circle (higher = faster)",
                        },
                        {
                          name: "circleDamping",
                          type: "number",
                          default: "20",
                          description:
                            "Spring damping for the outer circle (higher = less bounce)",
                        },
                        {
                          name: "dotStiffness",
                          type: "number",
                          default: "300",
                          description:
                            "Spring stiffness for the inner dot (higher = faster)",
                        },
                        {
                          name: "dotDamping",
                          type: "number",
                          default: "30",
                          description:
                            "Spring damping for the inner dot (higher = less bounce)",
                        },
                        {
                          name: "circleBorderWidth",
                          type: "number",
                          default: "2",
                          description:
                            "Border width of the outer circle in pixels",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional class name for the container",
                        },
                        {
                          name: "circleClassName",
                          type: "string",
                          default: '""',
                          description: "Additional class name for the circle",
                        },
                        {
                          name: "dotClassName",
                          type: "string",
                          default: '""',
                          description: "Additional class name for the dot",
                        },
                        {
                          name: "showOnTouch",
                          type: "boolean",
                          default: "false",
                          description:
                            "Whether to show the cursor on touch devices",
                        },
                        {
                          name: "zIndex",
                          type: "number",
                          default: "9999",
                          description: "Z-index of the cursor",
                        },
                        {
                          name: "elastic",
                          type: "boolean",
                          default: "false",
                          description:
                            "Enable subtle elastic stretch in direction of movement",
                        },
                        {
                          name: "imageClassName",
                          type: "string",
                          default: '""',
                          description:
                            "Additional class name for the image elements",
                        },
                        {
                          name: "targetPadding",
                          type: "number",
                          default: "0",
                          description:
                            "Padding between cursor and target in pixels",
                        },
                        {
                          name: "targets",
                          type: "string[]",
                          default: "[]",
                          description:
                            "CSS selectors for target elements to trigger effects on hover",
                        },
                        {
                          name: "images",
                          type: "(string | undefined)[]",
                          default: "[]",
                          description:
                            "Image URLs corresponding to each target (optional - targets without images will still morph the cursor)",
                        },
                        {
                          name: "imageScale",
                          type: "number",
                          default: "0.9",
                          description:
                            "Scale amount for images when hovering targets (0-1)",
                        },
                        {
                          name: "imageAnimationDuration",
                          type: "number",
                          default: "0.6",
                          description:
                            "Duration of image scale animation in seconds",
                        },
                        {
                          name: "mixBlendMode",
                          type: "string",
                          default: "undefined",
                          description: "Mix blend mode for the cursor elements",
                        },
                        {
                          name: "children",
                          type: "React.ReactNode",
                          default: "undefined",
                          description:
                            "Custom content to render inside the cursor",
                        },
                      ],
                    }),
                  ],
                }),
                (0, i.jsx)(a.lT, { children: (0, i.jsx)(a.Gv, {}) }),
              ],
            }),
            (0, i.jsx)(
              g,
              {
                circleSize: l,
                dotSize: c,
                circleStiffness: m,
                circleDamping: h,
                dotStiffness: x,
                dotDamping: w,
                circleBorderWidth: S,
                showOnTouch: j,
                elastic: N,
                mixBlendMode: "normal" === P ? void 0 : P,
                targets: [
                  "#demo-rectangle-with-image",
                  "#demo-rectangle-no-image",
                  "#demo-circle-no-image",
                ],
                images: [p, void 0, void 0],
                targetPadding: L,
                circleColor:
                  "dark" === n ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)",
                dotColor: "dark" === n ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)",
                children:
                  D &&
                  (0, i.jsx)("span", {
                    className:
                      "text-[10px] font-bold tracking-widest uppercase",
                    children: "View",
                  }),
              },
              e,
            ),
          ],
        });
      };
  },
};
