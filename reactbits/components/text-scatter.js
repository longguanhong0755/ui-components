/* ReactBits Pro public preview module 39048 for text-scatter.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/39048.68e4d0d31d27af4a.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  39048: (e, t, n) => {
    "use strict";
    (n.r(t), n.d(t, { default: () => c }));
    var a = n(95155),
      r = n(12115),
      s = n(56388),
      i = n(90761),
      l = n(82637);
    n(14626);
    let o = ({
        text: e = "Bounce Back.",
        className: t = "",
        as: n = "h1",
        velocity: s = 200,
        rotation: i = 90,
        scale: o = 1,
        returnAfter: c = 1,
        duration: u = 2,
      }) => {
        let d = (e) => {
          let t = e.currentTarget,
            n = t.getBoundingClientRect(),
            a = n.left + n.width / 2,
            r = n.top + n.height / 2,
            d = e.clientX,
            m = Math.atan2(r - e.clientY, a - d),
            x = s * (0.8 + 0.4 * Math.random()),
            h = Math.cos(m) * x,
            p = Math.sin(m) * x,
            v = (Math.random() - 0.5) * i * 2;
          l.os.to(t, {
            x: h,
            y: p,
            rotation: v,
            scale: o,
            duration: u,
            ease: "power4.out",
            overwrite: "auto",
            onComplete: () => {
              l.os.to(t, {
                x: 0,
                y: 0,
                rotation: 0,
                scale: 1,
                duration: u,
                delay: c,
                ease: "elastic.out(1, 0.3)",
                overwrite: "auto",
              });
            },
          });
        };
        return r.createElement(
          n,
          { className: `text-scatter ${t}` },
          e
            .split("")
            .map((e, t) =>
              (0, a.jsx)(
                "span",
                {
                  className: "text-scatter__letter",
                  onMouseEnter: d,
                  style: { willChange: "transform" },
                  children: " " === e ? "\xa0" : e,
                },
                t,
              ),
            ),
        );
      },
      c = () => {
        let [e, t] = (0, i.I)(),
          [n, l] = (0, r.useState)("Bounce Back."),
          [c, u] = (0, r.useState)(200),
          [d, m] = (0, r.useState)(90),
          [x, h] = (0, r.useState)(1),
          [p, v] = (0, r.useState)(1),
          [f, g] = (0, r.useState)(2);
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(s.Bg, {}),
            (0, a.jsxs)(s.VX, {
              children: [
                (0, a.jsxs)(s.Ec, {
                  children: [
                    (0, a.jsx)(s.Ch, {
                      onRefresh: t,
                      children: (0, a.jsx)("div", {
                        className:
                          "flex min-h-[400px] items-center justify-center",
                        children: (0, a.jsx)(
                          o,
                          {
                            text: n,
                            as: "h2",
                            className:
                              "text-4xl md:text-6xl font-bold text-center tracking-tighter",
                            velocity: c,
                            rotation: d,
                            scale: x,
                            returnAfter: p,
                            duration: f,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, a.jsxs)(s.IH, {
                      children: [
                        (0, a.jsx)(s.UD, {
                          title: "Text",
                          value: n,
                          onChange: (e) => {
                            (l(e), t());
                          },
                          placeholder: "Enter text...",
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Scale",
                          value: x,
                          onChange: (e) => {
                            h(e);
                          },
                          min: 0.5,
                          max: 3,
                          step: 0.1,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Velocity",
                          value: c,
                          onChange: (e) => {
                            u(e);
                          },
                          min: 10,
                          max: 300,
                          step: 10,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Rotation",
                          value: d,
                          onChange: (e) => {
                            m(e);
                          },
                          min: 0,
                          max: 360,
                          step: 5,
                          valueUnit: "\xb0",
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Return Delay",
                          value: p,
                          onChange: (e) => {
                            v(e);
                          },
                          min: 0.1,
                          max: 3,
                          step: 0.1,
                          valueUnit: "s",
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Duration",
                          value: f,
                          onChange: (e) => {
                            g(e);
                          },
                          min: 0.1,
                          max: 2,
                          step: 0.1,
                          valueUnit: "s",
                        }),
                      ],
                    }),
                    (0, a.jsx)(s.Ub, {
                      data: [
                        {
                          name: "text",
                          type: "string",
                          default: "required",
                          description: "The text content to render and animate",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the container element",
                        },
                        {
                          name: "as",
                          type: "React.ElementType",
                          default: '"h1"',
                          description:
                            "HTML element to render as the container",
                        },
                        {
                          name: "velocity",
                          type: "number",
                          default: "200",
                          description:
                            "Initial velocity of the scattered letters",
                        },
                        {
                          name: "rotation",
                          type: "number",
                          default: "90",
                          description: "Max rotation in degrees when scattered",
                        },
                        {
                          name: "scale",
                          type: "number",
                          default: "1",
                          description: "Scale factor when scattered",
                        },
                        {
                          name: "returnAfter",
                          type: "number",
                          default: "1",
                          description:
                            "Delay in seconds before returning to original position",
                        },
                        {
                          name: "duration",
                          type: "number",
                          default: "2",
                          description: "Duration of the scatter animation",
                        },
                      ],
                    }),
                  ],
                }),
                (0, a.jsx)(s.lT, { children: (0, a.jsx)(s.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
