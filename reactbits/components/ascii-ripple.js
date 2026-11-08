/* ReactBits Pro public preview module 35426 for ascii-ripple.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/35426.a9f5ffd042b9f54a.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  35426: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => M }));
    var r = n(95155),
      a = n(12115),
      i = n(30701),
      l = n(56388),
      s = n(90761),
      o = n(90650);
    let u =
        "Low tide leaves the rock shelf glazed and quiet, and the pools that remain are small enough to hold in one long look. A shrimp no bigger than a comma drifts above the sand, its shadow arriving a moment before it does. The surface is a second sky. Cloud passes through it, then a gull, then the tremble of my own breath as I lean too close. Nothing here is still, only slow. Anemones open with the patience of clocks. Weed lifts and settles as though the water were remembering a wave it once carried farther up the shore. When a drop falls from my sleeve the whole pool answers at once, rings running outward until they meet the stone and come back folded over themselves, smaller, quieter, braided into a pattern that was never quite round. Light bends through the moving glass and the sand below it wavers, letters on a page read through tears. I count the returns. Four, five, then the surface forgets and the sky is whole again. Farther out the real sea keeps its own time, heavy and unhurried, sending the same news up the channel it has always sent. The pool listens. It repeats every word in a smaller voice, and then, when it is sure no one is watching, it goes back to being a mirror.",
      d = "\xb7.,:;-~=+*%#@",
      c = 1 / 90,
      h = (e, t, n) => {
        let r = 43758.5453 * Math.sin(127.1 * e + 311.7 * t + 74.7 * n);
        return r - Math.floor(r);
      },
      p = (e) => (e < 0 ? 0 : e > 1 ? 1 : e),
      f = (e) => {
        if ("undefined" == typeof document) return [255, 255, 255, 1];
        let t = document.createElement("canvas");
        t.width = t.height = 1;
        let n = t.getContext("2d");
        if (!n) return [255, 255, 255, 1];
        ((n.fillStyle = e), n.fillRect(0, 0, 1, 1));
        let r = n.getImageData(0, 0, 1, 1).data;
        return [r[0], r[1], r[2], r[3] / 255];
      },
      m = (e, t, n) => {
        let r = Math.round(e[0] + (t[0] - e[0]) * n),
          a = Math.round(e[1] + (t[1] - e[1]) * n),
          i = Math.round(e[2] + (t[2] - e[2]) * n),
          l = (e[3] + (t[3] - e[3]) * n).toFixed(3);
        return `rgba(${r},${a},${i},${l})`;
      },
      g = (e, t, n, r, a) => {
        let { w: i, h: l, prev: s, cur: o, next: u, mask: d } = e,
          c = 1 - r,
          h = t + n,
          p = 0;
        for (let e = 1; e < l - 1; e++) {
          let t = e * i;
          for (let e = 1; e < i - 1; e++) {
            let n = t + e,
              r = o[n],
              a = o[n - 1] + o[n + 1] + o[n - i] + o[n + i] - 4 * r,
              l = 0.996 * r + (r - s[n]) * c * d[n] + h * a;
            u[n] = l;
            let f = l < 0 ? -l : l;
            f > p && (p = f);
          }
        }
        if ("reflect" === a) {
          for (let e = 0; e < i; e++)
            ((u[e] = u[e + i]), (u[(l - 1) * i + e] = u[(l - 2) * i + e]));
          for (let e = 0; e < l; e++)
            ((u[e * i] = u[e * i + 1]), (u[e * i + i - 1] = u[e * i + i - 2]));
        }
        ((e.prev = o), (e.cur = u), (e.next = s), (e.energy = p));
      },
      x = (e) => {
        (e.cur.fill(0), e.prev.fill(0), e.next.fill(0), (e.energy = 0));
      },
      y = (e, t, n, r, a) => {
        let i = t / e.cell + 1,
          l = n / e.cell + 1,
          s = Math.max(1, r / e.cell),
          o = Math.max(1, Math.floor(i - s)),
          u = Math.min(e.w - 2, Math.ceil(i + s)),
          d = Math.max(1, Math.floor(l - s)),
          c = Math.min(e.h - 2, Math.ceil(l + s)),
          h = 1 / (s * s);
        for (let t = d; t <= c; t++)
          for (let n = o; n <= u; n++) {
            let r = n - i,
              s = t - l,
              o = 1 - (r * r + s * s) * h;
            o <= 0 || (e.cur[t * e.w + n] -= a * o * o * (3 - 2 * o));
          }
        e.energy < a && (e.energy = a);
      },
      v = (e, t, n, r) => {
        let a = t / e.cell + 1,
          i = n / e.cell + 1,
          l = Math.min(e.w - 3, Math.max(1, Math.floor(a))),
          s = Math.min(e.h - 3, Math.max(1, Math.floor(i))),
          o = p(a - l),
          u = p(i - s),
          { w: d, cur: c } = e,
          h = s * d + l,
          f = c[h] + (c[h + 1] - c[h]) * o,
          m = c[h + d] + (c[h + d + 1] - c[h + d]) * o;
        r[0] = f + (m - f) * u;
        let g = c[h + 1] - c[h - 1],
          x = c[h + d + 1] - c[h + d - 1];
        r[1] = (g + (x - g) * u) * 0.5;
        let y = c[h + d] - c[h - d],
          v = c[h + d + 1] - c[h - d + 1];
        r[2] = (y + (v - y) * o) * 0.5;
      },
      b = (0, a.forwardRef)(
        (
          {
            text: e = u,
            chars: t = d,
            fontSize: n = 16,
            lineHeight: i = 1.2,
            fontFamily:
              l = 'ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace',
            fontWeight: s = 400,
            textColor: b = "#f5f5f4",
            rippleColor: w = "#ffffff",
            troughColor: M = "#ad57ff",
            backgroundColor: C = "transparent",
            textOpacity: S = 0.15,
            resolution: j = 3,
            speed: R = 0.55,
            damping: k = 0.045,
            viscosity: E = 0.4,
            edges: A = "absorb",
            dropStrength: F = 1.2,
            dropRadius: T = 26,
            dragStrength: H = 0.3,
            dragRadius: I = 16,
            rain: P = 0,
            rainStrength: W = 0.6,
            sensitivity: N = 2.2,
            slopeGain: D = 1,
            refraction: O = 4,
            scramble: L = 1,
            scrambleSpeed: G = 90,
            dither: U = 0.5,
            vignette: X = 0.6,
            interactive: z = !0,
            className: B,
            style: q,
            ...Y
          },
          $,
        ) => {
          let V = (0, a.useRef)(null),
            _ = (0, a.useRef)(null),
            J = (0, a.useRef)(null),
            K = (0, a.useRef)(null),
            Q = (0, a.useRef)(0),
            Z = (0, a.useRef)(!1),
            ee = (0, a.useRef)(0),
            et = (0, a.useRef)(0),
            en = (0, a.useRef)(0),
            er = (0, a.useRef)(new Float32Array(3)),
            ea = (0, a.useRef)(!1),
            ei = (0, a.useRef)(() => {}),
            el = (0, a.useRef)({
              x: 0,
              y: 0,
              lastX: 0,
              lastY: 0,
              inside: !1,
              pending: !1,
            }),
            es = `${s} ${n}px ${l}`,
            eo = (0, a.useMemo)(() => {
              let e = f(b),
                t = f(w),
                n = f(M),
                r = [],
                a = [];
              for (let i = 0; i <= 24; i++) {
                let l = i / 24;
                (r.push(m(e, t, l)), a.push(m(e, n, l)));
              }
              return { up: r, down: a };
            }, [b, w, M]),
            eu = {
              chars: t,
              font: es,
              speed: R,
              damping: k,
              viscosity: E,
              edges: A,
              dropStrength: F,
              dropRadius: T,
              dragStrength: H,
              dragRadius: I,
              rain: P,
              rainStrength: W,
              sensitivity: N,
              slopeGain: D,
              refraction: O,
              scramble: L,
              scrambleSpeed: G,
              dither: U,
              vignette: X,
              textOpacity: S,
              resolution: j,
              interactive: z,
              backgroundColor: C,
              ramps: eo,
            },
            ed = (0, a.useRef)(eu);
          (0, a.useEffect)(() => {
            ed.current = eu;
          });
          let ec = (0, a.useCallback)((e) => {
              let t = _.current,
                n = J.current,
                r = K.current;
              if (!t || !n || !r) return;
              let a = t.getContext("2d");
              if (!a) return;
              let i = ed.current,
                { cols: l, rows: s, charW: o, lineH: u, base: c } = n,
                f = t.clientWidth,
                m = t.clientHeight,
                g = t.width / Math.max(1, f);
              (a.setTransform(g, 0, 0, g, 0, 0),
                (a.globalCompositeOperation = "source-over"),
                a.clearRect(0, 0, f, m),
                (a.font = i.font),
                (a.textBaseline = "middle"),
                (a.textAlign = "left"));
              let x = i.chars.length ? i.chars : d,
                y = x.length,
                b = r.energy > 0.0015,
                w = Math.floor(e / Math.max(16, i.scrambleSpeed)),
                M = er.current,
                C = i.resolution,
                S = [];
              ((a.globalAlpha = i.textOpacity), (a.fillStyle = i.ramps.up[0]));
              for (let e = 0; e < s; e++) {
                let t = c[e],
                  n = e * u + u / 2,
                  d = "";
                if (b)
                  for (let a = 0; a < l; a++) {
                    v(r, a * o + o / 2, n, M);
                    let u = M[0],
                      f = M[1] * C,
                      m = M[2] * C,
                      g = Math.sqrt(f * f + m * m),
                      b = p(
                        (Math.abs(u) * i.sensitivity + g * i.slopeGain - 0.12) *
                          1.14,
                      );
                    if (b < 0.02) {
                      d += t[a];
                      continue;
                    }
                    let j = Math.min(
                        l - 1,
                        Math.max(0, Math.round(a + f * i.refraction * 2)),
                      ),
                      R =
                        c[
                          Math.min(
                            s - 1,
                            Math.max(0, Math.round(e + m * i.refraction)),
                          )
                        ][j],
                      k = 0.5 + (h(a, e, 0) - 0.5) * i.dither;
                    if (b * i.scramble >= k) {
                      let t = (h(a, e, w) - 0.5) * y * 0.3;
                      R =
                        x[
                          Math.max(
                            0,
                            Math.min(y - 1, Math.round(b * (y - 1) + t)),
                          )
                        ];
                    }
                    if (" " === R) {
                      d += " ";
                      continue;
                    }
                    let E = u >= 0 ? i.ramps.up : i.ramps.down;
                    (S.push({
                      x: a * o,
                      y: n,
                      ch: R,
                      color: E[Math.round(24 * b)],
                    }),
                      (d += " "));
                  }
                else d = t.join("");
                a.fillText(d, 0, n);
              }
              if (S.length) {
                a.globalAlpha = 1;
                let e = "";
                for (let t = 0; t < S.length; t++) {
                  let n = S[t];
                  (n.color !== e && ((a.fillStyle = n.color), (e = n.color)),
                    a.fillText(n.ch, n.x, n.y));
                }
              }
              if (((a.globalAlpha = 1), i.vignette > 0)) {
                let e = p(i.vignette) * (Math.min(f, m) / 2);
                (a.save(), (a.globalCompositeOperation = "destination-out"));
                let t = (e, t, n, r) => {
                  let i = a.createLinearGradient(e, t, n, r);
                  (i.addColorStop(0, "rgba(0,0,0,1)"),
                    i.addColorStop(0.3, "rgba(0,0,0,0.6)"),
                    i.addColorStop(0.7, "rgba(0,0,0,0.15)"),
                    i.addColorStop(1, "rgba(0,0,0,0)"),
                    (a.fillStyle = i),
                    a.fillRect(0, 0, f, m));
                };
                (t(0, 0, e, 0),
                  t(f, 0, f - e, 0),
                  t(0, 0, 0, e),
                  t(0, m, 0, m - e),
                  a.restore());
              }
              i.backgroundColor &&
                "transparent" !== i.backgroundColor &&
                ((a.globalCompositeOperation = "destination-over"),
                (a.fillStyle = i.backgroundColor),
                a.fillRect(0, 0, f, m),
                (a.globalCompositeOperation = "source-over"));
            }, []),
            eh = (0, a.useCallback)(() => {
              ((Z.current = !1),
                Q.current && cancelAnimationFrame(Q.current),
                (Q.current = 0));
            }, []),
            ep = (0, a.useCallback)(
              (e) => {
                let t = K.current,
                  n = J.current;
                if (!t || !n) {
                  Z.current = !1;
                  return;
                }
                let r = ed.current,
                  a = Math.min(0.1, (e - ee.current) / 1e3 || 0);
                ee.current = e;
                let i = el.current;
                if (i.pending && r.interactive && r.dragStrength > 0) {
                  let e = i.x - i.lastX,
                    n = i.y - i.lastY,
                    a = Math.sqrt(e * e + n * n);
                  if (a > 0.5) {
                    let l = Math.min(
                        6,
                        Math.max(1, Math.ceil(a / r.dragRadius)),
                      ),
                      s =
                        (r.dragStrength *
                          Math.min(1, a / (1.5 * r.dragRadius))) /
                        l;
                    for (let a = 1; a <= l; a++) {
                      let o = a / l;
                      y(t, i.lastX + e * o, i.lastY + n * o, r.dragRadius, s);
                    }
                  }
                  ((i.lastX = i.x), (i.lastY = i.y), (i.pending = !1));
                }
                let l = r.rain > 0 && !(i.inside && r.interactive);
                if (l)
                  for (en.current += a * r.rain; en.current >= 1;)
                    ((en.current -= 1),
                      y(
                        t,
                        Math.random() * n.cols * n.charW,
                        Math.random() * n.rows * n.lineH,
                        r.dropRadius * (0.6 + 0.6 * Math.random()),
                        r.rainStrength * (0.6 + 0.8 * Math.random()),
                      ));
                else en.current = 0;
                let s = 0.02 + 0.4 * p(r.speed),
                  o = Math.min(0.49 - s, 0.12 * p(r.viscosity)),
                  u = Math.min(0.5, Math.max(0, r.damping));
                et.current += a;
                let d = 0;
                for (; et.current >= c && d < 4;)
                  (g(t, s, o, u, r.edges), (et.current -= c), d++);
                if ((4 === d && (et.current = 0), t.energy < 0.0015 && !l)) {
                  (x(t), ec(e), (Z.current = !1), (Q.current = 0));
                  return;
                }
                (ec(e),
                  (Q.current = requestAnimationFrame((e) => ei.current(e))));
              },
              [ec],
            );
          (0, a.useEffect)(() => {
            ei.current = ep;
          }, [ep]);
          let ef = (0, a.useCallback)(() => {
              Z.current ||
                ea.current ||
                ((Z.current = !0),
                (ee.current = performance.now()),
                (et.current = 0),
                (Q.current = requestAnimationFrame((e) => ei.current(e))));
            }, []),
            em = (0, a.useCallback)(() => {
              let t = V.current,
                r = _.current;
              if (!t || !r) return;
              let a = t.getBoundingClientRect(),
                l = Math.max(1, a.width),
                s = Math.max(1, a.height),
                o = Math.min(2, window.devicePixelRatio || 1);
              ((r.width = Math.round(l * o)), (r.height = Math.round(s * o)));
              let u = r.getContext("2d");
              if (!u) return;
              u.font = es;
              let d = u.measureText("M").width || 0.6 * n,
                c = n * i;
              ((J.current = ((e, t, n, r, a) => {
                let i = Math.max(1, Math.ceil(e / n)),
                  l = Math.max(1, Math.ceil(t / r)),
                  s = a.split(/\s+/).filter(Boolean),
                  o = [],
                  u = 0;
                for (let e = 0; e < l; e++) {
                  let e = "";
                  for (; e.length < i && s.length;)
                    (e.length > 0 && (e += " "), (e += s[u % s.length]), u++);
                  o.push(e.padEnd(i, " ").slice(0, i).split(""));
                }
                return { cols: i, rows: l, charW: n, lineH: r, base: o };
              })(l, s, d, c, e)),
                (K.current = ((e, t, n, r) => {
                  let a = Math.max(4, Math.ceil(e / n) + 2),
                    i = Math.max(4, Math.ceil(t / n) + 2),
                    l = a * i,
                    s = new Float32Array(l),
                    o =
                      "absorb" === r
                        ? Math.max(3, Math.round(0.08 * Math.min(a, i)))
                        : 0;
                  for (let e = 0; e < i; e++)
                    for (let t = 0; t < a; t++) {
                      let n = 1;
                      if (o > 0) {
                        let r = Math.min(t, e, a - 1 - t, i - 1 - e);
                        if (r < o) {
                          let e = r / o;
                          n = 1 - (1 - e) * (1 - e) * 0.22;
                        }
                      }
                      s[e * a + t] = n;
                    }
                  return {
                    w: a,
                    h: i,
                    cell: n,
                    prev: new Float32Array(l),
                    cur: new Float32Array(l),
                    next: new Float32Array(l),
                    mask: s,
                    energy: 0,
                  };
                })(l, s, c / Math.max(1, Math.min(4, j)), A)),
                ec(performance.now()),
                P > 0 && ef());
            }, [ec, es, n, i, e, j, A, P, ef]);
          ((0, a.useEffect)(() => {
            let e = window.matchMedia("(prefers-reduced-motion: reduce)"),
              t = () => {
                if (((ea.current = e.matches), e.matches)) {
                  eh();
                  let e = K.current;
                  (e && x(e), ec(performance.now()));
                }
              };
            return (
              t(),
              e.addEventListener("change", t),
              () => e.removeEventListener("change", t)
            );
          }, [ec, eh]),
            (0, a.useEffect)(() => {
              let e = !1;
              ("undefined" != typeof document && document.fonts?.ready
                ? Promise.race([
                    document.fonts.ready,
                    new Promise((e) => setTimeout(e, 1500)),
                  ])
                : Promise.resolve()
              ).then(() => {
                e || em();
              });
              let t = V.current,
                n = new ResizeObserver(() => em());
              return (
                t && n.observe(t),
                () => {
                  ((e = !0), n.disconnect());
                }
              );
            }, [em]),
            (0, a.useEffect)(() => {
              ec(performance.now());
            }, [eo, t, S, X, C, ec]),
            (0, a.useEffect)(() => () => eh(), [eh]));
          let eg = (e) => {
            let t = V.current;
            if (!t) return null;
            let n = t.getBoundingClientRect();
            return { x: e.clientX - n.left, y: e.clientY - n.top };
          };
          return (
            (0, a.useImperativeHandle)(
              $,
              () => ({
                drop: (e, t, n = F, r = T) => {
                  let a = K.current;
                  a && !ea.current && (y(a, e, t, r, n), ef());
                },
                calm: () => {
                  let e = K.current;
                  e && (x(e), ec(performance.now()));
                },
              }),
              [F, T, ef, ec],
            ),
            (0, r.jsx)("div", {
              ref: V,
              className: (0, o.cn)(
                "relative h-full w-full touch-none overflow-hidden select-none",
                B,
              ),
              style: q,
              onPointerMove: (e) => {
                if (!z || ea.current) return;
                let t = eg(e);
                if (!t) return;
                let n = el.current;
                (n.inside ||
                  ((n.lastX = t.x), (n.lastY = t.y), (n.inside = !0)),
                  (n.x = t.x),
                  (n.y = t.y),
                  (n.pending = !0),
                  ef());
              },
              onPointerLeave: () => {
                ((el.current.inside = !1),
                  (el.current.pending = !1),
                  P > 0 && ef());
              },
              onPointerDown: (e) => {
                if (!z || ea.current) return;
                let t = eg(e),
                  n = K.current;
                if (!t || !n) return;
                y(n, t.x, t.y, T, F);
                let r = el.current;
                ((r.x = r.lastX = t.x),
                  (r.y = r.lastY = t.y),
                  (r.inside = !0),
                  ef());
              },
              ...Y,
              children: (0, r.jsx)("canvas", {
                ref: _,
                className: "absolute inset-0 block h-full w-full",
                "aria-hidden": "true",
              }),
            })
          );
        },
      );
    b.displayName = "AsciiRipple";
    let w = () => () => {},
      M = () => {
        let [e, t] = (0, s.I)(),
          { resolvedTheme: n } = (0, i.D)(),
          o =
            (0, a.useSyncExternalStore)(
              w,
              () => !0,
              () => !1,
            ) && "dark" === n,
          [u, d] = (0, a.useState)(null),
          [c, h] = (0, a.useState)(null),
          [p, f] = (0, a.useState)(null),
          m = u ?? (o ? "#f5f5f4" : "#171717"),
          g = c ?? (o ? "#ffffff" : "#000000"),
          x = p ?? "#ad57ff",
          [y, v] = (0, a.useState)("\xb7.,:;-~=+*%#@"),
          [M, C] = (0, a.useState)(16),
          [S, j] = (0, a.useState)(1.2),
          [R, k] = (0, a.useState)(0.15),
          [E, A] = (0, a.useState)(3),
          [F, T] = (0, a.useState)(0.55),
          [H, I] = (0, a.useState)(0.045),
          [P, W] = (0, a.useState)(0.4),
          [N, D] = (0, a.useState)("absorb"),
          [O, L] = (0, a.useState)(1.2),
          [G, U] = (0, a.useState)(26),
          [X, z] = (0, a.useState)(0.3),
          [B, q] = (0, a.useState)(16),
          [Y, $] = (0, a.useState)(0),
          [V, _] = (0, a.useState)(0.6),
          [J, K] = (0, a.useState)(2.2),
          [Q, Z] = (0, a.useState)(1),
          [ee, et] = (0, a.useState)(4),
          [en, er] = (0, a.useState)(1),
          [ea, ei] = (0, a.useState)(90),
          [el, es] = (0, a.useState)(0.5),
          [eo, eu] = (0, a.useState)(0.6),
          [ed, ec] = (0, a.useState)(!0);
        return (0, r.jsxs)("div", {
          children: [
            (0, r.jsx)(l.Bg, {}),
            (0, r.jsxs)(l.VX, {
              children: [
                (0, r.jsxs)(l.Ec, {
                  children: [
                    (0, r.jsx)(l.Ch, {
                      onRefresh: t,
                      minHeight: 560,
                      children: (0, r.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, r.jsx)(
                          b,
                          {
                            chars: y,
                            fontSize: M,
                            lineHeight: S,
                            textColor: m,
                            rippleColor: g,
                            troughColor: x,
                            textOpacity: R,
                            resolution: E,
                            speed: F,
                            damping: H,
                            viscosity: P,
                            edges: N,
                            dropStrength: O,
                            dropRadius: G,
                            dragStrength: X,
                            dragRadius: B,
                            rain: Y,
                            rainStrength: V,
                            sensitivity: J,
                            slopeGain: Q,
                            refraction: ee,
                            scramble: en,
                            scrambleSpeed: ea,
                            dither: el,
                            vignette: eo,
                            interactive: ed,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, r.jsxs)(l.IH, {
                      children: [
                        (0, r.jsx)(l.UD, {
                          title: "Glyphs",
                          value: y,
                          onChange: v,
                          placeholder: "light → heavy",
                        }),
                        (0, r.jsx)(l.bg, {
                          title: "Edges",
                          value: N,
                          onChange: (e) => D(e),
                          options: [
                            { label: "Reflect", value: "reflect" },
                            { label: "Absorb", value: "absorb" },
                          ],
                        }),
                        (0, r.jsx)(l.tl, {
                          title: "Interactive",
                          checked: ed,
                          onChange: ec,
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Text",
                          value: m,
                          onChange: d,
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Crest",
                          value: g,
                          onChange: h,
                        }),
                        (0, r.jsx)(l.W7, {
                          title: "Trough",
                          value: x,
                          onChange: f,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Font Size",
                          min: 9,
                          max: 24,
                          step: 1,
                          value: M,
                          onChange: C,
                          valueUnit: "px",
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Line Height",
                          min: 1,
                          max: 2,
                          step: 0.05,
                          value: S,
                          onChange: j,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Text Opacity",
                          min: 0.1,
                          max: 1,
                          step: 0.05,
                          value: R,
                          onChange: k,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Resolution",
                          min: 1,
                          max: 4,
                          step: 1,
                          value: E,
                          onChange: A,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Speed",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: F,
                          onChange: T,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Damping",
                          min: 0,
                          max: 0.2,
                          step: 0.005,
                          value: H,
                          onChange: I,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Viscosity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: P,
                          onChange: W,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Drop Strength",
                          min: 0,
                          max: 4,
                          step: 0.1,
                          value: O,
                          onChange: L,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Drop Radius",
                          min: 4,
                          max: 120,
                          step: 1,
                          value: G,
                          onChange: U,
                          valueUnit: "px",
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Drag Strength",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: X,
                          onChange: z,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Drag Radius",
                          min: 4,
                          max: 80,
                          step: 1,
                          value: B,
                          onChange: q,
                          valueUnit: "px",
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Rain",
                          min: 0,
                          max: 8,
                          step: 0.1,
                          value: Y,
                          onChange: $,
                          valueUnit: "/s",
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Rain Strength",
                          min: 0,
                          max: 3,
                          step: 0.1,
                          value: V,
                          onChange: _,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Sensitivity",
                          min: 0,
                          max: 8,
                          step: 0.1,
                          value: J,
                          onChange: K,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Slope Gain",
                          min: 0,
                          max: 8,
                          step: 0.1,
                          value: Q,
                          onChange: Z,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Refraction",
                          min: 0,
                          max: 6,
                          step: 0.1,
                          value: ee,
                          onChange: et,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Scramble",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: en,
                          onChange: er,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Scramble Speed",
                          min: 16,
                          max: 400,
                          step: 2,
                          value: ea,
                          onChange: ei,
                          valueUnit: "ms",
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Dither",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: el,
                          onChange: es,
                        }),
                        (0, r.jsx)(l.yt, {
                          title: "Vignette",
                          min: 0,
                          max: 1,
                          step: 0.05,
                          value: eo,
                          onChange: eu,
                        }),
                      ],
                    }),
                    (0, r.jsx)(l.Ub, {
                      data: [
                        {
                          name: "text",
                          type: "string",
                          default: "built-in passage",
                          description:
                            "Passage used to fill the grid. Words wrap row by row and repeat as needed.",
                        },
                        {
                          name: "chars",
                          type: "string",
                          default: '"\xb7.,:;-~=+*%#@"',
                          description:
                            "Glyph palette from lightest to heaviest, picked by ripple intensity.",
                        },
                        {
                          name: "fontSize",
                          type: "number",
                          default: "16",
                          description: "Font size in pixels.",
                        },
                        {
                          name: "lineHeight",
                          type: "number",
                          default: "1.2",
                          description:
                            "Line height as a multiplier of fontSize.",
                        },
                        {
                          name: "fontFamily",
                          type: "string",
                          default: "ui-monospace stack",
                          description: "Monospace font stack.",
                        },
                        {
                          name: "fontWeight",
                          type: "number | string",
                          default: "400",
                          description: "Font weight.",
                        },
                        {
                          name: "textColor",
                          type: "string",
                          default: '"#f5f5f4"',
                          description: "Colour of the resting text.",
                        },
                        {
                          name: "rippleColor",
                          type: "string",
                          default: '"#ffffff"',
                          description:
                            "Colour glyphs tint toward on wave crests.",
                        },
                        {
                          name: "troughColor",
                          type: "string",
                          default: '"#ad57ff"',
                          description:
                            "Colour glyphs tint toward in wave troughs.",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"transparent"',
                          description:
                            "Canvas background. Transparent inherits the page.",
                        },
                        {
                          name: "textOpacity",
                          type: "number",
                          default: "0.15",
                          description: "Opacity of the resting text, 0 to 1.",
                        },
                        {
                          name: "resolution",
                          type: "number",
                          default: "3",
                          description:
                            "Simulation cells per text row, 1 to 4. Higher is smoother and costlier.",
                        },
                        {
                          name: "speed",
                          type: "number",
                          default: "0.55",
                          description: "Wave propagation speed, 0 to 1.",
                        },
                        {
                          name: "damping",
                          type: "number",
                          default: "0.045",
                          description:
                            "Fraction of surface velocity lost per step, 0 to 0.5. Lower rings longer.",
                        },
                        {
                          name: "viscosity",
                          type: "number",
                          default: "0.4",
                          description:
                            "Surface viscosity, 0 to 1. Smooths sharp wavelets into softer swells.",
                        },
                        {
                          name: "edges",
                          type: '"reflect" | "absorb"',
                          default: '"absorb"',
                          description:
                            "Whether waves bounce off the edges or fade out at them.",
                        },
                        {
                          name: "dropStrength",
                          type: "number",
                          default: "1.2",
                          description: "Impulse of a click or tap.",
                        },
                        {
                          name: "dropRadius",
                          type: "number",
                          default: "26",
                          description: "Radius of a click or tap in pixels.",
                        },
                        {
                          name: "dragStrength",
                          type: "number",
                          default: "0.3",
                          description:
                            "Impulse deposited by a moving pointer. 0 disables the trail.",
                        },
                        {
                          name: "dragRadius",
                          type: "number",
                          default: "16",
                          description: "Radius of the pointer trail in pixels.",
                        },
                        {
                          name: "rain",
                          type: "number",
                          default: "0",
                          description:
                            "Random drops per second while the pointer is away.",
                        },
                        {
                          name: "rainStrength",
                          type: "number",
                          default: "0.6",
                          description: "Impulse of each rain drop.",
                        },
                        {
                          name: "sensitivity",
                          type: "number",
                          default: "2.2",
                          description:
                            "How strongly surface height maps to glyph intensity.",
                        },
                        {
                          name: "slopeGain",
                          type: "number",
                          default: "1",
                          description:
                            "How strongly surface slope adds to glyph intensity.",
                        },
                        {
                          name: "refraction",
                          type: "number",
                          default: "4",
                          description:
                            "How far the underlying text is displaced by the slope, in cells.",
                        },
                        {
                          name: "scramble",
                          type: "number",
                          default: "1",
                          description:
                            "How readily disturbed cells swap to palette glyphs, 0 to 1.",
                        },
                        {
                          name: "scrambleSpeed",
                          type: "number",
                          default: "90",
                          description:
                            "Milliseconds between glyph reshuffles inside a ripple.",
                        },
                        {
                          name: "dither",
                          type: "number",
                          default: "0.5",
                          description:
                            "Edge texture of the disturbed region, 0 hard to 1 grainy.",
                        },
                        {
                          name: "vignette",
                          type: "number",
                          default: "0.6",
                          description:
                            "Width of the edge fade as a fraction of the shorter half-side, 0 to 1.",
                        },
                        {
                          name: "interactive",
                          type: "boolean",
                          default: "true",
                          description:
                            "Whether the pointer disturbs the surface.",
                        },
                        {
                          name: "ref",
                          type: "AsciiRippleHandle",
                          default: "—",
                          description:
                            "Imperative handle exposing drop(x, y, strength?, radius?) and calm().",
                        },
                      ],
                    }),
                  ],
                }),
                (0, r.jsx)(l.lT, { children: (0, r.jsx)(l.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
