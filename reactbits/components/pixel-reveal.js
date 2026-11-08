/* ReactBits Pro public preview module 99343 for pixel-reveal.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/99343.6432438bf8112cb0.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  99343: (e, t, r) => {
    (r.r(t), r.d(t, { default: () => w }));
    var a = r(95155),
      n = r(12115),
      i = r(30701),
      s = r(56388),
      l = r(90761),
      u = r(81712),
      o = r(3907),
      c = r(2253),
      d = r(90650);
    let f = `
varying vec2 vUv;

uniform vec2 uContainerRes;
uniform vec2 uTexRes;

vec2 coverUv(vec2 uv, vec2 texSize, vec2 viewSize) {
  vec2 ratio = vec2(
    min((viewSize.x / viewSize.y) / (texSize.x / texSize.y), 1.0),
    min((viewSize.y / viewSize.x) / (texSize.y / texSize.x), 1.0)
  );
  return uv * ratio + (1.0 - ratio) * 0.5;
}

void main() {
  vUv = coverUv(uv, uTexRes, uContainerRes);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
      m = `
precision highp float;

uniform sampler2D uTexture;
uniform vec2  uTexRes;
uniform vec2  uContainerRes;
uniform float uProgress;
uniform float uGridSize;
uniform float uEdgeHeight;
uniform vec3  uColor;
uniform int   uAxis;

varying vec2 vUv;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec2 squaresGrid(vec2 uv) {
  float texAspectX = uTexRes.x / uTexRes.y;
  float texAspectY = uTexRes.y / uTexRes.x;

  vec2 ratio = vec2(
    min(texAspectX / 1.0, 1.0),
    min(texAspectY / 1.0, 1.0)
  );

  return vec2(
    uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
    uv.y * ratio.y + (1.0 - ratio.y) * 0.5
  );
}

void main() {
  vec2 squareUvs = squaresGrid(vUv);

  float shortSide = min(uContainerRes.x, uContainerRes.y);
  float cells = floor(shortSide / max(uGridSize, 1.0));
  cells = max(cells, 1.0);

  vec2 grid = vec2(
    floor(squareUvs.x * cells) / cells,
    floor(squareUvs.y * cells) / cells
  );

  float a;
  if (uAxis == 1) {
    a = grid.y;
  } else if (uAxis == 0) {
    a = 1.0 - grid.y - (1.0 / cells);
  } else if (uAxis == 2) {
    a = grid.x;
  } else {
    a = 1.0 - grid.x - (1.0 / cells);
  }

  float h = max(uEdgeHeight, 0.0001);
  float edge = (1.0 + h) - (uProgress * (1.0 + h + h));

  float dToEdge = distance(a, edge);
  float invDist = 1.0 - dToEdge;

  float clamped = smoothstep(h, 0.0, dToEdge);

  float rand = random(grid);
  float randDist = step(1.0 - h * rand, invDist);
  float dist = step(1.0 - h, invDist);

  float alpha = dist * (clamped + rand - 0.5 * (1.0 - randDist));
  alpha = clamp(alpha, 0.0, 1.0);

  vec4 gridColor = vec4(uColor, alpha);

  vec4 tex = texture2D(uTexture, vUv);
  tex.rgba *= step(edge, a);

  gl_FragColor = mix(tex, gridColor, gridColor.a);
}
`,
      g = { up: 0, down: 1, left: 2, right: 3 };
    function p() {
      return {
        uTexture: { value: null },
        uTexRes: { value: new c.I9Y(1, 1) },
        uContainerRes: { value: new c.I9Y(1, 1) },
        uProgress: { value: 0 },
        uGridSize: { value: 20 },
        uEdgeHeight: { value: 0.2 },
        uColor: { value: new c.Q1f("#242424") },
        uAxis: { value: 1 },
      };
    }
    let v = ({
        imageSrc: e,
        gridSize: t,
        transitionColor: r,
        edgeHeight: i,
        axis: s,
        controllerRef: l,
      }) => {
        let o = (0, n.useRef)(null),
          { size: d, viewport: g } = (0, u.C)(),
          v = (0, n.useRef)(null),
          [h] = n.useState(p),
          x = (0, n.useRef)({
            gridSize: t,
            transitionColor: r,
            edgeHeight: i,
            axis: s,
          });
        return (
          (0, n.useEffect)(() => {
            x.current = {
              gridSize: t,
              transitionColor: r,
              edgeHeight: i,
              axis: s,
            };
          }, [t, r, i, s]),
          (0, n.useEffect)(() => {
            if (!e) return;
            let t = !1,
              r = new c.Tap();
            return (
              r.setCrossOrigin("anonymous"),
              r.load(
                e,
                (e) => {
                  t
                    ? e.dispose()
                    : ((e.colorSpace = c.er$),
                      (e.minFilter = c.k6q),
                      (e.magFilter = c.k6q),
                      (v.current = e));
                },
                void 0,
                () => {
                  t || (v.current = null);
                },
              ),
              () => {
                ((t = !0),
                  v.current && (v.current.dispose(), (v.current = null)));
              }
            );
          }, [e]),
          (0, u.D)(() => {
            if (!o.current) return;
            let e = o.current.material.uniforms,
              t = x.current;
            if (
              ((e.uGridSize.value = t.gridSize),
              (e.uEdgeHeight.value = t.edgeHeight),
              e.uColor.value.set(t.transitionColor),
              (e.uAxis.value = t.axis),
              e.uContainerRes.value.set(
                Math.max(d.width, 1) * g.dpr,
                Math.max(d.height, 1) * g.dpr,
              ),
              v.current?.image)
            ) {
              e.uTexture.value = v.current;
              let t = v.current.image;
              e.uTexRes.value.set(
                t.naturalWidth || t.width || 1,
                t.naturalHeight || t.height || 1,
              );
            }
            l.current && (e.uProgress.value = l.current.progress);
          }),
          (0, a.jsxs)("mesh", {
            ref: o,
            children: [
              (0, a.jsx)("planeGeometry", { args: [2, 2] }),
              (0, a.jsx)("shaderMaterial", {
                vertexShader: f,
                fragmentShader: m,
                uniforms: h,
                transparent: !0,
              }),
            ],
          })
        );
      },
      h = n.forwardRef(
        (
          {
            imageSrc: e,
            width: t = "100%",
            height: r = "100%",
            gridSize: i = 20,
            transitionColor: s = "#242424",
            edgeHeight: l = 0.2,
            duration: u = 1.6,
            easing: c = "linear",
            direction: f = "up",
            autoTrigger: m = !0,
            triggerOnce: p = !1,
            triggerThreshold: h = 0,
            paused: x = !1,
            borderRadius: b = "0px",
            className: w,
            style: y,
            children: C,
            onRevealComplete: R,
          },
          S,
        ) => {
          let j = (0, n.useRef)(null),
            T = (0, n.useRef)(null),
            E = (0, n.useRef)(!1),
            A = (0, n.useRef)({
              progress: 0,
              raw: 0,
              startedAt: null,
              startRaw: 0,
              completed: !1,
            }),
            z = (0, n.useRef)(u),
            I = (0, n.useRef)(c),
            k = (0, n.useRef)(x),
            N = (0, n.useRef)(R);
          ((0, n.useEffect)(() => {
            z.current = u;
          }, [u]),
            (0, n.useEffect)(() => {
              I.current = c;
            }, [c]),
            (0, n.useEffect)(() => {
              k.current = x;
            }, [x]),
            (0, n.useEffect)(() => {
              N.current = R;
            }, [R]));
          let P = (0, n.useCallback)(() => {
              null !== T.current &&
                (cancelAnimationFrame(T.current), (T.current = null));
            }, []),
            U = (0, n.useRef)(null);
          (0, n.useEffect)(() => {
            let e = (t) => {
              let r = A.current;
              if (null === r.startedAt) {
                T.current = null;
                return;
              }
              if (k.current) {
                ((r.startedAt = t - (r.raw - r.startRaw) * z.current * 1e3),
                  (T.current = requestAnimationFrame(e)));
                return;
              }
              let a = (t - r.startedAt) / 1e3,
                n = Math.max(z.current, 1e-4),
                i = Math.min(1, Math.max(0, r.startRaw + a / n));
              if (
                ((r.raw = i),
                (r.progress = (function (e, t) {
                  let r = Math.max(0, Math.min(1, e));
                  switch (t) {
                    case "easeIn":
                      return r * r;
                    case "easeOut":
                      return 1 - (1 - r) * (1 - r);
                    case "easeInOut":
                      return r < 0.5
                        ? 2 * r * r
                        : 1 - Math.pow(-2 * r + 2, 2) / 2;
                    default:
                      return r;
                  }
                })(i, I.current)),
                i >= 1)
              ) {
                ((r.startedAt = null),
                  r.completed || ((r.completed = !0), N.current?.()),
                  (T.current = null));
                return;
              }
              T.current = requestAnimationFrame(e);
            };
            return (
              (U.current = e),
              () => {
                U.current = null;
              }
            );
          }, []);
          let H = (0, n.useCallback)(() => {
              let e = A.current;
              if (e.raw >= 1) return;
              let t = U.current;
              t &&
                ((e.startedAt = performance.now()),
                (e.startRaw = e.raw),
                (e.completed = !1),
                P(),
                (T.current = requestAnimationFrame(t)));
            }, [P]),
            M = (0, n.useCallback)(() => {
              P();
              let e = A.current;
              ((e.raw = 0),
                (e.progress = 0),
                (e.startedAt = null),
                (e.startRaw = 0),
                (e.completed = !1));
            }, [P]);
          ((0, n.useImperativeHandle)(
            S,
            () => ({ trigger: H, play: H, reset: M }),
            [H, M],
          ),
            (0, n.useEffect)(() => {
              let e = j.current;
              if (!e || !m) return;
              let t = Math.max(0, Math.min(1, h)),
                r = new IntersectionObserver(
                  (e) => {
                    for (let r of e)
                      if (r.isIntersecting && r.intersectionRatio >= t)
                        if (p) {
                          if (E.current) continue;
                          ((E.current = !0), M(), H());
                        } else (M(), H());
                      else p || M();
                  },
                  {
                    threshold:
                      t > 0 ? [0, t, Math.min(1, t + 0.01)] : [0, 0.01],
                  },
                );
              return (r.observe(e), () => r.disconnect());
            }, [m, p, h, H, M]),
            (0, n.useEffect)(() => () => P(), [P]));
          let D = g[f] ?? 1,
            O = "number" == typeof b ? `${b}px` : b;
          return (0, a.jsxs)("div", {
            ref: j,
            className: (0, d.cn)("relative overflow-hidden", w),
            style: { width: t, height: r, borderRadius: O, ...y },
            children: [
              (0, a.jsx)(o.Hl, {
                orthographic: !0,
                camera: {
                  position: [0, 0, 1],
                  zoom: 1,
                  left: -1,
                  right: 1,
                  top: 1,
                  bottom: -1,
                },
                gl: { antialias: !0, alpha: !0 },
                dpr: [1, 2],
                className: "absolute! inset-0 w-full h-full",
                children: (0, a.jsx)(v, {
                  imageSrc: e,
                  gridSize: i,
                  transitionColor: s,
                  edgeHeight: l,
                  axis: D,
                  controllerRef: A,
                }),
              }),
              C &&
                (0, a.jsx)("div", {
                  className: "relative z-10 pointer-events-none h-full w-full",
                  children: C,
                }),
            ],
          });
        },
      );
    h.displayName = "PixelReveal";
    let x = [
        { value: "down", label: "Down" },
        { value: "up", label: "Up" },
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
      ],
      b = [
        { value: "linear", label: "Linear" },
        { value: "easeIn", label: "Ease In" },
        { value: "easeOut", label: "Ease Out" },
        { value: "easeInOut", label: "Ease In Out" },
      ],
      w = () => {
        let [e, t] = (0, l.I)(),
          r = (0, n.useRef)(null),
          [u, o] = (0, n.useState)("/demo-media/abstract-rose-balance.webp"),
          [c, d] = (0, n.useState)(20),
          [f, m] = (0, n.useState)(0.2),
          [g, p] = (0, n.useState)(1.6),
          [v, w] = (0, n.useState)("linear"),
          [y, C] = (0, n.useState)("down"),
          [R, S] = (0, n.useState)(!0),
          [j, T] = (0, n.useState)(!1),
          [E, A] = (0, n.useState)(!1),
          { resolvedTheme: z } = (0, i.D)(),
          [I, k] = (0, n.useState)(null),
          N = (0, n.useMemo)(
            () => (null !== I ? I : "dark" === z ? "#0a0a0a" : "#ffffff"),
            [z, I],
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
                        className:
                          "flex h-full w-full items-center justify-center p-6",
                        children: (0, a.jsx)(
                          h,
                          {
                            ref: r,
                            imageSrc: u,
                            width: "min(100%, 640px)",
                            height: "min(100%, 360px)",
                            borderRadius: "16px",
                            gridSize: c,
                            transitionColor: N,
                            edgeHeight: f,
                            duration: g,
                            easing: v,
                            direction: y,
                            autoTrigger: R,
                            triggerOnce: j,
                            paused: E,
                          },
                          e,
                        ),
                      }),
                    }),
                    (0, a.jsxs)(s.IH, {
                      children: [
                        (0, a.jsx)(s.UD, {
                          title: "Image URL",
                          value: u,
                          onChange: o,
                          placeholder: "https://...",
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Grid Size",
                          value: c,
                          onChange: d,
                          min: 4,
                          max: 80,
                          step: 1,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Edge Height",
                          value: f,
                          onChange: m,
                          min: 0.05,
                          max: 0.6,
                          step: 0.01,
                        }),
                        (0, a.jsx)(s.W7, {
                          title: "Transition Color",
                          value: N,
                          onChange: k,
                        }),
                        (0, a.jsx)(s.yt, {
                          title: "Duration (s)",
                          value: g,
                          onChange: p,
                          min: 0.2,
                          max: 6,
                          step: 0.1,
                        }),
                        (0, a.jsx)(s.bg, {
                          title: "Easing",
                          value: v,
                          onChange: (e) => w(e),
                          options: b,
                        }),
                        (0, a.jsx)(s.bg, {
                          title: "Direction",
                          value: y,
                          onChange: (e) => C(e),
                          options: x,
                        }),
                        (0, a.jsx)(s.tl, {
                          title: "Paused",
                          checked: E,
                          onChange: A,
                        }),
                        (0, a.jsx)(s.tl, {
                          title: "Auto Trigger",
                          checked: R,
                          onChange: S,
                        }),
                        (0, a.jsx)(s.tl, {
                          title: "Trigger Once",
                          checked: j,
                          onChange: T,
                        }),
                        (0, a.jsxs)("div", {
                          className: "flex flex-wrap gap-2 pt-2",
                          children: [
                            (0, a.jsx)("button", {
                              type: "button",
                              onClick: () => {
                                (r.current?.reset(), r.current?.trigger());
                              },
                              className:
                                "px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer",
                              children: "Trigger",
                            }),
                            (0, a.jsx)("button", {
                              type: "button",
                              onClick: () => r.current?.reset(),
                              className:
                                "px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer",
                              children: "Reset",
                            }),
                          ],
                        }),
                      ],
                    }),
                    (0, a.jsx)(s.Ub, {
                      data: [
                        {
                          name: "imageSrc",
                          type: "string",
                          default: '""',
                          description: "Image URL to reveal (required)",
                        },
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
                          name: "gridSize",
                          type: "number",
                          default: "20",
                          description:
                            "Approximate pixel size of each dissolving cell: lower means a denser grid (4–80)",
                        },
                        {
                          name: "transitionColor",
                          type: "string",
                          default: '"#242424"',
                          description:
                            "Hex color of the dissolving pixel squares",
                        },
                        {
                          name: "edgeHeight",
                          type: "number",
                          default: "0.2",
                          description:
                            "Thickness of the noisy leading edge as a fraction of the axis (0.05–0.6)",
                        },
                        {
                          name: "duration",
                          type: "number",
                          default: "1.6",
                          description:
                            "Total reveal duration in seconds (0.2–6)",
                        },
                        {
                          name: "easing",
                          type: '"linear" | "easeIn" | "easeOut" | "easeInOut"',
                          default: '"linear"',
                          description:
                            "Easing curve applied to the progress ramp",
                        },
                        {
                          name: "direction",
                          type: '"up" | "down" | "left" | "right"',
                          default: '"up"',
                          description: "Axis along which the reveal sweeps",
                        },
                        {
                          name: "autoTrigger",
                          type: "boolean",
                          default: "true",
                          description:
                            "Auto-fire the reveal when the container intersects the viewport",
                        },
                        {
                          name: "triggerOnce",
                          type: "boolean",
                          default: "false",
                          description:
                            "Only auto-trigger on the first viewport entry; otherwise replay each time it re-enters",
                        },
                        {
                          name: "triggerThreshold",
                          type: "number",
                          default: "0",
                          description:
                            "Intersection ratio that fires the auto-trigger (0–1)",
                        },
                        {
                          name: "paused",
                          type: "boolean",
                          default: "false",
                          description: "Freeze the animation in place",
                        },
                        {
                          name: "borderRadius",
                          type: "string | number",
                          default: '"0px"',
                          description: "Border radius applied to the container",
                        },
                        {
                          name: "className",
                          type: "string",
                          default: '""',
                          description:
                            "Additional CSS classes for the container",
                        },
                        {
                          name: "children",
                          type: "ReactNode",
                          default: "undefined",
                          description:
                            "Content rendered above the canvas (pointer-events disabled by default)",
                        },
                        {
                          name: "onRevealComplete",
                          type: "() => void",
                          default: "undefined",
                          description:
                            "Fires when the reveal animation reaches progress 1",
                        },
                        {
                          name: "ref",
                          type: "PixelRevealRef",
                          default: "undefined",
                          description:
                            "Imperative API: { trigger(), play(), reset() } for manual playback",
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
