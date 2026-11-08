/* ReactBits Pro public preview module 60305 for tessera-trail.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/60305.6a5df18e9b61af7a.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  60305: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => w }));
    var a = n(95155),
      l = n(12115),
      i = n(56388),
      r = n(86049),
      o = n(90761),
      s = n(90650);
    let d = (e, t, n) => Math.min(n, Math.max(t, e)),
      u = new Map(),
      c = (e) => {
        let t = e.trim(),
          n = u.get(t);
        if (n) return n;
        let a = [0, 0, 0],
          l = t.replace("#", "");
        if (/^[0-9a-f]{3}$/i.test(l) || /^[0-9a-f]{6}$/i.test(l)) {
          let e = 3 === l.length ? l.replace(/./g, (e) => e + e) : l;
          a = [
            Number.parseInt(e.slice(0, 2), 16) / 255,
            Number.parseInt(e.slice(2, 4), 16) / 255,
            Number.parseInt(e.slice(4, 6), 16) / 255,
          ];
        } else if ("undefined" != typeof document) {
          let e = document.createElement("canvas");
          ((e.width = 1), (e.height = 1));
          let n = e.getContext("2d", { willReadFrequently: !0 });
          if (n) {
            ((n.fillStyle = "#000"), (n.fillStyle = t), n.fillRect(0, 0, 1, 1));
            let e = n.getImageData(0, 0, 1, 1).data;
            a = [e[0] / 255, e[1] / 255, e[2] / 255];
          }
        }
        return (u.set(t, a), a);
      },
      h = (e) =>
        e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4),
      p = (e) =>
        e <= 0.0031308 ? 12.92 * e : 1.055 * Math.pow(e, 1 / 2.4) - 0.055,
      f = ([e, t, n]) => {
        let a = h(e),
          l = h(t),
          i = h(n),
          r = Math.cbrt(0.4122214708 * a + 0.5363325363 * l + 0.0514459929 * i),
          o = Math.cbrt(0.2119034982 * a + 0.6806995451 * l + 0.1073969566 * i),
          s = Math.cbrt(0.0883024619 * a + 0.2817188376 * l + 0.6299787005 * i);
        return [
          0.2104542553 * r + 0.793617785 * o - 0.0040720468 * s,
          1.9779984951 * r - 2.428592205 * o + 0.4505937099 * s,
          0.0259040371 * r + 0.7827717662 * o - 0.808675766 * s,
        ];
      },
      m = (e, t) => {
        let n = 1.70158 * t,
          a = e - 1;
        return 1 + (n + 1) * a * a * a + n * a * a;
      },
      g = (e) => {
        let t = window.matchMedia("(prefers-reduced-motion: reduce)");
        return (
          t.addEventListener("change", e),
          () => t.removeEventListener("change", e)
        );
      },
      x = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      b = (0, l.forwardRef)(function (
        {
          text: e = "CREATE",
          colors: t = ["#5227FF", "#FF9FFC"],
          textColor: n = "#FFFFFF",
          cellSize: i = 40,
          gap: r = 4,
          radius: o = 9,
          life: u = 1.1,
          maxTiles: h = 60,
          pop: b = 1,
          exitScale: v = 0.5,
          jitter: y = 0.4,
          gloss: F = 0.6,
          spread: C = 3,
          burst: w = !0,
          fontWeight: M = 600,
          fontFamily: S = "inherit",
          autoplay: j = !1,
          autoplaySpeed: E = 1,
          idleDelay: A = 1.5,
          interactive: N = !0,
          className: k,
          style: R,
          children: T,
        },
        $,
      ) {
        let I = (0, l.useRef)(null),
          L = (0, l.useRef)(null),
          P = (0, l.useRef)(null),
          z = {
            text: e,
            colors: t,
            textColor: n,
            cellSize: i,
            gap: r,
            radius: o,
            life: u,
            maxTiles: h,
            pop: b,
            exitScale: v,
            jitter: y,
            gloss: F,
            spread: C,
            burst: w,
            fontWeight: M,
            fontFamily: S,
            autoplay: j,
            autoplaySpeed: E,
            idleDelay: A,
            interactive: N,
            reduced: (0, l.useSyncExternalStore)(g, x, () => !1),
          },
          B = (0, l.useRef)(z);
        return (
          (0, l.useEffect)(() => {
            ((B.current = z), P.current?.sync());
          }),
          (0, l.useEffect)(() => {
            let e = I.current,
              t = L.current;
            if (!e || !t) return;
            let n = ((e, t, n) => {
              let a = e.ownerDocument,
                l = a.defaultView ?? window,
                i = t.getContext("2d");
              if (!i) return null;
              let r = () => performance.now() / 1e3,
                o = 0,
                s = 0,
                u = !1,
                h = !0,
                g = 1,
                x = 1,
                b = 1,
                v = "",
                y = "",
                F = 40,
                C = 36,
                w = 8,
                M = ["•"],
                S = 0,
                j = 0,
                E = "none",
                A = 20 * Math.random(),
                N = [],
                k = { x: 0, y: 0, cellX: NaN, cellY: NaN, active: !1 },
                R = { x: 0, y: 0, cellX: NaN, cellY: NaN, active: !1 },
                T = [],
                $ = new Map(),
                I = new Map(),
                L = { inside: !1, seen: !1, leftAt: -1e9, pending: [] },
                P = () => {
                  let t = n.current;
                  F = d(Math.round(t.cellSize), 12, 160);
                  let a = d(t.gap, 0, 0.4 * F);
                  w = Math.ceil(0.22 * (C = F - a));
                  let i =
                      t.fontFamily && "inherit" !== t.fontFamily
                        ? t.fontFamily
                        : l.getComputedStyle(e).fontFamily ||
                          "system-ui, sans-serif",
                    r = d(100 * Math.round(t.fontWeight / 100), 100, 900),
                    [o, s] = t.colors,
                    u = f(c(o ?? "#5227FF")),
                    h = f(c(s ?? o ?? "#FF9FFC")),
                    m = [
                      F,
                      C,
                      b,
                      i,
                      r,
                      t.radius,
                      t.gloss,
                      o,
                      s,
                      t.textColor,
                    ].join("|");
                  m !== v &&
                    ((v = m),
                    (y = `${r} ${Math.round(0.48 * C)}px ${i}`),
                    (N = Array.from({ length: 32 }, (e, t) => {
                      let n = t / 31;
                      return (([e, t, n]) => {
                        let a = Math.pow(
                            e + 0.3963377774 * t + 0.2158037573 * n,
                            3,
                          ),
                          l = Math.pow(
                            e - 0.1055613458 * t - 0.0638541728 * n,
                            3,
                          ),
                          i = Math.pow(
                            e - 0.0894841775 * t - 1.291485548 * n,
                            3,
                          );
                        return [
                          d(
                            p(
                              4.0767416621 * a -
                                3.3077115913 * l +
                                0.2309699292 * i,
                            ),
                            0,
                            1,
                          ),
                          d(
                            p(
                              -1.2684380046 * a +
                                2.6097574011 * l -
                                0.3413193965 * i,
                            ),
                            0,
                            1,
                          ),
                          d(
                            p(
                              -0.0041960863 * a -
                                0.7034186147 * l +
                                1.707614701 * i,
                            ),
                            0,
                            1,
                          ),
                        ];
                      })([
                        u[0] + (h[0] - u[0]) * n,
                        u[1] + (h[1] - u[1]) * n,
                        u[2] + (h[2] - u[2]) * n,
                      ]);
                    })),
                    I.clear());
                  let g = ((e) => {
                    let t = e.replace(/\s+/g, "");
                    if (!t) return ["•"];
                    let n = Intl.Segmenter;
                    return n
                      ? Array.from(
                          new n(void 0, { granularity: "grapheme" }).segment(t),
                          (e) => e.segment,
                        )
                      : Array.from(t);
                  })(t.text);
                  g.join("") !== M.join("") && ((M = g), (S = 0));
                },
                z = (e, t) => {
                  let l = `${e}|${t}`,
                    i = I.get(l);
                  if (i) return i;
                  let r = n.current,
                    o = 1.3 * b,
                    s = C + 2 * w;
                  (((i = a.createElement("canvas")).width = Math.ceil(s * o)),
                    (i.height = Math.ceil(s * o)));
                  let u = i.getContext("2d");
                  if (u) {
                    u.setTransform(o, 0, 0, o, (s / 2) * o, (s / 2) * o);
                    let n = C / 2,
                      a = d(r.radius, 0, n),
                      l = N[e] ?? [0.32, 0.15, 1],
                      i = d(r.gloss, 0, 1);
                    (u.save(),
                      (u.shadowColor = "rgba(0, 0, 0, 0.28)"),
                      (u.shadowBlur = 0.16 * C),
                      (u.shadowOffsetY = 0.06 * C),
                      u.beginPath(),
                      u.roundRect(-n, -n, C, C, a),
                      (u.fillStyle = (([e, t, n], a = 1) =>
                        `rgba(${Math.round(255 * e)}, ${Math.round(255 * t)}, ${Math.round(255 * n)}, ${a})`)(
                        l,
                      )),
                      u.fill(),
                      u.restore(),
                      u.save(),
                      u.beginPath(),
                      u.roundRect(-n, -n, C, C, a),
                      u.clip());
                    let c = u.createLinearGradient(0, -n, 0, n);
                    (c.addColorStop(0, `rgba(255, 255, 255, ${0.16 * i})`),
                      c.addColorStop(0.45, "rgba(255, 255, 255, 0)"),
                      c.addColorStop(1, `rgba(0, 0, 0, ${0.2 * i})`),
                      (u.fillStyle = c),
                      u.fillRect(-n, -n, C, C));
                    let h = u.createLinearGradient(0, -n, 0, n);
                    (h.addColorStop(0, `rgba(255, 255, 255, ${0.42 * i})`),
                      h.addColorStop(0.35, "rgba(255, 255, 255, 0)"),
                      h.addColorStop(0.7, "rgba(0, 0, 0, 0)"),
                      h.addColorStop(1, `rgba(0, 0, 0, ${0.28 * i})`),
                      (u.strokeStyle = h),
                      (u.lineWidth = Math.max(1, 0.045 * C)),
                      u.beginPath(),
                      u.roundRect(
                        -n + 0.5,
                        -n + 0.5,
                        C - 1,
                        C - 1,
                        Math.max(0, a - 0.5),
                      ),
                      u.stroke(),
                      u.restore(),
                      (u.font = y),
                      (u.textAlign = "center"),
                      (u.textBaseline = "alphabetic"),
                      (u.fillStyle = r.textColor));
                    let p =
                      u.measureText("H").actualBoundingBoxAscent || 0.34 * C;
                    ((u.shadowColor = "rgba(0, 0, 0, 0.26)"),
                      (u.shadowBlur = 0.04 * C),
                      (u.shadowOffsetY = Math.max(0.5, 0.03 * C)),
                      u.fillText(t, 0, p / 2));
                  }
                  return (I.set(l, i), i);
                },
                B = () => {
                  let n = e.getBoundingClientRect();
                  ((g = Math.max(1, n.width)), (x = Math.max(1, n.height)));
                  let a = Math.min(l.devicePixelRatio || 1, 2);
                  ((t.width = Math.round(g * a)),
                    (t.height = Math.round(x * a)),
                    a !== b && ((b = a), (v = "")),
                    P(),
                    W());
                },
                Y = (e, t, a, l) => {
                  let i;
                  if (e < -1 || t < -1 || e * F > g + F || t * F > x + F)
                    return;
                  let r = `${e},${t}`,
                    o = $.get(r);
                  if (o && !o.dead) {
                    let e = a - o.born;
                    if (e < 0) return;
                    if (e < o.life - 0.42) {
                      o.life = Math.max(o.life, e + 0.6 * l);
                      return;
                    }
                    o.dead = !0;
                  }
                  let s = n.current,
                    u = {
                      i: e,
                      j: t,
                      born: a,
                      life: l,
                      glyph: M[S++ % M.length],
                      tone: (i = j++ % 62) < 32 ? i : 62 - i,
                      spin: s.reduced
                        ? 0
                        : (Math.random() - 0.5) * 2 * d(s.jitter, 0, 1) * 0.09,
                      bumpAt: -1e9,
                      dead: !1,
                    };
                  (T.push(u), $.set(r, u));
                  let c = d(Math.round(n.current.maxTiles), 1, 400),
                    h = 0;
                  for (let e of T) !e.dead && a - e.born < e.life - 0.42 && h++;
                  for (let e of T) {
                    if (h <= c) break;
                    !e.dead &&
                      !(a - e.born >= e.life - 0.42) &&
                      ((e.life = Math.max(a - e.born + 0.42, 0.3)), h--);
                  }
                },
                D = (e, t, a, l, i) => {
                  let r = e.active ? e.x : t,
                    o = e.active ? e.y : a;
                  ((e.x = t), (e.y = a), (e.active = !0));
                  let s = d(n.current.life, 0.2, 6),
                    u = Math.floor(r / F),
                    c = Math.floor(o / F),
                    h = Math.floor(t / F),
                    p = Math.floor(a / F),
                    f = t - r,
                    m = a - o,
                    g = f > 0 ? 1 : -1,
                    x = m > 0 ? 1 : -1,
                    b = 0 !== f ? Math.abs(F / f) : 1 / 0,
                    v = 0 !== m ? Math.abs(F / m) : 1 / 0,
                    y =
                      0 !== f
                        ? f > 0
                          ? ((u + 1) * F - r) / f
                          : (u * F - r) / f
                        : 1 / 0,
                    C =
                      0 !== m
                        ? m > 0
                          ? ((c + 1) * F - o) / m
                          : (c * F - o) / m
                        : 1 / 0;
                  (u !== e.cellX || c !== e.cellY) &&
                    (Y(u, c, l, s), (e.cellX = u), (e.cellY = c));
                  let w = 0;
                  for (; (u !== h || c !== p) && w++ < 400;) {
                    let t;
                    (y < C
                      ? ((t = y), (y += b), (u += g))
                      : ((t = C), (C += v), (c += x)),
                      Y(u, c, l + (i - l) * d(t, 0, 1), s),
                      (e.cellX = u),
                      (e.cellY = c));
                  }
                },
                X = (e, t) => {
                  let a = n.current;
                  if (!a.burst || a.reduced) return;
                  let l = r(),
                    i = Math.floor(e / F),
                    o = Math.floor(t / F),
                    s = d(Math.round(a.spread), 1, 6);
                  for (let e of T) {
                    if (e.dead) continue;
                    let t = Math.abs(e.i - i) + Math.abs(e.j - o);
                    t <= s + 1 && (e.bumpAt = l + 0.055 * t);
                  }
                  let u = $.get(`${i},${o}`);
                  (!u || u.dead || l - u.born >= u.life - 0.42) &&
                    Y(i, o, l, 0.5 + 0.12 * s);
                  for (let e = 1; e <= s; e++)
                    for (let t = 0; t < 4 * e; t++) {
                      let n = Math.floor(t / e),
                        a = t % e,
                        r =
                          0 === n
                            ? a
                            : 1 === n
                              ? e - a
                              : 2 === n
                                ? -a
                                : -(e - a),
                        d =
                          0 === n
                            ? e - a
                            : 1 === n
                              ? -a
                              : 2 === n
                                ? -(e - a)
                                : a,
                        u = `${i + r},${o + d}`,
                        c = $.get(u);
                      (c && !c.dead && l - c.born < c.life - 0.42) ||
                        Y(i + r, o + d, l + 0.055 * e, 0.5 + 0.12 * (s - e));
                    }
                  W();
                },
                W = () => {
                  u || !h || o || (o = l.requestAnimationFrame(U));
                };
              function U(e) {
                if (((o = 0), u)) return;
                let a = n.current,
                  l = s ? d((e - s) / 1e3, 0, 0.05) : 1 / 60;
                s = e;
                let c = r(),
                  h = a.autoplay && !a.reduced,
                  p = "none";
                for (let e of (a.interactive && L.inside
                  ? (p = "pointer")
                  : h &&
                    (!a.interactive || !L.seen || c - L.leftAt > a.idleDelay) &&
                    (p = "ghost"),
                p !== E &&
                  ("ghost" === p &&
                    ((R.active = !1), (R.cellX = NaN), (R.cellY = NaN)),
                  (E = p)),
                L.pending)) {
                  let t = Math.min(e.t, c);
                  D(k, e.x, e.y, t, t);
                }
                if (
                  ((L.pending.length = 0),
                  L.inside ||
                    ((k.active = !1), (k.cellX = NaN), (k.cellY = NaN)),
                  "ghost" === E)
                ) {
                  let e;
                  A +=
                    l *
                    d(a.autoplaySpeed, 0, 5) *
                    Math.max(1, 560 / Math.max(Math.min(g, x), 1)) *
                    0.9;
                  let t = {
                    x:
                      g *
                      (0.5 +
                        0.34 * Math.sin(0.71 * (e = A)) +
                        0.07 * Math.sin(1.9 * e + 0.4)),
                    y:
                      x *
                      (0.5 +
                        0.3 * Math.sin(1.13 * e + 0.8) +
                        0.06 * Math.cos(2.6 * e + 0.3)),
                  };
                  D(R, t.x, t.y, c - l, c);
                }
                (i.setTransform(1, 0, 0, 1, 0, 0),
                  i.clearRect(0, 0, t.width, t.height));
                let f = d(a.exitScale, 0, 1),
                  v = d(a.pop, 0, 2),
                  y = C + 2 * w,
                  M = 0;
                for (let e = 0; e < T.length; e++) {
                  let t = T[e],
                    n = c - t.born;
                  if (t.dead || n >= t.life) {
                    let e = `${t.i},${t.j}`;
                    $.get(e) === t && $.delete(e);
                    continue;
                  }
                  if (((T[M++] = t), n < 0)) continue;
                  let l = a.reduced ? 1 : d(n / 0.3, 0, 1),
                    r = a.reduced ? 1 : 0.35 + 0.65 * m(l, v),
                    o = d((n - (t.life - 0.42)) / 0.42, 0, 1),
                    s = o * o * (3 - 2 * o),
                    u = c - t.bumpAt,
                    h =
                      u >= 0 && u < 0.38
                        ? Math.sin((Math.PI * u) / 0.38) * (1 - u / 0.38)
                        : 0,
                    p = r * (1 - (1 - f) * s) * (1 + 0.2 * h),
                    g = Math.min(1, 2.5 * l) * (1 - s);
                  if (g <= 0.01 || p <= 0.01) continue;
                  let x = t.i * F + F / 2,
                    w = t.j * F + F / 2 - h * C * 0.12,
                    S = t.spin * (1.6 - 0.6 * l + 1.2 * s),
                    j = Math.cos(S) * p * b,
                    E = Math.sin(S) * p * b;
                  (i.setTransform(j, E, -E, j, x * b, w * b),
                    (i.globalAlpha = g),
                    i.drawImage(z(t.tone, t.glyph), -y / 2, -y / 2, y, y));
                }
                ((T.length = M), (i.globalAlpha = 1));
                let S =
                  h &&
                  a.interactive &&
                  L.seen &&
                  !L.inside &&
                  c - L.leftAt <= a.idleDelay + 0.05;
                ("ghost" === E || T.length > 0 || S) && W();
              }
              let O = (t) => {
                  if (
                    !n.current.interactive ||
                    ("touch" === t.pointerType && 0 === t.buttons)
                  )
                    return;
                  let a = e.getBoundingClientRect(),
                    l = t.getCoalescedEvents?.() ?? [];
                  for (let e of l.length ? l : [t])
                    L.pending.push({
                      x: e.clientX - a.left,
                      y: e.clientY - a.top,
                      t: r(),
                    });
                  (L.pending.length > 64 &&
                    L.pending.splice(0, L.pending.length - 64),
                    (L.inside = !0),
                    (L.seen = !0),
                    W());
                },
                G = () => {
                  L.inside && ((L.inside = !1), (L.leftAt = r()), W());
                },
                H = (t) => {
                  if (!n.current.interactive || t.button > 0) return;
                  let a = e.getBoundingClientRect();
                  (O(t), X(t.clientX - a.left, t.clientY - a.top));
                };
              (e.addEventListener("pointermove", O, { passive: !0 }),
                e.addEventListener("pointerdown", H, { passive: !0 }),
                e.addEventListener("pointerleave", G),
                e.addEventListener("pointercancel", G),
                l.addEventListener("blur", G));
              let _ = new ResizeObserver(B);
              _.observe(e);
              let q =
                "undefined" == typeof IntersectionObserver
                  ? null
                  : new IntersectionObserver(([e]) => {
                      (h = e.isIntersecting)
                        ? ((s = 0), W())
                        : o && (l.cancelAnimationFrame(o), (o = 0));
                    });
              return (
                q?.observe(e),
                B(),
                {
                  sync: () => {
                    (P(), W());
                  },
                  burst: (e, t) => {
                    !u && Number.isFinite(e) && Number.isFinite(t) && X(e, t);
                  },
                  clear: () => {
                    ((T.length = 0), $.clear(), W());
                  },
                  destroy: () => {
                    ((u = !0),
                      o && l.cancelAnimationFrame(o),
                      _.disconnect(),
                      q?.disconnect(),
                      e.removeEventListener("pointermove", O),
                      e.removeEventListener("pointerdown", H),
                      e.removeEventListener("pointerleave", G),
                      e.removeEventListener("pointercancel", G),
                      l.removeEventListener("blur", G),
                      I.clear());
                  },
                }
              );
            })(e, t, B);
            return (
              (P.current = n),
              () => {
                (n?.destroy(), (P.current = null));
              }
            );
          }, []),
          (0, l.useImperativeHandle)(
            $,
            () => ({
              burst: (e, t) => P.current?.burst(e, t),
              clear: () => P.current?.clear(),
            }),
            [],
          ),
          (0, a.jsxs)("div", {
            ref: I,
            className: (0, s.cn)(
              "relative isolate h-full min-h-[240px] w-full",
              k,
            ),
            style: R,
            children: [
              T,
              (0, a.jsx)("canvas", {
                ref: L,
                "aria-hidden": "true",
                style: {
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 2147483e3,
                },
              }),
            ],
          })
        );
      });
    b.displayName = "TesseraTrail";
    let v = {
        dark: ["#5227FF", "#FF9FFC", "#FFFFFF"],
        light: ["#5227FF", "#FF9FFC", "#FFFFFF"],
        cellSize: 40,
        gap: 4,
        radius: 9,
        jitter: 0.4,
        gloss: 0.6,
        pop: 1,
      },
      y = {
        candy: v,
        ember: {
          ...v,
          dark: ["#E8410C", "#FFB547", "#FFFFFF"],
          light: ["#E8410C", "#FFB547", "#FFFFFF"],
        },
        mono: {
          ...v,
          dark: ["#262626", "#5C5C5C", "#FAFAFA"],
          light: ["#0A0A0A", "#3F3F46", "#FAFAFA"],
          radius: 7,
          jitter: 0.2,
          gloss: 0.8,
        },
        pixel: {
          ...v,
          cellSize: 28,
          gap: 2,
          radius: 3,
          jitter: 0,
          gloss: 0.25,
          pop: 0.6,
        },
      },
      F = [
        { label: "Candy", value: "candy" },
        { label: "Ember", value: "ember" },
        { label: "Mono", value: "mono" },
        { label: "Pixel", value: "pixel" },
      ],
      C = [
        {
          name: "text",
          type: "string",
          default: '"CREATE"',
          description:
            "Letters stamped one per tile, in order, as the trail grows. Spaces are skipped and emoji work.",
        },
        {
          name: "colors",
          type: "[string, string]",
          default: '["#5227FF", "#FF9FFC"]',
          description:
            "Two colours the tiles flow between along the trail, blended in OKLab so the ramp stays vivid.",
        },
        {
          name: "textColor",
          type: "string",
          default: '"#FFFFFF"',
          description:
            "Colour of the letters. They carry a faint embossed shadow so they stay legible on light tiles.",
        },
        {
          name: "cellSize",
          type: "number",
          default: "40",
          description:
            "Size of each grid cell in pixels. Tiles snap to this grid.",
        },
        {
          name: "gap",
          type: "number",
          default: "4",
          description: "Grout between neighbouring tiles, in pixels.",
        },
        {
          name: "radius",
          type: "number",
          default: "9",
          description: "Corner radius of each tile in pixels.",
        },
        {
          name: "life",
          type: "number",
          default: "1.1",
          description: "Seconds a tile stays before it shrinks away.",
        },
        {
          name: "maxTiles",
          type: "number",
          default: "60",
          description:
            "Most tiles on screen at once. The oldest start leaving early beyond this.",
        },
        {
          name: "pop",
          type: "number",
          default: "1",
          description:
            "Overshoot of the springy pop as each tile lands, from 0 to 2.",
        },
        {
          name: "exitScale",
          type: "number",
          default: "0.5",
          description:
            "Size a tile shrinks to as it fades out. 1 keeps its size.",
        },
        {
          name: "jitter",
          type: "number",
          default: "0.4",
          description:
            "Random tilt of each tile, like hand-laid mosaic, from 0 (perfectly square) to 1.",
        },
        {
          name: "gloss",
          type: "number",
          default: "0.6",
          description:
            "Strength of the keycap highlight and shading, from 0 (flat) to 1.",
        },
        {
          name: "spread",
          type: "number",
          default: "3",
          description:
            "How many rings of tiles a click sends out across the grid.",
        },
        {
          name: "burst",
          type: "boolean",
          default: "true",
          description:
            "Clicking sends a diamond of tiles rippling out from the pointer and makes nearby tiles hop.",
        },
        {
          name: "fontWeight",
          type: "number",
          default: "600",
          description: "Weight of the letters.",
        },
        {
          name: "fontFamily",
          type: "string",
          default: '"inherit"',
          description:
            "Font of the letters. inherit uses the font of the surrounding page.",
        },
        {
          name: "autoplay",
          type: "boolean",
          default: "false",
          description:
            "Lay tiles along a wandering path while the pointer is away.",
        },
        {
          name: "autoplaySpeed",
          type: "number",
          default: "1",
          description: "Speed of that wandering.",
        },
        {
          name: "idleDelay",
          type: "number",
          default: "1.5",
          description:
            "Seconds after the pointer leaves before the wandering path takes over again.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "true",
          description:
            "Let the pointer and touch lay tiles. Reduced-motion users get plain tiles that appear and fade, with no pops, tilt, bursts or wandering.",
        },
        {
          name: "ref",
          type: "{ burst, clear }",
          default: "—",
          description:
            "burst(x, y) sends a ripple of tiles from a point, in pixels from the top-left corner. clear() removes every tile.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          description: "Content the tiles are laid over.",
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
      w = () => {
        let [e, t] = (0, o.I)(),
          n = "dark" === (0, r.Y)(),
          [s, d] = (0, l.useState)("candy"),
          [u, c] = (0, l.useState)(v),
          h = (e) => (t) => c((n) => ({ ...n, [e]: t })),
          [p, f] = (0, l.useState)(null),
          m = p ?? (n ? u.dark : u.light),
          g = (e) => (t) => {
            let n = [...m];
            ((n[e] = t), f(n));
          },
          [x, w] = (0, l.useState)("CREATE"),
          [M, S] = (0, l.useState)(1.1),
          [j, E] = (0, l.useState)(60),
          [A, N] = (0, l.useState)(0.5),
          [k, R] = (0, l.useState)(3),
          [T, $] = (0, l.useState)(600),
          [I, L] = (0, l.useState)(!0),
          [P, z] = (0, l.useState)(!0),
          [B, Y] = (0, l.useState)(1),
          [D, X] = (0, l.useState)(1.5),
          [W, U] = (0, l.useState)(!0);
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(i.Bg, {}),
            (0, a.jsxs)(i.VX, {
              children: [
                (0, a.jsxs)(i.Ec, {
                  children: [
                    (0, a.jsx)(i.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      enableResponsive: !0,
                      children: (0, a.jsx)("div", {
                        className: `relative h-full w-full ${n ? "bg-[#0A0A0A]" : "bg-white"}`,
                        children: (0, a.jsx)(
                          b,
                          {
                            text: x || "CREATE",
                            colors: [m[0], m[1]],
                            textColor: m[2],
                            cellSize: u.cellSize,
                            gap: u.gap,
                            radius: u.radius,
                            life: M,
                            maxTiles: j,
                            pop: u.pop,
                            exitScale: A,
                            jitter: u.jitter,
                            gloss: u.gloss,
                            spread: k,
                            burst: I,
                            fontWeight: T,
                            autoplay: P,
                            autoplaySpeed: B,
                            idleDelay: D,
                            interactive: W,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, a.jsxs)(i.IH, {
                      children: [
                        (0, a.jsx)(i.bg, {
                          title: "Preset",
                          value: s,
                          options: F,
                          onChange: (e) => {
                            (d(e), c(y[e] ?? v), f(null));
                          },
                        }),
                        (0, a.jsx)(i.UD, {
                          title: "Text",
                          value: x,
                          placeholder: "CREATE",
                          onChange: w,
                        }),
                        (0, a.jsx)(i.W7, {
                          title: "Color A",
                          value: m[0],
                          onChange: g(0),
                        }),
                        (0, a.jsx)(i.W7, {
                          title: "Color B",
                          value: m[1],
                          onChange: g(1),
                        }),
                        (0, a.jsx)(i.W7, {
                          title: "Letters",
                          value: m[2],
                          onChange: g(2),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Cell Size",
                          min: 16,
                          max: 80,
                          step: 1,
                          value: u.cellSize,
                          valueUnit: "px",
                          onChange: h("cellSize"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Gap",
                          min: 0,
                          max: 12,
                          step: 0.5,
                          value: u.gap,
                          valueUnit: "px",
                          onChange: h("gap"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Radius",
                          min: 0,
                          max: 30,
                          step: 1,
                          value: u.radius,
                          valueUnit: "px",
                          onChange: h("radius"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Life",
                          min: 0.3,
                          max: 4,
                          step: 0.05,
                          value: M,
                          valueUnit: "s",
                          onChange: S,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Max Tiles",
                          min: 5,
                          max: 200,
                          step: 1,
                          value: j,
                          onChange: E,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Pop",
                          min: 0,
                          max: 2,
                          step: 0.05,
                          value: u.pop,
                          onChange: h("pop"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Exit Scale",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: A,
                          onChange: N,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Jitter",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: u.jitter,
                          onChange: h("jitter"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Gloss",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: u.gloss,
                          onChange: h("gloss"),
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Spread",
                          min: 1,
                          max: 6,
                          step: 1,
                          value: k,
                          onChange: R,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Font Weight",
                          min: 300,
                          max: 900,
                          step: 100,
                          value: T,
                          onChange: $,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Autoplay Speed",
                          min: 0.2,
                          max: 3,
                          step: 0.05,
                          value: B,
                          onChange: Y,
                        }),
                        (0, a.jsx)(i.yt, {
                          title: "Idle Delay",
                          min: 0,
                          max: 6,
                          step: 0.25,
                          value: D,
                          valueUnit: "s",
                          onChange: X,
                        }),
                        (0, a.jsx)(i.tl, {
                          title: "Burst",
                          checked: I,
                          onChange: L,
                        }),
                        (0, a.jsx)(i.tl, {
                          title: "Autoplay",
                          checked: P,
                          onChange: z,
                        }),
                        (0, a.jsx)(i.tl, {
                          title: "Interactive",
                          checked: W,
                          onChange: U,
                        }),
                      ],
                    }),
                    (0, a.jsx)(i.Ub, { data: C }),
                  ],
                }),
                (0, a.jsx)(i.lT, { children: (0, a.jsx)(i.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
