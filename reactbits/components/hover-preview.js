/* ReactBits Pro public preview module 83566 for hover-preview.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/83566.a86ac5d834b45563.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  83566: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => p }));
    var n = a(95155),
      i = a(12115),
      r = a(56388),
      l = a(90761),
      s = a(75272),
      o = a(17192),
      u = a(32923),
      d = a(39551),
      c = a(47962),
      m = a(90650);
    let g = ({
      content: e,
      targets: t,
      onTargetClick: a,
      imagePosition: r = "above",
      enterSpeed: l = 0.2,
      exitSpeed: g = 0.15,
      maxRotation: p = 12,
      maxOffset: h = 15,
      imageWidth: x = 200,
      imageHeight: f = 200,
      className: v,
      targetClassName: b,
      targetPadding: y = 4,
      imageBorderRadius: w = "0.75rem",
      showImageShadow: j = !0,
    }) => {
      let [C, S] = (0, i.useState)(null),
        [k, T] = (0, i.useState)(!1),
        U = (0, i.useRef)([]),
        N = (0, i.useRef)(null);
      (0, i.useEffect)(() => {
        t.forEach((e) => {
          new Image().src = e.imageUrl;
        });
      }, [t]);
      let I = (0, s.d)(0),
        P = (0, s.d)(0),
        E = (0, s.d)(0),
        M = (0, s.d)(0),
        R = (0, s.d)(0),
        G = (0, o.z)(I, { stiffness: 250, damping: 20 }),
        z = (0, o.z)(P, { stiffness: 250, damping: 20 }),
        A = (0, o.z)(E, { stiffness: 150, damping: 15 }),
        B = (0, o.z)(M, { stiffness: 150, damping: 15 }),
        H = (0, o.z)(R, { stiffness: 150, damping: 15 }),
        O = (0, u.G)(() => {
          let e = G.get(),
            t = B.get();
          switch (r) {
            case "left":
              return e - x - 24 + t;
            case "right":
              return e + 24 + t;
            default:
              return e - x / 2 + t;
          }
        }),
        F = (0, u.G)(() => {
          let e = z.get(),
            t = H.get();
          switch (r) {
            case "above":
              return e - f - 24 + t;
            case "below":
              return e + 24 + t;
            default:
              return e - f / 2 + t;
          }
        }),
        X = (0, i.useCallback)(
          (e, t) => {
            (N.current && (clearTimeout(N.current), (N.current = null)),
              k ||
                (I.jump(t.clientX),
                P.jump(t.clientY),
                G.jump(t.clientX),
                z.jump(t.clientY),
                E.jump(0),
                A.jump(0),
                M.jump(0),
                B.jump(0),
                R.jump(0),
                H.jump(0)),
              S(e),
              T(!0));
          },
          [k, I, P, G, z, E, A, M, B, R, H],
        ),
        L = (0, i.useCallback)(
          (e, t) => {
            if (C !== e) return;
            let a = t.clientX,
              n = t.clientY;
            (I.set(a), P.set(n));
            let i = t.currentTarget.getBoundingClientRect(),
              r = i.left + i.width / 2,
              l = i.top + i.height / 2,
              s = a - r,
              o = n - l,
              u = Math.max(-p, Math.min(p, (s / i.width) * p * 2)),
              d = Math.max(-h, Math.min(h, (s / i.width) * h * 2)),
              c = Math.max(-h, Math.min(h, (o / i.height) * h * 2));
            (E.set(u), M.set(d), R.set(c));
          },
          [C, p, h, I, P, E, M, R],
        ),
        W = (0, i.useCallback)(() => {
          N.current = setTimeout(() => {
            (S(null), T(!1));
          }, 50);
        }, []),
        $ = (0, i.useCallback)(
          (e, t) => {
            a
              ? a(e, t)
              : e.linkUrl &&
                window.open(e.linkUrl, "_blank", "noopener,noreferrer");
          },
          [a],
        );
      return (0, n.jsxs)("div", {
        className: (0, m.cn)("relative", v),
        children: [
          (() => {
            let a,
              i = [],
              r = 0,
              l = /\{(\d+)\}/g;
            for (; null !== (a = l.exec(e));) {
              let l = parseInt(a[1], 10);
              if ((a.index > r && i.push(e.slice(r, a.index)), t[l])) {
                let e = t[l];
                i.push(
                  (0, n.jsx)(
                    "span",
                    {
                      ref: (e) => {
                        U.current[l] = e;
                      },
                      onMouseEnter: (e) => X(l, e),
                      onMouseMove: (e) => L(l, e),
                      onMouseLeave: W,
                      onClick: () => $(e, l),
                      className: (0, m.cn)(
                        "relative cursor-pointer transition-colors",
                        b,
                      ),
                      style: { padding: `${y}px`, margin: `-${y}px` },
                      children: e.text,
                    },
                    `target-${l}`,
                  ),
                );
              }
              r = a.index + a[0].length;
            }
            return (r < e.length && i.push(e.slice(r)), i);
          })(),
          (0, n.jsx)(d.P.div, {
            initial: { opacity: 0, scale: 0.85 },
            animate: { opacity: +!!k, scale: k ? 1 : 0.85 },
            transition: { duration: k ? l : g, ease: k ? "easeOut" : "easeIn" },
            style: {
              position: "fixed",
              left: 0,
              top: 0,
              x: O,
              y: F,
              width: x,
              height: f,
              rotate: A,
              pointerEvents: "none",
              zIndex: 9999,
              willChange: "transform, opacity",
            },
            children: (0, n.jsx)(c.N, {
              mode: "popLayout",
              initial: !1,
              children:
                null !== C &&
                t[C] &&
                (0, n.jsx)(
                  d.P.div,
                  {
                    initial: { opacity: 0, scale: 0.95 },
                    animate: { opacity: 1, scale: 1 },
                    exit: { opacity: 0, scale: 0.95 },
                    transition: { duration: 0.2, ease: "easeInOut" },
                    className: "absolute top-0 left-0 w-full h-full",
                    children: (0, n.jsx)("img", {
                      src: t[C].imageUrl,
                      alt: t[C].altText || t[C].text,
                      width: x,
                      height: f,
                      className: (0, m.cn)("object-cover", j && "shadow-2xl"),
                      style: { borderRadius: w, width: x, height: f },
                    }),
                  },
                  `image-${C}`,
                ),
            }),
          }),
        ],
      });
    };
    g.displayName = "HoverPreview";
    let p = () => {
      let [e, t] = (0, l.I)(),
        [a, s] = (0, i.useState)("above"),
        [o, u] = (0, i.useState)(12),
        [d, c] = (0, i.useState)(15),
        [m, p] = (0, i.useState)(200),
        [h, x] = (0, i.useState)(200),
        [f, v] = (0, i.useState)(!0),
        [b, y] = (0, i.useState)("0.75rem"),
        [w, j] = (0, i.useState)(0.2),
        [C, S] = (0, i.useState)(0.15),
        [k, T] = (0, i.useState)(4);
      return (0, n.jsxs)("div", {
        children: [
          (0, n.jsx)(r.Bg, {}),
          (0, n.jsxs)(r.VX, {
            children: [
              (0, n.jsxs)(r.Ec, {
                children: [
                  (0, n.jsx)(r.Ch, {
                    onRefresh: t,
                    children: (0, n.jsx)("div", {
                      className:
                        "w-full mx-auto text-center flex items-center justify-center",
                      children: (0, n.jsx)(
                        g,
                        {
                          content:
                            "Built with {0}, {1}, and brought to life with {2}.",
                          targets: [
                            {
                              text: "React",
                              imageUrl:
                                "https://avatars.githubusercontent.com/u/6412038?s=200&v=4",
                              linkUrl: "https://react.dev",
                              altText: "React logo visualization",
                            },
                            {
                              text: "TypeScript",
                              imageUrl:
                                "https://www.typescriptlang.org/icons/icon-512x512.png",
                              linkUrl: "https://www.typescriptlang.org",
                              altText: "TypeScript code",
                            },
                            {
                              text: "Motion",
                              imageUrl:
                                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPznwv7OeqDgGjrlZfT28XyX4J9oJyZ9TYwg&s",
                              linkUrl: "https://www.framer.com/motion",
                              altText: "Animation concept",
                            },
                          ],
                          onTargetClick: (e, t) => {
                            console.log(`Clicked target ${t}:`, e.text);
                          },
                          imagePosition: a,
                          enterSpeed: w,
                          exitSpeed: C,
                          targetPadding: k,
                          maxRotation: o,
                          maxOffset: d,
                          imageWidth: m,
                          imageHeight: h,
                          showImageShadow: f,
                          imageBorderRadius: b,
                          className:
                            "text-4xl max-w-[25ch] text-center tracking-tight leading-relaxed text-gray-800 dark:text-gray-200",
                          targetClassName: "font-medium text-[#FF9FFC]",
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, n.jsxs)(r.IH, {
                    children: [
                      (0, n.jsx)(r.bg, {
                        title: "Image Position",
                        value: a,
                        onChange: (e) => s(e),
                        options: [
                          { value: "above", label: "Above" },
                          { value: "below", label: "Below" },
                          { value: "left", label: "Left" },
                          { value: "right", label: "Right" },
                        ],
                      }),
                      (0, n.jsx)(r.yt, {
                        title: "Enter Speed",
                        value: w,
                        onChange: j,
                        min: 0.05,
                        max: 0.8,
                        step: 0.05,
                        valueUnit: "s",
                      }),
                      (0, n.jsx)(r.yt, {
                        title: "Exit Speed",
                        value: C,
                        onChange: S,
                        min: 0.05,
                        max: 0.8,
                        step: 0.05,
                        valueUnit: "s",
                      }),
                      (0, n.jsx)(r.yt, {
                        title: "Max Rotation",
                        value: o,
                        onChange: u,
                        min: 0,
                        max: 30,
                        step: 1,
                        valueUnit: "\xb0",
                      }),
                      (0, n.jsx)(r.yt, {
                        title: "Max Offset",
                        value: d,
                        onChange: c,
                        min: 0,
                        max: 40,
                        step: 1,
                        valueUnit: "px",
                      }),
                      (0, n.jsx)(r.yt, {
                        title: "Image Width",
                        value: m,
                        onChange: p,
                        min: 100,
                        max: 400,
                        step: 10,
                        valueUnit: "px",
                      }),
                      (0, n.jsx)(r.yt, {
                        title: "Image Height",
                        value: h,
                        onChange: x,
                        min: 100,
                        max: 400,
                        step: 10,
                        valueUnit: "px",
                      }),
                      (0, n.jsx)(r.bg, {
                        title: "Border Radius",
                        value: b,
                        onChange: y,
                        options: [
                          { value: "0", label: "None" },
                          { value: "0.375rem", label: "Small" },
                          { value: "0.75rem", label: "Medium" },
                          { value: "1.5rem", label: "Large" },
                          { value: "9999px", label: "Full" },
                        ],
                      }),
                      (0, n.jsx)(r.tl, {
                        title: "Show Shadow",
                        checked: f,
                        onChange: v,
                      }),
                      (0, n.jsx)(r.yt, {
                        title: "Target Padding",
                        value: k,
                        onChange: T,
                        min: 0,
                        max: 20,
                        step: 1,
                        valueUnit: "px",
                      }),
                    ],
                  }),
                  (0, n.jsx)(r.Ub, {
                    data: [
                      {
                        name: "content",
                        type: "string",
                        default: '""',
                        description:
                          "Text content with placeholders for targets (use {0}, {1}, etc.)",
                      },
                      {
                        name: "targets",
                        type: "HoverTarget[]",
                        default: "[]",
                        description:
                          "Array of target configurations with text, imageUrl, linkUrl, and altText",
                      },
                      {
                        name: "onTargetClick",
                        type: "(target: HoverTarget, index: number) => void",
                        default: "undefined",
                        description:
                          "Callback when a target is clicked. If not provided and linkUrl exists, opens link in new tab",
                      },
                      {
                        name: "imagePosition",
                        type: '"above" | "below" | "left" | "right"',
                        default: '"above"',
                        description:
                          "Position of the image relative to the target text",
                      },
                      {
                        name: "enterSpeed",
                        type: "number",
                        default: "0.2",
                        description: "Enter animation duration in seconds",
                      },
                      {
                        name: "exitSpeed",
                        type: "number",
                        default: "0.15",
                        description: "Exit animation duration in seconds",
                      },
                      {
                        name: "maxRotation",
                        type: "number",
                        default: "12",
                        description:
                          "Maximum rotation angle for the image (in degrees)",
                      },
                      {
                        name: "maxOffset",
                        type: "number",
                        default: "15",
                        description:
                          "Maximum offset for image movement (in pixels)",
                      },
                      {
                        name: "imageWidth",
                        type: "number",
                        default: "200",
                        description: "Image width in pixels",
                      },
                      {
                        name: "imageHeight",
                        type: "number",
                        default: "200",
                        description: "Image height in pixels",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description: "Additional CSS classes for the container",
                      },
                      {
                        name: "targetClassName",
                        type: "string",
                        default: '""',
                        description: "Additional CSS classes for target text",
                      },
                      {
                        name: "targetPadding",
                        type: "number",
                        default: "4",
                        description:
                          "Padding around target text to expand hover area (in pixels)",
                      },
                      {
                        name: "imageBorderRadius",
                        type: "string",
                        default: '"0.75rem"',
                        description: "Image border radius (CSS value)",
                      },
                      {
                        name: "showImageShadow",
                        type: "boolean",
                        default: "true",
                        description: "Show shadow on image preview",
                      },
                    ],
                  }),
                ],
              }),
              (0, n.jsx)(r.lT, { children: (0, n.jsx)(r.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
