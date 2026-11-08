/* ReactBits Pro public preview module 39712 for text-path.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/39712.e49cb8a10f4f1dc3.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  39712: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => d }));
    var r = n(95155),
      a = n(56388),
      s = n(90761),
      i = n(12115),
      l = n(82637),
      o = n(55783);
    let c = ({
      text: e = "Your text goes here",
      path: t,
      className: n = "",
      duration: a = 21,
      reversed: s = !1,
      fontSize: c = "17px",
      letterSpacing: u = "normal",
      viewBox: d = "0 0 240 240",
      pathScale: f = 1,
    }) => {
      let p = (0, i.useId)(),
        h = `text-path-curve-${p.replace(/:/g, "")}`,
        x = (0, i.useRef)(null),
        m = (0, i.useRef)(null),
        v = (0, i.useRef)(null),
        g = (0, i.useRef)(null),
        j = (0, i.useRef)(null),
        [y, S] = (0, i.useState)(void 0),
        [b, w] = (0, i.useState)(!1);
      return (
        (0, i.useEffect)(() => {
          if (m.current && j.current) {
            let e = m.current.getTotalLength();
            (j.current.getComputedTextLength() > e ? S(e) : S(void 0), w(!0));
          }
        }, [e, t, c, u]),
        (0, o.L)(
          () => {
            let e = l.os.timeline({
              repeat: -1,
              defaults: { ease: "none", duration: a },
            });
            (e.fromTo(
              v.current,
              { attr: { startOffset: "0%" } },
              { attr: { startOffset: s ? "-100%" : "100%" } },
              0,
            ),
              e.fromTo(
                g.current,
                { attr: { startOffset: s ? "100%" : "-100%" } },
                { attr: { startOffset: "0%" } },
                0,
              ));
          },
          { scope: x, dependencies: [s, a] },
        ),
        (0, r.jsx)("div", {
          ref: x,
          className: `w-full h-full flex items-center justify-center ${n}`,
          children: (0, r.jsxs)("svg", {
            viewBox: d,
            xmlns: "http://www.w3.org/2000/svg",
            className:
              "w-full h-full max-h-60 [&_text]:fill-current [&_text]:font-sans [&_text]:font-medium [&_path]:fill-none [&_path]:stroke-none",
            style: { transform: `scale(${f})` },
            children: [
              (0, r.jsx)("defs", {
                children: (0, r.jsx)("path", { ref: m, id: h, d: t }),
              }),
              (0, r.jsx)("text", {
                ref: j,
                fill: "none",
                stroke: "none",
                visibility: "hidden",
                fontFamily: "sans-serif",
                fontWeight: "500",
                fontSize: c,
                letterSpacing: u,
                "aria-hidden": "true",
                children: e,
              }),
              (0, r.jsxs)("text", {
                fill: "currentColor",
                fontFamily: "sans-serif",
                fontWeight: "500",
                fontSize: c,
                letterSpacing: u,
                style: { opacity: +!!b },
                children: [
                  (0, r.jsx)("textPath", {
                    ref: v,
                    href: `#${h}`,
                    startOffset: "0%",
                    textLength: y,
                    lengthAdjust: "spacingAndGlyphs",
                    children: e,
                  }),
                  (0, r.jsx)("textPath", {
                    ref: g,
                    href: `#${h}`,
                    startOffset: s ? "100%" : "-100%",
                    textLength: y,
                    lengthAdjust: "spacingAndGlyphs",
                    children: e,
                  }),
                ],
              }),
            ],
          }),
        })
      );
    };
    c.displayName = "TextPath";
    let u = {
        ellipse: {
          path: "M227 120C227 142.091 178.871 160 119.5 160C60.1294 160 12 142.091 12 120C12 97.9086 60.1294 80 119.5 80C178.871 80 227 97.9086 227 120Z",
          viewBox: "0 0 240 240",
        },
        circle: {
          path: "M120,20 a100,100 0 1,0 0,200 a100,100 0 1,0 0,-200",
          viewBox: "0 0 240 240",
        },
        wave: {
          path: "M10,120 Q100,80 190,120 T370,120 T550,120 T730,120 T910,120 T1090,120 T1270,120",
          viewBox: "0 0 1200 240",
        },
      },
      d = () => {
        let [e, t] = (0, s.I)(),
          [n, l] = (0, i.useState)(
            "lorem ipsum dolor sit amet consectetur adipiscing elit sed do",
          ),
          [o, d] = (0, i.useState)(21),
          [f, p] = (0, i.useState)(!0),
          [h, x] = (0, i.useState)(50),
          [m, v] = (0, i.useState)(0),
          [g, j] = (0, i.useState)("wave"),
          [y, S] = (0, i.useState)(1),
          b = u[g];
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(a.Bg, {}),
            (0, r.jsxs)(a.VX, {
              children: [
                (0, r.jsxs)(a.Ec, {
                  children: [
                    (0, r.jsx)(a.Ch, {
                      onRefresh: t,
                      children: (0, r.jsx)("div", {
                        className:
                          "w-full h-[400px] flex items-center justify-center",
                        children: (0, r.jsx)(
                          c,
                          {
                            text: n,
                            path: b.path,
                            viewBox: b.viewBox,
                            duration: o,
                            reversed: f,
                            fontSize: `${h}px`,
                            letterSpacing: 0 === m ? "normal" : `${m}px`,
                            pathScale: y,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(a.IH, {
                      children: [
                        (0, r.jsx)(a.UD, {
                          title: "Text",
                          value: n,
                          onChange: (e) => {
                            (l(e), t());
                          },
                          placeholder: "Enter text to animate",
                        }),
                        (0, r.jsx)(a.yt, {
                          title: "Font Size",
                          value: h,
                          onChange: (e) => {
                            (x(e), t());
                          },
                          min: 10,
                          max: 50,
                          step: 1,
                        }),
                        (0, r.jsx)(a.yt, {
                          title: "Letter Spacing",
                          value: m,
                          onChange: (e) => {
                            (v(e), t());
                          },
                          min: -2,
                          max: 5,
                          step: 0.5,
                        }),
                        (0, r.jsx)(a.bg, {
                          title: "Path Example",
                          value: g,
                          options: [
                            { label: "Ellipse", value: "ellipse" },
                            { label: "Circle", value: "circle" },
                            { label: "Wave", value: "wave" },
                          ],
                          onChange: (e) => {
                            (j(e),
                              "circle" === e ? x(23) : "ellipse" === e && x(17),
                              t());
                          },
                        }),
                        (0, r.jsx)(a.yt, {
                          title: "Path Scale",
                          value: y,
                          onChange: (e) => {
                            (S(e), t());
                          },
                          min: 0.5,
                          max: 2,
                          step: 0.1,
                        }),
                        (0, r.jsx)(a.yt, {
                          title: "Duration",
                          value: o,
                          onChange: (e) => {
                            (d(e), t());
                          },
                          min: 5,
                          max: 60,
                          step: 1,
                        }),
                        (0, r.jsx)(a.tl, {
                          title: "Reversed",
                          checked: f,
                          onChange: (e) => {
                            (p(e), t());
                          },
                        }),
                      ],
                    }),
                    (0, r.jsx)(a.Ub, {
                      data: [
                        {
                          name: "text",
                          type: "string",
                          default: '"Your text goes here"',
                          description:
                            "The text content to animate along the path.",
                        },
                        {
                          name: "path",
                          type: "string",
                          default: '""',
                          description:
                            "SVG path data string (the 'd' attribute value). The text will animate along this path.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the container.",
                        },
                        {
                          name: "duration",
                          type: "number",
                          default: "21",
                          description:
                            "Animation duration in seconds for one complete loop around the path.",
                        },
                        {
                          name: "reversed",
                          type: "boolean",
                          default: "false",
                          description:
                            "Reverse the animation direction. When true, text moves counterclockwise.",
                        },
                        {
                          name: "fontSize",
                          type: "string",
                          default: '"17px"',
                          description:
                            "Font size for the text. Accepts any valid CSS font-size value.",
                        },
                        {
                          name: "letterSpacing",
                          type: "string",
                          default: '"normal"',
                          description:
                            "Letter spacing for the text. Accepts any valid CSS letter-spacing value.",
                        },
                        {
                          name: "viewBox",
                          type: "string",
                          default: '"0 0 240 240"',
                          description:
                            "SVG viewBox attribute. Adjust to match your path dimensions for proper rendering.",
                        },
                        {
                          name: "pathScale",
                          type: "number",
                          default: "1",
                          description:
                            "Scale factor for the entire path. Values > 1 make it larger, < 1 make it smaller.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, r.jsx)(a.lT, { children: (0, r.jsx)(a.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
