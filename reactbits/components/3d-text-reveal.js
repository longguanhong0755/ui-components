/* ReactBits Pro public preview module 77705 for 3d-text-reveal.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/77705.1da48c5ef87c8870.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  77705: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => m }));
    var n = r(95155),
      s = r(56388),
      i = r(90761),
      a = r(12115),
      l = r(82637),
      o = r(83585),
      c = r(55783),
      u = r(90650);
    l.os.registerPlugin(o.u);
    let d = ({
      items: e = ["Scroll", "To", "Reveal", "3D", "Text"],
      className: t = "",
      textClassName: r = "",
      scrollDistance: s = "300vh",
      perspective: i = 1e3,
      radiusOffset: d = 0.4,
      startRotation: m = -80,
      endRotation: p = 270,
      scrubSmoothing: h = 1,
      fontSize: f = "clamp(3rem, 9vw, 7rem)",
      fontWeight: x = 900,
      gap: g = 15,
    }) => {
      let v = (0, a.useRef)(null),
        b = (0, a.useRef)(null),
        w = (0, a.useRef)([]);
      return (
        (0, c.L)(
          () => {
            if (!v.current || !b.current) return;
            let e = () => {
              if (!b.current) return;
              let e = window.innerHeight * d;
              w.current.forEach((t, r) => {
                if (!t) return;
                let n = r * g,
                  s = (n * Math.PI) / 180,
                  i = Math.sin(s) * e,
                  a = Math.cos(s) * e;
                l.os.set(t, {
                  y: i,
                  z: a,
                  rotateX: -n,
                  xPercent: -50,
                  yPercent: -50,
                  transformOrigin: "50% 50%",
                });
              });
            };
            e();
            let t = () => e();
            o.u.addEventListener("refresh", t);
            let r = v.current.closest("[data-scroll-container]"),
              n = {
                trigger: v.current,
                start: "top top",
                end: `+=${s}`,
                pin: !0,
                scrub: h,
                anticipatePin: 1,
                invalidateOnRefresh: !0,
              };
            return (
              r && (n.scroller = r),
              l.os
                .timeline({ scrollTrigger: n })
                .fromTo(
                  b.current,
                  { rotateX: m },
                  { rotateX: p, ease: "none" },
                ),
              () => {
                o.u.removeEventListener("refresh", t);
              }
            );
          },
          { dependencies: [e, s, d, m, p, h, g], scope: v },
        ),
        (0, n.jsx)("div", {
          ref: v,
          className: (0, u.cn)(
            "relative w-full h-screen overflow-hidden flex flex-col items-center justify-center",
            t,
          ),
          style: {
            perspective: `${i}px`,
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
          },
          children: (0, n.jsx)("div", {
            ref: b,
            className: "absolute inset-0 text-center",
            style: { transformStyle: "preserve-3d" },
            children: e.map((e, t) =>
              (0, n.jsx)(
                "div",
                {
                  ref: (e) => {
                    w.current[t] = e;
                  },
                  className: (0, u.cn)(
                    "absolute top-1/2 left-1/2 whitespace-nowrap font-black uppercase",
                    r,
                  ),
                  style: {
                    fontSize: f,
                    fontWeight: x,
                    backfaceVisibility: "hidden",
                  },
                  children: e,
                },
                `${e}-${t}`,
              ),
            ),
          }),
        })
      );
    };
    d.displayName = "ThreeDTextReveal";
    let m = () => {
      let [e, t] = (0, i.I)(),
        r = (0, a.useRef)(null),
        [l, c] = (0, a.useState)(["Explore", "The", "Future", "Of", "Design"]),
        [u, m] = (0, a.useState)(4),
        [p, h] = (0, a.useState)(1e3),
        [f, x] = (0, a.useState)(0.4),
        [g, v] = (0, a.useState)(-80),
        [b, w] = (0, a.useState)(270),
        [y, j] = (0, a.useState)(1),
        [S, C] = (0, a.useState)(7),
        [k, T] = (0, a.useState)(900),
        [N, R] = (0, a.useState)(""),
        [E, P] = (0, a.useState)(15),
        D = 600 * u;
      return (
        (0, a.useEffect)(() => {
          let e = setTimeout(() => {
            o.u.refresh();
          }, 100);
          return () => clearTimeout(e);
        }, [e]),
        (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(s.Bg, {}),
            (0, n.jsxs)(s.VX, {
              children: [
                (0, n.jsxs)(s.Ec, {
                  children: [
                    (0, n.jsx)(s.Ch, {
                      minHeight: 600,
                      onRefresh: t,
                      children: (0, n.jsx)("div", {
                        ref: r,
                        className:
                          "w-full overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50",
                        "data-scroll-container": !0,
                        style: { height: "600px" },
                        children: (0, n.jsxs)("div", {
                          style: {
                            height: `${D + 600}px`,
                            position: "relative",
                          },
                          children: [
                            (0, n.jsxs)("div", {
                              className:
                                "absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-muted-foreground/75 animate-bounce",
                              style: { top: "260px" },
                              children: [
                                (0, n.jsx)("span", {
                                  className:
                                    "text-sm font-medium tracking-wide",
                                  children: "Scroll Down",
                                }),
                                (0, n.jsx)("svg", {
                                  xmlns: "http://www.w3.org/2000/svg",
                                  width: "20",
                                  height: "20",
                                  viewBox: "0 0 24 24",
                                  fill: "none",
                                  stroke: "currentColor",
                                  strokeWidth: "2",
                                  strokeLinecap: "round",
                                  strokeLinejoin: "round",
                                  children: (0, n.jsx)("path", {
                                    d: "M12 5v14M19 12l-7 7-7-7",
                                  }),
                                }),
                              ],
                            }),
                            (0, n.jsx)(
                              d,
                              {
                                items: l,
                                scrollDistance: `${D}px`,
                                perspective: p,
                                radiusOffset: f,
                                startRotation: g,
                                endRotation: b,
                                scrubSmoothing: y,
                                fontSize: `clamp(2rem, ${S}vw, ${S}rem)`,
                                fontWeight: k,
                                textClassName: N,
                                gap: E,
                              },
                              e,
                            ),
                          ],
                        }),
                      }),
                    }),
                    (0, n.jsxs)(s.IH, {
                      children: [
                        (0, n.jsx)(s.UD, {
                          title: "Text Items",
                          value: l.join(", "),
                          onChange: (e) => {
                            let r = e
                              .split(",")
                              .map((e) => e.trim())
                              .filter((e) => e.length > 0);
                            r.length > 0 && (c(r), t());
                          },
                          placeholder: "Enter comma-separated items",
                        }),
                        (0, n.jsx)(s.UD, {
                          title: "Text Class Name",
                          value: N,
                          onChange: (e) => {
                            (R(e), t());
                          },
                          placeholder: "e.g., text-blue-500 italic",
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Font Size",
                          value: S,
                          onChange: (e) => {
                            (C(e), t());
                          },
                          min: 3,
                          max: 12,
                          step: 0.5,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Font Weight",
                          value: k,
                          onChange: (e) => {
                            (T(e), t());
                          },
                          min: 100,
                          max: 900,
                          step: 100,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Perspective",
                          value: p,
                          onChange: (e) => {
                            (h(e), t());
                          },
                          min: 500,
                          max: 2e3,
                          step: 50,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Radius Offset",
                          value: f,
                          onChange: (e) => {
                            (x(e), t());
                          },
                          min: 0.05,
                          max: 0.8,
                          step: 0.01,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Gap (degrees)",
                          value: E,
                          onChange: (e) => {
                            (P(e), t());
                          },
                          min: 5,
                          max: 45,
                          step: 1,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Start Rotation",
                          value: g,
                          onChange: (e) => {
                            (v(e), t());
                          },
                          min: -180,
                          max: 0,
                          step: 10,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "End Rotation",
                          value: b,
                          onChange: (e) => {
                            (w(e), t());
                          },
                          min: 180,
                          max: 360,
                          step: 10,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Scroll Distance (multiplier)",
                          value: u,
                          onChange: (e) => {
                            (m(e), t());
                          },
                          min: 2,
                          max: 8,
                          step: 0.5,
                        }),
                        (0, n.jsx)(s.yt, {
                          title: "Scrub Smoothing",
                          value: y,
                          onChange: (e) => {
                            (j(e), t());
                          },
                          min: 0.5,
                          max: 6,
                          step: 0.1,
                        }),
                      ],
                    }),
                    (0, n.jsx)(s.Ub, {
                      data: [
                        {
                          name: "items",
                          type: "string[]",
                          default: '["Scroll", "To", "Reveal", "3D", "Text"]',
                          description:
                            "Array of text strings to display in the 3D cylinder. Each item will be positioned along the cylinder surface.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the wrapper container.",
                        },
                        {
                          name: "textClassName",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the text items. Use this to override text styling, colors, or add effects.",
                        },
                        {
                          name: "scrollDistance",
                          type: "string",
                          default: '"300vh"',
                          description:
                            "The scroll distance for the animation. Accepts viewport units (vh) or pixels (px). When using inside a scroll container, use pixel values.",
                        },
                        {
                          name: "perspective",
                          type: "number",
                          default: "1000",
                          description:
                            "CSS perspective value in pixels. Higher values create a more subtle 3D effect.",
                        },
                        {
                          name: "radiusOffset",
                          type: "number",
                          default: "0.4",
                          description:
                            "Multiplier for cylinder radius based on viewport size. Lower values create tighter text spacing. Range: 0.1 to 1.0.",
                        },
                        {
                          name: "startRotation",
                          type: "number",
                          default: "-80",
                          description:
                            "Initial rotation angle in degrees for the cylinder when scroll begins.",
                        },
                        {
                          name: "endRotation",
                          type: "number",
                          default: "270",
                          description:
                            "Final rotation angle in degrees for the cylinder when scroll completes.",
                        },
                        {
                          name: "scrubSmoothing",
                          type: "number",
                          default: "1",
                          description:
                            "GSAP scrub smoothing value. Higher values create smoother, more delayed scroll response.",
                        },
                        {
                          name: "fontSize",
                          type: "string",
                          default: '"clamp(3rem, 9vw, 7rem)"',
                          description:
                            "Font size for text items. Supports CSS units and clamp() for responsive sizing.",
                        },
                        {
                          name: "fontWeight",
                          type: "number",
                          default: "900",
                          description:
                            "Font weight for text items. Range: 100 to 900.",
                        },
                        {
                          name: "gap",
                          type: "number",
                          default: "15",
                          description: "Angle gap between items in degrees.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, n.jsx)(s.lT, { children: (0, n.jsx)(s.Gv, {}) }),
              ],
            }),
          ],
        })
      );
    };
  },
};
