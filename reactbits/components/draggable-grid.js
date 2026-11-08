/* ReactBits Pro public preview module 84584 for draggable-grid.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/84584.6e366b040232c71c.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  84584: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => h }));
    var r = n(95155),
      i = n(12115),
      a = n(56388),
      s = n(90761),
      o = n(82637),
      l = n(70784),
      u = n(95102),
      c = n(55783),
      d = n(90650);
    o.Ay.registerPlugin(l.s, u.w6);
    let m = ({
        items: e,
        columns: t = 10,
        enableDrag: n = !0,
        enableWheel: a = !0,
        edgeResistance: s = 0.9,
        introDuration: u = 1.2,
        onItemClick: m,
        className: h = "",
        gridClassName: f = "",
        itemClassName: g = "",
        boundsPadding: p = { x: 200, y: 100 },
        containerMode: x = "absolute",
        scale: b = 1,
        gap: w = 5,
        wheelSmoothing: y = 0.3,
      }) => {
        let v = (0, i.useRef)(null),
          C = (0, i.useRef)(null),
          [j, S] = (0, i.useState)(!1),
          [E, A] = (0, i.useState)(!1),
          N = (0, i.useRef)(null),
          I = (0, i.useRef)(null),
          k = (0, i.useRef)(!1),
          D = i.useMemo(() => {
            let n = Array.from({ length: t }, () => []);
            return (
              e.forEach((e, r) => {
                n[r % t].push(e);
              }),
              n
            );
          }, [e, t]),
          P = (0, i.useCallback)(
            () =>
              "fixed" === x
                ? { width: window.innerWidth, height: window.innerHeight }
                : {
                    width: v.current?.offsetWidth || window.innerWidth,
                    height: v.current?.offsetHeight || window.innerHeight,
                  },
            [x],
          );
        ((0, c.L)(
          () => {
            v.current &&
              C.current &&
              !k.current &&
              requestAnimationFrame(() => {
                if (!v.current || !C.current) return;
                k.current = !0;
                let e = C.current.querySelectorAll(".product > div");
                if (0 === e.length) return;
                let t = C.current.offsetWidth,
                  r = C.current.offsetHeight,
                  { width: i, height: a } = P();
                o.Ay.set(C.current, { x: (i - t) / 2, y: (a - r) / 2 });
                let c = o.Ay.timeline();
                (c.set(v.current, { scale: 1.5 }),
                  c.set(e, { scale: 1, opacity: 0 }),
                  c.to(e, {
                    scale: 1,
                    opacity: 1,
                    duration: 0.6,
                    ease: "power3.out",
                    stagger: { amount: u, from: "random" },
                  }),
                  c.to(v.current, {
                    scale: 1,
                    duration: u,
                    ease: "power3.inOut",
                    onComplete: () => {
                      ((() => {
                        if (!C.current || !n) return;
                        let e = C.current.offsetWidth,
                          t = C.current.offsetHeight,
                          { width: r, height: i } = P();
                        N.current = l.s.create(C.current, {
                          type: "x,y",
                          bounds: {
                            minX: -(e - r) - p.x,
                            maxX: p.x,
                            minY: -(t - i) - p.y,
                            maxY: p.y,
                          },
                          inertia: !0,
                          allowEventDefault: !0,
                          edgeResistance: s,
                          onDragStart: () => {
                            S(!0);
                          },
                          onDragEnd: () => {
                            S(!1);
                          },
                        })[0];
                      })(),
                        C.current &&
                          ((I.current = new IntersectionObserver(
                            (e) => {
                              e.forEach((e) => {
                                e.isIntersecting
                                  ? o.Ay.to(e.target, {
                                      scale: 1,
                                      opacity: 1,
                                      duration: 0.5,
                                      ease: "power2.out",
                                    })
                                  : o.Ay.to(e.target, {
                                      opacity: 0,
                                      scale: 0.5,
                                      duration: 0.5,
                                      ease: "power2.in",
                                    });
                              });
                            },
                            {
                              root: "absolute" === x ? v.current : null,
                              threshold: 0.1,
                            },
                          )),
                          C.current
                            .querySelectorAll(".product > div")
                            .forEach((e) => {
                              I.current?.observe(e);
                            })),
                        A(!0));
                    },
                  }));
              });
          },
          { scope: v, dependencies: [e.length] },
        ),
          (0, i.useEffect)(() => {
            if (!E) return;
            let e = () => {
              if (!N.current || !C.current) return;
              let e = C.current.offsetWidth,
                t = C.current.offsetHeight,
                { width: n, height: r } = P();
              N.current.vars.bounds = {
                minX: -(e - n) - p.x,
                maxX: p.x,
                minY: -(t - r) - p.y,
                maxY: p.y,
              };
            };
            return (
              window.addEventListener("resize", e),
              () => {
                window.removeEventListener("resize", e);
              }
            );
          }, [E, p, x, P]),
          (0, i.useEffect)(() => {
            if (!a || !v.current || !E) return;
            let e = v.current,
              t = (e) => {
                if (!C.current || !N.current) return;
                let t = -(7 * e.deltaX),
                  n = -(7 * e.deltaY),
                  r = o.Ay.getProperty(C.current, "x"),
                  i = o.Ay.getProperty(C.current, "y"),
                  a = N.current.vars.bounds,
                  s = Math.max(a.minX, Math.min(a.maxX, r + t)),
                  l = Math.max(a.minY, Math.min(a.maxY, i + n)),
                  u = (t > 0 && r < a.maxX) || (t < 0 && r > a.minX),
                  c = (n > 0 && i < a.maxY) || (n < 0 && i > a.minY);
                (u || c) &&
                  (e.preventDefault(),
                  o.Ay.to(C.current, {
                    x: s,
                    y: l,
                    duration: y,
                    ease: "power3.out",
                  }));
              };
            return (
              e.addEventListener("wheel", t, { passive: !1 }),
              () => {
                e.removeEventListener("wheel", t);
              }
            );
          }, [a, E, y]),
          (0, i.useEffect)(
            () => () => {
              (N.current && N.current.kill(),
                I.current && I.current.disconnect());
            },
            [],
          ));
        let R = `${18.5 * b}vw`,
          H = `${w * b}vw`,
          W = `${2 * w * b}vw`;
        return (0, r.jsx)("div", {
          ref: v,
          className: (0, d.cn)(
            "fixed" === x
              ? "fixed inset-0 w-screen h-screen"
              : "absolute inset-0 w-full h-full",
            "overflow-hidden origin-center will-change-transform",
            h,
          ),
          children: (0, r.jsx)("div", {
            ref: C,
            className: (0, d.cn)(
              "absolute w-max h-max flex will-change-transform",
              E && n && !j && "cursor-grab",
              j && "cursor-grabbing",
              f,
            ),
            style: { columnGap: H },
            children: D.map((e, n) =>
              (0, r.jsx)(
                "div",
                {
                  className: "flex flex-col",
                  style: { rowGap: H, marginTop: n % 2 == 1 ? W : "0" },
                  children: e.map((e, i) => {
                    let a = n + i * t;
                    return (0, r.jsx)(
                      "div",
                      {
                        className: (0, d.cn)(
                          "product relative aspect-square",
                          g,
                        ),
                        style: { width: R },
                        onClick: (t) => {
                          !j && (t.stopPropagation(), m?.(e, a));
                        },
                        children: (0, r.jsx)("div", {
                          className: "aspect-square will-change-transform",
                          style: { width: R },
                          "data-id": e.dataId,
                          children: (0, r.jsx)("img", {
                            src: e.image,
                            alt: e.alt || `Item ${e.id}`,
                            className:
                              "absolute w-full h-full object-cover will-change-transform transition-transform duration-300 ease-in-out hover:scale-105",
                            draggable: !1,
                          }),
                        }),
                      },
                      e.id,
                    );
                  }),
                },
                n,
              ),
            ),
          }),
        });
      },
      h = () => {
        let e,
          [t, n] = (0, s.I)(),
          [o, l] = (0, i.useState)(60),
          [u, c] = (0, i.useState)(10),
          [d, h] = (0, i.useState)(!0),
          [f, g] = (0, i.useState)(!1),
          [p, x] = (0, i.useState)(0.9),
          [b, w] = (0, i.useState)(0.5),
          [y, v] = (0, i.useState)(0.6),
          [C, j] = (0, i.useState)(6),
          [S, E] = (0, i.useState)(1),
          A = (0, i.useRef)(null),
          N = (e) => (t) => {
            (e(t), n());
          },
          I = (e) => (t) => {
            (e(t),
              A.current && clearTimeout(A.current),
              (A.current = setTimeout(() => {
                n();
              }, 500)));
          },
          k =
            ((e = [
              "/images/dog1.webp",
              "/images/dog2.webp",
              "/images/dog3.webp",
              "/images/dog4.webp",
              "/images/dog5.webp",
              "/images/dog6.webp",
              "/images/dog7.webp",
            ]),
            Array.from({ length: o }, (t, n) => {
              let r = Math.floor(
                Math.abs(43758.5453 * Math.sin(12.9898 * n)) % e.length,
              );
              return {
                id: n + 1,
                image: e[r],
                dataId: r + 1,
                alt: `Dog ${r + 1}`,
              };
            }));
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(a.Bg, {}),
            (0, r.jsxs)(a.VX, {
              children: [
                (0, r.jsxs)(a.Ec, {
                  children: [
                    (0, r.jsx)(a.Ch, {
                      onRefresh: n,
                      minHeight: 700,
                      children: (0, r.jsx)(
                        m,
                        {
                          items: k,
                          columns: u,
                          enableDrag: d,
                          enableWheel: f,
                          edgeResistance: p,
                          introDuration: b,
                          scale: y,
                          gap: C,
                          wheelSmoothing: S,
                          onItemClick: (e, t) => {
                            console.log("Clicked item:", e, "at index:", t);
                          },
                        },
                        t,
                      ),
                    }),
                    (0, r.jsxs)(a.IH, {
                      children: [
                        (0, r.jsx)(a.yt, {
                          title: "Item Count",
                          value: o,
                          onChange: I(l),
                          min: 10,
                          max: 100,
                          step: 5,
                        }),
                        (0, r.jsx)(a.yt, {
                          title: "Columns",
                          value: u,
                          onChange: I(c),
                          min: 3,
                          max: 15,
                          step: 1,
                        }),
                        (0, r.jsx)(a.yt, {
                          title: "Scale",
                          value: y,
                          onChange: I(v),
                          min: 0.3,
                          max: 2,
                          step: 0.1,
                        }),
                        (0, r.jsx)(a.yt, {
                          title: "Gap (vw)",
                          value: C,
                          onChange: I(j),
                          min: 1,
                          max: 15,
                          step: 0.5,
                        }),
                        (0, r.jsx)(a.yt, {
                          title: "Edge Resistance",
                          value: p,
                          onChange: I(x),
                          min: 0,
                          max: 1,
                          step: 0.1,
                        }),
                        (0, r.jsx)(a.yt, {
                          title: "Intro Duration",
                          value: b,
                          onChange: I(w),
                          min: 0.3,
                          max: 3,
                          step: 0.1,
                        }),
                        (0, r.jsx)(a.yt, {
                          title: "Wheel Smoothing",
                          value: S,
                          onChange: I(E),
                          min: 0.1,
                          max: 1,
                          step: 0.05,
                        }),
                        (0, r.jsx)(a.tl, {
                          title: "Enable Drag",
                          checked: d,
                          onChange: N(h),
                        }),
                        (0, r.jsx)(a.tl, {
                          title: "Enable Wheel",
                          checked: f,
                          onChange: N(g),
                        }),
                      ],
                    }),
                    (0, r.jsx)(a.Ub, {
                      data: [
                        {
                          name: "items",
                          type: "GridItem[]",
                          default: "[]",
                          description:
                            "Array of items to display in the grid. Each item has id, image, dataId, and alt.",
                        },
                        {
                          name: "columns",
                          type: "number",
                          default: "10",
                          description: "Number of columns in the grid layout.",
                        },
                        {
                          name: "enableDrag",
                          type: "boolean",
                          default: "true",
                          description:
                            "Enable drag functionality to move the grid around.",
                        },
                        {
                          name: "enableWheel",
                          type: "boolean",
                          default: "true",
                          description:
                            "Enable mouse wheel scrolling to navigate the grid.",
                        },
                        {
                          name: "edgeResistance",
                          type: "number",
                          default: "0.9",
                          description:
                            "Edge resistance when dragging (0-1). Higher values provide more resistance.",
                        },
                        {
                          name: "introDuration",
                          type: "number",
                          default: "1.2",
                          description:
                            "Duration of the intro animation in seconds.",
                        },
                        {
                          name: "onItemClick",
                          type: "(item: GridItem, index: number) => void",
                          default: "undefined",
                          description:
                            "Callback function when an item is clicked.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the main container.",
                        },
                        {
                          name: "gridClassName",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the grid container.",
                        },
                        {
                          name: "itemClassName",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for individual grid items.",
                        },
                        {
                          name: "boundsPadding",
                          type: "{ x: number; y: number }",
                          default: "{ x: 200, y: 100 }",
                          description: "Padding in pixels for drag bounds.",
                        },
                        {
                          name: "containerMode",
                          type: '"fixed" | "absolute"',
                          default: '"absolute"',
                          description:
                            "Container positioning mode. 'fixed' for full viewport overlay, 'absolute' for contained layout.",
                        },
                        {
                          name: "scale",
                          type: "number",
                          default: "1",
                          description:
                            "Scale factor for the entire grid. 0.5 = half size, 2 = double size.",
                        },
                        {
                          name: "gap",
                          type: "number",
                          default: "5",
                          description:
                            "Gap between items in viewport width units (vw).",
                        },
                        {
                          name: "wheelSmoothing",
                          type: "number",
                          default: "0.3",
                          description:
                            "Wheel scroll smoothing duration in seconds (0.1-1.0). Higher values create smoother, slower scrolling.",
                        },
                      ],
                    }),
                    (0, r.jsx)("p", {
                      className: "text-sm text-muted-foreground mt-4",
                      children:
                        "Demo images from thiings.co, not part of the React Bits Pro offer.",
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
