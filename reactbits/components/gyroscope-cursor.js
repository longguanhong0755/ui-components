/* ReactBits Pro public preview module 24179 for gyroscope-cursor.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/24179.0b5f6637d7b86873.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  24179: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => C }));
    var r = n(95155),
      a = n(12115),
      i = n(56388),
      o = n(86049),
      s = n(90761),
      l = n(90650);
    let c = 2 * Math.PI,
      d = 1 / 240,
      u =
        'a[href],button:not(:disabled),[role="button"],[role="link"],[role="tab"],[role="menuitem"],[role="option"],[role="switch"],[role="checkbox"],input[type="button"],input[type="submit"],input[type="reset"],input[type="checkbox"],input[type="radio"],input[type="range"],input[type="color"],input[type="file"],label[for],select,summary,[data-cursor="pointer"]',
      h =
        'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="image"]):not([type="hidden"]),textarea,[contenteditable]:not([contenteditable="false"]),[data-cursor="native"]',
      p = (e, t, n) => Math.min(n, Math.max(t, e)),
      m = (e) => {
        let t = p(e, 0, 1);
        return t * t * (3 - 2 * t);
      },
      y = (e) => e - c * Math.floor((e + Math.PI) / c),
      x = (e, t) => t + y(e - t),
      g = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      v = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      f = new Float64Array(2),
      b = (e, t, n, r, a, i) => {
        let o = t,
          s = e,
          l = i;
        for (; l > 1e-6;) {
          let e = Math.min(d, l);
          ((l -= e),
            (o += (r * r * (n - s) - 2 * a * r * o) * e),
            (s += o * e));
        }
        ((f[0] = s), (f[1] = o));
      },
      w = (0, a.forwardRef)(function (
        {
          color: e = "#5227FF",
          outlineColor: t = "#FFFFFF",
          size: n = 24,
          outlineWidth: i = 3,
          shadow: o = 0.5,
          turn: s = 1,
          turnSpeed: d = 1,
          overshoot: w = 0.4,
          stretch: F = 0.4,
          settle: M = 0.45,
          restAngle: k = -45,
          press: A = !0,
          ripple: C = !0,
          hover: S = !0,
          label: $ = "",
          autoplay: j = !1,
          autoplaySpeed: E = 1,
          idleDelay: L = 1.5,
          interactive: V = !0,
          disabled: R = !1,
          className: I,
          style: T,
          children: P,
        },
        N,
      ) {
        let U,
          W = (0, a.useId)(),
          z = (0, a.useRef)(null),
          D = (0, a.useRef)(null),
          H = (0, a.useRef)(null),
          B = (0, a.useRef)(null),
          O = (0, a.useRef)(null),
          Y = (0, a.useRef)(null),
          X = (0, a.useRef)(null),
          G = {
            color: e,
            outlineColor: t,
            size: n,
            outlineWidth: i,
            shadow: o,
            turn: s,
            turnSpeed: d,
            overshoot: w,
            stretch: F,
            settle: M,
            restAngle: k,
            press: A,
            ripple: C,
            hover: S,
            label: $,
            autoplay: j,
            autoplaySpeed: E,
            idleDelay: L,
            interactive: V,
            disabled: R,
            reduced: (0, a.useSyncExternalStore)(g, v, () => !1),
          },
          q = (0, a.useRef)(G);
        return (
          (0, a.useEffect)(() => {
            ((q.current = G), X.current?.sync());
          }),
          (0, a.useEffect)(() => {
            let e = z.current,
              t = D.current,
              n = H.current,
              r = B.current,
              a = O.current,
              i = Y.current;
            if (!e || !t || !n || !r || !a || !i) return;
            let o = ((e, t) => {
              let { root: n, body: r, arrow: a, path: i, tag: o, rings: s } = e,
                l = n.ownerDocument,
                d = l.defaultView ?? window,
                g = d.matchMedia("(pointer: fine)"),
                v = 0,
                w = 0,
                F = !1,
                M = !0,
                k = "none",
                A = "",
                C = 0,
                S = !1,
                $ = !1,
                j = "",
                E = !1,
                L = "",
                V = "",
                R = 1,
                I = {
                  x: 0,
                  y: 0,
                  clientX: 0,
                  clientY: 0,
                  vx: 0,
                  vy: 0,
                  time: 0,
                  inside: !1,
                  seen: !1,
                  fresh: !0,
                  leftAt: -1e9,
                  heard: 0,
                },
                T = {
                  x: 0,
                  y: 0,
                  vx: 0,
                  vy: 0,
                  angle: 0,
                  spin: 0,
                  aim: 0,
                  lastFast: -1e9,
                  stretch: 0,
                  press: 0,
                  pressV: 0,
                  pressed: !1,
                  hover: 0,
                  hoverV: 0,
                  presence: 0,
                  presenceV: 0,
                  wiggleAt: -1e9,
                  placed: !1,
                },
                P = { x: 0, y: 0, vx: 0, vy: 0, show: 0, showV: 0 },
                N = {
                  phase: "idle",
                  t0: 0,
                  duration: 1,
                  from: { x: 0, y: 0 },
                  c1: { x: 0, y: 0 },
                  c2: { x: 0, y: 0 },
                  to: { x: 0, y: 0 },
                  until: 0,
                  clickAt: -1,
                  releaseAt: -1,
                  wiggle: !1,
                  manualUntil: -1e9,
                  last: null,
                  arrive: [],
                },
                U = () => ((t.current.restAngle - 90) * Math.PI) / 180,
                W = () => {
                  let e = t.current;
                  return e.interactive && !e.disabled && g.matches;
                },
                z = () => {
                  let e = t.current,
                    n = p(e.size, 8, 160),
                    l = p(e.outlineWidth, 0, 0.35 * n),
                    c = `${n}:${l}`;
                  if (c !== A) {
                    let e, t, r;
                    A = c;
                    let s = l + 2,
                      d = n + 2 * s,
                      u = +n + 2 * s;
                    (a.setAttribute(
                      "viewBox",
                      `${-n - s} ${-n / 2 - s} ${d} ${u}`,
                    ),
                      a.setAttribute("width", `${d}`),
                      a.setAttribute("height", `${u}`),
                      (a.style.left = `${-n - s}px`),
                      (a.style.top = `${-n / 2 - s}px`),
                      (a.style.transformOrigin = `${n + s}px ${n / 2 + s}px`),
                      i.setAttribute(
                        "d",
                        ((e = n / 2),
                        (r = ""),
                        (t = [
                          [0, 0, 0.09 * n],
                          [-n, -e, 0.16 * n],
                          [-(0.8 * n), 0, 0.12 * n],
                          [-n, e, 0.16 * n],
                        ]).forEach(([e, n, a], i) => {
                          let [o, s] = t[(i + t.length - 1) % t.length],
                            [l, c] = t[(i + 1) % t.length],
                            d = Math.hypot(o - e, s - n),
                            u = Math.hypot(l - e, c - n),
                            h = e + ((o - e) / d) * a,
                            p = n + ((s - n) / d) * a,
                            m = e + ((l - e) / u) * a,
                            y = n + ((c - n) / u) * a;
                          r += `${0 === i ? "M" : "L"}${h.toFixed(3)} ${p.toFixed(3)}Q${e.toFixed(3)} ${n.toFixed(3)} ${m.toFixed(3)} ${y.toFixed(3)}`;
                        }),
                        `${r}Z`),
                      ),
                      i.setAttribute("stroke-width", `${2 * l}`),
                      (o.style.fontSize = `${p(0.5 * n, 11, 16)}px`));
                  }
                  (i.setAttribute("fill", e.color),
                    i.setAttribute("stroke", l > 0 ? e.outlineColor : "none"));
                  let d = p(e.shadow, 0, 1);
                  ((r.style.filter =
                    d > 0
                      ? `drop-shadow(0 ${0.5 + d}px ${1 + d}px rgba(0,0,0,${(0.22 * d).toFixed(3)})) drop-shadow(0 ${2 + 3 * d}px ${4 + 6 * d}px rgba(0,0,0,${(0.16 * d).toFixed(3)}))`
                      : "none"),
                    (o.style.background = e.color),
                    (o.style.color = e.outlineColor));
                  let u =
                    l > 0
                      ? `0 0 0 ${Math.min(0.6 * l, 2).toFixed(2)}px ${e.outlineColor},`
                      : "";
                  for (let t of ((o.style.boxShadow = `${u}0 ${1 + 2 * d}px ${3 + 6 * d}px rgba(0,0,0,${(0.22 * d).toFixed(3)})`),
                  s))
                    ((t.style.borderColor = e.color),
                      (t.style.boxShadow =
                        l > 0
                          ? `0 0 0 1px ${e.outlineColor}, inset 0 0 0 1px ${e.outlineColor}`
                          : "none"));
                },
                D = !1,
                H = (e) => {
                  e !== D &&
                    ((D = e),
                    e
                      ? n.setAttribute("data-active", "")
                      : n.removeAttribute("data-active"));
                },
                B = (e) => {
                  let t = e && 1 === e.nodeType ? e : null,
                    r = t?.closest(h);
                  $ = !!r && n.contains(r);
                  let a = t?.closest(u);
                  S = !!a && n.contains(a);
                  let i = t?.closest("[data-cursor-label]");
                  j =
                    i && n.contains(i)
                      ? (i.getAttribute("data-cursor-label") ?? "")
                      : "";
                },
                O = (e, n) => {
                  let r = t.current;
                  if (!r.ripple || r.reduced) return;
                  let a = s[C++ % s.length],
                    i = 1.05 * p(r.size, 8, 160);
                  for (let e of ((a.style.width = `${2 * i}px`),
                  (a.style.height = `${2 * i}px`),
                  (a.style.left = `${-i}px`),
                  (a.style.top = `${-i}px`),
                  a.getAnimations()))
                    e.cancel();
                  a.animate(
                    [
                      {
                        transform: `translate3d(${e}px, ${n}px, 0) scale(0.12)`,
                        opacity: 1,
                      },
                      {
                        transform: `translate3d(${e}px, ${n}px, 0) scale(1)`,
                        opacity: 0,
                      },
                    ],
                    {
                      duration: 560,
                      easing: "cubic-bezier(0.16, 0.84, 0.3, 1)",
                      fill: "forwards",
                    },
                  );
                },
                Y = (e, t) => {
                  ((T.x = e),
                    (T.y = t),
                    (T.vx = 0),
                    (T.vy = 0),
                    (T.spin = 0),
                    (T.angle = x(U(), T.angle)),
                    (T.aim = T.angle),
                    (T.lastFast = -1e9),
                    (T.stretch = 0),
                    (T.placed = !0),
                    (P.x = e),
                    (P.y = t),
                    (P.vx = 0),
                    (P.vy = 0));
                },
                X = () => {
                  let e = n.getBoundingClientRect();
                  return {
                    rect: e,
                    width: Math.max(1, e.width),
                    height: Math.max(1, e.height),
                  };
                },
                G = (e, n, r, a) => {
                  let i = performance.now() / 1e3,
                    o = e - T.x,
                    s = n - T.y,
                    l = Math.hypot(o, s),
                    c = p(t.current.autoplaySpeed, 0.1, 5);
                  if (
                    ((N.from = { x: T.x, y: T.y }),
                    (N.to = { x: e, y: n }),
                    l < 1)
                  )
                    ((N.c1 = { ...N.from }), (N.c2 = { ...N.to }));
                  else {
                    let e = -s / l,
                      t = o / l,
                      n = (Math.random() - 0.5) * 0.7 * l;
                    ((N.c1 = {
                      x: T.x + 0.3 * o + e * n,
                      y: T.y + 0.3 * s + t * n,
                    }),
                      (N.c2 = {
                        x: T.x + 0.72 * o - e * n * 0.45,
                        y: T.y + 0.72 * s - t * n * 0.45,
                      }));
                  }
                  ((N.t0 = i),
                    (N.duration = Math.max(
                      0.05,
                      r ?? p(0.36 + l / 820, 0.45, 1.5) / c,
                    )),
                    (E = !1),
                    (L = ""),
                    (N.phase = "travel"),
                    (N.wiggle = !a && 0.35 > Math.random()),
                    (N.clickAt = a ? 1 : -1));
                },
                q = () => {
                  for (let e of N.arrive.splice(0)) e();
                },
                _ = () => {
                  if (!T.placed || "pointer" === k) {
                    let { width: e, height: t } = X(),
                      n = T.placed
                        ? {
                            x: p(T.x, 0.1 * e, 0.9 * e),
                            y: p(T.y, 0.1 * t, 0.9 * t),
                          }
                        : {
                            x: e * (0.3 + 0.4 * Math.random()),
                            y: t * (0.3 + 0.4 * Math.random()),
                          };
                    (Y(n.x, n.y), (T.presence = 0), (T.presenceV = 0));
                  }
                  ((N.phase = "idle"), (N.releaseAt = -1), (T.pressed = !1));
                },
                Q = () => {
                  F || !M || v || (v = d.requestAnimationFrame(Z));
                };
              function Z(e) {
                if (((v = 0), F)) return;
                let i = t.current,
                  s = w ? p((e - w) / 1e3, 0, 0.05) : 1 / 60;
                w = e;
                let d = performance.now() / 1e3,
                  h = ((e) => {
                    let n = t.current;
                    if (n.disabled) return "none";
                    if (W() && I.inside) return "pointer";
                    let r = N.arrive.length > 0 || e < N.manualUntil,
                      a = n.autoplay && !n.reduced;
                    return (!r && !a) ||
                      (!r && W() && I.seen && e - I.leftAt < n.idleDelay)
                      ? "none"
                      : "ghost";
                  })(d);
                if (
                  (h !== k &&
                    ("pointer" === h
                      ? (Y(I.x, I.y), (T.presence = 0), (T.presenceV = 0))
                      : "ghost" === h && _(),
                    (k = h)),
                  H(W() && I.seen),
                  "pointer" === k)
                ) {
                  let e = d - I.heard > 0.03 ? Math.exp(-s / 0.05) : 1;
                  ((I.vx *= e),
                    (I.vy *= e),
                    (T.x = I.x),
                    (T.y = I.y),
                    (T.vx = I.vx),
                    (T.vy = I.vy));
                } else
                  "ghost" === k &&
                    ((e) => {
                      let a = t.current,
                        i = p(a.autoplaySpeed, 0.1, 5);
                      if ("travel" === N.phase) {
                        let t,
                          r,
                          a,
                          o,
                          s,
                          c,
                          d,
                          h,
                          m,
                          y = p((e - N.t0) / N.duration, 0, 1),
                          x =
                            y < 0.5
                              ? 4 * y * y * y
                              : 1 - Math.pow(2 - 2 * y, 3) / 2,
                          g =
                            (y < 0.5
                              ? 12 * y * y
                              : 3 * Math.pow(2 - 2 * y, 2)) / N.duration,
                          v =
                            ((r = (t = 1 - x) * t * t),
                            (a = 3 * t * t * x),
                            (o = 3 * t * x * x),
                            (s = x * x * x),
                            {
                              x:
                                r * N.from.x +
                                a * N.c1.x +
                                o * N.c2.x +
                                s * N.to.x,
                              y:
                                r * N.from.y +
                                a * N.c1.y +
                                o * N.c2.y +
                                s * N.to.y,
                            }),
                          f =
                            ((d = 3 * (c = 1 - x) * c),
                            (h = 6 * c * x),
                            (m = 3 * x * x),
                            {
                              x:
                                d * (N.c1.x - N.from.x) +
                                h * (N.c2.x - N.c1.x) +
                                m * (N.to.x - N.c2.x),
                              y:
                                d * (N.c1.y - N.from.y) +
                                h * (N.c2.y - N.c1.y) +
                                m * (N.to.y - N.c2.y),
                            });
                        if (
                          ((T.x = v.x),
                          (T.y = v.y),
                          (T.vx = f.x * g),
                          (T.vy = f.y * g),
                          y >= 1)
                        ) {
                          let t = n.getBoundingClientRect(),
                            r = l.elementFromPoint(t.left + T.x, t.top + T.y);
                          if (r && n.contains(r)) {
                            let e = r.closest(u),
                              t = r.closest("[data-cursor-label]");
                            ((E = !!e && n.contains(e)),
                              (L =
                                t && n.contains(t)
                                  ? (t.getAttribute("data-cursor-label") ?? "")
                                  : ""));
                          }
                          ((N.phase = "dwell"),
                            (N.until = e + (0.55 + 0.6 * Math.random()) / i),
                            (N.clickAt = N.clickAt > 0 ? e + 0.12 / i : -1),
                            N.wiggle && (T.wiggleAt = e + 0.08),
                            q());
                        }
                        return;
                      }
                      if (((T.vx = 0), (T.vy = 0), "dwell" === N.phase)) {
                        if (
                          (N.clickAt >= 0 &&
                            e >= N.clickAt &&
                            ((N.clickAt = -1),
                            (T.pressed = !0),
                            (N.releaseAt = e + 0.11),
                            O(T.x, T.y)),
                          N.releaseAt >= 0 &&
                            e >= N.releaseAt &&
                            ((N.releaseAt = -1), (T.pressed = !1)),
                          e < N.until)
                        )
                          return;
                        N.phase = "idle";
                      }
                      if (a.autoplay && !a.reduced && e >= N.manualUntil) {
                        let e = (() => {
                          let { rect: e, width: t, height: a } = X(),
                            i = Array.from(
                              n.querySelectorAll("[data-cursor-target]"),
                            ),
                            o = (
                              i.length ? i : Array.from(n.querySelectorAll(u))
                            ).filter((t) => {
                              if (t === N.last || r.contains(t)) return !1;
                              let n = t.getBoundingClientRect();
                              return (
                                n.width > 4 &&
                                n.height > 4 &&
                                n.left >= e.left - 1 &&
                                n.right <= e.right + 1 &&
                                n.top >= e.top - 1 &&
                                n.bottom <= e.bottom + 1
                              );
                            });
                          if (o.length && 0.82 > Math.random()) {
                            let t = o[Math.floor(Math.random() * o.length)],
                              n = t.getBoundingClientRect();
                            return (
                              (N.last = t),
                              {
                                x:
                                  n.left -
                                  e.left +
                                  n.width * (0.35 + 0.3 * Math.random()),
                                y:
                                  n.top -
                                  e.top +
                                  n.height * (0.4 + 0.25 * Math.random()),
                                click: !0,
                              }
                            );
                          }
                          N.last = null;
                          let s = Math.min(0.16, 60 / Math.min(t, a));
                          return {
                            x: t * (s + (1 - 2 * s) * Math.random()),
                            y: a * (s + (1 - 2 * s) * Math.random()),
                            click: 0.3 > Math.random(),
                          };
                        })();
                        G(e.x, e.y, null, e.click);
                      }
                    })(d);
                let g = p(i.size, 8, 160),
                  M = p(i.outlineWidth, 0, 0.35 * g),
                  A = U(),
                  C = Math.hypot(T.vx, T.vy),
                  z = i.reduced ? 0 : p(i.turn, 0, 1);
                m((C - 40) / 260) > 0.25 && z > 0
                  ? ((T.aim = x(Math.atan2(T.vy, T.vx), T.angle)),
                    (T.lastFast = d))
                  : d - T.lastFast > Math.max(0, i.settle) &&
                    (T.aim = x(A, T.angle));
                let D = x(A, T.angle),
                  B = y(T.aim - D);
                Math.abs(B) > 0.9 * Math.PI
                  ? (B = Math.abs(B) * R)
                  : (R = Math.sign(B) || 1);
                let Z = x(D + z * B, T.angle),
                  J = 2.6 * c * p(i.turnSpeed, 0.1, 4),
                  K = 1 - 0.62 * p(i.overshoot, 0, 1);
                if (
                  (b(T.angle, T.spin, Z, J, K, s),
                  (T.angle = f[0]),
                  (T.spin = f[1]),
                  Math.abs(T.angle) > 64 * c)
                ) {
                  let e = y(T.angle);
                  ((T.aim += e - T.angle), (T.angle = e));
                }
                let ee = d - T.wiggleAt,
                  et =
                    ee >= 0 && ee < 0.8 && !i.reduced
                      ? 0.22 *
                        Math.sin(ee * c * 6.5) *
                        Math.pow(1 - ee / 0.8, 1.5)
                      : 0,
                  en = i.reduced
                    ? 0
                    : 0.24 * p(i.stretch, 0, 1) * m((C - 120) / 1600);
                T.stretch += (en - T.stretch) * (1 - Math.exp(-s / 0.06));
                let er = i.press && T.pressed ? 1 : 0;
                i.reduced
                  ? ((T.press = er), (T.pressV = 0))
                  : (b(T.press, T.pressV, er, 42, 0.5, s),
                    (T.press = f[0]),
                    (T.pressV = f[1]));
                let ea =
                  i.hover && (("pointer" === k && S) || ("ghost" === k && E))
                    ? 1
                    : 0;
                (b(T.hover, T.hoverV, ea, 26, 0.72, s),
                  (T.hover = f[0]),
                  (T.hoverV = f[1]));
                let ei = "pointer" === k ? +!$ : +("ghost" === k);
                (b(T.presence, T.presenceV, ei, 24, 0.9, s),
                  (T.presence = f[0]),
                  (T.presenceV = f[1]));
                let eo = p(T.presence, 0, 1),
                  es =
                    (0.62 + 0.38 * eo) *
                    (1 - 0.16 * T.press) *
                    (1 + 0.14 * T.hover),
                  el = es * (1 + T.stretch),
                  ec = es * (1 - 0.45 * T.stretch);
                ((r.style.transform = `translate3d(${T.x.toFixed(2)}px, ${T.y.toFixed(2)}px, 0)`),
                  (r.style.opacity = eo.toFixed(3)),
                  (a.style.transform = `rotate(${(T.angle + et).toFixed(4)}rad) scale(${el.toFixed(4)}, ${ec.toFixed(4)})`));
                let ed =
                  ("pointer" === k ? j : "ghost" === k ? L : "") || i.label;
                ed &&
                  ed !== V &&
                  ((o.textContent = ed), V && (P.showV += 4), (V = ed));
                let eu = ed ? eo : 0;
                (b(P.show, P.showV, eu, 24, 0.8, s),
                  (P.show = f[0]),
                  (P.showV = f[1]));
                let eh = T.x + 0.58 * g + 0.8 * M,
                  ep = T.y + 0.82 * g + 0.8 * M;
                i.reduced
                  ? ((P.x = eh), (P.y = ep))
                  : (b(P.x, P.vx, eh, 34, 0.86, s),
                    (P.x = f[0]),
                    (P.vx = f[1]),
                    b(P.y, P.vy, ep, 34, 0.86, s),
                    (P.y = f[0]),
                    (P.vy = f[1]));
                let em = p(P.show, 0, 1.2);
                ((o.style.transform = `translate3d(${P.x.toFixed(2)}px, ${P.y.toFixed(2)}px, 0) scale(${(0.7 + 0.3 * em).toFixed(4)})`),
                  (o.style.opacity = p(em, 0, 1).toFixed(3)));
                let ey =
                    C > 1 ||
                    Math.abs(T.spin) > 0.001 ||
                    Math.abs(Z - T.angle) > 0.001 ||
                    Math.abs(T.pressV) > 0.001 ||
                    Math.abs(T.press - er) > 0.001 ||
                    Math.abs(T.hoverV) > 0.001 ||
                    Math.abs(T.hover - ea) > 0.001 ||
                    Math.abs(T.presenceV) > 0.001 ||
                    Math.abs(T.presence - ei) > 0.001 ||
                    Math.abs(T.stretch) > 1e-4 ||
                    Math.abs(P.x - eh) > 0.05 ||
                    Math.abs(P.y - ep) > 0.05 ||
                    Math.abs(P.showV) > 0.001 ||
                    Math.abs(P.show - eu) > 0.001 ||
                    0 !== et ||
                    d - T.lastFast < i.settle + 0.05,
                  ex =
                    !i.disabled &&
                    W() &&
                    !I.inside &&
                    I.seen &&
                    i.autoplay &&
                    !i.reduced &&
                    d - I.leftAt < i.idleDelay + 0.05,
                  eg =
                    "none" === k &&
                    T.presence < 0.001 &&
                    0.001 > Math.abs(T.presenceV) &&
                    P.show < 0.001 &&
                    0.001 > Math.abs(P.showV);
                (eg &&
                  ((P.x = eh),
                  (P.y = ep),
                  (P.vx = 0),
                  (P.vy = 0),
                  (T.spin = 0),
                  (T.angle = Z),
                  (T.stretch = 0)),
                  ("ghost" === k || ex || (ey && !eg)) && Q());
              }
              let J = (e) => {
                  if ("touch" === e.pointerType || !W()) return;
                  let t = n.getBoundingClientRect(),
                    r = e.getCoalescedEvents?.() ?? [];
                  for (let n of r.length ? r : [e]) {
                    let e = n.clientX - t.left,
                      r = n.clientY - t.top,
                      a = n.timeStamp / 1e3;
                    if (I.fresh) ((I.vx = 0), (I.vy = 0), (I.fresh = !1));
                    else {
                      let t = Math.max(a - I.time, 0.004),
                        n = 1 - Math.exp(-t / 0.045);
                      ((I.vx += ((e - I.x) / t - I.vx) * n),
                        (I.vy += ((r - I.y) / t - I.vy) * n));
                    }
                    ((I.x = e), (I.y = r), (I.time = a));
                  }
                  ((I.clientX = e.clientX),
                    (I.clientY = e.clientY),
                    (I.heard = performance.now() / 1e3),
                    (I.inside = !0),
                    (I.seen = !0),
                    H(!0),
                    B(e.target),
                    Q());
                },
                K = () => {
                  I.inside &&
                    ((I.inside = !1),
                    (I.fresh = !0),
                    (I.leftAt = performance.now() / 1e3),
                    (T.pressed = !1),
                    (S = !1),
                    ($ = !1),
                    (j = ""),
                    Q());
                },
                ee = (e) => {
                  "touch" !== e.pointerType &&
                    W() &&
                    !(e.button > 0) &&
                    (J(e), (T.pressed = !0), $ || O(I.x, I.y), Q());
                },
                et = () => {
                  "ghost" !== k && ((T.pressed = !1), Q());
                },
                en = () => {
                  if (!I.inside) return;
                  B(l.elementFromPoint(I.clientX, I.clientY));
                  let e = n.getBoundingClientRect();
                  ((I.x = I.clientX - e.left), (I.y = I.clientY - e.top), Q());
                };
              (n.addEventListener("pointermove", J, { passive: !0 }),
                n.addEventListener("pointerover", J, { passive: !0 }),
                n.addEventListener("pointerdown", ee, { passive: !0 }),
                n.addEventListener("pointerleave", K),
                n.addEventListener("pointercancel", K),
                d.addEventListener("pointerup", et, { passive: !0 }),
                d.addEventListener("blur", K),
                d.addEventListener("scroll", en, { passive: !0, capture: !0 }));
              let er = () => {
                (g.matches || K(), Q());
              };
              g.addEventListener("change", er);
              let ea =
                "undefined" == typeof IntersectionObserver
                  ? null
                  : new IntersectionObserver(([e]) => {
                      (M = e.isIntersecting)
                        ? ((w = 0), Q())
                        : v && (d.cancelAnimationFrame(v), (v = 0));
                    });
              return (
                ea?.observe(n),
                (T.angle = U()),
                (T.aim = T.angle),
                z(),
                Q(),
                {
                  sync: () => {
                    (z(), (t.current.disabled || !W()) && H(!1), Q());
                  },
                  moveTo: (e, n, r) =>
                    new Promise((a) => {
                      F ||
                      !Number.isFinite(e) ||
                      !Number.isFinite(n) ||
                      t.current.disabled
                        ? a()
                        : ((N.manualUntil =
                            performance.now() / 1e3 +
                            Math.max(t.current.idleDelay, 2) +
                            (r ?? 1.2)),
                          "ghost" !== k && (_(), (k = "ghost")),
                          N.arrive.push(a),
                          G(
                            e,
                            n,
                            null != r && Number.isFinite(r)
                              ? Math.max(0, r)
                              : null,
                            !1,
                          ),
                          (N.wiggle = !1),
                          Q());
                    }),
                  click: () => {
                    if (F) return;
                    let e = performance.now() / 1e3;
                    ("ghost" === k &&
                      ((N.manualUntil = Math.max(
                        N.manualUntil,
                        e + Math.max(t.current.idleDelay, 2),
                      )),
                      (T.pressed = !0),
                      (N.releaseAt = e + 0.11)),
                      O(T.x, T.y),
                      Q());
                  },
                  wiggle: () => {
                    F ||
                      ((T.wiggleAt = performance.now() / 1e3),
                      "ghost" === k &&
                        (N.manualUntil = Math.max(
                          N.manualUntil,
                          performance.now() / 1e3 +
                            Math.max(t.current.idleDelay, 2),
                        )),
                      Q());
                  },
                  destroy: () => {
                    for (let e of ((F = !0),
                    v && d.cancelAnimationFrame(v),
                    ea?.disconnect(),
                    n.removeEventListener("pointermove", J),
                    n.removeEventListener("pointerover", J),
                    n.removeEventListener("pointerdown", ee),
                    n.removeEventListener("pointerleave", K),
                    n.removeEventListener("pointercancel", K),
                    d.removeEventListener("pointerup", et),
                    d.removeEventListener("blur", K),
                    d.removeEventListener("scroll", en, { capture: !0 }),
                    g.removeEventListener("change", er),
                    H(!1),
                    q(),
                    s))
                      for (let t of e.getAnimations()) t.cancel();
                  },
                }
              );
            })(
              {
                root: e,
                body: t,
                arrow: n,
                path: r,
                tag: a,
                rings: Array.from(i.children),
              },
              q,
            );
            return (
              (X.current = o),
              () => {
                (o.destroy(), (X.current = null));
              }
            );
          }, []),
          (0, a.useImperativeHandle)(
            N,
            () => ({
              moveTo: (e, t, n) =>
                X.current?.moveTo(e, t, n) ?? Promise.resolve(),
              click: () => X.current?.click(),
              wiggle: () => X.current?.wiggle(),
            }),
            [],
          ),
          (0, r.jsxs)("div", {
            ref: z,
            "data-gyroscope-cursor": W,
            className: (0, l.cn)(
              "relative isolate h-full min-h-[240px] w-full",
              I,
            ),
            style: T,
            children: [
              (0, r.jsx)("style", {
                children:
                  ((U = `[data-gyroscope-cursor="${W}"][data-active]`),
                  `${U},${U} *{cursor:none!important}${U} :is(${h}),${U} :is(${h}) *{cursor:auto!important}`),
              }),
              P,
              (0, r.jsxs)("div", {
                "aria-hidden": "true",
                style: {
                  position: "absolute",
                  inset: 0,
                  overflow: "hidden",
                  pointerEvents: "none",
                  zIndex: 2147483e3,
                },
                children: [
                  (0, r.jsx)("div", {
                    ref: Y,
                    children: Array.from({ length: 4 }, (e, t) =>
                      (0, r.jsx)(
                        "div",
                        {
                          style: {
                            position: "absolute",
                            borderRadius: "50%",
                            borderStyle: "solid",
                            borderWidth: 2,
                            opacity: 0,
                            pointerEvents: "none",
                          },
                        },
                        t,
                      ),
                    ),
                  }),
                  (0, r.jsx)("div", {
                    ref: O,
                    style: {
                      position: "absolute",
                      left: 0,
                      top: 0,
                      opacity: 0,
                      padding: "0.36em 0.62em 0.4em",
                      borderRadius: "0.55em",
                      fontWeight: 600,
                      lineHeight: 1,
                      letterSpacing: "0.01em",
                      whiteSpace: "nowrap",
                      transformOrigin: "0 0",
                      willChange: "transform, opacity",
                    },
                  }),
                  (0, r.jsx)("div", {
                    ref: D,
                    style: {
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: 0,
                      height: 0,
                      opacity: 0,
                      willChange: "transform, opacity",
                    },
                    children: (0, r.jsx)("svg", {
                      ref: H,
                      style: {
                        position: "absolute",
                        overflow: "visible",
                        willChange: "transform",
                      },
                      focusable: "false",
                      children: (0, r.jsx)("path", {
                        ref: B,
                        strokeLinejoin: "round",
                        paintOrder: "stroke",
                      }),
                    }),
                  }),
                ],
              }),
            ],
          })
        );
      });
    w.displayName = "GyroscopeCursor";
    let F = {
        dark: ["#5227FF", "#FFFFFF"],
        light: ["#5227FF", "#FFFFFF"],
        size: 24,
        outlineWidth: 3,
        shadow: 0.5,
        turn: 1,
        turnSpeed: 1,
        overshoot: 0.4,
        stretch: 0.4,
        settle: 0.45,
      },
      M = {
        agent: F,
        pilot: {
          ...F,
          turnSpeed: 0.8,
          overshoot: 0.65,
          stretch: 0.8,
          settle: 3,
        },
        classic: { ...F, turn: 0, stretch: 0 },
        ink: {
          ...F,
          dark: ["#FAFAFA", "#0A0A0A"],
          light: ["#0A0A0A", "#FFFFFF"],
          size: 22,
          outlineWidth: 2.5,
        },
        coral: {
          ...F,
          dark: ["#FF7A27", "#FFFFFF"],
          light: ["#FF7A27", "#FFFFFF"],
        },
      },
      k = [
        { label: "Agent", value: "agent" },
        { label: "Pilot", value: "pilot" },
        { label: "Classic", value: "classic" },
        { label: "Ink", value: "ink" },
        { label: "Coral", value: "coral" },
      ],
      A = [
        {
          name: "color",
          type: "string",
          default: '"#5227FF"',
          description:
            "Fill of the arrowhead, its name tag and its click ripple. Any CSS colour, including currentColor.",
        },
        {
          name: "outlineColor",
          type: "string",
          default: '"#FFFFFF"',
          description:
            "The sticker outline around the arrowhead and the text colour of its name tag.",
        },
        {
          name: "size",
          type: "number",
          default: "24",
          description:
            "Length of the arrowhead from tip to wings, in pixels. The tip is the exact click point.",
        },
        {
          name: "outlineWidth",
          type: "number",
          default: "3",
          description: "Width of the outline in pixels. 0 removes it.",
        },
        {
          name: "shadow",
          type: "number",
          default: "0.5",
          description:
            "Strength of the soft drop shadow, from 0 to 1. It keeps the cursor legible on light pages.",
        },
        {
          name: "turn",
          type: "number",
          default: "1",
          description:
            "How far the arrowhead turns into its direction of travel, from 0 (a classic static pointer) to 1 (always faces where it is going).",
        },
        {
          name: "turnSpeed",
          type: "number",
          default: "1",
          description:
            "Stiffness of the gyroscopic spring that turns the arrowhead.",
        },
        {
          name: "overshoot",
          type: "number",
          default: "0.4",
          description:
            "How far the arrowhead swings past its heading before it settles, from 0 to 1.",
        },
        {
          name: "stretch",
          type: "number",
          default: "0.4",
          description:
            "Squash and stretch along the direction of travel at speed, from 0 to 1.",
        },
        {
          name: "settle",
          type: "number",
          default: "0.45",
          description:
            "Seconds the arrowhead keeps its heading after you slow down, before it swings back to its rest angle to aim.",
        },
        {
          name: "restAngle",
          type: "number",
          default: "-45",
          description:
            "Heading at rest in degrees, clockwise from pointing straight up. -45 is the classic up-left pointer.",
        },
        {
          name: "press",
          type: "boolean",
          default: "true",
          description: "Dip the arrowhead while a button is held.",
        },
        {
          name: "ripple",
          type: "boolean",
          default: "true",
          description:
            "Send a thin ring out from the tip on each click. Clicks stack. Reduced-motion users never see it.",
        },
        {
          name: "hover",
          type: "boolean",
          default: "true",
          description:
            "Grow slightly over links, buttons and other interactive elements.",
        },
        {
          name: "label",
          type: "string",
          default: '""',
          description:
            'Name tag that trails the cursor, such as "You" or "Agent". Empty hides it.',
        },
        {
          name: "autoplay",
          type: "boolean",
          default: "false",
          description:
            "Let the cursor roam on its own while the pointer is away, like an AI agent's cursor: it glides along curved paths to elements marked data-cursor-target (or any button and link), pauses and clicks them.",
        },
        {
          name: "autoplaySpeed",
          type: "number",
          default: "1",
          description: "Speed of that roaming.",
        },
        {
          name: "idleDelay",
          type: "number",
          default: "1.5",
          description:
            "Seconds after the pointer leaves before the roaming cursor takes over again.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Replace the native cursor inside this component. Turn it off to keep the visitor's own cursor and show only the roaming or scripted one.",
        },
        {
          name: "disabled",
          type: "boolean",
          default: "false",
          description: "Hides the custom cursor and gives the native one back.",
        },
        {
          name: "ref",
          type: "{ moveTo, click, wiggle }",
          default: "—",
          description:
            "Script the cursor: moveTo(x, y, duration?) glides to a point in pixels from the top-left corner and resolves on arrival, click() dips and ripples, wiggle() gives a small thinking shake.",
        },
        {
          name: "data-cursor-label",
          type: "attribute",
          default: "—",
          description:
            'Put it on any element inside to show that text in the name tag while the cursor is over it, such as "Open".',
        },
        {
          name: "data-cursor-target",
          type: "attribute",
          default: "—",
          description:
            "Marks the elements the roaming cursor visits. Without any, it visits buttons and links.",
        },
        {
          name: 'data-cursor="native"',
          type: "attribute",
          default: "—",
          description:
            "Gives an area back to the native cursor. Text fields do this automatically so the caret stays exact.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description:
            "The content the cursor works over. The native cursor is hidden only inside this component.",
        },
        {
          name: "className",
          type: "string",
          default: "—",
          description:
            "Classes for the root element. It fills its parent, with a 240px minimum height.",
        },
        {
          name: "style",
          type: "CSSProperties",
          default: "—",
          description: "Inline styles for the root element.",
        },
      ],
      C = () => {
        let [e, t] = (0, s.I)(),
          n = "dark" === (0, o.Y)(),
          [l, c] = (0, a.useState)("agent"),
          [d, u] = (0, a.useState)(F),
          h = (e) => (t) => u((n) => ({ ...n, [e]: t })),
          [p, m] = (0, a.useState)(null),
          y = p ?? (n ? d.dark : d.light),
          [x, g] = (0, a.useState)(-45),
          [v, f] = (0, a.useState)(!0),
          [b, C] = (0, a.useState)(!0),
          [S, $] = (0, a.useState)(!0),
          [j, E] = (0, a.useState)(""),
          [L, V] = (0, a.useState)(!0),
          [R, I] = (0, a.useState)(1),
          [T, P] = (0, a.useState)(1.5),
          [N, U] = (0, a.useState)(!0),
          [W, z] = (0, a.useState)(!1);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(i.Bg, {}),
            (0, r.jsxs)(i.VX, {
              children: [
                (0, r.jsxs)(i.Ec, {
                  children: [
                    (0, r.jsx)(i.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, r.jsx)("div", {
                        className: `relative h-full w-full ${n ? "bg-[#0A0A0A]" : "bg-white"}`,
                        children: (0, r.jsx)(
                          w,
                          {
                            color: y[0],
                            outlineColor: y[1],
                            size: d.size,
                            outlineWidth: d.outlineWidth,
                            shadow: d.shadow,
                            turn: d.turn,
                            turnSpeed: d.turnSpeed,
                            overshoot: d.overshoot,
                            stretch: d.stretch,
                            settle: d.settle,
                            restAngle: x,
                            press: v,
                            ripple: b,
                            hover: S,
                            label: j,
                            autoplay: L,
                            autoplaySpeed: R,
                            idleDelay: T,
                            interactive: N,
                            disabled: W,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(i.IH, {
                      children: [
                        (0, r.jsx)(i.bg, {
                          title: "Preset",
                          value: l,
                          options: k,
                          onChange: (e) => {
                            (c(e), u(M[e] ?? F), m(null));
                          },
                        }),
                        (0, r.jsx)(i.W7, {
                          title: "Color",
                          value: y[0],
                          onChange: (e) => m([e, y[1]]),
                        }),
                        (0, r.jsx)(i.W7, {
                          title: "Outline",
                          value: y[1],
                          onChange: (e) => m([y[0], e]),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Size",
                          min: 12,
                          max: 48,
                          step: 1,
                          value: d.size,
                          valueUnit: "px",
                          onChange: h("size"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Outline Width",
                          min: 0,
                          max: 6,
                          step: 0.5,
                          value: d.outlineWidth,
                          valueUnit: "px",
                          onChange: h("outlineWidth"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Shadow",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: d.shadow,
                          onChange: h("shadow"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Turn",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: d.turn,
                          onChange: h("turn"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Turn Speed",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: d.turnSpeed,
                          onChange: h("turnSpeed"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Overshoot",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: d.overshoot,
                          onChange: h("overshoot"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Stretch",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: d.stretch,
                          onChange: h("stretch"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Settle",
                          min: 0,
                          max: 3,
                          step: 0.05,
                          value: d.settle,
                          valueUnit: "s",
                          onChange: h("settle"),
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Rest Angle",
                          min: -180,
                          max: 180,
                          step: 5,
                          value: x,
                          valueUnit: "\xb0",
                          onChange: g,
                        }),
                        (0, r.jsx)(i.UD, {
                          title: "Label",
                          value: j,
                          placeholder: "You",
                          onChange: E,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Autoplay Speed",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: R,
                          onChange: I,
                        }),
                        (0, r.jsx)(i.yt, {
                          title: "Idle Delay",
                          min: 0,
                          max: 6,
                          step: 0.25,
                          value: T,
                          valueUnit: "s",
                          onChange: P,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Press",
                          checked: v,
                          onChange: f,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Ripple",
                          checked: b,
                          onChange: C,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Hover",
                          checked: S,
                          onChange: $,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Autoplay",
                          checked: L,
                          onChange: V,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Interactive",
                          checked: N,
                          onChange: U,
                        }),
                        (0, r.jsx)(i.tl, {
                          title: "Disabled",
                          checked: W,
                          onChange: z,
                        }),
                      ],
                    }),
                    (0, r.jsx)(i.Ub, { data: A }),
                  ],
                }),
                (0, r.jsx)(i.lT, { children: (0, r.jsx)(i.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
