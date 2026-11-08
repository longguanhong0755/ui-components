/* ReactBits Pro public preview module 81754 for vortex.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/81754.2119edc97328fa92.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  81754: (e, t, n) => {
    (n.r(t), n.d(t, { default: () => c }));
    var a = n(95155),
      r = n(12115),
      i = n(30701),
      l = n(56388),
      s = n(90761),
      o = n(90650);
    let u = ({
        className: e,
        discCount: t = 50,
        particleCount: n = 1e4,
        particleColor: i = "#000000",
        discColor: l = "rgba(200, 200, 200, 0.15)",
        discLineWidth: s = 1,
        particleSize: u = 0.5,
        depth: c = 1.7,
        spread: d = 1,
        speed: h = 0.05,
        rotationDirection: m = 1,
        centerX: p = 0.5,
        centerY: f = 0,
        fadeInThreshold: x = 0.021,
        fadeOutThreshold: g = 0.4,
        opacity: b = 1,
        enableCursorInteraction: v = !0,
        cursorInfluence: y = 0.1,
      }) => {
        let C = (0, r.useRef)(null),
          M = (0, r.useRef)(null);
        return (
          (0, r.useEffect)(() => {
            let e = M.current,
              a = C.current;
            if (!e || !a) return;
            let r = a.getContext("2d");
            if (!r) return;
            let o = 0,
              j = !0,
              w = performance.now(),
              S = 0,
              I = 0,
              P = 0,
              k = 0,
              T = 0,
              E = 0,
              N = 0,
              D = 0,
              R = 1,
              L = [],
              z = [],
              A = (e) => 1 - Math.pow(1 - e, 3),
              B = (e) => (e >= 1 ? 1 : 1 - Math.pow(2, -10 * e)),
              W = (e) => (e <= 0 ? 0 : Math.pow(2, 10 * e - 10)),
              F = (e, t, n, a) => e + (t - e) * (a ? a(n) : n),
              H = (e) => {
                let t = e.t,
                  n = F(1, 0, t, A),
                  a = F(1, 0, t, B);
                ((e.sx = n),
                  (e.sy = a),
                  (e.rx = 0.5 * S * n * d),
                  (e.ry = 0.5 * I * a * d),
                  (e.px = P),
                  (e.py = k + t * I * c * R));
                let r = n * a,
                  i = 1;
                (r < x
                  ? (i = Math.pow(r / x, 3))
                  : r > g && (i = 1 - (r - g) / (1 - g)),
                  (e.vis = Math.max(0, Math.min(1, i))));
              },
              O = () => {
                let l, s;
                ((l = e.getBoundingClientRect()),
                  (s = Math.max(1, window.devicePixelRatio)),
                  (S = l.width),
                  (I = l.height),
                  (P = S * p),
                  (k = I * f),
                  (a.width = Math.floor(S * s)),
                  (a.height = Math.floor(I * s)),
                  (a.style.width = `${S}px`),
                  (a.style.height = `${I}px`),
                  r.setTransform(s, 0, 0, s, 0, 0),
                  (L.length = 0));
                for (let e = 0; e < t; e++) {
                  let n = {
                    t: e / t,
                    px: 0,
                    py: 0,
                    rx: 0,
                    ry: 0,
                    sx: 0,
                    sy: 0,
                    vis: 0,
                  };
                  (H(n), L.push(n));
                }
                (() => {
                  let e;
                  z.length = 0;
                  let [a, r, l] = [
                    parseInt((e = i.replace("#", "")).slice(0, 2), 16) || 0,
                    parseInt(e.slice(2, 4), 16) || 0,
                    parseInt(e.slice(4, 6), 16) || 0,
                  ];
                  for (let e = 0; e < n; e++) {
                    let e = Math.max(
                        0,
                        Math.min(255, a + (Math.random() - 0.5) * 50),
                      ),
                      n = Math.max(
                        0,
                        Math.min(255, r + (Math.random() - 0.5) * 50),
                      ),
                      i = Math.max(
                        0,
                        Math.min(255, l + (Math.random() - 0.5) * 50),
                      );
                    z.push({
                      ringIdx: Math.floor(Math.random() * t),
                      orbit: Math.random(),
                      hue: `rgb(${Math.round(e)},${Math.round(n)},${Math.round(i)})`,
                      alpha: Math.random(),
                    });
                  }
                })();
              },
              X = (e) => {
                if (!j) return;
                let t = (e - w) / (1e3 / 60);
                ((w = e),
                  r.clearRect(0, 0, a.width, a.height),
                  (() => {
                    if (!v) {
                      R = 1;
                      return;
                    }
                    ((N += (T - N) * 0.08),
                      (D += (E - D) * 0.08),
                      (R =
                        1 +
                        (1 -
                          Math.min(
                            Math.hypot(N - S * p, D - I * f) /
                              Math.hypot(0.5 * S, 0.5 * I),
                            1,
                          )) *
                          y *
                          2 -
                        y));
                  })());
                let n = 3e-4 * h * m * t * 60;
                for (let e of L)
                  ((e.t = (e.t + n) % 1), e.t < 0 && (e.t += 1), H(e));
                let i = 0.001 * h * m * t * 60;
                for (let e of z) {
                  let t = L[e.ringIdx];
                  if (!t) continue;
                  let n = F(0, i, 1 - t.sx * t.sy, W);
                  e.orbit = (e.orbit + n) % 1;
                }
                for (let e of ((r.strokeStyle = l), (r.lineWidth = s), L))
                  e.vis <= 0 ||
                    ((r.globalAlpha = e.vis * b),
                    r.beginPath(),
                    r.ellipse(e.px, e.py + e.ry, e.rx, e.ry, 0, 0, 2 * Math.PI),
                    r.stroke());
                ((() => {
                  for (let e of ((r.shadowBlur = 0), z)) {
                    let t = L[e.ringIdx];
                    if (!t || t.vis <= 0) continue;
                    let n = 2 * Math.PI * e.orbit,
                      a = t.px + Math.cos(n) * t.rx,
                      i = t.py + Math.sin(n) * t.ry + t.ry,
                      l = u + 0.5 * (t.sx * t.sy);
                    ((r.fillStyle = e.hue),
                      (r.globalAlpha = t.vis * e.alpha * b),
                      r.beginPath(),
                      r.arc(a, i, l, 0, 2 * Math.PI),
                      r.fill());
                  }
                })(),
                  (o = requestAnimationFrame(X)));
              },
              $ = (t) => {
                if (!v) return;
                let n = e.getBoundingClientRect();
                ((T = t.clientX - n.left), (E = t.clientY - n.top));
              },
              Y = () => {
                v && ((T = S * p), (E = I * f));
              },
              _ = new ResizeObserver(() => O());
            return (
              _.observe(e),
              v &&
                (e.addEventListener("mousemove", $),
                e.addEventListener("mouseleave", Y)),
              O(),
              (o = requestAnimationFrame(X)),
              () => {
                ((j = !1),
                  cancelAnimationFrame(o),
                  _.disconnect(),
                  e.removeEventListener("mousemove", $),
                  e.removeEventListener("mouseleave", Y));
              }
            );
          }, [t, n, i, l, s, u, c, d, h, m, p, f, x, g, b, v, y]),
          (0, a.jsx)("div", {
            ref: M,
            className: (0, o.cn)("absolute inset-0", e),
            children: (0, a.jsx)("canvas", {
              ref: C,
              className: "block h-full w-full",
            }),
          })
        );
      },
      c = () => {
        let { resolvedTheme: e } = (0, i.D)(),
          [t, n] = (0, s.I)(),
          [o, c] = (0, r.useState)(50),
          [d, h] = (0, r.useState)(1e4),
          [m, p] = (0, r.useState)(1),
          [f, x] = (0, r.useState)(0.5),
          [g, b] = (0, r.useState)(1.7),
          [v, y] = (0, r.useState)(1),
          [C, M] = (0, r.useState)(0.05),
          [j, w] = (0, r.useState)(1),
          [S, I] = (0, r.useState)(0.5),
          [P, k] = (0, r.useState)(0),
          [T, E] = (0, r.useState)(0.021),
          [N, D] = (0, r.useState)(0.4),
          [R, L] = (0, r.useState)(1),
          [z, A] = (0, r.useState)(!1),
          [B, W] = (0, r.useState)(0.1),
          { particleColor: F, discColor: H } = (0, r.useMemo)(() => {
            let t = "dark" === e;
            return {
              particleColor: t ? "#ffffff" : "#1a1a1a",
              discColor: t
                ? "rgba(200, 200, 200, 0.15)"
                : "rgba(50, 50, 50, 0.2)",
            };
          }, [e]);
        return (0, a.jsxs)("div", {
          children: [
            (0, a.jsx)(l.Bg, {}),
            (0, a.jsxs)(l.VX, {
              children: [
                (0, a.jsxs)(l.Ec, {
                  children: [
                    (0, a.jsx)(l.Ch, {
                      onRefresh: n,
                      minHeight: 700,
                      children: (0, a.jsx)("div", {
                        className: "relative h-full w-full",
                        children: (0, a.jsx)(
                          u,
                          {
                            discCount: o,
                            particleCount: d,
                            particleColor: F,
                            discColor: H,
                            discLineWidth: m,
                            particleSize: f,
                            depth: g,
                            spread: v,
                            speed: C,
                            rotationDirection: j,
                            centerX: S,
                            centerY: P,
                            fadeInThreshold: T,
                            fadeOutThreshold: N,
                            opacity: R,
                            enableCursorInteraction: z,
                            cursorInfluence: B,
                          },
                          t,
                        ),
                      }),
                    }),
                    (0, a.jsxs)(l.IH, {
                      children: [
                        (0, a.jsx)(l.yt, {
                          title: "Disc Count",
                          value: o,
                          onChange: c,
                          min: 10,
                          max: 300,
                          step: 10,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Particle Count",
                          value: d,
                          onChange: h,
                          min: 1e3,
                          max: 4e4,
                          step: 1e3,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Speed",
                          value: C,
                          onChange: M,
                          min: 0.01,
                          max: 0.5,
                          step: 0.01,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Rotation Direction",
                          value: j,
                          onChange: w,
                          min: -1,
                          max: 1,
                          step: 2,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Opacity",
                          value: R,
                          onChange: L,
                          min: 0,
                          max: 1,
                          step: 0.05,
                        }),
                        (0, a.jsx)(l.tl, {
                          title: "Cursor Interaction",
                          checked: z,
                          onChange: A,
                        }),
                        z &&
                          (0, a.jsx)(l.yt, {
                            title: "Cursor Influence",
                            value: B,
                            onChange: W,
                            min: 0,
                            max: 0.5,
                            step: 0.05,
                          }),
                        (0, a.jsx)(l.W7, {
                          title: "Particle Color",
                          value: F,
                          onChange: () => {},
                        }),
                        (0, a.jsx)(l.W7, {
                          title: "Disc Color",
                          value: H,
                          onChange: () => {},
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Disc Line Width",
                          value: m,
                          onChange: p,
                          min: 0.5,
                          max: 5,
                          step: 0.5,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Particle Size",
                          value: f,
                          onChange: x,
                          min: 0.25,
                          max: 2.5,
                          step: 0.25,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Depth",
                          value: g,
                          onChange: b,
                          min: 0.5,
                          max: 2.5,
                          step: 0.1,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Spread",
                          value: v,
                          onChange: y,
                          min: 0.5,
                          max: 2,
                          step: 0.1,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Center X",
                          value: S,
                          onChange: I,
                          min: 0,
                          max: 1,
                          step: 0.05,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Center Y",
                          value: P,
                          onChange: k,
                          min: -0.5,
                          max: 0.5,
                          step: 0.05,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Fade In Threshold",
                          value: T,
                          onChange: E,
                          min: 0.001,
                          max: 0.1,
                          step: 0.001,
                        }),
                        (0, a.jsx)(l.yt, {
                          title: "Fade Out Threshold",
                          value: N,
                          onChange: D,
                          min: 0.1,
                          max: 0.8,
                          step: 0.05,
                        }),
                      ],
                    }),
                    (0, a.jsx)(l.Ub, {
                      data: [
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the wrapper element",
                        },
                        {
                          name: "discCount",
                          type: "number",
                          default: "50",
                          description:
                            "Number of elliptical rings forming the tunnel",
                        },
                        {
                          name: "particleCount",
                          type: "number",
                          default: "10000",
                          description: "Total number of orbital particles",
                        },
                        {
                          name: "particleColor",
                          type: "string",
                          default: '"#000000"',
                          description: "Base color for particles (hex format)",
                        },
                        {
                          name: "discColor",
                          type: "string",
                          default: '"rgba(200, 200, 200, 0.15)"',
                          description:
                            "Color of the ring strokes (hex or rgba)",
                        },
                        {
                          name: "discLineWidth",
                          type: "number",
                          default: "1",
                          description: "Stroke width of tunnel rings",
                        },
                        {
                          name: "particleSize",
                          type: "number",
                          default: "0.5",
                          description: "Particle radius in pixels",
                        },
                        {
                          name: "depth",
                          type: "number",
                          default: "1.7",
                          description: "Tunnel extension factor (0.5-2)",
                        },
                        {
                          name: "spread",
                          type: "number",
                          default: "1",
                          description:
                            "Horizontal scale of the tunnel opening (0.5-2)",
                        },
                        {
                          name: "speed",
                          type: "number",
                          default: "0.05",
                          description: "Animation velocity multiplier",
                        },
                        {
                          name: "rotationDirection",
                          type: "number",
                          default: "1",
                          description:
                            "Rotation direction: 1 for clockwise, -1 for counter-clockwise",
                        },
                        {
                          name: "centerX",
                          type: "number",
                          default: "0.5",
                          description: "Horizontal focal point (0-1)",
                        },
                        {
                          name: "centerY",
                          type: "number",
                          default: "0",
                          description: "Vertical focal point (0-1)",
                        },
                        {
                          name: "fadeInThreshold",
                          type: "number",
                          default: "0.021",
                          description:
                            "Scale threshold where rings begin appearing",
                        },
                        {
                          name: "fadeOutThreshold",
                          type: "number",
                          default: "0.4",
                          description:
                            "Scale threshold where rings begin fading",
                        },
                        {
                          name: "opacity",
                          type: "number",
                          default: "1",
                          description: "Master opacity multiplier (0-1)",
                        },
                        {
                          name: "enableCursorInteraction",
                          type: "boolean",
                          default: "true",
                          description: "Enable mouse-based depth interaction",
                        },
                        {
                          name: "cursorInfluence",
                          type: "number",
                          default: "0.1",
                          description:
                            "Mouse influence strength on tunnel depth (0-0.5)",
                        },
                      ],
                    }),
                  ],
                }),
                (0, a.jsx)(l.lT, { children: (0, a.jsx)(l.Gv, {}) }),
              ],
            }),
          ],
        });
      };
  },
};
