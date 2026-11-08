/* ReactBits Pro public preview module 28305 for comparison-slider.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/28305.831347368389bd4e.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  28305: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => b }));
    var r = a(95155),
      i = a(12115),
      o = a(56388),
      n = a(45949),
      l = a(90761),
      s = a(82637),
      c = a(70784),
      d = a(95102),
      p = a(55783),
      u = a(90650),
      m = a(18210);
    let f = (0, a(1604).A)("grip-horizontal", [
      ["circle", { cx: "12", cy: "9", r: "1", key: "124mty" }],
      ["circle", { cx: "19", cy: "9", r: "1", key: "1ruzo2" }],
      ["circle", { cx: "5", cy: "9", r: "1", key: "1a8b28" }],
      ["circle", { cx: "12", cy: "15", r: "1", key: "1e56xg" }],
      ["circle", { cx: "19", cy: "15", r: "1", key: "1a92ep" }],
      ["circle", { cx: "5", cy: "15", r: "1", key: "5r1jwy" }],
    ]);
    s.Ay.registerPlugin(c.s, d.w6);
    let h = ({
        beforeImage: e,
        afterImage: t,
        beforeAlt: a = "Before",
        afterAlt: o = "After",
        initialPosition: n = 50,
        orientation: l = "horizontal",
        enableInertia: d = !0,
        dragOnHover: h = !1,
        autoAnimate: b = !1,
        dividerWidth: g = 3,
        showHandle: x = !0,
        handleSize: y = 48,
        handleIcon: w,
        dividerColor: v = "white",
        handleColor: S = "white",
        showLabels: C = !1,
        labelText: k = { before: "Before", after: "After" },
        labelPosition: P = "top-left",
        labelClassName: j = "",
        beforeLabelClassName: A = "",
        afterLabelClassName: R = "",
        showPercentage: N = !1,
        percentagePosition: E = "top",
        onDragStart: L,
        onDragEnd: I,
        onPositionChange: T,
        ariaLabel: B = "Image comparison slider",
        reducedMotion: z = !1,
        className: $ = "",
        imageClassName: O = "",
      }) => {
        let W = (0, i.useRef)(null),
          D = (0, i.useRef)(null),
          H = (0, i.useRef)(null),
          M = (0, i.useRef)(null),
          U = (0, i.useRef)(null),
          [F, V] = (0, i.useState)(!1),
          [G, X] = (0, i.useState)(n),
          [_, K] = (0, i.useState)(!1),
          Y = (0, i.useRef)(null),
          q = window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          J = z || q,
          Q = "horizontal" === l,
          Z = () =>
            `absolute text-sm font-medium px-3 py-1.5 rounded backdrop-blur-sm bg-black/50 text-white pointer-events-none z-10 ${{ "top-left": "top-4 left-4", "top-right": "top-4 right-4", "bottom-left": "bottom-4 left-4", "bottom-right": "bottom-4 right-4" }[P]}`;
        ((0, p.L)(
          () => {
            if (!D.current || !W.current || !H.current || !M.current) return;
            let e = W.current,
              t = H.current,
              a = M.current,
              r = D.current,
              i = e.getBoundingClientRect(),
              o = Q ? (n / 100) * i.width : (n / 100) * i.height;
            (Q
              ? (s.Ay.set(r, { x: o, y: 0, immediateRender: !0 }),
                s.Ay.set(t, {
                  clipPath: `inset(0px ${i.width - o}px 0px 0px)`,
                  immediateRender: !0,
                }),
                s.Ay.set(a, {
                  clipPath: `inset(0px 0px 0px ${o}px)`,
                  immediateRender: !0,
                }))
              : (s.Ay.set(r, { x: 0, y: o, immediateRender: !0 }),
                s.Ay.set(t, {
                  clipPath: `inset(0px 0px ${i.height - o}px 0px)`,
                  immediateRender: !0,
                }),
                s.Ay.set(a, {
                  clipPath: `inset(${o}px 0px 0px 0px)`,
                  immediateRender: !0,
                })),
              K(!0));
            let l = (r) => {
                let i = e.getBoundingClientRect(),
                  o = Q
                    ? Math.max(0, Math.min(i.width, r))
                    : Math.max(0, Math.min(i.height, r)),
                  n = Q ? (o / i.width) * 100 : (o / i.height) * 100;
                (X(n),
                  Q
                    ? (s.Ay.set(t, {
                        clipPath: `inset(0px ${i.width - o}px 0px 0px)`,
                      }),
                      s.Ay.set(a, { clipPath: `inset(0px 0px 0px ${o}px)` }))
                    : (s.Ay.set(t, {
                        clipPath: `inset(0px 0px ${i.height - o}px 0px)`,
                      }),
                      s.Ay.set(a, { clipPath: `inset(${o}px 0px 0px 0px)` })),
                  T?.(n));
              },
              p = [],
              u = () => {
                let t = e.getBoundingClientRect(),
                  a =
                    (Q ? t.width / 2 : t.height / 2) +
                    (Math.random() - 0.5) * 100,
                  i = 1.5 + 1.5 * Math.random();
                Q
                  ? (Y.current = s.Ay.to(r, {
                      x: a,
                      duration: i,
                      ease: "power1.inOut",
                      overwrite: !0,
                      onUpdate: () => {
                        l(s.Ay.getProperty(r, "x"));
                      },
                      onComplete: u,
                    }))
                  : (Y.current = s.Ay.to(r, {
                      y: a,
                      duration: i,
                      ease: "power1.inOut",
                      overwrite: !0,
                      onUpdate: () => {
                        l(s.Ay.getProperty(r, "y"));
                      },
                      onComplete: u,
                    }));
              };
            if (
              (b &&
                (u(),
                p.push(() => {
                  (s.Ay.killTweensOf(r), (Y.current = null));
                })),
              h)
            ) {
              let t = (t) => {
                  b && Y.current && (Y.current.kill(), (Y.current = null));
                  let a = e.getBoundingClientRect(),
                    i = Q ? t.clientX - a.left : t.clientY - a.top;
                  (l(i), Q ? s.Ay.set(r, { x: i }) : s.Ay.set(r, { y: i }));
                },
                a = () => {
                  (V(!0),
                    L?.(),
                    b && Y.current && (Y.current.kill(), (Y.current = null)));
                },
                i = () => {
                  (V(!1), I?.(), b && u());
                };
              (e.addEventListener("mousemove", t),
                e.addEventListener("mouseenter", a),
                e.addEventListener("mouseleave", i),
                p.push(() => {
                  (e.removeEventListener("mousemove", t),
                    e.removeEventListener("mouseenter", a),
                    e.removeEventListener("mouseleave", i));
                }));
            }
            return (
              h ||
                ((U.current = c.s.create(r, {
                  type: Q ? "x" : "y",
                  bounds: e,
                  inertia: d && !J,
                  onDragStart: () => {
                    (b && Y.current && (Y.current.kill(), (Y.current = null)),
                      V(!0),
                      L?.());
                  },
                  onDrag: function () {
                    l(Q ? this.x : this.y);
                  },
                  onDragEnd: () => {
                    (V(!1), I?.(), b && u());
                  },
                  onThrowUpdate: function () {
                    l(Q ? this.x : this.y);
                  },
                })[0]),
                p.push(() => {
                  U.current && U.current.kill();
                })),
              () => {
                p.forEach((e) => e());
              }
            );
          },
          { scope: W, dependencies: [n, l, d, h, b, e, t] },
        ),
          (0, i.useEffect)(() => {
            if (!U.current) return;
            let e = () => {
              if (!W.current || !D.current || !H.current || !M.current) return;
              let e = U.current;
              if (!e) return;
              e.applyBounds(W.current);
              let t = W.current.getBoundingClientRect(),
                a = Q ? (G / 100) * t.width : (G / 100) * t.height;
              (Q
                ? s.Ay.set(D.current, { x: a })
                : s.Ay.set(D.current, { y: a }),
                Q
                  ? (s.Ay.set(H.current, {
                      clipPath: `inset(0px ${t.width - a}px 0px 0px)`,
                    }),
                    s.Ay.set(M.current, {
                      clipPath: `inset(0px 0px 0px ${a}px)`,
                    }))
                  : (s.Ay.set(H.current, {
                      clipPath: `inset(0px 0px ${t.height - a}px 0px)`,
                    }),
                    s.Ay.set(M.current, {
                      clipPath: `inset(${a}px 0px 0px 0px)`,
                    })));
            };
            return (
              window.addEventListener("resize", e),
              () => {
                window.removeEventListener("resize", e);
              }
            );
          }, [Q, G]));
        let ee = Q
          ? (0, r.jsx)(m.A, { className: "w-4 h-4" })
          : (0, r.jsx)(f, { className: "w-4 h-4" });
        return (0, r.jsx)("div", {
          className: (0, u.cn)(
            "relative w-full h-full rounded-lg shadow-lg overflow-hidden",
            !_ && "opacity-0",
            $,
          ),
          role: "region",
          "aria-label": B,
          children: (0, r.jsxs)("div", {
            ref: W,
            className: (0, u.cn)(
              "relative w-full h-full overflow-hidden select-none",
              h ? "cursor-default" : "",
            ),
            children: [
              (0, r.jsxs)("div", {
                ref: H,
                className:
                  "absolute inset-0 w-full h-full transform-gpu will-change-[clip-path]",
                children: [
                  (0, r.jsx)("img", {
                    src: e,
                    alt: a,
                    className: (0, u.cn)(
                      "w-full h-full object-cover pointer-events-none",
                      O,
                    ),
                    draggable: !1,
                  }),
                  C &&
                    (0, r.jsx)("div", {
                      className: (0, u.cn)(Z(), j, A),
                      children: k.before,
                    }),
                ],
              }),
              (0, r.jsxs)("div", {
                ref: M,
                className:
                  "absolute inset-0 w-full h-full transform-gpu will-change-[clip-path]",
                children: [
                  (0, r.jsx)("img", {
                    src: t,
                    alt: o,
                    className: (0, u.cn)(
                      "w-full h-full object-cover pointer-events-none",
                      O,
                    ),
                    draggable: !1,
                  }),
                  C &&
                    (0, r.jsx)("div", {
                      className: (0, u.cn)(Z(), j, R),
                      children: k.after,
                    }),
                ],
              }),
              (0, r.jsxs)("div", {
                ref: D,
                className: (0, u.cn)(
                  "absolute will-change-transform z-10",
                  h
                    ? "cursor-crosshair pointer-events-none"
                    : F
                      ? "cursor-grabbing"
                      : "cursor-grab",
                  Q ? "top-0 h-full" : "left-0 w-full",
                ),
                children: [
                  (0, r.jsx)("div", {
                    className: (0, u.cn)(
                      "absolute",
                      Q ? "top-0 h-full left-1/2" : "left-0 w-full top-1/2",
                    ),
                    style: {
                      [Q ? "width" : "height"]: `${g}px`,
                      background: `linear-gradient(to top, transparent 10%, ${v} 30%, ${v} 70%, transparent 90%)`,
                      transform: Q
                        ? `translateX(-${g / 2}px)`
                        : `translateY(-${g / 2}px)`,
                    },
                  }),
                  x &&
                    (0, r.jsx)("div", {
                      className: (0, u.cn)(
                        "absolute flex items-center justify-center rounded-full shadow-lg transition-transform",
                        F ? "scale-110" : "scale-100",
                        "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                      ),
                      style: {
                        width: `${y}px`,
                        height: `${y}px`,
                        backgroundColor: S,
                        boxShadow: `0 0 60px ${v}, 0 0 50px ${v}`,
                        color:
                          "#ffffff" === S || "white" === S || "#fff" === S
                            ? "#000"
                            : "#fff",
                      },
                      children: w || ee,
                    }),
                ],
              }),
              N &&
                "top" === E &&
                (0, r.jsxs)("div", {
                  className:
                    "absolute top-4 left-1/2 -translate-x-1/2 text-xs font-medium px-2 py-1 rounded-full bg-black/70 text-white backdrop-blur-sm pointer-events-none z-20",
                  children: [Math.round(G), "%"],
                }),
              N &&
                "bottom" === E &&
                (0, r.jsxs)("div", {
                  className:
                    "absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-medium px-2 py-1 rounded-full bg-black/70 text-white backdrop-blur-sm pointer-events-none z-20",
                  children: [Math.round(G), "%"],
                }),
            ],
          }),
        });
      },
      b = () => {
        let [e, t] = (0, l.I)(),
          [a, s] = (0, i.useState)(50),
          [c, d] = (0, i.useState)("horizontal"),
          [p, u] = (0, i.useState)(!0),
          [m, f] = (0, i.useState)(!1),
          [b, g] = (0, i.useState)(!0),
          [x, y] = (0, i.useState)(3),
          [w, v] = (0, i.useState)(!0),
          [S, C] = (0, i.useState)(36),
          [k, P] = (0, i.useState)("#ffffff"),
          [j, A] = (0, i.useState)("#ffffff"),
          [R, N] = (0, i.useState)(!0),
          [E, L] = (0, i.useState)("top-left"),
          [I, T] = (0, i.useState)(!1),
          [B, z] = (0, i.useState)("top");
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(o.Bg, {}),
            (0, r.jsxs)(o.VX, {
              children: [
                (0, r.jsxs)(o.Ec, {
                  children: [
                    (0, r.jsx)(o.Ch, {
                      onRefresh: t,
                      children: (0, r.jsx)("div", {
                        className: "w-full max-w-3xl h-[500px] p-6",
                        children: (0, r.jsx)(
                          h,
                          {
                            beforeImage: n.PT.spectrum.src,
                            afterImage: n.PT.spectrumShift.src,
                            beforeAlt: n.PT.spectrum.alt,
                            afterAlt: n.PT.spectrumShift.alt,
                            initialPosition: a,
                            orientation: c,
                            enableInertia: p,
                            dragOnHover: m,
                            autoAnimate: b,
                            dividerWidth: x,
                            showHandle: w,
                            handleSize: S,
                            dividerColor: k,
                            handleColor: j,
                            showLabels: R,
                            labelText: {
                              before: "Spectrum",
                              after: "Color shift",
                            },
                            labelPosition: E,
                            showPercentage: I,
                            labelClassName:
                              "rounded-full bg-black/65 text-white",
                            beforeLabelClassName:
                              "horizontal" === c
                                ? "left-4 right-auto"
                                : "top-4 bottom-auto",
                            afterLabelClassName:
                              "horizontal" === c
                                ? "right-4 left-auto"
                                : "bottom-4 top-auto",
                            imageClassName: "rounded-2xl",
                            className: "p-4 rounded-4xl border",
                            percentagePosition: B,
                            onDragStart: () => console.log("Drag started"),
                            onDragEnd: () => console.log("Drag ended"),
                            onPositionChange: (e) => {
                              console.log("Position:", e);
                            },
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(o.IH, {
                      children: [
                        (0, r.jsx)(o.bg, {
                          title: "Orientation",
                          value: c,
                          onChange: (e) => d(e),
                          options: [
                            { value: "horizontal", label: "Horizontal" },
                            { value: "vertical", label: "Vertical" },
                          ],
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Initial Position",
                          value: a,
                          onChange: s,
                          min: 0,
                          max: 100,
                          step: 1,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Enable Inertia",
                          checked: p,
                          onChange: u,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Drag on Hover",
                          checked: m,
                          onChange: f,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Auto Animate",
                          checked: b,
                          onChange: g,
                        }),
                        (0, r.jsx)(o.W7, {
                          title: "Divider Color",
                          value: k,
                          onChange: P,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Divider Width",
                          value: x,
                          onChange: y,
                          min: 1,
                          max: 10,
                          step: 1,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Show Handle",
                          checked: w,
                          onChange: v,
                        }),
                        (0, r.jsx)(o.W7, {
                          title: "Handle Color",
                          value: j,
                          onChange: A,
                        }),
                        (0, r.jsx)(o.yt, {
                          title: "Handle Size",
                          value: S,
                          onChange: C,
                          min: 24,
                          max: 80,
                          step: 4,
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Show Labels",
                          checked: R,
                          onChange: N,
                        }),
                        (0, r.jsx)(o.bg, {
                          title: "Label Position",
                          value: E,
                          onChange: (e) => L(e),
                          options: [
                            { value: "top-left", label: "Top Left" },
                            { value: "top-right", label: "Top Right" },
                            { value: "bottom-left", label: "Bottom Left" },
                            { value: "bottom-right", label: "Bottom Right" },
                          ],
                        }),
                        (0, r.jsx)(o.tl, {
                          title: "Show Percentage",
                          checked: I,
                          onChange: T,
                        }),
                        (0, r.jsx)(o.bg, {
                          title: "Percentage Position",
                          value: B,
                          onChange: (e) => z(e),
                          options: [
                            { value: "top", label: "Top" },
                            { value: "bottom", label: "Bottom" },
                          ],
                        }),
                      ],
                    }),
                    (0, r.jsx)(o.Ub, {
                      data: [
                        {
                          name: "beforeImage",
                          type: "string",
                          default: '""',
                          description:
                            "URL for the before image (left/top layer)",
                        },
                        {
                          name: "afterImage",
                          type: "string",
                          default: '""',
                          description:
                            "URL for the after image (right/bottom layer)",
                        },
                        {
                          name: "beforeAlt",
                          type: "string",
                          default: '"Before"',
                          description: "Alt text for the before image",
                        },
                        {
                          name: "afterAlt",
                          type: "string",
                          default: '"After"',
                          description: "Alt text for the after image",
                        },
                        {
                          name: "initialPosition",
                          type: "number",
                          default: "50",
                          description: "Initial position of the slider (0-100)",
                        },
                        {
                          name: "orientation",
                          type: '"horizontal" | "vertical"',
                          default: '"horizontal"',
                          description: "Orientation of the slider",
                        },
                        {
                          name: "enableInertia",
                          type: "boolean",
                          default: "true",
                          description:
                            "Enable inertia/momentum on drag release",
                        },
                        {
                          name: "dragOnHover",
                          type: "boolean",
                          default: "false",
                          description: "Enable drag on hover without clicking",
                        },
                        {
                          name: "autoAnimate",
                          type: "boolean",
                          default: "false",
                          description:
                            "Auto-animate slider with smooth random movement",
                        },
                        {
                          name: "dividerWidth",
                          type: "number",
                          default: "3",
                          description: "Width of the divider line in pixels",
                        },
                        {
                          name: "showHandle",
                          type: "boolean",
                          default: "true",
                          description: "Show the draggable handle with icon",
                        },
                        {
                          name: "handleSize",
                          type: "number",
                          default: "48",
                          description: "Size of the handle in pixels",
                        },
                        {
                          name: "handleIcon",
                          type: "React.ReactNode",
                          default: "undefined",
                          description: "Custom icon component for the handle",
                        },
                        {
                          name: "dividerColor",
                          type: "string",
                          default: '"white"',
                          description: "Color of the divider line",
                        },
                        {
                          name: "handleColor",
                          type: "string",
                          default: '"white"',
                          description: "Color of the handle background",
                        },
                        {
                          name: "onPositionChange",
                          type: "(position: number) => void",
                          default: "undefined",
                          description: "Callback when slider position changes",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the container",
                        },
                        {
                          name: "imageClassName",
                          type: "string",
                          default: '""',
                          description: "Additional CSS classes for both images",
                        },
                        {
                          name: "showLabels",
                          type: "boolean",
                          default: "false",
                          description: "Show before/after labels on images",
                        },
                        {
                          name: "labelText",
                          type: "{ before: string; after: string }",
                          default: '{ before: "Before", after: "After" }',
                          description: "Custom text for labels",
                        },
                        {
                          name: "labelPosition",
                          type: '"top-left" | "top-right" | "bottom-left" | "bottom-right"',
                          default: '"top-left"',
                          description: "Position of the labels",
                        },
                        {
                          name: "labelClassName",
                          type: "string",
                          default: '""',
                          description: "Additional CSS classes for both labels",
                        },
                        {
                          name: "beforeLabelClassName",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for before label",
                        },
                        {
                          name: "afterLabelClassName",
                          type: "string",
                          default: '""',
                          description: "Additional CSS classes for after label",
                        },
                        {
                          name: "showPercentage",
                          type: "boolean",
                          default: "false",
                          description: "Show percentage indicator",
                        },
                        {
                          name: "percentagePosition",
                          type: '"top" | "bottom"',
                          default: '"top"',
                          description: "Position of percentage indicator",
                        },
                        {
                          name: "onDragStart",
                          type: "() => void",
                          default: "undefined",
                          description: "Callback when drag starts",
                        },
                        {
                          name: "onDragEnd",
                          type: "() => void",
                          default: "undefined",
                          description: "Callback when drag ends",
                        },
                        {
                          name: "ariaLabel",
                          type: "string",
                          default: '"Image comparison slider"',
                          description: "Custom ARIA label for accessibility",
                        },
                        {
                          name: "reducedMotion",
                          type: "boolean",
                          default: "false",
                          description: "Respect prefers-reduced-motion setting",
                        },
                      ],
                    }),
                  ],
                }),
                (0, r.jsx)(o.lT, { children: (0, r.jsx)(o.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
