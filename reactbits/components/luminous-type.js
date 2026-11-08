/* ReactBits Pro public preview module 42906 for luminous-type.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/42906.8fb18a70182d2e52.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  42906: (e, t, i) => {
    (i.r(t), i.d(t, { default: () => g }));
    var n = i(95155),
      r = i(12115),
      a = i(56388),
      l = i(86049),
      s = i(90761),
      o = i(90650);
    let d = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      c = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      u = (e, t, i) => Math.min(i, Math.max(t, e)),
      h = (0, r.forwardRef)(function (
        {
          text: e = "Look a little closer. There is more here than meets the eye.",
          as: t = "p",
          fontSize: i = "clamp(2rem, 5vw, 3.75rem)",
          fontWeight: a = 600,
          letterSpacing: l = "-0.035em",
          lineHeight: s = 1.15,
          align: h = "center",
          maxWidth: p = "20ch",
          color: m,
          tint: f = "#B19EEF",
          baseOpacity: x = 0.14,
          radius: y = 3,
          softness: g = 0.6,
          trail: v = 0.5,
          follow: b = 0.5,
          idle: w = "drift",
          driftSpeed: S = 1,
          clickToReveal: C = !0,
          interactive: k = !0,
          className: F,
          style: j,
        },
        E,
      ) {
        let M = (0, r.useRef)(null),
          L = (0, r.useRef)(null),
          T = (0, r.useRef)(null),
          $ = (0, r.useRef)(null),
          O = (0, r.useSyncExternalStore)(d, c, () => !1),
          R = (0, r.useRef)({
            tint: f,
            baseOpacity: x,
            radius: y,
            softness: g,
            trail: v,
            follow: b,
            idle: w,
            driftSpeed: S,
            clickToReveal: C,
            interactive: k,
            reduced: O,
          });
        return (
          (0, r.useEffect)(() => {
            ((R.current = {
              tint: f,
              baseOpacity: x,
              radius: y,
              softness: g,
              trail: v,
              follow: b,
              idle: w,
              driftSpeed: S,
              clickToReveal: C,
              interactive: k,
              reduced: O,
            }),
              $.current?.sync());
          }),
          (0, r.useEffect)(() => {
            let e = M.current,
              t = L.current,
              i = T.current;
            if (!e || !t || !i) return;
            let n = ((e, t, i, n) => {
              let r = { x: 0, y: 0, vx: 0, vy: 0 },
                a = { x: 0, y: 0, vx: 0, vy: 0 },
                l = { x: 0, y: 0, inside: !1 },
                s = 1,
                o = 1,
                d = 16,
                c = 0,
                h = 0,
                p = 0,
                m = 40 * Math.random(),
                f = 0,
                x = 0,
                y = !0,
                g = !1,
                v = !1,
                b = () => {
                  let t = e.getBoundingClientRect();
                  ((s = Math.max(1, t.width)),
                    (o = Math.max(1, t.height)),
                    (d = parseFloat(getComputedStyle(e).fontSize) || 16),
                    v || ((r.x = a.x = s / 2), (r.y = a.y = o / 2), (v = !0)));
                },
                w = () => {
                  let e = n.current;
                  if (l.inside && e.interactive) return [l.x, l.y];
                  if ("drift" === e.idle) {
                    let t = u(e.driftSpeed, 0, 4),
                      i = m * t;
                    return [
                      s / 2 +
                        0.4 *
                          s *
                          Math.sin(0.23 * i + 0.4) *
                          Math.cos(0.071 * i),
                      o / 2 + 0.34 * o * Math.sin(0.31 * i + 1.7),
                    ];
                  }
                  return [s / 2, o / 2];
                },
                S = (e, t, i, n, r) => {
                  let a = 2 * Math.sqrt(n),
                    l = Math.max(1, Math.ceil(r / 0.008)),
                    s = r / l;
                  for (let r = 0; r < l; r++)
                    ((e.vx += (n * (t - e.x) - a * e.vx) * s),
                      (e.vy += (n * (i - e.y) - a * e.vy) * s),
                      (e.x += e.vx * s),
                      (e.y += e.vy * s));
                },
                C = () => {
                  let e = n.current,
                    l = u(e.softness, 0, 1),
                    h = u(e.radius, 0.5, 20) * d,
                    m = (1 - l) * 42 + 6,
                    f = h + ((1.05 * Math.hypot(s, o) * 100) / m - h) * c * c,
                    x = m + (100 - m) * 0.45,
                    y = u(e.trail, 0, 1) * (1 - c) * p,
                    g = `radial-gradient(circle ${f.toFixed(1)}px at ${r.x.toFixed(1)}px ${r.y.toFixed(1)}px, #000 0%, #000 ${m.toFixed(1)}%, rgba(0,0,0,0.55) ${x.toFixed(1)}%, rgba(0,0,0,0) 100%)`,
                    v = `radial-gradient(circle ${(1.35 * h).toFixed(1)}px at ${a.x.toFixed(1)}px ${a.y.toFixed(1)}px, rgba(0,0,0,${(0.5 * y).toFixed(3)}) 0%, rgba(0,0,0,${(0.22 * y).toFixed(3)}) 45%, rgba(0,0,0,0) 100%)`,
                    b = y > 0.01 ? `${g}, ${v}` : g;
                  (t.style.setProperty("mask-image", b),
                    t.style.setProperty("-webkit-mask-image", b));
                  let w =
                    e.tint &&
                    "undefined" != typeof CSS &&
                    CSS.supports("color", e.tint)
                      ? e.tint
                      : "";
                  if (w) {
                    let e = 0.8 * m + (100 - 0.8 * m) * c,
                      i = `radial-gradient(circle ${(1.05 * f).toFixed(1)}px at ${r.x.toFixed(1)}px ${r.y.toFixed(1)}px, currentColor 0%, currentColor ${e.toFixed(1)}%, ${w} ${Math.max(100, e + 0.1).toFixed(1)}%)`;
                    ((t.style.backgroundImage = i),
                      t.style.setProperty("-webkit-background-clip", "text"),
                      (t.style.backgroundClip = "text"),
                      t.style.setProperty(
                        "-webkit-text-fill-color",
                        "transparent",
                      ));
                  } else
                    ((t.style.backgroundImage = ""),
                      t.style.removeProperty("-webkit-text-fill-color"));
                  ((t.style.opacity = String(Math.max(p, c))),
                    (i.style.opacity = String(u(e.baseOpacity, 0, 1))));
                },
                k = () => {
                  let e = n.current;
                  return e.reduced || (l.inside && e.interactive)
                    ? 1
                    : +("none" !== e.idle);
                },
                F = (e) => {
                  if (((f = 0), g)) return;
                  let t = Math.min(0.05, Math.max(0, (e - x) / 1e3));
                  ((x = e),
                    ((e) => {
                      let t = n.current;
                      if (t.reduced) {
                        ((c = 1), (p = 1));
                        return;
                      }
                      m += e;
                      let i = 30 + 330 * u(t.follow, 0, 1),
                        [s, o] = w();
                      (S(r, s, o, l.inside ? i : 0.35 * i, e),
                        S(a, r.x, r.y, 9, e),
                        (c += (h - c) * (1 - Math.exp(-e / 0.32))));
                      let d = k();
                      p += (d - p) * (1 - Math.exp(-e / (d > p ? 0.25 : 0.6)));
                    })(t),
                    C(),
                    !y ||
                      document.hidden ||
                      (() => {
                        let e = n.current,
                          [t, i] = w(),
                          s =
                            0.3 > Math.hypot(r.x - t, r.y - i) &&
                            2 > Math.hypot(r.vx, r.vy) &&
                            0.5 > Math.hypot(a.x - r.x, a.y - r.y),
                          o = !l.inside && "drift" === e.idle && !e.reduced;
                        return (
                          s &&
                          !o &&
                          0.001 > Math.abs(c - h) &&
                          0.001 > Math.abs(p - k())
                        );
                      })() ||
                      (f = requestAnimationFrame(F)));
                };
              function j() {
                g ||
                  f ||
                  !y ||
                  ((x = performance.now()), (f = requestAnimationFrame(F)));
              }
              let E = (t) => {
                  let i = e.getBoundingClientRect();
                  ((l.x = t.clientX - i.left), (l.y = t.clientY - i.top));
                },
                M = (e) => {
                  n.current.interactive &&
                    (E(e),
                    !l.inside &&
                      ((l.inside = !0),
                      p < 0.05 &&
                        ((r.x = a.x = l.x),
                        (r.y = a.y = l.y),
                        (r.vx = r.vy = a.vx = a.vy = 0))),
                    j());
                },
                L = (e) => {
                  ("touch" !== e.pointerType || "pointercancel" !== e.type) &&
                    ((l.inside = !1), j());
                },
                T = (e) => {
                  n.current.interactive && (E(e), (l.inside = !0), j());
                },
                $ = () => {
                  let e = n.current;
                  e.interactive &&
                    e.clickToReveal &&
                    !e.reduced &&
                    ((h = h > 0.5 ? 0 : 1), j());
                };
              (e.addEventListener("pointermove", M),
                e.addEventListener("pointerdown", T),
                e.addEventListener("pointerleave", L),
                e.addEventListener("pointercancel", L),
                e.addEventListener("click", $));
              let O = new ResizeObserver(() => {
                (b(), C(), j());
              });
              O.observe(e);
              let R = new IntersectionObserver(
                (e) => {
                  (y = e.some((e) => e.isIntersecting)) && j();
                },
                { rootMargin: "80px" },
              );
              R.observe(e);
              let I = () => {
                document.hidden || j();
              };
              return (
                document.addEventListener("visibilitychange", I),
                b(),
                n.current.reduced
                  ? ((c = 1), (p = 1))
                  : "none" !== n.current.idle && (p = 1),
                C(),
                j(),
                {
                  sync: () => {
                    (n.current.reduced
                      ? ((c = 1), (p = 1))
                      : 0 === h && c > 0.999 && (c = 0),
                      C(),
                      j());
                  },
                  destroy: () => {
                    ((g = !0),
                      cancelAnimationFrame(f),
                      e.removeEventListener("pointermove", M),
                      e.removeEventListener("pointerdown", T),
                      e.removeEventListener("pointerleave", L),
                      e.removeEventListener("pointercancel", L),
                      e.removeEventListener("click", $),
                      document.removeEventListener("visibilitychange", I),
                      O.disconnect(),
                      R.disconnect());
                  },
                  lights: (e) => {
                    ((h = +!!e), j());
                  },
                }
              );
            })(e, t, i, R);
            return (
              ($.current = n),
              () => {
                (n.destroy(), ($.current = null));
              }
            );
          }, []),
          (0, r.useImperativeHandle)(
            E,
            () => ({
              lightsOn: () => $.current?.lights(!0),
              lightsOff: () => $.current?.lights(!1),
            }),
            [],
          ),
          (0, n.jsxs)(t, {
            ref: M,
            className: (0, o.cn)("relative inline-block max-w-full", F),
            style: {
              fontSize: "number" == typeof i ? `${i}px` : i,
              fontWeight: a,
              letterSpacing: l,
              lineHeight: s,
              textAlign: h,
              color: m,
              maxWidth: p ? `min(100%, ${p})` : void 0,
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
              cursor: C && k ? "pointer" : void 0,
              touchAction: "pan-y",
              ...j,
            },
            children: [
              (0, n.jsx)("span", {
                ref: T,
                style: { display: "block", opacity: x },
                children: e,
              }),
              (0, n.jsx)("span", {
                ref: L,
                "aria-hidden": "true",
                style: {
                  position: "absolute",
                  inset: 0,
                  display: "block",
                  pointerEvents: "none",
                  opacity: +!!O,
                },
                children: e,
              }),
            ],
          })
        );
      });
    h.displayName = "LuminousType";
    let p = {
        dark: "#B19EEF",
        light: "#5227FF",
        radius: 3,
        softness: 0.6,
        trail: 0.5,
        baseOpacity: 0.14,
      },
      m = {
        moonlight: p,
        candle: {
          ...p,
          dark: "#FFB86B",
          light: "#C2410C",
          radius: 2.4,
          softness: 0.75,
          trail: 0.7,
        },
        neon: {
          ...p,
          dark: "#FF5FD2",
          light: "#C026D3",
          radius: 2.6,
          softness: 0.4,
          trail: 0.35,
        },
        daylight: {
          ...p,
          dark: "",
          light: "",
          radius: 3.6,
          softness: 0.7,
          trail: 0.4,
          baseOpacity: 0.2,
        },
      },
      f = [
        { label: "Moonlight", value: "moonlight" },
        { label: "Candle", value: "candle" },
        { label: "Neon", value: "neon" },
        { label: "Daylight", value: "daylight" },
      ],
      x = [
        { label: "Drift", value: "drift" },
        { label: "Center", value: "center" },
        { label: "None", value: "none" },
      ],
      y = [
        {
          name: "text",
          type: "string",
          default:
            '"Look a little closer. There is more here than meets the eye."',
          description:
            "The text. It stays real, readable text at a dim base level; the light brings it to full brightness.",
        },
        {
          name: "as",
          type: '"span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"',
          default: '"p"',
          description: "Element to render.",
        },
        {
          name: "fontSize",
          type: "number | string",
          default: '"clamp(2rem, 5vw, 3.75rem)"',
          description:
            "Font size. Numbers are pixels; strings accept any CSS length.",
        },
        {
          name: "fontWeight",
          type: "number",
          default: "600",
          description:
            "Font weight. The font family is inherited from the page.",
        },
        {
          name: "letterSpacing",
          type: "string",
          default: '"-0.035em"',
          description: "Letter spacing as a CSS length.",
        },
        {
          name: "lineHeight",
          type: "number",
          default: "1.15",
          description: "Line height.",
        },
        {
          name: "align",
          type: '"left" | "center" | "right"',
          default: '"center"',
          description: "Text alignment.",
        },
        {
          name: "maxWidth",
          type: "string",
          default: '"20ch"',
          description: "Maximum line length as a CSS length.",
        },
        {
          name: "color",
          type: "string",
          default: "inherited",
          description:
            "Colour of the text at the centre of the light. Leave unset to inherit from the page.",
        },
        {
          name: "tint",
          type: "string",
          default: '"#B19EEF"',
          description:
            "Colour the light fades to at its edge. Set it to an empty string for an untinted light.",
        },
        {
          name: "baseOpacity",
          type: "number",
          default: "0.14",
          description:
            "Opacity of the text outside the light, from 0 (hidden) to 1.",
        },
        {
          name: "radius",
          type: "number",
          default: "3",
          description: "Radius of the light, in em.",
        },
        {
          name: "softness",
          type: "number",
          default: "0.6",
          description:
            "How gradually the light falls off toward its edge, from 0 (crisp) to 1 (very soft).",
        },
        {
          name: "trail",
          type: "number",
          default: "0.5",
          description:
            "Afterglow left on text the light has just passed, from 0 to 1.",
        },
        {
          name: "follow",
          type: "number",
          default: "0.5",
          description:
            "How tightly the light follows the pointer, from 0 (lazy) to 1 (immediate).",
        },
        {
          name: "idle",
          type: '"drift" | "center" | "none"',
          default: '"drift"',
          description:
            "What the light does without a pointer: wander slowly across the text, rest at its centre, or switch off.",
        },
        {
          name: "driftSpeed",
          type: "number",
          default: "1",
          description: "Speed of the idle drift.",
        },
        {
          name: "clickToReveal",
          type: "boolean",
          default: "true",
          description:
            "Clicking switches the lights on, bringing the whole text to full brightness; clicking again returns to the spotlight.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Let the pointer move the light. The cursor always stays visible.",
        },
        {
          name: "ref",
          type: "{ lightsOn, lightsOff }",
          default: "—",
          description: "Switch the full light on or off from code.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description: "Classes for the root element.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      g = () => {
        let [e, t] = (0, s.I)(),
          i = "dark" === (0, l.Y)(),
          [o, d] = (0, r.useState)(
            "Look a little closer. There is more here than meets the eye.",
          ),
          [c, u] = (0, r.useState)("moonlight"),
          [g, v] = (0, r.useState)(p),
          b = (e) => (t) => v((i) => ({ ...i, [e]: t })),
          [w, S] = (0, r.useState)(null),
          C = w ?? (i ? "#FFFFFF" : "#0A0A0A"),
          [k, F] = (0, r.useState)(null),
          j = k ?? (i ? g.dark : g.light),
          [E, M] = (0, r.useState)(56),
          [L, T] = (0, r.useState)(20),
          [$, O] = (0, r.useState)(0.5),
          [R, I] = (0, r.useState)("drift"),
          [N, P] = (0, r.useState)(1),
          [B, W] = (0, r.useState)(!0),
          [z, A] = (0, r.useState)(!0);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(a.Bg, {}),
            (0, n.jsxs)(a.VX, {
              children: [
                (0, n.jsxs)(a.Ec, {
                  children: [
                    (0, n.jsx)(a.Ch, {
                      onRefresh: t,
                      minHeight: 500,
                      enableResponsive: !0,
                      children: (0, n.jsx)("div", {
                        className:
                          "flex h-full w-full items-center justify-center overflow-hidden px-6 py-16 sm:px-12",
                        children: (0, n.jsx)(
                          h,
                          {
                            text: o,
                            fontSize: `min(${E}px, 8vw)`,
                            maxWidth: `${L}ch`,
                            color: C,
                            tint: j,
                            baseOpacity: g.baseOpacity,
                            radius: g.radius,
                            softness: g.softness,
                            trail: g.trail,
                            follow: $,
                            idle: R,
                            driftSpeed: N,
                            clickToReveal: B,
                            interactive: z,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(a.IH, {
                      children: [
                        (0, n.jsx)(a.UD, {
                          title: "Text",
                          value: o,
                          onChange: d,
                        }),
                        (0, n.jsx)(a.bg, {
                          title: "Light",
                          value: c,
                          options: f,
                          onChange: (e) => {
                            (u(e), v(m[e] ?? p), F(null));
                          },
                        }),
                        (0, n.jsx)(a.bg, {
                          title: "Idle",
                          value: R,
                          options: x,
                          onChange: (e) => I(e),
                        }),
                        (0, n.jsx)(a.W7, {
                          title: "Text",
                          value: C,
                          onChange: S,
                        }),
                        (0, n.jsx)(a.W7, {
                          title: "Tint",
                          value: j || C,
                          onChange: F,
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Font Size",
                          min: 20,
                          max: 120,
                          step: 1,
                          value: E,
                          valueUnit: "px",
                          onChange: M,
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Max Width",
                          min: 8,
                          max: 40,
                          step: 1,
                          value: L,
                          valueUnit: "ch",
                          onChange: T,
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Base Opacity",
                          min: 0,
                          max: 0.6,
                          step: 0.01,
                          value: g.baseOpacity,
                          onChange: b("baseOpacity"),
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Radius",
                          min: 0.8,
                          max: 10,
                          step: 0.1,
                          value: g.radius,
                          valueUnit: "em",
                          onChange: b("radius"),
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Softness",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: g.softness,
                          onChange: b("softness"),
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Trail",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: g.trail,
                          onChange: b("trail"),
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Follow",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: $,
                          onChange: O,
                        }),
                        (0, n.jsx)(a.yt, {
                          title: "Drift Speed",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: N,
                          onChange: P,
                        }),
                        (0, n.jsx)(a.tl, {
                          title: "Click To Reveal",
                          checked: B,
                          onChange: W,
                        }),
                        (0, n.jsx)(a.tl, {
                          title: "Interactive",
                          checked: z,
                          onChange: A,
                        }),
                      ],
                    }),
                    (0, n.jsx)(a.Ub, { data: y }),
                  ],
                }),
                (0, n.jsx)(a.lT, { children: (0, n.jsx)(a.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
