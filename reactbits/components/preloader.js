/* ReactBits Pro public preview module 7412 for preloader.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/7412.8b4dc469f9782919.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  7412: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => u }));
    var n = a(95155),
      i = a(12115),
      r = a(56388),
      l = a(90761),
      o = a(39551),
      s = a(47962),
      d = a(90650);
    let c = ({
      loading: e,
      variant: t = "stairs",
      position: a = "absolute",
      duration: r = 2500,
      loadingText: l = "Loading your next level experience",
      onComplete: c,
      onLoadingStart: u,
      onLoadingComplete: p,
      className: m = "",
      zIndex: f = 50,
      bgColor: x,
      textClassName: g = "",
      children: b,
      respectReducedMotion: h = !1,
      reducedMotionFallback: v = "fade",
      ariaLabel: y = "Loading content",
      ariaLive: j = "polite",
      textFadeThreshold: C = 99,
      backdropBlur: w = 0,
      customContent: N,
      percentagePosition: k = "center",
      showPercentageSign: S = !0,
      percentageTextClassName: P = "",
      showProgressBar: F = !0,
      progressBarPosition: T = "bottom",
      stairCount: R = 10,
      stairsRevealFrom: L = "left",
      stairsRevealDirection: B = "up",
    }) => {
      let E,
        D,
        A,
        I,
        M,
        q,
        U,
        V,
        _,
        z,
        H,
        [W, $] = (0, i.useState)(100 * !e),
        [G, O] = (0, i.useState)(e),
        [X, Z] = (0, i.useState)(!e),
        J = (0, i.useRef)(null),
        K = (0, i.useRef)(!1),
        [Q, Y] = (0, i.useState)(!1),
        ee = (0, i.useRef)(!1);
      ((0, i.useEffect)(() => {
        if (!h) return;
        let e = window.matchMedia("(prefers-reduced-motion: reduce)"),
          t = (e) => {
            Y(e.matches);
          };
        return (
          t(e),
          e.addEventListener("change", t),
          () => e.removeEventListener("change", t)
        );
      }, [h]),
        (0, i.useEffect)(() => {
          let a, n;
          if (e) {
            let e = Date.now(),
              t = !0;
            ((K.current = !1), ee.current || ((ee.current = !0), u?.()));
            let a = () => {
              if (!t) return;
              let n = ((Date.now() - e) / r) * 100;
              (n > 90 && (n = 90 + 0.1 * (n - 90)),
                $((n = Math.min(n, 99))),
                n >= C && !K.current && ((K.current = !0), Z(!0)),
                (J.current = requestAnimationFrame(a)));
            };
            return (
              requestAnimationFrame(() => {
                t && (O(!0), Z(!1), $(0), a());
              }),
              () => {
                ((t = !1),
                  J.current &&
                    (cancelAnimationFrame(J.current), (J.current = null)));
              }
            );
          }
          if (G)
            return (
              (ee.current = !1),
              J.current &&
                (cancelAnimationFrame(J.current), (J.current = null)),
              (J.current = requestAnimationFrame(() => {
                ($(100), K.current || ((K.current = !0), Z(!0)));
              })),
              (a = setTimeout(
                () => {
                  (O(!1),
                    (n = setTimeout(() => {
                      c?.();
                    }, 800)));
                },
                300 + 2e3 * ("percentage" === t),
              )),
              () => {
                (J.current &&
                  (cancelAnimationFrame(J.current), (J.current = null)),
                  clearTimeout(a),
                  clearTimeout(n));
              }
            );
        }, [e, r, c, u, t, C, G]));
      let et = () => {
        let e = l.split(" ");
        return (0, n.jsx)("div", {
          className:
            "absolute inset-0 flex items-center justify-center pointer-events-none",
          style: { zIndex: f + 1 },
          children: (0, n.jsx)("div", {
            className: "flex flex-wrap justify-center gap-x-3 px-8",
            children: e.map((e, t) =>
              (0, n.jsx)(
                o.P.span,
                {
                  initial: { opacity: 0, filter: "blur(10px)" },
                  animate: X
                    ? { opacity: 0, filter: "blur(10px)" }
                    : { opacity: 1, filter: "blur(0px)" },
                  transition: {
                    duration: X ? 0.3 : 0.6,
                    delay: X ? 0 : 0.1 * t,
                    ease: [0.65, 0, 0.35, 1],
                  },
                  className: (0, d.cn)(
                    "text-4xl font-bold text-background dark:text-foreground",
                    g,
                  ),
                  children: e,
                },
                t,
              ),
            ),
          }),
        });
      };
      return (0, n.jsxs)("div", {
        className: (0, d.cn)("relative w-full h-full", m),
        children: [
          (0, n.jsx)(s.N, {
            onExitComplete: p,
            children:
              G &&
              (0, n.jsx)(
                "div",
                {
                  children: N
                    ? (0, n.jsx)("div", {
                        className: (0, d.cn)(
                          "inset-0",
                          "fixed" === a ? "fixed" : "absolute",
                        ),
                        style: { zIndex: f },
                        role: "status",
                        "aria-label": y,
                        "aria-live": j,
                        children: N(W),
                      })
                    : (0, n.jsxs)(n.Fragment, {
                        children: [
                          "stairs" === t &&
                            ((E = Array.from({ length: R })),
                            (D = "up" === B ? "-100%" : "100%"),
                            (A = !Q || "none" !== v),
                            (I = Q && "fade" === v),
                            (0, n.jsxs)("div", {
                              className: (0, d.cn)(
                                "inset-0 flex overflow-hidden",
                                "fixed" === a ? "fixed" : "absolute",
                              ),
                              style: { zIndex: f },
                              role: "status",
                              "aria-label": y,
                              "aria-live": j,
                              children: [
                                E.map((e, t) =>
                                  (0, n.jsx)(
                                    o.P.div,
                                    {
                                      initial: { y: "0%", opacity: 1 },
                                      animate: { y: "0%", opacity: 1 },
                                      exit: I
                                        ? { opacity: 0 }
                                        : A
                                          ? { y: D }
                                          : { opacity: 0 },
                                      transition: {
                                        duration: I ? 0.3 : A ? 0.5 : 0.3,
                                        delay:
                                          A && !I
                                            ? "left" === L
                                              ? 0.06 * t
                                              : "right" === L
                                                ? (R - 1 - t) * 0.06
                                                : 0.06 *
                                                  Math.abs(t - (R - 1) / 2)
                                            : 0,
                                        ease: [0.65, 0, 0.35, 1],
                                      },
                                      className: "flex-1",
                                      style: { backgroundColor: x || void 0 },
                                      children:
                                        !x &&
                                        (0, n.jsx)("div", {
                                          className:
                                            "w-full h-full bg-black dark:bg-[#5227FF]",
                                        }),
                                    },
                                    `stair-${t}`,
                                  ),
                                ),
                                et(),
                              ],
                            })),
                          "percentage" === t &&
                            ((M = Math.floor(W)),
                            (0, n.jsxs)(o.P.div, {
                              initial: { opacity: 1 },
                              animate: { opacity: 1 },
                              exit: { opacity: 0 },
                              transition: {
                                duration: Q && "none" === v ? 0.2 : 0.4,
                                ease: "easeInOut",
                              },
                              className: (0, d.cn)(
                                "inset-0 flex flex-col",
                                "bottom-left" === k
                                  ? "justify-end items-start p-8"
                                  : "top-left" === k
                                    ? "justify-start items-start p-8"
                                    : "items-center justify-center",
                                "fixed" === a ? "fixed" : "absolute",
                                x ? "" : "bg-background",
                              ),
                              style: {
                                zIndex: f,
                                backgroundColor: x,
                                backdropFilter: w > 0 ? `blur(${w}px)` : void 0,
                              },
                              role: "progressbar",
                              "aria-label": y,
                              "aria-live": j,
                              "aria-valuenow": M,
                              "aria-valuemin": 0,
                              "aria-valuemax": 100,
                              children: [
                                (0, n.jsxs)("div", {
                                  className: (0, d.cn)(
                                    "text-[min(25vw,200px)] font-bold leading-none text-foreground tabular-nums tracking-tighter",
                                    P,
                                  ),
                                  children: [
                                    M,
                                    S &&
                                      (0, n.jsx)("span", {
                                        className:
                                          "text-[min(12vw,100px)] opacity-50",
                                        children: "%",
                                      }),
                                  ],
                                }),
                                F &&
                                  (0, n.jsx)("div", {
                                    className: (0, d.cn)(
                                      "absolute left-0 right-0 h-0.5 bg-border",
                                      "top" === T ? "top-0" : "bottom-0",
                                    ),
                                    children: (0, n.jsx)(o.P.div, {
                                      initial: { width: "0%" },
                                      animate: { width: `${W}%` },
                                      transition: {
                                        duration: 0.05,
                                        ease: "linear",
                                      },
                                      className: "h-full bg-foreground",
                                    }),
                                  }),
                              ],
                            })),
                          "circle" === t &&
                            ((q = !Q || "none" !== v),
                            (U = Q && "fade" === v),
                            (0, n.jsxs)("div", {
                              className: (0, d.cn)(
                                "inset-0 flex items-center justify-center overflow-hidden bg-transparent",
                                "fixed" === a ? "fixed" : "absolute",
                              ),
                              style: { zIndex: f },
                              role: "status",
                              "aria-label": y,
                              "aria-live": j,
                              children: [
                                (0, n.jsx)(o.P.div, {
                                  initial: { scale: 1, opacity: 1 },
                                  animate: { scale: 1, opacity: 1 },
                                  exit: U
                                    ? { opacity: 0 }
                                    : q
                                      ? { scale: 0 }
                                      : { opacity: 0 },
                                  transition: {
                                    duration: U ? 0.3 : q ? 0.7 : 0.3,
                                    ease: [0.65, 0, 0.35, 1],
                                  },
                                  className: (0, d.cn)(
                                    "rounded-full aspect-square",
                                    x ? "" : "bg-black dark:bg-[#5227FF]",
                                  ),
                                  style: {
                                    width: "300vmax",
                                    height: "300vmax",
                                    backgroundColor: x,
                                  },
                                }),
                                et(),
                              ],
                            })),
                          "slide" === t &&
                            ((V = !Q || "none" !== v),
                            (_ = Q && "fade" === v),
                            (0, n.jsxs)("div", {
                              className: (0, d.cn)(
                                "inset-0 flex overflow-hidden",
                                "fixed" === a ? "fixed" : "absolute",
                              ),
                              style: { zIndex: f },
                              role: "status",
                              "aria-label": y,
                              "aria-live": j,
                              children: [
                                (0, n.jsx)(o.P.div, {
                                  initial: { x: "0%" },
                                  exit: _
                                    ? { opacity: 0 }
                                    : V
                                      ? { x: "100%" }
                                      : { opacity: 0 },
                                  transition: {
                                    duration: _ ? 0.3 : V ? 0.8 : 0.3,
                                    ease: [0.65, 0, 0.35, 1],
                                  },
                                  className: "w-full h-full",
                                  style: { backgroundColor: x || void 0 },
                                  children:
                                    !x &&
                                    (0, n.jsx)("div", {
                                      className:
                                        "w-full h-full bg-black dark:bg-[#5227FF]",
                                    }),
                                }),
                                et(),
                              ],
                            })),
                          "curtain" === t &&
                            ((z = !Q || "none" !== v),
                            (H = Q && "fade" === v),
                            (0, n.jsxs)("div", {
                              className: (0, d.cn)(
                                "inset-0 flex overflow-hidden",
                                "fixed" === a ? "fixed" : "absolute",
                              ),
                              style: { zIndex: f },
                              role: "status",
                              "aria-label": y,
                              "aria-live": j,
                              children: [
                                (0, n.jsx)(o.P.div, {
                                  initial: { x: "0%" },
                                  exit: H
                                    ? { opacity: 0 }
                                    : z
                                      ? { x: "-100%" }
                                      : { opacity: 0 },
                                  transition: {
                                    duration: H ? 0.3 : z ? 0.8 : 0.3,
                                    ease: [0.65, 0, 0.35, 1],
                                  },
                                  className: "w-1/2 h-full",
                                  style: { backgroundColor: x || void 0 },
                                  children:
                                    !x &&
                                    (0, n.jsx)("div", {
                                      className:
                                        "w-full h-full bg-black dark:bg-[#5227FF]",
                                    }),
                                }),
                                (0, n.jsx)(o.P.div, {
                                  initial: { x: "0%" },
                                  exit: H
                                    ? { opacity: 0 }
                                    : z
                                      ? { x: "100%" }
                                      : { opacity: 0 },
                                  transition: {
                                    duration: H ? 0.3 : z ? 0.8 : 0.3,
                                    ease: [0.65, 0, 0.35, 1],
                                  },
                                  className: "w-1/2 h-full",
                                  style: { backgroundColor: x || void 0 },
                                  children:
                                    !x &&
                                    (0, n.jsx)("div", {
                                      className:
                                        "w-full h-full bg-black dark:bg-[#5227FF]",
                                    }),
                                }),
                                et(),
                              ],
                            })),
                        ],
                      }),
                },
                "preloader",
              ),
          }),
          (0, n.jsx)("div", {
            className: (0, d.cn)("w-full h-full", G && "invisible"),
            children: b,
          }),
        ],
      });
    };
    c.displayName = "Preloader";
    let u = () => {
      let [e, t] = (0, l.I)(),
        [a, o] = (0, i.useState)(!0),
        [s, d] = (0, i.useState)("stairs"),
        [u, p] = (0, i.useState)(1500),
        [m, f] = (0, i.useState)("#B19EEF"),
        [x, g] = (0, i.useState)(!1),
        [b, h] = (0, i.useState)("fade"),
        [v, y] = (0, i.useState)(99),
        [j, C] = (0, i.useState)(0),
        [w, N] = (0, i.useState)("center"),
        [k, S] = (0, i.useState)(!0),
        [P, F] = (0, i.useState)(!0),
        [T, R] = (0, i.useState)("bottom"),
        [L, B] = (0, i.useState)(10),
        [E, D] = (0, i.useState)("left"),
        [A, I] = (0, i.useState)("up");
      return (
        (0, i.useEffect)(() => {
          let e = setTimeout(() => {
              o(!0);
            }, 0),
            t = setTimeout(() => {
              o(!1);
            }, u + 1e3);
          return () => {
            (clearTimeout(e), clearTimeout(t));
          };
        }, [e, u]),
        (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(r.Bg, {}),
            (0, n.jsxs)(r.VX, {
              children: [
                (0, n.jsxs)(r.Ec, {
                  children: [
                    (0, n.jsx)(r.Ch, {
                      onRefresh: () => {
                        t();
                      },
                      children: (0, n.jsx)(
                        c,
                        {
                          loading: a,
                          variant: s,
                          position: "absolute",
                          duration: u,
                          loadingText: "loading your experience.",
                          bgColor: m || void 0,
                          percentagePosition: w,
                          showPercentageSign: k,
                          showProgressBar: P,
                          progressBarPosition: T,
                          stairCount: L,
                          stairsRevealFrom: E,
                          stairsRevealDirection: A,
                          onComplete: () => console.log("Loading complete!"),
                          onLoadingStart: () => console.log("Loading started!"),
                          onLoadingComplete: () =>
                            console.log("Exit animation complete!"),
                          respectReducedMotion: x,
                          reducedMotionFallback: b,
                          ariaLabel: "Demo content loading",
                          ariaLive: "polite",
                          textFadeThreshold: v,
                          backdropBlur: j,
                          children: (0, n.jsx)("div", {
                            className:
                              "w-full h-full flex flex-col items-center justify-center p-8 bg-card",
                            children: (0, n.jsxs)("div", {
                              className: "text-center",
                              children: [
                                (0, n.jsx)("h2", {
                                  className:
                                    "text-4xl font-medium mb-2 text-foreground",
                                  children: "Content Revealed!",
                                }),
                                (0, n.jsx)("p", {
                                  className: "text-muted-foreground text-xs",
                                  children:
                                    "This content was hidden behind the preloader",
                                }),
                              ],
                            }),
                          }),
                        },
                        e,
                      ),
                    }),
                    (0, n.jsxs)(r.IH, {
                      children: [
                        (0, n.jsx)(r.W7, {
                          title: "Background Color",
                          value: m,
                          onChange: f,
                        }),
                        (0, n.jsx)(r.bg, {
                          title: "Variant",
                          value: s,
                          onChange: (e) => {
                            (d(e), t());
                          },
                          options: [
                            { label: "Stairs", value: "stairs" },
                            { label: "Percentage", value: "percentage" },
                            { label: "Circle", value: "circle" },
                            { label: "Slide", value: "slide" },
                            { label: "Curtain", value: "curtain" },
                          ],
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Duration (ms)",
                          value: u,
                          onChange: (e) => {
                            (p(e), t());
                          },
                          min: 1e3,
                          max: 5e3,
                          step: 100,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Respect Reduced Motion",
                          checked: x,
                          onChange: (e) => {
                            (g(e), t());
                          },
                        }),
                        x &&
                          (0, n.jsx)(r.bg, {
                            title: "Reduced Motion Fallback",
                            value: b,
                            onChange: (e) => {
                              (h(e), t());
                            },
                            options: [
                              { label: "Fade", value: "fade" },
                              { label: "None (instant)", value: "none" },
                            ],
                          }),
                        (0, n.jsx)(r.yt, {
                          title: "Text Fade Threshold (%)",
                          value: v,
                          onChange: (e) => {
                            (y(e), t());
                          },
                          min: 0,
                          max: 100,
                          step: 1,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Backdrop Blur (px)",
                          value: j,
                          onChange: (e) => {
                            (C(e), t());
                          },
                          min: 0,
                          max: 20,
                          step: 1,
                        }),
                        "percentage" === s &&
                          (0, n.jsxs)(n.Fragment, {
                            children: [
                              (0, n.jsx)(r.bg, {
                                title: "Percentage Position",
                                value: w,
                                onChange: (e) => {
                                  (N(e), t());
                                },
                                options: [
                                  { label: "Center", value: "center" },
                                  {
                                    label: "Bottom Left",
                                    value: "bottom-left",
                                  },
                                  { label: "Top Left", value: "top-left" },
                                ],
                              }),
                              (0, n.jsx)(r.tl, {
                                title: "Show Percentage Sign",
                                checked: k,
                                onChange: (e) => {
                                  (S(e), t());
                                },
                              }),
                              (0, n.jsx)(r.tl, {
                                title: "Show Progress Bar",
                                checked: P,
                                onChange: (e) => {
                                  (F(e), t());
                                },
                              }),
                              (0, n.jsx)(r.bg, {
                                title: "Progress Bar Position",
                                value: T,
                                onChange: (e) => {
                                  (R(e), t());
                                },
                                options: [
                                  { label: "Bottom", value: "bottom" },
                                  { label: "Top", value: "top" },
                                ],
                              }),
                            ],
                          }),
                        "stairs" === s &&
                          (0, n.jsxs)(n.Fragment, {
                            children: [
                              (0, n.jsx)(r.yt, {
                                title: "Stair Count",
                                value: L,
                                onChange: (e) => {
                                  (B(e), t());
                                },
                                min: 1,
                                max: 20,
                                step: 1,
                              }),
                              (0, n.jsx)(r.bg, {
                                title: "Reveal From",
                                value: E,
                                onChange: (e) => {
                                  (D(e), t());
                                },
                                options: [
                                  { label: "Left", value: "left" },
                                  { label: "Right", value: "right" },
                                  { label: "Center", value: "center" },
                                ],
                              }),
                              (0, n.jsx)(r.bg, {
                                title: "Reveal Direction",
                                value: A,
                                onChange: (e) => {
                                  (I(e), t());
                                },
                                options: [
                                  { label: "Up", value: "up" },
                                  { label: "Down", value: "down" },
                                ],
                              }),
                            ],
                          }),
                      ],
                    }),
                    (0, n.jsx)(r.Ub, {
                      data: [
                        {
                          name: "loading",
                          type: "boolean",
                          default: "false",
                          description: "Whether the preloader is active",
                        },
                        {
                          name: "variant",
                          type: '"stairs" | "percentage" | "circle" | "slide" | "curtain"',
                          default: '"stairs"',
                          description:
                            "Visual variant of the preloader animation",
                        },
                        {
                          name: "position",
                          type: '"fixed" | "absolute"',
                          default: '"absolute"',
                          description:
                            "Position type of the preloader container",
                        },
                        {
                          name: "duration",
                          type: "number",
                          default: "2500",
                          description:
                            "Duration of the loading animation in milliseconds",
                        },
                        {
                          name: "loadingText",
                          type: "string",
                          default: '"Loading your next level experience"',
                          description:
                            "Loading text to display (for stairs and circle variants)",
                        },
                        {
                          name: "zIndex",
                          type: "number",
                          default: "50",
                          description: "Z-index for the preloader",
                        },
                        {
                          name: "bgColor",
                          type: "string",
                          default: "undefined",
                          description: "Background color (overrides default)",
                        },
                        {
                          name: "textClassName",
                          type: "string",
                          default: '""',
                          description: "CSS classes for the loading text",
                        },
                        {
                          name: "percentagePosition",
                          type: '"center" | "bottom-left" | "top-left"',
                          default: '"center"',
                          description:
                            "Position of percentage counter (percentage variant only)",
                        },
                        {
                          name: "showPercentageSign",
                          type: "boolean",
                          default: "true",
                          description:
                            "Show percentage sign (percentage variant only)",
                        },
                        {
                          name: "percentageTextClassName",
                          type: "string",
                          default: '""',
                          description:
                            "CSS classes for percentage text (percentage variant only)",
                        },
                        {
                          name: "showProgressBar",
                          type: "boolean",
                          default: "true",
                          description:
                            "Show progress bar (percentage variant only)",
                        },
                        {
                          name: "progressBarPosition",
                          type: '"top" | "bottom"',
                          default: '"bottom"',
                          description:
                            "Progress bar position (percentage variant only)",
                        },
                        {
                          name: "stairCount",
                          type: "number",
                          default: "10",
                          description: "Number of stairs (stairs variant only)",
                        },
                        {
                          name: "stairsRevealFrom",
                          type: '"left" | "right" | "center"',
                          default: '"left"',
                          description:
                            "Direction stairs reveal from (stairs variant only)",
                        },
                        {
                          name: "stairsRevealDirection",
                          type: '"up" | "down"',
                          default: '"up"',
                          description:
                            "Direction stairs move when revealing (stairs variant only)",
                        },
                        {
                          name: "onComplete",
                          type: "() => void",
                          default: "undefined",
                          description:
                            "Callback function when loading completes",
                        },
                        {
                          name: "onLoadingStart",
                          type: "() => void",
                          default: "undefined",
                          description: "Callback function when loading starts",
                        },
                        {
                          name: "onLoadingComplete",
                          type: "() => void",
                          default: "undefined",
                          description:
                            "Callback function when exit animation completes",
                        },
                        {
                          name: "respectReducedMotion",
                          type: "boolean",
                          default: "false",
                          description:
                            "Respect prefers-reduced-motion system setting",
                        },
                        {
                          name: "reducedMotionFallback",
                          type: '"fade" | "none"',
                          default: '"fade"',
                          description:
                            "Fallback behavior when reduced motion is preferred (fade or instant)",
                        },
                        {
                          name: "ariaLabel",
                          type: "string",
                          default: '"Loading content"',
                          description: "ARIA label for screen readers",
                        },
                        {
                          name: "ariaLive",
                          type: '"polite" | "assertive" | "off"',
                          default: '"polite"',
                          description: "ARIA live region politeness level",
                        },
                        {
                          name: "textFadeThreshold",
                          type: "number",
                          default: "99",
                          description:
                            "Progress threshold (0-100) when loading text starts fading out",
                        },
                        {
                          name: "backdropBlur",
                          type: "number",
                          default: "0",
                          description: "Backdrop blur amount in pixels",
                        },
                        {
                          name: "customContent",
                          type: "(progress: number) => ReactNode",
                          default: "undefined",
                          description:
                            "Custom content render function that receives current progress (0-100)",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description: "Additional CSS classes for styling",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "undefined",
                          description:
                            "Content to show after loading completes",
                        },
                      ],
                    }),
                  ],
                }),
                (0, n.jsx)(r.lT, { children: (0, n.jsx)(r.Gv, {}) }),
              ],
            }),
          ],
        })
      );
    };
  },
};
