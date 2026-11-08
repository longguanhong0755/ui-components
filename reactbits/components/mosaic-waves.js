/* ReactBits Pro public preview module 75545 for mosaic-waves.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/75545.1c902f81a7d1ac56.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  75545: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => c }));
    var l = a(95155),
      r = a(12115),
      n = a(30701),
      u = a(56388),
      i = a(90761),
      o = a(48050);
    let s = () => () => {},
      c = () => {
        let [e, t] = (0, i.I)(),
          { resolvedTheme: a } = (0, n.D)(),
          c =
            (0, r.useSyncExternalStore)(
              s,
              () => !0,
              () => !1,
            ) && "dark" === a,
          [f, d] = (0, r.useState)(null),
          [m, p] = (0, r.useState)(null),
          [h, v] = (0, r.useState)(null),
          x = (0, r.useMemo)(
            () => (null !== f ? f : c ? "#0a0a0a" : "#ffffff"),
            [c, f],
          ),
          g = (0, r.useMemo)(
            () => (null !== m ? m : c ? "#3366ff" : "#7f9cf5"),
            [c, m],
          ),
          b = (0, r.useMemo)(
            () => (null !== h ? h : c ? "#bfd4ff" : "#2b52d8"),
            [c, h],
          ),
          [C, w] = (0, r.useState)(4),
          [y, S] = (0, r.useState)(0.5),
          [j, P] = (0, r.useState)("square"),
          [k, R] = (0, r.useState)(0.15),
          [F, M] = (0, r.useState)(1),
          [G, W] = (0, r.useState)(0.375),
          [I, B] = (0, r.useState)(3),
          [A, D] = (0, r.useState)(7),
          [E, H] = (0, r.useState)(4),
          [N, O] = (0, r.useState)(5),
          [T, q] = (0, r.useState)(5),
          [L, Q] = (0, r.useState)(0),
          [V, _] = (0, r.useState)(2.2),
          [z, U] = (0, r.useState)(0),
          [X, Y] = (0, r.useState)(1),
          [J, K] = (0, r.useState)(!0),
          [Z, $] = (0, r.useState)(0.35),
          [ee, et] = (0, r.useState)(0.25),
          [ea, el] = (0, r.useState)(0.28),
          [er, en] = (0, r.useState)(!0),
          [eu, ei] = (0, r.useState)(!1);
        return (0, l.jsxs)("div", {
          children: [
            (0, l.jsx)(u.Bg, {}),
            (0, l.jsxs)(u.VX, {
              children: [
                (0, l.jsxs)(u.Ec, {
                  children: [
                    (0, l.jsx)(u.Ch, {
                      onRefresh: t,
                      children: (0, l.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, l.jsx)(
                          o.default,
                          {
                            pitch: C,
                            fill: y,
                            shape: j,
                            feather: k,
                            speed: F,
                            warp: G,
                            warpScale: I,
                            detailScale: A,
                            waveScale: E,
                            falloff: N,
                            brightness: T,
                            ambient: L,
                            color: g,
                            hotColor: b,
                            backgroundColor: x,
                            gamma: V,
                            vignette: z,
                            opacity: X,
                            cursorInteraction: J,
                            cursorPull: Z,
                            cursorGlow: ee,
                            cursorReach: ea,
                            adaptiveQuality: er,
                            paused: eu,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, l.jsxs)(u.IH, {
                      children: [
                        (0, l.jsx)(u.yt, {
                          title: "Pitch",
                          min: 2,
                          max: 24,
                          step: 1,
                          value: C,
                          onChange: w,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Fill",
                          min: 0.1,
                          max: 1,
                          step: 0.01,
                          value: y,
                          onChange: S,
                        }),
                        (0, l.jsx)(u.bg, {
                          title: "Shape",
                          value: j,
                          onChange: (e) => P(e),
                          options: [
                            { value: "square", label: "Square" },
                            { value: "dot", label: "Dot" },
                          ],
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Feather",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: k,
                          onChange: R,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Speed",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: F,
                          onChange: M,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Warp",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: G,
                          onChange: W,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Warp Scale",
                          min: 0.5,
                          max: 10,
                          step: 0.1,
                          value: I,
                          onChange: B,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Detail Scale",
                          min: 1,
                          max: 20,
                          step: 0.5,
                          value: A,
                          onChange: D,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Wave Scale",
                          min: 1,
                          max: 12,
                          step: 0.1,
                          value: E,
                          onChange: H,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Falloff",
                          min: 1,
                          max: 12,
                          step: 0.1,
                          value: N,
                          onChange: O,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Brightness",
                          min: 0.5,
                          max: 12,
                          step: 0.1,
                          value: T,
                          onChange: q,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Ambient",
                          min: 0,
                          max: 0.6,
                          step: 0.01,
                          value: L,
                          onChange: Q,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Gamma",
                          min: 0.5,
                          max: 4,
                          step: 0.05,
                          value: V,
                          onChange: _,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Vignette",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: z,
                          onChange: U,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: X,
                          onChange: Y,
                        }),
                        (0, l.jsx)(u.W7, {
                          title: "Color",
                          value: g,
                          onChange: p,
                        }),
                        (0, l.jsx)(u.W7, {
                          title: "Hot Color",
                          value: b,
                          onChange: v,
                        }),
                        (0, l.jsx)(u.W7, {
                          title: "Background",
                          value: x,
                          onChange: d,
                        }),
                        (0, l.jsx)(u.tl, {
                          title: "Cursor Interaction",
                          checked: J,
                          onChange: K,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Cursor Pull",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: Z,
                          onChange: $,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Cursor Glow",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: ee,
                          onChange: et,
                        }),
                        (0, l.jsx)(u.yt, {
                          title: "Cursor Reach",
                          min: 0.05,
                          max: 1,
                          step: 0.01,
                          value: ea,
                          onChange: el,
                        }),
                        (0, l.jsx)(u.tl, {
                          title: "Adaptive Quality",
                          checked: er,
                          onChange: en,
                        }),
                        (0, l.jsx)(u.tl, {
                          title: "Paused",
                          checked: eu,
                          onChange: ei,
                        }),
                      ],
                    }),
                    (0, l.jsx)(u.Ub, {
                      data: [
                        {
                          name: "width",
                          type: "string | number",
                          default: '"100%"',
                          description: "Container width.",
                        },
                        {
                          name: "height",
                          type: "string | number",
                          default: '"100%"',
                          description: "Container height.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "undefined",
                          description: "Additional CSS classes.",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "undefined",
                          description: "Content rendered above the effect.",
                        },
                        {
                          name: "pitch",
                          type: "number",
                          default: "4",
                          description:
                            "Distance between tile centres in CSS pixels.",
                        },
                        {
                          name: "fill",
                          type: "number",
                          default: "0.5",
                          description:
                            "Portion of each cell the tile fills, from 0 to 1.",
                        },
                        {
                          name: "shape",
                          type: '"square" | "dot"',
                          default: '"square"',
                          description: "Tile silhouette.",
                        },
                        {
                          name: "feather",
                          type: "number",
                          default: "0.15",
                          description:
                            "Softness of the tile edge, from 0 to 1.",
                        },
                        {
                          name: "speed",
                          type: "number",
                          default: "1",
                          description: "How fast the field drifts.",
                        },
                        {
                          name: "warp",
                          type: "number",
                          default: "0.375",
                          description:
                            "Strength of the domain warp that folds the field.",
                        },
                        {
                          name: "warpScale",
                          type: "number",
                          default: "3",
                          description: "Scale of the warp field.",
                        },
                        {
                          name: "detailScale",
                          type: "number",
                          default: "7",
                          description:
                            "Scale of the finer warp riding inside the first.",
                        },
                        {
                          name: "waveScale",
                          type: "number",
                          default: "4",
                          description: "Scale of the wave field being lit.",
                        },
                        {
                          name: "falloff",
                          type: "number",
                          default: "5",
                          description:
                            "Falloff exponent. Higher values tighten the bright ridges.",
                        },
                        {
                          name: "brightness",
                          type: "number",
                          default: "5",
                          description: "Overall gain applied to the wave.",
                        },
                        {
                          name: "ambient",
                          type: "number",
                          default: "0",
                          description: "Level the darkest tiles settle at.",
                        },
                        {
                          name: "color",
                          type: "string",
                          default: '"#3366ff"',
                          description: "Colour of the wave.",
                        },
                        {
                          name: "hotColor",
                          type: "string",
                          default: '"#bfd4ff"',
                          description:
                            "Colour the brightest ridges shift toward.",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"#0a0a0a"',
                          description:
                            'Background fill colour. Accepts "transparent".',
                        },
                        {
                          name: "gamma",
                          type: "number",
                          default: "2.2",
                          description: "Contrast curve applied at the end.",
                        },
                        {
                          name: "vignette",
                          type: "number",
                          default: "0",
                          description:
                            "Darkening toward the edges, from 0 to 1.",
                        },
                        {
                          name: "opacity",
                          type: "number",
                          default: "1",
                          description: "Master alpha, from 0 to 1.",
                        },
                        {
                          name: "cursorInteraction",
                          type: "boolean",
                          default: "true",
                          description:
                            "Let the pointer bend and light the field.",
                        },
                        {
                          name: "cursorPull",
                          type: "number",
                          default: "0.35",
                          description: "How far the pointer pulls the field.",
                        },
                        {
                          name: "cursorGlow",
                          type: "number",
                          default: "0.25",
                          description:
                            "How much the pointer lights nearby tiles.",
                        },
                        {
                          name: "cursorReach",
                          type: "number",
                          default: "0.28",
                          description: "Reach of the pointer, from 0 to 1.",
                        },
                        {
                          name: "adaptiveQuality",
                          type: "boolean",
                          default: "true",
                          description:
                            "Drop resolution when the frame rate falls short.",
                        },
                        {
                          name: "targetFps",
                          type: "number",
                          default: "60",
                          description: "Frame rate the adaptive pass aims for.",
                        },
                        {
                          name: "dpr",
                          type: "number",
                          default: "2",
                          description: "Upper bound on device pixel ratio.",
                        },
                        {
                          name: "paused",
                          type: "boolean",
                          default: "false",
                          description: "Hold the animation still.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, l.jsx)(u.lT, { children: (0, l.jsx)(u.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
