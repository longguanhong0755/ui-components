/* ReactBits Pro public preview module 919 for tile-reveal.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/919.433072053c4b29c6.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  919: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => g }));
    var r = a(95155),
      i = a(12115),
      l = a(39551),
      n = a(56388),
      s = a(45949),
      o = a(90761),
      c = a(90650);
    let d = (e, t, a) => (e < t ? t : e > a ? a : e),
      p = (e, t) =>
        e < 0.5
          ? Math.pow(2, t - 1) * Math.pow(e, t)
          : 1 - Math.pow(-2 * e + 2, t) / 2,
      u = ({
        images: e,
        headline: t,
        children: a,
        columns: l = 3,
        gap: n = 28,
        gridWidth: s = 720,
        tileAspect: o = 1,
        tileRadius: u = 0,
        grayscale: m = !1,
        direction: h = "alternate",
        stagger: g = 0.06,
        overlap: b = 0.6,
        zoom: f = 2.05,
        spread: v = 0.4,
        scrollLength: x = 3,
        scrub: y = 0.08,
        contentGap: w = 28,
        backgroundColor: k = "transparent",
        onProgress: S,
        className: j,
        style: C,
      }) => {
        let R = (() => {
            let [e, t] = (0, i.useState)(!1);
            return (
              (0, i.useEffect)(() => {
                let e = window.matchMedia("(prefers-reduced-motion: reduce)"),
                  a = () => t(e.matches);
                return (
                  a(),
                  e.addEventListener("change", a),
                  () => e.removeEventListener("change", a)
                );
              }, []),
              e
            );
          })(),
          M = (0, i.useRef)(null),
          E = (0, i.useRef)(null),
          N = (0, i.useRef)(null),
          L = (0, i.useRef)([]),
          T = (0, i.useRef)(null),
          P = (0, i.useRef)(null),
          W = (0, i.useRef)(0),
          $ = (0, i.useRef)(0),
          B = (0, i.useRef)(0),
          F = (0, i.useRef)(!1),
          O = (0, i.useRef)(0),
          I = (0, i.useRef)(0),
          A = (0, i.useRef)(0),
          z = (0, i.useRef)(0),
          G = (0, i.useRef)(0),
          U = Math.max(1, Math.round(l)),
          D = e.length,
          H = (0, i.useMemo)(() => {
            let e = (U - 1) / 2,
              t = Array.from({ length: U }, (e, t) =>
                Math.floor((D - t + U - 1) / U),
              ),
              a = Math.max(0, ...t),
              r = Math.max(0, (a > 0 ? 1 + (a - 1) * g : 0) - b),
              i = r + 1 - 0.32,
              l = Math.max(r + 1, i + 0.32, 0.001);
            return {
              tiles: Array.from({ length: D }, (a, r) => {
                let i = r % U,
                  l = Math.floor(r / U),
                  n = t[i],
                  s = "top" === h || ("bottom" !== h && i % 2 == 0),
                  o = 0.001 > Math.abs(i - e),
                  c = o ? 0 : Math.sign(i - e),
                  d = o ? (l < Math.floor(n / 2) ? -1 : 1) : 0;
                return {
                  start: (s ? n - 1 - l : l) * g,
                  dir: s ? -1 : 1,
                  col: i,
                  row: l,
                  lateral: c,
                  vertical: d,
                };
              }),
              rows: Math.ceil(D / U),
              mid: e,
              zoomStart: r,
              splitStart: r + 0.5,
              contentStart: i,
              total: l,
            };
          }, [U, D, h, b, g]),
          V = (0, i.useCallback)(
            (e) => {
              let t = N.current;
              if (!t) return;
              let a = e * H.total,
                r = (I.current + z.current) / 2,
                i = p(d(a - H.zoomStart, 0, 1), 3),
                l = p(d((a - H.splitStart) / 0.5, 0, 1), 1),
                s = p(d((a - H.contentStart) / 0.32, 0, 1), 2),
                c = Math.max(f, 1);
              t.style.transform = `scale(${1 + (c - 1) * i})`;
              let u = Math.max(1, (A.current - n * (U - 1)) / U),
                m = u / Math.max(o, 0.01),
                h = u + n,
                g = m + n,
                b = (H.rows - 1) / 2,
                x = (e) =>
                  Math.max(
                    v * u,
                    O.current / (2 * c) + u / 2 - Math.abs(e) + n,
                  ),
                y = (e) =>
                  Math.max(
                    v * m,
                    I.current / (2 * c) + m / 2 - Math.abs(e) + n,
                  );
              for (let e = 0; e < H.tiles.length; e++) {
                let t = L.current[e];
                if (!t) continue;
                let n = H.tiles[e],
                  s = p(d(a - n.start, 0, 1), 1),
                  o = n.dir * r * (1 - s),
                  c = n.lateral * x((n.col - H.mid) * h) * i,
                  u = n.vertical * y((n.row - b) * g) * l;
                ((t.style.transform = `translate3d(${c.toFixed(2)}px, ${(o + u).toFixed(2)}px, 0)`),
                  (t.style.visibility = s <= 0 ? "hidden" : "visible"));
              }
              let k = T.current;
              if (k) {
                let e = ((G.current + w) / 2) * (1 - s);
                k.style.transform = `translate3d(0, ${e.toFixed(2)}px, 0)`;
              }
              let j = P.current;
              (j &&
                ((j.style.opacity = s.toFixed(3)),
                (j.style.transform = `translate3d(0, ${((1 - s) * 12).toFixed(2)}px, 0)`),
                (j.style.pointerEvents = s > 0.5 ? "auto" : "none")),
                S?.(e));
            },
            [U, w, n, S, H, v, o, f],
          ),
          q = (0, i.useCallback)(() => {
            let e = M.current,
              t = E.current;
            if (!e || !t) return 0;
            let a = e.getBoundingClientRect(),
              r = a.height - t.getBoundingClientRect().height;
            return r <= 0 ? 0 : d(-a.top / r, 0, 1);
          }, []);
        (0, i.useEffect)(() => {
          if (R) return;
          let e = M.current,
            t = E.current,
            a = N.current;
          if (!e || !t || !a) return;
          let r = e.ownerDocument,
            i = r.defaultView;
          if (!i) return;
          let l = Math.max(y, 0),
            n = (e) => {
              let t = B.current || e,
                a = Math.min(0.05, Math.max(0, (e - t) / 1e3));
              B.current = e;
              let r = q(),
                s = l > 0 ? 1 - Math.exp(-a / l) : 1,
                o = W.current + (r - W.current) * s;
              ((W.current = o),
                V(o),
                Math.abs(r - o) > 4e-4
                  ? ($.current = i.requestAnimationFrame(n))
                  : ((W.current = r), V(r), (F.current = !1)));
            },
            s = () => {
              F.current ||
                ((F.current = !0),
                (B.current = 0),
                ($.current = i.requestAnimationFrame(n)));
            },
            o = () => {
              let e = t.getBoundingClientRect();
              ((O.current = e.width),
                (I.current = e.height),
                (A.current = a.offsetWidth),
                (z.current = a.offsetHeight),
                (G.current = P.current?.offsetHeight ?? 0),
                (W.current = q()),
                V(W.current));
            };
          (o(),
            i.addEventListener("scroll", s, { passive: !0 }),
            r.addEventListener("scroll", s, { passive: !0, capture: !0 }),
            i.addEventListener("resize", o),
            i.addEventListener("pageshow", o));
          let c = new ResizeObserver(o);
          return (
            c.observe(e),
            c.observe(t),
            c.observe(a),
            P.current && c.observe(P.current),
            () => {
              (i.cancelAnimationFrame($.current),
                (F.current = !1),
                i.removeEventListener("scroll", s),
                r.removeEventListener("scroll", s, { capture: !0 }),
                i.removeEventListener("resize", o),
                i.removeEventListener("pageshow", o),
                c.disconnect());
            }
          );
        }, [q, V, R, y]);
        let _ = (0, i.useMemo)(
            () => ({
              height: R
                ? void 0
                : `${((1 + Math.max(x, 0)) * 100).toFixed(2)}svh`,
              ...C,
            }),
            [R, x, C],
          ),
          K = (0, i.useMemo)(
            () => ({ aspectRatio: `${o}`, borderRadius: `${u}px` }),
            [o, u],
          ),
          X = (0, r.jsxs)("div", {
            className:
              "relative z-10 flex h-full w-full flex-col items-center justify-center text-center",
            style: { gap: `${w}px` },
            children: [
              void 0 !== t &&
                (0, r.jsx)("div", {
                  ref: T,
                  className:
                    "will-change-transform [backface-visibility:hidden]",
                  children: t,
                }),
              void 0 !== a &&
                (0, r.jsx)("div", {
                  ref: P,
                  className:
                    "will-change-transform [backface-visibility:hidden]",
                  style: R ? void 0 : { opacity: 0 },
                  children: a,
                }),
            ],
          });
        return R
          ? (0, r.jsx)("section", {
              ref: M,
              className: (0, c.cn)("relative w-full overflow-hidden", j),
              style: { ..._, height: "100svh", background: k },
              children: X,
            })
          : (0, r.jsx)("section", {
              ref: M,
              className: (0, c.cn)("relative w-full", j),
              style: _,
              children: (0, r.jsxs)("div", {
                ref: E,
                className: "sticky top-0 w-full overflow-hidden",
                style: { height: "100svh", background: k },
                children: [
                  X,
                  (0, r.jsx)("div", {
                    className:
                      "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                    style: { width: `min(${s}px, calc(100% - ${2 * n}px))` },
                    children: (0, r.jsx)("div", {
                      ref: N,
                      className: "grid will-change-transform",
                      style: {
                        gridTemplateColumns: `repeat(${U}, minmax(0, 1fr))`,
                        gap: `${n}px`,
                      },
                      children: e.map((e, t) =>
                        (0, r.jsx)(
                          "div",
                          {
                            ref: (e) => {
                              L.current[t] = e;
                            },
                            className:
                              "w-full overflow-hidden will-change-transform [backface-visibility:hidden]",
                            style: { ...K, visibility: "hidden" },
                            children: (0, r.jsx)("img", {
                              src: e,
                              alt: "",
                              draggable: !1,
                              loading: "lazy",
                              className: (0, c.cn)(
                                "h-full w-full select-none object-cover",
                                m && "grayscale",
                              ),
                            }),
                          },
                          `${e}-${t}`,
                        ),
                      ),
                    }),
                  }),
                ],
              }),
            });
      },
      m = Array.from({ length: 12 }, (e, t) => s.ag[t % s.ag.length]),
      h = () => {
        let e = (0, i.useRef)(null);
        return (
          (0, i.useEffect)(() => {
            let t = e.current;
            if (!t) return;
            let a = t.ownerDocument,
              r = a.defaultView,
              i = !!r && r !== window,
              l = a.scrollingElement ?? a.body,
              n = () => {
                t.style.opacity = i && l.scrollTop < 24 ? "1" : "0";
              };
            return (
              n(),
              a.addEventListener("scroll", n, { passive: !0 }),
              r?.addEventListener("scroll", n, { passive: !0 }),
              () => {
                (a.removeEventListener("scroll", n),
                  r?.removeEventListener("scroll", n));
              }
            );
          }, []),
          (0, r.jsx)("div", {
            className: "pointer-events-none",
            children: (0, r.jsxs)("div", {
              ref: e,
              className:
                "fixed bottom-8 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3 opacity-0 transition-opacity duration-500",
              children: [
                (0, r.jsx)("span", {
                  className:
                    "font-mono text-[10px] uppercase tracking-[0.32em] text-neutral-900/55 dark:text-white/55",
                  children: "Scroll",
                }),
                (0, r.jsx)("div", {
                  className:
                    "relative h-9 w-px overflow-hidden bg-neutral-900/15 dark:bg-white/15",
                  children: (0, r.jsx)(l.P.span, {
                    className:
                      "absolute left-0 top-0 block h-3 w-px bg-neutral-900/70 dark:bg-white/70",
                    animate: { y: [-14, 38] },
                    transition: {
                      duration: 1.7,
                      repeat: 1 / 0,
                      ease: [0.65, 0, 0.35, 1],
                    },
                  }),
                }),
              ],
            }),
          })
        );
      },
      g = () => {
        let [e, t] = (0, o.I)(),
          [a, l] = (0, i.useState)(3),
          [s, c] = (0, i.useState)(28),
          [d, p] = (0, i.useState)(720),
          [g, b] = (0, i.useState)(1),
          [f, v] = (0, i.useState)(0),
          [x, y] = (0, i.useState)(!1),
          [w, k] = (0, i.useState)("alternate"),
          [S, j] = (0, i.useState)(0.06),
          [C, R] = (0, i.useState)(0.6),
          [M, E] = (0, i.useState)(2.05),
          [N, L] = (0, i.useState)(0.4),
          [T, P] = (0, i.useState)(3),
          [W, $] = (0, i.useState)(0.08);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(n.Bg, {}),
            (0, r.jsxs)(n.VX, {
              children: [
                (0, r.jsxs)(n.Ec, {
                  children: [
                    (0, r.jsxs)(n.Ch, {
                      onRefresh: t,
                      minHeight: 620,
                      enableResponsive: !0,
                      children: [
                        (0, r.jsx)("style", {
                          children:
                            "html{scrollbar-width:none}::-webkit-scrollbar{width:0;height:0}",
                        }),
                        (0, r.jsx)(h, {}, `hint-${e}`),
                        (0, r.jsxs)(
                          u,
                          {
                            images: m,
                            columns: a,
                            gap: s,
                            gridWidth: d,
                            tileAspect: g,
                            tileRadius: f,
                            grayscale: x,
                            direction: w,
                            stagger: S,
                            overlap: C,
                            zoom: M,
                            spread: N,
                            scrollLength: T,
                            scrub: W,
                            headline: (0, r.jsxs)("h2", {
                              className:
                                "text-4xl font-medium leading-[1.1] tracking-tight text-neutral-900 dark:text-white sm:text-6xl md:text-7xl",
                              children: [
                                "Built for what",
                                (0, r.jsx)("br", {}),
                                "comes next",
                              ],
                            }),
                            children: [
                              (0, r.jsx)("p", {
                                className:
                                  "mx-auto max-w-[36ch] text-xs leading-relaxed tracking-tight text-neutral-600 dark:text-neutral-400",
                                children:
                                  "A grid that assembles on scroll, then steps aside to make room for your headline.",
                              }),
                              (0, r.jsx)("button", {
                                type: "button",
                                className:
                                  "mt-6 cursor-pointer rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900",
                                children: "Start building",
                              }),
                            ],
                          },
                          e,
                        ),
                      ],
                    }),
                    (0, r.jsxs)(n.IH, {
                      children: [
                        (0, r.jsx)(n.yt, {
                          title: "Columns",
                          min: 1,
                          max: 5,
                          step: 1,
                          value: a,
                          onChange: l,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Gap",
                          min: 0,
                          max: 80,
                          step: 1,
                          value: s,
                          onChange: c,
                          valueUnit: "px",
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Grid Width",
                          min: 300,
                          max: 1200,
                          step: 10,
                          value: d,
                          onChange: p,
                          valueUnit: "px",
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Tile Aspect",
                          min: 0.5,
                          max: 2,
                          step: 0.05,
                          value: g,
                          onChange: b,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Tile Radius",
                          min: 0,
                          max: 48,
                          step: 1,
                          value: f,
                          onChange: v,
                          valueUnit: "px",
                        }),
                        (0, r.jsx)(n.bg, {
                          title: "Direction",
                          value: w,
                          onChange: (e) => k(e),
                          options: [
                            { label: "Alternate", value: "alternate" },
                            { label: "Top", value: "top" },
                            { label: "Bottom", value: "bottom" },
                          ],
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Stagger",
                          min: 0,
                          max: 0.4,
                          step: 0.01,
                          value: S,
                          onChange: j,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Overlap",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: C,
                          onChange: R,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Zoom",
                          min: 1,
                          max: 4,
                          step: 0.05,
                          value: M,
                          onChange: E,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Spread",
                          min: 0,
                          max: 1.5,
                          step: 0.05,
                          value: N,
                          onChange: L,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Scroll Length",
                          min: 1,
                          max: 6,
                          step: 0.5,
                          value: T,
                          onChange: P,
                        }),
                        (0, r.jsx)(n.yt, {
                          title: "Scrub",
                          min: 0,
                          max: 0.6,
                          step: 0.01,
                          value: W,
                          onChange: $,
                          valueUnit: "s",
                        }),
                        (0, r.jsx)(n.tl, {
                          title: "Grayscale",
                          checked: x,
                          onChange: y,
                        }),
                      ],
                    }),
                    (0, r.jsx)(n.Ub, {
                      data: [
                        {
                          name: "images",
                          type: "string[]",
                          default: "—",
                          description:
                            "Image URLs laid out row by row into the grid.",
                        },
                        {
                          name: "headline",
                          type: "ReactNode",
                          default: "—",
                          description:
                            "Content that stays visible through the whole sequence, centred over the tiles.",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "—",
                          description:
                            "Content revealed once the tiles have cleared the stage.",
                        },
                        {
                          name: "columns",
                          type: "number",
                          default: "3",
                          description: "Number of grid columns.",
                        },
                        {
                          name: "gap",
                          type: "number",
                          default: "28",
                          description: "Gap between tiles in pixels.",
                        },
                        {
                          name: "gridWidth",
                          type: "number",
                          default: "720",
                          description:
                            "Maximum grid width in pixels; shrinks with the viewport.",
                        },
                        {
                          name: "tileAspect",
                          type: "number",
                          default: "1",
                          description: "Width to height ratio of each tile.",
                        },
                        {
                          name: "tileRadius",
                          type: "number",
                          default: "0",
                          description: "Corner radius of each tile in pixels.",
                        },
                        {
                          name: "grayscale",
                          type: "boolean",
                          default: "false",
                          description: "Render the images in grayscale.",
                        },
                        {
                          name: "direction",
                          type: '"alternate" | "top" | "bottom"',
                          default: '"alternate"',
                          description: "Which edge columns enter from.",
                        },
                        {
                          name: "stagger",
                          type: "number",
                          default: "0.06",
                          description:
                            "Delay between tiles in a column, relative to one tile's flight time.",
                        },
                        {
                          name: "overlap",
                          type: "number",
                          default: "0.6",
                          description:
                            "How far the zoom phase overlaps the fly-in, as a fraction of one flight.",
                        },
                        {
                          name: "zoom",
                          type: "number",
                          default: "2.05",
                          description:
                            "Scale the grid reaches before the tiles leave the stage.",
                        },
                        {
                          name: "spread",
                          type: "number",
                          default: "0.4",
                          description:
                            "Minimum push, as a fraction of a tile, the columns and centre rows spread apart. Tiles always travel at least far enough to clear the stage.",
                        },
                        {
                          name: "scrollLength",
                          type: "number",
                          default: "3",
                          description:
                            "Extra viewport heights of scroll that drive the sequence.",
                        },
                        {
                          name: "scrub",
                          type: "number",
                          default: "0.08",
                          description:
                            "Seconds the motion lags behind the scroll position. Zero locks to it.",
                        },
                        {
                          name: "contentGap",
                          type: "number",
                          default: "28",
                          description:
                            "Gap between the headline and the revealed content in pixels.",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"transparent"',
                          description: "Stage background.",
                        },
                        {
                          name: "onProgress",
                          type: "(progress: number) => void",
                          default: "—",
                          description:
                            "Called with the sequence progress from 0 to 1.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "—",
                          description: "Extra classes for the outer section.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, r.jsx)(n.lT, { children: (0, r.jsx)(n.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
