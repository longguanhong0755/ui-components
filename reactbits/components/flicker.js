/* ReactBits Pro public preview module 26874 for flicker.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/26874.c0703b4da60ce671.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  26874: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => d }));
    var r = a(95155),
      l = a(12115),
      n = a(30701),
      i = a(56388),
      s = a(48543),
      o = a(90761),
      c = a(77226);
    let u = [
        "#FF0000",
        "#FF7F00",
        "#FFFF00",
        "#00FF00",
        "#0000FF",
        "#4B0082",
        "#9400D3",
      ],
      d = () => {
        let { resolvedTheme: e } = (0, n.D)(),
          [t, a] = (0, o.I)(),
          [d, h] = (0, l.useState)(30),
          [m, f] = (0, l.useState)(1.5),
          [p, x] = (0, l.useState)("#5A4B81"),
          [g, v] = (0, l.useState)("#FF9FFC"),
          [y, b] = (0, l.useState)(1),
          [C, w] = (0, l.useState)(1),
          [S, F] = (0, l.useState)(0.3),
          [j, M] = (0, l.useState)(1.5),
          [P, R] = (0, l.useState)(1),
          [k, E] = (0, l.useState)("circle"),
          [$, q] = (0, l.useState)(!0),
          [B, I] = (0, l.useState)(1),
          [A, N] = (0, l.useState)(!0),
          [T, G] = (0, l.useState)(!1);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(i.Bg, {}),
            (0, r.jsxs)(i.VX, {
              children: [
                (0, r.jsxs)(i.Ec, {
                  children: [
                    (0, r.jsx)(i.Ch, {
                      onRefresh: a,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          c.A,
                          {
                            spacing: d,
                            particleSize: m,
                            color: p,
                            glowColor: g,
                            alpha: y,
                            overlay: C,
                            overlayColor: "dark" === e ? "#0a0a0a" : "#ffffff",
                            minFrequency: S,
                            maxFrequency: j,
                            rate: P,
                            shape: k,
                            jitter: $,
                            flickerChance: B,
                            mouseEffect: A,
                            colorPalette: T ? u : void 0,
                          },
                          t,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(i.IH, {
                      children: [
                        (0, r.jsx)(i.yt, {
                          title: "Spacing",
                          value: d,
                          onChange: h,
                          min: 8,
                          max: 40,
                          step: 2,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Particle Size",
                          value: m,
                          onChange: f,
                          min: 1,
                          max: 6,
                          step: 0.5,
                        }),
                        (0, r.jsx)(s.PreviewSelect, {
                          title: "Shape",
                          value: k,
                          onChange: (e) => E(e),
                          options: [
                            { label: "Circle", value: "circle" },
                            { label: "Square", value: "square" },
                          ],
                        }),
                        (0, r.jsx)(s.PreviewSwitch, {
                          title: "Jitter",
                          checked: $,
                          onChange: q,
                        }),
                        (0, r.jsx)(i.W7, {
                          title: "Color",
                          value: p,
                          onChange: x,
                        }),
                        (0, r.jsx)(i.W7, {
                          title: "Glow",
                          value: g,
                          onChange: v,
                        }),
                        (0, r.jsx)(s.PreviewSwitch, {
                          title: "Rainbow Palette",
                          checked: T,
                          onChange: G,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Rate",
                          value: P,
                          onChange: R,
                          min: 0.1,
                          max: 3,
                          step: 0.1,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Min Frequency",
                          value: S,
                          onChange: F,
                          min: 0.1,
                          max: 3,
                          step: 0.1,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Max Frequency",
                          value: j,
                          onChange: M,
                          min: 0.1,
                          max: 5,
                          step: 0.1,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Flicker Chance",
                          value: B,
                          onChange: I,
                          min: 0,
                          max: 1,
                          step: 0.05,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Alpha",
                          value: y,
                          onChange: b,
                          min: 0,
                          max: 1,
                          step: 0.05,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Overlay",
                          value: C,
                          onChange: w,
                          min: 0,
                          max: 1,
                          step: 0.05,
                        }),
                        (0, r.jsx)(s.PreviewSwitch, {
                          title: "Mouse Effect",
                          checked: A,
                          onChange: N,
                        }),
                      ],
                    }),
                    (0, r.jsx)(i.Ub, {
                      data: [
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the wrapper element",
                        },
                        {
                          name: "spacing",
                          type: "number",
                          default: "20",
                          description:
                            "Distance between particle centers in pixels",
                        },
                        {
                          name: "particleSize",
                          type: "number",
                          default: "1.5",
                          description: "Radius of each particle in pixels",
                        },
                        {
                          name: "color",
                          type: "string",
                          default: '"#5A4B81"',
                          description:
                            "Base color for dim particles (hex or rgba)",
                        },
                        {
                          name: "glowColor",
                          type: "string",
                          default: '"#FF9FFC"',
                          description:
                            "Glow color when particles brighten (hex or rgba)",
                        },
                        {
                          name: "alpha",
                          type: "number",
                          default: "1",
                          description:
                            "Overall opacity of the entire effect (0-1)",
                        },
                        {
                          name: "overlay",
                          type: "number",
                          default: "1",
                          description:
                            "Radial vignette darkness intensity (0-1)",
                        },
                        {
                          name: "overlayColor",
                          type: "string",
                          default: '"#0a0a0a"',
                          description:
                            "Color of the overlay vignette (hex or rgb)",
                        },
                        {
                          name: "minFrequency",
                          type: "number",
                          default: "0.3",
                          description: "Minimum flicker frequency per particle",
                        },
                        {
                          name: "maxFrequency",
                          type: "number",
                          default: "1.5",
                          description: "Maximum flicker frequency per particle",
                        },
                        {
                          name: "rate",
                          type: "number",
                          default: "1",
                          description: "Global animation speed multiplier",
                        },
                        {
                          name: "shape",
                          type: '"circle" | "square"',
                          default: '"circle"',
                          description: "Shape of the particles",
                        },
                        {
                          name: "jitter",
                          type: "boolean",
                          default: "false",
                          description:
                            "Whether to randomly offset particles from the grid",
                        },
                        {
                          name: "flickerChance",
                          type: "number",
                          default: "1.0",
                          description:
                            "Probability that a particle will flicker (0-1)",
                        },
                        {
                          name: "mouseEffect",
                          type: "boolean",
                          default: "false",
                          description:
                            "Whether mouse proximity affects particles",
                        },
                        {
                          name: "colorPalette",
                          type: "string[]",
                          default: "undefined",
                          description:
                            "Array of colors to randomly assign to particles",
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
