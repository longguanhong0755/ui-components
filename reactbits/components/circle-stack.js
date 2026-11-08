/* ReactBits Pro public preview module 62912 for circle-stack.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/62912.ecfbe1e6f26b8d4d.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  62912: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => u }));
    var i = a(95155),
      r = a(12115),
      n = a(30701),
      s = a(56388),
      l = a(90761),
      d = a(90650);
    let o = [
        {
          id: "circle-stack-1",
          image: "/demo-media/abstract-iris-window.webp",
          alt: "Pink rounded arch framing a warm orange gradient on an iris-purple field",
        },
        {
          id: "circle-stack-2",
          image: "/demo-media/abstract-citrus-signal.webp",
          alt: "Citrus circle intersected by a hot-pink diagonal bar on saturated violet",
        },
        {
          id: "circle-stack-3",
          image: "/demo-media/abstract-rose-petal.webp",
          alt: "Three overlapping raspberry, plum and coral semicircles on a grainy pink field",
        },
      ],
      c = ({
        items: e = o,
        size: t = 410,
        tilt: a = 60,
        stackGap: n = 45,
        interval: s = 4,
        transitionDuration: l = 0.9,
        paused: c = !1,
        surfaceColor: u = "#FFFFFF",
        borderColor: m = "#000000",
        borderWidth: p = 1,
        className: h,
        style: f,
        onActiveChange: v,
      }) => {
        let x = Math.max(1, e.length),
          [b, g] = (0, r.useState)(0);
        (0, r.useEffect)(() => {
          if (c || x <= 1) return;
          let e = window.setInterval(
            () => {
              g((e) => {
                let t = (e + 1) % x;
                return (v?.(t), t);
              });
            },
            1e3 * Math.max(0.2, s),
          );
          return () => window.clearInterval(e);
        }, [c, x, s]);
        let y = t + (x - 1) * n,
          C = { width: t + 80, height: y + 40, perspective: 8 * t, ...f },
          j = t * Math.cos((a * Math.PI) / 180) * 0.6;
        return (0, i.jsx)("div", {
          className: (0, d.cn)(
            "relative flex select-none items-center justify-center",
            h,
          ),
          style: C,
          role: "group",
          "aria-label": "Disc stack",
          children: (0, i.jsx)("div", {
            className: "relative [transform-style:preserve-3d]",
            style: { width: t, height: y },
            children: e.map((e, r) => {
              let s = r === b,
                d = r * n,
                o = r < b ? d - j : d;
              return (0, i.jsx)(
                "div",
                {
                  className:
                    "absolute left-1/2 top-1/2 overflow-hidden rounded-full",
                  style: {
                    width: t,
                    height: t,
                    marginLeft: -t / 2,
                    marginTop: -t / 2,
                    transform: `translateY(${o}px) rotateX(${a}deg)`,
                    transformStyle: "preserve-3d",
                    zIndex: x - r,
                    background: u,
                    border: `${p}px solid ${m}`,
                    transition: `transform ${l}s cubic-bezier(0.22, 1, 0.36, 1)`,
                  },
                  children: (0, i.jsx)("img", {
                    src: e.image,
                    alt: e.alt ?? "",
                    draggable: !1,
                    className: "h-full w-full select-none object-cover",
                    style: { opacity: +!!s, transition: "opacity 0.3s ease" },
                  }),
                },
                e.id ?? r,
              );
            }),
          }),
        });
      },
      u = () => {
        let [e, t] = (0, l.I)(),
          { resolvedTheme: a } = (0, n.D)(),
          [d, o] = (0, r.useState)(410),
          [u, m] = (0, r.useState)(60),
          [p, h] = (0, r.useState)(45),
          [f, v] = (0, r.useState)(2),
          [x, b] = (0, r.useState)(4),
          [g, y] = (0, r.useState)(0.9),
          [C, j] = (0, r.useState)(!1),
          [w, S] = (0, r.useState)(null),
          [F, k] = (0, r.useState)(null),
          N = (0, r.useMemo)(
            () => (null !== w ? w : "dark" === a ? "#0a0a0a" : "#FFFFFF"),
            [a, w],
          ),
          I = (0, r.useMemo)(
            () => (null !== F ? F : "dark" === a ? "#FFFFFF" : "#000000"),
            [a, F],
          );
        return (0, i.jsxs)("div", {
          children: [
            (0, i.jsx)(s.Bg, {}),
            (0, i.jsxs)(s.VX, {
              children: [
                (0, i.jsxs)(s.Ec, {
                  children: [
                    (0, i.jsx)(s.Ch, {
                      onRefresh: t,
                      minHeight: 620,
                      children: (0, i.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, i.jsx)(
                          c,
                          {
                            size: d,
                            tilt: u,
                            stackGap: p,
                            borderWidth: f,
                            interval: x,
                            transitionDuration: g,
                            paused: C,
                            surfaceColor: N,
                            borderColor: I,
                            className:
                              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, i.jsxs)(s.IH, {
                      children: [
                        (0, i.jsx)(s.yt, {
                          title: "Disc Size",
                          min: 180,
                          max: 480,
                          step: 10,
                          value: d,
                          onChange: o,
                          valueUnit: "px",
                        }),
                        (0, i.jsx)(s.yt, {
                          title: "Tilt",
                          min: 0,
                          max: 85,
                          step: 1,
                          value: u,
                          onChange: m,
                          valueUnit: "\xb0",
                        }),
                        (0, i.jsx)(s.yt, {
                          title: "Stack Gap",
                          min: 0,
                          max: 80,
                          step: 1,
                          value: p,
                          onChange: h,
                          valueUnit: "px",
                        }),
                        (0, i.jsx)(s.yt, {
                          title: "Border Width",
                          min: 0,
                          max: 8,
                          step: 1,
                          value: f,
                          onChange: v,
                          valueUnit: "px",
                        }),
                        (0, i.jsx)(s.yt, {
                          title: "Interval",
                          min: 1,
                          max: 10,
                          step: 0.5,
                          value: x,
                          onChange: b,
                          valueUnit: "s",
                        }),
                        (0, i.jsx)(s.yt, {
                          title: "Transition Duration",
                          min: 0.2,
                          max: 2,
                          step: 0.05,
                          value: g,
                          onChange: y,
                          valueUnit: "s",
                        }),
                        (0, i.jsx)(s.tl, {
                          title: "Paused",
                          checked: C,
                          onChange: j,
                        }),
                        (0, i.jsx)(s.W7, {
                          title: "Surface Color",
                          value: N,
                          onChange: S,
                        }),
                        (0, i.jsx)(s.W7, {
                          title: "Border Color",
                          value: I,
                          onChange: k,
                        }),
                      ],
                    }),
                    (0, i.jsx)(s.Ub, {
                      data: [
                        {
                          name: "items",
                          type: "CircleStackItem[]",
                          default: "3 sample images",
                          description:
                            "Discs to render. Each item: { id?, image, alt? }.",
                        },
                        {
                          name: "size",
                          type: "number",
                          default: "410",
                          description: "Diameter of each disc in pixels.",
                        },
                        {
                          name: "tilt",
                          type: "number",
                          default: "60",
                          description:
                            "Disc tilt in degrees. 0 = flat circle, 90 = edge-on.",
                        },
                        {
                          name: "stackGap",
                          type: "number",
                          default: "45",
                          description:
                            "Vertical separation between adjacent discs in pixels.",
                        },
                        {
                          name: "interval",
                          type: "number",
                          default: "4",
                          description: "Seconds between active-index advances.",
                        },
                        {
                          name: "transitionDuration",
                          type: "number",
                          default: "0.9",
                          description:
                            "Seconds for the lift / settle transition.",
                        },
                        {
                          name: "paused",
                          type: "boolean",
                          default: "false",
                          description: "Pause the auto-cycle.",
                        },
                        {
                          name: "surfaceColor",
                          type: "string",
                          default: '"#FFFFFF"',
                          description:
                            "CSS color for the disc surface (top face).",
                        },
                        {
                          name: "borderColor",
                          type: "string",
                          default: '"#000000"',
                          description: "CSS color for the disc border ring.",
                        },
                        {
                          name: "borderWidth",
                          type: "number",
                          default: "1",
                          description: "Border thickness in pixels.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "undefined",
                          description: "Class applied to the root element.",
                        },
                        {
                          name: "style",
                          type: "CSSProperties",
                          default: "undefined",
                          description:
                            "Inline style applied to the root element.",
                        },
                        {
                          name: "onActiveChange",
                          type: "(index: number) => void",
                          default: "undefined",
                          description:
                            "Fires when the active disc index changes.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, i.jsx)(s.lT, { children: (0, i.jsx)(s.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
