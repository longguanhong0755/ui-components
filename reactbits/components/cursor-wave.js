/* ReactBits Pro public preview module 25809 for cursor-wave.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/25809.a5b767139e011533.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  25809: (e, t, a) => {
    (a.r(t), a.d(t, { default: () => g }));
    var n = a(95155),
      r = a(12115),
      l = a(30701),
      s = a(56388),
      i = a(90761),
      o = a(90650);
    let c = [
        "#22c55e",
        "#06b6d4",
        "#f97316",
        "#ef4444",
        "#facc15",
        "#ec4899",
        "#9ca3af",
        "#a78bfa",
        "#60a5fa",
        "#34d399",
        { stops: ["#6366f1", "#3b82f6"] },
        { stops: ["#06b6d4", "#6366f1"] },
        { stops: ["#22c55e", "#06b6d4"] },
        { stops: ["#f97316", "#ef4444"] },
        { stops: ["#8b5cf6", "#06b6d4"] },
        { stops: ["#3b82f6", "#8b5cf6"] },
        { stops: ["#34d399", "#3b82f6"] },
      ],
      u = ["circle", "triangle", "square"],
      d = 2 * Math.PI;
    function p(e, t) {
      return Math.random() * (t - e) + e;
    }
    function h(e) {
      return e[Math.floor(Math.random() * e.length)];
    }
    function m(e) {
      return e <= 0 ? 1 : 1 - Math.pow(0.05, 1 / (60 * e));
    }
    let f = r.forwardRef(
      (
        {
          width: e = "100%",
          height: t = "100%",
          className: a,
          children: l,
          cellSize: s = 40,
          influenceRadiusVmin: i = 30,
          attackTime: f = 0.5,
          releaseTime: g = 0.6,
          idleScale: b = 0.09,
          minPeakScale: x = 1,
          maxPeakScale: v = 3,
          burstSpeed: k = 1200,
          burstThickness: y = 180,
          backgroundColor: C = "#080808",
          shapes: S = u,
          colors: w = c,
          dpr: M = 2,
          opacity: j = 1,
        },
        P,
      ) => {
        let R = (0, r.useRef)(null),
          T = (0, r.useRef)(null),
          E = (0, r.useRef)(null);
        null === E.current &&
          (E.current = {
            cells: [],
            ripples: [],
            pointer: null,
            pointerEnergy: 0,
            maskRects: [],
            maskFrame: 0,
            suspendMasks: !1,
            suspendMaskUntil: 0,
            width: 0,
            height: 0,
            dpr: 1,
            raf: 0,
          });
        let N = (0, r.useRef)({
          cellSize: s,
          influenceRadiusVmin: i,
          attackTime: f,
          releaseTime: g,
          idleScale: b,
          minPeakScale: x,
          maxPeakScale: v,
          burstSpeed: k,
          burstThickness: y,
          backgroundColor: C,
          shapes: S,
          colors: w,
          opacity: j,
        });
        (0, r.useEffect)(() => {
          N.current = {
            cellSize: s,
            influenceRadiusVmin: i,
            attackTime: f,
            releaseTime: g,
            idleScale: b,
            minPeakScale: x,
            maxPeakScale: v,
            burstSpeed: k,
            burstThickness: y,
            backgroundColor: C,
            shapes: S,
            colors: w,
            opacity: j,
          };
        }, [s, i, f, g, b, x, v, k, y, C, S, w, j]);
        let z = (0, r.useCallback)(() => {
            let e = E.current;
            if (!e) return;
            let t = e.width,
              a = e.height,
              n = N.current,
              r = Math.max(n.cellSize, 4),
              l = Math.max(1, Math.floor(t / r)),
              s = Math.max(1, Math.floor(a / r)),
              i = (t - (l - 1) * r) / 2,
              o = (a - (s - 1) * r) / 2,
              m = [],
              f = n.shapes.length > 0 ? n.shapes : u,
              g = n.colors.length > 0 ? n.colors : c;
            for (let e = 0; e < s; e++)
              for (let t = 0; t < l; t++)
                m.push({
                  x: i + t * r,
                  y: o + e * r,
                  shape: h(f),
                  color: h(g),
                  angle: p(0, d),
                  size: 0.38 * r,
                  scale: n.idleScale,
                  peak: p(n.minPeakScale, n.maxPeakScale),
                  hovered: !1,
                });
            e.cells = m;
          }, []),
          B = (0, r.useCallback)(() => {
            let e = E.current,
              t = T.current,
              a = R.current;
            if (!e || !t || !a) return;
            let n = a.getBoundingClientRect(),
              r = Math.max(1, Math.floor(n.width)),
              l = Math.max(1, Math.floor(n.height)),
              s = Math.min(window.devicePixelRatio || 1, Math.max(M, 1));
            ((t.width = r * s),
              (t.height = l * s),
              (t.style.width = `${r}px`),
              (t.style.height = `${l}px`));
            let i = t.getContext("2d");
            (i && (i.setTransform(1, 0, 0, 1, 0, 0), i.scale(s, s)),
              (e.width = r),
              (e.height = l),
              (e.dpr = s),
              z());
          }, [z, M]),
          F = (0, r.useCallback)((e, t) => {
            let a,
              n,
              r = E.current,
              l = R.current;
            if (!r || !l) return;
            if (void 0 === e || void 0 === t)
              ((a = r.width / 2), (n = r.height / 2));
            else {
              let r = l.getBoundingClientRect();
              ((a = e - r.left), (n = t - r.top));
            }
            r.ripples.push({ x: a, y: n, start: performance.now() });
            let s =
              (Math.sqrt(r.width * r.width + r.height * r.height) /
                Math.max(N.current.burstSpeed, 1)) *
              1e3;
            ((r.suspendMasks = !0),
              (r.suspendMaskUntil = performance.now() + s));
          }, []);
        ((0, r.useImperativeHandle)(P, () => ({ burst: F }), [F]),
          (0, r.useEffect)(() => {
            let e = E.current;
            if (!e) return;
            B();
            let t = () => {
              let a = T.current;
              if (!a) return;
              let n = a.getContext("2d");
              if (!n) return;
              let r = N.current,
                l = e.width,
                s = e.height,
                i = Math.min(l, s) * (r.influenceRadiusVmin / 100),
                o = performance.now();
              if (
                ((n.globalAlpha = 1),
                (n.fillStyle = r.backgroundColor),
                n.fillRect(0, 0, l, s),
                (e.pointerEnergy *= 0.93),
                (e.maskFrame += 1),
                e.maskFrame % 10 == 0 && R.current)
              ) {
                let t = R.current.querySelectorAll("[data-cursor-wave-mask]"),
                  a = R.current.getBoundingClientRect(),
                  n = [];
                (t.forEach((e) => {
                  let t = e.getBoundingClientRect();
                  n.push(
                    new DOMRect(
                      t.left - a.left,
                      t.top - a.top,
                      t.width,
                      t.height,
                    ),
                  );
                }),
                  (e.maskRects = n));
              }
              e.suspendMasks &&
                o >= e.suspendMaskUntil &&
                (e.suspendMasks = !1);
              let c = Math.sqrt(l * l + s * s);
              e.ripples = e.ripples.filter(
                (e) =>
                  ((o - e.start) / 1e3) * r.burstSpeed < c + r.burstThickness,
              );
              let u = 0.5 * r.cellSize,
                h = m(r.attackTime),
                f = m(r.releaseTime);
              n.globalAlpha = r.opacity;
              for (let t = 0; t < e.cells.length; t++) {
                let a = e.cells[t],
                  l = !1;
                if (!e.suspendMasks)
                  for (let t = 0; t < e.maskRects.length; t++) {
                    let n = e.maskRects[t];
                    if (
                      a.x >= n.left - u &&
                      a.x <= n.right + u &&
                      a.y >= n.top - u &&
                      a.y <= n.bottom + u
                    ) {
                      l = !0;
                      break;
                    }
                  }
                if (l) {
                  ((a.scale += (0 - a.scale) * f),
                    a.scale < 0.005 && (a.scale = 0));
                  continue;
                }
                let s = 0;
                if (e.pointer && e.pointerEnergy > 0.001 && i > 0) {
                  let t = a.x - e.pointer.x,
                    n = a.y - e.pointer.y;
                  (s =
                    (function (e) {
                      let t = e < 0 ? 0 : e > 1 ? 1 : e;
                      return t * t * (3 - 2 * t);
                    })(1 - Math.sqrt(t * t + n * n) / i) * e.pointerEnergy) >
                    0.05 && !a.hovered
                    ? ((a.hovered = !0),
                      (a.peak = p(r.minPeakScale, r.maxPeakScale)),
                      (a.angle = p(0, d)))
                    : s <= 0.05 && (a.hovered = !1);
                } else a.hovered = !1;
                let c = 0;
                for (let t = 0; t < e.ripples.length; t++) {
                  let n = e.ripples[t],
                    l = ((o - n.start) / 1e3) * r.burstSpeed,
                    s = a.x - n.x,
                    i = a.y - n.y,
                    u =
                      1 -
                      Math.abs(Math.sqrt(s * s + i * i) - l) / r.burstThickness;
                  if (u > 0) {
                    let e = Math.sin(Math.PI * u);
                    e > c && (c = e);
                  }
                }
                let m = a.peak - r.idleScale,
                  g = r.idleScale + s * m,
                  b = r.idleScale + c * m,
                  x = g > b ? g : b,
                  v = x > a.scale ? h : f;
                ((a.scale += (x - a.scale) * v),
                  a.scale < 0.15 * r.idleScale ||
                    (n.save(),
                    n.translate(a.x, a.y),
                    n.rotate(a.angle),
                    n.scale(a.scale, a.scale),
                    (n.fillStyle = (function (e, t, a) {
                      if ("string" == typeof t) return t;
                      let n = e.createRadialGradient(
                        0,
                        -(0.3 * a),
                        0,
                        0,
                        0.3 * a,
                        1.5 * a,
                      );
                      return (
                        n.addColorStop(0, t.stops[0]),
                        n.addColorStop(1, t.stops[1]),
                        n
                      );
                    })(n, a.color, a.size)),
                    (function (e, t, a) {
                      switch (t) {
                        case "circle":
                          (e.beginPath(), e.arc(0, 0, 0.6 * a, 0, d));
                          break;
                        case "square": {
                          let t = 0.6 * a;
                          (e.beginPath(),
                            "function" == typeof e.roundRect
                              ? e.roundRect(-t, -t, 2 * t, 2 * t, 0.12 * a)
                              : e.rect(-t, -t, 2 * t, 2 * t));
                          break;
                        }
                        case "triangle": {
                          let t = 0.78 * a;
                          e.beginPath();
                          for (let a = 0; a < 3; a++) {
                            let n = -Math.PI / 2 + (a * d) / 3,
                              r = Math.cos(n) * t,
                              l = Math.sin(n) * t;
                            0 === a ? e.moveTo(r, l) : e.lineTo(r, l);
                          }
                          e.closePath();
                        }
                      }
                    })(n, a.shape, a.size),
                    n.fill(),
                    n.restore()));
              }
              ((n.globalAlpha = 1), (e.raf = requestAnimationFrame(t)));
            };
            e.raf = requestAnimationFrame(t);
            let a = null,
              n = R.current;
            return (
              n && "undefined" != typeof ResizeObserver
                ? (a = new ResizeObserver(() => B())).observe(n)
                : window.addEventListener("resize", B),
              () => {
                (cancelAnimationFrame(e.raf),
                  a ? a.disconnect() : window.removeEventListener("resize", B));
              }
            );
          }, [B]));
        let I = (0, r.useMemo)(
          () => `${s}|${S.join(",")}|${w.length}`,
          [s, S, w],
        );
        (0, r.useEffect)(() => {
          z();
        }, [I, z]);
        let q = (0, r.useCallback)((e) => {
            let t = E.current,
              a = R.current;
            if (!t || !a) return;
            let n = a.getBoundingClientRect();
            ((t.pointer = { x: e.clientX - n.left, y: e.clientY - n.top }),
              (t.pointerEnergy = 1));
          }, []),
          A = (0, r.useCallback)(() => {
            let e = E.current;
            e && (e.pointer = null);
          }, []),
          U = (0, r.useCallback)(
            (e) => {
              F(e.clientX, e.clientY);
            },
            [F],
          );
        return (0, n.jsxs)("div", {
          ref: R,
          className: (0, o.cn)("relative overflow-hidden", a),
          style: { width: e, height: t, backgroundColor: C },
          onPointerMove: q,
          onPointerLeave: A,
          onPointerDown: U,
          children: [
            (0, n.jsx)("canvas", {
              ref: T,
              className: "absolute inset-0 block h-full w-full",
            }),
            l &&
              (0, n.jsx)("div", {
                className: "pointer-events-none relative z-10 h-full w-full",
                children: l,
              }),
          ],
        });
      },
    );
    f.displayName = "CursorWave";
    let g = () => {
      let [e, t] = (0, i.I)(),
        a = (0, r.useRef)(null),
        [o, c] = (0, r.useState)(40),
        [u, d] = (0, r.useState)(30),
        [p, h] = (0, r.useState)(0.5),
        [m, g] = (0, r.useState)(0.6),
        [b, x] = (0, r.useState)(0.09),
        [v, k] = (0, r.useState)(1),
        [y, C] = (0, r.useState)(3),
        [S, w] = (0, r.useState)(1200),
        [M, j] = (0, r.useState)(180),
        { resolvedTheme: P } = (0, l.D)(),
        [R, T] = (0, r.useState)(null),
        E = (0, r.useMemo)(
          () => (null !== R ? R : "dark" === P ? "#080808" : "#FFFFFF"),
          [P, R],
        ),
        [N, z] = (0, r.useState)(1);
      return (0, n.jsxs)("div", {
        children: [
          (0, n.jsx)(s.Bg, {}),
          (0, n.jsxs)(s.VX, {
            children: [
              (0, n.jsxs)(s.Ec, {
                children: [
                  (0, n.jsx)(s.Ch, {
                    onRefresh: t,
                    children: (0, n.jsx)("div", {
                      className: "relative h-full w-full",
                      children: (0, n.jsx)(
                        f,
                        {
                          ref: a,
                          width: "100%",
                          height: "100%",
                          cellSize: o,
                          influenceRadiusVmin: u,
                          attackTime: p,
                          releaseTime: m,
                          idleScale: b,
                          minPeakScale: v,
                          maxPeakScale: y,
                          burstSpeed: S,
                          burstThickness: M,
                          backgroundColor: E,
                          opacity: N,
                        },
                        e,
                      ),
                    }),
                  }),
                  (0, n.jsxs)(s.IH, {
                    children: [
                      (0, n.jsx)(s.yt, {
                        title: "Cell Size",
                        value: o,
                        onChange: c,
                        min: 16,
                        max: 96,
                        step: 1,
                      }),
                      (0, n.jsx)(s.yt, {
                        title: "Influence Radius",
                        value: u,
                        onChange: d,
                        min: 5,
                        max: 80,
                        step: 1,
                      }),
                      (0, n.jsx)(s.yt, {
                        title: "Attack Time",
                        value: p,
                        onChange: h,
                        min: 0.05,
                        max: 2,
                        step: 0.05,
                      }),
                      (0, n.jsx)(s.yt, {
                        title: "Release Time",
                        value: m,
                        onChange: g,
                        min: 0.05,
                        max: 2,
                        step: 0.05,
                      }),
                      (0, n.jsx)(s.yt, {
                        title: "Idle Scale",
                        value: b,
                        onChange: x,
                        min: 0,
                        max: 0.5,
                        step: 0.01,
                      }),
                      (0, n.jsx)(s.yt, {
                        title: "Min Peak Scale",
                        value: v,
                        onChange: k,
                        min: 0.5,
                        max: 4,
                        step: 0.05,
                      }),
                      (0, n.jsx)(s.yt, {
                        title: "Max Peak Scale",
                        value: y,
                        onChange: C,
                        min: 1,
                        max: 6,
                        step: 0.05,
                      }),
                      (0, n.jsx)(s.yt, {
                        title: "Opacity",
                        value: N,
                        onChange: z,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, n.jsx)(s.yt, {
                        title: "Burst Speed",
                        value: S,
                        onChange: w,
                        min: 200,
                        max: 4e3,
                        step: 50,
                      }),
                      (0, n.jsx)(s.yt, {
                        title: "Burst Thickness",
                        value: M,
                        onChange: j,
                        min: 40,
                        max: 600,
                        step: 5,
                      }),
                      (0, n.jsx)(s.W7, {
                        title: "Background",
                        value: E,
                        onChange: T,
                      }),
                      (0, n.jsx)("button", {
                        type: "button",
                        onClick: () => a.current?.burst(),
                        className:
                          "w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors",
                        children: "Trigger Burst",
                      }),
                    ],
                  }),
                  (0, n.jsx)(s.Ub, {
                    data: [
                      {
                        name: "width",
                        type: "string | number",
                        default: '"100%"',
                        description: "Container width",
                      },
                      {
                        name: "height",
                        type: "string | number",
                        default: '"100%"',
                        description: "Container height",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description: "Additional CSS classes for styling",
                      },
                      {
                        name: "children",
                        type: "ReactNode",
                        default: "undefined",
                        description: "Content rendered above the canvas",
                      },
                      {
                        name: "cellSize",
                        type: "number",
                        default: "40",
                        description:
                          "Pixel spacing between cell centres (16–96)",
                      },
                      {
                        name: "influenceRadiusVmin",
                        type: "number",
                        default: "30",
                        description:
                          "Cursor influence radius as a percentage of min(width, height) (5–80)",
                      },
                      {
                        name: "attackTime",
                        type: "number",
                        default: "0.5",
                        description:
                          "Time constant in seconds for the swell-up ease (0.05–2)",
                      },
                      {
                        name: "releaseTime",
                        type: "number",
                        default: "0.6",
                        description:
                          "Time constant in seconds for the relax-down ease (0.05–2)",
                      },
                      {
                        name: "idleScale",
                        type: "number",
                        default: "0.09",
                        description:
                          "Resting scale applied to every shape (0–0.5)",
                      },
                      {
                        name: "minPeakScale",
                        type: "number",
                        default: "1",
                        description:
                          "Minimum peak scale assigned per cell on hover (0.5–4)",
                      },
                      {
                        name: "maxPeakScale",
                        type: "number",
                        default: "3",
                        description:
                          "Maximum peak scale assigned per cell on hover (1–6)",
                      },
                      {
                        name: "burstSpeed",
                        type: "number",
                        default: "1200",
                        description:
                          "Click-burst expansion speed in pixels/second (200–4000)",
                      },
                      {
                        name: "burstThickness",
                        type: "number",
                        default: "180",
                        description:
                          "Click-burst ring thickness in pixels (40–600)",
                      },
                      {
                        name: "backgroundColor",
                        type: "string",
                        default: '"#080808"',
                        description: "Background fill color in hex format",
                      },
                      {
                        name: "shapes",
                        type: '("circle" | "triangle" | "square")[]',
                        default: '["circle", "triangle", "square"]',
                        description:
                          "Pool of shapes randomly assigned across the grid; repeat entries to bias the distribution",
                      },
                      {
                        name: "colors",
                        type: "(string | { stops: [string, string] })[]",
                        default: "[17 default colors and gradients]",
                        description:
                          "Color pool. Strings are solid hex; objects produce a 2-stop radial gradient (top → bottom)",
                      },
                      {
                        name: "dpr",
                        type: "number",
                        default: "2",
                        description:
                          "Maximum device pixel ratio (caps GPU work) (1–3)",
                      },
                      {
                        name: "opacity",
                        type: "number",
                        default: "1",
                        description: "Master alpha (0–1)",
                      },
                    ],
                  }),
                ],
              }),
              (0, n.jsx)(s.lT, { children: (0, n.jsx)(s.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
