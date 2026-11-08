/* ReactBits Pro public preview module 15092 for glitch-text.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/15092.5e3892e3c6d40441.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  15092: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => o }));
    var r = n(95155),
      l = n(56388),
      a = n(90761),
      i = n(12115);
    let s = ({
      text: e = "Glitch Text",
      className: t = "",
      colors: n = ["#00ffff", "#ff00ff", "#ffff00"],
      textColor: l,
      fontSize: a = 80,
      fontWeight: s = "600",
      radius: o = 250,
      letterSpacing: c = -1,
      lineHeight: u = 1.5,
      textAlign: f = "center",
      fadeIn: d = !1,
      autoFit: h = !0,
    }) => {
      let m = (0, i.useRef)(null),
        x = (0, i.useRef)(null),
        p = (0, i.useRef)([]),
        g = (0, i.useRef)({ x: 0, y: 0, r: o }),
        b = (0, i.useRef)(0),
        v = (0, i.useRef)(null),
        y = (0, i.useRef)(void 0),
        C = (0, i.useRef)(null),
        w = (0, i.useRef)(0),
        j = (0, i.useRef)(1),
        S = (0, i.useRef)(a),
        [k, E] = (0, i.useState)(!1),
        M = (0, i.useCallback)((e, t) => e.measureText(t).width, []),
        R = (0, i.useCallback)(
          (e, t, n, r) => Math.sqrt(Math.pow(e - n, 2) + Math.pow(t - r, 2)),
          [],
        ),
        T = (0, i.useCallback)((e, t, n, r) => Math.atan2(r - t, n - e), []),
        A = (0, i.useCallback)(
          (e, t, n, r) => {
            let l = j.current,
              i = 40 * l,
              o = n - 2 * i,
              c = r - 2 * i,
              f = t.split(" | "),
              d = 10 * l,
              h = a * l,
              m = d;
            for (; d <= h;) {
              let t = Math.floor((d + h) / 2);
              e.font = `${s} ${t}px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif`;
              let n = !0,
                r = 0,
                l = t * u;
              for (let t of f) {
                if (M(e, t) > o) {
                  n = !1;
                  break;
                }
                r += l;
              }
              n && r <= c ? ((m = t), (d = t + 1)) : (h = t - 1);
            }
            return m / l;
          },
          [a, s, u, M],
        ),
        I = (0, i.useCallback)(
          (e, t, r, i, o, m) => {
            let x = [],
              p = j.current,
              g = a;
            (h && (g = A(e, t, o, m)), (S.current = g));
            let v = g * p;
            ((e.font = `${s} ${v}px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif`),
              (e.textBaseline = "middle"));
            let y = [...n, l ?? (k ? "#ffffff" : "#000000")],
              C = 0;
            for (let n = 0; n < y.length; n++) {
              let l = 1;
              0 === n
                ? (l = 0.5)
                : 1 === n
                  ? (l = 0.7)
                  : n === y.length - 1 && (l = 0.6);
              let a = t.split(" | "),
                s = a.map((t) => M(e, t)),
                o = Math.max(...s);
              b.current = o;
              let h = M(e, "M") * u,
                m = 1 === a.length;
              for (let t = 0; t < a.length; t++) {
                let u = 0;
                for (let p = 0; p < a[t].length; p++) {
                  let g,
                    b = M(e, a[t][p]);
                  g =
                    "left" === f
                      ? r - o / 2 + u
                      : "right" === f
                        ? r + o / 2 - s[t] + u
                        : r - s[t] / 2 + u;
                  let v = m ? i : 0 === t ? i - h / 2 : i + h / 2;
                  (x.push({
                    char: a[t][p],
                    cx: Math.round(g),
                    cy: Math.round(v),
                    color: y[n],
                    layer: l,
                    r: 0,
                    alpha: 0,
                    dx: Math.round(g),
                    dy: Math.round(v),
                    fadeAlpha: +!d,
                    charIndex: C,
                  }),
                    (u += b + c));
                }
                0 === n && C++;
              }
            }
            return x;
          },
          [n, l, k, a, s, M, c, u, f, d, h, A],
        ),
        F = (0, i.useCallback)(
          (e, t) => {
            let n = R(t.x, t.y, e.cx, e.cy);
            n < t.r
              ? ((e.alpha = T(t.x, t.y, e.cx, e.cy) + Math.PI),
                (e.r = (e.layer * n * (t.r - n)) / t.r),
                (e.dx += (e.cx + e.r * Math.cos(e.alpha) - e.dx) * 0.2),
                (e.dy += (e.cy + e.r * Math.sin(e.alpha) - e.dy) * 0.2))
              : ((e.dx += (e.cx - e.dx) * 0.2), (e.dy += (e.cy - e.dy) * 0.2));
          },
          [R, T],
        ),
        N = (0, i.useCallback)(
          (e, t) => {
            let r = l ?? (k ? "#ffffff" : "#000000"),
              a = [...n, r];
            e.globalCompositeOperation = k ? "lighten" : "darken";
            for (let r = 0; r < n.length; r++)
              for (let n = 0; n < t.length; n++)
                if (t[n].color === a[r]) {
                  let l = t[n].fadeAlpha;
                  l > 0 &&
                    ((e.globalAlpha = l),
                    (e.fillStyle = a[r]),
                    e.fillText(t[n].char, t[n].dx, t[n].dy));
                }
            e.globalCompositeOperation = "source-over";
            for (let n = 0; n < t.length; n++)
              if (t[n].color === r) {
                let l = t[n].fadeAlpha;
                l > 0 &&
                  ((e.globalAlpha = l),
                  (e.fillStyle = r),
                  e.fillText(t[n].char, t[n].dx, t[n].dy));
              }
            e.globalAlpha = 1;
          },
          [n, k, l],
        );
      (0, i.useEffect)(() => {
        let e = () => {
          let t = m.current,
            n = x.current;
          if (!t || !n) return;
          let r = p.current,
            l = g.current,
            a = b.current,
            i = t.width / 2,
            s = t.height / 2;
          (n.clearRect(0, 0, t.width, t.height),
            d &&
              (w.current++,
              r.forEach((e) => {
                if (e.fadeAlpha < 1) {
                  let t = 3 * e.charIndex;
                  w.current > t &&
                    (e.fadeAlpha = Math.min(1, e.fadeAlpha + 0.005));
                }
              })),
            Math.abs(l.x - i) < a && Math.abs(l.y - s) < 0.7 * a
              ? r.forEach((e) => F(e, l))
              : r.forEach((e) => {
                  ((e.dx += (e.cx - e.dx) * 0.2),
                    (e.dy += (e.cy - e.dy) * 0.2));
                }),
            N(n, r),
            (v.current = requestAnimationFrame(e)));
        };
        C.current = e;
      }, [F, N, k, d]);
      let L = (0, i.useCallback)(() => {
          let t = m.current,
            n = x.current;
          if (!t || !n) return;
          null !== v.current && cancelAnimationFrame(v.current);
          let r = window.devicePixelRatio || 1;
          ((j.current = r),
            (t.width = t.offsetWidth * r),
            (t.height = t.offsetHeight * r));
          let l = t.width / 2,
            a = t.height / 2;
          ((g.current.x = -9999),
            (g.current.y = -9999),
            (g.current.r = o * r),
            (w.current = 0),
            (p.current = I(n, e, l, a, t.width, t.height)),
            C.current && C.current());
        }, [e, o, I]),
        P = (0, i.useCallback)((e) => {
          let t = m.current;
          if (!t) return;
          let n = t.getBoundingClientRect(),
            r = j.current;
          ((g.current.x = (e.clientX - n.left) * r),
            (g.current.y = (e.clientY - n.top) * r));
        }, []),
        H = (0, i.useCallback)((e) => {
          e.preventDefault();
          let t = m.current;
          if (!t) return;
          let n = t.getBoundingClientRect(),
            r = j.current;
          ((g.current.x = (e.touches[0].clientX - n.left) * r),
            (g.current.y = (e.touches[0].clientY - n.top) * r));
        }, []);
      return (
        (0, i.useEffect)(() => {
          let t = () => {
            E(document.documentElement.classList.contains("dark"));
          };
          t();
          let n = new MutationObserver(t);
          n.observe(document.documentElement, {
            attributes: !0,
            attributeFilter: ["class"],
          });
          let r = m.current;
          if (!r) return void n.disconnect();
          let l = r.getContext("2d");
          if (!l) return void n.disconnect();
          x.current = l;
          let a = window.devicePixelRatio || 1;
          ((j.current = a),
            (r.width = r.offsetWidth * a),
            (r.height = r.offsetHeight * a));
          let i = r.width / 2,
            s = r.height / 2;
          ((g.current = { x: -9999, y: -9999, r: o * a }),
            setTimeout(() => {
              ((p.current = I(l, e, i, s, r.width, r.height)),
                setTimeout(() => {
                  C.current && C.current();
                }, 50));
            }, 10),
            r.addEventListener("mousemove", P),
            r.addEventListener("touchmove", H, { passive: !1 }));
          let c = new ResizeObserver(() => {
            (y.current && clearTimeout(y.current),
              (y.current = setTimeout(L, 100)));
          });
          return (
            c.observe(r),
            () => {
              (null !== v.current && cancelAnimationFrame(v.current),
                y.current && clearTimeout(y.current),
                r.removeEventListener("mousemove", P),
                r.removeEventListener("touchmove", H),
                c.disconnect(),
                n.disconnect());
            }
          );
        }, [e, o, I, P, H, L]),
        (0, r.jsx)("div", {
          className: `relative w-full h-full flex items-center justify-center overflow-hidden ${t}`,
          children: (0, r.jsx)("canvas", {
            ref: m,
            className: "block w-full h-full cursor-pointer touch-none",
          }),
        })
      );
    };
    s.displayName = "GlitchText";
    let o = () => {
      let [e, t] = (0, a.I)(),
        [n, o] = (0, i.useState)("Glitchy on hover."),
        [c, u] = (0, i.useState)(80),
        [f, d] = (0, i.useState)(250),
        [h, m] = (0, i.useState)(-3),
        [x, p] = (0, i.useState)(1.5),
        [g, b] = (0, i.useState)("center"),
        [v, y] = (0, i.useState)(!1),
        [C, w] = (0, i.useState)(!0),
        [j, S] = (0, i.useState)("#00ffff"),
        [k, E] = (0, i.useState)("#ff00ff"),
        [M, R] = (0, i.useState)("#0008ff"),
        [T, A] = (0, i.useState)(() =>
          "undefined" != typeof document &&
          document.documentElement.classList.contains("dark")
            ? "#ffffff"
            : "#000000",
        );
      return (
        (0, i.useEffect)(() => {
          let e = new MutationObserver(() => {
            (A(
              document.documentElement.classList.contains("dark")
                ? "#ffffff"
                : "#000000",
            ),
              t());
          });
          return (
            e.observe(document.documentElement, {
              attributes: !0,
              attributeFilter: ["class"],
            }),
            () => e.disconnect()
          );
        }, [t]),
        (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(l.Bg, {}),
            (0, r.jsxs)(l.VX, {
              children: [
                (0, r.jsxs)(l.Ec, {
                  children: [
                    (0, r.jsx)(l.Ch, {
                      onRefresh: t,
                      children: (0, r.jsx)("div", {
                        className: "w-full h-[500px]",
                        children: (0, r.jsx)(
                          s,
                          {
                            text: n,
                            fontSize: c,
                            radius: f,
                            letterSpacing: h,
                            lineHeight: x,
                            textAlign: g,
                            fontWeight: "600",
                            fadeIn: v,
                            autoFit: C,
                            colors: [j, k, M],
                            textColor: T,
                            className: "blur-[1px]",
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(l.IH, {
                      children: [
                        (0, r.jsx)(l.UD, {
                          title: "Text",
                          value: n,
                          onChange: (e) => {
                            (o(e), t());
                          },
                          placeholder: "Enter text (use ' * ' for line breaks)",
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Text Color",
                          value: T,
                          onChange: (e) => {
                            (A(e), t());
                          },
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Color 1",
                          value: j,
                          onChange: (e) => {
                            (S(e), t());
                          },
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Color 2",
                          value: k,
                          onChange: (e) => {
                            (E(e), t());
                          },
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Color 3",
                          value: M,
                          onChange: (e) => {
                            (R(e), t());
                          },
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Font Size",
                          value: c,
                          onChange: (e) => {
                            (u(e), t());
                          },
                          min: 20,
                          max: 120,
                          step: 1,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Letter Spacing",
                          value: h,
                          onChange: (e) => {
                            (m(e), t());
                          },
                          min: -10,
                          max: 50,
                          step: 1,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Line Height",
                          value: x,
                          onChange: (e) => {
                            (p(e), t());
                          },
                          min: 0.5,
                          max: 3,
                          step: 0.1,
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Text Align",
                          value: g,
                          options: [
                            { label: "Left", value: "left" },
                            { label: "Center", value: "center" },
                            { label: "Right", value: "right" },
                          ],
                          onChange: (e) => {
                            (b(e), t());
                          },
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Interaction Radius",
                          value: f,
                          onChange: (e) => {
                            (d(e), t());
                          },
                          min: 50,
                          max: 400,
                          step: 10,
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Auto Fit",
                          checked: C,
                          onChange: (e) => {
                            (w(e), t());
                          },
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Fade In",
                          checked: v,
                          onChange: (e) => {
                            (y(e), t());
                          },
                        }),
                      ],
                    }),
                    (0, r.jsx)(l.Ub, {
                      data: [
                        {
                          name: "text",
                          type: "string",
                          default: '"Glitch Text"',
                          description:
                            "Text to display. Use ' | ' to split text into multiple lines.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the container.",
                        },
                        {
                          name: "colors",
                          type: "string[]",
                          default: '["#00ffff", "#ff00ff", "#ffff00"]',
                          description:
                            "Array of hex color strings for the glitch effect layers.",
                        },
                        {
                          name: "textColor",
                          type: "string",
                          default: "undefined",
                          description:
                            "Main text color displayed on top. Defaults to black in light mode, white in dark mode.",
                        },
                        {
                          name: "fontSize",
                          type: "number",
                          default: "80",
                          description: "Font size in pixels.",
                        },
                        {
                          name: "fontWeight",
                          type: "string",
                          default: '"600"',
                          description: "Font weight (normal, bold, etc.).",
                        },
                        {
                          name: "radius",
                          type: "number",
                          default: "250",
                          description:
                            "Interaction radius in pixels. Characters within this distance from the cursor will react.",
                        },
                        {
                          name: "letterSpacing",
                          type: "number",
                          default: "-1",
                          description:
                            "Additional spacing between characters in pixels.",
                        },
                        {
                          name: "lineHeight",
                          type: "number",
                          default: "1.5",
                          description:
                            "Line height multiplier for multi-line text.",
                        },
                        {
                          name: "textAlign",
                          type: '"left" | "center" | "right"',
                          default: '"center"',
                          description: "Horizontal text alignment.",
                        },
                        {
                          name: "fadeIn",
                          type: "boolean",
                          default: "false",
                          description:
                            "Enable fade-in animation for letters on load.",
                        },
                        {
                          name: "autoFit",
                          type: "boolean",
                          default: "true",
                          description:
                            "Automatically scale font size to fit the container width.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, r.jsx)(l.lT, { children: (0, r.jsx)(l.Gv, {}) }),
              ],
            }),
          ],
        })
      );
    };
  },
};
