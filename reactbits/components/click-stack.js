/* ReactBits Pro public preview module 51808 for click-stack.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/29427.5a1756ea9f5b921c.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  51808: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => p }));
    var r = a(95155),
      i = a(12115),
      n = a(30701),
      s = a(56388),
      l = a(90761),
      d = a(82637),
      o = a(90650);
    let c = ["01", "02", "03", "04", "05", "06"].map((e) =>
        (0, r.jsx)(
          "div",
          {
            style: {
              background: "#ffffff",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#000000",
              fontSize: 56,
              fontWeight: 700,
              fontFamily: "system-ui, sans-serif",
              userSelect: "none",
            },
            children: e,
          },
          e,
        ),
      ),
      u = ({
        items: e,
        cardWidth: t = 250,
        cardHeight: a = 300,
        spreadX: n = 20,
        spreadY: s = -20,
        duration: l = 0.35,
        ease: u = "power3.out",
        borderRadius: p = 24,
        shadowBlur: f = 30,
        shadowOpacity: h = 0.3,
        cardColor: m = "#ffffff",
        visibleCount: y = 5,
        depthScale: x = 0.08,
        depthOpacity: v = 0,
        className: b,
        cardClassName: g,
        opacity: C = 1,
      }) => {
        let S = e ?? c,
          w = S.length,
          j = Math.min(y, w),
          k = (0, i.useRef)([]),
          I = (0, i.useRef)(!1),
          N = (0, i.useRef)([]),
          O = (0, i.useRef)({
            spreadX: n,
            spreadY: s,
            depthScale: x,
            depthOpacity: v,
            vis: j,
            duration: l,
            ease: u,
          }),
          E = (0, i.useRef)(null);
        (0, i.useEffect)(() => {
          O.current = {
            spreadX: n,
            spreadY: s,
            depthScale: x,
            depthOpacity: v,
            vis: j,
            duration: l,
            ease: u,
          };
        });
        let A = (0, i.useCallback)((e) => {
          let t = O.current;
          k.current.forEach((a, r) => {
            let i = N.current[a];
            if (!i) return;
            if (r >= t.vis)
              return void d.Ay.set(i, {
                opacity: 0,
                visibility: "hidden",
                zIndex: -1,
              });
            let n = {
              x: r * t.spreadX,
              y: r * t.spreadY,
              scale: 1 - r * t.depthScale,
              opacity: Math.max(0, 1 - r * t.depthOpacity),
              visibility: "visible",
              zIndex: t.vis - r,
              rotation: 0,
            };
            e
              ? d.Ay.to(i, { ...n, duration: t.duration, ease: t.ease })
              : d.Ay.set(i, n);
          });
        }, []);
        ((0, i.useEffect)(() => {
          ((k.current = Array.from({ length: w }, (e, t) => t)),
            (I.current = !1),
            A(!1),
            E.current && (E.current.style.visibility = "visible"));
        }, [w, A]),
          (0, i.useEffect)(() => {
            k.current.length > 0 && A(!1);
          }, [n, s, x, v, j, A]),
          (0, i.useEffect)(() => {
            let e = N.current;
            return () => {
              e.forEach((e) => {
                e && d.Ay.killTweensOf(e);
              });
            };
          }, []));
        let R = (0, i.useCallback)(() => {
          if (I.current || w < 2) return;
          I.current = !0;
          let e = O.current,
            t = k.current[0],
            a = N.current[t];
          if (!a) {
            I.current = !1;
            return;
          }
          d.Ay.timeline({
            onComplete: () => {
              I.current = !1;
            },
          }).to(a, {
            scale: 1.04,
            opacity: 0,
            duration: 0.55 * e.duration,
            ease: "power2.in",
            onComplete: () => {
              let e = k.current.shift();
              k.current.push(e);
              let t = O.current;
              (d.Ay.set(N.current[e], {
                opacity: 0,
                visibility: "hidden",
                zIndex: -1,
              }),
                k.current.forEach((a, r) => {
                  if (a === e) return;
                  let i = N.current[a];
                  if (i) {
                    if (r >= t.vis)
                      return void d.Ay.set(i, {
                        opacity: 0,
                        visibility: "hidden",
                        zIndex: -1,
                      });
                    d.Ay.to(i, {
                      x: r * t.spreadX,
                      y: r * t.spreadY,
                      scale: 1 - r * t.depthScale,
                      opacity: Math.max(0, 1 - r * t.depthOpacity),
                      visibility: "visible",
                      zIndex: t.vis - r,
                      duration: 0.65 * t.duration,
                      ease: "power2.out",
                    });
                  }
                }));
              let a = k.current.indexOf(e),
                r = N.current[e];
              a < t.vis &&
                r &&
                (d.Ay.set(r, {
                  x: a * t.spreadX,
                  y: a * t.spreadY,
                  scale: 1 - a * t.depthScale,
                  opacity: 0,
                  visibility: "visible",
                  zIndex: t.vis - a,
                }),
                d.Ay.to(r, {
                  opacity: Math.max(0, 1 - a * t.depthOpacity),
                  duration: 0.5 * t.duration,
                  delay: 0.2 * t.duration,
                  ease: "power1.out",
                }));
            },
          });
        }, [w]);
        return (0, r.jsx)("div", {
          ref: E,
          onClick: R,
          className: (0, o.cn)(
            "relative flex h-full w-full items-center justify-center overflow-hidden cursor-pointer",
            b,
          ),
          style: { opacity: C, visibility: "hidden" },
          children: S.map((e, i) =>
            (0, r.jsx)(
              "div",
              {
                ref: (e) => {
                  N.current[i] = e;
                },
                className: (0, o.cn)("absolute overflow-hidden", g),
                style: {
                  width: t,
                  height: a,
                  borderRadius: p,
                  background: m,
                  boxShadow: `0 ${Math.round(0.15 * f)}px ${Math.round(0.5 * f)}px rgba(0,0,0,${(0.5 * h).toFixed(2)}), 0 ${Math.round(0.4 * f)}px ${f}px rgba(0,0,0,${h})`,
                  willChange: "transform, opacity",
                },
                children: e,
              },
              i,
            ),
          ),
        });
      };
    u.displayName = "ClickStack";
    let p = () => {
      let [e, t] = (0, l.I)(),
        { resolvedTheme: a } = (0, n.D)(),
        [d, o] = (0, i.useState)(250),
        [c, p] = (0, i.useState)(300),
        [f, h] = (0, i.useState)(20),
        [m, y] = (0, i.useState)(-20),
        [x, v] = (0, i.useState)(5),
        [b, g] = (0, i.useState)(24),
        [C, S] = (0, i.useState)(30),
        [w, j] = (0, i.useState)(0.3),
        [k, I] = (0, i.useState)(1),
        [N, O] = (0, i.useState)(null),
        E = (0, i.useMemo)(
          () => (null !== N ? N : "dark" === a ? "#1a1a1a" : "#ffffff"),
          [a, N],
        ),
        [A, R] = (0, i.useState)(0.35),
        [M, z] = (0, i.useState)(0.08),
        [P, X] = (0, i.useState)(0),
        H = (0, i.useMemo)(() => {
          let e =
            E && 128 > parseInt(E.replace("#", "").slice(0, 2), 16)
              ? "#ffffff"
              : "#000000";
          return ["01", "02", "03", "04", "05", "06"].map((t) =>
            (0, r.jsx)(
              "div",
              {
                style: {
                  background: E,
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: e,
                  fontSize: 56,
                  fontWeight: 700,
                  fontFamily: "system-ui, sans-serif",
                  userSelect: "none",
                },
                children: t,
              },
              t,
            ),
          );
        }, [E]);
      return (0, r.jsxs)("div", {
        children: [
          (0, r.jsx)(s.Bg, {}),
          (0, r.jsxs)(s.VX, {
            children: [
              (0, r.jsxs)(s.Ec, {
                children: [
                  (0, r.jsx)(s.Ch, {
                    onRefresh: t,
                    children: (0, r.jsx)("div", {
                      className: "relative h-full w-full",
                      children: (0, r.jsx)(
                        u,
                        {
                          items: H,
                          cardWidth: d,
                          cardHeight: c,
                          spreadX: f,
                          spreadY: m,
                          duration: A,
                          borderRadius: b,
                          shadowBlur: C,
                          shadowOpacity: w,
                          cardColor: E,
                          visibleCount: x,
                          depthScale: M,
                          depthOpacity: P,
                          opacity: k,
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, r.jsxs)(s.IH, {
                    children: [
                      (0, r.jsx)(s.yt, {
                        title: "Card Width",
                        value: d,
                        onChange: o,
                        min: 100,
                        max: 500,
                        step: 10,
                      }),
                      (0, r.jsx)(s.yt, {
                        title: "Card Height",
                        value: c,
                        onChange: p,
                        min: 100,
                        max: 500,
                        step: 10,
                      }),
                      (0, r.jsx)(s.yt, {
                        title: "Spread X",
                        value: f,
                        onChange: h,
                        min: -50,
                        max: 50,
                        step: 1,
                      }),
                      (0, r.jsx)(s.yt, {
                        title: "Spread Y",
                        value: m,
                        onChange: y,
                        min: -50,
                        max: 50,
                        step: 1,
                      }),
                      (0, r.jsx)(s.yt, {
                        title: "Visible Count",
                        value: x,
                        onChange: v,
                        min: 1,
                        max: 10,
                        step: 1,
                      }),
                      (0, r.jsx)(s.yt, {
                        title: "Border Radius",
                        value: b,
                        onChange: g,
                        min: 0,
                        max: 50,
                        step: 1,
                      }),
                      (0, r.jsx)(s.yt, {
                        title: "Shadow Blur",
                        value: C,
                        onChange: S,
                        min: 0,
                        max: 100,
                        step: 1,
                      }),
                      (0, r.jsx)(s.yt, {
                        title: "Shadow Opacity",
                        value: w,
                        onChange: j,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, r.jsx)(s.yt, {
                        title: "Opacity",
                        value: k,
                        onChange: I,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, r.jsx)(s.W7, {
                        title: "Card Color",
                        value: E,
                        onChange: (e) => O(e),
                      }),
                      (0, r.jsx)(s.yt, {
                        title: "Duration",
                        value: A,
                        onChange: R,
                        min: 0.1,
                        max: 2,
                        step: 0.05,
                      }),
                      (0, r.jsx)(s.yt, {
                        title: "Depth Scale",
                        value: M,
                        onChange: z,
                        min: 0,
                        max: 0.3,
                        step: 0.01,
                      }),
                      (0, r.jsx)(s.yt, {
                        title: "Depth Opacity",
                        value: P,
                        onChange: X,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                    ],
                  }),
                  (0, r.jsx)(s.Ub, {
                    data: [
                      {
                        name: "items",
                        type: "ReactNode[]",
                        default: "built-in cards",
                        description:
                          "Renderable content for each card: images, text, JSX, or any React node",
                      },
                      {
                        name: "cardWidth",
                        type: "number",
                        default: "250",
                        description: "Width of each card in pixels",
                      },
                      {
                        name: "cardHeight",
                        type: "number",
                        default: "300",
                        description: "Height of each card in pixels",
                      },
                      {
                        name: "spreadX",
                        type: "number",
                        default: "20",
                        description:
                          "Horizontal offset between stacked depth levels",
                      },
                      {
                        name: "spreadY",
                        type: "number",
                        default: "-20",
                        description:
                          "Vertical offset between stacked depth levels",
                      },
                      {
                        name: "duration",
                        type: "number",
                        default: "0.35",
                        description: "Transition duration in seconds (0.1–2.0)",
                      },
                      {
                        name: "ease",
                        type: "string",
                        default: '"power3.out"',
                        description:
                          "GSAP easing string for card repositioning",
                      },
                      {
                        name: "borderRadius",
                        type: "number",
                        default: "24",
                        description: "Card corner radius in pixels (0–50)",
                      },
                      {
                        name: "shadowBlur",
                        type: "number",
                        default: "30",
                        description: "Card shadow blur radius (0–100)",
                      },
                      {
                        name: "shadowOpacity",
                        type: "number",
                        default: "0.3",
                        description: "Card shadow opacity (0–1)",
                      },
                      {
                        name: "cardColor",
                        type: "string",
                        default: '"#ffffff"',
                        description:
                          "Fallback background color for card surfaces",
                      },
                      {
                        name: "visibleCount",
                        type: "number",
                        default: "5",
                        description:
                          "Maximum number of cards shown in the stack (1–10)",
                      },
                      {
                        name: "depthScale",
                        type: "number",
                        default: "0.08",
                        description: "Scale reduction per depth level (0–0.3)",
                      },
                      {
                        name: "depthOpacity",
                        type: "number",
                        default: "0",
                        description: "Opacity reduction per depth level (0–1)",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description: "CSS class for the outer container",
                      },
                      {
                        name: "cardClassName",
                        type: "string",
                        default: '""',
                        description: "CSS class applied to each card wrapper",
                      },
                      {
                        name: "opacity",
                        type: "number",
                        default: "1",
                        description: "Overall container opacity (0–1)",
                      },
                    ],
                  }),
                ],
              }),
              (0, r.jsx)(s.lT, { children: (0, r.jsx)(s.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
