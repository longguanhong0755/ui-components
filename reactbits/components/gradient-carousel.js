/* ReactBits Pro public preview module 60255 for gradient-carousel.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/60255.3dff7d26f6cfba16.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  60255: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => u }));
    var a = r(95155),
      n = r(56388),
      i = r(90761),
      s = r(12115),
      l = r(82637),
      c = r(90650);
    let o = ({
      images: e = [
        "/demo-media/abstract-iris-window.webp",
        "/demo-media/abstract-citrus-signal.webp",
        "/demo-media/abstract-rose-petal.webp",
        "/demo-media/abstract-spectrum-shift.webp",
        "/demo-media/abstract-spectrum.webp",
        "/demo-media/abstract-rose-balance.webp",
        "/demo-media/abstract-amber-loop.webp",
        "/demo-media/abstract-fuchsia-wave.webp",
      ],
      className: t = "",
      maxRotationDegrees: r = 28,
      maxDepthPx: n = 140,
      minScale: i = 0.92,
      cardGap: o = 28,
      frictionFactor: u = 0.92,
      wheelSensitivity: d = 0.5,
      dragSensitivity: m = 1.2,
      backgroundBlur: h = 32,
      gradientSize: p = 0.65,
      gradientIntensity: f = 0.7,
      enableKeyboard: b = !0,
      onCardChange: g,
      cardAspectRatio: w = 0.8,
      initialIndex: v = 0,
    }) => {
      let x = JSON.stringify(e),
        y = (0, s.useMemo)(() => e, [x]),
        C = (0, s.useRef)(null),
        M = (0, s.useRef)(null),
        k = (0, s.useRef)(null),
        S = (0, s.useRef)([]),
        R = (0, s.useRef)(null),
        j = (0, s.useRef)(null),
        [E, A] = (0, s.useState)(!1),
        [F, $] = (0, s.useState)(!0),
        [I, L] = (0, s.useState)(!1),
        N = (0, s.useRef)(0),
        D = (0, s.useRef)(0),
        P = (0, s.useRef)(0),
        z = (0, s.useRef)(!1),
        G = (0, s.useRef)(0),
        H = (0, s.useRef)(0),
        B = (0, s.useRef)(0),
        T = (0, s.useRef)(300),
        W = (0, s.useRef)(400),
        q = (0, s.useRef)(328),
        X = (0, s.useRef)(0),
        U = (0, s.useRef)(0),
        O = (0, s.useRef)([]),
        V = (0, s.useRef)({
          r1: 240,
          g1: 240,
          b1: 240,
          r2: 235,
          g2: 235,
          b2: 235,
        }),
        _ = (0, s.useRef)(-1),
        K = (0, s.useRef)(0),
        Y = (0, s.useRef)(0),
        J = (0, s.useCallback)((e, t) => ((e % t) + t) % t, []),
        Z = (0, s.useCallback)((e, t, r) => {
          let a = Math.max((e /= 255), (t /= 255), (r /= 255)),
            n = Math.min(e, t, r),
            i = 0,
            s = 0,
            l = (a + n) / 2;
          if (a !== n) {
            let c = a - n;
            switch (((s = l > 0.5 ? c / (2 - a - n) : c / (a + n)), a)) {
              case e:
                i = (t - r) / c + 6 * (t < r);
                break;
              case t:
                i = (r - e) / c + 2;
                break;
              default:
                i = (e - t) / c + 4;
            }
            i /= 6;
          }
          return [360 * i, s, l];
        }, []),
        Q = (0, s.useCallback)((e, t, r) => {
          let a, n, i;
          if (((e = (((e % 360) + 360) % 360) / 360), 0 === t)) a = n = i = r;
          else {
            let s = (e, t, r) =>
                (r < 0 && (r += 1), r > 1 && (r -= 1), r < 1 / 6)
                  ? e + (t - e) * 6 * r
                  : r < 0.5
                    ? t
                    : r < 2 / 3
                      ? e + (t - e) * (2 / 3 - r) * 6
                      : e,
              l = r < 0.5 ? r * (1 + t) : r + t - r * t,
              c = 2 * r - l;
            ((a = s(c, l, e + 1 / 3)),
              (n = s(c, l, e)),
              (i = s(c, l, e - 1 / 3)));
          }
          return [
            Math.round(255 * a),
            Math.round(255 * n),
            Math.round(255 * i),
          ];
        }, []),
        ee = (0, s.useCallback)(
          (e) => {
            let t = (37 * e) % 360;
            return { primary: Q(t, 0.65, 0.52), secondary: Q(t, 0.65, 0.72) };
          },
          [Q],
        ),
        et = (0, s.useCallback)(
          (e, t) => {
            try {
              let r,
                a =
                  e.naturalWidth && e.naturalHeight
                    ? e.naturalWidth / e.naturalHeight
                    : 1,
                n = a >= 1 ? 48 : Math.max(16, Math.round(48 * a)),
                i = a >= 1 ? Math.max(16, Math.round(48 / a)) : 48,
                s = document.createElement("canvas");
              ((s.width = n), (s.height = i));
              let l = s.getContext("2d");
              if (!l) return ee(t);
              l.drawImage(e, 0, 0, n, i);
              let c = l.getImageData(0, 0, n, i).data,
                o = new Float32Array(180),
                u = new Float32Array(180),
                d = new Float32Array(180),
                m = new Float32Array(180);
              for (let e = 0; e < c.length; e += 4) {
                let t = c[e + 3] / 255;
                if (t < 0.05) continue;
                let r = c[e],
                  a = c[e + 1],
                  n = c[e + 2],
                  [i, s, l] = Z(r, a, n);
                if (l < 0.1 || l > 0.92 || s < 0.08) continue;
                let h = s * s * t * (1 - 0.6 * Math.abs(l - 0.5)),
                  p = Math.max(0, Math.min(35, Math.floor((i / 360) * 36))),
                  f = Math.max(0, Math.min(4, Math.floor(5 * s))),
                  b = 5 * p + f;
                ((o[b] += h),
                  (u[b] += r * h),
                  (d[b] += a * h),
                  (m[b] += n * h));
              }
              let h = -1,
                p = 0;
              for (let e = 0; e < 180; e++) o[e] > p && ((p = o[e]), (h = e));
              if (h < 0 || p <= 0) return ee(t);
              let f = 10 * Math.floor(h / 5),
                b = -1,
                g = 0;
              for (let e = 0; e < 180; e++) {
                let t = o[e];
                if (t <= 0) continue;
                let r = 10 * Math.floor(e / 5),
                  a = Math.abs(r - f);
                (a = Math.min(a, 360 - a)) >= 25 && t > g && ((g = t), (b = e));
              }
              let w = (e) => {
                  let t = o[e] || 1e-6;
                  return [
                    Math.round(u[e] / t),
                    Math.round(d[e] / t),
                    Math.round(m[e] / t),
                  ];
                },
                [v, x, y] = w(h),
                [C, M] = Z(v, x, y),
                k = Math.max(0.45, Math.min(1, 1.15 * M)),
                S = Q(C, k, 0.5);
              if (b >= 0 && g >= 0.6 * p) {
                let [e, t, a] = w(b),
                  [n, i] = Z(e, t, a),
                  s = Math.max(0.45, Math.min(1, 1.05 * i));
                r = Q(n, s, 0.72);
              } else r = Q(C, k, 0.72);
              return { primary: S, secondary: r };
            } catch {
              return ee(t);
            }
          },
          [Z, Q, ee],
        ),
        er = (0, s.useCallback)(
          (e) => {
            let t = Math.max(-1, Math.min(1, e / U.current)),
              a = 1 - Math.abs(t),
              s = -t * r,
              l = a * n,
              c = i + 0.1 * a;
            return {
              transform: `translate3d(${e}px,-50%,${l}px) rotateY(${s}deg) scale(${c})`,
              zDepth: l,
            };
          },
          [r, n, i],
        ),
        ea = (0, s.useCallback)((e) => {
          if (e < 0 || e >= O.current.length || e === _.current) return;
          _.current = e;
          let t = O.current[e] || {
              primary: [240, 240, 240],
              secondary: [235, 235, 235],
            },
            r = {
              r1: t.primary[0],
              g1: t.primary[1],
              b1: t.primary[2],
              r2: t.secondary[0],
              g2: t.secondary[1],
              b2: t.secondary[2],
            };
          ((Y.current = performance.now() + 800),
            l.os.to(V.current, { ...r, duration: 0.45, ease: "power2.out" }));
        }, []),
        en = (0, s.useCallback)(() => {
          let e = X.current / 2,
            t = new Float32Array(S.current.length),
            r = -1,
            a = 1 / 0;
          for (let n = 0; n < S.current.length; n++) {
            let i = S.current[n].position - D.current;
            (i < -e && (i += X.current), i > e && (i -= X.current), (t[n] = i));
            let s = Math.abs(i);
            s < a && ((a = s), (r = n));
          }
          let n = (r - 1 + S.current.length) % S.current.length,
            i = (r + 1) % S.current.length;
          for (let e = 0; e < S.current.length; e++) {
            let a = S.current[e],
              s = t[e],
              l = Math.max(-1, Math.min(1, s / U.current)),
              { transform: c, zDepth: o } = er(s);
            ((a.element.style.transform = c),
              (a.element.style.zIndex = String(1e3 + Math.round(o))));
            let u =
              e === r || e === n || e === i
                ? 0
                : 2 * Math.pow(Math.abs(l), 1.1);
            a.element.style.filter = `blur(${u.toFixed(2)}px)`;
          }
          r !== _.current && r >= 0 && (ea(r), g && g(r));
        }, [er, ea, g]),
        ei = (0, s.useCallback)(
          (e) => {
            let t = P.current ? (e - P.current) / 1e3 : 0;
            ((P.current = e),
              (D.current = J(D.current + N.current * t, X.current)));
            let r = Math.pow(u, 60 * t);
            ((N.current *= r),
              0.02 > Math.abs(N.current) && (N.current = 0),
              en(),
              (R.current = requestAnimationFrame(ei)));
          },
          [J, u, en],
        ),
        es = (0, s.useCallback)(
          function e() {
            let t = k.current;
            if (!t) return;
            let r = t.getContext("2d", { alpha: !1 });
            if (!r) return;
            let a = performance.now(),
              n = a < Y.current ? 16 : 33;
            if (a - K.current < n) {
              j.current = requestAnimationFrame(e);
              return;
            }
            K.current = a;
            let i = Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
              s = t.clientWidth,
              l = t.clientHeight,
              c = Math.floor(s * i),
              o = Math.floor(l * i);
            ((t.width !== c || t.height !== o) &&
              ((t.width = c), (t.height = o), r.setTransform(i, 0, 0, i, 0, 0)),
              (r.fillStyle = document.documentElement.classList.contains("dark")
                ? "#0a0a0a"
                : "#f6f7f9"),
              r.fillRect(0, 0, s, l));
            let u = 2e-4 * a,
              d = 0.5 * s,
              m = 0.5 * l,
              h = 0.2 * Math.min(s, l),
              b = h * p,
              g = 0.75 * h * p,
              w = d + Math.cos(u) * b,
              v = m + Math.sin(0.8 * u) * b * 0.4,
              x = d + Math.cos(-(0.9 * u) + 1.2) * g,
              y = m + Math.sin(-(0.7 * u) + 0.7) * g * 0.5,
              C = Math.min(s, l) * p,
              M = Math.min(s, l) * p * 0.9,
              S = r.createRadialGradient(w, v, 0, w, v, C),
              { r1: R, g1: E, b1: A } = V.current,
              F = 0.45 * f;
            (S.addColorStop(0, `rgba(${R},${E},${A},${f})`),
              S.addColorStop(0.6, `rgba(${R},${E},${A},${F})`),
              S.addColorStop(1, "rgba(255,255,255,0)"),
              (r.fillStyle = S),
              r.fillRect(0, 0, s, l));
            let $ = r.createRadialGradient(x, y, 0, x, y, M),
              { r2: I, g2: L, b2: N } = V.current,
              D = 0.85 * f,
              P = 0.35 * f;
            ($.addColorStop(0, `rgba(${I},${L},${N},${D})`),
              $.addColorStop(0.6, `rgba(${I},${L},${N},${P})`),
              $.addColorStop(1, "rgba(255,255,255,0)"),
              (r.fillStyle = $),
              r.fillRect(0, 0, s, l),
              (j.current = requestAnimationFrame(e)));
          },
          [p, f],
        );
      ((0, s.useEffect)(() => {
        if (C.current && M.current)
          return (
            (async () => {
              let e = await Promise.all(
                  y.map(
                    (e) =>
                      new Promise((t) => {
                        let r = new Image();
                        ((r.crossOrigin = "anonymous"),
                          (r.onload = () => t(r)),
                          (r.onerror = () => t(r)),
                          (r.src = e));
                      }),
                  ),
                ),
                t = C.current?.clientWidth || window.innerWidth,
                r = S.current[0]?.element;
              if (r) {
                let e = r.getBoundingClientRect();
                ((T.current = e.width || 300),
                  (W.current = e.height || 400),
                  (q.current = T.current + o),
                  (X.current = S.current.length * q.current),
                  S.current.forEach((e, t) => {
                    e.position = t * q.current;
                  }));
              }
              ((U.current = 0.5 * t), (O.current = e.map((e, t) => et(e, t))));
              let a = Math.max(0, Math.min(v, S.current.length - 1));
              ((D.current = a * q.current),
                ea(a),
                en(),
                g && g(a),
                $(!1),
                A(!0),
                (P.current = 0),
                (R.current = requestAnimationFrame(ei)),
                (j.current = requestAnimationFrame(es)));
            })(),
            () => {
              (R.current && cancelAnimationFrame(R.current),
                j.current && cancelAnimationFrame(j.current));
            }
          );
      }, [y, v, w]),
        (0, s.useEffect)(() => {
          let e,
            t = () => {
              let e = q.current || 1,
                t = D.current / (S.current.length * e),
                r = S.current[0]?.element;
              if (r) {
                let e = r.getBoundingClientRect();
                ((T.current = e.width || 300),
                  (W.current = e.height || 400),
                  (q.current = T.current + o),
                  (X.current = S.current.length * q.current),
                  S.current.forEach((e, t) => {
                    e.position = t * q.current;
                  }));
              }
              ((U.current =
                0.5 * (C.current?.clientWidth || window.innerWidth)),
                (D.current = J(t * X.current, X.current)),
                en());
            },
            r = () => {
              (clearTimeout(e), (e = setTimeout(t, 80)));
            };
          return (
            window.addEventListener("resize", r),
            () => window.removeEventListener("resize", r)
          );
        }, [o]));
      let el = (0, s.useCallback)(
          (e) => {
            if (!E) return;
            e.preventDefault();
            let t =
              Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            N.current += t * d * 20;
          },
          [E, d],
        ),
        ec = (0, s.useCallback)(
          (e) => {
            E &&
              ((z.current = !0),
              L(!0),
              (G.current = e.clientX),
              (H.current = performance.now()),
              (B.current = 0),
              C.current && C.current.setPointerCapture(e.pointerId));
          },
          [E],
        ),
        eo = (0, s.useCallback)(
          (e) => {
            if (!z.current) return;
            let t = performance.now(),
              r = e.clientX - G.current,
              a = Math.max(1, t - H.current) / 1e3;
            ((D.current = J(D.current - r * m, X.current)),
              (B.current = r / a),
              (G.current = e.clientX),
              (H.current = t));
          },
          [m, J],
        ),
        eu = (0, s.useCallback)(
          (e) => {
            z.current &&
              ((z.current = !1),
              L(!1),
              (N.current = -B.current * m),
              C.current && C.current.releasePointerCapture(e.pointerId));
          },
          [m],
        );
      return (
        (0, s.useEffect)(() => {
          let e = C.current;
          if (e)
            return (
              e.addEventListener("wheel", el, { passive: !1 }),
              e.addEventListener("pointerdown", ec),
              e.addEventListener("pointermove", eo),
              e.addEventListener("pointerup", eu),
              e.addEventListener("dragstart", (e) => e.preventDefault()),
              () => {
                (e.removeEventListener("wheel", el),
                  e.removeEventListener("pointerdown", ec),
                  e.removeEventListener("pointermove", eo),
                  e.removeEventListener("pointerup", eu));
              }
            );
        }, [el, ec, eo, eu]),
        (0, s.useEffect)(() => {
          if (!b || !E) return;
          let e = (e) => {
            if ("ArrowLeft" === e.key || "ArrowRight" === e.key) {
              e.preventDefault();
              let t = "ArrowLeft" === e.key ? -1 : 1;
              N.current += t * q.current * 5;
            }
          };
          return (
            window.addEventListener("keydown", e),
            () => window.removeEventListener("keydown", e)
          );
        }, [b, E]),
        (0, s.useEffect)(() => {
          let e = () => {
            document.hidden
              ? (R.current && cancelAnimationFrame(R.current),
                j.current && cancelAnimationFrame(j.current))
              : ((P.current = 0),
                (R.current = requestAnimationFrame(ei)),
                (j.current = requestAnimationFrame(es)));
          };
          return (
            document.addEventListener("visibilitychange", e),
            () => document.removeEventListener("visibilitychange", e)
          );
        }, [ei, es]),
        (0, s.useEffect)(() => {
          if (E)
            return (
              j.current && cancelAnimationFrame(j.current),
              (j.current = requestAnimationFrame(es)),
              () => {
                j.current && cancelAnimationFrame(j.current);
              }
            );
        }, [f, p, E, es]),
        (0, a.jsxs)("div", {
          ref: C,
          className: (0, c.cn)(
            "relative w-full h-full overflow-hidden bg-white dark:bg-[#0a0a0a]",
            "touch-none select-none",
            I ? "cursor-grabbing" : "cursor-grab",
            t,
          ),
          style: { perspective: "1800px" },
          children: [
            F &&
              (0, a.jsx)("div", {
                className:
                  "absolute inset-0 z-50 flex items-center justify-center bg-white dark:bg-[#0a0a0a]",
                children: (0, a.jsx)("div", {
                  className: "flex flex-col items-center gap-3",
                  children: (0, a.jsx)("div", {
                    className:
                      "w-9 h-9 border-3 border-neutral-200 border-t-neutral-800 dark:border-neutral-700 dark:border-t-neutral-200 rounded-full animate-spin",
                  }),
                }),
              }),
            (0, a.jsx)("canvas", {
              ref: k,
              className:
                "absolute inset-0 w-full h-full block pointer-events-none",
              style: { filter: `blur(${h}px) saturate(1.05)` },
              "aria-hidden": "true",
            }),
            (0, a.jsx)("div", {
              ref: M,
              className: "absolute inset-0 z-10",
              style: { transformStyle: "preserve-3d" },
              children: y.map((e, t) =>
                (0, a.jsx)(
                  "div",
                  {
                    ref: (e) => {
                      e &&
                        (S.current[t]
                          ? (S.current[t].element = e)
                          : (S.current[t] = { element: e, position: 0 }));
                    },
                    className:
                      "absolute top-1/2 left-1/2 will-change-transform",
                    style: {
                      width: "min(26vw, 360px)",
                      aspectRatio: String(w),
                      transformStyle: "preserve-3d",
                      backfaceVisibility: "hidden",
                      transformOrigin: "90% center",
                    },
                    children: (0, a.jsx)("img", {
                      src: e,
                      alt: `Carousel item ${t + 1}`,
                      className:
                        "w-full h-full object-cover rounded-4xl pointer-events-none select-none shadow-2xl border border-white/10",
                      draggable: !1,
                      style: { userSelect: "none" },
                    }),
                  },
                  t,
                ),
              ),
            }),
          ],
        })
      );
    };
    o.displayName = "GradientCarousel";
    let u = () => {
      let [e, t] = (0, i.I)(),
        r = [
          "/demo-media/abstract-iris-window.webp",
          "/demo-media/abstract-citrus-signal.webp",
          "/demo-media/abstract-rose-petal.webp",
          "/demo-media/abstract-spectrum-shift.webp",
          "/demo-media/abstract-spectrum.webp",
          "/demo-media/abstract-rose-balance.webp",
          "/demo-media/abstract-amber-loop.webp",
          "/demo-media/abstract-fuchsia-wave.webp",
        ],
        [l, c] = (0, s.useState)(28),
        [u, d] = (0, s.useState)(200),
        [m, h] = (0, s.useState)(0.85),
        [p, f] = (0, s.useState)(15),
        [b, g] = (0, s.useState)(0.95),
        [w, v] = (0, s.useState)(0.75),
        [x, y] = (0, s.useState)(1),
        [C, M] = (0, s.useState)(24),
        [k, S] = (0, s.useState)(1),
        [R, j] = (0, s.useState)(0.25),
        [E, A] = (0, s.useState)(!0),
        [F, $] = (0, s.useState)(1),
        [I, L] = (0, s.useState)(0);
      return (0, a.jsxs)("div", {
        children: [
          (0, a.jsx)(n.Bg, {}),
          (0, a.jsxs)(n.VX, {
            children: [
              (0, a.jsxs)(n.Ec, {
                children: [
                  (0, a.jsx)(n.Ch, {
                    minHeight: 600,
                    onRefresh: t,
                    children: (0, a.jsx)(
                      o,
                      {
                        images: r,
                        maxRotationDegrees: l,
                        maxDepthPx: u,
                        minScale: m,
                        cardGap: p,
                        frictionFactor: b,
                        wheelSensitivity: w,
                        dragSensitivity: x,
                        backgroundBlur: C,
                        gradientSize: k,
                        gradientIntensity: R,
                        enableKeyboard: E,
                        cardAspectRatio: F,
                        initialIndex: I,
                      },
                      e,
                    ),
                  }),
                  (0, a.jsxs)(n.IH, {
                    children: [
                      (0, a.jsx)(n.yt, {
                        title: "Max Rotation (degrees)",
                        value: l,
                        onChange: (e) => {
                          (c(e), t());
                        },
                        min: 10,
                        max: 60,
                        step: 2,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Max Depth (px)",
                        value: u,
                        onChange: (e) => {
                          (d(e), t());
                        },
                        min: 50,
                        max: 300,
                        step: 10,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Min Scale",
                        value: m,
                        onChange: (e) => {
                          (h(e), t());
                        },
                        min: 0.7,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Card Gap (px)",
                        value: p,
                        onChange: (e) => {
                          (f(e), t());
                        },
                        min: 0,
                        max: 100,
                        step: 4,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Card Aspect Ratio",
                        value: F,
                        onChange: (e) => {
                          ($(e), t());
                        },
                        min: 0.5,
                        max: 2,
                        step: 0.05,
                      }),
                      (0, a.jsx)(n.tl, {
                        title: "Enable Keyboard Navigation",
                        checked: E,
                        onChange: (e) => {
                          (A(e), t());
                        },
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Friction Factor",
                        value: b,
                        onChange: (e) => {
                          (g(e), t());
                        },
                        min: 0.5,
                        max: 0.99,
                        step: 0.01,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Wheel Sensitivity",
                        value: w,
                        onChange: (e) => {
                          (v(e), t());
                        },
                        min: 0.1,
                        max: 2,
                        step: 0.1,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Drag Sensitivity",
                        value: x,
                        onChange: (e) => {
                          (y(e), t());
                        },
                        min: 0.5,
                        max: 2,
                        step: 0.1,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Initial Index",
                        value: I,
                        onChange: (e) => {
                          (L(Math.floor(e)), t());
                        },
                        min: 0,
                        max: r.length - 1,
                        step: 1,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Background Blur (px)",
                        value: C,
                        onChange: (e) => {
                          (M(e), t());
                        },
                        min: 0,
                        max: 60,
                        step: 2,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Gradient Size",
                        value: k,
                        onChange: (e) => {
                          (S(e), t());
                        },
                        min: 0.3,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, a.jsx)(n.yt, {
                        title: "Gradient Intensity",
                        value: R,
                        min: 0.2,
                        max: 1,
                        step: 0.05,
                        onChange: (e) => {
                          (j(e), t());
                        },
                      }),
                    ],
                  }),
                  (0, a.jsx)(n.Ub, {
                    data: [
                      {
                        name: "images",
                        type: "string[]",
                        default:
                          '["/demo-media/abstract-iris-window.webp", ...]',
                        description:
                          "Array of image URLs to display in the carousel. The component will extract dominant colors from each image to create dynamic gradient backgrounds.",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description:
                          "Additional CSS classes for the wrapper container. Use this to customize the carousel's appearance.",
                      },
                      {
                        name: "maxRotationDegrees",
                        type: "number",
                        default: "28",
                        description:
                          "Maximum rotation angle for cards in degrees. Controls how much cards rotate as they move away from center.",
                      },
                      {
                        name: "maxDepthPx",
                        type: "number",
                        default: "140",
                        description:
                          "Maximum depth on the Z-axis in pixels. Controls how far cards move back in 3D space as they move away from center.",
                      },
                      {
                        name: "minScale",
                        type: "number",
                        default: "0.92",
                        description:
                          "Minimum scale factor for cards (0-1). Cards will scale down to this value as they move away from center.",
                      },
                      {
                        name: "cardGap",
                        type: "number",
                        default: "28",
                        description:
                          "Gap between cards in pixels. Controls the spacing between adjacent cards in the carousel.",
                      },
                      {
                        name: "frictionFactor",
                        type: "number",
                        default: "0.9",
                        description:
                          "Velocity decay factor (0-1). Lower values create more friction and slower deceleration. Range: 0.5 to 0.99.",
                      },
                      {
                        name: "wheelSensitivity",
                        type: "number",
                        default: "0.6",
                        description:
                          "Mouse wheel sensitivity multiplier. Higher values make wheel scrolling more responsive. Range: 0.1 to 2.0.",
                      },
                      {
                        name: "dragSensitivity",
                        type: "number",
                        default: "1.0",
                        description:
                          "Drag sensitivity multiplier. Higher values make dragging more responsive. Range: 0.5 to 2.0.",
                      },
                      {
                        name: "backgroundBlur",
                        type: "number",
                        default: "24",
                        description:
                          "Blur intensity for background gradient in pixels. Controls how blurred the animated gradient background appears.",
                      },
                      {
                        name: "gradientSize",
                        type: "number",
                        default: "0.65",
                        description:
                          "Size of the gradient (0-1). Controls the radius of the gradient circles. Higher values create larger, more spread out gradients.",
                      },
                      {
                        name: "gradientIntensity",
                        type: "number",
                        default: "0.7",
                        description:
                          "Intensity/opacity of the gradient (0-1). Controls how vibrant and visible the gradient colors are. Higher values create more intense colors.",
                      },
                      {
                        name: "enableKeyboard",
                        type: "boolean",
                        default: "true",
                        description:
                          "Enable keyboard arrow keys navigation. When enabled, users can navigate the carousel using the left and right arrow keys.",
                      },
                      {
                        name: "onCardChange",
                        type: "(index: number) => void",
                        default: "undefined",
                        description:
                          "Callback function triggered when the active card changes. Receives the new card index as a parameter.",
                      },
                      {
                        name: "cardAspectRatio",
                        type: "number",
                        default: "0.8 (4/5)",
                        description:
                          "Aspect ratio of cards (width/height). Default is 4/5. Use values like 1 for square, 16/9 for landscape, etc.",
                      },
                      {
                        name: "initialIndex",
                        type: "number",
                        default: "0",
                        description:
                          "Initial card index to display when the carousel loads. Must be within the range of available images.",
                      },
                    ],
                  }),
                ],
              }),
              (0, a.jsx)(n.lT, { children: (0, a.jsx)(n.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
