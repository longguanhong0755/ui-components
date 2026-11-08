/* ReactBits Pro public preview module 87066 for blur-highlight.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/87066.3865e73bdb35d039.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  87066: (e, t, i) => {
    "use strict";
    (i.r(t), i.d(t, { default: () => h }));
    var n = i(95155),
      a = i(12115),
      r = i(30701),
      l = i(56388),
      s = i(90761),
      o = i(81106),
      u = i(39551);
    i(89846);
    let c = a.forwardRef(
      (
        {
          children: e,
          highlightedBits: t = [],
          highlightColor: i = "hsl(80, 100%, 50%)",
          highlightClassName: r = "",
          blurAmount: l = 8,
          inactiveOpacity: s = 0.3,
          blurDelay: c = 0,
          blurDuration: h = 0.8,
          highlightDelay: d = 0.4,
          highlightDuration: g = 1,
          highlightDirection: m = "left",
          viewportOptions: p = { once: !1, amount: 0.5 },
          className: f = "",
        },
        x,
      ) => {
        let b = (0, a.useRef)(null),
          [y, v] = (0, a.useState)(!1),
          j = (0, o.W)(b, { ...p, margin: "-20%" }),
          C = y || j;
        a.useImperativeHandle(x, () => ({
          trigger: () => v(!0),
          reset: () => v(!1),
        }));
        let w = (0, a.useMemo)(() => {
            let i =
              "string" == typeof e
                ? e
                : a.Children.toArray(e)
                    .map((e) => {
                      if ("string" == typeof e) return e;
                      if (a.isValidElement(e)) {
                        let t = e.props;
                        if (t.children)
                          return "string" == typeof t.children
                            ? t.children
                            : "";
                      }
                      return "";
                    })
                    .join(" ");
            if (!i || 0 === t.length)
              return { parts: [{ text: i, highlight: !1 }] };
            let n = t.map((e) =>
                "string" == typeof e ? { text: e, occurrence: void 0 } : e,
              ),
              r = [];
            (n.forEach((e) => {
              let t = e.text,
                n = 0,
                a = 0;
              for (; n < i.length;) {
                let l = i.indexOf(t, n);
                if (-1 === l) break;
                (a++,
                  (void 0 === e.occurrence || e.occurrence === a) &&
                    r.push({
                      start: l,
                      end: l + t.length,
                      text: t,
                      occurrence: a,
                    }),
                  (n = l + 1));
              }
            }),
              r.sort((e, t) => e.start - t.start));
            let l = [],
              s = 0;
            return (
              r.forEach((e, t) => {
                (e.start > s &&
                  l.push({ text: i.slice(s, e.start), highlight: !1 }),
                  t > 0 && e.start < r[t - 1].end
                    ? e.end > r[t - 1].end &&
                      (l.push({
                        text: i.slice(r[t - 1].end, e.end),
                        highlight: !0,
                      }),
                      (s = e.end))
                    : (l.push({ text: i.slice(e.start, e.end), highlight: !0 }),
                      (s = e.end)));
              }),
              s < i.length && l.push({ text: i.slice(s), highlight: !1 }),
              { parts: l }
            );
          }, [e, t]),
          k = (() => {
            switch (m) {
              case "left":
              default:
                return {
                  initial: "0% 100%",
                  animated: "100% 100%",
                  position: "0% 0%",
                };
              case "right":
                return {
                  initial: "0% 100%",
                  animated: "100% 100%",
                  position: "100% 0%",
                };
              case "top":
                return {
                  initial: "100% 0%",
                  animated: "100% 100%",
                  position: "0% 0%",
                };
              case "bottom":
                return {
                  initial: "100% 0%",
                  animated: "100% 100%",
                  position: "0% 100%",
                };
            }
          })(),
          D = { type: "spring", duration: g, delay: d, bounce: 0 };
        return (0, n.jsx)(u.P.span, {
          ref: b,
          style: { display: "block" },
          initial: { opacity: 0, filter: `blur(${l}px)` },
          animate: C
            ? { opacity: 1, filter: "blur(0px)" }
            : { opacity: s, filter: `blur(${0.75 * l}px)` },
          transition: {
            duration: h,
            delay: C ? c : 0,
            ease: [0.25, 0.1, 0.25, 1],
          },
          className: `blur-highlight-container ${f}`,
          children: w.parts.map((e, t) =>
            e.highlight
              ? (0, n.jsx)(
                  ({ children: e }) => {
                    let t = (0, a.useRef)(null),
                      l = (0, o.W)(t, { once: !1, initial: !1, amount: 0.1 }),
                      s = {
                        backgroundImage: `linear-gradient(${i}, ${i})`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: k.position,
                        backgroundSize: l ? k.animated : k.initial,
                        boxDecorationBreak: "clone",
                        WebkitBoxDecorationBreak: "clone",
                      };
                    return (0, n.jsx)("span", {
                      ref: t,
                      className: "highlight-text-wrapper",
                      children: (0, n.jsx)(u.P.span, {
                        className: `highlight-text-content ${r}`,
                        style: s,
                        animate: { backgroundSize: l ? k.animated : k.initial },
                        initial: { backgroundSize: k.initial },
                        transition: D,
                        children: e,
                      }),
                    });
                  },
                  { children: e.text },
                  t,
                )
              : (0, n.jsx)(a.Fragment, { children: e.text }, t),
          ),
        });
      },
    );
    c.displayName = "BlurHighlight";
    let h = () => {
      let [e, t] = (0, s.I)(),
        { resolvedTheme: i } = (0, r.D)(),
        [o, u] = (0, a.useState)(8),
        [h, d] = (0, a.useState)(0.3),
        [g, m] = (0, a.useState)(0),
        [p, f] = (0, a.useState)(0.8),
        [x, b] = (0, a.useState)("#FF9FFC"),
        [y, v] = (0, a.useState)("#7C3AED"),
        j = (0, a.useMemo)(() => ("dark" === i ? y : x), [i, x, y]),
        [C, w] = (0, a.useState)(0.4),
        [k, D] = (0, a.useState)(1),
        [S, N] = (0, a.useState)("left"),
        [B, E] = (0, a.useState)(!1);
      return (0, n.jsxs)("div", {
        children: [
          (0, n.jsx)(l.Bg, {}),
          (0, n.jsxs)(l.VX, {
            children: [
              (0, n.jsxs)(l.Ec, {
                children: [
                  (0, n.jsx)(l.Ch, {
                    onRefresh: t,
                    children: (0, n.jsx)("div", {
                      className:
                        "min-h-[400px] flex items-center justify-center p-8",
                      children: (0, n.jsx)(
                        c,
                        {
                          blurAmount: o,
                          inactiveOpacity: h,
                          blurDelay: g,
                          blurDuration: p,
                          highlightColor: j,
                          highlightClassName: "py-.5 px-1 rounded-[5px]",
                          highlightDelay: C,
                          highlightDuration: k,
                          highlightDirection: S,
                          highlightedBits: [
                            "cutting-edge technology",
                            "analyze data",
                            "real-time insights",
                            "predictive analytics",
                          ],
                          viewportOptions: { once: B, amount: 0.5 },
                          className: "max-w-xl text-2xl",
                          children: (0, n.jsx)("p", {
                            className: "text-lg leading-loose",
                            children:
                              "Our cutting-edge technology transforms how businesses analyze data and make decisions. From real-time insights to predictive analytics, we deliver solutions that drive growth and innovation.",
                          }),
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, n.jsxs)(l.IH, {
                    children: [
                      (0, n.jsx)(l.bg, {
                        title: "Highlight Direction",
                        value: S,
                        onChange: (e) => {
                          (N(e), t());
                        },
                        options: [
                          { value: "left", label: "Left to Right" },
                          { value: "right", label: "Right to Left" },
                          { value: "top", label: "Top to Bottom" },
                          { value: "bottom", label: "Bottom to Top" },
                        ],
                      }),
                      (0, n.jsx)(l.W7, {
                        title: "Highlight Color (Light)",
                        value: x,
                        onChange: (e) => {
                          (b(e), t());
                        },
                      }),
                      (0, n.jsx)(l.W7, {
                        title: "Highlight Color (Dark)",
                        value: y,
                        onChange: (e) => {
                          (v(e), t());
                        },
                      }),
                      (0, n.jsx)(l.yt, {
                        title: "Highlight Delay",
                        value: C,
                        onChange: (e) => {
                          (w(e), t());
                        },
                        min: 0,
                        max: 2,
                        step: 0.1,
                        valueUnit: "s",
                      }),
                      (0, n.jsx)(l.yt, {
                        title: "Highlight Duration",
                        value: k,
                        onChange: (e) => {
                          (D(e), t());
                        },
                        min: 0.1,
                        max: 3,
                        step: 0.1,
                        valueUnit: "s",
                      }),
                      (0, n.jsx)(l.yt, {
                        title: "Blur Amount",
                        value: o,
                        onChange: (e) => {
                          (u(e), t());
                        },
                        min: 0,
                        max: 20,
                        step: 1,
                        valueUnit: "px",
                      }),
                      (0, n.jsx)(l.yt, {
                        title: "Inactive Opacity",
                        value: h,
                        onChange: (e) => {
                          (d(e), t());
                        },
                        min: 0,
                        max: 1,
                        step: 0.1,
                      }),
                      (0, n.jsx)(l.yt, {
                        title: "Blur Delay",
                        value: g,
                        onChange: (e) => {
                          (m(e), t());
                        },
                        min: 0,
                        max: 2,
                        step: 0.1,
                        valueUnit: "s",
                      }),
                      (0, n.jsx)(l.yt, {
                        title: "Blur Duration",
                        value: p,
                        onChange: (e) => {
                          (f(e), t());
                        },
                        min: 0.1,
                        max: 3,
                        step: 0.1,
                        valueUnit: "s",
                      }),
                      (0, n.jsx)(l.tl, {
                        title: "Animate Once",
                        checked: B,
                        onChange: (e) => {
                          (E(e), t());
                        },
                      }),
                    ],
                  }),
                  (0, n.jsx)(l.Ub, {
                    data: [
                      {
                        name: "children",
                        type: "React.ReactNode",
                        default: "-",
                        description: "Text content to display",
                      },
                      {
                        name: "highlightedBits",
                        type: "(string | HighlightBit)[]",
                        default: "[]",
                        description:
                          "Array of text strings or objects to highlight. Use string for all occurrences, or { text: string, occurrence: number } for specific ones.",
                      },
                      {
                        name: "highlightColor",
                        type: "string",
                        default: '"hsl(80, 100%, 50%)"',
                        description:
                          "Color for highlighted text (any CSS color)",
                      },
                      {
                        name: "highlightClassName",
                        type: "string",
                        default: '""',
                        description:
                          "Additional class name for highlighted text elements",
                      },
                      {
                        name: "blurAmount",
                        type: "number",
                        default: "8",
                        description: "Initial blur amount in pixels",
                      },
                      {
                        name: "inactiveOpacity",
                        type: "number",
                        default: "0.3",
                        description: "Opacity when not in view",
                      },
                      {
                        name: "blurDelay",
                        type: "number",
                        default: "0",
                        description: "Blur animation delay in seconds",
                      },
                      {
                        name: "blurDuration",
                        type: "number",
                        default: "0.8",
                        description: "Blur animation duration in seconds",
                      },
                      {
                        name: "highlightDelay",
                        type: "number",
                        default: "0.4",
                        description: "Highlight animation delay in seconds",
                      },
                      {
                        name: "highlightDuration",
                        type: "number",
                        default: "1",
                        description: "Highlight animation duration in seconds",
                      },
                      {
                        name: "highlightDirection",
                        type: '"left" | "right" | "top" | "bottom"',
                        default: '"left"',
                        description: "Direction of highlight animation",
                      },
                      {
                        name: "viewportOptions",
                        type: "{ once?: boolean; amount?: number }",
                        default: "{ once: false, amount: 0.5 }",
                        description:
                          "Viewport intersection observer options (margin is fixed at -20%)",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description: "Additional CSS classes",
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
