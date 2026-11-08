/* ReactBits Pro public preview module 45652 for glue-dots.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/45652.1a549c4e478bac61.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  45652: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => m }));
    var a = n(95155),
      r = n(12115),
      l = n(30701),
      s = n(56388),
      i = n(90761),
      o = n(90650);
    let u = 2 * Math.PI,
      d = (e, t, n) => Math.min(n, Math.max(t, e)),
      c = ({
        columns: e = 14,
        rows: t = 9,
        fill: n = !0,
        spacing: l = 56,
        inset: s = 0,
        dotRadius: i = 12,
        blur: c = 8,
        contrast: p = 28,
        merge: m = !0,
        tension: h = 0.085,
        damping: f = 0.8,
        travelDelay: x = 0.06,
        bounce: y = 14,
        decay: v = 2.6,
        frequency: g = 12,
        spread: w = 0.18,
        rippleOnPress: b = !0,
        cursorInteraction: C = !0,
        cursorRadius: j = 200,
        cursorPull: S = 22,
        cursorSwell: M = 0.25,
        color: R = "#ffffff",
        backgroundColor: F = "#0a0a0a",
        opacity: k = 1,
        paused: P = !1,
        dpr: A = 2,
        className: X,
        children: Y,
      }) => {
        let E = (0, r.useRef)(null),
          I = (0, r.useRef)(null),
          N = (0, r.useRef)({
            count: 0,
            homeX: new Float32Array(0),
            homeY: new Float32Array(0),
            posX: new Float32Array(0),
            posY: new Float32Array(0),
            velX: new Float32Array(0),
            velY: new Float32Array(0),
            size: new Float32Array(0),
          }),
          z = (0, r.useRef)({ x: 0, y: 0, live: !1 }),
          D = (0, r.useRef)({
            w: 0,
            h: 0,
            cols: 0,
            rows: 0,
            gapX: 0,
            gapY: 0,
            pad: 0,
            fill: !0,
          }),
          B = (0, r.useRef)(new Float32Array(12)),
          T = (0, r.useRef)(new Float32Array(12)),
          O = (0, r.useRef)(new Float32Array(12).fill(-999)),
          q = (0, r.useRef)(new Float32Array(12)),
          L = (0, r.useRef)(0),
          H = (0, r.useRef)({
            columns: e,
            rows: t,
            fill: n,
            spacing: l,
            inset: s,
            dotRadius: i,
            tension: h,
            damping: f,
            travelDelay: x,
            bounce: y,
            decay: v,
            frequency: g,
            spread: w,
            cursorInteraction: C,
            cursorRadius: j,
            cursorPull: S,
            cursorSwell: M,
            color: R,
            paused: P,
            dpr: A,
          });
        (0, r.useEffect)(() => {
          H.current = {
            columns: e,
            rows: t,
            fill: n,
            spacing: l,
            inset: s,
            dotRadius: i,
            tension: h,
            damping: f,
            travelDelay: x,
            bounce: y,
            decay: v,
            frequency: g,
            spread: w,
            cursorInteraction: C,
            cursorRadius: j,
            cursorPull: S,
            cursorSwell: M,
            color: R,
            paused: P,
            dpr: A,
          };
        });
        let G = (0, r.useId)().replace(/[^a-zA-Z0-9]/g, ""),
          U = `glue-${G}`;
        return (
          (0, r.useEffect)(() => {
            let e = E.current,
              t = I.current;
            if (!e || !t) return;
            let n = t.getContext("2d", { alpha: !0 });
            if (!n) return;
            let a = 0,
              r = 0,
              l = 0,
              s = !0,
              i = () => {
                let a = e.getBoundingClientRect(),
                  r = Math.max(Math.round(a.width), 1),
                  l = Math.max(Math.round(a.height), 1),
                  s = H.current,
                  i = Math.max(Math.round(s.columns), 1),
                  o = Math.max(Math.round(s.rows), 1),
                  u = Math.max(s.inset, 0),
                  d = Math.max(s.spacing, 1),
                  c = d;
                s.fill &&
                  ((d = Math.max((r - 2 * u) / i, 1)),
                  (c = Math.max((l - 2 * u) / o, 1)));
                let p = D.current,
                  m =
                    p.w === r &&
                    p.h === l &&
                    p.cols === i &&
                    p.rows === o &&
                    p.gapX === d &&
                    p.gapY === c &&
                    p.pad === u &&
                    p.fill === s.fill,
                  h = Math.min(
                    window.devicePixelRatio || 1,
                    Math.max(s.dpr, 0.5),
                  ),
                  f = Math.round(r * h),
                  x = Math.round(l * h);
                if (
                  ((t.width !== f || t.height !== x) &&
                    ((t.width = f), (t.height = x)),
                  n.setTransform(h, 0, 0, h, 0, 0),
                  m)
                )
                  return;
                D.current = {
                  w: r,
                  h: l,
                  cols: i,
                  rows: o,
                  gapX: d,
                  gapY: c,
                  pad: u,
                  fill: s.fill,
                };
                let y = i * o,
                  v = {
                    count: y,
                    homeX: new Float32Array(y),
                    homeY: new Float32Array(y),
                    posX: new Float32Array(y),
                    posY: new Float32Array(y),
                    velX: new Float32Array(y),
                    velY: new Float32Array(y),
                    size: new Float32Array(y),
                  },
                  g = s.fill ? u + d / 2 : (r - (i - 1) * d) / 2,
                  w = s.fill ? u + c / 2 : (l - (o - 1) * c) / 2;
                for (let e = 0; e < y; e += 1) {
                  let t = e % i,
                    n = (e - t) / i,
                    a = g + t * d,
                    r = w + n * c;
                  ((v.homeX[e] = a),
                    (v.homeY[e] = r),
                    (v.posX[e] = a),
                    (v.posY[e] = r),
                    (v.size[e] = s.dotRadius));
                }
                N.current = v;
              },
              o = (e) => {
                if (((a = requestAnimationFrame(o)), !s)) return;
                let t = l ? Math.min((e - l) / 1e3, 0.05) : 0.016;
                ((l = e),
                  H.current.paused || (r += t),
                  i(),
                  ((e) => {
                    let t = H.current,
                      n = N.current;
                    if (!n.count) return;
                    let a = D.current,
                      l = Math.max((a.gapX + a.gapY) / 2, 1),
                      s = Math.max(t.dotRadius, 0.5),
                      i = Math.max(t.cursorRadius, 1),
                      o = t.cursorPull,
                      u = t.cursorSwell,
                      c = d(t.tension, 0, 1),
                      p = d(t.damping, 0, 1),
                      m = z.current,
                      h = t.cursorInteraction && m.live,
                      f = 60 * Math.min(e, 0.05),
                      x = Math.pow(p, f);
                    for (let e = 0; e < n.count; e += 1) {
                      let a = n.homeX[e],
                        d = n.homeY[e],
                        p = a,
                        y = d,
                        v = s;
                      for (let e = 0; e < 12; e += 1) {
                        let n = r - O.current[e];
                        if (n < 0 || n > 3) continue;
                        let i = a - B.current[e],
                          o = d - T.current[e],
                          u = Math.hypot(i, o),
                          c = u / l,
                          m = n - c * t.travelDelay;
                        if (m <= 0) continue;
                        let h = Math.exp(-c * t.spread);
                        if (h < 0.01) continue;
                        let f =
                          q.current[e] *
                          Math.exp(-t.decay * m) *
                          Math.sin(t.frequency * m) *
                          h;
                        (u > 0.001 && ((p += (i / u) * f), (y += (o / u) * f)),
                          (v =
                            s * (1 + (Math.abs(f) / Math.max(s, 1)) * 0.35)));
                      }
                      if (h) {
                        let e = m.x - a,
                          t = m.y - d,
                          n = Math.hypot(e, t);
                        if (n > 1 && n < i) {
                          let a = (1 - n / i) ** 2,
                            r = a * o;
                          ((p += (e / n) * r),
                            (y += (t / n) * r),
                            (v = s * (1 + a * u)));
                        }
                      }
                      let g = n.velX[e] + (p - n.posX[e]) * c * f,
                        w = n.velY[e] + (y - n.posY[e]) * c * f;
                      ((g *= x),
                        (w *= x),
                        (n.velX[e] = g),
                        (n.velY[e] = w),
                        (n.posX[e] += g * f),
                        (n.posY[e] += w * f),
                        (n.size[e] += (v - n.size[e]) * 0.1 * f));
                    }
                  })(t),
                  (() => {
                    let e = N.current,
                      { w: t, h: a } = D.current;
                    if ((n.clearRect(0, 0, t, a), e.count)) {
                      ((n.fillStyle = H.current.color), n.beginPath());
                      for (let t = 0; t < e.count; t += 1) {
                        let a = Math.max(e.size[t], 0.1),
                          r = e.posX[t],
                          l = e.posY[t];
                        (n.moveTo(r + a, l), n.arc(r, l, a, 0, u));
                      }
                      n.fill();
                    }
                  })());
              },
              c = (t) => {
                let n = e.getBoundingClientRect();
                ((z.current.x = t.clientX - n.left),
                  (z.current.y = t.clientY - n.top),
                  (z.current.live = !0));
              },
              p = () => {
                z.current.live = !1;
              },
              m = (t) => {
                var n, a, l;
                let s;
                if (!b) return;
                let i = e.getBoundingClientRect();
                ((n = t.clientX - i.left),
                  (a = t.clientY - i.top),
                  (l = 1.35 * H.current.bounce),
                  (s = L.current % 12),
                  (L.current += 1),
                  (B.current[s] = n),
                  (T.current[s] = a),
                  (O.current[s] = r),
                  (q.current[s] = l));
              };
            i();
            let h =
              "undefined" == typeof ResizeObserver
                ? null
                : new ResizeObserver(i);
            h?.observe(e);
            let f =
              "undefined" == typeof IntersectionObserver
                ? null
                : new IntersectionObserver(
                    ([e]) => {
                      (s = e.isIntersecting) && (l = 0);
                    },
                    { threshold: 0 },
                  );
            return (
              f?.observe(e),
              e.addEventListener("pointermove", c),
              e.addEventListener("pointerleave", p),
              e.addEventListener("pointerdown", m),
              (a = requestAnimationFrame(o)),
              () => {
                (cancelAnimationFrame(a),
                  h?.disconnect(),
                  f?.disconnect(),
                  e.removeEventListener("pointermove", c),
                  e.removeEventListener("pointerleave", p),
                  e.removeEventListener("pointerdown", m));
              }
            );
          }, [b]),
          (0, a.jsxs)("div", {
            ref: E,
            className: (0, o.cn)("relative overflow-hidden", X),
            style: { opacity: k },
            children: [
              (0, a.jsx)("div", {
                className: "absolute inset-0",
                style: {
                  backgroundColor:
                    "transparent" === F || "none" === F || "" === F
                      ? void 0
                      : F,
                },
              }),
              (0, a.jsx)("canvas", {
                ref: I,
                className: "absolute inset-0 h-full w-full",
                style: m ? { filter: `url(#${U})` } : void 0,
              }),
              (0, a.jsx)("svg", {
                className: "pointer-events-none absolute h-0 w-0",
                "aria-hidden": "true",
                children: (0, a.jsx)("defs", {
                  children: (0, a.jsxs)("filter", {
                    id: U,
                    x: "-25%",
                    y: "-25%",
                    width: "150%",
                    height: "150%",
                    colorInterpolationFilters: "sRGB",
                    children: [
                      (0, a.jsx)("feGaussianBlur", {
                        in: "SourceGraphic",
                        stdDeviation: c,
                        result: "haze",
                      }),
                      (0, a.jsx)("feColorMatrix", {
                        in: "haze",
                        type: "matrix",
                        values: `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${p} ${-p / 2}`,
                      }),
                    ],
                  }),
                }),
              }),
              Y
                ? (0, a.jsx)("div", {
                    className: "relative z-10 h-full w-full",
                    children: Y,
                  })
                : null,
            ],
          })
        );
      },
      p = () => () => {},
      m = () => {
        let [e, t] = (0, i.I)(),
          { resolvedTheme: n } = (0, l.D)(),
          o =
            (0, r.useSyncExternalStore)(
              p,
              () => !0,
              () => !1,
            ) && "dark" === n,
          [u, d] = (0, r.useState)(14),
          [m, h] = (0, r.useState)(9),
          [f, x] = (0, r.useState)(!0),
          [y, v] = (0, r.useState)(56),
          [g, w] = (0, r.useState)(0),
          [b, C] = (0, r.useState)(12),
          [j, S] = (0, r.useState)(8),
          [M, R] = (0, r.useState)(28),
          [F, k] = (0, r.useState)(!0),
          [P, A] = (0, r.useState)(0.085),
          [X, Y] = (0, r.useState)(0.8),
          [E, I] = (0, r.useState)(0.06),
          [N, z] = (0, r.useState)(14),
          [D, B] = (0, r.useState)(2.6),
          [T, O] = (0, r.useState)(12),
          [q, L] = (0, r.useState)(0.18),
          [H, G] = (0, r.useState)(!0),
          [U, $] = (0, r.useState)(!0),
          [_, V] = (0, r.useState)(200),
          [W, Z] = (0, r.useState)(22),
          [J, K] = (0, r.useState)(0.25),
          [Q, ee] = (0, r.useState)(1),
          [et, en] = (0, r.useState)(!1),
          [ea, er] = (0, r.useState)(null),
          [el, es] = (0, r.useState)(null),
          ei = (0, r.useMemo)(
            () => (null !== ea ? ea : o ? "#0a0a0a" : "#ffffff"),
            [o, ea],
          ),
          eo = (0, r.useMemo)(
            () => (null !== el ? el : o ? "#ffffff" : "#0a0a0a"),
            [o, el],
          );
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(s.Bg, {}),
            (0, a.jsxs)(s.VX, {
              children: [
                (0, a.jsxs)(s.Ec, {
                  children: [
                    (0, a.jsx)(s.Ch, {
                      onRefresh: t,
                      children: (0, a.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, a.jsx)(
                          c,
                          {
                            className: "h-full w-full",
                            columns: u,
                            rows: m,
                            fill: f,
                            spacing: y,
                            inset: g,
                            dotRadius: b,
                            blur: j,
                            contrast: M,
                            merge: F,
                            tension: P,
                            damping: X,
                            travelDelay: E,
                            bounce: N,
                            decay: D,
                            frequency: T,
                            spread: q,
                            rippleOnPress: H,
                            cursorInteraction: U,
                            cursorRadius: _,
                            cursorPull: W,
                            cursorSwell: J,
                            color: eo,
                            backgroundColor: ei,
                            opacity: Q,
                            paused: et,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, a.jsxs)(s.IH, {
                      children: [
                        (0, a.jsx)(s.yt, {
                          title: "Columns",
                          min: 2,
                          max: 24,
                          step: 1,
                          value: u,
                          onChange: d,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Rows",
                          min: 2,
                          max: 24,
                          step: 1,
                          value: m,
                          onChange: h,
                        }),
                        (0, a.jsx)(s.tl, {
                          title: "Fill",
                          checked: f,
                          onChange: x,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Spacing",
                          min: 16,
                          max: 160,
                          step: 1,
                          value: y,
                          onChange: v,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Inset",
                          min: 0,
                          max: 160,
                          step: 1,
                          value: g,
                          onChange: w,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Dot Radius",
                          min: 2,
                          max: 40,
                          step: 0.5,
                          value: b,
                          onChange: C,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Blur",
                          min: 0,
                          max: 24,
                          step: 0.5,
                          value: j,
                          onChange: S,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Contrast",
                          min: 2,
                          max: 60,
                          step: 1,
                          value: M,
                          onChange: R,
                        }),
                        (0, a.jsx)(s.tl, {
                          title: "Merge",
                          checked: F,
                          onChange: k,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Tension",
                          min: 0.01,
                          max: 0.4,
                          step: 0.005,
                          value: P,
                          onChange: A,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Damping",
                          min: 0.4,
                          max: 0.98,
                          step: 0.01,
                          value: X,
                          onChange: Y,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Travel Delay",
                          min: 0,
                          max: 0.3,
                          step: 0.005,
                          value: E,
                          onChange: I,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Bounce",
                          min: 0,
                          max: 48,
                          step: 1,
                          value: N,
                          onChange: z,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Decay",
                          min: 0.5,
                          max: 12,
                          step: 0.1,
                          value: D,
                          onChange: B,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Frequency",
                          min: 1,
                          max: 40,
                          step: 0.5,
                          value: T,
                          onChange: O,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Spread",
                          min: 0.02,
                          max: 1.2,
                          step: 0.01,
                          value: q,
                          onChange: L,
                        }),
                        (0, a.jsx)(s.tl, {
                          title: "Ripple On Press",
                          checked: H,
                          onChange: G,
                        }),
                        (0, a.jsx)(s.tl, {
                          title: "Cursor Interaction",
                          checked: U,
                          onChange: $,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Cursor Radius",
                          min: 20,
                          max: 600,
                          step: 5,
                          value: _,
                          onChange: V,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Cursor Pull",
                          min: -60,
                          max: 80,
                          step: 1,
                          value: W,
                          onChange: Z,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Cursor Swell",
                          min: 0,
                          max: 1.5,
                          step: 0.01,
                          value: J,
                          onChange: K,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Opacity",
                          min: 0,
                          max: 1,
                          step: 0.01,
                          value: Q,
                          onChange: ee,
                        }),
                        (0, a.jsx)(s.W7, {
                          title: "Color",
                          value: eo,
                          onChange: es,
                        }),
                        (0, a.jsx)(s.W7, {
                          title: "Background",
                          value: ei,
                          onChange: er,
                        }),
                        (0, a.jsx)(s.tl, {
                          title: "Paused",
                          checked: et,
                          onChange: en,
                        }),
                      ],
                    }),
                    (0, a.jsx)(s.Ub, {
                      data: [
                        {
                          name: "columns",
                          type: "number",
                          default: "14",
                          description: "Dots across the grid.",
                        },
                        {
                          name: "rows",
                          type: "number",
                          default: "9",
                          description: "Dots down the grid.",
                        },
                        {
                          name: "fill",
                          type: "boolean",
                          default: "true",
                          description:
                            "Spread the grid across the container instead of using spacing.",
                        },
                        {
                          name: "spacing",
                          type: "number",
                          default: "56",
                          description:
                            "Gap between dot centres in pixels, used when fill is off.",
                        },
                        {
                          name: "inset",
                          type: "number",
                          default: "0",
                          description:
                            "Padding kept clear around the grid in pixels.",
                        },
                        {
                          name: "dotRadius",
                          type: "number",
                          default: "12",
                          description: "Resting dot radius in pixels.",
                        },
                        {
                          name: "blur",
                          type: "number",
                          default: "8",
                          description: "Blur radius feeding the merge filter.",
                        },
                        {
                          name: "contrast",
                          type: "number",
                          default: "28",
                          description:
                            "Threshold of the merge filter, higher snaps edges harder.",
                        },
                        {
                          name: "merge",
                          type: "boolean",
                          default: "true",
                          description:
                            "Merge neighbouring dots into one another.",
                        },
                        {
                          name: "tension",
                          type: "number",
                          default: "0.085",
                          description:
                            "Pull of each dot back toward its rest position.",
                        },
                        {
                          name: "damping",
                          type: "number",
                          default: "0.8",
                          description:
                            "Velocity retained each frame, below 1 settles the motion.",
                        },
                        {
                          name: "travelDelay",
                          type: "number",
                          default: "0.06",
                          description:
                            "Seconds the ripple takes to travel one cell outward.",
                        },
                        {
                          name: "bounce",
                          type: "number",
                          default: "14",
                          description: "Peak throw of a ripple in pixels.",
                        },
                        {
                          name: "decay",
                          type: "number",
                          default: "2.6",
                          description:
                            "How quickly a ripple dies out over time.",
                        },
                        {
                          name: "frequency",
                          type: "number",
                          default: "12",
                          description:
                            "Oscillation rate of a ripple in radians per second.",
                        },
                        {
                          name: "spread",
                          type: "number",
                          default: "0.18",
                          description:
                            "How quickly a ripple weakens with distance from its origin.",
                        },
                        {
                          name: "rippleOnPress",
                          type: "boolean",
                          default: "true",
                          description:
                            "Release a radial ripple where the pointer presses.",
                        },
                        {
                          name: "cursorInteraction",
                          type: "boolean",
                          default: "true",
                          description:
                            "Let the pointer drag nearby dots toward it.",
                        },
                        {
                          name: "cursorRadius",
                          type: "number",
                          default: "200",
                          description: "Reach of the pointer well in pixels.",
                        },
                        {
                          name: "cursorPull",
                          type: "number",
                          default: "22",
                          description:
                            "How far dots slide toward the pointer in pixels.",
                        },
                        {
                          name: "cursorSwell",
                          type: "number",
                          default: "0.25",
                          description:
                            "How much dots swell inside the pointer well.",
                        },
                        {
                          name: "color",
                          type: "string",
                          default: '"#ffffff"',
                          description: "Colour of the dots.",
                        },
                        {
                          name: "backgroundColor",
                          type: "string",
                          default: '"#0a0a0a"',
                          description:
                            'Panel backdrop, or "transparent" to show the page through.',
                        },
                        {
                          name: "opacity",
                          type: "number",
                          default: "1",
                          description: "Master alpha.",
                        },
                        {
                          name: "paused",
                          type: "boolean",
                          default: "false",
                          description: "Freeze the animation.",
                        },
                        {
                          name: "dpr",
                          type: "number",
                          default: "2",
                          description: "Upper device pixel ratio bound.",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: "undefined",
                          description: "Extra classes for the panel.",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "undefined",
                          description: "Content layered above the panel.",
                        },
                      ],
                    }),
                  ],
                }),
                (0, a.jsx)(s.lT, { children: (0, a.jsx)(s.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
