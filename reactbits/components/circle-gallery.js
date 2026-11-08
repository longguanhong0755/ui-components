/* ReactBits Pro public preview module 55426 for circle-gallery.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/55426.6f55e83b9f6b6a44.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  55426: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => m }));
    var n = r(95155),
      i = r(12115),
      a = r(56388),
      l = r(90761),
      s = r(90650),
      o = r(82637),
      u = r(70784),
      c = r(95102);
    o.Ay.registerPlugin(u.s, c.w6);
    let d = ({
        images: e = [],
        radiusPercent: t = 38,
        itemWidth: r = 280,
        itemHeight: a = 400,
        itemScale: l = 0.85,
        borderRadius: c = 8,
        enableDrag: d = !0,
        throwResistance: m = 0.35,
        animationDuration: h = 0.9,
        showNumbers: p = !0,
        autoSpin: f = 0,
        className: b,
        itemClassName: g,
        onItemClick: x,
      }) => {
        let w = (0, i.useRef)(null),
          y = (0, i.useRef)(null),
          v = (0, i.useRef)([]),
          C = (0, i.useRef)(null),
          S = (0, i.useRef)(null),
          k = (0, i.useRef)(!1),
          [j, A] = (0, i.useState)(!1),
          [E, P] = (0, i.useState)(null),
          I =
            e.length > 0
              ? e
              : [
                  "/demo-media/abstract-rose-balance.webp",
                  "/demo-media/abstract-pink-eclipse.webp",
                  "/demo-media/abstract-amber-loop.webp",
                  "/demo-media/abstract-coral-fold.webp",
                  "/demo-media/abstract-fuchsia-wave.webp",
                  "/demo-media/abstract-orchid-orbit.webp",
                  "/demo-media/abstract-plum-ribbon.webp",
                  "/demo-media/abstract-violet-steps.webp",
                ],
          M = I.length,
          N = (0, i.useCallback)(
            (e = !1) => {
              if (!y.current) return;
              let r =
                  (t / 100) * Math.min(window.innerWidth, window.innerHeight),
                n = (2 * Math.PI) / M,
                i = o.Ay.getProperty(y.current, "rotation") || 0,
                a = (Math.PI / 180) * i;
              v.current.forEach((t, l) => {
                if (!t) return;
                let s = l * n + a,
                  u = r * Math.cos(s),
                  c = r * Math.sin(s);
                e
                  ? o.Ay.to(t, {
                      x: u,
                      y: c,
                      rotation: -i,
                      duration: 0.4,
                      ease: "power2.out",
                    })
                  : o.Ay.set(t, { x: u, y: c, rotation: -i });
              });
            },
            [M, t],
          ),
          R = (0, i.useCallback)(() => {
            if (!y.current || !d || null !== E) return;
            C.current && C.current[0]?.kill();
            let e = function () {
              let e = this.rotation || 0;
              v.current.forEach((t) => {
                t && o.Ay.set(t, { rotation: -e });
              });
            };
            C.current = u.s.create(y.current, {
              type: "rotation",
              inertia: !0,
              throwResistance: m,
              onDrag: e,
              onThrowUpdate: e,
              onPress: () => {
                (S.current && (S.current.kill(), (S.current = null)),
                  (k.current = !1));
              },
              onDragStart: () => {
                k.current = !0;
              },
              onDragEnd: () => {
                setTimeout(() => {
                  k.current = !1;
                }, 50);
              },
              trigger: w.current,
            });
          }, [d, m, E]),
          T = (0, i.useCallback)(() => {
            if (!y.current) return;
            let e = v.current.filter((e) => null !== e),
              r = o.Ay.timeline({
                onComplete: () => {
                  (A(!0), R());
                },
              });
            for (let t = 0; t < M; t++) {
              let n = e[t],
                i = (M - 1 - t) * 0.1;
              r.to(
                n,
                { opacity: 1, scale: l, duration: 0.5, ease: "power2.out" },
                i,
              );
            }
            let n = (M - 1) * 0.1 + 0.5;
            r.to({}, { duration: 0.3 }, n);
            let i = (t / 100) * Math.min(window.innerWidth, window.innerHeight),
              a = (2 * Math.PI) / M,
              s = n + 0.3;
            for (let t = 0; t < M; t++) {
              let n = e[t],
                l = t * a,
                o = i * Math.cos(l),
                u = i * Math.sin(l);
              r.to(
                n,
                {
                  x: o,
                  y: u,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  duration: h,
                  ease: "power2.inOut",
                },
                s,
              );
            }
          }, [M, t, l, h, R]);
        return (
          (0, i.useEffect)(() => {
            let e = () => {
              j && N(!0);
            };
            return (
              window.addEventListener("resize", e),
              () => window.removeEventListener("resize", e)
            );
          }, [j, N]),
          (0, i.useEffect)(() => {
            j && N(!0);
          }, [t, j, N]),
          (0, i.useEffect)(() => {
            let e = v.current.filter((e) => null !== e);
            e.length > 0 &&
              o.Ay.set(e, {
                x: 0,
                y: 0,
                rotation: 0,
                scale: 0,
                opacity: 0,
                boxShadow: "0 0 0 rgba(0, 0, 0, 0)",
              });
          }, []),
          (0, i.useEffect)(() => {
            let e = setTimeout(() => {
              T();
            }, 50);
            return () => clearTimeout(e);
          }, []),
          (0, i.useEffect)(() => {
            null !== E && C.current
              ? (C.current[0]?.kill(), (C.current = null))
              : null === E && j && d && R();
          }, [E, j, d, R]),
          (0, i.useEffect)(() => {
            if (!j || !y.current || 0 === f || null !== E) {
              S.current && (S.current.kill(), (S.current = null));
              return;
            }
            let e = o.Ay.getProperty(y.current, "rotation") || 0;
            return (
              (S.current = o.Ay.to(y.current, {
                rotation: e + (f > 0 ? 360 : -360),
                duration: Math.abs(360 / f),
                ease: "none",
                repeat: -1,
                onUpdate: function () {
                  let e = o.Ay.getProperty(y.current, "rotation") || 0;
                  v.current.forEach((t) => {
                    t && o.Ay.set(t, { rotation: -e });
                  });
                },
              })),
              () => {
                S.current && (S.current.kill(), (S.current = null));
              }
            );
          }, [j, f, E]),
          (0, i.useEffect)(
            () => () => {
              (C.current && C.current[0]?.kill(),
                S.current && S.current.kill(),
                o.Ay.killTweensOf(y.current),
                o.Ay.killTweensOf(v.current));
            },
            [],
          ),
          (0, n.jsx)("div", {
            ref: w,
            className: (0, s.cn)(
              "relative w-full h-screen overflow-hidden flex items-center justify-center",
              d && !E && "cursor-grab active:cursor-grabbing",
              b,
            ),
            style: { perspective: "2200px" },
            onClick: (e) => {
              if (null !== E && e.target === w.current) {
                P(null);
                let e =
                    (t / 100) * Math.min(window.innerWidth, window.innerHeight),
                  r = (2 * Math.PI) / M,
                  n =
                    (Math.PI / 180) *
                    (o.Ay.getProperty(y.current, "rotation") || 0);
                v.current.forEach((t, i) => {
                  if (t) {
                    let a = i * r + n,
                      s = e * Math.cos(a),
                      u = e * Math.sin(a);
                    o.Ay.to(t, {
                      x: s,
                      y: u,
                      scale: l,
                      zIndex: 100 + i,
                      filter: "blur(0px)",
                      duration: 0.6,
                      ease: "power2.inOut",
                    });
                  }
                });
              }
            },
            children: (0, n.jsx)("div", {
              ref: y,
              className: (0, s.cn)(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              ),
              style: { transformOrigin: "center center" },
              children: I.map((e, i) =>
                (0, n.jsx)(
                  "div",
                  {
                    ref: (e) => {
                      v.current[i] = e;
                    },
                    className: (0, s.cn)(
                      "absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden cursor-pointer select-none transition-shadow duration-300",
                      E === i && "ring-4 ring-white/50",
                      g,
                    ),
                    style: {
                      width: `${r}px`,
                      height: `${a}px`,
                      borderRadius: `${c}px`,
                      transformOrigin: "center center",
                      background:
                        e.startsWith("linear-gradient") ||
                        e.startsWith("radial-gradient")
                          ? e
                          : `url(${e})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    },
                    onClick: () =>
                      ((e, r) => {
                        if (!k.current && (null === E || E === e)) {
                          if (E === e) {
                            P(null);
                            let e =
                                (t / 100) *
                                Math.min(window.innerWidth, window.innerHeight),
                              r = (2 * Math.PI) / M,
                              n =
                                (Math.PI / 180) *
                                (o.Ay.getProperty(y.current, "rotation") || 0);
                            v.current.forEach((t, i) => {
                              if (t) {
                                let a = i * r + n,
                                  s = e * Math.cos(a),
                                  u = e * Math.sin(a);
                                o.Ay.to(t, {
                                  x: s,
                                  y: u,
                                  scale: l,
                                  zIndex: 100 + i,
                                  filter: "blur(0px)",
                                  duration: 0.6,
                                  ease: "power2.inOut",
                                });
                              }
                            });
                          } else
                            (P(e),
                              v.current.forEach((t, r) => {
                                t &&
                                  (r === e
                                    ? o.Ay.to(t, {
                                        x: 0,
                                        y: 0,
                                        scale: 1.8 * l,
                                        zIndex: 1e3,
                                        filter: "blur(0px)",
                                        duration: 0.6,
                                        ease: "power2.out",
                                      })
                                    : o.Ay.to(t, {
                                        scale: 0.85 * l,
                                        filter: "blur(5px)",
                                        duration: 0.6,
                                        ease: "power2.inOut",
                                      }));
                              }));
                          x && x(e, r);
                        }
                      })(i, e),
                    children:
                      p &&
                      (0, n.jsx)("div", {
                        className:
                          "absolute top-2 left-2 text-white/80 text-sm font-bold z-10 drop-shadow-md",
                        children: String(i + 1).padStart(3, "0"),
                      }),
                  },
                  i,
                ),
              ),
            }),
          })
        );
      },
      m = () => {
        let [e, t] = (0, l.I)(),
          [r, s] = (0, i.useState)(15),
          [o, u] = (0, i.useState)(200),
          [c, m] = (0, i.useState)(250),
          [h, p] = (0, i.useState)(0.85),
          [f, b] = (0, i.useState)(16),
          [g, x] = (0, i.useState)(!0),
          [w, y] = (0, i.useState)(0.35),
          [v, C] = (0, i.useState)(0.9),
          [S, k] = (0, i.useState)(!0),
          [j, A] = (0, i.useState)(5);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(a.Bg, {}),
            (0, n.jsxs)(a.VX, {
              children: [
                (0, n.jsxs)(a.Ec, {
                  children: [
                    (0, n.jsx)(a.Ch, {
                      onRefresh: t,
                      minHeight: 700,
                      children: (0, n.jsx)(
                        d,
                        {
                          radiusPercent: r,
                          itemWidth: o,
                          itemHeight: c,
                          itemScale: h,
                          borderRadius: f,
                          enableDrag: g,
                          itemClassName: "shadow-lg!",
                          throwResistance: w,
                          animationDuration: v,
                          showNumbers: S,
                          autoSpin: j,
                          onItemClick: (e, t) => {
                            console.log(`Clicked item ${e}:`, t);
                          },
                        },
                        e,
                      ),
                    }),
                    (0, n.jsxs)(a.IH, {
                      children: [
                        (0, n.jsx)(a.yt, {
                          title: "Circle Radius %",
                          value: r,
                          onChange: (e) => {
                            (s(e), t());
                          },
                          min: 15,
                          max: 45,
                          step: 1,
                          valueUnit: "%",
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Item Width",
                          value: o,
                          onChange: (e) => {
                            (u(e), t());
                          },
                          min: 150,
                          max: 400,
                          step: 10,
                          valueUnit: "px",
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Item Height",
                          value: c,
                          onChange: (e) => {
                            (m(e), t());
                          },
                          min: 200,
                          max: 600,
                          step: 20,
                          valueUnit: "px",
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Item Scale",
                          value: h,
                          onChange: (e) => {
                            (p(e), t());
                          },
                          min: 0.5,
                          max: 1.2,
                          step: 0.05,
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Border Radius",
                          value: f,
                          onChange: (e) => {
                            (b(e), t());
                          },
                          min: 0,
                          max: 32,
                          step: 2,
                          valueUnit: "px",
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Throw Resistance",
                          value: w,
                          onChange: (e) => {
                            (y(e), t());
                          },
                          min: 0.1,
                          max: 0.9,
                          step: 0.05,
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Animation Duration",
                          value: v,
                          onChange: (e) => {
                            (C(e), t());
                          },
                          min: 0.3,
                          max: 2,
                          step: 0.1,
                          valueUnit: "s",
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Auto Spin (deg/s)",
                          value: j,
                          onChange: (e) => {
                            (A(e), t());
                          },
                          min: 0,
                          max: 180,
                          step: 5,
                          valueUnit: "\xb0/s",
                        }),
                        (0, n.jsx)(a.tl, {
                          title: "Enable Drag",
                          checked: g,
                          onChange: (e) => {
                            (x(e), t());
                          },
                        }),
                        (0, n.jsx)(a.tl, {
                          title: "Show Numbers",
                          checked: S,
                          onChange: (e) => {
                            (k(e), t());
                          },
                        }),
                      ],
                    }),
                    (0, n.jsx)(a.Ub, {
                      data: [
                        {
                          name: "images",
                          type: "string[]",
                          default: "[]",
                          description:
                            "Array of image URLs to display in the circular gallery",
                        },
                        {
                          name: "radiusPercent",
                          type: "number",
                          default: "38",
                          description:
                            "Radius of the circle as a percentage of viewport (10-50)",
                        },
                        {
                          name: "itemWidth",
                          type: "number",
                          default: "280",
                          description: "Width of each gallery item in pixels",
                        },
                        {
                          name: "itemHeight",
                          type: "number",
                          default: "400",
                          description: "Height of each gallery item in pixels",
                        },
                        {
                          name: "itemScale",
                          type: "number",
                          default: "0.85",
                          description: "Scale factor for items (0.5-1.5)",
                        },
                        {
                          name: "borderRadius",
                          type: "number",
                          default: "8",
                          description: "Border radius for items in pixels",
                        },
                        {
                          name: "enableDrag",
                          type: "boolean",
                          default: "true",
                          description: "Enable drag rotation of the gallery",
                        },
                        {
                          name: "throwResistance",
                          type: "number",
                          default: "0.35",
                          description:
                            "Throw resistance for inertia (0-1, lower = more momentum)",
                        },
                        {
                          name: "animationDuration",
                          type: "number",
                          default: "0.9",
                          description:
                            "Duration for initial animation in seconds",
                        },
                        {
                          name: "showNumbers",
                          type: "boolean",
                          default: "true",
                          description: "Show item numbers on cards",
                        },
                        {
                          name: "autoSpin",
                          type: "number",
                          default: "0",
                          description:
                            "Auto-spin speed in degrees per second (0 = disabled)",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the wrapper container",
                        },
                        {
                          name: "itemClassName",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for each gallery item",
                        },
                        {
                          name: "onItemClick",
                          type: "(index: number, image: string) => void",
                          default: "undefined",
                          description:
                            "Callback function when an item is clicked",
                        },
                      ],
                    }),
                  ],
                }),
                (0, n.jsx)(a.lT, { children: (0, n.jsx)(a.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
