/* ReactBits Pro public preview module 93957 for domino-lettering.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/93957.c45ec5fb2ed92eff.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  93957: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => E }));
    var n = a(95155),
      i = a(12115),
      l = a(56388),
      r = a(86049),
      s = a(90761),
      o = a(90650);
    let d = Math.PI / 2,
      p = (88 * Math.PI) / 180,
      h = "calc(100% - 0.18em)",
      u = (e, t, a) => Math.min(a, Math.max(t, e)),
      f = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      m = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      c = {
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
      },
      g = {
        position: "relative",
        display: "inline-block",
        isolation: "isolate",
      },
      v = { whiteSpace: "pre-wrap" },
      b = { display: "inline-block", whiteSpace: "nowrap" },
      y = {
        position: "relative",
        display: "inline-block",
        willChange: "transform",
      },
      w = (e) => (180 * e) / Math.PI,
      x = (e, t, a, n = 1) => {
        let i = Math.min(Math.abs(e) / d, 1),
          l = (1 - 0.65 * u(a, 0, 1) * Math.pow(i, 1.3)) * n;
        return "back" === t
          ? {
              transform: `perspective(8em) rotateX(${w(e).toFixed(2)}deg)`,
              transformOrigin: `50% ${h}`,
              opacity: l,
            }
          : {
              transform: `rotate(${w(e).toFixed(2)}deg)`,
              transformOrigin: `${e >= 0 ? "100%" : "0%"} ${h}`,
              opacity: l,
            };
      },
      k = (0, i.forwardRef)(function (
        {
          text: e = "One good move",
          as: t = "span",
          color: a = "currentColor",
          fall: l = "side",
          direction: r = "right",
          intro: s = !0,
          trigger: h = "view",
          delay: w = 0.2,
          stagger: k = 0.03,
          gravity: M = 1,
          lean: S = 58,
          stiffness: j = 1,
          damping: C = 0.55,
          hold: A = 1.2,
          push: I = 1,
          toppleAt: T = 30,
          chain: E = !0,
          clickTopple: P = !0,
          shade: F = 0.6,
          loop: L = !1,
          loopDelay: O = 8,
          area: D = "parent",
          paused: H = !1,
          className: R,
          style: N,
        },
        U,
      ) {
        let z = (0, i.useRef)(null),
          W = (0, i.useRef)(null),
          B = (0, i.useRef)(null),
          $ = (0, i.useSyncExternalStore)(f, m, () => !1) || H,
          q = (0, i.useMemo)(
            () =>
              e
                .split(/(\s+)/)
                .filter((e) => e.length > 0)
                .map((e) => ({
                  value: e,
                  space: /^\s+$/.test(e),
                  glyphs:
                    "undefined" == typeof Intl || void 0 === Intl.Segmenter
                      ? Array.from(e)
                      : Array.from(
                          new Intl.Segmenter(void 0, {
                            granularity: "grapheme",
                          }).segment(e),
                          (e) => e.segment,
                        ),
                })),
            [e],
          ),
          X = {
            fall: l,
            direction: r,
            intro: s,
            trigger: h,
            delay: w,
            stagger: k,
            gravity: M,
            lean: S,
            stiffness: j,
            damping: C,
            hold: A,
            push: I,
            toppleAt: T,
            chain: E,
            clickTopple: P,
            shade: F,
            loop: L,
            loopDelay: O,
            area: D,
          },
          Y = (0, i.useRef)(X);
        ((0, i.useEffect)(() => {
          Y.current = X;
        }),
          (0, i.useEffect)(() => {
            var e;
            let t,
              a,
              n,
              i,
              l,
              r,
              s,
              o,
              h,
              f,
              m,
              c,
              g,
              v,
              b,
              y,
              w,
              k,
              M,
              S,
              j,
              C,
              A,
              I,
              T,
              E,
              P,
              F,
              L,
              O,
              D,
              H,
              R,
              N,
              U,
              q,
              X = z.current,
              _ = W.current;
            if (!X || !_ || $) return;
            let G =
              ((e = () => Y.current),
              (a = (t = Array.from(
                _.querySelectorAll("[data-domino-letter]"),
              ).map((e, t) => ({
                node: e,
                index: t,
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                height: 1,
                line: 0,
                a: 0,
                w: 0,
                mode: 0,
                dir: 1,
                wave: 1,
                rest: d,
                riseAt: 1 / 0,
                passed: !1,
                origin: 0,
                ghost: !1,
              }))).length),
              (n = 0),
              (i = 0),
              (l = 0),
              (r = !1),
              (s = !1),
              (o = 0),
              (h = 0),
              (f = 0),
              (m = 0),
              (c = 0),
              (g = 0),
              (v = !1),
              (b = () => {
                let e = -1,
                  a = -1 / 0;
                for (let n of t) {
                  let t = n.node,
                    i = t.offsetLeft,
                    l = t.offsetTop;
                  (l > a + 2 && (e++, (a = l)),
                    (n.left = i),
                    (n.right = i + t.offsetWidth),
                    (n.top = l),
                    (n.bottom = l + t.offsetHeight),
                    (n.height = Math.max(t.offsetHeight, 1)),
                    (n.line = e));
                }
              }),
              (y = (e, a) => t[e.index + a] ?? null),
              (w = (t) => {
                if ("back" === e().fall) return 0.42;
                let a = y(t, t.wave);
                return a
                  ? a.line !== t.line
                    ? 0.6
                    : 0.16 +
                      1.3 *
                        Math.asin(
                          u(
                            (t.wave > 0 ? a.left - t.right : t.left - a.right) /
                              t.height,
                            0,
                            0.9,
                          ),
                        )
                  : d;
              }),
              (k = () => {
                let n = e();
                for (let e of t) {
                  let t = e.node.style;
                  if (0 === e.mode && 5e-4 > Math.abs(e.a)) {
                    0 !== e.origin &&
                      ((t.transform = ""),
                      (t.transformOrigin = ""),
                      (t.opacity = ""),
                      (t.zIndex = ""),
                      (e.origin = 0));
                    continue;
                  }
                  let i = e.ghost
                      ? u((1 - Math.abs(e.a) / e.rest) * 1.7, 0, 1)
                      : 1,
                    l = x(e.a, n.fall, n.shade, i);
                  ((t.transform = l.transform),
                    (t.opacity = l.opacity.toFixed(3)));
                  let r = "back" === n.fall ? 2 : e.a >= 0 ? 1 : -1;
                  (r !== e.origin &&
                    ((t.transformOrigin = l.transformOrigin), (e.origin = r)),
                    "side" === n.fall && Math.abs(e.a) > 0.05
                      ? (t.zIndex = String(
                          e.a > 0 ? 1 + a - e.index : 1 + e.index,
                        ))
                      : (t.zIndex = ""));
                }
              }),
              (M = (t, a, i, l) => {
                if (1 === t.mode || 2 === t.mode) return;
                ((t.ghost = !1),
                  (t.mode = 1),
                  (t.dir = a),
                  (t.wave = i),
                  (t.passed = !1),
                  (t.rest = ((t, a) => {
                    let n = e();
                    if ("back" === n.fall) return p;
                    let i = y(t, a);
                    return n.chain && i && i.line === t.line
                      ? (u(n.lean, 20, 88) * Math.PI) / 180
                      : d;
                  })(t, a)),
                  (t.w = a * Math.max(Math.abs(l), 0.9)));
                let r = e().hold;
                t.riseAt = r >= 30 ? 1 / 0 : n + Math.max(r, 0.2) + 0.35;
              }),
              (S = (e, t) => {
                (2 === e.mode || 1 === e.mode) &&
                  (e.riseAt = Math.min(e.riseAt, t));
              }),
              (j = (a) => {
                let i = e();
                n += a;
                let l = 2 * Math.PI * 2.2 * u(i.stiffness, 0.1, 5),
                  r = u(i.damping, 0.05, 2),
                  s = 80 * u(i.gravity, 0.05, 5),
                  o = (u(i.toppleAt, 1, 90) * Math.PI) / 180;
                for (let e of t)
                  if (0 === e.mode || 3 === e.mode) {
                    let t = -l * l * e.a - 2 * r * l * e.w;
                    if (
                      ((e.w += t * a),
                      (e.a += e.w * a),
                      3 === e.mode && !e.passed && Math.abs(e.a) < 0.9 * e.rest)
                    ) {
                      e.passed = !0;
                      let t = y(e, e.wave);
                      t && 2 === t.mode && S(t, n + u(i.stagger, 0, 2));
                    }
                    if (
                      (3 === e.mode &&
                        0.004 > Math.abs(e.a) &&
                        0.05 > Math.abs(e.w) &&
                        (e.mode = 0),
                      e.ghost &&
                        Math.abs(e.a) < 0.35 * e.rest &&
                        (e.ghost = !1),
                      0 === e.mode && Math.abs(e.a) > o)
                    ) {
                      let t = "back" === i.fall ? 1 : Math.sign(e.a),
                        a = "back" === i.fall ? (m >= 0 ? 1 : -1) : t;
                      M(e, t, a, e.w);
                    }
                  } else if (1 === e.mode) {
                    if (
                      ((e.w += e.dir * s * Math.sin(Math.abs(e.a) + 0.08) * a),
                      (e.a += e.w * a),
                      !e.passed && Math.abs(e.a) >= w(e))
                    ) {
                      e.passed = !0;
                      let t = y(e, e.wave);
                      i.chain &&
                        t &&
                        (0 === t.mode || 3 === t.mode) &&
                        M(
                          t,
                          "back" === i.fall ? 1 : e.wave,
                          e.wave,
                          0.55 * e.w,
                        );
                    }
                    e.a * e.dir >= e.rest &&
                      ((e.a = e.dir * e.rest),
                      (e.w = -(0.22 * e.w)),
                      (e.mode = 2));
                  } else if (2 === e.mode) {
                    let t = e.dir * e.rest,
                      i = 1.6 * l;
                    ((e.w += (-i * i * (e.a - t) - 2 * i * e.w) * a),
                      (e.a += e.w * a),
                      Math.abs(e.a) > e.rest && ((e.a = t), (e.w = 0)),
                      n >= e.riseAt &&
                        ((e.mode = 3),
                        (e.passed = !1),
                        (e.riseAt = 1 / 0),
                        (e.w = 0)));
                  }
              }),
              (C = () =>
                t.some(
                  (e) =>
                    1 === e.mode ||
                    3 === e.mode ||
                    (2 === e.mode &&
                      (e.riseAt !== 1 / 0 || Math.abs(e.w) > 0.01)) ||
                    (0 === e.mode &&
                      (Math.abs(e.a) > 5e-4 || Math.abs(e.w) > 0.01)),
                )),
              (A = () => {
                window.clearTimeout(o);
                let t = e();
                t.loop &&
                  (o = window.setTimeout(
                    () => {
                      (C() || F(), A());
                    },
                    1e3 * u(t.loopDelay, 1, 120),
                  ));
              }),
              (I = (e) => {
                let t = Math.min(Math.max((e - l) / 1e3, 0), 0.05);
                l = e;
                let a = Math.max(1, Math.ceil(t / (1 / 240)));
                for (let e = 0; e < a; e++) j(t / a);
                (k(), C() ? (i = requestAnimationFrame(I)) : (r = !1));
              }),
              (T = () => {
                r ||
                  ((r = !0),
                  (l = performance.now()),
                  (i = requestAnimationFrame(I)));
              }),
              (E = () => {
                let a = e(),
                  n = "left" === a.direction ? -1 : 1;
                for (let e of t)
                  ((e.mode = 2),
                    (e.dir = "back" === a.fall ? 1 : n),
                    (e.wave = n),
                    (e.rest = "back" === a.fall ? p : d),
                    (e.a = e.dir * e.rest),
                    (e.w = 0),
                    (e.riseAt = 1 / 0),
                    (e.passed = !1),
                    (e.ghost = !0));
                k();
              }),
              (P = () => {
                let i = e();
                if (0 === a) return;
                (b(), t.every((e) => 0 === e.mode) && E());
                let l = "left" === i.direction ? t[a - 1] : t[0];
                for (let e of t) e.wave = "left" === i.direction ? -1 : 1;
                (S(l, n + u(i.delay, 0, 10)), T());
              }),
              (F = () => {
                let n = e();
                if (0 === a) return;
                b();
                let i = "left" === n.direction ? -1 : 1;
                (M(i > 0 ? t[0] : t[a - 1], "back" === n.fall ? 1 : i, i, 1.5),
                  T());
              }),
              (L = "parent" === e().area ? (X.parentElement ?? X) : X),
              (O = (a) => {
                if ("touch" === a.pointerType) return;
                let n = _.getBoundingClientRect(),
                  i = a.clientX - n.left,
                  l = a.clientY - n.top,
                  r = performance.now(),
                  s = r - g;
                if (v && g > 0 && s < 120) {
                  let a = Math.max(s, 4) / 1e3;
                  ((m += ((i - h) / a - m) * 0.6),
                    (c += ((l - f) / a - c) * 0.6),
                    ((a, n, i, l, r, s) => {
                      let o = e();
                      if (o.push <= 0) return;
                      let d = Math.hypot(i - a, l - n);
                      if (d < 0.5) return;
                      let p = Math.hypot(r, s),
                        h = "back" === o.fall ? p : r,
                        f = Math.min(48, Math.max(2, Math.ceil(d / 4))),
                        m = d / f,
                        c = !1;
                      for (let e of t) {
                        if (0 !== e.mode) continue;
                        let t = (e.right - e.left) * 0.6 + 6,
                          r = (e.left + e.right) / 2,
                          s = (e.top + e.bottom) / 2,
                          d = 0,
                          g = 0;
                        for (let o = 0; o < f; o++) {
                          let p = (o + 0.5) / f,
                            h = a + (i - a) * p,
                            c = n + (l - n) * p,
                            v = (h - r) / t,
                            b = (c - s) / (0.65 * e.height),
                            y = Math.exp(-v * v - b * b) * m;
                          ((d += y),
                            (g += y * u((e.bottom - c) / e.height, 0.15, 1.2)));
                        }
                        if (d < 0.01) continue;
                        ((g /= d), (d /= Math.sqrt(Math.PI) * t));
                        let v =
                          0.5 *
                          o.push *
                          (h / e.height) *
                          Math.sqrt(p / 600) *
                          d *
                          g;
                        ((e.w += v), (c = !0));
                      }
                      c && T();
                    })(h, f, i, l, m, c));
                } else ((m = 0), (c = 0), b());
                ((h = i), (f = l), (g = r), (v = !0));
              }),
              (D = () => {
                v = !1;
              }),
              (H = (n) => {
                ((n, i) => {
                  let l = e();
                  if (!l.clickTopple || 0 === a) return;
                  b();
                  let r = _.getBoundingClientRect(),
                    s = n - r.left,
                    o = i - r.top,
                    d = t[0],
                    p = 1 / 0;
                  for (let e of t) {
                    let t = Math.hypot(
                      (e.left + e.right) / 2 - s,
                      (e.top + e.bottom) / 2 - o,
                    );
                    t < p && ((p = t), (d = e));
                  }
                  let h = s < (d.left + d.right) / 2 ? 1 : -1,
                    u = "back" === l.fall;
                  M(d, u ? 1 : h, h, 2.2);
                  let f = y(d, -h);
                  (f && f.line === d.line && M(f, u ? 1 : -h, -h, 2.2), T());
                })(n.clientX, n.clientY);
              }),
              L.addEventListener("pointermove", O, { passive: !0 }),
              L.addEventListener("pointerleave", D, { passive: !0 }),
              L.addEventListener("pointerdown", H, { passive: !0 }),
              (R =
                "undefined" == typeof ResizeObserver
                  ? null
                  : new ResizeObserver(() => b())),
              R?.observe(_),
              b(),
              (N = e()),
              (U = () => {
                s || ((s = !0), P());
              }),
              (q = null),
              N.intro
                ? (E(),
                  "view" === N.trigger &&
                  "undefined" != typeof IntersectionObserver
                    ? (q = new IntersectionObserver(
                        ([e]) => {
                          e.isIntersecting && U();
                        },
                        { threshold: 0.35 },
                      )).observe(X)
                    : U())
                : k(),
              A(),
              {
                rise: () => {
                  ((s = !0), E(), P());
                },
                topple: F,
                destroy: () => {
                  for (let e of (cancelAnimationFrame(i),
                  window.clearTimeout(o),
                  R?.disconnect(),
                  q?.disconnect(),
                  L.removeEventListener("pointermove", O),
                  L.removeEventListener("pointerleave", D),
                  L.removeEventListener("pointerdown", H),
                  t)) {
                    let t = e.node.style;
                    ((t.transform = ""),
                      (t.transformOrigin = ""),
                      (t.opacity = ""),
                      (t.zIndex = ""));
                  }
                },
              });
            return (
              (B.current = G),
              () => {
                (G.destroy(), B.current === G && (B.current = null));
              }
            );
          }, [e, $, l, r, s, h, D, L]),
          (0, i.useImperativeHandle)(
            U,
            () => ({
              rise: () => B.current?.rise(),
              topple: () => B.current?.topple(),
            }),
            [],
          ));
        let [_] = (0, i.useState)(() => ({
            intro: s,
            shade: F,
            fall: l,
            direction: r,
          })),
          G = !$ && _.intro,
          V = "left" === _.direction ? -1 : 1;
        return (0, n.jsxs)(t, {
          ref: z,
          className: (0, o.cn)("relative inline-block", R),
          style: N,
          children: [
            (0, n.jsx)("span", { style: c, children: e }),
            (0, n.jsx)(
              "span",
              {
                "aria-hidden": "true",
                ref: W,
                style: { ...g, color: a },
                children: q.map((e, t) =>
                  e.space
                    ? (0, n.jsx)("span", { style: v, children: e.value }, t)
                    : (0, n.jsx)(
                        "span",
                        {
                          style: b,
                          children: e.glyphs.map((e, t) => {
                            let a = y;
                            if (G) {
                              let e = x(
                                "back" === _.fall ? p : V * d,
                                _.fall,
                                _.shade,
                                0,
                              );
                              a = {
                                ...y,
                                transform: e.transform,
                                transformOrigin: e.transformOrigin,
                                opacity: e.opacity,
                              };
                            }
                            return (0, n.jsx)(
                              "span",
                              {
                                "data-domino-letter": "",
                                style: a,
                                children: e,
                              },
                              t,
                            );
                          }),
                        },
                        t,
                      ),
                ),
              },
              e,
            ),
          ],
        });
      }),
      M = {
        domino: {
          fall: "side",
          direction: "right",
          gravity: 1,
          lean: 58,
          stiffness: 1,
          damping: 0.55,
          push: 1,
          toppleAt: 30,
        },
        flip: {
          fall: "back",
          direction: "right",
          gravity: 1,
          lean: 58,
          stiffness: 1,
          damping: 0.5,
          push: 1,
          toppleAt: 34,
        },
        rewind: {
          fall: "side",
          direction: "left",
          gravity: 1,
          lean: 58,
          stiffness: 1,
          damping: 0.55,
          push: 1,
          toppleAt: 30,
        },
        rubber: {
          fall: "side",
          direction: "right",
          gravity: 1.3,
          lean: 64,
          stiffness: 1.3,
          damping: 0.3,
          push: 1.3,
          toppleAt: 36,
        },
        heavy: {
          fall: "side",
          direction: "right",
          gravity: 0.55,
          lean: 50,
          stiffness: 0.7,
          damping: 0.8,
          push: 0.6,
          toppleAt: 28,
        },
        steady: {
          fall: "side",
          direction: "right",
          gravity: 1,
          lean: 58,
          stiffness: 1,
          damping: 0.6,
          push: 0.7,
          toppleAt: 90,
        },
      },
      S = [
        { label: "Domino", value: "domino" },
        { label: "Flip", value: "flip" },
        { label: "Rewind", value: "rewind" },
        { label: "Rubber", value: "rubber" },
        { label: "Heavy", value: "heavy" },
        { label: "Steady", value: "steady" },
      ],
      j = [
        { label: "Side", value: "side" },
        { label: "Back", value: "back" },
      ],
      C = [
        { label: "Right", value: "right" },
        { label: "Left", value: "left" },
      ],
      A = [
        { label: "In View", value: "view" },
        { label: "Mount", value: "mount" },
      ],
      I = [
        { label: "Semibold", value: "600" },
        { label: "Bold", value: "700" },
        { label: "Black", value: "800" },
      ],
      T = [
        {
          name: "text",
          type: "string",
          default: '"One good move"',
          description:
            "Text to display. Words wrap as whole units and whitespace is preserved.",
        },
        {
          name: "as",
          type: '"span" | "div" | "p" | "h1" | … | "h6"',
          default: '"span"',
          description:
            "Element to render. The component inherits font, size and alignment from its parent.",
        },
        {
          name: "color",
          type: "string",
          default: '"currentColor"',
          description:
            "Colour of the letters. Defaults to the surrounding text colour.",
        },
        {
          name: "fall",
          type: '"side" | "back"',
          default: '"side"',
          description:
            "How letters tip over: sideways in the plane, pivoting on a bottom corner like dominoes, or backwards away from the viewer, folding flat onto the baseline.",
        },
        {
          name: "direction",
          type: '"right" | "left"',
          default: '"right"',
          description:
            "Which way the intro chain runs, and the way the whole line falls when toppled from code.",
        },
        {
          name: "intro",
          type: "boolean",
          default: "true",
          description:
            "Letters start lying down and spring upright one after another, fading in as they rise.",
        },
        {
          name: "trigger",
          type: '"view" | "mount"',
          default: '"view"',
          description:
            "When the intro plays: the first time the text scrolls into view, or as soon as it mounts.",
        },
        {
          name: "delay",
          type: "number",
          default: "0.2",
          description: "Seconds before the first letter rises.",
        },
        {
          name: "stagger",
          type: "number",
          default: "0.03",
          description: "Extra seconds between one letter rising and the next.",
        },
        {
          name: "gravity",
          type: "number",
          default: "1",
          description:
            "How quickly toppled letters fall. Higher values make the chain run faster.",
        },
        {
          name: "lean",
          type: "number",
          default: "58",
          description:
            "Angle, in degrees, at which a toppled letter comes to rest against the next one. The last letter in a line lies flat.",
        },
        {
          name: "stiffness",
          type: "number",
          default: "1",
          description: "Stiffness of the spring that stands letters back up.",
        },
        {
          name: "damping",
          type: "number",
          default: "0.55",
          description:
            "Damping of that spring. Lower values rock back and forth more before settling upright.",
        },
        {
          name: "hold",
          type: "number",
          default: "1.2",
          description:
            "Seconds toppled letters stay down before the line rebuilds. 30 or more leaves them down.",
        },
        {
          name: "push",
          type: "number",
          default: "1",
          description:
            "How strongly the pointer nudges the letters it passes. Faster movement pushes harder. 0 turns it off.",
        },
        {
          name: "toppleAt",
          type: "number",
          default: "30",
          description:
            "Tilt, in degrees, past which a nudged letter falls over and starts a chain. 90 means the pointer never topples letters.",
        },
        {
          name: "chain",
          type: "boolean",
          default: "true",
          description:
            "Falling letters knock over their neighbours, like dominoes.",
        },
        {
          name: "clickTopple",
          type: "boolean",
          default: "true",
          description:
            "Clicking knocks the line down outward from the clicked letter.",
        },
        {
          name: "shade",
          type: "number",
          default: "0.6",
          description: "How much tilted letters dim, from 0 to 1.",
        },
        {
          name: "loop",
          type: "boolean",
          default: "false",
          description:
            "Topple and rebuild the line on its own every loopDelay seconds.",
        },
        {
          name: "loopDelay",
          type: "number",
          default: "8",
          description: "Seconds between automatic topples when looping.",
        },
        {
          name: "area",
          type: '"parent" | "self"',
          default: '"parent"',
          description:
            "Where the pointer is followed: anywhere over the parent element, or only over the text.",
        },
        {
          name: "paused",
          type: "boolean",
          default: "false",
          description:
            "Shows the text upright and still. Reduced-motion users always get this.",
        },
        {
          name: "ref",
          type: "{ rise, topple }",
          default: "—",
          description:
            "Imperative controls: replay the intro, or knock the whole line over from its start.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element, for example font size and weight.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      E = () => {
        let [e, t] = (0, s.I)(),
          a = (0, r.Y)(),
          [o, d] = (0, i.useState)(null),
          p = o ?? ("dark" === a ? "#FFFFFF" : "#0A0A0A"),
          [h, u] = (0, i.useState)("domino"),
          [f, m] = (0, i.useState)(M.domino),
          c = (e) => (t) => m((a) => ({ ...a, [e]: t })),
          [g, v] = (0, i.useState)("One good move"),
          [b, y] = (0, i.useState)(104),
          [w, x] = (0, i.useState)("700"),
          [E, P] = (0, i.useState)("view"),
          [F, L] = (0, i.useState)(0.2),
          [O, D] = (0, i.useState)(0.03),
          [H, R] = (0, i.useState)(1.2),
          [N, U] = (0, i.useState)(0.6),
          [z, W] = (0, i.useState)(8),
          [B, $] = (0, i.useState)(!0),
          [q, X] = (0, i.useState)(!0),
          [Y, _] = (0, i.useState)(!0),
          [G, V] = (0, i.useState)(!1),
          [J, K] = (0, i.useState)(!1),
          [Q, Z] = (0, i.useState)(!1);
        return (0, n.jsxs)("div", {
          children: [
            (0, n.jsx)(l.Bg, {}),
            (0, n.jsxs)(l.VX, {
              children: [
                (0, n.jsxs)(l.Ec, {
                  children: [
                    (0, n.jsx)(l.Ch, {
                      onRefresh: t,
                      minHeight: 500,
                      enableResponsive: !0,
                      children: (0, n.jsx)("div", {
                        className:
                          "flex h-full w-full items-center justify-center px-6 py-12 text-center sm:px-10",
                        children: (0, n.jsx)(
                          k,
                          {
                            as: "h2",
                            text: g,
                            color: p,
                            fall: f.fall,
                            direction: f.direction,
                            intro: B,
                            trigger: E,
                            delay: F,
                            stagger: O,
                            gravity: f.gravity,
                            lean: f.lean,
                            stiffness: f.stiffness,
                            damping: f.damping,
                            hold: H,
                            push: f.push,
                            toppleAt: f.toppleAt,
                            chain: q,
                            clickTopple: Y,
                            shade: N,
                            loop: G,
                            loopDelay: z,
                            paused: Q,
                            style: {
                              fontSize: `min(${b}px, 13vw)`,
                              fontWeight: Number(w),
                              letterSpacing: "-0.035em",
                              lineHeight: 1.05,
                              textTransform: J ? "uppercase" : void 0,
                            },
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, n.jsxs)(l.IH, {
                      children: [
                        (0, n.jsx)(l.bg, {
                          title: "Preset",
                          value: h,
                          options: S,
                          onChange: (e) => {
                            (u(e), m(M[e] ?? M.domino));
                          },
                        }),
                        (0, n.jsx)(l.UD, {
                          title: "Text",
                          value: g,
                          onChange: v,
                        }),
                        (0, n.jsx)(l.W7, {
                          title: "Color",
                          value: p,
                          onChange: d,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Font Size",
                          min: 24,
                          max: 180,
                          step: 1,
                          value: b,
                          valueUnit: "px",
                          onChange: y,
                        }),
                        (0, n.jsx)(l.bg, {
                          title: "Weight",
                          value: w,
                          options: I,
                          onChange: x,
                        }),
                        (0, n.jsx)(l.bg, {
                          title: "Fall",
                          value: f.fall,
                          options: j,
                          onChange: (e) => c("fall")(e),
                        }),
                        (0, n.jsx)(l.bg, {
                          title: "Direction",
                          value: f.direction,
                          options: C,
                          onChange: (e) => c("direction")(e),
                        }),
                        (0, n.jsx)(l.bg, {
                          title: "Trigger",
                          value: E,
                          options: A,
                          onChange: (e) => P(e),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Delay",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: F,
                          valueUnit: "s",
                          onChange: L,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Stagger",
                          min: 0,
                          max: 0.3,
                          step: 0.005,
                          value: O,
                          valueUnit: "s",
                          onChange: D,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Gravity",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: f.gravity,
                          onChange: c("gravity"),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Lean",
                          min: 20,
                          max: 88,
                          step: 1,
                          value: f.lean,
                          valueUnit: "\xb0",
                          onChange: c("lean"),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Stiffness",
                          min: 0.3,
                          max: 3,
                          step: 0.05,
                          value: f.stiffness,
                          onChange: c("stiffness"),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Damping",
                          min: 0.1,
                          max: 1.5,
                          step: 0.01,
                          value: f.damping,
                          onChange: c("damping"),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Hold",
                          min: 0.2,
                          max: 6,
                          step: 0.1,
                          value: H,
                          valueUnit: "s",
                          onChange: R,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Push",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: f.push,
                          onChange: c("push"),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Topple At",
                          min: 10,
                          max: 90,
                          step: 1,
                          value: f.toppleAt,
                          valueUnit: "\xb0",
                          onChange: c("toppleAt"),
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Shade",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: N,
                          onChange: U,
                        }),
                        (0, n.jsx)(l.yt, {
                          title: "Loop Delay",
                          min: 2,
                          max: 20,
                          step: 0.5,
                          value: z,
                          valueUnit: "s",
                          onChange: W,
                        }),
                        (0, n.jsx)(l.tl, {
                          title: "Intro",
                          checked: B,
                          onChange: $,
                        }),
                        (0, n.jsx)(l.tl, {
                          title: "Chain",
                          checked: q,
                          onChange: X,
                        }),
                        (0, n.jsx)(l.tl, {
                          title: "Click Topple",
                          checked: Y,
                          onChange: _,
                        }),
                        (0, n.jsx)(l.tl, {
                          title: "Loop",
                          checked: G,
                          onChange: V,
                        }),
                        (0, n.jsx)(l.tl, {
                          title: "Uppercase",
                          checked: J,
                          onChange: K,
                        }),
                        (0, n.jsx)(l.tl, {
                          title: "Paused",
                          checked: Q,
                          onChange: Z,
                        }),
                      ],
                    }),
                    (0, n.jsx)(l.Ub, { data: T }),
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
