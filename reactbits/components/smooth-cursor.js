/* ReactBits Pro public preview module 51029 for smooth-cursor.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/51029.7463b36134053a5c.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  51029: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => u }));
    var n = r(95155),
      l = r(56388),
      a = r(90761),
      i = r(12115),
      o = r(30701);
    let s = ({
      className: e = "",
      pointsCount: t = 40,
      lineWidth: r = 0.3,
      springStrength: l = 0.4,
      dampening: a = 0.5,
      color: o = "#000000",
      blur: s = 0,
      mixBlendMode: u = "source-over",
      velocityScale: c = !1,
      trailOpacity: d = 1,
      smoothFactor: m = 1,
    }) => {
      let h = Math.min(Math.max(a, 0.1), 0.99),
        v = (0, i.useRef)(null),
        f = (0, i.useRef)(null),
        x = (0, i.useRef)([]),
        p = (0, i.useRef)({ x: 0, y: 0 }),
        g = (0, i.useRef)(!0),
        y = (0, i.useRef)(1),
        b = (0, i.useRef)(null),
        C = (0, i.useRef)(null),
        w = (0, i.useCallback)(() => {
          b.current = requestAnimationFrame(() => {
            C.current?.();
          });
        }, []);
      (0, i.useEffect)(() => {
        let e = v.current;
        e && (e.style.filter = s > 0 ? `blur(${s}px)` : "none");
      }, [s]);
      let j = (0, i.useCallback)(() => {
          let e = v.current;
          e &&
            ((e.width = e.offsetWidth),
            (e.height = e.offsetHeight),
            (p.current = { x: 0.5 * e.offsetWidth, y: 0.5 * e.offsetHeight }),
            (x.current = Array.from({ length: t }, () => ({
              x: p.current.x,
              y: p.current.y,
              vx: 0,
              vy: 0,
            }))));
        }, [t]),
        k = (0, i.useCallback)((e, t) => {
          ((p.current.x = e), (p.current.y = t));
        }, []),
        S = (0, i.useCallback)(
          (e) => {
            let t = v.current;
            if (!t) return;
            let r = t.getBoundingClientRect();
            k(e.clientX - r.left, e.clientY - r.top);
          },
          [k],
        ),
        E = (0, i.useCallback)(
          (e) => {
            let t = v.current;
            if (!t || 0 === e.touches.length) return;
            let r = t.getBoundingClientRect();
            k(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top);
          },
          [k],
        ),
        L = (0, i.useCallback)(
          (e) => {
            let t = v.current;
            if (!t) return;
            let r = t.getBoundingClientRect();
            k(e.clientX - r.left, e.clientY - r.top);
          },
          [k],
        ),
        N = (0, i.useCallback)(() => {
          g.current = !0;
        }, []),
        B = (0, i.useCallback)(() => {
          g.current = !1;
        }, []);
      return (
        (0, i.useEffect)(() => {
          C.current = () => {
            let e = v.current,
              n = f.current;
            if (!e || !n) return;
            (n.clearRect(0, 0, e.width, e.height),
              x.current.forEach((e, t) => {
                let r = 0 === t ? p.current : x.current[t - 1],
                  n = 0 === t ? 0.4 * l : l;
                ((e.vx += (r.x - e.x) * n),
                  (e.vy += (r.y - e.y) * n),
                  (e.vx *= h),
                  (e.vy *= h),
                  (e.x += e.vx),
                  (e.y += e.vy));
              }));
            let a = +!!g.current;
            ((y.current += (a - y.current) * 0.15),
              (n.globalCompositeOperation = u),
              (n.globalAlpha = y.current * d),
              (n.strokeStyle = o),
              (n.lineCap = "round"),
              (n.lineJoin = "round"),
              n.beginPath(),
              n.moveTo(x.current[0].x, x.current[0].y));
            for (let e = 1; e < x.current.length - 1; e++) {
              let l = 1;
              if (c && e > 0) {
                let t = x.current[e];
                l = 1 + Math.min(0.5 * Math.sqrt(t.vx * t.vx + t.vy * t.vy), 2);
              }
              let a =
                  0.5 * (x.current[e].x + x.current[e + 1].x) * m +
                  x.current[e].x * (1 - m),
                i =
                  0.5 * (x.current[e].y + x.current[e + 1].y) * m +
                  x.current[e].y * (1 - m);
              (n.quadraticCurveTo(x.current[e].x, x.current[e].y, a, i),
                (n.lineWidth = r * (t - e) * l),
                n.stroke());
            }
            (n.lineTo(
              x.current[x.current.length - 1].x,
              x.current[x.current.length - 1].y,
            ),
              n.stroke(),
              (n.globalAlpha = 1),
              (n.globalCompositeOperation = "source-over"),
              w());
          };
        }, [t, r, l, h, o, s, u, c, d, m, w]),
        (0, i.useEffect)(() => {
          let e = v.current;
          if (!e) return;
          let t = e.getContext("2d");
          if (t)
            return (
              (f.current = t),
              j(),
              w(),
              window.addEventListener("mousemove", S),
              window.addEventListener("touchmove", E),
              window.addEventListener("click", L),
              window.addEventListener("resize", j),
              document.addEventListener("mouseenter", N),
              document.addEventListener("mouseleave", B),
              () => {
                (null !== b.current && cancelAnimationFrame(b.current),
                  window.removeEventListener("mousemove", S),
                  window.removeEventListener("touchmove", E),
                  window.removeEventListener("click", L),
                  window.removeEventListener("resize", j),
                  document.removeEventListener("mouseenter", N),
                  document.removeEventListener("mouseleave", B));
              }
            );
        }, [S, E, L, j, N, B, w]),
        (0, n.jsx)("div", {
          className: `fixed inset-0 w-full h-full pointer-events-none z-9999 ${e}`,
          children: (0, n.jsx)("canvas", {
            ref: v,
            className: "w-full h-full block",
          }),
        })
      );
    };
    s.displayName = "SmoothCursor";
    let u = () => {
      let [e, t] = (0, a.I)(),
        { resolvedTheme: r } = (0, o.D)(),
        [u, c] = (0, i.useState)(60),
        [d, m] = (0, i.useState)(1),
        [h, v] = (0, i.useState)(0.4),
        [f, x] = (0, i.useState)(0.5),
        [p, g] = (0, i.useState)(null),
        [y, b] = (0, i.useState)(9),
        [C, w] = (0, i.useState)("source-over"),
        [j, k] = (0, i.useState)(!1),
        [S, E] = (0, i.useState)(0.1),
        [L, N] = (0, i.useState)(2),
        B = (0, i.useMemo)(
          () => (null !== p ? p : "dark" === r ? "#ffffff" : "#000000"),
          [r, p],
        );
      return (0, n.jsxs)("div", {
        children: [
          (0, n.jsx)(l.Bg, {}),
          (0, n.jsxs)(l.VX, {
            children: [
              (0, n.jsxs)(l.Ec, {
                children: [
                  (0, n.jsx)(l.Ch, {
                    onRefresh: t,
                    children: (0, n.jsxs)("div", {
                      className:
                        "relative rounded-lg overflow-hidden flex items-center justify-center",
                      children: [
                        (0, n.jsxs)("div", {
                          className: "text-center z-10 pointer-events-none",
                          children: [
                            (0, n.jsx)("h3", {
                              className:
                                "text-2xl font-bold text-gray-800 dark:text-gray-200",
                              children: "Move your cursor",
                            }),
                            (0, n.jsx)("p", {
                              className:
                                "text-gray-600 dark:text-gray-400 text-xs",
                              children: "The smooth trail will follow",
                            }),
                          ],
                        }),
                        (0, n.jsx)(
                          s,
                          {
                            pointsCount: u,
                            lineWidth: d,
                            springStrength: h,
                            dampening: f,
                            color: B,
                            blur: y,
                            mixBlendMode: C,
                            velocityScale: j,
                            trailOpacity: S,
                            smoothFactor: L,
                          },
                          e,
                        ),
                      ],
                    }),
                  }),
                  (0, n.jsxs)(l.IH, {
                    children: [
                      (0, n.jsx)(l.yt, {
                        title: "Points Count",
                        value: u,
                        onChange: (e) => {
                          (c(e), t());
                        },
                        min: 10,
                        max: 80,
                        step: 1,
                      }),
                      (0, n.jsx)(l.yt, {
                        title: "Line Width",
                        value: d,
                        onChange: (e) => {
                          (m(e), t());
                        },
                        min: 0.1,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, n.jsx)(l.yt, {
                        title: "Smooth Factor",
                        value: L,
                        onChange: (e) => {
                          (N(e), t());
                        },
                        min: 0.1,
                        max: 2,
                        step: 0.1,
                      }),
                      (0, n.jsx)(l.tl, {
                        title: "Velocity Scale",
                        checked: j,
                        onChange: (e) => {
                          (k(e), t());
                        },
                      }),
                      (0, n.jsx)(l.yt, {
                        title: "Spring Strength",
                        value: h,
                        onChange: (e) => {
                          (v(e), t());
                        },
                        min: 0.1,
                        max: 0.5,
                        step: 0.05,
                      }),
                      (0, n.jsx)(l.yt, {
                        title: "Dampening",
                        value: f,
                        onChange: (e) => {
                          (x(e), t());
                        },
                        min: 0.1,
                        max: 0.7,
                        step: 0.05,
                      }),
                      (0, n.jsx)(l.W7, {
                        title: "Color",
                        value: B,
                        onChange: (e) => {
                          (g(e), t());
                        },
                      }),
                      (0, n.jsx)(l.yt, {
                        title: "Blur",
                        value: y,
                        onChange: (e) => {
                          (b(e), t());
                        },
                        min: 0,
                        max: 10,
                        step: 0.5,
                      }),
                      (0, n.jsx)(l.yt, {
                        title: "Trail Opacity",
                        value: S,
                        onChange: (e) => {
                          (E(e), t());
                        },
                        min: 0.1,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, n.jsx)(l.bg, {
                        title: "Mix Blend Mode",
                        value: C,
                        options: [
                          { label: "Normal", value: "source-over" },
                          { label: "Multiply", value: "multiply" },
                          { label: "Screen", value: "screen" },
                          { label: "Overlay", value: "overlay" },
                          { label: "Darken", value: "darken" },
                          { label: "Lighten", value: "lighten" },
                          { label: "Color Dodge", value: "color-dodge" },
                          { label: "Color Burn", value: "color-burn" },
                          { label: "Hard Light", value: "hard-light" },
                          { label: "Soft Light", value: "soft-light" },
                          { label: "Difference", value: "difference" },
                          { label: "Exclusion", value: "exclusion" },
                        ],
                        onChange: (e) => {
                          (w(e), t());
                        },
                      }),
                    ],
                  }),
                  (0, n.jsx)(l.Ub, {
                    data: [
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description:
                          "Additional CSS classes for the container.",
                      },
                      {
                        name: "pointsCount",
                        type: "number",
                        default: "40",
                        description:
                          "Number of trail points that follow the cursor.",
                      },
                      {
                        name: "lineWidth",
                        type: "number",
                        default: "0.3",
                        description:
                          "Width factor for the trail line. Higher values create thicker trails.",
                      },
                      {
                        name: "springStrength",
                        type: "number",
                        default: "0.4",
                        description:
                          "Spring force strength. Higher values make the trail follow faster.",
                      },
                      {
                        name: "dampening",
                        type: "number",
                        default: "0.5",
                        description:
                          "Dampening/friction factor. Lower values create more fluid motion.",
                      },
                      {
                        name: "color",
                        type: "string",
                        default: '"#000000"',
                        description:
                          "Color of the cursor trail (hex, rgb, or named color).",
                      },
                      {
                        name: "blur",
                        type: "number",
                        default: "0",
                        description:
                          "Blur amount in pixels. Creates a glowy, ethereal effect.",
                      },
                      {
                        name: "mixBlendMode",
                        type: "GlobalCompositeOperation",
                        default: '"source-over"',
                        description:
                          "Canvas blend mode for the trail. Options include 'multiply', 'screen', 'overlay', 'difference', etc.",
                      },
                      {
                        name: "velocityScale",
                        type: "boolean",
                        default: "false",
                        description:
                          "Makes the trail dynamically thicker when moving faster, creating a reactive effect.",
                      },
                      {
                        name: "trailOpacity",
                        type: "number",
                        default: "1",
                        description:
                          "Base opacity for the entire trail (0-1). Useful for subtle effects.",
                      },
                      {
                        name: "smoothFactor",
                        type: "number",
                        default: "1",
                        description:
                          "Controls curve smoothness. Higher values create smoother curves, lower values create more angular paths.",
                      },
                    ],
                  }),
                ],
              }),
              (0, n.jsx)(l.lT, { children: (0, n.jsx)(l.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
