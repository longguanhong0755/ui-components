/* ReactBits Pro public preview module 39734 for particle-text.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/39734.200a5c3e188aadc9.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  39734: (e, t, n) => {
    "use strict";
    (n.r(t), n.d(t, { default: () => c }));
    var r = n(95155),
      i = n(56388),
      a = n(90761),
      s = n(12115),
      l = n(30701);
    n(10064);
    let o = ({
      text: e = "brilliant.",
      className: t = "",
      colors: n = ["#40ffaa", "#40aaff", "#ff40aa", "#aa40ff"],
      particleSize: i = 2,
      particleGap: a = 2,
      mouseControls: l = { enabled: !0, radius: 150, strength: 5 },
      backgroundColor: o = "transparent",
      fontFamily: c = "sans-serif",
      fontSize: u = 200,
      fontWeight: d = "bold",
      friction: f = 0.75,
      ease: h = 0.05,
      autoFit: m = !0,
    }) => {
      let x = (0, s.useRef)(null),
        v = (0, s.useRef)(null),
        p = (0, s.useRef)([]),
        g = (0, s.useRef)({ x: -1e3, y: -1e3, isActive: !1 }),
        y = (0, s.useRef)(0),
        b = (0, s.useRef)(null),
        w = (0, s.useRef)(1),
        C = (0, s.useRef)(u),
        j = (0, s.useCallback)(
          (e, t, n, r) => {
            let i = w.current,
              a = 40 * i,
              s = n - 2 * a,
              l = r - 2 * a,
              o = 10 * i,
              f = u * i,
              h = o;
            for (; o <= f;) {
              let n = Math.floor((o + f) / 2);
              ((e.font = `${d} ${n}px ${c}`),
                e.measureText(t).width <= s && n <= l
                  ? ((h = n), (o = n + 1))
                  : (f = n - 1));
            }
            return h / i;
          },
          [u, d, c],
        );
      return (
        (0, s.useEffect)(() => {
          let t = x.current,
            r = v.current;
          if (!t || !r) return;
          let s = t.getContext("2d");
          if (!s) return;
          let S = () => {
            let l = window.devicePixelRatio || 1;
            ((w.current = l),
              (t.width = r.clientWidth * l),
              (t.height = r.clientHeight * l));
            let o = u;
            (m && (o = j(s, e, t.width, t.height)), (C.current = o));
            let f = o * l,
              h = document.createElement("canvas");
            ((h.width = t.width), (h.height = t.height));
            let x = h.getContext("2d");
            if (!x) return;
            ((x.font = `${d} ${f}px ${c}`),
              (x.textAlign = "center"),
              (x.textBaseline = "middle"),
              (x.fillStyle = "#ffffff"),
              x.fillText(e, t.width / 2, t.height / 2));
            let v = x.getImageData(0, 0, t.width, t.height).data,
              g = [],
              y = Math.max(1, Math.floor((i + a) * l));
            for (let e = 0; e < t.height; e += y)
              for (let r = 0; r < t.width; r += y)
                if (v[(e * t.width + r) * 4 + 3] > 128) {
                  let a = n[Math.floor(Math.random() * n.length)];
                  g.push({
                    x: Math.random() * t.width,
                    y: Math.random() * t.height,
                    originX: r,
                    originY: e,
                    vx: 0,
                    vy: 0,
                    color: a,
                    size: i * l,
                  });
                }
            p.current = g;
          };
          S();
          let E = () => {
            let e = w.current;
            (s.clearRect(0, 0, t.width, t.height),
              "transparent" !== o &&
                ((s.fillStyle = o), s.fillRect(0, 0, t.width, t.height)));
            let n = p.current,
              r = g.current,
              { radius: i = 150, strength: a = 5 } = l,
              c = i * e;
            for (let t = 0; t < n.length; t++) {
              let i = n[t],
                l = i.originX - i.x,
                o = i.originY - i.y,
                u = 0,
                d = 0;
              if (r.isActive) {
                let t = r.x * e - i.x,
                  n = r.y * e - i.y,
                  s = Math.sqrt(t * t + n * n);
                if (s < c) {
                  let e = (c - s) / c,
                    r = Math.atan2(n, t);
                  ((u = -Math.cos(r) * e * a * 5),
                    (d = -Math.sin(r) * e * a * 5));
                }
              }
              ((i.vx += l * h + u),
                (i.vy += o * h + d),
                (i.vx *= f),
                (i.vy *= f),
                (i.x += i.vx),
                (i.y += i.vy),
                (s.fillStyle = i.color),
                s.fillRect(Math.round(i.x), Math.round(i.y), i.size, i.size));
            }
            y.current = requestAnimationFrame(E);
          };
          (E(),
            (b.current = new ResizeObserver(() => {
              S();
            })),
            b.current.observe(r));
          let M = (e) => {
              let n = t.getBoundingClientRect();
              ((g.current.x = e.clientX - n.left),
                (g.current.y = e.clientY - n.top),
                (g.current.isActive = !0));
            },
            R = (e) => {
              e.preventDefault();
              let n = t.getBoundingClientRect();
              ((g.current.x = e.touches[0].clientX - n.left),
                (g.current.y = e.touches[0].clientY - n.top),
                (g.current.isActive = !0));
            },
            z = () => {
              g.current.isActive = !1;
            },
            k = () => {
              g.current.isActive = !1;
            };
          return (
            r.addEventListener("mousemove", M),
            r.addEventListener("mouseleave", z),
            r.addEventListener("touchmove", R, { passive: !1 }),
            r.addEventListener("touchend", k),
            () => {
              (y.current && cancelAnimationFrame(y.current),
                b.current && b.current.disconnect(),
                r.removeEventListener("mousemove", M),
                r.removeEventListener("mouseleave", z),
                r.removeEventListener("touchmove", R),
                r.removeEventListener("touchend", k));
            }
          );
        }, [e, n, i, a, l, o, c, u, d, f, h, m, j]),
        (0, r.jsx)("div", {
          ref: v,
          className: `particle-text-container ${t}`,
          children: (0, r.jsx)("canvas", {
            ref: x,
            className: "particle-text-canvas",
          }),
        })
      );
    };
    o.displayName = "ParticleText";
    let c = () => {
      let [e, t] = (0, a.I)(),
        { theme: n } = (0, l.D)(),
        [c, u] = (0, s.useState)("brilliant."),
        [d, f] = (0, s.useState)(200),
        [h, m] = (0, s.useState)(2),
        [x, v] = (0, s.useState)(2),
        [p, g] = (0, s.useState)(150),
        [y, b] = (0, s.useState)(5),
        [w, C] = (0, s.useState)(0.75),
        [j, S] = (0, s.useState)(0.05),
        [E, M] = (0, s.useState)(!0),
        R = (0, s.useMemo)(
          () =>
            "dark" === n
              ? ["#40ffaa", "#40aaff", "#ff40aa", "#aa40ff"]
              : ["#000000", "#333333", "#666666"],
          [n],
        );
      return (0, r.jsxs)("div", {
        children: [
          (0, r.jsx)(i.Bg, {}),
          (0, r.jsxs)(i.VX, {
            children: [
              (0, r.jsxs)(i.Ec, {
                children: [
                  (0, r.jsx)(i.Ch, {
                    onRefresh: t,
                    minHeight: 500,
                    children: (0, r.jsx)("div", {
                      className:
                        "w-full h-full flex items-center justify-center overflow-hidden",
                      children: (0, r.jsx)(
                        o,
                        {
                          text: c,
                          fontSize: d,
                          colors: R,
                          particleSize: h,
                          particleGap: x,
                          mouseControls: {
                            enabled: !0,
                            radius: p,
                            strength: y,
                          },
                          backgroundColor: "transparent",
                          friction: w,
                          ease: j,
                          autoFit: E,
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, r.jsxs)(i.IH, {
                    children: [
                      (0, r.jsx)(i.UD, {
                        title: "Text",
                        value: c,
                        onChange: (e) => {
                          (u(e), t());
                        },
                        placeholder: "Enter text",
                      }),
                      (0, r.jsx)(i.yt, {
                        title: "Font Size",
                        value: d,
                        onChange: (e) => {
                          (f(e), t());
                        },
                        min: 40,
                        max: 300,
                        step: 5,
                      }),
                      (0, r.jsx)(i.tl, {
                        title: "Auto Fit",
                        checked: E,
                        onChange: (e) => {
                          (M(e), t());
                        },
                      }),
                      (0, r.jsx)(i.yt, {
                        title: "Particle Size",
                        value: h,
                        onChange: (e) => {
                          (m(e), t());
                        },
                        min: 1,
                        max: 10,
                        step: 0.5,
                      }),
                      (0, r.jsx)(i.yt, {
                        title: "Particle Gap",
                        value: x,
                        onChange: (e) => {
                          (v(e), t());
                        },
                        min: 0,
                        max: 10,
                        step: 1,
                      }),
                      (0, r.jsx)(i.yt, {
                        title: "Friction",
                        value: w,
                        onChange: (e) => {
                          (C(e), t());
                        },
                        min: 0.5,
                        max: 0.99,
                        step: 0.01,
                      }),
                      (0, r.jsx)(i.yt, {
                        title: "Ease",
                        value: j,
                        onChange: (e) => {
                          (S(e), t());
                        },
                        min: 0.01,
                        max: 0.5,
                        step: 0.01,
                      }),
                      (0, r.jsx)(i.yt, {
                        title: "Mouse Radius",
                        value: p,
                        onChange: (e) => {
                          (g(e), t());
                        },
                        min: 50,
                        max: 300,
                        step: 10,
                      }),
                      (0, r.jsx)(i.yt, {
                        title: "Mouse Strength",
                        value: y,
                        onChange: (e) => {
                          (b(e), t());
                        },
                        min: 1,
                        max: 10,
                        step: 0.5,
                      }),
                    ],
                  }),
                  (0, r.jsx)(i.Ub, {
                    data: [
                      {
                        name: "text",
                        type: "string",
                        default: '"brilliant."',
                        description: "The text content to render as particles.",
                      },
                      {
                        name: "colors",
                        type: "string[]",
                        default: '["#40ffaa", "#40aaff", "#ff40aa", "#aa40ff"]',
                        description:
                          "Array of colors to randomly assign to particles.",
                      },
                      {
                        name: "particleSize",
                        type: "number",
                        default: "2",
                        description: "Size of individual particles in pixels.",
                      },
                      {
                        name: "particleGap",
                        type: "number",
                        default: "2",
                        description:
                          "Gap between particles. Higher values reduce density.",
                      },
                      {
                        name: "mouseControls",
                        type: "object",
                        default: "{ enabled: true, radius: 150, strength: 5 }",
                        description:
                          "Configuration for mouse interaction behavior.",
                      },
                      {
                        name: "fontSize",
                        type: "number",
                        default: "200",
                        description:
                          "Font size of the text. When autoFit is enabled, this is the maximum font size.",
                      },
                      {
                        name: "autoFit",
                        type: "boolean",
                        default: "true",
                        description:
                          "Automatically scale font size to fit container width. Uses fontSize as maximum.",
                      },
                      {
                        name: "backgroundColor",
                        type: "string",
                        default: '"transparent"',
                        description: "Background color of the canvas.",
                      },
                      {
                        name: "friction",
                        type: "number",
                        default: "0.75",
                        description:
                          "Controls how quickly particles slow down (0-1).",
                      },
                      {
                        name: "ease",
                        type: "number",
                        default: "0.05",
                        description:
                          "Controls how quickly particles return to origin (0-1).",
                      },
                    ],
                  }),
                ],
              }),
              (0, r.jsx)(i.lT, { children: (0, r.jsx)(i.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
