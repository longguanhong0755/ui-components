/* ReactBits Pro public preview module 48364 for rotating-cards.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/48364.bb109cd470b1c2b5.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  48364: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => m }));
    var r = a(95155),
      i = a(12115),
      n = a(56388),
      o = a(45949),
      l = a(90761),
      s = a(75272),
      c = a(17192),
      d = a(39551),
      p = a(90650);
    let u = ({
      cards: e,
      radius: t = 360,
      duration: a = 20,
      cardWidth: n = 160,
      cardHeight: o = 190,
      pauseOnHover: l = !0,
      reverse: u = !1,
      draggable: m = !1,
      autoPlay: g = !0,
      onCardClick: h,
      mouseWheel: f = !1,
      className: b = "",
      cardClassName: y = "",
      initialRotation: v = 0,
    }) => {
      let [w, x] = (0, i.useState)(!1),
        [C, S] = (0, i.useState)(!1),
        [k, j] = (0, i.useState)(() => !e.some((e) => e.image)),
        [P, E] = (0, i.useState)(() => JSON.stringify(e.map((e) => e.id))),
        N = (0, i.useRef)(null),
        R = (0, i.useRef)(v),
        I = (0, i.useRef)(null),
        O = (0, i.useRef)(0),
        W = (0, i.useRef)(0),
        M = (0, s.d)(v),
        T = (0, c.z)(M, { damping: 30, stiffness: 200, mass: 0.5 }),
        A = (0, i.useMemo)(() => {
          let a = (2 * Math.PI) / e.length;
          return e.map((e, r) => {
            let i = a * r + (v * Math.PI) / 180;
            return {
              x: Math.cos(i) * t,
              y: Math.sin(i) * t,
              angle: (180 * i) / Math.PI,
            };
          });
        }, [e, t, v]),
        D = JSON.stringify(e.map((e) => e.id));
      (D !== P && (E(D), j(!e.some((e) => e.image))),
        (0, i.useEffect)(() => {
          let t = !1,
            a = async () => {
              let a = e
                .filter((e) => e.image)
                .map(
                  (e) =>
                    new Promise((t, a) => {
                      let r = new Image();
                      ((r.src = e.image), (r.onload = t), (r.onerror = a));
                    }),
                );
              try {
                (await Promise.all(a), t || j(!0));
              } catch (e) {
                (console.error("Failed to load images", e), t || j(!0));
              }
            };
          return (
            e.some((e) => e.image) && a(),
            () => {
              t = !0;
            }
          );
        }, [e]),
        (0, i.useEffect)(() => {
          let e;
          I.current = null;
          let t = (r) => {
            if (null !== I.current && !w && !C && g && k) {
              let e = (360 / a) * ((r - I.current) / 1e3) * (u ? -1 : 1);
              ((R.current += e), M.set(R.current));
            }
            ((I.current = r), (e = requestAnimationFrame(t)));
          };
          return (
            (e = requestAnimationFrame(t)),
            () => {
              cancelAnimationFrame(e);
            }
          );
        }, [a, u, w, C, g, M, k]));
      let B = (0, i.useCallback)((e, t) => {
          if (!N.current) return 0;
          let a = N.current.getBoundingClientRect(),
            r = a.left + a.width / 2;
          return (
            (180 * Math.atan2(t - (a.top + a.height / 2), e - r)) / Math.PI
          );
        }, []),
        F = (0, i.useCallback)(
          (e) => {
            (S(!0),
              (O.current = B(
                "clientX" in e ? e.clientX : e.touches[0].clientX,
                "clientY" in e ? e.clientY : e.touches[0].clientY,
              )),
              (W.current = R.current));
          },
          [B],
        ),
        H = (0, i.useCallback)(
          (e, t) => {
            if (!C) return;
            let a = B(t.point.x, t.point.y) - O.current,
              r = W.current + a;
            ((R.current = r), M.set(r));
          },
          [C, B, M],
        ),
        G = (0, i.useCallback)(() => {
          S(!1);
        }, []);
      (0, i.useEffect)(() => {
        if (!f || !N.current) return;
        let e = (e) => {
            e.preventDefault();
            let t = 0.5 * e.deltaY;
            ((R.current += t * (u ? -1 : 1)), M.set(R.current));
          },
          t = N.current;
        return (
          t.addEventListener("wheel", e, { passive: !1 }),
          () => {
            t.removeEventListener("wheel", e);
          }
        );
      }, [f, u, M]);
      let $ = (0, i.useCallback)(
        (e, t) => {
          h && h(e, t);
        },
        [h],
      );
      return (0, r.jsx)("div", {
        ref: N,
        className: (0, p.cn)("relative flex items-center justify-center", b),
        style: { width: `${2 * t + n}px`, height: `${2 * t + o}px` },
        children: (0, r.jsx)(
          d.P.div,
          {
            className: "relative w-full h-full",
            style: { rotate: T, willChange: "transform" },
            drag: m,
            dragConstraints: { left: 0, right: 0, top: 0, bottom: 0 },
            dragElastic: 0,
            dragMomentum: !1,
            onDragStart: F,
            onDrag: H,
            onDragEnd: G,
            children: e.map((t, a) => {
              let i = A[a];
              return (0, r.jsx)(
                d.P.div,
                {
                  className: (0, p.cn)(
                    "absolute rounded-xl shadow-lg backdrop-blur-sm overflow-hidden cursor-pointer",
                    "border border-white/10",
                    y,
                  ),
                  style: {
                    width: `${n}px`,
                    height: `${o}px`,
                    left: "50%",
                    top: "50%",
                    x: i.x,
                    y: i.y,
                    marginLeft: `-${n / 2}px`,
                    marginTop: `-${o / 2}px`,
                    background:
                      t.background ||
                      (t.image ? `url(${t.image}) center/cover` : void 0) ||
                      "rgba(255, 255, 255, 0.1)",
                    willChange: "transform",
                    rotate: i.angle + 90,
                  },
                  initial: { opacity: 0, scale: 0 },
                  animate: { opacity: +!!k, scale: +!!k },
                  transition: {
                    duration: 0.5,
                    delay: 0.05 * a,
                    ease: "easeOut",
                  },
                  onMouseEnter: () => l && x(!0),
                  onMouseLeave: () => l && x(!1),
                  onClick: () => $(t, a),
                  whileHover: l
                    ? { scale: 1.05, transition: { duration: 0.2 } }
                    : void 0,
                  children: (0, r.jsx)("div", {
                    className:
                      "w-full h-full flex items-center justify-center p-6",
                    children: t.content,
                  }),
                },
                `${t.id}-${e.length}`,
              );
            }),
          },
          e.length,
        ),
      });
    };
    u.displayName = "RotatingCards";
    let m = () => {
      let [e, t] = (0, l.I)(),
        [a, s] = (0, i.useState)(360),
        [c, d] = (0, i.useState)(20),
        [p, m] = (0, i.useState)(160),
        [g, h] = (0, i.useState)(190),
        [f, b] = (0, i.useState)(!0),
        [y, v] = (0, i.useState)(!1),
        [w, x] = (0, i.useState)(!1),
        [C, S] = (0, i.useState)(!0),
        [k, j] = (0, i.useState)(!1),
        [P, E] = (0, i.useState)(10),
        N = Array.from({ length: P }, (e, t) => ({
          id: t + 1,
          content: (0, r.jsx)("div", {
            className: "text-center",
            children: (0, r.jsx)("h3", {
              className: "text-6xl font-medium tracking-tighter text-white",
              children: t + 1,
            }),
          }),
          image: o.ag[t % o.ag.length],
        }));
      return (0, r.jsxs)("div", {
        children: [
          (0, r.jsx)(n.Bg, {}),
          (0, r.jsxs)(n.VX, {
            children: [
              (0, r.jsxs)(n.Ec, {
                children: [
                  (0, r.jsx)(n.Ch, {
                    onRefresh: t,
                    children: (0, r.jsx)("div", {
                      className: "translate-y-[30%]",
                      children: (0, r.jsx)(
                        u,
                        {
                          className: "select-none",
                          cardClassName: "shadow-lg",
                          cards: N,
                          radius: a,
                          duration: c,
                          cardWidth: p,
                          cardHeight: g,
                          pauseOnHover: f,
                          reverse: y,
                          draggable: w,
                          initialRotation: 45,
                          autoPlay: C,
                          onCardClick: (e, t) =>
                            console.log(`Clicked card ${t}:`, e),
                          mouseWheel: k,
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, r.jsxs)(n.IH, {
                    children: [
                      (0, r.jsx)(n.yt, {
                        title: "Radius",
                        value: a,
                        onChange: s,
                        min: 100,
                        max: 400,
                        step: 10,
                      }),
                      (0, r.jsx)(n.yt, {
                        title: "Card Width",
                        value: p,
                        onChange: m,
                        min: 100,
                        max: 300,
                        step: 10,
                      }),
                      (0, r.jsx)(n.yt, {
                        title: "Card Height",
                        value: g,
                        onChange: h,
                        min: 150,
                        max: 400,
                        step: 10,
                      }),
                      (0, r.jsx)(n.yt, {
                        title: "Number of Cards",
                        value: P,
                        onChange: E,
                        min: 3,
                        max: 10,
                        step: 1,
                      }),
                      (0, r.jsx)(n.yt, {
                        title: "Duration",
                        value: c,
                        onChange: d,
                        min: 5,
                        max: 60,
                        step: 1,
                      }),
                      (0, r.jsx)(n.tl, {
                        title: "Auto Play",
                        checked: C,
                        onChange: S,
                      }),
                      (0, r.jsx)(n.tl, {
                        title: "Reverse Direction",
                        checked: y,
                        onChange: v,
                      }),
                      (0, r.jsx)(n.tl, {
                        title: "Pause on Hover",
                        checked: f,
                        onChange: b,
                      }),
                      (0, r.jsx)(n.tl, {
                        title: "Draggable",
                        checked: w,
                        onChange: x,
                      }),
                      (0, r.jsx)(n.tl, {
                        title: "Mouse Wheel",
                        checked: k,
                        onChange: j,
                      }),
                    ],
                  }),
                  (0, r.jsx)(n.Ub, {
                    data: [
                      {
                        name: "cards",
                        type: "Card[]",
                        default: "[]",
                        description:
                          "Array of card objects with id, content, optional background, and optional image",
                      },
                      {
                        name: "radius",
                        type: "number",
                        default: "360",
                        description: "Radius of the circle in pixels",
                      },
                      {
                        name: "duration",
                        type: "number",
                        default: "20",
                        description: "Duration of one full rotation in seconds",
                      },
                      {
                        name: "cardWidth",
                        type: "number",
                        default: "160",
                        description: "Width of each card in pixels",
                      },
                      {
                        name: "cardHeight",
                        type: "number",
                        default: "190",
                        description: "Height of each card in pixels",
                      },
                      {
                        name: "pauseOnHover",
                        type: "boolean",
                        default: "true",
                        description:
                          "Pause rotation when hovering over the component",
                      },
                      {
                        name: "reverse",
                        type: "boolean",
                        default: "false",
                        description: "Reverse the rotation direction",
                      },
                      {
                        name: "draggable",
                        type: "boolean",
                        default: "false",
                        description: "Enable drag to rotate the circle",
                      },
                      {
                        name: "autoPlay",
                        type: "boolean",
                        default: "true",
                        description: "Auto-play rotation animation",
                      },
                      {
                        name: "onCardClick",
                        type: "(card: Card, index: number) => void",
                        default: "undefined",
                        description: "Callback when a card is clicked",
                      },
                      {
                        name: "mouseWheel",
                        type: "boolean",
                        default: "false",
                        description: "Enable mouse wheel to control rotation",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description: "Additional CSS classes for the container",
                      },
                      {
                        name: "cardClassName",
                        type: "string",
                        default: '""',
                        description:
                          "Additional CSS classes for individual cards",
                      },
                      {
                        name: "initialRotation",
                        type: "number",
                        default: "0",
                        description: "Initial rotation offset in degrees",
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
