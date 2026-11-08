/* ReactBits Pro public preview module 4297 for card-spread.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/4297.f1ffccebbe84f230.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  4297: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => v }));
    var n = a(95155),
      i = a(12115),
      s = a(30701),
      r = a(56388),
      l = a(90761),
      o = a(39551),
      d = a(50969),
      u = a(90650);
    let c = Math.PI / 180,
      h = [0.16, 1, 0.3, 1],
      m = [
        {
          id: "atrium",
          src: "https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?q=80&w=800&auto=format&fit=crop",
          alt: "Glass atrium seen from below",
        },
        {
          id: "spiral",
          src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop",
          alt: "Corporate tower against an open sky",
        },
        {
          id: "vault",
          src: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=800&auto=format&fit=crop",
          alt: "White concrete facade in daylight",
        },
        {
          id: "lattice",
          src: "https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?q=80&w=800&auto=format&fit=crop",
          alt: "Repeating window lattice on a high rise",
        },
        {
          id: "terrace",
          src: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=800&auto=format&fit=crop",
          alt: "Terraced building stepping into the sky",
        },
        {
          id: "arches",
          src: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=800&auto=format&fit=crop",
          alt: "Row of arches along a shaded walkway",
        },
        {
          id: "canopy",
          src: "https://images.unsplash.com/photo-1470075801209-17f9ec0cada6?q=80&w=800&auto=format&fit=crop",
          alt: "Steel canopy over a public square",
        },
      ],
      p = (e, t, a) => Math.min(Math.max(e, t), a),
      f = (0, i.memo)(function ({
        index: e,
        src: t,
        alt: a,
        angle: i,
        raised: s,
        faded: r,
        layer: l,
        left: d,
        top: u,
        orbit: c,
        width: m,
        height: f,
        radius: g,
        padding: x,
        paper: v,
        border: b,
        shadow: y,
        lift: w,
        stagger: C,
        stiffness: j,
        damping: S,
        mass: M,
        still: P,
        interactive: N,
        onEnter: k,
        onLeave: R,
      }) {
        let E = P
          ? { duration: 0 }
          : { type: "spring", stiffness: j, damping: S, mass: M };
        return (0, n.jsx)(o.P.div, {
          className: "absolute",
          style: {
            left: d,
            top: u - c,
            width: m,
            height: f,
            marginLeft: -m / 2,
            transformOrigin: `50% ${c}px`,
            zIndex: l,
          },
          initial: !P && { rotate: 0 },
          animate: { rotate: i },
          transition: E,
          children: (0, n.jsx)(o.P.div, {
            className: "h-full w-full",
            animate: { y: s ? -w : 0 },
            transition: E,
            children: (0, n.jsx)(o.P.div, {
              className: "h-full w-full",
              initial: !P && { opacity: 0, scale: 0.92 },
              animate: { opacity: 1, scale: 1 },
              transition: { duration: 0.5 * !P, delay: P ? 0 : C * e, ease: h },
              children: (0, n.jsx)(o.P.div, {
                className: "h-full w-full",
                animate: { opacity: r },
                transition: { duration: 0.22 * !P },
                onPointerEnter: () => k(e),
                onFocus: () => k(e),
                onBlur: R,
                tabIndex: N ? 0 : -1,
                children: (0, n.jsx)("div", {
                  className: "h-full w-full overflow-hidden",
                  style: {
                    borderRadius: g,
                    background: v,
                    padding: x,
                    border: `1px solid ${b}`,
                    boxShadow:
                      y > 0
                        ? `0 ${Math.round(18 * y)}px ${Math.round(42 * y)}px rgba(0,0,0,${p(0.9 * y, 0, 1)})`
                        : "none",
                  },
                  children: (0, n.jsx)("img", {
                    src: t,
                    alt: a,
                    draggable: !1,
                    loading: "lazy",
                    className: "block h-full w-full object-cover",
                    style: { borderRadius: Math.max(g - x, 0) },
                  }),
                }),
              }),
            }),
          }),
        });
      }),
      g = ({
        cards: e = m,
        cardWidth: t = 168,
        cardHeight: a = 252,
        cardRadius: s = 12,
        radius: r = 440,
        arc: l = 88,
        cardColor: o = "#ffffff",
        cardPadding: h = 0,
        borderColor: g = "transparent",
        shadow: x = 0.28,
        lift: v = 26,
        push: b = 3.6,
        pushReach: y = 3,
        restOpacity: w = 1,
        stiffness: C = 150,
        damping: j = 16,
        mass: S = 1,
        stagger: M = 0.06,
        fit: P = !0,
        maxScale: N = 1,
        interactive: k = !0,
        className: R,
        style: E,
      }) => {
        let I = (0, d.I)(),
          H = (0, i.useRef)(null),
          [O, q] = (0, i.useState)(1),
          [T, W] = (0, i.useState)(null),
          $ = e.length > 0 ? e : m,
          L = $.length,
          D = (0, i.useMemo)(() => {
            let e = p(l, 0, 340);
            return {
              span: e,
              step: L > 1 ? e / (L - 1) : 0,
              frame: ((e, t, a, n, i) => {
                let s = a / 2,
                  r = [-i, n],
                  l = 1 / 0,
                  o = -1 / 0,
                  d = 1 / 0,
                  u = -1 / 0;
                for (let a = 0; a <= 48; a += 1) {
                  let n = (-e / 2 + (e * a) / 48) * c,
                    i = Math.cos(n),
                    h = Math.sin(n);
                  for (let e of [-s, s])
                    for (let a of r) {
                      let n = a - t,
                        s = e * i - n * h,
                        r = e * h + n * i;
                      (s < l && (l = s),
                        s > o && (o = s),
                        r < d && (d = r),
                        r > u && (u = r));
                    }
                }
                return {
                  width: Math.max(o - l, 1),
                  height: Math.max(u - d, 1),
                  pivotX: -l,
                  pivotY: -d,
                };
              })(e, Math.max(r, a), t, a, Math.max(v, 0)),
            };
          }, [l, L, r, t, a, v]),
          B = Math.max(r, a);
        (0, i.useEffect)(() => {
          let e = H.current;
          if (!e || !P) return;
          let t = new ResizeObserver((e) => {
            let t = e[0]?.contentRect;
            if (!t || 0 === t.width || 0 === t.height) return;
            let a = Math.min(
              N,
              t.width / D.frame.width,
              t.height / D.frame.height,
            );
            q(Number.isFinite(a) && a > 0 ? a : N);
          });
          return (t.observe(e), () => t.disconnect());
        }, [P, N, D.frame.width, D.frame.height]);
        let F = P ? O : N,
          z = (0, i.useCallback)(
            (e) => {
              k && W(e);
            },
            [k],
          ),
          U = (0, i.useCallback)(() => {
            k && W(null);
          }, [k]),
          X = (L - 1) / 2,
          _ = !!I;
        return (0, n.jsx)("div", {
          ref: H,
          className: (0, u.cn)(
            "relative flex h-full w-full items-center justify-center overflow-hidden",
            R,
          ),
          style: E,
          onPointerLeave: U,
          children: (0, n.jsx)("div", {
            className: "relative",
            style: {
              width: D.frame.width,
              height: D.frame.height,
              transform: `scale(${F})`,
            },
            children: $.map((e, i) => {
              let r = 0;
              if (null !== T && T !== i) {
                let e = i - T,
                  t = Math.abs(e);
                t <= y && (r = Math.sign(e) * b * (y + 1 - t));
              }
              let l = T === i;
              return (0, n.jsx)(
                f,
                {
                  index: i,
                  src: e.src,
                  alt: e.alt ?? "",
                  angle: -D.span / 2 + D.step * i + r,
                  raised: l,
                  faded: null === T || l ? 1 : p(w, 0, 1),
                  layer: l ? L + 2 : Math.round(L - Math.abs(i - X)),
                  left: D.frame.pivotX,
                  top: D.frame.pivotY,
                  orbit: B,
                  width: t,
                  height: a,
                  radius: s,
                  padding: h,
                  paper: o,
                  border: g,
                  shadow: x,
                  lift: v,
                  stagger: M,
                  stiffness: C,
                  damping: j,
                  mass: S,
                  still: _,
                  interactive: k,
                  onEnter: z,
                  onLeave: U,
                },
                e.id ?? `${e.src}-${i}`,
              );
            }),
          }),
        });
      },
      x = () => () => {},
      v = () => {
        let [e, t] = (0, l.I)(),
          { resolvedTheme: a } = (0, s.D)(),
          o =
            (0, i.useSyncExternalStore)(
              x,
              () => !0,
              () => !1,
            ) && "dark" === a,
          [d, u] = (0, i.useState)(168),
          [c, h] = (0, i.useState)(252),
          [m, p] = (0, i.useState)(12),
          [f, v] = (0, i.useState)(440),
          [b, y] = (0, i.useState)(88),
          [w, C] = (0, i.useState)(0),
          [j, S] = (0, i.useState)(0.28),
          [M, P] = (0, i.useState)(26),
          [N, k] = (0, i.useState)(3.6),
          [R, E] = (0, i.useState)(3),
          [I, H] = (0, i.useState)(1),
          [O, q] = (0, i.useState)(150),
          [T, W] = (0, i.useState)(16),
          [$, L] = (0, i.useState)(1),
          [D, B] = (0, i.useState)(0.06),
          [F, z] = (0, i.useState)(!0),
          [U, X] = (0, i.useState)(1),
          [_, G] = (0, i.useState)(!0),
          [V, Y] = (0, i.useState)(null),
          [A, J] = (0, i.useState)(null),
          K = (0, i.useMemo)(
            () => (null !== V ? V : o ? "#f5f5f5" : "#ffffff"),
            [o, V],
          ),
          Q = (0, i.useMemo)(
            () => (null !== A ? A : o ? "#262626" : "#e5e5e5"),
            [o, A],
          );
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(r.Bg, {}),
            (0, n.jsxs)(r.VX, {
              children: [
                (0, n.jsxs)(r.Ec, {
                  children: [
                    (0, n.jsx)(r.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      children: (0, n.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, n.jsx)(
                          g,
                          {
                            cardWidth: d,
                            cardHeight: c,
                            cardRadius: m,
                            radius: f,
                            arc: b,
                            cardColor: K,
                            cardPadding: w,
                            borderColor: Q,
                            shadow: j,
                            lift: M,
                            push: N,
                            pushReach: R,
                            restOpacity: I,
                            stiffness: O,
                            damping: T,
                            mass: $,
                            stagger: D,
                            fit: F,
                            maxScale: U,
                            interactive: _,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(r.IH, {
                      children: [
                        (0, n.jsx)(r.yt, {
                          title: "Arc",
                          min: 20,
                          max: 200,
                          step: 1,
                          value: b,
                          onChange: y,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Radius",
                          min: 200,
                          max: 900,
                          step: 10,
                          value: f,
                          onChange: v,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Card Width",
                          min: 80,
                          max: 320,
                          step: 2,
                          value: d,
                          onChange: u,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Card Height",
                          min: 100,
                          max: 460,
                          step: 2,
                          value: c,
                          onChange: h,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Card Radius",
                          min: 0,
                          max: 48,
                          step: 1,
                          value: m,
                          onChange: p,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Card Padding",
                          min: 0,
                          max: 24,
                          step: 1,
                          value: w,
                          onChange: C,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Shadow",
                          min: 0,
                          max: 1,
                          step: 0.02,
                          value: j,
                          onChange: S,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Lift",
                          min: 0,
                          max: 80,
                          step: 1,
                          value: M,
                          onChange: P,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Push",
                          min: 0,
                          max: 12,
                          step: 0.1,
                          value: N,
                          onChange: k,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Push Reach",
                          min: 0,
                          max: 6,
                          step: 1,
                          value: R,
                          onChange: E,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Rest Opacity",
                          min: 0.2,
                          max: 1,
                          step: 0.05,
                          value: I,
                          onChange: H,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Stiffness",
                          min: 40,
                          max: 400,
                          step: 5,
                          value: O,
                          onChange: q,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Damping",
                          min: 4,
                          max: 60,
                          step: 1,
                          value: T,
                          onChange: W,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Mass",
                          min: 0.2,
                          max: 4,
                          step: 0.1,
                          value: $,
                          onChange: L,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Stagger",
                          min: 0,
                          max: 0.3,
                          step: 0.01,
                          value: D,
                          onChange: B,
                        }),
                        (0, n.jsx)(r.yt, {
                          title: "Max Scale",
                          min: 0.3,
                          max: 2,
                          step: 0.05,
                          value: U,
                          onChange: X,
                        }),
                        (0, n.jsx)(r.W7, {
                          title: "Card Color",
                          value: K,
                          onChange: Y,
                        }),
                        (0, n.jsx)(r.W7, {
                          title: "Border Color",
                          value: Q,
                          onChange: J,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Fit",
                          checked: F,
                          onChange: z,
                        }),
                        (0, n.jsx)(r.tl, {
                          title: "Interactive",
                          checked: _,
                          onChange: G,
                        }),
                      ],
                    }),
                    (0, n.jsx)(r.Ub, {
                      data: [
                        {
                          name: "cards",
                          type: "CardSpreadCard[]",
                          default: "7 images",
                          description:
                            "Images laid out along the arc, left to right. Each entry takes src, alt and an optional id.",
                        },
                        {
                          name: "cardWidth",
                          type: "number",
                          default: "168",
                          description: "Width of a single card in pixels.",
                        },
                        {
                          name: "cardHeight",
                          type: "number",
                          default: "252",
                          description: "Height of a single card in pixels.",
                        },
                        {
                          name: "cardRadius",
                          type: "number",
                          default: "12",
                          description: "Corner radius of a card in pixels.",
                        },
                        {
                          name: "radius",
                          type: "number",
                          default: "440",
                          description:
                            "Radius of the invisible circle the cards hang from. Larger values flatten the fan.",
                        },
                        {
                          name: "arc",
                          type: "number",
                          default: "88",
                          description:
                            "Total angle the fan covers, in degrees.",
                        },
                        {
                          name: "cardColor",
                          type: "string",
                          default: '"#ffffff"',
                          description: "Frame colour behind each image.",
                        },
                        {
                          name: "cardPadding",
                          type: "number",
                          default: "0",
                          description:
                            "Padding between the frame edge and the image, in pixels.",
                        },
                        {
                          name: "borderColor",
                          type: "string",
                          default: '"transparent"',
                          description:
                            "Hairline border drawn around each card.",
                        },
                        {
                          name: "shadow",
                          type: "number",
                          default: "0.28",
                          description:
                            "Drop shadow strength. Set to 0 to remove it.",
                        },
                        {
                          name: "lift",
                          type: "number",
                          default: "26",
                          description:
                            "How far a hovered card slides outward along its own axis, in pixels.",
                        },
                        {
                          name: "push",
                          type: "number",
                          default: "3.6",
                          description:
                            "Degrees the nearest neighbour is pushed aside on hover.",
                        },
                        {
                          name: "pushReach",
                          type: "number",
                          default: "3",
                          description:
                            "How many neighbours on each side react to a hover.",
                        },
                        {
                          name: "restOpacity",
                          type: "number",
                          default: "1",
                          description:
                            "Opacity applied to the cards that are not hovered.",
                        },
                        {
                          name: "stiffness",
                          type: "number",
                          default: "150",
                          description:
                            "Spring stiffness of the fan and hover motion.",
                        },
                        {
                          name: "damping",
                          type: "number",
                          default: "16",
                          description:
                            "Spring damping. Lower values overshoot further.",
                        },
                        {
                          name: "mass",
                          type: "number",
                          default: "1",
                          description:
                            "Spring mass of the fan and hover motion.",
                        },
                        {
                          name: "stagger",
                          type: "number",
                          default: "0.06",
                          description:
                            "Seconds between each card fading in on mount.",
                        },
                        {
                          name: "fit",
                          type: "boolean",
                          default: "true",
                          description:
                            "Scale the whole fan down so it always fits the container.",
                        },
                        {
                          name: "maxScale",
                          type: "number",
                          default: "1",
                          description: "Upper bound applied to the fit scale.",
                        },
                        {
                          name: "interactive",
                          type: "boolean",
                          default: "true",
                          description:
                            "Enable pointer and keyboard interaction.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "-",
                          description:
                            "Optional className applied to the root.",
                        },
                        {
                          name: "style",
                          type: "CSSProperties",
                          default: "-",
                          description:
                            "Optional inline style applied to the root.",
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
